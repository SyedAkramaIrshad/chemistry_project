import { useMemo, useState } from 'react';
import {
  ALKENE_SCENARIOS,
  ALKENE_SCENARIO_BY_ID,
  NEWMAN_SCENARIOS,
  NEWMAN_SCENARIO_BY_ID,
  STEREOCHEMISTRY_MODEL_BOUNDARY,
  TETRAHEDRAL_SCENARIOS,
  TETRAHEDRAL_SCENARIO_BY_ID,
} from '../data/stereochemistryScenarios.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../data/scienceSources.js';
import {
  alkeneResult,
  createAlkeneState,
  createNewmanState,
  createTetrahedralState,
  evaluateAlkene,
  evaluateNewman,
  evaluateTetrahedral,
  mirrorTetrahedralState,
  newmanProfile,
  newmanResult,
  nextStereochemistryHint,
  projectTetrahedral,
  setTorsionAngle,
  swapAlkeneSide,
  swapTetrahedralSites,
  tetrahedralResult,
} from '../chemistry/stereochemistry.js';
import '../styles/stereochemistry.css';

let stereoActivityId = 0;
const activity = (kind, title, detail) => ({ id: `stereo-${Date.now()}-${++stereoActivityId}`, kind, title, detail });
const optionClass = (selected) => selected ? 'selected' : '';

function PanelHeading({ eyebrow, title, children }) {
  return <div className="stereo-panel-heading"><div><span>{eyebrow}</span><strong>{title}</strong></div>{children}</div>;
}

function ScenarioRail({ className, items, selectedId, onSelect }) {
  return (
    <div className={`${className} stereo-scenario-rail`}>
      {items.map((item) => <button type="button" key={item.id} className={optionClass(item.id === selectedId)} aria-pressed={item.id === selectedId} onClick={() => onSelect(item.id)}><strong>{item.name}</strong><small>{item.formulaLabel}</small></button>)}
    </div>
  );
}

function ChoiceButtons({ label, values, selected, onSelect, className = '' }) {
  return <fieldset className={`stereo-choice ${className}`}><legend>{label}</legend><div>{values.map((value) => <button type="button" key={value} className={optionClass(selected === value)} aria-pressed={selected === value} onClick={() => onSelect(value)}>{value}</button>)}</div></fieldset>;
}

function Dimension({ label, result }) {
  if (!result) return <div className="waiting"><span>{label}</span><strong>waiting</strong><p>Commit a check when ready.</p></div>;
  return <div className={result.correct ? 'correct' : 'incorrect'}><span>{label}</span><strong>{result.correct ? 'resolved' : 'inspect'}</strong><p>{result.reason}</p></div>;
}

function FeedbackStrip({ feedback }) {
  return <div className={`stereo-feedback ${feedback.kind}`} aria-live="polite"><i/><span>{feedback.reason}</span></div>;
}

function TetrahedralGraphic({ projection, scenario, selectedSiteId, onSelect, interactive = true, title }) {
  const groupById = Object.fromEntries(scenario.groups.map((item) => [item.id, item]));
  const ordered = [...projection.points].sort((left, right) => left.depth - right.depth);
  const centre = { x: 250, y: 205 };
  const screen = (point) => ({ x: 250 + (point.x - 50) * 3.35, y: 205 + (point.y - 50) * 3.1 });
  const wedge = (point) => {
    const end = screen(point);
    const dx = end.x - centre.x;
    const dy = end.y - centre.y;
    const length = Math.hypot(dx, dy) || 1;
    const px = -dy / length * 10;
    const py = dx / length * 10;
    return `${centre.x},${centre.y} ${end.x + px},${end.y + py} ${end.x - px},${end.y - py}`;
  };
  return (
    <div className={`stereo-tetra-graphic ${interactive ? 'interactive' : 'mirror'}`}>
      <div className="stereo-optic-label"><span>{title}</span><b>{projection.descriptor || 'no R/S'}</b></div>
      <svg viewBox="0 0 500 410" role="img" aria-label={`${title}: projected tetrahedral centre`}>
        <defs><pattern id={`stereo-grid-${interactive ? 'a' : 'b'}`} width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25"/></pattern></defs>
        <rect className="stereo-field" x="1" y="1" width="498" height="408" rx="18"/><rect className="stereo-grid" x="1" y="1" width="498" height="408" rx="18" fill={`url(#stereo-grid-${interactive ? 'a' : 'b'})`}/>
        <g className="stereo-registration"><path d="M25 35H75M50 10V60M425 35H475M450 10V60M25 375H75M50 350V400M425 375H475M450 350V400"/></g>
        {ordered.map((point) => {
          const end = screen(point);
          if (point.bondStyle === 'wedge') return <polygon className="stereo-bond-wedge" points={wedge(point)} key={point.siteId}/>;
          return <line className={`stereo-bond-${point.bondStyle}`} x1={centre.x} y1={centre.y} x2={end.x} y2={end.y} key={point.siteId}/>;
        })}
        <circle className="stereo-centre-atom" cx={centre.x} cy={centre.y} r="28"/><text className="stereo-centre-label" x={centre.x} y={centre.y + 7} textAnchor="middle">C*</text>
      </svg>
      {projection.points.map((point) => {
        const current = groupById[point.groupId];
        return <button type="button" disabled={!interactive} className={`stereo-tetra-socket ${selectedSiteId === point.siteId ? 'selected' : ''} depth-${point.bondStyle}`} aria-pressed={selectedSiteId === point.siteId} aria-label={`${current.label} at ${point.siteId}${interactive ? '; select this site to swap' : ''}`} key={point.siteId} style={{ left: `${point.x}%`, top: `${point.y}%` }} onClick={() => interactive && onSelect(point.siteId)}><span>{current.label}</span><small>{point.depth > .2 ? 'near' : point.depth < -.2 ? 'far' : 'plane'}</small></button>;
      })}
    </div>
  );
}

