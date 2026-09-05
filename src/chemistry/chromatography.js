import {
  CHROMATOGRAPHY_RESOLUTION_BANDS,
  CHROMATOGRAPHY_SCENARIO_BY_ID,
} from '../data/chromatographyScenarios.js';

const ALLOWED_LENGTHS_CM = new Set([5, 15, 25]);
const FLOW_MIN = 0.3;
const FLOW_MAX = 3;
const TRACE_POINT_COUNT = 281;
const GAUSSIAN_HALF_HEIGHT_FACTOR = 2 * Math.sqrt(2 * Math.log(2));
const HALF_HEIGHT_PLATE_COEFFICIENT = 8 * Math.log(2);

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
};

const finitePositive = (value, label) => {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${label} must be a positive finite number.`);
  return value;
};

const assertScenario = (scenarioId) => {
  const scenario = CHROMATOGRAPHY_SCENARIO_BY_ID[scenarioId];
  if (!scenario) throw new RangeError(`Unknown chromatography scenario: ${scenarioId}.`);
  return scenario;
};

const normalizeMethod = (scenario, method) => {
  if (!method || typeof method !== 'object') throw new TypeError('A chromatography method is required.');
  const phase = scenario.phases.find((candidate) => candidate.id === method.phaseId);
  if (!phase) throw new RangeError(`Unknown phase ${method.phaseId ?? 'undefined'} for ${scenario.id}.`);
  if (!ALLOWED_LENGTHS_CM.has(method.columnLengthCm)) {
    throw new RangeError('The column length must be one of 5, 15, or 25 cm.');
  }
  if (!Number.isFinite(method.relativeVelocity)
    || method.relativeVelocity < FLOW_MIN
    || method.relativeVelocity > FLOW_MAX) {
    throw new RangeError(`The relative velocity must be a finite value from ${FLOW_MIN} through ${FLOW_MAX}.`);
  }
  return {
    method: {
      phaseId: phase.id,
      columnLengthCm: method.columnLengthCm,
      relativeVelocity: method.relativeVelocity,
    },
    phase,
  };
};

const validateModel = (model) => {
  for (const key of ['referenceLengthCm', 'holdUpAtReferenceMin', 'plateScale', 'A', 'B', 'C']) {
    finitePositive(model?.[key], `Chromatography model coefficient ${key}`);
  }
};

const classifyResolution = (resolution) => {
  if (resolution < CHROMATOGRAPHY_RESOLUTION_BANDS.overlap.max) return 'overlap';
  if (resolution < CHROMATOGRAPHY_RESOLUTION_BANDS.partial.max) return 'partial';
  return 'board-baseline';
};

const classifyFlow = (relativeVelocity, optimumVelocity) => {
  const ratio = relativeVelocity / optimumVelocity;
  if (ratio < 0.8) return 'slow';
  if (ratio > 1.25) return 'fast';
  return 'near-optimum';
};

const gaussianSignal = (time, peak) => peak.responseWeight
  * Math.exp(-0.5 * ((time - peak.retentionTime) / peak.sigma) ** 2)
  / (peak.sigma * Math.sqrt(2 * Math.PI));

const buildPeak = ({ component, retentionFactor, holdUpTime, plateNumber }) => {
  const adjustedRetentionTime = holdUpTime * retentionFactor;
  const retentionTime = holdUpTime + adjustedRetentionTime;
  const sigma = retentionTime / Math.sqrt(plateNumber);
  const widthHalfHeight = GAUSSIAN_HALF_HEIGHT_FACTOR * sigma;
  const widthBase = 4 * sigma;
  return {
    componentId: component.id,
    label: component.label,
    shortLabel: component.shortLabel,
    responseWeight: component.responseWeight,
    retentionFactor,
    adjustedRetentionTime,
    retentionTime,
    sigma,
    widthHalfHeight,
    widthBase,
    recalculatedPlateNumber: HALF_HEIGHT_PLATE_COEFFICIENT * (retentionTime / widthHalfHeight) ** 2,
  };
};

const buildTrace = (peaks) => {
  const traceEndTime = Math.max(...peaks.map((peak) => peak.retentionTime + 4 * peak.sigma));
  const raw = Array.from({ length: TRACE_POINT_COUNT }, (_, index) => {
    const time = traceEndTime * index / (TRACE_POINT_COUNT - 1);
    const signalA = gaussianSignal(time, peaks.find((peak) => peak.componentId === 'A'));
    const signalB = gaussianSignal(time, peaks.find((peak) => peak.componentId === 'B'));
    return { time, signalA, signalB, totalSignal: signalA + signalB };
  });
  const maxSignal = Math.max(...raw.map((point) => point.totalSignal), Number.EPSILON);
  return {
    traceEndTime,
    maxSignal,
    trace: raw.map((point) => ({
      ...point,
      normalizedA: point.signalA / maxSignal,
      normalizedB: point.signalB / maxSignal,
      normalizedTotal: point.totalSignal / maxSignal,
    })),
  };
};

export function simulateChromatographyRun({ scenarioId, method }) {
  const scenario = assertScenario(scenarioId);
  validateModel(scenario.model);
  const normalized = normalizeMethod(scenario, method);
  const u = normalized.method.relativeVelocity;
  const { A, B, C } = scenario.model;
  const longitudinal = B / u;
  const massTransfer = C * u;
  const plateHeightTotal = A + longitudinal + massTransfer;
  const optimumVelocity = Math.sqrt(B / C);
  const plateNumber = scenario.model.plateScale * normalized.method.columnLengthCm / plateHeightTotal;
  const holdUpTime = scenario.model.holdUpAtReferenceMin
    * (normalized.method.columnLengthCm / scenario.model.referenceLengthCm)
    / u;

  const peaks = [
    buildPeak({
      component: scenario.componentA,
      retentionFactor: normalized.phase.kA,
      holdUpTime,
      plateNumber,
    }),
    buildPeak({
      component: scenario.componentB,
      retentionFactor: normalized.phase.kB,
      holdUpTime,
      plateNumber,
    }),
  ];
  const order = [...peaks].sort((left, right) => (
    left.retentionTime - right.retentionTime || left.componentId.localeCompare(right.componentId)
  ));
  const separationFactor = Math.max(normalized.phase.kA, normalized.phase.kB)
    / Math.min(normalized.phase.kA, normalized.phase.kB);
  const resolution = 2 * Math.abs(order[1].retentionTime - order[0].retentionTime)
    / (order[0].widthBase + order[1].widthBase);
  const detector = buildTrace(peaks);

  return deepFreeze({
    kind: 'chromatography-run',
    scenario,
    phase: normalized.phase,
    method: normalized.method,
    holdUpTime,
    optimumVelocity,
    velocityRatio: u / optimumVelocity,
    flowRegion: classifyFlow(u, optimumVelocity),
    plateHeight: {
      multipath: A,
      longitudinal,
      massTransfer,
      total: plateHeightTotal,
    },
    plateNumber,
    peaks,
    order,
    separationFactor,
    resolution,
    resolutionClass: classifyResolution(resolution),
    resolutionBand: CHROMATOGRAPHY_RESOLUTION_BANDS[classifyResolution(resolution)],
    traceEndTime: detector.traceEndTime,
    maximumDetectorSignal: detector.maxSignal,
    trace: detector.trace,
    identityEstablished: false,
  });
}

const assertRun = (run) => {
  if (!run || run.kind !== 'chromatography-run' || !Array.isArray(run.peaks) || run.peaks.length !== 2) {
    throw new TypeError('A completed chromatography run is required.');
  }
  return run;
};

const assertPrediction = (prediction) => {
  if (!prediction || typeof prediction !== 'object') throw new TypeError('A chromatography prediction is required.');
  for (const key of ['firstPeak', 'resolutionClass', 'flowRegion', 'identityClaim']) {
    if (!prediction[key]) throw new TypeError(`The prediction must include ${key}.`);
  }
  if (!['A', 'B'].includes(prediction.firstPeak)) throw new RangeError('firstPeak must be A or B.');
  if (!['overlap', 'partial', 'board-baseline'].includes(prediction.resolutionClass)) {
    throw new RangeError('resolutionClass must be overlap, partial, or board-baseline.');
  }
  if (!['slow', 'near-optimum', 'fast'].includes(prediction.flowRegion)) {
    throw new RangeError('flowRegion must be slow, near-optimum, or fast.');
  }
  if (!['established', 'not-established'].includes(prediction.identityClaim)) {
    throw new RangeError('identityClaim must be established or not-established.');
  }
};

const verdict = (learner, expected, reason) => ({
  learner,
  expected,
  correct: learner === expected,
  reason,
});

export function evaluateChromatographyAttempt({ run, prediction }) {
  assertRun(run);
  assertPrediction(prediction);
  const expected = {
    firstPeak: run.order[0].componentId,
    resolutionClass: run.resolutionClass,
    flowRegion: run.flowRegion,
    identityClaim: 'not-established',
  };
  const first = run.order[0];
  const second = run.order[1];
  const dimensions = {
    firstPeak: verdict(
      prediction.firstPeak,
      expected.firstPeak,
      `${first.shortLabel} reaches its maximum at ${first.retentionTime.toFixed(3)} min before ${second.shortLabel} at ${second.retentionTime.toFixed(3)} min.`,
    ),
    resolutionClass: verdict(
      prediction.resolutionClass,
      expected.resolutionClass,
      `Rs = ${run.resolution.toFixed(3)} from the two maxima and base widths, placing this run in “${run.resolutionBand.label}”.`,
    ),
    flowRegion: verdict(
      prediction.flowRegion,
      expected.flowRegion,
      `u/uopt = ${run.velocityRatio.toFixed(3)}; the board labels ratios below 0.80 slow, above 1.25 fast, and the interval between them near-optimum.`,
    ),
    identityClaim: verdict(
      prediction.identityClaim,
      expected.identityClaim,
      'Retention and peak resolution are method-conditioned evidence. Retention evidence alone does not establish chemical identity, purity, or a validated method.',
    ),
  };
  const correct = Object.values(dimensions).filter((item) => item.correct).length;
  return deepFreeze({
    committed: true,
    learnerPrediction: { ...prediction },
    expectedPrediction: expected,
    dimensions,
    score: { correct, total: 4 },
  });
}

export function nextChromatographyHint({ run, prediction = {}, level }) {
  assertRun(run);
  if (!Number.isInteger(level) || level < 1 || level > 4) {
    throw new RangeError('Chromatography hint level must be between 1 and 4.');
  }
  if (level === 1) {
    return 'Find the green unretained marker, then compare the horizontal positions of both peak maxima and the width of each peak. No method control or prediction has changed.';
  }
  if (level === 2) {
    return `tM = ${run.holdUpTime.toFixed(3)} min. The two maxima are ${run.order[0].shortLabel} at ${run.order[0].retentionTime.toFixed(3)} min and ${run.order[1].shortLabel} at ${run.order[1].retentionTime.toFixed(3)} min; ${run.order[0].shortLabel} appears first.`;
  }
  if (level === 3) {
    const [peakA, peakB] = run.peaks;
    return `kA = ${peakA.retentionFactor.toFixed(3)}, kB = ${peakB.retentionFactor.toFixed(3)}, alpha = ${run.separationFactor.toFixed(3)}, H* = ${run.plateHeight.total.toFixed(3)}, and u/uopt = ${run.velocityRatio.toFixed(3)}. Use the ratio rather than speed alone to classify the flow region.`;
  }
  const identityPrediction = prediction.identityClaim ? ` Your current identity claim is “${prediction.identityClaim}”.` : '';
  return `Rs = ${run.resolution.toFixed(3)}, so this board labels the run “${run.resolutionBand.label}”. The flow region is ${run.flowRegion}. Retention alone still leaves identity not established.${identityPrediction}`;
}

const difference = (next, previous) => next - previous;

export function compareChromatographyRuns(previousRun, nextRun) {
  if (!previousRun || !nextRun) throw new TypeError('Method comparison requires two chromatography runs.');
  assertRun(previousRun);
  assertRun(nextRun);
  const previousById = Object.fromEntries(previousRun.peaks.map((peak) => [peak.componentId, peak]));
  const nextById = Object.fromEntries(nextRun.peaks.map((peak) => [peak.componentId, peak]));
  const changes = {
    holdUpTime: difference(nextRun.holdUpTime, previousRun.holdUpTime),
    retentionTimeA: difference(nextById.A.retentionTime, previousById.A.retentionTime),
    retentionTimeB: difference(nextById.B.retentionTime, previousById.B.retentionTime),
    separationFactor: difference(nextRun.separationFactor, previousRun.separationFactor),
    plateHeight: difference(nextRun.plateHeight.total, previousRun.plateHeight.total),
    plateNumber: difference(nextRun.plateNumber, previousRun.plateNumber),
    resolution: difference(nextRun.resolution, previousRun.resolution),
    traceEndTime: difference(nextRun.traceEndTime, previousRun.traceEndTime),
  };
  const statements = [];
  if (previousRun.phase.id !== nextRun.phase.id) {
    statements.push(`The phase cartridge changed alpha by ${changes.separationFactor.toFixed(3)}; this is the declared selectivity lever.`);
  }
  if (previousRun.method.columnLengthCm !== nextRun.method.columnLengthCm) {
    statements.push(`Column length changed from ${previousRun.method.columnLengthCm} to ${nextRun.method.columnLengthCm} cm, changing plate number and elapsed time while phase-defined selectivity ${Math.abs(changes.separationFactor) < 1e-12 ? 'stayed fixed' : 'also changed because another control changed'}.`);
  }
  if (previousRun.method.relativeVelocity !== nextRun.method.relativeVelocity) {
    statements.push(`Relative velocity changed H* by ${changes.plateHeight.toFixed(3)} and moved the run from ${previousRun.flowRegion} to ${nextRun.flowRegion}.`);
  }
  if (statements.length === 0) statements.push('Both runs use the same declared method; no method lever changed.');
  statements.push('No run is labelled universally better: resolution, elapsed time, and identity evidence answer different questions.');
  return deepFreeze({ previousRun, nextRun, changes, statements });
}
