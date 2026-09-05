import { useState } from 'react';
import {
  ELECTRONIC_BAND_MODEL_BOUNDARY,
  FINITE_CHAIN_PRESETS,
  PERIODIC_BAND_PRESETS,
  TWO_BAND_PRESETS,
} from '../data/electronicBandScenarios.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../data/scienceSources.js';
import {
  analyzeFiniteChain,
  analyzePeriodicBand,
  analyzeTwoBandEdges,
  buildFiniteReferenceState,
  clearFiniteChainState,
  createFiniteChainState,
  evaluateFiniteChain,
  evaluatePeriodicBand,
  evaluateTwoBandEdges,
  nextFiniteChainHint,
  nextPeriodicBandHint,
  nextTwoBandHint,
  placeFiniteElectron,
  removeFiniteElectron,
  updateFiniteChainState,
} from '../chemistry/electronicBands.js';
import '../styles/electronic-bands.css';

const MODES = [
  { id: 'finite', number: '01', icon: '⋮', label: 'Level Splitter', detail: 'finite chain · manual occupation' },
  { id: 'periodic', number: '02', icon: '∿', label: 'Band Loom', detail: 'periodic dispersion · filling' },
  { id: 'gap', number: '03', icon: '↕', label: 'Gap Gate', detail: 'two declared bands · edge relation' },
];

let activityIndex = 0;
const activity = (kind, title, detail) => ({
  id: `band-${Date.now()}-${++activityIndex}`,
  kind,
  title,
  detail,
});

const stateSignature = (state, predictions) => JSON.stringify({ state, predictions });
const signed = (value, digits = 2) => {
  const normalized = Math.abs(value) < 1e-12 ? 0 : value;
  return `${normalized >= 0 ? '+' : '−'}${Math.abs(normalized).toFixed(digits)}`;
};
const qLabel = (q) => Math.abs(q) < 1e-9 ? '0' : Math.abs(Math.abs(q) - Math.PI) < 1e-9 ? `${q < 0 ? '−' : ''}π` : q.toFixed(2);

function PanelHeading({ eyebrow, title, badge }) {
  return <header className="band-panel-heading"><div><span>{eyebrow}</span><strong>{title}</strong></div>{badge && <b>{badge}</b>}</header>;
}

function HeroLoom() {
  return (
    <svg className="band-hero-loom" viewBox="0 0 650 330" role="img" aria-labelledby="bandHeroTitle bandHeroDesc">
      <title id="bandHeroTitle">One source orbital per site becoming finite levels and then a periodic band</title>
      <desc id="bandHeroDesc">Six site resonators connect through copper coupling rails. Their energy lines split and crowd into a cyan periodic ribbon.</desc>
      <defs>
        <linearGradient id="bandHeroRibbon" x1="0" x2="1"><stop stopColor="#35bfd0" stopOpacity=".2"/><stop offset=".5" stopColor="#35bfd0"/><stop offset="1" stopColor="#7451d9" stopOpacity=".52"/></linearGradient>
        <pattern id="bandHeroGrid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#dbe6e1" /></pattern>
      </defs>
      <rect className="hero-field" x="1" y="1" width="648" height="328" rx="26"/>
      <rect className="hero-grid" x="1" y="1" width="648" height="328" rx="26" fill="url(#bandHeroGrid)"/>
      <g className="hero-sites">
        {[72, 118, 164, 210, 256, 302].map((x, index) => <g key={x}><circle cx={x} cy="214" r="18"/><circle cx={x} cy="214" r="7"/><text x={x} y="259" textAnchor="middle">φ{index + 1}</text></g>)}
        <path d="M72 214H302"/>
      </g>
      <g className="hero-levels">
        {[102, 132, 166, 204, 244, 278].map((y, index) => <g key={y}><path d={`M342 ${214 + (index - 2.5) * 3}C360 ${214 + (index - 2.5) * 3} 365 ${y} 388 ${y}H457`}/><circle cx="470" cy={y} r="7"/></g>)}
      </g>
      <path className="hero-band-ribbon" d="M498 278C540 272 562 231 575 190S610 106 637 103M498 103C540 109 562 150 575 190s35 84 62 88"/>
      <path className="hero-band-fill" d="M500 244C535 239 557 213 575 190s39-47 62-52"/>
      <g className="hero-labels"><text x="70" y="55">site orbitals</text><text x="342" y="55">N finite levels</text><text x="510" y="55">periodic band</text></g>
      <g className="hero-arrows"><path d="M300 78H374"/><path d="M458 78H526"/></g>
    </svg>
  );
}

function ContinuityStrip({ mode, onChange }) {
  return (
    <nav className="band-continuity" aria-label="Orbital to band continuity">
      {MODES.map((item, index) => <button type="button" className={mode === item.id ? 'active' : ''} aria-pressed={mode === item.id} onClick={() => onChange(item.id)} key={item.id}><span>{item.number}</span><i>{item.icon}</i><strong>{item.label}</strong><small>{index === 0 ? 'N sources → N levels' : index === 1 ? 'N → ∞ periodic limit' : 'compare closest edges'}</small></button>)}
      <div className="band-continuity-rail" aria-hidden="true"><i/><i/><i/></div>
    </nav>
  );
}

function ModeTabs({ mode, onChange }) {
  return (
    <nav className="band-mode-tabs" role="tablist" aria-label="Electronic-band instruments">
      {MODES.map((item) => <button type="button" role="tab" id={`band-tab-${item.id}`} aria-controls={`band-panel-${item.id}`} aria-selected={mode === item.id} className={mode === item.id ? 'active' : ''} onClick={() => onChange(item.id)} key={item.id}><i>{item.icon}</i><span><strong>{item.label}</strong><small>{item.detail}</small></span><b>{item.number}</b></button>)}
    </nav>
  );
}

function PresetRail({ label, presets, selectedId, onSelect }) {
  return (
    <section className="band-preset-bank">
      <div className="band-swipe-cue" aria-hidden="true">Swipe cartridges <b>→</b></div>
      <span>{label}</span>
      <div>{presets.map((preset) => <button type="button" className={selectedId === preset.id ? 'active' : ''} aria-pressed={selectedId === preset.id} onClick={() => onSelect(preset)} key={preset.id}><b>{preset.code}</b><strong>{preset.name}</strong><small>{preset.question}</small></button>)}</div>
    </section>
  );
}

