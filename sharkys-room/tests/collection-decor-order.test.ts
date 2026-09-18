/** Real GLB arrival/disposal permutations for independently loaded families sharing an anchor. */
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { Material, Mesh, MeshStandardMaterial, Texture, type Group, type Object3D } from 'three';
import { assetManifest, type AssetDefinition, type AssetFamily } from '../lib/room/assets/assetManifest';
import { installAssetFamily, validateAssetFamily, validateAssembly } from '../lib/room/assets/assetAssembly';
import { fixtureRegistry, fixtureSourceLights } from '../lib/room/assets/fixtureRegistry';
import { validateScene } from '../lib/room/diagnostics';
import { FROZEN_NODE_RECORDS } from '../lib/room/sceneConstants';
import { readGeometryGlb } from './helpers/productionGlb';

const definitions = assetManifest as Record<string, AssetDefinition>;
const cFamilies = ['eiffel', 'hogwarts', 'minastirith', 'falcon', 'bridge', 'sls', 'ferrari', 'mercedes', 'plants', 'cola', 'dog', 'fixtures', 'wallart'];
// Exhaust all arrival/disposal orders within each connected shared-anchor component.
// Disjoint components cannot recurse into one another's original anchor subtrees.
const components = [
  { label: 'cup / coffee table', ids: ['cola', 'coffee'] },
  { label: 'dog / A bed', ids: ['dog', 'dogbed'] },
  { label: 'fixtures / desk / cabinet', ids: ['fixtures', 'desk', 'cabinet'] },
].filter(component => component.ids.every(id => Object.hasOwn(definitions, id)));
const exports = new Map<string, Awaited<ReturnType<typeof readGeometryGlb>>>();
let source: Group;
const asFamily = (id: string) => id as AssetFamily;

before(async () => {
  source = (await readGeometryGlb(new URL('../public/models/sharkys_room_blockout_FINAL.glb', import.meta.url))).scene;
  for (const id of new Set(components.flatMap(component => component.ids))) exports.set(id, await readGeometryGlb(new URL(`../public${definitions[id].url}`, import.meta.url)));
});

function node(scope: Object3D, name: string) { const object = scope.getObjectByName(name); assert.ok(object, name); return object; }
function meshes(scope: Object3D) { const found: Mesh[] = []; scope.traverse(object => { if (object instanceof Mesh) found.push(object); }); return found; }
function materials(mesh: Mesh): Material[] { return Array.isArray(mesh.material) ? mesh.material : [mesh.material]; }
function belongsTo(child: Object3D, parent: Object3D) { for (let p: Object3D | null = child; p; p = p.parent) if (p === parent) return true; return false; }
function permutations(ids: readonly string[]): string[][] {
  return ids.length ? ids.flatMap((id, index) => permutations(ids.filter((_, other) => other !== index)).map(rest => [id, ...rest])) : [[]];
}
function visibleFamily(room: Object3D, id: string) {
  for (const part of definitions[id].parts) {
    const root = node(room, part.root);
    assert.equal(root.parent, node(room, part.anchor), `${id}: preserved shared anchor`);
    for (const mesh of meshes(root)) {
      assert.equal(mesh.userData.roomAssetFamily, id);
      assert.equal(mesh.userData.roomProxySuppressed, undefined, `${id}: late sibling must not classify ${mesh.name} as a source proxy`);
      assert.ok(materials(mesh).some(material => material.visible), `${id}: actual material must remain visible for ${mesh.name}`);
      for (let ancestor: Object3D | null = mesh; ancestor; ancestor = ancestor.parent) assert.equal(ancestor.visible, true, `${id}: visible ancestor ${ancestor.name}`);
    }
  }
}
function trackResources(asset: Object3D) {
  const geometry = new Set(meshes(asset).map(mesh => mesh.geometry)), material = new Set(meshes(asset).flatMap(materials));
  const texture = new Set([...material].flatMap(value => Object.values(value).filter((entry): entry is Texture => entry instanceof Texture)));
  const resources = [...geometry, ...material, ...texture];
  const counts = new Map(resources.map(resource => [resource, 0]));
  const listeners = resources.map(resource => {
    const listener = () => { counts.set(resource, counts.get(resource)! + 1); };
    resource.addEventListener('dispose', listener); return { resource, listener };
  });
  return { counts, stop: () => listeners.forEach(({ resource, listener }) => resource.removeEventListener('dispose', listener)) };
}

