import {
  CHEMICAL_EQUILIBRIUM_SCENARIO_BY_ID,
} from '../data/chemicalEquilibriumScenarios.js';

export const GAS_CONSTANT_L_BAR = 0.08314462618;
export const GAS_CONSTANT_J = 8.314462618;
export const STANDARD_PRESSURE_BAR = 1;

const EQUILIBRIUM_LOG_TOLERANCE = 1e-8;
const ROOT_LOG_TOLERANCE = 1e-12;
const ROOT_EXTENT_TOLERANCE = 1e-12;
const COMPARISON_TOLERANCE = 1e-8;
const MAX_ROOT_ITERATIONS = 200;

const RELATION_META = Object.freeze({
  below: Object.freeze({ id: 'below', label: 'Q < K', direction: 'forward' }),
  equal: Object.freeze({ id: 'equal', label: 'Q = K', direction: 'none' }),
  above: Object.freeze({ id: 'above', label: 'Q > K', direction: 'reverse' }),
  undefined: Object.freeze({ id: 'undefined', label: 'Q undefined', direction: 'undefined' }),
});

const DIRECTION_META = Object.freeze({
  forward: Object.freeze({ id: 'forward', label: 'Net forward readjustment', symbol: '→' }),
  none: Object.freeze({ id: 'none', label: 'No net thermodynamic readjustment', symbol: '⇌' }),
  reverse: Object.freeze({ id: 'reverse', label: 'Net reverse readjustment', symbol: '←' }),
  undefined: Object.freeze({ id: 'undefined', label: 'Direction undefined', symbol: '?' }),
});

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
}

function finiteNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${label} must be a finite number.`);
  return number;
}

function positiveNumber(value, label) {
  const number = finiteNumber(value, label);
  if (number <= 0) throw new RangeError(`${label} must be greater than zero.`);
  return number;
}

function nonnegativeNumber(value, label) {
  const number = finiteNumber(value, label);
  if (number < 0) throw new RangeError(`${label} must be nonnegative.`);
  return number;
}

function scenarioById(scenarioId) {
  const scenario = CHEMICAL_EQUILIBRIUM_SCENARIO_BY_ID[scenarioId];
  if (!scenario) throw new RangeError(`Unknown chemical-equilibrium scenario: ${scenarioId}.`);
  return scenario;
}

function normaliseAmounts(scenario, amounts) {
  if (!amounts || typeof amounts !== 'object') throw new TypeError('Species amounts must be an object keyed by species ID.');
  return Object.fromEntries(scenario.species.map((species) => [
    species.id,
    nonnegativeNumber(amounts[species.id], `${species.formula} amount`),
  ]));
}

function normaliseConstraint(constraint) {
  if (!constraint || typeof constraint !== 'object') throw new TypeError('A volume or pressure constraint is required.');
  if (constraint.type === 'volume') {
    return { type: 'volume', volumeL: positiveNumber(constraint.volumeL, 'Volume') };
  }
  if (constraint.type === 'pressure') {
    return { type: 'pressure', pressureBar: positiveNumber(constraint.pressureBar, 'Total pressure') };
  }
  throw new RangeError(`Unknown equilibrium constraint: ${constraint.type}.`);
}

function safeExponential(logValue) {
  if (logValue === Infinity) return Infinity;
  if (logValue === -Infinity) return 0;
  if (logValue > 709) return Infinity;
  if (logValue < -745) return 0;
  return Math.exp(logValue);
}

function compareLogRatio(logRatio) {
  if (logRatio === null || Number.isNaN(logRatio)) return 'undefined';
  if (logRatio === -Infinity || logRatio < -EQUILIBRIUM_LOG_TOLERANCE) return 'below';
  if (logRatio === Infinity || logRatio > EQUILIBRIUM_LOG_TOLERANCE) return 'above';
  return 'equal';
}

function quotientFromActivities(scenario, activities) {
  let zeroNumerator = false;
  let zeroDenominator = false;
  let logValue = 0;
  for (const species of scenario.species) {
    const activity = activities[species.id];
    if (activity === 0) {
      if (species.nu > 0) zeroNumerator = true;
      else zeroDenominator = true;
      continue;
    }
    logValue += species.nu * Math.log(activity);
  }

  let value;
  let resolvedLogValue;
  if (zeroNumerator && zeroDenominator) {
    value = null;
    resolvedLogValue = null;
  } else if (zeroNumerator) {
    value = 0;
    resolvedLogValue = -Infinity;
  } else if (zeroDenominator) {
    value = Infinity;
    resolvedLogValue = Infinity;
  } else {
    value = safeExponential(logValue);
    resolvedLogValue = logValue;
  }

  const logK = Math.log(scenario.equilibriumConstant);
  const logRatio = resolvedLogValue === null ? null : resolvedLogValue - logK;
  const ratioToK = logRatio === null ? null : safeExponential(logRatio);
  const relation = compareLogRatio(logRatio);
  const directionId = RELATION_META[relation].direction;
  const deltaRGJMol = logRatio === null ? null : GAS_CONSTANT_J * scenario.temperatureK * logRatio;

  return deepFreeze({
    value,
    logValue: resolvedLogValue,
    equilibriumConstant: scenario.equilibriumConstant,
    logEquilibriumConstant: logK,
    ratioToK,
    logRatio,
    relation,
    relationLabel: RELATION_META[relation].label,
    direction: DIRECTION_META[directionId],
    deltaRGJMol,
    expression: scenario.quotientExpression,
    standardPressureBar: STANDARD_PRESSURE_BAR,
    indeterminate: relation === 'undefined',
  });
}

export function reactionExtentBounds({ scenarioId, amounts }) {
  const scenario = scenarioById(scenarioId);
  const normalized = normaliseAmounts(scenario, amounts);
  let minimumMol = -Infinity;
  let maximumMol = Infinity;
  const constraints = [];

  for (const species of scenario.species) {
    const amount = normalized[species.id];
    if (species.nu > 0) {
      const bound = -amount / species.nu;
      minimumMol = Math.max(minimumMol, bound);
      constraints.push({ speciesId: species.id, kind: 'minimum', boundMol: bound });
    } else {
      const bound = amount / -species.nu;
      maximumMol = Math.min(maximumMol, bound);
      constraints.push({ speciesId: species.id, kind: 'maximum', boundMol: bound });
    }
  }

  if (!Number.isFinite(minimumMol) || !Number.isFinite(maximumMol) || minimumMol > maximumMol) {
    throw new RangeError('The declared amounts do not define a feasible one-reaction extent interval.');
  }
  return deepFreeze({ minimumMol, maximumMol, spanMol: maximumMol - minimumMol, constraints });
}

function amountsAtExtent(scenario, startAmounts, extentMol) {
  const amounts = {};
  for (const species of scenario.species) {
    const raw = startAmounts[species.id] + species.nu * extentMol;
    if (raw < -1e-10) throw new RangeError(`Extent would make ${species.formula} amount negative.`);
    amounts[species.id] = Math.abs(raw) < 1e-13 ? 0 : raw;
  }
  return amounts;
}

export function analyzeReactionState({ scenarioId, amounts, constraint, inertMoles = 0 }) {
  const scenario = scenarioById(scenarioId);
  const normalizedAmounts = normaliseAmounts(scenario, amounts);
  const normalizedConstraint = normaliseConstraint(constraint);
  const normalizedInert = nonnegativeNumber(inertMoles, 'Inert-gas amount');
  const reactingMoles = Object.values(normalizedAmounts).reduce((sum, amount) => sum + amount, 0);
  const totalMoles = reactingMoles + normalizedInert;

  let volumeL;
  let totalPressureBar;
  if (normalizedConstraint.type === 'volume') {
    volumeL = normalizedConstraint.volumeL;
    totalPressureBar = totalMoles * GAS_CONSTANT_L_BAR * scenario.temperatureK / volumeL;
  } else {
    if (totalMoles <= 0) throw new RangeError('A fixed-pressure state must contain reacting or inert material.');
    totalPressureBar = normalizedConstraint.pressureBar;
    volumeL = totalMoles * GAS_CONSTANT_L_BAR * scenario.temperatureK / totalPressureBar;
  }

  const partialPressuresBar = {};
  const activities = {};
  const moleFractions = {};
  for (const species of scenario.species) {
    const amount = normalizedAmounts[species.id];
    const pressureBar = normalizedConstraint.type === 'volume'
      ? amount * GAS_CONSTANT_L_BAR * scenario.temperatureK / volumeL
      : amount / totalMoles * totalPressureBar;
    partialPressuresBar[species.id] = pressureBar;
    activities[species.id] = pressureBar / STANDARD_PRESSURE_BAR;
    moleFractions[species.id] = totalMoles > 0 ? amount / totalMoles : 0;
  }
  const reactingPressureBar = Object.values(partialPressuresBar).reduce((sum, pressure) => sum + pressure, 0);
  const inertPressureBar = Math.max(0, totalPressureBar - reactingPressureBar);
  const quotient = quotientFromActivities(scenario, activities);

  return deepFreeze({
    scenarioId: scenario.id,
    temperatureK: scenario.temperatureK,
    amounts: normalizedAmounts,
    inertMoles: normalizedInert,
    constraint: normalizedConstraint,
    volumeL,
    totalMoles,
    reactingMoles,
    totalPressureBar,
    reactingPressureBar,
    inertPressureBar,
    partialPressuresBar,
    activities,
    moleFractions,
    quotient,
    equations: {
      activity: 'ai = pi/p°',
      idealGas: normalizedConstraint.type === 'volume' ? 'pi = niRT/V' : 'pi = yi ptotal',
      freeEnergy: 'ΔrG = RT ln(Q/K)',
    },
  });
}

export function solveChemicalEquilibrium({ scenarioId, amounts, constraint, inertMoles = 0 }) {
  const scenario = scenarioById(scenarioId);
  const startAmounts = normaliseAmounts(scenario, amounts);
  const reactingMaterial = Object.values(startAmounts).reduce((sum, amount) => sum + amount, 0);
  if (reactingMaterial <= 0) throw new RangeError('Chemical-equilibrium solving requires reacting material.');
  const normalizedConstraint = normaliseConstraint(constraint);
  const normalizedInert = nonnegativeNumber(inertMoles, 'Inert-gas amount');
  const bounds = reactionExtentBounds({ scenarioId: scenario.id, amounts: startAmounts });
  const start = analyzeReactionState({
    scenarioId: scenario.id,
    amounts: startAmounts,
    constraint: normalizedConstraint,
    inertMoles: normalizedInert,
  });

  if (start.quotient.relation === 'equal') {
    return deepFreeze({
      scenarioId: scenario.id,
      scenario,
      input: { amounts: startAmounts, constraint: normalizedConstraint, inertMoles: normalizedInert },
      start,
      extent: {
        minimumMol: bounds.minimumMol,
        maximumMol: bounds.maximumMol,
        equilibriumMol: 0,
        fractionAcrossFeasibleInterval: bounds.spanMol > 0 ? (0 - bounds.minimumMol) / bounds.spanMol : 0,
        iterations: 0,
        residualLogQK: start.quotient.logRatio,
      },
      equilibrium: start,
      resultKind: 'Fixed-temperature single-reaction ideal-gas equilibrium',
    });
  }

  if (bounds.spanMol <= 0) throw new RangeError('No nonzero feasible reaction extent exists for the supplied reacting material.');
  const edgeInset = Math.max(bounds.spanMol * 1e-12, 1e-14);
  let lower = bounds.minimumMol + edgeInset;
  let upper = bounds.maximumMol - edgeInset;
  if (!(upper > lower)) throw new RangeError('The feasible reaction extent is too narrow to solve.');

  const evaluate = (extentMol) => analyzeReactionState({
    scenarioId: scenario.id,
    amounts: amountsAtExtent(scenario, startAmounts, extentMol),
    constraint: normalizedConstraint,
    inertMoles: normalizedInert,
  }).quotient.logRatio;

  let lowerResidual = evaluate(lower);
  let upperResidual = evaluate(upper);
  if (!(lowerResidual < 0) || !(upperResidual > 0)) {
    throw new RangeError('The feasible extent interval does not bracket a finite equilibrium for this model.');
  }

  let equilibriumMol = (lower + upper) / 2;
  let residualLogQK = evaluate(equilibriumMol);
  let iterations = 0;
  for (iterations = 1; iterations <= MAX_ROOT_ITERATIONS; iterations += 1) {
    equilibriumMol = (lower + upper) / 2;
    residualLogQK = evaluate(equilibriumMol);
    if (Math.abs(residualLogQK) <= ROOT_LOG_TOLERANCE || upper - lower <= ROOT_EXTENT_TOLERANCE) break;
    if (residualLogQK > 0) {
      upper = equilibriumMol;
      upperResidual = residualLogQK;
    } else {
      lower = equilibriumMol;
      lowerResidual = residualLogQK;
    }
  }
  if (iterations > MAX_ROOT_ITERATIONS) throw new Error('Chemical-equilibrium root solver did not converge.');

  const equilibriumAmounts = amountsAtExtent(scenario, startAmounts, equilibriumMol);
  const equilibrium = analyzeReactionState({
    scenarioId: scenario.id,
    amounts: equilibriumAmounts,
    constraint: normalizedConstraint,
    inertMoles: normalizedInert,
  });
  return deepFreeze({
    scenarioId: scenario.id,
    scenario,
    input: { amounts: startAmounts, constraint: normalizedConstraint, inertMoles: normalizedInert },
    start,
    extent: {
      minimumMol: bounds.minimumMol,
      maximumMol: bounds.maximumMol,
      equilibriumMol,
      fractionAcrossFeasibleInterval: (equilibriumMol - bounds.minimumMol) / bounds.spanMol,
      iterations,
      residualLogQK: equilibrium.quotient.logRatio,
      bracketResiduals: { lower: lowerResidual, upper: upperResidual },
    },
    equilibrium,
    resultKind: 'Fixed-temperature single-reaction ideal-gas equilibrium',
  });
}

export function createDefaultChemicalEquilibrium(scenarioId = 'sulfuryl-chloride-dissociation') {
  const scenario = scenarioById(scenarioId);
  const amounts = Object.fromEntries(scenario.species.map((species) => [species.id, species.defaultAmountMol]));
  return solveChemicalEquilibrium({
    scenarioId: scenario.id,
    amounts,
    constraint: { type: 'volume', volumeL: scenario.defaultVolumeL },
    inertMoles: 0,
  });
}

function targetSpecies(scenario, targetSpeciesId) {
  const species = scenario.species.find((candidate) => candidate.id === targetSpeciesId);
  if (!species) throw new RangeError(`Unknown target species: ${targetSpeciesId}.`);
  return species;
}

function trendOf(after, before) {
  const scale = Math.max(1, Math.abs(after), Math.abs(before));
  if (Math.abs(after - before) <= COMPARISON_TOLERANCE * scale) return 'same';
  return after > before ? 'rises' : 'falls';
}

function ratioText(ratio) {
  if (ratio === null) return 'undefined';
  if (ratio === Infinity) return 'infinite';
  if (ratio === 0) return '0';
  if (ratio >= 1000 || ratio < 0.001) return ratio.toExponential(3);
  return ratio.toFixed(4);
}

export function runEquilibriumPerturbation({ baseline, perturbation }) {
  if (!baseline || !baseline.scenarioId || !baseline.equilibrium) {
    throw new TypeError('A solved equilibrium baseline is required.');
  }
  if (!perturbation || typeof perturbation !== 'object') throw new TypeError('A perturbation is required.');
  const scenario = scenarioById(baseline.scenarioId);
  const before = baseline.equilibrium;
  const amounts = { ...before.amounts };
  let inertMoles = before.inertMoles;
  let constraint = { ...before.constraint };
  let label;
  let actionReason;
  const normalized = { type: perturbation.type };

  if (perturbation.type === 'add-species' || perturbation.type === 'remove-species') {
    const species = targetSpecies(scenario, perturbation.targetSpeciesId);
    const amountMol = positiveNumber(perturbation.amountMol, 'Perturbation amount');
    normalized.targetSpeciesId = species.id;
    normalized.amountMol = amountMol;
    if (perturbation.type === 'add-species') {
      amounts[species.id] += amountMol;
      label = `Add ${amountMol.toFixed(3)} mol ${species.formula}`;
      actionReason = `Only ${species.formula} amount changes immediately; volume and temperature stay fixed.`;
    } else {
      if (amountMol > amounts[species.id] + 1e-12) {
        throw new RangeError(`Removal cannot exceed the ${species.formula} amount present at equilibrium.`);
      }
      amounts[species.id] = Math.max(0, amounts[species.id] - amountMol);
      label = `Remove ${amountMol.toFixed(3)} mol ${species.formula}`;
      actionReason = `Only ${species.formula} amount changes immediately; volume and temperature stay fixed.`;
    }
  } else if (perturbation.type === 'compress') {
    const factor = finiteNumber(perturbation.factor, 'Compression factor');
    if (factor <= 0 || factor >= 1) throw new RangeError('Compression factor must be greater than zero and less than one.');
    normalized.factor = factor;
    constraint = { type: 'volume', volumeL: before.volumeL * factor };
    label = `Compress to ${(factor * 100).toFixed(0)}% volume`;
    actionReason = 'Every reacting partial pressure rises immediately by the same inverse-volume factor.';
  } else if (perturbation.type === 'expand') {
    const factor = finiteNumber(perturbation.factor, 'Expansion factor');
    if (factor <= 1) throw new RangeError('Expansion factor must be greater than one.');
    normalized.factor = factor;
    constraint = { type: 'volume', volumeL: before.volumeL * factor };
    label = `Expand to ${(factor * 100).toFixed(0)}% volume`;
    actionReason = 'Every reacting partial pressure falls immediately by the same inverse-volume factor.';
  } else if (perturbation.type === 'catalyst') {
    label = 'Introduce an ideal catalyst';
    actionReason = 'A catalyst can change approach rate, but it does not alter the immediate composition, Q, K, or equilibrium state.';
  } else if (perturbation.type === 'inert-volume') {
    const amountMol = positiveNumber(perturbation.amountMol, 'Inert-gas amount');
    normalized.amountMol = amountMol;
    inertMoles += amountMol;
    constraint = { type: 'volume', volumeL: before.volumeL };
    label = `Add ${amountMol.toFixed(3)} mol inert gas at fixed V`;
    actionReason = 'At fixed volume and temperature, reacting-gas partial pressures depend on niRT/V and do not change when inert gas is added.';
  } else if (perturbation.type === 'inert-pressure') {
    const amountMol = positiveNumber(perturbation.amountMol, 'Inert-gas amount');
    normalized.amountMol = amountMol;
    inertMoles += amountMol;
    constraint = { type: 'pressure', pressureBar: before.totalPressureBar };
    label = `Add ${amountMol.toFixed(3)} mol inert gas at fixed p`;
    actionReason = 'At fixed total pressure and temperature, adding inert gas expands the volume and lowers every reacting partial pressure.';
  } else {
    throw new RangeError(`Unknown equilibrium perturbation: ${perturbation.type}.`);
  }

  const immediate = analyzeReactionState({
    scenarioId: scenario.id,
    amounts,
    constraint,
    inertMoles,
  });
  if (immediate.quotient.relation === 'undefined') {
    throw new RangeError('This perturbation leaves Q indeterminate because both reaction sides contain a zero-activity species.');
  }
  const solved = solveChemicalEquilibrium({
    scenarioId: scenario.id,
    amounts,
    constraint,
    inertMoles,
  });
  const after = solved.equilibrium;
  const probe = targetSpecies(scenario, scenario.probeSpeciesId);
  const probeTrend = trendOf(after.amounts[probe.id], before.amounts[probe.id]);
  const answer = {
    qRelation: immediate.quotient.relation,
    direction: immediate.quotient.direction.id,
    kChange: 'same',
    probeTrend,
    probeSpeciesId: probe.id,
    probeFormula: probe.formula,
    reason: `${actionReason} The immediate Q/K ratio is ${ratioText(immediate.quotient.ratioToK)}, so ${immediate.quotient.relationLabel} and the model gives ${immediate.quotient.direction.label.toLowerCase()}.`,
  };

  return deepFreeze({
    scenarioId: scenario.id,
    scenario,
    perturbation: { ...normalized, label, actionReason },
    before,
    immediate,
    after,
    solution: solved,
    reactionShiftMol: solved.extent.equilibriumMol,
    answer,
    symbolicFluxNote: 'At the final equilibrium, opposing arrows are a symbolic equal-flux reminder. No forward or reverse rate is calculated.',
  });
}

const PREDICTION_LABELS = Object.freeze({
  qRelation: Object.freeze({ below: 'Q < K', equal: 'Q = K', above: 'Q > K', undefined: 'Q undefined' }),
  direction: Object.freeze({ forward: 'net forward', none: 'no net response', reverse: 'net reverse', undefined: 'undefined' }),
  kChange: Object.freeze({ same: 'K stays fixed', changes: 'K changes' }),
  probeTrend: Object.freeze({ rises: 'rises', same: 'stays the same', falls: 'falls' }),
});

function predictionDimension({ id, learner, expected, reason }) {
  return {
    id,
    learner,
    learnerLabel: PREDICTION_LABELS[id]?.[learner] || 'No prediction',
    expected,
    expectedLabel: PREDICTION_LABELS[id]?.[expected] || expected,
    correct: learner === expected,
    reason,
  };
}

export function evaluateEquilibriumPrediction({ experiment, prediction }) {
  if (!experiment?.answer || !experiment?.immediate) throw new TypeError('A completed perturbation experiment is required.');
  const learnerPrediction = {
    qRelation: prediction?.qRelation || '',
    direction: prediction?.direction || '',
    kChange: prediction?.kChange || '',
    probeTrend: prediction?.probeTrend || '',
  };
  const answer = experiment.answer;
  const dimensions = {
    qRelation: predictionDimension({
      id: 'qRelation', learner: learnerPrediction.qRelation, expected: answer.qRelation,
      reason: `The immediate activities give Q/K = ${ratioText(experiment.immediate.quotient.ratioToK)}.`,
    }),
    direction: predictionDimension({
      id: 'direction', learner: learnerPrediction.direction, expected: answer.direction,
      reason: `${experiment.immediate.quotient.relationLabel}: net readjustment follows the sign of RT ln(Q/K).`,
    }),
    kChange: predictionDimension({
      id: 'kChange', learner: learnerPrediction.kChange, expected: answer.kChange,
      reason: `The scenario remains at ${experiment.scenario.temperatureK.toFixed(2)} K, so its declared K remains ${experiment.scenario.equilibriumConstant}.`,
    }),
    probeTrend: predictionDimension({
      id: 'probeTrend', learner: learnerPrediction.probeTrend, expected: answer.probeTrend,
      reason: `${answer.probeFormula} changes from ${experiment.before.amounts[answer.probeSpeciesId].toFixed(4)} to ${experiment.after.amounts[answer.probeSpeciesId].toFixed(4)} mol after re-equilibration.`,
    }),
  };
  const correctCount = Object.values(dimensions).filter((dimension) => dimension.correct).length;
  return deepFreeze({
    learnerPrediction,
    answer: { ...answer },
    dimensions,
    correctCount,
    total: Object.keys(dimensions).length,
    allCorrect: correctCount === Object.keys(dimensions).length,
  });
}

export function nextEquilibriumHint({ experiment, level }) {
  if (!experiment?.scenario || !experiment?.immediate) throw new TypeError('A completed perturbation experiment is required for a hint.');
  const hintLevel = finiteNumber(level, 'Hint level');
  if (!Number.isInteger(hintLevel) || hintLevel < 1 || hintLevel > 4) throw new RangeError('Hint level must be an integer from 1 to 4.');
  const scenario = experiment.scenario;
  const hints = [
    `Write the displayed quotient before using any shift rule: ${scenario.quotientExpression}. Stoichiometric coefficients become activity powers.`,
    `${experiment.perturbation.actionReason} Track only those immediate activity changes; K is still locked at ${scenario.equilibriumConstant}.`,
    `The immediate calculation gives Q/K = ${ratioText(experiment.immediate.quotient.ratioToK)}. Compare that number with 1 before choosing a net direction.`,
    `${experiment.immediate.quotient.relationLabel}, so the response is ${experiment.immediate.quotient.direction.label.toLowerCase()}; after re-equilibration ${experiment.answer.probeFormula} ${PREDICTION_LABELS.probeTrend[experiment.answer.probeTrend]}.`,
  ];
  return hints[hintLevel - 1];
}
