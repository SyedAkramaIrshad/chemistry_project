import { useMemo, useState } from 'react';
import {
  CHEMICAL_EQUILIBRIUM_MODEL_BOUNDARY,
  CHEMICAL_EQUILIBRIUM_SCENARIO_BY_ID,
  CHEMICAL_EQUILIBRIUM_SCENARIOS,
} from '../data/chemicalEquilibriumScenarios.js';
import {
  createDefaultChemicalEquilibrium,
  evaluateEquilibriumPrediction,
  nextEquilibriumHint,
  runEquilibriumPerturbation,
  solveChemicalEquilibrium,
} from '../chemistry/chemicalEquilibrium.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../data/scienceSources.js';
import '../styles/chemical-equilibrium.css';

const PERTURBATIONS = Object.freeze([
  { id: 'add-species', glyph: '+', label: 'Add species', detail: 'composition shock' },
  { id: 'remove-species', glyph: '−', label: 'Remove species', detail: 'composition shock' },
  { id: 'compress', glyph: '↧', label: 'Compress', detail: 'V × 0.60' },
  { id: 'expand', glyph: '↥', label: 'Expand', detail: 'V × 1.60' },
  { id: 'catalyst', glyph: '⚡', label: 'Catalyst', detail: 'rate-only test' },
  { id: 'inert-volume', glyph: 'V', label: 'Inert · fixed V', detail: '+ inert gas' },
  { id: 'inert-pressure', glyph: 'p', label: 'Inert · fixed p', detail: 'piston expands' },
]);

const EMPTY_PREDICTION = Object.freeze({ qRelation: '', direction: '', kChange: '', probeTrend: '' });
const PARTICLE_POSITIONS = Array.from({ length: 48 }, (_, index) => ({
  left: 8 + ((index * 37 + index ** 2 * 3) % 84),
  top: 8 + ((index * 53 + index ** 2 * 5) % 81),
  size: 8 + (index % 4) * 2,
  delay: -((index % 11) * 0.17),
}));

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const fixed = (value, digits = 3) => Number.isFinite(value) ? Number(value).toFixed(digits) : value === Infinity ? '∞' : '—';
const signed = (value, digits = 4) => Number.isFinite(value) ? `${value > 0 ? '+' : ''}${value.toFixed(digits)}` : '—';
const formatRatio = (value) => {
  if (value === null) return 'undefined';
  if (value === Infinity) return '∞';
  if (value === 0) return '0';
  if (value >= 1000 || value < .001) return value.toExponential(2);
  return value.toFixed(4);
};
const formatQ = (value) => {
  if (value === null) return 'undefined';
  if (value === Infinity) return '∞';
  if (value === 0) return '0';
  if (value >= 1000 || value < .001) return value.toExponential(3);
  return value.toFixed(4);
};

function feedForScenario(scenario) {
  return {
    amounts: Object.fromEntries(scenario.species.map((species) => [species.id, species.defaultAmountMol])),
    volumeL: scenario.defaultVolumeL,
  };
}

function perturbationForScenario(scenario) {
  return {
    type: scenario.defaultPerturbationId,
    targetSpeciesId: scenario.defaultTargetSpeciesId,
    amountMol: scenario.defaultPerturbationAmountMol,
  };
}

function payloadFromControls(controls) {
  if (controls.type === 'compress') return { type: controls.type, factor: .6 };
  if (controls.type === 'expand') return { type: controls.type, factor: 1.6 };
  if (controls.type === 'catalyst') return { type: controls.type };
  if (controls.type === 'add-species' || controls.type === 'remove-species') {
    return { type: controls.type, targetSpeciesId: controls.targetSpeciesId, amountMol: controls.amountMol };
  }
  return { type: controls.type, amountMol: controls.amountMol };
}

function PanelHeading({ eyebrow, title, children }) {
  return <div className="ceq-panel-heading"><div><span>{eyebrow}</span><strong>{title}</strong></div>{children}</div>;
}

