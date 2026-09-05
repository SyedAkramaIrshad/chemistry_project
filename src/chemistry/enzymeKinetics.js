const INHIBITION_MODES = new Set(['none','competitive','uncompetitive','mixed']);
const PROGRESS_POINT_COUNT = 121;
const CURVE_POINT_COUNT = 161;

const MODEL_ASSUMPTIONS = [
  'A single variable substrate follows the displayed Michaelis-Menten initial-rate equation.',
  'Substrate is initially in large excess over active enzyme and a quasi-steady state is assumed.',
  'Active enzyme concentration, kcat, KM, inhibitor concentration, Kic, and Kiu remain constant.',
  'The inhibition model is reversible, linear, and operational; inhibition constants are not asserted to be dissociation constants.',
  'Progress traces neglect reverse reaction, product inhibition, enzyme inactivation, and changing solution conditions.',
];

function finiteNumber(value,label){const number=Number(value);if(!Number.isFinite(number))throw new TypeError(`${label} must be a finite number.`);return number;}
function positiveNumber(value,label,maximum=Infinity){const number=finiteNumber(value,label);if(number<=0||number>maximum)throw new RangeError(`${label} must be greater than zero${Number.isFinite(maximum)?` and no more than ${maximum}`:''}.`);return number;}
function nonnegativeNumber(value,label,maximum=Infinity){const number=finiteNumber(value,label);if(number<0||number>maximum)throw new RangeError(`${label} cannot be negative${Number.isFinite(maximum)?` or greater than ${maximum}`:''}.`);return number;}

function normalizeParams(params){
  if(!params||typeof params!=='object')throw new TypeError('Enzyme-kinetics parameters are required.');
  const inhibitionMode=String(params.inhibitionMode||'');
  if(!INHIBITION_MODES.has(inhibitionMode))throw new RangeError(`Inhibition mode must be one of: ${[...INHIBITION_MODES].join(', ')}.`);
  return {
    kcatPerS:positiveNumber(params.kcatPerS,'Catalytic constant',100000),
    enzymeNanoM:positiveNumber(params.enzymeNanoM,'Active enzyme concentration',100000),
    kmMicroM:positiveNumber(params.kmMicroM,'Michaelis constant',100000),
    substrateMicroM:nonnegativeNumber(params.substrateMicroM,'Substrate concentration',1000000),
    inhibitorMicroM:nonnegativeNumber(params.inhibitorMicroM,'Inhibitor concentration',1000000),
    kicMicroM:positiveNumber(params.kicMicroM,'Competitive inhibition constant',1000000),
    kiuMicroM:positiveNumber(params.kiuMicroM,'Uncompetitive inhibition constant',1000000),
    inhibitionMode,
  };
}

function inhibitionFactors(params,mode=params.inhibitionMode){
  const competitiveActive=mode==='competitive'||mode==='mixed';
  const uncompetitiveActive=mode==='uncompetitive'||mode==='mixed';
  return {
    alphaCompetitive:competitiveActive?1+params.inhibitorMicroM/params.kicMicroM:1,
    alphaUncompetitive:uncompetitiveActive?1+params.inhibitorMicroM/params.kiuMicroM:1,
    competitiveActive,
    uncompetitiveActive,
  };
}

function inhibitionLabel(params,factors){
  if(params.inhibitionMode==='none'||params.inhibitorMicroM===0)return 'No inhibitor effect applied';
  if(params.inhibitionMode==='competitive')return 'Competitive component only';
  if(params.inhibitionMode==='uncompetitive')return 'Uncompetitive component only';
  const equal=Math.abs(params.kicMicroM-params.kiuMicroM)<=1e-10*Math.max(params.kicMicroM,params.kiuMicroM,1);
  if(equal)return 'Pure non-competitive special case of mixed inhibition';
  return params.kicMicroM<params.kiuMicroM?'Mixed inhibition · predominantly competitive':'Mixed inhibition · predominantly uncompetitive';
}

