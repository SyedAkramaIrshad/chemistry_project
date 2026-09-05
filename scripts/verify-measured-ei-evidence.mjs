import assert from 'node:assert/strict';

import {
  MEASURED_EI_DATA_NOTICE,
  MEASURED_EI_RECORD_BY_ID,
  MEASURED_EI_RECORDS,
} from '../src/data/measuredEiSpectra.js';
import {
  EI_BLEND_OWNERSHIP_OPTIONS,
  EI_EVIDENCE_BOUNDARY,
  EI_EVIDENCE_CASE_BY_ID,
  EI_EVIDENCE_CASES,
  EI_PEAK_ROLES,
  EI_TEACHER_CONTRASTS,
} from '../src/data/measuredEiScenarios.js';
import {
  analyzeEiRecord,
  buildSyntheticBlend,
  createEiTagState,
  evaluateBlendAttempt,
  evaluateEiCase,
  evaluateEiTags,
  nextEiBlendHint,
  nextEiCaseHint,
  nextEiTagHint,
  placeEiTag,
  removeEiTag,
} from '../src/chemistry/measuredEiEvidence.js';

const assertRecursivelyFrozen = (value, path = 'value', seen = new Set()) => {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true, `${path} must be frozen`);
  Object.entries(value).forEach(([key, nested]) => assertRecursivelyFrozen(nested, `${path}.${key}`, seen));
};

assert.equal(MEASURED_EI_RECORDS.length, 6);
assert.equal(EI_EVIDENCE_CASES.length, 3);
assert.equal(Object.keys(MEASURED_EI_RECORD_BY_ID).length, 6);
assert.equal(Object.keys(EI_EVIDENCE_CASE_BY_ID).length, 3);
assert.equal(EI_PEAK_ROLES.length, 5);
assert.deepEqual(EI_BLEND_OWNERSHIP_OPTIONS.map(({ id }) => id), ['left-only', 'right-only', 'shared', 'neither']);
assert.equal(EI_TEACHER_CONTRASTS.length, 6);
assert.deepEqual(
  Object.keys(EI_EVIDENCE_BOUNDARY).sort(),
  ['blend', 'comparison', 'derivatization', 'excluded', 'fragmentAssignment', 'identity', 'molecularIon', 'nominalMz', 'records'].sort(),
);

assertRecursivelyFrozen(MEASURED_EI_RECORDS, 'MEASURED_EI_RECORDS');
assertRecursivelyFrozen(MEASURED_EI_RECORD_BY_ID, 'MEASURED_EI_RECORD_BY_ID');
assertRecursivelyFrozen(MEASURED_EI_DATA_NOTICE, 'MEASURED_EI_DATA_NOTICE');
assertRecursivelyFrozen(EI_EVIDENCE_CASES, 'EI_EVIDENCE_CASES');
assertRecursivelyFrozen(EI_EVIDENCE_CASE_BY_ID, 'EI_EVIDENCE_CASE_BY_ID');

assert.deepEqual(MEASURED_EI_RECORDS.map(({ accession }) => accession), [
  'MSBNK-MSSJ-MSJ02336',
  'MSBNK-MSSJ-MSJ02340',
  'MSBNK-MSSJ-MSJ02354',
  'MSBNK-MSSJ-MSJ02358',
  'MSBNK-MSSJ-MSJ02362',
  'MSBNK-MSSJ-MSJ02368',
]);
assert.deepEqual(MEASURED_EI_RECORDS.map(({ sourcePeakCount }) => sourcePeakCount), [104, 70, 83, 114, 92, 95]);
assert.deepEqual(MEASURED_EI_RECORDS.map(({ transformedPeakCount }) => transformedPeakCount), [19, 19, 17, 31, 26, 29]);
assert.deepEqual(MEASURED_EI_RECORDS.map(({ retentionTimeMin }) => retentionTimeMin), [7.26, 7.05, 7.24, 7.52, 7.52, 7.77]);
assert.deepEqual(MEASURED_EI_RECORDS.map(({ basePeakMz }) => basePeakMz), [130, 130, 130, 116, 102, 116]);
assert.deepEqual(MEASURED_EI_RECORDS.map(({ molecularIonPeak }) => molecularIonPeak?.relativeIntensity ?? 'absent'), ['absent', 'absent', 0.1, 0.5, 'absent', 0.5]);
assert.deepEqual(MEASURED_EI_RECORDS.map(({ splash }) => splash), [
  'splash10-001i-4900000000-c8de67efde7269e8de4d',
  'splash10-001i-4900000000-30ff658990346a9e5f66',
  'splash10-001i-4900000000-59f5f5f91cfaf2eade03',
  'splash10-01b9-5900000000-63ef36d70b2c7f7215fa',
  'splash10-0udi-5900000000-33e9ccb5f505fed0766c',
  'splash10-014i-5900000000-91173c0ca595586613a0',
]);

