# ChemLab Studio — Current Progress Checkpoint

Last updated: 2026-08-30 (Asia/Kolkata)

This file is the compaction-safe source of truth for the current project state. It must separate implemented code, freshly validated behavior, estimates, and work that remains outside the current engines.

## Active goal

Develop ChemLab Studio toward its practical limit as an intuitive, graphical, open-source university chemistry learning platform. Learners should control experiments themselves; impossible actions must leave state unchanged and explain why. Every model must state what it can and cannot establish.

The broader goal remains active and open-ended. The current implementation milestone is the **Electronic Band & Metallic Bonding Observatory**.

## Current validated whole-project state

Fresh evidence from this milestone:

- **31/31 deterministic verifier commands exit 0**;
- **103 live curriculum topic clusters** across seven disciplines;
- **11 explicit `next-engine` gap rows** and **0 concept-only rows**;
- **114 mapped topic rows total**, so 90.4% of the current finite curriculum ledger is interactive and 9.6% remains an explicit engine gap;
- **33 ordered visual sections**, exactly 01–33 with no missing or duplicate number;
- `npm run build` exits 0 with 142 transformed modules;
- the new lazy chunk is emitted separately as `ElectronicBandLab` JavaScript and CSS;
- Vite retains one non-fatal advisory that the minified main application chunk is above 500 kB;
- the final in-app browser tab loads `http://127.0.0.1:5174/#electronicBandLab` with section top near 80 px, zero body overflow, and zero warning/error console entries;
- the user-facing browser tab is marked as the deliverable and left on the fresh Level Splitter frame.

Previous validated milestone evidence for the Stereochemical Reaction Theatre remains available in:

- `docs/superpowers/plans/2026-08-30-stereochemical-reaction-theatre.md`
- `docs/stereochemical-reaction-theatre-hero.png`
- `docs/stereochemical-reaction-theatre-mobile.png`
- `docs/stereochemical-reaction-theatre-z-frame.png`

## Current milestone contract

The Electronic Band & Metallic Bonding Observatory contains three linked learner-owned instruments.

### 1. Level Splitter

- Open one-dimensional chain with 2–16 identical one-orbital sites.
- Exact levels:

  ```text
  E_j = alpha + 2 beta cos(j pi / (N + 1))
  beta = -|beta|
  ```

- `N` source orbitals produce exactly `N` finite levels.
- Learners place and remove spin-up/spin-down electrons manually.
- Duplicate same-spin placement and a third electron are blocked with a level-specific reason and the original state reference.
- Wrong electron totals and wrong low-to-high occupations remain visible.
- Coupling, on-site energy, and target-count changes preserve every placed electron.
- A site-count change explicitly loads a new empty rack because the level identities changed.
- At exact zero coupling, all levels are degenerate and `Load declared reference` is a true no-op; the model refuses to invent a unique arrangement.
- Finite spread is compared with the `4|beta|` periodic limit without calling the finite chain a solid.

### 2. Band Loom

- Infinite one-dimensional one-orbital nearest-neighbour model:

  ```text
  E(q) = alpha + 2 beta cos(q)
  q = ka in [-pi, pi]
  width = 4|beta|
  ```

- Learner controls coupling, 0–2 electrons per cell, and the `q` cursor.
- Empty, partially filled, and full occupation are distinguished.
- A partial band exposes a `T = 0` occupation edge and nearby same-band empty states.
- A full displayed band reports no same-band empty state but explicitly refuses to infer an insulator without another allowed band and real evidence.
- `dE/dq` is displayed only as a dimensionless dispersion slope, never velocity, current, mobility, or conductivity.

### 3. Gap Gate

- Two declared cosine bands with direct or indirect edge alignment.
- Frozen cartridges cover:
  - direct positive 1.0 eV gap;
  - direct zero-energy touching;
  - direct 1.0 eV edge overlap;
  - indirect positive 1.0 eV gap;
  - narrow direct 0.2 eV gap.
- Positive gap, touching, and overlap are separate evidence states.
- Overlap is shown as a positive overlap magnitude and hatched shared interval; it is never labelled as a negative gap.
- The model compares the valence maximum and conduction minimum but does not solve two-band occupation or certify metal, semiconductor, or insulator.

