# Chromatography Control Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This project forbids Git actions, so no commit steps are included.

**Goal:** Add a graphical analytical-separation control room where learners explicitly choose a stationary-phase cartridge, column length, and relative flow velocity; run a virtual two-component chromatogram; predict four claims; and distinguish retention, separation factor, efficiency, resolution, and chemical identity without automatic method optimization.

**Architecture:** Six deep-frozen synthetic separation challenges feed a pure immutable chromatography engine. The engine validates a bounded relative-velocity plate-height model, calculates hold-up and retention times, retention and separation factors, Gaussian peak widths, plate number, peak resolution, flow region, and a deterministic detector trace. A lazy-loaded React lab owns method controls, explicit run state, learner predictions, hints, trace history, and the instrument rendering; no runtime external data or automatic parameter selection is allowed.

**Tech Stack:** React 19, Vite 8, plain JavaScript modules, CSS/SVG, Node deterministic verifier.

## Global Constraints

- No runtime external calls, measured chromatograms, compound identification, new dependencies, model calls, chemical handling, operating procedures, pressure/solvent advice, or real instrument control.
- Use exactly six frozen synthetic two-component challenges and exactly three declared stationary-phase cartridges per challenge.
- Treat the velocity input as a dimensionless relative teaching coordinate `u/u0`, not a transferable flow rate.
- Use the declared plate-height teaching relation `H* = A + B/u + C u`; its coefficients and resulting plate number are synthetic scenario inputs rather than fitted column properties.
- Use IUPAC quantities consistently: hold-up time `tM`, total retention time `tR`, adjusted retention time `tR' = tR - tM`, retention factor `k = tR'/tM`, separation factor `alpha = k2/k1 > 1`, Gaussian half-height width `wh`, plate number `N = 5.545 (tR/wh)^2`, base width `wb = 4 sigma`, and peak resolution `Rs = 2(tR2-tR1)/(wb1+wb2)`.
- Label `Rs >= 1.5` only as the board's baseline-resolution criterion. Never present it as universal proof of purity, identity, method validity, or complete separation in every real system.
- Preserve learner predictions after checking whether right or wrong. Changing a method control never runs, optimizes, or repairs the method automatically.
- A method change marks the displayed run as stale. Only the explicit `Run virtual injection` action generates a new trace.
- Minimum interactive target height is 44 px; support 1440 px, 768 px, and 390 px without document-level horizontal overflow; expose visible keyboard focus and respect reduced motion.

## Locked visual direction

- **Subject:** undergraduate column-chromatography fundamentals and instrumental reasoning.
- **Audience:** students in quantitative analysis or introductory instrumental analysis, plus instructors demonstrating why selectivity and efficiency are different levers.
- **Single job:** define a virtual method, read its chromatogram, and defend four claims from the displayed evidence.
- **Palette:** instrument charcoal `#16252d`, paper ivory `#f3f0e4`, detector green `#38d39f`, component-A cyan `#36b6d7`, component-B amber `#f0ad4e`, warning magenta `#e45c7d`, steel blue `#6f8794`, ink `#1d3440`.
- **Type:** Avenir Next Condensed for instrument headings, Avenir/system for explanatory copy, and SFMono for quantities and method records.
- **Signature:** a luminous separation column feeds a detector head and continuously drawn paper chromatogram. The graph, detector lamp, and method ledger all derive from the same frozen run.
- **Deliberate risk:** the main interaction resembles a compact vintage analytical instrument face rather than a standard dashboard; ornament is limited to functional bezels, calibration ticks, and the paper feed.

---

### Task 1: Frozen challenges, primary sources, and model passport

**Files:**
- Create: `src/data/chromatographyScenarios.js`
- Modify: `src/data/scienceSources.js`
- Create: `scripts/verify-chromatography.mjs`

