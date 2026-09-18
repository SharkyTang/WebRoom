/** v0.6C contracts use exported triangles and frozen anchors, never generator statistics. */
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { before, describe, it } from 'node:test';
import { Box3, Matrix4, Mesh, MeshStandardMaterial, Ray, Raycaster, Triangle, Vector3, type Group, type Object3D } from 'three';
import { assetManifest, type AssetDefinition, type AssetFamily } from '../lib/room/assets/assetManifest';
import { installAssetFamily, validateAssetFamily, validateAssembly } from '../lib/room/assets/assetAssembly';
import { validateScene } from '../lib/room/diagnostics';
import { resolveInteraction } from '../lib/room/interactiveObjects';
import { FROZEN_NODE_RECORDS } from '../lib/room/sceneConstants';
import { readGeometryGlb } from './helpers/productionGlb';

const cFamilies = ['eiffel', 'hogwarts', 'minastirith', 'falcon', 'bridge', 'sls', 'ferrari', 'mercedes', 'plants', 'cola', 'dog', 'fixtures', 'wallart'] as const;
type CFamily = typeof cFamilies[number];
const definitions = assetManifest as Record<string, AssetDefinition>;
// Families enter the manifest only after their GLBs exist. The final delivery opts into all 13.
const registered = cFamilies.filter(id => Object.hasOwn(definitions, id));
const aFamilies = ['cabinet', 'floor', 'desk', 'coffee', 'dogbed', 'sidetable', 'bedside'] as const;
const exports = new Map<string, Awaited<ReturnType<typeof readGeometryGlb>>>();
let source: Group;
const EPS = .00001; // 10 micrometres: GLB float32 conversion, not an allowance for visible penetration.
const asFamily = (id: string) => id as AssetFamily;

before(async () => {
  source = (await readGeometryGlb(new URL('../public/models/sharkys_room_blockout_FINAL.glb', import.meta.url))).scene;
  for (const id of [...registered, ...aFamilies, 'ipad', ...(registered.includes('fixtures') ? ['piano'] : [])]) {
    exports.set(id, await readGeometryGlb(new URL(`../public${definitions[id].url}`, import.meta.url)));
  }
});

function node(scope: Object3D, name: string) {
  const result = scope.getObjectByName(name);
  assert.ok(result, `Required actual exported node: ${name}`);
  return result;
}
function meshes(scope: Object3D) {
  const result: Mesh[] = [];
  scope.traverse(object => { if (object instanceof Mesh) result.push(object); });
  return result;
}
function materials(mesh: Mesh) { return Array.isArray(mesh.material) ? mesh.material : [mesh.material]; }
function hasNamedAncestor(object: Object3D, expression: RegExp, stop: Object3D) {
  for (let current: Object3D | null = object; current && current !== stop.parent; current = current.parent) {
    if (expression.test(current.name)) return true;
  }
  return false;
}
function triangles(scope: Object3D, frame?: Object3D, include: (mesh: Mesh) => boolean = () => true) {
  scope.updateWorldMatrix(true, true);
  frame?.updateWorldMatrix(true, false);
  const inverse = frame ? frame.matrixWorld.clone().invert() : new Matrix4();
  const result: Triangle[] = [];
  for (const mesh of meshes(scope).filter(include)) {
    const matrix = inverse.clone().multiply(mesh.matrixWorld), position = mesh.geometry.getAttribute('position'), index = mesh.geometry.index;
    for (let start = 0; start < (index?.count ?? position.count); start += 3) {
      const point = (offset: number) => new Vector3().fromBufferAttribute(position, index?.getX(start + offset) ?? start + offset).applyMatrix4(matrix);
      result.push(new Triangle(point(0), point(1), point(2)));
    }
  }
  return result;
}
function bounds(scope: Object3D, frame?: Object3D, include?: (mesh: Mesh) => boolean) {
  const box = new Box3();
  for (const tri of triangles(scope, frame, include)) for (const point of [tri.a, tri.b, tri.c]) box.expandByPoint(point);
  assert.equal(box.isEmpty(), false, `Nonempty exported geometry: ${scope.name}`);
  return box;
}
function contains(allowed: Box3, actual: Box3, label: string) {
  assert.ok(allowed.clone().expandByScalar(EPS).containsBox(actual), `${label}: ${JSON.stringify({ allowed: [allowed.min.toArray(), allowed.max.toArray()], actual: [actual.min.toArray(), actual.max.toArray()] })}`);
}
function install(ids: readonly string[]) {
  const room = source.clone(true);
  const installations = ids.map(id => installAssetFamily(room, asFamily(id), exports.get(id)!.scene.clone(true)));
  room.updateMatrixWorld(true);
  return { room, dispose: () => installations.reverse().forEach(value => value.dispose()) };
}
function down(scope: Object3D, x: number, z: number, fromY: number) {
  return new Raycaster(new Vector3(x, fromY, z), new Vector3(0, -1, 0), 0, 4).intersectObjects(meshes(scope), false);
}
function assertSupported(visual: Object3D, support: Object3D, label: string) {
  const box = bounds(visual), bottom = box.min.y;
  // Sample actual lowest vertices and bottom-triangle centroids, not merely the bbox centre.
  // 1 mm permits the documented .5 mm contact offset; >1 mm remains a visible support error.
  const samples: Vector3[] = [];
  for (const tri of triangles(visual)) {
    const vertices = [tri.a, tri.b, tri.c];
    if (vertices.every(v => Math.abs(v.y - bottom) < EPS)) samples.push(tri.getMidpoint(new Vector3()));
    for (const v of vertices) if (Math.abs(v.y - bottom) < EPS) samples.push(v);
  }
  assert.ok(samples.length > 0, `${label}: actual lowest contact vertices`);
  for (const point of samples.filter((_, index) => index % Math.max(1, Math.floor(samples.length / 32)) === 0)) {
    const hit = down(support, point.x, point.z, bottom + .001)[0];
    assert.ok(hit, `${label}: unsupported bottom point ${point.toArray()}`);
    const gap = bottom - hit.point.y;
    assert.ok(gap >= -EPS && gap <= .001 + EPS, `${label}: bottom/support gap ${gap} m at ${point.toArray()}`);
  }
}

