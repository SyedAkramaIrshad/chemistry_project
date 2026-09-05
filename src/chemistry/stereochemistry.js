import {
  ALKENE_SCENARIO_BY_ID,
  NEWMAN_SCENARIO_BY_ID,
  STEREOCHEMISTRY_MODEL_BOUNDARY,
  TETRAHEDRAL_SCENARIO_BY_ID,
  TETRAHEDRAL_SITES,
} from '../data/stereochemistryScenarios.js';

const SITE_BY_ID = Object.freeze(Object.fromEntries(TETRAHEDRAL_SITES.map((site) => [site.id, site])));
const TETRAHEDRAL_SITE_IDS = Object.freeze(TETRAHEDRAL_SITES.map((site) => site.id));

const outcome = (allowed, state, reason, extra = {}) => Object.freeze({ allowed, state, reason, ...extra });
const dimension = (correct, actual, predicted, reason) => Object.freeze({ correct, actual, predicted, reason });
const freezeArrangement = (arrangement) => Object.freeze({ ...arrangement });
const freezeTetrahedralState = (scenarioId, arrangement) => Object.freeze({ scenarioId, arrangement: freezeArrangement(arrangement) });
const freezeAlkeneSide = (side) => Object.freeze({ top: side.top, bottom: side.bottom });
const freezeAlkeneState = (scenarioId, left, right) => Object.freeze({ scenarioId, left: freezeAlkeneSide(left), right: freezeAlkeneSide(right) });
const freezeNewmanState = (scenarioId, angle) => Object.freeze({ scenarioId, angle });

const scenarioOrNull = (collection, scenarioId) => collection[scenarioId] || null;
const groupIds = (groups) => groups.map((item) => item.id);
const exactSet = (values, expected) => values.length === expected.length && new Set(values).size === expected.length && expected.every((item) => values.includes(item));

function validateTetrahedralState(scenarioId, state) {
  const scenario = scenarioOrNull(TETRAHEDRAL_SCENARIO_BY_ID, scenarioId);
  if (!scenario) return { valid: false, scenario: null, reason: `Unknown tetrahedral scenario: ${scenarioId}.` };
  if (!state || state.scenarioId !== scenarioId || !state.arrangement) return { valid: false, scenario, reason: 'The tetrahedral state does not match the selected scenario.' };
  const siteIds = Object.keys(state.arrangement);
  if (!exactSet(siteIds, TETRAHEDRAL_SITE_IDS)) return { valid: false, scenario, reason: 'The tetrahedral state must contain every declared site exactly once.' };
  const placedGroups = Object.values(state.arrangement);
  if (!exactSet(placedGroups, groupIds(scenario.groups))) return { valid: false, scenario, reason: 'The tetrahedral state must contain every declared ligand exactly once.' };
  return { valid: true, scenario, reason: 'The tetrahedral state matches the declared site and ligand set.' };
}

export function createTetrahedralState(scenarioId) {
  const scenario = scenarioOrNull(TETRAHEDRAL_SCENARIO_BY_ID, scenarioId);
  if (!scenario) return outcome(false, null, `Unknown tetrahedral scenario: ${scenarioId}.`);
  return outcome(true, freezeTetrahedralState(scenarioId, scenario.initialArrangement), `${scenario.name} opened with its declared spatial arrangement and no learner priorities.`);
}

export function swapTetrahedralSites({ scenarioId, state, firstSiteId, secondSiteId }) {
  const validation = validateTetrahedralState(scenarioId, state);
  if (!validation.valid) return outcome(false, state, validation.reason);
  if (!SITE_BY_ID[firstSiteId] || !SITE_BY_ID[secondSiteId]) return outcome(false, state, 'Both swap endpoints must be declared tetrahedral sites.');
  if (firstSiteId === secondSiteId) return outcome(false, state, 'Choose two different sites; no ligand was moved.');
  const arrangement = { ...state.arrangement };
  [arrangement[firstSiteId], arrangement[secondSiteId]] = [arrangement[secondSiteId], arrangement[firstSiteId]];
  return outcome(true, freezeTetrahedralState(scenarioId, arrangement), `The ligands at ${SITE_BY_ID[firstSiteId].label} and ${SITE_BY_ID[secondSiteId].label} were exchanged. No other site changed.`);
}

