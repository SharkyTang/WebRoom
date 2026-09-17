import { Raycaster, Vector2, type Camera, type Object3D } from 'three';
import { resolveInteraction, runtimeInteractionTargets } from './interactiveObjects';

/** Read-only, on-demand diagnostic. Never called by the render/animation loop. */
export function debugHitTest(scene: Object3D, camera: Camera, canvas: HTMLCanvasElement, x: number, y: number) {
  const rect = canvas.getBoundingClientRect();
  scene.updateWorldMatrix(true, true);
  camera.updateMatrixWorld();
  const ray = new Raycaster();
  ray.setFromCamera(new Vector2((x - rect.x) / rect.width * 2 - 1, 1 - (y - rect.y) / rect.height * 2), camera);
  const hit = ray.intersectObject(scene, true)[0];
  if (!hit) return null;
  const ancestors: string[] = [];
  for (let node: Object3D | null = hit.object; node; node = node.parent) ancestors.push(node.name);
  return {
    node: hit.object.name,
    semanticId: resolveInteraction(hit.object),
    runtimeTarget: ancestors.find(name => name in runtimeInteractionTargets) ?? null,
    ancestors,
  };
}
