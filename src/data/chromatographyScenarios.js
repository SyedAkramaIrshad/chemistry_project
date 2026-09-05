const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
};

const SOURCE_IDS = [
  'iupacChromatographyHoldUpTime',
  'iupacChromatographyRetentionTime',
  'iupacChromatographyRetentionFactor',
  'iupacChromatographySeparationFactor',
  'iupacChromatographyPeakWidth',
  'iupacChromatographyPlateNumber',
  'iupacChromatographyPeakResolution',
  'nistSeparationMethods',
  'acsUndergraduateCurriculum',
];

export const CHROMATOGRAPHY_PHASE_COLORS = deepFreeze({
  componentA: '#36b6d7',
  componentB: '#f0ad4e',
  total: '#1d3440',
  unretained: '#38d39f',
});

export const CHROMATOGRAPHY_RESOLUTION_BANDS = deepFreeze({
  overlap: {
    id: 'overlap',
    min: 0,
    max: 1,
    label: 'Strong overlap',
    detail: 'Rs is below 1.00 in the board model.',
  },
  partial: {
    id: 'partial',
    min: 1,
    max: 1.5,
    label: 'Partial separation',
    detail: 'Rs is at least 1.00 but below the board criterion of 1.50.',
  },
  'board-baseline': {
    id: 'board-baseline',
    min: 1.5,
    max: Number.POSITIVE_INFINITY,
    label: 'Meets board baseline criterion',
    detail: 'Rs is at least 1.50; identity, purity, and method validity remain unproven.',
  },
});

const phase = (id, label, chemistryHint, kA, kB, accent) => ({
  id,
  label,
  chemistryHint,
  kA,
  kB,
  accent,
});

const component = (id, label, shortLabel, responseWeight) => ({
  id,
  label,
  shortLabel,
  responseWeight,
});

const STANDARD_MODEL = {
  referenceLengthCm: 15,
  holdUpAtReferenceMin: 1,
  plateScale: 260,
  A: 0.3,
  B: 0.65,
  C: 0.45,
};

const FLOW_MODEL = {
  referenceLengthCm: 15,
  holdUpAtReferenceMin: 1.1,
  plateScale: 260,
  A: 0.25,
  B: 0.9,
  C: 0.625,
};

const challenge = (record) => deepFreeze({
  provenance: {
    kind: 'synthetic-teaching',
    label: 'Frozen two-component teaching separation',
    statement: 'Every trace and coefficient is synthetic and local. It is not a measured chromatogram, real column record, compound identification, or operating method.',
  },
  sourceIds: SOURCE_IDS,
  ...record,
});

