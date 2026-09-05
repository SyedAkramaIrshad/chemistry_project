import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ELECTRON_DOMAIN_GEOMETRY_LIST,
  MOLECULAR_GEOMETRY_MODEL_BOUNDARY,
  MOLECULAR_GEOMETRY_SCENARIOS,
  MOLECULAR_GEOMETRY_SCENARIO_BY_ID,
} from '../data/molecularGeometryScenarios.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../data/scienceSources.js';
import {
  buildReferenceDomainState,
  calculatePolarityResultant,
  createEmptyDomainState,
  domainStateMetrics,
  evaluateMolecularGeometry,
  nextGeometryHint,
  placeDomainToken,
  projectDomainCage,
  removeDomainToken,
  setDomainPull,
} from '../chemistry/molecularGeometry.js';
import '../styles/molecular-geometry.css';

let geometryActivityId = 0;
const activity = (kind, title, detail) => ({
  id: `geometry-${Date.now()}-${++geometryActivityId}`,
  kind,
  title,
  detail,
});

const GEOMETRY_OPTIONS = ELECTRON_DOMAIN_GEOMETRY_LIST.map((geometry) => geometry.name.toLowerCase());
const SHAPE_OPTIONS = [...new Set(MOLECULAR_GEOMETRY_SCENARIOS.map((scenario) => scenario.shape))].sort();

