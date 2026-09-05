import assert from 'node:assert/strict';
import {
  ATOMIC_ELEMENTS,
  ATOMIC_ELEMENT_BY_SYMBOL,
  ATOMIC_SUBSHELLS,
} from '../src/data/atomicElements.js';
import {
  atomicConfigurationNotation,
  atomicStateMetrics,
  buildReferenceOrbitalState,
  compareIonizationEnergies,
  createEmptyAtomicState,
  evaluateAtomicConfiguration,
  evaluateQuantumPrediction,
  loadClosedCore,
  nextAtomicHint,
  placeAtomicElectron,
  quantumAddressForElectron,
  removeAtomicElectron,
  subshellTotals,
} from '../src/chemistry/atomicStructure.js';

const close = (actual, expected, tolerance = 1e-8) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
};

assert.equal(ATOMIC_ELEMENTS.length, 36);
assert.deepEqual(ATOMIC_ELEMENTS.map((element) => element.atomicNumber), Array.from({ length: 36 }, (_, index) => index + 1));
assert.equal(ATOMIC_ELEMENT_BY_SYMBOL.Cr.shorthand, '[Ar] 3d⁵ 4s¹');
assert.equal(ATOMIC_ELEMENT_BY_SYMBOL.Cu.shorthand, '[Ar] 3d¹⁰ 4s¹');
assert.equal(ATOMIC_ELEMENT_BY_SYMBOL.Fe.ionizationEnergyEV, 7.9025);
assert.equal(ATOMIC_ELEMENT_BY_SYMBOL.Ar.atomicWeight, 39.95);
assert.equal(ATOMIC_SUBSHELLS.reduce((sum, item) => sum + item.capacity, 0), 36);
assert.ok(ATOMIC_ELEMENTS.every((element) => Object.values(element.groundSubshells).reduce((sum, value) => sum + value, 0) === element.atomicNumber));
assert.ok(Object.isFrozen(ATOMIC_ELEMENTS) && Object.isFrozen(ATOMIC_ELEMENT_BY_SYMBOL.Cr.groundSubshells));

const carbonReference = buildReferenceOrbitalState(6);
assert.equal(carbonReference.valid, true);
assert.deepEqual(subshellTotals(carbonReference.state), { '1s': 2, '2s': 2, '2p': 2, '3s': 0, '3p': 0, '4s': 0, '3d': 0, '4p': 0 });
const carbonMetrics = atomicStateMetrics(carbonReference.state);
assert.equal(carbonMetrics.valid, true);
assert.equal(carbonMetrics.electronCount, 6);
assert.equal(carbonMetrics.unpairedElectrons, 2);
assert.equal(carbonMetrics.magnetism, 'paramagnetic');
assert.equal(atomicConfigurationNotation(carbonReference.state), '1s² 2s² 2p²');
const carbonEvaluation = evaluateAtomicConfiguration({
  atomicNumber: 6,
  state: carbonReference.state,
  predictedMagnetism: 'paramagnetic',
  predictedUnpaired: 2,
});
assert.equal(carbonEvaluation.committed, true);
assert.equal(carbonEvaluation.electronCount.correct, true);
assert.equal(carbonEvaluation.subshells.correct, true);
assert.equal(carbonEvaluation.hund.correct, true);
assert.equal(carbonEvaluation.magnetism.correct, true);

const chromiumReference = buildReferenceOrbitalState(24);
assert.deepEqual(subshellTotals(chromiumReference.state), { '1s': 2, '2s': 2, '2p': 6, '3s': 2, '3p': 6, '4s': 1, '3d': 5, '4p': 0 });
assert.equal(atomicStateMetrics(chromiumReference.state).unpairedElectrons, 6);
const copperReference = buildReferenceOrbitalState(29);
assert.deepEqual(subshellTotals(copperReference.state), { '1s': 2, '2s': 2, '2p': 6, '3s': 2, '3p': 6, '4s': 1, '3d': 10, '4p': 0 });
assert.equal(atomicStateMetrics(copperReference.state).unpairedElectrons, 1);

