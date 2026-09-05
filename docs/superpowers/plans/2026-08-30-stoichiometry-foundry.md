# Stoichiometry Foundry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a graphical stoichiometry foundry where learners convert mass to amount, predict the limiting reactant and product yield, watch equation-sized batches consume feed, inspect leftovers, and audit percent yield without any automatic correction.

**Architecture:** Add immutable declared reaction scenarios and a pure calculation engine that depends only on the existing formula parser and molar-mass table. A lazy React module renders the engine as a freight-yard batch press, reaction-extent plot, mole bridge, prediction dock, yield weighbridge, trace, and evidence passport. The model assumes complete conversion according to one selected balanced overall equation and explicitly excludes kinetics, equilibrium conversion, side products, purity inference, and laboratory procedure.

**Tech Stack:** React 19, Vite 8, JavaScript ES modules, SVG, CSS, Node deterministic verification.

## Global Constraints

- Preserve every learner-entered amount, unit, limiter choice, product prediction, and isolated mass after checking.
- A rejected or incorrect prediction changes no feed or reaction state.
- Use only declared balanced overall equations; never infer products or completion conditions.
- Use `N_A = 6.02214076 × 10^23 mol^-1` exactly.
- Treat displayed particle packets as symbolic amount packets, never literal molecule counts or molecular dynamics.
- Treat theoretical yield as a stoichiometric upper bound under the declared complete-conversion model, not an experimental prediction.
- Report isolated yield above 100% as an audit inconsistency; do not clamp or repair it.
- Include no operational synthesis instructions, conditions, apparatus setup, or safety substitution.
- Use `apply_patch` for repository edits. Do not perform Git actions.

---

### Task 1: Declare reaction records, sources, and model passport

**Files:**
- Create: `src/data/stoichiometryScenarios.js`
- Modify: `src/data/scienceSources.js`

**Interfaces:**
- Produces: `STOICHIOMETRY_CONSTANTS`, `STOICHIOMETRY_SCENARIOS`, `STOICHIOMETRY_SCENARIO_LIST`, and `stoichiometryScenarioById(id)`.
- Produces: `MODEL_PASSPORTS.stoichiometryFoundry` and source keys consumed by the UI.

- [ ] **Step 1: Add six immutable declared equations**

