# Manual Electron-Flow Mechanism Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a graphical organic-chemistry studio where learners manually choose every two-electron curly-arrow tail and head, queue the arrows required for one elementary step, and receive a specific explanation without automatic mechanism repair.

**Architecture:** Store four bounded teaching scenarios as immutable data and keep arrow eligibility/commit logic in a pure local engine. A React component renders each reactant map, exposes explicit electron sources and possible sinks, draws only learner-queued arrows, and reveals the product only after the complete order-independent expected set is committed. Incorrect and incomplete attempts preserve the scenario and queue while returning a named electron-accounting reason.

**Tech Stack:** React 19, Vite 8, local JavaScript rule functions, accessible SVG, CSS custom properties.

## Global Constraints

- The tail of every arrow starts at an explicit electron pair: a lone pair, sigma bond, or pi bond.
- The arrow head identifies where that same electron pair goes: an atom or a bond-forming region.
- Every arrow in this module represents two electrons. Radical fish-hook arrows are outside this engine.
- The learner must select each arrow. The application may never add a companion arrow automatically.
- A blocked source/sink pair leaves the queue, reactant map, and product state unchanged and returns a specific reason.
- Elementary steps that require simultaneous electron movement reveal the product only after the complete arrow set is queued and committed.
- Arrow order is irrelevant; source reuse is not allowed within one simultaneous step.
- The four supported templates are proton transfer, one-step SN2 substitution, nucleophilic carbonyl addition, and a geometry-prearranged E2 elimination.
- The E2 drawing explicitly states that the required antiperiplanar geometry is supplied by the template rather than inferred from a 2D graph.
- The scenarios teach formal electron accounting, not reaction conditions, rates, selectivity, yield, experimental feasibility, or universal product prediction.
- A successful template is called a correct arrow set for the shown elementary step, not proof of a complete experimental mechanism.
- No operational synthesis quantities, laboratory instructions, or hazardous procedure details are added.
- The application remains local, account-free, and free of paid or model-backed services.

## Visual System Extension

- **Arrow amber `#FFD166`:** learner-queued two-electron arrows and progress.
- **Origin cyan `#63E6FF`:** selectable electron-pair tails.
- **Sink mint `#5AE2B6`:** possible arrow heads and successful commits.
- **Blocked coral `#FF6B7A`:** rejected source/sink pairs and incomplete commits.
- **Product violet `#A78BFA`:** revealed product graph and model boundary.
- **Mechanism navy `#071426`:** the electron-flow canvas.
- Existing display, prose, and monospaced data typography remain aligned with the studio.
- Signature interaction: a hand-built constellation of glowing electron origins, target halos, and learner-drawn curved arrows, paired with a chronological electron ledger.

## File Structure

- Create `src/data/mechanismScenarios.js`: immutable coordinates, electron sources, sinks, expected arrows, distractor reasons, products, and change ledgers for four templates.
- Create `src/chemistry/electronFlow.js`: scenario lookup, source/sink validation, duplicate prevention, order-independent queue evaluation, incomplete-commit feedback, successful commit result, and progressive hints.
- Create `scripts/verify-electron-flow.mjs`: scenario integrity, allowed/rejected arrows, queue immutability, source uniqueness, order independence, electron-pair counts, incomplete commit, and success checks.
- Create `src/components/MechanismLab.jsx`: scenario rail, accessible SVG reactant field, source/sink interactions, curved arrows, queue controls, commit/product reveal, hint ladder, and attempt ledger.
- Modify `src/data/scienceSources.js`: add IUPAC electron-pushing, curly-arrow, heterolysis, nucleophilic-substitution, proton-transfer, and reaction-mechanism sources plus a model passport.
- Modify `src/data/curriculum.js`: mark bounded electron-pair-arrow foundations live in Organic chemistry while keeping stereochemistry, pathway evidence, selectivity, and arbitrary mechanisms outside scope.
- Modify `src/components/Header.jsx`: rename the desktop More menu to Transform and add Mechanism studio before Reaction chamber and Equation balancer; add Mechanism studio to the mobile More menu.
- Modify `src/App.jsx`: mount the lab after Enzymes and before Reaction.
- Modify `src/components/ReactionLab.jsx` and `src/components/EquationSections.jsx`: advance section codes to 07 and 08.
- Modify `src/styles.css`: add the mechanism studio, arrow states, product reveal, attempt ledger, responsive menus, and reduced-motion behavior.
- Modify `package.json`, `README.md`, and `CONTRIBUTING.md`: expose verification, architecture, interaction contract, student/teacher journeys, and scientific limits.

---

### Task 1: Immutable Scenario Data and Pure Arrow Engine

