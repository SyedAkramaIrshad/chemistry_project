import {
  E2_STEREOCHEMISTRY_SCENARIO_BY_ID,
  MULTICENTRE_SCENARIO_BY_ID,
  SN2_STEREOCHEMISTRY_SCENARIO_BY_ID,
  STEREOCHEMICAL_REACTION_BOUNDARY,
  STEREOCHEMICAL_REACTION_CONSTANTS,
} from '../data/stereochemicalReactionScenarios.js';

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

const cloneValue = (value) => {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, cloneValue(nested)]));
  }
  return value;
};

const frozenCopy = (value) => deepFreeze(cloneValue(value));

const scenarioOrThrow = (lookup, scenarioId, family) => {
  const scenario = lookup[scenarioId];
  if (!scenario) throw new RangeError(`Unknown ${family} scenario: ${scenarioId}.`);
  return scenario;
};

const normalizeAngle = (angleDeg) => {
  const numeric = Number(angleDeg);
  if (!Number.isFinite(numeric)) return null;
  const wrapped = ((numeric % 360) + 360) % 360;
  if (Math.abs(wrapped - 180) < 1e-12) return numeric > 0 ? 180 : -180;
  const signed = wrapped > 180 ? wrapped - 360 : wrapped;
  return Math.abs(signed) < 1e-12 ? 0 : signed;
};

const distanceToAnti = (angleDeg) => 180 - Math.abs(angleDeg);
const alignmentIndex = (angleDeg) => (1 - Math.cos(angleDeg * Math.PI / 180)) / 2;

const predictionEvaluation = ({ expected, prediction, reasons }) => {
  const learnerPrediction = frozenCopy(prediction || {});
  const frozenExpected = frozenCopy(expected);
  const dimensions = deepFreeze(Object.keys(frozenExpected).map((key) => ({
    key,
    expected: frozenExpected[key],
    learner: learnerPrediction[key] ?? null,
    correct: learnerPrediction[key] === frozenExpected[key],
    reason: reasons[key],
  })));
  const correctCount = dimensions.filter(({ correct }) => correct).length;
  return deepFreeze({
    learnerPrediction,
    expected: frozenExpected,
    dimensions,
    correctCount,
    totalCount: dimensions.length,
    allCorrect: correctCount === dimensions.length,
  });
};

const normalizeHintLevel = (level) => Math.max(1, Math.min(4, Math.trunc(Number(level) || 1)));

const validateDescriptorPair = (pair) => Array.isArray(pair)
  && pair.length === 2
  && pair.every((descriptor) => descriptor === 'R' || descriptor === 'S');

const validateMulticentreState = (scenarioId, state) => {
  const scenario = scenarioOrThrow(MULTICENTRE_SCENARIO_BY_ID, scenarioId, 'multicentre');
  if (!state || state.scenarioId !== scenarioId || !validateDescriptorPair(state.specimenA) || !validateDescriptorPair(state.specimenB)) {
    throw new TypeError('Multicentre state must contain this scenario ID and two R/S descriptors for each specimen.');
  }
  return scenario;
};

const isMesoPair = (scenario, descriptors) => scenario.symmetricCentres && descriptors[0] !== descriptors[1];
const canonicalMulticentre = (scenario, descriptors) => isMesoPair(scenario, descriptors) ? 'meso' : descriptors.join('');
const chiralityFor = (scenario, descriptors) => isMesoPair(scenario, descriptors) ? 'achiral-meso' : 'chiral';
const oppositeDescriptor = (descriptor) => descriptor === 'R' ? 'S' : 'R';

export function createMulticentreState(scenarioId) {
  const scenario = scenarioOrThrow(MULTICENTRE_SCENARIO_BY_ID, scenarioId, 'multicentre');
  return deepFreeze({
    scenarioId,
    specimenA: [...scenario.initialSpecimenA],
    specimenB: [...scenario.initialSpecimenB],
  });
}

