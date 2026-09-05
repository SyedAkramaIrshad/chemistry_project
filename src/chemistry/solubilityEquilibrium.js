import {
  SELECTIVITY_CHALLENGE_BY_ID,
  SATURATION_CHALLENGE_BY_ID,
  SOLUBILITY_MODEL_BOUNDARY,
  SOLUBILITY_SOLID_BY_ID,
} from '../data/solubilityScenarios.js';

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
};
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const finite = (value, label, { minimum = -Infinity, exclusiveMinimum = false } = {}) => {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite.`);
  if (exclusiveMinimum ? value <= minimum : value < minimum) {
    throw new RangeError(`${label} must be ${exclusiveMinimum ? 'greater than' : 'at least'} ${minimum}.`);
  }
  return value;
};
const requireObject = (value, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} is required.`);
  return value;
};
const product = (items) => items.reduce((total, value) => total * value, 1);
const qspFor = (solid, concentrationsM) => product(solid.ions.map((ion, index) => concentrationsM[index] ** ion.coefficient));
const logRatio = (qsp, ksp) => qsp === 0 ? -Infinity : Math.log10(qsp / ksp);
const saturationState = (qsp, ksp) => {
  if (qsp === 0) return 'undersaturated';
  const log = logRatio(qsp, ksp);
  if (Math.abs(log) <= 1e-10) return 'saturated';
  return log > 0 ? 'supersaturated' : 'undersaturated';
};
const bisection = ({ low, high, target, evaluate }) => {
  let lo = low;
  let hi = high;
  const fLo = evaluate(lo);
  const fHi = evaluate(hi);
  if (fLo > target || fHi < target) throw new RangeError('Equilibrium target is not bracketed by the feasible extent.');
  for (let iteration = 0; iteration < 220; iteration += 1) {
    const middle = (lo + hi) / 2;
    if (evaluate(middle) < target) lo = middle;
    else hi = middle;
  }
  return (lo + hi) / 2;
};
const pureMolarSolubility = (solid) => {
  const exponent = solid.ions.reduce((sum, ion) => sum + ion.coefficient, 0);
  const stoichiometricProduct = product(solid.ions.map((ion) => ion.coefficient ** ion.coefficient));
  return (solid.ksp / stoichiometricProduct) ** (1 / exponent);
};
const additionalSolubility = (solid, backgroundM) => {
  const initialQ = qspFor(solid, backgroundM);
  if (initialQ >= solid.ksp) return 0;
  const pure = pureMolarSolubility(solid);
  return bisection({
    low: 0,
    high: pure,
    target: solid.ksp,
    evaluate: (s) => qspFor(solid, backgroundM.map((concentration, index) => concentration + solid.ions[index].coefficient * s)),
  });
};
const scientific = (value, digits = 4) => Number(value).toExponential(digits);
const stateReason = (state, qsp, ksp) => `The frozen mixed state has Qsp = ${scientific(qsp)} and Ksp = ${scientific(ksp)}, so it is ${state}.`;

