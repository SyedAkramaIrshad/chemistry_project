import {
  ISOTOPE_COMPOSITIONS,
  MASS_EVIDENCE_PRESET_BY_ID,
  MASS_FINGERPRINT_OPTIONS,
  NMR_SIGNAL_REGIONS,
  ORTHOGONAL_EVIDENCE_BOUNDARY,
  ORTHOGONAL_EVIDENCE_CASE_BY_ID,
  ORTHOGONAL_NMR_FEATURE_BY_ID,
  PROTON_NMR_RECORD_BY_ID,
} from '../data/orthogonalEvidenceScenarios.js';

const ELEMENT_ORDER = ['C', 'H', 'O', 'Cl', 'Br'];
const ELEMENT_LIMITS = { C: 12, H: 30, O: 8, Cl: 3, Br: 3 };
const SUBSCRIPT = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' };
const NMR_MATCH_TOLERANCE_PPM = 0.08;

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
};

const requireObject = (value, name) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${name} must be an object.`);
  return value;
};

const requireFinite = (value, name) => {
  if (!Number.isFinite(value)) throw new Error(`${name} must be a finite number.`);
  return value;
};

const requireLevel = (level) => {
  if (!Number.isInteger(level) || level < 1 || level > 4) throw new Error('level must be an integer from 1 through 4.');
  return level;
};

const rounded = (value, places = 6) => Number(value.toFixed(places));

const resolveRecord = (recordId) => {
  const record = PROTON_NMR_RECORD_BY_ID[recordId];
  if (!record) throw new Error(`recordId must identify a declared proton-NMR record; received ${recordId}.`);
  return record;
};

const resolveCase = (caseId) => {
  const scenario = ORTHOGONAL_EVIDENCE_CASE_BY_ID[caseId];
  if (!scenario) throw new Error(`caseId must identify a declared orthogonal-evidence case; received ${caseId}.`);
  return scenario;
};

const requirePpm = (ppm) => {
  requireFinite(ppm, 'ppm');
  if (ppm < 0 || ppm > 12.5) throw new Error('ppm must remain from 0 through 12.5 on this proton-NMR tape.');
  return ppm;
};

const regionAt = (ppm) => NMR_SIGNAL_REGIONS.find((region) => ppm >= region.rangePpm[0] && ppm <= region.rangePpm[1]) ?? NMR_SIGNAL_REGIONS.at(-1);

const sourceCoverageFor = (record) => ({
  observedProtonCount: record.observedProtonCount,
  formulaProtonCount: record.formulaProtonCount,
  unreportedExchangeableProtons: record.unreportedExchangeableProtons,
  completeByCount: record.observedProtonCount === record.formulaProtonCount,
});

export function analyzeProtonRecord({ recordId, cursorPpm }) {
  const record = resolveRecord(recordId);
  const ppm = requirePpm(cursorPpm);
  const nearestPeak = record.peaks.reduce((nearest, peak) => (
    Math.abs(peak.ppm - ppm) < Math.abs(nearest.ppm - ppm) ? peak : nearest
  ));
  const region = regionAt(ppm);
  return deepFreeze({
    record,
    cursor: {
      ppm,
      nearestPeak,
      distancePpm: rounded(Math.abs(nearestPeak.ppm - ppm), 4),
      region,
    },
    sourceCoverage: sourceCoverageFor(record),
    resultKind: 'Measured source peak-list coordinate — not a reconstructed line shape',
    modelBoundary: ORTHOGONAL_EVIDENCE_BOUNDARY,
  });
}

const validateProbe = (probe) => {
  requireObject(probe, 'probe');
  if (typeof probe.id !== 'string' || !probe.id) throw new Error('Each probe id must be a non-empty string.');
  requirePpm(probe.ppm);
  if (!Number.isInteger(probe.protonCount) || probe.protonCount < 1 || probe.protonCount > 12) {
    throw new Error('probe.protonCount must be an integer from 1 through 12.');
  }
  return probe;
};

const validateProbeState = (state) => {
  requireObject(state, 'state');
  const record = resolveRecord(state.recordId);
  if (!Array.isArray(state.probes)) throw new Error('state.probes must be an array.');
  if (!Number.isInteger(state.nextProbeNumber) || state.nextProbeNumber < 1) throw new Error('state.nextProbeNumber must be a positive integer.');
  if (state.probes.length > 8) throw new Error('state.probes cannot contain more than eight probes.');
  const ids = new Set();
  for (const probe of state.probes) {
    validateProbe(probe);
    if (ids.has(probe.id)) throw new Error(`Probe id ${probe.id} is duplicated.`);
    ids.add(probe.id);
  }
  return record;
};

export function createNmrProbeState({ recordId }) {
  resolveRecord(recordId);
  return deepFreeze({ recordId, nextProbeNumber: 1, probes: [] });
}

export function placeNmrProbe(state, { ppm, protonCount }) {
  const record = validateProbeState(state);
  const selectedPpm = requirePpm(ppm);
  if (!Number.isInteger(protonCount) || protonCount < 1 || protonCount > 12) {
    throw new Error('protonCount must be an integer from 1 through 12.');
  }
  if (state.probes.length >= 8) {
    return deepFreeze({ accepted: false, state, reason: 'Eight integration tags are already attached. Remove one explicitly before adding another.' });
  }
  const nearby = state.probes.find((probe) => Math.abs(probe.ppm - selectedPpm) <= 0.06);
  if (nearby) {
    return deepFreeze({ accepted: false, state, reason: `${nearby.id} is already within 0.06 ppm. The existing learner tag was preserved.` });
  }
  const probe = deepFreeze({ id: `probe-${state.nextProbeNumber}`, ppm: selectedPpm, protonCount });
  const nextState = deepFreeze({
    recordId: record.id,
    nextProbeNumber: state.nextProbeNumber + 1,
    probes: [...state.probes, probe],
  });
  return deepFreeze({ accepted: true, state: nextState, probe, reason: `${protonCount} H tag placed at exactly ${selectedPpm.toFixed(2)} ppm.` });
}

export function removeNmrProbe(state, probeId) {
  validateProbeState(state);
  if (typeof probeId !== 'string' || !probeId) throw new Error('probeId must be a non-empty string.');
  const target = state.probes.find((probe) => probe.id === probeId);
  if (!target) return deepFreeze({ accepted: false, state, reason: `No probe named ${probeId} exists; learner state was preserved.` });
  const nextState = deepFreeze({ ...state, probes: state.probes.filter((probe) => probe.id !== probeId) });
  return deepFreeze({ accepted: true, state: nextState, removed: target, reason: `${probeId} was removed explicitly.` });
}

export function evaluateNmrProbes(state) {
  const record = validateProbeState(state);
  if (state.probes.length === 0) throw new Error('state.probes must contain at least one probe before audit.');
  const availablePeaks = new Map(record.peaks.map((peak) => [peak.id, peak]));
  const dimensions = state.probes.map((probe) => {
    const nearest = [...availablePeaks.values()].sort((left, right) => Math.abs(left.ppm - probe.ppm) - Math.abs(right.ppm - probe.ppm))[0] ?? null;
    const signedOffsetPpm = nearest ? rounded(probe.ppm - nearest.ppm, 4) : null;
    const positionCorrect = Boolean(nearest && Math.abs(signedOffsetPpm) <= NMR_MATCH_TOLERANCE_PPM);
    if (positionCorrect) availablePeaks.delete(nearest.id);
    const integrationCorrect = Boolean(positionCorrect && probe.protonCount === nearest.protonCount);
    const correct = positionCorrect && integrationCorrect;
    let reason;
    if (!positionCorrect) {
      reason = nearest
        ? `${probe.ppm.toFixed(2)} ppm is ${Math.abs(signedOffsetPpm).toFixed(2)} ppm from the nearest still-unmatched measured signal, outside the ±${NMR_MATCH_TOLERANCE_PPM.toFixed(2)} ppm probe window.`
        : 'Every measured signal already has a nearer learner tag; this additional tag remains visible but unmatched.';
    } else if (!integrationCorrect) {
      reason = `The position matches the ${nearest.ppm.toFixed(2)} ppm measured signal, but the learner tag says ${probe.protonCount} H while the source atom-reference count is ${nearest.protonCount} H.`;
    } else {
      reason = `${probe.ppm.toFixed(2)} ppm is inside the measured ${nearest.ppm.toFixed(2)} ppm window and the ${probe.protonCount} H source-derived integration agrees.`;
    }
    return {
      probeId: probe.id,
      learnerPpm: probe.ppm,
      learnerProtonCount: probe.protonCount,
      matchedPeak: positionCorrect ? nearest : null,
      signedOffsetPpm: positionCorrect ? signedOffsetPpm : null,
      positionCorrect,
      integrationCorrect,
      correct,
      reason,
    };
  });
  const fullyMatchedPeakIds = new Set(dimensions.filter((item) => item.correct).map((item) => item.matchedPeak.id));
  const missingPeaks = record.peaks.filter((peak) => !fullyMatchedPeakIds.has(peak.id));
  return deepFreeze({
    record,
    dimensions,
    missingPeaks,
    score: { correct: dimensions.filter((item) => item.correct).length, total: dimensions.length },
    allCorrect: dimensions.length > 0 && dimensions.every((item) => item.correct) && missingPeaks.length === 0,
    sourceCoverage: sourceCoverageFor(record),
    boundary: 'This audit checks exact displayed peak-list positions and source atom-reference counts only. It does not recreate line shape, fit coupling, or certify a structure.',
  });
}

export function nextNmrProbeHint({ recordId, probes, level }) {
  const record = resolveRecord(recordId);
  if (!Array.isArray(probes)) throw new Error('probes must be an array.');
  probes.forEach(validateProbe);
  requireLevel(level);
  const coverage = sourceCoverageFor(record);
  const messages = [
    { title: 'Read the magnetic tape', detail: 'The proton chemical-shift axis runs from 12.5 ppm at the left to 0 ppm at the right. A coordinate is evidence, not yet an assignment.' },
    { title: 'Separate signals from protons', detail: 'One signal represents one reported magnetic environment in this source list. Its integration tag can represent several equivalent protons.' },
    { title: 'Audit source coverage', detail: coverage.completeByCount ? `The displayed source atom-reference counts total all ${coverage.formulaProtonCount} formula hydrogens.` : `${coverage.observedProtonCount} of ${coverage.formulaProtonCount} formula hydrogens are represented; ${coverage.unreportedExchangeableProtons} exchangeable H is not synthesized.` },
    { title: 'Use the measured list', detail: record.peaks.map((peak) => `${peak.ppm.toFixed(2)} ppm / ${peak.protonCount} H`).join(' · ') },
  ];
  return deepFreeze({ level, ...messages[level - 1], mutation: 'No cursor, integration tag, release, or audit was changed.' });
}

export function validateComposition(composition) {
  requireObject(composition, 'composition');
  const unsupported = Object.keys(composition).filter((key) => !ELEMENT_ORDER.includes(key));
  if (unsupported.length) throw new Error(`composition contains unsupported element ${unsupported.join(', ')}.`);
  const normalized = {};
  for (const element of ELEMENT_ORDER) {
    const count = composition[element] ?? 0;
    if (!Number.isInteger(count) || count < 0 || count > ELEMENT_LIMITS[element]) {
      throw new Error(`${element} must be an integer from 0 through ${ELEMENT_LIMITS[element]}.`);
    }
    normalized[element] = count;
  }
  if (Object.values(normalized).every((count) => count === 0)) throw new Error('composition must contain at least one atom.');
  if (Object.values(normalized).reduce((sum, count) => sum + count, 0) > 40) throw new Error('composition cannot contain more than 40 atoms in this bounded teaching engine.');
  return deepFreeze(normalized);
}

const subscriptNumber = (number) => String(number).split('').map((digit) => SUBSCRIPT[digit]).join('');

export function formatComposition(composition) {
  const normalized = validateComposition(composition);
  return ELEMENT_ORDER.filter((element) => normalized[element] > 0)
    .map((element) => `${element}${normalized[element] === 1 ? '' : subscriptNumber(normalized[element])}`)
    .join('');
}

const convolveElement = (buckets, isotopes) => {
  const combined = new Map();
  const baseMassNumber = isotopes[0].massNumber;
  for (const bucket of buckets) {
    for (const isotope of isotopes) {
      const nominalOffset = bucket.nominalOffset + isotope.massNumber - baseMassNumber;
      const probability = bucket.probability * isotope.abundance;
      const exactMass = bucket.exactMass + isotope.exactMass;
      const current = combined.get(nominalOffset) ?? { nominalOffset, probability: 0, weightedExactMass: 0 };
      current.probability += probability;
      current.weightedExactMass += probability * exactMass;
      combined.set(nominalOffset, current);
    }
  }
  return [...combined.values()].map((bucket) => ({
    nominalOffset: bucket.nominalOffset,
    probability: bucket.probability,
    exactMass: bucket.weightedExactMass / bucket.probability,
  }));
};

export function calculateIsotopologueEnvelope(composition) {
  const normalized = validateComposition(composition);
  let buckets = [{ nominalOffset: 0, probability: 1, exactMass: 0 }];
  let nominalMass = 0;
  let monoisotopicNeutralMass = 0;
  for (const element of ELEMENT_ORDER) {
    const count = normalized[element];
    const isotopes = ISOTOPE_COMPOSITIONS[element];
    nominalMass += count * isotopes[0].massNumber;
    monoisotopicNeutralMass += count * isotopes[0].exactMass;
    for (let atom = 0; atom < count; atom += 1) buckets = convolveElement(buckets, isotopes);
  }
  buckets.sort((left, right) => left.nominalOffset - right.nominalOffset);
  const maximumProbability = Math.max(...buckets.map((bucket) => bucket.probability));
  const mProbability = buckets.find((bucket) => bucket.nominalOffset === 0)?.probability ?? 0;
  const envelope = buckets.filter((bucket) => bucket.probability / maximumProbability >= 0.000001).map((bucket) => ({
    nominalOffset: bucket.nominalOffset,
    label: bucket.nominalOffset === 0 ? 'M' : `M+${bucket.nominalOffset}`,
    nominalMass: nominalMass + bucket.nominalOffset,
    exactMass: rounded(bucket.exactMass, 6),
    probability: rounded(bucket.probability, 10),
    relativeIntensity: rounded((bucket.probability / maximumProbability) * 100, 3),
    relativeToM: rounded((bucket.probability / mProbability) * 100, 3),
  }));
  const mPlusTwo = envelope.find((bucket) => bucket.nominalOffset === 2)?.relativeToM ?? 0;
  const halogenCount = normalized.Cl + normalized.Br;
  const fingerprintId = halogenCount > 1 ? 'multi-halogen' : mPlusTwo >= 75 ? 'near-equal' : mPlusTwo >= 20 ? 'one-third' : 'minor';
  const fingerprint = MASS_FINGERPRINT_OPTIONS.find((option) => option.id === fingerprintId);
  return deepFreeze({
    composition: normalized,
    formula: formatComposition(normalized),
    nominalMass,
    monoisotopicNeutralMass: rounded(monoisotopicNeutralMass, 6),
    envelope,
    fingerprint: { ...fingerprint, mPlusTwoRelativeToM: mPlusTwo },
    resultKind: 'Calculated ideal natural-abundance neutral-composition envelope — not a measured mass spectrum',
    boundary: ORTHOGONAL_EVIDENCE_BOUNDARY.massData,
  });
}

const requireMassRun = (run) => {
  requireObject(run, 'run');
  if (!Number.isInteger(run.nominalMass) || !Array.isArray(run.envelope) || !run.fingerprint?.id) throw new Error('run must be an isotopologue envelope produced by calculateIsotopologueEnvelope.');
  return run;
};

const dimension = ({ learnerValue, expectedValue, learnerLabel, expectedLabel, reason }) => ({
  learnerValue,
  expectedValue,
  learnerLabel,
  expectedLabel,
  correct: learnerValue === expectedValue,
  reason,
});

export function evaluateMassEvidenceAttempt({ run, prediction }) {
  requireMassRun(run);
  requireObject(prediction, 'prediction');
  if (!Number.isInteger(prediction.nominalMass)) throw new Error('prediction.nominalMass must be an integer.');
  if (!MASS_FINGERPRINT_OPTIONS.some((option) => option.id === prediction.fingerprint)) throw new Error('prediction.fingerprint must be a declared fingerprint id.');
  if (!['formula-cannot-identify-isomer', 'identifies-constitutional-isomer'].includes(prediction.identityScope)) throw new Error('prediction.identityScope must be a declared scope choice.');
  const dimensions = {
    nominalMass: dimension({
      learnerValue: prediction.nominalMass,
      expectedValue: run.nominalMass,
      learnerLabel: `Nominal M ${prediction.nominalMass}`,
      expectedLabel: `Nominal M ${run.nominalMass}`,
      reason: `The major-isotope nominal mass is the sum of the displayed integer mass numbers for ${run.formula}.`,
    }),
    fingerprint: dimension({
      learnerValue: prediction.fingerprint,
      expectedValue: run.fingerprint.id,
      learnerLabel: MASS_FINGERPRINT_OPTIONS.find((item) => item.id === prediction.fingerprint).label,
      expectedLabel: run.fingerprint.label,
      reason: `The calculated M+2/M ratio is ${run.fingerprint.mPlusTwoRelativeToM.toFixed(1)}% in this ideal natural-abundance model.`,
    }),
    identityScope: dimension({
      learnerValue: prediction.identityScope,
      expectedValue: 'formula-cannot-identify-isomer',
      learnerLabel: prediction.identityScope === 'formula-cannot-identify-isomer' ? 'Formula cannot identify an isomer' : 'Envelope identifies a constitutional isomer',
      expectedLabel: 'Formula cannot identify an isomer',
      reason: 'Constitutional isomers with the same elemental composition have the same ideal molecular-ion isotopologue envelope in this model.',
    }),
  };
  const values = Object.values(dimensions);
  return deepFreeze({
    run,
    prediction: { ...prediction },
    dimensions,
    score: { correct: values.filter((item) => item.correct).length, total: values.length },
    allCorrect: values.every((item) => item.correct),
    boundary: ORTHOGONAL_EVIDENCE_BOUNDARY.identity,
  });
}

export function nextMassEvidenceHint({ run, level }) {
  requireMassRun(run);
  requireLevel(level);
  const m1 = run.envelope.find((bucket) => bucket.nominalOffset === 1)?.relativeToM ?? 0;
  const m2 = run.envelope.find((bucket) => bucket.nominalOffset === 2)?.relativeToM ?? 0;
  const messages = [
    { title: 'Read the declared instrument', detail: 'This flight tube calculates a neutral-composition natural-abundance envelope. It does not simulate an ion source or measured detector signal.' },
    { title: 'Count major isotopes', detail: `Build nominal M from the most abundant displayed isotope of every atom in ${run.formula}.` },
    { title: 'Compare +2 evidence', detail: `The ideal envelope gives M+1/M ${m1.toFixed(1)}% and M+2/M ${m2.toFixed(1)}%. A lone chlorine and a lone bromine leave different +2 patterns.` },
    { title: 'Keep the identity boundary', detail: `${run.formula} fixes this ideal envelope, so constitutional isomers sharing the formula remain tied.` },
  ];
  return deepFreeze({ level, ...messages[level - 1], mutation: 'No atom count, fired envelope, prediction, or audit was changed.' });
}

const IR_ROLE_BY_CASE = {
  'propanol-topology': 'shared-functional-class-does-not-decide',
  'carbonyl-terminus-orthogonal': 'independent-aldehydic-c-h-support',
  'acid-ester-orthogonal': 'independent-oh-support',
};

const IR_ROLE_LABELS = {
  'shared-functional-class-does-not-decide': 'Shared alcohol-class IR evidence does not decide this pair',
  'independent-aldehydic-c-h-support': 'Independent aldehydic C–H IR evidence supports propanal',
  'independent-oh-support': 'Independent O–H IR evidence supports butanoic acid',
  'certifies-identity': 'IR certifies the full compound identity',
};

export function analyzeOrthogonalCase({ caseId }) {
  const scenario = resolveCase(caseId);
  const unknownRecord = resolveRecord(scenario.unknownRecordId);
  const candidates = scenario.candidateIds.map(resolveRecord);
  const massPreset = MASS_EVIDENCE_PRESET_BY_ID[scenario.massPresetId];
  const massEnvelope = calculateIsotopologueEnvelope(massPreset.composition);
  const decisiveNmrFeature = ORTHOGONAL_NMR_FEATURE_BY_ID[scenario.decisiveNmrFeatureId];
  const irRole = IR_ROLE_BY_CASE[scenario.id];
  const evidenceMatrix = [
    { channel: 'Formula', verdict: 'tie', detail: `${scenario.formula} is shared by both declared candidates.` },
    { channel: 'IR', verdict: scenario.id === 'propanol-topology' ? 'class support' : 'independent support', detail: scenario.irRole },
    { channel: '¹H NMR', verdict: 'pair-deciding evidence', detail: decisiveNmrFeature.label },
    { channel: 'Ideal mass', verdict: 'tie', detail: `Both candidates share the calculated ${massEnvelope.fingerprint.label.toLowerCase()} envelope.` },
  ];
  return deepFreeze({
    case: scenario,
    unknownRecord,
    candidates,
    massPreset,
    massEnvelope,
    decisiveNmrFeature,
    evidenceMatrix,
    expected: {
      formulaSufficient: false,
      irRole,
      nmrFeatureId: scenario.decisiveNmrFeatureId,
      massDiscriminates: false,
      candidateId: unknownRecord.id,
    },
    resultKind: 'Declared two-candidate comparison across formula, IR role, measured proton peak list, and ideal isotope evidence',
    modelBoundary: ORTHOGONAL_EVIDENCE_BOUNDARY,
  });
}

export function evaluateOrthogonalCaseAttempt({ analysis, prediction }) {
  requireObject(analysis, 'analysis');
  if (!analysis.case?.id || ORTHOGONAL_EVIDENCE_CASE_BY_ID[analysis.case.id] !== analysis.case) throw new Error('analysis must be produced by analyzeOrthogonalCase.');
  requireObject(prediction, 'prediction');
  if (typeof prediction.formulaSufficient !== 'boolean') throw new Error('prediction.formulaSufficient must be boolean.');
  if (!IR_ROLE_LABELS[prediction.irRole]) throw new Error('prediction.irRole must be a declared IR-role choice.');
  if (!ORTHOGONAL_NMR_FEATURE_BY_ID[prediction.nmrFeatureId]) throw new Error('prediction.nmrFeatureId must be a declared NMR-feature id.');
  if (typeof prediction.massDiscriminates !== 'boolean') throw new Error('prediction.massDiscriminates must be boolean.');
  if (!analysis.candidates.some((candidate) => candidate.id === prediction.candidateId)) throw new Error('prediction.candidateId must identify a candidate in this case.');
  const expected = analysis.expected;
  const dimensions = {
    formula: dimension({
      learnerValue: prediction.formulaSufficient,
      expectedValue: expected.formulaSufficient,
      learnerLabel: prediction.formulaSufficient ? 'Formula decides the pair' : 'Formula leaves the pair tied',
      expectedLabel: 'Formula leaves the pair tied',
      reason: `Both candidates have ${analysis.case.formula}; a formula does not encode atom connectivity.`,
    }),
    ir: dimension({
      learnerValue: prediction.irRole,
      expectedValue: expected.irRole,
      learnerLabel: IR_ROLE_LABELS[prediction.irRole],
      expectedLabel: IR_ROLE_LABELS[expected.irRole],
      reason: analysis.case.irRole,
    }),
    nmr: dimension({
      learnerValue: prediction.nmrFeatureId,
      expectedValue: expected.nmrFeatureId,
      learnerLabel: ORTHOGONAL_NMR_FEATURE_BY_ID[prediction.nmrFeatureId].label,
      expectedLabel: analysis.decisiveNmrFeature.label,
      reason: `The measured ${analysis.unknownRecord.name} source list contains the declared pair-deciding proton evidence.`,
    }),
    mass: dimension({
      learnerValue: prediction.massDiscriminates,
      expectedValue: expected.massDiscriminates,
      learnerLabel: prediction.massDiscriminates ? 'Ideal mass decides the pair' : 'Ideal mass leaves the pair tied',
      expectedLabel: 'Ideal mass leaves the pair tied',
      reason: 'Both candidates have the same composition and therefore the same ideal natural-abundance molecular-ion envelope.',
    }),
    candidate: dimension({
      learnerValue: prediction.candidateId,
      expectedValue: expected.candidateId,
      learnerLabel: analysis.candidates.find((candidate) => candidate.id === prediction.candidateId).name,
      expectedLabel: analysis.unknownRecord.name,
      reason: `Inside this declared pair, the measured NMR feature and the stated independent IR role support ${analysis.unknownRecord.name}. This is not universal identity certification.`,
    }),
  };
  const values = Object.values(dimensions);
  return deepFreeze({
    analysis,
    prediction: { ...prediction },
    dimensions,
    score: { correct: values.filter((item) => item.correct).length, total: values.length },
    allCorrect: values.every((item) => item.correct),
    boundary: ORTHOGONAL_EVIDENCE_BOUNDARY.identity,
  });
}

export function nextOrthogonalCaseHint({ analysis, level }) {
  requireObject(analysis, 'analysis');
  if (!analysis.case?.id || ORTHOGONAL_EVIDENCE_CASE_BY_ID[analysis.case.id] !== analysis.case) throw new Error('analysis must be produced by analyzeOrthogonalCase.');
  requireLevel(level);
  const messages = [
    { title: 'Ask what each channel can know', detail: 'Formula counts atoms; IR supports selected bond classes; proton NMR reports selected magnetic environments; the ideal envelope reports isotope composition.' },
    { title: 'Find the tied channels', detail: `Both candidates share ${analysis.case.formula}. Formula and this ideal mass envelope cannot encode their different connectivity.` },
    { title: 'Use independent evidence', detail: analysis.case.irRole },
    { title: 'Open the measured NMR clue', detail: `${analysis.decisiveNmrFeature.label}. Within this declared pair, that supports ${analysis.unknownRecord.name}.` },
  ];
  return deepFreeze({ level, ...messages[level - 1], mutation: 'No evidence channel, claim, release, mass fire, or audit was changed.' });
}