export function flipMulticentreDescriptor({ scenarioId, state, specimen, centreIndex }) {
  validateMulticentreState(scenarioId, state);
  if (specimen !== 'A' && specimen !== 'B') {
    return deepFreeze({ allowed: false, state, reason: 'Choose specimen A or B before flipping a declared centre.' });
  }
  if (!Number.isInteger(centreIndex) || centreIndex < 0 || centreIndex > 1) {
    return deepFreeze({ allowed: false, state, reason: 'Choose declared centre index 0 or 1.' });
  }
  const key = specimen === 'A' ? 'specimenA' : 'specimenB';
  const changed = [...state[key]];
  changed[centreIndex] = oppositeDescriptor(changed[centreIndex]);
  return deepFreeze({
    allowed: true,
    state: {
      scenarioId,
      specimenA: key === 'specimenA' ? changed : state.specimenA,
      specimenB: key === 'specimenB' ? changed : state.specimenB,
    },
    reason: `${specimen} ${MULTICENTRE_SCENARIO_BY_ID[scenarioId].centreLabels[centreIndex]} changed from ${state[key][centreIndex]} to ${changed[centreIndex]}. No other centre moved.`,
  });
}

export function analyzeMulticentreRelationship({ scenarioId, state }) {
  const scenario = validateMulticentreState(scenarioId, state);
  const differingCentreCount = state.specimenA.reduce(
    (count, descriptor, index) => count + Number(descriptor !== state.specimenB[index]),
    0,
  );
  const canonicalA = canonicalMulticentre(scenario, state.specimenA);
  const canonicalB = canonicalMulticentre(scenario, state.specimenB);
  const chiralityA = chiralityFor(scenario, state.specimenA);
  const chiralityB = chiralityFor(scenario, state.specimenB);
  const allDisplayedCentresInverted = state.specimenA.every(
    (descriptor, index) => oppositeDescriptor(descriptor) === state.specimenB[index],
  );

  let relationship = 'diastereomers';
  if (canonicalA === canonicalB) relationship = 'same';
  else if (allDisplayedCentresInverted) relationship = 'enantiomers';

  let mirrorTest = 'The specimens are stereoisomers but are not related as nonsuperposable mirror images.';
  if (relationship === 'enantiomers') mirrorTest = 'The declared configurations form nonsuperposable mirror images.';
  if (relationship === 'same' && canonicalA === 'meso') mirrorTest = 'The two drawings superpose through the declared internal symmetry: two displayed letters differ, but both are one meso stereoisomer.';
  if (relationship === 'same' && canonicalA !== 'meso') mirrorTest = 'The ordered declared configurations are identical and therefore superposable.';

  return deepFreeze({
    state,
    scenarioId,
    differingCentreCount,
    canonicalA,
    canonicalB,
    chiralityA,
    chiralityB,
    relationship,
    mirrorTest,
    symmetryReason: scenario.symmetryRationale,
    boundary: STEREOCHEMICAL_REACTION_BOUNDARY.multicentre,
  });
}

export function evaluateMulticentrePrediction({ analysis, prediction }) {
  if (!analysis || !analysis.state || !analysis.relationship) throw new TypeError('A released multicentre analysis is required.');
  const expected = {
    differingCentreCount: String(analysis.differingCentreCount),
    relationship: analysis.relationship,
    chiralityPair: `${analysis.chiralityA}|${analysis.chiralityB}`,
    scope: 'declared-two-centre',
  };
  return predictionEvaluation({
    expected,
    prediction,
    reasons: {
      differingCentreCount: `${analysis.differingCentreCount} displayed centre letter${analysis.differingCentreCount === 1 ? '' : 's'} differ in the ordered comparison.`,
      relationship: analysis.mirrorTest,
      chiralityPair: `A is ${analysis.chiralityA}; B is ${analysis.chiralityB}.`,
      scope: 'The result uses exactly two frozen local descriptors plus the cartridge’s declared symmetry flag.',
    },
  });
}

