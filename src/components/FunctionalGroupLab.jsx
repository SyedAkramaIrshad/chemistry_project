import { useMemo, useState } from 'react';
import {
  analyzeFunctionalGroupScenario,
  evaluateFunctionalGroupAttempt,
  nextFunctionalGroupHint,
  toggleFunctionalProbeAtom,
} from '../chemistry/functionalGroups.js';
import {
  FUNCTIONAL_GROUP_DEFINITIONS,
  FUNCTIONAL_GROUP_MODEL_BOUNDARY,
  FUNCTIONAL_GROUP_SCENARIO_BY_ID,
  FUNCTIONAL_GROUP_SCENARIOS,
} from '../data/functionalGroupScenarios.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../data/scienceSources.js';
import '../styles/functional-groups.css';

const EMPTY_PREDICTION = Object.freeze({
  functionalClass: '',
  carbonylUmbrella: '',
  inventoryGroupIds: [],
});

const CHANNELS = Object.freeze([
  { id: 'oxygen', label: 'Oxygen channel', icon: 'O', detail: 'alcohol → acid derivatives' },
  { id: 'nitrogen', label: 'Nitrogen channel', icon: 'N', detail: 'amine · amide · nitrile' },
  { id: 'unsaturation', label: 'Unsaturation channel', icon: 'π', detail: 'C=C · C≡C' },
  { id: 'halogen', label: 'Halogen channel', icon: 'X', detail: 'bounded C–X pattern' },
]);

const CONTRASTS = Object.freeze([
  {
    id: 'aldehyde-ketone',
    title: 'Aldehyde ↔ ketone',
    test: 'After C=O, inspect the carbonyl carbon: a displayed H selects the aldehyde branch; two carbon neighbours select ketone.',
    boundary: 'This neighbour test classifies the frozen graph. It does not predict oxidation, reduction, or reactivity.',
    scenarios: ['ethanal-aldehyde', 'propanone-ketone'],
  },
  {
    id: 'acid-esters-amide',
    title: 'Acid ↔ ester ↔ amide',
    test: 'From the same carbonyl carbon, follow the single bond: O–H gives acid, O–C gives ester, and N gives amide.',
    boundary: 'The route does not assign hydrolysis conditions, rates, equilibria, or products.',
    scenarios: ['ethanoic-acid', 'methyl-ethanoate', 'ethanamide-amide'],
  },
  {
    id: 'alcohol-ether',
    title: 'Alcohol ↔ ether',
    test: 'An alcohol oxygen has O–H and C–O; an ether oxygen has two non-carbonyl C–O neighbours.',
    boundary: 'Hydrogen bonding, acidity, boiling point, and solubility are separate questions.',
    scenarios: ['ethanol-alcohol', 'dimethyl-ether'],
  },
  {
    id: 'amine-amide',
    title: 'Amine ↔ amide',
    test: 'Trace nitrogen’s carbon neighbour: direct N–C(=O) routes to amide; non-carbonyl C–N can route to amine.',
    boundary: 'Basicity and protonation depend on conditions not calculated here.',
    scenarios: ['aminoethanol-amine', 'ethanamide-amide'],
  },
  {
    id: 'alkene-carbonyl',
    title: 'C=C ↔ C=O',
    test: 'Bond order two is shared; the endpoint elements determine whether the line is alkene or carbonyl evidence.',
    boundary: 'The board does not infer addition, selectivity, spectroscopy, or molecular geometry.',
    scenarios: ['propene-alkene', 'propanone-ketone'],
  },
]);

const ELEMENT_TONE = Object.freeze({
  C: 'carbon',
  H: 'hydrogen',
  O: 'oxygen',
  N: 'nitrogen',
  F: 'halogen',
  Cl: 'halogen',
  Br: 'halogen',
  I: 'halogen',
});

