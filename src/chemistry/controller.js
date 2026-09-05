(function () {
  'use strict';
  const E = window.ChemistryEngine;
  const L = window.ChemistryLibrary;
  if (!E || !L) throw new Error('Chemistry engine failed to load.');

  const state = {
    atoms: [], bonds: [], nextId: 1, selectedAtomId: null, selectedBondKey: null,
    pendingBondAtomId: null, bondType: 'single', showLewisElectrons: true,
    bondDrag: null, guideOverride: null, history: [], reactants: [], activity: [],
    mission: { active: false }
  };

  const $ = id => document.getElementById(id);
  const workspace = $('workspace');
  const atomLayer = $('atomLayer');
  const bondLayer = $('bondLayer');
  const emptyState = $('emptyState');
  const inspector = $('inspector');
  const validationList = $('validationList');
  const toast = $('toast');
  const reactionResult = $('reactionResult');

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }

  function formulaHtml(formula) {
    const clean = escapeHtml(formula || '');
    const caret = clean.indexOf('^');
    const base = caret >= 0 ? clean.slice(0,caret) : clean;
    const charge = caret >= 0 ? clean.slice(caret+1) : '';
    return base.replace(/(\d+)/g,'<sub>$1</sub>') + (charge ? `<sup>${charge}</sup>` : '');
  }

  function displayCharge(charge) {
    charge = Number(charge || 0);
    if (!charge) return '0';
    return `${Math.abs(charge) === 1 ? '' : Math.abs(charge)}${charge > 0 ? '+' : '−'}`;
  }

  function showToast(message, kind = '') {
    toast.textContent = message;
    toast.className = `toast show ${kind}`.trim();
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => { toast.className = 'toast'; }, 2800);
  }

  function snapshot() {
    return JSON.stringify({atoms:state.atoms,bonds:state.bonds,nextId:state.nextId});
  }
  function pushHistory(data) {
    state.history.push(data);
    if (state.history.length > 70) state.history.shift();
  }
  function saveHistory() { pushHistory(snapshot()); }

  function getAtom(id) { return state.atoms.find(a => a.id === id); }
  function getBond(a,b) { return state.bonds.find(x => (x.a===a&&x.b===b)||(x.a===b&&x.b===a)); }
  function bondKey(a,b) { return [Number(a),Number(b)].sort((x,y)=>x-y).join(':'); }
  function getSelectedBond() { return state.bonds.find(b=>bondKey(b.a,b.b)===state.selectedBondKey) || null; }
  function currentGraph() { return {atoms:state.atoms,bonds:state.bonds}; }
  function currentValidation() { return E.validateGraph(state.atoms,state.bonds); }
  function currentIdentity() { return E.identifyGraph(currentGraph(),L.MOLECULES); }


  function bondLabel(type) {
    return type === 'auto' ? 'Auto bond' : (E.BOND_TYPES[type]?.label || type);
  }

  function describeBond(bond) {
    if(!bond)return 'bond';
    const a=getAtom(bond.a),b=getAtom(bond.b);
    return `${a?.symbol||'?'}–${b?.symbol||'?'} ${String(E.BOND_TYPES[bond.type]?.label||bond.type||'bond').toLowerCase()} bond`;
  }

  function renderActivity() {
    const log=$('experimentLog');if(!log)return;
    if(!state.activity.length){log.innerHTML='<div class="trace-empty">Load the challenge or edit the canvas to begin your notebook.</div>';return;}
    log.innerHTML=state.activity.map(entry=>`
      <article class="trace-entry ${escapeHtml(entry.kind)}">
        <i aria-hidden="true">${entry.kind==='blocked'?'×':entry.kind==='break'?'↯':entry.kind==='bond'?'↗':entry.kind==='undo'?'↶':'•'}</i>
        <div><span>${escapeHtml(entry.label)}</span><strong>${escapeHtml(entry.title)}</strong><p>${escapeHtml(entry.detail)}</p></div>
      </article>`).join('');
  }

  function recordActivity(kind,title,detail,label='Graph event') {
    state.activity.unshift({kind,title,detail,label});
    state.activity=state.activity.slice(0,8);
    renderActivity();
  }

  function remainingBondCapacity(atom, atomState) {
    if (!atom || !atomState || atomState.state === 'invalid' || atomState.state === 'unsupported') return 0;
    const current = Number(atomState.covalentOrder || 0);
    const allowed = (atomState.allowed || []).slice().sort((a,b)=>a-b);
    if (allowed.some(v => Math.abs(v-current) < 1e-9)) return 0;
    const next = allowed.find(v => v > current + 1e-9);
    if (next == null) return 0;
    return Math.max(0, Math.min(4, Math.ceil(next-current-1e-9)));
  }

  function availableInteractionSites(atom, atomState) {
    if(!atom||!atomState||atomState.state==='invalid'||atomState.state==='unsupported')return 0;
    const el=E.ELEMENTS[atom.symbol];
    if(el?.category==='noble gas')return 0;
    const ionicMode=state.bondType==='ionic'||state.bondType==='auto';
    if(el?.metal)return ionicMode?1:0;
    const covalent=remainingBondCapacity(atom,atomState);
    if(Number(atom.charge||0)<0&&ionicMode&&covalent===0)return 1;
    return covalent;
  }

  function atomStateDeficit(atomState) {
    if (!atomState || atomState.state === 'invalid' || atomState.state === 'unsupported' || atomState.state === 'satisfied') return 0;
    const current = Number(atomState.covalentOrder || 0);
    const next = (atomState.allowed || []).slice().sort((a,b)=>a-b).find(v => v > current + 1e-9);
    return next == null ? 8 : Math.max(0,next-current);
  }

  function explainBondFailure(aId,bId,fallback='That bond is not supported.') {
    const a=getAtom(aId),b=getAtom(bId);
    if(!a||!b)return fallback;
    const ea=E.ELEMENTS[a.symbol],eb=E.ELEMENTS[b.symbol];
    if(ea?.category==='noble gas'&&eb?.category==='noble gas'){
      if(new Set([a.symbol,b.symbol]).has('He')&&new Set([a.symbol,b.symbol]).has('Ne')){
        return 'Helium has a full 2-electron shell and neon has a full 8-electron shell. A stable He–Ne molecule is not expected under ordinary conditions, so no normal bond is available.';
      }
      return `${ea.name} and ${eb.name} have filled valence shells. This introductory model does not permit a normal stable bond between them.`;
    }
    if(ea?.category==='noble gas'||eb?.category==='noble gas'){
      const noble=ea.category==='noble gas'?ea:eb;
      return `${noble.name} has a filled valence shell and no ordinary bonding site in this model.`;
    }
    return fallback;
  }

  function resolveBondRequest(aId,bId,requestedType=state.bondType) {
    if(requestedType!=='auto'){
      const check=E.canApplyBond(state.atoms,state.bonds,aId,bId,requestedType);
      return {...check,type:requestedType,automatic:false};
    }
    const a=getAtom(aId),b=getAtom(bId);
    if(!a||!b)return {ok:false,type:null,automatic:true,reason:'Atom not found.'};
    const ea=E.ELEMENTS[a.symbol],eb=E.ELEMENTS[b.symbol];
    if(ea?.category==='noble gas'||eb?.category==='noble gas'){
      return {ok:false,type:null,automatic:true,reason:explainBondFailure(aId,bId)};
    }
    if(ea?.metal&&eb?.metal){
      return {ok:false,type:null,automatic:true,reason:`A bare ${a.symbol}–${b.symbol} bond is not a generic Lewis bond. Intermetallic structures require compound-specific crystal data, so strict mode blocks it.`};
    }
    if((ea?.metal&&!eb?.metal)||(eb?.metal&&!ea?.metal)){
      const ionic=E.canApplyBond(state.atoms,state.bonds,aId,bId,'ionic');
      return ionic.ok?{...ionic,type:'ionic',automatic:true}:{...ionic,type:null,automatic:true};
    }
    const trialTypes=['single','double','triple'];
    const candidates=[];
    let firstReason='No supported bond order fits both atoms.';
    for(const type of trialTypes){
      const check=E.canApplyBond(state.atoms,state.bonds,aId,bId,type);
      if(!check.ok){if(firstReason==='No supported bond order fits both atoms.')firstReason=check.reason;continue;}
      const pair=check.validation.atomStates.filter(x=>x.atomId===aId||x.atomId===bId);
      const satisfied=pair.filter(x=>x.state==='satisfied').length;
      const deficit=pair.reduce((sum,x)=>sum+atomStateDeficit(x),0);
      const order=E.BOND_TYPES[type].order;
      candidates.push({...check,type,automatic:true,score:satisfied*100-deficit*18-order*.01});
    }
    if(!candidates.length)return {ok:false,type:null,automatic:true,reason:explainBondFailure(aId,bId,firstReason)};
    candidates.sort((x,y)=>y.score-x.score);
    return candidates[0];
  }

  function setGuide(title,text,kind='info') { state.guideOverride={title,text,kind}; }
  function clearGuide() { state.guideOverride=null; }

  function componentFormula(componentIds) {
    const ids=new Set(componentIds);
    return E.graphFormula(state.atoms.filter(a=>ids.has(a.id)));
  }

  function renderGuide(validation) {
    const guide=$('bondGuide');if(!guide)return;
    let data=state.guideOverride;
    if(!data){
      const sourceId=state.bondDrag?.sourceId||state.pendingBondAtomId;
      if(!state.atoms.length){
        data={kind:'info',title:'Add or select an atom',text:'Glowing dots are permitted interaction sites. Strict mode hides or blocks chemically unsupported connections.'};
      }else if(sourceId){
        const atom=getAtom(sourceId),el=atom&&E.ELEMENTS[atom.symbol];
        data=el?.metal
          ? {kind:'ready',title:`Ionic interaction from ${atom.symbol}`,text:'Release on a green compatible nonmetal. Bare metal–metal and generic metal covalent bonds are blocked.'}
          : {kind:'ready',title:`Connecting from ${atom?.symbol||'atom'}`,text:`Release on a green atom. ${bondLabel(state.bondType)} mode is active.`};
      }else if(state.selectedAtomId){
        const atom=getAtom(state.selectedAtomId),el=atom&&E.ELEMENTS[atom.symbol];
        const atomState=validation.atomStates.find(x=>x.atomId===state.selectedAtomId);
        const capacity=availableInteractionSites(atom,atomState);
        if(atomState?.state==='invalid')data={kind:'error',title:`${el?.name||'Atom'}: rejected state`,text:atomState.detail||'Remove the invalid bond or choose a compatible charge.'};
        else if(atomState?.state==='unsupported')data={kind:'closed',title:`${el?.name||'Atom'}: outside current model`,text:atomState.detail||'This interaction needs compound-specific chemistry data.'};
        else if(el?.category==='noble gas')data={kind:'closed',title:`${el.name}: full valence shell`,text:`${atom.symbol==='He'?'2':'8'} valence electrons are already paired. No ordinary bond handle is shown.`};
        else if(el?.metal&&capacity>0)data={kind:'ready',title:`${el.name}: ionic-only interaction`,text:'Drag the site to a supported nonmetal. Strict mode assigns or checks a common positive ion charge; metal–metal bonds are not guessed.'};
        else if(el?.metal)data={kind:'closed',title:`${el.name}: covalent mode unavailable`,text:'Choose Ionic for supported common salts. Coordination and intermetallic chemistry require compound-specific data.'};
        else if(Number(atom?.charge||0)<0&&capacity>0&&(state.bondType==='auto'||state.bondType==='ionic'))data={kind:'ready',title:`${el.name}: anionic interaction site`,text:'Drag to a compatible positive metal ion. Existing covalent bonds and formal charge must remain electron-consistent.'};
        else if(capacity>0)data={kind:'ready',title:`${el.name}: ${capacity} covalent site${capacity===1?'':'s'}`,text:`Drag a glowing green dot to another compatible nonmetal. ${bondLabel(state.bondType)} mode will be tested exactly as chosen.`};
        else data={kind:'closed',title:`${el?.name||'Atom'}: current state complete`,text:'No permitted interaction is available in the selected mode. Change the structure only through a supported charge or bond state.'};
      }else{
        const onlyNeutralNoble=state.atoms.every(a=>E.ELEMENTS[a.symbol].category==='noble gas'&&!Number(a.charge||0));
        data=onlyNeutralNoble
          ? {kind:'closed',title:'These atoms have filled shells',text:'Neutral helium and neon cannot form a normal stable bond. Try H + H, O + H, or a metal + halogen.'}
          : {kind:'info',title:'Select an atom or drag a permitted site',text:'Dark dots are nonbonding electrons. Green sites are shown only where the strict model can evaluate the attempted interaction.'};
      }
    }
    const iconClass=data.kind==='ready'?'ready':data.kind==='error'?'error':data.kind==='closed'?'closed':'';
    const icon=data.kind==='error'?'×':data.kind==='closed'?'✓':data.kind==='ready'?'2':'1';
    guide.innerHTML=`<div class="guide-icon ${iconClass}">${icon}</div><div class="guide-copy"><strong>${escapeHtml(data.title)}</strong><span>${escapeHtml(data.text)}</span></div><div class="guide-legend" aria-hidden="true"><span><i class="legend-electron"></i> nonbonding electron</span><span><i class="legend-site"></i> permitted site</span><span><i class="legend-closed"></i> blocked / complete</span></div>`;
  }

  function addAtom(symbol,x,y,record=true) {
    if (!E.ELEMENTS[symbol]) return;
    if (record) saveHistory();
    const rect = workspace.getBoundingClientRect();
    const px = Number.isFinite(x) ? x : rect.width/2 + (Math.random()-.5)*100;
    const py = Number.isFinite(y) ? y : rect.height/2 + (Math.random()-.5)*100;
    const atom = {id:state.nextId++,symbol,charge:0,x:Math.max(58,Math.min(rect.width-58,px)),y:Math.max(58,Math.min(rect.height-58,py))};
    state.atoms.push(atom);state.selectedAtomId=atom.id;state.selectedBondKey=null;state.pendingBondAtomId=null;state.bondDrag=null;clearGuide();
    recordActivity('setup',`${symbol} atom placed`,'The atom was added without creating or repairing any bond.','Manual edit');
    render();
  }

  function removeAtom(id) {
    const removedAtom=getAtom(id);if (!removedAtom) return;
    saveHistory();state.atoms=state.atoms.filter(a=>a.id!==id);state.bonds=state.bonds.filter(b=>b.a!==id&&b.b!==id);
    if(state.selectedAtomId===id)state.selectedAtomId=null;if(state.pendingBondAtomId===id)state.pendingBondAtomId=null;
    const removedSymbol=removedAtom.symbol;state.selectedBondKey=null;state.bondDrag=null;clearGuide();
    recordActivity('break',`${removedSymbol} atom removed`,'Deleting an atom also removes its connected bonds. Use bond breaking when you want every atom to remain.','Manual edit');
    render();
  }

  function removeBond(a,b) {
    const removed=getBond(a,b);if (!removed) return;
    const description=describeBond(removed);
    saveHistory();state.bonds=state.bonds.filter(x=>!((x.a===a&&x.b===b)||(x.a===b&&x.b===a)));
    state.selectedBondKey=null;state.pendingBondAtomId=null;state.bondDrag=null;
    const validation=currentValidation();
    setGuide('Bond broken',`${description} was removed. Both atoms remain on the canvas; open valences are now visible.`,'ready');
    recordActivity('break',`Broke ${description}`,`Both atoms were preserved. The graph is now ${validation.status}; inspect the open sites before making another bond.`,'Learner action');
    render();showToast('Bond broken. Both atoms remain.','good');
  }

  function selectBond(a,b) {
    const bond=getBond(a,b);if(!bond)return;
    state.selectedBondKey=bondKey(a,b);state.selectedAtomId=null;state.pendingBondAtomId=null;state.bondDrag=null;
    setGuide('Bond selected',`${describeBond(bond)} is selected. Choose “Break selected bond” or press Delete. No atom will be removed.`,'ready');
    render();
  }

  function breakSelectedBond() {
    const bond=getSelectedBond();
    if(!bond){showToast('Select a bond first.');return;}
    removeBond(bond.a,bond.b);
  }

  function connectAtoms(aId,bId) {
    const resolution=resolveBondRequest(aId,bId,state.bondType);
    if(!resolution.ok){
      const message=explainBondFailure(aId,bId,resolution.reason);
      const a=getAtom(aId),b=getAtom(bId);
      state.pendingBondAtomId=null;state.bondDrag=null;state.selectedAtomId=aId;state.selectedBondKey=null;
      setGuide('Bond not allowed',message,'error');
      recordActivity('blocked',`${a?.symbol||'?'}–${b?.symbol||'?'} bond rejected`,`${message} The molecular graph was left unchanged.`,'Engine verdict');
      render();showToast(message,'error');return;
    }
    const actualType=resolution.type;saveHistory();
    if(resolution.chargeUpdates)state.atoms.forEach(a=>{if(resolution.chargeUpdates[a.id]!=null)a.charge=resolution.chargeUpdates[a.id];});
    const existing=getBond(aId,bId);
    if(existing){existing.type=actualType;existing.order=E.BOND_TYPES[actualType].order;}
    else state.bonds.push({a:aId,b:bId,type:actualType,order:E.BOND_TYPES[actualType].order});
    state.pendingBondAtomId=null;state.bondDrag=null;state.selectedAtomId=null;state.selectedBondKey=bondKey(aId,bId);
    const autoText=resolution.automatic?`Auto mode selected ${E.BOND_TYPES[actualType].label.toLowerCase()}.`:`${E.BOND_TYPES[actualType].label} applied.`;
    const created=getBond(aId,bId),validation=currentValidation();
    setGuide('Bond created',`${autoText} No other bond or atom was changed.`,'ready');
    recordActivity('bond',`Formed ${describeBond(created)}`,`The requested bond is permitted. The complete graph is now ${validation.status}; a permitted edit is not automatically a stable product.`,'Learner action');
    render();showToast(autoText,'good');
  }

  function selectAtom(id) {
    if(state.pendingBondAtomId&&state.pendingBondAtomId!==id){connectAtoms(state.pendingBondAtomId,id);return;}
    state.selectedAtomId=id;state.selectedBondKey=null;if(state.pendingBondAtomId===id)state.pendingBondAtomId=null;clearGuide();render();
  }

  function beginBondFromAtom(id,ev=null) {
    const atom=getAtom(id);if(!atom)return false;
    const validation=currentValidation(),atomState=validation.atomStates.find(x=>x.atomId===id);
    const sites=availableInteractionSites(atom,atomState);state.selectedAtomId=id;state.selectedBondKey=null;
    if(!sites){
      const el=E.ELEMENTS[atom.symbol];
      const message=el.category==='noble gas'
        ? `${el.name} has a filled valence shell, so it has no ordinary bonding electron to drag.`
        : el.metal
          ? `${el.name} cannot use a generic covalent bond in strict mode. Choose Ionic and connect it to a supported nonmetal ion.`
          : atomState?.state==='invalid'
            ? (atomState.detail||'Fix the rejected charge or bond state first.')
            : `${el.name}'s current Lewis state has no permitted interaction in this mode.`;
      state.pendingBondAtomId=null;state.bondDrag=null;setGuide('No permitted site',message,'error');render();showToast(message,'error');return false;
    }
    clearGuide();state.pendingBondAtomId=id;
    if(ev){ev.preventDefault();ev.stopPropagation();const rect=workspace.getBoundingClientRect();state.bondDrag={sourceId:id,x:ev.clientX-rect.left,y:ev.clientY-rect.top,startX:ev.clientX,startY:ev.clientY,moved:false};}
    render();if(!ev)showToast(`Connecting from ${atom.symbol}. Click a green target.`);return true;
  }

  function clearBondHover() {
    atomLayer.querySelectorAll('.atom-cluster.hover-target').forEach(node=>node.classList.remove('hover-target'));
  }

  function onBondPointerMove(ev) {
    if(!state.bondDrag)return;ev.preventDefault();
    const rect=workspace.getBoundingClientRect(),drag=state.bondDrag;
    drag.x=Math.max(0,Math.min(rect.width,ev.clientX-rect.left));drag.y=Math.max(0,Math.min(rect.height,ev.clientY-rect.top));
    if(Math.abs(ev.clientX-drag.startX)+Math.abs(ev.clientY-drag.startY)>5)drag.moved=true;
    clearBondHover();
    const hit=document.elementFromPoint(ev.clientX,ev.clientY),cluster=hit?.closest?.('.atom-cluster');
    if(cluster&&cluster.dataset.id!==String(drag.sourceId)&&cluster.dataset.compatible==='true')cluster.classList.add('hover-target');
    renderBonds();
  }

  function finishBondDrag(ev,cancelled=false) {
    const drag=state.bondDrag;if(!drag)return;const sourceId=drag.sourceId;let targetId=null;
    if(!cancelled){const hit=document.elementFromPoint(ev.clientX,ev.clientY);const cluster=hit?.closest?.('.atom-cluster');if(cluster)targetId=Number(cluster.dataset.id);}
    clearBondHover();state.bondDrag=null;
    if(targetId&&targetId!==sourceId){connectAtoms(sourceId,targetId);return;}
    if(!drag.moved&&!cancelled){state.pendingBondAtomId=sourceId;state.selectedAtomId=sourceId;clearGuide();render();showToast('Now click a green target atom.');return;}
    state.pendingBondAtomId=null;state.selectedAtomId=sourceId;setGuide('Bond gesture cancelled','Drag a glowing electron dot and release it directly on a green compatible atom.','info');render();
  }

  function sidePoint(side,offset=0,radius=45) {
    const angle=-Math.PI/2+side*Math.PI/2,tangentX=-Math.sin(angle),tangentY=Math.cos(angle);
    return {x:Math.cos(angle)*radius+tangentX*offset,y:Math.sin(angle)*radius+tangentY*offset};
  }

  function preferredSideOrder(atom) {
    const occupied=new Set();
    state.bonds.filter(b=>b.a===atom.id||b.b===atom.id).forEach(bond=>{
      const other=getAtom(bond.a===atom.id?bond.b:bond.a);if(!other)return;
      const angle=Math.atan2(other.y-atom.y,other.x-atom.x);let side=Math.round((angle+Math.PI/2)/(Math.PI/2))%4;if(side<0)side+=4;occupied.add(side);
    });
    const all=[0,1,2,3];return all.filter(x=>!occupied.has(x)).concat(all.filter(x=>occupied.has(x)));
  }

  function positionAroundAtom(element,side,offset=0,radius=45) {
    const p=sidePoint(side,offset,radius);element.style.left=`calc(50% + ${p.x}px)`;element.style.top=`calc(50% + ${p.y}px)`;
  }

  function renderAtoms(validation) {
    const stateById=new Map(validation.atomStates.map(s=>[s.atomId,s]));
    const sourceId=state.bondDrag?.sourceId||state.pendingBondAtomId;
    atomLayer.innerHTML='';
    for(const atom of state.atoms){
      const e=E.ELEMENTS[atom.symbol],atomState=stateById.get(atom.id);
      const covalentSites=remainingBondCapacity(atom,atomState),interactionSites=availableInteractionSites(atom,atomState);
      const cluster=document.createElement('div');cluster.className='atom-cluster';cluster.dataset.id=atom.id;cluster.style.left=`${atom.x}px`;cluster.style.top=`${atom.y}px`;
      if(state.selectedAtomId===atom.id)cluster.classList.add('selected');
      if(state.pendingBondAtomId===atom.id)cluster.classList.add('pending');
      if(interactionSites===0)cluster.classList.add('closed-shell');
      if(sourceId&&sourceId!==atom.id){
        const resolution=resolveBondRequest(sourceId,atom.id,state.bondType);
        cluster.classList.add(resolution.ok?'compatible':'incompatible');
        cluster.dataset.compatible=resolution.ok?'true':'false';
      }
      const ring=document.createElement('span');ring.className='valence-ring';cluster.appendChild(ring);
      const node=document.createElement('button');node.className='atom-node';
      if(atomState?.state==='invalid')node.classList.add('invalid');else if(atomState?.state==='open')node.classList.add('open');
      node.style.background=e.color;node.style.color=e.text;node.dataset.id=atom.id;
      node.innerHTML=`<span>${escapeHtml(atom.symbol)}</span>${atom.charge?`<span class="atom-charge">${displayCharge(atom.charge)}</span>`:''}`;
      if(atomState?.state==='invalid')node.title=`Rejected: ${atomState.detail||'invalid chemistry state'}`;
      else if(e.category==='noble gas')node.title=`${e.name}: filled valence shell; no ordinary bond under normal conditions.`;
      else if(e.metal&&interactionSites)node.title=`${e.name}: strict mode permits only evaluated ionic interactions in the builder.`;
      else if(interactionSites)node.title=`${e.name}: ${interactionSites} permitted interaction site${interactionSites===1?'':'s'}. Drag a glowing dot.`;
      else node.title=`${e.name}: no permitted interaction in the selected mode. Select the atom to inspect or delete it.`;
      node.addEventListener('click',ev=>{ev.stopPropagation();if(node._dragged)return;selectAtom(atom.id);});
      node.addEventListener('dblclick',ev=>{ev.stopPropagation();removeAtom(atom.id);});
      enableAtomDrag(node,cluster,atom);cluster.appendChild(node);

      const sideOrder=preferredSideOrder(atom),handleSides=sideOrder.slice(0,interactionSites);
      const nonbondingRaw=Number(atomState?.inferredNonbondingElectrons);
      const nonbonding=Number.isFinite(nonbondingRaw)?Math.max(0,Math.min(8,Math.round(nonbondingRaw))):0;
      const staticCount=e.metal?0:Math.max(0,Math.min(8,nonbonding-covalentSites));
      if(state.showLewisElectrons&&!e.metal){
        const staticSides=sideOrder.filter(x=>!handleSides.includes(x)).concat(handleSides);
        let remaining=staticCount,sideIndex=0;
        while(remaining>0&&sideIndex<staticSides.length){
          const side=staticSides[sideIndex++],count=remaining>=2?2:1;remaining-=count;
          (count===2?[-4.5,4.5]:[0]).forEach(offset=>{
            const dot=document.createElement('span');dot.className='electron-dot';
            if(count===1&&interactionSites===0&&atomState?.state==='open')dot.classList.add('radical');
            positionAroundAtom(dot,side,offset,44);cluster.appendChild(dot);
          });
        }
      }
      handleSides.forEach((side,index)=>{
        const handle=document.createElement('button');handle.className='bond-handle';
        const ionicVisual=state.bondType==='ionic'||e.metal||(Number(atom.charge||0)<0&&covalentSites===0);
        if(ionicVisual)handle.classList.add('ionic');
        handle.type='button';handle.setAttribute('aria-label',`Start permitted interaction from ${e.name}, site ${index+1}`);
        if(e.metal)handle.title='Drag to a compatible nonmetal. Strict mode permits ionic interactions only for generic metal atoms.';
        else if(state.bondType==='auto')handle.title='Drag to another atom; Auto mode chooses only a rule-supported interaction.';
        else handle.title=`Drag to attempt a ${bondLabel(state.bondType).toLowerCase()}.`;
        positionAroundAtom(handle,side,0,47);
        handle.addEventListener('pointerdown',ev=>beginBondFromAtom(atom.id,ev));
        handle.addEventListener('click',ev=>ev.stopPropagation());cluster.appendChild(handle);
      });
      if(e.category==='noble gas'){
        const badge=document.createElement('span');badge.className='closed-shell-badge';badge.textContent=atom.symbol==='He'?'2 e⁻ · full shell':'8 e⁻ · full shell';cluster.appendChild(badge);
      }
      atomLayer.appendChild(cluster);
    }
  }

  function enableAtomDrag(node,cluster,atom) {
    let dragging=false,moved=false,startX=0,startY=0,originX=0,originY=0,historySnapshot='';
    node.addEventListener('pointerdown',ev=>{dragging=true;moved=false;startX=ev.clientX;startY=ev.clientY;originX=atom.x;originY=atom.y;historySnapshot=snapshot();node.setPointerCapture(ev.pointerId);});
    node.addEventListener('pointermove',ev=>{if(!dragging)return;const dx=ev.clientX-startX,dy=ev.clientY-startY;if(Math.abs(dx)+Math.abs(dy)>4)moved=true;const rect=workspace.getBoundingClientRect();atom.x=Math.max(58,Math.min(rect.width-58,originX+dx));atom.y=Math.max(58,Math.min(rect.height-58,originY+dy));cluster.style.left=`${atom.x}px`;cluster.style.top=`${atom.y}px`;renderBonds();});
    node.addEventListener('pointerup',ev=>{if(!dragging)return;dragging=false;try{node.releasePointerCapture(ev.pointerId);}catch(_){}if(moved){node._dragged=true;setTimeout(()=>{node._dragged=false;},0);pushHistory(historySnapshot);state.pendingBondAtomId=null;state.bondDrag=null;state.selectedAtomId=atom.id;state.selectedBondKey=null;clearGuide();render();}});
  }

  function svgLine(x1,y1,x2,y2,attrs={}) {
    const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('x1',x1);line.setAttribute('y1',y1);line.setAttribute('x2',x2);line.setAttribute('y2',y2);Object.entries(attrs).forEach(([k,v])=>line.setAttribute(k,v));return line;
  }
  function svgCircle(cx,cy,r,attrs={}) {
    const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');circle.setAttribute('cx',cx);circle.setAttribute('cy',cy);circle.setAttribute('r',r);Object.entries(attrs).forEach(([k,v])=>circle.setAttribute(k,v));return circle;
  }
  function svgText(x,y,text,attrs={}) {
    const node=document.createElementNS('http://www.w3.org/2000/svg','text');node.setAttribute('x',x);node.setAttribute('y',y);node.textContent=text;Object.entries(attrs).forEach(([k,v])=>node.setAttribute(k,v));return node;
  }

  function renderBonds() {
    const w=workspace.clientWidth,h=workspace.clientHeight;bondLayer.setAttribute('viewBox',`0 0 ${w} ${h}`);bondLayer.innerHTML='';
    for(const bond of state.bonds){
      const a=getAtom(bond.a),b=getAtom(bond.b);if(!a||!b)continue;const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,nx=-uy,ny=ux,type=bond.type||'single';
      const selected=state.selectedBondKey===bondKey(bond.a,bond.b),visibleClass=`bond-visible${selected?' selected':''}`;
      const hit=svgLine(a.x,a.y,b.x,b.y,{class:`bond-hit${selected?' selected':''}`});hit.addEventListener('click',ev=>{ev.stopPropagation();selectBond(bond.a,bond.b);});bondLayer.appendChild(hit);
      if(type==='ionic'){bondLayer.appendChild(svgLine(a.x,a.y,b.x,b.y,{class:visibleClass,stroke:'#7b8ca2','stroke-width':'4','stroke-linecap':'round','stroke-dasharray':'4 10'}));continue;}
      const spacing=6,offsets=type==='double'?[-spacing/2,spacing/2]:type==='triple'?[-spacing,0,spacing]:type==='aromatic'?[-spacing/2,spacing/2]:[0];
      offsets.forEach((offset,index)=>{
        const attrs={class:visibleClass,stroke:'#8593a7','stroke-width':type==='aromatic'?'5':'7','stroke-linecap':'round'};if(type==='aromatic'&&index===1)attrs['stroke-dasharray']='9 7';
        bondLayer.appendChild(svgLine(a.x+nx*offset,a.y+ny*offset,b.x+nx*offset,b.y+ny*offset,attrs));
        if(state.showLewisElectrons){const mx=(a.x+b.x)/2+nx*offset,my=(a.y+b.y)/2+ny*offset;bondLayer.appendChild(svgCircle(mx-ux*4,my-uy*4,3,{class:'bond-electron'}));bondLayer.appendChild(svgCircle(mx+ux*4,my+uy*4,3,{class:'bond-electron'}));}
      });
    }
    if(state.bondDrag){const source=getAtom(state.bondDrag.sourceId);if(source){bondLayer.appendChild(svgLine(source.x,source.y,state.bondDrag.x,state.bondDrag.y,{class:'bond-preview'}));const mx=(source.x+state.bondDrag.x)/2,my=(source.y+state.bondDrag.y)/2-8;bondLayer.appendChild(svgText(mx,my,bondLabel(state.bondType),{class:'bond-preview-label','text-anchor':'middle'}));}}
    const breakButton=$('breakBondBtn');if(breakButton){breakButton.disabled=!getSelectedBond();breakButton.setAttribute('aria-disabled',String(breakButton.disabled));}
  }

  function renderInspector(validation) {
    const atom=getAtom(state.selectedAtomId);
    const selectedBond=getSelectedBond();
    if(!atom&&selectedBond){
      const a=getAtom(selectedBond.a),b=getAtom(selectedBond.b);
      const after=E.validateGraph(state.atoms,state.bonds.filter(item=>item!==selectedBond));
      inspector.innerHTML=`
        <div class="bond-inspector-mark" aria-hidden="true"><span>${escapeHtml(a?.symbol||'?')}</span><i></i><span>${escapeHtml(b?.symbol||'?')}</span></div>
        <div class="inspector-row"><span>Selected interaction</span><strong>${escapeHtml(describeBond(selectedBond))}</strong></div>
        <div class="inspector-row"><span>Bond order</span><strong>${selectedBond.order ?? E.BOND_TYPES[selectedBond.type]?.order ?? '—'}</strong></div>
        <div class="inspector-row"><span>Current graph</span><strong>${escapeHtml(validation.status)}</strong></div>
        <div class="inspector-row"><span>After breaking</span><strong>${escapeHtml(after.status)}</strong></div>
        <div class="inspector-callout warning"><strong>Atoms are conserved.</strong> Breaking this bond removes only the interaction. ${escapeHtml(a?.symbol||'The first atom')} and ${escapeHtml(b?.symbol||'the second atom')} remain available with their new open-valence states.</div>
        <button class="btn danger full" id="breakInspectedBond" type="button">Break this bond</button>
        <p class="helper-text">This is a manual graph edit, not a claim that the bond breaks spontaneously under real conditions.</p>`;
      $('breakInspectedBond').addEventListener('click',breakSelectedBond);return;
    }
    if(!atom){inspector.innerHTML='<p class="inspector-empty">Nothing selected. Click an atom or bond in the workspace.</p>';return;}
    const e=E.ELEMENTS[atom.symbol];
    const atomState=validation.atomStates.find(x=>x.atomId===atom.id);
    const neighborBonds=state.bonds.filter(b=>b.a===atom.id||b.b===atom.id);
    const sites=availableInteractionSites(atom,atomState);
    let shellText='condition-dependent';
    if(!e.metal){
      const shellValue=Number(atomState?.shellElectrons);
      const target=atom.symbol==='H'||atom.symbol==='He'?2:atom.symbol==='B'?'6–8':(e.atomicNumber<=10?8:null);
      shellText=target==null?'expanded / condition-dependent':`${Number.isFinite(shellValue)?Math.round(shellValue*10)/10:'—'} / ${target} e⁻`;
    }

    let callout='';
    if(atomState?.state==='invalid')callout=`<div class="inspector-callout error"><strong>Rejected chemistry state.</strong> ${escapeHtml(atomState.detail||validation.errors[0]||'Remove the invalid bond or select a compatible charge.')}</div>`;
    else if(e.category==='noble gas')callout=`<div class="inspector-callout closed"><strong>Closed shell.</strong> ${escapeHtml(e.name)} already has its stable ${atom.symbol==='He'?'duet':'octet'}. No ordinary bond handle is available.</div>`;
    else if(e.metal&&sites)callout=`<div class="inspector-callout ready"><strong>Ionic interaction available.</strong> Drag the purple site to a supported nonmetal. Generic covalent and metal–metal bonds are deliberately blocked.</div>`;
    else if(e.metal)callout='<div class="inspector-callout warning"><strong>Metal covalent mode is disabled.</strong> Choose Ionic for supported salts. Coordination and intermetallic structures need compound-specific data.</div>';
    else if(Number(atom.charge||0)<0&&sites&&(state.bondType==='auto'||state.bondType==='ionic'))callout=`<div class="inspector-callout ready"><strong>Anionic interaction available.</strong> Drag the purple site to a compatible metal cation. The existing Lewis structure must remain charge-consistent.</div>`;
    else if(sites)callout=`<div class="inspector-callout ready"><strong>${sites} permitted covalent site${sites===1?'':'s'}.</strong> Drag a glowing green dot. Current mode: ${escapeHtml(bondLabel(state.bondType))}.</div>`;
    else callout='<div class="inspector-callout warning"><strong>No permitted interaction in this mode.</strong> Remove or change an existing bond, or choose one of the explicitly supported charge states below.</div>';

    const currentCharge=Number(atom.charge||0);
    const chargeButtons=E.supportedChargeValues(atom.symbol).map(q=>{
      const check=E.canSetAtomCharge(state.atoms,state.bonds,atom.id,q);
      const active=q===currentCharge?' active':'';
      const disabled=!check.ok?' disabled':'';
      const title=escapeHtml(check.ok?`Set charge to ${displayCharge(q)}`:check.reason);
      return `<button class="charge-option${active}" data-set-charge="${q}"${disabled} title="${title}">${displayCharge(q)}</button>`;
    }).join('');
    const startLabel=e.metal?'Start ionic interaction':Number(atom.charge||0)<0&&remainingBondCapacity(atom,atomState)===0?'Start ionic interaction':`Start bond from ${escapeHtml(atom.symbol)}`;
    const valenceText=e.metal?'Ionic-only in generic builder':(atomState?.allowed?.join(' / ')||'0');

    inspector.innerHTML=`
      <div class="inspector-row"><span>Element</span><strong>${escapeHtml(e.name)} (${atom.symbol})</strong></div>
      <div class="inspector-row"><span>Atomic number</span><strong>${e.atomicNumber}</strong></div>
      <div class="inspector-row"><span>Atomic mass</span><strong>${e.mass}</strong></div>
      <div class="inspector-row"><span>Category</span><strong>${escapeHtml(e.category)}</strong></div>
      <div class="inspector-row"><span>Valence electrons</span><strong>${e.valenceElectrons}</strong></div>
      ${callout}
      ${sites?`<button class="btn secondary small full" id="startSelectedBond">${startLabel}</button>`:''}
      <p class="subhead" style="margin-top:14px">${e.metal?'Ionic charge':'Formal / ionic charge'}</p>
      <div class="charge-options" id="chargeOptions">${chargeButtons}</div>
      <p class="helper-text">Only explicitly modeled charge states are selectable. Formal charge and oxidation state are not interchangeable.</p>
      <div class="divider"></div>
      <div class="inspector-row"><span>Covalent bond order</span><strong>${atomState?.covalentOrder ?? 0}</strong></div>
      <div class="inspector-row"><span>Permitted state</span><strong>${escapeHtml(valenceText)}</strong></div>
      <div class="inspector-row"><span>Nonbonding electrons</span><strong>${atomState?.inferredNonbondingElectrons ?? '—'}</strong></div>
      <div class="inspector-row"><span>Lewis shell</span><strong>${shellText}</strong></div>
      <div class="inspector-row"><span>Status</span><strong>${escapeHtml(atomState?.state || 'unknown')}</strong></div>
      <p class="helper-text">${escapeHtml(atomState?.detail || '')}${e.flexible?' Advanced transition-metal electron counting is outside this generic Lewis builder.':''}</p>
      <div class="divider"></div>
      <p class="subhead">Connected interactions</p>
      <div class="bond-list" id="selectedBondList">${neighborBonds.length?'':'<p class="inspector-empty">No bonds connected.</p>'}</div>
      <button class="btn danger small full" id="deleteSelectedAtom" style="margin-top:12px">Delete atom</button>`;
    if(sites)$('startSelectedBond').addEventListener('click',()=>beginBondFromAtom(atom.id));
    inspector.querySelectorAll('[data-set-charge]').forEach(btn=>btn.addEventListener('click',()=>setSelectedCharge(Number(btn.dataset.setCharge))));
    $('deleteSelectedAtom').addEventListener('click',()=>removeAtom(atom.id));
    const list=$('selectedBondList');
    neighborBonds.forEach(bond=>{
      const other=getAtom(bond.a===atom.id?bond.b:bond.a),item=document.createElement('div');item.className='bond-item';
      item.innerHTML=`<span><strong>${escapeHtml(other?.symbol||'?')}</strong> · ${escapeHtml(E.BOND_TYPES[bond.type]?.label||bond.type)}</span><button title="Remove interaction">×</button>`;
      item.querySelector('button').addEventListener('click',()=>removeBond(bond.a,bond.b));list.appendChild(item);
    });
  }

  function setSelectedCharge(value) {
    const atom=getAtom(state.selectedAtomId);if(!atom)return;
    value=Number(value);if(value===Number(atom.charge||0))return;
    const check=E.canSetAtomCharge(state.atoms,state.bonds,atom.id,value);
    if(!check.ok){
      setGuide('Charge rejected',check.reason,'error');
      recordActivity('blocked',`${atom.symbol} charge change rejected`,`${check.reason} The graph was left unchanged.`,'Engine verdict');
      render();showToast(check.reason,'error');return;
    }
    saveHistory();atom.charge=value;state.pendingBondAtomId=null;state.bondDrag=null;state.selectedBondKey=null;clearGuide();
    recordActivity('charge',`${atom.symbol} charge set to ${displayCharge(value)}`,`The charge changed only because you selected it. Bond connectivity was preserved.`,'Learner action');
    render();showToast(`${E.ELEMENTS[atom.symbol].name} charge set to ${displayCharge(value)}.`,'good');
  }

  function renderValidation(validation) {
    validationList.innerHTML='';
    if(!state.atoms.length){validationList.innerHTML='<div class="validation-message good">Add atoms to start strict structural validation.</div>';return;}
    if(validation.errors.length){validation.errors.forEach(m=>{const d=document.createElement('div');d.className='validation-message error';d.textContent=m;validationList.appendChild(d);});}
    if((validation.unsupported||[]).length){validation.unsupported.forEach(m=>{const d=document.createElement('div');d.className='validation-message unsupported';d.textContent=m;validationList.appendChild(d);});}
    if(validation.status==='unsupported'){const d=document.createElement('div');d.className='validation-message unsupported';d.textContent='Outside the certified model. The app is not claiming that this real or proposed structure is valid or invalid.';validationList.appendChild(d);}
    if(validation.status==='open'){
      const d=document.createElement('div');d.className='validation-message warning';d.textContent='Not certified as a complete closed-shell structure. It may be a radical, electron-deficient intermediate, incomplete ionic ratio, or unfinished molecule.';validationList.appendChild(d);
    }
    validation.warnings.forEach(m=>{const d=document.createElement('div');d.className='validation-message warning';d.textContent=m;validationList.appendChild(d);});
    if(validation.status==='valid'&&!validation.warnings.length){const d=document.createElement('div');d.className='validation-message good';d.textContent='Certified by the implemented strict rules: charge, bond order, electron count, shell capacity, ionic polarity, and connectivity are consistent.';validationList.appendChild(d);}
  }

  function renderSummary(validation,identity) {
    const empty=!state.atoms.length,disconnected=!empty&&validation.components.length>1;
    const baseFormula=identity?.molecule?.formula||validation.formula||'—';
    const displayedFormula=disconnected?validation.components.map(componentFormula).join(' + '):baseFormula;
    if(empty){
      $('moleculeName').textContent='No structure yet';
      $('moleculeDetail').textContent='Formula, molecular identity, and strict validation will appear here.';
      $('structureStatus').className='status-pill open';$('structureStatus').textContent='Empty';
    }else if(validation.status==='invalid'){
      $('moleculeName').innerHTML=`Rejected structure · <span class="formula">${formulaHtml(displayedFormula)}</span>`;
      $('moleculeDetail').textContent=validation.errors[0]||'The structure violates a strict chemistry rule.';
      $('structureStatus').className='status-pill invalid';$('structureStatus').textContent='Rejected';
    }else if(validation.status==='unsupported'){
      $('moleculeName').innerHTML=`Outside current model · <span class="formula">${formulaHtml(displayedFormula)}</span>`;
      $('moleculeDetail').textContent=validation.unsupported?.[0]||'Compound-specific chemistry is required; no valid/invalid verdict is claimed.';
      $('structureStatus').className='status-pill unsupported';$('structureStatus').textContent='Unsupported';
    }else if(disconnected){
      $('moleculeName').innerHTML=`Unbonded mixture · <span class="formula">${formulaHtml(displayedFormula)}</span>`;
      $('moleculeDetail').textContent=`The canvas contains ${validation.components.length} disconnected species.${validation.status==='open'?' At least one species is also incomplete or reactive.':''}`;
      $('structureStatus').className=`status-pill ${validation.status==='open'?'open':'mixture'}`;$('structureStatus').textContent=validation.status==='open'?'Open mixture':'Mixture';
    }else{
      $('moleculeName').innerHTML=`${escapeHtml(identity.name)} · <span class="formula">${formulaHtml(baseFormula)}</span>`;
      const detail=validation.status==='open'?'Chemically possible only as an incomplete, radical, electron-deficient, or charge-unbalanced species. It is not certified as a closed-shell molecule.':'Strict valence, charge, shell-capacity, and connectivity rules are satisfied.';
      $('moleculeDetail').textContent=detail;
      $('structureStatus').className=`status-pill ${validation.status}`;$('structureStatus').textContent=validation.status;
    }
    $('metricFormula').innerHTML=empty?'—':formulaHtml(displayedFormula);
    $('metricMass').textContent=empty||validation.mass==null?'—':`${validation.mass.toFixed(3)} g/mol`;
    $('metricCharge').textContent=empty?'0':displayCharge(validation.charge);
    $('metricComponents').textContent=String(validation.components.length);
    const dbe=E.degreeOfUnsaturation(validation.counts);$('metricDbe').textContent=dbe==null?'N/A':String(dbe);
    emptyState.style.display=empty?'grid':'none';

    const elementalSingle=state.atoms.length===1&&state.bonds.length===0;
    const addBlocked=empty||validation.status==='invalid'||validation.status==='unsupported'||(validation.status==='open'&&!identity?.molecule&&!elementalSingle)||(disconnected&&!identity?.molecule);
    $('addReactantBtn').disabled=addBlocked;
    $('addReactantBtn').title=addBlocked?'Only a validated complete structure, known radical, or single elemental species can be added.':'';
    $('saveStructureBtn').disabled=empty||validation.status==='invalid'||validation.status==='unsupported';
    $('saveStructureBtn').title=validation.status==='invalid'?'Rejected structures cannot be saved as validated structures.':validation.status==='unsupported'?'Outside-model drawings cannot be saved as validated structures.':'';
    $('exportMolBtn').disabled=empty||validation.status==='invalid';
    $('exportMolBtn').title=validation.status==='invalid'?'Fix structural errors before export.':'';
  }

  function renderMission(validation) {
    const loadStep=$('missionStepLoad'),breakStep=$('missionStepBreak'),connectStep=$('missionStepConnect'),observation=$('missionObservation'),reset=$('missionResetBtn'),progressText=$('missionProgressText'),progressBar=$('missionProgressBar');
    if(!loadStep||!breakStep||!connectStep||!observation)return;
    const symbols=state.atoms.reduce((counts,atom)=>{counts[atom.symbol]=(counts[atom.symbol]||0)+1;return counts;},{});
    const preserved=(symbols.O||0)>=1&&(symbols.N||0)>=1&&(symbols.H||0)>=2;
    const ohBonds=state.bonds.filter(b=>{const a=getAtom(b.a)?.symbol,c=getAtom(b.b)?.symbol;return (a==='O'&&c==='H')||(a==='H'&&c==='O');}).length;
    const noBonds=state.bonds.filter(b=>{const a=getAtom(b.a)?.symbol,c=getAtom(b.b)?.symbol;return (a==='N'&&c==='O')||(a==='O'&&c==='N');}).length;
    const loaded=Boolean(state.mission.active&&preserved);
    const broken=loaded&&ohBonds<2;
    const connected=broken&&noBonds>0;
    const progress=Number(loaded)+Number(broken)+Number(connected);
    const setStep=(node,complete,current)=>{
      node.classList.toggle('complete',complete);node.classList.toggle('current',current);
      const icon=node.querySelector('i');if(icon)icon.textContent=complete?'✓':node===loadStep?'1':node===breakStep?'2':'3';
    };
    setStep(loadStep,loaded,state.mission.active&&!loaded);
    setStep(breakStep,broken,loaded&&!broken);
    setStep(connectStep,connected,broken&&!connected);
    if(reset)reset.disabled=!state.mission.active;
    if(progressText)progressText.textContent=`${progress} / 3`;
    if(progressBar)progressBar.style.width=`${progress/3*100}%`;
    if(!state.mission.active){
      observation.innerHTML='<span>What to notice</span><p>The app preserves open valences. A permitted new bond is not automatically a complete, stable product.</p>';
    }else if(!preserved){
      observation.innerHTML='<span>Atoms were removed</span><p>The challenge requires both H atoms, O, and N to stay on the canvas. Restart and break only the bond.</p>';
    }else if(connected){
      observation.innerHTML=`<span>Graph result · ${escapeHtml(validation.status)}</span><p>You formed N–O manually and every atom remained. The ${escapeHtml(validation.status)} verdict shows why an allowed bond edit is not the same as a complete stable product.</p>`;
    }else if(broken){
      observation.innerHTML=`<span>Open state observed · ${escapeHtml(validation.status)}</span><p>Both atoms survived the O–H break. Oxygen and hydrogen now expose the consequence instead of disappearing. Select Single, then connect N to O.</p>`;
    }else{
      observation.innerHTML='<span>First action</span><p>Select either O–H bond in the field. Use the visible Break selected bond control; do not delete an atom.</p>';
    }
  }

  function startBondRewriteMission() {
    state.activity=[];state.mission={active:true,id:'bond-rewrite'};state.bondType='single';
    document.querySelectorAll('[data-bond-type]').forEach(btn=>btn.classList.toggle('active',btn.dataset.bondType==='single'));
    const graph={
      atoms:[
        {id:1,symbol:'N',charge:0,x:0,y:-145},
        {id:2,symbol:'O',charge:0,x:0,y:20},
        {id:3,symbol:'H',charge:0,x:-96,y:105},
        {id:4,symbol:'H',charge:0,x:96,y:105},
      ],
      bonds:[
        {a:2,b:3,type:'single',order:1},
        {a:2,b:4,type:'single',order:1},
      ],
    };
    loadGraph(graph,'Bond rewrite challenge loaded.');
    recordActivity('setup','Challenge loaded','Water and nitrogen begin as separate species. No bond has been changed automatically.','Experiment start');
    $('laboratory').scrollIntoView({behavior:'smooth',block:'start'});
  }

  function render() {
    const validation=currentValidation(),identity=state.atoms.length?currentIdentity():null;
    renderAtoms(validation);renderBonds();renderInspector(validation);renderValidation(validation);renderSummary(validation,identity);renderGuide(validation);renderSaved();renderMission(validation);renderActivity();
  }

  function clearWorkspace(record=true) {
    if(record&&state.atoms.length)saveHistory();state.atoms=[];state.bonds=[];state.selectedAtomId=null;state.selectedBondKey=null;state.pendingBondAtomId=null;state.bondDrag=null;clearGuide();
    recordActivity('break','Canvas cleared','All atoms and bonds were removed by an explicit clear action.','Manual edit');render();
  }

  function undo() {
    const prev=state.history.pop();if(!prev){showToast('Nothing to undo.');return;}const data=JSON.parse(prev);state.atoms=data.atoms;state.bonds=data.bonds;state.nextId=data.nextId;state.selectedAtomId=null;state.selectedBondKey=null;state.pendingBondAtomId=null;state.bondDrag=null;clearGuide();
    recordActivity('undo','Previous graph restored','Undo restored atoms, bonds, and charges from the last manual snapshot.','History');render();
  }

  function centerMolecule(record=true) {
    if(!state.atoms.length)return;if(record)saveHistory();const rect=workspace.getBoundingClientRect();const minX=Math.min(...state.atoms.map(a=>a.x)),maxX=Math.max(...state.atoms.map(a=>a.x)),minY=Math.min(...state.atoms.map(a=>a.y)),maxY=Math.max(...state.atoms.map(a=>a.y));const dx=rect.width/2-(minX+maxX)/2,dy=rect.height/2-(minY+maxY)/2;
    state.atoms.forEach(a=>{a.x=Math.max(58,Math.min(rect.width-58,a.x+dx));a.y=Math.max(58,Math.min(rect.height-58,a.y+dy));});clearGuide();render();
  }

  function loadGraph(graph,announce='Structure loaded.',notify=true) {
    if(state.atoms.length)saveHistory();const rect=workspace.getBoundingClientRect(),sourceAtoms=graph.atoms.map(a=>({...a}));const minX=Math.min(...sourceAtoms.map(a=>a.x||0)),maxX=Math.max(...sourceAtoms.map(a=>a.x||0)),minY=Math.min(...sourceAtoms.map(a=>a.y||0)),maxY=Math.max(...sourceAtoms.map(a=>a.y||0));const sourceW=Math.max(100,maxX-minX),sourceH=Math.max(100,maxY-minY),scale=Math.min(1.18,(rect.width*.72)/sourceW,(rect.height*.72)/sourceH),idMap=new Map();state.atoms=[];state.bonds=[];
    sourceAtoms.forEach(a=>{const id=state.nextId++;idMap.set(a.id,id);state.atoms.push({id,symbol:a.symbol,charge:Number(a.charge||0),x:rect.width/2+(a.x-(minX+maxX)/2)*scale,y:rect.height/2+(a.y-(minY+maxY)/2)*scale});});
    graph.bonds.forEach(b=>state.bonds.push({a:idMap.get(b.a),b:idMap.get(b.b),type:b.type||'single',order:E.BOND_TYPES[b.type||'single']?.order??b.order??1}));state.selectedAtomId=null;state.selectedBondKey=null;state.pendingBondAtomId=null;state.bondDrag=null;clearGuide();
    recordActivity('setup',announce.replace(/\.$/,''),'A known graph was loaded exactly as stored. No inference or automatic completion was applied.','Structure load');
    render();if(notify)showToast(announce,'good');
  }

  function loadPreset(key,scroll=true,notify=true) {
    const m=L.MOLECULES[key];if(!m)return;
    loadGraph(m,`${m.name} loaded.`,notify);
    if(scroll)$('laboratory').scrollIntoView({behavior:'smooth',block:'start'});
  }

  function buildPalette(filter='') {
    const palette=$('atomPalette');palette.innerHTML='';
    const order=['H','C','N','O','F','Cl','Br','I','B','Si','P','S','Li','Na','K','Mg','Ca','Al','Cr','Mn','Fe','Co','Ni','Cu','Zn','Ag','Sn','Ba','Pt','Au','Hg','Pb','He','Ne'];
    const q=filter.trim().toLowerCase();
    order.filter(symbol=>{const e=E.ELEMENTS[symbol];return !q||symbol.toLowerCase().includes(q)||e.name.toLowerCase().includes(q)||e.category.toLowerCase().includes(q);}).forEach(symbol=>{
      const e=E.ELEMENTS[symbol],btn=document.createElement('button');btn.className='atom-choice';btn.draggable=true;
      const symbolColor=['#dce4ed','#c9eaff','#d8f0ff'].includes(e.color)?'#506079':e.color;
      btn.innerHTML=`<span class="number">${e.atomicNumber}</span><span class="symbol" style="color:${symbolColor}">${symbol}</span><span class="name">${escapeHtml(e.name)}</span>`;
      btn.title=`${e.name} · ${e.category}`;btn.addEventListener('click',()=>addAtom(symbol));btn.addEventListener('dragstart',ev=>ev.dataTransfer.setData('text/element',symbol));palette.appendChild(btn);
    });
  }

  function buildPresets(filter='') {
    const list=$('presetList');list.innerHTML='';const q=filter.trim().toLowerCase();
    L.VISIBLE_PRESETS.map(k=>L.MOLECULES[k]).filter(m=>!q||m.name.toLowerCase().includes(q)||m.formula.toLowerCase().includes(q)||m.category.toLowerCase().includes(q)).forEach(m=>{
      const btn=document.createElement('button');btn.className='preset-button';btn.innerHTML=`<strong>${escapeHtml(m.name)}</strong><span class="formula">${formulaHtml(m.formula)}</span>`;btn.addEventListener('click',()=>loadPreset(m.key));list.appendChild(btn);
    });
  }

  const STORAGE_KEY='chemlab.savedStructures.v2';
  function readSaved(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');}catch(_){return[];}}
  function writeSaved(items){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(items));return true;}catch(_){showToast('Browser storage is unavailable in this context.','error');return false;}}
  function saveStructure(){
    if(!state.atoms.length){showToast('Build a structure first.');return;}
    const validation=currentValidation(),identity=currentIdentity();
    if(validation.status==='invalid'||validation.status==='unsupported'){showToast(validation.status==='invalid'?'Invalid structures cannot be saved as validated molecules.':'Outside-model structures cannot be saved as validated molecules.','error');return;}
    const items=readSaved();
    items.unshift({id:Date.now(),name:identity.name,formula:identity.molecule?.formula||validation.formula,created:new Date().toISOString(),graph:{atoms:state.atoms,bonds:state.bonds}});
    if(!writeSaved(items.slice(0,12)))return;renderSaved();showToast('Structure saved in this browser.','good');
  }
  function renderSaved(){
    const list=$('savedList');if(!list)return;const items=readSaved();list.innerHTML='';
    if(!items.length){list.innerHTML='<p class="inspector-empty">No saved structures.</p>';return;}
    items.forEach(item=>{
      const row=document.createElement('div');row.className='saved-item';
      row.innerHTML=`<div><strong>${escapeHtml(item.name)}</strong><small>${formulaHtml(item.formula)}</small></div><div class="saved-actions"><button data-act="load">Load</button><button data-act="delete" style="color:var(--danger);background:#fff0f3">Delete</button></div>`;
      row.querySelector('[data-act="load"]').addEventListener('click',()=>loadGraph(item.graph,`${item.name} loaded.`));
      row.querySelector('[data-act="delete"]').addEventListener('click',()=>{if(writeSaved(items.filter(x=>x.id!==item.id)))renderSaved();});list.appendChild(row);
    });
  }
  function clearSaved(){if(writeSaved([])){renderSaved();showToast('Saved structures cleared.');}}

  function exportMol(){
    if(!state.atoms.length){showToast('Build a structure first.');return;}
    const identity=currentIdentity(),validation=currentValidation();
    if(validation.status==='invalid'){showToast('Rejected structures cannot be exported as valid molecular files.','error');return;}
    const title=identity.name||validation.formula;
    const blob=new Blob([E.toMolfile(currentGraph(),title)],{type:'chemical/x-mdl-molfile'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`${(identity.key||validation.formula||'structure').replace(/[^A-Za-z0-9_-]/g,'_')}.mol`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    showToast('MOL file exported.','good');
  }

  function addReactant(formula,name,source='formula') {
    try{
      const parsed=E.parseFormula(formula);const normalized=parsed.formula+(parsed.charge?`^${Math.abs(parsed.charge)===1?'':Math.abs(parsed.charge)}${parsed.charge>0?'+':'-'}`:'');
      const key=E.compositionKey(normalized);
      if(state.reactants.some(r=>r.key===key)){showToast('That reactant is already present. Coefficients are calculated automatically.');return;}
      const classification=E.classifySpecies(normalized);
      state.reactants.push({key,formula:normalized,name:name||classification.name||normalized,source});renderReactants();showToast(`${name||classification.name||normalized} added as a reactant.`,'good');
    }catch(error){showToast(error.message,'error');}
  }

  function addCurrentAsReactant(){
    if(!state.atoms.length){showToast('Build or load a structure first.');return;}
    const validation=currentValidation(),identity=currentIdentity();
    if(validation.status==='invalid'||validation.status==='unsupported'){showToast(validation.status==='invalid'?'Resolve structural errors before adding the molecule.':'This structure is outside the certified model and cannot be used as a validated reactant.','error');return;}
    const elementalSingle = state.atoms.length===1 && state.bonds.length===0;
    if(validation.status==='open'&&!identity.molecule&&!elementalSingle){showToast('Complete the custom structure before adding it as a reactant. Known radicals and single elemental species remain allowed.','error');return;}
    if(validation.components.length>1&&!identity.molecule){showToast('The canvas contains multiple disconnected species. Add them separately.','error');return;}
    const canvasFormula=identity.molecule?.formula||validation.formula;
    const canvasName=identity.molecule?.name||(elementalSingle?E.ELEMENTS[state.atoms[0].symbol].name:identity.name);
    addReactant(canvasFormula,canvasName,'canvas');
    $('reactionLab').scrollIntoView({behavior:'smooth',block:'start'});
  }

  function renderReactants(){
    const list=$('reactantList');list.innerHTML='';
    if(!state.reactants.length){list.innerHTML='<p class="reactant-empty">No reactants added.</p>';return;}
    state.reactants.forEach(r=>{
      const chip=document.createElement('div');chip.className='reactant-chip';chip.innerHTML=`<div><strong>${escapeHtml(r.name)}</strong><small><span class="formula">${formulaHtml(r.formula)}</span> · ${escapeHtml(r.source)}</small></div><button aria-label="Remove reactant">×</button>`;
      chip.querySelector('button').addEventListener('click',()=>{state.reactants=state.reactants.filter(x=>x!==r);renderReactants();});list.appendChild(chip);
    });
  }

  function buildQuickSpecies(){
    const wrap=$('quickSpecies');wrap.innerHTML='';L.QUICK_SPECIES.forEach(s=>{const btn=document.createElement('button');btn.className='quick-chip';btn.innerHTML=`${escapeHtml(s.name)} <span class="formula">${formulaHtml(s.formula)}</span>`;btn.addEventListener('click',()=>addReactant(s.formula,s.name,'quick library'));wrap.appendChild(btn);});
  }

  function balancedEquationHtml(result){
    const side=(formulas,coeffs)=>formulas.map((f,i)=>`${coeffs[i]===1?'':coeffs[i]}${formulaHtml(f)}`).join(' + ');
    return `${side(result.reactants,result.coefficients.reactants)} <span aria-hidden="true">→</span> ${side(result.products,result.coefficients.products)}`;
  }

  function renderReactionResult(result){
    if(!result.supported){
      reactionResult.className='result-box failure';reactionResult.innerHTML=`<div><h3>No unique supported prediction</h3><p class="placeholder">${escapeHtml(result.reason)}</p><div class="tag-row"><span class="tag">No product hallucination</span><span class="tag">Try the custom balancer with known products</span></div></div>`;return;
    }
    reactionResult.className='result-box success pulse';
    const conservation=Object.entries(result.balanced.conserved).map(([el,c])=>`<div class="conservation-item"><span>${escapeHtml(el)}</span><strong>${c.left} = ${c.right}</strong></div>`).join('');
    reactionResult.innerHTML=`<div><div class="equation-display">${balancedEquationHtml(result.balanced)}</div><div class="result-meta"><h3>${escapeHtml(result.family)}</h3><p><strong>${escapeHtml(result.certainty)}</strong> · ${escapeHtml(result.summary)}</p><div class="tag-row">${(result.conditions||[]).map(x=>`<span class="tag">${escapeHtml(x)}</span>`).join('')}</div><div class="conservation">${conservation}</div></div></div>`;
    setTimeout(()=>reactionResult.classList.remove('pulse'),650);
  }

  function runReaction(){
    const result=E.predictReaction(state.reactants.map(r=>r.formula));renderReactionResult(result);
    if(result.supported)showToast('Products predicted and equation balanced.','good');else showToast('No deterministic product rule applied.','error');
  }
  function resetReaction(){state.reactants=[];renderReactants();reactionResult.className='result-box';reactionResult.innerHTML='<div class="placeholder">A reaction result will appear here. Unsupported combinations are reported explicitly rather than assigned invented products.</div>';}

  function balanceCustom(){
    const box=$('balanceResult');
    try{
      const parts=E.splitEquation($('equationInput').value),result=E.balanceEquation(parts.reactants,parts.products);
      const conservation=Object.entries(result.conserved).map(([el,c])=>`${el}: ${c.left} = ${c.right}`).join(' · ');
      box.innerHTML=`<strong>${balancedEquationHtml(result)}</strong><p>Conservation verified: ${escapeHtml(conservation)}</p>`;showToast('Equation balanced.','good');
    }catch(error){box.innerHTML=`<strong style="color:var(--danger)">Cannot balance</strong><p>${escapeHtml(error.message)}</p>`;showToast(error.message,'error');}
  }

  function runTests(){
    const results=E.runSelfTests();
    try{
      const water=L.MOLECULES.H2O;const id=E.identifyGraph({atoms:water.atoms.map((a,i)=>({...a,id:i+100})),bonds:water.bonds.map(b=>({a:water.atoms.findIndex(a=>a.id===b.a)+100,b:water.atoms.findIndex(a=>a.id===b.b)+100,type:b.type,order:b.order}))},L.MOLECULES);
      results.push({name:'Graph identity recognizes water by connectivity',ok:id.key==='H2O',error:id.key==='H2O'?'':`Matched ${id.key}`});
    }catch(error){results.push({name:'Graph identity recognizes water by connectivity',ok:false,error:error.message});}
    try{
      const atoms=[{id:1,symbol:'H',charge:0},{id:2,symbol:'H',charge:0},{id:3,symbol:'O',charge:0}],bonds=[{a:1,b:2,type:'single',order:1},{a:2,b:3,type:'single',order:1}];
      const v=E.validateGraph(atoms,bonds),id=E.identifyGraph({atoms,bonds},L.MOLECULES);results.push({name:'Incorrect H–H–O is rejected as water',ok:v.status==='invalid'&&id.key!=='H2O',error:`status=${v.status}, identity=${id.key}`});
    }catch(error){results.push({name:'Incorrect H–H–O is rejected as water',ok:false,error:error.message});}
    const list=$('testList');list.innerHTML='';results.forEach(r=>{const item=document.createElement('div');item.className=`test-item ${r.ok?'ok':'fail'}`;item.innerHTML=`<span>${escapeHtml(r.name)}${r.ok?'':`<small style="display:block;color:var(--muted);margin-top:3px">${escapeHtml(r.error||'Failed')}</small>`}</span><strong>${r.ok?'PASS':'FAIL'}</strong>`;list.appendChild(item);});
    $('testsModal').classList.add('show');
  }

  workspace.addEventListener('click',()=>{state.selectedAtomId=null;state.selectedBondKey=null;state.pendingBondAtomId=null;state.bondDrag=null;clearGuide();render();});
  workspace.addEventListener('dragover',ev=>{ev.preventDefault();workspace.classList.add('dragover');});
  workspace.addEventListener('dragleave',()=>workspace.classList.remove('dragover'));
  workspace.addEventListener('drop',ev=>{ev.preventDefault();workspace.classList.remove('dragover');const symbol=ev.dataTransfer.getData('text/element');if(!symbol)return;const rect=workspace.getBoundingClientRect();addAtom(symbol,ev.clientX-rect.left,ev.clientY-rect.top);});
  document.addEventListener('pointermove',onBondPointerMove,{passive:false});
  document.addEventListener('pointerup',ev=>finishBondDrag(ev,false));
  document.addEventListener('pointercancel',ev=>finishBondDrag(ev,true));

  document.querySelectorAll('[data-bond-type]').forEach(btn=>btn.addEventListener('click',()=>{
    state.bondType=btn.dataset.bondType;state.pendingBondAtomId=null;state.bondDrag=null;clearGuide();document.querySelectorAll('[data-bond-type]').forEach(b=>b.classList.toggle('active',b===btn));showToast(`${bondLabel(state.bondType)} selected.`);render();
  }));
  $('lewisToggle').addEventListener('click',()=>{state.showLewisElectrons=!state.showLewisElectrons;const btn=$('lewisToggle');btn.classList.toggle('active',state.showLewisElectrons);btn.setAttribute('aria-pressed',String(state.showLewisElectrons));btn.title=state.showLewisElectrons?'Hide simplified Lewis valence electrons':'Show simplified Lewis valence electrons';render();});
  document.querySelectorAll('[data-load-preset]').forEach(btn=>btn.addEventListener('click',()=>loadPreset(btn.dataset.loadPreset)));
  $('elementSearch').addEventListener('input',ev=>buildPalette(ev.target.value));
  $('presetSearch').addEventListener('input',ev=>buildPresets(ev.target.value));
  $('breakBondBtn').addEventListener('click',breakSelectedBond);$('undoBtn').addEventListener('click',undo);$('centerBtn').addEventListener('click',()=>centerMolecule());$('clearBtn').addEventListener('click',()=>clearWorkspace());
  $('missionStartBtn').addEventListener('click',startBondRewriteMission);$('missionResetBtn').addEventListener('click',startBondRewriteMission);
  $('addReactantBtn').addEventListener('click',addCurrentAsReactant);$('saveStructureBtn').addEventListener('click',saveStructure);$('exportMolBtn').addEventListener('click',exportMol);$('clearSavedBtn').addEventListener('click',clearSaved);
  $('addFormulaBtn').addEventListener('click',()=>{const input=$('formulaInput');if(input.value.trim()){addReactant(input.value.trim(),null,'formula input');input.value='';}});
  $('formulaInput').addEventListener('keydown',ev=>{if(ev.key==='Enter')$('addFormulaBtn').click();});
  $('runReactionBtn').addEventListener('click',runReaction);$('resetReactionBtn').addEventListener('click',resetReaction);$('balanceBtn').addEventListener('click',balanceCustom);
  document.querySelectorAll('[data-equation]').forEach(btn=>btn.addEventListener('click',()=>{$('equationInput').value=btn.dataset.equation;balanceCustom();}));
  $('howBtn').addEventListener('click',()=>$('howModal').classList.add('show'));$('testsBtn').addEventListener('click',runTests);
  ['jumpBtn','heroStartBtn'].forEach(id=>$(id).addEventListener('click',()=>$('laboratory').scrollIntoView({behavior:'smooth',block:'start'})));
  document.querySelectorAll('[data-close-modal]').forEach(btn=>btn.addEventListener('click',()=>$(btn.dataset.closeModal).classList.remove('show')));
  document.querySelectorAll('.modal-backdrop').forEach(modal=>modal.addEventListener('click',ev=>{if(ev.target===modal)modal.classList.remove('show');}));
  document.addEventListener('keydown',ev=>{
    const editing=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);
    if(ev.key==='Escape'){document.querySelectorAll('.modal-backdrop.show').forEach(m=>m.classList.remove('show'));if(state.pendingBondAtomId||state.bondDrag||state.selectedBondKey){state.pendingBondAtomId=null;state.bondDrag=null;state.selectedBondKey=null;clearGuide();render();}}
    if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='z'){ev.preventDefault();undo();}
    if(!editing&&(ev.key==='Delete'||ev.key==='Backspace')&&state.selectedBondKey){ev.preventDefault();breakSelectedBond();}
    else if(!editing&&(ev.key==='Delete'||ev.key==='Backspace')&&state.selectedAtomId){ev.preventDefault();removeAtom(state.selectedAtomId);}
  });
  window.addEventListener('resize',renderBonds);

  buildPalette();buildPresets();buildQuickSpecies();renderReactants();render();
  setTimeout(()=>{if(!state.atoms.length&&!state.mission.active)loadPreset('H2O',false,false);},250);
})();

export {};
