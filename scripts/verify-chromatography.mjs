import assert from 'node:assert/strict';
import {
  CHROMATOGRAPHY_MODEL_BOUNDARY,
  CHROMATOGRAPHY_PHASE_COLORS,
  CHROMATOGRAPHY_RESOLUTION_BANDS,
  CHROMATOGRAPHY_SCENARIO_BY_ID,
  CHROMATOGRAPHY_SCENARIOS,
} from '../src/data/chromatographyScenarios.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../src/data/scienceSources.js';

const EXPECTED_SCENARIOS = [
  'crowded-pair',
  'phase-order-reversal',
  'short-column',
  'slow-flow',
  'fast-flow',
  'retention-is-not-identity',
];
const SOURCE_IDS = [
  'iupacChromatographyHoldUpTime',
  'iupacChromatographyRetentionTime',
  'iupacChromatographyRetentionFactor',
  'iupacChromatographySeparationFactor',
  'iupacChromatographyPeakWidth',
  'iupacChromatographyPlateNumber',
  'iupacChromatographyPeakResolution',
  'nistSeparationMethods',
  'acsUndergraduateCurriculum',
];
const close = (actual, expected, tolerance = 1e-9) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);
};

assert.deepEqual(CHROMATOGRAPHY_SCENARIOS.map((item) => item.id), EXPECTED_SCENARIOS);
assert.equal(CHROMATOGRAPHY_SCENARIOS.length, 6);
assert.equal(Object.keys(CHROMATOGRAPHY_SCENARIO_BY_ID).length, 6);
assert.deepEqual(Object.keys(CHROMATOGRAPHY_RESOLUTION_BANDS), ['overlap', 'partial', 'board-baseline']);
assert.deepEqual(Object.keys(CHROMATOGRAPHY_PHASE_COLORS), ['componentA', 'componentB', 'total', 'unretained']);
assert.ok(Object.isFrozen(CHROMATOGRAPHY_SCENARIOS));
assert.ok(Object.isFrozen(CHROMATOGRAPHY_SCENARIO_BY_ID));
assert.ok(Object.isFrozen(CHROMATOGRAPHY_RESOLUTION_BANDS));
assert.ok(Object.isFrozen(CHROMATOGRAPHY_PHASE_COLORS));
assert.ok(Object.isFrozen(CHROMATOGRAPHY_MODEL_BOUNDARY));