function kineticState(params,mode=params.inhibitionMode){
  const factors=inhibitionFactors(params,mode);
  const enzymeMicroM=params.enzymeNanoM/1000;
  const limitingRateMicroMPerS=params.kcatPerS*enzymeMicroM;
  const apparentLimitingRateMicroMPerS=limitingRateMicroMPerS/factors.alphaUncompetitive;
  const apparentKmMicroM=params.kmMicroM*factors.alphaCompetitive/factors.alphaUncompetitive;
  const apparentKcatPerS=params.kcatPerS/factors.alphaUncompetitive;
  const catalyticEfficiencyMInvS=params.kcatPerS/(params.kmMicroM*1e-6);
  const effectiveLowSubstrateEfficiencyMInvS=params.kcatPerS/(factors.alphaCompetitive*params.kmMicroM*1e-6);
  return {
    ...factors,
    enzymeMicroM,
    limitingRateMicroMPerS,
    apparentLimitingRateMicroMPerS,
    apparentKmMicroM,
    apparentKcatPerS,
    catalyticEfficiencyMInvS,
    effectiveLowSubstrateEfficiencyMInvS,
  };
}

export function rateAtSubstrate(substrateMicroM,state){
  const substrate=nonnegativeNumber(substrateMicroM,'Substrate concentration');
  if(!state||typeof state!=='object')throw new TypeError('A kinetic state is required.');
  const limitingRate=positiveNumber(state.apparentLimitingRateMicroMPerS,'Apparent limiting rate');
  const apparentKm=positiveNumber(state.apparentKmMicroM,'Apparent Michaelis constant');
  return limitingRate*substrate/(apparentKm+substrate);
}

function substrateAtTime(initialSubstrateMicroM,limitingRateMicroMPerS,apparentKmMicroM,timeS,minimumFraction=.05){
  if(initialSubstrateMicroM===0)return 0;
  if(timeS<=0)return initialSubstrateMicroM;
  const target=Math.max(initialSubstrateMicroM*minimumFraction,Number.EPSILON);
  const timeFor=(substrate)=>(initialSubstrateMicroM-substrate+apparentKmMicroM*Math.log(initialSubstrateMicroM/substrate))/limitingRateMicroMPerS;
  if(timeS>=timeFor(target))return target;
  let low=target,high=initialSubstrateMicroM;
  for(let iteration=0;iteration<90;iteration+=1){
    const middle=(low+high)/2;
    if(timeFor(middle)>timeS)low=middle;else high=middle;
  }
  return (low+high)/2;
}

export function progressTrace(initialSubstrateMicroM,limitingRateMicroMPerS,apparentKmMicroM,sampleCount=PROGRESS_POINT_COUNT){
  const initial=nonnegativeNumber(initialSubstrateMicroM,'Initial substrate concentration');
  const limitingRate=positiveNumber(limitingRateMicroMPerS,'Apparent limiting rate');
  const apparentKm=positiveNumber(apparentKmMicroM,'Apparent Michaelis constant');
  const count=Math.max(25,Math.round(positiveNumber(sampleCount,'Progress sample count',1001)));
  if(initial===0)return Array.from({length:count},(_,index)=>({timeS:index/(count-1),substrateMicroM:0,productMicroM:0,substrateFraction:0,productFraction:0}));
  const target=initial*.05;
  const maximumTimeS=(initial-target+apparentKm*Math.log(initial/target))/limitingRate;
  return Array.from({length:count},(_,index)=>{
    const timeS=maximumTimeS*index/(count-1);
    const substrateMicroM=substrateAtTime(initial,limitingRate,apparentKm,timeS);
    const productMicroM=initial-substrateMicroM;
    return {timeS,substrateMicroM,productMicroM,substrateFraction:substrateMicroM/initial,productFraction:productMicroM/initial};
  });
}

function denominatorWeights(params,state){
  const substrate=params.substrateMicroM;
  const denominator=state.alphaCompetitive*params.kmMicroM+state.alphaUncompetitive*substrate;
  return {
    freeTerm:params.kmMicroM/denominator,
    competitiveTerm:(state.alphaCompetitive-1)*params.kmMicroM/denominator,
    productiveTerm:substrate/denominator,
    uncompetitiveTerm:(state.alphaUncompetitive-1)*substrate/denominator,
    denominator,
    statement:'Normalized terms in the displayed rate denominator — not measured enzyme occupancies.',
  };
}

function curveFor(params,state,maximumSubstrateMicroM){
  return Array.from({length:CURVE_POINT_COUNT},(_,index)=>{
    const substrateMicroM=maximumSubstrateMicroM*index/(CURVE_POINT_COUNT-1);
    return {substrateMicroM,rateMicroMPerS:rateAtSubstrate(substrateMicroM,state)};
  });
}

