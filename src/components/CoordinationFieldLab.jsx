import { useMemo, useState } from 'react';
import { COORDINATION_GEOMETRIES, COORDINATION_GEOMETRY_LIST, METAL_ION_PRESETS, ORBITAL_VISUALS } from '../data/coordinationScenarios.js';
import {
  configurationMetrics, deriveDCount, evaluateConfiguration, findGroundConfiguration,
  groupOccupationNotation, nextCoordinationHint, toggleOrbitalOccupancy,
} from '../chemistry/coordinationField.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../data/scienceSources.js';

let coordinationActivityId = 0;
const activity = (kind, title, detail) => ({ id: ++coordinationActivityId, kind, title, detail });
const keyActivate = (event, callback) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); callback(); } };
const value = (numberValue, digits = 2) => Number.isFinite(numberValue) ? numberValue.toLocaleString(undefined, { maximumFractionDigits: digits }) : '—';
const occupancyText = (occupancy) => occupancy === 0 ? 'empty' : occupancy === 1 ? 'one unpaired electron' : 'two paired electrons';

function IonShelf({ ion, onChoose, geometry, onGeometry }) {
  const derivation = deriveDCount({ group: ion.group, oxidation: ion.oxidation });
  return <aside className="coordination-ion-shelf coordination-panel">
    <div className="coordination-panel-heading"><span>First-row ion deck</span><strong>Choose the d-electron count</strong></div>
    <div className="ion-preset-grid">{METAL_ION_PRESETS.map((item) => <button type="button" className={item.id === ion.id ? 'active' : ''} key={item.id} onClick={() => onChoose(item)}><span>{item.symbol}</span><div><strong>{item.label}</strong><small>{item.name}</small></div><b>d{item.dCount}</b></button>)}</div>
    <div className="d-count-proof"><span>IUPAC preset relation</span><strong>{derivation.relation}</strong><p>For these declared common ions only. Ambiguous oxidation states and non-innocent ligands are outside this deck.</p></div>
    <div className="coordination-geometry-picker"><span>Coordination polyhedron</span>{COORDINATION_GEOMETRY_LIST.map((item) => <button type="button" className={item.id === geometry.id ? 'active' : ''} key={item.id} onClick={() => onGeometry(item)}><i>{item.shortName}</i><div><strong>{item.name}</strong><small>{item.coordinationNumber} ideal donor positions</small></div></button>)}</div>
  </aside>;
}

function OrbitalLobes({ orbital }) {
  const visual = ORBITAL_VISUALS[orbital.id];
  if (visual.kind === 'z2') return <g className="selected-orbital-lobes z2"><ellipse cx="450" cy="188" rx="34" ry="72"/><ellipse cx="450" cy="372" rx="34" ry="72"/><ellipse className="torus" cx="450" cy="280" rx="82" ry="27"/><ellipse className="torus-hole" cx="450" cy="280" rx="45" ry="13"/></g>;
  return <g className={`selected-orbital-lobes four ${visual.plane}`} transform={`rotate(${visual.rotation} 450 280)`}><ellipse cx="450" cy="190" rx="31" ry="70"/><ellipse cx="450" cy="370" rx="31" ry="70"/><ellipse cx="360" cy="280" rx="70" ry="31"/><ellipse cx="540" cy="280" rx="70" ry="31"/></g>;
}

