# Molecular Interaction Observatory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a graphical undergraduate observatory where learners identify coexisting intermolecular-interaction families, select compatible sites, orient two declared entities, explicitly form or break a noncovalent bridge, and orient a symbolic ion–water shell without converting a teaching model into an energy, property, or solubility predictor.

**Architecture:** Frozen local records define four interaction families, six reusable entity drawings, six pair scenarios, and two symbolic ion-solvation shells. A pure immutable engine owns site selection, rotations, angular alignment, bridge formation and manual cleavage, family-set evaluation, shell orientation, prediction scoring, and non-mutating hints. A lazy React module renders persistent pair-dock and solvation-shell modes, polarization rotors, a bridge oscilloscope, predictions, trace, teacher lens, and a source-backed model passport.

**Tech Stack:** React 19, Vite 8, JavaScript ES modules, semantic HTML, inline SVG, CSS, Node `assert/strict`.

## Global Constraints

- Cover exactly four introductory families: London dispersion, permanent dipole–dipole, a declared hydrogen-bond subset, and ion–dipole orientation.
- Teach that London dispersion is present in polar as well as apolar molecular scenarios; never force a single-family answer where several declared families coexist.
- Treat van der Waals forces as including dipole–dipole, dipole-induced-dipole, and London forces in IUPAC terminology, while implementing only the explicitly declared subset.
- Restrict hydrogen-bond contacts to frozen donor-hydrogen and electron-rich acceptor sites in the declared scenarios. Do not claim a universal donor/acceptor parser or use the geometry gate as proof that a hydrogen bond exists experimentally.
- Treat pair orientation as a dimensionless geometric teaching alignment. No distance, energy, force, lifetime, probability, optimized geometry, or quantum calculation is produced.
- Require the learner to choose both sites and an interaction family before an interaction attempt. A rejected or misaligned attempt must preserve every selection and rotation.
- Permit only one explicit bridge in the bounded pair dock. Forming another bridge requires the learner to break the existing bridge first.
- Rotating an entity after bridge formation must preserve the bridge record and report it as geometrically strained; never break or repair it automatically.
- In solvation mode, use six symbolic water compasses around either Na⁺ or Cl⁻. The expected inward end is oxygen for the cation and hydrogen for the anion.
- State that the shell is not a hydration number, measured structure, coordination geometry, concentration, solubility, or dynamics calculation.
- Preserve wrong family sets, orientation claims, covalent-change claims, favored-water-end predictions, and oriented-count predictions after checks.
- Exclude dipole-induced-dipole implementation, quadrupoles, halogen/chalcogen bonds, π stacking, cation–π, hydrophobic effect, host–guest binding, intramolecular contacts, cooperative networks, solvent competition, dielectric response, energies, bulk properties, phase behavior, reaction, kinetics, and biological activity.
- Do not infer boiling point, melting point, viscosity, surface tension, vapour pressure, solubility, miscibility, extraction outcome, or chromatographic retention from interaction labels.
- Add no runtime dependency, backend, model call, paid API, operational experiment, chemical handling instruction, or hazardous procedure.
- Preserve every existing module and deterministic verifier.
- Do not perform Git actions; repository instructions override the plan skill's usual worktree and commit cadence.

## Visual Contract

- Palette: graphite `#101820`, electropositive coral `#ff9b71`, electronegative blue `#58c7ff`, polarizability violet `#b38cff`, contact mint `#65d6ad`, rejection red `#f05b6e`, paper `#f1f5f3`.
- Type: retain the product's condensed Avenir display role, Avenir/system body role, and SFMono data/notation role.
- Layout: quiet scenario/prediction rails flank one dark polarization table; evidence and passport remain light.

```text
┌ Pair dock / Solvation shell tabs ───────────────────────────────┐
│ scenarios │ rotating entity A ⇄ bridge scope ⇄ entity B │ claim│
│           │ site ports + charge halos + alignment arcs   │      │
├───────────┴───────────────────────────────────────────────┴──────┤
│ contact ledger / shell ledger / preserved feedback              │
├───────────────────────┬──────────────────────────────────────────┤
│ learner trace         │ model + source passport                  │
└───────────────────────┴──────────────────────────────────────────┘
```

