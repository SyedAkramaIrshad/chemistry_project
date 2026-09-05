# ChemLab Studio

ChemLab Studio is an open-source, React-based university chemistry learning workbench. Learners change chemical representations themselves, observe the resulting state, and receive a specific explanation from the implemented model.

The project follows one interaction rule:

> The application may explain, permit, or block a learner's action, but it must not silently repair the learner's scientific state.

![ChemLab Studio preview](docs/preview-desktop.png)

The curriculum atlas currently maps 103 live topic clusters across seven university-chemistry disciplines, and the workbench presents 33 ordered visual sections.

## Learning experience

The primary guided experiment starts with water and a separate nitrogen atom. The learner must:

1. Select and break one O-H bond.
2. Confirm that oxygen and hydrogen both remain on the canvas.
3. Form an N-O single bond manually.
4. Inspect the resulting open-valence state.
5. Read the experiment trace to distinguish an allowed graph edit from a claim about a complete or experimentally favored product.

Every successful bond, rejected attempt, broken bond, charge change, structure load, and undo operation leaves an explanatory entry in the experiment trace.

## Current interactive tools

- NIST-backed neutral H–Kr element tuner arranged in real group, period, and s/p/d-block positions
- manual 1s–4p orbital rack where Pauli-valid ground, excited-looking, and wrong Hund-pattern arrangements remain exactly where the learner puts them
- site-specific blocking for a third electron or duplicate spin without changing any other orbital
- NIST chromium 3d5 4s1 and copper 3d10 4s1 ground-state exceptions preserved as declared records rather than repaired by a shortcut
- independent electron-count, subshell-record, introductory Hund-pattern, unpaired-count, and para/diamagnetic feedback
- selected-electron quantum-address challenge for n, l, ml, and ms, with every wrong coordinate retained after checking
- qualitative s/p/d probability-cloud theatre with explicit wavefunction/isosurface and non-trajectory boundaries
- measured first-ionization-energy terrain for H–Kr with exact NIST values, two-element comparison, and visible Be/B and N/O local reversals
- graphical lead-glass nuclear decay chamber with five declared branches, a real `(N,Z)` coordinate map, manual daughter selection, and left/right particle placement
- independent mass-number, proton-number, and electron-lepton conservation beams that preserve an incorrect assembly and explain every open ledger
- segmented half-life chronograph for four declared isotopes with learner-controlled starting population and elapsed half-lives, expected parent/daughter/activity ledgers, and stale-run protection
- six-nucleus measured-mass binding ridge linking neutral-atom mass defect, total binding energy, and binding energy per nucleon without turning the comparison into a reaction or stability oracle
- three four-claim prediction consoles, non-mutating hints, six teacher contrasts, a learner-action register, and an explicit boundary against dose, shielding, handling, and medical procedure
- graphical molecular-geometry wind tunnel with five rotatable ideal electron-domain cages and fourteen declared AXmEn scenarios
- manual bond-domain and lone-pair token placement where occupied sites block with a reason and complete-but-unfavoured arrangements remain unchanged
- explicit trigonal-bipyramidal equatorial and octahedral opposite-lone-pair challenges, nominal parent angles, and visible-atom shape predictions
- learner-editable 0–2 relative bond-pull vectors with live cancellation/resultant graphics and independently retained polar/nonpolar predictions
- conventional localized sp, sp2, sp3, sp3d, and sp3d2 labels with direct warnings against treating the hypervalent labels as modern bonding proof
- graphical molecular-orbital bonding interferometer with three declared qualitative ladders and fifteen homonuclear diatomic/ion scenarios
- manual spin-up and spin-down placement where only Pauli-impossible occupancy is blocked and wrong Aufbau/Hund patterns remain visible
- selectable sigma/π phase scope with constructive overlap, antibonding internuclear nodes, phase-sign legends, and explicit non-density boundaries
- formal bonding-minus-antibonding bond-order ledger, unpaired-electron count, and spin-only magnetic classification scored independently
- early/late second-period 2p ordering comparator and O2+, O2, O2-, O2(2-) occupation series
- graphical electronic-band and metallic-bonding state loom with linked finite-chain, periodic-band, and two-band edge instruments
- exact `N`-site open-chain levels with learner-controlled 0–1.5 eV coupling, manual spin placement, explicit reference loading, and preserved energy-order mistakes
- zero-coupling degeneracy that refuses to invent one unique occupation, plus a finite-spread comparison against the `4|β|` periodic limit
- one-dimensional `E(q) = α + 2β cos(q)` band with learner-controlled filling, `q` cursor, exact width, T = 0 occupation edge, and dimensionless slope
- declared direct positive-gap, touching, overlap, indirect-gap, and narrow-gap cartridges with separate energy and edge-coordinate evidence
- retained four-part predictions, stale-audit protection, non-mutating hints, six teacher contrasts, action trace, and a strict boundary against transport or real-material certification
- molecular graph builder with 34 selectable elements
- explicit single, double, triple, and ionic interaction modes
- selectable bonds with a visible manual break action
- valence electrons and available bonding sites
- formal-charge, octet, shell-capacity, ionic-polarity, and valence checks
- open, radical, incomplete, disconnected, unsupported, and invalid states
- molecule recognition using element, connectivity, bond order, and charge
- molecular formula, molar mass, net charge, components, and degree of unsaturation
- exact equation balancing with a per-element conservation check
- graphical stoichiometry freight yard with six declared balanced equations and coefficient-gated reactant lanes
- linked gram-to-mole-to-entity bridges, coefficient-normalized batch capacity, limiting feed, exact stoichiometric ties, reaction extent, leftovers, and all declared products
- learner predictions for limiting state and target amount that remain visible after checking, including separate reasons for each dimension
- theoretical target mass, exact consumed-versus-produced mass closure, and an unclamped isolated-yield audit that flags values above 100%
- condition-aware weak-acid/strong-base titration across five reasoning regions
- synchronized pH curve, HA/A- species population, vessel, equation, and teacher question
- graphical fixed-temperature reaction-quotient reactor with four declared ideal-gas systems and a visible Q/K null detector
- learner-controlled composition, compression, expansion, catalyst, fixed-volume inert-gas, and fixed-pressure inert-gas perturbations
- before/immediate/new-equilibrium causal strip linking partial pressures, dimensionless Q, ΔrG, reaction direction, and solved reaction extent
- four-part predictions for Q/K, net direction, K invariance, and probe-product amount that remain exactly as entered after comparison
- one MIT-anchored sulfuryl-chloride classroom record plus three conspicuously synthetic stoichiometric controls
- linked thermodynamics and kinetics lab with temperature-dependent ΔG°, K, and Arrhenius rate calculations
- dual reaction-coordinate paths, catalyst invariance, half-lives, and a first-order population race
- explicit rejection of impossible transition-state geometry without changing learner inputs
- graphical thermochemical cycle forge with three selected 298.15 K Hess challenges, reversible whole-equation tiles, signed scaling, and a species-cancellation gantry
- selected NIST formation-enthalpy records linked to both card-path and net formation ledgers, with learner claims preserved after checking
- synthetic ideal calorimeter cutaway with editable mass, specific heat, temperature change, vessel constant, and reaction extent
- explicit solution, vessel, surroundings, and reaction-system heat accounting plus a visible no-vessel comparison
- four-part thermochemistry predictions, four non-mutating hints, a chronological action register, teacher contrasts, and a bounded model passport
- graphical borosilicate saturation column with four declared ionic solids, editable ion-source concentrations and volumes, and finite initial solid inventory
- explicit Qsp/Ksp, signed formula-unit dissolution or precipitation extent, dissolved-ion closure, solid-mass change, and pure-versus-common-ion solubility ledgers
- logarithmic selective-precipitation prism with four silver-halide composition contrasts, free-Ag+ onset thresholds, first-analyte residual, and a visible 99.9% target window
- concentration-flipped onset ordering that demonstrates why Ksp alone is not a general selectivity rule
- four preserved claims, eight non-mutating hints across two modes, six teacher contrasts, chronological action registers, and an explicit activity/kinetics/evidence boundary
- graphical electrochemical switchboard with six declared metal half-cells, manual anode/electron/salt-bridge predictions, and retained wrong orientations
- activity-based Nernst potential linked to reaction quotient, balanced electron count, ΔG, K, and signed cell notation
- separate powered-plating rail with ideal Faraday mass, learner-set current, time, and supplied current efficiency
- controlled Boyle, Charles, and Avogadro experiments with a prediction required before reveal
- graphical piston linking learner-defined amount, temperature, volume, particle density, thermal trails, and pressure load
- ideal-versus-critical-derived van der Waals pressure ledger with visible attraction and excluded-volume terms
- compression-factor gauge, raw isotherm comparison, explicit V ≤ nb rejection, and subcritical-loop warning
- pure-water saturation-pressure challenge with source-ranged Antoine correlation, phase-tendency prediction, and explicit pExternal = pSat reveal
- graphical ideal-binary equilibrium navigator with persistent P–x–y and T–x–y modes for two declared virtual pairs
- learner-owned phase-region, vapour-enrichment, and raw vapour-amount predictions that remain unchanged after checking
- shuttered equilibrium x/y tie line linked to a symbolic split vessel whose L/V amount register opens only after check or explicit reference
- Raoult partial-pressure, total-pressure, total-phase, and component-balance closure ledgers with ranged NIST pure-component correlations
- graphical nonideal thermodynamics observatory with separate activity-membrane, regular-solution stability-terrain, and low-density pure-gas fugacity instruments
- five synthetic Margules cartridges exposing ideal, positive, negative, one-azeotrope, and deliberately asymmetric two-azeotrope fields without claiming a named-mixture fit
- common-tangent laser, distinct binodal/spinodal markers, local stable/metastable/unstable claims, and equilibrium lever-rule liquid amounts
- separate Z and φ registers, an explicit `|BP/(RT)| <= 0.12` teaching gate, and a refusal screen that releases no pseudo-property outside the gate
- four retained predictions, non-mutating hints, stale released snapshots, six teacher contrasts, a learner action tape, and primary IUPAC/NIST model passports
- graphical biomolecular loom with all 20 standard amino-acid records and explicit N- or C-terminal peptide extension
- selectable peptide bonds with manual hydrolysis, visible fragments, neutral formula, average molar mass, and water bookkeeping
- learner-editable classroom pKa values, fractional expected charge badges, charge-versus-pH curve, and approximate pH(I)
- DNA/RNA nucleotide anatomy and a manual antiparallel strand zipper with explicit 5-prime/3-prime direction
- preserved wrong-but-polymer-valid base choices, explained polymer-invalid bases, nominal canonical hydrogen-bond counts, and non-mutating hints
- linked UV-Vis optical path, illustrative spectrum, six-standard calibration, residuals, and simulated unknown
- wavelength-dependent Beer-Lambert sensitivity with unconstrained ordinary least-squares fitting
- explicit stray-light compression and extrapolation experiments that preserve every entered value and standard
- graphical infrared optical bench with six transformed NIST gas-phase reference records, a reversed 4000–450 cm⁻¹ film, and a learner-controlled scanning reticle
- exact-coordinate O–H, C–H, aldehydic C–H, C=O, C–O, and unassigned probe tags that stay where the learner hangs them, including wrong assignments
- three same-formula evidence casefiles—ethanol/dimethyl ether, propanal/acetone, and ethyl acetate/butanoic acid—with four independently retained claims
- explicit exposure and audit actions, stale-evidence protection, four-level non-mutating hints, six teacher contrasts, and a chronological evidence register
- per-record normalization, gas-versus-condensed-phase warnings, source provenance, and a strict boundary against purity, concentration, mixture, or universal identity claims
- graphical orthogonal structure-evidence studio with six attributed measured proton-NMR peak-list cartridges, a reversed 12.5–0 ppm magnetic tape, and learner-positioned integration tags
- separate signal-position and source-derived integration feedback, explicit reported-versus-formula proton coverage, and no synthesized exchangeable-H peak
- learner-built H/C/O/Cl/Br atom counters feeding an ideal natural-abundance isotope flight tube with nominal M, monoisotopic neutral mass, and M/M+1/M+2 evidence
- three same-formula crossbar casefiles routing formula, existing IR role, measured proton evidence, and ideal mass evidence into five independently retained claims
- explicit release, fire, and audit gates; stale snapshots; four-level non-mutating hints; six teacher contrasts; and a strict pair-support-not-identity boundary
- graphical twin assay calipers with editable replicate pins, a shared reference laser, live means, 95% Student-t interval jaws, and a separate expanded-uncertainty ribbon
- explicit Type A `s/√n`, learner-entered Type B standard uncertainty, root-sum-square `uc`, and visible coverage factor `k` without relabelling expanded uncertainty as a confidence interval
- blank-noise detection gate with editable blank responses, candidate signal, calibration slope/intercept, and declared detection factor
- four-part learner predictions for repeatability, reference difference, interval inclusion, detection, quantitation, noise, and replicate-count misconceptions that remain visible after checking
- four frozen assay comparisons and three frozen blank-gate cases with teacher prompts, synthetic provenance, direct NIST/IUPAC/JCGM sources, and no automatic outlier removal
- graphical chromatography control room with six frozen two-component challenges, three synthetic phase cartridges per challenge, and an explicit virtual-injection action
- learner-controlled 5/15/25 cm column rail and dimensionless relative-velocity dial with separate A, B/u, and C u plate-height contributions
- linked column, detector head, component peak fills, summed paper chromatogram, unretained marker, post-check width calipers, and accessible quantity table
- local tM, adjusted and total tR, k, alpha, Gaussian width, N, and Rs ledgers with a board-only Rs >= 1.5 criterion
- four preserved claims for peak order, resolution band, flow region, and the identity boundary, plus non-mutating hints and method history
- explicit separation-factor/retention, efficiency/selectivity, slow/fast, and resolution/identity teacher contrasts without automatic method optimization
- graphical functional-group signal board with twelve frozen specimen graphs and twelve bounded structural classes
- learner-controlled atom sockets and live bond traces that preserve wrong probes without selecting companion atoms or repairing connectivity
- independent target-class, broad-carbonyl, characteristic-atom, and whole-molecule-inventory predictions with four non-mutating hints
- contextual suppression of acid-as-alcohol, ester-as-ether, and amide-as-amine double counting, plus multifunction alcohol/amine and alcohol/nitrile specimens
- teacher contrast rail for aldehyde/ketone, acid/ester/amide, alcohol/ether, amine/amide, and alkene/carbonyl neighbour tests
- one-substrate enzyme-kinetics lab with Michaelis-Menten saturation, catalytic efficiency, and limiting-rate interpretation
- competitive, uncompetitive, mixed, and pure non-competitive-special-case fingerprints with apparent V and KM
- synchronized enzyme traffic loop, denominator-weight field, initial-rate curve, and substrate-depletion race
- manual two-electron arrow studio for proton transfer, SN2, carbonyl addition, and geometry-prearranged E2
- explicit lone-pair, sigma-pair, and pi-pair origins with learner-selected atom or bond-region destinations
- simultaneous-step commit, removable arrow queue, electron-count ledger, and product lock with no inferred companion arrows
- three-level hints and a chronological attempt trace that never change the arrow queue or reveal a product automatically
- graphical stereochemical projection table with persistent mirror-centre, alkene-gate, and Newman-dial modes
- six frozen tetrahedral priority sets with manual two-socket ligand transpositions, explicit mirror exposure, and camera-only rotation
- independent learner priority, stereogenic-eligibility, R/S, and mirror-relationship checks that preserve every wrong answer
- six planar alkene arrangements with fixed connectivity, explicit left/right pair swaps, local higher-priority choices, and E/Z/undefined feedback
- continuous signed Newman rotation from -180 to +180 degrees with seven canonical stations for ethane and butane
- synchronized eclipsed/staggered, anti/gauche, IUPAC angular-range, nearest-station, and dimensionless qualitative-strain evidence
- explicit boundaries against arbitrary CIP parsing, multi-centre analysis, ring/chair conformations, reaction stereochemistry, measured conformer energies, and population or activity prediction
- bright graphical stereochemical reaction theatre with persistent two-centre relationship, SN2 inversion, and E2 elimination instruments
- six declared two-centre matrices separating displayed-letter differences, whole-object chirality, internal-symmetry meso handling, and same/enantiomer/diastereomer relationships
- five abstract backside-inversion cartridges that keep relative Walden inversion separate from whether an absolute R/S descriptor flips, remains the same after declared priority reordering, or is inapplicable
- five declared beta-hydrogen turnstiles with learner-owned H selection, rear-carbon rotation, IUPAC torsion ranges, an explicit antiperiplanar gate, and shuttered local E/Z frames
- synchronized `base→H`, `C–H→C=C`, and `C–LG→LG` ribbons that illuminate together only after an allowed explicit E2 commit
- retained wrong predictions, four-level non-mutating hints, stale released frames, six load-without-run teacher contrasts, and a unique learner-action film
- explicit boundaries against arbitrary CIP, conformational search, competing pathways, measured kinetics/selectivity, product ratios, reaction proof, and operational procedure
- isometric SC/BCC/FCC crystal theatre with rotatable conventional cells and visible signed `(hkl)` planes
- exact site-sharing, Z, coordination, hard-sphere packing, unit-cell density, and cubic plane-spacing calculations
- Bragg-angle detector with separate allowed, monatomic centring-extinct, and geometric no-solution states
- finite point-defect microscope where vacancies, substitutions, interstitials, and restores occur only at clicked sites
- graphical polymer population studio with two editable chain looms, three declared CRU reels, and six frozen comparison patterns
- manual degree/count bins, finite end caps, clickable chain skylines, and an explicit analysis gate that never rebalances or repairs a learner population
- paired number- and mass-weighting drums linked to exact per-bin `xi`, `wi`, `Mi`, `Xn`, `Mn`, `Mw`, `ĐM`, and end-group mass-share ledgers
- four preserved claims, four non-mutating hints, and a same-`Mn`/same-`Mw`/same-`ĐM` challenge whose visibly different skylines expose the limits of summary statistics
- explicit boundaries against treating synthetic populations as SEC/GPC measurements or using molar-mass averages to predict morphology, processing, properties, degradation, or synthesis outcomes
- first-row ion deck with explicit oxidation-state-to-d-count derivation
- graphical octahedral, tetrahedral, and normalized square-planar coordination observatory
- manual five-orbital electron ladder synchronized with selected spatial d-orbital lobes
- exhaustive field-plus-pairing occupation search with CFSE contribution, pair cost, unpaired count, multiplicity, and spin-only estimate
- preserved wrong occupations, blocked overfill, non-mutating hints, and explicit model-reference reveal
- model passports that separate computed outputs, learner inputs, assumptions, and exclusions
- conservative prediction for selected deterministic reaction families
- MOL V2000 export and browser-local structure saving
- interactive curriculum atlas for seven undergraduate chemistry disciplines
- responsive course navigation, keyboard focus, and reduced-motion support

