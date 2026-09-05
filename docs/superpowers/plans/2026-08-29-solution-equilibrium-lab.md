# Solution Equilibrium Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a scientifically bounded, graphical weak-acid/strong-base titration laboratory that teaches how pH, species, and the governing approximation change across a titration.

**Architecture:** A pure ES-module equilibrium engine owns every calculation and can run in Node or the browser. A React laboratory consumes only structured engine results, renders an SVG curve and species vessel, and displays a model passport that separates conditions, assumptions, equations, and computed outputs from measured data.

**Tech Stack:** React 19, Vite 8, JavaScript ES modules, SVG, CSS custom properties, Node-based numerical verification.

## Global Constraints

- The implemented experiment is a monoprotic weak acid titrated by a strong monovalent base in ideal dilute aqueous solution at 25 °C.
- pKa is a learner-controlled model input; example values must be labelled approximate and must not be presented as universal measured constants.
- The engine must identify initial-acid, buffer, half-equivalence, equivalence, and excess-base regions.
- Every result must expose the equation/model used, not only a pH number.
- The interface must not imply that activity coefficients, temperature dependence, polyprotic equilibria, precipitation, complexation, or ionic-strength effects are included.
- No backend, account, external API, or paid model is required.

## Design System

- **Acid coral `#FF6B7A`:** HA-dominant solution and low-pH curve regions.
- **Neutral cyan `#63E6FF`:** equivalence marker, selection, and live instrument traces.
- **Base violet `#A78BFA`:** A⁻/OH⁻-dominant solution and high-pH regions.
- **Indicator mint `#5AE2B6`:** verified conditions and conservation.
- **Deep field `#061426`:** chart and vessel stage.
- **Notebook `#F4F7F2`:** assumptions, equations, and teacher interpretation.
- Display typography remains Avenir Next Condensed, prose uses the system sans stack, and quantities use SF Mono/Menlo.

## File Structure

- Create `src/chemistry/equilibrium.js`: pure calculations and structured regime explanations.
- Create `scripts/verify-equilibrium.mjs`: numerical reference and invariant checks.
- Create `src/data/scienceSources.js`: model passport and authoritative terminology links.
- Create `src/components/SolutionLab.jsx`: controls, vessel, SVG curve, species readout, and model passport.
- Modify `src/App.jsx`: add the solution lab before the reaction chamber.
- Modify `src/components/Header.jsx`: add a Solutions destination to desktop and mobile navigation.
- Modify `src/data/curriculum.js`: promote the implemented equilibrium and titration topics honestly.
- Modify `src/styles.css`: build the responsive instrument visual system.
- Modify `package.json`: add `verify:equilibrium`.
- Modify `README.md`: document the engine scope, interaction, verification, and exclusions.

---

### Task 1: Pure Equilibrium Engine

**Files:**
- Create: `src/chemistry/equilibrium.js`
- Create: `scripts/verify-equilibrium.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `solveWeakAcid(concentrationM, pKa): WeakAcidResult`
- Produces: `titrationPoint(params, baseAddedMl): TitrationPoint`
- Produces: `titrationCurve(params, sampleCount = 121): TitrationPoint[]`
- Produces: `equivalenceVolumeMl(params): number`
- `params`: `{ acidM, acidVolumeMl, baseM, pKa, temperatureC: 25 }`

- [ ] **Step 1: Verify reference states before UI work**

Create checks for a 0.100 M acid, 25.0 mL, pKa 4.76, titrated with 0.100 M base:

```js
assert.ok(Math.abs(titrationPoint(params, 12.5).pH - 4.76) < 1e-10);
assert.equal(titrationPoint(params, 12.5).regime, 'half-equivalence');
assert.equal(titrationPoint(params, 25).regime, 'equivalence');
assert.ok(titrationPoint(params, 25).pH > 7);
assert.equal(titrationPoint(params, 30).regime, 'excess-base');
```

- [ ] **Step 2: Implement exact weak-acid dissociation**

Use the positive quadratic root for `Ka = x² / (C - x)`, return pH, `[H+]`, `[HA]`, `[A-]`, dissociation fraction, equation label, and assumptions.

- [ ] **Step 3: Implement titration regimes**

Use exact weak-acid dissociation initially, Henderson-Hasselbalch before equivalence, conjugate-base hydrolysis at equivalence, and excess strong-base concentration after equivalence. Return stoichiometric moles, species fractions, regime, explanation, equation, and limitations for every point.

- [ ] **Step 4: Generate the curve with semantic points**

Sample from 0 to 1.8 equivalence volumes and always include 0, 0.5, 1.0, and the learner-selected volume. Sort and deduplicate by volume.

- [ ] **Step 5: Run numerical verification**

Run `npm run verify:equilibrium`. Expected output names every reference region, confirms monotonic pH, bounds every species fraction to 0–1, and exits with code 0.

### Task 2: Model Passport and Sources

**Files:**
- Create: `src/data/scienceSources.js`

**Interfaces:**
- Produces: `SCIENCE_SOURCES`
- Produces: `MODEL_PASSPORTS.weakAcidTitration`

- [ ] **Step 1: Encode result provenance**

The passport must identify the output as computed, temperature as fixed at 25 °C, pKa as learner input, solvent as ideal dilute water, and included/excluded effects.

- [ ] **Step 2: Link terminology without claiming measured data provenance**

Link IUPAC terminology/standards as reference material and clearly state that no remote measured-data record is used for the pH calculation.

### Task 3: Interactive Titration Bench

**Files:**
- Create: `src/components/SolutionLab.jsx`
- Modify: `src/App.jsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `titrationPoint`, `titrationCurve`, `equivalenceVolumeMl`
- Produces DOM section: `#solutionLab`

