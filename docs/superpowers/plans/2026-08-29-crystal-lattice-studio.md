# Crystal Lattice Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a graphical, learner-controlled materials-chemistry studio for cubic unit cells, packing, density, diffraction, and explicit point-defect edits.

**Architecture:** Immutable SC/BCC/FCC reference data feeds a pure calculation module. A React component projects the reference cell into an isometric SVG, keeps a cubic diffraction dial synchronized with the selected Miller indices, and gives the learner a separate finite supercell in which every defect is added or removed manually. Model-passport copy keeps ideal periodic-cell results separate from finite illustrative defect edits and real material properties.

**Tech Stack:** React 19, native SVG, CSS, pure ES modules, Node deterministic verifier, Vite 8.

## Global Constraints

- Use no new runtime dependency, remote model, measured crystal database, or paid service.
- Support only monatomic simple-cubic, body-centred-cubic, and face-centred-cubic teaching references.
- Keep learner inputs unchanged when a diffraction geometry is impossible or a defect action is invalid.
- Never infer phase stability, defect equilibrium, mechanical/electrical properties, colour, or a real material identity.
- A vacancy, substitution, or interstitial must result only from the learner's explicit site action.
- Keep desktop, 742 px tablet, and 390 px phone layouts usable with visible keyboard focus and reduced-motion support.
- Do not run Git commands or create commits in this execution.

---

## Visual direction

The studio is a crystallography instrument rather than another card dashboard.

- Crystal midnight `#07172B`: isometric theatre and reciprocal-space field.
- Lattice cyan `#69E7FF`: host sites and conventional-cell edges.
- Reciprocal violet `#7B78FF`: reflection controls and diffraction ray.
- Plane amber `#FFD166`: selected `(hkl)` plane and Bragg geometry.
- Defect coral `#FF7185`: vacancies and blocked edits.
- Mineral paper `#F3F7FA`: quiet calculation and teaching surfaces.
- Existing condensed display, humanist body, and monospaced utility roles remain for product cohesion.

Signature interaction: the learner rotates a translucent conventional cell while a selected lattice plane slices through it. The visual plane, `d_hkl`, reflection condition, and Bragg detector move as one system.

Desktop composition:

```text
┌ structure shelf ┐ ┌──── isometric crystal theatre ────┐ ┌ cell audit ┐
│ SC / BCC / FCC  │ │ rotatable cube + sites + hkl plane│ │ Z, CN, APF │
│ interaction law│ │ depth-sorted atoms + projection    │ │ density     │
└─────────────────┘ └────────────────────────────────────┘ └────────────┘
┌──────────── diffraction bench ────────────┐ ┌── defect microscope ──┐
│ h k l · wavelength · d · 2theta · extinct │ │ mode + clickable sites │
└────────────────────────────────────────────┘ └────────────────────────┘
┌ learning trace ┐ ┌──────────── model passport + sources ─────────────┐
└────────────────┘ └────────────────────────────────────────────────────┘
```

At narrow widths, controls precede the theatre, diffraction and defects remain separate surfaces, and no calculation is hidden behind hover.

---

### Task 1: Immutable cubic-crystal references and pure engine

