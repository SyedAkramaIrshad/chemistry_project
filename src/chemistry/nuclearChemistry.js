import {
  BINDING_NUCLEI,
  BINDING_NUCLEUS_BY_ID,
  DECAY_CHALLENGE_BY_ID,
  DECAY_PARTICLE_BY_ID,
  HALF_LIFE_CHALLENGE_BY_ID,
  NUCLEAR_CONSTANTS,
  NUCLEAR_MODEL_BOUNDARY,
  NUCLIDE_BY_ID,
} from '../data/nuclearScenarios.js';

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
};

const requireObject = (value, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
  return value;
};

const finite = (value, label, { minimum = -Infinity, maximum = Infinity, exclusiveMinimum = false } = {}) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) throw new TypeError(`${label} must be finite.`);
  if (exclusiveMinimum ? numeric <= minimum : numeric < minimum) throw new RangeError(`${label} is outside the supported range.`);
  if (numeric > maximum) throw new RangeError(`${label} is outside the supported range.`);
  return numeric;
};

const exactSetMatch = (left, right) => {
  const normalize = (items) => items.map((item) => `${item.side}:${item.particleId}`).sort();
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
};

const validatePrediction = (prediction, fields, label) => {
  requireObject(prediction, label);
  for (const [key, allowed] of Object.entries(fields)) {
    if (!allowed.includes(prediction[key])) throw new RangeError(`${label}.${key} is missing or unsupported.`);
  }
};

const formatNuclide = (record) => `⁽${record.massNumber},${record.atomicNumber}⁾${record.symbol}`;
const scientific = (value, digits = 5) => Number(value).toExponential(digits);

const normalizePlacements = (placements) => {
  if (!Array.isArray(placements)) throw new TypeError('Particle placements must be an array.');
  const seen = new Set();
  return placements.map((placement, index) => {
    requireObject(placement, `Particle placement ${index + 1}`);
    if (!DECAY_PARTICLE_BY_ID[placement.particleId]) throw new RangeError(`Unknown decay particle: ${placement.particleId}.`);
    if (!['reactant', 'product'].includes(placement.side)) throw new RangeError(`Particle placement side must be reactant or product.`);
    const key = `${placement.side}:${placement.particleId}`;
    if (seen.has(key)) throw new RangeError(`Duplicate particle placement: ${key}.`);
    seen.add(key);
    return { particleId: placement.particleId, side: placement.side };
  });
};

const sumParticleCoordinate = (placements, side, field) => placements
  .filter((placement) => placement.side === side)
  .reduce((sum, placement) => sum + DECAY_PARTICLE_BY_ID[placement.particleId][field], 0);

