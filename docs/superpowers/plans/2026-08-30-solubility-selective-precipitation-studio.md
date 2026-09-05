# Solubility & Selective Precipitation Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a graphical, learner-controlled studio for ideal solubility-product equilibrium, dissolution/precipitation direction, common-ion effects, and selective-precipitation windows.

**Architecture:** Add frozen source-backed solid records and synthetic classroom scenarios, then keep all equilibrium arithmetic in one pure immutable engine. A lazy React lab presents two explicit instruments: a saturation vessel that freezes one learner-defined ion mixture and a selectivity prism that compares free-precipitant thresholds. Results, predictions, hints, and old snapshots never mutate learner inputs or run automatically.

**Tech Stack:** React 19, Vite 8, plain scoped CSS, pure ES modules, deterministic Node verification, existing source/passport and curriculum registries.

## Global Constraints

- Work only inside `/Users/syed/Desktop/chemistry_project`; do not perform Git actions.
- Add no dependency, remote runtime call, language-model call, chemical-inventory lookup, or operational laboratory procedure.
- Treat every concentration as an ideal dimensionless activity surrogate `a ≈ c/c°` with `c° = 1 mol L⁻¹`; never present concentration-product results as reference thermodynamic constants.
- Keep the solid formula, dissociation stoichiometry, temperature, selected constant, derivation, and source provenance visible.
- Never infer arbitrary salts, precipitation reactions, complexation, pH coupling, activity coefficients, nucleation, crystal form, appearance, purity, identity, safety, or real apparatus performance.
- No control change may run equilibrium automatically. An explicit `Settle vessel` or `Scan thresholds` action freezes the exact learner state.
- A later edit marks the old result stale and retains it until the learner explicitly runs again.
- Wrong predictions remain exactly selected after comparison; hints change no input, prediction, scenario, or snapshot.
- Responsive floor: 390 px without document overflow, 44 px controls, visible keyboard focus, and reduced-motion support.

---

## File Map

**Create**

- `src/data/solubilityScenarios.js` — four solid records, four saturation-vessel challenges, four selective-precipitation challenges, local constants, and model boundary.
- `src/chemistry/solubilityEquilibrium.js` — activity-product arithmetic, signed solid extent, bisection, pure/common-ion solubility, selectivity thresholds, prediction evaluation, and hints.
- `scripts/verify-solubility-equilibrium.mjs` — deterministic data, source, arithmetic, preservation, invalid-input, and immutability checks.
- `src/components/SolubilityLab.jsx` — two explicit interactive instruments, glass vessel, prism, predictions, teacher rail, trace, and passport.
- `src/styles/solubility-equilibrium.css` — scoped glass-optics visual system and responsive behavior.

**Modify**

- `src/data/scienceSources.js` — IUPAC definitions, NIST/NBS records, IUPAC–NIST database links, and `solubilityPrecipitationStudio` passport.
- `src/App.jsx` — lazy-load the new lab after thermochemistry.
- `src/components/Header.jsx` — add desktop and mobile navigation links.
- `src/data/curriculum.js` — add one live topic and lab to General, Inorganic, and Analytical chemistry, and update model boundaries.
- `src/components/ElectrochemistryLab.jsx` through `src/components/EquationSections.jsx` — shift displayed section numbers 11–26 to 12–27; the new lab becomes section 11.
- `package.json` — add `verify:solubility-equilibrium`.
- `README.md` — add capability, verifier, architecture, and scientific-boundary documentation; update verifier count from 24 to 25.

## Visual Direction

**Subject and audience:** An undergraduate student or instructor learning why “insoluble” is an equilibrium statement and why selective precipitation depends on both a constant and the current composition. The page’s single job is to make ion-product bookkeeping and threshold order physically legible.

**Palette**