```js
export const STOICHIOMETRY_CONSTANTS = Object.freeze({
  avogadroPerMol: 6.02214076e23,
});

const scenarios = [
  {
    id: 'water-synthesis',
    title: 'Water equation batches',
    equation: '2H₂ + O₂ → 2H₂O',
    reactants: [
      { id: 'h2', formula: 'H2', name: 'Hydrogen', coefficient: 2, accent: '#54cbe8' },
      { id: 'o2', formula: 'O2', name: 'Oxygen', coefficient: 1, accent: '#e86a4f' },
    ],
    products: [{ id: 'h2o', formula: 'H2O', name: 'Water', coefficient: 2, accent: '#7aa7ff' }],
    defaultFeeds: { h2: { value: 5, unit: 'mol' }, o2: { value: 2, unit: 'mol' } },
    boundary: 'Declared overall equation only; no ignition, rate, equilibrium, phase, or procedure is modelled.',
  },
  {
    id: 'ammonia-synthesis',
    title: 'Ammonia equation batches',
    equation: 'N₂ + 3H₂ → 2NH₃',
    reactants: [
      { id: 'n2', formula: 'N2', name: 'Nitrogen', coefficient: 1, accent: '#7aa7ff' },
      { id: 'h2', formula: 'H2', name: 'Hydrogen', coefficient: 3, accent: '#54cbe8' },
    ],
    products: [{ id: 'nh3', formula: 'NH3', name: 'Ammonia', coefficient: 2, accent: '#45c19a' }],
    defaultFeeds: { n2: { value: 1.5, unit: 'mol' }, h2: { value: 3, unit: 'mol' } },
    boundary: 'Complete-conversion arithmetic for the declared equation; no equilibrium, pressure, catalyst, rate, or process claim.',
  },
  {
    id: 'methane-combustion',
    title: 'Complete-combustion accounting',
    equation: 'CH₄ + 2O₂ → CO₂ + 2H₂O',
    reactants: [
      { id: 'ch4', formula: 'CH4', name: 'Methane', coefficient: 1, accent: '#f4c95d' },
      { id: 'o2', formula: 'O2', name: 'Oxygen', coefficient: 2, accent: '#e86a4f' },
    ],
    products: [
      { id: 'co2', formula: 'CO2', name: 'Carbon dioxide', coefficient: 1, accent: '#9aa9b2' },
      { id: 'h2o', formula: 'H2O', name: 'Water', coefficient: 2, accent: '#7aa7ff' },
    ],
    defaultFeeds: { ch4: { value: 1, unit: 'mol' }, o2: { value: 1, unit: 'mol' } },
    boundary: 'Complete combustion is declared, not predicted; incomplete products, heat, flame, mixing, and safety are excluded.',
  },
  {
    id: 'carbonate-acid',
    title: 'Carbonate reaction accounting',
    equation: 'CaCO₃ + 2HCl → CaCl₂ + CO₂ + H₂O',
    reactants: [
      { id: 'caco3', formula: 'CaCO3', name: 'Calcium carbonate', coefficient: 1, accent: '#d8e3e8' },
      { id: 'hcl', formula: 'HCl', name: 'Hydrogen chloride', coefficient: 2, accent: '#e86a4f' },
    ],
    products: [
      { id: 'cacl2', formula: 'CaCl2', name: 'Calcium chloride', coefficient: 1, accent: '#b9a7ee' },
      { id: 'co2', formula: 'CO2', name: 'Carbon dioxide', coefficient: 1, accent: '#9aa9b2' },
      { id: 'h2o', formula: 'H2O', name: 'Water', coefficient: 1, accent: '#7aa7ff' },
    ],
    defaultFeeds: { caco3: { value: 0.75, unit: 'mol' }, hcl: { value: 1, unit: 'mol' } },
    boundary: 'Formal complete-reaction accounting only; activities, dissolution, gas solubility, rate, heat, and procedure are excluded.',
  },
  {
    id: 'silver-chloride',
    title: 'Precipitation equation accounting',
    equation: 'AgNO₃ + NaCl → AgCl + NaNO₃',
    reactants: [
      { id: 'agno3', formula: 'AgNO3', name: 'Silver nitrate', coefficient: 1, accent: '#aebbc4' },
      { id: 'nacl', formula: 'NaCl', name: 'Sodium chloride', coefficient: 1, accent: '#7aa7ff' },
    ],
    products: [
      { id: 'agcl', formula: 'AgCl', name: 'Silver chloride', coefficient: 1, accent: '#f2f1ea' },
      { id: 'nano3', formula: 'NaNO3', name: 'Sodium nitrate', coefficient: 1, accent: '#b9a7ee' },
    ],
    defaultFeeds: { agno3: { value: 0.4, unit: 'mol' }, nacl: { value: 0.6, unit: 'mol' } },
    boundary: 'Declared precipitation equation only; concentration, activities, Ksp, particle size, separation, and procedure are excluded.',
  },
  {
    id: 'aluminium-oxide',
    title: 'Metal-oxide equation batches',
    equation: '4Al + 3O₂ → 2Al₂O₃',
    reactants: [
      { id: 'al', formula: 'Al', name: 'Aluminium', coefficient: 4, accent: '#c8d0d5' },
      { id: 'o2', formula: 'O2', name: 'Oxygen', coefficient: 3, accent: '#e86a4f' },
    ],
    products: [{ id: 'al2o3', formula: 'Al2O3', name: 'Aluminium oxide', coefficient: 2, accent: '#d8e3e8' }],
    defaultFeeds: { al: { value: 5, unit: 'mol' }, o2: { value: 3, unit: 'mol' } },
    boundary: 'One declared oxide equation; surface films, passivation, phases, kinetics, heat, morphology, and procedure are excluded.',
  },
];
```

- [ ] **Step 2: Add authoritative sources and a passport**

Add source records for ACS undergraduate curriculum, ACS stoichiometry education, MIT 5.111 prerequisite sequence, IUPAC stoichiometry, amount of substance, extent of reaction, molar mass, chemical yield, and the BIPM mole definition. The passport must name the complete-conversion assumption, average molar masses from the existing element table, exact Avogadro constant, included calculations, and excluded chemistry.