function ScenarioRail({ scenarioId, onSelect }) {
  return <aside className="ceq-scenario-rail ceq-panel"><PanelHeading eyebrow="Reaction rack · four bounded systems" title="Change the stoichiometric instrument"/><div className="ceq-scenario-list">{CHEMICAL_EQUILIBRIUM_SCENARIOS.map((scenario) => <button type="button" className={scenarioId === scenario.id ? 'selected' : ''} aria-pressed={scenarioId === scenario.id} onClick={() => onSelect(scenario.id)} key={scenario.id}><span className="ceq-scenario-code">{scenario.code}</span><strong>{scenario.reactionLabel}</strong><small>{scenario.name}</small><div><b>K {scenario.equilibriumConstant}</b><b>Δν {scenario.deltaNu > 0 ? '+' : ''}{scenario.deltaNu}</b><b>{scenario.temperatureK.toFixed(2)} K</b></div><i/></button>)}</div><p className="ceq-rail-note"><b>REAL 01</b> uses the cited MIT classroom value. Every <b>MODEL</b> card uses a synthetic constant so it cannot masquerade as measured chemistry.</p></aside>;
}

function AmountControl({ species, value, onChange }) {
  const update = (next) => onChange(clamp(Number(next), 0, 8));
  return <div className="ceq-amount-control" style={{ '--species-color': species.color }}><div className="ceq-species-token"><i/><span><strong>{species.formula}</strong><small>{species.nu > 0 ? `+${species.nu}` : species.nu} in ξ</small></span></div><div className="ceq-stepper"><button type="button" aria-label={`Decrease ${species.name} feed by 0.1 mole`} onClick={() => update(value - .1)}>−</button><label><span className="sr-only">{species.name} feed amount in moles</span><input type="number" min="0" max="8" step="0.05" value={Number(value.toFixed(4))} onChange={(event) => Number.isFinite(event.target.valueAsNumber) && update(event.target.valueAsNumber)}/><small>mol</small></label><button type="button" aria-label={`Increase ${species.name} feed by 0.1 mole`} onClick={() => update(value + .1)}>+</button></div></div>;
}

function FeedConsole({ scenario, feed, dirty, feedback, onAmount, onVolume, onEstablish, onReset }) {
  return <aside className="ceq-feed-console ceq-panel"><PanelHeading eyebrow="Feed manifold" title="Choose amounts, then establish equilibrium"><span className={dirty ? 'ceq-dirty-stamp' : 'ceq-ready-stamp'}>{dirty ? 'edited · unsolved' : 'equilibrium ready'}</span></PanelHeading><div className="ceq-feed-species">{scenario.species.map((species) => <AmountControl species={species} value={feed.amounts[species.id]} onChange={(value) => onAmount(species.id, value)} key={species.id}/>)}</div><label className="ceq-volume-control"><span><b>Reactor volume</b><strong>{feed.volumeL.toFixed(2)} L</strong></span><input type="range" min="5" max="60" step="0.1" value={feed.volumeL} onChange={(event) => onVolume(event.target.valueAsNumber)}/><input type="number" min="5" max="60" step="0.1" value={Number(feed.volumeL.toFixed(3))} onChange={(event) => Number.isFinite(event.target.valueAsNumber) && onVolume(clamp(event.target.valueAsNumber, 5, 60))}/></label><div className="ceq-feed-actions"><button type="button" className="primary" onClick={onEstablish}>Establish equilibrium</button><button type="button" onClick={onReset}>Reset feed</button></div><div className={`ceq-feed-feedback ${feedback.tone}`} aria-live="polite"><i/><span><strong>{feedback.title}</strong><p>{feedback.detail}</p></span></div></aside>;
}

function particlesForState(state, scenario) {
  const records = scenario.species.map((species) => ({ ...species, amount: state.amounts[species.id] }));
  if (state.inertMoles > 0) records.push({ id: 'inert', formula: 'M', name: 'Inert gas', color: '#9ba9b2', ink: '#13202a', amount: state.inertMoles });
  const total = records.reduce((sum, record) => sum + record.amount, 0);
  if (total <= 0) return [];
  let cursor = 0;
  const bands = records.map((record) => {
    cursor += record.amount / total;
    return { ...record, stop: cursor };
  });
  return PARTICLE_POSITIONS.map((position, index) => {
    const sample = ((index * 19) % PARTICLE_POSITIONS.length + .5) / PARTICLE_POSITIONS.length;
    const record = bands.find((band) => sample <= band.stop) || bands.at(-1);
    return { ...position, ...record, key: `${record.id}-${index}` };
  });
}

