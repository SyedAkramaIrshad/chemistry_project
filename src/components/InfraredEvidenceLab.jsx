import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  INFRARED_BAND_LABELS,
  INFRARED_BAND_LABEL_BY_ID,
  INFRARED_CASES,
  INFRARED_CASE_BY_ID,
  INFRARED_DERIVATION_NOTICE,
  INFRARED_MODEL_BOUNDARY,
  INFRARED_RECORDS,
  INFRARED_RECORD_BY_ID,
} from '../data/infraredScenarios.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../data/scienceSources.js';
import {
  analyzeInfraredCase,
  analyzeInfraredRecord,
  createProbeState,
  evaluateInfraredCaseAttempt,
  evaluateProbeAssignments,
  nextInfraredCaseHint,
  nextInfraredProbeHint,
  placeInfraredProbe,
  removeInfraredProbe,
} from '../chemistry/infraredEvidence.js';
import '../styles/infrared-evidence.css';

const VIEW = { width: 940, height: 330, left: 58, right: 24, top: 30, bottom: 270 };
const MODE_ITEMS = [
  { id: 'reference', icon: '⌁', label: 'Reference bay', detail: 'scan · tag · audit' },
  { id: 'casefile', icon: '⟷', label: 'Isomer casefile', detail: 'same formula · different graph' },
];

const choiceClass = (active) => (active ? 'active' : '');
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const probeFingerprint = (state) => state.probes.map((probe) => `${probe.id}:${probe.wavenumberCmInv}:${probe.labelId}`).join('|');
const percent = (value) => `${(value * 100).toFixed(1)}%`;

function PanelHeading({ eyebrow, title, badge }) {
  return <header className="irx-panel-heading"><div><span>{eyebrow}</span><strong>{title}</strong></div>{badge && <b>{badge}</b>}</header>;
}

function RecordRail({ selectedId, onSelect }) {
  return <nav className="irx-record-rail" aria-label="Infrared reference records">{INFRARED_RECORDS.map((record) => <button type="button" className={choiceClass(record.id === selectedId)} aria-pressed={record.id === selectedId} onClick={() => onSelect(record.id)} key={record.id}><span>{record.code}</span><strong>{record.name}</strong><small>{record.formula} · {record.state.split(' ')[0]}</small><i /></button>)}</nav>;
}

function CaseRail({ selectedId, onSelect }) {
  return <nav className="irx-case-rail" aria-label="Infrared isomer cases">{INFRARED_CASES.map((scenario) => <button type="button" className={choiceClass(scenario.id === selectedId)} aria-pressed={scenario.id === selectedId} onClick={() => onSelect(scenario.id)} key={scenario.id}><span>{scenario.code}</span><strong>{scenario.name}</strong><small>{scenario.formula}</small><i /></button>)}</nav>;
}

function OpticalBeamline({ active, cursorCmInv }) {
  const region = cursorCmInv >= 2500 ? 'X–H' : cursorCmInv >= 1500 ? 'C═O' : 'PRINT';
  return <div className={`irx-beamline ${active ? 'active' : ''}`} aria-hidden="true"><div className="irx-lamp"><i /><b>W</b><span>source</span></div><div className="irx-beam"><i /></div><div className="irx-cell"><i /><b>GAS</b><span>cell</span></div><div className="irx-beam second"><i /></div><div className="irx-slit"><i /><b>{Math.round(cursorCmInv)}</b><span>cm⁻¹</span></div><div className="irx-beam third"><i /></div><div className="irx-detector"><i /><b>{region}</b><span>detector</span></div></div>;
}

