import { MEASURED_EI_RECORD_BY_ID } from '../data/measuredEiSpectra.js';
import {
  EI_EVIDENCE_BOUNDARY,
  EI_EVIDENCE_CASES,
  EI_EVIDENCE_CASE_BY_ID,
  EI_PEAK_ROLES,
} from '../data/measuredEiScenarios.js';

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
};

const round1 = (value) => Math.round((value + Number.EPSILON) * 10) / 10;

const resolveRecord = (recordId) => {
  const record = MEASURED_EI_RECORD_BY_ID[recordId];
  if (!record) throw new RangeError(`Unknown measured EI record: ${recordId}.`);
  return record;
};

const resolveCase = (caseId) => {
  const casefile = EI_EVIDENCE_CASE_BY_ID[caseId];
  if (!casefile) throw new RangeError(`Unknown measured EI case: ${caseId}.`);
  return casefile;
};

const validateMz = (mz) => {
  if (!Number.isInteger(mz) || mz < 40 || mz > 250) {
    throw new RangeError(`m/z must be an integer from 40 through 250; received ${mz}.`);
  }
  return mz;
};

const validateHintLevel = (level) => {
  if (!Number.isInteger(level) || level < 1 || level > 4) {
    throw new RangeError(`Hint level must be an integer from 1 through 4; received ${level}.`);
  }
  return level;
};

const validateWeight = (leftWeight) => {
  if (!Number.isInteger(leftWeight) || leftWeight < 10 || leftWeight > 90) {
    throw new RangeError(`Left display coefficient must be an integer from 10 through 90; received ${leftWeight}.`);
  }
  return leftWeight;
};

const caseForRecord = (recordId) => EI_EVIDENCE_CASES.find(({ candidates }) => candidates.includes(recordId));

const exactPeak = (record, mz) => record.peaks.find((peak) => peak.mz === mz) ?? null;

const nearestPeak = (record, mz) => record.peaks.reduce((nearest, peak) => (
  Math.abs(peak.mz - mz) < Math.abs(nearest.mz - mz) ? peak : nearest
));

export const analyzeEiRecord = ({ recordId, cursorMz }) => {
  const record = resolveRecord(recordId);
  validateMz(cursorMz);
  const exact = exactPeak(record, cursorMz);
  const nearest = nearestPeak(record, cursorMz);
  return deepFreeze({
    record,
    cursor: {
      mz: cursorMz,
      exactPeak: exact,
      nearestPeak: nearest,
      nearestDistance: Math.abs(nearest.mz - cursorMz),
    },
    basePeak: exactPeak(record, record.basePeakMz),
    molecularIon: {
      mz: record.metadata.derivative.nominalMolecularIonMz,
      present: Boolean(record.molecularIonPeak),
      peak: record.molecularIonPeak,
    },
    conditions: record.metadata.acquisition,
    resultKind: record.resultKind,
    boundary: EI_EVIDENCE_BOUNDARY,
  });
};

const validateTagState = (state) => {
  if (!state || typeof state !== 'object' || !Array.isArray(state.tags)) {
    throw new TypeError('A measured EI tag state is required.');
  }
  resolveRecord(state.recordId);
  return state;
};

export const createEiTagState = ({ recordId }) => {
  resolveRecord(recordId);
  return deepFreeze({ recordId, nextTagNumber: 1, tags: [] });
};

export const placeEiTag = (state, { mz, role }) => {
  validateTagState(state);
  validateMz(mz);
  if (!EI_PEAK_ROLES.some(({ id }) => id === role)) {
    throw new RangeError(`Unknown measured EI tag role: ${role}.`);
  }
  if (state.tags.some((tag) => tag.mz === mz && tag.role === role)) {
    return deepFreeze({
      accepted: false,
      state,
      reason: `The ${role} tag at m/z ${mz} already exists; the original tag state was preserved.`,
    });
  }
  if (state.tags.length >= 6) {
    return deepFreeze({
      accepted: false,
      state,
      reason: `Six learner tags are already attached; m/z ${mz} was not added and the original tag state was preserved.`,
    });
  }
  const tag = deepFreeze({ id: `tag-${state.nextTagNumber}`, mz, role });
  const nextState = deepFreeze({
    recordId: state.recordId,
    nextTagNumber: state.nextTagNumber + 1,
    tags: [...state.tags, tag],
  });
  return deepFreeze({ accepted: true, state: nextState, tag, reason: `Attached ${role} at learner-selected m/z ${mz}.` });
};

