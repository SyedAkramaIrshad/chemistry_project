import {useMemo,useState} from 'react';
import {analyzeSpectrophotometry} from '../chemistry/spectrophotometry.js';
import {MODEL_PASSPORTS,SCIENCE_SOURCES} from '../data/scienceSources.js';

const SPECTRO_PRESETS=[
  {id:'ideal',name:'Peak calibration',note:'Ideal instrument at lambda max',lambdaMaxNm:520,bandWidthNm:80,epsilonMax:18000,pathLengthCm:1,measurementWavelengthNm:520,maxStandardMicroM:80,unknownMicroM:35,strayLightPercent:0},
  {id:'off-peak',name:'Off-peak sensitivity',note:'One full band width away',lambdaMaxNm:520,bandWidthNm:80,epsilonMax:18000,pathLengthCm:1,measurementWavelengthNm:600,maxStandardMicroM:80,unknownMicroM:35,strayLightPercent:0},
  {id:'stray',name:'Stray-light compression',note:'High absorbance bends downward',lambdaMaxNm:520,bandWidthNm:80,epsilonMax:24000,pathLengthCm:1,measurementWavelengthNm:520,maxStandardMicroM:100,unknownMicroM:45,strayLightPercent:1},
  {id:'extrapolate',name:'Unknown outside range',note:'The estimate must extrapolate',lambdaMaxNm:560,bandWidthNm:95,epsilonMax:15000,pathLengthCm:1,measurementWavelengthNm:560,maxStandardMicroM:60,unknownMicroM:95,strayLightPercent:0},
];

const SPECTRUM={width:760,height:294,left:62,right:730,top:28,bottom:230};
const CALIBRATION={width:800,height:382,left:66,right:764,top:28,bottom:314};

function clamp(value,minimum,maximum){return Math.max(minimum,Math.min(maximum,value));}
function finiteInput(setter,minimum,maximum){return(event)=>{const value=event.target.valueAsNumber;if(Number.isFinite(value))setter(clamp(value,minimum,maximum));};}
function fixed(value,digits=3){return Number(value).toFixed(digits);}

function wavelengthColor(wavelength){
  const w=clamp(wavelength,380,780);let red=0,green=0,blue=0;
  if(w<440){red=-(w-440)/60;blue=1;}else if(w<490){green=(w-440)/50;blue=1;}else if(w<510){green=1;blue=-(w-510)/20;}else if(w<580){red=(w-510)/70;green=1;}else if(w<645){red=1;green=-(w-645)/65;}else{red=1;}
  const factor=w<420?.35+.65*(w-380)/40:w>700?.35+.65*(780-w)/80:1;
  const gamma=(channel)=>Math.round(255*(channel*factor)**.8);
  return `rgb(${gamma(red)}, ${gamma(green)}, ${gamma(blue)})`;
}

function svgPath(points,x,y){return points.map((point,index)=>`${index?'L':'M'} ${x(point).toFixed(2)} ${y(point).toFixed(2)}`).join(' ');}

