const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
};

const assayScenario = (record) => deepFreeze({
  unit: 'µmol L⁻¹',
  laneAColor: '#25a9c2',
  laneBColor: '#6b63d9',
  ...record,
  provenance: {
    kind: 'synthetic-teaching',
    label: 'Synthetic replicate exercise',
    statement: 'Every replicate and reference value is a synthetic local teaching input, not measured data or a certified reference-material record.',
  },
});

export const ASSAY_COMPARISON_SCENARIOS = deepFreeze([
  assayScenario({
    id: 'precision-versus-reference',
    code: 'ASSAY 01',
    name: 'Precision versus reference',
    summary: 'Lane A clusters tightly but misses the reference; lane B spreads more widely around it.',
    referenceValue: 10,
    laneALabel: 'Tight, shifted lane',
    laneBLabel: 'Noisy, centred lane',
    laneA: [10.16, 10.14, 10.15, 10.17, 10.15],
    laneB: [9.82, 10.15, 10.05, 9.94, 10.04],
    typeBStandardUncertainty: 0.02,
    coverageFactor: 2,
    teacherQuestion: 'Can a lane be more repeatable while its mean is farther from the accepted reference?',
    misconception: 'A tight cluster is evidence of repeatability under the declared conditions; it is not automatically evidence of closeness to a reference.',
    sourceIds: ['iupacRepeatability', 'nistConfidenceMean', 'nistUncertaintyTypeA', 'nistCombinedStandardUncertainty', 'nistExpandedUncertainty', 'jcgmGum'],
  }),
  assayScenario({
    id: 'same-mean-different-spread',
    code: 'ASSAY 02',
    name: 'Same mean, different spread',
    summary: 'Both sample means sit on the reference while their replicate spreads and intervals disagree.',
    referenceValue: 20,
    laneALabel: 'Compact lane',
    laneBLabel: 'Wide lane',
    laneA: [19.98, 20, 20.02, 20.01, 19.99],
    laneB: [19.75, 20.18, 20.10, 19.88, 20.09],
    typeBStandardUncertainty: 0.03,
    coverageFactor: 2,
    teacherQuestion: 'If two means are identical, what information remains in the individual replicates and interval widths?',
    misconception: 'A mean alone hides repeatability. Equal averages do not imply equal measurement evidence.',
    sourceIds: ['iupacRepeatability', 'nistConfidenceMean', 'nistUncertaintyTypeA', 'nistCombinedStandardUncertainty', 'nistExpandedUncertainty', 'jcgmGum'],
  }),
  assayScenario({
    id: 'replicate-count-and-width',
    code: 'ASSAY 03',
    name: 'Replicate count and interval width',
    summary: 'Two centred lanes have similar spread, but one estimates its mean from twice as many observations.',
    referenceValue: 5,
    laneALabel: 'Four repeats',
    laneBLabel: 'Eight repeats',
    laneA: [4.88, 4.96, 5.04, 5.12],
    laneB: [4.86, 4.90, 4.94, 4.98, 5.02, 5.06, 5.10, 5.14],
    typeBStandardUncertainty: 0.025,
    coverageFactor: 2,
    teacherQuestion: 'Why can the uncertainty of a mean shrink with more repeats even when individual results remain similarly scattered?',
    misconception: 'More repeats act on the standard error of the mean; they do not make the individual observations physically less variable.',
    sourceIds: ['iupacRepeatability', 'nistConfidenceMean', 'nistUncertaintyTypeA', 'nistCombinedStandardUncertainty', 'nistExpandedUncertainty', 'jcgmGum'],
  }),
  assayScenario({
    id: 'single-extreme-result',
    code: 'ASSAY 04',
    name: 'One extreme result stays visible',
    summary: 'One high result expands Lane A without being silently deleted or labelled a mistake.',
    referenceValue: 15,
    laneALabel: 'Extreme value retained',
    laneBLabel: 'Comparison lane',
    laneA: [14.98, 15.02, 15.01, 14.99, 15, 15.55],
    laneB: [14.90, 15.08, 14.95, 15.06, 15, 15.01],
    typeBStandardUncertainty: 0.02,
    coverageFactor: 2,
    teacherQuestion: 'How much can one retained observation move a mean, a standard deviation, and an interval?',
    misconception: 'A visually unusual observation is not permission for automatic removal; its cause requires separate evidence.',
    sourceIds: ['iupacRepeatability', 'nistConfidenceMean', 'nistUncertaintyTypeA', 'nistCombinedStandardUncertainty', 'nistExpandedUncertainty', 'jcgmGum'],
  }),
]);

export const ASSAY_COMPARISON_SCENARIO_BY_ID = deepFreeze(Object.fromEntries(
  ASSAY_COMPARISON_SCENARIOS.map((scenario) => [scenario.id, scenario]),
));

