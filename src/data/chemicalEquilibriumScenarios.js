const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
};

const scenario = (record) => deepFreeze({
  ...record,
  deltaNu: record.species.reduce((sum, species) => sum + species.nu, 0),
});

export const CHEMICAL_EQUILIBRIUM_SCENARIOS = deepFreeze([
  scenario({
    id: 'sulfuryl-chloride-dissociation',
    code: 'REAL 01',
    name: 'Sulfuryl chloride dissociation',
    reactionLabel: 'SO₂Cl₂(g) ⇌ SO₂(g) + Cl₂(g)',
    quotientExpression: 'Q = (pSO₂/p°)(pCl₂/p°) / (pSO₂Cl₂/p°)',
    temperatureK: 373.15,
    equilibriumConstant: 2.75,
    defaultVolumeL: 14.430426632124,
    probeSpeciesId: 'so2',
    defaultTargetSpeciesId: 'so2',
    defaultPerturbationId: 'add-species',
    defaultPerturbationAmountMol: 0.2,
    teachingQuestion: 'After a composition or volume shock, can you use Q rather than a memorized slogan to predict the net response?',
    evidenceNote: 'The default 1.000 mol in 14.4304 L gives 2.15 bar before dissociation. The MIT classroom solution reports Kp = 2.75 at 100 °C and an equilibrium near 0.73, 1.42, and 1.42 bar.',
    provenance: {
      kind: 'source-anchored',
      label: 'Named classroom record',
      statement: 'The reaction, temperature, Kp, and 2.15 bar starting condition are anchored to the cited MIT OpenCourseWare problem and solution.',
    },
    species: [
      { id: 'so2cl2', formula: 'SO₂Cl₂', name: 'Sulfuryl chloride', nu: -1, side: 'reactant', defaultAmountMol: 1, color: '#e28a43', ink: '#2d1607' },
      { id: 'so2', formula: 'SO₂', name: 'Sulfur dioxide', nu: 1, side: 'product', defaultAmountMol: 0, color: '#55b7dd', ink: '#071c2b' },
      { id: 'cl2', formula: 'Cl₂', name: 'Chlorine', nu: 1, side: 'product', defaultAmountMol: 0, color: '#b8df50', ink: '#162305' },
    ],
    sourceIds: ['mitChemicalEquilibriumSolutions19', 'iupacChemicalEquilibrium', 'iupacEquilibriumConstant', 'iupacExtentOfReaction'],
  }),
  scenario({
    id: 'one-to-one-instrument',
    code: 'MODEL 01',
    name: 'One-to-one pressure control',
    reactionLabel: 'A(g) ⇌ B(g)',
    quotientExpression: 'Q = (pB/p°) / (pA/p°)',
    temperatureK: 298.15,
    equilibriumConstant: 4,
    defaultVolumeL: 24.465403697867,
    probeSpeciesId: 'b',
    defaultTargetSpeciesId: 'b',
    defaultPerturbationId: 'compress',
    defaultPerturbationAmountMol: 0.2,
    teachingQuestion: 'Why does a uniform volume change leave Q unchanged when the gaseous stoichiometric sum is zero?',
    evidenceNote: 'A dimensionless one-reaction instrument isolates Δνgas = 0 without pretending to be a measured substance record.',
    provenance: {
      kind: 'synthetic-teaching',
      label: 'Transparent synthetic instrument',
      statement: 'K = 4.00 is a local teaching value for abstract A and B; it is not a measured equilibrium constant for a named chemical system.',
    },
    species: [
      { id: 'a', formula: 'A', name: 'Reactant A', nu: -1, side: 'reactant', defaultAmountMol: 1, color: '#55b7dd', ink: '#071c2b' },
      { id: 'b', formula: 'B', name: 'Product B', nu: 1, side: 'product', defaultAmountMol: 0.25, color: '#df6f9f', ink: '#2a0717' },
    ],
    sourceIds: ['iupacChemicalEquilibrium', 'iupacEquilibriumConstant', 'iupacExtentOfReaction', 'acsEvidenceEquilibriumInstruction'],
  }),
  scenario({
    id: 'one-to-two-instrument',
    code: 'MODEL 02',
    name: 'Expansion-sensitive control',
    reactionLabel: 'A(g) ⇌ 2 B(g)',
    quotientExpression: 'Q = (pB/p°)² / (pA/p°)',
    temperatureK: 320,
    equilibriumConstant: 1.8,
    defaultVolumeL: 26.6062803776,
    probeSpeciesId: 'b',
    defaultTargetSpeciesId: 'b',
    defaultPerturbationId: 'expand',
    defaultPerturbationAmountMol: 0.2,
    teachingQuestion: 'Can you connect expansion, the new partial pressures, Δνgas = +1, and the sign of ln(Q/K)?',
    evidenceNote: 'A dimensionless one-to-two instrument makes the pressure power and positive gas stoichiometric sum visible.',
    provenance: {
      kind: 'synthetic-teaching',
      label: 'Transparent synthetic instrument',
      statement: 'K = 1.80 is a local teaching value for abstract A and B; it is not a measured equilibrium constant for a named chemical system.',
    },
    species: [
      { id: 'a', formula: 'A', name: 'Reactant A', nu: -1, side: 'reactant', defaultAmountMol: 1, color: '#55b7dd', ink: '#071c2b' },
      { id: 'b', formula: 'B', name: 'Product B', nu: 2, side: 'product', defaultAmountMol: 0.15, color: '#df6f9f', ink: '#2a0717' },
    ],
    sourceIds: ['iupacChemicalEquilibrium', 'iupacEquilibriumConstant', 'iupacExtentOfReaction', 'mitChemicalEquilibriumLecture19', 'acsEvidenceEquilibriumInstruction'],
  }),
  scenario({
    id: 'one-plus-three-instrument',
    code: 'MODEL 03',
    name: 'Stoichiometric-power control',
    reactionLabel: 'A(g) + 3 B(g) ⇌ 2 C(g)',
    quotientExpression: 'Q = (pC/p°)² / [(pA/p°)(pB/p°)³]',
    temperatureK: 450,
    equilibriumConstant: 6,
    defaultVolumeL: 30,
    probeSpeciesId: 'c',
    defaultTargetSpeciesId: 'c',
    defaultPerturbationId: 'inert-pressure',
    defaultPerturbationAmountMol: 0.5,
    teachingQuestion: 'How do stoichiometric powers and Δνgas = −2 control the response to pressure and inert-gas perturbations?',
    evidenceNote: 'A dimensionless multi-coefficient instrument exposes extent bounds and the difference between fixed-volume and fixed-pressure inert addition.',
    provenance: {
      kind: 'synthetic-teaching',
      label: 'Transparent synthetic instrument',
      statement: 'K = 6.00 is a local teaching value for abstract A, B, and C; it is not a measured equilibrium constant for a named chemical system.',
    },
    species: [
      { id: 'a', formula: 'A', name: 'Reactant A', nu: -1, side: 'reactant', defaultAmountMol: 1, color: '#55b7dd', ink: '#071c2b' },
      { id: 'b', formula: 'B', name: 'Reactant B', nu: -3, side: 'reactant', defaultAmountMol: 3, color: '#e28a43', ink: '#2d1607' },
      { id: 'c', formula: 'C', name: 'Product C', nu: 2, side: 'product', defaultAmountMol: 0.2, color: '#b8df50', ink: '#162305' },
    ],
    sourceIds: ['iupacChemicalEquilibrium', 'iupacEquilibriumConstant', 'iupacExtentOfReaction', 'mitChemicalEquilibriumLecture19', 'acsEvidenceEquilibriumInstruction'],
  }),
]);

