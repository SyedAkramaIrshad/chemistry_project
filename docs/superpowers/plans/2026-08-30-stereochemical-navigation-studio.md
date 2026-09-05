# Stereochemical Navigation Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a graphical undergraduate workbench where learners manipulate declared tetrahedral centres, alkene substituent geometry, and Newman projections, then justify R/S, E/Z, mirror relationships, and qualitative conformational labels without automatic rearrangement or unsupported structure prediction.

**Architecture:** Store bounded stereochemical priority sets, alkene arrangements, and torsion probes as frozen local teaching records. A pure immutable engine owns tetrahedral permutation parity, mirror generation, priority evaluation, E/Z eligibility and side comparison, signed torsion normalization, canonical Newman states, qualitative strain interpolation, independent prediction scoring, and non-mutating hints. A lazy React module renders three persistent optical instruments inside a projection-table visual system, with a shared trace, teacher lens, source-backed model passport, and explicit scope boundaries.

**Tech Stack:** React 19, Vite 8, JavaScript ES modules, semantic HTML, inline SVG, CSS, Node `assert/strict`.

## Global Constraints

- Cover only six declared tetrahedral priority sets, six declared alkene arrangements, and two declared Newman probes.
- Use declared local substituent-priority records; do not claim a complete recursive Cahn-Ingold-Prelog parser for arbitrary molecular graphs.
- Treat R/S and E/Z as stereodescriptors of the displayed declared arrangement, not as optical-rotation signs, reaction outcomes, stability rankings, or biological activity.
- A tetrahedral centre receives R/S only when the four declared ligand priorities are distinguishable. A repeated priority produces `not stereogenic in this single-centre test` rather than a forced descriptor.
- Generate the mirror only after an explicit learner action. Never swap groups, assign priorities, or change a prediction automatically.
- Permit any learner-requested swap between two displayed tetrahedral sites. A single transposition must invert R/S for a distinguishable four-ligand centre; two transpositions must restore it.
- For alkenes, preserve left and right connectivity. Permit a learner to swap only the two displayed substituent positions on one alkene carbon. E/Z is undefined if either alkene carbon has indistinguishable declared priorities.
- Use IUPAC's same-side highest-priority rule for Z and opposite-side rule for E within the declared planar display.
- Use a signed torsion angle from -180 to +180 degrees. The Newman display must rotate only the rear group while the front group remains fixed.
- Report exact canonical butane stations at 0, plus/minus 60, plus/minus 120, and 180 degrees. Use a dimensionless declared qualitative strain index, never kJ/mol, equilibrium populations, rate constants, or a force field.
- For noncanonical torsions, report a continuous angle and nearest station without pretending it is a named energy extremum.
- Treat the IUPAC synperiplanar, synclinal, anticlinal, and antiperiplanar ranges with a documented half-open boundary policy: `[0,30)`, `[30,90)`, `[90,150)`, and `[150,180]` by absolute angle.
- Preserve wrong priority assignments and wrong descriptor predictions after checking, with separate reasons for each dimension.
- Exclude arbitrary chirality detection, multiple stereocentres, meso analysis, pseudoasymmetry, axial/planar/helical chirality, isotopic priority recursion, conformational enantiomerism, rings/chairs, atropisomerism, reaction stereochemistry, stereoselectivity, measured conformer energies, and population prediction.
- Preserve every existing module and deterministic verifier.
- Add no runtime dependency, backend, model call, paid API, operational procedure, or hazardous chemistry instruction.
- Do not perform Git actions; repository instructions override the plan skill's usual worktree and commit cadence.

---

### Task 1: Frozen stereochemical records, sources, passport, and red verifier

