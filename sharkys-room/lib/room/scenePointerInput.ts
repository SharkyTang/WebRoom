import { Raycaster, Vector2, type Camera, type Object3D } from 'three';
import { bindPointerGestures } from './pointerGestures';
import { resolveInteraction } from './interactiveObjects';
import type { InteractionStore } from './interactionState';

/** One click route for empty canvas and meshes, with the same six-pixel gesture threshold. */
export function bindScenePointerInput(canvas: HTMLCanvasElement, scene: Object3D, camera: Camera, store: InteractionStore) {
  const gate = bindPointerGestures(canvas, () => store.hover(null));
  const ray = new Raycaster(), point = new Vector2();
  const click = (event: MouseEvent) => {
    // The gesture gate's earlier capture listener has already rejected drag/cancel releases.
    event.stopImmediatePropagation();
    const rect = canvas.getBoundingClientRect();
    point.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
    scene.updateWorldMatrix(true, true); camera.updateMatrixWorld(); ray.setFromCamera(point, camera);
    const hit = ray.intersectObject(scene, true)[0];
    void store.sceneClick(hit ? resolveInteraction(hit.object) : null);
  };
  canvas.addEventListener('click', click, true);
  return { gestures: gate.gestures, dispose() { canvas.removeEventListener('click', click, true); gate.dispose(); } };
}
