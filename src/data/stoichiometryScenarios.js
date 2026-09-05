export const STOICHIOMETRY_CONSTANTS = Object.freeze({
  avogadroPerMol: 6.02214076e23,
});

const freezeSpecies = (species) => Object.freeze({ ...species });
const freezeScenario = (scenario) => Object.freeze({
  ...scenario,
  reactants: Object.freeze(scenario.reactants.map(freezeSpecies)),
  products: Object.freeze(scenario.products.map(freezeSpecies)),
  defaultFeeds: Object.freeze(Object.fromEntries(
    Object.entries(scenario.defaultFeeds).map(([id, feed]) => [id, Object.freeze({ ...feed })]),
  )),
});

export const STOICHIOMETRY_SCENARIO_LIST = Object.freeze([
  freezeScenario({
    id: 'water-synthesis',
    title: 'Water equation batches',
    shortTitle: 'Water',
    family: 'Combination equation',
    equation: '2H₂ + O₂ → 2H₂O',
    reactants: [
      { id: 'h2', formula: 'H2', displayFormula: 'H₂', name: 'Hydrogen', coefficient: 2, accent: '#54cbe8' },
      { id: 'o2', formula: 'O2', displayFormula: 'O₂', name: 'Oxygen', coefficient: 1, accent: '#e86a4f' },
    ],
    products: [
      { id: 'h2o', formula: 'H2O', displayFormula: 'H₂O', name: 'Water', coefficient: 2, accent: '#7aa7ff' },
    ],
    defaultTargetProductId: 'h2o',
    defaultFeeds: { h2: { value: 5, unit: 'mol' }, o2: { value: 2, unit: 'mol' } },
    boundary: 'Declared overall equation only; no ignition, rate, equilibrium, phase, or procedure is modelled.',
  }),
  freezeScenario({
    id: 'ammonia-synthesis',
    title: 'Ammonia equation batches',
    shortTitle: 'Ammonia',
    family: 'Combination equation',
    equation: 'N₂ + 3H₂ → 2NH₃',
    reactants: [
      { id: 'n2', formula: 'N2', displayFormula: 'N₂', name: 'Nitrogen', coefficient: 1, accent: '#7aa7ff' },
      { id: 'h2', formula: 'H2', displayFormula: 'H₂', name: 'Hydrogen', coefficient: 3, accent: '#54cbe8' },
    ],
    products: [
      { id: 'nh3', formula: 'NH3', displayFormula: 'NH₃', name: 'Ammonia', coefficient: 2, accent: '#45c19a' },
    ],
    defaultTargetProductId: 'nh3',
    defaultFeeds: { n2: { value: 1.5, unit: 'mol' }, h2: { value: 3, unit: 'mol' } },
    boundary: 'Complete-conversion arithmetic for the declared equation; no equilibrium, pressure, catalyst, rate, or process claim.',
  }),
  freezeScenario({
    id: 'methane-combustion',
    title: 'Complete-combustion accounting',
    shortTitle: 'Combustion',
    family: 'Declared complete combustion',
    equation: 'CH₄ + 2O₂ → CO₂ + 2H₂O',
    reactants: [
      { id: 'ch4', formula: 'CH4', displayFormula: 'CH₄', name: 'Methane', coefficient: 1, accent: '#f4c95d' },
      { id: 'o2', formula: 'O2', displayFormula: 'O₂', name: 'Oxygen', coefficient: 2, accent: '#e86a4f' },
    ],
    products: [
      { id: 'co2', formula: 'CO2', displayFormula: 'CO₂', name: 'Carbon dioxide', coefficient: 1, accent: '#9aa9b2' },
      { id: 'h2o', formula: 'H2O', displayFormula: 'H₂O', name: 'Water', coefficient: 2, accent: '#7aa7ff' },
    ],
    defaultTargetProductId: 'co2',
    defaultFeeds: { ch4: { value: 1, unit: 'mol' }, o2: { value: 1, unit: 'mol' } },
    boundary: 'Complete combustion is declared, not predicted; incomplete products, heat, flame, mixing, and safety are excluded.',
  }),
  freezeScenario({
    id: 'carbonate-acid',
    title: 'Carbonate reaction accounting',
    shortTitle: 'Carbonate',
    family: 'Declared acid–carbonate equation',
    equation: 'CaCO₃ + 2HCl → CaCl₂ + CO₂ + H₂O',
    reactants: [
      { id: 'caco3', formula: 'CaCO3', displayFormula: 'CaCO₃', name: 'Calcium carbonate', coefficient: 1, accent: '#d8e3e8' },
      { id: 'hcl', formula: 'HCl', displayFormula: 'HCl', name: 'Hydrogen chloride', coefficient: 2, accent: '#e86a4f' },
    ],
    products: [
      { id: 'cacl2', formula: 'CaCl2', displayFormula: 'CaCl₂', name: 'Calcium chloride', coefficient: 1, accent: '#b9a7ee' },
      { id: 'co2', formula: 'CO2', displayFormula: 'CO₂', name: 'Carbon dioxide', coefficient: 1, accent: '#9aa9b2' },
      { id: 'h2o', formula: 'H2O', displayFormula: 'H₂O', name: 'Water', coefficient: 1, accent: '#7aa7ff' },
    ],
    defaultTargetProductId: 'co2',
    defaultFeeds: { caco3: { value: 0.75, unit: 'mol' }, hcl: { value: 1, unit: 'mol' } },
    boundary: 'Formal complete-reaction accounting only; activities, dissolution, gas solubility, rate, heat, and procedure are excluded.',
  }),
  freezeScenario({
    id: 'silver-chloride',
    title: 'Precipitation equation accounting',
    shortTitle: 'Precipitation',
    family: 'Declared precipitation equation',
    equation: 'AgNO₃ + NaCl → AgCl + NaNO₃',
    reactants: [
      { id: 'agno3', formula: 'AgNO3', displayFormula: 'AgNO₃', name: 'Silver nitrate', coefficient: 1, accent: '#aebbc4' },
      { id: 'nacl', formula: 'NaCl', displayFormula: 'NaCl', name: 'Sodium chloride', coefficient: 1, accent: '#7aa7ff' },
    ],
    products: [
      { id: 'agcl', formula: 'AgCl', displayFormula: 'AgCl', name: 'Silver chloride', coefficient: 1, accent: '#f2f1ea' },
      { id: 'nano3', formula: 'NaNO3', displayFormula: 'NaNO₃', name: 'Sodium nitrate', coefficient: 1, accent: '#b9a7ee' },
    ],
    defaultTargetProductId: 'agcl',
    defaultFeeds: { agno3: { value: 0.4, unit: 'mol' }, nacl: { value: 0.6, unit: 'mol' } },
    boundary: 'Declared precipitation equation only; concentration, activities, Ksp, particle size, separation, and procedure are excluded.',
  }),
  freezeScenario({
    id: 'aluminium-oxide',
    title: 'Metal-oxide equation batches',
    shortTitle: 'Metal oxide',
    family: 'Declared oxidation equation',
    equation: '4Al + 3O₂ → 2Al₂O₃',
    reactants: [
      { id: 'al', formula: 'Al', displayFormula: 'Al', name: 'Aluminium', coefficient: 4, accent: '#c8d0d5' },
      { id: 'o2', formula: 'O2', displayFormula: 'O₂', name: 'Oxygen', coefficient: 3, accent: '#e86a4f' },
    ],
    products: [
      { id: 'al2o3', formula: 'Al2O3', displayFormula: 'Al₂O₃', name: 'Aluminium oxide', coefficient: 2, accent: '#d8e3e8' },
    ],
    defaultTargetProductId: 'al2o3',
    defaultFeeds: { al: { value: 5, unit: 'mol' }, o2: { value: 3, unit: 'mol' } },
    boundary: 'One declared oxide equation; surface films, passivation, phases, kinetics, heat, morphology, and procedure are excluded.',
  }),
]);

export const STOICHIOMETRY_SCENARIOS = Object.freeze(Object.fromEntries(
  STOICHIOMETRY_SCENARIO_LIST.map((scenario) => [scenario.id, scenario]),
));

export function stoichiometryScenarioById(id) {
  const scenario = STOICHIOMETRY_SCENARIOS[id];
  if (!scenario) throw new RangeError(`Unknown stoichiometry scenario: ${id}.`);
  return scenario;
}