function DualControl({ label, value, min, max, step, unit, onChange, ariaLabel = label }) {
  const change = (event) => {
    const next = Number(event.target.value);
    if (Number.isFinite(next)) onChange(next);
  };
  return (
    <label className="band-dual-control"><span>{label}<b>{value.toFixed(step < 1 ? 2 : 0)} {unit}</b></span><div><input type="range" min={min} max={max} step={step} value={value} aria-label={`${ariaLabel} slider`} onChange={change}/><input type="number" min={min} max={max} step={step} value={value} aria-label={`${ariaLabel} numeric value`} onChange={change}/></div></label>
  );
}

function ChoiceGroup({ legend, value, options, onChange }) {
  return <fieldset className="band-choice-group"><legend>{legend}</legend><div>{options.map((option) => <button type="button" className={value === option.value ? 'active' : ''} aria-pressed={value === option.value} onClick={() => onChange(option.value)} key={option.value}><strong>{option.label}</strong>{option.detail && <small>{option.detail}</small>}</button>)}</div></fieldset>;
}

function AuditLedger({ audit, stale, dimensions, boundary }) {
  if (!audit) return <section className="band-audit sealed"><PanelHeading eyebrow="Evidence comparator" title="Audit shutter closed" badge="NO CHECK"/><div className="band-audit-empty"><i/><strong>Commit your model claims when ready.</strong><p>The comparator will explain each dimension without moving a spin, changing a parameter, or replacing a prediction.</p></div></section>;
  return (
    <section className={`band-audit ${stale ? 'stale' : audit.committed ? 'resolved' : 'inspect'}`}>
      <PanelHeading eyebrow="Evidence comparator" title={stale ? 'Previous audit retained' : audit.committed ? 'Every declared dimension resolves' : 'Some dimensions need inspection'} badge={stale ? 'PREVIOUS' : audit.committed ? 'RESOLVED' : 'INSPECT'}/>
      {stale && <p className="band-stale-note">The experiment changed after this check. These reasons still belong to the previous snapshot.</p>}
      <div className="band-audit-grid">{dimensions.map(({ label, item }) => {
        const neutral = item?.applicable === false || item?.correct === null;
        return <article className={neutral ? 'neutral' : item?.correct ? 'correct' : 'wrong'} key={label}><span>{label}</span><strong>{neutral ? 'NOT RANKED' : item?.correct ? 'MATCH' : 'COMPARE'}</strong><p>{item?.reason || 'No claim was supplied.'}</p></article>;
      })}</div>
      <p className="band-audit-boundary">{boundary}</p>
    </section>
  );
}

function FiniteLevelRack({ state, analysis, selectedSpin, onPlace, onRemove }) {
  const { levels, degenerate } = analysis.spectrum;
  const minimum = levels[0].energyEv;
  const maximum = levels.at(-1).energyEv;
  const span = maximum - minimum;
  const topFor = (level, index) => degenerate
    ? 10 + (index / Math.max(1, levels.length - 1)) * 80
    : 8 + ((maximum - level.energyEv) / span) * 84;
  return (
    <section className={`band-finite-rack ${degenerate ? 'degenerate' : ''}`} aria-labelledby="finiteRackTitle">
      <PanelHeading eyebrow="Open-chain energy loom" title={`${state.siteCount} source orbitals → ${levels.length} finite levels`} badge={degenerate ? 'EXPLODED SAME-ENERGY VIEW' : `${analysis.spectrum.finiteSpreadEv.toFixed(3)} eV SPREAD`}/>
      <div className="band-finite-stage">
        <aside className="band-source-sites" aria-label={`${state.siteCount} source orbital resonators`}><span>SOURCE SITES</span><div>{Array.from({ length: state.siteCount }, (_, index) => <i key={index}><b>φ</b><small>{index + 1}</small></i>)}</div><p>one orbital / site</p></aside>
        <div className="band-energy-axis" aria-hidden="true"><span>higher E</span><i/><span>lower E</span></div>
        <div className="band-level-field">
          {degenerate && <div className="band-degenerate-bracket"><i/><span>exploded controls</span><strong>all E = {state.onsiteEnergyEv.toFixed(2)} eV</strong></div>}
          {levels.map((level, index) => {
            const spins = state.occupancy[level.id];
            return <article className="band-level-slat" style={{ '--level-top': `${topFor(level, index)}%` }} key={level.id}><div className="band-level-label"><b>{level.id}</b><span>{signed(level.energyEv, 3)} eV</span></div><i className="band-level-line"/><div className="band-spin-slots">{spins.map((spin, electronIndex) => <button type="button" className={spin === 1 ? 'up' : 'down'} aria-label={`Remove ${spin === 1 ? 'spin-up' : 'spin-down'} electron from ${level.id}`} onClick={() => onRemove(level.id, electronIndex)} key={`${spin}-${electronIndex}`}><b>{spin === 1 ? '↑' : '↓'}</b><small>remove</small></button>)}<button type="button" className="add" aria-label={`Add ${selectedSpin === 1 ? 'spin-up' : 'spin-down'} electron to ${level.id}`} onClick={() => onPlace(level.id)}><b>+{selectedSpin === 1 ? '↑' : '↓'}</b><small>place</small></button></div></article>;
          })}
        </div>
      </div>
      <footer className="band-finite-ledger"><div><span>finite spread</span><strong>{analysis.spectrum.finiteSpreadEv.toFixed(3)} eV</strong></div><i>→</i><div><span>periodic limit at same |β|</span><strong>{analysis.spectrum.infiniteLimitWidthEv.toFixed(3)} eV</strong></div><i>→</i><div><span>mounted / target</span><strong>{analysis.electronCount} / {state.targetElectronCount} e⁻</strong></div></footer>
    </section>
  );
}

