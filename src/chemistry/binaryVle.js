import {
  BINARY_VLE_MODEL_BOUNDARY,
  BINARY_VLE_PAIR_BY_ID,
  VLE_COMPONENT_BY_ID,
} from '../data/binaryVleScenarios.js';

const CLASSIFICATION_TOLERANCE = 1e-8;
const ROOT_TOLERANCE_K = 1e-9;
const ROOT_RESIDUAL_TOLERANCE_BAR = 1e-12;
const MAX_ROOT_ITERATIONS = 100;
const FLOATING_RESIDUE = 1e-12;

const REGION_META = Object.freeze({
  liquid: Object.freeze({
    id: 'liquid',
    label: 'Single liquid phase',
    shortLabel: 'Liquid',
  }),
  'bubble-point': Object.freeze({
    id: 'bubble-point',
    label: 'Bubble-point boundary',
    shortLabel: 'Bubble point',
  }),
  'two-phase': Object.freeze({
    id: 'two-phase',
    label: 'Liquid + vapour equilibrium',
    shortLabel: 'Two phase',
  }),
  'dew-point': Object.freeze({
    id: 'dew-point',
    label: 'Dew-point boundary',
    shortLabel: 'Dew point',
  }),
  vapour: Object.freeze({
    id: 'vapour',
    label: 'Single vapour phase',
    shortLabel: 'Vapour',
  }),
});

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
}

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

function integerAtLeast(value, minimum, label) {
  const number = finiteNumber(value, label);
  if (!Number.isInteger(number) || number < minimum) {
    throw new RangeError(`${label} must be an integer of at least ${minimum}.`);
  }
  return number;
}

function amountFraction(value, label) {
  const number = finiteNumber(value, label);
  if (number < 0 || number > 1) throw new RangeError(`${label} amount fraction must be between 0 and 1.`);
  return number;
}

function pairById(pairId) {
  const pair = BINARY_VLE_PAIR_BY_ID[pairId];
  if (!pair) throw new RangeError(`Unknown binary VLE pair: ${pairId}.`);
  return pair;
}

function componentById(componentId) {
  const component = VLE_COMPONENT_BY_ID[componentId];
  if (!component) throw new RangeError(`Unknown VLE component: ${componentId}.`);
  return component;
}

function normaliseEndpointResidue(value, minimum, maximum) {
  if (value < minimum && minimum - value <= FLOATING_RESIDUE) return minimum;
  if (value > maximum && value - maximum <= FLOATING_RESIDUE) return maximum;
  return value;
}

function clampUnitResidue(value) {
  if (value < 0 && value >= -FLOATING_RESIDUE) return 0;
  if (value > 1 && value <= 1 + FLOATING_RESIDUE) return 1;
  return value;
}

function purePressure(componentId, temperatureK) {
  return antoineVapourPressureBar({ componentId, temperatureK }).pressureBar;
}

function pairContext(pairId, temperatureK) {
  const pair = pairById(pairId);
  const temperature = finiteNumber(temperatureK, 'Temperature');
  const { minimum, maximum } = pair.validTemperatureK;
  if (temperature < minimum || temperature > maximum) {
    throw new RangeError(`Temperature must stay within the shared Antoine range ${minimum}–${maximum} K for ${pair.name}.`);
  }
  const component1 = componentById(pair.component1Id);
  const component2 = componentById(pair.component2Id);
  const pressure1Bar = purePressure(component1.id, temperature);
  const pressure2Bar = purePressure(component2.id, temperature);
  if (pressure1Bar <= pressure2Bar) {
    throw new RangeError(`The declared component-1 volatility ordering is not valid at ${temperature} K.`);
  }
  return { pair, component1, component2, temperatureK: temperature, pressure1Bar, pressure2Bar };
}

