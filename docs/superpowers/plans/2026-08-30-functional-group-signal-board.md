# Functional Group Signal Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This project forbids Git actions, so no commit steps are included.

**Goal:** Add a graphical organic-chemistry signal board where learners manually select a structural motif, predict its functional class and carbonyl status, inventory all declared groups in the molecule, and receive connectivity-specific feedback without automatic graph repair or reaction prediction.

**Architecture:** Frozen teaching graphs and group definitions feed a pure immutable subgraph-pattern engine. A lazy-loaded React lab owns learner selection, predictions, hints, trace, and rendering; the engine owns graph validation, twelve bounded structural detectors, target evaluation, and reasons. The UI renders atom sockets over an SVG bond board and routes only learner-selected atoms through a post-check structural decision ladder.

**Tech Stack:** React 19, Vite 8, plain JavaScript modules, CSS/SVG, Node deterministic verifier.

## Global Constraints

- No runtime external calls, measured molecule claims, model calls, new dependencies, operational laboratory procedures, or product/reactivity prediction.
- Cover exactly these twelve bounded classes: alcohol, ether, aldehyde, ketone, carboxylic acid, ester, amide, amine, nitrile, alkene, alkyne, and haloalkane.
- Treat “carbonyl compound” as the broad C=O umbrella for aldehydes, ketones, carboxylic acids, esters, and amides; do not emit a second generic carbonyl item in the inventory.
- Suppress nested false positives: a carboxylic-acid O–H is not inventoried as an alcohol, an ester C–O–C is not inventoried as an ether, an amide nitrogen is not inventoried as an amine, and an acyl C–halogen bond is not inventoried as a haloalkane.
- Preserve learner-selected atoms, class prediction, carbonyl prediction, and inventory prediction after checking, whether right or wrong.
- All displayed hydrogens are diagnostic graph atoms; unshown hydrocarbon hydrogens are declared implicit and are not selectable.
- The board classifies only the displayed frozen graph. It does not assign an IUPAC name, principal characteristic group, aromaticity, protonation state, tautomer, resonance contributor, reaction, mechanism, condition, product, property, spectrum, hazard, or procedure.
- Minimum interactive target height is 44 px; support 1440 px, 768 px, and 390 px without document-level horizontal overflow; respect reduced motion.

---

### Task 1: Frozen group definitions, specimens, sources, and model passport

**Files:**
- Create: `src/data/functionalGroupScenarios.js`
- Modify: `src/data/scienceSources.js`
- Create: `scripts/verify-functional-groups.mjs`

**Interfaces:**
- Produces `FUNCTIONAL_GROUP_DEFINITIONS`, `FUNCTIONAL_GROUP_DEFINITION_BY_ID`, `FUNCTIONAL_GROUP_SCENARIOS`, `FUNCTIONAL_GROUP_SCENARIO_BY_ID`, and `FUNCTIONAL_GROUP_MODEL_BOUNDARY`.
- A graph atom is `{ id, element, x, y, label? }`.
- A graph bond is `{ id, a, b, order }` with order 1, 2, or 3.
- A scenario is `{ id, code, name, formula, summary, mission, atoms, bonds, targetGroupId, targetAtomIds, expectedGroupIds, teacherQuestion, misconception, provenance, sourceIds }`.

- [ ] **Step 1: Create a failing data-contract verifier**

  Import the five exports and assert:

  ```js
  assert.equal(FUNCTIONAL_GROUP_DEFINITIONS.length, 12);
  assert.equal(FUNCTIONAL_GROUP_SCENARIOS.length, 12);
  assert.deepEqual(
    FUNCTIONAL_GROUP_DEFINITIONS.map((item) => item.id),
    ['alcohol','ether','aldehyde','ketone','carboxylic-acid','ester','amide','amine','nitrile','alkene','alkyne','haloalkane'],
  );
  ```

  For every definition require a unique ID, label, signature, two or more decision steps, accent, carbonyl boolean, misconception, and source IDs. For every scenario require unique atom/bond IDs, valid bond endpoints/orders, 3–9 displayed atoms, a target group in the definition map, exact target IDs present in the graph, expected group IDs, synthetic provenance, teacher question, misconception, and deep immutability.

- [ ] **Step 2: Run the verifier and confirm the missing-module failure**

  Run: `node scripts/verify-functional-groups.mjs`

  Expected: `ERR_MODULE_NOT_FOUND` for `functionalGroupScenarios.js`.

