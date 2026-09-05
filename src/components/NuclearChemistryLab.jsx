import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BINDING_NUCLEI,
  DECAY_CHALLENGES,
  DECAY_CHALLENGE_BY_ID,
  DECAY_PARTICLES,
  DECAY_PARTICLE_BY_ID,
  HALF_LIFE_CHALLENGES,
  HALF_LIFE_CHALLENGE_BY_ID,
  NUCLEAR_CONSTANTS,
  NUCLEAR_MODEL_BOUNDARY,
  NUCLIDE_BY_ID,
} from '../data/nuclearScenarios.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../data/scienceSources.js';
import {
  analyzeBindingRidge,
  analyzeDecayAssembly,
  analyzeHalfLife,
  evaluateBindingAttempt,
  evaluateDecayAttempt,
  evaluateHalfLifeAttempt,
  nextBindingHint,
  nextDecayHint,
  nextHalfLifeHint,
} from '../chemistry/nuclearChemistry.js';
import '../styles/nuclear-chemistry.css';

const MODES = [
  { id: 'decay', icon: '↘', label: 'Decay chamber', detail: 'daughter · particles · conservation' },
  { id: 'clock', icon: '◴', label: 'Half-life chronograph', detail: 'parent · activity · expected time' },
  { id: 'binding', icon: '⌁', label: 'Binding ridge', detail: 'mass defect · total · per nucleon' },
];

const SOURCE_IDS = MODEL_PASSPORTS.nuclearChemistryObservatory.sources;
const modeClass = (active) => active ? 'active' : '';
const scientific = (value, digits = 4) => Number(value).toExponential(digits);
const fixed = (value, digits = 4) => Number(value).toFixed(digits);
const percent = (value, digits = 4) => `${(Number(value) * 100).toFixed(digits)}%`;
const prettyNumber = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  if (Math.abs(numeric) >= 1e5 || (Math.abs(numeric) > 0 && Math.abs(numeric) < 1e-3)) return scientific(numeric, 4);
  return numeric.toLocaleString(undefined, { maximumFractionDigits: 6 });
};

function NuclideGlyph({ record, compact = false }) {
  if (!record) return <span className="nuc-nuclide-glyph empty">?</span>;
  return (
    <span className={`nuc-nuclide-glyph ${compact ? 'compact' : ''}`} aria-label={`${record.name || record.label}, mass number ${record.massNumber}, atomic number ${record.atomicNumber}`}>
      <sup>{record.massNumber}</sup><strong>{record.symbol}</strong><sub>{record.atomicNumber}</sub>{record.stateMark && <em>{record.stateMark}</em>}
    </span>
  );
}

function PanelHeading({ eyebrow, title, badge }) {
  return <header className="nuc-panel-heading"><div><span>{eyebrow}</span><strong>{title}</strong></div>{badge && <b>{badge}</b>}</header>;
}

function ScenarioRail({ items, selectedId, onSelect, className = '' }) {
  return (
    <div className={`nuc-scenario-rail ${className}`} aria-label="Nuclear chemistry challenge selection">
      {items.map((item) => <button type="button" key={item.id} aria-pressed={selectedId === item.id} className={modeClass(selectedId === item.id)} onClick={() => onSelect(item.id)}><span>{item.code}</span><strong>{item.name}</strong><small>{item.summary || item.daughterWindow}</small><b>{item.halfLifeDisplay || item.modeId}</b><i /></button>)}
    </div>
  );
}

function MissionStrip({ challenge, current, teacher }) {
  return <div className="nuc-mission-strip"><div><span>CURRENT INSTRUMENT</span><strong>{current}</strong><p>{challenge.mission || challenge.daughterWindow}</p></div><div><span>TEACHER QUESTION</span><p>{teacher}</p></div><b>{challenge.provenance?.kind || 'evaluated teaching record'}</b></div>;
}

function ChoiceQuestion({ question, options, value, onChange, disabled = false }) {
  return <fieldset className="nuc-choice-question" disabled={disabled}><legend>{question}</legend><div className={`nuc-choice-row choices-${Math.min(options.length, 4)}`}>{options.map((option) => <button type="button" key={option.value} aria-pressed={value === option.value} className={value === option.value ? 'selected' : ''} onClick={() => onChange(option.value)}><span>{option.label}</span>{option.detail && <small>{option.detail}</small>}</button>)}</div></fieldset>;
}

function PredictionConsole({ title, questions, prediction, onPrediction, onCheck, onHint, hintLevel, hint, onClear, evaluation, blockedReason }) {
  return (
    <section className="nuc-prediction-console nuc-panel">
      <PanelHeading eyebrow="LEARNER CLAIM LOCK" title={title} badge="LEARNER OWNED" />
      <div className="nuc-prediction-body">
        {questions.map((item) => <ChoiceQuestion key={item.key} question={item.question} options={item.options} value={prediction[item.key]} onChange={(value) => onPrediction(item.key, value)} />)}
        {blockedReason && <p className="nuc-blocked-note">{blockedReason}</p>}
        <div className="nuc-action-grid"><button type="button" className="primary" onClick={onCheck}>Check four claims</button><button type="button" onClick={onHint}>Hint {Math.min(hintLevel + 1, 4)} / 4</button><button type="button" onClick={onClear}>Clear predictions</button></div>
        {hint && <p className="nuc-hint"><b>Hint {hintLevel}</b>{hint}</p>}
      </div>
      {evaluation && <div className="nuc-evaluation"><header><span>CLAIM SCORE</span><strong>{evaluation.score.correct} / {evaluation.score.total}</strong></header><div>{Object.entries(evaluation.dimensions).map(([key, item], index) => <article key={key} className={item.correct ? 'correct' : 'wrong'}><span>{String(index + 1).padStart(2, '0')} · {key}</span><strong>{item.correct ? 'Claim closes' : 'Claim stays open'}</strong><p><b>Your claim</b>{item.learner}</p><p><b>Model record</b>{item.expected}</p><small>{item.reason}</small></article>)}</div></div>}
    </section>
  );
}