export function analyzeSaturationVessel({ challengeId, inputs }) {
  const challenge = SATURATION_CHALLENGE_BY_ID[challengeId];
  if (!challenge) throw new RangeError(`Unknown saturation challenge: ${challengeId}.`);
  requireObject(inputs, 'Saturation-vessel inputs');
  const normalized = {
    cationConcentrationM: finite(inputs.cationConcentrationM, 'Cation concentration', { minimum: 0 }),
    cationVolumeMl: finite(inputs.cationVolumeMl, 'Cation-source volume', { minimum: 0 }),
    anionConcentrationM: finite(inputs.anionConcentrationM, 'Anion concentration', { minimum: 0 }),
    anionVolumeMl: finite(inputs.anionVolumeMl, 'Anion-source volume', { minimum: 0 }),
    initialSolidMassMg: finite(inputs.initialSolidMassMg, 'Initial solid mass', { minimum: 0 }),
  };
  const totalVolumeL = (normalized.cationVolumeMl + normalized.anionVolumeMl) / 1000;
  finite(totalVolumeL, 'Total mixed volume', { minimum: 0, exclusiveMinimum: true });
  const solid = SOLUBILITY_SOLID_BY_ID[challenge.solidId];
  const initialIonMoles = [
    normalized.cationConcentrationM * normalized.cationVolumeMl / 1000,
    normalized.anionConcentrationM * normalized.anionVolumeMl / 1000,
  ];
  const initialIonConcentrationsM = initialIonMoles.map((moles) => moles / totalVolumeL);
  const initialSolidMoles = normalized.initialSolidMassMg / 1000 / solid.molarMassGmol;
  const initialQsp = qspFor(solid, initialIonConcentrationsM);
  const initialState = saturationState(initialQsp, solid.ksp);
  const extentQ = (extentMoles) => qspFor(solid, initialIonMoles.map((moles, index) => (
    (moles + solid.ions[index].coefficient * extentMoles) / totalVolumeL
  )));
  const lowerExtent = -Math.min(...solid.ions.map((ion, index) => initialIonMoles[index] / ion.coefficient));
  const upperExtent = initialSolidMoles;
  let extentMoles = 0;
  let direction = 'at-equilibrium';
  let limitingBoundary = 'Already at the selected ideal concentration-product boundary.';
  if (initialState === 'supersaturated') {
    extentMoles = bisection({ low: lowerExtent, high: 0, target: solid.ksp, evaluate: extentQ });
    direction = 'precipitates';
    limitingBoundary = 'Precipitation moves toward lower dissolved-ion amounts until Qsp closes on Ksp.';
  } else if (initialState === 'undersaturated') {
    if (initialSolidMoles === 0) {
      direction = 'no-solid-to-dissolve';
      limitingBoundary = 'The ion product is below Ksp, but no declared solid inventory is available to dissolve.';
    } else if (extentQ(upperExtent) <= solid.ksp) {
      extentMoles = upperExtent;
      direction = 'dissolves-all-solid';
      limitingBoundary = 'The finite solid inventory is exhausted before the ideal solution reaches saturation.';
    } else {
      extentMoles = bisection({ low: 0, high: upperExtent, target: solid.ksp, evaluate: extentQ });
      direction = 'dissolves';
      limitingBoundary = 'Only part of the finite solid inventory dissolves before Qsp closes on Ksp.';
    }
  }
  const finalIonMoles = initialIonMoles.map((moles, index) => moles + solid.ions[index].coefficient * extentMoles);
  const finalIonConcentrationsM = finalIonMoles.map((moles) => Math.max(0, moles / totalVolumeL));
  const finalSolidMoles = Math.max(0, initialSolidMoles - extentMoles);
  const finalSolidMassMg = finalSolidMoles * solid.molarMassGmol * 1000;
  const solidMassChangeMg = finalSolidMassMg - normalized.initialSolidMassMg;
  const finalQsp = qspFor(solid, finalIonConcentrationsM);
  const massChangeClaim = solidMassChangeMg > 1e-14 ? 'increases' : solidMassChangeMg < -1e-14 ? 'decreases' : 'unchanged';
  const directionClaim = direction === 'precipitates' ? 'precipitates' : direction.startsWith('dissolves') ? 'dissolves' : 'no-net';
  const qExpression = solid.ions.map((ion) => `[${ion.symbol}]${ion.coefficient === 1 ? '' : `^${ion.coefficient}`}`).join(' · ');
  const analysis = {
    challengeId,
    challenge,
    solid,
    inputs: normalized,
    totalVolumeL,
    ksp: solid.ksp,
    pureMolarSolubilityM: pureMolarSolubility(solid),
    backgroundAdditionalSolubilityM: additionalSolubility(solid, initialIonConcentrationsM),
    extentMoles,
    direction,
    solidMassChangeMg,
    limitingBoundary,
    initial: {
      ionMoles: initialIonMoles,
      ionConcentrationsM: initialIonConcentrationsM,
      solidMoles: initialSolidMoles,
      solidMassMg: normalized.initialSolidMassMg,
      qsp: initialQsp,
      log10QOverK: logRatio(initialQsp, solid.ksp),
      saturationState: initialState,
    },
    final: {
      ionMoles: finalIonMoles,
      ionConcentrationsM: finalIonConcentrationsM,
      solidMoles: finalSolidMoles,
      solidMassMg: finalSolidMassMg,
      qsp: finalQsp,
      log10QOverK: logRatio(finalQsp, solid.ksp),
      saturationState: saturationState(finalQsp, solid.ksp),
    },
    expectedClaims: {
      initialState,
      direction: directionClaim,
      solidMassChange: massChangeClaim,
      kspMeaning: 'stoichiometry-and-background-matter',
    },
    equationLedger: [
      solid.dissolutionEquation,
      `Vtotal = ${normalized.cationVolumeMl.toFixed(3)} mL + ${normalized.anionVolumeMl.toFixed(3)} mL = ${(totalVolumeL * 1000).toFixed(3)} mL`,
      `Qsp,initial = ${qExpression} = ${scientific(initialQsp)}; Ksp = ${scientific(solid.ksp)}`,
      `nᵢ,final = nᵢ,initial + νᵢξ with ξ = ${scientific(extentMoles)} mol formula units`,
      `Qsp,final = ${scientific(finalQsp)}; Δmsolid = ${scientific(solidMassChangeMg)} mg`,
      `Ideal concentration ratios stand in for activities; c° = 1 mol L⁻¹.`,
    ],
    boundary: SOLUBILITY_MODEL_BOUNDARY,
  };
  return deepFreeze(analysis);
}