- Signature: two translucent molecular rotors drive a central bridge oscilloscope. A valid bridge lights only after an explicit learner commit; wrong sites remain visibly selected with a specific reason.
- Solvation signature: six water compasses rotate independently around one central ion, with their partial-charge ends visible before and after checking.
- Motion: use one restrained bridge pulse and rotor transition; disable both under `prefers-reduced-motion`.

---

### Task 1: Frozen scenarios, source records, model passport, and red verifier

**Files:**
- Create: `src/data/intermolecularScenarios.js`
- Modify: `src/data/scienceSources.js`
- Create: `scripts/verify-intermolecular.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `INTERACTION_FAMILIES`, `INTERACTION_FAMILY_BY_ID`, `INTERACTION_ENTITIES`, `INTERACTION_ENTITY_BY_ID`, `INTERACTION_PAIR_SCENARIOS`, `INTERACTION_PAIR_BY_ID`, `SOLVATION_SHELL_SCENARIOS`, `SOLVATION_SHELL_BY_ID`, and `INTERMOLECULAR_MODEL_BOUNDARY`.
- Produces passport: `MODEL_PASSPORTS.interactionObservatory`.
- The verifier imports the planned Task 2 engine so its first execution fails only because `src/chemistry/intermolecularInteractions.js` is absent.

- [ ] **Step 1: Declare the four family contracts**

Use these exact IDs and introductory boundaries:

```js
const families = [
  {id:'london-dispersion',name:'London dispersion',orientationSpecific:false,scope:'Mutual polarizability; present in every declared neutral molecular pair.'},
  {id:'dipole-dipole',name:'Permanent dipole–dipole',orientationSpecific:true,scope:'Opposite partial-charge ends of two declared permanent dipoles.'},
  {id:'hydrogen-bond',name:'Declared hydrogen-bond contact',orientationSpecific:true,scope:'A declared X–H donor hydrogen directed toward a declared electron-rich acceptor region.'},
  {id:'ion-dipole',name:'Ion–dipole orientation',orientationSpecific:true,scope:'A declared ion directed toward the oppositely signed end of a declared permanent dipole.'},
];
```

Each family record also contains `symbol`, `accent`, `definition`, `siteRule`, `sourceIds`, and `boundary`. Freeze every record and the exported collections.

- [ ] **Step 2: Declare six reusable entity drawings**

Create records for `methane`, `hydrogen-chloride`, `water`, `acetone`, `sodium-ion`, and `chloride-ion`. Each contains:

```js
{
  id, name, formula, netCharge, permanentDipole, polarizable,
  atoms:[{id,label,element,x,y,partialCharge:null|'positive'|'negative'}],
  bonds:[{id,a,b,order}],
  sites:[{id,label,x,y,directionDeg,role,orientationFree:false}],
  boundary,
}
```

Allowed site roles are `polarizable-cloud`, `partial-positive`, `partial-negative`, `donor-hydrogen`, `acceptor-region`, `cation`, and `anion`.

- [ ] **Step 3: Declare six pair scenarios**

Use these family inventories and focus contacts:

```text
methane-methane        -> London dispersion
hcl-hcl                -> London dispersion + dipole-dipole
water-water            -> London dispersion + dipole-dipole + hydrogen bond
water-acetone          -> London dispersion + dipole-dipole + hydrogen bond
sodium-water           -> ion-dipole focus only in this bounded ion scenario
chloride-water         -> ion-dipole focus only in this bounded ion scenario
```

Each scenario contains `id`, `name`, `entityAId`, `entityBId`, `familiesPresent`, `focusFamilyId`, `defaultRotationsDeg`, `validContacts`, `teachingQuestion`, `misconception`, and `boundary`.

Each `validContacts` entry contains:

```js
{
  id:'water-h1-to-acetone-o',
  familyId:'hydrogen-bond',
  aSiteId:'water-h1-donor',
  bSiteId:'acetone-o-acceptor',
  alignmentToleranceDeg:24,
  explanation:'The declared donor hydrogen faces the declared carbonyl-oxygen acceptor region.',
}
```

Dispersion contacts use `orientationFree:true` cloud sites. Ion sites are also orientation-free; the water partial-charge site must face the ion.

- [ ] **Step 4: Declare two solvation-shell scenarios**

`sodium-water-shell` has expected inward end `oxygen`; `chloride-water-shell` has expected inward end `hydrogen`. Each record contains six fixed radial slots at 0, 60, 120, 180, 240, and 300 degrees, a teaching question, misconception, and explicit symbolic-shell boundary.

- [ ] **Step 5: Register authoritative sources**

Add source records for:

```text
IUPAC Gold Book · van der Waals forces       https://goldbook.iupac.org/terms/view/V06597
IUPAC Gold Book · London forces              https://goldbook.iupac.org/terms/view/L03617
IUPAC Gold Book · dipole–dipole interaction  https://goldbook.iupac.org/terms/view/D01758
IUPAC Gold Book · hydrogen bond              https://goldbook.iupac.org/terms/view/H02899
IUPAC Recommendations 2011 · hydrogen bond   https://publications.iupac.org/pac/pdf/2011/pdf/8308x1637.pdf
IUPAC Gold Book · solvation                   https://goldbook.iupac.org/terms/view/S05747
IUPAC Gold Book · host ion–dipole example     https://goldbook.iupac.org/terms/view/H02859
ACS JCE · tactile IMF models                  https://pubs.acs.org/doi/10.1021/acs.jchemed.0c00460
ACS JCE · first-year IMF caution              https://pubs.acs.org/doi/10.1021/ed200802p
```

Reuse `iupacElectricDipoleMoment` and `acsUndergraduateCurriculum`.

- [ ] **Step 6: Add the complete model passport**

`MODEL_PASSPORTS.interactionObservatory` must include multi-family inventories, manual site selection, geometric orientation, explicit bridge formation/cleavage, preserved strained bridges, shell-water orientation, independent prediction dimensions, and four hints. It must explicitly exclude every item in Global Constraints, especially energy/strength ranking and bulk-property inference.

- [ ] **Step 7: Write and register the red verifier**

Begin with:

```js
assert.equal(Object.keys(INTERACTION_FAMILIES).length,4);
assert.equal(Object.keys(INTERACTION_ENTITIES).length,6);
assert.equal(INTERACTION_PAIR_SCENARIOS.length,6);
assert.equal(SOLVATION_SHELL_SCENARIOS.length,2);
assert.deepEqual(INTERACTION_PAIR_BY_ID['water-water'].familiesPresent,[
  'london-dispersion','dipole-dipole','hydrogen-bond',
]);
```

Add `"verify:intermolecular": "node scripts/verify-intermolecular.mjs"` to `package.json`.

Run: `npm run verify:intermolecular`

Expected: non-zero exit caused only by missing `src/chemistry/intermolecularInteractions.js`.

---

### Task 2: Pure immutable pair-contact and solvation engine

**Files:**
- Create: `src/chemistry/intermolecularInteractions.js`
- Modify: `scripts/verify-intermolecular.mjs`

**Interfaces:**
- Consumes Task 1 records.
- Produces: `createPairInteractionState(scenarioId)`, `rotatePairEntity(input)`, `selectPairSite(input)`, `attemptPairInteraction(input)`, `breakPairInteraction(input)`, `createPairAlignmentReference(scenarioId,contactId)`, `analyzePairInteraction(input)`, `evaluatePairPrediction(input)`, `nextPairInteractionHint(input)`, `createSolvationShellState(scenarioId)`, `toggleWaterCompass(input)`, `createSolvationReference(scenarioId)`, `analyzeSolvationShell(input)`, `evaluateSolvationPrediction(input)`, and `nextSolvationHint(input)`.

- [ ] **Step 1: Implement immutable state constructors and validation**

Pair state shape:

```js
{
  scenarioId,
  rotationsDeg:{a:0,b:0},
  selectedSites:{a:'',b:''},
  bridge:null,
}
```

Shell state shape:

```js
{
  scenarioId,
  orientationBySlot:{s0:'oxygen-in',s1:'hydrogen-in',s2:'oxygen-in',s3:'hydrogen-in',s4:'oxygen-in',s5:'hydrogen-in'},
}
```

Reject unknown scenarios, entities, sites, slots, nonfinite angles, and unsupported orientation values. Return deeply frozen state and never mutate input.

- [ ] **Step 2: Implement rotation and angular evidence**

Normalize learner rotations to the half-open range `[-180,180)`. For a selected A site, facing B means world direction 0 degrees; for B, facing A means 180 degrees. Use:

```js
const angularDistance=(left,right)=>Math.abs((((left-right)+540)%360)-180);
```

An orientation-free site contributes zero error. Report A error, B error, maximum error, tolerance, and aligned boolean.

- [ ] **Step 3: Implement site selection without automatic pairing**

`selectPairSite({scenarioId,state,entityKey,siteId})` changes exactly one selected site. Re-selecting the active site clears only that side. It never changes rotation, bridge, or the other selection.

- [ ] **Step 4: Implement explicit bridge attempts**

`attemptPairInteraction({scenarioId,state,familyId})` returns:

```js
{
  changed,
  state,
  outcome:{status:'formed'|'missing-selection'|'unsupported-contact'|'misaligned'|'bridge-present',title,reason,evidence},
}
```

Only a valid contact with both angular errors inside its declared tolerance forms a bridge. A bridge record contains `contactId`, `familyId`, `aSiteId`, `bSiteId`, and the rotations at commit. All failure paths preserve the exact input state object.

- [ ] **Step 5: Preserve a bridge through later rotations**

`rotatePairEntity` must keep `state.bridge`. `analyzePairInteraction` recomputes current alignment and reports bridge status `aligned` or `strained`; it never removes the record.

- [ ] **Step 6: Implement manual bridge cleavage**

`breakPairInteraction` removes only the bridge. With no bridge, return the identical state and a `no-bridge` outcome. Site selections and rotations always remain.

- [ ] **Step 7: Implement explicit alignment references**

`createPairAlignmentReference(scenarioId,contactId)` returns a state with the declared sites and compatible rotations loaded but `bridge:null`. The learner must still press `Attempt selected interaction`.

- [ ] **Step 8: Analyze family inventory and selection evidence**

Return the scenario, entities, all declared families, focus family, selected roles, matched contact if any, angular evidence, bridge status, and model boundary. Do not calculate a scalar strength or rank families.

- [ ] **Step 9: Score three pair predictions independently**

Accept:

```js
{
  families:['london-dispersion','dipole-dipole'],
  orientation:'opposite-electrostatic-ends-face'|'same-electrostatic-ends-face'|'orientation-not-specific-in-this-model',
  covalentChange:'none'|'bond-formed'|'bond-broken',
}
```

Compare family arrays as sets. Expected orientation is `orientation-not-specific-in-this-model` for the dispersion-only scenario and `opposite-electrostatic-ends-face` otherwise. Expected covalent change is always `none`. Preserve order and every raw learner value.

- [ ] **Step 10: Implement four non-mutating pair hints**

Hint levels reveal: entity polarity/polarizability inventory; all declared family candidates; compatible site-role logic; and current angular evidence. No hint changes a state or prediction.

- [ ] **Step 11: Implement symbolic solvation-shell orientation**

`toggleWaterCompass` flips exactly one selected slot between `oxygen-in` and `hydrogen-in`. Analysis reports each slot, correct count, incorrect count, expected inward end, ion charge, and the explicit non-hydration-number boundary.

- [ ] **Step 12: Score shell predictions and hints**

Accept `{favoredEnd:'oxygen'|'hydrogen',correctlyOrientedCount:'0'..'6'}`. Score both independently, preserve raw count text, and use four hints: ion sign, water partial ends, opposite-sign orientation, and per-slot count.

- [ ] **Step 13: Complete deterministic coverage**

For all six pair scenarios verify frozen state, exact family sets, source/site integrity, invalid selection rejection, selection toggling, misaligned preservation, explicit reference, valid formation, bridge-present blocking, post-formation strained retention, manual break, three independent prediction dimensions, and four immutable hints.

For both shells verify six slots, alternating default count 3, one-slot toggle, exact reference count 6, cation/anion expected ends, two independent prediction dimensions, preserved raw count, invalid slot rejection, and four immutable hints.

Run: `npm run verify:intermolecular`

Expected: exit 0.

---

### Task 3: Graphical molecular interaction observatory

**Files:**
- Create: `src/components/IntermolecularLab.jsx`
- Create: `src/styles/intermolecular.css`

**Interfaces:**
- Consumes Tasks 1 and 2.
- Produces section anchor `#intermolecularLab`.

