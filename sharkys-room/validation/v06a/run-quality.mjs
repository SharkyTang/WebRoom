import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const output = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(output, '../..');
const results = [];
for (const [name, args] of [
  ['verify-asset', ['run', 'verify:asset']],
  ['typecheck', ['run', 'typecheck']],
  ['unit-tests', ['test']],
  ['production-build', ['run', 'build']],
]) {
  const startedAt = new Date().toISOString();
  const result = spawnSync('npm', args, { cwd: root, encoding: 'utf8' });
  fs.writeFileSync(path.join(output, `${name}.log`), `${result.stdout ?? ''}${result.stderr ?? ''}${result.error ?? ''}`);
  results.push({ name, command: 'npm', args, startedAt, finishedAt: new Date().toISOString(), exitCode: result.status });
  fs.writeFileSync(path.join(output, 'quality-results.json'), JSON.stringify(results, null, 2) + '\n');
  console.log(`${name}: exit ${result.status}`);
  if (result.status !== 0) { console.log((result.stdout + result.stderr).slice(-6000)); process.exitCode = 1; break; }
}
