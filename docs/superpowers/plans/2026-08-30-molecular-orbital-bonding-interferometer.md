# Molecular Orbital Bonding Interferometer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a graphical undergraduate workbench where learners manually occupy declared first- and second-period homonuclear diatomic molecular-orbital ladders, interpret phase overlap, and predict bond order and magnetic classification without automatic filling or repair.

**Architecture:** Store three frozen qualitative MO orderings and fifteen declared diatomic/ion scenarios as local teaching records. A pure immutable engine owns spin placement, Pauli blocking, degenerate-level Hund checks, energy-order comparison, bond-order bookkeeping, unpaired-electron classification, frontier-level reporting, prediction evaluation, and hints. A lazy React module renders an energy ladder connected to a phase-interference scope, a bond-tension instrument, magnetic response, teacher evidence, and a source-backed model passport.

**Tech Stack:** React 19, Vite 8, JavaScript ES modules, semantic HTML, inline SVG, CSS, Node `assert/strict`.

## Global Constraints

- Cover only the fifteen declared homonuclear diatomic scenarios: H2+, H2, He2+, He2, Li2, Be2, B2, C2, N2, O2+, O2, O2-, O2(2-), F2, and Ne2.
- Treat all ladders as qualitative declared LCAO teaching diagrams, not self-consistent electronic-structure calculations or measured orbital energies.
- For Li2 through Ne2, omit the paired 1s core contribution and state that its equal bonding/antibonding occupancy cancels in the displayed formal bond-order ledger.
- Use a 1s ordering for H/He, the introductory early-second-period ordering for Li2 through N2, and the introductory late-second-period ordering for O2 through Ne2.
- Learners place and remove every spin arrow themselves; scenario changes begin with an empty ladder.
- Block only state-impossible actions: unknown orbital, unknown spin, a third electron, or a duplicate spin in one orbital. Preserve Aufbau- or Hund-unfavourable arrangements until the learner changes them.
- Calculate the displayed formal MO bond order as `(bonding electrons - antibonding electrons) / 2`; do not present it as a universal electron-density bond index, measured bond strength, bond length, dissociation energy, or proof of gas-phase existence.
- Classify the displayed occupation as spin-only paramagnetic when one or more electrons are unpaired and diamagnetic when none are unpaired; do not calculate magnetic susceptibility or a measured magnetic moment.
- Depict orbitals as phase-coloured qualitative wavefunction/isovalue silhouettes, never electron paths, literal clouds with fixed boundaries, measured sizes, or many-electron densities.
- Present molecular-orbital and valence-bond descriptions as complementary models; do not claim one theory is simply correct and the other failed.
- Exclude arbitrary molecules, heteronuclear ordering, polyatomic SALCs, numerical LCAO coefficients, orbital energies, electron correlation, term symbols, excited states, spectroscopy, reaction prediction, and computational quantum chemistry.
- Preserve every existing module and deterministic verifier.
- Add no runtime dependency, backend, model call, paid API, operational procedure, or hazardous chemistry instruction.
- Do not perform Git actions; repository instructions override the plan skill's usual worktree and commit cadence.

---

### Task 1: Frozen MO orderings, scenarios, sources, and red verifier