export function antoineVapourPressureBar({ componentId, temperatureK }) {
  const component = componentById(componentId);
  const temperature = finiteNumber(temperatureK, 'Temperature');
  const { minimum, maximum } = component.validTemperatureK;
  if (temperature < minimum || temperature > maximum) {
    throw new RangeError(`Temperature must stay within the Antoine range ${minimum}–${maximum} K for ${component.name}.`);
  }
  const { A, B, C } = component.antoine;
  const pressureBar = 10 ** (A - B / (temperature + C));
  return deepFreeze({
    componentId: component.id,
    componentName: component.name,
    temperatureK: temperature,
    pressureBar,
    coefficients: { A, B, C },
    validTemperatureK: { ...component.validTemperatureK },
    equation: 'log10(p/bar) = A - B/(T/K + C)',
    sourceId: component.sourceId,
    resultKind: 'Ranged pure-component vapour-pressure correlation',
  });
}

export function antoineTemperatureK({ componentId, pressureBar }) {
  const component = componentById(componentId);
  const pressure = positiveNumber(pressureBar, 'Pressure');
  const { A, B, C } = component.antoine;
  const denominator = A - Math.log10(pressure);
  if (denominator <= 0) {
    throw new RangeError(`Pressure is outside the invertible Antoine range for ${component.name}.`);
  }
  const rawTemperature = B / denominator - C;
  const { minimum, maximum } = component.validTemperatureK;
  const temperatureK = normaliseEndpointResidue(rawTemperature, minimum, maximum);
  if (temperatureK < minimum || temperatureK > maximum) {
    throw new RangeError(`The implied temperature ${rawTemperature.toFixed(4)} K is outside the Antoine range ${minimum}–${maximum} K for ${component.name}.`);
  }
  return deepFreeze({
    componentId: component.id,
    componentName: component.name,
    temperatureK,
    pressureBar: pressure,
    coefficients: { A, B, C },
    validTemperatureK: { ...component.validTemperatureK },
    equation: 'T/K = B/(A - log10(p/bar)) - C',
    sourceId: component.sourceId,
    resultKind: 'Analytical inversion of a ranged pure-component correlation',
  });
}

export function binaryPressureWindow(pairId) {
  const pair = pairById(pairId);
  const { minimum, maximum } = pair.validTemperatureK;
  const component1 = componentById(pair.component1Id);
  const component2 = componentById(pair.component2Id);
  const minimumBar = Math.max(
    purePressure(component1.id, minimum),
    purePressure(component2.id, minimum),
  );
  const maximumBar = Math.min(
    purePressure(component1.id, maximum),
    purePressure(component2.id, maximum),
  );
  if (!(maximumBar > minimumBar)) {
    throw new RangeError(`${pair.name} has no shared pressure window for bounded T-x-y roots.`);
  }
  const volatilityEvidence = [minimum, (minimum + maximum) / 2, maximum].map((temperatureK) => {
    const pressure1Bar = purePressure(component1.id, temperatureK);
    const pressure2Bar = purePressure(component2.id, temperatureK);
    if (pressure1Bar <= pressure2Bar) {
      throw new RangeError(`Component 1 is not more volatile across the declared ${pair.name} range.`);
    }
    return { temperatureK, pressure1Bar, pressure2Bar, ratio: pressure1Bar / pressure2Bar };
  });
  return deepFreeze({
    pairId: pair.id,
    minimumBar,
    maximumBar,
    validTemperatureK: { ...pair.validTemperatureK },
    volatilityEvidence,
    reason: 'This interval keeps every pure endpoint and every binary bubble/dew root inside both selected Antoine records.',
  });
}

export function idealBubblePressureBar({ pairId, temperatureK, x1 }) {
  const liquidFraction1 = amountFraction(x1, 'Liquid component-1');
  const context = pairContext(pairId, temperatureK);
  const component1Bar = liquidFraction1 * context.pressure1Bar;
  const component2Bar = (1 - liquidFraction1) * context.pressure2Bar;
  const pressureBar = component1Bar + component2Bar;
  return deepFreeze({
    pairId: context.pair.id,
    temperatureK: context.temperatureK,
    x1: liquidFraction1,
    pressureBar,
    purePressure1Bar: context.pressure1Bar,
    purePressure2Bar: context.pressure2Bar,
    partialPressures: {
      component1Bar,
      component2Bar,
      sumBar: component1Bar + component2Bar,
      closureBar: component1Bar + component2Bar - pressureBar,
    },
    equation: 'pBubble = x1 p1* + (1 - x1) p2*',
    model: 'Ideal-liquid and ideal-vapour Raoult boundary',
  });
}