function ScenarioRunway({ scenarioId, onSelect }) {
  const families = useMemo(() => MOLECULAR_GEOMETRY_SCENARIOS.reduce((groups, scenario) => {
    if (!groups[scenario.family]) groups[scenario.family] = [];
    groups[scenario.family].push(scenario);
    return groups;
  }, {}), []);

  return (
    <section className="geometry-runway geometry-panel" aria-labelledby="geometryRunwayTitle">
      <div className="geometry-panel-heading">
        <span>Scenario runway · fourteen declared examples</span>
        <strong id="geometryRunwayTitle">Choose a central-atom domain manifest</strong>
      </div>
      <div className="geometry-swipe-cue" aria-hidden="true">Swipe the scenario runway <b>→</b></div>
      <div className="geometry-runway-scroll">
        {Object.entries(families).map(([family, scenarios]) => (
          <div className="geometry-family" key={family}>
            <span>{family}</span>
            <div>
              {scenarios.map((scenario) => (
                <button
                  type="button"
                  key={scenario.id}
                  className={scenario.id === scenarioId ? 'selected' : ''}
                  aria-pressed={scenario.id === scenarioId}
                  onClick={() => onSelect(scenario.id)}
                >
                  <strong>{scenario.formula}</strong>
                  <small>{scenario.ax}</small>
                  <b>{scenario.name}</b>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TokenManifest({ scenario, state, selectedDomainId, onSelect, onRemove, onEmpty, onReference }) {
  const siteForDomain = Object.fromEntries(
    Object.entries(state.sites).filter(([, domainId]) => domainId).map(([siteId, domainId]) => [domainId, siteId]),
  );
  return (
    <aside className="geometry-manifest geometry-panel">
      <div className="geometry-panel-heading">
        <span>Domain manifest · learner controlled</span>
        <strong>Select a token, then choose a cage site</strong>
      </div>
      <div className="geometry-token-list" role="list" aria-label={`${scenario.formula} electron-domain tokens`}>
        {scenario.domains.map((domain, index) => {
          const siteId = siteForDomain[domain.id];
          const selected = selectedDomainId === domain.id;
          return (
            <div className={`geometry-token-row ${domain.kind} ${siteId ? 'placed' : ''} ${selected ? 'selected' : ''}`} key={domain.id} role="listitem">
              <button
                type="button"
                draggable={!siteId}
                disabled={Boolean(siteId)}
                aria-pressed={selected}
                onClick={() => onSelect(domain.id)}
                onDragStart={(event) => {
                  event.dataTransfer.setData('application/x-chemlab-domain', domain.id);
                  event.dataTransfer.effectAllowed = 'move';
                  onSelect(domain.id);
                }}
              >
                <i>{domain.kind === 'lonePair' ? <><span>•</span><span>•</span></> : index + 1}</i>
                <span><strong>{domain.label}</strong><small>{domain.kind === 'lonePair' ? 'nonbonding pair' : 'bonding domain'}</small></span>
                <b>{siteId ? siteId : 'ready'}</b>
              </button>
              {siteId && <button type="button" className="geometry-token-remove" onClick={() => onRemove(siteId)} aria-label={`Remove ${domain.label} from site ${siteId}`}>remove</button>}
            </div>
          );
        })}
      </div>
      <p className="geometry-manifest-note">Drag a token on larger screens, or select and tap a socket. Occupied sites never swap automatically.</p>
      <div className="geometry-manifest-actions">
        <button type="button" onClick={onEmpty}>Clear cage</button>
        <button type="button" className="reference" onClick={onReference}>Load declared reference</button>
      </div>
    </aside>
  );
}

function CageSite({ site, center, selectedDomainId, onPlace, onRemove }) {
  const occupied = Boolean(site.domain);
  const angle = Math.atan2(site.y - center.y, site.x - center.x) * 180 / Math.PI;
  const label = occupied
    ? `${site.domain.kind === 'lonePair' ? 'lone pair' : site.domain.label + ' bonding domain'} at ${site.class} site ${site.id}`
    : `empty ${site.class} site ${site.id}${selectedDomainId ? '; place selected token' : ''}`;
  const activate = () => occupied && !selectedDomainId ? onRemove(site.id) : onPlace(site.id);
  return (
    <g
      className={`geometry-site ${occupied ? site.domain.kind : 'empty'} ${selectedDomainId && !occupied ? 'armed' : ''}`}
      role="button"
      tabIndex="0"
      aria-label={label}
      data-site-id={site.id}
      transform={`translate(${site.x} ${site.y}) scale(${site.scale})`}
      onClick={activate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate();
        }
      }}
      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }}
      onDrop={(event) => {
        event.preventDefault();
        onPlace(site.id, event.dataTransfer.getData('application/x-chemlab-domain'));
      }}
    >
      {!occupied && <>
        <circle className="geometry-socket-pulse" r="30"/>
        <circle className="geometry-socket" r="17"/>
        <circle className="geometry-hit" r="31"/>
      </>}
      {site.domain?.kind === 'bond' && <>
        <circle className="geometry-atom-halo" r="34"/>
        <circle className="geometry-outer-atom" r="25"/>
        <text className="geometry-atom-label" textAnchor="middle" dy="7">{site.domain.label}</text>
        <circle className="geometry-hit" r="34"/>
      </>}
      {site.domain?.kind === 'lonePair' && <g className="geometry-lone-pair" transform={`rotate(${angle + 90})`}>
        <ellipse cx="-8" cy="0" rx="13" ry="24"/>
        <ellipse cx="8" cy="0" rx="13" ry="24"/>
        <circle cx="-6" cy="-1" r="3"/>
        <circle cx="6" cy="-1" r="3"/>
        <circle className="geometry-hit" r="34"/>
      </g>}
      <text className="geometry-site-label" textAnchor="middle" y="46">{site.class === 'equivalent' ? site.id : `${site.class} · ${site.id}`}</text>
      {occupied && <g className="geometry-remove-glyph" transform="translate(25 -25)" aria-hidden="true"><circle r="10"/><path d="M-3-3L3 3M3-3L-3 3"/></g>}
    </g>
  );
}

function RepulsionCage({ scenario, state, selectedDomainId, yaw, pitch, onYaw, onPitch, onPlace, onRemove, feedback }) {
  const frameRef = useRef(null);
  const projection = useMemo(() => projectDomainCage({
    scenarioId: scenario.id,
    state,
    yawDeg: yaw,
    pitchDeg: pitch,
    width: 780,
    height: 560,
  }), [scenario.id, state, yaw, pitch]);
  const { center, sites, resultant } = projection;
  useEffect(() => {
    const centerScrollableCage = () => {
      const frame = frameRef.current;
      if (!frame || frame.scrollWidth <= frame.clientWidth) return;
      frame.scrollLeft = (frame.scrollWidth - frame.clientWidth) / 2;
    };
    const frame = requestAnimationFrame(centerScrollableCage);
    window.addEventListener('resize', centerScrollableCage);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', centerScrollableCage);
    };
  }, [scenario.id]);
  return (
    <section className="geometry-cage geometry-panel" aria-labelledby="geometryCageTitle">
      <div className="geometry-cage-topline">
        <div>
          <span>Repulsion cage · rotate the evidence</span>
          <strong id="geometryCageTitle">{scenario.formula} / {scenario.ax}</strong>
        </div>
        <div className={`geometry-action-feedback ${feedback?.kind || 'waiting'}`} aria-live="polite">
          <i/>{feedback?.reason || (selectedDomainId ? 'Choose an open socket.' : 'Select a domain token to begin.')}
        </div>
      </div>
      <div className="geometry-cage-frame" ref={frameRef}>
        <div className="geometry-cage-swipe-cue" aria-hidden="true">Swipe the cage <b>↔</b></div>
        <svg viewBox="0 0 780 560" role="img" aria-labelledby="geometrySvgTitle geometrySvgDesc">
          <title id="geometrySvgTitle">Rotatable {scenario.formula} ideal electron-domain cage</title>
          <desc id="geometrySvgDesc">A depth-projected central atom, ideal domain sockets, learner-placed bonds and lone pairs, relative pull arrows, and their live resultant.</desc>
          <defs>
            <pattern id="geometry-drafting-grid" width="34" height="34" patternUnits="userSpaceOnUse"><path d="M34 0H0V34"/></pattern>
            <radialGradient id="geometry-core-gradient"><stop offset="0" stopColor="#d4fff9"/><stop offset=".55" stopColor="#8ad8cf"/><stop offset="1" stopColor="#2f8f83"/></radialGradient>
            <marker id="geometry-pull-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z"/></marker>
            <marker id="geometry-result-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0 0L9 4.5L0 9Z"/></marker>
            <filter id="geometry-glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="7" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          <rect className="geometry-field" width="780" height="560" rx="20"/>
          <rect className="geometry-grid" width="780" height="560" rx="20"/>
          <g className="geometry-reticle" aria-hidden="true">
            <circle cx={center.x} cy={center.y} r="185"/>
            <circle cx={center.x} cy={center.y} r="118"/>
            <path d={`M${center.x - 235} ${center.y}H${center.x + 235}M${center.x} ${center.y - 225}V${center.y + 225}`}/>
          </g>
          <g className="geometry-struts" aria-hidden="true">
            {sites.map((site) => <line key={site.id} x1={center.x} y1={center.y} x2={site.x} y2={site.y} style={{ opacity: .18 + (site.depth + 1) * .18 }}/>) }
          </g>
          <g className="geometry-bonds" aria-hidden="true">
            {sites.filter((site) => site.domain?.kind === 'bond').map((site) => {
              const pull = state.pulls[site.domainId];
              const dx = site.x - center.x;
              const dy = site.y - center.y;
              return <g key={site.id} style={{ opacity: .58 + (site.depth + 1) * .17 }}>
                <line className="geometry-bond-line" x1={center.x} y1={center.y} x2={site.x} y2={site.y}/>
                {pull > 0 && <line className="geometry-pull-line" x1={center.x + dx * .22} y1={center.y + dy * .22} x2={center.x + dx * (.48 + pull * .16)} y2={center.y + dy * (.48 + pull * .16)} style={{ '--pull': pull }} markerEnd="url(#geometry-pull-arrow)"/>}
              </g>;
            })}
          </g>
          {resultant.complete && resultant.magnitude > 1e-8 && <g className="geometry-resultant" aria-hidden="true">
            <line x1={center.x} y1={center.y} x2={resultant.x} y2={resultant.y} markerEnd="url(#geometry-result-arrow)"/>
            <text x={(center.x + resultant.x) / 2} y={(center.y + resultant.y) / 2 - 12}>Σ pull {resultant.magnitude.toFixed(3)}</text>
          </g>}
          {resultant.complete && resultant.magnitude <= 1e-8 && <g className="geometry-cancelled" aria-hidden="true"><circle cx={center.x} cy={center.y} r="55"/><text x={center.x} y={center.y + 74} textAnchor="middle">Σ pull = 0</text></g>}
          <g className="geometry-central" transform={`translate(${center.x} ${center.y})`} aria-hidden="true">
            <circle className="geometry-core-glow" r="52"/>
            <circle className="geometry-core" r="37"/>
            <text textAnchor="middle" dy="10">{scenario.centralLabel}</text>
          </g>
          <g className="geometry-sites">
            {sites.map((site) => <CageSite key={site.id} site={site} center={center} selectedDomainId={selectedDomainId} onPlace={onPlace} onRemove={onRemove}/>) }
          </g>
          <g className="geometry-scale" aria-hidden="true"><text x="32" y="42">IDEAL DOMAIN FIELD</text><text x="32" y="61">depth projection · not molecular size</text></g>
        </svg>
      </div>
      <div className="geometry-view-controls">
        <label><span>Yaw <b>{yaw}°</b></span><input aria-label="Cage yaw" type="range" min="-180" max="180" value={yaw} onChange={(event) => onYaw(Number(event.target.value))}/></label>
        <label><span>Pitch <b>{pitch}°</b></span><input aria-label="Cage pitch" type="range" min="-70" max="70" value={pitch} onChange={(event) => onPitch(Number(event.target.value))}/></label>
        <button type="button" onClick={() => { onYaw(0); onPitch(0); }}>Front view</button>
        <button type="button" onClick={() => { onYaw(35); onPitch(-18); }}>Perspective</button>
      </div>
      <p className="geometry-vector-boundary">{MOLECULAR_GEOMETRY_MODEL_BOUNDARY.vectorConvention}</p>
    </section>
  );
}

function PullDeck({ scenario, state, onChange, onCommit }) {
  const bonds = scenario.domains.filter((domain) => domain.kind === 'bond');
  return (
    <section className="geometry-pulls geometry-panel" aria-labelledby="geometryPullTitle">
      <div className="geometry-panel-heading"><span>Relative pull mixer · 0–2</span><strong id="geometryPullTitle">Change vector strength, never geometry</strong></div>
      <div className="geometry-pull-list">
        {bonds.map((domain) => (
          <label key={domain.id}>
            <span><i>{domain.label}</i><b>{domain.id}</b></span>
            <input type="range" min="0" max="2" step="0.05" value={state.pulls[domain.id]} onChange={(event) => onChange(domain.id, Number(event.target.value))} onPointerUp={() => onCommit(domain.id)} onKeyUp={() => onCommit(domain.id)}/>
            <input type="number" aria-label={`${domain.label} relative pull`} min="0" max="2" step="0.05" value={state.pulls[domain.id]} onChange={(event) => onChange(domain.id, Number(event.target.value))} onBlur={() => onCommit(domain.id)}/>
          </label>
        ))}
      </div>
      <p>These controls are qualitative relative contributions. They are not electronegativities, measured bond moments, or a molecular dipole in debye.</p>
    </section>
  );
}

function Dimension({ label, dimension }) {
  if (!dimension) return <div className="waiting"><span>{label}</span><strong>waiting</strong><p>Commit a check when you are ready.</p></div>;
  return <div className={dimension.correct ? 'correct' : 'incorrect'}><span>{label}</span><strong>{dimension.correct ? 'resolved' : 'inspect'}</strong><p>{dimension.reason}</p></div>;
}

function PredictionConsole({ predictions, onPrediction, onCheck, onHint, hint, evaluation }) {
  return (
    <aside className="geometry-prediction geometry-panel">
      <div className="geometry-panel-heading"><span>Prediction console</span><strong>Commit what your cage implies</strong></div>
      <label><span>Electron-domain geometry</span><select value={predictions.electronGeometry} onChange={(event) => onPrediction('electronGeometry', event.target.value)}><option value="">Choose parent cage…</option>{GEOMETRY_OPTIONS.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label><span>Visible-atom molecular shape</span><select value={predictions.molecularShape} onChange={(event) => onPrediction('molecularShape', event.target.value)}><option value="">Choose visible shape…</option>{SHAPE_OPTIONS.map((value) => <option key={value}>{value}</option>)}</select></label>
      <fieldset><legend>Relative-vector classification</legend>{['polar', 'nonpolar'].map((value) => <button type="button" key={value} className={predictions.polarity === value ? 'selected' : ''} aria-pressed={predictions.polarity === value} onClick={() => onPrediction('polarity', value)}><i/>{value}</button>)}</fieldset>
      <div className="geometry-check-actions"><button type="button" className="commit" onClick={onCheck}>Check my model</button><button type="button" onClick={onHint}>Reveal one hint</button></div>
      {hint && <p className="geometry-hint"><b>Hint {hint.level}/5</b>{hint.message}<small>{hint.boundary}</small></p>}
      <div className="geometry-dimensions" aria-live="polite">
        <Dimension label="Token completeness" dimension={evaluation?.completeness}/>
        <Dimension label="Site preference" dimension={evaluation?.arrangement}/>
        <Dimension label="Parent geometry" dimension={evaluation?.electronGeometry}/>
        <Dimension label="Visible shape" dimension={evaluation?.molecularShape}/>
        <Dimension label="Pull cancellation" dimension={evaluation?.polarity}/>
      </div>
      {evaluation && <div className={`geometry-verdict ${evaluation.committed ? 'correct' : 'inspect'}`}><span>{evaluation.committed ? 'Model resolved' : 'Keep the evidence visible'}</span><strong>{evaluation.committed ? 'All five dimensions agree.' : 'Nothing was moved or corrected for you.'}</strong></div>}
    </aside>
  );
}

function ShapeStrip({ scenario, geometry, metrics, polarity, evaluation }) {
  return (
    <section className="geometry-shape-strip geometry-panel" aria-label="Shape and geometry distinction">
      <div><span>Parent cage</span><strong>{geometry.name}</strong><small>{geometry.domainCount} total domains</small></div>
      <div><span>Domain code</span><strong>{scenario.ax}</strong><small>{metrics.placedCount}/{metrics.requiredCount} tokens placed</small></div>
      <div className={evaluation ? 'revealed' : ''}><span>Visible-atom shape</span><strong>{evaluation ? metrics.molecularShape : 'prediction sealed'}</strong><small>lone-pair sites are hidden from the name</small></div>
      <div><span>Nominal parent angle</span><strong>{scenario.nominalAngles.map((angle) => `${angle}°`).join(' · ')}</strong><small>ideal-domain value, not measured</small></div>
      <div><span>Localized label</span><strong>{geometry.conventionalHybridLabel}</strong><small>{geometry.hybridBoundary || 'conventional introductory label'}</small></div>
      <div><span>Live pull resultant</span><strong>{polarity.complete ? polarity.magnitude.toFixed(3) : 'incomplete'}</strong><small>relative units · classification {evaluation ? polarity.classification : 'sealed'}</small></div>
    </section>
  );
}

function LearningTrace({ entries }) {
  return (
    <aside className="geometry-trace geometry-panel">
      <div className="geometry-panel-heading"><span>Learning trace</span><strong>Your decisions remain inspectable</strong></div>
      <div className="geometry-trace-list">
        {entries.map((entry) => <article className={entry.kind} key={entry.id}><i/><span>{entry.kind}</span><strong>{entry.title}</strong><p>{entry.detail}</p></article>)}
      </div>
      <details className="geometry-teacher-lens">
        <summary>Open teacher lens <span>+</span></summary>
        <ol>
          <li>Compare CO₂ with H₂O. Both have two bonded atoms; why does counting all domains change the visible geometry and vector cancellation?</li>
          <li>Compare BF₃ with NH₃. Which geometry name counts all domains, and which shape name counts only bonded atoms?</li>
          <li>Build SF₄, ClF₃, and XeF₂ in one parent cage. How do equatorial lone pairs progressively change what remains visible?</li>
          <li>Compare SF₆ with XeF₄, then make the XeF₄ lone pairs cis. Which symmetry evidence changes before any formula changes?</li>
        </ol>
      </details>
    </aside>
  );
}

function GeometryPassport() {
  const passport = MODEL_PASSPORTS.molecularGeometryWindTunnel;
  return (
    <aside className="geometry-passport geometry-panel">
      <div className="geometry-passport-intro">
        <div className="geometry-panel-heading"><span>Model passport</span><strong>{passport.name}</strong></div>
        <div className="geometry-passport-verdict"><i/>{passport.resultKind}</div>
        <p>{passport.inputProvenance}</p><p>{passport.dataStatement}</p>
      </div>
      <div className="geometry-passport-claims"><div><span>Included</span>{passport.includes.map((item) => <b key={item}>{item}</b>)}</div><div className="excluded"><span>Not included</span>{passport.excludes.map((item) => <b key={item}>{item}</b>)}</div></div>
      <div className="geometry-passport-sources"><span>Reference basis</span>{passport.sources.map((sourceId) => { const source = SCIENCE_SOURCES[sourceId]; return <a href={source.url} target="_blank" rel="noreferrer" key={source.id}><strong>{source.name}</strong><small>{source.role}</small><b aria-hidden="true">↗</b></a>; })}</div>
    </aside>
  );
}

export default function MolecularGeometryLab() {
  const [scenarioId, setScenarioId] = useState('water');
  const scenario = MOLECULAR_GEOMETRY_SCENARIO_BY_ID[scenarioId];
  const geometry = ELECTRON_DOMAIN_GEOMETRY_LIST.find((item) => item.id === scenario.geometryId);
  const [state, setState] = useState(() => createEmptyDomainState('water').state);
  const [selectedDomainId, setSelectedDomainId] = useState(null);
  const [yaw, setYaw] = useState(35);
  const [pitch, setPitch] = useState(-18);
  const [predictions, setPredictions] = useState({ electronGeometry: '', molecularShape: '', polarity: '' });
  const [evaluation, setEvaluation] = useState(null);
  const [hint, setHint] = useState(null);
  const [feedback, setFeedback] = useState({ kind: 'waiting', reason: 'Select a domain token to begin.' });
  const [entries, setEntries] = useState(() => [activity('start', 'Water challenge opened', 'The tetrahedral parent cage starts empty; no domain was placed automatically.')]);
  const lastPullLog = useRef({ domainId: '', value: null });

  const metrics = useMemo(() => domainStateMetrics({ scenarioId, state }), [scenarioId, state]);
  const polarity = useMemo(() => calculatePolarityResultant({ scenarioId, state }), [scenarioId, state]);
  const record = (kind, title, detail) => setEntries((current) => [activity(kind, title, detail), ...current]);
  const invalidateEvaluation = () => { setEvaluation(null); setHint(null); };

  const chooseScenario = (nextId) => {
    if (nextId === scenarioId) return;
    const nextScenario = MOLECULAR_GEOMETRY_SCENARIO_BY_ID[nextId];
    setScenarioId(nextId);
    setState(createEmptyDomainState(nextId).state);
    setSelectedDomainId(null);
    setPredictions({ electronGeometry: '', molecularShape: '', polarity: '' });
    setEvaluation(null);
    setHint(null);
    setFeedback({ kind: 'waiting', reason: `${nextScenario.formula} loaded with an empty ${nextScenario.family.toLowerCase()} cage.` });
    record('scenario', `${nextScenario.formula} scenario selected`, 'The cage and predictions were explicitly reset for a new attempt.');
  };

  const selectDomain = (domainId) => {
    const domain = scenario.domains.find((item) => item.id === domainId);
    if (!domain || Object.values(state.sites).includes(domainId)) return;
    setSelectedDomainId(domainId);
    setFeedback({ kind: 'ready', reason: `${domain.kind === 'lonePair' ? 'Lone pair' : domain.label + ' bond'} armed. Choose any open socket.` });
    record('select', `${domain.label} token selected`, 'Selection does not place or judge the domain.');
  };

  const place = (siteId, draggedDomainId = '') => {
    const domainId = draggedDomainId || selectedDomainId;
    if (!domainId) {
      const reason = state.sites[siteId]
        ? 'That site is occupied. Activate it again to remove its token, or select another token and choose an open site.'
        : 'Select or drag a domain token before choosing an empty socket.';
      setFeedback({ kind: 'blocked', reason });
      record('blocked', `Site ${siteId} not changed`, reason);
      return;
    }
    const result = placeDomainToken({ scenarioId, state, domainId, siteId });
    setFeedback({ kind: result.allowed ? 'allowed' : 'blocked', reason: result.reason });
    record(result.allowed ? 'placed' : 'blocked', result.allowed ? `${domainId} placed at ${siteId}` : `${domainId} rejected at ${siteId}`, result.reason);
    if (!result.allowed) return;
    setState(result.state);
    setSelectedDomainId(null);
    invalidateEvaluation();
  };

  const remove = (siteId) => {
    const result = removeDomainToken({ scenarioId, state, siteId });
    setFeedback({ kind: result.allowed ? 'allowed' : 'blocked', reason: result.reason });
    record(result.allowed ? 'removed' : 'blocked', result.allowed ? `${result.domainId} removed from ${siteId}` : `Removal rejected at ${siteId}`, result.reason);
    if (!result.allowed) return;
    setState(result.state);
    setSelectedDomainId(null);
    invalidateEvaluation();
  };

  const clearCage = () => {
    setState(createEmptyDomainState(scenarioId).state);
    setSelectedDomainId(null);
    setEvaluation(null);
    setHint(null);
    setFeedback({ kind: 'waiting', reason: 'Cage cleared by learner request. Select a domain token to restart.' });
    record('reset', `${scenario.formula} cage cleared`, 'Every token was returned to the manifest; predictions remain visible.');
  };

  const loadReference = () => {
    setState(buildReferenceDomainState(scenarioId).state);
    setSelectedDomainId(null);
    setEvaluation(null);
    setHint(null);
    setFeedback({ kind: 'reference', reason: `Declared ${scenario.ax} reference loaded because you requested it.` });
    record('reference', `${scenario.formula} reference loaded`, 'This explicit reveal placed domains but did not alter or check your predictions.');
  };

  const changePull = (domainId, value) => {
    const result = setDomainPull({ scenarioId, state, domainId, pull: value });
    if (!result.allowed) {
      setFeedback({ kind: 'blocked', reason: result.reason });
      return;
    }
    setState(result.state);
    setEvaluation(null);
  };

  const commitPull = (domainId) => {
    const value = state.pulls[domainId];
    if (lastPullLog.current.domainId === domainId && lastPullLog.current.value === value) return;
    lastPullLog.current = { domainId, value };
    setFeedback({ kind: 'allowed', reason: `${domainId} pull set to ${value.toFixed(2)} relative units; no site moved.` });
    record('vector', `${domainId} pull changed`, `Relative contribution is now ${value.toFixed(2)}; geometry was preserved.`);
  };

  const updatePrediction = (key, value) => {
    setPredictions((current) => ({ ...current, [key]: value }));
    setEvaluation(null);
  };

  const check = () => {
    const missing = Object.entries(predictions).filter(([, value]) => !value).map(([key]) => key);
    if (missing.length) {
      const reason = 'Commit all three predictions—parent geometry, visible shape, and relative-vector classification—before checking.';
      setFeedback({ kind: 'blocked', reason });
      record('blocked', 'Prediction check held', `${missing.length} prediction field${missing.length === 1 ? ' is' : 's are'} still empty.`);
      return;
    }
    const result = evaluateMolecularGeometry({ scenarioId, state, predictions });
    setEvaluation(result);
    setFeedback({ kind: result.committed ? 'allowed' : 'inspect', reason: result.committed ? 'Every dimension agrees with the declared model.' : 'The cage and predictions remain unchanged. Inspect each reason separately.' });
    record(result.committed ? 'correct' : 'inspect', result.committed ? `${scenario.formula} model resolved` : `${scenario.formula} model checked`, result.committed ? 'Completeness, site preference, parent geometry, visible shape, and pull cancellation agree.' : 'No token, pull, or prediction was repaired automatically.');
  };

  const revealHint = () => {
    const nextLevel = hint ? Math.min(5, hint.level + 1) : 1;
    const next = nextGeometryHint({ scenarioId, state, level: nextLevel });
    setHint(next);
    record('hint', `Hint ${nextLevel} revealed`, next.message);
  };

  return (
    <section className="geometry-lab" id="molecularGeometryLab" aria-labelledby="molecularGeometryLabTitle">
      <header className="geometry-header">
        <div>
          <p className="section-code">04 / Molecular geometry & qualitative polarity</p>
          <h2 id="molecularGeometryLabTitle">Do not memorize the shape. Put every domain under pressure.</h2>
          <p>Select bond and lone-pair tokens, place them into a rotatable ideal cage, then decide which atoms remain visible and whether the relative pull arrows cancel.</p>
        </div>
        <div className="geometry-condition-stamp">
          <span>Geometry wind tunnel</span>
          <strong>14 AXmEn manifests · 5 ideal cages</strong>
          <small>Manual placement · no automatic repair · local vectors</small>
          <b>{metrics.placedCount}/{metrics.requiredCount} domains mounted</b>
        </div>
      </header>
      <div className="geometry-bench">
        <ScenarioRunway scenarioId={scenarioId} onSelect={chooseScenario}/>
        <TokenManifest scenario={scenario} state={state} selectedDomainId={selectedDomainId} onSelect={selectDomain} onRemove={remove} onEmpty={clearCage} onReference={loadReference}/>
        <RepulsionCage scenario={scenario} state={state} selectedDomainId={selectedDomainId} yaw={yaw} pitch={pitch} onYaw={setYaw} onPitch={setPitch} onPlace={place} onRemove={remove} feedback={feedback}/>
        <PredictionConsole predictions={predictions} onPrediction={updatePrediction} onCheck={check} onHint={revealHint} hint={hint} evaluation={evaluation}/>
        <PullDeck scenario={scenario} state={state} onChange={changePull} onCommit={commitPull}/>
        <ShapeStrip scenario={scenario} geometry={geometry} metrics={metrics} polarity={polarity} evaluation={evaluation}/>
        <LearningTrace entries={entries}/>
        <GeometryPassport/>
      </div>
    </section>
  );
}
