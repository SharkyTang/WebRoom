/** Read-only actual GLB measurements. Writes this planning directory only. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Box3, Matrix4, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const project = new URL('../../../', import.meta.url);
const out = new URL('./', import.meta.url);
const metadata = JSON.parse(await readFile(new URL('../blockout_FINAL/build_FINAL_metadata.json', project), 'utf8'));
const freeze = JSON.parse(await readFile(new URL('../blockout_FINAL/spatial_freeze_manifest.json', project), 'utf8'));
const components = JSON.parse(await readFile(new URL('./blender-solid-components.json', out), 'utf8'));
const bytes = await readFile(new URL('public/models/sharkys_room_blockout_FINAL.glb', project));
const sha256 = createHash('sha256').update(bytes).digest('hex');
assert.equal(sha256, freeze.files['sharkys_room_blockout_FINAL.glb']);
const room = (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;
room.updateMatrixWorld(true);
const node = name => { const value = room.getObjectByName(name); assert.ok(value, name); return value; };
const vec = value => new Vector3(...value);
const box = value => new Box3(vec(value.min ?? value[0]), vec(value.max ?? value[1]));
const recordBox = value => ({ min: value.min.toArray(), max: value.max.toArray(), size: value.getSize(new Vector3()).toArray() });
const web = ([x, y, z]) => [x, z, -y];
const convertBounds = value => {
  const result = new Box3();
  for (const x of [value[0][0], value[1][0]]) for (const y of [value[0][1], value[1][1]]) for (const z of [value[0][2], value[1][2]]) result.expandByPoint(vec(web([x, y, z])));
  return result;
};
function geometryBounds(object, frame = null) {
  object.updateWorldMatrix(true, true);
  frame?.updateWorldMatrix(true, false);
  const inverse = frame ? frame.matrixWorld.clone().invert() : new Matrix4();
  const result = new Box3();
  object.traverse(mesh => {
    if (!(mesh instanceof Mesh)) return;
    const transform = inverse.clone().multiply(mesh.matrixWorld);
    const positions = mesh.geometry.getAttribute('position');
    for (let index = 0; index < positions.count; index++) result.expandByPoint(new Vector3().fromBufferAttribute(positions, index).applyMatrix4(transform));
  });
  return result;
}
function primitiveRecord(mesh, anchor) {
  return { name: mesh.name, materials: (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(material => material.name),
    triangles: (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3,
    localBounds: recordBox(geometryBounds(mesh, anchor)), worldBounds: recordBox(geometryBounds(mesh)) };
}
function overlap(a, b) {
  const lengths = ['x', 'y', 'z'].map(axis => Math.min(a.max[axis], b.max[axis]) - Math.max(a.min[axis], b.min[axis]));
  return { intersectsSolid: lengths.every(length => length > 1e-6), signedOverlapXYZ: lengths,
    separationXYZ: ['x', 'y', 'z'].map(axis => Math.max(0, a.min[axis] - b.max[axis], b.min[axis] - a.max[axis])) };
}

const assetNodes = Object.keys(components.objects).filter(name => name !== 'INT_Piano');
const assets = Object.fromEntries(assetNodes.map(name => {
  const object = node(name);
  const primitiveMeshes = [];
  object.traverse(mesh => { if (mesh instanceof Mesh) primitiveMeshes.push(primitiveRecord(mesh, object)); });
  const actualWorld = geometryBounds(object);
  const frozenBlenderBounds = freeze.objects[name].world_bounds;
  const expectedWorld = frozenBlenderBounds ? convertBounds(frozenBlenderBounds) : null;
  if (expectedWorld) assert.ok(actualWorld.min.distanceTo(expectedWorld.min) < 1e-6 && actualWorld.max.distanceTo(expectedWorld.max) < 1e-6, `${name} GLB matches frozen .blend bounds`);
  return [name, { type: object.type, parent: object.parent?.name,
    translation: object.position.toArray(), quaternion: object.quaternion.toArray(), scale: object.scale.toArray(),
    worldMatrixColumnMajor: object.matrixWorld.toArray(),
    localBounds: primitiveMeshes.length ? recordBox(geometryBounds(object, object)) : null,
    worldBounds: primitiveMeshes.length ? recordBox(actualWorld) : null,
    primitiveMeshes, originalSolidComponents: components.objects[name].components ?? [],
    localOriginRule: 'Keep original anchor TRS/parent; exported VIS root identity; model vertices in these glTF Y-up local metres.' }];
}));

const desk = components.objects.FUR_Desk.components;
const chair = components.objects.FUR_OfficeChair.components;
const tabletop = box(desk.find(component => component.label === 'tabletop').worldBoundsWeb);
const rail = node('INT_PianoRail');
const piano = node('INT_Piano');
const authored = rail.position.z;
const travel = .65;
const samples = [...new Set([0, .25, .5, .75, 1, ...Array.from({ length: 15 }, (_, index) => index / 14)])].sort((a, b) => a - b).map(fraction => {
  rail.position.z = authored - travel + fraction * travel;
  room.updateMatrixWorld(true);
  const pianoBounds = geometryBounds(piano);
  const testSolids = list => list.map(component => ({ component: component.label, ...overlap(pianoBounds, box(component.worldBoundsWeb)) }));
  const deskSolids = testSolids(desk), chairSolids = testSolids(chair);
  assert.ok(deskSolids.every(pair => !pair.intersectsSolid));
  assert.ok(chairSolids.every(pair => !pair.intersectsSolid));
  return { fraction, railLocalZ: rail.position.z, pianoWorldBounds: recordBox(pianoBounds),
    tabletopVerticalClearance: tabletop.min.y - pianoBounds.max.y, deskSolids, chairSolids };
});
rail.position.z = authored;
room.updateMatrixWorld(true);

const pianoEnvelope = new Box3();
samples.forEach(sample => pianoEnvelope.union(box(sample.pianoWorldBounds)));
const hitArea = new Box3(vec([-.65, .52, -1.35]).sub(vec([1.5, .32, .4]).multiplyScalar(.5)), vec([-.65, .52, -1.35]).add(vec([1.5, .32, .4]).multiplyScalar(.5)));
const cabinet = node('FUR_DisplayCabinet');
const cabinetSlots = metadata.cabinet_compartments.map(slot => {
  const local = convertBounds(slot.bounds_local);
  const world = local.clone().applyMatrix4(cabinet.matrixWorld);
  const proxies = slot.proxies.map(name => {
    const object = node(name), localBounds = geometryBounds(object, cabinet);
    const lower = localBounds.min.clone().sub(local.min).toArray();
    const upper = local.max.clone().sub(localBounds.max).toArray();
    assert.ok([...lower, ...upper].every(value => value >= -1e-6), `${name} remains inside frozen compartment`);
    const panelChecks = components.objects.FUR_DisplayCabinet.components.map(component => ({ panel: component.label, ...overlap(localBounds, box(component.localBoundsWeb)) }));
    assert.ok(panelChecks.every(pair => !pair.intersectsSolid), `${name} avoids all 13 real solid panels`);
    return { name, parent: object.parent.name, translation: object.position.toArray(), quaternion: object.quaternion.toArray(), scale: object.scale.toArray(),
      localToCabinetBounds: recordBox(localBounds), worldBounds: recordBox(geometryBounds(object)),
      lowerClearanceXYZ: lower, upperClearanceXYZ: upper, panelChecks };
  });
  return { name: slot.name, localBounds: recordBox(local), worldBounds: recordBox(world),
    widthDepthHeight: [local.max.z - local.min.z, local.max.x - local.min.x, local.max.y - local.min.y], proxies };
});

const output = { measuredAt: new Date().toISOString(), inputGLBSHA256: sha256,
  units: 'metres; glTF/Three Y-up. Size arrays are X/Y/Z; explicit widthDepthHeight arrays follow their labels.',
  scope: 'Read-only planning for v0.6A only; no application/model/frozen asset edits.',
  assets,
  piano: { parent: piano.parent.name, railParent: rail.parent.name, retractedZ: authored - travel, extendedZ: authored, travel,
    sweptWorldEnvelope: recordBox(pianoEnvelope), sampleCount: samples.length, samples,
    hitAreaWorldBounds: recordBox(hitArea), existingHitAreaTabletopAABBRelation: overlap(hitArea, tabletop),
    warning: 'Existing Web hit-area box marginally overlaps the original tabletop corner; do not impose a new all-AABBs-disjoint requirement. Preserve current silhouette and validate real nearest mouse/touch hit behavior.' },
  cabinet: { anchor: 'FUR_DisplayCabinet', panelCount: 13, localSolidPanels: components.objects.FUR_DisplayCabinet.components, slots: cabinetSlots,
    rule: 'All 10 existing DSP proxies remain frozen and visible. Rounded edges may remove panel corners; do not expand solid faces into any registered slot.' },
  dogBed: { anchor: 'DEC_DogBedProxy', replaceOnlyPrimitive: 'DEC_DogBedProxy_Mesh', preservePrimitive: 'DEC_DogBedProxy_Mesh_1',
    bedComponent: components.objects.DEC_DogBedProxy.components[0], futureDogComponents: components.objects.DEC_DogBedProxy.components.slice(1),
    rule: 'A replaces only bedding. Existing two grey dog volumes are C placeholders and remain unchanged.' },
  protectedSupportHeights: { deskTop: .74, bedsideTableTop: .58, coffeeTableTop: .48, sideTableTop: .54, floorTop: 0 },
};
await writeFile(new URL('frozen-space-contract.json', out), JSON.stringify(output, null, 2));
console.log(JSON.stringify({ assets: assetNodes.length, solidDeskParts: desk.length, cabinetSlots: cabinetSlots.length,
  pianoSamples: samples.length, pianoClearanceM: samples[0].tabletopVerticalClearance,
  output: fileURLToPath(new URL('frozen-space-contract.json', out)) }, null, 2));
