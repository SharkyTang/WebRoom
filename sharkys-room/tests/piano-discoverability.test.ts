import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, describe, it } from 'node:test';
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, Raycaster, Vector2 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { initialInteractionState, type InteractionState } from '../lib/room/interactionState';
import { requiredNodeNames, resolveInteraction, runtimeInteractionTargets } from '../lib/room/interactiveObjects';
import { isPianoRetractedHitAreaActive, pianoRetractedHitArea } from '../lib/room/pianoInteraction';

describe('Piano retracted interaction eligibility', () => {
  for (const pianoState of ['retracted', 'extending', 'extended', 'retracting'] as const) {
    it(`only enables settled retraction across all phases (${pianoState})`, () => {
      for (const interactionPhase of ['idle', 'hovering', 'focusing', 'focused', 'interacting', 'returning'] as const) {
        for (const activeObject of [null, 'piano', 'monitor'] as const) {
          const state: InteractionState = { ...initialInteractionState, pianoState, interactionPhase, activeObject };
          const expected = pianoState === 'retracted' && (activeObject === null
            ? ['idle', 'hovering'].includes(interactionPhase)
            : activeObject === 'piano' && interactionPhase === 'focused');
          assert.equal(isPianoRetractedHitAreaActive(state), expected);
          assert.equal(isPianoRetractedHitAreaActive({ ...state, isCameraBusy: true }), false);
          assert.equal(isPianoRetractedHitAreaActive({ ...state, returnRequested: true }), false);
        }
      }
    });
  }
});

let source: Group;
before(async () => {
  const bytes = await readFile(new URL('../public/models/sharkys_room_blockout_FINAL.glb', import.meta.url));
  source = (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;
});

describe('Web-only Piano hit geometry against the real frozen room', () => {
  it('shares the piano semantic without entering the frozen node contract', () => {
    const proxy = new Group(); proxy.name = pianoRetractedHitArea.name;
    const child = new Group(); proxy.add(child);
    assert.equal(resolveInteraction(child), 'piano');
    assert.equal(runtimeInteractionTargets[proxy.name as keyof typeof runtimeInteractionTargets], 'piano');
    assert(!requiredNodeNames.some(name => name === proxy.name));
    assert.equal(source.getObjectByName(proxy.name), undefined);
  });

  it('offers a broad mobile raycast region without covering the desktop, chair or other semantic objects', () => {
    const room = source.clone(true);
    room.getObjectByName('INT_PianoRail')!.position.z -= .65;
    const runtime = new Group(); runtime.add(room);
    const proxy = new Mesh(new BoxGeometry(...pianoRetractedHitArea.size), new MeshBasicMaterial({ visible: false }));
    proxy.name = pianoRetractedHitArea.name;
    proxy.position.fromArray(pianoRetractedHitArea.position);
    runtime.add(proxy); runtime.updateMatrixWorld(true);
    const camera = room.getObjectByName('CAM_Hero_FINAL') as PerspectiveCamera;
    const ray = new Raycaster();
    const pixels: [number, number][] = [];
    for (let y = 0; y < 240; y++) for (let x = 0; x < 360; x++) {
      ray.setFromCamera(new Vector2(x / 360 * 2 - 1, 1 - y / 240 * 2), camera);
      const hits = ray.intersectObject(runtime, true);
      if (hits[0]?.object !== proxy) continue;
      pixels.push([x, y]);
      const behindHit = hits.find(hit => hit.object !== proxy);
      const behind = behindHit?.object;
      if (!behind) continue;
      assert([null, 'piano'].includes(resolveInteraction(behind)), `Steals ${behind.name}`);
      for (let node = behind; node; node = node.parent!) {
        assert.notEqual(node.name, 'FUR_OfficeChair', `Steals chair at ${x},${y}`);
        // The desk-undertray is intentionally piano; the normal desktop is not.
        if (node.name === 'FUR_Desk') assert(behindHit!.point.y < .7, `Steals desktop at ${x},${y}`);
      }
    }
    assert(pixels.length >= 500, `${pixels.length} usable integer touch pixels`);
    assert(Math.max(...pixels.map(p => p[0])) - Math.min(...pixels.map(p => p[0])) >= 40);
    assert(Math.max(...pixels.map(p => p[1])) - Math.min(...pixels.map(p => p[1])) >= 22);
    proxy.geometry.dispose(); proxy.material.dispose();
  });
});