/** Flat pot feet span existing recessed floor joints; only those joints may lack immediate contact. */
function assertFloorPlantSupported(visual: Object3D, floor: Object3D, label: string) {
  assert.ok(['DEC_Plant_Sofa', 'DEC_Plant_Window'].includes(label), 'Floor-joint rule is exclusive to the original floor plants');
  const planks = node(floor, 'VIS_FloorOakPlanks'), substrate = node(floor, 'VIS_FloorJointSubstrate');
  const plankTop = bounds(planks).max.y, substrateTop = bounds(substrate).max.y;
  const actualJointDepth = plankTop - substrateTop, bottom = bounds(visual).min.y;
  const contactOffset = bottom - plankTop;
  assert.ok(actualJointDepth > EPS, `${label}: an actual recessed substrate must exist`);
  assert.ok(contactOffset >= -EPS && contactOffset <= .001 + EPS, `${label}: flat pot bottom must meet plank tops without penetration`);
  const bottomFaces = triangles(visual).filter(tri => tri.getArea() > 1e-12 && [tri.a, tri.b, tri.c].every(v => Math.abs(v.y - bottom) < EPS));
  assert.ok(bottomFaces.length > 0, `${label}: exported planar pot sole`);
  const sole = new Box3().setFromPoints(bottomFaces.flatMap(tri => [tri.a, tri.b, tri.c]));
  const centre = sole.getCenter(new Vector3()), extent = sole.getSize(new Vector3());
  // Uniform area sampling prevents duplicated shared vertices from overstating support.
  const samples: Vector3[] = [];
  for (let ix = 0; ix < 25; ix++) for (let iz = 0; iz < 25; iz++) {
    const point = new Vector3(sole.min.x + extent.x * (ix + .5) / 25, bottom, sole.min.z + extent.z * (iz + .5) / 25);
    if (bottomFaces.some(face => face.containsPoint(point))) samples.push(point);
  }
  assert.ok(samples.length > 100, `${label}: broad two-dimensional bottom coverage`);
  const gridSampleCount = samples.length;
  // Keep boundary vertices and face centroids too: a narrow joint may fall between grid columns.
  const seen = new Set(samples.map(point => point.toArray().map(v => Math.round(v / EPS)).join(':')));
  for (const face of bottomFaces) for (const point of [face.a, face.b, face.c, face.getMidpoint(new Vector3())]) {
    const key = point.toArray().map(v => Math.round(v / EPS)).join(':');
    if (!seen.has(key)) { seen.add(key); samples.push(point); }
  }
  const observations = samples.map((point, sampleIndex) => {
    const hit = down(floor, point.x, point.z, Math.max(bottom, plankTop) + .01)[0];
    assert.ok(hit, `${label}: no actual floor under bottom sample ${point.toArray()}`);
    const gap = bottom - hit.point.y;
    assert.ok(gap >= -EPS, `${label}: bottom penetrates actual floor`);
    const directContact = gap <= .001 + EPS;
    if (directContact) assert.equal(hit.object, planks, `${label}: immediate contact must be actual oak planks`);
    else {
      assert.equal(hit.object, substrate, `${label}: unsupported sample must be the existing joint substrate, never arbitrary empty space`);
      assert.ok(Math.abs(hit.point.y - substrateTop) <= EPS, `${label}: ray must reach actual substrate top`);
      assert.ok(gap <= actualJointDepth + contactOffset + EPS, `${label}: gap exceeds actual exported joint depth plus normal contact offset`);
    }
    return { kind: sampleIndex < gridSampleCount ? 'uniform-area-grid' : 'bottom-vertex-or-centroid', point: point.toArray(), hitMesh: hit.object.name, hitY: hit.point.y, gap, directContact };
  });
  const contacts = observations.filter(value => value.directContact);
  const gridDirectContactCount = observations.slice(0, gridSampleCount).filter(value => value.directContact).length;
  assert.ok(gridDirectContactCount / gridSampleCount >= .8, `${label}: at least 80% of uniform sole samples need direct plank support`);
  const quadrantContacts = [-1, 1].flatMap(sx => [-1, 1].map(sz => {
    const contact = contacts.find(value => (value.point[0] - centre.x) * sx > extent.x * .1 && (value.point[2] - centre.z) * sz > extent.z * .1);
    assert.ok(contact, `${label}: missing load-bearing contact in quadrant ${sx}/${sz}`);
    return contact.point;
  }));
  assert.ok(new Triangle(...quadrantContacts.slice(0, 3).map(point => new Vector3(...point)) as [Vector3, Vector3, Vector3]).getArea() > extent.x * extent.z * .01, `${label}: support points must be non-collinear`);
  return { label, visual: visual.name, method: '25 by 25 uniform grid clipped to actual exported sole triangles plus all bottom vertices/face centroids; four separated quadrants; 80% uniform area contact; every remaining sample requires real joint substrate', plankTop, substrateTop, actualJointDepth, bottom, contactOffset, gridSampleCount, gridDirectContactCount, sampleCount: observations.length, directContactCount: contacts.length, directContactFraction: contacts.length / observations.length, quadrantContacts, maximumGap: Math.max(...observations.map(value => value.gap)), observations };
}

