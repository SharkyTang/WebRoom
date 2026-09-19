import type { Object3D } from 'three';

type InteractionDefinition = {
  label: string;
  nodes: readonly string[];
  target: string;
};

// Frozen GLB mapping. Mesh primitives inherit their owning node's ID.
export const interactiveObjects = {
  monitor: {
    label: 'Monitor',
    nodes: ['TEC_MonitorBody', 'TEC_MonitorScreen'],
    target: 'TGT_Monitor',
  },
  macbook: {
    label: 'MacBook',
    nodes: ['TEC_MacBookBase', 'TEC_MacBookScreen'],
    target: 'TGT_MacBook',
  },
  ipad: { label: 'iPad', nodes: ['TEC_iPad'], target: 'TGT_iPad' },
  marshall: { label: 'Marshall', nodes: ['TEC_Marshall'], target: 'TGT_Marshall' },
  piano: { label: 'Piano', nodes: ['INT_PianoRail', 'INT_Piano'], target: 'TGT_Piano' },
  trashcan: {
    label: 'Trash can',
    nodes: ['INT_TrashCanBody', 'INT_TrashCanLid'],
    target: 'TGT_TrashCan',
  },
  lightswitch: { label: 'Light switch', nodes: ['INT_LightSwitch'], target: 'TGT_LightSwitch' },
  phone: { label: 'Phone', nodes: ['TEC_Phone'], target: 'TGT_Phone' },
  window: {
    label: 'Window',
    nodes: ['ENV_WindowFrame', 'ENV_WindowGlass'],
    target: 'TGT_Window',
  },
} as const satisfies Record<string, InteractionDefinition>;

export type InteractionId = keyof typeof interactiveObjects;
export const interactionIds = Object.keys(interactiveObjects) as InteractionId[];
export const requiredNodeNames = Object.values(interactiveObjects).flatMap(({ nodes }) => [...nodes]);
export const requiredTargetNames = Object.values(interactiveObjects).map(({ target }) => target);

/** Web-owned raycast targets, never part of requiredNodeNames or the frozen GLB. */
export const runtimeInteractionTargets = {
  PianoRetractedHitArea: 'piano',
  VIS_PianoFixedMount: 'piano',
} as const satisfies Record<string, InteractionId>;

const semanticIdByNode = new Map<string, InteractionId>(
  [
    ...interactionIds.flatMap((id) => interactiveObjects[id].nodes.map((name) => [name, id] as const)),
    ...Object.entries(runtimeInteractionTargets),
  ],
);

/** GLTFLoader can wrap a multi-material node in a Group of primitive meshes. */
export function resolveInteraction(object: Object3D): InteractionId | null {
  let current: Object3D | null = object;
  while (current) {
    const id = semanticIdByNode.get(current.name);
    if (id) return id;
    current = current.parent;
  }
  return null;
}
