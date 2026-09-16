import type { InteractionId } from '@/lib/room/interactiveObjects';

export type { InteractionId } from '@/lib/room/interactiveObjects';

export type RoomTargetMapping = {
  id: InteractionId;
  label: string;
  nodeNames: string[];
  targetName: string;
  targetPosition: [number, number, number];
};

export type RoomValidation = {
  ok: boolean;
  missingNodes: string[];
  missingTargets: string[];
  errors: string[];
  /** Original glTF nodes only; ignores the loader's scene/primitive wrappers. */
  nodeCount: number;
  /** Runtime Mesh objects (one per glTF primitive), not glTF mesh definitions. */
  meshCount: number;
  sourceMeshCount: number;
  triangleCount: number;
  materialCount: number;
  mappings: RoomTargetMapping[];
};

export type RoomLoadStatus = 'loading' | 'ready' | 'error';

export type RoomPerformance = {
  fps: number;
  frameMs: number;
  calls: number;
  triangles: number;
};
