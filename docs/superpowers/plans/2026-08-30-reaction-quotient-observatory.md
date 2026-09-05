# Reaction Quotient Observatory Implementation Plan

> **For Codex:** Execute this plan in the current task using the executing-plans workflow. The project instructions forbid Git actions, so this plan intentionally contains no commit steps.

**Goal:** Add a graphical fixed-temperature chemical-equilibrium reactor where a learner establishes an ideal-gas equilibrium, predicts the effect of one explicit perturbation, and traces `Q`, `K`, reaction direction, reaction extent, and the new equilibrium composition without automatic answer repair.

**Architecture:** Keep the chemistry in a pure immutable engine driven by frozen scenario records. The React lab owns only learner state, predictions, reveal state, and graphical rendering. A perturbation produces three auditable snapshots—before, immediate, and re-equilibrated—so the UI never collapses a thermodynamic argument into a slogan. The first release is an ideal-gas, one-reaction, fixed-temperature model; it supports fixed-volume and fixed-total-pressure constraints but does not simulate rate or time.

**Tech Stack:** React 19, Vite 8, plain JavaScript modules, CSS/SVG, Node deterministic verifier.

## Scientific and interaction contract

- Use dimensionless ideal-gas activities `a_i = p_i / p°`, with `p° = 1 bar`.
- Compute `Q = product(a_i ^ nu_i)` and `delta_r G = RT ln(Q/K)`.
- Solve one reaction extent `xi` inside nonnegative-amount bounds by monotone bisection on `ln(Q/K)`.
- Treat `Q < K` as forward, `Q > K` as reverse, and numerical equality as equilibrium.
- Keep temperature and therefore `K` fixed for every perturbation in this release.
- Distinguish fixed-volume activity calculation from fixed-total-pressure activity calculation.
- An inert-gas addition at fixed volume leaves reacting partial pressures and `Q` unchanged.
- An inert-gas addition at fixed total pressure expands the system and can change `Q` when the reaction gas stoichiometry changes.
- A catalyst changes neither `Q`, `K`, nor equilibrium composition; it is represented as a labelled rate-only intervention, not a time simulation.
- Do not auto-correct a prediction. Preserve it, score each dimension separately, and explain the mismatch.
- Do not provide apparatus, handling, synthesis, scale, or operational laboratory instructions.

## Frozen teaching scenarios

1. `sulfuryl-chloride-dissociation`: `SO2Cl2(g) <=> SO2(g) + Cl2(g)`, `Kp = 2.75` at `373.15 K`, with a default pure-reactant state equivalent to `2.15 bar`. This is the one named, source-anchored classroom record from MIT OpenCourseWare.
2. `one-to-one-instrument`: `A(g) <=> B(g)`, local synthetic `K = 4.00` at `298.15 K`; isolates the `delta nu = 0` case.
3. `one-to-two-instrument`: `A(g) <=> 2 B(g)`, local synthetic `K = 1.80` at `320 K`; exposes volume and inert-gas effects for `delta nu = +1`.
4. `one-plus-three-instrument`: `A(g) + 3 B(g) <=> 2 C(g)`, local synthetic `K = 6.00` at `450 K`; exposes stoichiometric powers, limiting extent, and `delta nu = -2`.

Synthetic records must say explicitly that their constants are teaching values and not measured constants for a named chemical system.

## Task 1: Freeze source-backed scenario and boundary data

**Files:**
- Create: `src/data/chemicalEquilibriumScenarios.js`
- Modify: `src/data/scienceSources.js`
- Create: `scripts/verify-chemical-equilibrium.mjs`

**Step 1: Add a failing data-contract verifier**

Assert four frozen scenarios, signed stoichiometric coefficients, unique species IDs, positive `K` and temperature, valid initial amounts/volume, explicit provenance, `deltaNu`, source IDs, model-boundary text, and deep immutability.

**Step 2: Run only the new verifier and confirm the expected missing-module failure**

Run: `node scripts/verify-chemical-equilibrium.mjs`

Expected: failure because the scenario/engine modules do not yet exist.

**Step 3: Add frozen scenario records and boundary text**

Include formula labels, names, colours, signed `nu`, default amount, role, provenance kind, teaching question, probe product, default volume, temperature, and `K`.

**Step 4: Add source records and a model passport**

Add IUPAC chemical equilibrium, equilibrium constant, chemical flux, chemical relaxation, MIT lectures 18/19 and lecture-19 solutions, and the ACS evidence-based equilibrium instruction paper. Add `MODEL_PASSPORTS.reactionQuotientObservatory` with included/excluded claims and the fixed-temperature ideal-gas boundary.

## Task 2: Implement the immutable equilibrium engine

**Files:**
- Create: `src/chemistry/chemicalEquilibrium.js`
- Modify: `scripts/verify-chemical-equilibrium.mjs`

**Step 1: Extend the verifier with numerical reference checks**

Cover:

- `Q` for finite, zero, infinite, and indeterminate edge cases;
- extent bounds from signed stoichiometry;
- sulfuryl-chloride equilibrium partial pressures near `0.73`, `1.42`, `1.42 bar`;
- amount nonnegativity and `Q/K` closure for every scenario;
- forward/reverse/equilibrium direction classification;
- fixed-volume compression/expansion and `delta nu = 0` no-effect behaviour;
- catalyst no-change behaviour;
- inert gas at fixed volume no-change behaviour;
- inert gas at fixed pressure effect/no-effect according to `delta nu`;
- add/remove species perturbations;
- immutable prediction inputs and four non-mutating hints;
- invalid identifiers, amounts, constraints, targets, and excessive removal.

