import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { before, describe, it } from 'node:test';
import { Box3, Matrix4, Mesh, MeshStandardMaterial, Ray, Raycaster, Texture, Triangle, Vector3, type Group, type Object3D } from 'three';
import { assetManifest, type AssetFamily } from '../lib/room/assets/assetManifest';
import { installAssetFamily, validateAssetFamily, validateAssembly } from '../lib/room/assets/assetAssembly';
import { validateScene } from '../lib/room/diagnostics';
import { resolveInteraction } from '../lib/room/interactiveObjects';
import { createMechanisms } from '../lib/room/mechanisms';
import { readGeometryGlb } from './helpers/productionGlb';

const aFamilies = ['floor', 'walls', 'door', 'window', 'curtains', 'desk', 'cabinet', 'bed', 'bedside', 'sofa', 'chair', 'coffee', 'sidetable', 'beanbag', 'rugs', 'dogbed'] as const;
type FurnitureFamily = typeof aFamilies[number];
type Bounds = { min: number[]; max: number[]; size: number[] };
type Solid = { label: string; localBoundsWeb: Bounds; worldBoundsWeb: Bounds };
type Contract = {
  assets: Record<string, { localBounds: Bounds | null; worldBounds: Bounds | null; originalSolidComponents: Solid[] }>;
  cabinet: { slots: Array<{ name: string; localBounds: Bounds; proxies: Array<{ name: string }> }> };
};
type Definition = { url: string; parts: ReadonlyArray<{ root: string; anchor: string; proxyMeshNames?: readonly string[] }> };
const definition = (id: FurnitureFamily): Definition => {
  const value = (assetManifest as Record<string, Definition>)[id];
  assert.ok(value, `v0.6A family must be centrally registered: ${id}`);
  return value;
};
const familyId = (id: FurnitureFamily) => id as AssetFamily;
const exported = new Map<FurnitureFamily, Awaited<ReturnType<typeof readGeometryGlb>>>();
let source: Group;
let contract: Contract;

before(async () => {
  source = (await readGeometryGlb(new URL('../public/models/sharkys_room_blockout_FINAL.glb', import.meta.url))).scene;
  contract = JSON.parse(await readFile(new URL('../validation/v06a/planning/frozen-space-contract.json', import.meta.url), 'utf8'));
  for (const id of aFamilies) exported.set(id, await readGeometryGlb(new URL(`../public${definition(id).url}`, import.meta.url)));
});

function node(root: Object3D, name: string) {
  const result = root.getObjectByName(name);
  assert.ok(result, name);
  return result;
}
function meshes(root: Object3D) {
  const result: Mesh[] = [];
  root.traverse(object => { if (object instanceof Mesh) result.push(object); });
  return result;
}
function asBox(bounds: Bounds) { return new Box3(new Vector3(...bounds.min), new Vector3(...bounds.max)); }
function triangles(root: Object3D, frame?: Object3D) {
  root.updateWorldMatrix(true, true); frame?.updateWorldMatrix(true, false);
  const inverse = frame ? frame.matrixWorld.clone().invert() : new Matrix4();
  const result: Triangle[] = [];
  for (const mesh of meshes(root)) {
    const matrix = inverse.clone().multiply(mesh.matrixWorld), position = mesh.geometry.getAttribute('position'), index = mesh.geometry.index;
    for (let start = 0; start < (index?.count ?? position.count); start += 3) {
      const point = (offset: number) => new Vector3().fromBufferAttribute(position, index?.getX(start + offset) ?? start + offset).applyMatrix4(matrix);
      result.push(new Triangle(point(0), point(1), point(2)));
    }
  }
  return result;
}
function triangleBox(triangle: Triangle) { return new Box3().setFromPoints([triangle.a, triangle.b, triangle.c]); }
function bounds(root: Object3D, frame?: Object3D) {
  const result = new Box3();
  for (const triangle of triangles(root, frame)) result.union(triangleBox(triangle));
  return result;
}
function assembled(ids: readonly FurnitureFamily[] = aFamilies) {
  const room = source.clone(true);
  const installs = ids.map(id => installAssetFamily(room, familyId(id), exported.get(id)!.scene.clone(true)));
  room.updateMatrixWorld(true);
  return { room, dispose: () => { installs.reverse().forEach(installation => installation.dispose()); } };
}
function visual(room: Object3D, id: FurnitureFamily) { return definition(id).parts.map(part => node(room, part.root)); }
function checkSolidMembership(root: Object3D, anchor: Object3D, solids: Solid[]) {
  const boxes = solids.map(solid => asBox(solid.localBoundsWeb).expandByScalar(.0001));
  const counts = boxes.map(() => 0);
  for (const triangle of triangles(root, anchor)) {
    const box = triangleBox(triangle);
    const members = boxes.map((solid, index) => solid.containsBox(box) ? index : -1).filter(index => index >= 0);
    assert.ok(members.length, `${root.name} triangle left every original solid volume: ${JSON.stringify([box.min.toArray(), box.max.toArray()])}`);
    members.forEach(index => { counts[index]++; });
  }
  counts.forEach((count, index) => assert.ok(count > 0, `Required solid remains modeled: ${solids[index].label}`));
}
function rayHitsMesh(mesh: Mesh) {
  for (const triangle of triangles(mesh)) {
    if (triangle.getArea() < 1e-12) continue;
    const normal = triangle.getNormal(new Vector3());
    const ray = new Raycaster(triangle.getMidpoint(new Vector3()).addScaledVector(normal, .01), normal.negate(), 0, .1);
    const hit = ray.intersectObject(mesh, false)[0];
    if (hit) return hit;
  }
  assert.fail(`Production geometry must be truly hittable: ${mesh.name}`);
}

