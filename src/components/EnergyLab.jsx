import { useMemo, useState } from 'react';
import {
  analyzeThermoKinetics,
  remainingFractionAt,
} from '../chemistry/thermokinetics.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../data/scienceSources.js';

const ENERGY_PRESETS = [
  {id:'cold-favored',name:'Cold-favored exothermic',note:'Heating can reverse favorability',deltaHkJ:-50,deltaSJ:-100,activationKJ:75,catalystReductionKJ:15,logA:12},
  {id:'heat-favored',name:'Heat-favored endothermic',note:'Positive entropy wins above 250 K',deltaHkJ:40,deltaSJ:160,activationKJ:85,catalystReductionKJ:15,logA:12},
  {id:'enthalpy-entropy-help',name:'Both terms favor products',note:'Exothermic with positive entropy',deltaHkJ:-60,deltaSJ:80,activationKJ:70,catalystReductionKJ:10,logA:11},
];

const COORDINATE = {width:780,height:390,left:82,right:706,top:46,bottom:304};
const TRACE = {width:760,height:270,left:54,right:735,top:24,bottom:222};

function clamp(value,minimum,maximum){return Math.max(minimum,Math.min(maximum,value));}

function finiteInput(setter,minimum,maximum){
  return (event)=>{const value=event.target.valueAsNumber;if(Number.isFinite(value))setter(clamp(value,minimum,maximum));};
}

function signed(value,digits=2){return `${value>0?'+':''}${Number(value).toFixed(digits)}`;}

function scientific(value,digits=2){
  if(value===0)return '0';
  if(!Number.isFinite(value))return '∞';
  if(Math.abs(value)>=1e4||Math.abs(value)<1e-3)return value.toExponential(digits);
  return value.toFixed(digits);
}

function formatTime(seconds){
  if(seconds===0)return '0 s';
  if(!Number.isFinite(seconds))return '∞';
  if(seconds<1e-6)return `${(seconds*1e9).toFixed(2)} ns`;
  if(seconds<1e-3)return `${(seconds*1e6).toFixed(2)} μs`;
  if(seconds<1)return `${(seconds*1e3).toFixed(2)} ms`;
  if(seconds<120)return `${seconds.toFixed(2)} s`;
  if(seconds<7200)return `${(seconds/60).toFixed(2)} min`;
  if(seconds<172800)return `${(seconds/3600).toFixed(2)} h`;
  return `${(seconds/86400).toFixed(2)} d`;
}

function equilibriumDisplay(thermo){
  if(Math.abs(thermo.log10K)>3)return `10^${thermo.log10K.toFixed(2)}`;
  return scientific(thermo.equilibriumConstant,3);
}