function SpectrumPlot({analysis,beamColor}){
  const spectrum=analysis.band.spectrum;
  const x=(point)=>SPECTRUM.left+(point.wavelengthNm-380)/340*(SPECTRUM.right-SPECTRUM.left);
  const y=(point)=>SPECTRUM.top+(1-point.relativeEpsilon)*(SPECTRUM.bottom-SPECTRUM.top);
  const selectedX=SPECTRUM.left+(analysis.params.measurementWavelengthNm-380)/340*(SPECTRUM.right-SPECTRUM.left);
  const selectedY=SPECTRUM.top+(1-analysis.band.relativeSensitivity)*(SPECTRUM.bottom-SPECTRUM.top);
  const curve=svgPath(spectrum,x,y);
  const area=`M ${SPECTRUM.left} ${SPECTRUM.bottom} ${curve.replace(/^M/, 'L')} L ${SPECTRUM.right} ${SPECTRUM.bottom} Z`;
  const halfLeft=clamp(analysis.params.lambdaMaxNm-analysis.params.bandWidthNm/2,380,720);
  const halfRight=clamp(analysis.params.lambdaMaxNm+analysis.params.bandWidthNm/2,380,720);
  const xNm=(wavelength)=>SPECTRUM.left+(wavelength-380)/340*(SPECTRUM.right-SPECTRUM.left);
  return <div className="spectrum-plot-wrap" style={{'--beam-color':beamColor}}>
    <svg className="spectrum-plot" viewBox={`0 0 ${SPECTRUM.width} ${SPECTRUM.height}`} role="img" aria-label={`Illustrative Gaussian absorption band with maximum at ${analysis.params.lambdaMaxNm} nanometres. Measurement wavelength ${analysis.params.measurementWavelengthNm} nanometres gives ${Math.round(analysis.band.relativeSensitivity*100)} percent of maximum sensitivity.`}>
      <title>Illustrative wavelength-dependent molar absorption coefficient</title>
      <desc>This is a mathematical teaching band, not a measured spectrum or compound identification.</desc>
      <defs><linearGradient id="spectrumArea" x1="0" x2="1"><stop offset="0" stopColor="#7a5cff"/><stop offset=".22" stopColor="#49b9ff"/><stop offset=".42" stopColor="#42e5bd"/><stop offset=".63" stopColor="#ffe064"/><stop offset=".82" stopColor="#ff8a5f"/><stop offset="1" stopColor="#ec4b69"/></linearGradient></defs>
      {[0,.25,.5,.75,1].map((fraction)=><g key={fraction}><line className="spectro-gridline" x1={SPECTRUM.left} x2={SPECTRUM.right} y1={SPECTRUM.top+(1-fraction)*(SPECTRUM.bottom-SPECTRUM.top)} y2={SPECTRUM.top+(1-fraction)*(SPECTRUM.bottom-SPECTRUM.top)}/><text className="spectro-tick" x={SPECTRUM.left-10} y={SPECTRUM.top+(1-fraction)*(SPECTRUM.bottom-SPECTRUM.top)+4} textAnchor="end">{Math.round(fraction*100)}%</text></g>)}
      {[400,500,600,700].map((wavelength)=><g key={wavelength}><line className="spectro-gridline vertical" x1={xNm(wavelength)} x2={xNm(wavelength)} y1={SPECTRUM.top} y2={SPECTRUM.bottom}/><text className="spectro-tick" x={xNm(wavelength)} y={SPECTRUM.bottom+20} textAnchor="middle">{wavelength}</text></g>)}
      <path className="spectrum-area" d={area}/><path className="spectrum-line" d={curve}/>
      <line className="fwhm-line" x1={xNm(halfLeft)} x2={xNm(halfRight)} y1={SPECTRUM.top+(SPECTRUM.bottom-SPECTRUM.top)/2} y2={SPECTRUM.top+(SPECTRUM.bottom-SPECTRUM.top)/2}/>
      <text className="fwhm-label" x={(xNm(halfLeft)+xNm(halfRight))/2} y={SPECTRUM.top+(SPECTRUM.bottom-SPECTRUM.top)/2-8} textAnchor="middle">FWHM {analysis.params.bandWidthNm} nm</text>
      <line className="wavelength-cursor" x1={selectedX} x2={selectedX} y1={SPECTRUM.top-5} y2={SPECTRUM.bottom}/><circle className="wavelength-point" cx={selectedX} cy={selectedY} r="7"/>
      <text className="wavelength-label" x={selectedX} y={Math.max(SPECTRUM.top+14,selectedY-13)} textAnchor={selectedX>SPECTRUM.right-70?'end':selectedX<SPECTRUM.left+70?'start':'middle'}>{analysis.params.measurementWavelengthNm} nm</text>
      <text className="spectro-axis" x="16" y={SPECTRUM.height/2} transform={`rotate(-90 16 ${SPECTRUM.height/2})`} textAnchor="middle">relative molar absorption coefficient</text>
      <text className="spectro-axis" x={(SPECTRUM.left+SPECTRUM.right)/2} y={SPECTRUM.height-10} textAnchor="middle">wavelength / nm</text>
    </svg>
    <div className="spectrum-disclaimer"><i/>Illustrative Gaussian band · no compound identity</div>
  </div>;
}

