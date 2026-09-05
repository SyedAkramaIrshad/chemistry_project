import { COORDINATION_GEOMETRIES } from '../data/coordinationScenarios.js';

const EPSILON = 1e-8;
const configurationsByCount = new Map();
const invalid = (reason, input = null) => ({ valid: false, reason, input });
const validEnergy = (value) => Number.isFinite(value) && value > 0;

export function deriveDCount({ group, oxidation }) {
  if (!Number.isInteger(group) || group < 3 || group > 12) return invalid('This preset rule requires a first-row transition-metal group number from 3 through 12.', { group });
  if (!Number.isInteger(oxidation) || oxidation < 1) return invalid('Use a positive integral oxidation state for this bounded ion-preset rule.', { oxidation });
  const dCount = group - oxidation;
  if (dCount < 0 || dCount > 10) return invalid('Group number minus oxidation state must give a d count from 0 through 10.', { group, oxidation });
  return { valid: true, group, oxidation, dCount, relation: `d${dCount} = group ${group} − oxidation state ${oxidation}` };
}

function enumerateConfigurations(dCount) {
  if (configurationsByCount.has(dCount)) return configurationsByCount.get(dCount);
  const result = [];
  const build = (current) => {
    if (current.length === 5) { if (current.reduce((sum, value) => sum + value, 0) === dCount) result.push(Object.freeze([...current])); return; }
    for (let occupancy = 0; occupancy <= 2; occupancy += 1) build([...current, occupancy]);
  };
  build([]);
  const frozen = Object.freeze(result);
  configurationsByCount.set(dCount, frozen);
  return frozen;
}

function validateConfiguration(geometryId, configuration, deltaKJmol, pairingKJmol) {
  const geometry = COORDINATION_GEOMETRIES[geometryId];
  if (!geometry) return invalid('Choose octahedral, tetrahedral, or the normalized square-planar diagram.');
  if (!Array.isArray(configuration) || configuration.length !== 5 || !configuration.every((value) => Number.isInteger(value) && value >= 0 && value <= 2)) return invalid('An orbital occupation must contain five integer values from 0 through 2.', configuration);
  if (!validEnergy(deltaKJmol)) return invalid('Ligand-field splitting Delta must be a positive finite energy.', { deltaKJmol });
  if (!validEnergy(pairingKJmol)) return invalid('Pairing energy P must be a positive finite energy.', { pairingKJmol });
  return { valid: true, geometry };
}

export function configurationMetrics({ geometryId, configuration, deltaKJmol, pairingKJmol }) {
  const validation = validateConfiguration(geometryId, configuration, deltaKJmol, pairingKJmol);
  if (!validation.valid) return validation;
  const { geometry } = validation;
  const electronCount = configuration.reduce((sum, value) => sum + value, 0);
  const pairCount = configuration.filter((value) => value === 2).length;
  const unpairedElectrons = configuration.filter((value) => value === 1).length;
  const fieldEnergyKJmol = configuration.reduce((sum, occupancy, index) => sum + occupancy * geometry.orbitals[index].coefficient * deltaKJmol, 0);
  const pairingEnergyKJmol = pairCount * pairingKJmol;
  const modelEnergyKJmol = fieldEnergyKJmol + pairingEnergyKJmol;
  return {
    valid: true, geometryId, configuration: [...configuration], electronCount, pairCount, unpairedElectrons,
    fieldEnergyKJmol, pairingEnergyKJmol, modelEnergyKJmol,
    spinS: unpairedElectrons / 2, spinMultiplicity: unpairedElectrons + 1,
    spinOnlyMomentBM: Math.sqrt(unpairedElectrons * (unpairedElectrons + 2)),
    gapEquivalentWavelengthNm: 119626.5656 / deltaKJmol,
  };
}

const lexicographicDescending = (a, b) => {
  for (let index = 0; index < a.length; index += 1) if (a[index] !== b[index]) return b[index] - a[index];
  return 0;
};

function spinPattern(dCount, unpairedElectrons) {
  if (dCount === 0 || dCount === 10) return 'closed-shell occupation';
  const maximum = Math.min(dCount, 10 - dCount);
  return unpairedElectrons === maximum ? 'maximum-spin occupation' : 'paired lower-spin occupation';
}

export function groupOccupationNotation(geometryId, configuration) {
  const geometry = COORDINATION_GEOMETRIES[geometryId];
  if (!geometry || !Array.isArray(configuration)) return '—';
  return geometry.groupOrder.map((group) => {
    const total = geometry.orbitals.reduce((sum, orbital, index) => sum + (orbital.group === group ? configuration[index] : 0), 0);
    return `${group}^${total}`;
  }).join(' · ');
}

export function findGroundConfiguration({ geometryId, dCount, deltaKJmol, pairingKJmol }) {
  const geometry = COORDINATION_GEOMETRIES[geometryId];
  if (!geometry) return invalid('Choose a declared coordination geometry.');
  if (!Number.isInteger(dCount) || dCount < 0 || dCount > 10) return invalid('d count must be an integer from 0 through 10.', { dCount });
  if (!validEnergy(deltaKJmol) || !validEnergy(pairingKJmol)) return invalid('Delta and pairing energy must both be positive finite values.', { deltaKJmol, pairingKJmol });
  const candidates = enumerateConfigurations(dCount).map((configuration) => ({ configuration, metrics: configurationMetrics({ geometryId, configuration, deltaKJmol, pairingKJmol }) }));
  const minimumEnergy = Math.min(...candidates.map((candidate) => candidate.metrics.modelEnergyKJmol));
  const energyMinima = candidates.filter((candidate) => Math.abs(candidate.metrics.modelEnergyKJmol - minimumEnergy) < EPSILON);
  const maximumUnpairedAtMinimum = Math.max(...energyMinima.map((candidate) => candidate.metrics.unpairedElectrons));
  const equivalents = energyMinima.filter((candidate) => candidate.metrics.unpairedElectrons === maximumUnpairedAtMinimum).sort((a, b) => lexicographicDescending(a.configuration, b.configuration));
  const ground = equivalents[0];
  return {
    valid: true, geometry, dCount, deltaKJmol, pairingKJmol,
    configuration: [...ground.configuration], metrics: ground.metrics,
    equivalents: equivalents.map((candidate) => [...candidate.configuration]),
    spinPattern: spinPattern(dCount, ground.metrics.unpairedElectrons),
    notation: groupOccupationNotation(geometryId, ground.configuration),
    candidateCount: candidates.length,
  };
}