function ReactionCoordinate({analysis}){
  if(analysis.status==='invalid'){
    return <div className="energy-invalid-landscape"><div><span>Energy geometry rejected</span><strong>The entered transition state cannot connect both endpoints.</strong>{analysis.errors.map((error)=><p key={error}>{error}</p>)}</div></div>;
  }
  const coordinate=analysis.coordinate;
  const values=[coordinate.reactantEnergyKJ,coordinate.productEnergyKJ,coordinate.transitionEnergyKJ,coordinate.catalyzedTransitionEnergyKJ];
  const minimum=Math.min(...values)-Math.max(12,(Math.max(...values)-Math.min(...values))*.12);
  const maximum=Math.max(...values)+Math.max(12,(Math.max(...values)-Math.min(...values))*.12);
  const y=(energy)=>COORDINATE.top+(maximum-energy)/(maximum-minimum)*(COORDINATE.bottom-COORDINATE.top);
  const reactantY=y(0),productY=y(coordinate.productEnergyKJ),transitionY=y(coordinate.transitionEnergyKJ),catalyzedY=y(coordinate.catalyzedTransitionEnergyKJ);
  const pathFor=(peakY)=>`M ${COORDINATE.left} ${reactantY} C 190 ${reactantY}, 270 ${peakY}, 390 ${peakY} C 510 ${peakY}, 596 ${productY}, ${COORDINATE.right} ${productY}`;
  const uncatalyzedPath=pathFor(transitionY),catalyzedPath=pathFor(catalyzedY);
  return (
    <div className="coordinate-wrap">
      <svg className="reaction-coordinate" viewBox={`0 0 ${COORDINATE.width} ${COORDINATE.height}`} role="img" aria-label={`Reaction coordinate. Reactants at zero, products at ${signed(coordinate.productEnergyKJ)} kilojoules per mole, uncatalyzed activation ${coordinate.forwardActivationKJ} and catalyzed activation ${coordinate.catalyzedForwardKJ} kilojoules per mole.`}>
        <title>Catalyzed and uncatalyzed reaction-coordinate comparison</title>
        <desc>Both paths share reactant and product levels. The catalyst lowers both activation barriers without changing the endpoints.</desc>
        <defs>
          <filter id="energyGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <linearGradient id="uncatalyzedGradient" x1="0" x2="1"><stop offset="0" stopColor="#ff6b7a"/><stop offset="50%" stopColor="#ffb547"/><stop offset="100%" stopColor="#a78bfa"/></linearGradient>
          <linearGradient id="catalyzedGradient" x1="0" x2="1"><stop offset="0" stopColor="#ff6b7a"/><stop offset="50%" stopColor="#63e6ff"/><stop offset="100%" stopColor="#a78bfa"/></linearGradient>
        </defs>
        {[0,.25,.5,.75,1].map((fraction)=>{const gridY=COORDINATE.top+fraction*(COORDINATE.bottom-COORDINATE.top);return <line key={fraction} className="energy-gridline" x1={COORDINATE.left-25} x2={COORDINATE.right+25} y1={gridY} y2={gridY}/>;})}
        <line className="energy-endpoint reactant" x1={COORDINATE.left-10} x2={COORDINATE.left+84} y1={reactantY} y2={reactantY}/>
        <line className="energy-endpoint product" x1={COORDINATE.right-84} x2={COORDINATE.right+10} y1={productY} y2={productY}/>
        <path className="coordinate-path uncatalyzed-shadow" d={uncatalyzedPath}/><path className="coordinate-path uncatalyzed" d={uncatalyzedPath}/>
        <path className="coordinate-path catalyzed-shadow" d={catalyzedPath}/><path className="coordinate-path catalyzed" d={catalyzedPath}/>
        <line className="barrier-arrow uncatalyzed" x1={140} x2={140} y1={reactantY} y2={transitionY}/>
        <line className="barrier-arrow catalyzed" x1={215} x2={215} y1={reactantY} y2={catalyzedY}/>
        <line className="barrier-arrow delta-h" x1={655} x2={655} y1={reactantY} y2={productY}/>
        <line className="catalyst-drop-line" x1={390} x2={390} y1={transitionY} y2={catalyzedY}/>
        <circle className="transition-node uncatalyzed" cx="390" cy={transitionY} r="6"/><circle className="transition-node catalyzed" cx="390" cy={catalyzedY} r="6"/>
        <text className="coordinate-label endpoint" x={COORDINATE.left} y={reactantY+24}>Reactants · 0</text>
        <text className="coordinate-label endpoint" x={COORDINATE.right} y={productY+24} textAnchor="end">Products · {signed(coordinate.productEnergyKJ,1)}</text>
        <text className="coordinate-label uncatalyzed" x="390" y={transitionY-14} textAnchor="middle">uncatalyzed TS</text>
        <text className="coordinate-label catalyzed" x="390" y={catalyzedY+20} textAnchor="middle">catalyzed TS</text>
        <text className="coordinate-value uncatalyzed" x="130" y={(reactantY+transitionY)/2}>Ea {coordinate.forwardActivationKJ.toFixed(1)}</text>
        <text className="coordinate-value catalyzed" x="205" y={(reactantY+catalyzedY)/2}>Ea {coordinate.catalyzedForwardKJ.toFixed(1)}</text>
        <text className="coordinate-value delta-h" x="666" y={(reactantY+productY)/2}>ΔH {signed(coordinate.productEnergyKJ,1)}</text>
        {analysis.params.catalystReductionKJ>0&&<text className="coordinate-value catalyst-drop" x="402" y={(transitionY+catalyzedY)/2}>−{analysis.params.catalystReductionKJ.toFixed(1)}</text>}
        <text className="energy-axis" x="18" y={COORDINATE.height/2} transform={`rotate(-90 18 ${COORDINATE.height/2})`} textAnchor="middle">schematic enthalpy / kJ mol⁻¹</text>
        <text className="energy-axis" x={COORDINATE.width/2} y={COORDINATE.height-13} textAnchor="middle">reaction progress →</text>
      </svg>
      <div className="coordinate-key"><span><i className="uncatalyzed"/>uncatalyzed path</span><span><i className="catalyzed"/>catalyzed path</span></div>
    </div>
  );
}

