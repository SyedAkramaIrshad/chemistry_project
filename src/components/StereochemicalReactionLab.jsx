import { useMemo, useRef, useState } from 'react';
import {
  E2_STEREOCHEMISTRY_SCENARIOS,
  E2_STEREOCHEMISTRY_SCENARIO_BY_ID,
  MULTICENTRE_SCENARIOS,
  MULTICENTRE_SCENARIO_BY_ID,
  SN2_STEREOCHEMISTRY_SCENARIOS,
  SN2_STEREOCHEMISTRY_SCENARIO_BY_ID,
  STEREOCHEMICAL_REACTION_BOUNDARY,
} from '../data/stereochemicalReactionScenarios.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../data/scienceSources.js';
import {
  analyzeE2Stereo,
  analyzeMulticentreRelationship,
  analyzeSn2Stereo,
  commitE2Stereo,
  commitSn2Stereo,
  createE2StereoState,
  createMulticentreState,
  createSn2StereoState,
  evaluateE2Prediction,
  evaluateMulticentrePrediction,
  evaluateSn2Prediction,
  flipMulticentreDescriptor,
  nextE2StereoHint,
  nextMulticentreHint,
  nextSn2StereoHint,
  selectE2BetaHydrogen,
  setE2RearRotation,
  setSn2ApproachAngle,
} from '../chemistry/stereochemicalReactions.js';
import '../styles/stereochemical-reactions.css';

const MODES = [
  { id: 'relationship', code: 'REL', label: 'Relationship matrix', detail: 'same · enantiomer · diastereomer · meso' },
  { id: 'inversion', code: 'INV', label: 'Inversion tunnel', detail: 'backside geometry · Walden inversion · R/S' },
  { id: 'elimination', code: 'ELM', label: 'Elimination turnstile', detail: 'select Hβ · rotate · open E/Z frame' },
];

const RELATIONSHIP_PREDICTIONS = [
  { key: 'differingCentreCount', label: 'Displayed letters that differ', choices: [['0', '0'], ['1', '1'], ['2', '2']] },
  { key: 'relationship', label: 'Relationship', choices: [['same', 'Same'], ['enantiomers', 'Enantiomers'], ['diastereomers', 'Diastereomers']] },
  { key: 'chiralityPair', label: 'Chirality of A / B', choices: [['chiral|chiral', 'chiral / chiral'], ['chiral|achiral-meso', 'chiral / meso'], ['achiral-meso|chiral', 'meso / chiral'], ['achiral-meso|achiral-meso', 'meso / meso']] },
  { key: 'scope', label: 'What did the instrument classify?', choices: [['declared-two-centre', 'Declared 2-centre'], ['arbitrary-cip', 'Any molecule']] },
];

const SN2_PREDICTIONS = [
  { key: 'approachClass', label: 'Approach class', choices: [['frontside', 'Frontside'], ['oblique', 'Oblique'], ['backside-aligned', 'Backside']] },
  { key: 'productRelease', label: 'Product shutter', choices: [['released', 'Opens'], ['blocked', 'Stays shut']] },
  { key: 'geometryOutcome', label: 'Relative geometry', choices: [['inversion', 'Inversion'], ['retention', 'Retention']] },
  { key: 'descriptorRelation', label: 'Absolute R/S letter', choices: [['flips', 'Flips'], ['same', 'Stays same'], ['not-applicable', 'Not applicable']] },
];

const E2_PREDICTIONS = [
  { key: 'torsionRange', label: 'IUPAC torsion range', choices: [['not-selected', 'No H selected'], ['synperiplanar', 'Synperiplanar'], ['synclinal', 'Synclinal'], ['anticlinal', 'Anticlinal'], ['antiperiplanar', 'Antiperiplanar']] },
  { key: 'gatePermission', label: 'Geometry gate', choices: [['allowed', 'Open'], ['blocked', 'Blocked']] },
  { key: 'productResult', label: 'Released local frame', choices: [['E', 'E'], ['Z', 'Z'], ['no-product', 'No product']] },
  { key: 'scope', label: 'What does the gate prove?', choices: [['geometry-only', 'Geometry only'], ['rate-and-ratio', 'Rate + ratio']] },
];

const TEACHER_CONTRASTS = [
  { id: 'meso-difference', mode: 'relationship', scenarioId: 'symmetric-meso-pair', title: 'Two changed letters can still be one meso stereoisomer', left: 'R,S and S,R look different in an ordered letter comparison.', right: 'Declared internal symmetry can make the drawings superposable and achiral.', note: 'Develop the matrix only after learners predict both the letter count and molecular relationship.' },
  { id: 'enantio-diastereo', mode: 'relationship', scenarioId: 'unsymmetric-rr-sr', title: 'Enantiomer is not diastereomer', left: 'All applicable centres invert in the mirror-related pair.', right: 'A partial inversion gives a stereoisomer that is not the mirror partner.', note: 'Ask for the mirror test before naming the relationship.' },
  { id: 'geometry-descriptor', mode: 'inversion', scenarioId: 'priority-reordered-r-to-r', angleDeg: 180, title: 'Geometric inversion does not guarantee R ↔ S', left: 'The tetrahedral arrangement can invert.', right: 'A changed priority order can leave the absolute letter unchanged.', note: 'The cartridge is pre-aligned but remains unreleased.' },
  { id: 'specific-selective', mode: 'inversion', scenarioId: 'priority-preserved-r-to-s', angleDeg: 180, title: 'Stereospecific is not a synonym for 100% selective', left: 'Stereospecific describes mappings between stereoisomeric reactants and products.', right: 'Stereoselectivity describes preferential product formation and needs outcome evidence.', note: 'The theatre declares a map; it does not supply a measured product distribution.' },
  { id: 'anti-antiperiplanar', mode: 'elimination', scenarioId: 'rotate-to-anti', hydrogenId: 'h-z', rotationDeg: 0, title: 'Anti is broader than antiperiplanar', left: 'Anti is a broad relative-orientation label.', right: 'Antiperiplanar occupies the declared 150–180° torsion range.', note: 'The selected H begins synclinal; rotate it only when the class chooses to.' },
  { id: 'geometry-rate', mode: 'elimination', scenarioId: 'two-hydrogen-choice', hydrogenId: 'h-z', rotationDeg: 120, title: 'Geometry gate does not predict rate or product ratio', left: 'The selected channel can satisfy a local stereoelectronic prerequisite.', right: 'Rate, yield, occurrence, and product ratio require evidence outside this model.', note: 'The channel is pre-aligned but the product remains shuttered until explicit commit.' },
];

