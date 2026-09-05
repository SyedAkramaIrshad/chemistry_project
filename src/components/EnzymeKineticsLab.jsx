import {useMemo,useState} from 'react';
import {analyzeEnzymeKinetics} from '../chemistry/enzymeKinetics.js';
import {MODEL_PASSPORTS,SCIENCE_SOURCES} from '../data/scienceSources.js';

const ENZYME_PRESETS=[
  {id:'half',name:'Half saturation',note:'No inhibitor · [S] equals KM',kcatPerS:120,enzymeNanoM:100,kmMicroM:50,substrateMicroM:50,inhibitorMicroM:40,kicMicroM:20,kiuMicroM:20,inhibitionMode:'none'},
  {id:'competitive',name:'Competitive challenge',note:'Same limiting rate · larger apparent KM',kcatPerS:120,enzymeNanoM:100,kmMicroM:50,substrateMicroM:50,inhibitorMicroM:40,kicMicroM:20,kiuMicroM:20,inhibitionMode:'competitive'},
  {id:'uncompetitive',name:'Uncompetitive trap',note:'Both apparent V and KM decrease',kcatPerS:120,enzymeNanoM:100,kmMicroM:50,substrateMicroM:50,inhibitorMicroM:40,kicMicroM:20,kiuMicroM:20,inhibitionMode:'uncompetitive'},
  {id:'pure',name:'Pure non-competitive',note:'Equal Kic and Kiu · special mixed case',kcatPerS:120,enzymeNanoM:100,kmMicroM:50,substrateMicroM:50,inhibitorMicroM:40,kicMicroM:20,kiuMicroM:20,inhibitionMode:'mixed'},
  {id:'mixed',name:'Asymmetric mixed',note:'Both components · unequal constants',kcatPerS:120,enzymeNanoM:100,kmMicroM:50,substrateMicroM:50,inhibitorMicroM:40,kicMicroM:15,kiuMicroM:60,inhibitionMode:'mixed'},
];

const RATE={width:820,height:380,left:70,right:785,top:31,bottom:307};
const PROGRESS={width:780,height:318,left:63,right:748,top:27,bottom:250};

function clamp(value,minimum,maximum){return Math.max(minimum,Math.min(maximum,value));}
function finiteInput(setter,minimum,maximum){return(event)=>{const value=event.target.valueAsNumber;if(Number.isFinite(value))setter(clamp(value,minimum,maximum));};}
function scientific(value,digits=2){if(value===0)return'0';if(Math.abs(value)>=1e4||Math.abs(value)<1e-2)return value.toExponential(digits);return value.toFixed(digits);}
function formatTime(seconds){if(seconds<1e-3)return`${(seconds*1e6).toFixed(1)} µs`;if(seconds<1)return`${(seconds*1e3).toFixed(1)} ms`;if(seconds<120)return`${seconds.toFixed(2)} s`;return`${(seconds/60).toFixed(2)} min`;}
function pathFor(points,x,y,xKey,yKey){return points.map((point,index)=>`${index?'L':'M'} ${x(point[xKey]).toFixed(2)} ${y(point[yKey]).toFixed(2)}`).join(' ');}

function allocateWeights(weights,total=40){
  const entries=[['free',weights.freeTerm],['competitive',weights.competitiveTerm],['productive',weights.productiveTerm],['uncompetitive',weights.uncompetitiveTerm]];
  const allocated=entries.map(([key,value])=>({key,value,raw:value*total,count:Math.floor(value*total)}));
  let remaining=total-allocated.reduce((sum,item)=>sum+item.count,0);
  allocated.sort((a,b)=>(b.raw-b.count)-(a.raw-a.count));
  for(let index=0;index<allocated.length&&remaining>0;index+=1,remaining-=1)allocated[index].count+=1;
  return allocated.sort((a,b)=>entries.findIndex(([key])=>key===a.key)-entries.findIndex(([key])=>key===b.key));
}

