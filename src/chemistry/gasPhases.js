import {
  GAS_LAW_EXPERIMENTS,
  WATER_PHASE_MODEL,
  gasPresetById,
} from '../data/gasPhaseScenarios.js';

export const GAS_CONSTANT_L_BAR = 0.0831446261815324;
const DIRECTION_TOLERANCE = 1e-10;
const PHASE_TOLERANCE = 0.02;

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
  if (!Number.isInteger(number) || number < minimum) throw new RangeError(`${label} must be an integer of at least ${minimum}.`);
  return number;
}

function directionBetween(next, baseline) {
  const scale = Math.max(1, Math.abs(next), Math.abs(baseline));
  if (Math.abs(next - baseline) <= DIRECTION_TOLERANCE * scale) return 'same';
  return next > baseline ? 'increase' : 'decrease';
}

function directionWord(direction) {
  return direction === 'increase' ? 'increases' : direction === 'decrease' ? 'decreases' : 'stays the same';
}

export function idealGasPressureBar({amountMol, volumeL, temperatureK}) {
  const n = positiveNumber(amountMol, 'Amount');
  const volume = positiveNumber(volumeL, 'Volume');
  const temperature = positiveNumber(temperatureK, 'Temperature');
  return n * GAS_CONSTANT_L_BAR * temperature / volume;
}

export function deriveVanDerWaalsParameters({criticalTemperatureK, criticalPressureBar}) {
  const criticalTemperature = positiveNumber(criticalTemperatureK, 'Critical temperature');
  const criticalPressure = positiveNumber(criticalPressureBar, 'Critical pressure');
  const aL2BarMol2 = 27 * GAS_CONSTANT_L_BAR ** 2 * criticalTemperature ** 2 / (64 * criticalPressure);
  const bLmol = GAS_CONSTANT_L_BAR * criticalTemperature / (8 * criticalPressure);
  return Object.freeze({
    aL2BarMol2,
    bLmol,
    criticalMolarVolumeLmol: 3 * bLmol,
    criticalTemperatureK: criticalTemperature,
    criticalPressureBar: criticalPressure,
    derivation: 'a = 27R²Tc²/(64Pc); b = RTc/(8Pc)',
  });
}

function classifyCompressionFactor(value) {
  if (value < 0.98) return Object.freeze({id:'attraction', label:'Attraction-dominant departure', reason:'Z is below one: the cubic attraction subtraction lowers pressure relative to the ideal model.'});
  if (value > 1.02) return Object.freeze({id:'excluded-volume', label:'Excluded-volume-dominant departure', reason:'Z is above one: the available-volume correction raises pressure more than the attraction term lowers it.'});
  return Object.freeze({id:'near-ideal', label:'Near-ideal window', reason:'Z lies within two percent of one for this teaching comparison.'});
}

