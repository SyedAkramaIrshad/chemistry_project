# Thermochemical Cycle and Calorimetry Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This project forbids Git actions, so no commit steps are included.

**Goal:** Add a graphical thermochemistry studio where learners reverse and scale reaction equations to construct Hess cycles, explicitly balance ideal calorimetric heat between a reaction system and its surroundings, preserve wrong claims, and distinguish a state-function ledger from measured heat and from reaction feasibility.

**Architecture:** Eight frozen 298.15 K thermochemical species records, three Hess-cycle challenges, and three synthetic calorimetry challenges feed two pure immutable engines in one focused module. The Hess engine treats each equation as a stoichiometric species vector, applies learner-selected multipliers, sums cancellations and reaction enthalpy, and cross-checks the target against selected formation enthalpies. The calorimetry engine freezes learner-edited mass, specific heat capacity, temperature change, vessel heat capacity, and reaction extent only after an explicit run; a lazy-loaded React studio owns the magnetic reaction tiles, cancellation gantry, cutaway calorimeter, predictions, hints, history, teacher contrasts, and model passport.

**Tech Stack:** React 19, Vite 8, plain JavaScript modules, CSS/SVG, Node deterministic verifier.

## Global Constraints

- No runtime external calls, new dependencies, model calls, reaction-condition prediction, synthesis planning, hazardous procedure, measured calorimeter data, or automatic repair.
- Use exactly eight thermochemical species records, three Hess-cycle challenges, and three synthetic calorimetry challenges.
- Freeze selected 298.15 K formation-enthalpy values as cited records; elemental C(graphite), H2(g), and O2(g) use the zero convention only in their declared standard states.
- Use signed stoichiometric coefficients: reactants negative and products positive.
- A reversed equation multiplies every stoichiometric coefficient and `ΔrH°` by `-1`; scaling multiplies both by the same learner-selected scalar.
- The Hess sum is `ΔrH°sum = Σj mj ΔrH°j`; the formation cross-check is `ΔrH°target = Σi νi ΔfH°i`.
- Calorimetry uses `qsolution = msolution cp ΔT`, `qcal = Ccal ΔT`, `qsurroundings = qsolution + qcal`, `qsystem = -qsurroundings`, and `ΔHreaction = qsystem / ξ` only under the declared constant-pressure, adiabatic, single-effective-heat-capacity teaching assumptions.
- Never present Hess's law as proof that a reaction occurs, or a calorimetric sign as mechanism, identity, purity, safety, or transferable experimental evidence.
- Preserve every multiplier, numeric input, and learner prediction after checking whether right or wrong. Never choose coefficients, reverse equations, infer missing measurements, or correct signs automatically.
- Editing a multiplier or calorimetry input marks the previous audit stale. Only an explicit `Audit cycle` or `Balance heat ledger` action creates a new immutable snapshot.
- Minimum interactive target height is 44 px; support 1440 px, 768 px, and 390 px without document-level horizontal overflow; expose visible keyboard focus and respect reduced motion.

## Locked Visual Direction

- **Subject:** undergraduate reaction enthalpy, Hess-cycle algebra, and ideal constant-pressure calorimetry.
- **Audience:** general, physical, and analytical chemistry students plus instructors exposing sign and state-function misconceptions.
- **Single job:** transform a reaction path manually, freeze the heat ledger, and defend what the resulting enthalpy does and does not establish.
- **Palette:** foundry slate `#22313a`, oxidized copper `#b87333`, heat amber `#ffb347`, ice cyan `#68d5e8`, system magenta `#c64b73`, porcelain `#f4f0e6`, brass `#d4a83f`, ink `#1e3038`.
- **Type:** DIN Condensed/Avenir Next Condensed for foundry headings, Avenir/system for explanatory copy, and SFMono for equations and heat ledgers.
- **Signature:** a brass reaction switchyard carries reversible magnetic equation tiles through an illuminated species-cancellation gantry; the second mode reuses the same heat ribbon inside a cutaway copper Dewar with a system core and surroundings jacket.
- **Deliberate risk:** the main interface resembles a mechanical railway interlocking board rather than an educational dashboard. Every rail, switch, cancellation lamp, heat bead, and thermometer mark must encode an actual thermochemical state.

---

### Task 1: Frozen thermochemical records, challenges, sources, and passport

**Files:**
- Create: `src/data/thermochemistryScenarios.js`
- Modify: `src/data/scienceSources.js`
- Create: `scripts/verify-thermochemistry.mjs`

