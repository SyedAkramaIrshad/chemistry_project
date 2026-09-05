import {useMemo, useRef, useState} from 'react';
import {
  GAS_LAW_EXPERIMENTS,
  GAS_PARTICLE_POINTS,
  GAS_PRESETS,
  WATER_PHASE_MODEL,
} from '../data/gasPhaseScenarios.js';
import {
  analyzeGasState,
  analyzeWaterPhase,
  createIsothermTrace,
  createWaterSaturationCurve,
  evaluateGasLawPrediction,
  evaluatePhasePrediction,
  nextGasLawHint,
  nextPhaseHint,
  runGasLawExperiment,
} from '../chemistry/gasPhases.js';
import {MODEL_PASSPORTS, SCIENCE_SOURCES} from '../data/scienceSources.js';
import '../styles/gas-phase.css';

const DIRECTIONS = [
  {id:'decrease',label:'Decrease',symbol:'↓'},
  {id:'same',label:'Stay the same',symbol:'→'},
  {id:'increase',label:'Increase',symbol:'↑'},
];

const PHASE_CHOICES = [
  {id:'evaporation',label:'Evaporation',detail:'vapour grows',symbol:'↑'},
  {id:'equilibrium',label:'Equilibrium',detail:'both directions',symbol:'↕'},
  {id:'condensation',label:'Condensation',detail:'liquid grows',symbol:'↓'},
];

const clamp = (value,minimum,maximum) => Math.max(minimum,Math.min(maximum,value));
const format = (value,digits=2) => Number(value).toFixed(digits);
const compact = (value,digits=2) => {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value)>=1000 || (Math.abs(value)>0&&Math.abs(value)<0.01)) return value.toExponential(digits);
  return value.toFixed(digits);
};

function valueSetter(setter,minimum,maximum) {
  return (event) => {
    const value = event.target.valueAsNumber;
    if (Number.isFinite(value)) setter(clamp(value,minimum,maximum));
  };
}

