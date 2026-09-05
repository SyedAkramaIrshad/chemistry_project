# Infrared Evidence Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a graphical, learner-controlled infrared evidence studio that uses six attributable NIST gas-phase records to teach band assignment and bounded isomer discrimination without claiming arbitrary spectrum prediction or compound identification.

**Architecture:** Freeze transformed teaching traces and their provenance in one data module, keep all scientific mutation and evaluation in one pure engine, and lazy-load one React lab plus isolated CSS. The UI has two instruments sharing the same records: a known-reference scanning bay and a three-case same-formula isomer desk. No remote service is queried at runtime.

**Tech Stack:** React 19, Vite 8, immutable ES modules, SVG, CSS, Node deterministic verifier.

## Global Constraints

- Preserve the learner-owned-state contract: reveal, probe placement, candidate choice, audit, hint, clear, and reset are explicit learner actions.
- Never move, remove, relabel, or correct a learner probe or claim automatically.
- Use only the six downloaded NIST Chemistry WebBook gas-phase IR records listed below; do not embed SDBS data or NIST view-only mass spectra.
- Store a modified teaching derivative, not raw JCAMP: convert transmittance to absorbance when needed, take the maximum absorbance in each 20 cm⁻¹ bin, and normalize each record to its own maximum.
- Keep the original wavenumber range, phase, Y representation, owner, origin, source URL, CAS number, InChIKey, and transformation statement visible.
- State that normalized intensity is not molar absorptivity and cannot be compared quantitatively between records.
- State that gas-phase O–H appearance is not a transferable liquid-phase broad-band rule.
- Exclude proton/carbon NMR, mass spectra, Raman, quantitative absorptivity, arbitrary spectrum prediction, mixture deconvolution, purity, concentration, identity certification, and operating procedure.
- Keep every control at least 44 CSS px high, visible keyboard focus, reduced-motion support, contained horizontal scrolling, and no document-level horizontal overflow at 390, 768, and 1440 CSS px.
- Use `apply_patch` for source edits. Do not perform Git actions.
- Run validation only after implementation because the user explicitly requested validation for this project.

---

## Subject and Visual Contract

**Subject:** A university student or teacher reading gas-phase IR evidence on a compact optical bench.

**Single job:** Move from a measured trace to a defensible, bounded structural claim while keeping formula, phase, band position, intensity, and identity scope separate.

**Palette:**

- smoked optical housing `#24252e`
- spectrometer plum `#403148`
- tungsten beam `#ffb34f`
- copper reticle `#d76e42`
- photographic film `#f2ead8`
- detector mint `#78d2af`
- spectral violet `#816db0`
- graphite ink `#29333a`

**Type roles:** Existing Avenir Next Condensed/Arial Narrow stack for instrument headlines, the application body stack for teaching copy, and SFMono-Regular/Menlo for axes, source tickets, and ledgers.

**Layout:**

```text
┌────────────────────────── thesis hero ───────────────────────────┐
│ light source → gas cell → moving slit → detector / chart drum   │
└──────────────────────────────────────────────────────────────────┘
┌──────── reference bay ────────┬──────── developed film ─────────┐
│ six records + expose action   │ reversed axis + scan reticle    │
│ cursor + label + place probe  │ learner pins + local readout    │
└───────────────────────────────┴──────────────────────────────────┘
┌──────────── assignment audit / preserved probes ────────────────┐
└──────────────────────────────────────────────────────────────────┘
┌──────── isomer casefile ──────┬──────── four claim locks ───────┐
│ formula + two candidates      │ identity/evidence/phase/scope   │
└───────────────────────────────┴──────────────────────────────────┘
┌──────── teacher contrasts ────┬──────── action register ────────┐
└───────────────────────────────┴──────────────────────────────────┘
┌──────────────── model + source passport ────────────────────────┐
└──────────────────────────────────────────────────────────────────┘
```

**Signature:** A physical scan reticle crosses the reversed 4000→450 cm⁻¹ film and illuminates the matching region on a lamp–cell–slit–detector beamline. Probe tags hang from the exact learner-selected wavenumber instead of appearing as detached cards.

**Design critique:** The palette avoids the cream/serif/terracotta landing-page default by using cream only as literal photographic film inside a dark optical instrument. The one aesthetic risk is the moving copper reticle; other surfaces remain quiet so the trace and the learner’s tags carry the visual hierarchy.

---

### Task 1: Freeze transformed NIST records and source boundaries

**Files:**

- Create: `src/data/infraredScenarios.js`
- Modify: `src/data/scienceSources.js`

**Interfaces:**

- Produces `INFRARED_BAND_LABELS`, `INFRARED_RECORDS`, `INFRARED_RECORD_BY_ID`, `INFRARED_CASES`, `INFRARED_CASE_BY_ID`, and `INFRARED_MODEL_BOUNDARY`.
- Adds `MODEL_PASSPORTS.infraredEvidenceStudio` and ten source records.

