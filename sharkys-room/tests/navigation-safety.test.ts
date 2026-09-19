import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { createCameraCollision } from '../lib/room/cameraCollision';
import { createPointerGestures } from '../lib/room/pointerGestures';

describe('camera navigation input safety', () => {
  it('keeps a subthreshold click, suppresses drag release, and permits the next intentional click', () => {
    const gate = createPointerGestures();
    gate.down(1, 50, 50); assert.equal(gate.move(1, 53, 54), false); gate.up(1); assert.equal(gate.suppressClick, false);
    gate.down(1, 50, 50); assert.equal(gate.move(1, 56, 50), true); gate.up(1); assert.equal(gate.suppressClick, true);
    gate.down(1, 50, 50); gate.up(1); assert.equal(gate.suppressClick, false);
  });
  it('multi-touch, cancellation and interrupted pointers never synthesize an object click', () => {
    const gate = createPointerGestures();
    gate.down(1, 0, 0); gate.down(2, 10, 0); gate.up(2); gate.up(1); assert(gate.suppressClick);
    gate.down(3, 0, 0); gate.cancel(3); assert(gate.suppressClick); assert(!gate.has(3));
    gate.down(4, 0, 0); gate.cancel(); assert(gate.suppressClick); assert(!gate.dragging);
  });
  it('rejects entry through either wall face and the floor without treating open space as solid', () => {
    const room = new Group(), wall = new Mesh(new BoxGeometry(2, 2, .1), new MeshStandardMaterial()); wall.position.y = 1; room.add(wall);
    const collision = createCameraCollision(room); collision.refresh();
    assert(!collision.allows(new Vector3(0, 1, 1), new Vector3(0, 1, -.5)));
    assert(!collision.allows(new Vector3(0, 1, -1), new Vector3(0, 1, .5)));
    assert(!collision.allows(new Vector3(0, 1, 1), new Vector3(0, -.1, 1)));
    assert(collision.allows(new Vector3(2, 1, 1), new Vector3(2, 1, -1)));
    wall.position.x = 3; collision.refresh();
    assert(collision.allows(new Vector3(0, 1, 1), new Vector3(0, 1, -1)));
  });
  it('ignores suppressed proxies but retains real visible glass as a collision surface', () => {
    const room = new Group(), proxy = new Mesh(new BoxGeometry(4, 4, 4), new MeshStandardMaterial()); proxy.userData.roomProxySuppressed = true; room.add(proxy);
    const glass = new Mesh(new BoxGeometry(1, 2, .02), new MeshStandardMaterial({transparent:true,opacity:.3}));
    glass.position.set(3,1,0);room.add(glass);
    const collision = createCameraCollision(room); collision.refresh();
    assert(collision.allows(new Vector3(0, 1, 3), new Vector3(0, 1, 0)));
    assert(!collision.allows(new Vector3(3,1,1),new Vector3(3,1,-1)));
  });
});