const emptyPrediction = (groups) => Object.fromEntries(groups.map(({ key }) => [key, null]));
const evaluationByKey = (evaluation) => Object.fromEntries((evaluation?.dimensions || []).map((dimension) => [dimension.key, dimension]));
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const signed = (value) => `${value > 0 ? '+' : ''}${Number(value).toFixed(Number.isInteger(value) ? 0 : 1)}°`;
const sameRelationshipDraft = (left, right) => left?.scenarioId === right?.scenarioId
  && left.specimenA.join('') === right.specimenA.join('')
  && left.specimenB.join('') === right.specimenB.join('');
const sameSn2Draft = (left, right) => left?.scenarioId === right?.scenarioId && left.approachAngleDeg === right.approachAngleDeg;
const sameE2Draft = (left, right) => left?.scenarioId === right?.scenarioId
  && left.rearRotationDeg === right.rearRotationDeg
  && left.selectedHydrogenId === right.selectedHydrogenId;

const relationshipModeState = (scenarioId) => ({
  scenarioId,
  draft: createMulticentreState(scenarioId),
  snapshot: null,
  prediction: emptyPrediction(RELATIONSHIP_PREDICTIONS),
  evaluation: null,
  hint: null,
  hintLevel: 0,
  feedback: '',
});

const sn2ModeState = (scenarioId, angleDeg = null) => {
  let draft = createSn2StereoState(scenarioId);
  if (angleDeg !== null) draft = setSn2ApproachAngle({ scenarioId, state: draft, angleDeg }).state;
  return { scenarioId, draft, snapshot: null, prediction: emptyPrediction(SN2_PREDICTIONS), evaluation: null, hint: null, hintLevel: 0, feedback: '' };
};

const e2ModeState = (scenarioId, hydrogenId = null, rotationDeg = null) => {
  let draft = createE2StereoState(scenarioId);
  if (hydrogenId) draft = selectE2BetaHydrogen({ scenarioId, state: draft, hydrogenId }).state;
  if (rotationDeg !== null && !E2_STEREOCHEMISTRY_SCENARIO_BY_ID[scenarioId].rotationLocked) {
    draft = setE2RearRotation({ scenarioId, state: draft, angleDeg: rotationDeg }).state;
  }
  return { scenarioId, draft, snapshot: null, prediction: emptyPrediction(E2_PREDICTIONS), evaluation: null, hint: null, hintLevel: 0, feedback: '' };
};

function HeroFilmstrip() {
  return (
    <div className="srt-hero-filmstrip" aria-hidden="true">
      <div className="srt-film-sprockets top" />
      <div className="srt-film-frame reactant">
        <span>01 / REACTANT</span>
        <svg viewBox="0 0 180 126"><g className="anaglyph cyan"><path d="M89 63L37 30M89 63l52-34M89 63l-4 52"/><circle cx="89" cy="63" r="17"/></g><g className="anaglyph magenta"><path d="M93 63L41 30M93 63l52-34M93 63l-4 52"/><circle cx="93" cy="63" r="17"/></g><text x="91" y="69">C*</text></svg>
      </div>
      <div className="srt-film-arrow">→</div>
      <div className="srt-film-frame gate"><span>02 / GEOMETRY GATE</span><div className="srt-aperture"><i /><b>?</b></div></div>
      <div className="srt-film-arrow">→</div>
      <div className="srt-film-frame product"><span>03 / PRODUCT</span><div className="srt-shutter"><i /><i /><i /><em>learner release</em></div></div>
      <div className="srt-film-sprockets bottom" />
    </div>
  );
}

function ModeTabs({ mode, onChange }) {
  return (
    <nav className="srt-mode-tabs" role="tablist" aria-label="Stereochemical reaction instruments">
      {MODES.map((item, index) => (
        <button
          type="button"
          role="tab"
          key={item.id}
          aria-label={`${item.label}: ${item.detail}`}
          aria-selected={mode === item.id}
          aria-controls={`srt-panel-${item.id}`}
          className={mode === item.id ? 'active' : ''}
          onClick={() => onChange(item.id)}
        >
          <i>{String(index + 1).padStart(2, '0')}</i><span><strong>{item.label}</strong><small>{item.detail}</small></span><b>{item.code}</b>
        </button>
      ))}
    </nav>
  );
}

function CartridgeSelect({ id, value, scenarios, onChange }) {
  return (
    <label className="srt-select" htmlFor={id}>
      <span>Teaching cartridge</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {scenarios.map((scenario) => <option value={scenario.id} key={scenario.id}>{scenario.code} · {scenario.label}</option>)}
      </select>
    </label>
  );
}

