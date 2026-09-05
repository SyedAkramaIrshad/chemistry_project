import {
  NUCLEOBASES,
  nucleobaseById,
} from '../data/biomolecularComponents.js';

export const POLYMER_MODELS = Object.freeze({
  dna: Object.freeze({id:'dna',name:'DNA',sugar:'2-deoxyribose',alphabet:Object.freeze(['A','C','G','T']),substitution:'DNA uses thymine (T), not uracil (U), in this canonical classroom model.'}),
  rna: Object.freeze({id:'rna',name:'RNA',sugar:'ribose',alphabet:Object.freeze(['A','C','G','U']),substitution:'RNA uses uracil (U), not thymine (T), in this canonical classroom model.'}),
});

function normalizePolymer(polymer) {
  const id=String(polymer??'').toLowerCase();
  const model=POLYMER_MODELS[id];
  if (!model) throw new RangeError(`Polymer must be DNA or RNA; received ${polymer}.`);
  return model;
}

function normalizeTemplate(polymerModel,template) {
  const symbols=Array.isArray(template)?template.map((base)=>String(base).toUpperCase()):String(template??'').toUpperCase().replace(/\s+/g,'').split('');
  if (symbols.length===0) throw new TypeError('A template strand must contain at least one nucleotide base.');
  for (const symbol of symbols) {
    if (!polymerModel.alphabet.includes(symbol)) throw new RangeError(`${symbol} is not in the ${polymerModel.name} alphabet ${polymerModel.alphabet.join(', ')}.`);
  }
  return symbols;
}

function normalizedAnswers(answers,length) {
  if (!Array.isArray(answers)||answers.length!==length) throw new RangeError(`Complement answers must contain exactly ${length} slots.`);
  return answers.map((answer)=>answer===null||answer===undefined||answer===''?null:String(answer).toUpperCase());
}

function complementFor(polymerId,baseId) {
  const base=nucleobaseById(baseId);
  const partner=base?.complement?.[polymerId];
  if (!partner) throw new RangeError(`No canonical ${polymerId.toUpperCase()} complement is declared for ${baseId}.`);
  return partner;
}

function hydrogenBondsFor(baseId) {
  return nucleobaseById(baseId)?.hydrogenBonds??0;
}

export function alphabetForPolymer(polymer) {
  return normalizePolymer(polymer).alphabet;
}

export function expectedComplement({polymer,template}) {
  const polymerModel=normalizePolymer(polymer);
  const templateBases=normalizeTemplate(polymerModel,template);
  const alignedBases=templateBases.map((base)=>complementFor(polymerModel.id,base));
  return Object.freeze({
    polymer: polymerModel,
    template: templateBases.join(''),
    aligned: alignedBases.join(''),
    conventional5to3: [...alignedBases].reverse().join(''),
    expectedHydrogenBonds: templateBases.reduce((total,base)=>total+hydrogenBondsFor(base),0),
    direction: Object.freeze({template:"5′→3′",alignedComplement:"3′→5′",conventionalComplement:"5′→3′"}),
  });
}

function blockedPlacement(answers,reason,code) {
  return Object.freeze({ok:false,code,reason,answers});
}

export function placeComplementBase({polymer,template,answers,index,baseId}) {
  const polymerModel=normalizePolymer(polymer);
  const templateBases=normalizeTemplate(polymerModel,template);
  normalizedAnswers(answers,templateBases.length);
  const position=Number(index);
  if (!Number.isInteger(position)||position<0||position>=templateBases.length) return blockedPlacement(answers,'Choose an existing complement socket. No base was placed.','missing-slot');
  const base=nucleobaseById(baseId);
  if (!base) return blockedPlacement(answers,`“${baseId}” is not one of the five bases declared in this studio.`,'unknown-base');
  if (!polymerModel.alphabet.includes(base.id)) return blockedPlacement(answers,`${base.name} (${base.id}) is not in the ${polymerModel.name} alphabet. ${polymerModel.substitution} The strand was not changed.`,'polymer-alphabet');
  const nextAnswers=Object.freeze(answers.map((answer,answerIndex)=>answerIndex===position?base.id:answer));
  return Object.freeze({
    ok:true,
    code:'base-placed',
    answers:nextAnswers,
    reason:`${base.name} (${base.id}) is allowed in ${polymerModel.name} and remains in socket ${position+1}. Check the strand when you want the canonical-pair evaluation.`,
  });
}

export function clearComplementSlot({polymer,template,answers,index}) {
  const polymerModel=normalizePolymer(polymer);
  const templateBases=normalizeTemplate(polymerModel,template);
  normalizedAnswers(answers,templateBases.length);
  const position=Number(index);
  if (!Number.isInteger(position)||position<0||position>=templateBases.length) return blockedPlacement(answers,'Choose an existing complement socket. No base was removed.','missing-slot');
  const nextAnswers=Object.freeze(answers.map((answer,answerIndex)=>answerIndex===position?null:answer));
  return Object.freeze({ok:true,code:'base-cleared',answers:nextAnswers,reason:`Socket ${position+1} was cleared. The template was not changed.`});
}

