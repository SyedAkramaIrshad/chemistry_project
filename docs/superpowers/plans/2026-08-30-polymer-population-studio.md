# Polymer Population Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This project forbids Git actions, so no commit steps are included.

**Goal:** Add a graphical polymer-population studio where learners build two finite linear homopolymer populations, explicitly analyse them, predict how number- and mass-weighting change the averages, and discover why a repeat unit, one chain, a distribution, and a bulk material are different levels of evidence.

**Architecture:** Three frozen constitutional-repeating-unit teaching records and six frozen comparison challenges feed a pure immutable population engine. The engine validates learner-edited chain-length bins, derives exact finite-chain molar masses including declared end-group contributions, calculates number and mass fractions, `Xn`, `Mn`, `Mw`, molar-mass dispersity, and end-group mass share, then compares two immutable analysis snapshots. A lazy-loaded React lab owns editable populations, explicit analysis snapshots, stale-state warnings, four learner predictions, non-mutating hints, a chronological action trace, chain-loom graphics, and a teacher contrast rail. No runtime external data, synthesis prediction, automatic repair, or bulk-property inference is allowed.

**Tech Stack:** React 19, Vite 8, plain JavaScript modules, CSS/SVG, Node deterministic verifier.

## Global Constraints

- No runtime external calls, measured polymer samples, polymerization procedures, product recommendations, new dependencies, model calls, property databases, molecular dynamics, or synthesis planning.
- Use exactly three declared linear homopolymer repeating-unit records and exactly six frozen comparison challenges.
- A chain is represented only by a positive integer degree of polymerization, a declared CRU molar mass, and a declared combined end-group molar-mass contribution.
- Use `Mi = Mend + Xi Mrepeat`, `xi = Ni / ΣNi`, `wi = Ni Mi / ΣNiMi`, `Mn = ΣNiMi / ΣNi`, `Mw = ΣNiMi² / ΣNiMi`, and `ĐM = Mw / Mn`.
- Also display `Xn = ΣNiXi / ΣNi` and end-group mass share `ΣNiMend / ΣNiMi`. Do not silently equate degree and molar-mass dispersity where finite end groups matter.
- Treat `Ni` as a displayed count of representative chains. `ΣNiMi` is a relative population-mass ledger, not a weighed laboratory sample.
- Preserve learner bins and predictions after analysis whether right or wrong. Never add, remove, rebalance, smooth, or fit bins automatically.
- Editing either population makes the last analysis stale. Only `Analyse both populations` creates a new immutable snapshot.
- A comparison may establish only the displayed finite-population statistics. It may not establish molecular-weight distribution in a real sample, morphology, crystallinity, glass transition, melting, toughness, rheology, processability, degradation, or suitability.
- Minimum interactive target height is 44 px; support 1440 px, 768 px, and 390 px without document-level horizontal overflow; expose visible keyboard focus and respect reduced motion.

## Locked Visual Direction

- **Subject:** undergraduate polymer population statistics and ensemble reasoning.
- **Audience:** materials, physical, and polymer chemistry students plus instructors contrasting chain-level and bulk-level claims.
- **Single job:** build two finite chain populations, freeze an analysis, and defend what number- and mass-weighted averages do and do not prove.
- **Palette:** graphite felt `#243039`, vellum `#f2efe6`, spool teal `#2aa9a1`, chain coral `#ef7768`, mass violet `#7e6de0`, count gold `#e2b34f`, cap blue `#4c87c9`, ink `#20343e`.
- **Type:** Avenir Next Condensed for loom headings, Avenir/system for explanatory copy, and SFMono for chain and population quantities.
- **Signature:** a physical chain loom renders coloured CRU tiles between blue end caps while paired count and mass drums expose how the same bins are weighted differently.
- **Deliberate risk:** the studio resembles a textile sample room and mechanical balance rather than a conventional dashboard. Every decorative spool, thread, drum, and tick must encode a chemistry state.

---

### Task 1: Frozen repeat units, comparison challenges, sources, and model passport

**Files:**
- Create: `src/data/polymerScenarios.js`
- Modify: `src/data/scienceSources.js`
- Create: `scripts/verify-polymer-population.mjs`