function PredictionRack({ groups, prediction, evaluation, onChoose }) {
  const dimensions = evaluationByKey(evaluation);
  return (
    <section className="srt-predictions" aria-label="Learner predictions">
      <header><span>CLAIM RACK</span><strong>Commit your reading</strong><small>Checking explains; it never changes your choices.</small></header>
      {groups.map((group) => (
        <fieldset key={group.key}>
          <legend>{group.label}</legend>
          <div>{group.choices.map(([value, label]) => {
            const selected = prediction[group.key] === value;
            const result = selected ? dimensions[group.key] : null;
            return <button type="button" key={value} aria-pressed={selected} className={[selected ? 'selected' : '', result?.correct === true ? 'correct' : '', result?.correct === false ? 'incorrect' : ''].filter(Boolean).join(' ')} onClick={() => onChoose(group.key, value)}>{label}</button>;
          })}</div>
          {dimensions[group.key] && <p className={dimensions[group.key].correct ? 'correct' : 'incorrect'}>{dimensions[group.key].reason}</p>}
        </fieldset>
      ))}
      {evaluation && <div className={`srt-score ${evaluation.allCorrect ? 'complete' : ''}`}><strong>{evaluation.correctCount}/{evaluation.totalCount}</strong><span>{evaluation.allCorrect ? 'All four claims resolve.' : 'Your selected claims remain. Revise only what you decide.'}</span></div>}
    </section>
  );
}

function InstrumentActions({ releaseLabel, released, onRelease, onCheck, onHint, onReset }) {
  return (
    <div className="srt-actions">
      <button type="button" className="release" onClick={onRelease}><span aria-hidden="true">▶</span>{releaseLabel}</button>
      <button type="button" disabled={!released} onClick={onCheck}>Check claims</button>
      <button type="button" disabled={!released} onClick={onHint}>One hint</button>
      <button type="button" onClick={onReset}>Reset cartridge</button>
    </div>
  );
}

function SnapshotStatus({ snapshot, stale, hint, feedback }) {
  return (
    <div className="srt-status-stack" aria-live="polite">
      {!snapshot && <p className="srt-status idle"><i />No frame released. Set geometry and predictions, then operate the shutter yourself.</p>}
      {snapshot && !stale && <p className={`srt-status ${snapshot.result.committed === false ? 'blocked' : 'fresh'}`}><i />{snapshot.result.committed === false ? 'Release refused — the exact reason is shown; no product was exposed.' : 'Released frame matches the current learner controls.'}</p>}
      {snapshot && stale && <p className="srt-status stale"><i />Draft changed — released frame is stale. The old frame stays visible until you release again.</p>}
      {feedback && <p className="srt-feedback"><b>Local response</b>{feedback}</p>}
      {hint && <p className="srt-hint"><b>Hint {hint.level}/4</b>{hint.text}<small>{hint.boundary}</small></p>}
    </div>
  );
}

function ProjectionCard({ specimen, descriptors, scenario, onFlip }) {
  const top = scenario.connectivityLabel.endsWith('Y') && specimen === 'B' ? 'Y' : 'X';
  return (
    <article className="srt-projection-card">
      <header><span>SPECIMEN {specimen}</span><strong>{descriptors.join(',')}</strong></header>
      <div className="srt-fischer">
        <b className="terminal top">{top}</b>
        <i className="vertical" />
        {descriptors.map((descriptor, index) => (
          <button type="button" key={scenario.centreLabels[index]} aria-label={`Flip specimen ${specimen} ${scenario.centreLabels[index]}, currently ${descriptor}`} onClick={() => onFlip(specimen, index)}>
            <span>{scenario.centreLabels[index]}</span><strong>{descriptor}</strong><i className="horizontal" /><em>flip</em>
          </button>
        ))}
        <b className="terminal bottom">{scenario.connectivityLabel.endsWith('Y') ? 'Y' : 'X'}</b>
      </div>
      <p>horizontal toward · vertical away</p>
    </article>
  );
}

function RelationshipStage({ scenario, draft, snapshot, onFlip }) {
  const result = snapshot?.result;
  return (
    <div className="srt-relationship-stage">
      <div className="srt-projection-pair">
        <ProjectionCard specimen="A" descriptors={draft.specimenA} scenario={scenario} onFlip={onFlip} />
        <div className="srt-mirror-prism" aria-hidden="true"><span>MIRROR<br />PRISM</span><i /><i /></div>
        <ProjectionCard specimen="B" descriptors={draft.specimenB} scenario={scenario} onFlip={onFlip} />
      </div>
      <div className={`srt-relationship-punch ${result ? 'developed' : 'shuttered'}`}>
        <span>RELATIONSHIP PUNCH CARD</span>
        {result ? <><strong>{result.relationship}</strong><div><b>{result.differingCentreCount}</b><small>displayed centre letters differ</small></div><p>{result.mirrorTest}</p></> : <><strong>?</strong><p>Develop the matrix to expose the relationship. The live projections do not name themselves.</p></>}
      </div>
      {result && <div className="srt-relationship-ledger">
        <article><span>ordered A / B</span><strong>{result.state.specimenA.join(',')} / {result.state.specimenB.join(',')}</strong><small>canonical: {result.canonicalA} / {result.canonicalB}</small></article>
        <article><span>chirality A / B</span><strong>{result.chiralityA}<br />{result.chiralityB}</strong><small>chirality is a whole-object mirror property</small></article>
        <article className={result.canonicalA === 'meso' && result.canonicalB === 'meso' ? 'meso' : ''}><span>symmetry beam</span><strong>{result.canonicalA === 'meso' && result.canonicalB === 'meso' ? 'two letters differ; one meso stereoisomer' : scenario.symmetricCentres ? 'declared symmetric positions' : 'centres are not equivalent'}</strong><small>{result.symmetryReason}</small></article>
      </div>}
    </div>
  );
}

