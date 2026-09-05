import assert from 'node:assert/strict';
import {
  ELECTRON_DOMAIN_GEOMETRIES,
  ELECTRON_DOMAIN_GEOMETRY_LIST,
  MOLECULAR_GEOMETRY_SCENARIOS,
  MOLECULAR_GEOMETRY_SCENARIO_BY_ID,
} from '../src/data/molecularGeometryScenarios.js';
import {
  buildReferenceDomainState,
  calculatePolarityResultant,
  createEmptyDomainState,
  domainStateMetrics,
  evaluateMolecularGeometry,
  nextGeometryHint,
  placeDomainToken,
  projectDomainCage,
  removeDomainToken,
  setDomainPull,
} from '../src/chemistry/molecularGeometry.js';

const close = (actual, expected, tolerance = 1e-8) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, String(actual) + ' != ' + String(expected));
};
const vectorLength = (vector) => Math.hypot(...vector);
const rounded = (values) => [...new Set(values.map((value) => Math.round(value * 100) / 100))].sort((a, b) => a - b);

assert.equal(ELECTRON_DOMAIN_GEOMETRY_LIST.length, 5);
assert.equal(MOLECULAR_GEOMETRY_SCENARIOS.length, 14);
assert.equal(MOLECULAR_GEOMETRY_SCENARIO_BY_ID.water.shape, 'bent');
assert.equal(MOLECULAR_GEOMETRY_SCENARIO_BY_ID.xenonTetrafluoride.shape, 'square planar');
assert.equal(ELECTRON_DOMAIN_GEOMETRIES.trigonalBipyramidal.conventionalHybridLabel, 'sp³d');
assert.match(ELECTRON_DOMAIN_GEOMETRIES.octahedral.hybridBoundary, /introductory|does not establish/i);
for (const geometry of ELECTRON_DOMAIN_GEOMETRY_LIST) {
  assert.equal(geometry.sites.length, geometry.domainCount);
  geometry.sites.forEach((site) => close(vectorLength(site.vector), 1));
  assert.ok(Object.isFrozen(geometry) && Object.isFrozen(geometry.sites));
}
for (const scenario of MOLECULAR_GEOMETRY_SCENARIOS) {
  const geometry = ELECTRON_DOMAIN_GEOMETRIES[scenario.geometryId];
  assert.equal(scenario.domains.length, geometry.domainCount);
  assert.deepEqual(new Set(Object.values(scenario.referenceSites)), new Set(geometry.sites.map((site) => site.id)));
  assert.deepEqual(new Set(Object.keys(scenario.referenceSites)), new Set(scenario.domains.map((domain) => domain.id)));
  assert.ok(scenario.domains.filter((domain) => domain.kind === 'bond').every((domain) => domain.pull >= 0 && domain.pull <= 2));
}

const emptyWater = createEmptyDomainState('water');
assert.equal(emptyWater.valid, true);
assert.deepEqual(Object.values(emptyWater.state.sites), [null, null, null, null]);
const waterH1 = placeDomainToken({ scenarioId: 'water', state: emptyWater.state, domainId: 'h1', siteId: 't0' });
assert.equal(waterH1.allowed, true);
assert.notEqual(waterH1.state, emptyWater.state);
assert.deepEqual(Object.values(emptyWater.state.sites), [null, null, null, null]);
const duplicateSite = placeDomainToken({ scenarioId: 'water', state: waterH1.state, domainId: 'h2', siteId: 't0' });
assert.equal(duplicateSite.allowed, false);
assert.equal(duplicateSite.state, waterH1.state);
assert.match(duplicateSite.reason, /occupied|remove/i);
const duplicateToken = placeDomainToken({ scenarioId: 'water', state: waterH1.state, domainId: 'h1', siteId: 't1' });
assert.equal(duplicateToken.allowed, false);
assert.equal(duplicateToken.state, waterH1.state);
assert.match(duplicateToken.reason, /already placed/i);
const removal = removeDomainToken({ scenarioId: 'water', state: waterH1.state, siteId: 't0' });
assert.equal(removal.allowed, true);
assert.equal(removal.state.sites.t0, null);
assert.equal(waterH1.state.sites.t0, 'h1');

