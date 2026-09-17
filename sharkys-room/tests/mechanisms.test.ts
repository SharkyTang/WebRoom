import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, describe, it } from 'node:test';
import { Light, Mesh, MeshStandardMaterial, type Group, type Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createMechanisms } from '../lib/room/mechanisms';
import { practicalLightNames } from '../lib/room/animationConstants';
import { validateScene } from '../lib/room/diagnostics';

let source: Group;
before(async () => {
  const bytes = await readFile(new URL('../public/models/sharkys_room_blockout_FINAL.glb', import.meta.url));
  source = (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, '')).scene;
  source.traverse(object => { if (object instanceof Light) object.intensity /= 683; });
});
function fixture() { return source.clone(true); }
function node(room: Object3D, name: string) {
  const object = room.getObjectByName(name);
  assert.ok(object, `Real fixture must contain ${name}`);
  return object;
}
function transforms(room: Object3D) {
  const output: unknown[] = [];
  room.traverse(object => output.push({name: object.name, parent: object.parent?.name, p: object.position.toArray(), q: object.quaternion.toArray(), s: object.scale.toArray()}));
  return output;
}
function materials(room: Object3D) {
  const output = new Map<Mesh, Mesh['material']>();
  room.traverse(object => { if (object instanceof Mesh) output.set(object, object.material); });
  return output;
}
function screen(room: Object3D, name: string) {
  let output: Mesh | undefined;
  node(room, name).traverse(object => { if (object instanceof Mesh && object.material instanceof MeshStandardMaterial && object.material.name === 'MAT_ScreenProxy_Greybox') output = object; });
  assert.ok(output, `Fixture must contain a dedicated screen surface: ${name}`);
  return output;
}
function near(actual: number, expected: number, epsilon = 1e-6) { assert.ok(Math.abs(actual - expected) < epsilon, `${actual} must equal ${expected}`); }

