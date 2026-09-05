import {
  NONIDEAL_THERMODYNAMICS_BOUNDARY,
  NONIDEAL_THERMODYNAMICS_CONSTANTS,
} from '../data/nonidealThermodynamicsScenarios.js';

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
};

const finiteNumber = (value, label) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new RangeError(`${label} must be a finite number.`);
  return parsed;
};

const positiveNumber = (value, label) => {
  const parsed = finiteNumber(value, label);
  if (parsed <= 0) throw new RangeError(`${label} must be greater than zero.`);
  return parsed;
};

const boundedNumber = (value, minimum, maximum, label) => {
  const parsed = finiteNumber(value, label);
  if (parsed < minimum || parsed > maximum) {
    throw new RangeError(`${label} must be between ${minimum} and ${maximum}.`);
  }
  return parsed;
};

const amountFraction = (value, label) => boundedNumber(value, 0, 1, label);

const pointCountValue = (value) => {
  const parsed = finiteNumber(value, 'pointCount');
  if (!Number.isInteger(parsed) || parsed < 51 || parsed > 1001) {
    throw new RangeError('pointCount must be an integer between 51 and 1001.');
  }
  return parsed;
};

const levelValue = (value) => {
  const parsed = finiteNumber(value, 'hint level');
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 4) {
    throw new RangeError('hint level must be an integer from 1 to 4.');
  }
  return parsed;
};

const directionFromZero = (value, tolerance = 1e-10) => {
  if (Math.abs(value) <= tolerance) return 'zero';
  return value > 0 ? 'positive' : 'negative';
};

const relationToOne = (value, tolerance = 1e-10) => {
  if (Math.abs(value - 1) <= tolerance) return 'equal';
  return value > 1 ? 'above' : 'below';
};

const relationBetween = (left, right, tolerance = 1e-10) => {
  if (Math.abs(left - right) <= tolerance) return 'equal';
  return left > right ? 'above' : 'below';
};

const bisectionRoot = (fn, lower, upper, tolerance = 1e-12, iterations = 120) => {
  let low = lower;
  let high = upper;
  let lowValue = fn(low);
  let highValue = fn(high);
  if (Math.abs(lowValue) <= tolerance) return low;
  if (Math.abs(highValue) <= tolerance) return high;
  if (lowValue * highValue > 0) throw new RangeError('Root is not bracketed.');
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const midpoint = (low + high) / 2;
    const midpointValue = fn(midpoint);
    if (Math.abs(midpointValue) <= tolerance || high - low <= tolerance) return midpoint;
    if (lowValue * midpointValue <= 0) {
      high = midpoint;
      highValue = midpointValue;
    } else {
      low = midpoint;
      lowValue = midpointValue;
    }
  }
  return (low + high) / 2;
};

const activityPoint = ({ A12, A21, p1StarBar, p2StarBar }, x1) => {
  const x2 = 1 - x1;
  const lnGamma1 = x2 ** 2 * (A12 + 2 * (A21 - A12) * x1);
  const lnGamma2 = x1 ** 2 * (A21 + 2 * (A12 - A21) * x2);
  const gamma1 = Math.exp(lnGamma1);
  const gamma2 = Math.exp(lnGamma2);
  const gExcessRT = x1 * x2 * (A21 * x1 + A12 * x2);
  const p1Bar = x1 * gamma1 * p1StarBar;
  const p2Bar = x2 * gamma2 * p2StarBar;
  const pressureBar = p1Bar + p2Bar;
  const y1 = pressureBar > 0 ? p1Bar / pressureBar : x1;
  const idealPressureBar = x1 * p1StarBar + x2 * p2StarBar;
  const idealY1 = idealPressureBar > 0 ? x1 * p1StarBar / idealPressureBar : x1;
  return {
    x1, x2, lnGamma1, lnGamma2, gamma1, gamma2, gExcessRT,
    p1Bar, p2Bar, pressureBar, y1, idealPressureBar, idealY1,
  };
};

