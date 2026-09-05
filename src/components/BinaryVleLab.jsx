import { useMemo, useRef, useState } from 'react';
import {
  BINARY_VLE_MODEL_BOUNDARY,
  BINARY_VLE_PAIRS,
  BINARY_VLE_PAIR_BY_ID,
  VLE_COMPONENT_BY_ID,
} from '../data/binaryVleScenarios.js';
import {
  analyzeBinaryVle,
  antoineVapourPressureBar,
  binaryPressureWindow,
  createDefaultBinaryVleState,
  createPxyDiagram,
  createTxyDiagram,
  evaluateBinaryVlePrediction,
  idealBubblePressureBar,
  idealBubbleTemperatureK,
  idealDewPressureBar,
  idealDewTemperatureK,
  nextBinaryVleHint,
} from '../chemistry/binaryVle.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../data/scienceSources.js';
import '../styles/binary-vle.css';

const MODES = [
  { id: 'pxy', label: 'Pressure sweep', notation: 'P–x–y', detail: 'hold temperature' },
  { id: 'txy', label: 'Temperature sweep', notation: 'T–x–y', detail: 'hold pressure' },
];

const REGION_CHOICES = [
  { id: 'liquid', label: 'Liquid', glyph: 'L' },
  { id: 'bubble-point', label: 'Bubble point', glyph: 'L│V⁰' },
  { id: 'two-phase', label: 'Liquid + vapour', glyph: 'L+V' },
  { id: 'dew-point', label: 'Dew point', glyph: 'L⁰│V' },
  { id: 'vapour', label: 'Vapour', glyph: 'V' },
];

const ENRICHMENT_CHOICES = [
  { id: 'vapour-richer-in-component-1', label: 'Vapour richer in component 1', detail: 'y₁ > x₁' },
  { id: 'not-comparable', label: 'No two-phase comparison', detail: 'one phase / pure endpoint' },
];

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const fixed = (value, digits = 4) => Number.isFinite(value) ? Number(value).toFixed(digits) : '—';
const percent = (value) => Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '—';

function initialModeState(mode, pairId = 'benzene-toluene') {
  return {
    ...createDefaultBinaryVleState({ pairId, mode }),
    prediction: { region: '', enrichment: '', vapourFraction: '' },
    evaluation: null,
    hints: [],
    referenceReveal: null,
    blockedMessage: '',
  };
}

function pxyPressureBounds(pairId) {
  const pair = BINARY_VLE_PAIR_BY_ID[pairId];
  const component1 = VLE_COMPONENT_BY_ID[pair.component1Id];
  const component2 = VLE_COMPONENT_BY_ID[pair.component2Id];
  const low = antoineVapourPressureBar({ componentId: component2.id, temperatureK: pair.validTemperatureK.minimum }).pressureBar;
  const high = antoineVapourPressureBar({ componentId: component1.id, temperatureK: pair.validTemperatureK.maximum }).pressureBar;
  return { minimum: Math.max(0.001, low * 0.58), maximum: high * 1.24 };
}

function rangeStep(minimum, maximum, divisions = 500) {
  return Number(((maximum - minimum) / divisions).toPrecision(3));
}

function PanelHeading({ eyebrow, title, children }) {
  return <div className="vle-panel-heading"><div><span>{eyebrow}</span><strong>{title}</strong></div>{children}</div>;
}

function PairShelf({ selectedId, onSelect }) {
  return <div className="vle-pair-shelf" aria-label="Virtual binary teaching pairs">{BINARY_VLE_PAIRS.map((pair) => {
    const one = VLE_COMPONENT_BY_ID[pair.component1Id];
    const two = VLE_COMPONENT_BY_ID[pair.component2Id];
    return <button type="button" key={pair.id} className={selectedId === pair.id ? 'selected' : ''} aria-pressed={selectedId === pair.id} onClick={() => onSelect(pair.id)}>
      <span><i style={{ '--pair-color': one.accent }}/><b>{one.formula}</b><em>1</em></span>
      <strong>+</strong>
      <span><i style={{ '--pair-color': two.accent }}/><b>{two.formula}</b><em>2</em></span>
      <small>{pair.name}</small>
    </button>;
  })}</div>;
}

function LinkedControl({ label, symbol, value, minimum, maximum, step, unit, onChange, onCommit, held }) {
  const apply = (event) => {
    const next = event.target.valueAsNumber;
    if (Number.isFinite(next)) onChange(clamp(next, minimum, maximum));
  };
  return <label className={`vle-linked-control ${held ? 'held' : ''}`}>
    <span><b>{symbol}</b>{label}{held && <em>held on map</em>}</span>
    <div><strong>{fixed(value, unit === 'K' ? 2 : unit === 'bar' ? 5 : 3)}</strong><small>{unit}</small></div>
    <input type="range" aria-label={`${label} slider`} min={minimum} max={maximum} step={step} value={value} onChange={apply} onPointerUp={onCommit} onKeyUp={onCommit}/>
    <input type="number" aria-label={`${label} numeric value`} min={minimum} max={maximum} step={step} value={value} onChange={apply} onBlur={onCommit}/>
    <i className="vle-control-track"><span style={{ width: `${clamp((value - minimum) / (maximum - minimum) * 100, 0, 100)}%` }}/></i>
  </label>;
}

function pathFrom(points) {
  return points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
}

function closedRegion(points) {
  return `${pathFrom(points)} Z`;
}

