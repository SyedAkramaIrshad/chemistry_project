// Learning feedback is derived from the current, explicit-atom graph. These
// helpers never add atoms, change bonds, or substitute formula for identity.
const NIST = 'https://webbook.nist.gov/cgi/cbook.cgi?ID=';
const ALCOHOL_SOURCE = 'https://goldbook.iupac.org/terms/view/A00204';

export const DISCOVERY_GOALS = Object.freeze([
  {
    id: 'ethanol', key: 'C2H5OH', name: 'Ethanol', formula: 'C2H5OH', molecularFormula: 'C2H6O',
    family: 'Alcohol', structure: 'CH₃–CH₂–OH', skeleton: 'C–C–O', counts: { C: 2, H: 6, O: 1 },
    description: 'The –OH group is attached to a carbon. Five H atoms bond to carbon and the sixth bonds to oxygen.',
    sourceUrls: [`${NIST}C64175`, ALCOHOL_SOURCE],
  },
  {
    id: 'dimethyl-ether', key: 'CH3OCH3', name: 'Dimethyl ether', formula: 'CH3OCH3', molecularFormula: 'C2H6O',
    family: 'Ether', structure: 'CH₃–O–CH₃', skeleton: 'C–O–C', counts: { C: 2, H: 6, O: 1 },
    description: 'Oxygen connects two carbon groups. It has the same molecular formula as ethanol, but different connectivity.',
    sourceUrls: [`${NIST}C115106`],
  },
  {
    id: 'methanol', key: 'CH3OH', name: 'Methanol', formula: 'CH3OH', molecularFormula: 'CH4O',
    family: 'Alcohol', structure: 'CH₃–OH', skeleton: 'C–O', counts: { C: 1, H: 4, O: 1 },
    description: 'One carbon carries three H atoms and an –OH group. The H on oxygen is part of the alcohol group.',
    sourceUrls: [`${NIST}C67561`, ALCOHOL_SOURCE],
  },
  {
    id: 'methane', key: 'CH4', name: 'Methane', formula: 'CH4', molecularFormula: 'CH4',
    family: 'Alkane', structure: 'CH₄', skeleton: 'C', counts: { C: 1, H: 4 },
    description: 'Four single C–H bonds complete this carbon’s ordinary neutral Lewis structure.',
    sourceUrls: [`${NIST}C74828`],
  },
  {
    id: 'water', key: 'H2O', name: 'Water', formula: 'H2O', molecularFormula: 'H2O',
    family: 'Inorganic molecule', structure: 'H–O–H', skeleton: 'O', counts: { H: 2, O: 1 },
    description: 'Both H atoms bond to oxygen. An H–H–O chain is a different connection pattern and exceeds neutral hydrogen’s one-bond limit.',
    sourceUrls: [`${NIST}C7732185`],
  },
  {
    id: 'ethane', key: 'C2H6', name: 'Ethane', formula: 'C2H6', molecularFormula: 'C2H6',
    family: 'Alkane', structure: 'CH₃–CH₃', skeleton: 'C–C', counts: { C: 2, H: 6 },
    description: 'A single bond joins the carbons. Each carbon also bonds to three H atoms.',
    sourceUrls: [`${NIST}C74840`],
  },
].map(goal => Object.freeze({ ...goal, counts: Object.freeze(goal.counts), sourceUrls: Object.freeze(goal.sourceUrls) })));

const GOAL_BY_ID = new Map(DISCOVERY_GOALS.map(goal => [goal.id, goal]));
const GOAL_BY_KEY = new Map(DISCOVERY_GOALS.map(goal => [goal.key, goal]));
const edgeKey = (a, b) => [a, b].sort((x, y) => Number(x) - Number(y) || String(x).localeCompare(String(y))).join(':');
const isSingle = bond => bond.type === 'single' && Number(bond.order ?? 1) === 1;
const otherEnd = (bond, id) => bond.a === id ? bond.b : bond.a;
const incident = (graph, id) => graph.bonds.filter(bond => bond.a === id || bond.b === id);

