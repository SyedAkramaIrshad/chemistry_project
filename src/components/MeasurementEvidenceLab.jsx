import { useMemo, useState } from 'react';
import {
  analyzeAssayComparison,
  analyzeDetectionGate,
  evaluateAssayPrediction,
  evaluateDetectionPrediction,
  nextAssayHint,
  nextDetectionHint,
} from '../chemistry/measurementUncertainty.js';
import {
  ASSAY_COMPARISON_SCENARIO_BY_ID,
  ASSAY_COMPARISON_SCENARIOS,
  DETECTION_GATE_SCENARIO_BY_ID,
  DETECTION_GATE_SCENARIOS,
  MEASUREMENT_UNCERTAINTY_MODEL_BOUNDARY,
} from '../data/measurementScenarios.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../data/scienceSources.js';
import '../styles/measurement-evidence.css';

const ASSAY_COLORS = Object.freeze({ a: '#25a9c2', b: '#6b63d9' });
const ASSAY_EMPTY_PREDICTION = Object.freeze({
  moreRepeatable: '',
  closerReference: '',
  laneAContainsReference: '',
  laneBContainsReference: '',
});
const DETECTION_EMPTY_PREDICTION = Object.freeze({
  candidateDecision: '',
  lodVsQuantitation: '',
  doubledNoiseEffect: '',
  moreBlankReplicatesEffect: '',
});

function significant(value, digits = 4) {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';
  const absolute = Math.abs(value);
  if (absolute >= 1000 || absolute < 0.001) return value.toExponential(Math.max(1, digits - 1));
  return Number(value.toPrecision(digits)).toString();
}

function finiteInput(setter, minimum = -Infinity, maximum = Infinity) {
  return (event) => {
    const value = event.target.valueAsNumber;
    if (Number.isFinite(value)) setter(Math.max(minimum, Math.min(maximum, value)));
  };
}

function replaceAt(values, index, nextValue) {
  return values.map((value, valueIndex) => (valueIndex === index ? nextValue : value));
}

function choiceComplete(prediction) {
  return Object.values(prediction).every((value) => value !== '');
}