export const CHROMATOGRAPHY_SCENARIOS = deepFreeze([
  challenge({
    id: 'crowded-pair',
    code: 'SEP 01',
    name: 'Crowded pair',
    summary: 'Two retention factors sit close together, so later elution alone does not produce useful separation.',
    mission: 'Run the compact teaching phase, read the overlap, then change only the phase cartridge and decide which quantity actually created the separation.',
    componentA: component('A', 'Synthetic component A', 'A', 1),
    componentB: component('B', 'Synthetic component B', 'B', 0.88),
    phases: [
      phase('compact-neutral', 'Compact synthetic phase', 'Teaching phase with nearly equal retention factors.', 1.9, 2.02, '#6f8794'),
      phase('selective-split', 'Selective synthetic phase', 'Teaching phase that changes the separation factor substantially.', 1.45, 2.35, '#38d39f'),
      phase('reverse-polar', 'Reverse-order teaching phase', 'Synthetic phase that retains component A more strongly and reverses the order.', 2.25, 1.55, '#e45c7d'),
    ],
    defaultMethod: { phaseId: 'compact-neutral', columnLengthCm: 15, relativeVelocity: 1.05 },
    model: STANDARD_MODEL,
    teacherQuestion: 'Which displayed quantity changed when the phase cartridge separated the pair, and which quantities changed merely because retention shifted?',
    misconception: 'Increasing both retention times is not the same as increasing the separation factor between two adjusted retention times.',
  }),
  challenge({
    id: 'phase-order-reversal',
    code: 'SEP 02',
    name: 'Order reversal',
    summary: 'The phase cartridge changes relative retention enough to reverse which synthetic component reaches the detector first.',
    mission: 'Predict the first peak, run one teaching phase, then load the opposite phase and verify that elution order belongs to the declared method rather than the component label.',
    componentA: component('A', 'Synthetic blue marker', 'Blue A', 0.94),
    componentB: component('B', 'Synthetic amber marker', 'Amber B', 1),
    phases: [
      phase('a-retaining', 'A-retaining synthetic phase', 'Teaching phase with kA greater than kB.', 2.4, 1.4, '#36b6d7'),
      phase('b-retaining', 'B-retaining synthetic phase', 'Teaching phase with kB greater than kA.', 1.4, 2.4, '#f0ad4e'),
      phase('near-neutral', 'Near-neutral teaching phase', 'Synthetic phase whose two retention factors differ only slightly.', 1.8, 1.86, '#6f8794'),
    ],
    defaultMethod: { phaseId: 'a-retaining', columnLengthCm: 15, relativeVelocity: 1.2 },
    model: STANDARD_MODEL,
    teacherQuestion: 'What evidence in the two cartridge records is sufficient to predict an order reversal before the virtual injection is run?',
    misconception: 'A component does not have one universal retention time or permanent elution order independent of the declared method.',
  }),
  challenge({
    id: 'short-column',
    code: 'SEP 03',
    name: 'Efficiency rescue',
    summary: 'A short column preserves the same separation factor but supplies too few declared plates for the selected pair.',
    mission: 'Run the 5 cm method, then change only column length and determine what improves, what stays fixed, and what time cost appears.',
    componentA: component('A', 'Synthetic early solute', 'Early A', 1),
    componentB: component('B', 'Synthetic late solute', 'Late B', 0.92),
    phases: [
      phase('modest-selectivity', 'Modest-selectivity teaching phase', 'Synthetic phase with a fixed moderate separation factor.', 1.5, 1.8, '#38d39f'),
      phase('low-selectivity', 'Low-selectivity synthetic phase', 'Teaching phase that makes length an inefficient rescue lever.', 1.6, 1.72, '#6f8794'),
      phase('high-selectivity', 'High-selectivity synthetic phase', 'Teaching phase that separates retention factors before length is changed.', 1.3, 2, '#e45c7d'),
    ],
    defaultMethod: { phaseId: 'modest-selectivity', columnLengthCm: 5, relativeVelocity: 1.2 },
    model: STANDARD_MODEL,
    teacherQuestion: 'Why does the longer column change plate number and resolution while leaving the phase-defined separation factor unchanged?',
    misconception: 'More column length can increase efficiency, but it does not manufacture stationary-phase selectivity and it also increases elapsed time.',
  }),
  challenge({
    id: 'slow-flow',
    code: 'SEP 04',
    name: 'Slow-side broadening',
    summary: 'Low relative velocity makes the declared B/u contribution dominate the synthetic plate-height index.',
    mission: 'Run the slow method, inspect the broadening ledger, then move toward the displayed optimum without allowing the board to choose the velocity for you.',
    componentA: component('A', 'Synthetic low-retention probe', 'Probe A', 0.96),
    componentB: component('B', 'Synthetic high-retention probe', 'Probe B', 1),
    phases: [
      phase('flow-study', 'Flow-study teaching phase', 'Synthetic phase held fixed while velocity changes.', 1.4, 1.76, '#38d39f'),
      phase('flow-low-alpha', 'Low-alpha synthetic phase', 'Teaching phase showing that an efficient column cannot replace selectivity.', 1.6, 1.7, '#6f8794'),
      phase('flow-high-alpha', 'High-alpha synthetic phase', 'Teaching phase with a larger separation-factor lever.', 1.2, 2, '#e45c7d'),
    ],
    defaultMethod: { phaseId: 'flow-study', columnLengthCm: 15, relativeVelocity: 0.35 },
    model: FLOW_MODEL,
    teacherQuestion: 'At low relative velocity, which term dominates H*, and why is the displayed optimum a property of this declared coefficient set only?',
    misconception: 'Slower flow is not automatically more efficient; the B/u term grows on the slow side of this bounded teaching relation.',
  }),
  challenge({
    id: 'fast-flow',
    code: 'SEP 05',
    name: 'Fast-side broadening',
    summary: 'High relative velocity makes the declared C u contribution dominate even though the paper moves through the run quickly.',
    mission: 'Run the fast method, compare speed with peak width and plate height, then reduce velocity manually and defend the tradeoff.',
    componentA: component('A', 'Synthetic transfer probe A', 'Transfer A', 1),
    componentB: component('B', 'Synthetic transfer probe B', 'Transfer B', 0.9),
    phases: [
      phase('fast-study', 'Fast-flow teaching phase', 'Synthetic phase held fixed while mass-transfer broadening is exposed.', 1.4, 1.76, '#38d39f'),
      phase('fast-low-alpha', 'Fast low-alpha synthetic phase', 'Teaching phase with little relative-retention difference.', 1.55, 1.67, '#6f8794'),
      phase('fast-high-alpha', 'Fast high-alpha synthetic phase', 'Teaching phase with a separate selectivity lever.', 1.15, 1.95, '#e45c7d'),
    ],
    defaultMethod: { phaseId: 'fast-study', columnLengthCm: 15, relativeVelocity: 2.8 },
    model: FLOW_MODEL,
    teacherQuestion: 'Why can the fastest displayed run have a larger C u contribution and lower declared efficiency than a slower run?',
    misconception: 'Shorter run time and higher column efficiency are different objectives; high velocity can increase the C u broadening term.',
  }),
  challenge({
    id: 'retention-is-not-identity',
    code: 'SEP 06',
    name: 'Retention is not identity',
    summary: 'Two synthetic components produce nearly coincident retention evidence, but no chromatographic time alone establishes chemical identity.',
    mission: 'Run the near-match cartridge, evaluate the numerical overlap, and reject the identity claim without discarding the valid retention evidence.',
    componentA: component('A', 'Synthetic reference-like marker', 'Reference A', 1),
    componentB: component('B', 'Synthetic unknown-like marker', 'Unknown B', 0.84),
    phases: [
      phase('retention-match', 'Retention-match synthetic phase', 'Teaching phase that intentionally creates nearly matching retention.', 1.85, 1.89, '#e45c7d'),
      phase('visible-split', 'Visible-split synthetic phase', 'Teaching phase that separates the two markers without identifying either one.', 1.4, 2.1, '#38d39f'),
      phase('reference-reverse', 'Reference-reverse teaching phase', 'Synthetic phase that reverses the near-reference order.', 2.05, 1.7, '#6f8794'),
    ],
    defaultMethod: { phaseId: 'retention-match', columnLengthCm: 15, relativeVelocity: 1.1 },
    model: STANDARD_MODEL,
    teacherQuestion: 'What additional orthogonal evidence would be required before a retention match could contribute to a defensible identity claim?',
    misconception: 'A matching or resolved retention time is method-conditioned evidence, not unique chemical identification, purity proof, or method validation.',
  }),
]);

export const CHROMATOGRAPHY_SCENARIO_BY_ID = deepFreeze(Object.fromEntries(
  CHROMATOGRAPHY_SCENARIOS.map((scenario) => [scenario.id, scenario]),
));

export const CHROMATOGRAPHY_MODEL_BOUNDARY = deepFreeze({
  velocity: 'The control is a dimensionless relative velocity u/u0. It is not a transferable flow rate, pressure, or instrument setting.',
  peaks: 'Every component is represented by a symmetric Gaussian peak with a declared response weight. Tailing, fronting, overload, noise, drift, and extra-column broadening are excluded.',
  plateHeight: 'H* = A + B/u + C u is a synthetic teaching relation with frozen coefficients. It is not fitted to a real column or chemical system.',
  resolution: 'Rs >= 1.5 is labelled only as this board\'s baseline-resolution criterion; it does not certify purity, identity, validation, or universal real-world separation.',
  identity: 'Retention agreement or chromatographic resolution does not establish identity. Orthogonal reference evidence and a validated method remain outside this engine.',
  safety: 'All runs are virtual. No solvent selection, pressure, temperature, injection, instrument operation, chemical handling, or laboratory procedure is provided.',
});