function SpectrumFilm({ record, developed, stale, cursorCmInv, probes = [], evaluation, anonymous = false, onCursor }) {
  if (!record || !developed) return <section className="irx-film irx-panel sealed"><PanelHeading eyebrow="PHOTOGRAPHIC TRACE DRUM" title="Film shutter closed" badge="NO EXPOSURE" /><div className="irx-film-empty"><div><i /><i /><i /></div><strong>Develop the selected record explicitly.</strong><p>No trace, cursor intensity, or band evidence appears until the learner opens the shutter.</p></div></section>;
  const x = (wavenumber) => VIEW.left + ((4000 - wavenumber) / (4000 - 450)) * (VIEW.width - VIEW.left - VIEW.right);
  const y = (intensity) => VIEW.bottom - intensity * (VIEW.bottom - VIEW.top);
  const path = record.trace.map(([wavenumber, intensity], index) => `${index ? 'L' : 'M'}${x(wavenumber).toFixed(2)},${y(intensity).toFixed(2)}`).join(' ');
  const nearest = record.trace.reduce((best, point) => Math.abs(point[0] - cursorCmInv) < Math.abs(best[0] - cursorCmInv) ? point : best);
  const evaluationByProbe = Object.fromEntries((evaluation?.dimensions || []).map((item) => [item.probeId, item]));
  const setCursorFromPointer = (event) => {
    if (!onCursor || stale) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const viewX = ((event.clientX - rect.left) / rect.width) * VIEW.width;
    const wavenumber = 4000 - ((viewX - VIEW.left) / (VIEW.width - VIEW.left - VIEW.right)) * (4000 - 450);
    onCursor(Math.round(clamp(wavenumber, record.sourceRangeCmInv[0], record.sourceRangeCmInv[1])));
  };
  return <section className={`irx-film irx-panel ${stale ? 'stale' : ''}`}><PanelHeading eyebrow="DEVELOPED GAS-PHASE FILM" title={stale ? 'Previous record exposure' : anonymous ? 'Unknown record · identity shuttered' : record.name} badge={stale ? 'PREVIOUS FILM' : 'TRACE OPEN'} />{stale && <p className="irx-stale-note">The selected record changed. This film belongs to the previous exposure and remains visible for comparison.</p>}<div className="irx-film-meta"><span>{anonymous ? 'DECLARED UNKNOWN' : record.formula}</span><b>{record.state}</b><small>20 cm⁻¹ maximum-bin derivative · each record normalized independently</small></div><svg viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} role="img" aria-label={`Normalized transformed infrared trace for ${anonymous ? 'the declared unknown' : record.name}`} onClick={setCursorFromPointer}>
    <rect className="irx-film-paper" x="0" y="0" width={VIEW.width} height={VIEW.height} />
    <g className="irx-region-bands"><rect className="xh" x={x(4000)} y={VIEW.top} width={x(2500) - x(4000)} height={VIEW.bottom - VIEW.top} /><rect className="triple" x={x(2500)} y={VIEW.top} width={x(2000) - x(2500)} height={VIEW.bottom - VIEW.top} /><rect className="double" x={x(2000)} y={VIEW.top} width={x(1500) - x(2000)} height={VIEW.bottom - VIEW.top} /><rect className="fingerprint" x={x(1500)} y={VIEW.top} width={x(450) - x(1500)} height={VIEW.bottom - VIEW.top} /></g>
    <g className="irx-film-grid">{[0, .25, .5, .75, 1].map((level) => <g key={level}><line x1={VIEW.left} x2={VIEW.width - VIEW.right} y1={y(level)} y2={y(level)} /><text x={VIEW.left - 8} y={y(level) + 4} textAnchor="end">{Math.round(level * 100)}</text></g>)}{[4000, 3500, 3000, 2500, 2000, 1500, 1000, 500].map((tick) => <g key={tick}><line className="vertical" x1={x(tick)} x2={x(tick)} y1={VIEW.top} y2={VIEW.bottom} /><text x={x(tick)} y={VIEW.bottom + 24} textAnchor="middle">{tick}</text></g>)}</g>
    <path className="irx-trace" d={path} />
    <g className="irx-reticle"><line x1={x(cursorCmInv)} x2={x(cursorCmInv)} y1={VIEW.top} y2={VIEW.bottom} /><circle cx={x(nearest[0])} cy={y(nearest[1])} r="6" /><text x={clamp(x(cursorCmInv), 90, VIEW.width - 95)} y="18" textAnchor="middle">{cursorCmInv} cm⁻¹ · {percent(nearest[1])}</text></g>
    <g className="irx-probes">{probes.map((probe, index) => { const label = INFRARED_BAND_LABEL_BY_ID[probe.labelId]; const result = evaluationByProbe[probe.id]; const tagX = clamp(x(probe.wavenumberCmInv), 83, VIEW.width - 83); return <g className={`${result?.correct === true ? 'correct' : result?.correct === false ? 'wrong' : 'open'}`} key={probe.id}><line x1={x(probe.wavenumberCmInv)} x2={tagX} y1={VIEW.bottom} y2={VIEW.bottom - 34 - (index % 3) * 28} /><rect x={tagX - 54} y={VIEW.bottom - 57 - (index % 3) * 28} width="108" height="25" rx="4" style={{ '--probe': label.color }} /><text x={tagX} y={VIEW.bottom - 40 - (index % 3) * 28} textAnchor="middle">{label.shortLabel} · {probe.wavenumberCmInv}</text></g>; })}</g>
    <text className="irx-axis-label" x={(VIEW.left + VIEW.width - VIEW.right) / 2} y={VIEW.height - 8} textAnchor="middle">wavenumber / cm⁻¹ · high → low</text><text className="irx-axis-label y" x="14" y={VIEW.height / 2} transform={`rotate(-90 14 ${VIEW.height / 2})`} textAnchor="middle">normalized absorbance / %</text>
  </svg><div className="irx-film-legend"><span><i className="xh" />X–H region</span><span><i className="double" />double-bond region</span><span><i className="fingerprint" />fingerprint region</span><b>{record.sourceRangeCmInv[0].toFixed(0)}–{record.sourceRangeCmInv[1].toFixed(0)} cm⁻¹ source range</b></div></section>;
}

