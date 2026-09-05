import {
  FINITE_CHAIN_PRESET_BY_ID,
} from '../data/electronicBandScenarios.js';

const EPSILON = 1e-9;
const MAX_SITES = 16;
const MIN_SITES = 2;

const clonePlain = (value) => {
  if (Array.isArray(value)) return value.map(clonePlain);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, clonePlain(nested)]));
  }
  return value;
};

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
};

const frozen = (value) => deepFreeze(value);
const invalid = (reason, input = null) => frozen({ valid: false, reason, input: clonePlain(input) });
const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const inRange = (value, minimum, maximum) => finite(value) && value >= minimum && value <= maximum;
const levelId = (index) => `L${index + 1}`;

function validateFiniteModel(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, reason: 'Provide one declared finite-chain model.' };
  }
  if (!Number.isInteger(input.siteCount) || input.siteCount < MIN_SITES || input.siteCount > MAX_SITES) {
    return { valid: false, reason: `Site count must be an integer from ${MIN_SITES} through ${MAX_SITES}.` };
  }
  if (!inRange(input.couplingEv, 0, 1.5)) {
    return { valid: false, reason: 'Coupling magnitude must be from 0 through 1.5 eV.' };
  }
  if (!inRange(input.onsiteEnergyEv, -3, 3)) {
    return { valid: false, reason: 'On-site energy must be from -3 through 3 eV.' };
  }
  if ('targetElectronCount' in input && (!Number.isInteger(input.targetElectronCount) || input.targetElectronCount < 0 || input.targetElectronCount > input.siteCount * 2)) {
    return { valid: false, reason: `Target electron count must be an integer from 0 through ${input.siteCount * 2}.` };
  }
  return { valid: true };
}

function validateFiniteState(state) {
  const model = validateFiniteModel(state);
  if (!model.valid) return model;
  if (!state.occupancy || typeof state.occupancy !== 'object' || Array.isArray(state.occupancy)) {
    return { valid: false, reason: 'The finite-chain state needs one occupation record per displayed level.' };
  }
  const expectedIds = Array.from({ length: state.siteCount }, (_, index) => levelId(index));
  const actualIds = Object.keys(state.occupancy);
  if (actualIds.length !== expectedIds.length || expectedIds.some((id) => !(id in state.occupancy))) {
    return { valid: false, reason: `The state must contain exactly ${state.siteCount} declared level identities.` };
  }
  for (const id of expectedIds) {
    const spins = state.occupancy[id];
    if (!Array.isArray(spins) || spins.length > 2 || spins.some((spin) => spin !== 1 && spin !== -1)) {
      return { valid: false, reason: `${id} must contain zero, one, or two declared spin arrows.` };
    }
    if (new Set(spins).size !== spins.length) {
      return { valid: false, reason: `${id} cannot contain two electrons with the same displayed spin.` };
    }
  }
  return { valid: true };
}

function cloneFiniteState(state) {
  return {
    presetId: state.presetId || null,
    siteCount: state.siteCount,
    couplingEv: state.couplingEv,
    onsiteEnergyEv: state.onsiteEnergyEv,
    targetElectronCount: state.targetElectronCount,
    occupancy: Object.fromEntries(Object.entries(state.occupancy).map(([id, spins]) => [id, [...spins]])),
  };
}

function emptyOccupancy(siteCount) {
  return Object.fromEntries(Array.from({ length: siteCount }, (_, index) => [levelId(index), []]));
}

