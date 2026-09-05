# Gas & Phase Laboratory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a graphical General/Physical Chemistry laboratory where learners predict and run controlled ideal-gas changes, interrogate why a van der Waals teaching model departs from ideality, and test pure-water liquid-vapour tendencies against a declared saturation-pressure correlation.

**Architecture:** Immutable gas and water reference records feed a pure ES-module engine for ideal-gas states, controlled gas-law transformations, critical-derived van der Waals parameters, pressure-component ledgers, isotherm traces, Antoine saturation pressure, and prediction evaluation. A lazy-loaded React module owns learner predictions and experiment traces while rendering a cutaway piston chamber, pressure contributions, ideal/real isotherms, and a liquid-vapour vessel. A model passport keeps algebraic teaching models, NIST-sourced constants, and thermodynamic terminology separate from a real-fluid property package or universal phase-equilibrium solver.

**Tech Stack:** React 19, native SVG, CSS, pure ES modules, Node deterministic verifier, Vite 8.

## Global Constraints

- Use no new dependency, remote runtime call, paid service, or generative model.
- Keep every calculation local and deterministic.
- Use `R = 0.0831446261815324 L bar mol-1 K-1` for displayed litre-bar gas equations.
- Use only declared NIST critical constants for nitrogen, carbon dioxide, and ammonia; derive van der Waals `a` and `b` from `Tc` and `Pc` instead of presenting fitted high-accuracy property data.
- Use the NIST water Antoine record `A = 4.6543`, `B = 1435.264`, `C = -64.848`, valid from 255.9 through 373 K, while constraining the learner interface to 273.15 through 373 K.
- A van der Waals result is a classroom cubic equation, not a reference equation of state. States with `V <= nb`, nonpositive raw pressure, or subcritical loops must be explained without automatic input repair.
- A liquid-vapour prediction is qualitative. Do not calculate phase fraction, nucleation rate, bubble dynamics, mixture VLE, fugacity, activity, or metastable lifetime.
- Learner predictions, wrong states, and invalid states remain visible until the learner changes them.
- Keep desktop, 742 px tablet, and 390 px phone layouts usable with visible keyboard focus, text equivalents, polite live feedback, and reduced-motion support.
- Do not run Git commands or create commits in this execution.

---

## Visual direction

- Chamber midnight `#071A2F`: piston cutaway, isotherm field, and instrument backdrop.
- Pressure cyan `#62E8F5`: ideal pressure, load arrows, and measured-state marker.
- Thermal orange `#FF8A5B`: particle trails and temperature control.
- Attraction violet `#A78BFA`: van der Waals attraction correction and pair halos.
- Condensation mint `#69E7C0`: liquid-vapour balance and saturation curve.
- Gauge brass `#FFD166`: piston hardware, prediction lock, and successful checks.
- Laboratory paper `#F3F7F8`: restrained controls, ledger, and evidence surfaces.
- Retain the product's condensed display face, humanist body face, and monospaced data role.

Signature interaction: one cutaway piston links the macroscopic and particulate views. The learner's volume sets piston height, amount sets a deterministic dot count, temperature sets trail length, and the ideal/real pressure difference appears as two opposing gauge needles. This is a symbolic teaching animation, not molecular dynamics.

```text
┌ controlled law ┐ ┌──────── cutaway piston chamber ────────┐ ┌ state ledger ┐
│ Boyle          │ │ load arrows / particles / piston head  │ │ p ideal      │
│ Charles        │ │ volume + temperature + amount          │ │ p vdW / Z    │
│ Avogadro       │ │ ideal and real pressure needles        │ │ a and b terms│
└────────────────┘ └─────────────────────────────────────────┘ └──────────────┘
┌ prediction + run ┐ ┌──── ideal/real isotherm + explanation ─────────────────┐
└──────────────────┘ └─────────────────────────────────────────────────────────┘
┌ water vessel + phase prediction ┐ ┌ saturation-pressure curve + passport ┐
└──────────────────────────────────┘ └───────────────────────────────────────┘
```

Self-critique: a dark scientific theatre already exists elsewhere in the product, so this module earns the device through a mechanical cutaway rather than atmospheric decoration. Motion is concentrated in piston travel and thermal trails; charts, controls, and copy remain quiet. The learner sees which variable is held fixed before seeing an equation.

---

### Task 1: Immutable references and pure gas/phase engine

