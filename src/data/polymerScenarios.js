const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
};

const SOURCE_IDS = [
  'iupacConstitutionalRepeatingUnit',
  'iupacMacromolecule',
  'iupacDegreePolymerization',
  'iupacNumberAverageMolarMass',
  'iupacMassAverageMolarMass',
  'iupacDispersity',
  'iupacPurpleBook',
  'acsTwoYearCurriculum',
];

const provenance = {
  kind: 'synthetic-teaching',
  label: 'Finite synthetic chain population',
  statement: 'Every chain count, degree, repeat-unit reel, and end-group contribution is a local synthetic teaching record. It is not measured polymer-distribution data or a real material specification.',
};

const repeatUnit = (record) => deepFreeze({
  provenance: {
    kind: 'synthetic-teaching',
    statement: 'This declared arithmetic teaching chain is not a synthesis route, measured sample, or claim that a real polymer has only these end groups.',
  },
  sourceIds: [
    'iupacConstitutionalRepeatingUnit',
    'iupacMacromolecule',
    'iupacDegreePolymerization',
    'iupacPurpleBook',
  ],
  ...record,
});

export const POLYMER_REPEAT_UNITS = deepFreeze([
  repeatUnit({
    id: 'ethene-derived',
    name: 'Ethene-derived teaching CRU',
    shortName: 'C₂ repeat',
    motif: '–CH₂–CH₂–',
    formula: 'C₂H₄',
    repeatMolarMassGmol: 28.054,
    endGroups: ['H', 'H'],
    endGroupMolarMassGmol: 2.016,
    accent: '#2aa9a1',
  }),
  repeatUnit({
    id: 'propene-derived',
    name: 'Propene-derived teaching CRU',
    shortName: 'C₃ repeat',
    motif: '–CH₂–CH(CH₃)–',
    formula: 'C₃H₆',
    repeatMolarMassGmol: 42.081,
    endGroups: ['H', 'H'],
    endGroupMolarMassGmol: 2.016,
    accent: '#ef7768',
  }),
  repeatUnit({
    id: 'styrene-derived',
    name: 'Styrene-derived teaching CRU',
    shortName: 'Phenyl repeat',
    motif: '–CH₂–CH(C₆H₅)–',
    formula: 'C₈H₈',
    repeatMolarMassGmol: 104.152,
    endGroups: ['H', 'H'],
    endGroupMolarMassGmol: 2.016,
    accent: '#7e6de0',
  }),
]);

export const POLYMER_REPEAT_UNIT_BY_ID = deepFreeze(Object.fromEntries(
  POLYMER_REPEAT_UNITS.map((item) => [item.id, item]),
));

const specimen = (label, repeatUnitId, bins) => ({ label, repeatUnitId, bins });

const challenge = (record) => deepFreeze({
  provenance,
  sourceIds: SOURCE_IDS,
  ...record,
});

