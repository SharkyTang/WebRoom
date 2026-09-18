/** Read-only, exact C surface signatures. Ignores only mathematically zero-area triangles. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { tsImport } from 'tsx/esm/api';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
function option(name) {
  const at = args.indexOf(name);
  if (at < 0) return null;
  if (!args[at + 1] || args[at + 1].startsWith('--')) throw new Error(`Missing ${name} value`);
  return args[at + 1];
}
const output = option('--output'), baselinePath = option('--baseline');
if (args.some(value => value.startsWith('--') && !['--output', '--baseline'].includes(value))) throw new Error('Usage: node scripts/assets/compare-decor-visible-geometry.mjs [--baseline prior.json] [--output new.json]');
const { assetManifest, decorFamilies } = await tsImport('../../lib/room/assets/assetManifest.ts', import.meta.url);
if (decorFamilies.length !== 13) throw new Error('This audit requires all thirteen C families');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const componentBytes = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const typeWidth = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
const sortedJson = value => JSON.stringify(value, (_, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v);
const multiHash = values => sha(Buffer.from(values.sort().join('\n')));
function triangleHash(vertices) {
  // Cyclic rotations preserve winding and each vertex's complete attribute tuple.
  const variants = [0, 1, 2].map(offset => Buffer.concat([vertices[offset], vertices[(offset + 1) % 3], vertices[(offset + 2) % 3]]));
  variants.sort(Buffer.compare);
  return sha(variants[0]);
}
const families = [];
for (const family of decorFamilies) {
  const file = `public${assetManifest[family].url}`, bytes = await fs.readFile(path.join(project, file));
  if (bytes.toString('ascii', 0, 4) !== 'glTF' || bytes.readUInt32LE(8) !== bytes.length) throw new Error(`Invalid GLB ${file}`);
  let gltf, bin;
  for (let offset = 12; offset < bytes.length;) {
    const size = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4), chunk = bytes.subarray(offset + 8, offset + 8 + size);
    if (type === 0x4e4f534a) gltf = JSON.parse(chunk.toString('utf8'));
    if (type === 0x004e4942) bin = chunk;
    offset += 8 + size;
  }
  if (!gltf || !bin) throw new Error(`Missing chunks ${file}`);
  const accessor = index => {
    const record = gltf.accessors[index], view = gltf.bufferViews[record.bufferView];
    if (record.sparse || view.buffer !== 0) throw new Error('Unsupported sparse/external accessor');
    const width = componentBytes[record.componentType] * typeWidth[record.type];
    const start = (view.byteOffset ?? 0) + (record.byteOffset ?? 0), stride = view.byteStride ?? width;
    return { record, rows: Array.from({ length: record.count }, (_, i) => bin.subarray(start + i * stride, start + i * stride + width)) };
  };
  const nodes = [], primitives = [];
  function visit(index, parentPath) {
    const node = gltf.nodes[index], nodePath = [...parentPath, node.name ?? '(unnamed)'];
    const nodeKey = nodePath.join('/');
    if (nodes.some(entry => entry.path === nodeKey)) throw new Error(`Duplicate node path ${nodeKey}`);
    nodes.push({ path: nodeKey, translation: node.translation ?? [0, 0, 0], rotation: node.rotation ?? [0, 0, 0, 1], scale: node.scale ?? [1, 1, 1], matrix: node.matrix ?? null });
    if (node.mesh !== undefined) for (const [pi, primitive] of gltf.meshes[node.mesh].primitives.entries()) {
      if ((primitive.mode ?? 4) !== 4) throw new Error('Triangle primitives only');
      const attributes = Object.fromEntries(Object.entries(primitive.attributes).sort(([a], [b]) => a.localeCompare(b)).map(([name, ai]) => [name, accessor(ai)]));
      if (!attributes.POSITION || !attributes.NORMAL || !attributes.TEXCOORD_0) throw new Error(`Missing PBR geometry attributes: ${nodeKey}`);
      if (attributes.POSITION.record.componentType !== 5126 || attributes.POSITION.record.type !== 'VEC3') throw new Error('POSITION must be FLOAT VEC3');
      const ind = accessor(primitive.indices);
      const indices = ind.rows.map(row => ind.record.componentType === 5125 ? row.readUInt32LE() : ind.record.componentType === 5123 ? row.readUInt16LE() : ind.record.componentType === 5121 ? row.readUInt8() : (() => { throw new Error('Bad index type'); })());
      const hashes = [], attributeHashes = Object.fromEntries(Object.keys(attributes).map(key => [key, []]));
      let exactDegenerateTriangles = 0;
      for (let ti = 0; ti < indices.length; ti += 3) {
        const ids = indices.slice(ti, ti + 3);
        const points = ids.map(id => [0, 4, 8].map(offset => attributes.POSITION.rows[id].readFloatLE(offset)));
        if (!points.flat().every(Number.isFinite)) throw new Error('Nonfinite position');
        const u = points[1].map((v, axis) => v - points[0][axis]), v = points[2].map((value, axis) => value - points[0][axis]);
        const cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
        if (cross.every(value => value === 0)) { exactDegenerateTriangles++; continue; }
        hashes.push(triangleHash(ids.map(id => Buffer.concat(Object.values(attributes).map(attr => attr.rows[id])))));
        for (const [name, attr] of Object.entries(attributes)) attributeHashes[name].push(triangleHash(ids.map(id => attr.rows[id])));
      }
      const material = gltf.materials[primitive.material];
      primitives.push({ key: `${nodeKey}#${pi}`, materialName: material.name, materialSignature: sha(sortedJson(material)), attributes: Object.fromEntries(Object.entries(attributes).map(([name, attr]) => [name, { type: attr.record.type, componentType: attr.record.componentType, normalized: attr.record.normalized ?? false }])), totalTriangles: indices.length / 3, exactDegenerateTriangles, retainedTriangles: hashes.length, retainedTriangleAttributeMultisetSHA256: multiHash(hashes), separateAttributeTriangleMultisetSHA256: Object.fromEntries(Object.entries(attributeHashes).map(([name, values]) => [name, multiHash(values)])) });
    }
    for (const child of node.children ?? []) visit(child, nodePath);
  }
  for (const root of gltf.scenes[gltf.scene ?? 0].nodes) visit(root, []);
  families.push({ family, file, glbSHA256: sha(bytes), bytes: bytes.length, nodeTransforms: nodes.sort((a, b) => a.path.localeCompare(b.path)), primitives: primitives.sort((a, b) => a.key.localeCompare(b.key)), retainedTriangles: primitives.reduce((sum, entry) => sum + entry.retainedTriangles, 0), exactDegenerateTriangles: primitives.reduce((sum, entry) => sum + entry.exactDegenerateTriangles, 0) });
}
let comparison = null;
if (baselinePath) {
  const prior = JSON.parse(await fs.readFile(path.resolve(baselinePath), 'utf8'));
  const differences = [];
  for (const now of families) {
    const old = prior.families.find(entry => entry.family === now.family);
    if (!old) { differences.push({ family: now.family, reason: 'Missing baseline' }); continue; }
    if (sortedJson(now.nodeTransforms) !== sortedJson(old.nodeTransforms)) differences.push({ family: now.family, reason: 'Node identity/transform mismatch' });
    const comparable = p => ({ key: p.key, materialName: p.materialName, materialSignature: p.materialSignature, attributes: p.attributes, retainedTriangles: p.retainedTriangles, retainedTriangleAttributeMultisetSHA256: p.retainedTriangleAttributeMultisetSHA256 });
    if (sortedJson(now.primitives.map(comparable)) !== sortedJson(old.primitives.map(comparable))) differences.push({ family: now.family, reason: 'Retained surface/material/attribute mismatch', primitives: now.primitives.filter(p => { const before = old.primitives.find(entry => entry.key === p.key); return !before || sortedJson(comparable(p)) !== sortedJson(comparable(before)); }).map(p => ({ key: p.key, before: old.primitives.find(entry => entry.key === p.key), after: p })) });
  }
  if (prior.families.length !== families.length) differences.push({ reason: 'Family count mismatch' });
  comparison = { baseline: path.resolve(baselinePath), allRetainedSurfacesExactlyUnchanged: differences.length === 0, differences, normalToleranceUsed: 0 };
}
const result = { generatedAt: new Date().toISOString(), method: 'Actual GLB. Ignore strictly zero POSITION cross product only; hash all retained triangle attribute tuples, preserving winding, material, node paths and transforms. Triangle order and cyclic corner rotations may differ. Exact binary float equality, no normal rounding tolerance or area epsilon; any mismatch requires explicit review.', families, comparison };
const json = JSON.stringify(result, null, 2) + '\n';
if (output) await fs.writeFile(path.resolve(output), json, { flag: 'wx' }); else process.stdout.write(json);
if (output) process.stdout.write(JSON.stringify({ output, families: families.length, retainedTriangles: families.reduce((sum, f) => sum + f.retainedTriangles, 0), exactDegenerateTriangles: families.reduce((sum, f) => sum + f.exactDegenerateTriangles, 0), comparison }) + '\n');
if (comparison && !comparison.allRetainedSurfacesExactlyUnchanged) process.exitCode = 1;
