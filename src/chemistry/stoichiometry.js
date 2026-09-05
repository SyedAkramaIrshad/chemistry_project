import { ChemistryEngine } from './runtime.js';
import {
  STOICHIOMETRY_CONSTANTS,
  stoichiometryScenarioById,
} from '../data/stoichiometryScenarios.js';

export const STOICHIOMETRY_MODEL_BOUNDARY = Object.freeze({
  includes: Object.freeze([
    'Declared balanced overall equations',
    'Mass-to-mole conversion with local average molar masses',
    'Moles-to-entity conversion with the exact SI Avogadro constant',
    'Coefficient-normalized feed capacity',
    'Single limiting reactant and exact stoichiometric ties',
    'Extent of reaction under complete conversion',
    'Reactant consumption and excess leftovers',
    'All declared product amounts and masses',
    'Theoretical target-product mass',
    'Consumed-versus-produced mass closure',
    'Raw isolated percent-yield audit',
  ]),
  excludes: Object.freeze([
    'Prediction that a displayed reaction occurs',
    'Equilibrium-limited conversion',
    'Reaction rate, mechanism, or activation energy',
    'Side products and competing reactions',
    'Reactant purity and solution concentration',
    'Product identity, wetness, or purity inference',
    'Experimental uncertainty or significant-figure policy',
    'Heat, work, phase, and mixing calculations',
    'Apparatus, scale-up, process, or safety design',
    'Operational laboratory or synthesis procedure',
  ]),
});

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
};

