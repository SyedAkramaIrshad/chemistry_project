import {
  ATOMIC_ELEMENT_BY_Z,
  ATOMIC_SUBSHELLS,
} from '../data/atomicElements.js';

const SUBSHELL_BY_ID = Object.freeze(Object.fromEntries(
  ATOMIC_SUBSHELLS.map((subshell) => [subshell.id, subshell]),
));

const SUPERSCRIPTS = Object.freeze({
  0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴',
  5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹',
});

const invalid = (reason, input = null) => ({ valid: false, reason, input });
const spinLabel = (spin) => spin === 1 ? '↑' : '↓';

function superscript(value) {
  return String(value).split('').map((digit) => SUPERSCRIPTS[digit] || digit).join('');
}

function cloneAtomicState(state) {
  return Object.fromEntries(ATOMIC_SUBSHELLS.map((subshell) => [
    subshell.id,
    state[subshell.id].map((orbital) => [...orbital]),
  ]));
}

function validateAtomicState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return invalid('Load a valid orbital rack before placing electrons.', state);
  for (const subshell of ATOMIC_SUBSHELLS) {
    const orbitals = state[subshell.id];
    if (!Array.isArray(orbitals) || orbitals.length !== subshell.orbitalCount) {
      return invalid(`${subshell.id} must contain ${subshell.orbitalCount} displayed orbital${subshell.orbitalCount === 1 ? '' : 's'}.`, state);
    }
    for (const orbital of orbitals) {
      if (!Array.isArray(orbital) || orbital.length > 2 || !orbital.every((spin) => spin === 1 || spin === -1)) {
        return invalid(`Every ${subshell.id} orbital must contain zero, one, or two spin values.`, state);
      }
      if (orbital.length === 2 && orbital[0] === orbital[1]) {
        return invalid(`Two electrons in one ${subshell.id} orbital must have opposite spins.`, state);
      }
    }
  }
  return { valid: true };
}

function resolveElement(atomicNumber) {
  const element = ATOMIC_ELEMENT_BY_Z[atomicNumber];
  return element || null;
}

function occupySubshell(count, orbitalCount) {
  const orbitals = Array.from({ length: orbitalCount }, () => []);
  for (let index = 0; index < Math.min(count, orbitalCount); index += 1) orbitals[index].push(1);
  for (let index = 0; index < Math.max(0, count - orbitalCount); index += 1) orbitals[index].push(-1);
  return orbitals;
}

function hundCheck(state) {
  const violations = [];
  for (const subshell of ATOMIC_SUBSHELLS.filter((item) => item.orbitalCount > 1)) {
    const orbitals = state[subshell.id];
    const count = orbitals.reduce((sum, orbital) => sum + orbital.length, 0);
    const expectedPairs = Math.max(0, count - subshell.orbitalCount);
    const expectedSingles = Math.min(count, 2 * subshell.orbitalCount - count);
    const actualPairs = orbitals.filter((orbital) => orbital.length === 2).length;
    const singles = orbitals.filter((orbital) => orbital.length === 1);
    const actualSingles = singles.length;
    if (actualPairs !== expectedPairs || actualSingles !== expectedSingles) {
      violations.push({
        subshellId: subshell.id,
        kind: 'early-pairing',
        actualPairs,
        expectedPairs,
        actualSingles,
        expectedSingles,
        reason: `${subshell.id} pairs electrons before all equivalent orbitals have the introductory maximum-unpaired occupation.`,
      });
      continue;
    }
    const singleSpins = new Set(singles.map((orbital) => orbital[0]));
    if (singleSpins.size > 1) {
      violations.push({
        subshellId: subshell.id,
        kind: 'nonparallel-singles',
        actualPairs,
        expectedPairs,
        actualSingles,
        expectedSingles,
        reason: `The singly occupied ${subshell.id} orbitals are degenerate here, so the introductory Hund pattern uses parallel spins.`,
      });
    }
  }
  return {
    correct: violations.length === 0,
    violations,
    reason: violations.length
      ? violations.map((item) => item.reason).join(' ')
      : 'Occupied degenerate orbitals use the introductory maximum-unpaired, parallel-spin pattern.',
  };
}

