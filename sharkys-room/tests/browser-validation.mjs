import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Tests only observe the debug API. Interactions are native browser pointer/touch input.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = process.env.ROOM_TEST_OUTPUT ?? path.join(root, 'validation', 'v04', 'v03-regression');
const origin = process.env.ROOM_TEST_URL ?? 'http://localhost:3000';
const semanticIds = ['monitor', 'macbook', 'ipad', 'marshall', 'piano', 'trashcan', 'lightswitch', 'phone', 'window'];
const glbPath = '**/models/sharkys_room_blockout_FINAL.glb';
const checks = [];
const runtime = [];
const failedRequests = [];
const observations = {};
await fs.mkdir(output, { recursive: true });

function record(name, passed, details = {}) {
  checks.push({ name, passed, ...details });
  process.stdout.write(`${passed ? 'PASS' : 'FAIL'} ${name}\n`);
}

async function check(name, callback) {
  try {
    const details = await callback();
    record(name, true, details ?? {});
    return true;
  } catch (error) {
    record(name, false, { error: String(error?.stack ?? error) });
    return false;
  }
}

function observe(page, phase) {
  page.on('console', (message) => runtime.push({ phase, type: message.type(), text: message.text() }));
  page.on('pageerror', (error) => runtime.push({ phase, type: 'pageerror', text: error.message }));
  page.on('requestfailed', (request) => failedRequests.push({ phase, url: request.url(), error: request.failure()?.errorText }));
  page.on('response', (response) => {
    if (response.status() >= 400) failedRequests.push({ phase, url: response.url(), status: response.status() });
  });
}

async function snapshot(page) {
  return page.evaluate(() => {
    const debug = window.__ROOM_DEBUG__;
    if (!debug) return null;
    return typeof debug.snapshot === 'function' ? debug.snapshot() : debug.snapshot;
  });
}

async function ready(page) {
  await page.waitForFunction(() => {
    const debug = window.__ROOM_DEBUG__;
    if (!debug) return false;
    const state = typeof debug.snapshot === 'function' ? debug.snapshot() : debug.snapshot;
    return state?.status === 'ready';
  }, undefined, { timeout: 60_000 });
}

async function points(page) {
  return page.evaluate(() => {
    const debug = window.__ROOM_DEBUG__;
    return typeof debug.projected === 'function' ? debug.projected() : debug.projected;
  });
}

async function stateEquals(page, key, value) {
  await page.waitForFunction(({ key, value }) => {
    const debug = window.__ROOM_DEBUG__;
    const state = typeof debug.snapshot === 'function' ? debug.snapshot() : debug.snapshot;
    return state?.[key] === value;
  }, { key, value }, { timeout: 7_000 });
}

// v0.4 preserves detection while a click now focuses the camera. Return through
// the real semantic Back button before the next v0.3 Hero-space assertion.
async function returnToHero(page) {
  const state = await snapshot(page);
  if (!state?.interaction?.activeObject) return;
  await page.waitForFunction(() => {
    const state = window.__ROOM_DEBUG__?.snapshot().interaction;
    return state?.interactionPhase === 'focused' && !state.isCameraBusy;
  }, undefined, { timeout: 15_000 });
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.waitForFunction(() => {
    const state = window.__ROOM_DEBUG__?.snapshot().interaction;
    return state && state.activeObject === null && !state.isCameraBusy && ['idle', 'hovering'].includes(state.interactionPhase);
  }, undefined, { timeout: 15_000 });
}

async function validateViewport(page, width, height) {
  await page.setViewportSize({ width, height });
  await page.waitForFunction(({ width, height }) => window.innerWidth === width && window.innerHeight === height, { width, height });
  // Two animation frames allow the ResizeObserver and R3F camera resize to settle.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const layout = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const box = canvas?.getBoundingClientRect();
    return {
      innerWidth, innerHeight,
      scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      canvas: box ? { x: box.x, y: box.y, width: box.width, height: box.height, bufferWidth: canvas.width, bufferHeight: canvas.height } : null,
    };
  });
  assert(layout.scrollWidth <= width + 1, `Horizontal overflow: ${layout.scrollWidth} > ${width}`);
  assert(layout.canvas?.width > 0 && layout.canvas?.height > 0, 'Canvas has no visible area');
  assert(layout.canvas.bufferWidth > 0 && layout.canvas.bufferHeight > 0, 'Canvas backing buffer is empty');
  assert(layout.canvas.x >= -1 && layout.canvas.x + layout.canvas.width <= width + 1, 'Canvas exceeds viewport horizontally');
  assert(layout.canvas.y < height && layout.canvas.y + layout.canvas.height > 0, 'Canvas is outside viewport');
  const state = await snapshot(page);
  assert.equal(state.status, 'ready');
  const projected = await points(page);
  const visible = semanticIds.filter((id) => projected?.[id] && projected[id].x >= 0 && projected[id].x <= width && projected[id].y >= 0 && projected[id].y <= height);
  assert(visible.length > 0, 'No interactive room geometry projects inside the visible viewport');
  return { ...layout, visibleTargets: visible, state };
}

