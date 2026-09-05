# Molecular Geometry Wind Tunnel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a graphical undergraduate workbench where learners manually place bonding and nonbonding domains into ideal two-through-six-domain cages, predict molecular shape and polarity, and see qualitative bond-polarity vectors cancel or reinforce.

**Architecture:** Store five ideal electron-domain geometries and fourteen declared AXmEn teaching scenarios as frozen data. A pure immutable engine owns token placement, lone-pair site preferences, nominal angle geometry, conventional hybrid-label metadata, 3D projection, relative bond-pull vector sums, and independent prediction evaluation. A lazy React module renders a rotatable repulsion cage and preserves every physically representable wrong arrangement until the learner changes it.

**Tech Stack:** React 19, Vite 8, JavaScript ES modules, semantic HTML, inline SVG, CSS, Node `assert/strict`.

## Global Constraints

- Treat VSEPR as a bounded empirical electron-domain teaching model, not a first-principles electronic-structure calculation.
- Cover only the fourteen declared AXmEn scenarios and five ideal parent arrangements: linear, trigonal planar, tetrahedral, trigonal bipyramidal, and octahedral.
- Use nominal ideal-domain angles; do not display them as measured molecule-specific bond angles.
- Learners must place every bonding-domain and lone-pair token themselves; no site is filled, moved, or repaired automatically.
- Block only impossible actions such as two tokens in one site, one token in two sites, an unknown site, or a bond-pull value outside 0–2 relative units.
- Preserve possible but model-unfavoured arrangements, including axial lone pairs in a trigonal bipyramid and cis lone pairs in AX4E2, then explain the site-preference reason.
- Use outward “electron-pull” arrows as a qualitative classroom vector convention. Do not label their resultant as a measured electric dipole moment or use IUPAC electric-dipole sign convention implicitly.
- Hybrid labels are conventional localized-orbital teaching labels. Mark sp3d and sp3d2 as introductory labels that do not establish d-orbital participation or modern hypervalent bonding.
- Do not infer arbitrary molecules, optimized geometry, distortion, bond length, steric size, energy, spectroscopy, reactivity, intermolecular forces, or a molecular-orbital description.
- Preserve all existing modules and deterministic verifiers.
- Add no runtime dependency, backend, model call, paid API, or operational chemistry procedure.
- Do not perform Git actions; project instructions override the plan skill's usual commit cadence.

---

### Task 1: Frozen geometry, scenario, and source records

