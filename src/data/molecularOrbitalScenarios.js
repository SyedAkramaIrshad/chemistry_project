const RAW_ORDERINGS = {
  oneS: {
    name: 'First-period 1s ordering',
    shortName: '1s pair',
    appliesTo: 'H₂ and He₂ species in this declared qualitative model',
    coreStatement: 'All displayed electrons participate in the 1s molecular-orbital ladder.',
    levels: [
      { id: 'sigmaG1s', label: 'σg(1s)', plainLabel: 'sigma g 1s', character: 'bonding', symmetry: 'sigma', source: '1s', orbitals: [{ id: 'sigmaG1s-z', axis: 'z' }] },
      { id: 'sigmaU1sStar', label: 'σu*(1s)', plainLabel: 'sigma u star 1s', character: 'antibonding', symmetry: 'sigma', source: '1s', orbitals: [{ id: 'sigmaU1sStar-z', axis: 'z' }] },
    ],
  },
  earlySecondPeriod: {
    name: 'Early second-period valence ordering',
    shortName: 'π(2p) below σ(2p)',
    appliesTo: 'Li₂ through N₂ in this introductory declared ordering',
    coreStatement: 'The paired 1s core contribution is omitted because equal core bonding and antibonding occupation cancels in this displayed formal bond-order ledger.',
    levels: [
      { id: 'sigmaG2s', label: 'σg(2s)', plainLabel: 'sigma g 2s', character: 'bonding', symmetry: 'sigma', source: '2s', orbitals: [{ id: 'sigmaG2s-z', axis: 'z' }] },
      { id: 'sigmaU2sStar', label: 'σu*(2s)', plainLabel: 'sigma u star 2s', character: 'antibonding', symmetry: 'sigma', source: '2s', orbitals: [{ id: 'sigmaU2sStar-z', axis: 'z' }] },
      { id: 'piU2p', label: 'πu(2p)', plainLabel: 'pi u 2p', character: 'bonding', symmetry: 'pi', source: '2p', orbitals: [{ id: 'piU2p-x', axis: 'x' }, { id: 'piU2p-y', axis: 'y' }] },
      { id: 'sigmaG2p', label: 'σg(2p)', plainLabel: 'sigma g 2p', character: 'bonding', symmetry: 'sigma', source: '2p', orbitals: [{ id: 'sigmaG2p-z', axis: 'z' }] },
      { id: 'piG2pStar', label: 'πg*(2p)', plainLabel: 'pi g star 2p', character: 'antibonding', symmetry: 'pi', source: '2p', orbitals: [{ id: 'piG2pStar-x', axis: 'x' }, { id: 'piG2pStar-y', axis: 'y' }] },
      { id: 'sigmaU2pStar', label: 'σu*(2p)', plainLabel: 'sigma u star 2p', character: 'antibonding', symmetry: 'sigma', source: '2p', orbitals: [{ id: 'sigmaU2pStar-z', axis: 'z' }] },
    ],
  },
  lateSecondPeriod: {
    name: 'Late second-period valence ordering',
    shortName: 'σ(2p) below π(2p)',
    appliesTo: 'O₂ through Ne₂ in this introductory declared ordering',
    coreStatement: 'The paired 1s core contribution is omitted because equal core bonding and antibonding occupation cancels in this displayed formal bond-order ledger.',
    levels: [
      { id: 'sigmaG2s', label: 'σg(2s)', plainLabel: 'sigma g 2s', character: 'bonding', symmetry: 'sigma', source: '2s', orbitals: [{ id: 'sigmaG2s-z', axis: 'z' }] },
      { id: 'sigmaU2sStar', label: 'σu*(2s)', plainLabel: 'sigma u star 2s', character: 'antibonding', symmetry: 'sigma', source: '2s', orbitals: [{ id: 'sigmaU2sStar-z', axis: 'z' }] },
      { id: 'sigmaG2p', label: 'σg(2p)', plainLabel: 'sigma g 2p', character: 'bonding', symmetry: 'sigma', source: '2p', orbitals: [{ id: 'sigmaG2p-z', axis: 'z' }] },
      { id: 'piU2p', label: 'πu(2p)', plainLabel: 'pi u 2p', character: 'bonding', symmetry: 'pi', source: '2p', orbitals: [{ id: 'piU2p-x', axis: 'x' }, { id: 'piU2p-y', axis: 'y' }] },
      { id: 'piG2pStar', label: 'πg*(2p)', plainLabel: 'pi g star 2p', character: 'antibonding', symmetry: 'pi', source: '2p', orbitals: [{ id: 'piG2pStar-x', axis: 'x' }, { id: 'piG2pStar-y', axis: 'y' }] },
      { id: 'sigmaU2pStar', label: 'σu*(2p)', plainLabel: 'sigma u star 2p', character: 'antibonding', symmetry: 'sigma', source: '2p', orbitals: [{ id: 'sigmaU2pStar-z', axis: 'z' }] },
    ],
  },
};

