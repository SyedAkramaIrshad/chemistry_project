const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
};

const decodeTrace = (startCmInv, encoded) => encoded.split(',').map((value, index) => [startCmInv + index * 20, Number(value) / 10000]);

export const INFRARED_BAND_LABELS = deepFreeze([
  { id: 'oh-stretch', label: 'O–H stretch', shortLabel: 'O–H', family: 'X–H stretch', color: '#d76e42', description: 'An O–H stretching feature. Shape and position depend on phase, association, and measurement conditions.' },
  { id: 'sp3-c-h', label: 'sp³ C–H stretch', shortLabel: 'C–H', family: 'X–H stretch', color: '#ffb34f', description: 'A C–H stretching feature in the high-wavenumber region of these selected records.' },
  { id: 'aldehydic-c-h', label: 'Aldehydic C–H stretch', shortLabel: 'CHO', family: 'X–H stretch', color: '#816db0', description: 'A selected aldehydic C–H feature used only in the propanal/acetone contrast.' },
  { id: 'carbonyl', label: 'C=O stretch', shortLabel: 'C=O', family: 'double-bond stretch', color: '#c94f67', description: 'A strong carbonyl stretching feature whose exact position depends on molecular and measurement context.' },
  { id: 'c-o', label: 'C–O stretch region', shortLabel: 'C–O', family: 'single-bond stretch', color: '#78d2af', description: 'A selected C–O-rich region; one record may contain more than one declared feature in this family.' },
  { id: 'unassigned', label: 'Unassigned observed band', shortLabel: '?', family: 'observation only', color: '#7f8b91', description: 'A learner can mark a visible feature without claiming a functional assignment.' },
]);

export const INFRARED_BAND_LABEL_BY_ID = deepFreeze(Object.fromEntries(INFRARED_BAND_LABELS.map((item) => [item.id, item])));