**Files:**
- Create: `src/data/molecularOrbitalScenarios.js`
- Modify: `src/data/scienceSources.js`
- Create: `scripts/verify-molecular-orbitals.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `MO_ORDERINGS`, `MO_ORDERING_LIST`, `MO_SCENARIOS`, `MO_SCENARIO_BY_ID`, `MO_MODEL_BOUNDARY`.
- Produces passport: `MODEL_PASSPORTS.molecularOrbitalInterferometer`.
- The verifier imports the planned Task 2 engine so the first run fails with a missing-module error.

- [ ] **Step 1: Declare three qualitative MO orderings**

Use ordered level records with explicit degeneracy and individual orbital identities:

```js
{
  id: 'earlySecondPeriod',
  name: 'Early second-period valence ordering',
  appliesTo: 'Li2 through N2 in this introductory model',
  levels: [
    { id:'sigmaG2s', label:'σg(2s)', character:'bonding', symmetry:'sigma', source:'2s', orbitals:[{id:'sigmaG2s-z',axis:'z'}] },
    { id:'sigmaU2sStar', label:'σu*(2s)', character:'antibonding', symmetry:'sigma', source:'2s', orbitals:[{id:'sigmaU2sStar-z',axis:'z'}] },
    { id:'piU2p', label:'πu(2p)', character:'bonding', symmetry:'pi', source:'2p', orbitals:[{id:'piU2p-x',axis:'x'},{id:'piU2p-y',axis:'y'}] },
    { id:'sigmaG2p', label:'σg(2p)', character:'bonding', symmetry:'sigma', source:'2p', orbitals:[{id:'sigmaG2p-z',axis:'z'}] },
    { id:'piG2pStar', label:'πg*(2p)', character:'antibonding', symmetry:'pi', source:'2p', orbitals:[{id:'piG2pStar-x',axis:'x'},{id:'piG2pStar-y',axis:'y'}] },
    { id:'sigmaU2pStar', label:'σu*(2p)', character:'antibonding', symmetry:'sigma', source:'2p', orbitals:[{id:'sigmaU2pStar-z',axis:'z'}] },
  ],
}
```

`lateSecondPeriod` swaps the relative `σg(2p)` and `πu(2p)` level positions. `oneS` contains `σg(1s)` and `σu*(1s)`. Every nested record and collection is frozen.

- [ ] **Step 2: Declare fifteen scenario contracts**

Each record contains `id`, `formula`, `name`, `family`, `atomicSymbol`, `charge`, `valenceElectronCount`, `orderingId`, `expectedBondOrder`, `expectedUnpaired`, `expectedMagnetism`, and `teachingQuestion`.

```text
H2+   1 electron   bond order 0.5   1 unpaired   paramagnetic
H2    2 electrons  bond order 1     0 unpaired   diamagnetic
He2+  3 electrons  bond order 0.5   1 unpaired   paramagnetic
He2   4 electrons  bond order 0     0 unpaired   diamagnetic
Li2   2 valence e  bond order 1     0 unpaired   diamagnetic
Be2   4 valence e  bond order 0     0 unpaired   diamagnetic
B2    6 valence e  bond order 1     2 unpaired   paramagnetic
C2    8 valence e  bond order 2     0 unpaired   diamagnetic
N2   10 valence e  bond order 3     0 unpaired   diamagnetic
O2+  11 valence e  bond order 2.5   1 unpaired   paramagnetic
O2   12 valence e  bond order 2     2 unpaired   paramagnetic
O2-  13 valence e  bond order 1.5   1 unpaired   paramagnetic
O2(2-) 14 valence e bond order 1    0 unpaired   diamagnetic
F2   14 valence e  bond order 1     0 unpaired   diamagnetic
Ne2  16 valence e  bond order 0     0 unpaired   diamagnetic
```

- [ ] **Step 3: Register authoritative terminology and teaching sources**

Add source records for IUPAC molecular orbital, molecular-orbital theory/LCAO, bonding MO, antibonding MO, bond order, frontier orbitals, sigma/pi symmetry, and paramagnetic terminology. Add the ACS tactile second-period MO-diagram study (`10.1021/acs.jchemed.5b00252`) and the ACS valence-bond/MO complementarity paper (`10.1021/acs.jchemed.1c00919`). Reuse the existing IUPAC Pauli and Hund source records.

- [ ] **Step 4: Add a complete model passport**

`MODEL_PASSPORTS.molecularOrbitalInterferometer` must enumerate included orderings, manual occupation, formal bond-order tally, unpaired-electron classification, phase silhouettes, and frontier-level terminology. It must explicitly exclude numerical energies/coefficient calculation, heteronuclear and polyatomic systems, optimized geometry, measured bond properties, susceptibility, term symbols, spectra, reactivity, and claims of existence/stability.

- [ ] **Step 5: Write the red deterministic verifier**

Import planned functions from `src/chemistry/molecularOrbitals.js` and assert:

```js
assert.equal(MO_ORDERING_LIST.length, 3);
assert.equal(MO_SCENARIOS.length, 15);
assert.ok(MO_ORDERINGS.earlySecondPeriod.levels.findIndex(level => level.id === 'piU2p') < MO_ORDERINGS.earlySecondPeriod.levels.findIndex(level => level.id === 'sigmaG2p'));
assert.ok(MO_ORDERINGS.lateSecondPeriod.levels.findIndex(level => level.id === 'sigmaG2p') < MO_ORDERINGS.lateSecondPeriod.levels.findIndex(level => level.id === 'piU2p'));
assert.equal(MO_SCENARIO_BY_ID.oxygen.expectedUnpaired, 2);
assert.equal(MO_SCENARIO_BY_ID.nitrogen.expectedBondOrder, 3);
```

- [ ] **Step 6: Register and run the red verifier**

Add `"verify:molecular-orbitals": "node scripts/verify-molecular-orbitals.mjs"` to `package.json`.

Run: `npm run verify:molecular-orbitals`

Expected: non-zero exit caused only by missing `src/chemistry/molecularOrbitals.js`.

### Task 2: Immutable MO occupation, bond-order, and magnetism engine

**Files:**
- Create: `src/chemistry/molecularOrbitals.js`
- Modify: `scripts/verify-molecular-orbitals.mjs`

**Interfaces:**
- Consumes Task 1 orderings and scenarios.
- Produces: `createEmptyMoState(scenarioId)`, `buildReferenceMoState(scenarioId)`, `placeMoElectron(input)`, `removeMoElectron(input)`, `moStateMetrics(input)`, `moConfigurationNotation(input)`, `evaluateMoConfiguration(input)`, `moWaveDescriptor(input)`, `compareMoOrderings()`, and `nextMoHint(input)`.

- [ ] **Step 1: Implement exact immutable state validation**

Use:

```js
{
  scenarioId:'oxygen',
  occupancy:{
    'sigmaG2s-z':[],
    'sigmaU2sStar-z':[],
    'sigmaG2p-z':[],
    'piU2p-x':[],
    'piU2p-y':[],
    'piG2pStar-x':[],
    'piG2pStar-y':[],
    'sigmaU2pStar-z':[],
  },
}
```

Every orbital contains zero, one, or two values from `1` and `-1`; a two-electron orbital must contain opposite spins. Reject malformed scenario/state combinations without mutation.

- [ ] **Step 2: Implement manual placement and removal**

`placeMoElectron({scenarioId,state,orbitalId,spin})` blocks an unknown orbital, invalid spin, third electron, or duplicate spin and returns the original state reference. It does not apply Aufbau or Hund automatically. `removeMoElectron({scenarioId,state,orbitalId,electronIndex})` removes only the selected arrow.

- [ ] **Step 3: Build declared ground-reference occupations**

Fill levels from low to high. Within a degenerate level, place one spin-up electron in each component before pairing with spin-down. Reference construction is an explicit helper used only when the learner clicks `Load declared reference`; scenario loading stays empty.

- [ ] **Step 4: Calculate independent occupation evidence**

`moStateMetrics` returns:

```js
{
  valid:true,
  electronCount:12,
  expectedElectronCount:12,
  levelPopulations:{sigmaG2s:2,sigmaU2sStar:2,sigmaG2p:2,piU2p:4,piG2pStar:2,sigmaU2pStar:0},
  bondingElectrons:8,
  antibondingElectrons:4,
  bondOrder:2,
  unpairedElectrons:2,
  magnetism:'paramagnetic',
  aufbau:{correct:true,violations:[],reason:'...'},
  hund:{correct:true,violations:[],reason:'...'},
  highestOccupiedLevelId:'piG2pStar',
  lowestEmptyLevelId:'sigmaU2pStar',
  singlyOccupiedOrbitalIds:['piG2pStar-x','piG2pStar-y'],
}
```

The formal bond-order value may be calculated for any valid partial state but `complete` is true only when the expected electron count is present.

- [ ] **Step 5: Evaluate learner predictions without mutation**

`evaluateMoConfiguration({scenarioId,state,predictions:{bondOrder,magnetism,unpaired}})` scores electron count, level population, Aufbau, Hund, bond-order interpretation, unpaired prediction, and magnetic prediction independently. A wrong occupation or prediction remains unchanged. `committed` requires every dimension to be correct.

- [ ] **Step 6: Describe the selected qualitative wave interference**

`moWaveDescriptor({scenarioId,levelId})` returns symmetry, source AO, character, phase relationship (`same` for the facing lobes of the bonding combination and `opposite` for antibonding), internuclear-node presence, degeneracy, and an explicit qualitative-isosurface boundary. It never returns numerical coefficients, density, probability, size, or energy.

- [ ] **Step 7: Implement ordering comparison and non-mutating hints**

`compareMoOrderings()` identifies only the `σg(2p)`/`πu(2p)` crossover. Hint levels:

```text
1 expected valence-electron count
2 next unfilled lower-energy level
3 degenerate-level Hund pattern
4 bonding versus antibonding tally
5 declared reference level populations
```

No hint places, removes, or rotates an electron.

- [ ] **Step 8: Complete deterministic coverage**

For every scenario, build the reference and assert declared electron count, bond order, unpaired count, magnetism, Aufbau, Hund, and committed evaluation. Also assert O2 has two parallel singly occupied `πg*(2p)` components, B2 has two singly occupied bonding `πu(2p)` components, N2 bond order is 3, H2+/He2+ bond order is 0.5, and He2/Be2/Ne2 formal bond order is 0 in this displayed model.

Create a Pauli-valid but Hund-unfavourable B2 state by pairing both `πu(2p)` electrons in one component; preserve it and score only Hund false. Create an Aufbau-unfavourable O2 state by moving one lower-level electron into `σu*(2p)`; preserve it and score the exact population violation. Verify rejected placement/removal identity, wrong-prediction preservation, wave descriptors, ordering comparison, and five hint levels.

Run: `npm run verify:molecular-orbitals`

Expected: exit 0.

### Task 3: Graphical Bonding Interferometer

**Files:**
- Create: `src/components/MolecularOrbitalLab.jsx`
- Create: `src/styles/molecular-orbitals.css`

**Interfaces:**
- Consumes Tasks 1 and 2.
- Produces section anchor `#molecularOrbitalLab`.