- Deep bath blue `#10283c` — instrument shell and optical background.
- Borosilicate cyan `#dff8ff` — vessel edges, solution and focus states.
- Cobalt `#2b6cb0` — cation stream and quantitative controls.
- Persimmon `#ef8354` — anion stream and supersaturation warning.
- Mineral yellow `#f2c14e` — precipitate and threshold markers.
- Bench ivory `#f4f1e8` — readable ledgers and prediction surfaces.

**Typography:** `Avenir Next Condensed`/`Arial Narrow` for the instrument title and large verdicts, `Inter`/system UI for prose, and `SFMono-Regular`/monospace for formulae, concentrations, log ratios, thresholds, and action labels.

**Layout concept**

```text
┌──────────────────────── illuminated glass thesis ───────────────────────┐
│ “A cloudy result begins as a number.”      [ion beams → settling column] │
└───────────────────────────────────────────────────────────────────────────┘
┌──────── challenge cassette rail ────────┐
├───────────────┬──────────────────────────┬────────────────────────────────┤
│ source valves │ tall glass settling tube │ saturation balance + snapshot  │
│ concentrations│ floating ions / sediment │ Qsp / Ksp / signed solid extent │
├───────────────┴──────────────────────────┴────────────────────────────────┤
│ learner claims │ evidence ledger │ chronological action register          │
├──────────────────────── selectivity prism mode ───────────────────────────┤
│ editable analytes → logarithmic free-Ag+ threshold rays → separation slit │
└───────────────────────────────────────────────────────────────────────────┘
```

**Signature:** A tall borosilicate settling column. Before the explicit action, ion tokens remain suspended behind frosted glass. After the action, a signed equilibrium extent either grows a patterned sediment bed or erodes a finite solid bed while a logarithmic `Qsp/Ksp` balance pivots beside it. The selectivity instrument uses a prismatic logarithmic rail rather than a generic bar chart.

**Self-critique:** The dark instrument shell is not the signature; the project already uses dark scientific panels. The unique choice is the vertical glass/sediment interaction plus threshold prism. Keep secondary cards ivory and quiet, remove decorative bubbles that do not encode dissolved ions, and use motion only for the one settle/dissolve event.

---

### Task 1: Freeze source-backed solids and bounded scenarios

**Files:**
- Create: `src/data/solubilityScenarios.js`
- Modify: `src/data/scienceSources.js`
- Test: `scripts/verify-solubility-equilibrium.mjs`

**Interfaces:**
- Produces `SOLUBILITY_SOLIDS`, `SOLUBILITY_SOLID_BY_ID`, `SATURATION_CHALLENGES`, `SATURATION_CHALLENGE_BY_ID`, `SELECTIVITY_CHALLENGES`, `SELECTIVITY_CHALLENGE_BY_ID`, `SOLUBILITY_MODEL_BOUNDARY`.
- Produces `MODEL_PASSPORTS.solubilityPrecipitationStudio`.

- [ ] **Step 1: Write the failing data contract**

The verifier must assert exactly four recursively frozen solids:

```js
[
  ['silver-chloride', 'AgCl', 1.751057703729095e-10, [1, 1]],
  ['silver-bromide', 'AgBr', 4.888569345474281e-13, [1, 1]],
  ['silver-iodide', 'AgI', 8.151729967355943e-17, [1, 1]],
  ['calcium-fluoride', 'CaF₂', 3.8904514499428045e-11, [1, 2]],
]
```

Silver-halide values are derived at 298.15 K from the selected `E°(Ag⁺/Ag) = 0.7996 V` and NBS/NIST `E°(AgX/Ag,X⁻) = 0.2224, 0.0713, −0.1522 V` records using:

```js
Ksp = Math.exp((silverHalidePotentialV - silverPotentialV) * F / (R * T));
```

The calcium-fluoride record stores `pKsp = 10.41` and `Ksp = 10 ** -10.41` from the cited NIST paper. Every record includes formula, ions, stoichiometric coefficients, charges, molar mass, visual sediment label, temperature, record kind, derivation, and source IDs.

