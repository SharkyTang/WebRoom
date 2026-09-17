import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Mesh, MeshStandardMaterial, type Group, type Material } from 'three';
import { resolveInteraction, type InteractionId } from '@/lib/room/interactiveObjects';
export function HoverHighlight({ room, hovered }: { room: Group; hovered: InteractionId | null }) {
  const invalidate = useThree(state => state.invalidate);
  useEffect(() => {
    if (!hovered) return;
    const originals = new Map<Mesh, Material | Material[]>();
    const temporary: Material[] = [];
    room.traverse(object => {
      if (!(object instanceof Mesh) || resolveInteraction(object) !== hovered) return;
      originals.set(object, object.material);
      const tint = (original: Material) => {
        const clone = original.clone();
        if (clone instanceof MeshStandardMaterial) { clone.emissive.set('#6f9ab4'); clone.emissiveIntensity += 0.13; }
        temporary.push(clone); return clone;
      };
      object.material = Array.isArray(object.material) ? object.material.map(tint) : tint(object.material);
    });
    invalidate();
    return () => { originals.forEach((material, object) => { object.material = material; }); temporary.forEach(material => material.dispose()); invalidate(); };
  }, [room, hovered, invalidate]);
  return null;
}
