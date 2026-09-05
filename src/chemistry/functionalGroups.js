import {
  FUNCTIONAL_GROUP_DEFINITION_BY_ID,
  FUNCTIONAL_GROUP_DEFINITIONS,
  FUNCTIONAL_GROUP_MODEL_BOUNDARY,
  FUNCTIONAL_GROUP_SCENARIO_BY_ID,
} from '../data/functionalGroupScenarios.js';

const ALLOWED_ELEMENTS = new Set(['C', 'H', 'N', 'O', 'F', 'Cl', 'Br', 'I']);
const HALOGENS = new Set(['F', 'Cl', 'Br', 'I']);

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
}

function requireArray(value, label) {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array.`);
  return value;
}

function uniqueStrings(values, label) {
  requireArray(values, label);
  if (!values.every((value) => typeof value === 'string' && value.length > 0)) {
    throw new TypeError(`${label} must contain non-empty string IDs.`);
  }
  if (new Set(values).size !== values.length) throw new RangeError(`${label} must not contain duplicate IDs.`);
  return [...values];
}

function sameSet(first, second) {
  return first.length === second.length && first.every((item) => second.includes(item));
}

function difference(first, second) {
  return first.filter((item) => !second.includes(item));
}

function normaliseGraph({ atoms, bonds }) {
  requireArray(atoms, 'Atoms');
  requireArray(bonds, 'Bonds');
  if (atoms.length < 2 || atoms.length > 40) {
    throw new RangeError('A functional-group graph must contain between 2 and 40 atoms.');
  }

  const atomIds = new Set();
  const normalisedAtoms = atoms.map((record, index) => {
    if (!record || typeof record !== 'object') throw new TypeError(`Atom ${index + 1} must be an object.`);
    if (typeof record.id !== 'string' || !record.id) throw new TypeError(`Atom ${index + 1} requires a non-empty ID.`);
    if (atomIds.has(record.id)) throw new RangeError(`Duplicate atom ID: ${record.id}.`);
    atomIds.add(record.id);
    if (!ALLOWED_ELEMENTS.has(record.element)) throw new RangeError(`Unsupported element in functional-group graph: ${record.element}.`);
    if (!Number.isFinite(record.x) || !Number.isFinite(record.y)) {
      throw new TypeError(`Atom ${record.id} requires finite x and y coordinates.`);
    }
    return {
      id: record.id,
      element: record.element,
      label: record.label ?? record.element,
      role: record.role ?? `${record.element} atom`,
      x: record.x,
      y: record.y,
    };
  });

  const bondIds = new Set();
  const edgeKeys = new Set();
  const normalisedBonds = bonds.map((record, index) => {
    if (!record || typeof record !== 'object') throw new TypeError(`Bond ${index + 1} must be an object.`);
    if (typeof record.id !== 'string' || !record.id) throw new TypeError(`Bond ${index + 1} requires a non-empty ID.`);
    if (bondIds.has(record.id)) throw new RangeError(`Duplicate bond ID: ${record.id}.`);
    bondIds.add(record.id);
    if (!atomIds.has(record.a) || !atomIds.has(record.b)) {
      throw new RangeError(`Bond ${record.id} references an unknown atom.`);
    }
    if (record.a === record.b) throw new RangeError(`Bond ${record.id} cannot connect an atom to itself.`);
    if (!Number.isInteger(record.order) || record.order < 1 || record.order > 3) {
      throw new RangeError(`Bond ${record.id} bond order must be the integer 1, 2, or 3.`);
    }
    const edgeKey = [record.a, record.b].sort().join('::');
    if (edgeKeys.has(edgeKey)) throw new RangeError(`Duplicate edge between ${record.a} and ${record.b}.`);
    edgeKeys.add(edgeKey);
    return { id: record.id, a: record.a, b: record.b, order: record.order };
  });

  const atomById = Object.fromEntries(normalisedAtoms.map((record) => [record.id, record]));
  const bondById = Object.fromEntries(normalisedBonds.map((record) => [record.id, record]));
  const adjacency = Object.fromEntries(normalisedAtoms.map((record) => [record.id, []]));
  for (const edge of normalisedBonds) {
    adjacency[edge.a].push({ atomId: edge.b, bondId: edge.id, order: edge.order });
    adjacency[edge.b].push({ atomId: edge.a, bondId: edge.id, order: edge.order });
  }

  return {
    atoms: normalisedAtoms,
    bonds: normalisedBonds,
    atomById,
    bondById,
    adjacency,
  };
}

function detectMatches(graph) {
  const matches = [];
  const matchKeys = new Set();
  const atom = (id) => graph.atomById[id];
  const neighbours = (id) => graph.adjacency[id];
  const carbonylOxygenEdges = (id) => atom(id).element === 'C'
    ? neighbours(id).filter((edge) => edge.order === 2 && atom(edge.atomId).element === 'O')
    : [];
  const isCarbonylCarbon = (id) => carbonylOxygenEdges(id).length > 0;
  const addMatch = (groupId, atomIds, bondIds, evidence) => {
    const uniqueAtomIds = [...new Set(atomIds)];
    const uniqueBondIds = [...new Set(bondIds)];
    const key = `${groupId}:${[...uniqueAtomIds].sort().join('+')}`;
    if (matchKeys.has(key)) return;
    matchKeys.add(key);
    matches.push({
      id: key,
      groupId,
      atomIds: uniqueAtomIds,
      bondIds: uniqueBondIds,
      evidence,
    });
  };

  for (const oxygen of graph.atoms.filter((record) => record.element === 'O')) {
    const edges = neighbours(oxygen.id);
    const hydrogenEdges = edges.filter((edge) => edge.order === 1 && atom(edge.atomId).element === 'H');
    const carbonEdges = edges.filter((edge) => edge.order === 1 && atom(edge.atomId).element === 'C');
    const nonCarbonylCarbonEdges = carbonEdges.filter((edge) => !isCarbonylCarbon(edge.atomId));
    for (const hydrogenEdge of hydrogenEdges) {
      for (const carbonEdge of nonCarbonylCarbonEdges) {
        addMatch(
          'alcohol',
          [oxygen.id, hydrogenEdge.atomId],
          [carbonEdge.bondId, hydrogenEdge.bondId],
          [
            `${oxygen.label} has a single-bond hydrogen neighbour.`,
            `${oxygen.label} has a single-bond carbon neighbour that is not a carbonyl carbon.`,
          ],
        );
      }
    }
    if (carbonEdges.length === 2 && carbonEdges.every((edge) => !isCarbonylCarbon(edge.atomId))) {
      addMatch(
        'ether',
        [oxygen.id],
        carbonEdges.map((edge) => edge.bondId),
        [
          `${oxygen.label} has two single-bond carbon neighbours.`,
          'Neither carbon neighbour is a carbonyl carbon.',
        ],
      );
    }
  }

  for (const carbon of graph.atoms.filter((record) => record.element === 'C')) {
    const carbonylEdges = carbonylOxygenEdges(carbon.id);
    if (!carbonylEdges.length) continue;
    const singleEdges = neighbours(carbon.id).filter((edge) => edge.order === 1);
    const hydrogenEdges = singleEdges.filter((edge) => atom(edge.atomId).element === 'H');
    const carbonEdges = singleEdges.filter((edge) => atom(edge.atomId).element === 'C');
    const oxygenEdges = singleEdges.filter((edge) => atom(edge.atomId).element === 'O');
    const nitrogenEdges = singleEdges.filter((edge) => atom(edge.atomId).element === 'N');

    for (const carbonylEdge of carbonylEdges) {
      for (const hydrogenEdge of hydrogenEdges) {
        addMatch(
          'aldehyde',
          [carbon.id, carbonylEdge.atomId, hydrogenEdge.atomId],
          [carbonylEdge.bondId, hydrogenEdge.bondId],
          [
            `${carbon.label} is double-bonded to oxygen.`,
            `${carbon.label} also has a single-bond hydrogen neighbour.`,
          ],
        );
      }
      if (carbonEdges.length >= 2) {
        addMatch(
          'ketone',
          [carbon.id, carbonylEdge.atomId],
          [carbonylEdge.bondId, ...carbonEdges.map((edge) => edge.bondId)],
          [
            `${carbon.label} is double-bonded to oxygen.`,
            `${carbon.label} has two single-bond carbon neighbours.`,
          ],
        );
      }
      for (const oxygenEdge of oxygenEdges) {
        const secondOxygen = atom(oxygenEdge.atomId);
        const oxygenHydrogenEdges = neighbours(secondOxygen.id)
          .filter((edge) => edge.order === 1 && atom(edge.atomId).element === 'H');
        const oxygenCarbonEdges = neighbours(secondOxygen.id)
          .filter((edge) => edge.order === 1 && atom(edge.atomId).element === 'C' && edge.atomId !== carbon.id);
        for (const hydrogenEdge of oxygenHydrogenEdges) {
          addMatch(
            'carboxylic-acid',
            [carbon.id, carbonylEdge.atomId, secondOxygen.id, hydrogenEdge.atomId],
            [carbonylEdge.bondId, oxygenEdge.bondId, hydrogenEdge.bondId],
            [
              `${carbon.label} has a C=O bond and a single bond to a second oxygen.`,
              `The second oxygen has a hydrogen neighbour, completing C(=O)–O–H.`,
            ],
          );
        }
        if (oxygenCarbonEdges.length) {
          addMatch(
            'ester',
            [carbon.id, carbonylEdge.atomId, secondOxygen.id],
            [carbonylEdge.bondId, oxygenEdge.bondId, ...oxygenCarbonEdges.map((edge) => edge.bondId)],
            [
              `${carbon.label} has a C=O bond and a single bond to a second oxygen.`,
              'The second oxygen continues to carbon, completing C(=O)–O–C.',
            ],
          );
        }
      }
      for (const nitrogenEdge of nitrogenEdges) {
        const nitrogen = atom(nitrogenEdge.atomId);
        const nitrogenHydrogenEdges = neighbours(nitrogen.id)
          .filter((edge) => edge.order === 1 && atom(edge.atomId).element === 'H');
        addMatch(
          'amide',
          [carbon.id, carbonylEdge.atomId, nitrogen.id, ...nitrogenHydrogenEdges.map((edge) => edge.atomId)],
          [carbonylEdge.bondId, nitrogenEdge.bondId, ...nitrogenHydrogenEdges.map((edge) => edge.bondId)],
          [
            `${carbon.label} is double-bonded to oxygen.`,
            `${nitrogen.label} is directly single-bonded to that carbonyl carbon.`,
          ],
        );
      }
    }
  }

  for (const nitrogen of graph.atoms.filter((record) => record.element === 'N')) {
    const edges = neighbours(nitrogen.id);
    const carbonEdges = edges.filter((edge) => edge.order === 1 && atom(edge.atomId).element === 'C');
    const allSingle = edges.every((edge) => edge.order === 1);
    const attachedToCarbonyl = carbonEdges.some((edge) => isCarbonylCarbon(edge.atomId));
    if (allSingle && carbonEdges.length && !attachedToCarbonyl) {
      const hydrogenEdges = edges.filter((edge) => atom(edge.atomId).element === 'H');
      addMatch(
        'amine',
        [nitrogen.id, ...hydrogenEdges.map((edge) => edge.atomId)],
        edges.map((edge) => edge.bondId),
        [
          `${nitrogen.label} has only single covalent attachments and at least one carbon neighbour.`,
          'No carbon neighbour is a carbonyl carbon.',
        ],
      );
    }
  }

  for (const edge of graph.bonds) {
    const first = atom(edge.a);
    const second = atom(edge.b);
    const elementPair = [first.element, second.element].sort().join('');
    if (edge.order === 3 && elementPair === 'CN') {
      const carbonId = first.element === 'C' ? first.id : second.id;
      const nitrogenId = first.element === 'N' ? first.id : second.id;
      addMatch('nitrile', [carbonId, nitrogenId], [edge.id], ['The displayed endpoints form a carbon–nitrogen triple bond.']);
    }
    if (edge.order === 2 && first.element === 'C' && second.element === 'C') {
      addMatch('alkene', [first.id, second.id], [edge.id], ['The displayed endpoints form a carbon–carbon double bond.']);
    }
    if (edge.order === 3 && first.element === 'C' && second.element === 'C') {
      addMatch('alkyne', [first.id, second.id], [edge.id], ['The displayed endpoints form a carbon–carbon triple bond.']);
    }
    if (edge.order === 1) {
      const carbon = first.element === 'C' ? first : second.element === 'C' ? second : null;
      const halogen = HALOGENS.has(first.element) ? first : HALOGENS.has(second.element) ? second : null;
      if (carbon && halogen && !isCarbonylCarbon(carbon.id)) {
        addMatch(
          'haloalkane',
          [halogen.id],
          [edge.id],
          [`${halogen.label} is single-bonded to a carbon that is not a carbonyl carbon.`],
        );
      }
    }
  }

  const definitionOrder = new Map(FUNCTIONAL_GROUP_DEFINITIONS.map((item, index) => [item.id, index]));
  matches.sort((first, second) => (
    definitionOrder.get(first.groupId) - definitionOrder.get(second.groupId)
    || first.id.localeCompare(second.id)
  ));
  return matches;
}

export function analyzeFunctionalGraph({ atoms, bonds }) {
  const graph = normaliseGraph({ atoms, bonds });
  const matches = detectMatches(graph);
  const inventoryGroupIds = FUNCTIONAL_GROUP_DEFINITIONS
    .filter((definition) => matches.some((match) => match.groupId === definition.id))
    .map((definition) => definition.id);
  return deepFreeze({
    ...graph,
    matches,
    inventoryGroupIds,
    carbonylMatchIds: matches
      .filter((match) => FUNCTIONAL_GROUP_DEFINITION_BY_ID[match.groupId].carbonylUmbrella)
      .map((match) => match.id),
    boundary: FUNCTIONAL_GROUP_MODEL_BOUNDARY,
  });
}

export function analyzeFunctionalGroupScenario(scenarioId) {
  const scenario = FUNCTIONAL_GROUP_SCENARIO_BY_ID[scenarioId];
  if (!scenario) throw new RangeError(`Unknown functional-group scenario: ${scenarioId}.`);
  const graph = analyzeFunctionalGraph({ atoms: scenario.atoms, bonds: scenario.bonds });
  const targetMatch = graph.matches.find((match) => (
    match.groupId === scenario.targetGroupId && sameSet(match.atomIds, scenario.targetAtomIds)
  ));
  if (!targetMatch) {
    throw new RangeError(`Scenario ${scenarioId} does not resolve its declared ${scenario.targetGroupId} target.`);
  }
  const targetDefinition = FUNCTIONAL_GROUP_DEFINITION_BY_ID[scenario.targetGroupId];
  return deepFreeze({
    ...graph,
    scenario,
    targetDefinition,
    targetMatch,
    targetIsCarbonyl: targetDefinition.carbonylUmbrella,
    structuralTrace: [...targetDefinition.decisionSteps],
  });
}

function validateScenarioSelection(scenario, selectedAtomIds) {
  const selected = uniqueStrings(selectedAtomIds, 'Selected atom IDs');
  const knownIds = new Set(scenario.atoms.map((atom) => atom.id));
  for (const id of selected) {
    if (!knownIds.has(id)) throw new RangeError(`Selected atom ${id} is not present in scenario ${scenario.id}.`);
  }
  return selected;
}

export function toggleFunctionalProbeAtom({ scenarioId, selectedAtomIds, atomId }) {
  const scenario = FUNCTIONAL_GROUP_SCENARIO_BY_ID[scenarioId];
  if (!scenario) throw new RangeError(`Unknown functional-group scenario: ${scenarioId}.`);
  const selected = validateScenarioSelection(scenario, selectedAtomIds);
  if (!scenario.atoms.some((atom) => atom.id === atomId)) {
    return deepFreeze({
      allowed: false,
      action: 'blocked',
      selectedAtomIds: selected,
      reason: `Atom ${atomId} is not present in the displayed ${scenario.name} graph. Nothing changed.`,
    });
  }
  if (selected.includes(atomId)) {
    return deepFreeze({
      allowed: true,
      action: 'removed',
      selectedAtomIds: selected.filter((id) => id !== atomId),
      reason: `Atom ${atomId} was removed from the probe. No other socket changed.`,
    });
  }
  if (selected.length >= 9) {
    return deepFreeze({
      allowed: false,
      action: 'blocked',
      selectedAtomIds: selected,
      reason: 'A probe can contain at most nine displayed atoms. Remove one explicitly before adding another.',
    });
  }
  return deepFreeze({
    allowed: true,
    action: 'added',
    selectedAtomIds: [...selected, atomId],
    reason: `Atom ${atomId} was added to the probe. No companion atom was selected automatically.`,
  });
}

function groupLabel(id) {
  return FUNCTIONAL_GROUP_DEFINITION_BY_ID[id]?.label ?? id ?? 'No prediction';
}

function atomLabel(analysis, id) {
  const atom = analysis.atomById[id];
  return atom ? `${atom.label} · ${atom.role}` : id;
}

function inventoryLabel(ids) {
  return ids.length ? ids.map(groupLabel).join(' + ') : 'No groups selected';
}

export function evaluateFunctionalGroupAttempt({ analysis, selectedAtomIds, prediction }) {
  if (!analysis?.scenario || !analysis?.targetMatch || !analysis?.targetDefinition) {
    throw new TypeError('A complete functional-group scenario analysis is required.');
  }
  const selected = validateScenarioSelection(analysis.scenario, selectedAtomIds);
  if (!selected.length) throw new RangeError('Select at least one atom before checking the functional-group probe.');
  if (!prediction || typeof prediction !== 'object' || Array.isArray(prediction)) {
    throw new TypeError('Functional-group prediction must be an object.');
  }
  if (!FUNCTIONAL_GROUP_DEFINITION_BY_ID[prediction.functionalClass]) {
    throw new RangeError('Choose one of the twelve declared functional classes before checking.');
  }
  if (!['yes', 'no'].includes(prediction.carbonylUmbrella)) {
    throw new RangeError('Choose yes or no for the carbonyl umbrella before checking.');
  }
  const learnerInventory = uniqueStrings(prediction.inventoryGroupIds, 'Inventory group IDs');
  for (const id of learnerInventory) {
    if (!FUNCTIONAL_GROUP_DEFINITION_BY_ID[id]) throw new RangeError(`Unknown inventory functional group: ${id}.`);
  }

  const expectedAtomIds = analysis.targetMatch.atomIds;
  const missingAtomIds = difference(expectedAtomIds, selected);
  const extraAtomIds = difference(selected, expectedAtomIds);
  const expectedCarbonyl = analysis.targetIsCarbonyl ? 'yes' : 'no';
  const missingGroupIds = difference(analysis.inventoryGroupIds, learnerInventory);
  const extraGroupIds = difference(learnerInventory, analysis.inventoryGroupIds);
  const probeCorrect = sameSet(selected, expectedAtomIds);
  const inventoryCorrect = sameSet(learnerInventory, analysis.inventoryGroupIds);

  const dimensions = {
    probe: {
      correct: probeCorrect,
      label: 'Characteristic-atom probe',
      learner: selected,
      expected: [...expectedAtomIds],
      learnerLabel: selected.map((id) => atomLabel(analysis, id)).join('; '),
      expectedLabel: expectedAtomIds.map((id) => atomLabel(analysis, id)).join('; '),
      missingAtomIds,
      extraAtomIds,
      reason: probeCorrect
        ? 'Your probe contains exactly the displayed characteristic atoms for this target.'
        : `${missingAtomIds.length ? `Missing ${missingAtomIds.map((id) => atomLabel(analysis, id)).join(', ')}.` : 'No target atom is missing.'} ${extraAtomIds.length ? `Extra ${extraAtomIds.map((id) => atomLabel(analysis, id)).join(', ')}.` : 'No extra atom was selected.'}`,
    },
    functionalClass: {
      correct: prediction.functionalClass === analysis.scenario.targetGroupId,
      label: 'Target functional class',
      learner: prediction.functionalClass,
      expected: analysis.scenario.targetGroupId,
      learnerLabel: groupLabel(prediction.functionalClass),
      expectedLabel: analysis.targetDefinition.label,
      reason: analysis.targetMatch.evidence.join(' '),
    },
    carbonylUmbrella: {
      correct: prediction.carbonylUmbrella === expectedCarbonyl,
      label: 'Broad carbonyl-compound umbrella',
      learner: prediction.carbonylUmbrella,
      expected: expectedCarbonyl,
      learnerLabel: prediction.carbonylUmbrella === 'yes' ? 'Yes' : 'No',
      expectedLabel: expectedCarbonyl === 'yes' ? 'Yes' : 'No',
      reason: analysis.targetIsCarbonyl
        ? `${analysis.targetDefinition.label} contains C=O and sits inside the broad carbonyl-compound umbrella used by this board.`
        : `${analysis.targetDefinition.label} does not contain a C=O bond in this board.`,
    },
    inventory: {
      correct: inventoryCorrect,
      label: 'Whole-molecule inventory',
      learner: learnerInventory,
      expected: [...analysis.inventoryGroupIds],
      learnerLabel: inventoryLabel(learnerInventory),
      expectedLabel: inventoryLabel(analysis.inventoryGroupIds),
      missingGroupIds,
      extraGroupIds,
      reason: inventoryCorrect
        ? 'Your inventory contains every separately countable declared group and no suppressed nested label.'
        : `${missingGroupIds.length ? `Missing ${inventoryLabel(missingGroupIds)}.` : 'No declared group is missing.'} ${extraGroupIds.length ? `Unsupported extra ${inventoryLabel(extraGroupIds)}.` : 'No unsupported extra group was selected.'}`,
    },
  };
  const correct = Object.values(dimensions).filter((dimension) => dimension.correct).length;
  return deepFreeze({
    learnerSelection: selected,
    learnerPrediction: {
      functionalClass: prediction.functionalClass,
      carbonylUmbrella: prediction.carbonylUmbrella,
      inventoryGroupIds: learnerInventory,
    },
    answer: {
      targetAtomIds: [...expectedAtomIds],
      functionalClass: analysis.scenario.targetGroupId,
      carbonylUmbrella: expectedCarbonyl,
      inventoryGroupIds: [...analysis.inventoryGroupIds],
    },
    dimensions,
    score: { correct, total: 4 },
    committed: correct === 4,
  });
}

export function nextFunctionalGroupHint({ analysis, selectedAtomIds, level }) {
  if (!analysis?.scenario || !analysis?.targetMatch || !analysis?.targetDefinition) {
    throw new TypeError('A complete functional-group scenario analysis is required.');
  }
  const selected = validateScenarioSelection(analysis.scenario, selectedAtomIds);
  if (!Number.isInteger(level) || level < 1 || level > 4) {
    throw new RangeError('Functional-group hint level must be an integer between 1 and 4.');
  }
  if (level === 1) {
    return `Inspect the highest bond order near the mission target and then inspect the element and immediate neighbours at both endpoints. Your current probe contains ${selected.length} atom${selected.length === 1 ? '' : 's'}; no socket has been changed.`;
  }
  const targetAtoms = analysis.targetMatch.atomIds.map((id) => analysis.atomById[id]);
  const elementCounts = Object.entries(targetAtoms.reduce((counts, atom) => ({
    ...counts,
    [atom.element]: (counts[atom.element] ?? 0) + 1,
  }), {})).map(([element, count]) => `${count} ${element}`).join(', ');
  const highestBondOrder = Math.max(...analysis.targetMatch.bondIds.map((id) => analysis.bondById[id].order));
  if (level === 2) {
    return `The characteristic selection contains ${elementCounts}. Its structural context reaches bond order ${highestBondOrder}; check which atoms carry that bond and what else the central atom touches.`;
  }
  if (level === 3) {
    return `Route the evidence through these gates: ${analysis.structuralTrace.slice(0, 2).join(' Then: ')}`;
  }
  return `Select ${analysis.targetMatch.atomIds.map((id) => atomLabel(analysis, id)).join('; ')}. The target class is ${analysis.targetDefinition.label}, carbonyl umbrella ${analysis.targetIsCarbonyl ? 'yes' : 'no'}, and the complete declared inventory is ${inventoryLabel(analysis.inventoryGroupIds)}.`;
}