const referenceWater = buildReferenceDomainState('water');
assert.equal(referenceWater.valid, true);
const pullEdit = setDomainPull({ scenarioId: 'water', state: referenceWater.state, domainId: 'h1', pull: 0.7 });
assert.equal(pullEdit.allowed, true);
assert.equal(pullEdit.state.pulls.h1, 0.7);
assert.equal(referenceWater.state.pulls.h1, 0.35);
const badPull = setDomainPull({ scenarioId: 'water', state: referenceWater.state, domainId: 'h1', pull: 2.1 });
assert.equal(badPull.allowed, false);
assert.equal(badPull.state, referenceWater.state);
const lonePull = setDomainPull({ scenarioId: 'water', state: referenceWater.state, domainId: 'lp1', pull: 1 });
assert.equal(lonePull.allowed, false);
assert.equal(lonePull.state, referenceWater.state);

for (const scenario of MOLECULAR_GEOMETRY_SCENARIOS) {
  const reference = buildReferenceDomainState(scenario.id);
  const metrics = domainStateMetrics({ scenarioId: scenario.id, state: reference.state });
  assert.equal(metrics.valid, true);
  assert.equal(metrics.complete, true);
  assert.equal(metrics.preference.preferred, true);
  assert.equal(metrics.placedCount, scenario.domains.length);
  const evaluation = evaluateMolecularGeometry({
    scenarioId: scenario.id,
    state: reference.state,
    predictions: {
      electronGeometry: ELECTRON_DOMAIN_GEOMETRIES[scenario.geometryId].name.toLowerCase(),
      molecularShape: scenario.shape,
      polarity: calculatePolarityResultant({ scenarioId: scenario.id, state: reference.state }).classification,
    },
  });
  assert.equal(evaluation.committed, true, scenario.id);
}

const co2 = calculatePolarityResultant({ scenarioId: 'carbonDioxide', state: buildReferenceDomainState('carbonDioxide').state });
assert.equal(co2.classification, 'nonpolar');
close(co2.magnitude, 0);
const bf3 = calculatePolarityResultant({ scenarioId: 'boronTrifluoride', state: buildReferenceDomainState('boronTrifluoride').state });
assert.equal(bf3.classification, 'nonpolar');
close(bf3.magnitude, 0);
const methane = calculatePolarityResultant({ scenarioId: 'methane', state: buildReferenceDomainState('methane').state });
assert.equal(methane.classification, 'nonpolar');
close(methane.magnitude, 0);
const water = calculatePolarityResultant({ scenarioId: 'water', state: referenceWater.state });
assert.equal(water.classification, 'polar');
assert.ok(water.magnitude > 0);
const ammonia = calculatePolarityResultant({ scenarioId: 'ammonia', state: buildReferenceDomainState('ammonia').state });
assert.equal(ammonia.classification, 'polar');
close(ammonia.magnitude, 0.25);
const chloromethane = calculatePolarityResultant({ scenarioId: 'chloromethane', state: buildReferenceDomainState('chloromethane').state });
assert.equal(chloromethane.classification, 'polar');
close(chloromethane.magnitude, 0.75);
for (const scenarioId of ['phosphorusPentachloride', 'xenonDifluoride', 'sulfurHexafluoride', 'xenonTetrafluoride']) {
  assert.equal(calculatePolarityResultant({ scenarioId, state: buildReferenceDomainState(scenarioId).state }).classification, 'nonpolar');
}
for (const scenarioId of ['sulfurDioxide', 'sulfurTetrafluoride', 'chlorineTrifluoride', 'brominePentafluoride']) {
  assert.equal(calculatePolarityResultant({ scenarioId, state: buildReferenceDomainState(scenarioId).state }).classification, 'polar');
}

const referenceAngles = {
  carbonDioxide: [180],
  boronTrifluoride: [120],
  methane: [109.47],
  phosphorusPentachloride: [90, 120, 180],
  sulfurHexafluoride: [90, 180],
};
for (const [scenarioId, expected] of Object.entries(referenceAngles)) {
  const metrics = domainStateMetrics({ scenarioId, state: buildReferenceDomainState(scenarioId).state });
  assert.deepEqual(rounded(metrics.bondAnglesDeg), expected);
}