## University curriculum atlas

The atlas maps:

- General chemistry
- Organic chemistry
- Inorganic chemistry
- Physical chemistry
- Analytical chemistry
- Biochemistry
- Materials chemistry

Each topic is marked as one of:

- **Interactive now**: a working local tool exists.
- **Concept boundary**: the current app teaches where a model applies or stops, but does not claim a complete simulator.
- **Needs another engine**: a numerical solver, measured dataset, 3D model, quantum method, or subject-specific representation is still required.

This distinction is intentional. A curriculum map is not evidence that every scientific engine has already been implemented.

## Manual interaction contract

- Single bond mode is the default.
- A learner selects a bond before breaking it.
- Breaking a bond removes only that bond; both atoms remain.
- Forming a bond changes only the requested interaction.
- The app does not automatically add hydrogens, remove leaving groups, alter a second bond, or repair charge.
- A blocked attempt leaves the graph unchanged and states the reason.
- Open structures remain playable and inspectable.
- “Permitted by this model” is not presented as “spontaneous,” “stable,” or “experimentally favored.”

## Run locally

Requirements: a current Node.js release and npm.

```bash
npm install
npm run dev
```

Open the local address printed by Vite.

Create a production bundle with:

```bash
npm run build
```

The repository exposes 31 deterministic chemistry verifier commands. Each validates one bounded engine; none is presented as universal chemistry or curriculum certification.

