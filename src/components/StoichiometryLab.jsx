import { useMemo, useRef, useState } from 'react';
import {
  STOICHIOMETRY_CONSTANTS,
  STOICHIOMETRY_SCENARIO_LIST,
  stoichiometryScenarioById,
} from '../data/stoichiometryScenarios.js';
import {
  STOICHIOMETRY_MODEL_BOUNDARY,
  analyzeChemicalYield,
  analyzeStoichiometry,
  createExtentTrace,
  evaluateStoichiometryPrediction,
} from '../chemistry/stoichiometry.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../data/scienceSources.js';
import '../styles/stoichiometry.css';

const cloneFeeds = (scenario) => Object.fromEntries(
  Object.entries(scenario.defaultFeeds).map(([id, feed]) => [id, { ...feed }]),
);
const compact = (value, digits = 3) => {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1e6 || (Math.abs(value) > 0 && Math.abs(value) < 1e-3)) return value.toExponential(2);
  return value.toFixed(digits);
};
const entities = (value) => value === 0 ? '0' : value.toExponential(3);

function ScenarioRail({ scenario, onChoose }) {
  return <aside className="stoich-scenarios stoich-card">
    <div className="stoich-panel-heading"><span>Declared equation deck</span><strong>Choose the recipe before the quantities</strong></div>
    <div className="stoich-scenario-buttons">{STOICHIOMETRY_SCENARIO_LIST.map((item, index) => <button type="button" key={item.id} className={item.id === scenario.id ? 'active' : ''} aria-pressed={item.id === scenario.id} onClick={() => onChoose(item.id)}><i>{String(index + 1).padStart(2, '0')}</i><span><strong>{item.shortTitle}</strong><small>{item.equation}</small></span></button>)}</div>
    <div className="stoich-scenario-contract"><span>{scenario.family}</span><strong>{scenario.equation}</strong><p>{scenario.boundary}</p></div>
  </aside>;
}

function FeedManifests({ analysis, feeds, onAmount, onUnit }) {
  return <aside className="stoich-feeds stoich-card">
    <div className="stoich-panel-heading"><span>Reactant manifests</span><strong>Put every feed on the same mole scale</strong></div>
    <div className="stoich-feed-list">{analysis.reactants.map((item) => <article key={item.id} style={{ '--species': item.accent }}>
      <header><i>{item.coefficient}</i><span><strong>{item.displayFormula}</strong><small>{item.name}</small></span><b>ν = {item.coefficient}</b></header>
      <div className="stoich-feed-entry"><label><span>Feed amount</span><input aria-label={`${item.name} feed amount`} type="number" min="0" step="0.01" value={feeds[item.id].value} onChange={(event) => { if (Number.isFinite(event.target.valueAsNumber)) onAmount(item.id, event.target.valueAsNumber); }}/></label><div className="stoich-unit-toggle" aria-label={`${item.name} feed unit`}>{['mol', 'g'].map((unit) => <button type="button" key={unit} className={feeds[item.id].unit === unit ? 'active' : ''} aria-pressed={feeds[item.id].unit === unit} onClick={() => onUnit(item.id, unit)}>{unit}</button>)}</div></div>
      <div className="stoich-mole-bridge"><div><span>m ÷ M</span><strong>{compact(item.initialMoles, 4)} mol</strong></div><i>→</i><div><span>n × N<sub>A</sub></span><strong>{entities(item.initialEntities)}</strong><small>entities</small></div></div>
      <dl><div><dt>Molar mass</dt><dd>{compact(item.molarMassGmol, 3)} g mol⁻¹</dd></div><div><dt>Batch capacity n/ν</dt><dd>{compact(item.extentCapacityMol, 4)} mol ξ</dd></div></dl>
    </article>)}</div>
    <p className="stoich-entity-note">One mole is exactly {STOICHIOMETRY_CONSTANTS.avogadroPerMol.toExponential(8)} specified entities. The packet drawings are amount tokens—not individual molecules.</p>
  </aside>;
}