function EnzymeCycle({analysis}){
  const allocations=allocateWeights(analysis.weights);
  const nodes=allocations.flatMap((item)=>Array.from({length:item.count},(_,index)=>({key:`${item.key}-${index}`,tone:item.key})));
  const competitive=analysis.apparentFingerprint.competitiveComponent,uncompetitive=analysis.apparentFingerprint.uncompetitiveComponent;
  const duration=clamp(5-analysis.selected.rateFractionOfOwnLimit*3,1.7,5);
  return <div className="enzyme-cycle" style={{'--cycle-duration':`${duration}s`}}>
    <svg className="enzyme-cycle-svg" viewBox="0 0 800 335" role="img" aria-label={`Enzyme cycle for ${analysis.selected.label}. Current rate ${analysis.selected.currentRateMicroMPerS.toFixed(2)} micromolar per second.`}>
      <title>One-substrate enzyme traffic loop</title><desc>The diagram links free enzyme and substrate to a productive complex and product. Inhibitor contacts show which operational denominator components are active.</desc>
      <defs><marker id="enzymeArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6c91a8"/></marker><filter id="enzymeGlow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <path className="cycle-track" d="M 155 176 C 255 62, 458 62, 566 176 C 618 232, 545 282, 405 282 C 266 282, 142 244, 155 176"/>
      <path className="cycle-arrow" d="M 248 100 C 296 70, 348 62, 395 70" markerEnd="url(#enzymeArrow)"/><path className="cycle-arrow" d="M 493 95 C 535 113, 558 135, 570 161" markerEnd="url(#enzymeArrow)"/><path className="cycle-arrow" d="M 530 258 C 465 287, 351 292, 270 267" markerEnd="url(#enzymeArrow)"/>
      <g className="enzyme-state free" transform="translate(145 170)"><path d="M-54,-5 C-57,-42 -26,-66 8,-55 C35,-72 66,-48 59,-18 C78,8 57,43 27,42 C7,67 -32,57 -38,29 C-66,22 -73,-3 -54,-5Z"/><path className="active-pocket" d="M25,-21 C5,-8 5,14 28,24"/><text x="0" y="5" textAnchor="middle">E</text></g>
      <g className="substrate-state" transform="translate(255 112)"><path d="M0,-24 L22,-12 L22,12 L0,24 L-22,12 L-22,-12Z"/><text x="0" y="5" textAnchor="middle">S</text></g>
      <text className="cycle-plus" x="206" y="179">+</text>
      <g className="enzyme-state complex" transform="translate(410 91)"><path d="M-54,-5 C-57,-42 -26,-66 8,-55 C35,-72 66,-48 59,-18 C78,8 57,43 27,42 C7,67 -32,57 -38,29 C-66,22 -73,-3 -54,-5Z"/><path className="active-pocket" d="M25,-21 C5,-8 5,14 28,24"/><path className="bound-substrate" d="M29,-15 L43,-7 L43,9 L29,17 L15,9 L15,-7Z"/><text x="-5" y="5" textAnchor="middle">ES</text></g>
      <g className="enzyme-state product" transform="translate(574 184)"><path d="M-54,-5 C-57,-42 -26,-66 8,-55 C35,-72 66,-48 59,-18 C78,8 57,43 27,42 C7,67 -32,57 -38,29 C-66,22 -73,-3 -54,-5Z"/><path className="active-pocket" d="M25,-21 C5,-8 5,14 28,24"/><text x="-6" y="5" textAnchor="middle">E</text></g>
      <g className="product-state" transform="translate(677 184)"><circle r="22"/><text x="0" y="5" textAnchor="middle">P</text></g><text className="cycle-plus" x="626" y="190">+</text>
      {competitive&&<g className="inhibitor-contact competitive" transform="translate(96 84)"><path d="M0,-22 L22,18 L-22,18Z"/><text x="0" y="9" textAnchor="middle">I</text><path className="contact-line" d="M27 20 L49 49"/></g>}
      {uncompetitive&&<g className="inhibitor-contact uncompetitive" transform="translate(485 32)"><path d="M0,-22 L22,18 L-22,18Z"/><text x="0" y="9" textAnchor="middle">I</text><path className="contact-line" d="M-20 21 L-38 36"/></g>}
      <g className="flowing-substrates">{[0,1,2,3].map((index)=><circle key={index} style={{'--particle-delay':`${-index*.55}s`}} r="5"><animateMotion dur={`${duration}s`} repeatCount="indefinite" begin={`${-index*.55}s`} path="M155 176 C255 62 458 62 566 176"/></circle>)}</g>
      <text className="cycle-caption" x="145" y="256" textAnchor="middle">free term</text><text className="cycle-caption" x="410" y="175" textAnchor="middle">productive complex</text><text className="cycle-caption" x="625" y="257" textAnchor="middle">enzyme returns</text>
      <g className="cycle-rate-readout" transform="translate(320 212)"><text x="80" y="0" textAnchor="middle">CURRENT INITIAL RATE</text><text className="value" x="80" y="28" textAnchor="middle">{analysis.selected.currentRateMicroMPerS.toFixed(3)}</text><text x="80" y="46" textAnchor="middle">µmol L⁻¹ s⁻¹</text></g>
    </svg>
    <div className="weight-field"><div className="weight-heading"><span>Normalized denominator terms</span><strong>40 equation-weight markers</strong></div><div className="weight-nodes">{nodes.map((node)=><i className={node.tone} key={node.key}/>)}</div><div className="weight-key">{allocations.map((item)=><span key={item.key}><i className={item.key}/><b>{item.key}</b><strong>{(item.value*100).toFixed(1)}%</strong></span>)}</div><p>{analysis.weights.statement}</p></div>
  </div>;
}