Verify the neutral H–Kr ground-configuration, orbital-action, quantum-address, and first-ionization-record engine with:

```bash
npm run verify:atomic-structure
```

Verify the five declared decay assemblies, exact A/Z/electron-lepton closure, four ideal expected-value isotope clocks, six measured-mass binding records, retained wrong claims, non-mutating hints, invalid inputs, and recursive immutability with:

```bash
npm run verify:nuclear-chemistry
```

The Nuclear Chemistry Observatory is a bounded symbolic and expected-value teaching model. It does not provide a complete/live nuclide chart, random decay or detector events, full spectra, chains, arbitrary nuclear pathways, dose, shielding, biological effect, source handling, or medical procedure.

Verify the five ideal cages, fourteen declared scenarios, immutable domain placement, site preferences, nominal angles, relative vector sums, predictions, and projection with:

```bash
npm run verify:molecular-geometry
```

The declared scenario set is CO2, BF3, SO2, CH4, NH3, H2O, CH3Cl, PCl5, SF4, ClF3, XeF2, SF6, BrF5, and XeF4. This is an empirical electron-domain teaching model: it does not infer arbitrary formulas, optimize structures, supply molecule-specific bond angles or lengths, calculate measured dipole moments, establish modern hypervalent bonding, or replace molecular-orbital, conformational, stereochemical, intermolecular-force, spectroscopic, or reactivity models.

Verify the declared molecular-orbital orderings, immutable spin occupation, Pauli blocking, separate Aufbau/Hund evidence, formal bond order, unpaired count, magnetic classification, wave descriptors, ordering crossover, and hints with:

```bash
npm run verify:molecular-orbitals
```

The MO scenario set is H2+, H2, He2+, He2, Li2, Be2, B2, C2, N2, O2+, O2, O2-, O2(2-), F2, and Ne2. These are qualitative local teaching records, not calculated orbital energies or wavefunctions. The module does not infer arbitrary, heteronuclear, or polyatomic diagrams; calculate numerical LCAO coefficients, electron correlation, term symbols, excited states, spectra, geometry, bond properties, or magnetic susceptibility; or prove molecular existence, stability, or reactivity. Molecular-orbital and valence-bond descriptions are presented as complementary models.

Verify the six finite open chains, five periodic one-band cartridges, five declared two-band edge cases, immutable manual occupation, exact spectra and dispersion, filling, gap/overlap geometry, retained predictions, hints, sources, and recursive immutability with:

```bash
npm run verify:electronic-bands
```

The Electronic Band & Metallic Bonding Observatory uses `E_j = α + 2β cos(jπ/(N+1))` for two through sixteen identical sites, `E(q) = α + 2β cos(q)` for one infinite one-dimensional periodic teaching chain, and two declared cosine bands for edge comparison. All eV parameters are synthetic. Passing the verifier establishes only the displayed state-counting, occupation, dispersion, and edge-geometry contract. It does not calculate a real solid, density of states, fitted electronic structure, carriers, effective mass, scattering, velocity, current, conductivity, semiconductor or insulator class, spectra, magnetism, surfaces, defects, devices, or any measured material property.

Verify the pure intermolecular-contact and symbolic solvation-orientation engine with:

```bash
npm run verify:intermolecular
```

The Molecular Interaction Observatory covers London dispersion, permanent dipole–dipole, a declared hydrogen-bond subset, and ion–dipole orientation across methane/methane, HCl/HCl, water/water, water/acetone, Na⁺/water, and Cl⁻/water pair docks plus two six-water symbolic shells. Learners choose sites and a family, rotate both entities, explicitly attempt or break one noncovalent bridge, and keep rejected or strained states visible. London dispersion remains in the declared polar neutral pairs. The shell is an orientation interface, not a hydration number or measured structure. The module does not calculate energy, force, distance, strength, optimized geometry, solubility, phase behaviour, bulk properties, reaction, or biological effect.

Verify the pure amount, extent, limiting-reactant, mass-closure, and yield engine with:

```bash
npm run verify:stoichiometry
```

Verify the pure aqueous-equilibrium engine with:

```bash
npm run verify:equilibrium
```

Verify the fixed-temperature ideal-gas reaction quotient, extent, and perturbation engine with:

```bash
npm run verify:chemical-equilibrium
```

The observatory checks one named MIT classroom record and three abstract teaching instruments. It uses dimensionless `aᵢ = pᵢ/p°`, solves one feasible extent where `ln(Q/K) = 0`, and keeps temperature and K fixed during all seven perturbations. It does not calculate rates, approach time, temperature-dependent K, nonideal fugacity, condensed-phase activities, coupled reactions, or operational experiments.

Verify the pure thermodynamics and kinetics engine with:

```bash
npm run verify:thermokinetics
```

Verify selected formation-enthalpy Hess cycles, species cancellation, synthetic ideal calorimetry, preserved claims, and non-mutating hints with:

```bash
npm run verify:thermochemistry
```

This verifier covers three frozen cycle challenges and three synthetic calorimeter observations. It establishes the arithmetic and interaction contract only; it does not prove a reaction occurs, validate measured heat, characterize apparatus, propagate experimental uncertainty, identify a substance, or supply an operating procedure.

Verify the four selected solid records, signed saturation-vessel extent, common-ion solubility, four selective-threshold contrasts, preserved claims, and non-mutating hints with:

```bash
npm run verify:solubility-equilibrium
```

This verifier establishes the ideal concentration-product arithmetic and interaction contract only. It does not calculate thermodynamic activity coefficients, predict visible cloud timing, identify or purify a compound, validate a separation, or provide a laboratory procedure.

Verify the pure electrochemical-cell and ideal electrolysis engine with:

```bash
npm run verify:electrochemistry
```

Verify the pure gas-law, cubic-departure, and water saturation engine with:

```bash
npm run verify:gas-phases
```

Verify the ranged pure-component correlations, ideal binary P–x–y/T–x–y boundaries, five phase states, tie-line compositions, lever-rule amounts, closure ledgers, preserved predictions, and hints with:

```bash
npm run verify:binary-vle
```

The navigator covers only declared ideal benzene/toluene and n-hexane/n-heptane virtual records. It sets liquid activity coefficients and vapour fugacity coefficients to one; it does not certify measured ideality, model azeotropes or nonideal mixtures, perform caloric flash or distillation design, or provide apparatus, procedure, or chemical-handling guidance.

Verify five synthetic Margules fields, 0/1/2 interior azeotrope roots, regular-solution curvature/binodal/spinodal/common-tangent and lever closure, low-density virial fugacity, the explicit gate refusal, preserved predictions, hints, invalid inputs, and recursive immutability with:

```bash
npm run verify:nonideal-thermodynamics
```

The observatory is three bounded teaching models, not one universal property package. Margules and regular-solution parameters are synthetic, the vapour in the activity instrument is ideal, and the second-virial input is not a named-gas property record. Passing the verifier does not fit or certify a real mixture, material phase diagram, or reference-fluid property.

Verify peptide composition, condensation/hydrolysis, fractional charge, and pH(I) with:

```bash
npm run verify:peptides
```

Verify DNA/RNA alphabets, antiparallel complements, canonical pairs, and preserved learner choices with:

```bash
npm run verify:nucleic-acids
```

Verify the pure spectrophotometry and calibration engine with:

```bash
npm run verify:spectrophotometry
```

Verify the six transformed gas-phase IR records, exact learner probes, three same-formula casefiles, retained wrong claims, hints, invalid inputs, provenance, and immutability with:

```bash
npm run verify:infrared-evidence
```

The Infrared Evidence Studio uses transformed derivative traces from six cited NIST Chemistry WebBook gas-phase records. Each trace is independently normalized after 20 cm⁻¹ binning, and the propanal transmittance record is converted to absorbance before that transformation. The studio supports only declared feature windows and three pairwise contrasts; it does not provide a searchable spectral library, reproduce raw JCAMP files, compare cross-record intensities quantitatively, model condensed-phase band shape, establish identity or purity, resolve mixtures, predict spectra, or supply instrument and sample-preparation procedures.

Verify the six attributed measured proton peak lists, immutable integration tags, five ideal isotope presets, H/C/O/Cl/Br convolution, three orthogonal casefiles, retained wrong claims, hints, invalid inputs, provenance, boundaries, and immutability with:

```bash
npm run verify:orthogonal-evidence
```

The Orthogonal Structure Evidence Studio stores compact measured peak-list derivatives from six identified NMRShiftDB records and calculates ideal natural-abundance neutral-composition envelopes from frozen NIST isotope masses and compositions. It does not reproduce raw CML or FID data, reconstruct NMR line shapes, fit coupling, provide measured EI/ESI/MS/MS spectra, simulate fragmentation or detector response, resolve mixtures, search a library, or certify identity, purity, or concentration. The NMRShiftDB-derived records retain separate attribution and data terms in [`THIRD_PARTY_DATA.md`](THIRD_PARTY_DATA.md); they are not relicensed by the repository's MIT software license.

Verify the synthetic replicate, Student-t interval, uncertainty-budget, and blank-detection engine with:

```bash
npm run verify:measurement-uncertainty
```

This verifier checks four immutable assay comparisons, three immutable blank-gate cases, sample variance and standard deviation, standard error, exact two-sided 95% Student-t critical values for 3–31 observations, reference inclusion, separate Type A/Type B root-sum-square budgets, expanded uncertainty with a visible factor, blank-standard-deviation thresholds, linear concentration conversion, preserved predictions, non-mutating hints, and invalid-input boundaries. It does not validate a physical method, establish trueness, reject outliers, calculate a quantitation limit, or certify measured data.

Verify the six synthetic chromatography challenges, retention/width/plate equations, detector trace, preserved predictions, hints, and run comparisons with:

```bash
npm run verify:chromatography
```

The control room uses a dimensionless relative velocity, frozen synthetic phase retention factors, a declared `H* = A + B/u + Cu` teaching relation, and symmetric Gaussian peaks. It distinguishes hold-up, retention, separation factor, plate number, width, and resolution. Its `Rs >= 1.5` label is only the board's criterion; no trace establishes compound identity, purity, quantitation, method validation, real solvent/column behavior, or safe instrument operation.

Verify the twelve frozen functional-group graph patterns, nested-group suppression, learner probe, four-part predictions, and hints with:

```bash
npm run verify:functional-groups
```

The signal board covers alcohol, ether, aldehyde, ketone, carboxylic acid, ester, amide, amine, nitrile, alkene, alkyne, and haloalkane patterns only on its declared local graphs. It does not classify arbitrary structures, assign names, handle aromatic/ring or charged chemistry, or predict reactions and properties.

Verify the pure enzyme-kinetics engine with:

```bash
npm run verify:enzyme-kinetics
```

Verify the pure electron-flow template engine with:

```bash
npm run verify:electron-flow
```

Verify the frozen single-centre priority sets, immutable ligand and alkene-side swaps, local R/S and E/Z evidence, signed Newman torsions, canonical ethane/butane stations, qualitative strain profile, preserved predictions, and non-mutating hints with:

```bash
npm run verify:stereochemistry
```

The stereochemical scenario set contains six declared tetrahedral priority tables, six declared planar alkene arrangements, and ethane/butane Newman probes. Priority comparisons and strain indices are frozen local teaching records. The module does not recursively rank arbitrary molecular graphs or handle multiple stereocentres, meso/pseudoasymmetric cases, axial/planar/helical chirality, chairs or rings, atropisomerism, reaction stereochemistry, stereoselectivity, measured conformer energies, populations, rates, optical rotation, stability, or biological activity.

Verify the six declared two-centre relationship cartridges, five abstract SN2 inversion maps, five declared E2 beta-hydrogen channels, exact 15-degree teaching gates, meso canonicalization, descriptor contrasts, blocked product shutters, preserved predictions, non-mutating hints, and recursive immutability with:

```bash
npm run verify:stereochemical-reactions
```

The Stereochemical Reaction Theatre releases only a declared two-centre relationship or a local concerted-geometry teaching frame. Cartridge configurations, priorities, symmetry, channels, local E/Z consequences, and the 15-degree tolerances are frozen local teaching declarations. The module does not parse arbitrary molecular graphs, search conformations, compare SN1/SN2/E1/E2 pathways, calculate rates or barriers, predict regioselectivity or product ratios, supply measured selectivity, prove that a reaction occurs, validate a product, or provide synthesis procedure.

Verify the pure cubic-crystal and finite-defect engine with:

```bash
npm run verify:crystal-lattice
```

Verify the three repeat-unit records, six synthetic chain-population challenges, exact finite-chain weighting arithmetic, preserved predictions, and non-mutating hints with:

```bash
npm run verify:polymer-population
```

The population studio uses `Mi = Mend + XiMrepeat`, exact number and mass fractions, `Mn = ΣNiMi/ΣNi`, `Mw = ΣNiMi²/ΣNiMi`, and `ĐM = Mw/Mn`. Its representative chain counts are synthetic tokens rather than measured molecules or moles. Passing this verifier establishes arithmetic and interaction consistency only; it does not validate a molecular-mass measurement, infer a real distribution, or predict any bulk polymer property.

Verify the pure coordination-field occupation engine with:

```bash
npm run verify:coordination-field
```

## Architecture

