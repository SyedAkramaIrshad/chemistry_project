const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
};

const sourceTemperatureK = 298.15;
const selectedSilverPotentialV = 0.7996;
const silverHalideRecord = ({ id, name, formula, anion, anionName, halidePotentialV, molarMassGmol, color, pattern }) => deepFreeze({
  id,
  name,
  formula,
  temperatureK: sourceTemperatureK,
  ksp: {
    'silver-chloride': 1.751057703729095e-10,
    'silver-bromide': 4.888569345474281e-13,
    'silver-iodide': 8.151729967355943e-17,
  }[id],
  pKsp: -Math.log10({
    'silver-chloride': 1.751057703729095e-10,
    'silver-bromide': 4.888569345474281e-13,
    'silver-iodide': 8.151729967355943e-17,
  }[id]),
  molarMassGmol,
  ions: [
    { id: 'silver-ion', name: 'silver ion', symbol: 'Ag⁺', coefficient: 1, charge: 1, role: 'cation' },
    { id: `${anionName}-ion`, name: `${anionName} ion`, symbol: anion, coefficient: 1, charge: -1, role: 'anion' },
  ],
  dissolutionEquation: `${formula}(s) ⇌ Ag⁺(aq) + ${anion}(aq)`,
  sediment: { color, pattern, label: `${name} solid token bed` },
  recordKind: 'derived-selected-electrode-record',
  derivation: `Derived locally with Ksp = exp[(E°AgX − E°Ag)F/(RT)] from E°Ag = ${selectedSilverPotentialV.toFixed(4)} V and E°AgX = ${halidePotentialV.toFixed(4)} V at 298.15 K.`,
  sourceIds: ['nistSilverHalidePotentials', 'iupacSolubilityProduct', 'iupacThermodynamicActivity'],
});

export const SOLUBILITY_SOLIDS = deepFreeze([
  silverHalideRecord({
    id: 'silver-chloride', name: 'Silver chloride', formula: 'AgCl', anion: 'Cl⁻', anionName: 'chloride',
    halidePotentialV: 0.2224, molarMassGmol: 143.3212, color: '#f4f1dc', pattern: 'pearl-stripe',
  }),
  silverHalideRecord({
    id: 'silver-bromide', name: 'Silver bromide', formula: 'AgBr', anion: 'Br⁻', anionName: 'bromide',
    halidePotentialV: 0.0713, molarMassGmol: 187.7722, color: '#ead59a', pattern: 'cream-crosshatch',
  }),
  silverHalideRecord({
    id: 'silver-iodide', name: 'Silver iodide', formula: 'AgI', anion: 'I⁻', anionName: 'iodide',
    halidePotentialV: -0.1522, molarMassGmol: 234.77267, color: '#e7bb3f', pattern: 'yellow-dot',
  }),
  deepFreeze({
    id: 'calcium-fluoride', name: 'Calcium fluoride', formula: 'CaF₂', temperatureK: sourceTemperatureK,
    ksp: 3.8904514499428045e-11, pKsp: 10.41, molarMassGmol: 78.074806,
    ions: [
      { id: 'calcium-ion', name: 'calcium ion', symbol: 'Ca²⁺', coefficient: 1, charge: 2, role: 'cation' },
      { id: 'fluoride-ion', name: 'fluoride ion', symbol: 'F⁻', coefficient: 2, charge: -1, role: 'anion' },
    ],
    dissolutionEquation: 'CaF₂(s) ⇌ Ca²⁺(aq) + 2F⁻(aq)',
    sediment: { color: '#c8edf0', pattern: 'ice-grid', label: 'Calcium fluoride solid token bed' },
    recordKind: 'selected-pksp-record',
    derivation: 'Selected NIST paper value pKsp = 10.41 at 298.15 K, converted locally with Ksp = 10^(−pKsp).',
    sourceIds: ['nistCalciumFluoridePrecipitation', 'iupacSolubilityProduct', 'iupacThermodynamicActivity'],
  }),
]);

export const SOLUBILITY_SOLID_BY_ID = deepFreeze(Object.fromEntries(SOLUBILITY_SOLIDS.map((solid) => [solid.id, solid])));

const saturationChallenge = (record) => deepFreeze({
  provenance: {
    kind: 'selected-constant-synthetic-mixture',
    statement: 'The solid constant is a frozen selected or transparently derived record; reservoir concentrations, volumes, and solid mass are synthetic teaching defaults, not measured samples or procedures.',
  },
  ...record,
});

