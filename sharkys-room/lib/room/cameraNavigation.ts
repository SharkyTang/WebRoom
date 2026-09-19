import { MOUSE, TOUCH, Vector3, type Object3D, type PerspectiveCamera } from 'three';
import { OrbitControls } from 'three-stdlib';
import { getFocusPose } from './focusViews';
import { createCameraCollision } from './cameraCollision';
import type { InteractionStore } from './interactionState';
import type { createPointerGestures } from './pointerGestures';

/** Event-driven controls: never update on idle frames or compete with the animator. */
export function createCameraNavigation(camera: PerspectiveCamera, room: Object3D, canvas: HTMLCanvasElement, store: InteractionStore, invalidate: () => void, gestures: ReturnType<typeof createPointerGestures>) {
  const heroPosition = camera.position.clone(), heroQuaternion = camera.quaternion.clone();
  const forward = new Vector3(0, 0, -1).applyQuaternion(heroQuaternion);
  const heroDistance = Math.abs(forward.y) > .001 ? (.75 - heroPosition.y) / forward.y : heroPosition.length();
  const heroTarget = heroPosition.clone().addScaledVector(forward, Math.max(1, heroDistance));
  const collision = createCameraCollision(room);
  let controls: OrbitControls | null = null;
  let view: string | null = null;
  const acceptedPosition = camera.position.clone(), acceptedQuaternion = camera.quaternion.clone();
  let restoring = false;
  function change() {
    if (!controls?.enabled || restoring) return;
    if (!collision.allows(acceptedPosition, camera.position)) {
      restoring = true;
      camera.position.copy(acceptedPosition); camera.quaternion.copy(acceptedQuaternion);
      // No damping/pan delta remains; recompute the spherical offset from the accepted pose.
      controls.update();
      camera.position.copy(acceptedPosition); camera.quaternion.copy(acceptedQuaternion);
      restoring = false;
    } else {
      acceptedPosition.copy(camera.position); acceptedQuaternion.copy(camera.quaternion);
    }
    camera.updateMatrixWorld(); invalidate();
  }
  function stop() {
    if (!controls) return;
    controls.enabled = false;
    controls.removeEventListener('change', change);
    controls.dispose(); controls = null; view = null;
    canvas.style.touchAction = 'none';
    gestures.cancel();
  }
  function synchronize() {
    const state = store.getSnapshot();
    const available = !state.isCameraBusy && ['idle', 'hovering', 'focused'].includes(state.interactionPhase);
    if (!available) { stop(); return; }
    const nextView = state.activeObject ?? 'hero';
    if (controls && view === nextView) return;
    stop();
    const pose = state.activeObject ? getFocusPose(room, state.activeObject) : null;
    const target = pose?.target ?? heroTarget;
    const distance = (pose?.position ?? heroPosition).distanceTo(target);
    // OrbitControls performs an initial lookAt. Restore the exact source/default pose before painting.
    const position = camera.position.clone(), quaternion = camera.quaternion.clone();
    controls = new OrbitControls(camera, canvas);
    controls.enabled = false; controls.target.copy(target);
    controls.enablePan = false; controls.enableDamping = false; controls.autoRotate = false;
    controls.enableRotate = true; controls.enableZoom = true;
    controls.rotateSpeed = .55; controls.zoomSpeed = .65;
    controls.minDistance = distance * (state.activeObject ? .7 : .65);
    controls.maxDistance = distance * (state.activeObject ? 1.6 : 1.4);
    controls.minPolarAngle = .12; controls.maxPolarAngle = Math.PI / 2 - .005;
    controls.mouseButtons = { LEFT: MOUSE.ROTATE, MIDDLE: undefined, RIGHT: undefined };
    controls.touches = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_ROTATE };
    camera.position.copy(position); camera.quaternion.copy(quaternion); camera.updateMatrixWorld();
    acceptedPosition.copy(position); acceptedQuaternion.copy(quaternion);
    collision.refresh();
    controls.addEventListener('change', change);
    controls.enabled = true; view = nextView;
  }
  // Rebuild only on ownership transitions, not on hovered object or per-frame updates.
  const unsubscribe = store.subscribe(synchronize);
  synchronize();
  return { dispose() { unsubscribe(); stop(); canvas.style.touchAction = 'none'; } };
}