```text
index.html                              Vite document entry point
src/App.jsx                             application composition root
src/components/CurriculumAtlas.jsx      interactive undergraduate scope map
src/components/ExperimentGuide.jsx      mission, progress, teacher lens, trace
src/components/AtomicStructureLab.jsx   periodic tuner, probability cloud, orbital rack, quantum decoder, and ionization terrain
src/components/NuclearChemistryLab.jsx lead-glass decay chamber, isotope chronograph, binding ridge, claims, trace, and passport
src/components/LabWorkspace.jsx         molecular workbench presentation
src/components/MolecularGeometryLab.jsx rotatable domain cage, token manifest, vector mixer, predictions, trace, and teacher lens
src/components/MolecularOrbitalLab.jsx  manual MO ladder, phase scope, bond/magnet instruments, predictions, trace, and teacher lens
src/components/IntermolecularLab.jsx    pair-contact rotors, bridge oscilloscope, symbolic solvation shell, predictions, trace, and teacher lens
src/components/StoichiometryLab.jsx     mole freight yard, batch press, extent plot, and yield weighbridge
src/components/SolutionLab.jsx          visual aqueous equilibrium and titration bench
src/components/ChemicalEquilibriumLab.jsx Q/K reactor, perturbation console, three-state causal strip, feedback, and passport
src/components/EnergyLab.jsx            reaction-coordinate and kinetic-race bench
src/components/ThermochemistryLab.jsx  reaction-tile forge, cancellation gantry, calorimeter cutaway, claims, trace, and passport
src/components/SolubilityLab.jsx       glass saturation column, signed solid ledger, selectivity prism, claims, trace, and passport
src/components/ElectrochemistryLab.jsx  half-cell switchboard, Nernst rail, and ideal plating theatre
src/components/GasPhaseLab.jsx          piston, ideal/real gas, isotherm, and liquid-vapour bench
src/components/BinaryVleLab.jsx         P-x-y/T-x-y map, split vessel, predictions, closure ledger, trace, and passport
src/components/NonidealThermodynamicsLab.jsx activity membrane, Gibbs terrain, fugacity cell, predictions, trace, and passport
src/components/SpectroscopyLab.jsx      optical-path, spectrum, and calibration bench
src/components/InfraredEvidenceLab.jsx  film scanner, exact probe tags, isomer casefiles, contrasts, trace, and passport
src/components/OrthogonalEvidenceLab.jsx measured NMR tape, ideal isotope tube, four-channel casefiles, contrasts, trace, and passport
src/components/MeasurementEvidenceLab.jsx twin assay calipers, uncertainty vectors, blank gate, predictions, and passport
src/components/ChromatographyLab.jsx   phase/flow/length console, column, detector paper, claims, contrasts, trace, and passport
src/components/FunctionalGroupLab.jsx  atom-socket patchboard, signal router, inventory, contrasts, trace, and passport
src/components/BiomolecularStudio.jsx   peptide loom, ionization field, nucleotide anatomy, and strand zipper
src/components/EnzymeKineticsLab.jsx    enzyme-cycle, inhibition, and progress bench
src/components/MechanismLab.jsx         manual electron-source, destination, and arrow-queue studio
src/components/StereochemistryLab.jsx   mirror centre, planar alkene gate, Newman dial, predictions, trace, and teacher lens
src/components/StereochemicalReactionLab.jsx two-centre projection matrix, inversion tunnel, E2 turnstile, contrasts, action film, and passport
src/components/CrystalLatticeLab.jsx    isometric cubic-cell, diffraction, and point-defect studio
src/components/ElectronicBandLab.jsx    finite level splitter, periodic band loom, gap gate, claims, trace, teacher rail, and passport
src/components/PolymerPopulationLab.jsx two chain looms, count/mass drums, claims, ledger, teacher contrasts, and passport
src/components/CoordinationFieldLab.jsx ideal coordination geometry and manual d-orbital occupation studio
src/components/ReactionLab.jsx          deterministic reaction chamber
src/components/EquationSections.jsx     balancer and model-boundary content
src/data/curriculum.js                  curriculum outcomes and availability
src/data/atomicElements.js              frozen H–Kr NIST configuration, atomic-weight, ionization, and periodic-position records
src/data/nuclearScenarios.js           seven particle records, twenty nuclides, five decay branches, four clocks, six binding records, and boundaries
src/data/molecularGeometryScenarios.js  five ideal parent cages and fourteen frozen AXmEn teaching scenarios
src/data/molecularOrbitalScenarios.js   three qualitative MO orderings and fifteen frozen diatomic teaching scenarios
src/data/electronicBandScenarios.js     six finite chains, five periodic bands, five two-band edge cases, and strict boundaries
src/data/intermolecularScenarios.js     four families, six entities, six pair docks, two symbolic shells, and model boundaries
src/data/stereochemistryScenarios.js    frozen priority sets, alkene arrangements, torsion probes, stations, and boundaries
src/data/stereochemicalReactionScenarios.js frozen two-centre, abstract inversion, and declared beta-H cartridges plus boundaries
src/data/stoichiometryScenarios.js      six declared equations, feeds, coefficients, targets, and boundaries
src/data/electrochemicalCouples.js      declared simple metal half-cells and physical constants
src/data/gasPhaseScenarios.js           NIST-backed critical/Antoine records and experiment metadata
src/data/binaryVleScenarios.js          four ranged pure-component records and two declared ideal binary pairs
src/data/nonidealThermodynamicsScenarios.js synthetic activity, stability, and virial cartridges plus strict boundaries
src/data/chemicalEquilibriumScenarios.js one cited named reaction, three synthetic controls, species, constants, and boundaries
src/data/thermochemistryScenarios.js    selected formation records, three Hess cycles, three synthetic calorimeter observations, and boundaries
src/data/solubilityScenarios.js        four selected solid records, four vessel challenges, four selectivity contrasts, and boundaries
src/data/infraredScenarios.js          six transformed NIST gas-phase records, three isomer cases, labels, provenance, and boundaries
src/data/orthogonalEvidenceScenarios.js six measured proton peak lists, isotope constants, five formula presets, three casefiles, and data notice
src/data/measurementScenarios.js        four synthetic assay comparisons, three blank gates, and declared boundaries
src/data/chromatographyScenarios.js     six synthetic separation challenges, phase cartridges, coefficients, and boundaries
src/data/polymerScenarios.js            three CRU reels, six finite population challenges, and model boundaries
src/data/functionalGroupScenarios.js    twelve group definitions, twelve teaching graphs, targets, inventories, and boundaries
src/data/biomolecularComponents.js      amino-acid, pKa, nucleobase, anatomy, and strand-preset declarations
src/data/scienceSources.js               source registry and model passports
src/chemistry/equilibrium.js             pure 25 °C ideal acid-base calculations
src/chemistry/chemicalEquilibrium.js     pure ideal-gas Q, ΔrG, extent, perturbation, prediction, and hint engine
src/chemistry/atomicStructure.js         pure orbital mutation, reference, Hund/Pauli, quantum-address, and ionization comparison engine
src/chemistry/nuclearChemistry.js       pure decay-ledger, expected half-life, measured-mass binding, evaluation, and hint engine
src/chemistry/molecularGeometry.js       pure immutable domain placement, geometry, polarity-vector, evaluation, hint, and projection engine
src/chemistry/molecularOrbitals.js       pure immutable spin placement, Aufbau/Hund, formal bond-order, magnetism, wave, and hint engine
src/chemistry/electronicBands.js         pure finite spectra/occupation, periodic dispersion/filling, edge geometry, evaluation, and hint engine
src/chemistry/intermolecularInteractions.js pure immutable site selection, rotation, explicit bridge, cleavage, prediction, shell, and hint engine
src/chemistry/stereochemistry.js         pure permutation, mirror, E/Z, torsion, projection, evaluation, profile, and hint engine
src/chemistry/stereochemicalReactions.js pure relationship, backside, antiperiplanar, product-gate, evaluation, and hint engine
src/chemistry/stoichiometry.js           pure amount, extent, limiter, leftovers, yield, and trace calculations
src/chemistry/thermokinetics.js          pure ΔG/K and first-order Arrhenius calculations
src/chemistry/thermochemistry.js        pure signed Hess vectors, formation closure, calorimetry balance, evaluation, and hint engine
src/chemistry/solubilityEquilibrium.js pure ideal Qsp/Ksp, signed solid extent, solubility, threshold, evaluation, and hint engine
src/chemistry/electrochemistry.js        pure half-cell, Nernst, prediction, and Faraday calculations
src/chemistry/gasPhases.js               pure ideal, critical-derived cubic, and saturation calculations
src/chemistry/binaryVle.js               pure ranged Antoine, Raoult boundary, flash, balance, diagram, evaluation, and hint engine
src/chemistry/nonidealThermodynamics.js  pure Margules, regular-solution, gated virial, evaluation, and hint engine
src/chemistry/peptideChemistry.js        pure peptide composition, immutable editing, ionization, and pH(I)
src/chemistry/nucleicAcids.js            pure polymer alphabet, complement, evaluation, and hint engine
src/chemistry/spectrophotometry.js       pure Beer-Lambert, stray-light, and OLS calculations
src/chemistry/infraredEvidence.js         pure cursor analysis, immutable probe, case evaluation, and hint engine
src/chemistry/orthogonalEvidence.js       pure NMR probe, isotope convolution, mass/case evaluation, and hint engine
src/chemistry/measurementUncertainty.js  pure replicate, t-interval, uncertainty-budget, detection, prediction, and hint engine
src/chemistry/chromatography.js          pure retention, Gaussian trace, plate-height, resolution, prediction, hint, and comparison engine
src/chemistry/polymerPopulation.js       pure finite-chain mass, number/mass weighting, comparison, prediction, and hint engine
src/chemistry/functionalGroups.js        pure graph validation, pattern detection, probe, evaluation, and hint engine
src/chemistry/enzymeKinetics.js          pure Michaelis-Menten and linear-inhibition calculations
src/chemistry/electronFlow.js            pure immutable arrow evaluation and commit engine
src/chemistry/crystalLattice.js          pure cubic geometry, diffraction, projection, and defect-state engine
src/chemistry/coordinationField.js       pure d-count, occupation enumeration, field, pairing, and spin engine
src/chemistry/runtime.js                chemistry rules, catalogue, calculations
src/chemistry/controller.js             graph interaction and learning events
src/styles.css                          responsive visual and interaction system
src/styles/atomic-structure.css         lazy-loaded atomic observatory and probability-cloud visual system
src/styles/nuclear-chemistry.css       lazy-loaded lead-glass chamber, segmented clock, and mica binding-ridge visual system
src/styles/molecular-geometry.css       lazy-loaded drafting bench and dark repulsion-cage visual system
src/styles/molecular-orbitals.css       lazy-loaded energy ladder and phase-interferometer visual system
src/styles/electronic-bands.css         lazy-loaded ceramic state loom, energy slats, band ribbons, and gap-gate visual system
src/styles/intermolecular.css           lazy-loaded polarization table, bridge scope, and radial water-compass visual system
src/styles/stoichiometry.css            lazy-loaded freight-yard and yield-weighbridge visual system
src/styles/electrochemistry.css         lazy-loaded redox switchboard and plating-rail visual system
src/styles/gas-phase.css                lazy-loaded piston and phase-laboratory visual system
src/styles/binary-vle.css               lazy-loaded glass-manifold phase-map and split-vessel visual system
src/styles/chemical-equilibrium.css     lazy-loaded reactor, null-detector, shock-strip, and prediction-console visual system
src/styles/thermochemistry.css          lazy-loaded reaction foundry, cancellation gantry, and cutaway copper Dewar visual system
src/styles/solubility-equilibrium.css  lazy-loaded borosilicate column, saturation dial, and logarithmic threshold-prism visual system
src/styles/infrared-evidence.css       lazy-loaded optical bench, spectral film, reticle, casefile, and evidence-ledger visual system
src/styles/orthogonal-evidence.css     lazy-loaded magnetic tape, isotope flight tube, and four-channel crossbar visual system
src/styles/nonideal-thermodynamics.css lazy-loaded mineral activity membrane, common-tangent terrain, and fugacity-cell visual system
src/styles/measurement-evidence.css     lazy-loaded assay calipers, uncertainty vectors, and blank-gate visual system
src/styles/chromatography.css           lazy-loaded analytical instrument face, separation column, and paper-trace visual system
src/styles/polymer-population.css       lazy-loaded chain-loom, skyline, weighting-drum, and vellum-ledger visual system
src/styles/functional-groups.css        lazy-loaded atom patchboard, signal router, and structural-contrast visual system
src/styles/biomolecular.css             lazy-loaded biomolecular loom and strand-zipper visual system
scripts/verify-equilibrium.mjs           numerical reference and invariant checks
scripts/verify-chemical-equilibrium.mjs  scenario, Q, extent, perturbation, prediction, and immutability checks
scripts/verify-atomic-structure.mjs      H–Kr data, orbital mutation, ground-pattern, quantum, and ionization checks
scripts/verify-nuclear-chemistry.mjs    decay closure, expected clocks, mass defect, preservation, hints, and immutability checks
scripts/verify-molecular-geometry.mjs    cage, scenario, placement, preference, angle, vector, prediction, projection, and hint checks
scripts/verify-molecular-orbitals.mjs    ordering, scenario, Pauli, Aufbau, Hund, bond-order, magnetism, wave, and hint checks
scripts/verify-electronic-bands.mjs      finite spectra, immutable occupation, periodic filling, edge geometry, sources, and boundary checks
scripts/verify-intermolecular.mjs        family, entity, site, bridge, strain, cleavage, shell, prediction, and hint checks
scripts/verify-stoichiometry.mjs         amount, extent, limiter, closure, prediction, and yield checks
scripts/verify-thermokinetics.mjs        thermo/kinetic reference and invariant checks
scripts/verify-thermochemistry.mjs      source data, Hess cancellation, calorimetry closure, preservation, and hint checks
scripts/verify-solubility-equilibrium.mjs solid data, signed extent, common-ion, thresholds, preservation, and hint checks
scripts/verify-electrochemistry.mjs      direction, Nernst, thermodynamic, and electrolysis checks
scripts/verify-gas-phases.mjs            gas-law, cubic, prediction, and saturation checks
scripts/verify-nonideal-thermodynamics.mjs activity roots, stability boundaries, virial gate, predictions, hints, and immutability checks
scripts/verify-binary-vle.mjs            ranged data, P-x-y/T-x-y, five-region, closure, prediction, and hint checks
scripts/verify-peptide-chemistry.mjs     residue, formula, water, ionization, pH(I), and immutability checks
scripts/verify-nucleic-acids.mjs         alphabet, direction, complement, preservation, and hint checks
scripts/verify-spectrophotometry.mjs     absorbance, regression, and instrument-response checks
scripts/verify-infrared-evidence.mjs     records, traces, probes, case claims, provenance, boundaries, and immutability checks
scripts/verify-orthogonal-evidence.mjs   measured peak lists, probes, isotope convolution, crossbar claims, and immutability checks
scripts/verify-measurement-uncertainty.mjs scenario, Student-t, uncertainty, detection, prediction, and immutability checks
scripts/verify-chromatography.mjs        frozen challenges, retention, Gaussian widths, plates, resolution, predictions, hints, and comparison checks
scripts/verify-functional-groups.mjs     frozen graphs, detectors, suppression, probe, prediction, and hint checks
scripts/verify-enzyme-kinetics.mjs       saturation, inhibition, and progress checks
scripts/verify-electron-flow.mjs         source, destination, queue, and electron-ledger checks
scripts/verify-crystal-lattice.mjs       cubic reference, Bragg, projection, and defect-state checks
scripts/verify-polymer-population.mjs    CRU data, finite-chain averages, weighting, comparison, preservation, and hint checks
scripts/verify-coordination-field.mjs    d-count, crossover, occupation, spin, and immutability checks
audit/                                  prior engine and structure-audit evidence
docs/superpowers/plans/                 implementation architecture and roadmap
```

