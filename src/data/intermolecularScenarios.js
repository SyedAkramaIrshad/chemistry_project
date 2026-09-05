const freezeFamily = (family) => Object.freeze({
  ...family,
  sourceIds: Object.freeze([...family.sourceIds]),
});

export const INTERACTION_FAMILIES = Object.freeze({
  'london-dispersion': freezeFamily({
    id: 'london-dispersion',
    name: 'London dispersion',
    symbol: 'δ(t) ↔ δ(t)',
    accent: '#b38cff',
    orientationSpecific: false,
    definition: 'Attraction associated with mutual polarizability and instantaneous induced dipoles.',
    siteRule: 'Select the declared polarizable-cloud ports. This bounded model does not assign a preferred orientation.',
    scope: 'Present in every declared neutral molecular pair, including the polar pairs.',
    boundary: 'No polarizability value, energy, distance law, or bulk-property consequence is calculated.',
    sourceIds: ['iupacLondonForces', 'iupacVanDerWaalsForces'],
  }),
  'dipole-dipole': freezeFamily({
    id: 'dipole-dipole',
    name: 'Permanent dipole–dipole',
    symbol: 'δ+ ··· δ−',
    accent: '#58c7ff',
    orientationSpecific: true,
    definition: 'Interaction between declared entities that have permanent electric dipole moments.',
    siteRule: 'Select opposite partial-charge ends and orient both selected ports toward one another.',
    scope: 'Applied only where the frozen scenario declares both molecular entities polar.',
    boundary: 'The directional gate is qualitative and does not calculate a molecular dipole or interaction energy.',
    sourceIds: ['iupacDipoleDipoleInteraction', 'iupacElectricDipoleMoment'],
  }),
  'hydrogen-bond': freezeFamily({
    id: 'hydrogen-bond',
    name: 'Declared hydrogen-bond contact',
    symbol: 'X–H ··· Y',
    accent: '#65d6ad',
    orientationSpecific: true,
    definition: 'A bounded attractive X–H donor-hydrogen contact directed toward a declared electron-rich acceptor region.',
    siteRule: 'Select one declared donor hydrogen and one declared acceptor region, then align those ports.',
    scope: 'Only the frozen water/water and water/acetone donor–acceptor contacts are implemented.',
    boundary: 'Passing this teaching geometry is not experimental proof of a hydrogen bond and is not a universal donor/acceptor parser.',
    sourceIds: ['iupacHydrogenBond', 'iupacHydrogenBondRecommendation'],
  }),
  'ion-dipole': freezeFamily({
    id: 'ion-dipole',
    name: 'Ion–dipole orientation',
    symbol: 'q ··· δ',
    accent: '#ff9b71',
    orientationSpecific: true,
    definition: 'A declared ion directed toward the oppositely signed end of a declared permanent molecular dipole.',
    siteRule: 'Select the ion and the opposite partial-charge end of water, then orient the water port toward the ion.',
    scope: 'Applied only to the Na⁺/water and Cl⁻/water teaching scenarios and symbolic shells.',
    boundary: 'No hydration energy, hydration number, dielectric response, concentration, or solubility is calculated.',
    sourceIds: ['iupacSolvation', 'iupacIonDipoleHostExample'],
  }),
});

export const INTERACTION_FAMILY_BY_ID = INTERACTION_FAMILIES;

const freezeEntity = (entity) => Object.freeze({
  ...entity,
  atoms: Object.freeze(entity.atoms.map((atom) => Object.freeze({ ...atom }))),
  bonds: Object.freeze(entity.bonds.map((bond) => Object.freeze({ ...bond }))),
  sites: Object.freeze(entity.sites.map((site) => Object.freeze({ orientationFree: false, ...site }))),
});

