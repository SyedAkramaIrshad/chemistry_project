import assert from 'node:assert/strict';
import {
  FUNCTIONAL_GROUP_DEFINITION_BY_ID,
  FUNCTIONAL_GROUP_DEFINITIONS,
  FUNCTIONAL_GROUP_MODEL_BOUNDARY,
  FUNCTIONAL_GROUP_SCENARIO_BY_ID,
  FUNCTIONAL_GROUP_SCENARIOS,
} from '../src/data/functionalGroupScenarios.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../src/data/scienceSources.js';
import {
  analyzeFunctionalGraph,
  analyzeFunctionalGroupScenario,
  evaluateFunctionalGroupAttempt,
  nextFunctionalGroupHint,
  toggleFunctionalProbeAtom,
} from '../src/chemistry/functionalGroups.js';

const EXPECTED_GROUP_IDS = [
  'alcohol',
  'ether',
  'aldehyde',
  'ketone',
  'carboxylic-acid',
  'ester',
  'amide',
  'amine',
  'nitrile',
  'alkene',
  'alkyne',
  'haloalkane',
];
const ALLOWED_ELEMENTS = new Set(['C', 'H', 'N', 'O', 'F', 'Cl', 'Br', 'I']);

assert.deepEqual(FUNCTIONAL_GROUP_DEFINITIONS.map((item) => item.id), EXPECTED_GROUP_IDS);
assert.equal(FUNCTIONAL_GROUP_DEFINITIONS.length, 12);
assert.equal(FUNCTIONAL_GROUP_SCENARIOS.length, 12);
assert.equal(Object.keys(FUNCTIONAL_GROUP_DEFINITION_BY_ID).length, 12);
assert.equal(Object.keys(FUNCTIONAL_GROUP_SCENARIO_BY_ID).length, 12);
assert.ok(Object.isFrozen(FUNCTIONAL_GROUP_DEFINITIONS));
assert.ok(Object.isFrozen(FUNCTIONAL_GROUP_DEFINITION_BY_ID));
assert.ok(Object.isFrozen(FUNCTIONAL_GROUP_SCENARIOS));
assert.ok(Object.isFrozen(FUNCTIONAL_GROUP_SCENARIO_BY_ID));
assert.ok(Object.isFrozen(FUNCTIONAL_GROUP_MODEL_BOUNDARY));

