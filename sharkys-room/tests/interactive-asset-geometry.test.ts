/** Real exported v0.6B geometry, independent of generator statistics and browser pixels. */
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { Box3, Matrix4, Mesh, MeshStandardMaterial, Raycaster, Texture, Triangle, Vector3, type Group, type Object3D } from 'three';
import { assetManifest, type AssetDefinition, type AssetFamily } from '../lib/room/assets/assetManifest';
import { getAssetStateBinding, installAssetFamily, validateAssetFamily, validateAssembly } from '../lib/room/assets/assetAssembly';
import { validateScene } from '../lib/room/diagnostics';
import { resolveInteraction } from '../lib/room/interactiveObjects';
import { createMechanisms } from '../lib/room/mechanisms';
import { FROZEN_NODE_RECORDS } from '../lib/room/sceneConstants';
import { readGeometryGlb } from './helpers/productionGlb';

const bFamilies = ['piano', 'ipad', 'phone', 'trashcan', 'lightswitch', 'keyboard', 'mouse', 'headphones'] as const;
type BFamily = typeof bFamilies[number];
const definitions = assetManifest as Record<string, AssetDefinition>;
// Incremental production is intentional. The final delivery command opts into the full-eight gate.
const registered = bFamilies.filter(id => Object.hasOwn(definitions, id));
const exported = new Map<string, Awaited<ReturnType<typeof readGeometryGlb>>>();
const familyId = (id: string) => id as AssetFamily;
let source: Group;

before(async () => {
  source = (await readGeometryGlb(new URL('../public/models/sharkys_room_blockout_FINAL.glb', import.meta.url))).scene;
  for (const id of [...registered, 'desk', 'chair']) {
    exported.set(id, await readGeometryGlb(new URL(`../public${definitions[id].url}`, import.meta.url)));
  }
});

function node(scope: Object3D, name: string) {
  const found = scope.getObjectByName(name);
  assert.ok(found, name);
  return found;
}
function meshes(scope: Object3D) {
  const result: Mesh[] = [];
  scope.traverse(object => { if (object instanceof Mesh) result.push(object); });
  return result;
}
function materials(mesh: Mesh) { return Array.isArray(mesh.material) ? mesh.material : [mesh.material]; }
function belongsTo(object: Object3D, parent: Object3D) {
  for (let current: Object3D | null = object; current; current = current.parent) if (current === parent) return true;
  return false;
}
function triangles(scope: Object3D, frame?: Object3D, include: (mesh: Mesh) => boolean = () => true) {
  scope.updateWorldMatrix(true, true);
  frame?.updateWorldMatrix(true, false);
  const inverse = frame ? frame.matrixWorld.clone().invert() : new Matrix4();
  const result: Triangle[] = [];
  for (const mesh of meshes(scope).filter(include)) {
    const matrix = inverse.clone().multiply(mesh.matrixWorld), positions = mesh.geometry.getAttribute('position'), indices = mesh.geometry.index;
    for (let start = 0; start < (indices?.count ?? positions.count); start += 3) {
      const point = (offset: number) => new Vector3().fromBufferAttribute(positions, indices?.getX(start + offset) ?? start + offset).applyMatrix4(matrix);
      result.push(new Triangle(point(0), point(1), point(2)));
    }
  }
  return result;
}
function bounds(scope: Object3D, frame?: Object3D, include?: (mesh: Mesh) => boolean) {
  const box = new Box3();
  for (const triangle of triangles(scope, frame, include)) for (const point of [triangle.a, triangle.b, triangle.c]) box.expandByPoint(point);
  assert.equal(box.isEmpty(), false, `${scope.name} must contain actual exported triangles`);
  return box;
}
function originalPianoBodyBounds(room: Object3D, frame?: Object3D) {
  const box = new Box3();
  // The new stationary desk mounts have their own strict mounting corridor test.
  // Preserve the original body/keys/inner-slide envelope without enlarging it.
  for (const root of ['VIS_PianoBody', 'VIS_PianoSlide']) box.union(bounds(node(room, root), frame));
  return box;
}
function install(ids: readonly string[] = registered) {
  const room = source.clone(true);
  const installations = ids.map(id => installAssetFamily(room, familyId(id), exported.get(id)!.scene.clone(true)));
  room.updateMatrixWorld(true);
  return { room, dispose: () => installations.reverse().forEach(value => value.dispose()) };
}
function firstRayHit(mesh: Mesh) {
  for (const triangle of triangles(mesh)) {
    if (triangle.getArea() < 1e-12) continue;
    const normal = triangle.getNormal(new Vector3());
    const ray = new Raycaster(triangle.getMidpoint(new Vector3()).addScaledVector(normal, .002), normal.negate(), 0, .01);
    const hit = ray.intersectObject(mesh, false)[0];
    if (hit) return hit;
  }
  assert.fail(`Visible mesh has no front-facing hittable triangle: ${mesh.name}`);
}
function assertBoxContains(allowed: Box3, actual: Box3, label: string, tolerance = .00001) {
  assert.ok(allowed.clone().expandByScalar(tolerance).containsBox(actual), `${label}: ${JSON.stringify({ allowed: [allowed.min.toArray(), allowed.max.toArray()], actual: [actual.min.toArray(), actual.max.toArray()] })}`);
}
function rayInFrame(scope: Object3D, frame: Object3D, origin: Vector3, direction: Vector3) {
  frame.updateWorldMatrix(true, false);
  const worldOrigin = frame.localToWorld(origin.clone());
  const worldDirection = direction.clone().transformDirection(frame.matrixWorld);
  return new Raycaster(worldOrigin, worldDirection, 0, 2).intersectObjects(meshes(scope), false)
    .map(hit => ({ ...hit, localPoint: frame.worldToLocal(hit.point.clone()) }));
}

