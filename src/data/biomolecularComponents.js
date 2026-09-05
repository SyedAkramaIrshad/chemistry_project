export const AMINO_ACID_CLASSES = Object.freeze([
  Object.freeze({id:'all',label:'All 20',accent:'#f5f7f4'}),
  Object.freeze({id:'nonpolar',label:'Nonpolar',accent:'#6ce6b7'}),
  Object.freeze({id:'aromatic',label:'Aromatic',accent:'#ffd166'}),
  Object.freeze({id:'polar',label:'Polar',accent:'#6bd5ff'}),
  Object.freeze({id:'acidic',label:'Acidic',accent:'#ff7a7a'}),
  Object.freeze({id:'basic',label:'Basic',accent:'#b39cff'}),
]);

const sideChainIonization = (kind,pKaKey,label) => Object.freeze({kind,pKaKey,label});

export const AMINO_ACIDS = Object.freeze([
  Object.freeze({id:'gly',name:'Glycine',oneLetter:'G',threeLetter:'Gly',formula:'C2H5NO2',sideChain:'H',classId:'nonpolar',accent:'#6ce6b7'}),
  Object.freeze({id:'ala',name:'Alanine',oneLetter:'A',threeLetter:'Ala',formula:'C3H7NO2',sideChain:'CH₃',classId:'nonpolar',accent:'#6ce6b7'}),
  Object.freeze({id:'val',name:'Valine',oneLetter:'V',threeLetter:'Val',formula:'C5H11NO2',sideChain:'CH(CH₃)₂',classId:'nonpolar',accent:'#6ce6b7'}),
  Object.freeze({id:'leu',name:'Leucine',oneLetter:'L',threeLetter:'Leu',formula:'C6H13NO2',sideChain:'CH₂CH(CH₃)₂',classId:'nonpolar',accent:'#6ce6b7'}),
  Object.freeze({id:'ile',name:'Isoleucine',oneLetter:'I',threeLetter:'Ile',formula:'C6H13NO2',sideChain:'CH(CH₃)CH₂CH₃',classId:'nonpolar',accent:'#6ce6b7'}),
  Object.freeze({id:'met',name:'Methionine',oneLetter:'M',threeLetter:'Met',formula:'C5H11NO2S',sideChain:'CH₂CH₂SCH₃',classId:'nonpolar',accent:'#6ce6b7'}),
  Object.freeze({id:'pro',name:'Proline',oneLetter:'P',threeLetter:'Pro',formula:'C5H9NO2',sideChain:'(CH₂)₃ → N',classId:'nonpolar',accent:'#6ce6b7'}),
  Object.freeze({id:'phe',name:'Phenylalanine',oneLetter:'F',threeLetter:'Phe',formula:'C9H11NO2',sideChain:'CH₂C₆H₅',classId:'aromatic',accent:'#ffd166'}),
  Object.freeze({id:'tyr',name:'Tyrosine',oneLetter:'Y',threeLetter:'Tyr',formula:'C9H11NO3',sideChain:'CH₂C₆H₄OH',classId:'aromatic',accent:'#ffd166',ionizable:sideChainIonization('acidic','tyr','phenolic side chain')}),
  Object.freeze({id:'trp',name:'Tryptophan',oneLetter:'W',threeLetter:'Trp',formula:'C11H12N2O2',sideChain:'CH₂-indole',classId:'aromatic',accent:'#ffd166'}),
  Object.freeze({id:'ser',name:'Serine',oneLetter:'S',threeLetter:'Ser',formula:'C3H7NO3',sideChain:'CH₂OH',classId:'polar',accent:'#6bd5ff'}),
  Object.freeze({id:'thr',name:'Threonine',oneLetter:'T',threeLetter:'Thr',formula:'C4H9NO3',sideChain:'CH(OH)CH₃',classId:'polar',accent:'#6bd5ff'}),
  Object.freeze({id:'cys',name:'Cysteine',oneLetter:'C',threeLetter:'Cys',formula:'C3H7NO2S',sideChain:'CH₂SH',classId:'polar',accent:'#6bd5ff',ionizable:sideChainIonization('acidic','cys','thiol side chain')}),
  Object.freeze({id:'asn',name:'Asparagine',oneLetter:'N',threeLetter:'Asn',formula:'C4H8N2O3',sideChain:'CH₂CONH₂',classId:'polar',accent:'#6bd5ff'}),
  Object.freeze({id:'gln',name:'Glutamine',oneLetter:'Q',threeLetter:'Gln',formula:'C5H10N2O3',sideChain:'CH₂CH₂CONH₂',classId:'polar',accent:'#6bd5ff'}),
  Object.freeze({id:'asp',name:'Aspartic acid',oneLetter:'D',threeLetter:'Asp',formula:'C4H7NO4',sideChain:'CH₂COOH',classId:'acidic',accent:'#ff7a7a',ionizable:sideChainIonization('acidic','asp','side-chain carboxyl')}),
  Object.freeze({id:'glu',name:'Glutamic acid',oneLetter:'E',threeLetter:'Glu',formula:'C5H9NO4',sideChain:'CH₂CH₂COOH',classId:'acidic',accent:'#ff7a7a',ionizable:sideChainIonization('acidic','glu','side-chain carboxyl')}),
  Object.freeze({id:'lys',name:'Lysine',oneLetter:'K',threeLetter:'Lys',formula:'C6H14N2O2',sideChain:'(CH₂)₄NH₂',classId:'basic',accent:'#b39cff',ionizable:sideChainIonization('basic','lys','ε-amino side chain')}),
  Object.freeze({id:'arg',name:'Arginine',oneLetter:'R',threeLetter:'Arg',formula:'C6H14N4O2',sideChain:'(CH₂)₃NHC(NH)NH₂',classId:'basic',accent:'#b39cff',ionizable:sideChainIonization('basic','arg','guanidinium side chain')}),
  Object.freeze({id:'his',name:'Histidine',oneLetter:'H',threeLetter:'His',formula:'C6H9N3O2',sideChain:'CH₂-imidazole',classId:'basic',accent:'#b39cff',ionizable:sideChainIonization('basic','his','imidazole side chain')}),
]);

