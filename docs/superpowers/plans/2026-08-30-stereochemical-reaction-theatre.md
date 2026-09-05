# Stereochemical Reaction Theatre Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a graphical learner-controlled theatre that carries declared configurations through two-centre comparison, backside substitution, and antiperiplanar elimination without claiming arbitrary nomenclature, measured selectivity, or universal reaction prediction.

**Architecture:** Freeze six multicentre, five SN2, and five E2 teaching cartridges in one data module. Keep configuration classification, angular gates, product-release decisions, prediction evaluation, and hints in one pure recursively immutable engine. Lazy-load one React lab with three persistent instruments and one isolated CSS visual system; every result is released locally only after an explicit learner action.

**Tech Stack:** React 19, Vite 8, immutable ES modules, SVG, CSS, Node deterministic verifier.

## Global Constraints

- Preserve learner ownership: mode, cartridge, every R/S centre flip, SN2 approach angle, E2 rear-carbon rotation, selected beta hydrogen, predictions, release, check, hint, reset, and teacher load are explicit actions.
- Never flip a configuration, rotate a bond, choose a hydrogen, repair a prediction, or reveal a product automatically.
- Parameter or configuration edits after release must retain the released snapshot and label it stale until the learner explicitly releases again.
- Preserve every wrong but valid prediction. Feedback explains the local geometric or terminology reason without mutating the learner answer.
- Use only declared local priorities and abstract teaching substituents. Do not present the multicentre mode as an arbitrary recursive CIP parser.
- Treat Walden inversion as a relative geometric change. Do not promise that the absolute R/S letter always changes when the entering and leaving groups have different priority order.
- Treat the SN2 backside threshold as a teaching gate for the displayed concerted path, not proof that every other real pathway is impossible.
- Treat the E2 antiperiplanar threshold as a stereoelectronic geometry gate. Do not derive rate, yield, regioselectivity, product ratio, or reaction occurrence from it.
- Keep stereospecificity distinct from complete stereoselectivity; do not use one term as a synonym for the other.
- Exclude SN1/E1 ionization, rearrangement, solvent, base/nucleophile competition, isotope effects, kinetic fitting, transition-state energy, quantum orbitals, real product evidence, and synthesis procedure.
- Keep every visible control at least 44 CSS px high, preserve visible keyboard focus, respect reduced motion, and prevent document-level horizontal overflow at 390, 768, and 1440 CSS px.
- Use `apply_patch` for source edits. Do not perform Git actions.
- Run validation because the standing user goal explicitly requires learner/teacher use and evidence before completion claims.

---

## Scientific Contract

### Two-centre relationship matrix

Each cartridge has the same declared connectivity in specimens A and B, exactly two declared stereogenic centres, and a flag stating whether the two centre positions are symmetry-equivalent.

```text
same ordered configuration: same stereoisomer
all centres inverted: enantiomers
some but not all centres inverted: diastereomers
symmetric opposite pair R,S or S,R: one achiral meso stereoisomer
```

For the symmetric cartridge, `R,S` and `S,R` canonicalize to `meso`, so they compare as the same stereoisomer even though both displayed centre letters differ. The displayed differing-centre count remains two; this contrast is required.

### SN2 inversion tunnel

The leaving-group axis is `0°`; a perfectly backside approach is `±180°`.

```text
normalized approach theta in [-180°, +180°]
backside distance = 180° - |theta|
backside gate: distance <= 15°
alignment index = [1 - cos(theta)] / 2
```

Inside the gate, the declared tetrahedral arrangement inverts. The cartridge separately declares whether the absolute descriptor flips, stays the same after priority reordering, or is inapplicable at an achiral centre. Outside the gate, no product or descriptor is released.

### E2 antiperiplanar turnstile

The front leaving group is fixed at `0°`. Each selectable beta hydrogen has a frozen rear-carbon offset.

```text
theta(Hbeta, LG) = normalize(rear rotation + Hbeta offset)
distance to antiperiplanar = 180° - |theta|
antiperiplanar gate: distance <= 15°
alignment index = [1 - cos(theta)] / 2
```

IUPAC torsion ranges use `[0,30) synperiplanar`, `[30,90) synclinal`, `[90,150) anticlinal`, and `[150,180] antiperiplanar`. A product is released only when a declared beta-H channel is selected and lies inside the explicit gate. Its `E` or `Z` label is a frozen local consequence of that cartridge’s displayed remaining substituents, not a universal regioselectivity or product-ratio rule.

