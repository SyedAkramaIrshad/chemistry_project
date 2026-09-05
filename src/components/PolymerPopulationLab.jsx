import { useMemo, useState } from 'react';
import {
  POLYMER_MODEL_BOUNDARY,
  POLYMER_REPEAT_UNIT_BY_ID,
  POLYMER_REPEAT_UNITS,
  POLYMER_SCENARIO_BY_ID,
  POLYMER_SCENARIOS,
} from '../data/polymerScenarios.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../data/scienceSources.js';
import {
  analysePolymerPopulation,
  comparePolymerPopulations,
  evaluatePolymerAttempt,
  nextPolymerHint,
} from '../chemistry/polymerPopulation.js';
import '../styles/polymer-population.css';

const BIN_COLORS = ['#e2b34f', '#ef7768', '#2aa9a1', '#7e6de0', '#4c87c9'];
const RELATION_OPTIONS = [
  ['left', 'Left loom'],
  ['equal', 'Equal'],
  ['right', 'Right loom'],
];
const DIMENSION_LABELS = {
  mnRelation: 'Number-average molar mass · Mn',
  mwRelation: 'Mass-average molar mass · Mw',
  dispersityRelation: 'Molar-mass dispersity · ĐM',
  distributionClaim: 'Distribution and property boundary',
};
const CONTRASTS = {
  'uniform-vs-spread': 'Average ≠ spread',
  'long-tail-leverage': 'Rare ≠ mass-insignificant',
  'count-mass-lens': 'Number lens ≠ mass lens',
  'same-degree-different-cru': 'Degree ≠ molar mass',
  'end-groups-in-view': 'End groups never vanish',
  'same-moments-different-shape': 'Moments ≠ full distribution',
};

const cloneSpecimen = (specimen) => ({
  label: specimen.label,
  repeatUnitId: specimen.repeatUnitId,
  bins: specimen.bins.map((bin) => ({ ...bin })),
});
const blankPrediction = () => ({
  mnRelation: '',
  mwRelation: '',
  dispersityRelation: '',
  distributionClaim: '',
});
const fmt = (value, digits = 3) => Number(value).toFixed(digits);
const pct = (value, digits = 1) => `${(100 * value).toFixed(digits)}%`;
const activeClass = (active, extra = '') => `${active ? 'active ' : ''}${extra}`.trim();

function PatternShelf({ activeId, onSelect }) {
  return (
    <nav className="poly-pattern-shelf" aria-label="Polymer population learning patterns">
      {POLYMER_SCENARIOS.map((scenario) => {
        const bins = [...scenario.left.bins, ...scenario.right.bins];
        const maxCount = Math.max(...bins.map((bin) => bin.count));
        return (
          <button
            type="button"
            className={activeClass(activeId === scenario.id)}
            aria-pressed={activeId === scenario.id}
            onClick={() => onSelect(scenario.id)}
            key={scenario.id}
          >
            <span>{scenario.code}</span>
            <strong>{scenario.name}</strong>
            <div className="poly-pattern-mini" aria-hidden="true">
              {bins.slice(0, 6).map((bin, index) => (
                <i style={{ height: `${12 + 30 * bin.count / maxCount}px`, background: BIN_COLORS[index % BIN_COLORS.length] }} key={`${bin.degree}-${index}`}/>
              ))}
            </div>
            <small>{scenario.summary}</small>
          </button>
        );
      })}
    </nav>
  );
}