function PhaseMap({ mode, diagram, analysis, revealed }) {
  const width = 720;
  const height = 520;
  const left = 82;
  const right = 674;
  const top = 42;
  const bottom = 452;
  const isPressure = mode === 'pxy';
  const rawValues = isPressure
    ? [...diagram.bubble, ...diagram.dew].map((point) => point.pressureBar).concat(analysis.input.pressureBar)
    : [...diagram.bubble, ...diagram.dew].map((point) => point.temperatureK).concat(analysis.input.temperatureK);
  const rawMinimum = Math.min(...rawValues);
  const rawMaximum = Math.max(...rawValues);
  const padding = Math.max((rawMaximum - rawMinimum) * 0.12, isPressure ? 0.01 : 1.5);
  const minimum = isPressure ? Math.max(0, rawMinimum - padding) : rawMinimum - padding;
  const maximum = rawMaximum + padding;
  const x = (fraction) => left + fraction * (right - left);
  const y = (value) => bottom - (value - minimum) / (maximum - minimum) * (bottom - top);
  const bubble = diagram.bubble.map((point) => ({ x: x(point.x1), y: y(isPressure ? point.pressureBar : point.temperatureK) }));
  const dew = diagram.dew.map((point) => ({ x: x(point.y1), y: y(isPressure ? point.pressureBar : point.temperatureK) }));
  const twoPhase = closedRegion([...bubble, ...[...dew].reverse()]);
  const topRegion = closedRegion([{ x: left, y: top }, { x: right, y: top }, ...[...(isPressure ? bubble : dew)].reverse()]);
  const bottomRegion = closedRegion([{ x: left, y: bottom }, { x: right, y: bottom }, ...[...(isPressure ? dew : bubble)].reverse()]);
  const currentValue = isPressure ? analysis.input.pressureBar : analysis.input.temperatureK;
  const currentY = y(currentValue);
  const tickValues = Array.from({ length: 5 }, (_, index) => minimum + index / 4 * (maximum - minimum));
  const equilibrium = analysis.equilibrium;
  const tieVisible = revealed && equilibrium.tieLineAvailable;
  const aria = `${isPressure ? 'Pressure-composition' : 'Temperature-composition'} diagram for ${analysis.pair.name}. Current state: component-1 overall amount fraction ${analysis.input.overallFraction1.toFixed(3)}, ${isPressure ? `${analysis.input.pressureBar.toFixed(4)} bar at ${analysis.input.temperatureK.toFixed(2)} kelvin` : `${analysis.input.temperatureK.toFixed(2)} kelvin at ${analysis.input.pressureBar.toFixed(4)} bar`}. ${revealed ? `Model region ${analysis.region.label}.` : 'Equilibrium tie line sealed until check or explicit reference.'}`;
  return <div className="vle-map-frame">
    <div className="vle-map-status"><span><i/>live state intersection</span><b>{revealed ? analysis.region.label : 'classification sealed'}</b></div>
    <svg className="vle-phase-map" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={aria}>
      <title>{isPressure ? 'P–x–y equilibrium map' : 'T–x–y equilibrium map'}</title>
      <desc>Bubble and dew boundaries divide liquid, liquid plus vapour, and vapour regions. A feed marker shows z1 and the selected state. Equilibrium x1 and y1 appear only after reveal.</desc>
      <defs>
        <pattern id={`vleMapGrid-${mode}`} width="29.6" height="29.6" patternUnits="userSpaceOnUse"><path d="M29.6 0H0V29.6"/></pattern>
        <filter id={`vleMapGlow-${mode}`} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect className="vle-map-field" x={left} y={top} width={right - left} height={bottom - top}/>
      <rect className="vle-map-grid" x={left} y={top} width={right - left} height={bottom - top} fill={`url(#vleMapGrid-${mode})`}/>
      <path className={`vle-region-fill ${isPressure ? 'liquid' : 'vapour'}`} d={topRegion}/>
      <path className="vle-region-fill two-phase" d={twoPhase}/>
      <path className={`vle-region-fill ${isPressure ? 'vapour' : 'liquid'}`} d={bottomRegion}/>
      {tickValues.map((tick) => <g className="vle-y-tick" key={tick}><line x1={left} x2={right} y1={y(tick)} y2={y(tick)}/><text x={left - 11} y={y(tick) + 4} textAnchor="end">{isPressure ? tick.toFixed(3) : tick.toFixed(1)}</text></g>)}
      {[0, .25, .5, .75, 1].map((tick) => <g className="vle-x-tick" key={tick}><line x1={x(tick)} x2={x(tick)} y1={top} y2={bottom}/><text x={x(tick)} y={bottom + 22} textAnchor="middle">{tick.toFixed(2)}</text></g>)}
      <path className="vle-boundary bubble" d={pathFrom(bubble)}/>
      <path className="vle-boundary dew" d={pathFrom(dew)}/>
      <text className="vle-region-label liquid" x={right - 52} y={isPressure ? top + 31 : bottom - 22}>LIQUID</text>
      <text className="vle-region-label two-phase" x={(left + right) / 2} y={(top + bottom) / 2}>L + V</text>
      <text className="vle-region-label vapour" x={left + 55} y={isPressure ? bottom - 22 : top + 31}>VAPOUR</text>
      <line className="vle-feed-guide" x1={x(analysis.input.overallFraction1)} x2={x(analysis.input.overallFraction1)} y1={top} y2={bottom}/>
      <line className="vle-state-guide" x1={left} x2={right} y1={currentY} y2={currentY}/>
      {tieVisible && <g className="vle-tie-line" filter={`url(#vleMapGlow-${mode})`}>
        <line x1={x(equilibrium.liquidAmountFraction1)} x2={x(equilibrium.vapourAmountFraction1)} y1={currentY} y2={currentY}/>
        <circle cx={x(equilibrium.liquidAmountFraction1)} cy={currentY} r="8"/><circle cx={x(equilibrium.vapourAmountFraction1)} cy={currentY} r="8"/>
        <text x={x(equilibrium.liquidAmountFraction1)} y={currentY - 15} textAnchor="middle">x₁ {equilibrium.liquidAmountFraction1.toFixed(3)}</text>
        <text x={x(equilibrium.vapourAmountFraction1)} y={currentY - 15} textAnchor="middle">y₁ {equilibrium.vapourAmountFraction1.toFixed(3)}</text>
      </g>}
      <g className={`vle-feed-marker ${revealed ? 'revealed' : ''}`} transform={`translate(${x(analysis.input.overallFraction1)} ${currentY})`}>
        <circle r="13"/><circle r="5"/><text x="18" y="4">z₁</text>
      </g>
      <g className="vle-curve-label bubble" transform={`translate(${bubble[Math.floor(bubble.length * .72)].x} ${bubble[Math.floor(bubble.length * .72)].y})`}><rect x="-36" y="-13" width="72" height="20" rx="6"/><text textAnchor="middle" y="2">bubble</text></g>
      <g className="vle-curve-label dew" transform={`translate(${dew[Math.floor(dew.length * .28)].x} ${dew[Math.floor(dew.length * .28)].y})`}><rect x="-30" y="-13" width="60" height="20" rx="6"/><text textAnchor="middle" y="2">dew</text></g>
      <text className="vle-axis-title" x={(left + right) / 2} y={height - 12} textAnchor="middle">component 1 amount fraction · x₁ liquid / y₁ vapour / z₁ overall</text>
      <text className="vle-axis-title" x="19" y={(top + bottom) / 2} textAnchor="middle" transform={`rotate(-90 19 ${(top + bottom) / 2})`}>{isPressure ? 'total pressure / bar' : 'temperature / K'}</text>
    </svg>
    <div className="vle-map-key"><span><i className="bubble"/>bubble boundary</span><span><i className="dew"/>dew boundary</span><span><i className="feed"/>your z₁ state</span><span><i className="tie"/>equilibrium tie line</span></div>
  </div>;
}