describe('v0.6A source and production contracts', () => {
  it('preserves all frozen source files and all three v0.5 GLBs byte for byte', async () => {
    const ledger = JSON.parse(await readFile(new URL('../validation/v06a/baseline/source-ledger.json', import.meta.url), 'utf8')) as { files: Array<{ path: string; sha256: string }> };
    const protectedFiles = ledger.files.filter(record => /sharkys_room_blockout_FINAL\.(blend|glb)$|frozenSceneManifest\.json$|production\/(monitor|macbook|marshall)_pilot\.glb$/.test(record.path));
    assert.equal(protectedFiles.length, 7);
    for (const record of protectedFiles) {
      const bytes = await readFile(new URL(`../${record.path}`, import.meta.url));
      assert.equal(createHash('sha256').update(bytes).digest('hex'), record.sha256, record.path);
    }
    assert.equal(validateScene(source).ok, true);
  });

  for (const id of aFamilies) it(`${id} is a complete unique PBR/UV family with centrally registered identity roots`, () => {
    const asset = exported.get(id)!;
    assert.deepEqual(validateAssetFamily(familyId(id), asset.scene), []);
    const names = asset.json.nodes.map(object => object.name);
    assert.equal(new Set(names).size, names.length);
    for (const mesh of meshes(asset.scene)) {
      const position = mesh.geometry.getAttribute('position'), uv = mesh.geometry.getAttribute('uv'), normal = mesh.geometry.getAttribute('normal');
      assert.ok(position.count > 0 && uv && normal);
      assert.equal(position.count, uv.count);
      for (const attribute of [position, uv, normal]) assert.ok(Array.from(attribute.array).every(Number.isFinite));
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) assert.ok(material instanceof MeshStandardMaterial);
    }
  });

  for (const damage of ['empty part', 'duplicate visual name', 'undecoded texture', 'nonidentity root'] as const) {
    it(`rejects ${damage} before changing any frozen proxy or taking asset ownership`, () => {
      const id = damage === 'empty part' ? 'window' : 'bed';
      const asset = exported.get(id)!.scene.clone(true), room = source.clone(true);
      const root = node(asset, definition(id).parts[0].root);
      const originals = meshes(room).map(mesh => ({ mesh, parent: mesh.parent, material: mesh.material, raycast: mesh.raycast, visible: mesh.visible }));
      const objects: Object3D[] = []; room.traverse(object => objects.push(object));
      let disposed = 0;
      const onDispose = () => { disposed++; };
      const resources = new Set(meshes(asset).flatMap(mesh => [mesh.geometry, ...(Array.isArray(mesh.material) ? mesh.material : [mesh.material])]));
      resources.forEach(resource => resource.addEventListener('dispose', onDispose));
      let addedMaterial: MeshStandardMaterial | undefined;
      let addedTexture: Texture | undefined;
      if (damage === 'empty part') root.clear();
      if (damage === 'duplicate visual name') {
        const parts = meshes(asset);
        parts[1].name = parts[0].name;
      }
      if (damage === 'undecoded texture') {
        const mesh = meshes(asset)[0];
        addedMaterial = new MeshStandardMaterial();
        addedTexture = new Texture();
        addedMaterial.map = addedTexture;
        mesh.material = addedMaterial;
      }
      if (damage === 'nonidentity root') root.position.x = .02;
      try {
        assert.throws(() => installAssetFamily(room, familyId(id), asset));
        assert.equal(disposed, 0, 'A rejected family remains owned by its caller');
        const after: Object3D[] = []; room.traverse(object => after.push(object));
        assert.deepEqual(after, objects);
        for (const original of originals) {
          assert.equal(original.mesh.parent, original.parent);
          assert.equal(original.mesh.material, original.material);
          assert.equal(original.mesh.raycast, original.raycast);
          assert.equal(original.mesh.visible, original.visible);
          assert.equal(original.mesh.userData.roomProxySuppressed, undefined);
        }
        assert.equal(validateScene(room).ok, true);
      } finally {
        resources.forEach(resource => resource.removeEventListener('dispose', onDispose));
        addedMaterial?.dispose(); addedTexture?.dispose();
      }
    });
  }

  it('installs all A visuals while preserving source identities, normal static occlusion and Window semantic ancestry', () => {
    const { room, dispose } = assembled();
    try {
      const validation = validateAssembly(room);
      assert.equal(validation.ok, true, JSON.stringify(validation.errors));
      for (const id of aFamilies) for (const root of visual(room, id)) for (const mesh of meshes(root)) {
        const hit = rayHitsMesh(mesh);
        assert.equal(resolveInteraction(hit.object), id === 'window' ? 'window' : null, mesh.name);
      }
    } finally { dispose(); }
    assert.equal(validateScene(room).ok, true);
  });

  it('keeps opaque visual draw order independent of asynchronous family arrival without changing source or transparent sorting', () => {
    const assembleOrder = (ids: readonly FurnitureFamily[]) => {
      const room = source.clone(true);
      const originals = meshes(room).map(mesh => ({ mesh, renderOrder: mesh.renderOrder }));
      const assets = ids.map(id => ({ id, asset: exported.get(id)!.scene.clone(true) }));
      const transparent = meshes(assets.find(item => item.id === 'window')!.asset)[0];
      const material = (Array.isArray(transparent.material) ? transparent.material[0] : transparent.material).clone();
      material.transparent = true;
      transparent.material = material;
      transparent.renderOrder = -7;
      const before = assets.flatMap(({ asset }) => meshes(asset).map(mesh => ({ mesh, renderOrder: mesh.renderOrder })));
      const installs = assets.map(({ id, asset }) => installAssetFamily(room, familyId(id), asset));
      try {
        assert.equal(validateAssembly(room).ok, true);
        originals.forEach(({ mesh, renderOrder }) => assert.equal(mesh.renderOrder, renderOrder, mesh.name));
        assert.equal(transparent.renderOrder, -7);
        const opaque = meshes(room).filter(mesh => mesh.userData.roomAssetFamily && mesh !== transparent);
        assert.equal(new Set(opaque.map(mesh => mesh.renderOrder)).size, opaque.length);
        return Object.fromEntries(opaque.sort((a, b) => a.name.localeCompare(b.name)).map(mesh => [mesh.name, mesh.renderOrder]));
      } finally {
        installs.reverse().forEach(installation => installation.dispose());
        before.forEach(({ mesh, renderOrder }) => assert.equal(mesh.renderOrder, renderOrder, mesh.name));
        assert.equal(validateScene(room).ok, true);
      }
    };
    assert.deepEqual(assembleOrder(aFamilies), assembleOrder([...aFamilies].reverse()));
  });

  it('keeps every mounted root within its original horizontal and upper envelope, allowing only documented floor-support fill', () => {
    const { room, dispose } = assembled();
    try {
      for (const id of aFamilies) for (const part of definition(id).parts) {
        const anchor = node(room, part.anchor), root = node(room, part.root);
        const original = id === 'dogbed' ? bounds(node(source, 'DEC_DogBedProxy_Mesh'), node(source, part.anchor)) : asBox(contract.assets[part.anchor].localBounds!);
        // A fills pre-existing empty space below these objects without moving their bodies/anchors.
        if (['bed', 'sofa', 'chair', 'rugs'].includes(id)) original.min.y = -anchor.getWorldPosition(new Vector3()).y;
        const actual = bounds(root, anchor);
        assert.ok(original.expandByScalar(.001).containsBox(actual), `${part.root} escaped allowed local envelope: ${JSON.stringify([actual.min.toArray(), actual.max.toArray()])}`);
      }
      for (const triangle of triangles(visual(room, 'floor')[0])) for (const vertex of [triangle.a, triangle.b, triangle.c]) {
        assert.ok(vertex.x + vertex.z <= 4.60001, 'Frozen diagonal cutaway remains clipped');
        assert.ok(vertex.y <= .00001 && vertex.y >= -.12001);
      }
    } finally { dispose(); }
  });

  it('preserves only the dog placeholder primitive while replacing the dog-bed primitive, including reversible raycast ownership', () => {
    const room = source.clone(true);
    const bed = node(room, 'DEC_DogBedProxy_Mesh') as Mesh, dog = node(room, 'DEC_DogBedProxy_Mesh_1') as Mesh;
    const original = { bedMaterial: bed.material, bedRaycast: bed.raycast, dogMaterial: dog.material, dogRaycast: dog.raycast };
    const install = installAssetFamily(room, familyId('dogbed'), exported.get('dogbed')!.scene.clone(true));
    assert.equal(bed.userData.roomProxySuppressed, true);
    assert.notEqual(bed.raycast, original.bedRaycast);
    assert.equal(dog.userData.roomProxySuppressed, undefined);
    assert.equal(dog.material, original.dogMaterial);
    assert.equal(dog.raycast, original.dogRaycast);
    assert.ok(rayHitsMesh(dog));
    install.dispose();
    assert.equal(bed.material, original.bedMaterial); assert.equal(bed.raycast, original.bedRaycast);
    assert.equal(dog.material, original.dogMaterial); assert.equal(dog.raycast, original.dogRaycast);
    assert.equal(validateScene(room).ok, true);
  });
});