function ChainRibbon({ population, selectedDegree }) {
  const repeatUnit = POLYMER_REPEAT_UNIT_BY_ID[population.repeatUnitId];
  const occupied = population.bins.filter((bin) => bin.count > 0).sort((a, b) => a.degree - b.degree);
  const selected = occupied.find((bin) => bin.degree === selectedDegree) ?? occupied[0];
  if (!selected) {
    return <div className="poly-chain-empty"><strong>No chain selected</strong><span>Add or restore one representative chain.</span></div>;
  }
  const visible = selected.degree <= 12
    ? Array.from({ length: selected.degree }, (_, index) => index)
    : [...Array.from({ length: 5 }, (_, index) => index), 'ellipsis', ...Array.from({ length: 5 }, (_, index) => selected.degree - 5 + index)];
  const chainMass = repeatUnit.endGroupMolarMassGmol + selected.degree * repeatUnit.repeatMolarMassGmol;
  return (
    <div className="poly-chain-ribbon" style={{ '--reel-accent': repeatUnit.accent }}>
      <header><span>FINITE CHAIN SAMPLE</span><strong>X = {selected.degree} · N = {selected.count}</strong></header>
      <div className="poly-chain-track" role="img" aria-label={`Finite chain with degree ${selected.degree}, count ${selected.count}, and molar mass ${chainMass.toFixed(3)} grams per mole`}>
        <b className="poly-end-cap">{repeatUnit.endGroups[0]}</b>
        {visible.map((item, index) => item === 'ellipsis'
          ? <span className="poly-chain-ellipsis" key="ellipsis">•••</span>
          : <i className="poly-repeat-tile" key={`${item}-${index}`}><small>CRU</small><strong>{repeatUnit.shortName}</strong></i>)}
        <b className="poly-end-cap">{repeatUnit.endGroups[1]}</b>
      </div>
      <footer><code>Mi = {fmt(repeatUnit.endGroupMolarMassGmol)} + {selected.degree} × {fmt(repeatUnit.repeatMolarMassGmol)} = {fmt(chainMass)} g mol⁻¹</code></footer>
    </div>
  );
}