export const INTERACTION_ENTITIES = Object.freeze({
  methane: freezeEntity({
    id: 'methane', name: 'Methane', formula: 'CH₄', netCharge: 0, permanentDipole: false, polarizable: true,
    atoms: [
      { id: 'c', label: 'C', element: 'C', x: 110, y: 110, partialCharge: null },
      { id: 'h1', label: 'H', element: 'H', x: 110, y: 42, partialCharge: null },
      { id: 'h2', label: 'H', element: 'H', x: 178, y: 110, partialCharge: null },
      { id: 'h3', label: 'H', element: 'H', x: 110, y: 178, partialCharge: null },
      { id: 'h4', label: 'H', element: 'H', x: 42, y: 110, partialCharge: null },
    ],
    bonds: [
      { id: 'c-h1', a: 'c', b: 'h1', order: 1 }, { id: 'c-h2', a: 'c', b: 'h2', order: 1 },
      { id: 'c-h3', a: 'c', b: 'h3', order: 1 }, { id: 'c-h4', a: 'c', b: 'h4', order: 1 },
    ],
    sites: [{ id: 'cloud', label: 'polarizable cloud', x: 194, y: 110, directionDeg: 0, role: 'polarizable-cloud', orientationFree: true }],
    boundary: 'The drawing is a symbolic neutral polarizable entity, not an electron-density or molecular-dynamics calculation.',
  }),
  'hydrogen-chloride': freezeEntity({
    id: 'hydrogen-chloride', name: 'Hydrogen chloride', formula: 'HCl', netCharge: 0, permanentDipole: true, polarizable: true,
    atoms: [
      { id: 'cl', label: 'Cl', element: 'Cl', x: 68, y: 110, partialCharge: 'negative' },
      { id: 'h', label: 'H', element: 'H', x: 152, y: 110, partialCharge: 'positive' },
    ],
    bonds: [{ id: 'h-cl', a: 'h', b: 'cl', order: 1 }],
    sites: [
      { id: 'h-positive', label: 'δ+ hydrogen end', x: 184, y: 110, directionDeg: 0, role: 'partial-positive' },
      { id: 'cl-negative', label: 'δ− chlorine end', x: 35, y: 110, directionDeg: 180, role: 'partial-negative' },
      { id: 'cloud', label: 'polarizable cloud', x: 110, y: 35, directionDeg: -90, role: 'polarizable-cloud', orientationFree: true },
    ],
    boundary: 'Partial-charge marks are declared qualitative teaching roles; no dipole magnitude or acid behaviour is inferred.',
  }),
  water: freezeEntity({
    id: 'water', name: 'Water', formula: 'H₂O', netCharge: 0, permanentDipole: true, polarizable: true,
    atoms: [
      { id: 'o', label: 'O', element: 'O', x: 110, y: 122, partialCharge: 'negative' },
      { id: 'h1', label: 'H', element: 'H', x: 60, y: 70, partialCharge: 'positive' },
      { id: 'h2', label: 'H', element: 'H', x: 160, y: 70, partialCharge: 'positive' },
    ],
    bonds: [{ id: 'o-h1', a: 'o', b: 'h1', order: 1 }, { id: 'o-h2', a: 'o', b: 'h2', order: 1 }],
    sites: [
      { id: 'h1-donor', label: 'δ+ donor H(left)', x: 45, y: 55, directionDeg: -135, role: 'donor-hydrogen' },
      { id: 'h2-donor', label: 'δ+ donor H(right)', x: 175, y: 55, directionDeg: -45, role: 'donor-hydrogen' },
      { id: 'o-negative', label: 'δ− oxygen end', x: 110, y: 174, directionDeg: 90, role: 'partial-negative' },
      { id: 'o-acceptor', label: 'oxygen acceptor region', x: 110, y: 194, directionDeg: 90, role: 'acceptor-region' },
      { id: 'cloud', label: 'polarizable cloud', x: 194, y: 122, directionDeg: 0, role: 'polarizable-cloud', orientationFree: true },
    ],
    boundary: 'The V-shaped drawing and partial ends are qualitative; no measured geometry, dipole, lone-pair orbital, or liquid structure is calculated.',
  }),
  acetone: freezeEntity({
    id: 'acetone', name: 'Acetone', formula: '(CH₃)₂CO', netCharge: 0, permanentDipole: true, polarizable: true,
    atoms: [
      { id: 'o', label: 'O', element: 'O', x: 42, y: 110, partialCharge: 'negative' },
      { id: 'c', label: 'C', element: 'C', x: 105, y: 110, partialCharge: 'positive' },
      { id: 'm1', label: 'CH₃', element: 'group', x: 167, y: 64, partialCharge: null },
      { id: 'm2', label: 'CH₃', element: 'group', x: 167, y: 156, partialCharge: null },
    ],
    bonds: [{ id: 'c-o', a: 'c', b: 'o', order: 2 }, { id: 'c-m1', a: 'c', b: 'm1', order: 1 }, { id: 'c-m2', a: 'c', b: 'm2', order: 1 }],
    sites: [
      { id: 'o-negative', label: 'δ− carbonyl oxygen', x: 18, y: 110, directionDeg: 180, role: 'partial-negative' },
      { id: 'o-acceptor', label: 'carbonyl acceptor region', x: 18, y: 132, directionDeg: 180, role: 'acceptor-region' },
      { id: 'c-positive', label: 'δ+ carbonyl carbon', x: 122, y: 110, directionDeg: 0, role: 'partial-positive' },
      { id: 'cloud', label: 'polarizable cloud', x: 110, y: 25, directionDeg: -90, role: 'polarizable-cloud', orientationFree: true },
    ],
    boundary: 'This frozen carbonyl sketch supplies declared partial and acceptor roles only; no conformer, charge density, basicity, or solvent property is predicted.',
  }),
  'sodium-ion': freezeEntity({
    id: 'sodium-ion', name: 'Sodium ion', formula: 'Na⁺', netCharge: 1, permanentDipole: false, polarizable: false,
    atoms: [{ id: 'na', label: 'Na⁺', element: 'Na', x: 110, y: 110, partialCharge: null }],
    bonds: [],
    sites: [{ id: 'cation', label: 'positive ion', x: 110, y: 110, directionDeg: 0, role: 'cation', orientationFree: true }],
    boundary: 'The isolated ion symbol carries formal charge only; no ionic radius, hydration energy, or concentration is assigned.',
  }),
  'chloride-ion': freezeEntity({
    id: 'chloride-ion', name: 'Chloride ion', formula: 'Cl⁻', netCharge: -1, permanentDipole: false, polarizable: false,
    atoms: [{ id: 'cl', label: 'Cl⁻', element: 'Cl', x: 110, y: 110, partialCharge: null }],
    bonds: [],
    sites: [{ id: 'anion', label: 'negative ion', x: 110, y: 110, directionDeg: 0, role: 'anion', orientationFree: true }],
    boundary: 'The isolated ion symbol carries formal charge only; no ionic radius, hydration energy, or concentration is assigned.',
  }),
});