function NumericAngle({ id, label, value, disabled = false, onChange }) {
  return (
    <div className="srt-angle-control">
      <label htmlFor={`${id}-range`}><span>{label}</span><strong>{signed(value)}</strong></label>
      <div>
        <input id={`${id}-range`} type="range" min="-180" max="180" step="1" disabled={disabled} value={value} onChange={(event) => onChange(Number(event.target.value))} />
        <label htmlFor={`${id}-number`}><span className="sr-only">Exact {label}</span><input id={`${id}-number`} type="number" min="-180" max="180" step="1" disabled={disabled} value={value} onChange={(event) => onChange(clamp(Number(event.target.value), -180, 180))} /><em>deg</em></label>
      </div>
    </div>
  );
}

function Sn2Tunnel({ scenario, draft, snapshot }) {
  const live = useMemo(() => analyzeSn2Stereo({ scenarioId: scenario.id, state: draft }), [scenario.id, draft]);
  const theta = live.approachAngleDeg * Math.PI / 180;
  const puck = { x: 250 + 120 * Math.cos(theta), y: 180 - 120 * Math.sin(theta) };
  const released = snapshot?.result;
  return (
    <div className="srt-sn2-stage">
      <div className="srt-sn2-optic">
        <svg viewBox="0 0 540 360" role="img" aria-label={`Nucleophile approach at ${live.approachAngleDeg} degrees; ${live.gateStatus}`}>
          <defs><radialGradient id="srtOrbitalGlow"><stop offset="0" stopColor="#f1d75a" stopOpacity=".8"/><stop offset="1" stopColor="#1db6c8" stopOpacity="0"/></radialGradient></defs>
          <circle className="orbital-glow" cx="250" cy="180" r="154" fill="url(#srtOrbitalGlow)" />
          <circle className="alignment-ring" cx="250" cy="180" r="120" />
          <path className="backside-sector" d="M118 131A140 140 0 0 0 118 229L168 211A86 86 0 0 1 168 149Z" />
          <path className="frontside-sector" d="M382 131A140 140 0 0 1 382 229L332 211A86 86 0 0 0 332 149Z" />
          <line className="axis" x1="72" y1="180" x2="468" y2="180" />
          <text className="axis-label" x="72" y="168">±180° BACKSIDE</text><text className="axis-label front" x="468" y="168" textAnchor="end">0° LG SIDE</text>
          <g className="tetra cyan"><path d="M248 180l-53-62M248 180l-20 86M248 180l48-42"/></g>
          <g className="tetra magenta"><path d="M254 180l-53-62M254 180l-20 86M254 180l48-42"/></g>
          <circle className="centre" cx="251" cy="180" r="25"/><text className="centre-label" x="251" y="187" textAnchor="middle">C*</text>
          <line className="leaving-bond" x1="276" y1="180" x2="414" y2="180"/><rect className="leaving-door" x="405" y="145" width="62" height="70" rx="7"/><text className="group-label" x="436" y="187" textAnchor="middle">LG</text>
          <line className={`incoming-trace ${live.gateStatus}`} x1={puck.x} y1={puck.y} x2="226" y2="180" />
          <g className={`nucleophile-puck ${live.gateStatus}`} transform={`translate(${puck.x} ${puck.y})`}><circle r="27"/><text x="0" y="6" textAnchor="middle">Nu:</text></g>
        </svg>
        <div className="srt-alignment-rail"><span>frontside</span><i><em style={{ width: `${live.alignmentIndex * 100}%` }} /></i><span>backside</span><strong>{live.alignmentIndex.toFixed(3)}</strong></div>
      </div>
      <div className="srt-three-frame">
        <article><span>REACTANT</span><strong>{scenario.initialDescriptor || 'no R/S'}</strong><p>{scenario.priorityRibbon.reactant.join(' › ')}</p></article>
        <article className={`gate ${released?.gateStatus || 'waiting'}`}><span>BACKSIDE APERTURE</span><strong>{released ? released.gateStatus : 'waiting'}</strong><p>{released ? released.gateReason : `${live.backsideDistanceDeg}° from the backside axis`}</p></article>
        <article className={`product ${released?.committed ? 'open' : 'shuttered'}`}><span>PRODUCT</span>{released?.product ? <><strong>{released.product.productDescriptor || 'no R/S'}</strong><p>relative geometry: inversion<br />absolute label: {released.product.descriptorRelation}</p></> : <><strong>—</strong><p>{released ? 'No product silhouette: this commit was blocked.' : 'Open the inversion shutter explicitly.'}</p></>}</article>
      </div>
      {released && <div className="srt-sn2-ledger"><div><span>approach</span><strong>{signed(released.approachAngleDeg)} · {released.approachClass}</strong></div><div><span>relative geometry</span><strong>{released.product ? 'inversion' : 'not released'}</strong></div><div><span>absolute descriptor</span><strong>{released.product ? `${released.initialDescriptor || 'n/a'} → ${released.productDescriptor || 'n/a'} · ${released.descriptorRelation}` : 'not released'}</strong></div><p>{released.reason}</p></div>}
    </div>
  );
}

const polar = (angleDeg, radius, centre = 190) => {
  const radians = (angleDeg - 90) * Math.PI / 180;
  return { x: centre + radius * Math.cos(radians), y: centre + radius * Math.sin(radians) };
};

