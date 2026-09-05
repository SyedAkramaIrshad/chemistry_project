import assert from 'node:assert/strict';
import {
  equivalenceVolumeMl,
  solveWeakAcid,
  titrationCurve,
  titrationPoint,
} from '../src/chemistry/equilibrium.js';

const params = {
  acidM: 0.1,
  acidVolumeMl: 25,
  baseM: 0.1,
  pKa: 4.76,
  temperatureC: 25,
};

const initial = titrationPoint(params, 0);
const half = titrationPoint(params, 12.5);
const equivalence = titrationPoint(params, 25);
const excess = titrationPoint(params, 30);
const weakAcid = solveWeakAcid(0.1, 4.76);
const curve = titrationCurve(params, 121, 30);

assert.ok(Math.abs(equivalenceVolumeMl(params) - 25) < 1e-12);
assert.ok(initial.pH > 2.8 && initial.pH < 3.0, `Unexpected initial pH ${initial.pH}`);
assert.ok(Math.abs(initial.pH - weakAcid.pH) < 1e-12);
assert.equal(half.regime, 'half-equivalence');
assert.ok(Math.abs(half.pH - params.pKa) < 1e-12);
assert.equal(equivalence.regime, 'equivalence');
assert.ok(equivalence.pH > 8 && equivalence.pH < 10, `Unexpected equivalence pH ${equivalence.pH}`);
assert.equal(excess.regime, 'excess-base');
assert.ok(excess.pH > equivalence.pH);

for (let index = 1; index < curve.length; index += 1) {
  assert.ok(curve[index].pH + 1e-8 >= curve[index - 1].pH, `Curve decreased at ${curve[index].baseAddedMl} mL`);
}
for (const point of curve) {
  assert.ok(point.species.haFraction >= 0 && point.species.haFraction <= 1);
  assert.ok(point.species.aFraction >= 0 && point.species.aFraction <= 1);
  assert.ok(Math.abs(point.species.haFraction + point.species.aFraction - 1) < 1e-10);
  assert.ok(Number.isFinite(point.pH));
}

assert.throws(() => titrationPoint({...params,temperatureC: 30}, 0), /only for 25/);
assert.throws(() => titrationPoint({...params,acidM: 0}, 0), /greater than zero/);
assert.throws(() => titrationPoint(params, -1), /cannot be negative/);

console.log(`initial-acid: pH ${initial.pH.toFixed(4)} at 0.0 mL`);
console.log(`half-equivalence: pH ${half.pH.toFixed(4)} at 12.5 mL`);
console.log(`equivalence: pH ${equivalence.pH.toFixed(4)} at 25.0 mL`);
console.log(`excess-base: pH ${excess.pH.toFixed(4)} at 30.0 mL`);
console.log(`${curve.length} curve points monotonic; species fractions conserved; invalid inputs rejected.`);