const locateAzeotropes = (context) => {
  const epsilon = 1e-6;
  const steps = 6000;
  const fn = (x1) => {
    const point = activityPoint(context, x1);
    return point.y1 - x1;
  };
  const roots = [];
  let previousX = epsilon;
  let previousValue = fn(previousX);
  for (let index = 1; index <= steps; index += 1) {
    const x1 = epsilon + ((1 - 2 * epsilon) * index) / steps;
    const value = fn(x1);
    let root = null;
    if (Math.abs(value) <= 1e-11) root = x1;
    else if (previousValue * value < 0) root = bisectionRoot(fn, previousX, x1);
    if (root !== null && root > 1e-5 && root < 1 - 1e-5 && roots.every((item) => Math.abs(item - root) > 1e-5)) {
      roots.push(root);
    }
    previousX = x1;
    previousValue = value;
  }
  return roots.map((x1) => {
    const point = activityPoint(context, x1);
    const step = Math.min(2e-4, x1 / 3, (1 - x1) / 3);
    const before = activityPoint(context, x1 - step).pressureBar;
    const after = activityPoint(context, x1 + step).pressureBar;
    const localScale = Math.max(1, Math.abs(point.pressureBar));
    const tolerance = localScale * 1e-9;
    let extremum = 'flat-or-indeterminate';
    if (point.pressureBar > before + tolerance && point.pressureBar > after + tolerance) extremum = 'maximum-pressure';
    else if (point.pressureBar < before - tolerance && point.pressureBar < after - tolerance) extremum = 'minimum-pressure';
    return { ...point, extremum };
  });
};

export function analyzeMargulesActivity({
  A12,
  A21,
  p1StarBar,
  p2StarBar,
  x1,
  pointCount = 301,
}) {
  const bounds = NONIDEAL_THERMODYNAMICS_CONSTANTS.activityParameterBounds;
  const pressureBounds = NONIDEAL_THERMODYNAMICS_CONSTANTS.saturationPressureBoundsBar;
  const input = {
    A12: boundedNumber(A12, bounds.minimum, bounds.maximum, 'A12'),
    A21: boundedNumber(A21, bounds.minimum, bounds.maximum, 'A21'),
    p1StarBar: boundedNumber(p1StarBar, pressureBounds.minimum, pressureBounds.maximum, 'p1StarBar'),
    p2StarBar: boundedNumber(p2StarBar, pressureBounds.minimum, pressureBounds.maximum, 'p2StarBar'),
    x1: amountFraction(x1, 'x1 amount fraction'),
    pointCount: pointCountValue(pointCount),
  };
  const context = {
    A12: input.A12,
    A21: input.A21,
    p1StarBar: input.p1StarBar,
    p2StarBar: input.p2StarBar,
  };
  const point = activityPoint(context, input.x1);
  const curve = Array.from({ length: input.pointCount }, (_, index) => (
    activityPoint(context, index / (input.pointCount - 1))
  ));
  const azeotropes = locateAzeotropes(context);
  const departureBar = point.pressureBar - point.idealPressureBar;
  const departureDirection = directionFromZero(departureBar) === 'zero'
    ? 'ideal'
    : directionFromZero(departureBar);
  const enrichmentDifference = point.y1 - point.x1;
  const enrichment = Math.abs(enrichmentDifference) <= 1e-8
    ? 'equal'
    : enrichmentDifference > 0 ? 'component-1' : 'component-2';
  return deepFreeze({
    input,
    point,
    idealReference: {
      pressureBar: point.idealPressureBar,
      y1: point.idealY1,
    },
    pressureDeparture: {
      absoluteBar: departureBar,
      relative: departureBar / point.idealPressureBar,
      direction: departureDirection,
    },
    curve,
    azeotropes,
    azeotropeCount: azeotropes.length,
    enrichment,
    equations: {
      excessGibbs: 'gE/RT = x1 x2 (A21 x1 + A12 x2)',
      gamma1: 'ln gamma1 = x2^2 [A12 + 2(A21 - A12)x1]',
      gamma2: 'ln gamma2 = x1^2 [A21 + 2(A12 - A21)x2]',
      pressure: 'P = x1 gamma1 p1* + x2 gamma2 p2*',
      azeotrope: 'interior root where y1 = x1',
    },
    boundary: NONIDEAL_THERMODYNAMICS_BOUNDARY.activity,
  });
}

const dimensionResult = (learner, expected, reason) => ({
  learner: learner ?? null,
  expected,
  correct: learner === expected,
  reason,
});