const decayQuestions = [
  { key: 'modeId', question: 'Which declared mode is this assembly testing?', options: [
    { value: 'alpha', label: 'Alpha' }, { value: 'beta-minus', label: 'β⁻' }, { value: 'beta-plus', label: 'β⁺' }, { value: 'electron-capture', label: 'Electron capture' }, { value: 'gamma', label: 'Gamma / level drop' },
  ] },
  { key: 'vectorId', question: 'How should the daughter move on the (A,Z) map?', options: [
    { value: 'A-4,Z-2', label: 'A−4, Z−2' }, { value: 'A,Z+1', label: 'A fixed, Z+1' }, { value: 'A,Z-1', label: 'A fixed, Z−1' }, { value: 'A,Z', label: 'A and Z fixed' },
  ] },
  { key: 'rateClaim', question: 'Does a balanced nuclear equation determine its half-life?', options: [
    { value: 'half-life-from-balanced-equation', label: 'Yes, directly' }, { value: 'half-life-not-from-equation', label: 'No, it needs evaluated rate evidence' },
  ] },
  { key: 'evidenceClaim', question: 'What does the symbolic equation prove?', options: [
    { value: 'equation-is-complete-spectrum', label: 'The complete radiation spectrum' }, { value: 'equation-is-bookkeeping-only', label: 'Declared bookkeeping only' },
  ] },
];

const emptyDecayPrediction = () => ({ modeId: '', vectorId: '', rateClaim: '', evidenceClaim: '' });

function DaughterMap({ challenge, selectedId, onSelect, revealed }) {
  const parent = NUCLIDE_BY_ID[challenge.parentId];
  const points = [parent, ...challenge.daughterOptions];
  const neutronValues = points.map((item) => item.neutronNumber);
  const zValues = points.map((item) => item.atomicNumber);
  const minN = Math.min(...neutronValues); const maxN = Math.max(...neutronValues);
  const minZ = Math.min(...zValues); const maxZ = Math.max(...zValues);
  const position = (item, index = 0) => {
    const sameCoordinate = item.id !== parent.id && item.neutronNumber === parent.neutronNumber && item.atomicNumber === parent.atomicNumber;
    const x = 13 + ((item.neutronNumber - minN) / Math.max(1, maxN - minN)) * 72 + (sameCoordinate ? 10 : 0);
    const y = 14 + ((maxZ - item.atomicNumber) / Math.max(1, maxZ - minZ)) * 66 + (sameCoordinate ? 14 : 0) + index * 0;
    return { left: `${Math.min(88, x)}%`, top: `${Math.min(82, y)}%` };
  };
  const selected = challenge.daughterOptions.find((item) => item.id === selectedId);
  return <div className={`nuc-map ${revealed ? 'revealed' : ''}`}><div className="nuc-map-axis n">N · neutrons →</div><div className="nuc-map-axis z">Z · protons →</div><div className="nuc-map-grid" /><div className="nuc-parent-cell" style={position(parent)}><NuclideGlyph record={parent} compact /><small>PARENT</small></div>{challenge.daughterOptions.map((item, index) => <button type="button" key={item.id} style={position(item, index)} aria-pressed={selectedId === item.id} className={selectedId === item.id ? 'selected' : ''} onClick={() => onSelect(item.id)}><NuclideGlyph record={item} compact /><small>N={item.neutronNumber} · Z={item.atomicNumber}</small></button>)}{selected && <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1={parseFloat(position(parent).left)} y1={parseFloat(position(parent).top) + 5} x2={parseFloat(position(selected).left)} y2={parseFloat(position(selected).top) + 5} /></svg>}<div className="nuc-map-key"><span><i className="parent" />parent record</span><span><i className="daughter" />your daughter</span><span>coordinates, not geographic distance</span></div></div>;
}

function ParticleBank({ placements, onPlacement }) {
  const placementFor = (id) => placements.find((item) => item.particleId === id)?.side || '';
  return <div className="nuc-particle-bank">{DECAY_PARTICLES.map((particle) => <article key={particle.id} style={{ '--particle': particle.color }}><div><i>{particle.symbol}</i><span><strong>{particle.label}</strong><small>A {particle.massNumber} · Z {particle.chargeNumber > 0 ? '+' : ''}{particle.chargeNumber} · Lₑ {particle.leptonNumber > 0 ? '+' : ''}{particle.leptonNumber}</small></span></div><div><button type="button" aria-pressed={placementFor(particle.id) === 'reactant'} onClick={() => onPlacement(particle.id, 'reactant')}>Place left</button><button type="button" aria-pressed={placementFor(particle.id) === 'product'} onClick={() => onPlacement(particle.id, 'product')}>Place right</button></div></article>)}</div>;
}

function EquationTray({ parent, daughter, placements, revealed }) {
  const left = placements.filter((item) => item.side === 'reactant').map((item) => DECAY_PARTICLE_BY_ID[item.particleId]);
  const right = placements.filter((item) => item.side === 'product').map((item) => DECAY_PARTICLE_BY_ID[item.particleId]);
  const chips = (items) => items.length ? items.map((item) => <span key={item.id} style={{ '--particle': item.color }}>{item.symbol}<small>{item.label}</small></span>) : <em>empty particle tray</em>;
  return <div className="nuc-equation-tray"><section><b>REACTANT SIDE</b><div><NuclideGlyph record={parent} />{chips(left)}</div></section><i className={revealed ? 'open' : ''}>→<small>{revealed ? 'audited' : 'sealed'}</small></i><section><b>PRODUCT SIDE</b><div>{daughter ? <NuclideGlyph record={daughter} /> : <span className="nuc-daughter-empty">choose daughter</span>}{chips(right)}</div></section></div>;
}

