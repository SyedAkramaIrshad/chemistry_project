import { useMemo, useState } from 'react';
import {
  CHROMATOGRAPHY_MODEL_BOUNDARY,
  CHROMATOGRAPHY_PHASE_COLORS,
  CHROMATOGRAPHY_RESOLUTION_BANDS,
  CHROMATOGRAPHY_SCENARIO_BY_ID,
  CHROMATOGRAPHY_SCENARIOS,
} from '../data/chromatographyScenarios.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../data/scienceSources.js';
import {
  compareChromatographyRuns,
  evaluateChromatographyAttempt,
  nextChromatographyHint,
  simulateChromatographyRun,
} from '../chemistry/chromatography.js';
import '../styles/chromatography.css';

const CHART = { width: 960, height: 380, left: 58, right: 24, top: 34, bottom: 54 };
const PREDICTION_DIMENSIONS = [
  ['firstPeak', 'Peak order'],
  ['resolutionClass', 'Resolution band'],
  ['flowRegion', 'Flow region'],
  ['identityClaim', 'Identity boundary'],
];

const blankPrediction = () => ({
  firstPeak: '',
  resolutionClass: '',
  flowRegion: '',
  identityClaim: '',
});

const methodFrom = (scenario) => ({ ...scenario.defaultMethod });
const fmt = (value, digits = 3) => Number(value).toFixed(digits);
const signed = (value, digits = 3) => `${value >= 0 ? '+' : ''}${fmt(value, digits)}`;
const buttonClass = (active, extra = '') => `${active ? 'active ' : ''}${extra}`.trim();

const xFor = (time, run) => CHART.left
  + (time / run.traceEndTime) * (CHART.width - CHART.left - CHART.right);
const yFor = (normalized) => CHART.height - CHART.bottom
  - normalized * (CHART.height - CHART.top - CHART.bottom);

const tracePath = (run, key) => run.trace.map((point, index) => (
  `${index ? 'L' : 'M'}${xFor(point.time, run).toFixed(2)} ${yFor(point[key]).toFixed(2)}`
)).join(' ');

const areaPath = (run, key) => {
  const baseline = CHART.height - CHART.bottom;
  const path = tracePath(run, key);
  const endX = xFor(run.trace.at(-1).time, run);
  const startX = xFor(run.trace[0].time, run);
  return `${path} L${endX.toFixed(2)} ${baseline} L${startX.toFixed(2)} ${baseline} Z`;
};

function SourceConsole({ sourceIds }) {
  return (
    <div className="chrom-source-grid">
      {sourceIds.map((sourceId) => {
        const source = SCIENCE_SOURCES[sourceId];
        return (
          <a href={source.url} target="_blank" rel="noreferrer" key={source.id}>
            <span>{source.name}</span>
            <small>{source.role}</small>
            <b aria-hidden="true">↗</b>
          </a>
        );
      })}
    </div>
  );
}

function ScenarioRail({ activeId, onSelect }) {
  return (
    <nav className="chrom-cassette-rail" aria-label="Chromatography learning challenges">
      {CHROMATOGRAPHY_SCENARIOS.map((scenario) => (
        <button
          type="button"
          className={buttonClass(activeId === scenario.id)}
          aria-pressed={activeId === scenario.id}
          onClick={() => onSelect(scenario.id)}
          key={scenario.id}
        >
          <span>{scenario.code}</span>
          <strong>{scenario.name}</strong>
          <small>{scenario.summary}</small>
        </button>
      ))}
    </nav>
  );
}

function PlateHeightPreview({ scenario, method }) {
  const { A, B, C } = scenario.model;
  const longitudinal = B / method.relativeVelocity;
  const massTransfer = C * method.relativeVelocity;
  const total = A + longitudinal + massTransfer;
  const optimum = Math.sqrt(B / C);
  const rows = [
    ['A', 'Multipath', A, '#6f8794'],
    ['B/u', 'Slow-side diffusion', longitudinal, '#36b6d7'],
    ['C u', 'Fast-side transfer', massTransfer, '#f0ad4e'],
  ];
  return (
    <div className="chrom-height-preview" aria-label="Declared plate-height contributions">
      <header><span>H* contribution rack</span><strong>{fmt(total)}</strong></header>
      {rows.map(([code, label, value, color]) => (
        <div className="chrom-height-row" key={code}>
          <b>{code}</b>
          <i><span style={{ width: `${100 * value / total}%`, background: color }} /></i>
          <small>{label}</small>
          <strong>{fmt(value)}</strong>
        </div>
      ))}
      <footer>
        <span>Declared valley</span>
        <strong>u/u₀ = {fmt(optimum, 2)}</strong>
        <small>Current ratio to valley: {fmt(method.relativeVelocity / optimum, 2)}</small>
      </footer>
    </div>
  );
}

