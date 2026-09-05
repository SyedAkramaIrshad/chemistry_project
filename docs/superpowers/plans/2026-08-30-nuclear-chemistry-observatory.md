# Nuclear Chemistry Observatory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a source-backed, graphical nuclear-chemistry studio where learners manually close nuclear equations, reveal ideal half-life ledgers, and compare binding energy without the application repairing their work or pretending to model radiation safety.

**Architecture:** Add one recursively immutable data module, one deterministic pure-computation module, one lazy React laboratory, and one isolated stylesheet. The laboratory has three independent instruments—decay ledger, half-life chronograph, and binding ridge—with explicit run gates, stale snapshots, retained wrong answers, four non-mutating hints per instrument, teacher contrasts, and a model passport.

**Tech Stack:** React 19, Vite 8, JavaScript ES modules, SVG/CSS graphics, Node `assert` verifier, existing project fonts and navigation.

## Global Constraints

- Use only local deterministic computation after build time; do not add dependencies, services, model calls, or runtime data fetching.
- Freeze every source record and returned analysis recursively.
- Never silently repair a daughter choice, particle placement, numerical input, or learner claim.
- Do not reveal a result until the learner explicitly chooses `Audit decay`, `Release chronograph`, or `Raise binding ridge`.
- Keep previous results visible and label them stale when inputs change.
- Treat all decay curves as ideal expected values, not simulated random observations.
- Do not calculate radiation dose, shielding, transport, biological effect, detector response, medical use, handling procedure, or operational safety.
- Do not infer reaction feasibility, rates, or released energy from binding energy per nucleon alone.
- Use NIST 2022 CODATA constants, NIST isotope masses, and frozen IAEA/NNDC records retrieved on 2026-08-30; expose source dates and exclusions.
- Preserve visible keyboard focus, 44 px minimum touch targets, reduced-motion support, and contained horizontal scrolling below 768 px.
- Do not perform Git actions; project instructions prohibit them for this work.

## Visual Design Contract

**Subject and audience:** An undergraduate learner or teacher using a virtual radiation observatory to make invisible conservation, time, and mass-energy accounting visible.

**Single job:** Let the learner construct and defend a nuclear claim before the instrument exposes the corresponding ledger.

**Palette:** lead glass `#26353c`, mica paper `#e5e1d4`, uranium glass `#c9e75d`, detector cobalt `#426f91`, beta coral `#e87863`, gamma violet `#8b7ac8`, and phosphor cyan `#73d1d6`.

**Type:** `Avenir Next Condensed` for thesis and instrument names, `Avenir Next` for teaching copy, and `SFMono-Regular` for nuclide coordinates, equations, and measured records.

**Layout:** A dark observatory shell holds pale instrument cards. The decay mode uses a left control rack, a central lead-glass nuclide chamber, and a right conservation/evidence rack. The chronograph gives its segmented isotope clock the visual center. The binding mode uses a long ridge plot with a paired mass ledger below it.

**Signature:** The decay-vector chamber is a real `(N,Z)` coordinate map. Selecting a daughter moves only the learner-owned endpoint; placing particles fills explicit reactant/product trays. On audit, three beams report mass number, charge, and lepton-number closure without moving any selection.

**Motion:** Only explicit reveal actions animate one ray, chronograph sweep, or ridge trace. Reduced-motion mode removes these transitions.

**Self-critique:** A generic dark-neon dashboard would obscure the subject. The revised direction uses mica paper, lead-glass framing, physically meaningful route colors, and coordinate labels; every decorative line now represents a decay vector, detector trace, half-life division, or binding ridge.

---

### Task 1: Freeze the teaching records and model boundary

**Files:**
- Create: `src/data/nuclearScenarios.js`

**Interfaces:**
- Produces: `NUCLEAR_CONSTANTS`, `DECAY_PARTICLES`, `NUCLEAR_NUCLIDES`, `NUCLIDE_BY_ID`, `DECAY_CHALLENGES`, `DECAY_CHALLENGE_BY_ID`, `HALF_LIFE_CHALLENGES`, `HALF_LIFE_CHALLENGE_BY_ID`, `BINDING_NUCLEI`, `BINDING_NUCLEUS_BY_ID`, and `NUCLEAR_MODEL_BOUNDARY`.

