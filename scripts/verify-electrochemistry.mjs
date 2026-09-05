import assert from 'node:assert/strict';
import {ELECTROCHEMICAL_COUPLES,ELECTROCHEMISTRY_CONSTANTS} from '../src/data/electrochemicalCouples.js';
import {
  analyzeElectrochemicalCell,
  analyzeElectrolysis,
  createCellPotentialTrace,
  createDepositionTrace,
  evaluateCircuitPrediction,
  evaluateElectrolysisPrediction,
} from '../src/chemistry/electrochemistry.js';

const close=(actual,expected,tolerance=1e-10)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} is not within ${tolerance} of ${expected}`);

assert.equal(ELECTROCHEMICAL_COUPLES.length,6);
assert.equal(new Set(ELECTROCHEMICAL_COUPLES.map((item)=>item.id)).size,6);
for(const couple of ELECTROCHEMICAL_COUPLES){
  assert.ok(couple.reductionEquation&&couple.boundary&&couple.sourceId);
  assert.ok(Number.isInteger(couple.electronNumber)&&couple.electronNumber>0);
  assert.ok(Number.isFinite(couple.standardPotentialV)&&couple.molarMassGmol>0);
}

const daniell=analyzeElectrochemicalCell({leftCoupleId:'zn',rightCoupleId:'cu',leftActivity:1,rightActivity:1,temperatureK:298.15,orientation:'left-oxidizes'});
close(daniell.standardCellPotentialV,1.1026);
close(daniell.cellPotentialV,1.1026);
assert.equal(daniell.electronNumber,2);
assert.equal(daniell.reactionQuotient,1);
assert.equal(daniell.selected.anodeSide,'left');
assert.equal(daniell.spontaneous.anodeSide,'left');
assert.equal(daniell.spontaneous.electronDirection,'left-to-right');
assert.equal(daniell.spontaneous.cationDestination,'right');
assert.equal(daniell.spontaneous.anionDestination,'left');
assert.match(daniell.overallEquation,/Zn\(s\).*Cu²⁺\(aq\).*Zn²⁺\(aq\).*Cu\(s\)/);
close(daniell.standardDeltaGJmol,-2*ELECTROCHEMISTRY_CONSTANTS.faradayConstantCMol*1.1026,1e-7);
close(daniell.log10StandardEquilibriumConstant,2*ELECTROCHEMISTRY_CONSTANTS.faradayConstantCMol*1.1026/(Math.log(10)*ELECTROCHEMISTRY_CONSTANTS.gasConstantJMolK*298.15),1e-10);

const nonstandard=analyzeElectrochemicalCell({leftCoupleId:'zn',rightCoupleId:'cu',leftActivity:10,rightActivity:.1,temperatureK:298.15,orientation:'left-oxidizes'});
close(nonstandard.reactionQuotient,100);
close(nonstandard.cellPotentialV,1.1026-ELECTROCHEMISTRY_CONSTANTS.gasConstantJMolK*298.15/(2*ELECTROCHEMISTRY_CONSTANTS.faradayConstantCMol)*Math.log(100),1e-12);
assert.ok(nonstandard.cellPotentialV<daniell.cellPotentialV);

const reversed=analyzeElectrochemicalCell({leftCoupleId:'zn',rightCoupleId:'cu',leftActivity:1,rightActivity:1,temperatureK:298.15,orientation:'right-oxidizes'});
close(reversed.cellPotentialV,-1.1026);
assert.equal(reversed.selected.spontaneousAsWritten,false);
assert.equal(reversed.spontaneous.anodeSide,'left');

const zincSilver=analyzeElectrochemicalCell({leftCoupleId:'zn',rightCoupleId:'ag',leftActivity:2,rightActivity:.5,temperatureK:298.15,orientation:'left-oxidizes'});
assert.equal(zincSilver.electronNumber,2);
close(zincSilver.standardCellPotentialV,1.5622);
close(zincSilver.reactionQuotient,2/(.5**2));
assert.match(zincSilver.overallEquation,/2Ag⁺/);
assert.match(zincSilver.reactionQuotientExpression,/Ag⁺.*²/);

const wrongPrediction=Object.freeze({predictedAnodeSide:'right',predictedElectronDirection:'left-to-right',predictedCationDestination:'left',predictedAnionDestination:'right'});
const wrongCheck=evaluateCircuitPrediction({analysis:daniell,...wrongPrediction});
assert.equal(wrongCheck.correct,false);
assert.equal(wrongCheck.prediction.predictedAnodeSide,wrongPrediction.predictedAnodeSide);
assert.equal(wrongPrediction.predictedAnodeSide,'right');
assert.equal(wrongCheck.dimensions.anode.correct,false);
assert.equal(wrongCheck.dimensions.electrons.correct,true);
assert.match(wrongCheck.dimensions.anode.reason,/oxidation|zinc/i);

const correctCheck=evaluateCircuitPrediction({analysis:daniell,predictedAnodeSide:'left',predictedElectronDirection:'left-to-right',predictedCationDestination:'right',predictedAnionDestination:'left'});
assert.equal(correctCheck.correct,true);
assert.ok(Object.values(correctCheck.dimensions).every((item)=>item.correct));

const trace=createCellPotentialTrace({leftCoupleId:'zn',rightCoupleId:'cu',temperatureK:298.15,orientation:'left-oxidizes',pointCount:65});
assert.equal(trace.points.length,65);
close(trace.points[0].log10ReactionQuotient,-8);
close(trace.points.at(-1).log10ReactionQuotient,8);
for(let index=1;index<trace.points.length;index+=1)assert.ok(trace.points[index].cellPotentialV<trace.points[index-1].cellPotentialV);

assert.throws(()=>analyzeElectrochemicalCell({leftCoupleId:'cu',rightCoupleId:'cu',leftActivity:1,rightActivity:1,temperatureK:298.15,orientation:'left-oxidizes'}),/different|same/i);
assert.throws(()=>analyzeElectrochemicalCell({leftCoupleId:'zn',rightCoupleId:'cu',leftActivity:0,rightActivity:1,temperatureK:298.15,orientation:'left-oxidizes'}),/activity/i);
assert.throws(()=>analyzeElectrochemicalCell({leftCoupleId:'zn',rightCoupleId:'cu',leftActivity:1,rightActivity:1,temperatureK:0,orientation:'left-oxidizes'}),/temperature/i);

const copperPlating=analyzeElectrolysis({coupleId:'cu',currentA:2,timeSeconds:1800,currentEfficiency:1});
close(copperPlating.chargeC,3600);
close(copperPlating.electronAmountMol,3600/ELECTROCHEMISTRY_CONSTANTS.faradayConstantCMol,1e-14);
close(copperPlating.idealDepositAmountMol,3600/(2*ELECTROCHEMISTRY_CONSTANTS.faradayConstantCMol),1e-14);
close(copperPlating.idealMassG,63.546*3600/(2*ELECTROCHEMISTRY_CONSTANTS.faradayConstantCMol),1e-12);
close(copperPlating.expectedMassG,copperPlating.idealMassG);

const copperAtEighty=analyzeElectrolysis({coupleId:'cu',currentA:2,timeSeconds:1800,currentEfficiency:.8});
close(copperAtEighty.expectedMassG,copperPlating.idealMassG*.8,1e-12);
close(copperAtEighty.unassignedMassEquivalentG,copperPlating.idealMassG*.2,1e-12);

const learnerMass=0.5;
const lowMass=evaluateElectrolysisPrediction({analysis:copperPlating,predictedMassG:learnerMass,toleranceFraction:.03});
assert.equal(lowMass.correct,false);
assert.equal(lowMass.classification,'low');
assert.equal(lowMass.predictedMassG,learnerMass);
assert.match(lowMass.reason,/lower|low|charge ledger/i);
const closeMass=evaluateElectrolysisPrediction({analysis:copperPlating,predictedMassG:copperPlating.expectedMassG*1.01,toleranceFraction:.03});
assert.equal(closeMass.correct,true);
assert.equal(closeMass.classification,'within-tolerance');

const deposition=createDepositionTrace({coupleId:'cu',currentA:2,timeSeconds:1800,currentEfficiency:.8,pointCount:31});
assert.equal(deposition.points.length,31);
close(deposition.points[0].timeSeconds,0);
close(deposition.points[0].expectedMassG,0);
close(deposition.points.at(-1).timeSeconds,1800);
close(deposition.points.at(-1).expectedMassG,copperAtEighty.expectedMassG,1e-12);
for(let index=1;index<deposition.points.length;index+=1)assert.ok(deposition.points[index].expectedMassG>deposition.points[index-1].expectedMassG);

assert.throws(()=>analyzeElectrolysis({coupleId:'cu',currentA:0,timeSeconds:1800,currentEfficiency:1}),/current/i);
assert.throws(()=>analyzeElectrolysis({coupleId:'cu',currentA:2,timeSeconds:-1,currentEfficiency:1}),/time/i);
assert.throws(()=>analyzeElectrolysis({coupleId:'cu',currentA:2,timeSeconds:1800,currentEfficiency:1.1}),/efficiency/i);

console.log(`Daniell reference: E0 ${daniell.standardCellPotentialV.toFixed(4)} V, deltaG0 ${(daniell.standardDeltaGJmol/1000).toFixed(2)} kJ mol^-1, log10 K0 ${daniell.log10StandardEquilibriumConstant.toFixed(2)}.`);
console.log(`Nonstandard a(Zn2+) 10 / a(Cu2+) 0.1: Q ${nonstandard.reactionQuotient.toFixed(0)}, E ${nonstandard.cellPotentialV.toFixed(5)} V.`);
console.log(`Zn/Ag electron balance: n ${zincSilver.electronNumber}, ${zincSilver.overallEquation}.`);
console.log(`Cu electrolysis: ${copperPlating.chargeC.toFixed(0)} C gives ${copperPlating.expectedMassG.toFixed(5)} g ideal; 80% efficiency gives ${copperAtEighty.expectedMassG.toFixed(5)} g.`);
console.log('half-cell potentials, electron LCM, reaction quotient, Nernst shift, thermodynamic links, oriented reversal, four prediction dimensions, and rejection boundaries verified.');
console.log('Faraday charge ledger, current-efficiency scaling, preserved mass predictions, deposition trace, and invalid electrolysis inputs verified.');
