import assert from 'node:assert/strict';
import {
  E2_STEREOCHEMISTRY_SCENARIOS,
  E2_STEREOCHEMISTRY_SCENARIO_BY_ID,
  MULTICENTRE_SCENARIOS,
  MULTICENTRE_SCENARIO_BY_ID,
  SN2_STEREOCHEMISTRY_SCENARIOS,
  SN2_STEREOCHEMISTRY_SCENARIO_BY_ID,
  STEREOCHEMICAL_REACTION_BOUNDARY,
  STEREOCHEMICAL_REACTION_CONSTANTS,
} from '../src/data/stereochemicalReactionScenarios.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../src/data/scienceSources.js';
import {
  analyzeE2Stereo,
  analyzeMulticentreRelationship,
  analyzeSn2Stereo,
  commitE2Stereo,
  commitSn2Stereo,
  createE2StereoState,
  createMulticentreState,
  createSn2StereoState,
  evaluateE2Prediction,
  evaluateMulticentrePrediction,
  evaluateSn2Prediction,
  flipMulticentreDescriptor,
  nextE2StereoHint,
  nextMulticentreHint,
  nextSn2StereoHint,
  selectE2BetaHydrogen,
  setE2RearRotation,
  setSn2ApproachAngle,
} from '../src/chemistry/stereochemicalReactions.js';

const recursivelyFrozen = (value, seen = new Set()) => {
  if (!value || typeof value !== 'object' || seen.has(value)) return true;
  seen.add(value);
  return Object.isFrozen(value) && Object.values(value).every((nested) => recursivelyFrozen(nested, seen));
};

