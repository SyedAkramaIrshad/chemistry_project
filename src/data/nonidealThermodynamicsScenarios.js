const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
};

export const NONIDEAL_THERMODYNAMICS_CONSTANTS = deepFreeze({
  gasConstantLBarMolK: 0.08314462618,
  virialGate: 0.12,
  activityParameterBounds: { minimum: -3, maximum: 3 },
  saturationPressureBoundsBar: { minimum: 0.2, maximum: 3 },
  stabilityInteractionBounds: { minimum: 0, maximum: 5 },
  temperatureBoundsK: { minimum: 200, maximum: 700 },
  pressureBoundsBar: { minimum: 0.1, maximum: 30 },
  secondVirialBoundsCm3Mol: { minimum: -500, maximum: 500 },
});

export const ACTIVITY_SCENARIOS = deepFreeze([
  {
    id: 'ideal-reference', code: 'ACT 01', label: 'Flat ideal reference',
    A12: 0, A21: 0, p1StarBar: 1.6, p2StarBar: 0.8, defaultX1: 0.5,
    accent: '#69cfd1', intendedContrast: 'Zero excess Gibbs energy and no interior azeotrope.',
    dataKind: 'synthetic-teaching-parameters',
  },
  {
    id: 'mild-positive', code: 'ACT 02', label: 'Mild positive departure',
    A12: 0.4, A21: 0.4, p1StarBar: 1.6, p2StarBar: 0.8, defaultX1: 0.5,
    accent: '#ef6b57', intendedContrast: 'Positive pressure departure without an interior azeotrope.',
    dataKind: 'synthetic-teaching-parameters',
  },
  {
    id: 'positive-azeotrope', code: 'ACT 03', label: 'Positive one-crossing field',
    A12: 1.8, A21: 1.8, p1StarBar: 1.6, p2StarBar: 0.8, defaultX1: 0.5,
    accent: '#ef6b57', intendedContrast: 'One maximum-pressure interior azeotrope.',
    dataKind: 'synthetic-teaching-parameters',
  },
  {
    id: 'negative-azeotrope', code: 'ACT 04', label: 'Negative one-crossing field',
    A12: -1.8, A21: -1.8, p1StarBar: 1.6, p2StarBar: 0.8, defaultX1: 0.5,
    accent: '#315bce', intendedContrast: 'One minimum-pressure interior azeotrope.',
    dataKind: 'synthetic-teaching-parameters',
  },
  {
    id: 'asymmetric-double', code: 'ACT 05', label: 'Asymmetric double crossing',
    A12: 2.2, A21: 0.5, p1StarBar: 1.5, p2StarBar: 0.7, defaultX1: 0.76,
    accent: '#8f65d6', intendedContrast: 'Two interior azeotropes in a deliberately synthetic field.',
    dataKind: 'synthetic-teaching-parameters',
  },
].map((scenario) => ({
  ...scenario,
  component1Label: 'Volatile A',
  component2Label: 'Volatile B',
  provenance: 'Synthetic dimensionless Margules parameters and synthetic pure-component saturation pressures selected only to expose model behaviour.',
  fitBoundary: 'A real-mixture activity model requires fitted experimental data and declared temperature, pressure, phase, and composition context. This cartridge is not such a fit.',
})));

export const ACTIVITY_SCENARIO_BY_ID = deepFreeze(Object.fromEntries(
  ACTIVITY_SCENARIOS.map((scenario) => [scenario.id, scenario]),
));

export const STABILITY_SCENARIOS = deepFreeze([
  { id: 'ideal-mixing', code: 'STB 01', label: 'Ideal entropy bowl', chi: 0, overallX1: 0.5, intendedContrast: 'Ideal entropy of mixing gives one stable well.' },
  { id: 'stable-single-well', code: 'STB 02', label: 'Interacting single well', chi: 1.2, overallX1: 0.5, intendedContrast: 'Interaction bends the terrain but does not open a miscibility gap.' },
  { id: 'critical-contact', code: 'STB 03', label: 'Critical contact', chi: 2, overallX1: 0.5, intendedContrast: 'The centre curvature reaches zero at the symmetric critical point.' },
  { id: 'metastable-inside-gap', code: 'STB 04', label: 'Metastable ledge', chi: 2.4, overallX1: 0.2, intendedContrast: 'A locally metastable homogeneous point still has a two-phase equilibrium state.' },
  { id: 'unstable-centre', code: 'STB 05', label: 'Unstable ridge', chi: 3, overallX1: 0.5, intendedContrast: 'Negative local curvature lies inside the spinodal interval.' },
  { id: 'stable-outside-gap', code: 'STB 06', label: 'Stable outer basin', chi: 3, overallX1: 0.03, intendedContrast: 'The same interaction parameter can have a stable composition outside the binodal gap.' },
].map((scenario) => ({
  ...scenario,
  dataKind: 'synthetic-dimensionless-regular-solution',
  provenance: 'Synthetic symmetric regular-solution interaction parameter and overall amount fraction.',
  boundary: 'This dimensionless teaching terrain is not a measured alloy, polymer, solvent, or other material phase diagram and contains no time or morphology model.',
})));

