const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

export const STEREOCHEMICAL_REACTION_CONSTANTS = deepFreeze({
  centreLabels: ['C2', 'C3'],
  backsideAxisDeg: 180,
  leavingGroupAxisDeg: 0,
  sn2BacksideToleranceDeg: 15,
  e2AntiperiplanarToleranceDeg: 15,
  torsionRanges: [
    { id: 'synperiplanar', minimumDeg: 0, maximumDeg: 30, maximumInclusive: false },
    { id: 'synclinal', minimumDeg: 30, maximumDeg: 90, maximumInclusive: false },
    { id: 'anticlinal', minimumDeg: 90, maximumDeg: 150, maximumInclusive: false },
    { id: 'antiperiplanar', minimumDeg: 150, maximumDeg: 180, maximumInclusive: true },
  ],
  relationshipPredictionDimensions: ['differingCentreCount', 'relationship', 'chiralityPair', 'scope'],
  sn2PredictionDimensions: ['approachClass', 'productRelease', 'geometryOutcome', 'descriptorRelation'],
  e2PredictionDimensions: ['torsionRange', 'gatePermission', 'productResult', 'scope'],
});

const MULTICENTRE_PRIORITY_RIBBONS = [
  {
    centreId: 'C2',
    order: ['A2', 'chain toward C3', 'B2', 'H2'],
    note: 'This frozen local order supplies the displayed C2 letter; it is not recalculated from an arbitrary graph.',
  },
  {
    centreId: 'C3',
    order: ['A3', 'chain toward C2', 'B3', 'H3'],
    note: 'This frozen local order supplies the displayed C3 letter; symmetry is declared separately.',
  },
];

const multicentreScenario = ({
  id,
  code,
  label,
  connectivityLabel,
  symmetricCentres,
  specimenA,
  specimenB,
  expectedRelationship,
  teachingContrast,
}) => ({
  id,
  code,
  label,
  connectivityLabel,
  symmetricCentres,
  centreLabels: ['C2', 'C3'],
  priorityRibbons: MULTICENTRE_PRIORITY_RIBBONS,
  initialSpecimenA: specimenA,
  initialSpecimenB: specimenB,
  expectedRelationship,
  symmetryRationale: symmetricCentres
    ? 'C2 and C3 occupy declared symmetry-equivalent positions. Opposite R,S and S,R displays canonicalize to one achiral meso stereoisomer.'
    : 'C2 and C3 occupy declared nonequivalent positions, so reversing their displayed order is not a symmetry operation.',
  projectionLegend: 'Fischer-style teaching projection: horizontal bonds point toward the viewer; vertical bonds point away.',
  teachingContrast,
  dataKind: 'declared-two-centre-teaching-configuration',
});

export const MULTICENTRE_SCENARIOS = deepFreeze([
  multicentreScenario({
    id: 'symmetric-rr-ss',
    code: 'REL 01',
    label: 'Symmetric mirror pair',
    connectivityLabel: 'X–C*–C*–X',
    symmetricCentres: true,
    specimenA: ['R', 'R'],
    specimenB: ['S', 'S'],
    expectedRelationship: 'enantiomers',
    teachingContrast: 'All declared centres invert and the two specimens remain nonsuperposable mirror images.',
  }),
  multicentreScenario({
    id: 'symmetric-rr-rs',
    code: 'REL 02',
    label: 'One-centre mismatch',
    connectivityLabel: 'X–C*–C*–X',
    symmetricCentres: true,
    specimenA: ['R', 'R'],
    specimenB: ['R', 'S'],
    expectedRelationship: 'diastereomers',
    teachingContrast: 'Only one displayed centre changes, so these are not a mirror pair.',
  }),
  multicentreScenario({
    id: 'symmetric-meso-pair',
    code: 'REL 03',
    label: 'Meso symmetry reveal',
    connectivityLabel: 'X–C*–C*–X',
    symmetricCentres: true,
    specimenA: ['R', 'S'],
    specimenB: ['S', 'R'],
    expectedRelationship: 'same',
    teachingContrast: 'Two displayed letters differ, yet declared internal symmetry makes both drawings the same achiral meso stereoisomer.',
  }),
  multicentreScenario({
    id: 'unsymmetric-rs-sr',
    code: 'REL 04',
    label: 'Unsymmetric mirror pair',
    connectivityLabel: 'X–C*–C*–Y',
    symmetricCentres: false,
    specimenA: ['R', 'S'],
    specimenB: ['S', 'R'],
    expectedRelationship: 'enantiomers',
    teachingContrast: 'Without internal symmetry, inversion at both declared centres gives a distinct mirror partner.',
  }),
  multicentreScenario({
    id: 'unsymmetric-rr-sr',
    code: 'REL 05',
    label: 'Unsymmetric partial inversion',
    connectivityLabel: 'X–C*–C*–Y',
    symmetricCentres: false,
    specimenA: ['R', 'R'],
    specimenB: ['S', 'R'],
    expectedRelationship: 'diastereomers',
    teachingContrast: 'One of two nonequivalent centres changes, so the specimens are stereoisomers but not mirror images.',
  }),
  multicentreScenario({
    id: 'unsymmetric-identical',
    code: 'REL 06',
    label: 'Identical configuration control',
    connectivityLabel: 'X–C*–C*–Y',
    symmetricCentres: false,
    specimenA: ['R', 'R'],
    specimenB: ['R', 'R'],
    expectedRelationship: 'same',
    teachingContrast: 'The ordered declared configurations are identical.',
  }),
]);

