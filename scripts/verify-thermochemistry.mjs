import assert from 'node:assert/strict';
import {
  CALORIMETRY_CHALLENGE_BY_ID,
  CALORIMETRY_CHALLENGES,
  HESS_CHALLENGE_BY_ID,
  HESS_CHALLENGES,
  HESS_MULTIPLIERS,
  THERMOCHEMISTRY_MODEL_BOUNDARY,
  THERMOCHEMISTRY_SPECIES,
  THERMOCHEMISTRY_SPECIES_BY_ID,
} from '../src/data/thermochemistryScenarios.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../src/data/scienceSources.js';
import {
  auditHessCycle,
  balanceCalorimetry,
  evaluateCalorimetryAttempt,
  evaluateHessAttempt,
  nextCalorimetryHint,
  nextHessHint,
} from '../src/chemistry/thermochemistry.js';

const EXPECTED_SPECIES_IDS = [
  'carbon-graphite',
  'hydrogen-gas',
  'oxygen-gas',
  'carbon-monoxide-gas',
  'carbon-dioxide-gas',
  'methane-gas',
  'water-liquid',
  'water-gas',
];
const EXPECTED_HESS_IDS = [
  'carbon-monoxide-formation',
  'methane-combustion-cycle',
  'water-phase-bridge',
];
const EXPECTED_CALORIMETRY_IDS = ['thermal-rise', 'thermal-fall', 'vessel-matters'];
const EXPECTED_SOURCE_IDS = [
  'iupacCalorimetry',
  'iupacHeatCapacity',
  'iupacEnthalpy',
  'iupacStandardReactionQuantities',
  'iupacExtentOfReaction',
  'nistCarbonMonoxideThermochemistry',
  'nistCarbonDioxideThermochemistry',
  'nistMethaneThermochemistry',
  'nistWaterThermochemistry',
  'acsUndergraduateCurriculum',
];

assert.deepEqual(THERMOCHEMISTRY_SPECIES.map((item) => item.id), EXPECTED_SPECIES_IDS);
assert.deepEqual(HESS_CHALLENGES.map((item) => item.id), EXPECTED_HESS_IDS);
assert.deepEqual(CALORIMETRY_CHALLENGES.map((item) => item.id), EXPECTED_CALORIMETRY_IDS);
assert.deepEqual(HESS_MULTIPLIERS, [-2, -1, -0.5, 0, 0.5, 1, 2]);
assert.equal(Object.keys(THERMOCHEMISTRY_SPECIES_BY_ID).length, 8);
assert.equal(Object.keys(HESS_CHALLENGE_BY_ID).length, 3);
assert.equal(Object.keys(CALORIMETRY_CHALLENGE_BY_ID).length, 3);

for (const value of [
  THERMOCHEMISTRY_SPECIES,
  THERMOCHEMISTRY_SPECIES_BY_ID,
  HESS_CHALLENGES,
  HESS_CHALLENGE_BY_ID,
  CALORIMETRY_CHALLENGES,
  CALORIMETRY_CHALLENGE_BY_ID,
  HESS_MULTIPLIERS,
  THERMOCHEMISTRY_MODEL_BOUNDARY,
]) assert.ok(Object.isFrozen(value));

for (const species of THERMOCHEMISTRY_SPECIES) {
  assert.ok(Object.isFrozen(species));
  assert.ok(species.label.length >= 3);
  assert.ok(species.formula.length >= 1);
  assert.ok(species.phase.length >= 1);
  assert.ok(species.display.includes(species.formula));
  assert.ok(Number.isFinite(species.formationEnthalpyKJmol));
  assert.ok(species.uncertaintyKJmol === null || (Number.isFinite(species.uncertaintyKJmol) && species.uncertaintyKJmol >= 0));
  assert.ok(['standard-state-convention', 'selected-reference'].includes(species.referenceKind));
  assert.ok(SCIENCE_SOURCES[species.sourceId]);
  assert.ok(species.sourceNote.length >= 30);
}

