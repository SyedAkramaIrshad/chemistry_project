/*
 * Compact adaptations of six MassBank measured records. Each adaptation retains
 * its record-level `CC BY` terms and is not relicensed under this repository's
 * MIT software license. See THIRD_PARTY_DATA.md for attribution and transforms.
 */

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
};

const PEAKS = {
  'alpha-linear': [[43,1.6],[44,1.1],[45,5.7],[59,4.1],[73,43.8],[74,3.8],[75,2.9],[100,2.4],[103,1.5],[114,1.4],[130,100],[131,12],[132,3.8],[133,1.2],[147,10.5],[148,1.7],[204,3.8],[218,2],[232,1.1]],
  'alpha-branched': [[42,1.1],[43,1.7],[44,1],[45,5.5],[59,2.3],[73,43.3],[74,4.2],[75,2.9],[100,1.3],[114,4.5],[130,100],[131,12.2],[132,3.9],[142,1.4],[147,9.6],[148,1.6],[204,5.3],[205,1.1],[232,1.7]],
  'alpha-n-methyl': [[43,1.4],[45,5.4],[56,3],[59,3.8],[73,39.3],[74,3.2],[75,2],[100,1],[114,1.3],[130,100],[131,11.8],[132,3.7],[133,1],[147,8.8],[148,1.4],[204,3.7],[247,.1]],
  'beta-linear': [[43,2.5],[44,1.5],[45,7],[58,1.2],[59,7.7],[72,1.8],[73,58],[74,5.5],[75,5.8],[88,9],[99,1.2],[100,18.3],[101,1.8],[114,2.3],[116,100],[117,11.3],[118,3.8],[130,1.3],[131,1.6],[133,1.2],[147,17.1],[148,2.8],[149,1.4],[174,1.3],[189,1.6],[190,8.6],[191,1.7],[232,14],[233,3],[234,1.3],[247,.5]],
  'beta-branched': [[43,1.8],[44,1],[45,5],[58,1.4],[59,4.4],[66,1.3],[72,1.3],[73,43.2],[74,4.2],[75,4.7],[81,5.9],[86,1.9],[100,1.1],[102,100],[103,9.8],[104,3.8],[131,2.3],[133,1.1],[147,14.6],[148,2.4],[149,1.2],[176,8.3],[177,1.5],[218,5.6],[219,1.2],[232,2.2]],
  'beta-n-methyl': [[42,2.2],[43,2],[44,1.3],[45,6.2],[58,1],[59,4.5],[72,1.6],[73,51.2],[74,4.3],[75,4.2],[86,1.3],[88,5.4],[99,1.2],[100,1.2],[102,1.7],[114,1.2],[116,100],[117,11.1],[118,3.8],[131,1.6],[133,1.2],[147,18.2],[148,2.9],[149,1.5],[190,8.9],[191,1.7],[232,6.7],[233,1.4],[247,.5]],
};

const RECORD_META = [
  { id:'alpha-linear', code:'A1', name:'(2S)-2-Aminobutanoic acid', condensedFormula:'CH3CH2CH(NH2)CO2H', smiles:'CC[C@@H](C(=O)O)N', inchiKey:'QWCKQJZIFLGMSD-VKHMYHEASA-N', accession:'MSBNK-MSSJ-MSJ02336', splash:'splash10-001i-4900000000-c8de67efde7269e8de4d', retentionTimeMin:7.26, sourcePeakCount:104, sourceId:'massbankMsj02336' },
  { id:'alpha-branched', code:'A2', name:'2-Aminoisobutyric acid', condensedFormula:'(CH3)2C(NH2)CO2H', smiles:'CC(C)(N)C(=O)O', inchiKey:'FUOOLUPWFVMBKG-UHFFFAOYSA-N', accession:'MSBNK-MSSJ-MSJ02340', splash:'splash10-001i-4900000000-30ff658990346a9e5f66', retentionTimeMin:7.05, sourcePeakCount:70, sourceId:'massbankMsj02340' },
  { id:'alpha-n-methyl', code:'A3', name:'N-Methyl-L-alanine', condensedFormula:'CH3CH(NHCH3)CO2H', smiles:'C[C@@H](C(=O)O)NC', inchiKey:'GDFAOVXKHJXLEI-VKHMYHEASA-N', accession:'MSBNK-MSSJ-MSJ02354', splash:'splash10-001i-4900000000-59f5f5f91cfaf2eade03', retentionTimeMin:7.24, sourcePeakCount:83, sourceId:'massbankMsj02354' },
  { id:'beta-linear', code:'B1', name:'3-Aminobutanoic acid', condensedFormula:'CH3CH(NH2)CH2CO2H', smiles:'CC(CC(=O)O)N', inchiKey:'OQEBBZSWEGYTPG-UHFFFAOYSA-N', accession:'MSBNK-MSSJ-MSJ02358', splash:'splash10-01b9-5900000000-63ef36d70b2c7f7215fa', retentionTimeMin:7.52, sourcePeakCount:114, sourceId:'massbankMsj02358' },
  { id:'beta-branched', code:'B2', name:'3-Aminoisobutyric acid', condensedFormula:'H2NCH2CH(CH3)CO2H', smiles:'CC(CN)C(=O)O', inchiKey:'QCHPKSFMDHPSNR-UHFFFAOYSA-N', accession:'MSBNK-MSSJ-MSJ02362', splash:'splash10-0udi-5900000000-33e9ccb5f505fed0766c', retentionTimeMin:7.52, sourcePeakCount:92, sourceId:'massbankMsj02362' },
  { id:'beta-n-methyl', code:'B3', name:'N-Methyl-beta-alanine', condensedFormula:'CH3NHCH2CH2CO2H', smiles:'CNCCC(=O)O', inchiKey:'VDIPNVCWMXZNFY-UHFFFAOYSA-N', accession:'MSBNK-MSSJ-MSJ02368', splash:'splash10-014i-5900000000-91173c0ca595586613a0', retentionTimeMin:7.77, sourcePeakCount:95, sourceId:'massbankMsj02368' },
];