function RatePlot({analysis}){
  const xMax=analysis.curves.maximumSubstrateMicroM,yMax=analysis.uninhibited.limitingRateMicroMPerS*1.12;
  const x=(value)=>RATE.left+value/xMax*(RATE.right-RATE.left),y=(value)=>RATE.top+(1-value/yMax)*(RATE.bottom-RATE.top);
  const baseline=pathFor(analysis.curves.uninhibited,x,y,'substrateMicroM','rateMicroMPerS'),selected=pathFor(analysis.curves.selected,x,y,'substrateMicroM','rateMicroMPerS');
  const currentX=x(analysis.params.substrateMicroM),currentY=y(analysis.selected.currentRateMicroMPerS),kmX=x(analysis.params.kmMicroM),appKmX=x(analysis.selected.apparentKmMicroM);
  return <div className="enzyme-rate-wrap"><svg className="enzyme-rate-plot" viewBox={`0 0 ${RATE.width} ${RATE.height}`} role="img" aria-label={`Michaelis-Menten rate curves. Current substrate ${analysis.params.substrateMicroM} micromolar, current rate ${analysis.selected.currentRateMicroMPerS.toFixed(3)}, apparent limiting rate ${analysis.selected.apparentLimitingRateMicroMPerS.toFixed(3)}, apparent KM ${analysis.selected.apparentKmMicroM.toFixed(3)} micromolar.`}>
    <title>Uninhibited and selected enzyme-rate curves</title>
    {[0,.25,.5,.75,1].map((fraction)=><g key={`y${fraction}`}><line className="enzyme-gridline" x1={RATE.left} x2={RATE.right} y1={y(yMax*fraction)} y2={y(yMax*fraction)}/><text className="enzyme-tick" x={RATE.left-10} y={y(yMax*fraction)+4} textAnchor="end">{(yMax*fraction).toFixed(1)}</text></g>)}
    {[0,.25,.5,.75,1].map((fraction)=><g key={`x${fraction}`}><line className="enzyme-gridline vertical" x1={x(xMax*fraction)} x2={x(xMax*fraction)} y1={RATE.top} y2={RATE.bottom}/><text className="enzyme-tick" x={x(xMax*fraction)} y={RATE.bottom+21} textAnchor="middle">{Math.round(xMax*fraction)}</text></g>)}
    <line className="limit-guide baseline" x1={RATE.left} x2={RATE.right} y1={y(analysis.uninhibited.limitingRateMicroMPerS)} y2={y(analysis.uninhibited.limitingRateMicroMPerS)}/><text className="limit-label baseline" x={RATE.right-4} y={y(analysis.uninhibited.limitingRateMicroMPerS)-7} textAnchor="end">V {analysis.uninhibited.limitingRateMicroMPerS.toFixed(2)}</text>
    {analysis.params.inhibitionMode!=='none'&&<><line className="limit-guide selected" x1={RATE.left} x2={RATE.right} y1={y(analysis.selected.apparentLimitingRateMicroMPerS)} y2={y(analysis.selected.apparentLimitingRateMicroMPerS)}/><text className="limit-label selected" x={RATE.right-4} y={y(analysis.selected.apparentLimitingRateMicroMPerS)-7} textAnchor="end">Vapp {analysis.selected.apparentLimitingRateMicroMPerS.toFixed(2)}</text></>}
    <path className="enzyme-rate-line baseline" d={baseline}/><path className="enzyme-rate-line selected" d={selected}/>
    <line className="km-guide baseline" x1={kmX} x2={kmX} y1={RATE.bottom} y2={y(analysis.uninhibited.limitingRateMicroMPerS/2)}/><circle className="km-point baseline" cx={kmX} cy={y(analysis.uninhibited.limitingRateMicroMPerS/2)} r="5"/><text className="km-label baseline" x={kmX} y={RATE.bottom-8} textAnchor="middle">KM {analysis.params.kmMicroM.toFixed(1)}</text>
    {analysis.params.inhibitionMode!=='none'&&<><line className="km-guide selected" x1={appKmX} x2={appKmX} y1={RATE.bottom} y2={y(analysis.selected.apparentLimitingRateMicroMPerS/2)}/><circle className="km-point selected" cx={appKmX} cy={y(analysis.selected.apparentLimitingRateMicroMPerS/2)} r="5"/><text className="km-label selected" x={appKmX} y={RATE.bottom-23} textAnchor="middle">KM,app {analysis.selected.apparentKmMicroM.toFixed(1)}</text></>}
    <line className="current-guide" x1={currentX} x2={currentX} y1={currentY} y2={RATE.bottom}/><circle className="current-rate-point" cx={currentX} cy={currentY} r="7"/><text className="current-rate-label" x={currentX} y={currentY-13} textAnchor={currentX>RATE.right-80?'end':'middle'}>now · {analysis.selected.currentRateMicroMPerS.toFixed(2)}</text>
    <text className="enzyme-axis" x="16" y={RATE.height/2} transform={`rotate(-90 16 ${RATE.height/2})`} textAnchor="middle">initial rate / µmol L⁻¹ s⁻¹</text><text className="enzyme-axis" x={(RATE.left+RATE.right)/2} y={RATE.height-9} textAnchor="middle">substrate / µmol L⁻¹</text>
  </svg><div className="enzyme-plot-key"><span><i className="baseline"/>no inhibitor</span><span><i className="selected"/>selected model</span><span><i className="point"/>current substrate</span></div></div>;
}

