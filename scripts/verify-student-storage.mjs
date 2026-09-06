import { viewFromHash, VIEW_IDS } from '../src/viewRouting.js';
import assert from 'node:assert/strict';
import { ChemistryEngine as engine, ChemistryLibrary as library } from '../src/chemistry/runtime.js';
import { readGraph, readSnapshot, readSavedStructures, readDraft, serializeDraft, MAX_ATOMS } from '../src/chemistry/playgroundStorage.js';

const water = structuredClone(library.MOLECULES.H2O);
const graph = readGraph(water, engine);
assert.ok(graph);
for (const key of library.VISIBLE_PRESETS) assert.ok(readGraph(library.MOLECULES[key],engine),key);
const saved = { id: 1, name: 'Water', formula: 'H2O', graph, source: 'manual' };
for (const text of ['null','{}','[null]','"text"','{','{"length":1}',JSON.stringify([saved,{graph:null}])]) {
  const result=readSavedStructures(text,engine);
  assert.ok(Array.isArray(result));
  assert.equal(result.length,text.includes('Water')?1:0);
}
const malformed = [
  {...graph,bonds:undefined}, {...graph,atoms:[...graph.atoms,graph.atoms[0]]},
  {...graph,atoms:graph.atoms.map((a,i)=>i? a:{...a,x:NaN})},
  {...graph,atoms:graph.atoms.map((a,i)=>i? a:{...a,symbol:'__proto__'})},
  {...graph,atoms:graph.atoms.map((a,i)=>i? a:{...a,symbol:['O']})},
  {...graph,atoms:graph.atoms.map((a,i)=>i? a:{...a,symbol:{toString:null}})},
  {...graph,bonds:[{a:1,b:999,type:'single',order:1}]},
  {...graph,bonds:[{a:1,b:1,type:'single',order:1}]},
  {...graph,bonds:[...graph.bonds,graph.bonds[0]]},
  {...graph,bonds:graph.bonds.map(b=>({...b,type:'triple',order:1}))},
  {atoms:Array.from({length:MAX_ATOMS+1},(_,i)=>({id:i+1,symbol:'H',x:0,y:0})),bonds:[]},
];
for (const value of malformed) {
  const before=JSON.stringify(value);assert.equal(readGraph(value,engine),null);assert.equal(JSON.stringify(value),before);
}
// The storage layer must not silently repair an incomplete or wrong chemical graph.
const open={...graph,bonds:graph.bonds.slice(0,1)};
assert.deepEqual(readGraph(open,engine),open);
const invalid={...graph,atoms:graph.atoms.map(a=>({...a,charge:9}))};
assert.deepEqual(readGraph(invalid,engine),invalid);
const current={...open,selectedAtomId:open.atoms[0].id,nextId:20,discoverySource:'manual'};
const before=JSON.stringify(current);
const draft=readDraft(JSON.stringify({version:1,current,history:[JSON.stringify(current),'bad'],coach:{targetId:'water'},attach:true,bondType:'single'}),engine);
assert.equal(draft.current.selectedAtomId,current.selectedAtomId);
assert.equal(draft.history.length,1);assert.equal(draft.coach.targetId,'water');
assert.equal(JSON.stringify(current),before);
assert.equal(readDraft(JSON.stringify({version:2,current}),engine),null);
assert.equal(readDraft(JSON.stringify({version:1,current:malformed[0]}),engine),null);
assert.equal(readSnapshot({...current,selectedAtomId:999},engine).selectedAtomId,null);
assert.equal(readSnapshot({...current,nextId:Number.MAX_SAFE_INTEGER},engine).nextId,Math.max(...current.atoms.map(a=>a.id))+1);
const large={atoms:Array.from({length:160},(_,i)=>({id:i+1,symbol:'C',charge:0,x:i+.123456789012345,y:i+.987654321012345})),bonds:[]};
for(let i=1;i<=160;i++)for(const offset of [1,2])large.bonds.push({a:i,b:(i-1+offset)%160+1,type:'single',order:1});
const largeDraft=serializeDraft({version:1,current:large,history:Array(70).fill(JSON.stringify(large))});
assert.ok(largeDraft.length<=2_000_000);assert.ok(readDraft(largeDraft,engine));
assert.equal(readSavedStructures(JSON.stringify([{...saved,source:'reference'}]),engine)[0].source,'reference');
console.log('Student storage passed: all visible presets, malformed data, bounded input, open graphs, selection/history recovery, and provenance.');

for (const id of VIEW_IDS) assert.equal(viewFromHash(`#${id}`), id);
for (const hash of ["", "#%", "#unknown"]) assert.equal(viewFromHash(hash), "laboratory");
assert.equal(viewFromHash("#%63urriculum"), "curriculum");