function ConservationLedger({ snapshot, stale }) {
  if (!snapshot) return <section className="nuc-conservation-ledger nuc-panel sealed"><PanelHeading eyebrow="CONSERVATION BEAMS" title="Evidence shutter closed" badge="NO AUDIT" /><div className="nuc-sealed-ledger"><i /><strong>Assemble first. Audit second.</strong><p>The map and particle trays belong to the learner. No conservation result appears until the explicit audit.</p></div></section>;
  const { analysis } = snapshot;
  const checkCards = [
    ['A', 'Mass number', analysis.checks.massNumber, analysis.totals.reactant.massNumber, analysis.totals.product.massNumber],
    ['Z', 'Charge number', analysis.checks.chargeNumber, analysis.totals.reactant.chargeNumber, analysis.totals.product.chargeNumber],
    ['Lₑ', 'Electron-lepton number', analysis.checks.leptonNumber, analysis.totals.reactant.leptonNumber, analysis.totals.product.leptonNumber],
  ];
  return <section className={`nuc-conservation-ledger nuc-panel ${stale ? 'stale' : ''}`}><PanelHeading eyebrow="CONSERVATION BEAMS" title={stale ? 'Previous assembly audit' : 'Frozen assembly audit'} badge={stale ? 'PREVIOUS RUN' : analysis.assemblyCorrect ? 'CLOSED' : 'OPEN'} />{stale && <p className="nuc-stale-note">The learner assembly changed. These beams belong to the previous audit.</p>}<div className="nuc-beam-grid">{checkCards.map(([symbol, label, correct, left, right]) => <article key={symbol} className={correct ? 'closed' : 'open'}><span>{symbol}</span><div><b>{label}</b><strong>{left} <i>→</i> {right}</strong><small>{correct ? 'both sides close' : `difference ${right - left > 0 ? '+' : ''}${right - left}`}</small></div></article>)}</div><div className="nuc-assembly-checks"><article className={analysis.checks.daughter ? 'closed' : 'open'}><span>DAUGHTER</span><strong>{analysis.daughter.notation}</strong><small>{analysis.checks.daughter ? 'declared branch endpoint' : 'your selected endpoint remains'}</small></article><article className={analysis.checks.particleSet ? 'closed' : 'open'}><span>PARTICLE SET</span><strong>{analysis.placements.length} placed</strong><small>{analysis.checks.particleSet ? 'declared sides close' : 'compare emitted and captured particles'}</small></article></div><div className="nuc-energy-slip"><span>SELECTED ENERGY LEDGER</span><strong>{analysis.energy.display}</strong><p>{analysis.energy.boundary}</p></div><code>{analysis.learnerEquation}</code></section>;
}

function DecayInstrument({ challengeId, onChallenge, onRecord }) {
  const challenge = DECAY_CHALLENGE_BY_ID[challengeId];
  const parent = NUCLIDE_BY_ID[challenge.parentId];
  const [daughterId, setDaughterId] = useState('');
  const [placements, setPlacements] = useState([]);
  const [prediction, setPrediction] = useState(emptyDecayPrediction);
  const [snapshot, setSnapshot] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { setDaughterId(''); setPlacements([]); setPrediction(emptyDecayPrediction()); setSnapshot(null); setEvaluation(null); setHintLevel(0); setHint(''); setError(''); }, [challengeId]);
  const signature = `${challengeId}|${daughterId}|${placements.map((item) => `${item.side}:${item.particleId}`).sort().join(',')}`;
  const stale = Boolean(snapshot && snapshot.signature !== signature);
  const selectedDaughter = challenge.daughterOptions.find((item) => item.id === daughterId);
  const chooseDaughter = (id) => { setDaughterId(id); setError(''); onRecord('daughter', 'Daughter endpoint changed', `${challenge.daughterOptions.find((item) => item.id === id).notation} remains learner-selected.`); };
  const placeParticle = (particleId, side) => {
    const current = placements.find((item) => item.particleId === particleId);
    const next = current?.side === side ? placements.filter((item) => item.particleId !== particleId) : [...placements.filter((item) => item.particleId !== particleId), { particleId, side }];
    setPlacements(next); setError('');
    onRecord('particle', current?.side === side ? 'Particle removed' : 'Particle placed', `${DECAY_PARTICLE_BY_ID[particleId].symbol} ${current?.side === side ? 'removed from the learner equation' : `placed on the ${side} side`}.`);
  };
  const audit = () => {
    if (!daughterId) { setError('Choose a daughter cell before auditing. Nothing was changed.'); return; }
    try { const analysis = analyzeDecayAssembly({ challengeId, daughterId, placements }); setSnapshot({ analysis, signature }); setEvaluation(null); setHintLevel(0); setHint(''); setError(''); onRecord('audit', 'Decay assembly audited', analysis.assemblyCorrect ? 'All five assembly gates closed.' : 'The learner assembly remains visible with open gates.'); }
    catch (reason) { setError(reason.message); }
  };
  const choosePrediction = (key, value) => { setPrediction((current) => ({ ...current, [key]: value })); setEvaluation(null); onRecord('prediction', 'Decay claim changed', `${key}: ${value}`); };
  const check = () => {
    if (!snapshot || stale) { setError(stale ? 'The assembly changed. Audit it again before checking claims.' : 'Audit the assembly before checking claims.'); return; }
    try { const result = evaluateDecayAttempt({ analysis: snapshot.analysis, prediction }); setEvaluation(result); setError(''); onRecord('checked', 'Four decay claims checked', `${result.score.correct}/${result.score.total} claims closed; learner choices were preserved.`); }
    catch { setError('Choose one answer for all four decay claims. Existing choices were preserved.'); }
  };
  const revealHint = () => {
    if (!snapshot || stale) { setError(stale ? 'Audit the changed assembly before opening a hint.' : 'Audit an assembly before opening a hint.'); return; }
    const next = Math.min(4, hintLevel + 1); setHintLevel(next); setHint(nextDecayHint({ analysis: snapshot.analysis, level: next })); setError(''); onRecord('hint', `Decay hint ${next} opened`, 'No daughter, particle, or claim changed.');
  };
  return <div className="nuc-instrument"><ScenarioRail items={DECAY_CHALLENGES} selectedId={challengeId} onSelect={onChallenge} /><MissionStrip challenge={challenge} current={`${challenge.code} · ${challenge.name}`} teacher={challenge.teacherQuestion} /><div className="nuc-decay-main"><section className="nuc-particle-controls nuc-panel"><PanelHeading eyebrow="PARTICLE ROUTER" title="Place every visible term" badge={`${placements.length} PLACED`} /><p>{challenge.summary}</p><ParticleBank placements={placements} onPlacement={placeParticle} /><button type="button" className="nuc-primary-action" onClick={audit}><i>↘</i><span><strong>Audit decay</strong><small>Freeze this exact daughter and particle assembly</small></span></button><small className="nuc-safety-boundary">Symbolic bookkeeping only · no source handling, dose, shielding, or procedure</small>{error && <p className="nuc-inline-error">{error}</p>}</section><section className="nuc-decay-theatre nuc-panel"><PanelHeading eyebrow="LEAD-GLASS NUCLIDE CHAMBER" title={`${parent.notation} · choose the endpoint`} badge={snapshot ? stale ? 'PREVIOUS AUDIT' : snapshot.analysis.assemblyCorrect ? 'CLOSED' : 'OPEN' : 'UNAUDITED'} /><DaughterMap challenge={challenge} selectedId={daughterId} onSelect={chooseDaughter} revealed={Boolean(snapshot && !stale)} /><EquationTray parent={parent} daughter={selectedDaughter} placements={placements} revealed={Boolean(snapshot && !stale)} /></section><ConservationLedger snapshot={snapshot} stale={stale} /></div><PredictionConsole title="Commit four claims before evidence" questions={decayQuestions} prediction={prediction} onPrediction={choosePrediction} onCheck={check} onHint={revealHint} hintLevel={hintLevel} hint={hint} onClear={() => { setPrediction(emptyDecayPrediction()); setEvaluation(null); onRecord('clear', 'Decay claims cleared', 'The assembly and audit stayed unchanged.'); }} evaluation={evaluation} blockedReason={stale ? 'Assembly changed. Re-audit before checking claims.' : ''} /></div>;
}