export function evaluateActivityPrediction({ analysis, prediction }) {
  if (!analysis?.point || !prediction || typeof prediction !== 'object') {
    throw new TypeError('Activity analysis and prediction are required.');
  }
  const expected = {
    pressureDeparture: analysis.pressureDeparture.direction,
    azeotropeCount: String(analysis.azeotropeCount),
    vapourEnrichment: analysis.enrichment,
    scope: 'synthetic-model',
  };
  const dimensions = {
    pressureDeparture: dimensionResult(prediction.pressureDeparture, expected.pressureDeparture, `At the released composition, P - Pideal is ${analysis.pressureDeparture.absoluteBar.toFixed(4)} bar.`),
    azeotropeCount: dimensionResult(prediction.azeotropeCount, expected.azeotropeCount, `${analysis.azeotropeCount} interior y1 = x1 root${analysis.azeotropeCount === 1 ? '' : 's'} were found; pure endpoints are excluded.`),
    vapourEnrichment: dimensionResult(prediction.vapourEnrichment, expected.vapourEnrichment, `The released field gives x1 = ${analysis.point.x1.toFixed(4)} and y1 = ${analysis.point.y1.toFixed(4)}.`),
    scope: dimensionResult(prediction.scope, expected.scope, 'The parameters and saturation pressures are synthetic teaching inputs, not a measured-mixture fit.'),
  };
  const correctCount = Object.values(dimensions).filter(({ correct }) => correct).length;
  return deepFreeze({ learnerPrediction: { ...prediction }, expected, dimensions, correctCount, total: 4 });
}

export function nextActivityHint({ analysis, level = 1 }) {
  if (!analysis?.point) throw new TypeError('Activity analysis is required.');
  const hints = [
    `Compare the released pressure ${analysis.point.pressureBar.toFixed(3)} bar with the ideal witness ${analysis.idealReference.pressureBar.toFixed(3)} bar before naming the departure.`,
    'Activity coefficient is the multiplier in ai = gammai xi. It is neither activity itself nor a concentration.',
    `An azeotrope is an interior composition where y1 - x1 changes through zero. This field contains ${analysis.azeotropeCount}; the pure endpoints do not count.`,
    'The shape follows a declared Margules equation, but the cartridge values are synthetic. A real-mixture claim would require fitted data and declared conditions.',
  ];
  return hints[levelValue(level) - 1];
}

const mixingGibbsRT = (chi, x1) => {
  if (x1 === 0 || x1 === 1) return 0;
  const x2 = 1 - x1;
  return x1 * Math.log(x1) + x2 * Math.log(x2) + chi * x1 * x2;
};

const mixingCurvature = (chi, x1) => {
  if (x1 === 0 || x1 === 1) return Number.POSITIVE_INFINITY;
  return 1 / x1 + 1 / (1 - x1) - 2 * chi;
};

const binodalForChi = (chi) => {
  if (chi <= 2) return null;
  const fn = (x1) => Math.log(x1 / (1 - x1)) + chi * (1 - 2 * x1);
  const epsilon = 1e-10;
  const upperLimit = 0.5 - 1e-9;
  const steps = 20000;
  let previousX = epsilon;
  let previousValue = fn(previousX);
  let lowerRoot = null;
  for (let index = 1; index <= steps; index += 1) {
    const x1 = epsilon + ((upperLimit - epsilon) * index) / steps;
    const value = fn(x1);
    if (previousValue * value <= 0) {
      lowerRoot = bisectionRoot(fn, previousX, x1, 1e-14, 160);
      break;
    }
    previousX = x1;
    previousValue = value;
  }
  if (lowerRoot === null) throw new RangeError('Unable to bracket the regular-solution binodal root.');
  return { lowerX1: lowerRoot, upperX1: 1 - lowerRoot };
};

const stabilityZone = ({ x1, chi, binodal, spinodal }) => {
  const curvature = mixingCurvature(chi, x1);
  if (Math.abs(chi - 2) <= 1e-10 && Math.abs(x1 - 0.5) <= 1e-8) return 'critical';
  if (spinodal && (Math.abs(x1 - spinodal.lowerX1) <= 1e-8 || Math.abs(x1 - spinodal.upperX1) <= 1e-8)) return 'stability-limit';
  if (curvature < -1e-9) return 'unstable';
  if (binodal && spinodal) {
    const leftMetastable = x1 > binodal.lowerX1 && x1 < spinodal.lowerX1;
    const rightMetastable = x1 > spinodal.upperX1 && x1 < binodal.upperX1;
    if (leftMetastable || rightMetastable) return 'metastable';
  }
  return 'stable';
};

