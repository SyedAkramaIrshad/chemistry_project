import {MECHANISM_SCENARIOS} from '../data/mechanismScenarios.js';

const PAIR_SEPARATOR='->';

function pairKey(sourceId,targetId){return `${sourceId}${PAIR_SEPARATOR}${targetId}`;}
function copyQueue(queuedArrows){
  if(!Array.isArray(queuedArrows))throw new TypeError('Queued arrows must be an array.');
  return queuedArrows.map((arrow,index)=>{
    if(!arrow||typeof arrow!=='object')throw new TypeError(`Queued arrow ${index+1} must be an object.`);
    return {sourceId:String(arrow.sourceId||''),targetId:String(arrow.targetId||''),arrowId:arrow.arrowId?String(arrow.arrowId):undefined};
  });
}

export function getMechanismScenario(scenarioId){
  const scenario=MECHANISM_SCENARIOS.find((candidate)=>candidate.id===scenarioId);
  if(!scenario)throw new RangeError(`Unknown mechanism scenario: ${scenarioId}.`);
  return scenario;
}

function genericBlockedReason(source,target){
  if(source.type==='lonePair'&&target.type==='atom')return `${source.label} is an electron source, but ${target.label} is not the atom that receives that pair in this displayed elementary step.`;
  if(source.type==='sigmaBond'&&target.type==='atom')return `${source.label} can undergo heterolytic movement, but its pair does not end on ${target.label} in this displayed step.`;
  if(source.type==='piBond'&&target.type==='atom')return `${source.label} is a movable electron pair, but ${target.label} is not its destination in this displayed step.`;
  return `${source.label} cannot send its electron pair to ${target.label} in this bounded template.`;
}

export function evaluateElectronArrow(scenarioId,sourceId,targetId,queuedArrows=[]){
  const scenario=getMechanismScenario(scenarioId),queue=copyQueue(queuedArrows);
  const source=scenario.sources.find((candidate)=>candidate.id===sourceId);
  if(!source)return {status:'blocked',allowed:false,reason:`Unknown electron source: ${sourceId}.`,queue};
  const target=scenario.targets.find((candidate)=>candidate.id===targetId);
  if(!target)return {status:'blocked',allowed:false,reason:`Unknown electron destination: ${targetId}.`,queue};
  if(queue.some((arrow)=>arrow.sourceId===sourceId))return {status:'blocked',allowed:false,reason:`${source.label} is already the tail of a queued arrow. One electron pair cannot be spent twice in the same elementary step.`,queue};
  const expected=scenario.expectedArrows.find((arrow)=>arrow.sourceId===sourceId&&arrow.targetId===targetId);
  if(!expected){
    const reason=scenario.distractorReasons[pairKey(sourceId,targetId)]||genericBlockedReason(source,target);
    return {status:'blocked',allowed:false,reason,queue,source,target};
  }
  const queued={sourceId,targetId,arrowId:expected.id};
  return {status:'allowed',allowed:true,reason:expected.explanation,arrow:{...expected,electrons:2,source,target},queue:[...queue,queued]};
}

export function commitElectronFlow(scenarioId,queuedArrows=[]){
  const scenario=getMechanismScenario(scenarioId),queue=copyQueue(queuedArrows);
  const expectedKeys=new Set(scenario.expectedArrows.map((arrow)=>pairKey(arrow.sourceId,arrow.targetId)));
  const queuedKeys=new Set(queue.map((arrow)=>pairKey(arrow.sourceId,arrow.targetId)));
  const unexpected=queue.filter((arrow)=>!expectedKeys.has(pairKey(arrow.sourceId,arrow.targetId)));
  if(unexpected.length)return {status:'blocked',committed:false,reason:'The queue contains an arrow outside this scenario. Remove it before committing.',queue,unexpected};
  const duplicateSources=queue.filter((arrow,index)=>queue.findIndex((candidate)=>candidate.sourceId===arrow.sourceId)!==index);
  if(duplicateSources.length)return {status:'blocked',committed:false,reason:'One electron source appears more than once. Each pair can move only once in this simultaneous step.',queue};
  const missing=scenario.expectedArrows.filter((arrow)=>!queuedKeys.has(pairKey(arrow.sourceId,arrow.targetId)));
  if(missing.length){
    return {status:'incomplete',committed:false,reason:scenario.simultaneousReason,queue,missing:missing.map((arrow)=>({id:arrow.id,role:arrow.role,sourceId:arrow.sourceId,targetId:arrow.targetId}))};
  }
  return {
    status:'success',committed:true,reason:'Every required two-electron arrow is present for this displayed elementary step.',queue,
    product:scenario.product,ledger:scenario.ledger,totalArrows:scenario.expectedArrows.length,electronPairsMoved:scenario.expectedArrows.length,electronsMoved:scenario.expectedArrows.length*2,
    modelBoundary:scenario.boundary,
  };
}

export function nextElectronFlowHint(scenarioId,queuedArrows=[],level=1){
  const scenario=getMechanismScenario(scenarioId),queue=copyQueue(queuedArrows),queuedKeys=new Set(queue.map((arrow)=>pairKey(arrow.sourceId,arrow.targetId)));
  const missing=scenario.expectedArrows.find((arrow)=>!queuedKeys.has(pairKey(arrow.sourceId,arrow.targetId)));
  if(!missing)return {status:'complete',level:0,text:'Every required arrow is already queued. Commit the elementary step when you are ready.'};
  const source=scenario.sources.find((candidate)=>candidate.id===missing.sourceId),target=scenario.targets.find((candidate)=>candidate.id===missing.targetId),normalizedLevel=Math.max(1,Math.min(3,Math.round(Number(level)||1)));
  if(normalizedLevel===1)return {status:'hint',level:1,text:`One missing arrow starts at a ${source.type==='lonePair'?'lone pair':source.type==='piBond'?'pi-bond pair':'sigma-bond pair'}.`};
  if(normalizedLevel===2)return {status:'hint',level:2,text:`Start the missing arrow at ${source.label}.`};
  return {status:'hint',level:3,text:`Draw from ${source.label} to ${target.label}. ${missing.explanation}`};
}

export const ELECTRON_FLOW_CONSTANTS={electronPerArrow:2,pairSeparator:PAIR_SEPARATOR,scenarioCount:MECHANISM_SCENARIOS.length};
