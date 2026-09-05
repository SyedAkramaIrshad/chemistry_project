import {
  ELECTRON_DOMAIN_GEOMETRIES,
  MOLECULAR_GEOMETRY_SCENARIO_BY_ID,
} from '../data/molecularGeometryScenarios.js';

const POLARITY_TOLERANCE = 1e-8;
const EPSILON = 1e-12;

const invalid = (reason, input = null) => ({ valid: false, reason, input });
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const normalizeText = (value) => String(value ?? '').trim().toLowerCase();
const dot = (left, right) => left.reduce((sum, value, index) => sum + value * right[index], 0);
const length = (vector) => Math.hypot(...vector);

function resolveScenario(scenarioId) {
  const scenario = MOLECULAR_GEOMETRY_SCENARIO_BY_ID[scenarioId];
  if (!scenario) return null;
  return {
    scenario,
    geometry: ELECTRON_DOMAIN_GEOMETRIES[scenario.geometryId],
  };
}

function cloneState(state) {
  return {
    scenarioId: state.scenarioId,
    sites: { ...state.sites },
    pulls: { ...state.pulls },
  };
}

function validateDomainState(scenarioId, state) {
  const resolved = resolveScenario(scenarioId);
  if (!resolved) return invalid('Choose one of the declared molecular-geometry scenarios.', { scenarioId });
  const { scenario, geometry } = resolved;
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return invalid('Load a valid electron-domain cage before placing tokens.', state);
  }
  if (state.scenarioId !== scenarioId || !state.sites || !state.pulls) {
    return invalid(`This cage does not belong to ${scenario.formula}. Reset the selected scenario before continuing.`, state);
  }

  const expectedSiteIds = geometry.sites.map((site) => site.id);
  if (Object.keys(state.sites).length !== expectedSiteIds.length || expectedSiteIds.some((siteId) => !(siteId in state.sites))) {
    return invalid(`The ${geometry.name.toLowerCase()} cage must expose exactly ${geometry.domainCount} declared sites.`, state);
  }

  const domainIds = new Set(scenario.domains.map((domain) => domain.id));
  const placed = Object.values(state.sites).filter(Boolean);
  if (placed.some((domainId) => !domainIds.has(domainId)) || new Set(placed).size !== placed.length) {
    return invalid('Every placed token must be a unique domain declared for this scenario.', state);
  }

  const bondDomains = scenario.domains.filter((domain) => domain.kind === 'bond');
  if (Object.keys(state.pulls).length !== bondDomains.length) {
    return invalid('The relative-pull rack must contain one control for every declared bond domain.', state);
  }
  for (const domain of bondDomains) {
    const pull = state.pulls[domain.id];
    if (!Number.isFinite(pull) || pull < 0 || pull > 2) {
      return invalid(`Relative pull for ${domain.label} must be a finite value from 0 to 2.`, state);
    }
  }

  return { valid: true, ...resolved };
}

function lonePairSiteIds(scenario, state) {
  const lonePairIds = new Set(
    scenario.domains.filter((domain) => domain.kind === 'lonePair').map((domain) => domain.id),
  );
  return Object.entries(state.sites)
    .filter(([, domainId]) => lonePairIds.has(domainId))
    .map(([siteId]) => siteId);
}

function preferenceResult(scenario, geometry, state, complete) {
  if (!complete) {
    return {
      preferred: false,
      reason: 'Place every bond and lone-pair token before judging the domain arrangement.',
    };
  }

  const lonePairSites = lonePairSiteIds(scenario, state);
  if (geometry.id === 'trigonalBipyramidal' && lonePairSites.length > 0) {
    const allEquatorial = lonePairSites.every((siteId) => (
      geometry.sites.find((site) => site.id === siteId)?.class === 'equatorial'
    ));
    return {
      preferred: allEquatorial,
      reason: allEquatorial
        ? 'The lone-pair domains occupy equatorial sites, minimizing their number of 90° interactions in this empirical model.'
        : 'In the trigonal-bipyramidal parent cage, place lone-pair domains in equatorial sites before using axial sites.',
    };
  }

  if (scenario.id === 'xenonTetrafluoride') {
    const [first, second] = lonePairSites;
    const firstSite = geometry.sites.find((site) => site.id === first);
    const opposite = Boolean(firstSite && firstSite.oppositeId === second);
    return {
      preferred: opposite,
      reason: opposite
        ? 'The two lone-pair domains occupy opposite octahedral sites, leaving four coplanar bonds.'
        : 'For the declared XeF₄ model, the two lone-pair domains should occupy opposite octahedral sites.',
    };
  }

  return {
    preferred: true,
    reason: lonePairSites.length
      ? 'All occupied sites are symmetry-equivalent for this declared ideal parent cage.'
      : 'All bond domains occupy the declared ideal parent cage.',
  };
}

