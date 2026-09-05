import {
  ELECTROCHEMISTRY_CONSTANTS,
  electrochemicalCoupleById,
} from '../data/electrochemicalCouples.js';

const POTENTIAL_TOLERANCE=1e-12;
const ORIENTATIONS=Object.freeze(['left-oxidizes','right-oxidizes']);

function finiteNumber(value,label){
  const number=Number(value);
  if(!Number.isFinite(number))throw new TypeError(`${label} must be a finite number.`);
  return number;
}

function positiveNumber(value,label){
  const number=finiteNumber(value,label);
  if(number<=0)throw new RangeError(`${label} must be greater than zero.`);
  return number;
}

function integerAtLeast(value,minimum,label){
  const number=finiteNumber(value,label);
  if(!Number.isInteger(number)||number<minimum)throw new RangeError(`${label} must be an integer of at least ${minimum}.`);
  return number;
}

function coupleOrThrow(id,label){
  const couple=electrochemicalCoupleById(id);
  if(!couple)throw new RangeError(`Unknown ${label} electrochemical couple: ${id}.`);
  return couple;
}

function gcd(left,right){
  let a=Math.abs(left),b=Math.abs(right);
  while(b){[a,b]=[b,a%b];}
  return a;
}

function lcm(left,right){
  return Math.abs(left*right)/gcd(left,right);
}

function sideOpposite(side){
  return side==='left'?'right':'left';
}

function directionFrom(side){
  return side==='left'?'left-to-right':'right-to-left';
}

function coefficientPrefix(value){
  return value===1?'':String(value);
}

function ionTerm(couple,coefficient=1){
  return `${coefficientPrefix(coefficient)}${couple.ionLabel}(aq)`;
}

function metalTerm(couple,coefficient=1){
  return `${coefficientPrefix(coefficient)}${couple.metalLabel}`;
}

function electronTerm(electronNumber){
  return `${coefficientPrefix(electronNumber)}e⁻`;
}

function exponentText(value){
  const superscripts={'2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶'};
  return value===1?'':superscripts[String(value)]??`^${value}`;
}

function activityExpression(couple,scale){
  return `a(${couple.ionLabel})${exponentText(scale)}`;
}

function halfCellPotential({couple,activity,temperatureK}){
  const {gasConstantJMolK,faradayConstantCMol}=ELECTROCHEMISTRY_CONSTANTS;
  return couple.standardPotentialV+gasConstantJMolK*temperatureK/(couple.electronNumber*faradayConstantCMol)*Math.log(activity);
}

function freezeDimension({correct,learner,expected,reason}){
  return Object.freeze({correct,learner,expected,reason});
}

function orientedReaction({anode,cathode,anodeSide,cathodeSide,anodeActivity,cathodeActivity,temperatureK,leftPotentialV,rightPotentialV}){
  const {gasConstantJMolK,faradayConstantCMol}=ELECTROCHEMISTRY_CONSTANTS;
  const electronNumber=lcm(anode.electronNumber,cathode.electronNumber);
  const anodeScale=electronNumber/anode.electronNumber;
  const cathodeScale=electronNumber/cathode.electronNumber;
  const standardCellPotentialV=cathode.standardPotentialV-anode.standardPotentialV;
  const reactionQuotient=anodeActivity**anodeScale/cathodeActivity**cathodeScale;
  const nernstCorrectionV=gasConstantJMolK*temperatureK/(electronNumber*faradayConstantCMol)*Math.log(reactionQuotient);
  const cellPotentialV=standardCellPotentialV-nernstCorrectionV;
  const potentialFromHalfCellsV=(cathodeSide==='right'?rightPotentialV:leftPotentialV)-(anodeSide==='right'?rightPotentialV:leftPotentialV);
  const oxidationEquation=`${metalTerm(anode,anodeScale)} → ${ionTerm(anode,anodeScale)} + ${electronTerm(electronNumber)}`;
  const reductionEquation=`${ionTerm(cathode,cathodeScale)} + ${electronTerm(electronNumber)} → ${metalTerm(cathode,cathodeScale)}`;
  const overallEquation=`${metalTerm(anode,anodeScale)} + ${ionTerm(cathode,cathodeScale)} → ${ionTerm(anode,anodeScale)} + ${metalTerm(cathode,cathodeScale)}`;
  const reactionQuotientExpression=`${activityExpression(anode,anodeScale)} / ${activityExpression(cathode,cathodeScale)}`;
  const standardDeltaGJmol=-electronNumber*faradayConstantCMol*standardCellPotentialV;
  const deltaGJmol=-electronNumber*faradayConstantCMol*cellPotentialV;
  const log10StandardEquilibriumConstant=electronNumber*faradayConstantCMol*standardCellPotentialV/(Math.log(10)*gasConstantJMolK*temperatureK);
  return Object.freeze({
    anode,cathode,anodeSide,cathodeSide,anodeScale,cathodeScale,electronNumber,
    standardCellPotentialV,reactionQuotient,reactionQuotientExpression,nernstCorrectionV,
    cellPotentialV,potentialFromHalfCellsV,standardDeltaGJmol,deltaGJmol,log10StandardEquilibriumConstant,
    oxidationEquation,reductionEquation,overallEquation,
    electronDirection:directionFrom(anodeSide),cationDestination:cathodeSide,anionDestination:anodeSide,
    spontaneousAsWritten:cellPotentialV>POTENTIAL_TOLERANCE,
    equilibriumAsWritten:Math.abs(cellPotentialV)<=POTENTIAL_TOLERANCE,
    requiresExternalEnergy:cellPotentialV<-POTENTIAL_TOLERANCE,
    cellNotation:`${anode.metalLabel} | ${anode.ionLabel}(aq, a=${anodeActivity.toPrecision(3)}) || ${cathode.ionLabel}(aq, a=${cathodeActivity.toPrecision(3)}) | ${cathode.metalLabel}`,
  });
}

