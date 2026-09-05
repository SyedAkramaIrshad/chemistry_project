import assert from 'node:assert/strict';
import {
  ISOTOPE_COMPOSITIONS,
  MASS_EVIDENCE_PRESETS,
  MASS_EVIDENCE_PRESET_BY_ID,
  MASS_FINGERPRINT_OPTIONS,
  NMR_SIGNAL_REGIONS,
  ORTHOGONAL_DATA_NOTICE,
  ORTHOGONAL_EVIDENCE_BOUNDARY,
  ORTHOGONAL_EVIDENCE_CASES,
  ORTHOGONAL_EVIDENCE_CASE_BY_ID,
  ORTHOGONAL_NMR_FEATURE_BY_ID,
  PROTON_NMR_RECORDS,
  PROTON_NMR_RECORD_BY_ID,
} from '../src/data/orthogonalEvidenceScenarios.js';
import {
  analyzeOrthogonalCase,
  analyzeProtonRecord,
  calculateIsotopologueEnvelope,
  createNmrProbeState,
  evaluateMassEvidenceAttempt,
  evaluateNmrProbes,
  evaluateOrthogonalCaseAttempt,
  formatComposition,
  nextMassEvidenceHint,
  nextNmrProbeHint,
  nextOrthogonalCaseHint,
  placeNmrProbe,
  removeNmrProbe,
  validateComposition,
} from '../src/chemistry/orthogonalEvidence.js';

const recursivelyFrozen = (value, seen = new Set()) => {
  if (!value || typeof value !== 'object' || seen.has(value)) return true;
  seen.add(value);
  return Object.isFrozen(value) && Object.values(value).every((nested) => recursivelyFrozen(nested, seen));
};

assert.equal(PROTON_NMR_RECORDS.length, 6);
assert.equal(MASS_EVIDENCE_PRESETS.length, 5);
assert.equal(MASS_FINGERPRINT_OPTIONS.length, 4);
assert.equal(ORTHOGONAL_EVIDENCE_CASES.length, 3);
assert.equal(NMR_SIGNAL_REGIONS.length, 4);
assert.equal(Object.keys(ISOTOPE_COMPOSITIONS).length, 5);
assert.equal(Object.keys(ORTHOGONAL_EVIDENCE_BOUNDARY).length, 6);
assert.equal(ORTHOGONAL_DATA_NOTICE.nmrSourceIds.length, 6);
assert.ok(recursivelyFrozen(PROTON_NMR_RECORDS));
assert.ok(recursivelyFrozen(ISOTOPE_COMPOSITIONS));
assert.ok(recursivelyFrozen(ORTHOGONAL_EVIDENCE_CASES));

for (const record of PROTON_NMR_RECORDS) {
  assert.strictEqual(PROTON_NMR_RECORD_BY_ID[record.id], record);
  assert.ok(record.spectrumId > 0 && record.moleculeId > 0);
  assert.ok(record.peaks.length >= 1 && record.peaks.length <= 4);
  assert.ok(record.peaks.every((peak) => peak.ppm >= 0 && peak.ppm <= 12.5));
  assert.equal(record.peaks.reduce((sum, peak) => sum + peak.protonCount, 0), record.observedProtonCount);
  assert.equal(record.formulaProtonCount - record.observedProtonCount, record.unreportedExchangeableProtons);
  assert.match(record.transformation, /no raw CML/);
}
assert.deepEqual(PROTON_NMR_RECORD_BY_ID['2-propanol-1h-nmr'].peaks.map((peak) => [peak.ppm, peak.protonCount]), [[1.22, 6], [4.04, 1]]);
assert.equal(PROTON_NMR_RECORD_BY_ID['2-propanol-1h-nmr'].unreportedExchangeableProtons, 1);
assert.equal(PROTON_NMR_RECORD_BY_ID['propanal-1h-nmr'].peaks.at(-1).ppm, 9.7);
assert.equal(PROTON_NMR_RECORD_BY_ID['butanoic-acid-1h-nmr'].peaks.at(-1).ppm, 11.97);