export function finiteChainSpectrum(input) {
  const validation = validateFiniteModel(input);
  if (!validation.valid) return invalid(validation.reason, input);
  const betaEv = -input.couplingEv;
  const levels = Array.from({ length: input.siteCount }, (_, index) => {
    const modeIndex = index + 1;
    const q = modeIndex * Math.PI / (input.siteCount + 1);
    const energyEv = input.onsiteEnergyEv + 2 * betaEv * Math.cos(q);
    return {
      id: levelId(index),
      rank: index + 1,
      modeIndex,
      q,
      energyEv: Math.abs(energyEv) < 1e-14 ? 0 : energyEv,
      offsetEv: Math.abs(energyEv - input.onsiteEnergyEv) < 1e-14 ? 0 : energyEv - input.onsiteEnergyEv,
      spinCapacity: 2,
    };
  });
  const finiteSpreadEv = input.couplingEv === 0
    ? 0
    : levels.at(-1).energyEv - levels[0].energyEv;
  const adjacentSpacingsEv = levels.slice(1).map((level, index) => level.energyEv - levels[index].energyEv);
  return frozen({
    valid: true,
    siteCount: input.siteCount,
    onsiteEnergyEv: input.onsiteEnergyEv,
    couplingEv: input.couplingEv,
    betaEv,
    levelCount: levels.length,
    levels,
    finiteSpreadEv,
    infiniteLimitWidthEv: 4 * input.couplingEv,
    adjacentSpacingsEv,
    degenerate: input.couplingEv === 0,
    equation: 'E_j = alpha + 2 beta cos(j pi / (N + 1)); beta = -|beta|',
    boundary: 'These are exact levels of one finite open teaching chain, not a periodic band or a computed material.',
  });
}

export function createFiniteChainState(inputOrPresetId) {
  const preset = typeof inputOrPresetId === 'string' ? FINITE_CHAIN_PRESET_BY_ID[inputOrPresetId] : null;
  const input = preset || inputOrPresetId;
  const validation = validateFiniteModel(input);
  if (!validation.valid || !('targetElectronCount' in (input || {}))) {
    return invalid(validation.valid ? 'Declare a target electron count for the finite chain.' : validation.reason, inputOrPresetId);
  }
  const state = {
    presetId: preset?.id || null,
    siteCount: input.siteCount,
    couplingEv: input.couplingEv,
    onsiteEnergyEv: input.onsiteEnergyEv,
    targetElectronCount: input.targetElectronCount,
    occupancy: emptyOccupancy(input.siteCount),
  };
  return frozen({
    valid: true,
    preset: preset || null,
    state,
    reason: `${input.siteCount}-site level rack loaded empty. Electron placement remains learner-controlled.`,
  });
}

export function updateFiniteChainState({ state, patch } = {}) {
  const validation = validateFiniteState(state);
  if (!validation.valid) return frozen({ allowed: false, state, reason: validation.reason });
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return frozen({ allowed: false, state, reason: 'Provide a finite-chain parameter edit.' });
  }
  const allowedKeys = ['siteCount', 'couplingEv', 'onsiteEnergyEv', 'targetElectronCount'];
  const unknown = Object.keys(patch).filter((key) => !allowedKeys.includes(key));
  if (unknown.length) return frozen({ allowed: false, state, reason: `Unknown finite-chain parameter: ${unknown.join(', ')}.` });
  const candidate = { ...state, ...patch };
  const candidateValidation = validateFiniteModel(candidate);
  if (!candidateValidation.valid) return frozen({ allowed: false, state, reason: candidateValidation.reason });
  const occupationReset = candidate.siteCount !== state.siteCount;
  const next = {
    presetId: null,
    siteCount: candidate.siteCount,
    couplingEv: candidate.couplingEv,
    onsiteEnergyEv: candidate.onsiteEnergyEv,
    targetElectronCount: candidate.targetElectronCount,
    occupancy: occupationReset ? emptyOccupancy(candidate.siteCount) : clonePlain(state.occupancy),
  };
  return frozen({
    allowed: true,
    state: next,
    occupationReset,
    reason: occupationReset
      ? `A new ${candidate.siteCount}-site rack was loaded empty because every finite-level identity changed.`
      : 'Model parameters changed; every placed spin arrow was preserved exactly.',
  });
}

export function clearFiniteChainState({ state } = {}) {
  const validation = validateFiniteState(state);
  if (!validation.valid) return frozen({ allowed: false, state, reason: validation.reason });
  const next = cloneFiniteState(state);
  next.occupancy = emptyOccupancy(state.siteCount);
  return frozen({ allowed: true, state: next, reason: 'Every spin arrow was removed by the learner-requested clear action.' });
}

