import {
  INTERACTION_ENTITY_BY_ID,
  INTERACTION_FAMILIES,
  INTERACTION_PAIR_BY_ID,
  INTERMOLECULAR_MODEL_BOUNDARY,
  SOLVATION_SHELL_BY_ID,
} from '../data/intermolecularScenarios.js';

const PAIR_ENTITY_KEYS = Object.freeze(['a', 'b']);
const PAIR_ORIENTATION_PREDICTIONS = Object.freeze([
  'opposite-electrostatic-ends-face',
  'same-electrostatic-ends-face',
  'orientation-not-specific-in-this-model',
]);
const COVALENT_CHANGE_PREDICTIONS = Object.freeze(['none', 'bond-formed', 'bond-broken']);
const SHELL_ORIENTATIONS = Object.freeze(['oxygen-in', 'hydrogen-in']);
const SHELL_ENDS = Object.freeze(['oxygen', 'hydrogen']);

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
};

const frozen = (value) => deepFreeze(value);

const pairScenario = (scenarioId) => {
  const scenario = INTERACTION_PAIR_BY_ID[scenarioId];
  if (!scenario) throw new Error(`Unknown pair scenario: ${scenarioId}`);
  return scenario;
};

const shellScenario = (scenarioId) => {
  const scenario = SOLVATION_SHELL_BY_ID[scenarioId];
  if (!scenario) throw new Error(`Unknown solvation scenario: ${scenarioId}`);
  return scenario;
};

const entityFor = (scenario, entityKey) => {
  if (!PAIR_ENTITY_KEYS.includes(entityKey)) throw new Error(`Unknown pair entity key: ${entityKey}`);
  return INTERACTION_ENTITY_BY_ID[entityKey === 'a' ? scenario.entityAId : scenario.entityBId];
};

const normalizeRotation = (angle) => {
  if (!Number.isFinite(angle)) throw new Error('Rotation must be a finite angle.');
  return ((angle + 180) % 360 + 360) % 360 - 180;
};

const angularDistance = (left, right) => Math.abs((((left - right) + 540) % 360) - 180);

const siteFor = (scenario, entityKey, siteId) => {
  const site = entityFor(scenario, entityKey).sites.find((candidate) => candidate.id === siteId);
  if (!site) throw new Error(`Unknown site ${siteId} for entity ${entityKey} in ${scenario.id}.`);
  return site;
};

const validateBridge = (scenario, bridge) => {
  if (bridge === null) return;
  if (!bridge || typeof bridge !== 'object') throw new Error('Pair bridge must be null or a bridge record.');
  const contact = scenario.validContacts.find((candidate) => candidate.id === bridge.contactId);
  if (!contact) throw new Error(`Unknown bridge contact ${bridge.contactId} for ${scenario.id}.`);
  if (
    bridge.familyId !== contact.familyId
    || bridge.aSiteId !== contact.aSiteId
    || bridge.bSiteId !== contact.bSiteId
  ) throw new Error('Bridge record does not match its declared contact.');
};

const validatePairState = (scenarioId, state) => {
  const scenario = pairScenario(scenarioId);
  if (!state || typeof state !== 'object' || state.scenarioId !== scenarioId) {
    throw new Error(`Pair state does not belong to ${scenarioId}.`);
  }
  for (const key of PAIR_ENTITY_KEYS) {
    normalizeRotation(state.rotationsDeg?.[key]);
    const selected = state.selectedSites?.[key];
    if (typeof selected !== 'string') throw new Error(`Pair selection ${key} must be a site id or an empty string.`);
    if (selected) siteFor(scenario, key, selected);
  }
  validateBridge(scenario, state.bridge);
  return scenario;
};

const createFrozenPairState = ({ scenarioId, rotationsDeg, selectedSites, bridge }) => frozen({
  scenarioId,
  rotationsDeg: { a: normalizeRotation(rotationsDeg.a), b: normalizeRotation(rotationsDeg.b) },
  selectedSites: { a: selectedSites.a, b: selectedSites.b },
  bridge,
});