function CoordinationObservatory({ ion, geometry, selectedOrbital }) {
  const orbital = geometry.orbitals.find((item) => item.id === selectedOrbital) || geometry.orbitals[0];
  const visual = ORBITAL_VISUALS[orbital.id];
  const ligands = [...geometry.ligands].sort((a, b) => a.depth - b.depth);
  return <section className="coordination-observatory coordination-panel">
    <div className="observatory-topline"><span><i/> coordination observatory</span><b>{ion.label} · {geometry.name} · selected {visual.label}</b></div>
    <svg viewBox="0 0 900 560" className="coordination-observatory-svg" role="img" aria-label={`${ion.label}, ideal ${geometry.name} coordination with ${geometry.coordinationNumber} ligand positions. Selected orbital ${visual.label}: ${visual.description}`}>
      <defs>
        <radialGradient id="coordMetal" cx="32%" cy="25%"><stop offset="0" stopColor="#f8feff"/><stop offset=".28" stopColor="#61e4f5"/><stop offset="1" stopColor="#1d6f91"/></radialGradient>
        <radialGradient id="coordLigand" cx="32%" cy="25%"><stop offset="0" stopColor="#fff9d9"/><stop offset=".3" stopColor="#ffd166"/><stop offset="1" stopColor="#9e690e"/></radialGradient>
        <linearGradient id="orbitalFill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#c7bfff" stopOpacity=".9"/><stop offset="1" stopColor="#7a67e8" stopOpacity=".43"/></linearGradient>
        <filter id="coordGlow"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <g className="observatory-field"><circle cx="450" cy="280" r="220"/><circle cx="450" cy="280" r="160"/><path d="M100 280 H800 M450 35 V525"/><ellipse cx="450" cy="280" rx="310" ry="120"/></g>
      <g className="coordination-bonds">{ligands.map((ligand) => { const x = 50 + ligand.x * 800, y = 25 + ligand.y * 480; return <line key={ligand.id} x1="450" y1="280" x2={x} y2={y} className={ligand.depth > 0 ? 'front' : 'back'}/>; })}</g>
      <OrbitalLobes orbital={orbital}/>
      <g className="coordination-ligands">{ligands.map((ligand) => { const x = 50 + ligand.x * 800, y = 25 + ligand.y * 480; return <g key={ligand.id} className={ligand.depth > 0 ? 'front' : 'back'} transform={`translate(${x} ${y})`}><circle className="ligand-shadow" cy="7" r="29"/><circle className="ligand-sphere" r="26"/><circle className="ligand-shine" cx="-8" cy="-9" r="5"/><text y="6" textAnchor="middle">L</text></g>; })}</g>
      <g className="coordination-metal" transform="translate(450 280)"><circle className="metal-aura" r="72"/><circle className="metal-sphere" r="52"/><circle className="metal-shine" cx="-16" cy="-18" r="9"/><text y="8" textAnchor="middle">{ion.symbol}</text><text className="metal-charge" x="40" y="-37">{ion.oxidation}+</text></g>
      <g className="coord-axis"><path d="M95 475 h52 M95 475 v-52 M95 475 l-31 25"/><text x="154" y="480">x</text><text x="91" y="415">y</text><text x="53" y="510">z</text></g>
      <text className="observatory-caption" x="450" y="538" textAnchor="middle">ideal donor positions · orbital lobes are schematic signs and orientations</text>
    </svg>
    <div className="selected-orbital-readout"><span>Selected orbital</span><strong>{visual.label}</strong><p>{visual.description}</p><b>{orbital.group} · {orbital.coefficient > 0 ? '+' : ''}{orbital.coefficient}Δ</b></div>
    <div className="geometry-boundary"><span>{geometry.quantitativeStatus}</span><p>{geometry.boundary}</p></div>
  </section>;
}

function ElectronGlyphs({ occupancy }) {
  return <span className="electron-glyphs" aria-hidden="true"><i className={occupancy >= 1 ? 'filled up' : ''}>{occupancy >= 1 ? '↑' : ''}</i><i className={occupancy === 2 ? 'filled down' : ''}>{occupancy === 2 ? '↓' : ''}</i></span>;
}

