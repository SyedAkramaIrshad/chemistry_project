# Biomolecular Assembly Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a graphical, manually operated Biomolecular Assembly Studio that teaches peptide construction, hydrolysis, ionization, nucleotide anatomy, and canonical DNA/RNA complementarity without pretending to predict folding or biological function.

**Architecture:** Keep the chemistry in two independent, immutable JavaScript engines: one for peptide composition and acid-base behavior, and one for nucleic-acid complement construction. A lazy-loaded React section composes both engines into one learner journey. Declared classroom constants and source-backed scientific definitions stay in data modules so the UI never hides assumptions.

**Tech Stack:** React 19, Vite, plain JavaScript modules, CSS, Node assertion verifiers.

## Product and Science Boundaries

- Include all 20 standard proteinogenic amino acids with names, one- and three-letter symbols, neutral formulas, visual classes, and declared ionizable side chains.
- Let learners edit the classroom pKa model. Clearly label values as approximate and context-dependent.
- Calculate fractional expected charge using Henderson-Hasselbalch fractions and estimate pH(I) numerically from the declared model.
- Allow only explicit N-terminal or C-terminal peptide extension. Never rearrange, replace, or remove atoms automatically.
- Allow explicit peptide-bond hydrolysis and show the resulting chain fragments, consumed water, formula, and average molar mass.
- Teach nucleotide anatomy as base + pentose sugar + phosphate.
- Let learners manually construct an antiparallel canonical complement. Preserve chemically valid but incorrect choices and explain them after checking.
- Block only impossible alphabet choices such as uracil in the DNA mode or thymine in the RNA mode, with an immediate reason and no mutation.
- Restrict complement evaluation to canonical Watson-Crick A-T/A-U and G-C pairing. State that noncanonical pairs and G-U wobble are outside this model.
- Exclude folding prediction, tertiary/quaternary structure, sequence-function claims, codon translation, melting-temperature prediction, kinetics, and biological-activity prediction.

## Visual Direction

The signature interaction is a biomolecular loom rather than a dashboard. A dark aubergine sequence ribbon acts as the working canvas. Amino-acid tiles are grouped by chemical character and snap visibly onto either the N or C end only when the learner presses the corresponding action. Ionizable groups hover above the ribbon as charge badges whose fractional values respond to a pH dial. Selecting a peptide bond exposes a single, explicit hydrolysis action and then separates the ribbon into real fragments.

The nucleic-acid area uses a strand zipper: the template runs 5-prime to 3-prime, while empty complement sockets run underneath in the antiparallel direction. Learners place bases one at a time; wrong canonical bases remain where placed until the learner changes them. Hydrogen-bond marks and reasons appear when the learner checks the strand.

Palette: loom aubergine `#1B1730`, residue mint `#6CE6B7`, peptide coral `#FF7A7A`, phosphate cyan `#6BD5FF`, nucleobase gold `#FFD166`, and lab paper `#F5F7F4`. Use the existing editorial typography and section rhythm while giving this module its own recognisable visual language.

### Compact Layout Sketch

```text
06 / BIOMOLECULAR ASSEMBLY
┌──────────────────────────────────────────────────────────────────────┐
│ Amino-acid library                Declared model                     │
│ [nonpolar] [polar] [acidic] ...   pH dial + editable pKa values     │
│ [Gly] [Ala] [Ser] ...                                               │
├──────────────────────────────────────────────────────────────────────┤
│ N ← [ residue ]—[ residue ]—[ residue ] → C                         │
│      charge badges / selectable peptide bonds                        │
│ [Attach to N] [Attach to C]        [Hydrolyse selected bond]         │
│ Formula · mass · peptide bonds · water ledger · pH(I) curve          │
├──────────────────────────────────────────────────────────────────────┤
│ Nucleotide anatomy              Antiparallel strand zipper           │
│ [phosphate]-[sugar]-[base]      5′ G A T T A C A 3′                 │
│                                 3′ _ _ _ _ _ _ _ 5′                 │
│ [A] [C] [G] [T/U]              Check · Hint · Reset                 │
└──────────────────────────────────────────────────────────────────────┘
```