export function analyzeDecayAssembly({ challengeId, daughterId, placements }) {
  const challenge = DECAY_CHALLENGE_BY_ID[challengeId];
  if (!challenge) throw new RangeError(`Unknown decay challenge: ${challengeId}.`);
  const parent = NUCLIDE_BY_ID[challenge.parentId];
  const daughter = challenge.daughterOptions.find((item) => item.id === daughterId);
  if (!daughter) throw new RangeError(`Unsupported daughter option for ${challenge.id}: ${daughterId}.`);
  const normalizedPlacements = normalizePlacements(placements);
  const reactant = {
    massNumber: parent.massNumber + sumParticleCoordinate(normalizedPlacements, 'reactant', 'massNumber'),
    chargeNumber: parent.atomicNumber + sumParticleCoordinate(normalizedPlacements, 'reactant', 'chargeNumber'),
    leptonNumber: sumParticleCoordinate(normalizedPlacements, 'reactant', 'leptonNumber'),
  };
  const product = {
    massNumber: daughter.massNumber + sumParticleCoordinate(normalizedPlacements, 'product', 'massNumber'),
    chargeNumber: daughter.atomicNumber + sumParticleCoordinate(normalizedPlacements, 'product', 'chargeNumber'),
    leptonNumber: sumParticleCoordinate(normalizedPlacements, 'product', 'leptonNumber'),
  };
  const differences = {
    massNumber: product.massNumber - reactant.massNumber,
    chargeNumber: product.chargeNumber - reactant.chargeNumber,
    leptonNumber: product.leptonNumber - reactant.leptonNumber,
  };
  const checks = {
    massNumber: differences.massNumber === 0,
    chargeNumber: differences.chargeNumber === 0,
    leptonNumber: differences.leptonNumber === 0,
    daughter: daughterId === challenge.expectedDaughterId,
    particleSet: exactSetMatch(normalizedPlacements, challenge.expectedPlacements),
  };
  const reactantParticles = normalizedPlacements.filter((item) => item.side === 'reactant').map((item) => DECAY_PARTICLE_BY_ID[item.particleId]);
  const productParticles = normalizedPlacements.filter((item) => item.side === 'product').map((item) => DECAY_PARTICLE_BY_ID[item.particleId]);
  const sideText = (nucleus, particles) => [formatNuclide(nucleus), ...particles.map((item) => item.symbol)].join(' + ');
  return deepFreeze({
    challengeId,
    challenge,
    parent,
    daughter,
    placements: normalizedPlacements,
    reactantParticles,
    productParticles,
    totals: { reactant, product },
    differences,
    checks,
    assemblyCorrect: Object.values(checks).every(Boolean),
    learnerEquation: `${sideText(parent, reactantParticles)} → ${sideText(daughter, productParticles)}`,
    expectedEquation: `${sideText(parent, challenge.expectedPlacements.filter((item) => item.side === 'reactant').map((item) => DECAY_PARTICLE_BY_ID[item.particleId]))} → ${sideText(challenge.daughterOptions.find((item) => item.id === challenge.expectedDaughterId), challenge.expectedPlacements.filter((item) => item.side === 'product').map((item) => DECAY_PARTICLE_BY_ID[item.particleId]))}`,
    energy: {
      qValueMeV: challenge.qValueMeV,
      display: challenge.modeId === 'gamma' ? `${(challenge.qValueMeV * 1000).toFixed(3)} keV selected level drop` : `${challenge.qValueMeV.toFixed(6)} MeV evaluated branch ledger`,
      boundary: challenge.misconception,
    },
    expectedClaims: {
      modeId: challenge.modeId,
      vectorId: challenge.vectorId,
      rateClaim: 'half-life-not-from-equation',
      evidenceClaim: 'equation-is-bookkeeping-only',
    },
    boundary: NUCLEAR_MODEL_BOUNDARY,
  });
}

const decayPredictionFields = {
  modeId: ['alpha', 'beta-minus', 'beta-plus', 'electron-capture', 'gamma'],
  vectorId: ['A-4,Z-2', 'A,Z+1', 'A,Z-1', 'A,Z'],
  rateClaim: ['half-life-from-balanced-equation', 'half-life-not-from-equation'],
  evidenceClaim: ['equation-is-complete-spectrum', 'equation-is-bookkeeping-only'],
};

export function evaluateDecayAttempt({ analysis, prediction }) {
  requireObject(analysis, 'Decay analysis');
  validatePrediction(prediction, decayPredictionFields, 'Decay prediction');
  const expected = analysis.expectedClaims;
  const reasons = {
    modeId: `The frozen challenge declares ${analysis.challenge.modeId}; its expected particle sides are ${analysis.challenge.expectedPlacements.map((item) => `${DECAY_PARTICLE_BY_ID[item.particleId].symbol} on ${item.side}`).join(' and ')}.`,
    vectorId: `The parent is (A=${analysis.parent.massNumber}, Z=${analysis.parent.atomicNumber}); the selected branch reaches (A=${analysis.challenge.daughterOptions.find((item) => item.id === analysis.challenge.expectedDaughterId).massNumber}, Z=${analysis.challenge.daughterOptions.find((item) => item.id === analysis.challenge.expectedDaughterId).atomicNumber}), so the vector is ${analysis.challenge.vectorId}.`,
    rateClaim: `Balancing A, Z, and lepton number does not calculate a transition probability or half-life. The evaluated parent record is ${analysis.parent.halfLifeDisplay || 'a selected excited-state lifetime record'}.`,
    evidenceClaim: `A symbolic equation closes declared bookkeeping. It does not enumerate every branch, energy distribution, atomic relaxation, daughter decay, or detector response. ${analysis.challenge.branchRecord}`,
  };
  const dimensions = Object.fromEntries(Object.keys(decayPredictionFields).map((key) => [key, {
    learner: prediction[key], expected: expected[key], correct: prediction[key] === expected[key], reason: reasons[key],
  }]));
  return deepFreeze({ dimensions, score: { correct: Object.values(dimensions).filter((item) => item.correct).length, total: 4 }, assembly: analysis.checks });
}

