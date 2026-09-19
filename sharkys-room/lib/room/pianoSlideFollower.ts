import type { Object3D } from 'three';
import { FROZEN_NODE_RECORDS } from './sceneConstants';

/** Visual telescopic follower only; the original rail remains the sole motion source. */
export function createPianoSlideFollower(room: Object3D) {
  const rail = room.getObjectByName('INT_PianoRail');
  const middle = room.getObjectByName('VIS_PianoMiddleStage');
  const extended = FROZEN_NODE_RECORDS.find(node => node.name === 'INT_PianoRail')!.translation[2];
  const original = middle?.position.clone();
  return {
    update() {
      if (!rail || !middle || !original) return;
      middle.position.z = original.z + (rail.position.z - extended) / 2;
      middle.updateWorldMatrix(true, true);
    },
    dispose() { if (middle && original) { middle.position.copy(original); middle.updateWorldMatrix(true, true); } },
  };
}