describe('v0.6B actual production geometry and assembly', () => {
  it('declares the exact eight-family delivery when the final gate is requested', context => {
    context.diagnostic(`Currently registered B families: ${registered.join(', ') || '(none)'}`);
    if (process.env.ROOM_REQUIRE_ALL_B === '1') assert.deepEqual(registered, [...bFamilies]);
    assert.equal(FROZEN_NODE_RECORDS.length, 85);
    assert.equal(validateScene(source).ok, true);
  });

  for (const id of registered) {
    it(`${id}: exported parts have finite geometry, normals, UVs and complete unique identity roots`, () => {
      const asset = exported.get(id)!;
      assert.deepEqual(validateAssetFamily(familyId(id), asset.scene), []);
      const names = asset.json.nodes.map(value => value.name);
      assert.equal(new Set(names).size, names.length);
      assert.ok(asset.bytes.length > 0);
      for (const mesh of meshes(asset.scene)) {
        const position = mesh.geometry.getAttribute('position'), uv = mesh.geometry.getAttribute('uv'), normal = mesh.geometry.getAttribute('normal');
        assert.ok(position.count > 0 && uv && normal);
        assert.equal(position.count, uv.count);
        assert.equal(position.count, normal.count);
        for (const attribute of [position, uv, normal]) assert.ok(Array.from(attribute.array).every(Number.isFinite), mesh.name);
        assert.ok(materials(mesh).every(material => material instanceof MeshStandardMaterial));
      }
    });

    it(`${id}: installs on original objects, routes actual ray hits, suppresses only proxies and fully rolls back`, () => {
      const room = source.clone(true);
      const originals = FROZEN_NODE_RECORDS.map(record => {
        const object = node(room, record.name);
        return { object, parent: object.parent, position: object.position.clone(), quaternion: object.quaternion.clone(), scale: object.scale.clone() };
      });
      const proxySnapshots = meshes(room).map(mesh => ({ mesh, material: mesh.material, raycast: mesh.raycast, suppressed: mesh.userData.roomProxySuppressed }));
      const installation = installAssetFamily(room, familyId(id), exported.get(id)!.scene.clone(true));
      try {
        const validation = validateAssembly(room);
        assert.equal(validation.ok, true, JSON.stringify(validation.errors));
        assert.equal(validation.sourceNodeCount, 85);
        for (const saved of originals) {
          assert.equal(node(room, saved.object.name), saved.object);
          assert.equal(saved.object.parent, saved.parent);
          assert.ok(saved.object.position.equals(saved.position) && saved.object.quaternion.equals(saved.quaternion) && saved.object.scale.equals(saved.scale));
        }
        for (const part of definitions[id].parts) {
          const root = node(room, part.root);
          assert.equal(root.parent, node(room, part.anchor));
          for (const mesh of meshes(root)) {
            assert.ok(materials(mesh).some(material => material.visible), `${mesh.name} must not be hidden along with its proxy`);
            assert.equal(mesh.userData.roomProxySuppressed, undefined);
            const expected = ['keyboard', 'mouse', 'headphones'].includes(id) || part.anchor === 'DEC_LightSwitchPlate' ? null : id;
            assert.equal(resolveInteraction(firstRayHit(mesh).object), expected);
          }
        }
        assert.throws(() => installAssetFamily(room, familyId(id), exported.get(id)!.scene.clone(true)), /already installed/);
      } finally { installation.dispose(); }
      for (const saved of proxySnapshots) {
        assert.equal(saved.mesh.material, saved.material);
        assert.equal(saved.mesh.raycast, saved.raycast);
        assert.equal(saved.mesh.userData.roomProxySuppressed, saved.suppressed);
      }
      assert.equal(validateScene(room).ok, true);
      const remount = installAssetFamily(room, familyId(id), exported.get(id)!.scene.clone(true));
      assert.equal(validateAssembly(room).ok, true);
      remount.dispose();
      assert.equal(validateScene(room).ok, true);
    });

    it(`${id}: rejects an incomplete export before mutation and releases each accepted resource once`, () => {
      const room = source.clone(true), invalid = exported.get(id)!.scene.clone(true);
      node(invalid, definitions[id].parts[0].root).clear();
      const originals = meshes(room).map(mesh => ({ mesh, material: mesh.material, raycast: mesh.raycast }));
      assert.throws(() => installAssetFamily(room, familyId(id), invalid), /Empty visual part|Missing or duplicate/);
      assert.equal(validateScene(room).ok, true);
      originals.forEach(value => { assert.equal(value.mesh.material, value.material); assert.equal(value.mesh.raycast, value.raycast); });

      const asset = exported.get(id)!.scene.clone(true);
      const geometries = new Set(meshes(asset).map(mesh => mesh.geometry));
      const ownedMaterials = new Set(meshes(asset).flatMap(materials));
      const textures = new Set([...ownedMaterials].flatMap(material => Object.values(material).filter((value): value is Texture => value instanceof Texture)));
      const resources = [...geometries, ...ownedMaterials, ...textures];
      const counts = new Map(resources.map(resource => [resource, 0]));
      const listeners = resources.map(resource => {
        const listener = () => { counts.set(resource, counts.get(resource)! + 1); };
        resource.addEventListener('dispose', listener);
        return { resource, listener };
      });
      try {
        const installation = installAssetFamily(room, familyId(id), asset);
        installation.dispose(); installation.dispose();
        for (const [resource, count] of counts) assert.equal(count, 1, String(resource.type));
        assert.equal(validateScene(room).ok, true);
      } finally { listeners.forEach(({ resource, listener }) => resource.removeEventListener('dispose', listener)); }
    });
  }

  if (registered.includes('piano')) {
    it('piano: keeps both visible roots inside the original body envelope and preserves 16 mm minimum desktop clearance at 17 travel samples', context => {
      const { room, dispose } = install(['desk', 'chair', 'piano']);
      const rail = node(room, 'INT_PianoRail'), piano = node(room, 'INT_Piano'), initial = rail.position.clone();
      const allowed = bounds(node(source, 'INT_Piano'), node(source, 'INT_Piano'));
      const deskTriangles = triangles(node(room, 'VIS_Desk')), chairTriangles = triangles(node(room, 'VIS_Chair'));
      // The real A tabletop underside is Y=.669999957; source piano max is Y=.654000025.
      // Read the export geometry again rather than relying on a generator's claimed dimensions.
      const top = node(room, 'VIS_DeskSolid_0_Top');
      const underside = bounds(top).min.y;
      const fractions = [...new Set([0, .25, .5, .75, 1, ...Array.from({ length: 15 }, (_, index) => index / 14)])];
      assert.equal(fractions.length, 17);
      assert.equal(node(room, 'VIS_PianoBody').parent, piano);
      assert.equal(node(room, 'VIS_PianoSlide').parent, rail);
      const clearances: number[] = [];
      try {
        assertBoxContains(allowed, originalPianoBodyBounds(room, piano), 'Original B piano including keys and inner rails');
        for (const fraction of fractions) {
          rail.position.z = initial.z - .65 + fraction * .65;
          room.updateMatrixWorld(true);
          const box = originalPianoBodyBounds(room);
          clearances.push(underside - box.max.y);
          assert.ok(underside - box.max.y >= .01599, `Piano/table underside clearance at ${fraction}: ${underside - box.max.y}m`);
          const interior = box.clone().expandByScalar(-.000001);
          assert.equal(deskTriangles.filter(triangle => interior.intersectsTriangle(triangle)).length, 0, `Real A desk intersects piano at ${fraction}`);
          assert.equal(chairTriangles.filter(triangle => interior.intersectsTriangle(triangle)).length, 0, `Real A chair intersects piano at ${fraction}`);
          const validation = validateAssembly(room);
          assert.equal(validation.ok, true, JSON.stringify(validation.errors));
          assert.equal(rail.position.x, initial.x); assert.equal(rail.position.y, initial.y);
        }
        context.diagnostic(`Measured B piano minimum desktop clearance: ${Math.min(...clearances) * 1000} mm; ${fractions.length} real geometry travel samples`);
      } finally { rail.position.copy(initial); dispose(); }
    });

    it('piano: original mechanisms keep exact absolute endpoints, visual parentage and Back semantics through 20 cycles', async () => {
      const { room, dispose } = install(['piano']);
      const rail = node(room, 'INT_PianoRail'), extended = rail.position.z;
      const controller = createMechanisms(room, () => {});
      try {
        assert.equal(controller.snapshot().pianoState, 'extended');
        assert.equal(controller.snapshot().sourceEndpoints.pianoTravel, .65);
        for (let cycle = 0; cycle < 20; cycle++) {
          await controller.toggle('piano', true);
          assert.equal(rail.position.z, extended - .65);
          await controller.exit('piano', true);
          assert.equal(rail.position.z, extended - .65, 'Back must preserve the retracted state');
          await controller.toggle('piano', true);
          assert.equal(rail.position.z, extended);
          await controller.exit('piano', true);
          assert.equal(rail.position.z, extended, 'Back must preserve the extended state');
          assert.equal(node(room, 'VIS_PianoBody').parent, node(room, 'INT_Piano'));
          assert.equal(node(room, 'VIS_PianoSlide').parent, rail);
        }
      } finally { controller.dispose(); dispose(); }
      assert.equal(validateScene(room).ok, true);
    });
  }

  for (const id of registered.filter((value): value is 'ipad' | 'phone' => value === 'ipad' || value === 'phone')) {
    it(`${id}: independent display faces the user with unmirrored upright exported UVs`, () => {
      const scene = exported.get(id)!.scene, name = id === 'ipad' ? 'VIS_iPadDisplaySurface' : 'VIS_PhoneDisplaySurface';
      const surface = node(scene, name), root = node(scene, id === 'ipad' ? 'VIS_iPadBody' : 'VIS_PhoneBody');
      assert.ok(belongsTo(surface, root));
      const expectedNormal = id === 'ipad' ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1);
      for (const triangle of triangles(surface, root)) if (triangle.getArea() > 1e-12) {
        assert.ok(triangle.getNormal(new Vector3()).dot(expectedNormal) > .999, `${id} screen winding faces the wrong way`);
      }
      const box = bounds(surface, root), size = box.getSize(new Vector3());
      root.updateWorldMatrix(true, true);
      for (const mesh of meshes(surface)) {
        const matrix = root.matrixWorld.clone().invert().multiply(mesh.matrixWorld);
        const positions = mesh.geometry.getAttribute('position'), uv = mesh.geometry.getAttribute('uv');
        for (let index = 0; index < positions.count; index++) {
          const point = new Vector3().fromBufferAttribute(positions, index).applyMatrix4(matrix);
          const u = (point.x - box.min.x) / size.x;
          const v = id === 'ipad' ? (point.z - box.min.z) / size.z : (box.max.y - point.y) / size.y;
          assert.ok(Math.abs(uv.getX(index) - u) < .0001, `${id}: U must run from screen left to right`);
          assert.ok(Math.abs(uv.getY(index) - v) < .0001, `${id}: V must run from screen top to bottom`);
        }
      }
    });

    it(`${id}: activation changes only the independent screen and restores its housing and stand materials`, async () => {
      const { room, dispose } = install([id]);
      const originals = new Map(meshes(room).map(mesh => [mesh, mesh.material]));
      const screen = getAssetStateBinding(room, id)?.meshes;
      assert.ok(screen?.length);
      const controller = createMechanisms(room, () => {});
      try {
        await controller.enter(id, true);
        for (const [mesh, material] of originals) {
          if (screen.includes(mesh)) {
            assert.notEqual(mesh.material, material);
            assert.ok(materials(mesh).every(value => (value as MeshStandardMaterial).emissiveIntensity === 3));
          } else assert.equal(mesh.material, material, `${mesh.name} must not glow with the display`);
        }
        await controller.exit(id, true);
        for (const [mesh, material] of originals) assert.equal(mesh.material, material);
      } finally { controller.dispose(); dispose(); }
    });
  }

  if (registered.includes('ipad')) it('iPad: detailed body and display stay within the frozen coffee-table device envelope', () => {
    const { room, dispose } = install(['ipad']);
    try {
      const original = node(source, 'TEC_iPad');
      assertBoxContains(bounds(original, original), bounds(node(room, 'VIS_iPadBody'), node(room, 'TEC_iPad')), 'iPad envelope');
    } finally { dispose(); }
  });

  if (registered.includes('phone')) it('Phone: preserves the device envelope and adds a real desktop-supported stand in the free surrounding volume', () => {
    const { room, dispose } = install(['desk', 'phone']);
    try {
      const anchor = node(room, 'TEC_Phone'), body = node(room, 'VIS_PhoneBody'), stand = node(room, 'VIS_PhoneStand');
      assert.ok(belongsTo(stand, body));
      const original = node(source, 'TEC_Phone');
      assertBoxContains(bounds(original, original), bounds(body, anchor, mesh => !belongsTo(mesh, stand)), 'Phone housing and screen');
      const deskTop = bounds(node(room, 'VIS_Desk')).max.y, support = bounds(stand);
      // The frozen phone floats 17.54 mm above a .740 m desktop. This .14 x .17 m
      // free volume is between mouse/headphones and in front of the Marshall.
      const free = new Box3(new Vector3(.09, deskTop, -1.84), new Vector3(.23, .93, -1.67));
      assertBoxContains(free, support, 'Phone stand free-space allowance');
      assert.ok(support.min.y - deskTop >= -.00001 && support.min.y - deskTop <= .001, 'Phone stand must reach the actual desktop');
      const bottom = anchor.localToWorld(new Vector3(0, bounds(original, original).min.y, 0));
      const supportRay = new Raycaster(bottom.clone().add(new Vector3(0, .001, 0)), new Vector3(0, -1, 0), 0, .03);
      const hit = supportRay.intersectObjects(meshes(stand), false)[0];
      assert.ok(hit && hit.distance < .008, 'A visible cradle must physically support the phone lower edge');
      const marshall = bounds(node(source, 'TEC_Marshall')), headphones = bounds(node(source, 'TEC_Headphones'));
      assert.equal(support.intersectsBox(marshall), false);
      assert.equal(support.intersectsBox(headphones), false);
    } finally { dispose(); }
  });

  if (registered.includes('trashcan')) {
    it('Trash can: actual open top reveals a deep hollow interior and continuous inner walls', () => {
      const { room, dispose } = install(['trashcan']);
      try {
        const body = node(room, 'VIS_TrashCanBody'), anchor = node(room, 'INT_TrashCanBody');
        const allowed = bounds(node(source, 'INT_TrashCanBody'), node(source, 'INT_TrashCanBody'));
        assertBoxContains(allowed, bounds(node(room, 'VIS_TrashCanHollowShell'), anchor), 'Original continuous trash body; fixed hinge checked in its separate corridor');
        for (const [x, z] of [[0, 0], [-.06, 0], [.06, 0], [0, -.06], [0, .06]]) {
          const hits = rayInFrame(body, anchor, new Vector3(x, .3, z), new Vector3(0, -1, 0));
          assert.ok(hits.length, 'Open cavity must still have an actual bottom');
          assert.ok(hits[0].localPoint.y < -.1, `Trash cavity blocked by a solid top at ${hits[0].localPoint.y}`);
        }
        for (const direction of [new Vector3(1, 0, 0), new Vector3(-1, 0, 0), new Vector3(0, 0, 1), new Vector3(0, 0, -1)]) {
          const hits = rayInFrame(body, anchor, new Vector3(0, .08, 0), direction);
          assert.ok(hits[0] && hits[0].distance > .1 && hits[0].distance < .195, 'Interior wall must be visible from inside rather than culled or missing');
        }
      } finally { dispose(); }
    });

    it('Trash lid: exported rear-edge frame inherits the original hinge, opens repeatedly and closes on exit', async () => {
      const { room, dispose } = install(['trashcan']);
      const hinge = node(room, 'INT_TrashCanLid'), pivot = hinge.position.clone(), lid = node(room, 'VIS_TrashCanLid');
      const local = bounds(lid, hinge, mesh => !belongsTo(mesh, node(room, 'VIS_TrashCanMovingKnuckle')));
      // The source pivot lies at its rear edge, with the complete lid extending +Z.
      assert.ok(local.min.z >= -.00001 && local.max.z > .37 && local.max.z <= .3861);
      assert.ok(local.min.x >= -.1931 && local.max.x <= .1931);
      assert.ok(local.min.y >= -.03 && local.max.y <= .01251, 'Only a small inward-facing skirt may extend below the original lid');
      const originalSize = local.getSize(new Vector3());
      const controller = createMechanisms(room, () => {});
      try {
        for (let cycle = 0; cycle < 10; cycle++) {
          await controller.enter('trashcan', true);
          assert.equal(controller.snapshot().trashState, 'open');
          assert.ok(Math.abs(hinge.rotation.x + 100 * Math.PI / 180) < 1e-7);
          assert.ok(hinge.position.equals(pivot));
          assert.ok(bounds(lid, hinge, mesh => !belongsTo(mesh, node(room, 'VIS_TrashCanMovingKnuckle'))).getSize(new Vector3()).distanceTo(originalSize) < 1e-7);
          assert.equal(lid.parent, hinge);
          await controller.exit('trashcan', true);
          assert.equal(controller.snapshot().trashState, 'closed');
          assert.ok(Math.abs(hinge.rotation.x) < 1e-10);
        }
      } finally { controller.dispose(); dispose(); }
    });
  }

  if (registered.includes('lightswitch')) it('Switch: fixed plate and independent rocker fit their old frames and inherit only the original total-light toggle', async () => {
    const { room, dispose } = install(['lightswitch']);
    const fixed = node(room, 'VIS_LightSwitchPlate'), moving = node(room, 'VIS_LightSwitchRocker');
    const plate = node(room, 'DEC_LightSwitchPlate'), rocker = node(room, 'INT_LightSwitch');
    const fixedWorld = fixed.matrixWorld.clone(), pivot = rocker.position.clone();
    for (const [visual, anchorName] of [[fixed, 'DEC_LightSwitchPlate'], [moving, 'INT_LightSwitch']] as const) {
      const original = node(source, anchorName);
      assertBoxContains(bounds(original, original), bounds(visual, node(room, anchorName)), anchorName);
    }
    assert.equal(fixed.parent, plate); assert.equal(moving.parent, rocker);
    const controller = createMechanisms(room, () => {});
    try {
      for (let step = 0; step < 12; step++) {
        await controller.toggle('lightswitch', true);
        assert.ok(rocker.position.equals(pivot));
        assert.ok(fixed.matrixWorld.equals(fixedWorld));
        assert.ok(Math.abs(Math.abs(rocker.rotation.z) - 8 * Math.PI / 180) < 1e-6);
        const snapshot = controller.snapshot();
        assert.equal(snapshot.lightsState, step % 2 === 0 ? 'off' : 'on');
        assert.equal(Object.keys(snapshot.lightValues).length, 3);
      }
    } finally { controller.dispose(); dispose(); }
  });

  for (const id of registered.filter((value): value is 'keyboard' | 'mouse' => value === 'keyboard' || value === 'mouse')) {
    it(`${id}: original footprint and upper envelope remain fixed while authored feet reach the actual desk`, () => {
      const { room, dispose } = install(['desk', id]);
      try {
        const anchorName = id === 'keyboard' ? 'TEC_Keyboard' : 'TEC_Mouse', visualName = id === 'keyboard' ? 'VIS_Keyboard' : 'VIS_Mouse';
        const anchor = node(room, anchorName), original = node(source, anchorName), visual = node(room, visualName);
        const allowed = bounds(original, original), actual = bounds(visual, anchor), deskTop = bounds(node(room, 'VIS_Desk')).max.y;
        // Existing proxies float by 12 mm / 8.5 mm. Feet can extend downward only;
        // the original X/Z footprint and maximum Y remain the layout contract.
        allowed.min.y = deskTop - anchor.getWorldPosition(new Vector3()).y;
        assertBoxContains(allowed, actual, `${id} with support feet`);
        const world = bounds(visual);
        assert.ok(world.min.y - deskTop >= -.00001 && world.min.y - deskTop <= .001, `${id} must be supported by the desktop`);
        assert.equal(resolveInteraction(firstRayHit(meshes(visual)[0]).object), null, 'Desktop accessory must not become a tenth interaction');
      } finally { dispose(); }
    });
  }

  if (registered.includes('headphones')) it('Headphones: original envelope contains an actual central stand reaching from the base to the headband', () => {
    const { room, dispose } = install(['desk', 'headphones']);
    try {
      const anchor = node(room, 'TEC_Headphones'), visual = node(room, 'VIS_Headphones'), original = node(source, 'TEC_Headphones');
      assertBoxContains(bounds(original, original), bounds(visual, anchor), 'Headphone and stand envelope');
      const deskTop = bounds(node(room, 'VIS_Desk')).max.y, box = bounds(visual);
      assert.ok(box.min.y - deskTop >= -.00001 && box.min.y - deskTop <= .001);
      // Frozen proxy has a base and two side headphone arms but no center support.
      // Rays at three central heights prove an actual post exists, independent of mesh names.
      for (const height of [.03, .09, .15]) {
        const hits = rayInFrame(visual, anchor, new Vector3(0, height, .09), new Vector3(0, 0, -1));
        assert.ok(hits.some(hit => Math.abs(hit.localPoint.z) <= .06), `Missing central stand at height ${height}`);
      }
      const headband = rayInFrame(visual, anchor, new Vector3(0, .26, 0), new Vector3(0, -1, 0));
      assert.ok(headband[0] && headband[0].localPoint.y > .18 && headband[0].localPoint.y <= .22001, 'Headband must arch over the center support');
      assert.equal(box.intersectsBox(bounds(node(source, 'TEC_Marshall'))), false);
      assert.equal(box.intersectsBox(bounds(node(source, 'TEC_Phone'))), false);
    } finally { dispose(); }
  });
});