const worldDirection = (site, rotationDeg) => normalizeRotation(site.directionDeg + rotationDeg);

const alignmentForContact = (scenario, state, contact) => {
  const aSite = siteFor(scenario, 'a', contact.aSiteId);
  const bSite = siteFor(scenario, 'b', contact.bSiteId);
  const aWorldDirectionDeg = worldDirection(aSite, state.rotationsDeg.a);
  const bWorldDirectionDeg = worldDirection(bSite, state.rotationsDeg.b);
  const aErrorDeg = aSite.orientationFree ? 0 : angularDistance(aWorldDirectionDeg, 0);
  const bErrorDeg = bSite.orientationFree ? 0 : angularDistance(bWorldDirectionDeg, 180);
  const maximumErrorDeg = Math.max(aErrorDeg, bErrorDeg);
  return frozen({
    aWorldDirectionDeg,
    bWorldDirectionDeg,
    aTargetDeg: 0,
    bTargetDeg: 180,
    aErrorDeg,
    bErrorDeg,
    maximumErrorDeg,
    toleranceDeg: contact.alignmentToleranceDeg,
    aligned: maximumErrorDeg <= contact.alignmentToleranceDeg,
    orientationFree: aSite.orientationFree && bSite.orientationFree,
  });
};

const outcome = (status, title, reason, evidence = null) => frozen({ status, title, reason, evidence });

export function createPairInteractionState(scenarioId) {
  const scenario = pairScenario(scenarioId);
  return createFrozenPairState({
    scenarioId,
    rotationsDeg: scenario.defaultRotationsDeg,
    selectedSites: { a: '', b: '' },
    bridge: null,
  });
}

export function rotatePairEntity({ scenarioId, state, entityKey, rotationDeg }) {
  validatePairState(scenarioId, state);
  if (!PAIR_ENTITY_KEYS.includes(entityKey)) throw new Error(`Unknown pair entity key: ${entityKey}`);
  const normalized = normalizeRotation(rotationDeg);
  if (normalized === state.rotationsDeg[entityKey]) return state;
  return createFrozenPairState({
    scenarioId,
    rotationsDeg: { ...state.rotationsDeg, [entityKey]: normalized },
    selectedSites: state.selectedSites,
    bridge: state.bridge,
  });
}

export function selectPairSite({ scenarioId, state, entityKey, siteId }) {
  const scenario = validatePairState(scenarioId, state);
  siteFor(scenario, entityKey, siteId);
  const nextSiteId = state.selectedSites[entityKey] === siteId ? '' : siteId;
  return createFrozenPairState({
    scenarioId,
    rotationsDeg: state.rotationsDeg,
    selectedSites: { ...state.selectedSites, [entityKey]: nextSiteId },
    bridge: state.bridge,
  });
}