function GasPiston({analysis}) {
  const {input,preset,ideal,real} = analysis;
  const volumeFraction = clamp((Math.log(input.volumeL)-Math.log(.05))/(Math.log(30)-Math.log(.05)),0,1);
  const pistonY = 390-volumeFraction*250;
  const chamberBottom = 480;
  const gasHeight = chamberBottom-pistonY;
  const particleCount = Math.round(10+clamp((input.amountMol-.25)/2.25,0,1)*26);
  const trailLength = 3+clamp((input.temperatureK-100)/600,0,1)*15;
  const idealNeedle = -118+clamp((Math.log10(Math.max(.01,ideal.pressureBar))+2)/5,0,1)*236;
  const realNeedle = real?.pressureBar>0 ? -118+clamp((Math.log10(Math.max(.01,real.pressureBar))+2)/5,0,1)*236 : null;
  const statusLabel = real?.status==='blocked' ? real.reason : real?.status==='nonphysical' ? real.reason : real ? `${preset.formula}: ideal ${compact(ideal.pressureBar)} bar, van der Waals ${compact(real.pressureBar)} bar, Z ${compact(real.compressionFactor,3)}.` : `Ideal reference: ${compact(ideal.pressureBar)} bar and Z equals one.`;
  return (
    <svg className={`gas-piston-svg ${real?.status??'ideal'}`} viewBox="0 0 760 570" role="img" aria-label={`Symbolic cutaway piston. ${input.amountMol.toFixed(2)} moles, ${input.temperatureK.toFixed(1)} kelvin, ${input.volumeL.toFixed(2)} litres. Representative particles, not molecular dynamics. ${statusLabel}`}>
      <title>Linked pressure, volume, temperature, and amount chamber</title>
      <desc>Piston height follows volume, representative dot count follows amount, trail length follows temperature, and two gauge needles compare ideal with raw van der Waals pressure.</desc>
      <defs>
        <linearGradient id="gasChamberGlass" x1="0" x2="1"><stop offset="0" stopColor="#0b2c47"/><stop offset=".5" stopColor="#123e5a"/><stop offset="1" stopColor="#08243e"/></linearGradient>
        <linearGradient id="gasPistonMetal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff1a8"/><stop offset=".4" stopColor="#ffd166"/><stop offset="1" stopColor="#8c6520"/></linearGradient>
        <radialGradient id="gasParticleFill"><stop offset="0" stopColor="#ffffff"/><stop offset=".32" stopColor={preset.accent}/><stop offset="1" stopColor="#16334b"/></radialGradient>
        <filter id="gasGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <clipPath id="gasChamberClip"><rect x="170" y={pistonY+13} width="322" height={Math.max(0,gasHeight-13)} rx="8"/></clipPath>
        <marker id="gasArrowCyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#62e8f5"/></marker>
      </defs>
      <g className="gas-field-grid">
        {Array.from({length:9},(_,index)=><line key={`v${index}`} x1={80+index*70} x2={80+index*70} y1="34" y2="524"/>)}
        {Array.from({length:7},(_,index)=><line key={`h${index}`} x1="58" x2="704" y1={54+index*76} y2={54+index*76}/>)}
      </g>
      <g className="piston-apparatus">
        <path className="piston-frame" d="M143 70h377v435H143z"/>
        <rect className="chamber-glass" x="158" y="82" width="346" height="410" rx="16" fill="url(#gasChamberGlass)"/>
        <g className="chamber-calibration">
          {[0,1,2,3,4,5].map((tick)=><g key={tick}><line x1="505" x2={tick%2?525:535} y1={112+tick*70} y2={112+tick*70}/><text x="542" y={116+tick*70}>{30-tick*6} L</text></g>)}
        </g>
        <g className="piston-head" style={{transform:`translateY(${pistonY-92}px)`}}>
          <rect x="170" y="84" width="322" height="25" rx="8" fill="url(#gasPistonMetal)"/>
          <rect x="302" y="24" width="58" height="64" rx="7" fill="url(#gasPistonMetal)"/>
          <path d="M183 109h296"/>
          <text x="331" y="73" textAnchor="middle">PISTON</text>
        </g>
        <g className="gas-particles" clipPath="url(#gasChamberClip)">
          {GAS_PARTICLE_POINTS.slice(0,particleCount).map(([px,py],index)=>{
            const x=178+px*306,y=pistonY+22+py*Math.max(12,gasHeight-38);
            const angle=(index*47)%360*Math.PI/180;
            return <g key={index} className="gas-particle" style={{'--delay':`${-(index%9)*.17}s`}}><line x1={x} y1={y} x2={x-Math.cos(angle)*trailLength} y2={y-Math.sin(angle)*trailLength}/><circle cx={x} cy={y} r={preset.id==='carbon-dioxide'?5.2:4.4} fill="url(#gasParticleFill)"/><circle cx={x-1.2} cy={y-1.5} r="1"/></g>;
          })}
        </g>
        {real?.status==='blocked'&&<g className="excluded-volume-lock"><rect x="170" y="420" width="322" height="60"/><path d="M193 451h276"/><text x="331" y="446" textAnchor="middle">V ≤ nb · CUBIC BLOCKED</text></g>}
        <g className="load-arrows">
          {[220,330,440].map((x)=><path key={x} d={`M${x} ${Math.max(44,pistonY-55)}v38`} markerEnd="url(#gasArrowCyan)"/>)}
          <text x="331" y={Math.max(36,pistonY-65)} textAnchor="middle">pressure load</text>
        </g>
      </g>
      <g className="pressure-gauge" transform="translate(620 174)">
        <circle r="91"/><path d="M-67 45A80 80 0 1 1 67 45"/>
        {[-120,-80,-40,0,40,80,120].map((angle)=><line key={angle} x1="0" y1="-70" x2="0" y2="-79" transform={`rotate(${angle})`}/>)}
        <line className="ideal-needle" x1="0" y1="9" x2="0" y2="-62" transform={`rotate(${idealNeedle})`}/>
        {realNeedle!==null&&<line className="real-needle" x1="0" y1="9" x2="0" y2="-52" transform={`rotate(${realNeedle})`}/>} 
        <circle r="8"/><text y="42" textAnchor="middle">log pressure / bar</text><text y="61" textAnchor="middle">cyan ideal · violet cubic</text>
      </g>
      <g className="gas-state-plaque" transform="translate(549 309)">
        <rect width="157" height="167" rx="16"/>
        <text className="plaque-kicker" x="15" y="24">STATE INPUT</text>
        <text className="plaque-value" x="15" y="54">{input.volumeL.toFixed(2)} L</text>
        <text x="15" y="76">{input.temperatureK.toFixed(0)} K</text>
        <text x="15" y="98">{input.amountMol.toFixed(2)} mol</text>
        <path d="M15 111h127"/>
        <text className="plaque-formula" x="15" y="137">{preset.formula}</text>
        <text className="plaque-small" x="15" y="155">representative dots</text>
      </g>
      <text className="gas-stage-caption" x="158" y="536">symbolic mechanical cutaway · no trajectory integration</text>
    </svg>
  );
}

function GasLawMiniature({result}) {
  const {baseline,final,experiment} = result;
  const observedBefore=baseline[experiment.observedKey],observedAfter=final[experiment.observedKey];
  const maximum=Math.max(observedBefore,observedAfter);
  return <div className="gas-law-miniature" aria-label={`${experiment.observedLabel} changes from ${compact(observedBefore)} to ${compact(observedAfter)}.`}><div><span>before</span><i style={{width:`${Math.max(7,observedBefore/maximum*100)}%`}}/><b>{compact(observedBefore)}</b></div><div><span>after</span><i style={{width:`${Math.max(7,observedAfter/maximum*100)}%`}}/><b>{compact(observedAfter)}</b></div></div>;
}

