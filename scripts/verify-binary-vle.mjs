import assert from 'node:assert/strict';
import {
  BINARY_VLE_PAIRS,
  BINARY_VLE_PAIR_BY_ID,
  VLE_COMPONENTS,
} from '../src/data/binaryVleScenarios.js';
import {
  analyzeBinaryVle,
  antoineTemperatureK,
  antoineVapourPressureBar,
  binaryPressureWindow,
  createDefaultBinaryVleState,
  createPxyDiagram,
  createTxyDiagram,
  evaluateBinaryVlePrediction,
  idealBubblePressureBar,
  idealBubbleTemperatureK,
  idealDewPressureBar,
  idealDewTemperatureK,
  nextBinaryVleHint,
} from '../src/chemistry/binaryVle.js';

const close = (actual, expected, tolerance = 1e-9) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} is not within ${tolerance} of ${expected}`,
  );
};

const monotonic = (values, direction, tolerance = 1e-10) => {
  for (let index = 1; index < values.length; index += 1) {
    if (direction === 'increasing') {
      assert.ok(values[index] >= values[index - 1] - tolerance, `${values[index]} should not fall below ${values[index - 1]}`);
    } else {
      assert.ok(values[index] <= values[index - 1] + tolerance, `${values[index]} should not rise above ${values[index - 1]}`);
    }
  }
};

assert.equal(Object.keys(VLE_COMPONENTS).length, 4);
assert.equal(BINARY_VLE_PAIRS.length, 2);
assert.deepEqual(BINARY_VLE_PAIR_BY_ID['benzene-toluene'].validTemperatureK, { minimum: 333.4, maximum: 373.5 });
assert.deepEqual(BINARY_VLE_PAIR_BY_ID['hexane-heptane'].validTemperatureK, { minimum: 299.07, maximum: 342.69 });
assert.ok(Object.isFrozen(VLE_COMPONENTS));
assert.ok(Object.isFrozen(BINARY_VLE_PAIRS));

for (const component of Object.values(VLE_COMPONENTS)) {
  const { minimum, maximum } = component.validTemperatureK;
  for (const temperatureK of [minimum, (minimum + maximum) / 2, maximum]) {
    const pressure = antoineVapourPressureBar({ componentId: component.id, temperatureK });
    assert.ok(pressure.pressureBar > 0);
    assert.equal(pressure.componentId, component.id);
    assert.equal(pressure.sourceId, component.sourceId);
    assert.ok(Object.isFrozen(pressure));
    const inverse = antoineTemperatureK({ componentId: component.id, pressureBar: pressure.pressureBar });
    close(inverse.temperatureK, temperatureK, 1e-9);
    close(inverse.pressureBar, pressure.pressureBar, 1e-12);
  }
  assert.throws(
    () => antoineVapourPressureBar({ componentId: component.id, temperatureK: minimum - 0.001 }),
    /Antoine range/,
  );
  assert.throws(
    () => antoineVapourPressureBar({ componentId: component.id, temperatureK: maximum + 0.001 }),
    /Antoine range/,
  );
}

for (const pair of BINARY_VLE_PAIRS) {
  const component1 = VLE_COMPONENTS[pair.component1Id];
  const component2 = VLE_COMPONENTS[pair.component2Id];
  const { minimum, maximum } = pair.validTemperatureK;
  const midpointTemperature = (minimum + maximum) / 2;
  const window = binaryPressureWindow(pair.id);
  assert.ok(window.minimumBar > 0);
  assert.ok(window.maximumBar > window.minimumBar);
  assert.deepEqual(window.validTemperatureK, pair.validTemperatureK);
  assert.ok(Object.isFrozen(window));

  for (const temperatureK of [minimum, midpointTemperature, maximum]) {
    const p1 = antoineVapourPressureBar({ componentId: component1.id, temperatureK }).pressureBar;
    const p2 = antoineVapourPressureBar({ componentId: component2.id, temperatureK }).pressureBar;
    assert.ok(p1 > p2, `${component1.name} must remain the more volatile component at ${temperatureK} K.`);
  }

  const temperatureK = pair.defaultPxyTemperatureK;
  const p1Star = antoineVapourPressureBar({ componentId: component1.id, temperatureK }).pressureBar;
  const p2Star = antoineVapourPressureBar({ componentId: component2.id, temperatureK }).pressureBar;
  close(idealBubblePressureBar({ pairId: pair.id, temperatureK, x1: 0 }).pressureBar, p2Star);
  close(idealBubblePressureBar({ pairId: pair.id, temperatureK, x1: 1 }).pressureBar, p1Star);
  close(idealDewPressureBar({ pairId: pair.id, temperatureK, y1: 0 }).pressureBar, p2Star);
  close(idealDewPressureBar({ pairId: pair.id, temperatureK, y1: 1 }).pressureBar, p1Star);

  const pxy = createPxyDiagram({ pairId: pair.id, temperatureK, pointCount: 101 });
  assert.equal(pxy.bubble.length, 101);
  assert.equal(pxy.dew.length, 101);
  assert.equal(pxy.bubble[0].x1, 0);
  assert.equal(pxy.bubble.at(-1).x1, 1);
  assert.equal(pxy.dew[0].y1, 0);
  assert.equal(pxy.dew.at(-1).y1, 1);
  monotonic(pxy.bubble.map((point) => point.pressureBar), 'increasing');
  monotonic(pxy.dew.map((point) => point.pressureBar), 'increasing');

  const pressureBar = pair.defaultTxyPressureBar;
  const txy = createTxyDiagram({ pairId: pair.id, pressureBar, pointCount: 81 });
  assert.equal(txy.bubble.length, 81);
  assert.equal(txy.dew.length, 81);
  assert.equal(txy.bubble[0].x1, 0);
  assert.equal(txy.bubble.at(-1).x1, 1);
  assert.equal(txy.dew[0].y1, 0);
  assert.equal(txy.dew.at(-1).y1, 1);
  monotonic(txy.bubble.map((point) => point.temperatureK), 'decreasing', 2e-8);
  monotonic(txy.dew.map((point) => point.temperatureK), 'decreasing', 2e-8);
  for (const point of [...txy.bubble, ...txy.dew]) assert.ok(Math.abs(point.residualBar) <= 1e-8);

  const z1 = pair.defaultOverallFraction1;
  const bubble = idealBubblePressureBar({ pairId: pair.id, temperatureK, x1: z1 });
  const dew = idealDewPressureBar({ pairId: pair.id, temperatureK, y1: z1 });
  assert.ok(bubble.pressureBar > dew.pressureBar);
  const gap = bubble.pressureBar - dew.pressureBar;
  const states = [
    ['liquid', bubble.pressureBar + 0.1 * gap],
    ['bubble-point', bubble.pressureBar],
    ['two-phase', (bubble.pressureBar + dew.pressureBar) / 2],
    ['dew-point', dew.pressureBar],
    ['vapour', dew.pressureBar - 0.1 * gap],
  ];
  for (const [expectedRegion, selectedPressure] of states) {
    const analysis = analyzeBinaryVle({ pairId: pair.id, temperatureK, pressureBar: selectedPressure, overallFraction1: z1 });
    assert.equal(analysis.region.id, expectedRegion);
    assert.equal(analysis.input.pressureBar, selectedPressure);
    assert.equal(analysis.input.overallFraction1, z1);
    assert.ok(Object.isFrozen(analysis));
    if (expectedRegion === 'liquid') {
      assert.equal(analysis.equilibrium.liquidAmountFraction1, z1);
      assert.equal(analysis.equilibrium.vapourAmountFraction1, null);
      assert.equal(analysis.equilibrium.liquidFraction, 1);
      assert.equal(analysis.equilibrium.vapourFraction, 0);
    } else if (expectedRegion === 'vapour') {
      assert.equal(analysis.equilibrium.liquidAmountFraction1, null);
      assert.equal(analysis.equilibrium.vapourAmountFraction1, z1);
      assert.equal(analysis.equilibrium.liquidFraction, 0);
      assert.equal(analysis.equilibrium.vapourFraction, 1);
    } else {
      const equilibrium = analysis.equilibrium;
      assert.ok(equilibrium.liquidAmountFraction1 <= z1 + 1e-10);
      assert.ok(equilibrium.vapourAmountFraction1 >= z1 - 1e-10);
      assert.ok(equilibrium.vapourAmountFraction1 > equilibrium.liquidAmountFraction1);
      assert.ok(equilibrium.liquidFraction >= 0 && equilibrium.liquidFraction <= 1);
      assert.ok(equilibrium.vapourFraction >= 0 && equilibrium.vapourFraction <= 1);
      close(equilibrium.liquidFraction + equilibrium.vapourFraction, 1, 1e-10);
      close(
        equilibrium.liquidFraction * equilibrium.liquidAmountFraction1
          + equilibrium.vapourFraction * equilibrium.vapourAmountFraction1,
        z1,
        1e-10,
      );
      close(analysis.partialPressures.component1FromLiquidBar, analysis.partialPressures.component1FromVapourBar, 1e-10);
      close(analysis.partialPressures.component2FromLiquidBar, analysis.partialPressures.component2FromVapourBar, 1e-10);
      close(analysis.partialPressures.sumBar, selectedPressure, 1e-10);
    }
  }

  const atBubble = analyzeBinaryVle({ pairId: pair.id, temperatureK, pressureBar: bubble.pressureBar, overallFraction1: z1 });
  const atDew = analyzeBinaryVle({ pairId: pair.id, temperatureK, pressureBar: dew.pressureBar, overallFraction1: z1 });
  close(atBubble.equilibrium.vapourFraction, 0, 1e-12);
  close(atDew.equilibrium.vapourFraction, 1, 1e-12);

  const bubbleTemperature = idealBubbleTemperatureK({ pairId: pair.id, pressureBar, x1: z1 });
  const dewTemperature = idealDewTemperatureK({ pairId: pair.id, pressureBar, y1: z1 });
  assert.ok(dewTemperature.temperatureK > bubbleTemperature.temperatureK);
  assert.ok(Math.abs(bubbleTemperature.residualBar) <= 1e-8);
  assert.ok(Math.abs(dewTemperature.residualBar) <= 1e-8);

  const defaultPxy = createDefaultBinaryVleState({ pairId: pair.id, mode: 'pxy' });
  const defaultTxy = createDefaultBinaryVleState({ pairId: pair.id, mode: 'txy' });
  assert.equal(defaultPxy.mode, 'pxy');
  assert.equal(defaultTxy.mode, 'txy');
  assert.equal(analyzeBinaryVle(defaultPxy).region.id, 'two-phase');
  assert.equal(analyzeBinaryVle(defaultTxy).region.id, 'two-phase');

  const midpoint = analyzeBinaryVle(defaultPxy);
  const prediction = Object.freeze({
    region: 'liquid',
    enrichment: 'not-comparable',
    vapourFraction: '0.137',
  });
  const evaluation = evaluateBinaryVlePrediction({ analysis: midpoint, prediction });
  assert.equal(evaluation.learnerPrediction.region, prediction.region);
  assert.equal(evaluation.learnerPrediction.enrichment, prediction.enrichment);
  assert.equal(evaluation.learnerPrediction.vapourFraction, prediction.vapourFraction);
  assert.equal(evaluation.dimensions.region.correct, false);
  assert.equal(evaluation.dimensions.enrichment.correct, false);
  assert.equal(evaluation.dimensions.vapourFraction.correct, false);
  assert.equal(prediction.vapourFraction, '0.137');
  for (let level = 1; level <= 4; level += 1) {
    const before = JSON.stringify(midpoint.input);
    const hint = nextBinaryVleHint({ analysis: midpoint, level });
    assert.equal(typeof hint, 'string');
    assert.ok(hint.length > 20);
    assert.equal(JSON.stringify(midpoint.input), before);
  }
}

assert.throws(() => binaryPressureWindow('unknown-pair'), /Unknown binary VLE pair/);
assert.throws(
  () => idealBubblePressureBar({ pairId: 'benzene-toluene', temperatureK: 353.15, x1: 1.001 }),
  /amount fraction/,
);
assert.throws(
  () => idealDewTemperatureK({ pairId: 'benzene-toluene', pressureBar: 9, y1: 0.5 }),
  /pressure window/,
);

console.log('Four ranged NIST Antoine records and two declared ideal binary pairs verified.');
console.log('P-x-y/T-x-y endpoints and monotonicity, five-region flash states, tie-line compositions, phase amounts, pressure closure, component balance, immutable predictions, and four non-mutating hints verified.');