- [ ] **Step 2: Add four saturation challenges**

Use these exact frozen defaults:

```js
[
  { id:'agcl-near-gate', solidId:'silver-chloride', cationM:4e-5, cationMl:50, anionM:4e-5, anionMl:50, solidMg:0 },
  { id:'agcl-common-ion', solidId:'silver-chloride', cationM:0, cationMl:50, anionM:1e-2, anionMl:50, solidMg:5 },
  { id:'agi-trace-trigger', solidId:'silver-iodide', cationM:2e-7, cationMl:50, anionM:2e-7, anionMl:50, solidMg:0 },
  { id:'caf2-stoichiometry', solidId:'calcium-fluoride', cationM:5e-4, cationMl:40, anionM:1e-3, anionMl:60, solidMg:0 },
]
```

Each challenge contains plain-language mission, teacher question, synthetic/input provenance, and expected conceptual contrast.

- [ ] **Step 3: Add four selectivity challenges**

All use a free Ag⁺ threshold and a 99.9% first-analyte removal target:

```js
[
  { id:'iodide-chloride-window', analytes:[['silver-iodide',1e-2],['silver-chloride',1e-2]] },
  { id:'bromide-chloride-overlap', analytes:[['silver-bromide',1e-2],['silver-chloride',1e-2]] },
  { id:'concentration-flips-order', analytes:[['silver-iodide',1e-10],['silver-chloride',1e-2]] },
  { id:'dilution-opens-window', analytes:[['silver-bromide',1e-2],['silver-chloride',1e-4]] },
]
```

- [ ] **Step 4: Add authoritative sources and passport**

Add source records for IUPAC solubility product, solubility, thermodynamic activity, and saturated solution; the NBS/NIST silver-halide electrode paper; the NIST calcium-fluoride paper; NIST SRD 106; and the IUPAC Solubility Data Series. The passport conditions include 298.15 K selected constants, ideal concentration ratios, additive volumes, spectator ions omitted, one solid equilibrium, and 1:1 silver-halide selectivity. Exclusions explicitly name nonideal activities, ionic strength, ion pairing, complexes, acid-base coupling, competing solids, polymorphs, nucleation, kinetics, co-precipitation, adsorption, measured turbidity, identity, purity, procedure, and safety.

- [ ] **Step 5: Run the failing verifier**

Run: `npm run verify:solubility-equilibrium`

Expected before implementation: script missing or module-not-found failure.

---

### Task 2: Implement signed solid-equilibrium and solubility arithmetic

**Files:**
- Create: `src/chemistry/solubilityEquilibrium.js`
- Extend: `scripts/verify-solubility-equilibrium.mjs`

**Interfaces:**
- Produces `analyzeSaturationVessel({ challengeId, inputs })`.
- Produces `evaluateSaturationAttempt({ analysis, prediction })` and `nextSaturationHint({ analysis, prediction, level })`.

- [ ] **Step 1: Add pure and background solubility helpers**

For a solid with coefficients `νi`, solve:

```js
Ksp = product((backgroundConcentration[i] + νi * s) ** νi)
```

For pure solvent this gives `s = sqrt(Ksp)` for AgX and `s = cbrt(Ksp/4)` for CaF₂. Use monotone bisection for nonzero backgrounds.

- [ ] **Step 2: Add the signed extent model**

After additive-volume mixing, define dissolution extent `ξ` in moles of formula units:

```js
niFinal = niInitial + νi * ξ;
solidFinal = solidInitial - ξ;
Qsp(ξ) = product((niFinal / totalVolumeL) ** νi);
```

The feasible interval is:

```js
lower = -Math.min(...ions.map((ion, i) => niInitial[i] / ion.coefficient));
upper = solidInitialMoles;
```