- [ ] **Step 3: Add twelve frozen group definitions**

  Use these exact signatures and carbonyl flags:

  ```js
  [
    ['alcohol', 'Alcohol', 'R–O–H', false],
    ['ether', 'Ether', 'R–O–R′', false],
    ['aldehyde', 'Aldehyde', 'R–C(=O)–H', true],
    ['ketone', 'Ketone', 'R–C(=O)–R′', true],
    ['carboxylic-acid', 'Carboxylic acid', 'R–C(=O)–O–H', true],
    ['ester', 'Ester', 'R–C(=O)–O–R′', true],
    ['amide', 'Amide', 'R–C(=O)–N', true],
    ['amine', 'Amine', 'C–N with single attachments; not C(=O)–N', false],
    ['nitrile', 'Nitrile', 'R–C≡N', false],
    ['alkene', 'Alkene', 'C=C', false],
    ['alkyne', 'Alkyne', 'C≡C', false],
    ['haloalkane', 'Haloalkane', 'C–X; X = F, Cl, Br, or I', false],
  ]
  ```

  Give each definition an exact `decisionSteps` array. Examples:

  ```js
  {
    id: 'ester',
    decisionSteps: [
      'Find a carbon–oxygen double bond.',
      'From that same carbon, follow a single bond to a second oxygen.',
      'The second oxygen continues by a single bond to carbon rather than hydrogen.',
    ],
  }
  ```

  ```js
  {
    id: 'amine',
    decisionSteps: [
      'Find nitrogen with only single covalent attachments in this graph.',
      'Require at least one carbon neighbour.',
      'Reject nitrogen directly bonded to a carbonyl carbon; that branch is an amide.',
    ],
  }
  ```

- [ ] **Step 4: Add twelve frozen specimen graphs**

  Add one target case for each class:

  | ID | Formula | Target | Expected inventory |
  |---|---|---|---|
  | `ethanol-alcohol` | `CH3CH2OH` | alcohol | alcohol |
  | `dimethyl-ether` | `CH3OCH3` | ether | ether |
  | `ethanal-aldehyde` | `CH3CHO` | aldehyde | aldehyde |
  | `propanone-ketone` | `CH3COCH3` | ketone | ketone |
  | `ethanoic-acid` | `CH3COOH` | carboxylic acid | carboxylic acid |
  | `methyl-ethanoate` | `CH3COOCH3` | ester | ester |
  | `ethanamide-amide` | `CH3CONH2` | amide | amide |
  | `aminoethanol-amine` | `H2NCH2CH2OH` | amine | alcohol + amine |
  | `hydroxyacetonitrile-nitrile` | `HOCH2CN` | nitrile | alcohol + nitrile |
  | `propene-alkene` | `CH2=CHCH3` | alkene | alkene |
  | `propyne-alkyne` | `HC≡CCH3` | alkyne | alkyne |
  | `chloropropane-haloalkane` | `ClCH2CH2CH3` | haloalkane | haloalkane |

  Display only the carbon/hetero skeleton and hydrogens required by O–H, N–H, or aldehyde C–H evidence. State that remaining hydrocarbon hydrogens are implicit.

- [ ] **Step 5: Add primary source records**

  Add:

  ```js
  iupacFunctionalGroup: {
    id: 'iupac-functional-group',
    name: 'IUPAC Gold Book · functional group',
    url: 'https://goldbook.iupac.org/terms/view/F02555',
    role: 'Defines a functional group as an atom or group of atoms associated with similar chemical properties across compounds.',
  }
  iupacCharacteristicGroup: {
    id: 'iupac-characteristic-group',
    name: 'IUPAC Gold Book · characteristic group',
    url: 'https://goldbook.iupac.org/terms/view/C00976',
    role: 'Lists structural characteristic-group forms such as –Cl, =O, –OH, –NH2, –CHO, –C≡N, and –COOH.',
  }
  iupacCarbonylCompounds: {
    id: 'iupac-carbonyl-compounds',
    name: 'IUPAC Gold Book · carbonyl compounds',
    url: 'https://goldbook.iupac.org/terms/view/C00844',
    role: 'States that the C=O umbrella includes aldehydes and ketones and, broadly, carboxylic acids and derivatives.',
  }
  iupacPrinciplesNomenclature: {
    id: 'iupac-principles-chemical-nomenclature',
    name: 'IUPAC · Principles of Chemical Nomenclature',
    url: 'https://publications.iupac.org/books/principles/principles_of_nomenclature.pdf',
    role: 'Provides the common class/general-constitution table used to bound the twelve structural patterns.',
  }
  ```

  Reuse `iupacOrganicNomenclatureGuide` and `acsUndergraduateCurriculum`.