**Files:**
- Create: `src/data/stereochemistryScenarios.js`
- Modify: `src/data/scienceSources.js`
- Create: `scripts/verify-stereochemistry.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `TETRAHEDRAL_SITES`, `TETRAHEDRAL_SCENARIOS`, `TETRAHEDRAL_SCENARIO_BY_ID`, `ALKENE_SCENARIOS`, `ALKENE_SCENARIO_BY_ID`, `NEWMAN_SCENARIOS`, `NEWMAN_SCENARIO_BY_ID`, `TORSION_STATIONS`, and `STEREOCHEMISTRY_MODEL_BOUNDARY`.
- Produces passport: `MODEL_PASSPORTS.stereochemicalNavigation`.
- The verifier imports the planned Task 2 engine so the first run fails only because `src/chemistry/stereochemistry.js` does not exist.

- [ ] **Step 1: Declare four regular-tetrahedron sites**

Use immutable coordinates and depth labels:

```js
export const TETRAHEDRAL_SITES = Object.freeze([
  Object.freeze({ id:'northEastNear', label:'near upper site', point:Object.freeze([1, 1, 1]) }),
  Object.freeze({ id:'southWestNear', label:'near lower site', point:Object.freeze([-1, -1, 1]) }),
  Object.freeze({ id:'northWestFar', label:'far upper site', point:Object.freeze([-1, 1, -1]) }),
  Object.freeze({ id:'southEastFar', label:'far lower site', point:Object.freeze([1, -1, -1]) }),
]);
```

- [ ] **Step 2: Declare six tetrahedral priority sets**

Each record contains `id`, `name`, `formulaLabel`, `groups`, `initialArrangement`, `teachingQuestion`, and `boundary`. Each group contains `id`, `label`, `priority`, `comparison`, and `tone`. Use:

```text
lactic-acid-set: OH 1, CO2H 2, CH3 3, H 4
butan-2-ol-set: OH 1, CH2CH3 2, CH3 3, H 4
alanine-set: NH2 1, CO2H 2, CH3 3, H 4
glyceraldehyde-set: OH 1, CHO 2, CH2OH 3, H 4
halomethane-set: Br 1, Cl 2, F 3, H 4
duplicate-ligand-gate: OH 1, CH3(a) 2, CH3(b) 2, H 4
```

The records supply already-resolved local priority comparisons. The engine must not infer those priorities from arbitrary atom graphs.

- [ ] **Step 3: Declare six alkene arrangements**

Each record contains `id`, `name`, left/right group records, `initialArrangement`, `expectedDescriptor`, `teachingQuestion`, and `boundary`. Include two 2-butene views (one Z, one E), two mixed halogen/alkyl views (one Z, one E), one tetrahalogen view, and one repeated-substituent gate whose expected descriptor is `undefined`.

Each side has exactly two groups with declared local priority `1` or `2`; a tied pair uses `1` and `1` and makes E/Z undefined.

- [ ] **Step 4: Declare two Newman probes and seven stations**

`butane` uses front groups `[CH3,H,H]`, rear groups `[CH3,H,H]`, initial angle `0`, and this dimensionless canonical profile:

```js
[
  { angle:-180, geometry:'staggered', relation:'anti', tier:'global minimum', strain:0 },
  { angle:-120, geometry:'eclipsed', relation:'eclipsed', tier:'local maximum', strain:2 },
  { angle:-60, geometry:'staggered', relation:'gauche', tier:'local minimum', strain:1 },
  { angle:0, geometry:'eclipsed', relation:'syn eclipsed', tier:'highest barrier', strain:3 },
  { angle:60, geometry:'staggered', relation:'gauche', tier:'local minimum', strain:1 },
  { angle:120, geometry:'eclipsed', relation:'eclipsed', tier:'local maximum', strain:2 },
  { angle:180, geometry:'staggered', relation:'anti', tier:'global minimum', strain:0 },
]
```

`ethane` uses `[H,H,H]` on both carbons, assigns all three staggered stations strain `0`, all three eclipsed stations strain `1`, and states that symmetry makes the staggered stations equivalent in this probe.

- [ ] **Step 5: Register authoritative sources**

Add source records for IUPAC Gold Book chirality, stereogenic unit, R/S, E/Z, enantiomer, diastereoisomerism, conformation, Newman projection, torsion angle, and staggered conformation. Add the IUPAC `Brief Guide to the Nomenclature of Organic Chemistry` and reuse the existing ACS undergraduate curriculum source.

- [ ] **Step 6: Add the model passport**

`MODEL_PASSPORTS.stereochemicalNavigation` must enumerate declared priority comparison, tetrahedral swaps, mirror generation, local R/S, E/Z eligibility, signed torsion, Newman geometry, and dimensionless strain. It must explicitly exclude arbitrary CIP recursion, multiple-centre relationships, meso/pseudoasymmetric cases, non-centre chirality, chair/ring analysis, reaction stereochemistry, measured energies, equilibrium populations, and property/activity claims.

- [ ] **Step 7: Write and register the red verifier**

The verifier imports all Task 2 interfaces and first asserts:

```js
assert.equal(TETRAHEDRAL_SITES.length, 4);
assert.equal(TETRAHEDRAL_SCENARIOS.length, 6);
assert.equal(ALKENE_SCENARIOS.length, 6);
assert.equal(NEWMAN_SCENARIOS.length, 2);
assert.equal(TORSION_STATIONS.length, 7);
assert.equal(ALKENE_SCENARIO_BY_ID['z-2-butene'].expectedDescriptor, 'Z');
assert.equal(ALKENE_SCENARIO_BY_ID['repeated-substituent-gate'].expectedDescriptor, 'undefined');
```

Add `"verify:stereochemistry": "node scripts/verify-stereochemistry.mjs"` to `package.json`.

Run: `npm run verify:stereochemistry`

Expected: non-zero exit caused only by missing `src/chemistry/stereochemistry.js`.

### Task 2: Immutable stereochemical and conformational engine

**Files:**
- Create: `src/chemistry/stereochemistry.js`
- Modify: `scripts/verify-stereochemistry.mjs`

**Interfaces:**
- Consumes Task 1 records.
- Produces: `createTetrahedralState(scenarioId)`, `swapTetrahedralSites(input)`, `mirrorTetrahedralState(input)`, `tetrahedralResult(input)`, `projectTetrahedral(input)`, `evaluateTetrahedral(input)`, `createAlkeneState(scenarioId)`, `swapAlkeneSide(input)`, `alkeneResult(input)`, `evaluateAlkene(input)`, `createNewmanState(scenarioId)`, `setTorsionAngle(input)`, `newmanResult(input)`, `newmanProfile(input)`, `evaluateNewman(input)`, and `nextStereochemistryHint(input)`.

- [ ] **Step 1: Implement exact tetrahedral state validation**

Use:

```js
{
  scenarioId:'lactic-acid-set',
  arrangement:{
    northEastNear:'oh',
    southWestNear:'co2h',
    northWestFar:'methyl',
    southEastFar:'hydrogen',
  },
}
```

Require exactly the four declared ligand IDs and four declared site IDs once each. Freeze returned state and nested arrangement.

- [ ] **Step 2: Implement immutable site swaps and mirror generation**

`swapTetrahedralSites({scenarioId,state,firstSiteId,secondSiteId})` swaps only the requested two sites. Unknown or identical sites return `{allowed:false,state}` with the identical state reference. `mirrorTetrahedralState` performs one declared odd transposition only when explicitly called and returns the generated mirror as a new state.

- [ ] **Step 3: Derive local stereogenicity and orientation**

For four distinguishable priorities, calculate the scalar triple product:

```js
determinant(
  point(priority1) - point(priority4),
  point(priority2) - point(priority4),
  point(priority3) - point(priority4),
)
```

Map a positive sign to `R` and a negative sign to `S` for this declared coordinate frame. A single transposition must reverse the sign. Repeated declared priorities return `descriptor:null`, `stereogenic:false`, and mirror relationship `same in this bounded single-centre test`.

- [ ] **Step 4: Project the tetrahedron without changing configuration**

`projectTetrahedral({scenarioId,state,viewAngleDeg})` rotates only the camera around the y axis and returns each ligand's screen-normalized `x`, `y`, and `depth`. Orientation, priorities, and state references must remain unchanged at view angles 0, 90, 180, and 270 degrees.

- [ ] **Step 5: Evaluate tetrahedral reasoning independently**

`evaluateTetrahedral` accepts:

```js
{
  priorityAssignments:{oh:1,co2h:2,methyl:3,hydrogen:4},
  descriptorPrediction:'R',
  stereogenicPrediction:'stereogenic',
  mirrorPrediction:'enantiomer',
}
```

Return separate dimensions for every ligand priority, stereogenic eligibility, descriptor, and mirror relationship. Preserve wrong assignments and predictions. `committed` requires every dimension correct.

- [ ] **Step 6: Implement immutable alkene side swaps and E/Z evidence**

Use a state with `left:{top,bottom}` and `right:{top,bottom}`. `swapAlkeneSide` swaps only one known side. `alkeneResult` finds the declared higher-priority group on each side, returns `undefined` when either side ties, otherwise returns `Z` when both higher groups occupy the same top/bottom side and `E` when they are opposite.

- [ ] **Step 7: Evaluate alkene reasoning independently**

Score left higher group, right higher group, E/Z eligibility, and descriptor prediction separately. A side swap must flip E and Z for eligible scenarios and must leave the repeated-substituent case undefined.

- [ ] **Step 8: Implement signed torsion state and canonical evidence**

Normalize angles into `[-180,180]`, preserving positive 180 when directly selected. `newmanResult` returns signed angle, absolute angle, IUPAC range, geometry, relation, tier, nearest station, canonical flag, and dimensionless strain. Only exact declared stations receive canonical geometry/relation/tier labels; other values use `geometry:'intermediate'`, `relation:'between named stations'`, and `tier:'intermediate'`.

- [ ] **Step 9: Interpolate the qualitative profile**

`newmanProfile({scenarioId,step:3})` returns points from -180 through +180. Interpolate linearly between adjacent frozen station strain indices. State that the curve is a teaching trace, not an energy calculation.

- [ ] **Step 10: Evaluate torsion predictions and hints**

Score geometry, relation, and qualitative tier independently. `nextStereochemistryHint({mode,scenarioId,state,level})` returns four non-mutating levels: eligibility, priority/fiducial groups, spatial comparison, and current declared result.

- [ ] **Step 11: Complete deterministic coverage**

For every tetrahedral scenario assert frozen state, exact group coverage, determinant behavior, one-swap inversion, two-swap restoration, mirror relationship, view invariance, and committed reference evaluation. Assert the duplicate-ligand gate has no R/S descriptor.

For every alkene scenario assert expected E/Z/undefined, one-side swap behavior, wrong-priority preservation, immutable invalid side rejection, and committed evaluation.

For butane assert exact station labels and strain indices at all seven stations, anti at plus/minus 180, gauche at plus/minus 60, highest barrier at 0, and intermediate behavior at 37 degrees. For ethane assert all staggered stations are equivalent minima and all eclipsed stations are equivalent maxima. Assert range boundaries, normalization, profile endpoints, prediction preservation, and four hint levels.

Run: `npm run verify:stereochemistry`

Expected: exit 0.

### Task 3: Graphical Stereochemical Navigation Studio

**Files:**
- Create: `src/components/StereochemistryLab.jsx`
- Create: `src/styles/stereochemistry.css`

**Interfaces:**
- Consumes Tasks 1 and 2.
- Produces section anchor `#stereochemistryLab`.