If `Qsp(0) > Ksp`, solve on `[lower, 0]` and report precipitation. If `Qsp(0) < Ksp` with solid available, solve on `[0, upper]` or dissolve all available solid when the upper endpoint remains undersaturated. If no solid is present, retain the undersaturated dissolved state. Equal values produce no net change.

- [ ] **Step 3: Return one immutable audit record**

Include initial/final ion moles and concentrations, initial/final `Qsp`, `Ksp`, `log10(Qsp/Ksp)`, initial state, direction, signed extent, initial/final solid mass, mass change, limiting boundary, pure molar solubility, background additional solubility, equation ledger, and model boundary. Reject NaN, negative concentrations, nonpositive total volume, negative solid mass, unknown IDs, and nonconvergent bounds.

- [ ] **Step 4: Add preserved four-claim evaluation**

Claims are `initialState`, `direction`, `solidMassChange`, and `kspMeaning`. Correct values come from the frozen analysis; `kspMeaning` is always `stoichiometry-and-background-matter`. Return learner values unchanged with one reason per dimension.

- [ ] **Step 5: Add four non-mutating hints**

Hint levels expose, in order: the diluted ion concentrations, the symbolic Q expression, the signed Q/K comparison, and the feasible signed extent boundary. Deep-freeze every result.

- [ ] **Step 6: Verify exact vessel references**

Assert:

```js
AgCl pure s = 1.3232753695769806e-5 M
CaF2 pure s = 2.1345844247682328e-4 M
AgCl with 0.005 M Cl-: additional s = 3.502090878187633e-8 M
AgCl near-gate precipitate = 6.767246304230196e-7 mol = 0.096989 mg approximately
CaF2 challenge precipitate = 4.747655631325925e-6 mol = 0.3706723 mg
```

Run: `npm run verify:solubility-equilibrium`

Expected: the data and saturation sections pass while selectivity remains unimplemented.

---

### Task 3: Implement selective-precipitation thresholds

**Files:**
- Modify: `src/chemistry/solubilityEquilibrium.js`
- Extend: `scripts/verify-solubility-equilibrium.mjs`

**Interfaces:**
- Produces `analyzeSelectivity({ challengeId, concentrationsM })`.
- Produces `evaluateSelectivityAttempt({ analysis, prediction })` and `nextSelectivityHint({ analysis, prediction, level })`.

- [ ] **Step 1: Calculate onset thresholds**

For each declared 1:1 silver halide:

```js
freeSilverAtOnsetM = Ksp / freeHalideM;
```

Sort ascending. Preserve a simultaneous state when log thresholds differ by less than `1e-10` decades.

- [ ] **Step 2: Calculate removal at second onset**

For the first solid when the second begins:

```js
firstFreeAtSecondOnsetM = first.Ksp / second.freeSilverAtOnsetM;
fractionRemaining = clamp(firstFreeAtSecondOnsetM / firstInitialM, 0, 1);
fractionRemoved = 1 - fractionRemaining;
targetPossible = fractionRemoved >= 0.999;
```

Also return the free-Ag⁺ value needed for exactly 99.9% removal and whether that value lies before the second onset.

- [ ] **Step 3: Add four preserved claims and hints**

Claims are `firstSolidId`, `targetPossible`, `orderingRule`, and `removalBand`; `orderingRule` is always `ksp-and-current-concentration`. Removal bands are `below-90`, `90-to-99-9`, and `at-least-99-9`. Hints expose current concentrations, both onset equations, threshold ordering, and removal-at-second-onset arithmetic without changing state.

- [ ] **Step 4: Verify all four contrasts**

Assert iodide precedes chloride with more than 99.9% removal possible; bromide precedes chloride but reaches only `0.9972082191608743` removed at chloride onset; dilute iodide loses to chloride despite lower Ksp; dilute chloride opens a bromide window with `0.9999720821916087` removed. Check zero/negative concentrations, ties, prediction preservation, four hints, and recursive immutability.

