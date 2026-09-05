# Binary VLE Equilibrium Navigator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a graphical undergraduate workbench where learners explore ideal binary liquid-vapour equilibrium in pressure-composition and temperature-composition views, predict phase region and enrichment, and read equilibrium compositions and lever-rule phase amounts without treating the model as real-mixture certification or process design.

**Architecture:** Store four NIST Antoine pure-component records and two declared ideal-binary pair contracts as frozen local data. A pure engine owns ranged vapour-pressure evaluation/inversion, Raoult bubble/dew calculations, bisection temperature roots, P-x-y/T-x-y traces, five-region flash classification, equilibrium composition and material-balance closure, independent prediction scoring, and non-mutating hints. A lazy React module renders two persistent diagram modes connected to a split glass vessel, tie-line ports, prediction console, teacher trace, and source-backed model passport.

**Tech Stack:** React 19, Vite 8, JavaScript ES modules, semantic HTML, inline SVG, CSS, Node `assert/strict`.

## Global Constraints

- Cover only two declared ideal binary pairs: benzene/toluene and n-hexane/n-heptane.
- Use the selected NIST Antoine coefficient record for each pure component only inside its stated temperature range, with `log10(p/bar) = A - B/(T + C)` and T in kelvin.
- Restrict each pair to the overlap of both pure-component Antoine ranges.
- Component 1 is the more volatile component throughout each declared overlap; verify this rather than assuming it silently.
- Set liquid activity coefficients to one and vapour fugacity coefficients to one. Present this explicitly as ideal-liquid plus ideal-gas Raoult-law teaching algebra, not measured mixture behaviour.
- For P-x-y, calculate `pBubble = x1 p1* + (1-x1) p2*` and `1/pDew = y1/p1* + (1-y1)/p2*` at fixed T.
- For T-x-y, solve the same equations at fixed p by bounded bisection only inside the shared Antoine temperature window.
- At a learner state `(T,p,z1)`, classify exactly one of liquid, bubble-point boundary, two-phase, dew-point boundary, or vapour using a documented relative tolerance of `1e-8`.
- In a two-phase or boundary state, derive `x1`, `y1`, liquid fraction, and vapour fraction from equilibrium and component balance. Preserve `z1 = L x1 + V y1` and `L + V = 1` within numerical tolerance.
- Treat x, y, and z as amount fractions. Do not silently convert mass, volume, or concentration fractions.
- Show phase amounts only after the learner checks or explicitly requests a declared boundary/midpoint reference. Never infer a distillation sequence, column stage, apparatus condition, or operating procedure.
- Preserve wrong phase-region, enrichment, and vapour-fraction predictions after checking with separate reasons.
- Never clamp a prediction to the model result. Reject only nonfinite state inputs or values outside the declared correlation/composition windows.
- Exclude nonideal activity coefficients, azeotropes, excess properties, Henry-law dilute limits, vapour fugacity corrections, high-pressure EOS, liquid-liquid/solid equilibrium, reactive mixtures, caloric properties, flash enthalpy, distillation-column design, efficiency, kinetics, nucleation, mass transfer, and safety/operating guidance.
- State that benzene is hazardous and that the named pair is a virtual data-backed teaching record, not permission or instruction to handle chemicals.
- Preserve every existing module and deterministic verifier.
- Add no runtime dependency, backend, model call, paid API, operational procedure, or hazardous chemistry instruction.
- Do not perform Git actions; repository instructions override the plan skill's usual worktree and commit cadence.

---

### Task 1: Frozen binary records, sources, passport, and red verifier

