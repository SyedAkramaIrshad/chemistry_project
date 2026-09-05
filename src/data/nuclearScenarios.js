const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
};

export const NUCLEAR_CONSTANTS = deepFreeze({
  hydrogenAtomMassU: 1.00782503223,
  neutronMassU: 1.00866491606,
  atomicMassEnergyMeV: 931.49410372,
  electronMassEnergyMeV: 0.51099895069,
  secondsPerMinute: 60,
  secondsPerHour: 3600,
  secondsPerDay: 86400,
  secondsPerJulianYear: 31557600,
  sourceIds: ['nistCodata2022', 'nistIsotopicCompositions'],
});

export const DECAY_PARTICLES = deepFreeze([
  { id: 'alpha', symbol: 'α', label: 'alpha particle', massNumber: 4, chargeNumber: 2, leptonNumber: 0, family: 'nuclear', color: '#c9e75d' },
  { id: 'beta-minus', symbol: 'β⁻', label: 'electron', massNumber: 0, chargeNumber: -1, leptonNumber: 1, family: 'lepton', color: '#e87863' },
  { id: 'positron', symbol: 'β⁺', label: 'positron', massNumber: 0, chargeNumber: 1, leptonNumber: -1, family: 'lepton', color: '#e87863' },
  { id: 'electron', symbol: 'e⁻', label: 'captured electron', massNumber: 0, chargeNumber: -1, leptonNumber: 1, family: 'lepton', color: '#426f91' },
  { id: 'gamma', symbol: 'γ', label: 'gamma photon', massNumber: 0, chargeNumber: 0, leptonNumber: 0, family: 'photon', color: '#8b7ac8' },
  { id: 'neutrino', symbol: 'νₑ', label: 'electron neutrino', massNumber: 0, chargeNumber: 0, leptonNumber: 1, family: 'lepton', color: '#73d1d6' },
  { id: 'antineutrino', symbol: 'ν̄ₑ', label: 'electron antineutrino', massNumber: 0, chargeNumber: 0, leptonNumber: -1, family: 'lepton', color: '#73d1d6' },
]);

export const DECAY_PARTICLE_BY_ID = deepFreeze(Object.fromEntries(DECAY_PARTICLES.map((particle) => [particle.id, particle])));

const nuclide = (record) => deepFreeze({
  neutronNumber: record.massNumber - record.atomicNumber,
  notation: `${record.massNumber}${record.symbol}${record.stateMark || ''}`,
  ...record,
});