**Interfaces:**
- Produces `CHROMATOGRAPHY_SCENARIOS`, `CHROMATOGRAPHY_SCENARIO_BY_ID`, `CHROMATOGRAPHY_MODEL_BOUNDARY`, `CHROMATOGRAPHY_PHASE_COLORS`, and `CHROMATOGRAPHY_RESOLUTION_BANDS`.
- A phase cartridge is `{ id, label, chemistryHint, kA, kB, accent }`.
- A scenario is `{ id, code, name, summary, mission, componentA, componentB, phases, defaultMethod, model, teacherQuestion, misconception, provenance, sourceIds }`.
- `defaultMethod` is `{ phaseId, columnLengthCm, relativeVelocity }`.
- `model` is `{ referenceLengthCm, holdUpAtReferenceMin, plateScale, A, B, C }`.

- [ ] **Step 1: Create a failing data-contract verifier**

  Import the five data exports and assert exact top-level counts and IDs:

  ```js
  assert.equal(CHROMATOGRAPHY_SCENARIOS.length, 6);
  assert.deepEqual(
    CHROMATOGRAPHY_SCENARIOS.map((item) => item.id),
    [
      'crowded-pair',
      'phase-order-reversal',
      'short-column',
      'slow-flow',
      'fast-flow',
      'retention-is-not-identity',
    ],
  );
  assert.deepEqual(Object.keys(CHROMATOGRAPHY_RESOLUTION_BANDS), [
    'overlap',
    'partial',
    'board-baseline',
  ]);
  ```

  For every scenario require a unique ID/code, two component labels, exactly three phase cartridges, unique phase IDs, positive `kA` and `kB`, default phase present, default length in `[5, 15, 25]`, relative velocity in `[0.3, 3]`, positive model coefficients, synthetic provenance, teacher question, misconception, source IDs, and deep immutability.

- [ ] **Step 2: Run the verifier and confirm the missing-module failure**

  Run: `node scripts/verify-chromatography.mjs`

  Expected: `ERR_MODULE_NOT_FOUND` for `chromatographyScenarios.js`.

- [ ] **Step 3: Add the six frozen challenges**

  Use these pedagogical roles:

  | ID | Default challenge | Required contrast |
  |---|---|---|
  | `crowded-pair` | close retention factors and overlapping peaks | change phase separation factor without treating later elution as intrinsically better |
  | `phase-order-reversal` | the two phase cartridges reverse which component is retained longer | elution order is method-dependent in this frozen model |
  | `short-column` | a 5 cm column has insufficient plate number | length increases efficiency and run time but does not create selectivity |
  | `slow-flow` | `u/u0 = 0.35` raises the `B/u` term | longitudinal-diffusion side of the declared teaching curve |
  | `fast-flow` | `u/u0 = 2.8` raises the `C u` term | mass-transfer side of the declared teaching curve |
  | `retention-is-not-identity` | two synthetic components have nearly matching retention | retention agreement alone never establishes identity |

  Each scenario has three named teaching cartridges. At least one cartridge must reverse A/B order across the full scenario set, at least one must have separation factor below `1.08`, and at least one must have separation factor above `1.35`. All labels must say `synthetic cartridge` or `teaching phase`; no cartridge may imply a real commercial stationary phase.

- [ ] **Step 4: Add resolution-band metadata**

  Use exact boundaries and copy:

  ```js
  export const CHROMATOGRAPHY_RESOLUTION_BANDS = deepFreeze({
    overlap: {
      id: 'overlap',
      min: 0,
      max: 1,
      label: 'Strong overlap',
      detail: 'Rs is below 1.00 in the board model.',
    },
    partial: {
      id: 'partial',
      min: 1,
      max: 1.5,
      label: 'Partial separation',
      detail: 'Rs is at least 1.00 but below the board criterion of 1.50.',
    },
    'board-baseline': {
      id: 'board-baseline',
      min: 1.5,
      max: Number.POSITIVE_INFINITY,
      label: 'Meets board baseline criterion',
      detail: 'Rs is at least 1.50; identity, purity, and method validity remain unproven.',
    },
  });
  ```

