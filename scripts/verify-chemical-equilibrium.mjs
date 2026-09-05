import assert from 'node:assert/strict';
import {
  CHEMICAL_EQUILIBRIUM_MODEL_BOUNDARY,
  CHEMICAL_EQUILIBRIUM_SCENARIO_BY_ID,
  CHEMICAL_EQUILIBRIUM_SCENARIOS,
} from '../src/data/chemicalEquilibriumScenarios.js';
import {
  analyzeReactionState,
  createDefaultChemicalEquilibrium,
  evaluateEquilibriumPrediction,
  nextEquilibriumHint,
  reactionExtentBounds,
  runEquilibriumPerturbation,
  solveChemicalEquilibrium,
} from '../src/chemistry/chemicalEquilibrium.js';

const close = (actual, expected, tolerance = 1e-9) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);
};

const amountRecord = (scenarioId) => Object.fromEntries(
  CHEMICAL_EQUILIBRIUM_SCENARIO_BY_ID[scenarioId].species.map((species) => [species.id, species.defaultAmountMol]),
);

assert.equal(CHEMICAL_EQUILIBRIUM_SCENARIOS.length, 4);
assert.equal(Object.keys(CHEMICAL_EQUILIBRIUM_SCENARIO_BY_ID).length, 4);
assert.ok(Object.isFrozen(CHEMICAL_EQUILIBRIUM_SCENARIOS));
assert.ok(Object.isFrozen(CHEMICAL_EQUILIBRIUM_SCENARIO_BY_ID));
assert.ok(Object.isFrozen(CHEMICAL_EQUILIBRIUM_MODEL_BOUNDARY));

for (const scenario of CHEMICAL_EQUILIBRIUM_SCENARIOS) {
  assert.ok(Object.isFrozen(scenario));
  assert.ok(Object.isFrozen(scenario.species));
  assert.ok(Object.isFrozen(scenario.sourceIds));
  assert.ok(scenario.temperatureK > 0);
  assert.ok(scenario.equilibriumConstant > 0);
  assert.ok(scenario.defaultVolumeL > 0);
  assert.equal(new Set(scenario.species.map((species) => species.id)).size, scenario.species.length);
  assert.ok(scenario.species.some((species) => species.nu < 0));
  assert.ok(scenario.species.some((species) => species.nu > 0));
  assert.equal(scenario.deltaNu, scenario.species.reduce((sum, species) => sum + species.nu, 0));
  assert.ok(scenario.species.every((species) => Object.isFrozen(species)));
  assert.ok(scenario.species.every((species) => species.defaultAmountMol >= 0));
  assert.ok(scenario.species.some((species) => species.id === scenario.probeSpeciesId && species.nu > 0));
  assert.ok(['source-anchored', 'synthetic-teaching'].includes(scenario.provenance.kind));
  assert.ok(scenario.provenance.statement.length > 40);
  assert.ok(scenario.sourceIds.length >= 3);
}

const sulfuryl = CHEMICAL_EQUILIBRIUM_SCENARIO_BY_ID['sulfuryl-chloride-dissociation'];
assert.equal(sulfuryl.reactionLabel, 'SO₂Cl₂(g) ⇌ SO₂(g) + Cl₂(g)');
assert.equal(sulfuryl.equilibriumConstant, 2.75);
assert.equal(sulfuryl.temperatureK, 373.15);
assert.equal(sulfuryl.provenance.kind, 'source-anchored');
assert.ok(sulfuryl.sourceIds.includes('mitChemicalEquilibriumSolutions19'));

for (const id of ['one-to-one-instrument', 'one-to-two-instrument', 'one-plus-three-instrument']) {
  const scenario = CHEMICAL_EQUILIBRIUM_SCENARIO_BY_ID[id];
  assert.equal(scenario.provenance.kind, 'synthetic-teaching');
  assert.match(scenario.provenance.statement, /not a measured equilibrium constant/i);
}

assert.match(CHEMICAL_EQUILIBRIUM_MODEL_BOUNDARY.activity, /p.+p°/i);
assert.match(CHEMICAL_EQUILIBRIUM_MODEL_BOUNDARY.temperature, /fixed/i);
assert.match(CHEMICAL_EQUILIBRIUM_MODEL_BOUNDARY.kinetics, /not.+rate|no.+rate/i);
assert.match(CHEMICAL_EQUILIBRIUM_MODEL_BOUNDARY.safety, /no.+procedure/i);