---

## Subject and Visual Contract

**Subject:** An undergraduate learner or teacher following spatial information frame by frame through a declared reaction.

**Single job:** Decide what geometry is present, commit the allowed transformation, and explain which stereochemical information is preserved, inverted, or insufficient.

**Palette:**

- projection white `#f5f7f4`
- theatre cobalt `#2447a8`
- depth cyan `#1db6c8`
- inversion magenta `#d9448d`
- turnstile orange `#f08a3e`
- gate yellow `#f1d75a`
- graphite `#25262b`

**Type roles:** Existing Avenir Next Condensed/Arial Narrow stack for thesis and frame titles, application body stack for teaching copy, and SFMono-Regular/Menlo for centre labels, angle registers, relationship ledgers, and source tapes.

**Layout:**

```text
┌──────── thesis + anaglyph reactant → gate → product filmstrip ────────┐
└────────────────────────────────────────────────────────────────────────┘
┌──── mode switch: RELATIONSHIP | INVERSION | ELIMINATION ──────────────┐
└────────────────────────────────────────────────────────────────────────┘
┌──── cartridge + learner controls ──┬──── optical reaction stage ──────┐
│ configuration/angle controls       │ two-centre cards / SN2 tunnel    │
│ prediction rack                    │ / rotating Newman turnstile      │
│ explicit release/check/hint        │ shuttered product frame          │
├────────────────────────────────────┼───────────────────────────────────┤
│ retained answer reasons            │ geometry + terminology ledger     │
└────────────────────────────────────┴───────────────────────────────────┘
┌──────── teacher contrast deck ─────┬──────── learner action film ─────┐
└────────────────────────────────────┴───────────────────────────────────┘
┌────────────────── model + source passport ────────────────────────────┐
└────────────────────────────────────────────────────────────────────────┘
```

**Signature:** A physical three-frame reaction filmstrip uses cyan/magenta anaglyph offsets to show near/far bonds. The centre frame is an operational gate: a mirror prism for relationships, a backside aperture for SN2, or a rotating Newman turnstile for E2. The product frame remains mechanically shuttered until the learner commits a supported geometry.

**Design critique:** This direction avoids the previous mineral-dark thermodynamics language and avoids a generic cream editorial page. The one aesthetic risk is the red/cyan anaglyph depth cue; use it only on bonds and moving groups, never on body text, so the page remains readable and accessibility-safe.

---

### Task 1: Freeze declared cartridges, primary sources, and the model passport

**Files:**

- Create: `src/data/stereochemicalReactionScenarios.js`
- Modify: `src/data/scienceSources.js`

**Interfaces:**

- Produces `MULTICENTRE_SCENARIOS`, `MULTICENTRE_SCENARIO_BY_ID`, `SN2_STEREOCHEMISTRY_SCENARIOS`, `SN2_STEREOCHEMISTRY_SCENARIO_BY_ID`, `E2_STEREOCHEMISTRY_SCENARIOS`, `E2_STEREOCHEMISTRY_SCENARIO_BY_ID`, `STEREOCHEMICAL_REACTION_CONSTANTS`, and `STEREOCHEMICAL_REACTION_BOUNDARY`.
- Adds `MODEL_PASSPORTS.stereochemicalReactionTheatre` and direct source records.

- [ ] **Step 1: Declare six recursively frozen two-centre cartridges**

Use this exact set:

| id | connectivity label | symmetric centres | A | B | expected relationship |
|---|---|---|---|---|---|
| `symmetric-rr-ss` | X–C*–C*–X | yes | R,R | S,S | enantiomers |
| `symmetric-rr-rs` | X–C*–C*–X | yes | R,R | R,S | diastereomers |
| `symmetric-meso-pair` | X–C*–C*–X | yes | R,S | S,R | same |
| `unsymmetric-rs-sr` | X–C*–C*–Y | no | R,S | S,R | enantiomers |
| `unsymmetric-rr-sr` | X–C*–C*–Y | no | R,R | S,R | diastereomers |
| `unsymmetric-identical` | X–C*–C*–Y | no | R,R | R,R | same |

Every record declares centre labels `C2/C3`, frozen local priority ribbons, initial A/B configurations, symmetry rationale, and `dataKind: 'declared-two-centre-teaching-configuration'`. The symmetric mixed configurations are explicitly achiral meso; no other record is meso.