function KineticRace({analysis,observationFraction,onObservationChange}){
  if(analysis.status==='invalid')return <div className="kinetic-unavailable">Correct the energy geometry to calculate a kinetic trace.</div>;
  const kinetics=analysis.kinetics,maxTime=kinetics.maximumTimeS,observationTime=maxTime*observationFraction;
  const uncatRemaining=remainingFractionAt(kinetics.uncatalyzed.rateConstantPerS,observationTime);
  const catRemaining=remainingFractionAt(kinetics.catalyzed.rateConstantPerS,observationTime);
  const x=(time)=>TRACE.left+time/maxTime*(TRACE.right-TRACE.left),y=(fraction)=>TRACE.top+(1-fraction)*(TRACE.bottom-TRACE.top);
  const path=(trace)=>trace.map((point,index)=>`${index?'L':'M'} ${x(point.timeS).toFixed(2)} ${y(point.remainingFraction).toFixed(2)}`).join(' ');
  const observationX=x(observationTime);
  const laneParticles=(remaining,tone)=>Array.from({length:22},(_,index)=><i key={index} className={index<Math.round(remaining*22)?`remaining ${tone}`:'converted'} />);
  return (
    <div className="kinetic-race">
      <div className="race-chart-wrap">
        <svg className="kinetic-chart" viewBox={`0 0 ${TRACE.width} ${TRACE.height}`} role="img" aria-label={`First-order decay at ${formatTime(observationTime)}. Uncatalyzed reactant remaining ${Math.round(uncatRemaining*100)} percent; catalyzed remaining ${Math.round(catRemaining*100)} percent.`}>
          <title>Uncatalyzed and catalyzed first-order concentration traces</title>
          {[0,.25,.5,.75,1].map((fraction)=><g key={fraction}><line className="kinetic-gridline" x1={TRACE.left} x2={TRACE.right} y1={y(fraction)} y2={y(fraction)}/><text className="kinetic-tick" x={TRACE.left-10} y={y(fraction)+4} textAnchor="end">{Math.round(fraction*100)}%</text></g>)}
          {[0,.5,1].map((fraction)=><g key={fraction}><line className="kinetic-gridline vertical" x1={x(maxTime*fraction)} x2={x(maxTime*fraction)} y1={TRACE.top} y2={TRACE.bottom}/><text className="kinetic-tick" x={x(maxTime*fraction)} y={TRACE.bottom+20} textAnchor="middle">{formatTime(maxTime*fraction)}</text></g>)}
          <path className="kinetic-line uncatalyzed" d={path(kinetics.traces.uncatalyzed)}/><path className="kinetic-line catalyzed" d={path(kinetics.traces.catalyzed)}/>
          <line className="observation-line" x1={observationX} x2={observationX} y1={TRACE.top} y2={TRACE.bottom}/>
          <circle className="kinetic-point uncatalyzed" cx={observationX} cy={y(uncatRemaining)} r="5"/><circle className="kinetic-point catalyzed" cx={observationX} cy={y(catRemaining)} r="5"/>
          <text className="kinetic-axis" x="14" y={TRACE.height/2} transform={`rotate(-90 14 ${TRACE.height/2})`} textAnchor="middle">reactant remaining</text>
          <text className="kinetic-axis" x={(TRACE.left+TRACE.right)/2} y={TRACE.height-8} textAnchor="middle">time</text>
        </svg>
      </div>
      <div className="observation-control"><div><span>Observe at</span><strong>{formatTime(observationTime)}</strong></div><input aria-label="Kinetic observation time" type="range" min="0" max="1" step="0.005" value={observationFraction} onChange={finiteInput(onObservationChange,0,1)}/></div>
      <div className="race-lanes">
        <div><span><i className="uncatalyzed"/>No catalyst <b>{Math.round(uncatRemaining*100)}% R</b></span><div>{laneParticles(uncatRemaining,'uncatalyzed')}</div></div>
        <div><span><i className="catalyzed"/>Catalyzed <b>{Math.round(catRemaining*100)}% R</b></span><div>{laneParticles(catRemaining,'catalyzed')}</div></div>
      </div>
      <p>Dots show normalized first-order population, not individual simulated molecules.</p>
    </div>
  );
}