const clockQuestions = [
  { key: 'parentBand', question: 'What fraction of the ideal parent population remains?', options: [
    { value: 'all-parent', label: 'All parent' }, { value: 'more-than-half', label: '> 1/2' }, { value: 'one-half', label: 'Exactly 1/2' }, { value: 'quarter-to-half', label: '1/4 to <1/2' }, { value: 'one-quarter', label: 'Exactly 1/4' }, { value: 'less-than-quarter', label: '< 1/4' },
  ] },
  { key: 'activityTrend', question: 'How does activity compare with its initial value?', options: [
    { value: 'same-as-initial', label: 'Same' }, { value: 'below-initial', label: 'Lower' }, { value: 'above-initial', label: 'Higher' },
  ] },
  { key: 'halfLifeResponse', question: 'If the starting number doubles, what happens to half-life?', options: [
    { value: 'shorter-with-more-starting-nuclei', label: 'Shorter' }, { value: 'longer-with-more-starting-nuclei', label: 'Longer' }, { value: 'unchanged-by-starting-count', label: 'Unchanged' },
  ] },
  { key: 'daughterRelation', question: 'What does this one-step expected daughter count equal?', options: [
    { value: 'equals-decayed-parent', label: 'Parent nuclei lost' }, { value: 'equals-parent-left', label: 'Parent nuclei left' }, { value: 'cannot-relate', label: 'Cannot relate' },
  ] },
];
const emptyClockPrediction = () => ({ parentBand: '', activityTrend: '', halfLifeResponse: '', daughterRelation: '' });

function ClockGraphic({ snapshot, stale }) {
  if (!snapshot) return <section className="nuc-clock-stage nuc-panel sealed"><PanelHeading eyebrow="SEGMENTED ISOTOPE CLOCK" title="Chronograph shutter closed" badge="NO RUN" /><div className="nuc-empty-clock"><i /><i /><strong>Release the clock explicitly</strong><p>The selected half-life and learner inputs are visible. Parent fraction, daughter ledger, and activity stay sealed.</p></div></section>;
  const { analysis } = snapshot;
  const parentSegments = Math.round(analysis.parentFraction * 64);
  const width = 660; const height = 240; const left = 38; const right = 18; const top = 18; const bottom = 34;
  const x = (halfLives) => left + (halfLives / 8) * (width - left - right);
  const y = (fraction) => top + (1 - fraction) * (height - top - bottom);
  const parentPath = analysis.curve.map((point) => `${x(point.halfLives)},${y(point.parentFraction)}`).join(' ');
  const daughterPath = analysis.curve.map((point) => `${x(point.halfLives)},${y(point.daughterFraction)}`).join(' ');
  const cursorX = x(Math.min(8, analysis.inputs.elapsedHalfLives));
  return <section className={`nuc-clock-stage nuc-panel ${stale ? 'stale' : ''}`}><PanelHeading eyebrow="SEGMENTED ISOTOPE CLOCK" title={stale ? 'Previous chronograph' : `${analysis.parent.notation} expected-value clock`} badge={stale ? 'PREVIOUS RUN' : `${fixed(analysis.inputs.elapsedHalfLives, 2)} t½`} />{stale && <p className="nuc-stale-note">Inputs changed. Segments, curve, and activity below belong to the previous run.</p>}<div className="nuc-clock-core"><div className="nuc-clock-face">{Array.from({ length: 64 }, (_, index) => <i key={index} className={index < parentSegments ? 'parent' : 'daughter'} style={{ '--index': index }} />)}<div><NuclideGlyph record={analysis.parent} /><span>{percent(analysis.parentFraction, 3)} parent</span><small>{analysis.challenge.halfLifeDisplay} per half-turn</small></div></div><div className="nuc-clock-ledger"><article><span>EXPECTED PARENT</span><strong>{scientific(analysis.parentNuclei)}</strong><small>{analysis.parent.notation}</small></article><article><span>DECLARED DAUGHTER</span><strong>{scientific(analysis.daughterNuclei)}</strong><small>{analysis.daughter.notation}</small></article><article><span>ACTIVITY</span><strong>{scientific(analysis.activityBq)} Bq</strong><small>ideal λN, not a detector count</small></article></div></div><div className="nuc-decay-curve"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Ideal expected parent and daughter fractions across eight half-lives"><g className="grid">{[0, .25, .5, .75, 1].map((fraction) => <line key={fraction} x1={left} x2={width - right} y1={y(fraction)} y2={y(fraction)} />)}{[0, 1, 2, 3, 4, 5, 6, 7, 8].map((time) => <line key={time} x1={x(time)} x2={x(time)} y1={top} y2={height - bottom} />)}</g><polyline className="parent" points={parentPath} /><polyline className="daughter" points={daughterPath} /><line className="cursor" x1={cursorX} x2={cursorX} y1={top} y2={height - bottom} /><text x={left} y={height - 10}>0</text><text x={width - right} y={height - 10} textAnchor="end">8 half-lives</text></svg><div><span><i className="parent" />parent expected fraction</span><span><i className="daughter" />declared daughter ledger</span></div></div><div className="nuc-equation-stack">{analysis.equationLedger.map((line) => <code key={line}>{line}</code>)}</div></section>;
}