const close = (actual, expected, tolerance = 1e-12) => {
  assert.ok(Number.isFinite(actual), `${actual} should be finite.`);
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} should be within ${tolerance} of ${expected}.`);
};

assert.equal(MULTICENTRE_SCENARIOS.length, 6);
assert.equal(SN2_STEREOCHEMISTRY_SCENARIOS.length, 5);
assert.equal(E2_STEREOCHEMISTRY_SCENARIOS.length, 5);
for (const scenarios of [MULTICENTRE_SCENARIOS, SN2_STEREOCHEMISTRY_SCENARIOS, E2_STEREOCHEMISTRY_SCENARIOS]) {
  assert.equal(new Set(scenarios.map(({ id }) => id)).size, scenarios.length);
  assert.ok(recursivelyFrozen(scenarios));
}
assert.ok(recursivelyFrozen(MULTICENTRE_SCENARIO_BY_ID));
assert.ok(recursivelyFrozen(SN2_STEREOCHEMISTRY_SCENARIO_BY_ID));
assert.ok(recursivelyFrozen(E2_STEREOCHEMISTRY_SCENARIO_BY_ID));
assert.equal(STEREOCHEMICAL_REACTION_CONSTANTS.sn2BacksideToleranceDeg, 15);
assert.equal(STEREOCHEMICAL_REACTION_CONSTANTS.e2AntiperiplanarToleranceDeg, 15);
assert.ok(MULTICENTRE_SCENARIOS.every(({ dataKind }) => dataKind === 'declared-two-centre-teaching-configuration'));
assert.ok(SN2_STEREOCHEMISTRY_SCENARIOS.every(({ dataKind }) => dataKind === 'abstract-walden-inversion-teaching-map'));
assert.ok(E2_STEREOCHEMISTRY_SCENARIOS.every(({ dataKind }) => dataKind === 'declared-e2-stereoelectronic-teaching-channel'));
assert.match(STEREOCHEMICAL_REACTION_BOUNDARY.excluded, /more than two centres/i);
assert.match(STEREOCHEMICAL_REACTION_BOUNDARY.e2, /not a rate|rate/i);

const requiredSources = [
  'iupacRelativeConfiguration', 'iupacMesoCompound', 'iupacFischerProjection',
  'iupacWaldenInversion', 'iupacStereospecificity', 'iupacStereoselectivity',
  'iupacAnti', 'iupacElimination', 'mitSubstitutionEliminationStereochemistry',
  'acsOrganicChemistrySupplement',
];
for (const sourceId of requiredSources) assert.match(SCIENCE_SOURCES[sourceId]?.url || '', /^https:\/\//, `Missing source ${sourceId}.`);
const passport = MODEL_PASSPORTS.stereochemicalReactionTheatre;
assert.match(passport.resultKind, /declared stereochemical relationship/i);
assert.match(passport.resultKind, /not arbitrary CIP/i);
assert.ok(requiredSources.every((sourceId) => passport.sources.includes(sourceId)));
assert.match(passport.dataStatement, /do not supply the abstract cartridge values/i);
assert.match(passport.excludes.join(' '), /product ratios/i);

const relationshipCases = [
  ['symmetric-rr-ss', 'enantiomers', 2, 'chiral', 'chiral'],
  ['symmetric-rr-rs', 'diastereomers', 1, 'chiral', 'achiral-meso'],
  ['symmetric-meso-pair', 'same', 2, 'achiral-meso', 'achiral-meso'],
  ['unsymmetric-rs-sr', 'enantiomers', 2, 'chiral', 'chiral'],
  ['unsymmetric-rr-sr', 'diastereomers', 1, 'chiral', 'chiral'],
  ['unsymmetric-identical', 'same', 0, 'chiral', 'chiral'],
];

for (const [scenarioId, relationship, differenceCount, chiralityA, chiralityB] of relationshipCases) {
  const state = createMulticentreState(scenarioId);
  assert.ok(recursivelyFrozen(state));
  const result = analyzeMulticentreRelationship({ scenarioId, state });
  assert.equal(result.relationship, relationship, scenarioId);
  assert.equal(result.differingCentreCount, differenceCount, scenarioId);
  assert.equal(result.chiralityA, chiralityA, scenarioId);
  assert.equal(result.chiralityB, chiralityB, scenarioId);
  assert.ok(recursivelyFrozen(result));
}

const meso = analyzeMulticentreRelationship({
  scenarioId: 'symmetric-meso-pair',
  state: createMulticentreState('symmetric-meso-pair'),
});
assert.equal(meso.canonicalA, 'meso');
assert.equal(meso.canonicalB, 'meso');
assert.equal(meso.differingCentreCount, 2);
assert.match(meso.mirrorTest, /symmetry/i);

const relationshipState = createMulticentreState('symmetric-rr-ss');
const flipped = flipMulticentreDescriptor({ scenarioId: 'symmetric-rr-ss', state: relationshipState, specimen: 'A', centreIndex: 0 });
assert.equal(flipped.allowed, true);
assert.notEqual(flipped.state, relationshipState);
assert.deepEqual(relationshipState.specimenA, ['R', 'R']);
assert.deepEqual(flipped.state.specimenA, ['S', 'R']);
assert.equal(flipped.state.specimenB, relationshipState.specimenB);
for (const args of [
  { specimen: 'C', centreIndex: 0 },
  { specimen: 'A', centreIndex: 2 },
  { specimen: 'A', centreIndex: -1 },
]) {
  const blocked = flipMulticentreDescriptor({ scenarioId: 'symmetric-rr-ss', state: relationshipState, ...args });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.state, relationshipState);
}

const relationshipAnalysis = analyzeMulticentreRelationship({ scenarioId: 'symmetric-rr-ss', state: relationshipState });
const wrongRelationshipPrediction = Object.freeze({
  differingCentreCount: '0', relationship: 'same', chiralityPair: 'achiral-meso|achiral-meso', scope: 'arbitrary-cip',
});
const wrongRelationship = evaluateMulticentrePrediction({ analysis: relationshipAnalysis, prediction: wrongRelationshipPrediction });
assert.equal(wrongRelationship.correctCount, 0);
assert.deepEqual(wrongRelationship.learnerPrediction, wrongRelationshipPrediction);
assert.equal(evaluateMulticentrePrediction({ analysis: relationshipAnalysis, prediction: wrongRelationship.expected }).correctCount, 4);
for (let level = 1; level <= 4; level += 1) {
  const before = JSON.stringify(wrongRelationshipPrediction);
  const hint = nextMulticentreHint({ analysis: relationshipAnalysis, level });
  assert.equal(hint.level, level);
  assert.ok(hint.text.length > 25);
  assert.equal(JSON.stringify(wrongRelationshipPrediction), before);
}

for (const scenario of SN2_STEREOCHEMISTRY_SCENARIOS) {
  const state = createSn2StereoState(scenario.id);
  assert.ok(recursivelyFrozen(state));
  const allowedState = setSn2ApproachAngle({ scenarioId: scenario.id, state, angleDeg: 180 }).state;
  const committed = commitSn2Stereo({ scenarioId: scenario.id, state: allowedState });
  assert.equal(committed.committed, true, scenario.id);
  assert.equal(committed.product.geometryOutcome, 'inversion');
  assert.equal(committed.product.descriptorRelation, scenario.descriptorRelation);
  assert.equal(committed.product.productDescriptor, scenario.productDescriptor);
  assert.ok(recursivelyFrozen(committed));
}

const sn2Base = createSn2StereoState('priority-preserved-r-to-s');
for (const [angleDeg, approachClass, gateStatus] of [
  [0, 'frontside', 'blocked'],
  [90, 'oblique', 'blocked'],
  [164, 'oblique', 'blocked'],
  [165, 'backside-aligned', 'allowed'],
  [180, 'backside-aligned', 'allowed'],
  [-180, 'backside-aligned', 'allowed'],
]) {
  const state = setSn2ApproachAngle({ scenarioId: 'priority-preserved-r-to-s', state: sn2Base, angleDeg }).state;
  const result = analyzeSn2Stereo({ scenarioId: 'priority-preserved-r-to-s', state });
  assert.equal(result.approachAngleDeg, angleDeg);
  assert.equal(result.approachClass, approachClass, `${angleDeg} approach`);
  assert.equal(result.gateStatus, gateStatus, `${angleDeg} gate`);
  assert.equal(commitSn2Stereo({ scenarioId: 'priority-preserved-r-to-s', state }).product === null, gateStatus === 'blocked');
}
assert.equal(setSn2ApproachAngle({ scenarioId: 'priority-preserved-r-to-s', state: sn2Base, angleDeg: 540 }).state.approachAngleDeg, 180);
assert.equal(setSn2ApproachAngle({ scenarioId: 'priority-preserved-r-to-s', state: sn2Base, angleDeg: -540 }).state.approachAngleDeg, -180);
close(analyzeSn2Stereo({ scenarioId: 'priority-preserved-r-to-s', state: sn2Base }).alignmentIndex, 0);
close(analyzeSn2Stereo({ scenarioId: 'priority-preserved-r-to-s', state: setSn2ApproachAngle({ scenarioId: 'priority-preserved-r-to-s', state: sn2Base, angleDeg: 180 }).state }).alignmentIndex, 1);
const blockedSn2 = commitSn2Stereo({ scenarioId: 'priority-preserved-r-to-s', state: sn2Base });
assert.equal(blockedSn2.committed, false);
assert.equal(blockedSn2.product, null);
assert.equal(blockedSn2.state, sn2Base);
const invalidSn2 = setSn2ApproachAngle({ scenarioId: 'priority-preserved-r-to-s', state: sn2Base, angleDeg: Number.NaN });
assert.equal(invalidSn2.allowed, false);
assert.equal(invalidSn2.state, sn2Base);

const sn2AllowedAnalysis = analyzeSn2Stereo({
  scenarioId: 'priority-preserved-r-to-s',
  state: setSn2ApproachAngle({ scenarioId: 'priority-preserved-r-to-s', state: sn2Base, angleDeg: 180 }).state,
});
const wrongSn2Prediction = Object.freeze({ approachClass: 'frontside', productRelease: 'blocked', geometryOutcome: 'retention', descriptorRelation: 'same' });
const wrongSn2 = evaluateSn2Prediction({ analysis: sn2AllowedAnalysis, prediction: wrongSn2Prediction });
assert.equal(wrongSn2.correctCount, 0);
assert.equal(evaluateSn2Prediction({ analysis: sn2AllowedAnalysis, prediction: wrongSn2.expected }).correctCount, 4);
for (let level = 1; level <= 4; level += 1) {
  const hint = nextSn2StereoHint({ analysis: sn2AllowedAnalysis, level });
  assert.equal(hint.level, level);
  assert.ok(hint.text.length > 25);
}

const e2Base = createE2StereoState('two-hydrogen-choice');
assert.ok(recursivelyFrozen(e2Base));
const noHydrogen = analyzeE2Stereo({ scenarioId: 'two-hydrogen-choice', state: e2Base });
assert.equal(noHydrogen.gateStatus, 'blocked');
assert.equal(noHydrogen.selectedHydrogenId, null);
assert.match(noHydrogen.gateReason, /select/i);
assert.equal(commitE2Stereo({ scenarioId: 'two-hydrogen-choice', state: e2Base }).product, null);

const hE = selectE2BetaHydrogen({ scenarioId: 'two-hydrogen-choice', state: e2Base, hydrogenId: 'h-e' });
assert.equal(hE.allowed, true);
assert.equal(hE.state.rearRotationDeg, 0);
const hEAnalysis = analyzeE2Stereo({ scenarioId: 'two-hydrogen-choice', state: hE.state });
assert.equal(hEAnalysis.torsionAngleDeg, 180);
assert.equal(hEAnalysis.iupacRange, 'antiperiplanar');
assert.equal(commitE2Stereo({ scenarioId: 'two-hydrogen-choice', state: hE.state }).product.productDescriptor, 'E');

const hZ = selectE2BetaHydrogen({ scenarioId: 'two-hydrogen-choice', state: hE.state, hydrogenId: 'h-z' });
assert.equal(hZ.state.rearRotationDeg, 0);
assert.equal(analyzeE2Stereo({ scenarioId: 'two-hydrogen-choice', state: hZ.state }).torsionAngleDeg, 60);
assert.equal(commitE2Stereo({ scenarioId: 'two-hydrogen-choice', state: hZ.state }).product, null);
const hZRotated = setE2RearRotation({ scenarioId: 'two-hydrogen-choice', state: hZ.state, angleDeg: 120 });
assert.equal(hZRotated.allowed, true);
assert.equal(hZRotated.state.selectedHydrogenId, 'h-z');
const hZCommitted = commitE2Stereo({ scenarioId: 'two-hydrogen-choice', state: hZRotated.state });
assert.equal(hZCommitted.committed, true);
assert.equal(hZCommitted.product.productDescriptor, 'Z');
assert.deepEqual(hZCommitted.product.electronRibbons, ['base→H', 'C–H→C=C', 'C–LG→LG']);

const edgeScenario = createE2StereoState('declared-e-channel');
const edgeH = selectE2BetaHydrogen({ scenarioId: 'declared-e-channel', state: edgeScenario, hydrogenId: 'h-e' }).state;
for (const [rotation, expectedGate] of [[-16, 'blocked'], [-15, 'allowed']]) {
  const state = setE2RearRotation({ scenarioId: 'declared-e-channel', state: edgeH, angleDeg: rotation }).state;
  const result = analyzeE2Stereo({ scenarioId: 'declared-e-channel', state });
  assert.equal(Math.abs(result.torsionAngleDeg), rotation === -16 ? 164 : 165);
  assert.equal(result.gateStatus, expectedGate);
}

for (const [angleDeg, range] of [[0, 'synperiplanar'], [29.999, 'synperiplanar'], [30, 'synclinal'], [89.999, 'synclinal'], [90, 'anticlinal'], [149.999, 'anticlinal'], [150, 'antiperiplanar'], [180, 'antiperiplanar']]) {
  const state = createE2StereoState('rotate-to-anti');
  const selected = selectE2BetaHydrogen({ scenarioId: 'rotate-to-anti', state, hydrogenId: 'h-z' }).state;
  const rotation = angleDeg - 60;
  const rotated = setE2RearRotation({ scenarioId: 'rotate-to-anti', state: selected, angleDeg: rotation }).state;
  assert.equal(analyzeE2Stereo({ scenarioId: 'rotate-to-anti', state: rotated }).iupacRange, range, `${angleDeg} range`);
}

const lockedState = createE2StereoState('locked-non-anti');
const lockedSelected = selectE2BetaHydrogen({ scenarioId: 'locked-non-anti', state: lockedState, hydrogenId: 'h-locked' }).state;
const lockedRotation = setE2RearRotation({ scenarioId: 'locked-non-anti', state: lockedSelected, angleDeg: 120 });
assert.equal(lockedRotation.allowed, false);
assert.equal(lockedRotation.state, lockedSelected);
assert.match(lockedRotation.reason, /locked/i);
assert.equal(commitE2Stereo({ scenarioId: 'locked-non-anti', state: lockedSelected }).product, null);

const invalidHydrogen = selectE2BetaHydrogen({ scenarioId: 'two-hydrogen-choice', state: e2Base, hydrogenId: 'missing' });
assert.equal(invalidHydrogen.allowed, false);
assert.equal(invalidHydrogen.state, e2Base);
const invalidRotation = setE2RearRotation({ scenarioId: 'two-hydrogen-choice', state: e2Base, angleDeg: Infinity });
assert.equal(invalidRotation.allowed, false);
assert.equal(invalidRotation.state, e2Base);

const e2PredictionAnalysis = analyzeE2Stereo({ scenarioId: 'two-hydrogen-choice', state: hZRotated.state });
const wrongE2Prediction = Object.freeze({ torsionRange: 'synperiplanar', gatePermission: 'blocked', productResult: 'E', scope: 'rate-and-ratio' });
const wrongE2 = evaluateE2Prediction({ analysis: e2PredictionAnalysis, prediction: wrongE2Prediction });
assert.equal(wrongE2.correctCount, 0);
assert.deepEqual(wrongE2.learnerPrediction, wrongE2Prediction);
assert.equal(evaluateE2Prediction({ analysis: e2PredictionAnalysis, prediction: wrongE2.expected }).correctCount, 4);
for (let level = 1; level <= 4; level += 1) {
  const before = JSON.stringify(hZRotated.state);
  const hint = nextE2StereoHint({ analysis: e2PredictionAnalysis, level });
  assert.equal(hint.level, level);
  assert.ok(hint.text.length > 25);
  assert.equal(JSON.stringify(hZRotated.state), before);
}

assert.throws(() => createMulticentreState('missing'), /unknown/i);
assert.throws(() => createSn2StereoState('missing'), /unknown/i);
assert.throws(() => createE2StereoState('missing'), /unknown/i);

console.log('Six multicentre, five SN2, and five E2 cartridges plus source boundaries verified.');
console.log('Two-centre same/enantiomer/diastereomer/meso classification and preserved predictions verified.');
console.log('Backside inversion and antiperiplanar product gates, descriptor contrasts, hints, blocked states, and immutability verified.');