- [ ] **Step 1: Derive each trace from the temporary JCAMP record**

Use this exact transformation for each file:

```js
function deriveTrace(jcampText) {
  const headers = Object.fromEntries(
    [...jcampText.matchAll(/^##([^=]+)=(.*)$/gm)]
      .map((match) => [match[1].trim(), match[2].trim()]),
  );
  const deltaX = Number(headers.DELTAX);
  const yFactor = Number(headers.YFACTOR || 1);
  const rows = jcampText
    .slice(jcampText.indexOf('\n', jcampText.indexOf('##XYDATA')) + 1)
    .split(/\n/)
    .filter((line) => line && !line.startsWith('##') && !line.startsWith('$$'));
  const points = [];
  for (const row of rows) {
    const values = row.trim().split(/\s+/).map(Number);
    const x0 = values.shift();
    values.forEach((value, index) => {
      const representedY = value * yFactor;
      const absorbance = headers.YUNITS.toUpperCase().includes('TRANSMITTANCE')
        ? -Math.log10(Math.max(representedY, 1e-6))
        : representedY;
      points.push({ wavenumberCmInv: x0 + index * deltaX, absorbance });
    });
  }
  const firstBin = Math.ceil(Number(headers.FIRSTX) / 20) * 20;
  const lastBin = Math.floor(Number(headers.LASTX) / 20) * 20;
  const bins = [];
  for (let centre = firstBin; centre <= lastBin; centre += 20) {
    const members = points.filter((point) => Math.abs(point.wavenumberCmInv - centre) <= 10);
    bins.push({ wavenumberCmInv: centre, absorbance: Math.max(...members.map((point) => point.absorbance), 0) });
  }
  const maximum = Math.max(...bins.map((point) => point.absorbance));
  return bins.map((point) => [point.wavenumberCmInv, Number((point.absorbance / maximum).toFixed(5))]);
}
```

Expected transformed record anchors:

| Record | State | Original Y | Characteristic anchors before normalization |
|---|---|---|---|
| ethanol | gas | absorbance | 3674 cm⁻¹ O–H; 2978 cm⁻¹ C–H; 1066 cm⁻¹ C–O |
| dimethyl ether | gas | absorbance | no O–H anchor; 2890 cm⁻¹ C–H; 1178 cm⁻¹ C–O–C |
| propanal | gas mixture stated by source | transmittance | 2719 cm⁻¹ aldehydic C–H; 1745 cm⁻¹ C=O |
| acetone | gas | absorbance | 1738 cm⁻¹ C=O; no aldehydic C–H anchor |
| ethyl acetate | gas | absorbance | 1770 cm⁻¹ C=O; 1238 and 1054 cm⁻¹ C–O |
| butanoic acid | gas | absorbance | 3578 cm⁻¹ O–H; 1782 cm⁻¹ C=O; 1150 cm⁻¹ C–O |

- [ ] **Step 2: Declare recursively frozen records**

Each record must use this exact shape:

```js
{
  id: 'ethanol-gas-ir',
  name: 'Ethanol',
  formula: 'C₂H₆O',
  cas: '64-17-5',
  inchiKey: 'LFQSCWFLJHTTHZ-UHFFFAOYSA-N',
  state: 'gas',
  originalYRepresentation: 'absorbance',
  sourceOwner: 'NIST Standard Reference Data Program',
  sourceOrigin: 'Sadtler Research Labs Under US-EPA Contract',
  sourceId: 'nist-webbook-ethanol-ir',
  sourceIndex: 0,
  sourceUrl: 'https://webbook.nist.gov/cgi/cbook.cgi?ID=C64175&Index=0&Type=IR-SPEC',
  sourceRangeCmInv: [450, 3966],
  transformation: 'Converted to absorbance when required; maximum absorbance per 20 cm⁻¹ bin; normalized to this record maximum on 2026-08-30.',
  trace: [[460, 0.0133]],
  expectedFeatures: [{ id: 'ethanol-oh', labelId: 'oh-stretch', centreCmInv: 3674, toleranceCmInv: 45 }],
}
```

The actual `trace` contains every derived bin, not the one illustrative pair above.

- [ ] **Step 3: Declare three isomer cases**

```js
[
  { id: 'oxygen-linkage', formula: 'C₂H₆O', unknownRecordId: 'ethanol-gas-ir', candidateIds: ['ethanol-gas-ir', 'dimethyl-ether-gas-ir'], decisiveLabelId: 'oh-stretch' },
  { id: 'carbonyl-terminus', formula: 'C₃H₆O', unknownRecordId: 'propanal-gas-ir', candidateIds: ['propanal-gas-ir', 'acetone-gas-ir'], decisiveLabelId: 'aldehydic-c-h' },
  { id: 'acid-or-ester', formula: 'C₄H₈O₂', unknownRecordId: 'butanoic-acid-gas-ir', candidateIds: ['ethyl-acetate-gas-ir', 'butanoic-acid-gas-ir'], decisiveLabelId: 'oh-stretch' },
]
```

