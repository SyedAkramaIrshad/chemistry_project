import { useMemo, useRef, useState } from 'react';
import {
  ACTIVITY_SCENARIOS,
  ACTIVITY_SCENARIO_BY_ID,
  FUGACITY_SCENARIOS,
  FUGACITY_SCENARIO_BY_ID,
  NONIDEAL_THERMODYNAMICS_BOUNDARY,
  NONIDEAL_THERMODYNAMICS_CONSTANTS,
  STABILITY_SCENARIOS,
  STABILITY_SCENARIO_BY_ID,
} from '../data/nonidealThermodynamicsScenarios.js';
import {
  analyzeMargulesActivity,
  analyzeRegularSolution,
  analyzeVirialFugacity,
  evaluateActivityPrediction,
  evaluateFugacityPrediction,
  evaluateStabilityPrediction,
  nextActivityHint,
  nextFugacityHint,
  nextStabilityHint,
} from '../chemistry/nonidealThermodynamics.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../data/scienceSources.js';
import '../styles/nonideal-thermodynamics.css';

const MODES = [
  { id: 'activity', icon: 'γ', label: 'Activity membrane', detail: 'bend P–x–y and locate y = x' },
  { id: 'stability', icon: '∂²G', label: 'Stability terrain', detail: 'separate binodal from spinodal' },
  { id: 'fugacity', icon: 'φ', label: 'Fugacity cell', detail: 'gate a low-density virial result' },
];

const ACTIVITY_PREDICTIONS = [
  { key: 'pressureDeparture', label: 'Pressure vs ideal', choices: [['positive', 'Above'], ['ideal', 'Same'], ['negative', 'Below']] },
  { key: 'azeotropeCount', label: 'Interior azeotropes', choices: [['0', 'None'], ['1', 'One'], ['2', 'Two']] },
  { key: 'vapourEnrichment', label: 'At selected x₁', choices: [['component-1', 'y₁ > x₁'], ['equal', 'y₁ = x₁'], ['component-2', 'y₁ < x₁']] },
  { key: 'scope', label: 'What is released?', choices: [['synthetic-model', 'Synthetic model'], ['measured-mixture', 'Measured mixture']] },
];

const STABILITY_PREDICTIONS = [
  { key: 'curvature', label: 'Local curvature', choices: [['positive', 'Positive'], ['zero', 'Zero'], ['negative', 'Negative']] },
  { key: 'localState', label: 'Homogeneous state', choices: [['stable', 'Stable'], ['metastable', 'Metastable'], ['unstable', 'Unstable'], ['critical', 'Critical'], ['stability-limit', 'Spinodal limit']] },
  { key: 'equilibriumPhases', label: 'Equilibrium liquids', choices: [['1', 'One'], ['2', 'Two']] },
  { key: 'scope', label: 'What is released?', choices: [['equilibrium-no-rate', 'Equilibrium only'], ['kinetic-trajectory', 'Time trajectory']] },
];

const FUGACITY_PREDICTIONS = [
  { key: 'gateStatus', label: 'Declared gate', choices: [['inside', 'Inside'], ['outside', 'Outside']] },
  { key: 'compressionFactor', label: 'Z versus 1', choices: [['below', 'Below'], ['equal', 'Equal'], ['above', 'Above'], ['not-released', 'Not released']] },
  { key: 'fugacityCoefficient', label: 'φ versus 1', choices: [['below', 'Below'], ['equal', 'Equal'], ['above', 'Above'], ['not-released', 'Not released']] },
  { key: 'fugacityPressure', label: 'f versus P', choices: [['below', 'Below'], ['equal', 'Equal'], ['above', 'Above'], ['not-released', 'Not released']] },
];

const TEACHER_CONTRASTS = [
  { id: 'gamma-activity', mode: 'activity', scenarioId: 'mild-positive', title: 'γ is not activity', left: 'γᵢ modifies a declared composition scale.', right: 'aᵢ = γᵢxᵢ is the activity in this model.', note: 'Load a positive departure and ask which displayed quantity belongs in chemical potential.' },
  { id: 'azeotrope-coexistence', mode: 'activity', scenarioId: 'positive-azeotrope', title: 'Azeotrope is not L–L coexistence', left: 'Azeotrope: equilibrium vapour and liquid share composition.', right: 'Binodal: two liquid phases coexist at different compositions.', note: 'Use the root pin, then switch to the stability terrain.' },
  { id: 'binodal-spinodal', mode: 'stability', scenarioId: 'metastable-inside-gap', title: 'Binodal is not spinodal', left: 'Binodal comes from a common tangent.', right: 'Spinodal comes from zero local curvature.', note: 'The metastable cartridge makes the interval between them visible.' },
  { id: 'local-equilibrium', mode: 'stability', scenarioId: 'metastable-inside-gap', title: 'Local state is not phase amount', left: 'The homogeneous point can resist infinitesimal fluctuations.', right: 'The lower-G equilibrium can still contain two phases.', note: 'Compare the local-state card with the split-vessel ledger.' },
  { id: 'phi-z', mode: 'fugacity', scenarioId: 'attractive-departure', title: 'φ is not Z', left: 'Z records P–ρ–T departure.', right: 'φ follows a thermodynamic pressure integral.', note: 'Keep both registers visible; similar direction does not make them the same quantity.' },
  { id: 'truncation-reference', mode: 'fugacity', scenarioId: 'outside-declared-gate', title: 'Truncation is not a reference property', left: 'A small-parameter expansion has a declared teaching range.', right: 'A named-fluid property needs data and an appropriate EOS.', note: 'The refusal cartridge should release a reason, not a tempting number.' },
];

const fixed = (value, digits = 4) => Number.isFinite(value) ? Number(value).toFixed(digits) : '—';
const percent = (value) => Number.isFinite(value) ? `${(100 * value).toFixed(2)}%` : '—';
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const choiceClass = (selected, correct) => [selected ? 'selected' : '', correct === true ? 'correct' : '', correct === false ? 'incorrect' : ''].filter(Boolean).join(' ');

