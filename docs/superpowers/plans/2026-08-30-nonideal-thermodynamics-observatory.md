# Nonideal Thermodynamics Observatory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a graphical, learner-controlled observatory that makes liquid activity, azeotropy, liquid-mixture stability, and low-density gas fugacity manipulable while refusing claims outside three declared teaching models.

**Architecture:** Freeze synthetic scenario cartridges and their model boundaries in one data module. Keep all Margules, regular-solution, virial, prediction-evaluation, and hint logic in one pure immutable engine. Lazy-load one React lab with three persistent instruments—activity membrane, stability terrain, and fugacity cell—and isolate its visual system in one CSS file. Every calculation runs locally; the app uses primary IUPAC/NIST sources for definitions and equations but does not query a property service or claim a fit to a real mixture.

**Tech Stack:** React 19, Vite 8, immutable ES modules, SVG, CSS, Node deterministic verifier.

## Global Constraints

- Preserve learner ownership: mode, cartridge, model parameters, composition, temperature, pressure, virial coefficient, predictions, solve/release action, checks, hints, history, and reset are explicit learner actions.
- Parameter edits must make a released result visibly stale; never recalculate or overwrite the released snapshot automatically.
- Preserve wrong but valid predictions. Feedback explains the governing equation or scope boundary without changing the learner answer.
- Use synthetic `Volatile A / Volatile B` activity cartridges only. Do not label any Margules parameters as a fit to a named substance or measured binary dataset.
- Use the three-suffix asymmetric Margules equation only for a low-pressure, ideal-vapour, binary liquid teaching model.
- Use the symmetric regular-solution equation only for dimensionless liquid mixing stability. Do not infer temperature, time, nucleation, morphology, or a real material phase diagram.
- Use a pure-gas second-density-virial truncation only when `|B P / (R T)| <= 0.12`. Outside that declared teaching gate, return a reason and no `Z`, `phi`, or fugacity result.
- Never present activity coefficient as activity or concentration; azeotropy as liquid–liquid coexistence; spinodal as binodal; local stability as equilibrium phase fraction; fugacity coefficient as compression factor; or a truncation as a reference property.
- Keep every control at least 44 CSS px high, preserve visible keyboard focus, respect reduced motion, and avoid document-level horizontal overflow at 390, 768, and 1440 CSS px.
- Use `apply_patch` for source edits. Do not perform Git actions.
- Run validation because the standing user goal explicitly requires student/teacher use and verification.

---

## Scientific Contract

### Activity and azeotropy

For `x2 = 1 - x1` and dimensionless Margules parameters `A12` and `A21`:

```text
gE / RT = x1 x2 (A21 x1 + A12 x2)
ln gamma1 = x2^2 [A12 + 2(A21 - A12)x1]
ln gamma2 = x1^2 [A21 + 2(A12 - A21)x2]
p1 = x1 gamma1 p1*
p2 = x2 gamma2 p2*
P = p1 + p2
y1 = p1 / P
```

An interior azeotrope is a numerical root of `y1 - x1 = 0` with pure endpoints excluded. Its pressure-extremum label comes from neighbouring calculated `P(x1)` values, not from a memorized positive/negative-deviation slogan.

### Liquid-mixture stability

For symmetric regular-solution interaction parameter `chi`:

```text
Delta gmix / RT = x ln(x) + (1-x) ln(1-x) + chi x(1-x)
d2(Delta gmix/RT)/dx2 = 1/x + 1/(1-x) - 2 chi
```

- Critical point: `chi = 2`, `x = 0.5`.
- Spinodal roots for `chi > 2`: `(1 ± sqrt(1 - 2/chi))/2`.
- Symmetric binodal endpoint solves `ln[x/(1-x)] + chi(1-2x) = 0`; the other endpoint is `1-x`.
- Inside the binodal gap, equilibrium phase amounts use the lever rule between the two binodal compositions.
- A composition between binodal and spinodal is locally metastable yet has a two-phase equilibrium state; this contrast is a required teaching case.