export function analyzeRegularSolution({ chi, overallX1, pointCount = 301 }) {
  const chiBounds = NONIDEAL_THERMODYNAMICS_CONSTANTS.stabilityInteractionBounds;
  const input = {
    chi: boundedNumber(chi, chiBounds.minimum, chiBounds.maximum, 'chi interaction parameter'),
    overallX1: amountFraction(overallX1, 'overall x1 amount fraction'),
    pointCount: pointCountValue(pointCount),
  };
  const spinodal = input.chi > 2
    ? {
      lowerX1: (1 - Math.sqrt(1 - 2 / input.chi)) / 2,
      upperX1: (1 + Math.sqrt(1 - 2 / input.chi)) / 2,
    }
    : null;
  const binodal = binodalForChi(input.chi);
  const selectedCurvature = mixingCurvature(input.chi, input.overallX1);
  const localState = stabilityZone({ x1: input.overallX1, chi: input.chi, binodal, spinodal });
  const curve = Array.from({ length: input.pointCount }, (_, index) => {
    const x1 = index / (input.pointCount - 1);
    return {
      x1,
      mixingGibbsRT: mixingGibbsRT(input.chi, x1),
      curvature: mixingCurvature(input.chi, x1),
      zone: stabilityZone({ x1, chi: input.chi, binodal, spinodal }),
    };
  });
  const insideCoexistence = Boolean(
    binodal
      && input.overallX1 > binodal.lowerX1 + 1e-10
      && input.overallX1 < binodal.upperX1 - 1e-10,
  );
  let equilibrium;
  if (insideCoexistence) {
    const phase2Fraction = (input.overallX1 - binodal.lowerX1) / (binodal.upperX1 - binodal.lowerX1);
    const phase1Fraction = 1 - phase2Fraction;
    equilibrium = {
      phaseCount: 2,
      phase1X1: binodal.lowerX1,
      phase2X1: binodal.upperX1,
      phase1Fraction,
      phase2Fraction,
      balanceX1: phase1Fraction * binodal.lowerX1 + phase2Fraction * binodal.upperX1,
    };
  } else {
    equilibrium = {
      phaseCount: 1,
      phase1X1: input.overallX1,
      phase2X1: null,
      phase1Fraction: 1,
      phase2Fraction: 0,
      balanceX1: input.overallX1,
    };
  }
  let commonTangent = null;
  if (binodal) {
    const lowerG = mixingGibbsRT(input.chi, binodal.lowerX1);
    const upperG = mixingGibbsRT(input.chi, binodal.upperX1);
    const slope = (upperG - lowerG) / (binodal.upperX1 - binodal.lowerX1);
    const intercept = lowerG - slope * binodal.lowerX1;
    commonTangent = {
      slope,
      intercept,
      lower: { x1: binodal.lowerX1, mixingGibbsRT: lowerG },
      upper: { x1: binodal.upperX1, mixingGibbsRT: upperG },
    };
  }
  return deepFreeze({
    input,
    curve,
    curvature: {
      value: selectedCurvature,
      direction: Number.isFinite(selectedCurvature) ? directionFromZero(selectedCurvature, 1e-8) : 'positive',
    },
    localState,
    critical: {
      modelChi: 2,
      modelX1: 0.5,
      isCritical: Math.abs(input.chi - 2) <= 1e-10 && Math.abs(input.overallX1 - 0.5) <= 1e-8,
    },
    spinodal,
    binodal,
    equilibrium,
    commonTangent,
    equations: {
      mixingGibbs: 'Delta gmix/RT = x ln x + (1-x) ln(1-x) + chi x(1-x)',
      curvature: 'd2g/dx2 = 1/x + 1/(1-x) - 2 chi',
      binodal: 'ln[x/(1-x)] + chi(1-2x) = 0',
      lever: 'z1 = L1 x1(alpha) + L2 x1(beta)',
    },
    boundary: NONIDEAL_THERMODYNAMICS_BOUNDARY.stability,
  });
}