export function analyzeElectrochemicalCell({leftCoupleId,rightCoupleId,leftActivity=1,rightActivity=1,temperatureK=298.15,orientation='left-oxidizes'}){
  const left=coupleOrThrow(leftCoupleId,'left');
  const right=coupleOrThrow(rightCoupleId,'right');
  if(left.id===right.id)throw new RangeError('Choose two different half-cell couples; the same couple on both sides has no declared composition difference in this model.');
  const activityLeft=positiveNumber(leftActivity,'Left ion activity');
  const activityRight=positiveNumber(rightActivity,'Right ion activity');
  const temperature=positiveNumber(temperatureK,'Temperature');
  if(!ORIENTATIONS.includes(orientation))throw new RangeError('Orientation must be left-oxidizes or right-oxidizes.');
  const leftPotentialV=halfCellPotential({couple:left,activity:activityLeft,temperatureK:temperature});
  const rightPotentialV=halfCellPotential({couple:right,activity:activityRight,temperatureK:temperature});
  const selectedAnodeSide=orientation==='left-oxidizes'?'left':'right';
  const selectedCathodeSide=sideOpposite(selectedAnodeSide);
  const selectedAnode=selectedAnodeSide==='left'?left:right;
  const selectedCathode=selectedCathodeSide==='left'?left:right;
  const selected=orientedReaction({
    anode:selectedAnode,cathode:selectedCathode,anodeSide:selectedAnodeSide,cathodeSide:selectedCathodeSide,
    anodeActivity:selectedAnodeSide==='left'?activityLeft:activityRight,
    cathodeActivity:selectedCathodeSide==='left'?activityLeft:activityRight,
    temperatureK:temperature,leftPotentialV,rightPotentialV,
  });

  let spontaneousAnodeSide=null;
  if(leftPotentialV<rightPotentialV-POTENTIAL_TOLERANCE)spontaneousAnodeSide='left';
  else if(rightPotentialV<leftPotentialV-POTENTIAL_TOLERANCE)spontaneousAnodeSide='right';
  const spontaneous=spontaneousAnodeSide===null
    ? Object.freeze({anodeSide:null,cathodeSide:null,electronDirection:null,cationDestination:null,anionDestination:null,cellPotentialV:0,label:'Equilibrium potential match'})
    : (()=>{
      const cathodeSide=sideOpposite(spontaneousAnodeSide);
      const oriented=orientedReaction({
        anode:spontaneousAnodeSide==='left'?left:right,
        cathode:cathodeSide==='left'?left:right,
        anodeSide:spontaneousAnodeSide,cathodeSide,
        anodeActivity:spontaneousAnodeSide==='left'?activityLeft:activityRight,
        cathodeActivity:cathodeSide==='left'?activityLeft:activityRight,
        temperatureK:temperature,leftPotentialV,rightPotentialV,
      });
      return Object.freeze({
        anodeSide:spontaneousAnodeSide,cathodeSide,electronDirection:oriented.electronDirection,
        cationDestination:oriented.cationDestination,anionDestination:oriented.anionDestination,
        cellPotentialV:oriented.cellPotentialV,label:`${spontaneousAnodeSide==='left'?left.name:right.name} oxidizes; ${cathodeSide==='left'?left.name:right.name} reduces`,
      });
    })();

  return Object.freeze({
    status:'valid',
    input:Object.freeze({leftCoupleId:left.id,rightCoupleId:right.id,leftActivity:activityLeft,rightActivity:activityRight,temperatureK:temperature,orientation}),
    left:Object.freeze({couple:left,activity:activityLeft,equilibriumPotentialV:leftPotentialV}),
    right:Object.freeze({couple:right,activity:activityRight,equilibriumPotentialV:rightPotentialV}),
    selected,
    spontaneous,
    electronNumber:selected.electronNumber,
    standardCellPotentialV:selected.standardCellPotentialV,
    cellPotentialV:selected.cellPotentialV,
    reactionQuotient:selected.reactionQuotient,
    reactionQuotientExpression:selected.reactionQuotientExpression,
    nernstCorrectionV:selected.nernstCorrectionV,
    standardDeltaGJmol:selected.standardDeltaGJmol,
    deltaGJmol:selected.deltaGJmol,
    log10StandardEquilibriumConstant:selected.log10StandardEquilibriumConstant,
    oxidationEquation:selected.oxidationEquation,
    reductionEquation:selected.reductionEquation,
    overallEquation:selected.overallEquation,
    cellNotation:selected.cellNotation,
    resultKind:'Equilibrium/open-circuit activity model — not loaded cell performance',
    boundary:'No current, resistance, overpotential, kinetics, mass transport, junction potential, side reaction, or battery capacity is calculated.',
  });
}