- [ ] **Step 2: Declare five abstract SN2 cartridges**

Use:

```js
[
  { id: 'priority-preserved-r-to-s', initialDescriptor: 'R', productDescriptor: 'S', descriptorRelation: 'flips' },
  { id: 'priority-preserved-s-to-r', initialDescriptor: 'S', productDescriptor: 'R', descriptorRelation: 'flips' },
  { id: 'priority-reordered-r-to-r', initialDescriptor: 'R', productDescriptor: 'R', descriptorRelation: 'same' },
  { id: 'priority-reordered-s-to-s', initialDescriptor: 'S', productDescriptor: 'S', descriptorRelation: 'same' },
  { id: 'achiral-centre-inversion', initialDescriptor: null, productDescriptor: null, descriptorRelation: 'not-applicable' },
]
```

Every cartridge starts at `approachAngleDeg: 0`, uses abstract ligand labels and a declared leaving/incoming group priority ribbon, states `geometryOutcome: 'inversion'`, and carries `dataKind: 'abstract-walden-inversion-teaching-map'`. No cartridge is a named measured reaction.

- [ ] **Step 3: Declare five E2 turnstile cartridges**

Use a fixed front leaving-group angle `0°`, initial rear rotation `0°`, and:

| id | selectable beta-H channels (`offset → product`) | rotation | expected opening |
|---|---|---|---|
| `declared-e-channel` | `Hβ-E: 180° → E` | free | open initially after H selection |
| `declared-z-channel` | `Hβ-Z: 180° → Z` | free | open initially after H selection |
| `two-hydrogen-choice` | `Hβ-E: 180° → E`, `Hβ-Z: 60° → Z` | free | channel depends on selected H and rotation |
| `rotate-to-anti` | `Hβ-Z: 60° → Z` | free | learner must rotate rear carbon to `120°` |
| `locked-non-anti` | `Hβ: 60° → E` | locked | blocked with a frozen-conformer reason |

Every record includes three fixed front groups, three rear groups, local remaining-substituent priority notes, a product notation, and `dataKind: 'declared-e2-stereoelectronic-teaching-channel'`. The locked cartridge is an abstract conformational boundary, not a named cyclic-substrate prediction.

- [ ] **Step 4: Add source records**

Reuse existing `iupacChirality`, `iupacStereogenicUnit`, `iupacRS`, `iupacEZ`, `iupacEnantiomer`, `iupacDiastereoisomerism`, `iupacConformation`, `iupacNewmanProjection`, `iupacTorsionAngle`, `iupacNucleophilicSubstitution`, and `acsUndergraduateCurriculum`.

Add:

- `iupacRelativeConfiguration` → `https://goldbook.iupac.org/terms/view/R05260`
- `iupacMesoCompound` → `https://goldbook.iupac.org/terms/view/M03839`
- `iupacFischerProjection` → `https://goldbook.iupac.org/terms/view/F02391`
- `iupacWaldenInversion` → `https://goldbook.iupac.org/terms/view/W06653`
- `iupacStereospecificity` → `https://goldbook.iupac.org/terms/view/S05994`
- `iupacStereoselectivity` → `https://goldbook.iupac.org/terms/view/S05991`
- `iupacAnti` → `https://goldbook.iupac.org/terms/view/A00381`
- `iupacElimination` → `https://goldbook.iupac.org/terms/view/E02038`
- `mitSubstitutionEliminationStereochemistry` → `https://ocw.mit.edu/courses/5-12-organic-chemistry-i-spring-2005/864a502e7a69a6b5b737b8322ae23ac4_subelim.pdf`
- `acsOrganicChemistrySupplement` → `https://www.acs.org/content/dam/acsorg/about/governance/committees/training/acsapproved/degreeprogram/organic-chemistry-supplement.pdf`

Roles must say whether a source defines terminology, documents an undergraduate scope, or supplies the declared concerted-path teaching relationship. No source supplies the abstract cartridge values or angular tolerance.

- [ ] **Step 5: Add the model passport**

Use result kind:

```text
Declared stereochemical relationship and concerted-geometry teaching result — not arbitrary CIP, measured pathway, selectivity, or reaction proof
```

Passport conditions must name the three models separately. Exclusions must include arbitrary graphs, more than two centres, pseudoasymmetry, rings/chairs, axial/planar/helical chirality, SN1/E1, competing pathways, rates, barriers, solvent, product ratios, experimental validation, and operational procedure.

