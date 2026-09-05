import { useMemo, useState } from 'react';
import {
  MO_MODEL_BOUNDARY,
  MO_ORDERINGS,
  MO_SCENARIOS,
  MO_SCENARIO_BY_ID,
} from '../data/molecularOrbitalScenarios.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../data/scienceSources.js';
import {
  buildReferenceMoState,
  compareMoOrderings,
  createEmptyMoState,
  evaluateMoConfiguration,
  moConfigurationNotation,
  moStateMetrics,
  moWaveDescriptor,
  nextMoHint,
  placeMoElectron,
  removeMoElectron,
} from '../chemistry/molecularOrbitals.js';
import '../styles/molecular-orbitals.css';

let moActivityId = 0;
const activity = (kind, title, detail) => ({
  id: `mo-${Date.now()}-${++moActivityId}`,
  kind,
  title,
  detail,
});

const focusLevelFor = (scenario) => {
  if (scenario.orderingId === 'oneS') return 'sigmaG1s';
  if (scenario.orderingId === 'earlySecondPeriod') return 'piU2p';
  return 'piG2pStar';
};

const spinName = (spin) => spin === 1 ? 'spin-up' : 'spin-down';

function ScenarioRail({ scenarioId, onSelect }) {
  const families = useMemo(() => MO_SCENARIOS.reduce((result, scenario) => {
    if (!result[scenario.family]) result[scenario.family] = [];
    result[scenario.family].push(scenario);
    return result;
  }, {}), []);
  return (
    <section className="mo-scenarios mo-panel" aria-labelledby="moScenarioTitle">
      <div className="mo-panel-heading"><span>Diatomic signal bank · fifteen declared species</span><strong id="moScenarioTitle">Choose the electron count you want to interrogate</strong></div>
      <div className="mo-swipe-cue" aria-hidden="true">Swipe the species rail <b>→</b></div>
      <div className="mo-scenario-scroll">
        {Object.entries(families).map(([family, scenarios]) => (
          <div className="mo-scenario-family" key={family}>
            <span>{family}</span>
            <div>
              {scenarios.map((scenario) => (
                <button type="button" key={scenario.id} className={scenario.id === scenarioId ? 'selected' : ''} aria-pressed={scenario.id === scenarioId} onClick={() => onSelect(scenario.id)}>
                  <strong>{scenario.formula}</strong>
                  <small>{scenario.valenceElectronCount} e⁻</small>
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

function SpinCartridge({ selectedSpin, onSelect, metrics, scenario, onClear, onReference }) {
  return (
    <aside className="mo-cartridge mo-panel">
      <div className="mo-panel-heading"><span>Electron cartridge</span><strong>Choose a spin, then place it yourself</strong></div>
      <div className="mo-spin-selector" role="group" aria-label="Select electron spin">
        {[1, -1].map((spin) => <button type="button" key={spin} className={selectedSpin === spin ? 'selected' : ''} aria-pressed={selectedSpin === spin} onClick={() => onSelect(spin)}><i>{spin === 1 ? '↑' : '↓'}</i><span>{spinName(spin)}<small>mₛ = {spin === 1 ? '+1/2' : '−1/2'}</small></span></button>)}
      </div>
      <div className="mo-cartridge-meter">
        <span>Electrons mounted</span><strong>{metrics.electronCount}<i>/ {scenario.valenceElectronCount}</i></strong>
        <div><i style={{ width: `${Math.min(100, metrics.electronCount / scenario.valenceElectronCount * 100)}%` }}/></div>
      </div>
      <div className="mo-cartridge-actions"><button type="button" onClick={onClear}>Clear ladder</button><button type="button" className="reference" onClick={onReference}>Load declared reference</button></div>
      <p>Scenario changes begin empty. The reference button acts only when you request it and never changes your predictions.</p>
    </aside>
  );
}

function OrbitalComponent({ level, orbital, spins, selectedSpin, onPlace, onRemove }) {
  return (
    <div className={`mo-orbital-component ${spins.length === 2 ? 'full' : spins.length === 1 ? 'single' : 'empty'}`}>
      <span className="mo-axis">{level.degeneracy > 1 ? orbital.axis : level.source}</span>
      <div className="mo-placed-electrons">
        {spins.map((spin, electronIndex) => (
          <button type="button" key={`${spin}-${electronIndex}`} className={spin === 1 ? 'up' : 'down'} onClick={() => onRemove(orbital.id, electronIndex)} aria-label={`Remove ${spinName(spin)} electron from ${level.plainLabel}, ${orbital.axis} component`}><span>{spin === 1 ? '↑' : '↓'}</span><i>×</i></button>
        ))}
      </div>
      <button type="button" className="mo-place-electron" onClick={() => onPlace(orbital.id)} aria-label={`Add ${spinName(selectedSpin)} electron to ${level.plainLabel}, ${orbital.axis} component`}><span>add {selectedSpin === 1 ? '↑' : '↓'}</span></button>
    </div>
  );
}

function MoLadder({ scenario, ordering, state, metrics, selectedSpin, selectedLevelId, onSelectLevel, onPlace, onRemove, feedback }) {
  const sourceAos = ordering.id === 'oneS' ? ['1s'] : ['2p', '2s'];
  const reversed = [...ordering.levels].reverse();
  return (
    <section className="mo-ladder mo-panel" aria-labelledby="moLadderTitle">
      <div className="mo-ladder-topline">
        <div><span>AO → MO interference rack</span><strong id="moLadderTitle">{scenario.formula} · {ordering.shortName}</strong></div>
        <div className={`mo-feedback ${feedback?.kind || 'waiting'}`} aria-live="polite"><i/>{feedback?.reason || `Select ${spinName(selectedSpin)}, then choose an orbital component.`}</div>
      </div>
      <div className="mo-ladder-stage">
        <div className="mo-energy-axis" aria-hidden="true"><span>higher energy</span><i/><span>lower energy</span></div>
        <div className="mo-ao-rail left" aria-label={`Qualitative ${scenario.atomicSymbol} atomic-orbital sources on the left`}>
          <strong>{scenario.atomicSymbol}<small>atom A</small></strong>
          {sourceAos.map((source) => <div key={source}><span>{source}</span><i/><i/><i/></div>)}
        </div>
        <div className="mo-level-stack">
          {reversed.map((level) => (
            <article className={`mo-level ${level.character} ${level.id === selectedLevelId ? 'selected' : ''}`} key={level.id} data-level-id={level.id}>
              <button type="button" className="mo-level-label" onClick={() => onSelectLevel(level.id)} aria-pressed={level.id === selectedLevelId}>
                <strong>{level.label}</strong><span>{level.character}</span><small>{level.degeneracy === 2 ? 'two degenerate components' : `${level.symmetry} symmetry`}</small>
              </button>
              <div className="mo-level-line" aria-hidden="true"><i/><i/></div>
              <div className="mo-orbital-components">
                {level.orbitals.map((orbital) => <OrbitalComponent key={orbital.id} level={level} orbital={orbital} spins={state.occupancy[orbital.id]} selectedSpin={selectedSpin} onPlace={onPlace} onRemove={onRemove}/>) }
              </div>
              <b className="mo-level-population">{metrics.levelPopulations[level.id]}/{level.capacity}</b>
            </article>
          ))}
        </div>
        <div className="mo-ao-rail right" aria-label={`Qualitative ${scenario.atomicSymbol} atomic-orbital sources on the right`}>
          <strong>{scenario.atomicSymbol}<small>atom B</small></strong>
          {sourceAos.map((source) => <div key={source}><span>{source}</span><i/><i/><i/></div>)}
        </div>
      </div>
      <footer className="mo-ladder-ledger"><span><i className="bonding"/> {metrics.bondingElectrons} bonding e⁻</span><span><i className="antibonding"/> {metrics.antibondingElectrons} antibonding e⁻</span><span><i className="unpaired"/> {metrics.unpairedElectrons} unpaired</span><strong>{moConfigurationNotation({ scenarioId: scenario.id, state })}</strong></footer>
      <p className="mo-core-note"><b>Displayed-electron boundary</b>{ordering.coreStatement}</p>
    </section>
  );
}

function SigmaSGraphic({ bonding, source }) {
  return <g className="mo-wave-art sigma-s">
    <ellipse className="phase-a" cx="265" cy="205" rx={source === '1s' ? 92 : 116} ry={source === '1s' ? 92 : 105}/>
    <ellipse className={bonding ? 'phase-a' : 'phase-b'} cx="495" cy="205" rx={source === '1s' ? 92 : 116} ry={source === '1s' ? 92 : 105}/>
    {source === '2s' && <><ellipse className="phase-b inner" cx="265" cy="205" rx="42" ry="38"/><ellipse className={`${bonding ? 'phase-b' : 'phase-a'} inner`} cx="495" cy="205" rx="42" ry="38"/></>}
    {bonding && <ellipse className="overlap" cx="380" cy="205" rx="128" ry="63"/>}
    <text x="265" y="210" textAnchor="middle">+</text><text x="495" y="210" textAnchor="middle">{bonding ? '+' : '−'}</text>
  </g>;
}

function SigmaPGraphic({ bonding }) {
  return <g className="mo-wave-art sigma-p">
    <ellipse className="phase-b" cx="174" cy="205" rx="68" ry="45"/><ellipse className="phase-a" cx="298" cy="205" rx="77" ry="50"/>
    <ellipse className={bonding ? 'phase-a' : 'phase-b'} cx="462" cy="205" rx="77" ry="50"/><ellipse className={bonding ? 'phase-b' : 'phase-a'} cx="586" cy="205" rx="68" ry="45"/>
    {bonding && <ellipse className="overlap" cx="380" cy="205" rx="111" ry="42"/>}
    <text x="298" y="210" textAnchor="middle">+</text><text x="462" y="210" textAnchor="middle">{bonding ? '+' : '−'}</text>
  </g>;
}

function PiGraphic({ bonding }) {
  return <g className="mo-wave-art pi-p">
    <ellipse className="phase-a" cx="284" cy="123" rx="55" ry="78"/><ellipse className="phase-b" cx="284" cy="287" rx="55" ry="78"/>
    <ellipse className={bonding ? 'phase-a' : 'phase-b'} cx="476" cy="123" rx="55" ry="78"/><ellipse className={bonding ? 'phase-b' : 'phase-a'} cx="476" cy="287" rx="55" ry="78"/>
    {bonding && <><ellipse className="overlap top" cx="380" cy="126" rx="115" ry="45"/><ellipse className="overlap bottom" cx="380" cy="284" rx="115" ry="45"/></>}
    <path className="pi-node" d="M155 205H605"/>
    <text x="284" y="128" textAnchor="middle">+</text><text x="476" y="128" textAnchor="middle">{bonding ? '+' : '−'}</text>
  </g>;
}

function PhaseScope({ descriptor, population, onSelectCharacter }) {
  const bonding = descriptor.character === 'bonding';
  return (
    <section className="mo-phase-scope mo-panel" aria-labelledby="moScopeTitle">
      <div className="mo-scope-topline"><div><span>Selected-orbital phase scope</span><strong id="moScopeTitle">{descriptor.label} · {descriptor.character}</strong></div><b>{population}/{descriptor.level.capacity} e⁻</b></div>
      <svg viewBox="0 0 760 410" role="img" aria-labelledby="moWaveTitle moWaveDesc">
        <title id="moWaveTitle">Qualitative phase interference for {descriptor.label}</title>
        <desc id="moWaveDesc">Phase-coloured atomic-orbital silhouettes combine into a {descriptor.character} molecular orbital with {descriptor.internuclearNode ? 'an internuclear node' : 'constructive internuclear amplitude'}.</desc>
        <defs>
          <pattern id="mo-scope-grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30"/></pattern>
          <filter id="mo-phase-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <linearGradient id="mo-overlap-gradient"><stop offset="0" stopColor="#5fd5ff" stopOpacity=".14"/><stop offset=".5" stopColor="#72f6cf" stopOpacity=".75"/><stop offset="1" stopColor="#5fd5ff" stopOpacity=".14"/></linearGradient>
        </defs>
        <rect className="scope-field" width="760" height="410" rx="18"/><rect className="scope-grid" width="760" height="410" rx="18"/>
        <g className="scope-axis" aria-hidden="true"><path d="M72 205H688"/><path d="M380 45V365"/><circle cx="265" cy="205" r="8"/><circle cx="495" cy="205" r="8"/></g>
        {descriptor.symmetry === 'pi' ? <PiGraphic bonding={bonding}/> : descriptor.source === '2p' ? <SigmaPGraphic bonding={bonding}/> : <SigmaSGraphic bonding={bonding} source={descriptor.source}/>}
        {descriptor.internuclearNode && <g className="mo-node-shutter" filter="url(#mo-phase-glow)"><rect x="371" y="61" width="18" height="288" rx="8"/><text x="400" y="78">internuclear node</text></g>}
        <g className="mo-nuclei"><circle cx="265" cy="205" r="12"/><circle cx="495" cy="205" r="12"/></g>
        <g className="mo-phase-key"><circle className="phase-a" cx="50" cy="365" r="8"/><text x="65" y="369">+ phase</text><circle className="phase-b" cx="135" cy="365" r="8"/><text x="150" y="369">− phase</text></g>
      </svg>
      <div className="mo-scope-readout"><div><span>Symmetry</span><strong>{descriptor.symmetry === 'sigma' ? 'σ · axial' : 'π · axial nodal plane'}</strong></div><div><span>Facing phase</span><strong>{descriptor.phaseRelationship}</strong></div><div><span>Internuclear node</span><strong>{descriptor.internuclearNode ? 'present' : 'absent'}</strong></div><div><span>Occupation effect</span><strong>{descriptor.character === 'bonding' ? 'increases bonding' : 'decreases bonding'}</strong></div></div>
      <p>{descriptor.boundary}</p>
      <button type="button" className="mo-scope-jump" onClick={onSelectCharacter}>Select the nearest {descriptor.character === 'bonding' ? 'antibonding' : 'bonding'} level</button>
    </section>
  );
}

function BondMagnet({ scenario, metrics, evaluation }) {
  const revealed = Boolean(evaluation);
  const cableWidth = Math.max(3, Math.min(18, 3 + Math.max(0, metrics.bondOrder) * 4));
  const magneticClass = revealed ? evaluation.magnetism.actual : 'sealed';
  return (
    <section className="mo-instruments mo-panel" aria-label="Bond order and magnetic response instruments">
      <div className="mo-bond-instrument">
        <span>Formal bond-tension ledger</span><strong>{revealed ? metrics.bondOrder.toFixed(1) : 'sealed'}</strong>
        <svg viewBox="0 0 360 150" role="img" aria-label={revealed ? `Formal bond order ${metrics.bondOrder}` : 'Formal bond order is sealed until checking'}>
          <circle cx="85" cy="73" r="35"/><circle cx="275" cy="73" r="35"/><line x1="120" y1="73" x2="240" y2="73" style={{ strokeWidth: revealed ? cableWidth : 3 }}/><text x="85" y="80" textAnchor="middle">{scenario.atomicSymbol}</text><text x="275" y="80" textAnchor="middle">{scenario.atomicSymbol}</text><text x="180" y="128" textAnchor="middle">{metrics.bondingElectrons} bonding − {metrics.antibondingElectrons} antibonding</text>
        </svg>
        <p>{revealed ? `(${metrics.bondingElectrons} − ${metrics.antibondingElectrons}) / 2 = ${metrics.bondOrder.toFixed(1)}` : 'Commit your prediction to reveal the displayed ledger result.'}</p>
      </div>
      <div className={`mo-magnet-instrument ${magneticClass}`}>
        <span>Spin-only magnetic gate</span><strong>{revealed ? magneticClass : 'sealed'}</strong>
        <div className="mo-magnet-stage"><div className="mo-horseshoe"><b>N</b><i/><b>S</b></div><div className="mo-magnetic-sample"><span>{scenario.formula}</span><div>{Array.from({ length: Math.min(metrics.unpairedElectrons, 4) }, (_, index) => <i key={index}>↑</i>)}</div></div><em>field</em></div>
        <p>{revealed ? `${metrics.unpairedElectrons} singly occupied component${metrics.unpairedElectrons === 1 ? '' : 's'} in the displayed ladder.` : 'Predict before the field response is shown.'}</p>
      </div>
    </section>
  );
}

function Dimension({ label, dimension }) {
  if (!dimension) return <div className="waiting"><span>{label}</span><strong>waiting</strong><p>Commit a check when ready.</p></div>;
  return <div className={dimension.correct ? 'correct' : 'incorrect'}><span>{label}</span><strong>{dimension.correct ? 'resolved' : 'inspect'}</strong><p>{dimension.reason}</p></div>;
}

function PredictionConsole({ predictions, onPrediction, onCheck, onHint, hint, evaluation }) {
  return (
    <aside className="mo-prediction mo-panel">
      <div className="mo-panel-heading"><span>Prediction console</span><strong>Read your own occupation before asking the model</strong></div>
      <div className="mo-number-predictions"><label><span>Formal bond order</span><input type="number" min="-4" max="4" step="0.5" value={predictions.bondOrder} onChange={(event) => onPrediction('bondOrder', event.target.value)} placeholder="e.g. 2"/></label><label><span>Unpaired electrons</span><input type="number" min="0" max="16" step="1" value={predictions.unpaired} onChange={(event) => onPrediction('unpaired', event.target.value)} placeholder="0–16"/></label></div>
      <fieldset><legend>Magnetic classification</legend>{['paramagnetic', 'diamagnetic'].map((value) => <button type="button" key={value} className={predictions.magnetism === value ? 'selected' : ''} aria-pressed={predictions.magnetism === value} onClick={() => onPrediction('magnetism', value)}><i/>{value}</button>)}</fieldset>
      <div className="mo-check-actions"><button type="button" className="commit" onClick={onCheck}>Check my ladder</button><button type="button" onClick={onHint}>Reveal one hint</button></div>
      {hint && <p className="mo-hint"><b>Hint {hint.level}/5</b>{hint.message}<small>{hint.boundary}</small></p>}
      <div className="mo-dimensions" aria-live="polite">
        <Dimension label="Electron count" dimension={evaluation?.electronCount}/><Dimension label="Level population" dimension={evaluation?.levelPopulation}/><Dimension label="Aufbau order" dimension={evaluation?.aufbau}/><Dimension label="Hund pattern" dimension={evaluation?.hund}/><Dimension label="Bond order" dimension={evaluation?.bondOrder}/><Dimension label="Unpaired count" dimension={evaluation?.unpaired}/><Dimension label="Magnetism" dimension={evaluation?.magnetism}/>
      </div>
      {evaluation && <div className={`mo-verdict ${evaluation.committed ? 'correct' : 'inspect'}`}><span>{evaluation.committed ? 'Declared reference resolved' : 'Keep inspecting'}</span><strong>{evaluation.committed ? 'Every occupation and interpretation dimension agrees.' : 'Nothing was moved, re-spun, or corrected for you.'}</strong></div>}
    </aside>
  );
}

function OrderingComparator({ currentOrderingId }) {
  const comparison = compareMoOrderings();
  const relevantIds = ['sigmaU2pStar', 'piG2pStar', 'sigmaG2p', 'piU2p'];
  const MiniLadder = ({ ordering, tone }) => <div className={`mo-mini-ladder ${tone} ${currentOrderingId === ordering.id ? 'current' : ''}`}><span>{ordering.shortName}</span><strong>{ordering.id === 'earlySecondPeriod' ? 'Li₂ → N₂' : 'O₂ → Ne₂'}</strong><div>{[...ordering.levels].reverse().filter((level) => relevantIds.includes(level.id)).map((level) => <p className={level.id === 'piU2p' || level.id === 'sigmaG2p' ? 'crossover' : ''} key={level.id}><i/><b>{level.label}</b><small>{level.degeneracy === 2 ? '×2' : '×1'}</small></p>)}</div></div>;
  return (
    <section className="mo-ordering mo-panel" aria-labelledby="moOrderingTitle">
      <div className="mo-panel-heading"><span>Ordering comparator</span><strong id="moOrderingTitle">Watch only one 2p relationship cross</strong></div>
      <div className="mo-ordering-grid"><MiniLadder ordering={MO_ORDERINGS.earlySecondPeriod} tone="early"/><div className="mo-crossover-mark" aria-hidden="true"><span>π</span><i/><b>⇄</b><i/><span>σ</span></div><MiniLadder ordering={MO_ORDERINGS.lateSecondPeriod} tone="late"/></div>
      <p>{comparison.crossover.reason} These are qualitative declared ladders, not numerical orbital energies.</p>
    </section>
  );
}

function MoTrace({ entries }) {
  return (
    <aside className="mo-trace mo-panel">
      <div className="mo-panel-heading"><span>Learning trace</span><strong>Your occupation choices remain inspectable</strong></div>
      <div className="mo-trace-list">{entries.map((entry) => <article className={entry.kind} key={entry.id}><i/><span>{entry.kind}</span><strong>{entry.title}</strong><p>{entry.detail}</p></article>)}</div>
      <details className="mo-teacher-lens"><summary>Open teacher lens <span>+</span></summary><ol><li>Compare H₂⁺, H₂, and He₂. Which electron changes the formal bond order, and why does zero not prove that every intermolecular interaction vanishes?</li><li>Build B₂, C₂, and N₂. How can the same early 2p ordering produce paramagnetic, diamagnetic, and order-three results?</li><li>Compare O₂⁺, O₂, O₂⁻, and O₂²⁻. Which specific antibonding occupation changes each half-step in formal bond order?</li><li>Compare N₂, O₂, and F₂. Where does the qualitative 2p crossover matter, and where does simple bond-order bookkeeping stop being a measured bond property?</li></ol></details>
    </aside>
  );
}

function MoPassport() {
  const passport = MODEL_PASSPORTS.molecularOrbitalInterferometer;
  return (
    <aside className="mo-passport mo-panel">
      <div className="mo-passport-intro"><div className="mo-panel-heading"><span>Model passport</span><strong>{passport.name}</strong></div><div className="mo-passport-verdict"><i/>{passport.resultKind}</div><p>{passport.inputProvenance}</p><p>{passport.dataStatement}</p><p className="mo-complementarity">{MO_MODEL_BOUNDARY.complementarity}</p></div>
      <div className="mo-passport-claims"><div><span>Included</span>{passport.includes.map((item) => <b key={item}>{item}</b>)}</div><div className="excluded"><span>Not included</span>{passport.excludes.map((item) => <b key={item}>{item}</b>)}</div></div>
      <div className="mo-passport-sources"><span>Reference basis</span>{passport.sources.map((sourceId) => { const source = SCIENCE_SOURCES[sourceId]; return <a href={source.url} target="_blank" rel="noreferrer" key={source.id}><strong>{source.name}</strong><small>{source.role}</small><b aria-hidden="true">↗</b></a>; })}</div>
    </aside>
  );
}

export default function MolecularOrbitalLab() {
  const [scenarioId, setScenarioId] = useState('oxygen');
  const scenario = MO_SCENARIO_BY_ID[scenarioId];
  const ordering = MO_ORDERINGS[scenario.orderingId];
  const [state, setState] = useState(() => createEmptyMoState('oxygen').state);
  const [selectedSpin, setSelectedSpin] = useState(1);
  const [selectedLevelId, setSelectedLevelId] = useState('piG2pStar');
  const [predictions, setPredictions] = useState({ bondOrder: '', unpaired: '', magnetism: '' });
  const [evaluation, setEvaluation] = useState(null);
  const [hint, setHint] = useState(null);
  const [feedback, setFeedback] = useState({ kind: 'waiting', reason: 'Select a spin cartridge, then choose an orbital component.' });
  const [entries, setEntries] = useState(() => [activity('start', 'O₂ ladder opened empty', 'Twelve valence electrons remain in the cartridge; no orbital was filled automatically.')]);
  const metrics = useMemo(() => moStateMetrics({ scenarioId, state }), [scenarioId, state]);
  const descriptor = useMemo(() => moWaveDescriptor({ scenarioId, levelId: selectedLevelId }), [scenarioId, selectedLevelId]);
  const record = (kind, title, detail) => setEntries((current) => [activity(kind, title, detail), ...current]);
  const invalidate = () => { setEvaluation(null); setHint(null); };

  const chooseScenario = (nextId) => {
    if (nextId === scenarioId) return;
    const nextScenario = MO_SCENARIO_BY_ID[nextId];
    setScenarioId(nextId); setState(createEmptyMoState(nextId).state); setSelectedLevelId(focusLevelFor(nextScenario)); setPredictions({ bondOrder: '', unpaired: '', magnetism: '' }); setEvaluation(null); setHint(null);
    setFeedback({ kind: 'waiting', reason: `${nextScenario.formula} loaded with an empty ${nextScenario.valenceElectronCount}-electron ladder.` });
    record('scenario', `${nextScenario.formula} scenario selected`, 'Occupation and predictions were explicitly reset for the new declared species.');
  };
  const selectSpin = (spin) => { setSelectedSpin(spin); setFeedback({ kind: 'ready', reason: `${spinName(spin)} cartridge armed. Choose any displayed orbital component.` }); record('select', `${spinName(spin)} selected`, 'Selecting a cartridge does not place an electron.'); };
  const selectLevel = (levelId) => { setSelectedLevelId(levelId); const level = ordering.levels.find((item) => item.id === levelId); record('scope', `${level.label} sent to phase scope`, `The ${level.character} ${level.symmetry} silhouette is qualitative.`); };
  const place = (orbitalId) => {
    const level = ordering.levels.find((item) => item.orbitals.some((orbital) => orbital.id === orbitalId));
    setSelectedLevelId(level.id);
    const result = placeMoElectron({ scenarioId, state, orbitalId, spin: selectedSpin });
    setFeedback({ kind: result.allowed ? 'allowed' : 'blocked', reason: result.reason }); record(result.allowed ? 'placed' : 'blocked', result.allowed ? `${selectedSpin === 1 ? '↑' : '↓'} placed in ${level.label}` : `Placement blocked in ${level.label}`, result.reason);
    if (!result.allowed) return; setState(result.state); invalidate();
  };
  const remove = (orbitalId, electronIndex) => {
    const result = removeMoElectron({ scenarioId, state, orbitalId, electronIndex }); setFeedback({ kind: result.allowed ? 'allowed' : 'blocked', reason: result.reason }); record(result.allowed ? 'removed' : 'blocked', result.allowed ? `${result.spin === 1 ? '↑' : '↓'} removed` : 'Removal blocked', result.reason); if (!result.allowed) return; setState(result.state); invalidate();
  };
  const clear = () => { setState(createEmptyMoState(scenarioId).state); setEvaluation(null); setHint(null); setFeedback({ kind: 'waiting', reason: 'Ladder cleared by learner request; predictions remain visible.' }); record('reset', `${scenario.formula} ladder cleared`, 'Every spin arrow returned to the cartridge.'); };
  const loadReference = () => { setState(buildReferenceMoState(scenarioId).state); setEvaluation(null); setHint(null); setFeedback({ kind: 'reference', reason: `Declared ${scenario.formula} reference loaded because you requested it.` }); record('reference', `${scenario.formula} reference loaded`, 'The explicit reveal changed occupation only; predictions were not changed or checked.'); };
  const updatePrediction = (key, value) => { setPredictions((current) => ({ ...current, [key]: value })); setEvaluation(null); };
  const check = () => {
    const missing = Object.entries(predictions).filter(([, value]) => value === '').map(([key]) => key);
    if (missing.length) { const reason = 'Commit bond order, unpaired count, and magnetic classification before checking.'; setFeedback({ kind: 'blocked', reason }); record('blocked', 'Prediction check held', `${missing.length} prediction field${missing.length === 1 ? ' is' : 's are'} still empty.`); return; }
    const result = evaluateMoConfiguration({ scenarioId, state, predictions }); setEvaluation(result); setFeedback({ kind: result.committed ? 'allowed' : 'inspect', reason: result.committed ? 'Every occupation and interpretation dimension agrees.' : 'The ladder and predictions remain unchanged; inspect each reason separately.' }); record(result.committed ? 'correct' : 'inspect', result.committed ? `${scenario.formula} reference resolved` : `${scenario.formula} ladder checked`, result.committed ? 'Count, populations, Aufbau, Hund, bond order, unpaired count, and magnetism agree.' : 'No electron was moved, paired, or re-spun automatically.');
  };
  const revealHint = () => { const nextLevel = hint ? Math.min(5, hint.level + 1) : 1; const next = nextMoHint({ scenarioId, state, level: nextLevel }); setHint(next); record('hint', `Hint ${nextLevel} revealed`, next.message); };
  const selectOppositeCharacter = () => {
    const candidates = ordering.levels
      .filter((level) => level.character !== descriptor.character)
      .sort((left, right) => {
        const leftSourcePenalty = left.source === descriptor.source ? 0 : 100;
        const rightSourcePenalty = right.source === descriptor.source ? 0 : 100;
        const leftDistance = Math.abs(left.energyRank - descriptor.level.energyRank);
        const rightDistance = Math.abs(right.energyRank - descriptor.level.energyRank);
        const leftSymmetryPenalty = left.symmetry === descriptor.symmetry ? 0 : 0.1;
        const rightSymmetryPenalty = right.symmetry === descriptor.symmetry ? 0 : 0.1;
        return (leftSourcePenalty + leftDistance + leftSymmetryPenalty)
          - (rightSourcePenalty + rightDistance + rightSymmetryPenalty);
      });
    selectLevel(candidates[0].id);
  };

  return (
    <section className="mo-lab" id="molecularOrbitalLab" aria-labelledby="molecularOrbitalLabTitle">
      <header className="mo-header"><div><p className="section-code">05 / Molecular orbitals & bonding</p><h2 id="molecularOrbitalLabTitle">Combine the phase. Then earn the bond.</h2><p>Place every spin arrow into a qualitative molecular-orbital ladder, inspect constructive versus nodal overlap, and make bond order and magnetism answer to the occupation you built.</p></div><div className="mo-condition-stamp"><span>Bonding interferometer</span><strong>15 diatomic signals · 3 declared ladders</strong><small>Manual occupation · no automatic filling · local evidence</small><b>{metrics.electronCount}/{scenario.valenceElectronCount} e⁻ mounted</b></div></header>
      <div className="mo-bench">
        <ScenarioRail scenarioId={scenarioId} onSelect={chooseScenario}/>
        <SpinCartridge selectedSpin={selectedSpin} onSelect={selectSpin} metrics={metrics} scenario={scenario} onClear={clear} onReference={loadReference}/>
        <MoLadder scenario={scenario} ordering={ordering} state={state} metrics={metrics} selectedSpin={selectedSpin} selectedLevelId={selectedLevelId} onSelectLevel={selectLevel} onPlace={place} onRemove={remove} feedback={feedback}/>
        <PhaseScope descriptor={descriptor} population={metrics.levelPopulations[selectedLevelId]} onSelectCharacter={selectOppositeCharacter}/>
        <BondMagnet scenario={scenario} metrics={metrics} evaluation={evaluation}/>
        <PredictionConsole predictions={predictions} onPrediction={updatePrediction} onCheck={check} onHint={revealHint} hint={hint} evaluation={evaluation}/>
        <OrderingComparator currentOrderingId={ordering.id}/>
        <MoTrace entries={entries}/>
        <MoPassport/>
      </div>
    </section>
  );
}
