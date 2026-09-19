import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CameraAnimationSnapshot } from '../lib/room/cameraAnimation';
import { createInteractionStore, formatTime, weatherOptions, type InteractionRuntime } from '../lib/room/interactionState';
import type { InteractionId } from '../lib/room/interactiveObjects';
import type { MechanismSnapshot } from '../lib/room/mechanisms';

type Operation = 'focus' | 'home' | 'enter' | 'exit' | 'toggle';
type Call = { operation: Operation; id: InteractionId | null; reduced: boolean; complete: () => void };
const flush = () => new Promise<void>(resolve => setImmediate(resolve));

describe('scene outside-click contract', () => {
  it('resets the current view without entering/toggling mechanisms and queues a requested exit', async () => {
    const fixture = runtimeFixture(); const store = createInteractionStore(); const detach = store.attach(fixture.runtime);
    await store.activate('piano'); const before = store.getSnapshot(); fixture.hold.add('focus');
    const reset = store.resetView(); assert(store.getSnapshot().isCameraBusy);
    await store.toggle('piano'); await store.resetView(); await store.sceneClick(null);
    assert.equal(fixture.count('enter'),1); assert.equal(fixture.count('toggle'),0); assert.equal(fixture.count('focus'),2);
    assert(store.getSnapshot().returnRequested); assert.equal(store.getSnapshot().pianoState,before.pianoState);
    fixture.finish('focus'); await reset;
    assert.equal(fixture.count('exit'),1); assert.equal(fixture.count('home'),1); assert.equal(store.getSnapshot().activeObject,null); detach();
  });
  it('serializes overview reset with activation and survives disposal during reset', async () => {
    const fixture = runtimeFixture(['home']); const store = createInteractionStore(); const detach = store.attach(fixture.runtime);
    const reset = store.resetView(); await store.activate('monitor'); assert.equal(fixture.count('focus'),0);
    detach(); await reset; assert.deepEqual(fixture.disposalCounts(),{camera:1,mechanisms:1});
  });
  it('returns through mechanical exit and never activates a different object on the same click', async () => {
    const fixture = runtimeFixture(); const store = createInteractionStore(); const detach = store.attach(fixture.runtime);
    await store.sceneClick('trashcan'); await store.sceneClick('phone');
    assert.equal(store.getSnapshot().activeObject, null);
    assert.deepEqual(fixture.calls.map(x=>[x.operation,x.id]), [['focus','trashcan'],['enter','trashcan'],['exit','trashcan'],['home',null]]);
    await store.sceneClick('phone'); assert.equal(store.getSnapshot().activeObject, 'phone'); detach();
  });
  it('queues a background click during focus and preserves same-object toggles', async () => {
    const fixture = runtimeFixture(['focus']); const store = createInteractionStore(); const detach = store.attach(fixture.runtime);
    const focus = store.sceneClick('piano'); await store.sceneClick(null); await store.sceneClick('ipad');
    assert(store.getSnapshot().returnRequested); assert.equal(fixture.count('focus'),1);
    fixture.finish('focus'); await focus; assert.equal(fixture.count('home'),1); assert.equal(store.getSnapshot().activeObject,null);
    fixture.hold.delete('focus'); await store.sceneClick('piano'); await store.sceneClick('piano');
    assert.equal(fixture.count('toggle'),1); assert.equal(store.getSnapshot().activeObject,'piano'); detach();
  });
});