export function createEmptyAtomicState() {
  return Object.fromEntries(ATOMIC_SUBSHELLS.map((subshell) => [
    subshell.id,
    Array.from({ length: subshell.orbitalCount }, () => []),
  ]));
}

export function placeAtomicElectron({ state, subshellId, orbitalIndex, spin }) {
  const validation = validateAtomicState(state);
  if (!validation.valid) return { allowed: false, state, reason: validation.reason };
  const subshell = SUBSHELL_BY_ID[subshellId];
  if (!subshell) return { allowed: false, state, reason: 'Choose one of the displayed subshells from 1s through 4p.' };
  if (!Number.isInteger(orbitalIndex) || orbitalIndex < 0 || orbitalIndex >= subshell.orbitalCount) {
    return { allowed: false, state, reason: `Choose a displayed orbital inside ${subshell.id}.` };
  }
  if (spin !== 1 && spin !== -1) return { allowed: false, state, reason: 'Choose spin up (+1/2) or spin down (−1/2).' };
  const orbital = state[subshellId][orbitalIndex];
  if (orbital.length >= 2) {
    return { allowed: false, state, reason: `This ${subshell.id} orbital already has two electrons. Pauli permits no third electron here.` };
  }
  if (orbital.includes(spin)) {
    return { allowed: false, state, reason: `This ${subshell.id} orbital already contains a ${spinLabel(spin)} electron. A second electron here must have the opposite spin.` };
  }
  const next = cloneAtomicState(state);
  next[subshellId][orbitalIndex].push(spin);
  return {
    allowed: true,
    state: next,
    subshellId,
    orbitalIndex,
    spin,
    reason: `${spinLabel(spin)} placed in ${subshell.id}, orbital mₗ = ${subshell.ml[orbitalIndex]}.`,
  };
}

export function removeAtomicElectron({ state, subshellId, orbitalIndex, electronIndex }) {
  const validation = validateAtomicState(state);
  if (!validation.valid) return { allowed: false, state, reason: validation.reason };
  const subshell = SUBSHELL_BY_ID[subshellId];
  if (!subshell) return { allowed: false, state, reason: 'Choose one of the displayed subshells from 1s through 4p.' };
  if (!Number.isInteger(orbitalIndex) || orbitalIndex < 0 || orbitalIndex >= subshell.orbitalCount) {
    return { allowed: false, state, reason: `Choose a displayed orbital inside ${subshell.id}.` };
  }
  const orbital = state[subshellId][orbitalIndex];
  if (!Number.isInteger(electronIndex) || electronIndex < 0 || electronIndex >= orbital.length) {
    return { allowed: false, state, reason: 'Choose a placed electron to remove; this site has no electron at that position.' };
  }
  const spin = orbital[electronIndex];
  const next = cloneAtomicState(state);
  next[subshellId][orbitalIndex].splice(electronIndex, 1);
  return {
    allowed: true,
    state: next,
    subshellId,
    orbitalIndex,
    electronIndex,
    spin,
    reason: `${spinLabel(spin)} removed from ${subshell.id}, orbital mₗ = ${subshell.ml[orbitalIndex]}.`,
  };
}

export function subshellTotals(state) {
  const validation = validateAtomicState(state);
  if (!validation.valid) return {};
  return Object.fromEntries(ATOMIC_SUBSHELLS.map((subshell) => [
    subshell.id,
    state[subshell.id].reduce((sum, orbital) => sum + orbital.length, 0),
  ]));
}

export function buildReferenceOrbitalState(atomicNumber) {
  const element = resolveElement(atomicNumber);
  if (!element) return invalid('Choose a neutral element from H through Kr.', { atomicNumber });
  const state = Object.fromEntries(ATOMIC_SUBSHELLS.map((subshell) => [
    subshell.id,
    occupySubshell(element.groundSubshells[subshell.id], subshell.orbitalCount),
  ]));
  return { valid: true, element, state };
}