const activityDraft = (scenario) => ({
  A12: scenario.A12, A21: scenario.A21, p1StarBar: scenario.p1StarBar,
  p2StarBar: scenario.p2StarBar, x1: scenario.defaultX1,
});
const stabilityDraft = (scenario) => ({ chi: scenario.chi, overallX1: scenario.overallX1 });
const fugacityDraft = (scenario) => ({
  temperatureK: scenario.temperatureK, pressureBar: scenario.pressureBar,
  secondVirialCm3Mol: scenario.secondVirialCm3Mol,
});
const emptyPrediction = (groups) => Object.fromEntries(groups.map(({ key }) => [key, null]));
const sameDraft = (left, right) => left && right && Object.keys(right).every((key) => Number(left[key]) === Number(right[key]));

function HeroSurface() {
  return (
    <div className="nt-hero-surface" aria-hidden="true">
      <div className="nt-pin pin-a"><b>A</b><span>pure</span></div>
      <svg viewBox="0 0 520 170" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ntHeroMembrane" x1="0" x2="1">
            <stop offset="0" stopColor="#315bce" />
            <stop offset=".5" stopColor="#ef6b57" />
            <stop offset="1" stopColor="#8f65d6" />
          </linearGradient>
          <filter id="ntHeroGlow"><feGaussianBlur stdDeviation="4" /></filter>
        </defs>
        <path className="nt-membrane-shadow" d="M22 42 C118 42 124 134 258 130 C386 126 405 42 498 42" />
        <path className="nt-membrane" d="M22 42 C118 42 124 134 258 130 C386 126 405 42 498 42" />
        <path className="nt-tangent-glow" d="M128 113 L390 112" filter="url(#ntHeroGlow)" />
        <path className="nt-tangent" d="M128 113 L390 112" />
        <circle cx="128" cy="113" r="6" /><circle cx="390" cy="112" r="6" />
      </svg>
      <div className="nt-pin pin-b"><b>B</b><span>pure</span></div>
      <p>interaction bends the Gibbs surface</p>
    </div>
  );
}

function ModeTabs({ mode, onChange }) {
  return (
    <nav className="nt-mode-tabs" role="tablist" aria-label="Nonideal thermodynamics instruments">
      {MODES.map((item) => (
        <button key={item.id} type="button" role="tab" aria-label={`${item.label}: ${item.detail}`} aria-selected={mode === item.id} className={mode === item.id ? 'active' : ''} onClick={() => onChange(item.id)}>
          <i>{item.icon}</i><span><strong>{item.label}</strong><small>{item.detail}</small></span>
        </button>
      ))}
    </nav>
  );
}

function CartridgeSelect({ id, label, value, scenarios, onChange }) {
  return (
    <label className="nt-select" htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {scenarios.map((scenario) => <option value={scenario.id} key={scenario.id}>{scenario.code} · {scenario.label}</option>)}
      </select>
    </label>
  );
}

function NumericControl({ id, label, symbol, value, minimum, maximum, step, unit, onChange }) {
  return (
    <div className="nt-numeric-control">
      <label htmlFor={`${id}-range`}><span>{label}</span><b>{symbol}</b></label>
      <div>
        <input id={`${id}-range`} type="range" min={minimum} max={maximum} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
        <label className="nt-exact" htmlFor={`${id}-exact`}>
          <span className="sr-only">Exact {label}</span>
          <input id={`${id}-exact`} type="number" min={minimum} max={maximum} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
          {unit && <em>{unit}</em>}
        </label>
      </div>
    </div>
  );
}

function PredictionRack({ groups, prediction, evaluation, onChoose }) {
  return (
    <section className="nt-prediction-rack" aria-label="Commit predictions before release">
      <header><span>01</span><div><strong>Commit the claim</strong><small>Wrong answers stay put.</small></div></header>
      {groups.map((group) => (
        <fieldset key={group.key}>
          <legend>{group.label}</legend>
          <div>
            {group.choices.map(([value, label]) => {
              const selected = prediction[group.key] === value;
              const result = selected ? evaluation?.dimensions?.[group.key]?.correct : undefined;
              return <button key={value} type="button" className={choiceClass(selected, result)} aria-pressed={selected} onClick={() => onChoose(group.key, value)}>{label}</button>;
            })}
          </div>
          {evaluation?.dimensions?.[group.key] && <p className={evaluation.dimensions[group.key].correct ? 'ok' : 'no'}>{evaluation.dimensions[group.key].reason}</p>}
        </fieldset>
      ))}
      {evaluation && <div className={`nt-score ${evaluation.correctCount === evaluation.total ? 'complete' : ''}`}><strong>{evaluation.correctCount}/{evaluation.total}</strong><span>{evaluation.correctCount === evaluation.total ? 'Claim set closes' : 'Revise only the claims you choose'}</span></div>}
    </section>
  );
}

function InstrumentActions({ releaseLabel, released, onRelease, onCheck, onHint, onReset }) {
  return (
    <div className="nt-actions">
      <button className="nt-release" type="button" onClick={onRelease}><span aria-hidden="true">▶</span>{releaseLabel}</button>
      <button type="button" onClick={onCheck} disabled={!released}>Check claims</button>
      <button type="button" onClick={onHint} disabled={!released}>Ask for a hint</button>
      <button type="button" onClick={onReset}>Reset cartridge</button>
    </div>
  );
}

function SnapshotStatus({ snapshot, stale, error, hint }) {
  return (
    <div className="nt-status-stack" aria-live="polite">
      {!snapshot && !error && <p className="nt-status idle"><i />No result released. Set the field, commit a claim, then operate the instrument.</p>}
      {snapshot && !stale && <p className="nt-status fresh"><i />Released snapshot matches the current controls.</p>}
      {snapshot && stale && <p className="nt-status stale"><i />Draft changed — the released result is stale. It remains visible until you release again.</p>}
      {error && <p className="nt-status error"><i />{error}</p>}
      {hint && <p className="nt-hint"><b>Hint</b>{hint}</p>}
    </div>
  );
}