/** Extend the preset library without modifying the original library or graphs. */
export function createDiscoveryLibrary(baseLibrary) {
  const atoms = [
    { id: 1, symbol: 'C', x: -105, y: 20, charge: 0 },
    { id: 2, symbol: 'O', x: 0, y: -25, charge: 0 },
    { id: 3, symbol: 'C', x: 105, y: 20, charge: 0 },
    { id: 4, symbol: 'H', x: -165, y: -40, charge: 0 },
    { id: 5, symbol: 'H', x: -185, y: 45, charge: 0 },
    { id: 6, symbol: 'H', x: -105, y: 110, charge: 0 },
    { id: 7, symbol: 'H', x: 165, y: -40, charge: 0 },
    { id: 8, symbol: 'H', x: 185, y: 45, charge: 0 },
    { id: 9, symbol: 'H', x: 105, y: 110, charge: 0 },
  ];
  const bonds = [[1, 2], [2, 3], [1, 4], [1, 5], [1, 6], [3, 7], [3, 8], [3, 9]]
    .map(([a, b]) => ({ a, b, type: 'single', order: 1 }));
  return {
    ...baseLibrary,
    MOLECULES: {
      ...baseLibrary.MOLECULES,
      CH3OCH3: { key: 'CH3OCH3', name: 'Dimethyl ether', formula: 'CH3OCH3', atoms, bonds, category: 'Organic molecules' },
    },
    VISIBLE_PRESETS: [...new Set([...(baseLibrary.VISIBLE_PRESETS || []), 'CH3OCH3'])],
    QUICK_SPECIES: (baseLibrary.QUICK_SPECIES || []).map(species => ({ ...species })),
  };
}

function heavyGraph(graph) {
  const atoms = graph.atoms.filter(atom => atom.symbol !== 'H');
  const ids = new Set(atoms.map(atom => atom.id));
  return { atoms, bonds: graph.bonds.filter(bond => ids.has(bond.a) && ids.has(bond.b)) };
}

// Only six goals with at most three heavy atoms are admitted here. Enumerating
// their heavy-atom mappings is small, deterministic, and avoids factorial H
// permutations. Every existing H bond is then checked against that mapping.
function bestTargetMapping(graph, reference) {
  const currentHeavy = heavyGraph(graph).atoms;
  const targetHeavy = heavyGraph(reference).atoms;
  if (currentHeavy.length > targetHeavy.length) return null;
  const targetById = new Map(reference.atoms.map(atom => [atom.id, atom]));
  const byId = new Map(graph.atoms.map(atom => [atom.id, atom]));
  const expectedH = new Map(targetHeavy.map(atom => [atom.id, incident(reference, atom.id)
    .filter(bond => targetById.get(otherEnd(bond, atom.id))?.symbol === 'H').length]));
  let best = null;
  const mapping = new Map(), used = new Set();
  function score() {
    const wrong = [], missingHeavyEdges = [];
    const hByHeavy = new Map(currentHeavy.map(atom => [atom.id, []]));
    for (const bond of graph.bonds) {
      const a = byId.get(bond.a), b = byId.get(bond.b);
      if (!a || !b) { wrong.push(bond); continue; }
      if (!isSingle(bond)) { wrong.push(bond); continue; }
      if (a.symbol === 'H' && b.symbol === 'H') { wrong.push(bond); continue; }
      if (a.symbol === 'H' || b.symbol === 'H') {
        const heavyId = a.symbol === 'H' ? b.id : a.id;
        hByHeavy.get(heavyId)?.push(bond);
      } else if (!reference.bonds.some(edge => edgeKey(edge.a, edge.b) === edgeKey(mapping.get(a.id), mapping.get(b.id)))) {
        wrong.push(bond);
      }
    }
    for (const atom of currentHeavy) {
      const attached = hByHeavy.get(atom.id) || [];
      wrong.push(...attached.slice(expectedH.get(mapping.get(atom.id)) || 0));
    }
    const reverse = new Map([...mapping].map(([a, b]) => [b, a]));
    for (const bond of heavyGraph(reference).bonds) {
      const a = reverse.get(bond.a), b = reverse.get(bond.b);
      if (a !== undefined && b !== undefined && !graph.bonds.some(edge => edgeKey(edge.a, edge.b) === edgeKey(a, b) && isSingle(edge))) {
        missingHeavyEdges.push({ a, b });
      }
    }
    const result = {
      mapping: new Map(mapping), wrong, missingHeavyEdges,
      hydrogenNeeds: currentHeavy.map(atom => ({ id: atom.id, symbol: atom.symbol,
        expected: expectedH.get(mapping.get(atom.id)) || 0, attached: hByHeavy.get(atom.id)?.length || 0 })),
    };
    if (!best || wrong.length < best.wrong.length || (wrong.length === best.wrong.length && missingHeavyEdges.length < best.missingHeavyEdges.length)) best = result;
  }
  function visit(index) {
    if (index === currentHeavy.length) { score(); return; }
    const atom = currentHeavy[index];
    for (const targetAtom of targetHeavy) {
      if (used.has(targetAtom.id) || targetAtom.symbol !== atom.symbol) continue;
      mapping.set(atom.id, targetAtom.id); used.add(targetAtom.id);
      visit(index + 1);
      used.delete(targetAtom.id); mapping.delete(atom.id);
    }
  }
  visit(0);
  return best;
}