export function evaluateComplement({polymer,template,answers}) {
  const polymerModel=normalizePolymer(polymer);
  const templateBases=normalizeTemplate(polymerModel,template);
  const learnerAnswers=normalizedAnswers(answers,templateBases.length);
  const positions=templateBases.map((templateBase,index)=>{
    const expectedBase=complementFor(polymerModel.id,templateBase);
    const learnerBase=learnerAnswers[index];
    const bonds=hydrogenBondsFor(templateBase);
    const templateName=nucleobaseById(templateBase).name;
    const expectedName=nucleobaseById(expectedBase).name;
    if (!learnerBase) return Object.freeze({index,templateBase,expectedBase,learnerBase:null,status:'incomplete',hydrogenBonds:0,reason:`Socket ${index+1} is empty beneath ${templateName} (${templateBase}). Place a ${polymerModel.name} base before completing the strand.`});
    if (!polymerModel.alphabet.includes(learnerBase)) return Object.freeze({index,templateBase,expectedBase,learnerBase,status:'invalid',hydrogenBonds:0,reason:`${learnerBase} is outside the ${polymerModel.name} alphabet. The canonical partner for ${templateBase} is ${expectedBase}.`});
    if (learnerBase===expectedBase) return Object.freeze({index,templateBase,expectedBase,learnerBase,status:'correct',hydrogenBonds:bonds,reason:`${templateName} (${templateBase}) pairs canonically with ${expectedName} (${expectedBase}) using ${bonds} hydrogen bonds in this model.`});
    return Object.freeze({index,templateBase,expectedBase,learnerBase,status:'incorrect',hydrogenBonds:0,reason:`${learnerBase} is allowed in ${polymerModel.name}, but ${templateName} (${templateBase}) has canonical partner ${expectedName} (${expectedBase}), not ${learnerBase}. Your placed base is preserved.`});
  });
  const incompleteCount=positions.filter((position)=>position.status==='incomplete').length;
  const incorrectCount=positions.filter((position)=>position.status==='incorrect'||position.status==='invalid').length;
  const correctCount=positions.filter((position)=>position.status==='correct').length;
  const status=incompleteCount>0?'incomplete':incorrectCount>0?'incorrect':'complete';
  const expected=expectedComplement({polymer:polymerModel.id,template:templateBases});
  return Object.freeze({
    status,
    polymer:polymerModel,
    template:templateBases.join(''),
    answers:Object.freeze(learnerAnswers),
    positions:Object.freeze(positions),
    correctCount,
    incorrectCount,
    incompleteCount,
    establishedHydrogenBonds:positions.reduce((total,position)=>total+position.hydrogenBonds,0),
    expectedHydrogenBonds:expected.expectedHydrogenBonds,
    conventional5to3:status==='complete'?expected.conventional5to3:null,
    summary: status==='complete'
      ? `All ${correctCount} canonical pairs match. Read the aligned complement 3′→5′ or reverse it to ${expected.conventional5to3} in the conventional 5′→3′ direction.`
      : status==='incorrect'
        ? `${incorrectCount} placed ${incorrectCount===1?'base does':'bases do'} not match the declared canonical complement. The choices remain editable.`
        : `${incompleteCount} ${incompleteCount===1?'socket is':'sockets are'} still empty. Existing placements remain editable.`,
  });
}

export function nextComplementHint({polymer,template,answers,level=1}) {
  const polymerModel=normalizePolymer(polymer);
  const templateBases=normalizeTemplate(polymerModel,template);
  const learnerAnswers=normalizedAnswers(answers,templateBases.length);
  const safeLevel=Math.max(1,Math.min(3,Math.trunc(Number(level)||1)));
  const index=templateBases.findIndex((templateBase,position)=>learnerAnswers[position]!==complementFor(polymerModel.id,templateBase));
  if (index===-1) return Object.freeze({index:null,level:safeLevel,revealsBase:false,text:'Every socket already matches the declared canonical complement.'});
  const templateBase=templateBases[index];
  const expectedBase=complementFor(polymerModel.id,templateBase);
  const templateRecord=nucleobaseById(templateBase);
  const expectedRecord=nucleobaseById(expectedBase);
  const partnerFamily=expectedRecord.family;
  const text=safeLevel===1
    ? `Look only at socket ${index+1}. Template ${templateBase} is a ${templateRecord.family}; its canonical partner belongs to the ${partnerFamily} family.`
    : safeLevel===2
      ? `Socket ${index+1} forms a ${hydrogenBondsFor(templateBase)}-hydrogen-bond canonical pair. Choose among the ${polymerModel.name} ${partnerFamily}s.`
      : `For socket ${index+1}, ${templateRecord.name} (${templateBase}) canonically pairs with ${expectedRecord.name} (${expectedBase}) in ${polymerModel.name}.`;
  return Object.freeze({index,level:safeLevel,revealsBase:safeLevel===3,text});
}

export const NUCLEIC_ACID_MODEL_BOUNDARY = Object.freeze({
  includes:Object.freeze(['DNA and RNA nucleotide anatomy','Polymer-specific canonical alphabets','Antiparallel strand direction','Canonical A-T, A-U, and G-C complementarity','Nominal two- and three-hydrogen-bond counts']),
  excludes:Object.freeze(['G-U wobble and other noncanonical pairs','Helix geometry and folding','Sequence translation','Melting temperature and salt effects','Hybridization kinetics','Genetic or biological function']),
  baseCount:NUCLEOBASES.length,
});
