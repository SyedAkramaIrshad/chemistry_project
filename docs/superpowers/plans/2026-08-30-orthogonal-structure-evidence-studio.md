# Orthogonal Structure Evidence Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a graphical, learner-controlled evidence studio that combines six measured proton-NMR peak lists with an ideal natural-abundance molecular-ion isotope envelope and three same-formula casefiles, without presenting either instrument as universal compound identification.

**Architecture:** Freeze source-attributed NMR peak-list derivatives, NIST isotope constants, mass presets, and three evidence cases in one data module. Keep peak probing, formula convolution, claim evaluation, and hints in one pure immutable engine. Lazy-load one React lab with three persistent instruments—NMR peak-list bench, isotope mass gate, and orthogonal casefile—and isolate all visuals in one CSS file. No remote service is queried at runtime.

**Tech Stack:** React 19, Vite 8, immutable ES modules, SVG, CSS, Node deterministic verifier.

## Global Constraints

- Preserve the learner-owned-state contract: record selection, peak-list release, cursor movement, probe placement, formula changes, mass firing, evidence exposure, claim selection, checking, hints, clearing, and reset are explicit learner actions.
- Never move, remove, relabel, correct, or replace a learner probe or claim automatically.
- Use only the six measured NMRShiftDB records listed below. A CML spectrum must have an `nmrshiftdb...` spectrum ID; predicted outputs without a database ID are rejected.
- Store a compact peak-list derivative, not raw CML, FID, line shape, or a reconstructed measured spectrum.
- Merge source peaks only when their chemical shifts are identical; sum the source `atomRefs` counts for the displayed integration and retain any reported multiplicity.
- Preserve source spectrum ID, molecule ID, solvent, field, temperature, assignment method, access date, and transformation statement.
- Treat source temperatures reported as `0.0 K` as unavailable/sentinel metadata; display the raw source value in provenance but never present it as a physical acquisition temperature.
- State when the observed proton count is smaller than the molecular formula because an exchangeable proton is not reported.
- Keep NMRShiftDB-derived data under its extended ODbL-style data terms in `THIRD_PARTY_DATA.md`; the MIT software license does not relabel third-party data.
- Calculate mass evidence only from the five frozen NIST natural-isotope tables for H, C, O, Cl, and Br.
- Call the mass output an `ideal natural-abundance molecular-ion isotopologue envelope`, not a measured EI spectrum.
- Exclude fragmentation, ionization efficiency, charge-state/adduct inference, instrument response, resolution, exact-formula search, mixtures, library matching, 2D NMR, coupling-constant fitting, raw-data processing, purity, concentration, identity certification, and operating procedure.
- Keep every control at least 44 CSS px high, visible keyboard focus, reduced-motion support, contained horizontal scrolling, and no document-level horizontal overflow at 390, 768, and 1440 CSS px.
- Use `apply_patch` for source edits. Do not perform Git actions.
- Run validation because the standing user goal explicitly requires student/teacher use and verification.

---

## Subject and Visual Contract

**Subject:** An undergraduate student or teacher comparing magnetic-resonance and isotopic-mass evidence inside a compact analytical recording console.

**Single job:** Decide what each evidence channel establishes, what it cannot establish, and why orthogonal evidence can distinguish a declared pair when formula or ideal mass alone cannot.

**Palette:**

- magnet housing `#17202b`
- cobalt chassis `#28384b`
- copper coil `#d97845`
- phosphor amber `#ffc45e`
- resonance cyan `#67d7d1`
- isotope rose `#ee7697`
- evidence paper `#f1eee5`
- instrument silver `#a9b5be`
- closed-ledger green `#5bc69a`

**Type roles:** Existing Avenir Next Condensed/Arial Narrow stack for instrument headlines, the application body stack for teaching copy, and SFMono-Regular/Menlo for ppm axes, m/z registers, source tapes, and evidence buses.

**Layout:**

