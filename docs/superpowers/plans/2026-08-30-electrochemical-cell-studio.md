# Electrochemical Cell Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a graphical, manually operated Electrochemical Cell Studio that teaches simple aqueous metal half-cells, cell direction, the Nernst equation, thermodynamic links, salt-bridge roles, and ideal Faraday electrolysis without claiming battery performance or electrode kinetics.

**Architecture:** Keep six declared metal/metal-ion teaching couples and deposition metadata in one immutable data module. A pure electrochemistry engine balances electron counts, evaluates oriented and spontaneous cells, calculates activity-based equilibrium potentials and thermodynamic links, checks learner predictions, and calculates ideal electrolysis yield. A lazy React module renders the same engine as a split-glass redox switchboard plus a powered plating rail.

**Tech Stack:** React 19, Vite, plain JavaScript modules, CSS/SVG, Node assertion verifier.

## Global Constraints

- A learner must commit an anode, electron direction, and salt-bridge directions before the app reveals the model result.
- Wrong but syntactically valid predictions remain visible and receive separate reasons; the app never silently flips them.
- Use activities as explicit dimensionless learner inputs. Do not relabel concentration as activity or infer activity coefficients.
- Report calculated cell potential as an equilibrium/open-circuit teaching result. Do not infer current, power, capacity, internal resistance, rate, or loaded voltage.
- The declared standard-potential records are approximate 298.15 K classroom values versus the standard hydrogen electrode, sourced to the IUPAC-prepared compilation and labelled as reference data rather than universal real-cell voltages.
- The simple cell library is limited to metal-ion + electrons ⇌ metal half-reactions so salt-bridge direction and reaction quotient remain inspectable.
- Electrolysis uses `m = M I t ε/(zF)` with learner-visible current efficiency. It does not choose products, model competing reactions, or provide operational laboratory instructions.
- Exclude overpotential, Butler-Volmer/Tafel kinetics, double layers, mass transport, liquid-junction potential, corrosion rate, passivation, pH/speciation, complexation, precipitation, gas evolution, batteries, fuel cells, concentrated electrolytes, safety engineering, and scale-up.
- Preserve existing modules and the generic lazy-anchor alignment behavior.
- Perform no Git actions.

---

## Visual Direction

The memorable object is a redox switchboard, not a dashboard. Two translucent half-cell vessels sit on a dark instrument panel. Their electrodes connect through a copper circuit trace that passes through a large analog voltmeter. A U-shaped salt bridge crosses the vessels with separate cation and anion lanes. Before checking, the circuit contains question marks and no direction arrows. After checking, qualitative electron and ion pulses move only in the evaluated directions while a ledger names oxidation, reduction, and the balanced reaction.

The electrolysis area changes visual grammar: an external power supply replaces the voltmeter, a plated cathode grows a visible metallic edge, and charge travels through a four-step rail—current × time, moles of electrons, moles of deposited metal, mass. Motion is restrained to the two scientifically useful moments: electron/ion direction after a check and deposit growth after a mass prediction.

Palette: circuit navy `#152238`, oxidized copper `#D67B45`, electrolyte cyan `#54CBE8`, electron lemon `#F6E37A`, cation cobalt `#7AA7FF`, anion magenta `#E87DA3`, ceramic paper `#F2F1EA`. Reuse the product’s display/body/utility typography, but make the circuit traces and instrument labels the structural motif.

```text
04 / ELECTROCHEMICAL CELL STUDIO
┌─────────────────────────────────────────────────────────────────────┐
│ Pick left half-cell      predict the circuit       pick right       │
│ [Zn²⁺/Zn]             [left anode? right?]       [Cu²⁺/Cu]          │
│                                                                     │
│       copper wire ─────── analog voltmeter ─────── copper wire      │
│        ┌ electrode ┐       ? / voltage        ┌ electrode ┐         │
│        │ electrolyte│======= salt bridge =====│ electrolyte│        │
│        └────────────┘   cation ? · anion ?    └────────────┘        │
│                                                                     │
│ [Commit directions] → balanced reaction · E° · E · ΔG · log K      │
├─────────────────────────────────────────────────────────────────────┤
│ NERNST FIELD: activities + T → E versus log Q curve                 │
├─────────────────────────────────────────────────────────────────────┤
│ POWERED PLATING RAIL: metal · current · time · efficiency · guess   │
│ charge → mol e− → mol metal → mass        [growing cathode edge]    │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Task 1: Declared Half-Cell Data and Pure Cell Engine

**Files:**
- Create: `src/data/electrochemicalCouples.js`
- Create: `src/chemistry/electrochemistry.js`
- Create: `scripts/verify-electrochemistry.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `ELECTROCHEMICAL_COUPLES`, `ELECTROCHEMISTRY_CONSTANTS`, `electrochemicalCoupleById(id)`.
- Produces: `analyzeElectrochemicalCell({leftCoupleId,rightCoupleId,leftActivity,rightActivity,temperatureK,orientation})`.
- Produces: `evaluateCircuitPrediction({analysis,predictedAnodeSide,predictedElectronDirection,predictedCationDestination,predictedAnionDestination})`.
- Produces: `createCellPotentialTrace({leftCoupleId,rightCoupleId,temperatureK,orientation,pointCount})`.