export function loadClosedCore(atomicNumber) {
  const element = resolveElement(atomicNumber);
  if (!element) return invalid('Choose a neutral element from H through Kr.', { atomicNumber });
  if (!element.nobleGasCoreZ) {
    return {
      valid: true,
      element,
      core: null,
      state: createEmptyAtomicState(),
      reason: `${element.name} has no earlier noble-gas core in this H–Kr model.`,
    };
  }
  const reference = buildReferenceOrbitalState(element.nobleGasCoreZ);
  return {
    valid: true,
    element,
    core: reference.element,
    state: reference.state,
    reason: `Loaded the ${reference.element.symbol} closed core with ${reference.element.atomicNumber} electrons. The learner still controls every electron outside that core.`,
  };
}

export function atomicStateMetrics(state) {
  const validation = validateAtomicState(state);
  if (!validation.valid) return validation;
  const totals = subshellTotals(state);
  const electrons = ATOMIC_SUBSHELLS.flatMap((subshell) => state[subshell.id].flat());
  const electronCount = electrons.length;
  const pairCount = ATOMIC_SUBSHELLS.reduce(
    (sum, subshell) => sum + state[subshell.id].filter((orbital) => orbital.length === 2).length,
    0,
  );
  const unpairedElectrons = ATOMIC_SUBSHELLS.reduce(
    (sum, subshell) => sum + state[subshell.id].filter((orbital) => orbital.length === 1).length,
    0,
  );
  const shellTotals = Object.fromEntries([1, 2, 3, 4].map((n) => [
    n,
    ATOMIC_SUBSHELLS.filter((subshell) => subshell.n === n).reduce((sum, subshell) => sum + totals[subshell.id], 0),
  ]));
  const occupied = ATOMIC_SUBSHELLS.filter((subshell) => totals[subshell.id] > 0);
  return {
    valid: true,
    electronCount,
    pairCount,
    unpairedElectrons,
    magnetism: unpairedElectrons > 0 ? 'paramagnetic' : 'diamagnetic',
    totals,
    shellTotals,
    highestOccupiedN: occupied.length ? Math.max(...occupied.map((subshell) => subshell.n)) : 0,
  };
}

export function atomicConfigurationNotation(state) {
  const metrics = atomicStateMetrics(state);
  if (!metrics.valid || metrics.electronCount === 0) return 'empty orbital rack';
  return ATOMIC_SUBSHELLS
    .filter((subshell) => metrics.totals[subshell.id] > 0)
    .map((subshell) => `${subshell.id}${superscript(metrics.totals[subshell.id])}`)
    .join(' ');
}

