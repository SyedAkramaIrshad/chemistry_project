# UV-Vis Calibration Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a visual analytical-chemistry lab that links an optical path, an illustrative absorption band, Beer-Lambert calibration, residuals, and an unknown concentration without presenting simulated values as measured compound data.

**Architecture:** Keep the scientific calculation in a pure local module and render its complete output through one React component. The engine generates an explicitly illustrative Gaussian molar-absorptivity band, applies Beer-Lambert absorbance and an optional NIST-style unabsorbed-stray-light response, fits ordinary least squares to six standards, and estimates one simulated unknown. The interface never fetches or implies a reference spectrum.

**Tech Stack:** React 19, Vite 8, local JavaScript numerical functions, SVG, CSS custom properties.

## Global Constraints

- Every output is labelled computed or illustrative; no point is presented as a laboratory measurement.
- The learner controls wavelength, band position and width, maximum molar absorptivity, path length, calibration range, unknown concentration, and stray-light fraction.
- Beer-Lambert calculations use `A = epsilon b c`, with concentration converted from micromoles per litre to moles per litre.
- The illustrative band uses `epsilon(lambda) = epsilon_max exp[-4 ln(2)((lambda-lambda_max)/FWHM)^2]` and is not assigned to a chemical identity.
- The stray-light mode uses `A_observed = -log10[T + S(1-T)]`, where `T = 10^(-A_true)` and `S` is the unabsorbed stray-light fraction.
- Linear regression reports slope, intercept, R-squared, residuals, and inverse prediction for a simulated unknown; it does not claim a full uncertainty interval or detection limit.
- Systematic curvature must remain visible. The UI must not discard standards or silently force the intercept through zero.
- Existing manual-graph, solution-equilibrium, and energy-rate model boundaries remain unchanged.
- The application remains local, account-free, and free of paid or model-backed services.

## Visual System Extension

- **Optical black `#071426`:** instrument path, charts, and detector field.
- **Wavelength color:** computed from 380-720 nm and used only for the selected beam and cursor.
- **Calibration amber `#FFD166`:** standards, fit line, and quantitative readout.
- **Residual coral `#FF6B7A`:** systematic deviation and extrapolation warnings.
- **Measured-model cyan `#63E6FF`:** selected wavelength and unknown marker.
- **Passport violet `#A78BFA`:** provenance and limitations.
- Display and data typography remain aligned with the existing studio.
- Signature interaction: one beam travels through a cuvette into a detector while the same wavelength cursor crosses the spectrum and determines the calibration slope.

## File Structure

- Create `src/chemistry/spectrophotometry.js`: pure absorbance, stray-light, regression, spectral-band, and unknown-estimation functions.
- Create `scripts/verify-spectrophotometry.mjs`: deterministic reference and invariant checks.
- Create `src/components/SpectroscopyLab.jsx`: controls, optical train, spectrum, standard rack, calibration plot, residual diagnosis, unknown result, and model passport.
- Modify `src/data/scienceSources.js`: add IUPAC Beer-Lambert/sensitivity and NIST stray-light sources plus a model passport.
- Modify `src/data/curriculum.js`: mark bounded UV-Vis calibration live in General and Analytical chemistry while retaining uncertainty, reference spectra, and separations as separate work.
- Modify `src/components/Header.jsx`: add desktop Measure navigation and a six-item mobile dock with React and Balance in an upward-opening More menu.
- Modify `src/App.jsx`: mount the lab between Energy and Reaction.
- Modify `src/styles.css`: add the analytical bench and responsive mobile menu.
- Modify `package.json`, `README.md`, and `CONTRIBUTING.md`: expose verification, architecture, learning journeys, and limits.

---

### Task 1: Pure Spectrophotometry Engine

