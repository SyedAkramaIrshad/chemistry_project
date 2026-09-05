const freezePoint = (point) => Object.freeze([...point]);
const freezeSite = (site) => Object.freeze({ ...site, point: freezePoint(site.point) });

export const TETRAHEDRAL_SITES = Object.freeze([
  freezeSite({ id: 'northEastNear', label: 'near upper site', point: [1, 1, 1] }),
  freezeSite({ id: 'southWestNear', label: 'near lower site', point: [-1, -1, 1] }),
  freezeSite({ id: 'northWestFar', label: 'far upper site', point: [-1, 1, -1] }),
  freezeSite({ id: 'southEastFar', label: 'far lower site', point: [1, -1, -1] }),
]);

const group = (id, label, priority, comparison, tone) => Object.freeze({ id, label, priority, comparison, tone });
const freezeArrangement = (arrangement) => Object.freeze({ ...arrangement });
const freezeTetrahedralScenario = (scenario) => Object.freeze({
  ...scenario,
  groups: Object.freeze(scenario.groups),
  initialArrangement: freezeArrangement(scenario.initialArrangement),
});

const RAW_TETRAHEDRAL_SCENARIOS = [
  {
    id: 'lactic-acid-set', name: 'Lactic-acid priority set', formulaLabel: 'C*(OH)(CO₂H)(CH₃)(H)', expectedDescriptor: 'S',
    groups: [
      group('oh', 'OH', 1, 'The directly attached oxygen outranks carbon and hydrogen.', 'oxygen'),
      group('co2h', 'CO₂H', 2, 'Its attached carbon compares as O, O, O and outranks methyl.', 'carbonyl'),
      group('methyl', 'CH₃', 3, 'Its attached carbon compares as H, H, H.', 'carbon'),
      group('hydrogen', 'H', 4, 'Hydrogen has the lowest atomic number in this declared set.', 'hydrogen'),
    ],
    initialArrangement: { northEastNear: 'oh', southWestNear: 'co2h', northWestFar: 'methyl', southEastFar: 'hydrogen' },
    teachingQuestion: 'Can you keep priority separate from what merely appears nearest on the page?',
    boundary: 'The priority order is a frozen local comparison for this displayed centre, not a general CIP graph parser.',
  },
  {
    id: 'butan-2-ol-set', name: 'Butan-2-ol priority set', formulaLabel: 'C*(OH)(CH₂CH₃)(CH₃)(H)', expectedDescriptor: 'R',
    groups: [
      group('oh', 'OH', 1, 'The directly attached oxygen outranks carbon and hydrogen.', 'oxygen'),
      group('ethyl', 'CH₂CH₃', 2, 'The first carbon compares as C, H, H and outranks methyl.', 'chain'),
      group('methyl', 'CH₃', 3, 'The first carbon compares as H, H, H.', 'carbon'),
      group('hydrogen', 'H', 4, 'Hydrogen is lowest in this declared comparison.', 'hydrogen'),
    ],
    initialArrangement: { northEastNear: 'ethyl', southWestNear: 'oh', northWestFar: 'methyl', southEastFar: 'hydrogen' },
    teachingQuestion: 'Why does the next atom layer distinguish ethyl from methyl?',
    boundary: 'Only the displayed first point of difference is represented.',
  },
  {
    id: 'alanine-set', name: 'Alanine priority set', formulaLabel: 'C*(NH₂)(CO₂H)(CH₃)(H)', expectedDescriptor: 'R',
    groups: [
      group('amino', 'NH₂', 1, 'Directly attached nitrogen outranks carbon and hydrogen.', 'nitrogen'),
      group('co2h', 'CO₂H', 2, 'The carboxyl carbon compares as O, O, O and outranks methyl.', 'carbonyl'),
      group('methyl', 'CH₃', 3, 'The methyl carbon compares as H, H, H.', 'carbon'),
      group('hydrogen', 'H', 4, 'Hydrogen is lowest in this declared comparison.', 'hydrogen'),
    ],
    initialArrangement: { northEastNear: 'amino', southWestNear: 'methyl', northWestFar: 'co2h', southEastFar: 'hydrogen' },
    teachingQuestion: 'Does a familiar biological group change the geometric R/S procedure?',
    boundary: 'The studio assigns only this one displayed centre and makes no biological-activity claim.',
  },
  {
    id: 'glyceraldehyde-set', name: 'Glyceraldehyde priority set', formulaLabel: 'C*(OH)(CHO)(CH₂OH)(H)', expectedDescriptor: 'R',
    groups: [
      group('oh', 'OH', 1, 'Directly attached oxygen outranks carbon and hydrogen.', 'oxygen'),
      group('formyl', 'CHO', 2, 'The formyl carbon compares as O, O, H and outranks CH₂OH.', 'carbonyl'),
      group('hydroxymethyl', 'CH₂OH', 3, 'The hydroxymethyl carbon compares as O, H, H.', 'chain'),
      group('hydrogen', 'H', 4, 'Hydrogen is lowest in this declared comparison.', 'hydrogen'),
    ],
    initialArrangement: { northEastNear: 'oh', southWestNear: 'formyl', northWestFar: 'hydrogen', southEastFar: 'hydroxymethyl' },
    teachingQuestion: 'Where does the first point of difference occur between CHO and CH₂OH?',
    boundary: 'D/L notation, multiple centres, sugars, and biomolecular stereochemistry are outside this single-centre model.',
  },
  {
    id: 'halomethane-set', name: 'Halomethane priority set', formulaLabel: 'C*(Br)(Cl)(F)(H)', expectedDescriptor: 'R',
    groups: [
      group('bromine', 'Br', 1, 'Bromine has the highest atomic number in this set.', 'halogen-heavy'),
      group('chlorine', 'Cl', 2, 'Chlorine outranks fluorine and hydrogen by atomic number.', 'halogen'),
      group('fluorine', 'F', 3, 'Fluorine outranks hydrogen by atomic number.', 'fluorine'),
      group('hydrogen', 'H', 4, 'Hydrogen has the lowest atomic number in this set.', 'hydrogen'),
    ],
    initialArrangement: { northEastNear: 'hydrogen', southWestNear: 'chlorine', northWestFar: 'fluorine', southEastFar: 'bromine' },
    teachingQuestion: 'Can you assign priority without using group size on the screen?',
    boundary: 'Atomic-number comparison is complete for this directly attached halogen set only.',
  },
  {
    id: 'duplicate-ligand-gate', name: 'Duplicate-ligand eligibility gate', formulaLabel: 'C*(OH)(CH₃)(CH₃)(H)', expectedDescriptor: null,
    groups: [
      group('oh', 'OH', 1, 'Oxygen is highest in this set.', 'oxygen'),
      group('methylA', 'CH₃ · a', 2, 'This methyl group is constitutionally identical to methyl b.', 'carbon'),
      group('methylB', 'CH₃ · b', 2, 'This methyl group is constitutionally identical to methyl a.', 'carbon'),
      group('hydrogen', 'H', 4, 'Hydrogen is lowest in this set.', 'hydrogen'),
    ],
    initialArrangement: { northEastNear: 'oh', southWestNear: 'methylA', northWestFar: 'methylB', southEastFar: 'hydrogen' },
    teachingQuestion: 'Why can a tetrahedral drawing still fail the four-distinguishable-ligand test?',
    boundary: 'This is only a repeated-ligand single-centre eligibility test; symmetry and meso analysis are not implemented.',
  },
];