export function analyzeGasState({gasId='carbon-dioxide', amountMol=1, volumeL=1, temperatureK=320}) {
  const preset = gasPresetById(gasId);
  if (!preset) throw new RangeError(`Unknown gas preset: ${gasId}.`);
  const input = Object.freeze({
    gasId: preset.id,
    amountMol: positiveNumber(amountMol, 'Amount'),
    volumeL: positiveNumber(volumeL, 'Volume'),
    temperatureK: positiveNumber(temperatureK, 'Temperature'),
  });
  const idealPressure = idealGasPressureBar(input);
  const ideal = Object.freeze({
    pressureBar: idealPressure,
    compressionFactor: 1,
    equation: 'p = nRT/V',
  });

  if (!preset.critical) {
    return Object.freeze({
      status: 'valid',
      resultKind: 'Exact ideal-gas algebra — not a real-fluid property',
      preset,
      input,
      molarVolumeLmol: input.volumeL / input.amountMol,
      ideal,
      real: null,
      boundary: preset.boundary,
    });
  }

  const parameters = deriveVanDerWaalsParameters({
    criticalTemperatureK: preset.critical.temperatureK,
    criticalPressureBar: preset.critical.pressureBar,
  });
  const excludedVolumeL = input.amountMol * parameters.bLmol;
  const temperatureRatio = input.temperatureK / parameters.criticalTemperatureK;
  const subcritical = temperatureRatio < 1;

  if (input.volumeL <= excludedVolumeL) {
    return Object.freeze({
      status: 'partial',
      resultKind: 'Ideal result available · van der Waals branch blocked',
      preset,
      input,
      molarVolumeLmol: input.volumeL / input.amountMol,
      ideal,
      real: Object.freeze({
        status: 'blocked',
        parameters,
        excludedVolumeL,
        temperatureRatio,
        subcritical,
        reason: `The entered volume ${input.volumeL.toFixed(3)} L is not greater than nb = ${excludedVolumeL.toFixed(3)} L, so V - nb is zero or negative. The learner volume was preserved.`,
      }),
      boundary: preset.boundary,
    });
  }

  const excludedVolumePressureBar = input.amountMol * GAS_CONSTANT_L_BAR * input.temperatureK / (input.volumeL - excludedVolumeL);
  const attractionCorrectionBar = parameters.aL2BarMol2 * (input.amountMol / input.volumeL) ** 2;
  const pressureBar = excludedVolumePressureBar - attractionCorrectionBar;
  const compressionFactor = pressureBar * input.volumeL / (input.amountMol * GAS_CONSTANT_L_BAR * input.temperatureK);
  const nonpositive = pressureBar <= 0;
  const phaseWarning = subcritical
    ? 'T is below Tc. A raw cubic loop or metastable branch is not a liquid-vapour coexistence construction; no Maxwell construction is applied.'
    : 'T is at or above Tc for this critical-derived cubic comparison; this still is not a reference-quality property calculation.';

  return Object.freeze({
    status: nonpositive ? 'partial' : 'valid',
    resultKind: nonpositive ? 'Ideal result available · raw cubic pressure nonpositive' : 'Critical-derived van der Waals teaching comparison',
    preset,
    input,
    molarVolumeLmol: input.volumeL / input.amountMol,
    ideal,
    real: Object.freeze({
      status: nonpositive ? 'nonphysical' : 'valid',
      parameters,
      excludedVolumeL,
      availableVolumeL: input.volumeL - excludedVolumeL,
      excludedVolumePressureBar,
      attractionCorrectionBar,
      pressureBar,
      pressureDifferenceBar: pressureBar - idealPressure,
      compressionFactor,
      deviation: classifyCompressionFactor(compressionFactor),
      temperatureRatio,
      subcritical,
      phaseWarning,
      reason: nonpositive ? 'The raw cubic pressure is zero or negative at this state. That branch is not a physical gas prediction and requires phase-equilibrium treatment outside this model.' : null,
      equation: 'p = nRT/(V - nb) - a(n/V)²',
    }),
    boundary: preset.boundary,
  });
}

