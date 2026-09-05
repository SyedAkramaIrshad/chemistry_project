import assert from 'node:assert/strict';
import {
  MO_ORDERINGS,
  MO_ORDERING_LIST,
  MO_SCENARIOS,
  MO_SCENARIO_BY_ID,
} from '../src/data/molecularOrbitalScenarios.js';
import {
  buildReferenceMoState,
  compareMoOrderings,
  createEmptyMoState,
  evaluateMoConfiguration,
  moConfigurationNotation,
  moStateMetrics,
  moWaveDescriptor,
  nextMoHint,
  placeMoElectron,
  removeMoElectron,
} from '../src/chemistry/molecularOrbitals.js';

const close = (actual, expected, tolerance = 1e-10) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
};

assert.equal(MO_ORDERING_LIST.length, 3);
assert.equal(MO_SCENARIOS.length, 15);
assert.equal(MO_SCENARIO_BY_ID.oxygen.expectedUnpaired, 2);
assert.equal(MO_SCENARIO_BY_ID.nitrogen.expectedBondOrder, 3);
assert.equal(MO_SCENARIO_BY_ID.helium.expectedBondOrder, 0);
assert.ok(MO_ORDERINGS.earlySecondPeriod.levels.findIndex((level) => level.id === 'piU2p') < MO_ORDERINGS.earlySecondPeriod.levels.findIndex((level) => level.id === 'sigmaG2p'));
assert.ok(MO_ORDERINGS.lateSecondPeriod.levels.findIndex((level) => level.id === 'sigmaG2p') < MO_ORDERINGS.lateSecondPeriod.levels.findIndex((level) => level.id === 'piU2p'));
for (const ordering of MO_ORDERING_LIST) {
  assert.ok(Object.isFrozen(ordering) && Object.isFrozen(ordering.levels));
  const orbitalIds = ordering.levels.flatMap((level) => level.orbitals.map((orbital) => orbital.id));
  assert.equal(new Set(orbitalIds).size, orbitalIds.length);
  ordering.levels.forEach((level, index) => {
    assert.equal(level.energyRank, index);
    assert.equal(level.capacity, level.degeneracy * 2);
    assert.ok(Object.isFrozen(level) && Object.isFrozen(level.orbitals));
  });
}
for (const scenario of MO_SCENARIOS) {
  assert.ok(MO_ORDERINGS[scenario.orderingId]);
  assert.equal(scenario.valencePerNeutralAtom * 2 - scenario.charge, scenario.valenceElectronCount);
  assert.ok(Number.isFinite(scenario.expectedBondOrder));
  assert.equal(scenario.expectedMagnetism, scenario.expectedUnpaired > 0 ? 'paramagnetic' : 'diamagnetic');
  assert.ok(Object.isFrozen(scenario));
}

const emptyOxygen = createEmptyMoState('oxygen');
assert.equal(emptyOxygen.valid, true);
assert.equal(Object.values(emptyOxygen.state.occupancy).flat().length, 0);
const firstElectron = placeMoElectron({ scenarioId: 'oxygen', state: emptyOxygen.state, orbitalId: 'sigmaG2s-z', spin: 1 });
assert.equal(firstElectron.allowed, true);
assert.notEqual(firstElectron.state, emptyOxygen.state);
assert.deepEqual(emptyOxygen.state.occupancy['sigmaG2s-z'], []);
const duplicateSpin = placeMoElectron({ scenarioId: 'oxygen', state: firstElectron.state, orbitalId: 'sigmaG2s-z', spin: 1 });
assert.equal(duplicateSpin.allowed, false);
assert.equal(duplicateSpin.state, firstElectron.state);
assert.match(duplicateSpin.reason, /opposite|duplicate|spin/i);
const paired = placeMoElectron({ scenarioId: 'oxygen', state: firstElectron.state, orbitalId: 'sigmaG2s-z', spin: -1 });
assert.equal(paired.allowed, true);
const thirdElectron = placeMoElectron({ scenarioId: 'oxygen', state: paired.state, orbitalId: 'sigmaG2s-z', spin: 1 });
assert.equal(thirdElectron.allowed, false);
assert.equal(thirdElectron.state, paired.state);
assert.match(thirdElectron.reason, /two|third|full/i);
const removal = removeMoElectron({ scenarioId: 'oxygen', state: paired.state, orbitalId: 'sigmaG2s-z', electronIndex: 0 });
assert.equal(removal.allowed, true);
assert.equal(removal.state.occupancy['sigmaG2s-z'].length, 1);
assert.equal(paired.state.occupancy['sigmaG2s-z'].length, 2);