function angleDegrees(first, second) {
  const cosine = clamp(dot(first, second), -1, 1);
  return Math.acos(cosine) * 180 / Math.PI;
}

function visibleShape(scenario, preference) {
  if (!preference.preferred) return 'non-reference arrangement';
  return scenario.shape;
}

export function createEmptyDomainState(scenarioId) {
  const resolved = resolveScenario(scenarioId);
  if (!resolved) return invalid('Choose one of the declared molecular-geometry scenarios.', { scenarioId });
  const { scenario, geometry } = resolved;
  return {
    valid: true,
    scenario,
    geometry,
    state: {
      scenarioId,
      sites: Object.fromEntries(geometry.sites.map((site) => [site.id, null])),
      pulls: Object.fromEntries(
        scenario.domains
          .filter((domain) => domain.kind === 'bond')
          .map((domain) => [domain.id, domain.pull]),
      ),
    },
  };
}

export function buildReferenceDomainState(scenarioId) {
  const empty = createEmptyDomainState(scenarioId);
  if (!empty.valid) return empty;
  const state = cloneState(empty.state);
  for (const [domainId, siteId] of Object.entries(empty.scenario.referenceSites)) {
    state.sites[siteId] = domainId;
  }
  return {
    valid: true,
    scenario: empty.scenario,
    geometry: empty.geometry,
    state,
  };
}

export function placeDomainToken({ scenarioId, state, domainId, siteId }) {
  const validation = validateDomainState(scenarioId, state);
  if (!validation.valid) return { allowed: false, state, reason: validation.reason };
  const { scenario, geometry } = validation;
  const domain = scenario.domains.find((item) => item.id === domainId);
  if (!domain) return { allowed: false, state, reason: 'Choose a bond or lone-pair token declared for this scenario.' };
  if (!geometry.sites.some((site) => site.id === siteId)) {
    return { allowed: false, state, reason: `Choose a visible site in the ${geometry.name.toLowerCase()} cage.` };
  }
  if (Object.values(state.sites).includes(domainId)) {
    return { allowed: false, state, reason: `${domain.label} is already placed. Remove it before moving it to another site.` };
  }
  if (state.sites[siteId]) {
    return { allowed: false, state, reason: 'That site is occupied. Remove its token before attaching another domain.' };
  }

  const next = cloneState(state);
  next.sites[siteId] = domainId;
  return {
    allowed: true,
    state: next,
    domainId,
    siteId,
    reason: `${domain.kind === 'lonePair' ? 'Lone pair' : domain.label + ' bond'} placed. The cage has not judged your final arrangement yet.`,
  };
}

export function removeDomainToken({ scenarioId, state, siteId }) {
  const validation = validateDomainState(scenarioId, state);
  if (!validation.valid) return { allowed: false, state, reason: validation.reason };
  if (!validation.geometry.sites.some((site) => site.id === siteId)) {
    return { allowed: false, state, reason: 'Choose a visible cage site to remove its token.' };
  }
  const domainId = state.sites[siteId];
  if (!domainId) return { allowed: false, state, reason: 'That cage site is already empty.' };

  const next = cloneState(state);
  next.sites[siteId] = null;
  return {
    allowed: true,
    state: next,
    domainId,
    siteId,
    reason: 'Domain removed. You can now place it on another available site.',
  };
}

export function setDomainPull({ scenarioId, state, domainId, pull }) {
  const validation = validateDomainState(scenarioId, state);
  if (!validation.valid) return { allowed: false, state, reason: validation.reason };
  const domain = validation.scenario.domains.find((item) => item.id === domainId);
  if (!domain || domain.kind !== 'bond') {
    return { allowed: false, state, reason: 'Relative pull can be edited only for a declared bond token, not a lone-pair token.' };
  }
  if (!Number.isFinite(pull) || pull < 0 || pull > 2) {
    return { allowed: false, state, reason: 'Use a relative pull from 0 to 2. These are illustrative controls, not measured dipole moments.' };
  }

  const next = cloneState(state);
  next.pulls[domainId] = pull;
  return {
    allowed: true,
    state: next,
    domainId,
    pull,
    reason: `Relative pull set to ${pull.toFixed(2)}. This changes only the declared vector model.`,
  };
}

