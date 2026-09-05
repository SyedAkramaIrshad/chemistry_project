export const ELECTROCHEMISTRY_CONSTANTS = Object.freeze({
  gasConstantJMolK: 8.31446261815324,
  faradayConstantCMol: 96485.33212331001,
  standardTemperatureK: 298.15,
  potentialSourceId: 'iupacStandardPotentialsAqueous',
  faradaySourceId: 'nistCodata2022',
});

export const ELECTROCHEMICAL_COUPLES = Object.freeze([
  Object.freeze({
    id:'ag', name:'Silver', symbol:'Ag', ionLabel:'Ag⁺', ionPlain:'Ag+', metalLabel:'Ag(s)',
    electronNumber:1, standardPotentialV:0.7996, molarMassGmol:107.8682,
    reductionEquation:'Ag⁺(aq) + e⁻ → Ag(s)', electrodeColor:'#d9e0e7', electrolyteColor:'#d8ecf6', accent:'#eef5fb',
    sourceId:'iupacStandardPotentialsAqueous', boundary:'Approximate 298.15 K standard electrode potential versus SHE; it does not predict silver deposition conditions, nucleation, morphology, or rate.',
  }),
  Object.freeze({
    id:'cu', name:'Copper', symbol:'Cu', ionLabel:'Cu²⁺', ionPlain:'Cu2+', metalLabel:'Cu(s)',
    electronNumber:2, standardPotentialV:0.3400, molarMassGmol:63.546,
    reductionEquation:'Cu²⁺(aq) + 2e⁻ → Cu(s)', electrodeColor:'#d67b45', electrolyteColor:'#4ca8de', accent:'#f3aa76',
    sourceId:'iupacStandardPotentialsAqueous', boundary:'Approximate 298.15 K standard electrode potential versus SHE; it does not predict copper deposition conditions, corrosion, passivation, morphology, or rate.',
  }),
  Object.freeze({
    id:'ni', name:'Nickel', symbol:'Ni', ionLabel:'Ni²⁺', ionPlain:'Ni2+', metalLabel:'Ni(s)',
    electronNumber:2, standardPotentialV:-0.257, molarMassGmol:58.6934,
    reductionEquation:'Ni²⁺(aq) + 2e⁻ → Ni(s)', electrodeColor:'#aeb8ad', electrolyteColor:'#74c9a5', accent:'#9ed8ba',
    sourceId:'iupacStandardPotentialsAqueous', boundary:'Approximate 298.15 K standard electrode potential versus SHE; real nickel electrochemistry depends strongly on speciation, surface state, overpotential, and transport.',
  }),
  Object.freeze({
    id:'fe', name:'Iron', symbol:'Fe', ionLabel:'Fe²⁺', ionPlain:'Fe2+', metalLabel:'Fe(s)',
    electronNumber:2, standardPotentialV:-0.447, molarMassGmol:55.845,
    reductionEquation:'Fe²⁺(aq) + 2e⁻ → Fe(s)', electrodeColor:'#78838d', electrolyteColor:'#a9c9a6', accent:'#b3bcb5',
    sourceId:'iupacStandardPotentialsAqueous', boundary:'Approximate 298.15 K standard electrode potential versus SHE; it does not predict corrosion, rust, passivation, dissolved oxygen effects, or rate.',
  }),
  Object.freeze({
    id:'zn', name:'Zinc', symbol:'Zn', ionLabel:'Zn²⁺', ionPlain:'Zn2+', metalLabel:'Zn(s)',
    electronNumber:2, standardPotentialV:-0.7626, molarMassGmol:65.38,
    reductionEquation:'Zn²⁺(aq) + 2e⁻ → Zn(s)', electrodeColor:'#a8b1b9', electrolyteColor:'#c9e4eb', accent:'#ccd4dc',
    sourceId:'iupacStandardPotentialsAqueous', boundary:'Approximate 298.15 K standard electrode potential versus SHE; it does not predict zinc corrosion, passivation, dendrites, hydrogen evolution, or rate.',
  }),
  Object.freeze({
    id:'mg', name:'Magnesium', symbol:'Mg', ionLabel:'Mg²⁺', ionPlain:'Mg2+', metalLabel:'Mg(s)',
    electronNumber:2, standardPotentialV:-2.372, molarMassGmol:24.305,
    reductionEquation:'Mg²⁺(aq) + 2e⁻ → Mg(s)', electrodeColor:'#d5d7d9', electrolyteColor:'#d9e5ef', accent:'#e8ecf0',
    sourceId:'iupacStandardPotentialsAqueous', boundary:'Approximate 298.15 K standard electrode potential versus SHE. Aqueous magnesium deposition is not certified because solvent reduction and kinetic effects are outside this model.',
  }),
]);

export const ELECTROCHEMICAL_DATA_NOTE = 'Approximate standard electrode potentials at 298.15 K versus the standard hydrogen electrode. These thermodynamic reference values are not loaded voltages, corrosion rates, or deposition instructions.';

export function electrochemicalCoupleById(id) {
  return ELECTROCHEMICAL_COUPLES.find((couple)=>couple.id===id)??null;
}