function IsothermChart({trace,analysis}) {
  const WIDTH=860,HEIGHT=370,left=70,right=825,top=34,bottom=318;
  const minV=trace.points[0].molarVolumeLmol,maxV=trace.points.at(-1).molarVolumeLmol;
  const validPressures=trace.points.flatMap((point)=>[point.idealPressureBar,point.realPressureBar].filter((value)=>value&&value>0));
  const currentPressures=[analysis.ideal.pressureBar,analysis.real?.pressureBar].filter((value)=>value&&value>0);
  const minP=.01,maxP=Math.min(2500,Math.max(100,...validPressures,...currentPressures)*1.06);
  const x=(value)=>left+(Math.log(value)-Math.log(minV))/(Math.log(maxV)-Math.log(minV))*(right-left);
  const y=(value)=>top+(Math.log(maxP)-Math.log(clamp(value,minP,maxP)))/(Math.log(maxP)-Math.log(minP))*(bottom-top);
  const path=(key)=>{let started=false;return trace.points.map((point)=>{const value=point[key];if(!(value>0)){started=false;return '';}const command=started?'L':'M';started=true;return `${command}${x(point.molarVolumeLmol).toFixed(2)} ${y(value).toFixed(2)}`;}).filter(Boolean).join(' ');};
  const currentV=analysis.molarVolumeLmol;
  const currentInRange=currentV>=minV&&currentV<=maxV;
  const critical=trace.parameters?{v:trace.parameters.criticalMolarVolumeLmol,p:trace.parameters.criticalPressureBar}:null;
  return <svg className="gas-isotherm-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Logarithmic pressure-volume isotherm at ${trace.temperatureK.toFixed(1)} kelvin. Cyan is ideal gas. Violet is the raw van der Waals teaching equation. ${trace.phaseWarning??'No sampled raw loop.'}`}>
    <title>Ideal and raw van der Waals pressure-volume comparison</title>
    <desc>Both axes are logarithmic. Gaps in the violet line are blocked or nonpositive raw cubic states.</desc>
    {[.01,.1,1,10,100,1000].filter((value)=>value<=maxP).map((value)=><g key={`p${value}`}><line className="isotherm-grid" x1={left} x2={right} y1={y(value)} y2={y(value)}/><text className="isotherm-tick" x={left-10} y={y(value)+4} textAnchor="end">{value}</text></g>)}
    {[.05,.1,.3,1,3,10,30].filter((value)=>value>=minV&&value<=maxV).map((value)=><g key={`v${value}`}><line className="isotherm-grid vertical" x1={x(value)} x2={x(value)} y1={top} y2={bottom}/><text className="isotherm-tick" x={x(value)} y={bottom+20} textAnchor="middle">{value}</text></g>)}
    <path className="isotherm-line ideal" d={path('idealPressureBar')}/>
    {trace.parameters&&<path className="isotherm-line real" d={path('realPressureBar')}/>} 
    {critical&&critical.v>=minV&&critical.v<=maxV&&critical.p<=maxP&&<g className="isotherm-critical"><circle cx={x(critical.v)} cy={y(critical.p)} r="6"/><text x={x(critical.v)+9} y={y(critical.p)-9}>critical-derived point</text></g>}
    {currentInRange&&<g className="isotherm-current"><line x1={x(currentV)} x2={x(currentV)} y1={top} y2={bottom}/><circle className="ideal" cx={x(currentV)} cy={y(analysis.ideal.pressureBar)} r="6"/>{analysis.real?.pressureBar>0&&<circle className="real" cx={x(currentV)} cy={y(analysis.real.pressureBar)} r="6"/>}<text x={x(currentV)+8} y={top+15}>current Vₘ</text></g>}
    <text className="isotherm-axis" x="18" y={(top+bottom)/2} transform={`rotate(-90 18 ${(top+bottom)/2})`} textAnchor="middle">pressure / bar · log scale</text>
    <text className="isotherm-axis" x={(left+right)/2} y={HEIGHT-12} textAnchor="middle">molar volume / L mol⁻¹ · log scale</text>
  </svg>;
}

function PhaseVessel({analysis,revealed}) {
  const tendency=revealed?analysis.tendency:'unknown';
  const label=revealed?analysis.label:'Prediction not checked';
  return <svg className={`phase-vessel-svg ${tendency}`} viewBox="0 0 420 430" role="img" aria-label={`Symbolic pure-water liquid-vapour vessel. ${label}. The arrows indicate qualitative tendency only, not rate or phase amount.`}>
    <title>Pure-water liquid-vapour tendency vessel</title>
    <defs><linearGradient id="waterLiquid" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#76f4db" stopOpacity=".75"/><stop offset="1" stopColor="#167ca0" stopOpacity=".9"/></linearGradient><filter id="waterGlow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <g className="phase-vessel-field">{Array.from({length:7},(_,i)=><circle key={i} cx="210" cy="219" r={60+i*25}/>)}</g>
    <path className="vessel-neck" d="M163 35v62c0 18-15 26-28 38-32 29-54 75-54 130 0 89 58 134 129 134s129-45 129-134c0-55-22-101-54-130-13-12-28-20-28-38V35z"/>
    <path className="vessel-liquid" d="M91 282c31-12 55 9 83 0s55-11 82 0 47-2 73 0c-8 75-57 108-119 108S99 357 91 282z" fill="url(#waterLiquid)"/>
    <g className="vapour-particles">{[[145,161],[210,137],[275,171],[170,225],[250,220],[117,245],[302,245]].map(([x,y],i)=><g key={i}><circle cx={x} cy={y} r="7"/><circle cx={x-2} cy={y-2} r="2"/></g>)}</g>
    <g className="liquid-bubbles">{[[145,337,7],[208,314,5],[273,350,8],[245,373,4],[181,363,5]].map(([x,y,r],i)=><circle key={i} cx={x} cy={y} r={r}/>)}</g>
    {tendency==='evaporation'&&<g className="phase-flow upward"><path d="M145 300c-20-48 10-67 0-111"/><path d="M210 291c20-47-9-74 0-126"/><path d="M274 301c-10-43 17-68 0-108"/></g>}
    {tendency==='condensation'&&<g className="phase-flow downward"><path d="M145 170c20 47-10 69 0 112"/><path d="M210 155c-20 46 9 74 0 126"/><path d="M274 181c10 41-17 66 0 104"/></g>}
    {tendency==='equilibrium'&&<g className="phase-flow equilibrium"><path d="M166 290c-14-44 10-65 0-108"/><path d="M255 177c-12 42 13 65 0 111"/></g>}
    {tendency==='unknown'&&<g className="phase-question"><circle cx="210" cy="236" r="43"/><text x="210" y="250" textAnchor="middle">?</text></g>}
    <g className="phase-thermometer"><rect x="34" y="98" width="24" height="210" rx="12"/><rect x="40" y={288-clamp((analysis.temperatureK-273.15)/99.85,0,1)*160} width="12" height={20+clamp((analysis.temperatureK-273.15)/99.85,0,1)*160} rx="6"/><circle cx="46" cy="315" r="20"/><text x="46" y="355" textAnchor="middle">{analysis.temperatureK.toFixed(1)} K</text></g>
    <g className="phase-pressure-label"><text x="210" y="23" textAnchor="middle">p external {analysis.externalPressureBar.toFixed(4)} bar</text><text x="210" y="418" textAnchor="middle">p sat {analysis.saturationPressureBar.toFixed(4)} bar</text></g>
  </svg>;
}