export const MEASURED_EI_SHARED_METADATA = deepFreeze({
  neutralFormula: 'C4H9NO2',
  exactNeutralMass: 103.0633285,
  derivative: {
    formula: 'C10H25NO2Si2',
    exactMass: 247.14238,
    type: '2TMS',
    nominalMolecularIonMz: 247,
  },
  acquisition: {
    instrumentType: 'GC-EI-TOF',
    instrument: 'JMS-T100GCV (JEOL) coupled to Agilent 7890A gas chromatograph',
    msType: 'MS',
    ionMode: 'POSITIVE',
    ionization: 'EI',
    sourceTitle: '70 V',
    carrierGas: 'He, 1 mL/min',
    column: 'DB-5MS UI, 30 m × 0.25 mm × 0.25 µm',
    ovenProgram: '70 °C for 4 min; 30 °C/min to 325 °C; hold 1.5 min',
    injectionTemperature: '250 °C',
  },
  displayWindow: { minimumMz: 40, maximumMz: 250, thresholdPercent: 1 },
  license: 'CC BY',
  licenseVersion: 'not specified in the source record',
  datasetVersion: '2025.10',
  datasetTimestamp: '2025-10-24T10:33:06Z',
  accessedOn: '2026-08-30',
});

const record = (meta) => {
  const peaks = PEAKS[meta.id].map(([mz, relativeIntensity]) => ({ mz, relativeIntensity }));
  const basePeak = peaks.find((peak) => peak.relativeIntensity === 100);
  const molecularIonPeak = peaks.find((peak) => peak.mz === 247) ?? null;
  return deepFreeze({
    ...meta,
    metadata: MEASURED_EI_SHARED_METADATA,
    peaks,
    transformedPeakCount: peaks.length,
    basePeakMz: basePeak.mz,
    molecularIonPeak,
    sourceUrl: `https://massbank.eu/MassBank/RecordDisplay?id=${meta.accession}`,
    resultKind: 'Compact nominal-m/z adaptation of a measured reference record',
  });
};

export const MEASURED_EI_RECORDS = deepFreeze(RECORD_META.map(record));

export const MEASURED_EI_RECORD_BY_ID = deepFreeze(Object.fromEntries(
  MEASURED_EI_RECORDS.map((entry) => [entry.id, entry]),
));

export const MEASURED_EI_DATA_NOTICE = deepFreeze({
  title: 'MassBank GC-EI compact peak-list adaptations',
  datasetVersion: '2025.10',
  datasetTimestamp: '2025-10-24T10:33:06Z',
  accessedOn: '2026-08-30',
  sourceRepository: 'https://github.com/MassBank/MassBank-data',
  sourceApi: 'https://massbank.eu/MassBank-api/ui/',
  license: 'CC BY',
  licenseWarning: 'Each selected record says CC BY without a license version. These adaptations retain those record-level terms and are not relicensed as MIT.',
  accessions: RECORD_META.map(({ accession }) => accession),
  transformation: [
    'Round each source m/z coordinate to the nearest integer.',
    'Collapse duplicate nominal bins by retaining the greatest source relative intensity.',
    'Restrict the teaching display to nominal m/z 40–250 without implying a complete acquisition range.',
    'Retain MassBank relative intensity values at least 10 on its 0–999 scale, approximately 1% of the base peak.',
    'Also retain nominal m/z 247 when the source reports it below the display threshold.',
    'Convert the source relative scale to percent with round1(rel / 9.99).',
    'Do not smooth, interpolate, baseline-correct, assign fragment formulae, or invent a missing molecular-ion peak.',
  ],
  redistributionBoundary: 'No raw record or complete source peak list is redistributed.',
  runtimeBoundary: 'All runtime logic is local; no MassBank or other remote service is called by the lab.',
});