const saturationFields = {
  initialState: ['undersaturated', 'saturated', 'supersaturated'],
  direction: ['precipitates', 'dissolves', 'no-net'],
  solidMassChange: ['increases', 'decreases', 'unchanged'],
  kspMeaning: ['ksp-is-molar-solubility', 'stoichiometry-and-background-matter'],
};
const validatePrediction = (prediction, fields, label) => {
  requireObject(prediction, label);
  for (const [key, allowed] of Object.entries(fields)) {
    if (!allowed.includes(prediction[key])) throw new RangeError(`${label} requires a valid ${key} claim.`);
  }
};

export function evaluateSaturationAttempt({ analysis, prediction }) {
  requireObject(analysis, 'Saturation analysis');
  validatePrediction(prediction, saturationFields, 'Saturation prediction');
  const expected = analysis.expectedClaims;
  const reasons = {
    initialState: stateReason(expected.initialState, analysis.initial.qsp, analysis.ksp),
    direction: analysis.direction === 'precipitates'
      ? 'Qsp begins above Ksp, so the signed formula-unit extent is negative and dissolved ions move into the solid ledger.'
      : analysis.direction.startsWith('dissolves')
        ? 'Qsp begins below Ksp and declared solid is available, so the signed formula-unit extent is positive and adds dissolved ions.'
        : analysis.limitingBoundary,
    solidMassChange: `The signed extent is ${scientific(analysis.extentMoles)} mol; solidFinal = solidInitial − ξ, so the solid mass ${expected.solidMassChange}.`,
    kspMeaning: `For ${analysis.solid.formula}, Ksp uses ${analysis.solid.ions.map((ion) => `${ion.coefficient}${ion.symbol}`).join(' and ')}. Dissociation stoichiometry and any starting ions are required before solving a molar solubility.`,
  };
  const dimensions = Object.fromEntries(Object.keys(saturationFields).map((key) => [key, {
    learner: prediction[key], expected: expected[key], correct: prediction[key] === expected[key], reason: reasons[key],
  }]));
  return deepFreeze({ dimensions, score: { correct: Object.values(dimensions).filter((item) => item.correct).length, total: 4 } });
}

export function nextSaturationHint({ analysis, prediction, level }) {
  requireObject(analysis, 'Saturation analysis');
  requireObject(prediction, 'Saturation prediction');
  if (!Number.isInteger(level) || level < 1 || level > 4) throw new RangeError('Saturation hint level must be 1 through 4.');
  const [cation, anion] = analysis.solid.ions;
  return deepFreeze([
    `After volume addition, the frozen mixed concentrations are [${cation.symbol}] = ${scientific(analysis.initial.ionConcentrationsM[0])} M and [${anion.symbol}] = ${scientific(analysis.initial.ionConcentrationsM[1])} M. No equilibrium action has been inferred from the source labels alone.`,
    `Build the declared expression from the dissolution equation: Qsp = ${analysis.solid.ions.map((ion) => `[${ion.symbol}]${ion.coefficient === 1 ? '' : `^${ion.coefficient}`}`).join(' · ')}. A coefficient becomes an exponent and also scales the ion-mole change.`,
    `The signed comparison is log10(Qsp/Ksp) = ${Number.isFinite(analysis.initial.log10QOverK) ? analysis.initial.log10QOverK.toFixed(5) : '−∞'}. Positive points toward solid, negative points toward dissolved ions only when solid inventory exists, and zero is the boundary.`,
    `${analysis.limitingBoundary} The frozen signed formula-unit extent is ${scientific(analysis.extentMoles)} mol; this hint does not alter it or any learner claim.`,
  ][level - 1]);
}