export const removeEiTag = (state, tagId) => {
  validateTagState(state);
  if (typeof tagId !== 'string' || !tagId) throw new TypeError('A tag id is required.');
  if (!state.tags.some(({ id }) => id === tagId)) {
    return deepFreeze({ removed: false, state, reason: `Tag ${tagId} was not found; the original tag state was preserved.` });
  }
  const nextState = deepFreeze({ ...state, tags: state.tags.filter(({ id }) => id !== tagId) });
  return deepFreeze({ removed: true, state: nextState, reason: `Removed ${tagId}.` });
};

const roleAudit = (record, casefile, tag) => {
  const peak = exactPeak(record, tag.mz);
  if (tag.role === 'observation') {
    return {
      ...tag,
      scored: false,
      correct: null,
      reason: peak
        ? `A retained source stick is present at m/z ${tag.mz} (${peak.relativeIntensity}%); it remains an unassigned observation.`
        : `No retained source stick is present at m/z ${tag.mz}; the studio will not invent a fragment assignment.`,
    };
  }
  if (tag.role === 'base-peak') {
    return {
      ...tag,
      scored: true,
      correct: tag.mz === record.basePeakMz,
      reason: tag.mz === record.basePeakMz
        ? `m/z ${tag.mz} is the record's 100% base peak.`
        : `m/z ${tag.mz} is not the base peak; this record's exact 100% coordinate is m/z ${record.basePeakMz}.`,
    };
  }
  if (tag.role === 'molecular-ion-candidate') {
    const correct = tag.mz === 247 && Boolean(record.molecularIonPeak);
    return {
      ...tag,
      scored: true,
      correct,
      reason: correct
        ? `The source retains a ${record.molecularIonPeak.relativeIntensity}% stick at derivative candidate m/z 247.`
        : record.molecularIonPeak
          ? `m/z ${tag.mz} is not the declared derivative candidate coordinate; the retained source coordinate is m/z 247.`
          : `m/z ${tag.mz} cannot be confirmed as the derivative molecular-ion candidate: this compact source adaptation reports no stick at m/z 247.`,
    };
  }
  if (tag.role === 'pair-contrast') {
    const correct = tag.mz === casefile.contrastMz;
    return {
      ...tag,
      scored: true,
      correct,
      reason: correct
        ? `m/z ${tag.mz} is the declared contrast coordinate for ${casefile.title}.`
        : `m/z ${tag.mz} is not this casefile's declared contrast; use exact m/z ${casefile.contrastMz}.`,
    };
  }
  const correct = tag.mz === casefile.sharedMz;
  return {
    ...tag,
    scored: true,
    correct,
    reason: correct
      ? `m/z ${tag.mz} is the declared shared coordinate for ${casefile.title}.`
      : `m/z ${tag.mz} is not this casefile's declared shared coordinate; use exact m/z ${casefile.sharedMz}.`,
  };
};

export const evaluateEiTags = (state) => {
  validateTagState(state);
  const record = resolveRecord(state.recordId);
  const casefile = caseForRecord(record.id);
  const dimensions = state.tags.map((tag) => roleAudit(record, casefile, tag));
  const scoredRoles = EI_PEAK_ROLES.map(({ id }) => id).filter((id) => id !== 'observation');
  const missingScoredRoles = scoredRoles.filter((role) => !dimensions.some((entry) => entry.role === role && entry.correct));
  return deepFreeze({
    recordId: record.id,
    dimensions,
    scoredCount: dimensions.filter(({ scored }) => scored).length,
    correctCount: dimensions.filter(({ correct }) => correct === true).length,
    missingScoredRoles,
    boundary: EI_EVIDENCE_BOUNDARY,
  });
};

const dimension = (id, label, learner, expected, reason) => ({
  id,
  label,
  learner,
  expected,
  correct: learner === expected,
  reason,
});