**Interfaces:**
- Produces `THERMOCHEMISTRY_SPECIES`, `THERMOCHEMISTRY_SPECIES_BY_ID`, `HESS_CHALLENGES`, `HESS_CHALLENGE_BY_ID`, `CALORIMETRY_CHALLENGES`, `CALORIMETRY_CHALLENGE_BY_ID`, `HESS_MULTIPLIERS`, and `THERMOCHEMISTRY_MODEL_BOUNDARY`.
- A species is `{ id, label, formula, phase, display, formationEnthalpyKJmol, uncertaintyKJmol, referenceKind, sourceId, sourceNote }`.
- A reaction is `{ id, label, stoichiometry, deltaHkJPerReaction, sourceKind }`.
- A Hess challenge is `{ id, code, name, summary, mission, target, cards, expectedMultipliers, teacherQuestion, misconception, provenance, sourceIds }`.
- A calorimetry challenge is `{ id, code, name, summary, mission, defaults, teacherQuestion, misconception, provenance, sourceIds }`.

- [ ] **Step 1: Create a failing data-contract verifier**

  Import every Task 1 export and assert exact counts and IDs. The first run must fail with `ERR_MODULE_NOT_FOUND` for `thermochemistryScenarios.js`.

- [ ] **Step 2: Add eight selected 298.15 K species records**

  | ID | State | `ΔfH° / kJ mol−1` | uncertainty | source |
  |---|---|---:|---:|---|
  | `carbon-graphite` | C(graphite, s) | 0 | 0 | standard-state zero convention |
  | `hydrogen-gas` | H2(g) | 0 | 0 | standard-state zero convention |
  | `oxygen-gas` | O2(g) | 0 | 0 | standard-state zero convention |
  | `carbon-monoxide-gas` | CO(g) | -110.53 | 0.17 | NIST CCCBDB CODATA 298.15 K |
  | `carbon-dioxide-gas` | CO2(g) | -393.51 | 0.13 | NIST CCCBDB CODATA 298.15 K |
  | `methane-gas` | CH4(g) | -74.87 | `null` | NIST WebBook selected Chase review value |
  | `water-liquid` | H2O(l) | -285.830 | 0.040 | NIST WebBook CODATA review |
  | `water-gas` | H2O(g) | -241.826 | 0.040 | NIST WebBook CODATA review |

  Do not round beyond the displayed source precision or merge liquid and gas water.

- [ ] **Step 3: Add three Hess-cycle challenges**

  Use signed species vectors and exact selected values:

  1. `carbon-monoxide-formation`: target `2C(graphite) + O2(g) -> 2CO(g)`, cards `C + O2 -> CO2` at `-393.51` and `2CO + O2 -> 2CO2` at `-565.96`; expected multipliers `[2, -1]`; target `-221.06 kJ` per displayed reaction.
  2. `methane-combustion-cycle`: target `CH4(g) + 2O2(g) -> CO2(g) + 2H2O(l)`, cards CH4 formation `-74.87`, CO2 formation `-393.51`, and H2O(l) formation `-285.830`; expected multipliers `[-1, 1, 2]`; formation-ledger target `-890.30 kJ` per displayed reaction. State that this selected-value sum is not a replacement for a direct combustion measurement.
  3. `water-phase-bridge`: target `H2O(l) -> H2O(g)`, cards gas formation `-241.826` and liquid formation `-285.830`; expected multipliers `[1, -1]`; target `+44.004 kJ` per displayed reaction.

  Use `HESS_MULTIPLIERS = [-2, -1, -0.5, 0, 0.5, 1, 2]`. Every card's default multiplier is zero so the learner must construct the path.

- [ ] **Step 4: Add three synthetic calorimetry challenges**

  Defaults are:

  | ID | m / g | cp / J g−1 K−1 | ΔT / K | Ccal / J K−1 | ξ / mol |
  |---|---:|---:|---:|---:|---:|
  | `thermal-rise` | 100 | 4.184 | +6.5 | 25 | 0.050 |
  | `thermal-fall` | 80 | 4.184 | -5.2 | 18 | 0.060 |
  | `vessel-matters` | 50 | 4.184 | +8.0 | 120 | 0.040 |

  Label every observation synthetic. Do not name a reagent, prescribe a quantity, or imply the defaults are a safe or validated physical experiment.

