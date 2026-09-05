import assert from 'node:assert/strict';
import {NUCLEOBASES} from '../src/data/biomolecularComponents.js';
import {
  evaluateComplement,
  expectedComplement,
  nextComplementHint,
  placeComplementBase,
} from '../src/chemistry/nucleicAcids.js';

assert.equal(NUCLEOBASES.length,5);
assert.equal(new Set(NUCLEOBASES.map((base)=>base.id)).size,5);

const dna = expectedComplement({polymer:'dna',template:'GATTACA'});
assert.equal(dna.aligned,'CTAATGT');
assert.equal(dna.conventional5to3,'TGTAATC');
assert.equal(dna.expectedHydrogenBonds,16);

const rna = expectedComplement({polymer:'rna',template:'AUGGCU'});
assert.equal(rna.aligned,'UACCGA');
assert.equal(rna.conventional5to3,'AGCCAU');

const blankDNA = Object.freeze(Array(7).fill(null));
const wrongButValid = placeComplementBase({polymer:'dna',template:'GATTACA',answers:blankDNA,index:0,baseId:'A'});
assert.equal(wrongButValid.ok,true);
assert.notEqual(wrongButValid.answers,blankDNA);
assert.equal(wrongButValid.answers[0],'A');
assert.match(wrongButValid.reason,/remains|kept|placed/i);
const checkedWrong = evaluateComplement({polymer:'dna',template:'GATTACA',answers:['A','T','A','A','T','G','T']});
assert.equal(checkedWrong.status,'incorrect');
assert.equal(checkedWrong.positions[0].status,'incorrect');
assert.match(checkedWrong.positions[0].reason,/guanine|cytosine|G|C/i);

const blockedU = placeComplementBase({polymer:'dna',template:'GATTACA',answers:blankDNA,index:0,baseId:'U'});
assert.equal(blockedU.ok,false);
assert.equal(blockedU.answers,blankDNA);
assert.match(blockedU.reason,/DNA|uracil/i);
const blankRNA = Object.freeze(Array(6).fill(null));
const blockedT = placeComplementBase({polymer:'rna',template:'AUGGCU',answers:blankRNA,index:0,baseId:'T'});
assert.equal(blockedT.ok,false);
assert.equal(blockedT.answers,blankRNA);
assert.match(blockedT.reason,/RNA|thymine/i);

const incomplete = evaluateComplement({polymer:'dna',template:'GATTACA',answers:['C',null,null,null,null,null,null]});
assert.equal(incomplete.status,'incomplete');
const complete = evaluateComplement({polymer:'dna',template:'GATTACA',answers:dna.aligned.split('')});
assert.equal(complete.status,'complete');
assert.equal(complete.correctCount,7);
assert.equal(complete.establishedHydrogenBonds,16);

const hintAnswers = Object.freeze(['C',null,null,null,null,null,null]);
const hint1 = nextComplementHint({polymer:'dna',template:'GATTACA',answers:hintAnswers,level:1});
const hint2 = nextComplementHint({polymer:'dna',template:'GATTACA',answers:hintAnswers,level:2});
const hint3 = nextComplementHint({polymer:'dna',template:'GATTACA',answers:hintAnswers,level:3});
assert.equal(hint1.index,1);
assert.equal(hint2.index,1);
assert.equal(hint3.index,1);
assert.equal(hintAnswers[1],null);
assert.equal(hint1.revealsBase,false);
assert.equal(hint3.revealsBase,true);

console.log(`DNA GATTACA: aligned 3'-${dna.aligned}-5', conventional 5'-${dna.conventional5to3}-3', ${dna.expectedHydrogenBonds} canonical H bonds.`);
console.log(`RNA AUGGCU: aligned 3'-${rna.aligned}-5', conventional 5'-${rna.conventional5to3}-3'.`);
console.log('Polymer alphabets, antiparallel direction, preserved wrong-valid placements, blocked impossible bases, evaluation states, and non-mutating hints verified.');