export const INTERACTION_ENTITY_BY_ID = INTERACTION_ENTITIES;

const freezeContact = (contact) => Object.freeze({
  ...contact,
  ...(contact.referenceRotationsDeg ? { referenceRotationsDeg: Object.freeze({ ...contact.referenceRotationsDeg }) } : {}),
});
const freezePair = (scenario) => Object.freeze({
  ...scenario,
  familiesPresent: Object.freeze([...scenario.familiesPresent]),
  defaultRotationsDeg: Object.freeze({ ...scenario.defaultRotationsDeg }),
  validContacts: Object.freeze(scenario.validContacts.map(freezeContact)),
});

export const INTERACTION_PAIR_SCENARIOS = Object.freeze([
  freezePair({
    id: 'methane-methane', name: 'Methane / methane', entityAId: 'methane', entityBId: 'methane',
    familiesPresent: ['london-dispersion'], focusFamilyId: 'london-dispersion', defaultRotationsDeg: { a: 0, b: 180 },
    validContacts: [{ id: 'methane-cloud-contact', familyId: 'london-dispersion', aSiteId: 'cloud', bSiteId: 'cloud', alignmentToleranceDeg: 180, explanation: 'Both declared neutral entities expose polarizable-cloud ports; this model assigns no preferred orientation.' }],
    teachingQuestion: 'Why does an apolar pair still have an attractive interaction family?',
    misconception: 'Apolar does not mean interaction-free. London dispersion is the implemented family here.',
    boundary: 'No instantaneous dipole, polarizability magnitude, distance dependence, or methane property is calculated.',
  }),
  freezePair({
    id: 'hcl-hcl', name: 'Hydrogen chloride / hydrogen chloride', entityAId: 'hydrogen-chloride', entityBId: 'hydrogen-chloride',
    familiesPresent: ['london-dispersion', 'dipole-dipole'], focusFamilyId: 'dipole-dipole', defaultRotationsDeg: { a: 0, b: 180 },
    validContacts: [
      { id: 'hcl-opposite-ends', familyId: 'dipole-dipole', aSiteId: 'h-positive', bSiteId: 'cl-negative', alignmentToleranceDeg: 22, referenceRotationsDeg: { a: 0, b: 0 }, explanation: 'The declared δ+ hydrogen end and δ− chlorine end face one another.' },
      { id: 'hcl-cloud-contact', familyId: 'london-dispersion', aSiteId: 'cloud', bSiteId: 'cloud', alignmentToleranceDeg: 180, explanation: 'Both polar molecules remain polarizable, so dispersion is also present.' },
    ],
    teachingQuestion: 'Why is dipole–dipole not the only family in a polar molecular pair?',
    misconception: 'Permanent dipoles add an orientation-sensitive family; they do not turn dispersion off.',
    boundary: 'The HCl labels support a qualitative contact exercise only; no boiling point, acid behaviour, or dimer energy is inferred.',
  }),
  freezePair({
    id: 'water-water', name: 'Water / water', entityAId: 'water', entityBId: 'water',
    familiesPresent: ['london-dispersion', 'dipole-dipole', 'hydrogen-bond'], focusFamilyId: 'hydrogen-bond', defaultRotationsDeg: { a: 0, b: 0 },
    validContacts: [
      { id: 'water-h2-to-water-o', familyId: 'hydrogen-bond', aSiteId: 'h2-donor', bSiteId: 'o-acceptor', alignmentToleranceDeg: 24, referenceRotationsDeg: { a: 45, b: 90 }, explanation: 'A declared donor hydrogen faces the second water oxygen acceptor region.' },
      { id: 'water-h1-to-water-o', familyId: 'hydrogen-bond', aSiteId: 'h1-donor', bSiteId: 'o-acceptor', alignmentToleranceDeg: 24, referenceRotationsDeg: { a: 135, b: 90 }, explanation: 'The other declared donor hydrogen can face the second water oxygen acceptor region.' },
      { id: 'water-opposite-dipole-ends', familyId: 'dipole-dipole', aSiteId: 'h2-donor', bSiteId: 'o-negative', alignmentToleranceDeg: 28, referenceRotationsDeg: { a: 45, b: 90 }, explanation: 'The declared positive and negative molecular ends face one another.' },
      { id: 'water-cloud-contact', familyId: 'london-dispersion', aSiteId: 'cloud', bSiteId: 'cloud', alignmentToleranceDeg: 180, explanation: 'Both water entities are also polarizable in this family inventory.' },
    ],
    teachingQuestion: 'How can one water pair support three named introductory families at once?',
    misconception: 'Hydrogen bonding is an additional specific contact, not a replacement name for every force in the pair.',
    boundary: 'This two-entity drawing is not a liquid-water network, measured geometry, lifetime, or energy distribution.',
  }),
  freezePair({
    id: 'water-acetone', name: 'Water / acetone', entityAId: 'water', entityBId: 'acetone',
    familiesPresent: ['london-dispersion', 'dipole-dipole', 'hydrogen-bond'], focusFamilyId: 'hydrogen-bond', defaultRotationsDeg: { a: 0, b: 90 },
    validContacts: [
      { id: 'water-h2-to-acetone-o', familyId: 'hydrogen-bond', aSiteId: 'h2-donor', bSiteId: 'o-acceptor', alignmentToleranceDeg: 24, referenceRotationsDeg: { a: 45, b: 0 }, explanation: 'The declared water donor hydrogen faces the declared carbonyl-oxygen acceptor region.' },
      { id: 'water-h1-to-acetone-o', familyId: 'hydrogen-bond', aSiteId: 'h1-donor', bSiteId: 'o-acceptor', alignmentToleranceDeg: 24, referenceRotationsDeg: { a: 135, b: 0 }, explanation: 'The alternate water donor hydrogen faces the declared carbonyl-oxygen acceptor region.' },
      { id: 'water-acetone-dipole', familyId: 'dipole-dipole', aSiteId: 'h2-donor', bSiteId: 'o-negative', alignmentToleranceDeg: 28, referenceRotationsDeg: { a: 45, b: 0 }, explanation: 'Opposite declared partial-charge ends face one another.' },
      { id: 'water-acetone-cloud', familyId: 'london-dispersion', aSiteId: 'cloud', bSiteId: 'cloud', alignmentToleranceDeg: 180, explanation: 'Both neutral molecular entities also contribute dispersion.' },
    ],
    teachingQuestion: 'Which molecule supplies the donor hydrogen, and which supplies the acceptor region?',
    misconception: 'A carbonyl oxygen can be a declared acceptor here without acetone supplying an O–H donor hydrogen.',
    boundary: 'No miscibility, solvation free energy, basicity, extraction behaviour, or reaction is inferred.',
  }),
  freezePair({
    id: 'sodium-water', name: 'Sodium ion / water', entityAId: 'sodium-ion', entityBId: 'water',
    familiesPresent: ['ion-dipole'], focusFamilyId: 'ion-dipole', defaultRotationsDeg: { a: 0, b: 0 },
    validContacts: [{ id: 'sodium-to-water-oxygen', familyId: 'ion-dipole', aSiteId: 'cation', bSiteId: 'o-negative', alignmentToleranceDeg: 24, referenceRotationsDeg: { a: 0, b: 90 }, explanation: 'The δ− oxygen end of water faces the positive ion.' }],
    teachingQuestion: 'Which end of a water dipole should face a positive ion?',
    misconception: 'The water molecule remains covalently intact; this model changes orientation, not O–H bonds.',
    boundary: 'This focus scenario does not inventory ion-induced terms or calculate hydration, concentration, structure, or solubility.',
  }),
  freezePair({
    id: 'chloride-water', name: 'Chloride ion / water', entityAId: 'chloride-ion', entityBId: 'water',
    familiesPresent: ['ion-dipole'], focusFamilyId: 'ion-dipole', defaultRotationsDeg: { a: 0, b: 0 },
    validContacts: [
      { id: 'chloride-to-water-h1', familyId: 'ion-dipole', aSiteId: 'anion', bSiteId: 'h1-donor', alignmentToleranceDeg: 24, referenceRotationsDeg: { a: 0, b: -45 }, explanation: 'A δ+ hydrogen end of water faces the negative ion.' },
      { id: 'chloride-to-water-h2', familyId: 'ion-dipole', aSiteId: 'anion', bSiteId: 'h2-donor', alignmentToleranceDeg: 24, referenceRotationsDeg: { a: 0, b: -135 }, explanation: 'The alternate δ+ hydrogen end can face the negative ion.' },
    ],
    teachingQuestion: 'Why does reversing the ion sign reverse the favored water end?',
    misconception: 'The anion attracts the positive end of the dipole; the app does not move or transfer a proton.',
    boundary: 'This focus scenario does not calculate hydration, hydrogen-bond competition, concentration, structure, or solubility.',
  }),
]);