- [ ] **Step 1: Build the semantic learner journey**

```text
Diatomic scenario rail → spin cartridge → AO-to-MO energy ladder
Selected-orbital phase scope → bond-tension cable + magnetic field
Prediction console → ordering comparator → learning trace
Teacher lens → model passport
```

Default to O2 with an empty ladder. Scenario changes explicitly clear occupation, predictions, hints, and prior evaluation.

- [ ] **Step 2: Build the scenario rail and spin cartridge**

Group all fifteen scenarios into `1s systems`, `early 2p order`, `oxygen ion series`, and `late 2p order`. Show formula, charge family, expected electron count only, and never reveal bond order or magnetism before a check. Provide large `↑` and `↓` electron cartridges; selecting one then activating an orbital places that spin if physically possible.

- [ ] **Step 3: Build the AO-to-MO ladder**

Render two quiet atomic-orbital rails flanking one central MO ladder. Draw source-to-level connector paths, level labels, bonding/antibonding character, degenerate component boxes, and energy direction. Each component is keyboard-operable and exposes add/remove controls. Wrong Aufbau/Hund patterns stay exactly where placed.

- [ ] **Step 4: Build the phase-interference scope**

Selecting a level drives an inline SVG showing left and right source orbitals, cyan/magenta phase signs, constructive internuclear amplitude for bonding levels, and a shutter-like internuclear node for antibonding levels. Sigma and pi graphics must visibly differ. Copy states that phase colour represents wavefunction sign, not charge.

