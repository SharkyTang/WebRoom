import { chromium } from '@playwright/test';
import { tsImport } from 'tsx/esm/api';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { waitForCanvasReady } from './helpers/browserReady.mjs';

// Normal sessions use native inputs and read-only diagnostics. Inspection is an isolated preview only.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const aliases = { '1': 'architecture', '2': 'collections', '3': 'living', '4': 'fixtures' };
const requestedStage = process.env.ROOM_C_STAGE ?? 'all', stage = aliases[requestedStage] ?? requestedStage;
const groups = { architecture: ['eiffel', 'hogwarts', 'minastirith'], collections: ['falcon', 'bridge', 'sls', 'ferrari', 'mercedes'], living: ['plants', 'cola', 'dog'], fixtures: ['fixtures', 'wallart'] };
const cFamilies = Object.values(groups).flat();
assert(stage === 'all' || stage in groups, 'ROOM_C_STAGE: architecture | collections | living | fixtures | all (or 1/2/3/4)');
const selected = stage === 'all' ? cFamilies : groups[stage];
const production = process.env.ROOM_TEST_PRODUCTION === '1', inspection = process.env.ROOM_C_INSPECTION === '1';
assert(!(production && inspection), 'Inspection preview is separate from normal production acceptance');
const output = process.env.ROOM_TEST_OUTPUT ?? path.join(root, 'validation/v06c', inspection ? `inspection-${stage}` : stage);
const origin = process.env.ROOM_TEST_URL ?? `http://127.0.0.1:${inspection ? 3003 : production ? 3001 : 3000}`;
const stem = inspection ? 'collection-decor-inspection' : production ? 'collection-decor-production' : 'collection-decor-browser';
const inspectionSourceRoot = process.env.ROOM_C_INSPECTION_SOURCE_ROOT ? path.resolve(process.env.ROOM_C_INSPECTION_SOURCE_ROOT) : null;
if (inspectionSourceRoot) { assert(inspection, 'Alternate manifest is allowed only for an explicitly isolated inspection preview'); const marker = JSON.parse(await fs.readFile(path.join(inspectionSourceRoot, '.v06c-inspection-preview.json'), 'utf8')); assert.equal(marker.sourceRoot, root); assert.equal(marker.target, inspectionSourceRoot); }
const { assetManifest, assetFamilies, decorFamilies = [] } = await tsImport(inspectionSourceRoot ? path.join(inspectionSourceRoot, 'lib/room/assets/assetManifest.ts') : '../lib/room/assets/assetManifest.ts', import.meta.url);
const { interactionIds, interactiveObjects } = await tsImport('../lib/room/interactiveObjects.ts', import.meta.url);
const { SOURCE_NODE_COUNT } = await tsImport('../lib/room/sceneConstants.ts', import.meta.url);
const expectedOld = ['monitor', 'macbook', 'marshall', 'floor', 'walls', 'door', 'window', 'curtains', 'desk', 'cabinet', 'bed', 'bedside', 'sofa', 'chair', 'coffee', 'sidetable', 'beanbag', 'rugs', 'dogbed', 'piano', 'ipad', 'phone', 'trashcan', 'lightswitch', 'keyboard', 'mouse', 'headphones'];
for (const family of [...expectedOld, ...selected]) assert(assetFamilies.includes(family), `Stage ${stage} requires ${family}`);
for (const family of decorFamilies) assert(cFamilies.includes(family), `Unapproved C family: ${family}`);
assert.equal(new Set(decorFamilies).size, decorFamilies.length);
assert.deepEqual([...assetFamilies].sort(), [...expectedOld, ...decorFamilies].sort(), 'Exactly protected 27 and explicitly registered C families');
const baselinePath = process.env.ROOM_C_PERFORMANCE_BASELINE_FILE ?? path.join(root, 'validation/v06c/baseline/performance.json');
const baseline = JSON.parse(await fs.readFile(baselinePath, 'utf8'));
assert.equal(baseline.summary.failed, 0); assert.deepEqual([...baseline.families].sort(), [...expectedOld].sort(), 'Use the current pre-C 27-family baseline');
for (const model of baseline.modelFiles) assert.equal(createHash('sha256').update(await fs.readFile(path.join(root, 'public', model.url))).digest('hex'), model.sha256, `Protected pre-C export changed: ${model.url}`);
const titles = { monitor: 'Projects', macbook: 'About / Education', ipad: 'Memories', phone: 'Contact', marshall: 'Music', piano: 'Piano', trashcan: 'Deleted ideas', lightswitch: 'Room lights', window: 'Environment' };
const desktop = { width: 1440, height: 900 }, tablet = { width: 768, height: 1024 }, mobile = { width: 390, height: 844 };
const viewports = stage === 'all' ? [desktop, tablet, mobile] : [desktop, mobile];
const ids = stage === 'all' ? interactionIds : ['monitor', 'ipad', 'piano', 'lightswitch', 'window'];
const contexts = new Set(), checks = [], runtime = [], requests = [], observations = { viewports: {}, nativeInputs: [], baselinePath };
await fs.mkdir(output, { recursive: true });
await fs.access(path.join(output, `${stem}.json`)).then(() => { throw new Error(`Refusing to overwrite ${output}/${stem}.json`); }, error => { if (error.code !== 'ENOENT') throw error; });
const hashes = async () => Object.fromEntries(await Promise.all(assetFamilies.map(async family => [family, createHash('sha256').update(await fs.readFile(path.join(root, 'public', assetManifest[family].url))).digest('hex')])));
observations.exportHashesAtStart = await hashes();
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const sorted = values => [...values].sort();
const snap = page => page.evaluate(() => window.__ROOM_DEBUG__?.snapshot());
const surfaceState = (state, family) => state.assetVisuals[family].stateSurfaces;
const screenContent = (state, family) => surfaceState(state, family).map(({ name, mapName, textureUpdates }) => ({ name, mapName, textureUpdates }));
function shellState(state, family) {
  const surfaces = surfaceState(state, family).map(surface => surface.name);
  return state.assetVisuals[family].materialState.filter(material => !surfaces.includes(material.mesh));
}
function observe(page, phase) {
  page.on('pageerror', error => runtime.push({ phase, type: 'pageerror', text: error.message }));
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) runtime.push({ phase, type: message.type(), text: message.text() }); });
  page.on('requestfailed', request => requests.push({ phase, url: request.url(), error: request.failure()?.errorText }));
}
async function contextFor(viewport = desktop, { reduced = false, video = false } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: viewport.width === 390, isMobile: viewport.width === 390, reducedMotion: reduced ? 'reduce' : 'no-preference', ...(video ? { recordVideo: { dir: path.join(output, 'raw-video'), size: desktop } } : {}) });
  contexts.add(context); return context;
}
async function close(context) { await context.close(); contexts.delete(context); }
async function loaded(page, expected = {}) {
  await page.waitForSelector('[data-room-status="ready"]', { timeout: 90000 });
  for (const family of assetFamilies) await page.waitForSelector(`[data-asset-${family}="${expected[family] ?? 'installed'}"]`, { timeout: 20000 });
  if (production) return null;
  const state = await snap(page); assert(state, 'Read-only development diagnostics required');
  assert.equal(state.assembly.ok, true, JSON.stringify(state.assembly.errors)); assert.deepEqual(state.assembly.errors, []);
  assert.equal(state.assembly.sourceNodeCount, SOURCE_NODE_COUNT); assert.equal(state.validation.nodeCount, SOURCE_NODE_COUNT);
  assert.deepEqual(sorted(Object.keys(state.assets)), sorted(assetFamilies));
  const installed = assetFamilies.filter(family => (expected[family] ?? 'installed') === 'installed');
  assert.deepEqual(sorted(state.assembly.installedFamilies), sorted(installed));
  assert.equal(state.validation.mappings.length, interactionIds.length);
  for (const id of interactionIds) {
    const mapping = state.validation.mappings.find(mapping => mapping.id === id);
    assert(mapping, `Original semantic mapping remains present: ${id}`);
    assert.equal(mapping.targetName, interactiveObjects[id].target);
    assert.deepEqual(sorted(mapping.nodeNames), sorted(interactiveObjects[id].nodes));
  }
  for (const family of assetFamilies) {
    assert.equal(state.assets[family].status, expected[family] ?? 'installed');
    assert.equal(state.assetVisuals[family].meshes > 0, installed.includes(family), `${family} formal VIS presence disagrees with install state`);
    if (installed.includes(family) && decorFamilies.includes(family)) assert.equal(new Set(state.assetVisuals[family].materialState.map(material => material.mesh)).size, state.assetVisuals[family].meshes, `${family}: every installed C mesh must retain its production PBR material; hidden proxy materials are not a visible installation`);
  }
  return state;
}
async function open({ viewport = desktop, phase = 'normal', reduced = false, video = false } = {}) {
  const context = await contextFor(viewport, { reduced, video }), page = await context.newPage(); observe(page, phase);
  await page.goto(production ? origin : `${origin}/?debug=1&demand=1`, { waitUntil: 'domcontentloaded' }); await loaded(page); return page;
}
async function screenshot(page, name, clip) {
  await page.screenshot({ path: path.join(output, name), style: '.debug-panel {visibility:hidden !important;}', ...(clip ? { clip } : {}) }); return name;
}
async function check(name, operation, page) {
  try { const detail = await operation(); checks.push({ name, passed: true, detail }); console.log(`PASS ${name}`); return detail; }
  catch (error) {
    const failure = { name, passed: false, error: String(error.stack ?? error) };
    if (page && !page.isClosed()) { failure.snapshot = production ? null : await snap(page).catch(() => null); failure.body = await page.locator('body').innerText().catch(() => ''); await screenshot(page, `failure-${checks.length + 1}.png`).catch(() => {}); }
    checks.push(failure); console.error(`FAIL ${name}: ${error.message}`); throw error;
  }
}
async function stateIs(page, expected) {
  await page.waitForFunction(expected => { const state = window.__ROOM_DEBUG__?.snapshot().interaction; return state && Object.entries(expected).every(([key, value]) => state[key] === value); }, expected, { timeout: 30000 });
}
async function input(page, point, touch = false) {
  if (!production) observations.nativeInputs.push(await page.evaluate(point => ({ point, hit: window.__ROOM_DEBUG__.hitTest(point.x, point.y) }), point));
  if (touch) await page.touchscreen.tap(point.x, point.y); else await page.mouse.click(point.x, point.y);
}
async function pointFor(page, { id = null, family = null, runtimeTarget = null, anchors = null }) {
  await waitForCanvasReady(page, { timeoutMs: 20000 });
  const result = await page.evaluate(({ id, family, runtimeTarget, anchors }) => {
    const api = window.__ROOM_DEBUG__, canvas = document.querySelector('canvas'), rect = canvas.getBoundingClientRect();
    const inspect = point => {
      if (!point || document.elementFromPoint(point.x, point.y) !== canvas) return null;
      const hit = api.hitTest(point.x, point.y);
      if (!hit || hit.semanticId !== id || (family && hit.assetFamily !== family) || (runtimeTarget && hit.runtimeTarget !== runtimeTarget) || (anchors && !anchors.some(anchor => hit.ancestors.includes(anchor)))) return null;
      return { point, hit };
    };
    const direct = id ? inspect(api.projected()[id]) : null; if (direct) return direct;
    for (const step of [8, 3, 1]) for (let y = Math.ceil(rect.y) + 1; y < rect.bottom; y += step) for (let x = Math.ceil(rect.x) + 1; x < rect.right; x += step) { const result = inspect({ x, y }); if (result) return result; }
    return null;
  }, { id, family, runtimeTarget, anchors });
  assert(result, `No visible native pixel: ${JSON.stringify({ id, family, runtimeTarget, anchors })}`); return result;
}
async function activate(page, id, touch = false, fallback = false) {
  const target = await pointFor(page, { id, family: !fallback && assetFamilies.includes(id) ? id : null });
  await input(page, target.point, touch); await stateIs(page, { activeObject: id, interactionPhase: 'focused', isCameraBusy: false });
  await page.getByRole('heading', { name: titles[id], exact: true }).waitFor(); await page.mouse.move(0, 0);
  return { target, state: await snap(page) };
}
async function back(page, hero, touch = false, esc = false) {
  if (esc) await page.keyboard.press('Escape');
  else { const button = page.getByRole('button', { name: 'Back', exact: true }); if (touch) await button.tap(); else await button.click(); }
  if (production) { await page.waitForSelector('[data-interaction-phase="idle"]', { timeout: 30000 }); return null; }
  await stateIs(page, { activeObject: null, interactionPhase: 'idle', isCameraBusy: false }); await page.mouse.move(0, 0);
  const state = await snap(page); if (hero) assert.deepEqual(state.camera, hero, 'Back/ESC returns the exact frozen Hero');
  assert.equal(state.assembly.ok, true); assert.equal(state.interaction.error, null); return state;
}
async function clickToggle(page, touch) { const button = page.getByRole('button', { name: 'Toggle piano', exact: true }); if (touch) await button.tap(); else await button.click(); }
async function pianoReopen(page, hero, touch, prefix, { half = false, cycles = 1 } = {}) {
  const entry = await activate(page, 'piano', touch), endpoints = entry.state.mechanical.sourceEndpoints;
  assert.equal(endpoints.pianoTravel, .65);
  // First entry demonstrates retract/extend; subsequent entries toggle the actual
  // endpoint. Use the existing control if this entry retracted the piano.
  const preparedWithToggle = entry.state.interaction.pianoState === 'retracted';
  if (preparedWithToggle) { await clickToggle(page, touch); await stateIs(page, { pianoState: 'extended', interactionPhase: 'focused' }); }
  const prepared = await snap(page); assert.equal(prepared.interaction.pianoState, 'extended'); assert.equal(prepared.mechanical.transforms.piano.position[2], endpoints.pianoExtendedZ);
  await screenshot(page, `${prefix}-piano-extended.png`);
  const result = { initialTarget: entry.target, entryState: entry.state.interaction.pianoState, preparedWithToggle, endpoints, cycles: [], half: null };
  for (let cycle = 0; cycle < cycles; cycle++) {
    if (half && cycle === 0) {
      await page.evaluate(() => { window.__cPianoMotion = []; window.__cObservePiano = true; function sample() { const state = window.__ROOM_DEBUG__.snapshot(); window.__cPianoMotion.push({ atMs: performance.now(), pianoState: state.interaction.pianoState, transform: state.mechanical.transforms.piano, assembly: state.assembly }); if (window.__cObservePiano) requestAnimationFrame(sample); } sample(); });
    }
    await clickToggle(page, touch);
    if (half && cycle === 0) {
      await page.waitForFunction(() => { const state = window.__ROOM_DEBUG__.snapshot(), endpoint = state.mechanical.sourceEndpoints, fraction = (state.mechanical.transforms.piano.position[2] - endpoint.pianoRetractedZ) / endpoint.pianoTravel; return state.interaction.pianoState === 'retracting' && fraction > .15 && fraction < .85; }, undefined, { polling: 'raf', timeout: 15000 });
      const before = await snap(page); await screenshot(page, `${prefix}-piano-half-observation.png`); const after = await snap(page);
      result.half = { before: before.mechanical.transforms.piano, after: after.mechanical.transforms.piano, note: 'Screenshot requested during observed intermediate motion; before/after snapshots bracket capture without pausing or mutating animation.' };
    }
    await stateIs(page, { pianoState: 'retracted', interactionPhase: 'focused' });
    const retracted = await snap(page); assert.equal(retracted.mechanical.transforms.piano.position[2], endpoints.pianoRetractedZ);
    if (half && cycle === 0) { result.motion = await page.evaluate(() => { window.__cObservePiano = false; return window.__cPianoMotion; }); assert(result.motion.some(sample => sample.transform.position[2] > endpoints.pianoRetractedZ && sample.transform.position[2] < endpoints.pianoExtendedZ)); for (const sample of result.motion) { assert(sample.transform.position[2] >= endpoints.pianoRetractedZ - 1e-9 && sample.transform.position[2] <= endpoints.pianoExtendedZ + 1e-9); assert.equal(sample.assembly.ok, true); } }
    if (cycle === 0) await screenshot(page, `${prefix}-piano-retracted.png`);
    const returned = await back(page, hero, touch); assert.equal(returned.interaction.pianoState, 'retracted', 'Back must not alter actual piano state');
    const target = await pointFor(page, { id: 'piano', runtimeTarget: 'PianoRetractedHitArea' }); assert.equal((await snap(page)).pianoRetractedHitAreaActive, true);
    if (cycle === 0) await screenshot(page, `${prefix}-piano-underdesk-before-reopen.png`);
    await input(page, target.point, touch); await stateIs(page, { pianoState: 'extended', activeObject: 'piano', interactionPhase: 'focused' });
    const reopened = await snap(page); assert.equal(reopened.mechanical.transforms.piano.position[2], endpoints.pianoExtendedZ); assert.equal(reopened.pianoRetractedHitAreaActive, false); assert.equal(reopened.assembly.ok, true);
    result.cycles.push({ target, retracted: retracted.mechanical.transforms.piano, reopened: reopened.mechanical.transforms.piano });
    if (cycle === 0) await screenshot(page, `${prefix}-piano-reopened.png`);
  }
  await back(page, hero, touch); return result;
}
function resourceShape(state) {
  return { runtimeNodeCount: state.assembly.runtimeNodeCount, rendererMemory: state.rendererMemory, families: Object.fromEntries(assetFamilies.map(family => { const value = state.assetVisuals[family]; return [family, { meshes: value.meshes, materials: value.materials, triangles: value.triangles, textures: value.textures.map(({ name, width, height, colorSpace, estimatedRGBABytesWithMipmaps }) => ({ name, width, height, colorSpace, estimatedRGBABytesWithMipmaps })) }]; })) };
}
async function verifyScreen(page, family, before, active) {
  const surfaces = surfaceState(active, family); assert(surfaces.length > 0, `${family} needs separate display surface`);
  assert(shellState(active, family).length > 0, `${family} requires independent housing`);
  assert(surfaces.every(surface => surface.emissiveIntensity === 3 && surface.mapName === `Runtime_${family}_CanvasScreen` && surface.textureUpdates > 0));
  for (const other of assetFamilies) assert.deepEqual(shellState(active, other), shellState(before, other), `${other} housing must not be brightened by ${family}`);
  for (const other of assetFamilies.filter(id => id !== family && assetManifest[id].surfaceRole === 'screen')) assert.deepEqual(surfaceState(active, other), surfaceState(before, other), `${other} display must remain independent of ${family}`);
  const content = screenContent(active, family); await page.waitForTimeout(200); assert.deepEqual(screenContent(await snap(page), family), content, 'Unchanged Canvas content must not repaint');
  return { surfaces, shellMaterials: shellState(active, family) };
}

