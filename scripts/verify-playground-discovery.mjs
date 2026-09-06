import assert from 'node:assert/strict';
import { ChemistryEngine as engine, ChemistryLibrary as baseLibrary } from '../src/chemistry/runtime.js';
import { DISCOVERY_GOALS, analyzeDiscovery, createDiscoveryLibrary } from '../src/chemistry/playgroundDiscovery.js';

const clone = value => structuredClone(value);
const beforeLibrary = JSON.stringify(baseLibrary);
const library = createDiscoveryLibrary(baseLibrary);
const analyze = (graph, targetId = 'ethanol') => analyzeDiscovery(graph, { engine, library, targetId });
const ethanol = clone(library.MOLECULES.C2H5OH);
const ether = clone(library.MOLECULES.CH3OCH3);
const edgeKey = bond => [bond.a, bond.b].sort((a, b) => a - b).join(':');

assert.equal(JSON.stringify(baseLibrary), beforeLibrary, 'Enriching the library must not mutate the base');
assert.equal(baseLibrary.MOLECULES.CH3OCH3, undefined);
assert.notEqual(library.MOLECULES, baseLibrary.MOLECULES);
assert.notEqual(library.VISIBLE_PRESETS, baseLibrary.VISIBLE_PRESETS);
assert.equal(library.VISIBLE_PRESETS.filter(key => key === 'CH3OCH3').length, 1);
assert.deepEqual(createDiscoveryLibrary(library).VISIBLE_PRESETS, library.VISIBLE_PRESETS);
assert.equal(ether.atoms.filter(atom => atom.symbol === 'H').length, 6);
assert.equal(ether.bonds.length, 8);
assert.ok(ether.bonds.every(bond => bond.type === 'single' && bond.order === 1));
assert.equal(engine.validateGraph(ether.atoms, ether.bonds).status, 'valid');
assert.equal(engine.graphFormula(ethanol.atoms), engine.graphFormula(ether.atoms));
assert.equal(engine.areGraphsIsomorphic(ethanol, ether), false);

for (const goal of DISCOVERY_GOALS) {
  const graph = clone(library.MOLECULES[goal.key]);
  const graphBefore = JSON.stringify(graph);
  const result = analyze(graph, goal.id);
  assert.equal(result.recognition?.key, goal.key);
  assert.equal(result.complete, true);
  assert.equal(result.validationStatus, 'valid');
  assert.equal(result.components, 1);
  assert.equal(result.progress.completed, result.progress.total);
  assert.equal(result.nextAction.kind, 'complete');
  assert.equal(result.recognition.molecularFormula, goal.molecularFormula);
  assert.ok(result.atomHints.every(atom => atom.remainingBonds === 0));
  assert.equal(JSON.stringify(graph), graphBefore, 'Analysis must not change its graph');
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result, 'The view model must be JSON serializable');

  // IDs, atom order, bond order, bond direction, and coordinates carry no identity.
  const ids = new Map(graph.atoms.map((atom, index) => [atom.id, 1400 + (graph.atoms.length - index) * 17]));
  const permuted = {
    atoms: graph.atoms.map(atom => ({ ...atom, id: ids.get(atom.id), x: atom.x * -2 + 17, y: atom.y + 309 })).reverse(),
    bonds: graph.bonds.map(bond => ({ ...bond, a: ids.get(bond.b), b: ids.get(bond.a) })).reverse(),
  };
  const permutedResult = analyze(permuted, goal.id);
  assert.equal(permutedResult.recognition?.key, goal.key);
  assert.equal(permutedResult.complete, true);
  assert.deepEqual(permutedResult.progress, result.progress);
}