export function domainStateMetrics({ scenarioId, state }) {
  const validation = validateDomainState(scenarioId, state);
  if (!validation.valid) return validation;
  const { scenario, geometry } = validation;
  const domainById = Object.fromEntries(scenario.domains.map((domain) => [domain.id, domain]));
  const placedDomainIds = Object.values(state.sites).filter(Boolean);
  const placedSet = new Set(placedDomainIds);
  const missingDomains = scenario.domains.filter((domain) => !placedSet.has(domain.id));
  const complete = missingDomains.length === 0;
  const preference = preferenceResult(scenario, geometry, state, complete);
  const bondSites = geometry.sites.filter((site) => {
    const domainId = state.sites[site.id];
    return domainId && domainById[domainId]?.kind === 'bond';
  });
  const bondAnglesDeg = [];
  for (let first = 0; first < bondSites.length; first += 1) {
    for (let second = first + 1; second < bondSites.length; second += 1) {
      bondAnglesDeg.push(angleDegrees(bondSites[first].vector, bondSites[second].vector));
    }
  }

  return {
    valid: true,
    scenario,
    geometry,
    requiredCount: scenario.domains.length,
    placedCount: placedDomainIds.length,
    bondCount: scenario.domains.filter((domain) => domain.kind === 'bond').length,
    lonePairCount: scenario.domains.filter((domain) => domain.kind === 'lonePair').length,
    placedBondCount: placedDomainIds.filter((domainId) => domainById[domainId].kind === 'bond').length,
    placedLonePairCount: placedDomainIds.filter((domainId) => domainById[domainId].kind === 'lonePair').length,
    missingDomains,
    complete,
    preference,
    bondAnglesDeg,
    molecularShape: complete ? visibleShape(scenario, preference) : 'incomplete',
  };
}

export function calculatePolarityResultant({ scenarioId, state }) {
  const validation = validateDomainState(scenarioId, state);
  if (!validation.valid) return validation;
  const { scenario, geometry } = validation;
  const domainById = Object.fromEntries(scenario.domains.map((domain) => [domain.id, domain]));
  const bondDomains = scenario.domains.filter((domain) => domain.kind === 'bond');
  const terms = [];
  const components = [0, 0, 0];

  for (const site of geometry.sites) {
    const domainId = state.sites[site.id];
    const domain = domainById[domainId];
    if (!domain || domain.kind !== 'bond') continue;
    const pull = state.pulls[domainId];
    const vector = site.vector.map((component) => component * pull);
    vector.forEach((component, index) => { components[index] += component; });
    terms.push({ domainId, label: domain.label, siteId: site.id, pull, vector });
  }

  const placedBondIds = new Set(terms.map((term) => term.domainId));
  const missingBondIds = bondDomains.filter((domain) => !placedBondIds.has(domain.id)).map((domain) => domain.id);
  const complete = missingBondIds.length === 0;
  const magnitude = length(components);
  const classification = complete
    ? (magnitude <= POLARITY_TOLERANCE ? 'nonpolar' : 'polar')
    : 'incomplete';
  const direction = magnitude > EPSILON
    ? components.map((component) => component / magnitude)
    : [0, 0, 0];

  return {
    valid: true,
    complete,
    terms,
    missingBondIds,
    components,
    magnitude,
    direction,
    classification,
    convention: 'Illustrative outward electron-pull arrows in relative units; this is not a measured electric dipole moment or the IUPAC dipole-vector sign convention.',
  };
}

export function evaluateMolecularGeometry({ scenarioId, state, predictions = {} }) {
  const metrics = domainStateMetrics({ scenarioId, state });
  if (!metrics.valid) return { committed: false, ...metrics };
  const polarityResult = calculatePolarityResultant({ scenarioId, state });
  const expectedElectronGeometry = metrics.geometry.name.toLowerCase();
  const actualShape = metrics.molecularShape;
  const arrangement = {
    correct: metrics.complete && metrics.preference.preferred,
    actual: metrics.complete ? (metrics.preference.preferred ? 'preferred' : 'non-reference') : 'incomplete',
    expected: 'preferred',
    reason: metrics.preference.reason,
  };
  const electronGeometry = {
    correct: metrics.complete && normalizeText(predictions.electronGeometry) === expectedElectronGeometry,
    actual: normalizeText(predictions.electronGeometry) || 'not predicted',
    expected: expectedElectronGeometry,
    reason: `Count all bonding and lone-pair domains around the central atom: ${metrics.geometry.domainCount} gives ${expectedElectronGeometry}.`,
  };
  const molecularShape = {
    correct: metrics.complete && metrics.preference.preferred && normalizeText(predictions.molecularShape) === normalizeText(metrics.scenario.shape),
    actual: actualShape,
    prediction: normalizeText(predictions.molecularShape) || 'not predicted',
    expected: metrics.scenario.shape,
    reason: metrics.preference.preferred
      ? 'Molecular shape names only the visible bonded atoms after the lone-pair sites are hidden.'
      : metrics.preference.reason,
  };
  const polarity = {
    correct: polarityResult.complete && normalizeText(predictions.polarity) === polarityResult.classification,
    actual: polarityResult.classification,
    prediction: normalizeText(predictions.polarity) || 'not predicted',
    expected: polarityResult.classification,
    magnitude: polarityResult.magnitude,
    reason: polarityResult.complete
      ? `The relative bond-pull vectors ${polarityResult.classification === 'nonpolar' ? 'cancel' : 'leave a nonzero resultant'} in this arrangement.`
      : 'Place every bond token before classifying the relative vector resultant.',
  };

  return {
    valid: true,
    committed: arrangement.correct && electronGeometry.correct && molecularShape.correct && polarity.correct,
    completeness: {
      correct: metrics.complete,
      actual: metrics.placedCount,
      expected: metrics.requiredCount,
      reason: metrics.complete
        ? 'Every declared domain token is placed.'
        : `${metrics.missingDomains.length} domain token${metrics.missingDomains.length === 1 ? '' : 's'} remain unplaced.`,
    },
    arrangement,
    electronGeometry,
    molecularShape,
    polarity,
    metrics,
    polarityResult,
  };
}

