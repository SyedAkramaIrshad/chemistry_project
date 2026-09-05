# Measured GC-EI Evidence Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a graphical, learner-controlled GC-EI evidence studio built from six redistribution-safe measured MassBank records, where students distinguish formula, derivatized measurement species, nominal m/z, base peak, molecular-ion evidence, retention evidence, bounded candidate support, and an explicitly synthetic two-reference blend.

**Architecture:** Freeze six compact CC BY peak-list adaptations in a data-only module, keep casefiles and teaching boundaries in a separate scenario module, and implement all cursor, tag, case, and blend logic in one pure immutable engine. Lazy-load one React lab with three persistent instruments—Run Card, Six-Way Lineup, and Blend Spool—and isolate its visual language in one CSS file. No runtime chemistry service, search, model, or database call is used.

**Tech Stack:** React 19, Vite 8, native SVG, CSS, ECMAScript modules, Node deterministic verifier.

## Global Constraints

- Do not perform Git actions.
- Add no dependency, backend, runtime remote call, model call, paid endpoint, or hazardous procedure.
- Every learner action is explicit; wrong predictions and tags remain visible after checking.
- Impossible actions preserve the original state object and return a specific reason.
- Never identify a compound automatically, assign an unreported fragment formula, or convert a bounded candidate result into identity, purity, or concentration certification.
- Preserve the exact MassBank record-level license label `CC BY`; do not relabel third-party record adaptations as MIT.
- Preserve source disagreements or unavailable metadata as unavailable; never silently repair a source record.
- Use `apply_patch` for project edits.
- Focused and whole-project validation are authorized by the active goal, but no Git checks are authorized.

---

## Source Decision and Scientific Boundary

### Rejected sources

- NIST Chemistry WebBook EI records are not copied because selected record pages explicitly state that their spectra cannot be downloaded due to licensing restrictions.
- The six obvious small-molecule EI-B MassBank records used by the existing IR/NMR teaching pairs are not copied because their record-level license is `CC BY-NC-SA`.
- The first GL Sciences candidate set is not used because its records are `CC BY-SA`, and one otherwise attractive pair contains a structured derivative-count disagreement.

### Selected source set

MassBank API dataset version `2025.10`, timestamp `2025-10-24T10:33:06Z`, accessed `2026-08-30`, contains six `CC BY` RIKEN/MSSJ records with all of these shared properties:

- neutral formula `C4H9NO2` and exact neutral mass `103.0633285`;
- structured derivative formula `C10H25NO2Si2` and derivative exact mass `247.14238`;
- structured derivative type `2TMS`;
- instrument type `GC-EI-TOF`, positive-ion MS, source title `70 V`;
- JMS-T100GCV coupled to Agilent 7890A GC;
- helium at 1 mL/min, DB-5MS UI column, 250 C injection;
- one declared GC oven program and record-specific total retention time.

The six accessions are:

| Local id | Compound | Condensed connectivity | MassBank accession | tR | Source peaks | Base peak | m/z 247 source peak |
|---|---|---|---|---:|---:|---:|---:|
| `alpha-linear` | (2S)-2-Aminobutanoic acid | CH3CH2CH(NH2)CO2H | `MSBNK-MSSJ-MSJ02336` | 7.26 min | 104 | 130 | not reported |
| `alpha-branched` | 2-Aminoisobutyric acid | (CH3)2C(NH2)CO2H | `MSBNK-MSSJ-MSJ02340` | 7.05 min | 70 | 130 | not reported |
| `alpha-n-methyl` | N-Methyl-L-alanine | CH3CH(NHCH3)CO2H | `MSBNK-MSSJ-MSJ02354` | 7.24 min | 83 | 130 | 0.1% |
| `beta-linear` | 3-Aminobutanoic acid | CH3CH(NH2)CH2CO2H | `MSBNK-MSSJ-MSJ02358` | 7.52 min | 114 | 116 | 0.5% |
| `beta-branched` | 3-Aminoisobutyric acid | H2NCH2CH(CH3)CO2H | `MSBNK-MSSJ-MSJ02362` | 7.52 min | 92 | 102 | not reported |
| `beta-n-methyl` | N-Methyl-beta-alanine | CH3NHCH2CH2CO2H | `MSBNK-MSSJ-MSJ02368` | 7.77 min | 95 | 116 | 0.5% |

### Frozen transformation

For each selected source record:

1. Round each source m/z coordinate to the nearest integer.
2. If multiple source points enter one nominal bin, retain the point with greatest source relative intensity.
3. Restrict the teaching window to nominal m/z 40 through 250; the UI must not imply that this is the source instrument's complete acquisition range.
4. Retain bins with MassBank `rel >= 10`, approximately 1% of the source base peak.
5. Also retain nominal m/z 247 when the source record reports it, even below the 1% display threshold.
6. Convert MassBank's 0–999 relative scale to percent with `round1(rel / 9.99)`; the source base peak becomes exactly 100.0%.
7. Do not interpolate, smooth, baseline-correct, assign fragment formulae, or invent a missing molecular-ion peak.

The interface must call the result a **compact nominal-m/z adaptation of a measured reference record**, not a raw spectrum.

### Included concepts

