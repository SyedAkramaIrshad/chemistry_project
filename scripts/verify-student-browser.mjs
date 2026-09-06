import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { ChemistryLibrary } from '../src/chemistry/runtime.js';
import { DISCOVERY_GOALS, createDiscoveryLibrary } from '../src/chemistry/playgroundDiscovery.js';

// Run against the CI preview. All molecule edits use visible student controls;
// storage injection is confined to malformed-data and unavailable-storage tests.
const baseURL = process.env.BASE_URL;
assert.ok(baseURL, 'BASE_URL must identify the test server.');
const engineName = process.env.STUDENT_BROWSER || 'chromium';
const engine = { chromium, firefox, webkit }[engineName];
assert.ok(engine, 'Unknown browser engine.');
const screenshots = resolve('test-results', engineName);
await mkdir(screenshots, { recursive: true });
const browser = await engine.launch({ headless: true, ...(engineName === 'chromium' ? { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } : {}) });
const library = createDiscoveryLibrary(ChemistryLibrary);
const errors = [], completed = [], failures = [];
let page;
const draftKey = 'chemlab.playgroundDraft.v1', savedKey = 'chemlab.savedStructures.v2';
const graph = () => page.evaluate(() => ({
  atoms: [...document.querySelectorAll('#atomLayer .atom-cluster[data-id]')].map(n => ({ id: Number(n.dataset.id), symbol: n.dataset.symbol, charge: Number(n.dataset.charge), x: parseFloat(n.style.left), y: parseFloat(n.style.top) })).sort((a,b) => a.id-b.id),
  bonds: [...document.querySelectorAll('#bondLayer .bond-hit')].map(n => ({ key:n.dataset.bondKey, a:Number(n.dataset.a), b:Number(n.dataset.b), type:n.dataset.bondType })).sort((a,b) => a.key.localeCompare(b.key)),
}));
const identity = () => page.locator('#discoveryCard').getAttribute('data-recognized');
const atom = async id => page.locator(await page.locator('#workspace').evaluate(n=>n.classList.contains('scene-ready')) ? `[data-scene-atom-id="${id}"]` : `#atomLayer .atom-node[data-id="${id}"]`);
async function ready() { await page.locator('[data-build-element="O"]').waitFor({state:'visible'}); await page.locator('#sceneStatus').filter({hasText:/2D editing ready|Drop one atom/}).waitFor(); }
async function start(goal='water', attach=true) { await page.locator('#discoveryGoalSelect').selectOption(goal); await page.locator('#discoveryStartBtn').click(); await page.locator('#discoveryAttachToggle').setChecked(attach); }
async function add(symbol) { const before=await graph(); await page.locator(`[data-build-element="${symbol}"]`).click(); const after=await graph(); assert.equal(after.atoms.length,before.atoms.length+1,`Add ${symbol}`); return after.atoms.find(a=>!before.atoms.some(b=>a.id===b.id)).id; }
async function water() { await start(); for(const s of ['O','H','H']) await add(s); assert.equal(await identity(),'H2O'); }
async function select(id) { await (await atom(id)).press('Enter'); }
async function connect(a,b) { await (await atom(a)).press('b'); await (await atom(b)).press('Enter'); }
async function open(options={}, init) {
  const context=await browser.newContext({viewport:{width:1460,height:1000},reducedMotion:'reduce',...options});
  if(init) await context.addInitScript(init);
  page=await context.newPage(); page.setDefaultTimeout(20000); page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${baseURL}/#laboratory`); await ready(); return context;
}
async function check(name,fn) {
  try { await fn(); completed.push(name); console.log(`PASS ${engineName}: ${name}`); }
  catch(error) { failures.push({name,error:error.stack||String(error)}); console.error(`FAIL ${engineName}: ${name}\n${error.stack||error}`); if(page&&!page.isClosed())await page.screenshot({path:resolve(screenshots,`failure-${failures.length}.png`),fullPage:true}).catch(()=>{}); }
}
async function fits(width) { const d=await page.evaluate(()=>({width:document.documentElement.clientWidth,content:document.documentElement.scrollWidth})); assert.ok(d.content<=d.width+1,`${width}: ${JSON.stringify(d)}`); }

