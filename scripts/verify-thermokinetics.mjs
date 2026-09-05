import assert from 'node:assert/strict';
import {
  analyzeThermoKinetics,
  firstOrderTrace,
} from '../src/chemistry/thermokinetics.js';

const base = {
  deltaHkJ: -50,
  deltaSJ: -100,
  temperatureK: 298,
  activationKJ: 75,
  catalystReductionKJ: 15,
  preExponentialPerS: 1e12,
};

const room = analyzeThermoKinetics(base);
const hot = analyzeThermoKinetics({...base,temperatureK:600});
const noCatalyst = analyzeThermoKinetics({...base,catalystReductionKJ:0});

assert.equal(room.status,'valid');
assert.ok(Math.abs(room.thermodynamics.deltaGkJ + 20.2) < 1e-10);
assert.ok(room.thermodynamics.equilibriumConstant > 1);
assert.ok(hot.thermodynamics.deltaGkJ > 0);
assert.ok(hot.thermodynamics.equilibriumConstant < 1);
assert.ok(room.kinetics.catalyzed.rateConstantPerS > room.kinetics.uncatalyzed.rateConstantPerS);
assert.ok(room.kinetics.rateAcceleration > 400);
assert.ok(room.kinetics.catalyzed.halfLifeS < room.kinetics.uncatalyzed.halfLifeS);
assert.ok(Math.abs(room.thermodynamics.deltaGkJ-noCatalyst.thermodynamics.deltaGkJ)<1e-12);
assert.ok(Math.abs(room.thermodynamics.log10K-noCatalyst.thermodynamics.log10K)<1e-12);

for (const trace of [room.kinetics.traces.uncatalyzed,room.kinetics.traces.catalyzed]) {
  assert.equal(trace[0].remainingFraction,1);
  for(let index=1;index<trace.length;index+=1){
    assert.ok(trace[index].timeS>=trace[index-1].timeS);
    assert.ok(trace[index].remainingFraction<=trace[index-1].remainingFraction+1e-12);
    assert.ok(trace[index].remainingFraction>=0&&trace[index].remainingFraction<=1);
  }
}
assert.ok(Math.abs(room.kinetics.traces.uncatalyzed.at(-1).remainingFraction-1/64)<1e-10);

const impossibleEndothermic = analyzeThermoKinetics({...base,deltaHkJ:80,activationKJ:50,catalystReductionKJ:0});
assert.equal(impossibleEndothermic.status,'invalid');
assert.match(impossibleEndothermic.errors[0],/Increase forward Ea/);
const impossibleCatalyst = analyzeThermoKinetics({...base,catalystReductionKJ:90});
assert.equal(impossibleCatalyst.status,'invalid');
assert.match(impossibleCatalyst.errors[0],/Use at most/);
assert.throws(()=>firstOrderTrace(-1,10),/cannot be negative/);

console.log(`298 K: ΔG° ${room.thermodynamics.deltaGkJ.toFixed(3)} kJ/mol, log10 K ${room.thermodynamics.log10K.toFixed(3)}`);
console.log(`600 K: ΔG° ${hot.thermodynamics.deltaGkJ.toFixed(3)} kJ/mol, log10 K ${hot.thermodynamics.log10K.toFixed(3)}`);
console.log(`uncatalyzed k ${room.kinetics.uncatalyzed.rateConstantPerS.toExponential(4)} s^-1, t1/2 ${room.kinetics.uncatalyzed.halfLifeS.toFixed(4)} s`);
console.log(`catalyzed k ${room.kinetics.catalyzed.rateConstantPerS.toExponential(4)} s^-1, acceleration ×${room.kinetics.rateAcceleration.toFixed(2)}`);
console.log('temperature response, catalyst invariance, monotonic traces, and invalid barriers verified.');