export function evaluateStabilityPrediction({ analysis, prediction }) {
  if (!analysis?.equilibrium || !prediction || typeof prediction !== 'object') {
    throw new TypeError('Stability analysis and prediction are required.');
  }
  const expected = {
    curvature: analysis.curvature.direction,
    localState: analysis.localState,
    equilibriumPhases: String(analysis.equilibrium.phaseCount),
    scope: 'equilibrium-no-rate',
  };
  const dimensions = {
    curvature: dimensionResult(prediction.curvature, expected.curvature, `The released dimensionless curvature is ${Number.isFinite(analysis.curvature.value) ? analysis.curvature.value.toFixed(4) : 'positive infinity'}.`),
    localState: dimensionResult(prediction.localState, expected.localState, `The selected homogeneous composition is ${analysis.localState}; this is a local-curvature statement.`),
    equilibriumPhases: dimensionResult(prediction.equilibriumPhases, expected.equilibriumPhases, `The common-tangent equilibrium contains ${analysis.equilibrium.phaseCount} liquid phase${analysis.equilibrium.phaseCount === 1 ? '' : 's'} at this overall composition.`),
    scope: dimensionResult(prediction.scope, expected.scope, 'This terrain reports equilibrium stability and phase amounts, not nucleation, decomposition time, or morphology.'),
  };
  const correctCount = Object.values(dimensions).filter(({ correct }) => correct).length;
  return deepFreeze({ learnerPrediction: { ...prediction }, expected, dimensions, correctCount, total: 4 });
}

export function nextStabilityHint({ analysis, level = 1 }) {
  if (!analysis?.equilibrium) throw new TypeError('Stability analysis is required.');
  const hints = [
    `Start locally: the released curvature is ${Number.isFinite(analysis.curvature.value) ? analysis.curvature.value.toFixed(3) : 'positive infinity'}, so classify the homogeneous point before considering phase amounts.`,
    'The spinodal is the zero-curvature stability limit. The binodal is the common-tangent coexistence boundary; they answer different questions.',
    analysis.binodal
      ? `The common tangent touches x1 = ${analysis.binodal.lowerX1.toFixed(3)} and ${analysis.binodal.upperX1.toFixed(3)}. Compare the overall composition with that interval.`
      : 'No common-tangent pair exists below the symmetric chi = 2 critical threshold, so this model has one equilibrium liquid phase.',
    'The regular-solution terrain is dimensionless and equilibrium-only. It cannot predict how fast domains form, their shape, or a real material phase diagram.',
  ];
  return hints[levelValue(level) - 1];
}

export function analyzeVirialFugacity({
  temperatureK,
  pressureBar,
  secondVirialCm3Mol,
  gate = NONIDEAL_THERMODYNAMICS_CONSTANTS.virialGate,
}) {
  const temperature = positiveNumber(temperatureK, 'temperatureK');
  const pressure = positiveNumber(pressureBar, 'pressureBar');
  const secondVirial = finiteNumber(secondVirialCm3Mol, 'secondVirialCm3Mol');
  const gateValue = positiveNumber(gate, 'virial gate');
  const gasConstant = NONIDEAL_THERMODYNAMICS_CONSTANTS.gasConstantLBarMolK;
  const secondVirialLMol = secondVirial / 1000;
  const idealDensityMolL = pressure / (gasConstant * temperature);
  const beta = secondVirialLMol * idealDensityMolL;
  const discriminant = 1 + 4 * beta;
  if (discriminant <= 0) {
    throw new RangeError('The truncated virial density equation has no real low-density root for these inputs; its discriminant must be positive.');
  }
  const inside = Math.abs(beta) <= gateValue + 1e-12;
  const base = {
    input: {
      temperatureK: temperature,
      pressureBar: pressure,
      secondVirialCm3Mol: secondVirial,
      secondVirialLMol,
    },
    beta,
    gate: gateValue,
    gateStatus: inside ? 'inside' : 'outside',
    gateReason: inside
      ? `|BP/(RT)| = ${Math.abs(beta).toFixed(4)} is inside the declared ${gateValue.toFixed(2)} teaching gate.`
      : `|BP/(RT)| = ${Math.abs(beta).toFixed(4)} exceeds the declared ${gateValue.toFixed(2)} teaching gate, so this truncation releases no pseudo-property result.`,
    idealDensityMolL,
    discriminant,
  };
  if (!inside) {
    return deepFreeze({
      ...base,
      densityMolL: null,
      compressionFactor: null,
      lnFugacityCoefficient: null,
      fugacityCoefficient: null,
      fugacityBar: null,
      departures: {
        compressionFactor: 'not-released',
        fugacityCoefficient: 'not-released',
        fugacityPressure: 'not-released',
      },
      equations: {
        eos: 'P = rho RT(1 + B rho)',
        fugacity: 'ln phi = 2 B rho - ln Z; f = phi P',
      },
      boundary: NONIDEAL_THERMODYNAMICS_BOUNDARY.fugacity,
    });
  }
  const densityMolL = secondVirialLMol === 0
    ? idealDensityMolL
    : (2 * idealDensityMolL) / (1 + Math.sqrt(discriminant));
  const compressionFactor = 1 + secondVirialLMol * densityMolL;
  const lnFugacityCoefficient = 2 * secondVirialLMol * densityMolL - Math.log(compressionFactor);
  const fugacityCoefficient = Math.exp(lnFugacityCoefficient);
  const fugacityBar = fugacityCoefficient * pressure;
  return deepFreeze({
    ...base,
    densityMolL,
    compressionFactor,
    lnFugacityCoefficient,
    fugacityCoefficient,
    fugacityBar,
    departures: {
      compressionFactor: relationToOne(compressionFactor),
      fugacityCoefficient: relationToOne(fugacityCoefficient),
      fugacityPressure: relationBetween(fugacityBar, pressure),
    },
    equations: {
      eos: 'P = rho RT(1 + B rho)',
      lowDensityRoot: 'rho = 2[P/(RT)] / [1 + sqrt(1 + 4BP/(RT))]',
      fugacity: 'ln phi = 2 B rho - ln Z; f = phi P',
    },
    boundary: NONIDEAL_THERMODYNAMICS_BOUNDARY.fugacity,
  });
}

