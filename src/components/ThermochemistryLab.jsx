import { useMemo, useState } from 'react';
import {
  CALORIMETRY_CHALLENGE_BY_ID,
  CALORIMETRY_CHALLENGES,
  HESS_CHALLENGE_BY_ID,
  HESS_CHALLENGES,
  HESS_MULTIPLIERS,
  THERMOCHEMISTRY_MODEL_BOUNDARY,
  THERMOCHEMISTRY_SPECIES,
  THERMOCHEMISTRY_SPECIES_BY_ID,
} from '../data/thermochemistryScenarios.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../data/scienceSources.js';
import {
  auditHessCycle,
  balanceCalorimetry,
  evaluateCalorimetryAttempt,
  evaluateHessAttempt,
  nextCalorimetryHint,
  nextHessHint,
} from '../chemistry/thermochemistry.js';
import '../styles/thermochemistry.css';

const blankHessPrediction = () => ({ targetStatus: '', enthalpySign: '', scalingClaim: '', pathClaim: '' });
const blankCalPrediction = () => ({ temperatureDirection: '', surroundingsSign: '', reactionKind: '', vesselClaim: '' });
const fmt = (value, digits = 3) => Number(value).toFixed(digits);
const signed = (value, digits = 3) => `${value > 0 ? '+' : ''}${fmt(value, digits)}`;
const optionClass = (active, extra = '') => `${active ? 'active ' : ''}${extra}`.trim();
const cloneDefaults = (challenge) => ({ ...challenge.defaults });
const zeroMultipliers = (challenge) => challenge.cards.map(() => 0);

const coefficientText = (value) => {
  const magnitude = Math.abs(value);
  if (Math.abs(magnitude - 1) < 1e-10) return '';
  if (Math.abs(magnitude - 0.5) < 1e-10) return '½';
  return Number.isInteger(magnitude) ? String(magnitude) : String(Number(magnitude.toFixed(2)));
};
const equationFrom = (stoichiometry, multiplier = 1) => {
  if (multiplier === 0) return 'Card parked — no species contribution';
  const entries = Object.entries(stoichiometry).map(([id, coefficient]) => [id, coefficient * multiplier]);
  const terms = (side) => entries.filter(([, coefficient]) => side * coefficient > 0).map(([id, coefficient]) => `${coefficientText(coefficient)}${THERMOCHEMISTRY_SPECIES_BY_ID[id].display}`);
  return `${terms(-1).join(' + ') || '∅'} → ${terms(1).join(' + ') || '∅'}`;
};

function ModeTabs({ mode, onMode }) {
  return (
    <nav className="thermo-mode-tabs" role="tablist" aria-label="Thermochemistry instruments">
      <button type="button" role="tab" aria-selected={mode === 'hess'} className={optionClass(mode === 'hess')} onClick={() => onMode('hess')}>
        <i aria-hidden="true">⇄</i><span><strong>Cycle forge</strong><small>reverse · scale · cancel</small></span>
      </button>
      <button type="button" role="tab" aria-selected={mode === 'calorimetry'} className={optionClass(mode === 'calorimetry')} onClick={() => onMode('calorimetry')}>
        <i aria-hidden="true">°</i><span><strong>Calorimeter</strong><small>observe · balance · infer</small></span>
      </button>
    </nav>
  );
}

function HessChallengeRail({ activeId, onSelect }) {
  return (
    <nav className="thermo-challenge-rail hess" aria-label="Hess-cycle challenges">
      {HESS_CHALLENGES.map((challenge) => (
        <button type="button" aria-pressed={activeId === challenge.id} className={optionClass(activeId === challenge.id)} onClick={() => onSelect(challenge.id)} key={challenge.id}>
          <span>{challenge.code}</span><strong>{challenge.name}</strong><small>{challenge.summary}</small>
          <div aria-hidden="true"><i/><i/><i/></div>
        </button>
      ))}
    </nav>
  );
}

function CalorimetryChallengeRail({ activeId, onSelect }) {
  return (
    <nav className="thermo-challenge-rail calorimetry" aria-label="Calorimetry challenges">
      {CALORIMETRY_CHALLENGES.map((challenge) => (
        <button type="button" aria-pressed={activeId === challenge.id} className={optionClass(activeId === challenge.id)} onClick={() => onSelect(challenge.id)} key={challenge.id}>
          <span>{challenge.code}</span><strong>{challenge.name}</strong><small>{challenge.summary}</small>
          <div className={`mini-thermometer ${challenge.defaults.temperatureChangeK > 0 ? 'warm' : 'cold'}`} aria-hidden="true"><i/></div>
        </button>
      ))}
    </nav>
  );
}