const PARTICLE_POINTS = Array.from({ length: 34 }, (_, index) => ({
  x: 116 + (index * 73 % 248),
  y: (index * 47 % 100) / 100,
  r: 4.2 + (index % 3) * .65,
}));

function ParticleCloud({ phase, amount, composition1, top, bottom }) {
  if (!(amount > 0) || !Number.isFinite(composition1)) return null;
  const count = Math.max(2, Math.round(PARTICLE_POINTS.length * amount));
  return <g className={`vle-particles ${phase}`}>{PARTICLE_POINTS.slice(0, count).map((point, index) => {
    const scrambled = ((index * 11) % Math.max(1, count)) / Math.max(1, count - 1);
    const component = scrambled < composition1 ? 'one' : 'two';
    return <circle key={`${phase}-${index}`} className={component} cx={point.x} cy={top + 12 + point.y * Math.max(8, bottom - top - 24)} r={point.r}/>;
  })}</g>;
}

function FeedParticles({ composition1 }) {
  return <g className="vle-feed-particles">{PARTICLE_POINTS.slice(0, 24).map((point, index) => {
    const component = ((index * 7) % 24) / 23 < composition1 ? 'one' : 'two';
    return <circle key={index} className={component} cx={116 + (index * 73 % 248)} cy={240 + ((index * 43) % 92)} r={point.r}/>;
  })}</g>;
}