for (const scenario of MO_SCENARIOS) {
  const reference = buildReferenceMoState(scenario.id);
  assert.equal(reference.valid, true, scenario.id);
  const metrics = moStateMetrics({ scenarioId: scenario.id, state: reference.state });
  assert.equal(metrics.valid, true, scenario.id);
  assert.equal(metrics.complete, true, scenario.id);
  assert.equal(metrics.electronCount, scenario.valenceElectronCount, scenario.id);
  close(metrics.bondOrder, scenario.expectedBondOrder);
  assert.equal(metrics.unpairedElectrons, scenario.expectedUnpaired, scenario.id);
  assert.equal(metrics.magnetism, scenario.expectedMagnetism, scenario.id);
  assert.equal(metrics.aufbau.correct, true, scenario.id);
  assert.equal(metrics.hund.correct, true, scenario.id);
  const evaluation = evaluateMoConfiguration({
    scenarioId: scenario.id,
    state: reference.state,
    predictions: {
      bondOrder: scenario.expectedBondOrder,
      unpaired: scenario.expectedUnpaired,
      magnetism: scenario.expectedMagnetism,
    },
  });
  assert.equal(evaluation.committed, true, scenario.id);
}

const expectedReferenceMetrics = {
  hydrogenCation: [0.5, 1, 'paramagnetic'],
  hydrogen: [1, 0, 'diamagnetic'],
  heliumCation: [0.5, 1, 'paramagnetic'],
  helium: [0, 0, 'diamagnetic'],
  lithium: [1, 0, 'diamagnetic'],
  beryllium: [0, 0, 'diamagnetic'],
  boron: [1, 2, 'paramagnetic'],
  carbon: [2, 0, 'diamagnetic'],
  nitrogen: [3, 0, 'diamagnetic'],
  oxygenCation: [2.5, 1, 'paramagnetic'],
  oxygen: [2, 2, 'paramagnetic'],
  superoxide: [1.5, 1, 'paramagnetic'],
  peroxide: [1, 0, 'diamagnetic'],
  fluorine: [1, 0, 'diamagnetic'],
  neon: [0, 0, 'diamagnetic'],
};
for (const [scenarioId, [bondOrder, unpaired, magnetism]] of Object.entries(expectedReferenceMetrics)) {
  const metrics = moStateMetrics({ scenarioId, state: buildReferenceMoState(scenarioId).state });
  close(metrics.bondOrder, bondOrder);
  assert.equal(metrics.unpairedElectrons, unpaired);
  assert.equal(metrics.magnetism, magnetism);
}

const oxygenReference = buildReferenceMoState('oxygen').state;
const oxygenMetrics = moStateMetrics({ scenarioId: 'oxygen', state: oxygenReference });
assert.deepEqual(oxygenMetrics.levelPopulations, {
  sigmaG2s: 2,
  sigmaU2sStar: 2,
  sigmaG2p: 2,
  piU2p: 4,
  piG2pStar: 2,
  sigmaU2pStar: 0,
});
assert.deepEqual(oxygenMetrics.singlyOccupiedOrbitalIds.sort(), ['piG2pStar-x', 'piG2pStar-y']);
assert.equal(oxygenMetrics.highestOccupiedLevelId, 'piG2pStar');
assert.equal(oxygenMetrics.lowestEmptyLevelId, 'sigmaU2pStar');
assert.match(moConfigurationNotation({ scenarioId: 'oxygen', state: oxygenReference }), /σg\(2s\).*πg\*\(2p\)/);

