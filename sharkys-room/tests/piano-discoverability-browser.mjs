import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// All changes use native mouse/touch/keyboard input. Diagnostics only observe.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = process.env.ROOM_TEST_OUTPUT ?? path.join(root, 'validation/v041');
const production = process.env.ROOM_TEST_PRODUCTION === '1';
const origin = process.env.ROOM_TEST_URL ?? (production ? 'http://127.0.0.1:3001' : 'http://127.0.0.1:3000');
const checks = [], errors = [], observations = {};
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const snap = page => page.evaluate(() => window.__ROOM_DEBUG__?.snapshot());
const points = page => page.evaluate(() => window.__ROOM_DEBUG__.projected());
const hit = (page, point) => page.evaluate(p => window.__ROOM_DEBUG__.hitTest(p.x, p.y), point);
const wait = (page, expected) => page.waitForFunction(expected => {
  const state = window.__ROOM_DEBUG__?.snapshot().interaction;
  return state && Object.entries(expected).every(([key, value]) => state[key] === value);
}, expected, { timeout: 15000 });
const settled = page => page.waitForSelector('[data-interaction-phase="focused"]');
const input = (page, point, touch) => touch ? page.touchscreen.tap(point.x, point.y) : page.mouse.click(point.x, point.y);
async function screenshot(page, file) {
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.screenshot({ path: path.join(output, file) });
}
async function check(name, fn, page) {
  try { const detail = await fn(); checks.push({ name, passed: true, ...detail }); console.log(`PASS ${name}`); }
  catch (error) {
    const failure = { name, passed: false, error: String(error.stack ?? error) };
    if (page) {
      failure.snapshot = await snap(page).catch(() => null);
      failure.body = await page.locator('body').innerText().catch(() => '');
      await screenshot(page, `failure-${checks.length}.png`).catch(() => {});
    }
    checks.push(failure); console.log(`FAIL ${name}: ${error.message}`);
    throw error;
  }
}
async function open({ touch = false, debug = true, wire = false, reduced = false } = {}) {
  const context = await browser.newContext({ viewport: touch ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: 1, hasTouch: touch, isMobile: touch, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', request => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
  await page.goto(`${origin}/${debug ? `?debug=1&demand=1${wire ? '&hitareas=1' : ''}` : ''}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-room-status="ready"]', { timeout: 60000 });
  return page;
}
function endpoint(s, state) {
  assert.equal(s.interaction.pianoState, state);
  assert.deepEqual(s.mechanical.transforms.piano.position, [-0.6499999761581421, 0.6000000238418579, state === 'extended' ? -1.2899999618530273 : -1.9399999618530273]);
  assert.equal(s.mechanical.sourceEndpoints.pianoTravel, .65);
  assert.equal(s.pianoRetractedHitAreaActive, state === 'retracted');
  assert.equal(s.interaction.returnRequested, false);
  assert.equal(s.interaction.error, null);
}
async function back(page, hero, touch = false) {
  const button = page.getByRole('button', { name: 'Back', exact: true });
  if (touch) await button.tap(); else await button.click();
  await page.waitForSelector('[data-interaction-phase="idle"]');
  if (hero) assert.deepEqual((await snap(page)).camera, hero);
}
async function retract(page, touch = false) {
  const button = page.getByRole('button', { name: 'Toggle piano', exact: true });
  if (touch) await button.tap(); else await button.click();
  await settled(page);
  if (await page.evaluate(() => Boolean(window.__ROOM_DEBUG__))) { await wait(page, { pianoState: 'retracted' }); endpoint(await snap(page), 'retracted'); }
  else await page.getByText('Piano: retracted', { exact: true }).waitFor();
}
async function proxyPoint(page) {
  const point = (await points(page)).piano;
  assert(point, 'No available Piano pixel');
  assert.equal((await hit(page, point)).runtimeTarget, 'PianoRetractedHitArea');
  return point;
}
async function startSampling(page) {
  await page.evaluate(() => {
    window.pianoSamples = [];
    window.stopPianoSamples = false;
    function sample() {
      const s = window.__ROOM_DEBUG__.snapshot();
      window.pianoSamples.push({ phase: s.interaction.interactionPhase, state: s.interaction.pianoState, active: s.pianoRetractedHitAreaActive, z: s.mechanical.transforms.piano.position[2] });
      if (!window.stopPianoSamples) requestAnimationFrame(sample);
    }
    sample();
  });
}
async function endSampling(page) {
  const samples = await page.evaluate(() => { window.stopPianoSamples = true; return window.pianoSamples; });
  for (const s of samples) {
    if (s.active) { assert.equal(s.state, 'retracted'); assert.equal(s.z, -1.9399999618530273); assert(['idle', 'hovering', 'focused'].includes(s.phase)); }
    if (['extending', 'retracting'].includes(s.state) || ['focusing', 'interacting', 'returning'].includes(s.phase)) assert.equal(s.active, false);
  }
  return samples;
}
async function negativePoints(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas'), r = canvas.getBoundingClientRect(), found = {};
    for (let y = r.y + 8; y < r.bottom; y += 12) for (let x = r.x + 8; x < r.right; x += 12) {
      if (document.elementFromPoint(x, y) !== canvas) continue;
      const h = window.__ROOM_DEBUG__.hitTest(x, y);
      if (!h || h.semanticId) continue;
      for (const name of ['FUR_Desk', 'FUR_OfficeChair', 'ENV_Floor']) if (!found[name] && h.ancestors.includes(name)) found[name] = { x, y };
      if (Object.keys(found).length === 3) return found;
    }
    return found;
  });
}

try {
  if (production) {
    const evidence = JSON.parse(await fs.readFile(path.join(output, 'piano-browser.json'), 'utf8')).observations;
    for (const touch of [false, true]) {
      const page = await open({ touch, wire: true });
      await check(`Production ${touch ? '390×844 touch' : 'desktop'} reopens Piano at the recorded undertray pixel; debug remains absent`, async () => {
        assert.equal(await page.evaluate(() => Boolean(window.__ROOM_DEBUG__)), false);
        assert.equal(await page.locator('.debug-panel').count(), 0);
        const e = evidence[touch ? 'mobile' : 'desktop'];
        await input(page, e.initialPiano, touch); await settled(page);
        await retract(page, touch); await back(page, null, touch);
        await input(page, e.proxy, touch); await settled(page);
        await page.getByText('Piano: extended', { exact: true }).waitFor();
        await back(page, null, touch);
        await screenshot(page, touch ? 'production_mobile.png' : 'production_desktop.png');
        return { point: e.proxy, noDiagnostics: true };
      }, page);
      await page.context().close();
    }
  } else {
    const page = await open();
    const initial = await snap(page), hero = initial.camera;
    const initialPiano = (await points(page)).piano;
    const negatives = await negativePoints(page);
    observations.desktop = { initialPiano, negatives };
    await check('Initial extended Piano has no runtime proxy and uses its real visible mesh', async () => {
      endpoint(initial, 'extended'); assert.equal((await hit(page, initialPiano)).runtimeTarget, null);
      await input(page, initialPiano); await settled(page); endpoint(await snap(page), 'extended');
    }, page);
    await check('Focused retracted Piano responds to the shared hover label and proxy click', async () => {
      await startSampling(page); await retract(page);
      const point = await proxyPoint(page); await page.mouse.move(point.x, point.y);
      await page.locator('.page-footer p').filter({ hasText: 'Pull-out Piano' }).waitFor();
      assert.equal(await page.locator('canvas').evaluate(c => c.style.cursor), 'pointer');
      await input(page, point); await settled(page); endpoint(await snap(page), 'extended');
      observations.focusedSamples = await endSampling(page);
    }, page);
    await check('Four Hero rediscovery cycles ignore competing clicks and preserve exact endpoints/camera', async () => {
      observations.cycles = [];
      for (let cycle = 0; cycle < 4; cycle++) {
        await startSampling(page); await retract(page); await back(page, hero);
        const point = await proxyPoint(page); observations.desktop.proxy = point;
        await page.mouse.move(point.x, point.y);
        await page.locator('.page-footer p').filter({ hasText: 'Pull-out Piano' }).waitFor();
        assert.equal((await snap(page)).hovered, 'piano');
        if (cycle === 0) await screenshot(page, 'piano_retracted_hover.png');
        await page.mouse.click(point.x, point.y, { clickCount: 4, delay: 15 });
        await settled(page); endpoint(await snap(page), 'extended');
        observations.cycles.push(await endSampling(page));
        if (cycle === 0) await screenshot(page, 'piano_extended.png');
        // Inspect the real extended mesh from Hero, then click it to retract again.
        await back(page, hero); assert.equal((await snap(page)).pianoRetractedHitAreaActive, false);
        const visible = (await points(page)).piano;
        assert.equal((await hit(page, visible)).runtimeTarget, null);
        await input(page, visible); await settled(page); endpoint(await snap(page), 'retracted');
        await input(page, await proxyPoint(page)); await settled(page); endpoint(await snap(page), 'extended');
      }
      return { cycles: 4, exactHero: true, travel: .65 };
    }, page);
    await check('Retracted proxy does not steal desktop, chair, floor or other semantic hover targets', async () => {
      await retract(page); await back(page, hero);
      assert.deepEqual(Object.keys(negatives).sort(), ['ENV_Floor', 'FUR_Desk', 'FUR_OfficeChair']);
      for (const [name, point] of Object.entries(negatives)) {
        const target = await hit(page, point); assert.equal(target.semanticId, null, name); assert(target.ancestors.includes(name));
        await input(page, point); assert.equal((await snap(page)).interaction.activeObject, null);
      }
      const p = await points(page);
      for (const [id, point] of Object.entries(p)) {
        if (id.startsWith('__') || id === 'piano') continue;
        assert.equal((await hit(page, point)).semanticId, id);
        await page.mouse.move(point.x, point.y); await wait(page, { hoveredObject: id });
      }
      return { negatives, otherObjects: Object.keys(p).filter(id => id !== 'piano' && !id.startsWith('__')) };
    }, page);
    await check('Fallback selector, queued Back and demand rendering remain functional', async () => {
      await page.getByRole('combobox').selectOption('piano');
      await page.getByRole('button', { name: 'Back', exact: true }).click();
      await page.waitForSelector('[data-interaction-phase="idle"]');
      assert.deepEqual((await snap(page)).camera, hero); endpoint(await snap(page), 'extended');
      await page.mouse.move(0, 0); await page.waitForTimeout(300);
      const before = (await snap(page)).renderFrames; await page.waitForTimeout(500);
      assert.equal((await snap(page)).renderFrames, before);
    }, page);
    const wire = await open({ wire: true });
    await check('Debug-only wireframe identifies the active undertray bounds', async () => {
      await input(wire, (await points(wire)).piano); await settled(wire); await retract(wire); await back(wire);
      await wire.locator('.debug-panel summary').click();
      await screenshot(wire, 'piano_retracted_hitarea_debug.png');
      assert.equal((await snap(wire)).pianoRetractedHitAreaActive, true);
    }, wire);
    await wire.context().close();
    const mobile = await open({ touch: true });
    const mobileInitial = await snap(mobile), mobileHero = mobileInitial.camera;
    observations.mobile = { initialPiano: (await points(mobile)).piano };
    await check('390×844 retraction, integer-pixel touch rediscovery and visible Back work without hover', async () => {
      const negatives = await negativePoints(mobile);
      await input(mobile, observations.mobile.initialPiano, true); await settled(mobile);
      await retract(mobile, true); await back(mobile, mobileHero, true);
      for (const [name, point] of Object.entries(negatives)) {
        assert.equal((await hit(mobile, point)).semanticId, null, name);
        await input(mobile, point, true); assert.equal((await snap(mobile)).interaction.activeObject, null);
      }
      const point = await proxyPoint(mobile); observations.mobile.proxy = point;
      const region = await mobile.evaluate(p => {
        const pixels = [];
        for (let y = p.y - 40; y <= p.y + 40; y++) for (let x = p.x - 60; x <= p.x + 60; x++) {
          if (window.__ROOM_DEBUG__.hitTest(x, y)?.runtimeTarget === 'PianoRetractedHitArea') pixels.push({ x, y });
        }
        return { count: pixels.length, width: Math.max(...pixels.map(p => p.x)) - Math.min(...pixels.map(p => p.x)) + 1, height: Math.max(...pixels.map(p => p.y)) - Math.min(...pixels.map(p => p.y)) + 1, samples: [pixels[Math.floor(pixels.length / 3)], pixels[Math.floor(pixels.length * 2 / 3)]] };
      }, point);
      assert(region.count > 500 && region.width >= 40 && region.height >= 23, JSON.stringify(region));
      observations.mobile.region = region;
      for (const p of [point, ...region.samples]) {
        await input(mobile, p, true); await settled(mobile); endpoint(await snap(mobile), 'extended');
        const backButton = mobile.getByRole('button', { name: 'Back', exact: true });
        const b = await backButton.boundingBox(); assert(b.width >= 40 && b.height >= 40 && b.x >= 0 && b.y + b.height <= 844);
        await screenshot(mobile, 'piano_mobile_reopen.png');
        await retract(mobile, true); await back(mobile, mobileHero, true);
      }
      return { point, region, negatives, exactHero: true };
    }, mobile);
    await mobile.context().close();
    const reduced = await open({ reduced: true });
    await check('Reduced motion reopens via the proxy at exact endpoints', async () => {
      const hero = (await snap(reduced)).camera;
      await input(reduced, (await points(reduced)).piano); await settled(reduced); await retract(reduced); await back(reduced, hero);
      await input(reduced, await proxyPoint(reduced)); await settled(reduced); endpoint(await snap(reduced), 'extended');
      assert.equal((await snap(reduced)).interaction.reducedMotion, true); await back(reduced, hero);
    }, reduced);
    await reduced.context().close();
    await check('Normal rendering reveals no hit box or debug UI; same pixels as hidden-proxy debug mode', async () => {
      // Both pages share the exact retracted Hero state and have no hover tint.
      await page.getByRole('combobox').selectOption('piano'); await settled(page); endpoint(await snap(page), 'retracted'); await back(page, hero); await page.mouse.move(0, 0);
      const normal = await open({ debug: false });
      await input(normal, initialPiano); await settled(normal); await retract(normal); await back(normal); await normal.mouse.move(0, 0);
      assert.equal(await normal.evaluate(() => Boolean(window.__ROOM_DEBUG__)), false);
      assert.equal(await normal.locator('.debug-panel').count(), 0);
      // Element screenshots include overlapping DOM; mask only the developer panel.
      const hiddenDebugCanvas = await page.locator('canvas').screenshot({ style: '.debug-panel { visibility: hidden !important; }' });
      assert(hiddenDebugCanvas.equals(await normal.locator('canvas').screenshot()), 'Normal/debug-hidden canvas differs');
      await input(normal, observations.desktop.proxy); await settled(normal);
      await normal.getByText('Piano: extended', { exact: true }).waitFor();
      await normal.context().close();
    }, page);
  }
  await check('No browser runtime or asset errors', () => { assert.deepEqual(errors, []); });
} catch (error) {
  if (!checks.some(check => !check.passed)) checks.push({ name: 'Browser setup/execution', passed: false, error: String(error.stack ?? error) });
  process.exitCode = 1;
}
finally {
  await browser.close();
  const result = { generatedAt: new Date().toISOString(), origin, mode: production ? 'production' : 'development', summary: { passed: checks.filter(c => c.passed).length, failed: checks.filter(c => !c.passed).length }, checks, errors, observations };
  await fs.writeFile(path.join(output, production ? 'piano-production.json' : 'piano-browser.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(`RESULT ${result.summary.passed} passed; ${result.summary.failed} failed`);
}