function ProgressPlot({analysis}){
  const maximumTime=Math.max(analysis.progress.maximumTimeS,1e-9),maximumConcentration=Math.max(analysis.params.substrateMicroM,1);
  const x=(value)=>PROGRESS.left+value/maximumTime*(PROGRESS.right-PROGRESS.left),y=(value)=>PROGRESS.top+(1-value/maximumConcentration)*(PROGRESS.bottom-PROGRESS.top);
  const selectedS=pathFor(analysis.progress.selected,x,y,'timeS','substrateMicroM'),selectedP=pathFor(analysis.progress.selected,x,y,'timeS','productMicroM'),baseP=pathFor(analysis.progress.uninhibited,x,y,'timeS','productMicroM');
  return <div className="enzyme-progress-wrap"><svg className="enzyme-progress-plot" viewBox={`0 0 ${PROGRESS.width} ${PROGRESS.height}`} role="img" aria-label={`Substrate depletion and product formation over ${formatTime(maximumTime)} in the displayed irreversible quasi-steady model.`}>
    <title>Selected substrate depletion, selected product formation, and uninhibited product formation</title>
    {[0,.25,.5,.75,1].map((fraction)=><g key={`p${fraction}`}><line className="enzyme-gridline" x1={PROGRESS.left} x2={PROGRESS.right} y1={y(maximumConcentration*fraction)} y2={y(maximumConcentration*fraction)}/><text className="enzyme-tick" x={PROGRESS.left-9} y={y(maximumConcentration*fraction)+4} textAnchor="end">{(maximumConcentration*fraction).toFixed(0)}</text></g>)}
    {[0,.5,1].map((fraction)=><g key={`t${fraction}`}><line className="enzyme-gridline vertical" x1={x(maximumTime*fraction)} x2={x(maximumTime*fraction)} y1={PROGRESS.top} y2={PROGRESS.bottom}/><text className="enzyme-tick" x={x(maximumTime*fraction)} y={PROGRESS.bottom+21} textAnchor="middle">{formatTime(maximumTime*fraction)}</text></g>)}
    <path className="progress-line substrate" d={selectedS}/><path className="progress-line product" d={selectedP}/><path className="progress-line baseline-product" d={baseP}/>
    <text className="enzyme-axis" x="16" y={PROGRESS.height/2} transform={`rotate(-90 16 ${PROGRESS.height/2})`} textAnchor="middle">concentration / µmol L⁻¹</text><text className="enzyme-axis" x={(PROGRESS.left+PROGRESS.right)/2} y={PROGRESS.height-8} textAnchor="middle">time</text>
  </svg><div className="enzyme-plot-key"><span><i className="substrate"/>selected substrate</span><span><i className="product"/>selected product</span><span><i className="baseline-product"/>product without inhibitor</span></div></div>;
}