export const TETRAHEDRAL_SCENARIOS = Object.freeze(RAW_TETRAHEDRAL_SCENARIOS.map(freezeTetrahedralScenario));
export const TETRAHEDRAL_SCENARIO_BY_ID = Object.freeze(Object.fromEntries(TETRAHEDRAL_SCENARIOS.map((scenario) => [scenario.id, scenario])));

const alkeneGroup = (id, label, priority, comparison, tone) => Object.freeze({ id, label, priority, comparison, tone });
const freezeSide = (side) => Object.freeze({ top: side.top, bottom: side.bottom });
const freezeAlkeneScenario = (scenario) => Object.freeze({
  ...scenario,
  leftGroups: Object.freeze(scenario.leftGroups),
  rightGroups: Object.freeze(scenario.rightGroups),
  initialArrangement: Object.freeze({ left: freezeSide(scenario.initialArrangement.left), right: freezeSide(scenario.initialArrangement.right) }),
});

const RAW_ALKENE_SCENARIOS = [
  {
    id: 'z-2-butene', name: '2-butene · same-side methyls', formulaLabel: 'CH₃/H · C=C · CH₃/H', expectedDescriptor: 'Z',
    leftGroups: [alkeneGroup('leftMethyl', 'CH₃', 1, 'Carbon outranks hydrogen.', 'carbon'), alkeneGroup('leftHydrogen', 'H', 2, 'Hydrogen is lower on the left carbon.', 'hydrogen')],
    rightGroups: [alkeneGroup('rightMethyl', 'CH₃', 1, 'Carbon outranks hydrogen.', 'carbon'), alkeneGroup('rightHydrogen', 'H', 2, 'Hydrogen is lower on the right carbon.', 'hydrogen')],
    initialArrangement: { left: { top: 'leftMethyl', bottom: 'leftHydrogen' }, right: { top: 'rightMethyl', bottom: 'rightHydrogen' } },
    teachingQuestion: 'Are the two highest-priority groups on the same side of the double-bond axis?',
    boundary: 'This declared display tests E/Z only; cis/trans naming and physical properties are not inferred.',
  },
  {
    id: 'e-2-butene', name: '2-butene · opposite methyls', formulaLabel: 'CH₃/H · C=C · H/CH₃', expectedDescriptor: 'E',
    leftGroups: [alkeneGroup('leftMethyl', 'CH₃', 1, 'Carbon outranks hydrogen.', 'carbon'), alkeneGroup('leftHydrogen', 'H', 2, 'Hydrogen is lower on the left carbon.', 'hydrogen')],
    rightGroups: [alkeneGroup('rightMethyl', 'CH₃', 1, 'Carbon outranks hydrogen.', 'carbon'), alkeneGroup('rightHydrogen', 'H', 2, 'Hydrogen is lower on the right carbon.', 'hydrogen')],
    initialArrangement: { left: { top: 'leftMethyl', bottom: 'leftHydrogen' }, right: { top: 'rightHydrogen', bottom: 'rightMethyl' } },
    teachingQuestion: 'What changes when only the right alkene carbon swaps its two positions?',
    boundary: 'The double-bond connectivity stays fixed; no rotational mechanism or isomerization pathway is modeled.',
  },
  {
    id: 'z-halogen-alkyl', name: 'Halogen/alkyl comparison · Z', formulaLabel: 'Cl/F · C=C · CH₂CH₃/H', expectedDescriptor: 'Z',
    leftGroups: [alkeneGroup('chlorine', 'Cl', 1, 'Chlorine outranks fluorine by atomic number.', 'halogen'), alkeneGroup('fluorine', 'F', 2, 'Fluorine is lower on the left carbon.', 'fluorine')],
    rightGroups: [alkeneGroup('ethyl', 'CH₂CH₃', 1, 'Carbon outranks hydrogen.', 'chain'), alkeneGroup('hydrogen', 'H', 2, 'Hydrogen is lower on the right carbon.', 'hydrogen')],
    initialArrangement: { left: { top: 'chlorine', bottom: 'fluorine' }, right: { top: 'ethyl', bottom: 'hydrogen' } },
    teachingQuestion: 'Why must each alkene carbon be ranked independently?',
    boundary: 'The two local priority comparisons are declared records rather than arbitrary recursive CIP evaluation.',
  },
  {
    id: 'e-halogen-alkyl', name: 'Halogen/alkyl comparison · E', formulaLabel: 'Br/Cl · C=C · H/CH₃', expectedDescriptor: 'E',
    leftGroups: [alkeneGroup('bromine', 'Br', 1, 'Bromine outranks chlorine by atomic number.', 'halogen-heavy'), alkeneGroup('chlorine', 'Cl', 2, 'Chlorine is lower on the left carbon.', 'halogen')],
    rightGroups: [alkeneGroup('methyl', 'CH₃', 1, 'Carbon outranks hydrogen.', 'carbon'), alkeneGroup('hydrogen', 'H', 2, 'Hydrogen is lower on the right carbon.', 'hydrogen')],
    initialArrangement: { left: { top: 'bromine', bottom: 'chlorine' }, right: { top: 'hydrogen', bottom: 'methyl' } },
    teachingQuestion: 'Can an E descriptor arise even when the visible group labels differ on each carbon?',
    boundary: 'E/Z compares local highest priorities, not visual size, mass, or a cross-molecule ranking list.',
  },
  {
    id: 'z-tetrahalogen', name: 'Tetrahalogen comparison · Z', formulaLabel: 'Br/Cl · C=C · I/F', expectedDescriptor: 'Z',
    leftGroups: [alkeneGroup('bromine', 'Br', 1, 'Bromine outranks chlorine.', 'halogen-heavy'), alkeneGroup('chlorine', 'Cl', 2, 'Chlorine is lower on the left carbon.', 'halogen')],
    rightGroups: [alkeneGroup('iodine', 'I', 1, 'Iodine outranks fluorine.', 'iodine'), alkeneGroup('fluorine', 'F', 2, 'Fluorine is lower on the right carbon.', 'fluorine')],
    initialArrangement: { left: { top: 'bromine', bottom: 'chlorine' }, right: { top: 'iodine', bottom: 'fluorine' } },
    teachingQuestion: 'Does Z require identical groups, or only same-side higher priorities?',
    boundary: 'The display makes no claim about synthesis, persistence, abundance, or physical properties of a named compound.',
  },
  {
    id: 'repeated-substituent-gate', name: 'Repeated-substituent eligibility gate', formulaLabel: 'Cl/Cl · C=C · H/H', expectedDescriptor: 'undefined',
    leftGroups: [alkeneGroup('chlorineA', 'Cl · a', 1, 'The two chlorine substituents tie.', 'halogen'), alkeneGroup('chlorineB', 'Cl · b', 1, 'The two chlorine substituents tie.', 'halogen')],
    rightGroups: [alkeneGroup('hydrogenA', 'H · a', 1, 'The two hydrogen substituents tie.', 'hydrogen'), alkeneGroup('hydrogenB', 'H · b', 1, 'The two hydrogen substituents tie.', 'hydrogen')],
    initialArrangement: { left: { top: 'chlorineA', bottom: 'chlorineB' }, right: { top: 'hydrogenA', bottom: 'hydrogenB' } },
    teachingQuestion: 'Why is a drawn double bond not enough to guarantee an E/Z descriptor?',
    boundary: 'E/Z is undefined here because each alkene carbon fails the distinguishable-substituent test.',
  },
];