**Files:**
- Create: `src/data/binaryVleScenarios.js`
- Modify: `src/data/scienceSources.js`
- Create: `scripts/verify-binary-vle.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `VLE_COMPONENTS`, `VLE_COMPONENT_BY_ID`, `BINARY_VLE_PAIRS`, `BINARY_VLE_PAIR_BY_ID`, and `BINARY_VLE_MODEL_BOUNDARY`.
- Produces passport: `MODEL_PASSPORTS.binaryVleNavigator`.
- The verifier imports the planned Task 2 engine so the first run fails only because `src/chemistry/binaryVle.js` does not exist.

- [ ] **Step 1: Declare four pure-component records**

Use these NIST Chemistry WebBook SRD 69 Antoine records in bar and kelvin:

```js
benzene:  {A:4.72583, B:1660.652, C:-1.461, Tmin:333.4,  Tmax:373.5}
toluene:  {A:4.07827, B:1343.943, C:-53.773,Tmin:308.52, Tmax:384.66}
n-hexane: {A:4.00266, B:1171.53,  C:-48.784,Tmin:286.18, Tmax:342.69}
n-heptane:{A:4.02832, B:1268.636, C:-56.199,Tmin:299.07, Tmax:372.43}
```

Each frozen record contains `id`, `name`, `formula`, `cas`, `accent`, `antoine`, `validTemperatureK`, `sourceId`, `reference`, and `hazardBoundary`.

- [ ] **Step 2: Declare two pair contracts**

`benzene-toluene` uses component 1 benzene, component 2 toluene, shared range 333.4–373.5 K, P-x-y default T 353.15 K, z1 0.5, and p equal to the midpoint between the z1 bubble/dew pressures. Its T-x-y default pressure is 0.65 bar and default T is the midpoint between the z1 bubble/dew temperatures.

`hexane-heptane` uses component 1 n-hexane, component 2 n-heptane, shared range 299.07–342.69 K, P-x-y default T 323.15 K, z1 0.5, and the same midpoint policy. Its T-x-y default pressure is 0.30 bar.

Each record contains `id`, `name`, `component1Id`, `component2Id`, `validTemperatureK`, `defaultPxyTemperatureK`, `defaultTxyPressureBar`, `defaultOverallFraction1`, `teachingQuestion`, `idealityBoundary`, and `hazardBoundary`.

- [ ] **Step 3: Register authoritative sources**

Add source records for IUPAC Raoult's law, ideal mixture, amount fraction, pressure/partial pressure, and phase rule. Reuse the existing thermodynamic-equilibrium source. Add NIST Antoine records for benzene, toluene, n-hexane, and n-heptane. Reuse the ACS undergraduate curriculum source.

- [ ] **Step 4: Add the complete model passport**

`MODEL_PASSPORTS.binaryVleNavigator` must enumerate pure-component ranged Antoine pressure, ideal Raoult partial pressures, P-x-y/T-x-y bubble/dew traces, five-region classification, equilibrium x/y, partial-pressure closure, and lever-rule L/V amounts. It must explicitly exclude measured mixture data, actual ideality certification, activities/fugacities other than unity, azeotropes, multicomponent/solid/reactive systems, caloric flash, distillation design, transport, rate, apparatus, procedure, and safety claims.

- [ ] **Step 5: Write and register the red verifier**

The verifier first asserts:

```js
assert.equal(Object.keys(VLE_COMPONENTS).length, 4);
assert.equal(BINARY_VLE_PAIRS.length, 2);
assert.deepEqual(BINARY_VLE_PAIR_BY_ID['benzene-toluene'].validTemperatureK, {minimum:333.4,maximum:373.5});
assert.deepEqual(BINARY_VLE_PAIR_BY_ID['hexane-heptane'].validTemperatureK, {minimum:299.07,maximum:342.69});
```

Add `"verify:binary-vle": "node scripts/verify-binary-vle.mjs"` to `package.json`.

Run: `npm run verify:binary-vle`

Expected: non-zero exit caused only by missing `src/chemistry/binaryVle.js`.

### Task 2: Ranged ideal binary-equilibrium engine

**Files:**
- Create: `src/chemistry/binaryVle.js`
- Modify: `scripts/verify-binary-vle.mjs`

**Interfaces:**
- Consumes Task 1 records.
- Produces: `antoineVapourPressureBar(input)`, `antoineTemperatureK(input)`, `binaryPressureWindow(pairId)`, `idealBubblePressureBar(input)`, `idealDewPressureBar(input)`, `idealBubbleTemperatureK(input)`, `idealDewTemperatureK(input)`, `analyzeBinaryVle(input)`, `createPxyDiagram(input)`, `createTxyDiagram(input)`, `createDefaultBinaryVleState(input)`, `evaluateBinaryVlePrediction(input)`, and `nextBinaryVleHint(input)`.

- [ ] **Step 1: Implement exact ranged Antoine evaluation and inversion**

`antoineVapourPressureBar({componentId,temperatureK})` rejects temperatures outside the selected record. `antoineTemperatureK({componentId,pressureBar})` analytically inverts the correlation and rejects an implied T outside the record. Return frozen evidence containing equation, coefficient record, source ID, and range.

- [ ] **Step 2: Derive the pair pressure window**

For shared `[Tmin,Tmax]`, calculate the pressure interval in which both pure saturation temperatures remain in range:

```js
minimum = max(p1*(Tmin), p2*(Tmin))
maximum = min(p1*(Tmax), p2*(Tmax))
```

Assert a nonempty window and component-1 volatility at Tmin, midpoint, and Tmax.

- [ ] **Step 3: Implement P-x-y bubble and dew equations**

Validate amount fractions in `[0,1]`. Return pure pressures, component partial pressures, total pressure, and closure evidence. At x1/y1 endpoints, both bubble and dew curves must reproduce the corresponding pure-component saturation pressure.

- [ ] **Step 4: Implement T-x-y bisection**

Solve the bubble and dew equations over the pair's shared temperature window using at most 100 iterations and absolute temperature tolerance `1e-9 K`. Reject pressures outside `binaryPressureWindow(pairId)`. Return root temperature, residual, iterations, and range.

- [ ] **Step 5: Implement five-region flash classification**

For `(pairId,T,p,z1)`, calculate `pBubble(z1)` and `pDew(z1)` and classify:

```text
p > pBubble  -> liquid
p = pBubble  -> bubble-point
pDew < p < pBubble -> two-phase
p = pDew     -> dew-point
p < pDew     -> vapour
```

Use `1e-8 * max(1,p,pBubble,pDew)` as equality tolerance.

- [ ] **Step 6: Derive equilibrium compositions and phase amounts**

Inside the two-phase interval and at its boundaries:

```js
x1 = (p - p2Star) / (p1Star - p2Star)
y1 = x1 * p1Star / p
V  = (z1 - x1) / (y1 - x1)
L  = 1 - V
```

Clamp only sub-`1e-12` floating residue at 0 or 1. Report `p1 = x1 p1* = y1 p`, `p2 = (1-x1)p2* = (1-y1)p`, `p1+p2=p`, `L+V=1`, and `Lx1+Vy1=z1` closures. One-phase states report the overall composition in the present phase and null absent-phase composition.

- [ ] **Step 7: Generate both diagrams**

`createPxyDiagram({pairId,temperatureK,pointCount:101})` returns bubble points indexed by x1 and dew points indexed by y1. `createTxyDiagram({pairId,pressureBar,pointCount:81})` returns bubble points indexed by x1 and dew points indexed by y1. Both arrays include exact 0 and 1 endpoints and explicit model/range boundaries.

- [ ] **Step 8: Create default states**

For `mode:'pxy'`, calculate the pair's default z1 bubble/dew midpoint pressure. For `mode:'txy'`, calculate the default z1 bubble/dew midpoint temperature at the declared default pressure. Return frozen state; do not hard-code derived boundary values in UI code.

- [ ] **Step 9: Evaluate predictions without mutation**

Accept `{region,enrichment,vapourFraction}`. `enrichment` is `vapour-richer-in-component-1` for two-phase/boundary states and `not-comparable` for one-phase states. Score all three independently; use absolute tolerance `0.02` for vapour fraction. Preserve every learner value exactly.

- [ ] **Step 10: Implement four non-mutating hints**

Hint levels reveal pure-pressure ordering, z1 bubble/dew boundaries, state-versus-boundary comparison, and equilibrium/lever-rule evidence. No hint changes T, p, z1, mode, pair, or predictions.

- [ ] **Step 11: Complete deterministic coverage**

For every component assert range endpoints and inversion closure. For every pair assert pressure window, component-1 volatility across the range, pure endpoints, P-x-y and T-x-y monotonicity, diagram sizes, and bubble/dew root residuals.

At each default z1 assert liquid above bubble, exact bubble boundary, two-phase midpoint, exact dew boundary, and vapour below dew. In two-phase states assert `x1 < z1 < y1`, `0 < V < 1`, partial-pressure closure, total-amount closure, and component balance. At boundaries assert V=0 and V=1. Verify one-phase absent composition, invalid-range rejection, independent wrong predictions, default states, and four hints.

Run: `npm run verify:binary-vle`

Expected: exit 0.

### Task 3: Graphical mixture-equilibrium workbench

**Files:**
- Create: `src/components/BinaryVleLab.jsx`
- Create: `src/styles/binary-vle.css`

**Interfaces:**
- Consumes Tasks 1 and 2.
- Produces section anchor `#binaryVleLab`.