### Low-density pure-gas fugacity

Use `R = 0.08314462618 L bar mol^-1 K^-1`, convert `B` from `cm3 mol^-1` to `L mol^-1`, and define:

```text
P = rho R T (1 + B rho)
rho = 2[P/(RT)] / [1 + sqrt(1 + 4 B P/(RT))]  // low-density root
Z = 1 + B rho
ln phi = 2 B rho - ln Z
f = phi P
```

The gate uses `beta = B P / (R T)`. `B = 0` must return `Z = phi = 1` and `f = P` exactly. A failed gate returns the evaluated `beta`, a plain-language limit reason, and no pseudo-property values.

---

## Subject and Visual Contract

**Subject:** An undergraduate student or teacher bending an ideal thermodynamic surface until nonideal pressure, stability, or effective pressure becomes visible.

**Single job:** Predict a nonideal consequence, release one bounded calculation, and explain both the result and the model’s refusal boundary.

**Palette:**

- obsidian ink `#182027`
- mineral ceramic `#e8e6df`
- activity ultramarine `#315bce`
- interaction coral `#ef6b57`
- phase chartreuse `#b8d84a`
- vapour violet `#8f65d6`
- glass cyan `#69cfd1`

**Type roles:** Existing Avenir Next Condensed/Arial Narrow stack for the thesis and instrument labels, application body stack for teaching copy, and SFMono-Regular/Menlo for composition axes, equations, pressure registers, and source/model tapes.

**Layout:**

```text
┌──────────── thesis: real interactions bend the map ───────────────┐
│ pure endpoint pin A ─── flexible Gibbs membrane ─── endpoint B    │
└───────────────────────────────────────────────────────────────────┘
┌──── instrument switch: ACTIVITY | STABILITY | FUGACITY ──────────┐
└───────────────────────────────────────────────────────────────────┘
┌──── cartridge + controls ───────┬──── main graphical instrument ─┐
│ prediction rack                 │ P-x-y / Gibbs terrain / piston  │
│ explicit release button        │ learner cursor + reference line │
├─────────────────────────────────┼─────────────────────────────────┤
│ released result + claim audit  │ equation ledger + scope gate    │
└─────────────────────────────────┴─────────────────────────────────┘
┌──────── teacher contrasts ─────┬──────── learner action tape ─────┐
└────────────────────────────────┴───────────────────────────────────┘
┌────────────────── model + source passport ────────────────────────┐
└───────────────────────────────────────────────────────────────────┘
```

**Signature:** A flexible Gibbs-surface table is pinned at pure-component endpoints. `A12/A21` bend the activity membrane; `chi` lowers a common-tangent laser onto two wells; and `B` pushes a glass fugacity piston away from the ideal-pressure witness line.

**Design critique:** The instrument should feel like a mineral drafting table, not another dark neon dashboard. Ceramic working surfaces carry the plots; dark metal frames contain equations and scope; saturated colour is reserved for thermodynamic departures, phase regions, and released evidence. The common-tangent beam is the one dramatic motif.

---

### Task 1: Freeze synthetic cartridges, primary sources, and model passport

**Files:**

- Create: `src/data/nonidealThermodynamicsScenarios.js`
- Modify: `src/data/scienceSources.js`

**Interfaces:**

- Produces `ACTIVITY_SCENARIOS`, `ACTIVITY_SCENARIO_BY_ID`, `STABILITY_SCENARIOS`, `STABILITY_SCENARIO_BY_ID`, `FUGACITY_SCENARIOS`, `FUGACITY_SCENARIO_BY_ID`, `NONIDEAL_THERMODYNAMICS_CONSTANTS`, and `NONIDEAL_THERMODYNAMICS_BOUNDARY`.
- Adds `MODEL_PASSPORTS.nonidealThermodynamicsObservatory` plus direct IUPAC/NIST source records.

