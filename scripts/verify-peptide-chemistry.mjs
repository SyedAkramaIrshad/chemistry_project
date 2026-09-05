import assert from 'node:assert/strict';
import {AMINO_ACIDS, DEFAULT_PKA_MODEL} from '../src/data/biomolecularComponents.js';
import {
  analyzePeptideIonization,
  analyzePeptideState,
  createChargeTrace,
  createPeptideState,
  extendPeptide,
  hydrolyzePeptideBond,
  solveIsoelectricPH,
} from '../src/chemistry/peptideChemistry.js';

const close = (actual,expected,tolerance) => assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} is not within ${tolerance} of ${expected}`);

assert.equal(AMINO_ACIDS.length,20);
assert.equal(new Set(AMINO_ACIDS.map((item)=>item.id)).size,20);
assert.equal(new Set(AMINO_ACIDS.map((item)=>item.oneLetter)).size,20);
assert.equal(new Set(AMINO_ACIDS.map((item)=>item.threeLetter)).size,20);
for (const aminoAcid of AMINO_ACIDS) {
  assert.ok(aminoAcid.name&&aminoAcid.formula&&aminoAcid.sideChain&&aminoAcid.classId);
}

const glycine = createPeptideState(['gly']);
const glyAlaResult = extendPeptide({state:glycine,chainIndex:0,residueId:'ala',end:'c'});
assert.equal(glyAlaResult.ok,true);
assert.notEqual(glyAlaResult.state,glycine);
assert.deepEqual(glyAlaResult.state.chains,[['gly','ala']]);
const glyAla = analyzePeptideState(glyAlaResult.state);
assert.equal(glyAla.formula,'C5H10N2O3');
close(glyAla.averageMolarMass,146.146,0.01);
assert.equal(glyAla.peptideBondCount,1);
assert.equal(glyAla.waterReleased,1);
assert.equal(glyAla.waterConsumed,0);

const nExtended = extendPeptide({state:glyAlaResult.state,chainIndex:0,residueId:'ser',end:'n'});
assert.deepEqual(nExtended.state.chains,[['ser','gly','ala']]);
const cExtended = extendPeptide({state:nExtended.state,chainIndex:0,residueId:'lys',end:'c'});
assert.deepEqual(cExtended.state.chains,[['ser','gly','ala','lys']]);

let capped = createPeptideState(['gly']);
for (const residueId of ['ala','ser','val','lys','asp','phe','gln']) capped = extendPeptide({state:capped,chainIndex:0,residueId,end:'c',maxResidues:8}).state;
const blockedCap = extendPeptide({state:capped,chainIndex:0,residueId:'trp',end:'c',maxResidues:8});
assert.equal(blockedCap.ok,false);
assert.equal(blockedCap.state,capped);
assert.match(blockedCap.reason,/eight|8|limit/i);

const beforeHydrolysis = cExtended.state;
const hydrolysis = hydrolyzePeptideBond({state:beforeHydrolysis,chainIndex:0,bondIndex:1});
assert.equal(hydrolysis.ok,true);
assert.notEqual(hydrolysis.state,beforeHydrolysis);
assert.deepEqual(hydrolysis.state.chains,[['ser','gly'],['ala','lys']]);
const split = analyzePeptideState(hydrolysis.state);
assert.equal(split.peptideBondCount,2);
assert.equal(split.waterReleased,3);
assert.equal(split.waterConsumed,1);
const blockedHydrolysis = hydrolyzePeptideBond({state:hydrolysis.state,chainIndex:0,bondIndex:4});
assert.equal(blockedHydrolysis.ok,false);
assert.equal(blockedHydrolysis.state,hydrolysis.state);

const acidicLow = analyzePeptideIonization({sequence:['asp'],pH:2,pKaModel:DEFAULT_PKA_MODEL});
const acidicHigh = analyzePeptideIonization({sequence:['asp'],pH:12,pKaModel:DEFAULT_PKA_MODEL});
assert.ok(acidicLow.netCharge>acidicHigh.netCharge);
const trace = createChargeTrace({sequence:['lys','asp'],pKaModel:DEFAULT_PKA_MODEL,pointCount:57});
assert.equal(trace.length,57);
for (let index=1;index<trace.length;index+=1) assert.ok(trace[index].netCharge<=trace[index-1].netCharge+1e-12);

close(solveIsoelectricPH({sequence:['gly'],pKaModel:DEFAULT_PKA_MODEL}),6.015,0.01);
close(solveIsoelectricPH({sequence:['asp'],pKaModel:DEFAULT_PKA_MODEL}),3.00,0.08);
close(solveIsoelectricPH({sequence:['lys'],pKaModel:DEFAULT_PKA_MODEL}),10.11,0.08);

console.log(`Declared amino-acid library: ${AMINO_ACIDS.length} unique proteinogenic records.`);
console.log(`Gly-Ala: ${glyAla.formula}, ${glyAla.averageMolarMass.toFixed(3)} g mol^-1, ${glyAla.waterReleased} H2O released.`);
console.log(`Classroom pH(I): Gly ${solveIsoelectricPH({sequence:['gly']}).toFixed(3)}, Asp ${solveIsoelectricPH({sequence:['asp']}).toFixed(3)}, Lys ${solveIsoelectricPH({sequence:['lys']}).toFixed(3)}.`);
console.log('N/C extension, residue cap, peptide hydrolysis, formula ledger, fractional charge monotonicity, and immutable blocked outcomes verified.');

