import {
  INFRARED_BAND_LABEL_BY_ID,
  INFRARED_CASE_BY_ID,
  INFRARED_MODEL_BOUNDARY,
  INFRARED_RECORD_BY_ID,
} from '../data/infraredScenarios.js';

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
};

const requireObject = (value, name) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${name} must be an object.`);
};

const requireFinite = (value, name) => {
  if (!Number.isFinite(value)) throw new Error(`${name} must be a finite number.`);
  return value;
};

const requireLevel = (level) => {
  if (!Number.isInteger(level) || level < 1 || level > 4) throw new Error('level must be an integer from 1 through 4.');
  return level;
};

const resolveRecord = (recordId) => {
  const record = INFRARED_RECORD_BY_ID[recordId];
  if (!record) throw new Error(`recordId must identify a declared infrared record; received ${recordId}.`);
  return record;
};

const resolveCase = (caseId) => {
  const scenario = INFRARED_CASE_BY_ID[caseId];
  if (!scenario) throw new Error(`caseId must identify a declared infrared case; received ${caseId}.`);
  return scenario;
};

const resolveLabel = (labelId) => {
  const label = INFRARED_BAND_LABEL_BY_ID[labelId];
  if (!label) throw new Error(`labelId must identify a declared infrared band label; received ${labelId}.`);
  return label;
};

const requireWavenumber = (record, wavenumberCmInv) => {
  requireFinite(wavenumberCmInv, 'wavenumberCmInv');
  const [minimum, maximum] = record.sourceRangeCmInv;
  if (wavenumberCmInv < minimum || wavenumberCmInv > maximum) {
    throw new Error(`wavenumberCmInv must remain inside the source range ${minimum}–${maximum} cm⁻¹.`);
  }
  return wavenumberCmInv;
};

const nearestTracePoint = (record, wavenumberCmInv) => record.trace.reduce((nearest, point) => (
  Math.abs(point[0] - wavenumberCmInv) < Math.abs(nearest[0] - wavenumberCmInv) ? point : nearest
));

const regionFor = (wavenumberCmInv) => {
  if (wavenumberCmInv >= 2500) return { id: 'x-h-stretch', label: 'high-wavenumber X–H region' };
  if (wavenumberCmInv >= 2000) return { id: 'triple-bond-region', label: 'selected triple-bond region' };
  if (wavenumberCmInv >= 1500) return { id: 'double-bond-region', label: 'selected double-bond region' };
  return { id: 'fingerprint-region', label: 'fingerprint region' };
};

const validateProbe = (record, probe) => {
  requireObject(probe, 'probe');
  if (typeof probe.id !== 'string' || !probe.id) throw new Error('Each probe id must be a non-empty string.');
  requireWavenumber(record, probe.wavenumberCmInv);
  resolveLabel(probe.labelId);
  return probe;
};

const validateProbeState = (state) => {
  requireObject(state, 'state');
  const record = resolveRecord(state.recordId);
  if (!Array.isArray(state.probes)) throw new Error('state.probes must be an array.');
  if (!Number.isInteger(state.nextProbeNumber) || state.nextProbeNumber < 1) throw new Error('state.nextProbeNumber must be a positive integer.');
  if (state.probes.length > 6) throw new Error('state.probes cannot contain more than six probes.');
  const ids = new Set();
  for (const probe of state.probes) {
    validateProbe(record, probe);
    if (ids.has(probe.id)) throw new Error(`Probe id ${probe.id} is duplicated.`);
    ids.add(probe.id);
  }
  return record;
};

export function analyzeInfraredRecord({ recordId, cursorCmInv }) {
  const record = resolveRecord(recordId);
  const selectedWavenumber = requireWavenumber(record, cursorCmInv);
  const nearest = nearestTracePoint(record, selectedWavenumber);
  const region = regionFor(selectedWavenumber);
  return deepFreeze({
    record,
    cursor: {
      wavenumberCmInv: selectedWavenumber,
      nearestTraceWavenumberCmInv: nearest[0],
      normalizedAbsorbance: nearest[1],
      regionId: region.id,
      regionLabel: region.label,
    },
    trace: record.trace,
    declaredFeatureCount: record.expectedFeatures.length,
    resultKind: 'Transformed measured-reference trace — normalized within this record',
    modelBoundary: INFRARED_MODEL_BOUNDARY,
  });
}

export function createProbeState({ recordId }) {
  resolveRecord(recordId);
  return deepFreeze({ recordId, probes: [], nextProbeNumber: 1 });
}

export function placeInfraredProbe(state, { wavenumberCmInv, labelId }) {
  const record = validateProbeState(state);
  const selectedWavenumber = requireWavenumber(record, wavenumberCmInv);
  const label = resolveLabel(labelId);
  if (state.probes.length >= 6) {
    return deepFreeze({ accepted: false, state, reason: 'Six probe tags are already hanging. Remove one explicitly before adding another.' });
  }
  const nearby = state.probes.find((probe) => Math.abs(probe.wavenumberCmInv - selectedWavenumber) <= 12);
  if (nearby) {
    return deepFreeze({ accepted: false, state, reason: `Probe ${nearby.id} is already within 12 cm⁻¹. The existing learner tag was preserved.` });
  }
  const probe = deepFreeze({ id: `probe-${state.nextProbeNumber}`, wavenumberCmInv: selectedWavenumber, labelId: label.id });
  const nextState = deepFreeze({
    recordId: state.recordId,
    probes: [...state.probes, probe],
    nextProbeNumber: state.nextProbeNumber + 1,
  });
  return deepFreeze({ accepted: true, state: nextState, probe, reason: `${label.label} tag placed at exactly ${selectedWavenumber} cm⁻¹.` });
}

export function removeInfraredProbe(state, probeId) {
  validateProbeState(state);
  if (typeof probeId !== 'string' || !probeId) throw new Error('probeId must be a non-empty string.');
  const target = state.probes.find((probe) => probe.id === probeId);
  if (!target) return deepFreeze({ accepted: false, state, reason: `No probe named ${probeId} exists; learner state was preserved.` });
  const nextState = deepFreeze({ ...state, probes: state.probes.filter((probe) => probe.id !== probeId) });
  return deepFreeze({ accepted: true, state: nextState, removed: target, reason: `${probeId} was removed explicitly.` });
}

const nearestFeatureWithLabel = (record, labelId, wavenumberCmInv) => {
  const candidates = record.expectedFeatures.filter((feature) => feature.labelId === labelId);
  if (!candidates.length) return null;
  return candidates.reduce((nearest, feature) => (
    Math.abs(feature.centreCmInv - wavenumberCmInv) < Math.abs(nearest.centreCmInv - wavenumberCmInv) ? feature : nearest
  ));
};

export function evaluateProbeAssignments({ recordId, probes }) {
  const record = resolveRecord(recordId);
  if (!Array.isArray(probes) || probes.length === 0) throw new Error('probes must contain at least one probe before audit.');
  if (probes.length > 6) throw new Error('probes cannot contain more than six probes.');
  probes.forEach((probe) => validateProbe(record, probe));
  const dimensions = probes.map((probe) => {
    const label = resolveLabel(probe.labelId);
    if (probe.labelId === 'unassigned') {
      return {
        probeId: probe.id,
        scored: false,
        correct: null,
        featureId: null,
        learnerLabel: label.label,
        learnerWavenumberCmInv: probe.wavenumberCmInv,
        expectedLabel: 'Observation retained without structural assignment',
        signedOffsetCmInv: null,
        reason: 'An unassigned tag records where you looked. It is preserved but does not claim a functional assignment and is not scored.',
      };
    }
    const feature = nearestFeatureWithLabel(record, probe.labelId, probe.wavenumberCmInv);
    if (!feature) {
      return {
        probeId: probe.id,
        scored: true,
        correct: false,
        featureId: null,
        learnerLabel: label.label,
        learnerWavenumberCmInv: probe.wavenumberCmInv,
        expectedLabel: `No declared ${label.label} feature in this bounded record`,
        signedOffsetCmInv: null,
        reason: `${record.name} has no declared ${label.label} feature in this teaching subset. The tag remains exactly where you placed it.`,
      };
    }
    const signedOffsetCmInv = probe.wavenumberCmInv - feature.centreCmInv;
    const correct = Math.abs(signedOffsetCmInv) <= feature.toleranceCmInv;
    return {
      probeId: probe.id,
      scored: true,
      correct,
      featureId: feature.id,
      learnerLabel: label.label,
      learnerWavenumberCmInv: probe.wavenumberCmInv,
      expectedLabel: `${label.label} near ${feature.centreCmInv} cm⁻¹ (±${feature.toleranceCmInv})`,
      signedOffsetCmInv,
      reason: correct
        ? `${probe.wavenumberCmInv} cm⁻¹ lies inside the declared ${label.label} window. ${feature.note}`
        : `${probe.wavenumberCmInv} cm⁻¹ is ${Math.abs(signedOffsetCmInv)} cm⁻¹ from the selected ${label.label} centre and outside its ±${feature.toleranceCmInv} cm⁻¹ teaching window.`,
    };
  });
  const matchedFeatureIds = new Set(dimensions.filter((item) => item.correct).map((item) => item.featureId));
  const missingFeatures = record.expectedFeatures.filter((feature) => !matchedFeatureIds.has(feature.id));
  const scored = dimensions.filter((item) => item.scored);
  return deepFreeze({
    record,
    dimensions,
    missingFeatures,
    score: { correct: scored.filter((item) => item.correct).length, total: scored.length },
    allAssignedCorrect: scored.length > 0 && scored.every((item) => item.correct),
    boundary: 'This audit checks only the declared windows. It does not assign every band, quantify absorptivity, or certify identity.',
  });
}

export function nextInfraredProbeHint({ recordId, probes, level }) {
  const record = resolveRecord(recordId);
  if (!Array.isArray(probes)) throw new Error('probes must be an array.');
  requireLevel(level);
  const messages = [
    { title: 'Read the axis first', detail: 'Infrared wavenumber runs high to low from left to right on this film. A horizontal position is a coordinate, not yet an assignment.' },
    { title: 'Separate regions', detail: 'X–H stretching evidence sits high on this selected axis; carbonyl evidence sits in the declared double-bond region; C–O evidence appears in the fingerprint region.' },
    { title: 'Compare the declared labels', detail: `${record.name} exposes ${record.expectedFeatures.length} selected teaching features. An unassigned tag can mark another visible feature without inventing a label.` },
    { title: 'Use the source windows', detail: record.expectedFeatures.map((feature) => `${INFRARED_BAND_LABEL_BY_ID[feature.labelId].shortLabel} ${feature.centreCmInv}±${feature.toleranceCmInv}`).join(' · ') },
  ];
  return deepFreeze({ level, ...messages[level - 1], mutation: 'No cursor, probe, label, or audit was changed.' });
}

export function analyzeInfraredCase({ caseId }) {
  const scenario = resolveCase(caseId);
  const unknownRecord = resolveRecord(scenario.unknownRecordId);
  const candidates = scenario.candidateIds.map(resolveRecord);
  return deepFreeze({
    case: scenario,
    unknownRecord,
    candidates,
    trace: unknownRecord.trace,
    expected: {
      candidateId: unknownRecord.id,
      formulaSufficient: false,
      decisiveLabelId: scenario.decisiveLabelId,
      identificationScope: 'supports-declared-candidate-only',
    },
    resultKind: 'Declared two-candidate comparison using one transformed gas-phase IR record',
    modelBoundary: INFRARED_MODEL_BOUNDARY,
  });
}

const CASE_SCOPE_LABELS = {
  'supports-declared-candidate-only': 'Supports one candidate in this declared pair only',
  'certifies-identity': 'Certifies the compound identity',
};

const dimension = ({ learnerValue, expectedValue, learnerLabel, expectedLabel, reason }) => deepFreeze({
  learnerValue,
  expectedValue,
  learnerLabel,
  expectedLabel,
  correct: learnerValue === expectedValue,
  reason,
});

export function evaluateInfraredCaseAttempt({ analysis, prediction }) {
  requireObject(analysis, 'analysis');
  const scenario = resolveCase(analysis.case?.id);
  requireObject(prediction, 'prediction');
  if (!scenario.candidateIds.includes(prediction.candidateId)) throw new Error('prediction.candidateId must be one of the two declared candidates.');
  if (typeof prediction.formulaSufficient !== 'boolean') throw new Error('prediction.formulaSufficient must be boolean.');
  resolveLabel(prediction.decisiveLabelId);
  if (!Object.hasOwn(CASE_SCOPE_LABELS, prediction.identificationScope)) throw new Error('prediction.identificationScope is not a declared scope choice.');
  const expected = analysis.expected;
  const candidate = resolveRecord(prediction.candidateId);
  const expectedCandidate = resolveRecord(expected.candidateId);
  const decisive = resolveLabel(prediction.decisiveLabelId);
  const expectedDecisive = resolveLabel(expected.decisiveLabelId);
  const dimensions = {
    candidateId: dimension({
      learnerValue: prediction.candidateId,
      expectedValue: expected.candidateId,
      learnerLabel: candidate.name,
      expectedLabel: expectedCandidate.name,
      reason: `${expectedCandidate.name} contains the declared ${expectedDecisive.label} evidence used to discriminate this exact pair. The other candidate remains chemically possible from formula alone.`,
    }),
    formulaSufficient: dimension({
      learnerValue: prediction.formulaSufficient,
      expectedValue: false,
      learnerLabel: prediction.formulaSufficient ? 'Formula is sufficient' : 'Formula is not sufficient',
      expectedLabel: 'Formula is not sufficient',
      reason: `${scenario.formula} fixes the atom inventory, but both displayed candidates share it and differ in connectivity.`,
    }),
    decisiveLabelId: dimension({
      learnerValue: prediction.decisiveLabelId,
      expectedValue: expected.decisiveLabelId,
      learnerLabel: decisive.label,
      expectedLabel: expectedDecisive.label,
      reason: `${expectedDecisive.label} is the declared differentiating feature for this two-candidate exercise; other bands may be shared or remain unassigned.`,
    }),
    identificationScope: dimension({
      learnerValue: prediction.identificationScope,
      expectedValue: expected.identificationScope,
      learnerLabel: CASE_SCOPE_LABELS[prediction.identificationScope],
      expectedLabel: CASE_SCOPE_LABELS[expected.identificationScope],
      reason: `This transformed ${analysis.unknownRecord.state} record supports one candidate only inside the declared pair. Phase-sensitive shape, mixtures, purity, concentration, and orthogonal confirmation remain outside the evidence.`,
    }),
  };
  const entries = Object.values(dimensions);
  return deepFreeze({
    case: scenario,
    dimensions,
    score: { correct: entries.filter((item) => item.correct).length, total: entries.length },
    allCorrect: entries.every((item) => item.correct),
    prediction: { ...prediction },
  });
}

export function nextInfraredCaseHint({ analysis, level }) {
  requireObject(analysis, 'analysis');
  const scenario = resolveCase(analysis.case?.id);
  requireLevel(level);
  const decisive = resolveLabel(scenario.decisiveLabelId);
  const messages = [
    { title: 'Inventory is not connectivity', detail: `Both candidates satisfy ${scenario.formula}. Look for evidence that separates their bond environments.` },
    { title: 'Compare one region', detail: `The declared contrast turns on ${decisive.family}, not on matching every visible peak.` },
    { title: 'Name the evidence family', detail: `${decisive.label} is the selected differentiator for this pair.` },
    { title: 'Keep the claim bounded', detail: `The expected candidate is ${analysis.unknownRecord.name}, but the trace supports that answer only within these two candidates and the stated gas-phase source conditions.` },
  ];
  return deepFreeze({ level, ...messages[level - 1], mutation: 'No film, candidate, claim, or evaluation was changed.' });
}