export function nextDecayHint({ analysis, level }) {
  requireObject(analysis, 'Decay analysis');
  if (!Number.isInteger(level) || level < 1 || level > 4) throw new RangeError('Decay hint level must be 1 through 4.');
  const target = analysis.challenge.daughterOptions.find((item) => item.id === analysis.challenge.expectedDaughterId);
  return deepFreeze([
    `Start at A = ${analysis.parent.massNumber}, Z = ${analysis.parent.atomicNumber}. A names all nucleons; Z names protons and therefore the element.`,
    `${analysis.challenge.modeId} moves the nuclear endpoint by ${analysis.challenge.vectorId}. Compare that vector with every candidate daughter before adding emitted or captured particles.`,
    `After the daughter is chosen, total each side separately: A, electric charge number, and electron-lepton number must each match. A balanced A/Z line can still omit a neutrino.`,
    `The declared endpoint is ${target.notation}; expected particle placement is ${analysis.challenge.expectedPlacements.map((item) => `${DECAY_PARTICLE_BY_ID[item.particleId].symbol} on the ${item.side} side`).join(' and ')}. This hint changes no daughter, particle, or claim.`,
  ][level - 1]);
}

const parentBandFor = (fraction) => {
  const close = (value) => Math.abs(fraction - value) < 1e-12;
  if (close(1)) return 'all-parent';
  if (close(0.5)) return 'one-half';
  if (close(0.25)) return 'one-quarter';
  if (fraction > 0.5) return 'more-than-half';
  if (fraction > 0.25) return 'quarter-to-half';
  return 'less-than-quarter';
};

export function analyzeHalfLife({ challengeId, initialNuclei, elapsedHalfLives }) {
  const challenge = HALF_LIFE_CHALLENGE_BY_ID[challengeId];
  if (!challenge) throw new RangeError(`Unknown half-life challenge: ${challengeId}.`);
  const initial = finite(initialNuclei, 'Initial nuclei', { minimum: 0, maximum: 1e30, exclusiveMinimum: true });
  const elapsed = finite(elapsedHalfLives, 'Elapsed half-lives', { minimum: 0, maximum: 12 });
  const decayConstantPerSecond = Math.log(2) / challenge.halfLifeSeconds;
  const parentFraction = 2 ** (-elapsed);
  const parentNuclei = initial * parentFraction;
  const decayedNuclei = initial - parentNuclei;
  const activityBq = decayConstantPerSecond * parentNuclei;
  const initialActivityBq = decayConstantPerSecond * initial;
  const curve = Array.from({ length: 81 }, (_, index) => {
    const halfLives = index / 10;
    const fraction = 2 ** (-halfLives);
    return { halfLives, parentFraction: fraction, daughterFraction: 1 - fraction, activityFraction: fraction };
  });
  return deepFreeze({
    challengeId,
    challenge,
    parent: NUCLIDE_BY_ID[challenge.parentId],
    daughter: NUCLIDE_BY_ID[challenge.daughterId],
    inputs: { initialNuclei: initial, elapsedHalfLives: elapsed },
    elapsedSeconds: elapsed * challenge.halfLifeSeconds,
    decayConstantPerSecond,
    parentFraction,
    daughterFraction: 1 - parentFraction,
    parentNuclei,
    decayedNuclei,
    daughterNuclei: decayedNuclei,
    activityBq,
    initialActivityBq,
    curve,
    expectedClaims: {
      parentBand: parentBandFor(parentFraction),
      activityTrend: elapsed === 0 ? 'same-as-initial' : 'below-initial',
      halfLifeResponse: 'unchanged-by-starting-count',
      daughterRelation: 'equals-decayed-parent',
    },
    equationLedger: [
      `λ = ln(2)/t½ = ${scientific(decayConstantPerSecond)} s⁻¹`,
      `N/N₀ = 2^(−${elapsed.toFixed(3)}) = ${parentFraction.toFixed(8)}`,
      `A = λN = ${scientific(activityBq)} s⁻¹ (Bq)`,
      `Expected parent + declared daughter = ${scientific(parentNuclei)} + ${scientific(decayedNuclei)} = ${scientific(initial)}`,
    ],
    boundary: NUCLEAR_MODEL_BOUNDARY,
  });
}

