# Coordination Field Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a graphical inorganic-chemistry studio in which learners derive a first-row metal-ion d count, choose a coordination geometry, place every d electron manually, and test the occupation against a declared one-electron ligand-field plus pairing-energy model.

**Architecture:** Immutable metal-ion and geometry references feed a pure enumerative occupation engine. A React component synchronizes a ligand-polyhedron theatre, selected d-orbital lobe graphic, five-level occupation ladder, Delta-versus-pairing controls, configuration ledger, hints, and trace. The model passport separates idealized occupation bookkeeping and spin-only estimates from real electronic structure, spectra, colour, magnetic measurements, geometry preference, and complex stability.

**Tech Stack:** React 19, native SVG, CSS, pure ES modules, Node deterministic verifier, Vite 8.

## Global Constraints

- Use no new dependency, remote model, measured complex database, or paid service.
- Limit metal presets to declared common first-row ions for which `d count = group number - oxidation state` lies from 0 through 10.
- Treat octahedral and tetrahedral coefficients as ideal barycentric classroom diagrams.
- Treat square-planar coefficients as a declared normalized qualitative ordering, not a universal quantitative splitting.
- Geometry, Delta, pairing energy, and every electron placement remain learner inputs.
- Never infer a real ligand, coordination geometry preference, phase, stability, colour, spectrum, term symbol, rate, or measured magnetic moment.
- A rejected electron action must preserve every occupied orbital.
- Keep desktop, 742 px tablet, and 390 px phone layouts usable with visible keyboard focus, text equivalents, and reduced-motion support.
- Do not run Git commands or create commits in this execution.

---

## Visual direction

- Ion midnight `#07162E`: coordination observatory and energy field.
- Orbital violet `#8D7BFF`: d-orbital lobes and selected energy level.
- Ligand cyan `#61E4F5`: donor positions and metal-ligand axes.
- Spin amber `#FFD166`: singly occupied arrows and ground-configuration success.
- Pairing coral `#FF7088`: paired electrons, pairing cost, and blocked occupations.
- Laboratory paper `#F4F7FA`: restrained controls and explanation surfaces.
- Existing condensed display, humanist body, and monospaced data roles retain product cohesion.

Signature interaction: selecting one energy slot illuminates the matching spatial orbital in the coordination polyhedron. Clicking the same slot cycles empty, one electron, and a paired state while the electron total, field energy, pair count, unpaired count, and spin-only marker update together.

```text
┌ ion shelf ┐ ┌──── coordination observatory ────┐ ┌ manual d ladder ┐
│ Cr3+ d3   │ │ metal + ligands + selected lobe  │ │ eg      [ ][ ]  │
│ Fe2+ d6   │ │ oct / tetra / square planar      │ │ Δ               │
│ Ni2+ d8   │ │ orbital axis explanation         │ │ t2g   [ ][ ][ ]  │
└───────────┘ └───────────────────────────────────┘ └─────────────────┘
┌──── Delta versus P competition + computed occupation ledger ─────────┐
└────────────────────────────────────────────────────────────────────────┘
┌ attempt trace ┐ ┌──────────── model passport + sources ───────────────┐
└───────────────┘ └──────────────────────────────────────────────────────┘
```

Self-critique: a dark stage is already part of the product language. This module avoids repeating the crystal theatre by making the orbital-to-energy-slot coupling—not ambient decoration—the single visual flourish. Other panels stay quiet and data-led.

---

### Task 1: Immutable coordination references and pure occupation engine

