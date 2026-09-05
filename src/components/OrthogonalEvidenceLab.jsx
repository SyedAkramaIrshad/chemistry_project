import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MASS_EVIDENCE_PRESETS,
  MASS_EVIDENCE_PRESET_BY_ID,
  MASS_FINGERPRINT_OPTIONS,
  NMR_SIGNAL_REGIONS,
  ORTHOGONAL_DATA_NOTICE,
  ORTHOGONAL_EVIDENCE_BOUNDARY,
  ORTHOGONAL_EVIDENCE_CASES,
  ORTHOGONAL_EVIDENCE_CASE_BY_ID,
  ORTHOGONAL_NMR_FEATURES,
  PROTON_NMR_RECORDS,
  PROTON_NMR_RECORD_BY_ID,
} from '../data/orthogonalEvidenceScenarios.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../data/scienceSources.js';
import {
  analyzeOrthogonalCase,
  analyzeProtonRecord,
  calculateIsotopologueEnvelope,
  createNmrProbeState,
  evaluateMassEvidenceAttempt,
  evaluateNmrProbes,
  evaluateOrthogonalCaseAttempt,
  nextMassEvidenceHint,
  nextNmrProbeHint,
  nextOrthogonalCaseHint,
  placeNmrProbe,
  removeNmrProbe,
} from '../chemistry/orthogonalEvidence.js';
import '../styles/orthogonal-evidence.css';

const NMR_VIEW = { width: 980, height: 350, left: 56, right: 24, top: 42, bottom: 270 };
const MASS_VIEW = { width: 780, height: 330, left: 62, right: 24, top: 32, bottom: 260 };
const ELEMENTS = ['C', 'H', 'O', 'Cl', 'Br'];
const MODE_ITEMS = [
  { id: 'nmr', icon: 'δ', label: 'NMR tape', detail: 'release · tag · audit' },
  { id: 'mass', icon: 'M+2', label: 'Isotope flight tube', detail: 'count · fire · explain' },
  { id: 'casefile', icon: '×4', label: 'Evidence crossbar', detail: 'formula · IR · NMR · mass' },
];
const IR_ROLE_CHOICES = [
  ['shared-functional-class-does-not-decide', 'Shared class; no decision'],
  ['independent-aldehydic-c-h-support', 'Aldehydic C–H support'],
  ['independent-oh-support', 'O–H support'],
  ['certifies-identity', 'IR certifies identity'],
];

const choiceClass = (active) => (active ? 'active' : '');
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const probeFingerprint = (state) => state.probes.map((probe) => `${probe.id}:${probe.ppm}:${probe.protonCount}`).join('|');
const compositionFingerprint = (composition) => ELEMENTS.map((element) => `${element}${composition[element]}`).join('-');
const predictionFingerprint = (prediction) => Object.values(prediction).map((value) => String(value)).join(':');

function PanelHeading({ eyebrow, title, badge }) {
  return <header className="ox-panel-heading"><div><span>{eyebrow}</span><strong>{title}</strong></div>{badge && <b>{badge}</b>}</header>;
}

function ModeTabs({ mode, onChange }) {
  return <nav className="ox-mode-tabs" role="tablist" aria-label="Orthogonal structure evidence instruments">{MODE_ITEMS.map((item) => <button type="button" role="tab" aria-selected={mode === item.id} className={choiceClass(mode === item.id)} onClick={() => onChange(item.id)} key={item.id}><i>{item.icon}</i><span><strong>{item.label}</strong><small>{item.detail}</small></span></button>)}</nav>;
}

function RecordRail({ selectedId, onSelect }) {
  return <nav className="ox-record-rail" aria-label="Measured proton NMR records">{PROTON_NMR_RECORDS.map((record) => <button type="button" className={choiceClass(record.id === selectedId)} aria-pressed={record.id === selectedId} onClick={() => onSelect(record.id)} key={record.id}><span>{record.code}</span><strong>{record.name}</strong><small>{record.formula} · {record.peaks.length} reported signal{record.peaks.length === 1 ? '' : 's'}</small><i /></button>)}</nav>;
}

function MassPresetRail({ selectedId, onSelect }) {
  return <nav className="ox-mass-rail" aria-label="Ideal isotope-envelope presets">{MASS_EVIDENCE_PRESETS.map((preset) => <button type="button" className={choiceClass(preset.id === selectedId)} aria-pressed={preset.id === selectedId} onClick={() => onSelect(preset.id)} key={preset.id}><span>{preset.code}</span><strong>{preset.name}</strong><small>{preset.formula}</small><i /></button>)}</nav>;
}

function CaseRail({ selectedId, onSelect }) {
  return <nav className="ox-case-rail" aria-label="Orthogonal evidence casefiles">{ORTHOGONAL_EVIDENCE_CASES.map((scenario) => <button type="button" className={choiceClass(scenario.id === selectedId)} aria-pressed={scenario.id === selectedId} onClick={() => onSelect(scenario.id)} key={scenario.id}><span>{scenario.code}</span><strong>{scenario.name}</strong><small>{scenario.formula} · four evidence channels</small><i /></button>)}</nav>;
}

function HeroInstrument() {
  return <aside className="ox-hero-machine" aria-hidden="true"><div className="ox-magnet"><i /><i /><b>NMR</b><small>MAGNET</small></div><div className="ox-bus nmr"><i /><i /><i /></div><div className="ox-crossbar"><span>FORMULA</span><span>IR</span><span>NMR</span><span>MASS</span><b>?</b></div><div className="ox-bus mass"><i /><i /><i /></div><div className="ox-flight"><i /><b>m/z</b><small>IDEAL</small></div><p>independent channels → bounded claim</p></aside>;
}