**Step 2: Implement helpers and quotient analysis**

Add finite/positive validators, deep freeze, extent-bound calculation, fixed-volume/fixed-pressure state evaluation, robust logarithmic quotient handling, direction metadata, and `delta_r G`.

**Step 3: Implement equilibrium solving**

Use bisection over the feasible extent. Return solver iterations, residual, bounds, start direction, equilibrium amounts/activities/partial pressures, total pressure, volume, `Q`, `Q/K`, and local equations.

**Step 4: Implement perturbation experiments**

Accept one explicit action: add species, remove species, compress, expand, catalyst, add inert at fixed volume, or add inert at fixed total pressure. Return immutable before/immediate/after snapshots, reaction shift, and a plain-language reason.

**Step 5: Implement prediction scoring and hints**

Score immediate `Q` relation, net reaction direction, whether `K` changes, and whether the declared probe-product amount rises/falls/stays. Keep every learner answer untouched.

**Step 6: Run the new verifier**

Run: `node scripts/verify-chemical-equilibrium.mjs`

Expected: pass with explicit data, numerical, perturbation, immutability, and hint coverage.

## Task 3: Build the graphical reactor UI

**Files:**
- Create: `src/components/ChemicalEquilibriumLab.jsx`
- Create: `src/styles/chemical-equilibrium.css`

**Step 1: Build the learning flow**

Implement scenario selection, learner-editable feed amounts and volume, `Establish equilibrium`, perturbation selector/target/amount controls, four prediction controls, `Run perturbation`, non-mutating hints, reset, and source/passport disclosure.

**Step 2: Build the signature visual**

Create a central glass-reactor illustration with:

- species particles/chips whose counts encode relative amounts;
- a reversible-reaction extent rail;
- a `Q/K` null-detector needle with reverse/equilibrium/forward sectors;
- a fixed-temperature lock and visible constraint badge;
- a symbolic equal-flux indicator at equilibrium labelled as non-kinetic.

Use native HTML controls for every interactive hit target. SVG is presentation only.

**Step 3: Build the perturbation shock strip**

Show three aligned cards: before equilibrium, immediate post-perturbation, and new equilibrium. Each card reports amounts, partial pressures, `Q`, `Q/K`, and constraint. The immediate card must make the causal step visually dominant.

**Step 4: Build feedback and audit panels**

Show per-dimension correct/incorrect reasoning, the learner’s preserved answer, the model answer, a concise explanation, the equations used, model boundary, provenance, and primary source links.

**Step 5: Apply a subject-specific visual system**

Use a midnight reactor field, porcelain instrument faces, bromine amber, cobalt, phenolphthalein magenta, and phosphor-lime status cues. Use the project display face plus monospaced numerical readouts. Keep animation to one needle/flux treatment and disable it under reduced motion.

**Step 6: Make it responsive and accessible**

At narrow widths, stack scenario rail, reactor, and console; preserve 44px controls; avoid horizontal scrolling; maintain visible focus; provide complete text alternatives and live-result announcements.

## Task 4: Integrate the lab into the curriculum and app navigation

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/Header.jsx`
- Modify: `src/data/curriculum.js`
- Modify: `src/styles.css`
- Modify: `README.md`
- Modify: `package.json`

**Step 1: Lazy-load the lab in the physical-chemistry sequence**

Place `#chemicalEquilibriumLab` after the solution-equilibrium bench and before the energy/rate lab.

**Step 2: Add navigation and curriculum entries**

Add the lab to both header menus and the general/physical chemistry live-lab lists. Promote homogeneous reaction quotient/equilibrium direction from a gap to a live bounded capability while retaining nonideal and multiphase reactive equilibrium as future engines.

**Step 3: Add script and documentation**

Add `verify:chemical-equilibrium`, document the new interaction model, source/provenance distinction, equations, exclusions, file map, and total verifier count.

## Task 5: Validate science, build, and real browser interaction

**Files:**
- Modify only if a validation finding requires an in-scope fix.

**Step 1: Run deterministic chemistry validation**

Run the new verifier, then every existing verifier because the user explicitly requested project validation.

**Step 2: Run production build**

Run: `npm run build`

Record module count and any advisory separately from failures.

**Step 3: Use the real UI as a student**

Open `http://127.0.0.1:5174/#chemicalEquilibriumLab`. Exercise at least:

- wrong prediction preserved and explained;
- add product causing reverse response;
- catalyst causing no equilibrium change;
- inert gas at fixed volume causing no change;
- inert gas at fixed pressure causing a `delta nu`-dependent change;
- one `delta nu = 0` volume no-effect case;
- reset and scenario switching.

**Step 4: Use the real UI as a teacher**

Confirm the immediate `Q` argument is visible before the final state, source links and model boundary are readable, symbolic flux is not presented as calculated kinetics, and synthetic constants cannot be mistaken for measured named-system records.

**Step 5: Inspect responsive layouts**

Audit desktop, tablet, and 390px mobile widths for clipping, inaccessible controls, unreadable graphics, and accidental horizontal scrolling.

**Step 6: Re-run affected validation after any browser-found fix**

Report deterministic results, build result, browser scenarios exercised, and any remaining bounded model limitations without calling the broader platform complete.