const staticMaterials = state => Object.fromEntries(decorFamilies.map(family => [family, state.assetVisuals[family].materialState]));
const preservedState = state => ({ time: state.interaction.time, weather: state.interaction.weather, lightsState: state.interaction.lightsState, marshallPower: state.interaction.marshallPower });
async function changeEnvironment(page, touch) {
  const slider = page.getByRole('slider', { name: 'Time', exact: true });
  if (touch) {
    const rect = await slider.boundingBox(); assert(rect); await page.touchscreen.tap(rect.x + rect.width * .7, rect.y + rect.height / 2);
  } else { await slider.focus(); await page.keyboard.press('End'); await page.keyboard.press('ArrowLeft'); }
  const time = Number(await slider.inputValue());
  const weather = page.getByRole('button', { name: 'Rainy', exact: true }); if (touch) await weather.tap(); else await weather.click();
  if (!production) await stateIs(page, { time, weather: 'Rainy' });
  return { time, weather: 'Rainy' };
}
async function visibleDecor(page) {
  await waitForCanvasReady(page, { quietMs: 100 });
  return page.evaluate(families => {
    const api = window.__ROOM_DEBUG__, canvas = document.querySelector('canvas'), rect = canvas.getBoundingClientRect(), result = {};
    for (let y = Math.ceil(rect.y) + 4; y < rect.bottom; y += 10) for (let x = Math.ceil(rect.x) + 4; x < rect.right; x += 10) {
      if (document.elementFromPoint(x, y) !== canvas) continue;
      const hit = api.hitTest(x, y); if (hit?.assetFamily && families.includes(hit.assetFamily) && !result[hit.assetFamily]) result[hit.assetFamily] = { point: { x, y }, hit };
    }
    return result;
  }, selected);
}
async function idle(page, label) {
  await page.mouse.move(0, 0); await waitForCanvasReady(page, { quietMs: 350, timeoutMs: 20000 });
  const before = await snap(page); await page.waitForTimeout(1000); const after = await snap(page);
  assert.equal(after.renderFrames, before.renderFrames, `${label}: no persistent C animation or idle render loop`);
  assert.deepEqual(staticMaterials(after), staticMaterials(before)); assert.deepEqual(after.mechanical, before.mechanical);
  assert.deepEqual(resourceShape(after), resourceShape(before)); assert.deepEqual(preservedState(after), preservedState(before));
  return { durationMs: 1000, beforeFrames: before.renderFrames, afterFrames: after.renderFrames, resources: resourceShape(after) };
}
function assertFixturesOff(state) {
  if (!decorFamilies.includes('fixtures')) return;
  assert.equal(assetManifest.fixtures.stateSurface, null, 'Static fixture surfaces must not enter the Marshall/screen state binding');
  assert.equal(assetManifest.fixtures.surfaceRole, 'none');
  const materials = state.assetVisuals.fixtures.materialState; assert(materials.length > 0);
  for (const material of materials) assert(material.emissive === '000000' || material.emissiveIntensity === 0, `No permanently emitting fixture material: ${material.name}`);
}
async function faultFamily(family, { body, type = 'glb404' } = {}) {
  const context = await contextFor(desktop, { reduced: true }), page = await context.newPage(); observe(page, `fault-${type}-${family}`);
  await page.route(`**${assetManifest[family].url}`, route => route.fulfill(body ? { status: 200, contentType: 'model/gltf-binary', body } : { status: 404, contentType: 'text/plain', body: 'Intentional isolated C-family failure' }));
  await page.goto(`${origin}/?debug=1&demand=1`, { waitUntil: 'domcontentloaded' });
  await check(`${family} ${type}: explicit fallback isolates failure; native paths work; refresh restores`, async () => {
    const failed = await loaded(page, { [family]: 'fallback' }); assert(failed.assets[family].error); if (!body) assert.match(failed.assets[family].error, /404/);
    assert.equal(failed.assetVisuals[family].meshes, 0, 'Fallback cannot count as a formal C installation');
    await page.locator('.asset-fallback').filter({ hasText: assetManifest[family].label }).waitFor();
    for (const id of expectedOld) assert.equal(failed.assets[id].status, 'installed');
    const retained = {}, protectedIds = family === 'cola' ? ['ipad', 'monitor'] : ['monitor'];
    for (const id of protectedIds) { retained[id] = (await activate(page, id)).target; await back(page, failed.camera); }
    if (family === 'cola') { assert.equal(failed.assets.coffee.status, 'installed'); assert(failed.assetVisuals.coffee.meshes > 0); assert(assetManifest.cola.parts.every(part => Array.isArray(part.proxyMeshNames) && part.proxyMeshNames.length === 0), 'Cola has no inherited proxy; explicitly retain coffee geometry'); }
    if (family === 'dog') { assert.equal(failed.assets.dogbed.status, 'installed'); assert(failed.assetVisuals.dogbed.meshes > 0, 'Dog failure cannot suppress A dog bed'); }
    await screenshot(page, `fault-${type}-${family}.png`);
    await page.unroute(`**${assetManifest[family].url}`); await page.getByRole('button', { name: '刷新重试', exact: true }).click(); const restored = await loaded(page);
    await screenshot(page, `restored-${type}-${family}.png`);
    return { family, error: failed.assets[family].error, formalMeshesWhileFailed: 0, fallbackPolicy: family === 'cola' ? 'Explicit missing-cup degradation; coffee is not a cup proxy; fallback never counts as installed.' : 'Inherited source geometry retained; failure remains visibly labeled.', retained, failed: failed.assembly, restored: restored.assembly };
  }, page); await close(context);
}
async function textureFault() {
  for (const family of selected) {
    const bytes = await fs.readFile(path.join(root, 'public', assetManifest[family].url));
    const length = bytes.readUInt32LE(12), json = JSON.parse(bytes.toString('utf8', 20, 20 + length));
    const image = json.images?.find(item => Number.isInteger(item.bufferView)); if (!image) continue;
    const view = json.bufferViews[image.bufferView], damaged = Buffer.from(bytes), start = 28 + length + (view.byteOffset ?? 0);
    assert(view.byteLength >= 8); damaged.fill(0, start, start + Math.min(32, view.byteLength));
    observations.textureFault = { applicable: true, family, imageMimeType: image.mimeType, method: 'Corrupt only embedded image signature; preserve GLB document/geometry and require failed texture decoding to roll back this family.' };
    await faultFamily(family, { body: damaged, type: 'texture-decode' }); return;
  }
  observations.textureFault = { applicable: false, reason: 'Selected C exports contain no embedded images; GLB404 and cancellation still exercised. No invented texture case.' };
}
async function cancellation() {
  const family = selected[0], context = await contextFor(), page = await context.newPage(); observe(page, 'cancel-reload'); let signalRequested, release;
  const requested = new Promise(resolve => { signalRequested = resolve; }), gate = new Promise(resolve => { release = resolve; });
  await page.route(`**${assetManifest[family].url}`, async route => { signalRequested(); await gate; await route.continue().catch(() => {}); });
  try {
    await check(`Delayed ${family} can unmount; three fresh entries install once with stable resources`, async () => {
      await page.goto(`${origin}/?debug=1&demand=1`, { waitUntil: 'domcontentloaded' }); let timer;
      try { await Promise.race([requested, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`Delayed ${family} request not observed`)), 30000); })]); } finally { clearTimeout(timer); }
      await page.goto('about:blank'); release(); await page.unroute(`**${assetManifest[family].url}`); await page.waitForTimeout(300);
      assert.equal(await page.evaluate(() => Boolean(window.__ROOM_DEBUG__)), false);
      const cycles = []; for (let index = 0; index < 3; index++) { await page.goto(`${origin}/?debug=1&demand=1`, { waitUntil: 'domcontentloaded' }); await loaded(page); await idle(page, `reload-${index}`); cycles.push(resourceShape(await snap(page))); await page.goto('about:blank'); }
      assert.deepEqual(cycles[1], cycles[0]); assert.deepEqual(cycles[2], cycles[0]);
      return { family, cycles, limits: 'Stable owned resource counts across full unmounts are not exact GPU memory measurements. The existing loader completes all families before interaction attaches.' };
    }, page);
  } finally { release(); await close(context); }
}

