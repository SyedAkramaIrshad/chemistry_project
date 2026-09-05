import {
  MO_MODEL_BOUNDARY,
  MO_ORDERINGS,
  MO_SCENARIO_BY_ID,
} from '../data/molecularOrbitalScenarios.js';

const SUPERSCRIPTS = Object.freeze({
  0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶',
});

const invalid = (reason, input = null) => ({ valid: false, reason, input });
const spinLabel = (spin) => spin === 1 ? '↑' : '↓';

function resolveScenario(scenarioId) {
  const scenario = MO_SCENARIO_BY_ID[scenarioId];
  if (!scenario) return null;
  return { scenario, ordering: MO_ORDERINGS[scenario.orderingId] };
}

function orderingOrbitals(ordering) {
  return ordering.levels.flatMap((level) => level.orbitals.map((orbital) => ({
    ...orbital,
    levelId: level.id,
    level,
  })));
}

function cloneState(state) {
  return {
    scenarioId: state.scenarioId,
    occupancy: Object.fromEntries(
      Object.entries(state.occupancy).map(([orbitalId, spins]) => [orbitalId, [...spins]]),
    ),
  };
}

function validateMoState(scenarioId, state) {
  const resolved = resolveScenario(scenarioId);
  if (!resolved) return invalid('Choose one of the declared homonuclear diatomic scenarios.', { scenarioId });
  if (!state || typeof state !== 'object' || Array.isArray(state) || state.scenarioId !== scenarioId || !state.occupancy || typeof state.occupancy !== 'object') {
    return invalid(`Load a valid ${resolved.scenario.formula} molecular-orbital ladder before placing electrons.`, state);
  }
  const orbitals = orderingOrbitals(resolved.ordering);
  const orbitalIds = orbitals.map((orbital) => orbital.id);
  const stateIds = Object.keys(state.occupancy);
  if (stateIds.length !== orbitalIds.length || orbitalIds.some((orbitalId) => !(orbitalId in state.occupancy))) {
    return invalid(`The ${resolved.ordering.name.toLowerCase()} ladder must contain exactly its declared orbital components.`, state);
  }
  for (const orbitalId of orbitalIds) {
    const spins = state.occupancy[orbitalId];
    if (!Array.isArray(spins) || spins.length > 2 || !spins.every((spin) => spin === 1 || spin === -1)) {
      return invalid(`Orbital ${orbitalId} must contain zero, one, or two declared spin arrows.`, state);
    }
    if (spins.length === 2 && spins[0] === spins[1]) {
      return invalid(`Two electrons in ${orbitalId} must have opposite spins.`, state);
    }
  }
  return { valid: true, ...resolved, orbitals };
}

function fillReference(ordering, electronCount) {
  const occupancy = Object.fromEntries(orderingOrbitals(ordering).map((orbital) => [orbital.id, []]));
  let remaining = electronCount;
  for (const level of ordering.levels) {
    if (remaining <= 0) break;
    const levelCount = Math.min(remaining, level.capacity);
    const singles = Math.min(levelCount, level.degeneracy);
    for (let index = 0; index < singles; index += 1) occupancy[level.orbitals[index].id].push(1);
    const pairs = Math.max(0, levelCount - level.degeneracy);
    for (let index = 0; index < pairs; index += 1) occupancy[level.orbitals[index].id].push(-1);
    remaining -= levelCount;
  }
  return occupancy;
}

function levelPopulations(ordering, state) {
  return Object.fromEntries(ordering.levels.map((level) => [
    level.id,
    level.orbitals.reduce((sum, orbital) => sum + state.occupancy[orbital.id].length, 0),
  ]));
}

function expectedLevelPopulations(scenario, ordering) {
  const state = { scenarioId: scenario.id, occupancy: fillReference(ordering, scenario.valenceElectronCount) };
  return levelPopulations(ordering, state);
}

function aufbauCheck(ordering, populations) {
  const violations = [];
  for (let index = 0; index < ordering.levels.length - 1; index += 1) {
    const level = ordering.levels[index];
    if (populations[level.id] >= level.capacity) continue;
    const occupiedHigher = ordering.levels.slice(index + 1).filter((higher) => populations[higher.id] > 0);
    if (occupiedHigher.length) {
      violations.push({
        levelId: level.id,
        missingCapacity: level.capacity - populations[level.id],
        occupiedHigherLevelIds: occupiedHigher.map((higher) => higher.id),
        reason: `${level.label} is a lower-energy level with available capacity while ${occupiedHigher.map((higher) => higher.label).join(', ')} ${occupiedHigher.length === 1 ? 'is' : 'are'} occupied.`,
      });
    }
  }
  return {
    correct: violations.length === 0,
    violations,
    reason: violations.length
      ? `The declared Aufbau ordering is not followed: ${violations.map((violation) => violation.reason).join(' ')}`
      : 'Occupied levels follow the declared qualitative low-to-high energy ordering.',
  };
}

