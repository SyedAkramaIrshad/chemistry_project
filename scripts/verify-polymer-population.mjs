import assert from 'node:assert/strict';
import {
  POLYMER_MODEL_BOUNDARY,
  POLYMER_RELATIONS,
  POLYMER_REPEAT_UNIT_BY_ID,
  POLYMER_REPEAT_UNITS,
  POLYMER_SCENARIO_BY_ID,
  POLYMER_SCENARIOS,
} from '../src/data/polymerScenarios.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../src/data/scienceSources.js';
import {
  analysePolymerPopulation,
  comparePolymerPopulations,
  evaluatePolymerAttempt,
  nextPolymerHint,
} from '../src/chemistry/polymerPopulation.js';

const EXPECTED_REPEAT_IDS = ['ethene-derived', 'propene-derived', 'styrene-derived'];
const EXPECTED_SCENARIO_IDS = [
  'uniform-vs-spread',
  'long-tail-leverage',
  'count-mass-lens',
  'same-degree-different-cru',
  'end-groups-in-view',
  'same-moments-different-shape',
];
const EXPECTED_SOURCE_IDS = [
  'iupacConstitutionalRepeatingUnit',
  'iupacMacromolecule',
  'iupacDegreePolymerization',
  'iupacNumberAverageMolarMass',
  'iupacMassAverageMolarMass',
  'iupacDispersity',
  'iupacPurpleBook',
  'acsTwoYearCurriculum',
];

assert.deepEqual(POLYMER_REPEAT_UNITS.map((item) => item.id), EXPECTED_REPEAT_IDS);
assert.deepEqual(POLYMER_SCENARIOS.map((item) => item.id), EXPECTED_SCENARIO_IDS);
assert.deepEqual(POLYMER_RELATIONS, ['left', 'equal', 'right']);
assert.equal(Object.keys(POLYMER_REPEAT_UNIT_BY_ID).length, 3);
assert.equal(Object.keys(POLYMER_SCENARIO_BY_ID).length, 6);
assert.ok(Object.isFrozen(POLYMER_REPEAT_UNITS));
assert.ok(Object.isFrozen(POLYMER_REPEAT_UNIT_BY_ID));
assert.ok(Object.isFrozen(POLYMER_SCENARIOS));
assert.ok(Object.isFrozen(POLYMER_SCENARIO_BY_ID));
assert.ok(Object.isFrozen(POLYMER_RELATIONS));
assert.ok(Object.isFrozen(POLYMER_MODEL_BOUNDARY));