- [ ] **Step 1: Build two persistent learner modes**

Render `Pressure sweep · P-x-y` and `Temperature sweep · T-x-y` as persistent semantic tabs. Each mode owns pair, T, p, z1, predictions, check, hints, and references. Switching modes preserves the other mode's state; changing pair resets only the active mode to that pair's computed default.

- [ ] **Step 2: Build the pair cartridges and state controls**

Show the two named pair cards, formulas, pure-component colours, shared Antoine range, and ideality/hazard boundary. Provide synchronized range and numeric controls for T, p, and z1. Restrict P in T-x-y mode to `binaryPressureWindow`; keep P-x-y pressure broad enough to display all five regions at the current T.

- [ ] **Step 3: Build the P-x-y/T-x-y phase map**

Render bubble and dew curves, liquid/two-phase/vapour regions, endpoint labels, current z1 line, current p/T line, and a feed marker. Seal the equilibrium tie line and x/y endpoint markers until a prediction is checked. Use axis copy that names amount fraction rather than generic composition.

- [ ] **Step 4: Build the split glass vessel signature**

Before checking, show one opaque feed band at z1 and shuttered phase ports. After checking, show liquid and vapour chambers, deterministic amber/violet particle mixes, L/V fill levels, x1/y1 composition labels, and a luminous tie line connected to the phase-map endpoints. One-phase states fill only the present chamber. Arrows depict equilibrium bookkeeping, never evaporation/condensation rate.