```text
┌──────────────────── thesis / evidence crossbar ────────────────────┐
│ copper magnet coil ── NMR bus ─┐                                  │
│ isotope flight tube ─ mass bus ├── formula / IR / NMR / mass gate │
└─────────────────────────────────┴──────────────────────────────────┘
┌────────────── instrument switch: NMR | MASS | CASEFILE ────────────┐
└────────────────────────────────────────────────────────────────────┘
┌──── measured NMR cartridge ────┬──── reversed 12.5→0 ppm tape ────┐
│ six records + release action   │ cursor + measured peak sticks     │
│ integration claim + hang tag  │ learner tags remain on the tape   │
└────────────────────────────────┴────────────────────────────────────┘
┌──── isotope formula console ───┬──── acceleration / flight tube ───┐
│ C/H/O/Cl/Br counters + claims  │ ideal M, M+1, M+2… envelope       │
└────────────────────────────────┴────────────────────────────────────┘
┌──── same-formula case folder ──┬──── orthogonal evidence crossbar ─┐
│ two candidate structures       │ formula · IR · NMR · mass · scope │
└────────────────────────────────┴────────────────────────────────────┘
┌──────── teacher contrasts ─────┬──────── learner action tape ──────┐
└────────────────────────────────┴────────────────────────────────────┘
┌────────────────── model + source + data-license passport ──────────┐
└────────────────────────────────────────────────────────────────────┘
```

**Signature:** A copper magnet and isotope flight tube feed two illuminated buses into a physical crossbar. Formula, existing IR evidence, measured NMR peak-list evidence, and calculated mass evidence close independently; the final candidate gate cannot close unless the learner commits every scope claim.

**Design critique:** This avoids the generic dark-dashboard pattern by borrowing the geometry of magnetic tape decks, NMR probe coils, strip-chart recorders, and flight tubes. The aesthetic risk is the animated evidence bus: only the currently released instrument channel glows, while the surrounding ledger paper and chassis remain visually quiet.

---

### Task 1: Freeze measured NMR derivatives, isotope constants, cases, and data terms

**Files:**

- Create: `src/data/orthogonalEvidenceScenarios.js`
- Create: `THIRD_PARTY_DATA.md`
- Modify: `src/data/scienceSources.js`

**Interfaces:**

- Produces `PROTON_NMR_RECORDS`, `PROTON_NMR_RECORD_BY_ID`, `ISOTOPE_COMPOSITIONS`, `MASS_EVIDENCE_PRESETS`, `MASS_EVIDENCE_PRESET_BY_ID`, `ORTHOGONAL_EVIDENCE_CASES`, `ORTHOGONAL_EVIDENCE_CASE_BY_ID`, `NMR_SIGNAL_REGIONS`, and `ORTHOGONAL_EVIDENCE_BOUNDARY`.
- Adds `MODEL_PASSPORTS.orthogonalEvidenceStudio` and source records for IUPAC terms, NMRShiftDB access/licensing, NIST isotope data, and the six record routes.

- [ ] **Step 1: Declare six recursively frozen measured proton-NMR records**

Use these exact source derivatives, accessed 2026-08-30:

| Record | Spectrum ID | Molecule ID | Solvent | Field / MHz | Temperature / K | Merged displayed peaks `ppm:protons:multiplicity` |
|---|---:|---:|---|---:|---:|---|
| 1-propanol | 10012286 | 10008030 | CCl₄ | 60 | source `0.0`, treat unavailable | `0.94:3:?`, `1.49:2:?`, `3.50:2:?`, `3.71:1:?` |
| 2-propanol | 20197100 | 10016625 | CDCl₃ | 300.1 | 297 | `1.22:6:?`, `4.04:1:?`; one exchangeable H unreported |
| propanal | 31266 | 10016745 | CDCl₃ | 60 | 318 | `1.10:3:?`, `2.45:2:?`, `9.70:1:?` |
| acetone | 31270 | 10007820 | CDCl₃ | 60 | 318 | `2.20:6:?` |
| ethyl acetate | 20099202 | 10008694 | unreported | unreported | unreported | `1.20:3:t`, `1.97:3:s`, `4.10:2:q` |
| butanoic acid | 10012285 | 10008029 | CCl₄ | 60 | source `0.0`, treat unavailable | `0.90:3:?`, `1.67:2:?`, `2.29:2:?`, `11.97:1:?` |

