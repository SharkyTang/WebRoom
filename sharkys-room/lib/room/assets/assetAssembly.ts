import { Material, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PerspectiveCamera, Texture } from 'three';
import { FROZEN_NODE_RECORDS, HERO_CAMERA_NAME } from '../sceneConstants';
import { assetFamilies, assetManifest, type AssetDefinition, type AssetFamily } from './assetManifest';
import { ownObjectResources } from './resourceOwnership';
import { createScreenTexture, type ScreenTexture } from './screenTextures';

export type AssetBinding = { meshes: Mesh[]; screen?: ScreenTexture };
type Installed = { roots: Object3D[]; binding: AssetBinding; suppressed: Mesh[]; dispose: () => void };
const installed = new WeakMap<Object3D, Map<AssetFamily, Installed>>();
const sourceIdentities = new WeakMap<Object3D, Map<string, Object3D>>();
const near = (a: readonly number[], b: readonly number[], epsilon = 1e-5) => a.length === b.length && a.every((n, i) => Math.abs(n - b[i]) <= epsilon);
const noRaycast: Mesh['raycast'] = () => {};
const meshMaterials = (mesh: Mesh): Material[] => Array.isArray(mesh.material) ? mesh.material : [mesh.material];
function meshes(root: Object3D): Mesh[] {
  const result: Mesh[] = [];
  root.traverse(node => { if (node instanceof Mesh) result.push(node); });
  return result;
}
function unique(root: Object3D, name: string): Object3D | undefined {
  const matches: Object3D[] = [];
  root.traverse(node => { if (node.name === name) matches.push(node); });
  return matches.length === 1 ? matches[0] : undefined;
}

function belongsTo(node: Object3D, root: Object3D): boolean {
  for (let ancestor: Object3D | null = node; ancestor; ancestor = ancestor.parent) if (ancestor === root) return true;
  return false;
}

/** GLB completion order must not decide opaque contact-edge rasterization. */
function stabilizeVisualDrawOrder(registry: Map<AssetFamily, Installed>) {
  const opaque = [...registry.values()].flatMap(family => family.roots.flatMap(meshes))
    .filter(mesh => meshMaterials(mesh).every(material => !material.transparent))
    .sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  // Keep depth testing and the original/transparent render order intact.
  opaque.forEach((mesh, index) => { mesh.renderOrder = index + 1; });
}

/** Shared by pre-install and runtime validation so detached or mis-parented surfaces fail both. */
function validateRequiredHierarchy(id: AssetFamily, scope: Object3D): string[] {
  const errors: string[] = [];
  const definition = assetManifest[id];
  for (const name of definition.requiredNodes) if (!unique(scope, name)) errors.push(`Missing or duplicate ${name}`);
  for (const membership of definition.requiredDescendants) {
    const node = unique(scope, membership.node), root = unique(scope, membership.root);
    if (node && root && !belongsTo(node, root)) errors.push(`Visual hierarchy changed: ${membership.node} must belong to ${membership.root}`);
  }
  return errors;
}

/** Validates complete families before a single original primitive is hidden. */
export function validateAssetFamily(id: AssetFamily, asset: Object3D): string[] {
  const definition = assetManifest[id];
  const errors = validateRequiredHierarchy(id, asset);
  const partRoots = definition.parts.map(part => unique(asset, part.root)).filter((root): root is Object3D => Boolean(root));
  const names = new Set<string>();
  asset.traverse(node => {
    if (node === asset) return;
    if (names.has(node.name)) errors.push(`Duplicate visual node ${node.name}`);
    names.add(node.name);
    if (!node.name.startsWith(definition.prefix)) errors.push(`Unregistered visual node ${node.name}`);
    if (!partRoots.some(root => belongsTo(node, root))) errors.push(`Visual outside declared parts: ${node.name}`);
  });
  for (const part of definition.parts) {
    const root = unique(asset, part.root);
    if (!root) continue;
    if (!meshes(root).length) errors.push(`Empty visual part ${part.root}`);
    if (!near(root.position.toArray(), [0, 0, 0]) || !near(root.quaternion.toArray(), [0, 0, 0, 1]) || !near(root.scale.toArray(), [1, 1, 1])) errors.push(`Nonidentity anchor-local root ${part.root}`);
    if (root.parent !== asset) errors.push(`Part must be a direct export root: ${part.root}`);
  }
  const allMeshes = meshes(asset);
  if (!allMeshes.length) errors.push('No visual geometry');
  for (const mesh of allMeshes) {
    const position = mesh.geometry.attributes.position, uv = mesh.geometry.attributes.uv;
    if (!position || !uv || uv.count !== position.count) errors.push(`Missing UV/position ${mesh.name}`);
    if (!meshMaterials(mesh).every(material => material instanceof MeshStandardMaterial)) errors.push(`Non-PBR material ${mesh.name}`);
    for (const material of meshMaterials(mesh)) for (const value of Object.values(material)) if (value instanceof Texture) {
      const image = value.image as { width?: number; height?: number } | undefined;
      if (!(image?.width && image?.height)) errors.push(`Texture missing or undecoded: ${mesh.name}`);
    }
  }
  if (definition.stateSurface) {
    const surface = unique(asset, definition.stateSurface);
    if (!surface || !meshes(surface).length) errors.push(`No state surface ${definition.stateSurface}`);
  }
  if (id === 'marshall') {
    const grille = unique(asset, 'VIS_MarshallGrille');
    if (!grille || !meshes(grille).some(mesh => meshMaterials(mesh).some(material => {
      const map = (material as MeshStandardMaterial).map;
      const image = map?.image as { width?: number; height?: number } | undefined;
      return map instanceof Texture && (image?.width ?? 0) > 0 && (image?.height ?? 0) > 0;
    }))) errors.push('Marshall grille texture missing or undecoded');
  }
  return errors;
}

