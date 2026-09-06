// Browser data is untrusted input. Check its shape without repairing chemistry:
// incomplete and scientifically invalid learner graphs remain representable.
export const MAX_ATOMS = 160;
export const MAX_HISTORY = 70;
const MAX_TEXT = 2_000_000;
export const DRAFT_KEY = 'chemlab.playgroundDraft.v1';
export const SAVED_KEY = 'chemlab.savedStructures.v2';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function readGraph(value, engine) {
  if (!object(value) || !Array.isArray(value.atoms) || !Array.isArray(value.bonds)
    || value.atoms.length > MAX_ATOMS || value.bonds.length > MAX_ATOMS * 4) return null;
  const ids = new Set(), edges = new Set(), atoms = [], bonds = [];
  for (const atom of value.atoms) {
    if (!object(atom) || !Number.isSafeInteger(atom.id) || atom.id < 1 || atom.id > Number.MAX_SAFE_INTEGER - MAX_ATOMS * 2 || ids.has(atom.id)
      || typeof atom.symbol !== 'string' || !Object.hasOwn(engine.ELEMENTS, atom.symbol)
      || !Number.isFinite(atom.x) || !Number.isFinite(atom.y)
      || Math.abs(atom.x) > 1e6 || Math.abs(atom.y) > 1e6
      || !Number.isInteger(atom.charge ?? 0) || Math.abs(atom.charge ?? 0) > 32) return null;
    ids.add(atom.id);
    atoms.push({ id: atom.id, symbol: atom.symbol, charge: atom.charge ?? 0, x: atom.x, y: atom.y });
  }
  for (const bond of value.bonds) {
    if (!object(bond) || !ids.has(bond.a) || !ids.has(bond.b) || bond.a === bond.b) return null;
    const type = bond.type ?? 'single';
    if (typeof type !== 'string' || !Object.hasOwn(engine.BOND_TYPES, type)) return null;
    const order = engine.BOND_TYPES[type].order;
    if (bond.order != null && bond.order !== order) return null;
    const key = [bond.a, bond.b].sort((a, b) => a - b).join(':');
    if (edges.has(key)) return null;
    edges.add(key); bonds.push({ a: bond.a, b: bond.b, type, order });
  }
  return { atoms, bonds };
}

export function readSnapshot(value, engine) {
  const graph = readGraph(value, engine);
  if (!graph) return null;
  const maxId = Math.max(0, ...graph.atoms.map(atom => atom.id));
  const selectedAtomId = graph.atoms.some(atom => atom.id === value.selectedAtomId) ? value.selectedAtomId : null;
  const selectedBondKey = graph.bonds.some(bond => [bond.a, bond.b].sort((a,b) => a-b).join(':') === value.selectedBondKey) ? value.selectedBondKey : null;
  return { ...graph, nextId: Number.isSafeInteger(value.nextId) && value.nextId > maxId && value.nextId <= Number.MAX_SAFE_INTEGER - MAX_ATOMS ? value.nextId : maxId + 1,
    selectedAtomId, selectedBondKey, discoverySource: value.discoverySource === 'reference' ? 'reference' : 'manual' };
}

function parse(text) {
  if (typeof text !== 'string' || text.length > MAX_TEXT) return null;
  try { return JSON.parse(text); } catch { return null; }
}

export function readSavedStructures(text, engine) {
  const value = parse(text);
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).flatMap(item => {
    if (!object(item) || !['string', 'number'].includes(typeof item.id) || typeof item.name !== 'string' || typeof item.formula !== 'string') return [];
    const graph = readGraph(item.graph, engine);
    if (!graph || !graph.atoms.length) return [];
    return [{ id: item.id, name: item.name.slice(0, 160), formula: item.formula.slice(0, 160),
      created: typeof item.created === 'string' ? item.created.slice(0, 40) : '', graph,
      source: item.source === 'reference' ? 'reference' : 'manual' }];
  });
}

export function readDraft(text, engine) {
  const value = parse(text);
  if (!object(value) || value.version !== 1) return null;
  const current = readSnapshot(value.current, engine);
  if (!current) return null;
  const history = (Array.isArray(value.history) ? value.history : []).slice(-MAX_HISTORY)
    .map(item => readSnapshot(typeof item === 'string' ? parse(item) : item, engine)).filter(Boolean).map(item => JSON.stringify(item));
  return { current, history, coach: object(value.coach) ? value.coach : {}, attach: value.attach !== false,
    bondType: typeof value.bondType === 'string' && Object.hasOwn(engine.BOND_TYPES, value.bondType) ? value.bondType : 'single' };
}

export function serializeDraft(value) {
  const history=value.history.slice(-MAX_HISTORY).map(item=>typeof item==='string'?parse(item):item).filter(object);
  let text=JSON.stringify({...value,history});
  while(text.length>MAX_TEXT&&history.length){history.shift();text=JSON.stringify({...value,history});}
  return text.length<=MAX_TEXT?text:null;
}