const isomerResult = analyze(ether);
assert.equal(isomerResult.complete, false);
assert.equal(isomerResult.recognition.key, 'CH3OCH3');
assert.equal(isomerResult.sameFormulaDifferentStructure, true);
assert.equal(isomerResult.feedback.tone, 'comparison');
assert.equal(isomerResult.nextAction.kind, 'rewire');
assert.equal(isomerResult.milestones.find(step => step.id === 'inventory').complete, true);
assert.equal(isomerResult.milestones.find(step => step.id === 'skeleton').complete, false);
assert.equal(isomerResult.highlights, null);
assert.equal(analyze(ethanol, 'dimethyl-ether').sameFormulaDifferentStructure, true);
assert.equal(analyze(ethanol).highlights.label, '–OH alcohol group');
const highlightedAtoms = analyze(ethanol).highlights.atomIds.map(id => ethanol.atoms.find(atom => atom.id === id).symbol).sort();
assert.deepEqual(highlightedAtoms, ['H', 'O']);
assert.equal(analyze(library.MOLECULES.CH3COOH, null).highlights, null, 'Acid hydroxyl must not be identified as an alcohol');

// Every single missing edge removes completion, including one missing O–H.
for (const removed of ethanol.bonds) {
  const graph = { atoms: clone(ethanol.atoms), bonds: ethanol.bonds.filter(bond => bond !== removed).map(bond => ({ ...bond })) };
  const result = analyze(graph);
  assert.equal(result.complete, false);
  assert.equal(result.recognition, null);
  assert.equal(result.components, 2);
  assert.equal(result.sameFormulaDifferentStructure, false, 'An incomplete graph is not a named isomer');
  assert.equal(result.nextAction.kind, 'connect');
  assert.deepEqual([...result.nextAction.atomIds].sort((a, b) => a - b), [removed.a, removed.b].sort((a, b) => a - b));
  graph.bonds.push({ ...removed });
  assert.equal(analyze(graph).complete, true, 'Undoing a break must immediately restore recognition');
}

const oxygen = ethanol.atoms.find(atom => atom.symbol === 'O');
const hydroxylBond = ethanol.bonds.find(bond => (bond.a === oxygen.id || bond.b === oxygen.id) &&
  ethanol.atoms.find(atom => atom.id === (bond.a === oxygen.id ? bond.b : bond.a)).symbol === 'H');
const hydroxylH = hydroxylBond.a === oxygen.id ? hydroxylBond.b : hydroxylBond.a;
const missingHydroxyl = {
  atoms: ethanol.atoms.filter(atom => atom.id !== hydroxylH),
  bonds: ethanol.bonds.filter(bond => bond !== hydroxylBond),
};
const missingResult = analyze(missingHydroxyl);
assert.equal(missingResult.formula, 'C2H5O');
assert.equal(missingResult.recognition, null);
assert.equal(missingResult.highlights, null);
assert.equal(missingResult.nextAction.kind, 'add');
assert.equal(missingResult.nextAction.symbol, 'H');
assert.deepEqual(missingResult.nextAction.atomIds, [oxygen.id]);

const charged = clone(missingHydroxyl);
charged.atoms.find(atom => atom.id === oxygen.id).charge = -1;
const chargedResult = analyze(charged);
assert.equal(chargedResult.recognition, null);
assert.equal(chargedResult.complete, false);
assert.equal(chargedResult.nextAction.kind, 'charge');
assert.deepEqual(chargedResult.nextAction.atomIds, [oxygen.id]);
const unsupported = clone(ethanol);
unsupported.atoms.find(atom => atom.id === oxygen.id).charge = 9;
assert.equal(analyze(unsupported).nextAction.kind, 'repair');
assert.equal(analyze(unsupported).recognition, null);
const rejectionBefore = JSON.stringify(ethanol);
assert.equal(engine.canSetAtomCharge(ethanol.atoms, ethanol.bonds, oxygen.id, -1).ok, false);
assert.equal(JSON.stringify(ethanol), rejectionBefore, 'Rejected charge must leave discovery identity unchanged');
assert.equal(analyze(ethanol).complete, true);

