const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
};

const measuredRecord = (record) => ({
  sourceKind: 'measured-peak-list',
  nucleus: '1H',
  accessedOn: '2026-08-30',
  transformation: 'Measured source peak-list ppm values retained; identical shifts merged; displayed integration derived only from source atomRefs count; no raw CML, FID, intensity, coupling constant, or measured line shape reproduced.',
  ...record,
});

export const NMR_SIGNAL_REGIONS = deepFreeze([
  { id: 'alkyl', label: '0–2 ppm teaching band', rangePpm: [0, 2], color: '#67d7d1', note: 'A broad navigation band, not an automatic structural assignment.' },
  { id: 'adjacent', label: '2–4.5 ppm teaching band', rangePpm: [2, 4.5], color: '#ffc45e', note: 'A broad navigation band that can include several distinct chemical environments.' },
  { id: 'unsaturated', label: '4.5–8.5 ppm teaching band', rangePpm: [4.5, 8.5], color: '#a9b5be', note: 'A broad navigation band; no aromatic or alkene structure is inferred automatically.' },
  { id: 'high-frequency', label: '8.5–12.5 ppm teaching band', rangePpm: [8.5, 12.5], color: '#ee7697', note: 'Selected high-frequency evidence in these records; solvent, reference, exchange, and molecular context still matter.' },
]);