// Modify only a test HTTP response, keeping the frozen source file untouched.
function missingNodeFixture(buffer) {
  assert.equal(buffer.toString('utf8', 0, 4), 'glTF');
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength));
  const node = json.nodes.find((candidate) => candidate.name === 'TEC_MonitorBody');
  assert(node, 'Missing-node fixture needs a real monitor body');
  node.name = '__TEST_MISSING_TEC_MonitorBody';
  const jsonText = Buffer.from(JSON.stringify(json));
  const padding = (4 - (jsonText.length % 4)) % 4;
  const jsonChunk = Buffer.concat([jsonText, Buffer.alloc(padding, 0x20)]);
  const remainder = buffer.subarray(20 + jsonLength);
  const header = Buffer.from(buffer.subarray(0, 20));
  header.writeUInt32LE(20 + jsonChunk.length + remainder.length, 8);
  header.writeUInt32LE(jsonChunk.length, 12);
  return Buffer.concat([header, jsonChunk, remainder]);
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  observe(page, 'normal-desktop');
  const loaded = await check('GLB loads and browser renders the frozen room', async () => {
    const response = await page.goto(`${origin}/?debug=1`, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    await ready(page);
    const state = await snapshot(page);
    observations.desktopInitial = state;
    return { snapshot: state };
  });

  if (loaded) {
    await check('Development diagnostics report frame timing and renderer counters', async () => {
      await page.waitForFunction(() => {
        const value = window.__ROOM_DEBUG__?.snapshot().performance;
        return value && value.fps > 0 && value.frameMs > 0 && value.calls > 0 && value.triangles > 0;
      }, undefined, { timeout: 20_000 });
      const state = await snapshot(page);
      observations.performance = state.performance;
      return { performance: state.performance, note: 'Software WebGL local observation, not a hardware benchmark' };
    });

    await check('Frozen scene exposes every required node, target, and unchanged scene counts', async () => {
      const state = await snapshot(page);
      assert(state.validation, 'Debug snapshot must include read-only scene validation');
      assert.equal(state.validation.ok, true);
      assert.deepEqual(state.validation.missingNodes, []);
      assert.deepEqual(state.validation.missingTargets, []);
      assert.deepEqual(state.validation.errors, []);
      assert.equal(state.validation.nodeCount, 85);
      assert.equal(state.validation.sourceMeshCount, 55);
      assert.equal(state.validation.triangleCount, 6566);
      assert.deepEqual(state.validation.mappings.map(({ id }) => id).sort(), [...semanticIds].sort());
      assert.equal(state.validation.mappings.reduce((sum, item) => sum + item.nodeNames.length, 0), 14);
      return { validation: state.validation };
    });

    for (const id of semanticIds) {
      await check(`Real mouse hover and click identify ${id}`, async () => {
        const projected = await points(page);
        const point = projected?.[id];
        assert(point && Number.isFinite(point.x) && Number.isFinite(point.y), `No visible raycast point for ${id}`);
        await page.mouse.move(point.x, point.y);
        await stateEquals(page, 'hovered', id);
        const cursor = await page.evaluate(({ x, y }) => {
          const element = document.elementFromPoint(x, y);
          return element ? getComputedStyle(element).cursor : null;
        }, point);
        assert.equal(cursor, 'pointer');
        await page.mouse.click(point.x, point.y);
        await stateEquals(page, 'selected', id);
        const state = await snapshot(page);
        await returnToHero(page);
        return { point, cursor, state };
      });
    }

    await check('Non-interactive geometry does not report a semantic hit', async () => {
      const projected = await points(page);
      const point = projected?.__noninteractive;
      assert(point, 'No non-interactive room surface was provided for the negative raycast test');
      const before = await snapshot(page);
      await page.mouse.move(point.x, point.y);
      await stateEquals(page, 'hovered', null);
      await page.mouse.click(point.x, point.y);
      const after = await snapshot(page);
      assert(after.selected === before.selected || after.selected === null, 'Non-interactive click selected an interaction');
      const cursor = await page.evaluate(({ x, y }) => getComputedStyle(document.elementFromPoint(x, y)).cursor, point);
      assert.notEqual(cursor, 'pointer', 'Pointer cursor must clear over a non-interactive surface');
      return { point, beforeSelected: before.selected, afterSelected: after.selected };
    });

    for (const [width, height] of [[1920, 1080], [1440, 900], [1280, 720], [768, 1024], [390, 844]]) {
      await check(`Resize ${width}×${height}: canvas visible and no horizontal overflow`, async () => {
        const result = await validateViewport(page, width, height);
        observations[`viewport${width}`] = result;
        if (width === 1440) await page.screenshot({ path: path.join(output, 'web_desktop_1440_debug.png') });
        return result;
      });
    }

    await check('Normal user mode displays the room without developer diagnostics', async () => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(origin, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-room-status="ready"]', { timeout: 60_000 });
      await page.screenshot({ path: path.join(output, 'web_desktop_1440.png') });
      const hasDebugApi = await page.evaluate(() => Boolean(window.__ROOM_DEBUG__));
      assert.equal(hasDebugApi, false, 'Read-only diagnostics should require the debug query flag');
      return { screenshot: 'validation/v04/v03-regression/web_desktop_1440.png' };
    });
  }

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const mobile = await mobileContext.newPage();
  observe(mobile, 'normal-mobile');
  const mobileReady = await check('390px touch device loads and fits without overflow', async () => {
    await mobile.goto(`${origin}/?debug=1`, { waitUntil: 'domcontentloaded' });
    await ready(mobile);
    const viewport = await validateViewport(mobile, 390, 844);
    observations.mobile = await snapshot(mobile);
    return { viewport, state: observations.mobile };
  });
  if (mobileReady) {
    observations.mobileTouches = [];
    for (const id of semanticIds) {
      await check(`390px real touch tap identifies ${id}`, async () => {
        const projected = await points(mobile);
        const point = projected?.[id];
        assert(point, `${id} has no visible raycast point on mobile`);
        const detail = { id, point };
        observations.mobileTouches.push(detail);
        detail.element = await mobile.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, point);
        await mobile.touchscreen.tap(point.x, point.y);
        try {
          await stateEquals(mobile, 'selected', id);
        } finally {
          detail.state = await snapshot(mobile);
        }
        await returnToHero(mobile);
        return detail;
      });
    }
  }
  await check('Capture 390px normal-mode mobile screenshot', async () => {
    await mobile.goto(origin, { waitUntil: 'domcontentloaded' });
    await mobile.waitForSelector('[data-room-status="ready"]', { timeout: 60_000 });
    await mobile.screenshot({ path: path.join(output, 'web_mobile_390.png') });
    return { screenshot: 'validation/v04/v03-regression/web_mobile_390.png' };
  });

  const loadingContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const loadingPage = await loadingContext.newPage();
  observe(loadingPage, 'delayed-loading');
  let releaseDownload;
  const downloadGate = new Promise((resolve) => { releaseDownload = resolve; });
  await loadingPage.route(glbPath, async (route) => { await downloadGate; await route.continue(); });
  await check('Loading screen remains visible and page responsive during delayed GLB download', async () => {
    await loadingPage.goto(`${origin}/?debug=1`, { waitUntil: 'domcontentloaded' });
    await loadingPage.getByText(/Loading room/i).first().waitFor({ state: 'visible', timeout: 30_000 });
    const responsive = await loadingPage.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(true))));
    assert.equal(responsive, true);
    await loadingPage.screenshot({ path: path.join(output, 'web_loading.png') });
    releaseDownload();
    await ready(loadingPage);
    return { screenshot: 'validation/v04/v03-regression/web_loading.png', recoversToReady: true };
  });
  releaseDownload();

  const errorContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const errorPage = await errorContext.newPage();
  observe(errorPage, 'expected-404');
  await errorPage.route(glbPath, (route) => route.fulfill({ status: 404, contentType: 'text/plain', body: 'Synthetic test: GLB not found' }));
  await check('GLB 404 produces a readable error instead of silently continuing', async () => {
    await errorPage.goto(`${origin}/?debug=1`, { waitUntil: 'domcontentloaded' });
    await errorPage.waitForSelector('[data-room-status="error"]', { timeout: 30_000 });
    const alert = errorPage.locator('[data-room-status="error"]').getByRole('alert');
    await alert.waitFor({ state: 'visible', timeout: 30_000 });
    const text = await alert.innerText();
    assert(text.length > 15, 'Error must explain the failure');
    await errorPage.screenshot({ path: path.join(output, 'web_glb_404.png') });
    return { text, screenshot: 'validation/v04/v03-regression/web_glb_404.png' };
  });

  const missingContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const missingPage = await missingContext.newPage();
  observe(missingPage, 'expected-missing-node');
  await missingPage.route(glbPath, async (route) => {
    const response = await route.fetch();
    const broken = missingNodeFixture(await response.body());
    await route.fulfill({ status: 200, contentType: 'model/gltf-binary', body: broken });
  });
  await check('Missing required interactive node produces an explicit error', async () => {
    await missingPage.goto(`${origin}/?debug=1`, { waitUntil: 'domcontentloaded' });
    await missingPage.waitForSelector('[data-room-status="error"]', { timeout: 30_000 });
    const alert = missingPage.locator('[data-room-status="error"]').getByRole('alert');
    await alert.waitFor({ state: 'visible', timeout: 30_000 });
    const text = await alert.innerText();
    assert(text.includes('TEC_MonitorBody'), `Missing node must be named in error: ${text}`);
    await missingPage.screenshot({ path: path.join(output, 'web_missing_node.png') });
    return { text, screenshot: 'validation/v04/v03-regression/web_missing_node.png' };
  });

  await check('Normal desktop/mobile runtime has no critical console errors or missing assets', async () => {
    const normalPhases = ['normal-desktop', 'normal-mobile', 'delayed-loading'];
    const errors = runtime.filter((entry) => normalPhases.includes(entry.phase) && (entry.type === 'error' || entry.type === 'pageerror'));
    const warnings = runtime.filter((entry) => normalPhases.includes(entry.phase) && entry.type === 'warning' && /React|update|render|Maximum/i.test(entry.text));
    const assets = failedRequests.filter((entry) => normalPhases.includes(entry.phase));
    assert.deepEqual(errors, [], JSON.stringify(errors));
    assert.deepEqual(warnings, [], JSON.stringify(warnings));
    assert.deepEqual(assets, [], JSON.stringify(assets));
    return { consoleErrors: errors.length, reactWarnings: warnings.length, failedRequests: assets.length };
  });
} finally {
  await browser.close();
  const result = {
    generatedAt: new Date().toISOString(), origin,
    browser: 'Installed Google Chrome, Playwright headless, ANGLE SwiftShader (software WebGL)',
    note: 'Diagnostics are read-only. All interaction events use actual mouse or touchscreen input. Missing-node corruption exists only in one intercepted test response.',
    summary: { passed: checks.filter((item) => item.passed).length, failed: checks.filter((item) => !item.passed).length },
    checks, observations, runtime, failedRequests,
  };
  await fs.writeFile(path.join(output, 'browser_validation.json'), JSON.stringify(result, null, 2) + '\n');
  await fs.writeFile(path.join(output, 'BROWSER_VALIDATION.md'), [
    '# v0.3 Browser Regression Validation on v0.4', '',
    `- Generated: ${result.generatedAt}`,
    `- URL: ${origin}`,
    `- Browser: ${result.browser}`,
    `- Result: ${result.summary.passed} passed; ${result.summary.failed} failed`,
    '- Performance readings are local software-renderer observations, not a hardware performance benchmark.',
    '- Pointer/touch tests use real browser input. Frozen assets are never edited.',
    '- v0.4 compatibility adaptation: each original semantic click/tap assertion is followed by the visible Back control before the next Hero-space assertion. No original checks were removed.', '',
    '## Observations', '',
    `- Performance sample: ${observations.performance ? `${observations.performance.fps.toFixed(2)} FPS; ${observations.performance.frameMs.toFixed(2)} ms; ${observations.performance.calls} renderer calls; ${observations.performance.triangles} rendered triangles` : 'unavailable'}.`,
    '- The controlled GLB-404 scenario intentionally generates one browser resource error; it is not a normal-mode failure.',
    '- Non-blocking dependency/browser warnings are retained in the JSON log: THREE.Clock deprecation on Canvas mount, and software-renderer ReadPixels warnings during screenshots.',
    '- Mobile checks use accurate synthetic finger coordinates; this verifies touch event wiring, not final finger-sized target usability.', '',
    '| Check | Result |', '| --- | --- |',
    ...checks.map((item) => `| ${item.name} | ${item.passed ? 'PASS' : 'FAIL'} |`), '',
    'Detailed snapshots, frame/renderer readings, console output, and failure evidence: `browser_validation.json`.', '',
    ...checks.filter((item) => !item.passed).map((item) => `## ${item.name}\n\n\`\`\`\n${item.error}\n\`\`\`\n`),
  ].join('\n'));
  process.stdout.write(`RESULT ${result.summary.passed} passed; ${result.summary.failed} failed\n`);
  if (result.summary.failed > 0) process.exitCode = 1;
}