export function evaluateAtomicConfiguration({
  atomicNumber,
  state,
  predictedMagnetism = '',
  predictedUnpaired = null,
}) {
  const element = resolveElement(atomicNumber);
  if (!element) return { committed: false, ...invalid('Choose a neutral element from H through Kr.', { atomicNumber }) };
  const metrics = atomicStateMetrics(state);
  if (!metrics.valid) return { committed: false, ...metrics };
  const electronDifference = element.atomicNumber - metrics.electronCount;
  const electronCount = {
    correct: electronDifference === 0,
    actual: metrics.electronCount,
    expected: element.atomicNumber,
    reason: electronDifference === 0
      ? `All ${element.atomicNumber} electrons for neutral ${element.symbol} are present.`
      : electronDifference > 0
        ? `${electronDifference} electron${electronDifference === 1 ? '' : 's'} still need${electronDifference === 1 ? 's' : ''} to be placed.`
        : `${Math.abs(electronDifference)} excess electron${electronDifference === -1 ? '' : 's'} must be removed for neutral ${element.symbol}.`,
  };
  const mismatches = ATOMIC_SUBSHELLS
    .map((subshell) => ({
      id: subshell.id,
      actual: metrics.totals[subshell.id],
      expected: element.groundSubshells[subshell.id],
    }))
    .filter((item) => item.actual !== item.expected)
    .map((item) => ({
      ...item,
      difference: item.actual - item.expected,
      reason: `${item.id} has ${item.actual}; the declared NIST neutral ground-state record has ${item.expected}.`,
    }));
  const subshells = {
    correct: mismatches.length === 0,
    mismatches,
    reason: mismatches.length
      ? mismatches.map((item) => item.reason).join(' ')
      : `Every displayed subshell matches ${element.shorthand}.`,
  };
  const hund = hundCheck(state);
  const predictedCountIsValid = Number.isInteger(predictedUnpaired) && predictedUnpaired >= 0;
  const classCorrect = predictedMagnetism === metrics.magnetism;
  const countCorrect = predictedCountIsValid && predictedUnpaired === metrics.unpairedElectrons;
  const magnetism = {
    correct: classCorrect && countCorrect,
    classCorrect,
    countCorrect,
    actual: metrics.magnetism,
    predicted: predictedMagnetism,
    unpaired: metrics.unpairedElectrons,
    predictedUnpaired,
    reason: !predictedMagnetism || !predictedCountIsValid
      ? 'Commit both a paramagnetic/diamagnetic choice and a whole-number unpaired-electron prediction.'
      : classCorrect && countCorrect
        ? `${metrics.unpairedElectrons} unpaired electron${metrics.unpairedElectrons === 1 ? '' : 's'} gives the spin-only ${metrics.magnetism} classification.`
        : `The displayed arrangement has ${metrics.unpairedElectrons} unpaired electron${metrics.unpairedElectrons === 1 ? '' : 's'}, so its spin-only classification is ${metrics.magnetism}.`,
  };
  const exactGroundPattern = electronCount.correct && subshells.correct && hund.correct;
  return {
    valid: true,
    committed: exactGroundPattern && magnetism.correct,
    element,
    metrics,
    electronCount,
    subshells,
    hund,
    magnetism,
    exactGroundPattern,
    exceptionNote: element.exceptionNote,
    notation: atomicConfigurationNotation(state),
  };
}

export function quantumAddressForElectron({
  state,
  subshellId,
  orbitalIndex,
  electronIndex,
}) {
  const validation = validateAtomicState(state);
  if (!validation.valid) return validation;
  const subshell = SUBSHELL_BY_ID[subshellId];
  if (!subshell) return invalid('Choose an electron in one of the displayed subshells.', { subshellId });
  if (!Number.isInteger(orbitalIndex) || orbitalIndex < 0 || orbitalIndex >= subshell.orbitalCount) {
    return invalid(`Choose a displayed orbital inside ${subshell.id}.`, { orbitalIndex });
  }
  const orbital = state[subshellId][orbitalIndex];
  if (!Number.isInteger(electronIndex) || electronIndex < 0 || electronIndex >= orbital.length) {
    return invalid('Choose a placed electron before predicting its quantum address.', { electronIndex });
  }
  return {
    valid: true,
    subshellId,
    orbitalIndex,
    electronIndex,
    n: subshell.n,
    l: subshell.l,
    ml: subshell.ml[orbitalIndex],
    ms: orbital[electronIndex] / 2,
  };
}

export function evaluateQuantumPrediction({ actual, prediction }) {
  if (!actual?.valid) return { committed: false, ...invalid(actual?.reason || 'Choose a placed electron first.', actual) };
  if (!prediction || typeof prediction !== 'object') return { committed: false, ...invalid('Predict n, l, mₗ, and mₛ before checking.', prediction) };
  const specs = {
    n: {
      label: 'n',
      reason: `This electron is in ${actual.subshellId}; its principal quantum number is n = ${actual.n}.`,
    },
    l: {
      label: 'l',
      reason: `${actual.subshellId.endsWith('s') ? 's' : actual.subshellId.endsWith('p') ? 'p' : 'd'} corresponds to l = ${actual.l}.`,
    },
    ml: {
      label: 'mₗ',
      reason: `Displayed orbital ${actual.orbitalIndex + 1} maps to mₗ = ${actual.ml}; allowed values run from −l through +l.`,
    },
    ms: {
      label: 'mₛ',
      reason: `The selected ${actual.ms === 0.5 ? '↑' : '↓'} electron has mₛ = ${actual.ms > 0 ? '+' : '−'}1/2.`,
    },
  };
  const dimensions = Object.fromEntries(Object.entries(specs).map(([key, spec]) => {
    const entered = Number(prediction[key]);
    const correct = Number.isFinite(entered) && entered === actual[key];
    return [key, {
      correct,
      expected: actual[key],
      predicted: prediction[key],
      reason: correct ? `${spec.label} is correct.` : spec.reason,
    }];
  }));
  return {
    valid: true,
    committed: Object.values(dimensions).every((dimension) => dimension.correct),
    actual,
    prediction: { ...prediction },
    dimensions,
  };
}