const freezeOrdering = ([id, ordering]) => [id, Object.freeze({
  id,
  ...ordering,
  levels: Object.freeze(ordering.levels.map((level, energyRank) => Object.freeze({
    ...level,
    energyRank,
    degeneracy: level.orbitals.length,
    capacity: level.orbitals.length * 2,
    orbitals: Object.freeze(level.orbitals.map((orbital) => Object.freeze({ ...orbital }))),
  }))),
})];

export const MO_ORDERINGS = Object.freeze(Object.fromEntries(Object.entries(RAW_ORDERINGS).map(freezeOrdering)));
export const MO_ORDERING_LIST = Object.freeze(Object.values(MO_ORDERINGS));

const RAW_SCENARIOS = [
  { id: 'hydrogenCation', formula: 'H₂⁺', name: 'Dihydrogen cation', family: '1s systems', atomicSymbol: 'H', charge: 1, valencePerNeutralAtom: 1, valenceElectronCount: 1, orderingId: 'oneS', expectedBondOrder: 0.5, expectedUnpaired: 1, expectedMagnetism: 'paramagnetic', teachingQuestion: 'What can one electron do when it occupies a bonding orbital shared by two nuclei?' },
  { id: 'hydrogen', formula: 'H₂', name: 'Dihydrogen', family: '1s systems', atomicSymbol: 'H', charge: 0, valencePerNeutralAtom: 1, valenceElectronCount: 2, orderingId: 'oneS', expectedBondOrder: 1, expectedUnpaired: 0, expectedMagnetism: 'diamagnetic', teachingQuestion: 'Why does a paired bonding occupation give a formal bond order of one?' },
  { id: 'heliumCation', formula: 'He₂⁺', name: 'Dihelium cation', family: '1s systems', atomicSymbol: 'He', charge: 1, valencePerNeutralAtom: 2, valenceElectronCount: 3, orderingId: 'oneS', expectedBondOrder: 0.5, expectedUnpaired: 1, expectedMagnetism: 'paramagnetic', teachingQuestion: 'How much of the bonding contribution survives after one antibonding electron is added?' },
  { id: 'helium', formula: 'He₂', name: 'Dihelium', family: '1s systems', atomicSymbol: 'He', charge: 0, valencePerNeutralAtom: 2, valenceElectronCount: 4, orderingId: 'oneS', expectedBondOrder: 0, expectedUnpaired: 0, expectedMagnetism: 'diamagnetic', teachingQuestion: 'Why do equal bonding and antibonding occupations cancel in this formal ledger?' },
  { id: 'lithium', formula: 'Li₂', name: 'Dilithium', family: 'early 2p order', atomicSymbol: 'Li', charge: 0, valencePerNeutralAtom: 1, valenceElectronCount: 2, orderingId: 'earlySecondPeriod', expectedBondOrder: 1, expectedUnpaired: 0, expectedMagnetism: 'diamagnetic', teachingQuestion: 'Why can the omitted paired 1s cores leave the valence bond-order result unchanged?' },
  { id: 'beryllium', formula: 'Be₂', name: 'Diberyllium', family: 'early 2p order', atomicSymbol: 'Be', charge: 0, valencePerNeutralAtom: 2, valenceElectronCount: 4, orderingId: 'earlySecondPeriod', expectedBondOrder: 0, expectedUnpaired: 0, expectedMagnetism: 'diamagnetic', teachingQuestion: 'What does the simple valence-only ledger say—and what does it not prove about a real weakly bound species?' },
  { id: 'boron', formula: 'B₂', name: 'Diboron', family: 'early 2p order', atomicSymbol: 'B', charge: 0, valencePerNeutralAtom: 3, valenceElectronCount: 6, orderingId: 'earlySecondPeriod', expectedBondOrder: 1, expectedUnpaired: 2, expectedMagnetism: 'paramagnetic', teachingQuestion: 'How does Hund occupation of two degenerate bonding π orbitals create two unpaired electrons?' },
  { id: 'carbon', formula: 'C₂', name: 'Dicarbon', family: 'early 2p order', atomicSymbol: 'C', charge: 0, valencePerNeutralAtom: 4, valenceElectronCount: 8, orderingId: 'earlySecondPeriod', expectedBondOrder: 2, expectedUnpaired: 0, expectedMagnetism: 'diamagnetic', teachingQuestion: 'How do four π-bonding electrons change the formal bond order without occupying σg(2p)?' },
  { id: 'nitrogen', formula: 'N₂', name: 'Dinitrogen', family: 'early 2p order', atomicSymbol: 'N', charge: 0, valencePerNeutralAtom: 5, valenceElectronCount: 10, orderingId: 'earlySecondPeriod', expectedBondOrder: 3, expectedUnpaired: 0, expectedMagnetism: 'diamagnetic', teachingQuestion: 'Which six net bonding electrons produce the formal order of three?' },
  { id: 'oxygenCation', formula: 'O₂⁺', name: 'Dioxygen cation', family: 'oxygen ion series', atomicSymbol: 'O', charge: 1, valencePerNeutralAtom: 6, valenceElectronCount: 11, orderingId: 'lateSecondPeriod', expectedBondOrder: 2.5, expectedUnpaired: 1, expectedMagnetism: 'paramagnetic', teachingQuestion: 'Why does removing one antibonding electron raise the formal bond order by one-half?' },
  { id: 'oxygen', formula: 'O₂', name: 'Dioxygen', family: 'oxygen ion series', atomicSymbol: 'O', charge: 0, valencePerNeutralAtom: 6, valenceElectronCount: 12, orderingId: 'lateSecondPeriod', expectedBondOrder: 2, expectedUnpaired: 2, expectedMagnetism: 'paramagnetic', teachingQuestion: 'Can you make the two unpaired πg*(2p) electrons visible without pairing them automatically?' },
  { id: 'superoxide', formula: 'O₂⁻', name: 'Superoxide', family: 'oxygen ion series', atomicSymbol: 'O', charge: -1, valencePerNeutralAtom: 6, valenceElectronCount: 13, orderingId: 'lateSecondPeriod', expectedBondOrder: 1.5, expectedUnpaired: 1, expectedMagnetism: 'paramagnetic', teachingQuestion: 'How does one additional antibonding electron change both bond order and unpaired count?' },
  { id: 'peroxide', formula: 'O₂²⁻', name: 'Peroxide', family: 'oxygen ion series', atomicSymbol: 'O', charge: -2, valencePerNeutralAtom: 6, valenceElectronCount: 14, orderingId: 'lateSecondPeriod', expectedBondOrder: 1, expectedUnpaired: 0, expectedMagnetism: 'diamagnetic', teachingQuestion: 'Why does filling both antibonding π components remove the unpaired electrons and reduce formal bond order?' },
  { id: 'fluorine', formula: 'F₂', name: 'Difluorine', family: 'late 2p order', atomicSymbol: 'F', charge: 0, valencePerNeutralAtom: 7, valenceElectronCount: 14, orderingId: 'lateSecondPeriod', expectedBondOrder: 1, expectedUnpaired: 0, expectedMagnetism: 'diamagnetic', teachingQuestion: 'Which occupied antibonding levels reduce eight bonding electrons to a net formal order of one?' },
  { id: 'neon', formula: 'Ne₂', name: 'Dineon', family: 'late 2p order', atomicSymbol: 'Ne', charge: 0, valencePerNeutralAtom: 8, valenceElectronCount: 16, orderingId: 'lateSecondPeriod', expectedBondOrder: 0, expectedUnpaired: 0, expectedMagnetism: 'diamagnetic', teachingQuestion: 'Why does a zero formal valence MO bond order not describe weak dispersion interactions?' },
];