function FinitePredictionConsole({ predictions, setPrediction, onCheck, onHint, hint }) {
  return (
    <aside className="band-console band-finite-console">
      <PanelHeading eyebrow="Finite-spectrum claim board" title="Name the evidence you built" badge="4 CLAIMS"/>
      <label className="band-number-claim"><span>How many levels?</span><input type="number" min="2" max="16" value={predictions.levelCount} placeholder="N" onChange={(event) => setPrediction('levelCount', event.target.value)}/></label>
      <ChoiceGroup legend="Coupling result" value={predictions.splitState} onChange={(value) => setPrediction('splitState', value)} options={[{value:'degenerate',label:'degenerate'},{value:'split',label:'split'}]}/>
      <ChoiceGroup legend="Add sites at fixed coupling" value={predictions.moreSitesEffect} onChange={(value) => setPrediction('moreSitesEffect', value)} options={[{value:'closer',label:'closer levels'},{value:'wider',label:'wider limit'},{value:'unchanged',label:'unchanged'}]}/>
      <ChoiceGroup legend="What is displayed?" value={predictions.modelKind} onChange={(value) => setPrediction('modelKind', value)} options={[{value:'finite-levels',label:'finite levels'},{value:'periodic-band',label:'periodic band'},{value:'measured-solid',label:'measured solid'}]}/>
      <div className="band-console-actions"><button type="button" className="primary" onClick={onCheck}>Audit my rack</button><button type="button" onClick={onHint}>Hint</button></div>
      {hint && <div className="band-hint"><span>HINT {hint.level}/4 · {hint.title}</span><p>{hint.message}</p><small>{hint.mutation}</small></div>}
    </aside>
  );
}