export const POLYMER_SCENARIOS = deepFreeze([
  challenge({
    id: 'uniform-vs-spread',
    code: 'POP 01',
    name: 'Same centre, different spread',
    summary: 'Two populations share the same chain-count average while only one population spreads chains around that centre.',
    mission: 'Analyse both patterns, predict which averages stay equal, and use the mass drum to explain why the longer chains receive more leverage.',
    left: specimen('Uniform twenty', 'ethene-derived', [{ degree: 20, count: 12 }]),
    right: specimen('Ten–thirty split', 'ethene-derived', [{ degree: 10, count: 6 }, { degree: 30, count: 6 }]),
    teacherQuestion: 'How can two populations have the same number-average degree and Mn while their Mw and dispersity disagree?',
    misconception: 'The same arithmetic centre does not mean the same spread, and number weighting does not give every gram of polymer equal influence.',
  }),
  challenge({
    id: 'long-tail-leverage',
    code: 'POP 02',
    name: 'The one-chain long tail',
    summary: 'A single very long representative chain changes the mass-weighted average far more than its one-in-twenty chain count suggests.',
    mission: 'Compare the count and mass drums, then defend why a rare long chain can move Mw much more strongly than Mn.',
    left: specimen('Modest tail', 'ethene-derived', [{ degree: 20, count: 19 }, { degree: 40, count: 1 }]),
    right: specimen('Extended tail', 'ethene-derived', [{ degree: 20, count: 19 }, { degree: 200, count: 1 }]),
    teacherQuestion: 'Why does one chain at X = 200 occupy only five percent of the count drum but a much larger part of the mass drum?',
    misconception: 'A small number fraction does not imply a small mass fraction when the minority chains have much larger molar mass.',
  }),
  challenge({
    id: 'count-mass-lens',
    code: 'POP 03',
    name: 'Count lens versus mass lens',
    summary: 'Nine short chains dominate the chain count while one long chain contributes almost half of the relative population-mass ledger.',
    mission: 'Read both drums before comparing the mixed population with a uniform fifty-repeat population and explain why the two lenses answer different questions.',
    left: specimen('Nine short, one long', 'ethene-derived', [{ degree: 10, count: 9 }, { degree: 90, count: 1 }]),
    right: specimen('Uniform fifty', 'ethene-derived', [{ degree: 50, count: 10 }]),
    teacherQuestion: 'Which description is correct for the mixed side: mostly short chains or roughly balanced mass contributions, and why can both be true?',
    misconception: 'A population can be dominated by short chains in number while its long-chain minority controls a large share of the mass-weighted evidence.',
  }),
  challenge({
    id: 'same-degree-different-cru',
    code: 'POP 04',
    name: 'Same degree, different repeat',
    summary: 'The two populations have identical degree bins and counts but use repeating units with very different molar masses.',
    mission: 'Hold every degree and count fixed, switch only the CRU reel, and determine which degree statistics and molar-mass statistics can remain comparable.',
    left: specimen('C₂ repeat pattern', 'ethene-derived', [{ degree: 12, count: 3 }, { degree: 24, count: 6 }, { degree: 36, count: 3 }]),
    right: specimen('Phenyl repeat pattern', 'styrene-derived', [{ degree: 12, count: 3 }, { degree: 24, count: 6 }, { degree: 36, count: 3 }]),
    teacherQuestion: 'Why does an identical distribution of degree of polymerization not produce identical Mn or Mw when the CRU mass changes?',
    misconception: 'Degree of polymerization counts units; it is not itself a molar mass and cannot be compared across different repeat units as though it were grams per mole.',
  }),
  challenge({
    id: 'end-groups-in-view',
    code: 'POP 05',
    name: 'End groups in view',
    summary: 'The same declared pair of end groups contributes a visible fraction of a two-repeat chain but becomes proportionally small for a forty-repeat chain.',
    mission: 'Compare end-group mass shares without deleting the end caps, then explain why a high-degree approximation can be poor for short chains.',
    left: specimen('Short chains', 'ethene-derived', [{ degree: 2, count: 10 }]),
    right: specimen('Longer chains', 'ethene-derived', [{ degree: 40, count: 10 }]),
    teacherQuestion: 'Why is the absolute end-group mass unchanged per chain while its percentage of chain molar mass falls as degree rises?',
    misconception: 'End groups do not literally disappear at high degree; their relative contribution merely becomes small under this declared finite-chain model.',
  }),
  challenge({
    id: 'same-moments-different-shape',
    code: 'POP 06',
    name: 'Same moments, different skyline',
    summary: 'Two visibly different populations are constructed to share the same first and second degree moments and therefore the same displayed molar-mass averages.',
    mission: 'Verify the equal Mn, Mw, and dispersity values, then reject the claim that those equal summaries reconstruct the full distribution or a bulk property.',
    left: specimen('Two-peak skyline', 'ethene-derived', [{ degree: 10, count: 9 }, { degree: 30, count: 9 }]),
    right: specimen('Three-peak skyline', 'ethene-derived', [{ degree: 5, count: 4 }, { degree: 20, count: 10 }, { degree: 35, count: 4 }]),
    teacherQuestion: 'If Mn, Mw, and dispersity agree exactly, what evidence in the skyline still proves that the finite populations are not identical?',
    misconception: 'A few matching moments do not uniquely determine a distribution and cannot by themselves establish morphology, processing response, or material performance.',
  }),
]);

export const POLYMER_SCENARIO_BY_ID = deepFreeze(Object.fromEntries(
  POLYMER_SCENARIOS.map((scenario) => [scenario.id, scenario]),
));

export const POLYMER_RELATIONS = deepFreeze(['left', 'equal', 'right']);

export const POLYMER_MODEL_BOUNDARY = deepFreeze({
  included: 'Finite linear homopolymer teaching chains, one declared CRU and end-group contribution, integer chain populations, number and mass fractions, Xn, Mn, Mw, dispersity, and end-group mass share are included.',
  excluded: 'Measured molecular-mass distributions, branching, copolymer sequence, morphology, crystallinity, thermal or mechanical property prediction, degradation, processing, synthesis, and experimental measurement are excluded.',
  evidence: 'The chain counts are representative synthetic population tokens. Their relative mass ledger is not a weighed sample and no distribution has been fitted to data.',
  safety: 'All chains are virtual. No polymerization recipe, reagent quantity, apparatus, processing condition, chemical handling, or laboratory procedure is provided.',
});