- [ ] **Step 5: Add authoritative source records**

  Add:

  ```js
  iupacCalorimetry: 'https://goldbook.iupac.org/terms/view/C00786'
  iupacHeatCapacity: 'https://goldbook.iupac.org/terms/view/H02753'
  iupacEnthalpy: 'https://goldbook.iupac.org/terms/view/E02141'
  iupacStandardReactionQuantities: 'https://goldbook.iupac.org/terms/view/S05923'
  nistCarbonMonoxideThermochemistry: 'https://cccbdb.nist.gov/exp2x.asp?casno=630080&charge=0'
  nistCarbonDioxideThermochemistry: 'https://cccbdb.nist.gov/exp2x.asp?casno=124389&charge=0'
  nistMethaneThermochemistry: 'https://webbook.nist.gov/cgi/cbook.cgi?ID=C74828&Mask=1&Units=SI'
  nistWaterThermochemistry: 'https://webbook.nist.gov/cgi/cbook.cgi?ID=C7732185&Mask=F&Units=SI'
  ```

  Reuse `iupacExtentOfReaction` and `acsUndergraduateCurriculum`. Source roles must separate terminology, selected data, and curriculum placement; they must not claim NIST validates the synthetic calorimetry challenges.

- [ ] **Step 6: Add `MODEL_PASSPORTS.thermochemicalCycleStudio`**

  Conditions must state selected 298.15 K records, standard-state elemental zero convention, frozen reaction vectors, explicit multipliers, synthetic calorimetry observations, constant-pressure/adiabatic/single-effective-heat-capacity assumptions, and local deterministic calculation. Includes must list reversal/scaling, species cancellation, Hess sum, formation cross-check, solution and vessel heat, system/surroundings sign, reaction-extent normalization, preserved predictions, hints, and history. Excludes must name reaction occurrence, equilibrium, kinetics, mechanism, nonstandard temperature correction, heat-capacity integration, phase coexistence, heat loss, work beyond the declared approximation, mixing/dilution chemistry, measured uncertainty propagation, calibration, apparatus, procedure, safety, and synthesis.

- [ ] **Step 7: Run the data-contract verifier**

  Expected: eight species, six challenges, ten primary/curriculum sources, passport, exact provenance, and deep immutability pass before engine imports are added.

---

### Task 2: Pure immutable Hess-cycle engine

**Files:**
- Create: `src/chemistry/thermochemistry.js`
- Modify: `scripts/verify-thermochemistry.mjs`

**Interfaces:**
- Produces `auditHessCycle({ challengeId, multipliers })`.
- Produces `evaluateHessAttempt({ audit, prediction })`.
- Produces `nextHessHint({ audit, prediction, level })`.
- `prediction` is `{ targetStatus, enthalpySign, scalingClaim, pathClaim }`.

- [ ] **Step 1: Add red validation and invariant checks**

  Reject unknown challenges, wrong multiplier counts, values outside `HESS_MULTIPLIERS`, nonfinite reaction values, malformed predictions, invalid hints, and attempted source mutation. Require recursive output immutability.

- [ ] **Step 2: Implement reaction-vector scaling and summation**

  For every card and species compute `contribution = multiplier * stoichiometricCoefficient`. Sum contributions by species, omit numerical noise below `1e-12`, and return both raw per-card contributions and the final signed net vector. A negative multiplier must return a reversed display equation and scaled enthalpy.

- [ ] **Step 3: Implement target and formation-ledger cross-checks**

  `targetMatched` requires every union species coefficient to equal the target within `1e-10`. Calculate the card sum and target formation sum independently. When the target is matched, require closure within `1e-9 kJ`; when it is not matched, report both without calling the pathway valid.

- [ ] **Step 4: Implement cancellation lanes**

  Return per species `{ reactantMagnitude, productMagnitude, cancelledMagnitude, netCoefficient }` across all scaled cards. This record drives the illuminated gantry and must preserve uncancelled species visibly.

- [ ] **Step 5: Implement four learner dimensions**

  Expected values are target matched/not matched, negative/zero/positive enthalpy, `enthalpy-scales-with-equation`, and `same-endpoints-same-deltaH`. Preserve every learner claim and explain each dimension separately.

- [ ] **Step 6: Implement four non-mutating Hess hints**

  Levels expose, in order: target species sides; one useful card orientation; current uncancelled species; and exact target multipliers plus the state-function boundary.

- [ ] **Step 7: Run Hess verifier coverage**

  Verify all three exact target sums, reverse sign, scalar scaling, zero-card state, partial cancellation, false target match, formation closure, predictions, hints, invalid inputs, and immutability.