function hundCheck(ordering, state) {
  const violations = [];
  for (const level of ordering.levels.filter((item) => item.degeneracy > 1)) {
    const components = level.orbitals.map((orbital) => state.occupancy[orbital.id]);
    const count = components.reduce((sum, spins) => sum + spins.length, 0);
    if (count === 0) continue;
    const expectedPairs = Math.max(0, count - level.degeneracy);
    const expectedSingles = Math.min(count, 2 * level.degeneracy - count);
    const actualPairs = components.filter((spins) => spins.length === 2).length;
    const singles = components.filter((spins) => spins.length === 1);
    if (actualPairs !== expectedPairs || singles.length !== expectedSingles) {
      violations.push({
        levelId: level.id,
        kind: 'early-pairing',
        reason: `${level.label} pairs electrons before the degenerate components have the introductory maximum-unpaired occupation.`,
      });
      continue;
    }
    if (new Set(singles.map((spins) => spins[0])).size > 1) {
      violations.push({
        levelId: level.id,
        kind: 'nonparallel-singles',
        reason: `The singly occupied degenerate components of ${level.label} use opposite rather than parallel spins.`,
      });
    }
  }
  return {
    correct: violations.length === 0,
    violations,
    reason: violations.length
      ? `The displayed Hund pattern needs inspection: ${violations.map((violation) => violation.reason).join(' ')}`
      : 'Occupied degenerate levels use the introductory maximum-unpaired, parallel-spin pattern.',
  };
}

function superscript(value) {
  return String(value).split('').map((digit) => SUPERSCRIPTS[digit] || digit).join('');
}

export function createEmptyMoState(scenarioId) {
  const resolved = resolveScenario(scenarioId);
  if (!resolved) return invalid('Choose one of the declared homonuclear diatomic scenarios.', { scenarioId });
  return {
    valid: true,
    ...resolved,
    state: {
      scenarioId,
      occupancy: Object.fromEntries(orderingOrbitals(resolved.ordering).map((orbital) => [orbital.id, []])),
    },
  };
}

export function buildReferenceMoState(scenarioId) {
  const resolved = resolveScenario(scenarioId);
  if (!resolved) return invalid('Choose one of the declared homonuclear diatomic scenarios.', { scenarioId });
  return {
    valid: true,
    ...resolved,
    state: {
      scenarioId,
      occupancy: fillReference(resolved.ordering, resolved.scenario.valenceElectronCount),
    },
  };
}

export function placeMoElectron({ scenarioId, state, orbitalId, spin }) {
  const validation = validateMoState(scenarioId, state);
  if (!validation.valid) return { allowed: false, state, reason: validation.reason };
  const orbital = validation.orbitals.find((item) => item.id === orbitalId);
  if (!orbital) return { allowed: false, state, reason: 'Choose one orbital component displayed in the current ladder.' };
  if (spin !== 1 && spin !== -1) return { allowed: false, state, reason: 'Choose a spin-up or spin-down electron cartridge.' };
  const current = state.occupancy[orbitalId];
  if (current.length >= 2) {
    return { allowed: false, state, reason: `${orbital.level.label} component ${orbital.axis} already contains two electrons; no third electron is permitted.` };
  }
  if (current.includes(spin)) {
    return { allowed: false, state, reason: `${orbital.level.label} component ${orbital.axis} already contains ${spinLabel(spin)}. The second electron must have the opposite spin.` };
  }
  const next = cloneState(state);
  next.occupancy[orbitalId].push(spin);
  return {
    allowed: true,
    state: next,
    orbitalId,
    spin,
    reason: `${spinLabel(spin)} placed in ${orbital.level.label}, ${orbital.axis} component. No energy-order or Hund repair was applied.`,
  };
}

export function removeMoElectron({ scenarioId, state, orbitalId, electronIndex }) {
  const validation = validateMoState(scenarioId, state);
  if (!validation.valid) return { allowed: false, state, reason: validation.reason };
  const orbital = validation.orbitals.find((item) => item.id === orbitalId);
  if (!orbital) return { allowed: false, state, reason: 'Choose one orbital component displayed in the current ladder.' };
  const current = state.occupancy[orbitalId];
  if (!Number.isInteger(electronIndex) || electronIndex < 0 || electronIndex >= current.length) {
    return { allowed: false, state, reason: 'Choose a placed spin arrow to remove from this orbital component.' };
  }
  const spin = current[electronIndex];
  const next = cloneState(state);
  next.occupancy[orbitalId].splice(electronIndex, 1);
  return {
    allowed: true,
    state: next,
    orbitalId,
    electronIndex,
    spin,
    reason: `${spinLabel(spin)} removed from ${orbital.level.label}, ${orbital.axis} component.`,
  };
}

