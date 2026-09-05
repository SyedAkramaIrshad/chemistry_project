const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
};

const selectedSpecies = (record) => deepFreeze(record);

export const THERMOCHEMISTRY_SPECIES = deepFreeze([
  selectedSpecies({
    id: 'carbon-graphite', label: 'Carbon, graphite', formula: 'C', phase: 's', display: 'C(graphite, s)',
    formationEnthalpyKJmol: 0, uncertaintyKJmol: 0, referenceKind: 'standard-state-convention',
    sourceId: 'iupacStandardReactionQuantities',
    sourceNote: 'The element in its declared 298.15 K standard state is assigned zero standard enthalpy of formation for this ledger.',
  }),
  selectedSpecies({
    id: 'hydrogen-gas', label: 'Hydrogen', formula: 'H₂', phase: 'g', display: 'H₂(g)',
    formationEnthalpyKJmol: 0, uncertaintyKJmol: 0, referenceKind: 'standard-state-convention',
    sourceId: 'iupacStandardReactionQuantities',
    sourceNote: 'The element in its declared 298.15 K standard state is assigned zero standard enthalpy of formation for this ledger.',
  }),
  selectedSpecies({
    id: 'oxygen-gas', label: 'Oxygen', formula: 'O₂', phase: 'g', display: 'O₂(g)',
    formationEnthalpyKJmol: 0, uncertaintyKJmol: 0, referenceKind: 'standard-state-convention',
    sourceId: 'iupacStandardReactionQuantities',
    sourceNote: 'The element in its declared 298.15 K standard state is assigned zero standard enthalpy of formation for this ledger.',
  }),
  selectedSpecies({
    id: 'carbon-monoxide-gas', label: 'Carbon monoxide', formula: 'CO', phase: 'g', display: 'CO(g)',
    formationEnthalpyKJmol: -110.53, uncertaintyKJmol: 0.17, referenceKind: 'selected-reference',
    sourceId: 'nistCarbonMonoxideThermochemistry',
    sourceNote: 'Selected NIST CCCBDB CODATA standard gas formation enthalpy at 298.15 K; the displayed uncertainty belongs to that record.',
  }),
  selectedSpecies({
    id: 'carbon-dioxide-gas', label: 'Carbon dioxide', formula: 'CO₂', phase: 'g', display: 'CO₂(g)',
    formationEnthalpyKJmol: -393.51, uncertaintyKJmol: 0.13, referenceKind: 'selected-reference',
    sourceId: 'nistCarbonDioxideThermochemistry',
    sourceNote: 'Selected NIST CCCBDB CODATA standard gas formation enthalpy at 298.15 K; the displayed uncertainty belongs to that record.',
  }),
  selectedSpecies({
    id: 'methane-gas', label: 'Methane', formula: 'CH₄', phase: 'g', display: 'CH₄(g)',
    formationEnthalpyKJmol: -74.87, uncertaintyKJmol: null, referenceKind: 'selected-reference',
    sourceId: 'nistMethaneThermochemistry',
    sourceNote: 'Selected NIST Chemistry WebBook Chase review value at 298.15 K; no uncertainty is attached to the selected table row.',
  }),
  selectedSpecies({
    id: 'water-liquid', label: 'Water, liquid', formula: 'H₂O', phase: 'l', display: 'H₂O(l)',
    formationEnthalpyKJmol: -285.830, uncertaintyKJmol: 0.040, referenceKind: 'selected-reference',
    sourceId: 'nistWaterThermochemistry',
    sourceNote: 'Selected NIST Chemistry WebBook CODATA review value for liquid water at standard conditions, including its displayed uncertainty.',
  }),
  selectedSpecies({
    id: 'water-gas', label: 'Water, gas', formula: 'H₂O', phase: 'g', display: 'H₂O(g)',
    formationEnthalpyKJmol: -241.826, uncertaintyKJmol: 0.040, referenceKind: 'selected-reference',
    sourceId: 'nistWaterThermochemistry',
    sourceNote: 'Selected NIST Chemistry WebBook CODATA review value for gaseous water at standard conditions, including its displayed uncertainty.',
  }),
]);

export const THERMOCHEMISTRY_SPECIES_BY_ID = deepFreeze(Object.fromEntries(
  THERMOCHEMISTRY_SPECIES.map((species) => [species.id, species]),
));

const reaction = (id, label, stoichiometry, deltaHkJPerReaction, sourceKind = 'selected-formation-ledger') => ({
  id, label, stoichiometry, deltaHkJPerReaction, sourceKind,
});

const hessChallenge = (record) => deepFreeze({
  provenance: {
    kind: 'selected-reference-teaching',
    statement: 'Reaction enthalpies are frozen local sums of the selected 298.15 K reference records. They are not runtime lookups, reaction-occurrence predictions, or procedures.',
  },
  ...record,
});

