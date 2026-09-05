const length = ([x, y, z]) => Math.hypot(x, y, z);
const normalized = (vector) => {
  const magnitude = length(vector);
  return Object.freeze(vector.map((value) => value / magnitude));
};

const GEOMETRY_RECORDS = {
  linear: {
    name: 'Linear',
    domainCount: 2,
    nominalAngles: [180],
    conventionalHybridLabel: 'sp',
    sites: [
      { id: 'l0', class: 'equivalent', vector: [-1, 0, 0], oppositeId: 'l1' },
      { id: 'l1', class: 'equivalent', vector: [1, 0, 0], oppositeId: 'l0' },
    ],
  },
  trigonalPlanar: {
    name: 'Trigonal planar',
    domainCount: 3,
    nominalAngles: [120],
    conventionalHybridLabel: 'sp²',
    sites: [
      { id: 'p0', class: 'equivalent', vector: [1, 0, 0] },
      { id: 'p1', class: 'equivalent', vector: [-0.5, Math.sqrt(3) / 2, 0] },
      { id: 'p2', class: 'equivalent', vector: [-0.5, -Math.sqrt(3) / 2, 0] },
    ],
  },
  tetrahedral: {
    name: 'Tetrahedral',
    domainCount: 4,
    nominalAngles: [109.47],
    conventionalHybridLabel: 'sp³',
    sites: [
      { id: 't0', class: 'equivalent', vector: [1, 1, 1] },
      { id: 't1', class: 'equivalent', vector: [-1, -1, 1] },
      { id: 't2', class: 'equivalent', vector: [-1, 1, -1] },
      { id: 't3', class: 'equivalent', vector: [1, -1, -1] },
    ],
  },
  trigonalBipyramidal: {
    name: 'Trigonal bipyramidal',
    domainCount: 5,
    nominalAngles: [90, 120, 180],
    conventionalHybridLabel: 'sp³d',
    hybridBoundary: 'Introductory localized label only; it does not establish central-atom d-orbital participation or a modern hypervalent bonding description.',
    sites: [
      { id: 'aTop', class: 'axial', vector: [0, 0, 1], oppositeId: 'aBottom' },
      { id: 'aBottom', class: 'axial', vector: [0, 0, -1], oppositeId: 'aTop' },
      { id: 'e0', class: 'equatorial', vector: [1, 0, 0] },
      { id: 'e1', class: 'equatorial', vector: [-0.5, Math.sqrt(3) / 2, 0] },
      { id: 'e2', class: 'equatorial', vector: [-0.5, -Math.sqrt(3) / 2, 0] },
    ],
  },
  octahedral: {
    name: 'Octahedral',
    domainCount: 6,
    nominalAngles: [90, 180],
    conventionalHybridLabel: 'sp³d²',
    hybridBoundary: 'Introductory localized label only; it does not establish central-atom d-orbital participation or a modern hypervalent bonding description.',
    sites: [
      { id: 'xPlus', class: 'equivalent', vector: [1, 0, 0], oppositeId: 'xMinus' },
      { id: 'xMinus', class: 'equivalent', vector: [-1, 0, 0], oppositeId: 'xPlus' },
      { id: 'yPlus', class: 'equivalent', vector: [0, 1, 0], oppositeId: 'yMinus' },
      { id: 'yMinus', class: 'equivalent', vector: [0, -1, 0], oppositeId: 'yPlus' },
      { id: 'zPlus', class: 'equivalent', vector: [0, 0, 1], oppositeId: 'zMinus' },
      { id: 'zMinus', class: 'equivalent', vector: [0, 0, -1], oppositeId: 'zPlus' },
    ],
  },
};

export const ELECTRON_DOMAIN_GEOMETRIES = Object.freeze(Object.fromEntries(
  Object.entries(GEOMETRY_RECORDS).map(([id, geometry]) => [id, Object.freeze({
    id,
    ...geometry,
    nominalAngles: Object.freeze([...geometry.nominalAngles]),
    sites: Object.freeze(geometry.sites.map((site) => Object.freeze({
      ...site,
      vector: normalized(site.vector),
    }))),
  })]),
));

export const ELECTRON_DOMAIN_GEOMETRY_LIST = Object.freeze(Object.values(ELECTRON_DOMAIN_GEOMETRIES));

const bond = (id, label, pull = 1) => ({ id, kind: 'bond', label, pull });
const lonePair = (id) => ({ id, kind: 'lonePair', label: 'LP', pull: 0 });