export function getAssetStateBinding(room: Object3D, id: string): AssetBinding | null {
  return installed.get(room)?.get(id as AssetFamily)?.binding ?? null;
}

/** Takes ownership of an uncached GLB family; dispose rolls back and releases only this family. */
export function installAssetFamily(room: Object3D, id: AssetFamily, asset: Object3D): Installed {
  const failures = validateAssetFamily(id, asset);
  if (failures.length) throw new Error(failures.join('; '));
  const registry = installed.get(room) ?? new Map<AssetFamily, Installed>();
  if (registry.has(id)) throw new Error(`Asset already installed: ${id}`);
  const definition: AssetDefinition = assetManifest[id];
  if (!sourceIdentities.has(room)) sourceIdentities.set(room, new Map(FROZEN_NODE_RECORDS.map(record => [record.name, room.getObjectByName(record.name)!])));
  const parts = definition.parts.map(part => {
    const anchor = unique(room, part.anchor), root = unique(asset, part.root)!;
    if (!anchor) throw new Error(`Missing or duplicate original anchor: ${part.anchor}`);
    if (room.getObjectByName(part.root)) throw new Error(`Visual root already present: ${part.root}`);
    const proxyMeshes = part.proxyMeshNames ? part.proxyMeshNames.map(name => {
      const proxy = unique(anchor, name);
      if (!(proxy instanceof Mesh)) throw new Error(`Missing original proxy primitive: ${name}`);
      return proxy;
    }) : meshes(anchor);
    return { anchor, root, parent: root.parent!, proxyMeshes };
  });
  const resourceOwner = ownObjectResources(asset);
  const visualOrders = meshes(asset).map(mesh => ({ mesh, renderOrder: mesh.renderOrder }));
  const originalMeshes = [...new Set(parts.flatMap(({ proxyMeshes }) => proxyMeshes))];
  const saved = originalMeshes.map(mesh => ({ mesh, material: mesh.material, raycast: mesh.raycast, suppressed: mesh.userData.roomProxySuppressed }));
  const hiddenMaterial = new MeshBasicMaterial({ visible: false });
  hiddenMaterial.name = `WebOnly_Suppressed_${id}_Proxy`;
  const surfaceMeshes = definition.stateSurface ? meshes(unique(asset, definition.stateSurface)!) : [];
  const surfaceOriginals = surfaceMeshes.map(mesh => ({ mesh, material: mesh.material }));
  const ownedStateMaterials: MeshStandardMaterial[] = [];
  let screen: ScreenTexture | undefined;
  let disposed = false;
  let ownsAsset = false;
  const record: Installed = {
    roots: parts.map(part => part.root), binding: { meshes: surfaceMeshes }, suppressed: originalMeshes,
    dispose() {
      if (disposed) return;
      disposed = true;
      parts.forEach(({ root, parent }) => { root.removeFromParent(); parent.add(root); });
      saved.forEach(({ mesh, material, raycast, suppressed }) => {
        mesh.material = material; mesh.raycast = raycast;
        if (suppressed === undefined) delete mesh.userData.roomProxySuppressed;
        else mesh.userData.roomProxySuppressed = suppressed;
      });
      surfaceOriginals.forEach(({ mesh, material }) => { mesh.material = material; });
      visualOrders.forEach(({ mesh, renderOrder }) => { mesh.renderOrder = renderOrder; });
      hiddenMaterial.dispose(); ownedStateMaterials.forEach(material => material.dispose()); screen?.dispose();
      if (ownsAsset) resourceOwner.dispose();
      if (registry.get(id) === record) registry.delete(id);
    },
  };
  try {
    if (definition.surfaceRole === 'screen' && typeof document !== 'undefined') screen = createScreenTexture(id as 'monitor' | 'macbook');
    record.binding.screen = screen;
    surfaceMeshes.forEach(mesh => {
      const copies = meshMaterials(mesh).map(original => {
        const material = (original as MeshStandardMaterial).clone();
        material.name = `Runtime_${id}_${definition.surfaceRole}`;
        if (definition.surfaceRole === 'screen') {
          material.color.set('#ffffff'); material.emissive.set('#ffffff'); material.emissiveIntensity = 1;
          material.metalness = 0; material.roughness = .45;
          if (screen) { material.map = screen.texture; material.emissiveMap = screen.texture; }
        } else { material.color.set('#395746'); material.emissive.set('#87dcad'); material.emissiveIntensity = 0; }
        ownedStateMaterials.push(material); return material;
      });
      mesh.material = Array.isArray(mesh.material) ? copies : copies[0];
    });
    saved.forEach(({ mesh }) => { mesh.material = hiddenMaterial; mesh.raycast = noRaycast; mesh.userData.roomProxySuppressed = true; });
    parts.forEach(({ root, anchor }) => {
      root.traverse(node => { node.userData.roomAssetFamily = id; });
      anchor.add(root);
    });
    registry.set(id, record); installed.set(room, registry);
    stabilizeVisualDrawOrder(registry);
    room.updateMatrixWorld(true);
    ownsAsset = true;
    return record;
  } catch (error) { record.dispose(); throw error; }
}

