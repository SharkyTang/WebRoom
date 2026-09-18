import { chromium } from '@playwright/test';
import { tsImport } from 'tsx/esm/api';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { waitForCanvasReady } from './helpers/browserReady.mjs';

// Read-only diagnostics observe; browser navigation, mouse/touch and Back change state.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselineMode = process.env.ROOM_C_PERFORMANCE_BASELINE === '1';
const output = process.env.ROOM_TEST_OUTPUT ?? path.join(root, 'validation/v06c', baselineMode ? 'baseline' : 'performance');
const baselinePath = process.env.ROOM_C_PERFORMANCE_BASELINE_FILE ?? path.join(root, 'validation/v06c/baseline/performance.json');
const origin = process.env.ROOM_TEST_URL ?? 'http://127.0.0.1:3000';
const { assetManifest, assetFamilies } = await tsImport('../lib/room/assets/assetManifest.ts', import.meta.url);
const { SOURCE_NODE_COUNT } = await tsImport('../lib/room/sceneConstants.ts', import.meta.url);
const { interactionIds } = await tsImport('../lib/room/interactiveObjects.ts', import.meta.url);
// Same sampling protocol as the B suite, with all 27 pre-C families protected.
const oldFamilies = ['monitor', 'macbook', 'marshall', 'floor', 'walls', 'door', 'window', 'curtains', 'desk', 'cabinet', 'bed', 'bedside', 'sofa', 'chair', 'coffee', 'sidetable', 'beanbag', 'rugs', 'dogbed', 'piano', 'ipad', 'phone', 'trashcan', 'lightswitch', 'keyboard', 'mouse', 'headphones'];
for (const id of oldFamilies) assert(assetFamilies.includes(id), `Protected existing family missing: ${id}`);
const viewports = [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }];
const focusIds = ['monitor', 'macbook', 'ipad', 'phone', 'marshall', 'piano', 'trashcan', 'lightswitch'];
const contexts = new Set(), checks = [], runtime = [], requests = [], samples = [];
const baseline = baselineMode ? null : JSON.parse(await fs.readFile(baselinePath, 'utf8'));
if (baseline) {
  assert.equal(baseline.summary.failed, 0, 'Comparison requires a successful current-session baseline');
  assert.deepEqual([...baseline.families].sort(), [...oldFamilies].sort(), 'C baseline must represent exactly the protected 27 pre-C families');
}
if (baselineMode) assert.deepEqual([...assetFamilies].sort(), [...oldFamilies].sort(), 'Capture C baseline before registering any C families');
await fs.mkdir(output, { recursive: true });
const target = path.join(output, 'performance.json');
await fs.access(target).then(() => { throw new Error(`Refusing to overwrite evidence: ${target}`); }, error => { if (error.code !== 'ENOENT') throw error; });
const modelFiles = await Promise.all(['/models/sharkys_room_blockout_FINAL.glb', ...assetFamilies.map(id => assetManifest[id].url)].map(async url => {
  const bytes = await fs.readFile(path.join(root, 'public', url));
  return { url, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
}));
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const snap = page => page.evaluate(() => window.__ROOM_DEBUG__?.snapshot());
const sorted = values => [...values].sort();
const textureUpdates = state => Object.fromEntries(assetFamilies.map(id => [id, state.assetVisuals[id].stateSurfaces.map(surface => surface.textureUpdates)]));
async function check(name, operation) {
  try { const detail = await operation(); checks.push({ name, passed: true, detail }); console.log(`PASS ${name}`); return detail; }
  catch (error) { checks.push({ name, passed: false, error: String(error.stack ?? error) }); throw error; }
}
async function ready(page) {
  await page.waitForSelector('[data-room-status="ready"]', { timeout: 90000 });
  for (const id of assetFamilies) await page.waitForSelector(`[data-asset-${id}="installed"]`, { timeout: 15000 });
  const state = await snap(page);
  assert(state, 'Development diagnostics must be available for measured evidence');
  assert.equal(state.assembly.ok, true, JSON.stringify(state.assembly.errors));
  assert.deepEqual(state.assembly.errors, []);
  assert.equal(state.assembly.sourceNodeCount, SOURCE_NODE_COUNT);
  assert.equal(state.validation.nodeCount, SOURCE_NODE_COUNT);
  assert.deepEqual(sorted(state.assembly.installedFamilies), sorted(assetFamilies));
  assert.equal(state.validation.mappings.length, interactionIds.length);
  for (const id of assetFamilies) {
    assert.equal(state.assets[id].status, 'installed');
    assert(state.assetVisuals[id].meshes > 0, `${id} must contain installed VIS geometry`);
  }
  return state;
}
async function stateIs(page, expected) {
  await page.waitForFunction(expected => {
    const state = window.__ROOM_DEBUG__?.snapshot().interaction;
    return state && Object.entries(expected).every(([key, value]) => state[key] === value);
  }, expected, { timeout: 30000 });
}
async function visiblePoint(page, id) {
  await waitForCanvasReady(page, { timeoutMs: 20000 });
  const family = assetFamilies.includes(id) ? id : null;
  const hit = await page.evaluate(({ id, family }) => {
    const api = window.__ROOM_DEBUG__, canvas = document.querySelector('canvas'), rect = canvas.getBoundingClientRect();
    const inspect = point => {
      if (!point || document.elementFromPoint(point.x, point.y) !== canvas) return null;
      const hit = api.hitTest(point.x, point.y);
      return hit?.semanticId === id && (!family || hit.assetFamily === family) ? { point, hit } : null;
    };
    const projected = inspect(api.projected()[id]);
    if (projected) return projected;
    for (const step of [8, 3, 1]) for (let y = Math.ceil(rect.y) + 1; y < rect.bottom; y += step) for (let x = Math.ceil(rect.x) + 1; x < rect.right; x += step) {
      const result = inspect({ x, y }); if (result) return result;
    }
    return null;
  }, { id, family });
  assert(hit, `Visible native entry required for ${id}${family ? ' formal geometry' : ' existing proxy'}`);
  return hit;
}
function distribution(values) {
  assert(values.length, 'Active motion must yield rendered interval samples');
  const sorted = [...values].sort((a, b) => a - b);
  return { count: values.length, mean: values.reduce((a, b) => a + b, 0) / values.length, median: sorted[Math.floor(sorted.length * .5)], p95: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * .95))], max: sorted.at(-1) };
}
async function activity(page, label, action) {
  await page.evaluate(() => {
    window.__v06cFrames = []; window.__v06cSampling = true;
    function sample() {
      const state = window.__ROOM_DEBUG__.snapshot();
      window.__v06cFrames.push({ atMs: performance.now(), renderFrames: state.renderFrames, phase: state.interaction.interactionPhase, cameraBusy: state.interaction.isCameraBusy, activeObject: state.interaction.activeObject, pianoState: state.interaction.pianoState, macbookState: state.interaction.macbookState, trashState: state.interaction.trashState });
      if (window.__v06cSampling) requestAnimationFrame(sample);
    }
    sample();
  });
  try { await action(); } finally { await page.evaluate(() => { window.__v06cSampling = false; }); }
  const frames = await page.evaluate(() => window.__v06cFrames), intervals = [];
  const active = state => state.cameraBusy || ['focusing', 'interacting', 'returning'].includes(state.phase);
  for (let index = 1; index < frames.length; index++) {
    const before = frames[index - 1], after = frames[index], rendered = after.renderFrames - before.renderFrames, elapsed = after.atMs - before.atMs;
    if (rendered > 0 && elapsed > 0 && active(before) && active(after)) intervals.push(elapsed / rendered);
  }
  return { label, observedIntervalMs: distribution(intervals), samples: frames };
}
async function environment(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas'), gl = canvas.getContext('webgl2'), extension = gl.getExtension('WEBGL_debug_renderer_info');
    return { userAgent: navigator.userAgent, viewport: { width: innerWidth, height: innerHeight }, dpr: devicePixelRatio, canvas: { width: canvas.width, height: canvas.height }, renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), quality: 'Existing app defaults; no rendering settings changed', mode: 'development continuous ?debug=1; headless ANGLE SwiftShader', reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches };
  });
}
function resources(state) {
  const instances = assetFamilies.flatMap(family => state.assetVisuals[family].textures.map(texture => ({ family, ...texture })));
  const unique = new Map(instances.map(texture => [texture.uuid, texture]));
  return { runtimeNodeCount: state.assembly.runtimeNodeCount, rendererMemory: state.rendererMemory, families: state.assetVisuals, textures: { instances, uniqueTextureObjects: unique.size, estimatedRGBABytesWithMipmaps: [...unique.values()].reduce((sum, texture) => sum + texture.estimatedRGBABytesWithMipmaps, 0) } };
}
try {
  for (const viewport of viewports) {
    const touch = viewport.width === 390;
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: touch, isMobile: touch, reducedMotion: 'no-preference' }); contexts.add(context);
    const page = await context.newPage();
    page.on('pageerror', error => runtime.push({ viewport, type: 'pageerror', message: error.message }));
    page.on('console', message => { if (['error', 'warning'].includes(message.type())) runtime.push({ viewport, type: message.type(), message: message.text() }); });
    page.on('requestfailed', request => requests.push({ viewport, url: request.url(), error: request.failure()?.errorText }));
    await page.goto(`${origin}/?debug=1`, { waitUntil: 'domcontentloaded' });
    const initial = await ready(page);
    await page.waitForFunction(() => window.__ROOM_DEBUG__.snapshot().performance?.calls > 0, undefined, { timeout: 30000 });
    const entry = { viewport, touchEmulation: touch, environment: await environment(page), hero: initial.camera, mappings: initial.validation.mappings, actions: [], focus: [] };
    samples.push(entry);
    await check(`${viewport.width}px complete manifest installation and measured Hero`, async () => {
      const before = await snap(page); await page.waitForTimeout(2000); const after = await snap(page);
      assert(after.renderFrames - before.renderFrames > 2, 'Continuous diagnostics must render more than two frames');
      assert.deepEqual(textureUpdates(after), textureUpdates(before), 'Static screen content must not repaint during sampling');
      assert.equal(entry.environment.dpr, 1); assert.deepEqual(entry.environment.viewport, viewport);
      entry.performance = after.performance; entry.resources = resources(after);
      entry.networkModels = await page.evaluate(() => performance.getEntriesByType('resource').filter(item => item.name.includes('/models/')).map(item => ({ url: new URL(item.name).pathname, transferSize: item.transferSize, encodedBodySize: item.encodedBodySize, decodedBodySize: item.decodedBodySize, duration: item.duration })));
      for (const model of modelFiles) assert(entry.networkModels.some(resource => resource.url === model.url), `Browser must load ${model.url}`);
      await page.screenshot({ path: path.join(output, `hero-${viewport.width}.png`), style: '.debug-panel { visibility: hidden !important; }' });
      return { families: assetFamilies.length, sourceNodes: after.assembly.sourceNodeCount, performance: after.performance };
    });
    if (viewport.width !== 768) for (const id of focusIds) {
      await check(`${viewport.width}px ${id} focus/Back measured with native ${touch ? 'touch' : 'mouse'}`, async () => {
        const target = await visiblePoint(page, id);
        entry.actions.push(await activity(page, `${id}: focus`, async () => {
          if (touch) await page.touchscreen.tap(target.point.x, target.point.y); else await page.mouse.click(target.point.x, target.point.y);
          await stateIs(page, { activeObject: id, interactionPhase: 'focused', isCameraBusy: false });
        }));
        await page.mouse.move(0, 0); await page.waitForTimeout(1200);
        const focused = await snap(page); entry.focus.push({ id, target, camera: focused.camera, performance: focused.performance, mechanical: focused.mechanical });
        entry.actions.push(await activity(page, `${id}: Back`, async () => {
          const back = page.getByRole('button', { name: 'Back', exact: true }); if (touch) await back.tap(); else await back.click();
          await stateIs(page, { activeObject: null, interactionPhase: 'idle', isCameraBusy: false });
        }));
        const returned = await snap(page); assert.deepEqual(returned.camera, entry.hero); assert.equal(returned.assembly.ok, true); assert.equal(returned.interaction.error, null);
        return { target, intervals: entry.actions.slice(-2).map(action => ({ label: action.label, ...action.observedIntervalMs })) };
      });
    }
    await context.close(); contexts.delete(context);
  }
  if (baseline) await check('Same-condition C delta with unchanged pre-C exports', async () => {
    for (const old of baseline.modelFiles) assert.deepEqual(modelFiles.find(model => model.url === old.url), old, `Pre-C export changed: ${old.url}`);
    for (const current of samples) {
      const old = baseline.samples.find(sample => sample.viewport.width === current.viewport.width); assert(old);
      assert.deepEqual(current.environment, old.environment, 'Environment mismatch: do not subtract unlike measurements');
      assert.deepEqual(current.hero, old.hero); assert.deepEqual(current.mappings, old.mappings);
      current.delta = { calls: current.performance.calls - old.performance.calls, triangles: current.performance.triangles - old.performance.triangles, observedHeroIntervalMs: current.performance.frameMs - old.performance.frameMs, textureEstimateBytes: current.resources.textures.estimatedRGBABytesWithMipmaps - old.resources.textures.estimatedRGBABytesWithMipmaps, actions: current.actions.map(action => { const prior = old.actions.find(item => item.label === action.label); assert(prior); return { label: action.label, meanMs: action.observedIntervalMs.mean - prior.observedIntervalMs.mean, medianMs: action.observedIntervalMs.median - prior.observedIntervalMs.median, p95Ms: action.observedIntervalMs.p95 - prior.observedIntervalMs.p95 }; }) };
    }
    return { addedModelBytes: modelFiles.reduce((sum, model) => sum + model.bytes, 0) - baseline.modelFiles.reduce((sum, model) => sum + model.bytes, 0), addedFamilies: assetFamilies.filter(id => !baseline.families.includes(id)) };
  });
  await check('No runtime errors or model load failures during measurement', async () => {
    assert.deepEqual(runtime.filter(item => ['pageerror', 'error'].includes(item.type)), []); assert.deepEqual(requests, []);
  });
} catch (error) {
  if (!checks.some(item => !item.passed)) checks.push({ name: 'Performance measurement setup', passed: false, error: String(error.stack ?? error) });
  console.error(error); process.exitCode = 1;
} finally {
  for (const context of contexts) await context.close().catch(() => {}); await browser.close();
  const result = { generatedAt: new Date().toISOString(), mode: baselineMode ? 'pre-C baseline' : 'C final comparison', origin, baselinePath: baseline ? baselinePath : null, families: assetFamilies, modelFiles, totalModelFileBytes: modelFiles.reduce((sum, model) => sum + model.bytes, 0), summary: { passed: checks.filter(item => item.passed).length, failed: checks.filter(item => !item.passed).length }, checks, samples, runtime, requests, method: 'Fresh browser context per viewport; DPR1; existing continuous development diagnostics; two-second Hero sample; native entry/Back RAF observations. No fault injection, concurrent browser suite or video capture. Three Hero resolutions, desktop and 390px touch focus/Back. Do not run concurrently with other rendering work.', limits: 'SwiftShader software rendering and emulated touch are not physical GPU/mobile results. Frame intervals include browser scheduling and read-only diagnostics, not isolated render or GPU time. GLB disk bytes, Resource Timing transfer bytes and estimated RGBA mipmap allocations are separate quantities. Texture UUID count is not measured VRAM. Local warmed dev server is not an internet cold-load benchmark.' };
  await fs.writeFile(target, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(`RESULT ${result.summary.passed} passed; ${result.summary.failed} failed — ${target}`);
}