- [ ] **Step 6: Add `MODEL_PASSPORTS.functionalGroupSignalBoard`**

  Conditions must state frozen local graphs, explicit diagnostic H atoms, implicit hydrocarbon H atoms, and connectivity/bond-order matching. Includes must list the twelve detectors, manual atom selection, independent four-part predictions, suppression rules, immutable attempts, and hints. Excludes must name arbitrary graphs, aromaticity, rings, phenols, acid halides, anhydrides, imines, thiols, sulfides, nitro groups, charged/protonated forms, tautomers, resonance, naming/seniority, stereochemistry, reactivity, mechanisms, conditions, products, properties, spectra, hazards, and procedures.

- [ ] **Step 7: Run the data-contract verifier**

  Expected: the frozen data/source/passport contract passes before engine imports are added.

---

### Task 2: Immutable graph-pattern and learning engine

**Files:**
- Create: `src/chemistry/functionalGroups.js`
- Modify: `scripts/verify-functional-groups.mjs`

**Interfaces:**
- Produces `analyzeFunctionalGraph({ atoms, bonds })`.
- Produces `analyzeFunctionalGroupScenario(scenarioId)`.
- Produces `toggleFunctionalProbeAtom({ scenarioId, selectedAtomIds, atomId })`.
- Produces `evaluateFunctionalGroupAttempt({ analysis, selectedAtomIds, prediction })`.
- Produces `nextFunctionalGroupHint({ analysis, selectedAtomIds, level })`.
- `prediction` is `{ functionalClass, carbonylUmbrella, inventoryGroupIds }`.

- [ ] **Step 1: Add red graph-validation and detector tests**

  Assert rejection of duplicate atom IDs, duplicate bond IDs, unknown endpoints, self bonds, duplicate undirected edges, noninteger orders, unsupported elements, and graphs outside 2–40 atoms. Assert output and every nested match are frozen.

- [ ] **Step 2: Implement graph normalization**

  Build immutable maps for atoms, bonds, and adjacency. Preserve source order. Every adjacency entry must carry neighbour atom ID, bond ID, and order. Use exact element symbols `C`, `H`, `N`, `O`, `F`, `Cl`, `Br`, and `I`.

- [ ] **Step 3: Implement twelve structural detectors**

  Required detector logic:

  ```js
  const isCarbonylCarbon = (atomId) =>
    atom(atomId).element === 'C'
    && neighbours(atomId).some((edge) => edge.order === 2 && atom(edge.atomId).element === 'O');
  ```

  - Alcohol: O–H and O–C, where the carbon neighbour is not a carbonyl carbon.
  - Ether: O has two single-bond carbon neighbours, neither a carbonyl carbon.
  - Aldehyde: carbonyl carbon has a single-bond H neighbour.
  - Ketone: carbonyl carbon has two single-bond carbon neighbours.
  - Carboxylic acid: carbonyl carbon has a second single-bond O that has an H neighbour.
  - Ester: carbonyl carbon has a second single-bond O that has another carbon neighbour.
  - Amide: carbonyl carbon has a single-bond N neighbour.
  - Amine: N has only single bonds, has at least one carbon neighbour, and no carbon neighbour is a carbonyl carbon.
  - Nitrile: C≡N.
  - Alkene: C=C.
  - Alkyne: C≡C.
  - Haloalkane: C–X where X is F/Cl/Br/I and the carbon is not a carbonyl carbon.

  Return one match per unique atom set as `{ id, groupId, atomIds, bondIds, evidence }`.

- [ ] **Step 4: Implement scenario analysis and suppression invariants**

  Return `{ scenario, matches, inventoryGroupIds, targetMatch, targetIsCarbonyl, structuralTrace }`. Assert across all scenarios:

  ```js
  assert.deepEqual(analysis.inventoryGroupIds, scenario.expectedGroupIds);
  assert.equal(analysis.targetMatch.groupId, scenario.targetGroupId);
  assert.deepEqual(new Set(analysis.targetMatch.atomIds), new Set(scenario.targetAtomIds));
  ```

  Explicitly assert:

  ```js
  assert.equal(acid.inventoryGroupIds.includes('alcohol'), false);
  assert.equal(ester.inventoryGroupIds.includes('ether'), false);
  assert.equal(amide.inventoryGroupIds.includes('amine'), false);
  ```