- [ ] **Step 5: Add primary source records**

  Add exact records for:

  ```js
  iupacChromatographyHoldUpTime: 'https://goldbook.iupac.org/terms/view/10038'
  iupacChromatographyRetentionTime: 'https://goldbook.iupac.org/terms/view/10039'
  iupacChromatographyRetentionFactor: 'https://goldbook.iupac.org/terms/view/R05359'
  iupacChromatographySeparationFactor: 'https://goldbook.iupac.org/terms/view/S05614'
  iupacChromatographyPeakWidth: 'https://goldbook.iupac.org/terms/view/P04466'
  iupacChromatographyPlateNumber: 'https://goldbook.iupac.org/terms/view/P04694'
  iupacChromatographyPeakResolution: 'https://goldbook.iupac.org/terms/view/P04465'
  nistSeparationMethods: 'https://nvlpubs.nist.gov/nistpubs/Legacy/IR/nistir89-3933.pdf'
  ```

  Reuse `acsUndergraduateCurriculum`. Roles must state the exact quantity or curriculum boundary supported; they must not claim that the source validates the synthetic scenario coefficients.

- [ ] **Step 6: Add `MODEL_PASSPORTS.chromatographyControlRoom`**

  Conditions must state frozen synthetic two-component traces, relative velocity, Gaussian symmetric peaks, the declared `H*` relation, no extra-column variance, no detector noise, and local deterministic calculation. Includes must list `tM`, `tR`, adjusted time, `k`, `alpha`, `H*`, `N`, widths, `Rs`, summed detector signal, explicit method controls, preserved predictions, hints, and method history. Excludes must name real solvents, columns, commercial phases, pressure, temperature programming, gradients, injection volume, overload, tailing/fronting, extra-column broadening, detector response factors, noise, calibration, concentration, peak area quantitation, compound identification, purity, recovery, robustness, validation, uncertainty, safety, and operating procedure.

- [ ] **Step 7: Run the data-contract verifier**

  Expected: the frozen challenge/source/passport contract passes before engine imports are added.

---

### Task 2: Pure immutable chromatography engine

**Files:**
- Create: `src/chemistry/chromatography.js`
- Modify: `scripts/verify-chromatography.mjs`

**Interfaces:**
- Produces `simulateChromatographyRun({ scenarioId, method })`.
- Produces `evaluateChromatographyAttempt({ run, prediction })`.
- Produces `nextChromatographyHint({ run, prediction, level })`.
- Produces `compareChromatographyRuns(previousRun, nextRun)`.
- `method` is `{ phaseId, columnLengthCm, relativeVelocity }`.
- `prediction` is `{ firstPeak, resolutionClass, flowRegion, identityClaim }`.

- [ ] **Step 1: Add red validation and invariant tests**

  Assert rejection of unknown scenarios/phases, unsupported lengths, nonfinite or out-of-range velocity, nonpositive model coefficients, missing predictions, and mutated source objects. Assert every returned object and nested trace point is frozen.

- [ ] **Step 2: Implement method normalization and the declared plate-height model**

  Use exact equations:

  ```js
  const u = method.relativeVelocity;
  const H = A + B / u + C * u;
  const optimumVelocity = Math.sqrt(B / C);
  const plateNumber = plateScale * method.columnLengthCm / H;
  const holdUpTime = holdUpAtReferenceMin
    * (method.columnLengthCm / referenceLengthCm)
    / u;
  ```

  Return the separate `A`, `B/u`, and `C u` contributions. Classify flow as `slow` when `u/uOpt < 0.8`, `fast` when `u/uOpt > 1.25`, otherwise `near-optimum`.

- [ ] **Step 3: Implement retention, width, and resolution calculations**

  For each component:

  ```js
  adjustedRetentionTime = holdUpTime * retentionFactor;
  retentionTime = holdUpTime + adjustedRetentionTime;
  sigma = retentionTime / Math.sqrt(plateNumber);
  widthHalfHeight = 2 * Math.sqrt(2 * Math.log(2)) * sigma;
  widthBase = 4 * sigma;
  recalculatedPlateNumber = 5.545 * (retentionTime / widthHalfHeight) ** 2;
  ```

  Sort peaks by retention time for the displayed first/second order while preserving component identity. Calculate:

  ```js
  separationFactor = largerK / smallerK;
  resolution = 2 * Math.abs(tR2 - tR1) / (wb1 + wb2);
  ```

  Use `overlap` below `1.0`, `partial` from `1.0` through below `1.5`, and `board-baseline` at or above `1.5`.