export const INTERACTION_PAIR_BY_ID = Object.freeze(Object.fromEntries(INTERACTION_PAIR_SCENARIOS.map((scenario) => [scenario.id, scenario])));

const SHELL_SLOTS = Object.freeze([0, 60, 120, 180, 240, 300].map((angleDeg, index) => Object.freeze({ id: `s${index}`, angleDeg })));
const freezeShell = (scenario) => Object.freeze({ ...scenario, slots: SHELL_SLOTS });

export const SOLVATION_SHELL_SCENARIOS = Object.freeze([
  freezeShell({
    id: 'sodium-water-shell', name: 'Na⁺ symbolic water shell', ionEntityId: 'sodium-ion', expectedInwardEnd: 'oxygen',
    teachingQuestion: 'Can you orient every water compass with its δ− end toward Na⁺?',
    misconception: 'Six visible waters are interface slots, not a sodium hydration number.',
    boundary: 'The radial shell is a symbolic orientation exercise, not a measured coordination number, geometry, energy, concentration, or dynamic solvent structure.',
  }),
  freezeShell({
    id: 'chloride-water-shell', name: 'Cl⁻ symbolic water shell', ionEntityId: 'chloride-ion', expectedInwardEnd: 'hydrogen',
    teachingQuestion: 'Can you reverse every water compass so a δ+ hydrogen end faces Cl⁻?',
    misconception: 'Hydrogen-in orientation does not mean proton transfer or covalent bonding to chloride.',
    boundary: 'The radial shell is a symbolic orientation exercise, not a measured coordination number, geometry, energy, concentration, or dynamic solvent structure.',
  }),
]);

