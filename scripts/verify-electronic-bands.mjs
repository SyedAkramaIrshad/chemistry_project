import assert from 'node:assert/strict';
import {
  ELECTRONIC_BAND_MODEL_BOUNDARY,
  FINITE_CHAIN_PRESETS,
  FINITE_CHAIN_PRESET_BY_ID,
  PERIODIC_BAND_PRESETS,
  PERIODIC_BAND_PRESET_BY_ID,
  TWO_BAND_PRESETS,
  TWO_BAND_PRESET_BY_ID,
} from '../src/data/electronicBandScenarios.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../src/data/scienceSources.js';
import {
  analyzeFiniteChain,
  analyzePeriodicBand,
  analyzeTwoBandEdges,
  buildFiniteReferenceState,
  clearFiniteChainState,
  createFiniteChainState,
  evaluateFiniteChain,
  evaluatePeriodicBand,
  evaluateTwoBandEdges,
  finiteChainSpectrum,
  nextFiniteChainHint,
  nextPeriodicBandHint,
  nextTwoBandHint,
  placeFiniteElectron,
  removeFiniteElectron,
  updateFiniteChainState,
} from '../src/chemistry/electronicBands.js';

const close = (actual, expected, tolerance = 1e-10) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
};

const frozenTree = (value) => {
  if (!value || typeof value !== 'object') return true;
  return Object.isFrozen(value) && Object.values(value).every(frozenTree);
};

const sourceIds = [
  'iupacEnergyBand',
  'iupacEnergyBandTheory',
  'iupacConductionBand',
  'iupacValenceBand',
  'iupacBandGapEnergy',
  'iupacEnergyGap',
  'iupacFermiLevel',
  'iupacDensityStates',
  'mitTightBindingLcao',
  'mitOneDimensionalTightBinding',
  'acsInorganicSolidStateSupplement',
  'nistChipsTightBinding',
];

assert.equal(FINITE_CHAIN_PRESETS.length, 6);
assert.equal(PERIODIC_BAND_PRESETS.length, 5);
assert.equal(TWO_BAND_PRESETS.length, 5);
assert.ok(frozenTree(FINITE_CHAIN_PRESETS));
assert.ok(frozenTree(PERIODIC_BAND_PRESETS));
assert.ok(frozenTree(TWO_BAND_PRESETS));
assert.equal(FINITE_CHAIN_PRESET_BY_ID.dimer.siteCount, 2);
assert.equal(PERIODIC_BAND_PRESET_BY_ID.fullBand.electronsPerCell, 2);
assert.equal(TWO_BAND_PRESET_BY_ID.directGap.expectedGapEv, 1);
assert.equal(TWO_BAND_PRESET_BY_ID.directTouch.expectedGapEv, 0);
assert.equal(TWO_BAND_PRESET_BY_ID.directOverlap.expectedEdgeRelation, 'overlap');
assert.match(ELECTRONIC_BAND_MODEL_BOUNDARY.periodic, /one-dimensional|cosine/i);