- [ ] **Step 1: Declare five recursively frozen activity cartridges**

Use this exact synthetic set:

| id | label | A12 | A21 | p1* / bar | p2* / bar | default x1 | intended contrast |
|---|---|---:|---:|---:|---:|---:|---|
| `ideal-reference` | Flat ideal reference | 0 | 0 | 1.6 | 0.8 | 0.50 | zero excess Gibbs energy; no interior azeotrope |
| `mild-positive` | Mild positive departure | 0.4 | 0.4 | 1.6 | 0.8 | 0.50 | positive pressure departure without an interior azeotrope |
| `positive-azeotrope` | Positive one-crossing field | 1.8 | 1.8 | 1.6 | 0.8 | 0.50 | one maximum-pressure azeotrope |
| `negative-azeotrope` | Negative one-crossing field | -1.8 | -1.8 | 1.6 | 0.8 | 0.50 | one minimum-pressure azeotrope |
| `asymmetric-double` | Asymmetric double crossing | 2.2 | 0.5 | 1.5 | 0.7 | 0.76 | two interior azeotropes in a deliberately synthetic model |

Every cartridge must say `dataKind: 'synthetic-teaching-parameters'` and carry a warning that Margules parameters for real mixtures require experimental fitting and temperature/pressure context.

- [ ] **Step 2: Declare six stability and five fugacity cartridges**

Stability cartridges:

```js
[
  { id: 'ideal-mixing', chi: 0, overallX1: 0.50 },
  { id: 'stable-single-well', chi: 1.2, overallX1: 0.50 },
  { id: 'critical-contact', chi: 2, overallX1: 0.50 },
  { id: 'metastable-inside-gap', chi: 2.4, overallX1: 0.20 },
  { id: 'unstable-centre', chi: 3, overallX1: 0.50 },
  { id: 'stable-outside-gap', chi: 3, overallX1: 0.03 },
]
```

Fugacity cartridges:

```js
[
  { id: 'ideal-virial', temperatureK: 350, pressureBar: 5, secondVirialCm3Mol: 0 },
  { id: 'attractive-departure', temperatureK: 320, pressureBar: 5, secondVirialCm3Mol: -120 },
  { id: 'repulsive-departure', temperatureK: 450, pressureBar: 10, secondVirialCm3Mol: 90 },
  { id: 'near-gate-edge', temperatureK: 300, pressureBar: 15, secondVirialCm3Mol: -180 },
  { id: 'outside-declared-gate', temperatureK: 250, pressureBar: 15, secondVirialCm3Mol: -300 },
]
```

Every stability record is a dimensionless symmetric-model scenario, and every fugacity record uses a learner-supplied teaching `B`, not a certified substance property.

- [ ] **Step 3: Add primary source records**

Add these keys and direct URLs:

- `iupacActivityCoefficient` → `https://goldbook.iupac.org/terms/view/A00116`
- existing `iupacThermodynamicActivity`
- `iupacChemicalPotential` → `https://goldbook.iupac.org/terms/view/C01032`
- `iupacAzeotropicPoint` → `https://goldbook.iupac.org/terms/view/15315`
- `iupacSpinodal` → `https://goldbook.iupac.org/terms/view/ST07274`
- `iupacBinodal` → `https://goldbook.iupac.org/terms/view/12240`
- `iupacSpinodalDecomposition` → `https://goldbook.iupac.org/terms/view/S05869`
- existing `iupacFugacity`
- `iupacFugacityCoefficient` → `https://goldbook.iupac.org/terms/view/F02544`
- `iupacVirialCoefficients` → `https://goldbook.iupac.org/terms/view/V06625`
- `nistMargulesActivityModel` → `https://trc.nist.gov/TDE/TDE_Help/Margules-AC-Model.htm`
- `nistActivityCoefficientModels` → `https://trc.nist.gov/TDE/TDE_Help/ActivityCoefficientModels.htm`
- `nistPhaseEquilibriaTn1061` → `https://nvlpubs.nist.gov/nistpubs/Legacy/TN/nbstechnicalnote1061.pdf`
- `nistRegularSolutionModeling` → `https://www.metallurgy.nist.gov/phase/papers/jom/thermo_model.html`
- `iupacSpinodalRecommendation` → `https://publications.iupac.org/publications/pac/2004/pdf/7611x1985.pdf`
- `nistVirialFugacityIr6654` → `https://nvlpubs.nist.gov/nistpubs/Legacy/IR/nistir6654.pdf`