async function runProduction() {
  const evidencePath = process.env.ROOM_C_DEV_EVIDENCE ?? path.join(output, 'collection-decor-browser.json');
  const evidence = JSON.parse(await fs.readFile(evidencePath, 'utf8'));
  assert.equal(evidence.summary.failed, 0); assert.equal(evidence.stage, stage); assert.equal(evidence.mode, 'development');
  assert.deepEqual(evidence.observations.exportHashesAtEnd, observations.exportHashesAtStart, 'Production replays exactly the current normal dev asset revision');
  for (const viewport of viewports) {
    const recordVideo = viewport.width === 1440 && process.env.ROOM_TEST_VIDEO !== '0';
    const page = await open({ viewport, phase: `production-${viewport.width}`, video: recordVideo }), touch = viewport.width === 390, record = evidence.observations.viewports[viewport.width]; assert(record);
    if (recordVideo) video = page.video();
    await check(`Production ${viewport.width}px complete installation without debug or inspection APIs`, async () => { assert.equal(await page.evaluate(() => Boolean(window.__ROOM_DEBUG__ || window.__ROOM_INSPECTION__)), false); assert.equal(await page.locator('.debug-panel').count(), 0); await screenshot(page, `production-hero-${viewport.width}.png`); return { installedFamilies: assetFamilies }; }, page);
    for (const id of ids) await check(`Production ${viewport.width}px native ${id} replays actual dev entry and controls`, async () => {
      const entry = record.entries[id], target = entry?.target; assert(target); assert.equal(target.hit.semanticId, id); assert.equal(target.hit.assetFamily, id);
      await input(page, target.point, touch); await page.waitForSelector('[data-interaction-phase="focused"]', { timeout: 30000 }); await page.getByRole('heading', { name: titles[id], exact: true }).waitFor();
      if (id === 'lightswitch') {
        await page.getByRole('button', { name: `Lights: ${entry.switchEntryState === 'on' ? 'On' : 'Off'}`, exact: true }).waitFor();
        for (const state of entry.switchToggleStates) { const button = page.getByRole('button', { name: /^Lights: / }); if (touch) await button.tap(); else await button.click(); await page.waitForSelector('[data-interaction-phase="focused"]'); await page.getByRole('button', { name: `Lights: ${state === 'on' ? 'On' : 'Off'}`, exact: true }).waitFor(); }
      }
      if (id === 'window') { const changed = await changeEnvironment(page, touch); assert.deepEqual(changed, entry.environment); }
      await screenshot(page, `production-${viewport.width}-focus-${id}.png`); await back(page, null, touch, !touch && id !== 'piano'); return { target };
    }, page);
    await check(`Production ${viewport.width}px recorded static C pixels do not open actions`, async () => {
      for (const [family, target] of Object.entries(record.staticPoints)) { assert.equal(target.hit.semanticId, null); assert.equal(target.hit.assetFamily, family); await input(page, target.point, touch); await page.waitForSelector('[data-interaction-phase="idle"]'); assert.equal(await page.locator('.interaction-overlay').count(), 0); }
      return { actualPixels: record.staticPoints, heroOccludedFamilies: record.heroOccludedFamilies };
    }, page);
    await check(`Production ${viewport.width}px retract / Back / natural underdesk reopen`, async () => {
      await input(page, record.piano.initialTarget.point, touch); await page.waitForSelector('[data-interaction-phase="focused"]'); await page.getByText(`Piano: ${record.piano.entryState}`, { exact: true }).waitFor();
      if (record.piano.preparedWithToggle) { await clickToggle(page, touch); await page.getByText('Piano: extended', { exact: true }).waitFor(); await page.waitForSelector('[data-interaction-phase="focused"]'); }
      await page.getByText('Piano: extended', { exact: true }).waitFor(); await clickToggle(page, touch); await page.getByText('Piano: retracted', { exact: true }).waitFor(); await back(page, null, touch);
      const target = record.piano.cycles[0].target; assert.equal(target.hit.runtimeTarget, 'PianoRetractedHitArea'); await input(page, target.point, touch); await page.getByText('Piano: extended', { exact: true }).waitFor(); await page.waitForSelector('[data-interaction-phase="focused"]'); await screenshot(page, `production-${viewport.width}-underdesk-reopen.png`); await back(page, null, touch); return { target, noSelectorSubstitution: true };
    }, page);
    await close(page.context()); if (recordVideo && video) videoPath = await video.path();
  }
  for (const family of selected) {
    const context = await contextFor(), page = await context.newPage(); observe(page, `fault-production-${family}`);
    await page.route(`**${assetManifest[family].url}`, route => route.fulfill({ status: 404, contentType: 'text/plain', body: 'Intentional production C-family failure' }));
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await check(`Production ${family} failure is labeled and refresh restores exactly one complete manifest`, async () => {
      await loaded(page, { [family]: 'fallback' }); await page.locator('.asset-fallback').filter({ hasText: assetManifest[family].label }).waitFor();
      const source = evidence.checks.find(check => check.name.startsWith(`${family} glb404:`)); assert(source?.passed); assert(source.detail.retained.monitor);
      for (const [id, target] of Object.entries(source.detail.retained)) { assert.equal(target.hit.semanticId, id); assert.equal(target.hit.assetFamily, id); await input(page, target.point); await page.waitForSelector('[data-interaction-phase="focused"]', { timeout: 30000 }); await page.getByRole('heading', { name: titles[id], exact: true }).waitFor(); await back(page); }
      await screenshot(page, `production-fault-${family}.png`); await page.unroute(`**${assetManifest[family].url}`); await page.getByRole('button', { name: '刷新重试', exact: true }).click(); await loaded(page); await screenshot(page, `production-restored-${family}.png`);
      return { fallbackCountsAsInstalled: false, devReplayTargets: source.detail.retained };
    }, page); await close(context);
  }
}
function cabinetInspectionView({ bounds, slot = null, angle = 'front', family = null, aspect = 1.5, obstruction = null }) {
  const center = bounds.min.map((value, axis) => (value + bounds.max[axis]) / 2), size = bounds.max.map((value, axis) => value - bounds.min[axis]);
  const opening = slot?.actualSlotWorld ?? bounds;
  const slotHeight = opening.max[1] - opening.min[1], slotWidth = opening.max[2] - opening.min[2];
  const inset = Math.min(.02, slotHeight * .04);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  if (slot) for (const axis of [0, 1, 2]) {
    assert(bounds.min[axis] >= opening.min[axis] - .0001 && bounds.max[axis] <= opening.max[axis] + .0001, `${family} inspection body must fit its measured actual slot`);
  }
  // Display models face +X. Keep the camera and every target inside this opening's
  // Y/Z corridor: a Hero-derived diagonal crosses neighboring divider panels.
  const preferredFov = family === 'eiffel' || family === 'sls' ? 65 : family === 'minastirith' ? 34 : family === 'hogwarts' ? 51 : slot ? 45 : 62;
  const tangent = Math.tan(preferredFov * Math.PI / 360), margin = size[1] > size[2] * 2 ? 1.2 : 1.4;
  const distance = Math.max(.35, Math.max(size[1], size[2] / aspect) / (2 * tangent) * margin + size[0] / 2);
  const target = [...center], position = [center[0] + distance, center[1], center[2]];
  if (angle === 'shallow-side') {
    position[1] = clamp(center[1] + Math.min(slotHeight * .06, size[1] * .08), opening.min[1] + inset, opening.max[1] - inset);
    position[2] = clamp(center[2] + slotWidth * .08, opening.min[2] + inset, opening.max[2] - inset);
  } else if (angle === 'top-in-slot') {
    // This is a constrained downward view, not an impossible overhead view through
    // the upper shelf. Even the camera origin remains below its measured underside.
    position[0] = Math.max(opening.max[0] + .12, center[0] + distance * .8);
    position[1] = opening.max[1] - inset;
  } else if (!slot) position[1] += size[1] * .06;
  // The A sofa sits between Ferrari and a distant camera; the A desk masks the
  // Bridge's right end. Move only these test cameras into the measured free gap.
  if (obstruction) { assert(['ferrari', 'bridge'].includes(family)); position[0] = Math.min(position[0], obstruction.maximumCameraX); }
  if (slot) {
    assert(position[0] > opening.max[0], 'Inspection camera must be in front of the cabinet');
    assert(position[1] > opening.min[1] && position[1] < opening.max[1], 'Inspection camera cannot cross the lower/upper shelf');
    assert(Math.abs(position[2] - center[2]) <= slotWidth * .1 + 1e-10, 'Side offset cannot exceed ten percent of slot width');
    assert(position[2] > opening.min[2] && position[2] < opening.max[2], 'Inspection camera cannot cross a side divider');
  }
  // Widen only as much as the real geometry needs for the oblique view. All eight
  // measured corners must be in front of the camera and inside the framed image.
  const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
  const normalize = vector => { const length = Math.hypot(...vector); return vector.map(value => value / length); };
  const forward = normalize(target.map((value, axis) => value - position[axis]));
  const right = normalize([-forward[2], 0, forward[0]]);
  const up = [right[1] * forward[2] - right[2] * forward[1], right[2] * forward[0] - right[0] * forward[2], right[0] * forward[1] - right[1] * forward[0]];
  let requiredTangent = 0;
  for (const x of [bounds.min[0], bounds.max[0]]) for (const y of [bounds.min[1], bounds.max[1]]) for (const z of [bounds.min[2], bounds.max[2]]) {
    const relative = [x, y, z].map((value, axis) => value - position[axis]), depth = dot(relative, forward); assert(depth > .05, 'Measured closeup stays outside the camera near plane');
    requiredTangent = Math.max(requiredTangent, Math.abs(dot(relative, up)) / depth, Math.abs(dot(relative, right)) / depth / aspect);
  }
  const fov = Math.max(preferredFov, 2 * Math.atan(requiredTangent * 1.15) * 180 / Math.PI);
  assert(fov < 110, 'Inspection framing cannot require an extreme lens');
  return { view: { position, target, fov }, constraint: { cabinetFrontAxis: '+X', measuredSlot: slot?.originalAnchor ?? null, actualSlotWorld: slot?.actualSlotWorld ?? null, angle, sideOffset: position[2] - center[2], maximumSideOffset: slotWidth * .1, cameraBelowUpperShelf: slot ? position[1] < opening.max[1] : null, obstructionClearance: obstruction, framing: 'All measured bounds corners fit; divider corridor respected. Human visibility review still required.' } };
}

