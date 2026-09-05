const freezeComponent = (component) => Object.freeze({
  ...component,
  antoine: Object.freeze({ ...component.antoine }),
  validTemperatureK: Object.freeze({ ...component.validTemperatureK }),
});

export const VLE_COMPONENTS = Object.freeze({
  benzene: freezeComponent({
    id: 'benzene', name: 'Benzene', formula: 'C₆H₆', cas: '71-43-2', accent: '#ffb33f',
    antoine: { A: 4.72583, B: 1660.652, C: -1.461 },
    validTemperatureK: { minimum: 333.4, maximum: 373.5 },
    sourceId: 'nistBenzeneAntoine',
    reference: 'Eon, Pommier, et al. (1971) coefficients calculated by NIST from source data.',
    hazardBoundary: 'Benzene is hazardous. This virtual record is not permission or instruction to obtain, handle, heat, or distil it.',
  }),
  toluene: freezeComponent({
    id: 'toluene', name: 'Toluene', formula: 'C₇H₈', cas: '108-88-3', accent: '#695dd8',
    antoine: { A: 4.07827, B: 1343.943, C: -53.773 },
    validTemperatureK: { minimum: 308.52, maximum: 384.66 },
    sourceId: 'nistTolueneAntoine',
    reference: 'Williamham, Taylor, et al. (1945) coefficients compiled by NIST.',
    hazardBoundary: 'Toluene is hazardous. The named record supports a virtual equilibrium calculation only.',
  }),
  hexane: freezeComponent({
    id: 'hexane', name: 'n-Hexane', formula: 'C₆H₁₄', cas: '110-54-3', accent: '#ffb33f',
    antoine: { A: 4.00266, B: 1171.53, C: -48.784 },
    validTemperatureK: { minimum: 286.18, maximum: 342.69 },
    sourceId: 'nistHexaneAntoine',
    reference: 'Williamham, Taylor, et al. (1945) coefficients compiled by NIST.',
    hazardBoundary: 'n-Hexane is hazardous. The named record supports a virtual equilibrium calculation only.',
  }),
  heptane: freezeComponent({
    id: 'heptane', name: 'n-Heptane', formula: 'C₇H₁₆', cas: '142-82-5', accent: '#695dd8',
    antoine: { A: 4.02832, B: 1268.636, C: -56.199 },
    validTemperatureK: { minimum: 299.07, maximum: 372.43 },
    sourceId: 'nistHeptaneAntoine',
    reference: 'Williamham, Taylor, et al. (1945) coefficients compiled by NIST.',
    hazardBoundary: 'n-Heptane is hazardous. The named record supports a virtual equilibrium calculation only.',
  }),
});

export const VLE_COMPONENT_BY_ID = VLE_COMPONENTS;

const freezePair = (pair) => Object.freeze({
  ...pair,
  validTemperatureK: Object.freeze({ ...pair.validTemperatureK }),
});

export const BINARY_VLE_PAIRS = Object.freeze([
  freezePair({
    id: 'benzene-toluene', name: 'Benzene / toluene', component1Id: 'benzene', component2Id: 'toluene',
    validTemperatureK: { minimum: 333.4, maximum: 373.5 },
    defaultPxyTemperatureK: 353.15, defaultTxyPressureBar: 0.65, defaultOverallFraction1: 0.5,
    teachingQuestion: 'Why is the equilibrium vapour richer in the component with the larger pure saturation pressure?',
    idealityBoundary: 'The app imposes γ₁ = γ₂ = 1 and ideal-gas partial pressures. It does not certify that measured benzene/toluene mixtures are ideal.',
    hazardBoundary: 'Benzene and toluene are hazardous. This is a virtual data-backed teaching pair, not an experiment or handling procedure.',
  }),
  freezePair({
    id: 'hexane-heptane', name: 'n-Hexane / n-heptane', component1Id: 'hexane', component2Id: 'heptane',
    validTemperatureK: { minimum: 299.07, maximum: 342.69 },
    defaultPxyTemperatureK: 323.15, defaultTxyPressureBar: 0.30, defaultOverallFraction1: 0.5,
    teachingQuestion: 'How do bubble and dew boundaries move when the two pure vapour pressures draw closer?',
    idealityBoundary: 'The app imposes γ₁ = γ₂ = 1 and ideal-gas partial pressures. It does not certify measured n-hexane/n-heptane ideality.',
    hazardBoundary: 'n-Hexane and n-heptane are hazardous. This is a virtual data-backed teaching pair, not an experiment or handling procedure.',
  }),
]);

export const BINARY_VLE_PAIR_BY_ID = Object.freeze(Object.fromEntries(BINARY_VLE_PAIRS.map((pair) => [pair.id, pair])));

export const BINARY_VLE_MODEL_BOUNDARY = Object.freeze({
  included: 'Two declared ideal binary pairs, four ranged NIST pure-component Antoine records, P-x-y and T-x-y bubble/dew curves, equilibrium amount fractions, partial pressures, and lever-rule phase amounts.',
  excluded: 'Measured mixture VLE, actual ideality certification, nonunity activity or fugacity coefficients, azeotropes, multicomponent, liquid-liquid, solid, reactive, high-pressure, caloric, transport, kinetic, process-design, apparatus, and operating-procedure models.',
  equation: 'The model sets γi = 1 and φi = 1, so xi pi* = yi p and p = Σ xi pi*. These are explicit ideal-mixture teaching assumptions.',
  fraction: 'x, y, and z are amount fractions. They are not mass, volume, concentration, or percentage inputs.',
  lever: 'Phase fractions come from total and component amount balances after equilibrium x and y are established; they are not rates or residence-time predictions.',
  data: 'Only the displayed pure-component vapour-pressure correlations are NIST records. Every binary result is calculated locally from the declared ideal assumptions.',
  hazard: 'All named substances are represented virtually. No preparation, heating, distillation, exposure, scale, apparatus, or safety instruction is provided.',
});