function BlankInstrument({ mode }) {
  const messages = {
    activity: ['P–x–y field locked', 'Set x₁ and interaction parameters, then solve the activity field.'],
    stability: ['Common tangent parked', 'Set χ and z₁, then lower the beam onto the released terrain.'],
    fugacity: ['Virial cell unpressurized', 'Set T, P, and B, then ask the gate whether a result may be released.'],
  };
  return <div className="nt-blank"><span>{mode === 'activity' ? 'γ' : mode === 'stability' ? '∂²G' : 'φ'}</span><strong>{messages[mode][0]}</strong><p>{messages[mode][1]}</p></div>;
}

const pathFromPoints = (points, x, y) => points.map((point, index) => `${index ? 'L' : 'M'}${x(point).toFixed(2)} ${y(point).toFixed(2)}`).join(' ');

function ActivityPlot({ analysis }) {
  const width = 760; const height = 410; const left = 68; const right = 28; const top = 34; const bottom = 62;
  const maximum = Math.max(...analysis.curve.map((point) => Math.max(point.pressureBar, point.idealPressureBar))) * 1.12;
  const x = (point) => left + point.x1 * (width - left - right);
  const y = (point) => top + (1 - point.pressureBar / maximum) * (height - top - bottom);
  const yi = (point) => top + (1 - point.idealPressureBar / maximum) * (height - top - bottom);
  const selectedX = x(analysis.point); const selectedY = y(analysis.point);
  return (
    <div className="nt-plot-wrap">
      <svg className="nt-plot activity-plot" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Released pressure versus liquid composition field with ${analysis.azeotropeCount} interior azeotrope roots`}>
        <defs><linearGradient id="ntActivityFill" x1="0" x2="1"><stop stopColor="#315bce"/><stop offset=".55" stopColor="#ef6b57"/><stop offset="1" stopColor="#8f65d6"/></linearGradient></defs>
        {[0, .25, .5, .75, 1].map((tick) => <g className="grid" key={tick}><line x1={left} x2={width-right} y1={top+(1-tick)*(height-top-bottom)} y2={top+(1-tick)*(height-top-bottom)}/><text x={left-12} y={top+(1-tick)*(height-top-bottom)+5}>{(maximum*tick).toFixed(1)}</text></g>)}
        {[0, .25, .5, .75, 1].map((tick) => <g className="x-tick" key={tick}><line x1={left+tick*(width-left-right)} x2={left+tick*(width-left-right)} y1={height-bottom} y2={height-bottom+8}/><text x={left+tick*(width-left-right)} y={height-bottom+28}>{tick.toFixed(2)}</text></g>)}
        <path className="ideal-line" d={pathFromPoints(analysis.curve, x, yi)} />
        <path className="activity-fill" d={`${pathFromPoints(analysis.curve, x, y)} L${width-right} ${height-bottom} L${left} ${height-bottom} Z`} />
        <path className="activity-line" d={pathFromPoints(analysis.curve, x, y)} />
        <line className="selected-rule" x1={selectedX} x2={selectedX} y1={selectedY} y2={height-bottom}/>
        <circle className="selected-point" cx={selectedX} cy={selectedY} r="8" />
        {analysis.azeotropes.map((root, index) => {
          const rootX = x(root); const rootY = y(root);
          return <g className={`azeotrope-pin ${root.extremum.startsWith('maximum') ? 'maximum' : 'minimum'}`} key={index}><line x1={rootX} x2={rootX} y1={rootY-34} y2={rootY}/><circle cx={rootX} cy={rootY} r="6"/><text x={rootX} y={rootY-42}>AZ {index+1}</text><text x={rootX} y={rootY-25}>{root.extremum.startsWith('maximum') ? 'max P' : 'min P'}</text></g>;
        })}
        <text className="axis-label" x={(left+width-right)/2} y={height-10}>liquid amount fraction x₁</text>
        <text className="axis-label y-label" transform={`translate(18 ${(top+height-bottom)/2}) rotate(-90)`}>total pressure / bar</text>
        <g className="plot-legend"><line x1={left+16} x2={left+48} y1={top+13} y2={top+13}/><text x={left+56} y={top+18}>nonideal field</text><line className="ideal" x1={left+185} x2={left+217} y1={top+13} y2={top+13}/><text x={left+225} y={top+18}>ideal witness</text></g>
      </svg>
      <div className="nt-composition-inset" aria-label="Liquid and vapour composition comparison">
        <span>x₁ <b>{fixed(analysis.point.x1, 3)}</b></span><i><em style={{ '--x': `${analysis.point.x1 * 100}%` }}/><em className="vapour" style={{ '--x': `${analysis.point.y1 * 100}%` }}/></i><span>y₁ <b>{fixed(analysis.point.y1, 3)}</b></span>
      </div>
    </div>
  );
}

function ActivityLedger({ analysis }) {
  return (
    <div className="nt-ledger-grid activity-ledger">
      <article className="nt-gamma-drum gamma-one"><span>activity coefficient</span><strong>γ₁</strong><b>{fixed(analysis.point.gamma1, 4)}</b><small>a₁ = γ₁x₁ = {fixed(analysis.point.gamma1 * analysis.point.x1, 4)}</small></article>
      <article className="nt-gamma-drum gamma-two"><span>activity coefficient</span><strong>γ₂</strong><b>{fixed(analysis.point.gamma2, 4)}</b><small>a₂ = γ₂x₂ = {fixed(analysis.point.gamma2 * analysis.point.x2, 4)}</small></article>
      <article><span>excess surface</span><strong>gᴱ/RT</strong><b>{fixed(analysis.point.gExcessRT, 4)}</b><small>dimensionless</small></article>
      <article><span>pressure ledger</span><strong>p₁ + p₂</strong><b>{fixed(analysis.point.p1Bar, 3)} + {fixed(analysis.point.p2Bar, 3)}</b><small>= {fixed(analysis.point.pressureBar, 3)} bar</small></article>
      <article><span>ideal witness</span><strong>P − Pᵢd</strong><b>{analysis.pressureDeparture.absoluteBar >= 0 ? '+' : ''}{fixed(analysis.pressureDeparture.absoluteBar, 4)} bar</b><small>{percent(analysis.pressureDeparture.relative)} departure</small></article>
      <article><span>interior roots</span><strong>y₁ = x₁</strong><b>{analysis.azeotropeCount}</b><small>pure endpoints excluded</small></article>
    </div>
  );
}

function ActivityInstrument({ state, setState, onScenario, recordAction }) {
  const stale = Boolean(state.snapshot && !sameDraft(state.draft, state.snapshot.draft));
  const choosePrediction = (key, value) => setState((previous) => ({ ...previous, prediction: { ...previous.prediction, [key]: value }, evaluation: null }));
  const update = (key, value) => setState((previous) => ({ ...previous, draft: { ...previous.draft, [key]: value }, evaluation: null, error: '', hint: '' }));
  const release = () => {
    try {
      const analysis = analyzeMargulesActivity(state.draft);
      setState((previous) => ({ ...previous, snapshot: { draft: { ...previous.draft }, analysis }, evaluation: null, error: '', hint: '', hintLevel: 0 }));
      recordAction(`Solved activity field at x₁ = ${Number(state.draft.x1).toFixed(3)}.`);
    } catch (error) { setState((previous) => ({ ...previous, error: error.message })); }
  };
  const check = () => {
    if (!state.snapshot) return;
    const evaluation = evaluateActivityPrediction({ analysis: state.snapshot.analysis, prediction: state.prediction });
    setState((previous) => ({ ...previous, evaluation }));
    recordAction(`Checked activity claims: ${evaluation.correctCount}/4.`);
  };
  const hint = () => {
    if (!state.snapshot) return;
    const level = Math.min(4, state.hintLevel + 1);
    setState((previous) => ({ ...previous, hintLevel: level, hint: nextActivityHint({ analysis: previous.snapshot.analysis, level }) }));
    recordAction(`Opened activity hint ${level}.`);
  };
  const scenario = ACTIVITY_SCENARIO_BY_ID[state.scenarioId];
  return (
    <div className="nt-instrument-shell activity-shell" role="tabpanel">
      <aside className="nt-control-rail">
        <div className="nt-rail-heading"><span>ACTIVITY / γ</span><strong>Bend the membrane</strong><p>{scenario.intendedContrast}</p></div>
        <CartridgeSelect id="nt-activity-cartridge" label="Synthetic field cartridge" value={state.scenarioId} scenarios={ACTIVITY_SCENARIOS} onChange={onScenario}/>
        <NumericControl id="nt-x1" label="Liquid composition" symbol="x₁" value={state.draft.x1} minimum={0} maximum={1} step={0.005} onChange={(value) => update('x1', value)}/>
        <div className="nt-control-pair">
          <NumericControl id="nt-a12" label="A in B limit" symbol="A₁₂" value={state.draft.A12} minimum={-3} maximum={3} step={0.05} onChange={(value) => update('A12', value)}/>
          <NumericControl id="nt-a21" label="B in A limit" symbol="A₂₁" value={state.draft.A21} minimum={-3} maximum={3} step={0.05} onChange={(value) => update('A21', value)}/>
        </div>
        <div className="nt-control-pair">
          <NumericControl id="nt-p1star" label="Pure A pressure" symbol="p₁*" value={state.draft.p1StarBar} minimum={0.2} maximum={3} step={0.05} unit="bar" onChange={(value) => update('p1StarBar', value)}/>
          <NumericControl id="nt-p2star" label="Pure B pressure" symbol="p₂*" value={state.draft.p2StarBar} minimum={0.2} maximum={3} step={0.05} unit="bar" onChange={(value) => update('p2StarBar', value)}/>
        </div>
        <PredictionRack groups={ACTIVITY_PREDICTIONS} prediction={state.prediction} evaluation={state.evaluation} onChoose={choosePrediction}/>
        <InstrumentActions releaseLabel="Solve activity field" released={Boolean(state.snapshot)} onRelease={release} onCheck={check} onHint={hint} onReset={() => onScenario(state.scenarioId, true)}/>
      </aside>
      <main className="nt-stage">
        <SnapshotStatus snapshot={state.snapshot} stale={stale} error={state.error} hint={state.hint}/>
        {state.snapshot ? <><ActivityPlot analysis={state.snapshot.analysis}/><ActivityLedger analysis={state.snapshot.analysis}/></> : <BlankInstrument mode="activity"/>}
        <div className="nt-equation-tape"><span>three-suffix Margules</span><code>ln γ₁ = x₂²[A₁₂ + 2(A₂₁−A₁₂)x₁]</code><code>P = Σxᵢγᵢpᵢ*</code><b>activity aᵢ = γᵢxᵢ</b></div>
      </main>
    </div>
  );
}

function StabilityPlot({ analysis }) {
  const width = 760; const height = 430; const left = 68; const right = 28; const top = 36; const bottom = 68;
  const values = analysis.curve.map((point) => point.mixingGibbsRT);
  const rawMin = Math.min(...values); const rawMax = Math.max(...values);
  const span = Math.max(0.15, rawMax - rawMin); const minimum = rawMin - span * 0.14; const maximum = rawMax + span * 0.17;
  const x = (point) => left + point.x1 * (width-left-right);
  const yValue = (value) => top + ((maximum-value)/(maximum-minimum))*(height-top-bottom);
  const y = (point) => yValue(point.mixingGibbsRT);
  const selected = analysis.curve.reduce((nearest, point) => Math.abs(point.x1-analysis.input.overallX1)<Math.abs(nearest.x1-analysis.input.overallX1)?point:nearest);
  const zones = [];
  if (analysis.binodal && analysis.spinodal) {
    zones.push(['stable',0,analysis.binodal.lowerX1],['metastable',analysis.binodal.lowerX1,analysis.spinodal.lowerX1],['unstable',analysis.spinodal.lowerX1,analysis.spinodal.upperX1],['metastable',analysis.spinodal.upperX1,analysis.binodal.upperX1],['stable',analysis.binodal.upperX1,1]);
  } else zones.push(['stable',0,1]);
  return (
    <div className="nt-plot-wrap stability-wrap">
      <svg className="nt-plot stability-plot" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Regular-solution Gibbs mixing terrain; selected homogeneous state ${analysis.localState}, equilibrium phase count ${analysis.equilibrium.phaseCount}`}>
        <defs><linearGradient id="ntGibbsStroke" x1="0" x2="1"><stop stopColor="#315bce"/><stop offset=".5" stopColor="#b8d84a"/><stop offset="1" stopColor="#ef6b57"/></linearGradient></defs>
        {zones.map(([zone,start,end],index)=><rect key={index} className={`zone ${zone}`} x={left+start*(width-left-right)} width={(end-start)*(width-left-right)} y={top} height={height-top-bottom}/>) }
        {[0,.25,.5,.75,1].map(tick=><g className="x-tick" key={tick}><line x1={left+tick*(width-left-right)} x2={left+tick*(width-left-right)} y1={height-bottom} y2={height-bottom+8}/><text x={left+tick*(width-left-right)} y={height-bottom+29}>{tick.toFixed(2)}</text></g>)}
        <line className="zero-line" x1={left} x2={width-right} y1={yValue(0)} y2={yValue(0)}/>
        <path className="gibbs-line" d={pathFromPoints(analysis.curve,x,y)}/>
        {analysis.commonTangent && <g className="common-tangent"><line x1={x(analysis.commonTangent.lower)} y1={yValue(analysis.commonTangent.lower.mixingGibbsRT)} x2={x(analysis.commonTangent.upper)} y2={yValue(analysis.commonTangent.upper.mixingGibbsRT)}/><circle cx={x(analysis.commonTangent.lower)} cy={yValue(analysis.commonTangent.lower.mixingGibbsRT)} r="7"/><circle cx={x(analysis.commonTangent.upper)} cy={yValue(analysis.commonTangent.upper.mixingGibbsRT)} r="7"/><text x={(x(analysis.commonTangent.lower)+x(analysis.commonTangent.upper))/2} y={yValue(analysis.commonTangent.lower.mixingGibbsRT)-14}>COMMON TANGENT</text></g>}
        {analysis.spinodal && [analysis.spinodal.lowerX1,analysis.spinodal.upperX1].map((value,index)=><g className="spinodal-pin" key={value}><line x1={left+value*(width-left-right)} x2={left+value*(width-left-right)} y1={top+22} y2={height-bottom}/><text x={left+value*(width-left-right)} y={top+14}>S{index+1}</text></g>)}
        <line className="selected-rule" x1={left+analysis.input.overallX1*(width-left-right)} x2={left+analysis.input.overallX1*(width-left-right)} y1={y(selected)} y2={height-bottom}/>
        <circle className="selected-point" cx={left+analysis.input.overallX1*(width-left-right)} cy={y(selected)} r="8"/>
        <text className="axis-label" x={(left+width-right)/2} y={height-12}>liquid amount fraction x₁</text>
        <text className="axis-label y-label" transform={`translate(18 ${(top+height-bottom)/2}) rotate(-90)`}>Δgₘᵢₓ / RT</text>
        <g className="terrain-legend"><text x={left+8} y={top+22}>stable</text>{analysis.binodal&&<><text x={left+analysis.binodal.lowerX1*(width-left-right)+8} y={top+22}>meta</text><text x={(left+right+width)/2} y={top+22}>unstable</text></>}</g>
      </svg>
    </div>
  );
}