for (const definition of FUNCTIONAL_GROUP_DEFINITIONS) {
  assert.ok(Object.isFrozen(definition));
  assert.ok(Object.isFrozen(definition.decisionSteps));
  assert.ok(Object.isFrozen(definition.sourceIds));
  assert.ok(definition.label.length >= 5);
  assert.ok(definition.signature.length >= 3);
  assert.ok(definition.decisionSteps.length >= 2);
  assert.ok(definition.decisionSteps.every((step) => step.length >= 20));
  assert.match(definition.accent, /^#[0-9a-f]{6}$/i);
  assert.equal(typeof definition.carbonylUmbrella, 'boolean');
  assert.ok(definition.misconception.length >= 35);
  assert.ok(definition.sourceIds.length >= 2);
}

for (const scenario of FUNCTIONAL_GROUP_SCENARIOS) {
  assert.ok(Object.isFrozen(scenario));
  assert.ok(Object.isFrozen(scenario.atoms));
  assert.ok(Object.isFrozen(scenario.bonds));
  assert.ok(Object.isFrozen(scenario.targetAtomIds));
  assert.ok(Object.isFrozen(scenario.expectedGroupIds));
  assert.ok(Object.isFrozen(scenario.sourceIds));
  assert.ok(scenario.atoms.length >= 3 && scenario.atoms.length <= 9);
  assert.ok(scenario.bonds.length >= scenario.atoms.length - 1);
  assert.ok(FUNCTIONAL_GROUP_DEFINITION_BY_ID[scenario.targetGroupId]);
  assert.ok(scenario.formula.length >= 2);
  assert.ok(scenario.mission.length >= 30);
  assert.ok(scenario.teacherQuestion.length >= 35);
  assert.ok(scenario.misconception.length >= 35);
  assert.equal(scenario.provenance.kind, 'synthetic-teaching');
  assert.match(scenario.provenance.statement, /synthetic|not measured/i);

  const atomIds = scenario.atoms.map((atom) => atom.id);
  const bondIds = scenario.bonds.map((bond) => bond.id);
  assert.equal(new Set(atomIds).size, atomIds.length);
  assert.equal(new Set(bondIds).size, bondIds.length);
  assert.ok(scenario.atoms.every(Object.isFrozen));
  assert.ok(scenario.bonds.every(Object.isFrozen));
  for (const atom of scenario.atoms) {
    assert.ok(ALLOWED_ELEMENTS.has(atom.element));
    assert.ok(Number.isFinite(atom.x) && atom.x >= 35 && atom.x <= 725);
    assert.ok(Number.isFinite(atom.y) && atom.y >= 35 && atom.y <= 325);
    assert.ok((atom.label ?? atom.element).length >= 1);
  }
  for (const bond of scenario.bonds) {
    assert.ok(atomIds.includes(bond.a));
    assert.ok(atomIds.includes(bond.b));
    assert.notEqual(bond.a, bond.b);
    assert.ok([1, 2, 3].includes(bond.order));
  }
  assert.equal(new Set(scenario.targetAtomIds).size, scenario.targetAtomIds.length);
  assert.ok(scenario.targetAtomIds.every((id) => atomIds.includes(id)));
  assert.ok(scenario.expectedGroupIds.includes(scenario.targetGroupId));
  assert.ok(scenario.expectedGroupIds.every((id) => EXPECTED_GROUP_IDS.includes(id)));
}

assert.equal(new Set(FUNCTIONAL_GROUP_DEFINITIONS.map((item) => item.id)).size, 12);
assert.equal(new Set(FUNCTIONAL_GROUP_SCENARIOS.map((item) => item.id)).size, 12);
assert.match(FUNCTIONAL_GROUP_MODEL_BOUNDARY.suppression, /acid.+alcohol|ester.+ether|amide.+amine/i);
assert.match(FUNCTIONAL_GROUP_MODEL_BOUNDARY.excluded, /aromatic|reaction|nomenclature/i);
assert.match(FUNCTIONAL_GROUP_MODEL_BOUNDARY.hydrogens, /diagnostic.+implicit/i);
assert.match(FUNCTIONAL_GROUP_MODEL_BOUNDARY.safety, /no.+procedure/i);

for (const sourceId of [
  'iupacFunctionalGroup',
  'iupacCharacteristicGroup',
  'iupacCarbonylCompounds',
  'iupacPrinciplesNomenclature',
  'iupacOrganicNomenclatureGuide',
  'acsUndergraduateCurriculum',
]) {
  assert.ok(SCIENCE_SOURCES[sourceId], `Missing functional-group source ${sourceId}.`);
}
assert.ok(MODEL_PASSPORTS.functionalGroupSignalBoard);
assert.match(MODEL_PASSPORTS.functionalGroupSignalBoard.resultKind, /not.+reaction|not.+nomenclature/i);
assert.equal(MODEL_PASSPORTS.functionalGroupSignalBoard.sources.length, 6);
assert.ok(MODEL_PASSPORTS.functionalGroupSignalBoard.excludes.some((item) => /aromaticity/i.test(item)));

console.log('Twelve immutable functional-group definitions, twelve synthetic specimen graphs, sources, and model boundary verified.');

for (const scenario of FUNCTIONAL_GROUP_SCENARIOS) {
  const analysis = analyzeFunctionalGroupScenario(scenario.id);
  assert.ok(Object.isFrozen(analysis));
  assert.ok(Object.isFrozen(analysis.matches));
  assert.ok(Object.isFrozen(analysis.inventoryGroupIds));
  assert.ok(Object.isFrozen(analysis.targetMatch));
  assert.equal(analysis.scenario.id, scenario.id);
  assert.deepEqual(analysis.inventoryGroupIds, scenario.expectedGroupIds);
  assert.equal(analysis.targetMatch.groupId, scenario.targetGroupId);
  assert.deepEqual(new Set(analysis.targetMatch.atomIds), new Set(scenario.targetAtomIds));
  assert.equal(
    analysis.targetIsCarbonyl,
    FUNCTIONAL_GROUP_DEFINITION_BY_ID[scenario.targetGroupId].carbonylUmbrella,
  );
  assert.deepEqual(analysis.structuralTrace, FUNCTIONAL_GROUP_DEFINITION_BY_ID[scenario.targetGroupId].decisionSteps);

  const wrongAtom = scenario.atoms.find((atom) => !scenario.targetAtomIds.includes(atom.id))?.id
    ?? scenario.targetAtomIds[0];
  const wrongSelection = Object.freeze([wrongAtom]);
  const wrongPrediction = Object.freeze({
    functionalClass: scenario.targetGroupId === 'alkyne' ? 'alcohol' : 'alkyne',
    carbonylUmbrella: analysis.targetIsCarbonyl ? 'no' : 'yes',
    inventoryGroupIds: Object.freeze(['ether']),
  });
  const beforeSelection = JSON.stringify(wrongSelection);
  const beforePrediction = JSON.stringify(wrongPrediction);
  const wrongEvaluation = evaluateFunctionalGroupAttempt({
    analysis,
    selectedAtomIds: wrongSelection,
    prediction: wrongPrediction,
  });
  assert.equal(JSON.stringify(wrongSelection), beforeSelection);
  assert.equal(JSON.stringify(wrongPrediction), beforePrediction);
  assert.deepEqual(wrongEvaluation.learnerSelection, wrongSelection);
  assert.deepEqual(wrongEvaluation.learnerPrediction, wrongPrediction);
  assert.equal(wrongEvaluation.dimensions.functionalClass.correct, false);
  assert.equal(wrongEvaluation.dimensions.carbonylUmbrella.correct, false);
  assert.equal(wrongEvaluation.score.total, 4);
  assert.ok(Object.isFrozen(wrongEvaluation));

  const correctEvaluation = evaluateFunctionalGroupAttempt({
    analysis,
    selectedAtomIds: [...scenario.targetAtomIds].reverse(),
    prediction: {
      functionalClass: scenario.targetGroupId,
      carbonylUmbrella: analysis.targetIsCarbonyl ? 'yes' : 'no',
      inventoryGroupIds: [...scenario.expectedGroupIds].reverse(),
    },
  });
  assert.equal(correctEvaluation.score.correct, 4);
  assert.equal(correctEvaluation.committed, true);

  for (let level = 1; level <= 4; level += 1) {
    const frozenBefore = JSON.stringify(analysis);
    const hint = nextFunctionalGroupHint({ analysis, selectedAtomIds: wrongSelection, level });
    assert.equal(typeof hint, 'string');
    assert.ok(hint.length > 30);
    assert.equal(JSON.stringify(analysis), frozenBefore);
    assert.equal(JSON.stringify(wrongSelection), beforeSelection);
  }
}

const acidAnalysis = analyzeFunctionalGroupScenario('ethanoic-acid');
const esterAnalysis = analyzeFunctionalGroupScenario('methyl-ethanoate');
const amideAnalysis = analyzeFunctionalGroupScenario('ethanamide-amide');
const aminoAlcohol = analyzeFunctionalGroupScenario('aminoethanol-amine');
const hydroxyNitrile = analyzeFunctionalGroupScenario('hydroxyacetonitrile-nitrile');
assert.equal(acidAnalysis.inventoryGroupIds.includes('alcohol'), false);
assert.equal(acidAnalysis.inventoryGroupIds.includes('ketone'), false);
assert.equal(esterAnalysis.inventoryGroupIds.includes('ether'), false);
assert.equal(amideAnalysis.inventoryGroupIds.includes('amine'), false);
assert.deepEqual(aminoAlcohol.inventoryGroupIds, ['alcohol', 'amine']);
assert.deepEqual(hydroxyNitrile.inventoryGroupIds, ['alcohol', 'nitrile']);

for (const id of ['ethanal-aldehyde', 'propanone-ketone', 'ethanoic-acid', 'methyl-ethanoate', 'ethanamide-amide']) {
  assert.equal(analyzeFunctionalGroupScenario(id).targetIsCarbonyl, true);
}
for (const id of ['ethanol-alcohol', 'dimethyl-ether', 'aminoethanol-amine', 'hydroxyacetonitrile-nitrile', 'propene-alkene', 'propyne-alkyne', 'chloropropane-haloalkane']) {
  assert.equal(analyzeFunctionalGroupScenario(id).targetIsCarbonyl, false);
}

const ethanol = analyzeFunctionalGroupScenario('ethanol-alcohol');
const firstToggle = toggleFunctionalProbeAtom({ scenarioId: ethanol.scenario.id, selectedAtomIds: [], atomId: 'o1' });
assert.equal(firstToggle.allowed, true);
assert.deepEqual(firstToggle.selectedAtomIds, ['o1']);
assert.ok(Object.isFrozen(firstToggle));
const secondToggle = toggleFunctionalProbeAtom({ scenarioId: ethanol.scenario.id, selectedAtomIds: firstToggle.selectedAtomIds, atomId: 'o1' });
assert.equal(secondToggle.allowed, true);
assert.deepEqual(secondToggle.selectedAtomIds, []);
const blockedToggle = toggleFunctionalProbeAtom({ scenarioId: ethanol.scenario.id, selectedAtomIds: firstToggle.selectedAtomIds, atomId: 'ghost' });
assert.equal(blockedToggle.allowed, false);
assert.deepEqual(blockedToggle.selectedAtomIds, ['o1']);
assert.deepEqual(firstToggle.selectedAtomIds, ['o1']);

const baseAtoms = [
  { id: 'c1', element: 'C', x: 50, y: 50 },
  { id: 'c2', element: 'C', x: 150, y: 50 },
];
const baseBonds = [{ id: 'b1', a: 'c1', b: 'c2', order: 1 }];
assert.throws(() => analyzeFunctionalGraph({ atoms: [baseAtoms[0]], bonds: [] }), /2.+40/);
assert.throws(() => analyzeFunctionalGraph({ atoms: Array.from({ length: 41 }, (_, index) => ({ id: `c${index}`, element: 'C', x: index, y: 0 })), bonds: [] }), /2.+40/);
assert.throws(() => analyzeFunctionalGraph({ atoms: [baseAtoms[0], { ...baseAtoms[1], id: 'c1' }], bonds: baseBonds }), /Duplicate atom/);
assert.throws(() => analyzeFunctionalGraph({ atoms: baseAtoms, bonds: [baseBonds[0], { ...baseBonds[0] }] }), /Duplicate bond/);
assert.throws(() => analyzeFunctionalGraph({ atoms: baseAtoms, bonds: [{ id: 'b1', a: 'c1', b: 'ghost', order: 1 }] }), /unknown atom/);
assert.throws(() => analyzeFunctionalGraph({ atoms: baseAtoms, bonds: [{ id: 'b1', a: 'c1', b: 'c1', order: 1 }] }), /itself/);
assert.throws(() => analyzeFunctionalGraph({ atoms: baseAtoms, bonds: [baseBonds[0], { id: 'b2', a: 'c2', b: 'c1', order: 1 }] }), /Duplicate edge/);
assert.throws(() => analyzeFunctionalGraph({ atoms: baseAtoms, bonds: [{ ...baseBonds[0], order: 1.5 }] }), /bond order/);
assert.throws(() => analyzeFunctionalGraph({ atoms: [baseAtoms[0], { ...baseAtoms[1], element: 'S' }], bonds: baseBonds }), /Unsupported element/);
assert.throws(() => analyzeFunctionalGroupScenario('unknown'), /Unknown functional-group scenario/);
assert.throws(() => evaluateFunctionalGroupAttempt({ analysis: ethanol, selectedAtomIds: [], prediction: { functionalClass: 'alcohol', carbonylUmbrella: 'no', inventoryGroupIds: [] } }), /at least one atom/);
assert.throws(() => nextFunctionalGroupHint({ analysis: ethanol, selectedAtomIds: [], level: 5 }), /between 1 and 4/);

console.log('Twelve graph-pattern detectors, suppression invariants, immutable probe actions, four-part predictions, and hints verified.');