function ReactionTile({ card, multiplier, index, stale, onMultiplier, onReverse }) {
  const direction = multiplier < 0 ? 'reversed' : multiplier > 0 ? 'forward' : 'parked';
  return (
    <article className={`thermo-reaction-tile ${direction}`}>
      <header><span>CARD {String(index + 1).padStart(2, '0')}</span><b>{direction.toUpperCase()}</b></header>
      <div className="thermo-source-equation"><small>Source equation</small><code>{card.label}</code><strong>ΔrH° {signed(card.deltaHkJPerReaction)} kJ</strong></div>
      <div className="thermo-oriented-equation"><small>Current tile</small><code>{equationFrom(card.stoichiometry, multiplier)}</code><strong>{multiplier === 0 ? 'OFF RAIL' : `ΔrH° ${signed(multiplier * card.deltaHkJPerReaction)} kJ`}</strong></div>
      <fieldset>
        <legend>Equation multiplier</legend>
        <div>{HESS_MULTIPLIERS.map((value) => <button type="button" aria-pressed={multiplier === value} className={optionClass(multiplier === value)} onClick={() => onMultiplier(index, value)} key={value}>{value === -0.5 ? '−½' : value === 0.5 ? '½' : value}</button>)}</div>
      </fieldset>
      <button type="button" className="thermo-reverse-switch" onClick={() => onReverse(index)}><i aria-hidden="true"/><span>Throw reverse switch</span><b>{multiplier === 0 ? 'loads −1' : `${multiplier} → ${-multiplier}`}</b></button>
      {stale && <p>Previous audit retained · this tile is now different</p>}
    </article>
  );
}

function CancellationGantry({ audit, stale, nonce }) {
  if (!audit) {
    return (
      <section className="thermo-gantry empty">
        <div className="gantry-frame" aria-hidden="true"><i/><i/><b>Σν</b><i/><i/></div>
        <span>CANCELLATION GANTRY IDLE</span><strong>Set the magnetic tiles, then audit the cycle.</strong>
        <p>Current tile equations stay visible. The net species vector and enthalpy drum remain sealed.</p>
      </section>
    );
  }
  const maximum = Math.max(1, ...audit.cancellationLanes.flatMap((lane) => [lane.reactantMagnitude, lane.productMagnitude]));
  return (
    <section className={`thermo-gantry ${stale ? 'stale' : ''}`} aria-label="Hess species cancellation gantry">
      <header><div><span>SPECIES CANCELLATION GANTRY</span><strong>{audit.challenge.name}</strong></div><b>{stale ? 'PREVIOUS AUDIT' : audit.targetMatched ? 'TARGET VECTOR MATCHED' : 'TARGET NOT MATCHED'}</b></header>
      {stale && <p className="thermo-stale-note">Tiles changed. The gantry keeps the previous immutable audit until you run it again.</p>}
      <div className="thermo-lane-stack" key={nonce}>
        {audit.cancellationLanes.map((lane) => (
          <div className={`thermo-species-lane ${Math.abs(lane.netCoefficient) < 1e-10 ? 'cancelled' : 'open'}`} key={lane.speciesId}>
            <div className="lane-input left"><span style={{ width: `${100 * lane.reactantMagnitude / maximum}%` }}/><b>{fmt(lane.reactantMagnitude, 2)}</b></div>
            <div className="lane-species"><i/><strong>{lane.species.display}</strong><small>{lane.cancelledMagnitude ? `${fmt(lane.cancelledMagnitude, 2)} cancelled` : 'no cancellation'}</small></div>
            <div className="lane-input right"><span style={{ width: `${100 * lane.productMagnitude / maximum}%` }}/><b>{fmt(lane.productMagnitude, 2)}</b></div>
            <output>{Math.abs(lane.netCoefficient) < 1e-10 ? '0' : `${lane.netCoefficient > 0 ? '+' : ''}${fmt(lane.netCoefficient, 2)}`}</output>
          </div>
        ))}
      </div>
      <div className="thermo-contribution-table"><table><caption>Accessible scaled-card and net-species contribution record</caption><thead><tr><th>Species</th>{audit.cards.map((card) => <th key={card.cardId}>Card {card.cardId}</th>)}<th>Cancelled</th><th>Net ν</th></tr></thead><tbody>{audit.cancellationLanes.map((lane) => <tr key={lane.speciesId}><th>{lane.species.display}</th>{lane.contributions.map((value, index) => <td key={`${lane.speciesId}-${index}`}>{signed(value, 2)}</td>)}<td>{fmt(lane.cancelledMagnitude, 2)}</td><td>{signed(lane.netCoefficient, 2)}</td></tr>)}</tbody></table></div>
    </section>
  );
}