for (const preset of MASS_EVIDENCE_PRESETS) {
  assert.strictEqual(MASS_EVIDENCE_PRESET_BY_ID[preset.id], preset);
  assert.equal(formatComposition(preset.composition), preset.formula.replaceAll('₀', ''));
}
for (const scenario of ORTHOGONAL_EVIDENCE_CASES) {
  assert.strictEqual(ORTHOGONAL_EVIDENCE_CASE_BY_ID[scenario.id], scenario);
  assert.equal(scenario.candidateIds.length, 2);
  assert.equal(scenario.formulaSufficient, false);
  assert.equal(scenario.massDiscriminates, false);
  assert.equal(scenario.identificationScope, 'supports-declared-pair');
  assert.ok(scenario.candidateIds.includes(scenario.unknownRecordId));
  assert.ok(ORTHOGONAL_NMR_FEATURE_BY_ID[scenario.decisiveNmrFeatureId]);
}

const cursor = analyzeProtonRecord({ recordId: 'propanal-1h-nmr', cursorPpm: 9.65 });
assert.equal(cursor.record.id, 'propanal-1h-nmr');
assert.equal(cursor.cursor.ppm, 9.65);
assert.equal(cursor.cursor.nearestPeak.ppm, 9.7);
assert.equal(cursor.cursor.distancePpm, 0.05);
assert.equal(cursor.cursor.region.id, 'high-frequency');
assert.deepEqual(cursor.sourceCoverage, { observedProtonCount: 6, formulaProtonCount: 6, unreportedExchangeableProtons: 0, completeByCount: true });
assert.ok(recursivelyFrozen(cursor));

const initial = createNmrProbeState({ recordId: '2-propanol-1h-nmr' });
const initialCopy = structuredClone(initial);
const first = placeNmrProbe(initial, { ppm: 1.22, protonCount: 3 });
assert.equal(first.accepted, true);
assert.deepEqual(initial, initialCopy);
assert.equal(first.state.probes.length, 1);
assert.equal(first.state.probes[0].protonCount, 3);
const duplicate = placeNmrProbe(first.state, { ppm: 1.26, protonCount: 6 });
assert.equal(duplicate.accepted, false);
assert.strictEqual(duplicate.state, first.state);
assert.match(duplicate.reason, /0.06 ppm/);
const second = placeNmrProbe(first.state, { ppm: 4.04, protonCount: 1 });
assert.equal(second.accepted, true);
const probeSnapshot = structuredClone(second.state);
const wrongIntegration = evaluateNmrProbes(second.state);
assert.deepEqual(second.state, probeSnapshot);
assert.deepEqual(wrongIntegration.score, { correct: 1, total: 2 });
assert.equal(wrongIntegration.dimensions[0].positionCorrect, true);
assert.equal(wrongIntegration.dimensions[0].integrationCorrect, false);
assert.equal(wrongIntegration.dimensions[1].correct, true);
assert.equal(wrongIntegration.missingPeaks.length, 1);
assert.equal(wrongIntegration.missingPeaks[0].ppm, 1.22);
assert.ok(recursivelyFrozen(wrongIntegration));

const correctFirst = placeNmrProbe(initial, { ppm: 1.22, protonCount: 6 });
const correctSecond = placeNmrProbe(correctFirst.state, { ppm: 4.04, protonCount: 1 });
const correctNmr = evaluateNmrProbes(correctSecond.state);
assert.deepEqual(correctNmr.score, { correct: 2, total: 2 });
assert.equal(correctNmr.allCorrect, true);
assert.equal(correctNmr.missingPeaks.length, 0);
const unknownRemoval = removeNmrProbe(correctSecond.state, 'probe-99');
assert.equal(unknownRemoval.accepted, false);
assert.strictEqual(unknownRemoval.state, correctSecond.state);
const removed = removeNmrProbe(correctSecond.state, 'probe-1');
assert.equal(removed.accepted, true);
assert.equal(removed.state.probes.length, 1);
for (let level = 1; level <= 4; level += 1) {
  const before = structuredClone(correctSecond.state.probes);
  const hint = nextNmrProbeHint({ recordId: correctSecond.state.recordId, probes: correctSecond.state.probes, level });
  assert.equal(hint.level, level);
  assert.deepEqual(correctSecond.state.probes, before);
  assert.ok(recursivelyFrozen(hint));
}