export function moStateMetrics({ scenarioId, state }) {
  const validation = validateMoState(scenarioId, state);
  if (!validation.valid) return validation;
  const { scenario, ordering } = validation;
  const populations = levelPopulations(ordering, state);
  const electronCount = Object.values(state.occupancy).reduce((sum, spins) => sum + spins.length, 0);
  const bondingElectrons = ordering.levels
    .filter((level) => level.character === 'bonding')
    .reduce((sum, level) => sum + populations[level.id], 0);
  const antibondingElectrons = ordering.levels
    .filter((level) => level.character === 'antibonding')
    .reduce((sum, level) => sum + populations[level.id], 0);
  const singlyOccupiedOrbitalIds = Object.entries(state.occupancy)
    .filter(([, spins]) => spins.length === 1)
    .map(([orbitalId]) => orbitalId);
  const occupiedLevels = ordering.levels.filter((level) => populations[level.id] > 0);
  const emptyLevels = ordering.levels.filter((level) => populations[level.id] === 0);
  const aufbau = aufbauCheck(ordering, populations);
  const hund = hundCheck(ordering, state);
  return {
    valid: true,
    scenario,
    ordering,
    electronCount,
    expectedElectronCount: scenario.valenceElectronCount,
    electronDifference: scenario.valenceElectronCount - electronCount,
    complete: electronCount === scenario.valenceElectronCount,
    levelPopulations: populations,
    expectedLevelPopulations: expectedLevelPopulations(scenario, ordering),
    bondingElectrons,
    antibondingElectrons,
    bondOrder: (bondingElectrons - antibondingElectrons) / 2,
    unpairedElectrons: singlyOccupiedOrbitalIds.length,
    magnetism: singlyOccupiedOrbitalIds.length > 0 ? 'paramagnetic' : 'diamagnetic',
    aufbau,
    hund,
    highestOccupiedLevelId: occupiedLevels.length ? occupiedLevels.at(-1).id : null,
    lowestEmptyLevelId: emptyLevels.length ? emptyLevels[0].id : null,
    singlyOccupiedOrbitalIds,
  };
}

export function moConfigurationNotation({ scenarioId, state }) {
  const metrics = moStateMetrics({ scenarioId, state });
  if (!metrics.valid || metrics.electronCount === 0) return 'empty MO ladder';
  return metrics.ordering.levels
    .filter((level) => metrics.levelPopulations[level.id] > 0)
    .map((level) => `${level.label}${superscript(metrics.levelPopulations[level.id])}`)
    .join(' ');
}

export function evaluateMoConfiguration({ scenarioId, state, predictions = {} }) {
  const metrics = moStateMetrics({ scenarioId, state });
  if (!metrics.valid) return { committed: false, ...metrics };
  const levelPopulationCorrect = metrics.ordering.levels.every(
    (level) => metrics.levelPopulations[level.id] === metrics.expectedLevelPopulations[level.id],
  );
  const predictedBondOrder = Number(predictions.bondOrder);
  const predictedUnpaired = Number(predictions.unpaired);
  const predictedMagnetism = String(predictions.magnetism ?? '').trim().toLowerCase();
  const electronCount = {
    correct: metrics.complete,
    actual: metrics.electronCount,
    expected: metrics.expectedElectronCount,
    reason: metrics.complete
      ? 'The displayed ladder contains the declared valence-electron count.'
      : `${Math.abs(metrics.electronDifference)} electron${Math.abs(metrics.electronDifference) === 1 ? '' : 's'} must be ${metrics.electronDifference > 0 ? 'added' : 'removed'} to match this scenario.`,
  };
  const levelPopulation = {
    correct: levelPopulationCorrect,
    actual: { ...metrics.levelPopulations },
    expected: { ...metrics.expectedLevelPopulations },
    reason: levelPopulationCorrect
      ? 'Every qualitative energy level has the declared ground-reference population.'
      : 'At least one level population differs from the declared ground reference; the ladder was preserved for inspection.',
  };
  const bondOrder = {
    correct: metrics.complete && Number.isFinite(predictedBondOrder) && Math.abs(predictedBondOrder - metrics.bondOrder) < 1e-10,
    actual: metrics.bondOrder,
    prediction: Number.isFinite(predictedBondOrder) ? predictedBondOrder : null,
    expectedReference: metrics.scenario.expectedBondOrder,
    reason: `This displayed occupation contains ${metrics.bondingElectrons} bonding and ${metrics.antibondingElectrons} antibonding electrons, so (${metrics.bondingElectrons} - ${metrics.antibondingElectrons}) / 2 = ${metrics.bondOrder}.`,
  };
  const unpaired = {
    correct: metrics.complete && Number.isInteger(predictedUnpaired) && predictedUnpaired === metrics.unpairedElectrons,
    actual: metrics.unpairedElectrons,
    prediction: Number.isInteger(predictedUnpaired) ? predictedUnpaired : null,
    expectedReference: metrics.scenario.expectedUnpaired,
    reason: `${metrics.unpairedElectrons} displayed orbital component${metrics.unpairedElectrons === 1 ? ' is' : 's are'} singly occupied.`,
  };
  const magnetism = {
    correct: metrics.complete && predictedMagnetism === metrics.magnetism,
    actual: metrics.magnetism,
    prediction: predictedMagnetism || null,
    expectedReference: metrics.scenario.expectedMagnetism,
    reason: metrics.unpairedElectrons > 0
      ? 'One or more displayed electrons are unpaired, giving the classroom spin-only paramagnetic classification.'
      : 'Every displayed electron is paired, giving the classroom spin-only diamagnetic classification.',
  };
  return {
    valid: true,
    committed: electronCount.correct
      && levelPopulation.correct
      && metrics.aufbau.correct
      && metrics.hund.correct
      && bondOrder.correct
      && unpaired.correct
      && magnetism.correct,
    electronCount,
    levelPopulation,
    aufbau: metrics.aufbau,
    hund: metrics.hund,
    bondOrder,
    unpaired,
    magnetism,
    metrics,
  };
}