export const SATURATION_CHALLENGES = deepFreeze([
  saturationChallenge({
    id: 'agcl-near-gate', code: 'SAT 01', name: 'Cross the AgCl gate', solidId: 'silver-chloride',
    summary: 'Two dilute source streams begin just beyond the selected concentration-product boundary.',
    mission: 'Predict the mixed ion product before opening the ledger, then settle the vessel and track the signed loss of dissolved ions into a solid bed.',
    teacherQuestion: 'Why are the source concentrations halved after equal-volume mixing, and why does precipitation stop before either dissolved ion reaches zero?',
    misconception: 'A supersaturated ideal concentration product predicts a thermodynamic direction in this model; it does not specify induction time, cloudiness, crystal form, or identity.',
    defaults: { cationConcentrationM: 4e-5, cationVolumeMl: 50, anionConcentrationM: 4e-5, anionVolumeMl: 50, initialSolidMassMg: 0 },
  }),
  saturationChallenge({
    id: 'agcl-common-ion', code: 'SAT 02', name: 'Load a common ion', solidId: 'silver-chloride',
    summary: 'A finite AgCl bed meets a chloride-rich ideal solution and can dissolve only a trace amount.',
    mission: 'Compare pure-water molar solubility with the additional formula-unit solubility allowed by the existing chloride concentration.',
    teacherQuestion: 'Why does adding chloride suppress additional AgCl dissolution even though the selected Ksp record itself remains unchanged?',
    misconception: 'The common ion changes the equilibrium composition, not the selected equilibrium constant at the declared temperature.',
    defaults: { cationConcentrationM: 0, cationVolumeMl: 50, anionConcentrationM: 1e-2, anionVolumeMl: 50, initialSolidMassMg: 5 },
  }),
  saturationChallenge({
    id: 'agi-trace-trigger', code: 'SAT 03', name: 'Trigger at trace scale', solidId: 'silver-iodide',
    summary: 'Tiny equal dissolved concentrations still exceed the much smaller selected AgI product constant.',
    mission: 'Use scientific notation rather than a visual solubility rule and decide whether the trace mixture is initially below or above its boundary.',
    teacherQuestion: 'How can two very small concentrations still produce Qsp greater than Ksp, and what evidence is missing before calling any visible solid AgI?',
    misconception: 'Small concentrations do not automatically imply undersaturation; the product must be compared with the constant for the declared solid.',
    defaults: { cationConcentrationM: 2e-7, cationVolumeMl: 50, anionConcentrationM: 2e-7, anionVolumeMl: 50, initialSolidMassMg: 0 },
  }),
  saturationChallenge({
    id: 'caf2-stoichiometry', code: 'SAT 04', name: 'Respect the fluoride square', solidId: 'calcium-fluoride',
    summary: 'A 1:2 dissolution equation makes Qsp and molar solubility depend on stoichiometric powers.',
    mission: 'Settle a calcium-fluoride mixture, follow one formula-unit extent through one calcium and two fluoride ions, and compare Ksp with molar solubility.',
    teacherQuestion: 'Why is Qsp = [Ca²⁺][F⁻]², why does one precipitated formula unit remove two fluoride ions, and why is pure-water Ksp equal to 4s³?',
    misconception: 'Ksp is not molar solubility. Dissolution stoichiometry and background ions are required before converting between them.',
    defaults: { cationConcentrationM: 5e-4, cationVolumeMl: 40, anionConcentrationM: 1e-3, anionVolumeMl: 60, initialSolidMassMg: 0 },
  }),
]);

export const SATURATION_CHALLENGE_BY_ID = deepFreeze(Object.fromEntries(SATURATION_CHALLENGES.map((challenge) => [challenge.id, challenge])));

const selectivityChallenge = (record) => deepFreeze({
  targetRemovalFraction: 0.999,
  provenance: {
    kind: 'selected-constant-synthetic-composition',
    statement: 'Selected silver-halide constants are combined with synthetic free-halide concentrations. The threshold comparison is not a validated separation method or operating instruction.',
  },
  ...record,
});

