import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { PerspectiveCamera, type Group } from 'three';
import { createCameraAnimator } from '@/lib/room/cameraAnimation';
import { createMechanisms } from '@/lib/room/mechanisms';
import { HERO_CAMERA_NAME } from '@/lib/room/sceneConstants';
import type { InteractionStore } from '@/lib/room/interactionState';
import { bindScenePointerInput } from '@/lib/room/scenePointerInput';
import { createCameraNavigation } from '@/lib/room/cameraNavigation';
import { createPianoSlideFollower } from '@/lib/room/pianoSlideFollower';

export function CameraController({ room, store, onReady, runtimeCleanup }: { room: Group; store: InteractionStore; onReady: () => void; runtimeCleanup: { current: (() => void) | null } }) {
  const camera = useThree(state => state.camera);
  const invalidate = useThree(state => state.invalidate);
  const canvas = useThree(state => state.gl.domElement);
  const scene = useThree(state => state.scene);
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera) || camera.name !== HERO_CAMERA_NAME) return;
    const follower = createPianoSlideFollower(room);
    const detach = store.attach({ camera: createCameraAnimator(camera, room, invalidate), mechanisms: createMechanisms(room, () => { follower.update(); invalidate(); }) });
    follower.update();
    const input = bindScenePointerInput(canvas, scene, camera, store);
    const navigation = createCameraNavigation(camera, room, canvas, store, invalidate, input.gestures);
    let detached = false;
    const dispose = () => { if (!detached) { detached = true; navigation.dispose(); input.dispose(); detach(); follower.dispose(); } };
    runtimeCleanup.current = dispose;
    onReady(); invalidate();
    return () => { dispose(); if (runtimeCleanup.current === dispose) runtimeCleanup.current = null; };
  }, [camera, canvas, scene, room, store, invalidate, onReady, runtimeCleanup]);
  return null;
}