export function idealDewPressureBar({ pairId, temperatureK, y1 }) {
  const vapourFraction1 = amountFraction(y1, 'Vapour component-1');
  const context = pairContext(pairId, temperatureK);
  const denominator = vapourFraction1 / context.pressure1Bar
    + (1 - vapourFraction1) / context.pressure2Bar;
  const pressureBar = 1 / denominator;
  const component1Bar = vapourFraction1 * pressureBar;
  const component2Bar = (1 - vapourFraction1) * pressureBar;
  return deepFreeze({
    pairId: context.pair.id,
    temperatureK: context.temperatureK,
    y1: vapourFraction1,
    pressureBar,
    purePressure1Bar: context.pressure1Bar,
    purePressure2Bar: context.pressure2Bar,
    vapourPartialPressures: {
      component1Bar,
      component2Bar,
      sumBar: component1Bar + component2Bar,
      closureBar: component1Bar + component2Bar - pressureBar,
    },
    equation: '1/pDew = y1/p1* + (1 - y1)/p2*',
    model: 'Ideal-liquid and ideal-vapour Raoult boundary',
  });
}

function solveTemperature({ pairId, pressureBar, fraction1, kind }) {
  const pair = pairById(pairId);
  const pressure = positiveNumber(pressureBar, 'Pressure');
  const fraction = amountFraction(fraction1, kind === 'bubble' ? 'Liquid component-1' : 'Vapour component-1');
  const window = binaryPressureWindow(pair.id);
  if (pressure < window.minimumBar || pressure > window.maximumBar) {
    throw new RangeError(`Pressure must stay within the bounded T-x-y pressure window ${window.minimumBar.toFixed(6)}–${window.maximumBar.toFixed(6)} bar for ${pair.name}.`);
  }
  const evaluate = (temperatureK) => {
    const result = kind === 'bubble'
      ? idealBubblePressureBar({ pairId: pair.id, temperatureK, x1: fraction })
      : idealDewPressureBar({ pairId: pair.id, temperatureK, y1: fraction });
    return result.pressureBar - pressure;
  };
  let lower = pair.validTemperatureK.minimum;
  let upper = pair.validTemperatureK.maximum;
  let lowerResidual = evaluate(lower);
  let upperResidual = evaluate(upper);
  if (lowerResidual > ROOT_RESIDUAL_TOLERANCE_BAR || upperResidual < -ROOT_RESIDUAL_TOLERANCE_BAR) {
    throw new RangeError(`The selected pressure does not bracket a ${kind} root inside the shared Antoine range.`);
  }
  if (Math.abs(lowerResidual) <= ROOT_RESIDUAL_TOLERANCE_BAR) {
    return { temperatureK: lower, residualBar: lowerResidual, iterations: 0, lowerK: lower, upperK: upper };
  }
  if (Math.abs(upperResidual) <= ROOT_RESIDUAL_TOLERANCE_BAR) {
    return { temperatureK: upper, residualBar: upperResidual, iterations: 0, lowerK: lower, upperK: upper };
  }
  let temperatureK = (lower + upper) / 2;
  let residualBar = evaluate(temperatureK);
  let iterations = 0;
  for (iterations = 1; iterations <= MAX_ROOT_ITERATIONS; iterations += 1) {
    temperatureK = (lower + upper) / 2;
    residualBar = evaluate(temperatureK);
    if (Math.abs(residualBar) <= ROOT_RESIDUAL_TOLERANCE_BAR || upper - lower <= ROOT_TOLERANCE_K) break;
    if (residualBar > 0) {
      upper = temperatureK;
      upperResidual = residualBar;
    } else {
      lower = temperatureK;
      lowerResidual = residualBar;
    }
  }
  return { temperatureK, residualBar, iterations, lowerK: lower, upperK: upper };
}

