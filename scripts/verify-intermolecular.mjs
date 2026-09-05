import assert from 'node:assert/strict';
import {
  INTERACTION_ENTITIES,
  INTERACTION_ENTITY_BY_ID,
  INTERACTION_FAMILIES,
  INTERACTION_PAIR_BY_ID,
  INTERACTION_PAIR_SCENARIOS,
  SOLVATION_SHELL_BY_ID,
  SOLVATION_SHELL_SCENARIOS,
} from '../src/data/intermolecularScenarios.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../src/data/scienceSources.js';
import {
  analyzePairInteraction,
  analyzeSolvationShell,
  attemptPairInteraction,
  breakPairInteraction,
  createPairAlignmentReference,
  createPairInteractionState,
  createSolvationReference,
  createSolvationShellState,
  evaluatePairPrediction,
  evaluateSolvationPrediction,
  nextPairInteractionHint,
  nextSolvationHint,
  rotatePairEntity,
  selectPairSite,
  toggleWaterCompass,
} from '../src/chemistry/intermolecularInteractions.js';

const familyIds = Object.keys(INTERACTION_FAMILIES);
const allowedRoles = new Set([
  'polarizable-cloud',
  'partial-positive',
  'partial-negative',
  'donor-hydrogen',
  'acceptor-region',
  'cation',
  'anion',
]);

assert.equal(familyIds.length, 4);
assert.equal(Object.keys(INTERACTION_ENTITIES).length, 6);
assert.equal(INTERACTION_PAIR_SCENARIOS.length, 6);
assert.equal(SOLVATION_SHELL_SCENARIOS.length, 2);
assert.deepEqual(INTERACTION_PAIR_BY_ID['water-water'].familiesPresent, [
  'london-dispersion',
  'dipole-dipole',
  'hydrogen-bond',
]);
assert.equal(INTERACTION_PAIR_BY_ID['hcl-hcl'].familiesPresent.includes('london-dispersion'), true);
assert.equal(MODEL_PASSPORTS.interactionObservatory.sources.length, 11);
assert.match(MODEL_PASSPORTS.interactionObservatory.resultKind, /not interaction energy/i);
assert.ok(Object.isFrozen(INTERACTION_FAMILIES));
assert.ok(Object.isFrozen(INTERACTION_ENTITIES));
assert.ok(Object.isFrozen(INTERACTION_PAIR_SCENARIOS));

for (const family of Object.values(INTERACTION_FAMILIES)) {
  assert.ok(Object.isFrozen(family));
  assert.ok(Object.isFrozen(family.sourceIds));
  assert.ok(family.sourceIds.length >= 2);
  for (const sourceId of family.sourceIds) assert.ok(SCIENCE_SOURCES[sourceId], `${family.id} source ${sourceId}`);
}

for (const entity of Object.values(INTERACTION_ENTITIES)) {
  assert.equal(INTERACTION_ENTITY_BY_ID[entity.id], entity);
  assert.ok(Object.isFrozen(entity));
  assert.ok(Object.isFrozen(entity.atoms));
  assert.ok(Object.isFrozen(entity.bonds));
  assert.ok(Object.isFrozen(entity.sites));
  assert.equal(new Set(entity.atoms.map((atom) => atom.id)).size, entity.atoms.length);
  assert.equal(new Set(entity.sites.map((site) => site.id)).size, entity.sites.length);
  for (const site of entity.sites) {
    assert.ok(allowedRoles.has(site.role), `${entity.id} site role ${site.role}`);
    assert.ok(Object.isFrozen(site));
  }
}

for (const scenario of INTERACTION_PAIR_SCENARIOS) {
  const entityA = INTERACTION_ENTITY_BY_ID[scenario.entityAId];
  const entityB = INTERACTION_ENTITY_BY_ID[scenario.entityBId];
  assert.ok(entityA);
  assert.ok(entityB);
  assert.ok(scenario.familiesPresent.includes(scenario.focusFamilyId));
  assert.ok(Object.isFrozen(scenario));
  assert.ok(Object.isFrozen(scenario.defaultRotationsDeg));
  assert.ok(Object.isFrozen(scenario.validContacts));
  assert.ok(scenario.validContacts.some((contact) => contact.familyId === scenario.focusFamilyId));
  for (const contact of scenario.validContacts) {
    assert.ok(Object.isFrozen(contact));
    assert.ok(scenario.familiesPresent.includes(contact.familyId));
    assert.ok(entityA.sites.some((site) => site.id === contact.aSiteId));
    assert.ok(entityB.sites.some((site) => site.id === contact.bSiteId));
    if (contact.referenceRotationsDeg) assert.ok(Object.isFrozen(contact.referenceRotationsDeg));
  }
}