function CalibrationPlot({analysis}){
  const standards=analysis.calibration.standards,response=analysis.calibration.responseCurve,fit=analysis.calibration.fitLine,unknown=analysis.unknown;
  const xMaximum=Math.max(analysis.params.maxStandardMicroM,unknown.trueMicroM,unknown.estimatedMicroM)*1.12||1;
  const yMaximum=Math.max(.2,...standards.flatMap((point)=>[point.trueAbsorbance,point.observedAbsorbance,point.predictedAbsorbance]),unknown.observedAbsorbance)*1.13;
  const x=(concentration)=>CALIBRATION.left+concentration/xMaximum*(CALIBRATION.right-CALIBRATION.left);
  const y=(absorbance)=>CALIBRATION.top+(1-absorbance/yMaximum)*(CALIBRATION.bottom-CALIBRATION.top);
  const truePath=svgPath(response,(point)=>x(point.concentrationMicroM),(point)=>y(point.trueAbsorbance));
  const observedPath=svgPath(response,(point)=>x(point.concentrationMicroM),(point)=>y(point.observedAbsorbance));
  const fitPath=svgPath(fit,(point)=>x(point.concentrationMicroM),(point)=>y(point.absorbance));
  const unknownX=x(unknown.estimatedMicroM),unknownY=y(unknown.observedAbsorbance);
  return <div className="calibration-plot-wrap">
    <svg className="calibration-plot" viewBox={`0 0 ${CALIBRATION.width} ${CALIBRATION.height}`} role="img" aria-label={`Calibration plot with six standards. Fitted slope ${analysis.calibration.regression.slope.toFixed(5)} absorbance per micromolar and R squared ${analysis.calibration.regression.rSquared.toFixed(5)}. Unknown estimate ${unknown.estimatedMicroM.toFixed(2)} micromolar.`}>
      <title>Observed standards, Beer-Lambert response, linear fit, residuals, and simulated unknown</title>
      {[0,.25,.5,.75,1].map((fraction)=><g key={`y${fraction}`}><line className="cal-gridline" x1={CALIBRATION.left} x2={CALIBRATION.right} y1={y(yMaximum*fraction)} y2={y(yMaximum*fraction)}/><text className="cal-tick" x={CALIBRATION.left-10} y={y(yMaximum*fraction)+4} textAnchor="end">{(yMaximum*fraction).toFixed(1)}</text></g>)}
      {[0,.25,.5,.75,1].map((fraction)=><g key={`x${fraction}`}><line className="cal-gridline vertical" x1={x(xMaximum*fraction)} x2={x(xMaximum*fraction)} y1={CALIBRATION.top} y2={CALIBRATION.bottom}/><text className="cal-tick" x={x(xMaximum*fraction)} y={CALIBRATION.bottom+22} textAnchor="middle">{Math.round(xMaximum*fraction)}</text></g>)}
      <path className="beer-response" d={truePath}/><path className="instrument-response" d={observedPath}/><path className="fit-response" d={fitPath}/>
      {standards.map((point,index)=><g key={point.concentrationMicroM}><line className="residual-stem" x1={x(point.concentrationMicroM)} x2={x(point.concentrationMicroM)} y1={y(point.predictedAbsorbance)} y2={y(point.observedAbsorbance)}/><circle className="standard-point" cx={x(point.concentrationMicroM)} cy={y(point.observedAbsorbance)} r="6"/><text className="standard-index" x={x(point.concentrationMicroM)} y={y(point.observedAbsorbance)-11} textAnchor="middle">S{index}</text></g>)}
      <line className="unknown-guide" x1={unknownX} x2={unknownX} y1={unknownY} y2={CALIBRATION.bottom}/><line className="unknown-guide" x1={CALIBRATION.left} x2={unknownX} y1={unknownY} y2={unknownY}/><path className="unknown-point" d={`M ${unknownX-8} ${unknownY} L ${unknownX+8} ${unknownY} M ${unknownX} ${unknownY-8} L ${unknownX} ${unknownY+8}`}/>
      <text className="unknown-label" x={unknownX} y={unknownY-14} textAnchor={unknownX>CALIBRATION.right-70?'end':'middle'}>unknown · {unknown.estimatedMicroM.toFixed(1)} µM</text>
      <text className="cal-axis" x="17" y={CALIBRATION.height/2} transform={`rotate(-90 17 ${CALIBRATION.height/2})`} textAnchor="middle">observed absorbance</text><text className="cal-axis" x={(CALIBRATION.left+CALIBRATION.right)/2} y={CALIBRATION.height-9} textAnchor="middle">concentration / µmol L⁻¹</text>
    </svg>
    <div className="calibration-key"><span><i className="beer"/>Beer-Lambert truth</span><span><i className="instrument"/>instrument response</span><span><i className="fit"/>OLS fit</span><span><i className="residual"/>residual</span></div>
  </div>;
}