function OrbitalLadder({ geometry, configuration, selectedOrbital, onOrbital, ion, onClear, onHint, hintLevel, onReference, onCheck }) {
  const levelMap = new Map();
  geometry.orbitals.forEach((orbital, index) => { const key = orbital.coefficient; if (!levelMap.has(key)) levelMap.set(key, []); levelMap.get(key).push({ ...orbital, index }); });
  const levels = [...levelMap.entries()].map(([coefficient, orbitals]) => ({ coefficient: Number(coefficient), orbitals })).sort((a, b) => b.coefficient - a.coefficient);
  const max = Math.max(...levels.map((level) => level.coefficient)), min = Math.min(...levels.map((level) => level.coefficient)), span = max - min || 1;
  const electronTotal = configuration.reduce((sum, item) => sum + item, 0);
  return <aside className="coordination-ladder coordination-panel">
    <div className="coordination-panel-heading"><span>Manual d-orbital ladder</span><strong>Place all {ion.dCount} electrons yourself</strong></div>
    <div className="electron-total"><span>Placed</span><strong>{electronTotal} / {ion.dCount}</strong><i><b style={{ width: `${ion.dCount ? electronTotal / ion.dCount * 100 : 100}%` }}/></i></div>
    <div className={`orbital-ladder-field ${geometry.id}`}>{levels.map((level) => { const top = 28 + (max - level.coefficient) / span * 315; return <div className="orbital-energy-level" key={level.coefficient} style={{ top }}><div className="level-label"><span>{level.orbitals[0].group}</span><b>{level.coefficient > 0 ? '+' : ''}{level.coefficient}Δ</b></div><div className="level-line"/><div className="level-orbitals">{level.orbitals.map((orbital) => { const occupancy = configuration[orbital.index]; return <button type="button" key={orbital.id} className={`${orbital.id === selectedOrbital ? 'selected' : ''} occupancy-${occupancy}`} aria-label={`${ORBITAL_VISUALS[orbital.id].label}: ${occupancyText(occupancy)}. Activate to cycle occupancy.`} onClick={() => onOrbital(orbital)} onFocus={() => onOrbital(orbital, true)}><strong>{ORBITAL_VISUALS[orbital.id].label}</strong><ElectronGlyphs occupancy={occupancy}/><small>{occupancyText(occupancy)}</small></button>; })}</div></div>; })}<div className="delta-bracket"><i/><span>Δ</span></div><div className="ladder-energy-axis"><i/> energy</div></div>
    <div className="ladder-actions"><button type="button" className="btn ghost" onClick={onClear} disabled={!electronTotal}>Clear electrons</button><button type="button" className="btn primary" onClick={onCheck}>Check my occupation</button></div>
    <div className="ladder-support-actions"><button type="button" onClick={onHint}>Show {hintLevel < 3 ? `hint ${hintLevel + 1}` : 'full hint again'}</button><button type="button" onClick={onReference}>Load model reference</button></div>
    <p className="orbital-cycle-note"><strong>Click cycle</strong> empty → ↑ → ↑↓ → empty. A seventh electron is blocked when a d6 ion already has six placed.</p>
  </aside>;
}

function CompetitionPanel({ deltaKJmol, setDeltaKJmol, pairingKJmol, setPairingKJmol, ground, onParameterChange }) {
  const maximum = Math.max(deltaKJmol, pairingKJmol, 1);
  const setDelta = (next) => { setDeltaKJmol(next); onParameterChange('Delta', next); };
  const setPairing = (next) => { setPairingKJmol(next); onParameterChange('Pairing energy', next); };
  return <section className="coordination-competition coordination-panel">
    <div className="coordination-panel-heading"><span>Field versus pairing competition</span><strong>Change the costs; do not erase the learner's occupation</strong></div>
    <div className="competition-layout"><div className="competition-controls"><label><span>Splitting Δ</span><div><input type="number" min="25" max="400" step="5" value={deltaKJmol} onChange={(event) => setDelta(Number(event.target.value))}/><b>kJ mol⁻¹</b></div><input type="range" min="25" max="400" step="5" value={deltaKJmol} onChange={(event) => setDelta(Number(event.target.value))}/></label><label><span>Pairing energy P</span><div><input type="number" min="25" max="400" step="5" value={pairingKJmol} onChange={(event) => setPairing(Number(event.target.value))}/><b>kJ mol⁻¹</b></div><input type="range" min="25" max="400" step="5" value={pairingKJmol} onChange={(event) => setPairing(Number(event.target.value))}/></label></div>
      <div className="competition-columns"><div className="delta-column"><i style={{ height: `${deltaKJmol / maximum * 100}%` }}/><span>Δ</span><strong>{deltaKJmol}</strong></div><div className="pairing-column"><i style={{ height: `${pairingKJmol / maximum * 100}%` }}/><span>P</span><strong>{pairingKJmol}</strong></div><div className="competition-sign">{deltaKJmol > pairingKJmol ? 'Δ > P' : deltaKJmol < pairingKJmol ? 'Δ < P' : 'Δ = P'}</div></div>
      <div className="ground-preview"><span>Enumerated model minimum</span><h3>{ground.notation}</h3><p>{ground.spinPattern}; {ground.metrics.unpairedElectrons} unpaired and {ground.metrics.pairCount} paired orbital{ground.metrics.pairCount === 1 ? '' : 's'}.</p><div><b>{value(ground.metrics.gapEquivalentWavelengthNm, 0)} nm</b><small>photon wavelength matching one Δ energy only—not a spectrum or colour prediction</small></div></div>
    </div>
  </section>;
}