function EnthalpyDrum({ audit, stale }) {
  if (!audit) return null;
  const maximum = Math.max(1, Math.abs(audit.pathEnthalpyKJ), Math.abs(audit.targetFormationEnthalpyKJ));
  return (
    <section className={`thermo-enthalpy-drum ${stale ? 'stale' : ''}`}>
      <header><span>ENTHALPY SUM DRUM</span><strong>{audit.netEquation}</strong><b>{audit.targetMatched ? 'GATE OPEN' : 'GATE CLOSED'}</b></header>
      <div className="enthalpy-drum-core">
        <div className="drum-wheel" style={{ '--drum-turn': `${Math.max(-150, Math.min(150, audit.pathEnthalpyKJ / maximum * 150))}deg` }}><i/><b>ΔH</b><span/></div>
        <div className="enthalpy-readouts">
          <article><span>Scaled card path</span><strong>{signed(audit.pathEnthalpyKJ)} kJ</strong><small>{audit.cards.map((card) => `${card.multiplier}×(${fmt(card.sourceEnthalpyKJ, 3)})`).join(' + ')}</small></article>
          <article><span>Net formation ledger</span><strong>{signed(audit.netFormationEnthalpyKJ)} kJ</strong><small>Σνi ΔfH°i for the current net equation</small></article>
          <article><span>Target formation ledger</span><strong>{signed(audit.targetFormationEnthalpyKJ)} kJ</strong><small>{audit.challenge.target.label}</small></article>
        </div>
        <div className={`target-gate ${audit.targetMatched ? 'open' : ''}`}><i/><span>{audit.targetMatched ? 'SPECIES MATCH' : 'REMAINDER BLOCKS GATE'}</span><b>{audit.targetMatched ? '✓' : '×'}</b></div>
      </div>
      <div className="thermo-equation-ledger">{audit.equationLedger.map((line) => <code key={line}>{line}</code>)}</div>
    </section>
  );
}

const hessFields = [
  ['targetStatus', 'Does the net species vector match the target?', [['matched', 'Matched'], ['not-matched', 'Not matched']]],
  ['enthalpySign', 'What is the current path-sum sign?', [['negative', 'Negative'], ['zero', 'Zero'], ['positive', 'Positive']]],
  ['scalingClaim', 'What happens when the written equation is doubled?', [['enthalpy-scales-with-equation', 'ΔH doubles'], ['enthalpy-unchanged-by-scaling', 'ΔH stays fixed']]],
  ['pathClaim', 'For identical endpoint states, does path change ΔH?', [['same-endpoints-same-deltaH', 'Same ΔH'], ['path-changes-deltaH', 'Path changes ΔH']]],
];
const calFields = [
  ['temperatureDirection', 'What happened to the displayed temperature?', [['rise', 'Rose'], ['fall', 'Fell'], ['no-change', 'No change']]],
  ['surroundingsSign', 'What is the sign of qsurroundings?', [['positive', 'Positive'], ['negative', 'Negative'], ['zero', 'Zero']]],
  ['reactionKind', 'What is the inferred reaction-system kind?', [['exothermic', 'Exothermic'], ['endothermic', 'Endothermic'], ['zero', 'Zero heat']]],
  ['vesselClaim', 'What does including the vessel term do?', [['including-vessel-increases-magnitude', 'Increases magnitude'], ['no-effect', 'No effect']]],
];

function PredictionConsole({ mode, snapshot, stale, prediction, evaluation, hintLevel, hint, onPredict, onCheck, onHint, onClear, onReset }) {
  const fields = mode === 'hess' ? hessFields : calFields;
  const complete = Object.values(prediction).every(Boolean);
  return (
    <aside className="thermo-prediction-console thermo-panel">
      <header className="thermo-panel-heading"><div><span>CLAIM INTERLOCK</span><strong>Four switches before evidence opens</strong></div><b>{evaluation ? `${evaluation.score.correct}/4 SUPPORTED` : 'LEARNER OWNED'}</b></header>
      {fields.map(([key, legend, options]) => <fieldset disabled={!snapshot || stale} key={key}><legend>{legend}</legend><div className={`thermo-choice-row choices-${options.length}`}>{options.map(([value, label]) => <button type="button" aria-pressed={prediction[key] === value} className={optionClass(prediction[key] === value, value.includes('unchanged') || value.includes('path-changes') ? 'danger' : '')} onClick={() => onPredict(key, value)} key={value}>{label}</button>)}</div></fieldset>)}
      {!snapshot && <p className="thermo-console-note">Run one explicit {mode === 'hess' ? 'cycle audit' : 'heat balance'} before committing claims.</p>}
      {stale && <p className="thermo-console-note warning">Controls changed. Re-run the explicit snapshot before comparing claims.</p>}
      {snapshot && !stale && !complete && <p className="thermo-console-note">Current snapshot · {Object.values(prediction).filter(Boolean).length}/4 claims set</p>}
      {snapshot && !stale && complete && !evaluation && <p className="thermo-console-note ready">Four claims ready. The reason ledger remains sealed.</p>}
      {evaluation && <p className="thermo-console-note ready">Compared without changing a learner claim.</p>}
      <div className="thermo-action-grid"><button type="button" className="primary" disabled={!snapshot || stale || !complete} onClick={onCheck}>Check four claims</button><button type="button" disabled={!snapshot || stale || hintLevel >= 4} onClick={onHint}>Hint {Math.min(hintLevel + 1, 4)} / 4</button><button type="button" onClick={onClear}>Clear predictions</button><button type="button" onClick={onReset}>Reset challenge</button></div>
      {hint && <div className="thermo-hint" aria-live="polite"><span>HINT {hintLevel} · STATE UNCHANGED</span><p>{hint}</p></div>}
    </aside>
  );
}

