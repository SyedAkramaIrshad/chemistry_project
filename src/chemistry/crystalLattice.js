import { CRYSTAL_STRUCTURES } from '../data/crystalStructures.js';

export const AVOGADRO_CONSTANT = 6.02214076e23;
const EPSILON = 1e-9;

const invalid = (reason, input = null) => ({ valid: false, reason, input });
const finitePositive = (value) => Number.isFinite(value) && value > 0;
const signedInteger = (value) => Number.isInteger(value) && Number.isFinite(value);

export function calculateCrystalCell({ structureId, latticeParameterA, molarMassGmol }) {
  const structure = CRYSTAL_STRUCTURES[structureId];
  if (!structure) return invalid('Choose one of the declared SC, BCC, or FCC reference cells.');
  if (!finitePositive(latticeParameterA)) return invalid('Lattice parameter a must be a positive finite value in angstroms.', { latticeParameterA });
  if (!finitePositive(molarMassGmol)) return invalid('Molar mass must be a positive finite value in grams per mole.', { molarMassGmol });
  const cellVolumeA3 = latticeParameterA ** 3;
  const cellVolumeCm3 = (latticeParameterA * 1e-8) ** 3;
  const densityGcm3 = structure.atomsPerCell * molarMassGmol / (AVOGADRO_CONSTANT * cellVolumeCm3);
  return {
    valid: true,
    structure,
    latticeParameterA,
    molarMassGmol,
    atomsPerCell: structure.atomsPerCell,
    coordinationNumber: structure.coordinationNumber,
    nearestNeighborA: structure.nearestNeighborFactor * latticeParameterA,
    hardSphereRadiusA: structure.radiusFactor * latticeParameterA,
    packingFraction: structure.packingFraction,
    cellVolumeA3,
    densityGcm3,
    sharingTotal: structure.sharing.reduce((sum, row) => sum + row.count * row.fraction, 0),
  };
}

export function reflectionCondition(structureId, h, k, l) {
  const structure = CRYSTAL_STRUCTURES[structureId];
  if (!structure) return invalid('The reflection rule needs a declared cubic structure.');
  if (![h, k, l].every(signedInteger)) return invalid('Miller indices must be signed integers.', { h, k, l });
  if (h === 0 && k === 0 && l === 0) return invalid('(000) does not define a family of lattice planes.', { h, k, l });
  let allowed = true;
  let reason = structure.reflectionRule;
  if (structureId === 'bcc') allowed = Math.abs(h + k + l) % 2 === 0;
  if (structureId === 'fcc') {
    const parities = [h, k, l].map((value) => Math.abs(value) % 2);
    allowed = parities.every((value) => value === parities[0]);
  }
  if (!allowed) {
    reason = structureId === 'bcc'
      ? `(${h}${k}${l}) is extinct for this monatomic BCC reference because h + k + l is odd.`
      : `(${h}${k}${l}) is extinct for this monatomic FCC reference because the index parities are mixed.`;
  }
  return { valid: true, allowed, structureId, h, k, l, reason };
}

export function calculateCubicDiffraction({ structureId, latticeParameterA, h, k, l, wavelengthA, order = 1 }) {
  const condition = reflectionCondition(structureId, h, k, l);
  if (!condition.valid) return condition;
  if (!finitePositive(latticeParameterA)) return invalid('Lattice parameter a must be positive before a plane spacing can be calculated.', { latticeParameterA });
  if (!finitePositive(wavelengthA)) return invalid('Wavelength must be a positive finite value in angstroms.', { wavelengthA });
  if (!Number.isInteger(order) || order < 1) return invalid('Diffraction order n must be a positive integer.', { order });
  const indexMagnitude = Math.sqrt(h * h + k * k + l * l);
  const dA = latticeParameterA / indexMagnitude;
  const sinTheta = order * wavelengthA / (2 * dA);
  const geometryPossible = sinTheta <= 1 + EPSILON;
  if (!geometryPossible) {
    return {
      valid: true, structureId, h, k, l, order, wavelengthA, latticeParameterA, dA, sinTheta,
      geometryPossible: false, reflectionAllowed: condition.allowed, status: 'no-solution',
      reason: `nλ/(2d) = ${sinTheta.toFixed(3)}, which is greater than 1, so no real Bragg angle exists for these preserved inputs.`,
    };
  }
  const thetaDeg = Math.asin(Math.min(1, sinTheta)) * 180 / Math.PI;
  const twoThetaDeg = 2 * thetaDeg;
  return {
    valid: true, structureId, h, k, l, order, wavelengthA, latticeParameterA, dA, sinTheta,
    geometryPossible: true, reflectionAllowed: condition.allowed, thetaDeg, twoThetaDeg,
    status: condition.allowed ? 'allowed' : 'extinct',
    reason: condition.allowed
      ? `Bragg geometry is possible and ${CRYSTAL_STRUCTURES[structureId].shortName} centring permits this monatomic reflection.`
      : condition.reason,
  };
}