export function idealBubbleTemperatureK({ pairId, pressureBar, x1 }) {
  const pair = pairById(pairId);
  const pressure = positiveNumber(pressureBar, 'Pressure');
  const liquidFraction1 = amountFraction(x1, 'Liquid component-1');
  const root = solveTemperature({ pairId: pair.id, pressureBar: pressure, fraction1: liquidFraction1, kind: 'bubble' });
  return deepFreeze({
    pairId: pair.id,
    pressureBar: pressure,
    x1: liquidFraction1,
    ...root,
    validTemperatureK: { ...pair.validTemperatureK },
    equation: 'p = x1 p1*(T) + (1 - x1) p2*(T)',
    method: 'Bounded bisection inside the shared Antoine range',
  });
}

export function idealDewTemperatureK({ pairId, pressureBar, y1 }) {
  const pair = pairById(pairId);
  const pressure = positiveNumber(pressureBar, 'Pressure');
  const vapourFraction1 = amountFraction(y1, 'Vapour component-1');
  const root = solveTemperature({ pairId: pair.id, pressureBar: pressure, fraction1: vapourFraction1, kind: 'dew' });
  return deepFreeze({
    pairId: pair.id,
    pressureBar: pressure,
    y1: vapourFraction1,
    ...root,
    validTemperatureK: { ...pair.validTemperatureK },
    equation: '1/p = y1/p1*(T) + (1 - y1)/p2*(T)',
    method: 'Bounded bisection inside the shared Antoine range',
  });
}

function classifyRegion(pressureBar, bubblePressureBar, dewPressureBar) {
  const toleranceBar = CLASSIFICATION_TOLERANCE
    * Math.max(1, Math.abs(pressureBar), Math.abs(bubblePressureBar), Math.abs(dewPressureBar));
  let id;
  if (pressureBar > bubblePressureBar + toleranceBar) id = 'liquid';
  else if (Math.abs(pressureBar - bubblePressureBar) <= toleranceBar) id = 'bubble-point';
  else if (pressureBar > dewPressureBar + toleranceBar) id = 'two-phase';
  else if (Math.abs(pressureBar - dewPressureBar) <= toleranceBar) id = 'dew-point';
  else id = 'vapour';
  const reasons = {
    liquid: 'Pressure is above the bubble boundary at this temperature and overall amount fraction.',
    'bubble-point': 'Pressure matches the bubble boundary within the declared numerical tolerance; the first infinitesimal vapour is possible.',
    'two-phase': 'Pressure lies between the dew and bubble boundaries, so liquid and vapour coexist in this ideal equilibrium model.',
    'dew-point': 'Pressure matches the dew boundary within the declared numerical tolerance; the last infinitesimal liquid is possible.',
    vapour: 'Pressure is below the dew boundary at this temperature and overall amount fraction.',
  };
  return deepFreeze({ ...REGION_META[id], reason: reasons[id], toleranceBar });
}

function onePhaseEquilibrium(regionId, overallFraction1) {
  if (regionId === 'liquid') {
    return deepFreeze({
      liquidAmountFraction1: overallFraction1,
      vapourAmountFraction1: null,
      liquidFraction: 1,
      vapourFraction: 0,
      tieLineAvailable: false,
      phaseAmountMeaning: 'The overall amount fraction is the single present liquid composition; no equilibrium vapour composition is asserted.',
    });
  }
  return deepFreeze({
    liquidAmountFraction1: null,
    vapourAmountFraction1: overallFraction1,
    liquidFraction: 0,
    vapourFraction: 1,
    tieLineAvailable: false,
    phaseAmountMeaning: 'The overall amount fraction is the single present vapour composition; no equilibrium liquid composition is asserted.',
  });
}