All three instruments preserve wrong predictions, retain stale prior audits after state changes, provide four non-mutating hints, contribute to a ten-event learner trace, and share six teacher contrasts plus a 12-source model passport.

Detailed implementation plan:

- `docs/superpowers/plans/2026-08-30-electronic-band-metallic-bonding-observatory.md`

## Authoritative research boundary

Research used only primary/official sources:

- IUPAC Gold Book definitions for energy band, energy-band theory, conduction band, valence band, band-gap energy, energy gap, Fermi level, and density of states;
- MIT OpenCourseWare for the LCAO/tight-binding bridge and one-dimensional band dispersion;
- ACS undergraduate inorganic curriculum guidance for metallic bonding, band theory, conductivity, semiconductors, insulators, and defects as university scope;
- NIST CHIPS-TB for the boundary that real-material tight-binding models need parameterization and benchmarking against electronic-structure or experimental evidence.

The sources support terminology, teaching scope, and model boundaries. They do not validate the synthetic numerical cartridges.

## Files created in the current milestone

- `docs/superpowers/plans/2026-08-30-electronic-band-metallic-bonding-observatory.md`
- `src/data/electronicBandScenarios.js`
- `src/chemistry/electronicBands.js`
- `scripts/verify-electronic-bands.mjs`
- `src/components/ElectronicBandLab.jsx`
- `src/styles/electronic-bands.css`

## Files modified in the current milestone

- `src/data/scienceSources.js`
- `src/data/curriculum.js`
- `src/components/CurriculumAtlas.jsx`
- `src/App.jsx`
- `src/components/Header.jsx`
- `src/components/PolymerPopulationLab.jsx`
- `src/components/ReactionLab.jsx`
- `src/components/EquationSections.jsx`
- `package.json`
- `README.md`
- `CONTRIBUTING.md`
- `docs/CURRENT_PROGRESS.md`

No Git action, model call, paid endpoint, runtime chemistry service, new dependency, backend, or hazardous procedure was used or added.

## Focused deterministic evidence

The focused verifier was written before the engine. Its intentional red run failed only with:

```text
ERR_MODULE_NOT_FOUND: src/chemistry/electronicBands.js
```

After implementation, the fresh focused verifier exits 0 and reports:

```text
Six finite chains, five periodic bands, and five declared two-band edge cartridges resolved.
Manual spin placement, immutable model edits, exact spectra, filling, dispersion, gap/overlap geometry, predictions, and hints verified.
Source passport and real-material, transport, and certification boundaries verified.
```

It verifies exact dimer/six/twelve-site spectra, finite-to-periodic width behavior, recursive freezing, state-reference preservation, explicit site-count reset, zero-coupling no-op reference, preserved Aufbau errors, empty/quarter/half/full periodic filling, `qF`, full-band insufficiency, direct/touching/overlap/indirect edge cases, prediction preservation, hints, source records, and passport exclusions.

## Browser learner evidence

### Finite chain

- A spin-up electron placed in L4 while lower L2/L3 slots were open remained in L4.
- The audit named both lower vacancies without moving the electron.
- Duplicate spin-up in L1 was refused with the opposite-spin reason.
- After L1 contained both spins, a third electron was refused with the two-electron-capacity reason.
- A deliberately incomplete three-electron rack retained all three spins while electron count failed and the other four correct conceptual predictions passed independently.
- Changing coupling preserved all three placed spin controls and marked the previous audit stale.
- The zero-coupling cartridge showed `EXPLODED SAME-ENERGY VIEW`; explicit reference loading left the empty state unchanged and explained why no unique arrangement is claimed.

### Periodic band

- Half filling displayed 50.0% capacity, nearby same-band empty states, `qF = pi/2`, and a normalized `+0.000 eV` occupation edge.
- Four correct half-filled claims resolved.
- Loading the full-band cartridge retained the prior audit as stale.
- Correct full-band claims resolved while the boundary named the absent second band and refused an insulating classification.

### Two-band edge gate

- Direct positive, touching, direct overlap, and indirect positive cartridges displayed the correct edge relation, alignment, extrema, and badge.
- The overlap cartridge displayed `1.00 eV OVERLAP`, never a signed gap.
- Four correct overlap claims resolved.
- Changing the conduction center retained the overlap prediction and marked the audit stale.

### Visual defects found and corrected during QA