**Files:**
- Create: `src/data/molecularGeometryScenarios.js`
- Modify: `src/data/scienceSources.js`
- Create: `scripts/verify-molecular-geometry.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `ELECTRON_DOMAIN_GEOMETRIES`, `ELECTRON_DOMAIN_GEOMETRY_LIST`, `MOLECULAR_GEOMETRY_SCENARIOS`, `MOLECULAR_GEOMETRY_SCENARIO_BY_ID`, `MOLECULAR_GEOMETRY_MODEL_BOUNDARY`.
- Produces passport: `MODEL_PASSPORTS.molecularGeometryWindTunnel`.

- [ ] **Step 1: Declare five normalized parent cages**

Use this site shape:

```js
{
  id: 'tetrahedral',
  name: 'Tetrahedral',
  domainCount: 4,
  nominalAngles: [109.47],
  conventionalHybridLabel: 'sp³',
  sites: [
    { id:'t0', class:'equivalent', vector:[ 1, 1, 1] },
    { id:'t1', class:'equivalent', vector:[-1,-1, 1] },
    { id:'t2', class:'equivalent', vector:[-1, 1,-1] },
    { id:'t3', class:'equivalent', vector:[ 1,-1,-1] },
  ],
}
```

Normalize every vector when records are frozen. Trigonal-bipyramidal sites must declare `axial` or `equatorial`; octahedral sites must declare opposite-site IDs.

- [ ] **Step 2: Declare fourteen scenario contracts**

Include:

```text
CO2   AX2    linear
BF3   AX3    trigonal planar
SO2   AX2E   bent
CH4   AX4    tetrahedral
NH3   AX3E   trigonal pyramidal
H2O   AX2E2  bent
CH3Cl AX4    tetrahedral with unequal illustrative pulls
PCl5  AX5    trigonal bipyramidal
SF4   AX4E   seesaw
ClF3  AX3E2  T-shaped
XeF2  AX2E3  linear
SF6   AX6    octahedral
BrF5  AX5E   square pyramidal
XeF4  AX4E2  square planar
```

Each scenario declares central label, domain tokens, default relative bond pulls, one reference site mapping, molecular shape, nominal ideal-domain angles, and a boundary note. Domain records use:

```js
{ id:'bond-o-1', kind:'bond', label:'O', pull:1 }
{ id:'lp-1', kind:'lonePair', label:'LP', pull:0 }
```

- [ ] **Step 3: Register source roles and the model passport**

Add sources for Gillespie's ACS VSEPR teaching paper, the IUPAC molecular-structure/VSEPR review, IUPAC lone pair, IUPAC electric dipole moment, IUPAC hybrid orbital, and IUPAC electro-optic parameter/vector-sum model. The passport must name every included and excluded claim and state that all pulls are learner-visible relative units.

- [ ] **Step 4: Write data assertions before the engine**

```js
assert.equal(ELECTRON_DOMAIN_GEOMETRY_LIST.length, 5);
assert.equal(MOLECULAR_GEOMETRY_SCENARIOS.length, 14);
assert.equal(MOLECULAR_GEOMETRY_SCENARIO_BY_ID.water.shape, 'bent');
assert.equal(MOLECULAR_GEOMETRY_SCENARIO_BY_ID.xenonTetrafluoride.shape, 'square planar');
for (const geometry of ELECTRON_DOMAIN_GEOMETRY_LIST) {
  assert.equal(geometry.sites.length, geometry.domainCount);
  geometry.sites.forEach((site) => close(vectorLength(site.vector), 1));
}
```

Import the planned engine so this verifier initially fails with a missing-module error.

- [ ] **Step 5: Run the red verifier**

Run: `npm run verify:molecular-geometry`

Expected: non-zero exit caused by missing `src/chemistry/molecularGeometry.js`.

### Task 2: Immutable placement, geometry, and polarity engine

**Files:**
- Create: `src/chemistry/molecularGeometry.js`
- Modify: `scripts/verify-molecular-geometry.mjs`

**Interfaces:**
- Consumes Task 1 geometry/scenario records.
- Produces: `createEmptyDomainState(scenarioId)`, `buildReferenceDomainState(scenarioId)`, `placeDomainToken(input)`, `removeDomainToken(input)`, `setDomainPull(input)`, `domainStateMetrics(input)`, `calculatePolarityResultant(input)`, `evaluateMolecularGeometry(input)`, `projectDomainCage(input)`, `nextGeometryHint(input)`.

- [ ] **Step 1: Implement immutable domain state**

Use:

```js
{
  scenarioId:'water',
  sites:{t0:null,t1:null,t2:null,t3:null},
  pulls:{'bond-h-1':1,'bond-h-2':1},
}
```

`placeDomainToken` rejects a token already placed, an occupied site, wrong scenario, unknown token, or unknown site and returns the original state reference. `removeDomainToken` removes only the selected site's token. `setDomainPull` accepts finite bond values from 0 through 2 and never changes a domain position.

- [ ] **Step 2: Compute state metrics and site preferences**

Metrics report placed/required domains, bond/lone-pair counts, occupied site classes, missing token IDs, and completeness. Preference rules:

```text
linear, trigonal planar, tetrahedral: all parent sites equivalent
trigonal bipyramidal with lone pairs: lone pairs occupy equatorial sites before axial sites
octahedral AX5E: any one lone-pair site is equivalent
octahedral AX4E2: the two lone-pair sites are opposite
```

Wrong-but-complete arrangements return `valid:true`, `preferred:false`, exact conflicting sites, and a reason.

- [ ] **Step 3: Calculate nominal angles and pull-vector resultant**

Use vector dot products for all occupied bond-domain pairs:

```js
angleDeg = Math.acos(clamp(dot(a,b), -1, 1)) * 180 / Math.PI
resultant = sum(site.vector * state.pulls[token.id])
```

Return resultant components, magnitude, normalized direction, `nonpolar` only below `1e-8`, and an explicit relative-unit boundary. Do not calculate when not all bond tokens are placed.

- [ ] **Step 4: Evaluate dimensions independently**

`evaluateMolecularGeometry({scenarioId,state,predictions})` returns:

```js
{
  valid:true,
  committed:false,
  completeness:{correct:true,...},
  arrangement:{correct:false,reason:'In a five-domain cage, the lone pair is model-preferred in an equatorial site.'},
  electronGeometry:{correct:true,actual:'trigonal bipyramidal',predicted:'trigonal bipyramidal',...},
  molecularShape:{correct:false,actual:'seesaw',predicted:'T-shaped',...},
  polarity:{correct:true,actual:'polar',predicted:'polar',magnitude:1.0,...},
  nominalAngles:[90,120,180],
}
```

Evaluation never edits `state` or `predictions`.

- [ ] **Step 5: Project the cage for SVG**

`projectDomainCage({scenarioId,state,yawDeg,pitchDeg,width,height})` rotates each normalized 3D site around Y then X and returns x, y, depth, scale, token, and bond-pull vector endpoints. Projection must preserve site identity and sort only a copied render list by depth.

- [ ] **Step 6: Implement non-mutating hints**

Hints progress through missing token, occupied-site conflict, VSEPR site preference, shape name, then reference mapping. The fifth hint may disclose the declared reference only and must not load it.

- [ ] **Step 7: Complete deterministic coverage**

Assert:

```js
assert.equal(calculatePolarityResultant({scenarioId:'carbonDioxide',state:buildReferenceDomainState('carbonDioxide').state}).classification, 'nonpolar');
assert.equal(calculatePolarityResultant({scenarioId:'water',state:buildReferenceDomainState('water').state}).classification, 'polar');
assert.equal(calculatePolarityResultant({scenarioId:'boronTrifluoride',state:buildReferenceDomainState('boronTrifluoride').state}).classification, 'nonpolar');
assert.equal(calculatePolarityResultant({scenarioId:'chloromethane',state:buildReferenceDomainState('chloromethane').state}).classification, 'polar');
assert.equal(evaluateMolecularGeometry({scenarioId:'sulfurTetrafluoride',state:axialLonePair,predictions:correctPredictions}).arrangement.correct, false);
assert.equal(evaluateMolecularGeometry({scenarioId:'xenonTetrafluoride',state:cisLonePairs,predictions:correctPredictions}).arrangement.correct, false);
```

Also verify ideal angle sets, immutable rejected placement/removal/pull edits, projection immutability, prediction preservation, and all fourteen reference states.

Run: `npm run verify:molecular-geometry`

Expected: exit 0.

### Task 3: Graphical Geometry Wind Tunnel

**Files:**
- Create: `src/components/MolecularGeometryLab.jsx`
- Create: `src/styles/molecular-geometry.css`

**Interfaces:**
- Consumes Task 1 records and Task 2 pure functions.
- Produces section anchor `#molecularGeometryLab`.