**Interfaces:**
- Produces `POLYMER_REPEAT_UNITS`, `POLYMER_REPEAT_UNIT_BY_ID`, `POLYMER_SCENARIOS`, `POLYMER_SCENARIO_BY_ID`, `POLYMER_RELATIONS`, and `POLYMER_MODEL_BOUNDARY`.
- A repeat-unit record is `{ id, name, shortName, motif, formula, repeatMolarMassGmol, endGroups, endGroupMolarMassGmol, accent, provenance, sourceIds }`.
- A population specimen is `{ label, repeatUnitId, bins }`, where each bin is `{ degree, count }`.
- A scenario is `{ id, code, name, summary, mission, left, right, teacherQuestion, misconception, provenance, sourceIds }`.

- [ ] **Step 1: Create a failing data-contract verifier**

  Assert exactly three repeat units, six challenges, unique IDs/codes, finite positive masses, explicit end groups, unique positive-integer degrees, nonnegative-integer counts, at least one chain per specimen, local synthetic provenance, source IDs, and recursive immutability. The first run must fail with `ERR_MODULE_NOT_FOUND` for `polymerScenarios.js`.

- [ ] **Step 2: Add the three declared CRU teaching reels**

  Use average molar masses from the project's local atomic-mass convention:

  | ID | Display motif | Formula | `Mrepeat` | Declared end groups | `Mend` |
  |---|---|---:|---:|---|---:|
  | `ethene-derived` | `–CH₂–CH₂–` | `C₂H₄` | `28.054 g mol⁻¹` | `H / H` | `2.016 g mol⁻¹` |
  | `propene-derived` | `–CH₂–CH(CH₃)–` | `C₃H₆` | `42.081 g mol⁻¹` | `H / H` | `2.016 g mol⁻¹` |
  | `styrene-derived` | `–CH₂–CH(C₆H₅)–` | `C₈H₈` | `104.152 g mol⁻¹` | `H / H` | `2.016 g mol⁻¹` |

  Label every record as an arithmetic teaching chain, not a synthesis route or proof that a real material has only those end groups.

- [ ] **Step 3: Add the six frozen comparison challenges**

  | ID | Left specimen | Right specimen | Required lesson |
  |---|---|---|---|
  | `uniform-vs-spread` | 12 chains at `X=20` | 6 at `X=10`, 6 at `X=30` | equal `Xn` and `Mn`; spread raises `Mw` and `ĐM` |
  | `long-tail-leverage` | 19 at `X=20`, 1 at `X=40` | 19 at `X=20`, 1 at `X=200` | one long-chain tail has disproportionate mass-weighted leverage |
  | `count-mass-lens` | 9 at `X=10`, 1 at `X=90` | 10 at `X=50` | the chain-count majority and population-mass contribution answer different questions |
  | `same-degree-different-cru` | ethene-derived bins `3@12, 6@24, 3@36` | styrene-derived same bins | the same degree distribution does not imply the same molar-mass averages |
  | `end-groups-in-view` | 10 at `X=2` | 10 at `X=40` | the same end-group contribution matters proportionally more for short chains |
  | `same-moments-different-shape` | 9 at `X=10`, 9 at `X=30` | 4 at `X=5`, 10 at `X=20`, 4 at `X=35` | equal first and second moments can still hide different distribution shapes |

  Default all except `same-degree-different-cru` to the ethene-derived reel. Keep maximum degree at 200 so every challenge fits the bounded visual model.

- [ ] **Step 4: Add primary terminology and curriculum source records**

  Add exact records for:

  ```js
  iupacConstitutionalRepeatingUnit: 'https://goldbook.iupac.org/terms/view/09016'
  iupacMacromolecule: 'https://goldbook.iupac.org/terms/view/M03667'
  iupacDegreePolymerization: 'https://goldbook.iupac.org/terms/view/D01569'
  iupacNumberAverageMolarMass: 'https://goldbook.iupac.org/terms/view/12216'
  iupacMassAverageMolarMass: 'https://goldbook.iupac.org/terms/view/12217'
  iupacDispersity: 'https://goldbook.iupac.org/terms/view/12226'
  iupacPurpleBook: 'https://iupac.org/what-we-do/books/purplebook/'
  acsTwoYearCurriculum: 'https://www.acs.org/education/policies/two-year-college/guidelines/curriculum.html'
  ```

  Roles must support terminology or curriculum placement only. They must not imply validation of synthetic populations, end groups, or bulk properties.