- measured positive-ion GC-EI-TOF stick evidence;
- mass spectrum, electron ionization, m/z, base peak, relative intensity, fragment ion, molecular ion, nominal mass, and total retention time terminology;
- exact source title, conditions, attribution, SPLASH, accession, and record-level license;
- neutral parent formula versus source-declared 2TMS derivative formula;
- source-present, weak, or source-unreported nominal molecular-ion coordinate;
- six-candidate same-formula comparison and three bounded two-candidate casefiles;
- explicitly synthetic arithmetic superposition of two normalized reference adaptations.

### Excluded concepts

- raw MassBank record redistribution or a complete spectral library;
- automatic fragment formula/structure assignment or mechanistic rearrangement prediction;
- accurate-mass formula inference, isotope fine structure, uncertainty, resolution, or calibration;
- CI, ESI, APCI, MALDI, adducts, multiple charge, MS/MS, product-ion interpretation, or library similarity scores;
- arbitrary spectrum prediction or unknown search;
- real mixture spectra, response factors, concentration, amount fraction, deconvolution, coelution, matrix effects, or quantitation;
- identity, purity, contaminant exclusion, method validation, sample preparation, instrument operation, or chemical handling.

---

## Interaction Contract

### Run Card

- Learner selects one of six source cartridges, then explicitly releases the measured adaptation.
- Selecting another cartridge leaves the previous released run visible and labels it stale until the learner releases again.
- Cursor spans integer m/z 40–250 and never snaps automatically.
- Learner can attach at most six tags with roles `base-peak`, `molecular-ion-candidate`, `pair-contrast`, `shared-coordinate`, or `observation`.
- Tags can be wrong and can be attached where no retained source peak exists.
- Exact duplicate `(m/z, role)` tags and a seventh tag are blocked with reasons and the original state reference.
- `observation` is reported but unscored; no fragment identity is invented.

### Six-Way Lineup

Three casefiles partition the six records:

```js
[
  {
    id: 'alpha-branch-case',
    candidates: ['alpha-linear', 'alpha-branched'],
    targetRecordId: 'alpha-branched',
    contrastMz: 114,
    sharedMz: 130,
    expectedBaseRelation: 'same',
  },
  {
    id: 'beta-branch-case',
    candidates: ['beta-linear', 'beta-branched'],
    targetRecordId: 'beta-branched',
    contrastMz: 102,
    sharedMz: 73,
    expectedBaseRelation: 'different',
  },
  {
    id: 'n-methyl-position-case',
    candidates: ['alpha-n-methyl', 'beta-n-methyl'],
    targetRecordId: 'beta-n-methyl',
    contrastMz: 116,
    sharedMz: 73,
    expectedBaseRelation: 'different',
  },
]
```

Learner independently predicts:

- whether neutral formula alone distinguishes the candidates (`false`);
- whether the measured species is the neutral parent or source-declared 2TMS derivative (`2tms-derivative`);
- whether the candidates share a base-peak m/z (`same` or `different` per case);
- which declared candidate supports the target run;
- which nominal coordinate is the declared pair contrast;
- whether the result certifies identity, proves purity, or only supports the declared case (`supports-declared-case`).

### Blend Spool

- Learner selects one declared case and a 10–90 integer display coefficient for the left record; right coefficient is `100 - left`.
- `weightedIntensity(m) = wLeft * ILeft(m) + wRight * IRight(m)` using coefficients divided by 100.
- Display sticks are normalized once more so the largest composite stick is 100; both pre-normalization and display values remain in the returned ledger.
- Learner chooses an m/z and predicts `left-only`, `right-only`, `shared`, or `neither` **at the compact-record threshold**.
- Learner must reject both `weights are composition` and `composite proves two compounds`.
- Output is labelled synthetic arithmetic over normalized references, never a measured mixture.

---

## Visual Direction

### Subject, audience, and single job

- Subject: a historical-meets-modern GC-MS evidence bench.
- Audience: university learners who know formulae but do not yet separate source conditions, derivatized species, and peak evidence.
- Single job: make a defensible claim from one measured coordinate without turning the chart into an automatic identifier.

### Palette

- `Cold enamel` — `#DCE7E8`
- `Chart paper` — `#F7F3E8`
- `Carbon` — `#17272D`
- `Cobalt ribbon` — `#2155A5`
- `Signal vermilion` — `#D94A32`
- `Lamp amber` — `#E3A629`

### Type

- Display: `"Avenir Next Condensed", "Arial Narrow", sans-serif` for instrument headings.
- Body: `"Avenir Next", system-ui, sans-serif` for learner instructions.
- Data: `SFMono-Regular, Menlo, monospace` for m/z, intensity, source IDs, and conditions.

### Layout

```text
┌────────────── thesis copy ─────────────┬─ GC coil → EI stamp → fan-fold printer ─┐
├──────── Run Card ─────── Six-Way Lineup ─────── Blend Spool ──────────────────────┤
├──────────────────────── six source cartridges, horizontally scrollable ───────────┤
├──────── perforated spectrum paper + red read-head ───────────┬─ source console ───┤
├──────────────── clip-on learner tags ─────────────────────────┼─ audit board ──────┤
├──────────────────────────── teacher rack ──────────────────────┼─ action tape ──────┤
└────────────────────────────── model, source, and data passport ────────────────────┘
```

### Signature and motion

- Signature: the spectrum is physical fan-fold chart paper with perforated edges, a vermilion mechanical read-head, and learner tags clipped to exact sticks.
- One orchestrated motion: releasing a run advances the paper once and raises the retained sticks. No ambient looping animation.
- `prefers-reduced-motion: reduce` removes paper feed, stick rise, hover lift, and tag swing.

### Design self-critique