The chemistry runtime is deliberately separate from curriculum copy and interface presentation. Scientific extensions should add a declared engine or dataset rather than embedding unexplained product guesses in UI code.

## Meaning of each structure verdict

- **Valid**: implemented Lewis, valence, charge, and connectivity rules certify the graph.
- **Open**: the graph is radical, electron-deficient, incomplete, disconnected, or not closed shell.
- **Unsupported**: the species may be real, but the current model cannot make a reliable validity claim.
- **Invalid**: the graph violates a definite implemented bonding, charge, shell, valence, or graph rule.

## Existing audit evidence

The earlier deterministic engine audit processed the first 1,000 structures in RDKit's bundled NCI sample dataset using RDKit 2025.09.4:

- 1,000 structures processed without crashes
- 986 certified as valid by the implemented model
- 3 classified as open, radical, incomplete, or disconnected
- 11 classified as outside the current model
- 0 reference structures falsely labelled invalid
- 1,000/1,000 formulas parsed correctly
- 1,000/1,000 net charges matched
- 1,000/1,000 molar masses matched within 0.05 g/mol
- 1,000/1,000 MOL exports parsed back successfully with RDKit
- 1,000/1,000 deliberately invalid controls rejected

The preserved results are in [`audit/`](audit/). These results support the tested graph and calculation scope only; they are not universal reaction or curriculum validation.

The atomic-structure engine has its own deterministic verifier. It checks all 36 neutral H–Kr records against atomic-number electron totals, carbon's `1s2 2s2 2p2` maximum-unpaired pattern, NIST chromium and copper `3d/4s` exceptions, immutable allowed and blocked spin placement, explicit electron removal, noble-gas-core loading, independent Hund feedback, exact `n/l/ml/ms` addresses, non-mutating hints, and the measured Be/B and N/O first-ionization reversals. The orbital theatre remains a qualitative isosurface silhouette; these checks do not establish arbitrary ionic or excited configurations, term symbols, spectra, orbital energies, quantitative radii, electron affinity, molecular bonding, or many-electron wavefunctions.

The stoichiometry engine has its own deterministic verification command. For the declared `2H2 + O2 → 2H2O` reference, 5 mol H2 plus 2 mol O2 gives `ξmax = 2 mol`, identifies O2 as limiting, leaves 1 mol H2, and forms 4 mol or 72.060 g H2O with exact mass closure under the local average-mass table. It separately checks a 4:2 stoichiometric tie, equivalent gram and mole feeds, a methane multi-product ledger, exact entity conversion, retained correct and incorrect predictions, monotonic reaction-extent traces, 75% isolated yield, and an unclamped 111.02% audit inconsistency. These are outputs of the selected declared equation and complete-conversion assumption—not reaction-occurrence, experimental-conversion, purity, or procedure claims.

The solution-equilibrium engine has a separate deterministic verification command. Its reference 0.100 M weak-acid example checks initial dissociation, pH = pKa at half-equivalence, basic conjugate-base hydrolysis at equivalence, excess-base pH, monotonic curve behavior, bounded species fractions, conservation, and invalid-input rejection.

The reaction-quotient engine has a separate deterministic verification command. It checks four immutable scenario records, zero/finite/infinite/indeterminate Q handling, signed feasible extent bounds, the cited sulfuryl-chloride equilibrium near 0.73/1.42/1.42 bar, Q/K closure for every scenario, add/remove and volume shocks, catalyst invariance, the difference between inert gas at fixed volume and fixed pressure, preserved wrong predictions, invalid-input rejection, and four non-mutating hints. These checks establish only the displayed fixed-temperature one-reaction ideal-gas model—not arbitrary equilibrium constants, real-mixture behavior, kinetics, or experimental feasibility.

The thermodynamics and kinetics engine also has a deterministic verification command. It checks ΔG° and K at 298 K and 600 K, Arrhenius rate constants and half-lives, temperature response, first-order trace monotonicity, catalyst invariance of ΔG° and K, and rejection of transition states below either reaction endpoint.

The thermochemistry engine checks eight immutable selected formation-enthalpy records, three exact Hess path sums, signed whole-equation scaling, species-vector cancellation, formation-ledger closure, parked and stale learner states, three synthetic ideal calorimeter balances, solution-plus-vessel heat closure, reaction-system sign inversion, vessel-omission magnitude, preserved correct and incorrect claims, eight non-mutating hints, invalid-input rejection, and recursive output immutability. These checks establish the displayed bookkeeping only—not reaction occurrence, measured thermochemistry, calorimeter performance, compound identity, experimental uncertainty, mechanism, safety, or procedure.

The solubility-equilibrium engine checks four recursively immutable 298.15 K solid records, transparent silver-halide electrode-potential derivation, the selected calcium-fluoride pKsp record, exact pure-solvent stoichiometric solubility, chloride common-ion suppression, signed finite-solid dissolution and precipitation, Qsp-to-Ksp closure, ion and solid-mass balances, four composition-dependent silver-halide onset orders, a concentration-flipped order, 99.9% target windows, coincident thresholds, preserved correct and incorrect claims, eight non-mutating hints, invalid-input rejection, and recursive output immutability. These checks establish the displayed ideal concentration-ratio model only—not thermodynamic nonideality, kinetics, visible precipitation, identity, purity, recovery, validated separation, or procedure.