- [ ] **Step 1: Define the recursive freeze helper and constants**

```js
const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
};

export const NUCLEAR_CONSTANTS = deepFreeze({
  hydrogenAtomMassU: 1.00782503223,
  neutronMassU: 1.00866491606,
  atomicMassEnergyMeV: 931.49410372,
  electronMassEnergyMeV: 0.51099895069,
  secondsPerDay: 86400,
  secondsPerJulianYear: 31557600,
});
```

- [ ] **Step 2: Define particles with explicit bookkeeping coordinates**

```js
export const DECAY_PARTICLES = deepFreeze([
  { id: 'alpha', symbol: 'α', label: 'alpha particle', massNumber: 4, chargeNumber: 2, leptonNumber: 0, family: 'nuclear' },
  { id: 'beta-minus', symbol: 'β⁻', label: 'electron', massNumber: 0, chargeNumber: -1, leptonNumber: 1, family: 'lepton' },
  { id: 'positron', symbol: 'β⁺', label: 'positron', massNumber: 0, chargeNumber: 1, leptonNumber: -1, family: 'lepton' },
  { id: 'electron', symbol: 'e⁻', label: 'captured electron', massNumber: 0, chargeNumber: -1, leptonNumber: 1, family: 'lepton' },
  { id: 'gamma', symbol: 'γ', label: 'gamma photon', massNumber: 0, chargeNumber: 0, leptonNumber: 0, family: 'photon' },
  { id: 'neutrino', symbol: 'νₑ', label: 'electron neutrino', massNumber: 0, chargeNumber: 0, leptonNumber: 1, family: 'lepton' },
  { id: 'antineutrino', symbol: 'ν̄ₑ', label: 'electron antineutrino', massNumber: 0, chargeNumber: 0, leptonNumber: -1, family: 'lepton' },
]);
```

- [ ] **Step 3: Freeze the selected nuclides and five decay challenges**

Store parent/daughter records for `238U → 234Th`, `14C → 14N`, the declared positron branch `22Na → 22Ne`, `7Be + e⁻ → 7Li`, and `99Tc* → 99Tc + γ`. Include `(Z,N,A)`, atomic mass where used, state energy where used, half-life, source extraction date, declared branch, Q/state energy, candidate daughters, expected particle placements, mission, teacher question, misconception, and provenance. The technetium gamma challenge uses the 140.511 keV level; it must not relabel the 142.6836 keV metastable-state gap as a single photon line.

- [ ] **Step 4: Freeze four chronograph records and six binding nuclei**

Use `14C` (5700 y), `18F` (109.77 min), `32P` (14.268 d), and `99mTc` (6.0072 h). State that each curve models total parent loss with the selected effective half-life and treats its declared daughter as nondecaying only on the displayed window. Use `2H`, `4He`, `12C`, `16O`, `56Fe`, and `238U` atomic masses for the ridge.

- [ ] **Step 5: Freeze the exclusions**

```js
export const NUCLEAR_MODEL_BOUNDARY = deepFreeze({
  records: 'A small frozen teaching subset, not a complete or live chart of nuclides.',
  probability: 'Curves are ideal expected values. Individual decay times and detector counts remain stochastic.',
  branches: 'Only the declared branch or total effective parent loss is evaluated; omitted radiation branches stay omitted and visible.',
  chains: 'One parent-to-daughter step is shown. Bateman chains and secular/transient equilibrium are not solved.',
  energy: 'Binding energy per nucleon is a comparison ledger, not proof of a feasible pathway, rate, cross section, or usable energy release.',
  safety: 'No dose, shielding, transport, biological effect, handling procedure, or medical recommendation is calculated.',
});
```

### Task 2: Implement the deterministic nuclear engines