function SplitVessel({ analysis, revealed }) {
  const { equilibrium, component1, component2 } = analysis;
  const chamberTop = 94;
  const chamberBottom = 468;
  const chamberHeight = chamberBottom - chamberTop;
  const splitY = chamberTop + equilibrium.vapourFraction * chamberHeight;
  const liquidTop = splitY;
  const vapourBottom = splitY;
  const resultCopy = revealed
    ? `${analysis.region.label}. Liquid amount fraction ${equilibrium.liquidFraction.toFixed(3)}, vapour amount fraction ${equilibrium.vapourFraction.toFixed(3)}.${equilibrium.tieLineAvailable ? ` Liquid x1 ${equilibrium.liquidAmountFraction1.toFixed(3)}, vapour y1 ${equilibrium.vapourAmountFraction1.toFixed(3)}.` : ''}`
    : `Sealed feed at overall component-1 amount fraction ${analysis.input.overallFraction1.toFixed(3)}. Phase amounts and compositions hidden.`;
  return <div className={`vle-vessel-frame ${revealed ? 'revealed' : 'sealed'}`}>
    <div className="vle-vessel-status"><span>sealed equilibrium cell</span><b>{revealed ? analysis.region.shortLabel : 'ports shuttered'}</b></div>
    <svg className="vle-vessel" viewBox="0 0 480 570" role="img" aria-label={`Symbolic equilibrium amount register. ${resultCopy}`}>
      <title>Split liquid-vapour equilibrium vessel</title>
      <desc>After reveal, chamber heights encode phase amount fractions rather than physical volumes. Particle colour ratios encode phase compositions and do not simulate motion.</desc>
      <defs>
        <linearGradient id="vleGlass" x1="0" x2="1"><stop offset="0" stopColor="#8ecfe0" stopOpacity=".16"/><stop offset=".45" stopColor="#e8fbff" stopOpacity=".44"/><stop offset="1" stopColor="#7cc6d8" stopOpacity=".12"/></linearGradient>
        <linearGradient id="vleLiquid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1ac6b4" stopOpacity=".48"/><stop offset="1" stopColor="#695dd8" stopOpacity=".42"/></linearGradient>
        <linearGradient id="vleVapour" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffb33f" stopOpacity=".08"/><stop offset="1" stopColor="#1ac6b4" stopOpacity=".18"/></linearGradient>
        <clipPath id="vleChamberClip"><rect x="96" y={chamberTop} width="288" height={chamberHeight} rx="80"/></clipPath>
        <filter id="vleVesselGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <g className="vle-manifold"><path d="M146 68V34H334V68M188 34V16M292 34V16"/><circle cx="188" cy="15" r="8"/><circle cx="292" cy="15" r="8"/><path d="M72 222H38V346H72M408 222H442V346H408"/></g>
      <rect className="vle-vessel-shell" x="82" y="68" width="316" height="430" rx="104"/>
      <rect className="vle-vessel-glass" x="96" y={chamberTop} width="288" height={chamberHeight} rx="80" fill="url(#vleGlass)"/>
      {!revealed && <g clipPath="url(#vleChamberClip)">
        <rect className="vle-feed-band" x="96" y="214" width="288" height="142"/>
        <FeedParticles composition1={analysis.input.overallFraction1}/>
        <path className="vle-shutter" d="M96 202H384M96 368H384"/>
        <text className="vle-sealed-copy" x="240" y="290" textAnchor="middle">PHASE PORTS SEALED</text>
        <text className="vle-sealed-subcopy" x="240" y="310" textAnchor="middle">commit or load a reference</text>
      </g>}
      {revealed && <g clipPath="url(#vleChamberClip)">
        {equilibrium.vapourFraction > 0 && <rect className="vle-vapour-phase" x="96" y={chamberTop} width="288" height={Math.max(0, vapourBottom - chamberTop)} fill="url(#vleVapour)"/>}
        {equilibrium.liquidFraction > 0 && <rect className="vle-liquid-phase" x="96" y={liquidTop} width="288" height={Math.max(0, chamberBottom - liquidTop)} fill="url(#vleLiquid)"/>}
        <ParticleCloud phase="vapour" amount={equilibrium.vapourFraction} composition1={equilibrium.vapourAmountFraction1} top={chamberTop} bottom={vapourBottom}/>
        <ParticleCloud phase="liquid" amount={equilibrium.liquidFraction} composition1={equilibrium.liquidAmountFraction1} top={liquidTop} bottom={chamberBottom}/>
        {equilibrium.liquidFraction > 0 && equilibrium.vapourFraction > 0 && <path className="vle-meniscus" d={`M96 ${splitY} Q240 ${splitY - 12} 384 ${splitY}`}/>} 
      </g>}
      {revealed && equilibrium.tieLineAvailable && <g className="vle-vessel-tie" filter="url(#vleVesselGlow)">
        <path d="M76 392H48V178H404V392H432"/>
        <circle cx="48" cy="392" r="8"/><circle cx="432" cy="178" r="8"/>
      </g>}
      <g className="vle-vessel-port liquid" transform="translate(26 392)"><rect width="126" height="54" rx="12"/><text x="12" y="19">LIQUID PORT · x₁</text><text x="12" y="41">{revealed && equilibrium.liquidAmountFraction1 !== null ? equilibrium.liquidAmountFraction1.toFixed(4) : 'sealed'}</text></g>
      <g className="vle-vessel-port vapour" transform="translate(328 124)"><rect width="126" height="54" rx="12"/><text x="12" y="19">VAPOUR PORT · y₁</text><text x="12" y="41">{revealed && equilibrium.vapourAmountFraction1 !== null ? equilibrium.vapourAmountFraction1.toFixed(4) : 'sealed'}</text></g>
      <g className="vle-phase-register" transform="translate(118 505)"><rect width="244" height="45" rx="13"/><text x="16" y="18">SYMBOLIC AMOUNT REGISTER · NOT VOLUME</text><text x="16" y="36">L {revealed ? equilibrium.liquidFraction.toFixed(3) : '—'}  /  V {revealed ? equilibrium.vapourFraction.toFixed(3) : '—'}</text></g>
      <g className="vle-particle-key" transform="translate(112 78)"><circle className="one" cx="6" cy="6" r="5"/><text x="17" y="10">{component1.formula} · component 1</text><circle className="two" cx="164" cy="6" r="5"/><text x="175" y="10">{component2.formula} · component 2</text></g>
    </svg>
  </div>;
}