const rawRecords = [
  {
    id: 'ethanol-gas-ir', code: 'IR 01', name: 'Ethanol', structure: 'CH₃–CH₂–OH', formula: 'C₂H₆O', molecularWeight: 46.0684, cas: '64-17-5', inchiKey: 'LFQSCWFLJHTTHZ-UHFFFAOYSA-N',
    state: 'gas', originalYRepresentation: 'absorbance', sourceOwner: 'NIST Standard Reference Data Program', sourceOrigin: 'Sadtler Research Labs Under US-EPA Contract', sourceId: 'nistWebbookEthanolIr', sourceIndex: 0, sourceUrl: 'https://webbook.nist.gov/cgi/cbook.cgi?ID=C64175&Index=0&Type=IR-SPEC', sourceRangeCmInv: [450, 3966], traceStartCmInv: 460,
    traceEncoded: '451,256,195,114,109,120,141,144,175,175,134,104,101,88,91,122,217,285,342,663,1307,1421,1525,1152,850,1002,1514,3367,6079,9385,10000,9377,6101,3184,1635,1306,1131,1653,2412,2496,2496,1844,1066,972,1470,2874,3421,3994,3380,1412,1309,909,630,412,175,119,85,39,45,62,97,82,85,141,156,88,61,61,64,79,109,158,207,234,240,192,125,103,81,61,47,36,42,44,43,29,36,36,23,27,35,36,30,14,40,65,66,55,55,45,42,40,40,34,27,38,52,75,112,125,150,173,242,330,445,513,667,928,1440,2517,4459,5834,6762,6884,7500,8869,8918,7796,4575,1880,575,185,108,85,73,75,88,94,85,75,64,54,55,56,56,51,49,49,39,47,69,81,49,30,26,55,90,241,642,1540,1835,1926,1456,531,147,101,62,77,77,92,113,89,73,19,35,49',
    expectedFeatures: [
      { id: 'ethanol-oh', labelId: 'oh-stretch', centreCmInv: 3674, toleranceCmInv: 50, note: 'Selected gas-phase O–H feature; not a universal broad liquid-band shape.' },
      { id: 'ethanol-ch', labelId: 'sp3-c-h', centreCmInv: 2978, toleranceCmInv: 55, note: 'Selected C–H stretching maximum.' },
      { id: 'ethanol-co', labelId: 'c-o', centreCmInv: 1066, toleranceCmInv: 65, note: 'Selected C–O-rich feature.' },
    ],
  },
  {
    id: 'dimethyl-ether-gas-ir', code: 'IR 02', name: 'Dimethyl ether', structure: 'CH₃–O–CH₃', formula: 'C₂H₆O', molecularWeight: 46.0684, cas: '115-10-6', inchiKey: 'LCGLNKUTAGEVQW-UHFFFAOYSA-N',
    state: 'gas', originalYRepresentation: 'absorbance', sourceOwner: 'NIST Standard Reference Data Program', sourceOrigin: 'Sadtler Research Labs Under US-EPA Contract', sourceId: 'nistWebbookDimethylEtherIr', sourceIndex: 0, sourceUrl: 'https://webbook.nist.gov/cgi/cbook.cgi?ID=C115106&Index=0&Type=IR-SPEC', sourceRangeCmInv: [450, 3966], traceStartCmInv: 460,
    traceEncoded: '353,244,225,193,163,163,173,162,138,140,136,127,133,144,122,128,144,123,145,236,526,1121,1874,1951,2242,1926,984,527,285,437,1838,3880,4494,5381,4847,8423,10000,9558,2763,790,482,368,269,227,205,221,335,532,798,1650,2131,1729,1090,630,362,246,222,206,200,187,167,140,132,119,131,118,110,111,116,118,121,121,113,102,103,122,159,238,257,303,280,389,447,448,161,116,113,111,107,99,99,107,112,112,125,130,139,158,167,162,115,106,109,126,164,190,215,237,237,236,237,270,284,278,369,740,2532,5023,5877,7044,6064,8538,8538,7736,7648,6147,5622,4624,4259,1687,764,557,435,350,317,275,216,197,166,150,147,147,133,145,135,135,140,133,130,133,131,125,127,116,127,124,118,117,140,134,130,134,134,138,152,137,137,134,138,145,134,130,147,145,156,145',
    expectedFeatures: [
      { id: 'dme-ch', labelId: 'sp3-c-h', centreCmInv: 2890, toleranceCmInv: 95, note: 'Selected C–H stretching maximum.' },
      { id: 'dme-co', labelId: 'c-o', centreCmInv: 1178, toleranceCmInv: 70, note: 'Selected ether C–O–C-rich feature.' },
    ],
  },
  {
    id: 'propanal-gas-ir', code: 'IR 03', name: 'Propanal', structure: 'CH₃–CH₂–CHO', formula: 'C₃H₆O', molecularWeight: 58.0791, cas: '123-38-6', inchiKey: 'NBBJYMSMWIIQGU-UHFFFAOYSA-N',
    state: 'gas (100 mmHg, N₂ added; total pressure 600 mmHg)', originalYRepresentation: 'transmittance converted to absorbance', sourceOwner: 'Coblentz Society', sourceOrigin: 'Dow Chemical Company', sourceId: 'nistWebbookPropanalIr', sourceIndex: 0, sourceUrl: 'https://webbook.nist.gov/cgi/cbook.cgi?ID=C123386&Index=0&Type=IR-SPEC', sourceRangeCmInv: [455.163, 3751.38], traceStartCmInv: 460,
    traceEncoded: '161,229,420,469,420,211,128,102,139,368,495,411,165,87,124,211,350,987,736,1868,1466,582,613,587,254,116,161,242,229,161,254,886,1040,993,504,450,181,305,411,359,207,143,181,499,800,1212,1426,1450,1450,1383,1442,1040,603,364,372,436,322,143,322,340,640,822,1133,5004,10000,10000,6412,1160,373,305,258,211,157,124,102,95,83,87,83,78,80,80,78,78,87,87,83,83,70,70,66,66,97,127,140,161,122,76,76,59,55,55,51,55,66,77,94,121,177,306,709,1777,3809,4077,3258,1577,2146,3252,3224,2576,1018,1687,2270,2496,2086,2585,3249,3900,1912,493,246,193,173,169,159,124,91,91,66,51,46,35,40,40,39,40,44,62,101,184,250,254,194,76,59,83,87,80,107,107,124,105,91,130,157',
    expectedFeatures: [
      { id: 'propanal-ch', labelId: 'sp3-c-h', centreCmInv: 2999, toleranceCmInv: 65, note: 'Selected alkyl C–H feature.' },
      { id: 'propanal-cho', labelId: 'aldehydic-c-h', centreCmInv: 2719, toleranceCmInv: 60, note: 'Selected aldehydic C–H feature used in this pair contrast.' },
      { id: 'propanal-carbonyl', labelId: 'carbonyl', centreCmInv: 1745, toleranceCmInv: 45, note: 'Selected carbonyl maximum.' },
    ],
  },
  {
    id: 'acetone-gas-ir', code: 'IR 04', name: 'Acetone', structure: 'CH₃–C(=O)–CH₃', formula: 'C₃H₆O', molecularWeight: 58.0791, cas: '67-64-1', inchiKey: 'CSCPPACGZOOCGX-UHFFFAOYSA-N',
    state: 'gas', originalYRepresentation: 'absorbance', sourceOwner: 'NIST Standard Reference Data Program', sourceOrigin: 'Sadtler Research Labs Under US-EPA Contract', sourceId: 'nistWebbookAcetoneIr', sourceIndex: 0, sourceUrl: 'https://webbook.nist.gov/cgi/cbook.cgi?ID=C67641&Index=0&Type=IR-SPEC', sourceRangeCmInv: [450, 3966], traceStartCmInv: 460,
    traceEncoded: '76,341,1341,1416,1312,618,117,139,106,141,97,115,104,117,168,198,248,169,128,158,297,456,533,532,367,235,171,149,133,160,188,360,406,330,261,514,3305,5340,6105,5420,627,249,453,1486,4620,6070,5909,3085,1502,1513,1425,930,613,518,511,493,434,323,232,207,373,1268,5418,8692,10000,8855,3902,1297,519,227,132,94,72,59,60,65,70,68,45,43,41,73,130,152,152,131,58,49,60,72,69,64,51,71,51,66,34,42,45,45,34,29,31,43,53,66,73,43,32,37,33,20,20,24,20,35,62,71,137,200,253,299,613,892,1077,1521,1521,1202,1150,1050,649,542,457,270,145,77,65,56,34,41,42,32,29,47,47,30,54,77,180,244,271,255,124,61,76,42,40,44,65,66,59,64,64,77,79,62,71,66,83,93,72,66,79,62,68,75',
    expectedFeatures: [
      { id: 'acetone-ch', labelId: 'sp3-c-h', centreCmInv: 2970, toleranceCmInv: 65, note: 'Selected C–H stretching maximum.' },
      { id: 'acetone-carbonyl', labelId: 'carbonyl', centreCmInv: 1738, toleranceCmInv: 45, note: 'Selected ketone carbonyl maximum.' },
    ],
  },
  {
    id: 'ethyl-acetate-gas-ir', code: 'IR 05', name: 'Ethyl acetate', structure: 'CH₃–C(=O)–O–CH₂–CH₃', formula: 'C₄H₈O₂', molecularWeight: 88.1051, cas: '141-78-6', inchiKey: 'XEKOWRVHYACXOJ-UHFFFAOYSA-N',
    state: 'gas', originalYRepresentation: 'absorbance', sourceOwner: 'NIST Standard Reference Data Program', sourceOrigin: 'Sadtler Research Labs Under US-EPA Contract', sourceId: 'nistWebbookEthylAcetateIr', sourceIndex: 0, sourceUrl: 'https://webbook.nist.gov/cgi/cbook.cgi?ID=C141786&Index=0&Type=IR-SPEC', sourceRangeCmInv: [450, 3966], traceStartCmInv: 460,
    traceEncoded: '102,69,85,85,77,92,131,262,402,392,138,59,45,64,77,151,228,237,211,274,276,168,273,385,375,192,191,286,1033,2983,3087,1849,1084,903,322,214,433,2030,8866,10000,8607,1656,634,616,476,2031,2189,1699,501,506,546,542,348,158,139,139,122,88,86,92,108,162,273,953,4889,6682,6682,1483,190,135,111,92,86,64,38,32,27,53,56,50,62,69,69,32,21,22,15,9,13,14,12,20,28,28,23,54,54,26,29,37,47,49,39,29,29,32,38,41,41,27,31,59,65,57,58,63,72,71,87,116,184,332,418,567,903,1103,1560,1676,932,360,213,158,120,95,80,64,53,45,35,26,21,12,15,27,27,27,24,29,23,34,39,63,101,92,48,22,30,29,20,26,16,32,46,30,40,26,26,35,25,41,41,39,41,19,48,31',
    expectedFeatures: [
      { id: 'ethyl-acetate-ch', labelId: 'sp3-c-h', centreCmInv: 2994, toleranceCmInv: 60, note: 'Selected C–H stretching maximum.' },
      { id: 'ethyl-acetate-carbonyl', labelId: 'carbonyl', centreCmInv: 1770, toleranceCmInv: 50, note: 'Selected ester carbonyl maximum.' },
      { id: 'ethyl-acetate-co-high', labelId: 'c-o', centreCmInv: 1238, toleranceCmInv: 60, note: 'First selected ester C–O-rich feature.' },
      { id: 'ethyl-acetate-co-low', labelId: 'c-o', centreCmInv: 1054, toleranceCmInv: 50, note: 'Second selected ester C–O-rich feature.' },
    ],
  },
  {
    id: 'butanoic-acid-gas-ir', code: 'IR 06', name: 'Butanoic acid', structure: 'CH₃–CH₂–CH₂–C(=O)–OH', formula: 'C₄H₈O₂', molecularWeight: 88.1051, cas: '107-92-6', inchiKey: 'FERIUCNNQQJTOY-UHFFFAOYSA-N',
    state: 'gas', originalYRepresentation: 'absorbance', sourceOwner: 'NIST Standard Reference Data Program', sourceOrigin: 'Sadtler Research Labs Under US-EPA Contract', sourceId: 'nistWebbookButanoicAcidIr', sourceIndex: 0, sourceUrl: 'https://webbook.nist.gov/cgi/cbook.cgi?ID=C107926&Index=0&Type=IR-SPEC', sourceRangeCmInv: [450, 3966], traceStartCmInv: 460,
    traceEncoded: '665,839,967,1133,1531,1572,1942,1942,2015,1949,1028,563,540,430,500,500,372,51,46,165,198,192,257,257,132,22,69,252,759,1421,2770,3715,3557,3701,5706,5706,3409,1720,883,716,855,867,783,620,851,1475,1697,1614,778,682,721,637,313,122,61,43,43,36,56,59,86,137,343,1083,3062,8763,10000,9249,2571,458,121,69,53,52,36,26,18,14,16,12,3,3,3,12,13,22,24,23,34,33,22,15,25,25,24,33,30,25,25,26,24,20,18,15,17,17,23,29,29,39,50,50,52,60,70,82,82,105,158,238,544,1173,1174,1433,2266,3148,3281,2560,740,261,155,139,118,108,106,101,99,78,72,64,56,45,53,53,35,36,36,27,26,26,27,27,43,108,261,2636,3106,2400,169,33,50,39,29,43,60,57,58,60,69,67,58,82,86,73,60,78',
    expectedFeatures: [
      { id: 'butanoic-oh', labelId: 'oh-stretch', centreCmInv: 3578, toleranceCmInv: 60, note: 'Selected gas-phase O–H feature; condensed-phase shape is not inferred.' },
      { id: 'butanoic-ch', labelId: 'sp3-c-h', centreCmInv: 2974, toleranceCmInv: 65, note: 'Selected alkyl C–H maximum.' },
      { id: 'butanoic-carbonyl', labelId: 'carbonyl', centreCmInv: 1782, toleranceCmInv: 50, note: 'Selected acid carbonyl maximum in this gas record.' },
      { id: 'butanoic-co', labelId: 'c-o', centreCmInv: 1150, toleranceCmInv: 65, note: 'Selected C–O-rich feature.' },
    ],
  },
];