- [ ] **Step 4: Add source registry and passport records**

Add one NIST WebBook source per compound, plus:

- NIST Chemistry WebBook guide
- NIST copyright/fair-use/licensing statement
- IUPAC 2021 analytical spectroscopy glossary
- ACS undergraduate curriculum

The passport result kind must be `Transformed measured-reference teaching evidence — not quantitative absorptivity, prediction, or compound certification`.

---

### Task 2: Implement the pure infrared evidence engine

**Files:**

- Create: `src/chemistry/infraredEvidence.js`
- Create: `scripts/verify-infrared-evidence.mjs`
- Modify: `package.json`

**Interfaces:**

- Consumes the Task 1 constants.
- Produces `analyzeInfraredRecord`, `createProbeState`, `placeInfraredProbe`, `removeInfraredProbe`, `evaluateProbeAssignments`, `nextInfraredProbeHint`, `analyzeInfraredCase`, `evaluateInfraredCaseAttempt`, and `nextInfraredCaseHint`.

- [ ] **Step 1: Write the verifier for record and transformation invariants**

Assert:

```js
assert.equal(INFRARED_RECORDS.length, 6);
assert.equal(INFRARED_CASES.length, 3);
assert.ok(INFRARED_RECORDS.every((record) => Object.isFrozen(record)));
assert.ok(INFRARED_RECORDS.every((record) => record.trace.every(([x, y]) => Number.isFinite(x) && y >= 0 && y <= 1)));
assert.ok(INFRARED_RECORDS.every((record) => record.trace.every((point, index, trace) => index === 0 || point[0] - trace[index - 1][0] === 20)));
assert.equal(INFRARED_RECORD_BY_ID['ethanol-gas-ir'].expectedFeatures.find((item) => item.labelId === 'oh-stretch').centreCmInv, 3674);
assert.equal(INFRARED_RECORD_BY_ID['propanal-gas-ir'].originalYRepresentation, 'transmittance');
```

- [ ] **Step 2: Implement immutable probe mutation**

Rules:

- Cursor must be finite and inside the selected record range.
- A probe contains learner-selected exact wavenumber and label.
- At most six probes.
- A new probe within 12 cm⁻¹ of an existing probe is rejected without changing state.
- Removing an unknown probe ID is rejected without changing state.
- No operation snaps the learner’s position to a reference centre.

- [ ] **Step 3: Implement per-probe evaluation**

A probe is correct only when its label matches one expected feature and its wavenumber lies within that feature tolerance. Return one dimension per probe with learner value, nearest expected feature, signed offset, correctness, and an explanatory reason. Unmatched expected features remain separate `missingFeatures`; they do not create or move learner probes.

- [ ] **Step 4: Implement case analysis and four-claim evaluation**

The four required case claims are:

```js
{
  candidateId: 'ethanol-gas-ir',
  formulaSufficient: false,
  decisiveLabelId: 'oh-stretch',
  identificationScope: 'supports-declared-candidate-only',
}
```

Evaluate each dimension independently and preserve all supplied values. The phase reason must state that the selected gas-phase appearance cannot be generalized to condensed-phase band shape.

- [ ] **Step 5: Implement four non-mutating hints for each instrument**

Probe hints progress through axis direction, local maximum, label family, and expected tolerance. Case hints progress through formula limitation, decisive region, pair comparison, and scope. Assert state deep equality before and after every hint.

- [ ] **Step 6: Run the focused verifier**

Run:

```bash
npm run verify:infrared-evidence
```

Expected: six records, three cases, trace invariants, exact learner-state preservation, four-dimensional case evaluation, hints, invalid inputs, and recursive immutability all pass.

---

### Task 3: Build the graphical optical bench

**Files:**

- Create: `src/components/InfraredEvidenceLab.jsx`
- Create: `src/styles/infrared-evidence.css`
- Modify: `src/App.jsx`

**Interfaces:**

- Lazy component ID: `infraredEvidenceLab`.
- Section title: `Infrared evidence studio`.
- Internal modes: `reference` and `casefile`.

- [ ] **Step 1: Build the thesis hero and instrument switch**

Hero thesis:

```text
A spectrum is evidence in coordinates. Point to the band before you name the structure.
```

The hero graphic is a lamp, gas cell, moving slit, detector, and rolling film. The two mode buttons are `Reference bay` and `Isomer casefile`.

- [ ] **Step 2: Build the reference bay**

Include:

- six-record horizontal rail
- explicit `Develop reference film` action
- sealed empty film before development
- reversed 4000→450 cm⁻¹ SVG axis
- source-range boundary when a record ends below 4000 cm⁻¹
- cursor slider and clickable SVG cursor placement
- live local normalized-intensity readout after development
- label selector and `Hang probe at cursor` action
- probe tags at exact learner coordinates
- explicit `Audit probe tags` action
- stale snapshot marker when record or probes change
- four retained hint levels

- [ ] **Step 3: Build the isomer casefile**

Include three case folders, the shared formula, two structural formulas/names, explicit `Expose unknown film`, four claim groups, `Check casefile`, four retained reasons, and a stale snapshot marker after any change. Formula must be visually routed to both candidates to show why it cannot decide connectivity.

- [ ] **Step 4: Build teacher and provenance surfaces**

Six teacher contrasts:

1. same formula ≠ same structure
2. O–H position ≠ universal band shape
3. missing selected band ≠ proof of universal absence
4. normalized intensity ≠ molar absorptivity
5. pair discrimination ≠ compound certification
6. reference record ≠ learner sample

Each `Load instrument` button changes only the record/case and mode; it never develops a film or checks an answer.

- [ ] **Step 5: Implement the optical visual system**

Derive every component color from the visual contract. The moving reticle is the only animated signature. Respect `prefers-reduced-motion: reduce`; in that mode, reticle movement is immediate and no beam pulse runs.

- [ ] **Step 6: Insert the lazy lab after UV–Vis spectroscopy**

`src/App.jsx` must lazy-import the component and render it after `SpectroscopyLab` and before `MeasurementEvidenceLab`.

---

### Task 4: Integrate the university map and project documentation

**Files:**

- Modify: `src/components/Header.jsx`
- Modify: `src/data/curriculum.js`
- Modify: section labels in downstream component files
- Modify: `README.md`

- [ ] **Step 1: Add desktop and mobile navigation**

Add `Infrared evidence studio` linking to `#infraredEvidenceLab` with copy `Scan measured gas-phase records and defend an isomer choice`.

- [ ] **Step 2: Update curriculum claims**

Add one live Organic topic and one live Analytical topic, increasing live clusters from 90 to 92. Keep an Analytical `next-engine` topic for NMR, mass spectra, mixtures, and orthogonal identity workflows.

- [ ] **Step 3: Renumber the displayed lab sequence**

Keep sections 01–16 unchanged, insert IR as 17, then shift:

```text
Measurement 18 · Chromatography 19 · Functional groups 20 · Biomolecular 21
Enzyme 22 · Mechanism 23 · Stereochemistry 24 · Coordination 25
Crystal 26 · Polymer 27 · Reaction 28 · Equation 29
```

- [ ] **Step 4: Update README**

Document the two instruments, six records, transformation, exclusions, architecture files, command `npm run verify:infrared-evidence`, and verifier count 27.

---

### Task 5: Student/teacher browser exercise and full validation

**Files:** None unless the browser exercise exposes a reproducible defect.

- [ ] **Step 1: Use the reference bay as a student**

Develop ethanol, place one wrong carbonyl probe and one correct O–H probe, audit, and confirm both exact tags remain. Correct only by explicit remove/re-place actions. Confirm the formula, source phase, transformation, and intensity boundary remain visible.

- [ ] **Step 2: Use each isomer case as a student**

For each case, choose the wrong candidate and three wrong claims, check, confirm four separate reasons and retained selections, revise manually, and recheck.

- [ ] **Step 3: Use the teacher rail**

Load the second, fourth, and sixth contrasts. Confirm exactly six cards and no automatic film development or answer evaluation.

- [ ] **Step 4: Exercise responsive and accessible behavior**

At 1440×1000, 768×900, and 390×844 verify:

- document scroll width equals document client width
- every visible button, input, and select is at least 44 px high
- record rails and source tables scroll within their own containers
- no Vite error overlay
- visible focus rule exists
- reduced-motion rule removes reticle transitions

- [ ] **Step 5: Run all 27 deterministic verifiers**

Run every `verify:*` package script and require exit code zero.

- [ ] **Step 6: Run the production build**

Run:

```bash
npm run build
```

Require exit code zero and report any advisory separately from success.

## Self-Review

- Spec coverage: source licensing, transformed measured records, learner-owned probes, same-formula casefiles, phase/intensity/identity boundaries, teacher use, open-source attribution, responsiveness, and validation each have an explicit task.
- Placeholder scan: the plan contains no deferred implementation markers or unspecified error-handling steps.
- Type consistency: record IDs, case IDs, exported maps, probe state, four case claims, component anchor, source passport key, and verifier command are named consistently across all tasks.
- Scope discipline: NMR and mass-spectral data were deliberately excluded because the inspected sources did not provide a reproducible, redistribution-safe path for this milestone. The UI must say so plainly rather than simulate those data.