function PredictionConsole({ state, analysis, onPrediction, onCheck, onHint, onReference }) {
  const evaluation = state.evaluation;
  return <aside className="vle-prediction vle-card">
    <PanelHeading eyebrow="Your claim" title="Predict before opening the ports"><span className="vle-ungraded">wrong answers stay</span></PanelHeading>
    <fieldset className="vle-region-choice"><legend>1 · Which phase region?</legend><div>{REGION_CHOICES.map((choice) => <button type="button" key={choice.id} className={state.prediction.region === choice.id ? 'selected' : ''} aria-pressed={state.prediction.region === choice.id} onClick={() => onPrediction('region', choice.id)}><b>{choice.glyph}</b><span>{choice.label}</span></button>)}</div></fieldset>
    <fieldset className="vle-enrichment-choice"><legend>2 · Compare phase composition</legend>{ENRICHMENT_CHOICES.map((choice) => <button type="button" key={choice.id} className={state.prediction.enrichment === choice.id ? 'selected' : ''} aria-pressed={state.prediction.enrichment === choice.id} onClick={() => onPrediction('enrichment', choice.id)}><i/><span><strong>{choice.label}</strong><small>{choice.detail}</small></span></button>)}</fieldset>
    <label className="vle-vapour-prediction"><span>3 · Predict vapour phase amount <b>V</b></span><div><input aria-label="Predicted vapour phase amount fraction" type="number" min="0" max="1" step="0.01" placeholder="0.00–1.00" value={state.prediction.vapourFraction} onChange={(event) => onPrediction('vapourFraction', event.target.value)}/><small>amount fraction · raw entry retained</small></div></label>
    <div className="vle-prediction-actions"><button type="button" className="vle-check" onClick={onCheck}>Open ports + check <span aria-hidden="true">→</span></button><button type="button" className="vle-hint" onClick={onHint} disabled={state.hints.length >= 4}>Hint {Math.min(4, state.hints.length + 1)}</button></div>
    {state.blockedMessage && <div className="vle-blocked" aria-live="polite"><strong>Prediction incomplete</strong><p>{state.blockedMessage}</p></div>}
    {state.hints.length > 0 && <div className="vle-hint-stack">{state.hints.map((hint, index) => <p key={index}><b>{index + 1}</b>{hint}</p>)}</div>}
    <div className="vle-reference-rack"><span>Explicit model references</span><div><button type="button" onClick={() => onReference('bubble')}>Set bubble boundary</button><button type="button" onClick={() => onReference('midpoint')}>Set two-phase midpoint</button><button type="button" onClick={() => onReference('dew')}>Set dew boundary</button></div><small>Changes only {state.mode === 'pxy' ? 'pressure' : 'temperature'} · keeps your predictions</small></div>
    <div className={`vle-evaluation ${evaluation ? evaluation.allCorrect ? 'correct' : 'inspect' : state.referenceReveal ? 'reference' : 'waiting'}`} aria-live="polite">
      {!evaluation && !state.referenceReveal && <><strong>Evidence is visible; answers are sealed.</strong><p>Use both curves and the state intersection before committing.</p></>}
      {!evaluation && state.referenceReveal && <><strong>{state.referenceReveal} reference loaded.</strong><p>The model ports are open by your explicit action. Your prediction has not been scored.</p></>}
      {evaluation && <>
        <strong>{evaluation.allCorrect ? 'All three claims reconcile.' : 'Keep the attempt. Inspect each dimension.'}</strong>
        <div>{Object.entries(evaluation.dimensions).map(([key, result]) => <article className={result.correct ? 'correct' : 'incorrect'} key={key}><span>{key === 'vapourFraction' ? 'phase amount' : key}</span><b>{result.correct ? 'matched' : 'compare'}</b><p>{result.reason}</p></article>)}</div>
      </>}
    </div>
  </aside>;
}

