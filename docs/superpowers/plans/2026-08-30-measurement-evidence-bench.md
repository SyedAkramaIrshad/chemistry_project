# Measurement Evidence Bench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This project forbids Git actions, so no commit steps are included.

**Goal:** Add a graphical analytical-chemistry bench where learners edit replicate measurements and blank signals, predict what the evidence supports, and distinguish repeatability, closeness to a reference, confidence intervals, expanded uncertainty, and detection limits.

**Architecture:** Frozen synthetic teaching scenarios feed a pure immutable statistics engine. A lazy-loaded React lab owns only learner edits, predictions, reveal state, mode state, and rendering. The engine keeps the classical 95% Student-t interval separate from a GUM-style root-sum-square uncertainty budget and keeps the IUPAC blank-based detection threshold separate from a quantitation limit.

**Tech Stack:** React 19, Vite 8, plain JavaScript modules, CSS/SVG, Node deterministic verifier.

## Global Constraints

- No external runtime calls, measured sample claims, model calls, new dependencies, or operational laboratory procedures.
- Every preset is visibly synthetic and frozen; no preset certifies a real analytical method.
- Preserve learner-entered wrong predictions and raw replicate values after comparison.
- Use `s = sqrt(sum((xi-xbar)^2)/(n-1))`, `SE = s/sqrt(n)`, and a two-sided 95% Student-t interval for a mean with `n-1` degrees of freedom.
- Explain that a finished 95% interval is not a 95% probability statement about its contained mean.
- Keep the statistical 95% confidence interval separate from `uc = sqrt(uA^2 + uB^2)` and `U = k uc`; always display the chosen coverage factor `k` without assigning an automatic probability.
- Use `xL = blankMean + kDetection sBlank` for the declared IUPAC-style teaching threshold; keep the chosen factor visible and do not call it a universal value.
- Do not calculate or imply a quantitation limit, false-positive rate, false-negative rate, method validation, certified reference value, or clinical/regulatory decision.
- Minimum interactive target height is 44 px; support 1440 px, 768 px, and 390 px widths without horizontal overflow; respect reduced motion.

---

### Task 1: Frozen scenarios, sources, and model passport

**Files:**
- Create: `src/data/measurementScenarios.js`
- Modify: `src/data/scienceSources.js`
- Create: `scripts/verify-measurement-uncertainty.mjs`

**Interfaces:**
- Produces: `ASSAY_COMPARISON_SCENARIOS`, `ASSAY_COMPARISON_SCENARIO_BY_ID`, `DETECTION_GATE_SCENARIOS`, `DETECTION_GATE_SCENARIO_BY_ID`, and `MEASUREMENT_UNCERTAINTY_MODEL_BOUNDARY`.
- Assay scenario shape contains `laneA: number[]` and `laneB: number[]`, each with 3–12 synthetic concentration estimates in `µmol L−1`, plus display labels at scenario level.
- Detection shape: `{ blankValues: number[], candidateSignal, calibrationSlope, calibrationIntercept, detectionFactor }` with 5–12 synthetic response values.

- [ ] **Step 1: Create a failing data-contract verifier**

  Import the five exports above and assert four assay scenarios, three detection scenarios, unique IDs, valid counts, finite values, positive slopes, factors from 1–5, explicit `synthetic-teaching` provenance, source IDs, model-boundary language, and deep immutability.

- [ ] **Step 2: Run the verifier and confirm the missing-module failure**

  Run: `node scripts/verify-measurement-uncertainty.mjs`

  Expected: `ERR_MODULE_NOT_FOUND` for `measurementScenarios.js`.

- [ ] **Step 3: Add four assay comparisons**

  Add these exact teaching records:

  ```js
  {
    id: 'precision-versus-reference', referenceValue: 10,
    laneA: [10.16, 10.14, 10.15, 10.17, 10.15],
    laneB: [9.82, 10.15, 10.05, 9.94, 10.04],
    typeBStandardUncertainty: 0.02, coverageFactor: 2,
  }
  {
    id: 'same-mean-different-spread', referenceValue: 20,
    laneA: [19.98, 20.00, 20.02, 20.01, 19.99],
    laneB: [19.75, 20.18, 20.10, 19.88, 20.09],
    typeBStandardUncertainty: 0.03, coverageFactor: 2,
  }
  {
    id: 'replicate-count-and-width', referenceValue: 5,
    laneA: [4.88, 4.96, 5.04, 5.12],
    laneB: [4.86, 4.90, 4.94, 4.98, 5.02, 5.06, 5.10, 5.14],
    typeBStandardUncertainty: 0.025, coverageFactor: 2,
  }
  {
    id: 'single-extreme-result', referenceValue: 15,
    laneA: [14.98, 15.02, 15.01, 14.99, 15.00, 15.55],
    laneB: [14.90, 15.08, 14.95, 15.06, 15.00, 15.01],
    typeBStandardUncertainty: 0.02, coverageFactor: 2,
  }
  ```

  Label every value as synthetic and include a teacher question and misconception for each record.