export const MULTICENTRE_SCENARIO_BY_ID = deepFreeze(Object.fromEntries(
  MULTICENTRE_SCENARIOS.map((scenario) => [scenario.id, scenario]),
));

const sn2Scenario = ({
  id,
  code,
  label,
  initialDescriptor,
  productDescriptor,
  descriptorRelation,
  reactantPriority,
  productPriority,
  descriptorReason,
}) => ({
  id,
  code,
  label,
  centreLabel: 'C*',
  leavingGroup: { id: 'LG', label: 'LG', role: 'declared leaving group on the 0° axis' },
  incomingGroup: { id: 'Nu', label: 'Nu:', role: 'declared incoming nucleophile controlled by the learner' },
  spectatorLigands: [
    { id: 'A', label: 'A', depth: 'near' },
    { id: 'B', label: 'B', depth: 'far' },
    { id: 'C', label: 'C', depth: 'plane' },
  ],
  initialDescriptor,
  productDescriptor,
  descriptorRelation,
  initialApproachAngleDeg: 0,
  geometryOutcome: 'inversion',
  priorityRibbon: {
    reactant: reactantPriority,
    product: productPriority,
  },
  descriptorReason,
  positionMap: {
    reactant: { A: 'near-upper', B: 'far-upper', C: 'lower' },
    product: { A: 'far-lower', B: 'near-lower', C: 'upper' },
  },
  teachingBoundary: 'The cartridge declares one concerted substitution geometry. It does not calculate reaction occurrence, rate, barrier, solvent effects, or pathway competition.',
  dataKind: 'abstract-walden-inversion-teaching-map',
});

export const SN2_STEREOCHEMISTRY_SCENARIOS = deepFreeze([
  sn2Scenario({
    id: 'priority-preserved-r-to-s',
    code: 'INV 01',
    label: 'Inversion with R → S',
    initialDescriptor: 'R',
    productDescriptor: 'S',
    descriptorRelation: 'flips',
    reactantPriority: ['LG', 'A', 'B', 'C'],
    productPriority: ['Nu', 'A', 'B', 'C'],
    descriptorReason: 'The declared incoming and leaving groups occupy the same priority rank, so inversion also flips the absolute descriptor.',
  }),
  sn2Scenario({
    id: 'priority-preserved-s-to-r',
    code: 'INV 02',
    label: 'Inversion with S → R',
    initialDescriptor: 'S',
    productDescriptor: 'R',
    descriptorRelation: 'flips',
    reactantPriority: ['LG', 'A', 'B', 'C'],
    productPriority: ['Nu', 'A', 'B', 'C'],
    descriptorReason: 'The declared priority order is retained across substitution, so geometric inversion flips S to R.',
  }),
  sn2Scenario({
    id: 'priority-reordered-r-to-r',
    code: 'INV 03',
    label: 'Inversion while R remains R',
    initialDescriptor: 'R',
    productDescriptor: 'R',
    descriptorRelation: 'same',
    reactantPriority: ['LG', 'A', 'B', 'C'],
    productPriority: ['A', 'Nu', 'B', 'C'],
    descriptorReason: 'The tetrahedral arrangement inverts, but the declared product priorities reorder; the absolute R letter therefore remains R.',
  }),
  sn2Scenario({
    id: 'priority-reordered-s-to-s',
    code: 'INV 04',
    label: 'Inversion while S remains S',
    initialDescriptor: 'S',
    productDescriptor: 'S',
    descriptorRelation: 'same',
    reactantPriority: ['LG', 'A', 'B', 'C'],
    productPriority: ['A', 'Nu', 'B', 'C'],
    descriptorReason: 'The relative geometry inverts while a declared priority reordering leaves the product descriptor S.',
  }),
  sn2Scenario({
    id: 'achiral-centre-inversion',
    code: 'INV 05',
    label: 'Inversion without an R/S label',
    initialDescriptor: null,
    productDescriptor: null,
    descriptorRelation: 'not-applicable',
    reactantPriority: ['LG', 'A', 'B', 'B'],
    productPriority: ['Nu', 'A', 'B', 'B'],
    descriptorReason: 'Two declared spectator ligands are equivalent, so geometric inversion is meaningful while an absolute R/S descriptor is not applicable.',
  }),
]);

