# Thermodynamics and Kinetics Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a graphical reaction-coordinate laboratory that teaches why thermodynamic favorability, kinetic speed, temperature, and catalysis are related but not interchangeable.

**Architecture:** A pure ES module computes ΔG°, K, Arrhenius rate constants, activation barriers, rate acceleration, half-life, and first-order concentration traces. A React laboratory renders two reaction-coordinate passes and two kinetic traces from the same structured analysis, with a model passport and explicit invalid-state explanations.

**Tech Stack:** React 19, Vite 8, JavaScript ES modules, SVG, CSS custom properties, Node numerical verification.

## Global Constraints

- ΔG° = ΔH° − TΔS° assumes ΔH° and ΔS° remain constant across the selected temperature range.
- K is a dimensionless standard-state ideal equilibrium constant calculated from ΔG° = −RT ln K.
- Forward kinetics use one first-order Arrhenius model, k = A exp(−Ea/RT).
- A catalyst lowers forward and reverse barriers equally and must not change ΔH°, ΔS°, ΔG°, or K.
- The reaction-coordinate graphic is a schematic enthalpy/potential-energy profile, not a computed transition-state surface.
- An endothermic product cannot lie above the entered transition state; invalid energy geometry must be explained and left unmodified.
- No measured reaction constants, remote API, or paid model is used.

## Design System

- **Activation amber `#FFB547`:** uncatalyzed transition-state path.
- **Catalyst cyan `#63E6FF`:** lowered barrier and catalyzed kinetic trace.
- **Reactant coral `#FF6B7A`:** starting energy and remaining reactant.
- **Product violet `#A78BFA`:** product energy and reaction progress.
- **Favorable mint `#5AE2B6`:** negative ΔG° and product-favored equilibrium.
- **Deep field `#061426`:** coordinate and kinetics stage.
- **Notebook `#F4F7F2`:** equations, assumptions, and teacher interpretation.

## File Structure

- Create `src/chemistry/thermokinetics.js`: pure thermodynamics, Arrhenius, validation, and trace functions.
- Create `scripts/verify-thermokinetics.mjs`: numerical and invariant verification.
- Create `src/components/EnergyLab.jsx`: controls, coordinate landscape, kinetic race, explanation, and passport.
- Modify `src/data/scienceSources.js`: add the thermodynamics/kinetics model passport.
- Modify `src/App.jsx`: compose the energy lab after solution equilibrium.
- Modify `src/components/Header.jsx`: add an Energy destination and shorten mobile Build copy.
- Modify `src/data/curriculum.js`: promote bounded energy/equilibrium/kinetics topics honestly.
- Modify `src/components/ReactionLab.jsx` and `src/components/EquationSections.jsx`: advance section numbers.
- Modify `src/styles.css`: add the responsive visual system and six-item navigation.
- Modify `package.json`: add `verify:thermokinetics`.
- Modify `README.md` and `CONTRIBUTING.md`: document scope, verification, and extension rules.

---

### Task 1: Pure Thermodynamics and Kinetics Engine

**Files:**
- Create: `src/chemistry/thermokinetics.js`
- Create: `scripts/verify-thermokinetics.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `analyzeThermoKinetics(params): ThermoKineticAnalysis`
- Produces: `firstOrderTrace(rateConstant, maximumTimeS, sampleCount = 101): TracePoint[]`
- `params`: `{ deltaHkJ, deltaSJ, temperatureK, activationKJ, catalystReductionKJ, preExponentialPerS }`

- [ ] **Step 1: Write reference checks**

For ΔH° = −50 kJ mol⁻¹, ΔS° = −100 J mol⁻¹ K⁻¹, T = 298 K, Ea = 75 kJ mol⁻¹, catalyst lowering = 15 kJ mol⁻¹, and A = 10¹² s⁻¹:

```js
assert.ok(Math.abs(result.thermodynamics.deltaGkJ + 20.2) < 1e-10);
assert.ok(result.thermodynamics.equilibriumConstant > 1);
assert.ok(result.kinetics.catalyzed.rateConstantPerS > result.kinetics.uncatalyzed.rateConstantPerS);
assert.ok(result.kinetics.rateAcceleration > 400);
```

- [ ] **Step 2: Implement thermodynamic state**

Return ΔG°, ln K, log₁₀ K, a safe K representation, favored side, temperature crossover when positive, equations, and assumptions.

- [ ] **Step 3: Implement barriers and Arrhenius kinetics**

Calculate forward and reverse barriers, catalyzed barriers, forward rate constants, first-order half-lives, and catalyst acceleration. Return an invalid result when any transition state lies below a reactant/product endpoint.

- [ ] **Step 4: Generate concentration traces**

Return monotonic C/C₀ = exp(−kt) points over six uncatalyzed half-lives for uncatalyzed and catalyzed paths.

- [ ] **Step 5: Run verification**

Run `npm run verify:thermokinetics`. Expected output confirms temperature changes ΔG°/K, catalyst invariance of ΔG°/K, faster catalyzed decay, monotonic traces, and invalid barrier rejection.

### Task 2: Reaction-Coordinate and Kinetic-Race Interface

**Files:**
- Create `src/components/EnergyLab.jsx`
- Modify `src/App.jsx`
- Modify `src/styles.css`

**Interfaces:**
- Consumes: `analyzeThermoKinetics`, `firstOrderTrace`
- Produces DOM section: `#energyLab`

