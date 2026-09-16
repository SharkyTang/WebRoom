import { Mesh, PerspectiveCamera, Vector3, type Material, type Object3D } from 'three';
import type { RoomTargetMapping, RoomValidation } from '@/types/room';
import { interactiveObjects, interactionIds, requiredNodeNames, requiredTargetNames } from './interactiveObjects';
import {
  FROZEN_NODE_RECORDS,
  HERO_CAMERA_NAME,
  ROOM_ROOT_NAME,
  SOURCE_MATERIAL_COUNT,
  SOURCE_MESH_COUNT,
  SOURCE_NODE_COUNT,
  SOURCE_PRIMITIVE_COUNT,
  SOURCE_TRIANGLE_COUNT,
} from './sceneConstants';

const EPSILON = 0.00001;
const frozenNames = new Set(FROZEN_NODE_RECORDS.map(({ name }) => name));

function close(actual: readonly number[], expected: readonly number[]): boolean {
  return actual.length === expected.length && actual.every((value, index) => Math.abs(value - expected[index]) < EPSILON);
}

function underRoomRoot(node: Object3D, roomRoot: Object3D): boolean {
  let ancestor: Object3D | null = node;
  while (ancestor) {
    if (ancestor === roomRoot) return true;
    ancestor = ancestor.parent;
  }
  return false;
}

/** Read-only validation of the loaded source hierarchy; never alters transforms/materials. */
export function validateScene(root: Object3D): RoomValidation {
  const byName = new Map<string, Object3D[]>();
  const errors: string[] = [];
  const materials = new Set<Material>();
  let meshCount = 0;
  let triangleCount = 0;

  root.traverse((object) => {
    const matches = byName.get(object.name) ?? [];
    matches.push(object);
    byName.set(object.name, matches);
    if (object instanceof Mesh) {
      meshCount++;
      const vertexCount = object.geometry.index?.count ?? object.geometry.attributes.position?.count ?? 0;
      triangleCount += vertexCount / 3;
      const meshMaterials: Material[] = Array.isArray(object.material) ? object.material : [object.material];
      meshMaterials.forEach((material) => materials.add(material));
    }
  });

  const find = (name: string): Object3D | undefined => byName.get(name)?.[0];
  const missingNodes = requiredNodeNames.filter((name) => !find(name));
  const missingTargets = requiredTargetNames.filter((name) => !find(name));
  const roomRoot = find(ROOM_ROOT_NAME);
  const nodeCount = [...byName.keys()].filter((name) => frozenNames.has(name)).length;

  for (const record of FROZEN_NODE_RECORDS) {
    const node = find(record.name);
    if (!node) {
      errors.push(`Missing frozen node: ${record.name}`);
      continue;
    }
    if (byName.get(record.name)?.length !== 1) errors.push(`Duplicate frozen node: ${record.name}`);
    if (record.parent !== null && node.parent?.name !== record.parent) {
      errors.push(`Hierarchy changed: ${record.name} must be a child of ${record.parent}`);
    }
    if (roomRoot && !underRoomRoot(node, roomRoot)) errors.push(`${record.name} is outside ${ROOM_ROOT_NAME}`);
    if (!close(node.position.toArray(), record.translation)
      || !close(node.quaternion.toArray(), record.rotation)
      || !close(node.scale.toArray(), record.scale)) {
      errors.push(`Frozen local transform changed: ${record.name}`);
    }
  }

  const camera = find(HERO_CAMERA_NAME);
  if (!(camera instanceof PerspectiveCamera)) errors.push(`Missing perspective camera: ${HERO_CAMERA_NAME}`);
  if (camera instanceof PerspectiveCamera) {
    const expected = FROZEN_NODE_RECORDS.find(({ name }) => name === HERO_CAMERA_NAME)?.camera;
    if (!expected || !close(
      [camera.fov * Math.PI / 180, camera.aspect, camera.near, camera.far],
      [expected.yfov, expected.aspectRatio, expected.znear, expected.zfar],
    )) {
      errors.push('Frozen Hero camera projection changed');
    }
  }

  if (nodeCount !== SOURCE_NODE_COUNT) errors.push(`Expected ${SOURCE_NODE_COUNT} frozen nodes; found ${nodeCount}`);
  if (meshCount !== SOURCE_PRIMITIVE_COUNT) errors.push(`Expected ${SOURCE_PRIMITIVE_COUNT} primitive meshes; found ${meshCount}`);
  if (triangleCount !== SOURCE_TRIANGLE_COUNT) errors.push(`Expected ${SOURCE_TRIANGLE_COUNT} triangles; found ${triangleCount}`);
  if (materials.size !== SOURCE_MATERIAL_COUNT) errors.push(`Expected ${SOURCE_MATERIAL_COUNT} materials; found ${materials.size}`);

  const position = new Vector3();
  const mappings: RoomTargetMapping[] = [];
  for (const id of interactionIds) {
    const definition = interactiveObjects[id];
    const target = find(definition.target);
    if (!target) continue;
    if (target instanceof Mesh || target instanceof PerspectiveCamera) errors.push(`Focus target must be an independent empty node: ${target.name}`);
    target.getWorldPosition(position);
    mappings.push({
      id,
      label: definition.label,
      nodeNames: [...definition.nodes],
      targetName: definition.target,
      targetPosition: position.toArray(),
    });
  }

  return {
    ok: missingNodes.length === 0 && missingTargets.length === 0 && errors.length === 0,
    missingNodes,
    missingTargets,
    errors,
    nodeCount,
    meshCount,
    sourceMeshCount: SOURCE_MESH_COUNT,
    triangleCount,
    materialCount: materials.size,
    mappings,
  };
}