**Files:**
- Create: `src/chemistry/spectrophotometry.js`
- Create: `scripts/verify-spectrophotometry.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `molarAbsorptivityAt(wavelengthNm, band): number`
- Produces: `applyUnabsorbedStrayLight(trueAbsorbance, strayLightPercent): { trueTransmittance, observedTransmittance, observedAbsorbance }`
- Produces: `linearRegression(points): RegressionResult`
- Produces: `analyzeSpectrophotometry(params): SpectrophotometryAnalysis`
- Produces: `SPECTROPHOTOMETRY_CONSTANTS`

- [ ] **Step 1: Encode input validation and the illustrative Gaussian band**

Require finite values, positive FWHM/epsilon/path/calibration range, 380-720 nm selected wavelength, 400-680 nm band center, 0-3% stray light, and a nonnegative unknown concentration. Preserve all entered values in structured invalid results when a model constraint fails.

- [ ] **Step 2: Encode optical response and regression**

Generate six evenly spaced standards, calculate true and observed absorbance, fit unconstrained OLS, retain every residual, and calculate the simulated unknown as `(A_unknown - intercept) / slope`.

- [ ] **Step 3: Generate linked visual data**

Return a 161-point spectrum from 380-720 nm, a dense response curve for the selected calibration range, standard points, fit endpoints, unknown truth/estimate/recovery, sensitivity ratio, transmittance, maximum Beer-Lambert deviation, and explanatory status strings.

- [ ] **Step 4: Verify scientific invariants**

Run `npm run verify:spectrophotometry`. Expected checks: peak epsilon equals entered epsilon, FWHM points equal half peak, ideal slope equals `epsilon b 1e-6`, doubling path length doubles slope, moving one FWHM from the peak reduces sensitivity sixteen-fold, ideal unknown recovery is exact, 1% stray light depresses high absorbance and creates negative Beer-Lambert deviation, all residuals sum approximately to zero, all transmittances remain bounded, and invalid inputs throw explicit errors.

### Task 2: Linked Optical and Calibration Interface

**Files:**
- Create: `src/components/SpectroscopyLab.jsx`
- Modify: `src/App.jsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `analyzeSpectrophotometry(params)`
- Produces DOM anchor: `#spectroscopyLab`

- [ ] **Step 1: Build learner controls and presets**

Add Ideal peak, Off-peak sensitivity, Stray-light compression, and Extrapolated unknown presets. Keep all numeric parameters visible and add quick wavelength controls for peak, peak plus half-width, and peak plus one full width.

- [ ] **Step 2: Build the optical train and spectrum**

Render lamp, monochromator, wavelength-colored beam, cuvette, detector, percent transmittance, an SVG spectral band, and a draggable-range wavelength cursor. State that the band is illustrative and unnamed.

- [ ] **Step 3: Build standards and calibration plot**

Render six concentration-labelled cuvettes and an SVG plot containing observed points, the unconstrained OLS line, the underlying model-response curve, residual stems, and the simulated unknown marker.

- [ ] **Step 4: Explain the analytical conclusion**

Show sensitivity as the calibration slope, R-squared alongside the maximum residual, the unknown estimate and recovery, a low-sensitivity warning away from the peak, a curvature warning under stray light, and an extrapolation warning outside the standards.

### Task 3: Provenance, Curriculum, and Navigation

**Files:**
- Modify: `src/data/scienceSources.js`
- Modify: `src/data/curriculum.js`
- Modify: `src/components/Header.jsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add authoritative source metadata**

Add direct IUPAC Beer-Lambert and sensitivity links and the NIST spectrophotometry reference. The passport lists the Gaussian band, local simulated standards, OLS fit, and stray-light model as included; it excludes real spectra, instrument noise, matrix effects, chemical equilibria, reference materials, uncertainty intervals, detection limits, and separations.

- [ ] **Step 2: Update curriculum claims**

Mark bounded UV-Vis calibration live in General and Analytical chemistry. Keep full measurement uncertainty as a concept boundary and keep reference spectra, chromatographic separations, and compound identification as next-engine work.

- [ ] **Step 3: Preserve mobile navigation clarity**

Desktop navigation exposes Measure directly. Mobile keeps six equal primary targets—Learn, Build, Solutions, Energy, Measure, More—and the More control opens React and Balance above the dock without hiding the current page.

### Task 4: Open-Source Documentation and Browser Audit

**Files:**
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`

- [ ] **Step 1: Document the bounded engine**

Add the new command, files, current capabilities, equations, student journey, and explicit statement that no displayed spectrum or calibration point is measured compound data.

- [ ] **Step 2: Run the learner journey**

At the peak, record the slope and unknown estimate. Move one FWHM away and verify sensitivity falls by sixteen-fold. Enable the 1% stray-light preset and verify high-concentration points fall below Beer-Lambert response while all points remain present. Move the unknown beyond the standards and verify an extrapolation warning appears without clamping it.

- [ ] **Step 3: Run the teacher journey**

Verify the model passport names equations, data provenance, assumptions, and exclusions; inspect General and Analytical curriculum links; and confirm no copy calls the illustrative band a molecular spectrum or the inverse prediction a measured concentration.

- [ ] **Step 4: Audit responsive presentation**

Inspect 1280px, 742px, and 390px widths. Verify the optical train, both SVG plots, standard labels, parameter controls, passport, fixed dock, and More menu have no horizontal overflow and remain keyboard reachable. Respect reduced motion.

- [ ] **Step 5: Run final validation**

Run `npm run verify:spectrophotometry`, `npm run verify:thermokinetics`, `npm run verify:equilibrium`, and `npm run build`, then load a clean browser tab and confirm zero runtime errors.