for (const record of MEASURED_EI_RECORDS) {
  assert.equal(record.metadata.neutralFormula, 'C4H9NO2');
  assert.equal(record.metadata.derivative.formula, 'C10H25NO2Si2');
  assert.equal(record.metadata.derivative.exactMass, 247.14238);
  assert.equal(record.metadata.derivative.type, '2TMS');
  assert.equal(record.metadata.license, 'CC BY');
  assert.equal(record.metadata.acquisition.instrumentType, 'GC-EI-TOF');
  assert.equal(record.metadata.acquisition.sourceTitle, '70 V');
  assert.equal(record.peaks.filter(({ relativeIntensity }) => relativeIntensity === 100).length, 1);
  assert.deepEqual([...record.peaks].sort((a, b) => a.mz - b.mz), record.peaks);
  assert.equal(new Set(record.peaks.map(({ mz }) => mz)).size, record.peaks.length);
  for (const peak of record.peaks) {
    assert.equal(Number.isInteger(peak.mz), true);
    assert.equal(peak.mz >= 40 && peak.mz <= 250, true);
    assert.equal(peak.relativeIntensity > 0 && peak.relativeIntensity <= 100, true);
  }
}

assert.equal(new Set(MEASURED_EI_RECORDS.map(({ metadata }) => metadata)).size, 1);
assert.match(MEASURED_EI_DATA_NOTICE.datasetVersion, /2025\.10/);
assert.equal(MEASURED_EI_DATA_NOTICE.accessedOn, '2026-08-30');
assert.equal(MEASURED_EI_DATA_NOTICE.transformation.length, 7);
assert.match(MEASURED_EI_DATA_NOTICE.licenseWarning, /CC BY.*without a license version/i);
assert.match(MEASURED_EI_DATA_NOTICE.runtimeBoundary, /no MassBank.*remote service is called/i);

const exactAnalysis = analyzeEiRecord({ recordId: 'alpha-linear', cursorMz: 130 });
assert.equal(exactAnalysis.cursor.exactPeak.relativeIntensity, 100);
assert.equal(exactAnalysis.cursor.nearestDistance, 0);
assert.equal(exactAnalysis.basePeak.mz, 130);
assert.equal(exactAnalysis.molecularIon.present, false);
assertRecursivelyFrozen(exactAnalysis, 'exactAnalysis');

const emptyAnalysis = analyzeEiRecord({ recordId: 'alpha-linear', cursorMz: 129 });
assert.equal(emptyAnalysis.cursor.exactPeak, null);
assert.equal(emptyAnalysis.cursor.nearestPeak.mz, 130);
assert.equal(emptyAnalysis.cursor.nearestDistance, 1);

let tagState = createEiTagState({ recordId: 'alpha-linear' });
const wrongTag = placeEiTag(tagState, { mz: 129, role: 'base-peak' });
assert.equal(wrongTag.accepted, true);
assert.equal(wrongTag.tag.mz, 129);
tagState = wrongTag.state;
const duplicate = placeEiTag(tagState, { mz: 129, role: 'base-peak' });
assert.equal(duplicate.accepted, false);
assert.equal(duplicate.state, tagState);
for (const [mz, role] of [[130, 'base-peak'], [114, 'pair-contrast'], [130, 'shared-coordinate'], [247, 'molecular-ion-candidate'], [73, 'observation']]) {
  tagState = placeEiTag(tagState, { mz, role }).state;
}
assert.equal(tagState.tags.length, 6);
const seventh = placeEiTag(tagState, { mz: 44, role: 'observation' });
assert.equal(seventh.accepted, false);
assert.equal(seventh.state, tagState);
const missingRemoval = removeEiTag(tagState, 'tag-99');
assert.equal(missingRemoval.removed, false);
assert.equal(missingRemoval.state, tagState);
const removed = removeEiTag(tagState, 'tag-1');
assert.equal(removed.removed, true);
assert.equal(removed.state.tags.length, 5);

const tagAudit = evaluateEiTags(tagState);
assert.equal(tagAudit.scoredCount, 5);
assert.equal(tagAudit.dimensions.find(({ id }) => id === 'tag-1').correct, false);
assert.equal(tagAudit.dimensions.find(({ role, mz }) => role === 'base-peak' && mz === 130).correct, true);
assert.equal(tagAudit.dimensions.find(({ role }) => role === 'molecular-ion-candidate').correct, false);
assert.equal(tagAudit.dimensions.find(({ role }) => role === 'pair-contrast').correct, true);
assert.equal(tagAudit.dimensions.find(({ role }) => role === 'shared-coordinate').correct, true);
assert.equal(tagAudit.dimensions.find(({ role }) => role === 'observation').scored, false);
assert.deepEqual(tagAudit.missingScoredRoles, ['molecular-ion-candidate']);

let weakMolecularState = createEiTagState({ recordId: 'alpha-n-methyl' });
weakMolecularState = placeEiTag(weakMolecularState, { mz: 247, role: 'molecular-ion-candidate' }).state;
assert.equal(evaluateEiTags(weakMolecularState).dimensions[0].correct, true);

