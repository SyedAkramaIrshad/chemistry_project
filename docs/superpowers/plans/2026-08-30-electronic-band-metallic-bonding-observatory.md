# Electronic Band & Metallic Bonding Observatory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task by task. Keep `docs/CURRENT_PROGRESS.md` current after the milestone.

**Goal:** Add a graphical undergraduate workbench where learners can watch one orbital per site split into finite-chain levels, occupy those levels manually, continue the model to a periodic one-dimensional band, and distinguish a partially filled band from a declared energy gap without turning the teaching model into a real-material property claim.

**Architecture:** Store frozen local teaching presets for an open nearest-neighbour chain, a periodic one-band model, and a declared two-band edge model. A pure immutable engine owns spectra, manual spin placement, occupation audits, cosine dispersion, band width, filling class, band-edge gap classification, prediction scoring, and non-mutating hints. A lazy React section renders the same scientific idea through three linked instruments—Level Splitter, Band Loom, and Gap Gate—plus a teacher rail, action trace, and source-backed model passport.

**Tech stack:** React 19, Vite 8, JavaScript ES modules, semantic HTML, inline SVG, CSS, Node `assert/strict`.

## Scientific contract

### Open finite chain

Use one orthogonal orbital per identical site, an open chain, on-site energy `alpha`, and nearest-neighbour transfer integral `beta`:

```text
E_j = alpha + 2 beta cos(j pi / (N + 1)),  j = 1 ... N
beta = -|beta|
```

- `N` sites produce exactly `N` one-electron levels.
- Each level has two spin slots.
- At `|beta| = 0`, all displayed site-derived levels are degenerate at `alpha`.
- For nonzero coupling, the finite-chain spread is `4 |beta| cos(pi / (N + 1))`.
- At fixed nonzero coupling, increasing `N` crowds more levels into a spread that tends to `4 |beta|`; it does not itself define a wider infinite-chain band.
- Manual occupation blocks only malformed state, an unknown level/spin, duplicate same-spin occupation, and a third electron. It never repairs energy-order mistakes or a wrong electron total.
- At exact zero coupling, do not claim a unique reference occupation across the degenerate site-derived levels. Audit only total count and Pauli capacity there.

### Periodic one-band chain

Use dimensionless reduced wave coordinate `q = ka`:

```text
E(q) = alpha + 2 beta cos(q),  -pi <= q <= pi
band width = 4 |beta|
dE/dq = -2 beta sin(q)
```

- The model is an infinite one-dimensional, one-orbital, nearest-neighbour teaching chain.
- Filling runs from `0` to `2` electrons per site/cell, including spin.
- At zero-temperature bookkeeping and `beta < 0`, a partial filling `nu` has `qF = pi nu / 2`.
- Report empty, partially filled, or full band occupation.
- A partially filled band has occupied and empty states arbitrarily close in this ideal infinite model.
- A full displayed band has no empty state inside that same band; without a second band, it is insufficient evidence for an insulating classification.
- Display `dE/dq` only as a dimensionless dispersion slope. Do not convert it to velocity, current, mobility, or conductivity.

### Declared two-band edge model

Use positive full widths `Wv` and `Wc`:

```text
Ev(q) = EvCenter - (Wv / 2) cos(q)

direct edge alignment:
Ec(q) = EcCenter + (Wc / 2) cos(q)

indirect edge alignment:
Ec(q) = EcCenter - (Wc / 2) cos(q)

Eg = min(Ec) - max(Ev)
```

- `Eg > 0`: positive-gap teaching geometry.
- `Eg = 0`: touching teaching geometry.
- `Eg < 0`: overlapping-band teaching geometry; do not call the negative value a band gap.
- Report whether the declared valence maximum and conduction minimum occur at the same `q` or different `q`.
- Do not solve the electron population of the two-band model.
- Never infer semiconductor versus insulator from a toy gap magnitude alone. Temperature, carriers, defects, scattering, dimensionality, interactions, and measured or validated material evidence remain outside scope.

## Authoritative source boundary

