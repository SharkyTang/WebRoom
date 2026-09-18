/** Window-plant clearance uses current exported C/A vertices on unchanged FINAL anchors. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { before, after, describe, it } from 'node:test';
import { Box3, Mesh, Vector3, type Group, type Object3D } from 'three';
import { assetManifest, type AssetFamily } from '../lib/room/assets/assetManifest';
import { installAssetFamily } from '../lib/room/assets/assetAssembly';
import { validateScene } from '../lib/room/diagnostics';
import { readGeometryGlb } from './helpers/productionGlb';

const EPS = .00001; // Existing 10-micrometre float32 precision allowance, not visible penetration.
const MIN_CLEARANCE = .001;
const ids: AssetFamily[] = ['curtains', 'bed', 'desk', 'plants'];
let room: Group, source: Group;
let cleanup: Array<ReturnType<typeof installAssetFamily>> = [];
let evidence: ReturnType<typeof collectEvidence>;
const inputs: { family: string; file: string; sha256: string; bytes: number }[] = [];
function node(scope: Object3D, name: string) {
  const value = scope.getObjectByName(name);
  assert.ok(value, `Actual GLB node ${name}`);
  return value;
}
function meshes(scope: Object3D) {
  const values: Mesh[] = [];
  scope.traverse(value => { if (value instanceof Mesh) values.push(value); });
  return values;
}
function worldVertices(mesh: Mesh) {
  mesh.updateWorldMatrix(true, false);
  const position = mesh.geometry.getAttribute('position');
  assert.ok(position && position.count, `${mesh.name}: exported vertex positions`);
  return Array.from({ length: position.count }, (_, index) => new Vector3().fromBufferAttribute(position, index).applyMatrix4(mesh.matrixWorld));
}
function actualBox(scope: Object3D) {
  const result = new Box3().setFromPoints(meshes(scope).flatMap(worldVertices));
  assert.equal(result.isEmpty(), false, scope.name);
  return result;
}
const serializeBox = (box: Box3) => ({ min: box.min.toArray(), max: box.max.toArray(), size: box.getSize(new Vector3()).toArray() });
function separatedAxes(a: Box3, b: Box3) {
  return ['x', 'y', 'z'].map(axis => {
    const key = axis as 'x' | 'y' | 'z';
    return { axis, gap: Math.max(b.min[key] - a.max[key], a.min[key] - b.max[key]) };
  });
}
function familyShapeSignature(root: Object3D) {
  // Local buffer and material signatures permit before/after proof that the four other C plants stayed intact.
  const hash = createHash('sha256');
  for (const mesh of meshes(root).sort((a, b) => a.name.localeCompare(b.name))) {
    hash.update(mesh.name);
    for (const name of ['position', 'normal', 'uv']) {
      const attribute = mesh.geometry.getAttribute(name);
      hash.update(name); hash.update(JSON.stringify(Array.from(attribute.array)));
    }
    hash.update(JSON.stringify(mesh.geometry.index ? Array.from(mesh.geometry.index.array) : null));
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) hash.update(JSON.stringify({ name: material.name, type: material.type }));
  }
  return hash.digest('hex');
}
function collectEvidence() {
  const plant = node(room, 'VIS_PlantWindow');
  const left = node(room, 'VIS_CurtainLeft'), right = node(room, 'VIS_CurtainRight');
  const curtainFrontZ = Math.max(actualBox(left).max.z, actualBox(right).max.z);
  const parts = meshes(plant).map(mesh => {
    const vertices = worldVertices(mesh), minZVertex = vertices.reduce((a, b) => a.z < b.z ? a : b);
    return { mesh: mesh.name, materials: (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(material => material.name), bounds: serializeBox(new Box3().setFromPoints(vertices)), minZVertex: minZVertex.toArray(), curtainPlaneClearance: minZVertex.z - curtainFrontZ, vertexCount: vertices.length };
  });
  const plantBox = actualBox(plant);
  return {
    generatedAt: new Date().toISOString(),
    method: 'Actual exported world vertex envelopes. Requiring all pot/soil/stem/leaf vertices in front of the actual curtain maximum Z by 1mm is a conservative separating-plane proof; failing it records a clearance violation, not by itself triangle intersection. Bed/desk use separating axes from actual vertex bounds.',
    requiredClearanceM: MIN_CLEARANCE, numericEpsilonM: EPS, inputs,
    anchor: { name: 'DEC_Plant_Window', localPosition: node(room, 'DEC_Plant_Window').position.toArray(), localQuaternion: node(room, 'DEC_Plant_Window').quaternion.toArray(), localScale: node(room, 'DEC_Plant_Window').scale.toArray() },
    plantBounds: serializeBox(plantBox), curtainFrontZ,
    curtains: [left, right].map(root => ({ root: root.name, bounds: serializeBox(actualBox(root)) })), parts,
    neighbours: ['VIS_Bed', 'VIS_Desk'].map(name => ({ root: name, bounds: serializeBox(actualBox(node(room, name))), separatingAxes: separatedAxes(plantBox, actualBox(node(room, name))) })),
    otherPlantShapeSignatures: ['VIS_PlantCabinet', 'VIS_PlantCoffeeTable', 'VIS_PlantDesk', 'VIS_PlantSofa'].map(name => ({ root: name, signature: familyShapeSignature(node(room, name)) })),
  };
}

before(async () => {
  const frozen = await readGeometryGlb(new URL('../public/models/sharkys_room_blockout_FINAL.glb', import.meta.url));
  source = frozen.scene; room = source.clone(true);
  inputs.push({ family: 'frozen-final', file: 'public/models/sharkys_room_blockout_FINAL.glb', sha256: createHash('sha256').update(frozen.bytes).digest('hex'), bytes: frozen.bytes.length });
  for (const id of ids) {
    const file = `public${assetManifest[id].url}`;
    const asset = await readGeometryGlb(new URL(`../${file}`, import.meta.url));
    inputs.push({ family: id, file, sha256: createHash('sha256').update(asset.bytes).digest('hex'), bytes: asset.bytes.length });
    cleanup.push(installAssetFamily(room, id, asset.scene));
  }
  room.updateMatrixWorld(true);
  evidence = collectEvidence();
  if (process.env.ROOM_C_CLEARANCE_EVIDENCE) await writeFile(process.env.ROOM_C_CLEARANCE_EVIDENCE, JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx' });
});
after(() => { cleanup.reverse().forEach(value => value.dispose()); cleanup = []; });

describe('v0.6C original Window plant and adjacent A geometry', () => {
  it('preserves the original plant, curtain, bed and desk anchors', () => {
    assert.equal(validateScene(source).ok, true);
    for (const id of ids) for (const part of assetManifest[id].parts) {
      const actual = node(room, part.anchor), original = node(source, part.anchor);
      assert.deepEqual(actual.position.toArray(), original.position.toArray(), part.anchor);
      assert.deepEqual(actual.quaternion.toArray(), original.quaternion.toArray(), part.anchor);
      assert.deepEqual(actual.scale.toArray(), original.scale.toArray(), part.anchor);
      assert.equal(actual.parent?.name, original.parent?.name, part.anchor);
    }
  });
  it('keeps the complete pot, soil/stems and leaves at least 1mm in front of the real A curtain envelope', context => {
    const roles = evidence.parts.flatMap(part => part.materials);
    for (const name of ['MAT_V06C_Plants_Ceramic', 'MAT_V06C_Plants_SoilAndStems', 'MAT_V06C_Plants_Leaves']) assert.ok(roles.includes(name), name);
    context.diagnostic(JSON.stringify({ curtainFrontZ: evidence.curtainFrontZ, parts: evidence.parts.map(part => ({ mesh: part.mesh, materials: part.materials, minZVertex: part.minZVertex, curtainPlaneClearance: part.curtainPlaneClearance })) }));
    for (const part of evidence.parts) assert.ok(part.curtainPlaneClearance >= MIN_CLEARANCE - EPS, `${part.mesh}: minZ vertex ${part.minZVertex}; curtain front Z=${evidence.curtainFrontZ}; clearance=${part.curtainPlaneClearance}m, required >=1mm`);
  });
  for (const neighbour of ['VIS_Bed', 'VIS_Desk']) it(`keeps the Window plant clear of the actual ${neighbour} geometry`, () => {
    const record = evidence.neighbours.find(value => value.root === neighbour)!;
    assert.ok(record.separatingAxes.some(axis => axis.gap >= MIN_CLEARANCE - EPS), `${neighbour}: no 1mm separating axis for exported envelopes ${JSON.stringify(record.separatingAxes)}`);
  });
});