function EquilibriumLedger({ analysis, revealed }) {
  const { equilibrium, partialPressures, balances } = analysis;
  return <section className="vle-ledger vle-card">
    <PanelHeading eyebrow="Equation ledger" title="One tie line, three closure tests"><span className={revealed ? 'open' : 'sealed'}>{revealed ? 'evidence open' : 'sealed'}</span></PanelHeading>
    <div className="vle-pure-ledger">
      <article className="one"><span>component 1 pure pressure</span><strong>p₁* = {fixed(analysis.pure.component1PressureBar, 5)} bar</strong><small>{analysis.component1.name} · more volatile here</small></article>
      <i>›</i>
      <article className="two"><span>component 2 pure pressure</span><strong>p₂* = {fixed(analysis.pure.component2PressureBar, 5)} bar</strong><small>{analysis.component2.name}</small></article>
    </div>
    <div className="vle-boundary-ledger"><div><span>bubble at z₁</span><strong>{fixed(analysis.boundaries.bubblePressureBar, 5)} bar</strong><code>Σ xᵢpᵢ*</code></div><div><span>your pressure</span><strong>{fixed(analysis.input.pressureBar, 5)} bar</strong><code>{revealed ? analysis.region.shortLabel : 'classify it'}</code></div><div><span>dew at z₁</span><strong>{fixed(analysis.boundaries.dewPressureBar, 5)} bar</strong><code>1 / Σ(yᵢ/pᵢ*)</code></div></div>
    {!revealed && <div className="vle-ledger-shutter"><i/><strong>Equilibrium composition and amount ledgers are shuttered.</strong><p>Checking or loading a named reference opens the model result without changing your prediction.</p></div>}
    {revealed && <>
      <div className="vle-equilibrium-numbers">
        <article><span>liquid composition</span><strong>x₁</strong><b>{equilibrium.liquidAmountFraction1 === null ? 'absent' : equilibrium.liquidAmountFraction1.toFixed(5)}</b></article>
        <article><span>overall feed</span><strong>z₁</strong><b>{analysis.input.overallFraction1.toFixed(5)}</b></article>
        <article><span>vapour composition</span><strong>y₁</strong><b>{equilibrium.vapourAmountFraction1 === null ? 'absent' : equilibrium.vapourAmountFraction1.toFixed(5)}</b></article>
        <article className="amount"><span>liquid amount</span><strong>L</strong><b>{percent(equilibrium.liquidFraction)}</b></article>
        <article className="amount"><span>vapour amount</span><strong>V</strong><b>{percent(equilibrium.vapourFraction)}</b></article>
      </div>
      {partialPressures && balances ? <div className="vle-closure-grid">
        <article><span>component 1 pressure</span><code>x₁p₁* = y₁p</code><strong>{fixed(partialPressures.component1FromLiquidBar, 6)} = {fixed(partialPressures.component1FromVapourBar, 6)}</strong><small>closure {partialPressures.component1ClosureBar.toExponential(2)} bar</small></article>
        <article><span>component 2 pressure</span><code>x₂p₂* = y₂p</code><strong>{fixed(partialPressures.component2FromLiquidBar, 6)} = {fixed(partialPressures.component2FromVapourBar, 6)}</strong><small>closure {partialPressures.component2ClosureBar.toExponential(2)} bar</small></article>
        <article><span>pressure sum</span><code>p₁ + p₂ = p</code><strong>{fixed(partialPressures.sumBar, 6)} bar</strong><small>closure {partialPressures.totalClosureBar.toExponential(2)} bar</small></article>
        <article><span>phase amount</span><code>L + V = 1</code><strong>{fixed(balances.phaseFractionSum, 8)}</strong><small>closure {balances.phaseFractionClosure.toExponential(2)}</small></article>
        <article><span>component balance</span><code>Lx₁ + Vy₁ = z₁</code><strong>{fixed(balances.reconstructedOverallFraction1, 8)}</strong><small>closure {balances.component1Closure.toExponential(2)}</small></article>
      </div> : <div className="vle-one-phase-note"><strong>No absent-phase composition is invented.</strong><p>{equilibrium.phaseAmountMeaning}</p></div>}
    </>}
  </section>;
}

function ActivityTrace({ entries }) {
  return <aside className="vle-trace vle-card"><PanelHeading eyebrow="Learner-owned trace" title="Actions, not hidden automation"/><div className="vle-trace-list">{entries.map((entry) => <article className={entry.kind} key={entry.id}><i/><span>{entry.kind}</span><strong>{entry.title}</strong><p>{entry.detail}</p></article>)}</div><details className="vle-teacher-lens"><summary>Teacher lens · four prompts</summary><div><p><b>Map:</b> Why does holding T produce a pressure map, while holding p produces a temperature map?</p><p><b>Endpoints:</b> Why do both curves meet the corresponding pure-component saturation state at amount fractions zero and one?</p><p><b>Boundary:</b> Why is V = 0 at the bubble point and V = 1 at the dew point even though both phases define an equilibrium tie line?</p><p><b>Assumption:</b> Which equalities fail first when γᵢ or φᵢ is not one?</p></div></details></aside>;
}

function VlePassport() {
  const passport = MODEL_PASSPORTS.binaryVleNavigator;
  return <section className="vle-passport vle-card">
    <PanelHeading eyebrow="Model + data passport" title={passport.name}><span>open-source boundary</span></PanelHeading>
    <div className="vle-passport-verdict"><i/>{passport.resultKind}</div>
    <div className="vle-passport-copy"><p>{passport.inputProvenance}</p><p>{passport.dataStatement}</p><strong>{BINARY_VLE_MODEL_BOUNDARY.hazard}</strong></div>
    <div className="vle-passport-equations"><span>Equations in use</span><code>pᵢ = xᵢ pᵢ* = yᵢ p</code><code>p = Σ xᵢ pᵢ*</code><code>1/p = Σ(yᵢ/pᵢ*)</code><code>z₁ = Lx₁ + Vy₁</code></div>
    <div className="vle-passport-groups"><div><span>Included</span>{passport.includes.map((item) => <b key={item}>{item}</b>)}</div><div className="excluded"><span>Not included</span>{passport.excludes.map((item) => <b key={item}>{item}</b>)}</div></div>
    <div className="vle-sources"><span>Primary references</span>{passport.sources.map((sourceId) => { const source = SCIENCE_SOURCES[sourceId]; return <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><strong>{source.name}</strong><small>{source.role}</small><b aria-hidden="true">↗</b></a>; })}</div>
  </section>;
}