---

### Task 2: Build the pure stoichiometry engine test-first

**Files:**
- Create: `scripts/verify-stoichiometry.mjs`
- Create: `src/chemistry/stoichiometry.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: `ChemistryEngine.molarMass(formula)` and the scenario declarations.
- Produces: `convertFeedToMoles`, `analyzeStoichiometry`, `evaluateStoichiometryPrediction`, `analyzeChemicalYield`, `createExtentTrace`, and `STOICHIOMETRY_MODEL_BOUNDARY`.

- [ ] **Step 1: Write reference and invariant assertions**

```js
const water = analyzeStoichiometry({
  scenarioId: 'water-synthesis',
  feeds: { h2: { value: 5, unit: 'mol' }, o2: { value: 2, unit: 'mol' } },
  targetProductId: 'h2o',
});
assert.equal(water.limiting.kind, 'single');
assert.deepEqual(water.limiting.ids, ['o2']);
near(water.extentMol, 2, 1e-12);
near(water.reactants.find(x => x.id === 'h2').leftoverMoles, 1, 1e-12);
near(water.target.theoreticalMoles, 4, 1e-12);
near(water.target.theoreticalMassG, 72.06, 0.01);
near(water.target.entities, 4 * 6.02214076e23, 1e10);

const tie = analyzeStoichiometry({
  scenarioId: 'water-synthesis',
  feeds: { h2: { value: 4, unit: 'mol' }, o2: { value: 2, unit: 'mol' } },
  targetProductId: 'h2o',
});
assert.equal(tie.limiting.kind, 'stoichiometric');
assert.deepEqual(tie.limiting.ids.sort(), ['h2', 'o2']);

const yield75 = analyzeChemicalYield({ analysis: water, isolatedMassG: water.target.theoreticalMassG * 0.75 });
near(yield75.percentYield, 75, 1e-10);
assert.equal(yield75.status, 'within-theoretical');
const impossibleYield = analyzeChemicalYield({ analysis: water, isolatedMassG: 80 });
assert.equal(impossibleYield.status, 'above-theoretical');
```

Also assert gram-to-mole equivalence, methane multi-product output, exact mass-ledger closure, monotonic extent traces, preserved correct and incorrect predictions, zero-feed behavior, invalid units, negative values, missing products, and immutable inputs.

- [ ] **Step 2: Run the verifier and confirm the expected red state**

Run: `node scripts/verify-stoichiometry.mjs`

Expected: failure because `src/chemistry/stoichiometry.js` does not exist.

- [ ] **Step 3: Implement immutable amount and extent calculations**

```js
export function convertFeedToMoles({ formula, value, unit }) {
  requireNonNegative(value, 'Feed amount');
  if (unit === 'mol') return value;
  if (unit === 'g') return value / ChemistryEngine.molarMass(formula);
  throw new RangeError(`Unsupported feed unit: ${unit}.`);
}