function EvaluationLedger({ evaluation, mode }) {
  const labels = mode === 'hess'
    ? { targetStatus: 'Species target', enthalpySign: 'Enthalpy sign', scalingClaim: 'Equation scaling', pathClaim: 'Path independence' }
    : { temperatureDirection: 'Temperature observation', surroundingsSign: 'Surroundings heat', reactionKind: 'Reaction-system heat', vesselClaim: 'Vessel contribution' };
  if (!evaluation) return <section className="thermo-evaluation-ledger thermo-panel sealed"><header className="thermo-panel-heading"><div><span>REASON LEDGER</span><strong>Four interlocks remain closed</strong></div><b>SEALED</b></header><p>Commit all four claims and compare them. Wrong answers will stay selected while each thermochemical reason opens separately.</p><div aria-hidden="true"><i/><i/><i/><i/></div></section>;
  return (
    <section className="thermo-evaluation-ledger thermo-panel"><header className="thermo-panel-heading"><div><span>REASON LEDGER</span><strong>Evidence for each learner claim</strong></div><b>{evaluation.score.correct}/4</b></header><div className="thermo-verdict-grid">{Object.entries(evaluation.dimensions).map(([key, dimension]) => <article className={dimension.correct ? 'correct' : 'wrong'} key={key}><span>{dimension.correct ? 'SUPPORTED' : 'REVISE THE CLAIM'}</span><h3>{labels[key]}</h3><p><b>Your claim</b> {dimension.learner.replaceAll('-', ' ')}</p><p><b>Model result</b> {dimension.expected.replaceAll('-', ' ')}</p><small>{dimension.reason}</small></article>)}</div></section>
  );
}

function HistoryRail({ history }) {
  return <aside className="thermo-history thermo-panel"><header className="thermo-panel-heading"><div><span>ACTION REGISTER</span><strong>Learner moves, in order</strong></div><b>{history.length}</b></header><div>{history.length ? history.map((entry, index) => <article className={entry.type} key={entry.id}><i/><span>#{String(index + 1).padStart(2, '0')} {entry.type}</span><div><strong>{entry.title}</strong><small>{entry.detail}</small></div></article>) : <p>No moves recorded in this instrument yet.</p>}</div></aside>;
}

function CalorimetryControls({ challenge, inputs, balance, stale, onInput, onBalance }) {
  const controls = [
    ['solutionMassG', 'Solution mass', 'g', 1, 1000, 1],
    ['specificHeatJgK', 'Specific heat cp', 'J g⁻¹ K⁻¹', 0.1, 10, 0.001],
    ['temperatureChangeK', 'Observed ΔT', 'K', -50, 50, 0.1],
    ['calorimeterConstantJK', 'Vessel Ccal', 'J K⁻¹', 0, 1000, 1],
    ['reactionExtentMol', 'Reaction extent ξ', 'mol', 0.0001, 10, 0.001],
  ];
  return (
    <aside className="thermo-cal-controls thermo-panel">
      <header className="thermo-panel-heading"><div><span>SYNTHETIC OBSERVATION CONSOLE</span><strong>{challenge.name}</strong></div><b>{stale ? 'LEDGER STALE' : balance ? 'LEDGER CURRENT' : 'OBSERVATION OPEN'}</b></header>
      <p>{challenge.mission}</p>
      <div className="thermo-cal-inputs">{controls.map(([key, label, unit, min, max, step]) => <label key={key}><span>{label}</span><div><input aria-label={label} type="number" min={min} max={max} step={step} value={inputs[key]} onChange={(event) => onInput(key, event.target.valueAsNumber)}/><b>{unit}</b></div></label>)}</div>
      <button type="button" className="thermo-balance-button" onClick={onBalance}><span aria-hidden="true">⇄</span><b>Balance heat ledger</b><small>Freeze this exact synthetic observation</small></button>
      <small className="thermo-no-procedure">No reagent, apparatus, mixing order, or laboratory procedure</small>
    </aside>
  );
}

function CutawayCalorimeter({ inputs, balance, stale, nonce }) {
  const temperatureFill = Math.max(8, Math.min(92, 50 + inputs.temperatureChangeK * 4));
  const direction = balance?.heatDirection ?? 'idle';
  return (
    <section className={`thermo-calorimeter-stage thermo-panel ${direction} ${stale ? 'stale' : ''}`}>
      <header className="thermo-panel-heading"><div><span>CUTAWAY DEWAR</span><strong>System core inside a surroundings jacket</strong></div><b>{balance ? direction.replaceAll('-', ' ').toUpperCase() : 'NO BALANCE'}</b></header>
      {stale && <p className="thermo-stale-note">Inputs changed. The heat beads and ledger still belong to the previous balance.</p>}
      <div className="calorimeter-cutaway" key={nonce}>
        <div className="cal-thermometer" aria-label={`Synthetic temperature change ${inputs.temperatureChangeK} kelvin`}><span><i style={{ height: `${temperatureFill}%` }}/></span><b>ΔT {signed(inputs.temperatureChangeK, 2)} K</b></div>
        <div className="cal-vessel-shell">
          <div className="cal-vessel-rim"/>
          <div className="cal-jacket"><span>VESSEL</span><b>Ccal</b></div>
          <div className="cal-solution"><span>SOLUTION</span><b>m cp</b><i/><i/><i/><i/><i/></div>
          <div className="cal-system-core"><span>REACTION SYSTEM</span><b>qsystem</b></div>
          {balance && <div className="cal-heat-beads" aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <i style={{ '--bead-index': index }} key={index}/>)}</div>}
        </div>
        <div className="cal-boundary-key"><p><i className="system"/><span>System</span><b>{balance ? `${signed(balance.qSystemJ, 1)} J` : 'sealed'}</b></p><p><i className="solution"/><span>Solution</span><b>{balance ? `${signed(balance.qSolutionJ, 1)} J` : 'sealed'}</b></p><p><i className="vessel"/><span>Vessel</span><b>{balance ? `${signed(balance.qCalorimeterJ, 1)} J` : 'sealed'}</b></p></div>
      </div>
      {!balance && <div className="calorimeter-empty"><span>HEAT PATH SEALED</span><p>Temperature is an entered observation. Heat direction and magnitude open only after the explicit balance.</p></div>}
    </section>
  );
}