const freezeScenario = (scenario) => Object.freeze({ ...scenario });
export const MO_SCENARIOS = Object.freeze(RAW_SCENARIOS.map(freezeScenario));
export const MO_SCENARIO_BY_ID = Object.freeze(Object.fromEntries(MO_SCENARIOS.map((scenario) => [scenario.id, scenario])));

export const MO_MODEL_BOUNDARY = Object.freeze({
  included: 'Fifteen declared first- and second-period homonuclear diatomic species, three qualitative MO orderings, manual spin occupation, formal bonding-minus-antibonding bond order, and spin-only unpaired-electron classification.',
  excluded: 'Arbitrary molecules, heteronuclear or polyatomic ordering, numerical LCAO coefficients or orbital energies, self-consistent wavefunctions, electron correlation, term symbols, excited states, spectra, optimized geometry, measured bond properties, magnetic susceptibility, stability, existence, and reactivity.',
  orbitalGraphic: 'Phase colours show only the algebraic sign of a qualitative one-electron wavefunction/isovalue silhouette. They are not charge, electron paths, fixed orbital boundaries, measured sizes, or many-electron density.',
  bondOrder: 'The displayed (bonding electrons - antibonding electrons) / 2 value is a formal introductory MO bookkeeping result, not a universal electron-density bond index or measured bond strength.',
  complementarity: 'Molecular-orbital and valence-bond descriptions are presented as complementary models, not as a winner and a failed theory.',
});