- [ ] **Step 1: Build the persistent three-mode journey**

Render all three benches once and toggle them with semantic tabs so each mode preserves its state:

```text
Mirror centre → Alkene gate → Newman dial
```

Each scenario change resets only that mode's arrangement, assignments, predictions, hints, and evaluation. Switching modes must not reset another mode.

- [ ] **Step 2: Build the tetrahedral mirror chamber**

Render a central tetrahedral SVG with depth-coded solid wedge, planar bond, and hashed retreating bond treatments. Selecting two ligand sockets swaps exactly those ligands. Add a camera-angle control that changes projection only. Keep the mirror chamber shuttered until `Expose mirror` is clicked, then render the explicit odd-transposition mirror beside the original with a superposability/relationship prediction still unmodified.

- [ ] **Step 3: Build the priority board and centre predictions**

For each ligand show four priority buttons. Permit duplicate or missing learner ranks and retain them through a check. Require stereogenic/not-stereogenic, R/S/not-applicable, and enantiomer/same predictions. Report each ligand priority, eligibility, descriptor, and mirror relationship separately.

- [ ] **Step 4: Build the planar alkene gate**

Render a locked double-bond axle with two substituent sockets on each carbon. Provide explicit `swap left pair` and `swap right pair` controls; do not allow a substituent to cross the double bond. Learners select the higher-priority group on each side and predict E, Z, or undefined. Highlight the two chosen comparison paths only after checking.