- IUPAC Gold Book: energy band, energy-band theory, conduction band, valence band, band-gap energy, energy gap, Fermi level, and density of states.
- MIT OpenCourseWare: tight binding as an LCAO/MO connection; one-dimensional dispersion, Brillouin-zone, and band-structure foundations.
- ACS inorganic curriculum supplement: metallic bonding, band theory, conductivity, semiconductors, insulators, and defects as undergraduate solid-state materials topics.
- NIST CHIPS-TB: tight binding is tractable and useful, but real material transferability requires parameterization and benchmarking against electronic-structure or experimental evidence.

The source passport must distinguish sourced terminology from locally derived synthetic model output.

## Global constraints

- Add no runtime dependency, backend, model call, paid API, remote runtime chemistry service, or operational chemistry procedure.
- Keep every scenario and calculation local, deterministic, and frozen at the data boundary.
- Preserve all existing modules and anchors.
- Do not perform Git actions.
- Wrong learner occupations and predictions remain visible after checking.
- Hints explain one next comparison and never place electrons, move a cursor, alter parameters, or select an answer.
- No real material names, measured band structures, fitted parameters, transport coefficients, conductivity, resistivity, mobility, current, effective mass, work function, carrier concentration, doping, temperature response, defects, surfaces, magnetism, optical spectra, superconductivity, topological classification, or device performance.
- Do not present the finite chain as a crystal, the periodic chain as a real solid, or the two-band gate as material certification.
- Use `eV` only as the declared illustrative energy unit attached to learner-controlled synthetic parameters.
- Every engine result returned to the UI must be recursively frozen; blocked actions must return the original state reference.
- Respect keyboard focus, semantic controls, minimum 44 px mobile targets, no horizontal body overflow, and `prefers-reduced-motion`.

## Visual direction

**Subject:** The molecular-orbital-to-band transition and the difference between occupancy evidence and gap evidence.

**Audience:** First university course learners and instructors who need a manipulable bridge between molecular orbital diagrams and solid-state band language.

**Single job:** Let the learner follow the same state inventory from isolated site orbitals, through finite split levels, into a periodic band, then decide what filling and band edges do and do not establish.

**Palette:** pale mineral-green ceramic background, navy ink, copper coupling rails, cobalt occupied states, cyan allowed-band weave, ultraviolet gap markers, and a restrained chartreuse occupation edge. Avoid the app's existing dark neon observatories and cream editorial theatres.

**Typography:** `Avenir Next Condensed` for major instrument headings, application system sans for explanation, and `SFMono-Regular` for equations, `q`, energies, and readouts. Add no font dependency.

**Composition:** One large state loom dominates each mode. Atomic resonators feed discrete copper energy slats; the slats visually compress into a woven band curtain; the Gap Gate displays literal daylight between two ribbons. Controls flank the loom like a physical test bench rather than a dashboard card grid.

**Signature interaction:** A persistent three-frame continuity strip shows `site orbital -> N finite levels -> periodic band`. The active frame expands into the current instrument, making the conceptual bridge visible rather than explanatory copy only.

**Generic-default critique:** Do not use a dark rounded-card dashboard, floating gradient blobs, equal-size metric cards, oversized marketing type, or decorative animation unrelated to state. Keep panels mechanically connected by rails, guide lines, and the same energy axis.

---

## Task 1: Frozen presets, source records, passport, and red verifier

**Files:**

- Create: `src/data/electronicBandScenarios.js`
- Modify: `src/data/scienceSources.js`
- Create: `scripts/verify-electronic-bands.mjs`
- Modify: `package.json`

**Produces:**

- `FINITE_CHAIN_PRESETS`, `FINITE_CHAIN_PRESET_BY_ID`
- `PERIODIC_BAND_PRESETS`, `PERIODIC_BAND_PRESET_BY_ID`
- `TWO_BAND_PRESETS`, `TWO_BAND_PRESET_BY_ID`
- `ELECTRONIC_BAND_MODEL_BOUNDARY`
- `MODEL_PASSPORTS.electronicBandObservatory`
- `npm run verify:electronic-bands`