export function mirrorTetrahedralState({ scenarioId, state }) {
  const validation = validateTetrahedralState(scenarioId, state);
  if (!validation.valid) return outcome(false, state, validation.reason);
  const [firstSiteId, secondSiteId] = TETRAHEDRAL_SITE_IDS;
  const mirrored = swapTetrahedralSites({ scenarioId, state, firstSiteId, secondSiteId });
  return outcome(true, mirrored.state, 'The mirror chamber applied one explicit odd transposition. The original arrangement was not changed.');
}

const subtract = (left, right) => left.map((value, index) => value - right[index]);
const cross = (left, right) => [
  left[1] * right[2] - left[2] * right[1],
  left[2] * right[0] - left[0] * right[2],
  left[0] * right[1] - left[1] * right[0],
];
const dot = (left, right) => left.reduce((sum, value, index) => sum + value * right[index], 0);

function tetrahedralPriorityEvidence(scenario, state) {
  const priorities = scenario.groups.map((item) => item.priority);
  const stereogenic = new Set(priorities).size === 4;
  const priorityByGroup = Object.freeze(Object.fromEntries(scenario.groups.map((item) => [item.id, item.priority])));
  const siteByGroup = Object.fromEntries(Object.entries(state.arrangement).map(([siteId, groupId]) => [groupId, siteId]));
  if (!stereogenic) return { stereogenic, priorityByGroup, siteByGroup, determinant: null, descriptor: null };
  const pointForPriority = (priority) => {
    const groupRecord = scenario.groups.find((item) => item.priority === priority);
    return SITE_BY_ID[siteByGroup[groupRecord.id]].point;
  };
  const p1 = pointForPriority(1);
  const p2 = pointForPriority(2);
  const p3 = pointForPriority(3);
  const p4 = pointForPriority(4);
  const determinant = dot(subtract(p1, p4), cross(subtract(p2, p4), subtract(p3, p4)));
  return { stereogenic, priorityByGroup, siteByGroup, determinant, descriptor: determinant > 0 ? 'R' : 'S' };
}

export function tetrahedralResult({ scenarioId, state }) {
  const validation = validateTetrahedralState(scenarioId, state);
  if (!validation.valid) return Object.freeze({ valid: false, reason: validation.reason });
  const evidence = tetrahedralPriorityEvidence(validation.scenario, state);
  const mirrorRelationship = evidence.stereogenic ? 'enantiomer' : 'same';
  const reason = evidence.stereogenic
    ? `Four distinguishable declared priorities give ${evidence.descriptor} in the fixed coordinate frame. One ligand transposition reverses the determinant sign.`
    : 'At least two declared ligands share one priority, so this centre does not have four distinguishable ligand priorities and receives no R/S descriptor.';
  return Object.freeze({ valid: true, ...evidence, mirrorRelationship, reason });
}

const normalizeViewAngle = (angle) => {
  if (!Number.isFinite(Number(angle))) return 0;
  return ((Number(angle) % 360) + 360) % 360;
};

export function projectTetrahedral({ scenarioId, state, viewAngleDeg = 0 }) {
  const validation = validateTetrahedralState(scenarioId, state);
  if (!validation.valid) return Object.freeze({ valid: false, state, points: [], reason: validation.reason });
  const normalized = normalizeViewAngle(viewAngleDeg);
  const radians = normalized * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const groupById = Object.fromEntries(validation.scenario.groups.map((item) => [item.id, item]));
  const points = TETRAHEDRAL_SITES.map((site) => {
    const [x, y, z] = site.point;
    const rotatedX = x * cosine + z * sine;
    const depth = -x * sine + z * cosine;
    const groupId = state.arrangement[site.id];
    return Object.freeze({
      siteId: site.id,
      groupId,
      label: groupById[groupId].label,
      x: 50 + rotatedX * 22,
      y: 50 - y * 22,
      depth,
      bondStyle: depth > 0.2 ? 'wedge' : depth < -0.2 ? 'dash' : 'plane',
    });
  });
  const result = tetrahedralResult({ scenarioId, state });
  return Object.freeze({ valid: true, state, viewAngleDeg: normalized, descriptor: result.descriptor, points: Object.freeze(points), reason: 'Camera rotation changes only the projection; spatial permutation and descriptor remain fixed.' });
}