export const SELECTIVITY_CHALLENGES = deepFreeze([
  selectivityChallenge({
    id: 'iodide-chloride-window', code: 'SEP 01', name: 'Open a wide I⁻ / Cl⁻ window',
    summary: 'Equal halide concentrations leave a broad free-silver interval between AgI and AgCl onset.',
    mission: 'Scan both onset thresholds and test whether 99.9% ideal iodide removal can occur before silver chloride reaches its boundary.',
    teacherQuestion: 'Which quotient reaches one first as free Ag⁺ rises, and how much iodide remains when AgCl just reaches its onset threshold?',
    misconception: 'The first onset is not complete removal; residual analyte follows its own Ksp relation as precipitant activity rises.',
    analytes: [{ solidId: 'silver-iodide', concentrationM: 1e-2 }, { solidId: 'silver-chloride', concentrationM: 1e-2 }],
  }),
  selectivityChallenge({
    id: 'bromide-chloride-overlap', code: 'SEP 02', name: 'Test a narrow Br⁻ / Cl⁻ window',
    summary: 'AgBr starts first, but the selected thresholds do not permit 99.9% removal before AgCl onset.',
    mission: 'Separate onset order from target completeness and locate the 99.9% slit relative to the second precipitation ray.',
    teacherQuestion: 'Why can AgBr precipitate first while a stringent 99.9% bromide target still fail before AgCl begins?',
    misconception: 'Earlier onset does not guarantee an arbitrarily pure or complete separation before the next solid reaches saturation.',
    analytes: [{ solidId: 'silver-bromide', concentrationM: 1e-2 }, { solidId: 'silver-chloride', concentrationM: 1e-2 }],
  }),
  selectivityChallenge({
    id: 'concentration-flips-order', code: 'SEP 03', name: 'Let concentration flip the order',
    summary: 'Extremely dilute iodide requires more free Ag⁺ than abundant chloride despite AgI having lower Ksp.',
    mission: 'Reject a Ksp-only ranking, scan Ksp/[X⁻] for both analytes, and identify which selected solid reaches onset first.',
    teacherQuestion: 'How can AgCl reach its onset before AgI when the selected AgI Ksp is much smaller?',
    misconception: 'Selective-precipitation order depends on the current ion concentrations as well as the solid constants.',
    analytes: [{ solidId: 'silver-iodide', concentrationM: 1e-10 }, { solidId: 'silver-chloride', concentrationM: 1e-2 }],
  }),
  selectivityChallenge({
    id: 'dilution-opens-window', code: 'SEP 04', name: 'Open a window by diluting chloride',
    summary: 'Lower chloride concentration moves AgCl onset to higher free Ag⁺ and widens the AgBr interval.',
    mission: 'Compare this composition with the equal-concentration bromide/chloride case and test the same 99.9% ideal-removal target.',
    teacherQuestion: 'Why does lowering chloride concentration delay AgCl onset without changing either selected Ksp value?',
    misconception: 'Changing composition moves onset thresholds; it does not alter the declared equilibrium constants.',
    analytes: [{ solidId: 'silver-bromide', concentrationM: 1e-2 }, { solidId: 'silver-chloride', concentrationM: 1e-4 }],
  }),
]);

export const SELECTIVITY_CHALLENGE_BY_ID = deepFreeze(Object.fromEntries(SELECTIVITY_CHALLENGES.map((challenge) => [challenge.id, challenge])));

export const SOLUBILITY_MODEL_BOUNDARY = deepFreeze({
  equilibrium: 'The studio uses ideal concentration ratios as activity surrogates. IUPAC defines Ksp with ion activities; no activity coefficient, ionic-strength correction, ion pair, complex, or coupled acid-base equilibrium is calculated.',
  kinetics: 'Qsp/Ksp supplies an equilibrium-direction ledger only. The model has no nucleation barrier, induction time, growth rate, metastable lifetime, settling speed, turbidity, particle size, or crystal-habit prediction.',
  evidence: 'A computed solid extent or patterned sediment token does not establish visible precipitation, chemical identity, purity, recovery, selectivity in a real sample, or method validation.',
  scope: 'Only four declared solids, one-solid vessel equilibria, and two-analyte 1:1 silver-halide onset comparisons are implemented. Competing solids, polymorphs, adsorption, co-precipitation, redissolution by complexation, and arbitrary speciation are excluded.',
  safety: 'No reagent quantities, preparation, mixing order, apparatus, disposal, handling, exposure, or laboratory procedure is provided.',
});