export const DEFAULT_PKA_MODEL = Object.freeze({
  nTerminus: 9.69,
  cTerminus: 2.34,
  asp: 3.65,
  glu: 4.25,
  his: 6.00,
  cys: 8.18,
  tyr: 10.07,
  lys: 10.53,
  arg: 12.48,
});

export const PKA_MODEL_FIELDS = Object.freeze([
  Object.freeze({id:'nTerminus',label:'N terminus',kind:'basic'}),
  Object.freeze({id:'cTerminus',label:'C terminus',kind:'acidic'}),
  Object.freeze({id:'asp',label:'Asp side chain',kind:'acidic'}),
  Object.freeze({id:'glu',label:'Glu side chain',kind:'acidic'}),
  Object.freeze({id:'his',label:'His side chain',kind:'basic'}),
  Object.freeze({id:'cys',label:'Cys side chain',kind:'acidic'}),
  Object.freeze({id:'tyr',label:'Tyr side chain',kind:'acidic'}),
  Object.freeze({id:'lys',label:'Lys side chain',kind:'basic'}),
  Object.freeze({id:'arg',label:'Arg side chain',kind:'basic'}),
]);

export const BIOMOLECULAR_MODEL_NOTE = 'Approximate classroom pKa defaults. Ionization depends on sequence, conformation, solvent, temperature, ionic strength, and local molecular environment.';

export const NUCLEOBASES = Object.freeze([
  Object.freeze({id:'A',name:'Adenine',family:'purine',polymerIds:Object.freeze(['dna','rna']),complement:Object.freeze({dna:'T',rna:'U'}),hydrogenBonds:2,accent:'#ffd166'}),
  Object.freeze({id:'C',name:'Cytosine',family:'pyrimidine',polymerIds:Object.freeze(['dna','rna']),complement:Object.freeze({dna:'G',rna:'G'}),hydrogenBonds:3,accent:'#ff8f70'}),
  Object.freeze({id:'G',name:'Guanine',family:'purine',polymerIds:Object.freeze(['dna','rna']),complement:Object.freeze({dna:'C',rna:'C'}),hydrogenBonds:3,accent:'#6ce6b7'}),
  Object.freeze({id:'T',name:'Thymine',family:'pyrimidine',polymerIds:Object.freeze(['dna']),complement:Object.freeze({dna:'A'}),hydrogenBonds:2,accent:'#b39cff'}),
  Object.freeze({id:'U',name:'Uracil',family:'pyrimidine',polymerIds:Object.freeze(['rna']),complement:Object.freeze({rna:'A'}),hydrogenBonds:2,accent:'#6bd5ff'}),
]);

export const NUCLEIC_ACID_PRESETS = Object.freeze([
  Object.freeze({id:'dna-gattaca',polymerId:'dna',name:'DNA · GATTACA',template:'GATTACA',teachingNote:'A seven-base strand with both two- and three-hydrogen-bond canonical pairs.'}),
  Object.freeze({id:'dna-coding-mix',polymerId:'dna',name:'DNA · ACGTAC',template:'ACGTAC',teachingNote:'A compact mixed DNA alphabet.'}),
  Object.freeze({id:'rna-auggcu',polymerId:'rna',name:'RNA · AUGGCU',template:'AUGGCU',teachingNote:'An RNA strand that makes the U-for-T alphabet change visible.'}),
  Object.freeze({id:'rna-gcauag',polymerId:'rna',name:'RNA · GCAUAG',template:'GCAUAG',teachingNote:'A mixed RNA complement exercise.'}),
]);

export const NUCLEOTIDE_ANATOMY = Object.freeze([
  Object.freeze({id:'phosphate',label:'Phosphate',role:'links neighbouring sugars through phosphodiester bonds',accent:'#6bd5ff'}),
  Object.freeze({id:'sugar',label:'Pentose sugar',role:'deoxyribose in DNA; ribose in RNA',accent:'#f5f7f4'}),
  Object.freeze({id:'base',label:'Nitrogenous base',role:'carries A, C, G, T, or U identity',accent:'#ffd166'}),
]);

export function aminoAcidById(id) {
  return AMINO_ACIDS.find((aminoAcid) => aminoAcid.id === id) ?? null;
}

export function nucleobaseById(id) {
  return NUCLEOBASES.find((base) => base.id === String(id).toUpperCase()) ?? null;
}

export function nucleicAcidPresetById(id) {
  return NUCLEIC_ACID_PRESETS.find((preset) => preset.id === id) ?? null;
}
