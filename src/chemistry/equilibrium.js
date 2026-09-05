const KW_25_C = 1e-14;
const MIN_CONCENTRATION_M = 1e-9;

const REGIME_LABELS = {
  'initial-acid': 'Weak acid before titration',
  'early-neutralization': 'Early neutralization',
  buffer: 'Buffer region',
  'half-equivalence': 'Half-equivalence',
  equivalence: 'Equivalence point',
  'excess-base': 'Excess strong base',
};

const MODEL_ASSUMPTIONS = [
  'Ideal dilute aqueous solution with activity coefficients set to 1.',
  'Fixed temperature of 25 °C, so pKw = 14.00.',
  'One monoprotic weak acid HA and one strong monovalent base.',
  'Volumes are additive and no precipitation, complexation, or side reaction occurs.',
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

function log10(value) {
  if (!(value > 0)) throw new RangeError('A logarithm input must be greater than zero.');
  return Math.log(value) / Math.LN10;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function positiveQuadraticRoot(k, concentration) {
  return (-k + Math.sqrt(k * k + 4 * k * concentration)) / 2;
}

function validateParams(params) {
  if (!params || typeof params !== 'object') throw new TypeError('Titration parameters are required.');
  const normalized = {
    acidM: positiveNumber(params.acidM, 'Acid concentration'),
    acidVolumeMl: positiveNumber(params.acidVolumeMl, 'Acid volume'),
    baseM: positiveNumber(params.baseM, 'Base concentration'),
    pKa: finiteNumber(params.pKa, 'pKa'),
    temperatureC: params.temperatureC == null ? 25 : finiteNumber(params.temperatureC, 'Temperature'),
  };
  if (normalized.acidM < MIN_CONCENTRATION_M || normalized.baseM < MIN_CONCENTRATION_M) {
    throw new RangeError('Concentrations below 1e-9 M are outside this model.');
  }
  if (normalized.pKa < -2 || normalized.pKa > 16) throw new RangeError('pKa must be between -2 and 16 for this educational model.');
  if (Math.abs(normalized.temperatureC - 25) > 1e-9) {
    throw new RangeError('This equilibrium model is currently calibrated only for 25 °C.');
  }
  return normalized;
}

function solveChargeBalance(totalAcidM, spectatorCationM, ka) {
  const f = (h) => h + spectatorCationM - (totalAcidM * ka) / (ka + h) - KW_25_C / h;
  let lowLog = -16;
  let highLog = 1;
  for (let iteration = 0; iteration < 220; iteration += 1) {
    const midLog = (lowLog + highLog) / 2;
    const h = 10 ** midLog;
    if (f(h) > 0) highLog = midLog;
    else lowLog = midLog;
  }
  return 10 ** ((lowLog + highLog) / 2);
}

function speciesResult({ hM, ohM, haM, aM }) {
  const familyTotal = Math.max(haM + aM, Number.EPSILON);
  return {
    hM,
    ohM,
    haM,
    aM,
    haFraction: clamp(haM / familyTotal, 0, 1),
    aFraction: clamp(aM / familyTotal, 0, 1),
  };
}

export function solveWeakAcid(concentrationM, pKa) {
  const concentration = positiveNumber(concentrationM, 'Weak-acid concentration');
  const normalizedPka = finiteNumber(pKa, 'pKa');
  const ka = 10 ** (-normalizedPka);
  const hM = positiveQuadraticRoot(ka, concentration);
  const aM = hM;
  const haM = Math.max(0, concentration - aM);
  const ohM = KW_25_C / hM;
  return {
    concentrationM: concentration,
    pKa: normalizedPka,
    ka,
    pH: -log10(hM),
    dissociationFraction: clamp(aM / concentration, 0, 1),
    species: speciesResult({ hM, ohM, haM, aM }),
    equation: {
      label: 'Weak-acid quadratic',
      expression: 'Ka = x² / (C₀ − x)',
      detail: 'The positive quadratic root gives x = [H⁺] = [A⁻].',
    },
    assumptions: MODEL_ASSUMPTIONS,
  };
}

export function equivalenceVolumeMl(params) {
  const normalized = validateParams(params);
  const acidMoles = normalized.acidM * normalized.acidVolumeMl / 1000;
  return acidMoles / normalized.baseM * 1000;
}

export function titrationPoint(params, baseAddedMl) {
  const normalized = validateParams(params);
  const addedMl = finiteNumber(baseAddedMl, 'Added base volume');
  if (addedMl < 0) throw new RangeError('Added base volume cannot be negative.');

  const ka = 10 ** (-normalized.pKa);
  const kb = KW_25_C / ka;
  const acidMoles = normalized.acidM * normalized.acidVolumeMl / 1000;
  const baseMoles = normalized.baseM * addedMl / 1000;
  const totalVolumeL = (normalized.acidVolumeMl + addedMl) / 1000;
  const equivalenceMl = acidMoles / normalized.baseM * 1000;
  const equivalenceFraction = addedMl / equivalenceMl;
  const relativeTolerance = 1e-8;
  const atEquivalence = Math.abs(baseMoles - acidMoles) <= acidMoles * relativeTolerance;
  const atHalf = Math.abs(baseMoles - acidMoles / 2) <= acidMoles * relativeTolerance;

  let regime;
  let pH;
  let species;
  let equation;
  let explanation;
  let diagnosticQuestion;

  if (addedMl <= 1e-12) {
    const initial = solveWeakAcid(normalized.acidM, normalized.pKa);
    regime = 'initial-acid';
    pH = initial.pH;
    species = initial.species;
    equation = initial.equation;
    explanation = 'Only weak-acid dissociation and water are present. The acid ionizes partially rather than behaving like a strong acid.';
    diagnosticQuestion = 'Why is the pH higher than −log₁₀(C₀) for a weak acid?';
  } else if (baseMoles < acidMoles && equivalenceFraction < 0.05) {
    const totalAcidM = acidMoles / totalVolumeL;
    const spectatorCationM = baseMoles / totalVolumeL;
    const hM = solveChargeBalance(totalAcidM, spectatorCationM, ka);
    const aM = totalAcidM * ka / (ka + hM);
    const haM = totalAcidM - aM;
    const ohM = KW_25_C / hM;
    regime = 'early-neutralization';
    pH = -log10(hM);
    species = speciesResult({ hM, ohM, haM, aM });
    equation = {
      label: 'Mass and charge balance',
      expression: '[H⁺] + [Na⁺] = [A⁻] + [OH⁻]',
      detail: 'The full ideal charge balance is used before a meaningful buffer ratio exists.',
    };
    explanation = 'A small amount of conjugate base has formed, but the Henderson–Hasselbalch buffer approximation is not yet the clearest model.';
    diagnosticQuestion = 'What new charged species entered when strong base was added?';
  } else if (baseMoles < acidMoles) {
    const remainingHaMoles = acidMoles - baseMoles;
    const conjugateMoles = baseMoles;
    pH = normalized.pKa + log10(conjugateMoles / remainingHaMoles);
    const hM = 10 ** (-pH);
    const ohM = KW_25_C / hM;
    const haM = remainingHaMoles / totalVolumeL;
    const aM = conjugateMoles / totalVolumeL;
    regime = atHalf ? 'half-equivalence' : 'buffer';
    species = speciesResult({ hM, ohM, haM, aM });
    equation = {
      label: 'Henderson–Hasselbalch',
      expression: 'pH = pKa + log₁₀(n(A⁻) / n(HA))',
      detail: atHalf ? 'At half-equivalence, n(A⁻) = n(HA), so pH = pKa.' : 'The stoichiometric HA/A⁻ mole ratio sets the ideal buffer pH.',
    };
    explanation = atHalf
      ? 'Half of HA has been converted to A⁻. Equal conjugate partners make this point reveal the entered pKa directly.'
      : 'Both HA and A⁻ are present in substantial amounts, so the solution resists pH change as a buffer.';
    diagnosticQuestion = atHalf
      ? 'Why does the concentration ratio disappear from the equation here?'
      : 'Which way will pH move if the A⁻/HA ratio doubles?';
  } else if (atEquivalence) {
    const conjugateBaseM = acidMoles / totalVolumeL;
    const ohM = positiveQuadraticRoot(kb, conjugateBaseM);
    const pOH = -log10(ohM);
    pH = 14 - pOH;
    const haM = ohM;
    const aM = Math.max(0, conjugateBaseM - haM);
    const hM = KW_25_C / ohM;
    regime = 'equivalence';
    species = speciesResult({ hM, ohM, haM, aM });
    equation = {
      label: 'Conjugate-base hydrolysis',
      expression: 'Kb = x² / (C(A⁻) − x),  Kb = Kw / Ka',
      detail: 'All stoichiometric HA became A⁻; hydrolysis of A⁻ now determines pH.',
    };
    explanation = 'Equivalence does not mean neutral pH for a weak-acid/strong-base titration. The conjugate base hydrolyzes water, making the solution basic.';
    diagnosticQuestion = 'Why is this equivalence point above pH 7?';
  } else {
    const excessOhM = (baseMoles - acidMoles) / totalVolumeL;
    const pOH = -log10(excessOhM);
    pH = 14 - pOH;
    const hM = KW_25_C / excessOhM;
    const totalAcidM = acidMoles / totalVolumeL;
    regime = 'excess-base';
    species = speciesResult({ hM, ohM: excessOhM, haM: 0, aM: totalAcidM });
    equation = {
      label: 'Excess strong base',
      expression: '[OH⁻] = (n(OH⁻)added − n(HA)initial) / Vtotal',
      detail: 'Leftover strong-base hydroxide dominates over weak conjugate-base hydrolysis.',
    };
    explanation = 'The acid has been consumed stoichiometrically. Additional titrant remains as excess OH⁻ and controls pH.';
    diagnosticQuestion = 'Which mole difference must be calculated before converting to [OH⁻]?';
  }

  return {
    ...normalized,
    baseAddedMl: addedMl,
    equivalenceVolumeMl: equivalenceMl,
    equivalenceFraction,
    acidMoles,
    baseMoles,
    totalVolumeL,
    ka,
    kb,
    kw: KW_25_C,
    pH,
    pOH: 14 - pH,
    regime,
    regimeLabel: REGIME_LABELS[regime],
    species,
    equation,
    explanation,
    diagnosticQuestion,
    assumptions: MODEL_ASSUMPTIONS,
    resultKind: 'Computed ideal-solution model',
  };
}

export function titrationCurve(params, sampleCount = 121, selectedBaseMl = null) {
  const normalized = validateParams(params);
  const count = Math.max(25, Math.round(finiteNumber(sampleCount, 'Sample count')));
  const equivalenceMl = equivalenceVolumeMl(normalized);
  const maximumMl = equivalenceMl * 1.8;
  const volumes = [];
  for (let index = 0; index < count; index += 1) volumes.push(maximumMl * index / (count - 1));
  volumes.push(0, equivalenceMl * 0.5, equivalenceMl, maximumMl);
  if (selectedBaseMl != null) volumes.push(clamp(finiteNumber(selectedBaseMl, 'Selected base volume'), 0, maximumMl));
  const unique = [...new Set(volumes.map((volume) => Number(volume.toFixed(10))))].sort((a, b) => a - b);
  return unique.map((volume) => titrationPoint(normalized, volume));
}

export const EQUILIBRIUM_CONSTANTS = {
  kw25C: KW_25_C,
  minimumConcentrationM: MIN_CONCENTRATION_M,
  assumptions: MODEL_ASSUMPTIONS,
  regimeLabels: REGIME_LABELS,
};