export function placeFiniteElectron({ state, levelId: requestedLevelId, spin } = {}) {
  const validation = validateFiniteState(state);
  if (!validation.valid) return frozen({ allowed: false, state, reason: validation.reason });
  if (!(requestedLevelId in state.occupancy)) {
    return frozen({ allowed: false, state, reason: 'Choose one displayed finite-chain level.' });
  }
  if (spin !== 1 && spin !== -1) {
    return frozen({ allowed: false, state, reason: 'Choose a declared spin-up or spin-down cartridge.' });
  }
  const current = state.occupancy[requestedLevelId];
  if (current.length >= 2) {
    return frozen({ allowed: false, state, reason: `${requestedLevelId} already contains two electrons; a third electron is not permitted.` });
  }
  if (current.includes(spin)) {
    return frozen({ allowed: false, state, reason: `${requestedLevelId} already contains that same spin; the second electron must use the opposite spin.` });
  }
  const next = cloneFiniteState(state);
  next.occupancy[requestedLevelId].push(spin);
  return frozen({
    allowed: true,
    state: next,
    levelId: requestedLevelId,
    spin,
    reason: `${spin === 1 ? 'Spin-up' : 'Spin-down'} placed in ${requestedLevelId}. No energy-order repair was applied.`,
  });
}

export function removeFiniteElectron({ state, levelId: requestedLevelId, electronIndex } = {}) {
  const validation = validateFiniteState(state);
  if (!validation.valid) return frozen({ allowed: false, state, reason: validation.reason });
  if (!(requestedLevelId in state.occupancy)) {
    return frozen({ allowed: false, state, reason: 'Choose one displayed finite-chain level.' });
  }
  const current = state.occupancy[requestedLevelId];
  if (!Number.isInteger(electronIndex) || electronIndex < 0 || electronIndex >= current.length) {
    return frozen({ allowed: false, state, reason: 'Choose one placed spin arrow to remove.' });
  }
  const next = cloneFiniteState(state);
  const [spin] = next.occupancy[requestedLevelId].splice(electronIndex, 1);
  return frozen({ allowed: true, state: next, levelId: requestedLevelId, spin, reason: `One spin arrow was removed from ${requestedLevelId}.` });
}

export function buildFiniteReferenceState({ state } = {}) {
  const validation = validateFiniteState(state);
  if (!validation.valid) return frozen({ allowed: false, unique: false, state, reason: validation.reason });
  if (state.couplingEv === 0) {
    return frozen({
      allowed: false,
      unique: false,
      state,
      reason: 'At exact zero coupling all displayed levels are degenerate. This model audits electron count and Pauli capacity but does not choose one unique reference arrangement.',
    });
  }
  const next = cloneFiniteState(state);
  next.occupancy = emptyOccupancy(state.siteCount);
  let remaining = state.targetElectronCount;
  for (let index = 0; index < state.siteCount && remaining > 0; index += 1) {
    next.occupancy[levelId(index)].push(1);
    remaining -= 1;
    if (remaining > 0) {
      next.occupancy[levelId(index)].push(-1);
      remaining -= 1;
    }
  }
  return frozen({
    allowed: true,
    unique: true,
    state: next,
    reason: 'The explicitly requested low-to-high reference was loaded. No learner prediction was changed.',
  });
}

function aufbauEvidence(state) {
  if (state.couplingEv === 0) {
    return {
      applicable: false,
      correct: null,
      violations: [],
      reason: 'All displayed levels are degenerate at zero coupling, so this model does not rank one occupation arrangement over another.',
    };
  }
  const violations = [];
  for (let index = 0; index < state.siteCount - 1; index += 1) {
    const id = levelId(index);
    const openSlots = 2 - state.occupancy[id].length;
    if (!openSlots) continue;
    const occupiedHigher = Array.from({ length: state.siteCount - index - 1 }, (_, offset) => levelId(index + offset + 1))
      .filter((higherId) => state.occupancy[higherId].length > 0);
    if (occupiedHigher.length) {
      violations.push({
        levelId: id,
        openSlots,
        occupiedHigherLevelIds: occupiedHigher,
        reason: `${id} is a lower-energy level with ${openSlots} available spin slot${openSlots === 1 ? '' : 's'} while ${occupiedHigher.join(', ')} is occupied.`,
      });
    }
  }
  return {
    applicable: true,
    correct: violations.length === 0,
    violations,
    reason: violations.length
      ? `The manual occupation leaves lower-energy capacity available: ${violations.map((item) => item.reason).join(' ')}`
      : 'Every occupied level follows the declared low-to-high finite-chain energy order.',
  };
}