export const NUCLEAR_NUCLIDES = deepFreeze([
  nuclide({ id: 'hydrogen-2', name: 'deuterium', symbol: 'H', atomicNumber: 1, massNumber: 2, atomicMassU: 2.01410177812, stable: true, sourceIds: ['nistIsotopicCompositions'] }),
  nuclide({ id: 'helium-4', name: 'helium-4', symbol: 'He', atomicNumber: 2, massNumber: 4, atomicMassU: 4.00260325413, stable: true, sourceIds: ['nistIsotopicCompositions'] }),
  nuclide({ id: 'beryllium-7', name: 'beryllium-7', symbol: 'Be', atomicNumber: 4, massNumber: 7, atomicMassU: 7.016928717, halfLifeSeconds: 4598208, halfLifeDisplay: '53.22 d', stable: false, sourceIds: ['iaeaLiveChartApi', 'nistIsotopicCompositions'] }),
  nuclide({ id: 'lithium-7', name: 'lithium-7', symbol: 'Li', atomicNumber: 3, massNumber: 7, atomicMassU: 7.0160034366, stable: true, sourceIds: ['nistIsotopicCompositions'] }),
  nuclide({ id: 'carbon-12', name: 'carbon-12', symbol: 'C', atomicNumber: 6, massNumber: 12, atomicMassU: 12, stable: true, sourceIds: ['nistIsotopicCompositions'] }),
  nuclide({ id: 'carbon-14', name: 'carbon-14', symbol: 'C', atomicNumber: 6, massNumber: 14, atomicMassU: 14.0032419884, halfLifeSeconds: 179874478055.1744, halfLifeDisplay: '5700 y', stable: false, sourceIds: ['iaeaLiveChartApi', 'nndcCarbon14Decay', 'nistIsotopicCompositions'] }),
  nuclide({ id: 'nitrogen-14', name: 'nitrogen-14', symbol: 'N', atomicNumber: 7, massNumber: 14, atomicMassU: 14.00307400443, stable: true, sourceIds: ['nistIsotopicCompositions'] }),
  nuclide({ id: 'oxygen-16', name: 'oxygen-16', symbol: 'O', atomicNumber: 8, massNumber: 16, atomicMassU: 15.99491461957, stable: true, sourceIds: ['nistIsotopicCompositions'] }),
  nuclide({ id: 'fluorine-18', name: 'fluorine-18', symbol: 'F', atomicNumber: 9, massNumber: 18, atomicMassU: 18.00093733, halfLifeSeconds: 6586.2, halfLifeDisplay: '109.77 min', stable: false, sourceIds: ['iaeaLiveChartApi', 'nistIsotopicCompositions'] }),
  nuclide({ id: 'oxygen-18', name: 'oxygen-18', symbol: 'O', atomicNumber: 8, massNumber: 18, atomicMassU: 17.99915961286, stable: true, sourceIds: ['nistIsotopicCompositions'] }),
  nuclide({ id: 'sodium-22', name: 'sodium-22', symbol: 'Na', atomicNumber: 11, massNumber: 22, atomicMassU: 21.99443741, halfLifeSeconds: 82104810.00069347, halfLifeDisplay: '2.6018 y', stable: false, sourceIds: ['iaeaLiveChartApi', 'nistIsotopicCompositions'] }),
  nuclide({ id: 'neon-22', name: 'neon-22', symbol: 'Ne', atomicNumber: 10, massNumber: 22, atomicMassU: 21.991385114, stable: true, sourceIds: ['nistIsotopicCompositions'] }),
  nuclide({ id: 'phosphorus-32', name: 'phosphorus-32', symbol: 'P', atomicNumber: 15, massNumber: 32, atomicMassU: 31.973907643, halfLifeSeconds: 1232755.2, halfLifeDisplay: '14.268 d', stable: false, sourceIds: ['iaeaLiveChartApi'] }),
  nuclide({ id: 'sulfur-32', name: 'sulfur-32', symbol: 'S', atomicNumber: 16, massNumber: 32, atomicMassU: 31.9720711744, stable: true, sourceIds: ['nistIsotopicCompositions'] }),
  nuclide({ id: 'iron-56', name: 'iron-56', symbol: 'Fe', atomicNumber: 26, massNumber: 56, atomicMassU: 55.93493633, stable: true, sourceIds: ['nistIsotopicCompositions'] }),
  nuclide({ id: 'technetium-99', name: 'technetium-99', symbol: 'Tc', atomicNumber: 43, massNumber: 99, atomicMassU: 98.906249681, halfLifeSeconds: 6661667073236.371, halfLifeDisplay: '2.111×10⁵ y', stable: false, sourceIds: ['iaeaLiveChartApi'] }),
  nuclide({ id: 'technetium-99-excited', name: 'technetium-99 excited state', symbol: 'Tc', atomicNumber: 43, massNumber: 99, stateMark: '*', stateEnergyKeV: 140.511, halfLifeSeconds: 1.9e-10, halfLifeDisplay: '0.19 ns', stable: false, sourceIds: ['iaeaLiveChartApi'] }),
  nuclide({ id: 'technetium-99m', name: 'technetium-99m', symbol: 'Tc', atomicNumber: 43, massNumber: 99, stateMark: 'm', stateEnergyKeV: 142.6836, halfLifeSeconds: 21625.92, halfLifeDisplay: '6.0072 h', stable: false, sourceIds: ['iaeaLiveChartApi', 'nndcTechnetium99mDecay'] }),
  nuclide({ id: 'thorium-234', name: 'thorium-234', symbol: 'Th', atomicNumber: 90, massNumber: 234, atomicMassU: 234.0436014, halfLifeDisplay: '24.10 d', stable: false, sourceIds: ['nistIsotopicCompositions'] }),
  nuclide({ id: 'uranium-238', name: 'uranium-238', symbol: 'U', atomicNumber: 92, massNumber: 238, atomicMassU: 238.0507884, halfLifeSeconds: 1.4099634525447706e17, halfLifeDisplay: '4.468×10⁹ y', stable: false, sourceIds: ['iaeaLiveChartApi', 'nistIsotopicCompositions'] }),
]);

export const NUCLIDE_BY_ID = deepFreeze(Object.fromEntries(NUCLEAR_NUCLIDES.map((item) => [item.id, item])));

const option = (id, name, symbol, massNumber, atomicNumber, note) => deepFreeze({ id, name, symbol, massNumber, atomicNumber, neutronNumber: massNumber - atomicNumber, notation: `${massNumber}${symbol}`, note });

