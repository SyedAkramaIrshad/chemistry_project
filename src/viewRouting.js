export const VIEW_IDS = new Set([
  'top', 'curriculum', 'atomicStructureLab', 'nuclearChemistryLab', 'laboratory',
  'molecularGeometryLab', 'molecularOrbitalLab', 'intermolecularLab', 'stoichiometryLab',
  'solutionLab', 'chemicalEquilibriumLab', 'energyLab', 'thermochemistryLab',
  'solubilityLab', 'electrochemistryLab', 'gasPhaseLab', 'binaryVleLab',
  'nonidealThermodynamicsLab', 'spectroscopyLab', 'infraredEvidenceLab',
  'orthogonalEvidenceLab', 'measurementEvidenceLab', 'chromatographyLab',
  'functionalGroupLab', 'biomoleculeLab', 'enzymeLab', 'mechanismLab',
  'stereochemistryLab', 'stereochemicalReactionLab', 'coordinationLab', 'crystalLab',
  'electronicBandLab', 'polymerPopulationLab', 'reactionLab', 'balanceLab',
]);

export const viewFromHash = (hash = window.location.hash) => {
  let requested;
  try { requested = decodeURIComponent(hash.slice(1)); } catch { return 'laboratory'; }
  return VIEW_IDS.has(requested) ? requested : 'laboratory';
};