- [ ] **Step 4: Generate a deterministic detector trace**

  Generate 281 points from time zero through `max(tR + 4 sigma)`. For each component use a unit-area Gaussian scaled by the scenario's declared response weight:

  ```js
  signal = responseWeight
    * Math.exp(-0.5 * ((time - retentionTime) / sigma) ** 2)
    / (sigma * Math.sqrt(2 * Math.PI));
  totalSignal = signalA + signalB;
  ```

  Normalize all three rendered signals by the maximum total signal only for chart height. Keep the raw values in the run output.

- [ ] **Step 5: Implement four-dimensional learner evaluation**

  Expected values are:

  ```js
  {
    firstPeak: run.order[0].componentId,
    resolutionClass: run.resolutionClass,
    flowRegion: run.flowRegion,
    identityClaim: 'not-established',
  }
  ```

  Score each dimension independently, preserve the raw prediction, and return quantity-specific reasons. An incorrect identity claim must state that retention evidence can support comparison under declared conditions but cannot alone establish chemical identity.

- [ ] **Step 6: Implement four non-mutating hints**

  - Level 1: direct attention to the unretained marker, peak maxima, and peak widths without giving classifications.
  - Level 2: reveal `tM`, the two `tR` values, and which peak maximum appears first.
  - Level 3: reveal `kA`, `kB`, `alpha`, `H*`, and the current `u/uOpt` ratio.
  - Level 4: reveal `Rs`, its board band, the flow region, and the identity boundary.

- [ ] **Step 7: Implement immutable run comparison**

  Return signed changes in `tM`, both `tR`, `alpha`, `H*`, `N`, `Rs`, and final trace time plus plain-language lever statements. Never label the later run “better” without naming the selected objective.

- [ ] **Step 8: Run the full verifier**

  Expected: all six default runs, phase reversal, selectivity change, length scaling, slow/fast flow branches, Gaussian width identity, plate-number closure, resolution bands, trace sums, learner preservation, hints, comparisons, and invalid inputs pass.

---

### Task 3: Graphical React Chromatography Control Room

**Files:**
- Create: `src/components/ChromatographyLab.jsx`
- Create: `src/styles/chromatography.css`

**Interfaces:**
- Consumes Task 1 data, Task 2 engine exports, `MODEL_PASSPORTS.chromatographyControlRoom`, and `SCIENCE_SOURCES`.
- Produces section ID `chromatographyLab` with local React state only.

- [ ] **Step 1: Build the challenge cassette rail**

  Render six compact challenge cassettes with code, learning tension, and synthetic provenance. Switching a cassette explicitly resets this lab's method, run, prediction, comparison, hints, and history to that challenge's declared defaults.

- [ ] **Step 2: Build the method console**

  Render exactly three phase-cartridge buttons, a 5/15/25 cm length rail, and a labelled relative-velocity range input from `0.30` to `3.00`. Show live `A`, `B/u`, and `C u` bars before a run, but do not calculate or reveal peaks until `Run virtual injection` is pressed. Any control change after a run shows `Method changed — displayed paper belongs to the previous run` and keeps the previous trace visible.

- [ ] **Step 3: Build the graphical separation instrument**

  The instrument must contain:

  - a sample inlet with two coloured synthetic component bands;
  - a vertical column tube whose band motion is triggered only by a run;
  - a detector head with an explicit unretained `tM` pulse;
  - an SVG paper chromatogram with separate translucent A/B peak fills and a high-contrast summed signal;
  - time ticks, a paper-feed edge, and a moving pen animation;
  - post-check calipers for `tM`, both maxima, half-height widths, base widths, and peak separation;
  - a compact table fallback with the same quantities for screen-reader and teacher use.

  Motion is ornamental. All run evidence appears immediately and remains understandable with reduced motion.

