import assert from 'node:assert/strict';
import {
  ALKENE_SCENARIOS,
  ALKENE_SCENARIO_BY_ID,
  NEWMAN_SCENARIOS,
  STEREOCHEMISTRY_MODEL_BOUNDARY,
  TETRAHEDRAL_SCENARIOS,
  TETRAHEDRAL_SITES,
  TORSION_STATIONS,
} from '../src/data/stereochemistryScenarios.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../src/data/scienceSources.js';
import {
  alkeneResult,
  createAlkeneState,
  createNewmanState,
  createTetrahedralState,
  evaluateAlkene,
  evaluateNewman,
  evaluateTetrahedral,
  mirrorTetrahedralState,
  newmanProfile,
  newmanResult,
  nextStereochemistryHint,
  projectTetrahedral,
  setTorsionAngle,
  swapAlkeneSide,
  swapTetrahedralSites,
  tetrahedralResult,
} from '../src/chemistry/stereochemistry.js';

const passport = MODEL_PASSPORTS.stereochemicalNavigation;
assert.equal(TETRAHEDRAL_SITES.length, 4);
assert.equal(TETRAHEDRAL_SCENARIOS.length, 6);
assert.equal(ALKENE_SCENARIOS.length, 6);
assert.equal(NEWMAN_SCENARIOS.length, 2);
assert.equal(TORSION_STATIONS.length, 7);
assert.equal(ALKENE_SCENARIO_BY_ID['z-2-butene'].expectedDescriptor, 'Z');
assert.equal(ALKENE_SCENARIO_BY_ID['repeated-substituent-gate'].expectedDescriptor, 'undefined');
assert.ok(Object.isFrozen(TETRAHEDRAL_SITES));
assert.ok(TETRAHEDRAL_SCENARIOS.every((scenario) => Object.isFrozen(scenario) && Object.isFrozen(scenario.groups) && Object.isFrozen(scenario.initialArrangement)));
assert.ok(ALKENE_SCENARIOS.every((scenario) => Object.isFrozen(scenario) && Object.isFrozen(scenario.leftGroups) && Object.isFrozen(scenario.rightGroups) && Object.isFrozen(scenario.initialArrangement)));
assert.ok(NEWMAN_SCENARIOS.every((scenario) => Object.isFrozen(scenario) && Object.isFrozen(scenario.stations)));
assert.match(STEREOCHEMISTRY_MODEL_BOUNDARY.priority, /frozen local/i);
assert.match(STEREOCHEMISTRY_MODEL_BOUNDARY.torsion, /dimensionless/i);
assert.equal(passport.sources.length, 12);
assert.ok(passport.sources.every((sourceId) => SCIENCE_SOURCES[sourceId]?.url));