- [ ] **Step 1: Build persistent pair and shell modes**

Render `Pair dock · choose sites` and `Solvation shell · orient waters` as semantic tabs. Each mode retains scenario, immutable learner state, predictions, feedback, hints, checks, and explicit references while inactive.

- [ ] **Step 2: Build the pair scenario rail and multi-family claim**

Show all six scenarios with formulas and focus-family colour. Require a multi-select family inventory rather than a single radio answer. Changing scenario resets only pair mode and leaves shell mode untouched.

- [ ] **Step 3: Build the polarization-rotor stage**

Render both entities as inline SVG atom/bond drawings on translucent rotors. Place real semantic buttons over every interaction site. Each rotor has a synchronized `-180` to `180` range and numeric input. Site selection and rotation preserve a committed bridge.

- [ ] **Step 4: Build the bridge oscilloscope**

Before formation, show selected ports and live angular evidence without drawing a bridge. A valid explicit attempt creates the family-specific bridge. A later misalignment keeps a dashed red strained bridge until the learner presses `Break selected interaction`.

- [ ] **Step 5: Build pair predictions, attempts, references, and hints**

Require family set, orientation claim, and covalent-change claim. Provide `Attempt selected interaction`, `Break selected interaction`, `Load alignment reference`, and four hints. Checks and hints never select, rotate, form, break, or repair anything.