- [ ] **Step 4: Build learner predictions and commit controls**

  Require four independent predictions after a run:

  - which component peak appears first;
  - strong overlap, partial separation, or meets the board baseline criterion;
  - slow, near-optimum, or fast side of the declared plate-height curve;
  - whether matching retention alone establishes identity.

  Disable `Compare four claims` until all four are set. Preserve every wrong prediction after check.

- [ ] **Step 5: Build the evidence rack**

  After checking, reveal four separate verdict cards plus a quantity ledger for `tM`, `tR'`, `tR`, `k`, `alpha`, `H*`, `N`, `wh`, `wb`, `Rs`, and elapsed trace time. Every formula line must state its inputs. The identity verdict remains separate from numerical resolution.

- [ ] **Step 6: Build explicit run history, hints, and reset semantics**

  Add four non-mutating hints, a chronological history of method changes/runs/checks, `Clear predictions`, and `Reset challenge`. `Clear predictions` must not alter the method or paper. `Reset challenge` must be the only action that restores default controls and removes run history.

- [ ] **Step 7: Build the teacher comparison rail**

  Add four comparisons with one-click cassette/method loading but no automatic run:

  - separation factor versus retention magnitude;
  - column efficiency versus stationary-phase separation factor;
  - slow-side `B/u` versus fast-side `C u` broadening;
  - chromatographic resolution versus chemical identity, purity, and method validation.

- [ ] **Step 8: Add the model passport and source console**

  Render conditions, included/excluded claims, synthetic provenance, formulas, and nine direct primary-source links. Prominently state: `A resolved synthetic trace is evidence about this declared model, not proof of identity, purity, or a transferable real method.`

- [ ] **Step 9: Apply the locked visual system**

  Derive every colour from the eight locked tokens. Keep surrounding panels quiet so the paper chromatogram and column/detector assembly carry the visual identity. Use one detector-scan animation and one band-transit animation only; disable both under reduced motion.

- [ ] **Step 10: Add responsive and accessibility rules**

  At 768 px stack method controls above the paper while retaining the column beside the graph. At 390 px make challenge cassettes horizontally scrollable, stack the column above the paper, use single-column prediction and evidence cards, retain 44 px controls, prevent document overflow, keep every SVG label readable, and expose a 3 px focus outline.

---

### Task 4: App integration, curriculum promotion, numbering, and documentation

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/Header.jsx`
- Modify: `src/data/curriculum.js`
- Modify: `src/components/FunctionalGroupLab.jsx`
- Modify: `src/components/BiomolecularStudio.jsx`
- Modify: `src/components/EnzymeKineticsLab.jsx`
- Modify: `src/components/MechanismLab.jsx`
- Modify: `src/components/StereochemistryLab.jsx`
- Modify: `src/components/CoordinationFieldLab.jsx`
- Modify: `src/components/CrystalLatticeLab.jsx`
- Modify: `src/components/ReactionLab.jsx`
- Modify: `src/components/EquationSections.jsx`
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- Adds lazy anchor `#chromatographyLab`.
- Adds package script `verify:chromatography`.

- [ ] **Step 1: Lazy-load after measurement evidence**

  Insert `ChromatographyLab` after `MeasurementEvidenceLab` and before `FunctionalGroupLab`.

- [ ] **Step 2: Add desktop and mobile navigation**

  Label: `Chromatography`

  Detail: `Tune retention, efficiency, and resolution`

- [ ] **Step 3: Promote bounded analytical-separation coverage**

  Replace the combined next-engine topic with two topics:

  ```js
  {
    name: 'Chromatographic separation foundations',
    status: 'live',
    detail: 'Choose a declared phase, length, and relative velocity; run a synthetic two-peak trace; and distinguish retention, separation factor, efficiency, resolution, and identity.',
  }
  {
    name: 'Reference spectra and compound identification',
    status: 'next-engine',
    detail: 'Needs measured reference data, peak assignment, orthogonal evidence, compound-specific models, and validated workflows.',
  }
  ```

  Add the lab to analytical live labs and add an outcome that separates `tR`, `k`, `alpha`, `N`, and `Rs`. Update the analytical model boundary to retain real method development, identification, validation, quantitation, and instrument-operation exclusions.