- [ ] **Step 1: Declare six bounded aqueous metal couples**

Create immutable Ag+/Ag, Cu2+/Cu, Ni2+/Ni, Fe2+/Fe, Zn2+/Zn, and Mg2+/Mg records. Each record must contain a stable id, element and ion labels, charge/electron number, reduction half-reaction, approximate standard electrode potential at 298.15 K versus SHE, molar mass, electrode/electrolyte colours, source id, and a warning that a thermodynamic standard potential is not a deposition or corrosion prediction.

- [ ] **Step 2: Write the failing cell-engine assertions**

The verifier must assert:

```js
assert.equal(ELECTROCHEMICAL_COUPLES.length, 6);
close(analyzeElectrochemicalCell({
  leftCoupleId:'zn', rightCoupleId:'cu', leftActivity:1,
  rightActivity:1, temperatureK:298.15, orientation:'left-oxidizes',
}).cellPotentialV, 1.1026, 1e-10);
```

It must also cover electron LCM balancing for Zn/Ag (`n = 2`), `Q = aZn2+/aAg+^2`, the Zn/Cu nonstandard reference `aZn2+ = 10`, `aCu2+ = 0.1` giving approximately `1.04344 V`, reversed orientation giving negative potential, `ΔrG = -nFE`, `log10 K = nFE°/(2.303RT)`, dynamic spontaneous-side classification, separate prediction reasons, same-couple rejection, invalid activity/temperature rejection, and monotonic potential versus `log10 Q`.

- [ ] **Step 3: Run the verifier to prove it fails before implementation**

Run: `npm run verify:electrochemistry`

Expected: module-not-found or missing-export failure for `src/chemistry/electrochemistry.js`.

- [ ] **Step 4: Implement electron balancing and equilibrium thermodynamics**

Use:

```js
Ehalf = E0 + (R * T / (z * F)) * Math.log(aOx)
Ecell = Ecathode - Eanode
deltaGJmol = -n * F * Ecell
log10KStandard = n * F * E0cell / (2.303 * R * T)
```

Balance each net reaction with the least common multiple of the two electron numbers. Return immutable left/right electrode roles, balanced oxidation/reduction equations, overall equation, electron count, reaction-quotient expression and value, standard and nonstandard potentials, ΔrG, log10 K°, cell notation, qualitative electron direction, and salt-bridge cation/anion destinations. Keep the selected orientation separate from the spontaneous orientation.

- [ ] **Step 5: Implement non-mutating prediction evaluation and the Nernst trace**

Return one result per prediction dimension with `correct`, `learner`, `expected`, and a chemical reason. The expected anode is the oxidation side; electrons leave the anode; salt-bridge anions migrate to the simple metal-dissolution compartment and cations migrate to the metal-ion-consumption compartment. Generate potential points over `log10 Q = -8…8` without changing half-cell inputs.

- [ ] **Step 6: Run the cell-engine verifier**

Run: `npm run verify:electrochemistry`

Expected: exit 0 with the Daniell reference, Ag/Zn electron balance, Nernst shift, thermodynamic links, predictions, and immutable rejection reported.

---

### Task 2: Ideal Electrolysis and Mass-Prediction Engine

**Files:**
- Modify: `src/chemistry/electrochemistry.js`
- Modify: `scripts/verify-electrochemistry.mjs`