export const ALKENE_SCENARIOS = Object.freeze(RAW_ALKENE_SCENARIOS.map(freezeAlkeneScenario));
export const ALKENE_SCENARIO_BY_ID = Object.freeze(Object.fromEntries(ALKENE_SCENARIOS.map((scenario) => [scenario.id, scenario])));

const station = (angle, geometry, relation, tier, strain) => Object.freeze({ angle, geometry, relation, tier, strain });

export const TORSION_STATIONS = Object.freeze([
  station(-180, 'staggered', 'anti', 'global minimum', 0),
  station(-120, 'eclipsed', 'eclipsed', 'local maximum', 2),
  station(-60, 'staggered', 'gauche', 'local minimum', 1),
  station(0, 'eclipsed', 'syn eclipsed', 'highest barrier', 3),
  station(60, 'staggered', 'gauche', 'local minimum', 1),
  station(120, 'eclipsed', 'eclipsed', 'local maximum', 2),
  station(180, 'staggered', 'anti', 'global minimum', 0),
]);

const ETHANE_STATIONS = Object.freeze(TORSION_STATIONS.map((item) => Object.freeze({
  ...item,
  relation: item.geometry === 'staggered' ? 'equivalent staggered' : 'equivalent eclipsed',
  tier: item.geometry === 'staggered' ? 'equivalent minimum' : 'equivalent maximum',
  strain: item.geometry === 'staggered' ? 0 : 1,
})));