- [ ] **Step 5: Build prediction and reference controls**

Require a region choice, enrichment choice, and raw vapour-fraction prediction. Provide explicit `Set bubble boundary`, `Set two-phase midpoint`, and `Set dew boundary` actions that change only p in P-x-y mode or T in T-x-y mode and preserve predictions. Report region, enrichment, and phase amount separately; checks never alter state or predictions.

- [ ] **Step 6: Build ledger, trace, teacher lens, and passport**

After check, expose `p1=x1p1*=y1p`, `p2`, pressure sum, `L+V`, and component-balance ledgers. Trace mode/pair/state changes, predictions, checks, hints, and explicit reference actions. Teacher prompts compare P-x-y with T-x-y, pure endpoints, boundary phase amounts, and the unity-activity assumption.

- [ ] **Step 7: Apply the glass-manifold visual system**

```css
--vle-glass:#e8fbff;
--vle-manifold:#0b3151;
--vle-volatile:#ffb33f;
--vle-heavy:#695dd8;
--vle-tie:#1ac6b4;
--vle-boundary:#ec5b61;
```

Use `Avenir Next Condensed` for instrument titles, system sans for teaching copy, and `SFMono-Regular` for equations/data. The split glass vessel and connected tie-line laser are the single signature; other panels use restrained blue technical grids. At 760 px and below, stack the map/vessel/console, preserve 44 px controls, keep pair rails internally scrollable, prevent body overflow, and show explicit swipe cues. Respect visible focus and reduced motion.