- The direction avoids the generic near-black neon dashboard, warm-cream editorial page, and broadsheet template.
- The central paper field is warm only because spectrum recorders use chart paper; the product shell stays cool enamel.
- Numbering is reserved for the real page section sequence, not decorative mode numbers.
- The existing orthogonal studio already uses a magnet and flight tube, so this lab uses a GC coil and mechanical printer instead.
- Rounded floating cards and decorative pills are minimized; controls read as labelled instrument bays and switches.

---

## File Structure

### Create

- `src/data/measuredEiSpectra.js` — data-only compact MassBank record adaptations and exact provenance notice.
- `src/data/measuredEiScenarios.js` — casefiles, roles, teacher contrasts, and scientific boundaries.
- `src/chemistry/measuredEiEvidence.js` — pure validation, cursor, tag, case, blend, evaluation, and hint engine.
- `scripts/verify-measured-ei-evidence.mjs` — focused deterministic verifier.
- `src/components/MeasuredEiEvidenceLab.jsx` — all three learner instruments, teacher rail, trace, and passport.
- `src/styles/measured-ei-evidence.css` — isolated visual system and responsive/accessibility behavior.

### Modify

- `src/data/scienceSources.js` — IUPAC/MassBank sources plus `MODEL_PASSPORTS.measuredEiEvidenceStudio`.
- `THIRD_PARTY_DATA.md` — exact six-record CC BY attribution and transformation.
- `src/data/curriculum.js` — Organic, Physical, and Analytical live clusters, labs, outcomes, and narrowed gap.
- `src/components/CurriculumAtlas.jsx` — structural live-topic expectation from 103 to 106.
- `src/App.jsx` — lazy import and insertion after `OrthogonalEvidenceLab`.
- `src/components/Header.jsx` — desktop and mobile menu links.
- `src/components/MeasurementEvidenceLab.jsx` — section 20 to 21.
- `src/components/ChromatographyLab.jsx` — section 21 to 22.
- `src/components/FunctionalGroupLab.jsx` — section 22 to 23.
- `src/components/BiomolecularStudio.jsx` — section 23 to 24.
- `src/components/EnzymeKineticsLab.jsx` — section 24 to 25.
- `src/components/MechanismLab.jsx` — section 25 to 26.
- `src/components/StereochemistryLab.jsx` — section 26 to 27.
- `src/components/StereochemicalReactionLab.jsx` — section 27 to 28.
- `src/components/CoordinationFieldLab.jsx` — section 28 to 29.
- `src/components/CrystalLatticeLab.jsx` — section 29 to 30.
- `src/components/ElectronicBandLab.jsx` — section 30 to 31.
- `src/components/PolymerPopulationLab.jsx` — section 31 to 32.
- `src/components/ReactionLab.jsx` — section 32 to 33.
- `src/components/EquationSections.jsx` — section 33 to 34.
- `package.json` — `verify:measured-ei-evidence`.
- `README.md` — feature, source, transformation, boundary, file map, and verifier documentation.
- `CONTRIBUTING.md` — focused command and manual learner/teacher checks.
- `docs/CURRENT_PROGRESS.md` — compaction-safe final milestone evidence.

---

### Task 1: Freeze the six compact CC BY records and prove the data contract

**Files:**
- Create: `scripts/verify-measured-ei-evidence.mjs`
- Create: `src/data/measuredEiSpectra.js`
- Create: `src/data/measuredEiScenarios.js`
- Modify: `package.json`

**Interfaces:**
- Produces: `MEASURED_EI_RECORDS`, `MEASURED_EI_RECORD_BY_ID`, `MEASURED_EI_DATA_NOTICE`.
- Produces: `EI_EVIDENCE_CASES`, `EI_EVIDENCE_CASE_BY_ID`, `EI_PEAK_ROLES`, `EI_BLEND_OWNERSHIP_OPTIONS`, `EI_TEACHER_CONTRASTS`, `EI_EVIDENCE_BOUNDARY`.

- [ ] **Step 1: Add the focused verifier command and an intentionally red data import**

Add to `package.json`:

```json
"verify:measured-ei-evidence": "node scripts/verify-measured-ei-evidence.mjs"
```

Create the verifier with imports from the two not-yet-created data modules, then run:

```bash
npm run verify:measured-ei-evidence
```

Expected red result: `ERR_MODULE_NOT_FOUND` naming `src/data/measuredEiSpectra.js` or `src/data/measuredEiScenarios.js`.

- [ ] **Step 2: Create the data-only record module with an explicit license header**

The file header must say that compact record adaptations retain MassBank record-level `CC BY`, are not relicensed under MIT, and link `THIRD_PARTY_DATA.md`.

Use one `deepFreeze` helper and one `record` helper. Store each peak as `[mz, relativeIntensity]`, then expose frozen `{ mz, relativeIntensity }` objects. Shared metadata must be one frozen object so every record is exact and DRY.

Exact transformed peak tuples:

```js
const PEAKS = {
  'alpha-linear': [[43,1.6],[44,1.1],[45,5.7],[59,4.1],[73,43.8],[74,3.8],[75,2.9],[100,2.4],[103,1.5],[114,1.4],[130,100],[131,12],[132,3.8],[133,1.2],[147,10.5],[148,1.7],[204,3.8],[218,2],[232,1.1]],
  'alpha-branched': [[42,1.1],[43,1.7],[44,1],[45,5.5],[59,2.3],[73,43.3],[74,4.2],[75,2.9],[100,1.3],[114,4.5],[130,100],[131,12.2],[132,3.9],[142,1.4],[147,9.6],[148,1.6],[204,5.3],[205,1.1],[232,1.7]],
  'alpha-n-methyl': [[43,1.4],[45,5.4],[56,3],[59,3.8],[73,39.3],[74,3.2],[75,2],[100,1],[114,1.3],[130,100],[131,11.8],[132,3.7],[133,1],[147,8.8],[148,1.4],[204,3.7],[247,.1]],
  'beta-linear': [[43,2.5],[44,1.5],[45,7],[58,1.2],[59,7.7],[72,1.8],[73,58],[74,5.5],[75,5.8],[88,9],[99,1.2],[100,18.3],[101,1.8],[114,2.3],[116,100],[117,11.3],[118,3.8],[130,1.3],[131,1.6],[133,1.2],[147,17.1],[148,2.8],[149,1.4],[174,1.3],[189,1.6],[190,8.6],[191,1.7],[232,14],[233,3],[234,1.3],[247,.5]],
  'beta-branched': [[43,1.8],[44,1],[45,5],[58,1.4],[59,4.4],[66,1.3],[72,1.3],[73,43.2],[74,4.2],[75,4.7],[81,5.9],[86,1.9],[100,1.1],[102,100],[103,9.8],[104,3.8],[131,2.3],[133,1.1],[147,14.6],[148,2.4],[149,1.2],[176,8.3],[177,1.5],[218,5.6],[219,1.2],[232,2.2]],
  'beta-n-methyl': [[42,2.2],[43,2],[44,1.3],[45,6.2],[58,1],[59,4.5],[72,1.6],[73,51.2],[74,4.3],[75,4.2],[86,1.3],[88,5.4],[99,1.2],[100,1.2],[102,1.7],[114,1.2],[116,100],[117,11.1],[118,3.8],[131,1.6],[133,1.2],[147,18.2],[148,2.9],[149,1.5],[190,8.9],[191,1.7],[232,6.7],[233,1.4],[247,.5]],
};
```

Exact record metadata:

```js
const RECORD_META = [
  { id:'alpha-linear', code:'A1', name:'(2S)-2-Aminobutanoic acid', condensedFormula:'CH3CH2CH(NH2)CO2H', smiles:'CC[C@@H](C(=O)O)N', inchiKey:'QWCKQJZIFLGMSD-VKHMYHEASA-N', accession:'MSBNK-MSSJ-MSJ02336', splash:'splash10-001i-4900000000-c8de67efde7269e8de4d', retentionTimeMin:7.26, sourcePeakCount:104, sourceId:'massbankMsj02336' },
  { id:'alpha-branched', code:'A2', name:'2-Aminoisobutyric acid', condensedFormula:'(CH3)2C(NH2)CO2H', smiles:'CC(C)(N)C(=O)O', inchiKey:'FUOOLUPWFVMBKG-UHFFFAOYSA-N', accession:'MSBNK-MSSJ-MSJ02340', splash:'splash10-001i-4900000000-30ff658990346a9e5f66', retentionTimeMin:7.05, sourcePeakCount:70, sourceId:'massbankMsj02340' },
  { id:'alpha-n-methyl', code:'A3', name:'N-Methyl-L-alanine', condensedFormula:'CH3CH(NHCH3)CO2H', smiles:'C[C@@H](C(=O)O)NC', inchiKey:'GDFAOVXKHJXLEI-VKHMYHEASA-N', accession:'MSBNK-MSSJ-MSJ02354', splash:'splash10-001i-4900000000-59f5f5f91cfaf2eade03', retentionTimeMin:7.24, sourcePeakCount:83, sourceId:'massbankMsj02354' },
  { id:'beta-linear', code:'B1', name:'3-Aminobutanoic acid', condensedFormula:'CH3CH(NH2)CH2CO2H', smiles:'CC(CC(=O)O)N', inchiKey:'OQEBBZSWEGYTPG-UHFFFAOYSA-N', accession:'MSBNK-MSSJ-MSJ02358', splash:'splash10-01b9-5900000000-63ef36d70b2c7f7215fa', retentionTimeMin:7.52, sourcePeakCount:114, sourceId:'massbankMsj02358' },
  { id:'beta-branched', code:'B2', name:'3-Aminoisobutyric acid', condensedFormula:'H2NCH2CH(CH3)CO2H', smiles:'CC(CN)C(=O)O', inchiKey:'QCHPKSFMDHPSNR-UHFFFAOYSA-N', accession:'MSBNK-MSSJ-MSJ02362', splash:'splash10-0udi-5900000000-33e9ccb5f505fed0766c', retentionTimeMin:7.52, sourcePeakCount:92, sourceId:'massbankMsj02362' },
  { id:'beta-n-methyl', code:'B3', name:'N-Methyl-beta-alanine', condensedFormula:'CH3NHCH2CH2CO2H', smiles:'CNCCC(=O)O', inchiKey:'VDIPNVCWMXZNFY-UHFFFAOYSA-N', accession:'MSBNK-MSSJ-MSJ02368', splash:'splash10-014i-5900000000-91173c0ca595586613a0', retentionTimeMin:7.77, sourcePeakCount:95, sourceId:'massbankMsj02368' },
];
```

`MEASURED_EI_DATA_NOTICE` must include dataset version/timestamp/access date, exact transformation, exact license label, an explicit no-version-in-record warning, six accessions, and a statement that no runtime service is called.