function ProbeAudit({ snapshot, stale }) {
  if (!snapshot) return <section className="irx-probe-audit irx-panel sealed"><PanelHeading eyebrow="PROBE COMPARATOR" title="Audit shutter closed" badge="NO AUDIT" /><div><strong>Hang at least one probe, then audit.</strong><p>Labels and exact positions remain learner-owned. The comparator does not snap a tag to a band.</p></div></section>;
  const evaluation = snapshot.evaluation;
  return <section className={`irx-probe-audit irx-panel ${stale ? 'stale' : ''}`}><PanelHeading eyebrow="PROBE COMPARATOR" title={stale ? 'Previous probe audit' : `${evaluation.score.correct}/${evaluation.score.total} scored tags match`} badge={stale ? 'PREVIOUS AUDIT' : evaluation.allAssignedCorrect ? 'ASSIGNED TAGS CLOSE' : 'INSPECT'} />{stale && <p className="irx-stale-note">Probe state changed. The reasons below belong to the previous audit.</p>}<div className="irx-probe-results">{evaluation.dimensions.map((item) => <article className={item.scored ? item.correct ? 'correct' : 'wrong' : 'neutral'} key={item.probeId}><header><span>{item.probeId}</span><b>{item.scored ? item.correct ? 'MATCH' : 'COMPARE' : 'OBSERVATION'}</b></header><strong>{item.learnerLabel} · {item.learnerWavenumberCmInv} cm⁻¹</strong><small>{item.expectedLabel}</small><p>{item.reason}</p></article>)}</div><div className="irx-missing-features"><span>DECLARED WINDOWS NOT YET MATCHED</span>{evaluation.missingFeatures.length ? evaluation.missingFeatures.map((feature) => <b key={feature.id}>{INFRARED_BAND_LABEL_BY_ID[feature.labelId].shortLabel} · {feature.centreCmInv}±{feature.toleranceCmInv}</b>) : <strong>Every declared feature has one matching learner tag.</strong>}</div><p className="irx-boundary-note">{evaluation.boundary}</p></section>;
}