/** Controlled promises model frames still in flight without timing-sensitive sleeps. */
function runtimeFixture(held: Operation[] = []) {
  const hold = new Set(held);
  const calls: Call[] = [];
  let cameraDisposed = 0;
  let mechanismsDisposed = 0;
  const pose = { position: [1, 2, 3] as [number, number, number], quaternion: [0, 0, 0, 1] as [number, number, number, number], fov: 28, aspect: 1.5, near: .05, far: 100, zoom: 1 };
  const cameraSnapshot: CameraAnimationSnapshot = { ...pose, hero: pose, focusedObject: null, busy: false };
  const transform = () => ({ position: [0, 0, 0], quaternion: [0, 0, 0, 1], rotation: [0, 0, 0] });
  const mechanismSnapshot: MechanismSnapshot = {
    macbookState: 'open', trashState: 'closed', pianoState: 'extended', lightsState: 'on', marshallPower: 'off',
    transforms: { macbook: transform(), trash: transform(), piano: transform(), switch: transform() },
    lightValues: { LGT_CabinetProxy: 2, LGT_DeskProxy: 1, LGT_BedProxy: 1 },
    baseLightValues: { LGT_Ambient: 1 }, screenValues: {},
    sourceEndpoints: { macbookOpenX: -1.83, trashOpenX: -1.74, switchOnZ: .14, switchOffZ: -.14, pianoRetractedZ: -1.94, pianoExtendedZ: -1.29, pianoTravel: .65 },
  };
  function run(operation: Operation, id: InteractionId | null, reduced: boolean) {
    return new Promise<void>(resolve => {
      const call = { operation, id, reduced, complete: resolve };
      calls.push(call);
      if (!hold.has(operation)) resolve();
    });
  }
  const runtime: InteractionRuntime = {
    camera: {
      focus: (id, reduced = false) => run('focus', id, reduced),
      home: (reduced = false) => run('home', null, reduced),
      snapshot: () => cameraSnapshot,
      cancel: () => calls.filter(call => call.operation === 'focus' || call.operation === 'home').forEach(call => call.complete()),
      dispose: () => { cameraDisposed++; calls.filter(call => call.operation === 'focus' || call.operation === 'home').forEach(call => call.complete()); },
    },
    mechanisms: {
      enter: (id, reduced) => run('enter', id, reduced),
      exit: (id, reduced) => run('exit', id, reduced),
      toggle: (id, reduced) => run('toggle', id, reduced),
      snapshot: () => mechanismSnapshot,
      subscribe: () => () => {},
      dispose: () => { mechanismsDisposed++; calls.filter(call => call.operation !== 'focus' && call.operation !== 'home').forEach(call => call.complete()); },
    },
  };
  return {
    runtime, calls, hold,
    count: (operation: Operation) => calls.filter(call => call.operation === operation).length,
    finish: (operation: Operation) => { const call = calls.findLast(call => call.operation === operation); assert.ok(call, `Expected pending ${operation}`); call.complete(); },
    disposalCounts: () => ({ camera: cameraDisposed, mechanisms: mechanismsDisposed }),
  };
}