async function runInspection() {
  const page = await open({ phase: 'isolated-inspection' }), original = await snap(page), hero = original.camera;
  await check('Inspection API exists only in the explicitly isolated preview', async () => { assert.equal(await page.evaluate(() => window.__ROOM_INSPECTION__?.testOnly), true); observations.inspectionStart = await page.evaluate(() => window.__ROOM_INSPECTION__.snapshot()); return { camera: hero, condition: 'TEST ONLY temporary camera in isolated preview copy; source Hero remains unchanged.' }; }, page);
  const scene = observations.inspectionStart, byName = new Map(scene.nodes.map(node => [node.name, node]));
  for (const mesh of scene.nodes.filter(node => node.type === 'Mesh' && decorFamilies.includes(node.family))) { assert(mesh.materials.length > 0); for (const material of mesh.materials) { assert(!material.name.startsWith('WebOnly_Suppressed'), `${mesh.name} was incorrectly suppressed by another family`); assert.notEqual(material.color, null, `${mesh.name} must retain a production PBR material`); } }
  const obstructionFor = family => {
    const names = family === 'ferrari' ? ['VIS_SofaUpholsteredVolumes'] : family === 'bridge' ? ['VIS_DeskSolid_0_WoodTop', 'VIS_DeskSolid_1_WoodCarcassAndDrawers'] : [];
    if (!names.length) return null;
    const objects = names.map(name => { const node = byName.get(name); assert(node?.bounds, `Missing actual A obstruction: ${name}`); return { name, family: node.family, bounds: node.bounds }; });
    const safetyGap = family === 'ferrari' ? .05 : .06, planeX = Math.min(...objects.map(object => object.bounds.min[0]));
    return { source: 'Actual installed A mesh world bounds; no object moved or hidden', objects, planeX, safetyGap, maximumCameraX: planeX - safetyGap };
  };
  observations.inspectionSourceRoot = inspectionSourceRoot ?? root;
  const measurementPath = path.join(root, 'validation/v06c/planning/space-measurements.json'), measurementBytes = await fs.readFile(measurementPath), measurements = JSON.parse(measurementBytes);
  const cabinetSource = measurements.inputs.find(input => input.path.endsWith(assetManifest.cabinet.url)); assert(cabinetSource, 'Actual cabinet measurements require a current input hash');
  assert.equal(createHash('sha256').update(await fs.readFile(path.join(root, 'public', assetManifest.cabinet.url))).digest('hex'), cabinetSource.sha256, 'Cabinet changed since slot measurement');
  observations.inspectionCameraMethod = { measurementPath, sha256: createHash('sha256').update(measurementBytes).digest('hex'), front: '+X with unchanged center Z', side: 'Z displacement <= 10% measured slot width', top: 'Camera Y below actual slot upper shelf; constrained oblique view', userVisualStatus: 'pending' };
  const boundsFor = names => {
    const boxes = names.map(name => { const node = byName.get(name); assert(node?.bounds, `Inspection requires actual ${name} geometry`); return node.bounds; });
    return { min: [0, 1, 2].map(axis => Math.min(...boxes.map(box => box.min[axis]))), max: [0, 1, 2].map(axis => Math.max(...boxes.map(box => box.max[axis]))) };
  };
  const specs = [{ name: 'cabinet-overall', roots: assetManifest.cabinet.parts.map(part => part.root) }, { name: 'desk-context', roots: ['desk', 'monitor', 'macbook', 'phone', 'marshall', 'headphones', 'keyboard', 'mouse'].flatMap(family => assetManifest[family].parts.map(part => part.root)) }];
  if (stage === 'all' || stage === 'living') {
    specs.push({ name: 'coffee-context', roots: [...['coffee', 'ipad', 'cola'].filter(family => assetFamilies.includes(family)).flatMap(family => assetManifest[family].parts.map(part => part.root)), ...(assetManifest.plants?.parts.filter(part => part.anchor === 'DEC_Plant_CoffeeTable').map(part => part.root) ?? [])] });
    specs.push({ name: 'dog-and-A-bed', roots: ['dog', 'dogbed'].filter(family => assetFamilies.includes(family)).flatMap(family => assetManifest[family].parts.map(part => part.root)) });
  }
  for (const family of selected) for (const part of assetManifest[family].parts) {
    const slot = measurements.cabinet.slots.find(slot => slot.family === family);
    if (slot) { assert.equal(part.anchor, slot.originalAnchor); for (const angle of ['front', 'shallow-side', 'top-in-slot']) specs.push({ name: `${family}-${part.root}-${angle}`, family, angle, roots: [part.root] }); }
    else specs.push({ name: `${family}-${part.root}-hero-side`, family, roots: [part.root] });
  }
  const customViews = process.env.ROOM_C_INSPECTION_VIEWS ? JSON.parse(await fs.readFile(process.env.ROOM_C_INSPECTION_VIEWS, 'utf8')) : [];
  assert(Array.isArray(customViews));
  if (process.env.ROOM_C_INSPECTION_ONLY === '1') { assert(customViews.length > 0, 'Directed-only inspection requires ROOM_C_INSPECTION_VIEWS'); specs.splice(0, specs.length, ...customViews); } else specs.push(...customViews);
  observations.inspectionScope = { directedOnly: process.env.ROOM_C_INSPECTION_ONLY === '1', requestedViews: specs.map(spec => spec.name), capturedFamilies: [...new Set(specs.map(spec => spec.family).filter(Boolean))] };
  observations.inspectionViews = [];
  for (const spec of specs) await check(`Isolated webpage closeup ${spec.name}`, async () => {
    const bounds = boundsFor(spec.roots), center = bounds.min.map((value, axis) => (value + bounds.max[axis]) / 2), size = bounds.max.map((value, axis) => value - bounds.min[axis]);
    const slot = measurements.cabinet.slots.find(slot => slot.family === spec.family);
    let cameraPlan;
    if (slot || spec.name === 'cabinet-overall') cameraPlan = cabinetInspectionView({ bounds, slot, angle: spec.angle, family: spec.family, aspect: hero.aspect, obstruction: obstructionFor(spec.family) });
    else {
      const livingDirection = spec.roots.includes('VIS_PlantDesk') ? [-1, .35, .7] : spec.roots.includes('VIS_PlantWindow') ? [-1, .6, 1] : spec.family === 'dog' || spec.name === 'dog-and-A-bed' ? [.8, 1.15, .9] : spec.family === 'cola' || spec.name === 'coffee-context' ? [.75, 1.1, .9] : null;
      const direction = livingDirection ?? [hero.position[0] - center[0], Math.max(.35, Math.abs(hero.position[1] - center[1]) * .35), hero.position[2] - center[2]], length = Math.hypot(...direction), distance = Math.max(.22, Math.hypot(...size) * 1.8);
      cameraPlan = { view: { position: center.map((value, axis) => value + direction[axis] / length * distance), target: center, fov: 35 }, constraint: livingDirection ? { reason: spec.family === 'dog' || spec.name === 'dog-and-A-bed' ? 'Elevated view over the unchanged dog-bed rim' : spec.family === 'cola' || spec.name === 'coffee-context' ? 'Elevated view of ice/liquid and all three unchanged coffee-table items' : 'Approach from the left to avoid unchanged MacBook/bed foreground', objectsMovedOrHidden: false } : null };
    }
    const view = spec.view ?? cameraPlan.view;
    await page.evaluate(view => window.__ROOM_INSPECTION__.setView(view), view); await waitForCanvasReady(page, { quietMs: 100 });
    const state = await snap(page); assert.equal(state.assembly.ok, true); assert.equal(state.interaction.activeObject, null);
    const filename = `inspection-${spec.name.replace(/[^A-Za-z0-9_-]/g, '-')}.png`; await screenshot(page, filename);
    // A closeup is evidence, never automatic aesthetic approval. Cabinet framing avoids measured shelf/divider corridors; the saved image still requires human review.
    const record = { name: spec.name, roots: spec.roots, family: spec.family ?? null, bounds, camera: state.camera, requestedView: view, cameraConstraint: spec.view ? { customOverride: true } : cameraPlan.constraint, screenshot: filename, condition: 'Temporary test-only camera, original webpage assembly/materials, user visual review pending.' };
    observations.inspectionViews.push(record); return record;
  }, page);
  if (decorFamilies.includes('fixtures')) await check('Fixture emitting faces are independent from shells and other fixture groups', async () => {
    const current = await page.evaluate(() => window.__ROOM_INSPECTION__.snapshot()), meshes = current.nodes.filter(node => node.type === 'Mesh' && node.family === 'fixtures');
    assert(meshes.length); const seenSurfaces = new Map(), groups = [];
    for (const part of assetManifest.fixtures.parts) {
      const belonging = meshes.filter(node => node.ancestors?.includes(part.root) || node.name === part.root);
      const faces = belonging.filter(node => /surface|emitter|diffuser/i.test(node.name));
      assert(faces.length, `${part.root} must expose a named independent emitting face`);
      const shellIds = new Set(belonging.filter(node => !faces.includes(node)).flatMap(node => node.materials.map(material => material.uuid)));
      assert(shellIds.size, `${part.root} must retain its own opaque shell material`);
      for (const face of faces) for (const material of face.materials) {
        assert(!shellIds.has(material.uuid), `${face.name} shares a material with its shell`);
        assert(!seenSurfaces.has(material.uuid) || seenSurfaces.get(material.uuid) === part.root, `${face.name} shares a emitting material across fixture roots`);
        assert(material.emissive === '000000' || material.emissiveIntensity === 0, `${face.name} must not be permanently lit`); seenSurfaces.set(material.uuid, part.root);
      }
      groups.push({ root: part.root, faces, shellMaterialUuids: [...shellIds] });
    }
    assert.deepEqual(current.lights, scene.lights, 'Inspection cannot add light sources or modify their state'); return { groups, actualLights: current.lights };
  }, page);
  await check('Inspection restores the exact original Hero and leaves protected state unchanged', async () => { await page.evaluate(() => window.__ROOM_INSPECTION__.restoreView()); await waitForCanvasReady(page, { quietMs: 100 }); const returned = await snap(page); assert.deepEqual(returned.camera, hero); assert.deepEqual(returned.mechanical, original.mechanical); assert.deepEqual(preservedState(returned), preservedState(original)); assert.equal(returned.assembly.ok, true); await screenshot(page, 'inspection-restored-hero.png'); return { camera: returned.camera }; }, page);
  await close(page.context());
}