function FingerprintPanel({analysis}){
  const modes=[['none','None','V same · KM same'],['competitive','Competitive','V same · KM rises'],['uncompetitive','Uncompetitive','V and KM fall together'],['mixed','Mixed','Both components can change']];
  return <aside className="enzyme-fingerprint"><div className="enzyme-panel-heading"><span>Operational fingerprint</span><strong>{analysis.selected.label}</strong></div><div className="fingerprint-modes">{modes.map(([id,name,note])=><div className={analysis.params.inhibitionMode===id?'active':''} key={id}><i/><span><strong>{name}</strong><small>{note}</small></span></div>)}</div><div className="fingerprint-ratios"><div><span>Vapp / V</span><strong>{analysis.apparentFingerprint.limitingRateRatio.toFixed(3)}</strong></div><div><span>KM,app / KM</span><strong>{analysis.apparentFingerprint.kmRatio.toFixed(3)}</strong></div><div><span>Degree inhibited now</span><strong>{(analysis.selected.degreeOfInhibition*100).toFixed(1)}%</strong></div></div><div className="noncompetitive-note"><span>Terminology guardrail</span><p>“Pure non-competitive” is shown only when mixed inhibition has equal Kic and Kiu. Unequal constants remain mixed.</p></div></aside>;
}

export default function EnzymeKineticsLab(){
  const [kcatPerS,setKcat]=useState(120),[enzymeNanoM,setEnzyme]=useState(100),[kmMicroM,setKm]=useState(50),[substrateMicroM,setSubstrate]=useState(50),[inhibitorMicroM,setInhibitor]=useState(40),[kicMicroM,setKic]=useState(20),[kiuMicroM,setKiu]=useState(20),[inhibitionMode,setMode]=useState('none');
  const params=useMemo(()=>({kcatPerS,enzymeNanoM,kmMicroM,substrateMicroM,inhibitorMicroM,kicMicroM,kiuMicroM,inhibitionMode}),[kcatPerS,enzymeNanoM,kmMicroM,substrateMicroM,inhibitorMicroM,kicMicroM,kiuMicroM,inhibitionMode]);
  const analysis=useMemo(()=>analyzeEnzymeKinetics(params),[params]);
  const passport=MODEL_PASSPORTS.enzymeKinetics;
  const applyPreset=(preset)=>{setKcat(preset.kcatPerS);setEnzyme(preset.enzymeNanoM);setKm(preset.kmMicroM);setSubstrate(preset.substrateMicroM);setInhibitor(preset.inhibitorMicroM);setKic(preset.kicMicroM);setKiu(preset.kiuMicroM);setMode(preset.inhibitionMode);};
  const matchingPreset=ENZYME_PRESETS.find((preset)=>Object.entries(preset).every(([key,value])=>['id','name','note'].includes(key)||params[key]===value));
  return <section className="enzyme-lab" id="enzymeLab" aria-labelledby="enzymeLabTitle">
    <header className="enzyme-header"><div><p className="section-code">24 / Biochemical kinetics</p><h2 id="enzymeLabTitle">The enzyme has a ceiling. Substrate only approaches it.</h2><p>Change substrate, active enzyme, and reversible inhibitor components. Follow one parameter choice through the catalytic loop, saturation curve, and product-forming race.</p></div><div className="enzyme-condition-stamp"><span>Operational model</span><strong>One substrate · steady-state · linear inhibition</strong><small>Computed locally · learner parameters</small></div></header>
    <div className="enzyme-bench">
      <aside className="enzyme-controls"><div className="enzyme-panel-heading"><span>Kinetic setup</span><strong>Shape the rate law</strong></div><div className="enzyme-presets">{ENZYME_PRESETS.map((preset)=><button type="button" key={preset.id} className={matchingPreset?.id===preset.id?'active':''} onClick={()=>applyPreset(preset)}><strong>{preset.name}</strong><small>{preset.note}</small></button>)}</div><div className="inhibition-modes" role="group" aria-label="Inhibition mode">{[['none','None'],['competitive','Competitive'],['uncompetitive','Uncompetitive'],['mixed','Mixed']].map(([id,label])=><button type="button" key={id} className={inhibitionMode===id?'active':''} aria-pressed={inhibitionMode===id} onClick={()=>setMode(id)}>{label}</button>)}</div><div className="enzyme-input-grid">
        <label><span>kcat</span><div><input aria-label="Catalytic constant" type="number" min="0.1" max="100000" step="10" value={kcatPerS} onChange={finiteInput(setKcat,.1,100000)}/><b>s⁻¹</b></div></label>
        <label><span>Active enzyme</span><div><input aria-label="Active enzyme concentration" type="number" min="1" max="100000" step="10" value={enzymeNanoM} onChange={finiteInput(setEnzyme,1,100000)}/><b>nM</b></div></label>
        <label><span>KM</span><div><input aria-label="Michaelis constant" type="number" min="0.1" max="100000" step="5" value={kmMicroM} onChange={finiteInput(setKm,.1,100000)}/><b>µM</b></div></label>
        <label><span>Substrate</span><div><input aria-label="Substrate concentration" type="number" min="0" max="1000000" step="5" value={substrateMicroM} onChange={finiteInput(setSubstrate,0,1000000)}/><b>µM</b></div></label>
        <label><span>Inhibitor</span><div><input aria-label="Inhibitor concentration" type="number" min="0" max="1000000" step="5" value={inhibitorMicroM} onChange={finiteInput(setInhibitor,0,1000000)}/><b>µM</b></div></label>
        <label><span>Kic</span><div><input aria-label="Competitive inhibition constant" type="number" min="0.1" max="1000000" step="5" value={kicMicroM} onChange={finiteInput(setKic,.1,1000000)}/><b>µM</b></div></label>
        <label><span>Kiu</span><div><input aria-label="Uncompetitive inhibition constant" type="number" min="0.1" max="1000000" step="5" value={kiuMicroM} onChange={finiteInput(setKiu,.1,1000000)}/><b>µM</b></div></label>
      </div><div className="substrate-control"><div><span>Substrate cursor</span><strong>{substrateMicroM.toFixed(1)} µM</strong></div><input aria-label="Substrate concentration slider" type="range" min="0" max={Math.max(400,kmMicroM*8)} step="1" value={Math.min(substrateMicroM,Math.max(400,kmMicroM*8))} onChange={finiteInput(setSubstrate,0,Math.max(400,kmMicroM*8))}/><div><button type="button" onClick={()=>setSubstrate(kmMicroM/2)}>½ KM</button><button type="button" onClick={()=>setSubstrate(kmMicroM)}>KM</button><button type="button" onClick={()=>setSubstrate(kmMicroM*4)}>4 KM</button></div></div>{analysis.assumptionWarnings.map((warning)=><div className="enzyme-assumption-warning" key={warning}>{warning}</div>)}</aside>

      <section className="enzyme-cycle-stage"><div className="enzyme-stage-topline"><span><i/>live catalytic traffic</span><b>{analysis.selected.label}</b></div><EnzymeCycle analysis={analysis}/></section>

      <article className="enzyme-verdicts" aria-live="polite"><div className="enzyme-result-kind"><i/>{analysis.resultKind}</div><section className="enzyme-rate-card"><span>Current initial rate</span><h3>How fast now?</h3><div><strong>{scientific(analysis.selected.currentRateMicroMPerS,3)}</strong><b>µmol L⁻¹ s⁻¹</b></div><p>{(analysis.selected.rateFractionOfOwnLimit*100).toFixed(1)}% of the selected limiting rate</p><dl><div><dt>without inhibitor</dt><dd>{scientific(analysis.uninhibited.currentRateMicroMPerS,3)}</dd></div><div><dt>degree inhibited</dt><dd>{(analysis.selected.degreeOfInhibition*100).toFixed(1)}%</dd></div></dl></section><section className="enzyme-limit-card"><span>High-substrate limit</span><h3>What ceiling is approached?</h3><div><strong>{scientific(analysis.selected.apparentLimitingRateMicroMPerS,3)}</strong><b>µmol L⁻¹ s⁻¹</b></div><p>V = kcat[E]T; finite substrate approaches this asymptote.</p><dl><div><dt>uninhibited V</dt><dd>{scientific(analysis.uninhibited.limitingRateMicroMPerS,3)}</dd></div><div><dt>apparent kcat</dt><dd>{scientific(analysis.selected.apparentKcatPerS,3)} s⁻¹</dd></div></dl></section><section className="enzyme-km-card"><span>Half-limit concentration</span><h3>Where is the midpoint?</h3><div><strong>{scientific(analysis.selected.apparentKmMicroM,3)}</strong><b>µmol L⁻¹</b></div><p>At this substrate, the selected curve is at half its own limiting rate.</p><dl><div><dt>input KM</dt><dd>{scientific(kmMicroM,3)} µM</dd></div><div><dt>effective kcat/KM</dt><dd>{scientific(analysis.selected.effectiveLowSubstrateEfficiencyMInvS,2)} M⁻¹s⁻¹</dd></div></dl></section><div className="km-guardrail"><strong>KM is not automatically binding affinity.</strong><p>Many mechanisms produce the same rate law. Treat KM as the operational parameter of this equation unless independent evidence connects it to a dissociation constant.</p></div></article>

      <section className="enzyme-rate-panel"><div className="enzyme-panel-heading"><span>Initial-rate field</span><strong>Approach the limit without crossing it</strong></div><RatePlot analysis={analysis}/></section>
      <section className="enzyme-progress-panel"><div className="enzyme-panel-heading"><span>Substrate-depletion race</span><strong>Same model beyond the first instant</strong></div><ProgressPlot analysis={analysis}/><p>Progress integration keeps active enzyme and parameters constant and omits reverse reaction and product inhibition.</p></section>
      <FingerprintPanel analysis={analysis}/>

      <aside className="enzyme-passport"><div className="enzyme-panel-heading"><span>Model passport</span><strong>{passport.name}</strong></div><div className="enzyme-passport-verdict"><i/>{passport.resultKind}</div><p>{passport.inputProvenance}</p><div className="enzyme-passport-group"><span>Included</span><div>{passport.includes.map((item)=><b key={item}>{item}</b>)}</div></div><div className="enzyme-passport-group excluded"><span>Not included</span><div>{passport.excludes.map((item)=><b key={item}>{item}</b>)}</div></div><p>{passport.dataStatement}</p><div className="enzyme-equations"><span>Equations in use</span><code>{analysis.equations.rate}</code><code>{analysis.equations.factors}</code><code>{analysis.equations.limit}</code></div><div className="enzyme-sources"><span>Reference basis</span>{passport.sources.map((sourceId)=>{const source=SCIENCE_SOURCES[sourceId];return<a key={source.id} href={source.url} target="_blank" rel="noreferrer"><strong>{source.name}</strong><small>{source.role}</small><b aria-hidden="true">↗</b></a>;})}</div></aside>
    </div>
  </section>;
}