function SplitVessel({ analysis }) {
  const eq = analysis.equilibrium;
  return (
    <article className={`nt-split-vessel phases-${eq.phaseCount}`}>
      <header><span>equilibrium vessel</span><b>{eq.phaseCount} liquid phase{eq.phaseCount === 1 ? '' : 's'}</b></header>
      <div className="vessel-glass">
        <div className="phase-one" style={{ '--fill': `${eq.phase1Fraction * 100}%` }}><span>α</span></div>
        {eq.phaseCount === 2 && <div className="phase-two" style={{ '--fill': `${eq.phase2Fraction * 100}%` }}><span>β</span></div>}
      </div>
      <dl><div><dt>x₁(α)</dt><dd>{fixed(eq.phase1X1,4)}</dd></div><div><dt>Lα</dt><dd>{percent(eq.phase1Fraction)}</dd></div>{eq.phaseCount===2&&<><div><dt>x₁(β)</dt><dd>{fixed(eq.phase2X1,4)}</dd></div><div><dt>Lβ</dt><dd>{percent(eq.phase2Fraction)}</dd></div></>}</dl>
      <small>symbolic amounts · not domain shape or time</small>
    </article>
  );
}

function StabilityLedger({ analysis }) {
  return (
    <div className="nt-stability-ledger">
      <article className={`state-card ${analysis.localState}`}><span>local homogeneous state</span><strong>{analysis.localState.replace('-', ' ')}</strong><b>∂²g/∂x² = {fixed(analysis.curvature.value,3)}</b></article>
      <article className="equilibrium-card"><span>lower-G equilibrium state</span><strong>{analysis.equilibrium.phaseCount === 2 ? 'two liquid phases' : 'one liquid phase'}</strong><b>{analysis.binodal ? `binodal ${fixed(analysis.binodal.lowerX1,3)} ↔ ${fixed(analysis.binodal.upperX1,3)}` : 'no miscibility gap'}</b></article>
      <SplitVessel analysis={analysis}/>
      <article className="boundary-card"><span>stability boundaries</span><dl><div><dt>binodal</dt><dd>{analysis.binodal ? `${fixed(analysis.binodal.lowerX1,3)} / ${fixed(analysis.binodal.upperX1,3)}` : 'none'}</dd></div><div><dt>spinodal</dt><dd>{analysis.spinodal ? `${fixed(analysis.spinodal.lowerX1,3)} / ${fixed(analysis.spinodal.upperX1,3)}` : 'none'}</dd></div><div><dt>critical</dt><dd>χ = 2, x₁ = .5</dd></div></dl></article>
    </div>
  );
}