console.log('Four immutable ideal-gas equilibrium scenarios and their provenance boundary verified.');

const sulfurylStart = analyzeReactionState({
  scenarioId: 'sulfuryl-chloride-dissociation',
  amounts: amountRecord('sulfuryl-chloride-dissociation'),
  constraint: { type: 'volume', volumeL: sulfuryl.defaultVolumeL },
});
assert.equal(sulfurylStart.quotient.value, 0);
assert.equal(sulfurylStart.quotient.relation, 'below');
assert.equal(sulfurylStart.quotient.direction.id, 'forward');
close(sulfurylStart.partialPressuresBar.so2cl2, 2.15, 1e-10);

const sulfurylReverse = analyzeReactionState({
  scenarioId: sulfuryl.id,
  amounts: { so2cl2: 0, so2: 0.5, cl2: 0.5 },
  constraint: { type: 'volume', volumeL: sulfuryl.defaultVolumeL },
});
assert.equal(sulfurylReverse.quotient.value, Infinity);
assert.equal(sulfurylReverse.quotient.relation, 'above');
assert.equal(sulfurylReverse.quotient.direction.id, 'reverse');

const indeterminate = analyzeReactionState({
  scenarioId: sulfuryl.id,
  amounts: { so2cl2: 0, so2: 0, cl2: 0 },
  constraint: { type: 'volume', volumeL: sulfuryl.defaultVolumeL },
  inertMoles: 1,
});
assert.equal(indeterminate.quotient.value, null);
assert.equal(indeterminate.quotient.relation, 'undefined');
assert.equal(indeterminate.quotient.direction.id, 'undefined');

const complexBounds = reactionExtentBounds({
  scenarioId: 'one-plus-three-instrument',
  amounts: amountRecord('one-plus-three-instrument'),
});
close(complexBounds.minimumMol, -0.1);
close(complexBounds.maximumMol, 1);

for (const scenario of CHEMICAL_EQUILIBRIUM_SCENARIOS) {
  const solved = createDefaultChemicalEquilibrium(scenario.id);
  assert.ok(Object.isFrozen(solved));
  assert.equal(solved.scenarioId, scenario.id);
  assert.equal(solved.equilibrium.quotient.relation, 'equal');
  close(solved.equilibrium.quotient.ratioToK, 1, 1e-8);
  assert.ok(Math.abs(solved.extent.residualLogQK) < 1e-9);
  for (const amount of Object.values(solved.equilibrium.amounts)) assert.ok(amount >= 0);
}

const sulfurylSolved = createDefaultChemicalEquilibrium(sulfuryl.id);
close(sulfurylSolved.equilibrium.partialPressuresBar.so2cl2, 0.7319, 8e-4);
close(sulfurylSolved.equilibrium.partialPressuresBar.so2, 1.4181, 8e-4);
close(sulfurylSolved.equilibrium.partialPressuresBar.cl2, 1.4181, 8e-4);

const oneToTwo = createDefaultChemicalEquilibrium('one-to-two-instrument');
const compressed = runEquilibriumPerturbation({ baseline: oneToTwo, perturbation: { type: 'compress', factor: 0.6 } });
const expanded = runEquilibriumPerturbation({ baseline: oneToTwo, perturbation: { type: 'expand', factor: 1.6 } });
assert.equal(compressed.answer.qRelation, 'above');
assert.equal(compressed.answer.direction, 'reverse');
assert.equal(expanded.answer.qRelation, 'below');
assert.equal(expanded.answer.direction, 'forward');

const oneToOne = createDefaultChemicalEquilibrium('one-to-one-instrument');
const oneToOneCompression = runEquilibriumPerturbation({ baseline: oneToOne, perturbation: { type: 'compress', factor: 0.5 } });
assert.equal(oneToOneCompression.answer.qRelation, 'equal');
assert.equal(oneToOneCompression.answer.direction, 'none');
close(oneToOneCompression.after.amounts.a, oneToOneCompression.before.amounts.a, 1e-8);
close(oneToOneCompression.after.amounts.b, oneToOneCompression.before.amounts.b, 1e-8);

const catalyst = runEquilibriumPerturbation({ baseline: oneToTwo, perturbation: { type: 'catalyst' } });
assert.deepEqual(catalyst.immediate.amounts, catalyst.before.amounts);
assert.deepEqual(catalyst.after.amounts, catalyst.before.amounts);
assert.equal(catalyst.answer.direction, 'none');
assert.equal(catalyst.answer.kChange, 'same');