function ConfigurationResult({ feedback, entered, ground, result }) {
  const status = result ? result.committed ? 'success' : 'blocked' : feedback.kind;
  return <section className={`coordination-result coordination-panel ${status}`}>
    <div className="coordination-panel-heading"><span>Configuration ledger</span><strong>Separate field benefit from pairing cost</strong></div>
    <div className={`coordination-feedback ${feedback.kind}`} aria-live="polite"><span>{feedback.title}</span><p>{feedback.detail}</p></div>
    <div className="configuration-comparison"><div><span>Your occupation</span><strong>{groupOccupationNotation(entered.geometryId, entered.configuration)}</strong><small>{entered.electronCount} electrons · {entered.unpairedElectrons} unpaired</small></div><i>↔</i><div><span>Model minimum</span><strong>{ground.notation}</strong><small>{ground.metrics.unpairedElectrons} unpaired · {ground.spinPattern}</small></div></div>
    <div className="configuration-metrics"><div><span>Field contribution</span><strong>{value(entered.fieldEnergyKJmol, 1)}</strong><small>kJ mol⁻¹</small></div><div><span>Pairing cost</span><strong>+{value(entered.pairingEnergyKJmol, 1)}</strong><small>{entered.pairCount} × P</small></div><div><span>Total model energy</span><strong>{value(entered.modelEnergyKJmol, 1)}</strong><small>field + pairing</small></div><div><span>Unpaired</span><strong>{entered.unpairedElectrons}</strong><small>S = {value(entered.spinS, 1)}</small></div><div><span>Multiplicity</span><strong>{entered.spinMultiplicity}</strong><small>2S + 1</small></div><div><span>Spin-only μ</span><strong>{value(entered.spinOnlyMomentBM, 2)}</strong><small>μB estimate</small></div></div>
    <p className="magnetic-boundary">Spin-only μ = √[n(n+2)] is a classroom estimate from unpaired count. It is not measured susceptibility and excludes orbital, spin-orbit, exchange, field, and temperature effects.</p>
    {result && <div className={`check-result ${result.committed ? 'success' : 'blocked'}`}><span>{result.committed ? 'Model-ground occupation' : 'Keep the arrangement and revise it'}</span><p>{result.reason}</p>{result.energyGapKJmol !== null && <b>Energy gap: {value(result.energyGapKJmol, 1)} kJ mol⁻¹</b>}</div>}
  </section>;
}

function CoordinationTrace({ attempts }) {
  return <aside className="coordination-trace coordination-panel"><div className="coordination-panel-heading"><span>Occupation trace</span><strong>Every electron action stays visible</strong></div><div className="coordination-attempts">{attempts.map((entry) => <div className={entry.kind} key={entry.id}><i/><span>{entry.kind}</span><strong>{entry.title}</strong><p>{entry.detail}</p></div>)}</div><div className="coordination-teacher-lens"><span>Teacher lens</span><p>Ask why changing Δ/P can make a preserved d6 arrangement stop being the model minimum—and why the computed spin-only number still is not a magnetic measurement.</p></div></aside>;
}

