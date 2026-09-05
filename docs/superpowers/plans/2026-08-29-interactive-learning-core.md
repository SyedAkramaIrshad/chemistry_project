# Interactive Chemistry Learning Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn ChemLab Studio's existing molecular builder into an explicit, teachable experimentation loop and place it inside an honest university-chemistry curriculum map.

**Architecture:** Keep the audited chemistry runtime as the source of truth and keep the current React/Vite shell. Add React-owned curriculum presentation and DOM-controller-owned experiment state without introducing a backend or pretending that unavailable chemistry engines are implemented. Manual graph edits remain the only way atoms and bonds change.

**Tech Stack:** React 19, Vite 8, SVG/Canvas, browser-local JavaScript chemistry runtime, CSS custom properties.

## Global Constraints

- A failed interaction must preserve the molecular graph and explain the blocking rule.
- Bond breaking and bond formation must each require a visible learner action.
- Open, radical, incomplete, disconnected, unsupported, and invalid states must remain observable.
- No control may silently add hydrogen, remove a leaving group, change bond order, or repair formal charge.
- Curriculum claims must distinguish live tools, explanatory coverage, and engines that are not yet implemented.
- The application must remain runnable locally without an account, paid model, or required remote service.
- Safety content must teach representations and reasoning, not operational synthesis instructions.

## Design System

- **Deep field `#061426`:** molecular canvas and high-focus experimental surfaces.
- **Notebook `#F4F7F2`:** curriculum and explanatory reading surfaces.
- **Spectral cyan `#63E6FF`:** selected tools, live interactions, and structure data.
- **Indicator mint `#5AE2B6`:** allowed actions and completed learning steps.
- **Exception coral `#FF6B7A`:** blocked actions and hard-rule violations.
- **Model violet `#A78BFA`:** models, assumptions, and outside-model boundaries.
- Display typography remains Avenir Next Condensed; prose remains the system sans stack; chemical data remains SF Mono/Menlo.
- The molecular field remains the single visual spectacle. The new experiment trace is the signature learning device: a chronological, source-of-action notebook explaining what changed and why.

## File Structure

- Create `src/data/curriculum.js`: auditable undergraduate subject map and availability labels.
- Create `src/components/CurriculumAtlas.jsx`: interactive discipline navigator driven entirely by the curriculum data.
- Create `src/components/ExperimentGuide.jsx`: static DOM targets for the guided challenge and experiment trace.
- Modify `src/App.jsx`: compose the curriculum atlas before the laboratory.
- Modify `src/components/Header.jsx`: expose Learn, Experiment, React, and Balance navigation.
- Modify `src/components/Hero.jsx`: position the product as a university learning workbench without overstating coverage.
- Modify `src/components/LabWorkspace.jsx`: make manual bond controls and the guided experiment visible.
- Modify `src/chemistry/controller.js`: implement selected-bond state, explicit breaking, experiment events, and mission progress.
- Modify `src/styles.css`: add the notebook atlas, selected-bond affordance, experiment trace, responsive behavior, focus states, and reduced-motion behavior.
- Modify `README.md`: document the learning model, current curriculum coverage, manual interaction contract, and contribution path.

---

### Task 1: Explicit Manual Bond Editing

**Files:**
- Modify: `src/components/LabWorkspace.jsx`
- Modify: `src/chemistry/controller.js`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: `state.selectedBondKey: string | null`
- Produces: `bondKey(aId, bId): string`
- Produces: `selectBond(aId, bId): void`
- Produces: `breakSelectedBond(): void`

- [ ] **Step 1: Replace automatic-first controls**

Set the initial bond tool to `single`, remove the visible Auto and Complete-with-H controls, and add a disabled `#breakBondBtn` that reads `Break selected bond`.

- [ ] **Step 2: Make bonds selectable**

Single-clicking the broad SVG hit target must select a bond, clear atom selection, render a visible cyan selection halo, and tell the learner which bond and order are selected.

- [ ] **Step 3: Break only through an explicit action**

Enable `#breakBondBtn` only while a bond exists. The button and Delete/Backspace remove that bond, preserve both atoms, add one undo snapshot, and update the structure verdict.

- [ ] **Step 4: Expose the same action in the inspector**

When a bond rather than an atom is selected, render both elements, the bond order, the consequence of breaking it, and a `Break this bond` button.