export function analyzeStoichiometry({ scenarioId, feeds, targetProductId }) {
  const scenario = stoichiometryScenarioById(scenarioId);
  const reactants = scenario.reactants.map(species => {
    const feed = feeds[species.id];
    const initialMoles = convertFeedToMoles({ formula: species.formula, ...feed });
    return { ...species, feed: { ...feed }, molarMassGmol: ChemistryEngine.molarMass(species.formula), initialMoles, extentCapacityMol: initialMoles / species.coefficient };
  });
  const extentMol = Math.min(...reactants.map(item => item.extentCapacityMol));
  const tolerance = Math.max(1e-12, Math.abs(extentMol) * 1e-9);
  const limitingIds = reactants.filter(item => Math.abs(item.extentCapacityMol - extentMol) <= tolerance).map(item => item.id);
  const products = scenario.products.map(species => amountRecord(species, species.coefficient * extentMol));
  const target = products.find(item => item.id === targetProductId);
  return deepFreeze({
    scenario,
    extentMol,
    limiting: { kind: limitingIds.length === reactants.length ? 'stoichiometric' : 'single', ids: limitingIds },
    reactants: reactants.map(item => ({ ...item, consumedMoles: item.coefficient * extentMol, leftoverMoles: zeroSmall(item.initialMoles - item.coefficient * extentMol) })),
    products,
    target: { ...target, theoreticalMoles: target.amountMoles, theoreticalMassG: target.massG, entities: target.amountMoles * STOICHIOMETRY_CONSTANTS.avogadroPerMol },
    massLedger: buildMassLedger(reactants, products, extentMol),
  });
}
```

- [ ] **Step 4: Implement prediction, yield, and trace behavior**

`evaluateStoichiometryPrediction` must compare limiter identity and target amount independently, retain entered values in its return object, and use a 3% relative tolerance for a nonzero product prediction. `analyzeChemicalYield` must return raw percent yield and an explicit above-theoretical warning. `createExtentTrace` must return at least 41 monotonic points from `xi = 0` through the maximum declared extent.

- [ ] **Step 5: Run the verifier and confirm green**

Run: `npm run verify:stoichiometry`

Expected: water reference, tie, gram/mole equivalence, multi-product balance, prediction preservation, yield audit, monotonic trace, and rejection boundaries all pass.

---

### Task 3: Build the Mole Freight Yard interaction

**Files:**
- Create: `src/components/StoichiometryLab.jsx`
- Create: `src/styles/stoichiometry.css`

**Interfaces:**
- Consumes every Task 2 engine export and `MODEL_PASSPORTS.stoichiometryFoundry`.
- Produces a lazy-loadable default React component rooted at `#stoichiometryLab`.

- [ ] **Step 1: Establish the visual system**

Use this compact token system:

```css
:root {
  --stoich-ink:#13233a;
  --stoich-blueprint:#17395f;
  --stoich-steel:#d8e3e8;
  --stoich-signal:#f4c95d;
  --stoich-limit:#e86a4f;
  --stoich-product:#45c19a;
}
```

Layout concept:

```text
[declared equation cards] [reactant feed manifests]
              \             /
        [coefficient sprockets]
          [central batch press]
     [leftovers]       [products]
[prediction dock] [mole bridge + mass ledger]
[extent plot] [isolated-yield weighbridge]
[learning trace] [teacher passport + sources]
```

The signature element is the central batch press: each reactant lane carries symbolic packets through a gate labelled by its stoichiometric coefficient; after checking, the limiting lane visibly reaches zero while excess packets remain parked. Keep all surrounding cards quiet and utilitarian.

- [ ] **Step 2: Implement learner-owned state and prediction gating**

```jsx
const [scenarioId, setScenarioId] = useState('water-synthesis');
const [feeds, setFeeds] = useState(STOICHIOMETRY_SCENARIOS['water-synthesis'].defaultFeeds);
const [targetProductId, setTargetProductId] = useState('h2o');
const [prediction, setPrediction] = useState({ limitingId: null, targetValue: '', targetUnit: 'mol' });
const [check, setCheck] = useState(null);
const [isolatedMass, setIsolatedMass] = useState('');

const analysis = useMemo(
  () => analyzeStoichiometry({ scenarioId, feeds, targetProductId }),
  [scenarioId, feeds, targetProductId],
);
```

Changing a feed, unit, scenario, or target must preserve learner predictions where meaningful but conceal prior results and state why rechecking is required. The check button must block until both limiter and target amount are supplied. Wrong predictions must remain pressed and visible next to the model comparison.

- [ ] **Step 3: Render all three representational levels**

The interface must connect:

- symbolic: balanced coefficients and `dξ = dn/ν`;
- particulate: bounded symbolic packet trains labelled “one packet is an amount token, not one molecule”;
- macroscopic: grams, moles, molar mass, entities, theoretical mass, and isolated mass.

Render an SVG extent plot with reactant lines falling and product lines rising. Do not animate packets when `prefers-reduced-motion` is set.

- [ ] **Step 4: Add yield audit, trace, and teacher lens**

The isolated-mass check must preserve values above theoretical yield and explain possible wet/impure product, wrong identity, measurement error, or invalid complete-conversion assumptions without choosing one. Add teacher prompts for “smallest amount is not necessarily limiting,” coefficients versus subscripts, why theoretical yield is not a kinetic prediction, and why 100% is not guaranteed.

- [ ] **Step 5: Implement responsive containment**