function ReferenceInstrument({ recordId, onChooseRecord, recordAction }) {
  const record = INFRARED_RECORD_BY_ID[recordId];
  const [cursorCmInv, setCursorCmInv] = useState(3000);
  const [labelId, setLabelId] = useState('unassigned');
  const [probeState, setProbeState] = useState(() => createProbeState({ recordId }));
  const [film, setFilm] = useState(null);
  const [audit, setAudit] = useState(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [hint, setHint] = useState(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    setProbeState(createProbeState({ recordId }));
    setCursorCmInv(clamp(3000, record.sourceRangeCmInv[0], record.sourceRangeCmInv[1]));
    setLabelId('unassigned');
    setHintLevel(0);
    setHint(null);
    setMessage('');
  }, [recordId, record.sourceRangeCmInv]);
  const filmRecord = film ? INFRARED_RECORD_BY_ID[film.recordId] : null;
  const filmStale = Boolean(film && film.recordId !== recordId);
  const auditStale = Boolean(audit && (audit.recordId !== recordId || audit.fingerprint !== probeFingerprint(probeState)));
  const analysis = !filmStale && film ? analyzeInfraredRecord({ recordId, cursorCmInv }) : null;
  const develop = () => { setFilm({ recordId, cursorCmInv }); setMessage(''); recordAction('film', 'Reference film developed', `${record.name} · ${record.state}`); };
  const place = () => {
    if (!film || filmStale) { setMessage('Develop the selected record before hanging a probe. The previous film was preserved.'); return; }
    const result = placeInfraredProbe(probeState, { wavenumberCmInv: cursorCmInv, labelId });
    setMessage(result.reason);
    if (result.accepted) { setProbeState(result.state); recordAction('probe', 'Probe tag hung', result.reason); }
  };
  const remove = (probeId) => { const result = removeInfraredProbe(probeState, probeId); setMessage(result.reason); if (result.accepted) { setProbeState(result.state); recordAction('remove', 'Probe removed', result.reason); } };
  const runAudit = () => {
    if (!film || filmStale) { setMessage('Develop the selected record before auditing probes.'); return; }
    try { const evaluation = evaluateProbeAssignments({ recordId, probes: probeState.probes }); setAudit({ recordId, fingerprint: probeFingerprint(probeState), evaluation }); setMessage(''); recordAction('audit', 'Probe audit frozen', `${evaluation.score.correct}/${evaluation.score.total} scored tags match.`); }
    catch (error) { setMessage(error.message); }
  };
  const revealHint = () => {
    if (!film || filmStale) { setMessage('Develop the selected record before opening a hint.'); return; }
    const next = Math.min(4, hintLevel + 1); const value = nextInfraredProbeHint({ recordId, probes: probeState.probes, level: next }); setHintLevel(next); setHint(value); setMessage(''); recordAction('hint', `Reference hint ${next} opened`, value.mutation);
  };
  return <div className="irx-instrument"><RecordRail selectedId={recordId} onSelect={onChooseRecord} /><div className="irx-reference-grid"><aside className="irx-reference-console irx-panel"><PanelHeading eyebrow="REFERENCE CARTRIDGE" title="Choose, expose, then probe" badge={film && !filmStale ? 'FILM OPEN' : 'SHUTTERED'} /><div className="irx-source-ticket"><span>{record.code} · NIST GAS RECORD</span><strong>{record.name}</strong><b>{record.structure}</b><small>{record.formula} · CAS {record.cas}</small><small>{record.state}</small></div><OpticalBeamline active={Boolean(film && !filmStale)} cursorCmInv={cursorCmInv} /><button type="button" className="irx-primary" onClick={develop}><i>◐</i><span><strong>Develop reference film</strong><small>Open this selected trace explicitly</small></span></button><label className="irx-cursor-control"><span>Scanning reticle <b>{cursorCmInv} cm⁻¹</b></span><input type="range" min={Math.ceil(record.sourceRangeCmInv[0])} max={Math.floor(record.sourceRangeCmInv[1])} step="1" value={cursorCmInv} aria-label="Infrared scanning reticle" onChange={(event) => setCursorCmInv(Number(event.target.value))} /></label><label className="irx-label-select"><span>Tag claim</span><select value={labelId} onChange={(event) => setLabelId(event.target.value)}>{INFRARED_BAND_LABELS.map((label) => <option value={label.id} key={label.id}>{label.label}</option>)}</select></label><button type="button" className="irx-secondary" onClick={place}>Hang probe at cursor</button><div className="irx-probe-list"><span>LEARNER TAGS · {probeState.probes.length}/6</span>{probeState.probes.length ? probeState.probes.map((probe) => { const label = INFRARED_BAND_LABEL_BY_ID[probe.labelId]; return <article style={{ '--probe': label.color }} key={probe.id}><i /><div><strong>{label.shortLabel} · {probe.wavenumberCmInv} cm⁻¹</strong><small>{label.label}</small></div><button type="button" onClick={() => remove(probe.id)} aria-label={`Remove ${probe.id}`}>Remove</button></article>; }) : <p>No tags hang from this record yet.</p>}</div><div className="irx-action-row"><button type="button" onClick={runAudit}>Audit probe tags</button><button type="button" onClick={revealHint}>Hint {Math.min(hintLevel + 1, 4)} / 4</button></div>{message && <p className="irx-inline-message">{message}</p>}{hint && <div className="irx-hint"><b>HINT {hint.level} · {hint.title}</b><p>{hint.detail}</p><small>{hint.mutation}</small></div>}</aside><SpectrumFilm record={filmRecord} developed={Boolean(film)} stale={filmStale} cursorCmInv={filmStale ? film.cursorCmInv : cursorCmInv} probes={filmStale ? [] : probeState.probes} evaluation={!auditStale ? audit?.evaluation : null} onCursor={filmStale ? null : setCursorCmInv} /><ProbeAudit snapshot={audit} stale={auditStale} /></div><section className="irx-provenance-strip"><article><span>ORIGINAL REPRESENTATION</span><strong>{record.originalYRepresentation}</strong></article><article><span>SOURCE OWNER</span><strong>{record.sourceOwner}</strong></article><article><span>DERIVATIVE</span><strong>20 cm⁻¹ max bin · per-record normalization</strong></article><article><span>INTENSITY LIMIT</span><strong>not molar absorptivity · not cross-record quantitative</strong></article></section></div>;
}