**Files:**
- Create: `src/data/crystalStructures.js`
- Create: `src/chemistry/crystalLattice.js`
- Create: `scripts/verify-crystal-lattice.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `CRYSTAL_STRUCTURES`, keyed by `sc`, `bcc`, and `fcc`.
- Produces: `calculateCrystalCell(input)`, `calculateCubicDiffraction(input)`, `projectCrystalPoint(point, view)`, `planeCubeIntersections(h,k,l)`, `createTeachingSupercell(structureId)`, and `applyPointDefect(state, action)`.
- Every calculation returns `{valid:false, reason}` rather than mutating or repairing invalid input.

- [ ] **Step 1: Encode the reference cells**

Each structure declares its conventional-cell basis, displayed corner/body/face sites, site-sharing ledger, coordination number, nearest-neighbour factor, hard-sphere radius factor, packing fraction, and monatomic reflection rule.

Reference invariants:

```js
SC:  Z=1, CN=6,  r/a=1/2,           APF=Math.PI/6
BCC: Z=2, CN=8,  r/a=Math.sqrt(3)/4, APF=Math.sqrt(3)*Math.PI/8
FCC: Z=4, CN=12, r/a=1/(2*Math.sqrt(2)), APF=Math.PI/(3*Math.sqrt(2))
```

- [ ] **Step 2: Implement cell calculations**

`calculateCrystalCell({structureId,latticeParameterA,molarMassGmol})` must compute:

```js
cellVolumeA3 = a ** 3
nearestNeighborA = nearestNeighborFactor * a
hardSphereRadiusA = radiusFactor * a
densityGcm3 = Z * molarMassGmol / (6.02214076e23 * (a * 1e-8) ** 3)
```

Reject unknown structures, non-finite values, `a <= 0`, and molar mass `<= 0` without replacing the learner's input.

- [ ] **Step 3: Implement cubic diffraction**

`calculateCubicDiffraction({structureId,latticeParameterA,h,k,l,wavelengthA,order})` must compute:

```js
dA = a / Math.sqrt(h*h + k*k + l*l)
sinTheta = order * wavelengthA / (2*dA)
thetaDeg = Math.asin(sinTheta) * 180 / Math.PI
twoThetaDeg = 2 * thetaDeg
```

`h=k=l=0` is invalid. Signed integral indices are accepted. `sinTheta > 1` is a preserved, explained geometric no-solution. SC permits every non-zero integral reflection; BCC requires `h+k+l` even; FCC requires all absolute index parities odd or all even. Extinction and Bragg geometric impossibility remain distinct statuses.

- [ ] **Step 4: Implement projection and plane geometry**

`projectCrystalPoint` centres fractional coordinates at `(0.5,0.5,0.5)`, rotates around the vertical axis, applies a fixed isometric tilt, and returns deterministic SVG `x`, `y`, and depth. `planeCubeIntersections` evaluates `hx+ky+lz` at all cube corners, chooses the midpoint between the minimum and maximum as a visible member of that signed `(hkl)` family, intersects it with all twelve cube edges, removes duplicates, and returns the ordered polygon used by the visual plane. This supports barred or negative indices without changing the learner's inputs.

- [ ] **Step 5: Implement explicit defect state**

`createTeachingSupercell` returns immutable host sites from a finite repeated basis plus declared illustrative interstitial targets. `applyPointDefect` supports only:

```js
{mode:'vacancy', siteId}
{mode:'substitution', siteId}
{mode:'interstitial', siteId}
{mode:'restore', siteId}
{mode:'clear'}
```

Vacancy/substitution require a host site; interstitial requires an interstitial target. Repeating the current action toggles that defect off. The result reports host, vacancy, substitution, and interstitial counts but never recalculates ideal-cell APF or bulk properties.

- [ ] **Step 6: Add and run the deterministic verifier**

Add `verify:crystal-lattice` to `package.json`. The verifier must assert exact SC/BCC/FCC reference invariants, site-sharing totals, density unit conversion, Miller spacing, allowed/extinct conditions, impossible Bragg geometry, projection finiteness, plane polygons for `(100)`, `(110)`, `(111)`, and a signed-index plane, immutable defects, invalid-site preservation, and clear/restore behavior.

Run:

```bash
npm run verify:crystal-lattice
```

Expected: three structures and every calculation/defect invariant pass with exit code 0.

---

### Task 2: Crystal theatre and synchronized learning workflow

**Files:**
- Create: `src/components/CrystalLatticeLab.jsx`
- Modify: `src/styles.css`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes all Task 1 exports.
- Produces section anchor `#crystalLab`.
- Maintains learner-owned structure, view angle, `a`, molar mass, `h/k/l`, wavelength, order, defect mode, defect state, and trace.

- [ ] **Step 1: Build the structure shelf**

Three large controls describe SC, BCC, and FCC by visual centring—not material identity. Changing structure clears defect state explicitly and records one trace entry. It does not reset lattice parameter, molar mass, wavelength, or Miller inputs.

- [ ] **Step 2: Build the isometric crystal theatre**

Render cube edges, depth-sorted host spheres, site labels, and the selected `(hkl)` polygon in native SVG. Add a visible rotation slider and a plane-visibility control. Site spheres use cyan glass shading; the plane uses translucent amber; extinct reflections tint the plane coral rather than removing it.

- [ ] **Step 3: Build the cell audit**

Expose the site-sharing arithmetic (`8 corners × 1/8`, `1 body × 1`, `6 faces × 1/2`), `Z`, coordination, nearest-neighbour distance, hard-sphere radius, APF, cell volume, and computed density. Label every quantity as an ideal conventional-cell result from learner inputs.

- [ ] **Step 4: Build the diffraction bench**

Use separate integer inputs for `h`, `k`, and `l`, plus wavelength and order. Show `d_hkl`, Bragg equation substitution, `theta`, `2theta`, and one of three explicit states: allowed reflection, structure-factor extinction, or geometric no-solution. A compact ray/detector graphic must respond to `2theta`; impossible geometry keeps all inputs and explains why no detector position exists.