Each record must use this shape:

```js
{
  id: 'propanal-1h-nmr',
  code: 'NMR 03',
  name: 'Propanal',
  formula: 'C₃H₆O',
  composition: { C: 3, H: 6, O: 1, Cl: 0, Br: 0 },
  structure: 'CH₃–CH₂–CHO',
  smiles: 'CCC=O',
  spectrumId: 31266,
  moleculeId: 10016745,
  sourceKind: 'measured-peak-list',
  nucleus: '1H',
  solvent: 'Chloroform-D1 (CDCl3)',
  fieldMHz: 60,
  temperatureK: 318,
  assignmentMethod: '1D shift positions',
  observedProtonCount: 6,
  formulaProtonCount: 6,
  unreportedExchangeableProtons: 0,
  peaks: [
    { id: 'propanal-methyl', ppm: 1.1, protonCount: 3, reportedMultiplicity: null },
    { id: 'propanal-methylene', ppm: 2.45, protonCount: 2, reportedMultiplicity: null },
    { id: 'propanal-aldehyde', ppm: 9.7, protonCount: 1, reportedMultiplicity: null },
  ],
  sourceId: 'nmrshiftdb-propanal-1h',
  accessedOn: '2026-08-30',
  transformation: 'Measured source peak list copied as ppm values; identical shifts merged; integration derived only from source atomRefs count; no raw FID or line shape reproduced.',
}
```

The source route for every record is:

```text
https://nmrshiftdb.nmr.uni-koeln.de/NmrshiftdbServlet/nmrshiftdbaction/searchorpredict/smiles/{SMILES}/spectrumtype/1H
```

The verifier must reject any record whose provenance lacks a numeric `spectrumId` because NMRShiftDB documents that measured outputs have IDs and predictions do not.

- [ ] **Step 2: Declare NIST isotope constants**

Use these exact natural-isotope records:

```js
{
  H: [{ massNumber: 1, exactMass: 1.00782503223, abundance: 0.999885 }, { massNumber: 2, exactMass: 2.01410177812, abundance: 0.000115 }],
  C: [{ massNumber: 12, exactMass: 12, abundance: 0.9893 }, { massNumber: 13, exactMass: 13.00335483507, abundance: 0.0107 }],
  O: [{ massNumber: 16, exactMass: 15.99491461957, abundance: 0.99757 }, { massNumber: 17, exactMass: 16.9991317565, abundance: 0.00038 }, { massNumber: 18, exactMass: 17.99915961286, abundance: 0.00205 }],
  Cl: [{ massNumber: 35, exactMass: 34.968852682, abundance: 0.7576 }, { massNumber: 37, exactMass: 36.965902602, abundance: 0.2424 }],
  Br: [{ massNumber: 79, exactMass: 78.9183376, abundance: 0.5069 }, { massNumber: 81, exactMass: 80.9162897, abundance: 0.4931 }],
}
```

Every element array and isotope record is recursively frozen. The major isotope is the first entry and defines nominal `M` and neutral monoisotopic mass.

- [ ] **Step 3: Declare mass presets and three orthogonal cases**

Mass presets:

```js
[
  { id: 'propanol-formula', formula: 'C₃H₈O', composition: { C: 3, H: 8, O: 1, Cl: 0, Br: 0 } },
  { id: 'carbonyl-formula', formula: 'C₃H₆O', composition: { C: 3, H: 6, O: 1, Cl: 0, Br: 0 } },
  { id: 'oxygen-pair-formula', formula: 'C₄H₈O₂', composition: { C: 4, H: 8, O: 2, Cl: 0, Br: 0 } },
  { id: 'chloropropane-formula', formula: 'C₃H₇Cl', composition: { C: 3, H: 7, O: 0, Cl: 1, Br: 0 } },
  { id: 'bromopropane-formula', formula: 'C₃H₇Br', composition: { C: 3, H: 7, O: 0, Cl: 0, Br: 1 } },
]
```

Cases:

```js
[
  {
    id: 'propanol-topology', formula: 'C₃H₈O',
    unknownRecordId: '2-propanol-1h-nmr',
    candidateIds: ['1-propanol-1h-nmr', '2-propanol-1h-nmr'],
    decisiveNmrFeatureId: 'two-signal-symmetry',
    irRole: 'Both candidates are alcohols; the declared O–H class evidence does not decide this pair.',
  },
  {
    id: 'carbonyl-terminus-orthogonal', formula: 'C₃H₆O',
    unknownRecordId: 'propanal-1h-nmr',
    candidateIds: ['propanal-1h-nmr', 'acetone-1h-nmr'],
    decisiveNmrFeatureId: 'aldehydic-high-frequency-signal',
    irRole: 'Existing IR evidence independently supports an aldehydic C–H feature for propanal.',
  },
  {
    id: 'acid-ester-orthogonal', formula: 'C₄H₈O₂',
    unknownRecordId: 'butanoic-acid-1h-nmr',
    candidateIds: ['ethyl-acetate-1h-nmr', 'butanoic-acid-1h-nmr'],
    decisiveNmrFeatureId: 'acid-high-frequency-signal',
    irRole: 'Existing gas-phase IR evidence independently supports O–H evidence for butanoic acid.',
  },
]
```

Every expected case answer is `formulaSufficient: false`, `massDiscriminates: false`, and `identificationScope: 'supports-declared-pair'`.

- [ ] **Step 4: Add data-license and source passports**

`THIRD_PARTY_DATA.md` must state:

- software remains MIT licensed;
- the six derived NMR peak lists remain subject to NMRShiftDB's extended ODbL-style data terms;
- exact spectrum and molecule IDs, source routes, access date, and transformation;
- no raw CML/FID is redistributed;
- NIST isotope facts are attributed to the existing NIST source;
- no NIST mass spectrum or MassBank non-commercial record is copied.

Add source keys for:

- IUPAC chemical shift, spin–spin coupling, mass spectrum, molecular ion, and isotopologue terms;
- NMRShiftDB documentation, automation interface, and licensing notice;
- six NMRShiftDB measured-record routes;
- existing NIST isotopic-composition source;
- ACS undergraduate curriculum.

Passport result kind:

```text
Measured 1H peak-list and calculated ideal-isotope teaching evidence — not raw NMR, measured mass spectrometry, or identity certification
```

---

### Task 2: Implement the pure orthogonal evidence engine with a red-green verifier

**Files:**

- Create: `src/chemistry/orthogonalEvidence.js`
- Create: `scripts/verify-orthogonal-evidence.mjs`
- Modify: `package.json`

**Interfaces:**

- Consumes Task 1 records and boundaries.
- Produces `analyzeProtonRecord`, `createNmrProbeState`, `placeNmrProbe`, `removeNmrProbe`, `evaluateNmrProbes`, `nextNmrProbeHint`, `validateComposition`, `formatComposition`, `calculateIsotopologueEnvelope`, `evaluateMassEvidenceAttempt`, `nextMassEvidenceHint`, `analyzeOrthogonalCase`, `evaluateOrthogonalCaseAttempt`, and `nextOrthogonalCaseHint`.

- [ ] **Step 1: Write the verifier first and prove the red state**

The first verifier import must reference the not-yet-created engine. Run:

```bash
npm run verify:orthogonal-evidence
```

Expected red state:

```text
ERR_MODULE_NOT_FOUND: Cannot find module .../src/chemistry/orthogonalEvidence.js
```

Do not create the engine before capturing this failure.

- [ ] **Step 2: Verify data and provenance invariants**

Assert:

