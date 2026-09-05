import { useState } from 'react';
import {
  SELECTIVITY_CHALLENGE_BY_ID,
  SELECTIVITY_CHALLENGES,
  SATURATION_CHALLENGE_BY_ID,
  SATURATION_CHALLENGES,
  SOLUBILITY_MODEL_BOUNDARY,
  SOLUBILITY_SOLID_BY_ID,
  SOLUBILITY_SOLIDS,
} from '../data/solubilityScenarios.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../data/scienceSources.js';
import {
  analyzeSaturationVessel,
  analyzeSelectivity,
  evaluateSaturationAttempt,
  evaluateSelectivityAttempt,
  nextSaturationHint,
  nextSelectivityHint,
} from '../chemistry/solubilityEquilibrium.js';
import '../styles/solubility-equilibrium.css';

const sci = (value, digits = 3) => {
  if (value === -Infinity) return '−∞';
  if (!Number.isFinite(value)) return '—';
  return Number(value).toExponential(digits).replace('e+', 'e');
};
const fixed = (value, digits = 3) => Number(value).toFixed(digits);
const signed = (value, digits = 3) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${sci(Math.abs(value), digits)}`;
const activeClass = (active, extra = '') => `${active ? 'active ' : ''}${extra}`.trim();
const cloneDefaults = (challenge) => ({ ...challenge.defaults });
const challengeConcentrations = (challenge) => Object.fromEntries(challenge.analytes.map((item) => [item.solidId, item.concentrationM]));
const blankSaturationPrediction = () => ({ initialState: '', direction: '', solidMassChange: '', kspMeaning: '' });
const blankSelectivityPrediction = () => ({ firstSolidId: '', targetPossible: '', orderingRule: '', removalBand: '' });

function SolubilityModeTabs({ mode, onMode }) {
  return (
    <nav className="sol-mode-tabs" role="tablist" aria-label="Solubility instruments">
      <button type="button" role="tab" aria-selected={mode === 'saturation'} className={activeClass(mode === 'saturation')} onClick={() => onMode('saturation')}>
        <i aria-hidden="true">⇅</i><span><strong>Saturation vessel</strong><small>mix · settle · account</small></span>
      </button>
      <button type="button" role="tab" aria-selected={mode === 'selectivity'} className={activeClass(mode === 'selectivity')} onClick={() => onMode('selectivity')}>
        <i aria-hidden="true">◭</i><span><strong>Selectivity prism</strong><small>threshold · window · residual</small></span>
      </button>
    </nav>
  );
}

function ChallengeRail({ mode, activeId, onSelect }) {
  const challenges = mode === 'saturation' ? SATURATION_CHALLENGES : SELECTIVITY_CHALLENGES;
  return (
    <nav className={`sol-challenge-rail ${mode}`} aria-label={`${mode} challenges`}>
      {challenges.map((challenge) => {
        const formulas = mode === 'saturation'
          ? SOLUBILITY_SOLID_BY_ID[challenge.solidId].formula
          : challenge.analytes.map((item) => SOLUBILITY_SOLID_BY_ID[item.solidId].formula).join(' / ');
        return (
          <button type="button" aria-pressed={activeId === challenge.id} className={activeClass(activeId === challenge.id)} onClick={() => onSelect(challenge.id)} key={challenge.id}>
            <span>{challenge.code}</span><strong>{challenge.name}</strong><small>{challenge.summary}</small><b>{formulas}</b><i aria-hidden="true"/>
          </button>
        );
      })}
    </nav>
  );
}

function PanelHeading({ code, title, badge }) {
  return <header className="sol-panel-heading"><div><span>{code}</span><strong>{title}</strong></div><b>{badge}</b></header>;
}

function SaturationControls({ challenge, solid, inputs, analysis, stale, onInput, onSettle }) {
  const controls = [
    ['cationConcentrationM', `${solid.ions[0].symbol} source concentration`, 'mol L⁻¹', 0, 10, 'any'],
    ['cationVolumeMl', `${solid.ions[0].symbol} source volume`, 'mL', 0, 1000, 1],
    ['anionConcentrationM', `${solid.ions[1].symbol} source concentration`, 'mol L⁻¹', 0, 10, 'any'],
    ['anionVolumeMl', `${solid.ions[1].symbol} source volume`, 'mL', 0, 1000, 1],
    ['initialSolidMassMg', `Initial ${solid.formula} solid`, 'mg', 0, 1000, 'any'],
  ];
  return (
    <aside className="sol-controls sol-panel">
      <PanelHeading code="SOURCE VALVE MANIFOLD" title={challenge.name} badge={stale ? 'PREVIOUS SETTLE' : analysis ? 'SETTLED' : 'VALVES OPEN'}/>
      <p>{challenge.mission}</p>
      <div className="sol-input-stack">
        {controls.map(([key, label, unit, min, max, step], index) => (
          <label className={index < 2 ? 'cation' : index < 4 ? 'anion' : 'solid'} key={key}>
            <span><i aria-hidden="true"/>{label}</span>
            <div><input aria-label={label} type="number" min={min} max={max} step={step} value={inputs[key]} onChange={(event) => onInput(key, event.target.valueAsNumber)}/><b>{unit}</b></div>
          </label>
        ))}
      </div>
      <button type="button" className="sol-primary-action" onClick={onSettle}><i aria-hidden="true">⇣</i><span><strong>Settle vessel</strong><small>Freeze these exact source valves</small></span></button>
      <small className="sol-procedure-boundary">No reagent recipe, mixing order, apparatus instruction, or visible-cloud promise</small>
    </aside>
  );
}

function IonReservoir({ ion, concentration, tone }) {
  return (
    <div className={`sol-reservoir ${tone}`}>
      <div><span/><i/><b>{ion.symbol}</b></div>
      <strong>{sci(concentration)} M</strong><small>source valve</small>
    </div>
  );
}

function SaturationDial({ analysis }) {
  if (!analysis) return <div className="sol-saturation-dial sealed"><span>Qsp / Ksp</span><strong>SEALED</strong><i/><small>Settle the vessel explicitly</small></div>;
  const log = analysis.initial.log10QOverK;
  const angle = -118 + clampForVisual(log, -6, 6) / 12 * 236;
  return (
    <div className={`sol-saturation-dial ${analysis.initial.saturationState}`}>
      <span>INITIAL LOG₁₀(Qsp/Ksp)</span><strong>{Number.isFinite(log) ? fixed(log, 4) : '−∞'}</strong>
      <div><i style={{ '--dial-angle': `${angle}deg` }}/><b>K</b><small>Q</small></div>
      <p>{analysis.initial.saturationState}</p>
    </div>
  );
}
const clampForVisual = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, Number.isFinite(value) ? value : minimum));

function SettlingColumn({ solid, inputs, analysis, stale, nonce }) {
  const displayedMass = analysis ? analysis.final.solidMassMg : inputs.initialSolidMassMg;
  const sedimentHeight = displayedMass <= 0 ? 0 : Math.min(42, 7 + Math.log10(1 + displayedMass * 18) * 12);
  const tokenCount = 14;
  return (
    <section className={`sol-vessel-stage sol-panel ${analysis ? analysis.direction : 'unsettled'} ${stale ? 'stale' : ''}`}>
      <PanelHeading code="BOROSILICATE SATURATION COLUMN" title={`${solid.dissolutionEquation}`} badge={stale ? 'PREVIOUS SNAPSHOT' : analysis ? analysis.direction.replaceAll('-', ' ').toUpperCase() : 'FROSTED'}/>
      {stale && <p className="sol-stale-note">A valve changed. The glass and ledger still show the previous immutable settle.</p>}
      <div className="sol-vessel-theatre" key={nonce}>
        <IonReservoir ion={solid.ions[0]} concentration={inputs.cationConcentrationM} tone="cation"/>
        <div className="sol-glass-assembly">
          <div className="sol-feed-beams" aria-hidden="true"><i className="cation"/><i className="anion"/></div>
          <div className={`sol-glass-column ${analysis ? 'revealed' : 'frosted'}`} aria-label={`${solid.formula} symbolic saturation vessel`}>
            <div className="sol-liquid-meniscus"/>
            <div className="sol-ion-cloud" aria-hidden="true">
              {Array.from({ length: tokenCount }, (_, index) => <i className={index % 3 === 0 ? 'cation' : 'anion'} style={{ '--ion-index': index }} key={index}>{index % 3 === 0 ? solid.ions[0].symbol : solid.ions[1].symbol}</i>)}
            </div>
            <div className={`sol-sediment ${solid.sediment.pattern}`} style={{ '--sediment-height': `${sedimentHeight}%`, '--sediment-color': solid.sediment.color }}><i/><b>{analysis ? `${sci(displayedMass)} mg` : inputs.initialSolidMassMg > 0 ? 'starting solid' : 'no solid bed'}</b></div>
            {!analysis && <div className="sol-frost-label"><span>STATE NOT SETTLED</span><small>Inputs remain learner owned</small></div>}
            {analysis && <div className={`sol-direction-plume ${analysis.direction}`}><span>{analysis.direction === 'precipitates' ? 'dissolved ions → solid' : analysis.direction.startsWith('dissolves') ? 'solid → dissolved ions' : 'no net solid extent'}</span><b>{analysis.extentMoles < 0 ? '↓' : analysis.extentMoles > 0 ? '↑' : '•'}</b></div>}
          </div>
          <div className="sol-column-base"><i/><b>ξ</b><i/></div>
        </div>
        <IonReservoir ion={solid.ions[1]} concentration={inputs.anionConcentrationM} tone="anion"/>
        <SaturationDial analysis={analysis}/>
      </div>
      <div className="sol-vessel-legend"><span><i className="cation"/>cation source</span><span><i className="anion"/>anion source</span><span><i className="solid"/>patterned solid token</span><b>Graphics encode the ideal ledger—not appearance or identity.</b></div>
    </section>
  );
}

function SaturationLedger({ analysis, stale }) {
  if (!analysis) return <aside className="sol-equilibrium-ledger sol-panel sealed"><PanelHeading code="EQUILIBRIUM LEDGER" title="Signed extent remains closed" badge="SEALED"/><div><i/><strong>Settle one learner state</strong><p>Qsp, the signed formula-unit extent, ion balances, and solid mass will open together.</p></div></aside>;
  return (
    <aside className={`sol-equilibrium-ledger sol-panel ${stale ? 'stale' : ''}`}>
      <PanelHeading code="EQUILIBRIUM LEDGER" title={analysis.solid.name} badge={stale ? 'PREVIOUS' : analysis.final.saturationState.toUpperCase()}/>
      {stale && <p className="sol-stale-note">Values below belong to the previous settle.</p>}
      <div className="sol-ledger-cards">
        <article><span>Qsp initial</span><strong>{sci(analysis.initial.qsp)}</strong><small>log Q/K {Number.isFinite(analysis.initial.log10QOverK) ? fixed(analysis.initial.log10QOverK, 4) : '−∞'}</small></article>
        <article><span>Selected Ksp</span><strong>{sci(analysis.ksp)}</strong><small>pKsp {fixed(analysis.solid.pKsp, 4)}</small></article>
        <article className={analysis.extentMoles < 0 ? 'warm' : analysis.extentMoles > 0 ? 'cool' : ''}><span>Signed ξ</span><strong>{signed(analysis.extentMoles)} mol</strong><small>positive dissolves · negative precipitates</small></article>
        <article><span>Solid mass change</span><strong>{signed(analysis.solidMassChangeMg)} mg</strong><small>final {sci(analysis.final.solidMassMg)} mg</small></article>
      </div>
      <div className="sol-solubility-compare"><article><span>Pure-water molar s</span><strong>{sci(analysis.pureMolarSolubilityM)} M</strong></article><i aria-hidden="true">⇄</i><article><span>Additional s from this background</span><strong>{sci(analysis.backgroundAdditionalSolubilityM)} M</strong></article></div>
      <p className="sol-boundary-reason">{analysis.limitingBoundary}</p>
    </aside>
  );
}

function SaturationTable({ analysis, stale }) {
  if (!analysis) return null;
  return (
    <section className={`sol-audit-table ${stale ? 'stale' : ''}`}>
      <table><caption>Accessible ion, product, extent, and solid-mass record</caption><thead><tr><th>Quantity</th><th>Initial</th><th>Final frozen state</th><th>Unit / meaning</th></tr></thead><tbody>
        {analysis.solid.ions.map((ion, index) => <tr key={ion.id}><th>[{ion.symbol}]</th><td>{sci(analysis.initial.ionConcentrationsM[index])}</td><td>{sci(analysis.final.ionConcentrationsM[index])}</td><td>mol L⁻¹ ideal concentration</td></tr>)}
        <tr><th>Qsp</th><td>{sci(analysis.initial.qsp)}</td><td>{sci(analysis.final.qsp)}</td><td>dimensionless concentration-ratio product</td></tr>
        <tr><th>Solid</th><td>{sci(analysis.initial.solidMassMg)}</td><td>{sci(analysis.final.solidMassMg)}</td><td>mg symbolic inventory</td></tr>
        <tr><th>ξ dissolution</th><td>0</td><td>{signed(analysis.extentMoles)}</td><td>mol formula units</td></tr>
      </tbody></table>
      <div className="sol-equation-stack">{analysis.equationLedger.map((line) => <code key={line}>{line}</code>)}</div>
    </section>
  );
}

function SelectivityControls({ challenge, concentrations, analysis, stale, onInput, onScan }) {
  return (
    <aside className="sol-controls sol-selectivity-controls sol-panel">
      <PanelHeading code="ANALYTE MANIFOLD" title={challenge.name} badge={stale ? 'PREVIOUS SCAN' : analysis ? 'SCANNED' : 'EDITABLE'}/>
      <p>{challenge.mission}</p>
      <div className="sol-analyte-inputs">
        {challenge.analytes.map((analyte, index) => { const solid = SOLUBILITY_SOLID_BY_ID[analyte.solidId]; return <label className={index ? 'second' : 'first'} key={solid.id}><span><i style={{ '--solid-color': solid.sediment.color }}/>{solid.ions[1].symbol} for {solid.formula}</span><div><input aria-label={`${solid.formula} analyte concentration`} type="number" min="1e-20" max="10" step="any" value={concentrations[solid.id]} onChange={(event) => onInput(solid.id, event.target.valueAsNumber)}/><b>mol L⁻¹</b></div><small>Ksp {sci(solid.ksp)}</small></label>; })}
      </div>
      <div className="sol-target-ticket"><span>FIRST-ANALYTE TARGET</span><strong>{fixed(challenge.targetRemovalFraction * 100, 3)}% removed</strong><small>before the second declared onset</small></div>
      <button type="button" className="sol-primary-action" onClick={onScan}><i aria-hidden="true">◭</i><span><strong>Scan thresholds</strong><small>Freeze these exact analyte concentrations</small></span></button>
      <small className="sol-procedure-boundary">No titrant volume, dosing sequence, recovery claim, or separation method</small>
    </aside>
  );
}

function SelectivityPrism({ analysis, stale, nonce }) {
  if (!analysis) return <section className="sol-prism-stage sol-panel sealed"><PanelHeading code="LOGARITHMIC SELECTIVITY PRISM" title="Free-Ag⁺ onset rays are sealed" badge="NO SCAN"/><div className="sol-empty-prism"><i/><i/><strong>Scan one frozen composition</strong><p>The prism compares Ksp/[X⁻], not Ksp labels alone.</p></div></section>;
  const values = [...analysis.entries.map((entry) => entry.log10FreeSilverAtOnset), ...(analysis.freeSilverAtTargetM ? [Math.log10(analysis.freeSilverAtTargetM)] : [])];
  const minimum = Math.floor(Math.min(...values) - 1);
  const maximum = Math.ceil(Math.max(...values) + 1);
  const position = (log) => `${(log - minimum) / (maximum - minimum) * 100}%`;
  return (
    <section className={`sol-prism-stage sol-panel ${stale ? 'stale' : ''}`}>
      <PanelHeading code="LOGARITHMIC SELECTIVITY PRISM" title="Free Ag⁺ rises from left to right" badge={stale ? 'PREVIOUS SCAN' : analysis.simultaneous ? 'COINCIDENT' : analysis.targetPossible ? 'TARGET WINDOW OPEN' : 'TARGET WINDOW CLOSED'}/>
      {stale && <p className="sol-stale-note">An analyte concentration changed. Rays below belong to the previous scan.</p>}
      <div className="sol-prism" key={nonce}>
        <div className="sol-prism-spectrum" aria-hidden="true"><i/><i/><i/><i/><i/></div>
        <div className="sol-prism-axis"><span>lower free Ag⁺</span><b>log₁₀[Ag⁺] / M</b><span>higher free Ag⁺</span></div>
        <div className="sol-prism-ticks">{Array.from({ length: maximum - minimum + 1 }, (_, index) => minimum + index).map((tick) => <i style={{ left: position(tick) }} key={tick}><b>{tick}</b></i>)}</div>
        {analysis.entries.map((entry, index) => <div className={`sol-onset-ray ray-${index + 1}`} style={{ left: position(entry.log10FreeSilverAtOnset), '--ray-color': entry.solid.sediment.color }} key={entry.solidId}><i/><span><strong>{entry.solid.formula} onset</strong><small>{sci(entry.freeSilverAtOnsetM)} M Ag⁺</small></span></div>)}
        {analysis.freeSilverAtTargetM && <div className={`sol-target-slit ${analysis.targetPossible ? 'open' : 'closed'}`} style={{ left: position(Math.log10(analysis.freeSilverAtTargetM)) }}><i/><span>99.9% target</span></div>}
        {!analysis.simultaneous && <div className={`sol-window-band ${analysis.targetPossible ? 'open' : 'closed'}`} style={{ left: position(analysis.first.log10FreeSilverAtOnset), width: `calc(${position(analysis.second.log10FreeSilverAtOnset)} - ${position(analysis.first.log10FreeSilverAtOnset)})` }}><span>{analysis.first.solid.formula} first-only interval</span></div>}
      </div>
      <div className="sol-prism-verdict"><article><span>First onset</span><strong>{analysis.simultaneous ? 'Coincident' : analysis.first.solid.formula}</strong><small>{analysis.simultaneous ? 'no unique first solid' : analysis.first.onsetExpression}</small></article><i aria-hidden="true">→</i><article><span>Removal at second onset</span><strong>{fixed(analysis.fractionRemovedAtSecondOnset * 100, 6)}%</strong><small>ideal first-analyte ledger</small></article><i aria-hidden="true">→</i><article className={analysis.targetPossible ? 'open' : 'closed'}><span>99.9% target</span><strong>{analysis.targetPossible ? 'Before second onset' : 'After second onset'}</strong><small>{analysis.targetPossible ? 'window open in this model' : 'window closed in this model'}</small></article></div>
    </section>
  );
}

function SelectivityTable({ analysis, stale }) {
  if (!analysis) return null;
  return (
    <section className={`sol-audit-table sol-selectivity-table ${stale ? 'stale' : ''}`}>
      <table><caption>Accessible selective-precipitation threshold record</caption><thead><tr><th>Declared solid</th><th>Free analyte / M</th><th>Ksp</th><th>Free Ag⁺ at onset / M</th><th>Order</th></tr></thead><tbody>{analysis.entries.map((entry, index) => <tr key={entry.solidId}><th>{entry.solid.formula}</th><td>{sci(entry.concentrationM)}</td><td>{sci(entry.solid.ksp)}</td><td>{sci(entry.freeSilverAtOnsetM)}</td><td>{analysis.simultaneous ? 'coincident' : index + 1}</td></tr>)}</tbody></table>
      <div className="sol-equation-stack">{analysis.equationLedger.map((line) => <code key={line}>{line}</code>)}</div>
    </section>
  );
}

const saturationFields = [
  ['initialState', 'What is the frozen mixture before solid transfer?', [['undersaturated', 'Q < K'], ['saturated', 'Q = K'], ['supersaturated', 'Q > K']]],
  ['direction', 'Which net direction follows in this bounded model?', [['precipitates', 'Toward solid'], ['dissolves', 'Toward ions'], ['no-net', 'No net change']]],
  ['solidMassChange', 'What happens to the solid inventory?', [['increases', 'Increases'], ['decreases', 'Decreases'], ['unchanged', 'Unchanged']]],
  ['kspMeaning', 'Can Ksp be read directly as molar solubility?', [['ksp-is-molar-solubility', 'Yes, directly'], ['stoichiometry-and-background-matter', 'No—use ν and background']]],
];
const selectivityStaticFields = [
  ['targetPossible', 'Can the first analyte reach 99.9% removal before second onset?', [['yes', 'Yes'], ['no', 'No']]],
  ['orderingRule', 'What sets the onset order?', [['ksp-alone', 'Ksp alone'], ['ksp-and-current-concentration', 'Ksp and current [X⁻]']]],
  ['removalBand', 'How much first analyte is removed at second onset?', [['below-90', '< 90%'], ['90-to-99-9', '90% to <99.9%'], ['at-least-99-9', '≥ 99.9%']]],
];

function PredictionConsole({ mode, challenge, snapshot, stale, prediction, evaluation, hintLevel, hint, onPredict, onCheck, onHint, onClear, onReset }) {
  const firstOptions = mode === 'selectivity' ? challenge.analytes.map((item) => [item.solidId, SOLUBILITY_SOLID_BY_ID[item.solidId].formula]).concat([['simultaneous', 'Coincident']]) : [];
  const fields = mode === 'saturation' ? saturationFields : [['firstSolidId', 'Which declared solid reaches onset first?', firstOptions], ...selectivityStaticFields];
  const complete = Object.values(prediction).every(Boolean);
  return (
    <aside className="sol-prediction-console sol-panel">
      <PanelHeading code="LEARNER CLAIM LOCK" title="Commit four claims before evidence" badge={evaluation ? `${evaluation.score.correct}/4 SUPPORTED` : 'LEARNER OWNED'}/>
      {fields.map(([key, legend, options]) => <fieldset disabled={!snapshot || stale} key={key}><legend>{legend}</legend><div className={`sol-choice-row choices-${options.length}`}>{options.map(([value, label]) => <button type="button" aria-pressed={prediction[key] === value} className={activeClass(prediction[key] === value, value.includes('ksp-is') || value === 'ksp-alone' ? 'danger' : '')} onClick={() => onPredict(key, value)} key={value}>{label}</button>)}</div></fieldset>)}
      {!snapshot && <p className="sol-console-note">Run one explicit {mode === 'saturation' ? 'settle' : 'threshold scan'} before committing claims.</p>}
      {stale && <p className="sol-console-note warning">Inputs changed. Re-run the instrument before checking claims.</p>}
      {snapshot && !stale && !complete && <p className="sol-console-note">Current immutable snapshot · {Object.values(prediction).filter(Boolean).length}/4 claims set</p>}
      {snapshot && !stale && complete && !evaluation && <p className="sol-console-note ready">Four claims ready. The reason panes remain closed.</p>}
      {evaluation && <p className="sol-console-note ready">Compared without changing one learner claim.</p>}
      <div className="sol-action-grid"><button type="button" className="primary" disabled={!snapshot || stale || !complete} onClick={onCheck}>Check four claims</button><button type="button" disabled={!snapshot || stale || hintLevel >= 4} onClick={onHint}>Hint {Math.min(hintLevel + 1, 4)} / 4</button><button type="button" onClick={onClear}>Clear predictions</button><button type="button" onClick={onReset}>Reset challenge</button></div>
      {hint && <div className="sol-hint" aria-live="polite"><span>HINT {hintLevel} · SNAPSHOT UNCHANGED</span><p>{hint}</p></div>}
    </aside>
  );
}

function EvidenceLedger({ evaluation, mode }) {
  const labels = mode === 'saturation'
    ? { initialState: 'Initial saturation', direction: 'Net solid direction', solidMassChange: 'Solid inventory', kspMeaning: 'Ksp versus molar solubility' }
    : { firstSolidId: 'First onset', targetPossible: '99.9% window', orderingRule: 'Ordering rule', removalBand: 'Residual at second onset' };
  if (!evaluation) return <section className="sol-evidence-ledger sol-panel sealed"><PanelHeading code="EVIDENCE WINDOWS" title="Four panes remain frosted" badge="SEALED"/><p>Check four learner claims to open one reason at a time. The instrument will not replace a claim with the model answer.</p><div aria-hidden="true"><i/><i/><i/><i/></div></section>;
  return (
    <section className="sol-evidence-ledger sol-panel"><PanelHeading code="EVIDENCE WINDOWS" title="Each claim has its own reason" badge={`${evaluation.score.correct}/4`}/><div className="sol-verdict-grid">{Object.entries(evaluation.dimensions).map(([key, dimension]) => <article className={dimension.correct ? 'correct' : 'wrong'} key={key}><span>{dimension.correct ? 'SUPPORTED' : 'REVISE THE CLAIM'}</span><h3>{labels[key]}</h3><p><b>Your claim</b>{dimension.learner.replaceAll('-', ' ')}</p><p><b>Model result</b>{dimension.expected.replaceAll('-', ' ')}</p><small>{dimension.reason}</small></article>)}</div></section>
  );
}

function ActionRegister({ history }) {
  return <aside className="sol-history sol-panel"><PanelHeading code="ACTION REGISTER" title="Learner moves in order" badge={String(history.length)}/><div>{history.length ? history.map((entry, index) => <article className={entry.type} key={entry.id}><i/><span>#{String(index + 1).padStart(2, '0')} {entry.type}</span><div><strong>{entry.title}</strong><small>{entry.detail}</small></div></article>) : <p>No moves recorded in this instrument yet.</p>}</div></aside>;
}

function TeacherRail({ onLoad }) {
  const contrasts = [
    { code: 'KSP ≠ s', title: 'Constant versus molar solubility', copy: 'CaF₂ exposes the coefficient product: Ksp = 4s³ in pure water.', mode: 'saturation', id: 'caf2-stoichiometry' },
    { code: 'Q BEFORE CLOUD', title: 'Direction versus visible timing', copy: 'A trace ion product can exceed Ksp without predicting when a cloud appears.', mode: 'saturation', id: 'agi-trace-trigger' },
    { code: 'COMMON ION', title: 'Composition versus constant', copy: 'Chloride suppresses additional AgCl dissolution without changing Ksp.', mode: 'saturation', id: 'agcl-common-ion' },
    { code: 'ORDER CAN FLIP', title: 'Thresholds use Ksp/[X⁻]', copy: 'Very dilute iodide lets abundant chloride reach onset first.', mode: 'selectivity', id: 'concentration-flips-order' },
    { code: 'ONSET ≠ COMPLETE', title: 'First does not mean finished', copy: 'AgBr starts first but misses the 99.9% target before AgCl onset.', mode: 'selectivity', id: 'bromide-chloride-overlap' },
    { code: 'SOLID ≠ IDENTITY', title: 'A ledger is not confirmation', copy: 'A patterned sediment token cannot establish identity, purity, or recovery.', mode: 'saturation', id: 'agcl-near-gate' },
  ];
  return <section className="sol-teacher-rail sol-panel"><PanelHeading code="TEACHER CONTRAST RACK" title="Load a misconception. Nothing runs automatically." badge="6 CONTRASTS"/><div>{contrasts.map((item) => <article key={item.code}><span>{item.code}</span><h3>{item.title}</h3><p>{item.copy}</p><button type="button" onClick={() => onLoad(item.mode, item.id)}>Load instrument <b aria-hidden="true">→</b></button></article>)}</div></section>;
}

function SolubilityPassport() {
  const passport = MODEL_PASSPORTS.solubilityPrecipitationStudio;
  return (
    <section className="sol-passport" aria-label="Solubility and selective precipitation model passport">
      <header><div><span>MODEL PASSPORT</span><h2>{passport.name}</h2></div><strong>{passport.resultKind}</strong></header>
      <p className="sol-passport-warning">A closed ideal ion ledger does not prove visible precipitation, identity, purity, safety, or experimental validity.</p>
      <div className="sol-constant-table"><table><caption>Four selected 298.15 K solid records used by this bounded studio</caption><thead><tr><th>Solid</th><th>Dissolution</th><th>Ksp</th><th>pKsp</th><th>Record</th></tr></thead><tbody>{SOLUBILITY_SOLIDS.map((solid) => <tr key={solid.id}><th>{solid.formula}</th><td>{solid.dissolutionEquation}</td><td>{sci(solid.ksp, 5)}</td><td>{fixed(solid.pKsp, 4)}</td><td>{solid.recordKind.replaceAll('-', ' ')}</td></tr>)}</tbody></table></div>
      <div className="sol-passport-grid"><article><h3>CONDITIONS</h3>{passport.conditions.map((item) => <p key={item}><b>•</b><span>{item}</span></p>)}</article><article><h3>INCLUDED</h3>{passport.includes.map((item) => <p key={item}><b>+</b><span>{item}</span></p>)}</article><article><h3>NOT INCLUDED</h3>{passport.excludes.map((item) => <p key={item}><b>×</b><span>{item}</span></p>)}</article></div>
      <div className="sol-boundary-strip">{Object.entries(SOLUBILITY_MODEL_BOUNDARY).map(([key, copy]) => <article key={key}><span>{key.toUpperCase()}</span><p>{copy}</p></article>)}</div>
      <div className="sol-provenance"><p><b>LEARNER INPUT</b>{passport.inputProvenance}</p><p><b>LOCAL DATA STATEMENT</b>{passport.dataStatement}</p></div>
      <div className="sol-source-grid">{passport.sources.map((sourceId) => { const source = SCIENCE_SOURCES[sourceId]; return <a href={source.url} target="_blank" rel="noreferrer" key={source.id}><span>{source.name}</span><small>{source.role}</small><b aria-hidden="true">↗</b></a>; })}</div>
    </section>
  );
}

export default function SolubilityLab() {
  const firstSat = SATURATION_CHALLENGES[0];
  const firstSep = SELECTIVITY_CHALLENGES[0];
  const [mode, setMode] = useState('saturation');
  const [satId, setSatId] = useState(firstSat.id);
  const [satInputs, setSatInputs] = useState(() => cloneDefaults(firstSat));
  const [satAnalysis, setSatAnalysis] = useState(null);
  const [satStale, setSatStale] = useState(false);
  const [satPrediction, setSatPrediction] = useState(blankSaturationPrediction);
  const [satEvaluation, setSatEvaluation] = useState(null);
  const [satHintLevel, setSatHintLevel] = useState(0);
  const [satHint, setSatHint] = useState('');
  const [satHistory, setSatHistory] = useState([]);
  const [satNonce, setSatNonce] = useState(0);

  const [sepId, setSepId] = useState(firstSep.id);
  const [sepConcentrations, setSepConcentrations] = useState(() => challengeConcentrations(firstSep));
  const [sepAnalysis, setSepAnalysis] = useState(null);
  const [sepStale, setSepStale] = useState(false);
  const [sepPrediction, setSepPrediction] = useState(blankSelectivityPrediction);
  const [sepEvaluation, setSepEvaluation] = useState(null);
  const [sepHintLevel, setSepHintLevel] = useState(0);
  const [sepHint, setSepHint] = useState('');
  const [sepHistory, setSepHistory] = useState([]);
  const [sepNonce, setSepNonce] = useState(0);

  const satChallenge = SATURATION_CHALLENGE_BY_ID[satId];
  const satSolid = SOLUBILITY_SOLID_BY_ID[satChallenge.solidId];
  const sepChallenge = SELECTIVITY_CHALLENGE_BY_ID[sepId];
  const addSatHistory = (type, title, detail) => setSatHistory((current) => [...current, { id: `${current.length + 1}-${type}`, type, title, detail }]);
  const addSepHistory = (type, title, detail) => setSepHistory((current) => [...current, { id: `${current.length + 1}-${type}`, type, title, detail }]);
  const chooseSat = (id) => { const challenge = SATURATION_CHALLENGE_BY_ID[id]; setSatId(id); setSatInputs(cloneDefaults(challenge)); setSatAnalysis(null); setSatStale(false); setSatPrediction(blankSaturationPrediction()); setSatEvaluation(null); setSatHintLevel(0); setSatHint(''); setSatHistory([]); setSatNonce(0); };
  const chooseSep = (id) => { const challenge = SELECTIVITY_CHALLENGE_BY_ID[id]; setSepId(id); setSepConcentrations(challengeConcentrations(challenge)); setSepAnalysis(null); setSepStale(false); setSepPrediction(blankSelectivityPrediction()); setSepEvaluation(null); setSepHintLevel(0); setSepHint(''); setSepHistory([]); setSepNonce(0); };
  const changeSatInput = (key, value) => { if (!Number.isFinite(value)) return; setSatInputs((current) => ({ ...current, [key]: value })); if (satAnalysis) setSatStale(true); addSatHistory('valve', `${key} changed`, `Learner entered ${value}; no equilibrium calculation ran automatically.`); };
  const settle = () => { const analysis = analyzeSaturationVessel({ challengeId: satId, inputs: satInputs }); setSatAnalysis(analysis); setSatStale(false); setSatEvaluation(null); setSatHintLevel(0); setSatHint(''); setSatNonce((value) => value + 1); addSatHistory('settle', 'Vessel settled', `${analysis.initial.saturationState}; ${analysis.direction}; ξ ${sci(analysis.extentMoles)} mol.`); };
  const predictSat = (key, value) => { setSatPrediction((current) => ({ ...current, [key]: value })); setSatEvaluation(null); addSatHistory('prediction', key, `Learner selected “${value.replaceAll('-', ' ')}”.`); };
  const checkSat = () => { const result = evaluateSaturationAttempt({ analysis: satAnalysis, prediction: satPrediction }); setSatEvaluation(result); addSatHistory('checked', 'Four saturation claims compared', `${result.score.correct} of 4 claims supported.`); };
  const hintSat = () => { const level = satHintLevel + 1; const text = nextSaturationHint({ analysis: satAnalysis, prediction: satPrediction, level }); setSatHintLevel(level); setSatHint(text); addSatHistory('hint', `Hint ${level} opened`, 'No valve, snapshot, or learner claim changed.'); };
  const changeSepInput = (solidId, value) => { if (!Number.isFinite(value)) return; setSepConcentrations((current) => ({ ...current, [solidId]: value })); if (sepAnalysis) setSepStale(true); addSepHistory('analyte', `${solidId} concentration changed`, `Learner entered ${value}; no threshold scan ran automatically.`); };
  const scan = () => { const analysis = analyzeSelectivity({ challengeId: sepId, concentrationsM: sepConcentrations }); setSepAnalysis(analysis); setSepStale(false); setSepEvaluation(null); setSepHintLevel(0); setSepHint(''); setSepNonce((value) => value + 1); addSepHistory('scan', 'Threshold prism scanned', analysis.simultaneous ? 'Onsets coincide.' : `${analysis.first.solid.formula} first; ${(analysis.fractionRemovedAtSecondOnset * 100).toFixed(6)}% removed at second onset.`); };
  const predictSep = (key, value) => { setSepPrediction((current) => ({ ...current, [key]: value })); setSepEvaluation(null); addSepHistory('prediction', key, `Learner selected “${value.replaceAll('-', ' ')}”.`); };
  const checkSep = () => { const result = evaluateSelectivityAttempt({ analysis: sepAnalysis, prediction: sepPrediction }); setSepEvaluation(result); addSepHistory('checked', 'Four selectivity claims compared', `${result.score.correct} of 4 claims supported.`); };
  const hintSep = () => { const level = sepHintLevel + 1; const text = nextSelectivityHint({ analysis: sepAnalysis, prediction: sepPrediction, level }); setSepHintLevel(level); setSepHint(text); addSepHistory('hint', `Hint ${level} opened`, 'No analyte, scan, or learner claim changed.'); };
  const loadContrast = (nextMode, id) => { setMode(nextMode); if (nextMode === 'saturation') chooseSat(id); else chooseSep(id); };
  const currentChallenge = mode === 'saturation' ? satChallenge : sepChallenge;

  return (
    <section className="solubility-lab" id="solubilityLab" aria-labelledby="solubilityLabTitle">
      <header className="sol-hero"><div><p className="section-code">12 / Solubility + selective precipitation</p><h2 id="solubilityLabTitle">A cloudy result begins <em>as a number.</em></h2><p>Mix ion inventories, compare Qsp with a declared Ksp, and make one signed solid extent close. Then scan two precipitation thresholds and see concentration overturn a Ksp-only guess.</p></div><aside className="sol-hero-optic" aria-hidden="true"><div className="hero-ion cation">M⁺</div><i/><div className="hero-prism"><span/><span/><span/></div><i/><div className="hero-column"><b>Q/K</b><span/></div><p>ion product → threshold → solid ledger</p></aside></header>
      <SolubilityModeTabs mode={mode} onMode={setMode}/>
      <ChallengeRail mode={mode} activeId={mode === 'saturation' ? satId : sepId} onSelect={mode === 'saturation' ? chooseSat : chooseSep}/>
      <section className="sol-mission-strip"><div><span>CURRENT INSTRUMENT</span><strong>{currentChallenge.code} · {currentChallenge.name}</strong><p>{currentChallenge.mission}</p></div><div><span>TEACHER QUESTION</span><p>{currentChallenge.teacherQuestion}</p></div><b>298.15 K · IDEAL c/c° SURROGATE</b></section>

      {mode === 'saturation' ? <>
        <div className="sol-saturation-main"><SaturationControls challenge={satChallenge} solid={satSolid} inputs={satInputs} analysis={satAnalysis} stale={satStale} onInput={changeSatInput} onSettle={settle}/><SettlingColumn solid={satSolid} inputs={satInputs} analysis={satAnalysis} stale={satStale} nonce={satNonce}/><SaturationLedger analysis={satAnalysis} stale={satStale}/></div>
        <SaturationTable analysis={satAnalysis} stale={satStale}/>
        <div className="sol-learning-grid"><PredictionConsole mode="saturation" challenge={satChallenge} snapshot={satAnalysis} stale={satStale} prediction={satPrediction} evaluation={satEvaluation} hintLevel={satHintLevel} hint={satHint} onPredict={predictSat} onCheck={checkSat} onHint={hintSat} onClear={() => { setSatPrediction(blankSaturationPrediction()); setSatEvaluation(null); addSatHistory('clear', 'Predictions cleared', 'Valves and settled snapshot remained unchanged.'); }} onReset={() => chooseSat(satId)}/><EvidenceLedger evaluation={satEvaluation} mode="saturation"/><ActionRegister history={satHistory}/></div>
      </> : <>
        <div className="sol-selectivity-main"><SelectivityControls challenge={sepChallenge} concentrations={sepConcentrations} analysis={sepAnalysis} stale={sepStale} onInput={changeSepInput} onScan={scan}/><SelectivityPrism analysis={sepAnalysis} stale={sepStale} nonce={sepNonce}/></div>
        <SelectivityTable analysis={sepAnalysis} stale={sepStale}/>
        <div className="sol-learning-grid"><PredictionConsole mode="selectivity" challenge={sepChallenge} snapshot={sepAnalysis} stale={sepStale} prediction={sepPrediction} evaluation={sepEvaluation} hintLevel={sepHintLevel} hint={sepHint} onPredict={predictSep} onCheck={checkSep} onHint={hintSep} onClear={() => { setSepPrediction(blankSelectivityPrediction()); setSepEvaluation(null); addSepHistory('clear', 'Predictions cleared', 'Analytes and threshold scan remained unchanged.'); }} onReset={() => chooseSep(sepId)}/><EvidenceLedger evaluation={sepEvaluation} mode="selectivity"/><ActionRegister history={sepHistory}/></div>
      </>}
      <TeacherRail onLoad={loadContrast}/>
      <SolubilityPassport/>
    </section>
  );
}