function HeatLedger({ balance, stale }) {
  if (!balance) return null;
  const cards = [
    ['qsolution', balance.qSolutionJ, 'm cp ΔT', 'solution'],
    ['qcal', balance.qCalorimeterJ, 'Ccal ΔT', 'vessel'],
    ['qsurroundings', balance.qSurroundingsJ, 'qsolution + qcal', 'surroundings'],
    ['qsystem', balance.qSystemJ, '−qsurroundings', 'system'],
  ];
  return (
    <section className={`thermo-heat-ledger ${stale ? 'stale' : ''}`}>
      <header><div><span>HEAT ACCOUNTING BOARD</span><strong>Observed surroundings → inferred system</strong></div><b>{stale ? 'PREVIOUS BALANCE' : balance.reactionKind.toUpperCase()}</b></header>
      {stale && <p className="thermo-stale-note">Inputs changed. Every value below belongs to the previous explicit balance.</p>}
      <div className="heat-card-grid">{cards.map(([label, value, formula, tone]) => <article className={tone} key={label}><span>{label}</span><strong>{signed(value, 3)} J</strong><small>{formula}</small></article>)}</div>
      <div className="heat-molar-compare"><article><span>Complete displayed ledger</span><strong>{signed(balance.molarReactionEnthalpyKJmol, 4)} kJ mol⁻¹ reaction</strong><small>solution + vessel</small></article><div><i/><b>{fmt(balance.vesselOmissionPercent, 2)}%</b><span>magnitude omitted</span></div><article><span>If vessel were ignored</span><strong>{signed(balance.noVesselMolarReactionEnthalpyKJmol, 4)} kJ mol⁻¹ reaction</strong><small>solution only</small></article></div>
      <div className="thermo-equation-ledger">{balance.equationLedger.map((line) => <code key={line}>{line}</code>)}</div>
      <div className="thermo-contribution-table"><table><caption>Accessible calorimetry heat ledger</caption><thead><tr><th>Term</th><th>Definition</th><th>Value / J</th><th>Sign</th></tr></thead><tbody>{cards.map(([label, value, formula]) => <tr key={label}><th>{label}</th><td>{formula}</td><td>{signed(value, 3)}</td><td>{value > 0 ? 'positive' : value < 0 ? 'negative' : 'zero'}</td></tr>)}</tbody></table></div>
    </section>
  );
}