- [ ] **Step 1: Add a recursive local freeze helper and finite-chain presets**

Declare six records:

```js
[
  { id:'dimer', siteCount:2, couplingEv:1, onsiteEnergyEv:0, targetElectronCount:2 },
  { id:'fourSite', siteCount:4, couplingEv:.5, onsiteEnergyEv:0, targetElectronCount:4 },
  { id:'sixWeak', siteCount:6, couplingEv:.25, onsiteEnergyEv:0, targetElectronCount:6 },
  { id:'sixStrong', siteCount:6, couplingEv:1, onsiteEnergyEv:0, targetElectronCount:6 },
  { id:'twelveSite', siteCount:12, couplingEv:1, onsiteEnergyEv:0, targetElectronCount:12 },
  { id:'isolatedSix', siteCount:6, couplingEv:0, onsiteEnergyEv:0, targetElectronCount:6 },
]
```

Each also has `code`, `name`, `question`, and `comparison`. Freeze every record, array, lookup, and boundary string.

- [ ] **Step 2: Add periodic one-band presets**

Declare empty, quarter-filled, half-filled, full, and stronger-coupling records. Use `onsiteEnergyEv:0`, negative `betaEv`, filling in electrons per cell, and a default `qCursor`.

```js
{ id:'halfFilled', betaEv:-1, electronsPerCell:1, qCursor:0.75 }
{ id:'fullBand', betaEv:-1, electronsPerCell:2, qCursor:1.2 }
```

The labels must say these are synthetic periodic-chain cases, not metals or named materials.

- [ ] **Step 3: Add five declared two-band presets**

Cover:

```text
direct positive gap: Eg = 1.0 eV
direct touching: Eg = 0.0 eV
direct overlap: edge overlap = 1.0 eV
indirect positive gap: Eg = 1.0 eV
narrow direct positive gap: Eg = 0.2 eV
```

Use `valenceCenterEv`, `valenceWidthEv`, `conductionCenterEv`, `conductionWidthEv`, and `alignment`. Freeze these exact synthetic contracts:

```js
{ id:'directGap', valenceCenterEv:-1, valenceWidthEv:1, conductionCenterEv:1, conductionWidthEv:1, alignment:'direct', expectedGapEv:1 }
{ id:'directTouch', valenceCenterEv:-.5, valenceWidthEv:1, conductionCenterEv:.5, conductionWidthEv:1, alignment:'direct', expectedGapEv:0 }
{ id:'directOverlap', valenceCenterEv:0, valenceWidthEv:1, conductionCenterEv:0, conductionWidthEv:1, alignment:'direct', expectedOverlapEv:1, expectedEdgeRelation:'overlap' }
{ id:'indirectGap', valenceCenterEv:-1, valenceWidthEv:1, conductionCenterEv:1, conductionWidthEv:1, alignment:'indirect', expectedGapEv:1 }
{ id:'narrowDirectGap', valenceCenterEv:-.6, valenceWidthEv:1, conductionCenterEv:.6, conductionWidthEv:1, alignment:'direct', expectedGapEv:.2 }
```

The direct/indirect presets share the same scalar `Eg`; only edge `q` positions differ.

- [ ] **Step 4: Register the authoritative sources**

Add these keys to `SCIENCE_SOURCES`:

```text
iupacEnergyBand
iupacEnergyBandTheory
iupacConductionBand
iupacValenceBand
iupacBandGapEnergy
iupacEnergyGap
iupacFermiLevel
iupacDensityStates
mitTightBindingLcao
mitOneDimensionalTightBinding
acsInorganicSolidStateSupplement
nistChipsTightBinding
```

Roles must say exactly what terminology or curricular boundary each supports. Do not say that MIT, ACS, or NIST validates this app's numerical presets.

- [ ] **Step 5: Add a complete model passport**

`MODEL_PASSPORTS.electronicBandObservatory` must include:

- exact finite open-chain level formula and Pauli-valid manual occupation;
- exact periodic cosine dispersion, band width, filling class, and dimensionless slope;
- exact declared two-band edge comparison;
- synthetic inputs and local output provenance;
- all excluded real-material, transport, many-body, structural, spectral, and device claims from Global constraints;
- every new source key.