function E2Turnstile({ scenario, draft, snapshot }) {
  const live = useMemo(() => analyzeE2Stereo({ scenarioId: scenario.id, state: draft }), [scenario.id, draft]);
  const released = snapshot?.result;
  return (
    <div className="srt-e2-stage">
      <div className="srt-newman-optic">
        <div className="srt-torsion-annulus"><span>syn</span><span>sc</span><span>ac</span><span>ap</span></div>
        <svg viewBox="0 0 380 380" role="img" aria-label={`Newman projection; ${live.selectedHydrogenLabel || 'no beta hydrogen selected'}; ${live.iupacRange}`}>
          <circle className="anti-gate" cx="190" cy="190" r="156" pathLength="100" />
          {scenario.rearGroups.map((group) => {
            const angle = group.offsetDeg + draft.rearRotationDeg;
            const start = polar(angle, 40);
            const end = polar(angle, 132);
            const selected = group.id === draft.selectedHydrogenId;
            return <g className={`rear-group ${selected ? 'selected' : ''}`} key={group.id}><line x1={start.x} y1={start.y} x2={end.x} y2={end.y}/><circle cx={end.x} cy={end.y} r={selected ? 25 : 20}/><text x={end.x} y={end.y + 5} textAnchor="middle">{group.label}</text></g>;
          })}
          <circle className="rear-carbon" cx="190" cy="190" r="42"/>
          {scenario.frontGroups.map((group) => {
            const end = polar(group.angleDeg, 119);
            return <g className={`front-group ${group.id === 'LG' ? 'leaving' : ''}`} key={group.id}><line x1="190" y1="190" x2={end.x} y2={end.y}/><circle cx={end.x} cy={end.y} r={group.id === 'LG' ? 25 : 20}/><text x={end.x} y={end.y + 5} textAnchor="middle">{group.label}</text></g>;
          })}
          <circle className="front-carbon" cx="190" cy="190" r="13"/><text className="carbon-label" x="190" y="195" textAnchor="middle">C</text>
          {live.selectedHydrogenId && <line className={`sightline ${live.gateStatus}`} x1={polar(live.torsionAngleDeg, 132).x} y1={polar(live.torsionAngleDeg, 132).y} x2={polar(0, 119).x} y2={polar(0, 119).y}/>} 
        </svg>
        <div className="srt-torsion-register"><span>H–C–C–LG torsion</span><strong>{live.torsionAngleDeg === null ? 'select Hβ' : signed(live.torsionAngleDeg)}</strong><b>{live.iupacRange}</b><small>{live.distanceToAntiperiplanarDeg === null ? 'No angular gate evaluated.' : `${live.distanceToAntiperiplanarDeg}° from antiperiplanar · alignment ${live.alignmentIndex.toFixed(3)}`}</small></div>
      </div>
      <div className={`srt-electron-ribbons ${released?.committed ? 'lit' : ''}`}>
        {scenario.electronRibbons.map((label, index) => <div key={label}><span>{String(index + 1).padStart(2, '0')}</span><i /><strong>{label}</strong></div>)}
        <p>{released?.committed ? 'Three pair movements illuminate together for the released declared E2 frame.' : 'All three ribbons remain dark until one allowed explicit commit.'}</p>
      </div>
      <div className={`srt-e2-product ${released?.committed ? 'open' : 'shuttered'}`}>
        <span>DECLARED LOCAL PRODUCT FRAME</span>
        {released?.product ? <><strong>{released.product.productDescriptor}</strong><b>{released.product.productNotation}</b><p>{released.reason}</p></> : <><strong>—</strong><b>shutter closed</b><p>{released ? released.reason : 'Select a beta H, choose a conformation, then commit.'}</p></>}
      </div>
    </div>
  );
}

function RailHeading({ code, title, children }) {
  return <header className="srt-rail-heading"><span>{code}</span><strong>{title}</strong><p>{children}</p></header>;
}

function RelationshipInstrument({ state, setState, loadScenario, recordAction }) {
  const scenario = MULTICENTRE_SCENARIO_BY_ID[state.scenarioId];
  const stale = Boolean(state.snapshot && !sameRelationshipDraft(state.draft, state.snapshot.draft));
  const flip = (specimen, centreIndex) => {
    const changed = flipMulticentreDescriptor({ scenarioId: state.scenarioId, state: state.draft, specimen, centreIndex });
    if (!changed.allowed) return setState((previous) => ({ ...previous, feedback: changed.reason }));
    setState((previous) => ({ ...previous, draft: changed.state, evaluation: null, hint: null, feedback: changed.reason }));
    recordAction(`Flipped specimen ${specimen} ${scenario.centreLabels[centreIndex]}; released frame, if any, was retained.`);
  };
  const predict = (key, value) => setState((previous) => ({ ...previous, prediction: { ...previous.prediction, [key]: value }, evaluation: null }));
  const release = () => {
    const result = analyzeMulticentreRelationship({ scenarioId: state.scenarioId, state: state.draft });
    setState((previous) => ({ ...previous, snapshot: { draft: previous.draft, result }, evaluation: null, hint: null, hintLevel: 0, feedback: 'Relationship matrix developed from the current declared configurations.' }));
    recordAction(`Developed ${scenario.code}: ${result.relationship}, with ${result.differingCentreCount} displayed letter changes.`);
  };
  const check = () => {
    if (!state.snapshot) return;
    const evaluation = evaluateMulticentrePrediction({ analysis: state.snapshot.result, prediction: state.prediction });
    setState((previous) => ({ ...previous, evaluation }));
    recordAction(`Checked relationship claims: ${evaluation.correctCount}/4.`);
  };
  const hint = () => {
    if (!state.snapshot) return;
    const level = Math.min(4, state.hintLevel + 1);
    const nextHint = nextMulticentreHint({ analysis: state.snapshot.result, level });
    setState((previous) => ({ ...previous, hintLevel: level, hint: nextHint }));
    recordAction(`Opened relationship hint ${level}.`);
  };
  return (
    <div className="srt-instrument relationship" id="srt-panel-relationship" role="tabpanel">
      <aside className="srt-control-rail">
        <RailHeading code="REL / TWO-CENTRE MATRIX" title={scenario.label}>{scenario.teachingContrast}</RailHeading>
        <CartridgeSelect id="srtRelationshipCartridge" value={state.scenarioId} scenarios={MULTICENTRE_SCENARIOS} onChange={loadScenario} />
        <div className="srt-centre-flips"><span>Direct centre controls</span>{['A', 'B'].map((specimen) => [0, 1].map((centreIndex) => <button type="button" key={`${specimen}-${centreIndex}`} onClick={() => flip(specimen, centreIndex)}><small>{specimen} · {scenario.centreLabels[centreIndex]}</small><strong>{state.draft[specimen === 'A' ? 'specimenA' : 'specimenB'][centreIndex]}</strong><em>flip</em></button>))}</div>
        <PredictionRack groups={RELATIONSHIP_PREDICTIONS} prediction={state.prediction} evaluation={state.evaluation} onChoose={predict} />
        <InstrumentActions releaseLabel="Develop relationship matrix" released={Boolean(state.snapshot)} onRelease={release} onCheck={check} onHint={hint} onReset={() => loadScenario(state.scenarioId, true)} />
      </aside>
      <main className="srt-stage">
        <SnapshotStatus snapshot={state.snapshot} stale={stale} hint={state.hint} feedback={state.feedback} />
        <RelationshipStage scenario={scenario} draft={state.draft} snapshot={state.snapshot} onFlip={flip} />
      </main>
    </div>
  );
}