---

### Task 2: Implement the pure engine with a red-green verifier

**Files:**

- Create: `src/chemistry/stereochemicalReactions.js`
- Create: `scripts/verify-stereochemical-reactions.mjs`
- Modify: `package.json`

**Interfaces:**

- Produces `createMulticentreState`, `flipMulticentreDescriptor`, `analyzeMulticentreRelationship`, `evaluateMulticentrePrediction`, `nextMulticentreHint`, `createSn2StereoState`, `setSn2ApproachAngle`, `analyzeSn2Stereo`, `commitSn2Stereo`, `evaluateSn2Prediction`, `nextSn2StereoHint`, `createE2StereoState`, `setE2RearRotation`, `selectE2BetaHydrogen`, `analyzeE2Stereo`, `commitE2Stereo`, `evaluateE2Prediction`, and `nextE2StereoHint`.
- Every public return value and nested learner state is recursively frozen. Blocked mutations return the original state object.

- [ ] **Step 1: Write the verifier before the engine and capture the red state**

Add:

```json
"verify:stereochemical-reactions": "node scripts/verify-stereochemical-reactions.mjs"
```

Run:

```bash
npm run verify:stereochemical-reactions
```

Expected red state:

```text
ERR_MODULE_NOT_FOUND: Cannot find module .../src/chemistry/stereochemicalReactions.js
```

- [ ] **Step 2: Verify frozen data and source/passport invariants**

Assert exact counts `6 / 5 / 5`, unique IDs, recursive freezing, exact `15°` SN2 and E2 gates, declared-data kinds, all source URLs, and passport/result boundaries.

- [ ] **Step 3: Implement and verify multicentre relationship logic**

State shape:

```js
{ scenarioId, specimenA: ['R','R'], specimenB: ['S','S'] }
```

`flipMulticentreDescriptor({ scenarioId, state, specimen: 'A'|'B', centreIndex: 0|1 })` flips only the selected centre. `analyzeMulticentreRelationship` returns:

```js
{
  state, differingCentreCount, canonicalA, canonicalB,
  chiralityA, chiralityB, relationship, mirrorTest, symmetryReason, boundary
}
```

Required cases:

- symmetric `RR / SS` → enantiomers;
- symmetric `RR / RS` → diastereomers;
- symmetric `RS / SR` → same, both `achiral-meso`, differing count `2`;
- unsymmetric `RS / SR` → enantiomers;
- unsymmetric `RR / SR` → diastereomers;
- identical ordered arrays → same.

Four predictions: differing-centre count, relationship, chirality pair, and declared-two-centre scope. Verify `0/4`, `4/4`, preserved predictions, four non-mutating hints, invalid indices/specimens, and recursive immutability.

- [ ] **Step 4: Implement and verify SN2 angular gating and inversion**

State shape:

```js
{ scenarioId, approachAngleDeg }
```

Normalize to `[-180,180]`, preserving positive `180`. `analyzeSn2Stereo` returns approach class, backside distance, alignment index, gate status, initial/product descriptor metadata, and no product object. `commitSn2Stereo` returns a product only inside the `15°` gate.

Verify:

- `0°` is frontside and blocked;
- `90°` is oblique and blocked;
- `164°` is blocked;
- `165°`, `180°`, and `-180°` are backside-aligned and allowed;
- every allowed cartridge reports geometric inversion;
- preserved-priority cartridges flip R/S;
- reordered-priority cartridges keep the same R/S letter despite inversion;
- achiral cartridge reports `not-applicable`;
- blocked attempts return `product: null` and preserve the state.

Four predictions: approach class, product release, geometry outcome, and descriptor relation/scope contrast. Verify full/zero scoring and four hints.

- [ ] **Step 5: Implement and verify E2 turnstile gating**

State shape:

```js
{ scenarioId, rearRotationDeg, selectedHydrogenId }
```

`setE2RearRotation` normalizes free cartridges and returns the original state with a reason for the locked cartridge. `analyzeE2Stereo` returns current selected H–LG torsion, IUPAC range, distance to anti, alignment index, gate status, and the declared channel product descriptor without releasing a product. `commitE2Stereo` releases the product only inside the gate.

Verify:

- no selected H blocks with a selection reason;
- `Hβ-E` at offset `180°`, rotation `0°` releases E;
- `Hβ-Z` at offset `60°`, rotation `0°` blocks;
- the same channel at rotation `120°` releases Z;
- `164°` blocks and `165°` passes;
- the locked non-anti cartridge cannot rotate or release;
- torsion ranges match existing half-open IUPAC bins;
- changing selected H never rotates the state or changes another group;
- no blocked commit exposes a product.

Four predictions: torsion range, gate permission, E/Z/no-product result, and geometry-only scope. Verify preserved answers, full/zero scoring, four hints, invalid states, and recursive freezing.

- [ ] **Step 6: Prove the focused green state**

Run:

```bash
npm run verify:stereochemical-reactions
```

Expected summary:

```text
Six multicentre, five SN2, and five E2 cartridges plus source boundaries verified.
Two-centre same/enantiomer/diastereomer/meso classification and preserved predictions verified.
Backside inversion and antiperiplanar product gates, descriptor contrasts, hints, blocked states, and immutability verified.
```

---

### Task 3: Build the three-frame React reaction theatre

**Files:**

- Create: `src/components/StereochemicalReactionLab.jsx`
- Create: `src/styles/stereochemical-reactions.css`

**Component contract:**

- Parent owns `mode`, one persistent draft/snapshot/prediction/evaluation/hint state per mode, a shared 12-entry action film, and selected teacher contrast.
- Cartridge changes and teacher loads populate drafts only; they never release a result.
- Mode changes preserve each instrument’s work.
- The only release actions are `Develop relationship matrix`, `Open inversion shutter`, and `Commit elimination frame`.
- Editing any released draft retains the old result with `Draft changed — released frame is stale`.

- [ ] **Step 1: Build the thesis hero and accessible mode switch**

Create `<section id="stereochemicalReactionLab" aria-labelledby="stereochemicalReactionLabTitle">` with section code `27 / Stereochemical reaction trajectories` and thesis:

```text
Mechanisms move electrons. Stereochemistry remembers where every group went.
```

The hero filmstrip shows `REACTANT`, `GEOMETRY GATE`, and `PRODUCT` frames. The gate and product are shuttered in the decorative hero; no result is implied. Add chips `2-centre relationships`, `backside inversion`, and `anti-periplanar E2`.

Mode buttons require persistent explicit `aria-label` values so their accessible names survive responsive text hiding.

- [ ] **Step 2: Build the relationship matrix**

Controls:

- cartridge selector;
- four R/S flip buttons, one per displayed specimen/centre;
- four prediction groups;
- explicit develop, check, hint, and reset actions.

Graphic:

- two vertical Fischer-style declared projection cards with clear `horizontal bonds toward / vertical bonds away` legend;
- two centre camera discs per card with cyan/magenta depth shadows;
- a mirror prism between cards;
- a relationship punch card that remains shuttered before release;
- a symmetry beam that identifies the symmetric meso cartridge only after release.

Released ledger exposes ordered configurations, differing-centre count, each specimen’s chirality, canonical meso handling, mirror test, relationship, and scope. The symmetric `RS / SR` card must visibly say `two displayed letters differ; one meso stereoisomer`.

- [ ] **Step 3: Build the SN2 inversion tunnel**

Controls:

- cartridge selector;
- `approachAngleDeg` range and exact numeric input;
- four persistent predictions;
- explicit open/check/hint/reset actions.

Graphic:

- a fixed tetrahedral centre with near/far anaglyph bonds;
- leaving-group exit door on the `0°` axis;
- draggable/slider-controlled nucleophile puck around an orbital-alignment ring;
- backside aperture at `±180°`, frontside warning plate at `0°`, and live dimensionless alignment rail;
- reactant and product tetrahedral frames whose group positions visibly invert only after an allowed release.

Blocked releases preserve the puck angle and show the exact frontside/oblique/gate reason; no product silhouette appears. Allowed releases show both `relative geometry: inversion` and `absolute label: flips/same/not applicable` side by side.

- [ ] **Step 4: Build the E2 antiperiplanar turnstile**

Controls:

- cartridge selector;
- beta-H selector;
- rear-carbon rotation range and exact numeric input;
- snap buttons `0°, 60°, 120°, 180°`;
- four persistent predictions;
- explicit commit/check/hint/reset actions.

Graphic:

- a large Newman projection with fixed front leaving group and rotatable rear groups;
- selected H and leaving-group sightline;
- four-colour IUPAC torsion-range annulus;
- yellow antiperiplanar gate sector and alignment register;
- three synchronized electron-pair ribbons labelled `base→H`, `C–H→C=C`, `C–LG→LG` that illuminate together only after an allowed commit;
- shuttered E/Z product card.