const requireNonNegative = (value, label) => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite non-negative number.`);
  }
  return value;
};

const zeroSmall = (value, scale = 1) => Math.abs(value) <= Math.max(1e-12, Math.abs(scale) * 1e-10) ? 0 : value;

const amountRecord = (species, amountMoles) => {
  const molarMassGmol = ChemistryEngine.molarMass(species.formula);
  return {
    ...species,
    molarMassGmol,
    amountMoles,
    massG: amountMoles * molarMassGmol,
    entities: amountMoles * STOICHIOMETRY_CONSTANTS.avogadroPerMol,
  };
};

export function convertFeedToMoles({ formula, value, unit }) {
  requireNonNegative(value, 'Feed amount');
  if (unit === 'mol') return value;
  if (unit === 'g') return value / ChemistryEngine.molarMass(formula);
  throw new RangeError(`Unsupported feed unit: ${unit}. Use mol or g.`);
}

export function analyzeStoichiometry({ scenarioId, feeds, targetProductId }) {
  const scenario = stoichiometryScenarioById(scenarioId);
  if (!feeds || typeof feeds !== 'object') throw new TypeError('A feed record is required for every reactant.');

  const preparedReactants = scenario.reactants.map((species) => {
    const suppliedFeed = feeds[species.id];
    if (!suppliedFeed || typeof suppliedFeed !== 'object') {
      throw new TypeError(`A feed record is required for ${species.name}.`);
    }
    const feed = { value: suppliedFeed.value, unit: suppliedFeed.unit };
    const initialMoles = convertFeedToMoles({ formula: species.formula, ...feed });
    const molarMassGmol = ChemistryEngine.molarMass(species.formula);
    return {
      ...species,
      feed,
      molarMassGmol,
      initialMoles,
      initialMassG: initialMoles * molarMassGmol,
      initialEntities: initialMoles * STOICHIOMETRY_CONSTANTS.avogadroPerMol,
      extentCapacityMol: initialMoles / species.coefficient,
    };
  });

  const extentMol = Math.min(...preparedReactants.map((item) => item.extentCapacityMol));
  const extentTolerance = Math.max(1e-12, Math.abs(extentMol) * 1e-9);
  const limitingIds = preparedReactants
    .filter((item) => Math.abs(item.extentCapacityMol - extentMol) <= extentTolerance)
    .map((item) => item.id);

  const reactants = preparedReactants.map((item) => {
    const consumedMoles = item.coefficient * extentMol;
    const leftoverMoles = zeroSmall(item.initialMoles - consumedMoles, item.initialMoles);
    return {
      ...item,
      consumedMoles,
      consumedMassG: consumedMoles * item.molarMassGmol,
      leftoverMoles,
      leftoverMassG: leftoverMoles * item.molarMassGmol,
      leftoverEntities: leftoverMoles * STOICHIOMETRY_CONSTANTS.avogadroPerMol,
      consumedFraction: item.initialMoles === 0 ? 1 : consumedMoles / item.initialMoles,
    };
  });
  const products = scenario.products.map((species) => amountRecord(species, species.coefficient * extentMol));
  const target = products.find((item) => item.id === targetProductId);
  if (!target) throw new RangeError(`Target product ${targetProductId} is not declared for ${scenario.title}.`);

  const consumedReactantMassG = reactants.reduce((sum, item) => sum + item.consumedMassG, 0);
  const generatedProductMassG = products.reduce((sum, item) => sum + item.massG, 0);
  const availableReactantMassG = reactants.reduce((sum, item) => sum + item.initialMassG, 0);
  const leftoverReactantMassG = reactants.reduce((sum, item) => sum + item.leftoverMassG, 0);

  return deepFreeze({
    resultKind: 'Complete-conversion stoichiometric upper bound',
    scenario,
    extentMol,
    limiting: {
      kind: limitingIds.length === reactants.length ? 'stoichiometric' : 'single',
      ids: limitingIds,
    },
    reactants,
    products,
    target: {
      ...target,
      theoreticalMoles: target.amountMoles,
      theoreticalMassG: target.massG,
    },
    massLedger: {
      availableReactantMassG,
      consumedReactantMassG,
      leftoverReactantMassG,
      generatedProductMassG,
      accountedMassG: leftoverReactantMassG + generatedProductMassG,
      differenceG: zeroSmall(generatedProductMassG - consumedReactantMassG, consumedReactantMassG),
    },
    equations: {
      moleBridge: 'n = m / M; N = nNA',
      extent: 'ξmax = min(ni / νi)',
      speciesChange: 'Δni = νiξ',
      percentYield: 'yield = isolated / theoretical × 100%',
    },
    boundary: scenario.boundary,
  });
}

const predictionAmountMoles = ({ analysis, value, unit }) => {
  requireNonNegative(value, 'Predicted target amount');
  if (unit === 'mol') return value;
  if (unit === 'g') return value / analysis.target.molarMassGmol;
  throw new RangeError(`Unsupported prediction unit: ${unit}. Use mol or g.`);
};

export function evaluateStoichiometryPrediction({
  analysis,
  predictedLimitingId,
  predictedTargetValue,
  predictedTargetUnit,
  toleranceFraction = 0.03,
}) {
  if (!analysis?.scenario || !analysis?.target) throw new TypeError('A stoichiometry analysis is required.');
  if (!Number.isFinite(toleranceFraction) || toleranceFraction < 0 || toleranceFraction > 1) {
    throw new RangeError('Prediction tolerance fraction must be between zero and one.');
  }
  const allowedLimiterIds = new Set([...analysis.reactants.map((item) => item.id), 'stoichiometric']);
  if (!allowedLimiterIds.has(predictedLimitingId)) throw new RangeError(`Unknown limiting-reactant prediction: ${predictedLimitingId}.`);
  const expectedLimitingId = analysis.limiting.kind === 'stoichiometric' ? 'stoichiometric' : analysis.limiting.ids[0];
  const limitingCorrect = predictedLimitingId === expectedLimitingId;
  const predictedMoles = predictionAmountMoles({
    analysis,
    value: predictedTargetValue,
    unit: predictedTargetUnit,
  });
  const expectedMoles = analysis.target.theoreticalMoles;
  const absoluteDifferenceMoles = Math.abs(predictedMoles - expectedMoles);
  const targetCorrect = expectedMoles === 0
    ? absoluteDifferenceMoles <= 1e-12
    : absoluteDifferenceMoles / expectedMoles <= toleranceFraction;
  const predictedLimiter = analysis.reactants.find((item) => item.id === predictedLimitingId);
  const expectedLimiter = analysis.reactants.find((item) => item.id === expectedLimitingId);
  const targetDirection = predictedMoles < expectedMoles ? 'low' : predictedMoles > expectedMoles ? 'high' : 'exact';

  const limitingReason = limitingCorrect
    ? expectedLimitingId === 'stoichiometric'
      ? 'Every reactant has the same coefficient-normalized capacity, so the feed is an exact stoichiometric tie.'
      : `${expectedLimiter.name} has the smallest n/ν capacity and reaches zero first.`
    : expectedLimitingId === 'stoichiometric'
      ? 'No single reactant reaches zero first. Compare each feed as n/ν: every capacity is equal.'
      : `${predictedLimiter?.name ?? 'That choice'} is not exhausted first. Divide each feed amount by its equation coefficient; ${expectedLimiter.name} has the smaller n/ν capacity.`;
  const targetReason = targetCorrect
    ? `Your ${predictedTargetValue} ${predictedTargetUnit} prediction is within ${(toleranceFraction * 100).toFixed(0)}% of the declared-equation upper bound.`
    : `Your prediction is ${targetDirection} for ${analysis.target.name}. The model gives ${analysis.target.theoreticalMoles.toFixed(5)} mol or ${analysis.target.theoreticalMassG.toFixed(5)} g from νproduct × ξmax.`;

  return deepFreeze({
    correct: limitingCorrect && targetCorrect,
    predictedLimitingId,
    predictedTargetValue,
    predictedTargetUnit,
    predictedTargetMoles: predictedMoles,
    expectedLimitingId,
    expectedTargetMoles: expectedMoles,
    expectedTargetMassG: analysis.target.theoreticalMassG,
    dimensions: {
      limiting: { correct: limitingCorrect, reason: limitingReason },
      target: { correct: targetCorrect, direction: targetDirection, reason: targetReason },
    },
    summary: limitingCorrect && targetCorrect
      ? 'Both the limiting state and target-product amount match the declared complete-conversion model.'
      : 'Your choices remain visible. Compare raw amount with coefficient-normalized capacity, then use the product coefficient.',
  });
}

export function analyzeChemicalYield({ analysis, isolatedMassG }) {
  if (!analysis?.target) throw new TypeError('A stoichiometry analysis is required.');
  requireNonNegative(isolatedMassG, 'Isolated product mass');
  const theoreticalMassG = analysis.target.theoreticalMassG;
  if (theoreticalMassG === 0) {
    return deepFreeze({
      status: 'undefined',
      isolatedMassG,
      theoreticalMassG,
      percentYield: null,
      reason: 'Percent yield is undefined because this feed produces zero theoretical target mass.',
    });
  }
  const percentYield = isolatedMassG / theoreticalMassG * 100;
  const aboveTheoretical = percentYield > 100 + 1e-9;
  return deepFreeze({
    status: aboveTheoretical ? 'above-theoretical' : 'within-theoretical',
    isolatedMassG,
    theoreticalMassG,
    percentYield,
    reason: aboveTheoretical
      ? 'The entered isolated mass exceeds the declared stoichiometric upper bound. Keep the value and audit wet or impure material, product identity, measurement, feed purity, and the complete-conversion assumptions; this model cannot choose the cause.'
      : `${percentYield.toFixed(2)}% compares the entered isolated mass with the declared theoretical mass. It does not explain losses or certify product purity.`,
  });
}

export function createExtentTrace({ analysis, pointCount = 61 }) {
  if (!analysis?.scenario || !Number.isFinite(analysis.extentMol)) throw new TypeError('A stoichiometry analysis is required.');
  if (!Number.isInteger(pointCount) || pointCount < 2 || pointCount > 501) {
    throw new RangeError('Point count must be an integer from 2 through 501.');
  }
  const points = Array.from({ length: pointCount }, (_, index) => {
    const fraction = index / (pointCount - 1);
    const extentMol = analysis.extentMol * fraction;
    return {
      fraction,
      extentMol,
      reactantMoles: Object.fromEntries(analysis.reactants.map((item) => [
        item.id,
        zeroSmall(item.initialMoles - item.coefficient * extentMol, item.initialMoles),
      ])),
      productMoles: Object.fromEntries(analysis.products.map((item) => [item.id, item.coefficient * extentMol])),
      targetMassG: analysis.target.coefficient * extentMol * analysis.target.molarMassGmol,
    };
  });
  return deepFreeze({
    analysis,
    points,
    maximumExtentMol: analysis.extentMol,
  });
}
