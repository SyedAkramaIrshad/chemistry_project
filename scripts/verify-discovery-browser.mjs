import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

// Build through the same visible controls students use. Reading the mirrored
// diagram audits atom conservation and connectivity; no state-writing API is used.
const screenshotDir = resolve(process.env.PLAYGROUND_SCREENSHOTS_DIR || 'test-results');
await mkdir(screenshotDir, { recursive: true });
let server;
let baseURL = process.env.BASE_URL;
if (!baseURL) {
  const { createServer } = await import('vite');
  server = await createServer({ server: { host: '127.0.0.1', port: 0, hmr: false } });
  await server.listen();
  baseURL = `http://127.0.0.1:${server.httpServer.address().port}`;
}

const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {}),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const errors = [];
let page;
const bondKey = (a, b) => [a, b].sort((x, y) => x - y).join(':');
const plainFormula = (text) => text.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (digit) => '₀₁₂₃₄₅₆₇₈₉'.indexOf(digit));

async function graph() {
  return page.evaluate(() => ({
    atoms: [...document.querySelectorAll('#atomLayer .atom-cluster[data-id]')].map((node) => ({
      id: Number(node.dataset.id), symbol: node.dataset.symbol,
      charge: Number(node.dataset.charge),
      x: Number.parseFloat(node.style.left), y: Number.parseFloat(node.style.top),
    })).sort((a, b) => a.id - b.id),
    bonds: [...document.querySelectorAll('#bondLayer .bond-hit')].map((node) => ({
      key: node.dataset.bondKey, a: Number(node.dataset.a), b: Number(node.dataset.b), type: node.dataset.bondType,
    })).sort((a, b) => a.key.localeCompare(b.key)),
  }));
}

async function selectAtom(id) {
  const control = page.locator(`[data-scene-atom-id="${id}"]`);
  assert.ok(await control.isVisible(), `Atom ${id} must expose a visible keyboard control.`);
  // Keyboard activation is also operable when a projected bond crosses an atom.
  await control.press('Enter');
}

async function connect(source, target) {
  await page.locator('.builder-toolbar [data-bond-type="single"]').click();
  await selectAtom(source);
  await page.locator('#startSelectedBond').click();
  await selectAtom(target);
}

async function breakBond(a, b) {
  const before = await graph();
  const key = bondKey(a, b);
  await page.locator(`[data-scene-bond-key="${key}"]`).press('Enter');
  await page.locator('#breakBondBtn').click();
  const after = await graph();
  assert.deepEqual(after.atoms, before.atoms, 'Breaking an interaction must preserve all atoms and positions.');
  assert.deepEqual(after.bonds, before.bonds.filter((bond) => bond.key !== key));
}

async function add(symbol, source = null) {
  const before = await graph();
  await page.locator(`[data-build-element="${symbol}"]`).click();
  const after = await graph();
  assert.equal(after.atoms.length, before.atoms.length + 1, `Choosing ${symbol} must add exactly one atom.`);
  assert.deepEqual(after.atoms.filter((atom) => before.atoms.some((old) => old.id === atom.id)), before.atoms,
    'Adding a chosen atom must preserve the positions, elements, and charges already on the canvas.');
  const added = after.atoms.find((atom) => !before.atoms.some((old) => old.id === atom.id));
  assert.equal(added.symbol, symbol);
  assert.equal(added.charge, 0);
  assert.ok(Number.isFinite(added.x) && Number.isFinite(added.y));
  const addedBonds = after.bonds.filter((bond) => !before.bonds.some((old) => old.key === bond.key));
  assert.deepEqual(after.bonds.filter((bond) => before.bonds.some((old) => old.key === bond.key)), before.bonds);
  assert.equal(addedBonds.length, source == null ? 0 : 1,
    'Only an explicitly requested attachment may create a bond.');
  if (source != null) {
    assert.equal(addedBonds[0].key, bondKey(source, added.id));
    assert.equal(addedBonds[0].type, 'single');
  }
  return added;
}

async function recognized(name) {
  assert.match(await page.locator('#discoveryIdentity').innerText(), new RegExp(name, 'i'));
  const expectedKey = { Ethanol: 'C2H5OH', 'Dimethyl ether': 'CH3OCH3' }[name];
  assert.equal(await page.locator('#discoveryCard').getAttribute('data-recognized'), expectedKey,
    'Recognized identity must come from the current graph.');
}

async function molecularFormula() {
  return plainFormula(await page.locator('#discoveryCard .discovery-facts > div')
    .filter({ hasText: 'Molecular formula' }).locator('dd').innerText());
}

async function noOverflow(width) {
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  assert.ok(dimensions.content <= dimensions.width + 1,
    `The ${width}px student playground must fit the viewport (${dimensions.content}px content).`);
}