for (const challenge of HESS_CHALLENGES) {
  assert.ok(Object.isFrozen(challenge));
  assert.ok(Object.isFrozen(challenge.target));
  assert.ok(Object.isFrozen(challenge.target.stoichiometry));
  assert.ok(Object.isFrozen(challenge.cards));
  assert.ok(challenge.cards.every(Object.isFrozen));
  assert.ok(challenge.cards.every((card) => Object.isFrozen(card.stoichiometry)));
  assert.ok(Object.isFrozen(challenge.expectedMultipliers));
  assert.ok(Object.isFrozen(challenge.sourceIds));
  assert.equal(challenge.cards.length, challenge.expectedMultipliers.length);
  assert.ok(challenge.cards.length >= 2 && challenge.cards.length <= 3);
  assert.ok(challenge.expectedMultipliers.every((value) => HESS_MULTIPLIERS.includes(value)));
  assert.ok(challenge.code.startsWith('HEAT'));
  assert.ok(challenge.name.length >= 12);
  assert.ok(challenge.summary.length >= 40);
  assert.ok(challenge.mission.length >= 40);
  assert.ok(challenge.teacherQuestion.length >= 35);
  assert.ok(challenge.misconception.length >= 35);
  assert.equal(challenge.provenance.kind, 'selected-reference-teaching');
  assert.ok(challenge.sourceIds.length >= 6);
  for (const reaction of [challenge.target, ...challenge.cards]) {
    assert.ok(reaction.label.includes('→'));
    assert.ok(Object.keys(reaction.stoichiometry).length >= 2);
    assert.ok(Object.entries(reaction.stoichiometry).every(([speciesId, coefficient]) => (
      THERMOCHEMISTRY_SPECIES_BY_ID[speciesId] && Number.isFinite(coefficient) && coefficient !== 0
    )));
    assert.ok(Number.isFinite(reaction.deltaHkJPerReaction));
  }
}

for (const challenge of CALORIMETRY_CHALLENGES) {
  assert.ok(Object.isFrozen(challenge));
  assert.ok(Object.isFrozen(challenge.defaults));
  assert.ok(Object.isFrozen(challenge.sourceIds));
  assert.ok(challenge.code.startsWith('CAL'));
  assert.ok(challenge.name.length >= 12);
  assert.ok(challenge.summary.length >= 40);
  assert.ok(challenge.mission.length >= 40);
  assert.ok(challenge.teacherQuestion.length >= 35);
  assert.ok(challenge.misconception.length >= 35);
  assert.equal(challenge.provenance.kind, 'synthetic-teaching');
  assert.match(challenge.provenance.statement, /synthetic|not measured/i);
  assert.ok(challenge.sourceIds.length >= 5);
  for (const key of ['solutionMassG', 'specificHeatJgK', 'temperatureChangeK', 'calorimeterConstantJK', 'reactionExtentMol']) {
    assert.ok(Number.isFinite(challenge.defaults[key]));
  }
}

assert.equal(THERMOCHEMISTRY_SPECIES_BY_ID['carbon-monoxide-gas'].formationEnthalpyKJmol, -110.53);
assert.equal(THERMOCHEMISTRY_SPECIES_BY_ID['carbon-dioxide-gas'].formationEnthalpyKJmol, -393.51);
assert.equal(THERMOCHEMISTRY_SPECIES_BY_ID['methane-gas'].formationEnthalpyKJmol, -74.87);
assert.equal(THERMOCHEMISTRY_SPECIES_BY_ID['water-liquid'].formationEnthalpyKJmol, -285.830);
assert.equal(THERMOCHEMISTRY_SPECIES_BY_ID['water-gas'].formationEnthalpyKJmol, -241.826);

for (const sourceId of EXPECTED_SOURCE_IDS) {
  assert.ok(SCIENCE_SOURCES[sourceId], `Missing thermochemistry source ${sourceId}.`);
}
assert.ok(MODEL_PASSPORTS.thermochemicalCycleStudio);
assert.equal(MODEL_PASSPORTS.thermochemicalCycleStudio.sources.length, 10);
assert.match(MODEL_PASSPORTS.thermochemicalCycleStudio.resultKind, /not.+reaction|not.+validated/i);
assert.ok(MODEL_PASSPORTS.thermochemicalCycleStudio.excludes.some((item) => /mechanism|kinetics/i.test(item)));
assert.match(THERMOCHEMISTRY_MODEL_BOUNDARY.hess, /does not prove|occurs/i);
assert.match(THERMOCHEMISTRY_MODEL_BOUNDARY.calorimetry, /synthetic|not measured/i);
assert.match(THERMOCHEMISTRY_MODEL_BOUNDARY.safety, /no.+procedure/i);