- [ ] **Step 1: Build controlled experiment inputs**

Provide labelled controls for pKa, acid concentration, acid volume, base concentration, and added base volume. Include presets for illustrative acetic-like, formic-like, and weak-fluoro-acid-like pKa values, labelled approximate.

- [ ] **Step 2: Render one synchronized scientific scene**

Changing added volume must simultaneously update the burette/meniscus, solution color, pH, regime, HA/A⁻ fractions, current equation, and marker on the titration curve.

- [ ] **Step 3: Make the curve teach the regions**

Render SVG region bands, the curve, half-equivalence and equivalence guides, current-point marker, axes, and accessible summary text.

- [ ] **Step 4: Add learner and teacher interpretation**

The learner panel explains the current region in plain language. The teacher panel names the approximation, asks one diagnostic question, and displays the model passport and exclusions.

- [ ] **Step 5: Preserve responsive and reduced-motion behavior**

At narrow widths, place controls, current result, curve, and passport in that order. Disable decorative transitions when reduced motion is requested.

### Task 4: Curriculum and Open-Source Integration

**Files:**
- Modify: `src/components/Header.jsx`
- Modify: `src/data/curriculum.js`
- Modify: `README.md`

**Interfaces:**
- New navigation destination: `#solutionLab`
- New live-lab links in General, Physical, and Analytical chemistry.

- [ ] **Step 1: Add navigation**

Expose Solutions between Experiment and React in desktop and mobile course navigation.

- [ ] **Step 2: Correct curriculum availability**

Mark ideal monoprotic acid-base equilibrium and titration curves as interactive now while retaining gases, multiphase equilibrium, activity corrections, spectroscopy, and instrument simulation as unavailable.

- [ ] **Step 3: Document scientific limits and extension seams**

Describe the pure engine, fixed conditions, verification command, and how contributors can add activity models or polyprotic systems without weakening existing scope labels.

### Task 5: Browser Learning Audit

**Files:**
- No source changes unless the audit finds a defect.

**Interfaces:**
- Student journey: load 0.100 M / 25.0 mL / pKa 4.76 / 0.100 M, move to 0, 12.5, 25.0, and 30.0 mL.
- Teacher journey: identify the equation and assumptions at every region and verify the curriculum labels.

- [ ] **Step 1: Run the student journey**

Verify pH increases, half-equivalence reports pH = pKa, equivalence is basic, excess base uses leftover OH⁻, and the particle/curve visuals follow the same state.

- [ ] **Step 2: Run the teacher journey**

Verify the model passport says computed—not measured—and lists ideality, 25 °C, monoprotic chemistry, and excluded effects.

- [ ] **Step 3: Inspect desktop and narrow layouts**

Verify all controls are visible, curve labels remain readable, the section dock links to Solutions, and no horizontal overflow appears.

- [ ] **Step 4: Run the production build**

Run `npm run build`. Expected result: Vite exits 0 with no unresolved imports.