Source roles must distinguish terminology, model form, and model-limit evidence. Do not imply that any source supplied the synthetic parameter values.

- [ ] **Step 4: Add the model passport**

Use result kind:

```text
Synthetic nonideal thermodynamic teaching surfaces — not measured phase equilibrium or reference-fluid properties
```

Passport conditions must name each of the three models independently. Exclusions must cover measured mixture fitting, named-mixture prediction, multicomponent/solid/reactive equilibrium, high-pressure EOS, caloric/transport properties, kinetics, nucleation, morphology, apparatus, process design, and safety procedure.

---

### Task 2: Implement the pure engine with a red-green verifier

**Files:**

- Create: `src/chemistry/nonidealThermodynamics.js`
- Create: `scripts/verify-nonideal-thermodynamics.mjs`
- Modify: `package.json`

**Interfaces:**

- Produces `analyzeMargulesActivity`, `evaluateActivityPrediction`, `nextActivityHint`, `analyzeRegularSolution`, `evaluateStabilityPrediction`, `nextStabilityHint`, `analyzeVirialFugacity`, `evaluateFugacityPrediction`, and `nextFugacityHint`.
- Every public return value is recursively frozen. Every numerical input is finite and range-checked. Evaluation functions preserve the supplied prediction object.

- [ ] **Step 1: Write the verifier first and prove the red state**

Add `"verify:nonideal-thermodynamics": "node scripts/verify-nonideal-thermodynamics.mjs"` and import the not-yet-created engine. Run:

```bash
npm run verify:nonideal-thermodynamics
```

Expected red state:

```text
ERR_MODULE_NOT_FOUND: Cannot find module .../src/chemistry/nonidealThermodynamics.js
```

- [ ] **Step 2: Verify cartridge and source invariants**

Assert exact counts `5 activity / 6 stability / 5 fugacity`, unique IDs, recursive freezing, explicit synthetic provenance, the `0.12` gate, and all passport source keys.

- [ ] **Step 3: Implement and verify Margules analysis**

`analyzeMargulesActivity` accepts `{ A12, A21, p1StarBar, p2StarBar, x1, pointCount = 301 }` and returns:

```js
{
  input, point, idealReference, pressureDeparture, curve,
  azeotropes, azeotropeCount, enrichment, equations, boundary
}
```

Requirements:

- `point` includes `x1`, `x2`, `lnGamma1`, `lnGamma2`, `gamma1`, `gamma2`, `gExcessRT`, `p1Bar`, `p2Bar`, `pressureBar`, and `y1`.
- `curve` contains endpoint-safe `x1`, `y1`, pressure, ideal pressure, gamma, and excess-Gibbs values.
- Locate every interior `y1-x1` sign change with bisection; de-duplicate roots within `1e-6`; exclude endpoints.
- Classify each root `maximum-pressure`, `minimum-pressure`, or `flat/indeterminate` from local calculated pressure.
- Verify approximate roots `0.692541` for the positive case, `0.307459` for the negative case, and two roots near `0.701751` and `0.827661` for the asymmetric case.
- Verify positive, negative, and zero excess/pressure departures and the Gibbs–Duhem-consistent activity-coefficient formulas.
- Four predictions: pressure-departure direction, interior azeotrope count, vapour enrichment at the selected composition, and model scope.
- Evaluation scores `0/4` and `4/4` examples; four hint levels expose observation → equation → root condition → scope without mutating predictions.

