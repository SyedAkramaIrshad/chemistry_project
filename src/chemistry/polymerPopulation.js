import {
  POLYMER_RELATIONS,
  POLYMER_REPEAT_UNIT_BY_ID,
} from '../data/polymerScenarios.js';

const MAX_DEGREE = 200;
const MAX_COUNT = 50;
const RELATIVE_TOLERANCE = 1e-10;

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
};

const nearlyEqual = (left, right) => (
  Math.abs(left - right) <= RELATIVE_TOLERANCE * Math.max(1, Math.abs(left), Math.abs(right))
);

const relationOf = (left, right) => {
  if (nearlyEqual(left, right)) return 'equal';
  return left > right ? 'left' : 'right';
};

const finite = (value, label) => {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite.`);
  return value;
};

const validAnalysis = (analysis) => (
  analysis
  && analysis.kind === 'polymer-population-analysis'
  && Number.isFinite(analysis.numberAverageMolarMass)
  && Number.isFinite(analysis.massAverageMolarMass)
  && Number.isFinite(analysis.dispersity)
  && Array.isArray(analysis.bins)
);

const formatMass = (value) => `${value.toFixed(3)} g mol⁻¹`;
const formatRelation = (relation) => ({ left: 'left is larger', equal: 'they are equal', right: 'right is larger' }[relation]);

export function analysePolymerPopulation({ repeatUnitId, bins } = {}) {
  const repeatUnit = POLYMER_REPEAT_UNIT_BY_ID[repeatUnitId];
  if (!repeatUnit) throw new RangeError(`Unknown polymer repeat unit: ${repeatUnitId ?? 'missing'}.`);
  if (!Array.isArray(bins) || bins.length === 0) {
    throw new TypeError('A polymer population requires at least one chain bin.');
  }

  const degrees = new Set();
  const normalized = bins.map((bin, index) => {
    if (!bin || typeof bin !== 'object') throw new TypeError(`Chain bin ${index + 1} must be an object.`);
    const degree = finite(bin.degree, `Chain degree in bin ${index + 1}`);
    const count = finite(bin.count, `Chain count in bin ${index + 1}`);
    if (!Number.isInteger(degree) || degree < 1 || degree > MAX_DEGREE) {
      throw new RangeError(`Chain degree must be an integer between 1 and ${MAX_DEGREE}.`);
    }
    if (!Number.isInteger(count) || count < 0 || count > MAX_COUNT) {
      throw new RangeError(`Chain count must be an integer between 0 and ${MAX_COUNT}.`);
    }
    if (degrees.has(degree)) throw new RangeError(`Duplicate chain degree ${degree}.`);
    degrees.add(degree);
    return { degree, count };
  }).filter((bin) => bin.count > 0).sort((left, right) => left.degree - right.degree);

  const chainCount = normalized.reduce((sum, bin) => sum + bin.count, 0);
  if (chainCount === 0) throw new RangeError('A polymer population requires at least one representative chain.');

  const withMass = normalized.map((bin) => {
    const chainMolarMassGmol = repeatUnit.endGroupMolarMassGmol
      + bin.degree * repeatUnit.repeatMolarMassGmol;
    return {
      ...bin,
      chainMolarMassGmol,
      degreeLedger: bin.count * bin.degree,
      degreeSquareLedger: bin.count * bin.degree ** 2,
      massLedger: bin.count * chainMolarMassGmol,
      massSquareLedger: bin.count * chainMolarMassGmol ** 2,
    };
  });

  const degreeLedger = withMass.reduce((sum, bin) => sum + bin.degreeLedger, 0);
  const degreeSquareLedger = withMass.reduce((sum, bin) => sum + bin.degreeSquareLedger, 0);
  const totalMassLedger = withMass.reduce((sum, bin) => sum + bin.massLedger, 0);
  const massSquareLedger = withMass.reduce((sum, bin) => sum + bin.massSquareLedger, 0);
  const numberAverageDegree = degreeLedger / chainCount;
  const degreeSecondMoment = degreeSquareLedger / chainCount;
  const numberAverageMolarMass = totalMassLedger / chainCount;
  const massAverageMolarMass = massSquareLedger / totalMassLedger;
  const dispersity = massAverageMolarMass / numberAverageMolarMass;
  const endGroupMassFraction = chainCount * repeatUnit.endGroupMolarMassGmol / totalMassLedger;

  const weightedBins = withMass.map((bin) => ({
    ...bin,
    numberFraction: bin.count / chainCount,
    massFraction: bin.massLedger / totalMassLedger,
  }));

  const numberFractionSum = weightedBins.reduce((sum, bin) => sum + bin.numberFraction, 0);
  const massFractionSum = weightedBins.reduce((sum, bin) => sum + bin.massFraction, 0);
  if (!nearlyEqual(numberFractionSum, 1) || !nearlyEqual(massFractionSum, 1)) {
    throw new Error('Polymer population fractions failed closure.');
  }
  if (massAverageMolarMass + RELATIVE_TOLERANCE < numberAverageMolarMass || dispersity + RELATIVE_TOLERANCE < 1) {
    throw new Error('Polymer population average invariant failed: Mw must be at least Mn and dispersity at least one.');
  }

  return deepFreeze({
    kind: 'polymer-population-analysis',
    repeatUnit,
    bins: weightedBins,
    chainCount,
    degreeLedger,
    degreeSquareLedger,
    totalMassLedger,
    massSquareLedger,
    numberAverageDegree,
    degreeSecondMoment,
    numberAverageMolarMass,
    massAverageMolarMass,
    dispersity,
    endGroupMassFraction,
    equationLedger: [
      `Mi = ${repeatUnit.endGroupMolarMassGmol.toFixed(3)} + Xi × ${repeatUnit.repeatMolarMassGmol.toFixed(3)} g mol⁻¹`,
      `Xn = ${degreeLedger.toFixed(3)} / ${chainCount} = ${numberAverageDegree.toFixed(3)}`,
      `Mn = ${totalMassLedger.toFixed(3)} / ${chainCount} = ${numberAverageMolarMass.toFixed(3)} g mol⁻¹`,
      `Mw = ${massSquareLedger.toFixed(3)} / ${totalMassLedger.toFixed(3)} = ${massAverageMolarMass.toFixed(3)} g mol⁻¹`,
      `ĐM = ${massAverageMolarMass.toFixed(3)} / ${numberAverageMolarMass.toFixed(3)} = ${dispersity.toFixed(4)}`,
    ],
  });
}

export function comparePolymerPopulations(leftAnalysis, rightAnalysis) {
  if (!validAnalysis(leftAnalysis) || !validAnalysis(rightAnalysis)) {
    throw new TypeError('Comparison requires two polymer population analyses.');
  }

  const sameBinShape = leftAnalysis.bins.length === rightAnalysis.bins.length
    && leftAnalysis.bins.every((bin, index) => (
      bin.degree === rightAnalysis.bins[index].degree
      && bin.count === rightAnalysis.bins[index].count
    ));
  const sameRepeatUnit = leftAnalysis.repeatUnit.id === rightAnalysis.repeatUnit.id;
  const sameDegreeMoments = nearlyEqual(leftAnalysis.numberAverageDegree, rightAnalysis.numberAverageDegree)
    && nearlyEqual(leftAnalysis.degreeSecondMoment, rightAnalysis.degreeSecondMoment);
  const sameMolarMassStatistics = nearlyEqual(leftAnalysis.numberAverageMolarMass, rightAnalysis.numberAverageMolarMass)
    && nearlyEqual(leftAnalysis.massAverageMolarMass, rightAnalysis.massAverageMolarMass)
    && nearlyEqual(leftAnalysis.dispersity, rightAnalysis.dispersity);

  const relations = {
    mnRelation: relationOf(leftAnalysis.numberAverageMolarMass, rightAnalysis.numberAverageMolarMass),
    mwRelation: relationOf(leftAnalysis.massAverageMolarMass, rightAnalysis.massAverageMolarMass),
    dispersityRelation: relationOf(leftAnalysis.dispersity, rightAnalysis.dispersity),
  };

  const signed = (left, right) => right - left;
  const percent = (left, right) => left === 0 ? null : 100 * (right - left) / left;

  return deepFreeze({
    kind: 'polymer-population-comparison',
    left: leftAnalysis,
    right: rightAnalysis,
    relations,
    distributionClaim: 'statistics-do-not-prove-same',
    sameBinShape,
    sameRepeatUnit,
    sameDegreeMoments,
    sameMolarMassStatistics,
    differences: {
      numberAverageMolarMass: signed(leftAnalysis.numberAverageMolarMass, rightAnalysis.numberAverageMolarMass),
      massAverageMolarMass: signed(leftAnalysis.massAverageMolarMass, rightAnalysis.massAverageMolarMass),
      dispersity: signed(leftAnalysis.dispersity, rightAnalysis.dispersity),
      numberAverageDegree: signed(leftAnalysis.numberAverageDegree, rightAnalysis.numberAverageDegree),
      endGroupMassFraction: signed(leftAnalysis.endGroupMassFraction, rightAnalysis.endGroupMassFraction),
    },
    percentChanges: {
      numberAverageMolarMass: percent(leftAnalysis.numberAverageMolarMass, rightAnalysis.numberAverageMolarMass),
      massAverageMolarMass: percent(leftAnalysis.massAverageMolarMass, rightAnalysis.massAverageMolarMass),
      dispersity: percent(leftAnalysis.dispersity, rightAnalysis.dispersity),
    },
  });
}

const predictionComplete = (prediction) => (
  prediction
  && ['mnRelation', 'mwRelation', 'dispersityRelation', 'distributionClaim']
    .every((key) => typeof prediction[key] === 'string' && prediction[key].length > 0)
);

export function evaluatePolymerAttempt({ comparison, prediction } = {}) {
  if (!comparison || comparison.kind !== 'polymer-population-comparison') {
    throw new TypeError('Polymer evaluation requires a valid population comparison.');
  }
  if (!predictionComplete(prediction)) {
    throw new TypeError('Polymer evaluation requires a complete four-part prediction.');
  }
  for (const key of ['mnRelation', 'mwRelation', 'dispersityRelation']) {
    if (!POLYMER_RELATIONS.includes(prediction[key])) {
      throw new RangeError(`${key} must use a left, equal, or right relation.`);
    }
  }
  if (!['statistics-prove-same', 'statistics-do-not-prove-same'].includes(prediction.distributionClaim)) {
    throw new RangeError('Distribution claim is not recognized.');
  }

  const expected = {
    ...comparison.relations,
    distributionClaim: comparison.distributionClaim,
  };
  const relationReason = (label, key, left, right) => (
    `${label}: ${formatRelation(expected[key])}. The frozen analysis gives ${formatMass(left)} on the left and ${formatMass(right)} on the right.`
  );
  const dimensions = {
    mnRelation: {
      learner: prediction.mnRelation,
      expected: expected.mnRelation,
      correct: prediction.mnRelation === expected.mnRelation,
      reason: relationReason('Mn gives every representative chain equal number weight', 'mnRelation', comparison.left.numberAverageMolarMass, comparison.right.numberAverageMolarMass),
    },
    mwRelation: {
      learner: prediction.mwRelation,
      expected: expected.mwRelation,
      correct: prediction.mwRelation === expected.mwRelation,
      reason: relationReason('Mw weights each chain class by its contribution to the relative mass ledger', 'mwRelation', comparison.left.massAverageMolarMass, comparison.right.massAverageMolarMass),
    },
    dispersityRelation: {
      learner: prediction.dispersityRelation,
      expected: expected.dispersityRelation,
      correct: prediction.dispersityRelation === expected.dispersityRelation,
      reason: `ĐM = Mw/Mn, so ${formatRelation(expected.dispersityRelation)} (${comparison.left.dispersity.toFixed(4)} left; ${comparison.right.dispersity.toFixed(4)} right). A uniform displayed population has ĐM = 1.`,
    },
    distributionClaim: {
      learner: prediction.distributionClaim,
      expected: expected.distributionClaim,
      correct: prediction.distributionClaim === expected.distributionClaim,
      reason: comparison.sameMolarMassStatistics && !comparison.sameBinShape
        ? 'The displayed Mn, Mw, and ĐM match, but the occupied degrees and counts do not. A few matching moments do not reconstruct a distribution or establish a bulk property.'
        : 'These averages summarize the displayed finite bins only. They do not establish an unmeasured distribution, morphology, processing response, or bulk property.',
    },
  };
  const correct = Object.values(dimensions).filter((dimension) => dimension.correct).length;

  return deepFreeze({
    kind: 'polymer-population-evaluation',
    committed: true,
    learnerPrediction: { ...prediction },
    expected,
    dimensions,
    score: { correct, total: 4 },
  });
}

export function nextPolymerHint({ comparison, prediction = {}, level } = {}) {
  if (!comparison || comparison.kind !== 'polymer-population-comparison') {
    throw new TypeError('Polymer hinting requires a valid population comparison.');
  }
  if (!Number.isInteger(level) || level < 1 || level > 4) {
    throw new RangeError('Polymer hint level must be between 1 and 4.');
  }

  const heaviest = (analysis) => analysis.bins[analysis.bins.length - 1];
  const strongestContrast = (analysis) => analysis.bins.reduce((best, bin) => (
    Math.abs(bin.massFraction - bin.numberFraction) > Math.abs(best.massFraction - best.numberFraction) ? bin : best
  ));

  if (level === 1) {
    return 'Count the representative chains in each occupied degree first. Then ask whether the longer chains should have the same influence in a number-weighted and a mass-weighted question.';
  }
  if (level === 2) {
    return `The left ledger has ΣNi = ${comparison.left.chainCount} and ΣNiXi = ${comparison.left.degreeLedger}; its heaviest occupied bin is X = ${heaviest(comparison.left).degree}. The right values are ${comparison.right.chainCount}, ${comparison.right.degreeLedger}, and X = ${heaviest(comparison.right).degree}.`;
  }
  if (level === 3) {
    const leftBin = strongestContrast(comparison.left);
    const rightBin = strongestContrast(comparison.right);
    return `Xn is ${comparison.left.numberAverageDegree.toFixed(3)} left and ${comparison.right.numberAverageDegree.toFixed(3)} right; Mn is ${formatMass(comparison.left.numberAverageMolarMass)} left and ${formatMass(comparison.right.numberAverageMolarMass)} right. At X = ${leftBin.degree}, the left bin changes from ${(100 * leftBin.numberFraction).toFixed(1)}% by number to ${(100 * leftBin.massFraction).toFixed(1)}% by mass; the strongest right contrast is X = ${rightBin.degree}.`;
  }
  return `The frozen comparison gives Mw ${formatRelation(comparison.relations.mwRelation)} and ĐM ${formatRelation(comparison.relations.dispersityRelation)}. Exact values are ${formatMass(comparison.left.massAverageMolarMass)} / ${formatMass(comparison.right.massAverageMolarMass)} and ${comparison.left.dispersity.toFixed(4)} / ${comparison.right.dispersity.toFixed(4)}. Even matching averages cannot establish a full distribution or any bulk property.`;
}