const CASE_CHOICES = {
  formulaSufficient: [[true, 'Formula decides'], [false, 'Formula cannot decide']],
  identificationScope: [['certifies-identity', 'Certifies identity'], ['supports-declared-candidate-only', 'Supports this pair only']],
};

function ClaimGroup({ label, values, value, onChange }) {
  return <fieldset className="irx-claim-group"><legend>{label}</legend><div>{values.map(([id, text]) => <button type="button" className={choiceClass(value === id)} aria-pressed={value === id} onClick={() => onChange(id)} key={String(id)}>{text}</button>)}</div></fieldset>;
}

function CaseEvaluation({ snapshot, stale }) {
  if (!snapshot) return <section className="irx-case-evaluation irx-panel sealed"><PanelHeading eyebrow="CASE COMPARATOR" title="Four evidence shutters closed" badge="NO CHECK" /><div><strong>Expose the film. Commit four claims.</strong><p>The comparator reveals one reason per claim without replacing any learner answer.</p></div></section>;
  const evaluation = snapshot.evaluation;
  return <section className={`irx-case-evaluation irx-panel ${stale ? 'stale' : ''}`}><PanelHeading eyebrow="CASE COMPARATOR" title={stale ? 'Previous case check' : evaluation.allCorrect ? 'All four claims match' : `${evaluation.score.correct}/4 claims match`} badge={stale ? 'PREVIOUS CHECK' : `${evaluation.score.correct}/4`} />{stale && <p className="irx-stale-note">The case or a claim changed. These reasons belong to the previous check.</p>}<div>{Object.entries(evaluation.dimensions).map(([key, item]) => <article className={item.correct ? 'correct' : 'wrong'} key={key}><header><span>{key.replace(/([A-Z])/g, ' $1')}</span><b>{item.correct ? 'MATCH' : 'COMPARE'}</b></header><dl><div><dt>Your claim</dt><dd>{item.learnerLabel}</dd></div><div><dt>Declared result</dt><dd>{item.expectedLabel}</dd></div></dl><p>{item.reason}</p></article>)}</div></section>;
}

