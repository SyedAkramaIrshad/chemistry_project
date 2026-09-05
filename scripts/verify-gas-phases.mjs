import assert from 'node:assert/strict';
import {GAS_PRESETS, WATER_PHASE_MODEL} from '../src/data/gasPhaseScenarios.js';
import {
  GAS_CONSTANT_L_BAR,
  analyzeGasState,
  analyzeWaterPhase,
  createIsothermTrace,
  deriveVanDerWaalsParameters,
  evaluateGasLawPrediction,
  evaluatePhasePrediction,
  idealGasPressureBar,
  nextGasLawHint,
  nextPhaseHint,
  runGasLawExperiment,
  waterBoilingTemperatureK,
  waterSaturationPressureBar,
} from '../src/chemistry/gasPhases.js';

const close = (actual,expected,tolerance=1e-10) => assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} is not within ${tolerance} of ${expected}`);

const standardVolume = GAS_CONSTANT_L_BAR*298.15;
close(idealGasPressureBar({amountMol:1,volumeL:standardVolume,temperatureK:298.15}),1,1e-12);

const boyle = runGasLawExperiment({lawId:'boyle',targetValue:standardVolume/2});
close(boyle.final.pressureBar,2,1e-12);
close(boyle.invariantBefore,boyle.invariantAfter,1e-12);
assert.equal(boyle.expectedDirection,'increase');

const charles = runGasLawExperiment({lawId:'charles',targetValue:596.3});
close(charles.final.volumeL,standardVolume*2,1e-10);
close(charles.invariantBefore,charles.invariantAfter,1e-12);
assert.equal(charles.expectedDirection,'increase');

const avogadro = runGasLawExperiment({lawId:'avogadro',targetValue:2});
close(avogadro.final.volumeL,standardVolume*2,1e-10);
close(avogadro.invariantBefore,avogadro.invariantAfter,1e-12);
assert.equal(avogadro.expectedDirection,'increase');

const wrongLaw = evaluateGasLawPrediction({lawId:'boyle',targetValue:standardVolume/2,prediction:'decrease'});
assert.equal(wrongLaw.correct,false);
assert.equal(wrongLaw.learnerPrediction,'decrease');
assert.match(wrongLaw.reason,/keep|calculated/i);
assert.match(nextGasLawHint({lawId:'boyle',targetValue:standardVolume/2,level:1}),/pV/);
assert.match(nextGasLawHint({lawId:'boyle',targetValue:standardVolume/2,level:3}),/p₂\/p₁ = V₁\/V₂/);

for (const preset of GAS_PRESETS.filter((entry)=>entry.critical)) {
  const parameters = deriveVanDerWaalsParameters({criticalTemperatureK:preset.critical.temperatureK,criticalPressureBar:preset.critical.pressureBar});
  const state = analyzeGasState({gasId:preset.id,amountMol:1,volumeL:parameters.criticalMolarVolumeLmol,temperatureK:preset.critical.temperatureK});
  assert.equal(state.real.status,'valid');
  close(state.real.pressureBar,preset.critical.pressureBar,1e-8);
  close(state.real.excludedVolumePressureBar-state.real.attractionCorrectionBar,state.real.pressureBar,1e-12);
}

const ideal = analyzeGasState({gasId:'ideal',amountMol:1,volumeL:standardVolume,temperatureK:298.15});
assert.equal(ideal.ideal.compressionFactor,1);
assert.equal(ideal.real,null);

const carbonParameters = deriveVanDerWaalsParameters({criticalTemperatureK:304.18,criticalPressureBar:73.80});
const blockedInput = Object.freeze({gasId:'carbon-dioxide',amountMol:2,volumeL:carbonParameters.bLmol*2,temperatureK:300});
const blocked = analyzeGasState(blockedInput);
assert.equal(blocked.real.status,'blocked');
assert.equal(blocked.input.volumeL,blockedInput.volumeL);
assert.equal(blockedInput.volumeL,carbonParameters.bLmol*2);
assert.match(blocked.real.reason,/preserved/);

const subcriticalTrace = createIsothermTrace({gasId:'carbon-dioxide',temperatureK:280,pointCount:120});
assert.equal(subcriticalTrace.subcritical,true);
assert.equal(subcriticalTrace.hasRawLoop,true);
assert.match(subcriticalTrace.phaseWarning,/Maxwell/);

const waterRoom = waterSaturationPressureBar(298.15);
const waterHot = waterSaturationPressureBar(373);
assert.ok(waterRoom>0.031&&waterRoom<0.033);
assert.ok(waterHot>0.98&&waterHot<1.01);
const boilingAtUpperCorrelationPressure = waterBoilingTemperatureK(waterHot);
close(boilingAtUpperCorrelationPressure,373,1e-10);
assert.throws(()=>waterBoilingTemperatureK(1),/outside the Antoine range/);

const lowPressure = analyzeWaterPhase({temperatureK:298.15,externalPressureBar:0.01});
const equalPressure = analyzeWaterPhase({temperatureK:298.15,externalPressureBar:waterRoom});
const highPressure = analyzeWaterPhase({temperatureK:298.15,externalPressureBar:1});
assert.equal(lowPressure.tendency,'evaporation');
assert.equal(equalPressure.tendency,'equilibrium');
assert.equal(highPressure.tendency,'condensation');

const wrongPhase = evaluatePhasePrediction({temperatureK:298.15,externalPressureBar:1,prediction:'evaporation'});
assert.equal(wrongPhase.correct,false);
assert.equal(wrongPhase.learnerPrediction,'evaporation');
assert.match(nextPhaseHint({temperatureK:298.15,externalPressureBar:1,level:2}),/pSat/);
assert.throws(()=>waterSaturationPressureBar(WATER_PHASE_MODEL.validTemperatureK.maximum+0.01),/Antoine range/);

console.log(`Ideal standard state: ${standardVolume.toFixed(5)} L mol^-1 at 298.15 K and 1 bar.`);
console.log(`Critical-derived cubic parameters reproduce Pc for ${GAS_PRESETS.length-1} NIST-backed presets.`);
console.log(`Water pSat: ${waterRoom.toFixed(5)} bar at 298.15 K; ${waterHot.toFixed(5)} bar at 373 K; inverse at that pressure returns ${boilingAtUpperCorrelationPressure.toFixed(3)} K.`);
console.log('gas-law invariants, learner-prediction preservation, cubic pressure ledger, excluded-volume rejection, raw-loop warning, and pure-water phase tendencies verified.');