function FoundryTheatre({ analysis, revealed }) {
  const packetCount = 7;
  return <section className={`stoich-foundry stoich-card ${revealed ? 'revealed' : 'waiting'}`}>
    <div className="stoich-stage-topline"><span><i/>mole freight yard · coefficient-gated</span><b>{analysis.resultKind}</b></div>
    <div className="stoich-scroll-cue" aria-hidden="true">Swipe across the yard <span>→</span></div>
    <svg className="stoich-foundry-svg" viewBox="0 0 1100 620" role="img" aria-label={`Stoichiometric batch foundry for ${analysis.scenario.equation}. ${revealed ? `${analysis.limiting.kind === 'stoichiometric' ? 'All reactants form a stoichiometric tie' : `${analysis.reactants.find((item) => item.id === analysis.limiting.ids[0]).name} is limiting`}; maximum extent ${analysis.extentMol.toFixed(4)} moles.` : 'The limiting lane and product totals are concealed until the learner checks a prediction.'}`}>
      <title>Coefficient-gated stoichiometry freight yard</title>
      <desc>Reactant packets represent scalable amounts, not literal molecules. The drawing does not represent a physical reactor or operating procedure.</desc>
      <defs><pattern id="stoichGrid" width="34" height="34" patternUnits="userSpaceOnUse"><path d="M34 0H0V34"/></pattern><linearGradient id="stoichPress" x1="0" x2="1"><stop stopColor="#203d5c"/><stop offset=".5" stopColor="#13233a"/><stop offset="1" stopColor="#2d516f"/></linearGradient><filter id="stoichGlow"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter><marker id="stoichArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z"/></marker></defs>
      <rect className="stoich-grid" width="1100" height="620" fill="url(#stoichGrid)"/>
      <text className="stoich-zone-label" x="45" y="58">REACTANT RECEIVING</text><text className="stoich-zone-label" x="466" y="58">BATCH PRESS</text><text className="stoich-zone-label" x="855" y="58">PRODUCT DISPATCH</text>
      {analysis.reactants.map((item, lane) => {
        const y = 185 + lane * 245;
        const consumedPackets = Math.round(item.consumedFraction * packetCount);
        const isLimiting = revealed && analysis.limiting.ids.includes(item.id);
        return <g className={`stoich-feed-lane ${isLimiting ? 'limiting' : ''}`} key={item.id} style={{ '--species': item.accent }}>
          <rect className="stoich-silo" x="45" y={y - 83} width="152" height="162" rx="20"/><rect className="stoich-silo-level" x="55" y={y - 20} width="132" height="89" rx="13"/><text className="stoich-silo-formula" x="121" y={y - 34} textAnchor="middle">{item.displayFormula}</text><text className="stoich-silo-amount" x="121" y={y + 15} textAnchor="middle">{compact(item.initialMoles, 3)} mol</text><text className="stoich-silo-caption" x="121" y={y + 43} textAnchor="middle">feed</text>
          <path className="stoich-belt" d={`M198 ${y + 27}H528`} markerEnd="url(#stoichArrow)"/>
          {Array.from({ length: packetCount }, (_, index) => <g className={`stoich-packet ${revealed ? index < consumedPackets ? 'consumed' : 'leftover' : 'unresolved'}`} key={index} transform={`translate(${220 + index * 42} ${y - 1})`}><rect width="31" height="45" rx="7"/><text x="15.5" y="27" textAnchor="middle">{item.displayFormula}</text></g>)}
          <g className="stoich-capacity-plate" transform={`translate(214 ${y - 78})`}><rect width="225" height="49" rx="12"/><text x="14" y="20">n / ν</text><text x="14" y="38">{compact(item.initialMoles, 3)} / {item.coefficient} = {compact(item.extentCapacityMol, 3)} mol ξ</text></g>
          <g className="stoich-gate" transform={`translate(527 ${y + 21})`}><circle r="52"/><circle r="34"/><text y="-4" textAnchor="middle">GATE</text><text y="20" textAnchor="middle">× {item.coefficient}</text></g>
          {isLimiting && <g className="stoich-limit-flag" transform={`translate(413 ${y + 55})`} filter="url(#stoichGlow)"><path d="M0 0h111l15 17-15 17H0z"/><text x="55" y="22" textAnchor="middle">{analysis.limiting.kind === 'stoichiometric' ? 'TIE · ZERO' : 'LIMIT · ZERO'}</text></g>}
          {revealed && !isLimiting && <text className="stoich-leftover-label" x="365" y={y + 77} textAnchor="middle">{compact(item.leftoverMoles, 3)} mol left</text>}
        </g>;
      })}
      <g className="stoich-press" transform="translate(620 174)"><rect width="225" height="274" rx="35" fill="url(#stoichPress)"/><path d="M25 35h175M25 239h175"/><circle cx="112.5" cy="137" r="70"/><circle cx="112.5" cy="137" r="45"/><text x="112.5" y="119" textAnchor="middle">ξ MAX</text><text className="stoich-press-value" x="112.5" y="153" textAnchor="middle">{revealed ? compact(analysis.extentMol, 3) : '?'}</text><text x="112.5" y="176" textAnchor="middle">mol batches</text><text className="stoich-press-status" x="112.5" y="258" textAnchor="middle">{revealed ? analysis.limiting.kind === 'stoichiometric' ? 'ALL FEEDS REACH ZERO' : 'FIRST LANE REACHES ZERO' : 'COMMIT A PREDICTION'}</text></g>
      <path className="stoich-output-belt" d="M845 311H1032" markerEnd="url(#stoichArrow)"/>
      <g className="stoich-product-rack">{analysis.products.map((item, index) => { const rackY = analysis.products.length === 1 ? 245 : 95 + index * (370 / (analysis.products.length - 1)); return <g key={item.id} transform={`translate(895 ${rackY})`} style={{ '--species': item.accent }}><rect width="160" height="108" rx="18"/><text className="formula" x="80" y="35" textAnchor="middle">{item.displayFormula}</text><text x="80" y="56" textAnchor="middle">ν = {item.coefficient}</text><text className="amount" x="80" y="79" textAnchor="middle">{revealed ? `${compact(item.amountMoles, 3)} mol` : '?'}</text><text x="80" y="98" textAnchor="middle">{revealed ? `${compact(item.massG, 2)} g` : 'sealed'}</text></g>; })}</g>
      <text className="stoich-stage-boundary" x="550" y="594" textAnchor="middle">symbolic amount packets · complete-conversion arithmetic · not a reactor, rate model, or laboratory recipe</text>
    </svg>
  </section>;
}

