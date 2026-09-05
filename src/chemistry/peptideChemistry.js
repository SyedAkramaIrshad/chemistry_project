import {
  AMINO_ACIDS,
  DEFAULT_PKA_MODEL,
  aminoAcidById,
} from '../data/biomolecularComponents.js';

export const AVERAGE_ATOMIC_MASSES = Object.freeze({
  H: 1.008,
  C: 12.011,
  N: 14.007,
  O: 15.999,
  S: 32.06,
});

const FORMULA_ORDER = Object.freeze(['C','H','N','O','S']);

function finiteNumber(value,label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${label} must be a finite number.`);
  return number;
}

function integerAtLeast(value,minimum,label) {
  const number = finiteNumber(value,label);
  if (!Number.isInteger(number)||number<minimum) throw new RangeError(`${label} must be an integer of at least ${minimum}.`);
  return number;
}

function assertResidueId(residueId) {
  const residue = aminoAcidById(residueId);
  if (!residue) throw new RangeError(`Unknown amino-acid residue: ${residueId}.`);
  return residue;
}

function freezeChains(chains) {
  return Object.freeze(chains.map((chain)=>Object.freeze([...chain])));
}

function freezeHistory(history) {
  return Object.freeze(history.map((entry)=>Object.freeze({...entry})));
}

function freezeState({chains,waterReleased,waterConsumed,history}) {
  return Object.freeze({
    chains: freezeChains(chains),
    waterReleased,
    waterConsumed,
    history: freezeHistory(history),
  });
}

function stateResidueCount(state) {
  return state.chains.reduce((total,chain)=>total+chain.length,0);
}

function validatePeptideState(state) {
  if (!state||!Array.isArray(state.chains)||state.chains.length===0) throw new TypeError('Peptide state must contain at least one chain.');
  for (const chain of state.chains) {
    if (!Array.isArray(chain)||chain.length===0) throw new TypeError('Every peptide fragment must contain at least one residue.');
    chain.forEach(assertResidueId);
  }
  integerAtLeast(state.waterReleased,0,'Water released');
  integerAtLeast(state.waterConsumed,0,'Water consumed');
  if (!Array.isArray(state.history)) throw new TypeError('Peptide history must be an array.');
}

function blockedOutcome(state,reason,code) {
  return Object.freeze({ok:false,code,reason,state});
}

function successfulOutcome(state,reason,code) {
  return Object.freeze({ok:true,code,reason,state});
}

export function parseFormula(formula) {
  if (typeof formula!=='string'||formula.length===0) throw new TypeError('Formula must be a non-empty string.');
  const counts = {};
  let consumed = '';
  for (const match of formula.matchAll(/([A-Z][a-z]?)(\d*)/g)) {
    const [,element,countText] = match;
    const count = countText ? Number(countText) : 1;
    counts[element] = (counts[element]??0)+count;
    consumed += match[0];
  }
  if (consumed!==formula) throw new RangeError(`Formula could not be parsed completely: ${formula}.`);
  return Object.freeze(counts);
}

export function formulaToString(counts) {
  const keys = [
    ...FORMULA_ORDER.filter((element)=>(counts[element]??0)!==0),
    ...Object.keys(counts).filter((element)=>!FORMULA_ORDER.includes(element)&&(counts[element]??0)!==0).sort(),
  ];
  return keys.map((element)=>`${element}${counts[element]===1?'':counts[element]}`).join('');
}

export function averageMolarMass(counts) {
  return Object.entries(counts).reduce((total,[element,count])=>{
    const atomicMass = AVERAGE_ATOMIC_MASSES[element];
    if (!atomicMass) throw new RangeError(`No declared average atomic mass for ${element}.`);
    return total+atomicMass*count;
  },0);
}

function mergeFormula(target,formula,multiplier=1) {
  for (const [element,count] of Object.entries(parseFormula(formula))) target[element]=(target[element]??0)+count*multiplier;
}

export function createPeptideState(residueIds=['gly']) {
  if (!Array.isArray(residueIds)||residueIds.length===0) throw new TypeError('Start with at least one amino-acid residue.');
  residueIds.forEach(assertResidueId);
  return freezeState({
    chains: [residueIds],
    waterReleased: Math.max(0,residueIds.length-1),
    waterConsumed: 0,
    history: [],
  });
}

export function extendPeptide({state,chainIndex=0,residueId,end='c',maxResidues=8}) {
  validatePeptideState(state);
  const limit = integerAtLeast(maxResidues,1,'Residue limit');
  const chainPosition = Number(chainIndex);
  if (!Number.isInteger(chainPosition)||chainPosition<0||chainPosition>=state.chains.length) return blockedOutcome(state,'Choose an existing peptide fragment before attaching a residue.','missing-chain');
  const residue = aminoAcidById(residueId);
  if (!residue) return blockedOutcome(state,`The residue id “${residueId}” is not in the declared 20-amino-acid library.`,'unknown-residue');
  if (end!=='n'&&end!=='c') return blockedOutcome(state,'A residue can be attached only at the declared N or C terminus.','unknown-terminus');
  const residueCount = stateResidueCount(state);
  if (residueCount>=limit) return blockedOutcome(state,`This teaching canvas is limited to ${limit} residues so every ionizable site remains visible. Hydrolyse or reset before adding another residue.`,'residue-limit');

  const chains = state.chains.map((chain,index)=>index===chainPosition
    ? end==='n' ? [residue.id,...chain] : [...chain,residue.id]
    : [...chain]);
  const terminusLabel = end==='n'?'N terminus':'C terminus';
  const nextState = freezeState({
    chains,
    waterReleased: state.waterReleased+1,
    waterConsumed: state.waterConsumed,
    history: [...state.history,{type:'condensation',residueId:residue.id,chainIndex:chainPosition,end,waterDelta:-1}],
  });
  return successfulOutcome(nextState,`${residue.threeLetter} attached at the ${terminusLabel}. One peptide bond formed and one H₂O was released.`,'residue-attached');
}

export function hydrolyzePeptideBond({state,chainIndex=0,bondIndex=0}) {
  validatePeptideState(state);
  const chainPosition = Number(chainIndex);
  const bondPosition = Number(bondIndex);
  if (!Number.isInteger(chainPosition)||chainPosition<0||chainPosition>=state.chains.length) return blockedOutcome(state,'Choose an existing peptide fragment before hydrolysis.','missing-chain');
  const chain = state.chains[chainPosition];
  if (!Number.isInteger(bondPosition)||bondPosition<0||bondPosition>=chain.length-1) return blockedOutcome(state,'Choose a peptide bond between two neighbouring residues. No bond was changed.','missing-bond');
  const left = chain.slice(0,bondPosition+1);
  const right = chain.slice(bondPosition+1);
  const chains = state.chains.flatMap((fragment,index)=>index===chainPosition?[left,right]:[[...fragment]]);
  const nextState = freezeState({
    chains,
    waterReleased: state.waterReleased,
    waterConsumed: state.waterConsumed+1,
    history: [...state.history,{type:'hydrolysis',chainIndex:chainPosition,bondIndex:bondPosition,waterDelta:1}],
  });
  const leftResidue = assertResidueId(chain[bondPosition]);
  const rightResidue = assertResidueId(chain[bondPosition+1]);
  return successfulOutcome(nextState,`The ${leftResidue.threeLetter}—${rightResidue.threeLetter} peptide bond was hydrolysed. One H₂O was consumed and the chain split into two fragments.`,'bond-hydrolysed');
}

export function analyzePeptideState(state) {
  validatePeptideState(state);
  const counts = {};
  for (const chain of state.chains) {
    for (const residueId of chain) mergeFormula(counts,assertResidueId(residueId).formula);
  }
  const residueCount = stateResidueCount(state);
  const peptideBondCount = residueCount-state.chains.length;
  mergeFormula(counts,'H2O',-peptideBondCount);
  return Object.freeze({
    residueCount,
    fragmentCount: state.chains.length,
    peptideBondCount,
    formulaCounts: Object.freeze({...counts}),
    formula: formulaToString(counts),
    averageMolarMass: averageMolarMass(counts),
    waterReleased: state.waterReleased,
    waterConsumed: state.waterConsumed,
    netWaterReleased: state.waterReleased-state.waterConsumed,
  });
}

function normalizeChains(sequence,chains) {
  const source = chains??(Array.isArray(sequence)&&Array.isArray(sequence[0])?sequence:[sequence]);
  if (!Array.isArray(source)||source.length===0) throw new TypeError('Ionization analysis needs at least one peptide chain.');
  return source.map((chain)=>{
    if (!Array.isArray(chain)||chain.length===0) throw new TypeError('Ionization analysis cannot use an empty peptide fragment.');
    chain.forEach(assertResidueId);
    return chain;
  });
}

function normalizedPkaModel(pKaModel={}) {
  const model = {...DEFAULT_PKA_MODEL,...pKaModel};
  for (const key of Object.keys(DEFAULT_PKA_MODEL)) model[key]=finiteNumber(model[key],`${key} pKa`);
  return model;
}

function acidicFraction(pH,pKa) {
  return 1/(1+10**(pKa-pH));
}

function basicFraction(pH,pKa) {
  return 1/(1+10**(pH-pKa));
}

function ionizationSite({id,label,kind,pKa,pH,chainIndex,residueIndex=null,residueId=null}) {
  const fraction = kind==='acidic'?acidicFraction(pH,pKa):basicFraction(pH,pKa);
  const charge = kind==='acidic'?-fraction:fraction;
  return Object.freeze({id,label,kind,pKa,fraction,charge,chainIndex,residueIndex,residueId});
}

export function analyzePeptideIonization({sequence,chains,pH=7,pKaModel=DEFAULT_PKA_MODEL}) {
  const normalizedChains = normalizeChains(sequence,chains);
  const model = normalizedPkaModel(pKaModel);
  const acidity = finiteNumber(pH,'pH');
  const sites = [];
  normalizedChains.forEach((chain,chainIndex)=>{
    sites.push(ionizationSite({id:`n-${chainIndex}`,label:`Fragment ${chainIndex+1} N terminus`,kind:'basic',pKa:model.nTerminus,pH:acidity,chainIndex,residueIndex:0,residueId:chain[0]}));
    chain.forEach((residueId,residueIndex)=>{
      const residue = assertResidueId(residueId);
      if (!residue.ionizable) return;
      sites.push(ionizationSite({
        id:`side-${chainIndex}-${residueIndex}`,
        label:`${residue.threeLetter} ${residueIndex+1} ${residue.ionizable.label}`,
        kind:residue.ionizable.kind,
        pKa:model[residue.ionizable.pKaKey],
        pH:acidity,
        chainIndex,
        residueIndex,
        residueId,
      }));
    });
    sites.push(ionizationSite({id:`c-${chainIndex}`,label:`Fragment ${chainIndex+1} C terminus`,kind:'acidic',pKa:model.cTerminus,pH:acidity,chainIndex,residueIndex:chain.length-1,residueId:chain.at(-1)}));
  });
  const positiveCharge = sites.filter((site)=>site.charge>0).reduce((sum,site)=>sum+site.charge,0);
  const negativeCharge = sites.filter((site)=>site.charge<0).reduce((sum,site)=>sum+site.charge,0);
  return Object.freeze({
    pH: acidity,
    pKaModel: Object.freeze({...model}),
    sites: Object.freeze(sites),
    positiveCharge,
    negativeCharge,
    netCharge: positiveCharge+negativeCharge,
    method: 'Independent-site Henderson-Hasselbalch fractions using learner-visible pKa values.',
  });
}

export function solveIsoelectricPH({sequence,chains,pKaModel=DEFAULT_PKA_MODEL}) {
  const normalizedChains = normalizeChains(sequence,chains);
  const model = normalizedPkaModel(pKaModel);
  let lower = 0;
  let upper = 14;
  const chargeAt = (pH)=>analyzePeptideIonization({chains:normalizedChains,pH,pKaModel:model}).netCharge;
  const lowerCharge = chargeAt(lower);
  const upperCharge = chargeAt(upper);
  if (lowerCharge<0||upperCharge>0) return Math.abs(lowerCharge)<=Math.abs(upperCharge)?lower:upper;
  for (let iteration=0;iteration<80;iteration+=1) {
    const midpoint=(lower+upper)/2;
    if (chargeAt(midpoint)>0) lower=midpoint;
    else upper=midpoint;
  }
  return (lower+upper)/2;
}

export function createChargeTrace({sequence,chains,pKaModel=DEFAULT_PKA_MODEL,pointCount=71}) {
  const normalizedChains = normalizeChains(sequence,chains);
  const points = integerAtLeast(pointCount,3,'Point count');
  const model = normalizedPkaModel(pKaModel);
  return Object.freeze(Array.from({length:points},(_,index)=>{
    const pH=14*index/(points-1);
    return Object.freeze({pH,netCharge:analyzePeptideIonization({chains:normalizedChains,pH,pKaModel:model}).netCharge});
  }));
}

export function ionizablePkaKeys(chains) {
  const normalizedChains = normalizeChains(undefined,chains);
  const keys = new Set(['nTerminus','cTerminus']);
  for (const chain of normalizedChains) for (const residueId of chain) {
    const residue=assertResidueId(residueId);
    if (residue.ionizable) keys.add(residue.ionizable.pKaKey);
  }
  return Object.freeze([...keys]);
}

export const PEPTIDE_MODEL_BOUNDARY = Object.freeze({
  includes: Object.freeze(['20 declared amino-acid identities','Peptide condensation and hydrolysis bookkeeping','Neutral formula and average molar mass','Independent-site fractional charge','Approximate pH(I) from editable pKa values']),
  excludes: Object.freeze(['Sequence-dependent microscopic pKa prediction','Conformation and folding','Disulfide formation','Post-translational modification','Solvation and ionic-strength corrections','Function or biological activity']),
  aminoAcidCount: AMINO_ACIDS.length,
});