---

### Task 3: Pure immutable calorimetry engine

**Files:**
- Modify: `src/chemistry/thermochemistry.js`
- Modify: `scripts/verify-thermochemistry.mjs`

**Interfaces:**
- Produces `balanceCalorimetry({ challengeId, inputs })`.
- Produces `evaluateCalorimetryAttempt({ balance, prediction })`.
- Produces `nextCalorimetryHint({ balance, prediction, level })`.
- `prediction` is `{ temperatureDirection, surroundingsSign, reactionKind, vesselClaim }`.

- [ ] **Step 1: Add red bounds and closure tests**

  Require solution mass `1–1000 g`, specific heat `0.1–10 J g−1 K−1`, ΔT `-50–50 K`, vessel heat capacity `0–1000 J K−1`, and extent `0.0001–10 mol`. Reject nonfinite inputs and preserve exact zero-temperature-change behavior.

- [ ] **Step 2: Implement the ideal heat ledger**

  Calculate all five required quantities in joules before converting the molar reaction enthalpy to kJ mol−1. Return with-vessel and no-vessel estimates, signed difference, percentage omission when defined, and exact closure `qsystem + qsurroundings = 0`.

- [ ] **Step 3: Implement four learner dimensions**

  Temperature rise/fall/no-change derives from ΔT; surroundings sign from `qsurroundings`; reaction kind from `qsystem`; vessel claim says inclusion increases magnitude when `Ccal > 0` and `ΔT != 0`, otherwise no effect. Reasons must distinguish observed temperature from inferred system heat.

- [ ] **Step 4: Implement four non-mutating calorimetry hints**

  Levels expose ΔT direction; solution/vessel heat-capacity terms; `qsurroundings` and opposite system sign; then normalized molar result and all model boundaries.

- [ ] **Step 5: Run complete thermochemistry verifier**

  Exact defaults must resolve to `-57.642`, `+30.569066…`, and `-65.84 kJ mol−1 reaction` respectively. Verify zero ΔT, zero vessel heat capacity, sign reversal, scaling, omission percentage, predictions, hints, invalid inputs, and immutability.

---

### Task 4: Graphical React Thermochemical Cycle Studio

**Files:**
- Create: `src/components/ThermochemistryLab.jsx`
- Create: `src/styles/thermochemistry.css`

**Interfaces:**
- Consumes Tasks 1–3, `MODEL_PASSPORTS.thermochemicalCycleStudio`, and `SCIENCE_SOURCES`.
- Produces section ID `thermochemistryLab` with local React state only.

- [ ] **Step 1: Build persistent mode switching**

  Provide `Cycle forge` and `Calorimeter` tabs. Each mode retains its own challenge, learner controls, explicit snapshot, predictions, hints, and history while the learner inspects the other mode.

- [ ] **Step 2: Build the Hess challenge rail and target plate**

  Render three challenge plates with source-backed/synthetic provenance. Switching challenge restores zero multipliers and clears only Hess-mode evidence. Show the target equation and phase labels prominently without showing target multipliers.

- [ ] **Step 3: Build reversible magnetic reaction tiles**

  Each card contains the current oriented equation, unscaled source enthalpy, seven multiplier positions, a dedicated reverse control, and explicit zero/off state. Changing a multiplier marks prior evidence stale and never audits automatically.

- [ ] **Step 4: Build the cancellation gantry**

  After `Audit cycle`, render each species on a brass rail with reactant contributions entering from the left, product contributions entering from the right, a lit cancelled amount in the centre, and an uncancelled remainder exiting toward the target. Include an accessible contribution table.

- [ ] **Step 5: Build the enthalpy signal strip**

  Link scaled card enthalpies to a physical copper sum drum. Display the path sum and independent formation cross-check separately; open the `TARGET MATCHED` gate only when the species vector matches.

- [ ] **Step 6: Build the cutaway calorimeter mode**

  Render a porcelain solution chamber, copper vessel jacket, magenta reaction-system core, thermometer, and heat beads. Controls edit `m`, `cp`, `ΔT`, `Ccal`, and `ξ`; no heat arrows or ledger appear until `Balance heat ledger` is pressed. Editing retains and marks the prior snapshot stale.

- [ ] **Step 7: Build system/surroundings evidence**

  After balancing, animate heat beads in the sign-correct direction once, display separate `qsolution`, `qcal`, `qsurroundings`, `qsystem`, and molar `ΔHreaction` cards, and provide an accessible table. Reduced motion keeps all endpoints and arrows visible without animation.