assert.deepEqual(validateComposition({ C: 3, H: 8, O: 1, Cl: 0, Br: 0 }), { C: 3, H: 8, O: 1, Cl: 0, Br: 0 });
assert.equal(formatComposition({ C: 3, H: 8, O: 1, Cl: 0, Br: 0 }), 'C₃H₈O');
const formulaRuns = [
  [{ C: 3, H: 8, O: 1, Cl: 0, Br: 0 }, 60, 'minor'],
  [{ C: 3, H: 6, O: 1, Cl: 0, Br: 0 }, 58, 'minor'],
  [{ C: 4, H: 8, O: 2, Cl: 0, Br: 0 }, 88, 'minor'],
];
for (const [composition, nominalMass, fingerprint] of formulaRuns) {
  const run = calculateIsotopologueEnvelope(composition);
  assert.equal(run.nominalMass, nominalMass);
  assert.equal(run.fingerprint.id, fingerprint);
  assert.equal(run.envelope[0].nominalOffset, 0);
  assert.equal(run.envelope[0].relativeIntensity, 100);
  assert.ok(run.envelope.some((bucket) => bucket.nominalOffset === 1));
  assert.ok(recursivelyFrozen(run));
}
const chlorine = calculateIsotopologueEnvelope({ C: 3, H: 7, O: 0, Cl: 1, Br: 0 });
const chlorineM2 = chlorine.envelope.find((bucket) => bucket.nominalOffset === 2).relativeIntensity;
assert.ok(chlorineM2 >= 30 && chlorineM2 <= 36);
assert.equal(chlorine.fingerprint.id, 'one-third');
const bromine = calculateIsotopologueEnvelope({ C: 3, H: 7, O: 0, Cl: 0, Br: 1 });
const bromineM2 = bromine.envelope.find((bucket) => bucket.nominalOffset === 2).relativeIntensity;
assert.ok(bromineM2 >= 94 && bromineM2 <= 100);
assert.equal(bromine.fingerprint.id, 'near-equal');

const massPrediction = { nominalMass: 999, fingerprint: 'near-equal', identityScope: 'identifies-constitutional-isomer' };
const massPredictionCopy = structuredClone(massPrediction);
const wrongMass = evaluateMassEvidenceAttempt({ run: formulaRuns.length && calculateIsotopologueEnvelope(formulaRuns[0][0]), prediction: massPrediction });
assert.deepEqual(massPrediction, massPredictionCopy);
assert.deepEqual(wrongMass.score, { correct: 0, total: 3 });
assert.equal(wrongMass.allCorrect, false);
const correctMass = evaluateMassEvidenceAttempt({ run: chlorine, prediction: { nominalMass: chlorine.nominalMass, fingerprint: 'one-third', identityScope: 'formula-cannot-identify-isomer' } });
assert.deepEqual(correctMass.score, { correct: 3, total: 3 });
for (let level = 1; level <= 4; level += 1) {
  const hint = nextMassEvidenceHint({ run: chlorine, level });
  assert.equal(hint.level, level);
  assert.ok(recursivelyFrozen(hint));
}