function gaugeAngle(logRatio) {
  if (logRatio === null) return 0;
  if (logRatio === Infinity) return 68;
  if (logRatio === -Infinity) return -68;
  return Math.tanh(logRatio / 2.5) * 68;
}

function NullDetector({ state }) {
  const quotient = state.quotient;
  const angle = gaugeAngle(quotient.logRatio);
  return <div className={`ceq-null-detector relation-${quotient.relation}`} role="img" aria-label={`Reaction quotient null detector: ${quotient.relationLabel}; ${quotient.direction.label}. Q over K is ${formatRatio(quotient.ratioToK)}.`}><div className="ceq-detector-head"><span>Q/K null detector</span><strong>{quotient.relationLabel}</strong></div><div className="ceq-dial"><div className="ceq-sector forward"><span>FORWARD</span><small>Q &lt; K</small></div><div className="ceq-sector reverse"><span>REVERSE</span><small>Q &gt; K</small></div><i className="ceq-dial-needle" style={{ transform: `rotate(${angle}deg)` }}/><b className="ceq-dial-hub"/><em>1</em></div><div className="ceq-detector-readout"><span><small>Q</small><strong>{formatQ(quotient.value)}</strong></span><span><small>Q/K</small><strong>{formatRatio(quotient.ratioToK)}</strong></span><span><small>ΔrG</small><strong>{Number.isFinite(quotient.deltaRGJMol) ? `${signed(quotient.deltaRGJMol / 1000, 2)} kJ mol⁻¹` : quotient.deltaRGJMol === Infinity ? '+∞' : quotient.deltaRGJMol === -Infinity ? '−∞' : '—'}</strong></span></div></div>;
}

function ExtentRail({ solution, stage }) {
  const extent = solution.extent;
  const span = extent.maximumMol - extent.minimumMol;
  const immediatePosition = span > 0 ? (0 - extent.minimumMol) / span : 0;
  const equilibriumPosition = span > 0 ? (extent.equilibriumMol - extent.minimumMol) / span : 0;
  const position = stage === 'immediate' ? immediatePosition : equilibriumPosition;
  return <div className="ceq-extent-rail" role="img" aria-label={`Feasible reaction extent from ${extent.minimumMol.toFixed(4)} to ${extent.maximumMol.toFixed(4)} mole. ${stage === 'immediate' ? 'Immediate state is extent zero.' : `Equilibrium shift is ${extent.equilibriumMol.toFixed(4)} mole.`}`}><div className="ceq-extent-title"><span>reaction-extent rail</span><strong>{stage === 'immediate' ? 'ξ = 0 after shock' : `ξeq ${signed(extent.equilibriumMol, 4)} mol`}</strong></div><div className="ceq-extent-track"><i style={{ left: `${clamp(position * 100, 0, 100)}%` }}/><b className="origin" style={{ left: `${clamp(immediatePosition * 100, 0, 100)}%` }}/></div><div className="ceq-extent-limits"><span>ξmin {fixed(extent.minimumMol, 3)}</span><span>origin</span><span>ξmax {fixed(extent.maximumMol, 3)}</span></div></div>;
}