export function analyzeSelectivity({ challengeId, concentrationsM }) {
  const challenge = SELECTIVITY_CHALLENGE_BY_ID[challengeId];
  if (!challenge) throw new RangeError(`Unknown selectivity challenge: ${challengeId}.`);
  requireObject(concentrationsM, 'Selectivity concentrations');
  const entries = challenge.analytes.map((analyte) => {
    const solid = SOLUBILITY_SOLID_BY_ID[analyte.solidId];
    const concentrationM = finite(concentrationsM[analyte.solidId], `${solid.formula} free-analyte concentration`, { minimum: 0, exclusiveMinimum: true });
    const freeSilverAtOnsetM = solid.ksp / concentrationM;
    return {
      solidId: solid.id,
      solid,
      analyteIon: solid.ions[1],
      concentrationM,
      freeSilverAtOnsetM,
      log10FreeSilverAtOnset: Math.log10(freeSilverAtOnsetM),
      onsetExpression: `[Ag⁺]onset = Ksp/[${solid.ions[1].symbol}] = ${scientific(freeSilverAtOnsetM)} M`,
    };
  }).sort((left, right) => left.freeSilverAtOnsetM - right.freeSilverAtOnsetM);
  const simultaneous = Math.abs(entries[0].log10FreeSilverAtOnset - entries[1].log10FreeSilverAtOnset) <= 1e-10;
  let first = null;
  let second = null;
  let firstFreeAtSecondOnsetM = null;
  let fractionRemainingAtSecondOnset = 1;
  let fractionRemovedAtSecondOnset = 0;
  let freeSilverAtTargetM = null;
  let targetPossible = false;
  let removalBand = 'below-90';
  if (!simultaneous) {
    [first, second] = entries;
    firstFreeAtSecondOnsetM = first.solid.ksp / second.freeSilverAtOnsetM;
    fractionRemainingAtSecondOnset = clamp(firstFreeAtSecondOnsetM / first.concentrationM, 0, 1);
    fractionRemovedAtSecondOnset = 1 - fractionRemainingAtSecondOnset;
    freeSilverAtTargetM = first.solid.ksp / (first.concentrationM * (1 - challenge.targetRemovalFraction));
    targetPossible = freeSilverAtTargetM <= second.freeSilverAtOnsetM;
    removalBand = fractionRemovedAtSecondOnset >= challenge.targetRemovalFraction
      ? 'at-least-99-9'
      : fractionRemovedAtSecondOnset >= 0.9 ? '90-to-99-9' : 'below-90';
  }
  return deepFreeze({
    challengeId,
    challenge,
    entries,
    simultaneous,
    first,
    second,
    firstFreeAtSecondOnsetM,
    fractionRemainingAtSecondOnset,
    fractionRemovedAtSecondOnset,
    freeSilverAtTargetM,
    targetRemovalFraction: challenge.targetRemovalFraction,
    targetPossible,
    removalBand,
    expectedClaims: {
      firstSolidId: simultaneous ? 'simultaneous' : first.solidId,
      targetPossible: targetPossible ? 'yes' : 'no',
      orderingRule: 'ksp-and-current-concentration',
      removalBand,
    },
    equationLedger: [
      ...entries.map((entry) => entry.onsetExpression),
      simultaneous
        ? 'Both declared onset thresholds coincide within 10⁻¹⁰ logarithmic decades.'
        : `[${first.analyteIon.symbol}] at second onset = Ksp(first)/[Ag⁺]second = ${scientific(firstFreeAtSecondOnsetM)} M`,
      simultaneous
        ? 'No first-only precipitation interval is defined.'
        : `First-analyte ideal removal at second onset = ${(fractionRemovedAtSecondOnset * 100).toFixed(6)}%`,
      `Target removal = ${(challenge.targetRemovalFraction * 100).toFixed(3)}%; order depends on Ksp/[X⁻], not Ksp alone.`,
    ],
    boundary: SOLUBILITY_MODEL_BOUNDARY,
  });
}

