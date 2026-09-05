# Atomic Signal Observatory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a graphical undergraduate atomic-structure laboratory where learners manually construct neutral H–Kr ground-state electron configurations, test quantum-number addresses, and interpret measured first-ionization-energy periodicity without hiding exceptions.

**Architecture:** Keep authoritative element records and source-backed display metadata in one frozen data module, and put all configuration mutation and evaluation in a pure immutable chemistry engine. A lazy-loaded React laboratory consumes those interfaces, preserves valid wrong attempts until the learner commits them, and separates the ground-configuration model from the NIST measured ionization-energy dataset. The UI is integrated into navigation, curriculum claims, source passports, and open-source documentation only after the engine passes deterministic reference cases.

**Tech Stack:** React 19, Vite 8, JavaScript ES modules, semantic HTML, inline SVG, CSS, Node `assert/strict`.

## Global Constraints

- Cover neutral elements H through Kr only; do not infer arbitrary ionic configurations, excited states, term symbols, spectra, radii, electron affinities, or bonding.
- Use NIST ground-state configurations and first-ionization energies as declared records; preserve chromium `[Ar] 3d5 4s1` and copper `[Ar] 3d10 4s1` as measured ground-state exceptions.
- Allow any Pauli-valid learner placement in the displayed orbital set; do not automatically move or repair electrons.
- Block only impossible orbital actions and explain the exact reason at the attempted site.
- Compare a committed arrangement against total electron count, NIST subshell occupation, and introductory Hund-style degeneracy patterns as separate dimensions.
- Present orbital graphics as qualitative wavefunction/probability-density isosurface silhouettes, never trajectories, measured atom sizes, or computed many-electron densities.
- Distinguish the NIST ionization-energy record from any explanatory trend narrative; a trend is not an exception-free law.
- Preserve all existing laboratories and their deterministic verifiers.
- Use no new runtime dependency, external model, paid API, backend, or operational chemistry procedure.
- Do not perform Git actions; project instructions outrank the plan skill's usual commit cadence.

---

### Task 1: Source-backed H–Kr records and model passport

