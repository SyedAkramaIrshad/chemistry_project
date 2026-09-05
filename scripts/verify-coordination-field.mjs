import assert from 'node:assert/strict';
import { COORDINATION_GEOMETRIES, METAL_ION_PRESETS } from '../src/data/coordinationScenarios.js';
import {
  configurationMetrics, deriveDCount, evaluateConfiguration, findGroundConfiguration,
  groupOccupationNotation, nextCoordinationHint, toggleOrbitalOccupancy,
} from '../src/chemistry/coordinationField.js';

const close = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

assert.equal(METAL_ION_PRESETS.length, 11);
for (const ion of METAL_ION_PRESETS) {
  const derived = deriveDCount({ group: ion.group, oxidation: ion.oxidation });
  assert.equal(derived.valid, true);
  assert.equal(derived.dCount, ion.dCount);
}
assert.equal(deriveDCount({ group: 2, oxidation: 2 }).valid, false);
assert.equal(deriveDCount({ group: 4, oxidation: 5 }).valid, false);

assert.deepEqual(Object.keys(COORDINATION_GEOMETRIES), ['octahedral', 'tetrahedral', 'squarePlanar']);
for (const geometry of Object.values(COORDINATION_GEOMETRIES)) {
  close(geometry.orbitals.reduce((sum, orbital) => sum + orbital.coefficient, 0), 0);
  assert.equal(geometry.orbitals.length, 5);
}
assert.equal(COORDINATION_GEOMETRIES.squarePlanar.normalizedOnly, true);

const octD6High = findGroundConfiguration({ geometryId: 'octahedral', dCount: 6, deltaKJmol: 100, pairingKJmol: 250 });
assert.equal(octD6High.valid, true);
assert.equal(octD6High.metrics.unpairedElectrons, 4);
assert.equal(octD6High.metrics.pairCount, 1);
close(octD6High.metrics.fieldEnergyKJmol, -40);
close(octD6High.metrics.modelEnergyKJmol, 210);
assert.equal(octD6High.notation, 't2g^4 · eg^2');

const octD6Low = findGroundConfiguration({ geometryId: 'octahedral', dCount: 6, deltaKJmol: 300, pairingKJmol: 150 });
assert.equal(octD6Low.metrics.unpairedElectrons, 0);
assert.equal(octD6Low.metrics.pairCount, 3);
close(octD6Low.metrics.fieldEnergyKJmol, -720);
close(octD6Low.metrics.modelEnergyKJmol, -270);
assert.equal(octD6Low.notation, 't2g^6 · eg^0');

const octD5High = findGroundConfiguration({ geometryId: 'octahedral', dCount: 5, deltaKJmol: 100, pairingKJmol: 250 });
assert.equal(octD5High.metrics.unpairedElectrons, 5);
assert.equal(octD5High.metrics.pairCount, 0);
const octD5Low = findGroundConfiguration({ geometryId: 'octahedral', dCount: 5, deltaKJmol: 300, pairingKJmol: 150 });
assert.equal(octD5Low.metrics.unpairedElectrons, 1);
assert.equal(octD5Low.metrics.pairCount, 2);

const tetraD5 = findGroundConfiguration({ geometryId: 'tetrahedral', dCount: 5, deltaKJmol: 100, pairingKJmol: 250 });
assert.equal(tetraD5.metrics.unpairedElectrons, 5);
close(tetraD5.metrics.fieldEnergyKJmol, 0);

const squareD8 = findGroundConfiguration({ geometryId: 'squarePlanar', dCount: 8, deltaKJmol: 300, pairingKJmol: 150 });
assert.equal(squareD8.metrics.unpairedElectrons, 0);
assert.equal(squareD8.metrics.pairCount, 4);
assert.equal(squareD8.configuration[4], 0);

const moment = configurationMetrics({ geometryId: 'octahedral', configuration: octD6High.configuration, deltaKJmol: 100, pairingKJmol: 250 });
close(moment.spinOnlyMomentBM, Math.sqrt(24));
assert.equal(moment.spinMultiplicity, 5);
close(moment.gapEquivalentWavelengthNm, 1196.265656);

const degenerateD2A = [1, 1, 0, 0, 0], degenerateD2B = [0, 1, 1, 0, 0];
assert.equal(evaluateConfiguration({ geometryId: 'octahedral', dCount: 2, configuration: degenerateD2A, deltaKJmol: 100, pairingKJmol: 250 }).committed, true);
assert.equal(evaluateConfiguration({ geometryId: 'octahedral', dCount: 2, configuration: degenerateD2B, deltaKJmol: 100, pairingKJmol: 250 }).committed, true);
assert.equal(groupOccupationNotation('octahedral', degenerateD2B), 't2g^2 · eg^0');

const wrongLowAtWeak = evaluateConfiguration({ geometryId: 'octahedral', dCount: 6, configuration: [2, 2, 2, 0, 0], deltaKJmol: 100, pairingKJmol: 250 });
assert.equal(wrongLowAtWeak.committed, false);
assert.ok(wrongLowAtWeak.energyGapKJmol > 0);
const wrongTotal = evaluateConfiguration({ geometryId: 'octahedral', dCount: 6, configuration: [1, 1, 1, 1, 1], deltaKJmol: 100, pairingKJmol: 250 });
assert.equal(wrongTotal.committed, false);
assert.match(wrongTotal.reason, /still need/);

const original = [2, 1, 1, 1, 1];
const blocked = toggleOrbitalOccupancy({ configuration: original, orbitalIndex: 1, dCount: 6 });
assert.equal(blocked.allowed, false);
assert.equal(blocked.configuration, original);
assert.deepEqual(original, [2, 1, 1, 1, 1]);
const removed = toggleOrbitalOccupancy({ configuration: original, orbitalIndex: 0, dCount: 6 });
assert.equal(removed.allowed, true);
assert.deepEqual(removed.configuration, [0, 1, 1, 1, 1]);
assert.deepEqual(original, [2, 1, 1, 1, 1]);

const hintConfiguration = [1, 0, 0, 0, 0];
for (const level of [1, 2, 3]) {
  const hint = nextCoordinationHint({ geometryId: 'octahedral', dCount: 6, deltaKJmol: 100, pairingKJmol: 250, level, configuration: hintConfiguration });
  assert.equal(hint.valid, true);
  assert.equal(hint.configuration, hintConfiguration);
  assert.deepEqual(hintConfiguration, [1, 0, 0, 0, 0]);
}

console.log('11 first-row ion presets resolved through group minus oxidation-state d counts.');
console.log('Octahedral d6: weak-field 4 unpaired; strong-field 0 unpaired. Tetrahedral d5 and normalized square-planar d8 references resolved.');
console.log('orbital barycentres, exhaustive occupations, field and pairing ledgers, spin-only outputs, degenerate equivalents, immutable toggles, blocked overfill, and hints verified.');