**Files:**
- Create: `src/chemistry/nuclearChemistry.js`

**Interfaces:**
- Consumes: all lookup maps and constants from `src/data/nuclearScenarios.js`.
- Produces: `analyzeDecayAssembly`, `evaluateDecayAttempt`, `nextDecayHint`, `analyzeHalfLife`, `evaluateHalfLifeAttempt`, `nextHalfLifeHint`, `analyzeBindingRidge`, `evaluateBindingAttempt`, and `nextBindingHint`.

- [ ] **Step 1: Add strict validation and immutable-return helpers**

Reject unknown IDs, duplicate particle-side placements, non-finite inputs, non-positive initial counts, negative elapsed half-lives, identical ridge comparison IDs, incomplete predictions, and hint levels outside `1..4`.

- [ ] **Step 2: Analyze one learner-owned nuclear equation**

```js
export function analyzeDecayAssembly({ challengeId, daughterId, placements }) {
  // Sum parent plus reactant-side particles and compare with daughter plus
  // product-side particles for A, Z, and electron-lepton number.
  // Return each signed difference, closure booleans, selected mode evidence,
  // expected assembly, Q/state-energy ledger, and the unchanged placements.
}
```

The output must distinguish equation bookkeeping from branch probability, daughter stability, radiation spectrum, and decay rate. The application may describe a wrong assembly but must not replace it.

- [ ] **Step 3: Evaluate four independent decay claims and four hints**

Prediction fields are `modeId`, `vectorId`, `rateClaim`, and `evidenceClaim`. Allowed evidence values are `equation-is-complete-spectrum` and `equation-is-bookkeeping-only`; the latter is correct for every frozen challenge.

- [ ] **Step 4: Analyze ideal parent loss and activity**

```js
const lambda = Math.log(2) / challenge.halfLifeSec;
const parentFraction = 2 ** (-elapsedHalfLives);
const parentNuclei = initialNuclei * parentFraction;
const decayedNuclei = initialNuclei - parentNuclei;
const activityBq = lambda * parentNuclei;
```

Return an 81-point curve from zero through eight half-lives, parent/daughter expected counts, activity, elapsed real time, and a model-boundary ledger.

- [ ] **Step 5: Evaluate four chronograph claims and four hints**

Prediction fields are `parentBand`, `activityTrend`, `halfLifeResponse`, and `daughterRelation`. Include exact boundary handling at zero, one, and two half-lives.

- [ ] **Step 6: Calculate the binding ridge from atomic masses**

```js
const neutronCount = nucleus.massNumber - nucleus.atomicNumber;
const massDefectU = nucleus.atomicNumber * NUCLEAR_CONSTANTS.hydrogenAtomMassU
  + neutronCount * NUCLEAR_CONSTANTS.neutronMassU
  - nucleus.atomicMassU;
const bindingEnergyMeV = massDefectU * NUCLEAR_CONSTANTS.atomicMassEnergyMeV;
const bindingEnergyPerNucleonMeV = bindingEnergyMeV / nucleus.massNumber;
```

Return all six ridge points, pair comparisons, and the explicit `curve-only-not-pathway` inference boundary.

- [ ] **Step 7: Evaluate four ridge claims and four hints**

Prediction fields are `largerPerNucleonId`, `largerTotalBindingId`, `massDefectSign`, and `inferenceClaim`. Preserve every learner value.

### Task 3: Build the deterministic verifier

