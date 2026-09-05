# Enzyme Kinetics Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Biochemistry a dedicated visual lab that links Michaelis-Menten saturation, catalytic parameters, operational inhibitor patterns, and substrate-depletion progress without claiming a specific enzyme mechanism or dataset.

**Architecture:** Add a pure local numerical engine that computes the single-variable-substrate Michaelis-Menten equation and the standard linear mixed-inhibition form `v = V[S] / (alpha_c K_M + alpha_u [S])`. Derive limiting rate from learner-entered `k_cat` and active-enzyme concentration, expose apparent parameters and normalized denominator weights, and integrate the corresponding depletion equation numerically. Render those outputs in one React workbench with no remote data or compound identity.

**Tech Stack:** React 19, Vite 8, local JavaScript numerical functions, SVG, CSS custom properties.

## Global Constraints

- Use `V` and the phrase “limiting rate”; explain that no finite substrate concentration reaches the asymptote exactly.
- `K_M` is the substrate concentration at `v = V/2` only when the displayed Michaelis-Menten model applies; never relabel it as a dissociation constant.
- `V = k_cat [E]_T`, with `k_cat` in `s^-1`, active enzyme in nM, and rates reported in micromoles per litre per second.
- Linear inhibition uses `alpha_c = 1 + [I]/K_ic` and `alpha_u = 1 + [I]/K_iu` only for the selected components.
- Competitive mode changes `alpha_c`; uncompetitive mode changes `alpha_u`; mixed mode changes both.
- Call the equal-constant mixed special case “pure non-competitive.” Do not use “non-competitive” as a synonym for arbitrary mixed inhibition.
- Preserve every learner input. No mode may silently make `K_ic` equal to `K_iu` or alter substrate, inhibitor, enzyme, `k_cat`, or `K_M`.
- State weights are labelled normalized denominator terms, not measured molecular occupancies or binding fractions.
- Progress curves assume the same quasi-steady irreversible one-substrate model, constant active enzyme, no product inhibition, no reverse reaction, and no enzyme inactivation.
- Do not claim enzyme identity, mechanism, pH optimum, temperature response, allostery, cooperativity, pre-steady-state kinetics, or measured parameters.
- The application remains local, account-free, and free of paid or model-backed services.

## Visual System Extension

- **Catalytic mint `#5AE2B6`:** active enzyme and productive complex.
- **Substrate amber `#FFD166`:** incoming substrate and the current concentration cursor.
- **Product cyan `#63E6FF`:** product formation and progress trace.
- **Inhibitor coral `#FF6B7A`:** competitive and uncompetitive denominator terms.
- **Parameter violet `#A78BFA`:** model limits, apparent values, and passport content.
- **Microfluidic navy `#071426`:** enzyme-cycle and rate-curve field.
- Display and data typography remain aligned with the existing studio.
- Signature interaction: a live enzyme traffic loop and a 40-node denominator-weight field change in synchrony with the rate curve and depletion race.

## File Structure

- Create `src/chemistry/enzymeKinetics.js`: input validation, Michaelis-Menten/mixed-inhibition state, curve generation, denominator weights, and integrated progress traces.
- Create `scripts/verify-enzyme-kinetics.mjs`: deterministic identities, asymptotes, inhibitor fingerprints, conservation, progress monotonicity, and invalid-input checks.
- Create `src/components/EnzymeKineticsLab.jsx`: controls, enzyme cycle, saturation plot, state-weight field, inhibition fingerprint, progress race, and model passport.
- Modify `src/data/scienceSources.js`: add IUPAC Michaelis-Menten and IUBMB kinetics sources plus a model passport.
- Modify `src/data/curriculum.js`: mark bounded enzyme kinetics live in Biochemistry and retain macromolecular structure, allostery, pH profiles, and measured enzymes as separate work.
- Modify `src/components/Header.jsx`: expose Enzymes directly on desktop and add it to the existing mobile More menu; place Reaction and Balance in a labelled desktop More menu.
- Modify `src/App.jsx`: mount the lab after Measure and before Reaction.
- Modify `src/components/ReactionLab.jsx` and `src/components/EquationSections.jsx`: advance section codes to 06 and 07.
- Modify `src/styles.css`: add the enzyme bench, responsive navigation menu, and reduced-motion behavior.
- Modify `package.json`, `README.md`, and `CONTRIBUTING.md`: expose verification, architecture, learning journeys, and limits.

---

### Task 1: Pure Enzyme-Kinetics Engine