- [ ] **Step 5: Implement immutable atom toggling**

  Unknown atoms return `{ allowed:false, state:original, reason }`. A valid click adds or removes exactly one atom and returns a new frozen array. Cap the selection at nine atoms with a specific reason and no mutation.

- [ ] **Step 6: Implement four-dimensional attempt evaluation**

  Score:

  1. exact probe atom set;
  2. functional class;
  3. `carbonylUmbrella` as `'yes'` or `'no'`;
  4. exact whole-molecule inventory set, order-insensitive.

  Preserve the raw selected atom order and raw prediction. Return missing/extra atom labels and missing/extra group labels. Do not change selection or predictions.

- [ ] **Step 7: Implement four non-mutating hints**

  - Level 1: direct attention to bond order and immediate neighbours without naming the group.
  - Level 2: state target element counts and highest bond order.
  - Level 3: reveal the first two decision steps for the target definition.
  - Level 4: state the exact target atom labels, class, carbonyl status, and full inventory.

- [ ] **Step 8: Run the full verifier**

  Expected: all twelve scenarios, detector suppression, graph rejection, selection preservation, attempt scoring, and hints pass.

---

### Task 3: Graphical React Functional Group Signal Board

**Files:**
- Create: `src/components/FunctionalGroupLab.jsx`
- Create: `src/styles/functional-groups.css`

**Interfaces:**
- Consumes all Task 1 data, all Task 2 engine exports, `MODEL_PASSPORTS.functionalGroupSignalBoard`, and `SCIENCE_SOURCES`.
- Produces section ID `functionalGroupLab` with local component state only.

- [ ] **Step 1: Build the specimen reel**

  Group the twelve cases visually into oxygen, nitrogen, unsaturation, and halogen channels. Scenario switching resets only this lab’s current probe, predictions, evaluation, and hints. Every card states formula, target mission, and synthetic provenance.

- [ ] **Step 2: Build the atom-socket graph board**

  Draw bonds in SVG with separate lines for order 1, 2, and 3. Render every displayed atom as a 48–58 px HTML button positioned over the bond field. Clicking toggles exactly that atom. Selected sockets and bonds whose endpoints are both selected light cyan. Add keyboard activation, pressed state, atom labels, and explicit diagnostic/implicit-H copy.

- [ ] **Step 3: Build the signal router**

  Before checking, route selected element/bond evidence into sealed gate nodes. After checking, reveal the target definition’s decision steps one gate at a time and terminate at the evidence-supported class cartridge. Wrong selection must remain visible in coral alongside missing/extra atom evidence; do not flash or auto-select the correct motif.

- [ ] **Step 4: Build class, carbonyl, and inventory predictions**

  Render twelve class cartridges, a yes/no carbonyl-umbrella switch, and a twelve-item multi-select inventory. Require all three prediction areas plus at least one selected atom before comparison. Preserve wrong choices after feedback.

- [ ] **Step 5: Build feedback and hints**

  Render four independent verdict cards. Show learner versus evidence, missing/extra atoms or groups, and a connectivity-specific reason. Add four non-mutating hints and a “Clear my probe” action distinct from “Reset specimen.”

- [ ] **Step 6: Build the teacher contrast rail**

  Add guided comparisons:

  - aldehyde versus ketone;
  - carboxylic acid versus ester versus amide;
  - alcohol versus ether;
  - amine versus amide;
  - alkene versus carbonyl double bond.

  Each comparison must state which immediate-neighbour test separates the classes and which broader claim remains unavailable.

- [ ] **Step 7: Add model passport and sources**

  Render conditions, included/excluded claims, frozen-input provenance, engine-local statement, and direct primary-source links. Prominently state: “A structural pattern is evidence for a class label here; it is not a reaction prediction.”

- [ ] **Step 8: Apply the visual system**

  Use:

  - Bakelite marine `#15394a`
  - signal cyan `#36c3d9`
  - oxygen coral `#ef6a65`
  - nitrogen periwinkle `#7585e8`
  - halogen gold `#e7b94d`
  - optical paper `#edf4f3`
  - graphite `#24343e`

  Keep Avenir Next Condensed for display, Avenir/system for body, and SFMono for structural data. Animate only the learner-selected signal trace and gate reveal; disable both under reduced motion.

