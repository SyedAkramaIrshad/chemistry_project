import { useEffect, useMemo, useState } from 'react';
import {
  equivalenceVolumeMl,
  titrationCurve,
  titrationPoint,
} from '../chemistry/equilibrium.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../data/scienceSources.js';

const ACID_PRESETS = [
  { id: 'acetic-like', name: 'Acetic-like', pKa: 4.76, note: 'approximate pKa at 25 °C' },
  { id: 'formic-like', name: 'Formic-like', pKa: 3.75, note: 'approximate pKa at 25 °C' },
  { id: 'hf-like', name: 'HF-like', pKa: 3.17, note: 'approximate pKa at 25 °C' },
];

const PLOT = { width: 760, height: 330, left: 58, right: 22, top: 24, bottom: 48 };

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function interpolateHex(start, end, amount) {
  const from = start.match(/[a-f\d]{2}/gi).map((part) => parseInt(part, 16));
  const to = end.match(/[a-f\d]{2}/gi).map((part) => parseInt(part, 16));
  const mixed = from.map((value, index) => Math.round(value + (to[index] - value) * clamp(amount, 0, 1)));
  return `#${mixed.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function colorForPh(pH) {
  return pH <= 7
    ? interpolateHex('#ff6b7a', '#63e6ff', pH / 7)
    : interpolateHex('#63e6ff', '#a78bfa', (pH - 7) / 7);
}

function finiteInput(setter, minimum, maximum) {
  return (event) => {
    const value = event.target.valueAsNumber;
    if (Number.isFinite(value)) setter(clamp(value, minimum, maximum));
  };
}

function formatNumber(value, digits = 2) {
  return Number(value).toFixed(digits);
}

function formatConcentration(value) {
  if (value === 0) return '0 M';
  if (Math.abs(value) < 0.001) return `${value.toExponential(2)} M`;
  return `${value.toFixed(4).replace(/0+$/,'').replace(/\.$/,'')} M`;
}

function chartCoordinates(point, maximumMl) {
  const plotWidth = PLOT.width - PLOT.left - PLOT.right;
  const plotHeight = PLOT.height - PLOT.top - PLOT.bottom;
  return {
    x: PLOT.left + clamp(point.baseAddedMl / maximumMl, 0, 1) * plotWidth,
    y: PLOT.top + (14 - clamp(point.pH, 0, 14)) / 14 * plotHeight,
  };
}

function TitrationChart({ curve, point, equivalenceMl, maximumMl }) {
  const path = curve.map((curvePoint, index) => {
    const { x, y } = chartCoordinates(curvePoint, maximumMl);
    return `${index ? 'L' : 'M'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
  const selected = chartCoordinates(point, maximumMl);
  const halfX = chartCoordinates({baseAddedMl:equivalenceMl/2,pH:0},maximumMl).x;
  const equivalenceX = chartCoordinates({baseAddedMl:equivalenceMl,pH:0},maximumMl).x;
  const plotBottom = PLOT.height - PLOT.bottom;
  const plotRight = PLOT.width - PLOT.right;
  const xTicks = [0, 0.5, 1, 1.5].filter((multiple) => multiple * equivalenceMl <= maximumMl + 1e-9);

  return (
    <div className="titration-chart-wrap">
      <svg
        className="titration-chart"
        viewBox={`0 0 ${PLOT.width} ${PLOT.height}`}
        role="img"
        aria-label={`Titration curve. Current point ${formatNumber(point.baseAddedMl,2)} millilitres, pH ${formatNumber(point.pH,2)}, ${point.regimeLabel}.`}
      >
        <title>Weak-acid strong-base titration curve</title>
        <desc>The selected volume is marked on a pH versus added-base-volume curve. Half-equivalence and equivalence are labelled.</desc>
        <defs>
          <linearGradient id="curveGradient" x1="0" x2="1">
            <stop offset="0" stopColor="#ff6b7a" />
            <stop offset="55%" stopColor="#63e6ff" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <filter id="curveGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect className="chart-region acid" x={PLOT.left} y={PLOT.top} width={halfX-PLOT.left} height={plotBottom-PLOT.top} />
        <rect className="chart-region buffer" x={halfX} y={PLOT.top} width={equivalenceX-halfX} height={plotBottom-PLOT.top} />
        <rect className="chart-region base" x={equivalenceX} y={PLOT.top} width={plotRight-equivalenceX} height={plotBottom-PLOT.top} />

        {[0,2,4,6,8,10,12,14].map((pH) => {
          const y = PLOT.top + (14-pH)/14*(plotBottom-PLOT.top);
          return <g key={pH}><line className="chart-gridline" x1={PLOT.left} x2={plotRight} y1={y} y2={y} /><text className="chart-tick" x={PLOT.left-12} y={y+4} textAnchor="end">{pH}</text></g>;
        })}
        {xTicks.map((multiple) => {
          const volume = equivalenceMl * multiple;
          const x = chartCoordinates({baseAddedMl:volume,pH:0},maximumMl).x;
          return <g key={multiple}><line className="chart-gridline vertical" x1={x} x2={x} y1={PLOT.top} y2={plotBottom} /><text className="chart-tick" x={x} y={plotBottom+22} textAnchor="middle">{formatNumber(volume,1)}</text></g>;
        })}

        <line className="semantic-line half" x1={halfX} x2={halfX} y1={PLOT.top} y2={plotBottom} />
        <line className="semantic-line equivalence" x1={equivalenceX} x2={equivalenceX} y1={PLOT.top} y2={plotBottom} />
        <text className="semantic-label" x={halfX} y={PLOT.top+13} textAnchor="middle">½ eq</text>
        <text className="semantic-label" x={equivalenceX+6} y={PLOT.top+13}>eq</text>

        <path className="curve-shadow" d={path} />
        <path className="curve-line" d={path} />
        <line className="current-guide" x1={selected.x} x2={selected.x} y1={selected.y} y2={plotBottom} />
        <circle className="current-halo" cx={selected.x} cy={selected.y} r="12" />
        <circle className="current-point" cx={selected.x} cy={selected.y} r="5" />
        <text className="axis-label y" x="16" y={PLOT.height/2} transform={`rotate(-90 16 ${PLOT.height/2})`} textAnchor="middle">pH</text>
        <text className="axis-label" x={(PLOT.left+plotRight)/2} y={PLOT.height-8} textAnchor="middle">Strong base added / mL</text>
      </svg>
      <div className="chart-regime-key" aria-hidden="true">
        <span><i className="acid" /> acid-dominant</span>
        <span><i className="buffer" /> buffer</span>
        <span><i className="base" /> base-dominant</span>
      </div>
    </div>
  );
}

function SolutionVessel({ point, maximumMl }) {
  const particleCount = 36;
  const haCount = Math.round(point.species.haFraction * particleCount);
  const color = colorForPh(point.pH);
  const fillFraction = clamp(0.5 + point.baseAddedMl / maximumMl * 0.22, 0.5, 0.72);
  const buretteFraction = 1 - clamp(point.baseAddedMl / maximumMl, 0, 1);
  const particles = Array.from({length:particleCount},(_,index)=>({
    id:index,
    kind:index<haCount?'ha':'a',
    left:12+(index*29)%76,
    top:18+(index*37)%68,
    delay:(index%7)*-0.18,
  }));

  return (
    <div className="solution-vessel-stage" style={{'--solution-color':color,'--solution-fill':`${fillFraction*100}%`,'--burette-fill':`${buretteFraction*100}%`}}>
      <div className="vessel-topline"><span><i /> live ideal model</span><b>25 °C</b></div>
      <div className="burette" aria-hidden="true"><div className="burette-liquid" /><span className="burette-scale" /><i className="burette-tip" /></div>
      <div className={`titrant-drop${point.baseAddedMl>0?' active':''}`} aria-hidden="true" />
      <div className="beaker" aria-hidden="true">
        <div className="beaker-rim" />
        <div className="solution-liquid">
          <div className="solution-meniscus" />
          {particles.map((particle)=><i key={particle.id} className={`species-particle ${particle.kind}`} style={{left:`${particle.left}%`,top:`${particle.top}%`,animationDelay:`${particle.delay}s`}}>{particle.kind==='ha'?'HA':'A⁻'}</i>)}
          {point.regime==='excess-base'&&Array.from({length:6},(_,index)=><i key={`oh-${index}`} className="species-particle oh" style={{left:`${18+(index*13)%68}%`,top:`${22+(index*17)%60}%`}}>OH⁻</i>)}
        </div>
        <div className="beaker-markings"><span>50</span><span>25</span></div>
      </div>
      <div className="vessel-readout">
        <span>Computed pH</span>
        <strong>{formatNumber(point.pH,2)}</strong>
        <small>{point.regimeLabel}</small>
      </div>
      <div className="species-legend" aria-label="Qualitative acid species population">
        <span><i className="ha" /> HA {Math.round(point.species.haFraction*100)}%</span>
        <span><i className="a" /> A⁻ {Math.round(point.species.aFraction*100)}%</span>
      </div>
      <p className="vessel-disclaimer">Color and particles are explanatory, not a real indicator spectrum or molecular-dynamics simulation.</p>
    </div>
  );
}

export default function SolutionLab() {
  const [pKa,setPka] = useState(4.76);
  const [acidM,setAcidM] = useState(0.1);
  const [acidVolumeMl,setAcidVolumeMl] = useState(25);
  const [baseM,setBaseM] = useState(0.1);
  const [baseAddedMl,setBaseAddedMl] = useState(0);

  const params = useMemo(()=>({acidM,acidVolumeMl,baseM,pKa,temperatureC:25}),[acidM,acidVolumeMl,baseM,pKa]);
  const equivalenceMl = useMemo(()=>equivalenceVolumeMl(params),[params]);
  const maximumMl = equivalenceMl*1.8;
  useEffect(()=>setBaseAddedMl((current)=>clamp(current,0,maximumMl)),[maximumMl]);
  const selectedVolume = clamp(baseAddedMl,0,maximumMl);
  const point = useMemo(()=>titrationPoint(params,selectedVolume),[params,selectedVolume]);
  const curve = useMemo(()=>titrationCurve(params,161,selectedVolume),[params,selectedVolume]);
  const passport = MODEL_PASSPORTS.weakAcidTitration;

  const selectPreset = (preset) => { setPka(preset.pKa); };
  const setSemanticVolume = (multiple) => setBaseAddedMl(equivalenceMl*multiple);

  return (
    <section className="solution-lab" id="solutionLab" aria-labelledby="solutionLabTitle">
      <header className="solution-lab-header">
        <div>
          <p className="section-code">08 / Aqueous equilibrium bench</p>
          <h2 id="solutionLabTitle">Move one burette. Watch the governing chemistry change.</h2>
          <p>Follow a monoprotic weak acid from dissociation through buffering, equivalence, and excess base. Every region names the equation it uses.</p>
        </div>
        <div className="solution-condition-stamp"><span>Model condition</span><strong>Ideal aqueous · 25 °C</strong><small>No remote data call</small></div>
      </header>

      <div className="solution-bench">
        <aside className="solution-controls" aria-label="Titration conditions">
          <div className="solution-panel-heading"><span>Condition deck</span><strong>Define the experiment</strong></div>
          <div className="acid-presets" aria-label="Approximate example pKa presets">
            {ACID_PRESETS.map((preset)=><button type="button" key={preset.id} className={Math.abs(preset.pKa-pKa)<1e-9?'active':''} onClick={()=>selectPreset(preset)}><strong>{preset.name}</strong><small>pKa {preset.pKa} · {preset.note}</small></button>)}
          </div>
          <div className="solution-input-grid">
            <label><span>pKa <small>learner input</small></span><input aria-label="Weak acid pKa" type="number" min="-2" max="16" step="0.01" value={pKa} onChange={finiteInput(setPka,-2,16)} /></label>
            <label><span>Acid concentration</span><div className="input-with-unit"><input aria-label="Acid concentration" type="number" min="0.001" max="1" step="0.01" value={acidM} onChange={finiteInput(setAcidM,0.001,1)} /><b>M</b></div></label>
            <label><span>Acid volume</span><div className="input-with-unit"><input aria-label="Acid volume" type="number" min="5" max="100" step="1" value={acidVolumeMl} onChange={finiteInput(setAcidVolumeMl,5,100)} /><b>mL</b></div></label>
            <label><span>Strong base</span><div className="input-with-unit"><input aria-label="Base concentration" type="number" min="0.001" max="1" step="0.01" value={baseM} onChange={finiteInput(setBaseM,0.001,1)} /><b>M</b></div></label>
          </div>

          <div className="volume-control">
            <div><span>Base added</span><strong>{formatNumber(selectedVolume,2)} mL</strong></div>
            <input aria-label="Base volume added" type="range" min="0" max={maximumMl} step={Math.max(maximumMl/500,0.001)} value={selectedVolume} onChange={finiteInput(setBaseAddedMl,0,maximumMl)} />
            <div className="semantic-volume-buttons">
              <button type="button" onClick={()=>setSemanticVolume(0)}>Start</button>
              <button type="button" onClick={()=>setSemanticVolume(.5)}>½ eq</button>
              <button type="button" onClick={()=>setSemanticVolume(1)}>Equivalence</button>
              <button type="button" onClick={()=>setSemanticVolume(1.2)}>Excess</button>
            </div>
          </div>

          <div className="condition-facts">
            <div><span>Equivalence volume</span><strong>{formatNumber(equivalenceMl,2)} mL</strong></div>
            <div><span>Titration progress</span><strong>{formatNumber(point.equivalenceFraction*100,1)}%</strong></div>
            <div><span>Total volume</span><strong>{formatNumber(point.totalVolumeL*1000,2)} mL</strong></div>
          </div>
        </aside>

        <SolutionVessel point={point} maximumMl={maximumMl} />

        <article className="solution-explanation" aria-live="polite">
          <div className="result-kind"><i /> {point.resultKind}</div>
          <span className={`regime-pill ${point.regime}`}>{point.regimeLabel}</span>
          <div className="ph-readout"><span>pH</span><strong>{formatNumber(point.pH,3)}</strong><small>pOH {formatNumber(point.pOH,3)}</small></div>
          <p className="regime-explanation">{point.explanation}</p>
          <div className="equation-card"><span>Governing model</span><strong>{point.equation.label}</strong><code>{point.equation.expression}</code><p>{point.equation.detail}</p></div>
          <div className="species-bars">
            <div><span>HA <b>{Math.round(point.species.haFraction*100)}%</b></span><i><em style={{width:`${point.species.haFraction*100}%`}} /></i><small>{formatConcentration(point.species.haM)}</small></div>
            <div><span>A⁻ <b>{Math.round(point.species.aFraction*100)}%</b></span><i><em style={{width:`${point.species.aFraction*100}%`}} /></i><small>{formatConcentration(point.species.aM)}</small></div>
          </div>
          <div className="teacher-question"><span>Teacher question</span><p>{point.diagnosticQuestion}</p></div>
        </article>

        <div className="solution-chart-panel">
          <div className="solution-panel-heading"><span>Live titration trace</span><strong>One curve, five reasoning regions</strong></div>
          <TitrationChart curve={curve} point={point} equivalenceMl={equivalenceMl} maximumMl={maximumMl} />
        </div>

        <aside className="model-passport">
          <div className="solution-panel-heading"><span>Model passport</span><strong>{passport.name}</strong></div>
          <div className="passport-verdict"><i /> {passport.resultKind}</div>
          <p>{passport.inputProvenance}</p>
          <div className="passport-group"><span>Included</span><div>{passport.includes.map((item)=><b key={item}>{item}</b>)}</div></div>
          <div className="passport-group excluded"><span>Not included</span><div>{passport.excludes.map((item)=><b key={item}>{item}</b>)}</div></div>
          <p>{passport.dataStatement}</p>
          <div className="passport-sources"><span>Terminology reference</span>{passport.sources.map((sourceId)=>{const source=SCIENCE_SOURCES[sourceId];return <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><strong>{source.name}</strong><small>{source.role}</small><b aria-hidden="true">↗</b></a>;})}</div>
        </aside>
      </div>
    </section>
  );
}