1. SVG grid patterns initially inherited black fill and produced a checkerboard. Root cause was a selector aimed at the pattern-using rectangle rather than the path inside `<defs>`. Explicit no-fill/stroke attributes fixed all three grids.
2. The exact half-filled occupation edge initially formatted as `-0.000 eV` from floating-point residue. Near-zero sign normalization now renders `+0.000 eV`.
3. The overlap hatch was initially overridden by a solid CSS fill. The pattern now owns its color and the field keeps `url(#bandOverlapHatch)`.
4. Six mobile teacher buttons were 30.5 px high while all other controls were 44 px. A scoped mobile rule raises those final buttons to 44 px.

## Responsive and accessibility evidence

- Desktop viewport 1280×900: section width 1244 px, no body overflow, Level Splitter visible on fresh load.
- Tablet viewport 742×900: no body overflow; the plot uses only a small internal scroll region.
- Mobile viewport 390×844: section width 374 px, no body overflow, cartridge rail scroll width 1119 px inside a 350 px viewport, plot scroll width 680 px inside a 350 px viewport.
- Minimum visible mobile button height is exactly 44 CSS px.
- A browser Tab interaction produced a visible `3px` violet solid focus outline with `3px` offset on a semantic button.
- All mode controls are native buttons/inputs; SVG plots have titles/descriptions and corresponding text readouts.
- `prefers-reduced-motion` CSS is present. This browser surface did not expose runtime reduced-motion emulation, so only the stylesheet contract—not an emulated run—is evidenced.
- Final browser warning/error log is empty.

## Fresh whole-project validation evidence

- Every one of the 31 `npm run verify:*` commands exited 0 in one complete fresh pass.
- Curriculum script result:

  ```json
  {"live":103,"nextEngine":11,"concept":0,"total":114,"verifiers":31,"areas":7}
  ```

- Section script result:

  ```json
  {"count":33,"numbers":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33],"missing":[],"duplicates":[]}
  ```

- Final `npm run build` result:
  - exit code 0;
  - 142 transformed modules;
  - lazy `ElectronicBandLab` CSS: 32.88 kB, gzip 6.83 kB;
  - lazy `ElectronicBandLab` JS: 67.29 kB, gzip 18.26 kB;
  - non-fatal main-chunk advisory remains.

## Remaining mapped curriculum gaps

All 11 current gaps require another engine:

1. General — full nonideal multiphase equilibrium.
2. Organic — arbitrary reaction stereochemistry, competing pathways, and product evidence.
3. Inorganic — real complex electronic structure.
4. Physical — advanced measured and multicomponent thermodynamics.
5. Physical — measured and quantum reaction pathways.
6. Analytical — measured mass spectra, richer NMR, mixtures, and validated identification.
7. Biochemistry — structure and dynamics.
8. Biochemistry — allostery and cellular regulation.
9. Materials — batteries, corrosion, and electrochemical materials.
10. Materials — bulk polymer properties, morphology, processing, and degradation.
11. Materials — real computed material properties and electronic structure.

## How much remains

### Current Electronic Band milestone

Approximately **1% remains**: optional runtime emulation of `prefers-reduced-motion: reduce` if a future browser surface exposes it. Scientific implementation, focused and full deterministic validation, desktop/tablet/mobile layout, native focus visibility, learner journeys, teacher/source coverage, production build, structural counts, and clean console all have fresh evidence. This percentage is an engineering estimate, not a test result.

### Broader platform goal

The current finite curriculum ledger is **103/114 live (90.4%)** with **11/114 explicit gaps (9.6%)**. That ratio describes only the currently mapped topic clusters; it is not a claim that the site contains 90.4% of all university chemistry. The broader goal remains active because each remaining gap is a substantial measured-data, simulation, or domain-engine project.

## Current next action

Retain this checkpoint as authoritative after compaction. The next bounded milestone should be selected from the 11 gap rows, with the best practical bridge likely one of:

- real computed material/electronic-structure evidence;
- biomolecular structure and dynamics;
- measured mass/NMR/mixture identification;
- electrochemical materials;
- measured/quantum reaction pathways.

Before implementation, define a finite source-backed model contract and preserve every remaining excluded claim. If unexpected behavior appears, use systematic debugging before editing. Do not perform Git actions and do not mark the broader platform goal complete.
