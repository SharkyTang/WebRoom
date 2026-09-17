import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { PerspectiveCamera, type Group } from 'three';
import { createCameraAnimator } from '@/lib/room/cameraAnimation';
import { createMechanisms } from '@/lib/room/mechanisms';
import { HERO_CAMERA_NAME } from '@/lib/room/sceneConstants';
import type { InteractionStore } from '@/lib/room/interactionState';

export function CameraController({ room, store, onReady, runtimeCleanup }: { room: Group; store: InteractionStore; onReady: () => void; runtimeCleanup: { current: (() => void) | null } }) {
  const camera = useThree(state => state.camera);
  const invalidate = useThree(state => state.invalidate);
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera) || camera.name !== HERO_CAMERA_NAME) return;
    const detach = store.attach({ camera: createCameraAnimator(camera, room, invalidate), mechanisms: createMechanisms(room, invalidate) });
    let detached = false;
    const dispose = () => { if (!detached) { detached = true; detach(); } };
    runtimeCleanup.current = dispose;
    onReady(); invalidate();
    return () => { dispose(); if (runtimeCleanup.current === dispose) runtimeCleanup.current = null; };
  }, [camera, room, store, invalidate, onReady, runtimeCleanup]);
  return null;
}