The locked cartridge disables rotation with a visible local reason but keeps hydrogen selection and predictions available for discussion.

- [ ] **Step 5: Add teacher contrasts, history, and passport**

Teacher cards load without release:

1. `two changed letters can still be one meso stereoisomer`;
2. `enantiomer is not diastereomer`;
3. `geometric inversion does not guarantee R ↔ S`;
4. `stereospecific is not a synonym for 100% selective`;
5. `anti is broader than antiperiplanar`;
6. `geometry gate does not predict rate or product ratio`.

Action IDs must be captured before queued React state updates so rapid teacher loads cannot create duplicate keys. The passport links every primary definition and states that all cartridges are local declarations.

- [ ] **Step 6: Apply responsive, focus-visible, and reduced-motion styling**

- Wide screens: control/prediction rail beside the optical stage.
- Tablet: compact rail beside stage where possible, stacked ledgers below.
- 390 px: single column, internally contained SVG/filmstrip overflow, no page overflow, no hidden accessible labels.
- Every visible `button`, `select`, and `input` must measure at least 44 CSS px high.
- Limit motion to shutter opening, one inversion flip, and rear-turnstile rotation. Under reduced motion, jump directly to the released frame.

---

### Task 4: Integrate navigation, curriculum truth, section order, and documentation

**Files:**

- Modify: `src/App.jsx`
- Modify: `src/components/Header.jsx`
- Modify: `src/data/curriculum.js`
- Modify: `README.md`
- Modify downstream section codes in `CoordinationFieldLab.jsx`, `CrystalLatticeLab.jsx`, `PolymerPopulationLab.jsx`, `ReactionLab.jsx`, and `EquationSections.jsx`.

- [ ] **Step 1: Lazy-load and navigate to the theatre**

Insert the new lab immediately after `StereochemistryLab` in `App.jsx`. Add desktop and mobile More-lab links labelled `Stereochemical reaction theatre` with subcopy `Carry geometry through inversion and elimination`.

- [ ] **Step 2: Renumber downstream sections**

Keep static Stereochemical Navigation at `26`, add the theatre at `27`, then shift:

| Component | new section |
|---|---:|
| `CoordinationFieldLab.jsx` | 28 |
| `CrystalLatticeLab.jsx` | 29 |
| `PolymerPopulationLab.jsx` | 30 |
| `ReactionLab.jsx` | 31 |
| `EquationSections.jsx` | 32 |

- [ ] **Step 3: Update curriculum without erasing remaining gaps**

Organic Chemistry:

- add an outcome connecting multicentre relationship, Walden inversion, E2 conformation, and product configuration;
- replace the current broad next-engine row with live `Declared multicentre relationships and concerted stereochemical pathways`;
- add narrower next-engine `Arbitrary reaction stereochemistry, competing pathways, and product evidence` covering recursive CIP, more centres, rings/chairs, SN1/E1, regioselectivity, measured kinetics/selectivity, and validation;
- add the theatre to live labs and update the boundary.

Physical Chemistry:

- add live `Concerted stereoelectronic geometry prerequisite` for dimensionless alignment and explicit geometry gates;
- replace `Mechanistic and quantum kinetics` with narrower next-engine `Measured and quantum reaction pathways`;
- add the theatre link and state that no energy, rate, or trajectory is calculated.

Biochemistry:

- broaden the existing single-centre prerequisite row and lab links to include the declared two-centre relationship matrix;
- do not infer biomolecular configuration networks, function, binding, activity, or reaction stereochemistry.

Expected total after the two genuinely new live topics: `100 live topic clusters`.

- [ ] **Step 4: Update README**

- Change deterministic verifier count `29 → 30`.
- Change visual section count `31 → 32` and live cluster count `98 → 100`.
- Add the three theatre instruments, learner-owned release/stale behavior, and six teacher contrasts to capabilities.
- Add focused verifier command, architecture entries, and a dedicated model-boundary paragraph.
- State that the new module narrows but does not eliminate arbitrary reaction-stereochemistry and mechanistic/quantum gaps.

---

### Task 5: Exercise the UI as learner and teacher, then validate the project

**Files:** None unless a directly observed defect requires one evidence-driven scoped fix.

- [ ] **Step 1: Run focused verification after integration**

```bash
npm run verify:stereochemical-reactions
```