for (const sourceId of MODEL_PASSPORTS.interactionObservatory.sources) {
  assert.ok(SCIENCE_SOURCES[sourceId], `passport source ${sourceId}`);
}

assert.throws(() => createPairInteractionState('unknown-pair'), /Unknown pair scenario/);
assert.throws(() => createSolvationShellState('unknown-shell'), /Unknown solvation scenario/);

for (const scenario of INTERACTION_PAIR_SCENARIOS) {
  const focusContact = scenario.validContacts.find((contact) => contact.familyId === scenario.focusFamilyId);
  const initial = createPairInteractionState(scenario.id);
  assert.equal(initial.scenarioId, scenario.id);
  assert.deepEqual(initial.selectedSites, { a: '', b: '' });
  assert.equal(initial.bridge, null);
  assert.ok(Object.isFrozen(initial));
  assert.ok(Object.isFrozen(initial.rotationsDeg));
  assert.ok(Object.isFrozen(initial.selectedSites));

  assert.throws(
    () => selectPairSite({ scenarioId: scenario.id, state: initial, entityKey: 'a', siteId: 'missing-site' }),
    /Unknown site/,
  );
  assert.throws(
    () => rotatePairEntity({ scenarioId: scenario.id, state: initial, entityKey: 'b', rotationDeg: Number.NaN }),
    /finite angle/,
  );

  const aSelected = selectPairSite({
    scenarioId: scenario.id,
    state: initial,
    entityKey: 'a',
    siteId: focusContact.aSiteId,
  });
  assert.equal(aSelected.selectedSites.a, focusContact.aSiteId);
  assert.equal(aSelected.selectedSites.b, '');
  assert.equal(initial.selectedSites.a, '');
  const selectionToggled = selectPairSite({
    scenarioId: scenario.id,
    state: aSelected,
    entityKey: 'a',
    siteId: focusContact.aSiteId,
  });
  assert.equal(selectionToggled.selectedSites.a, '');
  assert.equal(selectionToggled.rotationsDeg.a, aSelected.rotationsDeg.a);

  const missing = attemptPairInteraction({
    scenarioId: scenario.id,
    state: aSelected,
    familyId: scenario.focusFamilyId,
  });
  assert.equal(missing.changed, false);
  assert.equal(missing.state, aSelected);
  assert.equal(missing.outcome.status, 'missing-selection');

  let selected = selectPairSite({
    scenarioId: scenario.id,
    state: aSelected,
    entityKey: 'b',
    siteId: focusContact.bSiteId,
  });
  if (scenario.id !== 'methane-methane') {
    const before = JSON.stringify(selected);
    const misaligned = attemptPairInteraction({
      scenarioId: scenario.id,
      state: selected,
      familyId: scenario.focusFamilyId,
    });
    assert.equal(misaligned.changed, false, scenario.id);
    assert.equal(misaligned.state, selected);
    assert.equal(misaligned.outcome.status, 'misaligned');
    assert.equal(JSON.stringify(selected), before);
    assert.ok(misaligned.outcome.evidence.maximumErrorDeg > misaligned.outcome.evidence.toleranceDeg);
  }

  const reference = createPairAlignmentReference(scenario.id, focusContact.id);
  assert.equal(reference.bridge, null);
  assert.equal(reference.selectedSites.a, focusContact.aSiteId);
  assert.equal(reference.selectedSites.b, focusContact.bSiteId);
  assert.ok(Object.isFrozen(reference));
  const alignedAnalysis = analyzePairInteraction({ scenarioId: scenario.id, state: reference });
  assert.equal(alignedAnalysis.matchedContact.id, focusContact.id);
  assert.equal(alignedAnalysis.alignment.aligned, true);
  assert.deepEqual(alignedAnalysis.families.map((family) => family.id), scenario.familiesPresent);

  const formation = attemptPairInteraction({
    scenarioId: scenario.id,
    state: reference,
    familyId: scenario.focusFamilyId,
  });
  assert.equal(formation.changed, true);
  assert.equal(formation.outcome.status, 'formed');
  assert.equal(formation.state.bridge.contactId, focusContact.id);
  assert.ok(Object.isFrozen(formation.state.bridge));
  assert.equal(reference.bridge, null);

  const blockedFormation = attemptPairInteraction({
    scenarioId: scenario.id,
    state: formation.state,
    familyId: scenario.focusFamilyId,
  });
  assert.equal(blockedFormation.changed, false);
  assert.equal(blockedFormation.state, formation.state);
  assert.equal(blockedFormation.outcome.status, 'bridge-present');

  const turned = rotatePairEntity({
    scenarioId: scenario.id,
    state: formation.state,
    entityKey: 'b',
    rotationDeg: formation.state.rotationsDeg.b + 90,
  });
  assert.equal(turned.bridge, formation.state.bridge);
  assert.notEqual(turned, formation.state);
  const turnedAnalysis = analyzePairInteraction({ scenarioId: scenario.id, state: turned });
  assert.equal(
    turnedAnalysis.bridge.status,
    scenario.focusFamilyId === 'london-dispersion' ? 'aligned' : 'strained',
    scenario.id,
  );

  const cleavage = breakPairInteraction({ scenarioId: scenario.id, state: turned });
  assert.equal(cleavage.changed, true);
  assert.equal(cleavage.outcome.status, 'broken');
  assert.equal(cleavage.state.bridge, null);
  assert.deepEqual(cleavage.state.selectedSites, turned.selectedSites);
  assert.deepEqual(cleavage.state.rotationsDeg, turned.rotationsDeg);
  const noBridge = breakPairInteraction({ scenarioId: scenario.id, state: cleavage.state });
  assert.equal(noBridge.changed, false);
  assert.equal(noBridge.state, cleavage.state);
  assert.equal(noBridge.outcome.status, 'no-bridge');

  const expectedOrientation = scenario.id === 'methane-methane'
    ? 'orientation-not-specific-in-this-model'
    : 'opposite-electrostatic-ends-face';
  const prediction = Object.freeze({
    families: Object.freeze([...scenario.familiesPresent].reverse()),
    orientation: expectedOrientation,
    covalentChange: 'none',
  });
  const predictionBefore = JSON.stringify(prediction);
  const evaluation = evaluatePairPrediction({ scenarioId: scenario.id, prediction });
  assert.equal(evaluation.dimensions.families.correct, true);
  assert.equal(evaluation.dimensions.orientation.correct, true);
  assert.equal(evaluation.dimensions.covalentChange.correct, true);
  assert.deepEqual(evaluation.learnerPrediction.families, prediction.families);
  assert.equal(JSON.stringify(prediction), predictionBefore);

  const wrongPrediction = Object.freeze({
    families: Object.freeze([]),
    orientation: expectedOrientation === 'opposite-electrostatic-ends-face'
      ? 'same-electrostatic-ends-face'
      : 'opposite-electrostatic-ends-face',
    covalentChange: 'bond-formed',
  });
  const wrong = evaluatePairPrediction({ scenarioId: scenario.id, prediction: wrongPrediction });
  assert.equal(wrong.dimensions.families.correct, false);
  assert.equal(wrong.dimensions.orientation.correct, false);
  assert.equal(wrong.dimensions.covalentChange.correct, false);

  for (let level = 1; level <= 4; level += 1) {
    const stateBefore = JSON.stringify(selected);
    const hint = nextPairInteractionHint({ scenarioId: scenario.id, state: selected, level });
    assert.equal(hint.level, level);
    assert.ok(hint.title.length > 3);
    assert.ok(hint.detail.length > 20);
    assert.equal(JSON.stringify(selected), stateBefore);
    assert.ok(Object.isFrozen(hint));
  }
}