export function attemptPairInteraction({ scenarioId, state, familyId }) {
  const scenario = validatePairState(scenarioId, state);
  const family = INTERACTION_FAMILIES[familyId];
  if (!family) throw new Error(`Unknown interaction family: ${familyId}`);
  if (state.bridge) {
    return frozen({
      changed: false,
      state,
      outcome: outcome(
        'bridge-present',
        'One bridge is already committed.',
        'Break the displayed interaction yourself before attempting another one. Rotation alone will not remove it.',
      ),
    });
  }
  if (!state.selectedSites.a || !state.selectedSites.b) {
    const missing = [!state.selectedSites.a ? 'left entity' : null, !state.selectedSites.b ? 'right entity' : null].filter(Boolean);
    return frozen({
      changed: false,
      state,
      outcome: outcome(
        'missing-selection',
        'Choose both contact sites.',
        `Select one site on the ${missing.join(' and the ')}. Nothing was formed automatically.`,
      ),
    });
  }
  const contact = scenario.validContacts.find((candidate) => (
    candidate.familyId === familyId
    && candidate.aSiteId === state.selectedSites.a
    && candidate.bSiteId === state.selectedSites.b
  ));
  if (!contact) {
    const aSite = siteFor(scenario, 'a', state.selectedSites.a);
    const bSite = siteFor(scenario, 'b', state.selectedSites.b);
    const familyContext = scenario.familiesPresent.includes(familyId)
      ? `${family.name} is present in this scenario, but not through this pair of declared sites.`
      : `${family.name} is not in this scenario's declared family inventory.`;
    return frozen({
      changed: false,
      state,
      outcome: outcome(
        'unsupported-contact',
        'Those sites do not make that interaction here.',
        `${familyContext} You selected ${aSite.label} and ${bSite.label}; keep them visible and compare their roles.`,
        { aRole: aSite.role, bRole: bSite.role, familyId },
      ),
    });
  }
  const alignment = alignmentForContact(scenario, state, contact);
  if (!alignment.aligned) {
    return frozen({
      changed: false,
      state,
      outcome: outcome(
        'misaligned',
        'Compatible sites, wrong orientation.',
        `The larger port error is ${alignment.maximumErrorDeg.toFixed(1)}°; this declared contact allows ${alignment.toleranceDeg}°. Rotate the entities yourself and try again.`,
        alignment,
      ),
    });
  }
  const bridge = frozen({
    contactId: contact.id,
    familyId,
    aSiteId: contact.aSiteId,
    bSiteId: contact.bSiteId,
    rotationsAtCommit: { ...state.rotationsDeg },
  });
  const nextState = createFrozenPairState({
    scenarioId,
    rotationsDeg: state.rotationsDeg,
    selectedSites: state.selectedSites,
    bridge,
  });
  return frozen({
    changed: true,
    state: nextState,
    outcome: outcome(
      'formed',
      `${family.name} bridge committed.`,
      `${contact.explanation} The displayed bridge is noncovalent; no atom, formal charge, or covalent bond changed.`,
      alignment,
    ),
  });
}

export function breakPairInteraction({ scenarioId, state }) {
  validatePairState(scenarioId, state);
  if (!state.bridge) {
    return frozen({
      changed: false,
      state,
      outcome: outcome('no-bridge', 'There is no bridge to break.', 'Selections and rotations remain available for your next attempt.'),
    });
  }
  const family = INTERACTION_FAMILIES[state.bridge.familyId];
  const nextState = createFrozenPairState({
    scenarioId,
    rotationsDeg: state.rotationsDeg,
    selectedSites: state.selectedSites,
    bridge: null,
  });
  return frozen({
    changed: true,
    state: nextState,
    outcome: outcome(
      'broken',
      `${family.name} bridge removed.`,
      'You cleaved only the displayed noncovalent bridge. Both entities, their covalent bonds, your site choices, and their rotations remain unchanged.',
    ),
  });
}

const referenceRotationFor = (scenario, contact, entityKey) => {
  if (contact.referenceRotationsDeg && Number.isFinite(contact.referenceRotationsDeg[entityKey])) {
    return contact.referenceRotationsDeg[entityKey];
  }
  const site = siteFor(scenario, entityKey, entityKey === 'a' ? contact.aSiteId : contact.bSiteId);
  if (site.orientationFree) return scenario.defaultRotationsDeg[entityKey];
  const target = entityKey === 'a' ? 0 : 180;
  return target - site.directionDeg;
};

export function createPairAlignmentReference(scenarioId, contactId) {
  const scenario = pairScenario(scenarioId);
  const contact = scenario.validContacts.find((candidate) => candidate.id === contactId);
  if (!contact) throw new Error(`Unknown contact ${contactId} for ${scenarioId}.`);
  return createFrozenPairState({
    scenarioId,
    rotationsDeg: {
      a: referenceRotationFor(scenario, contact, 'a'),
      b: referenceRotationFor(scenario, contact, 'b'),
    },
    selectedSites: { a: contact.aSiteId, b: contact.bSiteId },
    bridge: null,
  });
}