for (const casefile of EI_EVIDENCE_CASES) {
  const evaluation = evaluateEiCase({
    caseId: casefile.id,
    selectedMz: casefile.contrastMz,
    predictions: {
      formulaSufficient: false,
      measuredSpecies: '2tms-derivative',
      baseRelation: casefile.expectedBaseRelation,
      candidateId: casefile.targetRecordId,
      scope: 'supports-declared-case',
    },
  });
  assert.equal(evaluation.correctCount, 6);
  assert.match(evaluation.boundedVerdict, /inside this two-candidate case only/i);
  assertRecursivelyFrozen(evaluation, `case.${casefile.id}`);
}

const wrongPredictions = {
  formulaSufficient: true,
  measuredSpecies: 'neutral-parent',
  baseRelation: 'different',
  candidateId: 'alpha-linear',
  scope: 'certifies-identity',
};
const wrongCase = evaluateEiCase({ caseId: 'alpha-branch-case', predictions: wrongPredictions, selectedMz: 115 });
assert.deepEqual(wrongCase.predictions, wrongPredictions);
assert.equal(wrongCase.correctCount, 0);

const equalBlend = buildSyntheticBlend({ caseId: 'alpha-branch-case', leftWeight: 50 });
assert.equal(equalBlend.leftWeight, 50);
assert.equal(equalBlend.rightWeight, 50);
assert.equal(equalBlend.preNormalizationMaximum, 100);
assert.deepEqual(
  equalBlend.ledger.find(({ mz }) => mz === 114),
  { mz: 114, leftIntensity: 1.4, rightIntensity: 4.5, weightedIntensity: 3, ownership: 'shared', displayIntensity: 3 },
);

const unequalBlend = buildSyntheticBlend({ caseId: 'n-methyl-position-case', leftWeight: 70 });
assert.equal(unequalBlend.preNormalizationMaximum, 70);
assert.equal(unequalBlend.ledger.find(({ mz }) => mz === 130).ownership, 'left-only');
assert.equal(unequalBlend.ledger.find(({ mz }) => mz === 42).ownership, 'right-only');
assert.equal(unequalBlend.ledger.find(({ mz }) => mz === 73).ownership, 'shared');
assert.equal(unequalBlend.ledger.find(({ mz }) => mz === 116).displayIntensity, 42.9);

for (const [selectedMz, ownership] of [[130, 'left-only'], [42, 'right-only'], [73, 'shared'], [200, 'neither']]) {
  const evaluation = evaluateBlendAttempt({
    caseId: 'n-methyl-position-case',
    leftWeight: 70,
    selectedMz,
    predictions: {
      weightsAreComposition: false,
      compositeProvesTwo: false,
      selectedOwnership: ownership,
      scope: 'synthetic-display-only',
    },
  });
  assert.equal(evaluation.correctCount, 4);
  assert.equal(evaluation.selected.ownership, ownership);
  assert.equal(evaluation.dimensions.at(-1).scored, false);
  assertRecursivelyFrozen(evaluation, `blend.${ownership}`);
}

for (const invalid of [
  () => analyzeEiRecord({ recordId: 'missing', cursorMz: 100 }),
  () => analyzeEiRecord({ recordId: 'alpha-linear', cursorMz: 39 }),
  () => analyzeEiRecord({ recordId: 'alpha-linear', cursorMz: 40.5 }),
  () => placeEiTag(createEiTagState({ recordId: 'alpha-linear' }), { mz: 100, role: 'invented' }),
  () => evaluateEiCase({ caseId: 'missing', predictions: {}, selectedMz: 100 }),
  () => buildSyntheticBlend({ caseId: 'alpha-branch-case', leftWeight: 9 }),
  () => nextEiTagHint({ recordId: 'alpha-linear', tags: [], level: 0 }),
]) assert.throws(invalid);

const allHints = [];
for (let level = 1; level <= 4; level += 1) {
  allHints.push(nextEiTagHint({ recordId: 'alpha-linear', tags: tagState.tags, level }));
  allHints.push(nextEiCaseHint({ caseId: 'alpha-branch-case', level }));
  allHints.push(nextEiBlendHint({ caseId: 'alpha-branch-case', leftWeight: 50, level }));
}
assert.equal(allHints.length, 12);
for (const entry of allHints) {
  assertRecursivelyFrozen(entry, `hint.${entry.mode}.${entry.level}`);
  assert.match(entry.mutation, /No cursor, tag, release, prediction, coefficient, or audit state changed/);
}

console.log('Six CC BY measured GC-EI-TOF compact records and three same-formula casefiles verified.');
console.log('Manual nominal-m/z tags, preserved failures, bounded candidate evidence, and non-mutating hints verified.');
console.log('Synthetic two-reference arithmetic, threshold ownership, source attribution, and identity/mixture boundaries verified.');