- [ ] **Step 5: Add `MODEL_PASSPORTS.polymerPopulationStudio`**

  Conditions must state finite linear homopolymer teaching chains, one declared CRU per specimen, one declared combined end-group mass, integer degrees/counts, synthetic representative populations, average molar masses, and local deterministic arithmetic. Includes must list chain molar mass, number/mass fractions, `Xn`, `Mn`, `Mw`, `ĐM`, end-group share, editable bins, explicit analysis, preserved predictions, hints, comparison, and history. Excludes must name real molecular-weight measurements, SEC/GPC calibration, branching, tacticity, copolymer sequence, architecture, conformation, morphology, crystallinity, thermal transitions, rheology, mechanics, transport, degradation, reaction kinetics, polymerization, processing, additives, safety, and property prediction.

- [ ] **Step 6: Run the data-contract verifier**

  Expected: all frozen records, source URLs, passport fields, curriculum source IDs, and deep-immutability checks pass before engine imports are added.

---

### Task 2: Pure immutable polymer-population engine

**Files:**
- Create: `src/chemistry/polymerPopulation.js`
- Modify: `scripts/verify-polymer-population.mjs`

**Interfaces:**
- Produces `analysePolymerPopulation({ repeatUnitId, bins })`.
- Produces `comparePolymerPopulations(leftAnalysis, rightAnalysis)`.
- Produces `evaluatePolymerAttempt({ comparison, prediction })`.
- Produces `nextPolymerHint({ comparison, prediction, level })`.
- `prediction` is `{ mnRelation, mwRelation, dispersityRelation, distributionClaim }`, where relations are `left`, `equal`, or `right` and the claim is `statistics-prove-same` or `statistics-do-not-prove-same`.

- [ ] **Step 1: Add red validation and invariant tests**

  Assert rejection of unknown repeat units; duplicate, noninteger, nonpositive, or above-200 degrees; negative, noninteger, or above-50 counts; empty populations; missing predictions; malformed snapshots; invalid hint levels; and source mutation. Assert every returned object, bin, and fraction record is frozen.

- [ ] **Step 2: Implement exact finite-population analysis**

  Sort nonzero bins by degree without mutating input and calculate per bin:

  ```js
  Mi = endGroupMolarMassGmol + degree * repeatMolarMassGmol;
  numberFraction = count / chainCount;
  massLedger = count * Mi;
  massFraction = massLedger / totalMassLedger;
  ```

  Calculate totals and averages:

  ```js
  Xn = sum(count * degree) / chainCount;
  Mn = totalMassLedger / chainCount;
  Mw = sum(count * Mi ** 2) / totalMassLedger;
  dispersity = Mw / Mn;
  endGroupMassFraction = chainCount * endGroupMolarMassGmol / totalMassLedger;
  ```

  Return a stable textual equation ledger and assert `Mw + tolerance >= Mn`, fractions sum to one, and `ĐM >= 1` within numerical tolerance.

- [ ] **Step 3: Implement comparison semantics**

  Compare `Mn`, `Mw`, and `ĐM` with relative tolerance `1e-10`. Return relations, signed and percentage changes, whether the exact bin shapes match, whether degree moments match, and whether molar-mass statistics match. Never infer which material is “better.”

- [ ] **Step 4: Implement four-dimensional learner evaluation**

  Score each relation independently and preserve the raw prediction. The distribution claim is correct only when it says the displayed statistics do not establish an identical distribution or any bulk property. Reasons must distinguish number weighting, mass weighting, spread, long-tail leverage, finite end-group effects, and the non-uniqueness of low-order moments.

- [ ] **Step 5: Implement four non-mutating hints**

  - Level 1 points to chain counts and degrees without calculating an answer.
  - Level 2 reveals each side's `ΣNi`, `ΣNiXi`, and the heaviest occupied bin.
  - Level 3 reveals `Xn`, `Mn`, and number-versus-mass fractions for the most contrasting bin.
  - Level 4 reveals `Mw`, `ĐM`, all three relations, and the boundary on distribution/property claims.