- [ ] **Step 5: Build bond and magnet instruments**

Show live bonding/antibonding electron counts but seal the derived bond-order number until the learner checks a complete ladder. Render a central tension cable whose thickness responds to the revealed formal bond order. Render a magnetic-field gate that responds only after check: unpaired arrows lean toward the field for the displayed spin-only paramagnetic classification; paired occupation remains centered for diamagnetic.

- [ ] **Step 6: Build prediction and feedback**

Require bond order, unpaired count, and paramagnetic/diamagnetic predictions before checking. Report electron count, level population, Aufbau, Hund, bond order, unpaired count, and magnetism separately. No check edits state or predictions.

- [ ] **Step 7: Build ordering comparison, trace, teacher lens, and passport**

The ordering comparator must place early and late 2p mini-ladders side by side and highlight only the `πu(2p)`/`σg(2p)` crossover. Trace scenario changes, spin selection, allowed/blocked placement, removal, checks, hints, selected levels, and explicit reference loads. Teacher prompts compare H2+/H2/He2, B2/C2/N2, the O2 ion series, and N2/O2/F2, then ask where the qualitative model stops.

- [ ] **Step 8: Apply the subject-specific visual system**

```css
--mo-vacuum:#07131f;
--mo-cobalt:#123f68;
--mo-phosphor:#72f6cf;
--mo-phase-a:#5fd5ff;
--mo-phase-b:#ff69a8;
--mo-electron:#ffc857;
--mo-shell:#e7eef2;
```