try {
  const context = await browser.newContext({ viewport: { width: 1460, height: 1050 } });
  page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${baseURL}/#laboratory`);
  await page.locator('#sceneLayer canvas').waitFor({ state: 'visible' });
  assert.equal((await graph()).atoms.length, 0, 'The student starts with an empty canvas, not a prebuilt answer.');
  assert.equal(await page.locator('#discoveryAttachToggle').isChecked(), true);
  await page.locator('#discoveryStartBtn').click();

  // C → C; add three H to the first C, two to the second C, then O and H.
  // Repeated quick additions deliberately retain the chosen attachment source.
  const firstC = await add('C');
  const secondC = await add('C', firstC.id);
  await add('H', firstC.id);
  await add('H', firstC.id);
  const beforeThirdH = await graph();
  await add('H', firstC.id);
  await page.locator('#undoBtn').click();
  assert.deepEqual(await graph(), beforeThirdH, 'One attachment must be exactly one Undo step.');
  await selectAtom(firstC.id);
  await add('H', firstC.id);

  // The source carbon now has all four ordinary covalent bonds. Rejecting a
  // fifth attachment must neither insert a loose H nor consume an Undo entry.
  const saturated = await graph();
  const hydrogenButton = page.locator('[data-build-element="H"]');
  if (await hydrogenButton.isEnabled()) {
    await hydrogenButton.click();
    assert.deepEqual(await graph(), saturated, 'An invalid attachment must leave the complete graph unchanged.');
    assert.match(await page.locator('#bondGuide').innerText(), /bond|site|full|four|4|capacity|permitted/i);
  } else assert.deepEqual(await graph(), saturated);
  await page.locator('#undoBtn').click();
  assert.deepEqual(await graph(), beforeThirdH, 'A blocked attachment must not add a phantom history step.');
  await selectAtom(firstC.id);
  await add('H', firstC.id);

  await selectAtom(secondC.id);
  await add('H', secondC.id);
  await add('H', secondC.id);
  const oxygen = await add('O', secondC.id);
  await selectAtom(oxygen.id);
  const hydroxylH = await add('H', oxygen.id);
  const ethanol = await graph();
  assert.equal(ethanol.atoms.length, 9);
  assert.equal(ethanol.bonds.length, 8);
  assert.deepEqual(ethanol.atoms.map((atom) => atom.symbol).sort(), ['C', 'C', 'H', 'H', 'H', 'H', 'H', 'H', 'O']);
  await recognized('Ethanol');
  assert.match(plainFormula(await page.locator('#discoveryCard').innerText()), /C2H5OH/);
  assert.equal(await molecularFormula(), 'C2H6O');

  // A new unconnected atom changes the composition without silently repairing
  // the molecule. Undo restores the recognized ethanol graph exactly.
  await page.locator('#discoveryAttachToggle').uncheck();
  await add('H');
  assert.equal(await page.locator('#discoveryCard').getAttribute('data-recognized'), '');
  await page.locator('#undoBtn').click();
  assert.deepEqual(await graph(), ethanol);
  await recognized('Ethanol');
  await page.locator('#discoveryAttachToggle').check();

  await breakBond(oxygen.id, hydroxylH.id);
  assert.equal(await page.locator('#discoveryCard').getAttribute('data-recognized'), '');
  await page.locator('#undoBtn').click();
  assert.deepEqual(await graph(), ethanol);
  await recognized('Ethanol');

  // Starting a new build is one explicit, reversible edit. Changing the goal
  // alone is checked separately below and must never clear or replace atoms.
  await page.locator('#discoveryStartBtn').click();
  assert.deepEqual(await graph(), { atoms: [], bonds: [] });
  await page.locator('#undoBtn').click();
  assert.deepEqual(await graph(), ethanol, 'Start again must preserve the whole previous structure in Undo.');
  await recognized('Ethanol');

  for (const width of [1460, 742, 390]) {
    await page.setViewportSize({ width, height: 1050 });
    await page.locator('#sceneResetBtn').click();
    await page.locator('#discoveryCard').scrollIntoViewIfNeeded();
    await noOverflow(width);
    await page.screenshot({ path: resolve(screenshotDir, `discovery-ethanol-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1460, height: 1050 });
  await page.locator('#sceneResetBtn').click();

  // Same nine atoms and C2H6O composition, different connectivity: CH3–O–CH3.
  // Rewire in public view; atom totals alone must never claim it is ethanol.
  await breakBond(firstC.id, secondC.id);
  await breakBond(oxygen.id, hydroxylH.id);
  await connect(firstC.id, oxygen.id);
  await connect(secondC.id, hydroxylH.id);
  const ether = await graph();
  assert.deepEqual(ether.atoms, ethanol.atoms, 'Making an isomer must retain the very same atoms.');
  assert.equal(ether.bonds.length, 8);
  await recognized('Dimethyl ether');
  assert.equal(await molecularFormula(), 'C2H6O');
  assert.match(await page.locator('#discoveryCard').innerText(), /isomer|connectivity|connected differently|different connections/i);
  await page.screenshot({ path: resolve(screenshotDir, 'discovery-ether-isomer.png'), fullPage: true });

  const beforeGoalChange = await graph();
  await page.locator('#discoveryGoalSelect').selectOption('dimethyl-ether');
  assert.deepEqual(await graph(), beforeGoalChange, 'Changing the learning target must not rewrite the student graph.');
  await recognized('Dimethyl ether');
  await page.locator('#discoveryFreeBtn').click();
  assert.deepEqual(await graph(), beforeGoalChange, 'Free build must keep every student-made atom and bond.');
  await recognized('Dimethyl ether');
  await context.close();

  // Learning cues also work without WebGL. A supplied answer is clearly a
  // reference, and an explicit 2D edit immediately updates its identity/cues.
  const fallbackContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await fallbackContext.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      if (String(kind).toLowerCase().includes('webgl')) return null;
      return getContext.call(this, kind, ...args);
    };
  });
  page = await fallbackContext.newPage();
  page.on('pageerror', (error) => errors.push(`2D discovery: ${error.message}`));
  await page.goto(`${baseURL}/#laboratory`);
  await page.locator('#sceneStatus').filter({ hasText: /2D editing ready/ }).waitFor({ state: 'visible' });
  await page.locator('#discoveryReferenceBtn').click();
  await recognized('Ethanol');
  assert.match(await page.locator('#discoveryCard').innerText(), /Reference structure/i);
  assert.match(await page.locator('#discoveryNextAction').innerText(), /Reference on canvas/i);
  assert.doesNotMatch(await page.locator('#discoveryCollection').innerText(), /Ethanol/,
    'Loading an answer must not claim the student discovered it.');
  const reference = await graph();
  const referenceO = reference.atoms.find((atom) => atom.symbol === 'O');
  const referenceOH = reference.bonds.find((bond) => [bond.a, bond.b].includes(referenceO.id)
    && reference.atoms.find((atom) => atom.id === (bond.a === referenceO.id ? bond.b : bond.a)).symbol === 'H');
  const groupAtoms = await page.locator('#atomLayer .atom-cluster.discovery-group').evaluateAll((nodes) =>
    nodes.map((node) => Number(node.dataset.id)).sort((a, b) => a - b));
  assert.deepEqual(groupAtoms, [referenceOH.a, referenceOH.b].sort((a, b) => a - b),
    'The 2D drawing must visibly identify the same O–H group described in the coach.');
  assert.ok(await page.locator('#bondLayer .bond-visible.discovery-group').count() > 0);
  await page.locator(`#atomLayer .atom-node[data-id="${referenceO.id}"]`).press('Enter');
  await page.locator('#selectedBondList .bond-item').filter({ hasText: /^H\s/ }).locator('button').click();
  const openReference = await graph();
  assert.deepEqual(openReference.atoms, reference.atoms);
  assert.deepEqual(openReference.bonds, reference.bonds.filter((bond) => bond.key !== referenceOH.key));
  assert.equal(await page.locator('#discoveryCard').getAttribute('data-recognized'), '');
  assert.equal(await page.locator('#atomLayer .atom-cluster.discovery-group').count(), 0);
  assert.doesNotMatch(await page.locator('#discoveryNextAction').innerText(), /Reference on canvas/i);
  await noOverflow(390);
  await page.screenshot({ path: resolve(screenshotDir, 'discovery-fallback-open-ethanol.png'), fullPage: true });
  await page.locator('#undoBtn').click();
  assert.deepEqual(await graph(), reference, 'Undo must restore the complete reference graph.');
  assert.match(await page.locator('#discoveryCard').innerText(), /Reference structure/i);
  assert.match(await page.locator('#discoveryNextAction').innerText(), /Reference on canvas/i);
  assert.doesNotMatch(await page.locator('#discoveryCollection').innerText(), /Ethanol/,
    'Undoing an edit to a supplied answer must retain its reference provenance.');
  await fallbackContext.close();

  assert.deepEqual(errors, [], 'Student discovery must not produce uncaught browser errors.');
  console.log('Discovery verified: an empty start, explicit atom attachments, bond limits, exact Undo, ethanol recognition, open-state withdrawal, ether isomer recognition, non-destructive goals, responsive layout, and 2D reference/group feedback.');
  console.log(`Screenshots: ${screenshotDir}`);
} catch (error) {
  if (page && !page.isClosed()) {
    await page.screenshot({ path: resolve(screenshotDir, 'discovery-failure.png'), fullPage: true }).catch(() => {});
  }
  throw error;
} finally {
  await browser.close();
  await server?.close();
}