**Files:**
- Create: `src/data/gasPhaseScenarios.js`
- Create: `src/chemistry/gasPhases.js`
- Create: `scripts/verify-gas-phases.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `GAS_PRESETS`, `GAS_LAW_EXPERIMENTS`, `WATER_PHASE_MODEL`, and deterministic particle coordinates.
- Produces: `idealGasPressureBar(input)`, `deriveVanDerWaalsParameters(input)`, `analyzeGasState(input)`, `createIsothermTrace(input)`, `runGasLawExperiment(input)`, `evaluateGasLawPrediction(input)`, `waterSaturationPressureBar(input)`, `waterBoilingTemperatureK(input)`, `analyzeWaterPhase(input)`, and `evaluatePhasePrediction(input)`.
- Invalid model states return structured reasons and the original learner inputs; they never clamp or mutate values.

- [ ] **Step 1: Encode source-backed gas presets**

Declare:

```js
nitrogen:      Tc = 126.19 K, Pc = 33.978 bar
carbonDioxide: Tc = 304.18 K, Pc = 73.80 bar
ammonia:       Tc = 405.4 K,  Pc = 113.00 bar
```

Each preset includes formula, name, critical-source identifier, colour, particle glyph, and a boundary statement. Add an ideal-reference preset with no critical constants. Store the water Antoine coefficients and validity range separately.

- [ ] **Step 2: Implement ideal and critical-derived van der Waals calculations**

Use:

```js
pIdeal = nRT / V
a = 27 * R^2 * Tc^2 / (64 * Pc)
b = R * Tc / (8 * Pc)
pExcluded = nRT / (V - nb)
pAttraction = a * (n / V)^2
pVdw = pExcluded - pAttraction
Z = pVdw * V / (nRT)
```

Reject only the van der Waals branch when `V <= nb`; keep the ideal result available. Return separate excluded-volume and attraction terms so the UI can explain the sign of each contribution. Label `Z < 0.98`, `0.98 <= Z <= 1.02`, and `Z > 1.02` as attraction-dominant, near-ideal, and repulsion/excluded-volume-dominant teaching regions.

- [ ] **Step 3: Implement three controlled ideal-gas experiments**

Use a shared baseline of `n = 1 mol`, `T = 298.15 K`, `p = 1 bar`, and `V = nRT/p`.

```js
Boyle:    learner changes V; hold T,n; calculate p; invariant pV
Charles:  learner changes T; hold p,n; calculate V; invariant V/T
Avogadro: learner changes n; hold p,T; calculate V; invariant V/n
```

Each experiment returns baseline, target, held variables, changed variable, observed variable, expected direction, invariant before/after, and a plain-language causal explanation. `evaluateGasLawPrediction` accepts `decrease`, `same`, or `increase`; wrong predictions remain intact and receive a reason.

- [ ] **Step 4: Implement bounded isotherm traces**

Generate ideal and raw van der Waals points over molar volume. Preserve gaps where `Vm <= b` or raw pressure is nonpositive. Mark `T/Tc`, subcritical status, and whether the sampled raw cubic changes slope. State explicitly that a subcritical loop is not a liquid-vapour coexistence curve and that no Maxwell construction is performed.

- [ ] **Step 5: Implement the pure-water saturation experiment**

Use the NIST correlation:

```js
log10(pSat / bar) = A - B / (T + C)
Tboil = B / (A - log10(pExternal / bar)) - C
```

At a selected temperature, compare external pressure with saturation pressure using a two-percent display tolerance:

- `pExternal < 0.98 pSat`: net evaporation/boiling tendency.
- `0.98 pSat <= pExternal <= 1.02 pSat`: liquid-vapour equilibrium band.
- `pExternal > 1.02 pSat`: net condensation/no-boiling tendency.

The wording must refer to a pure-water liquid-vapour system and not claim a rate or final phase fraction. `evaluatePhasePrediction` preserves wrong choices and reports the pressure comparison.

- [ ] **Step 6: Add deterministic verification**

Add `verify:gas-phases` to `package.json`. Verify:

- One mole at 298.15 K and `V = RT` gives exactly 1 bar in the ideal model.
- Halving volume at fixed `T,n` doubles pressure and preserves `pV`.
- Doubling temperature at fixed `p,n` doubles volume and preserves `V/T`.
- Doubling amount at fixed `p,T` doubles volume and preserves `V/n`.
- Every critical-derived van der Waals model returns its source `Pc` at `T = Tc`, `Vm = 3b`.
- Ideal `Z = 1`; real pressure decomposition closes exactly.
- `V <= nb` is rejected without changing the input object.
- A wrong direction prediction is preserved and explained.
- Water gives approximately `0.032 bar` at 298.15 K and approximately `1 bar` near 373 K.
- Inverting the correlation's own 373 K saturation pressure returns 373 K; exactly 1 bar reports that its implied temperature lies just outside the declared correlation range instead of silently extrapolating.
- Low/equal/high external-pressure phase classifications and wrong-prediction preservation are correct.
- Out-of-range Antoine temperatures are rejected with the declared range.

Run:

```bash
npm run verify:gas-phases
```

Expected: gas-law invariants, critical-derived cubic parameters, invalid-volume preservation, water saturation pressure, boiling inversion, and prediction feedback pass with exit code 0.

---

### Task 2: Graphical piston, model comparison, and phase challenge

**Files:**
- Create: `src/components/GasPhaseLab.jsx`
- Create: `src/styles/gas-phase.css`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes all Task 1 exports and `MODEL_PASSPORTS.gasPhase`.
- Produces lazy section anchor `#gasPhaseLab` between Energy and Spectroscopy.
- Maintains law choice, target, learner prediction, checked result, hints, gas preset, free-state `n/T/V`, phase `T/p`, phase prediction, and attempt trace.