export function moWaveDescriptor({ scenarioId, levelId }) {
  const resolved = resolveScenario(scenarioId);
  if (!resolved) return invalid('Choose one of the declared homonuclear diatomic scenarios.', { scenarioId });
  const level = resolved.ordering.levels.find((item) => item.id === levelId);
  if (!level) return invalid('Choose one molecular-orbital level displayed in the current ladder.', { levelId });
  return {
    valid: true,
    scenario: resolved.scenario,
    ordering: resolved.ordering,
    level,
    levelId,
    label: level.label,
    character: level.character,
    symmetry: level.symmetry,
    source: level.source,
    degeneracy: level.degeneracy,
    phaseRelationship: level.character === 'bonding' ? 'same' : 'opposite',
    internuclearNode: level.character === 'antibonding',
    axialNodalPlane: level.symmetry === 'pi',
    boundary: MO_MODEL_BOUNDARY.orbitalGraphic,
  };
}

export function compareMoOrderings() {
  const earlyOrder = MO_ORDERINGS.earlySecondPeriod.levels.map((level) => level.id);
  const lateOrder = MO_ORDERINGS.lateSecondPeriod.levels.map((level) => level.id);
  const sharedLevelIds = earlyOrder.filter((levelId, index) => lateOrder[index] === levelId);
  return {
    valid: true,
    earlyOrder,
    lateOrder,
    sharedLevelIds,
    crossover: {
      earlyLower: 'piU2p',
      earlyHigher: 'sigmaG2p',
      lateLower: 'sigmaG2p',
      lateHigher: 'piU2p',
      reason: 'Only the relative introductory placement of πu(2p) and σg(2p) changes between the two declared second-period teaching ladders.',
    },
  };
}

export function nextMoHint({ scenarioId, state, level = 1 }) {
  const metrics = moStateMetrics({ scenarioId, state });
  if (!metrics.valid) return metrics;
  if (!Number.isInteger(level) || level < 1 || level > 5) return invalid('Choose a hint level from 1 through 5.', { level });
  const nextLevel = metrics.ordering.levels.find((item) => metrics.levelPopulations[item.id] < item.capacity);
  const referencePopulationText = metrics.ordering.levels
    .map((item) => `${item.label}: ${metrics.expectedLevelPopulations[item.id]}`)
    .join(' · ');
  const messages = {
    1: `${metrics.scenario.formula} uses ${metrics.expectedElectronCount} ${metrics.ordering.id === 'oneS' ? 'displayed' : 'valence'} electron${metrics.expectedElectronCount === 1 ? '' : 's'} in this declared ladder.`,
    2: metrics.aufbau.correct
      ? `${nextLevel ? nextLevel.label + ' is the lowest displayed level with remaining capacity.' : 'Every displayed level is full.'}`
      : metrics.aufbau.reason,
    3: metrics.hund.correct
      ? 'Within each occupied degenerate π level, maximize singly occupied parallel-spin components before pairing.'
      : metrics.hund.reason,
    4: `Count ${metrics.bondingElectrons} bonding and ${metrics.antibondingElectrons} antibonding electrons, then evaluate (bonding - antibonding) / 2.`,
    5: `Declared reference level populations: ${referencePopulationText}. This hint does not load them.`,
  };
  return {
    valid: true,
    level,
    message: messages[level],
    boundary: 'Hints describe the declared qualitative ladder and never place, remove, or re-spin an electron.',
  };
}