export function evaluateFugacityPrediction({ analysis, prediction }) {
  if (!analysis?.gateStatus || !prediction || typeof prediction !== 'object') {
    throw new TypeError('Fugacity analysis and prediction are required.');
  }
  const expected = {
    gateStatus: analysis.gateStatus,
    compressionFactor: analysis.departures.compressionFactor,
    fugacityCoefficient: analysis.departures.fugacityCoefficient,
    fugacityPressure: analysis.departures.fugacityPressure,
  };
  const dimensions = {
    gateStatus: dimensionResult(prediction.gateStatus, expected.gateStatus, analysis.gateReason),
    compressionFactor: dimensionResult(prediction.compressionFactor, expected.compressionFactor, analysis.gateStatus === 'inside' ? `Z = ${analysis.compressionFactor.toFixed(5)}; compare it with one.` : 'Z is not released outside the gate.'),
    fugacityCoefficient: dimensionResult(prediction.fugacityCoefficient, expected.fugacityCoefficient, analysis.gateStatus === 'inside' ? `phi = ${analysis.fugacityCoefficient.toFixed(5)}; it is a separate integral result, not Z.` : 'phi is not released outside the gate.'),
    fugacityPressure: dimensionResult(prediction.fugacityPressure, expected.fugacityPressure, analysis.gateStatus === 'inside' ? `f = ${analysis.fugacityBar.toFixed(4)} bar while P = ${analysis.input.pressureBar.toFixed(4)} bar.` : 'f is not released outside the gate.'),
  };
  const correctCount = Object.values(dimensions).filter(({ correct }) => correct).length;
  return deepFreeze({ learnerPrediction: { ...prediction }, expected, dimensions, correctCount, total: 4 });
}

export function nextFugacityHint({ analysis, level = 1 }) {
  if (!analysis?.gateStatus) throw new TypeError('Fugacity analysis is required.');
  const hints = [
    `Check the dimensionless gate first: |BP/(RT)| = ${Math.abs(analysis.beta).toFixed(4)} versus ${analysis.gate.toFixed(2)}.`,
    analysis.gateStatus === 'inside'
      ? `The density root gives Z ${analysis.departures.compressionFactor} one. This pressure-volume departure is not yet the fugacity coefficient.`
      : 'The gate is a refusal boundary, not an invitation to clamp B or pressure until a number appears.',
    analysis.gateStatus === 'inside'
      ? `Use ln phi = 2B rho - ln Z, then f = phi P. Here phi is ${analysis.departures.fugacityCoefficient} one and f is ${analysis.departures.fugacityPressure} P.`
      : 'Outside the gate, the correct Z, phi, and f predictions are all “not released” for this model.',
    'The learner B is synthetic and the equation is a low-density truncation. A named gas or high-pressure property needs temperature-dependent reference data and an appropriate equation of state.',
  ];
  return hints[levelValue(level) - 1];
}