export function createIsothermTrace({gasId='carbon-dioxide', temperatureK=320, minimumMolarVolumeLmol, maximumMolarVolumeLmol=30, pointCount=96}) {
  const preset = gasPresetById(gasId);
  if (!preset) throw new RangeError(`Unknown gas preset: ${gasId}.`);
  const temperature = positiveNumber(temperatureK, 'Temperature');
  const pointsRequested = integerAtLeast(pointCount, 8, 'Point count');
  const parameters = preset.critical ? deriveVanDerWaalsParameters({criticalTemperatureK:preset.critical.temperatureK,criticalPressureBar:preset.critical.pressureBar}) : null;
  const minimum = positiveNumber(minimumMolarVolumeLmol ?? (parameters ? Math.max(0.05,parameters.bLmol*1.02) : 0.05), 'Minimum molar volume');
  const maximum = positiveNumber(maximumMolarVolumeLmol, 'Maximum molar volume');
  if (maximum <= minimum) throw new RangeError('Maximum molar volume must exceed the minimum.');
  const logMinimum = Math.log(minimum), logMaximum = Math.log(maximum);
  const points = [];
  for (let index=0; index<pointsRequested; index+=1) {
    const fraction = index/(pointsRequested-1);
    const molarVolumeLmol = Math.exp(logMinimum + fraction*(logMaximum-logMinimum));
    const idealPressureBar = GAS_CONSTANT_L_BAR*temperature/molarVolumeLmol;
    let realPressureBar = null, realStatus = 'not-applicable';
    if (parameters) {
      if (molarVolumeLmol <= parameters.bLmol) realStatus = 'blocked';
      else {
        const raw = GAS_CONSTANT_L_BAR*temperature/(molarVolumeLmol-parameters.bLmol)-parameters.aL2BarMol2/molarVolumeLmol**2;
        realPressureBar = raw > 0 ? raw : null;
        realStatus = raw > 0 ? 'valid' : 'nonphysical';
      }
    }
    points.push(Object.freeze({molarVolumeLmol,idealPressureBar,realPressureBar,realStatus}));
  }
  const validReal = points.filter((point)=>point.realPressureBar !== null);
  let hasRawLoop = false;
  for (let index=1; index<validReal.length; index+=1) {
    if (validReal[index].realPressureBar > validReal[index-1].realPressureBar) {hasRawLoop=true;break;}
  }
  const temperatureRatio = parameters ? temperature/parameters.criticalTemperatureK : null;
  return Object.freeze({
    preset,
    temperatureK: temperature,
    parameters,
    points: Object.freeze(points),
    hasRawLoop,
    temperatureRatio,
    subcritical: temperatureRatio !== null && temperatureRatio < 1,
    phaseWarning: hasRawLoop ? 'The sampled raw van der Waals curve contains a subcritical loop. It is not a coexistence plateau; no Maxwell construction is performed.' : null,
  });
}

export function runGasLawExperiment({lawId, targetValue}) {
  const experiment = GAS_LAW_EXPERIMENTS[lawId];
  if (!experiment) throw new RangeError(`Unknown gas-law experiment: ${lawId}.`);
  const target = positiveNumber(targetValue, experiment.changedLabel);
  const baseline = Object.freeze({
    amountMol: 1,
    temperatureK: 298.15,
    pressureBar: 1,
    volumeL: GAS_CONSTANT_L_BAR*298.15,
  });
  let final;
  let invariantBefore;
  let invariantAfter;
  if (lawId === 'boyle') {
    final = Object.freeze({...baseline,volumeL:target,pressureBar:baseline.amountMol*GAS_CONSTANT_L_BAR*baseline.temperatureK/target});
    invariantBefore = baseline.pressureBar*baseline.volumeL;
    invariantAfter = final.pressureBar*final.volumeL;
  } else if (lawId === 'charles') {
    final = Object.freeze({...baseline,temperatureK:target,volumeL:baseline.amountMol*GAS_CONSTANT_L_BAR*target/baseline.pressureBar});
    invariantBefore = baseline.volumeL/baseline.temperatureK;
    invariantAfter = final.volumeL/final.temperatureK;
  } else {
    final = Object.freeze({...baseline,amountMol:target,volumeL:target*GAS_CONSTANT_L_BAR*baseline.temperatureK/baseline.pressureBar});
    invariantBefore = baseline.volumeL/baseline.amountMol;
    invariantAfter = final.volumeL/final.amountMol;
  }
  const observedBefore = baseline[experiment.observedKey];
  const observedAfter = final[experiment.observedKey];
  const expectedDirection = directionBetween(observedAfter,observedBefore);
  const explanation = lawId === 'boyle'
    ? `At fixed T and n, pV stays constant. Volume ${directionWord(directionBetween(final.volumeL,baseline.volumeL))}, so pressure ${directionWord(expectedDirection)}.`
    : lawId === 'charles'
      ? `At fixed p and n, V/T stays constant. Temperature ${directionWord(directionBetween(final.temperatureK,baseline.temperatureK))}, so volume ${directionWord(expectedDirection)}.`
      : `At fixed p and T, V/n stays constant. Amount ${directionWord(directionBetween(final.amountMol,baseline.amountMol))}, so volume ${directionWord(expectedDirection)}.`;
  return Object.freeze({experiment,baseline,final,targetValue:target,expectedDirection,invariantBefore,invariantAfter,explanation});
}

