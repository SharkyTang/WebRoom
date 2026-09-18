/** Actual unmodified production webpage: a short, reproducible native-input piano clip. */
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const output = process.env.ROOM_TEST_OUTPUT ?? 'validation/v06c/piano-short';
const evidence = JSON.parse(await fs.readFile(process.env.ROOM_C_DEV_EVIDENCE ?? 'validation/v06c/all/collection-decor-browser.json', 'utf8'));
assert.equal(evidence.summary.failed, 0);
await fs.mkdir(output, { recursive: true });
await fs.access(path.join(output, 'recording.json')).then(() => { throw new Error('Choose an unused recording folder'); }, error => { if (error.code !== 'ENOENT') throw error; });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, recordVideo: { dir: path.join(output, 'raw'), size: { width: 1440, height: 900 } } });
const page = await context.newPage(), video = page.video(), events = [], errors = [];
page.on('pageerror', error => errors.push(error.message));
const time = async action => { events.push({ action, atMs: await page.evaluate(() => performance.now()) }); };
let failure = null;
try {
  await page.goto(process.env.ROOM_TEST_URL ?? 'http://127.0.0.1:3004');
  await page.waitForSelector('[data-room-status="ready"]');
  for (const family of evidence.families) await page.waitForSelector(`[data-asset-${family}="installed"]`);
  assert.equal(await page.evaluate(() => Boolean(window.__ROOM_DEBUG__ || window.__ROOM_INSPECTION__)), false);
  await page.waitForTimeout(700);
  const original = evidence.observations.viewports[1440].piano.initialTarget.point;
  await time('Click original extended piano'); await page.mouse.click(original.x, original.y);
  await page.waitForSelector('[data-interaction-phase="focused"]'); await page.getByText('Piano: extended', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Toggle piano', exact: true }).click();
  await page.getByText('Piano: retracted', { exact: true }).waitFor();
  await time('Piano retracted'); await page.screenshot({ path: path.join(output, '01-retracted.png') });
  await page.getByRole('button', { name: 'Back', exact: true }).click(); await page.waitForSelector('[data-interaction-phase="idle"]');
  await time('Back to original Hero');
  const underdesk = evidence.observations.viewports[1440].piano.cycles[0].target.point;
  await page.mouse.move(underdesk.x, underdesk.y); await page.locator('.page-footer p').filter({ hasText: 'Pull-out Piano' }).waitFor();
  await page.waitForTimeout(900); await page.screenshot({ path: path.join(output, '02-underdesk-hover.png') });
  await time('Click natural underdesk location without selector'); await page.mouse.click(underdesk.x, underdesk.y);
  await page.waitForSelector('[data-interaction-phase="focused"]'); await page.getByText('Piano: extended', { exact: true }).waitFor();
  await time('Piano reopened'); await page.screenshot({ path: path.join(output, '03-reopened.png') });
  await page.waitForTimeout(900); await page.getByRole('button', { name: 'Back', exact: true }).click(); await page.waitForSelector('[data-interaction-phase="idle"]');
  await page.mouse.move(0, 0); await page.waitForTimeout(500); assert.deepEqual(errors, []);
} catch (error) { failure = String(error.stack ?? error); }
finally { await context.close(); await browser.close(); }
const raw = await video.path(), target = path.join(output, 'v06c-piano-underdesk-reopen.mp4');
const result = spawnSync('/opt/homebrew/bin/ffmpeg', ['-n', '-i', raw, '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', target], { encoding: 'utf8' });
assert.equal(result.status, 0, result.stderr);
await fs.writeFile(path.join(output, 'recording.json'), JSON.stringify({ productionUrl: process.env.ROOM_TEST_URL ?? 'http://127.0.0.1:3004', passed: !failure, failure, events, errors, families: evidence.families, video: target, method: 'Unmodified production page; real mouse and buttons; underdesk coordinate previously verified by native dev raycast; no selector or synthetic state commands; no inspection camera.' }, null, 2) + '\n');
if (failure) throw new Error(failure);
console.log('PASS short production piano retraction / Back / natural underdesk reopen');