export const evaluateEiCase = ({ caseId, predictions, selectedMz }) => {
  const casefile = resolveCase(caseId);
  validateMz(selectedMz);
  if (!predictions || typeof predictions !== 'object') throw new TypeError('Case predictions are required.');
  const allowedSpecies = [null, 'neutral-parent', '2tms-derivative', 'not-sure'];
  const allowedRelation = [null, 'same', 'different', 'not-sure'];
  const allowedScope = [null, 'certifies-identity', 'supports-declared-case', 'proves-purity'];
  if (![null, true, false].includes(predictions.formulaSufficient)) throw new RangeError('Formula sufficiency must be true, false, or null.');
  if (!allowedSpecies.includes(predictions.measuredSpecies)) throw new RangeError(`Invalid measured species: ${predictions.measuredSpecies}.`);
  if (!allowedRelation.includes(predictions.baseRelation)) throw new RangeError(`Invalid base relation: ${predictions.baseRelation}.`);
  if (![null, ...casefile.candidates].includes(predictions.candidateId)) throw new RangeError(`Candidate must belong to ${caseId}.`);
  if (!allowedScope.includes(predictions.scope)) throw new RangeError(`Invalid evidence scope: ${predictions.scope}.`);

  const dimensions = [
    dimension('formula', 'Formula sufficiency', predictions.formulaSufficient, false, 'Both declared candidates have neutral formula C4H9NO2.'),
    dimension('species', 'Measured species', predictions.measuredSpecies, '2tms-derivative', 'The source record declares a C10H25NO2Si2 2TMS derivative.'),
    dimension('base-relation', 'Base-peak relation', predictions.baseRelation, casefile.expectedBaseRelation, `The declared pair has ${casefile.expectedBaseRelation} base-peak m/z values.`),
    dimension('contrast', 'Pair contrast coordinate', selectedMz, casefile.contrastMz, `The declared contrast is exact nominal m/z ${casefile.contrastMz}; the learner retained m/z ${selectedMz}.`),
    dimension('candidate', 'Supported candidate', predictions.candidateId, casefile.targetRecordId, `Within this two-candidate case, the target adaptation is ${MEASURED_EI_RECORD_BY_ID[casefile.targetRecordId].name}.`),
    dimension('scope', 'Claim scope', predictions.scope, 'supports-declared-case', 'The evidence can support only this declared case; it cannot certify identity or purity.'),
  ];
  return deepFreeze({
    caseId,
    targetRecordId: casefile.targetRecordId,
    predictions: { ...predictions },
    selectedMz,
    dimensions,
    correctCount: dimensions.filter(({ correct }) => correct).length,
    boundedVerdict: dimensions.every(({ correct }) => correct)
      ? 'All six dimensions support the declared target inside this two-candidate case only.'
      : 'The declared case is not yet fully supported; learner choices remain visible for revision.',
    boundary: EI_EVIDENCE_BOUNDARY,
  });
};

export const buildSyntheticBlend = ({ caseId, leftWeight }) => {
  const casefile = resolveCase(caseId);
  validateWeight(leftWeight);
  const [leftId, rightId] = casefile.candidates;
  const left = resolveRecord(leftId);
  const right = resolveRecord(rightId);
  const leftByMz = new Map(left.peaks.map((peak) => [peak.mz, peak.relativeIntensity]));
  const rightByMz = new Map(right.peaks.map((peak) => [peak.mz, peak.relativeIntensity]));
  const coordinates = [...new Set([...leftByMz.keys(), ...rightByMz.keys()])].sort((a, b) => a - b);
  const rightWeight = 100 - leftWeight;
  const weighted = coordinates.map((mz) => {
    const leftIntensity = leftByMz.get(mz) ?? 0;
    const rightIntensity = rightByMz.get(mz) ?? 0;
    return {
      mz,
      leftIntensity,
      rightIntensity,
      weightedIntensity: round1((leftWeight / 100) * leftIntensity + (rightWeight / 100) * rightIntensity),
      ownership: leftIntensity && rightIntensity ? 'shared' : leftIntensity ? 'left-only' : 'right-only',
    };
  });
  const preNormalizationMaximum = Math.max(...weighted.map(({ weightedIntensity }) => weightedIntensity));
  const ledger = weighted.map((entry) => ({
    ...entry,
    displayIntensity: round1((100 * entry.weightedIntensity) / preNormalizationMaximum),
  }));
  return deepFreeze({
    caseId,
    leftRecord: left,
    rightRecord: right,
    leftWeight,
    rightWeight,
    preNormalizationMaximum,
    ledger,
    resultKind: 'Synthetic arithmetic over two normalized compact references — not a measured mixture',
    boundary: EI_EVIDENCE_BOUNDARY,
  });
};