function TetrahedralBench({ active, onRecord }) {
  const [scenarioId, setScenarioId] = useState('lactic-acid-set');
  const scenario = TETRAHEDRAL_SCENARIO_BY_ID[scenarioId];
  const [state, setState] = useState(() => createTetrahedralState('lactic-acid-set').state);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [viewAngle, setViewAngle] = useState(18);
  const [priorityAssignments, setPriorityAssignments] = useState({});
  const [predictions, setPredictions] = useState({ stereogenic: '', descriptor: '', mirrorRelationship: '' });
  const [mirrorState, setMirrorState] = useState(null);
  const [mirrorExposed, setMirrorExposed] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [hint, setHint] = useState(null);
  const [feedback, setFeedback] = useState({ kind: 'waiting', reason: 'Select two ligand sockets to exchange them, or begin by assigning priorities.' });
  const result = useMemo(() => tetrahedralResult({ scenarioId, state }), [scenarioId, state]);
  const projection = useMemo(() => projectTetrahedral({ scenarioId, state, viewAngleDeg: viewAngle }), [scenarioId, state, viewAngle]);
  const mirrorProjection = useMemo(() => mirrorState ? projectTetrahedral({ scenarioId, state: mirrorState, viewAngleDeg: -viewAngle }) : null, [scenarioId, mirrorState, viewAngle]);

  const invalidate = () => { setEvaluation(null); setHint(null); };
  const chooseScenario = (nextId) => {
    if (nextId === scenarioId) return;
    const next = TETRAHEDRAL_SCENARIO_BY_ID[nextId];
    setScenarioId(nextId); setState(createTetrahedralState(nextId).state); setSelectedSiteId(''); setViewAngle(18); setPriorityAssignments({}); setPredictions({ stereogenic: '', descriptor: '', mirrorRelationship: '' }); setMirrorState(null); setMirrorExposed(false); setEvaluation(null); setHint(null);
    setFeedback({ kind: 'waiting', reason: `${next.name} opened. Spatial arrangement is visible; learner priorities are empty.` });
    onRecord('scenario', `${next.name} selected`, 'Only the mirror-centre mode reset. Other stereochemistry modes retained their state.');
  };
  const selectSite = (siteId) => {
    if (!selectedSiteId) { setSelectedSiteId(siteId); setFeedback({ kind: 'ready', reason: 'First socket selected. Choose a different socket to make one explicit transposition.' }); onRecord('select', 'First tetrahedral socket selected', 'No ligand moved yet.'); return; }
    if (selectedSiteId === siteId) { setSelectedSiteId(''); setFeedback({ kind: 'waiting', reason: 'Socket selection cleared; no ligand moved.' }); onRecord('select', 'Tetrahedral socket selection cleared', 'Selecting the same socket twice performs no swap.'); return; }
    const swapped = swapTetrahedralSites({ scenarioId, state, firstSiteId: selectedSiteId, secondSiteId: siteId });
    setSelectedSiteId(''); setFeedback({ kind: swapped.allowed ? 'allowed' : 'blocked', reason: swapped.reason }); onRecord(swapped.allowed ? 'swap' : 'blocked', swapped.allowed ? 'One ligand transposition completed' : 'Ligand swap blocked', swapped.reason);
    if (!swapped.allowed) return;
    setState(swapped.state); setMirrorState(null); setMirrorExposed(false); invalidate();
  };
  const assignPriority = (groupId, priority) => { setPriorityAssignments((current) => ({ ...current, [groupId]: priority })); invalidate(); setFeedback({ kind: 'ready', reason: `${scenario.groups.find((item) => item.id === groupId).label} marked as priority ${priority}. Other assignments were retained.` }); onRecord('priority', 'Learner priority changed', `${groupId} → ${priority}; no ligand moved.`); };
  const exposeMirror = () => { const mirrored = mirrorTetrahedralState({ scenarioId, state }); setMirrorState(mirrored.state); setMirrorExposed(true); setFeedback({ kind: 'reference', reason: mirrored.reason }); onRecord('mirror', 'Mirror chamber exposed', mirrored.reason); };
  const check = () => {
    const missingPriority = scenario.groups.some((item) => priorityAssignments[item.id] === undefined);
    const missingPredictions = Object.values(predictions).some((value) => value === '');
    if (missingPriority || missingPredictions) { const reason = 'Assign every ligand priority and commit stereogenicity, descriptor, and mirror relationship before checking.'; setFeedback({ kind: 'blocked', reason }); onRecord('blocked', 'Centre check held', reason); return; }
    const checked = evaluateTetrahedral({ scenarioId, state, predictions: { ...predictions, priorityAssignments } }); setEvaluation(checked); setFeedback({ kind: checked.committed ? 'allowed' : 'inspect', reason: checked.reason }); onRecord(checked.committed ? 'correct' : 'inspect', checked.committed ? `${scenario.name} resolved` : `${scenario.name} inspected`, checked.reason);
  };
  const revealHint = () => { const level = hint ? Math.min(4, hint.level + 1) : 1; const next = nextStereochemistryHint({ mode: 'tetrahedral', scenarioId, state, level }); setHint(next); onRecord('hint', `Mirror-centre hint ${level}`, next.message); };

  return (
    <section className="stereo-mode-panel stereo-centre-bench" role="tabpanel" aria-labelledby="stereoModeCentre" hidden={!active}>
      <ScenarioRail className="stereo-centre-scenario" items={TETRAHEDRAL_SCENARIOS} selectedId={scenarioId} onSelect={chooseScenario}/>
      <div className="stereo-centre-layout">
        <section className="stereo-mirror-rig stereo-panel">
          <PanelHeading eyebrow="Twin mirror chamber" title="Swap two sites. Do not redraw the molecule."><b className={`stereo-eligibility ${result.stereogenic ? 'yes' : 'no'}`}>{result.stereogenic ? 'four priorities distinct' : 'priority tie detected'}</b></PanelHeading>
          <div className="stereo-twin-chambers">
            <TetrahedralGraphic projection={projection} scenario={scenario} selectedSiteId={selectedSiteId} onSelect={selectSite} title="Original arrangement"/>
            <div className={`stereo-mirror-bay ${mirrorExposed ? 'open' : 'sealed'}`}>
              {mirrorExposed && mirrorProjection ? <TetrahedralGraphic projection={mirrorProjection} scenario={scenario} interactive={false} title="Explicit mirror"/> : <button type="button" className="stereo-mirror-shutter" onClick={exposeMirror}><i/><span>Mirror shutter closed</span><strong>Expose mirror</strong><small>The original state and predictions will not change.</small></button>}
            </div>
          </div>
          <label className="stereo-camera-control"><span>Rotate camera only <b>{viewAngle}°</b></span><input type="range" min="0" max="360" step="1" value={viewAngle} onChange={(event) => { const angle = Number(event.target.value); setViewAngle(angle); setFeedback({ kind: 'ready', reason: `Camera rotated to ${angle}°. Ligand sites and descriptor did not change.` }); onRecord('camera', 'Mirror-centre camera rotated', `Projection changed to ${angle}° without a ligand swap.`); }}/><small>Projection changes · configuration does not</small></label>
          <div className="stereo-camera-snaps" aria-label="Camera projection presets">{[0,90,180,270].map((angle) => <button type="button" key={angle} className={optionClass(viewAngle === angle)} aria-pressed={viewAngle === angle} onClick={() => { setViewAngle(angle); setFeedback({ kind: 'ready', reason: `Camera rotated to ${angle}°. Ligand sites and descriptor did not change.` }); onRecord('camera', `Camera set to ${angle}°`, 'Projection changed without a ligand transposition.'); }}>{angle}° view</button>)}</div>
          <FeedbackStrip feedback={feedback}/>
        </section>

        <aside className="stereo-priority-board stereo-panel">
          <PanelHeading eyebrow="Declared comparison desk" title="Assign the priorities yourself"><span className="stereo-formula-stamp">{scenario.formulaLabel}</span></PanelHeading>
          <div className="stereo-priority-rows">{scenario.groups.map((item) => <div className="stereo-priority-row" key={item.id}><div><i data-tone={item.tone}/><strong>{item.label}</strong><small>{item.comparison}</small></div><div aria-label={`Choose priority for ${item.label}`}>{[1,2,3,4].map((priority) => <button type="button" key={priority} className={optionClass(priorityAssignments[item.id] === priority)} aria-pressed={priorityAssignments[item.id] === priority} onClick={() => assignPriority(item.id, priority)}>{priority}</button>)}</div></div>)}</div>
          <p className="stereo-boundary-note">{scenario.boundary}</p>
        </aside>

        <aside className="stereo-centre-prediction stereo-panel">
          <PanelHeading eyebrow="Spatial verdict" title="Commit before reading the audit"/>
          <ChoiceButtons label="Is this centre eligible?" values={['stereogenic','not stereogenic']} selected={predictions.stereogenic} onSelect={(value) => { setPredictions((current) => ({ ...current, stereogenic: value })); setEvaluation(null); }}/>
          <ChoiceButtons label="Displayed descriptor" values={['R','S','not applicable']} selected={predictions.descriptor} onSelect={(value) => { setPredictions((current) => ({ ...current, descriptor: value })); setEvaluation(null); }}/>
          <ChoiceButtons label="Original ↔ explicit mirror" values={['enantiomer','same']} selected={predictions.mirrorRelationship} onSelect={(value) => { setPredictions((current) => ({ ...current, mirrorRelationship: value })); setEvaluation(null); }}/>
          <div className="stereo-action-row"><button type="button" className="primary stereo-centre-check" onClick={check}>Check this arrangement</button><button type="button" onClick={revealHint}>Reveal one hint</button></div>
          {hint && <p className="stereo-hint"><b>Hint {hint.level}/4</b>{hint.message}<small>{hint.boundary}</small></p>}
          <div className="stereo-dimensions">{scenario.groups.map((item) => <Dimension key={item.id} label={`${item.label} priority`} result={evaluation?.priorities.find((entry) => entry.groupId === item.id)}/>)}<Dimension label="Eligibility" result={evaluation?.stereogenic}/><Dimension label="R/S descriptor" result={evaluation?.descriptor}/><Dimension label="Mirror relationship" result={evaluation?.mirrorRelationship}/></div>
          {evaluation && <div className={`stereo-verdict ${evaluation.committed ? 'correct' : 'inspect'}`}><span>{evaluation.committed ? 'Declared centre resolved' : 'Keep inspecting'}</span><strong>{evaluation.reason}</strong></div>}
        </aside>
      </div>
    </section>
  );
}