function NmrTape({ snapshot, selectedRecordId, cursorPpm, probes = [], evaluation, anonymous = false, onCursor }) {
  if (!snapshot) return <section className="ox-nmr-tape ox-panel sealed"><PanelHeading eyebrow="MAGNETIC TAPE DECK" title="Measured peak list not released" badge="SHUTTERED" /><div className="ox-sealed-tape"><div>{[18, 45, 72].map((left) => <i style={{ left: `${left}%` }} key={left} />)}</div><strong>Release a selected record explicitly.</strong><p>No signal coordinate or integration count appears until you open the source cartridge.</p></div></section>;
  const record = PROTON_NMR_RECORD_BY_ID[snapshot.recordId];
  const stale = snapshot.recordId !== selectedRecordId;
  const shownCursor = stale ? snapshot.cursorPpm : cursorPpm;
  const x = (ppm) => NMR_VIEW.left + ((12.5 - ppm) / 12.5) * (NMR_VIEW.width - NMR_VIEW.left - NMR_VIEW.right);
  const maximumCount = Math.max(...record.peaks.map((peak) => peak.protonCount));
  const yTop = (peak) => NMR_VIEW.bottom - 58 - (peak.protonCount / maximumCount) * 128;
  const evaluationByProbe = Object.fromEntries((evaluation?.dimensions || []).map((item) => [item.probeId, item]));
  const pointer = (event) => {
    if (!onCursor || stale) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const viewX = ((event.clientX - rect.left) / rect.width) * NMR_VIEW.width;
    const ppm = 12.5 - ((viewX - NMR_VIEW.left) / (NMR_VIEW.width - NMR_VIEW.left - NMR_VIEW.right)) * 12.5;
    onCursor(Number(clamp(ppm, 0, 12.5).toFixed(2)));
  };
  return <section className={`ox-nmr-tape ox-panel ${stale ? 'stale' : ''}`}><PanelHeading eyebrow="MEASURED ¹H PEAK-LIST TAPE" title={stale ? 'Previous source cartridge' : anonymous ? 'Declared unknown · name shuttered' : record.name} badge={stale ? 'PREVIOUS TAPE' : 'TAPE OPEN'} />{stale && <p className="ox-stale-note">The selected record changed. This tape remains visible as the previous release; it is not silently replaced.</p>}<div className="ox-tape-meta"><span>{anonymous ? 'UNKNOWN RECORD' : record.formula}</span><b>{record.solvent}</b><small>{record.fieldMHz ? `${record.fieldMHz} MHz` : 'field unreported'} · {record.temperatureK ? `${record.temperatureK} K` : 'temperature unavailable'}</small></div><svg viewBox={`0 0 ${NMR_VIEW.width} ${NMR_VIEW.height}`} role="img" aria-label={`Measured proton NMR peak-list sticks for ${anonymous ? 'the declared unknown' : record.name}`} onClick={pointer}>
    <rect className="ox-tape-paper" width={NMR_VIEW.width} height={NMR_VIEW.height} />
    <g className="ox-nmr-regions">{NMR_SIGNAL_REGIONS.map((region) => <rect x={x(region.rangePpm[1])} y={NMR_VIEW.top} width={x(region.rangePpm[0]) - x(region.rangePpm[1])} height={NMR_VIEW.bottom - NMR_VIEW.top} fill={region.color} key={region.id} />)}</g>
    <g className="ox-nmr-grid">{[12, 10, 8, 6, 4, 2, 0].map((tick) => <g key={tick}><line x1={x(tick)} x2={x(tick)} y1={NMR_VIEW.top} y2={NMR_VIEW.bottom} /><text x={x(tick)} y={NMR_VIEW.bottom + 23} textAnchor="middle">{tick}</text></g>)}</g>
    <line className="ox-baseline" x1={NMR_VIEW.left} x2={NMR_VIEW.width - NMR_VIEW.right} y1={NMR_VIEW.bottom} y2={NMR_VIEW.bottom} />
    <g className="ox-measured-sticks">{record.peaks.map((peak, index) => <g key={peak.id}><line x1={x(peak.ppm)} x2={x(peak.ppm)} y1={NMR_VIEW.bottom} y2={yTop(peak)} /><circle cx={x(peak.ppm)} cy={yTop(peak)} r="5" /><rect x={clamp(x(peak.ppm) - 39, 12, NMR_VIEW.width - 90)} y={63 + (index % 2) * 31} width="78" height="23" rx="4" /><text x={clamp(x(peak.ppm), 51, NMR_VIEW.width - 51)} y={79 + (index % 2) * 31} textAnchor="middle">{peak.ppm.toFixed(2)} · {peak.protonCount}H</text></g>)}</g>
    <g className="ox-nmr-reticle"><line x1={x(shownCursor)} x2={x(shownCursor)} y1={NMR_VIEW.top} y2={NMR_VIEW.bottom} /><text x={clamp(x(shownCursor), 80, NMR_VIEW.width - 80)} y="25" textAnchor="middle">δ {shownCursor.toFixed(2)} ppm</text></g>
    <g className="ox-nmr-probes">{probes.map((probe, index) => { const result = evaluationByProbe[probe.id]; const tagX = clamp(x(probe.ppm), 60, NMR_VIEW.width - 60); return <g className={result?.correct ? 'correct' : result?.correct === false ? 'wrong' : 'open'} key={probe.id}><line x1={x(probe.ppm)} x2={tagX} y1={NMR_VIEW.bottom} y2={NMR_VIEW.bottom - 22 - (index % 3) * 26} /><rect x={tagX - 43} y={NMR_VIEW.bottom - 45 - (index % 3) * 26} width="86" height="23" rx="4" /><text x={tagX} y={NMR_VIEW.bottom - 29 - (index % 3) * 26} textAnchor="middle">{probe.protonCount}H @ {probe.ppm.toFixed(2)}</text></g>; })}</g>
    <text className="ox-axis-label" x={(NMR_VIEW.left + NMR_VIEW.width - NMR_VIEW.right) / 2} y={NMR_VIEW.height - 7} textAnchor="middle">chemical shift δ / ppm · high frequency → low frequency</text>
  </svg><div className="ox-tape-legend"><span><i className="measured" />measured source coordinate</span><span><i className="tag" />learner integration tag</span><b>STICKS ARE NOT LINE SHAPES OR SYNTHETIC MULTIPLETS</b></div></section>;
}