export const CHEMICAL_EQUILIBRIUM_SCENARIO_BY_ID = deepFreeze(Object.fromEntries(
  CHEMICAL_EQUILIBRIUM_SCENARIOS.map((record) => [record.id, record]),
));

export const CHEMICAL_EQUILIBRIUM_MODEL_BOUNDARY = deepFreeze({
  included: 'One reversible ideal-gas reaction, one extent coordinate, dimensionless partial-pressure activities, fixed-volume or fixed-total-pressure constraints, and explicit composition, volume, catalyst, and inert-gas perturbations.',
  excluded: 'Liquid and solid activities, solutes, nonideal fugacity, coupled reactions, phase equilibrium, adsorption, electrochemistry, temperature-dependent K calculation, rate laws, mechanisms, transport, and operational experiments.',
  activity: 'Every reacting-gas activity is ai = pi/p° with p° = 1 bar. Q and K are dimensionless.',
  temperature: 'Temperature is fixed inside each scenario. These perturbations do not change K; a temperature change requires a separately declared K(T) model.',
  equilibrium: 'The solver finds the feasible single-reaction extent where ln(Q/K) is zero. A net direction describes readjustment from the immediate state, not permanent one-way molecular motion.',
  kinetics: 'Equal opposing flux arrows at equilibrium are symbolic only. This module has no rate constant, clock, activation barrier, or kinetic trajectory.',
  catalyst: 'A catalyst can change the approach rate but not Q, K, or the calculated equilibrium composition in this thermodynamic model.',
  synthetic: 'Three abstract A/B/C instruments use conspicuously synthetic K values. Only the sulfuryl-chloride classroom record is tied to a named reaction and cited Kp.',
  safety: 'This is a virtual thermodynamic representation. It provides no procedure, apparatus, quantity, handling, heating, exposure, or synthesis instruction.',
});