function StabilityInstrument({ state, setState, onScenario, recordAction }) {
  const stale = Boolean(state.snapshot && !sameDraft(state.draft,state.snapshot.draft));
  const update = (key,value)=>setState(previous=>({...previous,draft:{...previous.draft,[key]:value},evaluation:null,error:'',hint:''}));
  const choosePrediction = (key,value)=>setState(previous=>({...previous,prediction:{...previous.prediction,[key]:value},evaluation:null}));
  const release = ()=>{ try { const analysis=analyzeRegularSolution(state.draft); setState(previous=>({...previous,snapshot:{draft:{...previous.draft},analysis},evaluation:null,error:'',hint:'',hintLevel:0})); recordAction(`Lowered common-tangent beam at χ = ${Number(state.draft.chi).toFixed(2)}.`); } catch(error){setState(previous=>({...previous,error:error.message}));} };
  const check=()=>{if(!state.snapshot)return;const evaluation=evaluateStabilityPrediction({analysis:state.snapshot.analysis,prediction:state.prediction});setState(previous=>({...previous,evaluation}));recordAction(`Checked stability claims: ${evaluation.correctCount}/4.`);};
  const hint=()=>{if(!state.snapshot)return;const level=Math.min(4,state.hintLevel+1);setState(previous=>({...previous,hintLevel:level,hint:nextStabilityHint({analysis:previous.snapshot.analysis,level})}));recordAction(`Opened stability hint ${level}.`);};
  const scenario=STABILITY_SCENARIO_BY_ID[state.scenarioId];
  return <div className="nt-instrument-shell stability-shell" role="tabpanel"><aside className="nt-control-rail"><div className="nt-rail-heading"><span>STABILITY / ∂²G</span><strong>Lower the tangent</strong><p>{scenario.intendedContrast}</p></div><CartridgeSelect id="nt-stability-cartridge" label="Synthetic terrain cartridge" value={state.scenarioId} scenarios={STABILITY_SCENARIOS} onChange={onScenario}/><NumericControl id="nt-chi" label="Interaction parameter" symbol="χ" value={state.draft.chi} minimum={0} maximum={5} step={0.02} onChange={value=>update('chi',value)}/><NumericControl id="nt-z1" label="Overall composition" symbol="z₁" value={state.draft.overallX1} minimum={0} maximum={1} step={0.005} onChange={value=>update('overallX1',value)}/><PredictionRack groups={STABILITY_PREDICTIONS} prediction={state.prediction} evaluation={state.evaluation} onChoose={choosePrediction}/><InstrumentActions releaseLabel="Lower common-tangent beam" released={Boolean(state.snapshot)} onRelease={release} onCheck={check} onHint={hint} onReset={()=>onScenario(state.scenarioId,true)}/></aside><main className="nt-stage"><SnapshotStatus snapshot={state.snapshot} stale={stale} error={state.error} hint={state.hint}/>{state.snapshot?<><StabilityPlot analysis={state.snapshot.analysis}/><StabilityLedger analysis={state.snapshot.analysis}/></>:<BlankInstrument mode="stability"/>}<div className="nt-equation-tape"><span>symmetric regular solution</span><code>Δgₘᵢₓ/RT = x ln x + (1−x)ln(1−x) + χx(1−x)</code><code>spinodal: ∂²g/∂x² = 0</code><b>binodal: common tangent</b></div></main></div>;
}