- [ ] **Step 1: Build the controlled-law prediction deck**

Render Boyle, Charles, and Avogadro experiment cards that state the held variables. A law-specific target control changes only the learner's intended final state. Require a `decrease / same / increase` prediction before `Run experiment`. A wrong result preserves the selected prediction and target. Provide three non-mutating hints: name the invariant, identify numerator/denominator direction, then show the symbolic ratio without inserting the answer.

- [ ] **Step 2: Build the cutaway piston theatre**

Render native SVG with a piston head, calibrated chamber, deterministic particles, thermal trails, collision ticks, ideal and van der Waals pressure needles, load arrows, and readable `V`, `T`, `n`, and `p` labels. Volume controls piston height, amount controls displayed representative particle count, and temperature controls trail length. The accessible name says these are representative particles rather than a molecular-dynamics simulation.

- [ ] **Step 3: Build free-state and gas-model controls**

Provide ideal reference, nitrogen, carbon dioxide, and ammonia choices plus independent `n`, `T`, and `V` controls. Never repair `V <= nb`. Instead, retain the state, block only the van der Waals result, draw the excluded-volume barrier, and explain why the cubic denominator is nonpositive.

- [ ] **Step 4: Build the pressure ledger and isotherm chart**

Show ideal pressure, excluded-volume pressure, attraction subtraction, raw van der Waals pressure, `Z`, `T/Tc`, and source critical constants. Render ideal and raw van der Waals isotherms with the current state marker. If the raw cubic is subcritical or nonphysical, show the exact model warning in the chart instead of smoothing or hiding it.

- [ ] **Step 5: Build the water liquid-vapour challenge**

Render a cutaway water vessel linked to temperature and external-pressure controls, a saturation-pressure curve, current point, external-pressure line, and predicted tendency buttons. `Check phase tendency` preserves wrong answers. An explicit `Set pressure to pSat` action may load equilibrium only when the learner requests it and records a reveal in the trace.

- [ ] **Step 6: Build learning trace, teacher lens, and passport**

Record law selections, target changes, predictions, checks, hints, gas-state changes, invalid cubic states, phase predictions, and explicit equilibrium reveal. Teacher prompts compare intensive/extensive variables, ask why `Z` can lie above or below one, and distinguish saturation pressure from a boiling rate. The passport renders included/excluded claims, equations, data provenance, and source links.

- [ ] **Step 7: Add responsive and accessibility behavior**

All law, gas, prediction, and reveal controls need visible keyboard focus. SVGs require full text alternatives. Feedback uses `aria-live="polite"`. At 742 px and 390 px require `scrollWidth === clientWidth`; controls must remain at least 40 px high and no meaning may depend only on motion, colour, or hover.

---

### Task 3: Navigation, curriculum, scientific provenance, and open-source contract

**Files:**
- Modify: `src/components/Header.jsx`
- Modify: `src/components/SpectroscopyLab.jsx`
- Modify: `src/components/EnzymeKineticsLab.jsx`
- Modify: `src/components/MechanismLab.jsx`
- Modify: `src/components/CoordinationFieldLab.jsx`
- Modify: `src/components/CrystalLatticeLab.jsx`
- Modify: `src/components/ReactionLab.jsx`
- Modify: `src/components/EquationSections.jsx`
- Modify: `src/data/curriculum.js`
- Modify: `src/data/scienceSources.js`
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`

**Interfaces:**
- Header exposes `Gas & phase` at `#gasPhaseLab` on desktop and mobile.
- General and Physical curricula list the live lab while keeping high-accuracy real-fluid and mixture phase equilibrium outside scope.
- `MODEL_PASSPORTS.gasPhase` is rendered by the component.