**Files:**
- Create: `scripts/verify-nuclear-chemistry.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes every exported data and engine interface.
- Produces command `npm run verify:nuclear-chemistry`.

- [ ] **Step 1: Verify record shape, provenance, source IDs, and recursive immutability**

Assert five decay challenges, four half-life challenges, six ridge nuclei, seven particle records, unique IDs, extraction dates, complete teacher copy, and every exclusion.

- [ ] **Step 2: Verify all five decay assemblies**

Assert exact A/Z/lepton closure for the expected placements, expected daughter vectors, branch/state-energy records, and deliberately wrong assemblies that stay wrong. Confirm `238U` alpha Q ≈ 4.2699 MeV, `14C` beta-minus Q ≈ 0.1564765 MeV, and the `99Tc*` state line is 140.511 keV.

- [ ] **Step 3: Verify chronograph invariants**

For every record assert 50% parent at one half-life, 25% at two, activity halves with parent count, parent plus declared daughter closes to the initial expected count, the curve is monotonic, and invalid inputs throw.

- [ ] **Step 4: Verify the binding ridge**

Assert approximately `1.112283`, `7.073916`, `7.680145`, `7.976207`, `8.790343`, and `7.570121 MeV/nucleon`; confirm the Fe-56 point is highest in this selected six-point subset.

- [ ] **Step 5: Verify predictions and hints are non-mutating**

Use all-wrong complete prediction records, require zero correct dimensions where designed, verify four hints per mode, and compare structured clones before/after evaluation.

- [ ] **Step 6: Add the package script and run it**

Run: `npm run verify:nuclear-chemistry`

Expected: three summary lines and exit code `0`.

### Task 4: Build the Nuclear Chemistry Observatory UI

**Files:**
- Create: `src/components/NuclearChemistryLab.jsx`
- Create: `src/styles/nuclear-chemistry.css`

**Interfaces:**
- Consumes all challenge data, pure engines, `MODEL_PASSPORTS.nuclearChemistryObservatory`, and the corresponding `SCIENCE_SOURCES` records.
- Produces section `#nuclearChemistryLab` with heading `#nuclearChemistryLabTitle`.

- [ ] **Step 1: Build the hero, three mode tabs, and challenge rails**

Use thesis `A nucleus changes coordinates. The ledger must still close.` and labels `Decay chamber`, `Half-life chronograph`, and `Binding ridge`. Scenario selection clears the active result but never runs an analysis.

- [ ] **Step 2: Build the manual decay-vector chamber**

Render parent and candidate daughters on a labeled `(N,Z)` mini-map. Provide explicit reactant/product placement buttons for each particle and a removable tray. Keep selected wrong daughter cells and particles visible after audit. Shutter A/Z/lepton beams until `Audit decay`.

- [ ] **Step 3: Build the decay prediction and feedback console**

Require four learner claims, retain wrong choices, show separate reasons, maintain four hints, and append every challenge load, daughter selection, particle placement/removal, claim, audit, and hint to a chronological register.

- [ ] **Step 4: Build the segmented half-life chronograph**

Expose editable initial nuclei and elapsed half-lives, a 64-segment parent/daughter clock, a synchronized expected-value curve, activity shutter, and four claims. Changing an input after reveal marks the snapshot `PREVIOUS RUN` and keeps it visible.

- [ ] **Step 5: Build the binding ridge**

Provide two independently selected nuclei, a sealed six-point SVG ridge, paired mass-defect ledgers, and four claims. Reveal only on `Raise binding ridge`; changing either nucleus leaves the old ridge visible and stale.

- [ ] **Step 6: Add teacher contrasts, passport, and sources**

Include six contrasts: isotope versus element, activity versus amount, half-life versus clock time, equation versus spectrum, total binding versus binding per nucleon, and binding ridge versus feasible reaction. Each `Load instrument` action changes state without running it.

- [ ] **Step 7: Implement responsive and accessible styles**

At 1024 px collapse three-column layouts to two; at 768 px make scenario rails horizontally scrollable; at 520 px stack modes and controls, constrain tables, retain 44 px controls, and keep the central graphics legible. Add `:focus-visible` and `prefers-reduced-motion` rules.

### Task 5: Integrate sources, curriculum, navigation, numbering, and documentation

**Files:**
- Modify: `src/data/scienceSources.js`
- Modify: `src/data/curriculum.js`
- Modify: `src/App.jsx`
- Modify: `src/components/Header.jsx`
- Modify: numbered component headings from `src/components/Hero.jsx` through `src/components/EquationSections.jsx`
- Modify: `README.md`