- [ ] **Step 6: Run the full verifier**

  Required checks: exact monodisperse `ĐM = 1`; `Mw >= Mn`; fraction closure; equal-`Mn`/different-`Mw`; long-tail leverage; number/mass lens contrast; same bins/different CRU; short-chain end-group share; equal `Mn`/`Mw`/`ĐM` with different shapes; preserved wrong predictions; all hint levels; invalid inputs; and immutability.

---

### Task 3: Graphical React Polymer Population Studio

**Files:**
- Create: `src/components/PolymerPopulationLab.jsx`
- Create: `src/styles/polymer-population.css`

**Interfaces:**
- Consumes Task 1 data, Task 2 engine exports, `MODEL_PASSPORTS.polymerPopulationStudio`, and `SCIENCE_SOURCES`.
- Produces section ID `polymerPopulationLab` with local React state only.

- [ ] **Step 1: Build the challenge pattern shelf**

  Render six tactile pattern cards with code, distribution silhouette, learning tension, and synthetic provenance. Switching a challenge explicitly restores its two starting populations and clears only this lab's analysis, predictions, hints, and history.

- [ ] **Step 2: Build two editable chain looms**

  Each loom must expose:

  - a three-choice CRU reel selector;
  - the motif, formula, repeat mass, end groups, and end-group mass;
  - editable occupied-bin rows with exact degree, count, decrement, increment, and remove controls;
  - an `Add chain length` control accepting integer degree `1–200` and initial count one;
  - a clickable skyline whose selected bin feeds a finite-chain ribbon;
  - a ribbon with two blue end caps, at most twelve visible repeat tiles, an ellipsis for longer chains, and the exact `X` label.

  Changing a reel or bin must not calculate new averages. If a prior snapshot exists, retain it and display `Population changed — the drums still show the previous analysis.`

- [ ] **Step 3: Build the explicit analysis gate and immutable snapshot**

  `Analyse both populations` is the sole calculation action. Disable it only when either side has no chains or invalid input. On click, freeze both analyses and their comparison, append one history entry, reset hints, and keep learner predictions unchanged until the learner explicitly clears them or switches challenge.

- [ ] **Step 4: Build paired count and mass drums**

  After analysis, render for each specimen:

  - a number drum whose segments are `xi`;
  - a mass drum whose segments are `wi`;
  - matching bin colours and direct labels rather than colour-only identification;
  - a connecting thread from the same selected chain bin to both drums;
  - a compact accessible table with `X`, `Ni`, `Mi`, `xi`, and `wi`.

  The drum comparison is the visual signature. It must remain legible without animation and must not imply observed SEC/GPC data.

- [ ] **Step 5: Build learner predictions and evidence cards**

  Require predictions for which side has greater `Mn`, greater `Mw`, greater `ĐM`, and whether matching displayed statistics would prove identical distributions or properties. Disable `Check four claims` until all are selected. After check, preserve wrong answers and reveal four separate verdict cards with quantity-specific reasons.

- [ ] **Step 6: Build the population ledger**

  Display `ΣNi`, `Xn`, `Mn`, `Mw`, `ĐM`, and end-group mass share for both sides. Every formula line must expose the exact numerator and denominator. Use `g mol⁻¹` only for individual and average molar masses; label the sum as a relative mass ledger.

- [ ] **Step 7: Build hints, history, clear, and reset semantics**

  Add four non-mutating hints, chronological learner actions, `Clear predictions`, and `Reset pattern`. Clearing predictions must not alter looms or analysis. Resetting the pattern is the only action that restores the scenario's default populations and clears the local history.

- [ ] **Step 8: Build the teacher contrast rail**

  Provide six one-click pattern loaders but never auto-analyse. Add explicit contrast cards for CRU versus monomer, one chain versus population, number versus mass weighting, average versus distribution shape, molar-mass statistics versus bulk property, and finite end groups versus high-degree approximations.