- [ ] **Step 4: Add three blank-gate scenarios**

  Add these exact synthetic records with editable candidate, slope, intercept, and factor:

  ```js
  {
    id: 'quiet-blank-detectable',
    blankValues: [0.0010, 0.0015, 0.0005, 0.0012, 0.0008, 0.0011],
    candidateSignal: 0.008, calibrationSlope: 0.020,
    calibrationIntercept: 0, detectionFactor: 3,
  }
  {
    id: 'noisy-blank-borderline',
    blankValues: [0.002, 0.008, -0.001, 0.005, 0.011, 0.003],
    candidateSignal: 0.012, calibrationSlope: 0.020,
    calibrationIntercept: 0, detectionFactor: 3,
  }
  {
    id: 'offset-blank-detectable',
    blankValues: [0.021, 0.019, 0.023, 0.020, 0.022, 0.018],
    candidateSignal: 0.030, calibrationSlope: 0.015,
    calibrationIntercept: 0.020, detectionFactor: 3,
  }
  ```

- [ ] **Step 5: Add authoritative source records**

  Add source entries for NIST TN 1297 Type A, combined standard uncertainty, expanded uncertainty, reporting uncertainty, NIST confidence limits for the mean, JCGM 100:2008, IUPAC repeatability, IUPAC standard uncertainty, IUPAC limit of detection, and the ACS undergraduate curriculum.

- [ ] **Step 6: Add `MODEL_PASSPORTS.measurementEvidenceBench`**

  State the statistical assumptions, included calculations, synthetic input provenance, and exclusions. Explicitly separate confidence intervals, expanded uncertainty/coverage factors, detection, and quantitation.

- [ ] **Step 7: Run the data-contract verifier**

  Expected: the frozen scenario/source contract passes while engine imports are not yet present.

---

### Task 2: Immutable repeatability and uncertainty engine

**Files:**
- Create: `src/chemistry/measurementUncertainty.js`
- Modify: `scripts/verify-measurement-uncertainty.mjs`

**Interfaces:**
- Produces: `summarizeReplicates(values)`, `analyzeAssayComparison(input)`, `evaluateAssayPrediction({analysis,prediction})`, and `nextAssayHint({analysis,level})`.
- `summarizeReplicates(values)` returns `{ count, mean, deviations, sampleVariance, sampleStandardDeviation, standardError, degreesOfFreedom, tCritical95, confidence95 }`.
- `analyzeAssayComparison({laneA,laneB,referenceValue,typeBStandardUncertainty,coverageFactor})` returns immutable lane summaries plus `answer.moreRepeatable`, `answer.closerReference`, `answer.laneAContainsReference`, and `answer.laneBContainsReference`.

- [ ] **Step 1: Extend the verifier with red statistical tests**

  Assert the known sample `[1,2,3,4,5]` has mean `3`, sample variance `2.5`, sample standard deviation `sqrt(2.5)`, standard error `sqrt(0.5)`, `df=4`, and `t95=2.776445105`; assert the confidence interval formula and inclusion logic.

- [ ] **Step 2: Add frozen 95% t critical values**

  Include exact two-sided 0.975 quantiles for degrees of freedom 2–30. Reject replicate counts below 3 or above 31 rather than silently extrapolating.

- [ ] **Step 3: Implement replicate summary**

  Validate finite inputs, preserve order, calculate deviations and `n-1` sample variance, and deep-freeze every output. Keep a zero-spread lane valid with a zero-width interval.

- [ ] **Step 4: Implement assay comparison**

  For each lane calculate bias, absolute bias, reference inclusion, Type A standard uncertainty `uA = SE`, combined standard uncertainty `uc`, expanded uncertainty `U`, and the visible `xbar ± U` coverage interval. Compare lower sample standard deviation and lower absolute bias with a numerical tie tolerance of `1e-10`.

