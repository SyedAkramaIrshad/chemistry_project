import assert from 'node:assert/strict';
import {
  ACTIVITY_SCENARIOS,
  ACTIVITY_SCENARIO_BY_ID,
  FUGACITY_SCENARIOS,
  FUGACITY_SCENARIO_BY_ID,
  NONIDEAL_THERMODYNAMICS_BOUNDARY,
  NONIDEAL_THERMODYNAMICS_CONSTANTS,
  STABILITY_SCENARIOS,
  STABILITY_SCENARIO_BY_ID,
} from '../src/data/nonidealThermodynamicsScenarios.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../src/data/scienceSources.js';
import {
  analyzeMargulesActivity,
  analyzeRegularSolution,
  analyzeVirialFugacity,
  evaluateActivityPrediction,
  evaluateFugacityPrediction,
  evaluateStabilityPrediction,
  nextActivityHint,
  nextFugacityHint,
  nextStabilityHint,
} from '../src/chemistry/nonidealThermodynamics.js';

const close = (actual, expected, tolerance = 1e-9) => {
  assert.ok(Number.isFinite(actual), `${actual} should be finite.`);
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}.`);
};

const sourceIds = [
  'iupacThermodynamicActivity', 'iupacActivityCoefficient', 'iupacChemicalPotential',
  'iupacAzeotropicPoint', 'iupacSpinodal', 'iupacBinodal', 'iupacSpinodalDecomposition',
  'iupacFugacity', 'iupacFugacityCoefficient', 'iupacVirialCoefficients',
  'nistMargulesActivityModel', 'nistActivityCoefficientModels', 'nistPhaseEquilibriaTn1061',
  'nistRegularSolutionModeling', 'iupacSpinodalRecommendation', 'nistVirialFugacityIr6654',
];

assert.equal(ACTIVITY_SCENARIOS.length, 5);
assert.equal(STABILITY_SCENARIOS.length, 6);
assert.equal(FUGACITY_SCENARIOS.length, 5);
assert.equal(new Set(ACTIVITY_SCENARIOS.map(({ id }) => id)).size, 5);
assert.equal(new Set(STABILITY_SCENARIOS.map(({ id }) => id)).size, 6);
assert.equal(new Set(FUGACITY_SCENARIOS.map(({ id }) => id)).size, 5);
assert.equal(NONIDEAL_THERMODYNAMICS_CONSTANTS.virialGate, 0.12);
assert.ok(ACTIVITY_SCENARIOS.every(({ dataKind }) => dataKind === 'synthetic-teaching-parameters'));
assert.ok(STABILITY_SCENARIOS.every(({ dataKind }) => dataKind === 'synthetic-dimensionless-regular-solution'));
assert.ok(FUGACITY_SCENARIOS.every(({ dataKind }) => dataKind === 'synthetic-second-virial-teaching-input'));
assert.ok(Object.isFrozen(ACTIVITY_SCENARIOS));
assert.ok(Object.isFrozen(STABILITY_SCENARIOS[0]));
assert.ok(Object.isFrozen(FUGACITY_SCENARIO_BY_ID['ideal-virial']));
assert.ok(Object.isFrozen(NONIDEAL_THERMODYNAMICS_BOUNDARY));
assert.match(NONIDEAL_THERMODYNAMICS_BOUNDARY.excluded, /measured|fitted/i);
for (const sourceId of sourceIds) assert.ok(SCIENCE_SOURCES[sourceId]?.url, `Missing source ${sourceId}.`);
const passport = MODEL_PASSPORTS.nonidealThermodynamicsObservatory;
assert.match(passport.resultKind, /synthetic/i);
assert.match(passport.resultKind, /not measured/i);
for (const sourceId of sourceIds) assert.ok(passport.sources.includes(sourceId));

const activityInput = (id) => {
  const scenario = ACTIVITY_SCENARIO_BY_ID[id];
  return {
    A12: scenario.A12,
    A21: scenario.A21,
    p1StarBar: scenario.p1StarBar,
    p2StarBar: scenario.p2StarBar,
    x1: scenario.defaultX1,
  };
};

const idealActivity = analyzeMargulesActivity(activityInput('ideal-reference'));
close(idealActivity.point.gamma1, 1, 1e-14);
close(idealActivity.point.gamma2, 1, 1e-14);
close(idealActivity.point.gExcessRT, 0, 1e-14);
close(idealActivity.point.pressureBar, idealActivity.idealReference.pressureBar, 1e-14);
assert.equal(idealActivity.pressureDeparture.direction, 'ideal');
assert.equal(idealActivity.azeotropeCount, 0);
assert.equal(idealActivity.curve.length, 301);
assert.equal(idealActivity.curve[0].x1, 0);
assert.equal(idealActivity.curve.at(-1).x1, 1);
assert.ok(Object.isFrozen(idealActivity.curve[0]));

const mildActivity = analyzeMargulesActivity(activityInput('mild-positive'));
assert.equal(mildActivity.pressureDeparture.direction, 'positive');
assert.equal(mildActivity.azeotropeCount, 0);

const positiveActivity = analyzeMargulesActivity(activityInput('positive-azeotrope'));
assert.equal(positiveActivity.azeotropeCount, 1);
close(positiveActivity.azeotropes[0].x1, 0.692541, 2e-6);
assert.equal(positiveActivity.azeotropes[0].extremum, 'maximum-pressure');

const negativeActivity = analyzeMargulesActivity(activityInput('negative-azeotrope'));
assert.equal(negativeActivity.pressureDeparture.direction, 'negative');
assert.equal(negativeActivity.azeotropeCount, 1);
close(negativeActivity.azeotropes[0].x1, 0.307459, 2e-6);
assert.equal(negativeActivity.azeotropes[0].extremum, 'minimum-pressure');

const doubleActivity = analyzeMargulesActivity(activityInput('asymmetric-double'));
assert.equal(doubleActivity.azeotropeCount, 2);
close(doubleActivity.azeotropes[0].x1, 0.701751, 2e-6);
close(doubleActivity.azeotropes[1].x1, 0.827661, 2e-6);
assert.deepEqual(doubleActivity.azeotropes.map(({ extremum }) => extremum).sort(), ['maximum-pressure', 'minimum-pressure']);

for (const analysis of [idealActivity, mildActivity, positiveActivity, negativeActivity, doubleActivity]) {
  const x1 = analysis.point.x1;
  const x2 = 1 - x1;
  close(
    x1 * analysis.point.lnGamma1 + x2 * analysis.point.lnGamma2,
    analysis.point.gExcessRT,
    1e-12,
  );
  assert.ok(Object.isFrozen(analysis));
}

const wrongActivityPrediction = Object.freeze({
  pressureDeparture: 'negative', azeotropeCount: '0', vapourEnrichment: 'component-2', scope: 'measured-mixture',
});
const wrongActivityEvaluation = evaluateActivityPrediction({ analysis: positiveActivity, prediction: wrongActivityPrediction });
assert.equal(wrongActivityEvaluation.correctCount, 0);
assert.deepEqual(wrongActivityEvaluation.learnerPrediction, wrongActivityPrediction);
const correctActivityPrediction = Object.freeze({ ...wrongActivityEvaluation.expected });
assert.equal(evaluateActivityPrediction({ analysis: positiveActivity, prediction: correctActivityPrediction }).correctCount, 4);
for (let level = 1; level <= 4; level += 1) {
  const before = JSON.stringify(correctActivityPrediction);
  assert.ok(nextActivityHint({ analysis: positiveActivity, level }).length > 30);
  assert.equal(JSON.stringify(correctActivityPrediction), before);
}

const stabilityInput = (id) => {
  const scenario = STABILITY_SCENARIO_BY_ID[id];
  return { chi: scenario.chi, overallX1: scenario.overallX1 };
};

const idealStability = analyzeRegularSolution(stabilityInput('ideal-mixing'));
assert.equal(idealStability.localState, 'stable');
assert.equal(idealStability.equilibrium.phaseCount, 1);
assert.equal(idealStability.binodal, null);
assert.equal(idealStability.spinodal, null);
assert.equal(idealStability.curve[0].mixingGibbsRT, 0);
assert.equal(idealStability.curve.at(-1).mixingGibbsRT, 0);

const criticalStability = analyzeRegularSolution(stabilityInput('critical-contact'));
assert.equal(criticalStability.localState, 'critical');
assert.equal(criticalStability.curvature.direction, 'zero');
assert.equal(criticalStability.critical.isCritical, true);

const metastable = analyzeRegularSolution(stabilityInput('metastable-inside-gap'));
assert.equal(metastable.localState, 'metastable');
assert.equal(metastable.equilibrium.phaseCount, 2);
close(metastable.binodal.lowerX1, 0.170715, 2e-6);
close(metastable.binodal.upperX1, 0.829285, 2e-6);
close(metastable.spinodal.lowerX1, 0.295876, 2e-6);
close(metastable.spinodal.upperX1, 0.704124, 2e-6);
close(
  metastable.equilibrium.phase1Fraction * metastable.equilibrium.phase1X1
    + metastable.equilibrium.phase2Fraction * metastable.equilibrium.phase2X1,
  metastable.input.overallX1,
  1e-12,
);
close(metastable.equilibrium.phase1Fraction + metastable.equilibrium.phase2Fraction, 1, 1e-12);
close(metastable.commonTangent.lower.mixingGibbsRT, metastable.commonTangent.upper.mixingGibbsRT, 1e-12);

const unstable = analyzeRegularSolution(stabilityInput('unstable-centre'));
assert.equal(unstable.localState, 'unstable');
assert.equal(unstable.curvature.direction, 'negative');
close(unstable.binodal.lowerX1, 0.070720, 2e-6);
close(unstable.binodal.upperX1, 0.929280, 2e-6);
close(unstable.spinodal.lowerX1, 0.211325, 2e-6);
close(unstable.spinodal.upperX1, 0.788675, 2e-6);

const outerStable = analyzeRegularSolution(stabilityInput('stable-outside-gap'));
assert.equal(outerStable.localState, 'stable');
assert.equal(outerStable.equilibrium.phaseCount, 1);

const wrongStabilityPrediction = Object.freeze({
  curvature: 'positive', localState: 'stable', equilibriumPhases: '1', scope: 'kinetic-trajectory',
});
const wrongStabilityEvaluation = evaluateStabilityPrediction({ analysis: unstable, prediction: wrongStabilityPrediction });
assert.equal(wrongStabilityEvaluation.correctCount, 0);
assert.equal(evaluateStabilityPrediction({ analysis: unstable, prediction: wrongStabilityEvaluation.expected }).correctCount, 4);
for (let level = 1; level <= 4; level += 1) assert.ok(nextStabilityHint({ analysis: metastable, level }).length > 30);
assert.ok(Object.isFrozen(metastable.commonTangent.lower));

const fugacityInput = (id) => {
  const scenario = FUGACITY_SCENARIO_BY_ID[id];
  return {
    temperatureK: scenario.temperatureK,
    pressureBar: scenario.pressureBar,
    secondVirialCm3Mol: scenario.secondVirialCm3Mol,
  };
};

const idealFugacity = analyzeVirialFugacity(fugacityInput('ideal-virial'));
assert.equal(idealFugacity.gateStatus, 'inside');
assert.equal(idealFugacity.compressionFactor, 1);
assert.equal(idealFugacity.fugacityCoefficient, 1);
assert.equal(idealFugacity.fugacityBar, idealFugacity.input.pressureBar);

const attractive = analyzeVirialFugacity(fugacityInput('attractive-departure'));
close(attractive.compressionFactor, 0.976916, 2e-6);
close(attractive.fugacityCoefficient, 0.977445, 2e-6);
close(attractive.fugacityBar, 4.8872, 2e-4);
assert.equal(attractive.departures.compressionFactor, 'below');
assert.equal(attractive.departures.fugacityCoefficient, 'below');
assert.equal(attractive.departures.fugacityPressure, 'below');

const repulsive = analyzeVirialFugacity(fugacityInput('repulsive-departure'));
close(repulsive.compressionFactor, 1.023502, 2e-6);
close(repulsive.fugacityCoefficient, 1.024059, 2e-6);
close(repulsive.fugacityBar, 10.2406, 2e-4);
assert.equal(repulsive.departures.compressionFactor, 'above');

const edge = analyzeVirialFugacity(fugacityInput('near-gate-edge'));
assert.equal(edge.gateStatus, 'inside');
close(edge.compressionFactor, 0.876503, 2e-6);
close(edge.fugacityCoefficient, 0.891207, 2e-6);
close(edge.fugacityBar, 13.3681, 2e-4);

const refused = analyzeVirialFugacity(fugacityInput('outside-declared-gate'));
assert.equal(refused.gateStatus, 'outside');
assert.ok(Math.abs(refused.beta) > refused.gate);
assert.equal(refused.compressionFactor, null);
assert.equal(refused.fugacityCoefficient, null);
assert.equal(refused.fugacityBar, null);
assert.match(refused.gateReason, /outside|exceeds/i);

const wrongFugacityPrediction = Object.freeze({
  gateStatus: 'outside', compressionFactor: 'above', fugacityCoefficient: 'above', fugacityPressure: 'above',
});
const wrongFugacityEvaluation = evaluateFugacityPrediction({ analysis: attractive, prediction: wrongFugacityPrediction });
assert.equal(wrongFugacityEvaluation.correctCount, 0);
assert.equal(evaluateFugacityPrediction({ analysis: attractive, prediction: wrongFugacityEvaluation.expected }).correctCount, 4);
const refusedEvaluation = evaluateFugacityPrediction({ analysis: refused, prediction: {
  gateStatus: 'outside', compressionFactor: 'not-released', fugacityCoefficient: 'not-released', fugacityPressure: 'not-released',
} });
assert.equal(refusedEvaluation.correctCount, 4);
for (let level = 1; level <= 4; level += 1) assert.ok(nextFugacityHint({ analysis: refused, level }).length > 30);
assert.ok(Object.isFrozen(refused));

assert.throws(() => analyzeMargulesActivity({ ...activityInput('ideal-reference'), x1: 1.01 }), /x1|fraction/i);
assert.throws(() => analyzeRegularSolution({ chi: -0.01, overallX1: 0.5 }), /chi/i);
assert.throws(() => analyzeVirialFugacity({ temperatureK: 0, pressureBar: 1, secondVirialCm3Mol: 0 }), /temperature/i);
assert.throws(() => analyzeVirialFugacity({ temperatureK: 300, pressureBar: -1, secondVirialCm3Mol: 0 }), /pressure/i);
assert.throws(() => analyzeVirialFugacity({ temperatureK: 300, pressureBar: 15, secondVirialCm3Mol: -1000, gate: 1 }), /root|discriminant/i);

console.log('Five activity, six stability, and five fugacity cartridges plus primary-source boundaries verified.');
console.log('Margules activity fields, 0/1/2 azeotrope roots, pressure departures, predictions, and hints verified.');
console.log('Regular-solution curvature/binodal/spinodal/lever closure and gated virial fugacity departures verified.');