export function analyzeFiniteChain({ state } = {}) {
  const validation = validateFiniteState(state);
  if (!validation.valid) return invalid(validation.reason, state);
  const spectrum = finiteChainSpectrum(state);
  const electronCount = Object.values(state.occupancy).reduce((sum, spins) => sum + spins.length, 0);
  const occupiedLevels = spectrum.levels.filter((level) => state.occupancy[level.id].length > 0);
  const completelyEmptyLevels = spectrum.levels.filter((level) => state.occupancy[level.id].length === 0);
  const aufbau = aufbauEvidence(state);
  return frozen({
    valid: true,
    spectrum,
    electronCount,
    targetElectronCount: state.targetElectronCount,
    electronCountCorrect: electronCount === state.targetElectronCount,
    electronDifference: state.targetElectronCount - electronCount,
    aufbau,
    occupiedLevelCount: occupiedLevels.length,
    singlyOccupiedLevelCount: Object.values(state.occupancy).filter((spins) => spins.length === 1).length,
    highestOccupiedEnergyEv: occupiedLevels.length ? occupiedLevels.at(-1).energyEv : null,
    firstEmptyEnergyEv: completelyEmptyLevels.length ? completelyEmptyLevels[0].energyEv : null,
    referenceUnique: state.couplingEv !== 0,
    levelDensityStatement: state.couplingEv === 0
      ? `${state.siteCount} source orbitals remain ${state.siteCount} degenerate levels at the same declared energy.`
      : `${state.siteCount} discrete levels occupy ${spectrum.finiteSpreadEv.toFixed(3)} eV; adding sites at fixed coupling crowds more levels toward the ${spectrum.infiniteLimitWidthEv.toFixed(3)} eV periodic limit.`,
    boundary: 'This audit compares a finite open-chain teaching spectrum. It does not calculate a periodic solid, density of states, transport, or a material property.',
  });
}

const dimension = (correct, reason, expected, actual) => ({ correct, reason, expected, actual });

export function evaluateFiniteChain({ state, predictions } = {}) {
  const analysis = analyzeFiniteChain({ state });
  if (!analysis.valid) return analysis;
  const supplied = predictions && typeof predictions === 'object' && !Array.isArray(predictions) ? predictions : {};
  const expected = {
    levelCount: String(state.siteCount),
    splitState: state.couplingEv === 0 ? 'degenerate' : 'split',
    moreSitesEffect: state.couplingEv === 0 ? 'unchanged' : 'closer',
    modelKind: 'finite-levels',
  };
  const electronCount = dimension(
    analysis.electronCountCorrect,
    analysis.electronCountCorrect
      ? `The rack contains the declared ${state.targetElectronCount} electrons.`
      : `The rack contains ${analysis.electronCount}; the declared target is ${state.targetElectronCount}.`,
    state.targetElectronCount,
    analysis.electronCount,
  );
  const aufbau = {
    applicable: analysis.aufbau.applicable,
    correct: analysis.aufbau.correct,
    reason: analysis.aufbau.reason,
  };
  const levelCountCorrect = Number(supplied.levelCount) === state.siteCount;
  const levelCountResult = dimension(levelCountCorrect, levelCountCorrect ? 'One source orbital per site gives the correct finite level count.' : `${state.siteCount} source orbitals produce ${state.siteCount} finite levels.`, expected.levelCount, supplied.levelCount ?? null);
  const splitCorrect = supplied.splitState === expected.splitState;
  const splitState = dimension(splitCorrect, splitCorrect ? 'The coupling-to-splitting claim matches the model.' : state.couplingEv === 0 ? 'Zero coupling leaves the levels degenerate.' : 'Nonzero coupling splits the site-derived levels.', expected.splitState, supplied.splitState ?? null);
  const moreSitesCorrect = supplied.moreSitesEffect === expected.moreSitesEffect;
  const moreSitesEffect = dimension(moreSitesCorrect, moreSitesCorrect ? 'The fixed-coupling level-crowding claim is correct.' : state.couplingEv === 0 ? 'At zero coupling, adding sites adds more coincident levels without changing their shared energy.' : 'At fixed nonzero coupling, more sites crowd the discrete levels toward the same periodic width.', expected.moreSitesEffect, supplied.moreSitesEffect ?? null);
  const kindCorrect = supplied.modelKind === expected.modelKind;
  const modelKind = dimension(kindCorrect, kindCorrect ? 'The display is correctly identified as a finite spectrum.' : 'This rack contains finite-chain levels, not an infinite band or measured solid.', expected.modelKind, supplied.modelKind ?? null);
  const predictionDimensions = [levelCountResult, splitState, moreSitesEffect, modelKind];
  const occupationResolved = analysis.aufbau.applicable ? analysis.aufbau.correct : true;
  return frozen({
    valid: true,
    predictions: clonePlain(supplied),
    expected,
    electronCount,
    aufbau,
    levelCount: levelCountResult,
    splitState,
    moreSitesEffect,
    modelKind,
    committed: electronCount.correct && occupationResolved && predictionDimensions.every((item) => item.correct),
    neutralOccupation: !analysis.aufbau.applicable,
    boundary: analysis.boundary,
  });
}