function TeacherContrastRail({ onLoad }) {
  const contrasts = [
    { code: 'REVERSE', title: 'Equation direction ↔ ΔH sign', copy: 'Reverse every species side and the reaction-enthalpy sign together.', mode: 'hess', id: 'water-phase-bridge' },
    { code: 'SCALE', title: 'Written amount ↔ extensive ΔH', copy: 'Double the reaction extent and the displayed reaction enthalpy doubles.', mode: 'hess', id: 'carbon-monoxide-formation' },
    { code: 'PATH', title: 'Route ↔ endpoint states', copy: 'Different closed paths share ΔH only when initial and final states match.', mode: 'hess', id: 'methane-combustion-cycle' },
    { code: 'SIGN', title: 'Warm surroundings ↔ exothermic system', copy: 'A positive surroundings heat corresponds to negative system heat here.', mode: 'calorimetry', id: 'thermal-rise' },
    { code: 'VESSEL', title: 'Solution heat + vessel heat', copy: 'A vessel constant changes magnitude without inventing a new heat direction.', mode: 'calorimetry', id: 'vessel-matters' },
    { code: 'EVIDENCE', title: 'ΔT ↔ limited inference', copy: 'A thermometer change does not establish identity, mechanism, or validity.', mode: 'calorimetry', id: 'thermal-fall' },
  ];
  return <section className="thermo-teacher-rail thermo-panel"><header className="thermo-panel-heading"><div><span>TEACHER CONTRAST INTERLOCK</span><strong>Load one misconception. Nothing audits automatically.</strong></div><b>6 CONTRASTS</b></header><div>{contrasts.map((contrast) => <article key={contrast.code}><span>{contrast.code}</span><h3>{contrast.title}</h3><p>{contrast.copy}</p><button type="button" onClick={() => onLoad(contrast.mode, contrast.id)}>Load instrument <b aria-hidden="true">→</b></button></article>)}</div></section>;
}

function ThermochemistryPassport() {
  const passport = MODEL_PASSPORTS.thermochemicalCycleStudio;
  return (
    <section className="thermo-passport" aria-label="Thermochemical cycle studio model passport">
      <header><div><span>MODEL PASSPORT</span><h2>{passport.name}</h2></div><strong>{passport.resultKind}</strong></header>
      <p className="thermo-passport-warning">A closed heat ledger explains this declared model. It does not prove that a reaction occurs, identify a substance, or validate an experiment.</p>
      <div className="thermo-source-data-table"><table><caption>Selected 298.15 K formation-enthalpy records used in the cycle forge</caption><thead><tr><th>Species state</th><th>ΔfH° / kJ mol⁻¹</th><th>Uncertainty</th><th>Record kind</th></tr></thead><tbody>{THERMOCHEMISTRY_SPECIES.map((species) => <tr key={species.id}><th>{species.display}</th><td>{signed(species.formationEnthalpyKJmol, 3)}</td><td>{species.uncertaintyKJmol === null ? 'not attached to selected row' : `±${fmt(species.uncertaintyKJmol, 3)}`}</td><td>{species.referenceKind.replaceAll('-', ' ')}</td></tr>)}</tbody></table></div>
      <div className="thermo-passport-grid"><article><h3>CONDITIONS</h3>{passport.conditions.map((item) => <p key={item}><b>•</b><span>{item}</span></p>)}</article><article><h3>INCLUDED</h3>{passport.includes.map((item) => <p key={item}><b>+</b><span>{item}</span></p>)}</article><article><h3>NOT INCLUDED</h3>{passport.excludes.map((item) => <p key={item}><b>×</b><span>{item}</span></p>)}</article></div>
      <div className="thermo-boundary-strip">{Object.entries(THERMOCHEMISTRY_MODEL_BOUNDARY).map(([key, copy]) => <article key={key}><span>{key.toUpperCase()}</span><p>{copy}</p></article>)}</div>
      <div className="thermo-provenance"><p><b>LEARNER INPUT</b>{passport.inputProvenance}</p><p><b>LOCAL DATA STATEMENT</b>{passport.dataStatement}</p></div>
      <div className="thermo-source-grid">{passport.sources.map((sourceId) => { const source = SCIENCE_SOURCES[sourceId]; return <a href={source.url} target="_blank" rel="noreferrer" key={source.id}><span>{source.name}</span><small>{source.role}</small><b aria-hidden="true">↗</b></a>; })}</div>
    </section>
  );
}