const freezeNewmanScenario = (scenario) => Object.freeze({
  ...scenario,
  frontGroups: Object.freeze(scenario.frontGroups),
  rearGroups: Object.freeze(scenario.rearGroups),
  stations: Object.freeze(scenario.stations),
});

export const NEWMAN_SCENARIOS = Object.freeze([
  freezeNewmanScenario({
    id: 'butane', name: 'Butane C2–C3 probe', formulaLabel: 'CH₃–CH₂ ⦿ CH₂–CH₃', initialAngle: 0,
    frontGroups: ['CH₃', 'H', 'H'], rearGroups: ['CH₃', 'H', 'H'], stations: TORSION_STATIONS,
    teachingQuestion: 'Can you distinguish a signed torsion angle from a qualitative strain ranking?',
    boundary: 'Strain values are dimensionless declared teaching indices, not calculated or measured conformer energies.',
  }),
  freezeNewmanScenario({
    id: 'ethane', name: 'Ethane symmetry probe', formulaLabel: 'H₃C ⦿ CH₃', initialAngle: 0,
    frontGroups: ['H', 'H', 'H'], rearGroups: ['H', 'H', 'H'], stations: ETHANE_STATIONS,
    teachingQuestion: 'Why are all three staggered stations equivalent in this symmetric probe?',
    boundary: 'The profile distinguishes only declared eclipsed and staggered symmetry classes; no numerical barrier is supplied.',
  }),
]);
export const NEWMAN_SCENARIO_BY_ID = Object.freeze(Object.fromEntries(NEWMAN_SCENARIOS.map((scenario) => [scenario.id, scenario])));

export const STEREOCHEMISTRY_MODEL_BOUNDARY = Object.freeze({
  included: 'Six declared single-centre priority sets, six declared planar alkene arrangements, and ethane/butane Newman probes with manual swaps, local descriptors, signed torsion, and qualitative strain indices.',
  excluded: 'Arbitrary CIP parsing, multiple stereocentres, meso and pseudoasymmetric analysis, axial/planar/helical chirality, ring and chair conformations, atropisomerism, reaction stereochemistry, stereoselectivity, measured conformer energies, populations, rates, and property or activity prediction.',
  priority: 'Every substituent priority and first-point-of-difference reason is a frozen local teaching record. The app does not recursively rank an arbitrary molecular graph.',
  descriptor: 'R/S and E/Z identify the displayed declared configuration only. They do not encode optical-rotation sign, stability, abundance, reactivity, or biological effect.',
  torsion: 'Newman angles and canonical labels are geometric. The displayed strain curve is a dimensionless illustrative index rather than a force-field or thermodynamic calculation.',
  boundaryPolicy: 'Torsion ranges use absolute-angle half-open bins [0,30), [30,90), [90,150), and [150,180] for synperiplanar, synclinal, anticlinal, and antiperiplanar.',
});
