import { gsap } from 'gsap';
import { type Object3D, type PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { getFocusPose } from './focusViews';
import type { InteractionId } from './interactiveObjects';
import { animationDurations, cameraEase } from './animationConstants';

export const CAMERA_ANIMATION = {
  duration: animationDurations.cameraFocus,
  returnDuration: animationDurations.cameraReturn,
  reducedMotionDuration: animationDurations.cameraReduced,
  ease: cameraEase,
} as const;

export type CameraPoseSnapshot = {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  fov: number;
  aspect: number;
  near: number;
  far: number;
  zoom: number;
};

export type CameraAnimationSnapshot = CameraPoseSnapshot & {
  hero: CameraPoseSnapshot;
  focusedObject: InteractionId | null;
  busy: boolean;
};

export type CameraAnimator = {
  focus: (id: InteractionId, reducedMotion?: boolean) => Promise<void>;
  home: (reducedMotion?: boolean) => Promise<void>;
  snapshot: () => CameraAnimationSnapshot;
  cancel: () => void;
  dispose: () => void;
};

function readPose(camera: PerspectiveCamera): CameraPoseSnapshot {
  return {
    position: camera.position.toArray(),
    quaternion: camera.quaternion.toArray(),
    fov: camera.fov,
    aspect: camera.aspect,
    near: camera.near,
    far: camera.far,
    zoom: camera.zoom,
  };
}

/** Animate only the render-camera clone. The source GLB camera stays untouched. */
export function createCameraAnimator(
  camera: PerspectiveCamera,
  room: Object3D,
  invalidate: () => void,
): CameraAnimator {
  const hero = readPose(camera);
  let tween: gsap.core.Tween | null = null;
  let settle: (() => void) | null = null;
  let disposed = false;
  let focusedObject: InteractionId | null = null;

  function cancel() {
    tween?.kill();
    tween = null;
    const resolve = settle;
    settle = null;
    resolve?.();
  }

  function applyProjection() {
    camera.fov = hero.fov;
    camera.aspect = hero.aspect;
    camera.near = hero.near;
    camera.far = hero.far;
    camera.zoom = hero.zoom;
    camera.updateProjectionMatrix();
  }

  function animate(position: Vector3, quaternion: Quaternion, id: InteractionId | null, reducedMotion: boolean) {
    cancel();
    if (disposed) return Promise.resolve();
    const fromPosition = camera.position.clone();
    const fromQuaternion = camera.quaternion.clone();
    const progress = { value: 0 };
    applyProjection();
    return new Promise<void>((resolve) => {
      settle = resolve;
      tween = gsap.to(progress, {
        value: 1,
        duration: reducedMotion ? CAMERA_ANIMATION.reducedMotionDuration : id === null ? CAMERA_ANIMATION.returnDuration : CAMERA_ANIMATION.duration,
        ease: CAMERA_ANIMATION.ease,
        onUpdate: () => {
          camera.position.lerpVectors(fromPosition, position, progress.value);
          camera.quaternion.slerpQuaternions(fromQuaternion, quaternion, progress.value);
          camera.updateMatrixWorld();
          invalidate();
        },
        onComplete: () => {
          // Explicit assignment removes interpolation drift, including on repeated returns.
          camera.position.copy(position);
          camera.quaternion.copy(quaternion);
          applyProjection();
          camera.updateMatrixWorld();
          focusedObject = id;
          tween = null;
          settle = null;
          invalidate();
          resolve();
        },
      });
    });
  }

  return {
    focus(id, reducedMotion = false) {
      if (disposed) return Promise.resolve();
      const pose = getFocusPose(room, id);
      return animate(pose.position, pose.quaternion, id, reducedMotion);
    },
    home(reducedMotion = false) {
      return animate(new Vector3(...hero.position), new Quaternion(...hero.quaternion), null, reducedMotion);
    },
    snapshot: () => ({ ...readPose(camera), hero: { ...hero, position: [...hero.position], quaternion: [...hero.quaternion] }, focusedObject, busy: tween !== null }),
    cancel,
    dispose() { disposed = true; cancel(); },
  };
}