const decayChallenge = (record) => deepFreeze({
  provenance: {
    kind: 'evaluated-record-bounded-teaching-assembly',
    statement: 'Parent half-life and energy fields are frozen evaluated records. Distractor daughters and learner placements are local teaching choices, not measured events or handling procedures.',
  },
  ...record,
});

export const DECAY_CHALLENGES = deepFreeze([
  decayChallenge({
    id: 'uranium-alpha', code: 'DEC 01', name: 'Step down by an alpha', modeId: 'alpha', parentId: 'uranium-238', expectedDaughterId: 'thorium-234', vectorId: 'A-4,Z-2',
    daughterOptions: [
      option('thorium-234', 'thorium-234', 'Th', 234, 90, 'A − 4 and Z − 2'), option('uranium-234', 'uranium-234', 'U', 234, 92, 'A − 4 only'),
      option('thorium-238', 'thorium-238', 'Th', 238, 90, 'Z − 2 only'), option('protactinium-234', 'protactinium-234', 'Pa', 234, 91, 'both coordinates differ'),
    ],
    expectedPlacements: [{ particleId: 'alpha', side: 'product' }], qValueMeV: 4.2698581,
    branchRecord: 'IAEA record: α 100%; spontaneous fission 0.0000545% is outside this declared branch assembly.',
    summary: 'An emitted helium-4 nucleus changes both coordinates and carries the missing mass number and charge.',
    mission: 'Choose the daughter and place every explicit particle so A, Z, and electron-lepton number close without the studio changing your assembly.',
    teacherQuestion: 'Why does an alpha step move two proton rows and two neutron columns rather than merely subtracting four from the element label?',
    misconception: 'A balanced alpha equation identifies bookkeeping and an energetically allowed evaluated branch; it does not predict when one nucleus decays or how radiation moves through matter.',
    sourceIds: ['iaeaLiveChart', 'iaeaLiveChartApi', 'nndcNuDat', 'nistIsotopicCompositions'],
  }),
  decayChallenge({
    id: 'carbon-beta-minus', code: 'DEC 02', name: 'Convert neutron to proton', modeId: 'beta-minus', parentId: 'carbon-14', expectedDaughterId: 'nitrogen-14', vectorId: 'A,Z+1',
    daughterOptions: [
      option('nitrogen-14', 'nitrogen-14', 'N', 14, 7, 'same A, Z + 1'), option('carbon-14', 'carbon-14', 'C', 14, 6, 'no coordinate change'),
      option('boron-14', 'boron-14', 'B', 14, 5, 'same A, Z − 1'), option('nitrogen-13', 'nitrogen-13', 'N', 13, 7, 'both A and Z change'),
    ],
    expectedPlacements: [{ particleId: 'beta-minus', side: 'product' }, { particleId: 'antineutrino', side: 'product' }], qValueMeV: 0.1564765,
    branchRecord: 'IAEA/ENSDF record: β− 100% for the selected parent decay.',
    summary: 'Mass number stays fixed while the daughter proton count rises; the emitted electron and antineutrino close charge and lepton ledgers.',
    mission: 'Build the complete symbolic beta-minus bookkeeping line rather than stopping after the daughter element changes.',
    teacherQuestion: 'Why is the beta electron not an orbital electron that was already waiting inside the neutral carbon atom?',
    misconception: 'The endpoint Q value is shared among decay products; it is not one fixed beta-electron energy and does not determine the half-life by itself.',
    sourceIds: ['iaeaLiveChartApi', 'nndcCarbon14Decay', 'nndcBetaDecay', 'nistIsotopicCompositions'],
  }),
  decayChallenge({
    id: 'sodium-positron-branch', code: 'DEC 03', name: 'Follow a positron branch', modeId: 'beta-plus', parentId: 'sodium-22', expectedDaughterId: 'neon-22', vectorId: 'A,Z-1',
    daughterOptions: [
      option('neon-22', 'neon-22', 'Ne', 22, 10, 'same A, Z − 1'), option('magnesium-22', 'magnesium-22', 'Mg', 22, 12, 'same A, Z + 1'),
      option('sodium-21', 'sodium-21', 'Na', 21, 11, 'A − 1 only'), option('neon-21', 'neon-21', 'Ne', 21, 10, 'A − 1 and Z − 1'),
    ],
    expectedPlacements: [{ particleId: 'positron', side: 'product' }, { particleId: 'neutrino', side: 'product' }], qValueMeV: 1.82132709862,
    branchRecord: 'IAEA ground-state record reports combined EC+β+ decay as 100%. This instrument follows only the declared β+ branch and does not assign a branch fraction.',
    summary: 'A proton converts to a neutron on the selected branch, so A stays fixed and Z falls while a positron and neutrino leave.',
    mission: 'Distinguish the positron branch from electron capture even though both reach the same daughter coordinates.',
    teacherQuestion: 'Why do positron emission and electron capture share the same daughter vector but require particles on different sides of the equation?',
    misconception: 'The 2.843325 MeV electron-capture Q field is not the positron-branch energy; two electron rest energies are subtracted for the displayed β+ branch ledger.',
    sourceIds: ['iaeaLiveChartApi', 'nndcBetaDecay', 'nistCodata2022', 'nistIsotopicCompositions'],
  }),
  decayChallenge({
    id: 'beryllium-electron-capture', code: 'DEC 04', name: 'Capture an orbital electron', modeId: 'electron-capture', parentId: 'beryllium-7', expectedDaughterId: 'lithium-7', vectorId: 'A,Z-1',
    daughterOptions: [
      option('lithium-7', 'lithium-7', 'Li', 7, 3, 'same A, Z − 1'), option('boron-7', 'boron-7', 'B', 7, 5, 'same A, Z + 1'),
      option('beryllium-6', 'beryllium-6', 'Be', 6, 4, 'A − 1 only'), option('lithium-6', 'lithium-6', 'Li', 6, 3, 'A − 1 and Z − 1'),
    ],
    expectedPlacements: [{ particleId: 'electron', side: 'reactant' }, { particleId: 'neutrino', side: 'product' }], qValueMeV: 0.861893,
    branchRecord: 'IAEA ground-state record: electron capture 100% for the selected parent decay.',
    summary: 'The captured electron belongs on the reactant side; the daughter vector matches beta-plus but no positron is emitted.',
    mission: 'Place one incoming electron and the outgoing neutrino so charge and lepton number close on opposite sides.',
    teacherQuestion: 'Why does omitting the neutrino leave mass number and charge balanced while the symbolic lepton ledger remains incomplete?',
    misconception: 'Electron capture changes the nucleus, but this studio does not model atomic-shell rearrangement, X-rays, Auger electrons, or detector response.',
    sourceIds: ['iaeaLiveChartApi', 'nndcBetaDecay', 'nndcNuDat', 'nistIsotopicCompositions'],
  }),
  decayChallenge({
    id: 'technetium-gamma', code: 'DEC 05', name: 'Drop one excited level', modeId: 'gamma', parentId: 'technetium-99-excited', expectedDaughterId: 'technetium-99', vectorId: 'A,Z',
    daughterOptions: [
      option('technetium-99', 'technetium-99', 'Tc', 99, 43, 'same A and Z, lower state'), option('ruthenium-99', 'ruthenium-99', 'Ru', 99, 44, 'same A, Z + 1'),
      option('molybdenum-99', 'molybdenum-99', 'Mo', 99, 42, 'same A, Z − 1'), option('technetium-98', 'technetium-98', 'Tc', 98, 43, 'A − 1 only'),
    ],
    expectedPlacements: [{ particleId: 'gamma', side: 'product' }], qValueMeV: 0.140511,
    branchRecord: 'IAEA level record: the selected 140.511 keV state has a 0.19 ns half-life. Internal conversion is outside this symbolic gamma-line challenge.',
    summary: 'The nucleus changes energy state without changing its proton or neutron coordinates.',
    mission: 'Keep A and Z fixed while representing the selected level drop, then separate a level-energy record from a complete radiation spectrum.',
    teacherQuestion: 'Why can A and Z both close even when an energy-carrying product is still missing from the symbolic equation?',
    misconception: 'This 140.511 keV level challenge is distinct from the 142.6836 keV technetium-99m state used in the chronograph.',
    sourceIds: ['iaeaLiveChartApi', 'nndcNuDat', 'nndcTechnetium99mDecay'],
  }),
]);

