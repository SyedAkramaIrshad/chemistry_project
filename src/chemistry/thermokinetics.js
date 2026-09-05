const GAS_CONSTANT_J = 8.31446261815324;
const LN_10 = Math.LN10;

const MODEL_ASSUMPTIONS = [
  'ΔH° and ΔS° are treated as temperature-independent over the selected range.',
  'K is an ideal dimensionless standard-state equilibrium constant.',
  'The kinetic model is one-step and first-order with a temperature-independent Arrhenius prefactor.',
  'The reaction-coordinate graphic is schematic and uses entered enthalpy/barrier values.',
  'A catalyst lowers forward and reverse activation barriers equally.',
];

function finiteNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${label} must be a finite number.`);
  return number;
}

function positiveNumber(value, label) {
  const number = finiteNumber(value, label);
  if (number <= 0) throw new RangeError(`${label} must be greater than zero.`);
  return number;
}

function nonnegativeNumber(value, label) {
  const number = finiteNumber(value, label);
  if (number < 0) throw new RangeError(`${label} cannot be negative.`);
  return number;
}

function safeExponential(exponent) {
  if (exponent > 709) return Infinity;
  if (exponent < -745) return 0;
  return Math.exp(exponent);
}

function normalizeParams(params) {
  if (!params || typeof params !== 'object') throw new TypeError('Thermodynamics and kinetics parameters are required.');
  const normalized = {
    deltaHkJ: finiteNumber(params.deltaHkJ, 'Standard enthalpy change'),
    deltaSJ: finiteNumber(params.deltaSJ, 'Standard entropy change'),
    temperatureK: positiveNumber(params.temperatureK, 'Temperature'),
    activationKJ: nonnegativeNumber(params.activationKJ, 'Forward activation energy'),
    catalystReductionKJ: nonnegativeNumber(params.catalystReductionKJ, 'Catalyst barrier reduction'),
    preExponentialPerS: positiveNumber(params.preExponentialPerS, 'Arrhenius prefactor'),
  };
  if (normalized.temperatureK < 100 || normalized.temperatureK > 2000) {
    throw new RangeError('Temperature must stay between 100 K and 2000 K in this educational model.');
  }
  return normalized;
}

function equilibriumConstantState(deltaGkJ, temperatureK) {
  const lnK = -deltaGkJ * 1000 / (GAS_CONSTANT_J * temperatureK);
  const log10K = lnK / LN_10;
  const equilibriumConstant = safeExponential(lnK);
  let favoredSide = 'balanced';
  let favoredLabel = 'Neither side strongly favored';
  if (deltaGkJ < -1e-9) {
    favoredSide = 'products';
    favoredLabel = log10K > 3 ? 'Products overwhelmingly favored' : 'Products favored';
  } else if (deltaGkJ > 1e-9) {
    favoredSide = 'reactants';
    favoredLabel = log10K < -3 ? 'Reactants overwhelmingly favored' : 'Reactants favored';
  }
  return { lnK, log10K, equilibriumConstant, favoredSide, favoredLabel };
}

function arrheniusState(activationKJ, preExponentialPerS, temperatureK) {
  const exponent = -activationKJ * 1000 / (GAS_CONSTANT_J * temperatureK);
  const rateConstantPerS = preExponentialPerS * safeExponential(exponent);
  const halfLifeS = rateConstantPerS > 0 && Number.isFinite(rateConstantPerS)
    ? Math.LN2 / rateConstantPerS
    : rateConstantPerS === Infinity ? 0 : Infinity;
  return { activationKJ, exponent, rateConstantPerS, halfLifeS };
}

function speedLabel(halfLifeS) {
  if (halfLifeS === 0) return 'Modelled as effectively instantaneous';
  if (!Number.isFinite(halfLifeS)) return 'Effectively frozen in this model';
  if (halfLifeS < 1e-6) return 'Sub-microsecond half-life';
  if (halfLifeS < 1e-3) return 'Microsecond-scale half-life';
  if (halfLifeS < 1) return 'Sub-second half-life';
  if (halfLifeS < 60) return 'Seconds-scale half-life';
  if (halfLifeS < 3600) return 'Minutes-scale half-life';
  if (halfLifeS < 86400) return 'Hours-scale half-life';
  return 'Days-or-longer half-life';
}

export function firstOrderTrace(rateConstantPerS, maximumTimeS, sampleCount = 121) {
  const rate = nonnegativeNumber(rateConstantPerS, 'Rate constant');
  const maximum = positiveNumber(maximumTimeS, 'Maximum trace time');
  const count = Math.max(25, Math.round(positiveNumber(sampleCount, 'Sample count')));
  return Array.from({length:count},(_,index)=>{
    const timeS = maximum * index / (count - 1);
    return { timeS, remainingFraction: Math.exp(-rate * timeS), productFraction: 1 - Math.exp(-rate * timeS) };
  });
}

export function remainingFractionAt(rateConstantPerS, timeS) {
  const rate = nonnegativeNumber(rateConstantPerS, 'Rate constant');
  const time = nonnegativeNumber(timeS, 'Observation time');
  return Math.exp(-rate * time);
}

export function analyzeThermoKinetics(params) {
  const normalized = normalizeParams(params);
  const entropyTermKJ = normalized.temperatureK * normalized.deltaSJ / 1000;
  const deltaGkJ = normalized.deltaHkJ - entropyTermKJ;
  const equilibrium = equilibriumConstantState(deltaGkJ, normalized.temperatureK);
  const crossoverTemperatureK = Math.abs(normalized.deltaSJ) > Number.EPSILON
    ? normalized.deltaHkJ * 1000 / normalized.deltaSJ
    : null;
  const thermodynamics = {
    deltaHkJ: normalized.deltaHkJ,
    deltaSJ: normalized.deltaSJ,
    temperatureK: normalized.temperatureK,
    entropyTermKJ,
    deltaGkJ,
    ...equilibrium,
    crossoverTemperatureK: crossoverTemperatureK > 0 && Number.isFinite(crossoverTemperatureK) ? crossoverTemperatureK : null,
    equation: {
      label: 'Gibbs energy and equilibrium',
      expression: 'ΔG° = ΔH° − TΔS°;  ΔG° = −RT ln K',
      detail: 'Temperature changes both TΔS° and the conversion from ΔG° to K.',
    },
  };

  const reverseActivationKJ = normalized.activationKJ - normalized.deltaHkJ;
  const maximumCatalystReductionKJ = Math.max(0, Math.min(normalized.activationKJ, reverseActivationKJ));
  const errors = [];
  if (reverseActivationKJ < 0) {
    errors.push(`The product level is ${normalized.deltaHkJ.toFixed(2)} kJ mol⁻¹ above the reactant, but the entered transition state is only ${normalized.activationKJ.toFixed(2)} kJ mol⁻¹ above it. Increase forward Ea to at least ${normalized.deltaHkJ.toFixed(2)} kJ mol⁻¹.`);
  }
  if (normalized.catalystReductionKJ > maximumCatalystReductionKJ + 1e-12) {
    errors.push(`Lowering both barriers by ${normalized.catalystReductionKJ.toFixed(2)} kJ mol⁻¹ would place the catalyzed transition state below a reaction endpoint. Use at most ${maximumCatalystReductionKJ.toFixed(2)} kJ mol⁻¹.`);
  }

  const baseResult = {
    status: errors.length ? 'invalid' : 'valid',
    errors,
    params: normalized,
    thermodynamics,
    constraints: {
      reverseActivationKJ,
      maximumCatalystReductionKJ,
      minimumForwardActivationKJ: Math.max(0, normalized.deltaHkJ),
    },
    assumptions: MODEL_ASSUMPTIONS,
    resultKind: 'Computed ideal thermodynamics and one-step kinetics model',
  };
  if (errors.length) return baseResult;

  const catalyzedForwardKJ = normalized.activationKJ - normalized.catalystReductionKJ;
  const catalyzedReverseKJ = reverseActivationKJ - normalized.catalystReductionKJ;
  const uncatalyzed = arrheniusState(normalized.activationKJ, normalized.preExponentialPerS, normalized.temperatureK);
  const catalyzed = arrheniusState(catalyzedForwardKJ, normalized.preExponentialPerS, normalized.temperatureK);
  const accelerationExponent = normalized.catalystReductionKJ * 1000 / (GAS_CONSTANT_J * normalized.temperatureK);
  const rateAcceleration = safeExponential(accelerationExponent);
  const maximumTimeS = Number.isFinite(uncatalyzed.halfLifeS) && uncatalyzed.halfLifeS > 0
    ? uncatalyzed.halfLifeS * 6
    : 1;
  const kinetics = {
    uncatalyzed: {...uncatalyzed,reverseActivationKJ,speedLabel:speedLabel(uncatalyzed.halfLifeS)},
    catalyzed: {...catalyzed,reverseActivationKJ:catalyzedReverseKJ,speedLabel:speedLabel(catalyzed.halfLifeS)},
    catalystReductionKJ: normalized.catalystReductionKJ,
    rateAcceleration,
    maximumTimeS,
    traces: {
      uncatalyzed: firstOrderTrace(uncatalyzed.rateConstantPerS,maximumTimeS),
      catalyzed: firstOrderTrace(catalyzed.rateConstantPerS,maximumTimeS),
    },
    equation: {
      label: 'Arrhenius first-order kinetics',
      expression: 'k = A exp(−Ea / RT);  [R]t/[R]0 = exp(−kt)',
      detail: 'The same prefactor is used to isolate the effect of barrier height and temperature.',
    },
  };

  return {
    ...baseResult,
    kinetics,
    coordinate: {
      reactantEnergyKJ: 0,
      productEnergyKJ: normalized.deltaHkJ,
      transitionEnergyKJ: normalized.activationKJ,
      catalyzedTransitionEnergyKJ: catalyzedForwardKJ,
      forwardActivationKJ: normalized.activationKJ,
      reverseActivationKJ,
      catalyzedForwardKJ,
      catalyzedReverseKJ,
    },
    catalystStatement: normalized.catalystReductionKJ > 0
      ? `The catalyst changes k by ×${Number.isFinite(rateAcceleration)?rateAcceleration.toPrecision(3):'∞'} while ΔG° and K remain unchanged.`
      : 'No catalyst lowering is applied. ΔG° and K still describe equilibrium, not speed.',
  };
}

export const THERMOKINETIC_CONSTANTS = {
  gasConstantJ: GAS_CONSTANT_J,
  assumptions: MODEL_ASSUMPTIONS,
};