export function evaluateCircuitPrediction({analysis,predictedAnodeSide,predictedElectronDirection,predictedCationDestination,predictedAnionDestination}){
  if(!analysis?.spontaneous)throw new TypeError('A valid electrochemical-cell analysis is required.');
  const expected=analysis.spontaneous;
  const leftName=analysis.left.couple.name,rightName=analysis.right.couple.name;
  const anodeName=expected.anodeSide==='left'?leftName:rightName;
  const cathodeName=expected.cathodeSide==='left'?leftName:rightName;
  const prediction=Object.freeze({predictedAnodeSide,predictedElectronDirection,predictedCationDestination,predictedAnionDestination});
  if(expected.anodeSide===null){
    const dimensions=Object.freeze({
      anode:freezeDimension({correct:false,learner:predictedAnodeSide,expected:null,reason:'The two equilibrium reduction potentials match within the model tolerance, so no spontaneous anode is assigned.'}),
      electrons:freezeDimension({correct:false,learner:predictedElectronDirection,expected:null,reason:'No spontaneous external electron direction is assigned at the matched equilibrium potentials.'}),
      cations:freezeDimension({correct:false,learner:predictedCationDestination,expected:null,reason:'No simple spontaneous salt-bridge direction is assigned at the matched equilibrium potentials.'}),
      anions:freezeDimension({correct:false,learner:predictedAnionDestination,expected:null,reason:'No simple spontaneous salt-bridge direction is assigned at the matched equilibrium potentials.'}),
    });
    return Object.freeze({correct:false,prediction,dimensions,summary:'The selected activities place these half-cells at the same equilibrium reduction potential.'});
  }
  const dimensions=Object.freeze({
    anode:freezeDimension({
      correct:predictedAnodeSide===expected.anodeSide,learner:predictedAnodeSide,expected:expected.anodeSide,
      reason:predictedAnodeSide===expected.anodeSide
        ? `${anodeName} is the anode because oxidation occurs on the ${expected.anodeSide}.`
        : `You chose ${predictedAnodeSide??'no side'}. ${anodeName} on the ${expected.anodeSide} has the lower equilibrium reduction potential here, so it is oxidized at the anode.`,
    }),
    electrons:freezeDimension({
      correct:predictedElectronDirection===expected.electronDirection,learner:predictedElectronDirection,expected:expected.electronDirection,
      reason:predictedElectronDirection===expected.electronDirection
        ? `Electrons leave the ${anodeName} anode and travel ${expected.electronDirection.replaceAll('-',' ')} toward the ${cathodeName} cathode.`
        : `Electrons are produced by oxidation at the ${anodeName} anode, so the external direction is ${expected.electronDirection.replaceAll('-',' ')}, not ${(predictedElectronDirection??'unselected').replaceAll?.('-',' ')??predictedElectronDirection}.`,
    }),
    cations:freezeDimension({
      correct:predictedCationDestination===expected.cationDestination,learner:predictedCationDestination,expected:expected.cationDestination,
      reason:predictedCationDestination===expected.cationDestination
        ? `Bridge cations migrate toward the ${expected.cationDestination} cathode compartment as ${cathodeName} ions are consumed in this simple model.`
        : `Metal-ion reduction consumes positive charge in the ${expected.cationDestination} cathode compartment, so bridge cations migrate there, not to ${predictedCationDestination??'an unselected side'}.`,
    }),
    anions:freezeDimension({
      correct:predictedAnionDestination===expected.anionDestination,learner:predictedAnionDestination,expected:expected.anionDestination,
      reason:predictedAnionDestination===expected.anionDestination
        ? `Bridge anions migrate toward the ${expected.anionDestination} anode compartment as ${anodeName} oxidation creates metal cations.`
        : `${anodeName} oxidation creates positive ions in the ${expected.anionDestination} anode compartment, so bridge anions migrate there, not to ${predictedAnionDestination??'an unselected side'}.`,
    }),
  });
  const correct=Object.values(dimensions).every((dimension)=>dimension.correct);
  return Object.freeze({
    correct,prediction,dimensions,
    summary:correct?'All four directions match the spontaneous simple-cell model.':'Your four choices remain visible. Compare each one with where oxidation and reduction occur.',
  });
}