export function evaluateTetrahedral({ scenarioId, state, predictions = {} }) {
  const validation = validateTetrahedralState(scenarioId, state);
  if (!validation.valid) return Object.freeze({ valid: false, committed: false, reason: validation.reason });
  const result = tetrahedralResult({ scenarioId, state });
  const assignments = predictions.priorityAssignments || {};
  const priorities = validation.scenario.groups.map((item) => {
    const predicted = Number(assignments[item.id]);
    const correct = Number.isFinite(predicted) && predicted === item.priority;
    return Object.freeze({
      groupId: item.id,
      label: item.label,
      ...dimension(correct, item.priority, Number.isFinite(predicted) ? predicted : null, correct ? `${item.label} has the declared priority ${item.priority}.` : `${item.label}: ${item.comparison}`),
    });
  });
  const actualStereogenic = result.stereogenic ? 'stereogenic' : 'not stereogenic';
  const actualDescriptor = result.descriptor || 'not applicable';
  const stereogenic = dimension(predictions.stereogenic === actualStereogenic, actualStereogenic, predictions.stereogenic || null, result.stereogenic ? 'Four declared ligand priorities are distinguishable.' : 'A repeated declared priority prevents a single-centre R/S assignment.');
  const descriptor = dimension(predictions.descriptor === actualDescriptor, actualDescriptor, predictions.descriptor || null, result.reason);
  const mirrorRelationship = dimension(predictions.mirrorRelationship === result.mirrorRelationship, result.mirrorRelationship, predictions.mirrorRelationship || null, result.stereogenic ? 'The explicit mirror has the opposite determinant sign and is the enantiomer in this bounded model.' : 'The repeated-ligand centre is classified as the same in this bounded single-centre mirror test.');
  const committed = priorities.every((item) => item.correct) && stereogenic.correct && descriptor.correct && mirrorRelationship.correct;
  return Object.freeze({ valid: true, priorities: Object.freeze(priorities), stereogenic, descriptor, mirrorRelationship, committed, actual: result, reason: committed ? 'Every declared priority and spatial interpretation agrees.' : 'The arrangement and every learner answer remain unchanged; inspect each dimension separately.' });
}

function validateAlkeneState(scenarioId, state) {
  const scenario = scenarioOrNull(ALKENE_SCENARIO_BY_ID, scenarioId);
  if (!scenario) return { valid: false, scenario: null, reason: `Unknown alkene scenario: ${scenarioId}.` };
  if (!state || state.scenarioId !== scenarioId || !state.left || !state.right) return { valid: false, scenario, reason: 'The alkene state does not match the selected scenario.' };
  const leftValues = [state.left.top, state.left.bottom];
  const rightValues = [state.right.top, state.right.bottom];
  if (!exactSet(leftValues, groupIds(scenario.leftGroups))) return { valid: false, scenario, reason: 'The left alkene carbon must retain its two declared substituents.' };
  if (!exactSet(rightValues, groupIds(scenario.rightGroups))) return { valid: false, scenario, reason: 'The right alkene carbon must retain its two declared substituents.' };
  return { valid: true, scenario, reason: 'Both alkene carbons retain their declared substituent pairs.' };
}

export function createAlkeneState(scenarioId) {
  const scenario = scenarioOrNull(ALKENE_SCENARIO_BY_ID, scenarioId);
  if (!scenario) return outcome(false, null, `Unknown alkene scenario: ${scenarioId}.`);
  return outcome(true, freezeAlkeneState(scenarioId, scenario.initialArrangement.left, scenario.initialArrangement.right), `${scenario.name} opened with fixed left/right connectivity.`);
}

export function swapAlkeneSide({ scenarioId, state, side }) {
  const validation = validateAlkeneState(scenarioId, state);
  if (!validation.valid) return outcome(false, state, validation.reason);
  if (side !== 'left' && side !== 'right') return outcome(false, state, 'Choose the left or right alkene carbon; no substituent crossed the double bond.');
  const swapped = { top: state[side].bottom, bottom: state[side].top };
  const next = freezeAlkeneState(scenarioId, side === 'left' ? swapped : state.left, side === 'right' ? swapped : state.right);
  return outcome(true, next, `Only the ${side} substituent pair exchanged top and bottom positions. Double-bond connectivity stayed fixed.`);
}