// Independent panel role mapping from frozen cabinet solids. Values themselves come from A GLB vertices.
const slots = {
  eiffel: ['DSP_EiffelTower_Bounds', 4, 5, 8, 7],
  hogwarts: ['DSP_Castle_Bounds', 6, 5, 7, 1],
  minastirith: ['DSP_Architecture_Bounds', 4, 11, 2, 9],
  falcon: ['DSP_Falcon_Bounds', 4, 6, 7, 1],
  bridge: ['DSP_Bridge_Bounds', 3, 4, 2, 7],
  sls: ['DSP_TallRocket_Bounds', 4, 5, 9, 8],
  ferrari: ['DSP_Vehicle_Bounds', 3, 4, 10, 1],
  mercedes: ['DSP_MercedesAMGF1_Bounds', 3, 4, 7, 10],
} as const;
type Collectible = keyof typeof slots;
const collectibles = registered.filter((id): id is Collectible => id in slots);
const panel = (room: Object3D, index: number) => node(room, `VIS_CabinetPanel_${String(index).padStart(2, '0')}`);

describe('v0.6C real GLB geometry, original anchors and reversible assembly', () => {
  it('preserves the frozen 85-node source and requires all 13 families only for final delivery', context => {
    context.diagnostic(`Registered C: ${registered.join(', ') || '(none yet)'}`);
    assert.equal(FROZEN_NODE_RECORDS.length, 85);
    assert.equal(validateScene(source).ok, true);
    if (process.env.ROOM_REQUIRE_ALL_C === '1') assert.deepEqual(registered, [...cFamilies]);
  });

  for (const id of registered) {
    it(`${id}: has finite indexed positions/normals/UVs, uniform transforms and no new lights, cameras, animations or external data`, () => {
      const asset = exports.get(id)!;
      assert.deepEqual(validateAssetFamily(asFamily(id), asset.scene), []);
      const json = asset.json as unknown as { buffers: Array<{ uri?: string }>; images?: Array<{ uri?: string }>; cameras?: unknown[]; animations?: unknown[]; extensions?: Record<string, unknown> };
      assert.equal(json.cameras?.length ?? 0, 0);
      assert.equal(json.animations?.length ?? 0, 0);
      assert.equal(json.extensions?.KHR_lights_punctual, undefined);
      assert.ok(json.buffers.every(b => !b.uri) && (json.images ?? []).every(i => !i.uri));
      asset.scene.traverse(object => {
        assert.ok(Math.abs(object.scale.x - object.scale.y) < EPS && Math.abs(object.scale.y - object.scale.z) < EPS && object.scale.x > 0, `${object.name}: no nonuniform/negative transform`);
      });
      for (const mesh of meshes(asset.scene)) {
        const position = mesh.geometry.getAttribute('position'), normal = mesh.geometry.getAttribute('normal'), uv = mesh.geometry.getAttribute('uv');
        assert.ok(position.count > 0 && normal && uv);
        assert.equal(normal.count, position.count); assert.equal(uv.count, position.count);
        for (const attribute of [position, normal, uv]) assert.ok(Array.from(attribute.array).every(Number.isFinite), mesh.name);
        assert.ok(materials(mesh).every(material => material instanceof MeshStandardMaterial));
        assert.ok(triangles(mesh).some(t => t.getArea() > 1e-10), `${mesh.name}: nondegenerate exported surface`);
      }
    });

    it(`${id}: preserves every original object/TRS, remains noninteractive, and restores exact proxy material/raycast on dispose`, () => {
      const room = source.clone(true);
      const originalNodes = FROZEN_NODE_RECORDS.map(record => { const o = node(room, record.name); return { o, parent: o.parent, p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone() }; });
      const saved = meshes(room).map(mesh => ({ mesh, material: mesh.material, raycast: mesh.raycast, suppressed: mesh.userData.roomProxySuppressed }));
      const allowed = new Set<Mesh>();
      for (const part of definitions[id].parts) {
        const anchor = node(room, part.anchor);
        const replaced = part.proxyMeshNames ? part.proxyMeshNames.map(name => node(anchor, name) as Mesh) : meshes(anchor);
        replaced.forEach(mesh => allowed.add(mesh));
      }
      // These are explicitly unassigned placeholders, never substitutes for named collections.
      if (id === 'minastirith') for (const name of ['DSP_MediumModel_Bounds', 'DSP_SmallModel_Bounds']) allowed.add(node(room, name) as Mesh);
      const installation = installAssetFamily(room, asFamily(id), exports.get(id)!.scene.clone(true));
      try {
        const assembly = validateAssembly(room);
        assert.equal(assembly.ok, true, JSON.stringify(assembly.errors));
        assert.equal(assembly.sourceNodeCount, 85);
        for (const { o, parent, p, q, s } of originalNodes) {
          assert.equal(node(room, o.name), o); assert.equal(o.parent, parent);
          assert.ok(o.position.equals(p) && o.quaternion.equals(q) && o.scale.equals(s));
        }
        for (const snapshot of saved) {
          if (snapshot.mesh.material !== snapshot.material || snapshot.mesh.raycast !== snapshot.raycast) assert.ok(allowed.has(snapshot.mesh), `Unexpected original suppression ${snapshot.mesh.name}`);
        }
        for (const part of definitions[id].parts) {
          const root = node(room, part.root);
          assert.equal(root.parent, node(room, part.anchor));
          for (const mesh of meshes(root)) {
            assert.ok(materials(mesh).some(material => material.visible));
            assert.equal(mesh.userData.roomProxySuppressed, undefined);
            assert.equal(resolveInteraction(mesh), null, `C creates no new interaction: ${mesh.name}`);
          }
        }
      } finally { installation.dispose(); }
      for (const snapshot of saved) {
        assert.equal(snapshot.mesh.material, snapshot.material); assert.equal(snapshot.mesh.raycast, snapshot.raycast);
        assert.equal(snapshot.mesh.userData.roomProxySuppressed, snapshot.suppressed);
      }
      assert.equal(validateScene(room).ok, true);
      const remount = installAssetFamily(room, asFamily(id), exports.get(id)!.scene.clone(true));
      assert.equal(validateAssembly(room).ok, true); remount.dispose();
    });

    it(`${id}: rejects an incomplete export before changing any original or A/B visual`, () => {
      const { room, dispose } = install([...aFamilies, 'ipad']);
      try {
        const snapshots = meshes(room).map(mesh => ({ mesh, material: mesh.material, raycast: mesh.raycast }));
        const broken = exports.get(id)!.scene.clone(true);
        node(broken, definitions[id].parts[0].root).clear();
        assert.throws(() => installAssetFamily(room, asFamily(id), broken), /Empty visual part|Missing or duplicate/);
        for (const snapshot of snapshots) { assert.equal(snapshot.mesh.material, snapshot.material); assert.equal(snapshot.mesh.raycast, snapshot.raycast); }
        assert.equal(validateAssembly(room).ok, true);
      } finally { dispose(); }
    });
  }

  for (const id of collectibles) {
    it(`${id}: body fits its frozen Bounds; explicit plinth reaches the real A shelf without changing or penetrating any panel`, context => {
      const [anchorName, lower, upper, left, right] = slots[id];
      assert.equal(definitions[id].parts.length, 1);
      assert.equal(definitions[id].parts[0].anchor, anchorName);
      const { room, dispose } = install(['cabinet', id]);
      try {
        const visual = node(room, definitions[id].parts[0].root), anchor = node(room, anchorName), original = node(source, anchorName);
        const body = (mesh: Mesh) => !hasNamedAncestor(mesh, /Plinth|Pedestal|SupportBase/, visual);
        const support = (mesh: Mesh) => !body(mesh);
        const originalBox = bounds(original, original);
        const actualBody = bounds(visual, anchor, body);
        contains(originalBox, actualBody, `${id} body vs unchanged original Bounds`);
        // Canonical authoring coordinates are declarations, not measured results. Compare them
        // against independent final GLB vertex extrema, including the explicit 90-degree axis swap.
        const canonicalMin = visual.userData.v06c_canonical_min as unknown;
        const canonicalMax = visual.userData.v06c_canonical_max as unknown;
        const scalar = visual.userData.v06c_uniform_scale as unknown;
        assert.ok(Array.isArray(canonicalMin) && canonicalMin.length === 3 && canonicalMin.every(Number.isFinite));
        assert.ok(Array.isArray(canonicalMax) && canonicalMax.length === 3 && canonicalMax.every(Number.isFinite));
        assert.ok(typeof scalar === 'number' && Number.isFinite(scalar) && scalar > 0);
        assert.equal(visual.userData.v06c_baked_y_rotation_degrees, 90);
        const canonicalSize = canonicalMax.map((value: number, index: number) => value - canonicalMin[index]);
        const expectedSize = [canonicalSize[2], canonicalSize[1], canonicalSize[0]].map(value => value * scalar);
        actualBody.getSize(new Vector3()).toArray().forEach((value, index) => assert.ok(Math.abs(value - expectedSize[index]) < EPS, `${id}: exported axis ${index} deviates from a single canonical scale (${value} vs ${expectedSize[index]})`));
        const bodyCentre = actualBody.getCenter(new Vector3());
        assert.ok(Math.abs(bodyCentre.x) < EPS && Math.abs(bodyCentre.z) < EPS, `${id}: canonical body stays centred at unchanged X/Z anchor`);
        assert.ok(meshes(visual).some(support), `${id}: explicit separate plinth required for original floating proxy`);
        const world = bounds(visual), base = bounds(visual, undefined, support), bodyWorld = bounds(visual, undefined, body);
        const cabinet = node(room, 'VIS_Cabinet'), rear = bounds(node(room, 'VIS_CabinetBackOakPanels'));
        const below = bounds(panel(room, lower)), above = bounds(panel(room, upper)), sideA = bounds(panel(room, left)), sideB = bounds(panel(room, right));
        const slot = new Box3(new Vector3(rear.max.x, below.max.y, sideA.max.z), new Vector3(sideA.max.x, above.min.y, sideB.min.z));
        contains(slot, world, `${id} complete body + plinth actual slot`);
        assert.ok(Math.abs(base.min.y - below.max.y) <= .001 + EPS, `${id}: grounded plinth ${base.min.y} vs ${below.max.y}`);
        assert.ok(base.max.y >= bodyWorld.min.y - .001 - EPS, `${id}: body must meet its support`);
        const localBase = bounds(visual, anchor, support);
        const permittedPlinth = originalBox.clone(); permittedPlinth.min.y = below.max.y - anchor.getWorldPosition(new Vector3()).y;
        contains(permittedPlinth, localBase, `${id}: support extends downward only, no wider/deeper proxy`);
        const solids = meshes(cabinet).map(mesh => ({ mesh, box: bounds(mesh).expandByScalar(-EPS) }));
        for (const triangle of triangles(visual)) for (const solid of solids) assert.equal(solid.box.intersectsTriangle(triangle), false, `${id}: triangle enters A solid ${solid.mesh.name}`);
        const bottomContact = meshes(visual).filter(support);
        assert.ok(bottomContact.length > 0);
        // Actual bottom of the whole asset belongs to the plinth, so this tests its real footprint.
        assertSupported(visual, panel(room, lower), id);
        context.diagnostic(`${id}: actual shelf Y=${below.max.y}, top clearance=${above.min.y - world.max.y}m, original proxy gap=${bounds(original).min.y - below.max.y}m`);
      } finally { dispose(); }
    });
  }

  if (registered.includes('minastirith')) {
    it('Minas Tirith retires only the two explicitly unassigned generic proxies and restores both original identities/materials/raycast', () => {
      const retiredNames = ['DSP_MediumModel_Bounds', 'DSP_SmallModel_Bounds'];
      assert.deepEqual(definitions.minastirith.retiredPlaceholderMeshes, retiredNames);
      const { room, dispose } = install(['cabinet']);
      const retired = retiredNames.map(name => { const mesh = node(room, name) as Mesh; return { mesh, parent: mesh.parent, matrix: mesh.matrix.clone(), material: mesh.material, raycast: mesh.raycast }; });
      const castle = node(room, 'DSP_Castle_Bounds') as Mesh, castleMaterial = castle.material;
      const installed = installAssetFamily(room, asFamily('minastirith'), exports.get('minastirith')!.scene.clone(true));
      try {
        for (const saved of retired) {
          assert.equal(node(room, saved.mesh.name), saved.mesh); assert.equal(saved.mesh.parent, saved.parent); assert.ok(saved.mesh.matrix.equals(saved.matrix));
          assert.equal(saved.mesh.visible, true, 'Keep original Bounds identity itself visible/addressable');
          assert.equal(saved.mesh.userData.roomProxySuppressed, true);
          assert.ok(materials(saved.mesh).every(material => !material.visible));
        }
        assert.equal(castle.material, castleMaterial, 'White City cannot consume Hogwarts');
        for (const mesh of meshes(node(room, 'VIS_Cabinet'))) assert.ok(materials(mesh).some(material => material.visible));
        assert.equal(validateAssembly(room).ok, true);
      } finally { installed.dispose(); }
      for (const saved of retired) { assert.equal(saved.mesh.material, saved.material); assert.equal(saved.mesh.raycast, saved.raycast); assert.equal(saved.mesh.userData.roomProxySuppressed, undefined); }
      dispose();
    });

    it('retiring a VIS mesh, a group, a missing placeholder or a non-DSP source fails before changing any installed object', () => {
      const definition = definitions.minastirith, originalRetired = definition.retiredPlaceholderMeshes;
      try {
        for (const invalid of ['VIS_CabinetPanel_05', 'DISPLAY_MODELS', 'DSP_DoesNotExist_Bounds', 'TEC_iPad']) {
          const { room, dispose } = install(['cabinet', 'ipad']);
          try {
            const saved = meshes(room).map(mesh => ({ mesh, material: mesh.material, raycast: mesh.raycast }));
            definition.retiredPlaceholderMeshes = ['DSP_MediumModel_Bounds', invalid];
            assert.throws(() => installAssetFamily(room, asFamily('minastirith'), exports.get('minastirith')!.scene.clone(true)), /Not a frozen display placeholder/);
            for (const snapshot of saved) { assert.equal(snapshot.mesh.material, snapshot.material); assert.equal(snapshot.mesh.raycast, snapshot.raycast); }
            assert.equal(room.getObjectByName(definition.parts[0].root), undefined);
            assert.equal(validateAssembly(room).ok, true);
          } finally { dispose(); }
        }
      } finally { definition.retiredPlaceholderMeshes = originalRetired; }
    });
  }

  if (registered.includes('eiffel')) it('Eiffel keeps a square splayed-foot footprint, a tall silhouette and a genuine open arch through the lower body', () => {
    const scene = exports.get('eiffel')!.scene, visual = node(scene, definitions.eiffel.parts[0].root);
    const body = (mesh: Mesh) => !hasNamedAncestor(mesh, /Plinth|Pedestal|SupportBase/, visual);
    const box = bounds(visual, undefined, body), size = box.getSize(new Vector3()), centre = box.getCenter(new Vector3());
    // A four-legged tower has a square plan; this catches independently squeezed depth/width.
    assert.ok(Math.abs(size.x / size.z - 1) < .035, `Square tower footprint: ${size.x}/${size.z}`);
    assert.ok(size.y / size.x > 2.7 && size.y / size.x < 3.7, `Tall complete silhouette: ${size.toArray()}`);
    const openArch = new Raycaster(new Vector3(centre.x, box.min.y + size.y * .08, box.min.z - .01), new Vector3(0, 0, 1), 0, size.z + .02);
    assert.equal(openArch.intersectObjects(meshes(visual).filter(body), false).length, 0, 'Lower central arch must be an actual through-opening, not a painted grey box');
  });

  if (registered.includes('plants')) it('five plants retain five original placements, fit their leaf envelopes and meet the actual A support planes', async context => {
    const names = ['DEC_Plant_Cabinet', 'DEC_Plant_CoffeeTable', 'DEC_Plant_Desk', 'DEC_Plant_Sofa', 'DEC_Plant_Window'];
    assert.deepEqual(definitions.plants.parts.map(p => p.anchor).sort(), names.sort());
    const { room, dispose } = install([...aFamilies, 'plants']);
    const floorEvidence: ReturnType<typeof assertFloorPlantSupported>[] = [];
    try {
      for (const part of definitions.plants.parts) {
        const visual = node(room, part.root), original = node(source, part.anchor), allowed = bounds(original, original);
        const supportName = part.anchor.includes('Cabinet') ? 'VIS_CabinetPanel_05' : part.anchor.includes('Coffee') ? 'VIS_CoffeeTop' : part.anchor.includes('Desk') ? 'VIS_Desk' : 'VIS_Floor';
        const support = node(room, supportName);
        // Cabinet proxy starts at 2.61m; actual A top is 2.595m. Pot feet may bridge only this 15mm gap.
        allowed.min.y = bounds(support).max.y - original.getWorldPosition(new Vector3()).y;
        contains(allowed, bounds(visual, node(room, part.anchor)), part.anchor);
        if (supportName === 'VIS_Floor') floorEvidence.push(assertFloorPlantSupported(visual, support, part.anchor));
        else assertSupported(visual, support, part.anchor);
      }
      for (const evidence of floorEvidence) context.diagnostic(`${evidence.label}: ${evidence.directContactCount}/${evidence.sampleCount} actual sole samples contact planks; measured joint depth=${evidence.actualJointDepth}m; contact offset=${evidence.contactOffset}m`);
      if (process.env.ROOM_FLOOR_SUPPORT_EVIDENCE) await writeFile(process.env.ROOM_FLOOR_SUPPORT_EVIDENCE, JSON.stringify({ generatedAt: new Date().toISOString(), source: 'Actual exported A floor and C plant triangles; no model/statistics mutation', floorSHA256: createHash('sha256').update(exports.get('floor')!.bytes).digest('hex'), plantsSHA256: createHash('sha256').update(exports.get('plants')!.bytes).digest('hex'), evidence: floorEvidence }, null, 2) + '\n', { flag: 'wx' });
    } finally { dispose(); }
  });

  if (registered.includes('cola')) it('cola is one supported coffee-table visual, leaves A and B iPad visible, and does not intersect the existing plant or iPad', () => {
    assert.equal(definitions.cola.parts.length, 1);
    const part = definitions.cola.parts[0];
    assert.equal(part.anchor, 'FUR_CoffeeTable'); assert.deepEqual(part.proxyMeshNames, []);
    const { room, dispose } = install(['coffee', 'ipad', 'cola']);
    try {
      const visual = node(room, part.root), box = bounds(visual), coffee = node(room, 'VIS_CoffeeTop');
      assertSupported(visual, coffee, 'cola');
      const tableLocal = bounds(coffee, node(room, part.anchor)), cupLocal = bounds(visual, node(room, part.anchor));
      assert.ok(cupLocal.min.x >= tableLocal.min.x && cupLocal.max.x <= tableLocal.max.x && cupLocal.min.z >= tableLocal.min.z && cupLocal.max.z <= tableLocal.max.z);
      assert.equal(box.intersectsBox(bounds(node(room, 'VIS_iPadBody'))), false);
      assert.equal(box.intersectsBox(bounds(node(room, 'DEC_Plant_CoffeeTable'))), false);
      for (const root of [coffee, node(room, 'VIS_iPadBody')]) for (const mesh of meshes(root)) assert.ok(materials(mesh).some(material => material.visible));
      // Physical drinking-glass scale, independent of the generator's exact chosen dimensions.
      const size = box.getSize(new Vector3());
      assert.ok(size.y >= .09 && size.y <= .20 && size.x >= .055 && size.x <= .12 && size.z >= .055 && size.z <= .12);
      const names = meshes(visual).flatMap(mesh => [mesh.name, ...materials(mesh).map(material => material.name)]).join(' ');
      assert.match(names, /Ice/i); assert.match(names, /Liquid|Cola/i); assert.match(names, /Glass|Cup/i);
    } finally { dispose(); }
  });

  if (registered.includes('cola')) it('cola liquid and ice stay inside the actual exported inner glass profile and polygonal walls', context => {
    const visual = node(exports.get('cola')!.scene, 'VIS_Cola');
    const byMaterial = (name: string) => meshes(visual).filter(mesh => materials(mesh).some(material => material.name === name));
    const glass = byMaterial('MAT_V06C_Cola_Glass'), liquid = byMaterial('MAT_V06C_Cola_Liquid'), ice = byMaterial('MAT_V06C_Cola_Ice');
    assert.ok(glass.length && liquid.length && ice.length, 'Separate glass/liquid/ice material geometry must exist');
    const glassBox = bounds(visual, visual, mesh => glass.includes(mesh)), centre = glassBox.getCenter(new Vector3());
    const glassTriangles = triangles(visual, visual, mesh => glass.includes(mesh));
    // Inward radial normals identify the inner wall from exported geometry, not authored radii.
    const innerWall = glassTriangles.filter(tri => {
      const midpoint = tri.getMidpoint(new Vector3()), radial = new Vector3(midpoint.x - centre.x, 0, midpoint.z - centre.z).normalize();
      return tri.getArea() > 1e-12 && tri.getNormal(new Vector3()).dot(radial) < -.5;
    });
    assert.ok(innerWall.length >= 16, 'Actual inward-facing glass wall triangles');
    const rings = new Map<number, { y: number; radius: number }>();
    for (const tri of innerWall) for (const point of [tri.a, tri.b, tri.c]) {
      const key = Math.round(point.y / EPS), radius = Math.hypot(point.x - centre.x, point.z - centre.z), previous = rings.get(key);
      if (!previous || radius < previous.radius) rings.set(key, { y: point.y, radius });
    }
    const profile = [...rings.values()].sort((a, b) => a.y - b.y);
    assert.ok(profile.length >= 2 && profile.every(level => level.radius > 0), 'Measurable inner cross-section levels');
    const cavityBottom = profile[0].y, rim = profile.at(-1)!.y;
    const cavityFloor = glassTriangles.filter(tri => tri.getArea() > 1e-12 && [tri.a, tri.b, tri.c].every(point => Math.abs(point.y - cavityBottom) <= EPS) && tri.getNormal(new Vector3()).y > .5);
    assert.ok(cavityFloor.some(tri => tri.containsPoint(new Vector3(centre.x, cavityBottom, centre.z))), 'Glass has a real inner bottom across its axis');
    const radiusAt = (y: number) => {
      const found = profile.findIndex(level => level.y >= y);
      const topIndex = found < 0 ? profile.length - 1 : Math.max(1, found);
      const lower = profile[topIndex - 1], upper = profile[topIndex];
      const t = Math.max(0, Math.min(1, (y - lower.y) / (upper.y - lower.y)));
      return lower.radius + (upper.radius - lower.radius) * t;
    };
    const checked: Record<string, number> = {};
    for (const [label, members] of [['liquid', liquid], ['ice', ice]] as const) {
      const vertices = triangles(visual, visual, mesh => members.includes(mesh)).flatMap(tri => [tri.a, tri.b, tri.c]);
      for (const point of vertices) {
        assert.ok(point.y >= cavityBottom - EPS && point.y <= rim + EPS, `${label}: vertex outside actual glass cavity height`);
        const radius = Math.hypot(point.x - centre.x, point.z - centre.z);
        assert.ok(radius <= radiusAt(point.y) + EPS, `${label}: radius=${radius} exceeds inner radius=${radiusAt(point.y)} at exported vertex ${point.toArray()}`);
        if (radius < EPS) continue;
        const direction = new Vector3(point.x - centre.x, 0, point.z - centre.z).normalize();
        const ray = new Ray(new Vector3(centre.x, Math.max(cavityBottom + EPS, Math.min(rim - EPS, point.y)), centre.z), direction);
        const hits = innerWall.flatMap(tri => {
          const hit = ray.intersectTriangle(tri.a, tri.b, tri.c, false, new Vector3());
          return hit ? [hit.distanceTo(ray.origin)] : [];
        });
        assert.ok(hits.length > 0 && radius <= Math.min(...hits) + EPS, `${label}: vertex crosses actual faceted inner glass wall`);
      }
      checked[label] = vertices.length;
    }
    context.diagnostic(JSON.stringify({ cavityBottom, rim, innerProfileFromGlb: profile, checkedVertexOccurrences: checked, liquidIceOverlap: 'permitted: ice floats in liquid' }));
  });

  if (registered.includes('dog')) it('sleeping dog suppresses only the old body/head, preserves the A bed, stays in its old envelope and touches the inset cushion', () => {
    assert.equal(definitions.dog.parts.length, 1);
    const part = definitions.dog.parts[0];
    assert.equal(part.anchor, 'DEC_DogBedProxy'); assert.deepEqual(part.proxyMeshNames, ['DEC_DogBedProxy_Mesh_1']);
    const { room, dispose } = install(['dogbed', 'dog']);
    try {
      const visual = node(room, part.root), anchor = node(room, part.anchor), original = node(source, part.anchor);
      contains(bounds(node(source, 'DEC_DogBedProxy_Mesh_1'), original), bounds(visual, anchor), 'Dog stays in original dog-only envelope');
      for (const mesh of meshes(node(room, 'VIS_DogBed'))) { assert.ok(materials(mesh).some(material => material.visible)); assert.equal(mesh.userData.roomProxySuppressed, undefined); }
      assert.equal(anchor.visible, true); assert.equal(node(room, 'DEC_DogBedProxy_Mesh_1').userData.roomProxySuppressed, true);
      const pad = node(room, 'VIS_DogBedInsetPad'), dogBox = bounds(visual), padBox = bounds(pad);
      assert.ok(dogBox.min.y >= padBox.min.y - EPS && dogBox.min.y <= padBox.max.y + .001);
      // The pad is curved (0.069–0.085m in the body footprint), so require a real nearby contact
      // instead of demanding every belly vertex sits on an imaginary flat .085m plane.
      const contacts = triangles(visual).flatMap(t => [t.a, t.b, t.c]).filter(p => p.y <= dogBox.min.y + .003).map(p => {
        const hit = down(pad, p.x, p.z, p.y + .001)[0]; return hit ? p.y - hit.point.y : Infinity;
      });
      assert.ok(contacts.some(gap => gap >= -EPS && gap <= .003), 'At least one real cushion/body support contact within 3mm');
      // The rim's overall bbox encloses the empty bed cavity, so testing two bboxes would
      // falsely report every correctly sleeping dog as colliding. Use actual closed rim triangles.
      const surround = node(room, 'VIS_DogBedSoftSurround'), rimTop = bounds(surround).max.y;
      const rimTriangles = triangles(surround), direction = new Vector3(.381, .873, .307).normalize(), ray = new Raycaster().ray;
      const seen = new Set<string>();
      for (const point of triangles(visual).flatMap(t => [t.a, t.b, t.c]).filter(p => p.y < rimTop - EPS)) {
        const key = point.toArray().map(n => n.toFixed(6)).join(','); if (seen.has(key)) continue; seen.add(key);
        ray.set(point, direction);
        const distances: number[] = [];
        for (const tri of rimTriangles) {
          const hit = ray.intersectTriangle(tri.a, tri.b, tri.c, false, new Vector3());
          if (hit) distances.push(hit.distanceTo(point));
        }
        distances.sort((a, b) => a - b);
        if ((distances[0] ?? Infinity) <= EPS) continue; // Ordinary surface contact is allowed.
        const distinct = distances.filter((distance, index) => !index || distance - distances[index - 1] > EPS);
        assert.equal(distinct.length % 2, 0, `Dog vertex lies inside the real A bolster: ${point.toArray()}`);
      }
    } finally { dispose(); }
  });

  if (registered.includes('fixtures')) it('four fixture roots reserve independently addressable, nonemissive surfaces without replacing A furniture or inventing a fourth source', () => {
    assert.equal(definitions.fixtures.parts.length, 4);
    const { room, dispose } = install([...aFamilies, 'fixtures']);
    try {
      const allSurfaces: Object3D[] = [];
      for (const part of definitions.fixtures.parts) {
        const root = node(room, part.root), surfaces: Object3D[] = [];
        root.traverse(object => { if (/Surface/.test(object.name) && meshes(object).length > 0 && !surfaces.some(parent => hasNamedAncestor(object, new RegExp(`^${parent.name}$`), root))) surfaces.push(object); });
        assert.ok(surfaces.length > 0, `${part.root}: separate surface`); allSurfaces.push(...surfaces);
        if (/^DEC_Lamp_/.test(part.anchor)) {
          const old = node(source, part.anchor);
          contains(bounds(old, old), bounds(root, node(room, part.anchor)), part.root);
          assertSupported(root, node(room, part.anchor === 'DEC_Lamp_Bedside' ? 'VIS_Bedside' : 'VIS_SideTable'), part.root);
        } else assert.deepEqual(part.proxyMeshNames, [], `${part.root}: new reserved surface must not hide an existing furnishing`);
      }
      const owners = new Map<object, string>();
      for (const surface of allSurfaces) for (const mesh of meshes(surface)) for (const material of materials(mesh)) {
        assert.ok(material instanceof MeshStandardMaterial);
        assert.equal(material.emissive.getHex(), 0, `${surface.name}: C does not activate a new light state`);
        const oldOwner = owners.get(material); assert.ok(!oldOwner || oldOwner === surface.name, `Material shared by distinct future light surfaces: ${oldOwner}/${surface.name}`);
        owners.set(material, surface.name);
      }
      for (const family of aFamilies) for (const part of definitions[family].parts) for (const mesh of meshes(node(room, part.root))) {
        assert.ok(materials(mesh).some(material => material.visible), `A remains visible: ${mesh.name}`);
        for (const material of materials(mesh)) assert.equal(owners.has(material), false, 'Fixture state material must not be shared with A furniture');
      }
    } finally { dispose(); }
  });

  if (registered.includes('fixtures')) it('rear desk strip preserves the complete B piano/slide at 17 travel poses and the original desktop clearance', context => {
    const { room, dispose } = install(['desk', 'piano', 'fixtures']);
    const rail = node(room, 'INT_PianoRail'), initial = rail.position.clone();
    try {
      const strip = node(room, 'VIS_FixtureDeskStrip'), desk = node(room, 'VIS_Desk');
      const topMesh = meshes(desk).find(mesh => /WoodTop|_Top$/.test(mesh.name));
      assert.ok(topMesh, 'Actual A desktop top mesh');
      const underside = bounds(topMesh).min.y, stripBox = bounds(strip);
      const stripTriangles = triangles(strip), deskSolids = meshes(desk).map(mesh => ({ name: mesh.name, interior: bounds(mesh).expandByScalar(-EPS) }));
      for (const tri of stripTriangles) for (const solid of deskSolids) assert.equal(solid.interior.intersectsTriangle(tri), false, `Rear strip penetrates A ${solid.name}`);
      const fractions = [...new Set([0, .25, .5, .75, 1, ...Array.from({ length: 15 }, (_, index) => index / 14)])];
      assert.equal(fractions.length, 17);
      const observed: Array<{ travelFraction: number; stripClearanceLowerBound: number; desktopVerticalClearance: number }> = [];
      for (const fraction of fractions) {
        rail.position.z = initial.z - .65 + fraction * .65;
        room.updateMatrixWorld(true);
        // Both moving roots matter: testing INT_Piano alone would miss VIS_PianoSlide.
        const movingTriangles = definitions.piano.parts.flatMap(part => triangles(node(room, part.root)));
        const pianoBox = new Box3(); for (const tri of movingTriangles) for (const point of [tri.a, tri.b, tri.c]) pianoBox.expandByPoint(point);
        for (const triangle of movingTriangles) assert.equal(stripBox.clone().expandByScalar(-EPS).intersectsTriangle(triangle), false, `Desk strip enters B geometry at ${fraction}`);
        for (const triangle of stripTriangles) assert.equal(pianoBox.clone().expandByScalar(-EPS).intersectsTriangle(triangle), false, `Desk strip crosses B envelope at ${fraction}`);
        const gaps = ['x', 'y', 'z'].map(axis => {
          const key = axis as 'x' | 'y' | 'z';
          return Math.max(stripBox.min[key] - pianoBox.max[key], pianoBox.min[key] - stripBox.max[key], 0);
        });
        // Box separation is a conservative lower bound on actual triangle distance, not a
        // claim that the closest surface pair has been solved to submillimetre accuracy.
        const stripGap = Math.hypot(...gaps), topGap = underside - pianoBox.max.y;
        assert.ok(stripGap >= .01599, `Rear strip must not narrow original 16mm minimum clearance: ${stripGap}m`);
        assert.ok(topGap >= .01599, `Original tabletop/piano clearance preserved: ${topGap}m`);
        observed.push({ travelFraction: fraction, stripClearanceLowerBound: stripGap, desktopVerticalClearance: topGap });
      }
      context.diagnostic(`Actual exported B piano+slide / desk strip, 17 poses: ${JSON.stringify(observed)}`);
    } finally { rail.position.copy(initial); room.updateMatrixWorld(true); dispose(); }
  });

  if (registered.includes('wallart')) it('wall art keeps the existing wall position and envelope', () => {
    assert.equal(definitions.wallart.parts.length, 1); assert.equal(definitions.wallart.parts[0].anchor, 'DEC_WallArt');
    const { room, dispose } = install(['wallart']);
    try { const original = node(source, 'DEC_WallArt'); contains(bounds(original, original), bounds(node(room, definitions.wallart.parts[0].root), node(room, 'DEC_WallArt')), 'wall art'); }
    finally { dispose(); }
  });
});