function FugacityCell({ analysis }) {
  if (analysis.gateStatus === 'outside') return <div className="nt-gate-refusal" role="status"><span>GATE / REFUSAL</span><strong>No Z, φ, or f released</strong><p>{analysis.gateReason}</p><div><b>β</b><em>{fixed(analysis.beta,4)}</em><i>allowed ±{fixed(analysis.gate,2)}</i></div><small>The controls are preserved. Change them only if you choose to investigate a different state.</small></div>;
  const shift=clamp((analysis.compressionFactor-1)*620,-54,54);
  const betaPosition=50+clamp(analysis.beta/analysis.gate,-1,1)*46;
  return <div className="nt-fugacity-cell"><svg viewBox="0 0 760 390" role="img" aria-label={`Virial cell with compression factor ${analysis.compressionFactor.toFixed(4)} and fugacity coefficient ${analysis.fugacityCoefficient.toFixed(4)}`}><defs><linearGradient id="ntGasGlass" x1="0" x2="1"><stop stopColor="#69cfd1" stopOpacity=".15"/><stop offset=".5" stopColor="#315bce" stopOpacity=".32"/><stop offset="1" stopColor="#8f65d6" stopOpacity=".18"/></linearGradient></defs><rect className="cell-body" x="74" y="82" width="414" height="190" rx="32"/><rect className="gas-fill" x="94" y="101" width={250+shift} height="152" rx="22"/><g className="piston" transform={`translate(${shift} 0)`}><rect x="344" y="91" width="34" height="172" rx="8"/><line x1="378" x2="548" y1="177" y2="177"/><rect x="548" y="145" width="72" height="64" rx="10"/></g><line className="ideal-piston" x1="344" x2="344" y1="71" y2="280"/><text x="344" y="55">ideal Z = 1</text>{Array.from({length:18},(_,index)=><circle className="gas-dot" key={index} cx={120+(index%6)*38+(index%2)*8} cy={125+Math.floor(index/6)*48} r="5"/>)}<g className="gauge z-gauge"><circle cx="625" cy="92" r="54"/><path d="M589 108 A42 42 0 0 1 661 108"/><line x1="625" y1="108" x2={625+36*Math.sin((analysis.compressionFactor-1)*8)} y2={108-36*Math.cos((analysis.compressionFactor-1)*8)}/><text x="625" y="80">Z</text><text x="625" y="128">{fixed(analysis.compressionFactor,4)}</text></g><g className="gauge phi-gauge"><circle cx="625" cy="254" r="54"/><path d="M589 270 A42 42 0 0 1 661 270"/><line x1="625" y1="270" x2={625+36*Math.sin((analysis.fugacityCoefficient-1)*8)} y2={270-36*Math.cos((analysis.fugacityCoefficient-1)*8)}/><text x="625" y="242">φ</text><text x="625" y="290">{fixed(analysis.fugacityCoefficient,4)}</text></g><text className="cell-label" x="95" y="305">P = {fixed(analysis.input.pressureBar,3)} bar</text><text className="cell-label fugacity" x="95" y="334">f = {fixed(analysis.fugacityBar,3)} bar</text><g className="beta-rail"><line x1="95" x2="488" y1="366" y2="366"/><line x1="95" x2="95" y1="357" y2="375"/><line x1="291.5" x2="291.5" y1="357" y2="375"/><line x1="488" x2="488" y1="357" y2="375"/><circle cx={95+(betaPosition/100)*393} cy="366" r="8"/><text x="95" y="352">−.12</text><text x="291.5" y="352">β = 0</text><text x="488" y="352">+.12</text></g></svg></div>;
}