export function nextAtomicHint({ atomicNumber, state, level = 1 }) {
  const element = resolveElement(atomicNumber);
  if (!element) return invalid('Choose a neutral element from H through Kr.', { atomicNumber });
  const metrics = atomicStateMetrics(state);
  if (!metrics.valid) return metrics;
  const safeLevel = Math.max(1, Math.min(4, Math.trunc(level) || 1));
  const evaluation = evaluateAtomicConfiguration({
    atomicNumber,
    state,
    predictedMagnetism: metrics.magnetism,
    predictedUnpaired: metrics.unpairedElectrons,
  });
  let text;
  if (safeLevel === 1) {
    const difference = element.atomicNumber - metrics.electronCount;
    text = difference === 0
      ? `The neutral-atom electron count is complete at ${element.atomicNumber}; inspect where those electrons sit.`
      : difference > 0
        ? `Neutral ${element.symbol} needs ${element.atomicNumber} electrons; place ${difference} more without violating Pauli.`
        : `Neutral ${element.symbol} needs ${element.atomicNumber} electrons; remove ${Math.abs(difference)} from the displayed rack.`;
  } else if (safeLevel === 2) {
    const mismatch = evaluation.subshells.mismatches[0];
    text = mismatch
      ? `First ground-record mismatch: ${mismatch.reason}`
      : 'Every subshell total matches the declared NIST record; now inspect the distribution inside degenerate subshells.';
  } else if (safeLevel === 3) {
    text = evaluation.hund.correct
      ? `The displayed degenerate-orbital pattern satisfies the introductory Hund check and has ${metrics.unpairedElectrons} unpaired electron${metrics.unpairedElectrons === 1 ? '' : 's'}.`
      : evaluation.hund.violations[0].reason;
  } else {
    text = `NIST neutral ground-state reference for ${element.name}: ${element.shorthand}.${element.exceptionNote ? ` ${element.exceptionNote}` : ''}`;
  }
  return {
    valid: true,
    level: safeLevel,
    text,
    element,
    state,
    evaluation,
  };
}

export function compareIonizationEnergies({ leftAtomicNumber, rightAtomicNumber }) {
  const left = resolveElement(leftAtomicNumber);
  const right = resolveElement(rightAtomicNumber);
  if (!left || !right) return invalid('Choose two neutral elements from H through Kr.', { leftAtomicNumber, rightAtomicNumber });
  const signedDifferenceEV = right.ionizationEnergyEV - left.ionizationEnergyEV;
  const same = Math.abs(signedDifferenceEV) < 1e-12;
  const higher = same ? null : signedDifferenceEV > 0 ? right : left;
  const lower = same ? null : signedDifferenceEV > 0 ? left : right;
  return {
    valid: true,
    left,
    right,
    signedDifferenceEV,
    absoluteDifferenceEV: Math.abs(signedDifferenceEV),
    higher,
    lower,
    direction: same
      ? `${left.symbol} and ${right.symbol} have the same displayed value.`
      : `${higher.symbol} is higher than ${lower.symbol} by ${Math.abs(signedDifferenceEV).toFixed(4)} eV in the declared NIST records.`,
    boundary: 'This is a comparison of measured neutral-atom first-ionization-energy records, not a universal monotonic law or an orbital-energy calculation.',
  };
}