function NmrAudit({ snapshot, stale }) {
  if (!snapshot) return <section className="ox-audit ox-panel sealed"><PanelHeading eyebrow="SIGNAL COMPARATOR" title="No learner audit yet" badge="NO CHECK" /><div><strong>Tag at least one coordinate, then audit.</strong><p>The comparator checks position and integration separately. It never moves a tag for you.</p></div></section>;
  const evaluation = snapshot.evaluation;
  return <section className={`ox-audit ox-panel ${stale ? 'stale' : ''}`}><PanelHeading eyebrow="SIGNAL COMPARATOR" title={stale ? 'Previous NMR audit' : evaluation.allCorrect ? 'Every reported signal accounted for' : `${evaluation.score.correct}/${evaluation.score.total} tags fully match`} badge={stale ? 'PREVIOUS AUDIT' : `${evaluation.score.correct}/${evaluation.score.total}`} />{stale && <p className="ox-stale-note">A tag or record changed. These reasons belong to the preserved earlier audit.</p>}<div className="ox-audit-results">{evaluation.dimensions.map((item) => <article className={item.correct ? 'correct' : 'wrong'} key={item.probeId}><header><span>{item.probeId}</span><b>{item.correct ? 'MATCH' : 'COMPARE'}</b></header><strong>{item.learnerPpm.toFixed(2)} ppm · {item.learnerProtonCount} H</strong><small>position {item.positionCorrect ? 'matches' : 'does not match'} · integration {item.integrationCorrect ? 'matches' : 'does not match'}</small><p>{item.reason}</p></article>)}</div><div className="ox-missing"><span>MEASURED SIGNALS NOT FULLY ACCOUNTED FOR</span>{evaluation.missingPeaks.length ? evaluation.missingPeaks.map((peak) => <b key={peak.id}>{peak.ppm.toFixed(2)} ppm · {peak.protonCount} H</b>) : <strong>All displayed source entries have one complete tag.</strong>}</div><p className="ox-boundary-note">{evaluation.boundary}</p></section>;
}