function Reactor({ scenario, baseline, experiment, stage, onStage }) {
  const state = experiment ? experiment[stage] : baseline.equilibrium;
  const solution = experiment && stage !== 'before' ? experiment.solution : baseline;
  const particles = particlesForState(state, scenario);
  const volumeReference = experiment?.before.volumeL || baseline.equilibrium.volumeL;
  const pistonHeight = clamp(20 + state.volumeL / Math.max(volumeReference, 1) * 38, 30, 78);
  const isEquilibrium = state.quotient.relation === 'equal';
  const stageLabel = experiment ? ({ before: 'before equilibrium', immediate: 'immediate shock', after: 'new equilibrium' }[stage]) : 'established equilibrium';
  return <section className="ceq-reactor-panel ceq-panel"><div className="ceq-reactor-top"><div><span>reversible reactor · {stageLabel}</span><strong>{scenario.reactionLabel}</strong></div><div className="ceq-temperature-lock"><i>◆</i><span>temperature locked</span><strong>{scenario.temperatureK.toFixed(2)} K</strong></div></div><div className="ceq-stage-tabs" role="tablist" aria-label="Equilibrium experiment stages"><button type="button" role="tab" aria-selected={!experiment || stage === 'before'} onClick={() => onStage('before')}><i>1</i><span>Before<small>Q = K</small></span></button><button type="button" role="tab" aria-selected={Boolean(experiment && stage === 'immediate')} disabled={!experiment} onClick={() => onStage('immediate')}><i>2</i><span>Immediate<small>compare Q</small></span></button><button type="button" role="tab" aria-selected={Boolean(experiment && stage === 'after')} disabled={!experiment} onClick={() => onStage('after')}><i>3</i><span>New equilibrium<small>Q = K again</small></span></button></div><div className="ceq-reactor-instruments"><NullDetector state={state}/><div className="ceq-glass-rig" role="img" aria-label={`Symbolic ideal-gas reactor at ${state.volumeL.toFixed(2)} litres and ${state.totalPressureBar.toFixed(3)} bar. Particle colours encode relative species amounts, not molecular trajectories.`}><div className="ceq-rig-label"><span>{state.constraint.type === 'volume' ? 'FIXED V' : 'FIXED p'}</span><strong>{state.constraint.type === 'volume' ? `${state.volumeL.toFixed(2)} L` : `${state.totalPressureBar.toFixed(3)} bar`}</strong></div><div className="ceq-piston-rod"/><div className="ceq-piston" style={{ top: `${100 - pistonHeight}%` }}><i/><i/><i/></div><div className="ceq-glass" style={{ '--gas-top': `${100 - pistonHeight + 6}%` }}>{particles.map((particle) => <i className="ceq-particle" aria-hidden="true" key={particle.key} style={{ left: `${particle.left}%`, top: `${particle.top}%`, width: particle.size, height: particle.size, background: particle.color, color: particle.ink, animationDelay: `${particle.delay}s` }}/>) }<div className={`ceq-flux ${isEquilibrium ? 'balanced' : state.quotient.direction.id}`}><span>forward events <i>→</i></span><b>{isEquilibrium ? 'symbolic equal opposing flux' : state.quotient.direction.label}</b><span><i>←</i> reverse events</span></div></div><div className="ceq-rig-base"><span>ideal gas</span><b>p<sub>total</sub> {state.totalPressureBar.toFixed(3)} bar</b><span>{state.inertMoles > 0 ? `${state.inertMoles.toFixed(2)} mol inert` : 'no inert gas'}</span></div></div></div><div className="ceq-species-register">{scenario.species.map((species) => <div style={{ '--species-color': species.color }} key={species.id}><i/><span><small>{species.formula}</small><strong>{state.amounts[species.id].toFixed(4)} mol</strong><em>{state.partialPressuresBar[species.id].toFixed(4)} bar</em></span></div>)}</div><ExtentRail solution={solution} stage={experiment && stage !== 'before' ? stage : 'after'}/><p className="ceq-reactor-boundary">Particles are amount tokens. The equal-flux arrows are a conceptual equilibrium reminder—not calculated rates, molecular dynamics, or elapsed time.</p></section>;
}

function ChoiceBlock({ legend, value, options, onChange }) {
  return <fieldset className="ceq-choice-block"><legend>{legend}</legend><div>{options.map(([id, label, detail]) => <button type="button" className={value === id ? 'selected' : ''} aria-pressed={value === id} onClick={() => onChange(id)} key={id}><i/><span><strong>{label}</strong>{detail && <small>{detail}</small>}</span></button>)}</div></fieldset>;
}