function AlkeneGraphic({ scenario, state, selected, onSelect, evaluation }) {
  const groups = [...scenario.leftGroups, ...scenario.rightGroups];
  const byId = Object.fromEntries(groups.map((item) => [item.id, item]));
  const positions = { leftTop: [16,22], leftBottom: [16,78], rightTop: [84,22], rightBottom: [84,78] };
  const slotData = [
    { key:'leftTop', side:'left', position:'top', id:state.left.top }, { key:'leftBottom', side:'left', position:'bottom', id:state.left.bottom },
    { key:'rightTop', side:'right', position:'top', id:state.right.top }, { key:'rightBottom', side:'right', position:'bottom', id:state.right.bottom },
  ];
  return <div className="stereo-alkene-graphic"><svg viewBox="0 0 760 360" role="img" aria-label={`${scenario.name} planar alkene arrangement`}><defs><pattern id="alkene-paper-grid" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25"/></pattern></defs><rect className="stereo-field light" width="760" height="360" rx="18"/><rect className="stereo-grid light" width="760" height="360" rx="18" fill="url(#alkene-paper-grid)"/><g className="alkene-bond-lines"><path d="M330 169H430M330 191H430"/><circle cx="310" cy="180" r="29"/><circle cx="450" cy="180" r="29"/><text x="310" y="188" textAnchor="middle">C</text><text x="450" y="188" textAnchor="middle">C</text><path d="M285 158L160 80M285 202L160 280M475 158L600 80M475 202L600 280"/></g>{evaluation && evaluation.actual.eligible && <g className={`alkene-priority-beam ${evaluation.actual.descriptor.toLowerCase()}`}><path d={evaluation.actual.leftHigherPosition === 'top' ? 'M160 80L310 180' : 'M160 280L310 180'}/><path d={evaluation.actual.rightHigherPosition === 'top' ? 'M600 80L450 180' : 'M600 280L450 180'}/></g>}<g className="alkene-axis"><path d="M380 38V322"/><text x="392" y="54">same side / opposite side</text></g></svg>{slotData.map((slot) => { const item=byId[slot.id]; const [left,top]=positions[slot.key]; return <button type="button" key={slot.key} className={`stereo-alkene-token ${selected[slot.side] === slot.id ? 'selected' : ''}`} style={{left:`${left}%`,top:`${top}%`}} aria-pressed={selected[slot.side] === slot.id} onClick={() => onSelect(slot.side, slot.id)}><strong>{item.label}</strong><small>{slot.side} · {slot.position}</small></button>; })}</div>;
}

function AlkeneBench({ active, onRecord }) {
  const [scenarioId, setScenarioId] = useState('z-2-butene');
  const scenario = ALKENE_SCENARIO_BY_ID[scenarioId];
  const [state, setState] = useState(() => createAlkeneState('z-2-butene').state);
  const [higherSelections, setHigherSelections] = useState({ left: '', right: '' });
  const [predictions, setPredictions] = useState({ eligibility: '', descriptor: '' });
  const [evaluation, setEvaluation] = useState(null);
  const [hint, setHint] = useState(null);
  const [feedback, setFeedback] = useState({ kind: 'waiting', reason: 'Choose the higher-priority substituent on each carbon, then compare their sides.' });
  const result = useMemo(() => alkeneResult({ scenarioId, state }), [scenarioId, state]);
  const chooseScenario = (nextId) => { if (nextId === scenarioId) return; const next=ALKENE_SCENARIO_BY_ID[nextId]; setScenarioId(nextId); setState(createAlkeneState(nextId).state); setHigherSelections({left:'',right:''}); setPredictions({eligibility:'',descriptor:''}); setEvaluation(null); setHint(null); setFeedback({kind:'waiting',reason:`${next.name} opened with left/right connectivity fixed.`}); onRecord('scenario',`${next.name} selected`,'Only the alkene mode reset.'); };
  const selectHigher = (side, id) => { setHigherSelections((current) => ({...current,[side]:id})); setEvaluation(null); setFeedback({kind:'ready',reason:`${side} comparison selected ${id}. No substituent moved.`}); onRecord('priority',`${side} alkene priority selected`,`${id} marked as the learner's higher-priority choice.`); };
  const selectTie = (side) => { setHigherSelections((current)=>({...current,[side]:'tie'})); setEvaluation(null); setFeedback({kind:'ready',reason:`${side} side marked as a priority tie. The geometry was retained.`}); onRecord('priority',`${side} alkene tie selected`,'No substituent moved.'); };
  const swapSide = (side) => { const swapped=swapAlkeneSide({scenarioId,state,side}); setFeedback({kind:swapped.allowed?'allowed':'blocked',reason:swapped.reason}); onRecord(swapped.allowed?'swap':'blocked',swapped.allowed?`${side} alkene pair swapped`:'Alkene swap blocked',swapped.reason); if(!swapped.allowed)return; setState(swapped.state); setEvaluation(null); setHint(null); };
  const check = () => { if(!higherSelections.left||!higherSelections.right||!predictions.eligibility||!predictions.descriptor){const reason='Choose both local priority results, eligibility, and E/Z result before checking.';setFeedback({kind:'blocked',reason});onRecord('blocked','Alkene check held',reason);return;} const checked=evaluateAlkene({scenarioId,state,predictions:{leftHigherId:higherSelections.left,rightHigherId:higherSelections.right,...predictions}});setEvaluation(checked);setFeedback({kind:checked.committed?'allowed':'inspect',reason:checked.reason});onRecord(checked.committed?'correct':'inspect',checked.committed?`${scenario.name} resolved`:`${scenario.name} inspected`,checked.reason); };
  const revealHint=()=>{const level=hint?Math.min(4,hint.level+1):1;const next=nextStereochemistryHint({mode:'alkene',scenarioId,state,level});setHint(next);onRecord('hint',`Alkene hint ${level}`,next.message);};
  return <section className="stereo-mode-panel stereo-alkene-bench" role="tabpanel" aria-labelledby="stereoModeAlkene" hidden={!active}>
    <ScenarioRail className="stereo-alkene-scenario" items={ALKENE_SCENARIOS} selectedId={scenarioId} onSelect={chooseScenario}/>
    <div className="stereo-alkene-layout">
      <section className="stereo-alkene-gate stereo-panel"><PanelHeading eyebrow="Planar double-bond gate" title="Rank locally. Compare globally."><span className="stereo-formula-stamp">{scenario.formulaLabel}</span></PanelHeading><AlkeneGraphic scenario={scenario} state={state} selected={higherSelections} onSelect={selectHigher} evaluation={evaluation}/><div className="stereo-side-controls"><button type="button" onClick={()=>swapSide('left')}>Swap left pair</button><span>C=C connectivity locked</span><button type="button" onClick={()=>swapSide('right')}>Swap right pair</button></div><FeedbackStrip feedback={feedback}/><p className="stereo-boundary-note">{scenario.boundary}</p></section>
      <aside className="stereo-alkene-console stereo-panel"><PanelHeading eyebrow="Two local comparisons" title="Choose one result on each carbon"/>{[['left',scenario.leftGroups],['right',scenario.rightGroups]].map(([side,groups])=><div className="stereo-side-priority" key={side}><span>{side} carbon</span><div>{groups.map((item)=><button type="button" key={item.id} className={optionClass(higherSelections[side]===item.id)} aria-pressed={higherSelections[side]===item.id} onClick={()=>selectHigher(side,item.id)}><strong>{item.label}</strong><small>{item.comparison}</small></button>)}<button type="button" className={`tie ${optionClass(higherSelections[side]==='tie')}`} aria-pressed={higherSelections[side]==='tie'} onClick={()=>selectTie(side)}>No unique higher group</button></div></div>)}<ChoiceButtons label="E/Z eligibility" values={['eligible','undefined']} selected={predictions.eligibility} onSelect={(value)=>{setPredictions((current)=>({...current,eligibility:value}));setEvaluation(null);}}/><ChoiceButtons label="Displayed descriptor" values={['E','Z','undefined']} selected={predictions.descriptor} onSelect={(value)=>{setPredictions((current)=>({...current,descriptor:value}));setEvaluation(null);}}/><div className="stereo-action-row"><button type="button" className="primary stereo-alkene-check" onClick={check}>Check the side comparison</button><button type="button" onClick={revealHint}>Reveal one hint</button></div>{hint&&<p className="stereo-hint"><b>Hint {hint.level}/4</b>{hint.message}<small>{hint.boundary}</small></p>}<div className="stereo-dimensions"><Dimension label="Left priority" result={evaluation?.leftPriority}/><Dimension label="Right priority" result={evaluation?.rightPriority}/><Dimension label="Eligibility" result={evaluation?.eligibility}/><Dimension label="E/Z descriptor" result={evaluation?.descriptor}/></div>{evaluation&&<div className={`stereo-verdict ${evaluation.committed?'correct':'inspect'}`}><span>{evaluation.committed?'Declared alkene resolved':'Keep inspecting'}</span><strong>{evaluation.reason}</strong></div>}</aside>
    </div>
  </section>;
}

function NewmanProjection({ scenario, result }) {
  const centre={x:260,y:260};const radius=68;const length=175;const frontAngles=[-90,30,150];const rearAngles=frontAngles.map((angle)=>angle+result.angle);const endpoint=(angle,startRadius=0)=>{const rad=angle*Math.PI/180;return{x:centre.x+Math.cos(rad)*(length+startRadius),y:centre.y+Math.sin(rad)*(length+startRadius)}};const ringpoint=(angle)=>{const rad=angle*Math.PI/180;return{x:centre.x+Math.cos(rad)*radius,y:centre.y+Math.sin(rad)*radius}};
  return <svg className="stereo-newman-projection" viewBox="0 0 520 520" role="img" aria-label={`${scenario.name} Newman projection at ${result.angle} degrees`}><defs><radialGradient id="newman-rear"><stop offset="0" stopColor="#f5f1e8"/><stop offset="1" stopColor="#c8c1b4"/></radialGradient></defs><circle className="newman-orbit" cx="260" cy="260" r="222"/>{rearAngles.map((angle,index)=>{const start=ringpoint(angle);const end=endpoint(angle,-5);return <g className="newman-rear-bond" key={`rear-${index}`}><line x1={start.x} y1={start.y} x2={end.x} y2={end.y}/><circle cx={end.x} cy={end.y} r="29"/><text x={end.x} y={end.y+6} textAnchor="middle">{scenario.rearGroups[index]}</text></g>;})}<circle className="newman-rear-carbon" cx="260" cy="260" r={radius}/>{frontAngles.map((angle,index)=>{const end=endpoint(angle);return <g className="newman-front-bond" key={`front-${index}`}><line x1="260" y1="260" x2={end.x} y2={end.y}/><circle cx={end.x} cy={end.y} r="29"/><text x={end.x} y={end.y+6} textAnchor="middle">{scenario.frontGroups[index]}</text></g>;})}<circle className="newman-front-carbon" cx="260" cy="260" r="17"/><path className="newman-angle-arc" d="M260 78A182 182 0 0 1 418 169"/><text className="newman-angle-label" x="380" y="95">rear rotates {result.angle}°</text></svg>;
}

function StrainTrace({ profile, result }) {
  const width=760,height=220,pad=38,max=Math.max(...profile.points.map((item)=>item.strain),1);const x=(angle)=>pad+(angle+180)/360*(width-pad*2);const y=(strain)=>height-pad-strain/max*(height-pad*2);const path=profile.points.map((point,index)=>`${index?'L':'M'}${x(point.angle).toFixed(2)} ${y(point.strain).toFixed(2)}`).join(' ');
  return <svg className="stereo-strain-trace" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Dimensionless qualitative torsion strain trace"><g className="strain-grid">{[-180,-120,-60,0,60,120,180].map((angle)=><g key={angle}><line x1={x(angle)} y1={pad} x2={x(angle)} y2={height-pad}/><text x={x(angle)} y={height-10} textAnchor="middle">{angle}°</text></g>)}</g><path className="strain-area" d={`${path}L${x(180)} ${height-pad}L${x(-180)} ${height-pad}Z`}/><path className="strain-line" d={path}/><g className="strain-fiducial"><line x1={x(result.angle)} y1={pad} x2={x(result.angle)} y2={height-pad}/><circle cx={x(result.angle)} cy={y(result.strain)} r="9"/><text x={Math.min(width-80,Math.max(80,x(result.angle)))} y={Math.max(22,y(result.strain)-16)} textAnchor="middle">index {result.strain.toFixed(2)}</text></g></svg>;
}

function NewmanBench({ active, onRecord }) {
  const [scenarioId,setScenarioId]=useState('butane');const scenario=NEWMAN_SCENARIO_BY_ID[scenarioId];const [state,setState]=useState(()=>createNewmanState('butane').state);const [predictions,setPredictions]=useState({geometry:'',relation:'',tier:''});const [evaluation,setEvaluation]=useState(null);const [hint,setHint]=useState(null);const [feedback,setFeedback]=useState({kind:'waiting',reason:'Turn the rear carbon continuously or choose a declared station.'});const result=useMemo(()=>newmanResult({scenarioId,state}),[scenarioId,state]);const profile=useMemo(()=>newmanProfile({scenarioId,step:3}),[scenarioId]);
  const chooseScenario=(nextId)=>{if(nextId===scenarioId)return;const next=NEWMAN_SCENARIO_BY_ID[nextId];setScenarioId(nextId);setState(createNewmanState(nextId).state);setPredictions({geometry:'',relation:'',tier:''});setEvaluation(null);setHint(null);setFeedback({kind:'waiting',reason:`${next.name} opened at ${next.initialAngle}°.`});onRecord('scenario',`${next.name} selected`,'Only the Newman mode reset.');};
  const rotate=(angle,kind='torsion')=>{const moved=setTorsionAngle({scenarioId,state,angle});setFeedback({kind:moved.allowed?'allowed':'blocked',reason:moved.reason});onRecord(moved.allowed?kind:'blocked',moved.allowed?`Rear carbon set to ${moved.state.angle}°`:'Torsion change blocked',moved.reason);if(!moved.allowed)return;setState(moved.state);setEvaluation(null);setHint(null);};
  const check=()=>{if(Object.values(predictions).some((value)=>!value)){const reason='Commit geometry, relationship, and qualitative tier before checking.';setFeedback({kind:'blocked',reason});onRecord('blocked','Newman check held',reason);return;}const checked=evaluateNewman({scenarioId,state,predictions});setEvaluation(checked);setFeedback({kind:checked.committed?'allowed':'inspect',reason:checked.reason});onRecord(checked.committed?'correct':'inspect',checked.committed?`${scenario.name} station resolved`:`${scenario.name} angle inspected`,checked.reason);};
  const revealHint=()=>{const level=hint?Math.min(4,hint.level+1):1;const next=nextStereochemistryHint({mode:'newman',scenarioId,state,level});setHint(next);onRecord('hint',`Newman hint ${level}`,next.message);};
  const relationValues=scenarioId==='ethane'?['equivalent staggered','equivalent eclipsed','between named stations']:['anti','gauche','eclipsed','syn eclipsed','between named stations'];const tierValues=scenarioId==='ethane'?['equivalent minimum','equivalent maximum','intermediate']:['global minimum','local minimum','local maximum','highest barrier','intermediate'];
  return <section className="stereo-mode-panel stereo-newman-bench" role="tabpanel" aria-labelledby="stereoModeNewman" hidden={!active}><ScenarioRail className="stereo-newman-scenario" items={NEWMAN_SCENARIOS} selectedId={scenarioId} onSelect={chooseScenario}/><div className="stereo-newman-layout"><section className="stereo-newman-dial stereo-panel"><PanelHeading eyebrow="Bond-axis turntable" title="Hold the front carbon. Rotate the rear."><span className="stereo-formula-stamp">{scenario.formulaLabel}</span></PanelHeading><div className="stereo-newman-stage"><NewmanProjection scenario={scenario} result={result}/><div className="stereo-angle-ledger"><div><span>signed torsion</span><strong>{result.angle}°</strong></div><div><span>IUPAC range</span><strong>{result.iupacRange}</strong></div><div><span>nearest station</span><strong>{result.nearestStation.angle}°</strong></div><div><span>current state</span><strong>{result.canonical?result.relation:'intermediate'}</strong></div></div></div><div className="stereo-torsion-slider"><label htmlFor="stereoTorsionRange">Continuous rear-carbon rotation</label><input id="stereoTorsionRange" type="range" min="-180" max="180" step="1" value={state.angle} onChange={(event)=>rotate(Number(event.target.value))}/><input className="stereo-angle-input" type="number" min="-180" max="180" step="1" aria-label="Exact signed torsion angle" value={state.angle} onChange={(event)=>rotate(Number(event.target.value))}/></div><div className="stereo-station-rail" aria-label="Declared torsion stations">{[-180,-120,-60,0,60,120,180].map((angle)=><button type="button" className={`stereo-newman-station ${state.angle===angle?'selected':''}`} aria-pressed={state.angle===angle} key={angle} onClick={()=>rotate(angle,'snap')}><strong>{angle}°</strong><small>{scenario.stations.find((item)=>item.angle===angle).relation}</small></button>)}</div><FeedbackStrip feedback={feedback}/></section><aside className="stereo-newman-console stereo-panel"><PanelHeading eyebrow="Qualitative strain recorder" title="Name geometry before reading the trace"/><StrainTrace profile={profile} result={result}/><p className="stereo-boundary-note">{profile.boundary}</p><ChoiceButtons label="Geometry" values={['staggered','eclipsed','intermediate']} selected={predictions.geometry} onSelect={(value)=>{setPredictions((current)=>({...current,geometry:value}));setEvaluation(null);}}/><ChoiceButtons label="Relationship" values={relationValues} selected={predictions.relation} onSelect={(value)=>{setPredictions((current)=>({...current,relation:value}));setEvaluation(null);}}/><ChoiceButtons label="Qualitative tier" values={tierValues} selected={predictions.tier} onSelect={(value)=>{setPredictions((current)=>({...current,tier:value}));setEvaluation(null);}}/><div className="stereo-action-row"><button type="button" className="primary stereo-newman-check" onClick={check}>Check this torsion</button><button type="button" onClick={revealHint}>Reveal one hint</button></div>{hint&&<p className="stereo-hint"><b>Hint {hint.level}/4</b>{hint.message}<small>{hint.boundary}</small></p>}<div className="stereo-dimensions"><Dimension label="Geometry" result={evaluation?.geometry}/><Dimension label="Relationship" result={evaluation?.relation}/><Dimension label="Qualitative tier" result={evaluation?.tier}/></div>{evaluation&&<div className={`stereo-verdict ${evaluation.committed?'correct':'inspect'}`}><span>{evaluation.committed?'Declared torsion resolved':'Keep inspecting'}</span><strong>{evaluation.reason}</strong></div>}</aside></div></section>;
}

function StereoTrace({ entries }) {
  return <aside className="stereo-trace stereo-panel"><PanelHeading eyebrow="Stereochemical learning trace" title="Every spatial decision remains inspectable"/><div className="stereo-trace-list">{entries.map((entry)=><article className={entry.kind} key={entry.id}><i/><span>{entry.kind}</span><strong>{entry.title}</strong><p>{entry.detail}</p></article>)}</div><details className="stereo-teacher-lens"><summary>Open teacher lens <span>+</span></summary><ol><li>Make one ligand transposition, then a second. Which operation changes permutation parity, and why is camera rotation different?</li><li>Compare the halomethane and duplicate-ligand sets. Where does priority assignment end and stereogenic eligibility begin?</li><li>Swap exactly one side of each eligible alkene, then try the repeated-substituent gate. Which test must occur before E/Z?</li><li>Compare butane and ethane at all seven stations. Which labels are geometric, which strain rankings are declared, and which thermodynamic claims remain unavailable?</li></ol></details></aside>;
}

function StereoPassport() {
  const passport=MODEL_PASSPORTS.stereochemicalNavigation;
  return <aside className="stereo-passport stereo-panel"><div className="stereo-passport-intro"><PanelHeading eyebrow="Model passport" title={passport.name}/><div className="stereo-passport-verdict"><i/>{passport.resultKind}</div><p>{passport.inputProvenance}</p><p>{passport.dataStatement}</p><p className="stereo-boundary-policy">{STEREOCHEMISTRY_MODEL_BOUNDARY.boundaryPolicy}</p></div><div className="stereo-passport-claims"><div><span>Included</span>{passport.includes.map((item)=><b key={item}>{item}</b>)}</div><div className="excluded"><span>Not included</span>{passport.excludes.map((item)=><b key={item}>{item}</b>)}</div></div><div className="stereo-passport-sources"><span>Reference basis</span>{passport.sources.map((sourceId)=>{const source=SCIENCE_SOURCES[sourceId];return <a href={source.url} target="_blank" rel="noreferrer" key={source.id}><strong>{source.name}</strong><small>{source.role}</small><b aria-hidden="true">↗</b></a>;})}</div></aside>;
}

export default function StereochemistryLab() {
  const [mode,setMode]=useState('centre');
  const [entries,setEntries]=useState(()=>[activity('start','Stereochemical navigation opened','The lactic-acid priority set is visible; no learner priority or prediction has been chosen.')]);
  const record=(kind,title,detail)=>setEntries((current)=>[activity(kind,title,detail),...current].slice(0,80));
  const selectMode=(next)=>{setMode(next);record('mode',`${next==='centre'?'Mirror centre':next==='alkene'?'Alkene gate':'Newman dial'} opened`,'Other mode states were preserved.');};
  const modes=[{id:'centre',label:'Mirror centre',icon:'◆',detail:'R/S + mirror'},{id:'alkene',label:'Alkene gate',icon:'═',detail:'E/Z + eligibility'},{id:'newman',label:'Newman dial',icon:'◉',detail:'torsion + strain'}];
  return <section className="stereochemistry-lab" id="stereochemistryLab" aria-labelledby="stereochemistryLabTitle"><header className="stereo-header"><div><p className="section-code">26 / Stereochemical navigation</p><h2 id="stereochemistryLabTitle">A flat drawing can lie to your eyes. Make the spatial test explicit.</h2><p>Swap tetrahedral ligands, compare the two sides of a double bond, and turn a rear carbon through a Newman projection—then defend every descriptor without automatic repair.</p></div><div className="stereo-condition-stamp"><span>Projection-table model</span><strong>6 centres · 6 alkenes · 2 torsion probes</strong><small>Manual spatial edits · declared priorities · local evidence</small></div></header><nav className="stereo-mode-tabs" role="tablist" aria-label="Stereochemical instruments">{modes.map((item)=><button type="button" role="tab" id={`stereoMode${item.id==='centre'?'Centre':item.id==='alkene'?'Alkene':'Newman'}`} aria-selected={mode===item.id} className={optionClass(mode===item.id)} key={item.id} onClick={()=>selectMode(item.id)}><i>{item.icon}</i><span><strong>{item.label}</strong><small>{item.detail}</small></span></button>)}</nav><div className="stereo-bench"><TetrahedralBench active={mode==='centre'} onRecord={record}/><AlkeneBench active={mode==='alkene'} onRecord={record}/><NewmanBench active={mode==='newman'} onRecord={record}/><StereoTrace entries={entries}/><StereoPassport/></div></section>;
}