**Files:**
- Create: `src/data/atomicElements.js`
- Modify: `src/data/scienceSources.js`
- Create: `scripts/verify-atomic-structure.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `ATOMIC_SUBSHELLS`, `ATOMIC_ELEMENTS`, `ATOMIC_ELEMENT_BY_Z`, `ATOMIC_ELEMENT_BY_SYMBOL`, `ATOMIC_MODEL_BOUNDARY`.
- Produces passport: `MODEL_PASSPORTS.atomicSignalObservatory`.
- Consumes no application state.

- [x] **Step 1: Declare the orbital and element records**

Use this record shape for every element from atomic number 1 through 36:

```js
{
  atomicNumber: 24,
  symbol: 'Cr',
  name: 'Chromium',
  period: 4,
  group: 6,
  block: 'd',
  atomicWeight: 51.996,
  ionizationEnergyEV: 6.7665,
  groundSubshells: { '1s': 2, '2s': 2, '2p': 6, '3s': 2, '3p': 6, '4s': 1, '3d': 5, '4p': 0 },
  shorthand: '[Ar] 3d⁵ 4s¹',
  exceptionNote: 'The NIST ground-state record is 3d⁵ 4s¹, not the simple 3d⁴ 4s² filling prediction.',
}
```

`ATOMIC_SUBSHELLS` must be frozen in displayed energy order:

```js
[
  { id:'1s', n:1, l:0, label:'1s', capacity:2, orbitalCount:1, ml:[0] },
  { id:'2s', n:2, l:0, label:'2s', capacity:2, orbitalCount:1, ml:[0] },
  { id:'2p', n:2, l:1, label:'2p', capacity:6, orbitalCount:3, ml:[-1,0,1] },
  { id:'3s', n:3, l:0, label:'3s', capacity:2, orbitalCount:1, ml:[0] },
  { id:'3p', n:3, l:1, label:'3p', capacity:6, orbitalCount:3, ml:[-1,0,1] },
  { id:'4s', n:4, l:0, label:'4s', capacity:2, orbitalCount:1, ml:[0] },
  { id:'3d', n:3, l:2, label:'3d', capacity:10, orbitalCount:5, ml:[-2,-1,0,1,2] },
  { id:'4p', n:4, l:1, label:'4p', capacity:6, orbitalCount:3, ml:[-1,0,1] },
]
```

- [x] **Step 2: Register exact source roles**

Add source records for IUPAC atomic orbital, electronic configuration, aufbau principle, Pauli exclusion principle, Hund rules, NIST electronic configurations, NIST SP 966 periodic table, and NIST ground levels/ionization energies. The model passport must list included and excluded claims, data provenance, equations or rules in use, and the exact H–Kr boundary.

- [x] **Step 3: Write the data-contract assertions before the engine exists**

```js
assert.equal(ATOMIC_ELEMENTS.length, 36);
assert.deepEqual(ATOMIC_ELEMENTS.map((element) => element.atomicNumber), Array.from({length:36}, (_, index) => index + 1));
assert.equal(ATOMIC_ELEMENT_BY_SYMBOL.Cr.shorthand, '[Ar] 3d⁵ 4s¹');
assert.equal(ATOMIC_ELEMENT_BY_SYMBOL.Cu.shorthand, '[Ar] 3d¹⁰ 4s¹');
assert.equal(ATOMIC_ELEMENT_BY_SYMBOL.Fe.ionizationEnergyEV, 7.9025);
assert.equal(ATOMIC_SUBSHELLS.reduce((sum, item) => sum + item.capacity, 0), 36);
```

Import the planned engine exports so this script initially fails with a missing-module error.

- [x] **Step 4: Run the red verifier**

Run: `npm run verify:atomic-structure`

Expected: non-zero exit caused by missing `src/chemistry/atomicStructure.js`, proving the new verifier is executing.

### Task 2: Pure immutable atomic-structure engine

**Files:**
- Create: `src/chemistry/atomicStructure.js`
- Modify: `scripts/verify-atomic-structure.mjs`

**Interfaces:**
- Consumes: `ATOMIC_SUBSHELLS`, `ATOMIC_ELEMENT_BY_Z`.
- Produces: `createEmptyAtomicState()`, `placeAtomicElectron(input)`, `removeAtomicElectron(input)`, `loadClosedCore(atomicNumber)`, `buildReferenceOrbitalState(atomicNumber)`, `atomicConfigurationNotation(state)`, `atomicStateMetrics(state)`, `evaluateAtomicConfiguration(input)`, `quantumAddressForElectron(input)`, `evaluateQuantumPrediction(input)`, `nextAtomicHint(input)`, `compareIonizationEnergies(input)`.

- [x] **Step 1: Implement immutable orbital state creation and mutation**

Represent each orbital as an array containing spin values `1` or `-1`:

```js
{
  '1s': [[]],
  '2s': [[]],
  '2p': [[], [], []],
  '3s': [[]],
  '3p': [[], [], []],
  '4s': [[]],
  '3d': [[], [], [], [], []],
  '4p': [[], [], []],
}
```

`placeAtomicElectron` must reject an unknown subshell, invalid orbital index, non-unit spin, a third electron, or a duplicate spin in one orbital. A rejected result returns the original state reference and a site-specific reason. An allowed result returns a deep-cloned state.

- [x] **Step 2: Build the NIST reference occupation**

Expand each element's `groundSubshells` with one same-spin electron per degenerate orbital before pairing:

```js
const occupySubshell = (count, orbitalCount) => {
  const orbitals = Array.from({length:orbitalCount}, () => []);
  for (let index = 0; index < Math.min(count, orbitalCount); index += 1) orbitals[index].push(1);
  for (let index = 0; index < Math.max(0, count - orbitalCount); index += 1) orbitals[index].push(-1);
  return orbitals;
};
```

The element record, rather than an exception-repair heuristic, is authoritative.

- [x] **Step 3: Evaluate dimensions separately**

`evaluateAtomicConfiguration({atomicNumber,state,predictedMagnetism,predictedUnpaired})` returns:

```js
{
  valid: true,
  committed: false,
  electronCount: { correct:false, actual:5, expected:6, reason:'One electron still needs to be placed.' },
  subshells: { correct:false, mismatches:[{id:'2p', actual:1, expected:2}], reason:'The 2p subshell has 1 electron; the NIST ground-state record has 2.' },
  hund: { correct:true, violations:[], reason:'Occupied degenerate orbitals use the introductory maximum-unpaired pattern.' },
  magnetism: { correct:false, actual:'paramagnetic', predicted:'diamagnetic', unpaired:2, reason:'Two unpaired electrons make this orbital diagram paramagnetic in the spin-only classification.' },
  exactGroundPattern: false,
}
```

Do not erase or rewrite `state` during evaluation.

- [x] **Step 4: Implement quantum-address evaluation**

`quantumAddressForElectron({subshellId,orbitalIndex,electronIndex,state})` derives `n`, `l`, `ml`, and `ms` from the selected actual electron. `evaluateQuantumPrediction` scores all four dimensions independently and explains allowed ranges when wrong.

- [x] **Step 5: Implement hints and measured-energy comparison**

Hints progress from electron count, to first mismatched subshell, to Hund pattern, to the full NIST shorthand; they never mutate the learner state. `compareIonizationEnergies` reports the selected NIST values, signed difference, higher element, and a warning that the two-point result is a measured record rather than a universal monotonic law.

- [x] **Step 6: Complete deterministic coverage**

Assert at least:

```js
assert.equal(atomicStateMetrics(buildReferenceOrbitalState(6)).unpairedElectrons, 2);
assert.equal(evaluateAtomicConfiguration({atomicNumber:6,state:buildReferenceOrbitalState(6),predictedMagnetism:'paramagnetic',predictedUnpaired:2}).committed, true);
assert.deepEqual(subshellTotals(buildReferenceOrbitalState(24)), {'1s':2,'2s':2,'2p':6,'3s':2,'3p':6,'4s':1,'3d':5,'4p':0});
assert.deepEqual(subshellTotals(buildReferenceOrbitalState(29)), {'1s':2,'2s':2,'2p':6,'3s':2,'3p':6,'4s':1,'3d':10,'4p':0});
assert.equal(placeAtomicElectron({state:createEmptyAtomicState(),subshellId:'1s',orbitalIndex:0,spin:1}).allowed, true);
assert.equal(placeAtomicElectron({state:oneUpState,subshellId:'1s',orbitalIndex:0,spin:1}).allowed, false);
```

Run: `npm run verify:atomic-structure`

Expected: exit 0 with H–Kr records, carbon Hund pattern, chromium/copper exceptions, quantum addresses, immutable blocked actions, hints, and ionization comparisons verified.

### Task 3: Graphical Atomic Signal Observatory

**Files:**
- Create: `src/components/AtomicStructureLab.jsx`
- Create: `src/styles/atomic-structure.css`

**Interfaces:**
- Consumes all Task 1 data and Task 2 pure functions.
- Produces section anchor `#atomicStructureLab`.