for (const scenario of TETRAHEDRAL_SCENARIOS) {
  const created = createTetrahedralState(scenario.id);
  assert.equal(created.allowed, true, `${scenario.id} should create`);
  const state = created.state;
  assert.ok(Object.isFrozen(state));
  assert.ok(Object.isFrozen(state.arrangement));
  assert.deepEqual(new Set(Object.keys(state.arrangement)), new Set(TETRAHEDRAL_SITES.map((site) => site.id)));
  assert.deepEqual(new Set(Object.values(state.arrangement)), new Set(scenario.groups.map((item) => item.id)));

  const result = tetrahedralResult({ scenarioId: scenario.id, state });
  assert.equal(result.valid, true);
  assert.equal(result.descriptor, scenario.expectedDescriptor);
  assert.equal(result.stereogenic, scenario.expectedDescriptor !== null);
  assert.equal(result.mirrorRelationship, scenario.expectedDescriptor === null ? 'same' : 'enantiomer');

  const firstSiteId = TETRAHEDRAL_SITES[0].id;
  const secondSiteId = TETRAHEDRAL_SITES[1].id;
  const once = swapTetrahedralSites({ scenarioId: scenario.id, state, firstSiteId, secondSiteId });
  assert.equal(once.allowed, true);
  assert.notEqual(once.state, state);
  assert.deepEqual(state.arrangement, scenario.initialArrangement, `${scenario.id} original state must remain unchanged`);
  const onceResult = tetrahedralResult({ scenarioId: scenario.id, state: once.state });
  if (result.stereogenic) assert.equal(onceResult.descriptor, result.descriptor === 'R' ? 'S' : 'R');
  else assert.equal(onceResult.descriptor, null);

  const twice = swapTetrahedralSites({ scenarioId: scenario.id, state: once.state, firstSiteId, secondSiteId });
  assert.deepEqual(twice.state.arrangement, state.arrangement);
  assert.equal(tetrahedralResult({ scenarioId: scenario.id, state: twice.state }).descriptor, result.descriptor);

  const blocked = swapTetrahedralSites({ scenarioId: scenario.id, state, firstSiteId, secondSiteId: firstSiteId });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.state, state);

  const mirror = mirrorTetrahedralState({ scenarioId: scenario.id, state });
  assert.equal(mirror.allowed, true);
  assert.notEqual(mirror.state, state);
  const mirrorResult = tetrahedralResult({ scenarioId: scenario.id, state: mirror.state });
  if (result.stereogenic) assert.equal(mirrorResult.descriptor, result.descriptor === 'R' ? 'S' : 'R');
  else assert.equal(mirrorResult.descriptor, null);

  for (const viewAngleDeg of [0, 90, 180, 270]) {
    const projection = projectTetrahedral({ scenarioId: scenario.id, state, viewAngleDeg });
    assert.equal(projection.points.length, 4);
    assert.equal(projection.descriptor, result.descriptor);
    assert.equal(projection.viewAngleDeg, viewAngleDeg);
    assert.ok(projection.points.some((point) => point.depth > 0));
    assert.ok(projection.points.some((point) => point.depth < 0));
    assert.equal(projection.state, state);
  }

  const priorityAssignments = Object.fromEntries(scenario.groups.map((item) => [item.id, item.priority]));
  const predictions = {
    priorityAssignments,
    stereogenic: result.stereogenic ? 'stereogenic' : 'not stereogenic',
    descriptor: result.descriptor || 'not applicable',
    mirrorRelationship: result.mirrorRelationship,
  };
  const evaluated = evaluateTetrahedral({ scenarioId: scenario.id, state, predictions });
  assert.equal(evaluated.committed, true, `${scenario.id} reference evaluation should commit`);
  assert.ok(evaluated.priorities.every((dimension) => dimension.correct));

  const wrongAssignments = { ...priorityAssignments, [scenario.groups[0].id]: 4 };
  const wrongPredictions = { ...predictions, priorityAssignments: wrongAssignments };
  const wrong = evaluateTetrahedral({ scenarioId: scenario.id, state, predictions: wrongPredictions });
  assert.equal(wrong.committed, false);
  assert.equal(wrong.priorities.find((dimension) => dimension.groupId === scenario.groups[0].id).correct, false);
  assert.deepEqual(wrongPredictions.priorityAssignments, wrongAssignments);
}

const duplicate = createTetrahedralState('duplicate-ligand-gate').state;
assert.equal(tetrahedralResult({ scenarioId: 'duplicate-ligand-gate', state: duplicate }).descriptor, null);
assert.equal(tetrahedralResult({ scenarioId: 'duplicate-ligand-gate', state: duplicate }).reason.includes('distinguishable'), true);

for (const scenario of ALKENE_SCENARIOS) {
  const created = createAlkeneState(scenario.id);
  assert.equal(created.allowed, true);
  const state = created.state;
  assert.ok(Object.isFrozen(state));
  assert.ok(Object.isFrozen(state.left));
  assert.ok(Object.isFrozen(state.right));
  const result = alkeneResult({ scenarioId: scenario.id, state });
  assert.equal(result.descriptor, scenario.expectedDescriptor, `${scenario.id} descriptor`);

  const predictions = {
    leftHigherId: result.leftHigherGroupId || 'tie',
    rightHigherId: result.rightHigherGroupId || 'tie',
    eligibility: result.eligible ? 'eligible' : 'undefined',
    descriptor: result.descriptor,
  };
  const evaluated = evaluateAlkene({ scenarioId: scenario.id, state, predictions });
  assert.equal(evaluated.committed, true);

  const swapped = swapAlkeneSide({ scenarioId: scenario.id, state, side: 'right' });
  assert.equal(swapped.allowed, true);
  assert.notEqual(swapped.state, state);
  assert.deepEqual(state.left, scenario.initialArrangement.left);
  assert.deepEqual(state.right, scenario.initialArrangement.right);
  const swappedResult = alkeneResult({ scenarioId: scenario.id, state: swapped.state });
  if (result.eligible) assert.equal(swappedResult.descriptor, result.descriptor === 'E' ? 'Z' : 'E');
  else assert.equal(swappedResult.descriptor, 'undefined');

  const blocked = swapAlkeneSide({ scenarioId: scenario.id, state, side: 'centre' });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.state, state);

  const wrongPredictions = { ...predictions, descriptor: result.descriptor === 'E' ? 'Z' : 'E' };
  const wrong = evaluateAlkene({ scenarioId: scenario.id, state, predictions: wrongPredictions });
  assert.equal(wrong.committed, false);
  assert.equal(wrong.descriptor.correct, false);
  assert.equal(wrongPredictions.descriptor, result.descriptor === 'E' ? 'Z' : 'E');
}

