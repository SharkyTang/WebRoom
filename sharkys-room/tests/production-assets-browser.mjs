import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Every application state change below comes from native mouse/touch/keyboard
// input or page navigation. The development bridge only observes the scene.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = process.env.ROOM_TEST_OUTPUT ?? path.join(root, 'validation/v05');
const production = process.env.ROOM_TEST_PRODUCTION === '1';
const origin = process.env.ROOM_TEST_URL ?? (production ? 'http://127.0.0.1:3001' : 'http://127.0.0.1:3000');
const performanceOnly = process.env.ROOM_ASSET_PERFORMANCE_ONLY === '1';
const skipPerformance = process.env.ROOM_ASSET_SKIP_PERFORMANCE === '1';
const families = ['monitor', 'macbook', 'marshall'];
const desktop = { width: 1440, height: 900 }, mobileViewport = { width: 390, height: 844 };
const checks = [], runtime = [], requests = [], observations = {};
const contexts = new Set();
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const snap = page => page.evaluate(() => window.__ROOM_DEBUG__?.snapshot());
const count = value => Array.isArray(value) ? value.length : value;
const pose = snapshot => snapshot.camera;
const surfaces = (snapshot, family) => snapshot.assetVisuals[family].stateSurfaces;
const shellMaterials = (snapshot, family) => snapshot.assetVisuals[family].materialState
  .filter(item => !/^Runtime_/.test(item.name ?? '') && !/DisplaySurface|PowerIndicator/.test(item.mesh ?? item.node ?? ''));