function MethodConsole({ scenario, method, run, stale, onChange, onRun }) {
  return (
    <aside className="chrom-method-console chrom-panel" aria-label="Chromatography method controls">
      <header className="chrom-panel-heading">
        <div><span>METHOD CONSOLE</span><strong>Nothing runs automatically</strong></div>
        <b className={stale ? 'stale' : run ? 'current' : ''}>{stale ? 'PAPER STALE' : run ? 'RUN CURRENT' : 'METHOD OPEN'}</b>
      </header>

      <fieldset className="chrom-phase-bank">
        <legend>Stationary-phase cartridge</legend>
        {scenario.phases.map((phase) => (
          <button
            type="button"
            aria-pressed={method.phaseId === phase.id}
            className={buttonClass(method.phaseId === phase.id)}
            style={{ '--phase-accent': phase.accent }}
            onClick={() => onChange({ phaseId: phase.id }, `${phase.label} loaded; no injection run.`)}
            key={phase.id}
          >
            <i aria-hidden="true" />
            <span><strong>{phase.label}</strong><small>{phase.chemistryHint}</small></span>
            <b>kA {fmt(phase.kA, 2)} · kB {fmt(phase.kB, 2)}</b>
          </button>
        ))}
      </fieldset>

      <fieldset className="chrom-length-rail">
        <legend>Column length</legend>
        <div>
          {[5, 15, 25].map((length) => (
            <button
              type="button"
              aria-pressed={method.columnLengthCm === length}
              className={buttonClass(method.columnLengthCm === length)}
              onClick={() => onChange({ columnLengthCm: length }, `${length} cm teaching column selected; no injection run.`)}
              key={length}
            >{length} cm</button>
          ))}
        </div>
      </fieldset>

      <label className="chrom-flow-control">
        <span><b>Relative linear velocity</b><strong>u/u₀ {fmt(method.relativeVelocity, 2)}</strong></span>
        <input
          type="range"
          min="0.3"
          max="3"
          step="0.05"
          value={method.relativeVelocity}
          onChange={(event) => onChange(
            { relativeVelocity: Number(event.target.value) },
            `Relative velocity set to ${Number(event.target.value).toFixed(2)}; no injection run.`,
          )}
          aria-label="Relative linear velocity u over u zero"
        />
        <div><span>0.30 · slow side</span><span>3.00 · fast side</span></div>
      </label>

      <PlateHeightPreview scenario={scenario} method={method} />

      <button type="button" className="chrom-run-button" onClick={onRun}>
        <span aria-hidden="true">▶</span><b>Run virtual injection</b><small>Generate one frozen paper trace from this exact method</small>
      </button>
      <p className="chrom-no-procedure">Relative teaching controls only · no solvent, pressure, hardware, or laboratory procedure</p>
    </aside>
  );
}

function ColumnInstrument({ run, runNonce, stale }) {
  const peakA = run?.peaks.find((peak) => peak.componentId === 'A');
  const peakB = run?.peaks.find((peak) => peak.componentId === 'B');
  return (
    <div className={`chrom-column-instrument ${run ? 'ran' : ''} ${stale ? 'stale' : ''}`} aria-label="Virtual separation column">
      <header><span>INLET</span><strong>A + B</strong></header>
      <div className="chrom-injector"><i className="component-a"/><i className="component-b"/><b aria-hidden="true">↓</b></div>
      <div className="chrom-column-shell" key={runNonce}>
        <span className="chrom-column-label">{run ? `${run.method.columnLengthCm} cm` : 'column open'}</span>
        <div className="chrom-column-bed" aria-hidden="true">
          <i className="packing p1"/><i className="packing p2"/><i className="packing p3"/><i className="packing p4"/><i className="packing p5"/>
          {run && <>
            <span className="chrom-band component-a" style={{ '--band-delay': `${0.1 + 0.65 * peakA.retentionTime / run.traceEndTime}s` }}/>
            <span className="chrom-band component-b" style={{ '--band-delay': `${0.1 + 0.65 * peakB.retentionTime / run.traceEndTime}s` }}/>
          </>}
        </div>
      </div>
      <div className="chrom-detector-head"><i/><span>DETECTOR</span><b>{run ? 'SIGNAL' : 'ARMED'}</b></div>
      <div className="chrom-paper-port" aria-hidden="true"><span/><span/><span/></div>
      {stale && <p>Displayed paper belongs to the previous run.</p>}
    </div>
  );
}

