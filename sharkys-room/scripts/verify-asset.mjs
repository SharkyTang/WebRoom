import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const manifest = JSON.parse(await readFile(new URL('../lib/room/frozenSceneManifest.json', import.meta.url), 'utf8'));
const assetURL = new URL('../public/models/sharkys_room_blockout_FINAL.glb', import.meta.url);
const originalURL = new URL('../../blockout_FINAL/sharkys_room_blockout_FINAL.glb', import.meta.url);
const digest = (buffer) => createHash('sha256').update(buffer).digest('hex');
const checks = [];
function check(name, passed, detail) {
  checks.push({ name, passed, ...(detail === undefined ? {} : { detail }) });
}

try {
  const bytes = await readFile(assetURL);
  check('copy_sha256_matches_frozen_manifest', digest(bytes) === manifest.sha256, digest(bytes));
  check('byte_length_matches_frozen_manifest', bytes.length === manifest.byteLength, bytes.length);

  let originalStatus = 'not available; validated against bundled frozen SHA-256';
  try {
    const original = await readFile(originalURL);
    check('source_sha256_matches_frozen_manifest', digest(original) === manifest.sha256);
    check('copy_is_byte_identical_to_source', bytes.equals(original));
    originalStatus = 'byte-identical to original FINAL GLB';
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
  }

  check('glb_magic', bytes.toString('utf8', 0, 4) === 'glTF');
  check('glb_version_2', bytes.readUInt32LE(4) === 2);
  check('glb_header_length', bytes.readUInt32LE(8) === bytes.length);
  const jsonLength = bytes.readUInt32LE(12);
  check('first_chunk_is_json', bytes.readUInt32LE(16) === 0x4e4f534a);
  const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength));
  const parents = new Map();
  gltf.nodes.forEach((node, index) => (node.children ?? []).forEach((child) => {
    check(`single_parent:${gltf.nodes[child].name}`, !parents.has(child));
    parents.set(child, index);
  }));

  const nameToIndex = new Map(gltf.nodes.map((node, index) => [node.name, index]));
  check('unique_source_names', nameToIndex.size === gltf.nodes.length);
  check('source_node_count', gltf.nodes.length === manifest.nodeCount, gltf.nodes.length);
  check('source_mesh_count', gltf.meshes.length === manifest.meshCount, gltf.meshes.length);
  check('source_material_count', gltf.materials.length === manifest.materialCount, gltf.materials.length);
  check('no_textures_or_images', !(gltf.textures?.length || gltf.images?.length));

  for (const expected of manifest.nodes) {
    const index = nameToIndex.get(expected.name);
    const node = index === undefined ? undefined : gltf.nodes[index];
    check(`node_exists:${expected.name}`, Boolean(node));
    if (!node) continue;
    const parent = parents.has(index) ? gltf.nodes[parents.get(index)].name : null;
    check(`parent:${expected.name}`, parent === expected.parent, parent);
    check(`transform:${expected.name}`, JSON.stringify([
      node.translation ?? [0, 0, 0], node.rotation ?? [0, 0, 0, 1], node.scale ?? [1, 1, 1],
    ]) === JSON.stringify([expected.translation, expected.rotation, expected.scale]));
    if (expected.camera) {
      check(`camera_projection:${expected.name}`, JSON.stringify(gltf.cameras[node.camera]?.perspective) === JSON.stringify(expected.camera));
    }
  }

  const primitives = gltf.meshes.flatMap(({ primitives }) => primitives);
  check('all_primitives_are_triangles', primitives.every((primitive) => primitive.mode === undefined || primitive.mode === 4));
  const triangleCount = primitives.reduce((sum, primitive) => {
    const accessor = gltf.accessors[primitive.indices ?? primitive.attributes.POSITION];
    return sum + accessor.count / 3;
  }, 0);
  check('source_triangle_count', triangleCount === manifest.triangleCount, triangleCount);
  check('source_primitive_count', primitives.length === manifest.primitiveCount, primitives.length);
  check('spatial_freeze_marker', gltf.nodes.find(({ name }) => name === 'SharkysRoom')?.extras?.freeze_status === 'COMPOSITION_LOCKED');

  const failures = checks.filter(({ passed }) => !passed);
  console.log(JSON.stringify({
    ok: failures.length === 0,
    asset: fileURLToPath(assetURL),
    originalStatus,
    sha256: digest(bytes),
    bytes: bytes.length,
    nodes: gltf.nodes.length,
    meshDefinitions: gltf.meshes.length,
    primitiveMeshes: primitives.length,
    triangles: triangleCount,
    materials: gltf.materials.length,
    passedChecks: checks.length - failures.length,
    failedChecks: failures,
  }, null, 2));
  if (failures.length > 0) process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exitCode = 1;
}