function PerturbationConsole({ scenario, controls, prediction, dirty, preview, previewError, hintLevel, hint, onControls, onPrediction, onRun, onHint, onClear }) {
  const selected = PERTURBATIONS.find((item) => item.id === controls.type);
  const probe = scenario.species.find((species) => species.id === scenario.probeSpeciesId);
  const needsTarget = controls.type === 'add-species' || controls.type === 'remove-species';
  const needsAmount = needsTarget || controls.type === 'inert-volume' || controls.type === 'inert-pressure';
  return <aside className="ceq-perturb-console ceq-panel"><PanelHeading eyebrow="Perturbation console · predict before reveal" title="Shock one condition, then defend four claims"><button type="button" className="ceq-clear-button" onClick={onClear}>Clear claims</button></PanelHeading><div className="ceq-perturb-grid">{PERTURBATIONS.map((item) => <button type="button" className={controls.type === item.id ? 'selected' : ''} aria-pressed={controls.type === item.id} onClick={() => onControls({ ...controls, type: item.id })} key={item.id}><i>{item.glyph}</i><span><strong>{item.label}</strong><small>{item.detail}</small></span></button>)}</div>{(needsTarget || needsAmount) && <div className="ceq-perturb-parameters">{needsTarget && <label><span>Target species</span><select value={controls.targetSpeciesId} onChange={(event) => onControls({ ...controls, targetSpeciesId: event.target.value })}>{scenario.species.map((species) => <option value={species.id} key={species.id}>{species.formula} · {species.name}</option>)}</select></label>}{needsAmount && <label><span>Amount</span><div><input type="number" min="0.01" max="4" step="0.05" value={controls.amountMol} onChange={(event) => Number.isFinite(event.target.valueAsNumber) && onControls({ ...controls, amountMol: clamp(event.target.valueAsNumber, .01, 4) })}/><small>mol</small></div></label>}</div>}<div className="ceq-perturb-summary"><i>{selected.glyph}</i><span><strong>{selected.label}</strong><p>{dirty ? 'Feed edits are not part of the baseline yet. Establish equilibrium first.' : previewError || preview?.perturbation.actionReason || 'Choose a valid perturbation.'}</p></span></div><div className="ceq-prediction-divider"><span>lock your prediction</span><b>{Object.values(prediction).filter(Boolean).length}/4 claimed</b></div><ChoiceBlock legend="Immediately after the shock, where is Q?" value={prediction.qRelation} onChange={(qRelation) => onPrediction({ ...prediction, qRelation })} options={[["below", "Q < K", "forward side underfilled"], ["equal", "Q = K", "still balanced"], ["above", "Q > K", "product side overfilled"]]}/><ChoiceBlock legend="Which net readjustment follows?" value={prediction.direction} onChange={(direction) => onPrediction({ ...prediction, direction })} options={[["forward", "Forward", "toward products"], ["none", "None", "no net shift"], ["reverse", "Reverse", "toward reactants"]]}/><ChoiceBlock legend="Does the equilibrium constant change?" value={prediction.kChange} onChange={(kChange) => onPrediction({ ...prediction, kChange })} options={[["same", "K stays fixed", `${scenario.temperatureK.toFixed(2)} K locked`], ["changes", "K changes", "new constant"]]}/><ChoiceBlock legend={`At the new equilibrium, ${probe.formula} amount…`} value={prediction.probeTrend} onChange={(probeTrend) => onPrediction({ ...prediction, probeTrend })} options={[["rises", "Rises", "versus before"], ["same", "Stays", "within tolerance"], ["falls", "Falls", "versus before"]]}/><div className="ceq-console-actions"><button type="button" className="primary" disabled={dirty || !preview || Boolean(previewError)} onClick={onRun}>Run perturbation</button><button type="button" disabled={dirty || !preview || Boolean(previewError) || hintLevel >= 4} onClick={onHint}>{hintLevel ? `Next hint · ${hintLevel}/4` : 'Reveal one hint'}</button></div>{hint && <div className="ceq-hint"><span>HINT {hintLevel}/4</span><p>{hint}</p><small>No feed, perturbation, or prediction was changed.</small></div>}<p className="ceq-temperature-note"><i>◆</i><span><strong>Why K is locked</strong>All seven actions hold temperature fixed. A temperature perturbation needs a separately declared K(T) model; this reactor does not invent one.</span></p></aside>;
}

function SnapshotCard({ id, label, kicker, state, scenario, active, locked, onSelect }) {
  if (locked) return <div className="ceq-snapshot locked"><span>{kicker}</span><strong>{label}</strong><i>?</i><p>Run a perturbation to open this state.</p></div>;
  return <button type="button" className={`ceq-snapshot ${active ? 'active' : ''} ${id}`} onClick={() => onSelect(id)}><span>{kicker}</span><strong>{label}</strong><div className="ceq-snapshot-metrics"><b><small>Q/K</small>{formatRatio(state.quotient.ratioToK)}</b><b><small>V</small>{state.volumeL.toFixed(2)} L</b><b><small>p</small>{state.totalPressureBar.toFixed(3)} bar</b></div><div className="ceq-snapshot-species">{scenario.species.map((species) => <i style={{ '--species-color': species.color }} key={species.id}><em/>{species.formula} {state.amounts[species.id].toFixed(3)}</i>)}</div><p>{state.quotient.direction.label}</p></button>;
}