function PredictionDock({ analysis, prediction, setPrediction, check, onCheck, onClear }) {
  const revealed = Boolean(check && !check.blocked);
  return <aside className="stoich-prediction stoich-card">
    <div className="stoich-panel-heading"><span>Prediction dock</span><strong>Which feed stops the press?</strong></div>
    <div className="stoich-limiter-options">{analysis.reactants.map((item) => <button type="button" key={item.id} className={prediction.limitingId === item.id ? 'selected' : ''} aria-pressed={prediction.limitingId === item.id} onClick={() => setPrediction((current) => ({ ...current, limitingId: item.id }))}><b>{item.displayFormula}</b><span>{item.name}</span><small>{compact(item.initialMoles, 3)} mol raw feed</small></button>)}<button type="button" className={prediction.limitingId === 'stoichiometric' ? 'selected tie' : 'tie'} aria-pressed={prediction.limitingId === 'stoichiometric'} onClick={() => setPrediction((current) => ({ ...current, limitingId: 'stoichiometric' }))}><b>=</b><span>Exact ratio</span><small>all feeds reach zero together</small></button></div>
    <div className="stoich-target-prediction"><span>Predict theoretical {analysis.target.displayFormula}</span><div><input aria-label="Predicted target product amount" type="number" min="0" step="0.001" placeholder="enter amount" value={prediction.targetValue} onChange={(event) => setPrediction((current) => ({ ...current, targetValue: event.target.value }))}/><div className="stoich-unit-toggle">{['mol', 'g'].map((unit) => <button type="button" key={unit} className={prediction.targetUnit === unit ? 'active' : ''} aria-pressed={prediction.targetUnit === unit} onClick={() => setPrediction((current) => ({ ...current, targetUnit: unit }))}>{unit}</button>)}</div></div></div>
    <div className="stoich-prediction-actions"><button type="button" className="commit" onClick={onCheck}>Run the batch comparison <span aria-hidden="true">→</span></button><button type="button" onClick={onClear}>Clear prediction</button></div>
    {revealed && <div className="stoich-dimension-reasons"><p className={check.dimensions.limiting.correct ? 'correct' : 'incorrect'}><i/><span><b>limiting state</b>{check.dimensions.limiting.reason}</span></p><p className={check.dimensions.target.correct ? 'correct' : 'incorrect'}><i/><span><b>target amount</b>{check.dimensions.target.reason}</span></p></div>}
  </aside>;
}