- [x] **Step 1: Build the semantic learner journey**

Use this order in DOM and responsive layouts:

```text
Element tuner → configuration target → probability-cloud theatre
Orbital rack → prediction console → committed feedback
Quantum-address challenge → ionization terrain
Learning trace → teacher lens → model passport
```

Default to carbon so an empty-state learner can complete the first exercise without excessive clicking. Changing element explicitly clears the arrangement and records that action.

- [x] **Step 2: Build the periodic selector and target**

Render H–Kr in real group/period positions. Every element button exposes symbol, atomic number, block, and selected state. Provide explicit actions `Start empty`, `Load closed core`, and `Show NIST reference`; only the learner can invoke them.

- [x] **Step 3: Build the probability-cloud theatre**

Render inline SVG silhouettes for selected s, p, and d orbitals with phase-separated lobes, node labels, orientation reticles, and a slow instrument-scan motion disabled under `prefers-reduced-motion`. Visible copy must state: “Qualitative isosurface silhouette—not an electron path, measured radius, or computed many-electron density.”

- [x] **Step 4: Build the orbital rack**

Render every displayed subshell at a labeled energy level. Each orbital offers distinct `Add ↑`, `Add ↓`, and electron-removal controls with 44 px mobile targets. Impossible placements stay blocked with a reason next to that orbital; physically possible but non-ground placements stay where the learner put them.

- [x] **Step 5: Build prediction, quantum, and feedback consoles**

Before checking, require a magnetism choice and unpaired-electron prediction. Score electron count, subshell allocation, Hund pattern, and magnetism independently. Clicking a placed electron selects it for an `n / l / mₗ / mₛ` prediction dock; wrong values remain selected after feedback.

- [x] **Step 6: Build the ionization terrain**

Plot the 36 NIST first-ionization energies as an accessible SVG line/point terrain grouped by period. Selecting two elements creates a measured comparison card. Annotate Be→B and N→O as visible examples that a broad periodic direction has local structure.

- [x] **Step 7: Build teacher and provenance surfaces**