export const HESS_CHALLENGES = deepFreeze([
  hessChallenge({
    id: 'carbon-monoxide-formation',
    code: 'HEAT 01',
    name: 'Build carbon monoxide',
    summary: 'Two sourced carbon-oxygen paths must be scaled and reversed so carbon dioxide disappears from the final species ledger.',
    mission: 'Construct the target without asking the board to choose a multiplier, then explain why reversing a reaction reverses its enthalpy sign.',
    target: reaction('target-co', '2C(graphite, s) + O₂(g) → 2CO(g)', {
      'carbon-graphite': -2, 'oxygen-gas': -1, 'carbon-monoxide-gas': 2,
    }, -221.06),
    cards: [
      reaction('carbon-combustion', 'C(graphite, s) + O₂(g) → CO₂(g)', {
        'carbon-graphite': -1, 'oxygen-gas': -1, 'carbon-dioxide-gas': 1,
      }, -393.51),
      reaction('co-oxidation', '2CO(g) + O₂(g) → 2CO₂(g)', {
        'carbon-monoxide-gas': -2, 'oxygen-gas': -1, 'carbon-dioxide-gas': 2,
      }, -565.96),
    ],
    expectedMultipliers: [2, -1],
    teacherQuestion: 'Which carbon-dioxide terms must cancel, and why must every coefficient and ΔrH° change together when a card is reversed or scaled?',
    misconception: 'Reaction enthalpy belongs to the written reaction extent; it is not a per-molecule label that stays unchanged when the equation is doubled or reversed.',
    sourceIds: ['iupacEnthalpy', 'iupacStandardReactionQuantities', 'iupacExtentOfReaction', 'nistCarbonMonoxideThermochemistry', 'nistCarbonDioxideThermochemistry', 'acsUndergraduateCurriculum'],
  }),
  hessChallenge({
    id: 'methane-combustion-cycle',
    code: 'HEAT 02',
    name: 'Close the methane cycle',
    summary: 'Three formation equations combine to reach methane combustion while every elemental reference species cancels correctly.',
    mission: 'Reverse methane formation, retain carbon-dioxide formation, scale liquid-water formation, and audit the resulting state-function sum.',
    target: reaction('target-methane-combustion', 'CH₄(g) + 2O₂(g) → CO₂(g) + 2H₂O(l)', {
      'methane-gas': -1, 'oxygen-gas': -2, 'carbon-dioxide-gas': 1, 'water-liquid': 2,
    }, -890.30),
    cards: [
      reaction('methane-formation', 'C(graphite, s) + 2H₂(g) → CH₄(g)', {
        'carbon-graphite': -1, 'hydrogen-gas': -2, 'methane-gas': 1,
      }, -74.87),
      reaction('co2-formation', 'C(graphite, s) + O₂(g) → CO₂(g)', {
        'carbon-graphite': -1, 'oxygen-gas': -1, 'carbon-dioxide-gas': 1,
      }, -393.51),
      reaction('liquid-water-formation', 'H₂(g) + ½O₂(g) → H₂O(l)', {
        'hydrogen-gas': -1, 'oxygen-gas': -0.5, 'water-liquid': 1,
      }, -285.830),
    ],
    expectedMultipliers: [-1, 1, 2],
    teacherQuestion: 'Why does a selected formation-enthalpy ledger give one path-independent target sum without replacing a direct combustion measurement and its uncertainty?',
    misconception: 'Agreement of a Hess sum with selected state data does not prove reaction occurrence, rate, mechanism, completeness, or experimental heat recovery.',
    sourceIds: ['iupacEnthalpy', 'iupacStandardReactionQuantities', 'iupacExtentOfReaction', 'nistMethaneThermochemistry', 'nistCarbonDioxideThermochemistry', 'nistWaterThermochemistry', 'acsUndergraduateCurriculum'],
  }),
  hessChallenge({
    id: 'water-phase-bridge',
    code: 'HEAT 03',
    name: 'Bridge liquid to vapour',
    summary: 'Two sourced formation equations share the same elemental endpoint but differ only in the declared phase of water.',
    mission: 'Reverse the liquid-water path, retain the gas-water path, and make the elemental reference states cancel to expose the phase bridge.',
    target: reaction('target-water-phase', 'H₂O(l) → H₂O(g)', {
      'water-liquid': -1, 'water-gas': 1,
    }, 44.004),
    cards: [
      reaction('gas-water-formation', 'H₂(g) + ½O₂(g) → H₂O(g)', {
        'hydrogen-gas': -1, 'oxygen-gas': -0.5, 'water-gas': 1,
      }, -241.826),
      reaction('liquid-water-formation', 'H₂(g) + ½O₂(g) → H₂O(l)', {
        'hydrogen-gas': -1, 'oxygen-gas': -0.5, 'water-liquid': 1,
      }, -285.830),
    ],
    expectedMultipliers: [1, -1],
    teacherQuestion: 'Why is the liquid-to-gas bridge positive when the gas formation value is less negative than the liquid formation value?',
    misconception: 'Identical chemical formulas do not make phase labels optional; H₂O(l) and H₂O(g) are distinct thermodynamic states in the ledger.',
    sourceIds: ['iupacEnthalpy', 'iupacStandardReactionQuantities', 'iupacExtentOfReaction', 'nistWaterThermochemistry', 'iupacHeatCapacity', 'acsUndergraduateCurriculum'],
  }),
]);