- [ ] **Step 6: Build the radial water-compass shell**

Render six independent water buttons around Na⁺ or Cl⁻. Clicking one rotates that water by 180 degrees. Display δ− oxygen and δ+ hydrogen ends before check. The shell remains explicitly symbolic.

- [ ] **Step 7: Build shell predictions and per-slot evidence**

Require favored inward end and raw correct-count prediction. After check or explicit reference, mark each slot independently and explain opposite-sign orientation without claiming hydration number or measured structure.

- [ ] **Step 8: Build trace, teacher lens, and passport**

Trace modes, scenarios, site choices, rotations, attempts, bridge formation/breaking, shell toggles, hints, checks, and references. Teacher prompts cover coexisting families, dispersion in polar pairs, noncovalent versus covalent change, and why a symbolic shell cannot predict solubility.

- [ ] **Step 9: Apply the polarization-table visual system**

Use the Visual Contract exactly. All controls must be at least 44 CSS pixels, support visible keyboard focus, avoid body overflow at 390 pixels, and disable bridge/rotor motion under reduced-motion preferences.

---

### Task 4: App, curriculum, numbering, navigation, and open-source integration

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/Header.jsx`
- Modify: `src/data/curriculum.js`
- Modify: all numbered module headings from current module 05 onward
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`