const RAW_SCENARIOS = [
  {
    id: 'carbonDioxide', formula: 'CO₂', name: 'Carbon dioxide', family: '2 domains', geometryId: 'linear', centralLabel: 'C', ax: 'AX₂',
    domains: [bond('o1', 'O'), bond('o2', 'O')], referenceSites: { o1: 'l0', o2: 'l1' },
    shape: 'linear', nominalAngles: [180], teachingNote: 'Two equal opposite pulls cancel in this idealized linear picture.',
  },
  {
    id: 'boronTrifluoride', formula: 'BF₃', name: 'Boron trifluoride', family: '3 domains', geometryId: 'trigonalPlanar', centralLabel: 'B', ax: 'AX₃',
    domains: [bond('f1', 'F'), bond('f2', 'F'), bond('f3', 'F')], referenceSites: { f1: 'p0', f2: 'p1', f3: 'p2' },
    shape: 'trigonal planar', nominalAngles: [120], teachingNote: 'Three equal planar pulls cancel by threefold symmetry.',
  },
  {
    id: 'sulfurDioxide', formula: 'SO₂', name: 'Sulfur dioxide', family: '3 domains', geometryId: 'trigonalPlanar', centralLabel: 'S', ax: 'AX₂E',
    domains: [bond('o1', 'O'), bond('o2', 'O'), lonePair('lp1')], referenceSites: { lp1: 'p0', o1: 'p1', o2: 'p2' },
    shape: 'bent', nominalAngles: [120], teachingNote: 'The displayed angle is the ideal three-domain parent angle, not a measured SO₂ angle.',
  },
  {
    id: 'methane', formula: 'CH₄', name: 'Methane', family: '4 domains', geometryId: 'tetrahedral', centralLabel: 'C', ax: 'AX₄',
    domains: [bond('h1', 'H', 0.25), bond('h2', 'H', 0.25), bond('h3', 'H', 0.25), bond('h4', 'H', 0.25)],
    referenceSites: { h1: 't0', h2: 't1', h3: 't2', h4: 't3' },
    shape: 'tetrahedral', nominalAngles: [109.47], teachingNote: 'Four equal tetrahedral pulls cancel in the declared vector model.',
  },
  {
    id: 'ammonia', formula: 'NH₃', name: 'Ammonia', family: '4 domains', geometryId: 'tetrahedral', centralLabel: 'N', ax: 'AX₃E',
    domains: [bond('h1', 'H', 0.25), bond('h2', 'H', 0.25), bond('h3', 'H', 0.25), lonePair('lp1')],
    referenceSites: { h1: 't0', h2: 't1', h3: 't2', lp1: 't3' },
    shape: 'trigonal pyramidal', nominalAngles: [109.47], teachingNote: 'The displayed angle is the ideal tetrahedral parent angle, not a measured NH₃ angle.',
  },
  {
    id: 'water', formula: 'H₂O', name: 'Water', family: '4 domains', geometryId: 'tetrahedral', centralLabel: 'O', ax: 'AX₂E₂',
    domains: [bond('h1', 'H', 0.35), bond('h2', 'H', 0.35), lonePair('lp1'), lonePair('lp2')],
    referenceSites: { h1: 't0', h2: 't1', lp1: 't2', lp2: 't3' },
    shape: 'bent', nominalAngles: [109.47], teachingNote: 'The displayed 109.47° is the ideal tetrahedral parent angle; real water is distorted from it.',
  },
  {
    id: 'chloromethane', formula: 'CH₃Cl', name: 'Chloromethane', family: '4 domains', geometryId: 'tetrahedral', centralLabel: 'C', ax: 'AX₄',
    domains: [bond('h1', 'H', 0.25), bond('h2', 'H', 0.25), bond('h3', 'H', 0.25), bond('cl1', 'Cl', 1)],
    referenceSites: { h1: 't0', h2: 't1', h3: 't2', cl1: 't3' },
    shape: 'tetrahedral', nominalAngles: [109.47], teachingNote: 'Illustrative unequal pulls prevent tetrahedral cancellation; values are relative learner controls, not measured bond moments.',
  },
  {
    id: 'phosphorusPentachloride', formula: 'PCl₅', name: 'Phosphorus pentachloride', family: '5 domains', geometryId: 'trigonalBipyramidal', centralLabel: 'P', ax: 'AX₅',
    domains: [bond('cl1', 'Cl'), bond('cl2', 'Cl'), bond('cl3', 'Cl'), bond('cl4', 'Cl'), bond('cl5', 'Cl')],
    referenceSites: { cl1: 'aTop', cl2: 'aBottom', cl3: 'e0', cl4: 'e1', cl5: 'e2' },
    shape: 'trigonal bipyramidal', nominalAngles: [90, 120, 180], teachingNote: 'Five equal pulls cancel in the ideal parent geometry.',
  },
  {
    id: 'sulfurTetrafluoride', formula: 'SF₄', name: 'Sulfur tetrafluoride', family: '5 domains', geometryId: 'trigonalBipyramidal', centralLabel: 'S', ax: 'AX₄E',
    domains: [bond('f1', 'F'), bond('f2', 'F'), bond('f3', 'F'), bond('f4', 'F'), lonePair('lp1')],
    referenceSites: { f1: 'aTop', f2: 'aBottom', lp1: 'e0', f3: 'e1', f4: 'e2' },
    shape: 'seesaw', nominalAngles: [90, 120, 180], teachingNote: 'The electron-domain model prefers the lone pair in an equatorial site.',
  },
  {
    id: 'chlorineTrifluoride', formula: 'ClF₃', name: 'Chlorine trifluoride', family: '5 domains', geometryId: 'trigonalBipyramidal', centralLabel: 'Cl', ax: 'AX₃E₂',
    domains: [bond('f1', 'F'), bond('f2', 'F'), bond('f3', 'F'), lonePair('lp1'), lonePair('lp2')],
    referenceSites: { f1: 'aTop', f2: 'aBottom', f3: 'e2', lp1: 'e0', lp2: 'e1' },
    shape: 'T-shaped', nominalAngles: [90, 180], teachingNote: 'Two equatorial lone pairs leave two axial bonds and one equatorial bond visible.',
  },
  {
    id: 'xenonDifluoride', formula: 'XeF₂', name: 'Xenon difluoride', family: '5 domains', geometryId: 'trigonalBipyramidal', centralLabel: 'Xe', ax: 'AX₂E₃',
    domains: [bond('f1', 'F'), bond('f2', 'F'), lonePair('lp1'), lonePair('lp2'), lonePair('lp3')],
    referenceSites: { f1: 'aTop', f2: 'aBottom', lp1: 'e0', lp2: 'e1', lp3: 'e2' },
    shape: 'linear', nominalAngles: [180], teachingNote: 'Three equatorial lone pairs leave the two opposite axial bonds visible.',
  },
  {
    id: 'sulfurHexafluoride', formula: 'SF₆', name: 'Sulfur hexafluoride', family: '6 domains', geometryId: 'octahedral', centralLabel: 'S', ax: 'AX₆',
    domains: [bond('f1', 'F'), bond('f2', 'F'), bond('f3', 'F'), bond('f4', 'F'), bond('f5', 'F'), bond('f6', 'F')],
    referenceSites: { f1: 'xPlus', f2: 'xMinus', f3: 'yPlus', f4: 'yMinus', f5: 'zPlus', f6: 'zMinus' },
    shape: 'octahedral', nominalAngles: [90, 180], teachingNote: 'Six equal pulls cancel in the ideal octahedral parent geometry.',
  },
  {
    id: 'brominePentafluoride', formula: 'BrF₅', name: 'Bromine pentafluoride', family: '6 domains', geometryId: 'octahedral', centralLabel: 'Br', ax: 'AX₅E',
    domains: [bond('f1', 'F'), bond('f2', 'F'), bond('f3', 'F'), bond('f4', 'F'), bond('f5', 'F'), lonePair('lp1')],
    referenceSites: { f1: 'xPlus', f2: 'xMinus', f3: 'yPlus', f4: 'yMinus', f5: 'zMinus', lp1: 'zPlus' },
    shape: 'square pyramidal', nominalAngles: [90, 180], teachingNote: 'Any one octahedral lone-pair site is equivalent in this ideal parent model.',
  },
  {
    id: 'xenonTetrafluoride', formula: 'XeF₄', name: 'Xenon tetrafluoride', family: '6 domains', geometryId: 'octahedral', centralLabel: 'Xe', ax: 'AX₄E₂',
    domains: [bond('f1', 'F'), bond('f2', 'F'), bond('f3', 'F'), bond('f4', 'F'), lonePair('lp1'), lonePair('lp2')],
    referenceSites: { f1: 'xPlus', f2: 'xMinus', f3: 'yPlus', f4: 'yMinus', lp1: 'zPlus', lp2: 'zMinus' },
    shape: 'square planar', nominalAngles: [90, 180], teachingNote: 'The ideal model places two lone pairs on opposite octahedral sites.',
  },
];