- [ ] **Step 4: Implement and verify regular-solution analysis**

`analyzeRegularSolution` accepts `{ chi, overallX1, pointCount = 301 }` and returns:

```js
{
  input, curve, curvature, localState, critical,
  spinodal, binodal, equilibrium, commonTangent, equations, boundary
}
```

Requirements:

- Endpoint mixing Gibbs energy is exactly zero; logarithms are evaluated only on interior points.
- At `chi < 2`, report no miscibility gap and one equilibrium liquid phase.
- At `chi = 2, x = 0.5`, report critical zero curvature.
- At `chi > 2`, return analytical spinodal roots and solve the lower binodal root by bisection.
- Verify binodal/spinodal values: for `chi=2.4`, binodal `0.170715 / 0.829285`, spinodal `0.295876 / 0.704124`; for `chi=3`, binodal `0.070720 / 0.929280`, spinodal `0.211325 / 0.788675`.
- At `chi=2.4, z1=0.20`, report a metastable homogeneous point but two equilibrium phases and close the lever-rule composition balance.
- `commonTangent` contains the two touch points and line values used by the SVG beam.
- Four predictions: curvature sign, local homogeneous state, equilibrium phase count, and no-rate scope.
- Verify full/zero scoring, non-mutating hints, invalid inputs, and recursive immutability.

- [ ] **Step 5: Implement and verify gated virial fugacity**

`analyzeVirialFugacity` accepts `{ temperatureK, pressureBar, secondVirialCm3Mol, gate = 0.12 }`.

- Always return `beta`, `gate`, `gateStatus`, and a plain-language `gateReason`.
- Inside the gate return `densityMolL`, `compressionFactor`, `lnFugacityCoefficient`, `fugacityCoefficient`, and `fugacityBar`.
- Outside the gate return those property fields as `null` and do not silently clamp pressure or `B`.
- Verify exact ideal output and approximate examples:

```text
T=320 K, P=5 bar, B=-120 cm3/mol: Z=0.976916, phi=0.977445, f=4.8872 bar
T=450 K, P=10 bar, B=90 cm3/mol: Z=1.023502, phi=1.024059, f=10.2406 bar
T=300 K, P=15 bar, B=-180 cm3/mol: Z=0.876503, phi=0.891207, f=13.3681 bar
T=250 K, P=15 bar, B=-300 cm3/mol: gate refusal
```

- Four predictions: inside/outside gate, `Z` departure, `phi` departure, and fugacity-versus-pressure; outside-gate evaluation treats departure choices as `not-released` rather than inventing answers.
- Verify full/zero scoring, four non-mutating hints, invalid discriminants, and recursive immutability.

- [ ] **Step 6: Prove the focused green state**

Run:

```bash
npm run verify:nonideal-thermodynamics
```

Expected summary:

```text
Five activity, six stability, and five fugacity cartridges plus primary-source boundaries verified.
Margules activity fields, 0/1/2 azeotrope roots, pressure departures, predictions, and hints verified.
Regular-solution curvature/binodal/spinodal/lever closure and gated virial fugacity departures verified.
```

---

### Task 3: Build the three-instrument React observatory

**Files:**

- Create: `src/components/NonidealThermodynamicsLab.jsx`
- Create: `src/styles/nonideal-thermodynamics.css`

**Component contract:**

- One parent owns `mode`, per-mode editable draft, per-mode released snapshot, prediction racks, hint level, and a shared 12-entry learner action history.
- Changing modes preserves each instrument’s work.
- Choosing a cartridge loads editable controls and predictions but does not release an analysis.
- `Solve activity field`, `Lower common-tangent beam`, and `Pressurize virial cell` are the only result-release actions.
- Any edit after release shows `Draft changed — released result is stale` while leaving the prior snapshot visible and labelled.