export const SN2_STEREOCHEMISTRY_SCENARIO_BY_ID = deepFreeze(Object.fromEntries(
  SN2_STEREOCHEMISTRY_SCENARIOS.map((scenario) => [scenario.id, scenario]),
));

const frontGroups = [
  { id: 'LG', label: 'LG', angleDeg: 0, role: 'leaving group' },
  { id: 'alpha-a', label: 'Aα', angleDeg: 120, role: 'retained alpha substituent' },
  { id: 'alpha-b', label: 'Bα', angleDeg: 240, role: 'retained alpha substituent' },
];

const e2Scenario = ({
  id,
  code,
  label,
  channels,
  rearGroups,
  rotationLocked = false,
  lockedReason = null,
  teachingContrast,
}) => ({
  id,
  code,
  label,
  frontLeavingGroupAngleDeg: 0,
  initialRearRotationDeg: 0,
  rotationLocked,
  lockedReason,
  frontGroups,
  rearGroups,
  channels,
  productNotation: 'declared alkene frame',
  localPriorityNote: 'E/Z follows only the frozen remaining-substituent priorities printed on this cartridge; no regioselectivity or product-ratio comparison is performed.',
  electronRibbons: ['base→H', 'C–H→C=C', 'C–LG→LG'],
  teachingContrast,
  dataKind: 'declared-e2-stereoelectronic-teaching-channel',
});