- [ ] **Step 9: Add responsive/accessibility rules**

  At 768 px stack controls below the graph. At 390 px use a horizontal specimen reel, single-column predictions, 44 px controls, no clipped atom buttons, no document-level overflow, visible focus, and a compact graph viewport that retains readable bonds and labels.

---

### Task 4: App integration, curriculum promotion, numbering, and documentation

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
- Adds lazy anchor `#functionalGroupLab`.
- Adds package script `verify:functional-groups`.

- [ ] **Step 1: Lazy-load after measurement evidence**

  Insert `FunctionalGroupLab` after `MeasurementEvidenceLab` and before biomolecular assembly.

- [ ] **Step 2: Add desktop and mobile navigation**

  Label: `Functional groups`

  Detail: `Probe connectivity and distinguish overlapping motifs`

- [ ] **Step 3: Promote organic curriculum coverage**

  Replace the concept topic with:

  ```js
  {
    name: 'Declared functional-group reasoning',
    status: 'live',
    detail: 'Probe twelve bounded graph patterns, distinguish carbonyl subclasses, and inventory overlapping groups without inferring reactivity.',
  }
  ```

  Add the lab to organic and biochemistry live-lab lists. Update both model boundaries to retain exclusions for arbitrary classification, charged forms, aromatic/ring chemistry, reactivity, products, and biological function.

- [ ] **Step 4: Renumber downstream sections**

  Keep spectroscopy 13 and measurement evidence 14. Assign functional groups 15, biomolecular 16, enzyme 17, mechanism 18, stereochemistry 19, coordination 20, crystal 21, reaction chamber 22, and equation balancer 23.

- [ ] **Step 5: Add script and documentation**

  Update the verifier count from 20 to 21. Document interactions, twelve patterns, suppression rules, source basis, model boundaries, architecture files, and exact verifier command.

---

### Task 5: Deterministic, production, and browser validation

**Files:**
- Modify only when a validation finding requires an in-scope fix.

- [ ] **Step 1: Run the new verifier and all existing verifiers**

  Expected: 21/21 scripts exit zero.

- [ ] **Step 2: Run `npm run build`**

  Record transformed-module count, lazy JS/CSS chunk sizes, and the existing main-chunk advisory separately from failures.

- [ ] **Step 3: Use the board as a student**

  - Select a wrong atom set and wrong class; confirm both remain after check.
  - Correct an aldehyde/ketone comparison manually.
  - Verify acid does not inventory as alcohol, ester as ether, or amide as amine.
  - Exercise both multifunction specimens and preserve a wrong inventory.
  - Request all four hints and verify none changes the probe.
  - Clear the probe and reset a specimen only through explicit actions.

- [ ] **Step 4: Use the board as a teacher**

  - Compare every teacher contrast pair.
  - Verify the broad carbonyl umbrella includes acid derivatives.
  - Verify the UI never calls functional-group recognition a reaction, naming, or property predictor.
  - Inspect source links, model assumptions, implicit/diagnostic-H explanation, and exclusions.

- [ ] **Step 5: Audit responsive/accessibility behavior**

  Check 1440×900, 768×1024, and 390×844 in both initial and checked states. Require zero document overflow, minimum 44 px visible targets, keyboard-visible focus, reduced-motion CSS, graph buttons inside the graph field, and zero browser console warnings/errors.

- [ ] **Step 6: Re-run affected checks after any browser fix**

  Report exact verifier/build/browser evidence and keep the broader university-platform goal active.

## Self-review

- Spec coverage: all twelve group patterns, graph validation, suppression rules, learner-owned probe/predictions, multifunction inventory, carbonyl umbrella, hints, teacher contrasts, sources, passport, curriculum, navigation, documentation, responsive behavior, and student/teacher audits map to explicit tasks.
- Placeholder scan: no TBD, TODO, “similar to,” or unspecified validation step remains.
- Type consistency: all five data exports and five engine exports use identical names across producer, verifier, UI, and integration tasks.
- Deliberate limitation: the milestone fills bounded structural functional-group reasoning. It does not claim universal substructure perception, nomenclature, reaction prediction, or full organic chemistry.