export const PROTON_NMR_RECORDS = deepFreeze([
  measuredRecord({
    id: '1-propanol-1h-nmr', code: 'NMR 01', name: '1-Propanol', formula: 'C₃H₈O', composition: { C: 3, H: 8, O: 1, Cl: 0, Br: 0 }, structure: 'CH₃–CH₂–CH₂–OH', smiles: 'CCCO',
    spectrumId: 10012286, moleculeId: 10008030, solvent: 'Tetrachloromethane (CCl₄)', fieldMHz: 60, sourceTemperatureK: 0, temperatureK: null, temperatureNote: 'The source exports 0.0 K; this studio treats that value as unavailable metadata, not a physical acquisition temperature.', assignmentMethod: null,
    observedProtonCount: 8, formulaProtonCount: 8, unreportedExchangeableProtons: 0,
    peaks: [
      { id: '1-propanol-methyl', ppm: 0.94, protonCount: 3, reportedMultiplicity: null },
      { id: '1-propanol-middle', ppm: 1.49, protonCount: 2, reportedMultiplicity: null },
      { id: '1-propanol-oxygen-methylene', ppm: 3.5, protonCount: 2, reportedMultiplicity: null },
      { id: '1-propanol-oh', ppm: 3.71, protonCount: 1, reportedMultiplicity: null },
    ],
    sourceId: 'nmrshiftdb1Propanol1h', sourceUrl: 'https://nmrshiftdb.nmr.uni-koeln.de/NmrshiftdbServlet/nmrshiftdbaction/searchorpredict/smiles/CCCO/spectrumtype/1H',
  }),
  measuredRecord({
    id: '2-propanol-1h-nmr', code: 'NMR 02', name: '2-Propanol', formula: 'C₃H₈O', composition: { C: 3, H: 8, O: 1, Cl: 0, Br: 0 }, structure: '(CH₃)₂CH–OH', smiles: 'CC(O)C',
    spectrumId: 20197100, moleculeId: 10016625, solvent: 'Chloroform-D1 (CDCl₃)', fieldMHz: 300.1, sourceTemperatureK: 297, temperatureK: 297, temperatureNote: null, assignmentMethod: '1D shift positions',
    observedProtonCount: 7, formulaProtonCount: 8, unreportedExchangeableProtons: 1,
    peaks: [
      { id: '2-propanol-methyls', ppm: 1.22, protonCount: 6, reportedMultiplicity: null },
      { id: '2-propanol-methine', ppm: 4.04, protonCount: 1, reportedMultiplicity: null },
    ],
    sourceId: 'nmrshiftdb2Propanol1h', sourceUrl: 'https://nmrshiftdb.nmr.uni-koeln.de/NmrshiftdbServlet/nmrshiftdbaction/searchorpredict/smiles/CC%28O%29C/spectrumtype/1H',
  }),
  measuredRecord({
    id: 'propanal-1h-nmr', code: 'NMR 03', name: 'Propanal', formula: 'C₃H₆O', composition: { C: 3, H: 6, O: 1, Cl: 0, Br: 0 }, structure: 'CH₃–CH₂–CHO', smiles: 'CCC=O',
    spectrumId: 31266, moleculeId: 10016745, solvent: 'Chloroform-D1 (CDCl₃)', fieldMHz: 60, sourceTemperatureK: 318, temperatureK: 318, temperatureNote: null, assignmentMethod: '1D shift positions',
    observedProtonCount: 6, formulaProtonCount: 6, unreportedExchangeableProtons: 0,
    peaks: [
      { id: 'propanal-methyl', ppm: 1.1, protonCount: 3, reportedMultiplicity: null },
      { id: 'propanal-methylene', ppm: 2.45, protonCount: 2, reportedMultiplicity: null },
      { id: 'propanal-aldehyde', ppm: 9.7, protonCount: 1, reportedMultiplicity: null },
    ],
    sourceId: 'nmrshiftdbPropanal1h', sourceUrl: 'https://nmrshiftdb.nmr.uni-koeln.de/NmrshiftdbServlet/nmrshiftdbaction/searchorpredict/smiles/CCC%3DO/spectrumtype/1H',
  }),
  measuredRecord({
    id: 'acetone-1h-nmr', code: 'NMR 04', name: 'Acetone', formula: 'C₃H₆O', composition: { C: 3, H: 6, O: 1, Cl: 0, Br: 0 }, structure: 'CH₃–C(=O)–CH₃', smiles: 'CC(=O)C',
    spectrumId: 31270, moleculeId: 10007820, solvent: 'Chloroform-D1 (CDCl₃)', fieldMHz: 60, sourceTemperatureK: 318, temperatureK: 318, temperatureNote: null, assignmentMethod: '1D shift positions',
    observedProtonCount: 6, formulaProtonCount: 6, unreportedExchangeableProtons: 0,
    peaks: [{ id: 'acetone-methyls', ppm: 2.2, protonCount: 6, reportedMultiplicity: null }],
    sourceId: 'nmrshiftdbAcetone1h', sourceUrl: 'https://nmrshiftdb.nmr.uni-koeln.de/NmrshiftdbServlet/nmrshiftdbaction/searchorpredict/smiles/CC%28%3DO%29C/spectrumtype/1H',
  }),
  measuredRecord({
    id: 'ethyl-acetate-1h-nmr', code: 'NMR 05', name: 'Ethyl acetate', formula: 'C₄H₈O₂', composition: { C: 4, H: 8, O: 2, Cl: 0, Br: 0 }, structure: 'CH₃–C(=O)–O–CH₂–CH₃', smiles: 'CCOC(=O)C',
    spectrumId: 20099202, moleculeId: 10008694, solvent: 'Unreported', fieldMHz: null, sourceTemperatureK: null, temperatureK: null, temperatureNote: 'Field, temperature, and solvent are unreported in the selected source record.', assignmentMethod: null,
    observedProtonCount: 8, formulaProtonCount: 8, unreportedExchangeableProtons: 0,
    peaks: [
      { id: 'ethyl-acetate-terminal-methyl', ppm: 1.2, protonCount: 3, reportedMultiplicity: 't' },
      { id: 'ethyl-acetate-acyl-methyl', ppm: 1.97, protonCount: 3, reportedMultiplicity: 's' },
      { id: 'ethyl-acetate-methylene', ppm: 4.1, protonCount: 2, reportedMultiplicity: 'q' },
    ],
    sourceId: 'nmrshiftdbEthylAcetate1h', sourceUrl: 'https://nmrshiftdb.nmr.uni-koeln.de/NmrshiftdbServlet/nmrshiftdbaction/searchorpredict/smiles/CCOC%28%3DO%29C/spectrumtype/1H',
  }),
  measuredRecord({
    id: 'butanoic-acid-1h-nmr', code: 'NMR 06', name: 'Butanoic acid', formula: 'C₄H₈O₂', composition: { C: 4, H: 8, O: 2, Cl: 0, Br: 0 }, structure: 'CH₃–CH₂–CH₂–C(=O)–OH', smiles: 'CCCC(=O)O',
    spectrumId: 10012285, moleculeId: 10008029, solvent: 'Tetrachloromethane (CCl₄)', fieldMHz: 60, sourceTemperatureK: 0, temperatureK: null, temperatureNote: 'The source exports 0.0 K; this studio treats that value as unavailable metadata, not a physical acquisition temperature.', assignmentMethod: null,
    observedProtonCount: 8, formulaProtonCount: 8, unreportedExchangeableProtons: 0,
    peaks: [
      { id: 'butanoic-acid-methyl', ppm: 0.9, protonCount: 3, reportedMultiplicity: null },
      { id: 'butanoic-acid-middle', ppm: 1.67, protonCount: 2, reportedMultiplicity: null },
      { id: 'butanoic-acid-alpha', ppm: 2.29, protonCount: 2, reportedMultiplicity: null },
      { id: 'butanoic-acid-oh', ppm: 11.97, protonCount: 1, reportedMultiplicity: null },
    ],
    sourceId: 'nmrshiftdbButanoicAcid1h', sourceUrl: 'https://nmrshiftdb.nmr.uni-koeln.de/NmrshiftdbServlet/nmrshiftdbaction/searchorpredict/smiles/CCCC%28%3DO%29O/spectrumtype/1H',
  }),
]);