export const E2_STEREOCHEMISTRY_SCENARIOS = deepFreeze([
  e2Scenario({
    id: 'declared-e-channel',
    code: 'ELM 01',
    label: 'Declared E channel',
    channels: [{ id: 'h-e', label: 'Hβ-E', offsetDeg: 180, productDescriptor: 'E', productNotation: 'Aα\\C=C/Bβ' }],
    rearGroups: [
      { id: 'h-e', label: 'Hβ-E', offsetDeg: 180, role: 'selectable beta hydrogen' },
      { id: 'beta-a', label: 'Aβ', offsetDeg: 60, role: 'remaining beta substituent' },
      { id: 'beta-b', label: 'Bβ', offsetDeg: 300, role: 'remaining beta substituent' },
    ],
    teachingContrast: 'The selected declared beta H begins antiperiplanar and opens the local E product frame.',
  }),
  e2Scenario({
    id: 'declared-z-channel',
    code: 'ELM 02',
    label: 'Declared Z channel',
    channels: [{ id: 'h-z', label: 'Hβ-Z', offsetDeg: 180, productDescriptor: 'Z', productNotation: 'Aα/C=C\\Aβ' }],
    rearGroups: [
      { id: 'h-z', label: 'Hβ-Z', offsetDeg: 180, role: 'selectable beta hydrogen' },
      { id: 'beta-a', label: 'Aβ', offsetDeg: 60, role: 'remaining beta substituent' },
      { id: 'beta-b', label: 'Bβ', offsetDeg: 300, role: 'remaining beta substituent' },
    ],
    teachingContrast: 'A different frozen remaining-substituent map opens a local Z product despite the same anti geometry.',
  }),
  e2Scenario({
    id: 'two-hydrogen-choice',
    code: 'ELM 03',
    label: 'Two-hydrogen choice',
    channels: [
      { id: 'h-e', label: 'Hβ-E', offsetDeg: 180, productDescriptor: 'E', productNotation: 'Aα\\C=C/Bβ' },
      { id: 'h-z', label: 'Hβ-Z', offsetDeg: 60, productDescriptor: 'Z', productNotation: 'Aα/C=C\\Aβ' },
    ],
    rearGroups: [
      { id: 'h-e', label: 'Hβ-E', offsetDeg: 180, role: 'selectable beta hydrogen' },
      { id: 'h-z', label: 'Hβ-Z', offsetDeg: 60, role: 'selectable beta hydrogen' },
      { id: 'beta-r', label: 'Rβ', offsetDeg: 300, role: 'remaining beta substituent' },
    ],
    teachingContrast: 'Selecting a different beta H does not rotate the bond; the learner must align that chosen channel explicitly.',
  }),
  e2Scenario({
    id: 'rotate-to-anti',
    code: 'ELM 04',
    label: 'Rotate to anti',
    channels: [{ id: 'h-z', label: 'Hβ-Z', offsetDeg: 60, productDescriptor: 'Z', productNotation: 'Aα/C=C\\Aβ' }],
    rearGroups: [
      { id: 'h-z', label: 'Hβ-Z', offsetDeg: 60, role: 'selectable beta hydrogen' },
      { id: 'beta-a', label: 'Aβ', offsetDeg: 180, role: 'remaining beta substituent' },
      { id: 'beta-b', label: 'Bβ', offsetDeg: 300, role: 'remaining beta substituent' },
    ],
    teachingContrast: 'The selected H starts synclinal to LG; rotating the rear carbon by 120° brings it to the antiperiplanar gate.',
  }),
  e2Scenario({
    id: 'locked-non-anti',
    code: 'ELM 05',
    label: 'Locked non-anti witness',
    channels: [{ id: 'h-locked', label: 'Hβ', offsetDeg: 60, productDescriptor: 'E', productNotation: 'Aα\\C=C/Bβ' }],
    rearGroups: [
      { id: 'h-locked', label: 'Hβ', offsetDeg: 60, role: 'selectable beta hydrogen' },
      { id: 'beta-a', label: 'Aβ', offsetDeg: 180, role: 'remaining beta substituent' },
      { id: 'beta-b', label: 'Bβ', offsetDeg: 300, role: 'remaining beta substituent' },
    ],
    rotationLocked: true,
    lockedReason: 'This abstract conformer is declared locked. Its selected H remains outside the antiperiplanar gate, so this displayed E2 frame cannot open.',
    teachingContrast: 'A frozen non-anti conformation demonstrates a local geometry refusal without claiming that every real pathway is impossible.',
  }),
]);

export const E2_STEREOCHEMISTRY_SCENARIO_BY_ID = deepFreeze(Object.fromEntries(
  E2_STEREOCHEMISTRY_SCENARIOS.map((scenario) => [scenario.id, scenario]),
));

export const STEREOCHEMICAL_REACTION_BOUNDARY = deepFreeze({
  included: 'Six declared two-centre relationship cartridges, five abstract Walden-inversion maps, and five declared E2 beta-hydrogen channels with explicit learner-controlled geometry gates.',
  multicentre: 'Classification is limited to exactly two declared stereogenic centres with frozen local R/S letters and a declared symmetry flag. It is not a recursive CIP or molecular-symmetry engine.',
  sn2: 'The 15° backside aperture is a teaching gate for the displayed concerted inversion path. Geometric inversion is reported separately from any absolute R/S letter change.',
  e2: 'The 15° antiperiplanar aperture gates only the selected declared beta-H channel. Its local E/Z consequence is frozen data, not a rate, yield, regioselectivity, or product-ratio prediction.',
  terminology: 'Stereospecificity and stereoselectivity are distinct concepts. Anti is a broader relative-orientation term than the antiperiplanar torsion range.',
  excluded: 'Arbitrary graphs, more than two centres, pseudoasymmetry, rings and chairs, axial/planar/helical chirality, SN1/E1, rearrangements, competing pathways, rates, barriers, solvent, product ratios, measured evidence, experimental validation, and operational procedure.',
  runtime: 'Every cartridge, angle, classification, score, release decision, and hint runs locally. No database, language model, reaction predictor, or remote service is queried at runtime.',
});