function twoPhaseEquilibrium({ regionId, overallFraction1, pressureBar, bubblePressureBar, dewPressureBar, pressure1Bar, pressure2Bar }) {
  const equilibriumPressureBar = regionId === 'bubble-point'
    ? bubblePressureBar
    : regionId === 'dew-point'
      ? dewPressureBar
      : pressureBar;
  let liquidAmountFraction1 = regionId === 'bubble-point'
    ? overallFraction1
    : (equilibriumPressureBar - pressure2Bar) / (pressure1Bar - pressure2Bar);
  let vapourAmountFraction1 = regionId === 'dew-point'
    ? overallFraction1
    : liquidAmountFraction1 * pressure1Bar / equilibriumPressureBar;
  liquidAmountFraction1 = clampUnitResidue(liquidAmountFraction1);
  vapourAmountFraction1 = clampUnitResidue(vapourAmountFraction1);
  const tieLineWidth = vapourAmountFraction1 - liquidAmountFraction1;
  const degeneratePureEndpoint = Math.abs(tieLineWidth) <= FLOATING_RESIDUE;
  let vapourFraction;
  if (regionId === 'bubble-point') vapourFraction = 0;
  else if (regionId === 'dew-point') vapourFraction = 1;
  else {
    if (degeneratePureEndpoint) {
      throw new RangeError('A two-phase amount split is indeterminate at a pure-component endpoint.');
    }
    vapourFraction = clampUnitResidue((overallFraction1 - liquidAmountFraction1) / tieLineWidth);
  }
  const liquidFraction = 1 - vapourFraction;
  if (
    liquidAmountFraction1 < 0 || liquidAmountFraction1 > 1
    || vapourAmountFraction1 < 0 || vapourAmountFraction1 > 1
    || liquidFraction < 0 || liquidFraction > 1
    || vapourFraction < 0 || vapourFraction > 1
  ) {
    throw new RangeError('The equilibrium or phase amount falls outside the binary amount-fraction bounds.');
  }
  return deepFreeze({
    liquidAmountFraction1,
    vapourAmountFraction1,
    liquidFraction,
    vapourFraction,
    tieLineAvailable: !degeneratePureEndpoint,
    degeneratePureEndpoint,
    equilibriumPressureBar,
    phaseAmountMeaning: 'L and V are equilibrium phase amount fractions from L + V = 1 and z1 = Lx1 + Vy1; they are not rates.',
  });
}