export const PROTON_NMR_RECORD_BY_ID = deepFreeze(Object.fromEntries(PROTON_NMR_RECORDS.map((record) => [record.id, record])));

export const ISOTOPE_COMPOSITIONS = deepFreeze({
  H: [{ massNumber: 1, exactMass: 1.00782503223, abundance: 0.999885 }, { massNumber: 2, exactMass: 2.01410177812, abundance: 0.000115 }],
  C: [{ massNumber: 12, exactMass: 12, abundance: 0.9893 }, { massNumber: 13, exactMass: 13.00335483507, abundance: 0.0107 }],
  O: [{ massNumber: 16, exactMass: 15.99491461957, abundance: 0.99757 }, { massNumber: 17, exactMass: 16.9991317565, abundance: 0.00038 }, { massNumber: 18, exactMass: 17.99915961286, abundance: 0.00205 }],
  Cl: [{ massNumber: 35, exactMass: 34.968852682, abundance: 0.7576 }, { massNumber: 37, exactMass: 36.965902602, abundance: 0.2424 }],
  Br: [{ massNumber: 79, exactMass: 78.9183376, abundance: 0.5069 }, { massNumber: 81, exactMass: 80.9162897, abundance: 0.4931 }],
});

export const MASS_FINGERPRINT_OPTIONS = deepFreeze([
  { id: 'minor', label: 'M+2 is minor', detail: 'No dominant single-halogen +2 partner in this bounded classifier.' },
  { id: 'one-third', label: 'M+2 is about one-third of M', detail: 'Characteristic of one chlorine atom in this ideal natural-abundance model.' },
  { id: 'near-equal', label: 'M+2 is near M', detail: 'Characteristic of one bromine atom in this ideal natural-abundance model.' },
  { id: 'multi-halogen', label: 'Multi-halogen envelope', detail: 'More than one Cl/Br atom produces a wider combinatorial +2 pattern.' },
]);

export const MASS_EVIDENCE_PRESETS = deepFreeze([
  { id: 'propanol-formula', code: 'MASS 01', name: 'Propanol isomers', formula: 'C₃H₈O', composition: { C: 3, H: 8, O: 1, Cl: 0, Br: 0 }, lesson: 'Same formula means the ideal molecular-ion isotope envelope cannot choose 1-propanol versus 2-propanol.' },
  { id: 'carbonyl-formula', code: 'MASS 02', name: 'C₃H₆O isomers', formula: 'C₃H₆O', composition: { C: 3, H: 6, O: 1, Cl: 0, Br: 0 }, lesson: 'Propanal and acetone share this formula and therefore this ideal envelope.' },
  { id: 'oxygen-pair-formula', code: 'MASS 03', name: 'C₄H₈O₂ isomers', formula: 'C₄H₈O₂', composition: { C: 4, H: 8, O: 2, Cl: 0, Br: 0 }, lesson: 'Ethyl acetate and butanoic acid share this formula and ideal envelope.' },
  { id: 'chloropropane-formula', code: 'MASS 04', name: 'One chlorine', formula: 'C₃H₇Cl', composition: { C: 3, H: 7, O: 0, Cl: 1, Br: 0 }, lesson: 'One ³⁷Cl isotope creates an M+2 partner near one-third of M.' },
  { id: 'bromopropane-formula', code: 'MASS 05', name: 'One bromine', formula: 'C₃H₇Br', composition: { C: 3, H: 7, O: 0, Cl: 0, Br: 1 }, lesson: 'One ⁸¹Br isotope creates an M+2 partner nearly as large as M.' },
]);

export const MASS_EVIDENCE_PRESET_BY_ID = deepFreeze(Object.fromEntries(MASS_EVIDENCE_PRESETS.map((preset) => [preset.id, preset])));

export const ORTHOGONAL_NMR_FEATURES = deepFreeze([
  { id: 'two-signal-symmetry', label: 'Two reported signals with a 6:1 observed ratio' },
  { id: 'four-signal-chain', label: 'Four reported chain signals' },
  { id: 'aldehydic-high-frequency-signal', label: 'A measured signal near 9.7 ppm' },
  { id: 'one-six-proton-signal', label: 'One reported six-proton signal' },
  { id: 'acid-high-frequency-signal', label: 'A measured signal near 11.97 ppm' },
  { id: 'ethyl-ester-three-signal-pattern', label: 'Three reported signals with 3:3:2 integration' },
]);