const TRANSFORMATION = 'NIST JCAMP record converted to absorbance when required, reduced to maximum absorbance per 20 cm⁻¹ bin, then normalized to that record maximum on 2026-08-30. This project-derived trace changes sampling and scale; it is not the raw NIST spectrum.';

export const INFRARED_RECORDS = deepFreeze(rawRecords.map(({ traceEncoded, traceStartCmInv, ...record }) => ({
  ...record,
  transformation: TRANSFORMATION,
  traceStepCmInv: 20,
  trace: decodeTrace(traceStartCmInv, traceEncoded),
})));

export const INFRARED_RECORD_BY_ID = deepFreeze(Object.fromEntries(INFRARED_RECORDS.map((item) => [item.id, item])));

export const INFRARED_CASES = deepFreeze([
  {
    id: 'oxygen-linkage', code: 'CASE 01', name: 'Alcohol or ether?', formula: 'C₂H₆O', unknownRecordId: 'ethanol-gas-ir', candidateIds: ['ethanol-gas-ir', 'dimethyl-ether-gas-ir'], decisiveLabelId: 'oh-stretch',
    mission: 'Use the gas-phase O–H evidence to choose between two connectivities that share one formula.',
    teacherQuestion: 'Why can a formula establish atom inventory while remaining silent about whether oxygen bonds to hydrogen or to two carbons?',
  },
  {
    id: 'carbonyl-terminus', code: 'CASE 02', name: 'Aldehyde or ketone?', formula: 'C₃H₆O', unknownRecordId: 'propanal-gas-ir', candidateIds: ['propanal-gas-ir', 'acetone-gas-ir'], decisiveLabelId: 'aldehydic-c-h',
    mission: 'Both candidates contain a carbonyl. Use the selected aldehydic C–H region to distinguish where the carbonyl sits.',
    teacherQuestion: 'Why does a shared carbonyl band narrow a class without deciding the complete connectivity?',
  },
  {
    id: 'acid-or-ester', code: 'CASE 03', name: 'Acid or ester?', formula: 'C₄H₈O₂', unknownRecordId: 'butanoic-acid-gas-ir', candidateIds: ['ethyl-acetate-gas-ir', 'butanoic-acid-gas-ir'], decisiveLabelId: 'oh-stretch',
    mission: 'Separate two carbonyl-containing isomers using the selected gas-phase O–H evidence and the declared pair only.',
    teacherQuestion: 'Why must the phase label remain beside an O–H assignment instead of importing one universal broad-band picture?',
  },
]);