export function createCellPotentialTrace({leftCoupleId,rightCoupleId,temperatureK=298.15,orientation='left-oxidizes',pointCount=81}){
  const left=coupleOrThrow(leftCoupleId,'left');
  const right=coupleOrThrow(rightCoupleId,'right');
  if(left.id===right.id)throw new RangeError('Choose two different half-cell couples for a potential trace.');
  const temperature=positiveNumber(temperatureK,'Temperature');
  if(!ORIENTATIONS.includes(orientation))throw new RangeError('Orientation must be left-oxidizes or right-oxidizes.');
  const pointsRequested=integerAtLeast(pointCount,3,'Point count');
  const anode=orientation==='left-oxidizes'?left:right;
  const cathode=orientation==='left-oxidizes'?right:left;
  const electronNumber=lcm(anode.electronNumber,cathode.electronNumber);
  const standardCellPotentialV=cathode.standardPotentialV-anode.standardPotentialV;
  const {gasConstantJMolK,faradayConstantCMol}=ELECTROCHEMISTRY_CONSTANTS;
  const points=Array.from({length:pointsRequested},(_,index)=>{
    const log10ReactionQuotient=-8+16*index/(pointsRequested-1);
    const cellPotentialV=standardCellPotentialV-gasConstantJMolK*temperature/(electronNumber*faradayConstantCMol)*Math.log(10)*log10ReactionQuotient;
    return Object.freeze({log10ReactionQuotient,cellPotentialV});
  });
  return Object.freeze({
    left,right,orientation,temperatureK:temperature,electronNumber,standardCellPotentialV,
    zeroPotentialLog10Q:standardCellPotentialV*electronNumber*faradayConstantCMol/(gasConstantJMolK*temperature*Math.log(10)),
    points:Object.freeze(points),
  });
}

function currentEfficiencyFraction(value){
  const efficiency=finiteNumber(value,'Current efficiency');
  if(efficiency<0||efficiency>1)throw new RangeError('Current efficiency must stay between zero and one.');
  return efficiency;
}

