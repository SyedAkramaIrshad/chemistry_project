import assert from 'node:assert/strict';
import {analyzeEnzymeKinetics,progressTrace,rateAtSubstrate} from '../src/chemistry/enzymeKinetics.js';

const base={kcatPerS:120,enzymeNanoM:100,kmMicroM:50,substrateMicroM:50,inhibitorMicroM:40,kicMicroM:20,kiuMicroM:20,inhibitionMode:'none'};
const none=analyzeEnzymeKinetics(base);
const doubledEnzyme=analyzeEnzymeKinetics({...base,enzymeNanoM:200});
const competitive=analyzeEnzymeKinetics({...base,inhibitionMode:'competitive'});
const uncompetitive=analyzeEnzymeKinetics({...base,inhibitionMode:'uncompetitive'});
const pureNoncompetitive=analyzeEnzymeKinetics({...base,inhibitionMode:'mixed'});
const asymmetricMixed=analyzeEnzymeKinetics({...base,inhibitionMode:'mixed',kiuMicroM:80});
const highSubstrate=analyzeEnzymeKinetics({...base,substrateMicroM:100000});

assert.equal(none.status,'valid');
assert.ok(Math.abs(none.selected.limitingRateMicroMPerS-12)<1e-12);
assert.ok(Math.abs(none.selected.currentRateMicroMPerS-6)<1e-12);
assert.ok(Math.abs(none.selected.rateFractionOfOwnLimit-.5)<1e-12);
assert.ok(Math.abs(doubledEnzyme.selected.limitingRateMicroMPerS-24)<1e-12);
assert.ok(Math.abs(doubledEnzyme.selected.currentRateMicroMPerS-12)<1e-12);
assert.ok(highSubstrate.selected.currentRateMicroMPerS<highSubstrate.selected.limitingRateMicroMPerS);
assert.ok(highSubstrate.selected.currentRateMicroMPerS/highSubstrate.selected.limitingRateMicroMPerS>.999);

assert.ok(Math.abs(competitive.selected.apparentLimitingRateMicroMPerS-12)<1e-12);
assert.ok(Math.abs(competitive.selected.apparentKmMicroM-150)<1e-12);
assert.ok(Math.abs(uncompetitive.selected.apparentLimitingRateMicroMPerS-4)<1e-12);
assert.ok(Math.abs(uncompetitive.selected.apparentKmMicroM-50/3)<1e-12);
assert.ok(Math.abs(pureNoncompetitive.selected.apparentLimitingRateMicroMPerS-4)<1e-12);
assert.ok(Math.abs(pureNoncompetitive.selected.apparentKmMicroM-50)<1e-12);
assert.match(pureNoncompetitive.selected.label,/Pure non-competitive special case/);
assert.ok(Math.abs(asymmetricMixed.selected.apparentLimitingRateMicroMPerS-8)<1e-12);
assert.ok(Math.abs(asymmetricMixed.selected.apparentKmMicroM-100)<1e-12);
assert.match(asymmetricMixed.selected.label,/predominantly competitive/);

for(const analysis of [none,competitive,uncompetitive,pureNoncompetitive,asymmetricMixed]){
  const weightSum=Object.entries(analysis.weights).filter(([key])=>key.endsWith('Term')).reduce((sum,[,value])=>sum+value,0);
  assert.ok(Math.abs(weightSum-1)<1e-12);
  assert.equal(analysis.curves.selected.length,161);
  assert.equal(analysis.progress.selected.length,121);
  for(const trace of [analysis.progress.selected,analysis.progress.uninhibited]){
    for(let index=1;index<trace.length;index+=1){
      assert.ok(trace[index].timeS>=trace[index-1].timeS);
      assert.ok(trace[index].substrateMicroM<=trace[index-1].substrateMicroM+1e-10);
      assert.ok(trace[index].productMicroM>=trace[index-1].productMicroM-1e-10);
      assert.ok(Math.abs(trace[index].substrateMicroM+trace[index].productMicroM-base.substrateMicroM)<1e-8);
    }
  }
}

assert.ok(Math.abs(none.selected.catalyticEfficiencyMInvS-2.4e6)<1e-8);
assert.ok(Math.abs(competitive.selected.effectiveLowSubstrateEfficiencyMInvS-8e5)<1e-8);
assert.throws(()=>analyzeEnzymeKinetics({...base,kmMicroM:0}),/greater than zero/);
assert.throws(()=>analyzeEnzymeKinetics({...base,substrateMicroM:-1}),/cannot be negative/);
assert.throws(()=>analyzeEnzymeKinetics({...base,inhibitionMode:'irreversible'}),/must be one of/);
assert.throws(()=>progressTrace(10,0,5),/greater than zero/);
assert.throws(()=>rateAtSubstrate(10,{apparentLimitingRateMicroMPerS:1,apparentKmMicroM:0}),/greater than zero/);

console.log(`no inhibitor at [S]=KM: V ${none.selected.limitingRateMicroMPerS.toFixed(3)} microM/s, v ${none.selected.currentRateMicroMPerS.toFixed(3)} microM/s`);
console.log(`competitive: Vapp ${competitive.selected.apparentLimitingRateMicroMPerS.toFixed(3)}, KMapp ${competitive.selected.apparentKmMicroM.toFixed(3)} microM`);
console.log(`uncompetitive: Vapp ${uncompetitive.selected.apparentLimitingRateMicroMPerS.toFixed(3)}, KMapp ${uncompetitive.selected.apparentKmMicroM.toFixed(3)} microM`);
console.log(`pure non-competitive special case: Vapp ${pureNoncompetitive.selected.apparentLimitingRateMicroMPerS.toFixed(3)}, KMapp ${pureNoncompetitive.selected.apparentKmMicroM.toFixed(3)} microM`);
console.log('half-saturation, enzyme scaling, asymptotes, inhibitor fingerprints, denominator weights, progress conservation, and invalid inputs verified.');
