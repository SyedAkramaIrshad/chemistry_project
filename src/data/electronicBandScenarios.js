const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
};

const RAW_FINITE_CHAIN_PRESETS = [
  {
    id: 'dimer',
    code: 'N2',
    name: 'Two-site split',
    siteCount: 2,
    couplingEv: 1,
    onsiteEnergyEv: 0,
    targetElectronCount: 2,
    question: 'How does one orbital on each of two sites become a lower and an upper shared level?',
    comparison: 'The finite spread is 2.00 eV, still smaller than the 4.00 eV periodic-chain limit at the same coupling.',
  },
  {
    id: 'fourSite',
    code: 'N4',
    name: 'Four-site bridge',
    siteCount: 4,
    couplingEv: 0.5,
    onsiteEnergyEv: 0,
    targetElectronCount: 4,
    question: 'Can you keep four source orbitals, four derived levels, and four electrons as separate counts?',
    comparison: 'Four levels sample a finite 1.62 eV spread; the same coupling gives a 2.00 eV periodic width.',
  },
  {
    id: 'sixWeak',
    code: 'N6·W',
    name: 'Six-site weak coupling',
    siteCount: 6,
    couplingEv: 0.25,
    onsiteEnergyEv: 0,
    targetElectronCount: 6,
    question: 'What changes when six levels interact only weakly?',
    comparison: 'Use this beside the strong-coupling six-site cartridge: N is fixed while the spread changes.',
  },
  {
    id: 'sixStrong',
    code: 'N6·S',
    name: 'Six-site strong coupling',
    siteCount: 6,
    couplingEv: 1,
    onsiteEnergyEv: 0,
    targetElectronCount: 6,
    question: 'Does stronger declared coupling add levels, or spread the same six levels farther apart?',
    comparison: 'The level count remains six; only the energy spread responds to the larger transfer integral.',
  },
  {
    id: 'twelveSite',
    code: 'N12',
    name: 'Twelve-site crowding',
    siteCount: 12,
    couplingEv: 1,
    onsiteEnergyEv: 0,
    targetElectronCount: 12,
    question: 'How do twelve discrete levels begin to look quasi-continuous without becoming an infinite band?',
    comparison: 'More levels crowd into a spread closer to, but still below, the 4.00 eV periodic limit.',
  },
  {
    id: 'isolatedSix',
    code: 'N6·0',
    name: 'Zero-coupling limit',
    siteCount: 6,
    couplingEv: 0,
    onsiteEnergyEv: 0,
    targetElectronCount: 6,
    question: 'What remains of the splitting when the declared coupling is exactly zero?',
    comparison: 'All six site-derived levels coincide; this ledger does not choose one unique occupation among them.',
  },
];

const RAW_PERIODIC_BAND_PRESETS = [
  {
    id: 'emptyBand',
    code: 'ν 0.00',
    name: 'Empty periodic band',
    onsiteEnergyEv: 0,
    betaEv: -1,
    electronsPerCell: 0,
    qCursor: 0,
    question: 'A band may be allowed yet contain no electrons. Which occupation claim is actually justified?',
  },
  {
    id: 'quarterFilled',
    code: 'ν 0.50',
    name: 'Quarter-filled capacity',
    onsiteEnergyEv: 0,
    betaEv: -1,
    electronsPerCell: 0.5,
    qCursor: Math.PI / 4,
    question: 'Where does the zero-temperature occupation edge sit when one quarter of the spin capacity is used?',
  },
  {
    id: 'halfFilled',
    code: 'ν 1.00',
    name: 'Half-filled capacity',
    onsiteEnergyEv: 0,
    betaEv: -1,
    electronsPerCell: 1,
    qCursor: Math.PI / 2,
    question: 'Why can occupied and empty states meet inside one partially filled teaching band?',
  },
  {
    id: 'fullBand',
    code: 'ν 2.00',
    name: 'Full displayed band',
    onsiteEnergyEv: 0,
    betaEv: -1,
    electronsPerCell: 2,
    qCursor: 1.2,
    question: 'What evidence is missing before a full single displayed band could support an insulating classification?',
  },
  {
    id: 'strongerCoupling',
    code: '|β| 1.50',
    name: 'Wider synthetic band',
    onsiteEnergyEv: 0,
    betaEv: -1.5,
    electronsPerCell: 1,
    qCursor: 0.75,
    question: 'At fixed filling, what does a larger declared coupling change—and what transport claim is still unavailable?',
  },
];