At 760 px and below, reorder the module into scenario → feeds → foundry → prediction → ledgers → yield → trace → passport. All controls must be at least 44 px high. The foundry may scroll horizontally inside its own stage at phone width; the page itself must never overflow.

---

### Task 4: Integrate curriculum, navigation, numbering, and contributor guidance

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/Header.jsx`
- Modify: `src/components/SolutionLab.jsx`
- Modify: `src/components/EnergyLab.jsx`
- Modify: `src/components/ElectrochemistryLab.jsx`
- Modify: `src/components/GasPhaseLab.jsx`
- Modify: `src/components/SpectroscopyLab.jsx`
- Modify: `src/components/BiomolecularStudio.jsx`
- Modify: `src/components/EnzymeKineticsLab.jsx`
- Modify: `src/components/MechanismLab.jsx`
- Modify: `src/components/CoordinationFieldLab.jsx`
- Modify: `src/components/CrystalLatticeLab.jsx`
- Modify: `src/components/ReactionLab.jsx`
- Modify: `src/components/EquationSections.jsx`
- Modify: `src/data/curriculum.js`
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`

**Interfaces:**
- Adds the lazy module immediately after `LabWorkspace`.
- Adds `#stoichiometryLab` to direct desktop and mobile navigation as “Moles”; moves Gases into More without removing access.

- [ ] **Step 1: Lazy-load and renumber the learning sequence**

Number the foundry `02`, then shift Solution through Equation Balancer to `03` through `14`. Keep the molecular workbench as `01`.

- [ ] **Step 2: Extend five curriculum disciplines truthfully**

Add live outcomes/topics/lab links to General, Organic, Inorganic, Physical, and Analytical where the declared equations, amount, mass conservation, reaction extent, or yield actually apply. Do not mark reaction prediction, experimental conversion, purity, equilibrium conversion, or process design live.

- [ ] **Step 3: Document architecture, command, evidence, and boundary**

Add `npm run verify:stoichiometry`, new paths, exact water reference outputs, model assumptions, and the contributor journey. The browser review must include an incorrect “smallest amount” limiter choice, a stoichiometric tie, gram-versus-mole equivalence, a multi-product equation, a 75% isolated yield, and a preserved above-100% audit.

---

### Task 5: Complete deterministic and live product validation

**Files:**
- Verify only after the final edit set.

- [ ] **Step 1: Run all twelve deterministic engines**

Run every `npm run verify:*` command, including `verify:stoichiometry`.

Expected: every command exits 0 with its reference and invariant summary.

- [ ] **Step 2: Build the production bundle**

Run: `npm run build`

Expected: Vite exits 0 and emits a lazy StoichiometryLab chunk.

- [ ] **Step 3: Use the live UI as a learner**

At the water scenario, select Hydrogen as limiting for 5 mol H2 plus 2 mol O2, predict 3 mol H2O, and check. The wrong choices must remain while the model shows O2 limiting, `xi = 2 mol`, 1 mol H2 left, and 4 mol H2O. Then enter the correct prediction and verify all dimensions pass. Repeat with equivalent gram inputs and a 4:2 mol tie.

- [ ] **Step 4: Use the live UI as a teacher**

Verify equation provenance, complete-conversion language, symbolic-packet disclaimer, extent/mass closure, isolated-yield warnings, primary sources, exclusions, and attempt trace. Confirm that no text presents the model as reaction prediction or procedure.

- [ ] **Step 5: Audit desktop, intermediate, and phone UI**

At 1280, 742, and 390 px, verify lazy hash alignment, page-width containment, internal-only foundry scrolling, 44 px controls, visible focus, reduced-motion behavior, and zero new runtime warnings/errors. Leave the app open at `#stoichiometryLab` in the normal 742 px viewport.

## Self-review

- Spec coverage: pure amount/extent/yield engine, graphical learner interaction, prediction preservation, teacher evidence, open-source documentation, and responsive/runtime validation are all assigned.
- Placeholder scan: no TBD, TODO, “similar to,” or unbounded implementation step remains.
- Type consistency: scenario IDs, feed records, prediction fields, engine exports, and DOM anchor names match across tasks.

## Execution handoff

The user delegated implementation order and asked continuous development, so execute this plan inline with `superpowers:executing-plans`; do not pause for an execution-method choice.
