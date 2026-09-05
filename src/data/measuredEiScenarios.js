import { MEASURED_EI_RECORD_BY_ID } from './measuredEiSpectra.js';

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
};

export const EI_EVIDENCE_CASES = deepFreeze([
  {
    id: 'alpha-branch-case',
    code: 'CASE α-BRANCH',
    title: 'Alpha position: linear or branched?',
    candidates: ['alpha-linear', 'alpha-branched'],
    targetRecordId: 'alpha-branched',
    contrastMz: 114,
    sharedMz: 130,
    expectedBaseRelation: 'same',
  },
  {
    id: 'beta-branch-case',
    code: 'CASE β-BRANCH',
    title: 'Beta position: linear or branched?',
    candidates: ['beta-linear', 'beta-branched'],
    targetRecordId: 'beta-branched',
    contrastMz: 102,
    sharedMz: 73,
    expectedBaseRelation: 'different',
  },
  {
    id: 'n-methyl-position-case',
    code: 'CASE N-METHYL',
    title: 'N-methyl: alpha or beta?',
    candidates: ['alpha-n-methyl', 'beta-n-methyl'],
    targetRecordId: 'beta-n-methyl',
    contrastMz: 116,
    sharedMz: 73,
    expectedBaseRelation: 'different',
  },
]);

export const EI_EVIDENCE_CASE_BY_ID = deepFreeze(Object.fromEntries(
  EI_EVIDENCE_CASES.map((entry) => [entry.id, entry]),
));

export const EI_PEAK_ROLES = deepFreeze([
  { id: 'base-peak', label: 'Base peak' },
  { id: 'molecular-ion-candidate', label: 'Molecular-ion candidate' },
  { id: 'pair-contrast', label: 'Pair contrast' },
  { id: 'shared-coordinate', label: 'Shared coordinate' },
  { id: 'observation', label: 'Unassigned observation' },
]);

export const EI_BLEND_OWNERSHIP_OPTIONS = deepFreeze([
  { id: 'left-only', label: 'Left only' },
  { id: 'right-only', label: 'Right only' },
  { id: 'shared', label: 'Shared' },
  { id: 'neither', label: 'Neither' },
]);

export const EI_TEACHER_CONTRASTS = deepFreeze([
  { id: 'absent-molecular-ion', title: 'No reported m/z 247 stick', mode: 'run', recordId: 'alpha-linear', cursorMz: 247 },
  { id: 'weak-molecular-ion', title: 'A retained 0.1% m/z 247 stick', mode: 'run', recordId: 'alpha-n-methyl', cursorMz: 247 },
  { id: 'shared-base-weak-contrast', title: 'Shared base peak, weaker pair contrast', mode: 'lineup', caseId: 'alpha-branch-case', cursorMz: 114 },
  { id: 'different-base-same-formula', title: 'Different base peaks, same formula', mode: 'lineup', caseId: 'beta-branch-case', cursorMz: 102 },
  { id: 'equal-distinct-base-blend', title: 'Equal display coefficients, distinct base peaks', mode: 'blend', caseId: 'beta-branch-case', leftWeight: 50, cursorMz: 116 },
  { id: 'unequal-threshold-right-only', title: 'Unequal display coefficients, right-only retained coordinate', mode: 'blend', caseId: 'n-methyl-position-case', leftWeight: 70, cursorMz: 42 },
]);

export const EI_EVIDENCE_BOUNDARY = deepFreeze({
  records: 'Six attributed CC BY MassBank GC-EI-TOF records are shown as compact nominal-m/z adaptations, not raw spectra or a searchable library.',
  nominalMz: 'Coordinates are integer nominal m/z bins from 40 through 250. No accurate-mass formula inference, isotope fine structure, resolution, uncertainty, or calibration is modeled.',
  derivatization: 'C4H9NO2 is the neutral formula; the source-declared measured derivative is C10H25NO2Si2 (2TMS), exact derivative mass 247.14238.',
  molecularIon: 'm/z 247 is a derivative molecular-ion candidate only when a source stick is retained there; its absence is not proof that the compound is absent.',
  fragmentAssignment: 'Lower-mass sticks remain unassigned fragment-ion coordinates. The studio does not invent structures, formulae, or rearrangement mechanisms.',
  comparison: 'Three comparisons support or oppose only their two declared candidates under one shared source method; they do not perform an unknown search.',
  blend: 'The spool is synthetic arithmetic over normalized compact references. Its coefficients are not composition, and its result is not a measured mixture.',
  identity: 'No result certifies identity, purity, concentration, contaminant exclusion, or method validity.',
  excluded: 'Excluded: other ion sources, MS/MS, library similarity, arbitrary prediction, real mixtures, response factors, quantitation, deconvolution, matrix effects, raw data, sample preparation, instrument operation, and chemical handling.',
});

for (const casefile of EI_EVIDENCE_CASES) {
  for (const recordId of casefile.candidates) {
    if (!MEASURED_EI_RECORD_BY_ID[recordId]) {
      throw new Error(`Measured EI case ${casefile.id} references unknown record ${recordId}.`);
    }
  }
}