const RAW_TWO_BAND_PRESETS = [
  {
    id: 'directGap',
    code: 'D+1.0',
    name: 'Direct positive gap',
    valenceCenterEv: -1,
    valenceWidthEv: 1,
    conductionCenterEv: 1,
    conductionWidthEv: 1,
    alignment: 'direct',
    qCursor: Math.PI,
    expectedGapEv: 1,
    expectedEdgeRelation: 'positive-gap',
    question: 'Do the closest band edges share the same reduced wave coordinate?',
  },
  {
    id: 'directTouch',
    code: 'D·0.0',
    name: 'Direct touching edges',
    valenceCenterEv: -0.5,
    valenceWidthEv: 1,
    conductionCenterEv: 0.5,
    conductionWidthEv: 1,
    alignment: 'direct',
    qCursor: Math.PI,
    expectedGapEv: 0,
    expectedEdgeRelation: 'touching',
    question: 'What changes in the evidence when the daylight between the bands closes to exactly zero?',
  },
  {
    id: 'directOverlap',
    code: 'D∩1.0',
    name: 'Direct edge overlap',
    valenceCenterEv: 0,
    valenceWidthEv: 1,
    conductionCenterEv: 0,
    conductionWidthEv: 1,
    alignment: 'direct',
    qCursor: Math.PI,
    expectedOverlapEv: 1,
    expectedEdgeRelation: 'overlap',
    question: 'Why is the shared energy interval called an overlap instead of a negative gap?',
  },
  {
    id: 'indirectGap',
    code: 'I+1.0',
    name: 'Indirect positive gap',
    valenceCenterEv: -1,
    valenceWidthEv: 1,
    conductionCenterEv: 1,
    conductionWidthEv: 1,
    alignment: 'indirect',
    qCursor: 0,
    expectedGapEv: 1,
    expectedEdgeRelation: 'positive-gap',
    question: 'Can the scalar gap stay the same while the two closest edges move to different q positions?',
  },
  {
    id: 'narrowDirectGap',
    code: 'D+0.2',
    name: 'Narrow direct gap',
    valenceCenterEv: -0.6,
    valenceWidthEv: 1,
    conductionCenterEv: 0.6,
    conductionWidthEv: 1,
    alignment: 'direct',
    qCursor: Math.PI,
    expectedGapEv: 0.2,
    expectedEdgeRelation: 'positive-gap',
    question: 'Does a small positive toy gap alone tell you semiconductor or insulator?',
  },
];

const freezeList = (records) => deepFreeze(records.map((record) => ({ ...record })));
const indexById = (records) => deepFreeze(Object.fromEntries(records.map((record) => [record.id, record])));

export const FINITE_CHAIN_PRESETS = freezeList(RAW_FINITE_CHAIN_PRESETS);
export const FINITE_CHAIN_PRESET_BY_ID = indexById(FINITE_CHAIN_PRESETS);
export const PERIODIC_BAND_PRESETS = freezeList(RAW_PERIODIC_BAND_PRESETS);
export const PERIODIC_BAND_PRESET_BY_ID = indexById(PERIODIC_BAND_PRESETS);
export const TWO_BAND_PRESETS = freezeList(RAW_TWO_BAND_PRESETS);
export const TWO_BAND_PRESET_BY_ID = indexById(TWO_BAND_PRESETS);

export const ELECTRONIC_BAND_MODEL_BOUNDARY = deepFreeze({
  finite: 'The level splitter is an open one-dimensional chain of 2–16 identical one-orbital sites with a learner-declared nearest-neighbour transfer integral. It is finite, synthetic, and not a crystal or computed material.',
  periodic: 'The band loom is an infinite one-dimensional one-orbital nearest-neighbour cosine model. Filling and dE/dq are teaching evidence only; they do not calculate velocity, current, mobility, conductivity, or any measured transport property.',
  gap: 'The gap gate compares two declared cosine band edges. A positive gap, touching point, or overlap is model geometry, not semiconductor, insulator, composition, temperature, carrier, defect, or device certification.',
  units: 'All eV values are synthetic learner-controlled model parameters or exact outputs of the displayed equations, never measured or fitted material records.',
  excluded: 'Real compounds, structures, dimensionality beyond the declared chains, fitted tight-binding parameters, many-electron interactions, self-consistent electronic structure, density of states, carriers, doping, scattering, effective mass, transport, magnetism, optical response, work function, surfaces, defects, phase behavior, superconductivity, topology, and device performance are outside scope.',
});