function bondLines(first, second, order) {
  const dx = second.x - first.x;
  const dy = second.y - first.y;
  const length = Math.hypot(dx, dy) || 1;
  const perpendicularX = -dy / length;
  const perpendicularY = dx / length;
  const offsets = order === 1 ? [0] : order === 2 ? [-5, 5] : [-9, 0, 9];
  return offsets.map((offset) => ({
    x1: first.x + perpendicularX * offset,
    y1: first.y + perpendicularY * offset,
    x2: second.x + perpendicularX * offset,
    y2: second.y + perpendicularY * offset,
  }));
}

function groupLabel(id) {
  return FUNCTIONAL_GROUP_DEFINITIONS.find((item) => item.id === id)?.label ?? id;
}

function completePrediction(selectedAtomIds, prediction) {
  return selectedAtomIds.length > 0
    && prediction.functionalClass
    && prediction.carbonylUmbrella
    && prediction.inventoryGroupIds.length > 0;
}

function ScenarioReel({ activeId, onSelect }) {
  return (
    <nav className="fg-specimen-reel" aria-label="Functional group specimens">
      {CHANNELS.map((channel) => (
        <section key={channel.id} className={`fg-channel ${channel.id}`}>
          <header><i>{channel.icon}</i><span><strong>{channel.label}</strong><small>{channel.detail}</small></span></header>
          <div>
            {FUNCTIONAL_GROUP_SCENARIOS.filter((item) => item.channel === channel.id).map((scenario) => (
              <button
                type="button"
                key={scenario.id}
                className={scenario.id === activeId ? 'active' : ''}
                aria-pressed={scenario.id === activeId}
                onClick={() => onSelect(scenario.id)}
              >
                <span>{scenario.code}</span>
                <strong>{scenario.name}</strong>
                <code>{scenario.formula}</code>
              </button>
            ))}
          </div>
        </section>
      ))}
    </nav>
  );
}

function MoleculeBoard({ analysis, selectedAtomIds, evaluation, onToggle }) {
  const selectedSet = new Set(selectedAtomIds);
  const missingSet = new Set(evaluation?.dimensions.probe.missingAtomIds ?? []);
  const extraSet = new Set(evaluation?.dimensions.probe.extraAtomIds ?? []);
  return (
    <section className="fg-molecule-panel fg-panel">
      <div className="fg-panel-heading">
        <span>Characteristic-group patchboard</span>
        <strong>Click only the atoms in your probe</strong>
      </div>
      <div className="fg-molecule-board" style={{ '--target-accent': analysis.targetDefinition.accent }}>
        <div className="fg-board-status">
          <span><i /> learner-owned signal</span>
          <strong>{selectedAtomIds.length ? `${selectedAtomIds.length} socket${selectedAtomIds.length === 1 ? '' : 's'} live` : 'No signal routed'}</strong>
        </div>
        <svg viewBox="0 0 760 360" role="img" aria-label={`${analysis.scenario.name} displayed connectivity graph. ${analysis.scenario.formula}.`}>
          <title>{analysis.scenario.name} connectivity and bond-order board</title>
          <desc>Hydrogens needed for functional-group evidence are explicit. Remaining hydrocarbon hydrogens are implicit.</desc>
          <defs>
            <pattern id={`fg-grid-${analysis.scenario.id}`} width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M24 0H0V24" />
            </pattern>
            <filter id="fg-signal-glow"><feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          <rect className="fg-board-field" x="12" y="12" width="736" height="336" rx="26" />
          <rect className="fg-board-grid" x="12" y="12" width="736" height="336" rx="26" fill={`url(#fg-grid-${analysis.scenario.id})`} />
          {analysis.bonds.flatMap((bond) => {
            const first = analysis.atomById[bond.a];
            const second = analysis.atomById[bond.b];
            const live = selectedSet.has(bond.a) && selectedSet.has(bond.b);
            return bondLines(first, second, bond.order).map((line, index) => (
              <line
                key={`${bond.id}-${index}`}
                className={`fg-bond ${live ? 'live' : ''}`}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                filter={live ? 'url(#fg-signal-glow)' : undefined}
              />
            ));
          })}
          <g className="fg-board-axis">
            <path d="M42 318H718" />
            <text x="42" y="334">connectivity bus · exact bond order shown</text>
          </g>
        </svg>
        {analysis.atoms.map((atom) => {
          const selected = selectedSet.has(atom.id);
          const status = extraSet.has(atom.id) ? 'extra' : missingSet.has(atom.id) ? 'missing' : '';
          return (
            <button
              type="button"
              key={atom.id}
              className={`fg-atom ${ELEMENT_TONE[atom.element]} ${selected ? 'selected' : ''} ${status}`}
              style={{ left: `${atom.x / 7.6}%`, top: `${atom.y / 3.6}%` }}
              aria-pressed={selected}
              aria-label={`${atom.label}, ${atom.role}${selected ? ', selected in probe' : ''}`}
              title={`${atom.label} · ${atom.role}`}
              onClick={() => onToggle(atom.id)}
            >
              <strong>{atom.label}</strong>
              <small>{atom.id}</small>
            </button>
          );
        })}
        <div className="fg-board-key">
          <span><i className="carbon" /> carbon</span>
          <span><i className="oxygen" /> oxygen</span>
          <span><i className="nitrogen" /> nitrogen</span>
          <span><i className="hydrogen" /> diagnostic H</span>
          <span><i className="halogen" /> halogen</span>
        </div>
      </div>
      <div className="fg-mission-strip">
        <span>{analysis.scenario.code} · your mission</span>
        <strong>{analysis.scenario.mission}</strong>
        <p>Unshown hydrocarbon hydrogens are implicit. Only displayed diagnostic atoms can enter the probe.</p>
      </div>
    </section>
  );
}