/** Source validation runs before assembly; this separate contract permits registered visuals and mechanical motion. */
export function validateAssembly(room: Object3D) {
  const errors: string[] = [];
  const registry = installed.get(room);
  const byName = new Map<string, Object3D[]>();
  let runtimeNodeCount = 0;
  room.traverse(node => { runtimeNodeCount++; const matches = byName.get(node.name) ?? []; matches.push(node); byName.set(node.name, matches); });
  for (const record of FROZEN_NODE_RECORDS) {
    const found = byName.get(record.name);
    if (found?.length !== 1) { errors.push(`Missing or duplicate source node: ${record.name}`); continue; }
    const node = found[0];
    const identity = sourceIdentities.get(room)?.get(record.name);
    if (identity && identity !== node) errors.push(`Original node identity replaced: ${record.name}`);
    if (record.parent && node.parent?.name !== record.parent) errors.push(`Source parent changed: ${record.name}`);
    if (!near(node.scale.toArray(), record.scale)) errors.push(`Source scale changed: ${record.name}`);
    if (record.name === 'INT_PianoRail') {
      if (!near(node.position.toArray().slice(0, 2), record.translation.slice(0, 2)) || node.position.z < -1.9399999618530273 - 1e-8 || node.position.z > -1.2899999618530273 + 1e-8) errors.push('Piano rail left its original path');
    } else if (!near(node.position.toArray(), record.translation)) errors.push(`Source origin changed: ${record.name}`);
    const moving = { TEC_MacBookScreen: [-1.832595821, 0], INT_TrashCanLid: [-100 * Math.PI / 180, 0], INT_LightSwitch: [-.139626368, .139626368] }[record.name];
    if (moving) {
      const axis = record.name === 'INT_LightSwitch' ? 'z' : 'x';
      const otherAxes = axis === 'x' ? [node.rotation.y, node.rotation.z] : [node.rotation.x, node.rotation.y];
      if (!near(otherAxes, [0, 0]) || node.rotation[axis] < moving[0] - 1e-5 || node.rotation[axis] > moving[1] + 1e-5) errors.push(`Mechanical rotation invalid: ${record.name}`);
    } else if (!near(node.quaternion.toArray(), record.rotation)) errors.push(`Static rotation changed: ${record.name}`);
  }
  const camera = room.getObjectByName(HERO_CAMERA_NAME);
  const expected = FROZEN_NODE_RECORDS.find(record => record.name === HERO_CAMERA_NAME)?.camera;
  if (!(camera instanceof PerspectiveCamera) || !expected || !near([camera.fov * Math.PI / 180, camera.aspect, camera.near, camera.far], [expected.yfov, expected.aspectRatio, expected.znear, expected.zfar])) errors.push('Source Hero projection changed');
  for (const [id, family] of registry ?? []) {
    errors.push(...validateRequiredHierarchy(id, room));
    for (const part of assetManifest[id].parts) {
      const root = unique(room, part.root);
      if (root?.parent?.name !== part.anchor) errors.push(`Assembly parent changed: ${part.root}`);
      if (root && (!near(root.position.toArray(), [0, 0, 0]) || !near(root.quaternion.toArray(), [0, 0, 0, 1]) || !near(root.scale.toArray(), [1, 1, 1]))) errors.push(`Visual root transform changed: ${part.root}`);
    }
    family.roots.forEach(root => root.traverse(node => {
      if (node.userData.roomAssetFamily !== id || !node.name.startsWith(assetManifest[id].prefix)) errors.push(`Unregistered visual: ${node.name}`);
    }));
    for (const mesh of family.suppressed) if (mesh.raycast !== noRaycast || meshMaterials(mesh).some(material => material.visible)) errors.push(`Original proxy still rendered/raycastable: ${mesh.name}`);
  }
  room.traverse(node => {
    if (node.name.startsWith('VIS_') && !assetFamilies.some(id => registry?.get(id)?.roots.some(root => { for (let p: Object3D | null = node; p; p = p.parent) if (p === root) return true; return false; }))) errors.push(`Unregistered runtime node ${node.name}`);
  });
  return { ok: errors.length === 0, errors, sourceNodeCount: FROZEN_NODE_RECORDS.filter(record => byName.has(record.name)).length, runtimeNodeCount, installedFamilies: [...(registry?.keys() ?? [])], suppressedProxyMeshes: [...(registry?.values() ?? [])].flatMap(family => family.suppressed.map(mesh => mesh.name)) };
}