**Interfaces:**
- Consumes Task 3 anchor `#intermolecularLab`.
- Produces discoverable module 05 and shifts later module numbers through equation balancer 20.

- [ ] **Step 1: Lazy-load in the learning sequence**

Insert `IntermolecularLab` after `MolecularOrbitalLab` and before `StoichiometryLab`. Add a matching fallback with `id="intermolecularLab"`.

- [ ] **Step 2: Add desktop and mobile navigation**

Add `Molecular interaction observatory` to both More menus with copy `Dock noncovalent sites and orient solvation`.

- [ ] **Step 3: Renumber downstream modules**

Use this exact sequence:

```text
05 Molecular interactions
06 Quantitative reaction stoichiometry
07 Aqueous equilibrium
08 Thermodynamics + kinetics
09 Electrochemical cells
10 Gases + phase equilibrium
11 Binary liquid-vapour equilibrium
12 Analytical measurement
13 Biomolecular assembly
14 Biochemical kinetics
15 Organic electron flow
16 Stereochemical navigation
17 Inorganic coordination field
18 Materials crystal structure
19 Reaction chamber
20 Equation balancer
```

- [ ] **Step 4: Expand curriculum truthfully**

Add live outcomes/topics/lab links to General, Organic, Physical, and Biochemistry. Keep bulk-property prediction, hydrophobic effect, binding, structure, solubility, and measured forces outside scope. Do not remove any existing next-engine item unless this module actually implements it.