export function analyzeElectrolysis({coupleId='cu',currentA=2,timeSeconds=1800,currentEfficiency=1}){
  const couple=coupleOrThrow(coupleId,'deposition');
  const current=positiveNumber(currentA,'Current');
  const duration=positiveNumber(timeSeconds,'Time');
  const efficiency=currentEfficiencyFraction(currentEfficiency);
  const {faradayConstantCMol}=ELECTROCHEMISTRY_CONSTANTS;
  const chargeC=current*duration;
  const electronAmountMol=chargeC/faradayConstantCMol;
  const idealDepositAmountMol=electronAmountMol/couple.electronNumber;
  const idealMassG=idealDepositAmountMol*couple.molarMassGmol;
  const expectedDepositAmountMol=idealDepositAmountMol*efficiency;
  const expectedMassG=idealMassG*efficiency;
  const unassignedMassEquivalentG=idealMassG-expectedMassG;
  return Object.freeze({
    couple,
    input:Object.freeze({coupleId:couple.id,currentA:current,timeSeconds:duration,currentEfficiency:efficiency}),
    chargeC,electronAmountMol,idealDepositAmountMol,idealMassG,
    expectedDepositAmountMol,expectedMassG,unassignedMassEquivalentG,
    electronNumber:couple.electronNumber,
    molarMassGmol:couple.molarMassGmol,
    resultKind:'Ideal constant-current Faraday ledger with learner-defined current efficiency',
    equation:'m = M I t ε / (zF)',
    boundary:'The selected metal deposition is assumed to be the declared partial reaction. Product selection, competing reactions, electrode area, current density, overpotential, transport, morphology, and operational procedure are not calculated.',
  });
}

export function evaluateElectrolysisPrediction({analysis,predictedMassG,toleranceFraction=.03}){
  if(!analysis?.couple||!Number.isFinite(analysis.expectedMassG))throw new TypeError('A valid electrolysis analysis is required.');
  const predicted=finiteNumber(predictedMassG,'Predicted mass');
  if(predicted<0)throw new RangeError('Predicted mass cannot be negative.');
  const tolerance=positiveNumber(toleranceFraction,'Tolerance fraction');
  if(tolerance>1)throw new RangeError('Tolerance fraction cannot exceed one.');
  const differenceG=predicted-analysis.expectedMassG;
  const relativeError=differenceG/analysis.expectedMassG;
  const correct=Math.abs(relativeError)<=tolerance;
  const classification=correct?'within-tolerance':differenceG<0?'low':'high';
  const reason=correct
    ? `Your ${predicted.toFixed(4)} g prediction is within ${(tolerance*100).toFixed(1)}% of the ${analysis.expectedMassG.toFixed(4)} g efficiency-adjusted Faraday result.`
    : differenceG<0
      ? `Your prediction is lower than the efficiency-adjusted result. Follow the charge ledger: I × t gives charge, Q/F gives moles of electrons, division by z gives ideal metal amount, then current efficiency scales the mass.`
      : `Your prediction is higher than the efficiency-adjusted result. The selected ${analysis.couple.ionLabel} reduction needs ${analysis.electronNumber} electrons per deposited atom, and only ${(analysis.input.currentEfficiency*100).toFixed(1)}% of charge was assigned to this product.`;
  return Object.freeze({
    correct,classification,predictedMassG:predicted,expectedMassG:analysis.expectedMassG,
    differenceG,relativeError,toleranceFraction:tolerance,reason,
  });
}

export function createDepositionTrace({coupleId='cu',currentA=2,timeSeconds=1800,currentEfficiency=1,pointCount=41}){
  const analysis=analyzeElectrolysis({coupleId,currentA,timeSeconds,currentEfficiency});
  const pointsRequested=integerAtLeast(pointCount,2,'Point count');
  const points=Array.from({length:pointsRequested},(_,index)=>{
    const fraction=index/(pointsRequested-1);
    return Object.freeze({
      fraction,
      timeSeconds:analysis.input.timeSeconds*fraction,
      chargeC:analysis.chargeC*fraction,
      idealMassG:analysis.idealMassG*fraction,
      expectedMassG:analysis.expectedMassG*fraction,
    });
  });
  return Object.freeze({analysis,points:Object.freeze(points)});
}

export const ELECTROCHEMICAL_MODEL_BOUNDARY=Object.freeze({
  includes:Object.freeze(['Six declared metal/metal-ion couples','Electron-number balancing','Activity-based Nernst equilibrium potential','Selected and spontaneous cell direction','Standard ΔrG and K links','Qualitative simple-cell electron and salt-bridge direction','Ideal constant-current Faraday mass ledger','Learner-defined current efficiency']),
  excludes:Object.freeze(['Cell current and power','Loaded voltage and internal resistance','Electrode kinetics and overpotential','Mass transport and double layers','Liquid-junction potential','Side reactions, speciation, and precipitation','Electrolysis product selection and morphology','Corrosion and passivation','Battery capacity, cycling, and safety']),
});