Run: `npm run verify:solubility-equilibrium`

Expected: all engine and data checks pass.

---

### Task 4: Build the graphical saturation vessel

**Files:**
- Create: `src/components/SolubilityLab.jsx`
- Create: `src/styles/solubility-equilibrium.css`

**Interfaces:**
- Consumes all Task 1 data and Task 2 saturation exports.
- Produces `<section id="solubilityLab">`.

- [ ] **Step 1: Build the hero and mode switch**

Use the thesis `A cloudy result begins as a number.` and two native-button tabs: `Saturation vessel` and `Selectivity prism`. The hero instrument shows two ion beams intersecting above a patterned sediment bed. Use the visual tokens and signature exactly as declared above.

- [ ] **Step 2: Build the challenge cassette and source valves**

Render four scenario buttons with formula, mission shorthand, and provenance. Five learner inputs control cation concentration, cation volume, anion concentration, anion volume, and initial solid mass. Editing after a snapshot marks it stale and logs the edit; it never runs equilibrium.

- [ ] **Step 3: Build the explicit settling action and glass column**

The action is named `Settle vessel`. Before it, glass is frosted and the Q/K dial is sealed. After it, render dissolved ion tokens proportional to final concentrations, a patterned solid bed proportional to final solid mass, a direction arrow, and a log-scale Q/K balance. Use color plus pattern, text, and symbols so sediment color is never the only state cue.

- [ ] **Step 4: Build the accessible equilibrium ledger**

Show initial and final ion concentrations, Qsp, Ksp, log ratio, signed formula-unit extent, solid mass, pure molar solubility, and background additional solubility. Include a horizontally scrollable semantic table and the full equation ledger.

- [ ] **Step 5: Build predictions, reasons, hints, and trace**

Require all four learner claims after a current snapshot. Preserve wrong choices, display one reason per claim, and keep four hint levels non-mutating. Record every edit, settle, claim, check, hint, clear, and reset.

---

### Task 5: Build the selectivity prism and teaching boundary

**Files:**
- Modify: `src/components/SolubilityLab.jsx`
- Modify: `src/styles/solubility-equilibrium.css`

**Interfaces:**
- Consumes Task 3 selectivity exports and the science passport.

- [ ] **Step 1: Build the editable two-analyte manifold**

Render four challenge buttons and two concentration inputs. The explicit action is `Scan thresholds`. Edits after a scan mark the old prism stale.

- [ ] **Step 2: Build the logarithmic threshold prism**

Use one shared `log10[Ag+]` rail with two labelled onset rays, an interval band, a 99.9% target slit, and a marker for first-analyte removal when the second starts. Render a semantic threshold table directly below it.

- [ ] **Step 3: Add selectivity claims, explanations, hints, and trace**

Use four learner claims and return each unchanged. Explain concentration-flipped ordering directly: `onset compares Ksp/[X-], not Ksp alone`. Keep the no-auto-run contract identical to saturation mode.

- [ ] **Step 4: Add six teacher contrasts**

Create exactly: `KSP ≠ s`, `Q BEFORE CLOUD`, `COMMON ION`, `ORDER CAN FLIP`, `ONSET ≠ COMPLETE`, and `SOLID ≠ IDENTITY`. Each loads a declared challenge but performs no settle/scan.

- [ ] **Step 5: Add the model passport and sources**

Show conditions, included results, exclusions, input provenance, local-data statement, all solid constants with derivation type, and source links. The warning must state: `A closed ideal ion ledger does not prove visible precipitation, identity, purity, safety, or experimental validity.`

---

