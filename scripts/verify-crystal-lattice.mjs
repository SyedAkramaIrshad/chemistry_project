import assert from 'node:assert/strict';
import { CRYSTAL_STRUCTURES } from '../src/data/crystalStructures.js';
import {
  AVOGADRO_CONSTANT, applyPointDefect, calculateCrystalCell, calculateCubicDiffraction,
  createTeachingSupercell, planeCubeIntersections, projectCrystalPoint, reflectionCondition,
  summarizePointDefects,
} from '../src/chemistry/crystalLattice.js';

const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

assert.deepEqual(Object.keys(CRYSTAL_STRUCTURES), ['sc', 'bcc', 'fcc']);
const expected = {
  sc: { z: 1, cn: 6, radius: 0.5, apf: Math.PI / 6 },
  bcc: { z: 2, cn: 8, radius: Math.sqrt(3) / 4, apf: Math.sqrt(3) * Math.PI / 8 },
  fcc: { z: 4, cn: 12, radius: 1 / (2 * Math.sqrt(2)), apf: Math.PI / (3 * Math.sqrt(2)) },
};
for (const [id, structure] of Object.entries(CRYSTAL_STRUCTURES)) {
  assert.equal(structure.atomsPerCell, expected[id].z);
  assert.equal(structure.coordinationNumber, expected[id].cn);
  close(structure.radiusFactor, expected[id].radius);
  close(structure.packingFraction, expected[id].apf);
  close(structure.sharing.reduce((sum, row) => sum + row.count * row.fraction, 0), structure.atomsPerCell);
}

const fccCell = calculateCrystalCell({ structureId: 'fcc', latticeParameterA: 4, molarMassGmol: 100 });
assert.equal(fccCell.valid, true);
close(fccCell.cellVolumeA3, 64);
close(fccCell.nearestNeighborA, 4 / Math.sqrt(2));
close(fccCell.hardSphereRadiusA, Math.sqrt(2));
close(fccCell.densityGcm3, 400 / (AVOGADRO_CONSTANT * 64e-24), 1e-12);
assert.equal(calculateCrystalCell({ structureId: 'fcc', latticeParameterA: 0, molarMassGmol: 100 }).valid, false);
assert.equal(calculateCrystalCell({ structureId: 'hex', latticeParameterA: 4, molarMassGmol: 100 }).valid, false);

assert.equal(reflectionCondition('sc', 1, 0, 0).allowed, true);
assert.equal(reflectionCondition('bcc', 1, 0, 0).allowed, false);
assert.equal(reflectionCondition('bcc', 1, 1, 0).allowed, true);
assert.equal(reflectionCondition('fcc', 1, 0, 0).allowed, false);
assert.equal(reflectionCondition('fcc', 1, 1, 1).allowed, true);
assert.equal(reflectionCondition('fcc', 2, 0, 0).allowed, true);
assert.equal(reflectionCondition('fcc', 1, 1, 0).allowed, false);
assert.equal(reflectionCondition('fcc', -1, 1, 1).allowed, true);
assert.equal(reflectionCondition('fcc', 0, 0, 0).valid, false);

const sc100 = calculateCubicDiffraction({ structureId: 'sc', latticeParameterA: 4, h: 1, k: 0, l: 0, wavelengthA: 1, order: 1 });
close(sc100.dA, 4);
close(sc100.sinTheta, 0.125);
close(sc100.twoThetaDeg, 2 * Math.asin(0.125) * 180 / Math.PI);
assert.equal(sc100.status, 'allowed');
const fcc100 = calculateCubicDiffraction({ structureId: 'fcc', latticeParameterA: 4, h: 1, k: 0, l: 0, wavelengthA: 1, order: 1 });
assert.equal(fcc100.geometryPossible, true);
assert.equal(fcc100.status, 'extinct');
const impossible = calculateCubicDiffraction({ structureId: 'sc', latticeParameterA: 1, h: 3, k: 0, l: 0, wavelengthA: 1, order: 1 });
assert.equal(impossible.valid, true);
assert.equal(impossible.geometryPossible, false);
assert.equal(impossible.status, 'no-solution');

for (const point of [{ x: 0, y: 0, z: 0 }, { x: 0.5, y: 0.5, z: 0.5 }, { x: 1, y: 1, z: 1 }]) {
  const projected = projectCrystalPoint(point, { angleDeg: 47 });
  assert.ok(Number.isFinite(projected.x) && Number.isFinite(projected.y) && Number.isFinite(projected.depth));
}
assert.equal(planeCubeIntersections(1, 0, 0).length, 4);
assert.equal(planeCubeIntersections(1, 1, 0).length, 4);
assert.equal(planeCubeIntersections(1, 1, 1).length, 6);
assert.equal(planeCubeIntersections(-1, 1, 0).length, 4);
assert.equal(planeCubeIntersections(0, 0, 0).length, 0);

for (const [id, basisCount] of [['sc', 1], ['bcc', 2], ['fcc', 4]]) {
  const supercell = createTeachingSupercell(id);
  assert.equal(supercell.valid, true);
  assert.equal(supercell.hostSites.length, 3 * 3 * 2 * basisCount);
  assert.equal(supercell.interstitialSites.length, 8);
}
const initial = createTeachingSupercell('fcc');
const hostA = initial.hostSites[0].id, hostB = initial.hostSites[1].id, gap = initial.interstitialSites[0].id;
const vacancy = applyPointDefect(initial, { mode: 'vacancy', siteId: hostA });
assert.equal(vacancy.allowed, true);
assert.equal(Object.keys(initial.defects).length, 0);
assert.equal(summarizePointDefects(vacancy.state).vacancyCount, 1);
const substitution = applyPointDefect(vacancy.state, { mode: 'substitution', siteId: hostB });
assert.equal(summarizePointDefects(substitution.state).substitutionCount, 1);
const interstitial = applyPointDefect(substitution.state, { mode: 'interstitial', siteId: gap });
assert.equal(summarizePointDefects(interstitial.state).interstitialCount, 1);
const invalidSite = applyPointDefect(interstitial.state, { mode: 'vacancy', siteId: gap });
assert.equal(invalidSite.allowed, false);
assert.equal(invalidSite.state, interstitial.state);
const restored = applyPointDefect(interstitial.state, { mode: 'restore', siteId: hostA });
assert.equal(summarizePointDefects(restored.state).vacancyCount, 0);
const cleared = applyPointDefect(restored.state, { mode: 'clear' });
assert.deepEqual(cleared.state.defects, {});
const toggled = applyPointDefect(initial, { mode: 'vacancy', siteId: hostA });
const untoggled = applyPointDefect(toggled.state, { mode: 'vacancy', siteId: hostA });
assert.equal(summarizePointDefects(untoggled.state).vacancyCount, 0);

console.log('3 cubic reference cells resolved with exact sharing, coordination, contact geometry, and packing invariants.');
console.log(`SC ${(CRYSTAL_STRUCTURES.sc.packingFraction * 100).toFixed(2)}% · BCC ${(CRYSTAL_STRUCTURES.bcc.packingFraction * 100).toFixed(2)}% · FCC ${(CRYSTAL_STRUCTURES.fcc.packingFraction * 100).toFixed(2)}% packing.`);
console.log('density conversion, signed Miller planes, Bragg geometry, centring extinctions, projection, immutable point defects, restore, and clear verified.');