export function nextMulticentreHint({ analysis, level = 1 }) {
  if (!analysis || !analysis.state) throw new TypeError('A multicentre analysis is required for a hint.');
  const hintLevel = normalizeHintLevel(level);
  const messages = [
    `Compare C2 with C2 and C3 with C3 before deciding whether a mirror relationship is possible.`,
    `${analysis.differingCentreCount} displayed centre letter${analysis.differingCentreCount === 1 ? '' : 's'} differ. Keep that count separate from molecular identity.`,
    analysis.canonicalA === 'meso' || analysis.canonicalB === 'meso'
      ? 'The symmetric opposite R,S pattern carries a declared internal symmetry plane and canonicalizes to meso.'
      : `The canonical ordered displays are ${analysis.canonicalA} and ${analysis.canonicalB}.`,
    `${analysis.mirrorTest} This is still only a declared two-centre teaching comparison.`,
  ];
  return deepFreeze({ level: hintLevel, text: messages[hintLevel - 1], boundary: analysis.boundary });
}

const validateSn2State = (scenarioId, state) => {
  const scenario = scenarioOrThrow(SN2_STEREOCHEMISTRY_SCENARIO_BY_ID, scenarioId, 'SN2 stereochemistry');
  if (!state || state.scenarioId !== scenarioId || !Number.isFinite(state.approachAngleDeg)) {
    throw new TypeError('SN2 state must contain this scenario ID and a finite approach angle.');
  }
  return scenario;
};

export function createSn2StereoState(scenarioId) {
  const scenario = scenarioOrThrow(SN2_STEREOCHEMISTRY_SCENARIO_BY_ID, scenarioId, 'SN2 stereochemistry');
  return deepFreeze({ scenarioId, approachAngleDeg: scenario.initialApproachAngleDeg });
}

export function setSn2ApproachAngle({ scenarioId, state, angleDeg }) {
  validateSn2State(scenarioId, state);
  const normalized = normalizeAngle(angleDeg);
  if (normalized === null) return deepFreeze({ allowed: false, state, reason: 'Approach angle must be a finite number.' });
  return deepFreeze({
    allowed: true,
    state: { scenarioId, approachAngleDeg: normalized },
    reason: `The incoming puck moved to ${normalized}°. No geometry or descriptor was released.`,
  });
}

export function analyzeSn2Stereo({ scenarioId, state }) {
  const scenario = validateSn2State(scenarioId, state);
  const approachAngleDeg = normalizeAngle(state.approachAngleDeg);
  const backsideDistanceDeg = distanceToAnti(approachAngleDeg);
  const gateAllowed = backsideDistanceDeg <= STEREOCHEMICAL_REACTION_CONSTANTS.sn2BacksideToleranceDeg + 1e-12;
  const approachClass = gateAllowed ? 'backside-aligned' : Math.abs(approachAngleDeg) <= 15 ? 'frontside' : 'oblique';
  const gateReason = gateAllowed
    ? `${approachAngleDeg}° lies ${backsideDistanceDeg}° from the backside axis and inside the declared 15° aperture.`
    : approachClass === 'frontside'
      ? `${approachAngleDeg}° approaches from the leaving-group side. The displayed backside inversion shutter remains closed.`
      : `${approachAngleDeg}° is ${backsideDistanceDeg}° from the backside axis, outside the declared 15° aperture.`;
  return deepFreeze({
    state,
    scenarioId,
    approachAngleDeg,
    approachClass,
    backsideDistanceDeg,
    alignmentIndex: alignmentIndex(approachAngleDeg),
    gateStatus: gateAllowed ? 'allowed' : 'blocked',
    gateReason,
    initialDescriptor: scenario.initialDescriptor,
    productDescriptor: scenario.productDescriptor,
    geometryOutcome: scenario.geometryOutcome,
    descriptorRelation: scenario.descriptorRelation,
    descriptorReason: scenario.descriptorReason,
    priorityRibbon: scenario.priorityRibbon,
    product: null,
    boundary: STEREOCHEMICAL_REACTION_BOUNDARY.sn2,
  });
}