for (const scenario of CHROMATOGRAPHY_SCENARIOS) {
  assert.ok(Object.isFrozen(scenario));
  assert.ok(Object.isFrozen(scenario.phases));
  assert.ok(Object.isFrozen(scenario.defaultMethod));
  assert.ok(Object.isFrozen(scenario.model));
  assert.ok(Object.isFrozen(scenario.sourceIds));
  assert.equal(scenario.phases.length, 3);
  assert.equal(new Set(scenario.phases.map((phase) => phase.id)).size, 3);
  assert.ok(scenario.phases.every(Object.isFrozen));
  assert.ok(scenario.phases.every((phase) => phase.kA > 0 && phase.kB > 0));
  assert.ok(scenario.phases.every((phase) => /^#[0-9a-f]{6}$/i.test(phase.accent)));
  assert.ok(scenario.phases.every((phase) => /synthetic|teaching/i.test(`${phase.label} ${phase.chemistryHint}`)));
  assert.ok(scenario.phases.some((phase) => phase.id === scenario.defaultMethod.phaseId));
  assert.ok([5, 15, 25].includes(scenario.defaultMethod.columnLengthCm));
  assert.ok(scenario.defaultMethod.relativeVelocity >= 0.3 && scenario.defaultMethod.relativeVelocity <= 3);
  assert.ok(['referenceLengthCm', 'holdUpAtReferenceMin', 'plateScale', 'A', 'B', 'C'].every((key) => scenario.model[key] > 0));
  assert.ok(scenario.code.length >= 4);
  assert.ok(scenario.name.length >= 8);
  assert.ok(scenario.summary.length >= 35);
  assert.ok(scenario.mission.length >= 40);
  assert.ok(scenario.teacherQuestion.length >= 40);
  assert.ok(scenario.misconception.length >= 40);
  assert.equal(scenario.provenance.kind, 'synthetic-teaching');
  assert.match(scenario.provenance.statement, /synthetic|not measured/i);
  assert.ok(scenario.componentA.label.length >= 3);
  assert.ok(scenario.componentB.label.length >= 3);
  assert.ok(scenario.componentA.responseWeight > 0);
  assert.ok(scenario.componentB.responseWeight > 0);
  assert.deepEqual(scenario.sourceIds, SOURCE_IDS);
}

assert.ok(CHROMATOGRAPHY_SCENARIOS.flatMap((item) => item.phases).some((phase) => Math.max(phase.kA, phase.kB) / Math.min(phase.kA, phase.kB) < 1.08));
assert.ok(CHROMATOGRAPHY_SCENARIOS.flatMap((item) => item.phases).some((phase) => Math.max(phase.kA, phase.kB) / Math.min(phase.kA, phase.kB) > 1.35));
assert.match(CHROMATOGRAPHY_MODEL_BOUNDARY.velocity, /relative|dimensionless/i);
assert.match(CHROMATOGRAPHY_MODEL_BOUNDARY.identity, /not.+identity|identity.+not/i);
assert.match(CHROMATOGRAPHY_MODEL_BOUNDARY.resolution, /1\.5.+criterion|criterion.+1\.5/i);
assert.match(CHROMATOGRAPHY_MODEL_BOUNDARY.safety, /no.+procedure|virtual/i);

for (const sourceId of SOURCE_IDS) assert.ok(SCIENCE_SOURCES[sourceId], `Missing chromatography source ${sourceId}.`);
assert.ok(MODEL_PASSPORTS.chromatographyControlRoom);
assert.equal(MODEL_PASSPORTS.chromatographyControlRoom.sources.length, 9);
assert.match(MODEL_PASSPORTS.chromatographyControlRoom.resultKind, /not.+identity|not.+validated/i);
assert.ok(MODEL_PASSPORTS.chromatographyControlRoom.excludes.some((item) => /pressure|solvent|gradient/i.test(item)));

console.log('Six immutable synthetic chromatography challenges, nine primary sources, and the separation model boundary verified.');

const {
  compareChromatographyRuns,
  evaluateChromatographyAttempt,
  nextChromatographyHint,
  simulateChromatographyRun,
} = await import('../src/chemistry/chromatography.js');

for (const scenario of CHROMATOGRAPHY_SCENARIOS) {
  const run = simulateChromatographyRun({ scenarioId: scenario.id, method: scenario.defaultMethod });
  assert.ok(Object.isFrozen(run));
  assert.ok(Object.isFrozen(run.method));
  assert.ok(Object.isFrozen(run.peaks));
  assert.ok(Object.isFrozen(run.trace));
  assert.ok(run.peaks.every(Object.isFrozen));
  assert.ok(run.trace.every(Object.isFrozen));
  assert.equal(run.trace.length, 281);
  assert.ok(run.trace.every((point, index) => index === 0 || point.time > run.trace[index - 1].time));
  assert.ok(run.trace.every((point) => point.signalA >= 0 && point.signalB >= 0 && point.totalSignal >= 0));
  assert.ok(run.trace.every((point) => Math.abs(point.totalSignal - point.signalA - point.signalB) < 1e-12));
  assert.ok(run.trace.every((point) => point.normalizedTotal >= 0 && point.normalizedTotal <= 1 + 1e-12));
  assert.equal(run.order.length, 2);
  assert.notEqual(run.order[0].componentId, run.order[1].componentId);
  assert.ok(run.holdUpTime > 0);
  assert.ok(run.plateHeight.total > 0);
  assert.ok(run.plateNumber > 0);
  assert.ok(run.resolution >= 0);
  assert.ok(['overlap', 'partial', 'board-baseline'].includes(run.resolutionClass));
  assert.ok(['slow', 'near-optimum', 'fast'].includes(run.flowRegion));
  for (const peak of run.peaks) {
    close(peak.adjustedRetentionTime, run.holdUpTime * peak.retentionFactor);
    close(peak.retentionTime, run.holdUpTime + peak.adjustedRetentionTime);
    close(peak.widthHalfHeight, 2 * Math.sqrt(2 * Math.log(2)) * peak.sigma);
    close(peak.widthBase, 4 * peak.sigma);
    close(peak.recalculatedPlateNumber, run.plateNumber, 1e-6);
  }

  const correctPrediction = {
    firstPeak: run.order[0].componentId,
    resolutionClass: run.resolutionClass,
    flowRegion: run.flowRegion,
    identityClaim: 'not-established',
  };
  const correct = evaluateChromatographyAttempt({ run, prediction: correctPrediction });
  assert.equal(correct.score.correct, 4);
  assert.equal(correct.committed, true);
  assert.deepEqual(correct.learnerPrediction, correctPrediction);
  assert.ok(Object.isFrozen(correct));

  const wrongPrediction = Object.freeze({
    firstPeak: run.order[1].componentId,
    resolutionClass: run.resolutionClass === 'overlap' ? 'board-baseline' : 'overlap',
    flowRegion: run.flowRegion === 'slow' ? 'fast' : 'slow',
    identityClaim: 'established',
  });
  const beforeRun = JSON.stringify(run);
  const beforePrediction = JSON.stringify(wrongPrediction);
  const wrong = evaluateChromatographyAttempt({ run, prediction: wrongPrediction });
  assert.equal(wrong.score.correct, 0);
  assert.equal(JSON.stringify(run), beforeRun);
  assert.equal(JSON.stringify(wrongPrediction), beforePrediction);
  assert.deepEqual(wrong.learnerPrediction, wrongPrediction);
  assert.match(wrong.dimensions.identityClaim.reason, /retention.+identity|identity.+retention/i);

  for (let level = 1; level <= 4; level += 1) {
    const beforeHintRun = JSON.stringify(run);
    const beforeHintPrediction = JSON.stringify(wrongPrediction);
    const hint = nextChromatographyHint({ run, prediction: wrongPrediction, level });
    assert.equal(typeof hint, 'string');
    assert.ok(hint.length > 45);
    assert.equal(JSON.stringify(run), beforeHintRun);
    assert.equal(JSON.stringify(wrongPrediction), beforeHintPrediction);
  }
}

const crowdedDefault = simulateChromatographyRun({
  scenarioId: 'crowded-pair',
  method: CHROMATOGRAPHY_SCENARIO_BY_ID['crowded-pair'].defaultMethod,
});
const crowdedSelective = simulateChromatographyRun({
  scenarioId: 'crowded-pair',
  method: { ...crowdedDefault.method, phaseId: 'selective-split' },
});
assert.equal(crowdedDefault.resolutionClass, 'overlap');
assert.equal(crowdedSelective.resolutionClass, 'board-baseline');
assert.ok(crowdedSelective.separationFactor > crowdedDefault.separationFactor);

const reversalA = simulateChromatographyRun({
  scenarioId: 'phase-order-reversal',
  method: { phaseId: 'a-retaining', columnLengthCm: 15, relativeVelocity: 1.2 },
});
const reversalB = simulateChromatographyRun({
  scenarioId: 'phase-order-reversal',
  method: { phaseId: 'b-retaining', columnLengthCm: 15, relativeVelocity: 1.2 },
});
assert.notEqual(reversalA.order[0].componentId, reversalB.order[0].componentId);

const shortRun = simulateChromatographyRun({
  scenarioId: 'short-column',
  method: { phaseId: 'modest-selectivity', columnLengthCm: 5, relativeVelocity: 1.2 },
});
const longRun = simulateChromatographyRun({
  scenarioId: 'short-column',
  method: { phaseId: 'modest-selectivity', columnLengthCm: 25, relativeVelocity: 1.2 },
});
close(longRun.separationFactor, shortRun.separationFactor);
close(longRun.plateNumber / shortRun.plateNumber, 5);
close(longRun.holdUpTime / shortRun.holdUpTime, 5);
assert.ok(longRun.resolution > shortRun.resolution);
assert.equal(shortRun.resolutionClass, 'overlap');
assert.equal(longRun.resolutionClass, 'board-baseline');

const slowDefault = simulateChromatographyRun({
  scenarioId: 'slow-flow',
  method: CHROMATOGRAPHY_SCENARIO_BY_ID['slow-flow'].defaultMethod,
});
const slowOptimum = simulateChromatographyRun({
  scenarioId: 'slow-flow',
  method: { ...slowDefault.method, relativeVelocity: slowDefault.optimumVelocity },
});
assert.equal(slowDefault.flowRegion, 'slow');
assert.ok(slowDefault.plateHeight.longitudinal > slowDefault.plateHeight.massTransfer);
assert.equal(slowOptimum.flowRegion, 'near-optimum');
assert.ok(slowOptimum.plateHeight.total < slowDefault.plateHeight.total);

const fastDefault = simulateChromatographyRun({
  scenarioId: 'fast-flow',
  method: CHROMATOGRAPHY_SCENARIO_BY_ID['fast-flow'].defaultMethod,
});
assert.equal(fastDefault.flowRegion, 'fast');
assert.ok(fastDefault.plateHeight.massTransfer > fastDefault.plateHeight.longitudinal);

const identityRun = simulateChromatographyRun({
  scenarioId: 'retention-is-not-identity',
  method: CHROMATOGRAPHY_SCENARIO_BY_ID['retention-is-not-identity'].defaultMethod,
});
const identityWrong = evaluateChromatographyAttempt({
  run: identityRun,
  prediction: {
    firstPeak: identityRun.order[0].componentId,
    resolutionClass: identityRun.resolutionClass,
    flowRegion: identityRun.flowRegion,
    identityClaim: 'established',
  },
});
assert.equal(identityWrong.score.correct, 3);
assert.equal(identityWrong.dimensions.identityClaim.correct, false);

const comparison = compareChromatographyRuns(shortRun, longRun);
assert.ok(Object.isFrozen(comparison));
assert.ok(comparison.changes.plateNumber > 0);
assert.ok(comparison.changes.resolution > 0);
assert.equal(comparison.changes.separationFactor, 0);
assert.match(comparison.statements.join(' '), /length|plate|selectivity/i);

assert.throws(() => simulateChromatographyRun({ scenarioId: 'ghost', method: shortRun.method }), /Unknown chromatography scenario/);
assert.throws(() => simulateChromatographyRun({ scenarioId: 'short-column', method: { ...shortRun.method, phaseId: 'ghost' } }), /Unknown phase/);
assert.throws(() => simulateChromatographyRun({ scenarioId: 'short-column', method: { ...shortRun.method, columnLengthCm: 10 } }), /column length/);
for (const relativeVelocity of [0.2, 3.1, Number.NaN, Number.POSITIVE_INFINITY]) {
  assert.throws(() => simulateChromatographyRun({ scenarioId: 'short-column', method: { ...shortRun.method, relativeVelocity } }), /relative velocity/);
}
assert.throws(() => evaluateChromatographyAttempt({ run: shortRun, prediction: { firstPeak: 'A' } }), /resolutionClass/);
assert.throws(() => nextChromatographyHint({ run: shortRun, prediction: {}, level: 0 }), /between 1 and 4/);
assert.throws(() => nextChromatographyHint({ run: shortRun, prediction: {}, level: 5 }), /between 1 and 4/);
assert.throws(() => compareChromatographyRuns(shortRun, null), /two chromatography runs/);

console.log('Retention, Gaussian widths, plate-height contributions, plate closure, resolution, immutable predictions, hints, and method comparisons verified.');