- [ ] **Step 1: Build the thesis header and accessible mode switch**

Create `<section id="nonidealThermodynamicsLab" aria-labelledby="nonidealThermodynamicsLabTitle">` with section code `16 / Nonideal thermodynamic surfaces` and thesis:

```text
Ideal mixtures draw straight lines. Real interactions bend the map.
```

The header contains the pinned membrane sculpture and three concise scope chips: `synthetic liquid`, `symmetric stability`, `low-density pure gas`.

Use real tab semantics (`role=tablist`, `role=tab`, `aria-selected`) and ensure hidden panels are not keyboard-focusable.

- [ ] **Step 2: Build the activity membrane instrument**

Controls:

- cartridge selector;
- `x1` range plus exact numeric input;
- `A12`, `A21`, `p1*`, and `p2*` numeric/range controls within declared teaching bounds;
- four persistent prediction groups;
- explicit solve, check, hint, and reset actions.

Graphic:

- SVG `P-x-y` pressure curve and ideal pressure witness line;
- `y1=x1` diagonal in a linked composition inset;
- selected `x1/y1` tie marker;
- azeotrope root pins labelled maximum/minimum;
- two cylindrical gamma drums and an excess-Gibbs membrane whose bend follows the released snapshot.

Result ledger exposes `gamma1`, `gamma2`, `gE/RT`, partial pressures, total pressure, ideal-reference pressure, `y1`, and root count. It must state `activity ai = gammai xi`; gamma alone is not activity.

- [ ] **Step 3: Build the stability terrain instrument**

Controls:

- cartridge selector;
- `chi` and overall `z1` range plus exact numeric inputs;
- four persistent predictions;
- explicit tangent release, check, hint, and reset actions.

Graphic:

- SVG `Delta gmix/RT` curve with selected composition probe;
- binodal points, spinodal points, stable/metastable/unstable colour regions;
- one chartreuse common-tangent laser touching the released binodal endpoints;
- a symbolic split vessel showing equilibrium phase amounts and compositions, not morphology or time evolution.

The main contrast card must put these side by side:

```text
local homogeneous state: metastable
equilibrium state: two liquid phases
```

for the `chi=2.4, z1=0.20` cartridge.

- [ ] **Step 4: Build the fugacity cell**

Controls:

- cartridge selector;
- exact/range inputs for `T`, `P`, and `B`;
- four persistent predictions;
- explicit pressurize, check, hint, and reset actions.

Graphic:

- a glass piston whose released displacement encodes `Z-1`;
- aligned ideal-pressure and fugacity gauges;
- `beta` gate rail with the declared `±0.12` limits;
- separate `Z` and `phi` registers so the two cannot visually collapse into one quantity.

Outside the gate, replace all result gauges with one strong refusal panel explaining that the chosen dimensionless departure is outside this truncation’s teaching range. Do not calculate or dimly reveal hidden property values.

- [ ] **Step 5: Add teacher contrasts, action history, and passport**

Teacher cards must load, without auto-running, these contrasts:

1. `gamma is not activity or concentration`;
2. `azeotrope is not liquid-liquid coexistence`;
3. `binodal is not spinodal`;
4. `local instability is not an equilibrium phase amount`;
5. `phi is not Z`;
6. `a virial truncation is not a reference property`.

The history records explicit learner actions only. The passport lists separate included/excluded scopes and opens each primary source in a normal link.

- [ ] **Step 6: Apply responsive and motion-safe styling**

- Wide screens: two-column instrument with a large graphic and a compact control/prediction rail.
- Tablet: stacked controls above graphic, two-column ledgers.
- 390 px: single column, chart contained in its own scroll/scale region, no clipped labels or document overflow.
- Use `:focus-visible`, `@media (prefers-reduced-motion: reduce)`, and `min-width: 0` on every grid child.
- Restrict animation to release transitions, tangent-beam settling, and piston movement; stale snapshots stop moving.