function recognizedHighlights(graph, recognition) {
  // Restrict the alcohol interpretation to whole-graph matches in our curated
  // alcohol references. An acid's C–O–H fragment must not be called an alcohol.
  if (recognition?.family !== 'Alcohol') return null;
  const byId = new Map(graph.atoms.map(atom => [atom.id, atom]));
  for (const oxygen of graph.atoms.filter(atom => atom.symbol === 'O')) {
    const bonds = incident(graph, oxygen.id).filter(isSingle);
    const oh = bonds.find(bond => byId.get(otherEnd(bond, oxygen.id))?.symbol === 'H');
    const oc = bonds.find(bond => byId.get(otherEnd(bond, oxygen.id))?.symbol === 'C');
    if (oh && oc) return { atomIds: [oxygen.id, otherEnd(oh, oxygen.id)], bondKeys: [edgeKey(oh.a, oh.b)], label: '–OH alcohol group' };
  }
  return null;
}

function action(kind, message, extra = {}) {
  return { kind, message, atomIds: [], bondKeys: [], ...extra };
}

/** A serializable view model; recognition always covers the entire canvas. */
export function analyzeDiscovery(graph, { engine, library, targetId = null }) {
  const molecules = library.MOLECULES || library;
  const target = GOAL_BY_ID.get(targetId) || null;
  const validation = engine.validateGraph(graph.atoms, graph.bonds);
  const components = engine.connectedComponents(graph.atoms, graph.bonds).length;
  const counts = engine.graphCounts(graph.atoms);
  const formula = engine.graphFormula(graph.atoms);
  const identity = graph.atoms.length && components === 1 && validation.status === 'valid'
    ? engine.identifyGraph(graph, molecules) : null;
  const known = identity?.key ? GOAL_BY_KEY.get(identity.key) : null;
  const recognition = identity?.key ? {
    key: identity.key, name: identity.name, formula: known?.formula || identity.formula,
    molecularFormula: formula, family: known?.family || identity.molecule?.category || 'Known compound',
    structure: known?.structure || null,
    description: known?.description || 'This complete connection pattern matches a compound in the reference library.',
    sourceUrls: known ? [...known.sourceUrls] : [],
  } : null;
  const inventory = target ? [...new Set([...Object.keys(target.counts), ...Object.keys(counts)])].map(symbol => ({
    symbol, current: counts[symbol] || 0, target: target.counts[symbol] || 0,
    missing: Math.max(0, (target.counts[symbol] || 0) - (counts[symbol] || 0)),
    extra: Math.max(0, (counts[symbol] || 0) - (target.counts[symbol] || 0)),
  })) : Object.entries(counts).map(([symbol, current]) => ({ symbol, current, target: null, missing: 0, extra: 0 }));
  const reference = target ? molecules[target.key] : null;
  const mapping = reference ? bestTargetMapping(graph, reference) : null;
  const neutral = graph.atoms.every(atom => Number(atom.charge || 0) === 0);
  const inventoryComplete = !!target && inventory.every(item => item.missing === 0 && item.extra === 0);
  const skeletonComplete = !!reference && neutral && engine.areGraphsIsomorphic(heavyGraph(graph), heavyGraph(reference));
  const hydrogenComplete = !!target && skeletonComplete && counts.H === target.counts.H &&
    !!mapping && mapping.wrong.length === 0 && mapping.hydrogenNeeds.every(item => item.attached === item.expected);
  const complete = target ? recognition?.key === target.key : !!recognition;
  const milestones = target ? [
    { id: 'inventory', label: `Place ${Object.entries(target.counts).map(([symbol, count]) => `${count} ${symbol}`).join(' · ')}`, complete: inventoryComplete },
    { id: 'skeleton', label: target.skeleton.length > 1 ? `Connect ${target.skeleton} with single bonds` : `Place the central ${target.skeleton} atom`, complete: skeletonComplete },
    { id: 'hydrogens', label: `Attach H to make ${target.structure}`, complete: hydrogenComplete },
    { id: 'identity', label: `Recognize ${target.name.toLowerCase()}`, complete },
  ] : [];
  const atomHints = validation.atomStates.map(state => {
    const next = state.allowed.find(order => order > state.covalentOrder);
    return { id: state.atomId, symbol: state.symbol, bondOrder: state.covalentOrder,
      remainingBonds: state.state === 'open' && next != null ? next - state.covalentOrder : state.state === 'satisfied' ? 0 : null,
      targetBonds: state.state === 'satisfied' ? state.covalentOrder : next ?? null };
  });
  const sameFormulaDifferentStructure = !!target && !!recognition && recognition.key !== target.key && recognition.molecularFormula === target.molecularFormula;
  let nextAction;
  if (validation.status === 'invalid' || validation.status === 'unsupported') {
    nextAction = action('repair', validation.errors[0] || validation.unsupported?.[0] || 'Inspect the marked atoms and bonds before continuing.');
  } else if (complete) {
    nextAction = action('complete', known?.id === 'ethanol'
      ? 'Try dimethyl ether next: keep C₂H₆O, but connect the atoms as CH₃–O–CH₃.'
      : known?.id === 'dimethyl-ether' ? 'Try ethanol next: keep C₂H₆O, but connect the atoms as CH₃–CH₂–OH.'
        : 'Change a bond or try another molecule to see how the identity changes.');
  } else if (!target) {
    nextAction = action(graph.atoms.length ? 'explore' : 'add', graph.atoms.length
      ? components > 1 ? 'These atoms form separate pieces. Connect them to build one molecule.'
        : validation.status === 'valid' ? 'This structure has complete bonding sites, but its identity is not in the reference library. Try another arrangement or choose a molecule goal.'
        : 'Keep building: complete the open bonding sites, or choose a molecule goal for a hint.'
      : 'Add an atom to begin, or choose a molecule goal for a hint.');
  } else if (!neutral) {
    nextAction = action('charge', `${target.name} is neutral at every atom in this reference. Select the charged atoms and set their formal charges to 0.`, {
      atomIds: graph.atoms.filter(atom => Number(atom.charge || 0) !== 0).map(atom => atom.id),
    });
  } else if (inventory.some(item => item.extra)) {
    const extra = inventory.find(item => item.extra);
    nextAction = action('remove', `There ${extra.extra === 1 ? 'is' : 'are'} ${extra.extra} extra ${extra.symbol} atom${extra.extra === 1 ? '' : 's'} for ${target.name.toLowerCase()}. Remove ${extra.extra === 1 ? 'one' : 'them'} or choose another goal.`, {
      symbol: extra.symbol, atomIds: graph.atoms.filter(atom => atom.symbol === extra.symbol).map(atom => atom.id),
    });
  } else if (mapping?.wrong.length) {
    const wrong = mapping.wrong[0];
    const a = graph.atoms.find(atom => atom.id === wrong.a), b = graph.atoms.find(atom => atom.id === wrong.b);
    nextAction = action('rewire', `${isSingle(wrong) ? 'Break' : 'Change'} the highlighted ${a?.symbol}–${b?.symbol} bond${isSingle(wrong) ? '' : ' to a single bond'} to work toward ${target.structure}. ${target.name} needs the ${target.skeleton} skeleton and the H arrangement shown above.`, {
      atomIds: [wrong.a, wrong.b], bondKeys: [edgeKey(wrong.a, wrong.b)],
    });
  } else if (mapping?.missingHeavyEdges.length) {
    const bond = mapping.missingHeavyEdges[0];
    const a = graph.atoms.find(atom => atom.id === bond.a), b = graph.atoms.find(atom => atom.id === bond.b);
    nextAction = action('connect', `Connect the highlighted ${a.symbol} and ${b.symbol} with a single bond to build ${target.skeleton}.`, { atomIds: [bond.a, bond.b] });
  } else if (inventory.some(item => item.symbol !== 'H' && item.missing)) {
    const missing = inventory.find(item => item.symbol !== 'H' && item.missing);
    nextAction = action('add', `Add ${missing.current ? 'another' : missing.symbol === 'O' ? 'an' : 'a'} ${missing.symbol} atom to build the ${target.skeleton} skeleton.`, { symbol: missing.symbol });
  } else {
    const needsH = mapping?.hydrogenNeeds.find(item => item.attached < item.expected);
    const freeH = graph.atoms.find(atom => atom.symbol === 'H' && incident(graph, atom.id).length === 0);
    if (needsH && freeH) {
      nextAction = action('connect', `Connect the highlighted H to ${needsH.symbol} with a single bond. This ${needsH.symbol} needs ${needsH.expected - needsH.attached} more H atom${needsH.expected - needsH.attached === 1 ? '' : 's'} for ${target.name.toLowerCase()}.`, {
        atomIds: [needsH.id, freeH.id],
      });
    } else if (inventory.some(item => item.symbol === 'H' && item.missing)) {
      nextAction = action('add', `Add an H atom${needsH ? ` and connect it to the highlighted ${needsH.symbol}` : ''}. ${target.name} contains ${target.counts.H} H atoms in total.`, {
        symbol: 'H', atomIds: needsH ? [needsH.id] : [],
      });
    } else {
      nextAction = action('rewire', `The atom count alone is not enough. Match the connections in ${target.structure}; every H must have one single bond.`);
    }
  }
  const feedback = sameFormulaDifferentStructure
    ? { tone: 'comparison', title: `You made ${recognition.name.toLowerCase()}!`, message: `It shares ${target.molecularFormula} with ${target.name.toLowerCase()}, but ${recognition.structure} has different connections. A molecular formula does not identify an isomer.` }
    : complete ? { tone: 'success', title: `${recognition.name} recognized`, message: recognition.description }
      : validation.status === 'invalid' || validation.status === 'unsupported' ? { tone: 'warning', title: 'Inspect this structure', message: nextAction.message }
        : { tone: 'progress', title: target ? `Building ${target.name.toLowerCase()}` : graph.atoms.length ? validation.status === 'valid' && components === 1 ? 'Structure complete · identity unknown' : 'A molecule in progress' : 'What will you make?', message: nextAction.message };
  return {
    target, counts, formula, validationStatus: validation.status, components, recognition,
    inventory, milestones, progress: { completed: milestones.filter(step => step.complete).length, total: milestones.length },
    complete: !!complete, nextAction, feedback, atomHints, sameFormulaDifferentStructure,
    highlights: recognizedHighlights(graph, recognition),
  };
}