export function analyzePairInteraction({ scenarioId, state }) {
  const scenario = validatePairState(scenarioId, state);
  const entityA = entityFor(scenario, 'a');
  const entityB = entityFor(scenario, 'b');
  const selectedA = state.selectedSites.a ? siteFor(scenario, 'a', state.selectedSites.a) : null;
  const selectedB = state.selectedSites.b ? siteFor(scenario, 'b', state.selectedSites.b) : null;
  const matchedContact = selectedA && selectedB
    ? scenario.validContacts.find((contact) => contact.aSiteId === selectedA.id && contact.bSiteId === selectedB.id) ?? null
    : null;
  const alignment = matchedContact ? alignmentForContact(scenario, state, matchedContact) : null;
  let bridge = { status: 'none', record: null, contact: null, alignment: null };
  if (state.bridge) {
    const bridgeContact = scenario.validContacts.find((contact) => contact.id === state.bridge.contactId);
    const bridgeAlignment = alignmentForContact(scenario, state, bridgeContact);
    bridge = {
      status: bridgeAlignment.aligned ? 'aligned' : 'strained',
      record: state.bridge,
      contact: bridgeContact,
      alignment: bridgeAlignment,
    };
  }
  return frozen({
    scenario,
    entities: { a: entityA, b: entityB },
    families: scenario.familiesPresent.map((familyId) => INTERACTION_FAMILIES[familyId]),
    focusFamily: INTERACTION_FAMILIES[scenario.focusFamilyId],
    selected: { a: selectedA, b: selectedB },
    matchedContact,
    alignment,
    bridge,
    modelBoundary: INTERMOLECULAR_MODEL_BOUNDARY,
  });
}

const sameSet = (left, right) => {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return leftSet.size === rightSet.size && [...leftSet].every((value) => rightSet.has(value));
};

export function evaluatePairPrediction({ scenarioId, prediction }) {
  const scenario = pairScenario(scenarioId);
  if (!prediction || !Array.isArray(prediction.families)) throw new Error('Pair prediction must include a family array.');
  for (const familyId of prediction.families) {
    if (!INTERACTION_FAMILIES[familyId]) throw new Error(`Unknown predicted interaction family: ${familyId}`);
  }
  if (!PAIR_ORIENTATION_PREDICTIONS.includes(prediction.orientation)) throw new Error('Unsupported pair orientation prediction.');
  if (!COVALENT_CHANGE_PREDICTIONS.includes(prediction.covalentChange)) throw new Error('Unsupported covalent-change prediction.');
  const expectedOrientation = scenario.id === 'methane-methane'
    ? 'orientation-not-specific-in-this-model'
    : 'opposite-electrostatic-ends-face';
  const learnerPrediction = {
    families: [...prediction.families],
    orientation: prediction.orientation,
    covalentChange: prediction.covalentChange,
  };
  const dimensions = {
    families: {
      correct: sameSet(prediction.families, scenario.familiesPresent),
      expected: [...scenario.familiesPresent],
      reason: `This frozen pair carries ${scenario.familiesPresent.map((id) => INTERACTION_FAMILIES[id].name).join(', ')}.`,
    },
    orientation: {
      correct: prediction.orientation === expectedOrientation,
      expected: expectedOrientation,
      reason: expectedOrientation === 'orientation-not-specific-in-this-model'
        ? 'The implemented dispersion-only contact uses orientation-free cloud ports.'
        : 'The declared electrostatic contact requires oppositely signed ends to face.',
    },
    covalentChange: {
      correct: prediction.covalentChange === 'none',
      expected: 'none',
      reason: 'A displayed intermolecular bridge changes no covalent connectivity.',
    },
  };
  return frozen({
    learnerPrediction,
    dimensions,
    correct: Object.values(dimensions).every((dimension) => dimension.correct),
  });
}

const hintLevel = (level) => {
  if (!Number.isInteger(level) || level < 1 || level > 4) throw new Error('Hint level must be an integer from 1 through 4.');
  return level;
};

