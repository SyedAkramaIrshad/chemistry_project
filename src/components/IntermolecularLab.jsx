import { useMemo, useState } from 'react';
import {
  INTERACTION_ENTITIES,
  INTERACTION_FAMILIES,
  INTERACTION_PAIR_SCENARIOS,
  INTERACTION_PAIR_BY_ID,
  INTERMOLECULAR_MODEL_BOUNDARY,
  SOLVATION_SHELL_SCENARIOS,
  SOLVATION_SHELL_BY_ID,
} from '../data/intermolecularScenarios.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../data/scienceSources.js';
import {
  analyzePairInteraction,
  analyzeSolvationShell,
  attemptPairInteraction,
  breakPairInteraction,
  createPairAlignmentReference,
  createPairInteractionState,
  createSolvationReference,
  createSolvationShellState,
  evaluatePairPrediction,
  evaluateSolvationPrediction,
  nextPairInteractionHint,
  nextSolvationHint,
  rotatePairEntity,
  selectPairSite,
  toggleWaterCompass,
} from '../chemistry/intermolecularInteractions.js';
import '../styles/intermolecular.css';

let interactionActivityId = 0;
const activity = (kind, title, detail) => ({
  id: `interaction-${Date.now()}-${++interactionActivityId}`,
  kind,
  title,
  detail,
});

const titleCase = (value) => value.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
const selectedClass = (selected) => (selected ? 'selected' : '');

function PanelHeading({ eyebrow, title, children }) {
  return <div className="interaction-panel-heading"><div><span>{eyebrow}</span><strong>{title}</strong></div>{children}</div>;
}

function Feedback({ feedback }) {
  return <div className={`interaction-feedback ${feedback.tone}`} aria-live="polite"><i/><div><strong>{feedback.title}</strong><p>{feedback.detail}</p></div></div>;
}

function Dimension({ label, result }) {
  return <div className={result ? (result.correct ? 'correct' : 'incorrect') : ''}><span>{label}</span><strong>{result ? (result.correct ? 'matches' : 'inspect') : 'waiting'}</strong>{result && <p>{result.reason}</p>}</div>;
}

function ScenarioRail({ scenarioId, onSelect }) {
  return <aside className="interaction-scenarios interaction-panel"><PanelHeading eyebrow="Pair library · six declared docks" title="Choose two entities, then test the contact"/><div className="interaction-scenario-scroll">{INTERACTION_PAIR_SCENARIOS.map((scenario) => {
    const entityA = INTERACTION_ENTITIES[scenario.entityAId];
    const entityB = INTERACTION_ENTITIES[scenario.entityBId];
    const family = INTERACTION_FAMILIES[scenario.focusFamilyId];
    return <button type="button" className={selectedClass(scenario.id === scenarioId)} aria-pressed={scenario.id === scenarioId} onClick={() => onSelect(scenario.id)} key={scenario.id} style={{ '--scenario-accent': family.accent }}><i/><span><strong>{entityA.formula} <b>↔</b> {entityB.formula}</strong><small>{scenario.name}</small></span><em>{scenario.familiesPresent.length} famil{scenario.familiesPresent.length === 1 ? 'y' : 'ies'}</em><p>{family.name}</p></button>;
  })}</div><p className="interaction-rail-note">A card’s accent marks the contact exercise—not the pair’s only possible interaction family.</p></aside>;
}

const atomClass = (element) => element === 'group' ? 'group' : element.toLowerCase();
const siteGlyph = (site) => ({
  'polarizable-cloud': 'δ(t)',
  'partial-positive': 'δ+',
  'partial-negative': 'δ−',
  'donor-hydrogen': 'H',
  'acceptor-region': ':',
  cation: '+',
  anion: '−',
}[site.role]);

const rotatePoint = (point, angleDeg) => {
  const radians = angleDeg * Math.PI / 180;
  const dx = point.x - 110;
  const dy = point.y - 110;
  return {
    x: 110 + dx * Math.cos(radians) - dy * Math.sin(radians),
    y: 110 + dx * Math.sin(radians) + dy * Math.cos(radians),
  };
};

function BondGraphic({ entity, bond }) {
  const atomA = entity.atoms.find((atom) => atom.id === bond.a);
  const atomB = entity.atoms.find((atom) => atom.id === bond.b);
  const dx = atomB.x - atomA.x;
  const dy = atomB.y - atomA.y;
  const length = Math.hypot(dx, dy) || 1;
  const perpendicular = { x: -dy / length * 3.5, y: dx / length * 3.5 };
  const offsets = bond.order === 2 ? [-1, 1] : [0];
  return <>{offsets.map((offset) => <line key={offset} x1={atomA.x + perpendicular.x * offset} y1={atomA.y + perpendicular.y * offset} x2={atomB.x + perpendicular.x * offset} y2={atomB.y + perpendicular.y * offset}/>)}</>;
}