const empty = createEmptyAtomicState();
const oneUp = placeAtomicElectron({ state: empty, subshellId: '1s', orbitalIndex: 0, spin: 1 });
assert.equal(oneUp.allowed, true);
assert.notEqual(oneUp.state, empty);
assert.deepEqual(empty['1s'], [[]]);
const duplicateSpin = placeAtomicElectron({ state: oneUp.state, subshellId: '1s', orbitalIndex: 0, spin: 1 });
assert.equal(duplicateSpin.allowed, false);
assert.equal(duplicateSpin.state, oneUp.state);
assert.match(duplicateSpin.reason, /same spin|opposite/i);
const paired = placeAtomicElectron({ state: oneUp.state, subshellId: '1s', orbitalIndex: 0, spin: -1 });
assert.equal(paired.allowed, true);
const third = placeAtomicElectron({ state: paired.state, subshellId: '1s', orbitalIndex: 0, spin: 1 });
assert.equal(third.allowed, false);
assert.equal(third.state, paired.state);
const removed = removeAtomicElectron({ state: paired.state, subshellId: '1s', orbitalIndex: 0, electronIndex: 0 });
assert.equal(removed.allowed, true);
assert.deepEqual(removed.state['1s'][0], [-1]);
assert.deepEqual(paired.state['1s'][0], [1, -1]);

let earlyPair = createEmptyAtomicState();
for (const [subshellId, orbitalIndex, spin] of [
  ['1s', 0, 1], ['1s', 0, -1], ['2s', 0, 1], ['2s', 0, -1], ['2p', 0, 1], ['2p', 0, -1],
]) {
  earlyPair = placeAtomicElectron({ state: earlyPair, subshellId, orbitalIndex, spin }).state;
}
const earlyPairBefore = JSON.stringify(earlyPair);
const hundFailure = evaluateAtomicConfiguration({
  atomicNumber: 6,
  state: earlyPair,
  predictedMagnetism: 'diamagnetic',
  predictedUnpaired: 0,
});
assert.equal(hundFailure.electronCount.correct, true);
assert.equal(hundFailure.subshells.correct, true);
assert.equal(hundFailure.hund.correct, false);
assert.equal(hundFailure.magnetism.correct, true);
assert.equal(hundFailure.committed, false);
assert.match(hundFailure.hund.reason, /degenerate|unpaired|Hund/i);
assert.equal(JSON.stringify(earlyPair), earlyPairBefore);

const closedCore = loadClosedCore(26);
assert.equal(closedCore.valid, true);
assert.equal(closedCore.core.symbol, 'Ar');
assert.equal(atomicStateMetrics(closedCore.state).electronCount, 18);

const selected = quantumAddressForElectron({
  state: carbonReference.state,
  subshellId: '2p',
  orbitalIndex: 1,
  electronIndex: 0,
});
assert.deepEqual(selected, {
  valid: true,
  subshellId: '2p',
  orbitalIndex: 1,
  electronIndex: 0,
  n: 2,
  l: 1,
  ml: 0,
  ms: 0.5,
});
const quantumWrong = evaluateQuantumPrediction({
  actual: selected,
  prediction: { n: 3, l: 1, ml: -1, ms: 0.5 },
});
assert.equal(quantumWrong.committed, false);
assert.equal(quantumWrong.dimensions.n.correct, false);
assert.equal(quantumWrong.dimensions.l.correct, true);
assert.equal(quantumWrong.dimensions.ml.correct, false);
assert.equal(quantumWrong.dimensions.ms.correct, true);
const quantumCorrect = evaluateQuantumPrediction({
  actual: selected,
  prediction: { n: 2, l: 1, ml: 0, ms: 0.5 },
});
assert.equal(quantumCorrect.committed, true);

for (const level of [1, 2, 3, 4]) {
  const stateBefore = JSON.stringify(earlyPair);
  const hint = nextAtomicHint({ atomicNumber: 6, state: earlyPair, level });
  assert.equal(hint.valid, true);
  assert.equal(hint.level, level);
  assert.equal(JSON.stringify(earlyPair), stateBefore);
}

const berylliumBoron = compareIonizationEnergies({ leftAtomicNumber: 4, rightAtomicNumber: 5 });
assert.equal(berylliumBoron.valid, true);
assert.equal(berylliumBoron.higher.symbol, 'Be');
close(berylliumBoron.absoluteDifferenceEV, 1.0247);
assert.match(berylliumBoron.boundary, /measured|record|monotonic/i);
const nitrogenOxygen = compareIonizationEnergies({ leftAtomicNumber: 7, rightAtomicNumber: 8 });
assert.equal(nitrogenOxygen.higher.symbol, 'N');
close(nitrogenOxygen.absoluteDifferenceEV, 0.9160);
assert.equal(compareIonizationEnergies({ leftAtomicNumber: 0, rightAtomicNumber: 8 }).valid, false);

console.log('36 neutral H–Kr records resolved with NIST ground configurations and first-ionization energies.');
console.log('Carbon: 1s2 2s2 2p2, two unpaired electrons; chromium and copper preserve 3d/4s ground-state exceptions.');
console.log('immutable placement, Pauli blocking, Hund-pattern feedback, closed cores, quantum addresses, hints, and measured ionization comparisons verified.');