- [ ] **Step 6: Write the focused verifier before the engine**

The verifier imports the planned Task 2 functions so its first run fails only because `src/chemistry/electronicBands.js` does not exist.

Initial data assertions:

```js
assert.equal(FINITE_CHAIN_PRESETS.length, 6);
assert.equal(PERIODIC_BAND_PRESETS.length, 5);
assert.equal(TWO_BAND_PRESETS.length, 5);
assert.ok(Object.isFrozen(FINITE_CHAIN_PRESETS));
assert.equal(TWO_BAND_PRESET_BY_ID.directGap.expectedGapEv, 1);
assert.equal(TWO_BAND_PRESET_BY_ID.directTouch.expectedGapEv, 0);
assert.equal(TWO_BAND_PRESET_BY_ID.directOverlap.expectedEdgeRelation, 'overlap');
```

- [ ] **Step 7: Register and run the red verifier**

Add:

```json
"verify:electronic-bands": "node scripts/verify-electronic-bands.mjs"
```

Run `npm run verify:electronic-bands`.

Expected: nonzero only for the missing engine module.

---

## Task 2: Pure immutable finite-chain engine

**Files:**

- Create: `src/chemistry/electronicBands.js`
- Modify: `scripts/verify-electronic-bands.mjs`

**Produces:**

- `finiteChainSpectrum(input)`
- `createFiniteChainState(inputOrPresetId)`
- `updateFiniteChainState(input)`
- `clearFiniteChainState(input)`
- `placeFiniteElectron(input)`
- `removeFiniteElectron(input)`
- `buildFiniteReferenceState(input)`
- `analyzeFiniteChain(input)`
- `evaluateFiniteChain(input)`
- `nextFiniteChainHint(input)`

- [ ] **Step 1: Validate all finite-chain inputs explicitly**

Require integer `siteCount` from 2 through 16, `couplingEv` from 0 through 1.5, `onsiteEnergyEv` from -3 through 3, and integer `targetElectronCount` from 0 through `2 * siteCount`. Return `{valid:false, reason, input}` for invalid model requests.

- [ ] **Step 2: Calculate exact finite-chain levels**

Return levels sorted low-to-high with `id`, `rank`, `modeIndex`, `energyEv`, `offsetEv`, and two spin slots. Also return `levelCount`, `finiteSpreadEv`, `infiniteLimitWidthEv`, `degenerate`, and the equation string.

Numerical coverage:

```js
const dimer = finiteChainSpectrum({siteCount:2,couplingEv:1,onsiteEnergyEv:0});
assert.deepEqual(dimer.levels.map(level => rounded(level.energyEv)), [-1, 1]);
assert.equal(rounded(dimer.finiteSpreadEv), 2);

const six = finiteChainSpectrum({siteCount:6,couplingEv:1,onsiteEnergyEv:0});
close(six.finiteSpreadEv, 4 * Math.cos(Math.PI / 7));
assert.equal(six.levelCount, 6);
```

- [ ] **Step 3: Build and validate immutable manual occupation state**

Use:

```js
{
  siteCount:6,
  couplingEv:1,
  onsiteEnergyEv:0,
  targetElectronCount:6,
  occupancy:{L1:[],L2:[],L3:[],L4:[],L5:[],L6:[]},
}
```

Freeze the state recursively. Placement accepts only spin `1` or `-1`, rejects duplicate same-spin occupation and a full level, and returns the original state reference when blocked. Removal addresses one existing spin arrow and leaves the source state unchanged.

`updateFiniteChainState({state,patch})` validates the entire candidate model. Coupling, on-site energy, and target-electron edits preserve occupation exactly. A changed site count returns a new empty rack plus `occupationReset:true` and an explicit reason because the set of level identities changed. Invalid patches return the original state reference. `clearFiniteChainState({state})` creates a new empty state with the same model parameters.

- [ ] **Step 4: Build a requested reference without automatic use**

