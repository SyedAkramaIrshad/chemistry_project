(function (root, factory) {
  const api = factory();
  root.ChemistryEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const ELEMENTS = {
    H:  { name:'Hydrogen', atomicNumber:1,  mass:1.008,   valenceElectrons:1, category:'nonmetal', color:'#dce4ed', text:'#304058', commonCharges:[1,-1], valences:{'-1':[0],'0':[1],'1':[0]} },
    He: { name:'Helium',   atomicNumber:2,  mass:4.0026,  valenceElectrons:2, category:'noble gas', color:'#d8f0ff', text:'#28506a', commonCharges:[0], valences:{'0':[0]} },
    Li: { name:'Lithium',  atomicNumber:3,  mass:6.94,    valenceElectrons:1, category:'alkali metal', color:'#b987db', text:'#fff', commonCharges:[1], valences:{'0':[1],'1':[0]}, metal:true },
    B:  { name:'Boron',    atomicNumber:5,  mass:10.81,   valenceElectrons:3, category:'metalloid', color:'#e5a55c', text:'#4f2c08', commonCharges:[3], valences:{'-1':[4],'0':[3],'1':[2]} },
    C:  { name:'Carbon',   atomicNumber:6,  mass:12.011,  valenceElectrons:4, category:'nonmetal', color:'#384454', text:'#fff', commonCharges:[-4,4], valences:{'-1':[3],'0':[4],'1':[3]} },
    N:  { name:'Nitrogen', atomicNumber:7,  mass:14.007,  valenceElectrons:5, category:'nonmetal', color:'#536bdb', text:'#fff', commonCharges:[-3,3,5], valences:{'-3':[0],'-1':[2],'0':[3],'1':[4]} },
    O:  { name:'Oxygen',   atomicNumber:8,  mass:15.999,  valenceElectrons:6, category:'nonmetal', color:'#e64f67', text:'#fff', commonCharges:[-2], valences:{'-2':[0],'-1':[1],'0':[2],'1':[3]} },
    F:  { name:'Fluorine', atomicNumber:9,  mass:18.998,  valenceElectrons:7, category:'halogen', color:'#43bd9b', text:'#fff', commonCharges:[-1], valences:{'-1':[0],'0':[1]} },
    Ne: { name:'Neon',     atomicNumber:10, mass:20.180,  valenceElectrons:8, category:'noble gas', color:'#c9eaff', text:'#28506a', commonCharges:[0], valences:{'0':[0]} },
    Na: { name:'Sodium',   atomicNumber:11, mass:22.990,  valenceElectrons:1, category:'alkali metal', color:'#9b72d6', text:'#fff', commonCharges:[1], valences:{'0':[1],'1':[0]}, metal:true },
    Mg: { name:'Magnesium',atomicNumber:12, mass:24.305,  valenceElectrons:2, category:'alkaline earth metal', color:'#7eb76b', text:'#fff', commonCharges:[2], valences:{'0':[2],'2':[0]}, metal:true },
    Al: { name:'Aluminium',atomicNumber:13, mass:26.982,  valenceElectrons:3, category:'post-transition metal', color:'#8ca1ad', text:'#fff', commonCharges:[3], valences:{'0':[3],'3':[0]}, metal:true },
    Si: { name:'Silicon',  atomicNumber:14, mass:28.085,  valenceElectrons:4, category:'metalloid', color:'#c29b7d', text:'#fff', commonCharges:[-4,4], valences:{'0':[4]} },
    P:  { name:'Phosphorus',atomicNumber:15,mass:30.974,  valenceElectrons:5, category:'nonmetal', color:'#ef8a45', text:'#fff', commonCharges:[-3,3,5], valences:{'-3':[0],'-1':[2,4],'0':[3,5],'1':[4,6]}, expandedOctet:true },
    S:  { name:'Sulfur',   atomicNumber:16, mass:32.06,   valenceElectrons:6, category:'nonmetal', color:'#efbb3f', text:'#4b3904', commonCharges:[-2,4,6], valences:{'-2':[0],'-1':[1,3,5],'0':[2,4,6],'1':[3,5]}, expandedOctet:true },
    Cl: { name:'Chlorine', atomicNumber:17, mass:35.45,   valenceElectrons:7, category:'halogen', color:'#42b85b', text:'#fff', commonCharges:[-1,1,3,5,7], valences:{'-1':[0],'0':[1,3,5,7],'1':[2,4,6],'3':[4]}, expandedOctet:true },
    K:  { name:'Potassium',atomicNumber:19, mass:39.098,  valenceElectrons:1, category:'alkali metal', color:'#8865ce', text:'#fff', commonCharges:[1], valences:{'0':[1],'1':[0]}, metal:true },
    Ca: { name:'Calcium',  atomicNumber:20, mass:40.078,  valenceElectrons:2, category:'alkaline earth metal', color:'#6dad70', text:'#fff', commonCharges:[2], valences:{'0':[2],'2':[0]}, metal:true },
    Ti: { name:'Titanium', atomicNumber:22, mass:47.867, valenceElectrons:4, category:'transition metal', color:'#87929d', text:'#fff', commonCharges:[2,3,4], valences:{'0':[2,3,4,6],'2':[0,4,6],'3':[0,4,6],'4':[0,4,6]}, metal:true, flexible:true },
    Cr: { name:'Chromium', atomicNumber:24, mass:51.996,  valenceElectrons:6, category:'transition metal', color:'#8c95a3', text:'#fff', commonCharges:[2,3,6], valences:{'0':[2,3,6],'2':[0,4,6],'3':[0,4,6],'6':[0,4,6]}, metal:true, flexible:true },
    Mn: { name:'Manganese',atomicNumber:25, mass:54.938,  valenceElectrons:7, category:'transition metal', color:'#9a7b8c', text:'#fff', commonCharges:[2,4,7], valences:{'0':[2,4,6,7],'2':[0,4,6],'4':[0,4,6],'7':[0,4,6]}, metal:true, flexible:true },
    Fe: { name:'Iron',     atomicNumber:26, mass:55.845,  valenceElectrons:8, category:'transition metal', color:'#b07b62', text:'#fff', commonCharges:[2,3], valences:{'0':[2,3,4,6],'2':[0,4,6],'3':[0,4,6]}, metal:true, flexible:true },
    Co: { name:'Cobalt',   atomicNumber:27, mass:58.933,  valenceElectrons:9, category:'transition metal', color:'#687db4', text:'#fff', commonCharges:[2,3], valences:{'0':[2,3,4,6],'2':[0,4,6],'3':[0,4,6]}, metal:true, flexible:true },
    Ni: { name:'Nickel',   atomicNumber:28, mass:58.693,  valenceElectrons:10,category:'transition metal', color:'#6f9a83', text:'#fff', commonCharges:[2,3], valences:{'0':[2,3,4,6],'2':[0,4,6],'3':[0,4,6]}, metal:true, flexible:true },
    Cu: { name:'Copper',   atomicNumber:29, mass:63.546,  valenceElectrons:11,category:'transition metal', color:'#c87845', text:'#fff', commonCharges:[1,2], valences:{'0':[1,2,4],'1':[0,2,4],'2':[0,4,6]}, metal:true, flexible:true },
    Zn: { name:'Zinc',     atomicNumber:30, mass:65.38,   valenceElectrons:12,category:'transition metal', color:'#8ea0a8', text:'#fff', commonCharges:[2], valences:{'0':[2,4],'2':[0,4,6]}, metal:true, flexible:true },
    As: { name:'Arsenic', atomicNumber:33, mass:74.9216, valenceElectrons:5, category:'metalloid', color:'#a78b72', text:'#fff', commonCharges:[-3,3,5], valences:{'-3':[0],'-1':[2,4],'0':[3,5],'1':[4,6]}, expandedOctet:true },
    Se: { name:'Selenium', atomicNumber:34, mass:78.971, valenceElectrons:6, category:'nonmetal', color:'#d28f3f', text:'#fff', commonCharges:[-2,4,6], valences:{'-2':[0],'-1':[1,3,5],'0':[2,4,6],'1':[3,5]}, expandedOctet:true },
    Br: { name:'Bromine',  atomicNumber:35, mass:79.904,  valenceElectrons:7, category:'halogen', color:'#9e4037', text:'#fff', commonCharges:[-1,1,3,5], valences:{'-1':[0],'0':[1,3,5],'1':[2,4]}, expandedOctet:true },
    Ag: { name:'Silver',   atomicNumber:47, mass:107.8682,valenceElectrons:11,category:'transition metal', color:'#aeb7c1', text:'#253343', commonCharges:[1], valences:{'0':[1,2],'1':[0,2,4]}, metal:true, flexible:true },
    Sn: { name:'Tin',      atomicNumber:50, mass:118.710, valenceElectrons:4, category:'post-transition metal', color:'#829097', text:'#fff', commonCharges:[2,4], valences:{'0':[2,4],'2':[0,2,4],'4':[0,4,6]}, metal:true, flexible:true },
    Sb: { name:'Antimony', atomicNumber:51, mass:121.760, valenceElectrons:5, category:'metalloid', color:'#8e777e', text:'#fff', commonCharges:[-3,3,5], valences:{'-3':[0],'-1':[2,4],'0':[3,5],'1':[4,6]}, expandedOctet:true },
    I:  { name:'Iodine',   atomicNumber:53, mass:126.904, valenceElectrons:7, category:'halogen', color:'#7652a7', text:'#fff', commonCharges:[-1,1,5,7], valences:{'-1':[0],'0':[1,5,7],'1':[2,6]}, expandedOctet:true },
    Ba: { name:'Barium',   atomicNumber:56, mass:137.327, valenceElectrons:2, category:'alkaline earth metal', color:'#5fa966', text:'#fff', commonCharges:[2], valences:{'0':[2],'2':[0]}, metal:true },
    Pt: { name:'Platinum', atomicNumber:78, mass:195.084, valenceElectrons:10,category:'transition metal', color:'#a6a9a8', text:'#24313e', commonCharges:[2,4], valences:{'0':[2,4,6],'2':[0,4,6],'4':[0,4,6]}, metal:true, flexible:true },
    Au: { name:'Gold',     atomicNumber:79, mass:196.967, valenceElectrons:11,category:'transition metal', color:'#d4aa31', text:'#3d2e00', commonCharges:[1,3], valences:{'0':[1,3,4],'1':[0,2,4],'3':[0,4,6]}, metal:true, flexible:true },
    Hg: { name:'Mercury',  atomicNumber:80, mass:200.592, valenceElectrons:12,category:'transition metal', color:'#aeb5ba', text:'#253343', commonCharges:[1,2], valences:{'0':[1,2,4],'1':[0,2,4],'2':[0,4,6]}, metal:true, flexible:true },
    Pb: { name:'Lead',     atomicNumber:82, mass:207.2,   valenceElectrons:4, category:'post-transition metal', color:'#6c7782', text:'#fff', commonCharges:[2,4], valences:{'0':[2,4],'2':[0,2,4],'4':[0,4,6]}, metal:true, flexible:true },
    Bi: { name:'Bismuth', atomicNumber:83, mass:208.9804, valenceElectrons:5, category:'post-transition metal', color:'#777a8c', text:'#fff', commonCharges:[3,5], valences:{'-1':[2,4],'0':[3,5],'1':[4,6]}, expandedOctet:true, metal:true, flexible:true }
  };

  const BOND_TYPES = {
    single:   { label:'Single', order:1, svgLines:1 },
    double:   { label:'Double', order:2, svgLines:2 },
    triple:   { label:'Triple', order:3, svgLines:3 },
    aromatic: { label:'Aromatic', order:1.5, svgLines:2, aromatic:true },
    ionic:    { label:'Ionic interaction', order:0, svgLines:1, ionic:true }
  };

  const CATIONS = {
    H:   { formula:'H', charge:1, name:'hydrogen', polyatomic:false },
    Li:  { formula:'Li', charge:1, name:'lithium', polyatomic:false, metal:true },
    Na:  { formula:'Na', charge:1, name:'sodium', polyatomic:false, metal:true },
    K:   { formula:'K', charge:1, name:'potassium', polyatomic:false, metal:true },
    Ag:  { formula:'Ag', charge:1, name:'silver', polyatomic:false, metal:true },
    NH4: { formula:'NH4', charge:1, name:'ammonium', polyatomic:true },
    Mg:  { formula:'Mg', charge:2, name:'magnesium', polyatomic:false, metal:true },
    Ca:  { formula:'Ca', charge:2, name:'calcium', polyatomic:false, metal:true },
    Ba:  { formula:'Ba', charge:2, name:'barium', polyatomic:false, metal:true },
    Zn:  { formula:'Zn', charge:2, name:'zinc', polyatomic:false, metal:true },
    Mn2: { formula:'Mn', charge:2, name:'manganese(II)', polyatomic:false, metal:true },
    Fe2: { formula:'Fe', charge:2, name:'iron(II)', polyatomic:false, metal:true },
    Co2: { formula:'Co', charge:2, name:'cobalt(II)', polyatomic:false, metal:true },
    Ni2: { formula:'Ni', charge:2, name:'nickel(II)', polyatomic:false, metal:true },
    Cu2: { formula:'Cu', charge:2, name:'copper(II)', polyatomic:false, metal:true },
    Sn2: { formula:'Sn', charge:2, name:'tin(II)', polyatomic:false, metal:true },
    Hg2: { formula:'Hg', charge:2, name:'mercury(II)', polyatomic:false, metal:true },
    Pb2: { formula:'Pb', charge:2, name:'lead(II)', polyatomic:false, metal:true },
    Pt2: { formula:'Pt', charge:2, name:'platinum(II)', polyatomic:false, metal:true },
    Cr3: { formula:'Cr', charge:3, name:'chromium(III)', polyatomic:false, metal:true },
    Fe3: { formula:'Fe', charge:3, name:'iron(III)', polyatomic:false, metal:true },
    Au3: { formula:'Au', charge:3, name:'gold(III)', polyatomic:false, metal:true },
    Al:  { formula:'Al', charge:3, name:'aluminium', polyatomic:false, metal:true }
  };

  const ANIONS = {
    F:      { formula:'F', charge:-1, name:'fluoride', polyatomic:false },
    Cl:     { formula:'Cl', charge:-1, name:'chloride', polyatomic:false },
    Br:     { formula:'Br', charge:-1, name:'bromide', polyatomic:false },
    I:      { formula:'I', charge:-1, name:'iodide', polyatomic:false },
    OH:     { formula:'OH', charge:-1, name:'hydroxide', polyatomic:true },
    NO3:    { formula:'NO3', charge:-1, name:'nitrate', polyatomic:true },
    HCO3:   { formula:'HCO3', charge:-1, name:'hydrogen carbonate', polyatomic:true },
    ClO3:   { formula:'ClO3', charge:-1, name:'chlorate', polyatomic:true },
    CH3COO: { formula:'CH3COO', charge:-1, name:'acetate', polyatomic:true },
    O:      { formula:'O', charge:-2, name:'oxide', polyatomic:false },
    S:      { formula:'S', charge:-2, name:'sulfide', polyatomic:false },
    CO3:    { formula:'CO3', charge:-2, name:'carbonate', polyatomic:true },
    SO4:    { formula:'SO4', charge:-2, name:'sulfate', polyatomic:true },
    SO3:    { formula:'SO3', charge:-2, name:'sulfite', polyatomic:true },
    PO4:    { formula:'PO4', charge:-3, name:'phosphate', polyatomic:true }
  };

  const ACIDS = {
    HF:      { formula:'HF', name:'hydrofluoric acid', anion:'F', protons:1, oxidizing:false },
    HCl:     { formula:'HCl', name:'hydrochloric acid', anion:'Cl', protons:1, oxidizing:false },
    HBr:     { formula:'HBr', name:'hydrobromic acid', anion:'Br', protons:1, oxidizing:false },
    HI:      { formula:'HI', name:'hydroiodic acid', anion:'I', protons:1, oxidizing:false },
    HNO3:    { formula:'HNO3', name:'nitric acid', anion:'NO3', protons:1, oxidizing:true },
    H2SO4:   { formula:'H2SO4', name:'sulfuric acid', anion:'SO4', protons:2, oxidizing:true },
    H2SO3:   { formula:'H2SO3', name:'sulfurous acid', anion:'SO3', protons:2, oxidizing:false },
    H2CO3:   { formula:'H2CO3', name:'carbonic acid', anion:'CO3', protons:2, oxidizing:false },
    H3PO4:   { formula:'H3PO4', name:'phosphoric acid', anion:'PO4', protons:3, oxidizing:false },
    CH3COOH: { formula:'CH3COOH', name:'ethanoic acid', anion:'CH3COO', protons:1, oxidizing:false }
  };

  const METAL_ACTIVITY = ['Li','K','Ba','Ca','Na','Mg','Al','Mn','Zn','Cr','Fe','Co','Ni','Sn','Pb','H','Cu','Hg','Ag','Pt','Au'];
  const HALOGEN_ACTIVITY = ['F','Cl','Br','I'];
  const PREFERRED_CATION = {Li:'Li',Na:'Na',K:'K',Mg:'Mg',Ca:'Ca',Ba:'Ba',Al:'Al',Cr:'Cr3',Mn:'Mn2',Fe:'Fe2',Co:'Co2',Ni:'Ni2',Cu:'Cu2',Zn:'Zn',Ag:'Ag',Sn:'Sn2',Hg:'Hg2',Pb:'Pb2',Pt:'Pt2',Au:'Au3'};

  const KNOWN_NAMES = {
    H2:'Hydrogen', O2:'Oxygen', N2:'Nitrogen', F2:'Fluorine', Cl2:'Chlorine', Br2:'Bromine', I2:'Iodine',
    H2O:'Water', H2O2:'Hydrogen peroxide', NH3:'Ammonia', NH4Cl:'Ammonium chloride', CH4:'Methane',
    C2H6:'Ethane', C3H8:'Propane', C4H10:'Butane', C2H4:'Ethene', C2H2:'Ethyne', C6H6:'Benzene',
    CH3OH:'Methanol', C2H5OH:'Ethanol', CH2O:'Methanal', CH3COOH:'Ethanoic acid',
    CO:'Carbon monoxide', CO2:'Carbon dioxide', O3:'Ozone', HCl:'Hydrogen chloride', HF:'Hydrogen fluoride',
    HBr:'Hydrogen bromide', HI:'Hydrogen iodide', H2S:'Hydrogen sulfide', SO2:'Sulfur dioxide', SO3:'Sulfur trioxide',
    NO:'Nitric oxide', NO2:'Nitrogen dioxide', N2O:'Nitrous oxide', HNO3:'Nitric acid', H2SO4:'Sulfuric acid',
    H2SO3:'Sulfurous acid', H2CO3:'Carbonic acid', H3PO4:'Phosphoric acid', NaOH:'Sodium hydroxide',
    KOH:'Potassium hydroxide', 'Ca(OH)2':'Calcium hydroxide', 'Mg(OH)2':'Magnesium hydroxide', 'Ba(OH)2':'Barium hydroxide',
    NaCl:'Sodium chloride', KCl:'Potassium chloride', CaCl2:'Calcium chloride', MgCl2:'Magnesium chloride',
    AlCl3:'Aluminium chloride', FeCl2:'Iron(II) chloride', FeCl3:'Iron(III) chloride', CuCl2:'Copper(II) chloride',
    ZnCl2:'Zinc chloride', AgNO3:'Silver nitrate', NaNO3:'Sodium nitrate', KNO3:'Potassium nitrate',
    'Ca(NO3)2':'Calcium nitrate', 'Pb(NO3)2':'Lead(II) nitrate', Na2SO4:'Sodium sulfate', K2SO4:'Potassium sulfate',
    CuSO4:'Copper(II) sulfate', BaSO4:'Barium sulfate', Na2CO3:'Sodium carbonate', CaCO3:'Calcium carbonate',
    NaHCO3:'Sodium hydrogen carbonate', KHCO3:'Potassium hydrogen carbonate', KI:'Potassium iodide', KBr:'Potassium bromide',
    NaBr:'Sodium bromide', AgCl:'Silver chloride', AgBr:'Silver bromide', AgI:'Silver iodide', PbI2:'Lead(II) iodide',
    CuOH2:'Copper(II) hydroxide', 'Cu(OH)2':'Copper(II) hydroxide', 'Fe(OH)3':'Iron(III) hydroxide',
    MgO:'Magnesium oxide', CaO:'Calcium oxide', Na2O:'Sodium oxide', K2O:'Potassium oxide', Al2O3:'Aluminium oxide',
    Fe2O3:'Iron(III) oxide', CuO:'Copper(II) oxide', ZnO:'Zinc oxide', KClO3:'Potassium chlorate', NaClO3:'Sodium chlorate',
    KMnO4:'Potassium permanganate', MnCl2:'Manganese(II) chloride'
  };

  function gcdBigInt(a, b) {
    a = a < 0n ? -a : a; b = b < 0n ? -b : b;
    while (b) { const t = a % b; a = b; b = t; }
    return a || 1n;
  }
  function lcmBigInt(a, b) { return (a / gcdBigInt(a,b)) * b; }

  class Fraction {
    constructor(n, d = 1n) {
      n = BigInt(n); d = BigInt(d);
      if (d === 0n) throw new Error('Zero denominator');
      if (d < 0n) { n = -n; d = -d; }
      const g = gcdBigInt(n,d); this.n = n/g; this.d = d/g;
    }
    add(o) { o = Fraction.from(o); return new Fraction(this.n*o.d + o.n*this.d, this.d*o.d); }
    sub(o) { o = Fraction.from(o); return new Fraction(this.n*o.d - o.n*this.d, this.d*o.d); }
    mul(o) { o = Fraction.from(o); return new Fraction(this.n*o.n, this.d*o.d); }
    div(o) { o = Fraction.from(o); return new Fraction(this.n*o.d, this.d*o.n); }
    neg() { return new Fraction(-this.n,this.d); }
    isZero() { return this.n === 0n; }
    static from(v) { return v instanceof Fraction ? v : new Fraction(v); }
  }

  function sanitizeFormula(input) {
    return String(input || '').trim().replace(/\s+/g,'').replace(/[−–—]/g,'-');
  }

  function extractCharge(raw) {
    let formula = sanitizeFormula(raw);
    let charge = 0;
    let m = formula.match(/\^(\d*)([+-])$/);
    if (m) {
      const magnitude = m[1] ? Number(m[1]) : 1;
      charge = m[2] === '+' ? magnitude : -magnitude;
      formula = formula.slice(0, m.index);
    } else if (/[+-]$/.test(formula)) {
      charge = formula.endsWith('+') ? 1 : -1;
      formula = formula.slice(0,-1);
    }
    return { formula, charge };
  }

  function mergeCounts(target, source, multiplier = 1) {
    for (const [el, count] of Object.entries(source)) target[el] = (target[el] || 0) + count * multiplier;
    return target;
  }

  function parseFormula(input) {
    const charged = extractCharge(input);
    if (!charged.formula) throw new Error('Formula is empty.');
    const total = {};
    const hydrateParts = charged.formula.split(/[·.]/).filter(Boolean);
    for (const rawPart of hydrateParts) {
      const coeffMatch = rawPart.match(/^(\d+)(.*)$/);
      const multiplier = coeffMatch ? Number(coeffMatch[1]) : 1;
      const part = coeffMatch ? coeffMatch[2] : rawPart;
      let index = 0;
      function parseGroup(stopChar = null) {
        const counts = {};
        while (index < part.length) {
          const ch = part[index];
          if (stopChar && ch === stopChar) { index++; return counts; }
          if (ch === '(' || ch === '[' || ch === '{') {
            const close = ch === '(' ? ')' : ch === '[' ? ']' : '}';
            index++;
            const inner = parseGroup(close);
            let digits = '';
            while (/\d/.test(part[index] || '')) digits += part[index++];
            mergeCounts(counts, inner, digits ? Number(digits) : 1);
            continue;
          }
          if (ch === ')' || ch === ']' || ch === '}') throw new Error(`Unexpected "${ch}" in ${input}.`);
          const match = part.slice(index).match(/^([A-Z][a-z]?)(\d*)/);
          if (!match) throw new Error(`Cannot parse formula near "${part.slice(index)}".`);
          const symbol = match[1];
          if (!ELEMENTS[symbol]) throw new Error(`Element ${symbol} is not available in this model.`);
          counts[symbol] = (counts[symbol] || 0) + (match[2] ? Number(match[2]) : 1);
          index += match[0].length;
        }
        if (stopChar) throw new Error(`Missing closing "${stopChar}" in ${input}.`);
        return counts;
      }
      mergeCounts(total, parseGroup(), multiplier);
    }
    return { counts: total, charge: charged.charge, formula: charged.formula };
  }

  function countSignature(counts, charge = 0) {
    const entries = Object.entries(counts).filter(([,v]) => v).sort(([a],[b]) => a.localeCompare(b));
    return entries.map(([k,v]) => `${k}:${v}`).join('|') + `|q:${charge}`;
  }

  function hillFormula(counts) {
    const keys = Object.keys(counts).filter(k => counts[k] > 0);
    const ordered = [];
    if (counts.C) {
      ordered.push('C');
      if (counts.H) ordered.push('H');
      keys.filter(k => k !== 'C' && k !== 'H').sort().forEach(k => ordered.push(k));
    } else {
      keys.sort().forEach(k => ordered.push(k));
    }
    return ordered.map(k => k + (counts[k] === 1 ? '' : counts[k])).join('');
  }

  function chargeSuffix(charge) {
    if (!charge) return '';
    const sign = charge > 0 ? '+' : '-';
    const magnitude = Math.abs(charge);
    return `^${magnitude === 1 ? '' : magnitude}${sign}`;
  }

  function formulaWithCharge(counts, charge = 0) { return hillFormula(counts) + chargeSuffix(charge); }

  function molarMass(input) {
    const parsed = typeof input === 'string' ? parseFormula(input) : input;
    return Object.entries(parsed.counts).reduce((sum,[symbol,count]) => sum + ELEMENTS[symbol].mass * count, 0);
  }

  function empiricalFormula(input) {
    const parsed = typeof input === 'string' ? parseFormula(input) : input;
    const values = Object.values(parsed.counts).map(v => BigInt(v));
    let g = values[0] || 1n;
    values.slice(1).forEach(v => { g = gcdBigInt(g,v); });
    const reduced = {};
    for (const [k,v] of Object.entries(parsed.counts)) reduced[k] = Number(BigInt(v)/g);
    return hillFormula(reduced);
  }

  function bondOrder(bond) {
    if (typeof bond.order === 'number') return bond.order;
    return (BOND_TYPES[bond.type] || BOND_TYPES.single).order;
  }

  function isIonicBond(bond) { return bond.type === 'ionic' || bond.ionic === true; }

  function graphCounts(atoms) {
    const counts = {};
    atoms.forEach(a => { counts[a.symbol] = (counts[a.symbol] || 0) + 1; });
    return counts;
  }

  function graphCharge(atoms) { return atoms.reduce((sum,a) => sum + Number(a.charge || 0), 0); }

  function graphFormula(atoms) { return formulaWithCharge(graphCounts(atoms), graphCharge(atoms)); }

  function adjacencyMap(atoms, bonds) {
    const map = new Map(atoms.map(a => [a.id, []]));
    for (const b of bonds) {
      if (!map.has(b.a) || !map.has(b.b)) continue;
      map.get(b.a).push({ id:b.b, order:bondOrder(b), type:b.type || 'single' });
      map.get(b.b).push({ id:b.a, order:bondOrder(b), type:b.type || 'single' });
    }
    return map;
  }

  function connectedComponents(atoms, bonds) {
    const adj = adjacencyMap(atoms,bonds);
    const visited = new Set();
    const components = [];
    for (const atom of atoms) {
      if (visited.has(atom.id)) continue;
      const queue = [atom.id]; visited.add(atom.id); const ids = [];
      while (queue.length) {
        const id = queue.shift(); ids.push(id);
        for (const n of adj.get(id) || []) if (!visited.has(n.id)) { visited.add(n.id); queue.push(n.id); }
      }
      components.push(ids);
    }
    return components;
  }

  function supportedChargeValues(atomOrSymbol) {
    const symbol = typeof atomOrSymbol === 'string' ? atomOrSymbol : atomOrSymbol?.symbol;
    const el = ELEMENTS[symbol];
    if (!el) return [];
    return Object.keys(el.valences || {}).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
  }

  function valenceOptions(atom) {
    const el = ELEMENTS[atom.symbol];
    if (!el) return [];
    const charge = String(Number(atom.charge || 0));
    return Object.prototype.hasOwnProperty.call(el.valences || {}, charge) ? el.valences[charge].slice() : [];
  }

  function engineChargeText(charge) {
    const q = Number(charge || 0);
    if (!q) return '0';
    return `${Math.abs(q) === 1 ? '' : Math.abs(q)}${q > 0 ? '+' : '−'}`;
  }

  function atomCovalentOrder(atomId, bonds) {
    return bonds.filter(b => !isIonicBond(b) && (b.a === atomId || b.b === atomId)).reduce((sum,b)=>sum+bondOrder(b),0);
  }

  function validateGraph(atoms, bonds) {
    const errors = [], unsupported = [], warnings = [], atomStates = [];
    const atomById = new Map(atoms.map(a => [a.id,a]));
    const duplicate = new Set();
    const invalidAtomIds = new Set();
    const unsupportedAtomIds = new Set();
    const addBondError = (message,bond) => {
      errors.push(message);
      if (bond) { invalidAtomIds.add(bond.a); invalidAtomIds.add(bond.b); }
    };
    const addBondUnsupported = (message,bond) => {
      unsupported.push(message);
      if (bond) { unsupportedAtomIds.add(bond.a); unsupportedAtomIds.add(bond.b); }
    };

    for (const bond of bonds) {
      if (bond.a === bond.b) addBondError('An atom cannot bond to itself.',bond);
      const a = atomById.get(bond.a), b = atomById.get(bond.b);
      if (!a || !b) { addBondError('A bond references an atom that does not exist.',bond); continue; }
      const key = [bond.a,bond.b].sort((x,y)=>x-y).join(':');
      if (duplicate.has(key)) addBondError('Duplicate bonds were detected.',bond);
      duplicate.add(key);
      const type = bond.type || 'single';
      if (!BOND_TYPES[type] && typeof bond.order !== 'number') { addBondError('Unknown bond type.',bond); continue; }
      const ea = ELEMENTS[a.symbol], eb = ELEMENTS[b.symbol];
      if (!ea || !eb) {
        addBondUnsupported(`A bond contains an element that is not configured (${a.symbol}–${b.symbol}); no chemical-validity verdict is claimed.`,bond);
        continue;
      }

      if (isIonicBond(bond)) {
        const qa = Number(a.charge || 0), qb = Number(b.charge || 0);
        if (!qa || !qb || Math.sign(qa) === Math.sign(qb)) {
          addBondError('An ionic interaction requires explicitly opposite, non-zero charges.',bond);
          continue;
        }
        if (Boolean(ea.metal) === Boolean(eb.metal)) {
          addBondError('Strict ionic mode requires one positively charged metal and one negatively charged nonmetal ion.',bond);
          continue;
        }
        const metalAtom = ea.metal ? a : b;
        const nonmetalAtom = ea.metal ? b : a;
        if (Number(metalAtom.charge || 0) <= 0 || Number(nonmetalAtom.charge || 0) >= 0) {
          addBondError('Ionic compounds require a positive metal cation and a negative nonmetal anion.',bond);
        }
      } else {
        if (type === 'aromatic' || Math.abs(bondOrder(bond)-1.5) < 1e-9) {
          addBondError('Aromaticity is a ring property, not a free-standing bond. Build a supported ring with alternating single and double bonds or load an aromatic preset.',bond);
        }
        if (ea.category === 'noble gas' || eb.category === 'noble gas') {
          addBondError('Neutral noble-gas atoms do not form ordinary introductory Lewis bonds in strict mode.',bond);
        }
        if (ea.metal || eb.metal) {
          const pair = `${a.symbol}–${b.symbol}`;
          addBondUnsupported(`${pair} requires compound-specific organometallic, coordination, or crystal-structure rules; the generic Lewis model does not certify it.`,bond);
        }
      }
    }

    const adj = adjacencyMap(atoms,bonds);
    let hasOpenValence = false;
    for (const atom of atoms) {
      const el = ELEMENTS[atom.symbol];
      if (!el) {
        const detail = `Element ${atom.symbol} is not configured; the graph is outside the implemented model.`;
        unsupported.push(detail);
        atomStates.push({ atomId:atom.id, symbol:atom.symbol, charge:Number(atom.charge||0), covalentOrder:0, ionicNeighbors:0, allowed:[], state:'unsupported', detail, inferredNonbondingElectrons:null, shellElectrons:null });
        continue;
      }
      const neighbors = adj.get(atom.id) || [];
      const covalentOrder = neighbors.filter(n => n.type !== 'ionic').reduce((sum,n)=>sum+n.order,0);
      const ionicNeighbors = neighbors.filter(n => n.type === 'ionic').length;
      const charge = Number(atom.charge || 0);
      const allowed = valenceOptions(atom).sort((a,b)=>a-b);
      const chargeSupported = supportedChargeValues(atom).includes(charge);
      const max = allowed.length ? Math.max(...allowed) : -Infinity;
      let state = invalidAtomIds.has(atom.id) ? 'invalid' : unsupportedAtomIds.has(atom.id) ? 'unsupported' : 'open';
      let detail = invalidAtomIds.has(atom.id) ? 'A connected bond violates strict structure rules.' : unsupportedAtomIds.has(atom.id) ? 'A connected interaction is outside the implemented chemistry model.' : '';
      let nonbonding = null;
      let shellElectrons = null;

      if (!chargeSupported) {
        if (state !== 'invalid') state = 'unsupported';
        detail = `${el.name} charge ${engineChargeText(charge)} is not implemented by this Lewis/ionic model; no chemical-validity verdict is claimed.`;
        unsupported.push(detail);
      }

      if (el.category === 'noble gas') {
        if (charge !== 0 || neighbors.length) {
          state = 'invalid';
          detail = `${el.name} is treated as a neutral closed-shell atom and cannot be bonded in strict introductory mode.`;
          errors.push(detail);
        } else if (state !== 'invalid' && state !== 'unsupported') {
          state = 'satisfied';
          detail = `Closed ${atom.symbol === 'He' ? 'duet' : 'octet'} shell.`;
          nonbonding = el.valenceElectrons;
          shellElectrons = el.valenceElectrons;
        }
        atomStates.push({ atomId:atom.id, symbol:atom.symbol, charge, covalentOrder, ionicNeighbors, allowed, state, detail, inferredNonbondingElectrons:nonbonding, shellElectrons });
        continue;
      }

      if (el.metal) {
        if (covalentOrder > 1e-9) {
          if (state !== 'invalid') state = 'unsupported';
          detail = `${el.name} has a metal–ligand or metal–metal bond that requires compound-specific coordination or crystal rules.`;
          unsupported.push(detail);
        } else if (charge < 0 || (charge > 0 && !el.commonCharges.includes(charge))) {
          if (state !== 'invalid') state = 'unsupported';
          detail = `${el.name} charge ${engineChargeText(charge)} is outside the configured common cation states.`;
          unsupported.push(detail);
        } else if (ionicNeighbors && charge <= 0) {
          state = 'invalid';
          detail = `${el.name} must carry a positive ionic charge before an ionic interaction is valid.`;
          errors.push(detail);
        } else if (state !== 'invalid' && state !== 'unsupported' && charge > 0) {
          state = 'satisfied';
          detail = ionicNeighbors ? `Supported ${el.name} cation participating in ionic interactions.` : `Supported isolated ${el.name} cation.`;
        } else if (state !== 'invalid' && state !== 'unsupported') {
          state = 'open';
          detail = 'Neutral metal atom. Use Ionic mode with a supported nonmetal ion; strict mode will assign a common cation charge.';
          hasOpenValence = true;
        }
        atomStates.push({ atomId:atom.id, symbol:atom.symbol, charge, covalentOrder, ionicNeighbors, allowed, state, detail, inferredNonbondingElectrons:null, shellElectrons:null });
        continue;
      }

      if (state === 'unsupported') {
        atomStates.push({ atomId:atom.id, symbol:atom.symbol, charge, covalentOrder, ionicNeighbors, allowed, state, detail, inferredNonbondingElectrons:null, shellElectrons:null });
        continue;
      }

      const commonIon = chargeSupported && covalentOrder === 0 && charge !== 0 && el.commonCharges.includes(charge) && allowed.some(v=>Math.abs(v)<1e-9);
      if (chargeSupported) {
        if (covalentOrder > max + 1e-9) {
          state = 'invalid';
          detail = `${el.name} with charge ${engineChargeText(charge)} permits covalent bond order ${allowed.join(' or ') || '0'}, not ${covalentOrder}.`;
          errors.push(detail);
        } else if (state !== 'invalid' && commonIon) {
          state = 'satisfied';
          detail = 'Supported monatomic ion with a filled shell.';
        } else if (state !== 'invalid' && allowed.some(v => Math.abs(v-covalentOrder) < 1e-9)) {
          state = 'satisfied';
          detail = 'Supported formal-charge and bond-order combination.';
        } else if (state !== 'invalid') {
          state = 'open';
          const next = allowed.find(v => v > covalentOrder + 1e-9);
          detail = next == null ? 'No complete common Lewis state matches this partial structure.' : `${next-covalentOrder} additional covalent bond-order unit${Math.abs(next-covalentOrder-1)<1e-9?'':'s'} required for the next supported state.`;
          hasOpenValence = true;
        }

        nonbonding = el.valenceElectrons - charge - covalentOrder;
        if (!Number.isFinite(nonbonding) || Math.abs(nonbonding-Math.round(nonbonding)) > 1e-9 || nonbonding < -1e-9) {
          state = 'invalid';
          detail = `${el.name} has an impossible formal-charge, lone-electron, and bond-order combination.`;
          errors.push(detail);
        } else {
          nonbonding = Math.round(nonbonding);
          shellElectrons = 2*covalentOrder + nonbonding;
          const shellMaximum = atom.symbol === 'H' ? 2 : (el.atomicNumber <= 10 ? 8 : null);
          if (shellMaximum != null && shellElectrons > shellMaximum + 1e-9) {
            state = 'invalid';
            detail = `${el.name} would contain ${shellElectrons} electrons in a shell that can hold at most ${shellMaximum}.`;
            errors.push(detail);
          }
          const usualTarget = atom.symbol === 'H' ? 2 : atom.symbol === 'B' ? 6 : (el.atomicNumber <= 10 ? 8 : null);
          if (state === 'satisfied' && !commonIon && usualTarget != null && shellElectrons < usualTarget - 1e-9) {
            state = 'open';
            hasOpenValence = true;
            warnings.push(`${el.name} is electron-deficient (${shellElectrons}/${usualTarget} shell electrons); the structure is a reactive or incomplete Lewis species, not a closed-shell molecule.`);
          }
        }
      }

      if (state === 'open') hasOpenValence = true;
      atomStates.push({ atomId:atom.id, symbol:atom.symbol, charge, covalentOrder, ionicNeighbors, allowed, state, detail, inferredNonbondingElectrons:nonbonding, shellElectrons });
    }

    const components = connectedComponents(atoms,bonds);
    for (const ids of components) {
      const idSet = new Set(ids);
      const componentBonds = bonds.filter(b=>idSet.has(b.a)&&idSet.has(b.b));
      if (componentBonds.some(isIonicBond)) {
        const componentCharge = atoms.filter(a=>idSet.has(a.id)).reduce((sum,a)=>sum+Number(a.charge||0),0);
        if (componentCharge !== 0) {
          hasOpenValence = true;
          warnings.push(`An ionic assembly has net charge ${engineChargeText(componentCharge)}. Add the required counterion ratio for a neutral formula unit, or treat it explicitly as a charged species.`);
        }
      }
    }
    if (components.length > 1) warnings.push(`The canvas contains ${components.length} disconnected components; treat it as a mixture unless the components are intentionally separate ions.`);
    const totalValenceElectrons = atoms.reduce((sum,a)=>sum+(ELEMENTS[a.symbol]?.valenceElectrons || 0),0) - graphCharge(atoms);
    if (atoms.length && totalValenceElectrons % 2 !== 0) {
      hasOpenValence = true;
      warnings.push('The total valence-electron count is odd, so the structure is a radical or an incomplete electron assignment.');
    }
    const status = errors.length ? 'invalid' : unsupported.length ? 'unsupported' : hasOpenValence ? 'open' : 'valid';
    const counts = graphCounts(atoms);
    const mass = Object.keys(counts).every(symbol=>ELEMENTS[symbol] && Number.isFinite(ELEMENTS[symbol].mass))
      ? Object.entries(counts).reduce((sum,[symbol,count])=>sum+ELEMENTS[symbol].mass*count,0)
      : null;
    return {
      status, valid:status === 'valid', closedShell:status === 'valid', errors:[...new Set(errors)], unsupported:[...new Set(unsupported)], warnings:[...new Set(warnings)], atomStates,
      formula:graphFormula(atoms), counts, charge:graphCharge(atoms), mass,
      components, totalValenceElectrons
    };
  }

  function chargeCandidateFor(atom, atoms, bonds, sign) {
    const el = ELEMENTS[atom.symbol];
    const current = Number(atom.charge || 0);
    if (!el) return {ok:false,reason:'Unsupported element.'};
    if (current && Math.sign(current) !== sign) return {ok:false,reason:`${el.name} already carries the wrong charge sign for this ionic role.`};
    const order = atomCovalentOrder(atom.id,bonds);
    const values = supportedChargeValues(atom).filter(q=>Math.sign(q)===sign);
    const fitting = values.filter(q=>(el.valences[String(q)]||[]).some(v=>Math.abs(v-order)<1e-9));
    if (current) {
      if (fitting.includes(current)) return {ok:true,charge:current};
      return {ok:false,reason:`${el.name} charge ${engineChargeText(current)} is incompatible with its current covalent bond order ${order}.`};
    }
    const preferred = fitting.sort((a,b)=>{
      const ac = el.commonCharges.includes(a) ? 0 : 1;
      const bc = el.commonCharges.includes(b) ? 0 : 1;
      return ac-bc || Math.abs(a)-Math.abs(b);
    })[0];
    if (preferred == null) return {ok:false,reason:`${el.name} with covalent bond order ${order} cannot be converted into a supported ${sign>0?'cation':'anion'} without changing its structure.`};
    return {ok:true,charge:preferred};
  }

  function suggestIonicCharges(atomA, atomB, atoms, bonds) {
    const a = ELEMENTS[atomA.symbol], b = ELEMENTS[atomB.symbol];
    if (!a || !b) return {ok:false,reason:'Unsupported element.'};
    if (Boolean(a.metal) === Boolean(b.metal)) return {ok:false,reason:'Strict ionic mode requires one metal and one nonmetal.'};
    const positive = a.metal ? atomA : atomB;
    const negative = a.metal ? atomB : atomA;
    if (atomCovalentOrder(positive.id,bonds) > 1e-9) return {ok:false,reason:'The metal already has a generic covalent bond, which strict mode does not certify.'};
    const pos = chargeCandidateFor(positive,atoms,bonds,1);
    if (!pos.ok) return pos;
    const neg = chargeCandidateFor(negative,atoms,bonds,-1);
    if (!neg.ok) return neg;
    const updates = {};
    if (Number(positive.charge||0) !== pos.charge) updates[positive.id] = pos.charge;
    if (Number(negative.charge||0) !== neg.charge) updates[negative.id] = neg.charge;
    return {ok:true,updates};
  }

  function canSetAtomCharge(atoms,bonds,atomId,charge) {
    const atom = atoms.find(a=>a.id===atomId);
    if (!atom) return {ok:false,reason:'Atom not found.'};
    charge = Number(charge);
    if (!supportedChargeValues(atom).includes(charge)) {
      return {ok:false,reason:`${ELEMENTS[atom.symbol].name} charge ${engineChargeText(charge)} is outside the supported strict Lewis/ionic states.`};
    }
    const copies = atoms.map(a=>a.id===atomId?{...a,charge}:{...a});
    const validation = validateGraph(copies,bonds);
    const atomState = validation.atomStates.find(s=>s.atomId===atomId);
    if (!atomState || atomState.state === 'invalid' || atomState.state === 'unsupported') return {ok:false,reason:atomState?.detail || validation.errors[0] || validation.unsupported?.[0] || 'That charge is incompatible with the current structure.',validation};
    return {ok:true,validation,atomState};
  }

  function canApplyBond(atoms, bonds, aId, bId, type) {
    if (aId === bId) return { ok:false, reason:'An atom cannot bond to itself.' };
    const a = atoms.find(x=>x.id===aId), b = atoms.find(x=>x.id===bId);
    if (!a || !b) return { ok:false, reason:'Atom not found.' };
    const bondType = BOND_TYPES[type];
    if (!bondType) return { ok:false, reason:'Unknown bond type.' };
    const ea = ELEMENTS[a.symbol], eb = ELEMENTS[b.symbol];
    if (type === 'aromatic') return {ok:false,reason:'Aromaticity is a ring-level property. Build alternating single/double bonds or load a validated aromatic preset.'};
    if (type !== 'ionic') {
      if (ea?.category === 'noble gas' || eb?.category === 'noble gas') return {ok:false,reason:'Neutral noble gases have filled shells and no ordinary Lewis bonding site in strict mode.'};
      if (ea?.metal || eb?.metal) return {ok:false,reason:`A bare ${a.symbol}–${b.symbol} covalent bond is not certified. Use ionic mode for supported salts; advanced metal bonding needs compound-specific coordination or crystal data.`};
    }

    let chargeUpdates = null;
    const atomCopies = atoms.map(x=>({...x}));
    if (type === 'ionic') {
      const suggestion = suggestIonicCharges(a,b,atomCopies,bonds);
      if (!suggestion.ok) return {ok:false,reason:suggestion.reason};
      chargeUpdates = suggestion.updates;
      atomCopies.forEach(x=>{ if (Object.prototype.hasOwnProperty.call(chargeUpdates,x.id)) x.charge=chargeUpdates[x.id]; });
    }
    const remaining = bonds.filter(x => !((x.a===aId&&x.b===bId)||(x.a===bId&&x.b===aId)));
    remaining.push({a:aId,b:bId,type,order:bondType.order});
    const validation = validateGraph(atomCopies,remaining);
    const pairStates = validation.atomStates.filter(s=>s.atomId===aId||s.atomId===bId);
    const pairInvalid = pairStates.find(s=>s.state==='invalid');
    const pairUnsupported = pairStates.find(s=>s.state==='unsupported');
    if (validation.errors.length || pairInvalid) return {ok:false,reason:pairInvalid?.detail || validation.errors[0] || 'That bond violates strict chemistry rules.',validation};
    if ((validation.unsupported||[]).length || pairUnsupported) return {ok:false,reason:pairUnsupported?.detail || validation.unsupported[0] || 'That interaction is outside the implemented chemistry model.',validation};
    return {ok:true,chargeUpdates,validation};
  }

  function wlColors(atoms,bonds) {
    const adj = adjacencyMap(atoms,bonds);
    let colors = new Map();
    atoms.forEach(a => {
      const ns = adj.get(a.id)||[];
      const degree = ns.length;
      const sum = ns.reduce((s,n)=>s+n.order,0);
      colors.set(a.id,`${a.symbol}|${Number(a.charge||0)}|${degree}|${sum}`);
    });
    for (let iter=0; iter<Math.min(8,atoms.length+1); iter++) {
      const signatures = new Map();
      atoms.forEach(a => {
        const neighbor = (adj.get(a.id)||[]).map(n=>`${n.type}:${n.order}:${colors.get(n.id)}`).sort().join(',');
        signatures.set(a.id,`${colors.get(a.id)}[${neighbor}]`);
      });
      const unique = [...new Set(signatures.values())].sort();
      const index = new Map(unique.map((s,i)=>[s,String(i)]));
      const next = new Map(); atoms.forEach(a=>next.set(a.id,index.get(signatures.get(a.id))));
      if (atoms.every(a=>next.get(a.id)===colors.get(a.id))) break;
      colors = next;
    }
    return colors;
  }

  function areGraphsIsomorphic(g1,g2) {
    if (g1.atoms.length !== g2.atoms.length || g1.bonds.length !== g2.bonds.length) return false;
    if (countSignature(graphCounts(g1.atoms),graphCharge(g1.atoms)) !== countSignature(graphCounts(g2.atoms),graphCharge(g2.atoms))) return false;
    const c1 = wlColors(g1.atoms,g1.bonds), c2 = wlColors(g2.atoms,g2.bonds);
    const colorBag = colors => [...colors.values()].sort().join('|');
    if (colorBag(c1)!==colorBag(c2)) return false;
    const adj1=adjacencyMap(g1.atoms,g1.bonds), adj2=adjacencyMap(g2.atoms,g2.bonds);
    const byColor2 = new Map();
    g2.atoms.forEach(a=>{const c=c2.get(a.id); if(!byColor2.has(c))byColor2.set(c,[]); byColor2.get(c).push(a);});
    const order = g1.atoms.slice().sort((a,b)=>(byColor2.get(c1.get(a.id))?.length||99)-(byColor2.get(c1.get(b.id))?.length||99));
    const mapping=new Map(), used=new Set();
    function edgeBetween(adj,a,b) { return (adj.get(a)||[]).find(n=>n.id===b); }
    function backtrack(i) {
      if (i===order.length) return true;
      const a=order[i], candidates=byColor2.get(c1.get(a.id))||[];
      for (const b of candidates) {
        if (used.has(b.id)) continue;
        let compatible=true;
        for (const [aMapped,bMapped] of mapping.entries()) {
          const e1=edgeBetween(adj1,a.id,aMapped), e2=edgeBetween(adj2,b.id,bMapped);
          if (!!e1!==!!e2) {compatible=false;break;}
          if (e1 && (e1.type!==e2.type || Math.abs(e1.order-e2.order)>1e-9)) {compatible=false;break;}
        }
        if (!compatible) continue;
        mapping.set(a.id,b.id); used.add(b.id);
        if (backtrack(i+1)) return true;
        mapping.delete(a.id); used.delete(b.id);
      }
      return false;
    }
    return backtrack(0);
  }

  function identifyGraph(graph, library) {
    const validation = validateGraph(graph.atoms,graph.bonds);
    if (validation.status === 'invalid') return { key:null, name:'Rejected structure', formula:validation.formula, molecule:null };
    if (validation.status === 'unsupported') return { key:null, name:'Outside current model', formula:validation.formula, molecule:null };
    for (const molecule of Object.values(library || {})) {
      if (molecule.atoms.length !== graph.atoms.length || molecule.bonds.length !== graph.bonds.length) continue;
      if (areGraphsIsomorphic(graph,molecule)) return { key:molecule.key, name:molecule.name, formula:molecule.formula || validation.formula, molecule };
    }
    return { key:null, name:validation.status==='invalid'?'Invalid structure':validation.status==='unsupported'?'Outside current model':validation.status==='open'?'Custom open-valence structure':'Valid custom structure', formula:validation.formula, molecule:null };
  }

  function degreeOfUnsaturation(counts) {
    const allowed = new Set(['C','H','N','F','Cl','Br','I']);
    if (!Object.keys(counts).every(k=>allowed.has(k)) || !counts.C) return null;
    const X=(counts.F||0)+(counts.Cl||0)+(counts.Br||0)+(counts.I||0);
    const value=1+(counts.C||0)-((counts.H||0)+X)/2+(counts.N||0)/2;
    return Number.isFinite(value) ? value : null;
  }

  function toMolfile(graph,title='ChemLab structure') {
    const atoms=graph.atoms, bonds=graph.bonds.filter(b=>!isIonicBond(b));
    const lines=[title,'  ChemLab Studio','',`${String(atoms.length).padStart(3)}${String(bonds.length).padStart(3)}  0  0  0  0            999 V2000`];
    atoms.forEach(a=>{
      const x=((a.x||0)/80).toFixed(4).padStart(10), y=(-(a.y||0)/80).toFixed(4).padStart(10), z='0.0000'.padStart(10);
      lines.push(`${x}${y}${z} ${a.symbol.padEnd(3)} 0  0  0  0  0  0  0  0  0  0  0  0`);
    });
    bonds.forEach(b=>{
      const ai=atoms.findIndex(a=>a.id===b.a)+1, bi=atoms.findIndex(a=>a.id===b.b)+1;
      const type=b.type==='aromatic'?4:Math.max(1,Math.round(bondOrder(b)));
      lines.push(`${String(ai).padStart(3)}${String(bi).padStart(3)}${String(type).padStart(3)}  0  0  0  0`);
    });
    const charged=atoms.map((a,i)=>[i+1,Number(a.charge||0)]).filter(([,q])=>q);
    for(let i=0;i<charged.length;i+=8){
      const chunk=charged.slice(i,i+8); lines.push(`M  CHG${String(chunk.length).padStart(3)}${chunk.map(([idx,q])=>`${String(idx).padStart(4)}${String(q).padStart(4)}`).join('')}`);
    }
    lines.push('M  END'); return lines.join('\n');
  }

  function nullspaceBasis(matrix) {
    const a=matrix.map(row=>row.map(Fraction.from));
    const rows=a.length, cols=a[0]?.length||0;
    const pivots=[]; let r=0;
    for(let c=0;c<cols && r<rows;c++){
      let pivot=r; while(pivot<rows && a[pivot][c].isZero()) pivot++;
      if(pivot===rows) continue;
      [a[r],a[pivot]]=[a[pivot],a[r]];
      const p=a[r][c]; for(let j=0;j<cols;j++) a[r][j]=a[r][j].div(p);
      for(let i=0;i<rows;i++) if(i!==r && !a[i][c].isZero()){
        const f=a[i][c]; for(let j=0;j<cols;j++) a[i][j]=a[i][j].sub(f.mul(a[r][j]));
      }
      pivots.push(c); r++;
    }
    const free=[]; for(let c=0;c<cols;c++) if(!pivots.includes(c)) free.push(c);
    const basis=[];
    for(const f of free){
      const v=Array.from({length:cols},()=>new Fraction(0)); v[f]=new Fraction(1);
      pivots.forEach((pc,row)=>{v[pc]=a[row][f].neg();}); basis.push(v);
    }
    return basis;
  }

  function fractionsToIntegers(vector) {
    let lcm=1n; vector.forEach(v=>{lcm=lcmBigInt(lcm,v.d);});
    let ints=vector.map(v=>v.n*(lcm/v.d));
    const nonzero=ints.find(v=>v!==0n); if(nonzero<0n) ints=ints.map(v=>-v);
    let g=0n; ints.forEach(v=>{if(v!==0n)g=g===0n?(v<0n?-v:v):gcdBigInt(g,v);});
    if(g>1n) ints=ints.map(v=>v/g);
    return ints;
  }

  function findPositiveNullVector(basis) {
    if (!basis.length) return null;
    if (basis.length===1) {
      const ints=fractionsToIntegers(basis[0]);
      if (ints.every(v=>v>0n) || ints.every(v=>v<0n)) return ints.every(v=>v>0n)?ints:ints.map(v=>-v);
      return null;
    }
    const dims=basis.length, limit=8; let best=null;
    function search(depth,coeffs){
      if(depth===dims){
        const v=basis[0].map((_,i)=>basis.reduce((s,b,k)=>s.add(b[i].mul(coeffs[k])),new Fraction(0)));
        let ints=fractionsToIntegers(v);
        if(ints.every(x=>x<0n)) ints=ints.map(x=>-x);
        if(!ints.every(x=>x>0n)) return;
        const score=ints.reduce((s,x)=>s+x,0n);
        if(!best||score<best.score) best={ints,score}; return;
      }
      for(let c=1;c<=limit;c++){coeffs[depth]=c;search(depth+1,coeffs);}
    }
    search(0,[]); return best?.ints||null;
  }

  function balanceEquation(reactants,products) {
    if(!reactants.length||!products.length) throw new Error('Both reactants and products are required.');
    const parsedR=reactants.map(parseFormula), parsedP=products.map(parseFormula);
    const elements=[...new Set([...parsedR,...parsedP].flatMap(p=>Object.keys(p.counts)))].sort();
    const includeCharge=[...parsedR,...parsedP].some(p=>p.charge!==0);
    const rows=elements.map(el=>[
      ...parsedR.map(p=>new Fraction(p.counts[el]||0)),
      ...parsedP.map(p=>new Fraction(-(p.counts[el]||0)))
    ]);
    if(includeCharge) rows.push([...parsedR.map(p=>new Fraction(p.charge)),...parsedP.map(p=>new Fraction(-p.charge))]);
    const basis=nullspaceBasis(rows); const vector=findPositiveNullVector(basis);
    if(!vector) throw new Error('The equation is inconsistent or underdetermined in a way this balancer cannot resolve automatically.');
    const nums=vector.map(v=>Number(v));
    const coefficients={reactants:nums.slice(0,reactants.length),products:nums.slice(reactants.length)};
    const conserved={};
    for(const el of elements){
      const left=parsedR.reduce((s,p,i)=>s+(p.counts[el]||0)*coefficients.reactants[i],0);
      const right=parsedP.reduce((s,p,i)=>s+(p.counts[el]||0)*coefficients.products[i],0);
      conserved[el]={left,right,ok:left===right};
    }
    return {reactants,products,coefficients,conserved,chargeConserved:true};
  }

  function formatCoefficient(n) { return n===1?'':String(n); }
  function equationPlain(result) {
    const left=result.reactants.map((f,i)=>`${formatCoefficient(result.coefficients.reactants[i])}${f}`).join(' + ');
    const right=result.products.map((f,i)=>`${formatCoefficient(result.coefficients.products[i])}${f}`).join(' + ');
    return `${left} → ${right}`;
  }

  function ionPart(ion,count) {
    if(count===1) return ion.formula;
    return ion.polyatomic ? `(${ion.formula})${count}` : `${ion.formula}${count}`;
  }

  function combineIons(cationKey,anionKey) {
    const c=CATIONS[cationKey], a=ANIONS[anionKey];
    if(!c||!a) throw new Error('Unknown ion.');
    const g=Number(gcdBigInt(BigInt(c.charge),BigInt(-a.charge)));
    const cCount=(-a.charge)/g, aCount=c.charge/g;
    return ionPart(c,cCount)+ionPart(a,aCount);
  }

  const IONIC_COMPOUNDS=[];
  for(const [ck,c] of Object.entries(CATIONS)) for(const [ak,a] of Object.entries(ANIONS)) {
    if(ck==='H') continue;
    const formula=combineIons(ck,ak);
    try { IONIC_COMPOUNDS.push({formula,signature:countSignature(parseFormula(formula).counts,0),cation:ck,anion:ak,name:`${c.name} ${a.name}`}); } catch(_){}
  }

  function compositionKey(formula) { const p=parseFormula(formula); return countSignature(p.counts,p.charge); }
  function formulaSetKey(formulas) { return formulas.map(compositionKey).sort().join('||'); }

  function inferIonicCompound(formula) {
    const sig=compositionKey(formula);
    const exact=IONIC_COMPOUNDS.filter(x=>x.signature===sig);
    if(!exact.length) return null;
    const clean=sanitizeFormula(formula);
    return exact.find(x=>x.formula===clean) || exact[0];
  }

  function knownName(formula) {
    const clean=sanitizeFormula(formula);
    if(KNOWN_NAMES[clean]) return KNOWN_NAMES[clean];
    try {
      const p=parseFormula(clean), entries=Object.entries(p.counts);
      if(p.charge===0 && entries.length===1 && entries[0][1]===1 && ELEMENTS[entries[0][0]]) return ELEMENTS[entries[0][0]].name;
    } catch(_) {}
    const ionic=inferIonicCompound(clean); return ionic?.name || null;
  }

  function isElementalMetal(formula) {
    const p=parseFormula(formula), entries=Object.entries(p.counts);
    if(p.charge!==0||entries.length!==1||entries[0][1]!==1) return null;
    const symbol=entries[0][0]; return ELEMENTS[symbol]?.metal ? symbol : null;
  }

  function isDiatomic(formula,symbol) {
    const p=parseFormula(formula); return p.charge===0 && Object.keys(p.counts).length===1 && p.counts[symbol]===2;
  }

  function classifySpecies(input) {
    const formula=sanitizeFormula(typeof input==='string'?input:input.formula);
    const parsed=parseFormula(formula), clean=parsed.formula+chargeSuffix(parsed.charge);
    const acid=ACIDS[parsed.formula];
    const ionic=inferIonicCompound(parsed.formula);
    const metal=isElementalMetal(parsed.formula);
    const halogen=HALOGEN_ACTIVITY.find(x=>isDiatomic(parsed.formula,x));
    const subsetCHO=Object.keys(parsed.counts).every(x=>['C','H','O'].includes(x));
    const fuel=subsetCHO && (parsed.counts.C||0)>0 && (parsed.counts.H||0)>0;
    return {formula:parsed.formula,charge:parsed.charge,counts:parsed.counts,key:compositionKey(clean),name:knownName(parsed.formula)||'Uncatalogued species',acid,ionic,metal,halogen,fuel};
  }

  function solubility(cationKey,anionKey) {
    const c=CATIONS[cationKey], a=ANIONS[anionKey];
    if(!c||!a) return 'unknown';
    if(['Li','Na','K','NH4'].includes(cationKey)) return 'soluble';
    if(['NO3','CH3COO','ClO3'].includes(anionKey)) return 'soluble';
    if(['Cl','Br','I'].includes(anionKey)) return ['Ag','Pb2'].includes(cationKey)?'insoluble':'soluble';
    if(anionKey==='SO4') return ['Ba','Pb2','Ca'].includes(cationKey)?'insoluble':'soluble';
    if(['CO3','PO4','SO3'].includes(anionKey)) return 'insoluble';
    if(anionKey==='OH') return ['Ba'].includes(cationKey)?'soluble':['Ca'].includes(cationKey)?'slightly soluble':'insoluble';
    if(anionKey==='S') return ['Mg','Ca','Ba'].includes(cationKey)?'soluble':'insoluble';
    return 'unknown';
  }

  const EXACT_REACTIONS = [
    {r:['H2','O2'],p:['H2O'],family:'Synthesis / combustion',certainty:'exact textbook rule',summary:'Hydrogen combines with oxygen to form water.',conditions:['energy input','strongly exothermic']},
    {r:['N2','H2'],p:['NH3'],family:'Reversible synthesis',certainty:'exact textbook rule',summary:'Nitrogen and hydrogen form ammonia; equilibrium and catalyst conditions matter.',conditions:['catalyst','elevated pressure','equilibrium']},
    {r:['C','O2'],p:['CO2'],family:'Combustion / combination',certainty:'exact textbook rule',summary:'Elemental carbon undergoes complete combustion to carbon dioxide when oxygen is sufficient.',conditions:['ignition','oxygen']},
    {r:['S','O2'],p:['SO2'],family:'Combustion / combination',certainty:'exact textbook rule',summary:'Sulfur burns in oxygen to form sulfur dioxide under the introductory model.',conditions:['ignition','irritant product']},
    {r:['CO','O2'],p:['CO2'],family:'Oxidation',certainty:'exact textbook rule',summary:'Carbon monoxide is oxidized to carbon dioxide.',conditions:['oxygen','ignition possible']},
    {r:['SO2','O2'],p:['SO3'],family:'Oxidation',certainty:'exact textbook rule',summary:'Sulfur dioxide is oxidized to sulfur trioxide.',conditions:['catalyst commonly used','equilibrium']},
    {r:['NH3','HCl'],p:['NH4Cl'],family:'Acid–base combination',certainty:'exact textbook rule',summary:'Ammonia accepts a proton from hydrogen chloride to form ammonium chloride.',conditions:['acid–base reaction']},
    {r:['CO2','Ca(OH)2'],p:['CaCO3','H2O'],family:'Precipitation',certainty:'exact textbook rule',summary:'Carbon dioxide reacts with calcium hydroxide to form calcium carbonate and water.',conditions:['aqueous system','precipitate']},
    {r:['CaO','H2O'],p:['Ca(OH)2'],family:'Combination',certainty:'exact textbook rule',summary:'Calcium oxide combines with water to form calcium hydroxide.',conditions:['exothermic']},
    {r:['SO3','H2O'],p:['H2SO4'],family:'Acid anhydride hydration',certainty:'exact textbook rule',summary:'Sulfur trioxide combines with water to form sulfuric acid.',conditions:['highly exothermic','corrosive product']},
    {r:['CO2','H2O'],p:['H2CO3'],family:'Acid anhydride hydration',certainty:'equilibrium model',summary:'Dissolved carbon dioxide is represented as carbonic acid in equilibrium with hydrated carbon dioxide.',conditions:['aqueous equilibrium']},
    {r:['H2O2'],p:['H2O','O2'],family:'Decomposition',certainty:'exact textbook rule',summary:'Hydrogen peroxide decomposes into water and oxygen.',conditions:['rate depends on catalyst and concentration']},
    {r:['KClO3'],p:['KCl','O2'],family:'Decomposition',certainty:'exact textbook rule',summary:'Potassium chlorate decomposes to potassium chloride and oxygen when appropriately activated.',conditions:['energy input','oxygen release']},
    {r:['CaCO3'],p:['CaO','CO2'],family:'Thermal decomposition',certainty:'exact textbook rule',summary:'Calcium carbonate decomposes into calcium oxide and carbon dioxide at sufficiently high temperature.',conditions:['strong heating']},
    {r:['NaHCO3'],p:['Na2CO3','CO2','H2O'],family:'Thermal decomposition',certainty:'exact textbook rule',summary:'Sodium hydrogen carbonate decomposes to sodium carbonate, carbon dioxide, and water.',conditions:['heating']}
  ];
  const EXACT_MAP=new Map(EXACT_REACTIONS.map(x=>[formulaSetKey(x.r),x]));

  function activityIndex(symbol) { const i=METAL_ACTIVITY.indexOf(symbol); return i<0?Infinity:i; }
  function preferredCation(symbol) { return PREFERRED_CATION[symbol] || null; }

  function reactionResult(reactants,products,meta) {
    const balanced=balanceEquation(reactants,products);
    return {supported:true,reactants,products,balanced,equation:equationPlain(balanced),...meta};
  }

  function predictReaction(inputs) {
    const unique=[]; const seen=new Set();
    for(const item of inputs){const s=classifySpecies(item);if(!seen.has(s.key)){seen.add(s.key);unique.push(s);}}
    if(!unique.length) return {supported:false,reason:'Add at least one reactant.'};
    const exact=EXACT_MAP.get(formulaSetKey(unique.map(s=>s.formula)));
    if(exact) return reactionResult(exact.r,exact.p,exact);

    if(unique.length===2){
      const oxygen=unique.find(s=>s.formula==='O2');
      const fuel=unique.find(s=>s!==oxygen && s.fuel);
      if(oxygen&&fuel) return reactionResult([fuel.formula,'O2'],['CO2','H2O'],{
        family:'Complete combustion',certainty:'deterministic CHO combustion rule',summary:'For a fuel containing only carbon, hydrogen, and optionally oxygen, the model assumes complete combustion with sufficient oxygen.',conditions:['ignition','sufficient oxygen','exothermic']
      });

      const acid=unique.find(s=>s.acid), base=unique.find(s=>s.ionic?.anion==='OH');
      if(acid&&base){
        const salt=combineIons(base.ionic.cation,acid.acid.anion);
        return reactionResult([acid.formula,base.formula],[salt,'H2O'],{family:'Acid–base neutralization',certainty:'deterministic ionic rule',summary:'Acidic protons neutralize hydroxide; the remaining ions form a salt.',conditions:['aqueous solution','heat may be released']});
      }

      const carbonate=unique.find(s=>['CO3','HCO3'].includes(s.ionic?.anion));
      if(acid&&carbonate){
        const salt=combineIons(carbonate.ionic.cation,acid.acid.anion);
        return reactionResult([acid.formula,carbonate.formula],[salt,'CO2','H2O'],{family:'Acid–carbonate reaction',certainty:'deterministic ionic rule',summary:'An acid reacts with carbonate or hydrogen carbonate to form a salt, carbon dioxide, and water.',conditions:['gas evolution','aqueous or moist system']});
      }

      const metal=unique.find(s=>s.metal), acidForMetal=unique.find(s=>s.acid);
      if(metal&&acidForMetal){
        if(acidForMetal.acid.oxidizing) return {supported:false,reason:'Oxidizing acids can produce different products depending on concentration and conditions; this deterministic model will not guess.'};
        if(activityIndex(metal.metal)>=activityIndex('H')) return {supported:false,reason:`${metal.metal} is below hydrogen in the simplified activity series, so ordinary non-oxidizing acid displacement is not predicted.`};
        const cation=preferredCation(metal.metal); if(!cation) return {supported:false,reason:'No preferred ionic state is configured for this metal.'};
        const salt=combineIons(cation,acidForMetal.acid.anion);
        return reactionResult([metal.formula,acidForMetal.formula],[salt,'H2'],{family:'Single displacement',certainty:'activity-series rule',summary:'A metal above hydrogen in the activity series displaces hydrogen from a non-oxidizing acid.',conditions:['hydrogen gas','reaction rate varies by metal and acid']});
      }

      const halogen=unique.find(s=>s.halogen), metalForHalogen=unique.find(s=>s.metal);
      if(halogen&&metalForHalogen){
        const cation=preferredCation(metalForHalogen.metal); if(!cation) return {supported:false,reason:'No preferred ionic state is configured for this metal.'};
        const salt=combineIons(cation,halogen.halogen);
        return reactionResult([metalForHalogen.formula,halogen.formula],[salt],{family:'Combination',certainty:'common ionic-product rule',summary:'A metal combines with a halogen to form a metal halide using the configured common oxidation state.',conditions:['often strongly exothermic','halogens are hazardous']});
      }

      const oxygenForMetal=unique.find(s=>s.formula==='O2'), metalForOxygen=unique.find(s=>s.metal);
      if(oxygenForMetal&&metalForOxygen){
        const cation=preferredCation(metalForOxygen.metal); if(!cation) return {supported:false,reason:'No preferred oxide state is configured for this metal.'};
        const oxide=combineIons(cation,'O');
        return reactionResult([metalForOxygen.formula,'O2'],[oxide],{family:'Oxidation / combination',certainty:'common oxide-state rule',summary:'The model forms the common metal oxide for the configured oxidation state.',conditions:['oxygen','energy input may be required']});
      }

      const water=unique.find(s=>s.formula==='H2O'), reactiveMetal=unique.find(s=>['Li','Na','K','Ca','Ba'].includes(s.metal));
      if(water&&reactiveMetal){
        const cation=preferredCation(reactiveMetal.metal), hydroxide=combineIons(cation,'OH');
        return reactionResult([reactiveMetal.formula,'H2O'],[hydroxide,'H2'],{family:'Metal–water displacement',certainty:'activity-series rule',summary:'A sufficiently active metal displaces hydrogen from water to form a hydroxide and hydrogen.',conditions:['hydrogen gas','often strongly exothermic']});
      }

      const elementalHalogen=unique.find(s=>s.halogen), halideSalt=unique.find(s=>s.ionic&&['F','Cl','Br','I'].includes(s.ionic.anion));
      if(elementalHalogen&&halideSalt){
        const incoming=elementalHalogen.halogen, outgoing=halideSalt.ionic.anion;
        if(HALOGEN_ACTIVITY.indexOf(incoming)>=HALOGEN_ACTIVITY.indexOf(outgoing)) return {supported:false,reason:`${incoming}2 is not more reactive than ${outgoing}2 in the simplified halogen activity series.`};
        const newSalt=combineIons(halideSalt.ionic.cation,incoming);
        return reactionResult([elementalHalogen.formula,halideSalt.formula],[newSalt,`${outgoing}2`],{family:'Halogen displacement',certainty:'halogen activity-series rule',summary:'A more reactive halogen displaces a less reactive halide from its salt.',conditions:['redox reaction']});
      }

      const elementalMetal=unique.find(s=>s.metal), salt=unique.find(s=>s.ionic&&s.ionic.cation!=='NH4');
      if(elementalMetal&&salt){
        const displacedSymbol=CATIONS[salt.ionic.cation]?.formula;
        if(!displacedSymbol||activityIndex(elementalMetal.metal)>=activityIndex(displacedSymbol)) return {supported:false,reason:'The incoming metal is not above the salt metal in the simplified activity series.'};
        const incomingCation=preferredCation(elementalMetal.metal); if(!incomingCation)return {supported:false,reason:'No preferred ionic state is configured for the incoming metal.'};
        const newSalt=combineIons(incomingCation,salt.ionic.anion);
        return reactionResult([elementalMetal.formula,salt.formula],[newSalt,displacedSymbol],{family:'Single displacement',certainty:'metal activity-series rule',summary:'A more active metal displaces a less active metal from an ionic compound.',conditions:['redox reaction','usually aqueous']});
      }

      const ionic=unique.filter(s=>s.ionic);
      if(ionic.length===2){
        const [a,b]=ionic;
        const p1=combineIons(a.ionic.cation,b.ionic.anion), p2=combineIons(b.ionic.cation,a.ionic.anion);
        if(formulaSetKey([p1,p2])===formulaSetKey([a.formula,b.formula])) return {supported:false,reason:'Ion exchange would reproduce the same compounds, so no net reaction is predicted.'};
        const sol1=solubility(a.ionic.cation,b.ionic.anion), sol2=solubility(b.ionic.cation,a.ionic.anion);
        if(sol1==='insoluble'||sol2==='insoluble') return reactionResult([a.formula,b.formula],[p1,p2],{family:'Double displacement / precipitation',certainty:'solubility-rule prediction',summary:'The ions exchange partners and at least one predicted product is insoluble under standard introductory solubility rules.',conditions:['aqueous solution',`${sol1==='insoluble'?p1:p2} precipitates`]});
        return {supported:false,reason:'The predicted ion-exchange products remain soluble, so no net ionic reaction is expected under the introductory solubility rules.'};
      }
    }

    if(unique.length===1){
      const s=unique[0];
      if(s.ionic?.anion==='CO3' && !['Li','Na','K'].includes(s.ionic.cation)){
        const oxide=combineIons(s.ionic.cation,'O');
        return reactionResult([s.formula],[oxide,'CO2'],{family:'Thermal decomposition',certainty:'carbonate decomposition rule',summary:'Many non-alkali metal carbonates decompose on heating to a metal oxide and carbon dioxide.',conditions:['strong heating']});
      }
      if(s.ionic?.anion==='HCO3'){
        const carbonate=combineIons(s.ionic.cation,'CO3');
        return reactionResult([s.formula],[carbonate,'CO2','H2O'],{family:'Thermal decomposition',certainty:'hydrogen-carbonate decomposition rule',summary:'A metal hydrogen carbonate decomposes to a carbonate, carbon dioxide, and water.',conditions:['heating']});
      }
      if(s.ionic?.anion==='ClO3'){
        const chloride=combineIons(s.ionic.cation,'Cl');
        return reactionResult([s.formula],[chloride,'O2'],{family:'Thermal decomposition',certainty:'chlorate decomposition rule',summary:'A metal chlorate decomposes to the corresponding chloride and oxygen.',conditions:['energy input','oxygen release']});
      }
      if(s.ionic?.anion==='OH'&&!['Li','Na','K','Ba'].includes(s.ionic.cation)){
        const oxide=combineIons(s.ionic.cation,'O');
        return reactionResult([s.formula],[oxide,'H2O'],{family:'Thermal decomposition',certainty:'metal-hydroxide decomposition rule',summary:'Many insoluble metal hydroxides decompose on heating to the metal oxide and water.',conditions:['heating']});
      }
    }

    return {supported:false,reason:'No deterministic rule in the current general-chemistry library uniquely predicts products for these reactants. Conditions or a reaction database/model are required; the app will not invent products.'};
  }

  function splitEquation(text) {
    const parts=String(text||'').trim().split(/\s*(?:->|→|=)\s*/);
    if(parts.length!==2) throw new Error('Use one arrow, for example: C2H6 + O2 -> CO2 + H2O');
    const splitSide=s=>s.split(/\s+\+\s+/).map(x=>x.trim()).filter(Boolean);
    const reactants=splitSide(parts[0]), products=splitSide(parts[1]);
    if(!reactants.length||!products.length) throw new Error('Both sides of the equation need at least one formula.');
    return {reactants,products};
  }

  function runSelfTests() {
    const results=[];
    function test(name,fn){try{fn();results.push({name,ok:true});}catch(error){results.push({name,ok:false,error:error.message});}}
    function expectStatus(name,atoms,bonds,status){const v=validateGraph(atoms,bonds);if(v.status!==status)throw new Error(`${name}: expected ${status}, received ${v.status}: ${v.errors[0]||v.warnings[0]||'no detail'}`);return v;}

    test('Formula parser handles parentheses',()=>{const p=parseFormula('Al2(SO4)3');if(p.counts.Al!==2||p.counts.S!==3||p.counts.O!==12)throw new Error('Wrong counts');});
    test('Water equation balances',()=>{const r=balanceEquation(['H2','O2'],['H2O']);if(equationPlain(r)!=='2H2 + O2 → 2H2O')throw new Error(equationPlain(r));});
    test('Ethane combustion balances',()=>{const r=balanceEquation(['C2H6','O2'],['CO2','H2O']);if(equationPlain(r)!=='2C2H6 + 7O2 → 4CO2 + 6H2O')throw new Error(equationPlain(r));});
    test('Neutralization predicts salt and water',()=>{const r=predictReaction(['HCl','NaOH']);if(!r.supported||r.equation!=='HCl + NaOH → NaCl + H2O')throw new Error(r.reason||r.equation);});
    test('Precipitation rule predicts AgCl',()=>{const r=predictReaction(['AgNO3','NaCl']);if(!r.supported||!r.products.includes('AgCl'))throw new Error(r.reason||'Missing AgCl');});

    test('Neutral water is a valid closed-shell structure',()=>{
      expectStatus('water',[{id:1,symbol:'O',charge:0},{id:2,symbol:'H',charge:0},{id:3,symbol:'H',charge:0}],[{a:1,b:2,type:'single',order:1},{a:1,b:3,type:'single',order:1}],'valid');
    });
    test('Oxide with two O–H bonds is rejected',()=>{
      expectStatus('bad oxide-water hybrid',[{id:1,symbol:'O',charge:-2},{id:2,symbol:'H',charge:0},{id:3,symbol:'H',charge:0}],[{a:1,b:2,type:'single',order:1},{a:1,b:3,type:'single',order:1}],'invalid');
    });
    test('Hydroxide has one O–H bond and charge −1',()=>{
      expectStatus('hydroxide',[{id:1,symbol:'O',charge:-1},{id:2,symbol:'H',charge:0}],[{a:1,b:2,type:'single',order:1}],'valid');
    });
    test('Oxide ion has charge −2 and zero covalent bonds',()=>{
      expectStatus('oxide',[{id:1,symbol:'O',charge:-2}],[],'valid');
    });
    test('Sn(OH)2 ionic/covalent graph is valid',()=>{
      expectStatus('tin(II) hydroxide',[
        {id:1,symbol:'Sn',charge:2},{id:2,symbol:'O',charge:-1},{id:3,symbol:'H',charge:0},{id:4,symbol:'O',charge:-1},{id:5,symbol:'H',charge:0}
      ],[
        {a:1,b:2,type:'ionic',order:0},{a:2,b:3,type:'single',order:1},{a:1,b:4,type:'ionic',order:0},{a:4,b:5,type:'single',order:1}
      ],'valid');
    });
    test('Bare Mn–Sn bond is outside the generic model',()=>{
      expectStatus('metal-metal',[{id:1,symbol:'Mn',charge:0},{id:2,symbol:'Sn',charge:0}],[{a:1,b:2,type:'single',order:1}],'unsupported');
    });
    test('He–Ne bond is rejected',()=>{
      expectStatus('noble gases',[{id:1,symbol:'He',charge:0},{id:2,symbol:'Ne',charge:0}],[{a:1,b:2,type:'single',order:1}],'invalid');
    });
    test('NaCl ionic graph is valid',()=>{
      expectStatus('sodium chloride',[{id:1,symbol:'Na',charge:1},{id:2,symbol:'Cl',charge:-1}],[{a:1,b:2,type:'ionic',order:0}],'valid');
    });
    test('Arbitrary aromatic edge is rejected',()=>{
      expectStatus('aromatic edge',[{id:1,symbol:'C',charge:0},{id:2,symbol:'C',charge:0}],[{a:1,b:2,type:'aromatic',order:1.5}],'invalid');
    });
    test('Water oxygen cannot be changed to oxide charge',()=>{
      const atoms=[{id:1,symbol:'O',charge:0},{id:2,symbol:'H',charge:0},{id:3,symbol:'H',charge:0}],bonds=[{a:1,b:2,type:'single',order:1},{a:1,b:3,type:'single',order:1}];
      const r=canSetAtomCharge(atoms,bonds,1,-2);if(r.ok)throw new Error('Invalid charge change was accepted');
    });
    test('Organometallic bonding is unsupported, not falsely invalid',()=>{
      expectStatus('organomercury',[{id:1,symbol:'C',charge:0},{id:2,symbol:'Hg',charge:0},{id:3,symbol:'H',charge:0},{id:4,symbol:'H',charge:0},{id:5,symbol:'H',charge:0}],[{a:1,b:2,type:'single',order:1},{a:1,b:3,type:'single',order:1},{a:1,b:4,type:'single',order:1},{a:1,b:5,type:'single',order:1}],'unsupported');
    });
    test('Unknown elements are unsupported without crashing',()=>{
      expectStatus('unknown element',[{id:1,symbol:'Xx',charge:0}],[],'unsupported');
    });
    test('Charge-separated perchlorate Lewis state is supported',()=>{
      expectStatus('perchlorate',[{id:1,symbol:'Cl',charge:3},{id:2,symbol:'O',charge:-1},{id:3,symbol:'O',charge:-1},{id:4,symbol:'O',charge:-1},{id:5,symbol:'O',charge:0},{id:6,symbol:'H',charge:0}],[{a:1,b:2,type:'single',order:1},{a:1,b:3,type:'single',order:1},{a:1,b:4,type:'single',order:1},{a:1,b:5,type:'single',order:1},{a:5,b:6,type:'single',order:1}],'valid');
    });
    return results;
  }

  return {
    ELEMENTS,BOND_TYPES,CATIONS,ANIONS,ACIDS,KNOWN_NAMES,
    parseFormula,hillFormula,formulaWithCharge,molarMass,empiricalFormula,countSignature,compositionKey,knownName,
    graphCounts,graphCharge,graphFormula,supportedChargeValues,validateGraph,canSetAtomCharge,canApplyBond,connectedComponents,identifyGraph,areGraphsIsomorphic,degreeOfUnsaturation,toMolfile,
    balanceEquation,equationPlain,combineIons,inferIonicCompound,classifySpecies,solubility,predictReaction,splitEquation,runSelfTests,
    _internals:{Fraction,nullspaceBasis,findPositiveNullVector,IONIC_COMPOUNDS,EXACT_REACTIONS}
  };
});

