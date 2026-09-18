import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const groups = {
  build_architecture_assets: ['floor', 'desk', 'walls', 'door', 'window', 'curtains', 'cabinet'],
  build_furniture_assets: ['bed', 'bedside', 'sofa', 'chair', 'coffee', 'sidetable', 'beanbag', 'rugs', 'dogbed'],
};
const all = Object.values(groups).flat();
const requested = process.argv.slice(2);
const selected = requested.length ? [...new Set(requested)] : all;
if (selected.some(id => !all.includes(id))) throw new Error(`Expected one or more v0.6A families: ${all.join(', ')}`);
const blender = process.env.BLENDER_BIN ?? (existsSync('/Applications/Blender.app/Contents/MacOS/Blender') ? '/Applications/Blender.app/Contents/MacOS/Blender' : 'blender');
for (const [script, families] of Object.entries(groups)) {
  const batch = selected.filter(id => families.includes(id));
  if (!batch.length) continue;
  const result = spawnSync(blender, ['--background', '--factory-startup', '--python-exit-code', '1', '--python', path.join(project, `scripts/assets/${script}.py`), '--', ...batch], { cwd: project, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) { process.exitCode = result.status ?? 1; break; }
}