let unsupported = createPairInteractionState('hcl-hcl');
unsupported = selectPairSite({ scenarioId: 'hcl-hcl', state: unsupported, entityKey: 'a', siteId: 'h-positive' });
unsupported = selectPairSite({ scenarioId: 'hcl-hcl', state: unsupported, entityKey: 'b', siteId: 'cl-negative' });
const unsupportedAttempt = attemptPairInteraction({ scenarioId: 'hcl-hcl', state: unsupported, familyId: 'hydrogen-bond' });
assert.equal(unsupportedAttempt.changed, false);
assert.equal(unsupportedAttempt.state, unsupported);
assert.equal(unsupportedAttempt.outcome.status, 'unsupported-contact');

for (const scenario of SOLVATION_SHELL_SCENARIOS) {
  assert.equal(SOLVATION_SHELL_BY_ID[scenario.id], scenario);
  assert.equal(scenario.slots.length, 6);
  assert.ok(Object.isFrozen(scenario.slots));
  const initial = createSolvationShellState(scenario.id);
  assert.ok(Object.isFrozen(initial));
  assert.ok(Object.isFrozen(initial.orientationBySlot));
  const analysis = analyzeSolvationShell({ scenarioId: scenario.id, state: initial });
  assert.equal(analysis.correctCount, 3);
  assert.equal(analysis.incorrectCount, 3);
  assert.equal(analysis.slots.length, 6);
  assert.equal(analysis.expectedInwardEnd, scenario.expectedInwardEnd);

  const firstSlot = scenario.slots[0].id;
  const toggled = toggleWaterCompass({ scenarioId: scenario.id, state: initial, slotId: firstSlot });
  assert.notEqual(toggled, initial);
  assert.notEqual(toggled.orientationBySlot[firstSlot], initial.orientationBySlot[firstSlot]);
  for (const slot of scenario.slots.slice(1)) {
    assert.equal(toggled.orientationBySlot[slot.id], initial.orientationBySlot[slot.id]);
  }
  assert.throws(
    () => toggleWaterCompass({ scenarioId: scenario.id, state: initial, slotId: 'missing-slot' }),
    /Unknown shell slot/,
  );

  const reference = createSolvationReference(scenario.id);
  const referenceAnalysis = analyzeSolvationShell({ scenarioId: scenario.id, state: reference });
  assert.equal(referenceAnalysis.correctCount, 6);
  assert.equal(referenceAnalysis.incorrectCount, 0);
  assert.ok(referenceAnalysis.slots.every((slot) => slot.correct));

  const prediction = Object.freeze({
    favoredEnd: scenario.expectedInwardEnd,
    correctlyOrientedCount: '6',
  });
  const predictionBefore = JSON.stringify(prediction);
  const evaluation = evaluateSolvationPrediction({ scenarioId: scenario.id, prediction });
  assert.equal(evaluation.dimensions.favoredEnd.correct, true);
  assert.equal(evaluation.dimensions.correctlyOrientedCount.correct, true);
  assert.equal(evaluation.learnerPrediction.correctlyOrientedCount, '6');
  assert.equal(JSON.stringify(prediction), predictionBefore);
  const wrong = evaluateSolvationPrediction({
    scenarioId: scenario.id,
    prediction: {
      favoredEnd: scenario.expectedInwardEnd === 'oxygen' ? 'hydrogen' : 'oxygen',
      correctlyOrientedCount: '2',
    },
  });
  assert.equal(wrong.dimensions.favoredEnd.correct, false);
  assert.equal(wrong.dimensions.correctlyOrientedCount.correct, false);
  assert.equal(wrong.learnerPrediction.correctlyOrientedCount, '2');

  for (let level = 1; level <= 4; level += 1) {
    const stateBefore = JSON.stringify(initial);
    const hint = nextSolvationHint({ scenarioId: scenario.id, state: initial, level });
    assert.equal(hint.level, level);
    assert.ok(hint.title.length > 3);
    assert.ok(hint.detail.length > 20);
    assert.equal(JSON.stringify(initial), stateBefore);
    assert.ok(Object.isFrozen(hint));
  }
}

console.log('Four interaction families, six frozen entities, six pair docks, and two symbolic solvation shells verified.');
console.log('Immutable selection, rotation, explicit formation, rejected attempts, strained retention, manual cleavage, multi-dimensional predictions, references, and hints verified.');