export function nextPairInteractionHint({ scenarioId, state, level }) {
  const scenario = validatePairState(scenarioId, state);
  hintLevel(level);
  const analysis = analyzePairInteraction({ scenarioId, state });
  const entityA = analysis.entities.a;
  const entityB = analysis.entities.b;
  const focusContacts = scenario.validContacts.filter((contact) => contact.familyId === scenario.focusFamilyId);
  const hints = [
    {
      title: 'Inventory the entities',
      detail: `${entityA.formula}: ${entityA.permanentDipole ? 'permanent dipole' : 'no declared permanent dipole'}, ${entityA.polarizable ? 'polarizable' : 'not assigned a polarizable cloud here'}; ${entityB.formula}: ${entityB.permanentDipole ? 'permanent dipole' : 'no declared permanent dipole'}, ${entityB.polarizable ? 'polarizable' : 'not assigned a polarizable cloud here'}.`,
    },
    {
      title: 'Keep every applicable family',
      detail: `The full declared set is ${scenario.familiesPresent.map((id) => INTERACTION_FAMILIES[id].name).join(' + ')}. A polar pair does not lose London dispersion.`,
    },
    {
      title: 'Match declared site roles',
      detail: `${INTERACTION_FAMILIES[scenario.focusFamilyId].siteRule} Compatible focus ports here include ${focusContacts.map((contact) => `${siteFor(scenario, 'a', contact.aSiteId).label} ↔ ${siteFor(scenario, 'b', contact.bSiteId).label}`).join(' or ')}.`,
    },
    {
      title: 'Read the angular gate',
      detail: analysis.alignment
        ? `Your selected ports have ${analysis.alignment.aErrorDeg.toFixed(1)}° and ${analysis.alignment.bErrorDeg.toFixed(1)}° error; the matched contact allows ${analysis.alignment.toleranceDeg}°. Rotate without expecting the app to form or break anything for you.`
        : 'Select one declared site on each entity. The left port must face 0° and the right port 180° unless a selected port is explicitly orientation-free.',
    },
  ];
  return frozen({ level, ...hints[level - 1] });
}

const validateSolvationState = (scenarioId, state) => {
  const scenario = shellScenario(scenarioId);
  if (!state || typeof state !== 'object' || state.scenarioId !== scenarioId) {
    throw new Error(`Solvation state does not belong to ${scenarioId}.`);
  }
  for (const slot of scenario.slots) {
    if (!SHELL_ORIENTATIONS.includes(state.orientationBySlot?.[slot.id])) {
      throw new Error(`Unsupported orientation for shell slot ${slot.id}.`);
    }
  }
  return scenario;
};

const createFrozenShellState = ({ scenarioId, orientationBySlot }) => frozen({
  scenarioId,
  orientationBySlot: { ...orientationBySlot },
});

export function createSolvationShellState(scenarioId) {
  const scenario = shellScenario(scenarioId);
  return createFrozenShellState({
    scenarioId,
    orientationBySlot: Object.fromEntries(
      scenario.slots.map((slot, index) => [slot.id, index % 2 === 0 ? 'oxygen-in' : 'hydrogen-in']),
    ),
  });
}

export function toggleWaterCompass({ scenarioId, state, slotId }) {
  const scenario = validateSolvationState(scenarioId, state);
  if (!scenario.slots.some((slot) => slot.id === slotId)) throw new Error(`Unknown shell slot: ${slotId}`);
  const current = state.orientationBySlot[slotId];
  return createFrozenShellState({
    scenarioId,
    orientationBySlot: {
      ...state.orientationBySlot,
      [slotId]: current === 'oxygen-in' ? 'hydrogen-in' : 'oxygen-in',
    },
  });
}