function ResultLedger({ analysis, revealed }) {
  const limiterNames = analysis.limiting.ids.map((id) => analysis.reactants.find((item) => item.id === id).name).join(' + ');
  return <aside className={`stoich-ledger stoich-card ${revealed ? 'revealed' : 'locked'}`}>
    <div className="stoich-panel-heading"><span>Reaction manifest</span><strong>Every mole remains accounted for</strong></div>
    {revealed ? <><div className="stoich-limit-verdict"><span>{analysis.limiting.kind === 'stoichiometric' ? 'Stoichiometric feed' : 'Limiting reactant'}</span><strong>{limiterNames}</strong><p>{analysis.limiting.kind === 'stoichiometric' ? 'All coefficient-normalized feed capacities are equal.' : 'This feed has the smallest n/ν and reaches zero first.'}</p></div><div className="stoich-extent-hero"><span>Maximum extent ξ</span><strong>{compact(analysis.extentMol, 4)}</strong><b>mol equation batches</b><code>ξmax = min(nᵢ / νᵢ)</code></div><div className="stoich-species-ledger"><span>Reactants</span>{analysis.reactants.map((item) => <div key={item.id}><b>{item.displayFormula}</b><p><strong>{compact(item.consumedMoles, 4)} mol</strong> consumed</p><small>{compact(item.leftoverMoles, 4)} mol · {compact(item.leftoverMassG, 3)} g left</small></div>)}<span>Products</span>{analysis.products.map((item) => <div key={item.id}><b>{item.displayFormula}</b><p><strong>{compact(item.amountMoles, 4)} mol</strong> formed</p><small>{compact(item.massG, 3)} g · {entities(item.entities)} entities</small></div>)}</div><div className="stoich-mass-closure"><span>Consumed reactant mass</span><strong>{compact(analysis.massLedger.consumedReactantMassG, 5)} g</strong><i>=</i><span>Declared product mass</span><strong>{compact(analysis.massLedger.generatedProductMassG, 5)} g</strong><b>Δ {analysis.massLedger.differenceG.toExponential(1)} g</b></div></> : <div className="stoich-ledger-lock"><i>ν</i><strong>Manifest sealed</strong><p>Choose a limiter and predict the target amount. Feed conversions stay visible, but extent, leftovers, and product totals wait for your check.</p></div>}
  </aside>;
}