function FiniteInstrument({ recordAction }) {
  const initial = createFiniteChainState('sixWeak').state;
  const [state, setState] = useState(initial);
  const [presetId, setPresetId] = useState('sixWeak');
  const [selectedSpin, setSelectedSpin] = useState(1);
  const [predictions, setPredictions] = useState({ levelCount: '', splitState: '', moreSitesEffect: '', modelKind: '' });
  const [audit, setAudit] = useState(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [hint, setHint] = useState(null);
  const [message, setMessage] = useState('The six-site weak-coupling rack begins empty. Choose a spin and place every electron yourself.');
  const analysis = analyzeFiniteChain({ state });
  const signature = stateSignature(state, predictions);
  const stale = Boolean(audit && audit.signature !== signature);

  const choosePreset = (preset) => {
    const next = createFiniteChainState(preset.id);
    setState(next.state); setPresetId(preset.id); setHint(null); setHintLevel(0); setMessage(next.reason);
    recordAction('load', `${preset.code} · ${preset.name}`, next.reason);
  };
  const changeModel = (patch, label) => {
    const result = updateFiniteChainState({ state, patch });
    if (result.allowed) { setState(result.state); setPresetId(''); }
    setMessage(result.reason);
    recordAction(result.allowed ? 'edit' : 'blocked', label, result.reason);
  };
  const place = (id) => {
    const result = placeFiniteElectron({ state, levelId: id, spin: selectedSpin });
    if (result.allowed) setState(result.state);
    setMessage(result.reason);
    recordAction(result.allowed ? 'electron' : 'blocked', `${result.allowed ? 'Placed' : 'Rejected'} ${selectedSpin === 1 ? '↑' : '↓'} at ${id}`, result.reason);
  };
  const remove = (id, index) => {
    const result = removeFiniteElectron({ state, levelId: id, electronIndex: index });
    if (result.allowed) setState(result.state);
    setMessage(result.reason); recordAction('electron', `Removed a spin from ${id}`, result.reason);
  };
  const clear = () => {
    const result = clearFiniteChainState({ state });
    if (result.allowed) setState(result.state);
    setMessage(result.reason); recordAction('edit', 'Cleared finite rack', result.reason);
  };
  const loadReference = () => {
    const result = buildFiniteReferenceState({ state });
    if (result.allowed) setState(result.state);
    setMessage(result.reason); recordAction(result.allowed ? 'reference' : 'blocked', 'Requested finite reference', result.reason);
  };
  const setPrediction = (key, value) => { setPredictions((current) => ({ ...current, [key]: value })); recordAction('prediction', `Finite claim · ${key}`, String(value || 'cleared')); };
  const check = () => {
    const evaluation = evaluateFiniteChain({ state, predictions });
    setAudit({ signature, evaluation }); recordAction('checked', 'Finite rack audited', evaluation.committed ? 'Every declared finite-spectrum dimension resolves.' : 'The learner state was preserved; inspect the independent reasons.');
  };
  const revealHint = () => {
    const next = Math.min(4, hintLevel + 1 || 1); const result = nextFiniteChainHint({ state, level: next });
    setHintLevel(next); setHint(result); recordAction('hint', result.title, result.message);
  };
  return (
    <div className="band-instrument finite-instrument">
      <PresetRail label="FINITE CHAIN CARTRIDGES" presets={FINITE_CHAIN_PRESETS} selectedId={presetId} onSelect={choosePreset}/>
      <div className="band-instrument-grid">
        <aside className="band-control-console">
          <PanelHeading eyebrow="Chain controls" title="Change the model, not the answer" badge="OPEN CHAIN"/>
          <DualControl label="Sites N" value={state.siteCount} min={2} max={16} step={1} unit="sites" onChange={(value) => changeModel({ siteCount: value }, `Requested N = ${value}`)}/>
          <DualControl label="Coupling |β|" value={state.couplingEv} min={0} max={1.5} step={0.05} unit="eV" onChange={(value) => changeModel({ couplingEv: value }, `Set |beta| = ${value.toFixed(2)} eV`)}/>
          <DualControl label="Target electrons" value={state.targetElectronCount} min={0} max={state.siteCount * 2} step={1} unit="e⁻" onChange={(value) => changeModel({ targetElectronCount: value }, `Set target to ${value} electrons`)}/>
          <div className="band-spin-cartridge"><span>SPIN CARTRIDGE</span><div>{[1,-1].map((spin) => <button type="button" className={selectedSpin === spin ? 'active' : ''} aria-pressed={selectedSpin === spin} onClick={() => setSelectedSpin(spin)} key={spin}><b>{spin === 1 ? '↑' : '↓'}</b><small>mₛ {spin === 1 ? '+1/2' : '−1/2'}</small></button>)}</div></div>
          <div className="band-control-actions"><button type="button" onClick={clear}>Clear rack</button><button type="button" className="reference" onClick={loadReference}>Load declared reference</button></div>
          <p className="band-inline-message" aria-live="polite">{message}</p>
          <div className="band-count-meter"><span>mounted spins</span><strong>{analysis.electronCount}<small>/ {state.targetElectronCount}</small></strong><i><b style={{ width: `${state.targetElectronCount ? Math.min(100, analysis.electronCount / state.targetElectronCount * 100) : analysis.electronCount ? 100 : 0}%` }}/></i></div>
        </aside>
        <FiniteLevelRack state={state} analysis={analysis} selectedSpin={selectedSpin} onPlace={place} onRemove={remove}/>
      </div>
      <div className="band-learning-grid"><FinitePredictionConsole predictions={predictions} setPrediction={setPrediction} onCheck={check} onHint={revealHint} hint={hint}/><AuditLedger audit={audit?.evaluation} stale={stale} dimensions={audit ? [
        {label:'electron count',item:audit.evaluation.electronCount},{label:'energy order',item:audit.evaluation.aufbau},{label:'level count',item:audit.evaluation.levelCount},{label:'split / degenerate',item:audit.evaluation.splitState},{label:'more-sites effect',item:audit.evaluation.moreSitesEffect},{label:'object identity',item:audit.evaluation.modelKind},
      ] : []} boundary={audit?.evaluation.boundary || analysis.boundary}/></div>
    </div>
  );
}

function linePath(samples, x, y, valueKey = 'energyEv') {
  return samples.map((sample, index) => `${index ? 'L' : 'M'}${x(sample.q).toFixed(2)} ${y(sample[valueKey]).toFixed(2)}`).join(' ');
}

function PeriodicPlot({ analysis }) {
  const left = 80, right = 790, top = 42, bottom = 405;
  const padding = Math.max(0.4, analysis.bandWidthEv * 0.12);
  const minimum = analysis.bandMinimumEv - padding, maximum = analysis.bandMaximumEv + padding;
  const x = (q) => left + ((q + Math.PI) / (2 * Math.PI)) * (right - left);
  const y = (energy) => bottom - ((energy - minimum) / (maximum - minimum)) * (bottom - top);
  const occupiedSamples = analysis.samples.filter((sample) => sample.occupied);
  return (
    <section className="band-plot-panel">
      <PanelHeading eyebrow="Periodic state loom" title="E(q) across one declared Brillouin interval" badge={`${analysis.bandWidthEv.toFixed(2)} eV WIDTH`}/>
      <svg className="band-periodic-plot" viewBox="0 0 900 465" role="img" aria-labelledby="periodicPlotTitle periodicPlotDesc">
        <title id="periodicPlotTitle">Periodic cosine band with learner-controlled filling</title>
        <desc id="periodicPlotDesc">The cyan cosine band spans q from minus pi to pi. Cobalt marks occupied states and the cursor reports model energy and dimensionless slope.</desc>
        <defs><pattern id="bandPlotGrid" width="35" height="35" patternUnits="userSpaceOnUse"><path d="M35 0H0V35" fill="none" stroke="#d9e3df"/></pattern><filter id="bandPlotGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        <rect className="plot-field" x="18" y="14" width="864" height="432" rx="21"/><rect className="plot-grid" x="18" y="14" width="864" height="432" rx="21" fill="url(#bandPlotGrid)"/>
        <g className="plot-axes"><path d={`M${left} ${top}V${bottom}H${right}`}/>{[-Math.PI,0,Math.PI].map((q) => <g key={q}><path d={`M${x(q)} ${bottom}V${bottom+8}`}/><text x={x(q)} y={bottom+27} textAnchor="middle">{qLabel(q)}</text></g>)}<text x="432" y="455" textAnchor="middle">q = ka · dimensionless</text><text transform="translate(31 235) rotate(-90)" textAnchor="middle">synthetic energy / eV</text></g>
        <path className="band-ribbon-underlay" d={linePath(analysis.samples,x,y)}/>
        <path className="band-ribbon" d={linePath(analysis.samples,x,y)}/>
        {occupiedSamples.length > 1 && <path className="band-ribbon-occupied" d={linePath(occupiedSamples,x,y)} filter="url(#bandPlotGlow)"/>}
        <g className="band-state-beads">{analysis.samples.filter((_, index) => index % 4 === 0).map((sample) => <circle className={sample.occupied ? 'occupied' : ''} cx={x(sample.q)} cy={y(sample.energyEv)} r="4" key={sample.q}/>)}</g>
        {analysis.qF !== null && <g className="band-fermi-edges"><path d={`M${x(-analysis.qF)} ${y(analysis.fermiLevelWithinBandEv)-28}V${bottom}`}/><path d={`M${x(analysis.qF)} ${y(analysis.fermiLevelWithinBandEv)-28}V${bottom}`}/><text x={x(analysis.qF)+8} y={y(analysis.fermiLevelWithinBandEv)-34}>T=0 occupation edge</text></g>}
        <g className="band-q-cursor"><path d={`M${x(analysis.qCursor)} ${top}V${bottom}`}/><circle cx={x(analysis.qCursor)} cy={y(analysis.selectedEnergyEv)} r="9"/><text x={Math.min(right-135,x(analysis.qCursor)+12)} y={Math.max(top+18,y(analysis.selectedEnergyEv)-16)}>q {qLabel(analysis.qCursor)} · E {signed(analysis.selectedEnergyEv)} eV</text></g>
        <g className="band-width-bracket"><path d={`M825 ${y(analysis.bandMaximumEv)}h18V${y(analysis.bandMinimumEv)}h-18`}/><text x="850" y={(y(analysis.bandMaximumEv)+y(analysis.bandMinimumEv))/2} transform={`rotate(90 850 ${(y(analysis.bandMaximumEv)+y(analysis.bandMinimumEv))/2})`} textAnchor="middle">4|β| = {analysis.bandWidthEv.toFixed(2)} eV</text></g>
      </svg>
      <div className="band-plot-readouts"><div><span>occupation</span><strong>{analysis.occupationClass}</strong></div><div><span>capacity used</span><strong>{(analysis.occupiedFraction*100).toFixed(1)}%</strong></div><div><span>dE/dq at cursor</span><strong>{signed(analysis.selectedSlopeEvPerQ,3)} eV</strong></div><div><span>T = 0 edge</span><strong>{analysis.fermiLevelWithinBandEv === null ? 'not displayed' : `${signed(analysis.fermiLevelWithinBandEv,3)} eV`}</strong></div></div>
      <div className={`band-availability ${analysis.occupationClass}`}><span>SAME-BAND STATE AVAILABILITY</span><div><i style={{width:`${analysis.occupiedFraction*100}%`}}/><b style={{left:`${analysis.occupiedFraction*100}%`}}/></div><strong>{analysis.nearbyEmptyStatesWithinBand === null ? 'No occupied state: question not applicable.' : analysis.nearbyEmptyStatesWithinBand ? 'Occupied and empty states meet at the model occupation edge.' : 'No empty state remains inside this displayed band.'}</strong></div>
    </section>
  );
}

function PeriodicPredictionConsole({ predictions, setPrediction, onCheck, onHint, hint }) {
  return <aside className="band-console"><PanelHeading eyebrow="Periodic-band claim board" title="Read width, filling, and scope" badge="4 CLAIMS"/><label className="band-number-claim"><span>Band width / eV</span><input type="number" min="0" max="6" step="0.01" value={predictions.bandWidthEv} placeholder="e.g. 4.00" onChange={(event) => setPrediction('bandWidthEv',event.target.value)}/></label><ChoiceGroup legend="Occupation class" value={predictions.occupationClass} onChange={(value)=>setPrediction('occupationClass',value)} options={[{value:'empty',label:'empty'},{value:'partially-filled',label:'partial'},{value:'full',label:'full'}]}/><ChoiceGroup legend="Nearby empty states in same band" value={predictions.nearbyEmpty} onChange={(value)=>setPrediction('nearbyEmpty',value)} options={[{value:'yes',label:'yes'},{value:'no',label:'no'},{value:'not-applicable',label:'N/A'}]}/><ChoiceGroup legend="What does dE/dq establish?" value={predictions.slopeMeaning} onChange={(value)=>setPrediction('slopeMeaning',value)} options={[{value:'dispersion-only',label:'dispersion only'},{value:'conductivity',label:'conductivity'}]}/><div className="band-console-actions"><button type="button" className="primary" onClick={onCheck}>Audit my band</button><button type="button" onClick={onHint}>Hint</button></div>{hint && <div className="band-hint"><span>HINT {hint.level}/4 · {hint.title}</span><p>{hint.message}</p><small>{hint.mutation}</small></div>}</aside>;
}

function PeriodicInstrument({ recordAction }) {
  const [input,setInput] = useState({...PERIODIC_BAND_PRESETS[2]});
  const [presetId,setPresetId] = useState('halfFilled');
  const [predictions,setPredictions] = useState({bandWidthEv:'',occupationClass:'',nearbyEmpty:'',slopeMeaning:''});
  const [audit,setAudit] = useState(null); const [hintLevel,setHintLevel] = useState(0); const [hint,setHint] = useState(null);
  const analysis = analyzePeriodicBand(input); const signature = stateSignature(input,predictions); const stale = Boolean(audit&&audit.signature!==signature);
  const choosePreset=(preset)=>{setInput({...preset});setPresetId(preset.id);setHint(null);setHintLevel(0);recordAction('load',`${preset.code} · ${preset.name}`,preset.question);};
  const change=(patch,label)=>{setInput((current)=>({...current,...patch,id:'custom'}));setPresetId('');recordAction('edit',label,'The periodic teaching parameters changed; no prediction was replaced.');};
  const setPrediction=(key,value)=>{setPredictions((current)=>({...current,[key]:value}));recordAction('prediction',`Periodic claim · ${key}`,String(value||'cleared'));};
  const check=()=>{const evaluation=evaluatePeriodicBand({input,predictions});setAudit({signature,evaluation});recordAction('checked','Periodic band audited',evaluation.committed?'Every periodic-band claim resolves.':'The controls and claims remain unchanged; inspect each reason.');};
  const revealHint=()=>{const next=Math.min(4,hintLevel+1||1),result=nextPeriodicBandHint({input,level:next});setHintLevel(next);setHint(result);recordAction('hint',result.title,result.message);};
  return <div className="band-instrument"><PresetRail label="PERIODIC BAND CARTRIDGES" presets={PERIODIC_BAND_PRESETS} selectedId={presetId} onSelect={choosePreset}/><div className="band-instrument-grid periodic-grid"><aside className="band-control-console"><PanelHeading eyebrow="Periodic controls" title="Weave one infinite chain" badge="q ∈ [−π, π]"/><DualControl label="Coupling |β|" value={Math.abs(input.betaEv)} min={0.1} max={1.5} step={0.05} unit="eV" onChange={(value)=>change({betaEv:-value},`Set |beta| = ${value.toFixed(2)} eV`)}/><DualControl label="Electrons per cell ν" value={input.electronsPerCell} min={0} max={2} step={0.05} unit="e⁻" onChange={(value)=>change({electronsPerCell:value},`Set filling to ${value.toFixed(2)} electrons per cell`)}/><DualControl label="Reduced coordinate q" value={input.qCursor} min={-Math.PI} max={Math.PI} step={0.01} unit="rad" ariaLabel="Reduced wave coordinate q" onChange={(value)=>change({qCursor:value},`Moved q cursor to ${value.toFixed(2)}`)}/><div className="band-equation-ticket"><span>DECLARED DISPERSION</span><code>E(q) = α + 2β cos q</code><code>width = 4|β|</code><small>q = ka · dimensionless</small></div><p className="band-model-warning">The slope readout is not velocity, current, mobility, or conductivity.</p></aside><PeriodicPlot analysis={analysis}/></div><div className="band-learning-grid"><PeriodicPredictionConsole predictions={predictions} setPrediction={setPrediction} onCheck={check} onHint={revealHint} hint={hint}/><AuditLedger audit={audit?.evaluation} stale={stale} dimensions={audit?[{label:'band width',item:audit.evaluation.bandWidthEv},{label:'occupation',item:audit.evaluation.occupationClass},{label:'nearby state',item:audit.evaluation.nearbyEmpty},{label:'slope meaning',item:audit.evaluation.slopeMeaning}]:[]} boundary={audit?.evaluation.boundary||analysis.boundary}/></div></div>;
}

function GapPlot({ analysis }) {
  const left=80,right=790,top=42,bottom=405;
  const energies=analysis.samples.flatMap((sample)=>[sample.valenceEv,sample.conductionEv]);
  const minimum=Math.min(...energies)-.35,maximum=Math.max(...energies)+.35;
  const x=(q)=>left+((q+Math.PI)/(2*Math.PI))*(right-left); const y=(energy)=>bottom-((energy-minimum)/(maximum-minimum))*(bottom-top);
  const gapTop=y(analysis.conductionMinimum.energyEv),gapBottom=y(analysis.valenceMaximum.energyEv);
  return <section className={`band-plot-panel gap-plot-panel ${analysis.edgeRelation}`}><PanelHeading eyebrow="Two-band edge cartography" title="Compare the valence roof with the conduction floor" badge={analysis.edgeRelation==='overlap'?`${analysis.overlapEv.toFixed(2)} eV OVERLAP`:analysis.edgeRelation==='touching'?'0.00 eV TOUCH':`${analysis.displayGapEv.toFixed(2)} eV GAP`}/><svg className="band-gap-plot" viewBox="0 0 900 465" role="img" aria-labelledby="gapPlotTitle gapPlotDesc"><title id="gapPlotTitle">Declared valence and conduction band edges</title><desc id="gapPlotDesc">Two cosine ribbons show a {analysis.edgeRelation.replace('-', ' ')} with {analysis.edgeAlignment} edge alignment. The extrema are explicitly marked.</desc><defs><pattern id="gapPlotGrid" width="35" height="35" patternUnits="userSpaceOnUse"><path d="M35 0H0V35" fill="none" stroke="#d9e3df"/></pattern><pattern id="bandOverlapHatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="12"/></pattern></defs><rect className="plot-field" x="18" y="14" width="864" height="432" rx="21"/><rect className="plot-grid" x="18" y="14" width="864" height="432" rx="21" fill="url(#gapPlotGrid)"/><g className="plot-axes"><path d={`M${left} ${top}V${bottom}H${right}`}/>{[-Math.PI,0,Math.PI].map((q)=><g key={q}><path d={`M${x(q)} ${bottom}V${bottom+8}`}/><text x={x(q)} y={bottom+27} textAnchor="middle">{qLabel(q)}</text></g>)}<text x="432" y="455" textAnchor="middle">q = ka · dimensionless</text><text transform="translate(31 235) rotate(-90)" textAnchor="middle">synthetic energy / eV</text></g>{analysis.edgeRelation==='overlap'&&<rect className="band-overlap-field" x={left} y={y(analysis.valenceMaximum.energyEv)} width={right-left} height={Math.max(1,y(analysis.conductionMinimum.energyEv)-y(analysis.valenceMaximum.energyEv))} fill="url(#bandOverlapHatch)"/>}<path className="gap-valence-ribbon" d={linePath(analysis.samples,x,y,'valenceEv')}/><path className="gap-conduction-ribbon" d={linePath(analysis.samples,x,y,'conductionEv')}/><g className="gap-extrema"><circle className="valence" cx={x(analysis.valenceMaximum.q)} cy={y(analysis.valenceMaximum.energyEv)} r="9"/><text x={x(analysis.valenceMaximum.q)-14} y={y(analysis.valenceMaximum.energyEv)+25} textAnchor="end">Ev,max · q {qLabel(analysis.valenceMaximum.q)}</text><circle className="conduction" cx={x(analysis.conductionMinimum.q)} cy={y(analysis.conductionMinimum.energyEv)} r="9"/><text x={x(analysis.conductionMinimum.q)+14} y={y(analysis.conductionMinimum.energyEv)-18}>Ec,min · q {qLabel(analysis.conductionMinimum.q)}</text></g><g className="gap-q-cursor"><path d={`M${x(analysis.qCursor)} ${top}V${bottom}`}/><circle cx={x(analysis.qCursor)} cy={y(analysis.selectedValenceEv)} r="6"/><circle cx={x(analysis.qCursor)} cy={y(analysis.selectedConductionEv)} r="6"/></g><g className={`gap-bracket ${analysis.edgeRelation}`}><path d={`M825 ${gapTop}h18V${gapBottom}h-18`}/><text x="850" y={(gapTop+gapBottom)/2} transform={`rotate(90 850 ${(gapTop+gapBottom)/2})`} textAnchor="middle">{analysis.edgeRelation==='overlap'?`overlap ${analysis.overlapEv.toFixed(2)} eV`:analysis.edgeRelation==='touching'?'edges touch':`Eg ${analysis.displayGapEv.toFixed(2)} eV`}</text></g></svg><div className="band-plot-readouts"><div><span>edge relation</span><strong>{analysis.edgeRelation}</strong></div><div><span>edge alignment</span><strong>{analysis.edgeAlignment}</strong></div><div><span>Ev,max</span><strong>{signed(analysis.valenceMaximum.energyEv)} eV</strong></div><div><span>Ec,min</span><strong>{signed(analysis.conductionMinimum.energyEv)} eV</strong></div></div><p className="gap-reason">{analysis.reason}</p></section>;
}

function GapPredictionConsole({ predictions,setPrediction,onCheck,onHint,hint }) {
  return <aside className="band-console"><PanelHeading eyebrow="Band-edge claim board" title="Compare energy and q separately" badge="4 CLAIMS"/><ChoiceGroup legend="Edge relationship" value={predictions.edgeRelation} onChange={(value)=>setPrediction('edgeRelation',value)} options={[{value:'positive-gap',label:'positive gap'},{value:'touching',label:'touching'},{value:'overlap',label:'overlap'}]}/><label className="band-number-claim"><span>Gap or overlap magnitude / eV</span><input type="number" min="0" max="6" step="0.01" value={predictions.magnitudeEv} placeholder="e.g. 1.00" onChange={(event)=>setPrediction('magnitudeEv',event.target.value)}/></label><ChoiceGroup legend="Edge-coordinate alignment" value={predictions.edgeAlignment} onChange={(value)=>setPrediction('edgeAlignment',value)} options={[{value:'direct',label:'direct'},{value:'indirect',label:'indirect'}]}/><ChoiceGroup legend="What material claim is justified?" value={predictions.materialClaim} onChange={(value)=>setPrediction('materialClaim',value)} options={[{value:'teaching-model-only',label:'teaching model only'},{value:'certified-semiconductor',label:'semiconductor'},{value:'certified-insulator',label:'insulator'}]}/><div className="band-console-actions"><button type="button" className="primary" onClick={onCheck}>Audit edge claim</button><button type="button" onClick={onHint}>Hint</button></div>{hint&&<div className="band-hint"><span>HINT {hint.level}/4 · {hint.title}</span><p>{hint.message}</p><small>{hint.mutation}</small></div>}</aside>;
}

function GapInstrument({ recordAction }) {
  const [input,setInput]=useState({...TWO_BAND_PRESETS[0]}); const [presetId,setPresetId]=useState('directGap');
  const [predictions,setPredictions]=useState({edgeRelation:'',magnitudeEv:'',edgeAlignment:'',materialClaim:''}); const [audit,setAudit]=useState(null); const [hintLevel,setHintLevel]=useState(0); const [hint,setHint]=useState(null);
  const analysis=analyzeTwoBandEdges(input); const signature=stateSignature(input,predictions); const stale=Boolean(audit&&audit.signature!==signature);
  const choosePreset=(preset)=>{setInput({...preset});setPresetId(preset.id);setHint(null);setHintLevel(0);recordAction('load',`${preset.code} · ${preset.name}`,preset.question);};
  const change=(patch,label)=>{setInput((current)=>({...current,...patch,id:'custom'}));setPresetId('');recordAction('edit',label,'The declared edge geometry changed; no learner claim was replaced.');};
  const setPrediction=(key,value)=>{setPredictions((current)=>({...current,[key]:value}));recordAction('prediction',`Gap claim · ${key}`,String(value||'cleared'));};
  const check=()=>{const evaluation=evaluateTwoBandEdges({input,predictions});setAudit({signature,evaluation});recordAction('checked','Gap gate audited',evaluation.committed?'Every band-edge claim resolves.':'The two ribbons and learner claims remain unchanged; inspect the reasons.');};
  const revealHint=()=>{const next=Math.min(4,hintLevel+1||1),result=nextTwoBandHint({input,level:next});setHintLevel(next);setHint(result);recordAction('hint',result.title,result.message);};
  return <div className="band-instrument"><PresetRail label="TWO-BAND CARTRIDGES" presets={TWO_BAND_PRESETS} selectedId={presetId} onSelect={choosePreset}/><div className="band-instrument-grid gap-grid"><aside className="band-control-console"><PanelHeading eyebrow="Gap controls" title="Move the band edges yourself" badge="NO OCCUPATION SOLVED"/><DualControl label="Valence center" value={input.valenceCenterEv} min={-4} max={4} step={0.1} unit="eV" onChange={(value)=>change({valenceCenterEv:value},`Set valence center to ${value.toFixed(1)} eV`)}/><DualControl label="Valence width" value={input.valenceWidthEv} min={0.2} max={3} step={0.1} unit="eV" onChange={(value)=>change({valenceWidthEv:value},`Set valence width to ${value.toFixed(1)} eV`)}/><DualControl label="Conduction center" value={input.conductionCenterEv} min={-4} max={4} step={0.1} unit="eV" onChange={(value)=>change({conductionCenterEv:value},`Set conduction center to ${value.toFixed(1)} eV`)}/><DualControl label="Conduction width" value={input.conductionWidthEv} min={0.2} max={3} step={0.1} unit="eV" onChange={(value)=>change({conductionWidthEv:value},`Set conduction width to ${value.toFixed(1)} eV`)}/><ChoiceGroup legend="Declared edge alignment" value={input.alignment} onChange={(value)=>change({alignment:value},`Set ${value} edge alignment`)} options={[{value:'direct',label:'direct',detail:'same q'},{value:'indirect',label:'indirect',detail:'different q'}]}/><DualControl label="Reduced coordinate q" value={input.qCursor} min={-Math.PI} max={Math.PI} step={0.01} unit="rad" onChange={(value)=>change({qCursor:value},`Moved q cursor to ${value.toFixed(2)}`)}/></aside><GapPlot analysis={analysis}/></div><div className="band-learning-grid"><GapPredictionConsole predictions={predictions} setPrediction={setPrediction} onCheck={check} onHint={revealHint} hint={hint}/><AuditLedger audit={audit?.evaluation} stale={stale} dimensions={audit?[{label:'edge relation',item:audit.evaluation.edgeRelation},{label:'magnitude',item:audit.evaluation.magnitudeEv},{label:'edge alignment',item:audit.evaluation.edgeAlignment},{label:'material claim',item:audit.evaluation.materialClaim}]:[]} boundary={audit?.evaluation.boundary||analysis.boundary}/></div></div>;
}

const TEACHER_CONTRASTS = [
  { number:'01', mode:'finite', title:'N orbitals → N levels', question:'Why does adding sites add levels rather than add separate bands?', boundary:'Count source basis functions before discussing the periodic limit.' },
  { number:'02', mode:'finite', title:'Crowding versus width', question:'Compare N = 6 and N = 12 at fixed |β|, then compare weak and strong N = 6.', boundary:'N controls sampling density; |β| controls the periodic model width.' },
  { number:'03', mode:'finite', title:'Shared states still bond', question:'What does delocalization change without implying that bonding disappeared?', boundary:'The model shares one-electron states across sites; it does not calculate cohesion.' },
  { number:'04', mode:'periodic', title:'A full band is not enough', question:'Which second-band evidence is missing from the one-band ledger?', boundary:'Do not infer an insulator from a full isolated displayed band.' },
  { number:'05', mode:'periodic', title:'Slope is not transport', question:'Which physical quantities are absent between dE/dq and conductivity?', boundary:'No lattice length, scattering, carrier response, or measurement is supplied.' },
  { number:'06', mode:'gap', title:'A toy gap is not a certificate', question:'Why can 0.2 eV not by itself name a real material class?', boundary:'Temperature, carriers, defects, interactions, and validated evidence are absent.' },
];

function TeacherRail({ mode, onMode }) {
  return <section className="band-teacher-rail"><PanelHeading eyebrow="Teacher contrast rail" title="Challenge the shortcut, then open the relevant instrument" badge="6 CONTRASTS"/><div>{TEACHER_CONTRASTS.map((item)=><article className={mode===item.mode?'active':''} key={item.number}><span>{item.number}</span><h3>{item.title}</h3><p>{item.question}</p><small>{item.boundary}</small><button type="button" onClick={()=>onMode(item.mode)}>Open {MODES.find((modeItem)=>modeItem.id===item.mode).label}<b>→</b></button></article>)}</div></section>;
}

function ActionTrace({ entries }) {
  return <aside className="band-action-trace"><PanelHeading eyebrow="Learning trace" title="Every learner action stays inspectable" badge={`${entries.length} EVENTS`}/><div>{entries.map((entry)=><article className={entry.kind} key={entry.id}><i/><span>{entry.kind}</span><div><strong>{entry.title}</strong><p>{entry.detail}</p></div></article>)}</div></aside>;
}

function ModelPassport() {
  const passport=MODEL_PASSPORTS.electronicBandObservatory;
  return <section className="band-passport"><header><div><span>MODEL PASSPORT · LOCAL SYNTHETIC ENGINE</span><h2>Know exactly where the state loom stops.</h2></div><strong>{passport.resultKind}</strong></header><p className="band-passport-warning">A finite level rack, a partially filled cosine band, and a positive toy gap are different evidence. None certifies a real material property.</p><div className="band-passport-grid"><article><h3>DECLARED CONDITIONS</h3>{passport.conditions.map((item)=><p key={item}><b>+</b><span>{item}</span></p>)}</article><article><h3>INCLUDED CLAIMS</h3>{passport.includes.map((item)=><p key={item}><b>✓</b><span>{item}</span></p>)}</article><article><h3>EXCLUDED CLAIMS</h3>{passport.excludes.map((item)=><p key={item}><b>×</b><span>{item}</span></p>)}</article></div><div className="band-equation-ledger"><article><span>FINITE OPEN CHAIN</span><code>Eⱼ = α + 2β cos(jπ/(N+1))</code><small>N levels · finite spread · β = −|β|</small></article><article><span>PERIODIC ONE-BAND LIMIT</span><code>E(q) = α + 2β cos q</code><small>q = ka · width = 4|β|</small></article><article><span>DECLARED EDGE TEST</span><code>E<sub>g</sub> = min(Ec) − max(Ev)</code><small>positive · touching · overlap</small></article></div><div className="band-passport-provenance"><p><b>INPUT PROVENANCE</b>{passport.inputProvenance}</p><p><b>DATA STATEMENT</b>{passport.dataStatement}</p></div><div className="band-source-grid">{passport.sources.map((sourceId)=>{const source=SCIENCE_SOURCES[sourceId];return <a href={source.url} target="_blank" rel="noreferrer" key={sourceId}><span>{source.name}</span><small>{source.role}</small><b>↗</b></a>;})}</div><footer><p>{ELECTRONIC_BAND_MODEL_BOUNDARY.finite}</p><p>{ELECTRONIC_BAND_MODEL_BOUNDARY.periodic}</p><p>{ELECTRONIC_BAND_MODEL_BOUNDARY.gap}</p><p>{ELECTRONIC_BAND_MODEL_BOUNDARY.units}</p></footer></section>;
}

export default function ElectronicBandLab() {
  const [mode,setMode]=useState('finite');
  const [history,setHistory]=useState([activity('ready','State loom ready','The finite chain begins empty; every occupation and claim is learner-controlled.')]);
  const recordAction=(kind,title,detail)=>setHistory((current)=>[activity(kind,title,detail),...current].slice(0,10));
  const chooseMode=(next)=>{setMode(next);recordAction('mode',`Opened ${MODES.find((item)=>item.id===next).label}`,MODES.find((item)=>item.id===next).detail);};
  return (
    <section className="electronic-band-lab" id="electronicBandLab" aria-labelledby="electronicBandLabTitle">
      <header className="band-hero"><div className="band-hero-copy"><p className="section-code">30 / Electronic bands & metallic bonding</p><h2 id="electronicBandLabTitle">Add atoms. Watch one orbital become many levels—<em>then a band.</em></h2><p>Fill the states yourself. A partially filled band and a true energy gap are different evidence, and neither becomes a real-material property without the missing physics and measurements.</p><div><span>finite open chain</span><span>periodic cosine band</span><span>declared edge geometry</span></div></div><HeroLoom/></header>
      <ContinuityStrip mode={mode} onChange={chooseMode}/>
      <ModeTabs mode={mode} onChange={chooseMode}/>
      <div role="tabpanel" id="band-panel-finite" aria-labelledby="band-tab-finite" hidden={mode!=='finite'}><FiniteInstrument recordAction={recordAction}/></div>
      <div role="tabpanel" id="band-panel-periodic" aria-labelledby="band-tab-periodic" hidden={mode!=='periodic'}><PeriodicInstrument recordAction={recordAction}/></div>
      <div role="tabpanel" id="band-panel-gap" aria-labelledby="band-tab-gap" hidden={mode!=='gap'}><GapInstrument recordAction={recordAction}/></div>
      <div className="band-bottom-grid"><TeacherRail mode={mode} onMode={chooseMode}/><ActionTrace entries={history}/></div>
      <ModelPassport/>
    </section>
  );
}