### Task 2: Experiment Trace and Guided Bond-Rewrite Challenge

**Files:**
- Create: `src/components/ExperimentGuide.jsx`
- Modify: `src/components/LabWorkspace.jsx`
- Modify: `src/chemistry/controller.js`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: `recordActivity(kind, title, detail): void`
- Produces: `renderActivity(): void`
- Produces: `startBondRewriteMission(): void`
- Produces: `renderMission(validation): void`
- Consumes DOM targets: `#missionStartBtn`, `#missionResetBtn`, `#missionStepLoad`, `#missionStepBreak`, `#missionStepConnect`, `#missionObservation`, `#experimentLog`.

- [ ] **Step 1: Add the guided challenge**

The challenge loads water plus a separate nitrogen atom and asks the learner to break one O-H bond, then form an N-O single bond. It explicitly says the remaining open valences will not be repaired.

- [ ] **Step 2: Derive progress from the graph**

Mark load complete after the challenge graph is present, bond breaking complete when fewer than two O-H bonds remain, and connection complete when an N-O bond exists. Never advance from button clicks alone.

- [ ] **Step 3: Record chemistry actions**

Record successful bonds, rejected attempts, broken bonds, charge changes, graph loads, and undo operations. Each entry includes an action label and the engine's explanatory result.

- [ ] **Step 4: Turn the final state into a lesson**

After N-O formation, display the current verdict and explain that creating one allowed bond does not guarantee a closed-shell stable product; remaining open valences are the learner's next observation.

### Task 3: University Curriculum Atlas

**Files:**
- Create: `src/data/curriculum.js`
- Create: `src/components/CurriculumAtlas.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/Header.jsx`
- Modify: `src/components/Hero.jsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: `CURRICULUM_AREAS: CurriculumArea[]`
- `CurriculumArea` fields: `id`, `shortName`, `name`, `accent`, `summary`, `outcomes`, `topics`, `liveLabs`, `modelBoundary`.
- Topic status values: `live`, `explained`, `next-engine`.

- [ ] **Step 1: Encode the scope honestly**

Include General, Organic, Inorganic, Physical, Analytical, Biochemistry, and Materials chemistry. Label every topic as interactive now, explained in the current app, or requiring another scientific engine.

- [ ] **Step 2: Build an interactive atlas**

Clicking a discipline changes its learning outcomes, topic availability, live-lab links, and model boundary without navigation or reload.

- [ ] **Step 3: Connect live coverage to tools**

Current structure work links to `#laboratory`, deterministic reactions to `#reactionLab`, and conservation/equation work to `#balanceLab`. Unimplemented engines remain visibly unavailable instead of linking to fake labs.

- [ ] **Step 4: Correct the product promise**

Update hero and navigation copy from an introductory molecule toy to a growing university chemistry workbench while retaining explicit language about current model boundaries.

### Task 4: Student and Teacher Verification

**Files:**
- Modify: `README.md`

**Interfaces:**
- Student journey: start challenge -> select O-H -> break -> select Single -> connect N-O -> read verdict.
- Teacher journey: inspect event trace -> identify model/exception language -> open curriculum atlas -> verify implemented versus unavailable labels.

- [ ] **Step 1: Build the production bundle**

Run `npm run build`. Expected result: Vite exits with status 0 and emits the production bundle without unresolved imports.

- [ ] **Step 2: Run the student journey in the browser**

Use the visible controls only. Verify both atoms survive bond breaking, the mission progresses from graph state, N-O formation does not auto-repair other valences, and the resulting explanation is readable.

- [ ] **Step 3: Run a rejected-attempt journey**

Attempt a bond the strict model blocks and verify the graph is unchanged while the experiment trace records the specific reason.

- [ ] **Step 4: Run the teacher journey**

Verify that the curriculum atlas distinguishes live and future content and that no panel implies universal reaction prediction or real-laboratory replacement.

- [ ] **Step 5: Check responsive presentation**

Inspect the primary lab, challenge, and curriculum atlas at desktop and narrow/mobile widths; verify controls remain visible, selectable, and readable.

- [ ] **Step 6: Document the open-source contract**

Update the README with setup, architecture, model states, manual-editing behavior, curriculum coverage, contribution seams, and explicit scientific/safety limits.