const passport = MODEL_PASSPORTS.electronicBandObservatory;
assert.equal(passport.id, 'synthetic-finite-chain-periodic-band-and-two-band-edge-observatory');
assert.ok(passport.includes.some((item) => /N source orbitals/i.test(item)));
assert.ok(passport.excludes.some((item) => /conductivity/i.test(item)));
for (const sourceId of sourceIds) {
  assert.ok(SCIENCE_SOURCES[sourceId], sourceId);
  assert.ok(passport.sources.includes(sourceId), sourceId);
  assert.match(SCIENCE_SOURCES[sourceId].url, /^https:\/\//);
}

const dimerSpectrum = finiteChainSpectrum({ siteCount: 2, couplingEv: 1, onsiteEnergyEv: 0 });
assert.equal(dimerSpectrum.valid, true);
assert.deepEqual(dimerSpectrum.levels.map((level) => Number(level.energyEv.toFixed(10))), [-1, 1]);
close(dimerSpectrum.finiteSpreadEv, 2);
close(dimerSpectrum.infiniteLimitWidthEv, 4);
assert.ok(frozenTree(dimerSpectrum));

const sixSpectrum = finiteChainSpectrum({ siteCount: 6, couplingEv: 1, onsiteEnergyEv: 0 });
assert.equal(sixSpectrum.levelCount, 6);
close(sixSpectrum.finiteSpreadEv, 4 * Math.cos(Math.PI / 7));
const twelveSpectrum = finiteChainSpectrum({ siteCount: 12, couplingEv: 1, onsiteEnergyEv: 0 });
assert.ok(twelveSpectrum.finiteSpreadEv > sixSpectrum.finiteSpreadEv);
assert.ok(twelveSpectrum.finiteSpreadEv < twelveSpectrum.infiniteLimitWidthEv);
const isolatedSpectrum = finiteChainSpectrum({ siteCount: 6, couplingEv: 0, onsiteEnergyEv: 0 });
assert.equal(isolatedSpectrum.degenerate, true);
assert.equal(isolatedSpectrum.finiteSpreadEv, 0);
assert.deepEqual([...new Set(isolatedSpectrum.levels.map((level) => level.energyEv))], [0]);
for (const invalidInput of [
  { siteCount: 1, couplingEv: 1, onsiteEnergyEv: 0 },
  { siteCount: 4.5, couplingEv: 1, onsiteEnergyEv: 0 },
  { siteCount: 4, couplingEv: -1, onsiteEnergyEv: 0 },
  { siteCount: 4, couplingEv: 2, onsiteEnergyEv: 0 },
]) {
  assert.equal(finiteChainSpectrum(invalidInput).valid, false);
}

const created = createFiniteChainState('sixWeak');
assert.equal(created.valid, true);
assert.ok(frozenTree(created));
assert.equal(Object.keys(created.state.occupancy).length, 6);
assert.equal(Object.values(created.state.occupancy).flat().length, 0);
const up = placeFiniteElectron({ state: created.state, levelId: 'L1', spin: 1 });
assert.equal(up.allowed, true);
assert.notEqual(up.state, created.state);
assert.deepEqual(created.state.occupancy.L1, []);
const duplicate = placeFiniteElectron({ state: up.state, levelId: 'L1', spin: 1 });
assert.equal(duplicate.allowed, false);
assert.equal(duplicate.state, up.state);
assert.match(duplicate.reason, /same spin|duplicate|already/i);
const pair = placeFiniteElectron({ state: up.state, levelId: 'L1', spin: -1 });
assert.equal(pair.allowed, true);
const third = placeFiniteElectron({ state: pair.state, levelId: 'L1', spin: 1 });
assert.equal(third.allowed, false);
assert.equal(third.state, pair.state);
assert.match(third.reason, /two|third|full/i);
const removed = removeFiniteElectron({ state: pair.state, levelId: 'L1', electronIndex: 0 });
assert.equal(removed.allowed, true);
assert.equal(removed.state.occupancy.L1.length, 1);
assert.equal(pair.state.occupancy.L1.length, 2);

const couplingUpdate = updateFiniteChainState({ state: pair.state, patch: { couplingEv: 1.25 } });
assert.equal(couplingUpdate.allowed, true);
assert.equal(couplingUpdate.occupationReset, false);
assert.deepEqual(couplingUpdate.state.occupancy.L1, [1, -1]);
const targetUpdate = updateFiniteChainState({ state: couplingUpdate.state, patch: { targetElectronCount: 5 } });
assert.equal(targetUpdate.allowed, true);
assert.equal(targetUpdate.occupationReset, false);
assert.deepEqual(targetUpdate.state.occupancy.L1, [1, -1]);
const siteUpdate = updateFiniteChainState({ state: targetUpdate.state, patch: { siteCount: 8 } });
assert.equal(siteUpdate.allowed, true);
assert.equal(siteUpdate.occupationReset, true);
assert.equal(Object.keys(siteUpdate.state.occupancy).length, 8);
assert.equal(Object.values(siteUpdate.state.occupancy).flat().length, 0);
assert.match(siteUpdate.reason, /new|empty|identit/i);
const invalidUpdate = updateFiniteChainState({ state: pair.state, patch: { couplingEv: 9 } });
assert.equal(invalidUpdate.allowed, false);
assert.equal(invalidUpdate.state, pair.state);
const cleared = clearFiniteChainState({ state: pair.state });
assert.equal(cleared.allowed, true);
assert.notEqual(cleared.state, pair.state);
assert.equal(Object.values(cleared.state.occupancy).flat().length, 0);

for (const preset of FINITE_CHAIN_PRESETS.filter((item) => item.couplingEv > 0)) {
  const state = createFiniteChainState(preset.id).state;
  const reference = buildFiniteReferenceState({ state });
  assert.equal(reference.allowed, true, preset.id);
  assert.equal(reference.unique, true, preset.id);
  const analysis = analyzeFiniteChain({ state: reference.state });
  assert.equal(analysis.valid, true, preset.id);
  assert.equal(analysis.electronCountCorrect, true, preset.id);
  assert.equal(analysis.aufbau.correct, true, preset.id);
  const predictions = {
    levelCount: String(preset.siteCount),
    splitState: 'split',
    moreSitesEffect: 'closer',
    modelKind: 'finite-levels',
  };
  const evaluation = evaluateFiniteChain({ state: reference.state, predictions });
  assert.equal(evaluation.committed, true, preset.id);
  assert.deepEqual(evaluation.predictions, predictions);
  assert.ok(frozenTree(evaluation));
}

const wrongBase = buildFiniteReferenceState({ state: createFiniteChainState('sixWeak').state }).state;
let wrongAufbau = removeFiniteElectron({ state: wrongBase, levelId: 'L2', electronIndex: 1 }).state;
wrongAufbau = placeFiniteElectron({ state: wrongAufbau, levelId: 'L4', spin: 1 }).state;
const wrongBefore = JSON.stringify(wrongAufbau);
const wrongAnalysis = analyzeFiniteChain({ state: wrongAufbau });
assert.equal(wrongAnalysis.electronCountCorrect, true);
assert.equal(wrongAnalysis.aufbau.correct, false);
assert.match(wrongAnalysis.aufbau.reason, /lower|energy|available/i);
assert.equal(JSON.stringify(wrongAufbau), wrongBefore);
const wrongPredictions = { levelCount: '5', splitState: 'degenerate', moreSitesEffect: 'wider', modelKind: 'measured-solid' };
const wrongPredictionsBefore = JSON.stringify(wrongPredictions);
const wrongEvaluation = evaluateFiniteChain({ state: wrongAufbau, predictions: wrongPredictions });
assert.equal(wrongEvaluation.committed, false);
assert.equal(wrongEvaluation.levelCount.correct, false);
assert.equal(wrongEvaluation.splitState.correct, false);
assert.equal(wrongEvaluation.moreSitesEffect.correct, false);
assert.equal(wrongEvaluation.modelKind.correct, false);
assert.equal(JSON.stringify(wrongPredictions), wrongPredictionsBefore);

const isolatedState = createFiniteChainState('isolatedSix').state;
const isolatedReference = buildFiniteReferenceState({ state: isolatedState });
assert.equal(isolatedReference.allowed, false);
assert.equal(isolatedReference.unique, false);
assert.equal(isolatedReference.state, isolatedState);
const isolatedEvaluation = evaluateFiniteChain({
  state: isolatedState,
  predictions: { levelCount: '6', splitState: 'degenerate', moreSitesEffect: 'unchanged', modelKind: 'finite-levels' },
});
assert.equal(isolatedEvaluation.aufbau.applicable, false);
assert.equal(isolatedEvaluation.committed, false);
assert.equal(isolatedEvaluation.electronCount.correct, false);

for (const level of [1, 2, 3, 4]) {
  const stateBefore = JSON.stringify(wrongAufbau);
  const hint = nextFiniteChainHint({ state: wrongAufbau, level });
  assert.equal(hint.valid, true);
  assert.equal(hint.level, level);
  assert.equal(JSON.stringify(wrongAufbau), stateBefore);
  assert.ok(frozenTree(hint));
}

for (const preset of PERIODIC_BAND_PRESETS) {
  const analysis = analyzePeriodicBand(preset);
  assert.equal(analysis.valid, true, preset.id);
  close(analysis.bandWidthEv, 4 * Math.abs(preset.betaEv));
  assert.equal(analysis.samples.length, 81);
  assert.ok(analysis.samples.some((sample) => sample.q === 0));
  assert.ok(frozenTree(analysis));
}
const emptyBand = analyzePeriodicBand(PERIODIC_BAND_PRESET_BY_ID.emptyBand);
assert.equal(emptyBand.occupationClass, 'empty');
assert.equal(emptyBand.nearbyEmptyStatesWithinBand, null);
assert.equal(emptyBand.fermiLevelWithinBandEv, null);
const quarterBand = analyzePeriodicBand(PERIODIC_BAND_PRESET_BY_ID.quarterFilled);
assert.equal(quarterBand.occupationClass, 'partially-filled');
close(quarterBand.qF, Math.PI / 4);
assert.equal(quarterBand.nearbyEmptyStatesWithinBand, true);
assert.ok(Number.isFinite(quarterBand.fermiLevelWithinBandEv));
const halfBand = analyzePeriodicBand(PERIODIC_BAND_PRESET_BY_ID.halfFilled);
close(halfBand.qF, Math.PI / 2);
close(halfBand.fermiLevelWithinBandEv, 0);
const fullBand = analyzePeriodicBand(PERIODIC_BAND_PRESET_BY_ID.fullBand);
assert.equal(fullBand.occupationClass, 'full');
assert.equal(fullBand.nearbyEmptyStatesWithinBand, false);
assert.equal(fullBand.fermiLevelWithinBandEv, null);
assert.match(fullBand.boundary, /second|another|insulat/i);
for (const forbiddenKey of ['conductivity', 'velocity', 'current', 'mobility', 'effectiveMass', 'materialClass']) {
  assert.equal(Object.hasOwn(halfBand, forbiddenKey), false, forbiddenKey);
}

const periodicPredictions = { bandWidthEv: '4.00', occupationClass: 'partially-filled', nearbyEmpty: 'yes', slopeMeaning: 'dispersion-only' };
const periodicEvaluation = evaluatePeriodicBand({ input: PERIODIC_BAND_PRESET_BY_ID.halfFilled, predictions: periodicPredictions });
assert.equal(periodicEvaluation.committed, true);
assert.deepEqual(periodicEvaluation.predictions, periodicPredictions);
const periodicWrong = { bandWidthEv: '3.00', occupationClass: 'full', nearbyEmpty: 'no', slopeMeaning: 'conductivity' };
const periodicWrongBefore = JSON.stringify(periodicWrong);
assert.equal(evaluatePeriodicBand({ input: PERIODIC_BAND_PRESET_BY_ID.halfFilled, predictions: periodicWrong }).committed, false);
assert.equal(JSON.stringify(periodicWrong), periodicWrongBefore);
for (const level of [1, 2, 3, 4]) {
  const hint = nextPeriodicBandHint({ input: PERIODIC_BAND_PRESET_BY_ID.halfFilled, level });
  assert.equal(hint.valid, true);
  assert.equal(hint.level, level);
  assert.ok(frozenTree(hint));
}

for (const preset of TWO_BAND_PRESETS) {
  const analysis = analyzeTwoBandEdges(preset);
  assert.equal(analysis.valid, true, preset.id);
  assert.equal(analysis.samples.length, 81);
  assert.equal(analysis.edgeRelation, preset.expectedEdgeRelation);
  assert.ok(frozenTree(analysis));
}
const directGap = analyzeTwoBandEdges(TWO_BAND_PRESET_BY_ID.directGap);
assert.equal(directGap.edgeAlignment, 'direct');
close(directGap.displayGapEv, 1);
close(directGap.valenceMaximum.q, Math.PI);
close(directGap.conductionMinimum.q, Math.PI);
const indirectGap = analyzeTwoBandEdges(TWO_BAND_PRESET_BY_ID.indirectGap);
assert.equal(indirectGap.edgeAlignment, 'indirect');
close(indirectGap.displayGapEv, 1);
close(indirectGap.valenceMaximum.q, Math.PI);
close(indirectGap.conductionMinimum.q, 0);
const touching = analyzeTwoBandEdges(TWO_BAND_PRESET_BY_ID.directTouch);
assert.equal(touching.edgeRelation, 'touching');
assert.equal(touching.displayGapEv, 0);
const overlap = analyzeTwoBandEdges(TWO_BAND_PRESET_BY_ID.directOverlap);
assert.equal(overlap.edgeRelation, 'overlap');
assert.equal(overlap.displayGapEv, null);
close(overlap.overlapEv, 1);
assert.match(overlap.reason, /overlap/i);
assert.doesNotMatch(overlap.reason, /negative gap/i);

const gapPredictions = { edgeRelation: 'positive-gap', magnitudeEv: '1.00', edgeAlignment: 'direct', materialClaim: 'teaching-model-only' };
const gapEvaluation = evaluateTwoBandEdges({ input: TWO_BAND_PRESET_BY_ID.directGap, predictions: gapPredictions });
assert.equal(gapEvaluation.committed, true);
assert.deepEqual(gapEvaluation.predictions, gapPredictions);
const overlapPredictions = { edgeRelation: 'overlap', magnitudeEv: '1.00', edgeAlignment: 'direct', materialClaim: 'teaching-model-only' };
assert.equal(evaluateTwoBandEdges({ input: TWO_BAND_PRESET_BY_ID.directOverlap, predictions: overlapPredictions }).committed, true);
const gapWrong = { edgeRelation: 'positive-gap', magnitudeEv: '-1', edgeAlignment: 'indirect', materialClaim: 'certified-insulator' };
const gapWrongBefore = JSON.stringify(gapWrong);
assert.equal(evaluateTwoBandEdges({ input: TWO_BAND_PRESET_BY_ID.directOverlap, predictions: gapWrong }).committed, false);
assert.equal(JSON.stringify(gapWrong), gapWrongBefore);
for (const level of [1, 2, 3, 4]) {
  const hint = nextTwoBandHint({ input: TWO_BAND_PRESET_BY_ID.indirectGap, level });
  assert.equal(hint.valid, true);
  assert.equal(hint.level, level);
  assert.ok(frozenTree(hint));
}

console.log('Six finite chains, five periodic bands, and five declared two-band edge cartridges resolved.');
console.log('Manual spin placement, immutable model edits, exact spectra, filling, dispersion, gap/overlap geometry, predictions, and hints verified.');
console.log('Source passport and real-material, transport, and certification boundaries verified.');