export function nextFiniteChainHint({ state, level } = {}) {
  const validation = validateFiniteState(state);
  if (!validation.valid) return invalid(validation.reason, state);
  const hints = [
    ['Count the sources', `There is one source orbital on each of ${state.siteCount} sites. Preserve that count when the levels split.`],
    ['Open the coupling switch', state.couplingEv === 0 ? 'The declared transfer integral is zero, so every level remains at the on-site energy.' : `The declared |beta| is ${state.couplingEv.toFixed(2)} eV, so the site-derived levels split.`],
    ['Hold coupling fixed', state.couplingEv === 0 ? 'More sites would add more coincident levels at this zero-coupling limit.' : 'More sites place more discrete energies inside a spread approaching 4|beta|; they do not define a wider periodic limit.'],
    ['Name the object', 'A finite rack has a countable set of levels. The Band Loom is the separate infinite periodic limit.'],
  ];
  const index = Math.max(1, Math.min(4, Number(level) || 1)) - 1;
  return frozen({ valid: true, level: index + 1, title: hints[index][0], message: hints[index][1], mutation: 'No level, spin, parameter, or prediction was changed.' });
}

function validatePeriodicInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { valid: false, reason: 'Provide one periodic-chain model.' };
  if (!inRange(input.betaEv, -1.5, -0.1)) return { valid: false, reason: 'Periodic transfer integral beta must be from -1.5 through -0.1 eV.' };
  if (!inRange(input.onsiteEnergyEv, -3, 3)) return { valid: false, reason: 'Periodic on-site energy must be from -3 through 3 eV.' };
  if (!inRange(input.electronsPerCell, 0, 2)) return { valid: false, reason: 'Band filling must be from 0 through 2 electrons per cell.' };
  if (!inRange(input.qCursor, -Math.PI, Math.PI)) return { valid: false, reason: 'Reduced wave coordinate q must be from -pi through pi.' };
  return { valid: true };
}

const sampleCoordinates = () => Array.from({ length: 81 }, (_, index) => {
  if (index === 0) return -Math.PI;
  if (index === 40) return 0;
  if (index === 80) return Math.PI;
  return -Math.PI + (index / 80) * 2 * Math.PI;
});