- [ ] **Step 1: Register primary references**

Add IUPAC records for ideal gas, compression factor, saturation vapour pressure, critical point, fugacity, and thermodynamic equilibrium. Add NIST records for water Antoine coefficients and nitrogen, carbon dioxide, and ammonia critical constants.

- [ ] **Step 2: Add the model passport**

Included: ideal gas equation, three controlled proportionality experiments, critical-derived van der Waals `a/b`, pressure-term decomposition, raw isotherm, compression factor, pure-water Antoine pressure, boiling-temperature inversion, and qualitative phase tendency.

Excluded: high-accuracy reference equations, mixtures, partial pressures beyond ideal notation, virial/fugacity calculations, activity coefficients, Maxwell construction, phase fractions, metastability/nucleation, caloric properties, transport, humidity, solid phases, reaction, and safety/engineering design.

- [ ] **Step 3: Update navigation and numbering**

Insert Gas & phase after Energy. Use section numbers: Spectroscopy 05, Enzyme 06, Mechanism 07, Coordination 08, Crystal 09, Reaction 10, Equation 11. Put Gas in the compact direct navigation and retain all displaced modules in `More labs`.

- [ ] **Step 4: Update curriculum truthfully**

Mark ideal gas laws, real-gas-deviation foundations, and pure-substance liquid-vapour equilibrium live in General and Physical Chemistry. Keep activities/fugacity calculations, mixture VLE, solid-liquid phase diagrams, high-accuracy property prediction, and phase kinetics outside scope.

- [ ] **Step 5: Update open-source documentation**

Document the feature, verifier command, source-backed constants, component/engine boundaries, learner journey, and contributor audit. State that the module is educational and is not suitable for vessel design, safety decisions, process simulation, or property certification.

---

### Task 4: Learner, teacher, responsive, and regression audit

**Files:**
- Verify only after Tasks 1 through 3 are complete.

- [ ] **Step 1: Run the learner gas-law journey**

Predict the wrong Boyle direction, run the experiment, confirm the answer and target remain, and read the invariant explanation. Correct it, then complete Charles and Avogadro cases. Confirm hints never move a control or choose a prediction.

- [ ] **Step 2: Run the real-gas journey**

Compare nitrogen at a dilute warm state, carbon dioxide near its critical region, and ammonia in an attraction-dominant state. Cross `V = nb`, confirm the exact learner volume remains and only the real branch is blocked, then recover manually. Inspect a subcritical raw loop warning.

- [ ] **Step 3: Run the phase journey**

At 298.15 K compare external pressures below, near, and above `pSat`; make one wrong prediction and confirm preservation. Set 1 bar and confirm the inversion reports that the implied boiling point lies just outside the selected correlation range. Use the explicit `Set pressure to pSat` action and confirm it is traceable rather than automatic.

- [ ] **Step 4: Run the teacher journey**

Confirm held variables, invariant ratios, `a/b` derivation, `Z` definition, raw-cubic warning, Antoine range, equilibrium wording, excluded claims, source links, and General/Physical curriculum boundaries are visible.

- [ ] **Step 5: Run responsive/browser audits**

At 1280x720, 742x964, and 390x844 inspect navigation, law deck, piston, controls, ledger, chart, water vessel, phase prediction, trace, and passport. Require no horizontal overflow, no browser error logs, focusable controls, complete text alternatives, and usable reduced-motion behavior.

- [ ] **Step 6: Run fresh deterministic and build verification**

Run in parallel:

```bash
npm run verify:gas-phases
npm run verify:coordination-field
npm run verify:crystal-lattice
npm run verify:electron-flow
npm run verify:enzyme-kinetics
npm run verify:spectrophotometry
npm run verify:thermokinetics
npm run verify:equilibrium
npm run build
```

Every command must exit 0 before this phase is reported complete.

## Self-review

- The plan covers the largest declared General/Physical curriculum gap with learner-controlled experiments rather than static formula cards.
- It gives the user a graphical mechanical interaction, preserves wrong and impossible states, and always supplies a reason.
- It distinguishes exact ideal-gas algebra, a low-accuracy cubic teaching model, and one empirical pure-water correlation.
- Critical constants and Antoine coefficients have explicit NIST provenance; IUPAC terminology has direct source links.
- No phase classification is presented as a rate, amount, real-fluid property certificate, or engineering design result.
- Interfaces and names are consistent across data, engine, verifier, component, navigation, curriculum, passport, documentation, and audit tasks.
- No placeholder or future engine is labelled live.