function Sn2Instrument({ state, setState, loadScenario, recordAction }) {
  const scenario = SN2_STEREOCHEMISTRY_SCENARIO_BY_ID[state.scenarioId];
  const stale = Boolean(state.snapshot && !sameSn2Draft(state.draft, state.snapshot.draft));
  const setAngle = (angleDeg, named = false) => {
    const changed = setSn2ApproachAngle({ scenarioId: state.scenarioId, state: state.draft, angleDeg });
    if (!changed.allowed) return setState((previous) => ({ ...previous, feedback: changed.reason }));
    setState((previous) => ({ ...previous, draft: changed.state, evaluation: null, hint: null, feedback: named ? changed.reason : '' }));
    if (named) recordAction(`Moved the incoming puck to ${signed(changed.state.approachAngleDeg)}; no product released.`);
  };
  const predict = (key, value) => setState((previous) => ({ ...previous, prediction: { ...previous.prediction, [key]: value }, evaluation: null }));
  const release = () => {
    const result = commitSn2Stereo({ scenarioId: state.scenarioId, state: state.draft });
    setState((previous) => ({ ...previous, snapshot: { draft: previous.draft, result }, evaluation: null, hint: null, hintLevel: 0, feedback: result.reason }));
    recordAction(result.committed ? `Opened ${scenario.code} at ${signed(result.approachAngleDeg)}; inversion frame released.` : `Pressed ${scenario.code} shutter at ${signed(result.approachAngleDeg)}; blocked with no product.`);
  };
  const check = () => {
    if (!state.snapshot) return;
    const evaluation = evaluateSn2Prediction({ analysis: state.snapshot.result, prediction: state.prediction });
    setState((previous) => ({ ...previous, evaluation }));
    recordAction(`Checked inversion claims: ${evaluation.correctCount}/4.`);
  };
  const hint = () => {
    if (!state.snapshot) return;
    const level = Math.min(4, state.hintLevel + 1);
    const nextHint = nextSn2StereoHint({ analysis: state.snapshot.result, level });
    setState((previous) => ({ ...previous, hintLevel: level, hint: nextHint }));
    recordAction(`Opened inversion hint ${level}.`);
  };
  return (
    <div className="srt-instrument inversion" id="srt-panel-inversion" role="tabpanel">
      <aside className="srt-control-rail">
        <RailHeading code="INV / BACKSIDE APERTURE" title={scenario.label}>{scenario.descriptorReason}</RailHeading>
        <CartridgeSelect id="srtSn2Cartridge" value={state.scenarioId} scenarios={SN2_STEREOCHEMISTRY_SCENARIOS} onChange={loadScenario} />
        <NumericAngle id="srtSn2Approach" label="Nucleophile approach" value={state.draft.approachAngleDeg} onChange={setAngle} />
        <div className="srt-snap-row" aria-label="Approach angle stations">{[0, 90, 165, 180].map((angle) => <button type="button" key={angle} aria-pressed={state.draft.approachAngleDeg === angle} onClick={() => setAngle(angle, true)}>{angle}°</button>)}</div>
        <PredictionRack groups={SN2_PREDICTIONS} prediction={state.prediction} evaluation={state.evaluation} onChoose={predict} />
        <InstrumentActions releaseLabel="Open inversion shutter" released={Boolean(state.snapshot)} onRelease={release} onCheck={check} onHint={hint} onReset={() => loadScenario(state.scenarioId, true)} />
      </aside>
      <main className="srt-stage">
        <SnapshotStatus snapshot={state.snapshot} stale={stale} hint={state.hint} feedback={state.feedback} />
        <Sn2Tunnel scenario={scenario} draft={state.draft} snapshot={state.snapshot} />
      </main>
    </div>
  );
}