- [ ] **Step 1: Build the semantic learner journey**

```text
Scenario runway → domain-token manifest → rotatable repulsion cage
Pull-vector controls → three-part prediction console → feedback ledger
Angle/symmetry strip → learning trace → teacher lens → model passport
```

Default to water with an empty cage. Scenario changes explicitly clear state and predictions.

- [ ] **Step 2: Build the scenario runway and token manifest**

Render all fourteen scenarios grouped by domain count. Each token button shows bond identity or `LP`, placed/unplaced state, and relative pull for bonds. The learner selects one unplaced token, then selects a cage site. Occupied sites expose a separate remove action.

- [ ] **Step 3: Build the repulsion cage**

Render a 3D-projected inline SVG with central atom, dashed empty-site sockets, depth-aware bonds, outer atoms, translucent lone-pair lobes, site-class labels, angle arcs, and a live resultant arrow. Provide yaw and pitch controls plus front/reset views. Site hit areas remain keyboard-operable and at least 44 px on mobile.

- [ ] **Step 4: Build pull controls**

Every bond token receives a 0–2 relative-unit slider and numeric input. Equal vectors in symmetric geometries visibly cancel; changing one pull changes only the resultant and polarity dimension, never token positions or shape.

- [ ] **Step 5: Build prediction and feedback**

Require electron-domain geometry, molecular shape, and polar/nonpolar predictions before checking. Score completeness, preferred arrangement, electron geometry, molecular shape, and polarity separately. Wrong choices and the entire cage remain unchanged.

- [ ] **Step 6: Show shape versus electron geometry explicitly**

The result strip must show:

```text
parent cage: tetrahedral
domains: AX2E2
visible-atom shape: bent
nominal parent angle: 109.47 degrees
conventional localized label: sp3
```

Place the hypervalent-label warning directly beside sp3d/sp3d2 labels.

- [ ] **Step 7: Build trace, teacher lens, and passport**