const butane = createNewmanState('butane').state;
for (const expected of TORSION_STATIONS) {
  const set = setTorsionAngle({ scenarioId: 'butane', state: butane, angle: expected.angle });
  assert.equal(set.allowed, true);
  const result = newmanResult({ scenarioId: 'butane', state: set.state });
  assert.equal(result.canonical, true);
  assert.equal(result.geometry, expected.geometry);
  assert.equal(result.relation, expected.relation);
  assert.equal(result.tier, expected.tier);
  assert.equal(result.strain, expected.strain);
  const evaluated = evaluateNewman({ scenarioId: 'butane', state: set.state, predictions: { geometry: result.geometry, relation: result.relation, tier: result.tier } });
  assert.equal(evaluated.committed, true);
}

const intermediateState = setTorsionAngle({ scenarioId: 'butane', state: butane, angle: 37 }).state;
const intermediate = newmanResult({ scenarioId: 'butane', state: intermediateState });
assert.equal(intermediate.angle, 37);
assert.equal(intermediate.canonical, false);
assert.equal(intermediate.geometry, 'intermediate');
assert.equal(intermediate.relation, 'between named stations');
assert.equal(intermediate.tier, 'intermediate');
assert.equal(intermediate.nearestStation.angle, 60);
assert.equal(intermediate.iupacRange, 'synclinal');
assert.ok(intermediate.strain > 1 && intermediate.strain < 3);

for (const [angle, range] of [[0, 'synperiplanar'], [29.999, 'synperiplanar'], [30, 'synclinal'], [89.999, 'synclinal'], [90, 'anticlinal'], [149.999, 'anticlinal'], [150, 'antiperiplanar'], [180, 'antiperiplanar']]) {
  const state = setTorsionAngle({ scenarioId: 'butane', state: butane, angle }).state;
  assert.equal(newmanResult({ scenarioId: 'butane', state }).iupacRange, range, `${angle} range`);
}
assert.equal(newmanResult({ scenarioId: 'butane', state: setTorsionAngle({ scenarioId: 'butane', state: butane, angle: 300 }).state }).angle, -60);
assert.equal(newmanResult({ scenarioId: 'butane', state: setTorsionAngle({ scenarioId: 'butane', state: butane, angle: 540 }).state }).angle, 180);

const ethane = createNewmanState('ethane').state;
for (const angle of [-180, -60, 60, 180]) {
  const result = newmanResult({ scenarioId: 'ethane', state: setTorsionAngle({ scenarioId: 'ethane', state: ethane, angle }).state });
  assert.equal(result.geometry, 'staggered');
  assert.equal(result.tier, 'equivalent minimum');
  assert.equal(result.strain, 0);
}
for (const angle of [-120, 0, 120]) {
  const result = newmanResult({ scenarioId: 'ethane', state: setTorsionAngle({ scenarioId: 'ethane', state: ethane, angle }).state });
  assert.equal(result.geometry, 'eclipsed');
  assert.equal(result.tier, 'equivalent maximum');
  assert.equal(result.strain, 1);
}

const profile = newmanProfile({ scenarioId: 'butane', step: 3 });
assert.equal(profile.points[0].angle, -180);
assert.equal(profile.points.at(-1).angle, 180);
assert.equal(profile.points.length, 121);
assert.match(profile.boundary, /dimensionless/i);

const wrongNewmanPredictions = { geometry: 'staggered', relation: 'anti', tier: 'global minimum' };
const wrongNewman = evaluateNewman({ scenarioId: 'butane', state: butane, predictions: wrongNewmanPredictions });
assert.equal(wrongNewman.committed, false);
assert.equal(wrongNewmanPredictions.geometry, 'staggered');

for (const mode of ['tetrahedral', 'alkene', 'newman']) {
  const scenarioId = mode === 'tetrahedral' ? 'lactic-acid-set' : mode === 'alkene' ? 'z-2-butene' : 'butane';
  const state = mode === 'tetrahedral' ? createTetrahedralState(scenarioId).state : mode === 'alkene' ? createAlkeneState(scenarioId).state : createNewmanState(scenarioId).state;
  const snapshot = JSON.stringify(state);
  for (let level = 1; level <= 4; level += 1) {
    const hint = nextStereochemistryHint({ mode, scenarioId, state, level });
    assert.equal(hint.level, level);
    assert.ok(hint.message.length > 20);
    assert.ok(hint.boundary.length > 20);
    assert.equal(JSON.stringify(state), snapshot);
  }
}

console.log('Six tetrahedral priority sets, six alkene arrangements, and two Newman probes resolved.');
console.log('One-swap inversion, two-swap restoration, mirror generation, repeated-ligand eligibility, E/Z side comparison, and undefined gates verified.');
console.log('Butane canonical stations, ethane symmetry, signed torsion ranges, qualitative profile, immutable predictions, and non-mutating hints verified.');