function SaturationChart({analysis}) {
  const curve=useMemo(()=>createWaterSaturationCurve(),[]);
  const WIDTH=760,HEIGHT=350,left=66,right=728,top=28,bottom=296,minP=.005,maxP=1.25;
  const x=(temperature)=>left+(temperature-273.15)/(373-273.15)*(right-left);
  const y=(pressure)=>top+(Math.log(maxP)-Math.log(clamp(pressure,minP,maxP)))/(Math.log(maxP)-Math.log(minP))*(bottom-top);
  const path=curve.map((point,index)=>`${index?'L':'M'}${x(point.temperatureK).toFixed(2)} ${y(point.saturationPressureBar).toFixed(2)}`).join(' ');
  return <svg className="saturation-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Water saturation pressure curve from 273.15 to 373 kelvin. Current temperature ${analysis.temperatureK.toFixed(2)} kelvin, saturation pressure ${analysis.saturationPressureBar.toFixed(4)} bar, external pressure ${analysis.externalPressureBar.toFixed(4)} bar.`}>
    <title>Pure-water Antoine saturation-pressure curve</title>
    {[.005,.01,.03,.1,.3,1].map((pressure)=><g key={pressure}><line className="saturation-grid" x1={left} x2={right} y1={y(pressure)} y2={y(pressure)}/><text x={left-9} y={y(pressure)+4} textAnchor="end">{pressure}</text></g>)}
    {[273.15,298.15,323.15,348.15,373].map((temperature)=><g key={temperature}><line className="saturation-grid vertical" x1={x(temperature)} x2={x(temperature)} y1={top} y2={bottom}/><text x={x(temperature)} y={bottom+20} textAnchor="middle">{temperature.toFixed(0)}</text></g>)}
    <path className="saturation-curve" d={path}/><line className="external-pressure-line" x1={left} x2={right} y1={y(analysis.externalPressureBar)} y2={y(analysis.externalPressureBar)}/>
    <line className="saturation-current-line" x1={x(analysis.temperatureK)} x2={x(analysis.temperatureK)} y1={top} y2={bottom}/><circle className="saturation-current" cx={x(analysis.temperatureK)} cy={y(analysis.saturationPressureBar)} r="7"/><circle className="external-current" cx={x(analysis.temperatureK)} cy={y(analysis.externalPressureBar)} r="6"/>
    <text className="saturation-axis" x="17" y={(top+bottom)/2} transform={`rotate(-90 17 ${(top+bottom)/2})`} textAnchor="middle">pressure / bar · log scale</text><text className="saturation-axis" x={(left+right)/2} y={HEIGHT-10} textAnchor="middle">temperature / K</text>
    <g className="saturation-key" transform="translate(485 46)"><path d="M0 0h24"/><text x="31" y="4">pSat curve</text><path className="external" d="M0 19h24"/><text x="31" y="23">external pressure</text></g>
  </svg>;
}