function ShockStrip({ scenario, baseline, experiment, stage, onStage }) {
  const before = experiment?.before || baseline.equilibrium;
  return <section className="ceq-shock-strip ceq-panel"><PanelHeading eyebrow="Causal strip · do not skip the middle" title="Equilibrium → immediate Q shock → re-equilibration"><span>click a state to load it in the reactor</span></PanelHeading><div className="ceq-snapshot-grid"><SnapshotCard id="before" kicker="01 · before" label="Established equilibrium" state={before} scenario={scenario} active={!experiment || stage === 'before'} onSelect={onStage}/><div className="ceq-snapshot-arrow"><span>perturb</span><i>→</i></div><SnapshotCard id="immediate" kicker="02 · no time elapsed" label="Immediate state" state={experiment?.immediate} scenario={scenario} active={stage === 'immediate'} locked={!experiment} onSelect={onStage}/><div className="ceq-snapshot-arrow"><span>net response</span><i>→</i></div><SnapshotCard id="after" kicker="03 · solved extent" label="New equilibrium" state={experiment?.after} scenario={scenario} active={stage === 'after'} locked={!experiment} onSelect={onStage}/></div>{experiment && <div className="ceq-shock-reason"><i>{experiment.immediate.quotient.direction.symbol}</i><span><strong>{experiment.perturbation.label}</strong><p>{experiment.answer.reason}</p></span><b>Δξ {signed(experiment.reactionShiftMol, 5)} mol</b></div>}</section>;
}

const FEEDBACK_LABELS = Object.freeze({ qRelation: 'Immediate Q', direction: 'Net direction', kChange: 'Equilibrium constant', probeTrend: 'Probe product amount' });

function PredictionFeedback({ scenario, experiment, evaluation }) {
  if (!evaluation) return <section className="ceq-feedback ceq-panel"><PanelHeading eyebrow="Answer comparator" title="Your claims remain yours—nothing is auto-corrected"><span>sealed</span></PanelHeading><div className="ceq-feedback-empty"><i>Q</i><span><strong>Run the selected perturbation when you are ready.</strong><p>The comparator will preserve each selected answer, show the model answer beside it, and explain one dimension at a time.</p></span></div></section>;
  return <section className={`ceq-feedback ceq-panel ${evaluation.allCorrect ? 'all-correct' : 'inspect'}`}><PanelHeading eyebrow="Answer comparator · preserved learner state" title={evaluation.allCorrect ? 'All four causal claims match.' : `${evaluation.correctCount}/4 claims match—inspect the exact break.`}><span>{evaluation.correctCount}/{evaluation.total}</span></PanelHeading><div className="ceq-feedback-grid">{Object.entries(evaluation.dimensions).map(([id, dimension]) => <article className={dimension.correct ? 'correct' : 'incorrect'} key={id}><div><i>{dimension.correct ? '✓' : '×'}</i><span><small>{FEEDBACK_LABELS[id]}</small><strong>{dimension.correct ? 'matches' : 'compare'}</strong></span></div><dl><div><dt>Your claim</dt><dd>{dimension.learnerLabel}</dd></div><div><dt>Model result</dt><dd>{dimension.expectedLabel}</dd></div></dl><p>{dimension.reason}</p></article>)}</div><div className="ceq-feedback-conclusion"><span><b>{experiment.immediate.quotient.relationLabel}</b><i>→</i><b>{experiment.immediate.quotient.direction.label}</b><i>→</i><b>Q = K again</b></span><p>Direction describes the net thermodynamic readjustment from the immediate state. It does not say that individual molecular events become one-way.</p></div></section>;
}

function TeacherLens({ scenario }) {
  return <aside className="ceq-teacher-lens ceq-panel"><PanelHeading eyebrow="Teacher lens" title="Use the controls to break memorized shift rules"/><ol><li><b>Product addition:</b> add one product. Ask why the reaction may run in reverse even if the final product amount is still above its original value.</li><li><b>Δν = 0:</b> compress A ⇌ B. Every pressure changes, but the pressure ratio—and therefore Q—does not.</li><li><b>Inert gas:</b> compare fixed V with fixed p. The gas identity is irrelevant; the constraint decides whether reacting partial pressures change.</li><li><b>Catalyst:</b> demand separate answers for “how fast is equilibrium approached?” and “where is equilibrium?” This instrument calculates only the second.</li></ol><div><span>Current inquiry</span><strong>{scenario.teachingQuestion}</strong><p>{scenario.evidenceNote}</p></div></aside>;
}