For nonzero coupling, fill levels low-to-high with opposite spins per level. For exact zero coupling, return `allowed:false`, `unique:false`, the original state reference, and an explicitly declared count-only reference boundary. The explicit reference button must therefore be a true no-op in the degenerate limit and must not imply that one arrangement is preferred.

- [ ] **Step 5: Analyze independent evidence**

Return:

```js
{
  electronCount,
  targetElectronCount,
  electronCountCorrect,
  aufbau:{applicable,correct,violations,reason},
  occupiedLevelCount,
  singlyOccupiedLevelCount,
  highestOccupiedEnergyEv,
  firstEmptyEnergyEv,
  referenceUnique,
  levelDensityStatement,
  boundary,
}
```

At zero coupling, `aufbau.applicable` is false and `correct` is null.

- [ ] **Step 6: Evaluate four learner claims without mutation**

Predictions:

```js
{
  levelCount:'6',
  splitState:'split',          // degenerate | split
  moreSitesEffect:'closer',    // closer | wider | unchanged
  modelKind:'finite-levels',   // finite-levels | periodic-band | measured-solid
}
```

Score these separately from electron count and energy-order occupation. `committed` requires target count, applicable reference occupation, and all four predictions; at exact zero coupling it requires count plus all four predictions and marks the non-unique occupation dimension neutral.

- [ ] **Step 7: Add four non-mutating hints**

Hint ladder:

```text
1 one source orbital per site
2 compare beta = 0 with beta != 0
3 hold beta fixed while increasing N
4 distinguish a finite spectrum from a periodic band
```

- [ ] **Step 8: Complete finite-chain verification**

Assert all six presets, exact dimer levels, finite-spread formula, approach to the infinite width, immutable parameter updates, explicit site-count reset, manual placement/removal, blocked-action reference identity, a preserved wrong electron total, a preserved Aufbau violation, zero-coupling non-unique no-op reference status, reference loading only when called, wrong prediction preservation, recursive output freezing, and all hint levels. At zero coupling, the expected `moreSitesEffect` is `unchanged`; at nonzero coupling it is `closer`.

---

## Task 3: Periodic one-band and declared two-band engines

**Files:**

- Modify: `src/chemistry/electronicBands.js`
- Modify: `scripts/verify-electronic-bands.mjs`

**Produces:**

- `analyzePeriodicBand(input)`
- `evaluatePeriodicBand(input)`
- `nextPeriodicBandHint(input)`
- `analyzeTwoBandEdges(input)`
- `evaluateTwoBandEdges(input)`
- `nextTwoBandHint(input)`

- [ ] **Step 1: Implement the periodic cosine band**

Validate `betaEv` from -1.5 through -0.1, `onsiteEnergyEv` from -3 through 3, `electronsPerCell` from 0 through 2, and `qCursor` from `-pi` through `pi`. Return 81 frozen samples including both zone edges and `q = 0`.

- [ ] **Step 2: Derive occupation evidence**

Return exact `bandMinimumEv`, `bandMaximumEv`, `bandWidthEv`, `occupationClass`, `occupiedFraction`, `qF` and `fermiLevelWithinBandEv` only for a partial band, `nearbyEmptyStatesWithinBand`, selected `energyEv`, and selected `slopeEvPerQ`. Label the partial-band value in the UI as the `T = 0 occupation edge / Fermi energy in this model`; never display a Fermi value for an empty or full isolated one-band ledger.

Required cases:

```text
nu = 0       empty; nearby-empty question not applicable
0 < nu < 2   partially filled; nearby empty states available
nu = 2       full; no empty states within this displayed band
```

Do not return conductivity, velocity, current, effective mass, or material class.

- [ ] **Step 3: Evaluate four periodic-band claims**

Predictions:

```js
{
  bandWidthEv:'4.00',
  occupationClass:'partially-filled',
  nearbyEmpty:'yes',
  slopeMeaning:'dispersion-only',
}
```

Use a visible 0.01 eV comparison tolerance only for typed width. Preserve every learner value.

- [ ] **Step 4: Add four periodic hints**

