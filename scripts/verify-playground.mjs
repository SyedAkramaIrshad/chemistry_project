import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

// Run against a running Vite server or production preview. This exercises public
// controls, not a test-only state API. The mirrored diagram supplies the graph
// audit even when its 3D counterpart is the visible editing surface.
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:5173';
const screenshotDir = resolve(process.env.PLAYGROUND_SCREENSHOTS_DIR || 'test-results');
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {}),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
await mkdir(screenshotDir, { recursive: true });

const errors = [];
let activePage;
const watchErrors = (page, label) => page.on('pageerror', (error) => errors.push(`${label}: ${error.message}`));

async function graph(page) {
  return page.evaluate(() => ({
    atoms: [...document.querySelectorAll('#atomLayer .atom-cluster[data-id]')].map((node) => ({
      id: Number(node.dataset.id),
      symbol: node.dataset.symbol,
      charge: Number(node.dataset.charge),
      x: Number.parseFloat(node.style.left),
      y: Number.parseFloat(node.style.top),
    })).sort((a, b) => a.id - b.id),
    bonds: [...document.querySelectorAll('#bondLayer .bond-hit')].map((node) => ({
      key: node.dataset.bondKey,
      a: Number(node.dataset.a),
      b: Number(node.dataset.b),
      type: node.dataset.bondType,
    })).sort((a, b) => a.key.localeCompare(b.key)),
  }));
}

const keyFor = (a, b) => [a, b].sort((x, y) => x - y).join(':');
const chemistryOnly = (snapshot) => ({
  atoms: snapshot.atoms.map(({ x, y, ...atom }) => atom),
  bonds: snapshot.bonds,
});

async function atomControl(page, id) {
  const sceneButton = page.locator(`[data-scene-atom-id="${id}"]`);
  if (await sceneButton.isVisible()) return sceneButton;
  const diagramButton = page.locator(`#atomLayer .atom-node[data-id="${id}"]`);
  assert.ok(await diagramButton.isVisible(), `Atom ${id} must have a visible, operable control.`);
  return diagramButton;
}

async function selectAtom(page, id) {
  await (await atomControl(page, id)).click();
}

async function selectBond(page, bond) {
  const sceneButton = page.locator(`[data-scene-bond-key="${bond.key}"]`);
  if (await sceneButton.isVisible()) await sceneButton.click();
  else {
    // A perfectly horizontal/vertical SVG line has a zero-size dimension even
    // though its 44px stroke is clickable. Click the actual rendered midpoint.
    await page.locator('#workspace').scrollIntoViewIfNeeded();
    const point = await page.locator(`#bondLayer .bond-hit[data-bond-key="${bond.key}"]`).evaluate((line) => {
      const middle = new DOMPoint((line.x1.baseVal.value + line.x2.baseVal.value) / 2,
        (line.y1.baseVal.value + line.y2.baseVal.value) / 2).matrixTransform(line.getScreenCTM());
      return { x: middle.x, y: middle.y };
    });
    await page.mouse.click(point.x, point.y);
    assert.equal(await page.locator('#breakBondBtn').isEnabled(), true, 'The visible diagram bond must select when clicked.');
  }
}

async function connect(page, source, target, type = 'single') {
  await page.locator(`.builder-toolbar [data-bond-type="${type}"]`).click();
  await selectAtom(page, source);
  await page.locator('#startSelectedBond').click();
  await selectAtom(page, target);
}

async function addElement(page, name, position) {
  // These regression scenarios deliberately place independent atoms.
  await page.locator('#discoveryAttachToggle').uncheck();
  await page.locator('#elementSearch').fill(name);
  const choice = page.locator('#atomPalette .atom-choice');
  assert.equal(await choice.count(), 1, `Search ${name} must resolve to one element.`);
  if (position) await choice.dragTo(page.locator('#workspace'), { targetPosition: position });
  else await choice.click();
  await page.locator('#elementSearch').fill('');
}

async function loadChallenge(page) {
  await page.locator('#missionStartBtn').click();
  const snapshot = await graph(page);
  assert.deepEqual(snapshot.atoms.map((atom) => atom.symbol).sort(), ['H', 'H', 'N', 'O']);
  assert.equal(snapshot.bonds.length, 2);
  assert.ok(snapshot.atoms.every((atom) => Number.isFinite(atom.x) && Number.isFinite(atom.y) && atom.charge === 0));
  return snapshot;
}

async function noPageOverflow(page, width) {
  const dimensions = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  assert.ok(dimensions.scroll <= dimensions.viewport + 1,
    `${width}px viewport has page overflow: ${dimensions.scroll}px > ${dimensions.viewport}px.`);
}

