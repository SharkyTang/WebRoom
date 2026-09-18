import { chromium } from '@playwright/test';
import { tsImport } from 'tsx/esm/api';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { waitForCanvasReady } from './helpers/browserReady.mjs';

// Mutations are native mouse/touch/keyboard or navigation. Debug API is read-only.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stage = process.env.ROOM_B_STAGE ?? 'all';
const groups = { piano: ['piano'], screens: ['ipad', 'phone'], mechanisms: ['trashcan', 'lightswitch'], accessories: ['keyboard', 'mouse', 'headphones'] };
const bFamilies = Object.values(groups).flat();
assert(stage === 'all' || stage in groups, 'ROOM_B_STAGE: piano | screens | mechanisms | accessories | all');
const selected = stage === 'all' ? bFamilies : groups[stage];
const production = process.env.ROOM_TEST_PRODUCTION === '1';
const output = process.env.ROOM_TEST_OUTPUT ?? path.join(root, 'validation/v06b', stage);
const origin = process.env.ROOM_TEST_URL ?? `http://127.0.0.1:${production ? 3001 : 3000}`;
const stem = production ? 'interactive-assets-production' : 'interactive-assets-browser';
const { assetManifest, assetFamilies } = await tsImport('../lib/room/assets/assetManifest.ts', import.meta.url);
const { interactionIds, interactiveObjects } = await tsImport('../lib/room/interactiveObjects.ts', import.meta.url);
const { SOURCE_NODE_COUNT } = await tsImport('../lib/room/sceneConstants.ts', import.meta.url);
const expectedOld = ['monitor', 'macbook', 'marshall', 'floor', 'walls', 'door', 'window', 'curtains', 'desk', 'cabinet', 'bed', 'bedside', 'sofa', 'chair', 'coffee', 'sidetable', 'beanbag', 'rugs', 'dogbed'];
for (const family of [...expectedOld, ...selected]) assert(assetFamilies.includes(family), `Stage ${stage} requires registered family: ${family}`);
assert.deepEqual([...assetFamilies].sort(), [...expectedOld, ...bFamilies.filter(family => assetFamilies.includes(family))].sort(), 'Only old three/A16 and the authorized B families may be installed');
const titles = { monitor: 'Projects', macbook: 'About / Education', ipad: 'Memories', phone: 'Contact', marshall: 'Music', piano: 'Piano', trashcan: 'Deleted ideas', lightswitch: 'Room lights', window: 'Environment' };
const desktop = { width: 1440, height: 900 }, tablet = { width: 768, height: 1024 }, mobile = { width: 390, height: 844 };
const viewports = stage === 'all' ? [desktop, tablet, mobile] : [desktop, mobile];
const ids = stage === 'all' ? interactionIds : [...new Set([...selected.filter(id => interactionIds.includes(id)), ...(stage === 'accessories' ? ['monitor'] : []), 'piano', 'marshall', 'phone'])];
const contexts = new Set(), checks = [], runtime = [], requests = [], observations = { viewports: {}, nativeInputs: [] };
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
  }
  return state;
}
async function open({ viewport = desktop, phase = 'normal', reduced = false, video = false } = {}) {
  const context = await contextFor(viewport, { reduced, video }), page = await context.newPage(); observe(page, phase);
  await page.goto(`${origin}/?debug=1&demand=1`, { waitUntil: 'domcontentloaded' }); await loaded(page); return page;
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
      await page.evaluate(() => { window.__bPianoMotion = []; window.__bObservePiano = true; function sample() { const state = window.__ROOM_DEBUG__.snapshot(); window.__bPianoMotion.push({ atMs: performance.now(), pianoState: state.interaction.pianoState, transform: state.mechanical.transforms.piano, assembly: state.assembly }); if (window.__bObservePiano) requestAnimationFrame(sample); } sample(); });
    }
    await clickToggle(page, touch);
    if (half && cycle === 0) {
      await page.waitForFunction(() => { const state = window.__ROOM_DEBUG__.snapshot(), endpoint = state.mechanical.sourceEndpoints, fraction = (state.mechanical.transforms.piano.position[2] - endpoint.pianoRetractedZ) / endpoint.pianoTravel; return state.interaction.pianoState === 'retracting' && fraction > .15 && fraction < .85; }, undefined, { polling: 'raf', timeout: 15000 });
      const before = await snap(page); await screenshot(page, `${prefix}-piano-half-observation.png`); const after = await snap(page);
      result.half = { before: before.mechanical.transforms.piano, after: after.mechanical.transforms.piano, note: 'Screenshot requested during observed intermediate motion; before/after snapshots bracket capture without pausing or mutating animation.' };
    }
    await stateIs(page, { pianoState: 'retracted', interactionPhase: 'focused' });
    const retracted = await snap(page); assert.equal(retracted.mechanical.transforms.piano.position[2], endpoints.pianoRetractedZ);
    if (half && cycle === 0) { result.motion = await page.evaluate(() => { window.__bObservePiano = false; return window.__bPianoMotion; }); assert(result.motion.some(sample => sample.transform.position[2] > endpoints.pianoRetractedZ && sample.transform.position[2] < endpoints.pianoExtendedZ)); for (const sample of result.motion) { assert(sample.transform.position[2] >= endpoints.pianoRetractedZ - 1e-9 && sample.transform.position[2] <= endpoints.pianoExtendedZ + 1e-9); assert.equal(sample.assembly.ok, true); } }
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
let video, videoPath;
try {
  if (production) {
    const evidencePath = process.env.ROOM_B_DEV_EVIDENCE ?? path.join(output, 'interactive-assets-browser.json');
    const evidence = JSON.parse(await fs.readFile(evidencePath, 'utf8')); assert.equal(evidence.summary.failed, 0); assert.equal(evidence.stage, stage); assert.deepEqual(evidence.observations.exportHashesAtEnd, observations.exportHashesAtStart, 'Production must use exactly the assets measured by this dev evidence');
    for (const viewport of viewports) {
      const recordVideo = viewport.width === 1440 && process.env.ROOM_TEST_VIDEO !== '0';
      const page = await open({ viewport, phase: `production-${viewport.width}`, video: recordVideo }), touch = viewport.width === 390, record = evidence.observations.viewports[viewport.width]; assert(record);
      if (recordVideo) video = page.video();
      await check(`Production ${viewport.width}px all manifest families installed and debug absent`, async () => { assert.equal(await page.evaluate(() => Boolean(window.__ROOM_DEBUG__)), false); assert.equal(await page.locator('.debug-panel').count(), 0); await screenshot(page, `production-hero-${viewport.width}.png`); return { installedFamilies: assetFamilies }; }, page);
      for (const id of ids) await check(`Production ${viewport.width}px native ${id} recorded formal pixel and Back`, async () => {
        // Replay the pixel actually used after prior device interactions, rather
        // than the initial preflight point (the MacBook may since have closed).
        const target = record.entries[id]?.target; assert(target); assert.equal(target.hit.semanticId, id); if (assetFamilies.includes(id)) assert.equal(target.hit.assetFamily, id);
        await input(page, target.point, touch); await page.waitForSelector('[data-interaction-phase="focused"]', { timeout: 30000 }); await page.getByRole('heading', { name: titles[id], exact: true }).waitFor();
        if (id === 'lightswitch') {
          const expected = record.entries[id].switchEntryState;
          await page.getByRole('button', { name: `Lights: ${expected === 'on' ? 'On' : 'Off'}`, exact: true }).waitFor();
          for (const state of record.entries[id].switchToggleStates) { const button = page.getByRole('button', { name: /^Lights: / }); if (touch) await button.tap(); else await button.click(); await page.waitForSelector('[data-interaction-phase="focused"]'); await page.getByRole('button', { name: `Lights: ${state === 'on' ? 'On' : 'Off'}`, exact: true }).waitFor(); }
        }
        await screenshot(page, `production-${viewport.width}-focus-${id}.png`); await back(page, null, touch); return { target };
      }, page);
      for (const [family, target] of Object.entries(record.staticPoints ?? {})) await check(`Production ${viewport.width}px ${family} remains a static accessory`, async () => { assert.equal(target.hit.semanticId, null); assert.equal(target.hit.assetFamily, family); await input(page, target.point, touch); await page.waitForSelector('[data-interaction-phase="idle"]'); assert.equal(await page.locator('.interaction-overlay').count(), 0); return { target }; }, page);
      await check(`Production ${viewport.width}px retract, Back, natural underdesk reopen`, async () => {
        await input(page, record.piano.initialTarget.point, touch); await page.waitForSelector('[data-interaction-phase="focused"]');
        await page.getByText(`Piano: ${record.piano.entryState}`, { exact: true }).waitFor();
        if (record.piano.preparedWithToggle) { await clickToggle(page, touch); await page.getByText('Piano: extended', { exact: true }).waitFor(); await page.waitForSelector('[data-interaction-phase="focused"]'); }
        await page.getByText('Piano: extended', { exact: true }).waitFor(); await clickToggle(page, touch); await page.getByText('Piano: retracted', { exact: true }).waitFor(); await back(page, null, touch);
        const target = record.piano.cycles[0].target; assert.equal(target.hit.runtimeTarget, 'PianoRetractedHitArea'); await input(page, target.point, touch); await page.getByText('Piano: extended', { exact: true }).waitFor(); await page.waitForSelector('[data-interaction-phase="focused"]'); await screenshot(page, `production-${viewport.width}-underdesk-reopen.png`); await back(page, null, touch); return { target, noExploreObjects: true };
      }, page);
      await close(page.context()); if (recordVideo && video) videoPath = await video.path();
    }
  } else {
    for (const viewport of viewports) {
      const touch = viewport.width === 390, recordVideo = viewport.width === 1440 && process.env.ROOM_TEST_VIDEO !== '0';
      const page = await open({ viewport, phase: `normal-${viewport.width}`, video: recordVideo }); if (recordVideo) video = page.video();
      const initial = await loaded(page), hero = initial.camera, record = { initial, initialPoints: {}, staticPoints: {}, entries: {} }; observations.viewports[viewport.width] = record;
      await check(`${viewport.width}px complete current manifest and frozen nine semantic targets`, async () => { for (const id of ids) record.initialPoints[id] = await pointFor(page, { id, family: assetFamilies.includes(id) ? id : null }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); await screenshot(page, `hero-${viewport.width}.png`); return { assembly: initial.assembly, assetVisuals: initial.assetVisuals, initialPoints: record.initialPoints }; }, page);
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
        await screenshot(page, `focus-${viewport.width}-${id}.png`);
        const returned = await back(page, hero, touch, !touch && id !== 'piano');
        if (id === 'trashcan') { assert.equal(returned.interaction.trashState, 'closed'); assert.ok(Math.abs(returned.mechanical.transforms.trash.rotation[0]) < 1e-10); }
        if (assetManifest[id]?.surfaceRole === 'screen') { assert.deepEqual(shellState(returned, id), shellState(before, id)); assert(surfaceState(returned, id).every(surface => surface.emissiveIntensity === 1)); assert(screenContent(returned, id).every((surface, index) => surface.textureUpdates > screenContent(entered.state, id)[index].textureUpdates)); }
        detail.returned = returned.mechanical; record.entries[id] = detail; return detail;
      }, page);
      if (stage === 'all' || stage === 'accessories') for (const family of groups.accessories) await check(`${viewport.width}px visible ${family} is static and preserves nearby entries`, async () => { const target = await pointFor(page, { family }); await input(page, target.point, touch); assert.equal((await snap(page)).interaction.activeObject, null); record.staticPoints[family] = target; const nearby = {}; for (const id of ['marshall', 'phone']) nearby[id] = await pointFor(page, { id, family: assetFamilies.includes(id) ? id : null }); return { target, nearby }; }, page);
      await check(`${viewport.width}px natural piano reopen retains original endpoints and Back state`, async () => { record.piano = await pianoReopen(page, hero, touch, `${viewport.width}`, { half: viewport.width === 1440, cycles: stage === 'all' && viewport.width !== 768 ? 4 : 1 }); return record.piano; }, page);
      await check(`${viewport.width}px demand rendering settles after B interactions`, async () => { await waitForCanvasReady(page, { quietMs: 250, timeoutMs: 20000 }); const before = await snap(page); await page.waitForTimeout(500); const after = await snap(page); assert.equal(after.renderFrames, before.renderFrames); return { frameCount: after.renderFrames }; }, page);
      await close(page.context()); if (recordVideo && video) videoPath = await video.path();
    }
    if (stage === 'all') {
      for (const family of bFamilies) {
        const context = await contextFor(desktop, { reduced: true }), page = await context.newPage(); observe(page, `fault-${family}`);
        await page.route(`**${assetManifest[family].url}`, route => route.fulfill({ status: 404, contentType: 'text/plain', body: 'Intentional single B-family failure' }));
        await page.goto(`${origin}/?debug=1&demand=1`, { waitUntil: 'domcontentloaded' });
        await check(`${family} isolated GLB404 keeps usable proxy and exact remaining families; refresh fully restores`, async () => {
          const failed = await loaded(page, { [family]: 'fallback' }); assert(failed.assets[family].error?.includes('404')); assert.equal(failed.assetVisuals[family].meshes, 0); await page.locator('.asset-fallback').filter({ hasText: assetManifest[family].label }).waitFor();
          let fallback;
          if (interactionIds.includes(family)) { fallback = (await activate(page, family, false, true)).target; assert.notEqual(fallback.hit.assetFamily, family); await back(page, failed.camera); }
          else { fallback = await pointFor(page, { anchors: assetManifest[family].parts.map(part => part.anchor) }); await input(page, fallback.point); assert.equal((await snap(page)).interaction.activeObject, null); }
          await activate(page, 'monitor'); await back(page, failed.camera); await page.unroute(`**${assetManifest[family].url}`); await page.getByRole('button', { name: '刷新重试', exact: true }).click(); const restored = await loaded(page);
          return { expectedFallback: true, countsAsFormalPass: false, fallback, failed: failed.assembly, restored: restored.assembly };
        }, page); await close(context);
      }
      {
        const context = await contextFor(), page = await context.newPage(); observe(page, 'cancel-reload'); let signalRequested, release;
        const requested = new Promise(resolve => { signalRequested = resolve; }), gate = new Promise(resolve => { release = resolve; });
        await page.route(`**${assetManifest.ipad.url}`, async route => { signalRequested(); await gate; await route.continue().catch(() => {}); });
        await check('Delayed B screen can unmount while loading; three re-entries install once with stable resources', async () => {
          await page.goto(`${origin}/?debug=1&demand=1`, { waitUntil: 'domcontentloaded' }); let timer; try { await Promise.race([requested, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Delayed iPad request was not observed')), 30000); })]); } finally { clearTimeout(timer); }
          await page.goto('about:blank'); release(); await page.unroute(`**${assetManifest.ipad.url}`); await page.waitForTimeout(300); assert.equal(await page.evaluate(() => Boolean(window.__ROOM_DEBUG__)), false);
          const cycles = []; for (let index = 0; index < 3; index++) { await page.goto(`${origin}/?debug=1&demand=1`, { waitUntil: 'domcontentloaded' }); await loaded(page); await waitForCanvasReady(page, { quietMs: 250 }); cycles.push(resourceShape(await snap(page))); await page.goto('about:blank'); }
          assert.deepEqual(cycles[1], cycles[0]); assert.deepEqual(cycles[2], cycles[0]); return { cycles, limits: 'Stable resource counts are not an exact GPU-memory leak measurement.' };
        }, page); release(); await close(context);
      }
      const reduced = await open({ reduced: true, phase: 'reduced-motion' });
      await check('Reduced-motion B piano keeps natural underdesk route and exact Hero', async () => { const state = await snap(reduced); assert.equal(state.interaction.reducedMotion, true); return pianoReopen(reduced, state.camera, false, 'reduced', { cycles: 2 }); }, reduced); await close(reduced.context());
    }
  }
  await check('Current exported assets remain unchanged throughout the evidence run', async () => { observations.exportHashesAtEnd = await hashes(); assert.deepEqual(observations.exportHashesAtEnd, observations.exportHashesAtStart); return observations.exportHashesAtEnd; });
  await check('Normal B sessions have no runtime or resource failures; expected injected faults stay isolated', async () => { assert.deepEqual(runtime.filter(item => item.type === 'pageerror'), []); assert.deepEqual(runtime.filter(item => item.type === 'error' && !item.phase.startsWith('fault-') && item.phase !== 'cancel-reload'), []); assert.deepEqual(requests.filter(item => !item.phase.startsWith('fault-') && item.phase !== 'cancel-reload'), []); });
} catch (error) {
  if (!checks.some(check => !check.passed)) checks.push({ name: 'B suite setup/execution', passed: false, error: String(error.stack ?? error) }); console.error(error); process.exitCode = 1;
} finally {
  for (const context of contexts) await context.close().catch(() => {}); if (!videoPath && video) videoPath = await video.path().catch(() => undefined); await browser.close();
  if (videoPath) { const target = path.join(output, `v06b-${stage}-interaction.mp4`), converted = spawnSync(process.env.FFMPEG_PATH ?? '/opt/homebrew/bin/ffmpeg', ['-n', '-i', videoPath, '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', target], { encoding: 'utf8' }); observations.video = { source: path.relative(root, videoPath), mp4: converted.status === 0 ? path.relative(root, target) : null, exitCode: converted.status, error: converted.error?.message ?? (converted.status ? converted.stderr?.slice(-1000) : null) }; }
  const result = { generatedAt: new Date().toISOString(), stage, mode: production ? 'production' : 'development', origin, families: assetFamilies, selectedFamilies: selected, summary: { passed: checks.filter(check => check.passed).length, failed: checks.filter(check => !check.passed).length }, checks, observations, runtime, requests, environment: 'Installed Chrome headless ANGLE SwiftShader, DPR1, 1440 desktop/768 tablet-sized/390 touch emulation. No physical mobile, hardware GPU or Safari validation.', visualStatus: 'Technical interaction evidence only; user aesthetic/visual confirmation remains pending.' };
  await fs.writeFile(path.join(output, `${stem}.json`), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  await fs.writeFile(path.join(output, `${stem}.md`), [`# v0.6B ${stage} interactive asset evidence`, '', `Mode: ${result.mode}`, `Generated: ${result.generatedAt}`, `Result: ${result.summary.passed} passed; ${result.summary.failed} failed.`, '', result.environment, result.visualStatus, '', '| Check | Result |', '| --- | --- |', ...checks.map(check => `| ${check.name} | ${check.passed ? 'PASS' : 'FAIL'} |`), ''].join('\n'), { flag: 'wx' });
  console.log(`RESULT ${result.summary.passed} passed; ${result.summary.failed} failed — ${output}/${stem}.json`);
}