**Files:**
- Create: `src/data/coordinationScenarios.js`
- Create: `src/chemistry/coordinationField.js`
- Create: `scripts/verify-coordination-field.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `METAL_ION_PRESETS`, `COORDINATION_GEOMETRIES`, and `ORBITAL_VISUALS`.
- Produces: `deriveDCount(input)`, `configurationMetrics(input)`, `findGroundConfiguration(input)`, `evaluateConfiguration(input)`, `toggleOrbitalOccupancy(input)`, and `nextCoordinationHint(input)`.
- Invalid operations return `{allowed:false, reason, configuration}` with the original configuration reference.

- [ ] **Step 1: Encode first-row ion presets**

Declare Ti3+ d1, V3+ d2, Cr3+ d3, Mn2+ d5, Fe2+ d6, Fe3+ d5, Co2+ d7, Co3+ d6, Ni2+ d8, Cu2+ d9, and Zn2+ d10 with group number, oxidation state, label, and d count. Verify every preset with IUPAC's `OS = N - n`, rearranged as `n = N - OS`, while noting that the presets exclude ambiguous and non-innocent-ligand cases.

- [ ] **Step 2: Encode the orbital diagrams**

Octahedral order:

```js
dxy, dxz, dyz: group 't2g', coefficient -0.4
dz2, dx2-y2:  group 'eg',  coefficient +0.6
```

Tetrahedral order:

```js
dz2, dx2-y2:  group 'e',  coefficient -0.6
dxy, dxz, dyz: group 't2', coefficient +0.4
```

Normalized square-planar classroom order:

```js
dxz, dyz: coefficient -0.6
dz2:      coefficient -0.2
dxy:      coefficient +0.2
dx2-y2:   coefficient +1.2
```

Every five-orbital coefficient sum must equal zero. Each geometry also declares coordination number, ideal ligand positions, quantitative status, and a boundary statement.

- [ ] **Step 3: Implement configuration metrics**

For five integer occupancies from 0 through 2:

```js
fieldEnergyKJmol = sum(occupancy[i] * coefficient[i] * deltaKJmol)
pairCount = count(occupancy[i] === 2)
pairingEnergyKJmol = pairCount * pairingKJmol
modelEnergyKJmol = fieldEnergyKJmol + pairingEnergyKJmol
unpairedElectrons = count(occupancy[i] === 1)
spinS = unpairedElectrons / 2
spinMultiplicity = unpairedElectrons + 1
spinOnlyMomentBM = sqrt(unpairedElectrons * (unpairedElectrons + 2))
gapEquivalentWavelengthNm = 119626.5656 / deltaKJmol
```

The equivalent wavelength is labelled only as the photon wavelength matching one Delta energy; it is not a predicted absorption or colour.

- [ ] **Step 4: Enumerate the model ground occupation**

Enumerate all `3^5` occupancy vectors, retain those whose sum equals d count, and minimize field plus pairing energy. Resolve equal-energy configurations by maximizing unpaired electrons as the declared Hund-style classroom tie break. Return the canonical vector, metrics, all equal-energy/equal-spin equivalents, and a spin-pattern label.

- [ ] **Step 5: Evaluate and mutate learner occupations immutably**

`toggleOrbitalOccupancy` cycles `0 -> 1 -> 2 -> 0`. Adding beyond d count is blocked; removing is always possible. `evaluateConfiguration` blocks wrong electron totals, accepts degenerate orbital permutations with equal minimum energy and unpaired count, and otherwise reports the energy gap and whether excess cost comes from higher orbital occupation, extra pairing, or both.

- [ ] **Step 6: Add three non-mutating hint levels**

Hint 1 names the lower orbital group; hint 2 states whether the next comparison favours promotion or pairing under the current Delta/P values; hint 3 names one ground-equivalent occupancy. Hints never alter the configuration or result state.

- [ ] **Step 7: Add and run deterministic verification**

Add `verify:coordination-field` to `package.json`. Verify preset d counts, zero-sum coefficients, all configuration enumerations, octahedral d6 high-spin at Delta=100/P=250, octahedral d6 low-spin at Delta=300/P=150, d5 crossover, tetrahedral weak-field d5, normalized square-planar strong-field d8, spin-only moments, degenerate permutation acceptance, overfill preservation, wrong-total rejection, immutable toggles, and non-mutating hints.

Run:

```bash
npm run verify:coordination-field
```

Expected: all eleven ion presets, three geometry diagrams, crossover cases, occupation invariants, and error preservation pass with exit code 0.

---

### Task 2: Coordination observatory and manual orbital occupation UI

**Files:**
- Create: `src/components/CoordinationFieldLab.jsx`
- Modify: `src/styles.css`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes all Task 1 exports.
- Produces section anchor `#coordinationLab`.
- Maintains learner-owned ion, geometry, Delta, P, occupation vector, selected orbital, hints, committed result, and trace.

- [ ] **Step 1: Build the metal-ion shelf**

Each preset control displays ion label, oxidation state, and derived d count. Changing ion clears only the occupation/result because the required electron total changed; geometry, Delta, and P remain. Re-selecting the active ion is a no-op that preserves occupation.

- [ ] **Step 2: Build geometry controls and observatory**

Provide octahedral, tetrahedral, and square-planar controls. Render metal, ideal ligand positions, metal-ligand axes, and stylized five-d-orbital lobes in native SVG. Selecting an orbital in the ladder highlights its spatial lobe and axis. Geometry is a learner input and the copy must not say the engine predicts it.

- [ ] **Step 3: Build the manual occupation ladder**

Render five focusable orbital buttons at their relative energies. Each button cycles empty, up, and up/down states. Show group brackets (`t2g/eg`, `e/t2`, or square-planar levels), live electron total, a clear action, one-step hint, and explicit `Load model reference` action. Loading a reference is never automatic and records a reveal in the trace.

- [ ] **Step 4: Build Delta/P competition controls**

Use independent sliders and numeric inputs for Delta and P from 25 through 400 kJ mol-1. Show two proportional columns and the current comparison, but obtain the actual ground occupation from full enumeration rather than the simple comparison alone. Preserve occupation when Delta/P changes and relabel any prior commit as needing re-check.

- [ ] **Step 5: Build commit result and configuration ledger**

`Check my occupation` must preserve incorrect arrangements. A successful check shows model-ground occupation, field contribution, pair cost, total model energy, unpaired count, S, multiplicity, and spin-only moment. An unsuccessful check explains electron-count or energy differences. Square-planar output visibly says normalized qualitative diagram.

- [ ] **Step 6: Build learning trace and teacher lens**