const sf4Reference = buildReferenceDomainState('sulfurTetrafluoride').state;
let axialLonePair = removeDomainToken({ scenarioId: 'sulfurTetrafluoride', state: sf4Reference, siteId: 'aTop' }).state;
axialLonePair = removeDomainToken({ scenarioId: 'sulfurTetrafluoride', state: axialLonePair, siteId: 'e0' }).state;
axialLonePair = placeDomainToken({ scenarioId: 'sulfurTetrafluoride', state: axialLonePair, domainId: 'lp1', siteId: 'aTop' }).state;
axialLonePair = placeDomainToken({ scenarioId: 'sulfurTetrafluoride', state: axialLonePair, domainId: 'f1', siteId: 'e0' }).state;
const sf4WrongBefore = JSON.stringify(axialLonePair);
const sf4Wrong = evaluateMolecularGeometry({
  scenarioId: 'sulfurTetrafluoride',
  state: axialLonePair,
  predictions: { electronGeometry: 'trigonal bipyramidal', molecularShape: 'seesaw', polarity: 'polar' },
});
assert.equal(sf4Wrong.arrangement.correct, false);
assert.equal(sf4Wrong.committed, false);
assert.match(sf4Wrong.arrangement.reason, /equatorial/i);
assert.equal(JSON.stringify(axialLonePair), sf4WrongBefore);

const xeReference = buildReferenceDomainState('xenonTetrafluoride').state;
let cisLonePairs = removeDomainToken({ scenarioId: 'xenonTetrafluoride', state: xeReference, siteId: 'xPlus' }).state;
cisLonePairs = removeDomainToken({ scenarioId: 'xenonTetrafluoride', state: cisLonePairs, siteId: 'zMinus' }).state;
cisLonePairs = placeDomainToken({ scenarioId: 'xenonTetrafluoride', state: cisLonePairs, domainId: 'lp2', siteId: 'xPlus' }).state;
cisLonePairs = placeDomainToken({ scenarioId: 'xenonTetrafluoride', state: cisLonePairs, domainId: 'f1', siteId: 'zMinus' }).state;
const xeWrong = evaluateMolecularGeometry({
  scenarioId: 'xenonTetrafluoride',
  state: cisLonePairs,
  predictions: { electronGeometry: 'octahedral', molecularShape: 'square planar', polarity: 'polar' },
});
assert.equal(xeWrong.arrangement.correct, false);
assert.match(xeWrong.arrangement.reason, /opposite/i);
assert.equal(xeWrong.polarity.correct, true);
assert.equal(xeWrong.polarity.actual, 'polar');

const wrongPredictions = { electronGeometry: 'linear', molecularShape: 'linear', polarity: 'nonpolar' };
const wrongPredictionBefore = JSON.stringify(wrongPredictions);
const waterWrong = evaluateMolecularGeometry({ scenarioId: 'water', state: referenceWater.state, predictions: wrongPredictions });
assert.equal(waterWrong.electronGeometry.correct, false);
assert.equal(waterWrong.molecularShape.correct, false);
assert.equal(waterWrong.polarity.correct, false);
assert.equal(JSON.stringify(wrongPredictions), wrongPredictionBefore);

const projectionStateBefore = JSON.stringify(referenceWater.state);
const projection = projectDomainCage({ scenarioId: 'water', state: referenceWater.state, yawDeg: 35, pitchDeg: -18, width: 800, height: 500 });
assert.equal(projection.valid, true);
assert.equal(projection.sites.length, 4);
assert.equal(projection.sites[0].id.length > 0, true);
assert.equal(JSON.stringify(referenceWater.state), projectionStateBefore);
assert.notDeepEqual(projectDomainCage({ scenarioId: 'water', state: referenceWater.state, yawDeg: 0, pitchDeg: 0, width: 800, height: 500 }).sites.map((site) => site.x), projection.sites.map((site) => site.x));

for (const level of [1, 2, 3, 4, 5]) {
  const hintStateBefore = JSON.stringify(axialLonePair);
  const hint = nextGeometryHint({ scenarioId: 'sulfurTetrafluoride', state: axialLonePair, level });
  assert.equal(hint.valid, true);
  assert.equal(hint.level, level);
  assert.equal(JSON.stringify(axialLonePair), hintStateBefore);
}

console.log('Five normalized electron-domain cages and fourteen declared AXmEn scenarios resolved.');
console.log('CO2, BF3, CH4, PCl5, XeF2, SF6, and XeF4 cancel equal pulls; bent, pyramidal, seesaw, T-shaped, and square-pyramidal references remain polar.');
console.log('immutable domain placement, equatorial/opposite lone-pair preferences, nominal angles, relative vector sums, predictions, projection, and hints verified.');