Trace scenario changes, token selection, allowed/blocked placement, removal, pull changes, checks, hints, and explicit reference loads. Teacher prompts compare CO2/H2O, BF3/NH3, SF4/ClF3/XeF2, and SF6/XeF4. Render every source and the exact vector/model boundaries.

- [ ] **Step 8: Apply the visual system**

```css
--geometry-navy:#172535;
--geometry-copper:#2f8f83;
--geometry-aqua:#8ad8cf;
--geometry-lone:#ff9d7d;
--geometry-bond:#f4c95d;
--geometry-vector:#b565a7;
--geometry-field:#f3efe3;
```

Use restrained drafting-paper surroundings, a dark wind-tunnel cage, Avenir Next Condensed for display, system sans for teaching copy, and SFMono for AXmEn/angle/vector readouts. At 760 px and below, stack the journey, add explicit swipe cues for scenario and cage controls when needed, guarantee 44 px targets, and keep all overflow internal.

### Task 4: Platform and curriculum integration

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/Header.jsx`
- Modify: module numbering in all lab component headings
- Modify: `src/data/curriculum.js`
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`

**Interfaces:**
- Consumes `#molecularGeometryLab`.
- Preserves all existing anchors.

- [ ] **Step 1: Lazy-load after the molecular graph workbench**

```jsx
const MolecularGeometryLab = lazy(() => import('./components/MolecularGeometryLab.jsx'));
// after LabWorkspace
<Suspense fallback={<LabFallback id="molecularGeometryLab" label="Molecular geometry wind tunnel"/>}>
  <MolecularGeometryLab />
</Suspense>
```

- [ ] **Step 2: Make Shapes discoverable**

Desktop direct links: `Learn`, `Atoms`, `Build`, `Shapes`, `Moles`, `Solutions`, `More labs`; move Energy into More. Mobile direct links: `Learn`, `Atoms`, `Build`, `Shapes`, `More`; move Moles into More.

- [ ] **Step 3: Renumber the instructional sequence**

Atomic remains 01, molecular graph 02, geometry/polarity becomes 03, stoichiometry becomes 04, and later modules increment through equation balancing 16.

- [ ] **Step 4: Add only truthful curriculum claims**

Mark declared central-atom VSEPR shape and qualitative polarity-vector cancellation live in General Chemistry. Add bounded structure/polarity links to Organic, Inorganic, and Physical Chemistry. Keep molecular-orbital theory, optimized structures, measured angles/dipoles, conformations, stereochemistry, intermolecular forces, and arbitrary molecule prediction outside this module.

- [ ] **Step 5: Document open-source extension seams**

README must list the fourteen scenarios, pure verifier, lazy component/data/engine/CSS paths, and scientific boundary. CONTRIBUTING must include wrong equatorial/axial, cis/trans lone-pair, symmetric cancellation, unequal-pull, mobile, teacher, and source review journeys.

### Task 5: Completion evidence for this milestone

**Files:**
- No new files.

**Interfaces:**
- Verifies Tasks 1–4 and all prior chemistry modules.

- [ ] **Step 1: Run all deterministic verifiers**

Run every `npm run verify:*` command, including `verify:molecular-geometry`.

- [ ] **Step 2: Build production assets**

Run: `npm run build`

Expected: exit 0 with lazy `MolecularGeometryLab` JavaScript and CSS chunks.

- [ ] **Step 3: Audit as a learner**

Verify:

- water can be built manually and resolves tetrahedral parent/bent shape/polar resultant;
- a wrong shape and polarity remain selected;
- carbon dioxide and BF3 equal pulls cancel;
- changing one symmetric pull creates a nonzero resultant without moving domains;
- an axial SF4 lone pair remains in place and receives a site-preference reason;
- XeF4 cis lone pairs remain in place and receive an opposite-site reason;
- duplicate-site and duplicate-token actions are blocked without mutation;
- reference loading is explicit and traced.

- [ ] **Step 4: Audit as a teacher**

Verify all fourteen scenarios, nominal-angle wording, hybrid-label warning, four teacher comparisons, source links, included/excluded passport claims, and full trace.

- [ ] **Step 5: Audit responsive and runtime behavior**

At 390, 742, and 1280 px widths verify hash alignment, no body overflow, no clipped cage or result vector, 44 px mobile controls, visible focus, reduced motion, internal swipe cues, navigation discoverability, and no new runtime errors. Inspect screenshots at every width.