export function projectCrystalPoint(point, { angleDeg = 38, tiltDeg = 24, scale = 300, centerX = 450, centerY = 255 } = {}) {
  const angle = angleDeg * Math.PI / 180;
  const tilt = tiltDeg * Math.PI / 180;
  const x = point.x - 0.5, y = point.y - 0.5, z = point.z - 0.5;
  const rotatedX = x * Math.cos(angle) + z * Math.sin(angle);
  const rotatedZ = -x * Math.sin(angle) + z * Math.cos(angle);
  const projectedY = y * Math.cos(tilt) - rotatedZ * Math.sin(tilt);
  const depth = y * Math.sin(tilt) + rotatedZ * Math.cos(tilt);
  return { x: centerX + rotatedX * scale, y: centerY - projectedY * scale, depth };
}

const cubeCorners = [
  { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 0 },
  { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 1 }, { x: 0, y: 1, z: 1 }, { x: 1, y: 1, z: 1 },
];
const cubeEdges = [];
for (let i = 0; i < cubeCorners.length; i += 1) {
  for (let j = i + 1; j < cubeCorners.length; j += 1) {
    const a = cubeCorners[i], b = cubeCorners[j];
    const differences = Number(a.x !== b.x) + Number(a.y !== b.y) + Number(a.z !== b.z);
    if (differences === 1) cubeEdges.push([a, b]);
  }
}

const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const normalize = (value) => {
  const length = Math.hypot(value.x, value.y, value.z) || 1;
  return { x: value.x / length, y: value.y / length, z: value.z / length };
};

export function planeCubeIntersections(h, k, l) {
  if (![h, k, l].every(signedInteger) || (h === 0 && k === 0 && l === 0)) return [];
  const normal = { x: h, y: k, z: l };
  const values = cubeCorners.map((point) => dot(normal, point));
  const planeConstant = (Math.min(...values) + Math.max(...values)) / 2;
  const intersections = [];
  const add = (point) => {
    if (!intersections.some((candidate) => Math.hypot(candidate.x - point.x, candidate.y - point.y, candidate.z - point.z) < 1e-7)) intersections.push(point);
  };
  cubeEdges.forEach(([a, b]) => {
    const va = dot(normal, a) - planeConstant, vb = dot(normal, b) - planeConstant;
    if (Math.abs(va) < EPSILON && Math.abs(vb) < EPSILON) { add({ ...a }); add({ ...b }); return; }
    if ((va < -EPSILON && vb < -EPSILON) || (va > EPSILON && vb > EPSILON)) return;
    const denominator = va - vb;
    if (Math.abs(denominator) < EPSILON) return;
    const t = va / denominator;
    if (t >= -EPSILON && t <= 1 + EPSILON) add({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });
  });
  if (intersections.length < 3) return intersections;
  const centroid = intersections.reduce((sum, point) => ({ x: sum.x + point.x / intersections.length, y: sum.y + point.y / intersections.length, z: sum.z + point.z / intersections.length }), { x: 0, y: 0, z: 0 });
  const n = normalize(normal);
  const reference = Math.abs(n.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 0, y: 1, z: 0 };
  const u = normalize(cross(n, reference));
  const v = cross(n, u);
  return intersections.sort((a, b) => {
    const da = { x: a.x - centroid.x, y: a.y - centroid.y, z: a.z - centroid.z };
    const db = { x: b.x - centroid.x, y: b.y - centroid.y, z: b.z - centroid.z };
    return Math.atan2(dot(da, v), dot(da, u)) - Math.atan2(dot(db, v), dot(db, u));
  });
}