Record ion/geometry changes, each placement/removal, blocked overfill, hints, reference reveal, and checks. Teacher prompts ask learners why Delta versus P changes d6 occupation and why a spin-only moment is not a measured magnetic moment.

- [ ] **Step 7: Add responsive and accessibility behavior**

All orbital slots and ion/geometry controls need visible keyboard focus and text labels. Electron arrows have textual equivalents. At 742 px and 390 px require `scrollWidth === clientWidth`; no meaning may depend only on colour or hover.

---

### Task 3: Navigation, curriculum, scientific provenance, and open-source contract

**Files:**
- Modify: `src/components/Header.jsx`
- Modify: `src/components/CrystalLatticeLab.jsx`
- Modify: `src/components/ReactionLab.jsx`
- Modify: `src/components/EquationSections.jsx`
- Modify: `src/data/curriculum.js`
- Modify: `src/data/scienceSources.js`
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`

**Interfaces:**
- Header exposes `Coordination field` at `#coordinationLab` on desktop and mobile.
- Inorganic curriculum lists the live studio while keeping real coordination prediction outside scope.
- `MODEL_PASSPORTS.coordinationField` is rendered by the component.

- [ ] **Step 1: Register primary references**

Add IUPAC records for oxidation state, the comprehensive oxidation-state recommendation, coordination polyhedron, crystal field, ligand field, ligand-field splitting, low/high spin, aufbau principle, degenerate orbitals, and the IUPAC magnetic-properties technical report.

- [ ] **Step 2: Add the model passport**

Included: selected first-row d counts, three idealized geometry diagrams, manual five-orbital occupancy, one-electron field energy, scalar pairing penalty, exhaustive minimum search, unpaired count, S, multiplicity, and spin-only estimate.

Excluded: real ligand parameters, covalency calculation, nephelauxetic effects, Racah parameters, term symbols, Jahn-Teller distortion, spin-orbit coupling, exchange coupling, temperature populations, measured susceptibility, colour/spectrum, geometry/stability prediction, and reactions.

- [ ] **Step 3: Update navigation and numbering**

Insert Coordination field after Mechanism studio and before Crystal lattice. Use section numbers: Mechanism 06, Coordination 07, Crystal 08, Reaction 09, Equation 10.

- [ ] **Step 4: Update curriculum truthfully**

Mark oxidation-state-to-d-count, ideal coordination polyhedra, ligand-field occupation, and spin-only foundations live. Keep real complex geometry, spectroscopy, magnetochemistry, electronic-structure calculation, organometallics, and reaction chemistry outside scope.

- [ ] **Step 5: Update open-source documentation**

Document the feature, command, files, verifier evidence, scientific boundary, and contributor browser journey. State that a green occupation result certifies only the declared teaching Hamiltonian, not a real complex.

---

### Task 4: Learner, teacher, responsive, and regression audit

**Files:**
- Verify only after Tasks 1 through 3 are complete.

- [ ] **Step 1: Run the learner journey**

For Fe2+ d6 octahedral Delta=100/P=250, place an incorrect low-spin occupation and confirm it remains while the energy reason appears; then complete a high-spin ground-equivalent occupation. Change to Delta=300/P=150 without clearing electrons, re-check, and reach the low-spin occupation. Test a blocked seventh electron, a hint, and explicit reference load.

- [ ] **Step 2: Compare geometry cases**

Verify tetrahedral d5 weak-field maximum-spin occupation and normalized square-planar d8 strong-field paired occupation. Confirm geometry changes clear occupation with an explanation while preserving Delta/P and ion.

- [ ] **Step 3: Run the teacher journey**

Confirm d-count derivation, group coefficients, energy ledger, magnetic limitation, square-planar normalization warning, exclusions, source links, and Inorganic curriculum boundaries are all visible.

- [ ] **Step 4: Run responsive/browser audits**

At 1280x720, 742x964, and 390x844 inspect the header landing, observatory, orbital ladder, Delta/P controls, result, and passport. Require no horizontal overflow, no browser error logs, and focusable orbital controls.

- [ ] **Step 5: Run fresh deterministic and build verification**

Run in parallel:

```bash
npm run verify:coordination-field
npm run verify:crystal-lattice
npm run verify:electron-flow
npm run verify:enzyme-kinetics
npm run verify:spectrophotometry
npm run verify:thermokinetics
npm run verify:equilibrium
npm run build
```

Every command must exit 0 before this phase is reported complete.

## Self-review

- The plan covers manual interaction, graphical intuition, student and teacher learning value, scientific provenance, open-source documentation, responsive behavior, and deterministic evidence.
- The model explicitly distinguishes a declared orbital-energy bookkeeping Hamiltonian from ligand-field theory sufficient to predict a real complex.
- Square-planar energies are never presented as universal or compound-specific.
- Geometry selection, field strength, pairing energy, and electron placement remain learner-controlled.
- Interface and function names are consistent across data, engine, verifier, UI, passport, curriculum, and documentation tasks.
- No placeholder or future engine is labelled live.
