import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'validation');
const origin = process.env.ROOM_TEST_URL ?? 'http://localhost:3001';
const checks = [];
const consoleMessages = [];
const failedRequests = [];
const glbResponses = [];
await fs.mkdir(output, { recursive: true });

async function check(name, callback) {
  try {
    const details = await callback();
    checks.push({ name, passed: true, ...details });
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    checks.push({ name, passed: false, error: String(error?.stack ?? error) });
    process.stdout.write(`FAIL ${name}\n`);
  }
}

function observe(page, phase) {
  page.on('console', (message) => consoleMessages.push({ phase, type: message.type(), text: message.text() }));
  page.on('pageerror', (error) => consoleMessages.push({ phase, type: 'pageerror', text: error.message }));
  page.on('requestfailed', (request) => failedRequests.push({ phase, url: request.url(), error: request.failure()?.errorText }));
  page.on('response', (response) => {
    if (response.status() >= 400) failedRequests.push({ phase, url: response.url(), status: response.status() });
    if (response.url().endsWith('/models/sharkys_room_blockout_FINAL.glb')) glbResponses.push({ phase, status: response.status(), url: response.url() });
  });
}

async function layout(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const bounds = canvas?.getBoundingClientRect();
    return {
      width: innerWidth,
      height: innerHeight,
      scrollWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
      canvas: bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : null,
      hasDebugApi: Boolean(window.__ROOM_DEBUG__),
      text: document.body.innerText,
    };
  });
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  observe(page, 'production-desktop');

  await check('Production desktop starts, loads GLB, and renders the ready state', async () => {
    const response = await page.goto(origin, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    await page.waitForSelector('[data-room-status="ready"]', { timeout: 60_000 });
    const result = await layout(page);
    assert(result.canvas?.width > 0 && result.canvas?.height > 0);
    assert(result.scrollWidth <= 1441);
    assert.equal(result.hasDebugApi, false);
    await page.screenshot({ path: path.join(output, 'web_production_1440.png') });
    return result;
  });

  await check('Production ignores ?debug=1 and exposes no developer-only API/panel', async () => {
    await page.goto(`${origin}/?debug=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-room-status="ready"]', { timeout: 60_000 });
    const result = await layout(page);
    assert.equal(result.hasDebugApi, false);
    assert.equal(await page.locator('.debug-panel').count(), 0);
    assert(!/renderer calls|frame ms|node validation|development diagnostics/i.test(result.text), result.text);
    return result;
  });

  await check('Production desktop remains fixed after drag, wheel, and WASD input', async () => {
    const before = await page.locator('canvas').screenshot();
    const canvas = await page.locator('canvas').boundingBox();
    assert(canvas);
    const x = canvas.x + canvas.width * 0.5;
    const y = canvas.y + canvas.height * 0.8;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 100, y - 70, { steps: 10 });
    await page.mouse.up();
    await page.mouse.wheel(0, 240);
    await page.keyboard.press('w');
    await page.keyboard.press('a');
    await page.keyboard.press('s');
    await page.keyboard.press('d');
    // Hover state may affect cursor/UI; neither may modify the rendered frozen scene.
    await page.mouse.move(0, 0);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const after = await page.locator('canvas').screenshot();
    assert(before.equals(after), 'Canvas pixels changed after controls that must not move the frozen camera');
    return { comparedCanvasBytes: before.length, identical: true };
  });

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const mobile = await mobileContext.newPage();
  observe(mobile, 'production-mobile');
  await check('Production 390px mobile displays the room without overflow or diagnostics', async () => {
    const response = await mobile.goto(origin, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    await mobile.waitForSelector('[data-room-status="ready"]', { timeout: 60_000 });
    const result = await layout(mobile);
    assert.equal(result.width, 390);
    assert(result.scrollWidth <= 391);
    assert(result.canvas?.width > 0 && result.canvas?.height > 0);
    assert.equal(result.hasDebugApi, false);
    await mobile.screenshot({ path: path.join(output, 'web_production_390.png') });
    return result;
  });

  await check('Production has successful asset responses and no browser runtime errors', async () => {
    assert(glbResponses.length >= 2, 'Desktop and mobile must both request the real GLB');
    assert(glbResponses.every(({ status }) => status === 200));
    const errors = consoleMessages.filter(({ type }) => type === 'error' || type === 'pageerror');
    assert.deepEqual(errors, [], JSON.stringify(errors));
    assert.deepEqual(failedRequests, [], JSON.stringify(failedRequests));
    return { glbResponses, consoleErrors: 0, failedRequests: 0 };
  });
} finally {
  await browser.close();
  const summary = { passed: checks.filter(({ passed }) => passed).length, failed: checks.filter(({ passed }) => !passed).length };
  await fs.writeFile(path.join(output, 'production_smoke.json'), JSON.stringify({
    generatedAt: new Date().toISOString(), origin,
    browser: 'Installed Google Chrome, Playwright headless, ANGLE SwiftShader',
    summary, checks, consoleMessages, failedRequests, glbResponses,
  }, null, 2) + '\n');
  process.stdout.write(`RESULT ${summary.passed} passed; ${summary.failed} failed\n`);
  if (summary.failed > 0) process.exitCode = 1;
}