for (const repeatUnit of POLYMER_REPEAT_UNITS) {
  assert.ok(Object.isFrozen(repeatUnit));
  assert.ok(Object.isFrozen(repeatUnit.endGroups));
  assert.ok(Object.isFrozen(repeatUnit.sourceIds));
  assert.match(repeatUnit.accent, /^#[0-9a-f]{6}$/i);
  assert.ok(repeatUnit.name.length >= 12);
  assert.ok(repeatUnit.motif.includes('–'));
  assert.ok(repeatUnit.formula.length >= 4);
  assert.ok(Number.isFinite(repeatUnit.repeatMolarMassGmol));
  assert.ok(repeatUnit.repeatMolarMassGmol > 0);
  assert.ok(Number.isFinite(repeatUnit.endGroupMolarMassGmol));
  assert.ok(repeatUnit.endGroupMolarMassGmol >= 0);
  assert.equal(repeatUnit.endGroups.length, 2);
  assert.equal(repeatUnit.provenance.kind, 'synthetic-teaching');
  assert.match(repeatUnit.provenance.statement, /teaching|not.+real|declared/i);
  assert.ok(repeatUnit.sourceIds.length >= 3);
}

for (const scenario of POLYMER_SCENARIOS) {
  assert.ok(Object.isFrozen(scenario));
  assert.ok(Object.isFrozen(scenario.left));
  assert.ok(Object.isFrozen(scenario.right));
  assert.ok(Object.isFrozen(scenario.left.bins));
  assert.ok(Object.isFrozen(scenario.right.bins));
  assert.ok(Object.isFrozen(scenario.sourceIds));
  assert.ok(scenario.code.length >= 4);
  assert.ok(scenario.name.length >= 12);
  assert.ok(scenario.summary.length >= 35);
  assert.ok(scenario.mission.length >= 35);
  assert.ok(scenario.teacherQuestion.length >= 35);
  assert.ok(scenario.misconception.length >= 35);
  assert.equal(scenario.provenance.kind, 'synthetic-teaching');
  assert.match(scenario.provenance.statement, /synthetic|not measured/i);
  assert.ok(scenario.sourceIds.length >= 5);

  for (const specimen of [scenario.left, scenario.right]) {
    assert.ok(POLYMER_REPEAT_UNIT_BY_ID[specimen.repeatUnitId]);
    assert.ok(specimen.label.length >= 5);
    assert.ok(specimen.bins.every(Object.isFrozen));
    assert.ok(specimen.bins.length >= 1 && specimen.bins.length <= 5);
    assert.equal(new Set(specimen.bins.map((bin) => bin.degree)).size, specimen.bins.length);
    assert.ok(specimen.bins.every((bin) => Number.isInteger(bin.degree) && bin.degree >= 1 && bin.degree <= 200));
    assert.ok(specimen.bins.every((bin) => Number.isInteger(bin.count) && bin.count >= 0 && bin.count <= 50));
    assert.ok(specimen.bins.reduce((sum, bin) => sum + bin.count, 0) > 0);
  }
}

assert.equal(new Set(POLYMER_REPEAT_UNITS.map((item) => item.id)).size, 3);
assert.equal(new Set(POLYMER_SCENARIOS.map((item) => item.id)).size, 6);
assert.equal(new Set(POLYMER_SCENARIOS.map((item) => item.code)).size, 6);
assert.match(POLYMER_MODEL_BOUNDARY.included, /Mn|Mw|dispersity|end-group/i);
assert.match(POLYMER_MODEL_BOUNDARY.excluded, /property|morphology|synthesis|measurement/i);
assert.match(POLYMER_MODEL_BOUNDARY.safety, /no.+procedure/i);

for (const sourceId of EXPECTED_SOURCE_IDS) {
  assert.ok(SCIENCE_SOURCES[sourceId], `Missing polymer source ${sourceId}.`);
}
assert.ok(MODEL_PASSPORTS.polymerPopulationStudio);
assert.match(MODEL_PASSPORTS.polymerPopulationStudio.resultKind, /not measured|not.+property/i);
assert.equal(MODEL_PASSPORTS.polymerPopulationStudio.sources.length, 8);
assert.ok(MODEL_PASSPORTS.polymerPopulationStudio.excludes.some((item) => /morphology|crystallinity/i.test(item)));

console.log('Three immutable repeat-unit reels, six synthetic population challenges, sources, and model boundary verified.');

const closeTo = (actual, expected, tolerance = 1e-10) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} should be within ${tolerance} of ${expected}.`);
};

const analyses = new Map();
for (const scenario of POLYMER_SCENARIOS) {
  const left = analysePolymerPopulation(scenario.left);
  const right = analysePolymerPopulation(scenario.right);
  const comparison = comparePolymerPopulations(left, right);
  analyses.set(scenario.id, { left, right, comparison });

  for (const analysis of [left, right]) {
    assert.ok(Object.isFrozen(analysis));
    assert.ok(Object.isFrozen(analysis.repeatUnit));
    assert.ok(Object.isFrozen(analysis.bins));
    assert.ok(analysis.bins.every(Object.isFrozen));
    assert.ok(Object.isFrozen(analysis.equationLedger));
    assert.ok(analysis.chainCount > 0);
    assert.ok(analysis.numberAverageMolarMass > 0);
    assert.ok(analysis.massAverageMolarMass + 1e-10 >= analysis.numberAverageMolarMass);
    assert.ok(analysis.dispersity >= 1 - 1e-12);
    closeTo(analysis.bins.reduce((sum, bin) => sum + bin.numberFraction, 0), 1);
    closeTo(analysis.bins.reduce((sum, bin) => sum + bin.massFraction, 0), 1);
    closeTo(
      analysis.numberAverageMolarMass,
      analysis.repeatUnit.endGroupMolarMassGmol
        + analysis.numberAverageDegree * analysis.repeatUnit.repeatMolarMassGmol,
      1e-9,
    );
  }

  assert.ok(Object.isFrozen(comparison));
  assert.ok(Object.isFrozen(comparison.relations));
  assert.ok(Object.isFrozen(comparison.differences));
  assert.equal(comparison.distributionClaim, 'statistics-do-not-prove-same');
}

const uniform = analysePolymerPopulation({
  repeatUnitId: 'ethene-derived',
  bins: [{ degree: 20, count: 12 }],
});
closeTo(uniform.numberAverageDegree, 20);
closeTo(uniform.numberAverageMolarMass, 563.096);
closeTo(uniform.massAverageMolarMass, 563.096);
closeTo(uniform.dispersity, 1);
assert.equal(uniform.bins[0].numberFraction, 1);
assert.equal(uniform.bins[0].massFraction, 1);

const spread = analyses.get('uniform-vs-spread');
assert.deepEqual(spread.comparison.relations, {
  mnRelation: 'equal',
  mwRelation: 'right',
  dispersityRelation: 'right',
});
closeTo(spread.left.numberAverageDegree, spread.right.numberAverageDegree);
closeTo(spread.left.numberAverageMolarMass, spread.right.numberAverageMolarMass);
assert.ok(spread.right.massAverageMolarMass > spread.left.massAverageMolarMass);

const tail = analyses.get('long-tail-leverage');
assert.deepEqual(tail.comparison.relations, {
  mnRelation: 'right',
  mwRelation: 'right',
  dispersityRelation: 'right',
});
assert.equal(tail.right.bins.find((bin) => bin.degree === 200).numberFraction, 0.05);
assert.ok(tail.right.bins.find((bin) => bin.degree === 200).massFraction > 0.34);

const lenses = analyses.get('count-mass-lens');
assert.deepEqual(lenses.comparison.relations, {
  mnRelation: 'right',
  mwRelation: 'right',
  dispersityRelation: 'left',
});
const longMinority = lenses.left.bins.find((bin) => bin.degree === 90);
closeTo(longMinority.numberFraction, 0.1);
assert.ok(longMinority.massFraction > 0.49 && longMinority.massFraction < 0.51);

const cru = analyses.get('same-degree-different-cru');
assert.deepEqual(cru.comparison.relations, {
  mnRelation: 'right',
  mwRelation: 'right',
  dispersityRelation: 'right',
});
closeTo(cru.left.numberAverageDegree, cru.right.numberAverageDegree);
assert.equal(cru.comparison.sameBinShape, true);
assert.equal(cru.comparison.sameRepeatUnit, false);

const ends = analyses.get('end-groups-in-view');
assert.deepEqual(ends.comparison.relations, {
  mnRelation: 'right',
  mwRelation: 'right',
  dispersityRelation: 'equal',
});
assert.ok(ends.left.endGroupMassFraction > ends.right.endGroupMassFraction * 15);

const sameMoments = analyses.get('same-moments-different-shape');
assert.deepEqual(sameMoments.comparison.relations, {
  mnRelation: 'equal',
  mwRelation: 'equal',
  dispersityRelation: 'equal',
});
closeTo(sameMoments.left.degreeSecondMoment, sameMoments.right.degreeSecondMoment);
closeTo(sameMoments.left.numberAverageMolarMass, sameMoments.right.numberAverageMolarMass);
closeTo(sameMoments.left.massAverageMolarMass, sameMoments.right.massAverageMolarMass);
closeTo(sameMoments.left.dispersity, sameMoments.right.dispersity);
assert.equal(sameMoments.comparison.sameBinShape, false);
assert.equal(sameMoments.comparison.sameDegreeMoments, true);
assert.equal(sameMoments.comparison.sameMolarMassStatistics, true);

const correctPrediction = Object.freeze({
  mnRelation: 'equal',
  mwRelation: 'equal',
  dispersityRelation: 'equal',
  distributionClaim: 'statistics-do-not-prove-same',
});
const correctEvaluation = evaluatePolymerAttempt({ comparison: sameMoments.comparison, prediction: correctPrediction });
assert.equal(correctEvaluation.score.correct, 4);
assert.equal(correctEvaluation.score.total, 4);
assert.equal(correctEvaluation.committed, true);
assert.deepEqual(correctEvaluation.learnerPrediction, correctPrediction);
assert.ok(Object.isFrozen(correctEvaluation));
assert.ok(Object.isFrozen(correctEvaluation.dimensions));

const wrongPrediction = Object.freeze({
  mnRelation: 'left',
  mwRelation: 'right',
  dispersityRelation: 'left',
  distributionClaim: 'statistics-prove-same',
});
const beforeWrong = JSON.stringify(wrongPrediction);
const wrongEvaluation = evaluatePolymerAttempt({ comparison: sameMoments.comparison, prediction: wrongPrediction });
assert.equal(JSON.stringify(wrongPrediction), beforeWrong);
assert.equal(wrongEvaluation.score.correct, 0);
assert.deepEqual(wrongEvaluation.learnerPrediction, wrongPrediction);
assert.ok(Object.values(wrongEvaluation.dimensions).every((dimension) => dimension.correct === false));

for (let level = 1; level <= 4; level += 1) {
  const beforeComparison = JSON.stringify(sameMoments.comparison);
  const hint = nextPolymerHint({ comparison: sameMoments.comparison, prediction: wrongPrediction, level });
  assert.equal(typeof hint, 'string');
  assert.ok(hint.length >= 45);
  assert.equal(JSON.stringify(sameMoments.comparison), beforeComparison);
  assert.equal(JSON.stringify(wrongPrediction), beforeWrong);
}

const editableInput = Object.freeze({
  repeatUnitId: 'ethene-derived',
  bins: Object.freeze([{ degree: 30, count: 2 }, { degree: 10, count: 3 }, { degree: 20, count: 0 }].map(Object.freeze)),
});
const editableBefore = JSON.stringify(editableInput);
const normalized = analysePolymerPopulation(editableInput);
assert.equal(JSON.stringify(editableInput), editableBefore);
assert.deepEqual(normalized.bins.map((bin) => bin.degree), [10, 30]);

assert.throws(() => analysePolymerPopulation({ repeatUnitId: 'ghost', bins: [{ degree: 2, count: 1 }] }), /Unknown polymer repeat unit/);
assert.throws(() => analysePolymerPopulation({ repeatUnitId: 'ethene-derived', bins: [] }), /at least one chain bin/);
assert.throws(() => analysePolymerPopulation({ repeatUnitId: 'ethene-derived', bins: [{ degree: 2, count: 0 }] }), /at least one representative chain/);
assert.throws(() => analysePolymerPopulation({ repeatUnitId: 'ethene-derived', bins: [{ degree: 2, count: -1 }] }), /count/);
assert.throws(() => analysePolymerPopulation({ repeatUnitId: 'ethene-derived', bins: [{ degree: 2.5, count: 1 }] }), /degree/);
assert.throws(() => analysePolymerPopulation({ repeatUnitId: 'ethene-derived', bins: [{ degree: 201, count: 1 }] }), /degree/);
assert.throws(() => analysePolymerPopulation({ repeatUnitId: 'ethene-derived', bins: [{ degree: 2, count: 51 }] }), /count/);
assert.throws(() => analysePolymerPopulation({ repeatUnitId: 'ethene-derived', bins: [{ degree: 2, count: 1 }, { degree: 2, count: 2 }] }), /Duplicate chain degree/);
assert.throws(() => comparePolymerPopulations(null, uniform), /two polymer population analyses/);
assert.throws(() => evaluatePolymerAttempt({ comparison: spread.comparison, prediction: { mnRelation: 'left' } }), /complete four-part prediction/);
assert.throws(() => evaluatePolymerAttempt({ comparison: spread.comparison, prediction: { ...wrongPrediction, mnRelation: 'larger' } }), /relation/);
assert.throws(() => nextPolymerHint({ comparison: spread.comparison, prediction: wrongPrediction, level: 0 }), /between 1 and 4/);
assert.throws(() => nextPolymerHint({ comparison: spread.comparison, prediction: wrongPrediction, level: 5 }), /between 1 and 4/);

console.log('Finite-chain masses, number/mass fractions, Mn, Mw, dispersity, six comparisons, learner preservation, and hints verified.');