function EquilibriumPassport() {
  const passport = MODEL_PASSPORTS.reactionQuotientObservatory;
  return <aside className="ceq-passport ceq-panel"><div className="ceq-passport-intro"><PanelHeading eyebrow="Model + source passport" title={passport.name}/><div className="ceq-passport-verdict"><i/>{passport.resultKind}</div><p>{passport.inputProvenance}</p><p>{passport.dataStatement}</p><div className="ceq-equation-stack"><code>aᵢ = pᵢ/p°</code><code>Q = ∏ aᵢ<sup>νᵢ</sup></code><code>ΔᵣG = RT ln(Q/K)</code><code>nᵢ = nᵢ,₀ + νᵢξ</code></div></div><div className="ceq-passport-boundary"><div><span>Included</span>{passport.includes.map((item) => <b key={item}>{item}</b>)}</div><div className="excluded"><span>Not included</span>{passport.excludes.map((item) => <b key={item}>{item}</b>)}</div></div><div className="ceq-passport-sources"><span>Authoritative reference basis</span>{passport.sources.map((sourceId) => { const source = SCIENCE_SOURCES[sourceId]; return <a href={source.url} target="_blank" rel="noreferrer" key={source.id}><strong>{source.name}</strong><small>{source.role}</small><b aria-hidden="true">↗</b></a>; })}</div><p className="ceq-safety-lock">{CHEMICAL_EQUILIBRIUM_MODEL_BOUNDARY.safety}</p></aside>;
}

