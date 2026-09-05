import {useMemo,useRef,useState} from 'react';
import {
  AMINO_ACIDS,
  AMINO_ACID_CLASSES,
  BIOMOLECULAR_MODEL_NOTE,
  DEFAULT_PKA_MODEL,
  NUCLEIC_ACID_PRESETS,
  NUCLEOBASES,
  NUCLEOTIDE_ANATOMY,
  PKA_MODEL_FIELDS,
  aminoAcidById,
  nucleobaseById,
} from '../data/biomolecularComponents.js';
import {
  PEPTIDE_MODEL_BOUNDARY,
  analyzePeptideIonization,
  analyzePeptideState,
  createChargeTrace,
  createPeptideState,
  extendPeptide,
  hydrolyzePeptideBond,
  ionizablePkaKeys,
  solveIsoelectricPH,
} from '../chemistry/peptideChemistry.js';
import {
  NUCLEIC_ACID_MODEL_BOUNDARY,
  evaluateComplement,
  expectedComplement,
  nextComplementHint,
  placeComplementBase,
} from '../chemistry/nucleicAcids.js';
import {MODEL_PASSPORTS,SCIENCE_SOURCES} from '../data/scienceSources.js';
import '../styles/biomolecular.css';

const clamp=(value,minimum,maximum)=>Math.max(minimum,Math.min(maximum,value));
const chargeText=(value)=>`${value>=0?'+':''}${value.toFixed(2)}`;

function ChargeBadge({site,kind='side'}) {
  if (!site) return null;
  return <span className={`bio-charge-badge ${site.kind} ${kind}`} title={`${site.label}: ${chargeText(site.charge)} expected charge at pH ${site.pH??''}`}><i/>{chargeText(site.charge)}</span>;
}