export default function EnergyLab(){
  const [deltaHkJ,setDeltaH]=useState(-50),[deltaSJ,setDeltaS]=useState(-100),[temperatureK,setTemperature]=useState(298),[activationKJ,setActivation]=useState(75),[catalystReductionKJ,setCatalystReduction]=useState(15),[logA,setLogA]=useState(12),[observationFraction,setObservationFraction]=useState(.42);
  const params=useMemo(()=>({deltaHkJ,deltaSJ,temperatureK,activationKJ,catalystReductionKJ,preExponentialPerS:10**logA}),[deltaHkJ,deltaSJ,temperatureK,activationKJ,catalystReductionKJ,logA]);
  const analysis=useMemo(()=>analyzeThermoKinetics(params),[params]);
  const passport=MODEL_PASSPORTS.thermoKinetics;
  const applyPreset=(preset)=>{setDeltaH(preset.deltaHkJ);setDeltaS(preset.deltaSJ);setActivation(preset.activationKJ);setCatalystReduction(preset.catalystReductionKJ);setLogA(preset.logA);setObservationFraction(.42);};
  const matchingPreset=ENERGY_PRESETS.find((preset)=>preset.deltaHkJ===deltaHkJ&&preset.deltaSJ===deltaSJ&&preset.activationKJ===activationKJ&&preset.catalystReductionKJ===catalystReductionKJ&&preset.logA===logA);
  const thermo=analysis.thermodynamics;
  return (
    <section className="energy-lab" id="energyLab" aria-labelledby="energyLabTitle">
      <header className="energy-lab-header"><div><p className="section-code">10 / Thermodynamics + kinetics</p><h2 id="energyLabTitle">Favorable is not the same as fast.</h2><p>Change temperature and the energy barrier. Watch equilibrium and reaction speed answer two different questions.</p></div><div className="energy-condition-stamp"><span>Model pair</span><strong>Standard-state ΔG° + first-order Arrhenius</strong><small>Computed locally · learner inputs</small></div></header>
      <div className="energy-bench">
        <aside className="energy-controls">
          <div className="energy-panel-heading"><span>Reaction definition</span><strong>Shape the landscape</strong></div>
          <div className="energy-presets">{ENERGY_PRESETS.map((preset)=><button type="button" key={preset.id} className={matchingPreset?.id===preset.id?'active':''} onClick={()=>applyPreset(preset)}><strong>{preset.name}</strong><small>{preset.note}</small></button>)}</div>
          <div className="energy-input-grid">
            <label><span>ΔH°</span><div><input aria-label="Standard enthalpy change" type="number" min="-300" max="300" step="5" value={deltaHkJ} onChange={finiteInput(setDeltaH,-300,300)}/><b>kJ/mol</b></div></label>
            <label><span>ΔS°</span><div><input aria-label="Standard entropy change" type="number" min="-1000" max="1000" step="10" value={deltaSJ} onChange={finiteInput(setDeltaS,-1000,1000)}/><b>J/mol·K</b></div></label>
            <label><span>Forward Ea</span><div><input aria-label="Forward activation energy" type="number" min="0" max="400" step="5" value={activationKJ} onChange={finiteInput(setActivation,0,400)}/><b>kJ/mol</b></div></label>
            <label><span>Catalyst lowering</span><div><input aria-label="Catalyst barrier lowering" type="number" min="0" max="250" step="1" value={catalystReductionKJ} onChange={finiteInput(setCatalystReduction,0,250)}/><b>kJ/mol</b></div></label>
            <label className="wide"><span>log₁₀ A <small>first-order s⁻¹</small></span><input aria-label="Log base ten Arrhenius prefactor" type="number" min="0" max="20" step="0.5" value={logA} onChange={finiteInput(setLogA,0,20)}/></label>
          </div>
          <div className="temperature-control"><div><span>Temperature</span><strong>{temperatureK.toFixed(0)} K</strong></div><input aria-label="Temperature" type="range" min="150" max="1000" step="1" value={temperatureK} onChange={finiteInput(setTemperature,150,1000)}/><div>{[250,298,400,600].map((temperature)=><button type="button" className={temperatureK===temperature?'active':''} key={temperature} onClick={()=>setTemperature(temperature)}>{temperature} K</button>)}</div></div>
          <div className="energy-constraints"><div><span>Minimum forward Ea</span><strong>{analysis.constraints.minimumForwardActivationKJ.toFixed(1)} kJ/mol</strong></div><div><span>Maximum catalyst lowering</span><strong>{analysis.constraints.maximumCatalystReductionKJ.toFixed(1)} kJ/mol</strong></div></div>
        </aside>

        <div className="coordinate-stage"><div className="energy-stage-topline"><span><i/>schematic energy field</span><b>{analysis.status==='valid'?'geometry valid':'input rejected'}</b></div><ReactionCoordinate analysis={analysis}/></div>

        <article className={`energy-verdicts ${analysis.status}`} aria-live="polite">
          <div className="energy-result-kind"><i/>{analysis.resultKind}</div>
          <section className={`thermo-verdict ${thermo.favoredSide}`}><span>Thermodynamic question</span><h3>Where is equilibrium?</h3><div><strong>ΔG° {signed(thermo.deltaGkJ,2)}</strong><b>kJ/mol</b></div><p>{thermo.favoredLabel}</p><dl><div><dt>log₁₀ K</dt><dd>{signed(thermo.log10K,3)}</dd></div><div><dt>K</dt><dd>{equilibriumDisplay(thermo)}</dd></div><div><dt>TΔS°</dt><dd>{signed(thermo.entropyTermKJ,2)} kJ/mol</dd></div></dl></section>
          {analysis.status==='valid'?<>
            <section className="kinetic-verdict"><span>Kinetic question</span><h3>How fast is the model?</h3><div><strong>k {scientific(analysis.kinetics.uncatalyzed.rateConstantPerS,2)}</strong><b>s⁻¹</b></div><p>{analysis.kinetics.uncatalyzed.speedLabel}</p><dl><div><dt>t½, no catalyst</dt><dd>{formatTime(analysis.kinetics.uncatalyzed.halfLifeS)}</dd></div><div><dt>t½, catalyzed</dt><dd>{formatTime(analysis.kinetics.catalyzed.halfLifeS)}</dd></div><div><dt>Acceleration</dt><dd>×{scientific(analysis.kinetics.rateAcceleration,2)}</dd></div></dl></section>
            <div className="catalyst-truth"><span>Catalyst invariant</span><strong>Same ΔG° and K. Different route and time.</strong><p>{analysis.catalystStatement}</p></div>
          </>:<div className="energy-error-card"><span>Why the graph is blocked</span>{analysis.errors.map((error)=><p key={error}>{error}</p>)}</div>}
        </article>

        <section className="kinetic-panel"><div className="energy-panel-heading"><span>First-order kinetic race</span><strong>Same reaction, different barrier</strong></div><KineticRace analysis={analysis} observationFraction={observationFraction} onObservationChange={setObservationFraction}/></section>

        <aside className="energy-passport"><div className="energy-panel-heading"><span>Model passport</span><strong>{passport.name}</strong></div><div className="energy-passport-verdict"><i/>{passport.resultKind}</div><p>{passport.inputProvenance}</p><div className="energy-passport-group"><span>Included</span><div>{passport.includes.map((item)=><b key={item}>{item}</b>)}</div></div><div className="energy-passport-group excluded"><span>Not included</span><div>{passport.excludes.map((item)=><b key={item}>{item}</b>)}</div></div><p>{passport.dataStatement}</p><div className="energy-equations"><span>Equations in use</span><code>{thermo.equation.expression}</code>{analysis.status==='valid'&&<code>{analysis.kinetics.equation.expression}</code>}</div><div className="energy-sources"><span>Terminology reference</span>{passport.sources.map((sourceId)=>{const source=SCIENCE_SOURCES[sourceId];return <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><strong>{source.name}</strong><small>{source.role}</small><b aria-hidden="true">↗</b></a>;})}</div></aside>
      </div>
    </section>
  );
}