- [ ] **Step 3: Create the scenario module**

Export the three exact casefiles above, these five roles:

```js
[
  { id:'base-peak', label:'Base peak' },
  { id:'molecular-ion-candidate', label:'Molecular-ion candidate' },
  { id:'pair-contrast', label:'Pair contrast' },
  { id:'shared-coordinate', label:'Shared coordinate' },
  { id:'observation', label:'Unassigned observation' },
]
```

Export ownership options `left-only`, `right-only`, `shared`, `neither`; six teacher contrasts; and boundary keys `records`, `nominalMz`, `derivatization`, `molecularIon`, `fragmentAssignment`, `comparison`, `blend`, `identity`, and `excluded` using the Scientific Boundary wording above.

- [ ] **Step 4: Complete the verifier's data assertions**

Assert:

- exactly six recursively frozen records and three recursively frozen cases;
- one neutral formula, one derivative formula, one derivative mass, one exact source license, and one instrument type;
- exact accessions, source counts, transformed counts `[19,19,17,31,26,29]`, SPLASH values, and retention times;
- ascending unique integer m/z values inside 40–250;
- relative intensities inside 0–100 with exactly one 100% base per record;
- base peaks `[130,130,130,116,102,116]`;
- m/z 247 states `[absent,absent,0.1,0.5,absent,0.5]`;
- all source titles say `70 V` and all structured derivative fields say `2TMS`;
- the data notice names version `2025.10`, access date, transform, license, and runtime boundary.

Run:

```bash
npm run verify:measured-ei-evidence
```

Expected: data assertions pass and the script prints one compact data-contract line.

---

### Task 2: Implement the immutable evidence engine

**Files:**
- Create: `src/chemistry/measuredEiEvidence.js`
- Modify: `scripts/verify-measured-ei-evidence.mjs`

**Interfaces:**
- Produces: `analyzeEiRecord({ recordId, cursorMz })`.
- Produces: `createEiTagState({ recordId })`, `placeEiTag(state, { mz, role })`, `removeEiTag(state, tagId)`, `evaluateEiTags(state)`.
- Produces: `nextEiTagHint({ recordId, tags, level })`, `nextEiCaseHint({ caseId, level })`, `nextEiBlendHint({ caseId, leftWeight, level })`.
- Produces: `evaluateEiCase({ caseId, predictions, selectedMz })`.
- Produces: `buildSyntheticBlend({ caseId, leftWeight })`, `evaluateBlendAttempt({ caseId, leftWeight, selectedMz, predictions })`.

- [ ] **Step 1: Extend the verifier with failing engine assertions**

Import all interfaces above before the file exists and run the focused command.

Expected red result: `ERR_MODULE_NOT_FOUND` naming `src/chemistry/measuredEiEvidence.js`.

- [ ] **Step 2: Implement shared validation and analysis**

Requirements:

- `recordId` and `caseId` must resolve declared records/cases.
- m/z must be an integer 40–250.
- hint level must be integer 1–4.
- left weight must be integer 10–90.
- all public object/array results are recursively frozen.
- `analyzeEiRecord` returns exact cursor m/z, exact retained peak or `null`, nearest retained peak and distance, base peak, derivative molecular-ion coordinate/presence, source conditions, result kind, and boundary.

- [ ] **Step 3: Implement tag mutation and audit**

State shape:

```js
{ recordId, nextTagNumber: 1, tags: [] }
```

Tag shape:

```js
{ id: 'tag-1', mz: 130, role: 'base-peak' }
```

`placeEiTag` accepts wrong coordinates and roles, but blocks a seventh tag or an exact `(mz, role)` duplicate with `{ accepted:false, state, reason }` where `state` is the exact original reference. `removeEiTag` preserves state by reference when the id is missing.

Audit rules:

- `base-peak`: exact base m/z;
- `molecular-ion-candidate`: exact m/z 247 and a retained source peak at 247;
- `pair-contrast`: exact declared contrast coordinate for the record's case;
- `shared-coordinate`: exact declared shared coordinate for the record's case;
- `observation`: `scored:false`, `correct:null`, with a reason that states whether a retained peak is present and refuses assignment.

Every wrong reason must name the learner coordinate and the exact relevant source coordinate or source absence. Return missing scored roles, per-tag dimensions, scored count, and the boundary.

- [ ] **Step 4: Implement the six-way case evaluator**

Prediction shape:

```js
{
  formulaSufficient: null,
  measuredSpecies: null,
  baseRelation: null,
  candidateId: null,
  scope: null,
}
```

Allowed values:

- `measuredSpecies`: `neutral-parent`, `2tms-derivative`, `not-sure`;
- `baseRelation`: `same`, `different`, `not-sure`;
- `candidateId`: one of the case's two candidates;
- `scope`: `certifies-identity`, `supports-declared-case`, `proves-purity`.

Return six independently scored dimensions: formula, measured species, base relation, contrast coordinate, candidate, and scope. Do not mutate or replace any learner choice.

- [ ] **Step 5: Implement the synthetic blend and its audit**

For every union m/z:

```js
weightedIntensity = (leftWeight / 100) * leftIntensity
  + ((100 - leftWeight) / 100) * rightIntensity;
displayIntensity = 100 * weightedIntensity / maximumWeightedIntensity;
```

Round both to one decimal. Return source intensities, weighted intensity, display intensity, and ownership. Ownership describes retained source adaptations, not chemical exclusivity.