### Task 4: Platform and curriculum integration

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/Header.jsx`
- Modify: module numbering from `src/components/SpectroscopyLab.jsx` through `src/components/EquationSections.jsx`
- Modify: `src/data/curriculum.js`
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`

**Interfaces:**
- Consumes `#binaryVleLab`.
- Preserves every existing anchor.

- [ ] **Step 1: Lazy-load after the gas-phase laboratory**

```jsx
const BinaryVleLab = lazy(() => import('./components/BinaryVleLab.jsx'));

<Suspense fallback={<LabFallback id="binaryVleLab" label="Binary mixture equilibrium navigator"/>}>
  <BinaryVleLab />
</Suspense>
```

- [ ] **Step 2: Make the lab discoverable**

Add `Binary mixture VLE` to desktop and mobile More menus immediately after `Gas & phase laboratory`, with summary `Trace bubble, dew, tie-line, and phase amounts`.

- [ ] **Step 3: Renumber later modules**

Binary VLE becomes 10, analytical measurement 11, biomolecular assembly 12, enzyme kinetics 13, mechanism 14, stereochemistry 15, coordination 16, crystal 17, reaction 18, and equation balancing 19. Preserve 01 through 09.

- [ ] **Step 4: Add only truthful curriculum claims**

Mark ideal binary Raoult VLE, P-x-y/T-x-y boundaries, equilibrium compositions, and lever-rule amounts live in General and Physical Chemistry. In Analytical Chemistry, mark it only as a conceptual separation prerequisite, not a chromatography/distillation model. Keep activities, azeotropes, multicomponent/solid equilibrium, reference properties, energy balances, and process design outside scope.

- [ ] **Step 5: Document extension seams and review journeys**

README must list both pairs, data/engine/component/CSS paths, verifier, equations, NIST ranges, hazard boundary, and exclusions. CONTRIBUTING must require all five phase regions in both modes, pure endpoints, bubble/dew boundary phase amounts, two-phase mass closure, preserved wrong predictions, explicit references, range rejection, responsive views, teacher lens, sources, and passport.

### Task 5: Completion evidence for this milestone

**Files:**
- No new files.

**Interfaces:**
- Verifies Tasks 1–4 and all prior chemistry modules.

- [ ] **Step 1: Run every deterministic verifier**

Run every `npm run verify:*` command, including `verify:binary-vle`.

- [ ] **Step 2: Build production assets**

Run: `npm run build`

Expected: exit 0 with separate lazy `BinaryVleLab` JavaScript and CSS chunks.

- [ ] **Step 3: Audit as a learner**

Verify manually in the live browser:

- both modes start at their computed two-phase midpoint with no predictions or revealed phase amounts;
- wrong region, enrichment, and vapour-fraction predictions remain selected through checking;
- correcting only one prediction resolves only that dimension;
- bubble reference gives V=0, two-phase midpoint gives `x1<z1<y1` and `0<V<1`, and dew reference gives V=1;
- above/below the P-x-y envelope produce liquid/vapour and below/above the T-x-y envelope produce liquid/vapour;
- P-x-y and T-x-y represent the same equilibrium equations with different controlled variables;
- each named pair resets only the active mode and respects its NIST overlap;
- hints and checks never change T, p, z1, pair, mode, or predictions;
- the tie line and vessel remain sealed until check.

- [ ] **Step 4: Audit as a teacher**

Verify both pairs, both diagrams, pure endpoints, all five phase classifications, Raoult/partial-pressure ledger, L/V and component-balance closure, four teacher comparisons, every source, every included/excluded passport claim, unity-activity boundary, NIST range provenance, and virtual-hazard warning.

- [ ] **Step 5: Audit responsive and runtime behavior**

At 390, 742, and 1280 px widths verify hash alignment, no body overflow, no clipped map/vessel/console, 44 px mobile controls, visible focus, reduced motion, pair swipe cue, More-menu navigation, persistent tab state, and no runtime errors. Restore the normal viewport and leave P-x-y benzene/toluene at its computed midpoint with empty predictions and sealed evidence.