function FugacityLedger({ analysis }) {
  if(analysis.gateStatus==='outside')return null;
  return <div className="nt-ledger-grid fugacity-ledger"><article><span>dimensionless gate</span><strong>β = BP/RT</strong><b>{fixed(analysis.beta,5)}</b><small>inside ±{fixed(analysis.gate,2)}</small></article><article><span>low-density root</span><strong>ρ</strong><b>{fixed(analysis.densityMolL,5)}</b><small>mol L⁻¹</small></article><article><span>volume departure</span><strong>Z</strong><b>{fixed(analysis.compressionFactor,5)}</b><small>{analysis.departures.compressionFactor} one</small></article><article><span>effective-pressure factor</span><strong>φ</strong><b>{fixed(analysis.fugacityCoefficient,5)}</b><small>{analysis.departures.fugacityCoefficient} one · not Z</small></article><article><span>effective pressure</span><strong>f = φP</strong><b>{fixed(analysis.fugacityBar,4)} bar</b><small>{analysis.departures.fugacityPressure} P</small></article><article><span>synthetic input</span><strong>B</strong><b>{fixed(analysis.input.secondVirialCm3Mol,1)}</b><small>cm³ mol⁻¹ · no named gas</small></article></div>;
}

function FugacityInstrument({state,setState,onScenario,recordAction}){
  const stale=Boolean(state.snapshot&&!sameDraft(state.draft,state.snapshot.draft));
  const update=(key,value)=>setState(previous=>({...previous,draft:{...previous.draft,[key]:value},evaluation:null,error:'',hint:''}));
  const choosePrediction=(key,value)=>setState(previous=>({...previous,prediction:{...previous.prediction,[key]:value},evaluation:null}));
  const release=()=>{try{const analysis=analyzeVirialFugacity(state.draft);setState(previous=>({...previous,snapshot:{draft:{...previous.draft},analysis},evaluation:null,error:'',hint:'',hintLevel:0}));recordAction(analysis.gateStatus==='inside'?`Pressurized virial cell at ${Number(state.draft.pressureBar).toFixed(2)} bar.`:'Pressed the virial gate; result refused.');}catch(error){setState(previous=>({...previous,error:error.message}));}};
  const check=()=>{if(!state.snapshot)return;const evaluation=evaluateFugacityPrediction({analysis:state.snapshot.analysis,prediction:state.prediction});setState(previous=>({...previous,evaluation}));recordAction(`Checked fugacity claims: ${evaluation.correctCount}/4.`);};
  const hint=()=>{if(!state.snapshot)return;const level=Math.min(4,state.hintLevel+1);setState(previous=>({...previous,hintLevel:level,hint:nextFugacityHint({analysis:previous.snapshot.analysis,level})}));recordAction(`Opened fugacity hint ${level}.`);};
  const scenario=FUGACITY_SCENARIO_BY_ID[state.scenarioId];
  return <div className="nt-instrument-shell fugacity-shell" role="tabpanel"><aside className="nt-control-rail"><div className="nt-rail-heading"><span>FUGACITY / φ</span><strong>Pressurize the cell</strong><p>{scenario.intendedContrast}</p></div><CartridgeSelect id="nt-fugacity-cartridge" label="Synthetic virial cartridge" value={state.scenarioId} scenarios={FUGACITY_SCENARIOS} onChange={onScenario}/><NumericControl id="nt-temperature" label="Temperature" symbol="T" value={state.draft.temperatureK} minimum={200} maximum={700} step={1} unit="K" onChange={value=>update('temperatureK',value)}/><NumericControl id="nt-pressure" label="Pressure" symbol="P" value={state.draft.pressureBar} minimum={0.1} maximum={30} step={0.1} unit="bar" onChange={value=>update('pressureBar',value)}/><NumericControl id="nt-second-virial" label="Second virial input" symbol="B" value={state.draft.secondVirialCm3Mol} minimum={-500} maximum={500} step={5} unit="cm³ mol⁻¹" onChange={value=>update('secondVirialCm3Mol',value)}/><PredictionRack groups={FUGACITY_PREDICTIONS} prediction={state.prediction} evaluation={state.evaluation} onChoose={choosePrediction}/><InstrumentActions releaseLabel="Pressurize virial cell" released={Boolean(state.snapshot)} onRelease={release} onCheck={check} onHint={hint} onReset={()=>onScenario(state.scenarioId,true)}/></aside><main className="nt-stage"><SnapshotStatus snapshot={state.snapshot} stale={stale} error={state.error} hint={state.hint}/>{state.snapshot?<><FugacityCell analysis={state.snapshot.analysis}/><FugacityLedger analysis={state.snapshot.analysis}/></>:<BlankInstrument mode="fugacity"/>}<div className="nt-equation-tape"><span>second density virial</span><code>P = ρRT(1 + Bρ)</code><code>ln φ = 2Bρ − ln Z</code><b>release only if |BP/RT| ≤ {NONIDEAL_THERMODYNAMICS_CONSTANTS.virialGate}</b></div></main></div>;
}

function TeacherRail({onLoad}){
  return <section className="nt-teacher-rail"><header><span>TEACHER / CONTRAST DECK</span><strong>Similar words. Different thermodynamic claims.</strong><p>Load a contrast into the controls; the instrument never runs automatically.</p></header><div>{TEACHER_CONTRASTS.map(card=><article key={card.id}><span>{card.mode}</span><h3>{card.title}</h3><dl><div><dt>A</dt><dd>{card.left}</dd></div><div><dt>B</dt><dd>{card.right}</dd></div></dl><p>{card.note}</p><button type="button" onClick={()=>onLoad(card)}>Load contrast — do not run</button></article>)}</div></section>;
}

