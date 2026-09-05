import {
  CALORIMETRY_CHALLENGE_BY_ID,
  HESS_CHALLENGE_BY_ID,
  HESS_MULTIPLIERS,
  THERMOCHEMISTRY_SPECIES_BY_ID,
} from '../data/thermochemistryScenarios.js';

const EPSILON = 1e-10;

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
};

const closeTo = (left, right, tolerance = EPSILON) => (
  Math.abs(left - right) <= tolerance * Math.max(1, Math.abs(left), Math.abs(right))
);
const clean = (value) => Math.abs(value) < 1e-12 ? 0 : value;
const signOf = (value) => closeTo(value, 0) ? 'zero' : value > 0 ? 'positive' : 'negative';
const finite = (value, label) => {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite.`);
  return value;
};

const coefficientText = (value) => {
  const magnitude = Math.abs(value);
  if (closeTo(magnitude, 1)) return '';
  if (closeTo(magnitude, 0.5)) return '½';
  if (Number.isInteger(magnitude)) return String(magnitude);
  return String(Number(magnitude.toFixed(3)));
};

const equationTerm = (speciesId, coefficient) => {
  const species = THERMOCHEMISTRY_SPECIES_BY_ID[speciesId];
  return `${coefficientText(coefficient)}${species.display}`;
};

const formatEquation = (stoichiometry) => {
  const entries = Object.entries(stoichiometry).filter(([, coefficient]) => !closeTo(coefficient, 0));
  if (!entries.length) return 'No net reaction';
  const reactants = entries.filter(([, coefficient]) => coefficient < 0).map(([id, coefficient]) => equationTerm(id, coefficient));
  const products = entries.filter(([, coefficient]) => coefficient > 0).map(([id, coefficient]) => equationTerm(id, coefficient));
  return `${reactants.length ? reactants.join(' + ') : '∅'} → ${products.length ? products.join(' + ') : '∅'}`;
};

const formationEnthalpyFor = (stoichiometry) => Object.entries(stoichiometry).reduce((sum, [speciesId, coefficient]) => {
  const species = THERMOCHEMISTRY_SPECIES_BY_ID[speciesId];
  if (!species) throw new RangeError(`Unknown thermochemical species ${speciesId}.`);
  return sum + coefficient * species.formationEnthalpyKJmol;
}, 0);

const validHessAudit = (audit) => (
  audit
  && audit.kind === 'hess-cycle-audit'
  && audit.challenge
  && Array.isArray(audit.cards)
  && Array.isArray(audit.cancellationLanes)
  && Number.isFinite(audit.pathEnthalpyKJ)
);

export function auditHessCycle({ challengeId, multipliers } = {}) {
  const challenge = HESS_CHALLENGE_BY_ID[challengeId];
  if (!challenge) throw new RangeError(`Unknown Hess challenge: ${challengeId ?? 'missing'}.`);
  if (!Array.isArray(multipliers) || multipliers.length !== challenge.cards.length) {
    throw new TypeError('A Hess audit requires one multiplier per reaction card.');
  }
  multipliers.forEach((multiplier) => {
    if (!Number.isFinite(multiplier) || !HESS_MULTIPLIERS.includes(multiplier)) {
      throw new RangeError(`Every multiplier must be an allowed Hess multiplier: ${HESS_MULTIPLIERS.join(', ')}.`);
    }
  });

  const speciesOrder = [...new Set([
    ...Object.keys(challenge.target.stoichiometry),
    ...challenge.cards.flatMap((card) => Object.keys(card.stoichiometry)),
  ])];
  let cardFormationClosure = true;
  const cards = challenge.cards.map((card, index) => {
    const multiplier = multipliers[index];
    const formationEnthalpyKJ = formationEnthalpyFor(card.stoichiometry);
    if (!closeTo(formationEnthalpyKJ, card.deltaHkJPerReaction, 1e-9)) cardFormationClosure = false;
    const scaledStoichiometry = Object.fromEntries(Object.entries(card.stoichiometry).map(
      ([speciesId, coefficient]) => [speciesId, clean(coefficient * multiplier)],
    ));
    return {
      cardId: card.id,
      sourceLabel: card.label,
      sourceEnthalpyKJ: card.deltaHkJPerReaction,
      formationEnthalpyKJ,
      multiplier,
      orientation: multiplier < 0 ? 'reversed' : multiplier > 0 ? 'forward' : 'parked',
      scaleMagnitude: Math.abs(multiplier),
      scaledStoichiometry,
      orientedLabel: multiplier === 0 ? 'Card parked — no species contribution' : formatEquation(scaledStoichiometry),
      scaledEnthalpyKJ: clean(multiplier * card.deltaHkJPerReaction),
    };
  });

  const netAll = Object.fromEntries(speciesOrder.map((speciesId) => [
    speciesId,
    clean(cards.reduce((sum, card) => sum + (card.scaledStoichiometry[speciesId] ?? 0), 0)),
  ]));
  const netStoichiometry = Object.fromEntries(Object.entries(netAll).filter(([, coefficient]) => !closeTo(coefficient, 0)));
  const targetSpecies = new Set([...speciesOrder, ...Object.keys(challenge.target.stoichiometry)]);
  const targetMatched = [...targetSpecies].every((speciesId) => closeTo(
    netAll[speciesId] ?? 0,
    challenge.target.stoichiometry[speciesId] ?? 0,
  ));
  const pathEnthalpyKJ = clean(cards.reduce((sum, card) => sum + card.scaledEnthalpyKJ, 0));
  const netFormationEnthalpyKJ = clean(formationEnthalpyFor(netStoichiometry));
  const targetFormationEnthalpyKJ = clean(formationEnthalpyFor(challenge.target.stoichiometry));
  const targetFormationClosure = closeTo(targetFormationEnthalpyKJ, challenge.target.deltaHkJPerReaction, 1e-9);
  const pathFormationClosure = closeTo(pathEnthalpyKJ, netFormationEnthalpyKJ, 1e-9);
  if (targetMatched && (!cardFormationClosure || !targetFormationClosure || !pathFormationClosure)) {
    throw new Error('Matched Hess cycle failed selected formation-enthalpy closure.');
  }

  const cancellationLanes = speciesOrder.map((speciesId) => {
    const contributions = cards.map((card) => card.scaledStoichiometry[speciesId] ?? 0);
    const reactantMagnitude = contributions.filter((value) => value < 0).reduce((sum, value) => sum + Math.abs(value), 0);
    const productMagnitude = contributions.filter((value) => value > 0).reduce((sum, value) => sum + value, 0);
    return {
      speciesId,
      species: THERMOCHEMISTRY_SPECIES_BY_ID[speciesId],
      contributions,
      reactantMagnitude: clean(reactantMagnitude),
      productMagnitude: clean(productMagnitude),
      cancelledMagnitude: clean(Math.min(reactantMagnitude, productMagnitude)),
      netCoefficient: clean(productMagnitude - reactantMagnitude),
    };
  });

  return deepFreeze({
    kind: 'hess-cycle-audit',
    challenge,
    multipliers: [...multipliers],
    cards,
    netStoichiometry,
    netEquation: formatEquation(netStoichiometry),
    targetMatched,
    targetStatus: targetMatched ? 'matched' : 'not-matched',
    pathEnthalpyKJ,
    enthalpySign: signOf(pathEnthalpyKJ),
    netFormationEnthalpyKJ,
    targetFormationEnthalpyKJ,
    cardFormationClosure,
    targetFormationClosure,
    pathFormationClosure,
    cancellationLanes,
    equationLedger: [
      `ΔrH°path = ${cards.map((card) => `${card.multiplier} × (${card.sourceEnthalpyKJ.toFixed(3)})`).join(' + ')} = ${pathEnthalpyKJ.toFixed(3)} kJ`,
      `ΔrH°net,formation = ΣνiΔfH°i = ${netFormationEnthalpyKJ.toFixed(3)} kJ`,
      `ΔrH°target,formation = ${targetFormationEnthalpyKJ.toFixed(3)} kJ`,
    ],
  });
}

const completeHessPrediction = (prediction) => prediction && [
  'targetStatus', 'enthalpySign', 'scalingClaim', 'pathClaim',
].every((key) => typeof prediction[key] === 'string' && prediction[key].length > 0);

export function evaluateHessAttempt({ audit, prediction } = {}) {
  if (!validHessAudit(audit)) throw new TypeError('Hess evaluation requires a valid cycle audit.');
  if (!completeHessPrediction(prediction)) throw new TypeError('Hess evaluation requires a complete four-part Hess prediction.');
  const allowed = {
    targetStatus: ['matched', 'not-matched'],
    enthalpySign: ['negative', 'zero', 'positive'],
    scalingClaim: ['enthalpy-scales-with-equation', 'enthalpy-unchanged-by-scaling'],
    pathClaim: ['same-endpoints-same-deltaH', 'path-changes-deltaH'],
  };
  for (const [key, choices] of Object.entries(allowed)) {
    if (!choices.includes(prediction[key])) throw new RangeError(`Unrecognized Hess ${key} claim.`);
  }
  const expected = {
    targetStatus: audit.targetStatus,
    enthalpySign: audit.enthalpySign,
    scalingClaim: 'enthalpy-scales-with-equation',
    pathClaim: 'same-endpoints-same-deltaH',
  };
  const dimensions = {
    targetStatus: {
      learner: prediction.targetStatus,
      expected: expected.targetStatus,
      correct: prediction.targetStatus === expected.targetStatus,
      reason: audit.targetMatched
        ? `Every net species coefficient matches ${audit.challenge.target.label}; the target gate can open.`
        : `The net equation is ${audit.netEquation}. Uncancelled species remain, so it is not the displayed target.`,
    },
    enthalpySign: {
      learner: prediction.enthalpySign,
      expected: expected.enthalpySign,
      correct: prediction.enthalpySign === expected.enthalpySign,
      reason: `The signed card sum is ${audit.pathEnthalpyKJ.toFixed(3)} kJ per displayed net reaction, so its sign is ${audit.enthalpySign}.`,
    },
    scalingClaim: {
      learner: prediction.scalingClaim,
      expected: expected.scalingClaim,
      correct: prediction.scalingClaim === expected.scalingClaim,
      reason: 'Reaction enthalpy is extensive with the written reaction extent: reversing changes the sign and multiplying the equation multiplies ΔrH° by the same scalar.',
    },
    pathClaim: {
      learner: prediction.pathClaim,
      expected: expected.pathClaim,
      correct: prediction.pathClaim === expected.pathClaim,
      reason: 'Enthalpy is a state function. Any correctly closed path between the same declared initial and final thermodynamic states has the same ΔrH° within the selected data ledger.',
    },
  };
  const correct = Object.values(dimensions).filter((dimension) => dimension.correct).length;
  return deepFreeze({
    kind: 'hess-cycle-evaluation', committed: true,
    learnerPrediction: { ...prediction }, expected, dimensions,
    score: { correct, total: 4 },
  });
}

export function nextHessHint({ audit, prediction = {}, level } = {}) {
  if (!validHessAudit(audit)) throw new TypeError('Hess hinting requires a valid cycle audit.');
  if (!Number.isInteger(level) || level < 1 || level > 4) throw new RangeError('Hess hint level must be between 1 and 4.');
  if (level === 1) return `Read the target as a signed species vector: ${audit.challenge.target.label}. Species on the left need negative net coefficients; species on the right need positive ones.`;
  if (level === 2) {
    const index = audit.challenge.expectedMultipliers.findIndex((value, cardIndex) => Math.sign(value) !== Math.sign(audit.multipliers[cardIndex]));
    const usefulIndex = index < 0 ? 0 : index;
    const useful = audit.challenge.cards[usefulIndex];
    const expected = audit.challenge.expectedMultipliers[usefulIndex];
    return `Inspect “${useful.label}”. The target needs this card ${expected < 0 ? 'reversed' : 'forward'}; its required magnitude is not yet being revealed.`;
  }
  if (level === 3) {
    const remainder = audit.cancellationLanes.filter((lane) => !closeTo(lane.netCoefficient, 0)).map((lane) => `${lane.species.display} ${lane.netCoefficient > 0 ? '+' : ''}${lane.netCoefficient}`).join(', ');
    return `The current uncancelled net ledger is ${remainder || 'empty'}. Compare those signs and magnitudes with the target before changing another tile.`;
  }
  return `Exact target multipliers are [${audit.challenge.expectedMultipliers.join(', ')}]. Reversal and scaling must act on the equation and ΔrH° together; matching the state-function ledger still does not prove reaction occurrence, mechanism, or rate.`;
}

const CALORIMETRY_BOUNDS = {
  solutionMassG: [1, 1000, 'solution mass'],
  specificHeatJgK: [0.1, 10, 'specific heat'],
  temperatureChangeK: [-50, 50, 'temperature change'],
  calorimeterConstantJK: [0, 1000, 'calorimeter constant'],
  reactionExtentMol: [0.0001, 10, 'reaction extent'],
};

const validCalorimetryBalance = (balance) => (
  balance
  && balance.kind === 'calorimetry-balance'
  && balance.challenge
  && Number.isFinite(balance.qSystemJ)
  && Number.isFinite(balance.molarReactionEnthalpyKJmol)
);

export function balanceCalorimetry({ challengeId, inputs } = {}) {
  const challenge = CALORIMETRY_CHALLENGE_BY_ID[challengeId];
  if (!challenge) throw new RangeError(`Unknown calorimetry challenge: ${challengeId ?? 'missing'}.`);
  if (!inputs || typeof inputs !== 'object') throw new TypeError('Calorimetry inputs are required.');
  const normalized = {};
  for (const [key, [minimum, maximum, label]] of Object.entries(CALORIMETRY_BOUNDS)) {
    const value = finite(inputs[key], `Calorimetry ${label}`);
    if (value < minimum || value > maximum) throw new RangeError(`Calorimetry ${label} must be between ${minimum} and ${maximum}.`);
    normalized[key] = value;
  }

  const qSolutionJ = clean(normalized.solutionMassG * normalized.specificHeatJgK * normalized.temperatureChangeK);
  const qCalorimeterJ = clean(normalized.calorimeterConstantJK * normalized.temperatureChangeK);
  const qSurroundingsJ = clean(qSolutionJ + qCalorimeterJ);
  const qSystemJ = clean(-qSurroundingsJ);
  const molarReactionEnthalpyKJmol = clean(qSystemJ / 1000 / normalized.reactionExtentMol);
  const noVesselSystemJ = clean(-qSolutionJ);
  const noVesselMolarReactionEnthalpyKJmol = clean(noVesselSystemJ / 1000 / normalized.reactionExtentMol);
  const vesselDifferenceKJmol = clean(molarReactionEnthalpyKJmol - noVesselMolarReactionEnthalpyKJmol);
  const vesselOmissionPercent = closeTo(molarReactionEnthalpyKJmol, 0)
    ? 0
    : 100 * Math.abs(vesselDifferenceKJmol) / Math.abs(molarReactionEnthalpyKJmol);
  const temperatureDirection = signOf(normalized.temperatureChangeK) === 'positive' ? 'rise'
    : signOf(normalized.temperatureChangeK) === 'negative' ? 'fall' : 'no-change';
  const surroundingsSign = signOf(qSurroundingsJ);
  const systemSign = signOf(qSystemJ);
  const reactionKind = systemSign === 'negative' ? 'exothermic' : systemSign === 'positive' ? 'endothermic' : 'zero';
  const vesselClaim = normalized.calorimeterConstantJK > 0 && !closeTo(normalized.temperatureChangeK, 0)
    ? 'including-vessel-increases-magnitude'
    : 'no-effect';

  if (!closeTo(qSystemJ + qSurroundingsJ, 0, 1e-12)) throw new Error('Calorimetry system-surroundings heat closure failed.');

  return deepFreeze({
    kind: 'calorimetry-balance', challenge, inputs: normalized,
    qSolutionJ, qCalorimeterJ, qSurroundingsJ, qSystemJ,
    molarReactionEnthalpyKJmol,
    noVesselSystemJ,
    noVesselMolarReactionEnthalpyKJmol,
    vesselDifferenceKJmol,
    vesselOmissionPercent,
    temperatureDirection,
    surroundingsSign,
    systemSign,
    reactionKind,
    vesselClaim,
    heatDirection: qSystemJ < 0 ? 'system-to-surroundings' : qSystemJ > 0 ? 'surroundings-to-system' : 'no-net-heat',
    equationLedger: [
      `qsolution = ${normalized.solutionMassG.toFixed(3)} × ${normalized.specificHeatJgK.toFixed(3)} × ${normalized.temperatureChangeK.toFixed(3)} = ${qSolutionJ.toFixed(3)} J`,
      `qcal = ${normalized.calorimeterConstantJK.toFixed(3)} × ${normalized.temperatureChangeK.toFixed(3)} = ${qCalorimeterJ.toFixed(3)} J`,
      `qsurroundings = ${qSolutionJ.toFixed(3)} + ${qCalorimeterJ.toFixed(3)} = ${qSurroundingsJ.toFixed(3)} J`,
      `qsystem = -qsurroundings = ${qSystemJ.toFixed(3)} J`,
      `ΔHreaction = ${qSystemJ.toFixed(3)} / 1000 / ${normalized.reactionExtentMol.toFixed(5)} = ${molarReactionEnthalpyKJmol.toFixed(4)} kJ mol⁻¹ reaction`,
    ],
  });
}

const completeCalorimetryPrediction = (prediction) => prediction && [
  'temperatureDirection', 'surroundingsSign', 'reactionKind', 'vesselClaim',
].every((key) => typeof prediction[key] === 'string' && prediction[key].length > 0);

export function evaluateCalorimetryAttempt({ balance, prediction } = {}) {
  if (!validCalorimetryBalance(balance)) throw new TypeError('Calorimetry evaluation requires a valid heat balance.');
  if (!completeCalorimetryPrediction(prediction)) throw new TypeError('Calorimetry evaluation requires a complete four-part calorimetry prediction.');
  const allowed = {
    temperatureDirection: ['rise', 'fall', 'no-change'],
    surroundingsSign: ['positive', 'negative', 'zero'],
    reactionKind: ['exothermic', 'endothermic', 'zero'],
    vesselClaim: ['including-vessel-increases-magnitude', 'no-effect'],
  };
  for (const [key, choices] of Object.entries(allowed)) {
    if (!choices.includes(prediction[key])) throw new RangeError(`Unrecognized calorimetry ${key} claim.`);
  }
  const expected = {
    temperatureDirection: balance.temperatureDirection,
    surroundingsSign: balance.surroundingsSign,
    reactionKind: balance.reactionKind,
    vesselClaim: balance.vesselClaim,
  };
  const dimensions = {
    temperatureDirection: {
      learner: prediction.temperatureDirection, expected: expected.temperatureDirection,
      correct: prediction.temperatureDirection === expected.temperatureDirection,
      reason: `The entered synthetic observation is ΔT = ${balance.inputs.temperatureChangeK.toFixed(3)} K, so the displayed temperature direction is ${balance.temperatureDirection}.`,
    },
    surroundingsSign: {
      learner: prediction.surroundingsSign, expected: expected.surroundingsSign,
      correct: prediction.surroundingsSign === expected.surroundingsSign,
      reason: `qsolution + qcal = ${balance.qSurroundingsJ.toFixed(3)} J, so the surroundings heat sign is ${balance.surroundingsSign}.`,
    },
    reactionKind: {
      learner: prediction.reactionKind, expected: expected.reactionKind,
      correct: prediction.reactionKind === expected.reactionKind,
      reason: `The declared adiabatic boundary gives qsystem = -qsurroundings = ${balance.qSystemJ.toFixed(3)} J; the inferred system result is ${balance.reactionKind}.`,
    },
    vesselClaim: {
      learner: prediction.vesselClaim, expected: expected.vesselClaim,
      correct: prediction.vesselClaim === expected.vesselClaim,
      reason: balance.vesselClaim === 'including-vessel-increases-magnitude'
        ? `The vessel contributes ${balance.qCalorimeterJ.toFixed(3)} J and changes the inferred molar magnitude by ${balance.vesselOmissionPercent.toFixed(2)}% relative to the complete displayed ledger.`
        : 'The vessel term is zero for this displayed state, so including it does not change the result.',
    },
  };
  const correct = Object.values(dimensions).filter((dimension) => dimension.correct).length;
  return deepFreeze({
    kind: 'calorimetry-evaluation', committed: true,
    learnerPrediction: { ...prediction }, expected, dimensions,
    score: { correct, total: 4 },
  });
}

export function nextCalorimetryHint({ balance, prediction = {}, level } = {}) {
  if (!validCalorimetryBalance(balance)) throw new TypeError('Calorimetry hinting requires a valid heat balance.');
  if (!Number.isInteger(level) || level < 1 || level > 4) throw new RangeError('Calorimetry hint level must be between 1 and 4.');
  if (level === 1) return `Begin with the observed thermometer coordinate: ΔT is ${balance.inputs.temperatureChangeK.toFixed(3)} K. Its sign tells you whether the displayed solution and vessel warm, cool, or do not change.`;
  if (level === 2) return `The solution term is m cp ΔT = ${balance.qSolutionJ.toFixed(3)} J and the vessel term is Ccal ΔT = ${balance.qCalorimeterJ.toFixed(3)} J. Keep both signs before adding them.`;
  if (level === 3) return `The surroundings sum is ${balance.qSurroundingsJ.toFixed(3)} J. Under the declared adiabatic boundary, the system has the opposite value: ${balance.qSystemJ.toFixed(3)} J.`;
  return `Normalizing by ξ = ${balance.inputs.reactionExtentMol.toFixed(5)} mol gives ${balance.molarReactionEnthalpyKJmol.toFixed(4)} kJ mol⁻¹ reaction. This synthetic heat ledger does not establish identity, mechanism, reaction occurrence, calibration, or experimental validity.`;
}