export const HESS_CHALLENGE_BY_ID = deepFreeze(Object.fromEntries(
  HESS_CHALLENGES.map((challenge) => [challenge.id, challenge]),
));

const calorimetryChallenge = (record) => deepFreeze({
  provenance: {
    kind: 'synthetic-teaching',
    statement: 'Mass, heat capacity, temperature change, vessel constant, and extent are synthetic local observations. They are not measured data or an operating procedure.',
  },
  sourceIds: ['iupacCalorimetry', 'iupacHeatCapacity', 'iupacEnthalpy', 'iupacExtentOfReaction', 'acsUndergraduateCurriculum'],
  ...record,
});

export const CALORIMETRY_CHALLENGES = deepFreeze([
  calorimetryChallenge({
    id: 'thermal-rise', code: 'CAL 01', name: 'Surroundings warm',
    summary: 'A positive synthetic temperature change sends heat into the solution and vessel while the declared reaction system loses it.',
    mission: 'Freeze the observed temperature rise, separate solution heat from vessel heat, and commit the system sign before opening the ledger.',
    defaults: { solutionMassG: 100, specificHeatJgK: 4.184, temperatureChangeK: 6.5, calorimeterConstantJK: 25, reactionExtentMol: 0.05 },
    teacherQuestion: 'Why does a warming surroundings jacket imply a negative qsystem under the declared adiabatic heat balance?',
    misconception: 'A positive thermometer change belongs to the surroundings response; it does not mean the reaction system gained heat.',
  }),
  calorimetryChallenge({
    id: 'thermal-fall', code: 'CAL 02', name: 'Surroundings cool',
    summary: 'A negative synthetic temperature change makes the solution and vessel lose heat while the declared reaction system gains it.',
    mission: 'Balance a cooling trace, keep every negative surroundings term visible, and distinguish endothermic system heat from a cold thermometer reading.',
    defaults: { solutionMassG: 80, specificHeatJgK: 4.184, temperatureChangeK: -5.2, calorimeterConstantJK: 18, reactionExtentMol: 0.06 },
    teacherQuestion: 'How can qsolution and qcal both be negative while the inferred reaction-system heat is positive?',
    misconception: 'Temperature decrease and negative qsurroundings imply a positive system heat under this boundary, not a negative reaction enthalpy.',
  }),
  calorimetryChallenge({
    id: 'vessel-matters', code: 'CAL 03', name: 'The vessel carries heat',
    summary: 'A large synthetic calorimeter constant makes omission of the vessel contribution visibly underestimate the inferred heat magnitude.',
    mission: 'Run the same observed temperature change with and without the vessel term, then defend why direction stays fixed while magnitude changes.',
    defaults: { solutionMassG: 50, specificHeatJgK: 4.184, temperatureChangeK: 8, calorimeterConstantJK: 120, reactionExtentMol: 0.04 },
    teacherQuestion: 'Why does adding a positive vessel heat-capacity term increase the inferred exothermic magnitude without changing its sign?',
    misconception: 'Ignoring the calorimeter does not merely remove decoration; it removes a real term from the declared surroundings heat ledger.',
  }),
]);

export const CALORIMETRY_CHALLENGE_BY_ID = deepFreeze(Object.fromEntries(
  CALORIMETRY_CHALLENGES.map((challenge) => [challenge.id, challenge]),
));

export const HESS_MULTIPLIERS = deepFreeze([-2, -1, -0.5, 0, 0.5, 1, 2]);

export const THERMOCHEMISTRY_MODEL_BOUNDARY = deepFreeze({
  hess: 'A matched species vector and closed enthalpy sum demonstrate the selected state-function ledger. This does not prove that the target reaction occurs, is fast, is complete, or follows the displayed path.',
  calorimetry: 'Every calorimetry observation is synthetic and not measured. The model assumes one effective solution heat capacity, one vessel constant, constant pressure, and no heat exchange beyond the displayed system-surroundings boundary.',
  data: 'Selected NIST values are frozen 298.15 K records with state and available uncertainty. No runtime thermochemical database is queried and no temperature correction is calculated.',
  safety: 'All equations and heat flows are virtual. No reagent quantity, mixing order, apparatus setup, chemical handling, exposure, or laboratory procedure is provided.',
});