function ActionHistory({entries}){
  return <aside className="nt-history"><header><span>LEARNER / ACTION TAPE</span><strong>Your moves, not hidden automation</strong></header>{entries.length?<ol>{entries.map(entry=><li key={entry.id}><b>{String(entry.id).padStart(2,'0')}</b><span>{entry.message}</span></li>)}</ol>:<p>No actions yet. Choosing controls is a draft; only releases, checks, hints, and teacher loads enter this tape.</p>}</aside>;
}

function ModelPassport(){
  const passport=MODEL_PASSPORTS.nonidealThermodynamicsObservatory;
  return <section className="nt-passport"><header><span>MODEL / SOURCE PASSPORT</span><strong>{passport.name}</strong><p>{passport.resultKind}</p></header><div className="nt-passport-grid"><article><h3>Three separate models</h3><ul>{passport.conditions.map(item=><li key={item}>{item}</li>)}</ul></article><article><h3>What this can expose</h3><ul>{passport.includes.slice(0,8).map(item=><li key={item}>{item}</li>)}</ul></article><article><h3>What it refuses</h3><ul>{passport.excludes.map(item=><li key={item}>{item}</li>)}</ul></article></div><details><summary>Open primary definitions and model sources <span>{passport.sources.length} records</span></summary><div className="nt-source-grid">{passport.sources.map(sourceId=>{const source=SCIENCE_SOURCES[sourceId];return <a href={source.url} target="_blank" rel="noreferrer" key={sourceId}><span>{source.name}</span><small>{source.role}</small></a>;})}</div></details><footer><p>{passport.inputProvenance}</p><p>{passport.dataStatement}</p><p><b>Global boundary:</b> {NONIDEAL_THERMODYNAMICS_BOUNDARY.excluded}</p></footer></section>;
}

const createModeState=(scenarioId,draft,predictions)=>({scenarioId,draft,snapshot:null,prediction:emptyPrediction(predictions),evaluation:null,error:'',hint:'',hintLevel:0});

export default function NonidealThermodynamicsLab(){
  const [mode,setMode]=useState('activity');
  const [activity,setActivity]=useState(()=>createModeState('positive-azeotrope',activityDraft(ACTIVITY_SCENARIO_BY_ID['positive-azeotrope']),ACTIVITY_PREDICTIONS));
  const [stability,setStability]=useState(()=>createModeState('metastable-inside-gap',stabilityDraft(STABILITY_SCENARIO_BY_ID['metastable-inside-gap']),STABILITY_PREDICTIONS));
  const [fugacity,setFugacity]=useState(()=>createModeState('attractive-departure',fugacityDraft(FUGACITY_SCENARIO_BY_ID['attractive-departure']),FUGACITY_PREDICTIONS));
  const [history,setHistory]=useState([]); const counter=useRef(0);
  const recordAction=(message)=>{const id=counter.current+1;counter.current=id;setHistory(previous=>[{id,message},...previous].slice(0,12));};
  const loadActivity=(scenarioId,isReset=false)=>{const scenario=ACTIVITY_SCENARIO_BY_ID[scenarioId];setActivity(createModeState(scenarioId,activityDraft(scenario),ACTIVITY_PREDICTIONS));recordAction(`${isReset?'Reset':'Loaded'} activity cartridge ${scenario.code}; no result released.`);};
  const loadStability=(scenarioId,isReset=false)=>{const scenario=STABILITY_SCENARIO_BY_ID[scenarioId];setStability(createModeState(scenarioId,stabilityDraft(scenario),STABILITY_PREDICTIONS));recordAction(`${isReset?'Reset':'Loaded'} stability cartridge ${scenario.code}; no result released.`);};
  const loadFugacity=(scenarioId,isReset=false)=>{const scenario=FUGACITY_SCENARIO_BY_ID[scenarioId];setFugacity(createModeState(scenarioId,fugacityDraft(scenario),FUGACITY_PREDICTIONS));recordAction(`${isReset?'Reset':'Loaded'} fugacity cartridge ${scenario.code}; no result released.`);};
  const loadTeacher=(card)=>{setMode(card.mode);if(card.mode==='activity')loadActivity(card.scenarioId);else if(card.mode==='stability')loadStability(card.scenarioId);else loadFugacity(card.scenarioId);recordAction(`Teacher contrast loaded: ${card.title}. Instrument remains unreleased.`);};
  const modeLabel=useMemo(()=>MODES.find(item=>item.id===mode)?.label,[mode]);
  return <section className="nonideal-thermodynamics-lab" id="nonidealThermodynamicsLab" aria-labelledby="nonidealThermodynamicsLabTitle"><header className="nt-hero"><div className="nt-hero-copy"><p className="section-code">16 / Nonideal thermodynamic surfaces</p><h2 id="nonidealThermodynamicsLabTitle">Ideal mixtures draw straight lines. <em>Real interactions bend the map.</em></h2><p>Commit a consequence, release one bounded model, and make activity, phase stability, or effective pressure explain itself—without turning a teaching equation into a property certificate.</p><div><span>synthetic liquid</span><span>symmetric stability</span><span>low-density pure gas</span></div></div><HeroSurface/></header><ModeTabs mode={mode} onChange={(next)=>{setMode(next);recordAction(`Switched to ${MODES.find(item=>item.id===next).label}; saved work preserved.`);}}/><p className="sr-only" aria-live="polite">Active instrument: {modeLabel}</p><div hidden={mode!=='activity'}><ActivityInstrument state={activity} setState={setActivity} onScenario={loadActivity} recordAction={recordAction}/></div><div hidden={mode!=='stability'}><StabilityInstrument state={stability} setState={setStability} onScenario={loadStability} recordAction={recordAction}/></div><div hidden={mode!=='fugacity'}><FugacityInstrument state={fugacity} setState={setFugacity} onScenario={loadFugacity} recordAction={recordAction}/></div><div className="nt-bottom-grid"><TeacherRail onLoad={loadTeacher}/><ActionHistory entries={history}/></div><ModelPassport/></section>;
}