const boronReference = buildReferenceMoState('boron').state;
let wrongHund = removeMoElectron({ scenarioId: 'boron', state: boronReference, orbitalId: 'piU2p-y', electronIndex: 0 }).state;
wrongHund = placeMoElectron({ scenarioId: 'boron', state: wrongHund, orbitalId: 'piU2p-x', spin: -1 }).state;
const wrongHundBefore = JSON.stringify(wrongHund);
const wrongHundMetrics = moStateMetrics({ scenarioId: 'boron', state: wrongHund });
assert.equal(wrongHundMetrics.complete, true);
assert.equal(wrongHundMetrics.aufbau.correct, true);
assert.equal(wrongHundMetrics.hund.correct, false);
assert.match(wrongHundMetrics.hund.reason, /degenerate|unpaired|Hund/i);
assert.deepEqual(wrongHundMetrics.levelPopulations, moStateMetrics({ scenarioId: 'boron', state: boronReference }).levelPopulations);
const wrongHundEvaluation = evaluateMoConfiguration({
  scenarioId: 'boron',
  state: wrongHund,
  predictions: { bondOrder: 1, unpaired: 0, magnetism: 'diamagnetic' },
});
assert.equal(wrongHundEvaluation.levelPopulation.correct, true);
assert.equal(wrongHundEvaluation.hund.correct, false);
assert.equal(wrongHundEvaluation.committed, false);
assert.equal(JSON.stringify(wrongHund), wrongHundBefore);

let wrongAufbau = removeMoElectron({ scenarioId: 'oxygen', state: oxygenReference, orbitalId: 'sigmaG2p-z', electronIndex: 1 }).state;
wrongAufbau = placeMoElectron({ scenarioId: 'oxygen', state: wrongAufbau, orbitalId: 'sigmaU2pStar-z', spin: 1 }).state;
const wrongAufbauBefore = JSON.stringify(wrongAufbau);
const wrongAufbauMetrics = moStateMetrics({ scenarioId: 'oxygen', state: wrongAufbau });
assert.equal(wrongAufbauMetrics.complete, true);
assert.equal(wrongAufbauMetrics.aufbau.correct, false);
assert.match(wrongAufbauMetrics.aufbau.reason, /lower|energy|Aufbau/i);
assert.equal(JSON.stringify(wrongAufbau), wrongAufbauBefore);

const wrongPredictions = { bondOrder: 3, unpaired: 0, magnetism: 'diamagnetic' };
const wrongPredictionsBefore = JSON.stringify(wrongPredictions);
const oxygenWrong = evaluateMoConfiguration({ scenarioId: 'oxygen', state: oxygenReference, predictions: wrongPredictions });
assert.equal(oxygenWrong.bondOrder.correct, false);
assert.equal(oxygenWrong.unpaired.correct, false);
assert.equal(oxygenWrong.magnetism.correct, false);
assert.equal(JSON.stringify(wrongPredictions), wrongPredictionsBefore);

const bondingSigma = moWaveDescriptor({ scenarioId: 'hydrogen', levelId: 'sigmaG1s' });
assert.equal(bondingSigma.valid, true);
assert.equal(bondingSigma.symmetry, 'sigma');
assert.equal(bondingSigma.phaseRelationship, 'same');
assert.equal(bondingSigma.internuclearNode, false);
const antibondingPi = moWaveDescriptor({ scenarioId: 'oxygen', levelId: 'piG2pStar' });
assert.equal(antibondingPi.valid, true);
assert.equal(antibondingPi.symmetry, 'pi');
assert.equal(antibondingPi.phaseRelationship, 'opposite');
assert.equal(antibondingPi.internuclearNode, true);
assert.equal(antibondingPi.degeneracy, 2);
assert.match(antibondingPi.boundary, /qualitative|wavefunction|not/i);

const orderingComparison = compareMoOrderings();
assert.equal(orderingComparison.valid, true);
assert.equal(orderingComparison.crossover.earlyLower, 'piU2p');
assert.equal(orderingComparison.crossover.lateLower, 'sigmaG2p');
assert.deepEqual(orderingComparison.sharedLevelIds.sort(), ['piG2pStar', 'sigmaG2s', 'sigmaU2pStar', 'sigmaU2sStar'].sort());

for (const level of [1, 2, 3, 4, 5]) {
  const hintStateBefore = JSON.stringify(wrongHund);
  const hint = nextMoHint({ scenarioId: 'boron', state: wrongHund, level });
  assert.equal(hint.valid, true);
  assert.equal(hint.level, level);
  assert.equal(JSON.stringify(wrongHund), hintStateBefore);
}

console.log('Three qualitative MO orderings and fifteen declared homonuclear diatomic scenarios resolved.');
console.log('H2+/He2+ half-order, N2 order 3, O2 two-unpaired, oxygen-ion series, and zero-order He2/Be2/Ne2 references verified.');
console.log('immutable spin placement, Pauli blocking, separate Aufbau/Hund evidence, formal bond order, magnetism, wave descriptors, ordering crossover, predictions, and hints verified.');