function E2Instrument({ state, setState, loadScenario, recordAction }) {
  const scenario = E2_STEREOCHEMISTRY_SCENARIO_BY_ID[state.scenarioId];
  const stale = Boolean(state.snapshot && !sameE2Draft(state.draft, state.snapshot.draft));
  const selectHydrogen = (hydrogenId) => {
    const changed = selectE2BetaHydrogen({ scenarioId: state.scenarioId, state: state.draft, hydrogenId });
    if (!changed.allowed) return setState((previous) => ({ ...previous, feedback: changed.reason }));
    setState((previous) => ({ ...previous, draft: changed.state, evaluation: null, hint: null, feedback: changed.reason }));
    recordAction(`${scenario.channels.find(({ id }) => id === hydrogenId).label} selected; rear rotation stayed ${signed(changed.state.rearRotationDeg)}.`);
  };
  const setRotation = (angleDeg, named = false) => {
    const changed = setE2RearRotation({ scenarioId: state.scenarioId, state: state.draft, angleDeg });
    if (!changed.allowed) {
      setState((previous) => ({ ...previous, feedback: changed.reason }));
      if (named) recordAction(`Rotation refused: ${changed.reason}`);
      return;
    }
    setState((previous) => ({ ...previous, draft: changed.state, evaluation: null, hint: null, feedback: named ? changed.reason : '' }));
    if (named) recordAction(`Rear carbon rotated to ${signed(changed.state.rearRotationDeg)}; selected H preserved.`);
  };
  const predict = (key, value) => setState((previous) => ({ ...previous, prediction: { ...previous.prediction, [key]: value }, evaluation: null }));
  const release = () => {
    const result = commitE2Stereo({ scenarioId: state.scenarioId, state: state.draft });
    setState((previous) => ({ ...previous, snapshot: { draft: previous.draft, result }, evaluation: null, hint: null, hintLevel: 0, feedback: result.reason }));
    recordAction(result.committed ? `Committed ${scenario.code}; local ${result.product.productDescriptor} frame released.` : `Pressed ${scenario.code} turnstile; blocked with no product.`);
  };
  const check = () => {
    if (!state.snapshot) return;
    const evaluation = evaluateE2Prediction({ analysis: state.snapshot.result, prediction: state.prediction });
    setState((previous) => ({ ...previous, evaluation }));
    recordAction(`Checked elimination claims: ${evaluation.correctCount}/4.`);
  };
  const hint = () => {
    if (!state.snapshot) return;
    const level = Math.min(4, state.hintLevel + 1);
    const nextHint = nextE2StereoHint({ analysis: state.snapshot.result, level });
    setState((previous) => ({ ...previous, hintLevel: level, hint: nextHint }));
    recordAction(`Opened elimination hint ${level}.`);
  };
  return (
    <div className="srt-instrument elimination" id="srt-panel-elimination" role="tabpanel">
      <aside className="srt-control-rail">
        <RailHeading code="ELM / ANTIPERIPLANAR TURNSTILE" title={scenario.label}>{scenario.teachingContrast}</RailHeading>
        <CartridgeSelect id="srtE2Cartridge" value={state.scenarioId} scenarios={E2_STEREOCHEMISTRY_SCENARIOS} onChange={loadScenario} />
        <fieldset className="srt-hydrogen-selector"><legend>Choose one beta hydrogen</legend><div>{scenario.channels.map((channel) => <button type="button" key={channel.id} aria-pressed={state.draft.selectedHydrogenId === channel.id} className={state.draft.selectedHydrogenId === channel.id ? 'selected' : ''} onClick={() => selectHydrogen(channel.id)}><strong>{channel.label}</strong><small>{channel.offsetDeg}° offset · local {channel.productDescriptor}</small></button>)}</div></fieldset>
        <NumericAngle id="srtE2Rotation" label="Rear-carbon rotation" disabled={scenario.rotationLocked} value={state.draft.rearRotationDeg} onChange={setRotation} />
        <div className="srt-snap-row" aria-label="Rear-carbon rotation stations">{[0, 60, 120, 180].map((angle) => <button type="button" disabled={scenario.rotationLocked} key={angle} aria-pressed={state.draft.rearRotationDeg === angle} onClick={() => setRotation(angle, true)}>{angle}°</button>)}</div>
        {scenario.rotationLocked && <p className="srt-lock-note"><span aria-hidden="true">⌁</span>{scenario.lockedReason}</p>}
        <PredictionRack groups={E2_PREDICTIONS} prediction={state.prediction} evaluation={state.evaluation} onChoose={predict} />
        <InstrumentActions releaseLabel="Commit elimination frame" released={Boolean(state.snapshot)} onRelease={release} onCheck={check} onHint={hint} onReset={() => loadScenario(state.scenarioId, true)} />
      </aside>
      <main className="srt-stage">
        <SnapshotStatus snapshot={state.snapshot} stale={stale} hint={state.hint} feedback={state.feedback} />
        <E2Turnstile scenario={scenario} draft={state.draft} snapshot={state.snapshot} />
      </main>
    </div>
  );
}

function TeacherDeck({ onLoad }) {
  return (
    <section className="srt-teacher-deck">
      <header><span>TEACHER / CONTRAST DECK</span><strong>Similar drawings. Different claims.</strong><p>Each card loads a draft for discussion. It never develops, opens, commits, checks, or repairs anything.</p></header>
      <div>{TEACHER_CONTRASTS.map((card, index) => <article key={card.id}><span>{String(index + 1).padStart(2, '0')} · {card.mode}</span><h3>{card.title}</h3><dl><div><dt>A</dt><dd>{card.left}</dd></div><div><dt>B</dt><dd>{card.right}</dd></div></dl><p>{card.note}</p><button type="button" onClick={() => onLoad(card)}>Load contrast — do not run</button></article>)}</div>
    </section>
  );
}

