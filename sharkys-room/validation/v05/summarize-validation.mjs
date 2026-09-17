import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Records existing completed runs and independently rechecks delivery integrity.
// This does not replace running the commands listed in ASSET_PIPELINE_GUIDE.md.
const out = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(out, '../..');
const read = p => fs.readFileSync(path.resolve(root, p));
const json = p => JSON.parse(read(p).toString());
const digest = p => ({ path: p, bytes: read(p).length, sha256: createHash('sha256').update(read(p)).digest('hex') });
const expectedSource = {
  '../blockout_FINAL/sharkys_room_blockout_FINAL.blend': 'fbf6ed79e728867947fb293b9ebb70d314c2289517e9837cc3085f69fe334720',
  '../blockout_FINAL/sharkys_room_blockout_FINAL.glb': 'f34b3c665ba7b08e583325bef5e3c2024f45e43ebb12a6735aa3b13a97758da2',
  'public/models/sharkys_room_blockout_FINAL.glb': 'f34b3c665ba7b08e583325bef5e3c2024f45e43ebb12a6735aa3b13a97758da2',
  'lib/room/frozenSceneManifest.json': '84b793cdaba786d647ccde41e4c653ef64a4bcf3d0afd9d693f49a0064521f53',
};
const frozen = Object.entries(expectedSource).map(([file, expected]) => {
  const actual = digest(file); assert.equal(actual.sha256, expected); return { ...actual, matchesBaseline: true };
});
const families = ['monitor', 'macbook', 'marshall'].map(id => {
  const stats = json(`assets-source/${id}/asset-statistics.json`);
  const glb = digest(`public/models/production/${id}_pilot.glb`);
  const blend = digest(`blender-assets/${id}_pilot.blend`);
  assert.equal(glb.bytes, stats.glbBytes); assert.equal(glb.sha256, stats.glbSHA256);
  assert.equal(blend.bytes, stats.blendBytes); assert(Object.values(stats.roundtripChecks).every(Boolean));
  return { id, glb, blend, triangles: stats.triangles, primitives: stats.gltfPrimitives, materials: stats.materialCount, roundtripChecks: stats.roundtripChecks };
});
const browserPaths = [
  'v03-regression/browser_validation.json', 'v04-regression/interaction_browser.json',
  'piano/piano-browser.json', 'production/production_smoke.json', 'piano/piano-production.json',
  'production-assets-browser.json', 'production-assets-production.json', 'performance/production-assets-browser.json',
];
const browser = browserPaths.map(file => {
  const data = json(`validation/v05/${file}`);
  assert.equal(data.summary.failed, 0); assert(data.summary.passed > 0);
  return { evidence: file, generatedAt: data.generatedAt, ...data.summary };
});
const unitLog = read('validation/v05/unit-tests.log').toString();
const unitTests = Number(unitLog.match(/ℹ tests (\d+)/)?.[1]);
assert.equal(unitTests, 100); assert.match(unitLog, /ℹ fail 0/);
const sourceLog = read('validation/v05/verify-asset.log').toString();
assert.match(sourceLog, /"passedChecks": 361/); assert.match(sourceLog, /"failedChecks": \[\]/);
assert.match(read('validation/v05/build.log').toString(), /Finalizing page optimization/);
const baselineHead = '7dfed76ec317ecfabc229826fb85255bb2051fc5';
const untouched = [
  'lib/room/frozenSceneManifest.json', 'lib/room/focusViews.ts', 'lib/room/interactiveObjects.ts',
  'lib/room/animationConstants.ts', 'lib/room/interactionState.ts', 'lib/room/pianoInteraction.ts',
  'components/room/PianoRetractedHitArea.tsx', 'lib/room/cameraAnimation.ts',
];
execFileSync('git', ['diff', '--exit-code', baselineHead, '--', ...untouched], { cwd: root });
const oldLock = JSON.parse(execFileSync('git', ['show', `${baselineHead}:sharkys-room/package-lock.json`], { cwd: root, encoding: 'utf8' }));
const newLock = json('package-lock.json');
oldLock.version = newLock.version; oldLock.packages[''].version = newLock.packages[''].version;
assert.deepEqual(newLock, oldLock, 'Dependency lock may change only the project version');
const summary = {
  recordedAt: new Date().toISOString(), baselineHead,
  status: 'v0.5 TECHNICAL COMPLETE; VISUAL REVIEW PENDING USER CONFIRMATION',
  frozen, unchangedCode: untouched, unchangedDependencyLockExceptProjectVersion: true,
  families, totalAssetTriangles: families.reduce((n, a) => n + a.triangles, 0),
  totalAssetNetworkBytes: families.reduce((n, a) => n + a.glb.bytes, 0),
  verifyAssetPassed: 361, unitTestsPassed: unitTests, typecheckExitCode: 0, buildExitCode: 0,
  browser, browserPassed: browser.reduce((n, s) => n + s.passed, 0), browserFailed: 0,
  performance: json('validation/v05/performance/production-assets-browser.json').checks.filter(c => c.current),
  video: { ...digest('validation/v05/v05_interactions.mp4'), durationSeconds: 38.60, width: 1440, height: 900, codec: 'H.264', fps: 25 },
  limits: ['Headless Chrome 152 / ANGLE SwiftShader / DPR1', '390px touch emulation, not a physical phone', 'Safari and hardware GPU not tested', 'frameMs is observed frame interval, not GPU time'],
};
assert.equal(summary.browserPassed, 120);
assert(summary.totalAssetTriangles <= 60000); assert(summary.totalAssetNetworkBytes <= 5000000);
fs.writeFileSync(path.join(out, 'verification-summary.json'), JSON.stringify(summary, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'command-results.txt'), [
  `Final verification recorded: ${summary.recordedAt}`,
  `Baseline: ${baselineHead}; working tree was clean before v0.5`,
  'npm run verify:asset — 361 passed; 0 failed; exit 0',
  'npm run typecheck — exit 0',
  'npm test — 100 passed; 0 failed; exit 0',
  'npm run build — exit 0; production process restarted on 3001',
  ...browser.map(s => `${s.evidence} — ${s.passed} passed; ${s.failed} failed; exit 0`),
  'node scripts/assets/inspect_export_contract.mjs — upright screen UVs; exit 0',
  'node --check scripts/assets/build-assets.mjs — exit 0',
  'git diff --check — exit 0',
  'One piano development attempt timed out during code hot updates; final full dev and production reruns passed.',
  'Read verification-summary.json for hashes, payloads and isolated performance; frameMs is not GPU time.',
].join('\n') + '\n');
console.log(`Verified ${frozen.length} frozen files, ${families.length} asset families, ${unitTests} unit and ${summary.browserPassed} browser checks.`);