Blend prediction shape:

```js
{
  weightsAreComposition: null,
  compositeProvesTwo: null,
  selectedOwnership: null,
  scope: null,
}
```

Expected values are `false`, `false`, exact ownership at selected m/z, and `synthetic-display-only`. Return four independent dimensions plus a selected-coordinate observation dimension.

- [ ] **Step 6: Implement four non-mutating hints per mode**

Required teaching sequence:

- Run Card: read axes → base peak is normalization → parent versus 2TMS derivative → exact source coordinates.
- Lineup: formula insufficiency → source conditions → base/shared/contrast distinction → bounded target evidence.
- Blend: source coefficients → threshold ownership → renormalization destroys composition meaning → synthetic-only scope.

Every hint returns `mutation` text saying no cursor, tag, release, prediction, or audit changed.

- [ ] **Step 7: Make the focused verifier green**

Verify at minimum:

- cursor exact/empty/nearest behavior;
- recursive freezing;
- accepted wrong tag, duplicate rejection by reference, seventh-tag rejection by reference, missing removal by reference;
- correct and incorrect base/molecular/contrast/shared tags, neutral observations, missing roles;
- all three exact case outcomes and preserved wrong predictions;
- 50/50 and 70/30 blend arithmetic, renormalization, left/right/shared/neither ownership;
- invalid ids, m/z, roles, weights, and hint levels;
- all 12 hints are frozen and non-mutating;
- excluded claims remain present in the boundary.

Expected final output:

```text
Six CC BY measured GC-EI-TOF compact records and three same-formula casefiles verified.
Manual nominal-m/z tags, preserved failures, bounded candidate evidence, and non-mutating hints verified.
Synthetic two-reference arithmetic, threshold ownership, source attribution, and identity/mixture boundaries verified.
```

---

### Task 3: Add source records, model passport, and third-party data notice

**Files:**
- Modify: `src/data/scienceSources.js`
- Modify: `THIRD_PARTY_DATA.md`
- Modify: `scripts/verify-measured-ei-evidence.mjs`

**Interfaces:**
- Produces: `MODEL_PASSPORTS.measuredEiEvidenceStudio`.
- Produces source keys used by every record and the passport.

- [ ] **Step 1: Add primary terminology sources**

Add these exact IUPAC Gold Book routes:

- electron ionization — `https://goldbook.iupac.org/terms/view/E01999`;
- base peak — `https://goldbook.iupac.org/terms/view/B00608`;
- fragment ion — `https://goldbook.iupac.org/terms/view/F02508`;
- mass-to-charge ratio — `https://goldbook.iupac.org/terms/view/M03752`;
- nominal mass — `https://goldbook.iupac.org/terms/view/11543`;
- intensity relative to base peak — `https://goldbook.iupac.org/terms/view/I03073`;
- total retention time — `https://goldbook.iupac.org/terms/view/10039`;
- pre/post-column derivatization terminology — `https://goldbook.iupac.org/terms/view/P04771`.

Reuse existing `iupacMassSpectrum` and `iupacMolecularIon`.

- [ ] **Step 2: Add MassBank documentation and six record routes**

Add:

- API UI — `https://massbank.eu/MassBank-api/ui/`;
- official data repository — `https://github.com/MassBank/MassBank-data`;
- mandatory license record format — `https://github.com/MassBank/MassBank-web/blob/dev/Documentation/MassBankRecordFormat.md`;
- six `https://massbank.eu/MassBank/RecordDisplay?id=<accession>` links.

Each record role must name compound, accession, SPLASH, compact transformation, access date, and exact `CC BY` label.

- [ ] **Step 3: Add the model passport**

Passport result kind:

```text
Transformed measured GC-EI reference evidence and synthetic two-reference arithmetic — not raw spectra, concentration, or identity certification
```

The passport must enumerate all conditions, includes, and excludes from this plan; state every learner-controlled input; state that all runtime logic is local; and include ACS undergraduate scope plus all IUPAC/MassBank sources.

- [ ] **Step 4: Add the third-party data notice**

Create a `MassBank GC-EI compact peak-list adaptations` section with:

- exact dataset version/timestamp/access date;
- exact six-record attribution table: compound, accession, SPLASH, source URL, source peak count, retained count, license;
- the seven-step transformation;
- statement that neutral/derivative formulae and conditions are source metadata;
- statement that the exact record field says `CC BY` without a version;
- statement that record adaptations retain their own terms and are not relicensed as MIT;
- statement that no raw record or complete source peak list is redistributed.

- [ ] **Step 5: Extend and run the verifier**

Assert every source key, URL, passport source, condition, included behavior, excluded claim, attribution, and transformation notice. Run the focused command and require the three expected green lines.

---

### Task 4: Build the graphical React studio

**Files:**
- Create: `src/components/MeasuredEiEvidenceLab.jsx`
- Create: `src/styles/measured-ei-evidence.css`

**Interfaces:**
- Consumes all Task 1–3 exports.
- Produces default export `MeasuredEiEvidenceLab` with anchor `measuredEiEvidenceLab`.

- [ ] **Step 1: Build the fan-fold hero and mode deck**

Hero copy:

```text
20 / Measured GC-EI evidence
The formula stayed the same. The measured species did not.
Load six C4H9NO2 isomers, release their source-declared 2TMS GC-EI records, and attach every claim yourself. The printer explains coordinates; it never guesses an identity.
```