export const STABILITY_SCENARIO_BY_ID = deepFreeze(Object.fromEntries(
  STABILITY_SCENARIOS.map((scenario) => [scenario.id, scenario]),
));

export const FUGACITY_SCENARIOS = deepFreeze([
  { id: 'ideal-virial', code: 'FUG 01', label: 'Ideal witness', temperatureK: 350, pressureBar: 5, secondVirialCm3Mol: 0, intendedContrast: 'B = 0 returns Z = phi = 1 and f = P exactly.' },
  { id: 'attractive-departure', code: 'FUG 02', label: 'Attractive departure', temperatureK: 320, pressureBar: 5, secondVirialCm3Mol: -120, intendedContrast: 'Negative B lowers both Z and phi inside the teaching gate.' },
  { id: 'repulsive-departure', code: 'FUG 03', label: 'Repulsive departure', temperatureK: 450, pressureBar: 10, secondVirialCm3Mol: 90, intendedContrast: 'Positive B raises both Z and phi inside the teaching gate.' },
  { id: 'near-gate-edge', code: 'FUG 04', label: 'Near the declared gate', temperatureK: 300, pressureBar: 15, secondVirialCm3Mol: -180, intendedContrast: 'A large allowed departure tests why a bounded truncation needs a visible gate.' },
  { id: 'outside-declared-gate', code: 'FUG 05', label: 'Gate refusal', temperatureK: 250, pressureBar: 15, secondVirialCm3Mol: -300, intendedContrast: 'The dimensionless departure exceeds the declared gate, so no pseudo-property is released.' },
].map((scenario) => ({
  ...scenario,
  dataKind: 'synthetic-second-virial-teaching-input',
  provenance: 'Synthetic pure-gas second virial coefficient used to expose low-density equation behaviour.',
  propertyBoundary: 'B is not attributed to a named gas, temperature-dependent property record, or reference equation of state.',
})));

export const FUGACITY_SCENARIO_BY_ID = deepFreeze(Object.fromEntries(
  FUGACITY_SCENARIOS.map((scenario) => [scenario.id, scenario]),
));

export const NONIDEAL_THERMODYNAMICS_BOUNDARY = deepFreeze({
  included: 'A synthetic binary three-suffix Margules activity field with modified low-pressure Raoult pressure and interior azeotrope roots; a synthetic symmetric regular-solution mixing-stability terrain with critical, binodal, spinodal, common-tangent, and lever-rule results; and a gated pure-gas second-density-virial fugacity calculation.',
  excluded: 'Measured or fitted mixture data, named-mixture prediction, universal activity models, electrolytes, association, Henry-law limits, multicomponent, solid, reactive, or caloric equilibrium, reference-quality or high-pressure equations of state, transport, kinetics, nucleation, morphology, process design, apparatus, operating procedure, and safety instruction.',
  activity: 'The activity instrument assumes a binary liquid, an ideal vapour, fixed synthetic saturation pressures, and dimensionless Margules parameters. Activity is ai = gammai xi; gammai alone is not activity or concentration.',
  stability: 'The regular-solution terrain is symmetric and dimensionless. Binodal, spinodal, local curvature, and equilibrium phase amounts are distinct results; no time evolution or real material identity is implied.',
  fugacity: 'The fugacity cell is a pure-gas second-density-virial truncation. It releases Z, phi, and f only when |BP/(RT)| <= 0.12 and does not turn a learner B into a certified substance property.',
  data: 'Every parameter cartridge is conspicuously synthetic. IUPAC and NIST sources support terminology, equations, and model boundaries—not the cartridge values.',
  runtime: 'All calculations and root solves run locally. No property database, phase-equilibrium package, language model, or remote chemistry service is queried at runtime.',
});