function OpticalTrain({analysis,beamColor}){
  const transmitted=clamp(analysis.optics.unknownObservedTransmittance,.06,1);
  const fillStrength=clamp(analysis.unknown.observedAbsorbance/2.5,.08,.95);
  return <div className="optical-train" style={{'--beam-color':beamColor,'--transmitted':transmitted,'--fill-strength':fillStrength}}>
    <div className="lamp-module"><i/><span>source</span></div><div className="beam beam-before"/>
    <div className="mono-module"><i/><strong>{analysis.params.measurementWavelengthNm}</strong><small>nm</small><span>monochromator</span></div><div className="beam beam-selected"/>
    <div className="cuvette-module"><div><i/><b>?</b></div><span>{analysis.params.pathLengthCm.toFixed(1)} cm cuvette</span></div><div className="beam beam-after"/>
    <div className="detector-module"><i/><strong>{(analysis.optics.unknownObservedTransmittance*100).toFixed(1)}%</strong><span>T observed</span></div>
  </div>;
}

function StandardsRack({analysis,beamColor}){
  return <div className="standards-rack" style={{'--sample-color':beamColor}}>{analysis.calibration.standards.map((standard,index)=>{
    const fill=clamp(standard.observedAbsorbance/2.5,.04,.96);
    return <div className="standard-vial" key={standard.concentrationMicroM}><span>S{index}</span><i style={{'--vial-fill':fill}}><b/></i><strong>{standard.concentrationMicroM.toFixed(0)}</strong><small>µM</small></div>;
  })}</div>;
}