Hero SVG/CSS must show vial → GC coil → EI stamp → fan-fold printer, use the exact design palette, include an accessible text equivalent, and avoid the existing orthogonal magnet/flight-tube motif.

Mode labels:

- `Run Card` — release · scan · tag;
- `Six-Way Lineup` — formula · retention · pattern;
- `Blend Spool` — mix displays · reject quantitation.

All three mode states persist while switching.

- [ ] **Step 2: Build the shared six-record cartridge rail**

Every cartridge displays code, name, condensed connectivity, neutral formula, 2TMS derivative badge, retention time, and source license. Selecting a cartridge changes only the pending cartridge and records one action.

- [ ] **Step 3: Build Run Card**

Required UI:

- explicit `Release measured run` action;
- stale released-run banner after pending cartridge changes;
- source conditions and provenance strip;
- fan-fold SVG spectrum with perforated edges, m/z 40–250 axis, relative-intensity 0–100 axis, source sticks, molecular-mass guide at 247, read-head, and accessible textual readout;
- range and number cursor controls;
- five role buttons and `Attach at m/z` action;
- removable clip tags;
- `Audit tags`, `Next hint`, and `Clear tags` actions;
- per-tag reasons, missing-role list, model boundary, and action history.

The plot may accept pointer positioning, but it must calculate an integer cursor without snapping to a source peak.

- [ ] **Step 4: Build Six-Way Lineup**

Required UI:

- three case cartridges;
- six-candidate connectivity board with the active pair illuminated;
- explicit target-run release;
- source-method retention rail with candidate and target markers;
- target and two candidate compact spectra with exact source labels;
- m/z defense cursor;
- five prediction groups plus candidate choice and explicit audit;
- six independent result cards and bounded-case verdict;
- stale audit retained after case or cursor changes.

- [ ] **Step 5: Build Blend Spool**

Required UI:

- declared-case selector;
- 10–90 display-coefficient crossfader;
- explicit `Wind synthetic spool` action;
- stale released blend after coefficient/case changes;
- composite fan-fold plot with source A/B contribution colors and composite carbon sticks;
- pre-normalization maximum and post-normalization ledger;
- selected-coordinate ownership readout;
- four learner claims plus audit and four hints;
- conspicuous `synthetic arithmetic — not a measured mixture` stamp.

- [ ] **Step 6: Add teacher rail, trace, and passport**

Six teacher loads must cover:

1. absent m/z 247 source peak;
2. weak 0.1% m/z 247 source peak;
3. shared base peak with a weak pair contrast;
4. different base peaks inside one formula/derivative pair;
5. equal blend with distinct base peaks;
6. unequal blend with a threshold-right-only coordinate.

Teacher loads change setup only; they do not release, attach, or audit. Keep a capped 90-entry action tape. Render exact model passport, source links, data notice, conditions, included/excluded lists, and identity/mixture boundaries.

- [ ] **Step 7: Implement responsive and accessibility CSS**

Requirements:

- desktop two-column instrument with paper first and 340–380 px console;
- tablet stack with paper first;
- mobile cartridge rails and plots may scroll internally but body must not overflow;
- minimum visible mobile button height 44 CSS px;
- visible 3 px focus outline and offset on native controls;
- SVG title/description plus text readouts;
- no information encoded only by color;
- reduced-motion contract described in Visual Direction;
- no external font or asset download.

- [ ] **Step 8: Run the focused verifier and production build**

Run:

```bash
npm run verify:measured-ei-evidence
npm run build
```

Require verifier exit 0 and build exit 0. Report any chunk-size advisory separately from build success.

---

### Task 5: Integrate navigation, curriculum, and ordered section numbering

**Files:**
- Modify all integration and numbering files listed under File Structure.

**Interfaces:**
- Produces anchor `#measuredEiEvidenceLab` in App, Header, and three curriculum areas.
- Produces 106 live topics, 11 next-engine topics, 0 concept topics, 117 total topics.
- Produces exactly 34 ordered sections, 01–34.

- [ ] **Step 1: Lazy-load the component after Orthogonal Evidence**

Add:

```jsx
const MeasuredEiEvidenceLab = lazy(() => import('./components/MeasuredEiEvidenceLab.jsx'));
```

Insert after `OrthogonalEvidenceLab`:

```jsx
<Suspense fallback={<LabFallback id="measuredEiEvidenceLab" label="Measured GC-EI evidence studio"/>}><MeasuredEiEvidenceLab /></Suspense>
```

- [ ] **Step 2: Add desktop and mobile navigation links**

Use icon `▥`, label `Measured GC-EI evidence`, and description `Release real compact records and defend nominal-m/z claims` immediately after Orthogonal Structure Evidence in both menus.

- [ ] **Step 3: Add three live curriculum clusters**

Organic:

```text
Measured GC-EI isomer-pattern evidence — Compare six same-formula connectivity records after one source-declared derivatization without converting pair support into identity.
```

Physical:

```text
Measured electron-ionization stick spectra — Separate nominal m/z, base-peak normalization, molecular-ion evidence, and unassigned fragment-ion coordinates in six attributed records.
```

Analytical:

```text
Measured GC-EI reference evidence and bounded overlap — Use source conditions, retention time, compact stick patterns, and explicitly synthetic two-reference arithmetic while rejecting concentration and certification claims.
```

Add one corresponding learner outcome and live-lab link in each area. Extend every relevant boundary/model paragraph.

Rename the Analytical gap to:

```text
Advanced mass spectrometry, raw/2D NMR, real mixtures, and validated identification
```