- [ ] **Step 5: Build the defect microscope**

Render a finite projected supercell with host and interstitial targets as focusable SVG controls. The learner chooses vacancy, substitution, interstitial, or restore mode and then clicks a site. Show the exact finite count change and a persistent note that ideal `Z`, APF, density, and diffraction rules above are not recomputed for the defective finite illustration.

- [ ] **Step 6: Build teaching trace and model passport**

Every structure change, reflection change, defect placement/removal, impossible geometry, and reset gets a chronological entry. The passport names included cubic geometry and excluded real materials, stability, thermal motion, disorder statistics, intensities, relaxation, and properties, with links from `scienceSources.js`.

- [ ] **Step 7: Add responsive and accessibility behavior**

Provide visible focus for every SVG site, a textual equivalent for the crystal state, 44 px minimum touch areas where practical, no hover-only meaning, and reduced-motion handling. At 742 px and 390 px, verify `scrollWidth === clientWidth`.

---

### Task 3: Navigation, curriculum, provenance, and open-source contract

**Files:**
- Modify: `src/components/Header.jsx`
- Modify: `src/components/ReactionLab.jsx`
- Modify: `src/components/EquationSections.jsx`
- Modify: `src/data/curriculum.js`
- Modify: `src/data/scienceSources.js`
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`

**Interfaces:**
- Header exposes `Crystal lattice` at `#crystalLab` on desktop and mobile.
- Materials curriculum lists a live crystal workbench and retains next-engine boundaries for polymers and computed properties.
- `MODEL_PASSPORTS.crystalLattice` is rendered by the component.

- [ ] **Step 1: Register authoritative references**

Add direct source records for IUPAC `unit cell` and `lattice`, IUCr Miller indices, IUCr reciprocal lattice/Bragg law, the IUCr ordered/disordered scattering article containing SC/BCC/FCC structure factors, IUCr `Z and Z'`, and NIST 2022 CODATA constants.

- [ ] **Step 2: Add the model passport**

Included: monatomic cubic conventional cells, site sharing, ideal hard-sphere contact geometry, density conversion, cubic plane spacing, first-order/selected-order Bragg geometry, monatomic centring extinctions, and finite illustrative point-defect edits.

Excluded: named-material identification, non-cubic cells, basis-dependent real structures, atomic form factors, peak intensity/width, thermal motion, strain, multiphase patterns, defect energetics/concentration, relaxation, and property prediction.

- [ ] **Step 3: Update navigation and section numbering**

Insert Crystal lattice after Mechanism studio. Renumber Reaction chamber to `08` and Equation balancer to `09`. Keep a mobile More route and a desktop advanced-labs route.

- [ ] **Step 4: Update curriculum truthfully**

Materials topics become live for cubic unit cells/packing/density and cubic diffraction/manual point defects. Polymers and computed material properties remain `next-engine`. Add the Crystal lattice studio as the discipline's first live workbench.

- [ ] **Step 5: Update open-source documentation**

Document the feature, command, files, verifier evidence, scientific boundary, and contributor review journey. State that finite defect edits do not become real equilibrium concentrations or automatic bulk-property predictions.

---

### Task 4: Learner, teacher, visual, and regression audit

**Files:**
- Verify only after Tasks 1–3 are complete.

- [ ] **Step 1: Run the learner journey**

In FCC, verify `Z=4`, `CN=12`, and APF about `74.05%`. Set `(111)` and observe an allowed reflection; set `(100)` and observe extinction without input reset. Place one vacancy, one substitution, and one interstitial explicitly; restore one site and clear all; confirm only requested sites change.

- [ ] **Step 2: Run the teacher journey**

Confirm the site-sharing ledger explains `Z`, the diffraction panel distinguishes Bragg geometry from centring extinction, every defect remains a finite illustration, and the passport lists the model/data exclusions and source links.

- [ ] **Step 3: Run responsive and browser-error audits**

At 1280×720, 742×964, and 390×844, inspect the theatre, controls, diffraction result, and defect microscope. Require no horizontal overflow and no browser error logs.

- [ ] **Step 4: Run fresh deterministic and build verification**

Run in parallel:

```bash
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

- The plan covers the requested graphical interaction, chemistry learning value, student/teacher use, deterministic validation, scientific provenance, responsive behavior, and open-source documentation.
- No task claims non-cubic crystals, real material identity, defect thermodynamics, pattern intensity, or bulk-property prediction.
- Interface names are consistent across the data, engine, component, verifier, passport, curriculum, and documentation tasks.
- No placeholder or future implementation is labelled live.