export const evaluateBlendAttempt = ({ caseId, leftWeight, selectedMz, predictions }) => {
  validateMz(selectedMz);
  if (!predictions || typeof predictions !== 'object') throw new TypeError('Blend predictions are required.');
  const blend = buildSyntheticBlend({ caseId, leftWeight });
  const selected = blend.ledger.find(({ mz }) => mz === selectedMz) ?? deepFreeze({
    mz: selectedMz,
    leftIntensity: 0,
    rightIntensity: 0,
    weightedIntensity: 0,
    displayIntensity: 0,
    ownership: 'neither',
  });
  if (![null, true, false].includes(predictions.weightsAreComposition)) throw new RangeError('Composition prediction must be true, false, or null.');
  if (![null, true, false].includes(predictions.compositeProvesTwo)) throw new RangeError('Two-compound prediction must be true, false, or null.');
  if (![null, 'left-only', 'right-only', 'shared', 'neither'].includes(predictions.selectedOwnership)) throw new RangeError(`Invalid ownership: ${predictions.selectedOwnership}.`);
  if (![null, 'synthetic-display-only', 'measured-mixture', 'quantitative-composition'].includes(predictions.scope)) throw new RangeError(`Invalid blend scope: ${predictions.scope}.`);
  const dimensions = [
    dimension('weights', 'Coefficient meaning', predictions.weightsAreComposition, false, 'The coefficients weight already normalized display references; they are not amount fractions.'),
    dimension('two-compounds', 'Mixture proof', predictions.compositeProvesTwo, false, 'Arithmetic superposition does not prove that a measured sample contains two compounds.'),
    dimension('ownership', 'Retained-coordinate ownership', predictions.selectedOwnership, selected.ownership, `At compact-record threshold, m/z ${selectedMz} is ${selected.ownership}.`),
    dimension('scope', 'Blend scope', predictions.scope, 'synthetic-display-only', 'The spool is a synthetic display exercise, not measurement or quantitation.'),
    {
      id: 'coordinate-observation',
      label: 'Selected coordinate',
      learner: selectedMz,
      expected: null,
      correct: null,
      scored: false,
      reason: `m/z ${selectedMz}: left ${selected.leftIntensity}%, right ${selected.rightIntensity}%, weighted ${selected.weightedIntensity}, displayed ${selected.displayIntensity}%.`,
    },
  ];
  return deepFreeze({
    blend,
    selected,
    predictions: { ...predictions },
    dimensions,
    correctCount: dimensions.filter(({ correct }) => correct === true).length,
    boundary: EI_EVIDENCE_BOUNDARY,
  });
};

const TAG_HINTS = [
  ['Read the axes', 'Move the integer cursor deliberately. A blank coordinate is still an observation; the cursor never snaps to a stick.'],
  ['Find the normalized reference', 'The 100% stick is the base peak. It is a normalization anchor, not automatically the molecular ion.'],
  ['Separate parent from measured derivative', 'The neutral formula is C4H9NO2, while the source declares a 2TMS derivative with nominal candidate m/z 247.'],
  ['Attach only the claim you can defend', 'Use exact source coordinates for scored roles. Lower-mass sticks remain unassigned unless the source reports an assignment.'],
];

const CASE_HINTS = [
  ['Start with formula', 'Both candidates have C4H9NO2, so formula alone cannot choose between them.'],
  ['Read the source method', 'The target and candidates share the declared GC-EI-TOF method and 2TMS derivative context.'],
  ['Separate three coordinate jobs', 'Compare base peak, shared coordinate, and pair-contrast coordinate as independent observations.'],
  ['Keep the conclusion bounded', 'A matching declared candidate supports this two-choice case only; it does not certify identity or purity.'],
];

const BLEND_HINTS = [
  ['Read the coefficients', 'They weight normalized source displays; they are not mole, mass, or concentration fractions.'],
  ['Check threshold ownership', 'Ownership records whether a coordinate survived the compact threshold in left, right, both, or neither source adaptation.'],
  ['Inspect both ledgers', 'The composite is renormalized to a 100% base after weighting, so displayed height cannot recover composition.'],
  ['Name the scope', 'This is synthetic arithmetic over two references, not a measured mixture and not proof of two compounds.'],
];

const hint = (mode, entries, level, context) => {
  validateHintLevel(level);
  const [title, body] = entries[level - 1];
  return deepFreeze({
    mode,
    level,
    title,
    body,
    context,
    mutation: 'No cursor, tag, release, prediction, coefficient, or audit state changed.',
  });
};

export const nextEiTagHint = ({ recordId, tags = [], level }) => {
  resolveRecord(recordId);
  if (!Array.isArray(tags)) throw new TypeError('Tags must be an array.');
  return hint('run-card', TAG_HINTS, level, { recordId, tagCount: tags.length });
};

export const nextEiCaseHint = ({ caseId, level }) => {
  resolveCase(caseId);
  return hint('six-way-lineup', CASE_HINTS, level, { caseId });
};

export const nextEiBlendHint = ({ caseId, leftWeight, level }) => {
  resolveCase(caseId);
  validateWeight(leftWeight);
  return hint('blend-spool', BLEND_HINTS, level, { caseId, leftWeight });
};