const selectivityFields = {
  firstSolidId: ['silver-chloride', 'silver-bromide', 'silver-iodide', 'simultaneous'],
  targetPossible: ['yes', 'no'],
  orderingRule: ['ksp-alone', 'ksp-and-current-concentration'],
  removalBand: ['below-90', '90-to-99-9', 'at-least-99-9'],
};

export function evaluateSelectivityAttempt({ analysis, prediction }) {
  requireObject(analysis, 'Selectivity analysis');
  validatePrediction(prediction, selectivityFields, 'Selectivity prediction');
  const expected = analysis.expectedClaims;
  const firstReason = analysis.simultaneous
    ? 'The two computed free-Ag⁺ onset thresholds coincide, so this ideal scan has no unique first solid.'
    : `${analysis.first.solid.formula} reaches onset first because ${scientific(analysis.first.freeSilverAtOnsetM)} M Ag⁺ is below ${scientific(analysis.second.freeSilverAtOnsetM)} M for ${analysis.second.solid.formula}.`;
  const reasons = {
    firstSolidId: firstReason,
    targetPossible: analysis.simultaneous
      ? 'No first-only interval exists, so the displayed removal target cannot be reached before a second onset.'
      : `The 99.9% target requires [Ag⁺] = ${scientific(analysis.freeSilverAtTargetM)} M; the second onset is ${scientific(analysis.second.freeSilverAtOnsetM)} M.`,
    orderingRule: 'Each onset threshold is Ksp divided by the current free analyte concentration. Changing composition can reverse an ordering suggested by Ksp alone.',
    removalBand: analysis.simultaneous
      ? 'The thresholds coincide, so the first-analyte removal before second onset is zero in this ideal ordering audit.'
      : `When the second solid reaches onset, the first-analyte ideal removal is ${(analysis.fractionRemovedAtSecondOnset * 100).toFixed(6)}%.`,
  };
  const dimensions = Object.fromEntries(Object.keys(selectivityFields).map((key) => [key, {
    learner: prediction[key], expected: expected[key], correct: prediction[key] === expected[key], reason: reasons[key],
  }]));
  return deepFreeze({ dimensions, score: { correct: Object.values(dimensions).filter((item) => item.correct).length, total: 4 } });
}

export function nextSelectivityHint({ analysis, prediction, level }) {
  requireObject(analysis, 'Selectivity analysis');
  requireObject(prediction, 'Selectivity prediction');
  if (!Number.isInteger(level) || level < 1 || level > 4) throw new RangeError('Selectivity hint level must be 1 through 4.');
  const ordered = analysis.entries;
  return deepFreeze([
    `The frozen analyte concentrations are ${ordered.map((entry) => `[${entry.analyteIon.symbol}] = ${scientific(entry.concentrationM)} M`).join(' and ')}. Keep those concentrations attached to their own constants.`,
    `For each declared 1:1 silver halide, solve Qsp = [Ag⁺][X⁻] = Ksp at onset, so [Ag⁺]onset = Ksp/[X⁻]. The smaller threshold is reached first as free Ag⁺ rises.`,
    `The two onset thresholds are ${ordered.map((entry) => `${entry.solid.formula}: ${scientific(entry.freeSilverAtOnsetM)} M`).join(' and ')}. This comparison uses both Ksp and current composition.`,
    analysis.simultaneous
      ? 'The onset rays coincide, so no first-only window exists. This hint leaves the scan and learner claims unchanged.'
      : `At the second onset, ${(analysis.fractionRemovedAtSecondOnset * 100).toFixed(6)}% of the first analyte is removed in the ideal ledger; the target is ${(analysis.targetRemovalFraction * 100).toFixed(3)}%. This hint changes no concentration or claim.`,
  ][level - 1]);
}