console.log('Eight immutable thermochemical records, three Hess cycles, three synthetic calorimetry challenges, sources, and model boundary verified.');

const closeTo = (actual, expected, tolerance = 1e-9) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} should be within ${tolerance} of ${expected}.`);
};

const hessAudits = new Map();
for (const challenge of HESS_CHALLENGES) {
  const audit = auditHessCycle({ challengeId: challenge.id, multipliers: challenge.expectedMultipliers });
  hessAudits.set(challenge.id, audit);
  assert.ok(Object.isFrozen(audit));
  assert.ok(Object.isFrozen(audit.cards));
  assert.ok(audit.cards.every(Object.isFrozen));
  assert.ok(Object.isFrozen(audit.netStoichiometry));
  assert.ok(Object.isFrozen(audit.cancellationLanes));
  assert.ok(audit.cancellationLanes.every(Object.isFrozen));
  assert.equal(audit.targetMatched, true);
  assert.equal(audit.cardFormationClosure, true);
  assert.equal(audit.targetFormationClosure, true);
  closeTo(audit.pathEnthalpyKJ, challenge.target.deltaHkJPerReaction);
  closeTo(audit.targetFormationEnthalpyKJ, challenge.target.deltaHkJPerReaction);
  assert.ok(audit.cancellationLanes.every((lane) => lane.cancelledMagnitude >= 0));
}

const coAudit = hessAudits.get('carbon-monoxide-formation');
closeTo(coAudit.pathEnthalpyKJ, -221.06);
assert.equal(coAudit.enthalpySign, 'negative');
assert.deepEqual(coAudit.netStoichiometry, {
  'carbon-graphite': -2,
  'oxygen-gas': -1,
  'carbon-monoxide-gas': 2,
});
assert.equal(coAudit.cancellationLanes.find((lane) => lane.speciesId === 'carbon-dioxide-gas').cancelledMagnitude, 2);

const methaneAudit = hessAudits.get('methane-combustion-cycle');
closeTo(methaneAudit.pathEnthalpyKJ, -890.30);
assert.equal(methaneAudit.cards[0].multiplier, -1);
assert.match(methaneAudit.cards[0].orientedLabel, /CH₄\(g\).+C\(graphite, s\)/);

const waterAudit = hessAudits.get('water-phase-bridge');
closeTo(waterAudit.pathEnthalpyKJ, 44.004);
assert.equal(waterAudit.enthalpySign, 'positive');
assert.match(waterAudit.netEquation, /H₂O\(l\).+H₂O\(g\)/);

const parked = auditHessCycle({ challengeId: 'carbon-monoxide-formation', multipliers: [0, 0] });
assert.equal(parked.targetMatched, false);
assert.equal(parked.pathEnthalpyKJ, 0);
assert.equal(parked.enthalpySign, 'zero');
assert.deepEqual(parked.netStoichiometry, {});
assert.ok(parked.cancellationLanes.every((lane) => lane.netCoefficient === 0));

const partial = auditHessCycle({ challengeId: 'carbon-monoxide-formation', multipliers: [1, 0] });
assert.equal(partial.targetMatched, false);
closeTo(partial.pathEnthalpyKJ, -393.51);
assert.equal(partial.netStoichiometry['carbon-dioxide-gas'], 1);

const reversed = auditHessCycle({ challengeId: 'water-phase-bridge', multipliers: [-1, 0] });
closeTo(reversed.cards[0].scaledEnthalpyKJ, 241.826);
assert.match(reversed.cards[0].orientedLabel, /H₂O\(g\).+H₂\(g\)/);
const doubled = auditHessCycle({ challengeId: 'water-phase-bridge', multipliers: [2, 0] });
closeTo(doubled.cards[0].scaledEnthalpyKJ, -483.652);

const correctHessPrediction = Object.freeze({
  targetStatus: 'matched',
  enthalpySign: 'negative',
  scalingClaim: 'enthalpy-scales-with-equation',
  pathClaim: 'same-endpoints-same-deltaH',
});
const correctHessEvaluation = evaluateHessAttempt({ audit: coAudit, prediction: correctHessPrediction });
assert.equal(correctHessEvaluation.score.correct, 4);
assert.deepEqual(correctHessEvaluation.learnerPrediction, correctHessPrediction);
assert.ok(Object.isFrozen(correctHessEvaluation));

const wrongHessPrediction = Object.freeze({
  targetStatus: 'not-matched',
  enthalpySign: 'positive',
  scalingClaim: 'enthalpy-unchanged-by-scaling',
  pathClaim: 'path-changes-deltaH',
});
const wrongHessBefore = JSON.stringify(wrongHessPrediction);
const wrongHessEvaluation = evaluateHessAttempt({ audit: coAudit, prediction: wrongHessPrediction });
assert.equal(wrongHessEvaluation.score.correct, 0);
assert.equal(JSON.stringify(wrongHessPrediction), wrongHessBefore);
assert.deepEqual(wrongHessEvaluation.learnerPrediction, wrongHessPrediction);

for (let level = 1; level <= 4; level += 1) {
  const beforeAudit = JSON.stringify(partial);
  const hint = nextHessHint({ audit: partial, prediction: wrongHessPrediction, level });
  assert.ok(hint.length >= 45);
  assert.equal(JSON.stringify(partial), beforeAudit);
  assert.equal(JSON.stringify(wrongHessPrediction), wrongHessBefore);
}

const calorimetryBalances = new Map();
for (const challenge of CALORIMETRY_CHALLENGES) {
  const balance = balanceCalorimetry({ challengeId: challenge.id, inputs: challenge.defaults });
  calorimetryBalances.set(challenge.id, balance);
  assert.ok(Object.isFrozen(balance));
  assert.ok(Object.isFrozen(balance.inputs));
  assert.ok(Object.isFrozen(balance.equationLedger));
  closeTo(balance.qSystemJ + balance.qSurroundingsJ, 0, 1e-10);
  closeTo(balance.qSurroundingsJ, balance.qSolutionJ + balance.qCalorimeterJ, 1e-10);
}

const rise = calorimetryBalances.get('thermal-rise');
closeTo(rise.qSolutionJ, 2719.6);
closeTo(rise.qCalorimeterJ, 162.5);
closeTo(rise.qSurroundingsJ, 2882.1);
closeTo(rise.molarReactionEnthalpyKJmol, -57.642);
assert.equal(rise.temperatureDirection, 'rise');
assert.equal(rise.surroundingsSign, 'positive');
assert.equal(rise.reactionKind, 'exothermic');

const fall = calorimetryBalances.get('thermal-fall');
closeTo(fall.qSolutionJ, -1740.544);
closeTo(fall.qCalorimeterJ, -93.6);
closeTo(fall.qSurroundingsJ, -1834.144);
closeTo(fall.molarReactionEnthalpyKJmol, 30.56906666666667);
assert.equal(fall.temperatureDirection, 'fall');
assert.equal(fall.surroundingsSign, 'negative');
assert.equal(fall.reactionKind, 'endothermic');

const vessel = calorimetryBalances.get('vessel-matters');
closeTo(vessel.qSolutionJ, 1673.6);
closeTo(vessel.qCalorimeterJ, 960);
closeTo(vessel.molarReactionEnthalpyKJmol, -65.84);
closeTo(vessel.noVesselMolarReactionEnthalpyKJmol, -41.84);
closeTo(vessel.vesselOmissionPercent, 100 * 24 / 65.84);
assert.equal(vessel.vesselClaim, 'including-vessel-increases-magnitude');

const zeroDelta = balanceCalorimetry({
  challengeId: 'thermal-rise',
  inputs: { ...CALORIMETRY_CHALLENGE_BY_ID['thermal-rise'].defaults, temperatureChangeK: 0 },
});
assert.equal(zeroDelta.qSolutionJ, 0);
assert.equal(zeroDelta.qCalorimeterJ, 0);
assert.equal(zeroDelta.qSystemJ, 0);
assert.equal(zeroDelta.molarReactionEnthalpyKJmol, 0);
assert.equal(zeroDelta.temperatureDirection, 'no-change');
assert.equal(zeroDelta.surroundingsSign, 'zero');
assert.equal(zeroDelta.reactionKind, 'zero');
assert.equal(zeroDelta.vesselClaim, 'no-effect');

const zeroVessel = balanceCalorimetry({
  challengeId: 'vessel-matters',
  inputs: { ...CALORIMETRY_CHALLENGE_BY_ID['vessel-matters'].defaults, calorimeterConstantJK: 0 },
});
assert.equal(zeroVessel.qCalorimeterJ, 0);
closeTo(zeroVessel.molarReactionEnthalpyKJmol, zeroVessel.noVesselMolarReactionEnthalpyKJmol);
assert.equal(zeroVessel.vesselClaim, 'no-effect');

const correctCalPrediction = Object.freeze({
  temperatureDirection: 'rise',
  surroundingsSign: 'positive',
  reactionKind: 'exothermic',
  vesselClaim: 'including-vessel-increases-magnitude',
});
const correctCalEvaluation = evaluateCalorimetryAttempt({ balance: rise, prediction: correctCalPrediction });
assert.equal(correctCalEvaluation.score.correct, 4);
assert.deepEqual(correctCalEvaluation.learnerPrediction, correctCalPrediction);
assert.ok(Object.isFrozen(correctCalEvaluation));

const wrongCalPrediction = Object.freeze({
  temperatureDirection: 'fall',
  surroundingsSign: 'negative',
  reactionKind: 'endothermic',
  vesselClaim: 'no-effect',
});
const wrongCalBefore = JSON.stringify(wrongCalPrediction);
const wrongCalEvaluation = evaluateCalorimetryAttempt({ balance: rise, prediction: wrongCalPrediction });
assert.equal(wrongCalEvaluation.score.correct, 0);
assert.equal(JSON.stringify(wrongCalPrediction), wrongCalBefore);

for (let level = 1; level <= 4; level += 1) {
  const beforeBalance = JSON.stringify(vessel);
  const hint = nextCalorimetryHint({ balance: vessel, prediction: wrongCalPrediction, level });
  assert.ok(hint.length >= 45);
  assert.equal(JSON.stringify(vessel), beforeBalance);
  assert.equal(JSON.stringify(wrongCalPrediction), wrongCalBefore);
}

assert.throws(() => auditHessCycle({ challengeId: 'ghost', multipliers: [0] }), /Unknown Hess challenge/);
assert.throws(() => auditHessCycle({ challengeId: 'water-phase-bridge', multipliers: [1] }), /one multiplier per reaction card/);
assert.throws(() => auditHessCycle({ challengeId: 'water-phase-bridge', multipliers: [0.25, 1] }), /allowed Hess multiplier/);
assert.throws(() => evaluateHessAttempt({ audit: coAudit, prediction: { targetStatus: 'matched' } }), /complete four-part Hess prediction/);
assert.throws(() => nextHessHint({ audit: coAudit, prediction: wrongHessPrediction, level: 5 }), /between 1 and 4/);
assert.throws(() => balanceCalorimetry({ challengeId: 'ghost', inputs: rise.inputs }), /Unknown calorimetry challenge/);
assert.throws(() => balanceCalorimetry({ challengeId: 'thermal-rise', inputs: { ...rise.inputs, solutionMassG: 0 } }), /solution mass/);
assert.throws(() => balanceCalorimetry({ challengeId: 'thermal-rise', inputs: { ...rise.inputs, specificHeatJgK: 11 } }), /specific heat/);
assert.throws(() => balanceCalorimetry({ challengeId: 'thermal-rise', inputs: { ...rise.inputs, temperatureChangeK: 51 } }), /temperature change/);
assert.throws(() => balanceCalorimetry({ challengeId: 'thermal-rise', inputs: { ...rise.inputs, calorimeterConstantJK: -1 } }), /calorimeter constant/);
assert.throws(() => balanceCalorimetry({ challengeId: 'thermal-rise', inputs: { ...rise.inputs, reactionExtentMol: 0 } }), /reaction extent/);
assert.throws(() => evaluateCalorimetryAttempt({ balance: rise, prediction: { reactionKind: 'exothermic' } }), /complete four-part calorimetry prediction/);
assert.throws(() => nextCalorimetryHint({ balance: rise, prediction: wrongCalPrediction, level: 0 }), /between 1 and 4/);

console.log('Reaction-vector scaling, cancellation, three Hess sums, ideal calorimetry closure, learner preservation, and eight hint paths verified.');