- [ ] **Step 5: Document architecture and acceptance**

Add component/data/engine/style/verifier paths, the new validation command, scenario set, multi-family rule, symbolic-shell boundary, and contributor browser acceptance at 390, 742, and desktop widths.

---

### Task 5: Full validation and student/teacher acceptance

**Files:**
- Verify only unless a failure identifies an in-scope defect.

**Interfaces:**
- Consumes all prior tasks.
- Produces evidence for milestone status.

- [ ] **Step 1: Run the new verifier**

Run: `npm run verify:intermolecular`

Expected: exit 0 with six pair scenarios, two shells, immutable failures, bridges, predictions, and hints verified.

- [ ] **Step 2: Run every existing deterministic verifier**

Run every `verify:*` script in `package.json` and require exit 0 for all.

- [ ] **Step 3: Build the production bundle**

Run: `npm run build`

Expected: Vite exits 0 and emits a lazy `IntermolecularLab` chunk.

- [ ] **Step 4: Student acceptance pass**

At 390, 742, and desktop widths:

```text
1. Open methane/methane and select only dispersion; load the reference, form the bridge, rotate afterward, confirm the bridge remains.
2. Open HCl/HCl and keep a wrong single-family answer through check; verify dispersion plus dipole–dipole are explained separately.
3. Open water/water and select London, dipole–dipole, and hydrogen bond; choose a wrong H/H contact and confirm it stays selected.
4. Load a valid donor/acceptor alignment, form the bridge, then break it manually without clearing sites or rotations.
5. In Na⁺ shell mode orient one water incorrectly and verify only that slot fails; repeat with Cl⁻ and the opposite water end.
6. Reveal all four hints and confirm no site, angle, bridge, water, or prediction changes.
```

- [ ] **Step 5: Teacher acceptance pass**

Confirm all family definitions, multi-family inventories, six pair boundaries, two shell boundaries, four teacher prompts, source links, included/excluded passport claims, and explicit rejection of bulk-property inference.

- [ ] **Step 6: Responsive and runtime audit**

Verify More-menu reachability, hash alignment after lazy loading, persistent mode state, 44-pixel controls, site hit areas, no clipped rotor/shell, no body overflow, visible focus, reduced motion, and zero runtime error overlays.

---

## Self-Review Record

- Spec coverage: every global constraint maps to Tasks 1–5; pair and shell modes are independently testable.
- Placeholder scan: no deferred implementation markers or unspecified error handling remain.
- Type consistency: scenario IDs, state fields, mutations, evaluator inputs, component props, anchor, passport ID, and verifier command use one spelling throughout.
- Scope correction after review: removed molecule-property ranking and any scalar “interaction strength” output because the cited first-year teaching literature warns that labels do not support automatic boiling-point, viscosity, surface-tension, or solubility conclusions.
- Design correction after review: replaced generic molecule cards with orientation-bearing polarization rotors and a separate water-compass shell, so the graphic itself carries the scientific relationship.