export const SOLVATION_SHELL_BY_ID = Object.freeze(Object.fromEntries(SOLVATION_SHELL_SCENARIOS.map((scenario) => [scenario.id, scenario])));

export const INTERMOLECULAR_MODEL_BOUNDARY = Object.freeze({
  included: 'Four declared introductory families, six frozen pair scenarios, manual site selection and rotations, one explicit bridge, manual cleavage, and two six-water symbolic ion shells.',
  coexistence: 'Family inventories can contain more than one entry. London dispersion remains present in the declared polar neutral pairs.',
  geometry: 'Angles are dimensionless interface geometry used to compare selected port directions with frozen teaching alignments; they are not optimized or measured molecular geometry.',
  excluded: 'Dipole-induced dipole, quadrupoles, specialized sigma-hole interactions, pi stacking, cation-pi, hydrophobic effect, host–guest binding, intramolecular contacts, cooperative networks, solvent competition, dielectric response, energies, distances, rates, bulk properties, phases, reactions, and biological activity.',
  property: 'No interaction label is converted into boiling point, melting point, viscosity, surface tension, vapour pressure, solubility, miscibility, extraction, or retention prediction.',
  shell: 'Six waters are symbolic orientation compasses. They are not a hydration number, coordination structure, concentration, or molecular-dynamics frame.',
  covalent: 'Forming or breaking a displayed interaction bridge changes no covalent bond, formal charge, atom identity, or molecule connectivity.',
  data: 'All roles, contacts, and reference orientations are frozen local teaching records; no property database, force field, electronic-structure program, or remote service is queried.',
});