let video, videoPath;
try {
  if (inspection) {
    await runInspection();
  } else if (production) {
    await runProduction();
  } else {
    for (const viewport of viewports) {
      const touch = viewport.width === 390, recordVideo = viewport.width === 1440 && process.env.ROOM_TEST_VIDEO !== '0';
      const page = await open({ viewport, phase: `normal-${viewport.width}`, video: recordVideo }); if (recordVideo) video = page.video();
      const initial = await loaded(page), hero = initial.camera, record = { initial, staticPoints: {}, entries: {} }; observations.viewports[viewport.width] = record;
      await check(`${viewport.width}px all registered C and protected 27 install with frozen targets`, async () => { assert.equal(await page.evaluate(() => Boolean(window.__ROOM_INSPECTION__)), false, 'Normal acceptance cannot use a test camera'); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); assertFixturesOff(initial); await screenshot(page, `hero-${viewport.width}.png`); return { assembly: initial.assembly, assetVisuals: initial.assetVisuals }; }, page);
      for (const id of ids) await check(`${viewport.width}px ${id} formal entry, focused geometry, Back/ESC`, async () => {
        const before = await snap(page), entered = await activate(page, id, touch), focusedTarget = await pointFor(page, { id, family: assetFamilies.includes(id) ? id : null });
        const detail = { target: entered.target, focusedTarget, active: entered.state.mechanical };
        const button = await page.getByRole('button', { name: 'Back', exact: true }).boundingBox(); assert(button && button.width >= 40 && button.height >= 40 && button.x >= 0 && button.y + button.height <= viewport.height);
        if (assetManifest[id]?.surfaceRole === 'screen') detail.screen = await verifyScreen(page, id, before, entered.state);
        if (id === 'trashcan') { assert.equal(entered.state.interaction.trashState, 'open'); assert.deepEqual(entered.state.mechanical.transforms.trash.position, before.mechanical.transforms.trash.position); assert(Math.abs(entered.state.mechanical.transforms.trash.rotation[0] - entered.state.mechanical.sourceEndpoints.trashOpenX) < 1e-10); }
        if (id === 'lightswitch') {
          const switchBefore = entered.state.mechanical.transforms.switch;
          const entryState = before.interaction.lightsState === 'on' ? 'off' : 'on';
          assert.equal(entered.state.interaction.lightsState, entryState, 'Physical switch entry itself toggles the existing total-light state');
          const inspectSwitch = (state, expected) => { assert.deepEqual(state.mechanical.transforms.switch.position, switchBefore.position); assert(Math.abs(state.mechanical.transforms.switch.rotation[2] - state.mechanical.sourceEndpoints[expected === 'on' ? 'switchOnZ' : 'switchOffZ']) < 1e-10); assert.deepEqual(state.mechanical.baseLightValues, before.mechanical.baseLightValues); if (expected === 'off') assert(Object.values(state.mechanical.lightValues).every(value => value === 0)); };
          inspectSwitch(entered.state, entryState);
          // Visit both endpoints and restore the state from before natural entry.
          const toggleStates = [before.interaction.lightsState, entryState, before.interaction.lightsState];
          for (const expected of toggleStates) { const button = page.getByRole('button', { name: /^Lights: / }); if (touch) await button.tap(); else await button.click(); await stateIs(page, { lightsState: expected, interactionPhase: 'focused' }); inspectSwitch(await snap(page), expected); }
          detail.switchEntryState = entryState; detail.switchToggleStates = toggleStates;
          detail.switchRestored = (await snap(page)).mechanical;
        }
        if (id === 'window') detail.environment = await changeEnvironment(page, touch);
        assert.deepEqual(staticMaterials(await snap(page)), staticMaterials(before), 'Existing device actions cannot mutate C decor materials'); assertFixturesOff(await snap(page));
        await screenshot(page, `focus-${viewport.width}-${id}.png`);
        const returned = await back(page, hero, touch, !touch && id !== 'piano');
        if (id === 'trashcan') { assert.equal(returned.interaction.trashState, 'closed'); assert.ok(Math.abs(returned.mechanical.transforms.trash.rotation[0]) < 1e-10); }
        if (assetManifest[id]?.surfaceRole === 'screen') { assert.deepEqual(shellState(returned, id), shellState(before, id)); assert(surfaceState(returned, id).every(surface => surface.emissiveIntensity === 1)); assert(screenContent(returned, id).every((surface, index) => surface.textureUpdates > screenContent(entered.state, id)[index].textureUpdates)); }
        detail.returned = returned.mechanical; record.entries[id] = detail; return detail;
      }, page);
      await check(`${viewport.width}px visible C decor has no action and preserves existing selected state`, async () => {
        const before = await snap(page); record.staticPoints = await visibleDecor(page);
        for (const [family, target] of Object.entries(record.staticPoints)) { assert.equal(target.hit.semanticId, null); await input(page, target.point, touch); const after = await snap(page); assert.equal(after.interaction.activeObject, null); assert.deepEqual(after.camera, hero); assert.deepEqual(preservedState(after), preservedState(before)); }
        record.heroOccludedFamilies = selected.filter(family => !record.staticPoints[family]);
        record.preservedState = preservedState(await snap(page));
        return { actualVisiblePixels: record.staticPoints, heroOccludedFamilies: record.heroOccludedFamilies, selectedState: record.preservedState, note: 'Occluded/small Hero surfaces require separate isolated inspection views; no false visibility pass is inferred.' };
      }, page);
      await check(`${viewport.width}px original underdesk piano reopening remains usable after C`, async () => { record.piano = await pianoReopen(page, hero, touch, `${viewport.width}`, { half: viewport.width === 1440, cycles: stage === 'all' && viewport.width !== 768 ? 4 : 1 }); assert.deepEqual(preservedState(await snap(page)), record.preservedState); return record.piano; }, page);
      await check(`${viewport.width}px C is static and resources settle after interactions`, () => idle(page, 'normal C'), page);
      await close(page.context()); if (recordVideo && video) videoPath = await video.path();
    }
    for (const family of selected) await faultFamily(family);
    await textureFault(); await cancellation();
    if (stage === 'all') { const page = await open({ reduced: true, phase: 'reduced-motion' }); await check('Reduced-motion still retracts and reopens piano from original underdesk position', async () => { const state = await snap(page); assert.equal(state.interaction.reducedMotion, true); return pianoReopen(page, state.camera, false, 'reduced', { cycles: 2 }); }, page); await close(page.context()); }
  }
  await check('Exports stay unchanged while browser evidence is collected', async () => { observations.exportHashesAtEnd = await hashes(); assert.deepEqual(observations.exportHashesAtEnd, observations.exportHashesAtStart); return observations.exportHashesAtEnd; });
  await check('Normal C sessions have no runtime/resource errors; injected failures remain isolated', async () => { assert.deepEqual(runtime.filter(item => item.type === 'pageerror'), []); assert.deepEqual(runtime.filter(item => item.type === 'error' && !item.phase.startsWith('fault-') && item.phase !== 'cancel-reload'), []); assert.deepEqual(requests.filter(item => !item.phase.startsWith('fault-') && item.phase !== 'cancel-reload'), []); });
} catch (error) {
  if (!checks.some(check => !check.passed)) checks.push({ name: 'C suite setup/execution', passed: false, error: String(error.stack ?? error) }); console.error(error); process.exitCode = 1;
} finally {
  for (const context of contexts) await context.close().catch(() => {}); if (!videoPath && video) videoPath = await video.path().catch(() => undefined); await browser.close();
  if (videoPath) { const target = path.join(output, `v06c-${stage}-interaction.mp4`), converted = spawnSync(process.env.FFMPEG_PATH ?? '/opt/homebrew/bin/ffmpeg', ['-n', '-i', videoPath, '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', target], { encoding: 'utf8' }); observations.video = { source: path.relative(root, videoPath), mp4: converted.status === 0 ? path.relative(root, target) : null, exitCode: converted.status, error: converted.error?.message ?? (converted.status ? converted.stderr?.slice(-1000) : null) }; }
  const result = { generatedAt: new Date().toISOString(), stage, mode: inspection ? 'isolated-test-camera' : production ? 'production' : 'development', origin, families: assetFamilies, selectedFamilies: selected, summary: { passed: checks.filter(check => check.passed).length, failed: checks.filter(check => !check.passed).length }, checks, observations, runtime, requests, environment: 'Installed Chrome headless ANGLE SwiftShader, DPR1; normal sessions 1440 desktop / 390 touch emulation (+768 for all); inspection desktop only. No physical mobile/GPU/Safari evidence.', visualStatus: 'Technical evidence only; user visual confirmation remains pending.', inspectionLimit: inspection ? 'Camera temporarily changed only in isolated source copy; no new product focus/target. Must accompany normal production evidence.' : null };
  await fs.writeFile(path.join(output, `${stem}.json`), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  await fs.writeFile(path.join(output, `${stem}.md`), [`# v0.6C ${stage} evidence`, '', `Mode: ${result.mode}`, `Generated: ${result.generatedAt}`, `Result: ${result.summary.passed} passed; ${result.summary.failed} failed.`, '', result.environment, result.visualStatus, result.inspectionLimit ?? '', '', '| Check | Result |', '| --- | --- |', ...checks.map(check => `| ${check.name} | ${check.passed ? 'PASS' : 'FAIL'} |`), ''].join('\n'), { flag: 'wx' });
  console.log(`RESULT ${result.summary.passed} passed; ${result.summary.failed} failed — ${output}/${stem}.json`);
}
