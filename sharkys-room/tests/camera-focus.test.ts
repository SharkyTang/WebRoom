import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, describe, it } from 'node:test';
import { Box3, Mesh, PerspectiveCamera, Raycaster, Vector3, type Group } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createCameraAnimator } from '../lib/room/cameraAnimation';
import { focusViews, getFocusPose } from '../lib/room/focusViews';
import { interactionIds, interactiveObjects, resolveInteraction } from '../lib/room/interactiveObjects';
import { HERO_CAMERA_NAME } from '../lib/room/sceneConstants';

let room: Group;
let hero: PerspectiveCamera;

before(async () => {
  const bytes = await readFile(new URL('../public/models/sharkys_room_blockout_FINAL.glb', import.meta.url));
  room = (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, '')).scene;
  room.updateMatrixWorld(true);
  const source = room.getObjectByName(HERO_CAMERA_NAME);
  assert.ok(source instanceof PerspectiveCamera);
  hero = source.clone();
  source.matrixWorld.decompose(hero.position, hero.quaternion, hero.scale);
  hero.updateMatrixWorld();
});

describe('focus views derived from the real frozen targets', () => {
  it('covers all nine semantic IDs and keeps endpoints inside the open room', () => {
    assert.deepEqual(Object.keys(focusViews).sort(), [...interactionIds].sort());
    for (const id of interactionIds) {
      const pose = getFocusPose(room, id);
      const target = room.getObjectByName(interactiveObjects[id].target)!;
      const origin = target.getWorldPosition(new Vector3());
      assert.ok(pose.position.distanceTo(origin.clone().add(new Vector3(...focusViews[id].offset))) < 1e-12);
      assert.ok(pose.position.x > -3.6 && pose.position.x < 3.6, `${id}: endpoint outside left/right walls`);
      assert.ok(pose.position.z > -2.83 && pose.position.z < 2.9, `${id}: endpoint outside front/back limits`);
      assert.ok(pose.position.y > 0.8 && pose.position.y < 3, `${id}: endpoint outside floor/ceiling limits`);
      const look = new Vector3(0, 0, -1).applyQuaternion(pose.quaternion);
      assert.ok(look.angleTo(pose.target.clone().sub(pose.position)) < 1e-7, `${id}: camera does not face target`);
    }
  });

  it('keeps the entire Hero-to-focus camera path clear of furniture and walls', () => {
    const meshes: Mesh[] = [];
    room.traverse((object) => { if (object instanceof Mesh) meshes.push(object); });
    for (const id of interactionIds) {
      const { position } = getFocusPose(room, id);
      const delta = position.clone().sub(hero.position);
      // Exact triangle intersection along the camera-centre path (outbound and return).
      const raycaster = new Raycaster(hero.position, delta.clone().normalize(), 0, delta.length());
      const hits = raycaster.intersectObjects(meshes, false);
      assert.equal(hits.length, 0, `${id}: path crosses ${hits.map(hit => hit.object.name).join(', ')}`);
      // The near plane must not end inside any furniture proxy, even if the surface is one-sided.
      for (const mesh of meshes) {
        const box = new Box3().setFromObject(mesh).expandByScalar(hero.near);
        assert.equal(box.containsPoint(position), false, `${id}: endpoint too close to ${mesh.name}`);
      }
    }
  });

  it('has an unobscured centre ray to each semantic object from its focused view', () => {
    for (const id of interactionIds) {
      const pose = getFocusPose(room, id);
      const direction = pose.target.clone().sub(pose.position).normalize();
      const hit = new Raycaster(pose.position, direction, 0, 20).intersectObject(room, true)[0];
      assert.ok(hit, `${id}: no visible geometry`);
      assert.equal(resolveInteraction(hit.object), id, `${id}: centre ray hits ${hit.object.name}`);
    }
  });

  it('frames every real MacBook base and open-screen vertex with a visible bottom margin', () => {
    const camera = hero.clone();
    const pose = getFocusPose(room, 'macbook');
    camera.position.copy(pose.position);
    camera.quaternion.copy(pose.quaternion);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    let verticesChecked = 0;
    for (const name of interactiveObjects.macbook.nodes) {
      room.getObjectByName(name)!.traverse(object => {
        if (!(object instanceof Mesh)) return;
        const positions = object.geometry.attributes.position;
        for (let index = 0; index < positions.count; index++) {
          const projected = new Vector3().fromBufferAttribute(positions, index).applyMatrix4(object.matrixWorld).project(camera);
          assert.ok(Math.abs(projected.x) < 1, `${name}: vertex outside horizontal frame`);
          assert.ok(projected.y > -.94 && projected.y < 1, `${name}: clipped vertex or insufficient bottom margin (${projected.y})`);
          assert.ok(projected.z > -1 && projected.z < 1, `${name}: vertex beyond camera clip planes`);
          verticesChecked++;
        }
      });
    }
    assert.ok(verticesChecked > 0, 'The regression check must inspect actual exported geometry');
  });
});

describe('GSAP render-camera animation', () => {
  it('restores the exact Hero pose/projection after every reduced-motion focus', async () => {
    const camera = hero.clone();
    const sourceBefore = room.getObjectByName(HERO_CAMERA_NAME)!.matrix.toArray();
    let invalidations = 0;
    const animator = createCameraAnimator(camera, room, () => { invalidations++; });
    const initial = animator.snapshot();
    for (const id of interactionIds) {
      await animator.focus(id, true);
      assert.equal(animator.snapshot().focusedObject, id);
      assert.equal(animator.snapshot().busy, false);
      assert.deepEqual(camera.position.toArray(), getFocusPose(room, id).position.toArray());
      await animator.home(true);
      assert.deepEqual(animator.snapshot(), initial);
    }
    assert.ok(invalidations >= 18, 'Demand rendering must invalidate during animations and at endpoints');
    assert.deepEqual(room.getObjectByName(HERO_CAMERA_NAME)!.matrix.toArray(), sourceBefore);
    animator.dispose();
  });

  it('settles replaced, cancelled and disposed promises without competing tweens', async () => {
    const camera = hero.clone();
    const animator = createCameraAnimator(camera, room, () => {});
    const original = animator.snapshot();
    const first = animator.focus('monitor');
    const replacement = animator.home(true);
    await Promise.all([first, replacement]);
    assert.deepEqual(animator.snapshot(), original);
    const cancelled = animator.focus('ipad');
    animator.cancel();
    await cancelled;
    assert.equal(animator.snapshot().busy, false);
    const disposed = animator.focus('phone');
    animator.dispose();
    await disposed;
    const finalPose = animator.snapshot();
    await animator.focus('window');
    await animator.home();
    assert.deepEqual(animator.snapshot(), finalPose);
  });
});