export function analyzeBinaryVle({
  pairId = 'benzene-toluene',
  temperatureK = 353.15,
  pressureBar = 0.63,
  overallFraction1 = 0.5,
}) {
  const pressure = positiveNumber(pressureBar, 'Total pressure');
  const z1 = amountFraction(overallFraction1, 'Overall component-1');
  const context = pairContext(pairId, temperatureK);
  const bubble = idealBubblePressureBar({ pairId: context.pair.id, temperatureK: context.temperatureK, x1: z1 });
  const dew = idealDewPressureBar({ pairId: context.pair.id, temperatureK: context.temperatureK, y1: z1 });
  const region = classifyRegion(pressure, bubble.pressureBar, dew.pressureBar);
  const equilibrium = region.id === 'liquid' || region.id === 'vapour'
    ? onePhaseEquilibrium(region.id, z1)
    : twoPhaseEquilibrium({
      regionId: region.id,
      overallFraction1: z1,
      pressureBar: pressure,
      bubblePressureBar: bubble.pressureBar,
      dewPressureBar: dew.pressureBar,
      pressure1Bar: context.pressure1Bar,
      pressure2Bar: context.pressure2Bar,
    });
  let partialPressures = null;
  let balances = null;
  if (equilibrium.liquidAmountFraction1 !== null && equilibrium.vapourAmountFraction1 !== null) {
    const component1FromLiquidBar = equilibrium.liquidAmountFraction1 * context.pressure1Bar;
    const component2FromLiquidBar = (1 - equilibrium.liquidAmountFraction1) * context.pressure2Bar;
    const component1FromVapourBar = equilibrium.vapourAmountFraction1 * equilibrium.equilibriumPressureBar;
    const component2FromVapourBar = (1 - equilibrium.vapourAmountFraction1) * equilibrium.equilibriumPressureBar;
    const sumBar = component1FromLiquidBar + component2FromLiquidBar;
    partialPressures = deepFreeze({
      component1FromLiquidBar,
      component1FromVapourBar,
      component1ClosureBar: component1FromLiquidBar - component1FromVapourBar,
      component2FromLiquidBar,
      component2FromVapourBar,
      component2ClosureBar: component2FromLiquidBar - component2FromVapourBar,
      sumBar,
      totalClosureBar: sumBar - equilibrium.equilibriumPressureBar,
      inputPressureOffsetBar: pressure - equilibrium.equilibriumPressureBar,
      equation: 'p1 = x1 p1* = y1 p; p2 = x2 p2* = y2 p; p = p1 + p2',
    });
    const reconstructedOverallFraction1 = equilibrium.liquidFraction * equilibrium.liquidAmountFraction1
      + equilibrium.vapourFraction * equilibrium.vapourAmountFraction1;
    balances = deepFreeze({
      phaseFractionSum: equilibrium.liquidFraction + equilibrium.vapourFraction,
      phaseFractionClosure: equilibrium.liquidFraction + equilibrium.vapourFraction - 1,
      reconstructedOverallFraction1,
      component1Closure: reconstructedOverallFraction1 - z1,
      equation: 'L + V = 1; z1 = Lx1 + Vy1',
    });
  }
  return deepFreeze({
    resultKind: 'Computed ideal binary Raoult equilibrium — not measured mixture behaviour',
    pair: context.pair,
    component1: context.component1,
    component2: context.component2,
    input: {
      pairId: context.pair.id,
      temperatureK: context.temperatureK,
      pressureBar: pressure,
      overallFraction1: z1,
    },
    pure: {
      component1PressureBar: context.pressure1Bar,
      component2PressureBar: context.pressure2Bar,
      component1IsMoreVolatile: context.pressure1Bar > context.pressure2Bar,
    },
    boundaries: {
      bubblePressureBar: bubble.pressureBar,
      dewPressureBar: dew.pressureBar,
      twoPhaseWidthBar: bubble.pressureBar - dew.pressureBar,
    },
    region,
    equilibrium,
    partialPressures,
    balances,
    modelBoundary: BINARY_VLE_MODEL_BOUNDARY,
  });
}

export function createPxyDiagram({ pairId = 'benzene-toluene', temperatureK, pointCount = 101 }) {
  const pair = pairById(pairId);
  const temperature = finiteNumber(temperatureK ?? pair.defaultPxyTemperatureK, 'Temperature');
  pairContext(pair.id, temperature);
  const count = integerAtLeast(pointCount, 3, 'Point count');
  const bubble = [];
  const dew = [];
  for (let index = 0; index < count; index += 1) {
    const fraction = index / (count - 1);
    const bubbleResult = idealBubblePressureBar({ pairId: pair.id, temperatureK: temperature, x1: fraction });
    const dewResult = idealDewPressureBar({ pairId: pair.id, temperatureK: temperature, y1: fraction });
    bubble.push({ x1: fraction, pressureBar: bubbleResult.pressureBar });
    dew.push({ y1: fraction, pressureBar: dewResult.pressureBar });
  }
  const pressures = [...bubble, ...dew].map((point) => point.pressureBar);
  return deepFreeze({
    mode: 'pxy',
    pair,
    temperatureK: temperature,
    bubble,
    dew,
    pressureRangeBar: { minimum: Math.min(...pressures), maximum: Math.max(...pressures) },
    amountFractionRange: { minimum: 0, maximum: 1 },
    modelBoundary: BINARY_VLE_MODEL_BOUNDARY,
  });
}

