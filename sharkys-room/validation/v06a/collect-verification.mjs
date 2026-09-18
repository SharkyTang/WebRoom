import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const output = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(output, '../..');
const read = async file => JSON.parse(await fs.readFile(path.join(output, file), 'utf8'));
const quality = await read('quality-results.json');
assert(quality.every(run => run.exitCode === 0));
const suites = [];
for (const [command, file] of [
  ['npm run test:browser', 'v03-regression/browser_validation.json'],
  ['npm run test:interactions', 'v04-regression/interaction_browser.json'],
  ['ROOM_PIANO_CYCLES=20 npm run test:piano', 'piano/piano-browser.json'],
  ['npm run test:assets', 'v05-assets/production-assets-browser.json'],
  ['npm run test:production', 'production/production_smoke.json'],
  ['ROOM_TEST_PRODUCTION=1 npm run test:piano', 'piano/piano-production.json'],
  ['ROOM_TEST_PRODUCTION=1 npm run test:assets', 'v05-assets/production-assets-production.json'],
  ['npm run test:furniture', 'furniture-browser.json'],
  ['ROOM_TEST_PRODUCTION=1 npm run test:furniture', 'furniture-production.json'],
  ['ROOM_FURNITURE_PERFORMANCE_ONLY=1 npm run test:furniture', 'furniture-performance.json'],
]) {
  const result = await read(file);
  assert.equal(result.summary.failed, 0, file);
  assert(result.summary.passed > 0, file);
  suites.push({ command, evidence: file, generatedAt: result.generatedAt, ...result.summary });
}
const piano = await read('piano/piano-browser.json');
assert.equal(piano.observations.cycles.length, 20, 'The final suite must include twenty complete native cycles');
const pianoRun = await read('piano/final-run.json');
assert.equal(pianoRun.exitCode, 0);
for (const [file, expected] of [
  ['tests/piano-discoverability-browser.mjs', pianoRun.testScriptSHA256],
  ['lib/room/assets/assetAssembly.ts', pianoRun.runtimeAssemblySHA256],
]) assert.equal(createHash('sha256').update(await fs.readFile(path.join(root, file))).digest('hex'), expected, file);
const coldComparisons = await read('piano-stable-short-runs.json');
assert.equal(coldComparisons.runs.length, 3);
for (const run of coldComparisons.runs) {
  assert.equal(run.exitCode, 0);
  assert.equal(run.debugGL.attributes.antialias, true);
  assert.equal(run.normalGL.attributes.antialias, true);
  assert.equal(run.pairs.length, 4);
  for (const pair of run.pairs) {
    assert.equal(pair.pngBytesEqual, true);
    assert.equal(pair.rgbaEqual, true);
  }
}
const budget = await read('asset-budget-ledger.json');
const exports = [];
for (const asset of budget.assets) {
  const bytes = await fs.readFile(path.join(root, asset.file));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, asset.file);
  for (const file of [`blender-assets/${asset.family}_v06a.blend`, `assets-source/v06a/${asset.family}/ASSET_SPEC.md`, `assets-source/v06a/${asset.family}/asset-statistics.json`]) assert((await fs.stat(path.join(root, file))).size > 0, file);
  exports.push({ family: asset.family, sha256: asset.sha256, bytes: bytes.length });
}
const protectedInputs = await read('protected-inputs-final.json');
for (const file of protectedInputs.files) {
  const bytes = await fs.readFile(path.join(root, file.path));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path);
}
const protectedWebContracts = [];
const gitPrefix = execFileSync('git', ['rev-parse', '--show-prefix'], { cwd: root, encoding: 'utf8' }).trim();
for (const file of [
  'components/room/RoomCanvas.tsx', 'components/room/RoomScene.tsx', 'components/room/HeroCamera.tsx',
  'components/room/CameraController.tsx', 'components/room/PianoRetractedHitArea.tsx',
  'components/room/InteractionManager.tsx', 'components/room/InteractionOverlay.tsx',
  'lib/room/pianoInteraction.ts', 'lib/room/focusViews.ts', 'lib/room/interactiveObjects.ts',
  'lib/room/mechanisms.ts', 'lib/room/cameraAnimation.ts', 'lib/room/animationConstants.ts',
  'lib/room/interactionState.ts', 'lib/room/sceneConstants.ts',
]) {
  const bytes = await fs.readFile(path.join(root, file));
  const baseline = execFileSync('git', ['show', `9cf802250b5823ef1b30fc7ab4f45d3265496ccc:${gitPrefix}${file}`], { cwd: root });
  assert(bytes.equals(baseline), file);
  protectedWebContracts.push({ path: file, sha256: createHash('sha256').update(bytes).digest('hex'), unchanged: true });
}
await fs.writeFile(path.join(output, 'protected-web-contracts-final.json'), JSON.stringify(protectedWebContracts, null, 2) + '\n');
for (const file of ['hero_before.png', 'hero_after.png', 'workstation_piano_extended.png', 'workstation_piano_retracted.png', 'piano_reopen_from_desk.png', 'cabinet_compartments.png', 'furniture_seating_bed.png', 'mobile_390.png', 'interaction_regression.mp4']) assert((await fs.stat(path.join(output, file))).size > 0, file);
const summary = { generatedAt: new Date().toISOString(), status: 'v0.6A TECHNICAL COMPLETE; VISUAL REVIEW PENDING USER CONFIRMATION; B/C NOT STARTED', quality, suites, browserChecks: suites.reduce((n, suite) => n + suite.passed, 0), twentyPianoCycles: true, strictAntialiasedColdComparisons: 12, protectedInputsUnchanged: protectedInputs.files.length, protectedWebContracts, exports, budget: budget.totals, history: 'Earlier failed attempts and diagnosis are retained separately. This index points to the final accepted result JSONs, not to superseded runner metadata.' };
await fs.writeFile(path.join(output, 'verification-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ status: summary.status, browserChecks: summary.browserChecks, assets: exports.length, protectedInputs: summary.protectedInputsUnchanged }, null, 2));
