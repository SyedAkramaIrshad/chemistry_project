import assert from 'node:assert/strict';
import {
  SELECTIVITY_CHALLENGE_BY_ID,
  SELECTIVITY_CHALLENGES,
  SATURATION_CHALLENGE_BY_ID,
  SATURATION_CHALLENGES,
  SOLUBILITY_MODEL_BOUNDARY,
  SOLUBILITY_SOLID_BY_ID,
  SOLUBILITY_SOLIDS,
} from '../src/data/solubilityScenarios.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../src/data/scienceSources.js';
import {
  analyzeSaturationVessel,
  analyzeSelectivity,
  evaluateSaturationAttempt,
  evaluateSelectivityAttempt,
  nextSaturationHint,
  nextSelectivityHint,
} from '../src/chemistry/solubilityEquilibrium.js';

const closeTo = (actual, expected, tolerance = 1e-12) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} should be within ${tolerance} of ${expected}.`);
};
const recursivelyFrozen = (value, seen = new Set()) => {
  if (!value || typeof value !== 'object' || seen.has(value)) return true;
  seen.add(value);
  if (!Object.isFrozen(value)) return false;
  return Object.values(value).every((nested) => recursivelyFrozen(nested, seen));
};

const EXPECTED_SOLIDS = [
  ['silver-chloride', 'AgCl', 1.751057703729095e-10, [1, 1]],
  ['silver-bromide', 'AgBr', 4.888569345474281e-13, [1, 1]],
  ['silver-iodide', 'AgI', 8.151729967355943e-17, [1, 1]],
  ['calcium-fluoride', 'CaF₂', 3.8904514499428045e-11, [1, 2]],
];
const EXPECTED_SATURATION_IDS = ['agcl-near-gate', 'agcl-common-ion', 'agi-trace-trigger', 'caf2-stoichiometry'];
const EXPECTED_SELECTIVITY_IDS = ['iodide-chloride-window', 'bromide-chloride-overlap', 'concentration-flips-order', 'dilution-opens-window'];
const EXPECTED_SOURCE_IDS = [
  'iupacSolubilityProduct',
  'iupacSolubility',
  'iupacThermodynamicActivity',
  'iupacSaturatedSolution',
  'nistSilverHalidePotentials',
  'nistCalciumFluoridePrecipitation',
  'nistIupacSolubilityDatabase',
  'iupacSolubilityDataSeries',
];

assert.equal(SOLUBILITY_SOLIDS.length, 4);
assert.deepEqual(SOLUBILITY_SOLIDS.map((item) => item.id), EXPECTED_SOLIDS.map(([id]) => id));
assert.deepEqual(SATURATION_CHALLENGES.map((item) => item.id), EXPECTED_SATURATION_IDS);
assert.deepEqual(SELECTIVITY_CHALLENGES.map((item) => item.id), EXPECTED_SELECTIVITY_IDS);
assert.equal(Object.keys(SOLUBILITY_SOLID_BY_ID).length, 4);
assert.equal(Object.keys(SATURATION_CHALLENGE_BY_ID).length, 4);
assert.equal(Object.keys(SELECTIVITY_CHALLENGE_BY_ID).length, 4);
assert.ok(recursivelyFrozen(SOLUBILITY_SOLIDS));
assert.ok(recursivelyFrozen(SOLUBILITY_SOLID_BY_ID));
assert.ok(recursivelyFrozen(SATURATION_CHALLENGES));
assert.ok(recursivelyFrozen(SATURATION_CHALLENGE_BY_ID));
assert.ok(recursivelyFrozen(SELECTIVITY_CHALLENGES));
assert.ok(recursivelyFrozen(SELECTIVITY_CHALLENGE_BY_ID));
assert.ok(recursivelyFrozen(SOLUBILITY_MODEL_BOUNDARY));

for (const [id, formula, ksp, coefficients] of EXPECTED_SOLIDS) {
  const solid = SOLUBILITY_SOLID_BY_ID[id];
  assert.equal(solid.formula, formula);
  closeTo(solid.ksp, ksp, ksp * 1e-12);
  assert.deepEqual(solid.ions.map((ion) => ion.coefficient), coefficients);
  assert.equal(solid.temperatureK, 298.15);
  assert.ok(solid.molarMassGmol > 50);
  assert.ok(solid.dissolutionEquation.includes('⇌'));
  assert.ok(solid.sourceIds.length >= 3);
  assert.ok(solid.derivation.length >= 35);
  assert.ok(solid.sediment.pattern.length >= 3);
  assert.ok(solid.ions.every((ion) => Number.isInteger(ion.charge) && ion.charge !== 0));
}

const R = 8.31446261815324;
const F = 96485.33212;
const T = 298.15;
const E_AG = 0.7996;
for (const [id, potential] of [['silver-chloride', 0.2224], ['silver-bromide', 0.0713], ['silver-iodide', -0.1522]]) {
  closeTo(SOLUBILITY_SOLID_BY_ID[id].ksp, Math.exp((potential - E_AG) * F / (R * T)), SOLUBILITY_SOLID_BY_ID[id].ksp * 2e-10);
}
closeTo(SOLUBILITY_SOLID_BY_ID['calcium-fluoride'].ksp, 10 ** -10.41, 1e-24);

for (const challenge of [...SATURATION_CHALLENGES, ...SELECTIVITY_CHALLENGES]) {
  assert.ok(challenge.code.length >= 6);
  assert.ok(challenge.name.length >= 10);
  assert.ok(challenge.summary.length >= 35);
  assert.ok(challenge.mission.length >= 40);
  assert.ok(challenge.teacherQuestion.length >= 35);
  assert.ok(challenge.provenance.statement.length >= 40);
}
for (const sourceId of EXPECTED_SOURCE_IDS) assert.ok(SCIENCE_SOURCES[sourceId], `Missing source ${sourceId}.`);
const passport = MODEL_PASSPORTS.solubilityPrecipitationStudio;
assert.ok(passport);
assert.deepEqual(passport.sources, EXPECTED_SOURCE_IDS);
assert.match(passport.resultKind, /ideal|teaching/i);
assert.ok(passport.excludes.some((item) => /activity coefficient|ionic strength/i.test(item)));
assert.ok(passport.excludes.some((item) => /identity|purity/i.test(item)));
assert.match(SOLUBILITY_MODEL_BOUNDARY.equilibrium, /concentration|activity/i);
assert.match(SOLUBILITY_MODEL_BOUNDARY.kinetics, /does not|no /i);
assert.match(SOLUBILITY_MODEL_BOUNDARY.evidence, /identity|purity/i);

console.log('Four immutable solid records, four saturation challenges, four selectivity challenges, sources, and model boundary verified.');

const vessel = (challengeId, overrides = {}) => analyzeSaturationVessel({
  challengeId,
  inputs: { ...SATURATION_CHALLENGE_BY_ID[challengeId].defaults, ...overrides },
});

const agclNear = vessel('agcl-near-gate');
assert.ok(recursivelyFrozen(agclNear));
assert.equal(agclNear.initial.saturationState, 'supersaturated');
assert.equal(agclNear.direction, 'precipitates');
closeTo(agclNear.initial.ionConcentrationsM[0], 2e-5);
closeTo(agclNear.initial.ionConcentrationsM[1], 2e-5);
closeTo(agclNear.initial.qsp, 4e-10, 1e-22);
closeTo(agclNear.extentMoles, -6.767246304230196e-7, 2e-18);
closeTo(agclNear.solidMassChangeMg, 0.09698898610178366, 2e-12);
closeTo(agclNear.final.qsp, agclNear.ksp, 2e-20);
assert.equal(agclNear.final.saturationState, 'saturated');

const agclCommon = vessel('agcl-common-ion');
assert.equal(agclCommon.initial.saturationState, 'undersaturated');
assert.equal(agclCommon.direction, 'dissolves');
closeTo(agclCommon.pureMolarSolubilityM, 1.3232753695769806e-5, 2e-16);
closeTo(agclCommon.backgroundAdditionalSolubilityM, 3.502090878187633e-8, 2e-18);
closeTo(agclCommon.extentMoles, 3.502090878187633e-9, 2e-19);
closeTo(agclCommon.solidMassChangeMg, -0.0005019238671709054, 2e-13);
closeTo(agclCommon.final.qsp, agclCommon.ksp, 2e-20);

const agiTrace = vessel('agi-trace-trigger');
assert.equal(agiTrace.direction, 'precipitates');
assert.ok(agiTrace.solidMassChangeMg > 0);
closeTo(agiTrace.final.qsp, agiTrace.ksp, 1e-25);

const caf2 = vessel('caf2-stoichiometry');
assert.equal(caf2.solid.formula, 'CaF₂');
closeTo(caf2.pureMolarSolubilityM, 2.1345844247682328e-4, 2e-15);
closeTo(caf2.extentMoles, -4.747655631325925e-6, 2e-17);
closeTo(caf2.solidMassChangeMg, 0.3706722923705791, 2e-10);
closeTo(caf2.final.ionConcentrationsM[0], 1.5252344368674075e-4, 2e-15);
closeTo(caf2.final.ionConcentrationsM[1], 5.050468873734814e-4, 2e-15);
closeTo(caf2.final.qsp, caf2.ksp, 2e-20);

const noSolid = vessel('agcl-common-ion', { initialSolidMassMg: 0 });
assert.equal(noSolid.direction, 'no-solid-to-dissolve');
assert.equal(noSolid.extentMoles, 0);
assert.equal(noSolid.final.qsp, noSolid.initial.qsp);

const allDissolves = vessel('agcl-common-ion', { initialSolidMassMg: 1e-7 });
assert.equal(allDissolves.direction, 'dissolves-all-solid');
closeTo(allDissolves.final.solidMassMg, 0, 1e-18);
assert.ok(allDissolves.final.qsp < allDissolves.ksp);

const exactBoundary = vessel('agcl-near-gate', {
  cationConcentrationM: Math.sqrt(SOLUBILITY_SOLID_BY_ID['silver-chloride'].ksp) * 2,
  anionConcentrationM: Math.sqrt(SOLUBILITY_SOLID_BY_ID['silver-chloride'].ksp) * 2,
});
assert.equal(exactBoundary.initial.saturationState, 'saturated');
assert.equal(exactBoundary.direction, 'at-equilibrium');

const saturationPrediction = {
  initialState: 'undersaturated',
  direction: 'dissolves',
  solidMassChange: 'decreases',
  kspMeaning: 'ksp-is-molar-solubility',
};
const saturationPredictionCopy = structuredClone(saturationPrediction);
const saturationEvaluation = evaluateSaturationAttempt({ analysis: agclNear, prediction: saturationPrediction });
assert.deepEqual(saturationPrediction, saturationPredictionCopy);
assert.equal(saturationEvaluation.score.correct, 0);
assert.deepEqual(Object.values(saturationEvaluation.dimensions).map((item) => item.learner), Object.values(saturationPrediction));
assert.ok(recursivelyFrozen(saturationEvaluation));
for (let level = 1; level <= 4; level += 1) {
  const before = structuredClone(agclNear);
  const hint = nextSaturationHint({ analysis: agclNear, prediction: saturationPrediction, level });
  assert.ok(hint.length >= 35);
  assert.deepEqual(agclNear, before);
}

console.log('Signed dissolution/precipitation extent, Ksp closure, pure/common-ion solubility, four claims, and four saturation hints verified.');

const selectivity = (challengeId, overrides = {}) => analyzeSelectivity({
  challengeId,
  concentrationsM: {
    ...Object.fromEntries(SELECTIVITY_CHALLENGE_BY_ID[challengeId].analytes.map((item) => [item.solidId, item.concentrationM])),
    ...overrides,
  },
});

const iodide = selectivity('iodide-chloride-window');
assert.ok(recursivelyFrozen(iodide));
assert.equal(iodide.first.solidId, 'silver-iodide');
assert.equal(iodide.second.solidId, 'silver-chloride');
assert.equal(iodide.targetPossible, true);
assert.ok(iodide.fractionRemovedAtSecondOnset > 0.99999);

const bromide = selectivity('bromide-chloride-overlap');
assert.equal(bromide.first.solidId, 'silver-bromide');
assert.equal(bromide.targetPossible, false);
closeTo(bromide.fractionRemovedAtSecondOnset, 0.9972082191608743, 2e-15);
assert.equal(bromide.removalBand, '90-to-99-9');

const flipped = selectivity('concentration-flips-order');
assert.equal(flipped.first.solidId, 'silver-chloride');
assert.equal(flipped.second.solidId, 'silver-iodide');
assert.equal(flipped.targetPossible, false);
closeTo(flipped.fractionRemovedAtSecondOnset, 0.9785191890464809, 2e-15);

const opened = selectivity('dilution-opens-window');
assert.equal(opened.first.solidId, 'silver-bromide');
assert.equal(opened.second.solidId, 'silver-chloride');
assert.equal(opened.targetPossible, true);
closeTo(opened.fractionRemovedAtSecondOnset, 0.9999720821916087, 2e-15);
assert.equal(opened.removalBand, 'at-least-99-9');

const selectivityPrediction = {
  firstSolidId: 'silver-chloride',
  targetPossible: 'yes',
  orderingRule: 'ksp-alone',
  removalBand: 'below-90',
};
const selectivityPredictionCopy = structuredClone(selectivityPrediction);
const selectivityEvaluation = evaluateSelectivityAttempt({ analysis: bromide, prediction: selectivityPrediction });
assert.deepEqual(selectivityPrediction, selectivityPredictionCopy);
assert.equal(selectivityEvaluation.score.correct, 0);
assert.ok(recursivelyFrozen(selectivityEvaluation));
for (let level = 1; level <= 4; level += 1) {
  const before = structuredClone(opened);
  const hint = nextSelectivityHint({ analysis: opened, prediction: selectivityPrediction, level });
  assert.ok(hint.length >= 35);
  assert.deepEqual(opened, before);
}

const tied = selectivity('iodide-chloride-window', {
  'silver-iodide': SOLUBILITY_SOLID_BY_ID['silver-iodide'].ksp / 1e-8,
  'silver-chloride': SOLUBILITY_SOLID_BY_ID['silver-chloride'].ksp / 1e-8,
});
assert.equal(tied.simultaneous, true);
assert.equal(tied.first, null);

for (const invoke of [
  () => analyzeSaturationVessel({ challengeId: 'missing', inputs: SATURATION_CHALLENGES[0].defaults }),
  () => analyzeSaturationVessel({ challengeId: 'agcl-near-gate', inputs: { ...SATURATION_CHALLENGES[0].defaults, cationConcentrationM: -1 } }),
  () => analyzeSaturationVessel({ challengeId: 'agcl-near-gate', inputs: { ...SATURATION_CHALLENGES[0].defaults, cationVolumeMl: 0, anionVolumeMl: 0 } }),
  () => analyzeSaturationVessel({ challengeId: 'agcl-near-gate', inputs: { ...SATURATION_CHALLENGES[0].defaults, initialSolidMassMg: Number.NaN } }),
  () => analyzeSelectivity({ challengeId: 'missing', concentrationsM: {} }),
  () => analyzeSelectivity({ challengeId: 'iodide-chloride-window', concentrationsM: { 'silver-iodide': 0, 'silver-chloride': 1e-2 } }),
  () => evaluateSaturationAttempt({ analysis: agclNear, prediction: {} }),
  () => evaluateSelectivityAttempt({ analysis: iodide, prediction: {} }),
  () => nextSaturationHint({ analysis: agclNear, prediction: saturationPrediction, level: 5 }),
  () => nextSelectivityHint({ analysis: iodide, prediction: selectivityPrediction, level: 0 }),
]) assert.throws(invoke);

console.log('Four selective-threshold contrasts, concentration-flipped order, preserved claims, four hints, ties, invalid inputs, and recursive immutability verified.');