- [ ] **Step 5: Implement four-dimensional prediction scoring**

  Preserve raw predictions, return learner/model labels and reasons, and score observed repeatability, closeness to the accepted reference, and reference inclusion in each 95% t interval independently.

- [ ] **Step 6: Implement four non-mutating hints**

  Hint 1 identifies the relevant statistic without values; hint 2 exposes means and sample standard deviations; hint 3 exposes `s/sqrt(n)` and t critical values; hint 4 states the complete comparison.

- [ ] **Step 7: Verify assay scenarios and invalid inputs**

  Cover all four presets, immutable predictions, reference boundaries, zero spread, minimum/maximum counts, nonfinite values, negative Type B uncertainty, and invalid coverage factors.

---

### Task 3: Immutable blank-noise detection engine

**Files:**
- Modify: `src/chemistry/measurementUncertainty.js`
- Modify: `scripts/verify-measurement-uncertainty.mjs`

**Interfaces:**
- Produces: `analyzeDetectionGate(input)`, `evaluateDetectionPrediction({analysis,prediction})`, and `nextDetectionHint({analysis,level})`.
- `analyzeDetectionGate({blankValues,candidateSignal,calibrationSlope,calibrationIntercept,detectionFactor})` returns blank statistics, threshold signal, concentration-equivalent threshold, candidate relation, and four expected conceptual claims.

- [ ] **Step 1: Add red threshold tests**

  Assert `thresholdSignal = blankMean + detectionFactor * blankSampleSD`, `lodConcentration = (thresholdSignal - intercept)/slope`, candidate classification at/below/above threshold, and doubled-noise behavior.

- [ ] **Step 2: Implement blank-gate analysis**

  Require 5–31 blank replicates, a positive calibration slope, finite intercept/candidate, and a factor from 1–5. Return the candidate margin over threshold and preserve negative blank signals when supplied.

- [ ] **Step 3: Implement conceptual answer contract**

  Return `candidateDecision`, `lodVsQuantitation: 'different'`, `doubledNoiseEffect`, and `moreBlankReplicatesEffect: 'not-automatically-lower'`. Explain that this formula uses blank standard deviation rather than standard error.

- [ ] **Step 4: Implement prediction scoring and hints**

  Preserve all four choices and provide reasons without changing candidate, blank values, slope, intercept, or factor.

- [ ] **Step 5: Run the full new verifier**

  Expected: data, replicate, confidence-interval, uncertainty-budget, detection, prediction, hint, immutability, and rejection-boundary checks all pass.

---

### Task 4: Graphical Measurement Evidence Bench

**Files:**
- Create: `src/components/MeasurementEvidenceLab.jsx`
- Create: `src/styles/measurement-evidence.css`

**Interfaces:**
- Consumes all Task 1 scenario exports, all Task 2/3 engine exports, `MODEL_PASSPORTS.measurementEvidenceBench`, and `SCIENCE_SOURCES`.
- Produces a section with ID `measurementEvidenceLab` and no global state.

- [ ] **Step 1: Build persistent mode tabs**

  Add `Twin assay calipers` and `Blank noise gate`. Preserve each mode’s scenario, edits, predictions, hints, and evaluation while switching modes.

- [ ] **Step 2: Build editable replicate racks**

  Render every lane/blank value as a labelled numeric input with explicit add/remove controls. Require minimum counts in the UI, never auto-delete or replace an outlying value, and reset only on an explicit learner action.

- [ ] **Step 3: Build the signature assay visual**

  Draw a shared horizontal scale with a reference laser, two replicate-pin lanes, sample-mean carriage, 95% t-interval caliper jaws, and a separate expanded-uncertainty ribbon. Animate only the caliper jaws after learner edits and disable that transition under reduced motion.

- [ ] **Step 4: Build the uncertainty budget**

  Show Type A `s/sqrt(n)` and learner-entered Type B standard uncertainty as orthogonal vectors whose root-sum-square forms `uc`; show the learner-selected `k` and `U=kuc` without attaching an automatic confidence percentage.

- [ ] **Step 5: Build assay prediction and feedback panels**

  Require or accept four explicit claims, preserve wrong answers, reveal dimensions independently, and provide four non-mutating hints. Copy must call the results “observed evidence,” not certification of method precision or trueness.

- [ ] **Step 6: Build the blank-noise gate visual**

  Plot blank pins, blank mean, the `xL` threshold gate, and one candidate signal on a shared response scale. Expose slope/intercept/factor controls and show signal-equivalent and concentration-equivalent thresholds only after comparison.