- [ ] **Step 8: Build predictions, hints, and history for both modes**

  Require four predictions before check, preserve wrong answers, expose four non-mutating hints, and keep chronological mode-specific histories. `Clear predictions` must not change tiles, thermal inputs, or snapshots; `Reset challenge` is the only full local reset.

- [ ] **Step 9: Build the teacher contrast rail**

  Add six explicit contrasts: reverse equation/sign; equation scaling/extensive enthalpy; path/endpoints; warming surroundings/exothermic system; solution heat/vessel heat; measured ΔT/mechanism and identity. Loaders change a challenge but never audit or balance automatically.

- [ ] **Step 10: Add passport and source console**

  Show selected NIST values with uncertainty and state, synthetic calorimetry provenance, formulas, conditions, includes/excludes, and ten direct source links. Prominently state: `A closed heat ledger explains this declared model. It does not prove that a reaction occurs, identify a substance, or validate an experiment.`

- [ ] **Step 11: Apply the locked visual system**

  Derive all colours from the eight locked tokens. Use one switch throw, one cancellation-lamp sequence, and one heat-bead transit only; disable under reduced motion. The switchyard and cutaway Dewar must dominate, with quiet porcelain ledgers around them.

---

### Task 5: Integration, curriculum promotion, numbering, and documentation

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/Header.jsx`
- Modify: every numbered component from `ElectrochemistryLab.jsx` through `EquationSections.jsx`
- Modify: `src/data/curriculum.js`
- Modify: `package.json`
- Modify: `README.md`

- [ ] **Step 1: Lazy-load and place the studio**

  Place `ThermochemistryLab` after `EnergyLab` and before `ElectrochemistryLab`. Add desktop and mobile `More labs` links.

- [ ] **Step 2: Keep section numbering continuous**

  New studio is `10 / Thermochemical cycles + calorimetry`. Shift Electrochemistry through Equation balancer by one so the final sequence ends at `26 / Equation balancer`.

- [ ] **Step 3: Promote bounded curriculum coverage**

  Add one live topic and outcome to General, Physical, and Analytical chemistry, plus a live-lab link and exact model-boundary copy in each. Expected total: 85 live topic clusters; General 20, Physical 18, Analytical 8. Do not alter the advanced/nonideal and measured-method next-engine gaps.

- [ ] **Step 4: Add package verification and README coverage**

  Add `verify:thermochemistry`; update the verifier count from 23 to 24. Document all new files, interactions, exact equations, source records, student/teacher workflow, deterministic coverage, and scientific/safety boundary.

---

### Task 6: Requested deterministic, build, and browser learning validation

**Files:**
- Validate after Tasks 1–5.

- [ ] **Step 1: Run `npm run verify:thermochemistry` fresh**

  Expected: eight records, six challenges, all exact Hess and calorimetry references, feedback, hints, boundaries, and immutability pass.

- [ ] **Step 2: Run all 24 deterministic verifiers**

  Enumerate every `verify:*` script from `package.json`, run each once, and retain the exact pass/fail list.

- [ ] **Step 3: Run `npm run build`**

  Expected: Vite emits lazy ThermochemistryLab JavaScript and CSS chunks with no import or syntax failure.

- [ ] **Step 4: Student journey at 1440 px**

  Open Cycle forge, construct one wrong partial cycle, confirm no automatic correction, audit explicitly, submit four wrong predictions, verify preservation and reasons, use four hints without multiplier mutation, then reach an exact target manually.

- [ ] **Step 5: Teacher journey at 768 px**

  Load the water phase bridge, compare reverse/sign and path/endpoints, switch to `vessel-matters`, verify no auto-balance, balance explicitly, and demonstrate how omitting `Ccal` changes magnitude without changing heat direction.

- [ ] **Step 6: Mobile journey at 390 px**

  Switch both modes, reverse/scale a tile, edit every thermal input, balance, make and check predictions, inspect the contribution and heat tables, open the passport, and confirm no document-level horizontal overflow or clipped controls.

- [ ] **Step 7: Accessibility and runtime audit**

  Confirm visible keyboard focus, 44 px controls, table equivalents for graphics, reduced-motion evidence, no Vite error overlay, and no interaction failure. If the browser harness still cannot expose console history, report that limitation rather than claiming a zero-console result.

- [ ] **Step 8: Restore the normal viewport and leave the lab open**

  Show the strongest verified teaching state in the existing local tab and mark it as the deliverable.