## Task 1: Build and Verify the Peptide Chemistry Engine

**Files:**

- Create: `src/data/biomolecularComponents.js`
- Create: `src/chemistry/peptideChemistry.js`
- Create: `scripts/verify-peptide-chemistry.mjs`
- Modify: `package.json`

**Step 1: Declare the amino-acid library and classroom model**

Add immutable records for the 20 standard amino acids. Each record must include stable id, name, one-letter code, three-letter code, neutral free-amino-acid formula, side-chain shorthand, visual class, and optional ionizable-group metadata. Add a learner-editable default pKa model for N terminus, C terminus, Asp, Glu, His, Cys, Tyr, Lys, and Arg. Label these values as approximate classroom defaults that change with molecular environment.

**Step 2: Write failing peptide assertions**

Cover:

- all 20 records are unique and complete;
- Gly-Ala forms one peptide bond, releases one water, has formula `C5H10N2O3`, and average molar mass near `146.146 g mol-1`;
- extending at N prepends and extending at C appends;
- the residue cap blocks without mutating the original state;
- hydrolysing a selected bond splits the chain and consumes one water;
- fractional charge decreases as pH rises;
- glycine pH(I) is near `6.02`, aspartic acid near `2.95`, and lysine near `10.1` under the declared defaults;
- every operation returns fresh state on success and preserves the same state reference on a blocked action.

**Step 3: Implement the pure engine**

Implement formula parsing and merging, average-mass calculation, immutable peptide state, N/C extension, peptide-bond hydrolysis, water bookkeeping, fractional ionization, pH(I) bisection over pH 0-14, and a charge trace suitable for a graph. Return structured outcomes with `ok`, a learner-facing reason, and the unchanged input state when blocked.

**Step 4: Run the peptide verifier**

Run `npm run verify:peptides`. Fix only failures in this bounded module before proceeding.

## Task 2: Build and Verify the Nucleic-Acid Engine

**Files:**

- Modify: `src/data/biomolecularComponents.js`
- Create: `src/chemistry/nucleicAcids.js`
- Create: `scripts/verify-nucleic-acids.mjs`
- Modify: `package.json`

**Step 1: Declare nucleotide components**

Add A, C, G, T, and U records with names, purine/pyrimidine family, valid polymer modes, canonical complement, and canonical hydrogen-bond count. Add DNA `GATTACA` and RNA `AUGGCU` teaching presets plus nucleotide-anatomy labels.

**Step 2: Write failing nucleic-acid assertions**

Cover:

- DNA `GATTACA` has aligned antiparallel complement `CTAATGT`, conventional 5-prime complement `TGTAATC`, and 16 canonical hydrogen bonds;
- RNA `AUGGCU` has aligned complement `UACCGA` and conventional 5-prime complement `AGCCAU`;
- a wrong but polymer-valid base remains placed and receives a reason only when checked;
- U in DNA and T in RNA are blocked without mutating the answer array;
- incomplete, incorrect, and complete evaluations are distinct;
- hints reveal at most one unresolved position and do not mutate learner state.

**Step 3: Implement the pure engine**

Implement polymer-specific alphabets, aligned and conventional complements, immutable placement, per-position evaluation, canonical hydrogen-bond totals, and deterministic progressive hints. Keep wrong-but-valid learner attempts intact.

**Step 4: Run the nucleic-acid verifier**

Run `npm run verify:nucleic-acids`. Fix only failures in this bounded module before proceeding.

## Task 3: Build the Graphical React Experience

**Files:**

- Create: `src/components/BiomolecularStudio.jsx`
- Create: `src/styles/biomolecular.css`
- Modify: `src/App.jsx`

**Step 1: Build the peptide loom**

Add an amino-acid shelf with chemical-class filters and keyboard-accessible selection. Render the current sequence as an N-to-C ribbon. Give the selected residue two explicit controls: attach to N terminus and attach to C terminus. Make each peptide bond selectable and expose hydrolysis only for the selected bond. Show fragments as separate ribbons after hydrolysis.

**Step 2: Make the declared model inspectable**