export function commitSn2Stereo({ scenarioId, state }) {
  const scenario = validateSn2State(scenarioId, state);
  const analysis = analyzeSn2Stereo({ scenarioId, state });
  if (analysis.gateStatus !== 'allowed') {
    return deepFreeze({ ...analysis, committed: false, product: null, reason: analysis.gateReason });
  }
  return deepFreeze({
    ...analysis,
    committed: true,
    product: {
      geometryOutcome: scenario.geometryOutcome,
      relativeConfiguration: 'inverted',
      initialDescriptor: scenario.initialDescriptor,
      productDescriptor: scenario.productDescriptor,
      descriptorRelation: scenario.descriptorRelation,
      descriptorReason: scenario.descriptorReason,
      positionMap: scenario.positionMap,
    },
    reason: `The backside aperture is open: relative geometry inverts. ${scenario.descriptorReason}`,
  });
}

export function evaluateSn2Prediction({ analysis, prediction }) {
  if (!analysis || !analysis.state || !analysis.approachClass) throw new TypeError('A current SN2 analysis is required.');
  const expected = {
    approachClass: analysis.approachClass,
    productRelease: analysis.gateStatus === 'allowed' ? 'released' : 'blocked',
    geometryOutcome: analysis.geometryOutcome,
    descriptorRelation: analysis.descriptorRelation,
  };
  return predictionEvaluation({
    expected,
    prediction,
    reasons: {
      approachClass: analysis.gateReason,
      productRelease: analysis.gateStatus === 'allowed' ? 'The declared backside aperture permits this teaching frame.' : 'No product is released outside the declared backside aperture.',
      geometryOutcome: 'Every supported cartridge in this instrument declares relative tetrahedral inversion.',
      descriptorRelation: analysis.descriptorReason,
    },
  });
}

export function nextSn2StereoHint({ analysis, level = 1 }) {
  if (!analysis || !analysis.state) throw new TypeError('An SN2 analysis is required for a hint.');
  const hintLevel = normalizeHintLevel(level);
  const messages = [
    `The leaving-group axis is 0°; the ideal backside axis is ±180°.`,
    `Your puck is ${analysis.backsideDistanceDeg}° from backside and has alignment index ${analysis.alignmentIndex.toFixed(3)}.`,
    analysis.gateStatus === 'allowed'
      ? 'This angle is inside the declared 15° aperture, so the inversion frame can be opened explicitly.'
      : 'Move within 15° of ±180° if you want to test the displayed concerted inversion path.',
    `Relative geometry is ${analysis.geometryOutcome}; the absolute descriptor relation is ${analysis.descriptorRelation}. ${analysis.descriptorReason}`,
  ];
  return deepFreeze({ level: hintLevel, text: messages[hintLevel - 1], boundary: analysis.boundary });
}

const validateE2State = (scenarioId, state) => {
  const scenario = scenarioOrThrow(E2_STEREOCHEMISTRY_SCENARIO_BY_ID, scenarioId, 'E2 stereochemistry');
  if (!state || state.scenarioId !== scenarioId || !Number.isFinite(state.rearRotationDeg)) {
    throw new TypeError('E2 state must contain this scenario ID and a finite rear-carbon rotation.');
  }
  if (state.selectedHydrogenId !== null && !scenario.channels.some(({ id }) => id === state.selectedHydrogenId)) {
    throw new TypeError('E2 state contains a beta-hydrogen channel outside this cartridge.');
  }
  return scenario;
};

const torsionRangeFor = (angleDeg) => {
  const absolute = Math.abs(angleDeg);
  const range = STEREOCHEMICAL_REACTION_CONSTANTS.torsionRanges.find(({ minimumDeg, maximumDeg, maximumInclusive }) => (
    absolute >= minimumDeg && (absolute < maximumDeg || (maximumInclusive && absolute <= maximumDeg))
  ));
  return range?.id || 'outside-declared-range';
};