- [ ] **Step 9: Add model passport and primary-source console**

  Render conditions, included/excluded claims, local synthetic provenance, formulas, and eight direct sources. Prominently state: `These finite teaching populations explain weighting. They are not measured samples and do not predict a material property or synthesis outcome.`

- [ ] **Step 10: Apply the locked visual system**

  Derive colours from the eight locked tokens. Use one spool-turn and one drum-settle animation only, both triggered by explicit analysis and both disabled under reduced motion. Avoid generic KPI-card composition: the loom, skyline, threads, drums, and vellum ledger must dominate the section.

---

### Task 4: Integration, curriculum promotion, and documentation

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/Header.jsx`
- Modify: `src/components/ReactionLab.jsx`
- Modify: `src/components/EquationSections.jsx`
- Modify: `src/data/curriculum.js`
- Modify: `src/styles.css`
- Modify: `package.json`
- Modify: `README.md`

- [ ] **Step 1: Lazy-load and place the studio**

  Import `PolymerPopulationLab` lazily and place it after `CrystalLatticeLab` and before `ReactionLab`. Add one desktop and one mobile `More labs` entry. Import `polymer-population.css` through `src/styles.css`.

- [ ] **Step 2: Keep panel numbering continuous**

  Label the new studio `23 / Polymer population studio`, shift Reaction chamber to `24`, and Equation balancer to `25`.

- [ ] **Step 3: Promote bounded materials coverage**

  Add outcome: `Distinguish a constitutional repeating unit, one finite chain, a chain population, and a bulk material claim.` Replace the single `Polymers` next-engine card with:

  - live `Polymer repeat units and molar-mass populations`;
  - next-engine `Bulk polymer properties, morphology, processing, and degradation`.

  Add the live lab link and update the materials boundary to include finite linear homopolymer arithmetic while keeping real distributions and properties excluded. Expected atlas count becomes 82 live topic clusters.

- [ ] **Step 4: Add package verification and README coverage**

  Add `verify:polymer-population`. Document component/data/engine/verifier files, student controls, exact formulas, model boundary, research basis, and deterministic verifier scope. Update 22 deterministic verifiers to 23 wherever counted.

---

### Task 5: Requested deterministic, build, and browser learning validation

**Files:**
- Validate only after Tasks 1–4 are complete.

- [ ] **Step 1: Run the polymer verifier fresh**

  Run: `npm run verify:polymer-population`

  Expected: all frozen data, numerical invariants, scenarios, feedback, hints, and immutability checks pass.

- [ ] **Step 2: Run all 23 deterministic verifiers**

  Enumerate every `verify:*` script from `package.json`, run each once, and retain the raw pass/fail list. Do not describe structural passing as empirical validation.

- [ ] **Step 3: Build production assets**

  Run: `npm run build`

  Expected: Vite completes without import, syntax, or CSS errors and emits a lazy PolymerPopulationLab chunk.

- [ ] **Step 4: Student browser journey at 1440 px**

  Open `#polymerPopulationLab`, load `uniform-vs-spread`, edit one bin without analysis, confirm no metrics update, analyse explicitly, submit one deliberately wrong four-part prediction, confirm it remains visible with reasons, use all four hints without state mutation, and inspect count/mass drums, formula ledger, history, and passport.

- [ ] **Step 5: Teacher browser journey at 768 px**

  Load `same-moments-different-shape` from the contrast rail, confirm it does not auto-analyse, analyse, verify equal `Mn`, `Mw`, and `ĐM` with visibly different skylines, and confirm the interface refuses identical-distribution and bulk-property claims.

- [ ] **Step 6: Mobile browser journey at 390 px**

  Add and remove a chain-length bin, switch a CRU reel, analyse, make predictions, inspect both drums and tables, open model sources, and confirm no document-level horizontal overflow or clipped controls.

- [ ] **Step 7: Accessibility and console audit**

  Confirm every interactive control is keyboard reachable, focus is visible, buttons have accessible names, drum information has a table equivalent, reduced-motion mode preserves all evidence, and the browser console has zero errors.

- [ ] **Step 8: Save the verified preview and restore browser state**

  Save a final desktop screenshot, restore the browser viewport, leave the polymer section visible, and mark the existing local tab as the deliverable.