Its detail must name accurate-mass/uncertainty, other ion sources, MS/MS, raw and multidimensional NMR, response factors, real mixtures, larger validated libraries, and method-validation evidence.

- [ ] **Step 4: Renumber existing sections 20–33 to 21–34**

Apply the exact mapping listed under File Structure. Do not change sections 01–19.

- [ ] **Step 5: Update structural assertions and run structural scripts**

`CurriculumAtlas.jsx` must expect 106 live topics. Run a read-only Node structural calculation that reports:

```json
{"live":106,"nextEngine":11,"concept":0,"total":117,"verifiers":32,"areas":7}
```

Run a section scan that reports count 34, numbers 1–34, no missing, and no duplicates.

---

### Task 6: Document the milestone for learners, contributors, and compaction recovery

**Files:**
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`
- Modify: `docs/CURRENT_PROGRESS.md`

- [ ] **Step 1: Update README feature and scientific-boundary sections**

Document:

- six exact CC BY RIKEN/MSSJ records;
- one neutral formula and one source-declared 2TMS derivative formula;
- compact nominal-m/z transformation;
- base/molecular/fragment-coordinate distinction;
- three bounded cases and synthetic blend;
- no raw records, arbitrary assignment, library search, real mixture, quantitation, or certification;
- new data/engine/component/style/verifier files;
- focused verifier command.

- [ ] **Step 2: Add contributor manual QA**

Required journey:

- release one record, attach one correct and one wrong tag, audit, and confirm both remain;
- attempt an exact duplicate and seventh tag and confirm reasons/state preservation;
- show one absent and one weak m/z 247 case;
- solve all three lineups including same/different base relation;
- release a blend, change the coefficient, confirm stale output, and reject composition/two-compound claims;
- load all six teacher contrasts without automatic release/audit;
- inspect source and license passport;
- check desktop/tablet/mobile, 44 px controls, focus, reduced motion, hash alignment, body overflow, and console.

- [ ] **Step 3: Rewrite the compaction-safe current-progress checkpoint**

Make this milestone current and separate:

- implemented behavior;
- fresh focused/full/build/browser evidence;
- current counts;
- remaining gaps;
- limitations and estimates;
- exact next action.

Do not retain 31/31, 103/114, 33 sections, or the Electronic Band milestone as current after new validation. Preserve the prior milestone plan path as historical evidence.

---

### Task 7: Browser QA, visual critique, and complete validation

**Files:**
- Modify only files directly implicated by observed defects.
- Modify `docs/CURRENT_PROGRESS.md` with final evidence.

- [ ] **Step 1: Use the in-app browser at the new hash**

Open:

```text
http://127.0.0.1:5174/#measuredEiEvidenceLab
```

Verify section top aligns below navigation and no runtime warning/error appears.

- [ ] **Step 2: Run learner and teacher journeys**

Execute every contributor journey from Task 6. If unexpected behavior appears, stop and use systematic debugging before editing.

- [ ] **Step 3: Critique screenshots at desktop, tablet, and mobile**

Check the fan-fold printer is the visual signature; chart labels remain legible; source and synthetic states cannot be confused; the hierarchy is not generic card soup; no decorative element competes with the paper; and no text or controls clip.

- [ ] **Step 4: Run accessibility and responsive evidence**

Measure:

- 1280×900 desktop;
- 742×900 tablet;
- 390×844 mobile;
- body scroll width versus viewport;
- internal rail/plot scroll regions;
- minimum visible mobile button height;
- keyboard focus outline;
- runtime reduced-motion emulation if available, otherwise record CSS-only evidence.

- [ ] **Step 5: Read verification-before-completion and run fresh full validation**

Read the skill completely, then run:

- all 32 `npm run verify:*` commands in one complete pass;
- focused command separately if needed for exact output capture;
- curriculum structural calculation;
- section 01–34 calculation;
- `npm run build`;
- final browser console/error check.

- [ ] **Step 6: Refresh current progress and leave the UI visible**

Record exact actual outputs, chunk names/sizes, browser dimensions, defects found/fixed, and remaining limitation. Leave the deliverable browser tab at `#measuredEiEvidenceLab` on a strong default Run Card frame.

## Self-Review

- Spec coverage: open measured EI data, record-level licensing, source conditions, derivatized species, nominal-m/z transformation, learner-owned tags, bounded six-candidate reasoning, synthetic overlap, teacher use, distinctive UI, responsiveness, accessibility, curriculum, documentation, and validation each map to an explicit task.
- Placeholder scan: no deferred implementation marker, unspecified error handling, generic “write tests,” or unbounded source substitution remains.
- Type consistency: record/case ids, tag roles, prediction fields, ownership values, source keys, anchor, passport key, counts, and verifier command are named consistently across tasks.
- Source discipline: no NIST-restricted, MassBank noncommercial, or ambiguous share-alike spectrum is selected; all six frozen records use exact `CC BY` labels.
- Scientific discipline: neutral formula, source-declared derivative, molecular-ion coordinate, base peak, unassigned lower-mass coordinates, retention evidence, pair support, and synthetic arithmetic remain separate claims.
- Design discipline: fan-fold printer is unique to this lab; the existing magnet/flight-tube visual is not repeated; motion is purposeful and reducible.
- Scope discipline: no library search, arbitrary prediction, fragment assignment, real-mixture model, quantitation, identity certification, dependency, backend, model call, paid call, or Git action is introduced.