### Task 6: Integrate curriculum, navigation, numbering, and documentation

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/Header.jsx`
- Modify: `src/data/curriculum.js`
- Modify: downstream section labels
- Modify: `package.json`
- Modify: `README.md`

- [ ] **Step 1: Lazy-load after thermochemistry**

Add `SolubilityLab` after `<ThermochemistryLab />`, with fallback ID `solubilityLab`. Add desktop/mobile menu copy: `Solubility & precipitation — Mix ions, settle a solid, and scan separation windows`.

- [ ] **Step 2: Renumber sections**

Keep thermochemistry at 10, insert solubility at 11, and shift electrochemistry through the equation balancer from 11–26 to 12–27.

- [ ] **Step 3: Promote three curriculum topics**

Add one live topic, outcome, and lab to General, Inorganic, and Analytical chemistry. Expected live counts become General 21, Organic 12, Inorganic 12, Physical 18, Analytical 9, Biochemistry 9, Materials 7; total 88. Keep advanced nonideal/multiphase, real speciation, and validated separations outside scope.

- [ ] **Step 4: Update package and README**

Add `verify:solubility-equilibrium`, update verifier count to 25, document the two instruments, list every new file, summarize deterministic checks, and add the ideal concentration/activity, kinetics, identity, purity, and procedure boundary.

---

### Task 7: Validate as a student and teacher

**Files:**
- Verify only; change files only if evidence identifies a defect.

- [ ] **Step 1: Run targeted verification**

Run:

```bash
npm run verify:solubility-equilibrium
npm run build
```

Expected: exit 0 for both; only the existing Vite bundle-size advisory may remain.

- [ ] **Step 2: Student-flow browser audit**

At `#solubilityLab`, verify: an initial wrong prediction remains selected; `Settle vessel` opens one immutable snapshot; an input edit changes the badge to previous/stale without recalculation; rerun updates it; a common-ion case dissolves much less AgCl than pure water; a concentration-flip selectivity case puts AgCl before AgI; four separate explanations open; hints change no controls or predictions.

- [ ] **Step 3: Teacher-flow browser audit**

Verify all six contrasts render and load the intended scenario without running it. Confirm passport constant rows and all authoritative source links render. Confirm the interface says Q predicts equilibrium direction, not visible onset time or identity.

- [ ] **Step 4: Responsive and accessibility audit**

Check 1440×1000, 768×900, and 390×844. Confirm no document overflow, horizontal scrolling is confined to challenge rails/tables, all controls are at least 44 px high, native buttons activate from keyboard, focus is visible, labels are programmatically attached, and reduced-motion CSS disables settling/beam animation.

- [ ] **Step 5: Run the full regression suite and fresh build**

Run all 25 `verify:*` scripts and then a fresh `npm run build`. Read every exit code. Do not claim universal chemistry or curriculum completion from these bounded checks.

---

## Self-Review

- **Spec coverage:** Data provenance, ideal-activity boundary, explicit actions, signed dissolution/precipitation, stoichiometric solubility, common-ion contrast, four selectivity contrasts, preserved predictions, hints, trace, teacher use, passport, navigation, curriculum, responsive UI, and full regression evidence each map to a task.
- **Placeholder scan:** No placeholder marker, deferred implementation phrase, vague error-handling instruction, or undefined cross-task shorthand remains.
- **Type consistency:** `analyzeSaturationVessel`, `evaluateSaturationAttempt`, `nextSaturationHint`, `analyzeSelectivity`, `evaluateSelectivityAttempt`, and `nextSelectivityHint` are defined once and consumed with the same names. Scenario IDs and exact constants match the verifier expectations.
- **Boundary check:** The design does not turn a concentration-product teaching model into a thermodynamic activity calculation, kinetic cloud prediction, qualitative solubility-rule chart, identity test, real separation method, or laboratory procedure.
- **Visual check:** The glass settling column and logarithmic threshold prism are specific to the chemistry and materially different from the previous reaction foundry, polymer loom, chromatography instrument, and phase navigator.

## Execution Handoff

Plan complete. Because the current repository instructions prohibit Git actions and the active goal requests continuous development in this same workspace, execute inline with the `executing-plans` skill, using the targeted verifier and browser checkpoints above.