(function (root, factory) {
  const api = factory();
  root.ChemistryLibrary = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  let nextId = 1;
  function atom(symbol, x, y, charge = 0) { return { id:nextId++, symbol, x, y, charge }; }
  function make(key, name, formula, atomDefs, bondDefs, category='General') {
    nextId = 1;
    const atoms = atomDefs.map(d => atom(d[0],d[1],d[2],d[3]||0));
    const bonds = bondDefs.map(d => ({ a:atoms[d[0]].id, b:atoms[d[1]].id, type:d[2]||'single', order:d[2]==='double'?2:d[2]==='triple'?3:d[2]==='aromatic'?1.5:d[2]==='ionic'?0:1 }));
    return {key,name,formula,atoms,bonds,category};
  }

  function withHydrogens(key,name,formula,heavyDefs,heavyBondDefs,category='Organic') {
    nextId=1;
    const atoms=heavyDefs.map(d=>atom(d[0],d[1],d[2],d[3]||0));
    const bonds=heavyBondDefs.map(d=>({a:atoms[d[0]].id,b:atoms[d[1]].id,type:d[2]||'single',order:d[2]==='double'?2:d[2]==='triple'?3:d[2]==='aromatic'?1.5:1}));
    const target={C:4,N:3,O:2,S:2,P:3,B:3,Si:4};
    const heavyCount=atoms.length;
    for(let i=0;i<heavyCount;i++){
      const a=atoms[i]; if(!target[a.symbol])continue;
      const used=bonds.filter(b=>b.a===a.id||b.b===a.id).reduce((s,b)=>s+b.order,0);
      const count=Math.max(0,Math.round(target[a.symbol]-used));
      const connected=bonds.filter(b=>b.a===a.id||b.b===a.id).map(b=>atoms.find(x=>x.id===(b.a===a.id?b.b:b.a))).filter(Boolean);
      let baseAngle=-Math.PI/2;
      if(connected.length){
        const vx=connected.reduce((s,n)=>s+(n.x-a.x),0), vy=connected.reduce((s,n)=>s+(n.y-a.y),0);
        baseAngle=Math.atan2(-vy,-vx);
      }
      const spread=count===1?0:Math.min(Math.PI*1.35,Math.PI/2+count*Math.PI/5);
      for(let h=0;h<count;h++){
        const angle=baseAngle+(count===1?0:(h/(count-1)-.5)*spread);
        const distance=68;
        const ha=atom('H',a.x+Math.cos(angle)*distance,a.y+Math.sin(angle)*distance,0);
        atoms.push(ha); bonds.push({a:a.id,b:ha.id,type:'single',order:1});
      }
    }
    return {key,name,formula,atoms,bonds,category};
  }

  const MOLECULES = {};
  function add(m){MOLECULES[m.key]=m;return m;}

  add(make('H2','Hydrogen','H2',[['H',-50,0],['H',50,0]],[[0,1,'single']],'Elemental molecules'));
  add(make('O2','Oxygen','O2',[['O',-55,0],['O',55,0]],[[0,1,'double']],'Elemental molecules'));
  add(make('N2','Nitrogen','N2',[['N',-58,0],['N',58,0]],[[0,1,'triple']],'Elemental molecules'));
  add(make('F2','Fluorine','F2',[['F',-52,0],['F',52,0]],[[0,1,'single']],'Elemental molecules'));
  add(make('Cl2','Chlorine','Cl2',[['Cl',-58,0],['Cl',58,0]],[[0,1,'single']],'Elemental molecules'));
  add(make('Br2','Bromine','Br2',[['Br',-60,0],['Br',60,0]],[[0,1,'single']],'Elemental molecules'));
  add(make('I2','Iodine','I2',[['I',-62,0],['I',62,0]],[[0,1,'single']],'Elemental molecules'));

  add(withHydrogens('H2O','Water','H2O',[['O',0,0]],[],'Inorganic molecules'));
  add(make('H2O2','Hydrogen peroxide','H2O2',[['O',-42,0],['O',42,0],['H',-105,48],['H',105,48]],[[0,1,'single'],[0,2,'single'],[1,3,'single']],'Inorganic molecules'));
  add(withHydrogens('NH3','Ammonia','NH3',[['N',0,0]],[],'Inorganic molecules'));
  add(withHydrogens('CH4','Methane','CH4',[['C',0,0]],[],'Organic molecules'));
  add(make('CO2','Carbon dioxide','CO2',[['O',-92,0],['C',0,0],['O',92,0]],[[0,1,'double'],[1,2,'double']],'Inorganic molecules'));
  add(make('CO','Carbon monoxide','CO',[['C',-52,0,-1],['O',52,0,1]],[[0,1,'triple']],'Inorganic molecules'));
  add(make('O3','Ozone','O3',[['O',-78,35,-1],['O',0,-15,1],['O',78,35,0]],[[0,1,'single'],[1,2,'double']],'Inorganic molecules'));
  add(make('HCl','Hydrogen chloride','HCl',[['H',-52,0],['Cl',52,0]],[[0,1,'single']],'Acids and bases'));
  add(make('HF','Hydrogen fluoride','HF',[['H',-50,0],['F',50,0]],[[0,1,'single']],'Acids and bases'));
  add(make('HBr','Hydrogen bromide','HBr',[['H',-55,0],['Br',55,0]],[[0,1,'single']],'Acids and bases'));
  add(make('HI','Hydrogen iodide','HI',[['H',-58,0],['I',58,0]],[[0,1,'single']],'Acids and bases'));
  add(withHydrogens('H2S','Hydrogen sulfide','H2S',[['S',0,0]],[],'Inorganic molecules'));
  add(make('SO2','Sulfur dioxide','SO2',[['S',0,0],['O',-82,42],['O',82,42]],[[0,1,'double'],[0,2,'double']],'Inorganic molecules'));
  add(make('SO3','Sulfur trioxide','SO3',[['S',0,0],['O',0,-92],['O',-82,48],['O',82,48]],[[0,1,'double'],[0,2,'double'],[0,3,'double']],'Inorganic molecules'));
  add(make('NO','Nitric oxide','NO',[['N',-52,0],['O',52,0]],[[0,1,'double']],'Radicals and resonance'));
  add(make('NO2','Nitrogen dioxide','NO2',[['N',0,0,1],['O',-82,42,-1],['O',82,42]],[[0,1,'single'],[0,2,'double']],'Radicals and resonance'));
  add(make('N2O','Nitrous oxide','N2O',[['N',-90,0],['N',0,0,1],['O',90,0,-1]],[[0,1,'triple'],[1,2,'single']],'Radicals and resonance'));

  add(withHydrogens('C2H6','Ethane','C2H6',[['C',-48,0],['C',48,0]],[[0,1,'single']],'Organic molecules'));
  add(withHydrogens('C2H4','Ethene','C2H4',[['C',-52,0],['C',52,0]],[[0,1,'double']],'Organic molecules'));
  add(withHydrogens('C2H2','Ethyne','C2H2',[['C',-55,0],['C',55,0]],[[0,1,'triple']],'Organic molecules'));
  add(withHydrogens('C3H8','Propane','C3H8',[['C',-95,25],['C',0,-10],['C',95,25]],[[0,1,'single'],[1,2,'single']],'Organic molecules'));
  add(withHydrogens('C4H10','Butane','C4H10',[['C',-135,25],['C',-45,-15],['C',45,25],['C',135,-15]],[[0,1,'single'],[1,2,'single'],[2,3,'single']],'Organic molecules'));
  add(withHydrogens('CH3OH','Methanol','CH3OH',[['C',-45,0],['O',45,0]],[[0,1,'single']],'Organic molecules'));
  add(withHydrogens('C2H5OH','Ethanol','C2H5OH',[['C',-90,20],['C',0,-10],['O',90,20]],[[0,1,'single'],[1,2,'single']],'Organic molecules'));
  add(withHydrogens('CH2O','Methanal','CH2O',[['C',-35,0],['O',55,0]],[[0,1,'double']],'Organic molecules'));
  add(withHydrogens('CH3COOH','Ethanoic acid','CH3COOH',[['C',-105,15],['C',-20,-5],['O',55,-62],['O',72,45]],[[0,1,'single'],[1,2,'double'],[1,3,'single']],'Organic molecules'));

  const benzeneHeavy=[];
  for(let i=0;i<6;i++){const a=-Math.PI/2+i*Math.PI/3;benzeneHeavy.push(['C',Math.cos(a)*92,Math.sin(a)*92]);}
  const benzeneBonds=[];
  for(let i=0;i<6;i++)benzeneBonds.push([i,(i+1)%6,i%2===0?'double':'single']);
  add(withHydrogens('C6H6','Benzene','C6H6',benzeneHeavy,benzeneBonds,'Organic molecules'));

  add(make('NaCl','Sodium chloride','NaCl',[['Na',-58,0,1],['Cl',58,0,-1]],[[0,1,'ionic']],'Ionic compounds'));
  add(make('CaCl2','Calcium chloride','CaCl2',[['Ca',0,0,2],['Cl',-95,20,-1],['Cl',95,20,-1]],[[0,1,'ionic'],[0,2,'ionic']],'Ionic compounds'));
  add(make('MgO','Magnesium oxide','MgO',[['Mg',-58,0,2],['O',58,0,-2]],[[0,1,'ionic']],'Ionic compounds'));
  add(make('SnOH2','Tin(II) hydroxide','Sn(OH)2',[['Sn',0,-10,2],['O',-90,18,-1],['H',-158,54,0],['O',90,18,-1],['H',158,54,0]],[[0,1,'ionic'],[1,2,'single'],[0,3,'ionic'],[3,4,'single']],'Ionic compounds'));

  const VISIBLE_PRESETS = [
    'H2O','CO2','CH4','NH3','O2','N2','H2O2','O3','C2H6','C2H4','C2H2','CH3OH','C2H5OH','CH3COOH','C6H6','SO2','NaCl','CaCl2','SnOH2'
  ];

  const QUICK_SPECIES = [
    {formula:'O2',name:'Oxygen'}, {formula:'H2',name:'Hydrogen'}, {formula:'H2O',name:'Water'}, {formula:'CH4',name:'Methane'},
    {formula:'C2H6',name:'Ethane'}, {formula:'C2H5OH',name:'Ethanol'}, {formula:'HCl',name:'Hydrochloric acid'}, {formula:'NaOH',name:'Sodium hydroxide'},
    {formula:'AgNO3',name:'Silver nitrate'}, {formula:'NaCl',name:'Sodium chloride'}, {formula:'CaCO3',name:'Calcium carbonate'}, {formula:'NaHCO3',name:'Sodium hydrogen carbonate'},
    {formula:'Zn',name:'Zinc'}, {formula:'Cl2',name:'Chlorine'}, {formula:'KBr',name:'Potassium bromide'}, {formula:'KClO3',name:'Potassium chlorate'}
  ];

  return {MOLECULES,VISIBLE_PRESETS,QUICK_SPECIES};
});


export const ChemistryEngine = globalThis.ChemistryEngine;
export const ChemistryLibrary = globalThis.ChemistryLibrary;