function CaseInstrument({ caseId, onChooseCase, recordAction }) {
  const scenario = INFRARED_CASE_BY_ID[caseId];
  const candidates = scenario.candidateIds.map((id) => INFRARED_RECORD_BY_ID[id]);
  const [cursorCmInv, setCursorCmInv] = useState(3000);
  const [prediction, setPrediction] = useState({ candidateId: null, formulaSufficient: null, decisiveLabelId: null, identificationScope: null });
  const [film, setFilm] = useState(null);
  const [check, setCheck] = useState(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [hint, setHint] = useState(null);
  const [message, setMessage] = useState('');
  useEffect(() => { setPrediction({ candidateId: null, formulaSufficient: null, decisiveLabelId: null, identificationScope: null }); setCursorCmInv(3000); setHintLevel(0); setHint(null); setMessage(''); }, [caseId]);
  const filmStale = Boolean(film && film.caseId !== caseId);
  const checkFingerprint = `${caseId}:${Object.values(prediction).join(':')}`;
  const checkStale = Boolean(check && check.fingerprint !== checkFingerprint);
  const exposedAnalysis = film ? film.analysis : null;
  const expose = () => { const analysis = analyzeInfraredCase({ caseId }); setFilm({ caseId, analysis }); setMessage(''); recordAction('film', 'Unknown film exposed', `${scenario.code} · identity remains shuttered.`); };
  const choose = (key, value) => { setPrediction((current) => ({ ...current, [key]: value })); setMessage(''); recordAction('claim', 'Case claim changed', `${key}: ${value}`); };
  const runCheck = () => {
    if (!film || filmStale) { setMessage('Expose the selected case film before checking claims. The previous film was preserved.'); return; }
    if (Object.values(prediction).some((value) => value === null)) { setMessage('Choose one answer for all four case claims. Existing choices were preserved.'); return; }
    const evaluation = evaluateInfraredCaseAttempt({ analysis: film.analysis, prediction }); setCheck({ fingerprint: checkFingerprint, evaluation }); setMessage(''); recordAction('check', 'Casefile checked', `${evaluation.score.correct}/4 claims match.`);
  };
  const revealHint = () => {
    if (!film || filmStale) { setMessage('Expose the selected case before opening a hint.'); return; }
    const next = Math.min(4, hintLevel + 1); const value = nextInfraredCaseHint({ analysis: film.analysis, level: next }); setHintLevel(next); setHint(value); setMessage(''); recordAction('hint', `Case hint ${next} opened`, value.mutation);
  };
  const filmRecord = exposedAnalysis?.unknownRecord;
  return <div className="irx-instrument"><CaseRail selectedId={caseId} onSelect={onChooseCase} /><section className="irx-case-mission"><span>{scenario.code} · SAME-FORMULA CASEFILE</span><strong>{scenario.mission}</strong><p>{scenario.teacherQuestion}</p><b>{scenario.formula}</b></section><div className="irx-case-grid"><aside className="irx-candidate-desk irx-panel"><PanelHeading eyebrow="CANDIDATE DESK" title="Formula routes to two graphs" badge="LEARNER DECIDES" /><div className="irx-formula-router"><strong>{scenario.formula}</strong><i /><i /></div><div className="irx-candidates">{candidates.map((candidate) => <button type="button" className={choiceClass(prediction.candidateId === candidate.id)} aria-pressed={prediction.candidateId === candidate.id} onClick={() => choose('candidateId', candidate.id)} key={candidate.id}><span>{candidate.name}</span><strong>{candidate.structure}</strong><small>{candidate.formula} · same atom inventory</small></button>)}</div><OpticalBeamline active={Boolean(film && !filmStale)} cursorCmInv={cursorCmInv} /><button type="button" className="irx-primary" onClick={expose}><i>◐</i><span><strong>Expose unknown film</strong><small>Open the selected measured-reference derivative</small></span></button><label className="irx-cursor-control"><span>Scanning reticle <b>{cursorCmInv} cm⁻¹</b></span><input type="range" min="460" max={filmRecord ? Math.floor(filmRecord.sourceRangeCmInv[1]) : 3960} step="1" value={cursorCmInv} aria-label="Unknown infrared scanning reticle" onChange={(event) => setCursorCmInv(Number(event.target.value))} /></label><small className="irx-scope-lock">One transformed gas-phase record · no automatic library search · identity remains a learner claim</small></aside><SpectrumFilm record={filmRecord} developed={Boolean(film)} stale={filmStale} cursorCmInv={cursorCmInv} anonymous={!check || checkStale} onCursor={filmStale ? null : setCursorCmInv} /></div><section className="irx-claim-lock irx-panel"><PanelHeading eyebrow="LEARNER CLAIM LOCK" title="Commit four independent evidence claims" badge="NO AUTO-CORRECTION" /><div className="irx-claim-grid"><ClaimGroup label="Which displayed candidate does this film support?" values={candidates.map((item) => [item.id, item.name])} value={prediction.candidateId} onChange={(value) => choose('candidateId', value)} /><ClaimGroup label="Can the formula decide connectivity by itself?" values={CASE_CHOICES.formulaSufficient} value={prediction.formulaSufficient} onChange={(value) => choose('formulaSufficient', value)} /><ClaimGroup label="Which declared evidence family separates this pair?" values={INFRARED_BAND_LABELS.filter((item) => item.id !== 'unassigned').map((item) => [item.id, item.label])} value={prediction.decisiveLabelId} onChange={(value) => choose('decisiveLabelId', value)} /><ClaimGroup label="How far can this one comparison claim?" values={CASE_CHOICES.identificationScope} value={prediction.identificationScope} onChange={(value) => choose('identificationScope', value)} /></div><div className="irx-case-actions"><button type="button" onClick={runCheck}>Check casefile</button><button type="button" onClick={revealHint}>Hint {Math.min(hintLevel + 1, 4)} / 4</button><button type="button" onClick={() => { setPrediction({ candidateId: null, formulaSufficient: null, decisiveLabelId: null, identificationScope: null }); setMessage(''); recordAction('clear', 'Case claims cleared', 'The exposed film stayed unchanged.'); }}>Clear claims</button></div>{message && <p className="irx-inline-message">{message}</p>}{hint && <div className="irx-hint"><b>HINT {hint.level} · {hint.title}</b><p>{hint.detail}</p><small>{hint.mutation}</small></div>}</section><CaseEvaluation snapshot={check} stale={checkStale} /></div>;
}

const TEACHER_CONTRASTS = [
  { code: 'FORMULA ≠ GRAPH', title: 'One inventory, two connectivities', body: 'Load the C₂H₆O case and ask what the formula proves before the film opens.', mode: 'casefile', target: 'oxygen-linkage' },
  { code: 'POSITION ≠ SHAPE', title: 'Gas O–H is not one universal silhouette', body: 'Load ethanol and keep phase beside the selected O–H coordinate.', mode: 'reference', target: 'ethanol-gas-ir' },
  { code: 'MISSING ≠ ABSENT', title: 'A bounded window cannot prove universal absence', body: 'Load dimethyl ether and distinguish this record from every possible condition.', mode: 'reference', target: 'dimethyl-ether-gas-ir' },
  { code: 'HEIGHT ≠ ε', title: 'Normalized intensity is not absorptivity', body: 'Load ethyl acetate and compare only positions and within-record shape.', mode: 'reference', target: 'ethyl-acetate-gas-ir' },
  { code: 'PAIR ≠ IDENTITY', title: 'Discrimination is not certification', body: 'Load the aldehyde/ketone case and keep the two-candidate boundary visible.', mode: 'casefile', target: 'carbonyl-terminus' },
  { code: 'REFERENCE ≠ SAMPLE', title: 'A database record did not measure your vial', body: 'Load the acid/ester case and ask what orthogonal evidence a real workflow would require.', mode: 'casefile', target: 'acid-or-ester' },
];

function TeacherRail({ onLoad }) {
  return <section className="irx-teacher-rail irx-panel"><PanelHeading eyebrow="TEACHER CONTRAST RAIL" title="Six distinctions that stop pattern-matching from becoming bluffing" badge="LOAD · DO NOT EXPOSE" /><div>{TEACHER_CONTRASTS.map((item) => <article key={item.code}><span>{item.code}</span><h3>{item.title}</h3><p>{item.body}</p><button type="button" onClick={() => onLoad(item)}>Load instrument <b>→</b></button></article>)}</div></section>;
}

function ActionHistory({ entries }) {
  return <section className="irx-history irx-panel"><PanelHeading eyebrow="LEARNER ACTION REGISTER" title="Every exposure and claim remains attributable" badge={`${entries.length} EVENTS`} /><div>{entries.length ? entries.map((entry) => <article className={entry.type} key={entry.id}><i /><span>{entry.type}</span><div><strong>{entry.title}</strong><small>{entry.detail}</small></div></article>) : <p>Record loads, exposures, probes, audits, claims, checks, hints, and clears will appear here.</p>}</div></section>;
}

function InfraredPassport() {
  const passport = MODEL_PASSPORTS.infraredEvidenceStudio;
  return <section className="irx-passport"><header><div><span>MODEL + SOURCE PASSPORT</span><h2>Measured coordinates, transformed honestly</h2></div><strong>{passport.resultKind}</strong></header><div className="irx-derivation-notice"><span>MODIFIED TEACHING DERIVATIVE · {INFRARED_DERIVATION_NOTICE.date}</span><p>{INFRARED_DERIVATION_NOTICE.statement}</p></div><div className="irx-passport-grid"><article><h3>CONDITIONS</h3>{passport.conditions.map((item) => <p key={item}><b>•</b>{item}</p>)}</article><article><h3>INCLUDES</h3>{passport.includes.map((item) => <p key={item}><b>+</b>{item}</p>)}</article><article><h3>EXCLUDES</h3>{passport.excludes.map((item) => <p key={item}><b>−</b>{item}</p>)}</article></div><div className="irx-boundary-grid">{Object.entries(INFRARED_MODEL_BOUNDARY).map(([key, value]) => <article key={key}><span>{key}</span><p>{value}</p></article>)}</div><div className="irx-source-grid">{passport.sources.map((sourceId) => { const source = SCIENCE_SOURCES[sourceId]; return <a href={source.url} target="_blank" rel="noreferrer" key={source.id}><strong>{source.name}</strong><small>{source.role}</small><b>↗</b></a>; })}</div><footer><p><b>LEARNER INPUT</b>{passport.inputProvenance}</p><p><b>LOCAL DATA</b>{passport.dataStatement}</p></footer></section>;
}

export default function InfraredEvidenceLab() {
  const [mode, setMode] = useState('reference');
  const [recordId, setRecordId] = useState('ethanol-gas-ir');
  const [caseId, setCaseId] = useState('oxygen-linkage');
  const [history, setHistory] = useState([]);
  const eventId = useRef(0);
  const recordAction = useCallback((type, title, detail) => { eventId.current += 1; setHistory((entries) => [{ id: eventId.current, type, title, detail }, ...entries].slice(0, 80)); }, []);
  const chooseMode = (next) => { setMode(next); recordAction('mode', 'Instrument changed', MODE_ITEMS.find((item) => item.id === next).label); };
  const chooseRecord = (next) => { setRecordId(next); recordAction('record', 'Reference cartridge loaded', INFRARED_RECORD_BY_ID[next].name); };
  const chooseCase = (next) => { setCaseId(next); recordAction('case', 'Isomer case loaded', INFRARED_CASE_BY_ID[next].name); };
  const loadTeacher = (item) => { setMode(item.mode); if (item.mode === 'reference') setRecordId(item.target); else setCaseId(item.target); recordAction('teacher', 'Teacher contrast loaded', `${item.code}: setup changed without exposure or evaluation.`); };
  const heroBands = useMemo(() => [3674, 2978, 1745, 1066], []);
  return <section className="infrared-evidence-lab" id="infraredEvidenceLab" aria-labelledby="infraredEvidenceLabTitle"><header className="irx-hero"><div><p className="section-code">18 / Infrared evidence studio</p><h2 id="infraredEvidenceLabTitle">A spectrum is evidence in coordinates. <em>Point to the band before you name the structure.</em></h2><p>Develop six transformed NIST gas-phase records, move a scanning reticle, hang your own assignment tags, and use one declared feature to distinguish three same-formula pairs—without turning one trace into an identity certificate.</p></div><aside className="irx-hero-optic" aria-hidden="true"><div className="hero-source"><i /><b>W</b></div><span /><div className="hero-cell">GAS</div><span /><div className="hero-film">{heroBands.map((band) => <i key={band} style={{ '--band': `${(4000 - band) / 35.5}%` }} />)}<b>4000</b><b>450</b></div><p>source → sample → coordinate evidence</p></aside></header><nav className="irx-mode-tabs" role="tablist" aria-label="Infrared evidence instruments">{MODE_ITEMS.map((item) => <button type="button" role="tab" aria-selected={mode === item.id} className={choiceClass(mode === item.id)} onClick={() => chooseMode(item.id)} key={item.id}><i>{item.icon}</i><span><strong>{item.label}</strong><small>{item.detail}</small></span></button>)}</nav><div hidden={mode !== 'reference'}><ReferenceInstrument recordId={recordId} onChooseRecord={chooseRecord} recordAction={recordAction} /></div><div hidden={mode !== 'casefile'}><CaseInstrument caseId={caseId} onChooseCase={chooseCase} recordAction={recordAction} /></div><div className="irx-bottom-grid"><TeacherRail onLoad={loadTeacher} /><ActionHistory entries={history} /></div><InfraredPassport /></section>;
}