export default function ChemicalEquilibriumLab() {
  const [scenarioId, setScenarioId] = useState('sulfuryl-chloride-dissociation');
  const scenario = CHEMICAL_EQUILIBRIUM_SCENARIO_BY_ID[scenarioId];
  const [feed, setFeed] = useState(() => feedForScenario(scenario));
  const [baseline, setBaseline] = useState(() => createDefaultChemicalEquilibrium(scenarioId));
  const [dirty, setDirty] = useState(false);
  const [feedFeedback, setFeedFeedback] = useState({ tone: 'ready', title: 'Default equilibrium established.', detail: 'Edit any feed amount or volume, then explicitly establish a new baseline.' });
  const [controls, setControls] = useState(() => perturbationForScenario(scenario));
  const [prediction, setPrediction] = useState({ ...EMPTY_PREDICTION });
  const [experiment, setExperiment] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [stage, setStage] = useState('before');
  const [hintLevel, setHintLevel] = useState(0);
  const [hint, setHint] = useState('');

  const previewResult = useMemo(() => {
    if (dirty) return { experiment: null, error: '' };
    try {
      return { experiment: runEquilibriumPerturbation({ baseline, perturbation: payloadFromControls(controls) }), error: '' };
    } catch (error) {
      return { experiment: null, error: error.message };
    }
  }, [baseline, controls, dirty]);

  const clearOutcome = () => {
    setPrediction({ ...EMPTY_PREDICTION });
    setExperiment(null);
    setEvaluation(null);
    setStage('before');
    setHintLevel(0);
    setHint('');
  };

  const chooseScenario = (nextId) => {
    const next = CHEMICAL_EQUILIBRIUM_SCENARIO_BY_ID[nextId];
    setScenarioId(nextId);
    setFeed(feedForScenario(next));
    setBaseline(createDefaultChemicalEquilibrium(nextId));
    setControls(perturbationForScenario(next));
    setDirty(false);
    setFeedFeedback({ tone: 'ready', title: `${next.name} established.`, detail: `${next.provenance.label}; temperature and K are locked to the displayed record.` });
    setPrediction({ ...EMPTY_PREDICTION });
    setExperiment(null); setEvaluation(null); setStage('before'); setHintLevel(0); setHint('');
  };

  const changeFeed = (nextFeed) => {
    setFeed(nextFeed);
    setDirty(true);
    setPrediction({ ...EMPTY_PREDICTION });
    setExperiment(null); setEvaluation(null); setStage('before'); setHintLevel(0); setHint('');
    setFeedFeedback({ tone: 'edited', title: 'Feed changed; old equilibrium is still on screen.', detail: 'Press Establish equilibrium to make these values the new baseline. Nothing updates automatically.' });
  };

  const establish = () => {
    try {
      const next = solveChemicalEquilibrium({ scenarioId, amounts: feed.amounts, constraint: { type: 'volume', volumeL: feed.volumeL } });
      setBaseline(next);
      setDirty(false);
      setExperiment(null); setEvaluation(null); setStage('before'); setHintLevel(0); setHint('');
      setFeedFeedback({ tone: 'ready', title: 'New equilibrium established.', detail: `The solver moved ξ by ${signed(next.extent.equilibriumMol, 5)} mol from your feed and closed Q/K at ${formatRatio(next.equilibrium.quotient.ratioToK)}.` });
    } catch (error) {
      setFeedFeedback({ tone: 'error', title: 'This feed cannot establish the declared equilibrium.', detail: error.message });
    }
  };

  const resetFeed = () => {
    const nextFeed = feedForScenario(scenario);
    setFeed(nextFeed);
    setBaseline(createDefaultChemicalEquilibrium(scenarioId));
    setDirty(false);
    clearOutcome();
    setFeedFeedback({ tone: 'ready', title: 'Default feed restored and solved.', detail: scenario.provenance.statement });
  };

  const changeControls = (next) => {
    setControls(next);
    setPrediction({ ...EMPTY_PREDICTION });
    setExperiment(null); setEvaluation(null); setStage('before'); setHintLevel(0); setHint('');
  };

  const changePrediction = (next) => {
    setPrediction(next);
    setExperiment(null); setEvaluation(null); setStage('before');
  };

  const run = () => {
    if (!previewResult.experiment) return;
    const nextExperiment = previewResult.experiment;
    setExperiment(nextExperiment);
    setEvaluation(evaluateEquilibriumPrediction({ experiment: nextExperiment, prediction }));
    setStage('immediate');
  };

  const revealHint = () => {
    if (!previewResult.experiment) return;
    const level = Math.min(4, hintLevel + 1);
    setHintLevel(level);
    setHint(nextEquilibriumHint({ experiment: previewResult.experiment, level }));
  };

  return <section className="chemical-equilibrium-lab" id="chemicalEquilibriumLab" aria-labelledby="chemicalEquilibriumLabTitle"><header className="ceq-header"><div><p className="section-code">09 / Reaction quotient observatory</p><h2 id="chemicalEquilibriumLabTitle">Do not ask which way equilibrium “wants” to move. Disturb it. Calculate Q. Watch the balance answer.</h2><p>Build a gas composition, establish one reversible equilibrium, commit your prediction, then inspect the exact moment between the perturbation and the new equilibrium.</p></div><div className="ceq-header-instrument"><span>Fixed-temperature thermodynamic reactor</span><strong>Q ⇄ K</strong><small>4 reactions · 7 perturbations · 3 causal snapshots</small><b>no automatic correction · no kinetics</b></div></header><div className="ceq-core"><div className="ceq-left-stack"><ScenarioRail scenarioId={scenarioId} onSelect={chooseScenario}/><FeedConsole scenario={scenario} feed={feed} dirty={dirty} feedback={feedFeedback} onAmount={(speciesId, value) => changeFeed({ ...feed, amounts: { ...feed.amounts, [speciesId]: value } })} onVolume={(volumeL) => changeFeed({ ...feed, volumeL })} onEstablish={establish} onReset={resetFeed}/></div><Reactor scenario={scenario} baseline={baseline} experiment={experiment} stage={stage} onStage={setStage}/><PerturbationConsole scenario={scenario} controls={controls} prediction={prediction} dirty={dirty} preview={previewResult.experiment} previewError={previewResult.error} hintLevel={hintLevel} hint={hint} onControls={changeControls} onPrediction={changePrediction} onRun={run} onHint={revealHint} onClear={clearOutcome}/></div><ShockStrip scenario={scenario} baseline={baseline} experiment={experiment} stage={stage} onStage={setStage}/><PredictionFeedback scenario={scenario} experiment={experiment} evaluation={evaluation}/><div className="ceq-bottom-grid"><TeacherLens scenario={scenario}/><EquilibriumPassport/></div></section>;
}