**Files:**
- Create: `src/data/mechanismScenarios.js`
- Create: `src/chemistry/electronFlow.js`
- Create: `scripts/verify-electron-flow.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `MECHANISM_SCENARIOS`
- Produces: `getMechanismScenario(scenarioId): MechanismScenario`
- Produces: `evaluateElectronArrow(scenarioId, sourceId, targetId, queuedArrows): ArrowEvaluation`
- Produces: `commitElectronFlow(scenarioId, queuedArrows): CommitEvaluation`
- Produces: `nextElectronFlowHint(scenarioId, queuedArrows, level): Hint`
- Produces: `ELECTRON_FLOW_CONSTANTS`

- [ ] **Step 1: Encode four complete scenarios**

Each scenario declares reactant atoms/groups, bonds, source/sink coordinates, expected source-target pairs, a specific reason map for common distractors, the simultaneous-step explanation, product representation, formal bond/charge changes, and model-boundary copy. Use ammonia plus H-Cl for proton transfer, hydroxide plus methyl bromide for SN2, cyanide plus formaldehyde for carbonyl addition, and ethoxide plus an antiperiplanar bromoethane drawing for E2.

- [ ] **Step 2: Validate one explicit arrow selection**

Reject unknown sources or sinks, reused sources, same-origin self-targeting, and nonexpected pairs with a scenario-specific or typed generic reason. Accept only a learner-selected expected pair and return its two-electron role without adding any other arrow.

- [ ] **Step 3: Validate simultaneous commit**

Compare source-target pairs as an order-independent set. An incomplete commit returns every missing role and the scenario's octet/leaving-group/simultaneity reason while preserving the queue. A complete set returns the declared product, ledger, total arrows, and exactly two electrons per arrow.

- [ ] **Step 4: Verify invariants**

Run `npm run verify:electron-flow`. Expected checks: all scenario references resolve; every expected arrow is individually accepted; common distractors are rejected with nonempty reasons; rejected attempts do not mutate the queue; one source cannot be queued twice; incomplete commits do not reveal products; complete sets succeed in forward and reverse queue order; each success moves `2 × arrow count` electrons; SN2 needs two arrows, carbonyl addition two, proton transfer two, and E2 three; all ledgers include the matching bond and charge consequences.

### Task 2: Manual Curved-Arrow Studio

**Files:**
- Create: `src/components/MechanismLab.jsx`
- Modify: `src/App.jsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `MECHANISM_SCENARIOS`, `evaluateElectronArrow`, `commitElectronFlow`, `nextElectronFlowHint`
- Produces DOM anchor: `#mechanismLab`

- [ ] **Step 1: Build scenario selection and mission contract**

Render four scenario cards with family, arrow count, learner outcome, and boundary. Changing scenario explicitly clears that scenario's local queue/result and records a new ledger entry.

- [ ] **Step 2: Build accessible source and sink interactions**

Render the reactant graph in SVG. Electron sources and sinks are focusable role-button groups with visible labels. Selecting a source changes the instruction to choose a destination; selecting a sink calls the pure engine and either adds exactly one arrow or records the blocking reason.

- [ ] **Step 3: Draw and manage the queue**

Draw cubic two-electron arrows only for queued pairs. List every queued arrow with origin, destination, role, electron count, and a visible remove action. Add Clear arrows and Commit elementary step controls. Incomplete commits preserve the queue.

- [ ] **Step 4: Reveal product and learning trace**

Keep the product panel locked until success, then reveal product notation, bond/charge ledger, electron conservation, and a statement that the template does not prove conditions or experimental preference. Record accepted, blocked, removed, hinted, incomplete, reset, and successful events.

- [ ] **Step 5: Add progressive learner-controlled hints**

Hint level 1 states the missing electron-source type; level 2 names the missing source; level 3 names the corresponding sink and reason. Hints never change the queue or reveal the product.

### Task 3: Provenance, Curriculum, and Navigation

**Files:**
- Modify: `src/data/scienceSources.js`
- Modify: `src/data/curriculum.js`
- Modify: `src/components/Header.jsx`
- Modify: `src/components/ReactionLab.jsx`
- Modify: `src/components/EquationSections.jsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add authoritative source metadata**

Add direct IUPAC terms for electron pushing, curly arrows, heterolysis, nucleophile, nucleophilic substitution, proton transfer, and reaction mechanism. The passport includes two-electron arrows, four templates, simultaneous commits, formal bond/charge ledgers, and guided distractor explanations; it excludes radical arrows, arbitrary molecules, conditions, energetics, kinetics, stereochemical inference, selectivity, multistep pathway discovery, and experimental mechanism proof.

- [ ] **Step 2: Update Organic chemistry claims**

Mark electron-pair arrow origin/destination and four elementary templates live. Keep 3D stereochemistry, conformation search, regiochemistry, competing pathways, rearrangements, radical chemistry, measured evidence, and synthesis planning as unavailable or concept boundaries.

- [ ] **Step 3: Keep navigation understandable**

Desktop shows Learn, Build, Solutions, Energy, Measure, Enzymes, and Transform. Transform opens Mechanism studio, Reaction chamber, and Equation balancer. Mobile More contains Enzyme kinetics, Mechanism studio, Reaction chamber, and Equation balancer.

### Task 4: Documentation and Browser Audit

**Files:**
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`

- [ ] **Step 1: Document the bounded engine**

Add the new command, files, four templates, manual-arrow interaction contract, scientific sources, and explicit statement that a successful arrow set is not experimental proof or universal product prediction.

- [ ] **Step 2: Run the learner journey**

For SN2, select the oxygen lone pair and methyl carbon, commit early, and verify the queue remains with an explanation that carbon would exceed its octet unless the C-Br pair leaves. Add the C-Br-to-Br arrow in either order and commit; verify the product and ledger. Attempt lone-pair-to-Br and verify no queue or product change. Repeat the success path for proton transfer, carbonyl addition, and all three E2 arrows.

- [ ] **Step 3: Run the teacher journey**

Verify arrow tails are always electrons, every arrow is labelled two-electron, product reveal requires a complete simultaneous set, E2 geometry is declared supplied, the passport distinguishes formal notation from evidence, IUPAC sources are linked, and Organic chemistry distinguishes live templates from unavailable mechanism prediction.

- [ ] **Step 4: Audit responsive presentation**

Inspect 1280px, 742px, and 390px widths. Verify the SVG graph, source/sink buttons, arrow queue, commit controls, product reveal, hint ladder, attempt ledger, passport, Transform menu, and mobile More menu remain readable, keyboard reachable, and free of horizontal overflow. Respect reduced motion.

- [ ] **Step 5: Run final validation**

Run `npm run verify:electron-flow`, every existing numerical verifier, and `npm run build`, then load a clean browser tab and confirm zero runtime errors.