- [ ] **Step 5: Build the Newman projection dial**

Render the front carbon as a point and rear carbon as a circle, with fixed front bonds and rear bonds rotating through the learner angle. Provide a continuous -180 to +180 dial and seven snap stations. Synchronize a signed-angle readout, IUPAC range strip, nearest-station label, and dimensionless strain curve with a current-position fiducial.

- [ ] **Step 6: Build prediction, hint, trace, teacher, and passport evidence**

Every check keeps the current drawing and predictions. Trace mode changes, scenario changes, socket selections, swaps, camera rotation, mirror exposure, priority choices, alkene side swaps, torsion changes, snap choices, checks, and hints. Teacher prompts compare one versus two swaps, repeated ligands, E/Z eligibility, and butane/ethane torsion symmetry.

- [ ] **Step 7: Apply the projection-table visual system**

```css
--stereo-paper:#f5f1e8;
--stereo-graphite:#171b22;
--stereo-vermilion:#e5484d;
--stereo-indigo:#4c5fd7;
--stereo-teal:#2cb7a4;
--stereo-fiducial:#f2c14e;
```

Use `Avenir Next Condensed` for optical-instrument titles, system sans for teaching copy, and `SFMono-Regular` for priorities/angles. The twin mirror chamber is the one high-detail signature; other panels use restrained registration marks and projection-paper rules. At 760 px and below, stack chambers, keep 44 px controls, allow internal scenario scrolling only, prevent body overflow, and show a clear mode rail. Respect visible focus and reduced motion.