export default function BinaryVleLab() {
  const [mode, setMode] = useState('pxy');
  const [modeStates, setModeStates] = useState(() => ({
    pxy: initialModeState('pxy'),
    txy: initialModeState('txy'),
  }));
  const [trace, setTrace] = useState([{ id: 0, kind: 'start', title: 'Binary navigator ready', detail: 'Both modes begin at an unscored two-phase state. No equilibrium composition is revealed.' }]);
  const traceId = useRef(1);
  const state = modeStates[mode];
  const pair = BINARY_VLE_PAIR_BY_ID[state.pairId];
  const analysis = useMemo(() => analyzeBinaryVle(state), [state.pairId, state.temperatureK, state.pressureBar, state.overallFraction1]);
  const diagram = useMemo(() => mode === 'pxy'
    ? createPxyDiagram({ pairId: state.pairId, temperatureK: state.temperatureK, pointCount: 101 })
    : createTxyDiagram({ pairId: state.pairId, pressureBar: state.pressureBar, pointCount: 81 }),
  [mode, state.pairId, state.temperatureK, state.pressureBar]);
  const pressureWindow = useMemo(() => binaryPressureWindow(state.pairId), [state.pairId]);
  const pressureBounds = useMemo(() => mode === 'pxy' ? pxyPressureBounds(state.pairId) : { minimum: pressureWindow.minimumBar, maximum: pressureWindow.maximumBar }, [mode, state.pairId, pressureWindow]);
  const revealed = Boolean(state.evaluation || state.referenceReveal);

  const record = (kind, title, detail) => {
    const id = traceId.current++;
    setTrace((current) => [{ id, kind, title, detail }, ...current].slice(0, 16));
  };
  const patchActive = (patch, seal = true) => setModeStates((current) => ({
    ...current,
    [mode]: {
      ...current[mode],
      ...patch,
      ...(seal ? { evaluation: null, referenceReveal: null, blockedMessage: '' } : {}),
    },
  }));
  const changePhysical = (key, value) => patchActive({ [key]: value });
  const commitState = () => record('state', `${mode.toUpperCase()} state adjusted`, `${pair.name} · T ${state.temperatureK.toFixed(2)} K · p ${state.pressureBar.toFixed(5)} bar · z₁ ${state.overallFraction1.toFixed(3)}. Prior check sealed; predictions retained.`);
  const changeMode = (nextMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    const next = modeStates[nextMode];
    record('mode', `${nextMode === 'pxy' ? 'Pressure' : 'Temperature'} sweep opened`, `${BINARY_VLE_PAIR_BY_ID[next.pairId].name}; the other mode's complete state remains stored.`);
  };
  const changePair = (pairId) => {
    if (pairId === state.pairId) return;
    const next = initialModeState(mode, pairId);
    setModeStates((current) => ({ ...current, [mode]: next }));
    record('pair', `${BINARY_VLE_PAIR_BY_ID[pairId].name} loaded`, `Only ${mode.toUpperCase()} reset to its computed midpoint; the other mode retained its state.`);
  };
  const changePrediction = (key, value) => setModeStates((current) => ({
    ...current,
    [mode]: {
      ...current[mode],
      prediction: { ...current[mode].prediction, [key]: value },
      evaluation: null,
      blockedMessage: '',
    },
  }));
  const checkPrediction = () => {
    const { prediction } = state;
    if (!prediction.region || !prediction.enrichment || prediction.vapourFraction === '') {
      const missing = [!prediction.region && 'phase region', !prediction.enrichment && 'phase comparison', prediction.vapourFraction === '' && 'vapour amount V'].filter(Boolean).join(', ');
      patchActive({ blockedMessage: `Complete ${missing} before checking.` }, false);
      record('blocked', 'Check stopped', `Missing learner-owned prediction: ${missing}. Nothing was auto-filled.`);
      return;
    }
    const evaluation = evaluateBinaryVlePrediction({ analysis, prediction });
    patchActive({ evaluation, blockedMessage: '' }, false);
    record(evaluation.allCorrect ? 'correct' : 'inspect', evaluation.allCorrect ? 'Three claims reconciled' : 'Attempt preserved for comparison', `${analysis.region.label}; expected V ${analysis.equilibrium.vapourFraction.toFixed(4)}. Learner entries remain unchanged.`);
  };
  const revealHint = () => {
    const nextLevel = Math.min(4, state.hints.length + 1);
    const hint = nextBinaryVleHint({ analysis, level: nextLevel });
    patchActive({ hints: [...state.hints, hint] }, false);
    record('hint', `Equilibrium hint ${nextLevel}`, hint);
  };
  const loadReference = (kind) => {
    const z1 = state.overallFraction1;
    let nextValue;
    if (mode === 'pxy') {
      const bubble = idealBubblePressureBar({ pairId: state.pairId, temperatureK: state.temperatureK, x1: z1 }).pressureBar;
      const dew = idealDewPressureBar({ pairId: state.pairId, temperatureK: state.temperatureK, y1: z1 }).pressureBar;
      nextValue = kind === 'bubble' ? bubble : kind === 'dew' ? dew : (bubble + dew) / 2;
      patchActive({ pressureBar: nextValue, evaluation: null, referenceReveal: kind, blockedMessage: '' }, false);
      record('reference', `${kind} pressure loaded`, `${nextValue.toFixed(6)} bar at ${state.temperatureK.toFixed(2)} K; predictions preserved.`);
    } else {
      const bubble = idealBubbleTemperatureK({ pairId: state.pairId, pressureBar: state.pressureBar, x1: z1 }).temperatureK;
      const dew = idealDewTemperatureK({ pairId: state.pairId, pressureBar: state.pressureBar, y1: z1 }).temperatureK;
      nextValue = kind === 'bubble' ? bubble : kind === 'dew' ? dew : (bubble + dew) / 2;
      patchActive({ temperatureK: nextValue, evaluation: null, referenceReveal: kind, blockedMessage: '' }, false);
      record('reference', `${kind} temperature loaded`, `${nextValue.toFixed(6)} K at ${state.pressureBar.toFixed(5)} bar; predictions preserved.`);
    }
  };

  const temperatureStep = .05;
  const pressureStep = rangeStep(pressureBounds.minimum, pressureBounds.maximum);
  return <section className="binary-vle-lab" id="binaryVleLab" aria-labelledby="binaryVleLabTitle">
    <header className="vle-header"><div><p className="section-code">15 / Binary liquid–vapour equilibrium</p><h2 id="binaryVleLabTitle">A mixture does not boil at one composition. Follow both phases.</h2><p>Hold temperature or pressure, commit a phase claim, then open a tie line and make every partial pressure and phase amount balance.</p></div><div className="vle-condition-stamp"><span>Declared ideal-binary navigator</span><strong>Raoult · P–x–y · T–x–y · lever rule</strong><small>Two virtual pairs · ranged pure data · no process design</small></div></header>

    <nav className="vle-mode-tabs" role="tablist" aria-label="Binary equilibrium diagrams">{MODES.map((item) => <button type="button" role="tab" id={`vleMode-${item.id}`} aria-selected={mode === item.id} key={item.id} className={mode === item.id ? 'selected' : ''} onClick={() => changeMode(item.id)}><i>{item.notation}</i><span><strong>{item.label}</strong><small>{item.detail}</small></span><b>{mode === item.id ? 'live' : 'stored'}</b></button>)}</nav>

    <div className="vle-bench">
      <aside className="vle-controls vle-card">
        <PanelHeading eyebrow="State manifold" title="Choose a pair, then move one state"><span>{mode === 'pxy' ? 'T fixed on map' : 'p fixed on map'}</span></PanelHeading>
        <PairShelf selectedId={state.pairId} onSelect={changePair}/>
        <div className="vle-pair-question"><span>Question to carry</span><p>{pair.teachingQuestion}</p></div>
        <div className="vle-control-stack">
          <LinkedControl label="Temperature" symbol="T" unit="K" value={state.temperatureK} minimum={pair.validTemperatureK.minimum} maximum={pair.validTemperatureK.maximum} step={temperatureStep} held={mode === 'pxy'} onChange={(value) => changePhysical('temperatureK', value)} onCommit={commitState}/>
          <LinkedControl label="Total pressure" symbol="p" unit="bar" value={state.pressureBar} minimum={pressureBounds.minimum} maximum={pressureBounds.maximum} step={pressureStep} held={mode === 'txy'} onChange={(value) => changePhysical('pressureBar', value)} onCommit={commitState}/>
          <LinkedControl label="Overall component-1 fraction" symbol="z₁" unit="amount fraction" value={state.overallFraction1} minimum={0} maximum={1} step={.005} held={false} onChange={(value) => changePhysical('overallFraction1', value)} onCommit={commitState}/>
        </div>
        <div className="vle-component-ledger"><article><i style={{ '--component-color': analysis.component1.accent }}/><span><b>1 · {analysis.component1.name}</b><small>{analysis.component1.formula} · CAS {analysis.component1.cas}</small></span><strong>p₁* {fixed(analysis.pure.component1PressureBar, 4)} bar</strong></article><article><i style={{ '--component-color': analysis.component2.accent }}/><span><b>2 · {analysis.component2.name}</b><small>{analysis.component2.formula} · CAS {analysis.component2.cas}</small></span><strong>p₂* {fixed(analysis.pure.component2PressureBar, 4)} bar</strong></article></div>
        <details className="vle-boundary-note"><summary>Why this virtual pair is bounded</summary><p>{pair.idealityBoundary}</p><p>{pair.hazardBoundary}</p><small>Shared correlation window: {pair.validTemperatureK.minimum.toFixed(2)}–{pair.validTemperatureK.maximum.toFixed(2)} K{mode === 'txy' ? ` · bounded pressure ${pressureWindow.minimumBar.toFixed(4)}–${pressureWindow.maximumBar.toFixed(4)} bar` : ''}</small></details>
      </aside>

      <section className="vle-map vle-card"><PanelHeading eyebrow={`${mode === 'pxy' ? 'Isothermal' : 'Isobaric'} phase map`} title={`${mode === 'pxy' ? 'Pressure' : 'Temperature'} versus amount fraction`}><span className="vle-held-badge">held {mode === 'pxy' ? `T ${state.temperatureK.toFixed(2)} K` : `p ${state.pressureBar.toFixed(5)} bar`}</span></PanelHeading><PhaseMap mode={mode} diagram={diagram} analysis={analysis} revealed={revealed}/><div className="vle-map-equations"><code>{mode === 'pxy' ? 'pBubble = x₁p₁* + x₂p₂*' : 'solve p = Σxᵢpᵢ*(T)'}</code><i>↔</i><code>{mode === 'pxy' ? '1/pDew = y₁/p₁* + y₂/p₂*' : 'solve 1/p = Σyᵢ/pᵢ*(T)'}</code></div></section>

      <section className="vle-vessel-panel vle-card"><PanelHeading eyebrow="Phase amount observatory" title="The vessel answers only after you commit"><span>{revealed ? 'ports open' : 'opaque feed'}</span></PanelHeading><SplitVessel analysis={analysis} revealed={revealed}/><p className="vle-vessel-boundary">Particles are deterministic composition tokens. Chamber height is a symbolic amount register—not physical phase volume, dynamics, or a rate.</p></section>

      <PredictionConsole state={state} analysis={analysis} onPrediction={changePrediction} onCheck={checkPrediction} onHint={revealHint} onReference={loadReference}/>
      <EquilibriumLedger analysis={analysis} revealed={revealed}/>
      <ActivityTrace entries={trace}/>
      <VlePassport/>
    </div>
  </section>;
}