function ClockInstrument({ challengeId, onChallenge, onRecord }) {
  const challenge = HALF_LIFE_CHALLENGE_BY_ID[challengeId];
  const [initialNuclei, setInitialNuclei] = useState(challenge.defaultInitialNuclei);
  const [elapsedHalfLives, setElapsedHalfLives] = useState(challenge.defaultElapsedHalfLives);
  const [prediction, setPrediction] = useState(emptyClockPrediction);
  const [snapshot, setSnapshot] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { const next = HALF_LIFE_CHALLENGE_BY_ID[challengeId]; setInitialNuclei(next.defaultInitialNuclei); setElapsedHalfLives(next.defaultElapsedHalfLives); setPrediction(emptyClockPrediction()); setSnapshot(null); setEvaluation(null); setHintLevel(0); setHint(''); setError(''); }, [challengeId]);
  const signature = `${challengeId}|${initialNuclei}|${elapsedHalfLives}`;
  const stale = Boolean(snapshot && snapshot.signature !== signature);
  const run = () => { try { const analysis = analyzeHalfLife({ challengeId, initialNuclei, elapsedHalfLives }); setSnapshot({ analysis, signature }); setEvaluation(null); setHintLevel(0); setHint(''); setError(''); onRecord('clock', 'Chronograph released', `${analysis.parent.notation}: ${percent(analysis.parentFraction, 4)} parent expected.`); } catch (reason) { setError(reason.message); } };
  const choosePrediction = (key, value) => { setPrediction((current) => ({ ...current, [key]: value })); setEvaluation(null); onRecord('prediction', 'Chronograph claim changed', `${key}: ${value}`); };
  const check = () => { if (!snapshot || stale) { setError(stale ? 'Inputs changed. Release the chronograph again before checking claims.' : 'Release the chronograph before checking claims.'); return; } try { const result = evaluateHalfLifeAttempt({ analysis: snapshot.analysis, prediction }); setEvaluation(result); setError(''); onRecord('checked', 'Four chronograph claims checked', `${result.score.correct}/${result.score.total} claims closed.`); } catch { setError('Choose one answer for all four chronograph claims. Existing choices were preserved.'); } };
  const revealHint = () => { if (!snapshot || stale) { setError(stale ? 'Release the changed clock before opening a hint.' : 'Release a chronograph before opening a hint.'); return; } const next = Math.min(4, hintLevel + 1); setHintLevel(next); setHint(nextHalfLifeHint({ analysis: snapshot.analysis, level: next })); setError(''); onRecord('hint', `Chronograph hint ${next} opened`, 'No input or claim changed.'); };
  return <div className="nuc-instrument"><ScenarioRail items={HALF_LIFE_CHALLENGES} selectedId={challengeId} onSelect={onChallenge} className="clock" /><MissionStrip challenge={challenge} current={`${challenge.code} · ${challenge.name}`} teacher={`If the starting count changes, which displayed quantities scale and which evaluated property remains fixed at ${challenge.halfLifeDisplay}?`} /><div className="nuc-clock-main"><section className="nuc-clock-controls nuc-panel"><PanelHeading eyebrow="CLOCK INPUT RACK" title={challenge.name} badge="IDEAL EXPECTATION" /><p>{challenge.provenance.statement}</p><div className="nuc-input-stack"><label><span>Initial parent nuclei N₀</span><div><input aria-label="Initial parent nuclei" type="number" min="1" max="1e30" step="1e8" value={initialNuclei} onChange={(event) => { setInitialNuclei(event.target.value); setError(''); }} /><b>nuclei</b></div></label><label><span>Elapsed half-lives</span><div><input aria-label="Elapsed half-lives" type="number" min="0" max="12" step="0.25" value={elapsedHalfLives} onChange={(event) => { setElapsedHalfLives(event.target.value); setError(''); }} /><b>t / t½</b></div><input className="nuc-time-range" aria-label="Elapsed half-life slider" type="range" min="0" max="8" step="0.125" value={Math.min(8, Number(elapsedHalfLives) || 0)} onChange={(event) => { setElapsedHalfLives(event.target.value); setError(''); }} /></label></div><div className="nuc-source-ticket"><span>EVALUATED HALF-LIFE</span><strong>{challenge.halfLifeDisplay}</strong><small>{challenge.daughterWindow}</small></div><button type="button" className="nuc-primary-action" onClick={run}><i>◴</i><span><strong>Release chronograph</strong><small>Freeze this exact expected population and time</small></span></button><small className="nuc-safety-boundary">Expected values only · no random event, detector, dose, or medical inference</small>{error && <p className="nuc-inline-error">{error}</p>}</section><ClockGraphic snapshot={snapshot} stale={stale} /></div><PredictionConsole title="Commit four clock claims" questions={clockQuestions} prediction={prediction} onPrediction={choosePrediction} onCheck={check} onHint={revealHint} hintLevel={hintLevel} hint={hint} onClear={() => { setPrediction(emptyClockPrediction()); setEvaluation(null); onRecord('clear', 'Chronograph claims cleared', 'The clock snapshot stayed unchanged.'); }} evaluation={evaluation} blockedReason={stale ? 'Inputs changed. Release the chronograph again before checking claims.' : ''} /></div>;
}