export function evaluateConfiguration({ geometryId, dCount, configuration, deltaKJmol, pairingKJmol }) {
  const metrics = configurationMetrics({ geometryId, configuration, deltaKJmol, pairingKJmol });
  if (!metrics.valid) return { committed: false, ...metrics };
  const ground = findGroundConfiguration({ geometryId, dCount, deltaKJmol, pairingKJmol });
  if (!ground.valid) return { committed: false, ...ground };
  if (metrics.electronCount !== dCount) {
    const difference = dCount - metrics.electronCount;
    return { committed: false, valid: true, metrics, ground, energyGapKJmol: null, reason: difference > 0 ? `${difference} d electron${difference === 1 ? '' : 's'} still need to be placed.` : `${Math.abs(difference)} excess d electron${difference === -1 ? '' : 's'} must be removed.` };
  }
  const energyGapKJmol = metrics.modelEnergyKJmol - ground.metrics.modelEnergyKJmol;
  const sameEnergy = Math.abs(energyGapKJmol) < EPSILON;
  const sameTieBreak = metrics.unpairedElectrons === ground.metrics.unpairedElectrons;
  if (sameEnergy && sameTieBreak) return { committed: true, valid: true, metrics, ground, energyGapKJmol: 0, reason: 'This is a ground-equivalent occupation for the declared orbital-energy and pairing model.' };
  const fieldDifference = metrics.fieldEnergyKJmol - ground.metrics.fieldEnergyKJmol;
  const pairingDifference = metrics.pairingEnergyKJmol - ground.metrics.pairingEnergyKJmol;
  const causes = [];
  if (Math.abs(fieldDifference) > EPSILON) causes.push(`field contribution differs by ${fieldDifference.toFixed(1)} kJ mol⁻¹`);
  if (Math.abs(pairingDifference) > EPSILON) causes.push(`pairing contribution differs by ${pairingDifference.toFixed(1)} kJ mol⁻¹`);
  if (sameEnergy && !sameTieBreak) causes.push('the equal-energy Hund-style tie break favours more unpaired electrons');
  return { committed: false, valid: true, metrics, ground, energyGapKJmol, reason: `The arrangement is ${energyGapKJmol.toFixed(1)} kJ mol⁻¹ above the declared model ground state: ${causes.join('; ')}.` };
}

export function toggleOrbitalOccupancy({ configuration, orbitalIndex, dCount }) {
  if (!Array.isArray(configuration) || configuration.length !== 5 || !configuration.every((value) => Number.isInteger(value) && value >= 0 && value <= 2)) return { allowed: false, configuration, reason: 'Load a valid five-orbital occupation first.' };
  if (!Number.isInteger(orbitalIndex) || orbitalIndex < 0 || orbitalIndex > 4) return { allowed: false, configuration, reason: 'Choose one of the five displayed d orbitals.' };
  if (!Number.isInteger(dCount) || dCount < 0 || dCount > 10) return { allowed: false, configuration, reason: 'The selected ion needs a d count from 0 through 10.' };
  const current = configuration[orbitalIndex], nextValue = current === 2 ? 0 : current + 1;
  const electronTotal = configuration.reduce((sum, value) => sum + value, 0);
  const nextTotal = electronTotal - current + nextValue;
  if (nextTotal > dCount) return { allowed: false, configuration, reason: `All ${dCount} d electrons are already placed. Empty or reduce an occupied orbital before adding another.` };
  const next = [...configuration]; next[orbitalIndex] = nextValue;
  return { allowed: true, configuration: next, electronTotal: nextTotal, reason: nextValue === 0 ? 'Both electrons were removed from the selected orbital.' : nextValue === 1 ? 'One electron was placed in the selected orbital.' : 'A second, opposite-spin electron was paired in the selected orbital.' };
}

export function nextCoordinationHint({ geometryId, dCount, deltaKJmol, pairingKJmol, level = 1, configuration = [0, 0, 0, 0, 0] }) {
  const ground = findGroundConfiguration({ geometryId, dCount, deltaKJmol, pairingKJmol });
  if (!ground.valid) return { ...ground, configuration };
  const geometry = ground.geometry;
  const safeLevel = Math.max(1, Math.min(3, level));
  const text = safeLevel === 1
    ? `Start with the lower ${geometry.groupOrder[0]} set; orbitals within one displayed level are degenerate in this model.`
    : safeLevel === 2
      ? `The enumerated minimum uses ${ground.metrics.pairCount} pair${ground.metrics.pairCount === 1 ? '' : 's'} and ${ground.metrics.unpairedElectrons} unpaired electron${ground.metrics.unpairedElectrons === 1 ? '' : 's'} at Delta ${deltaKJmol} and P ${pairingKJmol} kJ mol⁻¹.`
      : `One ground-equivalent occupation is [${ground.configuration.join(', ')}], read in the displayed orbital order: ${geometry.orbitals.map((orbital) => orbital.id).join(', ')}.`;
  return { valid: true, level: safeLevel, text, configuration, ground };
}
