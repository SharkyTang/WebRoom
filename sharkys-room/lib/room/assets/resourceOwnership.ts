import { BufferGeometry, Material, Mesh, Texture, type Object3D } from 'three';

/** Owns a single uncached loader result. Capture before its parts leave the loader scene. */
export function ownObjectResources(root: Object3D) {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  const images = new Set<{ close: () => void }>();
  root.traverse(node => {
    if (!(node instanceof Mesh)) return;
    geometries.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof Texture) {
        textures.add(value);
        const image = value.source?.data;
        if (image && typeof image.close === 'function') images.add(image);
      }
    }
  });
  let disposed = false;
  return {
    counts: { geometries: geometries.size, materials: materials.size, textures: textures.size },
    dispose() {
      if (disposed) return;
      disposed = true;
      geometries.forEach(value => value.dispose());
      materials.forEach(value => value.dispose());
      textures.forEach(value => value.dispose());
      images.forEach(value => value.close());
    },
  };
}
