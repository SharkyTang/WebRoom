import { Matrix4, Quaternion, Vector3, type Object3D } from 'three';
import { interactiveObjects, type InteractionId } from './interactiveObjects';

export type FocusView = {
  /** Three/glTF Y-up metres, relative to the frozen semantic target. */
  offset: readonly [number, number, number];
  /** Small framing adjustment only; the frozen target itself is never moved. */
  lookOffset: readonly [number, number, number];
  note: string;
};

/** All nine views retain the 48 mm Hero projection and the 3:2 contain viewport. */
export const focusViews = {
  monitor: { offset: [0.15, 0.32, 2.05], lookOffset: [0, 0, 0], note: 'Front workstation view, above the keyboard and chair.' },
  macbook: { offset: [0.25, 0.48, 1.05], lookOffset: [0, -0.06, 0], note: 'Raised front view, aimed 6 cm below the target so the complete base and opened screen fit.' },
  ipad: { offset: [0.4, 1, 0.9], lookOffset: [0, 0, 0], note: 'Oblique top view of the tablet, clear of the coffee table.' },
  marshall: { offset: [0.35, 0.35, 1.1], lookOffset: [0, 0, 0], note: 'Front right view of the independent speaker proxy.' },
  piano: { offset: [0.9, 0.7, 1.6], lookOffset: [0, 0, -0.2], note: 'Raised front right view includes both rail endpoints without entering the chair.' },
  trashcan: { offset: [0.2, 0.68, 1.15], lookOffset: [0, -0.1, 0], note: 'Approach from the aisle between desk and bed, looking down at the lid.' },
  lightswitch: { offset: [0.9, 0.18, 0.35], lookOffset: [0, 0, 0], note: 'Face the left wall from inside the room, above the sofa arm.' },
  phone: { offset: [0.24, 0.36, 0.82], lookOffset: [0, 0, 0], note: 'Close front right view, above the desktop and mouse.' },
  window: { offset: [0.45, 0.3, 3.8], lookOffset: [0, 0, 0], note: 'Wider window overview above the workstation; no move through the window wall.' },
} as const satisfies Record<InteractionId, FocusView>;

export type FocusPose = {
  position: Vector3;
  quaternion: Quaternion;
  target: Vector3;
};

/** Compute a view from the loaded target, so no Blender conversion is reapplied. */
export function getFocusPose(room: Object3D, id: InteractionId): FocusPose {
  const targetNode = room.getObjectByName(interactiveObjects[id].target);
  if (!targetNode) throw new Error(`Missing camera focus target: ${interactiveObjects[id].target}`);
  targetNode.updateWorldMatrix(true, false);
  const origin = targetNode.getWorldPosition(new Vector3());
  const view = focusViews[id];
  const position = origin.clone().add(new Vector3(...view.offset));
  const target = origin.clone().add(new Vector3(...view.lookOffset));
  const quaternion = new Quaternion().setFromRotationMatrix(
    new Matrix4().lookAt(position, target, new Vector3(0, 1, 0)),
  );
  return { position, quaternion, target };
}