describe('v0.6C real shared-anchor arrival order and ownership', () => {
  it('checks every currently registered shared-anchor component and requires complete C at the final gate', context => {
    assert.equal(validateScene(source).ok, true);
    assert.equal(FROZEN_NODE_RECORDS.length, 85);
    context.diagnostic(`Components: ${components.map(component => component.ids.join('+')).join(', ')}`);
    if (process.env.ROOM_REQUIRE_ALL_C === '1') {
      assert.ok(cFamilies.every(id => Object.hasOwn(definitions, id)), 'Final gate needs all 13 registered C families');
      assert.equal(components.length, 3);
    }
  });

  for (const component of components) for (const arrive of permutations(component.ids)) for (const leave of permutations(component.ids)) {
    it(`${component.label}: arrive ${arrive.join(' → ')}; dispose ${leave.join(' → ')}`, () => {
      const room = source.clone(true);
      const originals = meshes(room).map(mesh => ({ mesh, material: mesh.material, raycast: mesh.raycast, suppressed: mesh.userData.roomProxySuppressed }));
      const identities = FROZEN_NODE_RECORDS.map(record => { const object = node(room, record.name); return { object, parent: object.parent, position: object.position.clone(), quaternion: object.quaternion.clone(), scale: object.scale.clone() }; });
      const installed = new Map<string, ReturnType<typeof installAssetFamily>>();
      const snapshots = new Map<string, Array<{ mesh: Mesh; material: Mesh['material']; geometry: Mesh['geometry']; raycast: Mesh['raycast'] }>>();
      const tracked = new Map<string, ReturnType<typeof trackResources>>();
      try {
        for (const id of arrive) {
          const asset = exports.get(id)!.scene.clone(true);
          tracked.set(id, trackResources(asset));
          installed.set(id, installAssetFamily(room, asFamily(id), asset));
          snapshots.set(id, definitions[id].parts.flatMap(part => meshes(node(room, part.root))).map(mesh => ({ mesh, material: mesh.material, geometry: mesh.geometry, raycast: mesh.raycast })));
          for (const active of installed.keys()) {
            visibleFamily(room, active);
            for (const saved of snapshots.get(active)!) {
              assert.equal(saved.mesh.material, saved.material, `${id} arrival changed ${active} material`);
              assert.equal(saved.mesh.geometry, saved.geometry); assert.equal(saved.mesh.raycast, saved.raycast, `${id} arrival disabled ${active} raycast`);
            }
            for (const count of tracked.get(active)!.counts.values()) assert.equal(count, 0, `${active} resource disposed by arrival`);
          }
          const assembly = validateAssembly(room); assert.equal(assembly.ok, true, JSON.stringify(assembly.errors));
        }
        for (const id of leave) {
          const family = installed.get(id)!;
          family.dispose(); family.dispose(); installed.delete(id);
          for (const count of tracked.get(id)!.counts.values()) assert.equal(count, 1, `${id}: each owned resource released exactly once`);
          for (const part of definitions[id].parts) assert.equal(room.getObjectByName(part.root), undefined);
          for (const active of installed.keys()) {
            visibleFamily(room, active);
            for (const saved of snapshots.get(active)!) {
              assert.equal(saved.mesh.material, saved.material, `${id} disposal restored stale state over ${active}`);
              assert.equal(saved.mesh.geometry, saved.geometry); assert.equal(saved.mesh.raycast, saved.raycast);
            }
            for (const count of tracked.get(active)!.counts.values()) assert.equal(count, 0, `${id} disposal released live ${active} resource`);
          }
          const assembly = validateAssembly(room); assert.equal(assembly.ok, true, JSON.stringify(assembly.errors));
        }
        for (const saved of originals) { assert.equal(saved.mesh.material, saved.material); assert.equal(saved.mesh.raycast, saved.raycast); assert.equal(saved.mesh.userData.roomProxySuppressed, saved.suppressed); }
        for (const saved of identities) {
          assert.equal(node(room, saved.object.name), saved.object); assert.equal(saved.object.parent, saved.parent);
          assert.ok(saved.object.position.equals(saved.position) && saved.object.quaternion.equals(saved.quaternion) && saved.object.scale.equals(saved.scale));
        }
        assert.equal(validateScene(room).ok, true);
      } finally { [...installed.values()].reverse().forEach(family => family.dispose()); tracked.forEach(tracker => tracker.stop()); }
    });
  }

  if (Object.hasOwn(definitions, 'fixtures')) {
    it('declares all four exact registry surfaces and hierarchy checks while preserving the unresolved Lounge mapping', () => {
      const definition = definitions.fixtures, asset = exports.get('fixtures')!.scene;
      assert.equal(definition.stateSurface, null); assert.equal(definition.surfaceRole, 'none');
      assert.equal(definition.parts.length, 4); assert.equal(fixtureRegistry.length, 4);
      const surfaceMaterials = new Set<Material>();
      for (const fixture of fixtureRegistry) {
        const part = definition.parts.find(candidate => candidate.root === fixture.root);
        assert.ok(part); assert.equal(part.anchor, fixture.anchor);
        const expectedProxies = part.proxyMeshNames ?? meshes(node(source, part.anchor)).map(mesh => mesh.name);
        assert.deepEqual([...expectedProxies].sort(), [...fixture.proxyMeshNames].sort());
        assert.ok(definition.requiredNodes.includes(fixture.surface), `${fixture.surface}: strict required surface`);
        assert.ok(definition.requiredDescendants.some(item => item.node === fixture.surface && item.root === fixture.root), `${fixture.surface}: strict required parent`);
        const surface = node(asset, fixture.surface); assert.ok(belongsTo(surface, node(asset, fixture.root)));
        for (const mesh of meshes(surface)) for (const material of materials(mesh)) {
          assert.ok(material instanceof MeshStandardMaterial); assert.equal(material.name, fixture.surfaceMaterial);
          assert.equal(material.emissive.getHex(), 0); assert.equal(material.emissiveMap, null);
          assert.equal(material.transparent, false);
        }
        const owned = new Set(meshes(surface).flatMap(materials));
        for (const material of owned) { assert.equal(surfaceMaterials.has(material), false); surfaceMaterials.add(material); }
        assert.equal(fixture.runtimeBinding, null); assert.equal(fixture.stateSurface, null);
      }
      const lounge = fixtureRegistry.find(fixture => fixture.id === 'lounge')!;
      assert.equal(lounge.futureGroup, null); assert.equal(lounge.existingSourceLight, null); assert.equal(lounge.mappingStatus, 'unassigned');
      for (const sourceLight of Object.values(fixtureSourceLights)) {
        const actual = node(source, sourceLight.node); assert.equal(actual.parent?.name, sourceLight.parent);
        actual.position.toArray().forEach((value, index) => assert.ok(Math.abs(value - sourceLight.worldPosition[index]) < .00001));
      }
      assert.deepEqual(validateAssetFamily(asFamily('fixtures'), asset), []);
    });

    for (const problem of ['missing', 'duplicate', 'misparented'] as const) it(`fixtures reject a ${problem} registered surface before any source mutation`, () => {
      const room = source.clone(true), asset = exports.get('fixtures')!.scene.clone(true);
      const original = meshes(room).map(mesh => ({ mesh, material: mesh.material, raycast: mesh.raycast }));
      const target = fixtureRegistry[0], surface = node(asset, target.surface);
      if (problem === 'missing') surface.removeFromParent();
      if (problem === 'duplicate') surface.parent!.add(surface.clone(true));
      if (problem === 'misparented') node(asset, fixtureRegistry[1].root).add(surface);
      const errors = validateAssetFamily(asFamily('fixtures'), asset);
      assert.ok(errors.some(error => error.includes(target.surface)), JSON.stringify(errors));
      assert.throws(() => installAssetFamily(room, asFamily('fixtures'), asset));
      for (const saved of original) { assert.equal(saved.mesh.material, saved.material); assert.equal(saved.mesh.raycast, saved.raycast); }
      for (const fixture of fixtureRegistry) assert.equal(room.getObjectByName(fixture.root), undefined);
      assert.equal(validateScene(room).ok, true);
    });
  }
});