const freezeScenario = (scenario) => Object.freeze({
  ...scenario,
  domains: Object.freeze(scenario.domains.map((domain) => Object.freeze({ ...domain }))),
  referenceSites: Object.freeze({ ...scenario.referenceSites }),
  nominalAngles: Object.freeze([...scenario.nominalAngles]),
});

export const MOLECULAR_GEOMETRY_SCENARIOS = Object.freeze(RAW_SCENARIOS.map(freezeScenario));
export const MOLECULAR_GEOMETRY_SCENARIO_BY_ID = Object.freeze(Object.fromEntries(
  MOLECULAR_GEOMETRY_SCENARIOS.map((scenario) => [scenario.id, scenario]),
));

export const MOLECULAR_GEOMETRY_MODEL_BOUNDARY = Object.freeze({
  included: 'Fourteen declared AXmEn electron-domain examples, ideal parent cages, nominal parent angles, manual domain placement, and relative bond-pull vector cancellation.',
  excluded: 'Arbitrary molecule prediction, optimized or measured geometry, quantitative dipole moments, modern hypervalent bonding, molecular orbitals, energy, spectroscopy, reactivity, and intermolecular forces.',
  vectorConvention: 'Arrows show an illustrative outward electron-pull convention in relative units. Their resultant is not a measured electric dipole moment and does not imply the IUPAC dipole-vector sign convention.',
});