const halfLifePredictionFields = {
  parentBand: ['all-parent', 'more-than-half', 'one-half', 'quarter-to-half', 'one-quarter', 'less-than-quarter'],
  activityTrend: ['same-as-initial', 'below-initial', 'above-initial'],
  halfLifeResponse: ['shorter-with-more-starting-nuclei', 'longer-with-more-starting-nuclei', 'unchanged-by-starting-count'],
  daughterRelation: ['equals-decayed-parent', 'equals-parent-left', 'cannot-relate'],
};

export function evaluateHalfLifeAttempt({ analysis, prediction }) {
  requireObject(analysis, 'Half-life analysis');
  validatePrediction(prediction, halfLifePredictionFields, 'Half-life prediction');
  const expected = analysis.expectedClaims;
  const reasons = {
    parentBand: `${analysis.inputs.elapsedHalfLives.toFixed(3)} half-lives leave ${(analysis.parentFraction * 100).toFixed(6)}% of the ideal expected parent population.`,
    activityTrend: analysis.inputs.elapsedHalfLives === 0
      ? 'At zero elapsed time the activity equals its initial value by definition.'
      : `Activity is λN. The same λ multiplies a smaller parent population, so activity is ${(analysis.activityBq / analysis.initialActivityBq * 100).toFixed(6)}% of its initial value.`,
    halfLifeResponse: 'Changing the starting count scales N and activity but does not change the frozen decay constant or evaluated half-life.',
    daughterRelation: `This one-step, one-to-one expected-value ledger makes expected daughter count equal parent nuclei lost on this window. ${analysis.challenge.daughterWindow}`,
  };
  const dimensions = Object.fromEntries(Object.keys(halfLifePredictionFields).map((key) => [key, {
    learner: prediction[key], expected: expected[key], correct: prediction[key] === expected[key], reason: reasons[key],
  }]));
  return deepFreeze({ dimensions, score: { correct: Object.values(dimensions).filter((item) => item.correct).length, total: 4 } });
}

export function nextHalfLifeHint({ analysis, level }) {
  requireObject(analysis, 'Half-life analysis');
  if (!Number.isInteger(level) || level < 1 || level > 4) throw new RangeError('Half-life hint level must be 1 through 4.');
  return deepFreeze([
    `One half-life multiplies the expected parent count by 1/2. The selected clock is ${analysis.challenge.halfLifeDisplay}; starting amount does not appear in that definition.`,
    `Use N/N₀ = (1/2)^n with n = ${analysis.inputs.elapsedHalfLives.toFixed(3)}. Keep this expected fraction separate from one random nucleus and from one detector count.`,
    `Activity follows A = λN and λ = ln(2)/t½. Once the nuclide is fixed, activity and parent count fall by the same fraction.`,
    `The ideal result is ${(analysis.parentFraction * 100).toFixed(6)}% parent, ${(analysis.daughterFraction * 100).toFixed(6)}% declared daughter, and ${scientific(analysis.activityBq)} Bq. This hint changes no input or claim.`,
  ][level - 1]);
}

const bindingPoint = (nucleus) => {
  const neutronCount = nucleus.massNumber - nucleus.atomicNumber;
  const massDefectU = nucleus.atomicNumber * NUCLEAR_CONSTANTS.hydrogenAtomMassU
    + neutronCount * NUCLEAR_CONSTANTS.neutronMassU
    - nucleus.atomicMassU;
  const bindingEnergyMeV = massDefectU * NUCLEAR_CONSTANTS.atomicMassEnergyMeV;
  return {
    ...nucleus,
    neutronCount,
    separatedNeutralAtomLedgerU: nucleus.atomicNumber * NUCLEAR_CONSTANTS.hydrogenAtomMassU + neutronCount * NUCLEAR_CONSTANTS.neutronMassU,
    massDefectU,
    bindingEnergyMeV,
    bindingEnergyPerNucleonMeV: bindingEnergyMeV / nucleus.massNumber,
  };
};