**Interfaces:**
- Adds lazy route target `#nuclearChemistryLab` after atomic structure.
- Adds one general-chemistry and one physical-chemistry live topic cluster.

- [ ] **Step 1: Add source registry records and model passport**

Add ACS undergraduate curriculum, OpenStax general-chemistry scope, IAEA LiveChart, IAEA LiveChart API, NNDC NuDat, NNDC beta-decay guide, NIST isotope masses, NIST 2022 CODATA, NNDC carbon-14 decay, and NNDC technetium-99m decay. The passport result kind is `bounded deterministic nuclear teaching model` and lists every exclusion.

- [ ] **Step 2: Insert the lazy lab after atomic structure**

```jsx
const NuclearChemistryLab = lazy(() => import('./components/NuclearChemistryLab.jsx'));
// ...
<Suspense fallback={<LabFallback id="nuclearChemistryLab" label="Nuclear chemistry observatory"/>}>
  <NuclearChemistryLab />
</Suspense>
```

- [ ] **Step 3: Add desktop/mobile navigation and curriculum links**

Add `Nuclear chemistry` under More Labs. Link the new lab from General Chemistry and Physical Chemistry. Increase live curriculum clusters from 88 to 90.

- [ ] **Step 4: Renumber the conceptual sequence**

Keep Atomic Structure as `01`, assign Nuclear Chemistry `02`, change the molecular experiment promo and every downstream numbered laboratory by `+1`, ending with Equation Balancer `28`. Verify every number exactly once except the hero promo for the molecular experiment.

- [ ] **Step 5: Update open-source documentation**

Describe the three instruments, explicit learner ownership, authoritative sources, command, architecture files, and safety/model boundary. Update verifier count from 25 to 26 and live topic count from 88 to 90.

### Task 6: Validate as student, teacher, and maintainer

**Files:**
- Verify only; edit only if a reproduced defect requires a focused fix.

- [ ] **Step 1: Run the targeted verifier and production build**

Run: `npm run verify:nuclear-chemistry`

Run: `npm run build`

Expected: both exit `0`; report any chunk-size advisory separately from failure.

- [ ] **Step 2: Exercise the student decay flow in the browser**

Load the beta-minus challenge, choose a wrong daughter and incomplete particle set, audit, confirm the state remains, read separate A/Z/lepton/mode reasons, correct it manually, and confirm closure. Verify no automatic audit occurs on selection.

- [ ] **Step 3: Exercise chronograph and ridge stale snapshots**

Reveal one clock and one ridge, edit each input, confirm old evidence remains with `PREVIOUS RUN`, then rerun explicitly. Submit all-wrong claims and confirm all choices persist with separate reasons.

- [ ] **Step 4: Exercise teacher contrasts**

Verify exactly six cards. Load the second, fourth, and sixth instruments and confirm each changes mode/challenge without automatic analysis.

- [ ] **Step 5: Check desktop, tablet, and phone rendering**

At `1440×1000`, `768×900`, and `390×844`, require no document-level horizontal overflow, no Vite overlay, minimum visible button height `44`, contained scenario/table overflow, visible focus, and readable decay/clock/ridge graphics. Respect reduced-motion media behavior.

- [ ] **Step 6: Run all project verifiers fresh**

Run every `scripts/verify-*.mjs` file and confirm all 26 exit `0`, then run `npm run build` once more.

Expected: 26 verifier scripts pass; production build exits `0`.

## Self-Review

- **Spec coverage:** Every requested student/teacher, graphics, source, no-auto-repair, open-source, responsive, and bounded-science requirement maps to a task above.
- **Placeholder scan:** The plan contains no `TBD`, `TODO`, `implement later`, omitted error-handling instruction, or cross-task shorthand.
- **Type consistency:** Data maps, analysis functions, evaluation functions, hint functions, IDs, prediction fields, section IDs, and package command names are identical across tasks.
- **Scope check:** This plan adds one self-contained foundational subsystem. Laboratory safety, full decay chains, radiation transport, dose, and a complete live nuclide database remain separate future subsystems rather than hidden scope.