const detectionScenario = (record) => deepFreeze({
  signalUnit: 'absorbance',
  concentrationUnit: 'µmol L⁻¹',
  ...record,
  provenance: {
    kind: 'synthetic-teaching',
    label: 'Synthetic blank-noise exercise',
    statement: 'Blank signals, candidate signal, and calibration coefficients are synthetic local teaching inputs, not measured instrument or method-validation data.',
  },
});

export const DETECTION_GATE_SCENARIOS = deepFreeze([
  detectionScenario({
    id: 'quiet-blank-detectable',
    code: 'GATE 01',
    name: 'Quiet blank, clear candidate',
    summary: 'A compact blank distribution leaves the candidate beyond the declared threshold.',
    blankValues: [0.0010, 0.0015, 0.0005, 0.0012, 0.0008, 0.0011],
    candidateSignal: 0.008,
    calibrationSlope: 0.020,
    calibrationIntercept: 0,
    detectionFactor: 3,
    teacherQuestion: 'Which part of the threshold comes from the blank centre and which part comes from blank variability?',
    misconception: 'Detection is a comparison with a blank-derived threshold; it is not proof of identity, quantitation quality, or chemical selectivity.',
    sourceIds: ['iupacLimitOfDetection', 'iupacDetectionLimit', 'iupacRepeatability', 'nistUncertaintyTypeA'],
  }),
  detectionScenario({
    id: 'noisy-blank-borderline',
    code: 'GATE 02',
    name: 'Noisy blank, buried candidate',
    summary: 'A candidate larger than the blank mean still falls below the variability-adjusted threshold.',
    blankValues: [0.002, 0.008, -0.001, 0.005, 0.011, 0.003],
    candidateSignal: 0.012,
    calibrationSlope: 0.020,
    calibrationIntercept: 0,
    detectionFactor: 3,
    teacherQuestion: 'Why is “larger than the blank average” insufficient when the blank itself is noisy?',
    misconception: 'The blank mean is not the detection gate by itself. Its standard deviation remains part of the declared threshold.',
    sourceIds: ['iupacLimitOfDetection', 'iupacDetectionLimit', 'iupacRepeatability', 'nistUncertaintyTypeA'],
  }),
  detectionScenario({
    id: 'offset-blank-detectable',
    code: 'GATE 03',
    name: 'Offset blank, corrected scale',
    summary: 'A nonzero blank centre and a nonzero calibration intercept remain explicit in the signal-to-concentration conversion.',
    blankValues: [0.021, 0.019, 0.023, 0.020, 0.022, 0.018],
    candidateSignal: 0.030,
    calibrationSlope: 0.015,
    calibrationIntercept: 0.020,
    detectionFactor: 3,
    teacherQuestion: 'How do a blank offset and a calibration intercept enter two different parts of the detection calculation?',
    misconception: 'A nonzero blank is not silently forced to zero, and a calibration intercept is not interchangeable with the observed blank mean.',
    sourceIds: ['iupacLimitOfDetection', 'iupacDetectionLimit', 'iupacRepeatability', 'nistUncertaintyTypeA'],
  }),
]);

export const DETECTION_GATE_SCENARIO_BY_ID = deepFreeze(Object.fromEntries(
  DETECTION_GATE_SCENARIOS.map((scenario) => [scenario.id, scenario]),
));

export const MEASUREMENT_UNCERTAINTY_MODEL_BOUNDARY = deepFreeze({
  included: 'Synthetic replicate summaries, sample standard deviation, standard error, a two-sided 95% Student-t interval for a mean, a declared Type B standard-uncertainty input, root-sum-square combined standard uncertainty, expanded uncertainty with visible coverage factor, and a blank-based detection threshold.',
  excluded: 'Method validation, certified reference values, real instrument data, reproducibility across laboratories, outlier tests or automatic deletion, non-normal confidence methods, covariance, nonlinear propagation, quantitation limits, selectivity, false-positive/false-negative rates, and regulatory or clinical decisions.',
  confidence: 'The displayed 95% Student-t interval describes the long-run coverage of the interval-producing procedure under its assumptions. It is not a 95% probability statement about one completed interval.',
  repeatability: 'Sample standard deviation is used as observed repeatability evidence only because each synthetic lane declares common short-interval conditions. It does not certify a method.',
  expanded: 'Type A and the learner-entered Type B standard uncertainties combine by root-sum-square. Expanded uncertainty U = k uc always displays the selected coverage factor and is not called a confidence interval.',
  detection: 'The teaching threshold is xL = blank mean + kDetection × blank sample standard deviation. The factor is learner-visible and not universal.',
  safety: 'All values are virtual. No sampling, preparation, instrument operation, exposure, quality-control release, diagnosis, or laboratory procedure is provided.',
});