export function analyzePeriodicBand(input) {
  const validation = validatePeriodicInput(input);
  if (!validation.valid) return invalid(validation.reason, input);
  const occupationClass = input.electronsPerCell <= EPSILON
    ? 'empty'
    : input.electronsPerCell >= 2 - EPSILON
      ? 'full'
      : 'partially-filled';
  const qF = occupationClass === 'partially-filled' ? Math.PI * input.electronsPerCell / 2 : null;
  const energyAt = (q) => input.onsiteEnergyEv + 2 * input.betaEv * Math.cos(q);
  const slopeAt = (q) => -2 * input.betaEv * Math.sin(q);
  const samples = sampleCoordinates().map((q) => ({
    q,
    energyEv: energyAt(q),
    occupied: occupationClass === 'full' || (occupationClass === 'partially-filled' && Math.abs(q) <= qF + EPSILON),
  }));
  const bandMinimumEv = input.onsiteEnergyEv + 2 * input.betaEv;
  const bandMaximumEv = input.onsiteEnergyEv - 2 * input.betaEv;
  const nearbyEmptyStatesWithinBand = occupationClass === 'partially-filled' ? true : occupationClass === 'full' ? false : null;
  const boundary = occupationClass === 'partially-filled'
    ? 'Occupied and empty states meet at the zero-temperature occupation edge in this ideal infinite chain. That is band-filling evidence, not a measured conductivity result.'
    : occupationClass === 'full'
      ? 'This displayed band has no empty state inside the same band. A second allowed band and real material evidence are absent, so an insulating classification is not established.'
      : 'The displayed allowed band is empty. With no occupied state, the nearby-empty-state question is not applicable.';
  return frozen({
    valid: true,
    onsiteEnergyEv: input.onsiteEnergyEv,
    betaEv: input.betaEv,
    electronsPerCell: input.electronsPerCell,
    qCursor: input.qCursor,
    samples,
    bandMinimumEv,
    bandMaximumEv,
    bandWidthEv: 4 * Math.abs(input.betaEv),
    occupationClass,
    occupiedFraction: input.electronsPerCell / 2,
    qF,
    fermiLevelWithinBandEv: qF === null ? null : energyAt(qF),
    nearbyEmptyStatesWithinBand,
    selectedEnergyEv: energyAt(input.qCursor),
    selectedSlopeEvPerQ: slopeAt(input.qCursor),
    equation: 'E(q) = alpha + 2 beta cos(q); q = ka; width = 4|beta|',
    boundary,
  });
}

export function evaluatePeriodicBand({ input, predictions } = {}) {
  const analysis = analyzePeriodicBand(input);
  if (!analysis.valid) return analysis;
  const supplied = predictions && typeof predictions === 'object' && !Array.isArray(predictions) ? predictions : {};
  const expectedNearby = analysis.nearbyEmptyStatesWithinBand === null ? 'not-applicable' : analysis.nearbyEmptyStatesWithinBand ? 'yes' : 'no';
  const numericWidth = Number(supplied.bandWidthEv);
  const widthCorrect = Number.isFinite(numericWidth) && Math.abs(numericWidth - analysis.bandWidthEv) <= 0.01 + Number.EPSILON;
  const bandWidthEv = dimension(widthCorrect, widthCorrect ? 'The width matches 4|beta|.' : `The exact displayed width is 4|${input.betaEv.toFixed(2)}| = ${analysis.bandWidthEv.toFixed(2)} eV.`, analysis.bandWidthEv, supplied.bandWidthEv ?? null);
  const occupationCorrect = supplied.occupationClass === analysis.occupationClass;
  const occupationClass = dimension(occupationCorrect, occupationCorrect ? 'The filling class matches the declared spin capacity.' : `${input.electronsPerCell.toFixed(2)} electrons per cell makes this band ${analysis.occupationClass}.`, analysis.occupationClass, supplied.occupationClass ?? null);
  const nearbyCorrect = supplied.nearbyEmpty === expectedNearby;
  const nearbyEmpty = dimension(nearbyCorrect, nearbyCorrect ? 'The same-band state-availability claim is correct.' : analysis.boundary, expectedNearby, supplied.nearbyEmpty ?? null);
  const slopeCorrect = supplied.slopeMeaning === 'dispersion-only';
  const slopeMeaning = dimension(slopeCorrect, slopeCorrect ? 'dE/dq is kept as a dimensionless dispersion slope.' : 'This model does not supply lattice length, transport, scattering, or a conductivity result.', 'dispersion-only', supplied.slopeMeaning ?? null);
  return frozen({
    valid: true,
    predictions: clonePlain(supplied),
    bandWidthEv,
    occupationClass,
    nearbyEmpty,
    slopeMeaning,
    committed: [bandWidthEv, occupationClass, nearbyEmpty, slopeMeaning].every((item) => item.correct),
    boundary: analysis.boundary,
  });
}