**Interfaces:**
- Produces: `analyzeElectrolysis({coupleId,currentA,timeSeconds,currentEfficiency})`.
- Produces: `evaluateElectrolysisPrediction({analysis,predictedMassG,toleranceFraction})`.
- Produces: `createDepositionTrace({coupleId,currentA,timeSeconds,currentEfficiency,pointCount})`.

- [ ] **Step 1: Add failing Faraday-law assertions**

Cover Cu at `2.00 A` for `1800 s`: charge `3600 C`, electron amount `3600/F`, deposited amount `3600/(2F)`, and ideal mass approximately `1.1854 g`. At 80% current efficiency, expected mass must be exactly 80% of the ideal value. Assert zero/negative inputs are rejected, traces start at zero and end at the calculated mass, and evaluating a wrong learner mass preserves the entered value.

- [ ] **Step 2: Implement the charge-to-mass ledger**

Use:

```js
chargeC = currentA * timeSeconds
electronAmountMol = chargeC / FARADAY_CONSTANT
idealDepositAmountMol = electronAmountMol / electronNumber
idealMassG = idealDepositAmountMol * molarMassGmol
expectedMassG = idealMassG * currentEfficiency
```

Return every intermediate quantity and state plainly that the result assumes the selected deposition is the declared partial reaction and that current efficiency is a learner input, not a prediction.

- [ ] **Step 3: Implement mass-prediction feedback and deposition trace**

Classify a prediction as within tolerance, low, or high; never replace the learner’s value. Generate immutable linear points from zero time to the selected duration because this bounded engine assumes constant current and constant efficiency.

- [ ] **Step 4: Re-run the verifier**

Run: `npm run verify:electrochemistry`

Expected: exit 0 with both cell and electrolysis reference output.

---

### Task 3: Graphical Redox Switchboard and Plating Rail

**Files:**
- Create: `src/components/ElectrochemistryLab.jsx`
- Create: `src/styles/electrochemistry.css`
- Modify: `src/App.jsx`
- Modify: `src/components/Header.jsx`

**Interfaces:**
- Consumes all Task 1 and Task 2 engine exports and `MODEL_PASSPORTS.electrochemicalCell`.
- Produces lazy section `#electrochemistryLab`.

- [ ] **Step 1: Build the half-cell selectors and prediction dock**

Render left and right couple decks, independent dimensionless activity inputs, and temperature. Require four explicit learner choices: anode side, electron direction, salt-bridge cation destination, and salt-bridge anion destination. Disable only an identical-couple pair with a visible reason; do not infer or auto-select correct choices.

- [ ] **Step 2: Build the split-glass cell theatre**

Use SVG/CSS for two electrolyte vessels, metal electrodes, an external copper wire, analog voltage needle, U salt bridge, ions, and phase labels. Before check, hide direction and voltage. After check, show the selected predictions and overlay the model result without erasing wrong arrows. Label the meter “equilibrium / open-circuit model” and all ion movement “qualitative direction only.”

- [ ] **Step 3: Add the balanced reaction and thermodynamic ledger**

Show oxidation at the anode, reduction at the cathode, electron LCM, overall reaction, cell notation, E°cell, activity quotient Q, Nernst correction, Ecell, ΔrG, and log10 K°. Use distinct panels for the learner-selected orientation and the spontaneous orientation so a negative selected E is educational rather than automatically reversed.

- [ ] **Step 4: Add the Nernst field**

Render an SVG potential-versus-log10-Q curve, current Q marker, zero-potential line, and standard-state marker. Activity controls must update the current marker before the learner checks direction, while the numerical result remains concealed until check.

- [ ] **Step 5: Build the powered plating rail**

Add deposition-metal selection, current, duration, current efficiency, learner mass prediction, and explicit check. Render a power supply, cathode edge growth, progress rail, mass comparison, and complete charge ledger. Never infer products or offer laboratory setup steps.

- [ ] **Step 6: Add trace, teacher lens, model passport, sources, and responsive behavior**

Record selections, predictions, blocked attempts, checks, activity changes, and mass attempts. Teacher prompts must contrast potential with current, thermodynamics with kinetics, and theoretical with efficiency-adjusted yield. Ensure 44 px primary touch targets, visible focus, reduced-motion handling, no page overflow at 390 px, and internal scrolling only for the cell diagram if necessary.

- [ ] **Step 7: Lazy-integrate the module**

Insert Electrochemical Cell Studio after Energy and before Gas. Add desktop/mobile navigation and preserve lazy hash alignment.