Hint ladder: read `4|beta|`; compare filling with spin capacity 2; inspect whether occupied and empty regions meet; distinguish `dE/dq` from transport.

- [ ] **Step 5: Implement two-band edge geometry**

Validate each width from 0.2 through 3 eV, each center from -4 through 4 eV, alignment `direct` or `indirect`, and cursor `q`. Return 81 points for each band and exact maxima/minima with `q` positions.

Use tolerance `1e-9` for zero classification:

```js
edgeRelation = gapEv > eps ? 'positive-gap' : gapEv < -eps ? 'overlap' : 'touching';
```

For overlap, return positive `overlapEv = -gapEv` and `displayGapEv:null` so the UI never prints a negative value as a gap.

- [ ] **Step 6: Evaluate four edge claims**

Predictions:

```js
{
  edgeRelation:'positive-gap',
  magnitudeEv:'1.00',
  edgeAlignment:'direct',
  materialClaim:'teaching-model-only',
}
```

For overlap, `magnitudeEv` is the overlap magnitude. The reason text must use “edge overlap,” not “negative band gap.”

- [ ] **Step 7: Add four gap hints**

Hint ladder: find valence maximum; find conduction minimum; compare their energies and `q` positions; state why the toy geometry does not certify a material.

- [ ] **Step 8: Complete focused verification**

Assert every periodic and gap preset, `4|beta|`, quarter/half/full occupation, `qF`, partial-band nearby-state status, full-band insufficiency, exact direct/indirect extrema positions, positive/touching/overlap classification, overlap terminology, no prohibited transport/material keys, wrong prediction preservation, recursive freezing, and all hint levels.

Run `npm run verify:electronic-bands`.

Expected: exit 0.

---

## Task 4: Graphical React State Loom

**Files:**

- Create: `src/components/ElectronicBandLab.jsx`
- Create: `src/styles/electronic-bands.css`

**Consumes:** Tasks 1–3.

- [ ] **Step 1: Build the section hero and continuity strip**

Section anchor: `#electronicBandLab`.

Header:

```text
30 / Electronic bands & metallic bonding
Add atoms. Watch one orbital become many levels—then a band.
Fill the states yourself. A partially filled band and a true energy gap are different evidence.
```

The hero graphic shows six orbital resonators entering a copper coupling rail, splitting into discrete energy slats, and continuing into a cyan band ribbon. It is explanatory SVG/CSS, not simulation output.

Add three semantic mode tabs:

```text
Level Splitter — finite chain · manual occupation
Band Loom — periodic dispersion · filling
Gap Gate — two declared bands · edge relation
```

Use actual `role="tablist"`, `role="tab"`, `aria-selected`, and labelled panels. Preserve each mode's state while switching.

- [ ] **Step 2: Build Level Splitter controls and manual occupation**

Controls:

- six preset cartridges;
- site-count range/number, 2–16;
- coupling range/number, 0–1.5 eV;
- target-electron range/number, 0–`2N`;
- spin-up and spin-down cartridges;
- clear; explicit “Load declared reference”;
- check and four hint buttons.

Changing site count loads a new empty level rack with a visible reason because level identities changed. Coupling and target-count edits preserve the existing spin placement. They never repair it.

Render:

- source-site resonators;
- one exact slat per level on a shared energy axis;
- independent add controls and removable spin arrows;
- current finite spread and infinite-limit comparison;
- a compression mini-strip comparing current `N` with `N + 4` at fixed coupling;
- separate count, Aufbau, and four-prediction feedback.

At zero coupling, show a clear “degenerate / no unique reference arrangement” gate.

- [ ] **Step 3: Build Band Loom controls and plot**

Controls:

- five preset cartridges;
- `|beta|` range/number;
- electrons per cell range/number, step 0.05;
- `q` cursor range/number from `-pi` to `pi`;
- four predictions, check, and hints.

Render a responsive SVG `E` versus `q` plot with:

- woven cyan cosine band;
- cobalt occupied segment and unfilled outline;
- a chartreuse occupation-edge marker only for a partial band;
- current `q` cursor, state energy, and dimensionless slope;
- exact zone-edge labels `-pi`, `0`, `pi`;
- band width bracket;
- a separate state-availability rail showing empty/occupied capacity.