function PopulationSkyline({ population, selectedDegree, onSelect }) {
  const sorted = [...population.bins].sort((a, b) => a.degree - b.degree);
  const maxCount = Math.max(1, ...sorted.map((bin) => bin.count));
  return (
    <div className="poly-skyline" aria-label={`${population.label} editable chain-count skyline`}>
      <div className="poly-skyline-grid" aria-hidden="true"><i/><i/><i/><i/></div>
      <div className="poly-skyline-bars">
        {sorted.map((bin, index) => (
          <button
            type="button"
            aria-label={`Select degree ${bin.degree}, representative count ${bin.count}`}
            aria-pressed={selectedDegree === bin.degree}
            className={activeClass(selectedDegree === bin.degree)}
            onClick={() => onSelect(bin.degree)}
            key={bin.degree}
          >
            <i style={{ height: `${Math.max(4, 100 * bin.count / maxCount)}%`, '--bin-color': BIN_COLORS[index % BIN_COLORS.length] }}><b>{bin.count}</b></i>
            <span>X {bin.degree}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PopulationLoom({ side, population, selectedDegree, newDegree, issue, stale, onRepeat, onBin, onSelect, onNewDegree, onAdd }) {
  const repeatUnit = POLYMER_REPEAT_UNIT_BY_ID[population.repeatUnitId];
  const chainCount = population.bins.reduce((sum, bin) => sum + bin.count, 0);
  return (
    <article className={`poly-loom poly-loom-${side}`} aria-label={`${side} polymer population loom`}>
      <header className="poly-loom-heading">
        <div><span>{side === 'left' ? 'LOOM A' : 'LOOM B'}</span><strong>{population.label}</strong></div>
        <b className={chainCount ? '' : 'empty'}>{chainCount} chain{chainCount === 1 ? '' : 's'}</b>
      </header>

      <fieldset className="poly-reel-bank">
        <legend>Choose one declared CRU reel</legend>
        <div>
          {POLYMER_REPEAT_UNITS.map((unit) => (
            <button
              type="button"
              aria-pressed={population.repeatUnitId === unit.id}
              className={activeClass(population.repeatUnitId === unit.id)}
              style={{ '--reel-accent': unit.accent }}
              onClick={() => onRepeat(side, unit.id)}
              key={unit.id}
            >
              <i aria-hidden="true"/><span><strong>{unit.motif}</strong><small>{unit.shortName}</small></span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="poly-reel-ticket">
        <div className="poly-spool" style={{ '--reel-accent': repeatUnit.accent }} aria-hidden="true"><i/><b>CRU</b><i/></div>
        <div><span>{repeatUnit.name}</span><strong>{repeatUnit.motif}</strong><small>{repeatUnit.formula} · M<sub>repeat</sub> {fmt(repeatUnit.repeatMolarMassGmol)} g mol⁻¹</small><small>Declared caps {repeatUnit.endGroups.join(' / ')} · M<sub>end</sub> {fmt(repeatUnit.endGroupMolarMassGmol)} g mol⁻¹</small></div>
      </div>

      <PopulationSkyline population={population} selectedDegree={selectedDegree} onSelect={(degree) => onSelect(side, degree)}/>
      <ChainRibbon population={population} selectedDegree={selectedDegree}/>

      <div className="poly-bin-editor">
        <header><span>Representative chain bins</span><b>Manual only</b></header>
        {[...population.bins].sort((a, b) => a.degree - b.degree).map((bin) => (
          <div className="poly-bin-row" key={bin.degree}>
            <button type="button" aria-label={`Select chain degree ${bin.degree}`} className={activeClass(selectedDegree === bin.degree, 'degree')} onClick={() => onSelect(side, bin.degree)}>X = {bin.degree}</button>
            <button type="button" aria-label={`Decrease count for degree ${bin.degree}`} onClick={() => onBin(side, bin.degree, 'decrement')}>−</button>
            <output aria-label={`Representative count for degree ${bin.degree}`}>{bin.count}</output>
            <button type="button" aria-label={`Increase count for degree ${bin.degree}`} disabled={bin.count >= 50} onClick={() => onBin(side, bin.degree, 'increment')}>+</button>
            <button type="button" className="remove" aria-label={`Remove degree ${bin.degree} bin`} onClick={() => onBin(side, bin.degree, 'remove')}>Remove</button>
          </div>
        ))}
        <div className="poly-add-bin">
          <label><span>New degree</span><input type="number" min="1" max="200" step="1" value={newDegree} onChange={(event) => onNewDegree(side, event.target.value)} placeholder="1–200"/></label>
          <button type="button" disabled={population.bins.length >= 5} onClick={() => onAdd(side)}>Add chain length</button>
        </div>
        {issue && <p className="poly-input-issue" role="alert">{issue}</p>}
      </div>
      {stale && <p className="poly-stale-ribbon"><b>POPULATION CHANGED</b> The balance drums still show the previous explicit analysis.</p>}
    </article>
  );
}

const conicFor = (analysis, key) => {
  let cursor = 0;
  return `conic-gradient(${analysis.bins.map((bin, index) => {
    const start = cursor;
    cursor += 100 * bin[key];
    return `${BIN_COLORS[index % BIN_COLORS.length]} ${start.toFixed(3)}% ${cursor.toFixed(3)}%`;
  }).join(',')})`;
};

function WeightDrums({ label, analysis, nonce }) {
  return (
    <article className="poly-weight-station">
      <header><span>{label}</span><strong>{analysis.repeatUnit.shortName}</strong></header>
      <div className="poly-drum-pair" key={`${label}-${nonce}`}>
        <div className="poly-drum-unit">
          <div className="poly-drum count" style={{ background: conicFor(analysis, 'numberFraction') }}><i/><span><b>ΣN</b><small>number lens</small></span></div>
          <strong>Every chain counts once</strong>
        </div>
        <div className="poly-thread-bridge" aria-hidden="true"><i/><i/><i/></div>
        <div className="poly-drum-unit">
          <div className="poly-drum mass" style={{ background: conicFor(analysis, 'massFraction') }}><i/><span><b>ΣNM</b><small>mass lens</small></span></div>
          <strong>Heavier chains carry more mass</strong>
        </div>
      </div>
      <div className="poly-bin-legend">
        {analysis.bins.map((bin, index) => (
          <div key={bin.degree}><i style={{ background: BIN_COLORS[index % BIN_COLORS.length] }}/><b>X {bin.degree}</b><span>{pct(bin.numberFraction)} count</span><span>{pct(bin.massFraction)} mass</span></div>
        ))}
      </div>
      <div className="poly-table-wrap">
        <table>
          <caption>Accessible number- and mass-weighting record for {label}</caption>
          <thead><tr><th>X</th><th>Ni</th><th>Mi / g mol⁻¹</th><th>xi</th><th>wi</th></tr></thead>
          <tbody>{analysis.bins.map((bin) => <tr key={bin.degree}><th>{bin.degree}</th><td>{bin.count}</td><td>{fmt(bin.chainMolarMassGmol)}</td><td>{fmt(bin.numberFraction, 4)}</td><td>{fmt(bin.massFraction, 4)}</td></tr>)}</tbody>
        </table>
      </div>
    </article>
  );
}

function AnalysisHall({ snapshot, stale, nonce }) {
  if (!snapshot) {
    return (
      <section className="poly-analysis-empty" aria-live="polite">
        <div className="poly-empty-drum"><i/><i/></div>
        <span>ANALYSIS DRUMS IDLE</span>
        <strong>Edit both looms, then freeze one explicit comparison.</strong>
        <p>The skyline shows learner state now. Mn, Mw, dispersity, number fractions, and mass fractions are not calculated until you ask.</p>
      </section>
    );
  }
  return (
    <section className={`poly-analysis-hall ${stale ? 'stale' : ''}`} aria-label="Number and mass weighting drums">
      <header>
        <div><span>WEIGHTING HALL</span><strong>Same chain bins · two legitimate lenses</strong></div>
        <b>{stale ? 'PREVIOUS ANALYSIS' : 'ANALYSIS CURRENT'}</b>
      </header>
      {stale && <p className="poly-analysis-stale">The looms changed. These drums remain the previous immutable snapshot until you analyse again.</p>}
      <div className="poly-weight-grid">
        <WeightDrums label="Left loom" analysis={snapshot.left} nonce={nonce}/>
        <WeightDrums label="Right loom" analysis={snapshot.right} nonce={nonce}/>
      </div>
    </section>
  );
}

function RelationField({ legend, value, onChange, disabled }) {
  return (
    <fieldset disabled={disabled}>
      <legend>{legend}</legend>
      <div className="poly-relation-row">
        {RELATION_OPTIONS.map(([id, label]) => <button type="button" aria-pressed={value === id} className={activeClass(value === id)} onClick={() => onChange(id)} key={id}>{label}</button>)}
      </div>
    </fieldset>
  );
}

function PredictionConsole({ snapshot, stale, prediction, evaluation, hintLevel, hint, onPredict, onCheck, onHint, onClear, onReset }) {
  const complete = Object.values(prediction).every(Boolean);
  return (
    <aside className="poly-prediction-console poly-panel" aria-label="Polymer learner predictions">
      <header className="poly-panel-heading"><div><span>CLAIM SHUTTLE</span><strong>Commit four claims before opening the ledger</strong></div><b>{evaluation ? `${evaluation.score.correct}/4 SUPPORTED` : 'LEARNER OWNED'}</b></header>
      <RelationField legend="Which side has the larger Mn?" value={prediction.mnRelation} onChange={(value) => onPredict('mnRelation', value)} disabled={!snapshot || stale}/>
      <RelationField legend="Which side has the larger Mw?" value={prediction.mwRelation} onChange={(value) => onPredict('mwRelation', value)} disabled={!snapshot || stale}/>
      <RelationField legend="Which side has the larger ĐM?" value={prediction.dispersityRelation} onChange={(value) => onPredict('dispersityRelation', value)} disabled={!snapshot || stale}/>
      <fieldset disabled={!snapshot || stale}>
        <legend>If Mn, Mw, and ĐM match, does that prove the same distribution or material properties?</legend>
        <div className="poly-claim-row">
          <button type="button" className={activeClass(prediction.distributionClaim === 'statistics-prove-same', 'danger')} aria-pressed={prediction.distributionClaim === 'statistics-prove-same'} onClick={() => onPredict('distributionClaim', 'statistics-prove-same')}>Yes · summaries prove it</button>
          <button type="button" className={activeClass(prediction.distributionClaim === 'statistics-do-not-prove-same')} aria-pressed={prediction.distributionClaim === 'statistics-do-not-prove-same'} onClick={() => onPredict('distributionClaim', 'statistics-do-not-prove-same')}>No · not established</button>
        </div>
      </fieldset>
      {!snapshot && <p className="poly-console-note">Analyse both populations before committing claims.</p>}
      {stale && <p className="poly-console-note warning">The looms changed. Re-analyse before comparing these claims.</p>}
      {snapshot && !stale && !complete && <p className="poly-console-note">Current snapshot · {Object.values(prediction).filter(Boolean).length}/4 claims set</p>}
      {snapshot && !stale && complete && !evaluation && <p className="poly-console-note ready">Four claims ready. The evidence ledger is still sealed.</p>}
      {evaluation && <p className="poly-console-note ready">Compared without changing a learner answer.</p>}
      <div className="poly-action-grid">
        <button type="button" className="primary" disabled={!snapshot || stale || !complete} onClick={onCheck}>Check four claims</button>
        <button type="button" disabled={!snapshot || stale || hintLevel >= 4} onClick={onHint}>Hint {Math.min(hintLevel + 1, 4)} / 4</button>
        <button type="button" onClick={onClear}>Clear predictions</button>
        <button type="button" onClick={onReset}>Reset pattern</button>
      </div>
      {hint && <div className="poly-hint" aria-live="polite"><span>HINT {hintLevel} · STATE UNCHANGED</span><p>{hint}</p></div>}
    </aside>
  );
}

function EvidenceLedger({ snapshot, evaluation }) {
  if (!snapshot || !evaluation) {
    return (
      <section className="poly-evidence-ledger poly-panel sealed">
        <header className="poly-panel-heading"><div><span>EVIDENCE LEDGER</span><strong>Four shutters remain closed</strong></div><b>SEALED</b></header>
        <p>Choose all four claims, then compare them. The ledger will reveal formulas and reasons without repairing your selections.</p>
        <div aria-hidden="true"><i/><i/><i/><i/></div>
      </section>
    );
  }
  const entries = Object.entries(evaluation.dimensions);
  return (
    <section className="poly-evidence-ledger poly-panel">
      <header className="poly-panel-heading"><div><span>EVIDENCE LEDGER</span><strong>Population arithmetic with claim boundaries</strong></div><b>{evaluation.score.correct}/4</b></header>
      <div className="poly-verdict-grid">
        {entries.map(([key, dimension]) => (
          <article className={dimension.correct ? 'correct' : 'wrong'} key={key}>
            <span>{dimension.correct ? 'SUPPORTED' : 'REVISE THE CLAIM'}</span>
            <h3>{DIMENSION_LABELS[key]}</h3>
            <p><b>Your claim</b> {dimension.learner.replaceAll('-', ' ')}</p>
            <p><b>Model result</b> {dimension.expected.replaceAll('-', ' ')}</p>
            <small>{dimension.reason}</small>
          </article>
        ))}
      </div>
      <div className="poly-stat-ledger">
        {[['Left loom', snapshot.left], ['Right loom', snapshot.right]].map(([label, analysis]) => (
          <article key={label}>
            <header><span>{label}</span><strong>{analysis.repeatUnit.motif}</strong></header>
            <div className="poly-stat-grid">
              <p><span>ΣNi</span><b>{analysis.chainCount}</b><small>representative chains</small></p>
              <p><span>Xn</span><b>{fmt(analysis.numberAverageDegree)}</b><small>{fmt(analysis.degreeLedger)} / {analysis.chainCount}</small></p>
              <p><span>Mn</span><b>{fmt(analysis.numberAverageMolarMass)}</b><small>g mol⁻¹</small></p>
              <p><span>Mw</span><b>{fmt(analysis.massAverageMolarMass)}</b><small>g mol⁻¹</small></p>
              <p><span>ĐM</span><b>{fmt(analysis.dispersity, 4)}</b><small>Mw / Mn</small></p>
              <p><span>End share</span><b>{pct(analysis.endGroupMassFraction, 2)}</b><small>declared caps / ledger</small></p>
            </div>
            <div className="poly-equation-stack">{analysis.equationLedger.map((line) => <code key={line}>{line}</code>)}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

function HistoryRail({ history }) {
  return (
    <aside className="poly-history poly-panel">
      <header className="poly-panel-heading"><div><span>ACTION THREAD</span><strong>Learner moves, in order</strong></div><b>{history.length}</b></header>
      <div>{history.length ? history.map((entry, index) => <article className={entry.type} key={entry.id}><i/><span>#{String(index + 1).padStart(2, '0')} {entry.type}</span><div><strong>{entry.title}</strong><small>{entry.detail}</small></div></article>) : <p>No moves recorded in this pattern yet.</p>}</div>
    </aside>
  );
}

function TeacherRail({ activeId, onLoad }) {
  return (
    <section className="poly-teacher-rail poly-panel">
      <header className="poly-panel-heading"><div><span>TEACHER CONTRAST RAIL</span><strong>Load a misconception. Analysis remains a learner action.</strong></div><b>NO AUTO-RUN</b></header>
      <div>
        {POLYMER_SCENARIOS.map((scenario) => (
          <article className={activeId === scenario.id ? 'active' : ''} key={scenario.id}>
            <span>{CONTRASTS[scenario.id]}</span>
            <h3>{scenario.name}</h3>
            <p>{scenario.teacherQuestion}</p>
            <small>{scenario.misconception}</small>
            <button type="button" onClick={() => onLoad(scenario.id)}>Load pattern <b aria-hidden="true">→</b></button>
          </article>
        ))}
      </div>
      <footer>
        {[['CRU', 'A repeating description is not automatically the same object as a monomer molecule.'], ['One chain', 'A finite chain has one exact declared Mi in this model.'], ['Population', 'Mn and Mw answer different weighted questions about many chains.'], ['Bulk material', 'Morphology and properties require evidence this arithmetic does not contain.']].map(([title, copy]) => <div key={title}><span>{title}</span><p>{copy}</p></div>)}
      </footer>
    </section>
  );
}

function ModelPassport() {
  const passport = MODEL_PASSPORTS.polymerPopulationStudio;
  return (
    <section className="poly-passport" aria-label="Polymer population model passport">
      <header><div><span>MODEL PASSPORT</span><h2>{passport.name}</h2></div><strong>{passport.resultKind}</strong></header>
      <p className="poly-passport-warning">These finite teaching populations explain weighting. They are not measured samples and do not predict a material property or synthesis outcome.</p>
      <div className="poly-passport-grid">
        <article><h3>CONDITIONS</h3>{passport.conditions.map((item) => <p key={item}><b>•</b><span>{item}</span></p>)}</article>
        <article><h3>INCLUDED</h3>{passport.includes.map((item) => <p key={item}><b>+</b><span>{item}</span></p>)}</article>
        <article><h3>NOT INCLUDED</h3>{passport.excludes.map((item) => <p key={item}><b>×</b><span>{item}</span></p>)}</article>
      </div>
      <div className="poly-boundary-strip">
        {Object.entries(POLYMER_MODEL_BOUNDARY).map(([key, value]) => <article key={key}><span>{key.toUpperCase()}</span><p>{value}</p></article>)}
      </div>
      <div className="poly-provenance"><p><b>LEARNER INPUT</b>{passport.inputProvenance}</p><p><b>LOCAL DATA STATEMENT</b>{passport.dataStatement}</p></div>
      <div className="poly-source-grid">
        {passport.sources.map((sourceId) => {
          const source = SCIENCE_SOURCES[sourceId];
          return <a href={source.url} target="_blank" rel="noreferrer" key={source.id}><span>{source.name}</span><small>{source.role}</small><b aria-hidden="true">↗</b></a>;
        })}
      </div>
    </section>
  );
}

export default function PolymerPopulationLab() {
  const initial = POLYMER_SCENARIOS[0];
  const [scenarioId, setScenarioId] = useState(initial.id);
  const [leftPopulation, setLeftPopulation] = useState(() => cloneSpecimen(initial.left));
  const [rightPopulation, setRightPopulation] = useState(() => cloneSpecimen(initial.right));
  const [selectedDegree, setSelectedDegree] = useState({ left: initial.left.bins[0].degree, right: initial.right.bins[0].degree });
  const [newDegree, setNewDegree] = useState({ left: '', right: '' });
  const [issues, setIssues] = useState({ left: '', right: '' });
  const [snapshot, setSnapshot] = useState(null);
  const [stale, setStale] = useState(false);
  const [prediction, setPrediction] = useState(blankPrediction);
  const [evaluation, setEvaluation] = useState(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [hint, setHint] = useState('');
  const [history, setHistory] = useState([]);
  const [analysisNonce, setAnalysisNonce] = useState(0);
  const scenario = POLYMER_SCENARIO_BY_ID[scenarioId];

  const canAnalyse = useMemo(() => (
    leftPopulation.bins.reduce((sum, bin) => sum + bin.count, 0) > 0
    && rightPopulation.bins.reduce((sum, bin) => sum + bin.count, 0) > 0
  ), [leftPopulation, rightPopulation]);

  const addHistory = (type, title, detail) => setHistory((current) => [
    ...current,
    { id: `${current.length + 1}-${type}`, type, title, detail },
  ]);

  const loadScenario = (nextId) => {
    const next = POLYMER_SCENARIO_BY_ID[nextId];
    setScenarioId(nextId);
    setLeftPopulation(cloneSpecimen(next.left));
    setRightPopulation(cloneSpecimen(next.right));
    setSelectedDegree({ left: next.left.bins[0].degree, right: next.right.bins[0].degree });
    setNewDegree({ left: '', right: '' });
    setIssues({ left: '', right: '' });
    setSnapshot(null);
    setStale(false);
    setPrediction(blankPrediction());
    setEvaluation(null);
    setHintLevel(0);
    setHint('');
    setHistory([]);
    setAnalysisNonce(0);
  };

  const mutatePopulation = (side, transform, title, detail) => {
    const setter = side === 'left' ? setLeftPopulation : setRightPopulation;
    setter((current) => transform(current));
    if (snapshot) setStale(true);
    setIssues((current) => ({ ...current, [side]: '' }));
    addHistory('edit', title, detail);
  };

  const changeRepeat = (side, repeatUnitId) => {
    const unit = POLYMER_REPEAT_UNIT_BY_ID[repeatUnitId];
    mutatePopulation(side, (current) => ({ ...current, repeatUnitId }), `${side === 'left' ? 'Loom A' : 'Loom B'} reel changed`, `${unit.name} loaded. No population averages were recalculated.`);
  };

  const editBin = (side, degree, action) => {
    const population = side === 'left' ? leftPopulation : rightPopulation;
    const current = population.bins.find((bin) => bin.degree === degree);
    if (!current) return;
    let detail = '';
    if (action === 'remove') detail = `Removed the X = ${degree} bin; no automatic redistribution occurred.`;
    if (action === 'increment') detail = `Increased the X = ${degree} representative count from ${current.count} to ${current.count + 1}.`;
    if (action === 'decrement') detail = `Decreased the X = ${degree} representative count from ${current.count} to ${Math.max(0, current.count - 1)}.`;
    mutatePopulation(side, (value) => ({
      ...value,
      bins: action === 'remove'
        ? value.bins.filter((bin) => bin.degree !== degree)
        : value.bins.map((bin) => bin.degree === degree
          ? { ...bin, count: action === 'increment' ? Math.min(50, bin.count + 1) : Math.max(0, bin.count - 1) }
          : bin),
    }), `${side === 'left' ? 'Loom A' : 'Loom B'} bin edited`, detail);
    if (action === 'remove') {
      const remaining = population.bins.filter((bin) => bin.degree !== degree);
      setSelectedDegree((value) => ({ ...value, [side]: remaining[0]?.degree ?? null }));
    }
  };

  const addBin = (side) => {
    const population = side === 'left' ? leftPopulation : rightPopulation;
    const degree = Number(newDegree[side]);
    if (!Number.isInteger(degree) || degree < 1 || degree > 200) {
      setIssues((current) => ({ ...current, [side]: 'Enter one whole-number degree from 1 through 200.' }));
      return;
    }
    if (population.bins.some((bin) => bin.degree === degree)) {
      setIssues((current) => ({ ...current, [side]: `X = ${degree} already exists. Use its + control; nothing was changed.` }));
      return;
    }
    if (population.bins.length >= 5) {
      setIssues((current) => ({ ...current, [side]: 'This visual loom holds at most five occupied degree bins.' }));
      return;
    }
    mutatePopulation(side, (current) => ({ ...current, bins: [...current.bins, { degree, count: 1 }] }), `${side === 'left' ? 'Loom A' : 'Loom B'} bin added`, `Added one representative chain at X = ${degree}; no other bin changed.`);
    setSelectedDegree((current) => ({ ...current, [side]: degree }));
    setNewDegree((current) => ({ ...current, [side]: '' }));
  };

  const analyse = () => {
    if (!canAnalyse) return;
    const left = analysePolymerPopulation(leftPopulation);
    const right = analysePolymerPopulation(rightPopulation);
    const comparison = comparePolymerPopulations(left, right);
    setSnapshot({ left, right, comparison });
    setStale(false);
    setEvaluation(null);
    setHintLevel(0);
    setHint('');
    setAnalysisNonce((value) => value + 1);
    addHistory('analysis', 'Both populations analysed', `${left.chainCount} left chains and ${right.chainCount} right chains were frozen into one immutable comparison.`);
  };

  const predict = (key, value) => {
    setPrediction((current) => ({ ...current, [key]: value }));
    setEvaluation(null);
    addHistory('prediction', DIMENSION_LABELS[key], `Learner selected “${value.replaceAll('-', ' ')}”.`);
  };

  const check = () => {
    if (!snapshot || stale) return;
    const result = evaluatePolymerAttempt({ comparison: snapshot.comparison, prediction });
    setEvaluation(result);
    addHistory('checked', 'Four claims compared', `${result.score.correct} of 4 claims are supported by this frozen population snapshot.`);
  };

  const revealHint = () => {
    if (!snapshot || stale || hintLevel >= 4) return;
    const nextLevel = hintLevel + 1;
    const nextHint = nextPolymerHint({ comparison: snapshot.comparison, prediction, level: nextLevel });
    setHintLevel(nextLevel);
    setHint(nextHint);
    addHistory('hint', `Hint ${nextLevel} opened`, 'The hint did not modify a loom, prediction, or analysis value.');
  };

  const clearPredictions = () => {
    setPrediction(blankPrediction());
    setEvaluation(null);
    addHistory('clear', 'Predictions cleared', 'Both looms and the current analysis were left unchanged.');
  };

  return (
    <section className="polymer-population-lab" id="polymerPopulationLab" aria-labelledby="polymerPopulationTitle">
      <header className="poly-hero">
        <div>
          <p className="panel-code">31 / Polymer population studio</p>
          <h2 id="polymerPopulationTitle">Weave chains. <em>Change the weighting.</em></h2>
          <p>Build two finite chain populations by hand, freeze one analysis, and watch the same bins tell different stories when every chain counts once versus when heavier chains carry more mass.</p>
        </div>
        <aside className="poly-hero-ticket">
          <span>MODEL LEVEL</span><strong>CRU → chain → population</strong>
          <div><p><b>Included</b> Mn · Mw · ĐM · end groups</p><p><b>Excluded</b> synthesis · morphology · properties</p></div>
          <small>Nothing is fitted. Nothing is repaired automatically.</small>
        </aside>
      </header>

      <PatternShelf activeId={scenarioId} onSelect={loadScenario}/>

      <section className="poly-mission-strip">
        <div><span>CURRENT PATTERN</span><strong>{scenario.code} · {scenario.name}</strong><p>{scenario.mission}</p></div>
        <div><span>TEACHER QUESTION</span><p>{scenario.teacherQuestion}</p></div>
        <b>SYNTHETIC FINITE POPULATIONS · NOT MEASURED</b>
      </section>

      <div className="poly-loom-grid">
        <PopulationLoom side="left" population={leftPopulation} selectedDegree={selectedDegree.left} newDegree={newDegree.left} issue={issues.left} stale={stale} onRepeat={changeRepeat} onBin={editBin} onSelect={(side, degree) => setSelectedDegree((current) => ({ ...current, [side]: degree }))} onNewDegree={(side, value) => setNewDegree((current) => ({ ...current, [side]: value }))} onAdd={addBin}/>
        <div className="poly-analysis-gate">
          <div className="poly-gate-spindle" aria-hidden="true"><i/><b>Σ</b><i/></div>
          <button type="button" disabled={!canAnalyse} onClick={analyse}><span>Freeze current bins</span><strong>Analyse both populations</strong><small>Creates one immutable number/mass snapshot</small></button>
          <p>{canAnalyse ? 'Learner-triggered arithmetic only' : 'Each loom needs at least one representative chain'}</p>
        </div>
        <PopulationLoom side="right" population={rightPopulation} selectedDegree={selectedDegree.right} newDegree={newDegree.right} issue={issues.right} stale={stale} onRepeat={changeRepeat} onBin={editBin} onSelect={(side, degree) => setSelectedDegree((current) => ({ ...current, [side]: degree }))} onNewDegree={(side, value) => setNewDegree((current) => ({ ...current, [side]: value }))} onAdd={addBin}/>
      </div>

      <AnalysisHall snapshot={snapshot} stale={stale} nonce={analysisNonce}/>

      <div className="poly-learning-grid">
        <PredictionConsole snapshot={snapshot} stale={stale} prediction={prediction} evaluation={evaluation} hintLevel={hintLevel} hint={hint} onPredict={predict} onCheck={check} onHint={revealHint} onClear={clearPredictions} onReset={() => loadScenario(scenarioId)}/>
        <EvidenceLedger snapshot={snapshot} evaluation={evaluation}/>
        <HistoryRail history={history}/>
      </div>

      <TeacherRail activeId={scenarioId} onLoad={loadScenario}/>
      <ModelPassport/>
    </section>
  );
}
