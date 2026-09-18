import { Mesh, MeshStandardMaterial, Texture, type Object3D } from 'three';
import { assetFamilies } from './assetManifest';
import { getAssetStateBinding } from './assetAssembly';

/** Development-only caller; material state is observed, never changed. */
export function describeAssetVisuals(room: Object3D) {
  return Object.fromEntries(assetFamilies.map(id => {
    const materials = new Set<string>(), textures = new Set<Texture>();
    let meshes = 0, triangles = 0;
    const materialState: { mesh: string; name: string; color: string; emissive: string; emissiveIntensity: number }[] = [];
    room.traverse(node => {
      if (!(node instanceof Mesh) || node.userData.roomAssetFamily !== id) return;
      meshes++; triangles += (node.geometry.index?.count ?? node.geometry.attributes.position.count) / 3;
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
        materials.add(material.uuid);
        for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value);
        if (material instanceof MeshStandardMaterial) materialState.push({ mesh: node.name, name: material.name, color: material.color.getHexString(), emissive: material.emissive.getHexString(), emissiveIntensity: material.emissiveIntensity });
      }
    });
    const binding = getAssetStateBinding(room, id);
    const stateSurfaces = binding?.meshes.flatMap(mesh => (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).filter((m): m is MeshStandardMaterial => m instanceof MeshStandardMaterial).map(material => ({
      name: mesh.name, material: material.name, emissiveIntensity: material.emissiveIntensity,
      mapName: material.map?.name ?? null, textureUpdates: Number(material.map?.userData.contentUpdates ?? 0),
    }))) ?? [];
    return [id, { meshes, triangles, materials: materials.size, textures: [...textures].map(texture => {
      const image = texture.image as { width?: number; height?: number } | undefined;
      return { uuid: texture.uuid, name: texture.name, width: image?.width ?? 0, height: image?.height ?? 0, colorSpace: texture.colorSpace, estimatedRGBABytesWithMipmaps: Math.ceil((image?.width ?? 0) * (image?.height ?? 0) * 4 * 4 / 3) };
    }), stateSurfaces, materialState }];
  }));
}