function ChargeCurve({trace,pH,netCharge,isoelectricPH}) {
  const width=760,height=300,left=58,right=732,top=30,bottom=254;
  const maximum=Math.max(1,...trace.map((point)=>point.netCharge));
  const minimum=Math.min(-1,...trace.map((point)=>point.netCharge));
  const x=(value)=>left+value/14*(right-left);
  const y=(value)=>top+(maximum-value)/(maximum-minimum)*(bottom-top);
  const path=trace.map((point,index)=>`${index?'L':'M'}${x(point.pH).toFixed(2)} ${y(point.netCharge).toFixed(2)}`).join(' ');
  return <svg className="bio-charge-curve" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Expected fractional charge versus pH. Current pH ${pH.toFixed(2)}, net charge ${chargeText(netCharge)}, approximate isoelectric pH ${isoelectricPH.toFixed(2)}.`}>
    <title>Expected peptide charge across pH</title>
    <defs><linearGradient id="bioChargeStroke" x1="0" x2="1"><stop stopColor="#6bd5ff"/><stop offset=".52" stopColor="#f5f7f4"/><stop offset="1" stopColor="#ff7a7a"/></linearGradient><filter id="bioCurveGlow"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    {[0,2,4,6,8,10,12,14].map((tick)=><g key={tick}><line className="bio-chart-grid vertical" x1={x(tick)} x2={x(tick)} y1={top} y2={bottom}/><text x={x(tick)} y={bottom+21} textAnchor="middle">{tick}</text></g>)}
    {[Math.ceil(minimum),0,Math.floor(maximum)].filter((value,index,array)=>array.indexOf(value)===index).map((tick)=><g key={tick}><line className={`bio-chart-grid ${tick===0?'zero':''}`} x1={left} x2={right} y1={y(tick)} y2={y(tick)}/><text x={left-10} y={y(tick)+4} textAnchor="end">{tick>0?`+${tick}`:tick}</text></g>)}
    <path className="bio-charge-path" d={path}/>
    <g className="bio-pi-marker"><line x1={x(isoelectricPH)} x2={x(isoelectricPH)} y1={top} y2={bottom}/><text x={x(isoelectricPH)} y={top-9} textAnchor="middle">pH(I) {isoelectricPH.toFixed(2)}</text></g>
    <g className="bio-current-marker" filter="url(#bioCurveGlow)"><line x1={x(pH)} x2={x(pH)} y1={top} y2={bottom}/><circle cx={x(pH)} cy={y(netCharge)} r="8"/><text x={x(pH)+12} y={y(netCharge)-12}>{chargeText(netCharge)}</text></g>
    <text className="bio-axis-label" x={(left+right)/2} y={height-9} textAnchor="middle">pH · learner controlled</text>
  </svg>;
}

function ResidueTile({residue,selected,onSelect}) {
  return <button type="button" className={`bio-residue-tile ${selected?'selected':''}`} aria-pressed={selected} onClick={()=>onSelect(residue.id)} style={{'--residue-accent':residue.accent}}><span>{residue.oneLetter}</span><b>{residue.threeLetter}</b><strong>{residue.name}</strong><small>{residue.sideChain}</small>{residue.ionizable&&<i title="Ionizable side chain">±</i>}</button>;
}

function PeptideRibbon({state,ionization,activeChainIndex,selectedBond,onChooseChain,onChooseBond}) {
  return <div className="bio-ribbons" aria-label="Current peptide fragments">
    {state.chains.map((chain,chainIndex)=>{
      const nSite=ionization.sites.find((site)=>site.id===`n-${chainIndex}`);
      const cSite=ionization.sites.find((site)=>site.id===`c-${chainIndex}`);
      return <article className={`bio-ribbon ${activeChainIndex===chainIndex?'active':''}`} key={`${chain.join('-')}-${chainIndex}`}>
        <button type="button" className="bio-fragment-select" aria-pressed={activeChainIndex===chainIndex} onClick={()=>onChooseChain(chainIndex)}><span>Fragment {chainIndex+1}</span><b>{chain.map((id)=>aminoAcidById(id).oneLetter).join('')}</b><small>{chain.length} {chain.length===1?'residue':'residues'}</small></button>
        <div className="bio-chain-track">
          <div className="bio-terminus n"><ChargeBadge site={nSite} kind="terminus"/><strong>N</strong><span>amino end</span></div>
          {chain.map((residueId,residueIndex)=>{
            const residue=aminoAcidById(residueId);
            const sideSite=ionization.sites.find((site)=>site.id===`side-${chainIndex}-${residueIndex}`);
            return <div className="bio-chain-unit" key={`${residueId}-${residueIndex}`}>
              <div className="bio-residue-node" style={{'--residue-accent':residue.accent}}><ChargeBadge site={sideSite}/><span>{residue.oneLetter}</span><strong>{residue.threeLetter}</strong><small>{residueIndex+1}</small></div>
              {residueIndex<chain.length-1&&<button type="button" className={`bio-peptide-bond ${selectedBond?.chainIndex===chainIndex&&selectedBond?.bondIndex===residueIndex?'selected':''}`} aria-pressed={selectedBond?.chainIndex===chainIndex&&selectedBond?.bondIndex===residueIndex} aria-label={`Select peptide bond between ${residue.threeLetter} ${residueIndex+1} and ${aminoAcidById(chain[residueIndex+1]).threeLetter} ${residueIndex+2}`} onClick={()=>onChooseBond(chainIndex,residueIndex)}><i/><i/><span>peptide bond</span></button>}
            </div>;
          })}
          <div className="bio-terminus c"><ChargeBadge site={cSite} kind="terminus"/><strong>C</strong><span>carboxyl end</span></div>
        </div>
      </article>;
    })}
  </div>;
}

function NucleotideAnatomy({polymer}) {
  return <div className="bio-nucleotide-anatomy">
    <div className="bio-anatomy-graphic" aria-label={`${polymer==='dna'?'DNA':'RNA'} nucleotide anatomy: phosphate, pentose sugar, and nitrogenous base.`}>
      <div className="phosphate"><span>PO₄</span><i>phosphate</i></div><b className="anatomy-link">—O—</b><div className="sugar"><span>{polymer==='dna'?'2′-deoxy':'2′-OH'}</span><i>{polymer==='dna'?'deoxyribose':'ribose'}</i></div><b className="anatomy-link">—</b><div className="base"><span>A</span><i>base identity</i></div>
    </div>
    <div className="bio-anatomy-notes">{NUCLEOTIDE_ANATOMY.map((part)=><div key={part.id}><i style={{background:part.accent}}/><span><strong>{part.label}</strong><small>{part.role}</small></span></div>)}</div>
    <p>A <b>nucleoside</b> is base + sugar. A <b>nucleotide</b> adds phosphate.</p>
  </div>;
}

function StrandZipper({polymer,template,answers,selectedSlot,evaluation,checked,onSelectSlot}) {
  return <div className="bio-strand-stage" aria-label={`${polymer.toUpperCase()} antiparallel complement builder`}>
    <div className="bio-strand-direction"><span>template</span><b>5′</b><i/><b>3′</b></div>
    <div className="bio-pair-columns">
      {template.split('').map((templateBase,index)=>{
        const answer=answers[index];
        const result=checked?evaluation.positions[index]:null;
        const templateRecord=nucleobaseById(templateBase);
        const answerRecord=answer?nucleobaseById(answer):null;
        return <div className={`bio-pair-column ${result?.status??''}`} key={`${templateBase}-${index}`}>
          <div className="bio-template-base" style={{'--base-accent':templateRecord.accent}}><span>{templateBase}</span><small>{templateRecord.family}</small></div>
          <div className="bio-hbond-lane" aria-hidden="true">{result?.status==='correct'?Array.from({length:result.hydrogenBonds},(_,dot)=><i key={dot}/>):<b>{checked&&result?.status==='incorrect'?'×':'·'}</b>}</div>
          <button type="button" className={`bio-complement-socket ${selectedSlot===index?'selected':''}`} aria-pressed={selectedSlot===index} aria-label={`Complement socket ${index+1}${answer?`, contains ${answerRecord.name}`:', empty'}`} onClick={()=>onSelectSlot(index)} style={{'--base-accent':answerRecord?.accent??'#4b5368'}}>{answer?<><span>{answer}</span><small>{answerRecord.family}</small></>:<><span>+</span><small>slot {index+1}</small></>}</button>
          {checked&&<em title={result.reason}>{result.status==='correct'?'match':result.status==='incorrect'?'review':'empty'}</em>}
        </div>;
      })}
    </div>
    <div className="bio-strand-direction complement"><span>your complement</span><b>3′</b><i/><b>5′</b></div>
  </div>;
}

export default function BiomolecularStudio() {
  const [classFilter,setClassFilter]=useState('all');
  const [selectedResidueId,setSelectedResidueId]=useState('ala');
  const [peptideState,setPeptideState]=useState(()=>createPeptideState(['gly']));
  const [activeChainIndex,setActiveChainIndex]=useState(0);
  const [selectedBond,setSelectedBond]=useState(null);
  const [pH,setPH]=useState(7);
  const [pKaModel,setPkaModel]=useState(()=>({...DEFAULT_PKA_MODEL}));
  const [peptideFeedback,setPeptideFeedback]=useState({tone:'ready',title:'Glycine is on the loom.',detail:'Select a residue, then choose the N or C terminus. Nothing attaches automatically.'});

  const [polymer,setPolymer]=useState('dna');
  const [presetId,setPresetId]=useState('dna-gattaca');
  const preset=NUCLEIC_ACID_PRESETS.find((item)=>item.id===presetId);
  const template=preset.template;
  const [answers,setAnswers]=useState(()=>Object.freeze(Array(7).fill(null)));
  const [selectedSlot,setSelectedSlot]=useState(0);
  const [strandChecked,setStrandChecked]=useState(false);
  const [strandHints,setStrandHints]=useState([]);
  const [strandFeedback,setStrandFeedback]=useState({tone:'ready',title:'The complement strand is empty.',detail:'Choose a socket and place one base. Wrong but allowed bases will stay where you put them.'});

  const [trace,setTrace]=useState([{id:0,type:'start',title:'Biomolecular loom ready',detail:'One glycine residue; no nucleotide bases placed.'}]);
  const traceId=useRef(1);
  const record=(type,title,detail)=>{const id=traceId.current++;setTrace((current)=>[{id,type,title,detail},...current].slice(0,16));};

  const visibleResidues=classFilter==='all'?AMINO_ACIDS:AMINO_ACIDS.filter((residue)=>residue.classId===classFilter);
  const selectedResidue=aminoAcidById(selectedResidueId);
  const peptideSummary=useMemo(()=>analyzePeptideState(peptideState),[peptideState]);
  const ionization=useMemo(()=>analyzePeptideIonization({chains:peptideState.chains,pH,pKaModel}),[peptideState,pH,pKaModel]);
  const isoelectricPH=useMemo(()=>solveIsoelectricPH({chains:peptideState.chains,pKaModel}),[peptideState,pKaModel]);
  const chargeTrace=useMemo(()=>createChargeTrace({chains:peptideState.chains,pKaModel,pointCount:85}),[peptideState,pKaModel]);
  const activePkaKeys=useMemo(()=>ionizablePkaKeys(peptideState.chains),[peptideState]);
  const activePkaFields=PKA_MODEL_FIELDS.filter((field)=>activePkaKeys.includes(field.id));

  const complementExpectation=useMemo(()=>expectedComplement({polymer,template}),[polymer,template]);
  const complementEvaluation=useMemo(()=>evaluateComplement({polymer,template,answers}),[polymer,template,answers]);
  const passport=MODEL_PASSPORTS.biomolecularAssembly;

  const selectResidue=(id)=>{setSelectedResidueId(id);const residue=aminoAcidById(id);record('selection',`${residue.name} selected`,`${residue.threeLetter} · ${residue.sideChain} · ${residue.classId}`);};
  const startNewPeptide=()=>{const next=createPeptideState([selectedResidueId]);setPeptideState(next);setActiveChainIndex(0);setSelectedBond(null);setPeptideFeedback({tone:'success',title:`New chain starts with ${selectedResidue.threeLetter}.`,detail:'A single free amino acid has no peptide bond and releases no water.'});record('reset',`New ${selectedResidue.threeLetter} chain`,`${selectedResidue.formula} as the free neutral amino-acid formula.`);};
  const attachResidue=(end)=>{const outcome=extendPeptide({state:peptideState,chainIndex:activeChainIndex,residueId:selectedResidueId,end,maxResidues:8});setPeptideFeedback({tone:outcome.ok?'success':'blocked',title:outcome.ok?`${selectedResidue.threeLetter} attached at the ${end==='n'?'N':'C'} end.`:'Attachment blocked.',detail:outcome.reason});if(outcome.ok){setPeptideState(outcome.state);setSelectedBond(null);}record(outcome.ok?'condensation':'blocked',outcome.ok?'Peptide bond formed':'Attachment blocked',outcome.reason);};
  const chooseBond=(chainIndex,bondIndex)=>{setActiveChainIndex(chainIndex);setSelectedBond({chainIndex,bondIndex});const chain=peptideState.chains[chainIndex];const left=aminoAcidById(chain[bondIndex]),right=aminoAcidById(chain[bondIndex+1]);setPeptideFeedback({tone:'selected',title:`${left.threeLetter}—${right.threeLetter} bond selected.`,detail:'Hydrolysis will consume one H₂O and split this exact bond. Nothing happens until you press hydrolyse.'});record('selection','Peptide bond selected',`${left.threeLetter} ${bondIndex+1} — ${right.threeLetter} ${bondIndex+2}`);};
  const hydrolyseSelected=()=>{if(!selectedBond){const detail='Select one visible peptide bond on the ribbon first.';setPeptideFeedback({tone:'blocked',title:'Hydrolysis blocked.',detail});record('blocked','Hydrolysis blocked',detail);return;}const outcome=hydrolyzePeptideBond({state:peptideState,...selectedBond});setPeptideFeedback({tone:outcome.ok?'success':'blocked',title:outcome.ok?'Selected bond hydrolysed.':'Hydrolysis blocked.',detail:outcome.reason});if(outcome.ok){setPeptideState(outcome.state);setActiveChainIndex(selectedBond.chainIndex);setSelectedBond(null);}record(outcome.ok?'hydrolysis':'blocked',outcome.ok?'Chain split':'Hydrolysis blocked',outcome.reason);};
  const resetPkaModel=()=>{setPkaModel({...DEFAULT_PKA_MODEL});record('model','Classroom pKa defaults restored',BIOMOLECULAR_MODEL_NOTE);};

  const loadPreset=(nextPreset)=>{setPolymer(nextPreset.polymerId);setPresetId(nextPreset.id);setAnswers(Object.freeze(Array(nextPreset.template.length).fill(null)));setSelectedSlot(0);setStrandChecked(false);setStrandHints([]);setStrandFeedback({tone:'ready',title:`${nextPreset.name} loaded.`,detail:'The template is fixed. Build the antiparallel complement one socket at a time.'});record('setup','Nucleic-acid template changed',`${nextPreset.name} · ${nextPreset.template}`);};
  const choosePolymer=(nextPolymer)=>{if(nextPolymer===polymer)return;loadPreset(NUCLEIC_ACID_PRESETS.find((item)=>item.polymerId===nextPolymer));};
  const placeBase=(baseId)=>{const outcome=placeComplementBase({polymer,template,answers,index:selectedSlot,baseId});setStrandFeedback({tone:outcome.ok?'placed':'blocked',title:outcome.ok?`${baseId} placed in socket ${selectedSlot+1}.`:'Base placement blocked.',detail:outcome.reason});if(outcome.ok){setAnswers(outcome.answers);setStrandChecked(false);setStrandHints([]);const nextEmpty=outcome.answers.findIndex((answer,index)=>index>selectedSlot&&!answer);if(nextEmpty!==-1)setSelectedSlot(nextEmpty);}record(outcome.ok?'base':'blocked',outcome.ok?`${baseId} placed`:'Base blocked',outcome.reason);};
  const clearSelectedSlot=()=>{if(!answers[selectedSlot]){const detail=`Socket ${selectedSlot+1} is already empty.`;setStrandFeedback({tone:'blocked',title:'Nothing to remove.',detail});record('blocked','Clear socket blocked',detail);return;}const next=Object.freeze(answers.map((answer,index)=>index===selectedSlot?null:answer));setAnswers(next);setStrandChecked(false);setStrandHints([]);setStrandFeedback({tone:'placed',title:`Socket ${selectedSlot+1} cleared.`,detail:'Only your selected complement base was removed; the template did not change.'});record('base','Complement base removed',`Socket ${selectedSlot+1} is empty.`);};
  const checkStrand=()=>{setStrandChecked(true);const evaluation=evaluateComplement({polymer,template,answers});const tone=evaluation.status==='complete'?'success':evaluation.status==='incorrect'?'incorrect':'incomplete';setStrandFeedback({tone,title:evaluation.status==='complete'?'Canonical complement complete.':evaluation.status==='incorrect'?'Some placed bases need review.':'The strand is still incomplete.',detail:evaluation.summary});record(tone,'Complement checked',evaluation.summary);};
  const revealHint=()=>{const level=Math.min(3,strandHints.length+1);const hint=nextComplementHint({polymer,template,answers,level});setStrandHints((current)=>[...current,hint]);setStrandFeedback({tone:'hint',title:hint.index===null?'No unresolved socket.':`Hint for socket ${hint.index+1}.`,detail:hint.text});record('hint',`Complement hint ${level}`,hint.text);};
  const resetStrand=()=>{setAnswers(Object.freeze(Array(template.length).fill(null)));setSelectedSlot(0);setStrandChecked(false);setStrandHints([]);setStrandFeedback({tone:'ready',title:'Complement cleared.',detail:'The fixed template remains. No answer was filled automatically.'});record('reset','Complement cleared',`${template.length} empty learner sockets.`);};

  return <section className="biomolecular-lab" id="biomoleculeLab" aria-labelledby="biomoleculeLabTitle">
    <header className="bio-header">
      <div><p className="section-code">23 / Biomolecular assembly</p><h2 id="biomoleculeLabTitle">A sequence is not a folded structure. Build the chemistry you can actually prove.</h2><p>Weave residues into a peptide, cut a bond with water, move pH through fractional charge, then zip an antiparallel DNA or RNA complement by hand.</p></div>
      <div className="bio-header-emblem" aria-hidden="true"><div className="emblem-thread peptide"><i/><i/><i/><i/></div><span>sequence</span><b>≠</b><span>structure</span><div className="emblem-thread nucleic"><i/><i/><i/><i/></div></div>
    </header>

    <div className="bio-bench">
      <aside className="bio-amino-shelf bio-card">
        <div className="bio-panel-heading"><span>20-residue library</span><strong>Choose the next thread</strong></div>
        <div className="bio-class-filters">{AMINO_ACID_CLASSES.map((item)=><button type="button" key={item.id} className={classFilter===item.id?'active':''} aria-pressed={classFilter===item.id} onClick={()=>setClassFilter(item.id)} style={{'--filter-accent':item.accent}}>{item.label}</button>)}</div>
        <div className="bio-residue-grid">{visibleResidues.map((residue)=><ResidueTile key={residue.id} residue={residue} selected={selectedResidueId===residue.id} onSelect={selectResidue}/>)}</div>
        <div className="bio-selected-residue" style={{'--residue-accent':selectedResidue.accent}}><span><b>{selectedResidue.oneLetter}</b><strong>{selectedResidue.name}</strong><small>{selectedResidue.threeLetter} · {selectedResidue.classId}</small></span><dl><div><dt>Free formula</dt><dd>{selectedResidue.formula}</dd></div><div><dt>R group</dt><dd>{selectedResidue.sideChain}</dd></div></dl>{selectedResidue.ionizable?<p><i/>Ionizable {selectedResidue.ionizable.label}; uses editable pKa {pKaModel[selectedResidue.ionizable.pKaKey].toFixed(2)}.</p>:<p><i/>No side-chain ionization is included in this classroom model.</p>}</div>
        <button type="button" className="bio-start-button" onClick={startNewPeptide}>Start new chain with {selectedResidue.threeLetter}</button>
      </aside>

      <section className="bio-loom bio-card">
        <div className="bio-loom-topline"><span><i/>biomolecular loom · N → C</span><b>{peptideSummary.fragmentCount} {peptideSummary.fragmentCount===1?'fragment':'fragments'} · {peptideSummary.residueCount}/8 residues</b></div>
        <PeptideRibbon state={peptideState} ionization={ionization} activeChainIndex={activeChainIndex} selectedBond={selectedBond} onChooseChain={(index)=>{setActiveChainIndex(index);setSelectedBond(null);}} onChooseBond={chooseBond}/>
        <div className="bio-loom-actions">
          <div><span>Selected shuttle</span><strong style={{'--residue-accent':selectedResidue.accent}}><b>{selectedResidue.oneLetter}</b>{selectedResidue.threeLetter}</strong></div>
          <button type="button" className="attach n" onClick={()=>attachResidue('n')}><span aria-hidden="true">←</span><b>Attach to N</b><small>prepend residue</small></button>
          <button type="button" className="attach c" onClick={()=>attachResidue('c')}><b>Attach to C</b><small>append residue</small><span aria-hidden="true">→</span></button>
          <button type="button" className="hydrolyse" onClick={hydrolyseSelected} disabled={peptideSummary.peptideBondCount===0}><span aria-hidden="true">H₂O</span><b>Hydrolyse selected bond</b><small>{selectedBond?'ready to split':'select a bond first'}</small></button>
        </div>
        <div className={`bio-action-feedback ${peptideFeedback.tone}`} aria-live="polite"><i/><span><strong>{peptideFeedback.title}</strong><p>{peptideFeedback.detail}</p></span></div>
      </section>

      <aside className="bio-composition-ledger bio-card">
        <div className="bio-panel-heading"><span>Composition ledger</span><strong>What did the loom change?</strong></div>
        <div className="bio-formula-hero"><span>Neutral chain formula</span><strong>{peptideSummary.formula}</strong><small>current fragments together</small></div>
        <dl className="bio-mass-grid"><div><dt>Average molar mass</dt><dd>{peptideSummary.averageMolarMass.toFixed(3)} <small>g mol⁻¹</small></dd></div><div><dt>Peptide bonds now</dt><dd>{peptideSummary.peptideBondCount}</dd></div><div><dt>H₂O released</dt><dd>{peptideSummary.waterReleased}</dd></div><div><dt>H₂O consumed</dt><dd>{peptideSummary.waterConsumed}</dd></div><div><dt>Net H₂O release</dt><dd>{peptideSummary.netWaterReleased}</dd></div><div><dt>Fragments now</dt><dd>{peptideSummary.fragmentCount}</dd></div></dl>
        <div className="bio-water-equation"><span>Condensation</span><code>amino acids − (peptide bonds × H₂O)</code><p>The current formula follows current bonds. The water counts retain the learner’s action history.</p></div>
      </aside>

      <section className="bio-ionization bio-card">
        <div className="bio-ionization-heading"><div className="bio-panel-heading"><span>Declared acid-base model</span><strong>Charge is fractional, not a switch</strong></div><div className="bio-net-charge"><span>Expected charge at pH {pH.toFixed(2)}</span><strong>{chargeText(ionization.netCharge)}</strong><small>pH(I) ≈ {isoelectricPH.toFixed(2)}</small></div></div>
        <div className="bio-ionization-layout">
          <div className="bio-ph-control"><label><span>Move solution pH</span><strong>{pH.toFixed(2)}</strong><input aria-label="Peptide solution pH" type="range" min="0" max="14" step="0.01" value={pH} onChange={(event)=>setPH(event.target.valueAsNumber)} onPointerUp={()=>record('model','Solution pH changed',`pH ${pH.toFixed(2)} · expected charge ${chargeText(ionization.netCharge)}`)} onKeyUp={()=>record('model','Solution pH changed',`pH ${pH.toFixed(2)} · expected charge ${chargeText(ionization.netCharge)}`)}/><input aria-label="Peptide solution pH numeric value" type="number" min="0" max="14" step="0.01" value={pH} onChange={(event)=>{if(Number.isFinite(event.target.valueAsNumber))setPH(clamp(event.target.valueAsNumber,0,14));}}/></label><p>pH(I) is where this declared independent-site model solves expected net charge = 0.</p></div>
          <div className="bio-charge-chart-wrap"><ChargeCurve trace={chargeTrace} pH={pH} netCharge={ionization.netCharge} isoelectricPH={isoelectricPH}/><div className="bio-chart-key"><span><i className="curve"/>expected charge</span><span><i className="pi"/>pH(I)</span><span><i className="current"/>current pH</span></div></div>
          <div className="bio-site-ledger"><span>Ionizable sites now</span>{ionization.sites.map((site)=><div key={site.id} className={site.kind}><i/><span><strong>{site.label}</strong><small>pKa {site.pKa.toFixed(2)} · {site.kind==='acidic'?'deprotonated':'protonated'} {(site.fraction*100).toFixed(1)}%</small></span><b>{chargeText(site.charge)}</b></div>)}</div>
          <div className="bio-pka-editor"><div><span>Learner-editable pKa values</span><button type="button" onClick={resetPkaModel}>Restore defaults</button></div>{activePkaFields.map((field)=><label key={field.id}><span><i className={field.kind}/>{field.label}</span><input aria-label={`${field.label} pKa`} type="number" min="0" max="14" step="0.01" value={pKaModel[field.id]} onChange={(event)=>{if(Number.isFinite(event.target.valueAsNumber))setPkaModel((current)=>({...current,[field.id]:clamp(event.target.valueAsNumber,0,14)}));}} onBlur={()=>record('model',`${field.label} pKa edited`,`Learner value ${pKaModel[field.id].toFixed(2)}; pH(I) recalculated to ${isoelectricPH.toFixed(2)}.`)}/></label>)}<p>{BIOMOLECULAR_MODEL_NOTE}</p></div>
        </div>
      </section>

      <aside className="bio-anatomy bio-card">
        <div className="bio-panel-heading"><span>Nucleotide anatomy</span><strong>Three parts, one monomer</strong></div>
        <div className="bio-polymer-switch"><button type="button" className={polymer==='dna'?'active':''} aria-pressed={polymer==='dna'} onClick={()=>choosePolymer('dna')}><strong>DNA</strong><small>deoxyribose + T</small></button><button type="button" className={polymer==='rna'?'active':''} aria-pressed={polymer==='rna'} onClick={()=>choosePolymer('rna')}><strong>RNA</strong><small>ribose + U</small></button></div>
        <NucleotideAnatomy polymer={polymer}/>
      </aside>

      <section className="bio-zipper bio-card">
        <div className="bio-zipper-heading"><div className="bio-panel-heading"><span>Antiparallel strand zipper</span><strong>Place every partner yourself</strong></div><div className="bio-preset-picker"><label htmlFor="bioPreset">Template</label><select id="bioPreset" value={presetId} onChange={(event)=>loadPreset(NUCLEIC_ACID_PRESETS.find((item)=>item.id===event.target.value))}>{NUCLEIC_ACID_PRESETS.filter((item)=>item.polymerId===polymer).map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select><p>{preset.teachingNote}</p></div></div>
        <StrandZipper polymer={polymer} template={template} answers={answers} selectedSlot={selectedSlot} evaluation={complementEvaluation} checked={strandChecked} onSelectSlot={setSelectedSlot}/>
        <div className="bio-base-console">
          <div className="bio-base-palette"><span>Place in selected socket {selectedSlot+1}</span>{NUCLEOBASES.map((base)=><button type="button" key={base.id} className={base.polymerIds.includes(polymer)?'allowed':'outside'} onClick={()=>placeBase(base.id)} style={{'--base-accent':base.accent}}><b>{base.id}</b><span><strong>{base.name}</strong><small>{base.family}{!base.polymerIds.includes(polymer)?` · outside ${polymer.toUpperCase()}`:''}</small></span></button>)}</div>
          <div className="bio-strand-actions"><button type="button" className="check" onClick={checkStrand}>Check my strand <span aria-hidden="true">→</span></button><button type="button" onClick={revealHint} disabled={strandHints.length>=3}>Hint {Math.min(3,strandHints.length+1)}</button><button type="button" onClick={clearSelectedSlot}>Clear socket</button><button type="button" onClick={resetStrand}>Reset complement</button></div>
        </div>
        {strandHints.length>0&&<div className="bio-hint-thread">{strandHints.map((hint,index)=><p key={index}><b>{index+1}</b>{hint.text}</p>)}</div>}
        <div className={`bio-strand-feedback ${strandFeedback.tone}`} aria-live="polite"><div><span>{strandFeedback.title}</span><p>{strandFeedback.detail}</p></div><dl><div><dt>Canonical matches</dt><dd>{complementEvaluation.correctCount}/{template.length}</dd></div><div><dt>H bonds established</dt><dd>{complementEvaluation.establishedHydrogenBonds}/{complementExpectation.expectedHydrogenBonds}</dd></div><div><dt>Read complement 5′→3′</dt><dd>{strandChecked&&complementEvaluation.status==='complete'?complementExpectation.conventional5to3:'check a complete strand'}</dd></div></dl></div>
        {strandChecked&&complementEvaluation.status!=='complete'&&<div className="bio-pair-reasons">{complementEvaluation.positions.filter((position)=>position.status!=='correct').map((position)=><p key={position.index}><b>Socket {position.index+1}</b>{position.reason}</p>)}</div>}
      </section>

      <aside className="bio-learning-trace bio-card">
        <div className="bio-panel-heading"><span>Learner-owned trace</span><strong>Your decisions remain visible</strong></div>
        <div className="bio-attempts">{trace.map((entry)=><div key={entry.id} className={entry.type}><i/><span>{entry.type}</span><strong>{entry.title}</strong><p>{entry.detail}</p></div>)}</div>
        <details className="bio-teacher-lens"><summary>Teacher lens · prompts, not answers</summary><div><p><b>Condensation:</b> Ask where the lost H and OH came from and why sequence direction matters.</p><p><b>Ionization:</b> Ask why a site can carry +0.73 rather than only +1 or 0 in an ensemble model.</p><p><b>Complementarity:</b> Ask learners to read both strands with their directions before naming a sequence.</p><p><b>Boundary:</b> Ask what additional evidence is needed before claiming folding, stability, or function.</p></div></details>
      </aside>

      <aside className="bio-passport bio-card">
        <div className="bio-passport-intro"><div className="bio-panel-heading"><span>Two-engine model passport</span><strong>{passport.name}</strong></div><div className="bio-passport-verdict"><i/>{passport.resultKind}</div><p>{passport.inputProvenance}</p></div>
        <div className="bio-passport-groups"><div><span>Included</span>{[...PEPTIDE_MODEL_BOUNDARY.includes,...NUCLEIC_ACID_MODEL_BOUNDARY.includes].map((item)=><b key={item}>{item}</b>)}</div><div className="excluded"><span>Not included</span>{[...PEPTIDE_MODEL_BOUNDARY.excludes,...NUCLEIC_ACID_MODEL_BOUNDARY.excludes].map((item)=><b key={item}>{item}</b>)}</div></div>
        <div className="bio-passport-equations"><span>Declared relations</span><code>peptide formula = Σ amino acids − bonds·H₂O</code><code>acidic fraction = 1 / (1 + 10^(pKa−pH))</code><code>basic fraction = 1 / (1 + 10^(pH−pKa))</code><code>DNA A–T · RNA A–U · both G–C</code><p>{passport.dataStatement}</p></div>
        <div className="bio-sources"><span>Primary references</span>{passport.sources.map((sourceId)=>{const source=SCIENCE_SOURCES[sourceId];return <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><strong>{source.name}</strong><small>{source.role}</small><b aria-hidden="true">↗</b></a>;})}</div>
      </aside>
    </div>
  </section>;
}