Never animate an electron as a particle travelling through the lattice. Motion may only breathe the loom guides and must stop under reduced motion.

- [ ] **Step 4: Build Gap Gate controls and plot**

Controls:

- five preset cartridges;
- valence and conduction center ranges;
- valence and conduction width ranges;
- direct/indirect alignment toggle;
- `q` cursor;
- four predictions, check, and hints.

Render valence and conduction ribbons on one energy axis. For a positive gap, expose literal background between the closest edges and draw an ultraviolet `Eg` bracket. For touching, close the gate to one line. For overlap, hatch the shared energy interval and label `edge overlap`; never show a negative gap badge.

Show `q` markers at the valence maximum and conduction minimum so direct versus indirect is visible.

- [ ] **Step 5: Preserve learner state and stale evaluations honestly**

Every parameter, occupation, or prediction change after a check marks that result “previous audit” without deleting it. Checking never changes controls or occupation. Preset loading creates a new explicit experiment and logs it.

- [ ] **Step 6: Add action trace and teacher lens**

Trace at least the last eight actions: mode change, preset load, control change, spin placement/removal, blocked placement, reference load, prediction check, and hint reveal.

Teacher contrasts:

1. `N` source orbitals produce `N` levels, not `N` bands.
2. Increasing `N` crowds levels; increasing `|beta|` widens the periodic teaching band.
3. Shared/delocalized states do not mean “no bonding.”
4. A full single displayed band does not establish an insulator without the next allowed band.
5. A dispersion slope is not conductivity.
6. A positive toy gap does not certify semiconductor versus insulator.

- [ ] **Step 7: Add model passport and sources**

Render conditions, includes, excludes, provenance, data statement, equation ledger, and every linked source. Explicitly label the MIT/ACS/NIST records as conceptual/curricular/model-boundary sources, not validation of the synthetic presets.

- [ ] **Step 8: Implement responsive and accessibility states**

- At 1280 px, use a wide loom plus side console.
- At 742 px, stack the console above the plot and keep the continuity strip intact.
- At 390 px, use internal horizontal rails only for presets, provide a visible swipe cue, keep all controls 44 px tall, and keep SVG labels legible.
- Ensure no body overflow.
- Add `:focus-visible` for every button, range, number, select, and disclosure summary.
- Add reduced-motion rules for all transitions/animations.
- Provide descriptive SVG `title`/`desc` and text readouts for every visual result.

---

## Task 5: Platform and curriculum integration

**Files:**

- Modify: `src/App.jsx`
- Modify: `src/components/Header.jsx`
- Modify: `src/components/PolymerPopulationLab.jsx`
- Modify: `src/components/ReactionLab.jsx`
- Modify: `src/components/EquationSections.jsx`
- Modify: `src/data/curriculum.js`
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`

- [ ] **Step 1: Lazy-load after Crystal Lattice**

```jsx
const ElectronicBandLab = lazy(() => import('./components/ElectronicBandLab.jsx'));

<Suspense fallback={<LabFallback id="electronicBandLab" label="Electronic band and metallic bonding observatory" />}>
  <ElectronicBandLab />
</Suspense>
```

Keep `CrystalLatticeLab` before it and `PolymerPopulationLab` after it.

- [ ] **Step 2: Add desktop and mobile More-lab navigation**

Place an `Electronic bands` entry immediately after `Crystal lattice`, using a band/ribbon symbol and copy that says “Split site levels, fill a band, and test a gap.” Preserve all existing direct links and menu-close behavior.

- [ ] **Step 3: Renumber only later sections**

```text
Crystal lattice remains 29
Electronic bands becomes 30
Polymer populations 30 -> 31
Reaction chamber 31 -> 32
Equation balancer 32 -> 33
```

- [ ] **Step 4: Make only truthful curriculum additions**

Expected result: 103 live topic clusters, 11 explicit gap rows, and zero concept-only rows.

General Chemistry:

- add an outcome and extend the existing declared molecular-orbital foundations row to include the finite-level-to-band bridge without adding a separate topic row;
- add live lab link to `#electronicBandLab`;
- extend model boundary with the finite/periodic/gap limits.