---

### Task 4: Curriculum, Sources, Numbering, and Open-Source Documentation

**Files:**
- Modify: `src/data/scienceSources.js`
- Modify: `src/data/curriculum.js`
- Modify: downstream numbered component labels under `src/components/`
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`

**Interfaces:**
- Produces `SCIENCE_SOURCES` records for IUPAC electrochemical terminology, the IUPAC-prepared standard-potential compilation, and NIST 2022 CODATA Faraday constant.
- Produces `MODEL_PASSPORTS.electrochemicalCell`.

- [ ] **Step 1: Add official sources and model passport**

Register IUPAC electrochemical cell, galvanic cell, electrolytic cell, anode, cathode, Nernst equation, standard electrode potential, standard electromotive force, salt bridge, electron number, Faraday laws, current efficiency, and standard hydrogen electrode definitions; the IUPAC-prepared *Standard Potentials in Aqueous Solution* compilation; and NIST 2022 CODATA constants. The passport must expose standard-state/data provenance and every excluded real-cell effect.

- [ ] **Step 2: Expand the curriculum atlas across disciplines**

Add live redox/electrochemical-cell foundations to General Chemistry; Nernst, ΔG/K, and open-circuit potential to Physical Chemistry; potentiometric/electroanalytical foundations as a bounded live topic under Analytical Chemistry; metal-ion redox comparison under Inorganic Chemistry; and electrochemical materials/battery boundaries under Materials Chemistry. Do not mark batteries, corrosion kinetics, or real electrodes as live.

- [ ] **Step 3: Renumber ordered labs**

Use: Electrochemical `04`, Gas `05`, Spectroscopy `06`, Biomolecular `07`, Enzyme `08`, Mechanism `09`, Coordination `10`, Crystal `11`, Reaction `12`, Equation `13`.

- [ ] **Step 4: Document architecture and review journeys**

Add the new component, data, engine, stylesheet, verifier, run command, deterministic reference cases, learner journey, and scientific exclusions to README and CONTRIBUTING.

---

### Task 5: Deterministic, Build, Learner, Teacher, and Responsive Audit

**Files:**
- Modify only files implicated by observed failures.

- [ ] **Step 1: Run all eleven deterministic chemistry verifiers**

Run the existing ten verifier commands plus `npm run verify:electrochemistry`. Every command must exit 0.

- [ ] **Step 2: Run the production build**

Run `npm run build`. Confirm Electrochemistry Lab emits as a lazy JS/CSS chunk and the build exits 0.

- [ ] **Step 3: Audit the cell as a learner**

At desktop and true mobile widths:

- build Zn/Cu at unit activities and intentionally predict the wrong anode;
- verify the wrong choice remains and receives a reason;
- correct all four directions and reveal `E° ≈ 1.1026 V`;
- change activities to `aZn2+ = 10`, `aCu2+ = 0.1` and verify the Nernst shift;
- reverse the selected orientation and verify negative potential is shown rather than auto-corrected;
- build Zn/Ag and inspect the two-electron balance;
- enter a wrong Cu plating mass, preserve it, then compare with the calculated result;
- change current efficiency and verify only the efficiency-adjusted mass changes.

- [ ] **Step 4: Audit as a teacher**

Confirm the UI makes these distinctions visible without source code: anode means oxidation, cathode means reduction; potential is not current; open-circuit equilibrium is not loaded performance; activity is not automatically concentration; salt bridge completes ionic conduction without erasing liquid-junction limitations; Faraday yield is ideal and efficiency-adjusted; thermodynamics does not determine kinetics or product selectivity.

- [ ] **Step 5: Audit responsiveness and fresh runtime state**

Check 1280 px, 742 px, and 390 px. Confirm no page-level horizontal overflow, clipped meter/controls, touch targets below 44 px, broken anchor alignment, console errors, warnings, or failed lazy resources. Reset temporary viewport overrides and leave `#electrochemistryLab` visible in the in-app browser.

## Completion Evidence

This module is complete only when all eleven deterministic chemistry verifiers and the production build pass, the reference learner journeys are observed at desktop and mobile widths, the teacher boundaries are visible, and a fresh runtime navigation produces no errors or warnings. Passing these checks establishes consistency with the declared equilibrium and ideal-electrolysis models; it does not certify a real cell, battery, plating process, corrosion system, or experimental procedure.