export function nextPeriodicBandHint({ input, level } = {}) {
  const analysis = analyzePeriodicBand(input);
  if (!analysis.valid) return analysis;
  const hints = [
    ['Read the width bracket', `This one-band cosine model spans 4|beta| = ${analysis.bandWidthEv.toFixed(2)} eV.`],
    ['Count spin capacity', `The one orbital per cell supplies two spin states; ${input.electronsPerCell.toFixed(2)} of 2 are filled.`],
    ['Inspect the occupation edge', analysis.boundary],
    ['Protect the boundary', 'dE/dq describes the plotted curve. Velocity, current, mobility, scattering, and conductivity need additional quantities and evidence.'],
  ];
  const index = Math.max(1, Math.min(4, Number(level) || 1)) - 1;
  return frozen({ valid: true, level: index + 1, title: hints[index][0], message: hints[index][1], mutation: 'No filling, cursor, coupling, or prediction was changed.' });
}

function validateTwoBandInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { valid: false, reason: 'Provide one declared two-band model.' };
  if (!inRange(input.valenceCenterEv, -4, 4) || !inRange(input.conductionCenterEv, -4, 4)) {
    return { valid: false, reason: 'Each band center must be from -4 through 4 eV.' };
  }
  if (!inRange(input.valenceWidthEv, 0.2, 3) || !inRange(input.conductionWidthEv, 0.2, 3)) {
    return { valid: false, reason: 'Each full band width must be from 0.2 through 3 eV.' };
  }
  if (input.alignment !== 'direct' && input.alignment !== 'indirect') {
    return { valid: false, reason: 'Choose direct or indirect declared edge alignment.' };
  }
  if (!inRange(input.qCursor, -Math.PI, Math.PI)) return { valid: false, reason: 'Reduced wave coordinate q must be from -pi through pi.' };
  return { valid: true };
}

export function analyzeTwoBandEdges(input) {
  const validation = validateTwoBandInput(input);
  if (!validation.valid) return invalid(validation.reason, input);
  const valenceAt = (q) => input.valenceCenterEv - (input.valenceWidthEv / 2) * Math.cos(q);
  const conductionAt = input.alignment === 'direct'
    ? (q) => input.conductionCenterEv + (input.conductionWidthEv / 2) * Math.cos(q)
    : (q) => input.conductionCenterEv - (input.conductionWidthEv / 2) * Math.cos(q);
  const valenceMaximum = { q: Math.PI, energyEv: input.valenceCenterEv + input.valenceWidthEv / 2 };
  const conductionMinimum = {
    q: input.alignment === 'direct' ? Math.PI : 0,
    energyEv: input.conductionCenterEv - input.conductionWidthEv / 2,
  };
  const edgeDifferenceEv = conductionMinimum.energyEv - valenceMaximum.energyEv;
  const edgeRelation = edgeDifferenceEv > EPSILON ? 'positive-gap' : edgeDifferenceEv < -EPSILON ? 'overlap' : 'touching';
  const displayGapEv = edgeRelation === 'overlap' ? null : Math.max(0, edgeDifferenceEv);
  const overlapEv = edgeRelation === 'overlap' ? -edgeDifferenceEv : 0;
  const samples = sampleCoordinates().map((q) => ({ q, valenceEv: valenceAt(q), conductionEv: conductionAt(q) }));
  const reason = edgeRelation === 'positive-gap'
    ? `The conduction minimum sits ${displayGapEv.toFixed(2)} eV above the valence maximum in this declared model.`
    : edgeRelation === 'touching'
      ? 'The declared conduction minimum and valence maximum touch at the same energy; the displayed gap is exactly zero.'
      : `The conduction minimum lies ${overlapEv.toFixed(2)} eV below the valence maximum, creating a ${overlapEv.toFixed(2)} eV edge overlap. Report the shared interval as overlap rather than assigning a signed gap label.`;
  return frozen({
    valid: true,
    valenceCenterEv: input.valenceCenterEv,
    valenceWidthEv: input.valenceWidthEv,
    conductionCenterEv: input.conductionCenterEv,
    conductionWidthEv: input.conductionWidthEv,
    edgeAlignment: input.alignment,
    qCursor: input.qCursor,
    samples,
    valenceMaximum,
    conductionMinimum,
    edgeDifferenceEv,
    edgeRelation,
    displayGapEv,
    overlapEv,
    selectedValenceEv: valenceAt(input.qCursor),
    selectedConductionEv: conductionAt(input.qCursor),
    reason,
    equations: {
      valence: 'Ev(q) = EvCenter - (Wv / 2) cos(q)',
      conduction: input.alignment === 'direct' ? 'Ec(q) = EcCenter + (Wc / 2) cos(q)' : 'Ec(q) = EcCenter - (Wc / 2) cos(q)',
    },
    boundary: 'The gate compares declared band-edge geometry only. It does not solve occupation or certify a real metal, semiconductor, or insulator.',
  });
}