const inertVolume = runEquilibriumPerturbation({ baseline: oneToTwo, perturbation: { type: 'inert-volume', amountMol: 1 } });
assert.equal(inertVolume.answer.qRelation, 'equal');
assert.equal(inertVolume.answer.direction, 'none');
assert.deepEqual(inertVolume.after.amounts, inertVolume.before.amounts);

const inertPressurePositive = runEquilibriumPerturbation({ baseline: oneToTwo, perturbation: { type: 'inert-pressure', amountMol: 1 } });
assert.equal(inertPressurePositive.answer.qRelation, 'below');
assert.equal(inertPressurePositive.answer.direction, 'forward');
assert.ok(inertPressurePositive.after.volumeL > inertPressurePositive.before.volumeL);

const negativeDelta = createDefaultChemicalEquilibrium('one-plus-three-instrument');
const inertPressureNegative = runEquilibriumPerturbation({ baseline: negativeDelta, perturbation: { type: 'inert-pressure', amountMol: 1 } });
assert.equal(inertPressureNegative.answer.qRelation, 'above');
assert.equal(inertPressureNegative.answer.direction, 'reverse');

const inertPressureZero = runEquilibriumPerturbation({ baseline: oneToOne, perturbation: { type: 'inert-pressure', amountMol: 1 } });
assert.equal(inertPressureZero.answer.qRelation, 'equal');
assert.equal(inertPressureZero.answer.direction, 'none');

const addProduct = runEquilibriumPerturbation({ baseline: sulfurylSolved, perturbation: { type: 'add-species', targetSpeciesId: 'so2', amountMol: 0.2 } });
const removeProduct = runEquilibriumPerturbation({ baseline: sulfurylSolved, perturbation: { type: 'remove-species', targetSpeciesId: 'so2', amountMol: 0.2 } });
assert.equal(addProduct.answer.direction, 'reverse');
assert.equal(removeProduct.answer.direction, 'forward');

const learnerPrediction = Object.freeze({ qRelation: 'below', direction: 'forward', kChange: 'changes', probeTrend: 'falls' });
const evaluation = evaluateEquilibriumPrediction({ experiment: compressed, prediction: learnerPrediction });
assert.deepEqual(evaluation.learnerPrediction, learnerPrediction);
assert.equal(evaluation.dimensions.qRelation.correct, false);
assert.equal(evaluation.dimensions.direction.correct, false);
assert.equal(evaluation.dimensions.kChange.correct, false);
assert.equal(learnerPrediction.kChange, 'changes');
assert.ok(Object.isFrozen(evaluation));
for (let level = 1; level <= 4; level += 1) {
  const before = JSON.stringify(compressed);
  const hint = nextEquilibriumHint({ experiment: compressed, level });
  assert.equal(typeof hint, 'string');
  assert.ok(hint.length > 25);
  assert.equal(JSON.stringify(compressed), before);
}

assert.throws(() => createDefaultChemicalEquilibrium('unknown'), /Unknown chemical-equilibrium scenario/);
assert.throws(() => analyzeReactionState({ scenarioId: oneToOne.scenarioId, amounts: { a: -1, b: 1 }, constraint: { type: 'volume', volumeL: 1 } }), /nonnegative/);
assert.throws(() => analyzeReactionState({ scenarioId: oneToOne.scenarioId, amounts: { a: 1, b: 1 }, constraint: { type: 'volume', volumeL: 0 } }), /greater than zero/);
assert.throws(() => solveChemicalEquilibrium({ scenarioId: oneToOne.scenarioId, amounts: { a: 0, b: 0 }, constraint: { type: 'volume', volumeL: 1 } }), /reacting material/);
assert.throws(() => runEquilibriumPerturbation({ baseline: oneToOne, perturbation: { type: 'add-species', targetSpeciesId: 'x', amountMol: 1 } }), /Unknown target species/);
assert.throws(() => runEquilibriumPerturbation({ baseline: oneToOne, perturbation: { type: 'remove-species', targetSpeciesId: 'a', amountMol: 99 } }), /cannot exceed/);
assert.throws(() => runEquilibriumPerturbation({ baseline: oneToOne, perturbation: { type: 'teleport' } }), /Unknown equilibrium perturbation/);

console.log('Dimensionless Q, ΔrG, extent bounds, and equilibrium closure verified for all four scenarios.');
console.log('Composition, volume, catalyst, and fixed-volume/fixed-pressure inert-gas perturbations verified with immutable predictions and hints.');