function higherPriorityEvidence(groups, sideState) {
  if (groups[0].priority === groups[1].priority) return { tied: true, higherGroupId: null, higherPosition: null };
  const higher = [...groups].sort((left, right) => left.priority - right.priority)[0];
  const higherPosition = sideState.top === higher.id ? 'top' : 'bottom';
  return { tied: false, higherGroupId: higher.id, higherPosition };
}

export function alkeneResult({ scenarioId, state }) {
  const validation = validateAlkeneState(scenarioId, state);
  if (!validation.valid) return Object.freeze({ valid: false, reason: validation.reason });
  const left = higherPriorityEvidence(validation.scenario.leftGroups, state.left);
  const right = higherPriorityEvidence(validation.scenario.rightGroups, state.right);
  const eligible = !left.tied && !right.tied;
  const descriptor = eligible ? (left.higherPosition === right.higherPosition ? 'Z' : 'E') : 'undefined';
  const reason = eligible
    ? `${left.higherGroupId} is ${left.higherPosition} on the left and ${right.higherGroupId} is ${right.higherPosition} on the right, so the higher-priority groups are ${descriptor === 'Z' ? 'on the same side (Z)' : 'on opposite sides (E)'}.`
    : 'At least one alkene carbon has tied declared substituent priorities, so E/Z is undefined.';
  return Object.freeze({ valid: true, eligible, descriptor, leftHigherGroupId: left.higherGroupId, rightHigherGroupId: right.higherGroupId, leftHigherPosition: left.higherPosition, rightHigherPosition: right.higherPosition, leftTied: left.tied, rightTied: right.tied, reason });
}

export function evaluateAlkene({ scenarioId, state, predictions = {} }) {
  const validation = validateAlkeneState(scenarioId, state);
  if (!validation.valid) return Object.freeze({ valid: false, committed: false, reason: validation.reason });
  const result = alkeneResult({ scenarioId, state });
  const leftActual = result.leftHigherGroupId || 'tie';
  const rightActual = result.rightHigherGroupId || 'tie';
  const eligibilityActual = result.eligible ? 'eligible' : 'undefined';
  const leftRecord = result.leftHigherGroupId ? validation.scenario.leftGroups.find((item) => item.id === result.leftHigherGroupId) : null;
  const rightRecord = result.rightHigherGroupId ? validation.scenario.rightGroups.find((item) => item.id === result.rightHigherGroupId) : null;
  const leftPriority = dimension(predictions.leftHigherId === leftActual, leftActual, predictions.leftHigherId || null, leftRecord ? leftRecord.comparison : 'The left substituent priorities tie.');
  const rightPriority = dimension(predictions.rightHigherId === rightActual, rightActual, predictions.rightHigherId || null, rightRecord ? rightRecord.comparison : 'The right substituent priorities tie.');
  const eligibility = dimension(predictions.eligibility === eligibilityActual, eligibilityActual, predictions.eligibility || null, result.eligible ? 'Both alkene carbons have distinguishable declared priorities.' : 'A tie on either carbon makes E/Z undefined.');
  const descriptor = dimension(predictions.descriptor === result.descriptor, result.descriptor, predictions.descriptor || null, result.reason);
  const committed = leftPriority.correct && rightPriority.correct && eligibility.correct && descriptor.correct;
  return Object.freeze({ valid: true, leftPriority, rightPriority, eligibility, descriptor, committed, actual: result, reason: committed ? 'Both local priorities, eligibility, and side comparison agree.' : 'No substituent or answer was moved; inspect each local comparison separately.' });
}

const normalizeTorsion = (angle) => {
  const numeric = Number(angle);
  if (!Number.isFinite(numeric)) return null;
  let normalized = ((numeric + 180) % 360 + 360) % 360 - 180;
  if (normalized === -180 && numeric > 0) normalized = 180;
  return Object.is(normalized, -0) ? 0 : normalized;
};

function validateNewmanState(scenarioId, state) {
  const scenario = scenarioOrNull(NEWMAN_SCENARIO_BY_ID, scenarioId);
  if (!scenario) return { valid: false, scenario: null, reason: `Unknown Newman scenario: ${scenarioId}.` };
  if (!state || state.scenarioId !== scenarioId || !Number.isFinite(state.angle) || state.angle < -180 || state.angle > 180) return { valid: false, scenario, reason: 'The Newman state must match the selected probe and contain an angle from -180 to +180 degrees.' };
  return { valid: true, scenario, reason: 'The Newman state contains a valid signed torsion angle.' };
}