```js
assert.equal(PROTON_NMR_RECORDS.length, 6);
assert.equal(ORTHOGONAL_EVIDENCE_CASES.length, 3);
assert.equal(MASS_EVIDENCE_PRESETS.length, 5);
assert.ok(PROTON_NMR_RECORDS.every((record) => Number.isInteger(record.spectrumId)));
assert.ok(PROTON_NMR_RECORDS.every((record) => record.sourceKind === 'measured-peak-list'));
assert.equal(PROTON_NMR_RECORD_BY_ID['2-propanol-1h-nmr'].observedProtonCount, 7);
assert.equal(PROTON_NMR_RECORD_BY_ID['2-propanol-1h-nmr'].unreportedExchangeableProtons, 1);
assert.deepEqual(PROTON_NMR_RECORD_BY_ID['ethyl-acetate-1h-nmr'].peaks.map((peak) => peak.protonCount), [3, 3, 2]);
assert.ok(Object.isFrozen(PROTON_NMR_RECORD_BY_ID['propanal-1h-nmr'].peaks[0]));
```

- [ ] **Step 3: Implement immutable NMR probing**

Rules:

- ppm must be finite and inside `0–12.5`;
- learner proton count must be an integer `1–12`;
- maximum eight probes;
- reject a new probe within `0.06 ppm` of an existing probe without mutation;
- preserve exact learner ppm and proton count;
- evaluate against the nearest unmatched source peak within `±0.08 ppm`;
- score position and integration separately;
- keep an unmatched probe as a visible wrong observation;
- list every unprobed measured signal;
- never invent a missing exchangeable-proton peak.

Expected focused case:

```js
let state = createNmrProbeState({ recordId: '2-propanol-1h-nmr' });
state = placeNmrProbe(state, { ppm: 1.22, protonCount: 3 }).state;
state = placeNmrProbe(state, { ppm: 4.04, protonCount: 1 }).state;
const audit = evaluateNmrProbes(state);
assert.equal(audit.score.positionCorrect, 2);
assert.equal(audit.score.integrationCorrect, 1);
assert.equal(audit.sourceCoverage.observedProtons, 7);
assert.equal(audit.sourceCoverage.formulaProtons, 8);
```

Provide four non-mutating hints: count measured signals, compare integration ratios, inspect high-frequency evidence, and state the missing-exchangeable boundary.

- [ ] **Step 4: Implement formula validation and isotope convolution**

`validateComposition` accepts only `C`, `H`, `O`, `Cl`, and `Br` integer counts with limits:

```js
{ C: [0, 12], H: [0, 30], O: [0, 8], Cl: [0, 3], Br: [0, 3] }
```

At least one atom is required and total atoms must not exceed 40.

Convolution algorithm:

```js
let distribution = [{ shift: 0, exactMass: 0, probability: 1 }];
for (const [element, count] of Object.entries(composition)) {
  for (let atom = 0; atom < count; atom += 1) {
    distribution = distribution.flatMap((state) => ISOTOPE_COMPOSITIONS[element].map((isotope) => ({
      shift: state.shift + isotope.massNumber - ISOTOPE_COMPOSITIONS[element][0].massNumber,
      exactMass: state.exactMass + isotope.exactMass,
      probability: state.probability * isotope.abundance,
    })));
    distribution = mergeByShift(distribution);
  }
}
```

Merge probabilities by integer nominal shift, retain probability-weighted mean exact neutral mass per shift, discard probabilities below `1e-10`, sort by shift, and normalize intensities to the largest probability.

Verify:

```js
assert.equal(calculateIsotopologueEnvelope({ C: 3, H: 6, O: 1, Cl: 0, Br: 0 }).nominalMass, 58);
assert.equal(calculateIsotopologueEnvelope({ C: 4, H: 8, O: 2, Cl: 0, Br: 0 }).nominalMass, 88);
assert.ok(between(chloropropane.peaks.find((p) => p.shift === 2).relativeIntensity, 30, 36));
assert.ok(between(bromopropane.peaks.find((p) => p.shift === 2).relativeIntensity, 94, 100));
```

`evaluateMassEvidenceAttempt` checks three preserved claims independently:

- nominal `M` integer;
- M+2 fingerprint: `minor`, `one-third`, `near-equal`, or `multi-halogen`;
- identity scope: `formula-can-identify` or `formula-cannot-identify-isomer`.

Provide four non-mutating hints: sum major-isotope mass numbers, inspect +2 isotopes, compare Cl versus Br abundance ratio, and separate formula from connectivity.