export const INFRARED_CASE_BY_ID = deepFreeze(Object.fromEntries(INFRARED_CASES.map((item) => [item.id, item])));

export const INFRARED_MODEL_BOUNDARY = deepFreeze({
  records: 'Six transformed gas-phase NIST reference records and three declared same-formula contrasts are included; this is not a searchable spectral library.',
  axis: 'Wavenumber positions are retained in 20 cm⁻¹ bins. Each trace is normalized to its own maximum, so displayed intensity is not molar absorptivity and is not quantitatively comparable between records.',
  phase: 'Band position and shape depend on phase and measurement conditions. Gas-phase O–H evidence is not a universal condensed-phase broad-band rule.',
  assignment: 'Only declared feature windows are checked. The studio does not predict an arbitrary spectrum or infer every normal mode.',
  identity: 'A match can support one candidate within a declared two-candidate exercise. Formula plus one IR trace does not certify identity, purity, concentration, or absence of mixtures.',
  excluded: 'NMR, mass spectra, Raman, mixture deconvolution, quantitative fitting, library search, instrument operation, sample preparation, and chemical handling are excluded.',
});

export const INFRARED_DERIVATION_NOTICE = deepFreeze({
  date: '2026-08-30',
  sourceSystem: 'NIST Chemistry WebBook, SRD 69',
  sourceIds: ['nistWebbookGuide', 'nistDataLicensing', 'nistWebbookEthanolIr', 'nistWebbookDimethylEtherIr', 'nistWebbookPropanalIr', 'nistWebbookAcetoneIr', 'nistWebbookEthylAcetateIr', 'nistWebbookButanoicAcidIr'],
  statement: TRANSFORMATION,
});