try {
  let context=await open();
  await check('six goals built atom-by-atom, break and exact Undo',async()=>{
    for(const goal of DISCOVERY_GOALS){
      await start(goal.id,false); const ref=library.MOLECULES[goal.key],ids=new Map();
      for(const a of ref.atoms) ids.set(a.id,await add(a.symbol));
      assert.equal((await graph()).bonds.length,0);
      for(const b of ref.bonds) await connect(ids.get(b.a),ids.get(b.b));
      assert.equal(await identity(),goal.key,goal.name);
      const built=await graph(),edge=built.bonds[0];
      await select(edge.a);
      await page.locator('#selectedBondList .bond-item button').first().click();
      assert.equal((await graph()).bonds.length,built.bonds.length-1);
      assert.equal(await identity(),'');
      await page.locator('#undoBtn').click(); assert.deepEqual(await graph(),built);
    }
  });
  await check('water Undo retains oxygen attachment selection',async()=>{
    await water(); await page.locator('#undoBtn').click(); await add('H'); assert.equal(await identity(),'H2O');
    const before=await graph(); await page.locator('[data-build-element="H"]').click(); assert.deepEqual(await graph(),before);
    await page.locator('#undoBtn').click(); assert.equal((await graph()).atoms.length,2);
  });
  await check('hint button selects the next carbon without editing',async()=>{
    await start('ethanol'); const first=await add('C'),second=await add('C');
    for(let i=0;i<3;i++) await add('H');
    const before=await graph(); assert.equal(before.atoms[0].id,first);
    await page.locator('#discoverySelectHint').click(); assert.deepEqual(await graph(),before);
    await (await atom(second)).locator('xpath=self::*[@aria-pressed="true"]').waitFor();
    const h=await add('H'); assert.ok((await graph()).bonds.some(b=>[b.a,b.b].includes(second)&&[b.a,b.b].includes(h)));
  });
  await check('refresh restores graph, goal, selection and Undo; Clear persists',async()=>{
    await water(); const before=await graph(); await page.reload(); await ready();
    assert.deepEqual(await graph(),before); assert.equal(await page.locator('#discoveryGoalSelect').inputValue(),'water');
    await page.locator('#undoBtn').click(); await add('H'); assert.equal(await identity(),'H2O');
    await page.locator('#clearBtn').click(); await page.reload(); await ready(); assert.equal((await graph()).atoms.length,0);
    await page.locator('#undoBtn').click(); assert.equal(await identity(),'H2O');
  });
  await check('manual saves keep authorship and empty-to-reference can be undone',async()=>{
    await water(); const own=await graph(); await page.locator('#saveStructureBtn').click();
    await page.locator('#clearBtn').click();
    await page.locator('.saved-panel summary').click(); await page.locator('#savedList').getByRole('button',{name:'Load',exact:true}).first().click();
    assert.equal(await identity(),'H2O'); assert.deepEqual((await graph()).atoms.map(a=>a.symbol),own.atoms.map(a=>a.symbol)); assert.equal((await graph()).bonds.length,own.bonds.length); assert.doesNotMatch(await page.locator('#discoveryCard').innerText(),/Reference structure/i);
    await page.locator('#clearBtn').click(); await page.locator('#discoveryReferenceBtn').click(); assert.equal(await identity(),'H2O');
    assert.match(await page.locator('#discoveryCard').innerText(),/Reference structure/i);
    await page.locator('#undoBtn').click(); assert.equal((await graph()).atoms.length,0);
    await page.locator('#discoveryReferenceBtn').click(); await page.reload(); await ready();
    assert.match(await page.locator('#discoveryCard').innerText(),/Reference structure/i);
  });
  await check('hidden playground and unsupported Redo do not edit molecules',async()=>{
    await water(); const before=await graph();
    await page.locator('.nav-links a[href="#curriculum"]').click();
    await page.keyboard.press('Delete'); await page.keyboard.press('Control+z'); await page.keyboard.press('Control+Shift+z');
    await page.locator('.nav-links a[href="#laboratory"]').click(); assert.deepEqual(await graph(),before);
    await page.keyboard.press('Control+Shift+z'); assert.deepEqual(await graph(),before);
  });
  await check('dialogs contain focus, protect work and restore their trigger',async()=>{
    const before=await graph(); await page.locator('#howBtn').click();
    assert.equal(await page.locator('.app-shell').evaluate(n=>n.inert),true);
    for(let i=0;i<12;i++){ await page.keyboard.press(i%2?'Shift+Tab':'Tab'); assert.equal(await page.locator('#howModal').evaluate(n=>n.contains(document.activeElement)),true); }
    await page.keyboard.press('Delete'); await page.keyboard.press('Control+z'); assert.deepEqual(await graph(),before);
    await page.keyboard.press('Escape'); assert.equal(await page.locator('#howBtn').evaluate(n=>n===document.activeElement),true);
    assert.equal(await page.locator('.app-shell').evaluate(n=>n.inert),false);
  });
  await check('MOL export contains the student atoms and bonds',async()=>{
    await water(); const downloadPromise=page.waitForEvent('download'); await page.locator('#exportMolBtn').click();
    const download=await downloadPromise; const path=await download.path(); const mol=await readFile(path,'utf8');
    assert.match(mol,/M  END/); assert.match(mol,/\s3\s+2\s.*V2000/);
  });
  await context.close();

  context=await open({},()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return String(kind).includes('webgl')?null:original.call(this,kind,...args);};});
  await check('2D keyboard sockets, retained focus and rejected hydrogen bonds',async()=>{
    await start('water',false); const o=await add('O'),h1=await add('H'),h2=await add('H');
    const socket=page.locator(`.bond-handle[data-atom-id="${o}"]`).first(); await socket.press('Enter');
    await (await atom(h1)).press('Enter'); assert.equal((await graph()).bonds.length,1);
    await (await atom(o)).press('Enter'); assert.equal(await (await atom(o)).evaluate(n=>n===document.activeElement),true);
    await connect(o,h2); assert.equal(await identity(),'H2O');
    const built=await graph(); const looseH=await add('H'); const beforeReject=await graph(); await connect(looseH,h1); assert.deepEqual(await graph(),beforeReject); await page.locator('#undoBtn').click(); assert.deepEqual(await graph(),built);
    await page.keyboard.press('Escape');
    await page.locator('.builder-toolbar [data-bond-type="double"]').click();
    assert.equal(await page.locator('.builder-toolbar [data-bond-type="double"]').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('.builder-toolbar [data-bond-type="single"]').getAttribute('aria-pressed'),'false');
  });
  await check('socket gestures ignore a second pointer and cancel on blur',async()=>{
    await start('water',false); const o=await add('O'),h=await add('H'); const before=await graph();
    const socket=page.locator(`.bond-handle[data-atom-id="${o}"]`).first(); const box=await socket.boundingBox();
    await socket.dispatchEvent('pointerdown',{pointerId:41,pointerType:'touch',button:0,clientX:box.x+5,clientY:box.y+5,bubbles:true});
    const target=await (await atom(h)).boundingBox();
    await page.locator('body').dispatchEvent('pointerup',{pointerId:42,pointerType:'touch',clientX:target.x+20,clientY:target.y+20,bubbles:true});
    assert.deepEqual(await graph(),before);
    await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
    await (await atom(h)).press('Enter'); assert.deepEqual(await graph(),before);
  });
  await check('a cancelled 2D drag restores positions and does not consume Undo',async()=>{
    await water(); const before=await graph(),o=before.atoms.find(a=>a.symbol==='O'); const control=await atom(o.id);
    await control.scrollIntoViewIfNeeded(); const box=await control.boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2); await page.mouse.down();
    await page.mouse.move(box.x+100,box.y+70,{steps:5}); await page.keyboard.press('Escape'); await page.mouse.up();
    assert.deepEqual(await graph(),before); await page.locator('#undoBtn').click(); assert.equal((await graph()).atoms.length,2);
  });
  await check('Tab reaches building controls; narrow and zoom-equivalent layouts fit',async()=>{
    await page.locator('#discoveryGoalSelect').focus(); let found=false;
    for(let i=0;i<30;i++){await page.keyboard.press('Tab');if(await page.evaluate(()=>document.activeElement?.hasAttribute('data-build-element'))){found=true;break;}}
    assert.ok(found,'Quick atom controls must be in the real Tab sequence.');
    for(const width of [742,640,390,320]){await page.setViewportSize({width,height:900});await fits(width);await page.waitForFunction(()=>{const w=document.querySelector('#workspace');return [...document.querySelectorAll('#atomLayer .atom-cluster')].every(n=>{const x=parseFloat(n.style.left),y=parseFloat(n.style.top);return x>=57&&x<=w.clientWidth-57&&y>=57&&y<=w.clientHeight-57;});});}
    // A 1280px window at 200% page zoom has a 640px effective layout viewport.
    // CSS zoom on the root does not exercise viewport media queries and is not
    // a faithful browser-zoom simulation. Native browser chrome is not tested.
    await page.setViewportSize({width:640,height:1000}); await fits('640px effective zoom viewport');
    await page.screenshot({path:resolve(screenshots,'2d-640-reflow.png'),fullPage:true});
  });
  await context.close();

  context=await open({viewport:{width:390,height:844},hasTouch:true});
  await check('touch taps build water on a phone-sized screen',async()=>{
    await start(); for(const s of ['O','H','H']) await page.locator(`[data-build-element="${s}"]`).tap();
    assert.equal(await identity(),'H2O'); await fits(390);
    await page.screenshot({path:resolve(screenshots,'touch-water.png'),fullPage:true});
  });
  await context.close();

  for(const invalid of ['null','{}','[null]','{broken']){
    context=await open();
    await check(`damaged saved data ${invalid} cannot crash startup`,async()=>{
      await page.evaluate(({invalid,draftKey,savedKey})=>{localStorage.setItem(savedKey,invalid);sessionStorage.setItem(draftKey,invalid);},{invalid,draftKey,savedKey});
      await page.reload();await ready();await water();await page.locator('#saveStructureBtn').click();assert.equal(await identity(),'H2O');
    });await context.close();
  }
  context=await open({},()=>{Storage.prototype.setItem=function(){throw new DOMException('Storage disabled','QuotaExceededError');};});
  await check('unavailable storage leaves editing and export usable',async()=>{
    await water();assert.match(await page.locator('#draftStatus').innerText(),/unavailable|export|save/i);await page.locator('#saveStructureBtn').click();assert.equal(await identity(),'H2O');assert.equal(await page.locator('#exportMolBtn').isEnabled(),true);
  });await context.close();
  context=await open();
  await check('malformed URL hash cannot crash the application',async()=>{await page.goto(`${baseURL}/#%`);await page.reload();await ready();await water();});await context.close();
  assert.deepEqual(failures,[],'Every student journey must pass');
  assert.deepEqual(errors,[],'No uncaught student-facing errors');
  console.log(JSON.stringify({browser:engineName,passed:completed.length,journeys:completed},null,2));
} catch(error){
  if(page&&!page.isClosed())await page.screenshot({path:resolve(screenshots,'failure.png'),fullPage:true}).catch(()=>{});
  throw error;
} finally {await browser.close();}