describe('v0.4 mechanisms against the actual frozen FINAL GLB', () => {
  it('preserves the authored open laptop / extended piano Hero on initialization', () => {
    const room = fixture();
    const before = transforms(room);
    const beforeMaterials = materials(room);
    const controller = createMechanisms(room, () => {});
    try {
      assert.deepEqual(transforms(room), before);
      assert.equal(validateScene(room).ok, true);
      const state = controller.snapshot();
      assert.equal(state.macbookState, 'open');
      assert.equal(state.pianoState, 'extended');
      assert.equal(state.trashState, 'closed');
      assert.equal(state.lightsState, 'on');
      assert.equal(state.marshallPower, 'off');
      near(state.sourceEndpoints.macbookOpenX, -105 * Math.PI / 180);
      near(state.sourceEndpoints.switchOnZ, 8 * Math.PI / 180);
      near(state.sourceEndpoints.pianoExtendedZ, -1.29);
      near(state.sourceEndpoints.pianoRetractedZ, -1.94);
      for (const [mesh, material] of beforeMaterials) assert.equal(mesh.material, material);
    } finally { controller.dispose(); }
  });

  it('demonstrates the first MacBook close/open cycle at its loaded X hinge and closes on exit', async () => {
    const room = fixture();
    const laptop = node(room, 'TEC_MacBookScreen');
    const pivot = laptop.position.toArray();
    const originalQuaternion = laptop.quaternion.toArray();
    const controller = createMechanisms(room, () => {});
    const seen: string[] = [];
    controller.subscribe(() => seen.push(controller.snapshot().macbookState));
    try {
      await controller.enter('macbook', true);
      assert.deepEqual(seen, ['closing', 'closed', 'opening', 'open']);
      assert.deepEqual(laptop.quaternion.toArray(), originalQuaternion);
      assert.deepEqual(laptop.position.toArray(), pivot);
      await controller.exit('macbook', true);
      assert.equal(controller.snapshot().macbookState, 'closed');
      assert.deepEqual(laptop.quaternion.toArray(), [0, 0, 0, 1]);
      seen.length = 0;
      await controller.enter('macbook', true);
      assert.deepEqual(seen, ['opening', 'open']);
      assert.deepEqual(laptop.quaternion.toArray(), originalQuaternion);
    } finally { controller.dispose(); }
    assert.deepEqual(laptop.quaternion.toArray(), originalQuaternion);
  });

  it('prepares then pulls out on first Piano activation, and uses exact absolute endpoints thereafter', async () => {
    const room = fixture();
    const rail = node(room, 'INT_PianoRail');
    const piano = node(room, 'INT_Piano');
    const childTransform = transforms(piano);
    const controller = createMechanisms(room, () => {});
    const seen: string[] = [];
    controller.subscribe(() => seen.push(controller.snapshot().pianoState));
    try {
      const {pianoRetractedZ, pianoExtendedZ} = controller.snapshot().sourceEndpoints;
      near(pianoExtendedZ - pianoRetractedZ, .65, 1e-14);
      await controller.enter('piano', true);
      assert.deepEqual(seen, ['retracting', 'retracted', 'extending', 'extended']);
      assert.equal(rail.position.z, pianoExtendedZ);
      await controller.enter('piano', true);
      assert.equal(controller.snapshot().pianoState, 'retracted');
      assert.equal(rail.position.z, pianoRetractedZ);
      for (let i = 0; i < 20; i++) {
        await controller.toggle('piano', true);
        assert.equal(rail.position.z, pianoExtendedZ);
        await controller.toggle('piano', true);
        assert.equal(rail.position.z, pianoRetractedZ);
      }
      assert.equal(piano.parent, rail);
      assert.deepEqual(transforms(piano), childTransform);
      const beforeExit = rail.position.toArray();
      await controller.exit('piano', true);
      assert.deepEqual(rail.position.toArray(), beforeExit, 'Piano state persists on Back');
    } finally { controller.dispose(); }
  });

  it('opens the Trash lid on local X and returns to exact closed quaternion without moving its pivot', async () => {
    const room = fixture();
    const lid = node(room, 'INT_TrashCanLid');
    const body = transforms(node(room, 'INT_TrashCanBody'));
    const pivot = lid.position.toArray();
    const controller = createMechanisms(room, () => {});
    try {
      await controller.enter('trashcan', true);
      near(lid.rotation.x, -100 * Math.PI / 180, 1e-12);
      assert.equal(controller.snapshot().trashState, 'open');
      await controller.exit('trashcan', true);
      assert.equal(controller.snapshot().trashState, 'closed');
      assert.deepEqual(lid.quaternion.toArray(), [0, 0, 0, 1]);
      assert.deepEqual(lid.position.toArray(), pivot);
      assert.deepEqual(transforms(node(room, 'INT_TrashCanBody')), body);
    } finally { controller.dispose(); }
  });

  it('toggles only the three practical lights and the converted local Z switch, preserving readable base lights', async () => {
    const room = fixture();
    const lightSwitch = node(room, 'INT_LightSwitch');
    const initialQuaternion = lightSwitch.quaternion.toArray();
    const initialPivot = lightSwitch.position.toArray();
    const lights = new Map<Light, number>();
    room.traverse(object => { if (object instanceof Light) lights.set(object, object.intensity); });
    const controller = createMechanisms(room, () => {});
    try {
      await controller.enter('monitor', true);
      const monitor = screen(room, 'TEC_MonitorScreen').material as MeshStandardMaterial;
      const monitorIntensity = monitor.emissiveIntensity;
      await controller.toggle('lightswitch', true);
      assert.equal(controller.snapshot().lightsState, 'off');
      near(lightSwitch.rotation.z, -8 * Math.PI / 180);
      for (const [light, intensity] of lights) assert.equal(light.intensity, (practicalLightNames as readonly string[]).includes(light.name) ? 0 : intensity);
      assert.equal(monitor.emissiveIntensity, monitorIntensity);
      await controller.exit('lightswitch', true);
      assert.equal(controller.snapshot().lightsState, 'off', 'Switch state persists on Back');
      await controller.toggle('lightswitch', true);
      assert.equal(controller.snapshot().lightsState, 'on');
      assert.deepEqual(lightSwitch.quaternion.toArray(), initialQuaternion);
      assert.deepEqual(lightSwitch.position.toArray(), initialPivot);
      for (const [light, intensity] of lights) assert.equal(light.intensity, intensity);
    } finally { controller.dispose(); }
  });

  it('activates isolated screen clones without leaking to other shared greybox materials, then restores references', async () => {
    const room = fixture();
    const saved = materials(room);
    const controller = createMechanisms(room, () => {});
    try {
      for (const [id, name] of [['monitor', 'TEC_MonitorScreen'], ['ipad', 'TEC_iPad'], ['phone', 'TEC_Phone']] as const) {
        const target = screen(room, name);
        const original = saved.get(target) as MeshStandardMaterial;
        const originalEmissive = original.emissive.toArray();
        await controller.enter(id, true);
        assert.notEqual(target.material, original);
        assert.equal((target.material as MeshStandardMaterial).emissiveIntensity, 3);
        assert.deepEqual(original.emissive.toArray(), originalEmissive);
        for (const [mesh, material] of saved) if (mesh !== target) assert.equal(mesh.material, material);
        await controller.exit(id, true);
        assert.equal(target.material, original);
      }
    } finally { controller.dispose(); }
  });

  it('powers Marshall on, persists after Back, and toggles off without audio or unrelated material changes', async () => {
    const room = fixture();
    const speaker = node(room, 'TEC_Marshall') as Mesh;
    const original = speaker.material;
    const controller = createMechanisms(room, () => {});
    try {
      await controller.enter('marshall', true);
      assert.equal(controller.snapshot().marshallPower, 'on');
      assert.notEqual(speaker.material, original);
      assert.equal((speaker.material as MeshStandardMaterial).emissiveIntensity, .28);
      await controller.exit('marshall', true);
      assert.equal(controller.snapshot().marshallPower, 'on');
      await controller.toggle('marshall', true);
      assert.equal(controller.snapshot().marshallPower, 'off');
      assert.equal(speaker.material, original);
      await controller.exit('marshall', true);
      await controller.enter('marshall', true);
      assert.equal(controller.snapshot().marshallPower, 'off', 'Explicit power Off persists when focusing Marshall again');
      assert.equal(speaker.material, original);
    } finally { controller.dispose(); }
  });

  it('coalesces rapid repeated GSAP rail requests, invalidates during motion, then stops rendering at idle', async () => {
    const room = fixture();
    let frames = 0;
    const controller = createMechanisms(room, () => { frames++; });
    try {
      const promise = controller.toggle('piano', false);
      assert.equal(controller.snapshot().pianoState, 'retracting');
      for (let i = 0; i < 20; i++) assert.equal(controller.toggle('piano', false), promise);
      await promise;
      const snapshot = controller.snapshot();
      assert.equal(snapshot.pianoState, 'retracted');
      assert.equal(snapshot.transforms.piano.position[2], snapshot.sourceEndpoints.pianoRetractedZ);
      assert.ok(frames > 3, `Demand renderer must be invalidated by GSAP (${frames} frames)`);
      const settled = frames;
      await new Promise(resolve => setTimeout(resolve, 40));
      assert.equal(frames, settled, 'Idle mechanisms schedule no rendering');
    } finally { controller.dispose(); }
  });

  it('kills pending tweens safely on dispose, resolves awaiting callers, and restores all source TRS/materials/lights', async () => {
    const room = fixture();
    const savedTransforms = transforms(room);
    const savedMaterials = materials(room);
    const controller = createMechanisms(room, () => {});
    const savedLights = controller.snapshot().lightValues;
    await controller.enter('monitor', true);
    await controller.enter('marshall', true);
    await controller.toggle('lightswitch', true);
    const pending = controller.enter('macbook', false);
    await new Promise(resolve => setTimeout(resolve, 30));
    controller.dispose();
    await pending;
    assert.deepEqual(transforms(room), savedTransforms);
    assert.deepEqual(controller.snapshot().lightValues, savedLights);
    for (const [mesh, material] of savedMaterials) assert.equal(mesh.material, material);
    assert.equal(validateScene(room).ok, true);
    controller.dispose();
    await controller.enter('trashcan', true);
    assert.deepEqual(transforms(room), savedTransforms);
  });

  it('reduced motion completes functional endpoints immediately and subscriptions can be removed', async () => {
    const room = fixture();
    const controller = createMechanisms(room, () => {});
    let notifications = 0;
    const unsubscribe = controller.subscribe(() => { notifications++; });
    try {
      await controller.enter('trashcan', true);
      assert.equal(controller.snapshot().trashState, 'open');
      assert.equal(notifications, 2);
      unsubscribe();
      await controller.exit('trashcan', true);
      assert.equal(controller.snapshot().trashState, 'closed');
      assert.equal(notifications, 2);
    } finally { controller.dispose(); }
  });
});
