import assert from 'node:assert/strict';
import { ChemistryEngine as engine, ChemistryLibrary as baseLibrary } from '../src/chemistry/runtime.js';
import { DISCOVERY_GOALS, analyzeDiscovery, createDiscoveryLibrary } from '../src/chemistry/playgroundDiscovery.js';
const library=createDiscoveryLibrary(baseLibrary);
const analyze=(graph,goal)=>analyzeDiscovery(graph,{engine,library,targetId:goal.id});
const edgeKey=bond=>[bond.a,bond.b].sort((a,b)=>a-b).join(':');
let partialCases=0,randomCases=0,chargeCases=0,seed=1337;
for(const goal of DISCOVERY_GOALS){
  const ref=library.MOLECULES[goal.key];
  for(let mask=0;mask<2**ref.atoms.length;mask++){
    const atoms=ref.atoms.filter((a,i)=>mask&(1<<i)).map(a=>({...a}));
    const ids=new Set(atoms.map(a=>a.id)),available=ref.bonds.filter(b=>ids.has(b.a)&&ids.has(b.b));
    for(let maskB=0;maskB<2**available.length;maskB++){
      const bonds=available.filter((b,i)=>maskB&(1<<i)).map(b=>({...b}));
      const result=analyze({atoms,bonds},goal),detail=JSON.stringify({goal:goal.id,atoms,bonds,action:result.nextAction});partialCases++;
      assert.ok(!['rewire','repair','remove','charge'].includes(result.nextAction.kind),detail);
      if(result.nextAction.kind==='connect')assert.equal(engine.canApplyBond(atoms,bonds,...result.nextAction.atomIds,'single').ok,true,detail);
    }
  }
}
const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32;};
const choose=values=>values[Math.floor(random()*values.length)];
for(const goal of DISCOVERY_GOALS){
  const ref=library.MOLECULES[goal.key];
  for(let sample=0;sample<2000;sample++){
    const atoms=structuredClone(ref.atoms).filter(()=>random()>.2),bonds=[];
    for(let edit=0;edit<30;edit++){
      const a=choose(atoms),b=choose(atoms);if(!a||!b||a===b)continue;
      const type=choose(['single','single','double','triple']);
      if(!engine.canApplyBond(atoms,bonds,a.id,b.id,type).ok)continue;
      const index=bonds.findIndex(x=>x.a===a.id&&x.b===b.id||x.a===b.id&&x.b===a.id);
      if(index!==-1)bonds.splice(index,1);bonds.push({a:a.id,b:b.id,type,order:engine.BOND_TYPES[type].order});
    }
    const graph={atoms,bonds},result=analyze(graph,goal),action=result.nextAction;
    const detail=JSON.stringify({goal:goal.id,graph,action});randomCases++;
    if(action.kind==='connect')assert.equal(engine.canApplyBond(atoms,bonds,...action.atomIds,'single').ok,true,detail);
    if(result.complete)assert.equal(engine.areGraphsIsomorphic(graph,ref),true,detail);
    if(action.kind==='rewire'&&action.bondKeys.length&&action.message.startsWith('Change')){
      const bond=bonds.find(b=>action.bondKeys.includes(edgeKey(b)));assert.ok(bond,detail);
      assert.equal(engine.canApplyBond(atoms,bonds,bond.a,bond.b,'single').ok,true,detail);
    }
  }
  for(const atom of ref.atoms){
    for(const charge of [-2,-1,1,2,9]){
      const before=JSON.stringify(ref),result=engine.canSetAtomCharge(ref.atoms,ref.bonds,atom.id,charge);chargeCases++;
      assert.equal(JSON.stringify(ref),before);const candidate=structuredClone(ref);candidate.atoms.find(a=>a.id===atom.id).charge=charge;
      assert.equal(analyze(candidate,goal).complete,false);
      if(result.ok)assert.ok(!['invalid','unsupported'].includes(result.atomState.state));
    }
    const atoms=[...structuredClone(ref.atoms),{id:10000+atom.id,symbol:'H',charge:0,x:0,y:0}],bonds=structuredClone(ref.bonds);
    const before=JSON.stringify({atoms,bonds});chargeCases++;
    assert.equal(engine.canApplyBond(atoms,bonds,atom.id,10000+atom.id,'single').ok,false);
    assert.equal(JSON.stringify({atoms,bonds}),before);
  }
}
for(const key of library.VISIBLE_PRESETS){const r=analyzeDiscovery(library.MOLECULES[key],{engine,library,targetId:null});assert.ok(r.recognition?.key,key);assert.equal(r.validationStatus,'valid',key);}
console.log(JSON.stringify({partialCases,randomCases,chargeCases,total:partialCases+randomCases+chargeCases,visiblePresets:library.VISIBLE_PRESETS.length,initialSeed:1337}));