const bindingQuestions = (leftId, rightId) => [
  { key: 'largerPerNucleonId', question: 'Which selected nucleus has larger binding energy per nucleon?', options: [
    { value: leftId, label: BINDING_NUCLEI.find((item) => item.id === leftId)?.code }, { value: rightId, label: BINDING_NUCLEI.find((item) => item.id === rightId)?.code },
  ] },
  { key: 'largerTotalBindingId', question: 'Which selected nucleus has larger total binding energy?', options: [
    { value: leftId, label: BINDING_NUCLEI.find((item) => item.id === leftId)?.code }, { value: rightId, label: BINDING_NUCLEI.find((item) => item.id === rightId)?.code },
  ] },
  { key: 'massDefectSign', question: 'What is the sign of Δm = separated ledger − atomic mass?', options: [
    { value: 'both-positive', label: 'Positive for both' }, { value: 'both-negative', label: 'Negative for both' }, { value: 'one-of-each', label: 'One of each' },
  ] },
  { key: 'inferenceClaim', question: 'What can this six-point ridge establish about a reaction?', options: [
    { value: 'curve-proves-feasible-reaction', label: 'It proves a feasible pathway' }, { value: 'curve-only-not-pathway', label: 'It compares records, not pathways' },
  ] },
];
const emptyBindingPrediction = () => ({ largerPerNucleonId: '', largerTotalBindingId: '', massDefectSign: '', inferenceClaim: '' });

function BindingGraphic({ snapshot, stale, selectedLeftId, selectedRightId }) {
  if (!snapshot) return <section className="nuc-binding-stage nuc-panel sealed"><PanelHeading eyebrow="MASS-DEFECT RIDGE" title="Binding trace shutter closed" badge="NO RUN" /><div className="nuc-empty-ridge"><i /><strong>Choose two nuclei. Raise the ridge.</strong><p>Atomic masses remain visible as source records. The derived mass defect, total binding, and per-nucleon height remain sealed.</p></div></section>;
  const { analysis } = snapshot; const width = 820; const height = 330; const left = 62; const right = 24; const top = 28; const bottom = 48;
  const logMin = Math.log(2); const logMax = Math.log(238);
  const x = (a) => left + ((Math.log(a) - logMin) / (logMax - logMin)) * (width - left - right);
  const y = (energy) => top + ((9.2 - energy) / 8.4) * (height - top - bottom);
  const points = analysis.ridge.map((item) => `${x(item.massNumber)},${y(item.bindingEnergyPerNucleonMeV)}`).join(' ');
  return <section className={`nuc-binding-stage nuc-panel ${stale ? 'stale' : ''}`}><PanelHeading eyebrow="MASS-DEFECT RIDGE" title={stale ? 'Previous binding ridge' : `${analysis.left.code} versus ${analysis.right.code}`} badge={stale ? 'PREVIOUS RUN' : 'RIDGE RAISED'} />{stale && <p className="nuc-stale-note">The selected pair changed. The ridge and ledgers below belong to the previous run.</p>}<div className="nuc-ridge-chart"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Selected binding energy per nucleon ridge"><g className="grid">{[1, 3, 5, 7, 9].map((energy) => <g key={energy}><line x1={left} x2={width - right} y1={y(energy)} y2={y(energy)} /><text x={left - 10} y={y(energy) + 4} textAnchor="end">{energy}</text></g>)}</g><polyline points={points} />{analysis.ridge.map((item) => <g key={item.id} className={`${item.id === analysis.leftId || item.id === analysis.rightId ? 'selected' : ''} ${item.id === analysis.ridgePeak.id ? 'peak' : ''}`}><circle cx={x(item.massNumber)} cy={y(item.bindingEnergyPerNucleonMeV)} r="7" /><text x={x(item.massNumber)} y={y(item.bindingEnergyPerNucleonMeV) - 13} textAnchor="middle">{item.code}</text><text className="value" x={x(item.massNumber)} y={y(item.bindingEnergyPerNucleonMeV) + 22} textAnchor="middle">{fixed(item.bindingEnergyPerNucleonMeV, 3)}</text></g>)}<text className="axis-label" x={width / 2} y={height - 8} textAnchor="middle">mass number A · logarithmic placement</text><text className="axis-label y" x="14" y={height / 2} transform={`rotate(-90 14 ${height / 2})`} textAnchor="middle">binding energy / nucleon · MeV</text></svg><p><b>{analysis.ridgePeak.code}</b> is the highest point only in this selected six-record subset.</p></div><div className="nuc-binding-ledgers">{[analysis.left, analysis.right].map((item, index) => <article key={item.id} className={item.id === selectedLeftId || item.id === selectedRightId ? 'selected' : ''}><header><NuclideGlyph record={{ ...item, symbol: item.code.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, '') }} /><div><span>{index === 0 ? 'LEFT RECORD' : 'RIGHT RECORD'}</span><strong>{item.label}</strong></div></header><p><span>Atomic mass</span><b>{fixed(item.atomicMassU, 9)} u</b></p><p><span>Mass defect</span><b>{fixed(item.massDefectU, 9)} u</b></p><p><span>Total binding</span><b>{fixed(item.bindingEnergyMeV, 5)} MeV</b></p><p><span>Per nucleon</span><b>{fixed(item.bindingEnergyPerNucleonMeV, 6)} MeV</b></p><code>{analysis.ledgers[index].equation}</code></article>)}</div></section>;
}

function NucleusSelector({ label, value, otherValue, onChange }) {
  return <fieldset className="nuc-nucleus-selector"><legend>{label}</legend><div>{BINDING_NUCLEI.map((item) => <button type="button" key={item.id} disabled={item.id === otherValue} aria-pressed={value === item.id} className={value === item.id ? 'selected' : ''} onClick={() => onChange(item.id)}><strong>{item.code}</strong><small>{item.label}</small></button>)}</div></fieldset>;
}