export default function ThermochemistryLab() {
  const firstHess = HESS_CHALLENGES[0];
  const firstCal = CALORIMETRY_CHALLENGES[0];
  const [mode, setMode] = useState('hess');
  const [hessId, setHessId] = useState(firstHess.id);
  const [multipliers, setMultipliers] = useState(() => zeroMultipliers(firstHess));
  const [hessAudit, setHessAudit] = useState(null);
  const [hessStale, setHessStale] = useState(false);
  const [hessPrediction, setHessPrediction] = useState(blankHessPrediction);
  const [hessEvaluation, setHessEvaluation] = useState(null);
  const [hessHintLevel, setHessHintLevel] = useState(0);
  const [hessHint, setHessHint] = useState('');
  const [hessHistory, setHessHistory] = useState([]);
  const [hessNonce, setHessNonce] = useState(0);

  const [calId, setCalId] = useState(firstCal.id);
  const [calInputs, setCalInputs] = useState(() => cloneDefaults(firstCal));
  const [calBalance, setCalBalance] = useState(null);
  const [calStale, setCalStale] = useState(false);
  const [calPrediction, setCalPrediction] = useState(blankCalPrediction);
  const [calEvaluation, setCalEvaluation] = useState(null);
  const [calHintLevel, setCalHintLevel] = useState(0);
  const [calHint, setCalHint] = useState('');
  const [calHistory, setCalHistory] = useState([]);
  const [calNonce, setCalNonce] = useState(0);

  const hessChallenge = HESS_CHALLENGE_BY_ID[hessId];
  const calChallenge = CALORIMETRY_CHALLENGE_BY_ID[calId];
  const addHessHistory = (type, title, detail) => setHessHistory((current) => [...current, { id: `${current.length + 1}-${type}`, type, title, detail }]);
  const addCalHistory = (type, title, detail) => setCalHistory((current) => [...current, { id: `${current.length + 1}-${type}`, type, title, detail }]);

  const chooseHess = (id) => {
    const challenge = HESS_CHALLENGE_BY_ID[id];
    setHessId(id); setMultipliers(zeroMultipliers(challenge)); setHessAudit(null); setHessStale(false);
    setHessPrediction(blankHessPrediction()); setHessEvaluation(null); setHessHintLevel(0); setHessHint(''); setHessHistory([]); setHessNonce(0);
  };
  const chooseCal = (id) => {
    const challenge = CALORIMETRY_CHALLENGE_BY_ID[id];
    setCalId(id); setCalInputs(cloneDefaults(challenge)); setCalBalance(null); setCalStale(false);
    setCalPrediction(blankCalPrediction()); setCalEvaluation(null); setCalHintLevel(0); setCalHint(''); setCalHistory([]); setCalNonce(0);
  };
  const changeMultiplier = (index, value) => {
    setMultipliers((current) => current.map((item, itemIndex) => itemIndex === index ? value : item));
    if (hessAudit) setHessStale(true);
    addHessHistory('switch', `Card ${index + 1} multiplier changed`, `Learner selected ${value}; no cycle audit ran automatically.`);
  };
  const reverseMultiplier = (index) => {
    const next = multipliers[index] === 0 ? -1 : -multipliers[index];
    changeMultiplier(index, next);
  };
  const runHessAudit = () => {
    const audit = auditHessCycle({ challengeId: hessId, multipliers });
    setHessAudit(audit); setHessStale(false); setHessEvaluation(null); setHessHintLevel(0); setHessHint(''); setHessNonce((value) => value + 1);
    addHessHistory('audit', 'Cycle audited', `${audit.targetMatched ? 'Target matched' : 'Target not matched'}; path sum ${signed(audit.pathEnthalpyKJ)} kJ.`);
  };
  const predictHess = (key, value) => { setHessPrediction((current) => ({ ...current, [key]: value })); setHessEvaluation(null); addHessHistory('prediction', key, `Learner selected “${value.replaceAll('-', ' ')}”.`); };
  const checkHess = () => { const result = evaluateHessAttempt({ audit: hessAudit, prediction: hessPrediction }); setHessEvaluation(result); addHessHistory('checked', 'Four Hess claims compared', `${result.score.correct} of 4 claims supported.`); };
  const hintHess = () => { const level = hessHintLevel + 1; const text = nextHessHint({ audit: hessAudit, prediction: hessPrediction, level }); setHessHintLevel(level); setHessHint(text); addHessHistory('hint', `Hint ${level} opened`, 'No multiplier or prediction changed.'); };

  const changeCalInput = (key, value) => {
    if (!Number.isFinite(value)) return;
    setCalInputs((current) => ({ ...current, [key]: value }));
    if (calBalance) setCalStale(true);
    addCalHistory('input', `${key} changed`, `Learner entered ${value}; no heat balance ran automatically.`);
  };
  const runCalBalance = () => {
    const balance = balanceCalorimetry({ challengeId: calId, inputs: calInputs });
    setCalBalance(balance); setCalStale(false); setCalEvaluation(null); setCalHintLevel(0); setCalHint(''); setCalNonce((value) => value + 1);
    addCalHistory('balance', 'Heat ledger balanced', `${balance.reactionKind}; ${signed(balance.molarReactionEnthalpyKJmol, 4)} kJ mol⁻¹ reaction.`);
  };
  const predictCal = (key, value) => { setCalPrediction((current) => ({ ...current, [key]: value })); setCalEvaluation(null); addCalHistory('prediction', key, `Learner selected “${value.replaceAll('-', ' ')}”.`); };
  const checkCal = () => { const result = evaluateCalorimetryAttempt({ balance: calBalance, prediction: calPrediction }); setCalEvaluation(result); addCalHistory('checked', 'Four calorimetry claims compared', `${result.score.correct} of 4 claims supported.`); };
  const hintCal = () => { const level = calHintLevel + 1; const text = nextCalorimetryHint({ balance: calBalance, prediction: calPrediction, level }); setCalHintLevel(level); setCalHint(text); addCalHistory('hint', `Hint ${level} opened`, 'No input or prediction changed.'); };

  const loadContrast = (nextMode, id) => {
    setMode(nextMode);
    if (nextMode === 'hess') chooseHess(id); else chooseCal(id);
  };

  const currentMission = mode === 'hess' ? hessChallenge : calChallenge;
  const hessPreviewSum = useMemo(() => hessChallenge.cards.reduce((sum, card, index) => sum + multipliers[index] * card.deltaHkJPerReaction, 0), [hessChallenge, multipliers]);

  return (
    <section className="thermochemistry-lab" id="thermochemistryLab" aria-labelledby="thermochemistryLabTitle">
      <header className="thermo-hero">
        <div><p className="section-code">11 / Thermochemical cycles + calorimetry</p><h2 id="thermochemistryLabTitle">Heat keeps the books. <em>You choose the path.</em></h2><p>Reverse and scale whole reaction equations, make every species cancel, then step inside a calorimeter and keep the reaction system separate from the surroundings that report it.</p></div>
        <aside className="thermo-hero-instrument" aria-hidden="true"><div className="hero-switch"><i/><span/><b>ΔH</b></div><div className="hero-rail"><i/><i/><i/></div><div className="hero-cup"><i/><b>q</b><span/></div><p>state path → heat ledger</p></aside>
      </header>
      <ModeTabs mode={mode} onMode={setMode}/>
      {mode === 'hess' ? <HessChallengeRail activeId={hessId} onSelect={chooseHess}/> : <CalorimetryChallengeRail activeId={calId} onSelect={chooseCal}/>} 
      <section className="thermo-mission-strip"><div><span>CURRENT INSTRUMENT</span><strong>{currentMission.code} · {currentMission.name}</strong><p>{currentMission.mission}</p></div><div><span>TEACHER QUESTION</span><p>{currentMission.teacherQuestion}</p></div><b>{mode === 'hess' ? 'SELECTED 298.15 K LEDGER' : 'SYNTHETIC · NOT MEASURED'}</b></section>

      {mode === 'hess' ? <>
        <section className="thermo-target-plate"><div><span>TARGET STATE VECTOR</span><strong>{hessChallenge.target.label}</strong><small>ΔrH° from selected formation ledger: {signed(hessChallenge.target.deltaHkJPerReaction)} kJ</small></div><div><span>LIVE TILE SUM · NOT AUDITED</span><b>{signed(hessPreviewSum)} kJ</b><small>Species cancellation remains sealed</small></div></section>
        <div className={`thermo-tile-rack cards-${hessChallenge.cards.length}`}>{hessChallenge.cards.map((card, index) => <ReactionTile card={card} multiplier={multipliers[index]} index={index} stale={hessStale} onMultiplier={changeMultiplier} onReverse={reverseMultiplier} key={card.id}/>)}</div>
        <div className="thermo-audit-gate"><div aria-hidden="true"><i/><b>Σ</b><i/></div><button type="button" onClick={runHessAudit}><span>Freeze current magnetic tiles</span><strong>Audit cycle</strong><small>Sum species vectors and reaction enthalpies</small></button><p>Nothing reverses or scales automatically</p></div>
        <CancellationGantry audit={hessAudit} stale={hessStale} nonce={hessNonce}/>
        <EnthalpyDrum audit={hessAudit} stale={hessStale}/>
        <div className="thermo-learning-grid"><PredictionConsole mode="hess" snapshot={hessAudit} stale={hessStale} prediction={hessPrediction} evaluation={hessEvaluation} hintLevel={hessHintLevel} hint={hessHint} onPredict={predictHess} onCheck={checkHess} onHint={hintHess} onClear={() => { setHessPrediction(blankHessPrediction()); setHessEvaluation(null); addHessHistory('clear', 'Predictions cleared', 'Tiles and audit remained unchanged.'); }} onReset={() => chooseHess(hessId)}/><EvaluationLedger evaluation={hessEvaluation} mode="hess"/><HistoryRail history={hessHistory}/></div>
      </> : <>
        <div className="thermo-cal-main"><CalorimetryControls challenge={calChallenge} inputs={calInputs} balance={calBalance} stale={calStale} onInput={changeCalInput} onBalance={runCalBalance}/><CutawayCalorimeter inputs={calInputs} balance={calBalance} stale={calStale} nonce={calNonce}/></div>
        <HeatLedger balance={calBalance} stale={calStale}/>
        <div className="thermo-learning-grid"><PredictionConsole mode="calorimetry" snapshot={calBalance} stale={calStale} prediction={calPrediction} evaluation={calEvaluation} hintLevel={calHintLevel} hint={calHint} onPredict={predictCal} onCheck={checkCal} onHint={hintCal} onClear={() => { setCalPrediction(blankCalPrediction()); setCalEvaluation(null); addCalHistory('clear', 'Predictions cleared', 'Inputs and heat ledger remained unchanged.'); }} onReset={() => chooseCal(calId)}/><EvaluationLedger evaluation={calEvaluation} mode="calorimetry"/><HistoryRail history={calHistory}/></div>
      </>}
      <TeacherContrastRail onLoad={loadContrast}/>
      <ThermochemistryPassport/>
    </section>
  );
}