export function analyzeBindingRidge({ leftId, rightId }) {
  const leftRecord = BINDING_NUCLEUS_BY_ID[leftId];
  const rightRecord = BINDING_NUCLEUS_BY_ID[rightId];
  if (!leftRecord || !rightRecord) throw new RangeError('Both binding-ridge nuclei must be selected records.');
  if (leftId === rightId) throw new RangeError('Binding-ridge comparison requires two different nuclei.');
  const ridge = BINDING_NUCLEI.map(bindingPoint).sort((left, right) => left.massNumber - right.massNumber);
  const left = ridge.find((item) => item.id === leftId);
  const right = ridge.find((item) => item.id === rightId);
  const largerPerNucleonId = left.bindingEnergyPerNucleonMeV > right.bindingEnergyPerNucleonMeV ? left.id : right.id;
  const largerTotalBindingId = left.bindingEnergyMeV > right.bindingEnergyMeV ? left.id : right.id;
  return deepFreeze({
    leftId,
    rightId,
    left,
    right,
    ridge,
    ridgePeak: ridge.reduce((best, item) => item.bindingEnergyPerNucleonMeV > best.bindingEnergyPerNucleonMeV ? item : best),
    expectedClaims: {
      largerPerNucleonId,
      largerTotalBindingId,
      massDefectSign: 'both-positive',
      inferenceClaim: 'curve-only-not-pathway',
    },
    ledgers: [left, right].map((item) => ({
      id: item.id,
      equation: `Δm = ${item.atomicNumber}m(¹H) + ${item.neutronCount}mₙ − m(${item.code}) = ${item.massDefectU.toFixed(9)} u`,
      energy: `BE = ${item.bindingEnergyMeV.toFixed(6)} MeV; BE/A = ${item.bindingEnergyPerNucleonMeV.toFixed(6)} MeV`,
    })),
    boundary: NUCLEAR_MODEL_BOUNDARY,
  });
}

export function evaluateBindingAttempt({ analysis, prediction }) {
  requireObject(analysis, 'Binding analysis');
  const fields = {
    largerPerNucleonId: [analysis.leftId, analysis.rightId],
    largerTotalBindingId: [analysis.leftId, analysis.rightId],
    massDefectSign: ['both-positive', 'both-negative', 'one-of-each'],
    inferenceClaim: ['curve-proves-feasible-reaction', 'curve-only-not-pathway'],
  };
  validatePrediction(prediction, fields, 'Binding prediction');
  const expected = analysis.expectedClaims;
  const reasons = {
    largerPerNucleonId: `${analysis.left.code} has ${analysis.left.bindingEnergyPerNucleonMeV.toFixed(6)} MeV/nucleon; ${analysis.right.code} has ${analysis.right.bindingEnergyPerNucleonMeV.toFixed(6)} MeV/nucleon.`,
    largerTotalBindingId: `Total binding scales with both the per-nucleon value and A: ${analysis.left.code} has ${analysis.left.bindingEnergyMeV.toFixed(6)} MeV total; ${analysis.right.code} has ${analysis.right.bindingEnergyMeV.toFixed(6)} MeV total.`,
    massDefectSign: `For both selected bound nuclei, the separated neutral-atom-plus-neutron ledger exceeds the atomic mass, so Δm is positive in the declared convention.`,
    inferenceClaim: 'A ridge comparison does not supply a reaction pathway, barrier, conservation-complete products, Q value, cross section, rate, or engineering conversion process.',
  };
  const dimensions = Object.fromEntries(Object.keys(fields).map((key) => [key, {
    learner: prediction[key], expected: expected[key], correct: prediction[key] === expected[key], reason: reasons[key],
  }]));
  return deepFreeze({ dimensions, score: { correct: Object.values(dimensions).filter((item) => item.correct).length, total: 4 } });
}

export function nextBindingHint({ analysis, level }) {
  requireObject(analysis, 'Binding analysis');
  if (!Number.isInteger(level) || level < 1 || level > 4) throw new RangeError('Binding hint level must be 1 through 4.');
  return deepFreeze([
    `Compare like with like: total binding energy answers a different question from binding energy divided by mass number.`,
    `Build each mass defect from Z neutral hydrogen atoms, A−Z free neutrons, and the measured neutral atomic mass. This convention lets electron masses cancel to introductory precision.`,
    `${analysis.left.code}: Δm = ${analysis.left.massDefectU.toFixed(9)} u; ${analysis.right.code}: Δm = ${analysis.right.massDefectU.toFixed(9)} u. Multiply by ${NUCLEAR_CONSTANTS.atomicMassEnergyMeV} MeV/u, then divide by A only for the ridge height.`,
    `${analysis.ridgePeak.code} is the highest point only in this selected six-nucleus teaching subset. A higher or lower ridge endpoint alone does not construct a feasible reaction. This hint changes no pair or claim.`,
  ][level - 1]);
}
