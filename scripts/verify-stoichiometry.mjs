import assert from 'node:assert/strict';
import { ChemistryEngine } from '../src/chemistry/runtime.js';
import {
  STOICHIOMETRY_MODEL_BOUNDARY,
  analyzeChemicalYield,
  analyzeStoichiometry,
  convertFeedToMoles,
  createExtentTrace,
  evaluateStoichiometryPrediction,
} from '../src/chemistry/stoichiometry.js';

const near = (actual, expected, tolerance, label = 'value') => {
  assert.ok(Number.isFinite(actual), `${label} must be finite; received ${actual}`);
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected} ± ${tolerance}, received ${actual}`);
};

const waterInput = {
  scenarioId: 'water-synthesis',
  feeds: {
    h2: { value: 5, unit: 'mol' },
    o2: { value: 2, unit: 'mol' },
  },
  targetProductId: 'h2o',
};
const water = analyzeStoichiometry(waterInput);
assert.equal(water.limiting.kind, 'single');
assert.deepEqual(water.limiting.ids, ['o2']);
near(water.extentMol, 2, 1e-12, 'water extent');
near(water.reactants.find((item) => item.id === 'h2').leftoverMoles, 1, 1e-12, 'hydrogen leftover');
near(water.reactants.find((item) => item.id === 'o2').leftoverMoles, 0, 1e-12, 'oxygen leftover');
near(water.target.theoreticalMoles, 4, 1e-12, 'water product moles');
near(water.target.theoreticalMassG, 4 * ChemistryEngine.molarMass('H2O'), 1e-10, 'water product mass');
near(water.target.entities, 4 * 6.02214076e23, 1e10, 'water entities');
near(water.massLedger.differenceG, 0, 1e-10, 'water mass closure');

const gramInput = {
  scenarioId: 'water-synthesis',
  feeds: {
    h2: { value: 5 * ChemistryEngine.molarMass('H2'), unit: 'g' },
    o2: { value: 2 * ChemistryEngine.molarMass('O2'), unit: 'g' },
  },
  targetProductId: 'h2o',
};
const waterFromGrams = analyzeStoichiometry(gramInput);
near(waterFromGrams.extentMol, water.extentMol, 1e-12, 'gram/mole extent equivalence');
near(waterFromGrams.target.theoreticalMassG, water.target.theoreticalMassG, 1e-10, 'gram/mole mass equivalence');
near(convertFeedToMoles({ formula: 'H2O', value: ChemistryEngine.molarMass('H2O'), unit: 'g' }), 1, 1e-12, 'one molar mass');

const tie = analyzeStoichiometry({
  scenarioId: 'water-synthesis',
  feeds: { h2: { value: 4, unit: 'mol' }, o2: { value: 2, unit: 'mol' } },
  targetProductId: 'h2o',
});
assert.equal(tie.limiting.kind, 'stoichiometric');
assert.deepEqual([...tie.limiting.ids].sort(), ['h2', 'o2']);
assert.ok(tie.reactants.every((item) => item.leftoverMoles === 0));

const methane = analyzeStoichiometry({
  scenarioId: 'methane-combustion',
  feeds: { ch4: { value: 1, unit: 'mol' }, o2: { value: 1, unit: 'mol' } },
  targetProductId: 'co2',
});
assert.deepEqual(methane.limiting.ids, ['o2']);
near(methane.extentMol, 0.5, 1e-12, 'methane extent');
near(methane.reactants.find((item) => item.id === 'ch4').leftoverMoles, 0.5, 1e-12, 'methane leftover');
near(methane.products.find((item) => item.id === 'co2').amountMoles, 0.5, 1e-12, 'carbon dioxide product');
near(methane.products.find((item) => item.id === 'h2o').amountMoles, 1, 1e-12, 'combustion water product');
near(methane.massLedger.differenceG, 0, 1e-10, 'methane mass closure');

const correctPrediction = evaluateStoichiometryPrediction({
  analysis: water,
  predictedLimitingId: 'o2',
  predictedTargetValue: 4,
  predictedTargetUnit: 'mol',
});
assert.equal(correctPrediction.correct, true);
assert.equal(correctPrediction.dimensions.limiting.correct, true);
assert.equal(correctPrediction.dimensions.target.correct, true);

const wrongPrediction = evaluateStoichiometryPrediction({
  analysis: water,
  predictedLimitingId: 'h2',
  predictedTargetValue: 3,
  predictedTargetUnit: 'mol',
});
assert.equal(wrongPrediction.correct, false);
assert.equal(wrongPrediction.predictedLimitingId, 'h2');
assert.equal(wrongPrediction.predictedTargetValue, 3);
assert.equal(wrongPrediction.dimensions.limiting.correct, false);
assert.equal(wrongPrediction.dimensions.target.correct, false);

const tiePrediction = evaluateStoichiometryPrediction({
  analysis: tie,
  predictedLimitingId: 'stoichiometric',
  predictedTargetValue: tie.target.theoreticalMassG,
  predictedTargetUnit: 'g',
});
assert.equal(tiePrediction.correct, true);

const yield75 = analyzeChemicalYield({ analysis: water, isolatedMassG: water.target.theoreticalMassG * 0.75 });
near(yield75.percentYield, 75, 1e-10, '75 percent yield');
assert.equal(yield75.status, 'within-theoretical');
const impossibleYield = analyzeChemicalYield({ analysis: water, isolatedMassG: 80 });
assert.equal(impossibleYield.status, 'above-theoretical');
assert.ok(impossibleYield.percentYield > 100);
assert.equal(impossibleYield.isolatedMassG, 80);

const trace = createExtentTrace({ analysis: water, pointCount: 61 });
assert.equal(trace.points.length, 61);
near(trace.points[0].extentMol, 0, 1e-12, 'trace start');
near(trace.points.at(-1).extentMol, 2, 1e-12, 'trace end');
for (let index = 1; index < trace.points.length; index += 1) {
  assert.ok(trace.points[index].extentMol >= trace.points[index - 1].extentMol);
  for (const reactant of water.reactants) {
    assert.ok(trace.points[index].reactantMoles[reactant.id] <= trace.points[index - 1].reactantMoles[reactant.id] + 1e-12);
  }
  for (const product of water.products) {
    assert.ok(trace.points[index].productMoles[product.id] >= trace.points[index - 1].productMoles[product.id] - 1e-12);
  }
}

const zeroFeed = analyzeStoichiometry({
  scenarioId: 'water-synthesis',
  feeds: { h2: { value: 0, unit: 'mol' }, o2: { value: 2, unit: 'mol' } },
  targetProductId: 'h2o',
});
near(zeroFeed.extentMol, 0, 1e-12, 'zero-feed extent');
assert.deepEqual(zeroFeed.limiting.ids, ['h2']);
near(zeroFeed.target.theoreticalMassG, 0, 1e-12, 'zero-feed product');

assert.ok(Object.isFrozen(water));
assert.ok(Object.isFrozen(water.reactants));
assert.ok(Object.isFrozen(water.reactants[0]));
assert.deepEqual(waterInput, {
  scenarioId: 'water-synthesis',
  feeds: { h2: { value: 5, unit: 'mol' }, o2: { value: 2, unit: 'mol' } },
  targetProductId: 'h2o',
});
assert.ok(STOICHIOMETRY_MODEL_BOUNDARY.includes.length >= 8);
assert.ok(STOICHIOMETRY_MODEL_BOUNDARY.excludes.length >= 8);

assert.throws(() => convertFeedToMoles({ formula: 'H2O', value: -1, unit: 'mol' }), /non-negative/i);
assert.throws(() => convertFeedToMoles({ formula: 'H2O', value: 1, unit: 'kg' }), /unsupported feed unit/i);
assert.throws(() => analyzeStoichiometry({ ...waterInput, targetProductId: 'missing' }), /target product/i);
assert.throws(() => analyzeStoichiometry({ ...waterInput, feeds: { h2: { value: 1, unit: 'mol' } } }), /feed/i);
assert.throws(() => analyzeChemicalYield({ analysis: water, isolatedMassG: -1 }), /non-negative/i);
assert.throws(() => createExtentTrace({ analysis: water, pointCount: 1 }), /point count/i);

console.log(`Water reference: xi ${water.extentMol.toFixed(3)} mol; O2 limiting; H2 leftover ${water.reactants.find((item) => item.id === 'h2').leftoverMoles.toFixed(3)} mol; H2O ${water.target.theoreticalMoles.toFixed(3)} mol / ${water.target.theoreticalMassG.toFixed(3)} g.`);
console.log(`Stoichiometric tie: 4.000 mol H2 + 2.000 mol O2; both feeds reach zero at xi ${tie.extentMol.toFixed(3)} mol.`);
console.log(`Methane multi-product case: xi ${methane.extentMol.toFixed(3)} mol; ${methane.products.map((item) => `${item.amountMoles.toFixed(3)} mol ${item.formula}`).join(' and ')}.`);
console.log(`Yield audit: ${yield75.percentYield.toFixed(2)}% accepted; ${impossibleYield.percentYield.toFixed(2)}% retained and flagged above theoretical.`);
console.log('mass/mole equivalence, exact entity conversion, limiting and tie logic, leftovers, multi-product mass closure, prediction preservation, extent trace, yield audit, immutability, and rejection boundaries verified.');