const contents = (snapshot, family) => surfaces(snapshot, family).map(item => ({ name: item.name, mapName: item.mapName, textureUpdates: item.textureUpdates }));
function observe(page, phase) {
  page.on('pageerror', error => runtime.push({ phase, type: 'pageerror', text: error.message }));
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) runtime.push({ phase, type: message.type(), text: message.text() }); });
  page.on('requestfailed', request => requests.push({ phase, url: request.url(), error: request.failure()?.errorText }));
}
async function contextFor({ mobile = false, reduced = false, video = false } = {}) {
  const context = await browser.newContext({
    viewport: mobile ? mobileViewport : desktop, deviceScaleFactor: 1, hasTouch: mobile, isMobile: mobile,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
    ...(video ? { recordVideo: { dir: path.join(output, 'raw-video'), size: desktop } } : {}),
  });
  contexts.add(context); return context;
}
async function ready(page, expected = {}) {
  await page.waitForSelector('[data-room-status="ready"]', { timeout: 60000 });
  for (const family of families) {
    const status = expected[family] ?? 'installed';
    await page.waitForSelector(`[data-asset-${family}="${status}"]`, { timeout: 60000 });
  }
  const state = await snap(page);
  assert(state, 'This suite requires the development-only read-only diagnostic bridge');
  assert.equal(state.assembly.ok, true, JSON.stringify(state.assembly));
  assert.deepEqual(state.assembly.errors, []);
  for (const family of families) assert.equal(state.assets[family].status, expected[family] ?? 'installed');
  return state;
}
async function open({ phase = 'normal', mobile = false, reduced = false, video = false, continuous = false } = {}) {
  const context = await contextFor({ mobile, reduced, video });
  const page = await context.newPage(); observe(page, phase);
  await page.goto(`${origin}/?debug=1${continuous ? '' : '&demand=1'}`, { waitUntil: 'domcontentloaded' });
  await ready(page); return page;
}
async function quiet(page) {
  await page.mouse.move(0, 0);
  await page.waitForTimeout(120);
  return snap(page);
}
async function screenshot(page, name) {
  await page.screenshot({ path: path.join(output, name), style: '.debug-panel { visibility: hidden !important; }' });
  return name;
}
async function check(name, action, page) {
  try { const detail = await action(); checks.push({ name, passed: true, ...(detail ?? {}) }); console.log(`PASS ${name}`); }
  catch (error) {
    const failure = { name, passed: false, error: String(error.stack ?? error) };
    if (page && !page.isClosed()) {
      failure.snapshot = await snap(page).catch(() => null);
      failure.body = await page.locator('body').innerText().catch(() => '');
      await screenshot(page, `asset-failure-${checks.length + 1}.png`).catch(() => {});
    }
    checks.push(failure); console.log(`FAIL ${name}: ${error.message}`); throw error;
  }
}
async function waitState(page, expected) {
  await page.waitForFunction(expected => {
    const state = window.__ROOM_DEBUG__?.snapshot().interaction;
    return state && Object.entries(expected).every(([key, value]) => state[key] === value);
  }, expected, { timeout: 15000 });
}
async function pointFor(page, id, { production = families.includes(id) } = {}) {
  const result = await page.evaluate(({ id, production }) => {
    const api = window.__ROOM_DEBUG__, canvas = document.querySelector('canvas'), bounds = canvas.getBoundingClientRect();
    function inspect(point) {
      if (!point || document.elementFromPoint(point.x, point.y) !== canvas) return null;
      const hit = api.hitTest(point.x, point.y);
      return hit?.semanticId === id && (!production || hit.assetFamily === id) ? { point, hit } : null;
    }
    const projected = inspect(api.projected()[id]);
    if (projected) return projected;
    for (let y = Math.ceil(bounds.y) + 2; y < bounds.bottom; y += 3) {
      for (let x = Math.ceil(bounds.x) + 2; x < bounds.right; x += 3) {
        const result = inspect({ x, y }); if (result) return result;
      }
    }
    return null;
  }, { id, production });
  assert(result, `No visible ${production ? 'production' : 'semantic'} pixel for ${id}`);
  if (production) {
    assert.equal(result.hit.assetFamily, id);
    assert(result.hit.ancestors.some(name => name.startsWith(`VIS_${id === 'macbook' ? 'MacBook' : id[0].toUpperCase() + id.slice(1)}`)));
  }
  return result;
}
async function activate(page, id, { touch = false, production = families.includes(id) } = {}) {
  const target = await pointFor(page, id, { production });
  if (touch) await page.touchscreen.tap(target.point.x, target.point.y);
  else await page.mouse.click(target.point.x, target.point.y);
  await waitState(page, { activeObject: id, interactionPhase: 'focused', isCameraBusy: false });
  return { target, state: await quiet(page) };
}
async function back(page, hero, touch = false) {
  const button = page.getByRole('button', { name: 'Back', exact: true });
  if (touch) await button.tap(); else await button.click();
  await waitState(page, { activeObject: null, isCameraBusy: false });
  const state = await quiet(page);
  if (hero) assert.deepEqual(pose(state), hero, 'Back must exactly restore the original Hero');
  assert.equal(state.assembly.ok, true, JSON.stringify(state.assembly));
  assert.equal(state.interaction.error, null);
  return state;
}
function hinge(state, initial, endpoint) {
  const value = state.mechanical.transforms.macbook, source = initial.mechanical.transforms.macbook;
  assert.deepEqual(value.position, source.position, 'Original MacBook pivot moved');
  assert.deepEqual(value.quaternion, endpoint === 'closed' ? [0, 0, 0, 1] : source.quaternion);
  assert(Math.abs(value.rotation[0] - (endpoint === 'closed' ? 0 : initial.mechanical.sourceEndpoints.macbookOpenX)) < 1e-12);
  assert.equal(state.interaction.macbookState, endpoint);
  assert.equal(state.assembly.ok, true);
}
async function captureMotion(page, initial) {
  await page.evaluate(() => {
    window.__assetMotionSamples = [];
    window.__assetMotionStop = false;
    function sample() {
      const snapshot = window.__ROOM_DEBUG__.snapshot();
      window.__assetMotionSamples.push({ timestamp: performance.now(), state: snapshot.interaction.macbookState, phase: snapshot.interaction.interactionPhase, transform: snapshot.mechanical.transforms.macbook, assembly: snapshot.assembly });
      if (!window.__assetMotionStop) requestAnimationFrame(sample);
    }
    sample();
  });
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.waitForFunction(() => {
    const s = window.__ROOM_DEBUG__.snapshot(), angle = s.mechanical.transforms.macbook.rotation[0];
    return s.interaction.macbookState === 'closing' && angle > -1.4 && angle < -.45;
  }, undefined, { polling: 'raf', timeout: 15000 });
  const halfBefore = await snap(page);
  await screenshot(page, 'v05_macbook_half.png');
  const halfAfter = await snap(page);
  await waitState(page, { macbookState: 'closed' });
  await screenshot(page, 'v05_macbook_closed.png');
  await waitState(page, { activeObject: null, isCameraBusy: false });
  const samples = await page.evaluate(() => { window.__assetMotionStop = true; return window.__assetMotionSamples; });
  assert(samples.some(s => s.transform.rotation[0] > -1.4 && s.transform.rotation[0] < -.45));
  for (const sample of samples) {
    assert.deepEqual(sample.transform.position, initial.mechanical.transforms.macbook.position);
    assert(sample.transform.rotation[0] >= initial.mechanical.sourceEndpoints.macbookOpenX - 1e-12 && sample.transform.rotation[0] <= 1e-12);
    assert.equal(sample.assembly.ok, true, JSON.stringify(sample.assembly));
  }
  return { halfBefore, halfAfter, samples };
}
function corruptEmbeddedImage(bytes) {
  const result = Buffer.from(bytes), jsonLength = result.readUInt32LE(12);
  const gltf = JSON.parse(result.toString('utf8', 20, 20 + jsonLength));
  const image = gltf.images?.find(image => image.bufferView !== undefined);
  assert(image, 'Marshall fixture must actually contain an embedded texture');
  const view = gltf.bufferViews[image.bufferView];
  assert.equal(view.buffer, 0); assert(view.byteLength > 20);
  const start = 20 + jsonLength + 8 + (view.byteOffset ?? 0);
  result.fill(0, start, start + view.byteLength);
  return { bytes: result, mimeType: image.mimeType, corruptedBytes: view.byteLength };
}
let video, recordedPath;
try {
  if (production) {
    const evidence = JSON.parse(await fs.readFile(process.env.ROOM_ASSET_DEV_EVIDENCE ?? path.join(root, 'validation/v05/production-assets-browser.json'), 'utf8'));
    assert.equal(evidence.summary.failed, 0, 'Production coordinates must come from a passing development run');
    for (const mobile of [false, true]) {
      const context = await contextFor({ mobile }), page = await context.newPage();
      observe(page, mobile ? 'production-mobile' : 'production-desktop');
      await page.goto(`${origin}/?debug=1`, { waitUntil: 'domcontentloaded' });
      await check(`Production ${mobile ? '390px touch' : 'desktop'} installs all families without any debug API`, async () => {
        await page.waitForSelector('[data-room-status="ready"]', { timeout: 60000 });
        for (const family of families) await page.waitForSelector(`[data-asset-${family}="installed"]`);
        assert.equal(await page.evaluate(() => Boolean(window.__ROOM_DEBUG__)), false);
        assert.equal(await page.locator('.debug-panel').count(), 0);
        await screenshot(page, mobile ? 'v05_production_mobile.png' : 'v05_production_hero.png');
        return { installed: families, debugAbsent: true };
      }, page);
      const recorded = evidence.observations[mobile ? 'mobileProductionHitPoints' : 'productionHitPoints'];
      for (const family of families) await check(`Production ${mobile ? 'touch' : 'mouse'} enters ${family} at its recorded real visual pixel and uses Back`, async () => {
        const target = recorded[family];
        assert(target && target.hit.assetFamily === family, 'Development evidence must prove a production geometry hit');
        if (mobile) await page.touchscreen.tap(target.point.x, target.point.y);
        else await page.mouse.click(target.point.x, target.point.y);
        await page.waitForSelector('[data-interaction-phase="focused"]', { timeout: 15000 });
        await page.getByRole('heading', { name: { monitor: 'Projects', macbook: 'About / Education', marshall: 'Music' }[family], exact: true }).waitFor();
        if (family === 'macbook') await page.getByText('屏幕状态：open', { exact: true }).waitFor();
        if (family === 'marshall') {
          const power = page.getByRole('button', { name: 'Power: On', exact: true });
          if (mobile) await power.tap(); else await power.click();
          await page.getByRole('button', { name: 'Power: Off', exact: true }).waitFor();
          await page.waitForSelector('[data-interaction-phase="focused"]');
        }
        const button = page.getByRole('button', { name: 'Back', exact: true });
        if (mobile) await button.tap(); else await button.click();
        await page.waitForSelector('[data-interaction-phase="idle"]', { timeout: 15000 });
        assert.equal(await page.evaluate(() => Boolean(window.__ROOM_DEBUG__)), false);
        return { target, nativeInput: mobile ? 'touch' : 'mouse', backReturned: true };
      }, page);
      await context.close(); contexts.delete(context);
    }
    assert.deepEqual(runtime.filter(item => ['error', 'pageerror'].includes(item.type)), []);
    assert.deepEqual(requests, []);
  } else {
  if (!performanceOnly) {
  const page = await open({ video: process.env.ROOM_TEST_VIDEO !== '0' });
  video = page.video();
  const initial = await quiet(page), hero = pose(initial);
  observations.initial = initial;
  observations.productionHitPoints = {};
  for (const family of families) observations.productionHitPoints[family] = await pointFor(page, family);
  await check('Three complete production families install atomically under the original anchors', async () => {
    assert.equal(initial.validation.ok, true);
    assert.equal(initial.assembly.sourceNodeCount, 85);
    assert(initial.assembly.runtimeNodeCount > initial.assembly.sourceNodeCount);
    assert.deepEqual([...initial.assembly.installedFamilies].sort(), [...families].sort());
    assert(initial.assembly.suppressedProxyMeshes.length > 0);
    for (const family of families) {
      const visual = initial.assetVisuals[family];
      assert(count(visual.meshes) > 0 && count(visual.materials) > 0 && visual.triangles > 0);
      assert(surfaces(initial, family).length > 0);
      assert(shellMaterials(initial, family).length > 0, `${family} must expose independent shell materials`);
    }
    await screenshot(page, 'v05_hero.png');
    return { assembly: initial.assembly, assetVisuals: initial.assetVisuals };
  }, page);
  await check('Monitor visible production geometry activates only its independent Canvas screen', async () => {
    const selected = await activate(page, 'monitor'), active = selected.state;
    assert(surfaces(active, 'monitor').every(surface => surface.emissiveIntensity === 3));
    assert(contents(active, 'monitor').every(surface => /Runtime_monitor_CanvasScreen/.test(surface.mapName) && surface.textureUpdates > 0));
    assert.deepEqual(shellMaterials(active, 'monitor'), shellMaterials(initial, 'monitor'));
    assert.deepEqual(shellMaterials(active, 'macbook'), shellMaterials(initial, 'macbook'));
    assert.deepEqual(shellMaterials(active, 'marshall'), shellMaterials(initial, 'marshall'));
    await screenshot(page, 'v05_monitor_focus.png');
    await page.waitForTimeout(650);
    assert.deepEqual(contents(await snap(page), 'monitor'), contents(active, 'monitor'), 'A static Canvas screen must not repaint every frame');
    const returned = await back(page, hero);
    assert(contents(returned, 'monitor')[0].textureUpdates > contents(active, 'monitor')[0].textureUpdates);
    assert.deepEqual(shellMaterials(returned, 'monitor'), shellMaterials(initial, 'monitor'));
    observations.monitor = { target: selected.target, active: active.assetVisuals.monitor, returned: returned.assetVisuals.monitor };
    return observations.monitor;
  }, page);
  await check('MacBook normal-speed open, half-close and closed preserve original pivot and endpoints', async () => {
    const selected = await activate(page, 'macbook'); hinge(selected.state, initial, 'open');
    assert(surfaces(selected.state, 'macbook').every(surface => surface.emissiveIntensity === 3));
    await screenshot(page, 'v05_macbook_open.png');
    const motion = await captureMotion(page, initial);
    const closed = await quiet(page); hinge(closed, initial, 'closed'); assert.deepEqual(pose(closed), hero);
    const reopened = await activate(page, 'macbook'); hinge(reopened.state, initial, 'open');
    hinge(await back(page, hero), initial, 'closed');
    observations.macbook = { target: selected.target, motion, closed: closed.mechanical.transforms.macbook };
    return { target: selected.target, sampledFrames: motion.samples.length, halfCaptureAngles: [motion.halfBefore, motion.halfAfter].map(s => s.mechanical.transforms.macbook.rotation[0]), closed: closed.mechanical.transforms.macbook };
  }, page);
  await check('Marshall power affects its small indicator, persists after Back and preserves the shell', async () => {
    const before = await quiet(page), selected = await activate(page, 'marshall');
    assert.equal(selected.state.interaction.marshallPower, 'on');
    assert(surfaces(selected.state, 'marshall').every(surface => surface.emissiveIntensity > 0));
    assert.deepEqual(shellMaterials(selected.state, 'marshall'), shellMaterials(before, 'marshall'));
    await screenshot(page, 'v05_marshall_focus.png');
    await page.getByRole('button', { name: 'Power: On', exact: true }).click();
    await waitState(page, { marshallPower: 'off', interactionPhase: 'focused' });
    const off = await quiet(page);
    assert(surfaces(off, 'marshall').every(surface => surface.emissiveIntensity === 0));
    assert.deepEqual(shellMaterials(off, 'marshall'), shellMaterials(before, 'marshall'));
    await back(page, hero);
    const persistedOff = await activate(page, 'marshall'); assert.equal(persistedOff.state.interaction.marshallPower, 'off');
    await page.getByRole('button', { name: 'Power: Off', exact: true }).click();
    await waitState(page, { marshallPower: 'on', interactionPhase: 'focused' });
    const persistedOn = await back(page, hero);
    assert.equal(persistedOn.interaction.marshallPower, 'on');
    assert(surfaces(persistedOn, 'marshall').every(surface => surface.emissiveIntensity > 0));
    assert.deepEqual(shellMaterials(persistedOn, 'marshall'), shellMaterials(before, 'marshall'));
    return { target: selected.target, activeIndicator: surfaces(selected.state, 'marshall'), offIndicator: surfaces(off, 'marshall'), persistedPower: persistedOn.interaction.marshallPower };
  }, page);
  await check('Hovering the focused Marshall before Power On preserves the mechanism material and persistent 2.4 indicator', async () => {
    const before = await quiet(page);
    await activate(page, 'marshall');
    await page.getByRole('button', { name: 'Power: On', exact: true }).click();
    await waitState(page, { marshallPower: 'off', interactionPhase: 'focused' });
    const target = await pointFor(page, 'marshall');
    await page.mouse.move(target.point.x, target.point.y);
    await waitState(page, { hoveredObject: 'marshall' });
    await page.getByRole('button', { name: 'Power: Off', exact: true }).click();
    await waitState(page, { marshallPower: 'on', interactionPhase: 'focused' });
    const on = await quiet(page);
    assert(surfaces(on, 'marshall').every(surface => surface.emissiveIntensity === 2.4), JSON.stringify(surfaces(on, 'marshall')));
    assert.deepEqual(shellMaterials(on, 'marshall'), shellMaterials(before, 'marshall'));
    const returned = await back(page, hero);
    assert.equal(returned.interaction.marshallPower, 'on');
    assert(surfaces(returned, 'marshall').every(surface => surface.emissiveIntensity === 2.4));
    return { hoveredProductionTarget: target, focusedIndicator: surfaces(on, 'marshall'), returnedIndicator: surfaces(returned, 'marshall') };
  }, page);
  await check('Recorded walkthrough reopens the retracted piano through its undertray without Explore objects', async () => {
    await activate(page, 'piano', { production: false });
    if ((await snap(page)).interaction.pianoState !== 'retracted') {
      await page.getByRole('button', { name: 'Toggle piano', exact: true }).click();
      await waitState(page, { pianoState: 'retracted', interactionPhase: 'focused' });
    }
    await back(page, hero);
    const target = await pointFor(page, 'piano', { production: false });
    assert.equal(target.hit.runtimeTarget, 'PianoRetractedHitArea');
    await page.mouse.move(target.point.x, target.point.y);
    await page.locator('.page-footer p').filter({ hasText: 'Pull-out Piano' }).waitFor();
    await page.mouse.click(target.point.x, target.point.y);
    await waitState(page, { pianoState: 'extended', interactionPhase: 'focused' });
    const extended = await snap(page);
    assert.equal(extended.mechanical.transforms.piano.position[2], -1.2899999618530273);
    assert.equal(extended.pianoRetractedHitAreaActive, false);
    await screenshot(page, 'v05_piano_reopen.png'); await back(page, hero);
    return { target, usesExploreObjects: false, travel: extended.mechanical.sourceEndpoints.pianoTravel };
  }, page);
  await check('Production asset demand rendering stops at rest and Canvas content remains unchanged', async () => {
    await quiet(page); await page.waitForTimeout(500);
    const before = await snap(page); await page.waitForTimeout(600); const after = await snap(page);
    assert.equal(after.renderFrames, before.renderFrames);
    for (const family of ['monitor', 'macbook']) assert.deepEqual(contents(after, family), contents(before, family));
    return { beforeFrames: before.renderFrames, afterFrames: after.renderFrames };
  }, page);
  await check('Competing visible production clicks and Back during focus finish one exact safe return', async () => {
    const macbook = await pointFor(page, 'macbook'), monitor = await pointFor(page, 'monitor');
    await page.mouse.click(macbook.point.x, macbook.point.y);
    await page.mouse.click(monitor.point.x, monitor.point.y, { clickCount: 3, delay: 10 });
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await waitState(page, { activeObject: null, isCameraBusy: false });
    const state = await quiet(page);
    assert.deepEqual(pose(state), hero); hinge(state, initial, 'closed');
    assert.equal(state.interaction.returnRequested, false); assert.equal(state.interaction.error, null);
    return { targets: { macbook, monitor }, exactHero: true, closedAfterQueuedBack: true };
  }, page);
  await page.context().close(); contexts.delete(page.context());
  if (video) recordedPath = await video.path();

  const reduced = await open({ phase: 'reduced-motion', reduced: true });
  const reducedInitial = await quiet(reduced), reducedHero = pose(reducedInitial);
  await check('Twenty native production-MacBook open/Back-close cycles keep exact endpoint, pivot and Hero', async () => {
    const cycles = [];
    assert.equal(reducedInitial.interaction.reducedMotion, true);
    for (let cycle = 0; cycle < 20; cycle++) {
      const opened = await activate(reduced, 'macbook'); hinge(opened.state, reducedInitial, 'open');
      const closed = await back(reduced, reducedHero); hinge(closed, reducedInitial, 'closed');
      assert.deepEqual([...closed.assembly.installedFamilies].sort(), [...families].sort());
      cycles.push({ cycle: cycle + 1, point: opened.target.point, open: opened.state.mechanical.transforms.macbook, closed: closed.mechanical.transforms.macbook });
    }
    observations.macbookCycles = cycles; return { cycles: cycles.length, nativeInput: true, reducedMotion: true };
  }, reduced);
  await reduced.context().close(); contexts.delete(reduced.context());

  const mobile = await open({ phase: 'mobile-touch', mobile: true });
  const mobileInitial = await quiet(mobile), mobileHero = pose(mobileInitial);
  observations.mobileProductionHitPoints = {};
  for (const family of families) observations.mobileProductionHitPoints[family] = await pointFor(mobile, family);
  await screenshot(mobile, 'v05_mobile.png');
  for (const family of families) await check(`390×844 native touchscreen hits visible ${family} production geometry and returns`, async () => {
    const result = await activate(mobile, family, { touch: true });
    const backButton = await mobile.getByRole('button', { name: 'Back', exact: true }).boundingBox();
    assert(backButton && backButton.width >= 40 && backButton.height >= 40 && backButton.x >= 0 && backButton.y + backButton.height <= 844);
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await screenshot(mobile, `v05_mobile_${family}_focus.png`);
    await back(mobile, mobileHero, true); return { target: result.target, backButton };
  }, mobile);
  await mobile.context().close(); contexts.delete(mobile.context());
  }

  if (!skipPerformance) {
  for (const mobile of [false, true]) {
  const viewport = mobile ? mobileViewport : desktop;
  const performancePage = await open({ phase: mobile ? 'hero-performance-mobile' : 'hero-performance', mobile, continuous: true });
  await check(`Same baseline Hero at ${viewport.width}×${viewport.height} DPR1 reports actual renderer calls and observed frame interval`, async () => {
    await performancePage.waitForFunction(() => window.__ROOM_DEBUG__.snapshot().performance?.calls > 0, undefined, { timeout: 20000 });
    const before = await snap(performancePage);
    await performancePage.waitForTimeout(1500);
    const current = await snap(performancePage);
    assert(current.renderFrames - before.renderFrames > 10, 'Continuous diagnostic mode must actually render multiple frames');
    for (const family of ['monitor', 'macbook']) assert.deepEqual(contents(current, family), contents(before, family), 'Unchanged screen text must not repaint during repeated render frames');
    const baseline = JSON.parse(await fs.readFile(path.join(root, 'validation/v05/baseline/hero-performance.json'), 'utf8')).samples.find(sample => sample.viewport.width === viewport.width);
    const device = await performancePage.evaluate(() => {
      const canvas = document.querySelector('canvas'), gl = canvas.getContext('webgl2'), ext = gl.getExtension('WEBGL_debug_renderer_info');
      return { viewport: { width: innerWidth, height: innerHeight }, dpr: devicePixelRatio, canvas: { width: canvas.width, height: canvas.height }, renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), userAgent: navigator.userAgent };
    });
    assert.deepEqual(current.camera, baseline.snapshot.camera); assert.deepEqual(device.viewport, viewport); assert.equal(device.dpr, 1);
    const key = mobile ? 'performanceMobile' : 'performance';
    observations[key] = { baseline: baseline.snapshot.performance, current: current.performance, addedDrawCalls: current.performance.calls - baseline.snapshot.performance.calls, frameIntervalDeltaMs: current.performance.frameMs - baseline.snapshot.performance.frameMs, device, note: 'Same existing development ?debug=1 continuous sampler. frameMs is a frame interval, not isolated GPU/CPU render time. Software WebGL; not a physical-device benchmark.' };
    return observations[key];
  }, performancePage);
  await performancePage.context().close(); contexts.delete(performancePage.context());
  }
  }

  if (!performanceOnly) {
  for (const family of families) {
    const context = await contextFor({ reduced: true }), page = await context.newPage(); observe(page, `fallback-404-${family}`);
    await page.route(`**/models/production/${family}_pilot.glb`, route => route.fulfill({ status: 404, contentType: 'text/plain', body: 'Intentional isolated asset failure fixture' }));
    await page.goto(`${origin}/?debug=1&demand=1`, { waitUntil: 'domcontentloaded' });
    await check(`${family} GLB404 keeps its usable proxy and the other two complete production families`, async () => {
      const state = await ready(page, { [family]: 'fallback' }), hero = pose(state);
      assert(state.assets[family].error && /404/.test(state.assets[family].error));
      assert(!state.assembly.installedFamilies.includes(family));
      const fallback = await activate(page, family, { production: false });
      assert.equal(fallback.target.hit.assetFamily ?? null, null, 'Fallback geometry cannot count as production geometry');
      await back(page, hero);
      for (const other of families.filter(id => id !== family)) { await activate(page, other); await back(page, hero); }
      await screenshot(page, `v05_fallback_${family}_404.png`);
      await page.unroute(`**/models/production/${family}_pilot.glb`);
      await page.reload({ waitUntil: 'domcontentloaded' });
      const retry = await ready(page);
      assert.equal(retry.assets[family].status, 'installed');
      return { expectedFallback: true, productionPass: false, family, error: state.assets[family].error, retryInstalled: true, assembly: state.assembly };
    }, page);
    await context.close(); contexts.delete(context);
  }
  {
    const context = await contextFor({ reduced: true }), page = await context.newPage(); observe(page, 'fallback-corrupt-texture');
    const fixture = corruptEmbeddedImage(await fs.readFile(path.join(root, 'public/models/production/marshall_pilot.glb')));
    await page.route('**/models/production/marshall_pilot.glb', route => route.fulfill({ status: 200, contentType: 'model/gltf-binary', body: fixture.bytes }));
    await page.goto(`${origin}/?debug=1&demand=1`, { waitUntil: 'domcontentloaded' });
    await check('Embedded Marshall texture decode failure rolls back the entire family without a partial install', async () => {
      const state = await ready(page, { marshall: 'fallback' });
      assert(state.assets.marshall.error); assert(!state.assembly.installedFamilies.includes('marshall'));
      const fallback = await activate(page, 'marshall', { production: false }); assert.equal(fallback.target.hit.assetFamily ?? null, null);
      await back(page, pose(state));
      await activate(page, 'monitor'); await back(page, pose(state));
      await page.unroute('**/models/production/marshall_pilot.glb'); await page.reload({ waitUntil: 'domcontentloaded' }); await ready(page);
      return { expectedFallback: true, productionPass: false, error: state.assets.marshall.error, corruptedTexture: { mimeType: fixture.mimeType, bytes: fixture.corruptedBytes }, retryInstalled: true };
    }, page);
    await context.close(); contexts.delete(context);
  }
  {
    const context = await contextFor(), page = await context.newPage(); observe(page, 'navigation-cancel');
    let requested, release;
    const entered = new Promise(resolve => { requested = resolve; });
    const gate = new Promise(resolve => { release = resolve; });
    await page.route('**/models/production/macbook_pilot.glb', async route => { requested(); await gate; await route.continue().catch(() => {}); });
    await check('Navigating away during a delayed family load cancels late work; re-entry installs once', async () => {
      await page.goto(`${origin}/?debug=1&demand=1`, { waitUntil: 'domcontentloaded' });
      let timeout;
      try { await Promise.race([entered, new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Expected delayed MacBook request')), 20000); })]); }
      finally { clearTimeout(timeout); }
      await page.goto('about:blank'); release();
      await page.unroute('**/models/production/macbook_pilot.glb');
      await page.waitForTimeout(400);
      assert.equal(await page.evaluate(() => Boolean(window.__ROOM_DEBUG__)), false);
      const installs = [];
      for (let cycle = 0; cycle < 3; cycle++) {
        await page.goto(`${origin}/?debug=1&demand=1`, { waitUntil: 'domcontentloaded' });
        const state = await ready(page);
        assert.equal(state.assembly.ok, true); assert.deepEqual([...state.assembly.installedFamilies].sort(), [...families].sort());
        installs.push({ runtimeNodeCount: state.assembly.runtimeNodeCount, suppressedProxyMeshes: state.assembly.suppressedProxyMeshes });
        await page.goto('about:blank');
      }
      assert(installs.every(item => item.runtimeNodeCount === installs[0].runtimeNodeCount));
      return { cancelledWhileLoading: true, reentries: installs, noDuplicateAssembly: true };
    }, page);
    release(); await context.close(); contexts.delete(context);
  }
  }
  await check('Normal asset sessions have no browser runtime errors or failed requests', async () => {
    assert.deepEqual(runtime.filter(item => item.type === 'pageerror'), []);
    assert.deepEqual(runtime.filter(item => !item.phase.startsWith('fallback-') && item.phase !== 'navigation-cancel' && item.type === 'error'), []);
    assert.deepEqual(requests.filter(item => !item.phase.startsWith('fallback-') && item.phase !== 'navigation-cancel'), []);
    return { normalErrors: 0, expectedFaultPhasesRetainedInLog: true };
  });
  }
} catch (error) {
  if (!checks.some(check => !check.passed)) checks.push({ name: 'Production asset suite setup', passed: false, error: String(error.stack ?? error) });
  process.exitCode = 1;
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  if (!recordedPath && video) recordedPath = await video.path().catch(() => undefined);
  await browser.close();
  if (recordedPath) {
    const target = path.join(output, 'v05_interactions.mp4');
    const converted = spawnSync(process.env.FFMPEG_PATH ?? '/opt/homebrew/bin/ffmpeg', ['-y', '-i', recordedPath, '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', target], { encoding: 'utf8' });
    observations.video = { source: path.relative(root, recordedPath), mp4: converted.status === 0 ? path.relative(root, target) : null, conversionExitCode: converted.status, error: converted.error?.message ?? (converted.status ? converted.stderr?.slice(-1000) : null) };
  }
  const result = { generatedAt: new Date().toISOString(), origin, mode: production ? 'production' : performanceOnly ? 'performance-only' : 'development', browser: 'Installed Chrome, Playwright headless, ANGLE SwiftShader, DPR1', limitation: 'Touch emulation, not a physical phone. Safari and real GPU not tested.', summary: { passed: checks.filter(c => c.passed).length, failed: checks.filter(c => !c.passed).length }, checks, observations, runtime, requests };
  await fs.writeFile(path.join(output, production ? 'production-assets-production.json' : 'production-assets-browser.json'), JSON.stringify(result, null, 2) + '\n');
  await fs.writeFile(path.join(output, production ? 'PRODUCTION_ASSETS_PRODUCTION.md' : 'PRODUCTION_ASSETS_BROWSER.md'), ['# v0.5 Production Asset Browser Validation', '', `Generated: ${result.generatedAt}`, `Mode: ${result.mode}`, `Result: ${result.summary.passed} passed; ${result.summary.failed} failed.`, '', 'Every state change uses native mouse/touch/keyboard or navigation; the debug API only observes. Expected fallback tests are separate from successful production-asset acceptance.', '', '| Check | Result |', '| --- | --- |', ...checks.map(c => `| ${c.name} | ${c.passed ? 'PASS' : 'FAIL'} |`), '', result.limitation, '', ...checks.filter(c => !c.passed).map(c => `## ${c.name}\n\n\`\`\`\n${c.error}\n\`\`\``), ''].join('\n'));
  console.log(`RESULT ${result.summary.passed} passed; ${result.summary.failed} failed`);
}
