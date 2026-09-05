import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ATOMIC_ELEMENTS,
  ATOMIC_ELEMENT_BY_Z,
  ATOMIC_MODEL_BOUNDARY,
  ATOMIC_SUBSHELLS,
} from '../data/atomicElements.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../data/scienceSources.js';
import {
  atomicConfigurationNotation,
  atomicStateMetrics,
  buildReferenceOrbitalState,
  compareIonizationEnergies,
  createEmptyAtomicState,
  evaluateAtomicConfiguration,
  evaluateQuantumPrediction,
  loadClosedCore,
  nextAtomicHint,
  placeAtomicElectron,
  quantumAddressForElectron,
  removeAtomicElectron,
} from '../chemistry/atomicStructure.js';
import '../styles/atomic-structure.css';

let atomicActivityId = 0;
const activity = (kind, title, detail) => ({
  id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${++atomicActivityId}-${Math.random().toString(36).slice(2)}`,
  kind,
  title,
  detail,
});
const lName = (l) => ['s', 'p', 'd', 'f'][l] || `l=${l}`;
const focusSubshellFor = (element) => element.block === 'd' ? '3d' : `${element.period}${element.block}`;

function ElementTuner({ selected, onSelect }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    const centerSelected = () => {
      const container = scrollRef.current;
      const selectedButton = container?.querySelector('.atomic-element.selected');
      if (!container || !selectedButton || container.scrollWidth <= container.clientWidth) return;
      const nextLeft = selectedButton.offsetLeft - (container.clientWidth - selectedButton.offsetWidth) / 2;
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      container.scrollTo({ left: Math.max(0, nextLeft), behavior });
    };
    centerSelected();
    window.addEventListener('resize', centerSelected);
    return () => window.removeEventListener('resize', centerSelected);
  }, [selected.atomicNumber]);
  return (
    <section className="atomic-periodic atomic-panel" aria-labelledby="atomicPeriodicTitle">
      <div className="atomic-panel-heading">
        <span>Element tuner · neutral H–Kr</span>
        <strong id="atomicPeriodicTitle">Choose the atom whose ground-state record you want to challenge</strong>
      </div>
      <div className="atomic-table-cue" aria-hidden="true">Swipe across periods <b>→</b></div>
      <div className="atomic-table-scroll" ref={scrollRef}>
        <div className="atomic-periodic-grid" role="group" aria-label="Neutral elements hydrogen through krypton arranged by group and period">
          {ATOMIC_ELEMENTS.map((element) => (
            <button
              type="button"
              key={element.atomicNumber}
              className={`atomic-element block-${element.block} ${selected.atomicNumber === element.atomicNumber ? 'selected' : ''}`}
              style={{ gridColumn: element.group, gridRow: element.period }}
              aria-pressed={selected.atomicNumber === element.atomicNumber}
              aria-label={`${element.name}, atomic number ${element.atomicNumber}, group ${element.group}, period ${element.period}, ${element.block} block`}
              onClick={() => onSelect(element)}
            >
              <small>{element.atomicNumber}</small>
              <strong>{element.symbol}</strong>
              <span>{element.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="atomic-block-key" aria-label="Periodic table block key">
        <span className="block-s"><i/>s block</span>
        <span className="block-p"><i/>p block</span>
        <span className="block-d"><i/>d block</span>
        <small>Blank positions are elements beyond the declared H–Kr boundary.</small>
      </div>
    </section>
  );
}

function AtomTarget({ element, state, onEmpty, onCore, onReference }) {
  const metrics = atomicStateMetrics(state);
  return (
    <aside className="atomic-target atomic-panel">
      <div className="atomic-panel-heading"><span>Configuration target</span><strong>Build neutral {element.name}</strong></div>
      <div className={`atomic-element-identity block-${element.block}`}>
        <small>{element.atomicNumber}</small>
        <strong>{element.symbol}</strong>
        <div><b>{element.name}</b><span>period {element.period} · group {element.group} · {element.block} block</span></div>
      </div>
      <dl className="atomic-target-ledger">
        <div><dt>Electrons placed</dt><dd>{metrics.electronCount} / {element.atomicNumber}</dd></div>
        <div><dt>Current notation</dt><dd>{atomicConfigurationNotation(state)}</dd></div>
        <div><dt>NIST ground record</dt><dd>{element.shorthand}</dd></div>
        <div><dt>First ionization</dt><dd>{element.ionizationEnergyEV.toFixed(4)} eV</dd></div>
      </dl>
      {element.exceptionNote && <p className="atomic-exception"><i>!</i><span><b>Ground-state exception</b>{element.exceptionNote}</span></p>}
      <div className="atomic-start-actions">
        <button type="button" onClick={onEmpty}>Start empty</button>
        <button type="button" onClick={onCore} disabled={!element.nobleGasCoreZ}>Load closed core</button>
        <button type="button" className="reference" onClick={onReference}>Load NIST reference</button>
      </div>
      <p className="atomic-action-boundary">These buttons change the rack only when you choose them. Selecting an element starts a new attempt.</p>
    </aside>
  );
}

function ProbabilityCloud({ subshellId, onSubshell }) {
  const subshell = ATOMIC_SUBSHELLS.find((item) => item.id === subshellId) || ATOMIC_SUBSHELLS[2];
  const radialNodes = Math.max(0, subshell.n - subshell.l - 1);
  return (
    <section className={`atomic-cloud atomic-panel cloud-${lName(subshell.l)}`} aria-labelledby="atomicCloudTitle">
      <div className="atomic-cloud-topline"><span><i/> probability-cloud theatre</span><b>{subshell.id} selected · qualitative display</b></div>
      <svg viewBox="0 0 760 490" role="img" aria-labelledby="atomicCloudSvgTitle atomicCloudSvgDesc">
        <title id="atomicCloudSvgTitle">{subshell.id} qualitative atomic-orbital silhouette</title>
        <desc id="atomicCloudSvgDesc">A phase-coloured qualitative isosurface silhouette with node guides. It is not an electron orbit or measured atom size.</desc>
        <defs>
          <radialGradient id="atomic-core-glow">
            <stop offset="0" stopColor="#fff9c9"/>
            <stop offset=".25" stopColor="#f6b94b"/>
            <stop offset="1" stopColor="#f6b94b" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="atomic-violet-cloud">
            <stop offset="0" stopColor="#b9afff" stopOpacity=".95"/>
            <stop offset=".58" stopColor="#705cf6" stopOpacity=".63"/>
            <stop offset="1" stopColor="#705cf6" stopOpacity=".05"/>
          </radialGradient>
          <radialGradient id="atomic-cyan-cloud">
            <stop offset="0" stopColor="#c9fbff" stopOpacity=".95"/>
            <stop offset=".58" stopColor="#4fd7e5" stopOpacity=".64"/>
            <stop offset="1" stopColor="#4fd7e5" stopOpacity=".04"/>
          </radialGradient>
          <filter id="atomic-soft-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="9" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <pattern id="atomic-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M32 0H0V32" fill="none" stroke="#9fb5dc" strokeOpacity=".08" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="760" height="490" fill="url(#atomic-grid)"/>
        <g className="atomic-reticle">
          <circle cx="380" cy="245" r="185"/>
          <circle cx="380" cy="245" r="118"/>
          <path d="M92 245H668M380 54V436"/>
          <path d="M128 105L632 385M128 385L632 105" className="minor"/>
        </g>
        {subshell.l === 0 && (
          <g className="atomic-s-shape" filter="url(#atomic-soft-glow)">
            <circle cx="380" cy="245" r={subshell.n === 1 ? 112 : 170} fill="url(#atomic-violet-cloud)"/>
            {radialNodes > 0 && <circle className="atomic-node-ring" cx="380" cy="245" r="93"/>}
            {radialNodes > 1 && <circle className="atomic-node-ring" cx="380" cy="245" r="137"/>}
          </g>
        )}
        {subshell.l === 1 && (
          <g className="atomic-p-shape" filter="url(#atomic-soft-glow)">
            <ellipse cx="265" cy="245" rx="127" ry="82" fill="url(#atomic-violet-cloud)" transform="rotate(-8 265 245)"/>
            <ellipse cx="495" cy="245" rx="127" ry="82" fill="url(#atomic-cyan-cloud)" transform="rotate(8 495 245)"/>
            <path className="atomic-node-plane" d="M380 102V388"/>
          </g>
        )}
        {subshell.l === 2 && (
          <g className="atomic-d-shape" filter="url(#atomic-soft-glow)">
            <ellipse cx="285" cy="153" rx="103" ry="57" fill="url(#atomic-violet-cloud)" transform="rotate(43 285 153)"/>
            <ellipse cx="475" cy="153" rx="103" ry="57" fill="url(#atomic-cyan-cloud)" transform="rotate(-43 475 153)"/>
            <ellipse cx="285" cy="337" rx="103" ry="57" fill="url(#atomic-cyan-cloud)" transform="rotate(-43 285 337)"/>
            <ellipse cx="475" cy="337" rx="103" ry="57" fill="url(#atomic-violet-cloud)" transform="rotate(43 475 337)"/>
            <path className="atomic-node-plane" d="M144 245H616M380 75V415"/>
          </g>
        )}
        <circle className="atomic-nucleus-glow" cx="380" cy="245" r="55" fill="url(#atomic-core-glow)"/>
        <circle className="atomic-nucleus" cx="380" cy="245" r="17"/>
        <g className="atomic-scan"><path d="M115 245H645"/><circle cx="115" cy="245" r="5"/></g>
        <g className="atomic-cloud-label">
          <text x="42" y="58">{subshell.id}</text>
          <text x="42" y="82">one-electron wavefunction silhouette</text>
        </g>
      </svg>
      <div className="atomic-cloud-stats">
        <div><span>Principal shell</span><strong>n = {subshell.n}</strong></div>
        <div><span>Angular type</span><strong>l = {subshell.l} ({lName(subshell.l)})</strong></div>
        <div><span>Angular nodes</span><strong>{subshell.l}</strong></div>
        <div><span>Radial nodes</span><strong>{radialNodes}</strong></div>
      </div>
      <div className="atomic-cloud-tabs" aria-label="Choose a displayed subshell silhouette">
        {ATOMIC_SUBSHELLS.map((item) => <button type="button" key={item.id} className={item.id === subshell.id ? 'active' : ''} onClick={() => onSubshell(item.id)}>{item.id}</button>)}
      </div>
      <p className="atomic-cloud-boundary" id="atomicCloudTitle">{ATOMIC_MODEL_BOUNDARY.orbitalGraphic}</p>
    </section>
  );
}

function OrbitalRack({
  state,
  selectedSubshell,
  selectedElectron,
  siteFeedback,
  onFocusSubshell,
  onPlace,
  onRemove,
  onSelectElectron,
}) {
  const metrics = atomicStateMetrics(state);
  const rows = [...ATOMIC_SUBSHELLS].reverse();
  return (
    <section className="atomic-rack atomic-panel" aria-labelledby="atomicRackTitle">
      <div className="atomic-panel-heading">
        <span>Manual orbital rack · energy increases upward</span>
        <strong id="atomicRackTitle">Place spin arrows yourself; valid mistakes stay where you put them</strong>
      </div>
      <div className="atomic-rack-cue" aria-hidden="true">Swipe the orbital rack <b>→</b></div>
      <div className="atomic-rack-scroll">
        <div className="atomic-energy-rack">
          <div className="atomic-energy-axis" aria-hidden="true"><span>higher E</span><i/><span>lower E</span></div>
          <div className="atomic-rack-rows">
            {rows.map((subshell, rowIndex) => {
              const total = state[subshell.id].reduce((sum, orbital) => sum + orbital.length, 0);
              return (
                <article className={`atomic-subshell-row ${selectedSubshell === subshell.id ? 'active' : ''}`} key={subshell.id}>
                  <button type="button" className="atomic-subshell-label" onClick={() => onFocusSubshell(subshell.id)} aria-pressed={selectedSubshell === subshell.id}>
                    <strong>{subshell.id}</strong>
                    <span>{total}/{subshell.capacity}</span>
                    <small>{subshell.orbitalCount} orbital{subshell.orbitalCount === 1 ? '' : 's'}</small>
                  </button>
                  <div className="atomic-orbital-sites" style={{ '--sites': subshell.orbitalCount }}>
                    {state[subshell.id].map((electrons, orbitalIndex) => {
                      const feedbackHere = siteFeedback?.key === `${subshell.id}-${orbitalIndex}`;
                      return (
                        <div className={`atomic-orbital-site ${feedbackHere ? siteFeedback.kind : ''}`} key={`${subshell.id}-${orbitalIndex}`}>
                          <span className="atomic-ml">mₗ {subshell.ml[orbitalIndex] > 0 ? '+' : ''}{subshell.ml[orbitalIndex]}</span>
                          <div className="atomic-orbital-box">
                            {electrons.length ? electrons.map((spin, electronIndex) => {
                              const isSelected = selectedElectron?.subshellId === subshell.id
                                && selectedElectron?.orbitalIndex === orbitalIndex
                                && selectedElectron?.electronIndex === electronIndex;
                              return (
                                <span className="atomic-electron-wrap" key={`${spin}-${electronIndex}`}>
                                  <button
                                    type="button"
                                    className={`atomic-electron ${spin === 1 ? 'up' : 'down'} ${isSelected ? 'selected' : ''}`}
                                    onClick={() => onSelectElectron({ subshellId: subshell.id, orbitalIndex, electronIndex })}
                                    aria-pressed={isSelected}
                                    aria-label={`Select ${spin === 1 ? 'spin-up' : 'spin-down'} electron in ${subshell.id}, m l ${subshell.ml[orbitalIndex]}`}
                                  >{spin === 1 ? '↑' : '↓'}</button>
                                  <button type="button" className="atomic-remove-electron" onClick={() => onRemove(subshell.id, orbitalIndex, electronIndex)} aria-label={`Remove this ${spin === 1 ? 'spin-up' : 'spin-down'} electron from ${subshell.id}`}>×</button>
                                </span>
                              );
                            }) : <i className="atomic-empty-orbital">empty</i>}
                          </div>
                          <div className="atomic-spin-actions">
                            <button type="button" onClick={() => onPlace(subshell.id, orbitalIndex, 1)} aria-label={`Add spin-up electron to ${subshell.id}, m l ${subshell.ml[orbitalIndex]}`}>+ ↑</button>
                            <button type="button" onClick={() => onPlace(subshell.id, orbitalIndex, -1)} aria-label={`Add spin-down electron to ${subshell.id}, m l ${subshell.ml[orbitalIndex]}`}>+ ↓</button>
                          </div>
                          {feedbackHere && <small className="atomic-site-reason" aria-live="polite">{siteFeedback.reason}</small>}
                        </div>
                      );
                    })}
                  </div>
                  <i className="atomic-energy-order" aria-hidden="true">{rows.length - rowIndex}</i>
                </article>
              );
            })}
          </div>
        </div>
      </div>
      <footer className="atomic-rack-ledger">
        <span><i className="electron-dot"/> {metrics.electronCount} electrons</span>
        <span><i className="unpaired-dot"/> {metrics.unpairedElectrons} unpaired</span>
        <strong>{atomicConfigurationNotation(state)}</strong>
      </footer>
    </section>
  );
}

function DimensionFeedback({ label, dimension }) {
  if (!dimension) return <div className="waiting"><span>{label}</span><p>Waiting for a committed check.</p></div>;
  return <div className={dimension.correct ? 'correct' : 'incorrect'}><span>{label}</span><p>{dimension.reason}</p></div>;
}

function PredictionConsole({
  predictedMagnetism,
  setPredictedMagnetism,
  predictedUnpaired,
  setPredictedUnpaired,
  evaluation,
  onCheck,
  onHint,
  hint,
}) {
  return (
    <aside className="atomic-prediction atomic-panel">
      <div className="atomic-panel-heading"><span>Prediction console</span><strong>Commit what the arrows imply</strong></div>
      <div className="atomic-magnetism-choice" role="group" aria-label="Predict magnetic classification">
        {['paramagnetic', 'diamagnetic'].map((choice) => <button type="button" key={choice} className={predictedMagnetism === choice ? 'selected' : ''} aria-pressed={predictedMagnetism === choice} onClick={() => setPredictedMagnetism(choice)}><i/>{choice}</button>)}
      </div>
      <label className="atomic-unpaired-input">
        <span>Predicted unpaired electrons</span>
        <input type="number" min="0" max="36" step="1" value={predictedUnpaired} onChange={(event) => setPredictedUnpaired(event.target.value)} placeholder="0–36"/>
      </label>
      <div className="atomic-check-actions">
        <button type="button" className="commit" onClick={onCheck}>Check my arrangement</button>
        <button type="button" onClick={onHint}>Reveal one hint</button>
      </div>
      {hint && <p className="atomic-hint"><b>Hint {hint.level}/4</b>{hint.text}</p>}
      <div className="atomic-dimension-grid" aria-live="polite">
        <DimensionFeedback label="Electron count" dimension={evaluation?.electronCount}/>
        <DimensionFeedback label="NIST subshell record" dimension={evaluation?.subshells}/>
        <DimensionFeedback label="Hund pattern" dimension={evaluation?.hund}/>
        <DimensionFeedback label="Magnetism prediction" dimension={evaluation?.magnetism}/>
      </div>
      {evaluation && (
        <div className={`atomic-verdict ${evaluation.committed ? 'correct' : 'inspect'}`}>
          <span>{evaluation.committed ? 'Ground-record match' : 'Keep inspecting'}</span>
          <strong>{evaluation.notation}</strong>
          <p>{evaluation.committed ? 'Your arrows, unpaired count, and classification agree with this declared neutral ground-state reference.' : 'Nothing moved. Use the separate reasons above to decide what you want to change.'}</p>
        </div>
      )}
    </aside>
  );
}

function QuantumDock({
  state,
  selectedElectron,
  prediction,
  setPrediction,
  evaluation,
  onCheck,
}) {
  const actual = selectedElectron ? quantumAddressForElectron({ state, ...selectedElectron }) : null;
  const controls = [
    { key: 'n', label: 'n', values: [1, 2, 3, 4] },
    { key: 'l', label: 'l', values: [0, 1, 2] },
    { key: 'ml', label: 'mₗ', values: [-2, -1, 0, 1, 2] },
    { key: 'ms', label: 'mₛ', values: [-0.5, 0.5], format: (value) => value === 0.5 ? '+1/2' : '−1/2' },
  ];
  return (
    <section className="atomic-quantum atomic-panel">
      <div className="atomic-panel-heading"><span>Quantum-address decoder</span><strong>Select one arrow, then locate it with four numbers</strong></div>
      {actual?.valid ? (
        <>
          <div className="atomic-selected-electron">
            <i>{actual.ms === 0.5 ? '↑' : '↓'}</i>
            <span><b>Selected electron</b>{actual.subshellId} · orbital {actual.orbitalIndex + 1}</span>
          </div>
          <div className="atomic-quantum-controls">
            {controls.map((control) => (
              <label key={control.key}>
                <span>{control.label}</span>
                <select value={prediction[control.key]} onChange={(event) => setPrediction((current) => ({ ...current, [control.key]: event.target.value }))} aria-label={`Predict quantum number ${control.label}`}>
                  <option value="">?</option>
                  {control.values.map((value) => <option value={value} key={value}>{control.format ? control.format(value) : value}</option>)}
                </select>
                <small>{evaluation?.dimensions?.[control.key] ? (evaluation.dimensions[control.key].correct ? 'correct' : `expected ${control.key === 'ms' ? (evaluation.dimensions[control.key].expected > 0 ? '+1/2' : '−1/2') : evaluation.dimensions[control.key].expected}`) : 'predict'}</small>
              </label>
            ))}
          </div>
          <button type="button" className="atomic-quantum-check" onClick={() => onCheck(actual)}>Check this address</button>
          {evaluation && <div className={`atomic-quantum-verdict ${evaluation.committed ? 'correct' : 'inspect'}`} aria-live="polite"><span>{evaluation.committed ? 'Address resolved' : 'Four independent coordinates'}</span>{Object.entries(evaluation.dimensions).map(([key, item]) => <p className={item.correct ? 'correct' : 'incorrect'} key={key}><b>{key === 'ml' ? 'mₗ' : key === 'ms' ? 'mₛ' : key}</b>{item.reason}</p>)}</div>}
        </>
      ) : (
        <div className="atomic-quantum-empty"><div><i>↑</i><i>↓</i></div><strong>No electron selected</strong><p>Click any placed spin arrow in the orbital rack. The rack will not move or reveal its address until you commit a prediction.</p></div>
      )}
      <p className="atomic-quantum-note">Allowed addresses obey n ≥ 1, 0 ≤ l ≤ n − 1, −l ≤ mₗ ≤ +l, and mₛ = ±1/2.</p>
    </section>
  );
}

const terrainX = (atomicNumber) => 54 + ((atomicNumber - 1) / 35) * 812;
const terrainY = (energy) => 276 - ((energy - 4) / 21) * 222;

function IonizationTerrain({ leftZ, rightZ, onLeft, onRight, onCompare }) {
  const comparison = compareIonizationEnergies({ leftAtomicNumber: leftZ, rightAtomicNumber: rightZ });
  const path = ATOMIC_ELEMENTS.map((element, index) => `${index ? 'L' : 'M'} ${terrainX(element.atomicNumber).toFixed(2)} ${terrainY(element.ionizationEnergyEV).toFixed(2)}`).join(' ');
  const periodBands = [
    { period: 1, start: 1, end: 2 },
    { period: 2, start: 3, end: 10 },
    { period: 3, start: 11, end: 18 },
    { period: 4, start: 19, end: 36 },
  ];
  return (
    <section className="atomic-terrain atomic-panel" aria-labelledby="atomicTerrainTitle">
      <div className="atomic-panel-heading"><span>NIST first-ionization terrain</span><strong id="atomicTerrainTitle">Read the broad rise—and the local reversals</strong></div>
      <div className="atomic-terrain-layout">
        <div className="atomic-terrain-chart">
          <svg viewBox="0 0 920 330" role="img" aria-label="NIST first-ionization energies for neutral elements hydrogen through krypton in electron volts">
            {periodBands.map((band, index) => <rect key={band.period} x={terrainX(band.start) - 10} y="36" width={terrainX(band.end) - terrainX(band.start) + 20} height="248" className={index % 2 ? 'period-band alt' : 'period-band'}/>)}
            {[5, 10, 15, 20, 25].map((tick) => <g className="terrain-gridline" key={tick}><line x1="44" y1={terrainY(tick)} x2="880" y2={terrainY(tick)}/><text x="39" y={terrainY(tick) + 4} textAnchor="end">{tick}</text></g>)}
            <path className="terrain-line" d={path}/>
            {ATOMIC_ELEMENTS.map((element) => {
              const selected = element.atomicNumber === leftZ || element.atomicNumber === rightZ;
              return <g className={`terrain-point block-${element.block} ${selected ? 'selected' : ''}`} key={element.atomicNumber}><circle cx={terrainX(element.atomicNumber)} cy={terrainY(element.ionizationEnergyEV)} r={selected ? 7 : 4}/><title>{element.symbol}: {element.ionizationEnergyEV.toFixed(4)} eV</title></g>;
            })}
            <g className="terrain-annotation">
              <path d={`M ${terrainX(4)} ${terrainY(9.3227) - 9} Q ${terrainX(4.5)} ${terrainY(10.7)} ${terrainX(5)} ${terrainY(8.2980) - 9}`}/>
              <text x={terrainX(4.5)} y={terrainY(10.7) - 5} textAnchor="middle">Be → B dips</text>
              <path d={`M ${terrainX(7)} ${terrainY(14.5341) - 9} Q ${terrainX(7.5)} ${terrainY(16.1)} ${terrainX(8)} ${terrainY(13.6181) - 9}`}/>
              <text x={terrainX(7.5)} y={terrainY(16.1) - 5} textAnchor="middle">N → O dips</text>
            </g>
            <text className="terrain-axis-title" x="18" y="165" transform="rotate(-90 18 165)">first ionization energy / eV</text>
            <text className="terrain-axis-title" x="460" y="319" textAnchor="middle">atomic number →</text>
          </svg>
        </div>
        <aside className="atomic-comparator">
          <span>Measured-record comparator</span>
          <div>
            <label><small>Element A</small><select value={leftZ} onChange={(event) => onLeft(Number(event.target.value))}>{ATOMIC_ELEMENTS.map((element) => <option value={element.atomicNumber} key={element.atomicNumber}>{element.symbol} · {element.ionizationEnergyEV.toFixed(4)} eV</option>)}</select></label>
            <b>versus</b>
            <label><small>Element B</small><select value={rightZ} onChange={(event) => onRight(Number(event.target.value))}>{ATOMIC_ELEMENTS.map((element) => <option value={element.atomicNumber} key={element.atomicNumber}>{element.symbol} · {element.ionizationEnergyEV.toFixed(4)} eV</option>)}</select></label>
          </div>
          <button type="button" onClick={() => onCompare(comparison)}>Record this comparison</button>
          <div className="atomic-comparison-result">
            <strong>{comparison.higher ? `${comparison.higher.symbol} is higher` : 'Same displayed value'}</strong>
            <span>{comparison.direction}</span>
            <p>{comparison.boundary}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function AtomicTrace({ entries }) {
  return (
    <aside className="atomic-trace atomic-panel">
      <div className="atomic-panel-heading"><span>Learning trace</span><strong>Your reasoning remains inspectable</strong></div>
      <div className="atomic-trace-list">
        {entries.map((entry) => <article className={entry.kind} key={entry.id}><i/><span>{entry.kind}</span><strong>{entry.title}</strong><p>{entry.detail}</p></article>)}
      </div>
      <details className="atomic-teacher-lens">
        <summary>Open teacher lens <span>+</span></summary>
        <ol>
          <li>Build carbon, then oxygen. Why does oxygen pair one 2p orbital while two electrons remain unpaired?</li>
          <li>Make a Pauli-valid but Hund-unfavourable carbon arrangement. Which evidence says it is not the displayed ground pattern?</li>
          <li>Compare Cr and Cu with the simple filling prediction. Why must an observed ground record outrank a memorized shortcut?</li>
          <li>Use Be/B and N/O. How would you state a periodic trend without calling it an exception-free law?</li>
        </ol>
      </details>
    </aside>
  );
}

function AtomicPassport() {
  const passport = MODEL_PASSPORTS.atomicSignalObservatory;
  return (
    <aside className="atomic-passport atomic-panel">
      <div className="atomic-passport-intro">
        <div className="atomic-panel-heading"><span>Model passport</span><strong>{passport.name}</strong></div>
        <div className="atomic-passport-verdict"><i/>{passport.resultKind}</div>
        <p>{passport.inputProvenance}</p>
        <p>{passport.dataStatement}</p>
      </div>
      <div className="atomic-passport-groups">
        <div><span>Included</span>{passport.includes.map((item) => <b key={item}>{item}</b>)}</div>
        <div className="excluded"><span>Not included</span>{passport.excludes.map((item) => <b key={item}>{item}</b>)}</div>
      </div>
      <div className="atomic-rules">
        <span>Rules and addresses in use</span>
        <code>capacity = 2(2l + 1)</code>
        <code>n ≥ 1 · 0 ≤ l ≤ n − 1</code>
        <code>−l ≤ mₗ ≤ +l</code>
        <code>mₛ = ±1/2</code>
        <p>The NIST configuration record is authoritative here; aufbau and the introductory Hund check are explanatory comparisons, not exception-repair algorithms.</p>
      </div>
      <div className="atomic-sources">
        <span>Reference basis</span>
        {passport.sources.map((sourceId) => {
          const source = SCIENCE_SOURCES[sourceId];
          return <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><strong>{source.name}</strong><small>{source.role}</small><b aria-hidden="true">↗</b></a>;
        })}
      </div>
    </aside>
  );
}

export default function AtomicStructureLab() {
  const [atomicNumber, setAtomicNumber] = useState(6);
  const [state, setState] = useState(() => createEmptyAtomicState());
  const [selectedSubshell, setSelectedSubshell] = useState('2p');
  const [selectedElectron, setSelectedElectron] = useState(null);
  const [siteFeedback, setSiteFeedback] = useState(null);
  const [predictedMagnetism, setPredictedMagnetism] = useState('');
  const [predictedUnpaired, setPredictedUnpaired] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [hint, setHint] = useState(null);
  const [quantumPrediction, setQuantumPrediction] = useState({ n: '', l: '', ml: '', ms: '' });
  const [quantumEvaluation, setQuantumEvaluation] = useState(null);
  const [trendLeft, setTrendLeft] = useState(4);
  const [trendRight, setTrendRight] = useState(5);
  const [entries, setEntries] = useState(() => [activity('start', 'Carbon attempt opened', 'The orbital rack starts empty. No ground-state arrows were inserted automatically.')]);
  const element = ATOMIC_ELEMENT_BY_Z[atomicNumber];
  const metrics = useMemo(() => atomicStateMetrics(state), [state]);

  const record = (kind, title, detail) => setEntries((current) => [activity(kind, title, detail), ...current].slice(0, 18));
  const clearChecks = () => {
    setEvaluation(null);
    setHintLevel(0);
    setHint(null);
    setQuantumEvaluation(null);
  };
  const clearElectronSelection = () => {
    setSelectedElectron(null);
    setQuantumPrediction({ n: '', l: '', ml: '', ms: '' });
    setQuantumEvaluation(null);
  };

  const chooseElement = (next) => {
    if (next.atomicNumber === atomicNumber) return;
    setAtomicNumber(next.atomicNumber);
    setState(createEmptyAtomicState());
    setSelectedSubshell(focusSubshellFor(next));
    setSiteFeedback(null);
    setPredictedMagnetism('');
    setPredictedUnpaired('');
    clearElectronSelection();
    clearChecks();
    record('target', `${next.name} selected`, `Started a new neutral ${next.symbol} attempt with an empty rack and a target of ${next.atomicNumber} electrons.`);
  };

  const startEmpty = () => {
    setState(createEmptyAtomicState());
    setSiteFeedback(null);
    clearElectronSelection();
    clearChecks();
    record('reset', 'Orbital rack emptied', `Neutral ${element.symbol} remains the target; every displayed electron was removed by an explicit learner action.`);
  };

  const loadCore = () => {
    const result = loadClosedCore(atomicNumber);
    if (!result.valid) return;
    setState(result.state);
    setSiteFeedback(null);
    clearElectronSelection();
    clearChecks();
    record('reveal', result.core ? `[${result.core.symbol}] core loaded` : 'No earlier core', result.reason);
  };

  const loadReference = () => {
    const result = buildReferenceOrbitalState(atomicNumber);
    if (!result.valid) return;
    setState(result.state);
    setSiteFeedback(null);
    clearElectronSelection();
    clearChecks();
    record('reveal', 'NIST reference loaded', `${element.name}: ${element.shorthand}. This replaced the rack only after the explicit reveal action.`);
  };

  const place = (subshellId, orbitalIndex, spin) => {
    const result = placeAtomicElectron({ state, subshellId, orbitalIndex, spin });
    setSelectedSubshell(subshellId);
    setSiteFeedback({ key: `${subshellId}-${orbitalIndex}`, kind: result.allowed ? 'allowed' : 'blocked', reason: result.reason });
    if (!result.allowed) {
      record('blocked', 'Impossible placement blocked', result.reason);
      return;
    }
    setState(result.state);
    const electronIndex = result.state[subshellId][orbitalIndex].length - 1;
    setSelectedElectron({ subshellId, orbitalIndex, electronIndex });
    setQuantumPrediction({ n: '', l: '', ml: '', ms: '' });
    clearChecks();
    record('placed', `${spin === 1 ? '↑' : '↓'} added to ${subshellId}`, result.reason);
  };

  const remove = (subshellId, orbitalIndex, electronIndex) => {
    const result = removeAtomicElectron({ state, subshellId, orbitalIndex, electronIndex });
    setSelectedSubshell(subshellId);
    setSiteFeedback({ key: `${subshellId}-${orbitalIndex}`, kind: result.allowed ? 'allowed' : 'blocked', reason: result.reason });
    if (!result.allowed) {
      record('blocked', 'Removal blocked', result.reason);
      return;
    }
    setState(result.state);
    clearElectronSelection();
    clearChecks();
    record('removed', `${result.spin === 1 ? '↑' : '↓'} removed from ${subshellId}`, result.reason);
  };

  const selectElectron = (selection) => {
    const actual = quantumAddressForElectron({ state, ...selection });
    if (!actual.valid) return;
    setSelectedElectron(selection);
    setSelectedSubshell(selection.subshellId);
    setQuantumPrediction({ n: '', l: '', ml: '', ms: '' });
    setQuantumEvaluation(null);
    record('selected', 'Electron selected for an address challenge', `${actual.subshellId}, displayed orbital ${actual.orbitalIndex + 1}. Its quantum numbers remain hidden until a prediction is checked.`);
  };

  const checkConfiguration = () => {
    const result = evaluateAtomicConfiguration({
      atomicNumber,
      state,
      predictedMagnetism,
      predictedUnpaired: predictedUnpaired === '' ? null : Number(predictedUnpaired),
    });
    setEvaluation(result);
    record(result.committed ? 'correct' : 'check', result.committed ? 'Ground-record match' : 'Arrangement checked without repair', result.committed ? `${element.shorthand}; ${result.metrics.unpairedElectrons} unpaired electron${result.metrics.unpairedElectrons === 1 ? '' : 's'}.` : 'Electron count, subshell record, Hund pattern, and magnetism were scored independently. The rack was preserved.');
  };

  const revealHint = () => {
    const nextLevel = Math.min(4, hintLevel + 1 || 1);
    const result = nextAtomicHint({ atomicNumber, state, level: nextLevel });
    setHintLevel(nextLevel);
    setHint(result);
    record('hint', `Hint ${nextLevel} revealed`, result.text);
  };

  const checkQuantum = (actual) => {
    const result = evaluateQuantumPrediction({ actual, prediction: quantumPrediction });
    setQuantumEvaluation(result);
    record(result.committed ? 'correct' : 'check', result.committed ? 'Quantum address resolved' : 'Quantum address checked', result.committed ? `${actual.subshellId}: n=${actual.n}, l=${actual.l}, mₗ=${actual.ml}, mₛ=${actual.ms > 0 ? '+' : '−'}1/2.` : 'n, l, mₗ, and mₛ were scored separately; the entered values remain selected.');
  };

  const setTrend = (side, value) => {
    if (side === 'left') setTrendLeft(value);
    else setTrendRight(value);
    const selected = ATOMIC_ELEMENT_BY_Z[value];
    record('compare', `${selected.symbol} placed in comparator ${side === 'left' ? 'A' : 'B'}`, `NIST first-ionization record: ${selected.ionizationEnergyEV.toFixed(4)} eV.`);
  };

  const recordComparison = (comparison) => {
    record('compare', 'Ionization records compared', comparison.direction);
  };

  return (
    <section className="atomic-lab" id="atomicStructureLab" aria-labelledby="atomicLabTitle">
      <header className="atomic-header">
        <div>
          <p className="section-code">01 / Atomic structure & periodicity</p>
          <h2 id="atomicLabTitle">Stop drawing planets. Build the quantum address.</h2>
          <p>Choose a neutral atom, place every spin arrow yourself, and make the periodic table answer for its ground-state record—exceptions included.</p>
        </div>
        <div className="atomic-condition-stamp">
          <span>Atomic signal observatory</span>
          <strong>36 neutral atoms · 8 subshells · 21 orbitals</strong>
          <small>NIST records · no automatic repair</small>
          <b>{metrics.electronCount}/{element.atomicNumber} e⁻ tuned</b>
        </div>
      </header>
      <div className="atomic-bench">
        <ElementTuner selected={element} onSelect={chooseElement}/>
        <AtomTarget element={element} state={state} onEmpty={startEmpty} onCore={loadCore} onReference={loadReference}/>
        <ProbabilityCloud subshellId={selectedSubshell} onSubshell={setSelectedSubshell}/>
        <PredictionConsole
          predictedMagnetism={predictedMagnetism}
          setPredictedMagnetism={setPredictedMagnetism}
          predictedUnpaired={predictedUnpaired}
          setPredictedUnpaired={setPredictedUnpaired}
          evaluation={evaluation}
          onCheck={checkConfiguration}
          onHint={revealHint}
          hint={hint}
        />
        <OrbitalRack
          state={state}
          selectedSubshell={selectedSubshell}
          selectedElectron={selectedElectron}
          siteFeedback={siteFeedback}
          onFocusSubshell={setSelectedSubshell}
          onPlace={place}
          onRemove={remove}
          onSelectElectron={selectElectron}
        />
        <QuantumDock
          state={state}
          selectedElectron={selectedElectron}
          prediction={quantumPrediction}
          setPrediction={setQuantumPrediction}
          evaluation={quantumEvaluation}
          onCheck={checkQuantum}
        />
        <IonizationTerrain
          leftZ={trendLeft}
          rightZ={trendRight}
          onLeft={(value) => setTrend('left', value)}
          onRight={(value) => setTrend('right', value)}
          onCompare={recordComparison}
        />
        <AtomicTrace entries={entries}/>
        <AtomicPassport/>
      </div>
    </section>
  );
}