export default function SpectroscopyLab(){
  const [lambdaMaxNm,setLambdaMax]=useState(520),[bandWidthNm,setBandWidth]=useState(80),[epsilonMax,setEpsilonMax]=useState(18000),[pathLengthCm,setPathLength]=useState(1),[measurementWavelengthNm,setMeasurementWavelength]=useState(520),[maxStandardMicroM,setMaxStandard]=useState(80),[unknownMicroM,setUnknown]=useState(35),[strayLightPercent,setStrayLight]=useState(0);
  const params=useMemo(()=>({lambdaMaxNm,bandWidthNm,epsilonMax,pathLengthCm,measurementWavelengthNm,maxStandardMicroM,unknownMicroM,strayLightPercent}),[lambdaMaxNm,bandWidthNm,epsilonMax,pathLengthCm,measurementWavelengthNm,maxStandardMicroM,unknownMicroM,strayLightPercent]);
  const analysis=useMemo(()=>analyzeSpectrophotometry(params),[params]);
  const passport=MODEL_PASSPORTS.spectrophotometryCalibration;
  const beamColor=wavelengthColor(measurementWavelengthNm);
  const applyPreset=(preset)=>{setLambdaMax(preset.lambdaMaxNm);setBandWidth(preset.bandWidthNm);setEpsilonMax(preset.epsilonMax);setPathLength(preset.pathLengthCm);setMeasurementWavelength(preset.measurementWavelengthNm);setMaxStandard(preset.maxStandardMicroM);setUnknown(preset.unknownMicroM);setStrayLight(preset.strayLightPercent);};
  const matchingPreset=SPECTRO_PRESETS.find((preset)=>Object.entries(preset).every(([key,value])=>['id','name','note'].includes(key)||params[key]===value));
  const quickWavelengths=[{label:'Peak',value:lambdaMaxNm},{label:'+ ½ width',value:clamp(lambdaMaxNm+bandWidthNm/2,380,720)},{label:'+ 1 width',value:clamp(lambdaMaxNm+bandWidthNm,380,720)}];
  return <section className="spectroscopy-lab" id="spectroscopyLab" aria-labelledby="spectroscopyLabTitle">
    <header className="spectroscopy-header"><div><p className="section-code">17 / Analytical measurement</p><h2 id="spectroscopyLabTitle">A straight line is a claim. Test it.</h2><p>Choose a wavelength, build standards, inspect residuals, and estimate an unknown. Then add stray light and watch a convincing calibration become biased.</p></div><div className="spectro-condition-stamp"><span>Illustrative instrument</span><strong>Beer-Lambert + unconstrained OLS</strong><small>Computed locally · no measured spectrum</small></div></header>
    <div className="spectro-bench">
      <aside className="spectro-controls">
        <div className="spectro-panel-heading"><span>Instrument setup</span><strong>Choose what the detector sees</strong></div>
        <div className="spectro-presets">{SPECTRO_PRESETS.map((preset)=><button type="button" key={preset.id} className={matchingPreset?.id===preset.id?'active':''} onClick={()=>applyPreset(preset)}><strong>{preset.name}</strong><small>{preset.note}</small></button>)}</div>
        <div className="spectro-input-grid">
          <label><span>Band maximum</span><div><input aria-label="Band maximum wavelength" type="number" min="400" max="680" step="5" value={lambdaMaxNm} onChange={finiteInput(setLambdaMax,400,680)}/><b>nm</b></div></label>
          <label><span>Band FWHM</span><div><input aria-label="Band full width at half maximum" type="number" min="20" max="240" step="5" value={bandWidthNm} onChange={finiteInput(setBandWidth,20,240)}/><b>nm</b></div></label>
          <label><span>Maximum epsilon</span><div><input aria-label="Maximum molar absorption coefficient" type="number" min="100" max="100000" step="500" value={epsilonMax} onChange={finiteInput(setEpsilonMax,100,100000)}/><b>M⁻¹cm⁻¹</b></div></label>
          <label><span>Path length</span><div><input aria-label="Optical path length" type="number" min="0.1" max="10" step="0.1" value={pathLengthCm} onChange={finiteInput(setPathLength,.1,10)}/><b>cm</b></div></label>
          <label><span>Highest standard</span><div><input aria-label="Maximum standard concentration" type="number" min="1" max="1000" step="5" value={maxStandardMicroM} onChange={finiteInput(setMaxStandard,1,1000)}/><b>µM</b></div></label>
          <label><span>Simulated unknown</span><div><input aria-label="Simulated unknown concentration" type="number" min="0" max="1500" step="1" value={unknownMicroM} onChange={finiteInput(setUnknown,0,1500)}/><b>µM</b></div></label>
        </div>
        <div className="wavelength-control"><div><span>Measurement wavelength</span><strong style={{color:beamColor}}>{measurementWavelengthNm.toFixed(0)} nm</strong></div><input aria-label="Measurement wavelength" type="range" min="380" max="720" step="1" value={measurementWavelengthNm} onChange={finiteInput(setMeasurementWavelength,380,720)} style={{accentColor:beamColor}}/><div>{quickWavelengths.map((option)=><button type="button" className={measurementWavelengthNm===option.value?'active':''} key={option.label} onClick={()=>setMeasurementWavelength(option.value)}>{option.label}<small>{option.value.toFixed(0)} nm</small></button>)}</div></div>
        <div className="stray-control"><div><span>Unabsorbed stray light</span><strong>{strayLightPercent.toFixed(2)}%</strong></div><input aria-label="Unabsorbed stray light percentage" type="range" min="0" max="3" step="0.05" value={strayLightPercent} onChange={finiteInput(setStrayLight,0,3)}/><p>{strayLightPercent===0?'Ideal detector response.':'Extra light reaches the detector without being absorbed.'}</p></div>
      </aside>

      <section className="spectral-stage">
        <div className="spectro-stage-topline"><span><i/>linked optical path</span><b>{analysis.band.sensitivityLabel}</b></div>
        <OpticalTrain analysis={analysis} beamColor={beamColor}/><SpectrumPlot analysis={analysis} beamColor={beamColor}/>
      </section>

      <article className="spectro-verdicts" aria-live="polite">
        <div className="spectro-result-kind"><i/>{analysis.resultKind}</div>
        <section className={`sensitivity-card ${analysis.band.relativeSensitivity<.2?'warning':''}`}><span>Question 1 · wavelength</span><h3>How sensitive is this setup?</h3><div><strong>{(analysis.band.relativeSensitivity*100).toFixed(2)}%</strong><b>of epsilon max</b></div><p>{analysis.diagnostics.sensitivityLabel}</p><dl><div><dt>epsilon at {measurementWavelengthNm} nm</dt><dd>{analysis.band.selectedEpsilon.toFixed(0)} M⁻¹cm⁻¹</dd></div><div><dt>fitted sensitivity</dt><dd>{fixed(analysis.calibration.regression.slope,5)} A/µM</dd></div></dl></section>
        <section className={`linearity-card ${analysis.calibration.maxBeerDeviation>=.05?'warning':''}`}><span>Question 2 · calibration</span><h3>Does the line deserve trust?</h3><div><strong>R² {fixed(analysis.calibration.regression.rSquared,5)}</strong><b>inspect residuals too</b></div><p>{analysis.diagnostics.curvatureLabel}</p><dl><div><dt>maximum residual</dt><dd>{fixed(analysis.calibration.maximumResidual,4)} A</dd></div><div><dt>Beer-Lambert depression</dt><dd>{fixed(analysis.calibration.maxBeerDeviation,3)} A</dd></div></dl></section>
        <section className={`unknown-card ${analysis.unknown.isExtrapolated?'warning':''}`}><span>Question 3 · unknown</span><h3>What concentration does the signal imply?</h3><div><strong>{fixed(analysis.unknown.estimatedMicroM,2)}</strong><b>µmol L⁻¹</b></div><p>{analysis.unknown.rangeLabel}</p><dl><div><dt>simulated truth</dt><dd>{fixed(analysis.unknown.trueMicroM,2)} µM</dd></div><div><dt>recovery</dt><dd>{analysis.unknown.recoveryPercent===null?'—':`${fixed(analysis.unknown.recoveryPercent,2)}%`}</dd></div></dl></section>
        <div className="r-squared-warning"><strong>R² is not a permission slip.</strong><p>A high R² can coexist with systematic bias. Look at the response curve, residual stems, range, and model assumptions.</p></div>
      </article>

      <section className="calibration-panel"><div className="spectro-panel-heading"><span>Calibration field</span><strong>Every standard stays visible</strong></div><CalibrationPlot analysis={analysis}/></section>

      <aside className="standards-panel"><div className="spectro-panel-heading"><span>Six-point standard rack</span><strong>Known concentrations</strong></div><StandardsRack analysis={analysis} beamColor={beamColor}/><div className="standard-note"><span>What the color means</span><p>Fill strength encodes computed absorbance. It is not a prediction of the solution's observed colour.</p></div><div className="fit-equation"><span>Unconstrained fit</span><code>A = {fixed(analysis.calibration.regression.intercept,4)} + {fixed(analysis.calibration.regression.slope,5)} c</code><small>No point was removed. The intercept was not forced through zero.</small></div></aside>

      <aside className="spectro-passport"><div className="spectro-panel-heading"><span>Model passport</span><strong>{passport.name}</strong></div><div className="spectro-passport-verdict"><i/>{passport.resultKind}</div><p>{passport.inputProvenance}</p><div className="spectro-passport-group"><span>Included</span><div>{passport.includes.map((item)=><b key={item}>{item}</b>)}</div></div><div className="spectro-passport-group excluded"><span>Not included</span><div>{passport.excludes.map((item)=><b key={item}>{item}</b>)}</div></div><p>{passport.dataStatement}</p><div className="spectro-equations"><span>Equations in use</span><code>{analysis.calibration.equation.expression}</code><code>{analysis.optics.equation.expression}</code></div><div className="spectro-sources"><span>Reference basis</span>{passport.sources.map((sourceId)=>{const source=SCIENCE_SOURCES[sourceId];return <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><strong>{source.name}</strong><small>{source.role}</small><b aria-hidden="true">↗</b></a>;})}</div></aside>
    </div>
  </section>;
}
