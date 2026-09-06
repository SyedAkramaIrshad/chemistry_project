import { DISCOVERY_GOALS, analyzeDiscovery } from './playgroundDiscovery.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const formula = value => escape(value).replace(/(\d+)/g, '<sub>$1</sub>');

/** Presentation and goal selection only; graph edits stay in the main controller. */
export function createDiscoveryCoach({ engine, library, getGraph, getSelectedAtom, getBondType, addElement, selectAtom, start, loadReference, refresh }) {
  const $ = id => document.getElementById(id);
  let targetId = 'ethanol';
  let source = 'manual';
  let lastView = null;
  let lastRecognition = null;
  const collection = new Map();
  const selector = $('discoveryGoalSelect');
  const attachToggle = $('discoveryAttachToggle');

  selector.addEventListener('change', () => { targetId = selector.value; refresh(); });
  $('discoveryFreeBtn').addEventListener('click', () => { targetId = null; refresh(); });
  $('discoveryStartBtn').addEventListener('click', () => {
    targetId = selector.value; start();
  });
  $('discoveryReferenceBtn').addEventListener('click', () => {
    targetId = selector.value;
    const goal = DISCOVERY_GOALS.find(item => item.id === targetId);
    if (goal && library.MOLECULES[goal.key]) loadReference(library.MOLECULES[goal.key]);
  });
  attachToggle.addEventListener('change', refresh);
  $('discoverySelectHint').addEventListener('click', () => {
    const id=lastView?.nextAction.atomIds?.[0];
    if(id!=null)selectAtom(id);
  });
  $('discoveryInventory').addEventListener('click', event => {
    const button = event.target.closest('[data-build-element]');
    if (button) addElement(button.dataset.buildElement, attachToggle.checked);
  });

  function render() {
    const graph = getGraph();
    const view = analyzeDiscovery(graph, { engine, library, targetId });
    lastView = view;
    const target = view.target;
    const selected = getSelectedAtom();
    const attaching = Boolean(selected && attachToggle.checked);
    const bondType = getBondType();
    const free = !target;
    const freeButton = $('discoveryFreeBtn');
    freeButton.setAttribute('aria-pressed', String(free));
    freeButton.classList.toggle('active', free);
    $('discoveryGoalInfo').innerHTML = target
      ? `<strong class="discovery-goal-structure">${formula(target.structure)}</strong><p class="discovery-goal-description">${escape(target.description)}</p>`
      : '<strong class="discovery-goal-structure">Follow your curiosity.</strong><p class="discovery-goal-description">Place atoms and connect them. Recognized structures appear as you build.</p>';
    $('discoveryStartBtn').textContent = graph.atoms.length ? 'Start fresh' : 'Start building';
    $('discoveryAttachContext').textContent = attaching
      ? `To ${engine.ELEMENTS[selected.symbol].name} · atom ${selected.id} · ${bondType} bond`
      : attachToggle.checked ? graph.atoms.length ? 'Select an atom on the canvas before attaching another.' : 'Add your first atom, then click another element to attach it.' : 'Loose atoms: drop one onto another to make a bond.';
    $('discoveryInventory').querySelectorAll('[data-build-element]').forEach(button => {
      const symbol = button.dataset.buildElement;
      const entry = view.inventory.find(item => item.symbol === symbol);
      const current = view.counts[symbol] || 0;
      const amount = target ? `${current} / ${target.counts[symbol] || 0}` : String(current);
      button.querySelector('.discovery-element-count').textContent = amount;
      button.querySelector('.discovery-element-name').textContent = `${attaching ? 'Attach' : 'Add'} ${symbol}`;
      button.classList.toggle('is-complete', Boolean(entry && entry.current === entry.target));
      button.classList.toggle('is-extra', Boolean(entry?.extra));
      button.title = attaching
        ? `Add one ${engine.ELEMENTS[symbol].name} atom and attempt a ${bondType} bond to ${selected.symbol} atom ${selected.id}.`
        : `Place one unbonded ${engine.ELEMENTS[symbol].name} atom.`;
      button.setAttribute('aria-label', `${attaching ? 'Attach' : 'Add'} ${engine.ELEMENTS[symbol].name}${attaching ? ` to ${selected.symbol} atom ${selected.id}` : ''}. ${amount} atoms${target ? ' toward the goal' : ' on canvas'}.`);
    });
    const next = $('discoveryNextAction');
    const nextTitle = source === 'reference' ? 'Reference on canvas' : view.complete ? 'Goal complete' : 'Next move';
    const nextText = source === 'reference'
      ? 'This example was loaded for you. Choose Start fresh to build it yourself.'
      : view.nextAction.message;
    next.innerHTML = `<strong>${escape(nextTitle)}</strong><span>${escape(nextText)}</span>`;
    next.dataset.complete = String(view.complete);
    const hintButton=$('discoverySelectHint');
    const hintedAtom=graph.atoms.find(atom=>atom.id===view.nextAction.atomIds?.[0]);
    hintButton.hidden=!hintedAtom||view.complete||source==='reference';
    if(hintedAtom)hintButton.textContent=`Select ${hintedAtom.symbol} · atom ${hintedAtom.id}`;
    const shortSteps = { inventory: 'Atoms', skeleton: 'Skeleton', hydrogens: 'Hydrogens', identity: 'Identity' };
    $('discoverySteps').innerHTML = view.milestones.map(step => `<li data-complete="${step.complete}" title="${escape(step.label)}" aria-label="${escape(step.label)}: ${step.complete ? 'complete' : 'incomplete'}"><span class="step-check" aria-hidden="true">${step.complete ? '✓' : '○'}</span><span>${escape(shortSteps[step.id] || step.label)}</span></li>`).join('');
    $('discoverySteps').hidden = free;

    const card = $('discoveryCard');
    const recognized = view.recognition;
    card.dataset.recognized = recognized?.key || '';
    card.dataset.complete = String(view.complete);
    card.dataset.discoveryStatus = view.sameFormulaDifferentStructure ? 'different' : view.complete ? 'complete' : 'building';
    if (recognized) {
      card.innerHTML = `<span class="discovery-card-kicker">${source === 'reference' ? 'Reference structure' : 'Structure recognized'}</span>
        <h3 id="discoveryIdentity">${escape(recognized.name)}</h3><div class="discovery-formula">${formula(recognized.formula)}</div>
        <p class="discovery-structure">${formula(recognized.structure || recognized.formula)}</p>
        ${recognized.family ? `<span class="discovery-family">${escape(recognized.family)}</span>` : ''}
        <p class="discovery-description">${escape(recognized.description || 'This connected structure matches a molecule in the reference library.')}</p>
        <dl class="discovery-facts"><div><dt>Molecular formula</dt><dd>${formula(recognized.molecularFormula || view.formula)}</dd></div><div><dt>Atoms · bonds</dt><dd>${graph.atoms.length} · ${graph.bonds.length}</dd></div></dl>
        ${view.highlights ? `<p class="discovery-group-note">${escape(view.highlights.label)} is highlighted in the drawing.</p>` : ''}
        ${view.sameFormulaDifferentStructure ? `<div class="discovery-feedback" data-tone="notice"><strong>Same formula. Different connections.</strong><p>${escape(view.feedback.message)}</p></div>` : ''}
        ${target && !view.complete && !view.sameFormulaDifferentStructure ? `<div class="discovery-feedback" data-tone="notice"><strong>Goal: ${escape(target.name)}</strong><p>${escape(view.feedback.message)}</p></div>` : ''}`;
      if (source !== 'reference') collection.set(recognized.key, recognized.name);
    } else {
      card.innerHTML = `<span class="discovery-card-kicker">${target ? `Building ${escape(target.name)}` : 'Live discovery'}</span>
        <h3>${escape(view.feedback.title)}</h3><span id="discoveryIdentity" class="mp-sr-only">Not yet recognized</span><div class="discovery-formula">${graph.atoms.length ? formula(view.formula) : '—'}</div>
        <p class="discovery-description">${graph.atoms.length ? 'Atoms on the canvas. Connections determine the compound.' : 'Your atoms will tell a story. Add the first one above the canvas.'}</p>
        <div class="discovery-feedback" data-tone="${escape(view.feedback.tone)}"><p>${escape(view.feedback.message)}</p></div>
        <dl class="discovery-facts"><div><dt>Atoms · bonds</dt><dd>${graph.atoms.length} · ${graph.bonds.length}</dd></div><div><dt>Separate pieces</dt><dd>${view.components}</dd></div></dl>`;
    }
    if (recognized?.key !== lastRecognition) {
      card.classList.remove('discovery-arrival');
      if (recognized && source !== 'reference') { void card.offsetWidth; card.classList.add('discovery-arrival'); }
      lastRecognition = recognized?.key || null;
    }
    $('discoveryCollection').innerHTML = collection.size
      ? `<span class="discovery-collection-label">Recognized this session · ${collection.size}</span><div>${[...collection.values()].map(name => `<span class="discovery-collection-chip">${escape(name)}</span>`).join('')}</div>`
      : '<span class="discovery-collection-label">Your discoveries will appear here.</span>';
    const emptyTitle = $('emptyState').querySelector('h3');
    const emptyDescription = $('emptyState').querySelector('p');
    if (emptyTitle) emptyTitle.textContent = target ? `Let’s build ${target.name.toLowerCase()}.` : 'What will you discover?';
    if (emptyDescription) emptyDescription.textContent = target
      ? `${Object.entries(target.counts).map(([symbol, count]) => `${count} ${engine.ELEMENTS[symbol].name.toLowerCase()}${count > 1 ? ' atoms' : ' atom'}`).join(' · ')}. Add one atom at a time using the buttons above.`
      : 'Add an atom, then choose a socket or attach one more atom. You control every bond.';
    return view;
  }

  return { render, getView: () => lastView, getSource: () => source, clearGoal() { targetId = null; }, setSource(value) { source = value; },
    getSession() { return { targetId, choice: selector.value, source, collection: [...collection.keys()] }; },
    restoreSession(saved) {
      const valid=id=>DISCOVERY_GOALS.some(goal=>goal.id===id);
      targetId=saved.targetId===null?null:valid(saved.targetId)?saved.targetId:'ethanol';
      selector.value=valid(saved.choice)?saved.choice:targetId||'ethanol';
      source=saved.source==='reference'?'reference':'manual';
      collection.clear();
      for(const key of (Array.isArray(saved.collection)?saved.collection:[]).slice(0,100)){
        const molecule=typeof key==='string'&&Object.hasOwn(library.MOLECULES,key)?library.MOLECULES[key]:null;
        if(molecule)collection.set(key,molecule.name);
      }
    },
  };
}