function SignalRouter({ analysis, selectedAtomIds, evaluation }) {
  const resolved = Boolean(evaluation);
  const selectedLabels = selectedAtomIds.map((id) => analysis.atomById[id].label).join(' · ') || 'open circuit';
  return (
    <section className={`fg-router fg-panel ${resolved ? 'resolved' : 'sealed'}`}>
      <div className="fg-panel-heading">
        <span>Structural decision ladder</span>
        <strong>{resolved ? 'Evidence route exposed' : 'Commit a hypothesis to open the gates'}</strong>
      </div>
      <div className="fg-router-track">
        <article className="fg-router-input">
          <span>Input bus</span>
          <strong>{selectedLabels}</strong>
          <small>{selectedAtomIds.length} learner-selected atoms</small>
        </article>
        <div className="fg-router-wire"><i /></div>
        {analysis.structuralTrace.map((step, index) => (
          <article className="fg-logic-gate" key={step} style={{ '--gate-delay': `${index * 90}ms` }}>
            <span>Gate {index + 1}</span>
            <strong>{resolved ? step : 'Structural test sealed'}</strong>
            <i>{resolved ? 'pass' : '—'}</i>
          </article>
        ))}
        <div className="fg-router-wire"><i /></div>
        <article className="fg-router-output" style={{ '--group-accent': analysis.targetDefinition.accent }}>
          <span>Class cartridge</span>
          <strong>{resolved ? analysis.targetDefinition.label : 'unresolved'}</strong>
          <code>{resolved ? analysis.targetDefinition.signature : 'check the graph'}</code>
        </article>
      </div>
      <p><b>Signal rule:</b> the ladder reads the frozen graph around your target. It never selects a missing atom, rewrites a bond, or predicts a reaction.</p>
    </section>
  );
}