function BindingInstrument({ leftId, rightId, onPair, onRecord }) {
  const [prediction, setPrediction] = useState(emptyBindingPrediction);
  const [snapshot, setSnapshot] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  const signature = `${leftId}|${rightId}`; const stale = Boolean(snapshot && snapshot.signature !== signature);
  const select = (side, id) => { const next = side === 'left' ? { leftId: id, rightId } : { leftId, rightId: id }; onPair(next); setPrediction(emptyBindingPrediction()); setEvaluation(null); setHintLevel(0); setHint(''); setError(''); onRecord('binding-select', `${side} binding record changed`, BINDING_NUCLEI.find((item) => item.id === id).code); };
  const run = () => { try { const analysis = analyzeBindingRidge({ leftId, rightId }); setSnapshot({ analysis, signature }); setEvaluation(null); setHintLevel(0); setHint(''); setError(''); onRecord('binding', 'Binding ridge raised', `${analysis.left.code} versus ${analysis.right.code}; learner pair frozen.`); } catch (reason) { setError(reason.message); } };
  const choosePrediction = (key, value) => { setPrediction((current) => ({ ...current, [key]: value })); setEvaluation(null); onRecord('prediction', 'Binding claim changed', `${key}: ${value}`); };
  const check = () => { if (!snapshot || stale) { setError(stale ? 'The pair changed. Raise the ridge again before checking claims.' : 'Raise the binding ridge before checking claims.'); return; } try { const result = evaluateBindingAttempt({ analysis: snapshot.analysis, prediction }); setEvaluation(result); setError(''); onRecord('checked', 'Four binding claims checked', `${result.score.correct}/${result.score.total} claims closed.`); } catch { setError('Choose one answer for all four binding claims. Existing choices were preserved.'); } };
  const revealHint = () => { if (!snapshot || stale) { setError(stale ? 'Raise the changed ridge before opening a hint.' : 'Raise a binding ridge before opening a hint.'); return; } const next = Math.min(4, hintLevel + 1); setHintLevel(next); setHint(nextBindingHint({ analysis: snapshot.analysis, level: next })); setError(''); onRecord('hint', `Binding hint ${next} opened`, 'No selected nucleus or claim changed.'); };
  return <div className="nuc-instrument"><div className="nuc-binding-mission"><span>SELECTED NIST MASS RECORDS</span><strong>Compare total binding with binding per nucleon.</strong><p>The ridge is a derived mass ledger. It does not manufacture a nuclear pathway or operational energy claim.</p><b>6 FROZEN NUCLEI</b></div><div className="nuc-binding-main"><section className="nuc-binding-controls nuc-panel"><PanelHeading eyebrow="PAIR SELECTOR" title="Choose two mass records" badge="LEARNER OWNED" /><NucleusSelector label="Left mass record" value={leftId} otherValue={rightId} onChange={(id) => select('left', id)} /><NucleusSelector label="Right mass record" value={rightId} otherValue={leftId} onChange={(id) => select('right', id)} /><div className="nuc-constant-slip"><span>DECLARED CONVERSION</span><strong>{NUCLEAR_CONSTANTS.atomicMassEnergyMeV} MeV / u</strong><small>2022 CODATA · neutral-atom convention</small></div><button type="button" className="nuc-primary-action" onClick={run}><i>⌁</i><span><strong>Raise binding ridge</strong><small>Freeze this exact pair and calculate its mass ledgers</small></span></button><small className="nuc-safety-boundary">Record comparison only · no pathway, cross section, reactor, dose, or process</small>{error && <p className="nuc-inline-error">{error}</p>}</section><BindingGraphic snapshot={snapshot} stale={stale} selectedLeftId={leftId} selectedRightId={rightId} /></div><PredictionConsole title="Commit four mass-energy claims" questions={bindingQuestions(leftId, rightId)} prediction={prediction} onPrediction={choosePrediction} onCheck={check} onHint={revealHint} hintLevel={hintLevel} hint={hint} onClear={() => { setPrediction(emptyBindingPrediction()); setEvaluation(null); onRecord('clear', 'Binding claims cleared', 'The ridge snapshot stayed unchanged.'); }} evaluation={evaluation} blockedReason={stale ? 'Pair changed. Raise the ridge again before checking claims.' : ''} /></div>;
}

const teacherContrasts = [
  { code: 'ISOTOPE ≠ ELEMENT', title: 'Same Z, different A', body: 'Use carbon-14 to separate an element identity from one isotope record.', mode: 'decay', target: 'carbon-beta-minus' },
  { code: 'EQUATION ≠ SPECTRUM', title: 'Closure is not every radiation line', body: 'Use the selected technetium level to separate state bookkeeping from a complete spectrum.', mode: 'decay', target: 'technetium-gamma' },
  { code: 'HALF-LIFE ≠ AMOUNT', title: 'Scale count, keep λ fixed', body: 'Use the carbon clock to show that more starting nuclei raise activity without changing half-life.', mode: 'clock', target: 'carbon-14-clock' },
  { code: 'ACTIVITY ≠ COUNT', title: 'The same N can decay at different rates', body: 'Use fluorine-18 to keep λ visible beside the expected parent population.', mode: 'clock', target: 'fluorine-18-clock' },
  { code: 'TOTAL ≠ PER NUCLEON', title: 'Two denominators, two rankings', body: 'Compare deuterium with iron-56 and make the division by A explicit.', mode: 'binding', target: ['hydrogen-2', 'iron-56'] },
  { code: 'RIDGE ≠ PATHWAY', title: 'A curve does not build a reaction', body: 'Compare iron-56 with uranium-238 without inferring a feasible process.', mode: 'binding', target: ['iron-56', 'uranium-238'] },
];

function TeacherRail({ onLoad }) {
  return <section className="nuc-teacher-rail nuc-panel"><PanelHeading eyebrow="TEACHER CONTRAST RAIL" title="Six distinctions worth pausing on" badge="LOAD · DO NOT RUN" /><div>{teacherContrasts.map((item) => <article key={item.code}><span>{item.code}</span><h3>{item.title}</h3><p>{item.body}</p><button type="button" onClick={() => onLoad(item)}>Load instrument <b>→</b></button></article>)}</div></section>;
}

function ActionHistory({ entries }) {
  return <section className="nuc-history nuc-panel"><PanelHeading eyebrow="LEARNER ACTION REGISTER" title="Nothing is silently repaired" badge={`${entries.length} EVENTS`} /><div>{entries.length === 0 ? <p>Challenge loads, placements, audits, claims, hints, and clears will appear here.</p> : entries.map((entry) => <article key={entry.id} className={entry.type}><i /><span>{entry.type}</span><div><strong>{entry.title}</strong><small>{entry.detail}</small></div></article>)}</div></section>;
}