export function createTxyDiagram({ pairId = 'benzene-toluene', pressureBar, pointCount = 81 }) {
  const pair = pairById(pairId);
  const pressure = positiveNumber(pressureBar ?? pair.defaultTxyPressureBar, 'Pressure');
  const window = binaryPressureWindow(pair.id);
  if (pressure < window.minimumBar || pressure > window.maximumBar) {
    throw new RangeError(`Pressure must stay within the bounded T-x-y pressure window ${window.minimumBar.toFixed(6)}–${window.maximumBar.toFixed(6)} bar for ${pair.name}.`);
  }
  const count = integerAtLeast(pointCount, 3, 'Point count');
  const bubble = [];
  const dew = [];
  for (let index = 0; index < count; index += 1) {
    const fraction = index / (count - 1);
    const bubbleResult = idealBubbleTemperatureK({ pairId: pair.id, pressureBar: pressure, x1: fraction });
    const dewResult = idealDewTemperatureK({ pairId: pair.id, pressureBar: pressure, y1: fraction });
    bubble.push({ x1: fraction, temperatureK: bubbleResult.temperatureK, residualBar: bubbleResult.residualBar });
    dew.push({ y1: fraction, temperatureK: dewResult.temperatureK, residualBar: dewResult.residualBar });
  }
  const temperatures = [...bubble, ...dew].map((point) => point.temperatureK);
  return deepFreeze({
    mode: 'txy',
    pair,
    pressureBar: pressure,
    bubble,
    dew,
    temperatureRangeK: { minimum: Math.min(...temperatures), maximum: Math.max(...temperatures) },
    boundedPressureWindow: window,
    amountFractionRange: { minimum: 0, maximum: 1 },
    modelBoundary: BINARY_VLE_MODEL_BOUNDARY,
  });
}

export function createDefaultBinaryVleState({ pairId = 'benzene-toluene', mode = 'pxy' } = {}) {
  const pair = pairById(pairId);
  if (!['pxy', 'txy'].includes(mode)) throw new RangeError('Mode must be pxy or txy.');
  const overallFraction1 = pair.defaultOverallFraction1;
  if (mode === 'pxy') {
    const temperatureK = pair.defaultPxyTemperatureK;
    const bubble = idealBubblePressureBar({ pairId: pair.id, temperatureK, x1: overallFraction1 });
    const dew = idealDewPressureBar({ pairId: pair.id, temperatureK, y1: overallFraction1 });
    return deepFreeze({
      mode,
      pairId: pair.id,
      temperatureK,
      pressureBar: (bubble.pressureBar + dew.pressureBar) / 2,
      overallFraction1,
    });
  }
  const pressureBar = pair.defaultTxyPressureBar;
  const bubble = idealBubbleTemperatureK({ pairId: pair.id, pressureBar, x1: overallFraction1 });
  const dew = idealDewTemperatureK({ pairId: pair.id, pressureBar, y1: overallFraction1 });
  return deepFreeze({
    mode,
    pairId: pair.id,
    temperatureK: (bubble.temperatureK + dew.temperatureK) / 2,
    pressureBar,
    overallFraction1,
  });
}