The electrochemistry engine checks the standard Zn/Cu cell at 1.1026 V, its balanced two-electron reaction, ΔG° = -212.77 kJ mol⁻¹, log₁₀K = 37.28, and the nonstandard `a(Zn²⁺) = 10`, `a(Cu²⁺) = 0.1` state at 1.04344 V. It also checks electron balancing for Zn/Ag, retained correct and incorrect learner predictions, monotonic potential traces, and ideal copper deposition at 2 A for 1,800 s: 1.18549 g at 100% supplied current efficiency and 0.94840 g at 80%. These are deterministic reference outputs of the displayed equilibrium and ideal charge-to-mass models—not measurements or real-cell performance evidence.

The gas and phase engine checks the shared 298.15 K/1 bar ideal baseline, Boyle/Charles/Avogadro invariants, preserved wrong predictions, critical-derived van der Waals parameters for three NIST-backed presets, exact pressure-term closure, immutable V ≤ nb rejection, raw subcritical-loop warnings, pure-water saturation pressure, in-range Antoine inversion, and evaporation/equilibrium/condensation classifications. Exactly 1 bar is not extrapolated beyond the selected water correlation's 373 K upper limit.

The biomolecular assembly engines have separate deterministic verification commands. The peptide verifier checks all 20 declared amino-acid records, N/C extension order, residue-cap immutability, exact condensation and hydrolysis water bookkeeping, Gly-Ala composition and average molar mass, monotonic fractional charge, and classroom pH(I) reference cases. The nucleic-acid verifier checks DNA and RNA alphabets, antiparallel versus conventional complement direction, canonical hydrogen-bond totals, preserved wrong-but-valid placements, immutable polymer-invalid rejection, incomplete/incorrect/complete states, and non-mutating hints. These checks establish consistency with the displayed classroom models; they do not validate folding, stability, function, genetics, or real biomolecular behavior.

The spectrophotometry engine checks the Gaussian teaching band's peak and full width at half maximum, Beer-Lambert path-length scaling, wavelength-dependent sensitivity, unconstrained OLS residuals, exact ideal inverse prediction, NIST-style stray-light compression, extrapolation status, bounded transmittance, and invalid-input rejection. The visible standards and spectrum are generated teaching data, not measurements.

The measurement-evidence engine checks sample statistics and exact 95% Student-t interval construction for 3–31 replicates, observed repeatability versus reference difference, one independent Type A/Type B root-sum-square teaching budget, explicit expanded uncertainty, and a declared blank-mean-plus-factor-times-blank-standard-deviation detection gate. It preserves negative blank responses, unusual observations, and wrong predictions. These checks establish only the displayed synthetic evidence model—not method validation, certified trueness, automatic outlier decisions, real uncertainty propagation, selectivity, quantitation limits, false-decision rates, or regulatory conclusions.

The chromatography engine checks six immutable synthetic challenges, exact hold-up and retention identities, separation-factor ordering, Gaussian half-height and base widths, plate-number recovery, summed component detector signals, three resolution bands, slow and fast plate-height branches, stationary-phase order reversal, column-length scaling, preserved wrong claims, four non-mutating hints, and immutable run comparisons. These checks establish only the frozen two-component teaching model—not a measured chromatogram, real phase or solvent behavior, compound identity, purity, concentration, validated method, or instrument procedure.

The functional-group engine validates each frozen graph, resolves all twelve declared connectivity/bond-order detectors, verifies the target characteristic-atom set, preserves learner-selected atom order and wrong predictions, and checks the broad carbonyl umbrella and order-insensitive whole-molecule inventory independently. It explicitly verifies that acid is not double-counted as alcohol, ester as ether, or amide as amine. These checks establish only the displayed neutral teaching graphs—not universal substructure perception, nomenclature, aromaticity, charged forms, reactivity, properties, or experimental evidence.

The enzyme-kinetics engine checks the Michaelis-Menten half-saturation identity, active-enzyme scaling, finite-substrate asymptotes, competitive and uncompetitive parameter fingerprints, the equal-constant pure non-competitive special case, asymmetric mixed inhibition, normalized denominator weights, monotonic substrate-depletion/product-formation traces, mass conservation, and invalid-input rejection.

The electron-flow engine checks all four declared templates, every permitted source-destination pair, template-specific blocked reasons, immutable queues, one-use electron sources, incomplete commits, order-independent complete commits, non-mutating hints, formal product locks, and the two-electrons-per-full-arrow ledger.

The crystal-lattice engine checks the exact SC/BCC/FCC site-sharing totals, coordination and hard-sphere contact invariants, packing fractions, density unit conversion, signed Miller-plane geometry, cubic spacing, Bragg solutions, monatomic BCC/FCC centring extinctions, projection finiteness, and immutable vacancy/substitution/interstitial/restore actions.

The polymer-population engine checks three immutable repeating-unit teaching records, six frozen finite-population contrasts, chain-mass arithmetic with declared end groups, exact number- and mass-fraction closure, `Mw >= Mn`, uniform-population `ĐM = 1`, equal-`Mn`/different-`Mw` spread, long-tail leverage, count-versus-mass weighting, identical degree bins with different CRU masses, short-chain end-group significance, and two different skylines with equal first and second moments. It also verifies preserved wrong predictions, four non-mutating hints, invalid-input rejection, and recursive output immutability. These checks establish the displayed finite arithmetic only—not measured molecular-mass distributions, real polymer architecture, morphology, processing, properties, or synthesis control.

The coordination-field engine checks eleven declared first-row ion d counts, three zero-barycentre orbital diagrams, exhaustive five-orbital configurations, octahedral d5/d6 crossover cases, tetrahedral d5, normalized square-planar d8, field and pairing ledgers, spin-only outputs, degenerate-equivalent acceptance, immutable electron toggles, blocked overfill, wrong-total explanations, and non-mutating hints.

## Scientific and safety boundary

ChemLab Studio is an educational representation and reasoning environment. It is not a universal reaction oracle, a quantum simulator, a synthesis planner, or a replacement for supervised physical laboratory work.

Real outcomes can depend on solvent, temperature, pressure, concentration, phase, catalyst, light, kinetics, surfaces, impurities, and measurement method. Missing conditions must produce an explicit boundary or uncertainty—not an invented product.

The stoichiometry foundry starts from one of six declared balanced overall equations and assumes complete conversion only until the first coefficient-normalized feed is exhausted. Feed amount and unit, target product, predictions, and isolated mass are learner inputs. Its particle packets are symbolic amount tokens. The engine does not predict that a reaction occurs, choose products, calculate equilibrium conversion or rate, handle side products, infer purity or wetness, apply uncertainty or significant-figure policy, or provide an operating procedure. Theoretical yield is a model upper bound; an entry above 100% remains visible as an unresolved audit inconsistency.

The current solution bench is limited to an ideal dilute aqueous monoprotic weak acid titrated by a strong monovalent base at 25 °C. Its pKa, concentrations, and volumes are learner inputs. It does not include activities, ionic strength, polyprotic systems, temperature corrections, precipitation, complexation, real indicator spectra, or instrument response.

The reaction-quotient observatory is limited to one reversible ideal-gas reaction and one extent coordinate at a fixed declared temperature. Reacting activities are `pᵢ/p°` with `p° = 1 bar`; a fixed-pressure inert-gas case uses an ideal moving-volume constraint. Its equal-flux arrows are symbolic and no rate is calculated. The module does not infer reactions or K, vary temperature, model nonideal fugacity, include liquids, solids, or solutes, solve coupled or phase equilibria, or provide apparatus, quantities, handling, or procedure.

The energy bench is a standard-state, constant-ΔH°/ΔS°, one-step first-order model. Its reaction coordinate is schematic and its ΔH°, ΔS°, activation energy, Arrhenius prefactor, catalyst lowering, and temperature are learner inputs. It does not provide a measured reaction profile, molecular transition state, multistep mechanism, nonideal activity model, diffusion limit, tunnelling treatment, or catalyst selectivity prediction.

The thermochemical cycle studio uses selected standard formation-enthalpy records at 298.15 K for eight declared species and three frozen Hess challenges. Its calorimeter mode uses synthetic observations and the ideal relations `qsolution = mcpΔT`, `qcal = CcalΔT`, `qsurroundings = qsolution + qcal`, and `qsystem = −qsurroundings`, with a learner-entered reaction extent. It does not infer whether a reaction occurs, identify a material, model mixing or apparatus, correct heat loss, account for phase changes beyond the declared records, propagate uncertainty, validate measured data, or provide quantities, handling, or procedure.

The solubility and selective-precipitation studio contains only AgCl, AgBr, AgI, and CaF2 selected teaching records at 298.15 K. It substitutes ideal concentration ratios for ion activities, assumes additive source volumes, omits spectator ions, and solves one solid extent or two 1:1 silver-halide onset thresholds. It excludes activity coefficients, ionic-strength corrections, ion pairing, complexes, hydrolysis, acid-base coupling, multiple solids, polymorphs, co-precipitation, adsorption, nucleation, induction time, particle growth, settling, turbidity, measured appearance, identity, purity, recovery, uncertainty, method validation, reagent quantities, handling, and procedure.

