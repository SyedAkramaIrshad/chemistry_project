import assert from 'node:assert/strict';
import {
  INFRARED_BAND_LABELS,
  INFRARED_CASES,
  INFRARED_CASE_BY_ID,
  INFRARED_DERIVATION_NOTICE,
  INFRARED_MODEL_BOUNDARY,
  INFRARED_RECORDS,
  INFRARED_RECORD_BY_ID,
} from '../src/data/infraredScenarios.js';
import {
  analyzeInfraredCase,
  analyzeInfraredRecord,
  createProbeState,
  evaluateInfraredCaseAttempt,
  evaluateProbeAssignments,
  nextInfraredCaseHint,
  nextInfraredProbeHint,
  placeInfraredProbe,
  removeInfraredProbe,
} from '../src/chemistry/infraredEvidence.js';

const recursivelyFrozen = (value, seen = new Set()) => {
  if (!value || typeof value !== 'object' || seen.has(value)) return true;
  seen.add(value);
  return Object.isFrozen(value) && Object.values(value).every((nested) => recursivelyFrozen(nested, seen));
};

assert.equal(INFRARED_RECORDS.length, 6);
assert.equal(INFRARED_CASES.length, 3);
assert.equal(INFRARED_BAND_LABELS.length, 6);
assert.equal(INFRARED_DERIVATION_NOTICE.sourceIds.length, 8);
assert.equal(Object.keys(INFRARED_MODEL_BOUNDARY).length, 6);
assert.ok(recursivelyFrozen(INFRARED_RECORDS));
assert.ok(recursivelyFrozen(INFRARED_CASES));

for (const record of INFRARED_RECORDS) {
  assert.strictEqual(INFRARED_RECORD_BY_ID[record.id], record);
  assert.ok(record.trace.length >= 160 && record.trace.length <= 176);
  assert.ok(record.trace.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y) && y >= 0 && y <= 1));
  assert.ok(record.trace.every((point, index, trace) => index === 0 || point[0] - trace[index - 1][0] === 20));
  assert.equal(Math.max(...record.trace.map((point) => point[1])), 1);
  assert.match(record.transformation, /20 cm⁻¹ bin/);
}

assert.equal(INFRARED_RECORD_BY_ID['ethanol-gas-ir'].expectedFeatures.find((item) => item.labelId === 'oh-stretch').centreCmInv, 3674);
assert.equal(INFRARED_RECORD_BY_ID['propanal-gas-ir'].originalYRepresentation, 'transmittance converted to absorbance');
assert.equal(INFRARED_RECORD_BY_ID['ethyl-acetate-gas-ir'].expectedFeatures.filter((item) => item.labelId === 'c-o').length, 2);
for (const scenario of INFRARED_CASES) {
  assert.strictEqual(INFRARED_CASE_BY_ID[scenario.id], scenario);
  assert.equal(scenario.candidateIds.length, 2);
  assert.ok(scenario.candidateIds.every((id) => INFRARED_RECORD_BY_ID[id].formula === scenario.formula));
  assert.ok(scenario.candidateIds.includes(scenario.unknownRecordId));
}

const ethanolAnalysis = analyzeInfraredRecord({ recordId: 'ethanol-gas-ir', cursorCmInv: 3674 });
assert.equal(ethanolAnalysis.record.id, 'ethanol-gas-ir');
assert.equal(ethanolAnalysis.cursor.wavenumberCmInv, 3674);
assert.equal(ethanolAnalysis.cursor.nearestTraceWavenumberCmInv, 3680);
assert.ok(ethanolAnalysis.cursor.normalizedAbsorbance > 0.15);
assert.equal(ethanolAnalysis.cursor.regionId, 'x-h-stretch');
assert.ok(recursivelyFrozen(ethanolAnalysis));

const initial = createProbeState({ recordId: 'ethanol-gas-ir' });
const initialCopy = structuredClone(initial);
const first = placeInfraredProbe(initial, { wavenumberCmInv: 3674, labelId: 'oh-stretch' });
assert.equal(first.accepted, true);
assert.deepEqual(initial, initialCopy);
assert.equal(first.state.probes.length, 1);
assert.equal(first.state.probes[0].wavenumberCmInv, 3674);
assert.equal(first.state.probes[0].labelId, 'oh-stretch');

const duplicate = placeInfraredProbe(first.state, { wavenumberCmInv: 3680, labelId: 'sp3-c-h' });
assert.equal(duplicate.accepted, false);
assert.strictEqual(duplicate.state, first.state);
assert.match(duplicate.reason, /12 cm⁻¹/);