- [ ] **Step 5: Implement five-claim orthogonal case evaluation**

Each case evaluation checks:

```js
{
  candidateId,
  formulaSufficient,
  massDiscriminates,
  decisiveNmrFeatureId,
  identificationScope,
}
```

Every dimension returns `learnerValue`, `expectedValue`, `correct`, and one specific reason. A changed claim makes the previous evaluation stale but preserves it. Four case hints progress from formula inventory, to identical ideal mass envelope, to measured NMR feature, to bounded identity scope without changing claims.

- [ ] **Step 6: Run the focused verifier to prove green**

Run:

```bash
npm run verify:orthogonal-evidence
```

Expected output contains exactly these three summary lines:

```text
Six measured 1H NMR peak-list derivatives, five NIST isotope tables, five mass presets, three orthogonal cases, data terms, and boundaries verified.
Immutable NMR probes, exact position/integration scoring, source coverage, missing exchangeable evidence, and four hints verified.
Ideal isotopologue convolution, Cl/Br M+2 fingerprints, three mass claims, five case claims, preserved wrong states, hints, invalid inputs, and recursive immutability verified.
```

---

### Task 3: Build the graphical Orthogonal Structure Evidence Studio

**Files:**

- Create: `src/components/OrthogonalEvidenceLab.jsx`
- Create: `src/styles/orthogonal-evidence.css`

**Interfaces:**

- Consumes Task 1 data, Task 2 engine, and `MODEL_PASSPORTS.orthogonalEvidenceStudio`.
- Produces one lazy React section with `id="orthogonalEvidenceLab"` and no runtime network access.

- [ ] **Step 1: Build the thesis hero and persistent three-instrument switch**

The hero copy is:

```text
One instrument gives a clue. Orthogonal evidence decides how much that clue deserves.
```

The three tabs retain their independent state:

```js
[
  { id: 'nmr', label: 'Proton NMR tape', detail: 'release · probe · integrate' },
  { id: 'mass', label: 'Isotope mass gate', detail: 'compose · fire · compare M+2' },
  { id: 'casefile', label: 'Orthogonal casefile', detail: 'formula · IR · NMR · mass' },
]
```

Changing tabs records one action and runs nothing.

- [ ] **Step 2: Build the measured NMR peak-list bench**

Required surfaces:

- six-record magnetic-tape rail;
- source cartridge with spectrum/molecule IDs and conditions;
- explicit `Release measured peak list` button;
- reversed `12.5 → 0 ppm` SVG tape with measured sticks only;
- clickable cursor plus native range control;
- learner integration selector `1–12 H`;
- `Hang integration tag`, `Remove`, `Audit tags`, `Hint`, and `Clear tags` actions;
- preserved wrong tags and stale audit;
- source coverage ledger that distinguishes observed peak-list protons from formula protons;
- explicit `peak list derivative · not raw FID · no reconstructed line shape` label.

The SVG must use learner ppm tags attached to the exact cursor coordinate. Reported `s`, `t`, or `q` may appear as source text, but unreported multiplicity displays `not reported`; never synthesize J splitting.

- [ ] **Step 3: Build the ideal isotope mass gate**

Required surfaces:

- C/H/O/Cl/Br mechanical counters plus five formula presets;
- explicit `Fire ideal isotope gate` button;
- source chamber → acceleration plates → flight tube → detector tape visual;
- nominal `M` register, neutral monoisotopic mass ledger, and M/M+1/M+2… sticks;
- learner claims for nominal M, M+2 fingerprint, and identity scope;
- `Check mass claims`, `Hint`, and `Clear claims` actions;
- stale run when composition changes;
- exact boundary: calculated natural-abundance envelope, not measured ion abundance or fragmentation.

The formula counters remain editable after a run. The previous envelope stays visible as `PREVIOUS FLIGHT` until the learner fires the changed formula.

- [ ] **Step 4: Build the three orthogonal casefiles**

Each case must include:

- two candidate structures sharing one formula;
- explicit `Release NMR channel` and `Fire mass channel` actions;
- a four-column evidence crossbar for formula, existing IR role, measured NMR, and ideal mass;
- five learner claim groups;
- explicit `Check evidence verdict`, `Hint`, and `Clear claims` actions;
- preserved 0/5 results and stale check after edits;
- identity revealed only after checking;
- source conditions beside NMR evidence and calculated status beside mass evidence.

Case headings:

```text
CASE 01 · Same formula, different symmetry
CASE 02 · Shared carbonyl, different terminus
CASE 03 · Same formula, acid or ester
```

- [ ] **Step 5: Build six teacher contrasts and the evidence passport**

Teacher contrasts:

1. `SIGNAL ≠ PROTON` — one signal may integrate to several equivalent protons.
2. `MISSING ≠ ZERO` — an exchangeable proton may be absent from a source peak list.
3. `FORMULA ≠ GRAPH` — same composition can encode different connectivity.
4. `M+2 ≠ FRAGMENT` — an isotope partner is not an invented cleavage product.
5. `MASS ≠ ISOMER` — an ideal molecular-ion envelope is identical for same-formula isomers.
6. `PAIR ≠ IDENTITY` — orthogonal support inside two candidates is not certification.

Every teacher button loads setup only and records exactly one `teacher` event. It must not release, fire, or check.

The passport displays conditions, includes, excludes, all source links, the NMRShiftDB data notice, NIST isotope attribution, and all model boundaries.

- [ ] **Step 6: Implement the isolated visual system**

CSS requirements:

- dark magnetic chassis and coil hero without page-wide black background;
- copper coil rings and one phosphor evidence bus animation;
- evidence-paper inserts for source and verdict ledgers;
- reversed NMR axis and discrete mass sticks remain readable at all breakpoints;
- desktop grid above 1180 px, two-column tablet grid, one-column phone stack;
- record/case rails use contained horizontal scrolling;
- all controls at least 44 px;
- `:focus-visible` outline in copper;
- `prefers-reduced-motion` removes bus, coil, cursor, and tape transitions.

---

### Task 4: Integrate app composition, navigation, curriculum, numbering, sources, and documentation

**Files:**

- Modify: `src/App.jsx`
- Modify: `src/components/Header.jsx`
- Modify: `src/data/curriculum.js`
- Modify: displayed section labels in downstream components
- Modify: `README.md`

**Interfaces:**

- Adds `#orthogonalEvidenceLab` to application navigation and curriculum links.
- Increases deterministic verifier count from 27 to 28.

- [ ] **Step 1: Lazy-load the studio after infrared evidence**

```jsx
const OrthogonalEvidenceLab = lazy(() => import('./components/OrthogonalEvidenceLab.jsx'));

<Suspense fallback={<LabFallback id="orthogonalEvidenceLab" label="Orthogonal structure evidence studio"/>}>
  <OrthogonalEvidenceLab />
</Suspense>
```

Place it immediately after `InfraredEvidenceLab` and before `MeasurementEvidenceLab`.

- [ ] **Step 2: Add desktop and mobile navigation**

Add one entry after Infrared evidence:

```text
Orthogonal evidence
Read measured 1H peaks and ideal isotope envelopes
```

Both menus close their containing `details` element after selection.

- [ ] **Step 3: Update curriculum claims without erasing remaining gaps**

Add one live topic and lab link to each:

- Organic chemistry: measured proton-equivalence and same-formula NMR evidence.
- Physical chemistry: ideal natural-abundance isotopologue convolution.
- Analytical chemistry: measured ¹H peak-list and orthogonal formula/IR/NMR/mass reasoning.

Replace the analytical next-engine topic with:

```text
2D NMR, measured mass fragmentation, mixtures, and validated identification
```

Its detail must explicitly retain raw spectra/FID, coupling analysis, measured EI/ESI response, fragmentation, exact-mass formula generation, mixtures, quantitative fitting, library search, uncertainty, and validated workflows as future engines.

Expected live-topic count after integration: `95`.

- [ ] **Step 4: Renumber downstream displayed sections**

Keep Infrared evidence as `17`, assign Orthogonal evidence `18`, and shift every existing displayed section from Measurement evidence onward by one. Final displayed sequence ends at:

```text
30 / Equation balancer
```

- [ ] **Step 5: Update README and architecture**

Add:

- capabilities for NMR probing, ideal isotope convolution, and orthogonal cases;
- exact data/source boundaries and `THIRD_PARTY_DATA.md` pointer;
- `npm run verify:orthogonal-evidence` and verifier scope;
- verifier count `28`;
- component, data, engine, CSS, verifier, and third-party-data architecture entries;
- distinction between transformed measured NMR peak lists and calculated ideal mass envelopes;
- explicit exclusion of measured mass fragmentation and universal identification.

---

### Task 5: Student/teacher browser exercise and full validation

**Files:** None unless the browser exercise reveals a reproducible defect.

- [ ] **Step 1: Use the NMR bench as a student**

Release 2-propanol, place `1.22 ppm / 3 H` and `4.04 ppm / 1 H`, audit, and confirm:

- both exact learner tags remain;
- both positions match;
- only one integration matches;
- observed coverage is `7 H` while formula is `8 H`;
- one exchangeable H is explicitly unreported, not automatically added.

Remove only the wrong tag, replace it with `1.22 ppm / 6 H`, and re-audit to close both displayed source peaks.

- [ ] **Step 2: Use the mass gate as a student**

Load C₃H₇Cl, fire explicitly, choose wrong claims `M = 80`, `near-equal`, and `formula can identify`, then check and confirm 0/3 with preserved choices. Correct manually to `M = 78`, `one-third`, and `formula cannot identify isomer`; recheck 3/3.

Load C₃H₇Br and confirm the previous chlorine run remains stale until firing. Fire and verify the M+2 partner is near-equal rather than one-third.

- [ ] **Step 3: Use every orthogonal case as a student**

For each case:

- load without automatic NMR or mass evidence;
- release both channels explicitly;
- choose the wrong candidate and four wrong claims;
- check 0/5 and confirm five separate reasons plus retained selections;
- revise manually;
- confirm the previous check becomes stale;
- recheck 5/5.

- [ ] **Step 4: Use the teacher rail**

Confirm exactly six cards. Load contrasts 2, 4, and 6. Each load must add exactly one `TEACHER` event and no release, fire, or check event. Previous evidence may remain visible only as current or stale learner state.

- [ ] **Step 5: Exercise responsive and accessible behavior**

At 1440×1000, 768×900, and 390×844 verify:

- document and studio scroll widths equal client widths;
- every visible button, input, and select is at least 44 px high;
- record and case rails scroll inside their containers;
- NMR and mass axes stay inside their panels;
- source/data-license links remain contained;
- no Vite error overlay;
- visible focus style exists;
- reduced-motion rule removes instrument transitions.

Reload once and require no current browser error or warning.

- [ ] **Step 6: Run all 28 deterministic verifiers and curriculum checks**

Run every `verify:*` package script and require exit code zero. Then assert:

```js
assert.equal(liveTopics.length, 95);
assert.ok(['organic', 'physical', 'analytical'].every((id) =>
  CURRICULUM_AREAS.find((area) => area.id === id).liveLabs.some((lab) => lab.href === '#orthogonalEvidenceLab')
));
```

- [ ] **Step 7: Run the production build**

Run:

```bash
npm run build
```

Require exit code zero and report the existing or changed chunk-size advisory separately from build success.

## Self-Review

- Spec coverage: measured NMR provenance, source metadata, integration probing, exchangeable-proton boundary, natural-isotope convolution, same-formula non-discrimination, orthogonal cases, teacher use, open-data terms, responsiveness, and validation each have an explicit task.
- Placeholder scan: the plan contains no deferred implementation markers or unspecified error handling.
- Type consistency: record IDs, composition keys, spectrum/molecule IDs, probe state, mass-run state, five case claims, source passport key, anchor, and verifier command are named consistently across tasks.
- Scope discipline: the implementation rejects prediction-only NMR output and non-commercial/restricted mass spectra. It does not silently substitute synthetic EI fragmentation for unavailable redistributable measurements.