export const ORTHOGONAL_NMR_FEATURE_BY_ID = deepFreeze(Object.fromEntries(ORTHOGONAL_NMR_FEATURES.map((feature) => [feature.id, feature])));

export const ORTHOGONAL_EVIDENCE_CASES = deepFreeze([
  {
    id: 'propanol-topology', code: 'CASE 01', name: 'Same formula, different symmetry', formula: 'C₃H₈O', massPresetId: 'propanol-formula',
    unknownRecordId: '2-propanol-1h-nmr', candidateIds: ['1-propanol-1h-nmr', '2-propanol-1h-nmr'], decisiveNmrFeatureId: 'two-signal-symmetry',
    mission: 'Use the measured number of reported environments and their integration to distinguish a straight alcohol from a symmetric one.',
    irRole: 'Both candidates are alcohols; the declared O–H class evidence does not decide this pair.',
  },
  {
    id: 'carbonyl-terminus-orthogonal', code: 'CASE 02', name: 'Shared carbonyl, different terminus', formula: 'C₃H₆O', massPresetId: 'carbonyl-formula',
    unknownRecordId: 'propanal-1h-nmr', candidateIds: ['propanal-1h-nmr', 'acetone-1h-nmr'], decisiveNmrFeatureId: 'aldehydic-high-frequency-signal',
    mission: 'Use the measured high-frequency proton evidence after formula and ideal mass fail to choose between two carbonyl isomers.',
    irRole: 'Existing transformed IR evidence independently supports an aldehydic C–H feature for propanal.',
  },
  {
    id: 'acid-ester-orthogonal', code: 'CASE 03', name: 'Same formula, acid or ester', formula: 'C₄H₈O₂', massPresetId: 'oxygen-pair-formula',
    unknownRecordId: 'butanoic-acid-1h-nmr', candidateIds: ['ethyl-acetate-1h-nmr', 'butanoic-acid-1h-nmr'], decisiveNmrFeatureId: 'acid-high-frequency-signal',
    mission: 'Use a measured high-frequency acid signal alongside independent IR support while the formula and ideal mass envelope remain tied.',
    irRole: 'Existing transformed gas-phase IR evidence independently supports O–H evidence for butanoic acid.',
  },
].map((item) => ({ ...item, formulaSufficient: false, massDiscriminates: false, identificationScope: 'supports-declared-pair' })));

export const ORTHOGONAL_EVIDENCE_CASE_BY_ID = deepFreeze(Object.fromEntries(ORTHOGONAL_EVIDENCE_CASES.map((item) => [item.id, item])));

export const ORTHOGONAL_EVIDENCE_BOUNDARY = deepFreeze({
  nmrData: 'Six measured NMRShiftDB proton peak lists are represented as ppm sticks and source atom-reference counts. Raw CML, FID, measured intensity, phase, baseline, noise, and line shape are not reproduced.',
  nmrConditions: 'Chemical shift depends on reference, solvent, temperature, concentration, exchange, and molecular environment. Records from different conditions are not treated as directly quantitative overlays.',
  nmrInterpretation: 'Only the displayed measured peak positions, source-reported multiplicity, and atom-reference integration are checked. Missing exchangeable evidence is not synthesized.',
  massData: 'Mass output is an ideal natural-abundance molecular-ion isotopologue envelope calculated from frozen NIST isotope masses and compositions. It is not measured EI, ESI, MS/MS, or detector response.',
  identity: 'Formula and an ideal molecular-ion envelope cannot distinguish constitutional isomers. A case result supports one candidate only inside one declared pair and does not establish identity, purity, concentration, or absence of mixtures.',
  excluded: 'Raw NMR processing, coupling fitting, 2D NMR, fragmentation, adducts, charge states, exact-formula search, library matching, mixtures, uncertainty, sample preparation, instrument operation, and validated identification are excluded.',
});

export const ORTHOGONAL_DATA_NOTICE = deepFreeze({
  date: '2026-08-30',
  nmrLicense: 'NMRShiftDB extended ODbL-style data terms; derived data remain separately attributed and are not relicensed as MIT.',
  nmrSourceIds: PROTON_NMR_RECORDS.map((record) => record.sourceId),
  isotopeSourceId: 'nistIsotopicCompositions',
  statement: 'Measured NMR peak-list derivatives and calculated NIST-composition isotope envelopes are stored locally; no remote analytical service is called at runtime.',
});