### Task 4: Platform and curriculum integration

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/Header.jsx`
- Modify: module numbering in `src/components/CoordinationFieldLab.jsx`, `src/components/CrystalLatticeLab.jsx`, `src/components/ReactionLab.jsx`, and `src/components/EquationSections.jsx`
- Modify: `src/data/curriculum.js`
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`

**Interfaces:**
- Consumes `#stereochemistryLab`.
- Preserves every existing anchor.

- [ ] **Step 1: Lazy-load after the mechanism studio**

```jsx
const StereochemistryLab = lazy(() => import('./components/StereochemistryLab.jsx'));

<Suspense fallback={<LabFallback id="stereochemistryLab" label="Stereochemical navigation studio"/>}>
  <StereochemistryLab />
</Suspense>
```

- [ ] **Step 2: Make the studio discoverable**

Add `Stereochemical navigation` to desktop and mobile More menus immediately after `Mechanism studio`, with the summary `Swap groups, compare sides, and turn a Newman dial`.

- [ ] **Step 3: Renumber later modules**

Stereochemistry becomes 14, coordination 15, crystal 16, reaction 17, and equation balancing 18. Preserve 01 through 13.

- [ ] **Step 4: Add only truthful curriculum claims**

Mark declared single-centre priority/handedness, declared alkene E/Z, and ethane/butane Newman foundations live in Organic Chemistry. Add a bounded single-centre stereochemical prerequisite to Biochemistry without claiming biomolecular stereochemistry, multiple centres, conformations, folding, recognition, or activity. Keep arbitrary CIP, multi-centre relationships, ring/chair conformations, reaction stereochemistry, and measured conformer thermodynamics outside scope.

- [ ] **Step 5: Document extension seams and review journeys**

README must list all three instruments, data/engine/component/CSS paths, verifier, and boundary. CONTRIBUTING must require one-swap inversion, two-swap restoration, duplicate-ligand eligibility, E/Z side swaps, undefined repeated-substituent case, all seven butane stations, ethane symmetry, preserved wrong assignments, mobile, teacher, source, and passport journeys.

### Task 5: Completion evidence for this milestone

**Files:**
- No new files.

**Interfaces:**
- Verifies Tasks 1–4 and all prior chemistry modules.

- [ ] **Step 1: Run every deterministic verifier**

Run every `npm run verify:*` command, including `verify:stereochemistry`.

- [ ] **Step 2: Build production assets**

Run: `npm run build`

Expected: exit 0 with separate lazy `StereochemistryLab` JavaScript and CSS chunks.

- [ ] **Step 3: Audit as a learner**

Verify manually in the live browser:

- the default lactic-acid priority set starts with no learner priorities or predictions;
- camera rotation changes projection but not the descriptor;
- one explicit ligand swap flips R/S and two swaps restore it;
- wrong priority assignments remain selected and receive ligand-specific reasons;
- the mirror stays shuttered until requested and never changes the original state or predictions;
- the duplicate-ligand gate refuses to assign R/S and explains why;
- one alkene-side swap flips E and Z while preserving connectivity;
- the repeated-substituent alkene remains undefined after either side swap;
- butane at 0, plus/minus 60, plus/minus 120, and 180 reaches the seven declared labels;
- 37 degrees is retained as intermediate with a nearest station rather than snapped automatically;
- ethane reports equivalent staggered and equivalent eclipsed stations;
- hints and checks never move a ligand, swap an alkene side, rotate the rear carbon, or replace a prediction.

- [ ] **Step 4: Audit as a teacher**

Verify all six tetrahedral sets, all six alkene arrangements, both Newman probes, four teacher comparisons, every terminology/source link, every included/excluded passport claim, priority-table provenance, half-open torsion boundary policy, dimensionless-strain boundary, and explicit exclusions.

- [ ] **Step 5: Audit responsive and runtime behavior**

At 390, 742, and 1280 px widths verify hash alignment, no body overflow, no clipped mirror/alkene/Newman graphics, 44 px mobile controls, visible focus, reduced motion, internal scenario cues, More-menu navigation, preserved tab state, and no runtime errors. Restore the normal viewport and leave the lactic-acid centre with empty learner assignments and predictions.