describe('v0.6A solid furniture and real free space', () => {
  it('keeps the nine furniture exports within their combined 55k-triangle and 2.6 MB delivery budget', async () => {
    const families = ['bed', 'bedside', 'sofa', 'chair', 'coffee', 'sidetable', 'beanbag', 'rugs', 'dogbed'] as const;
    const triangleCount = families.reduce((sum, family) => sum + triangles(exported.get(family)!.scene).length, 0);
    const bytes = await Promise.all(families.map(family => readFile(new URL(`../public${definition(family).url}`, import.meta.url))));
    assert.ok(triangleCount <= 55000, `Actual GLB triangle count ${triangleCount}`);
    assert.ok(bytes.reduce((sum, buffer) => sum + buffer.length, 0) <= 2600000);
  });

  it('exports front-facing formed bedding, a concave beanbag and a recessed dog bed instead of flattened or inverted soft surfaces', () => {
    const topAt = (family: FurnitureFamily, x: number, z: number) => {
      const asset = exported.get(family)!.scene;
      asset.updateMatrixWorld(true);
      const hit = new Raycaster(new Vector3(x, 2, z), new Vector3(0, -1, 0), 0, 3).intersectObjects(meshes(asset), false)[0];
      assert.ok(hit, `${family} must expose its upward-facing outer surface at ${x}, ${z}`);
      assert.ok(hit.face && hit.face.normal.y > 0, `${family} outside normals must face up`);
      return hit.point.y;
    };
    const cover = bounds(node(exported.get('bed')!.scene, 'VIS_BedFoldedCover'));
    assert.ok(cover.min.y >= .51 && cover.max.y <= .56, 'The entire folded cover remains inside its original envelope');
    assert.ok(cover.max.y - cover.min.y > .025, 'The closed cover has real fold relief and thickness');
    assert.ok(topAt('bed', -.4, -.67) > .65, 'Pillow retains its formed volume');
    assert.ok(topAt('beanbag', 0, -.34) - topAt('beanbag', 0, .05) > .18, 'The rear support rises above the depressed seat');
    assert.ok(topAt('dogbed', 0, -.29) - topAt('dogbed', 0, 0) > .08, 'The soft surround rises above the inset pad');
  });

  it('keeps visible headboard fabric ahead of its wood core and beanbag seams outside their shell without leaving frozen envelopes', () => {
    const bed = exported.get('bed')!.scene;
    bed.updateMatrixWorld(true);
    const wood = node(bed, 'VIS_BedWoodStructure'), linen = node(bed, 'VIS_BedLinenVolumes');
    for (const x of [-.55, -.25, .25, .55]) for (const y of [.62, .8, .92]) {
      const ray = new Raycaster(new Vector3(x, y, -.90), new Vector3(0, 0, -1), 0, .3);
      const fabricHit = ray.intersectObject(linen, true)[0], woodHit = ray.intersectObject(wood, true)[0];
      assert.ok(fabricHit && woodHit);
      assert.ok(fabricHit.point.z - woodHit.point.z > .003, 'Fabric must be in front of the wood, with no coincident front depth plane');
      assert.equal(ray.intersectObjects([wood, linen], true)[0].object, fabricHit.object);
    }
    const bag = exported.get('beanbag')!.scene;
    const shell = triangles(node(bag, 'VIS_BeanbagSculptedSeat'));
    const stitch = triangles(node(bag, 'VIS_BeanbagSeams'));
    const positions = new Map<string, Vector3>();
    for (const triangle of stitch) for (const point of [triangle.a, triangle.b, triangle.c, triangle.getMidpoint(new Vector3())]) {
      positions.set(point.toArray().map(value => value.toFixed(7)).join(','), point);
    }
    const direction = new Vector3(.317, .571, .759).normalize();
    let minimumClearance = Infinity;
    for (const point of positions.values()) {
      const ray = new Ray(point, direction), crossings: number[] = [];
      for (const triangle of shell) {
        const nearest = triangle.closestPointToPoint(point, new Vector3());
        minimumClearance = Math.min(minimumClearance, nearest.distanceTo(point));
        const hit = ray.intersectTriangle(triangle.a, triangle.b, triangle.c, false, new Vector3());
        if (hit) crossings.push(hit.distanceTo(point));
      }
      crossings.sort((a, b) => a - b);
      const unique = crossings.filter((distance, index) => index === 0 || Math.abs(distance - crossings[index - 1]) > 1e-7);
      assert.equal(unique.length % 2, 0, `Seam point penetrates the closed beanbag shell: ${point.toArray()}`);
    }
    assert.ok(minimumClearance > .0004, `Seam-to-shell separation must exceed depth-noise scale: ${minimumClearance}`);
    for (const [family, anchor] of [['bed', 'FUR_Bed'], ['beanbag', 'FUR_BeanBag']] as const) {
      const allowed = asBox(contract.assets[anchor].localBounds!);
      if (family === 'bed') allowed.min.y = 0;
      assert.ok(allowed.expandByScalar(.001).containsBox(bounds(exported.get(family)!.scene)));
    }
  });

  it('models all four desk solids without filling the piano cavity, and clears 15 samples plus the five named travel fractions', () => {
    const { room, dispose } = assembled();
    const desk = visual(room, 'desk')[0], anchor = node(room, 'FUR_Desk');
    const rail = node(room, 'INT_PianoRail'), initial = rail.position.z;
    try {
      checkSolidMembership(desk, anchor, contract.assets.FUR_Desk.originalSolidComponents);
      const solids = triangles(desk);
      const fractions = [...new Set([0, .25, .5, .75, 1, ...Array.from({ length: 15 }, (_, index) => index / 14)])];
      assert.equal(fractions.length, 17);
      for (const fraction of fractions) {
        rail.position.z = initial - .65 + fraction * .65;
        room.updateMatrixWorld(true);
        const piano = bounds(node(room, 'INT_Piano')).expandByScalar(-.000001);
        assert.equal(solids.filter(triangle => piano.intersectsTriangle(triangle)).length, 0, `Desk surface intersects piano at ${fraction}`);
        for (const root of visual(room, 'chair')) assert.equal(triangles(root).filter(triangle => piano.intersectsTriangle(triangle)).length, 0, `Chair intersects piano at ${fraction}`);
      }
    } finally { rail.position.z = initial; dispose(); }
  });

  it('keeps the 13 original cabinet solids and every registered slot free of the ten frozen DSP proxies', () => {
    const { room, dispose } = assembled();
    try {
      const anchor = node(room, 'FUR_DisplayCabinet'), root = visual(room, 'cabinet')[0];
      const solids = contract.assets.FUR_DisplayCabinet.originalSolidComponents;
      assert.equal(solids.length, 13);
      checkSolidMembership(root, anchor, solids);
      const surfaces = triangles(root, anchor);
      assert.equal(contract.cabinet.slots.length, 10);
      for (const slot of contract.cabinet.slots) for (const proxy of slot.proxies) {
        const proxyBounds = bounds(node(room, proxy.name), anchor);
        assert.ok(asBox(slot.localBounds).expandByScalar(.000001).containsBox(proxyBounds), proxy.name);
        assert.equal(surfaces.filter(triangle => proxyBounds.clone().expandByScalar(-.000001).intersectsTriangle(triangle)).length, 0, `${proxy.name} crosses a real cabinet panel`);
      }
    } finally { dispose(); }
  });

  it('supports the existing devices and lamps at the original tabletop heights using new visible triangles', () => {
    const { room, dispose } = assembled();
    try {
      for (const [family, itemName, expectedY] of [
        ['desk', 'TEC_MonitorBody', .74], ['desk', 'TEC_Marshall', .74],
        ['bedside', 'DEC_Lamp_Bedside', .58], ['sidetable', 'DEC_Lamp_Lounge', .54],
        ['coffee', 'DEC_Plant_CoffeeTable', .48],
      ] as const) {
        const item = bounds(node(room, itemName));
        const point = item.getCenter(new Vector3());
        const ray = new Raycaster(new Vector3(point.x, expectedY + .025, point.z), new Vector3(0, -1, 0), 0, .08);
        const hit = ray.intersectObjects(visual(room, family).flatMap(meshes), false)[0];
        assert.ok(hit, `${family} must support ${itemName}`);
        assert.ok(Math.abs(hit.point.y - expectedY) < .001, `${itemName} support height drifted`);
      }
    } finally { dispose(); }
  });

  it('places tagged bed/sofa/chair support bottoms on actual new floor/rug surfaces instead of preserving old floating gaps', () => {
    const { room, dispose } = assembled();
    try {
      const ground = [...visual(room, 'floor'), ...visual(room, 'rugs')].flatMap(meshes);
      for (const family of ['bed', 'sofa', 'chair'] as const) {
        const supports = visual(room, family).flatMap(meshes).filter(mesh => mesh.userData.v06a_support === true || /Support/.test(mesh.name));
        assert.ok(supports.length > 0, `${family} has inspectable support geometry`);
        for (const support of supports) {
          const facets = triangles(support), minimum = bounds(support).min.y;
          const bottom = facets.flatMap(triangle => [triangle.a, triangle.b, triangle.c]).filter(vertex => Math.abs(vertex.y - minimum) < 1e-5);
          assert.ok(bottom.length > 0);
          for (const vertex of bottom) {
            const hit = new Raycaster(vertex.clone().add(new Vector3(0, .04, 0)), new Vector3(0, -1, 0), 0, .1).intersectObjects(ground, false)[0];
            assert.ok(hit, `${family} support has a floor beneath it`);
            assert.ok(Math.abs(vertex.y - hit.point.y) <= .001, `${support.name} support floats or penetrates floor/rug by ${vertex.y - hit.point.y}m`);
          }
        }
      }
    } finally { dispose(); }
  });

  it('preserves the piano absolute endpoints through 20 complete cycles with all A furniture installed', async () => {
    const { room, dispose } = assembled();
    const mechanisms = createMechanisms(room, () => {});
    const endpoints = mechanisms.snapshot().sourceEndpoints;
    try {
      for (let cycle = 0; cycle < 20; cycle++) {
        await mechanisms.toggle('piano', true);
        assert.equal(node(room, 'INT_PianoRail').position.z, endpoints.pianoRetractedZ);
        await mechanisms.toggle('piano', true);
        assert.equal(node(room, 'INT_PianoRail').position.z, endpoints.pianoExtendedZ);
      }
      assert.equal(endpoints.pianoTravel, .65);
      assert.equal(validateAssembly(room).ok, true);
    } finally { mechanisms.dispose(); dispose(); }
    assert.equal(validateScene(room).ok, true);
  });
});