**Files:**
- Create: `src/chemistry/enzymeKinetics.js`
- Create: `scripts/verify-enzyme-kinetics.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `analyzeEnzymeKinetics(params): EnzymeKineticsAnalysis`
- Produces: `rateAtSubstrate(substrateMicroM, state): number`
- Produces: `progressTrace(initialSubstrateMicroM, limitingRateMicroMPerS, apparentKmMicroM, sampleCount): ProgressPoint[]`
- Produces: `ENZYME_KINETICS_CONSTANTS`

- [ ] **Step 1: Normalize and validate learner inputs**

Require finite positive `kcatPerS`, `enzymeNanoM`, `kmMicroM`, `kicMicroM`, and `kiuMicroM`; nonnegative substrate and inhibitor; and one of `none`, `competitive`, `uncompetitive`, or `mixed`. Keep supported educational ranges explicit and fail with a named parameter.

- [ ] **Step 2: Compute current and apparent kinetic states**

Calculate `V = kcat [E]_T`, `alpha_c`, `alpha_u`, `V_app = V/alpha_u`, `K_M_app = alpha_c K_M/alpha_u`, current rate, uninhibited rate, degree of inhibition, catalytic efficiency `kcat/K_M`, effective low-substrate efficiency `kcat/(alpha_c K_M)`, and the operational inhibition label.

- [ ] **Step 3: Generate visual traces and normalized terms**

Return 161-point uninhibited and selected rate curves over a substrate range that includes `8 K_M` and the current input; a current-point marker; four normalized denominator weights that sum to one; and 121-point uninhibited and selected progress traces using bisection against `t = ([S]_0-[S] + K_M_app ln([S]_0/[S])) / V_app`.

- [ ] **Step 4: Verify invariants**

Run `npm run verify:enzyme-kinetics`. Expected checks: at `[S]=K_M` without inhibitor `v=V/2`; doubling active enzyme doubles `V` and `v`; high substrate approaches but stays below `V`; competitive inhibition preserves `V_app` and raises `K_M_app`; uncompetitive inhibition lowers both by the same factor; equal-constant mixed inhibition preserves `K_M_app` while lowering `V_app`; asymmetric mixed inhibition changes both; normalized weights sum to one; progress substrate falls monotonically while product rises and mass is conserved; invalid parameters and modes are rejected.

### Task 2: Enzyme Traffic Loop and Rate Curves

**Files:**
- Create: `src/components/EnzymeKineticsLab.jsx`
- Modify: `src/App.jsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `analyzeEnzymeKinetics(params)`
- Produces DOM anchor: `#enzymeLab`

- [ ] **Step 1: Build visible controls and teaching presets**

Add Half saturation, Competitive challenge, Uncompetitive trap, Pure non-competitive special case, and Asymmetric mixed presets. Keep `k_cat`, enzyme concentration, `K_M`, substrate, inhibitor, `K_ic`, and `K_iu` visible. Mode selection changes which inhibition factors are used but never changes a value.

- [ ] **Step 2: Build the enzyme-cycle stage**

Render `E + S ⇌ ES → E + P`, animated substrate/product lanes, inhibitor contact points, the current rate, and a 40-node normalized denominator-weight field for free term, competitive term, productive term, and uncompetitive term. Label the field as equation weights rather than molecular occupancy.

- [ ] **Step 3: Build the saturation and progress plots**

Render uninhibited and selected SVG rate curves with `K_M`, `V/2`, limiting-rate asymptotes, apparent-parameter guides, and the current substrate marker. Render synchronized substrate-depletion and product-formation traces for inhibited and uninhibited states.

- [ ] **Step 4: Explain the parameter fingerprint**

Show what changed in apparent limiting rate and apparent `K_M`, why the selected mode has competitive and/or uncompetitive components, degree of inhibition at the current substrate, catalytic efficiency, and the warning that `K_M` is not generally `K_d`.

### Task 3: Provenance, Curriculum, and Navigation

**Files:**
- Modify: `src/data/scienceSources.js`
- Modify: `src/data/curriculum.js`
- Modify: `src/components/Header.jsx`
- Modify: `src/components/ReactionLab.jsx`
- Modify: `src/components/EquationSections.jsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add authoritative source metadata**

Add the IUPAC Gold Book Michaelis-Menten entry and the IUBMB/IUPAC enzyme-kinetics recommendations. The passport lists the one-substrate steady-state equation, limiting parameters, mixed-inhibition factors, denominator weights, and depletion trace as included; it excludes measured enzyme data, mechanisms, `K_d` inference, reversibility, product inhibition, pH/temperature profiles, cooperativity, allostery, pre-steady-state behavior, inactivation, and uncertainty.

- [ ] **Step 2: Update Biochemistry claims**

Mark bounded enzyme kinetics and reversible linear inhibitor patterns live. Keep biomolecular structures, sequence-function prediction, allostery/cooperativity, real parameter datasets, and cellular context as unavailable or concept boundaries.

- [ ] **Step 3: Keep navigation understandable**

Desktop shows Learn, Build, Solutions, Energy, Measure, Enzymes, and More. The desktop More menu contains Reaction chamber and Equation balancer. Mobile keeps its six primary targets and adds Enzyme kinetics above Reaction and Balance inside More.

### Task 4: Documentation and Browser Audit

**Files:**
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`

- [ ] **Step 1: Document the bounded engine**

Add the new command, files, equations, student journey, terminology choices, and explicit statement that all parameters and curves are synthetic learner inputs rather than measured enzyme records.

- [ ] **Step 2: Run the learner journey**

At `[S]=K_M` with no inhibitor, confirm `v=V/2`. Increase substrate and confirm the curve approaches but does not reach `V`. Apply competitive inhibition and confirm `V_app` stays fixed while `K_M_app` rises. Apply uncompetitive inhibition and confirm both fall. Use equal-constant mixed inhibition and confirm the UI calls it the pure non-competitive special case. Use asymmetric mixed inhibition and confirm both apparent parameters change without any input rewrite.

- [ ] **Step 3: Run the teacher journey**

Verify that `K_M` is not described as binding affinity, state weights are not called measured occupancy, the passport distinguishes initial-rate and progress assumptions, IUPAC/IUBMB sources are linked, and Biochemistry distinguishes live kinetics from unavailable biological prediction.

- [ ] **Step 4: Audit responsive presentation**

Inspect 1280px, 742px, and 390px widths. Verify the cycle, both SVG plots, parameter cards, controls, passport, desktop More menu, and mobile More menu remain readable, keyboard reachable, and free of horizontal overflow. Respect reduced motion.

- [ ] **Step 5: Run final validation**

Run `npm run verify:enzyme-kinetics`, `npm run verify:spectrophotometry`, `npm run verify:thermokinetics`, `npm run verify:equilibrium`, and `npm run build`, then load a clean browser tab and confirm zero runtime errors.