export function createTeachingSupercell(structureId, size = { nx: 3, ny: 3, nz: 2 }) {
  const structure = CRYSTAL_STRUCTURES[structureId];
  if (!structure) return invalid('A teaching supercell requires SC, BCC, or FCC.');
  const { nx, ny, nz } = size;
  if (![nx, ny, nz].every((value) => Number.isInteger(value) && value > 0 && value <= 5)) return invalid('Supercell dimensions must be positive integers no greater than 5.', size);
  const hostSites = [];
  for (let i = 0; i < nx; i += 1) for (let j = 0; j < ny; j += 1) for (let k = 0; k < nz; k += 1) {
    structure.basis.forEach((basis, basisIndex) => hostSites.push({
      id: `${structureId}-host-${i}-${j}-${k}-${basisIndex}`, kind: 'host', basisKind: basis.kind,
      x: i + basis.x, y: j + basis.y, z: k + basis.z,
    }));
  }
  const interstitialSites = [];
  for (let i = 0; i < Math.min(nx, 2); i += 1) for (let j = 0; j < Math.min(ny, 2); j += 1) for (let k = 0; k < Math.min(nz, 2); k += 1) {
    interstitialSites.push({ id: `${structureId}-interstitial-${i}-${j}-${k}`, kind: 'interstitial-target', x: i + 0.25, y: j + 0.25, z: k + 0.25 });
  }
  return { valid: true, structureId, size: { nx, ny, nz }, hostSites, interstitialSites, defects: {} };
}

export function summarizePointDefects(state) {
  const entries = Object.values(state.defects || {});
  const vacancyCount = entries.filter((entry) => entry.mode === 'vacancy').length;
  const substitutionCount = entries.filter((entry) => entry.mode === 'substitution').length;
  const interstitialCount = entries.filter((entry) => entry.mode === 'interstitial').length;
  return {
    hostSiteCount: state.hostSites.length,
    occupiedHostCount: state.hostSites.length - vacancyCount,
    vacancyCount, substitutionCount, interstitialCount,
    renderedAtomCount: state.hostSites.length - vacancyCount + interstitialCount,
  };
}

export function applyPointDefect(state, action) {
  if (!state?.valid || !action?.mode) return { allowed: false, state, reason: 'Load a valid teaching supercell and choose a defect action.' };
  if (action.mode === 'clear') {
    const next = { ...state, defects: {} };
    return { allowed: true, state: next, reason: 'All finite illustrative defect edits were cleared.', summary: summarizePointDefects(next) };
  }
  const host = state.hostSites.find((site) => site.id === action.siteId);
  const interstitial = state.interstitialSites.find((site) => site.id === action.siteId);
  if (action.mode === 'restore') {
    if (!state.defects[action.siteId]) return { allowed: false, state, reason: 'That site has no learner-added defect to restore.' };
    const defects = { ...state.defects };
    delete defects[action.siteId];
    const next = { ...state, defects };
    return { allowed: true, state: next, reason: 'Only the selected site was restored.', summary: summarizePointDefects(next) };
  }
  if ((action.mode === 'vacancy' || action.mode === 'substitution') && !host) return { allowed: false, state, reason: `${action.mode === 'vacancy' ? 'Vacancies' : 'Substitutions'} must be placed on a displayed host site.` };
  if (action.mode === 'interstitial' && !interstitial) return { allowed: false, state, reason: 'An interstitial must be placed on a displayed illustrative interstitial target.' };
  if (!['vacancy', 'substitution', 'interstitial'].includes(action.mode)) return { allowed: false, state, reason: 'Choose vacancy, substitution, interstitial, restore, or clear.' };
  const defects = { ...state.defects };
  if (defects[action.siteId]?.mode === action.mode) delete defects[action.siteId];
  else defects[action.siteId] = { mode: action.mode, siteId: action.siteId };
  const next = { ...state, defects };
  const active = Boolean(defects[action.siteId]);
  const label = action.mode === 'interstitial' ? 'Interstitial' : action.mode[0].toUpperCase() + action.mode.slice(1);
  return {
    allowed: true, state: next,
    reason: active ? `${label} added only at the selected finite-supercell site.` : `${label} removed only from the selected finite-supercell site.`,
    summary: summarizePointDefects(next),
  };
}