function PredictionConsole({ prediction, onClass, onCarbonyl, onInventory }) {
  return (
    <aside className="fg-console fg-panel">
      <div className="fg-panel-heading">
        <span>Hypothesis console</span>
        <strong>Three predictions + one manual probe</strong>
      </div>
      <fieldset className="fg-class-bank">
        <legend>Target functional class</legend>
        <div>
          {FUNCTIONAL_GROUP_DEFINITIONS.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`${item.category} ${prediction.functionalClass === item.id ? 'active' : ''}`}
              aria-pressed={prediction.functionalClass === item.id}
              style={{ '--group-accent': item.accent }}
              onClick={() => onClass(item.id)}
            >
              <span>{item.code}</span>
              <strong>{item.label}</strong>
              <small>{item.signature}</small>
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="fg-carbonyl-choice">
        <legend>Inside the broad carbonyl-compound umbrella?</legend>
        <div>
          {['yes', 'no'].map((value) => (
            <button type="button" key={value} aria-pressed={prediction.carbonylUmbrella === value} className={prediction.carbonylUmbrella === value ? 'active' : ''} onClick={() => onCarbonyl(value)}>
              <strong>{value === 'yes' ? 'Yes · contains C=O' : 'No · no C=O'}</strong>
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="fg-inventory-bank">
        <legend>Whole-molecule inventory · select every separately countable group</legend>
        <div>
          {FUNCTIONAL_GROUP_DEFINITIONS.map((item) => {
            const active = prediction.inventoryGroupIds.includes(item.id);
            return (
              <button type="button" key={item.id} aria-pressed={active} className={active ? 'active' : ''} style={{ '--group-accent': item.accent }} onClick={() => onInventory(item.id)}>
                <i />{item.label}
              </button>
            );
          })}
        </div>
      </fieldset>
    </aside>
  );
}

function EvaluationDeck({ evaluation }) {
  if (!evaluation) {
    return (
      <section className="fg-evaluation fg-panel awaiting">
        <i>?</i>
        <div><span>Comparison sealed</span><strong>Your graph and hypotheses remain yours.</strong><p>Select at least one atom, one class, a carbonyl answer, and at least one inventory item.</p></div>
      </section>
    );
  }
  return (
    <section className="fg-evaluation fg-panel" aria-live="polite">
      <header><span>Four-channel comparison</span><strong>{evaluation.score.correct} / 4 supported</strong></header>
      <div>
        {Object.entries(evaluation.dimensions).map(([id, dimension]) => (
          <article key={id} className={dimension.correct ? 'correct' : 'incorrect'}>
            <span>{dimension.correct ? 'Signal agrees' : 'Trace again'}</span>
            <strong>{dimension.label}</strong>
            <p><b>You:</b> {dimension.learnerLabel}</p>
            <p><b>Graph:</b> {dimension.expectedLabel}</p>
            <small>{dimension.reason}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function TeacherContrasts({ onScenario }) {
  return (
    <section className="fg-teacher-rail fg-panel">
      <div className="fg-panel-heading">
        <span>Teacher contrast rail</span>
        <strong>Change one local test at a time</strong>
      </div>
      <div>
        {CONTRASTS.map((contrast) => (
          <article key={contrast.id}>
            <span>{contrast.title}</span>
            <strong>{contrast.test}</strong>
            <p>{contrast.boundary}</p>
            <div>
              {contrast.scenarios.map((scenarioId) => {
                const scenario = FUNCTIONAL_GROUP_SCENARIO_BY_ID[scenarioId];
                return <button type="button" key={scenarioId} onClick={() => onScenario(scenarioId)}>{scenario.formula}<small>{scenario.name}</small></button>;
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function FunctionalGroupPassport() {
  const passport = MODEL_PASSPORTS.functionalGroupSignalBoard;
  return (
    <section className="fg-passport">
      <div className="fg-passport-head">
        <span>Model passport · organic structure</span>
        <h3>{passport.name}</h3>
        <p>{passport.resultKind}</p>
        <strong>A structural pattern is evidence for a class label here; it is not a reaction prediction.</strong>
      </div>
      <div className="fg-passport-grid">
        <article><span>Included</span>{passport.includes.map((item) => <p key={item}><i>+</i>{item}</p>)}</article>
        <article className="excluded"><span>Not established</span>{passport.excludes.map((item) => <p key={item}><i>−</i>{item}</p>)}</article>
      </div>
      <div className="fg-boundary-strip">
        {['hydrogens', 'carbonyl', 'suppression', 'reaction', 'safety'].map((key) => <p key={key}><span>{key}</span>{FUNCTIONAL_GROUP_MODEL_BOUNDARY[key]}</p>)}
      </div>
      <details className="fg-source-drawer">
        <summary><span>Primary reference basis</span><strong>{passport.sources.length} direct records</strong><b>Open sources +</b></summary>
        <div>
          {passport.sources.map((sourceId) => {
            const source = SCIENCE_SOURCES[sourceId];
            return <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><span>{source.name}</span><small>{source.role}</small><b aria-hidden="true">↗</b></a>;
          })}
        </div>
      </details>
      <p className="fg-local-statement">{passport.inputProvenance} {passport.dataStatement}</p>
    </section>
  );
}

function LearningTrace({ entries }) {
  return (
    <aside className="fg-trace fg-panel">
      <div className="fg-panel-heading"><span>Learning trace</span><strong>Nothing happens silently</strong></div>
      <div>
        {entries.map((entry) => <article key={entry.id} className={entry.kind}><i /><span>{entry.kind}</span><strong>{entry.title}</strong><p>{entry.detail}</p></article>)}
      </div>
    </aside>
  );
}

export default function FunctionalGroupLab() {
  const initial = FUNCTIONAL_GROUP_SCENARIOS[0];
  const [scenarioId, setScenarioId] = useState(initial.id);
  const [selectedAtomIds, setSelectedAtomIds] = useState([]);
  const [prediction, setPrediction] = useState({ ...EMPTY_PREDICTION });
  const [evaluation, setEvaluation] = useState(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [feedback, setFeedback] = useState('Click an atom socket to begin the structural probe.');
  const [trace, setTrace] = useState([{ id: 1, kind: 'load', title: `${initial.name} loaded`, detail: 'No atom or class was selected automatically.' }]);
  const analysis = useMemo(() => analyzeFunctionalGroupScenario(scenarioId), [scenarioId]);
  const hint = hintLevel ? nextFunctionalGroupHint({ analysis, selectedAtomIds, level: hintLevel }) : '';

  const record = (kind, title, detail) => setTrace((current) => [
    { id: Date.now() + Math.random(), kind, title, detail },
    ...current,
  ].slice(0, 7));

  const loadScenario = (id) => {
    const scenario = FUNCTIONAL_GROUP_SCENARIO_BY_ID[id];
    setScenarioId(id);
    setSelectedAtomIds([]);
    setPrediction({ ...EMPTY_PREDICTION });
    setEvaluation(null);
    setHintLevel(0);
    setFeedback(`${scenario.name} loaded. The probe is open and every prediction is blank.`);
    record('scenario', `${scenario.name} selected`, 'Only the functional-group board reset; no graph was edited.');
  };

  const toggleAtom = (atomId) => {
    const outcome = toggleFunctionalProbeAtom({ scenarioId, selectedAtomIds, atomId });
    setFeedback(outcome.reason);
    record(outcome.allowed ? outcome.action : 'blocked', `${atomId} ${outcome.action}`, outcome.reason);
    if (!outcome.allowed) return;
    setSelectedAtomIds([...outcome.selectedAtomIds]);
    setEvaluation(null);
  };

  const setClass = (id) => {
    setPrediction((current) => ({ ...current, functionalClass: id }));
    setEvaluation(null);
    setFeedback(`${groupLabel(id)} is your target-class hypothesis. The graph remains unchanged.`);
    record('prediction', `${groupLabel(id)} predicted`, 'Class prediction changed without selecting any atom.');
  };

  const setCarbonyl = (value) => {
    setPrediction((current) => ({ ...current, carbonylUmbrella: value }));
    setEvaluation(null);
    record('prediction', `Carbonyl umbrella: ${value}`, 'Only the learner prediction changed.');
  };

  const toggleInventory = (id) => {
    setPrediction((current) => ({
      ...current,
      inventoryGroupIds: current.inventoryGroupIds.includes(id)
        ? current.inventoryGroupIds.filter((item) => item !== id)
        : [...current.inventoryGroupIds, id],
    }));
    setEvaluation(null);
    record('prediction', `${groupLabel(id)} inventory toggled`, 'No structural match was added or removed automatically.');
  };

  const check = () => {
    if (!completePrediction(selectedAtomIds, prediction)) {
      const reason = 'Complete the manual probe, class, carbonyl, and inventory channels before comparison.';
      setFeedback(reason);
      record('blocked', 'Comparison held', reason);
      return;
    }
    const result = evaluateFunctionalGroupAttempt({ analysis, selectedAtomIds, prediction });
    setEvaluation(result);
    setFeedback(`${result.score.correct} of 4 channels agree with the displayed graph. Your selections remain unchanged.`);
    record(result.committed ? 'supported' : 'inspect', 'Functional-group hypothesis compared', `${result.score.correct}/4 channels supported; nothing was repaired.`);
  };

  const revealHint = () => {
    const next = Math.min(4, hintLevel + 1);
    setHintLevel(next);
    const message = nextFunctionalGroupHint({ analysis, selectedAtomIds, level: next });
    setFeedback(`Hint ${next} opened without changing the probe.`);
    record('hint', `Hint ${next}/4 opened`, message);
  };

  const clearProbe = () => {
    setSelectedAtomIds([]);
    setEvaluation(null);
    setFeedback('Your probe was cleared explicitly. Class and inventory predictions remain.');
    record('clear', 'Probe cleared', 'Every selected atom was removed by the learner action; predictions were retained.');
  };

  return (
    <section className="functional-group-lab" id="functionalGroupLab" aria-labelledby="functionalGroupTitle">
      <header className="fg-header">
        <div>
          <p className="section-code">22 / Organic structure signals</p>
          <h2 id="functionalGroupTitle">Do not memorize the label. Route the bonds.</h2>
          <p>Select the characteristic atoms yourself, trace immediate neighbours and bond order, then defend a class and whole-molecule inventory. A wrong probe remains wired exactly where you put it.</p>
        </div>
        <div className="fg-condition-stamp"><span>Frozen graph signal board</span><strong>12 classes · 12 specimens · 4 checks</strong><small>Local structural evidence · no reaction oracle</small></div>
      </header>

      <ScenarioReel activeId={scenarioId} onSelect={loadScenario} />

      <div className="fg-workbench">
        <MoleculeBoard analysis={analysis} selectedAtomIds={selectedAtomIds} evaluation={evaluation} onToggle={toggleAtom} />
        <PredictionConsole prediction={prediction} onClass={setClass} onCarbonyl={setCarbonyl} onInventory={toggleInventory} />
        <SignalRouter analysis={analysis} selectedAtomIds={selectedAtomIds} evaluation={evaluation} />
        <section className="fg-action-panel fg-panel">
          <div className="fg-panel-heading"><span>Commit console</span><strong>{analysis.scenario.formula}</strong></div>
          <p className="fg-live-feedback"><i />{feedback}</p>
          <div className="fg-action-row">
            <button type="button" className="primary" disabled={!completePrediction(selectedAtomIds, prediction)} onClick={check}>Compare all four channels</button>
            <button type="button" onClick={revealHint} disabled={hintLevel >= 4}>Hint {Math.min(4, hintLevel + 1)} / 4</button>
            <button type="button" onClick={clearProbe} disabled={!selectedAtomIds.length}>Clear my probe</button>
            <button type="button" onClick={() => loadScenario(scenarioId)}>Reset specimen</button>
          </div>
          {hint && <p className="fg-hint"><span>Hint {hintLevel}</span>{hint}</p>}
        </section>
        <EvaluationDeck evaluation={evaluation} />
        <aside className="fg-teacher-question fg-panel">
          <span>Teacher lens · {analysis.scenario.code}</span>
          <strong>{analysis.scenario.teacherQuestion}</strong>
          <p><b>Misconception to surface:</b> {analysis.scenario.misconception}</p>
          <small>{analysis.scenario.provenance.statement}</small>
        </aside>
        <LearningTrace entries={trace} />
      </div>

      <TeacherContrasts onScenario={loadScenario} />
      <FunctionalGroupPassport />
    </section>
  );
}