try {
  const context = await browser.newContext({ viewport: { width: 1460, height: 1050 } });
  const page = await context.newPage();
  activePage = page;
  watchErrors(page, '3D');
  await page.goto(`${baseURL}/#laboratory`);
  await page.locator('#sceneLayer canvas').waitFor({ state: 'visible' });

  // The required CONTRIBUTING.md journey: break exactly one O–H, preserve all
  // four atoms, then explicitly form N–O while leaving the graph open.
  const initial = await loadChallenge(page);
  const oxygen = initial.atoms.find((atom) => atom.symbol === 'O');
  const nitrogen = initial.atoms.find((atom) => atom.symbol === 'N');
  await selectAtom(page, oxygen.id);
  const atomInfo = await page.locator('#inspector').innerText();
  assert.match(atomInfo, /Oxygen/);
  assert.match(atomInfo, /Atomic number[\s\S]*8/);
  assert.match(atomInfo, /Valence electrons[\s\S]*6/);
  assert.match(atomInfo, /electron configuration|configuration/i);

  const chosenBond = initial.bonds[0];
  await selectBond(page, chosenBond);
  assert.equal(await page.locator('#breakBondBtn').isEnabled(), true);
  await page.locator('#breakBondBtn').click();
  const broken = await graph(page);
  assert.deepEqual(broken.atoms, initial.atoms, 'Breaking must preserve every atom, charge, and graph position.');
  assert.deepEqual(broken.bonds, initial.bonds.filter((bond) => bond.key !== chosenBond.key));
  assert.match(await page.locator('#structureStatus').innerText(), /open/i);

  await connect(page, nitrogen.id, oxygen.id);
  const connected = await graph(page);
  assert.deepEqual(connected.atoms, initial.atoms, 'Forming a bond must not repair atoms, charge, or positions.');
  assert.equal(connected.bonds.length, 2);
  assert.deepEqual(connected.bonds.filter((bond) => bond.key !== keyFor(nitrogen.id, oxygen.id)), broken.bonds);
  assert.equal(connected.bonds.find((bond) => bond.key === keyFor(nitrogen.id, oxygen.id)).type, 'single');
  assert.match(await page.locator('#structureStatus').innerText(), /open/i);
  assert.match(await page.locator('#missionProgressText').innerText(), /3\s*\/\s*3/);

  // A rejection has no graph/history side effect. The next Undo must remove
  // the preceding explicit helium addition, not consume a phantom bond edit.
  const heliumStage = await page.locator('#workspace').boundingBox();
  await addElement(page, 'helium', { x: heliumStage.width * 0.8, y: heliumStage.height * 0.3 });
  const withHelium = await graph(page);
  const helium = withHelium.atoms.find((atom) => atom.symbol === 'He');
  assert.ok(helium);
  await connect(page, nitrogen.id, helium.id);
  assert.deepEqual(await graph(page), withHelium, 'Rejected N–He must leave the complete graph unchanged.');
  assert.match(await page.locator('#experimentLog').innerText(), /N[–—-]He bond rejected/);
  assert.match(await page.locator('#experimentLog').innerText(), /filled valence shell/i);
  await page.locator('#undoBtn').click();
  assert.deepEqual(await graph(page), connected, 'Rejected edits must not create an Undo entry.');
  await page.locator('#undoBtn').click();
  assert.deepEqual(await graph(page), broken, 'Undo must restore the exact graph before N–O.');
  await page.locator('#undoBtn').click();
  assert.deepEqual(await graph(page), initial, 'Undo must restore the selected O–H bond and all atom identities.');

  // Moving a mesh changes just the selected atom's display coordinates. Orbit
  // and camera reset must not leak camera transforms into the molecular graph.
  const beforeMove = await graph(page);
  await page.locator('[data-scene-mode="edit"]').click();
  const draggable = await atomControl(page, nitrogen.id);
  await draggable.scrollIntoViewIfNeeded();
  const atomBox = await draggable.boundingBox();
  await page.mouse.move(atomBox.x + atomBox.width / 2, atomBox.y + atomBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(atomBox.x + atomBox.width / 2 + 38, atomBox.y + atomBox.height / 2 + 24, { steps: 8 });
  await page.mouse.up();
  const moved = await graph(page);
  assert.deepEqual(chemistryOnly(moved), chemistryOnly(beforeMove));
  assert.deepEqual(moved.atoms.filter((atom) => atom.id !== nitrogen.id), beforeMove.atoms.filter((atom) => atom.id !== nitrogen.id));
  assert.notDeepEqual(moved.atoms.find((atom) => atom.id === nitrogen.id), beforeMove.atoms.find((atom) => atom.id === nitrogen.id));
  await page.locator('#undoBtn').click();
  assert.deepEqual(await graph(page), beforeMove, 'Dragging must make exactly one reversible edit.');

  await page.locator('[data-scene-mode="orbit"]').click();
  const stage = await page.locator('#workspace').boundingBox();
  await page.mouse.move(stage.x + stage.width * 0.6, stage.y + stage.height * 0.35);
  await page.mouse.down();
  await page.mouse.move(stage.x + stage.width * 0.6 + 55, stage.y + stage.height * 0.35 + 30, { steps: 8 });
  await page.mouse.up();
  assert.deepEqual(await graph(page), beforeMove, 'Orbit must leave graph coordinates unchanged.');
  await page.locator('#sceneResetBtn').click();
  assert.deepEqual(await graph(page), beforeMove);
  await page.locator('[data-scene-mode="edit"]').click();

  // Bond-order changes are explicit and cannot duplicate an existing edge.
  await page.locator('#clearBtn').click();
  const workspaceBox = await page.locator('#workspace').boundingBox();
  await addElement(page, 'carbon', { x: workspaceBox.width * 0.34, y: workspaceBox.height * 0.45 });
  await addElement(page, 'carbon', { x: workspaceBox.width * 0.66, y: workspaceBox.height * 0.45 });
  const carbons = (await graph(page)).atoms;
  assert.equal(carbons.length, 2);
  for (const type of ['single', 'double', 'triple']) {
    await connect(page, carbons[0].id, carbons[1].id, type);
    const updated = await graph(page);
    assert.deepEqual(updated.atoms, carbons);
    assert.equal(updated.bonds.length, 1);
    assert.equal(updated.bonds[0].type, type);
  }
  await page.locator('#undoBtn').click();
  assert.equal((await graph(page)).bonds[0].type, 'double');

  // The 2D editor uses the same chemistry and remains an operable escape hatch.
  const beforeToggle = await graph(page);
  await page.locator('#sceneFallbackBtn').click();
  await page.locator('#atomLayer .atom-node').first().waitFor({ state: 'visible' });
  assert.deepEqual(await graph(page), beforeToggle);
  await selectBond(page, beforeToggle.bonds[0]);
  await page.keyboard.press('Delete');
  assert.deepEqual((await graph(page)).atoms, beforeToggle.atoms);
  assert.equal((await graph(page)).bonds.length, 0);
  await page.locator('#undoBtn').click();
  assert.deepEqual(await graph(page), beforeToggle);
  await page.locator('#sceneFallbackBtn').click();
  await page.locator('#sceneLayer canvas').waitFor({ state: 'visible' });

  // Capture the actual running scene at the repository's required widths.
  await loadChallenge(page);
  for (const width of [1460, 742, 390]) {
    await page.setViewportSize({ width, height: 1050 });
    await page.locator('#centerBtn').click();
    await page.locator('#workspace').scrollIntoViewIfNeeded();
    await page.waitForTimeout(450); // Allow the deliberate visual settling motion to finish.
    await noPageOverflow(page, width);
    await page.screenshot({ path: resolve(screenshotDir, `playground-${width}.png`), fullPage: true });
  }
  await context.close();

  // A machine with no WebGL must still support the full required manual edit.
  const fallbackContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await fallbackContext.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      if (String(kind).toLowerCase().includes('webgl')) return null;
      return getContext.call(this, kind, ...args);
    };
  });
  const fallback = await fallbackContext.newPage();
  activePage = fallback;
  watchErrors(fallback, 'WebGL unavailable');
  await fallback.goto(`${baseURL}/#laboratory`);
  await fallback.locator('#sceneStatus').filter({ hasText: /2D editing ready/ }).waitFor({ state: 'visible' });
  assert.equal(await fallback.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
  const fallbackInitial = await loadChallenge(fallback);
  await selectBond(fallback, fallbackInitial.bonds[0]);
  await fallback.locator('#breakBondBtn').click();
  assert.deepEqual((await graph(fallback)).atoms, fallbackInitial.atoms);
  assert.equal((await graph(fallback)).bonds.length, 1);
  await connect(fallback, fallbackInitial.atoms.find((atom) => atom.symbol === 'N').id, fallbackInitial.atoms.find((atom) => atom.symbol === 'O').id);
  assert.equal((await graph(fallback)).bonds.length, 2);
  assert.match(await fallback.locator('#structureStatus').innerText(), /open/i);
  await noPageOverflow(fallback, 390);
  await fallback.screenshot({ path: resolve(screenshotDir, 'playground-fallback-reduced-motion.png'), fullPage: true });
  await fallbackContext.close();

  assert.deepEqual(errors, [], 'The interactive journeys must not cause uncaught browser errors.');
  console.log('Playground verified: 3D selection, atom properties, exact edits, rejection, Undo, bond orders, dragging, orbit, responsive widths, and reduced-motion WebGL fallback.');
  console.log(`Screenshots: ${screenshotDir}`);
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    await activePage.screenshot({ path: resolve(screenshotDir, 'playground-failure.png'), fullPage: true }).catch(() => {});
  }
  throw error;
} finally {
  await browser.close();
}
