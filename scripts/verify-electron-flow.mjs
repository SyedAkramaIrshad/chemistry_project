import assert from 'node:assert/strict';
import {MECHANISM_SCENARIOS} from '../src/data/mechanismScenarios.js';
import {ELECTRON_FLOW_CONSTANTS,commitElectronFlow,evaluateElectronArrow,getMechanismScenario,nextElectronFlowHint} from '../src/chemistry/electronFlow.js';

assert.equal(MECHANISM_SCENARIOS.length,4);
assert.equal(ELECTRON_FLOW_CONSTANTS.electronPerArrow,2);

for(const scenario of MECHANISM_SCENARIOS){
  assert.equal(getMechanismScenario(scenario.id),scenario);
  assert.equal(scenario.arrowCount,scenario.expectedArrows.length);
  assert.ok(scenario.product?.notation);
  assert.ok(scenario.ledger.length>=scenario.expectedArrows.length);
  const sourceIds=new Set(scenario.sources.map((source)=>source.id));
  const targetIds=new Set(scenario.targets.map((target)=>target.id));
  assert.equal(sourceIds.size,scenario.sources.length);
  assert.equal(targetIds.size,scenario.targets.length);
  for(const expected of scenario.expectedArrows){
    assert.ok(sourceIds.has(expected.sourceId));
    assert.ok(targetIds.has(expected.targetId));
    const evaluation=evaluateElectronArrow(scenario.id,expected.sourceId,expected.targetId,[]);
    assert.equal(evaluation.allowed,true);
    assert.equal(evaluation.arrow.electrons,2);
    assert.equal(evaluation.queue.length,1);
  }
  for(const [pair,reason] of Object.entries(scenario.distractorReasons)){
    const [sourceId,targetId]=pair.split('->'),original=[];
    const evaluation=evaluateElectronArrow(scenario.id,sourceId,targetId,original);
    assert.equal(evaluation.allowed,false);
    assert.ok(evaluation.reason.length>20);
    assert.equal(evaluation.reason,reason);
    assert.deepEqual(original,[]);
    assert.deepEqual(evaluation.queue,[]);
  }
  const first=scenario.expectedArrows[0];
  const firstResult=evaluateElectronArrow(scenario.id,first.sourceId,first.targetId,[]);
  const duplicate=evaluateElectronArrow(scenario.id,first.sourceId,first.targetId,firstResult.queue);
  assert.equal(duplicate.allowed,false);
  assert.match(duplicate.reason,/cannot be spent twice/);
  assert.deepEqual(duplicate.queue,firstResult.queue);
  const incomplete=commitElectronFlow(scenario.id,firstResult.queue);
  assert.equal(incomplete.committed,false);
  assert.equal(incomplete.status,'incomplete');
  assert.ok(incomplete.missing.length===scenario.arrowCount-1);
  assert.equal(incomplete.product,undefined);
  const forward=scenario.expectedArrows.map((arrow)=>({sourceId:arrow.sourceId,targetId:arrow.targetId,arrowId:arrow.id}));
  const reverse=[...forward].reverse();
  for(const queue of [forward,reverse]){
    const committed=commitElectronFlow(scenario.id,queue);
    assert.equal(committed.committed,true);
    assert.equal(committed.totalArrows,scenario.arrowCount);
    assert.equal(committed.electronPairsMoved,scenario.arrowCount);
    assert.equal(committed.electronsMoved,scenario.arrowCount*2);
    assert.equal(committed.product.notation,scenario.product.notation);
    assert.deepEqual(committed.ledger,scenario.ledger);
  }
  const hint1=nextElectronFlowHint(scenario.id,[],1),hint2=nextElectronFlowHint(scenario.id,[],2),hint3=nextElectronFlowHint(scenario.id,[],3);
  assert.match(hint1.text,/starts at/);assert.match(hint2.text,/Start/);assert.match(hint3.text,/Draw from/);
}

assert.equal(getMechanismScenario('sn2-substitution').arrowCount,2);
assert.equal(getMechanismScenario('carbonyl-addition').arrowCount,2);
assert.equal(getMechanismScenario('proton-transfer').arrowCount,2);
assert.equal(getMechanismScenario('e2-elimination').arrowCount,3);
assert.throws(()=>getMechanismScenario('universal-reaction'),/Unknown mechanism scenario/);

console.log('4 mechanism templates resolved with immutable source, sink, product, and ledger references.');
for(const scenario of MECHANISM_SCENARIOS)console.log(`${scenario.shortName}: ${scenario.arrowCount} arrows, ${scenario.arrowCount*2} electrons, ${scenario.ledger.length} declared consequences`);
console.log('allowed arrows, distractor reasons, queue immutability, source uniqueness, incomplete commits, order-independent success, hints, and electron counts verified.');