export function createE2StereoState(scenarioId) {
  const scenario = scenarioOrThrow(E2_STEREOCHEMISTRY_SCENARIO_BY_ID, scenarioId, 'E2 stereochemistry');
  return deepFreeze({ scenarioId, rearRotationDeg: scenario.initialRearRotationDeg, selectedHydrogenId: null });
}

export function setE2RearRotation({ scenarioId, state, angleDeg }) {
  const scenario = validateE2State(scenarioId, state);
  const normalized = normalizeAngle(angleDeg);
  if (normalized === null) return deepFreeze({ allowed: false, state, reason: 'Rear-carbon rotation must be a finite angle.' });
  if (scenario.rotationLocked) return deepFreeze({ allowed: false, state, reason: scenario.lockedReason });
  return deepFreeze({
    allowed: true,
    state: { scenarioId, rearRotationDeg: normalized, selectedHydrogenId: state.selectedHydrogenId },
    reason: `The rear carbon rotated to ${normalized}°. The selected beta H did not change.`,
  });
}

export function selectE2BetaHydrogen({ scenarioId, state, hydrogenId }) {
  const scenario = validateE2State(scenarioId, state);
  const channel = scenario.channels.find(({ id }) => id === hydrogenId);
  if (!channel) return deepFreeze({ allowed: false, state, reason: 'Choose a beta hydrogen declared on this cartridge.' });
  return deepFreeze({
    allowed: true,
    state: { scenarioId, rearRotationDeg: state.rearRotationDeg, selectedHydrogenId: channel.id },
    reason: `${channel.label} is selected. The rear carbon remains at ${state.rearRotationDeg}° until you rotate it.`,
  });
}

export function analyzeE2Stereo({ scenarioId, state }) {
  const scenario = validateE2State(scenarioId, state);
  const channel = scenario.channels.find(({ id }) => id === state.selectedHydrogenId) || null;
  if (!channel) {
    return deepFreeze({
      state,
      scenarioId,
      selectedHydrogenId: null,
      selectedHydrogenLabel: null,
      rearRotationDeg: state.rearRotationDeg,
      torsionAngleDeg: null,
      absoluteTorsionDeg: null,
      iupacRange: 'not-selected',
      distanceToAntiperiplanarDeg: null,
      alignmentIndex: null,
      gateStatus: 'blocked',
      gateReason: 'Select one declared beta hydrogen before testing the H–C–C–LG torsion.',
      declaredProductDescriptor: null,
      declaredProductNotation: null,
      product: null,
      boundary: STEREOCHEMICAL_REACTION_BOUNDARY.e2,
    });
  }

  const torsionAngleDeg = normalizeAngle(state.rearRotationDeg + channel.offsetDeg);
  const distanceToAntiperiplanarDeg = distanceToAnti(torsionAngleDeg);
  const insideAngularGate = distanceToAntiperiplanarDeg <= STEREOCHEMICAL_REACTION_CONSTANTS.e2AntiperiplanarToleranceDeg + 1e-12;
  const gateAllowed = insideAngularGate && !scenario.rotationLocked;
  const gateReason = scenario.rotationLocked
    ? scenario.lockedReason
    : gateAllowed
      ? `${channel.label} is ${distanceToAntiperiplanarDeg}° from anti and inside the declared 15° antiperiplanar gate.`
      : `${channel.label} is ${distanceToAntiperiplanarDeg}° from anti and outside the declared 15° antiperiplanar gate.`;
  return deepFreeze({
    state,
    scenarioId,
    selectedHydrogenId: channel.id,
    selectedHydrogenLabel: channel.label,
    rearRotationDeg: state.rearRotationDeg,
    torsionAngleDeg,
    absoluteTorsionDeg: Math.abs(torsionAngleDeg),
    iupacRange: torsionRangeFor(torsionAngleDeg),
    distanceToAntiperiplanarDeg,
    alignmentIndex: alignmentIndex(torsionAngleDeg),
    gateStatus: gateAllowed ? 'allowed' : 'blocked',
    gateReason,
    declaredProductDescriptor: channel.productDescriptor,
    declaredProductNotation: channel.productNotation,
    product: null,
    boundary: STEREOCHEMICAL_REACTION_BOUNDARY.e2,
  });
}