---

### Task 4: Integrate navigation, curriculum truth, section order, and documentation

**Files:**

- Modify: `src/App.jsx`
- Modify: `src/components/Header.jsx`
- Modify: `src/data/curriculum.js`
- Modify: `README.md`
- Modify section codes in the fifteen components after Binary VLE.

- [ ] **Step 1: Lazy-load and navigate to the new lab**

Insert `NonidealThermodynamicsLab` immediately after `BinaryVleLab` in `App.jsx`, with fallback ID `nonidealThermodynamicsLab`. Add desktop and mobile More-lab links labelled `Nonideal thermodynamics` and subcopy `Bend activity, stability, and fugacity surfaces`.

- [ ] **Step 2: Renumber downstream section codes**

Keep Binary VLE at `15`, add this lab as `16`, and increment every following section exactly once:

| Component | new section |
|---|---:|
| `SpectroscopyLab.jsx` | 17 |
| `InfraredEvidenceLab.jsx` | 18 |
| `OrthogonalEvidenceLab.jsx` | 19 |
| `MeasurementEvidenceLab.jsx` | 20 |
| `ChromatographyLab.jsx` | 21 |
| `FunctionalGroupLab.jsx` | 22 |
| `BiomolecularStudio.jsx` | 23 |
| `EnzymeKineticsLab.jsx` | 24 |
| `MechanismLab.jsx` | 25 |
| `StereochemistryLab.jsx` | 26 |
| `CoordinationFieldLab.jsx` | 27 |
| `CrystalLatticeLab.jsx` | 28 |
| `PolymerPopulationLab.jsx` | 29 |
| `ReactionLab.jsx` | 30 |
| `EquationSections.jsx` | 31 |

- [ ] **Step 3: Update General, Physical, and Materials curriculum truth**

General Chemistry:

- add an outcome comparing ideal and activity-corrected liquid pressure, locating azeotropes, and separating local stability from equilibrium phase amounts;
- replace the broad nonideal `next-engine` row with a `live` bounded nonideal-foundations row;
- add a narrower `next-engine` row for measured multicomponent, solid, reactive, and reference-property equilibrium;
- link the observatory in `liveLabs` and update the model boundary.

Physical Chemistry:

- add the same lab with deeper emphasis on `gE`, curvature, binodal/spinodal, `Z`, `phi`, and `f`;
- replace the broad advanced-nonideal gap with a live bounded-foundations row plus a narrower remaining gap;
- update the model boundary without suggesting measured-fluid accuracy.

Materials Chemistry:

- add one live `Regular-solution phase-stability prerequisite` topic and lab link;
- state explicitly that the symmetric terrain is not a real alloy/polymer phase diagram, CALPHAD assessment, or morphology prediction;
- keep batteries/corrosion, bulk polymer properties, and computed material properties as next-engine gaps.

Expected curriculum total after these edits: `98 live topic clusters`.

- [ ] **Step 4: Update README capability, verification, architecture, and boundaries**

- Change the top-level deterministic verifier count from 28 to 29.
- Add the three instruments and explicit release/stale-state behavior to the capability list.
- Add the focused verifier command and expected scope.
- Add the component, style, data, engine, and verifier files to the architecture map.
- Add a dedicated boundary paragraph that names the synthetic Margules parameters, symmetric regular solution, low-density gate, and excluded real-property claims.
- Update section-count language to 31 sections and curriculum count to 98 only after the corresponding verifier confirms them.

---

### Task 5: Exercise the UI as learner and teacher, then validate the whole project

**Files:** None unless a directly observed defect requires a scoped fix.

- [ ] **Step 1: Run focused verification after integration**

```bash
npm run verify:nonideal-thermodynamics
```