function Chromatogram({ run, evaluation, stale, runNonce }) {
  if (!run) {
    return (
      <div className="chrom-paper-empty">
        <div className="chrom-empty-axis"><i/><i/><i/><i/><i/></div>
        <span>NO PAPER TRACE</span>
        <strong>Define the method, then run the virtual injection.</strong>
        <small>The plate-height rack is visible now. Retention and peaks remain ungenerated.</small>
      </div>
    );
  }
  const baseline = CHART.height - CHART.bottom;
  const peakA = run.peaks.find((peak) => peak.componentId === 'A');
  const peakB = run.peaks.find((peak) => peak.componentId === 'B');
  const caliperFor = (peak, color) => {
    const peakHeight = peak.responseWeight / (peak.sigma * Math.sqrt(2 * Math.PI)) / run.maximumDetectorSignal;
    const halfY = yFor(peakHeight / 2);
    const halfStart = xFor(Math.max(0, peak.retentionTime - peak.widthHalfHeight / 2), run);
    const halfEnd = xFor(peak.retentionTime + peak.widthHalfHeight / 2, run);
    const baseStart = xFor(Math.max(0, peak.retentionTime - peak.widthBase / 2), run);
    const baseEnd = xFor(peak.retentionTime + peak.widthBase / 2, run);
    return (
      <g className="chrom-caliper" style={{ '--caliper': color }} key={peak.componentId}>
        <line x1={xFor(peak.retentionTime, run)} x2={xFor(peak.retentionTime, run)} y1={CHART.top} y2={baseline}/>
        <text x={xFor(peak.retentionTime, run)} y={CHART.top + 12}>{peak.shortLabel} tR {fmt(peak.retentionTime)}</text>
        <line className="half" x1={halfStart} x2={halfEnd} y1={halfY} y2={halfY}/>
        <line className="tick" x1={halfStart} x2={halfStart} y1={halfY - 5} y2={halfY + 5}/>
        <line className="tick" x1={halfEnd} x2={halfEnd} y1={halfY - 5} y2={halfY + 5}/>
        <text className="width-label" x={(halfStart + halfEnd) / 2} y={halfY - 8}>wh {fmt(peak.widthHalfHeight)}</text>
        <line className="base" x1={baseStart} x2={baseEnd} y1={baseline - 9} y2={baseline - 9}/>
      </g>
    );
  };
  return (
    <div className={`chrom-paper ${stale ? 'stale' : ''}`}>
      <header>
        <div><span>PAPER CHROMATOGRAM</span><strong>{run.scenario.name}</strong></div>
        <div className="chrom-paper-legend"><i className="a"/>A<i className="b"/>B<i className="total"/>Σ detector</div>
      </header>
      <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} role="img" aria-labelledby={`chromChartTitle${runNonce} chromChartDesc${runNonce}`}>
        <title id={`chromChartTitle${runNonce}`}>Synthetic two-component chromatogram</title>
        <desc id={`chromChartDesc${runNonce}`}>The summed detector trace contains component A, component B, and an unretained hold-up marker. Exact quantities are listed below.</desc>
        <defs>
          <pattern id={`chromGrid${runNonce}`} width="56" height="38" patternUnits="userSpaceOnUse">
            <path d="M56 0H0V38" fill="none" stroke="#9db0aa" strokeOpacity=".17" strokeWidth="1"/>
          </pattern>
          <linearGradient id={`chromAFill${runNonce}`} x1="0" y1="0" x2="0" y2="1"><stop stopColor={CHROMATOGRAPHY_PHASE_COLORS.componentA} stopOpacity=".52"/><stop offset="1" stopColor={CHROMATOGRAPHY_PHASE_COLORS.componentA} stopOpacity=".05"/></linearGradient>
          <linearGradient id={`chromBFill${runNonce}`} x1="0" y1="0" x2="0" y2="1"><stop stopColor={CHROMATOGRAPHY_PHASE_COLORS.componentB} stopOpacity=".55"/><stop offset="1" stopColor={CHROMATOGRAPHY_PHASE_COLORS.componentB} stopOpacity=".05"/></linearGradient>
        </defs>
        <rect x={CHART.left} y={CHART.top} width={CHART.width - CHART.left - CHART.right} height={CHART.height - CHART.top - CHART.bottom} fill={`url(#chromGrid${runNonce})`}/>
        <line className="chrom-axis" x1={CHART.left} x2={CHART.width - CHART.right} y1={baseline} y2={baseline}/>
        {Array.from({ length: 6 }, (_, index) => {
          const time = run.traceEndTime * index / 5;
          const x = xFor(time, run);
          return <g className="chrom-time-tick" key={time}><line x1={x} x2={x} y1={baseline} y2={baseline + 7}/><text x={x} y={baseline + 24}>{fmt(time, 1)}</text></g>;
        })}
        <text className="chrom-axis-label" x={(CHART.left + CHART.width - CHART.right) / 2} y={CHART.height - 10}>retention coordinate / min</text>
        <path className="chrom-area component-a" d={areaPath(run, 'normalizedA')} fill={`url(#chromAFill${runNonce})`}/>
        <path className="chrom-area component-b" d={areaPath(run, 'normalizedB')} fill={`url(#chromBFill${runNonce})`}/>
        <path className="chrom-total-trace" d={tracePath(run, 'normalizedTotal')}/>
        <g className="chrom-holdup-marker">
          <line x1={xFor(run.holdUpTime, run)} x2={xFor(run.holdUpTime, run)} y1={CHART.top + 20} y2={baseline}/>
          <circle cx={xFor(run.holdUpTime, run)} cy={baseline} r="6"/>
          <text x={xFor(run.holdUpTime, run)} y={CHART.top + 14}>tM marker</text>
        </g>
        {evaluation && <>{caliperFor(peakA, CHROMATOGRAPHY_PHASE_COLORS.componentA)}{caliperFor(peakB, CHROMATOGRAPHY_PHASE_COLORS.componentB)}</>}
        <line className="chrom-pen-scan" x1={CHART.left} x2={CHART.left} y1={CHART.top} y2={baseline} key={`pen-${runNonce}`}/>
      </svg>
      {stale && <div className="chrom-stale-paper"><b>METHOD CHANGED</b><span>This paper remains the previous run. Press Run virtual injection to generate a new trace.</span></div>}
      <table className="chrom-run-table">
        <caption>Accessible quantity record for the displayed paper</caption>
        <thead><tr><th>Signal</th><th>k</th><th>tR′ / min</th><th>tR / min</th><th>wh / min</th><th>wb / min</th></tr></thead>
        <tbody>
          {run.peaks.map((peak) => <tr key={peak.componentId}><th>{peak.shortLabel}</th><td>{fmt(peak.retentionFactor)}</td><td>{fmt(peak.adjustedRetentionTime)}</td><td>{fmt(peak.retentionTime)}</td><td>{fmt(peak.widthHalfHeight)}</td><td>{fmt(peak.widthBase)}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}

function InstrumentBay({ run, evaluation, stale, runNonce }) {
  return (
    <section className="chrom-instrument-bay chrom-panel" aria-label="Virtual chromatography instrument">
      <header className="chrom-panel-heading">
        <div><span>SEPARATION INSTRUMENT</span><strong>Column → detector → paper</strong></div>
        <b>{run ? `${run.phase.label} · ${run.method.columnLengthCm} cm` : 'NO RUN'}</b>
      </header>
      <div className="chrom-instrument-stage">
        <ColumnInstrument run={run} runNonce={runNonce} stale={stale}/>
        <Chromatogram run={run} evaluation={evaluation} stale={stale} runNonce={runNonce}/>
      </div>
    </section>
  );
}

function PredictionConsole({ run, stale, prediction, evaluation, hintLevel, hint, onPredict, onCheck, onHint, onClear, onReset }) {
  const complete = Object.values(prediction).every(Boolean);
  return (
    <aside className="chrom-prediction-console chrom-panel" aria-label="Learner chromatography predictions">
      <header className="chrom-panel-heading">
        <div><span>CLAIM CONSOLE</span><strong>Commit four claims before opening the evidence rack</strong></div>
        <b>{evaluation ? `${evaluation.score.correct}/4 SUPPORTED` : 'LEARNER OWNED'}</b>
      </header>

      <fieldset disabled={!run || stale}>
        <legend>Which component peak appears first?</legend>
        <div className="chrom-choice-row two">
          <button type="button" aria-pressed={prediction.firstPeak === 'A'} className={buttonClass(prediction.firstPeak === 'A')} onClick={() => onPredict('firstPeak', 'A')}><i className="a"/>Component A</button>
          <button type="button" aria-pressed={prediction.firstPeak === 'B'} className={buttonClass(prediction.firstPeak === 'B')} onClick={() => onPredict('firstPeak', 'B')}><i className="b"/>Component B</button>
        </div>
      </fieldset>

      <fieldset disabled={!run || stale}>
        <legend>How does this board classify Rs?</legend>
        <div className="chrom-choice-row three">
          {Object.values(CHROMATOGRAPHY_RESOLUTION_BANDS).map((band) => (
            <button type="button" aria-pressed={prediction.resolutionClass === band.id} className={buttonClass(prediction.resolutionClass === band.id)} onClick={() => onPredict('resolutionClass', band.id)} key={band.id}><strong>{band.label}</strong><small>{band.id === 'overlap' ? 'Rs < 1.00' : band.id === 'partial' ? '1.00 ≤ Rs < 1.50' : 'Rs ≥ 1.50'}</small></button>
          ))}
        </div>
      </fieldset>

      <fieldset disabled={!run || stale}>
        <legend>Where is u relative to the declared H* valley?</legend>
        <div className="chrom-choice-row three compact">
          {[['slow', 'Slow side'], ['near-optimum', 'Near valley'], ['fast', 'Fast side']].map(([id, label]) => <button type="button" aria-pressed={prediction.flowRegion === id} className={buttonClass(prediction.flowRegion === id)} onClick={() => onPredict('flowRegion', id)} key={id}>{label}</button>)}
        </div>
      </fieldset>

      <fieldset disabled={!run || stale}>
        <legend>Does matching retention alone establish identity?</legend>
        <div className="chrom-choice-row two">
          <button type="button" aria-pressed={prediction.identityClaim === 'established'} className={buttonClass(prediction.identityClaim === 'established', 'danger')} onClick={() => onPredict('identityClaim', 'established')}>Yes · identity established</button>
          <button type="button" aria-pressed={prediction.identityClaim === 'not-established'} className={buttonClass(prediction.identityClaim === 'not-established')} onClick={() => onPredict('identityClaim', 'not-established')}>No · not established</button>
        </div>
      </fieldset>

      {!run && <p className="chrom-console-message">Run one explicit virtual injection before making claims.</p>}
      {stale && <p className="chrom-console-message warning">The method changed. Predictions remain, but comparison waits for a new explicit run.</p>}
      {run && !stale && !complete && <p className="chrom-console-message">Paper current · {Object.values(prediction).filter(Boolean).length}/4 claims set</p>}
      {run && !stale && complete && !evaluation && <p className="chrom-console-message ready">Four claims ready. The evidence rack is still sealed.</p>}
      {evaluation && <p className="chrom-console-message ready">Compared without changing any learner claim.</p>}

      <div className="chrom-action-grid">
        <button type="button" className="primary" disabled={!run || stale || !complete} onClick={onCheck}>Compare four claims</button>
        <button type="button" disabled={!run || stale || hintLevel >= 4} onClick={onHint}>Hint {Math.min(hintLevel + 1, 4)} / 4</button>
        <button type="button" disabled={!Object.values(prediction).some(Boolean)} onClick={onClear}>Clear predictions</button>
        <button type="button" onClick={onReset}>Reset challenge</button>
      </div>
      {hint && <div className="chrom-hint"><span>HINT {hintLevel}</span><p>{hint}</p></div>}
    </aside>
  );
}

function EvidenceRack({ run, evaluation }) {
  if (!run || !evaluation) {
    return (
      <section className="chrom-evidence-rack chrom-panel sealed" aria-live="polite">
        <header><span>EVIDENCE RACK</span><strong>SEALED</strong></header>
        <p>The paper is visible after a run. Exact derived claims and formula substitutions open only after you compare all four predictions.</p>
        <div><i/><i/><i/><i/></div>
      </section>
    );
  }
  const peakA = run.peaks.find((peak) => peak.componentId === 'A');
  const peakB = run.peaks.find((peak) => peak.componentId === 'B');
  return (
    <section className="chrom-evidence-rack chrom-panel" aria-live="polite">
      <header><span>FOUR-CHANNEL EVIDENCE RACK</span><strong>{evaluation.score.correct} / 4 supported</strong></header>
      <div className="chrom-verdict-grid">
        {PREDICTION_DIMENSIONS.map(([id, label]) => {
          const item = evaluation.dimensions[id];
          return (
            <article className={item.correct ? 'correct' : 'wrong'} key={id}>
              <span>{item.correct ? 'SIGNAL AGREES' : 'TRACE AGAIN'}</span>
              <h3>{label}</h3>
              <p><b>You:</b> {item.learner}</p>
              <p><b>Graph:</b> {item.expected}</p>
              <small>{item.reason}</small>
            </article>
          );
        })}
      </div>
      <div className="chrom-formula-ledger">
        <article><span>HOLD-UP</span><strong>tM = {fmt(run.holdUpTime)} min</strong><small>{scenarioHoldUp(run)}</small></article>
        <article><span>RETENTION A</span><strong>tR,A = {fmt(peakA.retentionTime)} min</strong><small>{fmt(run.holdUpTime)} × (1 + {fmt(peakA.retentionFactor)})</small></article>
        <article><span>RETENTION B</span><strong>tR,B = {fmt(peakB.retentionTime)} min</strong><small>{fmt(run.holdUpTime)} × (1 + {fmt(peakB.retentionFactor)})</small></article>
        <article><span>ADJUSTED RETENTION + k</span><strong>tR′A {fmt(peakA.adjustedRetentionTime)} · tR′B {fmt(peakB.adjustedRetentionTime)}</strong><small>kA {fmt(peakA.retentionFactor)} · kB {fmt(peakB.retentionFactor)} · tR′ = k tM</small></article>
        <article><span>SEPARATION FACTOR</span><strong>α = {fmt(run.separationFactor)}</strong><small>larger k / smaller k</small></article>
        <article><span>PLATE HEIGHT INDEX</span><strong>H* = {fmt(run.plateHeight.total)}</strong><small>{fmt(run.plateHeight.multipath)} + {fmt(run.plateHeight.longitudinal)} + {fmt(run.plateHeight.massTransfer)}</small></article>
        <article><span>PLATE NUMBER</span><strong>N = {Math.round(run.plateNumber).toLocaleString()}</strong><small>{run.scenario.model.plateScale} × {run.method.columnLengthCm} / {fmt(run.plateHeight.total)}</small></article>
        <article><span>GAUSSIAN WIDTHS</span><strong>wh,A {fmt(peakA.widthHalfHeight)} · wh,B {fmt(peakB.widthHalfHeight)}</strong><small>wb,A {fmt(peakA.widthBase)} · wb,B {fmt(peakB.widthBase)} min</small></article>
        <article><span>PEAK RESOLUTION</span><strong>Rs = {fmt(run.resolution)}</strong><small>2ΔtR / (wb,A + wb,B)</small></article>
        <article><span>PAPER SPAN</span><strong>{fmt(run.traceEndTime)} min</strong><small>max(tR + 4σ) across the two declared Gaussian peaks</small></article>
        <article><span>IDENTITY</span><strong>Not established</strong><small>Retention evidence requires orthogonal support and a validated method.</small></article>
      </div>
    </section>
  );
}

function scenarioHoldUp(run) {
  const model = run.scenario.model;
  return `${fmt(model.holdUpAtReferenceMin)} × (${run.method.columnLengthCm}/${model.referenceLengthCm}) ÷ ${fmt(run.method.relativeVelocity, 2)}`;
}

function RunComparison({ comparison }) {
  if (!comparison) return null;
  const items = [
    ['α', comparison.changes.separationFactor],
    ['H*', comparison.changes.plateHeight],
    ['N', comparison.changes.plateNumber, 0],
    ['Rs', comparison.changes.resolution],
    ['paper time', comparison.changes.traceEndTime],
  ];
  return (
    <section className="chrom-run-comparison chrom-panel">
      <header><span>PREVIOUS RUN → CURRENT RUN</span><strong>No universal “better” label</strong></header>
      <div>{items.map(([label, value, digits = 3]) => <article key={label}><span>{label}</span><strong>{signed(value, digits)}</strong></article>)}</div>
      <ul>{comparison.statements.map((statement) => <li key={statement}>{statement}</li>)}</ul>
    </section>
  );
}

function TeacherRail({ onLoad }) {
  const cards = [
    {
      title: 'Retention ↔ separation factor',
      detail: 'Moving both peaks later is not the same as increasing the ratio between adjusted retentions.',
      actions: [{ label: 'Load crowded pair', scenarioId: 'crowded-pair', method: { phaseId: 'compact-neutral', columnLengthCm: 15, relativeVelocity: 1.05 } }],
    },
    {
      title: 'Efficiency ↔ selectivity',
      detail: 'Length changes plate number; the selected phase cartridge owns alpha in this frozen model.',
      actions: [{ label: 'Load 5 cm challenge', scenarioId: 'short-column', method: { phaseId: 'modest-selectivity', columnLengthCm: 5, relativeVelocity: 1.2 } }],
    },
    {
      title: 'Slow side ↔ fast side',
      detail: 'The B/u and C u terms make opposite sides of the declared plate-height valley visible.',
      actions: [
        { label: 'Load slow side', scenarioId: 'slow-flow', method: { phaseId: 'flow-study', columnLengthCm: 15, relativeVelocity: 0.35 } },
        { label: 'Load fast side', scenarioId: 'fast-flow', method: { phaseId: 'fast-study', columnLengthCm: 15, relativeVelocity: 2.8 } },
      ],
    },
    {
      title: 'Resolution ↔ identity',
      detail: 'A numerical chromatographic separation does not certify identity, purity, or method validity.',
      actions: [{ label: 'Load identity boundary', scenarioId: 'retention-is-not-identity', method: { phaseId: 'retention-match', columnLengthCm: 15, relativeVelocity: 1.1 } }],
    },
  ];
  return (
    <section className="chrom-teacher-rail chrom-panel">
      <header><span>TEACHER CONTRAST RAIL</span><strong>Load evidence tensions · run nothing automatically</strong></header>
      <div>
        {cards.map((card) => (
          <article key={card.title}>
            <h3>{card.title}</h3>
            <p>{card.detail}</p>
            <div>{card.actions.map((action) => <button type="button" onClick={() => onLoad(action)} key={action.label}>{action.label}<span aria-hidden="true">→</span></button>)}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

function LearningHistory({ entries }) {
  return (
    <aside className="chrom-history chrom-panel">
      <header><span>METHOD LOG</span><strong>Nothing happens silently</strong></header>
      <div>
        {entries.length === 0 && <p>No learner action recorded yet.</p>}
        {entries.map((entry, index) => (
          <article className={entry.type} key={`${entry.type}-${index}-${entry.title}`}>
            <i/>
            <span>{entry.type.replace('-', ' ')}</span>
            <div><strong>{entry.title}</strong><small>{entry.detail}</small></div>
          </article>
        ))}
      </div>
    </aside>
  );
}

function Passport() {
  const passport = MODEL_PASSPORTS.chromatographyControlRoom;
  return (
    <section className="chrom-passport">
      <header><div><span>MODEL PASSPORT · ANALYTICAL SEPARATION</span><h2>{passport.name}</h2></div><strong>{passport.resultKind}</strong></header>
      <p className="chrom-passport-warning">A resolved synthetic trace is evidence about this declared model, not proof of identity, purity, or a transferable real method.</p>
      <div className="chrom-passport-grid">
        <article><h3>CONDITIONS</h3>{passport.conditions.map((item) => <p key={item}><b>•</b>{item}</p>)}</article>
        <article><h3>INCLUDED</h3>{passport.includes.map((item) => <p key={item}><b>+</b>{item}</p>)}</article>
        <article><h3>NOT ESTABLISHED</h3>{passport.excludes.map((item) => <p key={item}><b>−</b>{item}</p>)}</article>
      </div>
      <div className="chrom-boundary-strip">
        {Object.entries(CHROMATOGRAPHY_MODEL_BOUNDARY).map(([key, value]) => <article key={key}><span>{key.toUpperCase()}</span><p>{value}</p></article>)}
      </div>
      <div className="chrom-provenance"><p><b>INPUT PROVENANCE</b>{passport.inputProvenance}</p><p><b>LOCAL ENGINE</b>{passport.dataStatement}</p></div>
      <SourceConsole sourceIds={passport.sources}/>
    </section>
  );
}

export default function ChromatographyLab() {
  const initialScenario = CHROMATOGRAPHY_SCENARIOS[0];
  const [scenarioId, setScenarioId] = useState(initialScenario.id);
  const [method, setMethod] = useState(() => methodFrom(initialScenario));
  const [run, setRun] = useState(null);
  const [stale, setStale] = useState(false);
  const [prediction, setPrediction] = useState(blankPrediction);
  const [evaluation, setEvaluation] = useState(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [history, setHistory] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [runNonce, setRunNonce] = useState(0);
  const scenario = CHROMATOGRAPHY_SCENARIO_BY_ID[scenarioId];
  const hint = useMemo(() => (
    run && hintLevel ? nextChromatographyHint({ run, prediction, level: hintLevel }) : ''
  ), [run, prediction, hintLevel]);

  const record = (type, title, detail) => {
    setHistory((current) => [{ type, title, detail }, ...current].slice(0, 14));
  };

  const loadScenario = (nextId) => {
    const next = CHROMATOGRAPHY_SCENARIO_BY_ID[nextId];
    setScenarioId(nextId);
    setMethod(methodFrom(next));
    setRun(null);
    setStale(false);
    setPrediction(blankPrediction());
    setEvaluation(null);
    setHintLevel(0);
    setHistory([{ type: 'loaded', title: `${next.code} loaded`, detail: 'Default method restored. No virtual injection has run.' }]);
    setComparison(null);
    setRunNonce((value) => value + 1);
  };

  const loadTeachingPreset = ({ scenarioId: nextId, method: nextMethod, label }) => {
    const next = CHROMATOGRAPHY_SCENARIO_BY_ID[nextId];
    setScenarioId(nextId);
    setMethod({ ...nextMethod });
    setRun(null);
    setStale(false);
    setPrediction(blankPrediction());
    setEvaluation(null);
    setHintLevel(0);
    setComparison(null);
    setHistory([{ type: 'teacher-load', title: label, detail: 'Cassette and method loaded. No virtual injection has run.' }]);
    setRunNonce((value) => value + 1);
  };

  const changeMethod = (patch, detail) => {
    setMethod((current) => ({ ...current, ...patch }));
    if (run) setStale(true);
    setComparison(null);
    record('method-change', 'Method control changed', detail);
  };

  const runInjection = () => {
    const nextRun = simulateChromatographyRun({ scenarioId, method });
    setComparison(run ? compareChromatographyRuns(run, nextRun) : null);
    setRun(nextRun);
    setStale(false);
    setEvaluation(null);
    setHintLevel(0);
    setRunNonce((value) => value + 1);
    record('run', 'Virtual injection run', `${nextRun.phase.label}; ${nextRun.method.columnLengthCm} cm; u/u₀ ${fmt(nextRun.method.relativeVelocity, 2)}. Existing predictions were not changed.`);
  };

  const predict = (key, value) => {
    setPrediction((current) => ({ ...current, [key]: value }));
    setEvaluation(null);
    record('prediction', `${key} claim set`, `${value}; no method control or chromatogram changed.`);
  };

  const check = () => {
    const next = evaluateChromatographyAttempt({ run, prediction });
    setEvaluation(next);
    record('checked', 'Four claims compared', `${next.score.correct}/4 supported; every learner claim remains unchanged.`);
  };

  const requestHint = () => {
    const nextLevel = Math.min(4, hintLevel + 1);
    setHintLevel(nextLevel);
    record('hint', `Hint ${nextLevel}/4 opened`, 'The method, paper, and learner predictions were not changed.');
  };

  const clearPredictions = () => {
    setPrediction(blankPrediction());
    setEvaluation(null);
    record('cleared', 'Predictions cleared explicitly', 'The method and displayed paper remain unchanged.');
  };

  const resetChallenge = () => {
    setMethod(methodFrom(scenario));
    setRun(null);
    setStale(false);
    setPrediction(blankPrediction());
    setEvaluation(null);
    setHintLevel(0);
    setComparison(null);
    setHistory([]);
    setRunNonce((value) => value + 1);
  };

  return (
    <section className="chromatography-lab" id="chromatographyLab" aria-labelledby="chromatographyLabTitle">
      <header className="chrom-hero">
        <div>
          <p className="section-code">21 / Analytical separation signals</p>
          <h2 id="chromatographyLabTitle">A later peak is not automatically a better separation.</h2>
          <p>Load a teaching phase, set length and relative velocity, run one virtual injection, and defend what the paper can—and cannot—establish.</p>
        </div>
        <div className="chrom-condition-stamp"><span>FROZEN SEPARATION CONTROL ROOM</span><strong>6 challenges · 3 method levers · 4 claims</strong><small>Local Gaussian teaching traces · no identity oracle</small></div>
      </header>

      <ScenarioRail activeId={scenarioId} onSelect={loadScenario}/>

      <div className="chrom-mission-strip">
        <div><span>{scenario.code} · CURRENT MISSION</span><strong>{scenario.mission}</strong></div>
        <p><b>Teacher lens</b>{scenario.teacherQuestion}</p>
        <p><b>Misconception to surface</b>{scenario.misconception}</p>
      </div>

      <div className="chrom-control-grid">
        <MethodConsole scenario={scenario} method={method} run={run} stale={stale} onChange={changeMethod} onRun={runInjection}/>
        <InstrumentBay run={run} evaluation={evaluation} stale={stale} runNonce={runNonce}/>
      </div>

      <div className="chrom-learning-grid">
        <PredictionConsole
          run={run}
          stale={stale}
          prediction={prediction}
          evaluation={evaluation}
          hintLevel={hintLevel}
          hint={hint}
          onPredict={predict}
          onCheck={check}
          onHint={requestHint}
          onClear={clearPredictions}
          onReset={resetChallenge}
        />
        <EvidenceRack run={run} evaluation={evaluation}/>
        <LearningHistory entries={history}/>
      </div>

      <RunComparison comparison={comparison}/>
      <TeacherRail onLoad={loadTeachingPreset}/>
      <Passport />
    </section>
  );
}