const extraAtom = clone(ethanol);
extraAtom.atoms.push({ id: 990, symbol: 'He', charge: 0, x: 555, y: 555 });
const extraResult = analyze(extraAtom);
assert.equal(extraResult.complete, false);
assert.equal(extraResult.recognition, null, 'A recognizable fragment cannot name the entire canvas');
assert.equal(extraResult.nextAction.kind, 'remove');
assert.equal(extraResult.nextAction.symbol, 'He');
assert.equal(extraResult.inventory.find(item => item.symbol === 'He').extra, 1);

const loose = { atoms: clone(ethanol.atoms), bonds: [] };
assert.equal(analyze(loose).recognition, null);
assert.equal(analyze(loose).progress.completed, 1, 'Correct counts alone only complete inventory');
assert.equal(analyze(loose).nextAction.kind, 'connect');
assert.equal(analyze({ atoms: [], bonds: [] }).nextAction.symbol, 'C');
assert.equal(analyze({ atoms: [{ id: 1, symbol: 'C', charge: 0 }], bonds: [] }).nextAction.symbol, 'C');
assert.equal(analyze({ atoms: [{ id: 1, symbol: 'C', charge: 0 }, { id: 2, symbol: 'C', charge: 0 }], bonds: [] }).nextAction.kind, 'connect');

// Build in reverse edge order (O–H first), then undo all the way to loose atoms.
// Milestones follow the graph, with no requirement to follow the displayed order.
const nonlinear = { atoms: clone(ethanol.atoms), bonds: [] };
for (const bond of [...ethanol.bonds].reverse()) {
  nonlinear.bonds.push({ ...bond });
  const result = analyze(nonlinear);
  assert.equal(result.complete, nonlinear.bonds.length === ethanol.bonds.length);
  assert.ok(!['repair', 'rewire'].includes(result.nextAction.kind));
}
assert.equal(analyze(nonlinear).progress.completed, 4);
while (nonlinear.bonds.length) {
  nonlinear.bonds.pop();
  assert.equal(analyze(nonlinear).complete, false);
}
assert.equal(analyze(nonlinear).progress.completed, 1);

const hh = { atoms: [{ id: 1, symbol: 'H', charge: 0 }, { id: 2, symbol: 'H', charge: 0 }], bonds: [{ a: 1, b: 2, type: 'single', order: 1 }] };
assert.equal(analyze(hh).nextAction.kind, 'rewire');
assert.equal(analyze(hh).recognition.key, 'H2', 'Existing non-goal references remain recognizable');
assert.equal(analyze(hh, null).complete, true);
assert.equal(analyze({ atoms: [], bonds: [] }, null).complete, false);
assert.equal(analyze({ atoms: [], bonds: [] }, null).recognition, null);
assert.equal(analyze({ atoms: [], bonds: [] }, 'unknown-goal').target, null);
const limitedLibrary = { ...library.MOLECULES };
delete limitedLibrary.CH4;
const unrecognized = analyzeDiscovery(library.MOLECULES.CH4, { engine, library: limitedLibrary });
assert.equal(unrecognized.recognition, null);
assert.equal(unrecognized.complete, false);
assert.match(unrecognized.feedback.title, /identity unknown/);
assert.match(unrecognized.nextAction.message, /not in the reference library/);

// Returned hints must be applicable to this graph and point at actual objects.
for (const graph of [loose, missingHydroxyl, ether, extraAtom, charged]) {
  const result = analyze(graph);
  for (const id of result.nextAction.atomIds) assert.ok(graph.atoms.some(atom => atom.id === id));
  for (const key of result.nextAction.bondKeys) assert.ok(graph.bonds.some(bond => edgeKey(bond) === key));
  if (result.nextAction.kind === 'connect') {
    assert.equal(engine.canApplyBond(graph.atoms, graph.bonds, ...result.nextAction.atomIds, 'single').ok, true);
  }
}
assert.equal(JSON.stringify(baseLibrary), beforeLibrary);
console.log('Playground discovery verified: six full-graph identities, isomers, graph permutations, hints, charges, explicit hydrogens, nonlinear progress, undo, and input immutability.');