export function createNewmanState(scenarioId) {
  const scenario = scenarioOrNull(NEWMAN_SCENARIO_BY_ID, scenarioId);
  if (!scenario) return outcome(false, null, `Unknown Newman scenario: ${scenarioId}.`);
  return outcome(true, freezeNewmanState(scenarioId, scenario.initialAngle), `${scenario.name} opened at ${scenario.initialAngle} degrees.`);
}

export function setTorsionAngle({ scenarioId, state, angle }) {
  const validation = validateNewmanState(scenarioId, state);
  if (!validation.valid) return outcome(false, state, validation.reason);
  const normalized = normalizeTorsion(angle);
  if (normalized === null) return outcome(false, state, 'Enter a finite torsion angle; the rear carbon did not move.');
  return outcome(true, freezeNewmanState(scenarioId, normalized), `The rear carbon rotated to ${normalized}°. The front carbon stayed fixed.`);
}

const iupacRangeFor = (angle) => {
  const absolute = Math.abs(angle);
  if (absolute < 30) return 'synperiplanar';
  if (absolute < 90) return 'synclinal';
  if (absolute < 150) return 'anticlinal';
  return 'antiperiplanar';
};

const nearestStationFor = (stations, angle) => stations.reduce((best, candidate) => {
  const candidateDistance = Math.abs(candidate.angle - angle);
  const bestDistance = Math.abs(best.angle - angle);
  return candidateDistance < bestDistance ? candidate : best;
});

function interpolatedStrain(stations, angle) {
  const exact = stations.find((item) => Math.abs(item.angle - angle) < 1e-9);
  if (exact) return exact.strain;
  const upperIndex = stations.findIndex((item) => item.angle > angle);
  const upper = stations[upperIndex];
  const lower = stations[upperIndex - 1];
  const fraction = (angle - lower.angle) / (upper.angle - lower.angle);
  return lower.strain + (upper.strain - lower.strain) * fraction;
}

export function newmanResult({ scenarioId, state }) {
  const validation = validateNewmanState(scenarioId, state);
  if (!validation.valid) return Object.freeze({ valid: false, reason: validation.reason });
  const exact = validation.scenario.stations.find((item) => Math.abs(item.angle - state.angle) < 1e-9) || null;
  const nearestStation = nearestStationFor(validation.scenario.stations, state.angle);
  const strain = interpolatedStrain(validation.scenario.stations, state.angle);
  return Object.freeze({
    valid: true,
    angle: state.angle,
    absoluteAngle: Math.abs(state.angle),
    iupacRange: iupacRangeFor(state.angle),
    canonical: Boolean(exact),
    geometry: exact?.geometry || 'intermediate',
    relation: exact?.relation || 'between named stations',
    tier: exact?.tier || 'intermediate',
    strain,
    nearestStation,
    reason: exact
      ? `${state.angle}° is the declared ${exact.relation} ${exact.geometry} station with qualitative strain index ${exact.strain}.`
      : `${state.angle}° lies between declared stations; the nearest is ${nearestStation.angle}°. The curve is interpolated only for visual comparison.`,
  });
}

export function newmanProfile({ scenarioId, step = 3 }) {
  const scenario = scenarioOrNull(NEWMAN_SCENARIO_BY_ID, scenarioId);
  const numericStep = Number(step);
  if (!scenario || !Number.isFinite(numericStep) || numericStep <= 0 || Math.abs(360 / numericStep - Math.round(360 / numericStep)) > 1e-9) return Object.freeze({ valid: false, points: Object.freeze([]), boundary: 'A valid probe and a positive step dividing 360 are required.' });
  const count = Math.round(360 / numericStep);
  const points = Array.from({ length: count + 1 }, (_, index) => {
    const angle = -180 + index * numericStep;
    return Object.freeze({ angle, strain: interpolatedStrain(scenario.stations, angle) });
  });
  return Object.freeze({ valid: true, points: Object.freeze(points), boundary: 'The curve interpolates frozen dimensionless teaching indices. It is not a calculated or measured conformer-energy profile.' });
}