export function evaluateTwoBandEdges({ input, predictions } = {}) {
  const analysis = analyzeTwoBandEdges(input);
  if (!analysis.valid) return analysis;
  const supplied = predictions && typeof predictions === 'object' && !Array.isArray(predictions) ? predictions : {};
  const expectedMagnitude = analysis.edgeRelation === 'overlap' ? analysis.overlapEv : analysis.displayGapEv;
  const relationCorrect = supplied.edgeRelation === analysis.edgeRelation;
  const edgeRelation = dimension(relationCorrect, relationCorrect ? 'The edge relationship is classified correctly.' : analysis.reason, analysis.edgeRelation, supplied.edgeRelation ?? null);
  const numericMagnitude = Number(supplied.magnitudeEv);
  const magnitudeCorrect = Number.isFinite(numericMagnitude) && Math.abs(numericMagnitude - expectedMagnitude) <= 0.01 + Number.EPSILON;
  const magnitudeEv = dimension(magnitudeCorrect, magnitudeCorrect ? `The ${analysis.edgeRelation === 'overlap' ? 'overlap' : 'gap'} magnitude matches the edge ledger.` : `Compare Ec,min with Ev,max: the displayed ${analysis.edgeRelation === 'overlap' ? 'overlap' : 'gap'} magnitude is ${expectedMagnitude.toFixed(2)} eV.`, expectedMagnitude, supplied.magnitudeEv ?? null);
  const alignmentCorrect = supplied.edgeAlignment === analysis.edgeAlignment;
  const edgeAlignment = dimension(alignmentCorrect, alignmentCorrect ? 'The two edge coordinates are compared correctly.' : `The valence maximum is at q = pi and the conduction minimum is at q = ${analysis.edgeAlignment === 'direct' ? 'pi' : '0'}, so the declared alignment is ${analysis.edgeAlignment}.`, analysis.edgeAlignment, supplied.edgeAlignment ?? null);
  const materialCorrect = supplied.materialClaim === 'teaching-model-only';
  const materialClaim = dimension(materialCorrect, materialCorrect ? 'The claim stays inside the synthetic teaching boundary.' : 'Band centers and widths alone do not certify a real material class.', 'teaching-model-only', supplied.materialClaim ?? null);
  return frozen({
    valid: true,
    predictions: clonePlain(supplied),
    edgeRelation,
    magnitudeEv,
    edgeAlignment,
    materialClaim,
    committed: [edgeRelation, magnitudeEv, edgeAlignment, materialClaim].every((item) => item.correct),
    boundary: analysis.boundary,
  });
}

export function nextTwoBandHint({ input, level } = {}) {
  const analysis = analyzeTwoBandEdges(input);
  if (!analysis.valid) return analysis;
  const hints = [
    ['Find the valence roof', `The declared valence maximum is ${analysis.valenceMaximum.energyEv.toFixed(2)} eV at q = pi.`],
    ['Find the conduction floor', `The declared conduction minimum is ${analysis.conductionMinimum.energyEv.toFixed(2)} eV at q = ${analysis.conductionMinimum.q === 0 ? '0' : 'pi'}.`],
    ['Compare energy and coordinate', `${analysis.reason} The extrema are ${analysis.edgeAlignment}.`],
    ['Protect the material boundary', 'Temperature, carriers, defects, scattering, dimensionality, interactions, and validated material evidence are absent. Do not certify semiconductor, insulator, or metal.'],
  ];
  const index = Math.max(1, Math.min(4, Number(level) || 1)) - 1;
  return frozen({ valid: true, level: index + 1, title: hints[index][0], message: hints[index][1], mutation: 'No band center, width, alignment, cursor, or prediction was changed.' });
}
