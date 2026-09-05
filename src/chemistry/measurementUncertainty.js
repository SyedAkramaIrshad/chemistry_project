const COMPARISON_TOLERANCE = 1e-10;

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
}

function finiteNumber(value, label) {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be a finite number.`);
  return value;
}

function boundedNumber(value, minimum, maximum, label) {
  const number = finiteNumber(value, label);
  if (number < minimum || number > maximum) {
    throw new RangeError(`${label} must be between ${minimum} and ${maximum}.`);
  }
  return number;
}

function finiteReplicates(values, label, minimumCount = 3) {
  if (!Array.isArray(values)) throw new TypeError(`${label} must be an array of replicate values.`);
  if (values.length < minimumCount || values.length > 31) {
    throw new RangeError(`${label} must contain between ${minimumCount} and 31 replicate values.`);
  }
  return values.map((value, index) => finiteNumber(value, `${label} replicate ${index + 1}`));
}

function comparisonId(first, second) {
  if (Math.abs(first - second) <= COMPARISON_TOLERANCE) return 'tie';
  return first < second ? 'lane-a' : 'lane-b';
}

function laneLabel(id) {
  if (id === 'lane-a') return 'Lane A';
  if (id === 'lane-b') return 'Lane B';
  return 'Tie';
}

function yesNo(value) {
  return value ? 'Yes' : 'No';
}

function format(value, digits = 4) {
  if (!Number.isFinite(value)) return '—';
  return Number(value.toPrecision(digits)).toString();
}

export const T_CRITICAL_95 = Object.freeze({
  2: 4.30265273,
  3: 3.182446305,
  4: 2.776445105,
  5: 2.570581836,
  6: 2.446911851,
  7: 2.364624252,
  8: 2.306004135,
  9: 2.262157163,
  10: 2.228138852,
  11: 2.20098516,
  12: 2.17881283,
  13: 2.160368656,
  14: 2.144786688,
  15: 2.131449546,
  16: 2.119905299,
  17: 2.109815578,
  18: 2.10092204,
  19: 2.093024054,
  20: 2.085963447,
  21: 2.079613845,
  22: 2.073873068,
  23: 2.06865761,
  24: 2.063898562,
  25: 2.059538553,
  26: 2.055529439,
  27: 2.051830516,
  28: 2.048407142,
  29: 2.045229642,
  30: 2.042272456,
});

export function summarizeReplicates(values) {
  const replicates = finiteReplicates(values, 'Replicate set');
  const count = replicates.length;
  const mean = replicates.reduce((sum, value) => sum + value, 0) / count;
  const deviations = replicates.map((value) => value - mean);
  const sampleVariance = deviations.reduce((sum, value) => sum + value ** 2, 0) / (count - 1);
  const sampleStandardDeviation = Math.sqrt(sampleVariance);
  const standardError = sampleStandardDeviation / Math.sqrt(count);
  const degreesOfFreedom = count - 1;
  const tCritical95 = T_CRITICAL_95[degreesOfFreedom];
  const halfWidth = tCritical95 * standardError;

  return deepFreeze({
    values: replicates,
    count,
    mean,
    deviations,
    sampleVariance,
    sampleStandardDeviation,
    standardError,
    degreesOfFreedom,
    tCritical95,
    confidence95: {
      level: 0.95,
      lower: mean - halfWidth,
      upper: mean + halfWidth,
      halfWidth,
      equation: 'x̄ ± t(0.975, n − 1) × s/√n',
      interpretation: 'In repeated use under the model assumptions, 95% of intervals made by this procedure contain the population mean. This is not a 95% probability statement about one completed interval.',
    },
  });
}

function analyzeLane({ values, referenceValue, typeBStandardUncertainty, coverageFactor }) {
  const summary = summarizeReplicates(values);
  const bias = summary.mean - referenceValue;
  const absoluteBias = Math.abs(bias);
  const containsReference = referenceValue >= summary.confidence95.lower - COMPARISON_TOLERANCE
    && referenceValue <= summary.confidence95.upper + COMPARISON_TOLERANCE;
  const typeAStandardUncertainty = summary.standardError;
  const combinedStandardUncertainty = Math.sqrt(
    typeAStandardUncertainty ** 2 + typeBStandardUncertainty ** 2,
  );
  const expandedUncertainty = coverageFactor * combinedStandardUncertainty;

  return {
    ...summary,
    bias,
    absoluteBias,
    containsReference,
    uncertainty: {
      typeAStandardUncertainty,
      typeBStandardUncertainty,
      combinedStandardUncertainty,
      coverageFactor,
      expandedUncertainty,
      coverageInterval: {
        lower: summary.mean - expandedUncertainty,
        upper: summary.mean + expandedUncertainty,
        halfWidth: expandedUncertainty,
      },
      equation: 'uc = √(uA² + uB²); U = k uc',
      interpretation: 'This expanded-uncertainty interval uses the displayed coverage factor. It is not the Student-t confidence interval and no automatic coverage probability is assigned here.',
    },
  };
}

export function analyzeAssayComparison({
  laneA,
  laneB,
  referenceValue,
  typeBStandardUncertainty,
  coverageFactor,
}) {
  const reference = finiteNumber(referenceValue, 'Reference value');
  const typeB = finiteNumber(typeBStandardUncertainty, 'Type B standard uncertainty');
  if (typeB < 0) throw new RangeError('Type B standard uncertainty must be nonnegative.');
  const factor = boundedNumber(coverageFactor, 1, 3, 'Coverage factor');
  const analyzedLaneA = analyzeLane({
    values: laneA,
    referenceValue: reference,
    typeBStandardUncertainty: typeB,
    coverageFactor: factor,
  });
  const analyzedLaneB = analyzeLane({
    values: laneB,
    referenceValue: reference,
    typeBStandardUncertainty: typeB,
    coverageFactor: factor,
  });
  const moreRepeatable = comparisonId(
    analyzedLaneA.sampleStandardDeviation,
    analyzedLaneB.sampleStandardDeviation,
  );
  const closerReference = comparisonId(analyzedLaneA.absoluteBias, analyzedLaneB.absoluteBias);

  return deepFreeze({
    input: {
      laneA: [...analyzedLaneA.values],
      laneB: [...analyzedLaneB.values],
      referenceValue: reference,
      typeBStandardUncertainty: typeB,
      coverageFactor: factor,
    },
    laneA: analyzedLaneA,
    laneB: analyzedLaneB,
    answer: {
      moreRepeatable,
      closerReference,
      laneAContainsReference: analyzedLaneA.containsReference,
      laneBContainsReference: analyzedLaneB.containsReference,
    },
    evidence: {
      repeatability: `${laneLabel(moreRepeatable)} has the smaller observed sample standard deviation${moreRepeatable === 'tie' ? '' : ' in this synthetic replicate set'}.`,
      reference: `${laneLabel(closerReference)} has the smaller absolute difference between its mean and the displayed teaching reference.`,
      confidence: 'Reference inclusion is checked against each two-sided 95% Student-t interval for a mean.',
      uncertainty: 'The displayed Type A/Type B budget is a separate GUM-style root-sum-square teaching calculation.',
    },
  });
}

function evaluationDimension({ learner, expected, label, reason, labelValue = (value) => String(value) }) {
  return {
    learner,
    expected,
    learnerLabel: labelValue(learner),
    expectedLabel: labelValue(expected),
    correct: learner === expected,
    label,
    reason,
  };
}

export function evaluateAssayPrediction({ analysis, prediction }) {
  if (!analysis?.answer || !analysis?.laneA || !analysis?.laneB) {
    throw new TypeError('A complete assay analysis is required.');
  }
  if (!prediction || typeof prediction !== 'object' || Array.isArray(prediction)) {
    throw new TypeError('Assay prediction must be an object.');
  }
  const learnerPrediction = { ...prediction };
  const dimensions = {
    moreRepeatable: evaluationDimension({
      learner: learnerPrediction.moreRepeatable,
      expected: analysis.answer.moreRepeatable,
      label: 'Observed repeatability',
      labelValue: laneLabel,
      reason: `${laneLabel(analysis.answer.moreRepeatable)} is supported by sA = ${format(analysis.laneA.sampleStandardDeviation)} and sB = ${format(analysis.laneB.sampleStandardDeviation)}. Smaller s means tighter observed repeatability under the declared conditions.`,
    }),
    closerReference: evaluationDimension({
      learner: learnerPrediction.closerReference,
      expected: analysis.answer.closerReference,
      label: 'Closeness to reference',
      labelValue: laneLabel,
      reason: `${laneLabel(analysis.answer.closerReference)} is supported by |biasA| = ${format(analysis.laneA.absoluteBias)} and |biasB| = ${format(analysis.laneB.absoluteBias)}.`,
    }),
    laneAContainsReference: evaluationDimension({
      learner: learnerPrediction.laneAContainsReference,
      expected: analysis.answer.laneAContainsReference,
      label: 'Reference inside Lane A 95% t interval',
      labelValue: yesNo,
      reason: `Lane A spans ${format(analysis.laneA.confidence95.lower)} to ${format(analysis.laneA.confidence95.upper)}.`,
    }),
    laneBContainsReference: evaluationDimension({
      learner: learnerPrediction.laneBContainsReference,
      expected: analysis.answer.laneBContainsReference,
      label: 'Reference inside Lane B 95% t interval',
      labelValue: yesNo,
      reason: `Lane B spans ${format(analysis.laneB.confidence95.lower)} to ${format(analysis.laneB.confidence95.upper)}.`,
    }),
  };
  const correct = Object.values(dimensions).filter((dimension) => dimension.correct).length;

  return deepFreeze({
    learnerPrediction,
    answer: { ...analysis.answer },
    dimensions,
    score: { correct, total: Object.keys(dimensions).length },
  });
}

export function nextAssayHint({ analysis, level }) {
  if (!analysis?.answer || !analysis?.laneA || !analysis?.laneB) {
    throw new TypeError('A complete assay analysis is required.');
  }
  if (!Number.isInteger(level) || level < 1 || level > 4) {
    throw new RangeError('Assay hint level must be an integer between 1 and 4.');
  }
  if (level === 1) {
    return 'Use sample standard deviation s to judge observed repeatability, absolute mean-to-reference difference to judge closeness, and each t interval—not the point cloud alone—to judge reference inclusion.';
  }
  if (level === 2) {
    return `Lane A has x̄ = ${format(analysis.laneA.mean)} and s = ${format(analysis.laneA.sampleStandardDeviation)}; Lane B has x̄ = ${format(analysis.laneB.mean)} and s = ${format(analysis.laneB.sampleStandardDeviation)}. Compare each mean separately with the reference ${format(analysis.input.referenceValue)}.`;
  }
  if (level === 3) {
    return `For Lane A, SE = ${format(analysis.laneA.standardError)} and t* = ${format(analysis.laneA.tCritical95)}, giving ${format(analysis.laneA.confidence95.lower)} to ${format(analysis.laneA.confidence95.upper)}. For Lane B, SE = ${format(analysis.laneB.standardError)} and t* = ${format(analysis.laneB.tCritical95)}, giving ${format(analysis.laneB.confidence95.lower)} to ${format(analysis.laneB.confidence95.upper)}.`;
  }
  return `${laneLabel(analysis.answer.moreRepeatable)} is more repeatable; ${laneLabel(analysis.answer.closerReference)} is closer to the displayed reference. The reference is ${analysis.answer.laneAContainsReference ? 'inside' : 'outside'} Lane A’s 95% t interval and ${analysis.answer.laneBContainsReference ? 'inside' : 'outside'} Lane B’s interval.`;
}

function detectionDecision(marginSignal, scale) {
  const tolerance = Math.max(1, Math.abs(scale)) * 1e-12;
  if (marginSignal > tolerance) return 'above-threshold';
  if (marginSignal < -tolerance) return 'below-threshold';
  return 'at-threshold';
}

function detectionDecisionLabel(id) {
  if (id === 'above-threshold') return 'Above the declared gate';
  if (id === 'below-threshold') return 'Below the declared gate';
  return 'At the declared gate';
}

function detectionConceptLabel(id) {
  const labels = {
    different: 'Detection and quantitation are different claims',
    same: 'Detection and quantitation are the same claim',
    'raises-threshold': 'Higher blank spread raises the gate',
    'unchanged-zero-spread': 'Zero blank spread remains zero when doubled',
    'lowers-threshold': 'Higher blank spread lowers the gate',
    'not-automatically-lower': 'More blank repeats do not automatically lower sBlank',
    'automatically-lower': 'More blank repeats automatically divide the gate spread by √n',
  };
  return labels[id] ?? String(id ?? 'No prediction');
}

export function analyzeDetectionGate({
  blankValues,
  candidateSignal,
  calibrationSlope,
  calibrationIntercept,
  detectionFactor,
}) {
  const blanks = finiteReplicates(blankValues, 'Blank set', 5);
  const candidate = finiteNumber(candidateSignal, 'Candidate signal');
  const slope = finiteNumber(calibrationSlope, 'Calibration slope');
  if (slope <= 0) throw new RangeError('Calibration slope must be greater than zero.');
  const intercept = finiteNumber(calibrationIntercept, 'Calibration intercept');
  const factor = boundedNumber(detectionFactor, 1, 5, 'Detection factor');
  const blank = summarizeReplicates(blanks);
  const thresholdSignal = blank.mean + factor * blank.sampleStandardDeviation;
  const lodConcentration = (thresholdSignal - intercept) / slope;
  const candidateMarginSignal = candidate - thresholdSignal;
  const candidateDecision = detectionDecision(candidateMarginSignal, thresholdSignal);
  const doubledNoiseStandardDeviation = 2 * blank.sampleStandardDeviation;
  const doubledNoiseThresholdSignal = blank.mean + factor * doubledNoiseStandardDeviation;
  const doubledNoiseEffect = blank.sampleStandardDeviation <= COMPARISON_TOLERANCE
    ? 'unchanged-zero-spread'
    : 'raises-threshold';

  return deepFreeze({
    input: {
      blankValues: [...blank.values],
      candidateSignal: candidate,
      calibrationSlope: slope,
      calibrationIntercept: intercept,
      detectionFactor: factor,
    },
    blank,
    thresholdSignal,
    lodConcentration,
    candidateSignal: candidate,
    candidateMarginSignal,
    candidateRelation: {
      id: candidateDecision,
      label: detectionDecisionLabel(candidateDecision),
    },
    calibration: {
      slope,
      intercept,
      equation: 'signal = slope × concentration + intercept',
      inverseEquation: 'concentration = (signal − intercept) / slope',
    },
    counterfactuals: {
      doubledNoise: {
        sampleStandardDeviation: doubledNoiseStandardDeviation,
        thresholdSignal: doubledNoiseThresholdSignal,
        changeSignal: doubledNoiseThresholdSignal - thresholdSignal,
        effect: doubledNoiseEffect,
      },
      moreBlankReplicates: {
        effect: 'not-automatically-lower',
        statement: 'Adding blank replicates can improve knowledge of blank behaviour, but this teaching threshold still uses the observed blank sample standard deviation sBlank—not sBlank/√n.',
      },
    },
    answer: {
      candidateDecision,
      lodVsQuantitation: 'different',
      doubledNoiseEffect,
      moreBlankReplicatesEffect: 'not-automatically-lower',
    },
    explanation: {
      threshold: 'This declared teaching threshold uses blank sample standard deviation sBlank, not the standard error of the blank mean.',
      factor: 'The numerical detection factor remains visible because it expresses a chosen decision convention; it is not universal.',
      quantitation: 'Crossing this detection gate does not establish a quantitation limit, suitable quantitative range, identity, selectivity, or method validity.',
      concentration: 'The concentration-equivalent value is only the displayed linear calibration inversion of this synthetic signal threshold.',
    },
  });
}

export function evaluateDetectionPrediction({ analysis, prediction }) {
  if (!analysis?.answer || !analysis?.blank || !analysis?.counterfactuals) {
    throw new TypeError('A complete detection-gate analysis is required.');
  }
  if (!prediction || typeof prediction !== 'object' || Array.isArray(prediction)) {
    throw new TypeError('Detection prediction must be an object.');
  }
  const learnerPrediction = { ...prediction };
  const dimensions = {
    candidateDecision: evaluationDimension({
      learner: learnerPrediction.candidateDecision,
      expected: analysis.answer.candidateDecision,
      label: 'Candidate versus declared gate',
      labelValue: detectionDecisionLabel,
      reason: `Candidate ${format(analysis.candidateSignal)} is ${format(Math.abs(analysis.candidateMarginSignal))} signal units ${analysis.candidateMarginSignal >= 0 ? 'above' : 'below'} xL = ${format(analysis.thresholdSignal)}.`,
    }),
    lodVsQuantitation: evaluationDimension({
      learner: learnerPrediction.lodVsQuantitation,
      expected: analysis.answer.lodVsQuantitation,
      label: 'Detection versus quantitation',
      labelValue: detectionConceptLabel,
      reason: 'A detection threshold addresses distinguishability from a suitable blank. It does not define the range in which quantitative measurement is suitable.',
    }),
    doubledNoiseEffect: evaluationDimension({
      learner: learnerPrediction.doubledNoiseEffect,
      expected: analysis.answer.doubledNoiseEffect,
      label: 'Doubling blank spread',
      labelValue: detectionConceptLabel,
      reason: `Holding the blank mean and factor fixed changes the gate from ${format(analysis.thresholdSignal)} to ${format(analysis.counterfactuals.doubledNoise.thresholdSignal)} when sBlank is doubled.`,
    }),
    moreBlankReplicatesEffect: evaluationDimension({
      learner: learnerPrediction.moreBlankReplicatesEffect,
      expected: analysis.answer.moreBlankReplicatesEffect,
      label: 'Adding blank replicates',
      labelValue: detectionConceptLabel,
      reason: 'This formula contains sBlank, not the standard error sBlank/√n. More observations do not mechanically divide the threshold spread by √n.',
    }),
  };
  const correct = Object.values(dimensions).filter((dimension) => dimension.correct).length;

  return deepFreeze({
    learnerPrediction,
    answer: { ...analysis.answer },
    dimensions,
    score: { correct, total: Object.keys(dimensions).length },
  });
}

export function nextDetectionHint({ analysis, level }) {
  if (!analysis?.answer || !analysis?.blank || !analysis?.counterfactuals) {
    throw new TypeError('A complete detection-gate analysis is required.');
  }
  if (!Number.isInteger(level) || level < 1 || level > 4) {
    throw new RangeError('Detection hint level must be an integer between 1 and 4.');
  }
  if (level === 1) {
    return 'Build the gate from the blank centre plus a visible multiple of blank sample standard deviation. Then compare the candidate with that gate; do not use the standard error of the blank mean.';
  }
  if (level === 2) {
    return `The blank mean is ${format(analysis.blank.mean)}, sBlank is ${format(analysis.blank.sampleStandardDeviation)}, and the declared factor is ${format(analysis.input.detectionFactor)}. The candidate signal is ${format(analysis.candidateSignal)}.`;
  }
  if (level === 3) {
    return `xL = ${format(analysis.blank.mean)} + ${format(analysis.input.detectionFactor)} × ${format(analysis.blank.sampleStandardDeviation)} = ${format(analysis.thresholdSignal)}. The concentration-equivalent threshold is ${format(analysis.lodConcentration)} only under the displayed linear calibration.`;
  }
  return `${detectionDecisionLabel(analysis.answer.candidateDecision)}. Detection and quantitation remain different claims; doubling nonzero blank spread raises this gate, and simply adding blank replicates does not automatically replace sBlank with sBlank/√n.`;
}