- [ ] **Step 4: Renumber downstream sections**

  Keep spectroscopy 13 and measurement evidence 14. Assign chromatography 15, functional groups 16, biomolecular 17, enzyme 18, mechanism 19, stereochemistry 20, coordination 21, crystal 22, reaction chamber 23, and equation balancer 24.

- [ ] **Step 5: Add package script and documentation**

  Update the verifier count from 21 to 22. Document method controls, formulas, six challenges, prediction preservation, resolution criterion, identity boundary, architecture files, source basis, model passport, and exact verifier command.

---

### Task 5: Deterministic, production, and browser validation

**Files:**
- Modify only when a validation finding requires an in-scope fix.

- [ ] **Step 1: Run the new verifier and all existing verifiers**

  Expected: 22/22 package verification scripts exit zero.

- [ ] **Step 2: Run `npm run build`**

  Record transformed-module count, lazy chromatography JS/CSS chunk sizes, and any chunk-size advisory separately from failures.

- [ ] **Step 3: Use the lab as a student**

  - Run the crowded-pair default, submit four wrong claims, and confirm every claim remains after checking.
  - Change a phase cartridge and confirm the old paper is marked stale until an explicit new run.
  - Resolve the crowded pair manually with a more selective cartridge without calling later retention “better.”
  - Compare the short and long column and verify length changes `N`, widths, resolution, and run time but leaves `alpha` unchanged.
  - Exercise both slow- and fast-flow challenges and verify the correct `B/u` or `C u` contribution dominates.
  - Claim that matching retention proves identity and confirm the UI rejects only that claim with a precise reason.
  - Request all four hints and confirm no method, run, or prediction changes.
  - Clear predictions and reset the challenge only through their explicit controls.

- [ ] **Step 4: Use the lab as a teacher**

  - Exercise all four contrast-rail loaders and confirm none runs automatically.
  - Verify `tM`, `tR`, adjusted time, `k`, `alpha`, `H*`, `N`, widths, and `Rs` remain internally consistent.
  - Verify the `Rs >= 1.5` copy always says board criterion and never proves identity, purity, validation, or universal separation.
  - Inspect all source links, assumptions, Gaussian boundary, relative-velocity statement, and real-method exclusions.

- [ ] **Step 5: Audit responsive and accessibility behaviour**

  Check 1440x900, 768x1024, and 390x844 in initial, run, and checked states. Require zero document overflow, minimum 44 px visible targets, keyboard-visible focus, reduced-motion CSS, chart and column inside their fields, readable table fallback, and zero browser console warnings/errors.

- [ ] **Step 6: Re-run affected checks after any browser fix**

  Report exact verifier/build/browser evidence and keep the broader university-platform goal active.

## Self-review

- Spec coverage: six frozen challenges, method controls, explicit run semantics, all declared chromatography quantities, Gaussian trace generation, plate-height tradeoff, four preserved predictions, hints, history, teacher contrasts, sources, passport, curriculum, navigation, numbering, documentation, and browser validation map to explicit tasks.
- Placeholder scan: no banned placeholder token, cross-task shorthand, or unspecified error/validation step remains.
- Type consistency: all five data exports and four engine exports use identical names across producers, verifier, UI, and integration tasks.
- Scientific boundary: the milestone fills bounded chromatography fundamentals but intentionally leaves measured reference spectra, compound identification, real method development, quantitation, validation, gradients, pressure, and physical instrument operation outside scope.
- Design critique: the instrument-face metaphor is specific to chromatography because column, detector, paper feed, calibration ticks, and peak calipers encode actual quantities. Decorative effects are limited to the detector scan and band transit; the design does not rely on generic gradient cards, dashboard statistics, or ornamental chemistry icons.