- [ ] **Step 2: Exercise learner-owned activity flows in the in-app browser**

At `http://127.0.0.1:5174/#nonidealThermodynamicsLab`:

1. Load `positive-azeotrope`; make four wrong predictions; solve; verify wrong answers remain; check and read reasons.
2. Correct the predictions; check for `4/4`.
3. Load `asymmetric-double`; solve and verify two labelled interior roots.
4. Edit `A12` after release; verify the old snapshot remains visible and clearly stale until another explicit solve.

- [ ] **Step 3: Exercise stability and fugacity distinctions**

1. Load `metastable-inside-gap`; predict local metastability and two equilibrium phases; lower the beam; verify both claims and lever closure.
2. Load `unstable-centre` and `stable-outside-gap`; verify region and vessel changes occur only after release.
3. Load attractive and repulsive fugacity cartridges; verify `Z` and `phi` remain distinct registers and correct directions score.
4. Load the outside-gate cartridge; pressurize; verify the refusal reason appears and no `Z`, `phi`, or `f` value is exposed.
5. Edit pressure after a successful run; verify stale state.

- [ ] **Step 4: Exercise teacher, keyboard, mobile, and console flows**

- Load each teacher contrast and confirm it changes drafts only, never auto-runs an instrument.
- Navigate tabs and major controls by keyboard; confirm visible focus.
- Set viewport to 390 px; inspect all three modes and confirm no document-level horizontal overflow.
- Inspect console after all flows; no React, SVG, accessibility-state, or runtime errors are acceptable.

If unexpected browser behaviour occurs, stop and apply the systematic-debugging skill before changing code.

- [ ] **Step 5: Run the full deterministic suite**

Run every declared verifier directly from `package.json`. Expected result: all `29/29` pass. Then run the curriculum count/section-order checks and confirm exactly `98` live clusters and section codes `01–31` with no duplicate or skipped code.

- [ ] **Step 6: Run the production build**

```bash
npm run build
```

Record the exact pass/fail output and any non-fatal chunk-size warning. Do not describe the milestone as complete unless focused verification, all 29 verifiers, curriculum/section checks, browser QA, and the production build have all passed.

- [ ] **Step 7: Show the result**

Open `http://127.0.0.1:5174/#nonidealThermodynamicsLab` in the Codex browser panel and leave the activity membrane visible as the handoff view.

---

## Acceptance Checklist

- [ ] All three engines are scientifically bounded, pure, local, and recursively immutable.
- [ ] No synthetic activity or virial parameter is represented as a measured named-substance property.
- [ ] Activity mode finds verified 0/1/2 interior azeotrope cases.
- [ ] Stability mode distinguishes binodal, spinodal, local state, and equilibrium phase amounts.
- [ ] Fugacity mode refuses out-of-gate calculations without clamping or leaking pseudo-results.
- [ ] Wrong answers persist; hints never mutate; teacher loads never auto-run.
- [ ] Released snapshots become visibly stale after edits.
- [ ] Primary IUPAC/NIST definitions and model limitations are linked in the passport.
- [ ] The visual system is distinctive, responsive, keyboard-visible, and reduced-motion safe.
- [ ] Curriculum truth reaches 98 live clusters without erasing the narrower remaining gaps.
- [ ] Focused verifier, all 29 verifiers, section/curriculum checks, browser QA, and production build pass.

## Out of Scope

- Real-mixture parameter fitting or property lookup.
- Named-mixture azeotrope prediction or certification.
- Electrolyte, association, Henry-law, NRTL, UNIQUAC, UNIFAC, SAFT, cubic-EOS, or high-pressure mixture calculation.
- Multicomponent, solid, reactive, or caloric flash equilibrium.
- Kinetics, nucleation, spinodal-decomposition time evolution, morphology, transport, or process design.
- Laboratory apparatus, operating procedure, chemical handling, or safety instruction.
- Runtime network, database, language-model, or paid service calls.