export const DECAY_CHALLENGE_BY_ID = deepFreeze(Object.fromEntries(DECAY_CHALLENGES.map((item) => [item.id, item])));

const halfLifeChallenge = (record) => deepFreeze({
  provenance: {
    kind: 'evaluated-half-life-ideal-expected-value',
    statement: 'The half-life is a frozen evaluated record. Initial count and elapsed time are learner-controlled ideal expected-value inputs, not measured detector observations.',
  },
  ...record,
});

export const HALF_LIFE_CHALLENGES = deepFreeze([
  halfLifeChallenge({ id: 'carbon-14-clock', code: 'CLK 01', name: 'Stretch the carbon clock', parentId: 'carbon-14', daughterId: 'nitrogen-14', halfLifeSeconds: 179874478055.1744, halfLifeDisplay: '5700 y', defaultInitialNuclei: 1e9, defaultElapsedHalfLives: 1, daughterWindow: 'Nitrogen-14 is stable.', sourceIds: ['iaeaLiveChartApi', 'nndcCarbon14Decay'] }),
  halfLifeChallenge({ id: 'fluorine-18-clock', code: 'CLK 02', name: 'Watch a short medical-isotope clock', parentId: 'fluorine-18', daughterId: 'oxygen-18', halfLifeSeconds: 6586.2, halfLifeDisplay: '109.77 min', defaultInitialNuclei: 1e9, defaultElapsedHalfLives: 2, daughterWindow: 'Oxygen-18 is stable; applications and dose are outside this model.', sourceIds: ['iaeaLiveChartApi'] }),
  halfLifeChallenge({ id: 'phosphorus-32-clock', code: 'CLK 03', name: 'Halve a beta source ledger', parentId: 'phosphorus-32', daughterId: 'sulfur-32', halfLifeSeconds: 1232755.2, halfLifeDisplay: '14.268 d', defaultInitialNuclei: 1e9, defaultElapsedHalfLives: 0.5, daughterWindow: 'Sulfur-32 is stable.', sourceIds: ['iaeaLiveChartApi'] }),
  halfLifeChallenge({ id: 'technetium-99m-clock', code: 'CLK 04', name: 'Release an isomeric clock', parentId: 'technetium-99m', daughterId: 'technetium-99', halfLifeSeconds: 21625.92, halfLifeDisplay: '6.0072 h', defaultInitialNuclei: 1e9, defaultElapsedHalfLives: 3, daughterWindow: 'Technetium-99 ground-state decay is negligible on this eight-isomer-half-life window; IT 99.9963% and β− 0.0037% are collapsed into total parent loss.', sourceIds: ['iaeaLiveChartApi', 'nndcTechnetium99mDecay'] }),
]);