export function projectDomainCage({
  scenarioId,
  state,
  yawDeg = 0,
  pitchDeg = 0,
  width = 640,
  height = 480,
}) {
  const validation = validateDomainState(scenarioId, state);
  if (!validation.valid) return validation;
  if (![yawDeg, pitchDeg, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
    return invalid('Projection needs finite rotation values and a positive drawing area.', { yawDeg, pitchDeg, width, height });
  }

  const yaw = yawDeg * Math.PI / 180;
  const pitch = pitchDeg * Math.PI / 180;
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  const center = { x: width / 2, y: height / 2 };
  const radius = Math.min(width, height) * 0.32;
  const domainById = Object.fromEntries(validation.scenario.domains.map((domain) => [domain.id, domain]));

  const rotateVector = ([x, y, z]) => {
    const yawX = x * cosYaw + z * sinYaw;
    const yawZ = -x * sinYaw + z * cosYaw;
    return [
      yawX,
      y * cosPitch - yawZ * sinPitch,
      y * sinPitch + yawZ * cosPitch,
    ];
  };

  const sites = validation.geometry.sites.map((site) => {
    const [yawX, pitchY, pitchZ] = rotateVector(site.vector);
    const perspective = 1 + pitchZ * 0.14;
    const domainId = state.sites[site.id];
    return {
      id: site.id,
      class: site.class,
      x: center.x + yawX * radius * perspective,
      y: center.y - pitchY * radius * perspective,
      depth: pitchZ,
      scale: perspective,
      vector: [yawX, pitchY, pitchZ],
      domainId,
      domain: domainId ? domainById[domainId] : null,
    };
  }).sort((left, right) => left.depth - right.depth);

  const polarity = calculatePolarityResultant({ scenarioId, state });
  const rotatedResultant = rotateVector(polarity.components);
  const displayClamp = polarity.magnitude > 1.8 ? 1.8 / polarity.magnitude : 1;
  const resultant = {
    ...polarity,
    rotatedComponents: rotatedResultant,
    displayClamped: displayClamp < 1,
    x: center.x + rotatedResultant[0] * displayClamp * radius * 0.52,
    y: center.y - rotatedResultant[1] * displayClamp * radius * 0.52,
    depth: rotatedResultant[2],
  };

  return {
    valid: true,
    center,
    radius,
    yawDeg,
    pitchDeg,
    sites,
    resultant,
  };
}

export function nextGeometryHint({ scenarioId, state, level = 1 }) {
  const metrics = domainStateMetrics({ scenarioId, state });
  if (!metrics.valid) return metrics;
  if (!Number.isInteger(level) || level < 1 || level > 5) {
    return invalid('Choose a hint level from 1 through 5.', { level });
  }
  const polarity = calculatePolarityResultant({ scenarioId, state });
  const scenario = metrics.scenario;
  const messages = {
    1: `Count every central-atom domain, including lone pairs: ${scenario.formula} has ${metrics.requiredCount}.`,
    2: `${metrics.requiredCount} domains map to the ${metrics.geometry.name.toLowerCase()} parent cage in this empirical VSEPR model.`,
    3: metrics.preference.preferred
      ? 'Your occupied site classes satisfy this scenario’s declared lone-pair preference.'
      : metrics.preference.reason,
    4: `Hide lone-pair tokens when naming the molecular shape; the reference shape is ${scenario.shape}.`,
    5: polarity.complete
      ? `Add the relative bond-pull arrows as vectors: magnitude ${polarity.magnitude.toFixed(3)} classifies this arrangement as ${polarity.classification}.`
      : 'Place every bond token, then inspect whether the relative pull arrows cancel or leave a resultant.',
  };
  return {
    valid: true,
    level,
    message: messages[level],
    boundary: 'Hints use the declared ideal-domain model; they do not supply an optimized geometry or measured dipole moment.',
  };
}