describe('central interaction state serialization', () => {
  it('allows hover only when idle, and rapid object activations start one camera operation', async () => {
    const fixture = runtimeFixture(['focus']);
    const store = createInteractionStore();
    const detach = store.attach(fixture.runtime);
    store.hover('monitor');
    assert.equal(store.getSnapshot().interactionPhase, 'hovering');
    store.hover(null);
    assert.equal(store.getSnapshot().interactionPhase, 'idle');
    const first = store.activate('monitor');
    await Promise.all(Array.from({ length: 20 }, (_, index) => store.activate(index % 2 ? 'phone' : 'monitor')));
    store.hover('window');
    assert.equal(fixture.count('focus'), 1);
    assert.equal(store.getSnapshot().activeObject, 'monitor');
    assert.equal(store.getSnapshot().hoveredObject, null);
    assert.equal(store.getSnapshot().isCameraBusy, true);
    fixture.finish('focus');
    await first;
    assert.equal(store.getSnapshot().interactionPhase, 'focused');
    assert.equal(store.getSnapshot().isCameraBusy, false);
    await store.back();
    assert.equal(store.getSnapshot().activeObject, null);
    assert.equal(store.getSnapshot().interactionPhase, 'idle');
    detach();
  });

  it('queues Back during camera focus, completes mechanical exit, and restores idle once', async () => {
    const fixture = runtimeFixture(['focus', 'enter', 'home']);
    const store = createInteractionStore();
    const detach = store.attach(fixture.runtime);
    const activation = store.activate('macbook');
    await store.back();
    await store.back();
    assert.equal(store.getSnapshot().returnRequested, true);
    assert.equal(fixture.count('home'), 0);
    fixture.finish('focus');
    await flush();
    assert.equal(store.getSnapshot().interactionPhase, 'interacting');
    await store.activate('trashcan');
    assert.equal(fixture.count('focus'), 1);
    fixture.finish('enter');
    await flush();
    assert.equal(store.getSnapshot().interactionPhase, 'returning');
    assert.equal(store.getSnapshot().isCameraBusy, true);
    assert.deepEqual(fixture.calls.map(call => call.operation), ['focus', 'enter', 'exit', 'home']);
    await store.back();
    assert.equal(fixture.count('home'), 1);
    fixture.finish('home');
    await activation;
    assert.equal(store.getSnapshot().interactionPhase, 'idle');
    assert.equal(store.getSnapshot().activeObject, null);
    assert.equal(store.getSnapshot().returnRequested, false);
    assert.equal(store.getSnapshot().isCameraBusy, false);
    detach();
  });

  it('ignores repeated toggles and queues Back while a mechanical animation is active', async () => {
    const fixture = runtimeFixture(['toggle']);
    const store = createInteractionStore();
    const detach = store.attach(fixture.runtime);
    await store.activate('piano');
    const operation = store.toggle('piano');
    assert.equal(store.getSnapshot().interactionPhase, 'interacting');
    await Promise.all(Array.from({ length: 15 }, () => store.activate('piano')));
    await store.activate('lightswitch');
    await store.toggle('marshall');
    assert.equal(fixture.count('toggle'), 1);
    assert.equal(fixture.count('focus'), 1);
    await store.back();
    fixture.finish('toggle');
    await operation;
    assert.equal(fixture.count('home'), 1);
    assert.equal(store.getSnapshot().interactionPhase, 'idle');
    detach();
  });

  it('restricts environment state to focused Window and supports all five weather states and endpoints', async () => {
    const fixture = runtimeFixture(['focus']);
    const store = createInteractionStore();
    const detach = store.attach(fixture.runtime);
    store.setTime(21); store.setWeather('Rainy');
    assert.equal(store.getSnapshot().time, 12);
    assert.equal(store.getSnapshot().weather, 'Sunny');
    const activation = store.activate('window');
    store.setTime(21); store.setWeather('Rainy');
    assert.equal(store.getSnapshot().time, 12);
    fixture.finish('focus'); await activation;
    for (const weather of weatherOptions) { store.setWeather(weather); assert.equal(store.getSnapshot().weather, weather); }
    for (const [input, expected] of [[-5, 0], [0, 0], [18.5, 18.5], [24, 24], [30, 24]]) { store.setTime(input); assert.equal(store.getSnapshot().time, expected); }
    store.setTime(Number.NaN); assert.equal(store.getSnapshot().time, 24);
    store.setTime(Number.POSITIVE_INFINITY); assert.equal(store.getSnapshot().time, 24);
    assert.equal(formatTime(0), '00:00'); assert.equal(formatTime(18.5), '18:30'); assert.equal(formatTime(24), '24:00');
    await store.back();
    store.setTime(6); store.setWeather('Sunny');
    assert.equal(store.getSnapshot().time, 24);
    assert.equal(store.getSnapshot().weather, 'Snowy');
    detach();
  });

  it('propagates the reduced-motion preference through focus, mechanics, toggle and return', async () => {
    const fixture = runtimeFixture();
    const store = createInteractionStore();
    store.setReducedMotion(true);
    const detach = store.attach(fixture.runtime);
    assert.equal(store.getSnapshot().reducedMotion, true);
    await store.activate('marshall');
    await store.toggle('marshall');
    await store.back();
    assert.deepEqual(fixture.calls.map(call => call.operation), ['focus', 'enter', 'toggle', 'exit', 'home']);
    assert.ok(fixture.calls.every(call => call.reduced));
    store.setReducedMotion(false);
    await store.activate('phone');
    assert.equal(fixture.calls.at(-1)!.reduced, false);
    detach();
  });

  for (const pending of ['focus', 'enter', 'home'] as const) {
    it(`does not write state after unmount with pending ${pending}`, async () => {
      const fixture = runtimeFixture([pending]);
      const store = createInteractionStore();
      const detach = store.attach(fixture.runtime);
      let notifications = 0;
      const unsubscribe = store.subscribe(() => notifications++);
      const activation = store.activate('monitor');
      await flush();
      const pendingOperation = pending === 'home' ? store.back() : activation;
      await flush();
      detach();
      const stateAfterUnmount = store.getSnapshot();
      const notificationsAfterUnmount = notifications;
      await pendingOperation;
      await flush();
      assert.equal(store.getSnapshot(), stateAfterUnmount);
      assert.equal(notifications, notificationsAfterUnmount);
      assert.deepEqual(fixture.disposalCounts(), { camera: 1, mechanisms: 1 });
      unsubscribe();
    });
  }

  it('an old detached operation cannot overwrite a newly attached runtime', async () => {
    const first = runtimeFixture(['focus']);
    const store = createInteractionStore();
    const detachFirst = store.attach(first.runtime);
    const oldActivation = store.activate('monitor');
    detachFirst();
    const second = runtimeFixture();
    const detachSecond = store.attach(second.runtime);
    await store.activate('ipad');
    await oldActivation;
    assert.equal(store.getSnapshot().activeObject, 'ipad');
    assert.equal(store.getSnapshot().interactionPhase, 'focused');
    assert.equal(first.count('enter'), 0);
    detachSecond();
  });
});