export function analyzeEnzymeKinetics(params){
  const normalized=normalizeParams(params);
  const selectedState=kineticState(normalized);
  const uninhibitedState=kineticState(normalized,'none');
  const currentRateMicroMPerS=rateAtSubstrate(normalized.substrateMicroM,selectedState);
  const uninhibitedRateMicroMPerS=rateAtSubstrate(normalized.substrateMicroM,uninhibitedState);
  const degreeOfInhibition=uninhibitedRateMicroMPerS>0?1-currentRateMicroMPerS/uninhibitedRateMicroMPerS:0;
  const maximumSubstrateMicroM=Math.max(normalized.kmMicroM*8,selectedState.apparentKmMicroM*5,normalized.substrateMicroM*1.35,10);
  const selectedProgress=progressTrace(normalized.substrateMicroM,selectedState.apparentLimitingRateMicroMPerS,selectedState.apparentKmMicroM);
  const maximumTimeS=selectedProgress.at(-1).timeS;
  const uninhibitedProgress=selectedProgress.map((point)=>{
    const substrateMicroM=substrateAtTime(normalized.substrateMicroM,uninhibitedState.apparentLimitingRateMicroMPerS,uninhibitedState.apparentKmMicroM,point.timeS);
    const productMicroM=normalized.substrateMicroM-substrateMicroM;
    return {timeS:point.timeS,substrateMicroM,productMicroM,substrateFraction:normalized.substrateMicroM?substrateMicroM/normalized.substrateMicroM:0,productFraction:normalized.substrateMicroM?productMicroM/normalized.substrateMicroM:0};
  });
  const substrateToEnzymeRatio=normalized.substrateMicroM/(selectedState.enzymeMicroM||1);
  const assumptionWarnings=[];
  if(normalized.substrateMicroM>0&&substrateToEnzymeRatio<10)assumptionWarnings.push(`Initial substrate is only ${substrateToEnzymeRatio.toFixed(1)} times the active-enzyme concentration. The usual substrate-in-large-excess assumption is weak.`);

  return {
    status:'valid',
    resultKind:'Computed one-substrate enzyme-kinetics model — not measured enzyme data',
    params:normalized,
    selected:{
      ...selectedState,
      currentRateMicroMPerS,
      rateFractionOfOwnLimit:currentRateMicroMPerS/selectedState.apparentLimitingRateMicroMPerS,
      degreeOfInhibition,
      label:inhibitionLabel(normalized,selectedState),
    },
    uninhibited:{...uninhibitedState,currentRateMicroMPerS:uninhibitedRateMicroMPerS},
    curves:{
      maximumSubstrateMicroM,
      selected:curveFor(normalized,selectedState,maximumSubstrateMicroM),
      uninhibited:curveFor(normalized,uninhibitedState,maximumSubstrateMicroM),
    },
    progress:{maximumTimeS,selected:selectedProgress,uninhibited:uninhibitedProgress},
    weights:denominatorWeights(normalized,selectedState),
    apparentFingerprint:{
      limitingRateRatio:selectedState.apparentLimitingRateMicroMPerS/uninhibitedState.limitingRateMicroMPerS,
      kmRatio:selectedState.apparentKmMicroM/normalized.kmMicroM,
      competitiveComponent:selectedState.competitiveActive&&normalized.inhibitorMicroM>0,
      uncompetitiveComponent:selectedState.uncompetitiveActive&&normalized.inhibitorMicroM>0,
    },
    assumptionWarnings,
    equations:{
      rate:'v = V[S] / (alpha_c K_M + alpha_u [S])',
      factors:'alpha_c = 1 + [I]/K_ic;  alpha_u = 1 + [I]/K_iu',
      limit:'V = k_cat [E]_T',
      progress:'t = ([S]0 - [S] + K_M,app ln([S]0/[S])) / V_app',
    },
    assumptions:MODEL_ASSUMPTIONS,
  };
}

export const ENZYME_KINETICS_CONSTANTS={
  modes:[...INHIBITION_MODES],
  progressPointCount:PROGRESS_POINT_COUNT,
  curvePointCount:CURVE_POINT_COUNT,
  assumptions:MODEL_ASSUMPTIONS,
};