The trace records element changes, allowed placements, blocked placements, checks, hints, reference loads, quantum checks, and trend comparisons. Teacher prompts ask learners to explain carbon versus oxygen pairing, Cr/Cu exceptions, and why a measured trend is not an absolute rule. Render every model-passport source as an external link.

- [x] **Step 8: Apply the visual system and responsive critique**

Tokens:

```css
--atomic-vacuum:#11172f;
--atomic-panel:#182442;
--atomic-violet:#705cf6;
--atomic-cyan:#4fd7e5;
--atomic-amber:#f6b94b;
--atomic-electron:#a9e36b;
--atomic-silver:#eaf0f5;
```

Use `Avenir Next Condensed` for the observatory headline, system sans for teaching copy, and `SFMono-Regular` for quantum addresses and measured values. At 760 px and below, stack the benches, keep the orbital rack horizontally scrollable with a visible swipe cue, and ensure the page body itself never overflows.

### Task 4: Platform and curriculum integration

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/Header.jsx`
- Modify: `src/data/curriculum.js`
- Modify: module numbering in all lab component headings
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`

**Interfaces:**
- Consumes section anchor `#atomicStructureLab`.
- Preserves all existing anchors.

- [x] **Step 1: Lazy-load the observatory before the molecular workbench**

```jsx
const AtomicStructureLab = lazy(() => import('./components/AtomicStructureLab.jsx'));
// ...
<Suspense fallback={<LabFallback id="atomicStructureLab" label="Atomic signal observatory"/>}>
  <AtomicStructureLab />
</Suspense>
```

- [x] **Step 2: Make Atoms directly discoverable**

Desktop direct links: `Learn`, `Atoms`, `Build`, `Moles`, `Solutions`, `Energy`, `More labs`. Move Cells and Measure into More without removing them. Mobile direct links: `Learn`, `Atoms`, `Build`, `Moles`, `More`; place every other lab in More.

- [x] **Step 3: Renumber the real instructional sequence**

Atomic structure becomes 01, molecular workbench 02, stoichiometry 03, and every later module increments through equation balancing 15.

- [x] **Step 4: Update only truthful curriculum claims**

Mark neutral atomic electronic structure and measured first-ionization-energy periodicity live in General Chemistry and Inorganic Chemistry. Add the observatory to Physical Chemistry as an introductory wavefunction/configuration bridge with its qualitative boundary. Do not mark many-electron wavefunction calculation, spectra, arbitrary ions, full term-symbol analysis, or quantitative radius/electron-affinity trends live.

- [x] **Step 5: Document open-source extension seams**

README must state the H–Kr and neutral-atom boundary, exact data provenance, verifier command, and lazy UI architecture. CONTRIBUTING must require source records, a red/green pure-engine verifier, preserved learner mistakes, a model passport, responsive browser inspection, and explicit distinction between measured data and explanatory models.

### Task 5: Completion evidence for this milestone

**Files:**
- No new files.

**Interfaces:**
- Verifies Tasks 1–4 and regression safety.

- [x] **Step 1: Run every deterministic verifier**

Run all `npm run verify:*` scripts, including `verify:atomic-structure`.

Expected: every command exits 0.

- [x] **Step 2: Build production assets**

Run: `npm run build`

Expected: Vite exits 0 and emits a lazy `AtomicStructureLab` JavaScript/CSS chunk.

- [x] **Step 3: Audit as a learner**

In the live app, verify:

- carbon can be built manually and evaluates as two unpaired electrons;
- an early 2p pair is preserved and receives Hund-specific feedback;
- an attempted duplicate-spin placement is blocked at the site with a reason;
- chromium and copper references retain their NIST exceptions;
- a wrong quantum address remains selected and each dimension is explained;
- ionization comparison shows exact NIST values and the Be/B and N/O local reversals;
- no action silently replaces a learner arrangement.

- [x] **Step 4: Audit as a teacher**

Verify source links, included/excluded passport claims, teacher prompts, complete action trace, curriculum entry points, and exact qualitative-orbital disclaimer.

- [x] **Step 5: Audit visual and accessible behavior**

At 390, 742, and 1280 px widths verify no body overflow, no clipped controls, visible focus styles, 44 px mobile targets, useful swipe guidance, readable SVG labels, reduced-motion behavior, hash alignment beneath navigation, and no new runtime errors. Inspect screenshots at all three widths before calling this milestone complete.