const caseExpectations = [
  ['propanol-topology', '2-propanol-1h-nmr', 'two-signal-symmetry'],
  ['carbonyl-terminus-orthogonal', 'propanal-1h-nmr', 'aldehydic-high-frequency-signal'],
  ['acid-ester-orthogonal', 'butanoic-acid-1h-nmr', 'acid-high-frequency-signal'],
];
for (const [caseId, candidateId, featureId] of caseExpectations) {
  const analysis = analyzeOrthogonalCase({ caseId });
  assert.equal(analysis.unknownRecord.id, candidateId);
  assert.equal(analysis.case.decisiveNmrFeatureId, featureId);
  assert.equal(analysis.massEnvelope.formula, analysis.case.formula);
  assert.equal(analysis.evidenceMatrix.length, 4);
  assert.ok(recursivelyFrozen(analysis));
  const correct = evaluateOrthogonalCaseAttempt({
    analysis,
    prediction: { formulaSufficient: false, irRole: analysis.expected.irRole, nmrFeatureId: featureId, massDiscriminates: false, candidateId },
  });
  assert.equal(correct.allCorrect, true);
  assert.deepEqual(correct.score, { correct: 5, total: 5 });
  const wrongCandidate = analysis.candidates.find((item) => item.id !== candidateId).id;
  const wrongFeature = Object.keys(ORTHOGONAL_NMR_FEATURE_BY_ID).find((id) => id !== featureId);
  const wrongPrediction = { formulaSufficient: true, irRole: 'certifies-identity', nmrFeatureId: wrongFeature, massDiscriminates: true, candidateId: wrongCandidate };
  const wrongCopy = structuredClone(wrongPrediction);
  const wrong = evaluateOrthogonalCaseAttempt({ analysis, prediction: wrongPrediction });
  assert.deepEqual(wrongPrediction, wrongCopy);
  assert.equal(wrong.allCorrect, false);
  assert.deepEqual(wrong.score, { correct: 0, total: 5 });
  assert.equal(Object.keys(wrong.dimensions).length, 5);
  for (let level = 1; level <= 4; level += 1) {
    const hint = nextOrthogonalCaseHint({ analysis, level });
    assert.equal(hint.level, level);
    assert.ok(recursivelyFrozen(hint));
  }
}

assert.throws(() => analyzeProtonRecord({ recordId: 'unknown', cursorPpm: 1 }), /recordId/);
assert.throws(() => analyzeProtonRecord({ recordId: 'propanal-1h-nmr', cursorPpm: 13 }), /0 through 12.5/);
assert.throws(() => createNmrProbeState({ recordId: 'unknown' }), /recordId/);
assert.throws(() => placeNmrProbe(initial, { ppm: 1, protonCount: 0 }), /protonCount/);
assert.throws(() => evaluateNmrProbes(initial), /at least one probe/);
assert.throws(() => validateComposition({ C: 13, H: 0, O: 0, Cl: 0, Br: 0 }), /C must/);
assert.throws(() => validateComposition({ C: 1, H: 4, N: 1 }), /unsupported element/);
assert.throws(() => calculateIsotopologueEnvelope({ C: 0, H: 0, O: 0, Cl: 0, Br: 0 }), /at least one atom/);
assert.throws(() => evaluateMassEvidenceAttempt({ run: chlorine, prediction: { nominalMass: '95', fingerprint: 'one-third', identityScope: 'formula-cannot-identify-isomer' } }), /nominalMass/);
assert.throws(() => analyzeOrthogonalCase({ caseId: 'unknown' }), /caseId/);
assert.throws(() => nextNmrProbeHint({ recordId: '2-propanol-1h-nmr', probes: [], level: 0 }), /level/);
assert.throws(() => nextMassEvidenceHint({ run: chlorine, level: 5 }), /level/);
assert.throws(() => nextOrthogonalCaseHint({ analysis: analyzeOrthogonalCase({ caseId: 'propanol-topology' }), level: 0 }), /level/);

console.log('Six attributed measured proton peak lists, five isotope presets, three orthogonal casefiles, source invariants, and model boundaries verified.');
console.log('Immutable reversed-axis cursor analysis, exact NMR probe placement/removal, integration scoring, retained wrong tags, missing peaks, and four non-mutating hints verified.');
console.log('Ideal H/C/O/Cl/Br isotopologue convolution, M/M+1/M+2 fingerprints, three-claim mass audits, five-claim case audits, invalid inputs, and recursive immutability verified.');