function ExtentPlot({ analysis, trace, revealed }) {
  const width = 900, height = 330, left = 68, right = 862, top = 32, bottom = 273;
  const allSeries = [
    ...analysis.reactants.map((item) => ({ ...item, side: 'reactant', values: trace.points.map((point) => point.reactantMoles[item.id]) })),
    ...analysis.products.map((item) => ({ ...item, side: 'product', values: trace.points.map((point) => point.productMoles[item.id]) })),
  ];
  const maximum = Math.max(1e-9, ...allSeries.flatMap((series) => series.values));
  const x = (extent) => left + (analysis.extentMol === 0 ? 0 : extent / analysis.extentMol) * (right - left);
  const y = (amount) => top + (maximum - amount) / maximum * (bottom - top);
  return <section className="stoich-extent stoich-card"><div className="stoich-panel-heading"><span>Reaction-extent field</span><strong>Every species shares the same ξ</strong></div><div className="stoich-extent-layout"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Species amounts versus reaction extent from zero to ${analysis.extentMol.toFixed(4)} moles. ${revealed ? 'The full trace and limiting endpoint are shown.' : 'The endpoint label is concealed until the prediction is checked.'}`}><title>Amount of each declared species versus extent of reaction</title>{[0, .25, .5, .75, 1].map((fraction) => <g key={fraction}><line x1={x(analysis.extentMol * fraction)} x2={x(analysis.extentMol * fraction)} y1={top} y2={bottom}/><text x={x(analysis.extentMol * fraction)} y={bottom + 21} textAnchor="middle">{compact(analysis.extentMol * fraction, 2)}</text></g>)}{[0, .5, 1].map((fraction) => <g key={fraction}><line x1={left} x2={right} y1={y(maximum * fraction)} y2={y(maximum * fraction)}/><text x={left - 10} y={y(maximum * fraction) + 4} textAnchor="end">{compact(maximum * fraction, 2)}</text></g>)}{allSeries.map((series) => <path key={series.id} className={series.side} style={{ '--species': series.accent }} d={trace.points.map((point, index) => `${index ? 'L' : 'M'}${x(point.extentMol).toFixed(2)} ${y(series.values[index]).toFixed(2)}`).join(' ')}/>)}<line className="stoich-extent-end" x1={x(analysis.extentMol)} x2={x(analysis.extentMol)} y1={top} y2={bottom}/><text className="stoich-end-label" x={right - 5} y={top + 15} textAnchor="end">{revealed ? `ξmax ${compact(analysis.extentMol, 3)} mol` : 'endpoint concealed'}</text><text className="axis" x={(left + right) / 2} y={height - 8} textAnchor="middle">extent of reaction ξ / mol</text><text className="axis" x="18" y={(top + bottom) / 2} transform={`rotate(-90 18 ${(top + bottom) / 2})`} textAnchor="middle">amount n / mol</text></svg><div className="stoich-extent-key">{allSeries.map((series) => <span key={series.id}><i style={{ background: series.accent }}/><b>{series.displayFormula}</b><small>{series.side}</small></span>)}</div><p><code>dnᵢ = νᵢdξ</code> · One shared reaction extent links every decreasing reactant line and increasing product line.</p></div></section>;
}

function YieldWeighbridge({ analysis, revealed, isolatedMass, setIsolatedMass, yieldCheck, onCheck }) {
  const maxMass = Math.max(analysis.target.theoreticalMassG, Number(isolatedMass) || 0, 1);
  const theoreticalHeight = 142 * analysis.target.theoreticalMassG / maxMass;
  const isolatedHeight = 142 * (Number(isolatedMass) || 0) / maxMass;
  const yieldAngle = yieldCheck?.percentYield == null ? -95 : Math.min(125, yieldCheck.percentYield) / 125 * 190 - 95;
  return <section className="stoich-yield stoich-card"><div className="stoich-panel-heading"><span>Isolated-yield weighbridge</span><strong>Theoretical is a ceiling in this model</strong></div><div className="stoich-scale"><div className="stoich-scale-bars"><div><span style={{ height: `${theoreticalHeight}px` }}/><b>theoretical</b><strong>{revealed ? `${compact(analysis.target.theoreticalMassG, 4)} g` : '?'}</strong></div><i>= 100%</i><div className={yieldCheck?.status === 'above-theoretical' ? 'above' : ''}><span style={{ height: `${isolatedHeight}px` }}/><b>isolated entry</b><strong>{isolatedMass === '' ? '—' : `${compact(Number(isolatedMass), 4)} g`}</strong></div></div><div className={`stoich-yield-dial ${yieldCheck?.status ?? ''}`} style={{ '--yield-angle': `${yieldAngle}deg` }}><span>raw yield</span><strong>{yieldCheck?.percentYield == null ? '?' : `${compact(yieldCheck.percentYield, 2)}%`}</strong></div></div><div className="stoich-yield-entry"><label><span>Entered isolated {analysis.target.displayFormula} mass</span><input aria-label="Isolated product mass" type="number" min="0" step="0.001" placeholder="grams" value={isolatedMass} onChange={(event) => setIsolatedMass(event.target.value)}/><b>g</b></label><button type="button" disabled={!revealed} onClick={onCheck}>Audit percent yield <span aria-hidden="true">→</span></button></div>{yieldCheck && <div className={`stoich-yield-feedback ${yieldCheck.status}`}><strong>{yieldCheck.status === 'above-theoretical' ? 'Above theoretical—keep and audit.' : yieldCheck.status === 'undefined' ? 'Yield undefined.' : 'Yield compared with the upper bound.'}</strong><p>{yieldCheck.reason}</p></div>}<p className="stoich-yield-boundary">No purity, wetness, identity, collection loss, equilibrium conversion, or measurement uncertainty is inferred.</p></section>;
}

export default function StoichiometryLab() {
  const initialScenario = stoichiometryScenarioById('water-synthesis');
  const [scenarioId, setScenarioId] = useState(initialScenario.id);
  const [feeds, setFeeds] = useState(() => cloneFeeds(initialScenario));
  const [targetProductId, setTargetProductId] = useState(initialScenario.defaultTargetProductId);
  const [prediction, setPredictionState] = useState({ limitingId: null, targetValue: '', targetUnit: 'mol' });
  const [check, setCheck] = useState(null);
  const [feedback, setFeedback] = useState({ tone: 'ready', title: 'The foundry is waiting.', detail: 'Compare n/ν for both feed lanes, then predict the target amount.' });
  const [isolatedMass, setIsolatedMassState] = useState('');
  const [yieldCheck, setYieldCheck] = useState(null);
  const [learningTrace, setLearningTrace] = useState([{ id: 0, type: 'start', title: 'Water equation loaded', detail: '5 mol H₂ and 2 mol O₂ are on the receiving deck. Predictions are empty.' }]);
  const traceId = useRef(1);
  const scenario = stoichiometryScenarioById(scenarioId);
  const analysis = useMemo(() => analyzeStoichiometry({ scenarioId, feeds, targetProductId }), [scenarioId, feeds, targetProductId]);
  const extentTrace = useMemo(() => createExtentTrace({ analysis, pointCount: 61 }), [analysis]);
  const passport = MODEL_PASSPORTS.stoichiometryFoundry;
  const revealed = Boolean(check && !check.blocked);
  const record = (type, title, detail) => { const id = traceId.current++; setLearningTrace((current) => [{ id, type, title, detail }, ...current].slice(0, 18)); };
  const invalidate = (title, detail) => { setCheck(null); setYieldCheck(null); setFeedback({ tone: 'changed', title, detail: `${detail} Your predictions and isolated-mass entry were preserved; check again.` }); };
  const setPrediction = (updater) => { setPredictionState(updater); setCheck(null); setFeedback({ tone: 'selected', title: 'Prediction recorded.', detail: 'Choose both a limiting state and a target amount, then run the batch comparison.' }); };
  const changeScenario = (id) => { const next = stoichiometryScenarioById(id); setScenarioId(id); setFeeds(cloneFeeds(next)); setTargetProductId(next.defaultTargetProductId); setPredictionState({ limitingId: null, targetValue: '', targetUnit: 'mol' }); setCheck(null); setIsolatedMassState(''); setYieldCheck(null); const detail = `${next.equation} loaded with its declared classroom feeds. Prior predictions were cleared because the species changed.`; setFeedback({ tone: 'changed', title: `${next.shortTitle} manifest loaded.`, detail }); record('setup', 'Declared equation changed', detail); };
  const changeAmount = (id, value) => { setFeeds((current) => ({ ...current, [id]: { ...current[id], value } })); invalidate('Feed amount changed.', `${scenario.reactants.find((item) => item.id === id).name} is now ${value} ${feeds[id].unit}.`); };
  const changeUnit = (id, unit) => { if (feeds[id].unit === unit) return; const item = analysis.reactants.find((entry) => entry.id === id); const value = unit === 'mol' ? item.initialMoles : item.initialMassG; setFeeds((current) => ({ ...current, [id]: { value: Number(value.toPrecision(10)), unit } })); invalidate('Feed unit converted.', `${item.name} still represents ${compact(item.initialMoles, 4)} mol; only its displayed input unit changed.`); record('convert', 'Feed unit converted', `${item.name}: ${compact(item.initialMoles, 4)} mol = ${compact(item.initialMassG, 4)} g.`); };
  const chooseTarget = (id) => { setTargetProductId(id); invalidate('Target product changed.', `${scenario.products.find((item) => item.id === id).name} is now the quantity to predict.`); };
  const runCheck = () => { const targetValue = Number(prediction.targetValue); if (!prediction.limitingId || prediction.targetValue === '' || !Number.isFinite(targetValue) || targetValue < 0) { const detail = 'Select one limiting state and enter a non-negative target-product amount before checking.'; setCheck({ blocked: true }); setFeedback({ tone: 'blocked', title: 'Batch comparison blocked.', detail }); record('blocked', 'Prediction check blocked', detail); return; } const result = evaluateStoichiometryPrediction({ analysis, predictedLimitingId: prediction.limitingId, predictedTargetValue: targetValue, predictedTargetUnit: prediction.targetUnit }); setCheck(result); setYieldCheck(null); setFeedback({ tone: result.correct ? 'correct' : 'incorrect', title: result.correct ? 'Both predictions match.' : 'Keep your choices and inspect the batch capacities.', detail: result.summary }); record(result.correct ? 'correct' : 'incorrect', 'Stoichiometry prediction checked', result.summary); };
  const clearPrediction = () => { setPredictionState({ limitingId: null, targetValue: '', targetUnit: 'mol' }); setCheck(null); setYieldCheck(null); const detail = 'Limiter and target predictions were cleared. Equation, feeds, target product, and isolated mass were preserved.'; setFeedback({ tone: 'ready', title: 'Prediction dock cleared.', detail }); record('reset', 'Predictions cleared', detail); };
  const setIsolatedMass = (value) => { setIsolatedMassState(value); setYieldCheck(null); };
  const auditYield = () => { const value = Number(isolatedMass); if (isolatedMass === '' || !Number.isFinite(value) || value < 0) { const detail = 'Enter a non-negative isolated mass in grams before auditing yield.'; setYieldCheck({ status: 'blocked', percentYield: null, reason: detail }); record('blocked', 'Yield audit blocked', detail); return; } const result = analyzeChemicalYield({ analysis, isolatedMassG: value }); setYieldCheck(result); record(result.status === 'above-theoretical' ? 'audit' : 'yield', 'Isolated yield audited', result.reason); };

  return <section className="stoichiometry-lab" id="stoichiometryLab" aria-labelledby="stoichiometryLabTitle">
    <header className="stoich-header"><div><p className="section-code">07 / Quantitative reaction stoichiometry</p><h2 id="stoichiometryLabTitle">Do not compare piles. Compare equation-sized batches.</h2><p>Convert every feed to moles, divide by its coefficient, and predict which lane reaches zero. Then separate a theoretical ceiling from what someone actually isolates.</p></div><div className="stoich-header-mark" aria-hidden="true"><div><span>n</span><i>÷</i><span>ν</span></div><strong>ξ</strong><p>amount → batches → yield</p></div></header>
    <div className="stoich-bench">
      <ScenarioRail scenario={scenario} onChoose={changeScenario}/>
      <FeedManifests analysis={analysis} feeds={feeds} onAmount={changeAmount} onUnit={changeUnit}/>
      <FoundryTheatre analysis={analysis} revealed={revealed}/>
      <div className={`stoich-live-feedback stoich-card ${feedback.tone}`} aria-live="polite"><i/><span><strong>{feedback.title}</strong><p>{feedback.detail}</p></span></div>
      <div className="stoich-target stoich-card"><div className="stoich-panel-heading"><span>Product target</span><strong>Choose what you will predict and weigh</strong></div><div>{scenario.products.map((item) => <button type="button" key={item.id} className={targetProductId === item.id ? 'active' : ''} aria-pressed={targetProductId === item.id} onClick={() => chooseTarget(item.id)} style={{ '--species': item.accent }}><b>{item.displayFormula}</b><span><strong>{item.name}</strong><small>ν = {item.coefficient}</small></span></button>)}</div></div>
      <PredictionDock analysis={analysis} prediction={prediction} setPrediction={setPrediction} check={check} onCheck={runCheck} onClear={clearPrediction}/>
      <ResultLedger analysis={analysis} revealed={revealed}/>
      <ExtentPlot analysis={analysis} trace={extentTrace} revealed={revealed}/>
      <YieldWeighbridge analysis={analysis} revealed={revealed} isolatedMass={isolatedMass} setIsolatedMass={setIsolatedMass} yieldCheck={yieldCheck} onCheck={auditYield}/>
      <aside className="stoich-learning-trace stoich-card"><div className="stoich-panel-heading"><span>Learner-owned trace</span><strong>Every prediction and revision stays inspectable</strong></div><div className="stoich-attempts">{learningTrace.map((entry) => <div key={entry.id} className={entry.type}><i/><span>{entry.type}</span><strong>{entry.title}</strong><p>{entry.detail}</p></div>)}</div><details className="stoich-teacher-lens"><summary>Teacher lens · questions that reveal the reasoning</summary><div><p><b>Smallest pile ≠ limiter:</b> Which feed has the smallest n/ν rather than the smallest raw number?</p><p><b>Coefficient ≠ subscript:</b> Why does changing a coefficient scale amount without changing molecular identity?</p><p><b>Theoretical ≠ observed:</b> Which assumptions make this mass an upper bound rather than a prediction?</p><p><b>Above 100%:</b> What evidence would distinguish wet product, impurity, identity error, measurement error, or a wrong reaction model?</p></div></details></aside>
      <aside className="stoich-passport stoich-card"><div className="stoich-passport-intro"><div className="stoich-panel-heading"><span>Model passport</span><strong>{passport.name}</strong></div><div className="stoich-passport-verdict"><i/>{passport.resultKind}</div><p>{passport.inputProvenance}</p></div><div className="stoich-passport-groups"><div><span>Included</span>{STOICHIOMETRY_MODEL_BOUNDARY.includes.map((item) => <b key={item}>{item}</b>)}</div><div className="excluded"><span>Not included</span>{STOICHIOMETRY_MODEL_BOUNDARY.excludes.map((item) => <b key={item}>{item}</b>)}</div></div><div className="stoich-passport-equations"><span>Declared relations</span><code>n = m / M</code><code>N = nN<sub>A</sub></code><code>ξ<sub>max</sub> = min(nᵢ/νᵢ)</code><code>Δnᵢ = νᵢξ</code><code>yield = isolated/theoretical × 100%</code><p>{passport.dataStatement}</p></div><div className="stoich-sources"><span>Primary references</span>{passport.sources.map((sourceId) => { const source = SCIENCE_SOURCES[sourceId]; return <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><strong>{source.name}</strong><small>{source.role}</small><b aria-hidden="true">↗</b></a>; })}</div></aside>
    </div>
  </section>;
}