Use `Avenir Next Condensed` for the instrument title, system sans for teaching copy, and `SFMono-Regular` for orbital labels/data. The phase scope is the single luminous visual signature; surrounding panels remain disciplined instrument surfaces. At 760 px and below, stack the panels, replace side AO rails with compact source labels, preserve 44 px controls, keep the ladder fully usable without body overflow, and provide explicit internal swipe cues only where the scenario rail needs them. Respect reduced motion.

### Task 4: Platform and curriculum integration

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/Header.jsx`
- Modify: module numbering in all later lab headings
- Modify: `src/data/curriculum.js`
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`

**Interfaces:**
- Consumes `#molecularOrbitalLab`.
- Preserves every existing anchor.

- [ ] **Step 1: Lazy-load after molecular geometry**

```jsx
const MolecularOrbitalLab = lazy(() => import('./components/MolecularOrbitalLab.jsx'));

<Suspense fallback={<LabFallback id="molecularOrbitalLab" label="Molecular orbital bonding interferometer"/>}>
  <MolecularOrbitalLab />
</Suspense>
```

- [ ] **Step 2: Make Orbitals discoverable**

Desktop direct links become `Learn`, `Atoms`, `Build`, `Shapes`, `Orbitals`, `Moles`, `More labs`; move `Solutions` into More. Mobile direct links become `Learn`, `Atoms`, `Build`, `Shapes`, `Orbitals`, `More` in six equal columns.

- [ ] **Step 3: Renumber the instructional sequence**

Atomic remains 01, molecular graph 02, molecular geometry 03, molecular orbitals 04, stoichiometry 05, and later modules increment through equation balancing 17.

- [ ] **Step 4: Add only truthful curriculum claims**

Mark declared homonuclear-diatomic MO occupation, formal bond-order bookkeeping, and spin-only magnetic classification live in General, Inorganic, and Physical Chemistry. Keep heteronuclear/polyatomic MO theory, numerical electronic structure, term symbols, excited states, spectra, measured magnetic properties, and reaction prediction outside scope.

- [ ] **Step 5: Document extension seams and review journeys**

README must list the fifteen scenarios, data/engine/component/CSS paths, verifier, and model boundary. CONTRIBUTING must require Pauli rejection, wrong Hund B2, wrong Aufbau O2, O2 ion-series bond-order changes, early/late crossover, mobile, teacher, and source/passport journeys.

### Task 5: Completion evidence for this milestone

**Files:**
- No new files.

**Interfaces:**
- Verifies Tasks 1–4 and all prior chemistry modules.

- [ ] **Step 1: Run every deterministic verifier**

Run every `npm run verify:*` command, including `verify:molecular-orbitals`.

- [ ] **Step 2: Build production assets**

Run: `npm run build`

Expected: exit 0 with separate lazy `MolecularOrbitalLab` JavaScript and CSS chunks.

- [ ] **Step 3: Audit as a learner**

Verify manually in the live browser:

- O2 can be built from an empty ladder and resolves bond order 2, two unpaired electrons, and paramagnetic;
- two `πg*(2p)` electrons paired in one component remain visible and fail only the Hund dimension;
- a third electron and duplicate spin are blocked without mutation;
- wrong bond-order, unpaired, and magnetism predictions remain selected;
- H2+, H2, and He2 produce formal bond orders 0.5, 1, and 0;
- B2 and O2 show two unpaired electrons in different degenerate levels/orderings;
- O2+, O2, O2-, and O2(2-) reveal 2.5, 2, 1.5, and 1 only after committed checks;
- explicit reference loading is traced and never changes predictions.

- [ ] **Step 4: Audit as a teacher**

Verify all fifteen scenarios, the early/late crossover, phase-sign copy, sigma/pi differences, valence-core cancellation boundary, MO/VB complementarity, four teacher comparisons, every source, and all included/excluded passport claims.

- [ ] **Step 5: Audit responsive and runtime behavior**

At 390, 742, and 1280 px widths verify hash alignment, no body overflow, no clipped ladder/scope, 44 px mobile controls, visible focus, reduced motion, scenario swipe cue, direct Orbitals navigation, and no runtime errors. Restore the normal viewport and leave O2 empty for the user.