The electrochemical bench combines declared standard reduction potentials for six simple aqueous metal-ion/metal half-cells with learner-defined ion activities and temperature. It applies the Nernst equation to an equilibrium open-circuit potential, derives ΔG and K for the balanced overall reaction, and applies ideal Faraday mass bookkeeping with a supplied current-efficiency fraction. It does not calculate current, power, capacity, loaded voltage, internal resistance, junction potential, overpotential, electrode kinetics, mass transport, side reactions, corrosion, passivation, morphology, battery cycling, instrument response, or safe operating procedure.

The gas and phase bench has three deliberately separate layers. Its controlled gas-law experiments are exact only for the ideal model. Its van der Waals `a` and `b` values are derived from displayed NIST critical constants and form a low-accuracy classroom cubic comparison, not a fitted property equation; raw subcritical loops are not coexistence plateaus. Its pure-water saturation calculation uses one NIST Antoine record only inside the declared range. The bench excludes mixture VLE, fugacity/activity calculation, Maxwell construction, phase fractions, nucleation and rates, caloric/transport properties, humidity, solid phases, reaction, and all vessel, process, or safety design use.

The nonideal thermodynamics observatory is separate from both that pure-gas bench and the ideal Binary Equilibrium Navigator. Its liquid activity instrument uses synthetic three-suffix Margules parameters, fixed synthetic pure-component saturation pressures, and an ideal vapour to expose activity coefficients, excess Gibbs energy, pressure departure, and interior `y1 = x1` roots. Its stability terrain uses only the symmetric dimensionless regular-solution equation to separate local curvature, binodal coexistence, spinodal limits, common tangency, and lever-rule phase amounts. Its pure-gas cell truncates the density virial equation after `B` and releases `Z`, `φ`, and `f` only when `|BP/(RT)| <= 0.12`. It does not fit measured mixtures, predict named-mixture azeotropes, identify a real material phase diagram, calculate multicomponent/solid/reactive/caloric equilibrium, provide reference-quality gas properties, model kinetics or morphology, or supply process, apparatus, handling, or safety instruction.

The spectroscopy bench uses an unnamed Gaussian absorption band, Beer-Lambert response, an unconstrained six-point OLS fit, and an optional unabsorbed-stray-light model. Band shape, molar absorption coefficient, path length, wavelength, calibration range, simulated unknown, and stray-light fraction are learner inputs. That spectroscopy bench itself does not provide a measured or reference spectrum, compound identification, matrix chemistry, random instrument noise, physical replicates, certified reference values, or chromatographic separation.

The infrared evidence studio is deliberately separate from that synthetic calibration bench. It displays transformed derivative traces from six cited NIST gas-phase records, scores only declared local feature windows, and asks learners to distinguish one member of a same-formula pair from the other. A successful casefile means the selected feature supports that bounded contrast—not that a complete identity, purity, concentration, phase, or mixture claim has been established.

The orthogonal structure-evidence studio is separate again. Its six proton-NMR cartridges retain measured source ppm coordinates, atom-reference integration counts, identifiers, and conditions, but do not reconstruct raw signals or invent source-unreported exchangeable evidence. Its mass tube calculates an ideal neutral-composition natural-abundance envelope rather than reproducing a measured mass spectrum. The three casefiles ask whether formula, existing IR evidence, measured proton environments, and ideal isotope composition can separate one declared candidate from one other candidate. A successful five-claim audit supports only that bounded pair comparison; it does not establish identity, purity, concentration, absence of mixtures, or method validity.

The separate measurement evidence bench uses only frozen or learner-edited synthetic replicate and blank values. It calculates sample standard deviation, standard error, a two-sided 95% Student-t interval for a mean, one independent Type B component, `uc = √(uA² + uB²)`, `U = kuc`, and `xL = xBlank + kDetection sBlank`. It keeps the confidence interval, expanded-uncertainty interval, and detection threshold visibly separate. It does not supply operational sampling or instrument procedure, automatically remove an outlier, validate a method, certify a reference value, calculate covariance or nonlinear propagation, define a quantitation limit, or make clinical, environmental, forensic, quality-release, or regulatory decisions.

The chromatography control room uses six frozen synthetic two-component challenges. The learner selects one of three teaching phases, a 5/15/25 cm length coordinate, and a dimensionless relative velocity before explicitly running the trace. The engine calculates `H* = A + B/u + Cu`, `tM`, adjusted and total `tR`, `k`, `alpha`, Gaussian widths, `N`, and `Rs`; the coefficients and response weights are synthetic. It excludes real solvents, commercial phases, pressure, temperature, gradients, injection, overload, asymmetry, extra-column effects, detector noise, integration, concentration, quantitation, reference matching, identity, purity, validation, robustness, uncertainty, chemical handling, and instrument procedure.

The functional group signal board operates only on twelve frozen neutral connectivity graphs. Diagnostic O–H, N–H, and aldehydic C–H hydrogens are explicit; other hydrocarbon hydrogens are declared implicit. The board reports twelve bounded structural patterns and uses immediate-neighbour suppression rules for acid, ester, and amide. It does not classify learner-drawn arbitrary molecules, resolve aromaticity or rings, generate IUPAC names, choose principal groups, represent protonation, tautomerism, resonance, or stereochemistry, infer physical or biological properties, predict any reaction or product, or provide synthesis and handling procedures.

The enzyme bench is a synthetic, one-variable-substrate, quasi-steady Michaelis-Menten model with reversible linear competitive and uncompetitive components. Its kcat, active-enzyme concentration, KM, substrate, inhibitor, Kic, and Kiu are learner inputs. KM is not presented as a universal dissociation constant, and normalized denominator terms are not presented as measured occupancies. The model excludes enzyme identity, elementary mechanism, multiple substrates, reverse reaction, product inhibition, inactivation, pH/temperature profiles, cooperativity, allostery, pre-steady-state behavior, experimental fitting, and parameter uncertainty.

The mechanism studio is a formal two-electron notation engine for four declared teaching templates. It does not predict arbitrary products, prove an experimental mechanism, search conformations, compare pathways, infer regioselectivity or stereochemistry, calculate rates or yields, handle radical fish-hook arrows, or provide synthesis planning. Its successful result means only that the complete expected arrow set for the displayed template was supplied by the learner.

The Stereochemical Reaction Theatre is deliberately separate from that electron-arrow notation engine and from the single-centre navigation studio. It compares exactly two frozen local descriptors with a declared symmetry flag, gates one abstract inversion map by a visible backside angle, or gates one declared beta-H elimination channel by a visible H–C–C–LG torsion. Geometric inversion is not treated as a guarantee that the absolute R/S letter changes, and an allowed E2 channel is not treated as evidence of rate, occurrence, yield, regioselectivity, or product ratio. It excludes arbitrary recursive CIP, more than two centres, pseudoasymmetry, rings and chairs, non-centre chirality, SN1/E1 and pathway competition, solvent and conditions, barriers and quantum orbitals, measured selectivity, product validation, and procedure.

The crystal studio is an ideal monatomic cubic teaching model. SC, BCC, and FCC selections are geometric references, not identified or stable real materials. Density uses learner-defined molar mass and lattice parameter; diffraction applies cubic spacing, Bragg geometry, and monatomic centring conditions without form factors, intensities, peak shapes, thermal motion, strain, phase mixtures, or instrument response. Its finite defect edits do not determine defect energy, equilibrium concentration, relaxation, diffusion, or any electrical, optical, thermal, or mechanical property.

The polymer population studio contains only three declared linear homopolymer teaching reels and six finite synthetic representative-chain populations. Each chain mass is `Mend + XMrepeat`; the interface calculates number fractions, mass fractions, `Xn`, `Mn`, `Mw`, `ĐM`, and declared end-group mass share only after an explicit learner analysis. It does not represent measured SEC/GPC data, branching, crosslinks, copolymer sequence, tacticity, conformation, entanglement, morphology, crystallinity, thermal transitions, rheology, mechanics, transport, processing, additives, ageing, degradation, polymerization kinetics, reaction conditions, sample preparation, experimental uncertainty, property prediction, or synthesis procedure.

The coordination studio uses declared ideal octahedral and tetrahedral coefficients plus a normalized qualitative square-planar ordering. It exhaustively minimizes a one-electron field contribution plus one scalar cost per paired orbital. A successful occupation is not a prediction of a real complex. The model excludes ligand-specific covalency, Racah and angular-overlap parameters, term symbols, Jahn-Teller distortion, spin-orbit and exchange coupling, temperature populations, measured susceptibility, spectra, colour, geometry preference, stability, and reactions.

The project does not provide operational quantities or step-by-step hazardous synthesis procedures.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before changing chemistry behavior. The most valuable additions are bounded learning tools with:

- an explicit learner outcome;
- a declared law, model, numerical method, or measured data source;
- conditions and known limitations;
- a failure explanation;
- a student journey and teacher review path.

## License

ChemLab Studio is available under the [MIT License](LICENSE).