Inorganic Chemistry:

- replace `Metal-bonding boundaries` concept row with live `Metallic bonding and band-formation foundations`;
- add an outcome and live lab link;
- state that organometallic bonding and real electronic structure remain outside scope.

Physical Chemistry:

- add live topic `Finite-chain splitting, periodic dispersion, and band occupancy`;
- add outcome and live lab link;
- keep computational electronic structure outside scope.

Materials Chemistry:

- add live topic `Electronic-band model prerequisite`;
- rename the existing gap to `Real computed material properties and electronic structure`, keeping it `next-engine`;
- add an outcome and live lab link;
- keep transport and real material prediction outside scope.

This adds two new live rows and converts one existing concept row to live: `100 + 2 + 1 = 103` live; `12 - 1 = 11` gaps.

- [ ] **Step 5: Update README and contribution journeys**

README:

- 103 live topic clusters;
- 33 ordered sections;
- 31 verifier commands;
- data/engine/component/CSS/verifier paths;
- all three model equations and boundaries;
- implementation and review journey.

CONTRIBUTING review journeys:

- duplicate spin and third-electron block with identity preservation;
- wrong finite occupation retained;
- zero-coupling non-unique reference;
- six weak versus strong coupling;
- half-filled versus full periodic band;
- direct gap, touching, overlap, and indirect edge;
- wrong predictions retained;
- teacher/source/passport review;
- desktop/tablet/mobile/focus/reduced-motion review.

---

## Task 6: Durable progress update and completion evidence

**Files:**

- Modify: `docs/CURRENT_PROGRESS.md`
- Create screenshots only if browser review produces stable milestone evidence.

- [ ] **Step 1: Run the focused verifier**

Run `npm run verify:electronic-bands`.

Expected: exit 0.

- [ ] **Step 2: Audit as a learner in the live browser**

Required flows:

- Level Splitter: load six-site weak coupling, place a wrong high-energy electron, verify it remains and receives a reason; then manually correct or explicitly load the reference.
- Level Splitter: attempt duplicate spin and a third electron; verify each is blocked and the state remains unchanged.
- Level Splitter: set coupling to zero; verify all levels coincide and no unique reference arrangement is claimed.
- Band Loom: compare half-filled and full cases; verify nearby empty-state language changes without claiming conductivity or insulation.
- Band Loom: increase `|beta|`; verify width changes from exact `4|beta|` while filling stays learner-controlled.
- Gap Gate: resolve direct positive, touching, overlap, and indirect positive cases; verify overlap terminology never uses a negative gap badge.
- Change controls after each check; verify the previous audit remains visibly stale.

- [ ] **Step 3: Audit as a teacher**

Verify all six contrasts, exact equations, source roles, source links, included/excluded claims, and the distinction between sourced terminology and synthetic output.

- [ ] **Step 4: Audit responsive and accessibility behavior**

At 1280, 742, and 390 px verify hash alignment, no body overflow, usable preset rails, 44 px mobile controls, readable plot labels, visible focus where the browser can exercise it, and clean console. Exercise reduced motion if the browser exposes emulation; otherwise record it as CSS-verified but not runtime-emulated.

- [ ] **Step 5: Run structural and regression validation**

Run every `npm run verify:*` command and `npm run build`.

Expected:

- 31/31 verifier commands exit 0;
- production build exits 0;
- a Vite main-chunk size advisory may remain non-fatal if unchanged in nature;
- no runtime console error in reviewed journeys.

- [ ] **Step 6: Update the compaction-safe checkpoint**

Update `docs/CURRENT_PROGRESS.md` with:

- exact implemented scope;
- exact files changed/created;
- verifier/build/browser results;
- screenshot paths, if any;
- new live/gap/section counts;
- remaining practical-limit gaps;
- explicit note that real electronic structure and transport remain future engines;
- current goal status as active, not complete.

Do not claim the broader university chemistry platform is complete.