- [ ] **Step 2: Exercise relationship flows**

At `http://127.0.0.1:5174/#stereochemicalReactionLab`:

1. Load `symmetric-rr-ss`, make four wrong claims, develop, verify `0/4` and retained choices, then correct to `4/4`.
2. Load `symmetric-meso-pair`, develop, verify `RS / SR`, differing count two, both achiral-meso, relationship same.
3. Flip one centre after release and verify the released frame remains visibly stale and unchanged.

- [ ] **Step 3: Exercise SN2 inversion flows**

1. Load a preserved-priority cartridge at `0°`; commit and verify blocked frontside with no product.
2. Set `180°`; commit and verify inversion plus R/S flip.
3. Load a reordered-priority cartridge; commit backside and verify inversion with unchanged R/S letter.
4. Edit angle after release and verify stale state.

- [ ] **Step 4: Exercise E2 flows**

1. Load `two-hydrogen-choice`, select `Hβ-E`, commit at `0°` rear rotation, and verify E.
2. Select `Hβ-Z` without rotating; verify blocked and no product.
3. Rotate to `120°`; commit and verify Z plus all three electron ribbons.
4. Load `locked-non-anti`; verify rotation is blocked with a reason and product remains shuttered.

- [ ] **Step 5: Exercise teacher, keyboard, mobile, and console paths**

- Rapidly load all six teacher contrasts and confirm every resulting mode is unreleased with unique history keys.
- Traverse mode tabs and major controls by keyboard; measure a visible focus outline.
- At 390 px, run all three modes, confirm every visible control is at least 44 px high, and verify `document.documentElement.scrollWidth === window.innerWidth`.
- Inspect a fresh tab console after the complete sequence; no React, SVG, accessibility-state, duplicate-key, or runtime errors are acceptable.

If any unexpected behaviour occurs, stop and apply the systematic-debugging skill before changing code.

- [ ] **Step 6: Run structural and full validation**

Confirm exactly:

```text
100 live topic clusters
30 declared verifier commands
section codes 01–32 with no duplicate or gap
```

Then run every verifier command declared in `package.json`; expected result `30/30` passed.

- [ ] **Step 7: Run the final production build**

```bash
npm run build
```

Record exit code and any non-fatal chunk-size advisory. Do not claim the milestone passes unless the focused verifier, all 30 verifiers, structural checks, browser QA, fresh console, and production build all pass.

- [ ] **Step 8: Show the result**

Open `http://127.0.0.1:5174/#stereochemicalReactionLab`, release the `two-hydrogen-choice` E2 frame at one valid antiperiplanar geometry, mark the browser tab deliverable, and leave the turnstile/product view visible.

---

## Acceptance Checklist

- [ ] Six multicentre, five SN2, and five E2 cartridges are frozen and conspicuously declared.
- [ ] Meso, same, enantiomer, and diastereomer classifications pass exact scenario checks.
- [ ] SN2 geometric inversion remains separate from absolute descriptor change.
- [ ] E2 product release requires a selected declared beta H inside the explicit antiperiplanar gate.
- [ ] Blocked commits retain state and expose no product.
- [ ] Wrong predictions persist; hints and teacher loads never mutate or auto-run.
- [ ] Stale snapshots remain visible after edits.
- [ ] Sources/passport distinguish terminology, teaching relation, and experimental proof.
- [ ] The anaglyph filmstrip and turnstile are distinctive, responsive, keyboard-visible, and reduced-motion safe.
- [ ] Curriculum reaches 100 live clusters while narrower gaps remain explicit.
- [ ] Focused verifier, all 30 verifiers, 01–32 section check, browser QA, fresh console, and production build pass.

## Out of Scope

- Arbitrary recursive CIP, more than two centres, pseudoasymmetry, or complete stereochemical nomenclature.
- Chair/ring conformations, axial/planar/helical chirality, atropisomerism, and pericyclic stereochemistry.
- SN1, E1, rearrangements, regioselectivity, competing substitution/elimination, or product discovery.
- Solvent, base/nucleophile strength, leaving-group ability, temperature, isotope effects, and reaction conditions.
- Measured or calculated barriers, rate constants, kinetic isotope effects, yields, product ratios, enantiomeric/diastereomeric excess, or uncertainty.
- Real reaction occurrence, product identity, experimental validation, synthesis planning, apparatus, handling, or procedure.
- Runtime network, database, language-model, or paid service calls.