export const HALF_LIFE_CHALLENGE_BY_ID = deepFreeze(Object.fromEntries(HALF_LIFE_CHALLENGES.map((item) => [item.id, item])));

export const BINDING_NUCLEI = deepFreeze([
  { id: 'hydrogen-2', code: '²H', label: 'Deuterium', atomicNumber: 1, massNumber: 2, atomicMassU: 2.01410177812, sourceIds: ['nistIsotopicCompositions'] },
  { id: 'helium-4', code: '⁴He', label: 'Helium-4', atomicNumber: 2, massNumber: 4, atomicMassU: 4.00260325413, sourceIds: ['nistIsotopicCompositions'] },
  { id: 'carbon-12', code: '¹²C', label: 'Carbon-12', atomicNumber: 6, massNumber: 12, atomicMassU: 12, sourceIds: ['nistIsotopicCompositions'] },
  { id: 'oxygen-16', code: '¹⁶O', label: 'Oxygen-16', atomicNumber: 8, massNumber: 16, atomicMassU: 15.99491461957, sourceIds: ['nistIsotopicCompositions'] },
  { id: 'iron-56', code: '⁵⁶Fe', label: 'Iron-56', atomicNumber: 26, massNumber: 56, atomicMassU: 55.93493633, sourceIds: ['nistIsotopicCompositions'] },
  { id: 'uranium-238', code: '²³⁸U', label: 'Uranium-238', atomicNumber: 92, massNumber: 238, atomicMassU: 238.0507884, sourceIds: ['nistIsotopicCompositions', 'iaeaLiveChartApi'] },
]);

export const BINDING_NUCLEUS_BY_ID = deepFreeze(Object.fromEntries(BINDING_NUCLEI.map((item) => [item.id, item])));

export const NUCLEAR_MODEL_BOUNDARY = deepFreeze({
  records: 'A small frozen teaching subset, not a complete or live chart of nuclides.',
  probability: 'Curves are ideal expected values. Individual decay times and detector counts remain stochastic.',
  branches: 'Only the declared branch or total effective parent loss is evaluated; omitted radiation branches stay omitted and visible.',
  chains: 'One parent-to-daughter step is shown. Bateman chains and secular or transient equilibrium are not solved.',
  energy: 'Binding energy per nucleon is a comparison ledger, not proof of a feasible pathway, rate, cross section, or usable energy release.',
  safety: 'No dose, shielding, transport, biological effect, handling procedure, or medical recommendation is calculated.',
});