export function evaluateBinaryVlePrediction({ analysis, prediction }) {
  if (!analysis?.region?.id || !analysis?.equilibrium) throw new TypeError('A binary VLE analysis is required.');
  if (!prediction || typeof prediction !== 'object') throw new TypeError('A learner prediction is required.');
  const allowedRegions = Object.keys(REGION_META);
  if (!allowedRegions.includes(prediction.region)) {
    throw new RangeError(`Region prediction must be one of: ${allowedRegions.join(', ')}.`);
  }
  const allowedEnrichment = ['vapour-richer-in-component-1', 'not-comparable'];
  if (!allowedEnrichment.includes(prediction.enrichment)) {
    throw new RangeError('Enrichment prediction must identify component-1 vapour enrichment or not-comparable.');
  }
  if (prediction.vapourFraction === '' || prediction.vapourFraction === null || prediction.vapourFraction === undefined) {
    throw new TypeError('Vapour-fraction prediction must be a finite number.');
  }
  const predictedVapourFraction = finiteNumber(prediction.vapourFraction, 'Vapour-fraction prediction');
  const expectedEnrichment = analysis.equilibrium.tieLineAvailable
    ? 'vapour-richer-in-component-1'
    : 'not-comparable';
  const expectedVapourFraction = analysis.equilibrium.vapourFraction;
  const regionCorrect = prediction.region === analysis.region.id;
  const enrichmentCorrect = prediction.enrichment === expectedEnrichment;
  const vapourFractionCorrect = Math.abs(predictedVapourFraction - expectedVapourFraction) <= 0.02;
  const learnerPrediction = deepFreeze({
    region: prediction.region,
    enrichment: prediction.enrichment,
    vapourFraction: prediction.vapourFraction,
  });
  const dimensions = deepFreeze({
    region: {
      correct: regionCorrect,
      expected: analysis.region.id,
      reason: regionCorrect
        ? `The selected state is in the ${analysis.region.label.toLowerCase()}.`
        : `You kept ${prediction.region}; compare p = ${analysis.input.pressureBar.toFixed(5)} bar with pBubble = ${analysis.boundaries.bubblePressureBar.toFixed(5)} bar and pDew = ${analysis.boundaries.dewPressureBar.toFixed(5)} bar.`,
    },
    enrichment: {
      correct: enrichmentCorrect,
      expected: expectedEnrichment,
      reason: expectedEnrichment === 'vapour-richer-in-component-1'
        ? `At this tie line y1 = ${analysis.equilibrium.vapourAmountFraction1.toFixed(4)} is greater than x1 = ${analysis.equilibrium.liquidAmountFraction1.toFixed(4)} because p1* > p2*.`
        : 'There is no non-degenerate liquid-vapour tie line in this state, so phase enrichment is not comparable.',
    },
    vapourFraction: {
      correct: vapourFractionCorrect,
      expected: expectedVapourFraction,
      tolerance: 0.02,
      reason: `The amount-balance result is V = ${expectedVapourFraction.toFixed(4)}; your raw prediction remains ${String(prediction.vapourFraction)}.`,
    },
  });
  return deepFreeze({
    learnerPrediction,
    expected: {
      region: analysis.region.id,
      enrichment: expectedEnrichment,
      vapourFraction: expectedVapourFraction,
    },
    dimensions,
    allCorrect: regionCorrect && enrichmentCorrect && vapourFractionCorrect,
    analysis,
  });
}

export function nextBinaryVleHint({ analysis, level = 1 }) {
  if (!analysis?.region?.id || !analysis?.input) throw new TypeError('A binary VLE analysis is required.');
  const safeLevel = Math.max(1, Math.min(4, Math.trunc(finiteNumber(level, 'Hint level'))));
  const { component1, component2, pure, boundaries, input, equilibrium } = analysis;
  if (safeLevel === 1) {
    return `${component1.name} has p1* = ${pure.component1PressureBar.toFixed(4)} bar, while ${component2.name} has p2* = ${pure.component2PressureBar.toFixed(4)} bar. Identify the more volatile component before comparing phases.`;
  }
  if (safeLevel === 2) {
    return `At z1 = ${input.overallFraction1.toFixed(3)}, the bubble boundary is ${boundaries.bubblePressureBar.toFixed(4)} bar and the dew boundary is ${boundaries.dewPressureBar.toFixed(4)} bar.`;
  }
  if (safeLevel === 3) {
    return `Place p = ${input.pressureBar.toFixed(4)} bar relative to the two boundaries: above bubble is liquid, between them is two phase, and below dew is vapour.`;
  }
  if (equilibrium.tieLineAvailable) {
    return `The equilibrium tie line gives x1 = ${equilibrium.liquidAmountFraction1.toFixed(4)} and y1 = ${equilibrium.vapourAmountFraction1.toFixed(4)}. Use z1 = Lx1 + Vy1 with L + V = 1; this gives V = ${equilibrium.vapourFraction.toFixed(4)}.`;
  }
  return `This is a single-phase or degenerate pure-endpoint state: the present phase has the overall composition z1 = ${input.overallFraction1.toFixed(4)}, and a two-phase lever-rule comparison is not available.`;
}
