import assert from 'node:assert/strict';
import {
  BINDING_NUCLEI,
  BINDING_NUCLEUS_BY_ID,
  DECAY_CHALLENGES,
  DECAY_CHALLENGE_BY_ID,
  DECAY_PARTICLES,
  DECAY_PARTICLE_BY_ID,
  HALF_LIFE_CHALLENGES,
  HALF_LIFE_CHALLENGE_BY_ID,
  NUCLEAR_CONSTANTS,
  NUCLEAR_MODEL_BOUNDARY,
  NUCLEAR_NUCLIDES,
  NUCLIDE_BY_ID,
} from '../src/data/nuclearScenarios.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../src/data/scienceSources.js';
import {
  analyzeBindingRidge,
  analyzeDecayAssembly,
  analyzeHalfLife,
  evaluateBindingAttempt,
  evaluateDecayAttempt,
  evaluateHalfLifeAttempt,
  nextBindingHint,
  nextDecayHint,
  nextHalfLifeHint,
} from '../src/chemistry/nuclearChemistry.js';

const closeTo = (actual, expected, tolerance = 1e-12) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} should be within ${tolerance} of ${expected}.`);
};
const recursivelyFrozen = (value, seen = new Set()) => {
  if (!value || typeof value !== 'object' || seen.has(value)) return true;
  seen.add(value);
  if (!Object.isFrozen(value)) return false;
  return Object.values(value).every((nested) => recursivelyFrozen(nested, seen));
};

const EXPECTED_DECAY_IDS = ['uranium-alpha', 'carbon-beta-minus', 'sodium-positron-branch', 'beryllium-electron-capture', 'technetium-gamma'];
const EXPECTED_CLOCK_IDS = ['carbon-14-clock', 'fluorine-18-clock', 'phosphorus-32-clock', 'technetium-99m-clock'];
const EXPECTED_BINDING_IDS = ['hydrogen-2', 'helium-4', 'carbon-12', 'oxygen-16', 'iron-56', 'uranium-238'];
const EXPECTED_SOURCE_IDS = ['acsUndergraduateCurriculum','openStaxChemistryScope','iaeaLiveChart','iaeaLiveChartApi','nndcNuDat','nndcBetaDecay','nistIsotopicCompositions','nistCodata2022','nndcCarbon14Decay','nndcTechnetium99mDecay'];

assert.equal(DECAY_PARTICLES.length, 7);
assert.equal(NUCLEAR_NUCLIDES.length, 20);
assert.deepEqual(DECAY_CHALLENGES.map((item) => item.id), EXPECTED_DECAY_IDS);
assert.deepEqual(HALF_LIFE_CHALLENGES.map((item) => item.id), EXPECTED_CLOCK_IDS);
assert.deepEqual(BINDING_NUCLEI.map((item) => item.id), EXPECTED_BINDING_IDS);
assert.equal(Object.keys(DECAY_PARTICLE_BY_ID).length, 7);
assert.equal(Object.keys(NUCLIDE_BY_ID).length, 20);
assert.equal(Object.keys(DECAY_CHALLENGE_BY_ID).length, 5);
assert.equal(Object.keys(HALF_LIFE_CHALLENGE_BY_ID).length, 4);
assert.equal(Object.keys(BINDING_NUCLEUS_BY_ID).length, 6);
for (const value of [DECAY_PARTICLES, DECAY_PARTICLE_BY_ID, NUCLEAR_NUCLIDES, NUCLIDE_BY_ID, DECAY_CHALLENGES, DECAY_CHALLENGE_BY_ID, HALF_LIFE_CHALLENGES, HALF_LIFE_CHALLENGE_BY_ID, BINDING_NUCLEI, BINDING_NUCLEUS_BY_ID, NUCLEAR_CONSTANTS, NUCLEAR_MODEL_BOUNDARY]) assert.ok(recursivelyFrozen(value));

for (const challenge of DECAY_CHALLENGES) {
  assert.ok(challenge.name.length >= 20);
  assert.ok(challenge.summary.length >= 50);
  assert.ok(challenge.mission.length >= 55);
  assert.ok(challenge.teacherQuestion.length >= 55);
  assert.ok(challenge.misconception.length >= 65);
  assert.equal(challenge.daughterOptions.length, 4);
  assert.ok(challenge.daughterOptions.some((item) => item.id === challenge.expectedDaughterId));
  assert.ok(challenge.expectedPlacements.length >= 1);
  assert.ok(challenge.expectedPlacements.every((item) => DECAY_PARTICLE_BY_ID[item.particleId] && ['reactant', 'product'].includes(item.side)));
  assert.ok(challenge.sourceIds.length >= 3);
}
for (const challenge of HALF_LIFE_CHALLENGES) {
  assert.ok(challenge.halfLifeSeconds > 0);
  assert.ok(challenge.halfLifeDisplay.length >= 4);
  assert.ok(challenge.daughterWindow.length >= 20);
  assert.equal(challenge.provenance.kind, 'evaluated-half-life-ideal-expected-value');
}
for (const sourceId of EXPECTED_SOURCE_IDS) assert.ok(SCIENCE_SOURCES[sourceId], `Missing nuclear source ${sourceId}.`);
const passport = MODEL_PASSPORTS.nuclearChemistryObservatory;
assert.ok(passport);
assert.deepEqual(passport.sources, EXPECTED_SOURCE_IDS);
assert.match(passport.resultKind, /bounded deterministic nuclear teaching model/i);
assert.ok(passport.excludes.some((item) => /dose|shielding/i.test(item)));
assert.ok(passport.excludes.some((item) => /Bateman|decay chains/i.test(item)));
assert.match(NUCLEAR_MODEL_BOUNDARY.probability, /expected values|stochastic/i);
assert.match(NUCLEAR_MODEL_BOUNDARY.safety, /No dose|shielding/i);

console.log('Seven particles, twenty nuclides, five decay challenges, four clocks, six binding records, ten sources, and the nuclear model boundary verified.');

const expectedAssemblies = {
  'uranium-alpha': { daughterId: 'thorium-234', placements: [{ particleId: 'alpha', side: 'product' }] },
  'carbon-beta-minus': { daughterId: 'nitrogen-14', placements: [{ particleId: 'beta-minus', side: 'product' }, { particleId: 'antineutrino', side: 'product' }] },
  'sodium-positron-branch': { daughterId: 'neon-22', placements: [{ particleId: 'positron', side: 'product' }, { particleId: 'neutrino', side: 'product' }] },
  'beryllium-electron-capture': { daughterId: 'lithium-7', placements: [{ particleId: 'electron', side: 'reactant' }, { particleId: 'neutrino', side: 'product' }] },
  'technetium-gamma': { daughterId: 'technetium-99', placements: [{ particleId: 'gamma', side: 'product' }] },
};
for (const challengeId of EXPECTED_DECAY_IDS) {
  const analysis = analyzeDecayAssembly({ challengeId, ...expectedAssemblies[challengeId] });
  assert.ok(recursivelyFrozen(analysis));
  assert.equal(analysis.assemblyCorrect, true);
  assert.ok(Object.values(analysis.checks).every(Boolean));
  assert.deepEqual(analysis.differences, { massNumber: 0, chargeNumber: 0, leptonNumber: 0 });
  assert.equal(analysis.daughter.id, DECAY_CHALLENGE_BY_ID[challengeId].expectedDaughterId);
  assert.match(analysis.learnerEquation, /→/);
}
const alpha = analyzeDecayAssembly({ challengeId: 'uranium-alpha', ...expectedAssemblies['uranium-alpha'] });
const carbon = analyzeDecayAssembly({ challengeId: 'carbon-beta-minus', ...expectedAssemblies['carbon-beta-minus'] });
const gamma = analyzeDecayAssembly({ challengeId: 'technetium-gamma', ...expectedAssemblies['technetium-gamma'] });
closeTo(alpha.energy.qValueMeV, 4.2698581, 1e-10);
closeTo(carbon.energy.qValueMeV, 0.1564765, 1e-10);
closeTo(gamma.energy.qValueMeV, 0.140511, 1e-12);
assert.match(gamma.challenge.misconception, /142\.6836/);

const incompleteBeta = analyzeDecayAssembly({
  challengeId: 'carbon-beta-minus',
  daughterId: 'nitrogen-14',
  placements: [{ particleId: 'beta-minus', side: 'product' }],
});
assert.equal(incompleteBeta.checks.massNumber, true);
assert.equal(incompleteBeta.checks.chargeNumber, true);
assert.equal(incompleteBeta.checks.leptonNumber, false);
assert.equal(incompleteBeta.checks.particleSet, false);
assert.equal(incompleteBeta.placements.length, 1);
const wrongDaughter = analyzeDecayAssembly({ challengeId: 'uranium-alpha', daughterId: 'uranium-234', placements: [{ particleId: 'alpha', side: 'product' }] });
assert.equal(wrongDaughter.checks.daughter, false);
assert.equal(wrongDaughter.assemblyCorrect, false);

const wrongDecayPrediction = { modeId: 'alpha', vectorId: 'A-4,Z-2', rateClaim: 'half-life-from-balanced-equation', evidenceClaim: 'equation-is-complete-spectrum' };
const wrongDecayCopy = structuredClone(wrongDecayPrediction);
const decayEvaluation = evaluateDecayAttempt({ analysis: carbon, prediction: wrongDecayPrediction });
assert.deepEqual(wrongDecayPrediction, wrongDecayCopy);
assert.equal(decayEvaluation.score.correct, 0);
assert.ok(recursivelyFrozen(decayEvaluation));
for (let level = 1; level <= 4; level += 1) {
  const before = structuredClone(incompleteBeta);
  const hint = nextDecayHint({ analysis: incompleteBeta, level });
  assert.ok(hint.length >= 55);
  assert.deepEqual(incompleteBeta, before);
}

console.log('Five exact decay assemblies, A/Z/lepton closure, wrong-state retention, evaluated branch energies, four claims, and four non-mutating hints verified.');

for (const challenge of HALF_LIFE_CHALLENGES) {
  const analysis = analyzeHalfLife({ challengeId: challenge.id, initialNuclei: 1e12, elapsedHalfLives: 1 });
  assert.ok(recursivelyFrozen(analysis));
  closeTo(analysis.parentFraction, 0.5);
  closeTo(analysis.parentNuclei, 5e11, 1e-3);
  closeTo(analysis.daughterNuclei, 5e11, 1e-3);
  closeTo(analysis.parentNuclei + analysis.daughterNuclei, 1e12, 1e-3);
  closeTo(analysis.activityBq / analysis.initialActivityBq, 0.5);
  assert.equal(analysis.curve.length, 81);
  assert.ok(analysis.curve.every((point, index, values) => index === 0 || point.parentFraction < values[index - 1].parentFraction));
  assert.equal(analysis.expectedClaims.parentBand, 'one-half');
}
const carbonClock = analyzeHalfLife({ challengeId: 'carbon-14-clock', initialNuclei: 1e9, elapsedHalfLives: 2 });
closeTo(carbonClock.parentFraction, 0.25);
assert.equal(carbonClock.expectedClaims.parentBand, 'one-quarter');
closeTo(carbonClock.activityBq, Math.log(2) / 179874478055.1744 * 2.5e8, 1e-15);
const initialClock = analyzeHalfLife({ challengeId: 'fluorine-18-clock', initialNuclei: 1e9, elapsedHalfLives: 0 });
assert.equal(initialClock.expectedClaims.parentBand, 'all-parent');
assert.equal(initialClock.expectedClaims.activityTrend, 'same-as-initial');

const wrongClockPrediction = { parentBand: 'all-parent', activityTrend: 'above-initial', halfLifeResponse: 'shorter-with-more-starting-nuclei', daughterRelation: 'cannot-relate' };
const wrongClockCopy = structuredClone(wrongClockPrediction);
const clockEvaluation = evaluateHalfLifeAttempt({ analysis: carbonClock, prediction: wrongClockPrediction });
assert.deepEqual(wrongClockPrediction, wrongClockCopy);
assert.equal(clockEvaluation.score.correct, 0);
assert.equal(clockEvaluation.dimensions.daughterRelation.reason, 'This one-step, one-to-one expected-value ledger makes expected daughter count equal parent nuclei lost on this window. Nitrogen-14 is stable.');
for (let level = 1; level <= 4; level += 1) {
  const before = structuredClone(carbonClock);
  const hint = nextHalfLifeHint({ analysis: carbonClock, level });
  assert.ok(hint.length >= 50);
  assert.deepEqual(carbonClock, before);
}

console.log('Four evaluated half-life records, ideal expected parent/daughter/activity closure, exact half-life boundaries, four claims, and four non-mutating hints verified.');

const ridge = analyzeBindingRidge({ leftId: 'iron-56', rightId: 'uranium-238' });
assert.ok(recursivelyFrozen(ridge));
assert.equal(ridge.ridge.length, 6);
assert.equal(ridge.ridgePeak.id, 'iron-56');
const expectedPerNucleon = {
  'hydrogen-2': 1.112283216017564,
  'helium-4': 7.073915833246477,
  'carbon-12': 7.680144801391339,
  'oxygen-16': 7.976207419248842,
  'iron-56': 8.790343348575133,
  'uranium-238': 7.570120723323866,
};
for (const point of ridge.ridge) {
  closeTo(point.bindingEnergyPerNucleonMeV, expectedPerNucleon[point.id], 2e-12);
  assert.ok(point.massDefectU > 0);
  assert.ok(point.bindingEnergyMeV > 0);
}
assert.deepEqual(ridge.expectedClaims, {
  largerPerNucleonId: 'iron-56',
  largerTotalBindingId: 'uranium-238',
  massDefectSign: 'both-positive',
  inferenceClaim: 'curve-only-not-pathway',
});
const wrongBindingPrediction = { largerPerNucleonId: 'uranium-238', largerTotalBindingId: 'iron-56', massDefectSign: 'both-negative', inferenceClaim: 'curve-proves-feasible-reaction' };
const wrongBindingCopy = structuredClone(wrongBindingPrediction);
const bindingEvaluation = evaluateBindingAttempt({ analysis: ridge, prediction: wrongBindingPrediction });
assert.deepEqual(wrongBindingPrediction, wrongBindingCopy);
assert.equal(bindingEvaluation.score.correct, 0);
for (let level = 1; level <= 4; level += 1) {
  const before = structuredClone(ridge);
  const hint = nextBindingHint({ analysis: ridge, level });
  assert.ok(hint.length >= 50);
  assert.deepEqual(ridge, before);
}

for (const invoke of [
  () => analyzeDecayAssembly({ challengeId: 'missing', daughterId: 'x', placements: [] }),
  () => analyzeDecayAssembly({ challengeId: 'carbon-beta-minus', daughterId: 'nitrogen-14', placements: [{ particleId: 'missing', side: 'product' }] }),
  () => analyzeDecayAssembly({ challengeId: 'carbon-beta-minus', daughterId: 'nitrogen-14', placements: [{ particleId: 'beta-minus', side: 'product' }, { particleId: 'beta-minus', side: 'product' }] }),
  () => analyzeDecayAssembly({ challengeId: 'carbon-beta-minus', daughterId: 'nitrogen-14', placements: [{ particleId: 'beta-minus', side: 'middle' }] }),
  () => analyzeHalfLife({ challengeId: 'missing', initialNuclei: 1, elapsedHalfLives: 1 }),
  () => analyzeHalfLife({ challengeId: 'carbon-14-clock', initialNuclei: 0, elapsedHalfLives: 1 }),
  () => analyzeHalfLife({ challengeId: 'carbon-14-clock', initialNuclei: 1, elapsedHalfLives: -1 }),
  () => analyzeBindingRidge({ leftId: 'iron-56', rightId: 'iron-56' }),
  () => analyzeBindingRidge({ leftId: 'missing', rightId: 'iron-56' }),
  () => evaluateDecayAttempt({ analysis: carbon, prediction: {} }),
  () => evaluateHalfLifeAttempt({ analysis: carbonClock, prediction: {} }),
  () => evaluateBindingAttempt({ analysis: ridge, prediction: {} }),
  () => nextDecayHint({ analysis: carbon, level: 5 }),
  () => nextHalfLifeHint({ analysis: carbonClock, level: 0 }),
  () => nextBindingHint({ analysis: ridge, level: 7 }),
]) assert.throws(invoke);

console.log('Six-point binding ridge, mass-defect arithmetic, total-versus-per-nucleon contrast, preserved claims, four hints, invalid inputs, and recursive immutability verified.');