export function commitE2Stereo({ scenarioId, state }) {
  const scenario = validateE2State(scenarioId, state);
  const analysis = analyzeE2Stereo({ scenarioId, state });
  if (analysis.gateStatus !== 'allowed') {
    return deepFreeze({ ...analysis, committed: false, product: null, reason: analysis.gateReason });
  }
  return deepFreeze({
    ...analysis,
    committed: true,
    product: {
      productDescriptor: analysis.declaredProductDescriptor,
      productNotation: analysis.declaredProductNotation,
      selectedHydrogenId: analysis.selectedHydrogenId,
      torsionAngleDeg: analysis.torsionAngleDeg,
      electronRibbons: scenario.electronRibbons,
      scope: 'declared-local-e-z-consequence',
    },
    reason: `The selected H–C–C–LG torsion is inside the antiperiplanar gate. All three declared electron-pair ribbons may move together into the local ${analysis.declaredProductDescriptor} frame.`,
  });
}

export function evaluateE2Prediction({ analysis, prediction }) {
  if (!analysis || !analysis.state || !analysis.gateStatus) throw new TypeError('A current E2 analysis is required.');
  const expected = {
    torsionRange: analysis.iupacRange,
    gatePermission: analysis.gateStatus,
    productResult: analysis.gateStatus === 'allowed' ? analysis.declaredProductDescriptor : 'no-product',
    scope: 'geometry-only',
  };
  return predictionEvaluation({
    expected,
    prediction,
    reasons: {
      torsionRange: analysis.torsionAngleDeg === null ? analysis.gateReason : `${analysis.torsionAngleDeg}° lies in the ${analysis.iupacRange} range.`,
      gatePermission: analysis.gateReason,
      productResult: analysis.gateStatus === 'allowed' ? `The declared ${analysis.declaredProductDescriptor} channel can be released at this geometry.` : 'No product frame is exposed outside the selected declared geometry gate.',
      scope: 'This gate reports only a local stereoelectronic prerequisite; it does not calculate rate, yield, occurrence, regioselectivity, or product ratio.',
    },
  });
}

export function nextE2StereoHint({ analysis, level = 1 }) {
  if (!analysis || !analysis.state) throw new TypeError('An E2 analysis is required for a hint.');
  const hintLevel = normalizeHintLevel(level);
  const messages = analysis.selectedHydrogenId === null ? [
    'Begin by choosing one declared beta hydrogen; selection and rear-carbon rotation are independent actions.',
    'The H–C–C–LG torsion cannot be named until a beta-H channel is selected.',
    'After selecting H, compare its rear offset plus the current rear-carbon rotation with ±180°.',
    'No beta H is selected, so the product shutter must remain closed.',
  ] : [
    `The selected ${analysis.selectedHydrogenLabel} has H–C–C–LG torsion ${analysis.torsionAngleDeg}° in the ${analysis.iupacRange} range.`,
    `It is ${analysis.distanceToAntiperiplanarDeg}° from anti; the local alignment index is ${analysis.alignmentIndex.toFixed(3)}.`,
    analysis.gateStatus === 'allowed'
      ? 'The selected channel lies within 15° of antiperiplanar and can be committed explicitly.'
      : 'Rotate the free rear carbon until this selected H lies within 15° of ±180°; selecting another H does not rotate it.',
    analysis.gateStatus === 'allowed'
      ? `This frozen channel exposes the local ${analysis.declaredProductDescriptor} frame, but no rate, yield, or product ratio.`
      : `${analysis.gateReason} No product frame is released.`,
  ];
  return deepFreeze({ level: hintLevel, text: messages[hintLevel - 1], boundary: analysis.boundary });
}