function NuclearPassport() {
  const passport = MODEL_PASSPORTS.nuclearChemistryObservatory;
  return <section className="nuc-passport"><header><div><span>MODEL PASSPORT · NUCLEAR CHEMISTRY OBSERVATORY</span><h2>What this observatory can—and cannot—claim</h2></div><strong>{passport.resultKind}</strong></header><p className="nuc-passport-warning">Virtual reasoning cannot replace supervised laboratory work, radiation-safety training, an evaluated live database, or professional dose and handling controls.</p><div className="nuc-record-tables"><div><table><caption>Frozen evaluated half-life records</caption><thead><tr><th>Parent</th><th>t½</th><th>Window statement</th></tr></thead><tbody>{HALF_LIFE_CHALLENGES.map((item) => <tr key={item.id}><th>{NUCLIDE_BY_ID[item.parentId].notation}</th><td>{item.halfLifeDisplay}</td><td>{item.daughterWindow}</td></tr>)}</tbody></table></div><div><table><caption>Frozen neutral-atom masses used by the ridge</caption><thead><tr><th>Nucleus</th><th>A</th><th>Z</th><th>atomic mass / u</th></tr></thead><tbody>{BINDING_NUCLEI.map((item) => <tr key={item.id}><th>{item.code}</th><td>{item.massNumber}</td><td>{item.atomicNumber}</td><td>{fixed(item.atomicMassU, 9)}</td></tr>)}</tbody></table></div></div><div className="nuc-passport-grid"><article><h3>INCLUDES</h3>{passport.includes.slice(0, 10).map((item) => <p key={item}><b>+</b>{item}</p>)}</article><article><h3>EXCLUDES</h3>{passport.excludes.slice(0, 10).map((item) => <p key={item}><b>−</b>{item}</p>)}</article><article><h3>PROVENANCE</h3><p><b>i</b>{passport.inputProvenance}</p><p><b>i</b>{passport.dataStatement}</p></article></div><div className="nuc-boundary-strip">{Object.entries(NUCLEAR_MODEL_BOUNDARY).map(([key, value]) => <article key={key}><span>{key}</span><p>{value}</p></article>)}</div><div className="nuc-source-grid">{SOURCE_IDS.map((sourceId) => { const source = SCIENCE_SOURCES[sourceId]; return <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><span>{source.name}</span><small>{source.role}</small><b>↗</b></a>; })}</div></section>;
}

export default function NuclearChemistryLab() {
  const [mode, setMode] = useState('decay');
  const [decayChallengeId, setDecayChallengeId] = useState(DECAY_CHALLENGES[0].id);
  const [clockChallengeId, setClockChallengeId] = useState(HALF_LIFE_CHALLENGES[0].id);
  const [bindingPair, setBindingPair] = useState({ leftId: 'iron-56', rightId: 'uranium-238' });
  const [history, setHistory] = useState([]);
  const eventId = useRef(0);
  const record = useCallback((type, title, detail) => { eventId.current += 1; setHistory((items) => [{ id: eventId.current, type, title, detail }, ...items].slice(0, 80)); }, []);
  const chooseMode = (next) => { setMode(next); record('mode', 'Instrument changed', MODES.find((item) => item.id === next).label); };
  const chooseDecay = (id) => { setDecayChallengeId(id); record('challenge', 'Decay challenge loaded', DECAY_CHALLENGE_BY_ID[id].name); };
  const chooseClock = (id) => { setClockChallengeId(id); record('challenge', 'Clock challenge loaded', HALF_LIFE_CHALLENGE_BY_ID[id].name); };
  const loadTeacher = (item) => { setMode(item.mode); if (item.mode === 'decay') setDecayChallengeId(item.target); if (item.mode === 'clock') setClockChallengeId(item.target); if (item.mode === 'binding') setBindingPair({ leftId: item.target[0], rightId: item.target[1] }); record('teacher', 'Teacher contrast loaded', `${item.code}: instrument changed without running.`); };
  const heroCells = useMemo(() => [{ a: 238, z: 92, symbol: 'U' }, { a: 14, z: 6, symbol: 'C' }, { a: 99, z: 43, symbol: 'Tc' }], []);
  return (
    <section className="nuclear-chemistry-lab" id="nuclearChemistryLab" aria-labelledby="nuclearChemistryLabTitle">
      <header className="nuc-hero"><div><p className="section-code">02 / Nuclear chemistry observatory</p><h2 id="nuclearChemistryLabTitle">A nucleus changes coordinates. <em>The ledger must still close.</em></h2><p>Choose the daughter. Place every emitted or captured particle. Then let expected time and measured atomic mass answer different questions—without turning a symbolic equation into a safety, spectrum, or process claim.</p></div><aside className="nuc-hero-chamber" aria-hidden="true"><div className="hero-track">{heroCells.map((item, index) => <span key={item.symbol} style={{ '--index': index }}><sup>{item.a}</sup><b>{item.symbol}</b><sub>{item.z}</sub></span>)}<i /><i /></div><div className="hero-detector"><b>A</b><b>Z</b><b>Lₑ</b><span /></div><p>coordinate → time → mass energy</p></aside></header>
      <nav className="nuc-mode-tabs" role="tablist" aria-label="Nuclear chemistry instruments">{MODES.map((item) => <button type="button" role="tab" key={item.id} aria-selected={mode === item.id} className={modeClass(mode === item.id)} onClick={() => chooseMode(item.id)}><i>{item.icon}</i><span><strong>{item.label}</strong><small>{item.detail}</small></span></button>)}</nav>
      <div hidden={mode !== 'decay'}><DecayInstrument challengeId={decayChallengeId} onChallenge={chooseDecay} onRecord={record} /></div>
      <div hidden={mode !== 'clock'}><ClockInstrument challengeId={clockChallengeId} onChallenge={chooseClock} onRecord={record} /></div>
      <div hidden={mode !== 'binding'}><BindingInstrument leftId={bindingPair.leftId} rightId={bindingPair.rightId} onPair={setBindingPair} onRecord={record} /></div>
      <div className="nuc-bottom-grid"><TeacherRail onLoad={loadTeacher} /><ActionHistory entries={history} /></div>
      <NuclearPassport />
    </section>
  );
}