let probeState = first.state;
probeState = placeInfraredProbe(probeState, { wavenumberCmInv: 1738, labelId: 'carbonyl' }).state;
probeState = placeInfraredProbe(probeState, { wavenumberCmInv: 1066, labelId: 'unassigned' }).state;
const probeSnapshot = structuredClone(probeState);
const probeEvaluation = evaluateProbeAssignments({ recordId: 'ethanol-gas-ir', probes: probeState.probes });
assert.deepEqual(probeState, probeSnapshot);
assert.equal(probeEvaluation.dimensions.length, 3);
assert.equal(probeEvaluation.dimensions[0].correct, true);
assert.equal(probeEvaluation.dimensions[1].correct, false);
assert.equal(probeEvaluation.dimensions[2].scored, false);
assert.deepEqual(probeEvaluation.score, { correct: 1, total: 2 });
assert.deepEqual(probeEvaluation.missingFeatures.map((item) => item.id).sort(), ['ethanol-ch', 'ethanol-co']);
assert.ok(recursivelyFrozen(probeEvaluation));

const unknownRemoval = removeInfraredProbe(probeState, 'probe-99');
assert.equal(unknownRemoval.accepted, false);
assert.strictEqual(unknownRemoval.state, probeState);
const removed = removeInfraredProbe(probeState, 'probe-2');
assert.equal(removed.accepted, true);
assert.equal(removed.state.probes.length, 2);
assert.ok(removed.state.probes.every((probe) => probe.id !== 'probe-2'));

for (let level = 1; level <= 4; level += 1) {
  const before = structuredClone(probeState);
  const hint = nextInfraredProbeHint({ recordId: 'ethanol-gas-ir', probes: probeState.probes, level });
  assert.equal(hint.level, level);
  assert.deepEqual(probeState, before);
  assert.ok(recursivelyFrozen(hint));
}

const caseExpectations = [
  ['oxygen-linkage', 'ethanol-gas-ir', 'oh-stretch'],
  ['carbonyl-terminus', 'propanal-gas-ir', 'aldehydic-c-h'],
  ['acid-or-ester', 'butanoic-acid-gas-ir', 'oh-stretch'],
];
for (const [caseId, candidateId, decisiveLabelId] of caseExpectations) {
  const analysis = analyzeInfraredCase({ caseId });
  assert.equal(analysis.unknownRecord.id, candidateId);
  assert.equal(analysis.case.decisiveLabelId, decisiveLabelId);
  assert.ok(recursivelyFrozen(analysis));
  const correct = evaluateInfraredCaseAttempt({
    analysis,
    prediction: { candidateId, formulaSufficient: false, decisiveLabelId, identificationScope: 'supports-declared-candidate-only' },
  });
  assert.equal(correct.allCorrect, true);
  assert.deepEqual(correct.score, { correct: 4, total: 4 });
  const wrongCandidate = analysis.candidates.find((item) => item.id !== candidateId).id;
  const wrongPrediction = { candidateId: wrongCandidate, formulaSufficient: true, decisiveLabelId: decisiveLabelId === 'carbonyl' ? 'oh-stretch' : 'carbonyl', identificationScope: 'certifies-identity' };
  const wrongCopy = structuredClone(wrongPrediction);
  const wrong = evaluateInfraredCaseAttempt({ analysis, prediction: wrongPrediction });
  assert.deepEqual(wrongPrediction, wrongCopy);
  assert.equal(wrong.allCorrect, false);
  assert.deepEqual(wrong.score, { correct: 0, total: 4 });
  assert.equal(Object.keys(wrong.dimensions).length, 4);
  for (let level = 1; level <= 4; level += 1) {
    const hint = nextInfraredCaseHint({ analysis, level });
    assert.equal(hint.level, level);
    assert.ok(recursivelyFrozen(hint));
  }
}

assert.throws(() => analyzeInfraredRecord({ recordId: 'unknown', cursorCmInv: 1000 }), /recordId/);
assert.throws(() => analyzeInfraredRecord({ recordId: 'ethanol-gas-ir', cursorCmInv: 4100 }), /source range/);
assert.throws(() => createProbeState({ recordId: 'unknown' }), /recordId/);
assert.throws(() => placeInfraredProbe(initial, { wavenumberCmInv: 3674, labelId: 'unknown' }), /labelId/);
assert.throws(() => evaluateProbeAssignments({ recordId: 'ethanol-gas-ir', probes: [] }), /at least one probe/);
assert.throws(() => analyzeInfraredCase({ caseId: 'unknown' }), /caseId/);
assert.throws(() => nextInfraredProbeHint({ recordId: 'ethanol-gas-ir', probes: [], level: 0 }), /level/);
assert.throws(() => nextInfraredCaseHint({ analysis: analyzeInfraredCase({ caseId: 'oxygen-linkage' }), level: 5 }), /level/);

console.log('Six transformed NIST gas-phase IR records, three same-formula cases, trace/provenance invariants, and model boundaries verified.');
console.log('Immutable cursor analysis, exact probe placement/removal, duplicate blocking, retained wrong assignments, neutral observations, missing features, and four probe hints verified.');
console.log('Three four-claim isomer casefiles, preserved wrong answers, four case hints, invalid inputs, and recursive immutability verified.');