function ActionFilm({ entries }) {
  return (
    <aside className="srt-action-film">
      <header><span>LEARNER / ACTION FILM</span><strong>No hidden cuts</strong><p>Latest twelve consequential actions; rapid loads receive unique frame numbers before React queues them.</p></header>
      {entries.length ? <ol>{entries.map((entry) => <li key={entry.id}><b>{String(entry.id).padStart(3, '0')}</b><i /><span>{entry.message}</span></li>)}</ol> : <p className="empty">No actions recorded. Every instrument is waiting for you.</p>}
    </aside>
  );
}

function ModelPassport() {
  const passport = MODEL_PASSPORTS.stereochemicalReactionTheatre;
  return (
    <aside className="srt-passport">
      <header><span>MODEL + SOURCE PASSPORT</span><h3>{passport.name}</h3><strong>{passport.resultKind}</strong></header>
      <div className="srt-passport-summary"><p>{passport.inputProvenance}</p><p>{passport.dataStatement}</p><p><b>Boundary:</b> {STEREOCHEMICAL_REACTION_BOUNDARY.excluded}</p></div>
      <div className="srt-passport-columns"><details open><summary>Included teaching operations <span>{passport.includes.length}</span></summary>{passport.includes.map((item) => <p key={item}>{item}</p>)}</details><details><summary>Conspicuously not included <span>{passport.excludes.length}</span></summary>{passport.excludes.map((item) => <p key={item}>{item}</p>)}</details></div>
      <details className="srt-source-tape"><summary>Open primary reference tape <span>{passport.sources.length} links</span></summary><div>{passport.sources.map((sourceId) => { const source = SCIENCE_SOURCES[sourceId]; return <a href={source.url} target="_blank" rel="noreferrer" key={source.id}><span>{source.name}</span><small>{source.role}</small><b aria-hidden="true">↗</b></a>; })}</div></details>
    </aside>
  );
}

export default function StereochemicalReactionLab() {
  const [mode, setMode] = useState('relationship');
  const [relationship, setRelationship] = useState(() => relationshipModeState('symmetric-rr-ss'));
  const [inversion, setInversion] = useState(() => sn2ModeState('priority-preserved-r-to-s'));
  const [elimination, setElimination] = useState(() => e2ModeState('two-hydrogen-choice'));
  const [history, setHistory] = useState([]);
  const actionCounter = useRef(0);

  const recordAction = (message) => {
    const id = actionCounter.current + 1;
    actionCounter.current = id;
    setHistory((previous) => [{ id, message }, ...previous].slice(0, 12));
  };

  const loadRelationship = (scenarioId, reset = false) => {
    const scenario = MULTICENTRE_SCENARIO_BY_ID[scenarioId];
    setRelationship(relationshipModeState(scenarioId));
    recordAction(`${reset ? 'Reset' : 'Loaded'} ${scenario.code}; relationship frame remains unreleased.`);
  };
  const loadInversion = (scenarioId, reset = false) => {
    const scenario = SN2_STEREOCHEMISTRY_SCENARIO_BY_ID[scenarioId];
    setInversion(sn2ModeState(scenarioId));
    recordAction(`${reset ? 'Reset' : 'Loaded'} ${scenario.code}; inversion frame remains unreleased.`);
  };
  const loadElimination = (scenarioId, reset = false) => {
    const scenario = E2_STEREOCHEMISTRY_SCENARIO_BY_ID[scenarioId];
    setElimination(e2ModeState(scenarioId));
    recordAction(`${reset ? 'Reset' : 'Loaded'} ${scenario.code}; elimination frame remains unreleased.`);
  };
  const changeMode = (nextMode) => {
    setMode(nextMode);
    recordAction(`Switched to ${MODES.find(({ id }) => id === nextMode).label}; all instrument drafts and releases were preserved.`);
  };
  const loadTeacher = (card) => {
    setMode(card.mode);
    if (card.mode === 'relationship') setRelationship(relationshipModeState(card.scenarioId));
    if (card.mode === 'inversion') setInversion(sn2ModeState(card.scenarioId, card.angleDeg));
    if (card.mode === 'elimination') setElimination(e2ModeState(card.scenarioId, card.hydrogenId, card.rotationDeg));
    recordAction(`Teacher contrast loaded: ${card.title}. Draft visible; no result released.`);
  };

  return (
    <section className="stereochemical-reaction-lab" id="stereochemicalReactionLab" aria-labelledby="stereochemicalReactionLabTitle">
      <header className="srt-hero">
        <div className="srt-hero-copy"><p className="section-code">27 / Stereochemical reaction trajectories</p><h2 id="stereochemicalReactionLabTitle">Mechanisms move electrons. <em>Stereochemistry remembers where every group went.</em></h2><p>Carry declared spatial information through a mirror comparison, a backside inversion, or an antiperiplanar elimination. If a frame cannot open, the theatre tells you exactly why—and leaves your experiment untouched.</p><div><span>2-centre relationships</span><span>backside inversion</span><span>anti-periplanar E2</span></div></div>
        <HeroFilmstrip />
      </header>
      <ModeTabs mode={mode} onChange={changeMode} />
      <p className="sr-only" aria-live="polite">Active stereochemical reaction instrument: {MODES.find(({ id }) => id === mode).label}</p>
      <div hidden={mode !== 'relationship'}><RelationshipInstrument state={relationship} setState={setRelationship} loadScenario={loadRelationship} recordAction={recordAction} /></div>
      <div hidden={mode !== 'inversion'}><Sn2Instrument state={inversion} setState={setInversion} loadScenario={loadInversion} recordAction={recordAction} /></div>
      <div hidden={mode !== 'elimination'}><E2Instrument state={elimination} setState={setElimination} loadScenario={loadElimination} recordAction={recordAction} /></div>
      <div className="srt-bottom-grid"><TeacherDeck onLoad={loadTeacher} /><ActionFilm entries={history} /></div>
      <ModelPassport />
    </section>
  );
}