export function createSolvationReference(scenarioId) {
  const scenario = shellScenario(scenarioId);
  const expectedOrientation = `${scenario.expectedInwardEnd}-in`;
  return createFrozenShellState({
    scenarioId,
    orientationBySlot: Object.fromEntries(scenario.slots.map((slot) => [slot.id, expectedOrientation])),
  });
}

export function analyzeSolvationShell({ scenarioId, state }) {
  const scenario = validateSolvationState(scenarioId, state);
  const ion = INTERACTION_ENTITY_BY_ID[scenario.ionEntityId];
  const expectedOrientation = `${scenario.expectedInwardEnd}-in`;
  const slots = scenario.slots.map((slot) => ({
    ...slot,
    orientation: state.orientationBySlot[slot.id],
    inwardEnd: state.orientationBySlot[slot.id] === 'oxygen-in' ? 'oxygen' : 'hydrogen',
    correct: state.orientationBySlot[slot.id] === expectedOrientation,
  }));
  const correctCount = slots.filter((slot) => slot.correct).length;
  return frozen({
    scenario,
    ion,
    ionCharge: ion.netCharge,
    expectedInwardEnd: scenario.expectedInwardEnd,
    expectedOrientation,
    slots,
    correctCount,
    incorrectCount: slots.length - correctCount,
    boundary: scenario.boundary,
    modelBoundary: INTERMOLECULAR_MODEL_BOUNDARY.shell,
  });
}

export function evaluateSolvationPrediction({ scenarioId, prediction }) {
  const scenario = shellScenario(scenarioId);
  if (!prediction || !SHELL_ENDS.includes(prediction.favoredEnd)) throw new Error('Unsupported favored water-end prediction.');
  if (typeof prediction.correctlyOrientedCount !== 'string' || !/^[0-6]$/.test(prediction.correctlyOrientedCount)) {
    throw new Error('Correctly oriented count must be raw text from 0 through 6.');
  }
  const learnerPrediction = {
    favoredEnd: prediction.favoredEnd,
    correctlyOrientedCount: prediction.correctlyOrientedCount,
  };
  const dimensions = {
    favoredEnd: {
      correct: prediction.favoredEnd === scenario.expectedInwardEnd,
      expected: scenario.expectedInwardEnd,
      reason: scenario.expectedInwardEnd === 'oxygen'
        ? 'The declared δ− oxygen end faces the positive ion.'
        : 'A declared δ+ hydrogen end faces the negative ion.',
    },
    correctlyOrientedCount: {
      correct: prediction.correctlyOrientedCount === '6',
      expected: '6',
      reason: 'The task target is to orient all six visible interface compasses; six is not a hydration number.',
    },
  };
  return frozen({
    learnerPrediction,
    dimensions,
    correct: Object.values(dimensions).every((dimension) => dimension.correct),
  });
}

export function nextSolvationHint({ scenarioId, state, level }) {
  const scenario = validateSolvationState(scenarioId, state);
  hintLevel(level);
  const analysis = analyzeSolvationShell({ scenarioId, state });
  const hints = [
    {
      title: 'Read the central charge',
      detail: `${analysis.ion.formula} carries a declared formal charge of ${analysis.ionCharge > 0 ? '+' : '−'}1 in this symbolic shell.`,
    },
    {
      title: 'Read the water compass',
      detail: 'Each water button exposes a declared δ− oxygen end and δ+ hydrogen end. Clicking it reverses which end points inward.',
    },
    {
      title: 'Face opposite signs',
      detail: `${scenario.expectedInwardEnd === 'oxygen' ? 'Oxygen (δ−)' : 'A hydrogen end (δ+)'} should point toward ${analysis.ion.formula}. This is orientation, not proton transfer or a new covalent bond.`,
    },
    {
      title: 'Count every visible compass',
      detail: `${analysis.correctCount} of 6 interface waters currently point the expected end inward. Inspect the ${analysis.incorrectCount} remaining slot${analysis.incorrectCount === 1 ? '' : 's'}; the count is not a hydration number.`,
    },
  ];
  return frozen({ level, ...hints[level - 1] });
}