function EntityRotor({ entityKey, entity, rotationDeg, selectedSiteId, bridgeSiteId, onRotate, onCommitRotation, onSelectSite }) {
  const nameId = `interactionEntity${entityKey.toUpperCase()}`;
  const positionedSites = entity.sites.map((site) => ({ site, point: rotatePoint(site, rotationDeg) }));
  return <section className={`interaction-entity interaction-entity-${entityKey}`} aria-labelledby={nameId}>
    <div className="interaction-entity-title"><span>entity {entityKey.toUpperCase()}</span><strong id={nameId}>{entity.formula}</strong><small>{entity.name}</small></div>
    <div className={`interaction-rotor ${entity.permanentDipole ? 'polar' : ''} ${entity.netCharge ? 'ionic' : ''}`}>
      <svg viewBox="0 0 220 220" role="img" aria-label={`${entity.name}, rotated ${rotationDeg} degrees, with selectable interaction sites`}>
        <defs><radialGradient id={`interactionRotorGlow${entityKey}`}><stop offset="0" stopColor="rgba(101,214,173,.16)"/><stop offset="1" stopColor="rgba(88,199,255,0)"/></radialGradient></defs>
        <circle className="interaction-rotor-orbit" cx="110" cy="110" r="99"/>
        <circle className="interaction-rotor-glow" cx="110" cy="110" r="86" fill={`url(#interactionRotorGlow${entityKey})`}/>
        <g className="interaction-molecule" transform={`rotate(${rotationDeg} 110 110)`}>
          <g className="interaction-bonds">{entity.bonds.map((bond) => <BondGraphic entity={entity} bond={bond} key={bond.id}/>)}</g>
          {entity.atoms.map((atom) => <g className={`interaction-atom ${atomClass(atom.element)}`} transform={`translate(${atom.x} ${atom.y})`} key={atom.id}>{atom.element === 'group' ? <rect x="-25" y="-19" width="50" height="38" rx="16"/> : <circle r={atom.element === 'H' ? 18 : atom.element === 'Na' || atom.element === 'Cl' ? 28 : 24}/>}<text textAnchor="middle" dy="6">{atom.label}</text>{atom.partialCharge && <text className={`interaction-partial ${atom.partialCharge}`} x="21" y="-18">{atom.partialCharge === 'positive' ? 'δ+' : 'δ−'}</text>}</g>)}
        </g>
        <g className="interaction-facing-mark"><path d={entityKey === 'a' ? 'M176 197H208M199 188L208 197L199 206' : 'M44 197H12M21 188L12 197L21 206'}/><text x={entityKey === 'a' ? 145 : 75} y="202" textAnchor="middle">faces {entityKey === 'a' ? 'right' : 'left'}</text></g>
      </svg>
      {positionedSites.map(({ site, point }) => {
        const selected = selectedSiteId === site.id;
        const bridged = bridgeSiteId === site.id;
        return <button type="button" className={`interaction-site-button role-${site.role} ${selected ? 'selected' : ''} ${bridged ? 'bridged' : ''}`} style={{ left: `${point.x / 2.2}%`, top: `${point.y / 2.2}%` }} aria-label={`${selected ? 'Deselect' : 'Select'} ${site.label} on ${entity.name}`} aria-pressed={selected} onClick={() => onSelectSite(site.id)} key={site.id}><span>{siteGlyph(site)}</span></button>;
      })}
    </div>
    <div className="interaction-rotation"><div><span>rotor angle</span><strong>{rotationDeg}°</strong></div><div className="interaction-rotation-controls"><button type="button" aria-label={`Rotate ${entity.name} counterclockwise 15 degrees`} onClick={() => onRotate(rotationDeg - 15, true)}>−15°</button><input type="range" min="-180" max="180" step="1" value={rotationDeg} aria-label={`${entity.name} rotation`} onChange={(event) => onRotate(Number(event.target.value), false)} onPointerUp={onCommitRotation}/><input type="number" min="-180" max="180" step="1" value={rotationDeg} aria-label={`Exact ${entity.name} rotation`} onChange={(event) => onRotate(Number(event.target.value), true)}/><button type="button" aria-label={`Rotate ${entity.name} clockwise 15 degrees`} onClick={() => onRotate(rotationDeg + 15, true)}>+15°</button></div></div>
    <p className="interaction-entity-boundary">{entity.boundary}</p>
  </section>;
}