function ChoiceButtons({ label, value, options, onChange }) {
  return (
    <fieldset className="me-choice">
      <legend>{label}</legend>
      <div>
        {options.map((option) => (
          <button
            type="button"
            key={option.value}
            className={value === option.value ? 'active' : ''}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function ScenarioRail({ scenarios, activeId, onSelect }) {
  return (
    <div className="me-scenario-rail" aria-label="Teaching scenarios">
      {scenarios.map((scenario) => (
        <button
          type="button"
          key={scenario.id}
          className={scenario.id === activeId ? 'active' : ''}
          aria-pressed={scenario.id === activeId}
          onClick={() => onSelect(scenario.id)}
        >
          <span>{scenario.code}</span>
          <strong>{scenario.name}</strong>
          <small>{scenario.summary}</small>
        </button>
      ))}
    </div>
  );
}

function ReplicateRack({ lane, label, values, color, minimum, onChange, onAdd, onRemove }) {
  return (
    <section className="me-replicate-rack" style={{ '--lane-color': color }}>
      <header>
        <div><i /><span>{lane}</span><strong>{label}</strong></div>
        <button type="button" onClick={onAdd} disabled={values.length >= 31}>+ Add repeat</button>
      </header>
      <div className="me-replicate-inputs">
        {values.map((value, index) => (
          <label key={`${lane}-${index}`}>
            <span>{lane}{index + 1}</span>
            <input
              type="number"
              step="0.001"
              value={value}
              aria-label={`${lane} replicate ${index + 1}`}
              onChange={(event) => {
                const nextValue = event.target.valueAsNumber;
                if (Number.isFinite(nextValue)) onChange(replaceAt(values, index, nextValue));
              }}
            />
            <button
              type="button"
              aria-label={`Remove ${lane} replicate ${index + 1}`}
              title={`Remove ${lane}${index + 1}`}
              disabled={values.length <= minimum}
              onClick={() => onRemove(index)}
            >
              ×
            </button>
          </label>
        ))}
      </div>
      <p>No value is rejected or repaired automatically. Removal is always your action.</p>
    </section>
  );
}

function AssayCaliper({ analysis, laneALabel, laneBLabel, unit }) {
  const width = 1000;
  const left = 88;
  const right = 958;
  const allValues = [
    ...analysis.laneA.values,
    ...analysis.laneB.values,
    analysis.input.referenceValue,
    analysis.laneA.confidence95.lower,
    analysis.laneA.confidence95.upper,
    analysis.laneB.confidence95.lower,
    analysis.laneB.confidence95.upper,
    analysis.laneA.uncertainty.coverageInterval.lower,
    analysis.laneA.uncertainty.coverageInterval.upper,
    analysis.laneB.uncertainty.coverageInterval.lower,
    analysis.laneB.uncertainty.coverageInterval.upper,
  ];
  const dataMinimum = Math.min(...allValues);
  const dataMaximum = Math.max(...allValues);
  const span = Math.max(dataMaximum - dataMinimum, Math.max(Math.abs(dataMaximum), 1) * 0.04);
  const minimum = dataMinimum - span * 0.1;
  const maximum = dataMaximum + span * 0.1;
  const x = (value) => left + ((value - minimum) / (maximum - minimum)) * (right - left);
  const ticks = Array.from({ length: 6 }, (_, index) => minimum + (maximum - minimum) * index / 5);
  const lanes = [
    { key: 'A', y: 116, color: ASSAY_COLORS.a, label: laneALabel, analysis: analysis.laneA },
    { key: 'B', y: 254, color: ASSAY_COLORS.b, label: laneBLabel, analysis: analysis.laneB },
  ];

  return (
    <div className="me-caliper-shell">
      <div className="me-visual-kicker"><span><i /> Live evidence field</span><strong>same scale · different questions</strong></div>
      <svg
        className="me-caliper"
        viewBox="0 0 1000 340"
        role="img"
        aria-label={`Two replicate lanes on a shared ${unit} scale. Reference ${significant(analysis.input.referenceValue)}. Lane A mean ${significant(analysis.laneA.mean)} and Lane B mean ${significant(analysis.laneB.mean)}.`}
      >
        <title>Twin assay calipers</title>
        <desc>Every circle is an editable replicate. The narrow line is the 95 percent Student-t interval. The translucent ribbon is the separate expanded-uncertainty interval.</desc>
        <rect className="me-caliper-bed" x="24" y="18" width="960" height="296" rx="26" />
        {ticks.map((tick) => (
          <g key={tick}>
            <line className="me-caliper-grid" x1={x(tick)} x2={x(tick)} y1="46" y2="286" />
            <text className="me-caliper-tick" x={x(tick)} y="307" textAnchor="middle">{significant(tick, 3)}</text>
          </g>
        ))}
        <line className="me-reference-beam" x1={x(analysis.input.referenceValue)} x2={x(analysis.input.referenceValue)} y1="35" y2="288" />
        <g className="me-reference-label" transform={`translate(${x(analysis.input.referenceValue)}, 35)`}>
          <rect x="-52" y="-17" width="104" height="25" rx="12.5" />
          <text textAnchor="middle" y="1">REFERENCE {significant(analysis.input.referenceValue, 4)}</text>
        </g>
        {lanes.map((lane) => {
          const ci = lane.analysis.confidence95;
          const uncertainty = lane.analysis.uncertainty.coverageInterval;
          return (
            <g key={lane.key} style={{ '--lane-color': lane.color }}>
              <text className="me-lane-letter" x="45" y={lane.y + 5}>{lane.key}</text>
              <text className="me-lane-name" x="88" y={lane.y - 42}>{lane.label}</text>
              <rect
                className="me-expanded-ribbon"
                x={x(uncertainty.lower)}
                y={lane.y - 22}
                width={Math.max(2, x(uncertainty.upper) - x(uncertainty.lower))}
                height="44"
                rx="22"
              />
              <line className="me-ci-line" x1={x(ci.lower)} x2={x(ci.upper)} y1={lane.y} y2={lane.y} />
              <path className="me-ci-jaw" d={`M ${x(ci.lower)} ${lane.y - 24} V ${lane.y + 24} M ${x(ci.upper)} ${lane.y - 24} V ${lane.y + 24}`} />
              {lane.analysis.values.map((value, index) => (
                <g className="me-pin" key={`${lane.key}-${index}`} transform={`translate(${x(value)}, ${lane.y + ((index % 3) - 1) * 10})`}>
                  <line y1="-17" y2="17" />
                  <circle r="7" />
                  <title>{`${lane.key}${index + 1}: ${significant(value)} ${unit}`}</title>
                </g>
              ))}
              <g className="me-mean-carriage" transform={`translate(${x(lane.analysis.mean)}, ${lane.y})`}>
                <path d="M 0 -17 L 15 0 L 0 17 L -15 0 Z" />
                <text y="-27" textAnchor="middle">x̄ {significant(lane.analysis.mean)}</text>
              </g>
            </g>
          );
        })}
        <text className="me-caliper-axis" x={(left + right) / 2} y="330" textAnchor="middle">{unit}</text>
      </svg>
      <div className="me-visual-key">
        <span><i className="pin" /> editable replicate</span>
        <span><i className="mean" /> sample mean</span>
        <span><i className="ci" /> 95% t interval</span>
        <span><i className="uncertainty" /> x̄ ± U, with visible k</span>
        <span><i className="reference" /> teaching reference</span>
      </div>
    </div>
  );
}

function UncertaintyVector({ lane, analysis, color }) {
  const uA = analysis.uncertainty.typeAStandardUncertainty;
  const uB = analysis.uncertainty.typeBStandardUncertainty;
  const uc = analysis.uncertainty.combinedStandardUncertainty;
  const scale = 90 / Math.max(uc, 1e-12);
  const horizontal = Math.max(1, uA * scale);
  const vertical = Math.max(1, uB * scale);
  return (
    <article className="me-budget-card" style={{ '--lane-color': color }}>
      <header><span>{lane} uncertainty budget</span><strong>U = {significant(analysis.uncertainty.expandedUncertainty)}</strong></header>
      <div className="me-vector-wrap">
        <svg viewBox="0 0 150 125" role="img" aria-label={`${lane} Type A ${significant(uA)}, Type B ${significant(uB)}, combined standard uncertainty ${significant(uc)}.`}>
          <line className="me-vector-a" x1="25" y1="100" x2={25 + horizontal} y2="100" />
          <line className="me-vector-b" x1={25 + horizontal} y1="100" x2={25 + horizontal} y2={100 - vertical} />
          <line className="me-vector-c" x1="25" y1="100" x2={25 + horizontal} y2={100 - vertical} />
          <circle cx="25" cy="100" r="4" />
          <text x="25" y="118">0</text>
          <text x={25 + horizontal / 2} y="94" textAnchor="middle">uA</text>
          <text x={31 + horizontal} y={100 - vertical / 2}>uB</text>
          <text x={20 + horizontal / 2} y={92 - vertical / 2} textAnchor="end">uc</text>
        </svg>
      </div>
      <dl>
        <div><dt>Type A · s/√n</dt><dd>{significant(uA)}</dd></div>
        <div><dt>Type B · entered</dt><dd>{significant(uB)}</dd></div>
        <div><dt>Combined · RSS</dt><dd>{significant(uc)}</dd></div>
        <div><dt>Coverage factor</dt><dd>k = {significant(analysis.uncertainty.coverageFactor)}</dd></div>
      </dl>
    </article>
  );
}

function EvaluationPanel({ evaluation }) {
  if (!evaluation) return <div className="me-awaiting"><i>?</i><div><strong>Your claims stay yours.</strong><p>Commit all four choices to compare each one independently with the current evidence.</p></div></div>;
  return (
    <div className="me-evaluation" aria-live="polite">
      <header><span>Comparison complete</span><strong>{evaluation.score.correct} / {evaluation.score.total} supported</strong></header>
      <div>
        {Object.entries(evaluation.dimensions).map(([id, dimension]) => (
          <article key={id} className={dimension.correct ? 'correct' : 'incorrect'}>
            <span>{dimension.correct ? 'Supported' : 'Revisit'}</span>
            <strong>{dimension.label}</strong>
            <p><b>You:</b> {dimension.learnerLabel}</p>
            <p><b>Evidence:</b> {dimension.expectedLabel}</p>
            <small>{dimension.reason}</small>
          </article>
        ))}
      </div>
    </div>
  );
}

function AssayMode() {
  const initial = ASSAY_COMPARISON_SCENARIOS[0];
  const [scenarioId, setScenarioId] = useState(initial.id);
  const [laneA, setLaneA] = useState([...initial.laneA]);
  const [laneB, setLaneB] = useState([...initial.laneB]);
  const [referenceValue, setReferenceValue] = useState(initial.referenceValue);
  const [typeB, setTypeB] = useState(initial.typeBStandardUncertainty);
  const [coverageFactor, setCoverageFactor] = useState(initial.coverageFactor);
  const [prediction, setPrediction] = useState({ ...ASSAY_EMPTY_PREDICTION });
  const [compared, setCompared] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const scenario = ASSAY_COMPARISON_SCENARIO_BY_ID[scenarioId];
  const analysis = useMemo(() => analyzeAssayComparison({
    laneA,
    laneB,
    referenceValue,
    typeBStandardUncertainty: typeB,
    coverageFactor,
  }), [laneA, laneB, referenceValue, typeB, coverageFactor]);
  const enginePrediction = useMemo(() => ({
    moreRepeatable: prediction.moreRepeatable,
    closerReference: prediction.closerReference,
    laneAContainsReference: prediction.laneAContainsReference === 'yes',
    laneBContainsReference: prediction.laneBContainsReference === 'yes',
  }), [prediction]);
  const evaluation = useMemo(
    () => (compared ? evaluateAssayPrediction({ analysis, prediction: enginePrediction }) : null),
    [analysis, compared, enginePrediction],
  );
  const hint = hintLevel ? nextAssayHint({ analysis, level: hintLevel }) : '';

  const loadScenario = (id) => {
    const next = ASSAY_COMPARISON_SCENARIO_BY_ID[id];
    setScenarioId(id);
    setLaneA([...next.laneA]);
    setLaneB([...next.laneB]);
    setReferenceValue(next.referenceValue);
    setTypeB(next.typeBStandardUncertainty);
    setCoverageFactor(next.coverageFactor);
    setPrediction({ ...ASSAY_EMPTY_PREDICTION });
    setCompared(false);
    setHintLevel(0);
  };
  const removeValue = (setter, values, index) => setter(values.filter((_, valueIndex) => valueIndex !== index));
  const addValue = (setter, values) => {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    setter([...values, Number(mean.toPrecision(6))]);
  };
  const setChoice = (key) => (value) => setPrediction((current) => ({ ...current, [key]: value }));

  return (
    <div className="me-mode-panel">
      <ScenarioRail scenarios={ASSAY_COMPARISON_SCENARIOS} activeId={scenarioId} onSelect={loadScenario} />
      <div className="me-assay-workbench">
        <section className="me-instrument-controls">
          <div className="me-panel-heading"><span>Editable assay rack</span><strong>Every result remains inspectable</strong></div>
          <ReplicateRack lane="A" label={scenario.laneALabel} values={laneA} color={ASSAY_COLORS.a} minimum={3} onChange={setLaneA} onAdd={() => addValue(setLaneA, laneA)} onRemove={(index) => removeValue(setLaneA, laneA, index)} />
          <ReplicateRack lane="B" label={scenario.laneBLabel} values={laneB} color={ASSAY_COLORS.b} minimum={3} onChange={setLaneB} onAdd={() => addValue(setLaneB, laneB)} onRemove={(index) => removeValue(setLaneB, laneB, index)} />
          <div className="me-assay-settings">
            <label><span>Teaching reference</span><div><input type="number" step="0.001" value={referenceValue} onChange={finiteInput(setReferenceValue)} /><b>{scenario.unit}</b></div></label>
            <label><span>Type B standard uncertainty</span><div><input type="number" min="0" step="0.001" value={typeB} onChange={finiteInput(setTypeB, 0)} /><b>uB</b></div></label>
            <label><span>Expanded-uncertainty factor</span><div><input type="number" min="1" max="3" step="0.1" value={coverageFactor} onChange={finiteInput(setCoverageFactor, 1, 3)} /><b>k</b></div></label>
          </div>
          <button className="me-reset" type="button" onClick={() => loadScenario(scenarioId)}>Reset this synthetic case</button>
        </section>

        <section className="me-assay-stage">
          <AssayCaliper analysis={analysis} laneALabel={scenario.laneALabel} laneBLabel={scenario.laneBLabel} unit={scenario.unit} />
          <div className="me-stat-ledger">
            {[
              ['Lane A', analysis.laneA, ASSAY_COLORS.a],
              ['Lane B', analysis.laneB, ASSAY_COLORS.b],
            ].map(([label, lane, color]) => (
              <article key={label} style={{ '--lane-color': color }}>
                <header><i /><span>{label}</span><strong>n = {lane.count}</strong></header>
                <dl>
                  <div><dt>mean x̄</dt><dd>{significant(lane.mean)}</dd></div>
                  <div><dt>sample s</dt><dd>{significant(lane.sampleStandardDeviation)}</dd></div>
                  <div><dt>SE</dt><dd>{significant(lane.standardError)}</dd></div>
                  <div><dt>95% t half-width</dt><dd>{significant(lane.confidence95.halfWidth)}</dd></div>
                  <div><dt>signed difference</dt><dd>{significant(lane.bias)}</dd></div>
                </dl>
              </article>
            ))}
          </div>
          <div className="me-confidence-caution"><i>95%</i><p><strong>A long-run procedure, not a probability badge.</strong> If this interval-making procedure were repeated under its assumptions, 95% of those intervals would contain the population mean. One completed interval does not give a 95% probability for its fixed endpoints.</p></div>
        </section>

        <section className="me-budget">
          <div className="me-panel-heading"><span>Uncertainty vector table</span><strong>Confidence and expanded uncertainty stay separate</strong></div>
          <div><UncertaintyVector lane="Lane A" analysis={analysis.laneA} color={ASSAY_COLORS.a} /><UncertaintyVector lane="Lane B" analysis={analysis.laneB} color={ASSAY_COLORS.b} /></div>
          <p><strong>Read this deliberately:</strong> U = kuc uses the displayed factor k. The interface does not silently call x̄ ± U a 95% confidence interval or assign it an automatic probability.</p>
        </section>

        <section className="me-prediction-panel">
          <div className="me-panel-heading"><span>Predict before you certify</span><strong>Four independent claims</strong></div>
          <div className="me-prediction-grid">
            <ChoiceButtons label="Which lane is more repeatable here?" value={prediction.moreRepeatable} onChange={setChoice('moreRepeatable')} options={[{ value: 'lane-a', label: 'Lane A' }, { value: 'lane-b', label: 'Lane B' }, { value: 'tie', label: 'Tie' }]} />
            <ChoiceButtons label="Which mean is closer to the reference?" value={prediction.closerReference} onChange={setChoice('closerReference')} options={[{ value: 'lane-a', label: 'Lane A' }, { value: 'lane-b', label: 'Lane B' }, { value: 'tie', label: 'Tie' }]} />
            <ChoiceButtons label="Reference inside Lane A 95% t interval?" value={prediction.laneAContainsReference} onChange={setChoice('laneAContainsReference')} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} />
            <ChoiceButtons label="Reference inside Lane B 95% t interval?" value={prediction.laneBContainsReference} onChange={setChoice('laneBContainsReference')} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} />
          </div>
          <div className="me-commit-row">
            <button type="button" disabled={!choiceComplete(prediction)} onClick={() => setCompared(true)}>Compare my four claims</button>
            <button type="button" onClick={() => setHintLevel((level) => Math.min(4, level + 1))} disabled={hintLevel >= 4}>Hint {Math.min(4, hintLevel + 1)} of 4</button>
          </div>
          {hint && <p className="me-hint"><span>Hint {hintLevel}</span>{hint}</p>}
          <EvaluationPanel evaluation={evaluation} />
        </section>

        <aside className="me-teacher-question">
          <span>Teacher lens · {scenario.code}</span>
          <strong>{scenario.teacherQuestion}</strong>
          <p><b>Misconception to surface:</b> {scenario.misconception}</p>
          <small>{scenario.provenance.statement}</small>
        </aside>
      </div>
    </div>
  );
}

function DetectionGatePlot({ analysis, signalUnit }) {
  const width = 1000;
  const left = 80;
  const right = 955;
  const allValues = [
    ...analysis.blank.values,
    analysis.blank.mean,
    analysis.thresholdSignal,
    analysis.candidateSignal,
    analysis.counterfactuals.doubledNoise.thresholdSignal,
  ];
  const dataMinimum = Math.min(...allValues);
  const dataMaximum = Math.max(...allValues);
  const span = Math.max(dataMaximum - dataMinimum, 0.002);
  const minimum = dataMinimum - span * 0.12;
  const maximum = dataMaximum + span * 0.12;
  const x = (value) => left + ((value - minimum) / (maximum - minimum)) * (right - left);
  const ticks = Array.from({ length: 6 }, (_, index) => minimum + (maximum - minimum) * index / 5);

  return (
    <div className="me-gate-shell">
      <div className="me-visual-kicker"><span><i /> Blank response field</span><strong>sBlank, not SE, sets this gate</strong></div>
      <svg className="me-gate-plot" viewBox="0 0 1000 330" role="img" aria-label={`Blank mean ${significant(analysis.blank.mean)}, detection gate ${significant(analysis.thresholdSignal)}, candidate ${significant(analysis.candidateSignal)} ${signalUnit}.`}>
        <title>Blank noise detection gate</title>
        <desc>Blank observations, their mean, the declared blank mean plus factor times blank sample standard deviation threshold, and one candidate signal share one scale.</desc>
        <rect className="me-gate-bed" x="24" y="18" width="960" height="280" rx="26" />
        <rect className="me-gate-zone" x={left} y="61" width={Math.max(0, x(analysis.thresholdSignal) - left)} height="190" rx="18" />
        {ticks.map((tick) => (
          <g key={tick}>
            <line className="me-gate-grid" x1={x(tick)} x2={x(tick)} y1="48" y2="264" />
            <text className="me-gate-tick" x={x(tick)} y="287" textAnchor="middle">{significant(tick, 3)}</text>
          </g>
        ))}
        <text className="me-gate-zone-label" x={left + 18} y="84">BLANK-NOISE SIDE</text>
        <line className="me-blank-axis" x1={left} x2={right} y1="185" y2="185" />
        {analysis.blank.values.map((value, index) => (
          <g className="me-blank-pin" key={index} transform={`translate(${x(value)}, ${178 + ((index % 3) - 1) * 22})`}>
            <line y1="-24" y2="24" />
            <circle r="8" />
            <text y="-31" textAnchor="middle">B{index + 1}</text>
          </g>
        ))}
        <g className="me-blank-mean" transform={`translate(${x(analysis.blank.mean)}, 222)`}>
          <path d="M -11 0 L 0 -11 L 11 0 L 0 11 Z" />
          <text y="29" textAnchor="middle">blank x̄ {significant(analysis.blank.mean)}</text>
        </g>
        <g className="me-threshold-gate" transform={`translate(${x(analysis.thresholdSignal)}, 47)`}>
          <line y1="0" y2="211" />
          <path d="M -16 3 H 16 V 34 H -16" />
          <text y="-8" textAnchor="middle">xL {significant(analysis.thresholdSignal)}</text>
        </g>
        <g className={`me-candidate-probe ${analysis.answer.candidateDecision}`} transform={`translate(${x(analysis.candidateSignal)}, 116)`}>
          <circle r="22" />
          <path d="M -8 0 H 8 M 0 -8 V 8" />
          <text y="-33" textAnchor="middle">candidate {significant(analysis.candidateSignal)}</text>
        </g>
        <text className="me-gate-axis-label" x={(left + right) / 2} y="316" textAnchor="middle">response / {signalUnit}</text>
      </svg>
      <div className="me-gate-equation">
        <code>xL = {significant(analysis.blank.mean)} + {significant(analysis.input.detectionFactor)} × {significant(analysis.blank.sampleStandardDeviation)} = {significant(analysis.thresholdSignal)}</code>
        <span>{analysis.candidateRelation.label}</span>
      </div>
    </div>
  );
}

function DetectionMode() {
  const initial = DETECTION_GATE_SCENARIOS[0];
  const [scenarioId, setScenarioId] = useState(initial.id);
  const [blankValues, setBlankValues] = useState([...initial.blankValues]);
  const [candidateSignal, setCandidateSignal] = useState(initial.candidateSignal);
  const [calibrationSlope, setCalibrationSlope] = useState(initial.calibrationSlope);
  const [calibrationIntercept, setCalibrationIntercept] = useState(initial.calibrationIntercept);
  const [detectionFactor, setDetectionFactor] = useState(initial.detectionFactor);
  const [prediction, setPrediction] = useState({ ...DETECTION_EMPTY_PREDICTION });
  const [compared, setCompared] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const scenario = DETECTION_GATE_SCENARIO_BY_ID[scenarioId];
  const analysis = useMemo(() => analyzeDetectionGate({
    blankValues,
    candidateSignal,
    calibrationSlope,
    calibrationIntercept,
    detectionFactor,
  }), [blankValues, candidateSignal, calibrationSlope, calibrationIntercept, detectionFactor]);
  const evaluation = useMemo(
    () => (compared ? evaluateDetectionPrediction({ analysis, prediction }) : null),
    [analysis, compared, prediction],
  );
  const hint = hintLevel ? nextDetectionHint({ analysis, level: hintLevel }) : '';

  const loadScenario = (id) => {
    const next = DETECTION_GATE_SCENARIO_BY_ID[id];
    setScenarioId(id);
    setBlankValues([...next.blankValues]);
    setCandidateSignal(next.candidateSignal);
    setCalibrationSlope(next.calibrationSlope);
    setCalibrationIntercept(next.calibrationIntercept);
    setDetectionFactor(next.detectionFactor);
    setPrediction({ ...DETECTION_EMPTY_PREDICTION });
    setCompared(false);
    setHintLevel(0);
  };
  const setChoice = (key) => (value) => setPrediction((current) => ({ ...current, [key]: value }));
  const addBlank = () => {
    if (blankValues.length >= 31) return;
    const mean = blankValues.reduce((sum, value) => sum + value, 0) / blankValues.length;
    setBlankValues([...blankValues, Number(mean.toPrecision(6))]);
  };

  return (
    <div className="me-mode-panel">
      <ScenarioRail scenarios={DETECTION_GATE_SCENARIOS} activeId={scenarioId} onSelect={loadScenario} />
      <div className="me-detection-workbench">
        <section className="me-gate-controls">
          <div className="me-panel-heading"><span>Blank rack</span><strong>Noise remains visible</strong></div>
          <ReplicateRack
            lane="B"
            label="Synthetic blank response"
            values={blankValues}
            color="#e4b84a"
            minimum={5}
            onChange={setBlankValues}
            onAdd={addBlank}
            onRemove={(index) => setBlankValues(blankValues.filter((_, valueIndex) => valueIndex !== index))}
          />
          <div className="me-gate-settings">
            <label><span>Candidate signal</span><div><input type="number" step="0.001" value={candidateSignal} onChange={finiteInput(setCandidateSignal)} /><b>{scenario.signalUnit}</b></div></label>
            <label><span>Calibration slope</span><div><input type="number" min="0.000001" step="0.001" value={calibrationSlope} onChange={finiteInput(setCalibrationSlope, 0.000001)} /><b>signal / conc.</b></div></label>
            <label><span>Calibration intercept</span><div><input type="number" step="0.001" value={calibrationIntercept} onChange={finiteInput(setCalibrationIntercept)} /><b>signal</b></div></label>
            <label><span>Detection factor</span><div><input type="number" min="1" max="5" step="0.1" value={detectionFactor} onChange={finiteInput(setDetectionFactor, 1, 5)} /><b>kDetection</b></div></label>
          </div>
          <button className="me-reset" type="button" onClick={() => loadScenario(scenarioId)}>Reset this synthetic gate</button>
        </section>

        <section className="me-gate-stage">
          <DetectionGatePlot analysis={analysis} signalUnit={scenario.signalUnit} />
          <div className="me-gate-ledger">
            <article><span>Blank centre</span><strong>{significant(analysis.blank.mean)}</strong><small>arithmetic mean</small></article>
            <article><span>Blank spread</span><strong>{significant(analysis.blank.sampleStandardDeviation)}</strong><small>sample s, not SE</small></article>
            <article><span>Signal gate</span><strong>{significant(analysis.thresholdSignal)}</strong><small>{scenario.signalUnit}</small></article>
            <article><span>Concentration equivalent</span><strong>{significant(analysis.lodConcentration)}</strong><small>{scenario.concentrationUnit}</small></article>
          </div>
          <div className="me-detection-caution"><i>≠</i><p><strong>Detected does not mean quantified.</strong> This gate asks whether the response exceeds one declared blank-based threshold. It does not establish identity, selectivity, a quantitation limit, or a suitable quantitative range.</p></div>
        </section>

        <section className="me-noise-counterfactual">
          <div className="me-panel-heading"><span>What-if comparator</span><strong>Double spread without moving the mean</strong></div>
          <div className="me-noise-bars">
            <article><span>Current sBlank</span><i style={{ '--bar': `${Math.max(8, analysis.blank.sampleStandardDeviation / Math.max(analysis.counterfactuals.doubledNoise.sampleStandardDeviation, 1e-12) * 100)}%` }} /><strong>xL {significant(analysis.thresholdSignal)}</strong></article>
            <article><span>2 × sBlank</span><i style={{ '--bar': '100%' }} /><strong>xL {significant(analysis.counterfactuals.doubledNoise.thresholdSignal)}</strong></article>
          </div>
          <p>{analysis.counterfactuals.moreBlankReplicates.statement}</p>
        </section>

        <section className="me-prediction-panel">
          <div className="me-panel-heading"><span>Predict the gate</span><strong>Four independent claims</strong></div>
          <div className="me-prediction-grid">
            <ChoiceButtons label="Where is the candidate?" value={prediction.candidateDecision} onChange={setChoice('candidateDecision')} options={[{ value: 'above-threshold', label: 'Above gate' }, { value: 'at-threshold', label: 'At gate' }, { value: 'below-threshold', label: 'Below gate' }]} />
            <ChoiceButtons label="Is detection the same as quantitation?" value={prediction.lodVsQuantitation} onChange={setChoice('lodVsQuantitation')} options={[{ value: 'same', label: 'Same claim' }, { value: 'different', label: 'Different claims' }]} />
            <ChoiceButtons label="If blank spread doubles, the gate…" value={prediction.doubledNoiseEffect} onChange={setChoice('doubledNoiseEffect')} options={[{ value: 'raises-threshold', label: 'Rises' }, { value: 'unchanged-zero-spread', label: 'Stays' }, { value: 'lowers-threshold', label: 'Falls' }]} />
            <ChoiceButtons label="Do more blank repeats automatically divide s by √n?" value={prediction.moreBlankReplicatesEffect} onChange={setChoice('moreBlankReplicatesEffect')} options={[{ value: 'automatically-lower', label: 'Yes' }, { value: 'not-automatically-lower', label: 'No' }]} />
          </div>
          <div className="me-commit-row">
            <button type="button" disabled={!choiceComplete(prediction)} onClick={() => setCompared(true)}>Compare my four claims</button>
            <button type="button" onClick={() => setHintLevel((level) => Math.min(4, level + 1))} disabled={hintLevel >= 4}>Hint {Math.min(4, hintLevel + 1)} of 4</button>
          </div>
          {hint && <p className="me-hint"><span>Hint {hintLevel}</span>{hint}</p>}
          <EvaluationPanel evaluation={evaluation} />
        </section>

        <aside className="me-teacher-question">
          <span>Teacher lens · {scenario.code}</span>
          <strong>{scenario.teacherQuestion}</strong>
          <p><b>Misconception to surface:</b> {scenario.misconception}</p>
          <small>{scenario.provenance.statement}</small>
        </aside>
      </div>
    </div>
  );
}

function MeasurementPassport() {
  const passport = MODEL_PASSPORTS.measurementEvidenceBench;
  return (
    <section className="me-passport">
      <div className="me-passport-intro">
        <span>Model passport · analytical evidence</span>
        <h3>{passport.name}</h3>
        <p>{passport.resultKind}</p>
        <strong>{passport.inputProvenance}</strong>
      </div>
      <div className="me-passport-columns">
        <article><span>Included on this bench</span>{passport.includes.map((item) => <p key={item}><i>+</i>{item}</p>)}</article>
        <article className="excluded"><span>Not established here</span>{passport.excludes.map((item) => <p key={item}><i>−</i>{item}</p>)}</article>
      </div>
      <div className="me-boundary-grid">
        {['confidence', 'repeatability', 'expanded', 'detection', 'safety'].map((key) => <p key={key}><span>{key}</span>{MEASUREMENT_UNCERTAINTY_MODEL_BOUNDARY[key]}</p>)}
      </div>
      <details className="me-source-drawer">
        <summary><span>Primary reference basis</span><strong>{passport.sources.length} direct records</strong><b>Open sources +</b></summary>
        <div>
          {passport.sources.map((sourceId) => {
            const source = SCIENCE_SOURCES[sourceId];
            return <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><span>{source.name}</span><small>{source.role}</small><b aria-hidden="true">↗</b></a>;
          })}
        </div>
      </details>
      <p className="me-local-statement">{passport.dataStatement}</p>
    </section>
  );
}

export default function MeasurementEvidenceLab() {
  const [mode, setMode] = useState('assay');
  return (
    <section className="measurement-evidence-lab" id="measurementEvidenceLab" aria-labelledby="measurementEvidenceTitle">
      <header className="me-header">
        <div>
          <p className="section-code">20 / Measurement evidence</p>
          <h2 id="measurementEvidenceTitle">Measurements leave fingerprints.</h2>
          <p>Edit every repeat. Move the reference. Challenge the interval. Then build a blank-noise gate and decide what the evidence actually supports—without hiding an awkward value or turning detection into quantitation.</p>
        </div>
        <div className="me-condition-stamp"><span>Synthetic analytical bench</span><strong>Replicates · uncertainty · detection</strong><small>Computed locally · no automatic data repair</small></div>
      </header>

      <div className="me-mode-tabs" role="tablist" aria-label="Measurement evidence modes">
        <button type="button" role="tab" aria-selected={mode === 'assay'} aria-controls="assayEvidencePanel" className={mode === 'assay' ? 'active' : ''} onClick={() => setMode('assay')}><i>↔</i><span><strong>Twin assay calipers</strong><small>repeatability · reference · intervals</small></span></button>
        <button type="button" role="tab" aria-selected={mode === 'detection'} aria-controls="detectionEvidencePanel" className={mode === 'detection' ? 'active' : ''} onClick={() => setMode('detection')}><i>⊣</i><span><strong>Blank noise gate</strong><small>blank spread · threshold · candidate</small></span></button>
      </div>

      <div id="assayEvidencePanel" role="tabpanel" hidden={mode !== 'assay'}><AssayMode /></div>
      <div id="detectionEvidencePanel" role="tabpanel" hidden={mode !== 'detection'}><DetectionMode /></div>
      <MeasurementPassport />
    </section>
  );
}