Add a pH control, editable pKa inputs for groups present in the current chain, fractional-charge badges, an SVG charge-versus-pH curve, and a pH(I) marker. Show neutral formula, average molar mass, residue count, peptide-bond count, water released, and water consumed. Explain that pH(I) is model-derived and environment-dependent.

**Step 3: Build the nucleotide zipper**

Add DNA/RNA mode selection, preset template selection, nucleotide anatomy graphic, polymer-specific base palette, manual complement sockets, check/reset/hint controls, per-position feedback, and hydrogen-bond marks after evaluation. Display both strand directions explicitly.

**Step 4: Add teacher and model lenses**

Include a compact action trace, learning objectives, source links, model assumptions, and clear included/excluded boundaries. Explanations must identify what the learner attempted, what the declared model evaluated, and why an operation was accepted, blocked, or chemically valid but incorrect.

**Step 5: Integrate lazily into the workbench**

Lazy-load the section at `#biomoleculeLab` before the enzyme module. Add it to desktop and mobile navigation. Preserve the generic lazy-anchor synchronisation behavior.

## Task 4: Update Curriculum, Sources, Numbering, and Contributor Docs

**Files:**

- Modify: `src/data/curriculum.js`
- Modify: `src/data/scienceSources.js`
- Modify: relevant section-number props or labels under `src/components/`
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`

**Step 1: Update the Biochemistry curriculum map**

Mark amino-acid identity and classification, peptide condensation/hydrolysis and primary sequence, pH-dependent charge/pH(I) foundations, nucleotide anatomy, and canonical complementarity as live. Keep structure, dynamics, allostery, translation, folding, and biological-function prediction as future scope.

**Step 2: Add official scientific references**

Add the IUPAC-IUBMB amino-acid/peptide recommendations, nucleic-acid notation recommendations, and IUPAC Gold Book definitions for amino-acid residue, N/C termini, primary structure, Henderson-Hasselbalch equation, isoelectric point, zwitterion, nucleoside, nucleotide, nucleotide base, base pairing, base pair, and nucleotide sequence.

**Step 3: Renumber the downstream workbench sections**

Use: Gas and Phase `04`, Spectroscopy `05`, Biomolecular `06`, Enzyme `07`, Organic Mechanism `08`, Coordination `09`, Crystal `10`, Reaction Builder `11`, and Equation Builder `12`.

**Step 4: Document contribution boundaries**

Document the new engine scripts, verifier commands, declared constants, and the rule that richer biological claims need an explicit model passport and appropriate evidence.

## Task 5: Validate Chemistry, Build, and Learner/Teacher UX

**Files:**

- Modify only files implicated by an observed failure.

**Step 1: Run all deterministic chemistry verifiers**

Run the existing eight verifier commands plus `npm run verify:peptides` and `npm run verify:nucleic-acids`. Record raw pass/fail output.

**Step 2: Run the production build**

Run `npm run build` and inspect the generated chunk list for the lazy Biomolecular Studio.

**Step 3: Audit as a learner in the in-app browser**

At desktop and narrow mobile widths, complete these journeys:

- attach residues independently to N and C termini;
- select and hydrolyse a peptide bond;
- adjust pH and observe fractional charge and the curve;
- edit one pKa and observe the declared model respond;
- intentionally place a wrong but valid DNA/RNA base and confirm it remains;
- attempt U in DNA or T in RNA and confirm the state is unchanged with a reason;
- complete a correct DNA and RNA complement;
- use hints without automatic completion.

**Step 4: Audit as a teacher**

Confirm assumptions, context-dependent constants, water bookkeeping, strand directionality, source links, action trace, and excluded claims are visible and understandable without reading source code.

**Step 5: Inspect responsive composition and runtime errors**

Check true mobile width, intermediate width, and desktop. Confirm no horizontal page overflow, clipped controls, overlapping labels, broken anchor position, console errors, or failed network requests.

## Completion Evidence

Completion for this module requires all ten deterministic chemistry verifiers to pass, the production build to pass, and both learner and teacher browser journeys to be observed at desktop and mobile widths. Passing deterministic checks establishes consistency with the declared classroom models; it does not certify real-world biomolecular behavior outside those boundaries.