function CoordinationPassport() {
  const passport = MODEL_PASSPORTS.coordinationField;
  return <aside className="coordination-passport coordination-panel"><div className="coordination-panel-heading"><span>Model passport</span><strong>{passport.name}</strong></div><div className="coordination-passport-verdict"><i/>{passport.resultKind}</div><p>{passport.inputProvenance}</p><div className="coordination-passport-groups"><div><span>Included</span>{passport.includes.map((item) => <b key={item}>{item}</b>)}</div><div className="excluded"><span>Not included</span>{passport.excludes.map((item) => <b key={item}>{item}</b>)}</div></div><p>{passport.dataStatement}</p><div className="coordination-equations"><span>Bookkeeping in use</span><code>E = ΣnᵢcᵢΔ + pairs·P</code><code>S = unpaired / 2</code><code>multiplicity = 2S + 1</code><code>μspin-only = √[n(n+2)] μB</code></div><div className="coordination-sources"><span>Reference basis</span>{passport.sources.map((sourceId) => { const source = SCIENCE_SOURCES[sourceId]; return <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><strong>{source.name}</strong><small>{source.role}</small><b aria-hidden="true">↗</b></a>; })}</div></aside>;
}

export default function CoordinationFieldLab() {
  const [ionId, setIonId] = useState('fe2'), [geometryId, setGeometryId] = useState('octahedral');
  const [deltaKJmol, setDeltaKJmol] = useState(100), [pairingKJmol, setPairingKJmol] = useState(250);
  const [configuration, setConfiguration] = useState([0, 0, 0, 0, 0]), [selectedOrbital, setSelectedOrbital] = useState('dxy');
  const [hintLevel, setHintLevel] = useState(0), [result, setResult] = useState(null);
  const [feedback, setFeedback] = useState({ kind: 'ready', title: 'Place the six d electrons', detail: 'Select an orbital and cycle its occupation. Nothing is filled automatically.' });
  const [attempts, setAttempts] = useState([activity('load', 'Fe²⁺ octahedral challenge loaded', 'd6, Delta 100, and P 250 kJ mol⁻¹. The orbital ladder is empty.')]);
  const ion = METAL_ION_PRESETS.find((item) => item.id === ionId) || METAL_ION_PRESETS[4], geometry = COORDINATION_GEOMETRIES[geometryId];
  const ground = useMemo(() => findGroundConfiguration({ geometryId, dCount: ion.dCount, deltaKJmol, pairingKJmol }), [geometryId, ion.dCount, deltaKJmol, pairingKJmol]);
  const entered = useMemo(() => configurationMetrics({ geometryId, configuration, deltaKJmol, pairingKJmol }), [geometryId, configuration, deltaKJmol, pairingKJmol]);
  const addAttempt = (kind, title, detail) => setAttempts((current) => [activity(kind, title, detail), ...current].slice(0, 18));
  const chooseIon = (next) => {
    if (next.id === ionId) { const detail = `${next.label} is already active; geometry, energies, and occupation were preserved.`; setFeedback({ kind: 'ready', title: 'Ion selection unchanged', detail }); addAttempt('inspect', 'Active ion re-selected', detail); return; }
    setIonId(next.id); setConfiguration([0, 0, 0, 0, 0]); setResult(null); setHintLevel(0);
    const detail = `${next.label} requires d${next.dCount}. Geometry, Delta, and P were preserved; occupation was cleared because the electron total changed.`;
    setFeedback({ kind: 'reset', title: `${next.label} selected`, detail }); setAttempts([activity('load', `${next.label} challenge loaded`, detail)]);
  };
  const chooseGeometry = (next) => {
    if (next.id === geometryId) { const detail = `${next.name} is already active; occupation was preserved.`; setFeedback({ kind: 'ready', title: 'Geometry selection unchanged', detail }); addAttempt('inspect', 'Active geometry re-selected', detail); return; }
    setGeometryId(next.id); setConfiguration([0, 0, 0, 0, 0]); setSelectedOrbital(next.orbitals[0].id); setResult(null); setHintLevel(0);
    const detail = `${next.name} changes the orbital ordering, so occupation was cleared. Ion, Delta, and P were preserved.`;
    setFeedback({ kind: 'reset', title: `${next.name} diagram selected`, detail }); addAttempt('geometry', 'Orbital diagram changed', detail);
  };
  const clickOrbital = (orbital, focusOnly = false) => {
    setSelectedOrbital(orbital.id); if (focusOnly) return;
    const orbitalIndex = geometry.orbitals.findIndex((item) => item.id === orbital.id);
    const evaluation = toggleOrbitalOccupancy({ configuration, orbitalIndex, dCount: ion.dCount });
    if (!evaluation.allowed) { setFeedback({ kind: 'blocked', title: 'Electron placement blocked', detail: evaluation.reason }); addAttempt('blocked', `${ORBITAL_VISUALS[orbital.id].label} unchanged`, evaluation.reason); return; }
    setConfiguration(evaluation.configuration); setResult(null); setHintLevel(0);
    setFeedback({ kind: 'changed', title: `${ORBITAL_VISUALS[orbital.id].label}: ${occupancyText(evaluation.configuration[orbitalIndex])}`, detail: evaluation.reason });
    addAttempt('electron', `${ORBITAL_VISUALS[orbital.id].label} occupation changed`, evaluation.reason);
  };
  const clear = () => { setConfiguration([0, 0, 0, 0, 0]); setResult(null); setHintLevel(0); const detail = 'All five orbitals were cleared explicitly; ion, geometry, Delta, and P were preserved.'; setFeedback({ kind: 'reset', title: 'Occupation cleared', detail }); addAttempt('reset', 'All d electrons removed', detail); };
  const check = () => { const evaluation = evaluateConfiguration({ geometryId, dCount: ion.dCount, configuration, deltaKJmol, pairingKJmol }); setResult(evaluation); setFeedback({ kind: evaluation.committed ? 'success' : 'blocked', title: evaluation.committed ? 'Ground-equivalent occupation' : 'Occupation needs revision', detail: evaluation.reason }); addAttempt(evaluation.committed ? 'success' : 'check', evaluation.committed ? 'Model minimum matched' : 'Occupation retained after check', evaluation.reason); };
  const hint = () => { const next = Math.min(3, hintLevel + 1); const response = nextCoordinationHint({ geometryId, dCount: ion.dCount, deltaKJmol, pairingKJmol, level: next, configuration }); setHintLevel(next); setFeedback({ kind: 'hint', title: `Hint ${response.level}`, detail: response.text }); addAttempt('hint', `Hint ${response.level} opened`, response.text); };
  const loadReference = () => { setConfiguration([...ground.configuration]); setResult(null); setHintLevel(0); const detail = `Loaded one explicit ground-equivalent vector [${ground.configuration.join(', ')}]. This reveal was requested by the learner.`; setFeedback({ kind: 'reveal', title: 'Model reference loaded', detail }); addAttempt('reveal', 'Ground occupation revealed', detail); };
  const parameterChanged = (name, next) => { setResult(null); setFeedback({ kind: 'changed', title: `${name} changed to ${next} kJ mol⁻¹`, detail: 'Your electron occupation was preserved. Check it again against the new model energy balance.' }); };
  return <section className="coordination-lab" id="coordinationLab" aria-labelledby="coordinationLabTitle">
    <header className="coordination-header"><div><p className="section-code">28 / Inorganic coordination field</p><h2 id="coordinationLabTitle">Do not memorize the spin state. Make the energy choice visible.</h2><p>Choose an ion and ideal ligand geometry, place every d electron yourself, and test whether promotion or pairing wins in the model you defined.</p></div><div className="coordination-condition-stamp"><span>Manual occupation engine</span><strong>Five orbitals · exhaustive minimum search</strong><small>Geometry and energies are inputs · no complex prediction</small></div></header>
    <div className="coordination-bench"><IonShelf ion={ion} onChoose={chooseIon} geometry={geometry} onGeometry={chooseGeometry}/><CoordinationObservatory ion={ion} geometry={geometry} selectedOrbital={selectedOrbital}/><OrbitalLadder geometry={geometry} configuration={configuration} selectedOrbital={selectedOrbital} onOrbital={clickOrbital} ion={ion} onClear={clear} onHint={hint} hintLevel={hintLevel} onReference={loadReference} onCheck={check}/><CompetitionPanel deltaKJmol={deltaKJmol} setDeltaKJmol={setDeltaKJmol} pairingKJmol={pairingKJmol} setPairingKJmol={setPairingKJmol} ground={ground} onParameterChange={parameterChanged}/><ConfigurationResult feedback={feedback} entered={entered} ground={ground} result={result}/><CoordinationTrace attempts={attempts}/><CoordinationPassport/></div>
  </section>;
}
