import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const output = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(output, '../..'), production = process.argv.includes('--production');
const tasks = production ? [
  ['production', 'test:production', 'production', {}],
  ['piano-production', 'test:piano', 'piano', { ROOM_TEST_PRODUCTION: '1' }],
  ['v05-assets-production', 'test:assets', 'v05-assets', { ROOM_TEST_PRODUCTION: '1', ROOM_ASSET_DEV_EVIDENCE: path.join(output, 'v05-assets/production-assets-browser.json') }],
] : [
  ['piano-development', 'test:piano', 'piano', { ROOM_PIANO_CYCLES: '20' }],
  ['v03-regression', 'test:browser', 'v03-regression', {}],
  ['v04-regression', 'test:interactions', 'v04-regression', {}],
  ['v05-assets-development', 'test:assets', 'v05-assets', {}],
];
const results = [];
for (const [name, script, directory, env] of tasks.filter(task => !process.argv.includes('--remaining-development') || task[0] !== 'piano-development')) {
  const startedAt = new Date().toISOString();
  const result = spawnSync('npm', ['run', script], { cwd: root, env: { ...process.env, ROOM_TEST_OUTPUT: path.join(output, directory), ...env }, encoding: 'utf8' });
  fs.writeFileSync(path.join(output, `${name}.log`), `${result.stdout ?? ''}${result.stderr ?? ''}${result.error ?? ''}`);
  results.push({ name, script, output: directory, env, startedAt, finishedAt: new Date().toISOString(), exitCode: result.status });
  fs.writeFileSync(path.join(output, production ? 'production-regression-results.json' : process.argv.includes('--remaining-development') ? 'remaining-development-results.json' : 'development-regression-results.json'), JSON.stringify(results, null, 2) + '\n');
  console.log(`${name}: exit ${result.status}`);
  if (result.status !== 0) { console.log((result.stdout + result.stderr).slice(-7000)); process.exitCode = 1; break; }
}