export function evaluateGasLawPrediction({lawId, targetValue, prediction}) {
  const allowed = ['decrease','same','increase'];
  if (!allowed.includes(prediction)) throw new RangeError('Prediction must be decrease, same, or increase.');
  const result = runGasLawExperiment({lawId,targetValue});
  const correct = prediction === result.expectedDirection;
  return Object.freeze({
    correct,
    learnerPrediction: prediction,
    expectedDirection: result.expectedDirection,
    result,
    title: correct ? 'Prediction matches the ideal model.' : 'Keep your prediction and compare the invariant.',
    reason: correct ? result.explanation : `You chose ${prediction}; the calculated ${result.experiment.observedLabel.toLowerCase()} ${directionWord(result.expectedDirection)}. ${result.explanation}`,
  });
}

export function nextGasLawHint({lawId, targetValue, level=1}) {
  const result = runGasLawExperiment({lawId,targetValue});
  const safeLevel = Math.max(1,Math.min(3,Math.trunc(finiteNumber(level,'Hint level'))));
  if (safeLevel === 1) return `Hold ${result.experiment.eyebrow.replace('Hold ','')} fixed. The invariant is ${result.experiment.invariantLabel}.`;
  if (safeLevel === 2) {
    const before = result.baseline[result.experiment.changedKey];
    const after = result.final[result.experiment.changedKey];
    return `${result.experiment.changedLabel} moves from ${before.toFixed(2)} to ${after.toFixed(2)} ${result.experiment.unit}. Decide what the observed variable must do to keep ${result.experiment.invariantLabel} unchanged.`;
  }
  return lawId === 'boyle' ? 'Use p₂/p₁ = V₁/V₂.' : lawId === 'charles' ? 'Use V₂/V₁ = T₂/T₁.' : 'Use V₂/V₁ = n₂/n₁.';
}

export function waterSaturationPressureBar(temperatureK) {
  const temperature = finiteNumber(temperatureK,'Temperature');
  const {minimum,maximum} = WATER_PHASE_MODEL.validTemperatureK;
  if (temperature < minimum || temperature > maximum) throw new RangeError(`Temperature must stay within the Antoine range ${minimum}–${maximum} K.`);
  const {A,B,C} = WATER_PHASE_MODEL.coefficients;
  return 10 ** (A - B/(temperature+C));
}

export function waterBoilingTemperatureK(externalPressureBar) {
  const pressure = positiveNumber(externalPressureBar,'External pressure');
  const {A,B,C} = WATER_PHASE_MODEL.coefficients;
  const denominator = A-Math.log10(pressure);
  if (denominator <= 0) throw new RangeError('External pressure is outside the invertible Antoine range.');
  const temperature = B/denominator-C;
  const {minimum,maximum} = WATER_PHASE_MODEL.validTemperatureK;
  if (temperature < minimum || temperature > maximum) throw new RangeError(`The implied boiling temperature ${temperature.toFixed(2)} K is outside the Antoine range ${minimum}–${maximum} K.`);
  return temperature;
}

export function createWaterSaturationCurve({minimumTemperatureK=273.15, maximumTemperatureK=373, pointCount=81}={}) {
  const minimum = finiteNumber(minimumTemperatureK,'Minimum temperature');
  const maximum = finiteNumber(maximumTemperatureK,'Maximum temperature');
  const count = integerAtLeast(pointCount,8,'Point count');
  if (maximum <= minimum) throw new RangeError('Maximum temperature must exceed the minimum.');
  return Object.freeze(Array.from({length:count},(_,index)=>{
    const temperatureK = minimum + index/(count-1)*(maximum-minimum);
    return Object.freeze({temperatureK,saturationPressureBar:waterSaturationPressureBar(temperatureK)});
  }));
}

