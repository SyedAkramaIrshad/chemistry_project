import assert from 'node:assert/strict';
import {
  ASSAY_COMPARISON_SCENARIO_BY_ID,
  ASSAY_COMPARISON_SCENARIOS,
  DETECTION_GATE_SCENARIO_BY_ID,
  DETECTION_GATE_SCENARIOS,
  MEASUREMENT_UNCERTAINTY_MODEL_BOUNDARY,
} from '../src/data/measurementScenarios.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../src/data/scienceSources.js';
import {
  T_CRITICAL_95,
  analyzeAssayComparison,
  analyzeDetectionGate,
  evaluateAssayPrediction,
  evaluateDetectionPrediction,
  nextAssayHint,
  nextDetectionHint,
  summarizeReplicates,
} from '../src/chemistry/measurementUncertainty.js';

const close = (actual, expected, tolerance = 1e-10) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} is not within ${tolerance} of ${expected}`,
  );
};

assert.equal(ASSAY_COMPARISON_SCENARIOS.length, 4);
assert.equal(DETECTION_GATE_SCENARIOS.length, 3);
assert.equal(Object.keys(ASSAY_COMPARISON_SCENARIO_BY_ID).length, 4);
assert.equal(Object.keys(DETECTION_GATE_SCENARIO_BY_ID).length, 3);
assert.ok(Object.isFrozen(ASSAY_COMPARISON_SCENARIOS));
assert.ok(Object.isFrozen(DETECTION_GATE_SCENARIOS));
assert.ok(Object.isFrozen(ASSAY_COMPARISON_SCENARIO_BY_ID));
assert.ok(Object.isFrozen(DETECTION_GATE_SCENARIO_BY_ID));
assert.ok(Object.isFrozen(MEASUREMENT_UNCERTAINTY_MODEL_BOUNDARY));

for (const scenario of ASSAY_COMPARISON_SCENARIOS) {
  assert.ok(Object.isFrozen(scenario));
  assert.ok(Object.isFrozen(scenario.laneA));
  assert.ok(Object.isFrozen(scenario.laneB));
  assert.ok(Object.isFrozen(scenario.sourceIds));
  assert.ok(scenario.laneA.length >= 3 && scenario.laneA.length <= 12);
  assert.ok(scenario.laneB.length >= 3 && scenario.laneB.length <= 12);
  assert.ok([...scenario.laneA, ...scenario.laneB].every(Number.isFinite));
  assert.ok(Number.isFinite(scenario.referenceValue));
  assert.ok(scenario.typeBStandardUncertainty >= 0);
  assert.ok(scenario.coverageFactor >= 1 && scenario.coverageFactor <= 3);
  assert.equal(scenario.provenance.kind, 'synthetic-teaching');
  assert.match(scenario.provenance.statement, /synthetic|not measured/i);
  assert.ok(scenario.teacherQuestion.length > 30);
  assert.ok(scenario.misconception.length > 30);
  assert.ok(scenario.sourceIds.length >= 4);
}

for (const scenario of DETECTION_GATE_SCENARIOS) {
  assert.ok(Object.isFrozen(scenario));
  assert.ok(Object.isFrozen(scenario.blankValues));
  assert.ok(Object.isFrozen(scenario.sourceIds));
  assert.ok(scenario.blankValues.length >= 5 && scenario.blankValues.length <= 12);
  assert.ok(scenario.blankValues.every(Number.isFinite));
  assert.ok(Number.isFinite(scenario.candidateSignal));
  assert.ok(scenario.calibrationSlope > 0);
  assert.ok(Number.isFinite(scenario.calibrationIntercept));
  assert.ok(scenario.detectionFactor >= 1 && scenario.detectionFactor <= 5);
  assert.equal(scenario.provenance.kind, 'synthetic-teaching');
  assert.match(scenario.provenance.statement, /synthetic|not measured/i);
  assert.ok(scenario.sourceIds.includes('iupacLimitOfDetection'));
}

assert.equal(new Set(ASSAY_COMPARISON_SCENARIOS.map((scenario) => scenario.id)).size, 4);
assert.equal(new Set(DETECTION_GATE_SCENARIOS.map((scenario) => scenario.id)).size, 3);
assert.match(MEASUREMENT_UNCERTAINTY_MODEL_BOUNDARY.confidence, /95%|95 %/i);
assert.match(MEASUREMENT_UNCERTAINTY_MODEL_BOUNDARY.expanded, /coverage factor/i);
assert.match(MEASUREMENT_UNCERTAINTY_MODEL_BOUNDARY.detection, /blank.+standard deviation/i);
assert.match(MEASUREMENT_UNCERTAINTY_MODEL_BOUNDARY.excluded, /quantitation|validation/i);

for (const sourceId of [
  'iupacRepeatability',
  'iupacStandardUncertainty',
  'iupacLimitOfDetection',
  'iupacDetectionLimit',
  'nistConfidenceMean',
  'nistUncertaintyTypeA',
  'nistCombinedStandardUncertainty',
  'nistExpandedUncertainty',
  'nistReportingUncertainty',
  'jcgmGum',
]) {
  assert.ok(SCIENCE_SOURCES[sourceId], `Missing measurement source ${sourceId}.`);
}
assert.ok(MODEL_PASSPORTS.measurementEvidenceBench);
assert.match(MODEL_PASSPORTS.measurementEvidenceBench.resultKind, /not a validated method/i);
assert.ok(MODEL_PASSPORTS.measurementEvidenceBench.excludes.some((item) => /quantitation limit/i.test(item)));
assert.ok(MODEL_PASSPORTS.measurementEvidenceBench.sources.includes('jcgmGum'));

console.log('Four immutable assay comparisons, three blank-gate scenarios, and their synthetic-data boundary verified.');

assert.ok(Object.isFrozen(T_CRITICAL_95));
assert.equal(Object.keys(T_CRITICAL_95).length, 29);
close(T_CRITICAL_95[2], 4.30265273, 1e-10);
close(T_CRITICAL_95[4], 2.776445105, 1e-12);
close(T_CRITICAL_95[30], 2.042272456, 1e-12);

const oneToFive = summarizeReplicates([1, 2, 3, 4, 5]);
assert.equal(oneToFive.count, 5);
close(oneToFive.mean, 3);
close(oneToFive.sampleVariance, 2.5);
close(oneToFive.sampleStandardDeviation, Math.sqrt(2.5));
close(oneToFive.standardError, Math.sqrt(0.5));
assert.equal(oneToFive.degreesOfFreedom, 4);
close(oneToFive.tCritical95, 2.776445105, 1e-12);
close(oneToFive.confidence95.halfWidth, 2.776445105 * Math.sqrt(0.5));
close(oneToFive.confidence95.lower, 3 - oneToFive.confidence95.halfWidth);
close(oneToFive.confidence95.upper, 3 + oneToFive.confidence95.halfWidth);
assert.deepEqual(oneToFive.values, [1, 2, 3, 4, 5]);
assert.deepEqual(oneToFive.deviations, [-2, -1, 0, 1, 2]);
assert.ok(Object.isFrozen(oneToFive));
assert.ok(Object.isFrozen(oneToFive.values));
assert.ok(Object.isFrozen(oneToFive.deviations));
assert.ok(Object.isFrozen(oneToFive.confidence95));

const zeroSpread = summarizeReplicates([7, 7, 7]);
assert.equal(zeroSpread.sampleStandardDeviation, 0);
assert.equal(zeroSpread.standardError, 0);
assert.deepEqual(
  [zeroSpread.confidence95.lower, zeroSpread.confidence95.upper],
  [7, 7],
);

for (const scenario of ASSAY_COMPARISON_SCENARIOS) {
  const input = {
    laneA: scenario.laneA,
    laneB: scenario.laneB,
    referenceValue: scenario.referenceValue,
    typeBStandardUncertainty: scenario.typeBStandardUncertainty,
    coverageFactor: scenario.coverageFactor,
  };
  const before = JSON.stringify(input);
  const analysis = analyzeAssayComparison(input);
  assert.equal(JSON.stringify(input), before);
  assert.ok(Object.isFrozen(analysis));
  assert.ok(Object.isFrozen(analysis.laneA));
  assert.ok(Object.isFrozen(analysis.laneB));
  assert.equal(analysis.laneA.count, scenario.laneA.length);
  assert.equal(analysis.laneB.count, scenario.laneB.length);
  for (const lane of [analysis.laneA, analysis.laneB]) {
    close(lane.bias, lane.mean - scenario.referenceValue);
    close(lane.absoluteBias, Math.abs(lane.bias));
    close(lane.uncertainty.typeAStandardUncertainty, lane.standardError);
    close(
      lane.uncertainty.combinedStandardUncertainty,
      Math.sqrt(lane.standardError ** 2 + scenario.typeBStandardUncertainty ** 2),
    );
    close(
      lane.uncertainty.expandedUncertainty,
      scenario.coverageFactor * lane.uncertainty.combinedStandardUncertainty,
    );
    assert.equal(
      lane.containsReference,
      scenario.referenceValue >= lane.confidence95.lower - 1e-10
        && scenario.referenceValue <= lane.confidence95.upper + 1e-10,
    );
  }

  const wrongPrediction = Object.freeze({
    moreRepeatable: 'tie',
    closerReference: 'lane-a',
    laneAContainsReference: !analysis.answer.laneAContainsReference,
    laneBContainsReference: !analysis.answer.laneBContainsReference,
  });
  const rawPrediction = JSON.stringify(wrongPrediction);
  const evaluation = evaluateAssayPrediction({ analysis, prediction: wrongPrediction });
  assert.equal(JSON.stringify(wrongPrediction), rawPrediction);
  assert.deepEqual(evaluation.learnerPrediction, wrongPrediction);
  assert.equal(evaluation.dimensions.laneAContainsReference.correct, false);
  assert.equal(evaluation.dimensions.laneBContainsReference.correct, false);
  assert.equal(evaluation.score.total, 4);
  assert.ok(Object.isFrozen(evaluation));

  for (let level = 1; level <= 4; level += 1) {
    const frozenBefore = JSON.stringify(analysis);
    const hint = nextAssayHint({ analysis, level });
    assert.equal(typeof hint, 'string');
    assert.ok(hint.length > 30);
    assert.equal(JSON.stringify(analysis), frozenBefore);
  }
}

const precisionCase = analyzeAssayComparison(ASSAY_COMPARISON_SCENARIO_BY_ID['precision-versus-reference']);
assert.equal(precisionCase.answer.moreRepeatable, 'lane-a');
assert.equal(precisionCase.answer.closerReference, 'lane-b');
assert.equal(precisionCase.answer.laneAContainsReference, false);
assert.equal(precisionCase.answer.laneBContainsReference, true);

const exactTie = analyzeAssayComparison({
  laneA: [1, 2, 3],
  laneB: [3, 2, 1],
  referenceValue: 2,
  typeBStandardUncertainty: 0,
  coverageFactor: 1,
});
assert.equal(exactTie.answer.moreRepeatable, 'tie');
assert.equal(exactTie.answer.closerReference, 'tie');
assert.equal(exactTie.answer.laneAContainsReference, true);
assert.equal(exactTie.answer.laneBContainsReference, true);

assert.throws(() => summarizeReplicates([1, 2]), /3.+31/);
assert.throws(() => summarizeReplicates(Array.from({ length: 32 }, (_, index) => index)), /3.+31/);
assert.throws(() => summarizeReplicates([1, Number.NaN, 3]), /finite/);
assert.doesNotThrow(() => summarizeReplicates(Array.from({ length: 31 }, (_, index) => index)));
assert.throws(() => analyzeAssayComparison({ laneA: [1, 2, 3], laneB: [1, 2, 3], referenceValue: Infinity, typeBStandardUncertainty: 0, coverageFactor: 2 }), /finite/);
assert.throws(() => analyzeAssayComparison({ laneA: [1, 2, 3], laneB: [1, 2, 3], referenceValue: 2, typeBStandardUncertainty: -0.1, coverageFactor: 2 }), /nonnegative/);
assert.throws(() => analyzeAssayComparison({ laneA: [1, 2, 3], laneB: [1, 2, 3], referenceValue: 2, typeBStandardUncertainty: 0, coverageFactor: 0.5 }), /between 1 and 3/);
assert.throws(() => nextAssayHint({ analysis: exactTie, level: 5 }), /between 1 and 4/);

console.log('Student-t summaries, repeatability/reference comparisons, uncertainty budgets, predictions, and immutable hints verified.');

for (const scenario of DETECTION_GATE_SCENARIOS) {
  const input = {
    blankValues: scenario.blankValues,
    candidateSignal: scenario.candidateSignal,
    calibrationSlope: scenario.calibrationSlope,
    calibrationIntercept: scenario.calibrationIntercept,
    detectionFactor: scenario.detectionFactor,
  };
  const before = JSON.stringify(input);
  const analysis = analyzeDetectionGate(input);
  assert.equal(JSON.stringify(input), before);
  assert.ok(Object.isFrozen(analysis));
  assert.ok(Object.isFrozen(analysis.blank));
  assert.deepEqual(analysis.blank.values, scenario.blankValues);
  close(
    analysis.thresholdSignal,
    analysis.blank.mean + scenario.detectionFactor * analysis.blank.sampleStandardDeviation,
  );
  close(
    analysis.lodConcentration,
    (analysis.thresholdSignal - scenario.calibrationIntercept) / scenario.calibrationSlope,
  );
  close(analysis.candidateMarginSignal, scenario.candidateSignal - analysis.thresholdSignal);
  close(
    analysis.counterfactuals.doubledNoise.thresholdSignal,
    analysis.blank.mean + scenario.detectionFactor * 2 * analysis.blank.sampleStandardDeviation,
  );
  assert.equal(analysis.answer.lodVsQuantitation, 'different');
  assert.equal(analysis.answer.moreBlankReplicatesEffect, 'not-automatically-lower');
  assert.equal(analysis.answer.doubledNoiseEffect, 'raises-threshold');
  assert.match(analysis.explanation.threshold, /standard deviation.+not.+standard error/i);

  const wrongPrediction = Object.freeze({
    candidateDecision: 'at-threshold',
    lodVsQuantitation: 'same',
    doubledNoiseEffect: 'lowers-threshold',
    moreBlankReplicatesEffect: 'automatically-lower',
  });
  const rawPrediction = JSON.stringify(wrongPrediction);
  const evaluation = evaluateDetectionPrediction({ analysis, prediction: wrongPrediction });
  assert.equal(JSON.stringify(wrongPrediction), rawPrediction);
  assert.deepEqual(evaluation.learnerPrediction, wrongPrediction);
  assert.equal(evaluation.dimensions.lodVsQuantitation.correct, false);
  assert.equal(evaluation.dimensions.doubledNoiseEffect.correct, false);
  assert.equal(evaluation.dimensions.moreBlankReplicatesEffect.correct, false);
  assert.equal(evaluation.score.total, 4);
  assert.ok(Object.isFrozen(evaluation));

  for (let level = 1; level <= 4; level += 1) {
    const frozenBefore = JSON.stringify(analysis);
    const hint = nextDetectionHint({ analysis, level });
    assert.equal(typeof hint, 'string');
    assert.ok(hint.length > 30);
    assert.equal(JSON.stringify(analysis), frozenBefore);
  }
}

const quietGate = analyzeDetectionGate(DETECTION_GATE_SCENARIO_BY_ID['quiet-blank-detectable']);
const noisyGate = analyzeDetectionGate(DETECTION_GATE_SCENARIO_BY_ID['noisy-blank-borderline']);
assert.equal(quietGate.answer.candidateDecision, 'above-threshold');
assert.equal(noisyGate.answer.candidateDecision, 'below-threshold');

const exactGateInput = {
  blankValues: [1, 2, 3, 4, 5],
  candidateSignal: 3 + 3 * Math.sqrt(2.5),
  calibrationSlope: 2,
  calibrationIntercept: 1,
  detectionFactor: 3,
};
const exactGate = analyzeDetectionGate(exactGateInput);
assert.equal(exactGate.answer.candidateDecision, 'at-threshold');
close(exactGate.lodConcentration, (exactGate.thresholdSignal - 1) / 2);

const aboveGate = analyzeDetectionGate({ ...exactGateInput, candidateSignal: exactGateInput.candidateSignal + 0.1 });
const belowGate = analyzeDetectionGate({ ...exactGateInput, candidateSignal: exactGateInput.candidateSignal - 0.1 });
assert.equal(aboveGate.answer.candidateDecision, 'above-threshold');
assert.equal(belowGate.answer.candidateDecision, 'below-threshold');

const zeroNoiseGate = analyzeDetectionGate({
  blankValues: [0.1, 0.1, 0.1, 0.1, 0.1],
  candidateSignal: 0.1,
  calibrationSlope: 1,
  calibrationIntercept: 0,
  detectionFactor: 3,
});
assert.equal(zeroNoiseGate.answer.candidateDecision, 'at-threshold');
assert.equal(zeroNoiseGate.answer.doubledNoiseEffect, 'unchanged-zero-spread');

assert.throws(() => analyzeDetectionGate({ ...exactGateInput, blankValues: [1, 2, 3, 4] }), /5.+31/);
assert.throws(() => analyzeDetectionGate({ ...exactGateInput, blankValues: Array.from({ length: 32 }, (_, index) => index) }), /5.+31/);
assert.throws(() => analyzeDetectionGate({ ...exactGateInput, blankValues: [1, 2, 3, 4, Number.NaN] }), /finite/);
assert.doesNotThrow(() => analyzeDetectionGate({ ...exactGateInput, blankValues: Array.from({ length: 31 }, (_, index) => index) }));
assert.throws(() => analyzeDetectionGate({ ...exactGateInput, calibrationSlope: 0 }), /greater than zero/);
assert.throws(() => analyzeDetectionGate({ ...exactGateInput, calibrationIntercept: Infinity }), /finite/);
assert.throws(() => analyzeDetectionGate({ ...exactGateInput, detectionFactor: 6 }), /between 1 and 5/);
assert.throws(() => nextDetectionHint({ analysis: quietGate, level: 0 }), /between 1 and 4/);

console.log('Blank-standard-deviation detection gates, concentration conversion, conceptual predictions, and immutable hints verified.');