export default function GasPhaseLab() {
  const [lawId,setLawId]=useState('boyle');
  const [lawTargets,setLawTargets]=useState(()=>Object.fromEntries(Object.values(GAS_LAW_EXPERIMENTS).map((experiment)=>[experiment.id,experiment.defaultTarget])));
  const [lawPrediction,setLawPrediction]=useState(null);
  const [lawCheck,setLawCheck]=useState(null);
  const [lawHintLevel,setLawHintLevel]=useState(0);
  const [gasId,setGasId]=useState('carbon-dioxide');
  const [amountMol,setAmountMol]=useState(1);
  const [temperatureK,setTemperatureK]=useState(320);
  const [volumeL,setVolumeL]=useState(1.2);
  const [phaseTemperatureK,setPhaseTemperatureK]=useState(298.15);
  const [externalPressureBar,setExternalPressureBar]=useState(1);
  const [phasePrediction,setPhasePrediction]=useState(null);
  const [phaseCheck,setPhaseCheck]=useState(null);
  const [phaseHintLevel,setPhaseHintLevel]=useState(0);
  const [trace,setTrace]=useState([{id:0,type:'start',title:'Gas & phase bench ready',detail:'No prediction has been made.'}]);
  const traceId=useRef(1);
  const record=(type,title,detail)=>{const id=traceId.current++;setTrace((current)=>[{id,type,title,detail},...current].slice(0,14));};

  const law=GAS_LAW_EXPERIMENTS[lawId];
  const currentTarget=lawTargets[lawId];
  const lawPreview=useMemo(()=>runGasLawExperiment({lawId,targetValue:currentTarget}),[lawId,currentTarget]);
  const gasAnalysis=useMemo(()=>analyzeGasState({gasId,amountMol,volumeL,temperatureK}),[gasId,amountMol,volumeL,temperatureK]);
  const isotherm=useMemo(()=>createIsothermTrace({gasId,temperatureK,pointCount:110}),[gasId,temperatureK]);
  const phaseAnalysis=useMemo(()=>analyzeWaterPhase({temperatureK:phaseTemperatureK,externalPressureBar}),[phaseTemperatureK,externalPressureBar]);
  const passport=MODEL_PASSPORTS.gasPhase;

  const chooseLaw=(id)=>{if(id===lawId)return;setLawId(id);setLawPrediction(null);setLawCheck(null);setLawHintLevel(0);record('setup','Controlled experiment changed',GAS_LAW_EXPERIMENTS[id].name);};
  const changeLawTarget=(value)=>{setLawTargets((current)=>({...current,[lawId]:value}));setLawCheck(null);};
  const checkLaw=()=>{if(!lawPrediction){setLawCheck({blocked:true,title:'Choose a direction first.',reason:`Predict whether ${law.observedLabel.toLowerCase()} decreases, stays the same, or increases.`});record('blocked','Gas-law run blocked','A direction prediction is required.');return;}const checked=evaluateGasLawPrediction({lawId,targetValue:currentTarget,prediction:lawPrediction});setLawCheck(checked);record(checked.correct?'correct':'incorrect',`${law.name}: ${checked.correct?'matched':'compare invariant'}`,checked.reason);};
  const revealLawHint=()=>{const next=Math.min(3,lawHintLevel+1);setLawHintLevel(next);record('hint',`Gas-law hint ${next}`,nextGasLawHint({lawId,targetValue:currentTarget,level:next}));};

  const chooseGas=(id)=>{if(id===gasId)return;setGasId(id);record('setup','Gas model changed',GAS_PRESETS.find((preset)=>preset.id===id).name);};
  const recordGasState=()=>record(gasAnalysis.real?.status==='blocked'?'blocked':'state','Gas state inspected',`${gasAnalysis.preset.formula} · ${amountMol.toFixed(2)} mol · ${temperatureK.toFixed(1)} K · ${volumeL.toFixed(2)} L`);

  const resetPhaseCheck=()=>setPhaseCheck(null);
  const checkPhase=()=>{if(!phasePrediction){setPhaseCheck({blocked:true,title:'Choose a phase tendency first.',reason:'Predict evaporation, equilibrium, or condensation before checking.'});record('blocked','Phase check blocked','A phase-tendency prediction is required.');return;}const checked=evaluatePhasePrediction({temperatureK:phaseTemperatureK,externalPressureBar,prediction:phasePrediction});setPhaseCheck(checked);record(checked.correct?'correct':'incorrect',`Water phase: ${checked.correct?'matched':'compare pressures'}`,checked.reason);};
  const revealPhaseHint=()=>{const next=Math.min(3,phaseHintLevel+1);setPhaseHintLevel(next);record('hint',`Phase hint ${next}`,nextPhaseHint({temperatureK:phaseTemperatureK,externalPressureBar,level:next}));};
  const setEquilibriumPressure=()=>{setExternalPressureBar(phaseAnalysis.saturationPressureBar);setPhaseCheck(null);record('reveal','Loaded pExternal = pSat',`${phaseAnalysis.saturationPressureBar.toFixed(5)} bar at ${phaseTemperatureK.toFixed(2)} K. Prediction preserved for re-check.`);};

  return (
    <section className="gas-phase-lab" id="gasPhaseLab" aria-labelledby="gasPhaseLabTitle">
      <header className="gas-phase-header"><div><p className="section-code">14 / Gases + phase equilibrium</p><h2 id="gasPhaseLabTitle">A gas law is a controlled experiment, not four letters to memorize.</h2><p>Hold the right variables fixed, commit a prediction, then move from an ideal piston to a real-gas departure and a liquid-vapour boundary.</p></div><div className="gas-condition-stamp"><span>Three model layers</span><strong>Ideal law · cubic departure · pSat</strong><small>Learner predictions stay visible · source ranges enforced</small></div></header>

      <div className="gas-phase-bench">
        <aside className="gas-law-panel gas-card">
          <div className="gas-panel-heading"><span>Controlled proportionality</span><strong>Predict before you run</strong></div>
          <div className="gas-law-tabs">{Object.values(GAS_LAW_EXPERIMENTS).map((experiment)=><button type="button" key={experiment.id} className={lawId===experiment.id?'active':''} onClick={()=>chooseLaw(experiment.id)}><span>{experiment.eyebrow}</span><strong>{experiment.name.replace(' experiment','')}</strong></button>)}</div>
          <div className="held-variable-strip"><span>Held fixed</span>{law.eyebrow.replace('Hold ','').split(' and ').map((item)=><b key={item}>{item}</b>)}</div>
          <div className="gas-baseline"><span>Shared baseline</span><div><b>p <strong>1.00 bar</strong></b><b>V <strong>{lawPreview.baseline.volumeL.toFixed(2)} L</strong></b><b>T <strong>298.15 K</strong></b><b>n <strong>1.00 mol</strong></b></div></div>
          <label className="gas-law-target"><span>{law.changedLabel}</span><strong>{currentTarget.toFixed(law.step<1?2:1)} {law.unit}</strong><input aria-label={law.changedLabel} type="range" min={law.minimum} max={law.maximum} step={law.step} value={currentTarget} onChange={(event)=>changeLawTarget(event.target.valueAsNumber)}/><input aria-label={`${law.changedLabel} numeric value`} type="number" min={law.minimum} max={law.maximum} step={law.step} value={currentTarget} onChange={(event)=>{if(Number.isFinite(event.target.valueAsNumber))changeLawTarget(clamp(event.target.valueAsNumber,law.minimum,law.maximum));}}/></label>
          <div className="gas-prediction-block"><span>What happens to {law.observedLabel.toLowerCase()}?</span><div>{DIRECTIONS.map((choice)=><button type="button" key={choice.id} className={lawPrediction===choice.id?'selected':''} aria-pressed={lawPrediction===choice.id} onClick={()=>{setLawPrediction(choice.id);setLawCheck(null);}}><b>{choice.symbol}</b><span>{choice.label}</span></button>)}</div></div>
          <div className="gas-law-actions"><button type="button" className="gas-run-button" onClick={checkLaw}>Run experiment <span aria-hidden="true">→</span></button><button type="button" className="gas-hint-button" onClick={revealLawHint} disabled={lawHintLevel>=3}>Hint {Math.min(3,lawHintLevel+1)}</button></div>
          {lawHintLevel>0&&<div className="gas-hint-stack">{Array.from({length:lawHintLevel},(_,index)=><p key={index}><b>{index+1}</b>{nextGasLawHint({lawId,targetValue:currentTarget,level:index+1})}</p>)}</div>}
          {lawCheck&&<div className={`gas-law-feedback ${lawCheck.blocked?'blocked':lawCheck.correct?'correct':'incorrect'}`} aria-live="polite"><span>{lawCheck.title}</span><p>{lawCheck.reason}</p>{!lawCheck.blocked&&<><GasLawMiniature result={lawCheck.result}/><div className="gas-invariant-readout"><b>{law.invariantLabel} before</b><strong>{compact(lawCheck.result.invariantBefore,4)}</strong><b>{law.invariantLabel} after</b><strong>{compact(lawCheck.result.invariantAfter,4)}</strong></div></>}</div>}
        </aside>

        <section className="gas-chamber gas-card">
          <div className="gas-stage-topline"><span><i/>linked piston observatory</span><b>{gasAnalysis.resultKind}</b></div>
          <div className="gas-preset-shelf">{GAS_PRESETS.map((preset)=><button type="button" key={preset.id} className={gasId===preset.id?'active':''} aria-pressed={gasId===preset.id} onClick={()=>chooseGas(preset.id)} style={{'--gas-accent':preset.accent}}><b>{preset.formula}</b><span>{preset.name}</span><small>{preset.shortLabel}</small></button>)}</div>
          <GasPiston analysis={gasAnalysis}/>
          <div className="gas-state-controls">
            <label><span>Amount <b>{amountMol.toFixed(2)} mol</b></span><input aria-label="Gas amount" type="range" min="0.25" max="2.5" step="0.05" value={amountMol} onChange={valueSetter(setAmountMol,.25,2.5)} onPointerUp={recordGasState} onKeyUp={recordGasState}/><input aria-label="Gas amount numeric value" type="number" min="0.25" max="2.5" step="0.05" value={amountMol} onChange={valueSetter(setAmountMol,.25,2.5)} onBlur={recordGasState}/></label>
            <label><span>Temperature <b>{temperatureK.toFixed(1)} K</b></span><input aria-label="Gas temperature" type="range" min="100" max="700" step="1" value={temperatureK} onChange={valueSetter(setTemperatureK,100,700)} onPointerUp={recordGasState} onKeyUp={recordGasState}/><input aria-label="Gas temperature numeric value" type="number" min="100" max="700" step="1" value={temperatureK} onChange={valueSetter(setTemperatureK,100,700)} onBlur={recordGasState}/></label>
            <label><span>Volume <b>{volumeL.toFixed(2)} L</b></span><input aria-label="Gas volume" type="range" min="0.05" max="30" step="0.05" value={volumeL} onChange={valueSetter(setVolumeL,.05,30)} onPointerUp={recordGasState} onKeyUp={recordGasState}/><input aria-label="Gas volume numeric value" type="number" min="0.05" max="30" step="0.05" value={volumeL} onChange={valueSetter(setVolumeL,.05,30)} onBlur={recordGasState}/></label>
          </div>
        </section>

        <aside className={`gas-ledger gas-card ${gasAnalysis.status}`} aria-live="polite">
          <div className="gas-panel-heading"><span>Pressure ledger</span><strong>Do the models agree?</strong></div>
          <div className="gas-result-kind"><i/>{gasAnalysis.resultKind}</div>
          <div className="ideal-pressure-hero"><span>Ideal pressure</span><div><strong>{compact(gasAnalysis.ideal.pressureBar,3)}</strong><b>bar</b></div><code>nRT / V</code></div>
          {!gasAnalysis.real&&<div className="gas-ideal-only"><strong>Z = 1 exactly</strong><p>{gasAnalysis.boundary}</p></div>}
          {gasAnalysis.real?.status==='blocked'&&<div className="gas-real-blocked"><span>Why the cubic stops</span><strong>V − nb ≤ 0</strong><p>{gasAnalysis.real.reason}</p><dl><div><dt>Entered V</dt><dd>{gasAnalysis.input.volumeL.toFixed(4)} L</dd></div><div><dt>Excluded nb</dt><dd>{gasAnalysis.real.excludedVolumeL.toFixed(4)} L</dd></div></dl></div>}
          {gasAnalysis.real&&gasAnalysis.real.status!=='blocked'&&<>
            <div className="pressure-equation-ledger"><div className="positive"><span>Available-volume term</span><strong>{compact(gasAnalysis.real.excludedVolumePressureBar,3)} bar</strong><small>nRT / (V − nb)</small></div><i>−</i><div className="negative"><span>Attraction correction</span><strong>{compact(gasAnalysis.real.attractionCorrectionBar,3)} bar</strong><small>a(n/V)²</small></div><i>=</i><div className={gasAnalysis.real.status==='valid'?'result':'result invalid'}><span>Raw cubic pressure</span><strong>{compact(gasAnalysis.real.pressureBar,3)} bar</strong><small>{gasAnalysis.real.status==='valid'?'comparison available':'nonphysical branch'}</small></div></div>
            <div className="z-gauge"><div><span>Compression factor Z</span><strong>{compact(gasAnalysis.real.compressionFactor,3)}</strong></div><div className="z-track"><i className="attraction"/><i className="ideal"/><i className="excluded"/><b style={{left:`${clamp((gasAnalysis.real.compressionFactor-.5)/1*100,0,100)}%`}}/></div><p>{gasAnalysis.real.deviation.reason}</p></div>
            <dl className="gas-critical-ledger"><div><dt>T / Tc</dt><dd>{gasAnalysis.real.temperatureRatio.toFixed(3)}</dd></div><div><dt>Tc source</dt><dd>{gasAnalysis.preset.critical.temperatureK.toFixed(2)} K</dd></div><div><dt>Pc source</dt><dd>{gasAnalysis.preset.critical.pressureBar.toFixed(3)} bar</dd></div><div><dt>a derived</dt><dd>{gasAnalysis.real.parameters.aL2BarMol2.toFixed(4)}</dd></div><div><dt>b derived</dt><dd>{gasAnalysis.real.parameters.bLmol.toFixed(5)} L/mol</dd></div><div><dt>V − nb</dt><dd>{gasAnalysis.real.availableVolumeL.toFixed(4)} L</dd></div></dl>
            <div className={`gas-phase-warning ${gasAnalysis.real.subcritical?'subcritical':''}`}><span>{gasAnalysis.real.subcritical?'Subcritical cubic warning':'Above-critical comparison'}</span><p>{gasAnalysis.real.phaseWarning}</p>{gasAnalysis.real.reason&&<strong>{gasAnalysis.real.reason}</strong>}</div>
          </>}
        </aside>

        <section className="gas-isotherm-panel gas-card">
          <div className="gas-panel-heading"><span>Model comparison field</span><strong>One state, two equations</strong></div>
          <div className="isotherm-layout"><div className="isotherm-graphic-wrap"><IsothermChart trace={isotherm} analysis={gasAnalysis}/><div className="isotherm-key"><span><i className="ideal"/>ideal gas</span><span><i className="real"/>raw van der Waals</span><span><i className="current"/>current state</span></div></div><div className="isotherm-explanation"><span>{isotherm.subcritical?'Below Tc':'At or above Tc'}</span><h3>{isotherm.hasRawLoop?'A loop is a warning, not a phase plateau.':'Watch the curves converge at low density.'}</h3><p>{isotherm.phaseWarning??'At large molar volume, both correction terms shrink and the cubic approaches the ideal curve.'}</p><div><b>Attractions</b><p>Subtract pressure most clearly at moderate density, which can push Z below one.</p></div><div><b>Excluded volume</b><p>Removes available volume at high density, which can push Z above one or block V ≤ nb.</p></div><small>{gasAnalysis.boundary}</small></div></div>
        </section>

        <section className="water-phase-panel gas-card">
          <div className="gas-panel-heading"><span>Pure-water liquid ↔ vapour</span><strong>Compare p external with pSat</strong></div>
          <div className="water-phase-layout">
            <div className="phase-controls">
              <label><span>Temperature</span><strong>{phaseTemperatureK.toFixed(2)} K</strong><input aria-label="Water phase temperature" type="range" min={WATER_PHASE_MODEL.interfaceTemperatureK.minimum} max={WATER_PHASE_MODEL.interfaceTemperatureK.maximum} step="0.05" value={phaseTemperatureK} onChange={(event)=>{setPhaseTemperatureK(event.target.valueAsNumber);resetPhaseCheck();}}/><input aria-label="Water phase temperature numeric value" type="number" min={WATER_PHASE_MODEL.interfaceTemperatureK.minimum} max={WATER_PHASE_MODEL.interfaceTemperatureK.maximum} step="0.05" value={phaseTemperatureK} onChange={(event)=>{if(Number.isFinite(event.target.valueAsNumber)){setPhaseTemperatureK(clamp(event.target.valueAsNumber,273.15,373));resetPhaseCheck();}}}/></label>
              <label><span>External pressure</span><strong>{externalPressureBar.toFixed(4)} bar</strong><input aria-label="External pressure" type="range" min="0.005" max="1.2" step="0.001" value={externalPressureBar} onChange={(event)=>{setExternalPressureBar(event.target.valueAsNumber);resetPhaseCheck();}}/><input aria-label="External pressure numeric value" type="number" min="0.005" max="1.2" step="0.001" value={externalPressureBar} onChange={(event)=>{if(Number.isFinite(event.target.valueAsNumber)){setExternalPressureBar(clamp(event.target.valueAsNumber,.005,1.2));resetPhaseCheck();}}}/></label>
              <div className="phase-prediction"><span>Predict the net tendency</span>{PHASE_CHOICES.map((choice)=><button type="button" key={choice.id} className={phasePrediction===choice.id?'selected':''} aria-pressed={phasePrediction===choice.id} onClick={()=>{setPhasePrediction(choice.id);resetPhaseCheck();}}><b>{choice.symbol}</b><span><strong>{choice.label}</strong><small>{choice.detail}</small></span></button>)}</div>
              <div className="phase-actions"><button type="button" className="gas-run-button" onClick={checkPhase}>Check phase tendency <span aria-hidden="true">→</span></button><button type="button" className="gas-hint-button" onClick={revealPhaseHint} disabled={phaseHintLevel>=3}>Hint {Math.min(3,phaseHintLevel+1)}</button><button type="button" className="phase-reference-button" onClick={setEquilibriumPressure}>Set p external = pSat</button></div>
              {phaseHintLevel>0&&<div className="gas-hint-stack phase">{Array.from({length:phaseHintLevel},(_,index)=><p key={index}><b>{index+1}</b>{nextPhaseHint({temperatureK:phaseTemperatureK,externalPressureBar,level:index+1})}</p>)}</div>}
            </div>
            <div className="phase-vessel-wrap"><PhaseVessel analysis={phaseAnalysis} revealed={Boolean(phaseCheck&&!phaseCheck.blocked)}/><p>Arrows appear only after checking. They show a qualitative thermodynamic tendency, never a molecular rate.</p></div>
            <div className="saturation-chart-wrap"><SaturationChart analysis={phaseAnalysis}/><div className="phase-correlation-strip"><span>NIST Antoine record</span><code>log₁₀(pSat/bar) = 4.6543 − 1435.264/(T − 64.848)</code><b>UI range 273.15–373.00 K</b></div></div>
            <div className={`phase-feedback ${phaseCheck?.blocked?'blocked':phaseCheck?.correct?'correct':phaseCheck?'incorrect':'idle'}`} aria-live="polite">{phaseCheck?<><span>{phaseCheck.title}</span><p>{phaseCheck.reason}</p>{!phaseCheck.blocked&&<dl><div><dt>p external / pSat</dt><dd>{phaseCheck.analysis.pressureRatio.toFixed(3)}</dd></div><div><dt>Model tendency</dt><dd>{phaseCheck.analysis.label}</dd></div><div><dt>Boiling inversion</dt><dd>{phaseCheck.analysis.boilingTemperatureK?`${phaseCheck.analysis.boilingTemperatureK.toFixed(2)} K`:phaseCheck.analysis.boilingRangeReason}</dd></div></dl>}</>:<><span>Commit a prediction to reveal the tendency.</span><p>The curve and pressure line are evidence. The vessel does not answer for you.</p></>}</div>
          </div>
        </section>

        <aside className="gas-learning-trace gas-card">
          <div className="gas-panel-heading"><span>Learner-owned trace</span><strong>What changed, and why</strong></div>
          <div className="gas-attempts">{trace.map((entry)=><div key={entry.id} className={entry.type}><i/><span>{entry.type}</span><strong>{entry.title}</strong><p>{entry.detail}</p></div>)}</div>
          <details className="gas-teacher-lens"><summary>Teacher lens</summary><div><p><b>Control:</b> Ask which variables must be held fixed before naming a gas law.</p><p><b>Departure:</b> Ask why the attraction and excluded-volume terms have opposite signs.</p><p><b>Boundary:</b> Ask why p = pSat establishes an equilibrium condition but not a boiling rate or phase fraction.</p></div></details>
        </aside>

        <aside className="gas-passport gas-card">
          <div className="gas-panel-heading"><span>Model + data passport</span><strong>{passport.name}</strong></div>
          <div className="gas-passport-verdict"><i/>{passport.resultKind}</div>
          <p>{passport.inputProvenance}</p>
          <div className="gas-passport-groups"><div><span>Included</span>{passport.includes.map((item)=><b key={item}>{item}</b>)}</div><div className="excluded"><span>Not included</span>{passport.excludes.map((item)=><b key={item}>{item}</b>)}</div></div>
          <div className="gas-passport-equations"><span>Equations in use</span><code>pV = nRT</code><code>p = nRT/(V − nb) − a(n/V)²</code><code>Z = pV/(nRT)</code><code>log₁₀ pSat = A − B/(T + C)</code></div>
          <p className="gas-data-statement">{passport.dataStatement}</p>
          <div className="gas-sources"><span>Primary references</span>{passport.sources.map((sourceId)=>{const source=SCIENCE_SOURCES[sourceId];return <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><strong>{source.name}</strong><small>{source.role}</small><b aria-hidden="true">↗</b></a>;})}</div>
        </aside>
      </div>
    </section>
  );
}