export function analyzeWaterPhase({temperatureK=298.15, externalPressureBar=1, toleranceFraction=PHASE_TOLERANCE}) {
  const temperature = finiteNumber(temperatureK,'Temperature');
  const externalPressure = positiveNumber(externalPressureBar,'External pressure');
  const tolerance = positiveNumber(toleranceFraction,'Tolerance fraction');
  const saturationPressure = waterSaturationPressureBar(temperature);
  const ratio = externalPressure/saturationPressure;
  let tendency;
  if (ratio < 1-tolerance) tendency = 'evaporation';
  else if (ratio > 1+tolerance) tendency = 'condensation';
  else tendency = 'equilibrium';
  const labels = {
    evaporation:'Net evaporation / boiling tendency',
    equilibrium:'Liquid-vapour equilibrium band',
    condensation:'Net condensation / no-boiling tendency',
  };
  const explanations = {
    evaporation:`External pressure is below pSat. A pure-water liquid surface can supply vapour until liquid is depleted or the system pressure changes. This does not predict a rate.`,
    equilibrium:`External pressure is within two percent of pSat. The teaching model marks a dynamic liquid-vapour equilibrium band, not a static molecular picture.`,
    condensation:`External pressure is above pSat. Pure water vapour has a net condensation tendency and a liquid sample does not boil at this temperature. This does not predict a rate.`,
  };
  let boilingTemperatureK = null, boilingRangeReason = null;
  try {boilingTemperatureK = waterBoilingTemperatureK(externalPressure);} catch (error) {boilingRangeReason=error.message;}
  return Object.freeze({
    model: WATER_PHASE_MODEL,
    temperatureK: temperature,
    externalPressureBar: externalPressure,
    saturationPressureBar: saturationPressure,
    pressureRatio: ratio,
    pressureDifferenceBar: externalPressure-saturationPressure,
    tendency,
    label: labels[tendency],
    explanation: explanations[tendency],
    toleranceFraction: tolerance,
    boilingTemperatureK,
    boilingRangeReason,
    resultKind: 'Empirical pure-water saturation comparison — not a phase-rate prediction',
  });
}

export function evaluatePhasePrediction({temperatureK, externalPressureBar, prediction}) {
  const allowed = ['evaporation','equilibrium','condensation'];
  if (!allowed.includes(prediction)) throw new RangeError('Prediction must be evaporation, equilibrium, or condensation.');
  const analysis = analyzeWaterPhase({temperatureK,externalPressureBar});
  const correct = prediction === analysis.tendency;
  return Object.freeze({
    correct,
    learnerPrediction: prediction,
    expectedPrediction: analysis.tendency,
    analysis,
    title: correct ? 'Prediction matches the saturation comparison.' : 'Keep your prediction and compare the two pressures.',
    reason: `${correct?'You matched':'You chose '+prediction+'; the model gives'} ${analysis.label.toLowerCase()}. pExternal = ${analysis.externalPressureBar.toFixed(4)} bar and pSat = ${analysis.saturationPressureBar.toFixed(4)} bar. ${analysis.explanation}`,
  });
}

export function nextPhaseHint({temperatureK,externalPressureBar,level=1}) {
  const analysis = analyzeWaterPhase({temperatureK,externalPressureBar});
  const safeLevel = Math.max(1,Math.min(3,Math.trunc(finiteNumber(level,'Hint level'))));
  if (safeLevel === 1) return 'Compare external pressure with the pure-water saturation pressure at the selected temperature.';
  if (safeLevel === 2) return `The correlation gives pSat = ${analysis.saturationPressureBar.toFixed(4)} bar; external pressure is ${analysis.externalPressureBar.toFixed(4)} bar.`;
  return 'Below pSat points toward evaporation; near pSat marks the equilibrium band; above pSat points toward condensation.';
}
