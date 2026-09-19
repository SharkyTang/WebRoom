import { chromium } from '@playwright/test';
import { tsImport } from 'tsx/esm/api';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const { assetFamilies, assetManifest } = await tsImport('../lib/room/assets/assetManifest.ts', import.meta.url);
const output = process.env.ROOM_TEST_OUTPUT ?? 'validation/v06-fix/performance';
const origin = process.env.ROOM_TEST_URL ?? 'http://127.0.0.1:3000';
const widths = process.env.ROOM_PERF_WIDTHS?.split(',').map(Number) ?? [1440,768,390];
assert(widths.length && new Set(widths).size===widths.length && widths.every(w=>[1440,768,390].includes(w)));
await fs.mkdir(output, { recursive: true });
const target = path.join(output, 'performance.json');
await fs.access(target).then(() => { throw Error('Refusing to overwrite performance evidence'); }, error => { if (error.code !== 'ENOENT') throw error; });
const models = await Promise.all(assetFamilies.map(async id => { const bytes = await fs.readFile(`public${assetManifest[id].url}`); return { id, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }; }));
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const samples = [], errors = [];
const snap = page => page.evaluate(() => window.__ROOM_DEBUG__.snapshot());
const wait = (page, id) => page.waitForFunction(id => { const s = window.__ROOM_DEBUG__?.snapshot().interaction; return s && s.activeObject === id && !s.isCameraBusy && (id ? s.interactionPhase === 'focused' : ['idle', 'hovering'].includes(s.interactionPhase)); }, id);
const median = values => [...values].sort((a,b) => a-b)[Math.floor(values.length/2)];
try {
  // Serial measurements only: do not run other browser suites/builds alongside this script.
  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 900 : width === 768 ? 1024 : 844 }, deviceScaleFactor: 1, isMobile: width === 390, hasTouch: width === 390 });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(`${origin}/?debug=1`);
    await page.waitForSelector('[data-room-status="ready"]', { timeout: 90000 });
    const initial = await snap(page); assert.equal(initial.assembly.installedFamilies.length, 40); assert(initial.assembly.ok);
    for (let run = 0; run < 3; run++) {
      const entry = { width, run, views: {}, hero: initial.camera };
      for (const id of [null, 'piano', 'trashcan']) {
        if (id) { await page.getByRole('combobox', { name: 'Explore objects' }).selectOption(id); await wait(page, id); }
        await page.mouse.move(0, 0); await page.waitForTimeout(1600);
        const before = await snap(page); const start = performance.now(); await page.waitForTimeout(4000); const after = await snap(page);
        entry.views[id ?? 'hero'] = { intervalMs: (performance.now()-start)/(after.renderFrames-before.renderFrames), performance: after.performance, memory: after.rendererMemory, textures: Object.values(after.assetVisuals).flatMap(x => x.textures).length };
        if (id) { await page.getByRole('button', { name: 'Back', exact: true }).click(); await wait(page, null); assert.deepEqual((await snap(page)).camera, initial.camera); }
      }
      samples.push(entry); console.log(`Measured ${width}px run ${run+1}/3`);
    }
    await page.screenshot({ path: path.join(output, `hero-${width}.png`), style: '.debug-panel{visibility:hidden}' });
    await context.close();
  }
} finally {
  await browser.close();
  const medians = Object.fromEntries(widths.map(width => [width, Object.fromEntries(['hero','piano','trashcan'].map(view => [view, median(samples.filter(s=>s.width===width).map(s=>s.views[view].intervalMs))]))]));
  await fs.writeFile(target, JSON.stringify({ at: new Date().toISOString(), origin, conditions: 'Chrome headless ANGLE SwiftShader, DPR1, original quality, continuous development diagnostics; 3 serial runs, 4s/view after warmup. Not hardware GPU FPS.', models, samples, medians, errors }, null, 2));
}
assert.deepEqual(errors, []); assert.equal(samples.length, widths.length*3);