- [ ] **Step 1: Build condition controls**

Provide presets and labelled inputs for ΔH°, ΔS°, temperature, Ea, catalyst lowering, and log₁₀ A. Add 250 K, 298 K, 400 K, and 600 K semantic temperature buttons.

- [ ] **Step 2: Render the dual mountain pass**

Use one reactant level and one product level with a high amber uncatalyzed path and lower cyan catalyzed path. Label ΔH°, Ea forward, Ea reverse, and catalyst reduction.

- [ ] **Step 3: Separate favorable from fast**

Display a thermodynamic verdict from ΔG°/K and a kinetic verdict from k/half-life in distinct panels. State that a catalyst changes only the kinetic panel.

- [ ] **Step 4: Render the kinetic race**

Plot uncatalyzed and catalyzed C/C₀ traces on the same time axis and show remaining-reactant particle lanes at a learner-controlled observation time.

- [ ] **Step 5: Explain invalid energy inputs**

If Ea or catalyst lowering makes a transition state lie below an endpoint, preserve the entered values and show the exact geometric reason plus the minimum valid barrier.

### Task 3: Provenance, Curriculum, and Navigation

**Files:**
- Modify `src/data/scienceSources.js`
- Modify `src/components/Header.jsx`
- Modify `src/data/curriculum.js`
- Modify `src/components/ReactionLab.jsx`
- Modify `src/components/EquationSections.jsx`

**Interfaces:**
- New model passport: `MODEL_PASSPORTS.thermoKinetics`
- New navigation destination: `#energyLab`

- [ ] **Step 1: Add the model passport**

Label all outputs computed, list constant-ΔH/ΔS and first-order assumptions, and exclude mechanisms, tunnelling, diffusion, nonideal activities, heat capacities, and measured transition states.

- [ ] **Step 2: Integrate navigation and section order**

Use Learn, Build, Solutions, Energy, React, and Balance in both desktop and responsive navigation. Energy is section 03, Reaction section 04, and Balance section 05.

- [ ] **Step 3: Correct curriculum coverage**

Mark bounded standard-state ΔG/K, Arrhenius temperature dependence, catalyst barrier comparison, and first-order decay as live in General, Physical, and Organic chemistry while retaining advanced thermodynamics, mechanisms, and quantum kinetics as unavailable.

### Task 4: Documentation and Learning Audit

**Files:**
- Modify `README.md`
- Modify `CONTRIBUTING.md`

**Interfaces:**
- Student journey: compare 298 K and 600 K, then change catalyst lowering from 0 to 15 kJ mol⁻¹.
- Teacher journey: verify ΔG°/K change with temperature, remain unchanged with catalyst, and invalid barriers explain themselves.

- [ ] **Step 1: Document scope and verification**

Add the engine, UI, verification command, assumptions, exclusions, and contributor extension seam.

- [ ] **Step 2: Run the student browser journey**

Verify the temperature changes ΔG°/K and both kinetic traces, while catalyst lowering changes k/half-life only.

- [ ] **Step 3: Run the teacher browser journey**

Verify the equations, model passport, catalyst invariance statement, and structured invalid-barrier message.

- [ ] **Step 4: Verify desktop and narrow layouts**

Confirm no horizontal overflow, both paths remain legible, the six-item dock is usable, and reduced-motion styles suppress particle animation.

- [ ] **Step 5: Run final commands**

Run `npm run verify:thermokinetics`, `npm run verify:equilibrium`, and `npm run build`; all must exit 0.