function NmrInstrument({ recordId, onChooseRecord, recordAction }) {
  const record = PROTON_NMR_RECORD_BY_ID[recordId];
  const [cursorPpm, setCursorPpm] = useState(6.25);
  const [protonCount, setProtonCount] = useState(1);
  const [probeState, setProbeState] = useState(() => createNmrProbeState({ recordId }));
  const [tape, setTape] = useState(null);
  const [audit, setAudit] = useState(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [hint, setHint] = useState(null);
  const [message, setMessage] = useState('');
  useEffect(() => { setProbeState(createNmrProbeState({ recordId })); setCursorPpm(6.25); setProtonCount(1); setHintLevel(0); setHint(null); setMessage(''); }, [recordId]);
  const tapeStale = Boolean(tape && tape.recordId !== recordId);
  const auditStale = Boolean(audit && (audit.recordId !== recordId || audit.fingerprint !== probeFingerprint(probeState)));
  const cursor = tape && !tapeStale ? analyzeProtonRecord({ recordId, cursorPpm }) : null;
  const release = () => { setTape({ recordId, cursorPpm }); setMessage(''); recordAction('release', 'NMR source tape released', `${record.name} · spectrum ${record.spectrumId}`); };
  const place = () => {
    if (!tape || tapeStale) { setMessage('Release the selected source tape before attaching an integration tag. The previous tape was preserved.'); return; }
    const result = placeNmrProbe(probeState, { ppm: cursorPpm, protonCount }); setMessage(result.reason);
    if (result.accepted) { setProbeState(result.state); recordAction('probe', 'NMR integration tag attached', result.reason); }
  };
  const remove = (probeId) => { const result = removeNmrProbe(probeState, probeId); setMessage(result.reason); if (result.accepted) { setProbeState(result.state); recordAction('remove', 'NMR tag removed', result.reason); } };
  const runAudit = () => {
    if (!tape || tapeStale) { setMessage('Release the selected tape before auditing.'); return; }
    try { const evaluation = evaluateNmrProbes(probeState); setAudit({ recordId, fingerprint: probeFingerprint(probeState), evaluation }); setMessage(''); recordAction('audit', 'NMR audit frozen', `${evaluation.score.correct}/${evaluation.score.total} tags fully match.`); }
    catch (error) { setMessage(error.message); }
  };
  const revealHint = () => {
    if (!tape || tapeStale) { setMessage('Release the selected tape before opening a hint.'); return; }
    const next = Math.min(4, hintLevel + 1); const value = nextNmrProbeHint({ recordId, probes: probeState.probes, level: next }); setHintLevel(next); setHint(value); setMessage(''); recordAction('hint', `NMR hint ${next} opened`, value.mutation);
  };
  return <div className="ox-instrument"><RecordRail selectedId={recordId} onSelect={onChooseRecord} /><div className="ox-nmr-grid"><aside className="ox-console ox-panel"><PanelHeading eyebrow="MEASURED RECORD CARTRIDGE" title="Release, point, integrate" badge={tape && !tapeStale ? 'TAPE OPEN' : 'SHUTTERED'} /><div className="ox-source-card"><span>{record.code} · NMRShiftDB MEASURED</span><strong>{record.name}</strong><b>{record.structure}</b><small>{record.formula} · spectrum {record.spectrumId} · molecule {record.moleculeId}</small><small>{record.solvent} · {record.fieldMHz ? `${record.fieldMHz} MHz` : 'field unreported'}</small></div><div className={`ox-mini-magnet ${tape && !tapeStale ? 'active' : ''}`} aria-hidden="true"><i /><div><span>12.5</span><b>δ</b><span>0</span></div><i /><small>SOURCE TAPE</small></div><button type="button" className="ox-primary" onClick={release}><i>↯</i><span><strong>Release measured peak list</strong><small>Open this record explicitly</small></span></button><div className="ox-range"><label htmlFor="oxNmrReticle">Magnetic reticle <b>δ {cursorPpm.toFixed(2)} ppm</b></label><div className="ox-range-controls"><input id="oxNmrReticle" type="range" min="0" max="12.5" step="0.01" value={cursorPpm} aria-label="Proton NMR chemical shift reticle" onChange={(event) => setCursorPpm(Number(event.target.value))} /><input type="number" min="0" max="12.5" step="0.01" value={cursorPpm} aria-label="Exact proton NMR ppm" onChange={(event) => { const value = Number(event.target.value); if (Number.isFinite(value)) setCursorPpm(Number(clamp(value, 0, 12.5).toFixed(2))); }} /></div></div><label className="ox-select"><span>Integration cartridge</span><select value={protonCount} onChange={(event) => setProtonCount(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => index + 1).map((count) => <option value={count} key={count}>{count} H</option>)}</select></label><button type="button" className="ox-secondary" onClick={place}>Attach tag at reticle</button>{cursor && <div className="ox-live-readout"><span>NEAREST MEASURED ENTRY</span><strong>{cursor.cursor.nearestPeak.ppm.toFixed(2)} ppm · {cursor.cursor.nearestPeak.protonCount} H</strong><small>{cursor.cursor.distancePpm.toFixed(2)} ppm away · {cursor.cursor.region.label}</small></div>}<div className="ox-tag-list"><span>LEARNER TAGS · {probeState.probes.length}/8</span>{probeState.probes.length ? probeState.probes.map((probe) => <article key={probe.id}><i /><div><strong>{probe.ppm.toFixed(2)} ppm · {probe.protonCount} H</strong><small>{probe.id}</small></div><button type="button" onClick={() => remove(probe.id)} aria-label={`Remove ${probe.id}`}>Remove</button></article>) : <p>No integration tags are attached.</p>}</div><div className="ox-actions"><button type="button" onClick={runAudit}>Audit tags</button><button type="button" onClick={revealHint}>Hint {Math.min(hintLevel + 1, 4)} / 4</button></div>{message && <p className="ox-message">{message}</p>}{hint && <div className="ox-hint"><b>HINT {hint.level} · {hint.title}</b><p>{hint.detail}</p><small>{hint.mutation}</small></div>}</aside><NmrTape snapshot={tape} selectedRecordId={recordId} cursorPpm={cursorPpm} probes={tapeStale ? [] : probeState.probes} evaluation={!auditStale ? audit?.evaluation : null} onCursor={setCursorPpm} /><NmrAudit snapshot={audit} stale={auditStale} /></div><section className="ox-provenance-strip"><article><span>SOURCE COVERAGE</span><strong>{record.observedProtonCount}/{record.formulaProtonCount} formula H represented</strong></article><article><span>EXCHANGEABLE H</span><strong>{record.unreportedExchangeableProtons ? `${record.unreportedExchangeableProtons} H unreported; not synthesized` : 'source counts cover the formula total'}</strong></article><article><span>REPRESENTATION</span><strong>ppm sticks + source atom-reference counts</strong></article><article><span>EXCLUDED</span><strong>raw CML · FID · line shape · coupling fit</strong></article></section></div>;
}

function FlightTube({ active }) {
  return <div className={`ox-flight-tube ${active ? 'active' : ''}`} aria-hidden="true"><div className="source"><i /><b>M</b><small>neutral count</small></div><span><i /></span><div className="gate"><i /><b>±</b><small>isotopes</small></div><span><i /></span><div className="detector"><i /><b>M+2</b><small>ideal envelope</small></div></div>;
}

function MassEnvelope({ snapshot, stale }) {
  if (!snapshot) return <section className="ox-mass-plot ox-panel sealed"><PanelHeading eyebrow="ISOTOPE DETECTOR" title="Flight tube idle" badge="NO RUN" /><div className="ox-sealed-mass"><i /><i /><i /><strong>Set atom counts, then fire.</strong><p>No envelope is calculated until the learner explicitly opens the gate.</p></div></section>;
  const run = snapshot.run;
  const x = (offset) => MASS_VIEW.left + (offset / Math.max(6, run.envelope.at(-1).nominalOffset)) * (MASS_VIEW.width - MASS_VIEW.left - MASS_VIEW.right);
  const y = (intensity) => MASS_VIEW.bottom - (intensity / 100) * (MASS_VIEW.bottom - MASS_VIEW.top);
  const shown = run.envelope.filter((bucket) => bucket.nominalOffset <= 8);
  return <section className={`ox-mass-plot ox-panel ${stale ? 'stale' : ''}`}><PanelHeading eyebrow="IDEAL NATURAL-ABUNDANCE ENVELOPE" title={stale ? 'Previous atom-count run' : run.formula} badge={stale ? 'PREVIOUS RUN' : 'GATE FIRED'} />{stale && <p className="ox-stale-note">Atom counts changed. This calculated envelope remains visible as the previous run.</p>}<div className="ox-mass-meta"><span>NOMINAL M {run.nominalMass}</span><b>neutral monoisotopic mass {run.monoisotopicNeutralMass.toFixed(6)}</b><small>{run.fingerprint.label}</small></div><svg viewBox={`0 0 ${MASS_VIEW.width} ${MASS_VIEW.height}`} role="img" aria-label={`Calculated ideal isotope envelope for ${run.formula}`}>
    <rect className="ox-mass-paper" width={MASS_VIEW.width} height={MASS_VIEW.height} />
    <g className="ox-mass-grid">{[0, 25, 50, 75, 100].map((tick) => <g key={tick}><line x1={MASS_VIEW.left} x2={MASS_VIEW.width - MASS_VIEW.right} y1={y(tick)} y2={y(tick)} /><text x={MASS_VIEW.left - 8} y={y(tick) + 4} textAnchor="end">{tick}</text></g>)}</g>
    <line className="ox-mass-baseline" x1={MASS_VIEW.left} x2={MASS_VIEW.width - MASS_VIEW.right} y1={MASS_VIEW.bottom} y2={MASS_VIEW.bottom} />
    <g className="ox-isotope-sticks">{shown.map((bucket) => <g className={bucket.nominalOffset === 2 ? 'm2' : ''} key={bucket.nominalOffset}><line x1={x(bucket.nominalOffset)} x2={x(bucket.nominalOffset)} y1={MASS_VIEW.bottom} y2={y(bucket.relativeIntensity)} /><circle cx={x(bucket.nominalOffset)} cy={y(bucket.relativeIntensity)} r="5" /><text x={x(bucket.nominalOffset)} y={Math.max(24, y(bucket.relativeIntensity) - 11)} textAnchor="middle">{bucket.label} · {bucket.relativeToM.toFixed(1)}%</text><text className="mass-number" x={x(bucket.nominalOffset)} y={MASS_VIEW.bottom + 22} textAnchor="middle">{bucket.nominalMass}</text></g>)}</g>
    <text className="ox-axis-label" x={(MASS_VIEW.left + MASS_VIEW.width - MASS_VIEW.right) / 2} y={MASS_VIEW.height - 7} textAnchor="middle">nominal molecular-ion mass channel · ideal composition only</text>
  </svg><div className="ox-mass-legend"><span><i />relative to maximum calculated isotopologue bucket</span><b>M+2/M {run.fingerprint.mPlusTwoRelativeToM.toFixed(1)}%</b></div></section>;
}

function EvaluationCards({ snapshot, stale, eyebrow, emptyTitle, emptyBody }) {
  if (!snapshot) return <section className="ox-evaluation ox-panel sealed"><PanelHeading eyebrow={eyebrow} title={emptyTitle} badge="NO CHECK" /><div><strong>{emptyTitle}</strong><p>{emptyBody}</p></div></section>;
  const evaluation = snapshot.evaluation;
  return <section className={`ox-evaluation ox-panel ${stale ? 'stale' : ''}`}><PanelHeading eyebrow={eyebrow} title={stale ? 'Previous learner check' : evaluation.allCorrect ? 'All claims match the bounded model' : `${evaluation.score.correct}/${evaluation.score.total} claims match`} badge={stale ? 'PREVIOUS CHECK' : `${evaluation.score.correct}/${evaluation.score.total}`} />{stale && <p className="ox-stale-note">An input or claim changed. These reasons belong to the preserved earlier check.</p>}<div className="ox-evaluation-cards">{Object.entries(evaluation.dimensions).map(([key, item]) => <article className={item.correct ? 'correct' : 'wrong'} key={key}><header><span>{key.replace(/([A-Z])/g, ' $1')}</span><b>{item.correct ? 'MATCH' : 'COMPARE'}</b></header><dl><div><dt>Your claim</dt><dd>{item.learnerLabel}</dd></div><div><dt>Declared result</dt><dd>{item.expectedLabel}</dd></div></dl><p>{item.reason}</p></article>)}</div><p className="ox-boundary-note">{evaluation.boundary}</p></section>;
}

function ClaimGroup({ label, values, value, onChange, wide = false }) {
  return <fieldset className={`ox-claim-group ${wide ? 'wide' : ''}`}><legend>{label}</legend><div>{values.map(([id, text]) => <button type="button" className={choiceClass(value === id)} aria-pressed={value === id} onClick={() => onChange(id)} key={String(id)}>{text}</button>)}</div></fieldset>;
}

function MassInstrument({ presetId, onChoosePreset, recordAction }) {
  const preset = MASS_EVIDENCE_PRESET_BY_ID[presetId];
  const [composition, setComposition] = useState({ ...preset.composition });
  const [runSnapshot, setRunSnapshot] = useState(null);
  const [prediction, setPrediction] = useState({ nominalMass: '', fingerprint: null, identityScope: null });
  const [check, setCheck] = useState(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [hint, setHint] = useState(null);
  const [message, setMessage] = useState('');
  useEffect(() => { setComposition({ ...preset.composition }); setPrediction({ nominalMass: '', fingerprint: null, identityScope: null }); setHintLevel(0); setHint(null); setMessage(''); }, [presetId, preset.composition]);
  const fingerprint = compositionFingerprint(composition);
  const runStale = Boolean(runSnapshot && runSnapshot.fingerprint !== fingerprint);
  const checkFp = `${fingerprint}:${predictionFingerprint(prediction)}`;
  const checkStale = Boolean(check && check.fingerprint !== checkFp);
  const adjust = (element, delta) => {
    const limits = { C: 12, H: 30, O: 8, Cl: 3, Br: 3 };
    setComposition((current) => ({ ...current, [element]: clamp(current[element] + delta, 0, limits[element]) })); setMessage(''); recordAction('atom', 'Atom counter changed', `${element} ${delta > 0 ? '+' : '−'}1; previous run preserved.`);
  };
  const fire = () => {
    try { const run = calculateIsotopologueEnvelope(composition); setRunSnapshot({ fingerprint, run }); setMessage(''); recordAction('fire', 'Isotope gate fired', `${run.formula} · nominal M ${run.nominalMass}`); }
    catch (error) { setMessage(error.message); }
  };
  const choose = (key, value) => { setPrediction((current) => ({ ...current, [key]: value })); setMessage(''); recordAction('claim', 'Mass claim changed', `${key}: ${value}`); };
  const runCheck = () => {
    if (!runSnapshot || runStale) { setMessage('Fire the current atom counts before checking claims. The previous run was preserved.'); return; }
    if (prediction.nominalMass === '' || prediction.fingerprint === null || prediction.identityScope === null) { setMessage('Commit all three mass claims. Existing choices were preserved.'); return; }
    try { const normalized = { ...prediction, nominalMass: Number(prediction.nominalMass) }; const evaluation = evaluateMassEvidenceAttempt({ run: runSnapshot.run, prediction: normalized }); setCheck({ fingerprint: checkFp, evaluation }); setMessage(''); recordAction('check', 'Mass evidence audited', `${evaluation.score.correct}/3 claims match.`); }
    catch (error) { setMessage(error.message); }
  };
  const revealHint = () => {
    if (!runSnapshot || runStale) { setMessage('Fire the current atom counts before opening a hint.'); return; }
    const next = Math.min(4, hintLevel + 1); const value = nextMassEvidenceHint({ run: runSnapshot.run, level: next }); setHintLevel(next); setHint(value); setMessage(''); recordAction('hint', `Mass hint ${next} opened`, value.mutation);
  };
  return <div className="ox-instrument"><MassPresetRail selectedId={presetId} onSelect={onChoosePreset} /><div className="ox-mass-layout"><aside className="ox-mass-console ox-panel"><PanelHeading eyebrow="ATOM-COUNT CARTRIDGE" title="Build a formula, then fire" badge={runSnapshot && !runStale ? 'RUN CURRENT' : 'GATE CLOSED'} /><div className="ox-preset-card"><span>{preset.code} · TEACHING PRESET</span><strong>{preset.name}</strong><b>{preset.formula}</b><small>{preset.lesson}</small></div><div className="ox-atom-counters">{ELEMENTS.map((element) => <article key={element}><span>{element}</span><button type="button" onClick={() => adjust(element, -1)} aria-label={`Remove one ${element} atom`}>−</button><strong>{composition[element]}</strong><button type="button" onClick={() => adjust(element, 1)} aria-label={`Add one ${element} atom`}>+</button></article>)}</div><FlightTube active={Boolean(runSnapshot && !runStale)} /><button type="button" className="ox-primary" onClick={fire}><i>▶</i><span><strong>Fire isotope gate</strong><small>Calculate this atom inventory explicitly</small></span></button>{message && <p className="ox-message">{message}</p>}</aside><MassEnvelope snapshot={runSnapshot} stale={runStale} /></div><section className="ox-claim-lock ox-panel"><PanelHeading eyebrow="MASS CLAIM LOCK" title="Commit three claims before comparison" badge="NO AUTO-FILL" /><div className="ox-mass-claims"><label className="ox-number-claim"><span>What is nominal M?</span><input type="number" min="1" max="500" value={prediction.nominalMass} onChange={(event) => choose('nominalMass', event.target.value)} placeholder="integer" /></label><ClaimGroup label="Which calculated M+2 pattern is present?" values={MASS_FINGERPRINT_OPTIONS.map((item) => [item.id, item.label])} value={prediction.fingerprint} onChange={(value) => choose('fingerprint', value)} wide /><ClaimGroup label="Can this ideal envelope identify a constitutional isomer?" values={[["formula-cannot-identify-isomer", 'No · formula still ties isomers'], ["identifies-constitutional-isomer", 'Yes · it identifies the graph']]} value={prediction.identityScope} onChange={(value) => choose('identityScope', value)} /></div><div className="ox-case-actions"><button type="button" onClick={runCheck}>Audit mass claims</button><button type="button" onClick={revealHint}>Hint {Math.min(hintLevel + 1, 4)} / 4</button><button type="button" onClick={() => { setPrediction({ nominalMass: '', fingerprint: null, identityScope: null }); setMessage(''); recordAction('clear', 'Mass claims cleared', 'Atom counts and fired envelope stayed unchanged.'); }}>Clear claims</button></div>{hint && <div className="ox-hint"><b>HINT {hint.level} · {hint.title}</b><p>{hint.detail}</p><small>{hint.mutation}</small></div>}</section><EvaluationCards snapshot={check} stale={checkStale} eyebrow="MASS CLAIM COMPARATOR" emptyTitle="Three mass claims waiting" emptyBody="Fire the gate, commit all three claims, and check. Each mismatch receives a specific reason." /></div>;
}

function EvidenceCrossbar({ scenario, nmrOpen, massOpen, checked }) {
  const channels = [
    ['FORMULA', true, scenario.formula, 'shared atom inventory'],
    ['IR', true, 'INDEPENDENT', scenario.irRole],
    ['¹H NMR', nmrOpen, nmrOpen ? 'TAPE OPEN' : 'LOCKED', 'measured magnetic environments'],
    ['IDEAL MASS', massOpen, massOpen ? 'GATE FIRED' : 'LOCKED', 'composition-level isotope pattern'],
  ];
  return <div className="ox-evidence-crossbar" aria-label="Four-channel evidence crossbar"><div className="ox-crossbar-bus"><i /><i /><i /><i /></div>{channels.map(([name, open, value, detail]) => <article className={open ? 'open' : 'locked'} key={name}><span>{name}</span><strong>{value}</strong><small>{detail}</small><i /></article>)}<div className={`ox-verdict-lamp ${checked ? 'open' : ''}`}><span>PAIR CLAIM</span><b>{checked ? 'REASONS OPEN' : '?'}</b><small>not identity certification</small></div></div>;
}

function CaseInstrument({ caseId, onChooseCase, recordAction }) {
  const scenario = ORTHOGONAL_EVIDENCE_CASE_BY_ID[caseId];
  const candidates = scenario.candidateIds.map((id) => PROTON_NMR_RECORD_BY_ID[id]);
  const [cursorPpm, setCursorPpm] = useState(6.25);
  const [nmrSnapshot, setNmrSnapshot] = useState(null);
  const [massSnapshot, setMassSnapshot] = useState(null);
  const [prediction, setPrediction] = useState({ formulaSufficient: null, irRole: null, nmrFeatureId: null, massDiscriminates: null, candidateId: null });
  const [check, setCheck] = useState(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [hint, setHint] = useState(null);
  const [message, setMessage] = useState('');
  useEffect(() => { setCursorPpm(6.25); setPrediction({ formulaSufficient: null, irRole: null, nmrFeatureId: null, massDiscriminates: null, candidateId: null }); setHintLevel(0); setHint(null); setMessage(''); }, [caseId]);
  const nmrStale = Boolean(nmrSnapshot && nmrSnapshot.caseId !== caseId);
  const massStale = Boolean(massSnapshot && massSnapshot.caseId !== caseId);
  const checkFp = `${caseId}:${predictionFingerprint(prediction)}:${!nmrStale && Boolean(nmrSnapshot)}:${!massStale && Boolean(massSnapshot)}`;
  const checkStale = Boolean(check && check.fingerprint !== checkFp);
  const releaseNmr = () => { const analysis = analyzeOrthogonalCase({ caseId }); setNmrSnapshot({ caseId, recordId: analysis.unknownRecord.id, cursorPpm, analysis }); setMessage(''); recordAction('release', 'Case NMR tape released', `${scenario.code} · unknown name remains shuttered.`); };
  const fireMass = () => { const analysis = analyzeOrthogonalCase({ caseId }); setMassSnapshot({ caseId, run: analysis.massEnvelope, analysis, fingerprint: compositionFingerprint(analysis.massEnvelope.composition) }); setMessage(''); recordAction('fire', 'Case ideal-mass gate fired', `${scenario.formula} · same envelope for both candidates.`); };
  const choose = (key, value) => { setPrediction((current) => ({ ...current, [key]: value })); setMessage(''); recordAction('claim', 'Crossbar claim changed', `${key}: ${value}`); };
  const runCheck = () => {
    if (!nmrSnapshot || nmrStale || !massSnapshot || massStale) { setMessage('Open both the current NMR tape and current ideal-mass gate before checking the crossbar. Previous evidence stays preserved.'); return; }
    if (Object.values(prediction).some((value) => value === null)) { setMessage('Commit all five evidence claims. Existing answers were preserved.'); return; }
    const evaluation = evaluateOrthogonalCaseAttempt({ analysis: nmrSnapshot.analysis, prediction }); setCheck({ fingerprint: checkFp, evaluation }); setMessage(''); recordAction('check', 'Evidence crossbar audited', `${evaluation.score.correct}/5 claims match.`);
  };
  const revealHint = () => {
    const analysis = !nmrStale && nmrSnapshot ? nmrSnapshot.analysis : !massStale && massSnapshot ? massSnapshot.analysis : null;
    if (!analysis) { setMessage('Open one current evidence channel before requesting a hint.'); return; }
    const next = Math.min(4, hintLevel + 1); const value = nextOrthogonalCaseHint({ analysis, level: next }); setHintLevel(next); setHint(value); setMessage(''); recordAction('hint', `Crossbar hint ${next} opened`, value.mutation);
  };
  return <div className="ox-instrument"><CaseRail selectedId={caseId} onSelect={onChooseCase} /><section className="ox-case-mission"><div><span>{scenario.code} · DECLARED TWO-CANDIDATE CASE</span><strong>{scenario.name}</strong></div><p>{scenario.mission}</p><b>{scenario.formula}</b></section><div className="ox-case-stage"><aside className="ox-case-console ox-panel"><PanelHeading eyebrow="CANDIDATE + CHANNEL DESK" title="Open evidence yourself" badge="LEARNER OPERATED" /><div className="ox-candidate-pair">{candidates.map((candidate) => <button type="button" className={choiceClass(prediction.candidateId === candidate.id)} aria-pressed={prediction.candidateId === candidate.id} onClick={() => choose('candidateId', candidate.id)} key={candidate.id}><span>{candidate.name}</span><strong>{candidate.structure}</strong><small>{candidate.formula} · same inventory</small></button>)}</div><div className="ox-channel-buttons"><button type="button" className="nmr" onClick={releaseNmr}><i>δ</i><span><strong>Release unknown NMR tape</strong><small>measured source peak list</small></span></button><button type="button" className="mass" onClick={fireMass}><i>M</i><span><strong>Fire formula mass gate</strong><small>ideal isotope calculation</small></span></button></div><p className="ox-ir-ticket"><b>IR CHANNEL NOTE</b>{scenario.irRole}</p>{message && <p className="ox-message">{message}</p>}</aside><EvidenceCrossbar scenario={scenario} nmrOpen={Boolean(nmrSnapshot && !nmrStale)} massOpen={Boolean(massSnapshot && !massStale)} checked={Boolean(check && !checkStale)} /></div><div className="ox-case-evidence"><NmrTape snapshot={nmrSnapshot} selectedRecordId={scenario.unknownRecordId} cursorPpm={cursorPpm} anonymous onCursor={setCursorPpm} /><MassEnvelope snapshot={massSnapshot} stale={massStale} /></div><section className="ox-claim-lock ox-panel"><PanelHeading eyebrow="FIVE-CLAIM EVIDENCE LOCK" title="Make each channel earn its conclusion" badge="NO AUTO-DECISION" /><div className="ox-case-claims"><ClaimGroup label="Can formula decide this pair?" values={[[true, 'Formula decides'], [false, 'Formula leaves a tie']]} value={prediction.formulaSufficient} onChange={(value) => choose('formulaSufficient', value)} /><ClaimGroup label="What is the declared role of the independent IR evidence?" values={IR_ROLE_CHOICES} value={prediction.irRole} onChange={(value) => choose('irRole', value)} wide /><ClaimGroup label="Which measured proton-NMR feature separates this pair?" values={ORTHOGONAL_NMR_FEATURES.map((item) => [item.id, item.label])} value={prediction.nmrFeatureId} onChange={(value) => choose('nmrFeatureId', value)} wide /><ClaimGroup label="Can the ideal isotope envelope decide this pair?" values={[[true, 'Mass decides'], [false, 'Mass leaves a tie']]} value={prediction.massDiscriminates} onChange={(value) => choose('massDiscriminates', value)} /><ClaimGroup label="Which candidate is supported inside this declared pair?" values={candidates.map((item) => [item.id, item.name])} value={prediction.candidateId} onChange={(value) => choose('candidateId', value)} /></div><div className="ox-case-actions"><button type="button" onClick={runCheck}>Audit five claims</button><button type="button" onClick={revealHint}>Hint {Math.min(hintLevel + 1, 4)} / 4</button><button type="button" onClick={() => { setPrediction({ formulaSufficient: null, irRole: null, nmrFeatureId: null, massDiscriminates: null, candidateId: null }); setMessage(''); recordAction('clear', 'Crossbar claims cleared', 'Released evidence channels stayed unchanged.'); }}>Clear claims</button></div>{hint && <div className="ox-hint"><b>HINT {hint.level} · {hint.title}</b><p>{hint.detail}</p><small>{hint.mutation}</small></div>}</section><EvaluationCards snapshot={check} stale={checkStale} eyebrow="ORTHOGONAL CASE COMPARATOR" emptyTitle="Five reasons still shuttered" emptyBody="Open both evidence channels, commit all five claims, and audit. No learner answer is replaced." /></div>;
}

const TEACHER_CONTRASTS = [
  { code: 'SIGNAL ≠ PROTON', title: 'Environment count is not hydrogen count', body: 'Load 2-propanol and compare two reported signals with seven represented protons.', mode: 'nmr', target: '2-propanol-1h-nmr' },
  { code: 'MISSING ≠ ZERO', title: 'Unreported exchangeable H stays missing', body: 'Load 2-propanol and ask why the studio refuses to invent an O–H signal.', mode: 'nmr', target: '2-propanol-1h-nmr' },
  { code: 'FORMULA ≠ GRAPH', title: 'Atom inventory cannot encode connectivity', body: 'Load the propanol case before either evidence gate opens.', mode: 'casefile', target: 'propanol-topology' },
  { code: 'M+2 ≠ FRAGMENT', title: 'An isotope partner is not a fragment peak', body: 'Load one chlorine and keep the ideal-composition boundary visible.', mode: 'mass', target: 'chloropropane-formula' },
  { code: 'MASS ≠ ISOMER', title: 'Same formula means the ideal envelope ties', body: 'Load the carbonyl case and require another channel to decide the pair.', mode: 'casefile', target: 'carbonyl-terminus-orthogonal' },
  { code: 'PAIR ≠ IDENTITY', title: 'Pair support is not universal certification', body: 'Load the acid/ester case and ask what mixtures or other candidates remain excluded.', mode: 'casefile', target: 'acid-ester-orthogonal' },
];

function TeacherRail({ onLoad }) {
  return <section className="ox-teacher ox-panel"><PanelHeading eyebrow="TEACHER CONTRAST RAIL" title="Six distinctions students can test, not memorize" badge="LOAD · DO NOT RUN" /><div>{TEACHER_CONTRASTS.map((item) => <article key={item.code}><span>{item.code}</span><h3>{item.title}</h3><p>{item.body}</p><button type="button" onClick={() => onLoad(item)}>Load setup <b>→</b></button></article>)}</div></section>;
}

function ActionHistory({ entries }) {
  return <section className="ox-history ox-panel"><PanelHeading eyebrow="LEARNER ACTION REGISTER" title="Evidence opens only when you act" badge={`${entries.length} EVENTS`} /><div>{entries.length ? entries.map((entry) => <article className={entry.type} key={entry.id}><i /><span>{entry.type}</span><div><strong>{entry.title}</strong><small>{entry.detail}</small></div></article>) : <p>Record loads, releases, atom counts, tags, claims, audits, hints, and clears will appear here.</p>}</div></section>;
}

function OrthogonalPassport() {
  const passport = MODEL_PASSPORTS.orthogonalEvidenceStudio;
  return <section className="ox-passport"><header><div><span>MODEL + DATA PASSPORT</span><h2>Four channels. One honest boundary.</h2></div><strong>{passport.resultKind}</strong></header><div className="ox-data-notice"><span>ATTRIBUTED LOCAL DERIVATIVES · {ORTHOGONAL_DATA_NOTICE.date}</span><p>{ORTHOGONAL_DATA_NOTICE.statement} NMR-derived data retain separate terms documented in THIRD_PARTY_DATA.md.</p></div><div className="ox-passport-grid"><article><h3>CONDITIONS</h3>{passport.conditions.map((item) => <p key={item}><b>•</b>{item}</p>)}</article><article><h3>INCLUDES</h3>{passport.includes.map((item) => <p key={item}><b>+</b>{item}</p>)}</article><article><h3>EXCLUDES</h3>{passport.excludes.map((item) => <p key={item}><b>−</b>{item}</p>)}</article></div><div className="ox-boundary-grid">{Object.entries(ORTHOGONAL_EVIDENCE_BOUNDARY).map(([key, value]) => <article key={key}><span>{key}</span><p>{value}</p></article>)}</div><div className="ox-source-grid">{passport.sources.map((sourceId) => { const source = SCIENCE_SOURCES[sourceId]; return <a href={source.url} target="_blank" rel="noreferrer" key={source.id}><strong>{source.name}</strong><small>{source.role}</small><b>↗</b></a>; })}</div><footer><p><b>LEARNER INPUT</b>{passport.inputProvenance}</p><p><b>LOCAL CALCULATION + DATA</b>{passport.dataStatement}</p></footer></section>;
}

export default function OrthogonalEvidenceLab() {
  const [mode, setMode] = useState('nmr');
  const [recordId, setRecordId] = useState('2-propanol-1h-nmr');
  const [presetId, setPresetId] = useState('chloropropane-formula');
  const [caseId, setCaseId] = useState('propanol-topology');
  const [history, setHistory] = useState([]);
  const eventId = useRef(0);
  const recordAction = useCallback((type, title, detail) => { eventId.current += 1; setHistory((entries) => [{ id: eventId.current, type, title, detail }, ...entries].slice(0, 90)); }, []);
  const chooseMode = (next) => { setMode(next); recordAction('mode', 'Instrument changed', MODE_ITEMS.find((item) => item.id === next).label); };
  const chooseRecord = (next) => { setRecordId(next); recordAction('record', 'Measured NMR cartridge loaded', PROTON_NMR_RECORD_BY_ID[next].name); };
  const choosePreset = (next) => { setPresetId(next); recordAction('record', 'Mass formula preset loaded', MASS_EVIDENCE_PRESET_BY_ID[next].name); };
  const chooseCase = (next) => { setCaseId(next); recordAction('case', 'Evidence casefile loaded', ORTHOGONAL_EVIDENCE_CASE_BY_ID[next].name); };
  const loadTeacher = (item) => { setMode(item.mode); if (item.mode === 'nmr') setRecordId(item.target); else if (item.mode === 'mass') setPresetId(item.target); else setCaseId(item.target); recordAction('teacher', 'Teacher contrast loaded', `${item.code}: setup changed without release, firing, or checking.`); };
  const heroSignals = useMemo(() => [1.22, 4.04, 9.7], []);
  return <section className="orthogonal-evidence-lab" id="orthogonalEvidenceLab" aria-labelledby="orthogonalEvidenceLabTitle"><header className="ox-hero"><div><p className="section-code">19 / Orthogonal structure evidence</p><h2 id="orthogonalEvidenceLabTitle">A formula counts atoms. <em>A structure needs evidence that can disagree.</em></h2><p>Release six measured proton peak lists, build ideal H/C/O/Cl/Br isotope envelopes, and route formula, IR, NMR, and mass through three same-formula casefiles. You make every claim; the comparator only explains why it can or cannot hold.</p><div className="ox-hero-chips"><span>6 measured ¹H records</span><span>5 ideal formula presets</span><span>3 four-channel cases</span></div></div><HeroInstrument /><div className="ox-hero-signal-strip" aria-hidden="true">{heroSignals.map((ppm) => <i style={{ left: `${8 + ((12.5 - ppm) / 12.5) * 84}%` }} key={ppm} />)}<span>12.5 ppm</span><b>measured coordinates · calculated isotope envelope</b><span>0 ppm</span></div></header><ModeTabs mode={mode} onChange={chooseMode} /><div hidden={mode !== 'nmr'}><NmrInstrument recordId={recordId} onChooseRecord={chooseRecord} recordAction={recordAction} /></div><div hidden={mode !== 'mass'}><MassInstrument presetId={presetId} onChoosePreset={choosePreset} recordAction={recordAction} /></div><div hidden={mode !== 'casefile'}><CaseInstrument caseId={caseId} onChooseCase={chooseCase} recordAction={recordAction} /></div><div className="ox-bottom-grid"><TeacherRail onLoad={loadTeacher} /><ActionHistory entries={history} /></div><OrthogonalPassport /></section>;
}