function BridgeScope({ analysis }) {
  const bridge = analysis.bridge;
  const family = bridge.record ? INTERACTION_FAMILIES[bridge.record.familyId] : null;
  const selectedFamily = analysis.matchedContact ? INTERACTION_FAMILIES[analysis.matchedContact.familyId] : null;
  const alignment = bridge.record ? bridge.alignment : analysis.alignment;
  const status = bridge.status;
  const scopeClass = status === 'strained' ? 'strained' : status === 'aligned' ? 'aligned' : alignment?.aligned ? 'ready' : 'open';
  return <section className={`interaction-bridge-scope ${scopeClass}`} aria-labelledby="interactionBridgeScopeTitle"><div className="interaction-scope-top"><span>bridge oscilloscope</span><strong id="interactionBridgeScopeTitle">{status === 'aligned' ? 'committed contact' : status === 'strained' ? 'bridge retained · strained' : alignment?.aligned ? 'ports aligned · not formed' : 'no committed bridge'}</strong></div><svg viewBox="0 0 250 210" role="img" aria-label={status === 'none' ? 'Selected interaction ports are not joined' : `${family.name} bridge is ${status}`}><defs><pattern id="interactionScopeGrid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20"/></pattern><filter id="interactionBridgeGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect className="interaction-scope-field" width="250" height="210" rx="18"/><rect className="interaction-scope-grid" width="250" height="210" rx="18" fill="url(#interactionScopeGrid)"/><circle className="interaction-scope-terminal left" cx="31" cy="102" r="10"/><circle className="interaction-scope-terminal right" cx="219" cy="102" r="10"/>{status === 'none' ? <><path className="interaction-open-lead" d="M41 102H90L103 90"/><path className="interaction-open-lead" d="M209 102H160L147 114"/><circle className={`interaction-port-readout ${analysis.selected.a ? 'present' : ''}`} cx="112" cy="80" r="5"/><circle className={`interaction-port-readout ${analysis.selected.b ? 'present' : ''}`} cx="138" cy="124" r="5"/></> : <><path className="interaction-bridge-path" style={{ '--bridge-accent': family.accent }} d={status === 'strained' ? 'M41 102C72 35 90 173 125 102S179 169 209 102' : 'M41 102C73 102 82 67 110 102S159 137 209 102'}/><circle className="interaction-bridge-pulse" style={{ '--bridge-accent': family.accent }} cx="125" cy="102" r="8"/></>}<text className="interaction-scope-label" x="125" y="28" textAnchor="middle">{family?.symbol || selectedFamily?.symbol || 'select two ports'}</text><text className="interaction-scope-status" x="125" y="185" textAnchor="middle">{status === 'none' ? 'commit required' : status === 'strained' ? 'manual break required' : 'noncovalent bridge'}</text></svg><div className="interaction-port-ledger"><div><span>A port</span><strong>{analysis.selected.a?.label || 'not selected'}</strong></div><div><span>B port</span><strong>{analysis.selected.b?.label || 'not selected'}</strong></div></div><div className="interaction-angle-ledger"><div><span>A error</span><strong>{alignment ? `${alignment.aErrorDeg.toFixed(1)}°` : '—'}</strong></div><div><span>B error</span><strong>{alignment ? `${alignment.bErrorDeg.toFixed(1)}°` : '—'}</strong></div><div><span>gate</span><strong>{alignment ? `≤ ${alignment.toleranceDeg}°` : '—'}</strong></div></div></section>;
}

function FamilyClaim({ values, onToggle }) {
  return <fieldset className="interaction-family-claim"><legend>Which families coexist in this pair?</legend>{Object.values(INTERACTION_FAMILIES).map((family) => <button type="button" className={selectedClass(values.includes(family.id))} aria-pressed={values.includes(family.id)} onClick={() => onToggle(family.id)} style={{ '--family-accent': family.accent }} key={family.id}><i/><span><strong>{family.name}</strong><small>{family.symbol}</small></span></button>)}</fieldset>;
}

const orientationOptions = [
  ['opposite-electrostatic-ends-face', 'Opposite ends face'],
  ['same-electrostatic-ends-face', 'Same ends face'],
  ['orientation-not-specific-in-this-model', 'No preferred orientation here'],
];
const covalentOptions = [['none', 'No covalent change'], ['bond-formed', 'Covalent bond formed'], ['bond-broken', 'Covalent bond broken']];

function ChoiceDeck({ legend, options, value, onChange }) {
  return <fieldset className="interaction-choice-deck"><legend>{legend}</legend>{options.map(([id, label]) => <button type="button" className={selectedClass(value === id)} aria-pressed={value === id} onClick={() => onChange(id)} key={id}><i/><span>{label}</span></button>)}</fieldset>;
}

function PairConsole({ scenario, state, predictions, setPredictions, attemptFamilyId, setAttemptFamilyId, referenceContactId, setReferenceContactId, evaluation, feedback, hint, onAttempt, onBreak, onReference, onCheck, onHint }) {
  return <aside className="interaction-console interaction-panel"><PanelHeading eyebrow="Commit console · nothing automatic" title="Choose a family, then attempt the selected sites"/><div className="interaction-attempt-family"><span>Family for this bridge attempt</span><div>{Object.values(INTERACTION_FAMILIES).map((family) => <button type="button" className={selectedClass(attemptFamilyId === family.id)} aria-pressed={attemptFamilyId === family.id} onClick={() => setAttemptFamilyId(family.id)} style={{ '--family-accent': family.accent }} key={family.id}><i/><strong>{family.name}</strong></button>)}</div></div><div className="interaction-contact-actions"><button type="button" className="commit" onClick={onAttempt}>Attempt selected interaction</button><button type="button" className="break" onClick={onBreak}>Break selected interaction</button></div><div className="interaction-reference-row"><select value={referenceContactId} aria-label="Alignment reference contact" onChange={(event) => setReferenceContactId(event.target.value)}>{scenario.validContacts.map((contact) => <option value={contact.id} key={contact.id}>{INTERACTION_FAMILIES[contact.familyId].name} · {contact.id}</option>)}</select><button type="button" onClick={onReference}>Load alignment reference</button></div><Feedback feedback={feedback}/><div className="interaction-console-divider"><span>predict before comparing</span></div><FamilyClaim values={predictions.families} onToggle={(familyId) => setPredictions((current) => ({ ...current, families: current.families.includes(familyId) ? current.families.filter((id) => id !== familyId) : [...current.families, familyId] }))}/><ChoiceDeck legend="How should the electrostatic ends face?" options={orientationOptions} value={predictions.orientation} onChange={(orientation) => setPredictions((current) => ({ ...current, orientation }))}/><ChoiceDeck legend="What happens to covalent connectivity?" options={covalentOptions} value={predictions.covalentChange} onChange={(covalentChange) => setPredictions((current) => ({ ...current, covalentChange }))}/><div className="interaction-prediction-actions"><button type="button" className="check" onClick={onCheck}>Check all three claims</button><button type="button" onClick={onHint}>Reveal one hint</button></div>{hint && <div className="interaction-hint"><b>Hint {hint.level}/4 · {hint.title}</b><p>{hint.detail}</p><small>No site, angle, bridge, or prediction was changed.</small></div>}<div className="interaction-dimensions"><Dimension label="Family set" result={evaluation?.dimensions.families}/><Dimension label="Orientation" result={evaluation?.dimensions.orientation}/><Dimension label="Covalent change" result={evaluation?.dimensions.covalentChange}/></div>{evaluation && <div className={`interaction-verdict ${evaluation.correct ? 'correct' : 'inspect'}`}><span>{evaluation.correct ? 'all three claims match' : 'keep the wrong claim visible'}</span><strong>{evaluation.correct ? 'You separated a noncovalent contact from covalent connectivity.' : 'Read each dimension separately; the app preserved every answer.'}</strong></div>}<p className="interaction-console-boundary">{scenario.boundary}</p></aside>;
}

function ContactLedger({ scenario, analysis, evaluation }) {
  const inventoryVisible = Boolean(evaluation);
  return <section className="interaction-ledger interaction-panel"><div className="interaction-ledger-question"><span>learning question</span><strong>{scenario.teachingQuestion}</strong><p>{scenario.misconception}</p></div><div className="interaction-ledger-contact"><span>current contact evidence</span><div><b>{analysis.matchedContact ? INTERACTION_FAMILIES[analysis.matchedContact.familyId].name : 'No declared site pair matched'}</b><em>{analysis.bridge.status === 'none' ? 'uncommitted' : analysis.bridge.status}</em></div><p>{analysis.matchedContact?.explanation || 'Your selected ports remain visible. Choose a compatible family or inspect a hint; nothing will be repaired automatically.'}</p></div><div className={`interaction-ledger-inventory ${inventoryVisible ? 'revealed' : ''}`}><span>declared family inventory</span>{inventoryVisible ? <div>{analysis.families.map((family) => <b style={{ '--family-accent': family.accent }} key={family.id}><i/>{family.name}</b>)}</div> : <p>Commit the multi-family claim to compare the full set.</p>}</div><div className="interaction-ledger-lock"><span>covalent ledger</span><strong>0 atoms changed · 0 formal charges changed · 0 covalent bonds changed</strong><p>{INTERMOLECULAR_MODEL_BOUNDARY.covalent}</p></div></section>;
}

function PairDock({ active, record }) {
  const [scenarioId, setScenarioId] = useState('water-water');
  const scenario = INTERACTION_PAIR_BY_ID[scenarioId];
  const [state, setState] = useState(() => createPairInteractionState('water-water'));
  const [predictions, setPredictions] = useState({ families: [], orientation: '', covalentChange: '' });
  const [attemptFamilyId, setAttemptFamilyId] = useState('');
  const [referenceContactId, setReferenceContactId] = useState(scenario.validContacts[0].id);
  const [evaluation, setEvaluation] = useState(null);
  const [hint, setHint] = useState(null);
  const [feedback, setFeedback] = useState({ tone: 'waiting', title: 'The dock is uncommitted.', detail: 'Choose one site on each entity, orient them, choose a family, and press Attempt.' });
  const analysis = useMemo(() => analyzePairInteraction({ scenarioId, state }), [scenarioId, state]);

  const chooseScenario = (nextId) => {
    if (nextId === scenarioId) return;
    const next = INTERACTION_PAIR_BY_ID[nextId];
    setScenarioId(nextId);
    setState(createPairInteractionState(nextId));
    setPredictions({ families: [], orientation: '', covalentChange: '' });
    setAttemptFamilyId('');
    setReferenceContactId(next.validContacts[0].id);
    setEvaluation(null);
    setHint(null);
    setFeedback({ tone: 'waiting', title: `${next.name} opened.`, detail: 'Only the pair dock reset; the solvation shell remains exactly as you left it.' });
    record('scenario', `${next.name} pair opened`, 'Sites, rotations, bridge, pair claims, and pair feedback reset. Shell work was preserved.');
  };
  const rotate = (entityKey, rotationDeg, commit) => {
    const next = rotatePairEntity({ scenarioId, state, entityKey, rotationDeg });
    setState(next);
    const nextAnalysis = analyzePairInteraction({ scenarioId, state: next });
    setFeedback(nextAnalysis.bridge.status === 'strained'
      ? { tone: 'strained', title: 'The bridge is strained, not broken.', detail: 'Rotation never cleaves it automatically. Use the Break action when you decide to remove it.' }
      : { tone: 'moved', title: `Entity ${entityKey.toUpperCase()} rotated to ${next.rotationsDeg[entityKey]}°.`, detail: next.bridge ? 'The committed bridge record was preserved.' : 'No interaction was formed by rotation.' });
    if (commit) record(nextAnalysis.bridge.status === 'strained' ? 'strained' : 'rotation', `Entity ${entityKey.toUpperCase()} set to ${next.rotationsDeg[entityKey]}°`, nextAnalysis.bridge.status === 'strained' ? 'The bridge remained committed and is now outside its angular gate.' : 'No bridge was formed or broken automatically.');
  };
  const selectSite = (entityKey, siteId) => {
    const next = selectPairSite({ scenarioId, state, entityKey, siteId });
    setState(next);
    const selected = next.selectedSites[entityKey];
    const entity = entityKey === 'a' ? analysis.entities.a : analysis.entities.b;
    const site = entity.sites.find((candidate) => candidate.id === siteId);
    setFeedback({ tone: selected ? 'selected' : 'waiting', title: selected ? `${site.label} selected.` : `${site.label} cleared.`, detail: next.bridge ? 'The existing bridge remains committed until you break it.' : 'The other site and both rotations were preserved.' });
    record('site', `${entity.formula} ${selected ? 'site selected' : 'site cleared'}`, `${site.label}; no pairing occurred automatically.`);
  };
  const attempt = () => {
    if (!attemptFamilyId) {
      const next = { tone: 'blocked', title: 'Choose an interaction family first.', detail: 'The app will not infer your intended bridge from the selected sites.' };
      setFeedback(next); record('blocked', next.title, next.detail); return;
    }
    const result = attemptPairInteraction({ scenarioId, state, familyId: attemptFamilyId });
    setState(result.state);
    setFeedback({ tone: result.outcome.status === 'formed' ? 'formed' : result.outcome.status === 'misaligned' ? 'strained' : 'blocked', title: result.outcome.title, detail: result.outcome.reason });
    record(result.outcome.status, result.outcome.title, result.outcome.reason);
  };
  const breakBridge = () => {
    const result = breakPairInteraction({ scenarioId, state });
    setState(result.state);
    setFeedback({ tone: result.changed ? 'broken' : 'waiting', title: result.outcome.title, detail: result.outcome.reason });
    record(result.outcome.status, result.outcome.title, result.outcome.reason);
  };
  const loadReference = () => {
    const contact = scenario.validContacts.find((candidate) => candidate.id === referenceContactId);
    const next = createPairAlignmentReference(scenarioId, referenceContactId);
    setState(next);
    setFeedback({ tone: 'reference', title: 'Alignment reference loaded, still uncommitted.', detail: 'Sites and angles moved to the declared teaching alignment. You must still choose a family and press Attempt.' });
    record('reference', `${INTERACTION_FAMILIES[contact.familyId].name} alignment loaded`, 'The reference selected ports and rotations but did not form a bridge.');
  };
  const check = () => {
    if (!predictions.families.length || !predictions.orientation || !predictions.covalentChange) {
      const next = { tone: 'blocked', title: 'Finish all three predictions.', detail: 'Choose at least one family, an orientation statement, and a covalent-change statement.' };
      setFeedback(next); record('blocked', next.title, next.detail); return;
    }
    const checked = evaluatePairPrediction({ scenarioId, prediction: predictions });
    setEvaluation(checked);
    setFeedback({ tone: checked.correct ? 'correct' : 'inspect', title: checked.correct ? 'All pair claims match.' : 'At least one claim needs inspection.', detail: 'Every answer remains selected so you can compare one dimension at a time.' });
    record(checked.correct ? 'correct' : 'inspect', `${scenario.name} prediction checked`, `Family set ${checked.dimensions.families.correct ? 'matched' : 'did not match'}; orientation ${checked.dimensions.orientation.correct ? 'matched' : 'did not match'}; covalent change ${checked.dimensions.covalentChange.correct ? 'matched' : 'did not match'}.`);
  };
  const revealHint = () => {
    const level = hint ? Math.min(4, hint.level + 1) : 1;
    const next = nextPairInteractionHint({ scenarioId, state, level });
    setHint(next);
    record('hint', `Pair hint ${level}`, next.detail);
  };
  const entityA = analysis.entities.a;
  const entityB = analysis.entities.b;
  return <section className="interaction-mode-panel" role="tabpanel" aria-labelledby="interactionModePair" hidden={!active}><div className="interaction-pair-grid"><ScenarioRail scenarioId={scenarioId} onSelect={chooseScenario}/><section className="interaction-polarization-table interaction-panel"><div className="interaction-table-top"><div><span>polarization table · manual port geometry</span><strong>{scenario.name}</strong></div><b>{scenario.teachingQuestion}</b></div><div className="interaction-stage"><EntityRotor entityKey="a" entity={entityA} rotationDeg={state.rotationsDeg.a} selectedSiteId={state.selectedSites.a} bridgeSiteId={state.bridge?.aSiteId || ''} onRotate={(value, commit) => rotate('a', value, commit)} onCommitRotation={() => record('rotation', `Entity A held at ${state.rotationsDeg.a}°`, 'No bridge was formed or broken automatically.')} onSelectSite={(siteId) => selectSite('a', siteId)}/><BridgeScope analysis={analysis}/><EntityRotor entityKey="b" entity={entityB} rotationDeg={state.rotationsDeg.b} selectedSiteId={state.selectedSites.b} bridgeSiteId={state.bridge?.bSiteId || ''} onRotate={(value, commit) => rotate('b', value, commit)} onCommitRotation={() => record('rotation', `Entity B held at ${state.rotationsDeg.b}°`, 'No bridge was formed or broken automatically.')} onSelectSite={(siteId) => selectSite('b', siteId)}/></div></section><PairConsole scenario={scenario} state={state} predictions={predictions} setPredictions={(updater) => { setPredictions(updater); setEvaluation(null); }} attemptFamilyId={attemptFamilyId} setAttemptFamilyId={setAttemptFamilyId} referenceContactId={referenceContactId} setReferenceContactId={setReferenceContactId} evaluation={evaluation} feedback={feedback} hint={hint} onAttempt={attempt} onBreak={breakBridge} onReference={loadReference} onCheck={check} onHint={revealHint}/><ContactLedger scenario={scenario} analysis={analysis} evaluation={evaluation}/></div></section>;
}

function WaterCompass({ slot, orientation, revealed, onToggle }) {
  return <button type="button" className={`water-compass ${orientation} ${revealed ? (slot.correct ? 'correct' : 'incorrect') : ''}`} style={{ '--slot-angle': `${slot.angleDeg}deg`, '--slot-x': `${50 + Math.cos(slot.angleDeg * Math.PI / 180) * 35}%`, '--slot-y': `${50 + Math.sin(slot.angleDeg * Math.PI / 180) * 35}%` }} onClick={onToggle} aria-label={`Water at ${slot.angleDeg} degrees; ${slot.inwardEnd} points inward; click to reverse`}><span className="water-compass-axis"><i className="oxygen"><b>O</b><small>δ−</small></i><em/><i className="hydrogen"><b>H</b><small>δ+</small></i></span><strong>{slot.angleDeg}°</strong></button>;
}

function SolvationShellStage({ analysis, revealed, onToggle }) {
  return <section className="solvation-stage interaction-panel"><div className="solvation-stage-top"><div><span>symbolic first-shell compass</span><strong>{analysis.scenario.name}</strong></div><b>{analysis.correctCount}/6 currently face the declared end inward</b></div><div className="solvation-orbit" role="group" aria-label={`${analysis.ion.name} with six independently rotatable symbolic water compasses`}><div className="solvation-ring outer"/><div className="solvation-ring inner"/><div className={`solvation-ion ${analysis.ionCharge > 0 ? 'positive' : 'negative'}`}><span>{analysis.ion.formula}</span><small>formal charge</small></div>{analysis.slots.map((slot) => <WaterCompass slot={slot} orientation={slot.orientation} revealed={revealed} onToggle={() => onToggle(slot.id)} key={slot.id}/>)}</div><div className="solvation-stage-key"><span><i className="oxygen"/>δ− oxygen</span><span><i className="hydrogen"/>δ+ hydrogen</span><span><i className="ion"/>central formal charge</span></div><p>{analysis.boundary}</p></section>;
}

function SolvationConsole({ scenario, prediction, setPrediction, evaluation, feedback, hint, onCheck, onHint, onReference }) {
  return <aside className="solvation-console interaction-panel"><PanelHeading eyebrow="Shell claim · two independent predictions" title="Orient every visible compass, then commit"/><ChoiceDeck legend="Which end should face the central ion?" options={[["oxygen", "Oxygen δ−"], ["hydrogen", "Hydrogen δ+"]]} value={prediction.favoredEnd} onChange={(favoredEnd) => setPrediction((current) => ({ ...current, favoredEnd }))}/><label className="solvation-count-prediction"><span>How many of the six interface waters should be correct in the completed target?</span><input type="number" min="0" max="6" step="1" value={prediction.correctlyOrientedCount} placeholder="0–6" onChange={(event) => setPrediction((current) => ({ ...current, correctlyOrientedCount: event.target.value }))}/><small>This is a count of interface buttons—not a hydration number.</small></label><div className="solvation-actions"><button type="button" className="check" onClick={onCheck}>Check shell claims</button><button type="button" onClick={onHint}>Reveal one hint</button><button type="button" className="reference" onClick={onReference}>Load all-six reference</button></div><Feedback feedback={feedback}/>{hint && <div className="interaction-hint"><b>Hint {hint.level}/4 · {hint.title}</b><p>{hint.detail}</p><small>No water compass or prediction was changed.</small></div>}<div className="interaction-dimensions"><Dimension label="Favored inward end" result={evaluation?.dimensions.favoredEnd}/><Dimension label="Completed target count" result={evaluation?.dimensions.correctlyOrientedCount}/></div>{evaluation && <div className={`interaction-verdict ${evaluation.correct ? 'correct' : 'inspect'}`}><span>{evaluation.correct ? 'shell claims match' : 'preserved for comparison'}</span><strong>{evaluation.correct ? 'Opposite partial and formal signs face in the declared symbolic model.' : 'Inspect sign first, then count all six visible interface slots.'}</strong></div>}<p className="interaction-console-boundary">{scenario.misconception}</p></aside>;
}

function SolvationDock({ active, record }) {
  const [scenarioId, setScenarioId] = useState('sodium-water-shell');
  const scenario = SOLVATION_SHELL_BY_ID[scenarioId];
  const [state, setState] = useState(() => createSolvationShellState('sodium-water-shell'));
  const [prediction, setPrediction] = useState({ favoredEnd: '', correctlyOrientedCount: '' });
  const [evaluation, setEvaluation] = useState(null);
  const [hint, setHint] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState({ tone: 'waiting', title: 'Three compasses begin each way.', detail: 'Click waters one by one. The app will not rotate the shell for you.' });
  const analysis = useMemo(() => analyzeSolvationShell({ scenarioId, state }), [scenarioId, state]);
  const chooseScenario = (nextId) => {
    if (nextId === scenarioId) return;
    const next = SOLVATION_SHELL_BY_ID[nextId];
    setScenarioId(nextId);
    setState(createSolvationShellState(nextId));
    setPrediction({ favoredEnd: '', correctlyOrientedCount: '' });
    setEvaluation(null); setHint(null); setRevealed(false);
    setFeedback({ tone: 'waiting', title: `${next.name} opened.`, detail: 'Only the shell mode reset; the pair dock remains exactly as you left it.' });
    record('scenario', `${next.name} opened`, 'Six alternating water compasses loaded; pair-dock work was preserved.');
  };
  const toggle = (slotId) => {
    const next = toggleWaterCompass({ scenarioId, state, slotId });
    setState(next); setRevealed(false);
    const orientation = next.orientationBySlot[slotId];
    setFeedback({ tone: 'moved', title: `${slotId.toUpperCase()} reversed.`, detail: `${orientation === 'oxygen-in' ? 'Oxygen δ−' : 'Hydrogen δ+'} now points inward. No other water moved.` });
    record('rotation', `Water ${slotId.toUpperCase()} reversed`, `${orientation} selected; the other five compasses were preserved.`);
  };
  const check = () => {
    if (!prediction.favoredEnd || prediction.correctlyOrientedCount === '') {
      const next = { tone: 'blocked', title: 'Finish both shell predictions.', detail: 'Choose the favored inward end and enter a raw count from 0 through 6.' };
      setFeedback(next); record('blocked', next.title, next.detail); return;
    }
    const numeric = Number(prediction.correctlyOrientedCount);
    if (!Number.isInteger(numeric) || numeric < 0 || numeric > 6) {
      const next = { tone: 'blocked', title: 'The visible-slot count must be 0 through 6.', detail: 'Your raw entry remains in place; correct it before checking.' };
      setFeedback(next); record('blocked', next.title, next.detail); return;
    }
    const checked = evaluateSolvationPrediction({ scenarioId, prediction: { ...prediction, correctlyOrientedCount: String(prediction.correctlyOrientedCount) } });
    setEvaluation(checked); setRevealed(true);
    setFeedback({ tone: checked.correct ? 'correct' : 'inspect', title: checked.correct ? 'Both shell claims match.' : 'At least one shell claim needs inspection.', detail: `${analysis.correctCount} of your six current compass orientations match; the completed target still asks for all six.` });
    record(checked.correct ? 'correct' : 'inspect', `${scenario.name} claims checked`, `${analysis.correctCount}/6 current compass orientations match the declared inward end.`);
  };
  const revealHint = () => {
    const level = hint ? Math.min(4, hint.level + 1) : 1;
    const next = nextSolvationHint({ scenarioId, state, level });
    setHint(next); record('hint', `Solvation hint ${level}`, next.detail);
  };
  const loadReference = () => {
    const next = createSolvationReference(scenarioId);
    setState(next); setRevealed(true);
    setFeedback({ tone: 'reference', title: 'All-six orientation reference loaded.', detail: 'Every compass was explicitly moved to the declared target; your predictions were preserved.' });
    record('reference', `${scenario.name} all-six reference loaded`, 'The six visible interface slots now face the declared partial-charge end inward; this is not a hydration number.');
  };
  return <section className="interaction-mode-panel" role="tabpanel" aria-labelledby="interactionModeShell" hidden={!active}><div className="solvation-grid"><aside className="solvation-scenarios interaction-panel"><PanelHeading eyebrow="Ion sign · two symbolic shells" title="Reverse the central charge, then reverse the water logic"/><div>{SOLVATION_SHELL_SCENARIOS.map((item) => {
    const ion = INTERACTION_ENTITIES[item.ionEntityId];
    return <button type="button" className={selectedClass(item.id === scenarioId)} aria-pressed={item.id === scenarioId} onClick={() => chooseScenario(item.id)} key={item.id}><i className={ion.netCharge > 0 ? 'positive' : 'negative'}>{ion.formula}</i><span><strong>{item.name}</strong><small>expected inward end · {item.expectedInwardEnd}</small></span></button>;
  })}</div><div className="solvation-question"><span>current question</span><strong>{scenario.teachingQuestion}</strong><p>{scenario.misconception}</p></div></aside><SolvationShellStage analysis={analysis} revealed={revealed} onToggle={toggle}/><SolvationConsole scenario={scenario} prediction={prediction} setPrediction={(updater) => { setPrediction(updater); setEvaluation(null); }} evaluation={evaluation} feedback={feedback} hint={hint} onCheck={check} onHint={revealHint} onReference={loadReference}/><section className="solvation-ledger interaction-panel"><div><span>current orientation count</span><strong>{analysis.correctCount}<small>/6</small></strong><p>{analysis.incorrectCount} interface compass{analysis.incorrectCount === 1 ? '' : 'es'} still point the other end inward.</p></div><div><span>opposite-sign rule</span><strong>{analysis.ion.formula} ↔ {scenario.expectedInwardEnd === 'oxygen' ? 'δ− O' : 'δ+ H'}</strong><p>Water remains covalently intact. No proton is transferred and no ion–water covalent bond is created.</p></div><div><span>model boundary</span><strong>symbolic orientation only</strong><p>{INTERMOLECULAR_MODEL_BOUNDARY.shell}</p></div></section></div></section>;
}

function InteractionTrace({ entries }) {
  return <aside className="interaction-trace interaction-panel"><PanelHeading eyebrow="Learning trace · learner actions only" title="Wrong attempts remain evidence, not errors to erase"/><div className="interaction-trace-list">{entries.map((entry) => <article className={entry.kind} key={entry.id}><i/><span>{entry.kind}</span><strong>{entry.title}</strong><p>{entry.detail}</p></article>)}</div><details className="interaction-teacher-lens"><summary>Open teacher lens <span>+</span></summary><ol><li>Compare methane/methane with HCl/HCl. What family persists when permanent dipoles are added?</li><li>Use water/water. Why is a declared hydrogen-bond contact additional to—not a replacement for—dispersion and dipole–dipole?</li><li>Form a bridge, rotate one entity until it is strained, then break it. Which actions change geometry, the noncovalent bridge, and covalent connectivity?</li><li>Reverse Na⁺ to Cl⁻ in the shell. Why does the favored water end reverse, and why can this six-button picture not predict solubility or a hydration number?</li></ol></details></aside>;
}

function InteractionPassport() {
  const passport = MODEL_PASSPORTS.interactionObservatory;
  return <aside className="interaction-passport interaction-panel"><div className="interaction-passport-intro"><PanelHeading eyebrow="Model + source passport" title={passport.name}/><div className="interaction-passport-verdict"><i/>{passport.resultKind}</div><p>{passport.inputProvenance}</p><p>{passport.dataStatement}</p><p className="interaction-property-lock">{INTERMOLECULAR_MODEL_BOUNDARY.property}</p></div><div className="interaction-passport-claims"><div><span>Included</span>{passport.includes.map((item) => <b key={item}>{item}</b>)}</div><div className="excluded"><span>Not included</span>{passport.excludes.map((item) => <b key={item}>{item}</b>)}</div></div><div className="interaction-passport-sources"><span>Authoritative reference basis</span>{passport.sources.map((sourceId) => {
    const source = SCIENCE_SOURCES[sourceId];
    return <a href={source.url} target="_blank" rel="noreferrer" key={source.id}><strong>{source.name}</strong><small>{source.role}</small><b aria-hidden="true">↗</b></a>;
  })}</div></aside>;
}

export default function IntermolecularLab() {
  const [mode, setMode] = useState('pair');
  const [entries, setEntries] = useState(() => [activity('start', 'Molecular Interaction Observatory opened', 'Water/water is visible with no selected site, family, prediction, or committed bridge.')]);
  const record = (kind, title, detail) => setEntries((current) => [activity(kind, title, detail), ...current].slice(0, 90));
  const chooseMode = (nextMode) => {
    setMode(nextMode);
    record('mode', nextMode === 'pair' ? 'Pair dock opened' : 'Solvation shell opened', 'The other mode’s scenario, state, predictions, feedback, and hints were preserved.');
  };
  return <section className="intermolecular-lab" id="intermolecularLab" aria-labelledby="intermolecularLabTitle"><header className="interaction-header"><div><p className="section-code">06 / Molecular interactions</p><h2 id="intermolecularLabTitle">Attraction is not a magic label. Choose the sites. Turn the molecules. Commit the contact.</h2><p>Interrogate coexisting intermolecular families, keep failed attempts visible, strain and manually cleave a noncovalent bridge, then reverse a symbolic water shell around Na⁺ and Cl⁻.</p></div><div className="interaction-condition-stamp"><span>Declared interaction observatory</span><strong>4 families · 6 pair docks · 2 ion shells</strong><small>Manual sites · explicit formation · preserved failures</small><b>no energy or property prediction</b></div></header><nav className="interaction-mode-tabs" role="tablist" aria-label="Molecular interaction instruments"><button type="button" role="tab" id="interactionModePair" aria-selected={mode === 'pair'} className={selectedClass(mode === 'pair')} onClick={() => chooseMode('pair')}><i>⇄</i><span><strong>Pair dock</strong><small>choose sites · rotate · commit</small></span></button><button type="button" role="tab" id="interactionModeShell" aria-selected={mode === 'shell'} className={selectedClass(mode === 'shell')} onClick={() => chooseMode('shell')}><i>✣</i><span><strong>Solvation shell</strong><small>orient six water compasses</small></span></button></nav><div className="interaction-bench"><PairDock active={mode === 'pair'} record={record}/><SolvationDock active={mode === 'shell'} record={record}/><InteractionTrace entries={entries}/><InteractionPassport/></div></section>;
}
