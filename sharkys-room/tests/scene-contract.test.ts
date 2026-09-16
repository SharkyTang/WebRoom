import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, describe, it } from 'node:test';
import { Group, Mesh, PerspectiveCamera, Vector3, type Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { validateScene } from '../lib/room/diagnostics';
import {
  interactiveObjects,
  interactionIds,
  requiredNodeNames,
  requiredTargetNames,
  resolveInteraction,
} from '../lib/room/interactiveObjects';
import {
  HERO_CAMERA_NAME,
  ROOM_ROOT_NAME,
  SOURCE_MATERIAL_COUNT,
  SOURCE_MESH_COUNT,
  SOURCE_NODE_COUNT,
  SOURCE_PRIMITIVE_COUNT,
  SOURCE_TRIANGLE_COUNT,
} from '../lib/room/sceneConstants';

let source: Group;

before(async () => {
  const bytes = await readFile(new URL('../public/models/sharkys_room_blockout_FINAL.glb', import.meta.url));
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  source = (await new GLTFLoader().parseAsync(arrayBuffer, '')).scene;
});

function node(root: Object3D, name: string): Object3D {
  const object = root.getObjectByName(name);
  assert.ok(object, `Fixture node must exist: ${name}`);
  return object;
}

function fixture(): Group {
  return source.clone(true);
}

describe('real frozen GLB loaded by Three.js', () => {
  it('preserves geometry statistics, all required nodes, independent targets and Hero projection', () => {
    const result = validateScene(fixture());
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    assert.deepEqual(result.missingNodes, []);
    assert.deepEqual(result.missingTargets, []);
    assert.equal(requiredNodeNames.length, 14);
    assert.equal(requiredTargetNames.length, 9);
    assert.equal(result.nodeCount, SOURCE_NODE_COUNT);
    assert.equal(result.sourceMeshCount, SOURCE_MESH_COUNT);
    assert.equal(result.meshCount, SOURCE_PRIMITIVE_COUNT);
    assert.equal(result.triangleCount, SOURCE_TRIANGLE_COUNT);
    assert.equal(result.materialCount, SOURCE_MATERIAL_COUNT);
    assert.equal(result.mappings.length, 9);
  });

  it('reports native Y-up world positions without applying Blender conversion twice', () => {
    const loaded = fixture();
    const piano = validateScene(loaded).mappings.find(({ id }) => id === 'piano');
    assert.ok(piano);
    const expected = [-0.6499999761581421, 0.6000000238418579, -1.2899999618530273];
    piano.targetPosition.forEach((value, index) => assert.ok(Math.abs(value - expected[index]) < 1e-6));
    const heroPosition = node(loaded, HERO_CAMERA_NAME).getWorldPosition(new Vector3());
    assert.ok(heroPosition.distanceTo(new Vector3(7.891778469085693, 7.609460353851318, 10.294089317321777)) < 1e-6);
  });

  it('allows the loader scene and application wrappers while retaining 85 source nodes', () => {
    const applicationGroup = new Group();
    applicationGroup.name = 'ApplicationSceneWrapper';
    applicationGroup.add(fixture());
    const result = validateScene(applicationGroup);
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    assert.equal(result.nodeCount, 85);
  });

  it('does not change frozen local transforms or parents while collecting diagnostics', () => {
    const loaded = fixture();
    const capture = () => {
      const records: unknown[] = [];
      loaded.traverse((object) => records.push({
        name: object.name,
        parent: object.parent?.name,
        position: object.position.toArray(),
        quaternion: object.quaternion.toArray(),
        scale: object.scale.toArray(),
      }));
      return records;
    };
    const beforeValidation = capture();
    const first = validateScene(loaded);
    const second = validateScene(loaded);
    assert.deepEqual(capture(), beforeValidation);
    assert.deepEqual(first, second);
  });
});

describe('semantic interaction contract', () => {
  it('resolves each of the nine semantics from every hit-testable primitive', () => {
    const loaded = fixture();
    const verified = new Set<string>();
    let nestedPrimitiveCount = 0;
    for (const id of interactionIds) {
      for (const name of interactiveObjects[id].nodes) {
        const sourceNode = node(loaded, name);
        assert.equal(resolveInteraction(sourceNode), id);
        sourceNode.traverse((primitive) => {
          if (!(primitive instanceof Mesh)) return;
          assert.equal(resolveInteraction(primitive), id, `${primitive.name} must resolve to ${id}`);
          verified.add(id);
          if (primitive !== sourceNode) nestedPrimitiveCount++;
        });
      }
    }
    assert.equal(verified.size, 9);
    assert.ok(nestedPrimitiveCount > 0, 'Real GLTFLoader primitive Groups must exercise ancestor matching');
  });

  it('does not treat frozen furniture, camera targets or unrelated scene objects as interactive', () => {
    const loaded = fixture();
    for (const name of ['FUR_Desk', 'FUR_Bed', 'FUR_Sofa', 'ENV_Floor', HERO_CAMERA_NAME, ...requiredTargetNames]) {
      node(loaded, name).traverse((object) => assert.equal(resolveInteraction(object), null, name));
    }
    assert.equal(resolveInteraction(new Group()), null);
  });
});

describe('explicit contract failures', () => {
  for (const name of requiredNodeNames) {
    it(`fails clearly when required node ${name} is absent`, () => {
      const loaded = fixture();
      node(loaded, name).removeFromParent();
      const result = validateScene(loaded);
      assert.equal(result.ok, false);
      assert.ok(result.missingNodes.includes(name));
    });
  }

  for (const name of requiredTargetNames) {
    it(`fails clearly when focus target ${name} is absent`, () => {
      const loaded = fixture();
      node(loaded, name).removeFromParent();
      const result = validateScene(loaded);
      assert.equal(result.ok, false);
      assert.ok(result.missingTargets.includes(name));
    });
  }

  it('rejects a broken PianoRail → Piano parent relationship', () => {
    const loaded = fixture();
    node(loaded, ROOM_ROOT_NAME).add(node(loaded, 'INT_Piano'));
    const result = validateScene(loaded);
    assert.equal(result.ok, false);
    assert.ok(result.errors.includes('Hierarchy changed: INT_Piano must be a child of INT_PianoRail'));
  });

  for (const name of ['TEC_MacBookScreen', 'INT_PianoRail', 'INT_TrashCanLid', 'INT_LightSwitch']) {
    it(`rejects a moved frozen pivot: ${name}`, () => {
      const loaded = fixture();
      node(loaded, name).position.x += 0.01;
      const result = validateScene(loaded);
      assert.equal(result.ok, false);
      assert.ok(result.errors.includes(`Frozen local transform changed: ${name}`));
    });
  }

  it('rejects a missing Hero camera', () => {
    const loaded = fixture();
    node(loaded, HERO_CAMERA_NAME).removeFromParent();
    const result = validateScene(loaded);
    assert.equal(result.ok, false);
    assert.ok(result.errors.includes(`Missing perspective camera: ${HERO_CAMERA_NAME}`));
  });

  it('rejects a changed source Hero projection', () => {
    const loaded = fixture();
    const camera = node(loaded, HERO_CAMERA_NAME);
    assert.ok(camera instanceof PerspectiveCamera);
    camera.fov += 1;
    const result = validateScene(loaded);
    assert.equal(result.ok, false);
    assert.ok(result.errors.includes('Frozen Hero camera projection changed'));
  });

  it('rejects a duplicate named required node', () => {
    const loaded = fixture();
    node(loaded, 'TEC_Phone').parent?.add(node(loaded, 'TEC_Phone').clone(true));
    const result = validateScene(loaded);
    assert.equal(result.ok, false);
    assert.ok(result.errors.includes('Duplicate frozen node: TEC_Phone'));
  });
});