export function evaluateNewman({ scenarioId, state, predictions = {} }) {
  const validation = validateNewmanState(scenarioId, state);
  if (!validation.valid) return Object.freeze({ valid: false, committed: false, reason: validation.reason });
  const result = newmanResult({ scenarioId, state });
  const geometry = dimension(predictions.geometry === result.geometry, result.geometry, predictions.geometry || null, result.canonical ? `The declared station is ${result.geometry}.` : 'This angle is between canonical eclipsed and staggered stations.');
  const relation = dimension(predictions.relation === result.relation, result.relation, predictions.relation || null, result.reason);
  const tier = dimension(predictions.tier === result.tier, result.tier, predictions.tier || null, result.canonical ? `The declared qualitative tier is ${result.tier}; it is not a numerical energy.` : 'Only exact declared stations receive an extremum label.');
  const committed = geometry.correct && relation.correct && tier.correct;
  return Object.freeze({ valid: true, geometry, relation, tier, committed, actual: result, reason: committed ? 'Geometry, relation, and qualitative tier agree with the current angle.' : 'The angle and predictions remain unchanged; inspect the signed geometry and nearest station.' });
}

export function nextStereochemistryHint({ mode, scenarioId, state, level = 1 }) {
  const hintLevel = Math.max(1, Math.min(4, Math.trunc(Number(level) || 1)));
  if (mode === 'tetrahedral') {
    const validation = validateTetrahedralState(scenarioId, state);
    if (!validation.valid) return Object.freeze({ level: hintLevel, message: validation.reason, boundary: STEREOCHEMISTRY_MODEL_BOUNDARY.priority });
    const result = tetrahedralResult({ scenarioId, state });
    const messages = [
      result.stereogenic ? 'All four declared priorities are distinguishable, so this centre is eligible for R/S.' : 'Two declared ligands share a priority, so stop before tracing R/S.',
      `Read the frozen comparison cards first: ${validation.scenario.groups.map((item) => `${item.label}=${item.priority}`).join(', ')}.`,
      'Treat priority 4 as the viewing reference, then follow the spatial order 1 → 2 → 3. Rotating the camera does not swap ligands.',
      result.reason,
    ];
    return Object.freeze({ level: hintLevel, message: messages[hintLevel - 1], boundary: STEREOCHEMISTRY_MODEL_BOUNDARY.priority });
  }
  if (mode === 'alkene') {
    const validation = validateAlkeneState(scenarioId, state);
    if (!validation.valid) return Object.freeze({ level: hintLevel, message: validation.reason, boundary: STEREOCHEMISTRY_MODEL_BOUNDARY.descriptor });
    const result = alkeneResult({ scenarioId, state });
    const messages = [
      result.eligible ? 'Each alkene carbon has one uniquely higher declared priority.' : 'A tied substituent pair makes E/Z undefined before any side comparison.',
      `Left comparison: ${validation.scenario.leftGroups.map((item) => `${item.label}=${item.priority}`).join(', ')}. Right comparison: ${validation.scenario.rightGroups.map((item) => `${item.label}=${item.priority}`).join(', ')}.`,
      result.eligible ? `The two higher-priority groups occupy ${result.leftHigherPosition} on the left and ${result.rightHigherPosition} on the right.` : 'Do not force a same-side/opposite-side label when a local higher priority is undefined.',
      result.reason,
    ];
    return Object.freeze({ level: hintLevel, message: messages[hintLevel - 1], boundary: STEREOCHEMISTRY_MODEL_BOUNDARY.descriptor });
  }
  if (mode === 'newman') {
    const validation = validateNewmanState(scenarioId, state);
    if (!validation.valid) return Object.freeze({ level: hintLevel, message: validation.reason, boundary: STEREOCHEMISTRY_MODEL_BOUNDARY.torsion });
    const result = newmanResult({ scenarioId, state });
    const messages = [
      `The current signed torsion is ${result.angle}° in the ${result.iupacRange} range.`,
      `The nearest declared station is ${result.nearestStation.angle}°; only exact stations receive canonical labels.`,
      result.canonical ? `This station is ${result.geometry} and ${result.relation}.` : 'Rotate to a snap station if you want an exact eclipsed, staggered, anti, or gauche label.',
      result.reason,
    ];
    return Object.freeze({ level: hintLevel, message: messages[hintLevel - 1], boundary: STEREOCHEMISTRY_MODEL_BOUNDARY.torsion });
  }
  return Object.freeze({ level: hintLevel, message: 'Choose the mirror centre, alkene gate, or Newman dial before requesting a hint.', boundary: STEREOCHEMISTRY_MODEL_BOUNDARY.excluded });
}