- [ ] **Step 7: Build detection prediction and feedback panels**

  Score candidate distinguishability, detection-vs-quantitation distinction, doubled-noise effect, and the misconception that more blank replicates automatically divides the threshold spread by `sqrt(n)`.

- [ ] **Step 8: Add teacher lens and model/source passport**

  Include guided comparisons, assumption warnings, equations, provenance, included/excluded claims, and direct primary-source links.

- [ ] **Step 9: Apply the visual system and responsive behavior**

  Use cool optical paper `#f3f7f7`, instrument navy `#17324a`, reference cyan `#25a9c2`, uncertainty violet `#6b63d9`, detection amber `#e4b84a`, bias coral `#df6659`, and acceptance mint `#57b995`. Use Avenir Next Condensed for display, Avenir Next/system for body, and SFMono for data. Stack without horizontal scroll at 768/390 px and keep every interactive target at least 44 px.

---

### Task 5: App, curriculum, navigation, numbering, and documentation

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/Header.jsx`
- Modify: `src/data/curriculum.js`
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
- Adds lazy route/anchor `#measurementEvidenceLab` and script `verify:measurement-uncertainty`.

- [ ] **Step 1: Lazy-load after spectroscopy**

  Place the new section after `SpectroscopyLab` and before biomolecular assembly.

- [ ] **Step 2: Add desktop and mobile navigation entries**

  Label the entry `Measurement evidence` with copy `Compare repeats, coverage, and blank detection`.

- [ ] **Step 3: Promote curriculum capability**

  Mark analytical measurement uncertainty live, add the new lab to analytical and biochemistry live-lab lists, and change biochemistry experimental fitting from a generic concept to a bounded live prerequisite without claiming nonlinear parameter fitting.

- [ ] **Step 4: Renumber downstream sections**

  Keep spectroscopy at 13; assign measurement evidence 14, biomolecular 15, enzyme 16, mechanism 17, stereochemistry 18, coordination 19, crystal 20, reaction chamber 21, and equation balancer 22.

- [ ] **Step 5: Add script and documentation**

  Document interactions, equations, assumptions, sources, boundaries, file map, and the twentieth deterministic verifier.

---

### Task 6: Deterministic, production, and browser validation

**Files:**
- Modify only when a validation finding requires an in-scope fix.

- [ ] **Step 1: Run the new verifier and all existing verifiers**

  Expected: 20/20 scripts exit zero.

- [ ] **Step 2: Run `npm run build`**

  Record transformed-module count, lazy chunk sizes, and advisories separately from failures.

- [ ] **Step 3: Use assay mode as a student**

  Preserve an intentionally wrong four-part prediction, compare precision-vs-reference, edit one extreme value without automatic removal, add a replicate, remove one explicitly, inspect both intervals, request hints, switch scenarios, and reset.

- [ ] **Step 4: Use detection mode as a student**

  Exercise a detectable and below-threshold candidate, increase blank noise, change factor, preserve a wrong quantitation claim, and verify that raw blank values stay unchanged.

- [ ] **Step 5: Use both modes as a teacher**

  Verify confidence-interval interpretation, Type A/Type B separation, visible coverage factor, blank-standard-deviation rather than standard-error threshold, synthetic provenance, and no method-validation or operational-procedure claims.

- [ ] **Step 6: Audit responsive/accessibility behavior**

  Check 1440×900, 768×1024, and 390×844, no horizontal overflow, 44 px minimum controls, keyboard-visible focus, reduced-motion CSS, and zero browser console errors.

- [ ] **Step 7: Re-run affected validation after browser-found fixes**

  Report exact verifier/build/browser evidence and keep the broader university-platform goal active.

## Self-review

- Spec coverage: assay repeatability, reference closeness, t intervals, Type A/Type B/RSS/expanded uncertainty, blank detection, prediction preservation, sources, passport, curriculum, responsive UI, and student/teacher audits each map to an explicit task.
- Placeholder scan: no TBD/TODO/“similar to” steps remain. Named future exclusions are model boundaries, not implementation placeholders.
- Type consistency: data export names and seven engine function names are identical across producer/consumer tasks; prediction fields are fixed separately for assay and detection modes.
- Deliberate limitation: this milestone does not add nonlinear biochemical fitting or universal quantitation formulas; it establishes the prerequisite measurement-evidence engine those later modules require.
