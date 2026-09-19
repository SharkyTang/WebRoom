import { waitForCanvasReady } from './helpers/browserReady.mjs';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The debug bridge is observation-only. Every state change below comes from real
// mouse, touchscreen or keyboard input; this test never calls an app controller.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = process.env.ROOM_TEST_OUTPUT ?? path.join(root, 'validation', 'v04');
const origin = process.env.ROOM_TEST_URL ?? 'http://127.0.0.1:3000';
const ids = ['monitor', 'macbook', 'ipad', 'marshall', 'piano', 'trashcan', 'lightswitch', 'phone', 'window'];
const checks = [];
const runtime = [];
const failedRequests = [];
const observations = {};
await fs.mkdir(output, { recursive: true });

async function check(name, fn, page) {
  try {
    const details = await fn();
    checks.push({ name, passed: true, ...(details ?? {}) });
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    const details = { error: String(error?.stack ?? error) };
    if (page && !page.isClosed()) {
      details.snapshot = await snapshot(page).catch(() => null);
      const file = `failure-${checks.length + 1}.png`;
      await page.screenshot({ path: path.join(output, file) }).catch(() => {});
      details.screenshot = file;
    }
    checks.push({ name, passed: false, ...details });
    process.stdout.write(`FAIL ${name}: ${error?.message ?? error}\n`);
  }
}

function observe(page, phase) {
  page.on('console', (message) => runtime.push({ phase, type: message.type(), text: message.text() }));
  page.on('pageerror', (error) => runtime.push({ phase, type: 'pageerror', text: error.message }));
  page.on('requestfailed', (request) => failedRequests.push({ phase, url: request.url(), error: request.failure()?.errorText }));
  page.on('response', (response) => {
    if (response.status() >= 400) failedRequests.push({ phase, url: response.url(), status: response.status() });
  });
}

async function snapshot(page) {
  return page.evaluate(() => window.__ROOM_DEBUG__?.snapshot() ?? null);
}

async function ready(page) {
  await page.waitForFunction(() => window.__ROOM_DEBUG__?.snapshot().status === 'ready', undefined, { timeout: 60_000 });
}

async function waitState(page, expected) {
  await page.waitForFunction((expected) => {
    const state = window.__ROOM_DEBUG__?.snapshot().interaction;
    return state && Object.entries(expected).every(([key, value]) => state[key] === value);
  }, expected, { timeout: 15_000 });
  return (await snapshot(page)).interaction;
}

async function settled(page, id) {
  return waitState(page, { activeObject: id, interactionPhase: 'focused', isCameraBusy: false });
}

function cameraPose(camera) {
  assert(camera, 'No active camera snapshot');
  return { position: camera.position, quaternion: camera.quaternion, fov: camera.fov, aspect: camera.aspect, near: camera.near, far: camera.far };
}

function hingeEndpoint(mechanical, id, state, label) {
  const transform = mechanical.transforms[id];
  const axis = id === 'switch' ? 2 : 0;
  const value = id === 'switch' ? mechanical.sourceEndpoints[state === 'on' ? 'switchOnZ' : 'switchOffZ']
    : state === 'closed' ? 0 : mechanical.sourceEndpoints[id === 'macbook' ? 'macbookOpenX' : 'trashOpenX'];
  // Quaternion assignment is exact; Euler extraction introduces at most trig rounding.
  assert(Math.abs(transform.rotation[axis] - value) <= 1e-12, `${label}: wrong hinge endpoint ${transform.rotation[axis]} vs ${value}`);
  if (state === 'closed') assert.deepEqual(transform.quaternion, [0, 0, 0, 1], `${label}: closed quaternion must be exact identity`);
  if (id === 'macbook' && state === 'open') assert.deepEqual(transform.quaternion, observations.initial.mechanical.transforms.macbook.quaternion, `${label}: authored open quaternion must restore exactly`);
  if (id === 'switch' && state === 'on') assert.deepEqual(transform.quaternion, observations.initial.mechanical.transforms.switch.quaternion, `${label}: authored ON quaternion must restore exactly`);
}

function pianoEndpoint(mechanical, state, label) {
  const z = mechanical.sourceEndpoints[state === 'extended' ? 'pianoExtendedZ' : 'pianoRetractedZ'];
  const initial = observations.initial.mechanical.transforms.piano.position;
  assert.deepEqual(mechanical.transforms.piano.position, [initial[0], initial[1], z], `${label}: rail must reach exact known coordinates`);
}

async function hero(page, expectedPose, method = 'button') {
  const before = await snapshot(page);
  if (before?.interaction?.activeObject) {
    await settled(page, before.interaction.activeObject);
    const back = page.getByRole('button', { name: 'Back', exact: true });
    assert(await back.isVisible(), 'A semantic visible Back button must exist');
    if (method === 'escape') await page.keyboard.press('Escape');
    else await back.click();
    await page.waitForFunction(() => {
      const state = window.__ROOM_DEBUG__?.snapshot().interaction;
      return state && state.activeObject === null && !state.isCameraBusy && ['idle', 'hovering'].includes(state.interactionPhase);
    }, undefined, { timeout: 15_000 });
  }
  const after = await snapshot(page);
  assert.equal(after.interaction.activeObject, null);
  if (expectedPose) assert.deepEqual(cameraPose(after.camera), expectedPose, 'Return must restore every Hero camera component exactly');
  return after;
}

async function hitPoints(page) {
  return page.evaluate(() => window.__ROOM_DEBUG__.projected());
}

async function focus(page, id, { touch = false } = {}) {
  await hero(page);
  const point = (await hitPoints(page))[id];
  let input = touch ? 'touchscreen' : 'mouse';
  if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) {
    if (touch) await page.touchscreen.tap(point.x, point.y);
    else await page.mouse.click(point.x, point.y);
  } else {
    // Closed/retracted mechanics can be occluded in the frozen Hero. Their
    // existing semantic HTML selector is the actual non-hover user path.
    assert(!touch, `Initial mobile touch path must have a visible raycast pixel for ${id}`);
    await page.getByRole('combobox', { name: 'Explore objects', exact: true }).selectOption(id);
    input = 'native semantic selector (closed/retracted geometry occluded)';
  }
  await settled(page, id);
  return { point: point ?? null, input, state: await snapshot(page) };
}

async function screenshot(page, name) {
  // Avoid capturing a halfway GPU frame after the state endpoint is assigned.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.screenshot({ path: path.join(output, name) });
  return name;
}

async function clickControl(page, name) {
  const button = page.getByRole('button', { name, exact: true });
  await button.waitFor({ state: 'visible' });
  assert(await button.isEnabled(), `Control is disabled: ${name}`);
  await button.click();
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

try {
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await desktopContext.newPage();
  observe(page, 'desktop-interactions');
  await page.goto(`${origin}/?debug=1`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  const initial = await snapshot(page);
  const heroPose = cameraPose(initial.camera);
  observations.initial = initial;
  observations.heroPose = heroPose;
  observations.heroHitPoints = await hitPoints(page);
  observations.heroCanvas = await page.locator('canvas').boundingBox();

  await check('Initial state preserves the validated frozen room and all nine visible raycast paths', async () => {
    assert.equal(initial.validation.ok, true);
    assert.equal(initial.validation.nodeCount, 85);
    assert.equal(initial.validation.triangleCount, 6566);
    assert.equal(initial.interaction.activeObject, null);
    assert(['idle', 'hovering'].includes(initial.interaction.interactionPhase));
    assert.equal(initial.interaction.isCameraBusy, false);
    assert.deepEqual(Object.keys(observations.heroHitPoints).filter((id) => id !== '__noninteractive').sort(), [...ids].sort());
    return { screenshot: await screenshot(page, 'v04_hero.png'), initial };
  }, page);

  await check('Hero → Monitor Projects focus → visible Back restores the exact Hero camera', async () => {
    const result = await focus(page, 'monitor');
    assert.notDeepEqual(cameraPose(result.state.camera).position, heroPose.position);
    assert(result.state.mechanical.screenValues.monitor?.every((value) => value === 3), 'Monitor screen clones must reach their visible active intensity');
    assert(await page.getByText('Projects', { exact: true }).isVisible());
    assert(await page.getByText('Interaction prototype', { exact: true }).first().isVisible());
    const image = await screenshot(page, 'v04_monitor_focus.png');
    const after = await hero(page, heroPose);
    assert.equal(after.mechanical.screenValues.monitor, undefined, 'Monitor exit must release its temporary screen materials');
    return { focused: result.state, returned: after, screenshot: image };
  }, page);

  await check('MacBook hinge reaches its exact open endpoint and closes before returning to Hero', async () => {
    const result = await focus(page, 'macbook');
    assert.equal(result.state.interaction.macbookState, 'open');
    hingeEndpoint(result.state.mechanical, 'macbook', 'open', 'MacBook open');
    assert(await page.getByText(/About\s*\/\s*Education/).first().isVisible());
    const image = await screenshot(page, 'v04_macbook_open.png');
    const after = await hero(page, heroPose);
    assert.equal(after.interaction.macbookState, 'closed');
    hingeEndpoint(after.mechanical, 'macbook', 'closed', 'MacBook closed');
    return { opened: result.state.mechanical.transforms.macbook, closed: after.mechanical.transforms.macbook, screenshot: image };
  }, page);

  await check('iPad activates the Memories prototype and ESC returns exactly to Hero', async () => {
    const result = await focus(page, 'ipad');
    assert(await page.getByText('Memories', { exact: true }).isVisible());
    const after = await hero(page, heroPose, 'escape');
    return { focused: result.state.camera, returned: after.camera };
  }, page);

  await check('Marshall powers on, toggles Off/On with native controls, and persists after Back', async () => {
    await focus(page, 'marshall');
    await waitState(page, { marshallPower: 'on' });
    assert(await page.getByText('Music', { exact: true }).isVisible());
    await clickControl(page, 'Power: On');
    await waitState(page, { marshallPower: 'off', interactionPhase: 'focused' });
    await clickControl(page, 'Power: Off');
    await waitState(page, { marshallPower: 'on', interactionPhase: 'focused' });
    const after = await hero(page, heroPose);
    assert.equal(after.interaction.marshallPower, 'on');
    return { persistedPower: after.interaction.marshallPower };
  }, page);

  await check('Marshall explicitly switched Off stays Off after returning and refocusing', async () => {
    await focus(page, 'marshall');
    await clickControl(page, 'Power: On');
    await waitState(page, { marshallPower: 'off', interactionPhase: 'focused' });
    await hero(page, heroPose);
    await focus(page, 'marshall');
    assert.equal((await snapshot(page)).interaction.marshallPower, 'off');
    assert(await page.getByRole('button', { name: 'Power: Off', exact: true }).isVisible());
    await clickControl(page, 'Power: Off');
    await waitState(page, { marshallPower: 'on', interactionPhase: 'focused' });
    await hero(page, heroPose);
    return { explicitOffPersisted: true };
  }, page);

  await check('Piano moves exactly 0.65 m along the loaded rail axis and reaches both exact endpoints', async () => {
    const result = await focus(page, 'piano');
    await waitState(page, { pianoState: 'extended' });
    const open = await snapshot(page);
    const piano = open.mechanical;
    pianoEndpoint(piano, 'extended', 'Piano extended');
    assert(Math.abs(piano.sourceEndpoints.pianoExtendedZ - piano.sourceEndpoints.pianoRetractedZ - 0.65) < 1e-12, 'Expected converted local +Z travel of 0.65 m');
    const image = await screenshot(page, 'v04_piano_extended.png');
    await clickControl(page, 'Toggle piano');
    await waitState(page, { pianoState: 'retracted', interactionPhase: 'focused' });
    const closed = await snapshot(page);
    pianoEndpoint(closed.mechanical, 'retracted', 'Piano retracted');
    await hero(page, heroPose);
    return { point: result.point, extended: piano, retracted: closed.mechanical.transforms.piano, screenshot: image };
  }, page);

  await check('Trash lid opens to its exact hinge endpoint; Back closes it before exact Hero return', async () => {
    const result = await focus(page, 'trashcan');
    assert.equal(result.state.interaction.trashState, 'open');
    hingeEndpoint(result.state.mechanical, 'trash', 'open', 'Trash open');
    assert(await page.getByText('Deleted ideas live here.', { exact: true }).isVisible());
    const after = await hero(page, heroPose);
    assert.equal(after.interaction.trashState, 'closed');
    hingeEndpoint(after.mechanical, 'trash', 'closed', 'Trash closed');
    return { opened: result.state.mechanical.transforms.trash, closed: after.mechanical.transforms.trash };
  }, page);

  await check('Light Switch ON → OFF → ON changes only practical light intensities and exact switch endpoints', async () => {
    const before = await snapshot(page);
    const result = await focus(page, 'lightswitch');
    // The physical first activation is a functional ON/OFF toggle.
    await waitState(page, { lightsState: 'off' });
    const off = await snapshot(page);
    hingeEndpoint(off.mechanical, 'switch', 'off', 'Switch off');
    const practicalNames = ['LGT_BedProxy', 'LGT_CabinetProxy', 'LGT_DeskProxy'];
    for (const name of practicalNames) {
      assert(name in off.mechanical.lightValues, `Missing addressable practical light ${name}`);
      assert.equal(off.mechanical.lightValues[name], 0, `${name} must be switched off`);
    }
    const baseBefore = before.mechanical.baseLightValues;
    assert(baseBefore && Object.keys(baseBefore).length >= 2, 'Need named base light values to prove they remain on');
    assert.deepEqual(off.mechanical.baseLightValues, baseBefore, 'Base/readability lights must remain unchanged');
    const image = await screenshot(page, 'v04_lights_off.png');
    await clickControl(page, 'Lights: Off');
    await waitState(page, { lightsState: 'on', interactionPhase: 'focused' });
    const on = await snapshot(page);
    hingeEndpoint(on.mechanical, 'switch', 'on', 'Switch on');
    for (const name of practicalNames) {
      assert.equal(on.mechanical.lightValues[name], before.mechanical.lightValues[name], `${name} intensity must restore exactly`);
      assert(on.mechanical.lightValues[name] > 0);
    }
    await hero(page, heroPose);
    return { point: result.point, off: off.mechanical, on: on.mechanical, screenshot: image };
  }, page);

  await check('Phone focuses Contact placeholders without external navigation', async () => {
    await focus(page, 'phone');
    for (const text of ['Contact', 'GitHub', 'LinkedIn', 'Email']) assert(await page.getByText(text, { exact: true }).isVisible(), `Missing ${text}`);
    assert.equal(new URL(page.url()).origin, new URL(origin).origin);
    const state = await snapshot(page);
    await hero(page, heroPose);
    return { focused: state.camera };
  }, page);

  await check('Practical lights can remain OFF while Monitor screen stays active and the room stays navigable', async () => {
    await focus(page, 'lightswitch');
    await waitState(page, { lightsState: 'off', interactionPhase: 'focused' });
    await hero(page, heroPose);
    await focus(page, 'monitor');
    const active = await snapshot(page);
    assert.equal(active.interaction.lightsState, 'off');
    assert(Object.values(active.mechanical.lightValues).every((value) => value === 0));
    assert(Object.values(active.mechanical.baseLightValues).every((value) => value > 0));
    assert(active.mechanical.screenValues.monitor?.every((value) => value === 3));
    await hero(page, heroPose);
    await focus(page, 'lightswitch');
    await waitState(page, { lightsState: 'on', interactionPhase: 'focused' });
    await hero(page, heroPose);
    return { practicalLights: active.mechanical.lightValues, baseLights: active.mechanical.baseLightValues, screens: active.mechanical.screenValues };
  }, page);

  await check('Window native Time slider spans 00:00 through 24:00 and updates centralized state', async () => {
    await focus(page, 'window');
    assert(await page.getByText('Environment', { exact: true }).isVisible());
    const slider = page.getByRole('slider', { name: 'Time', exact: true });
    await slider.focus();
    await page.keyboard.press('Home');
    const min = Number(await slider.inputValue());
    await waitState(page, { time: min });
    assert.equal(min, 0);
    assert(await page.getByText('00:00', { exact: true }).first().isVisible());
    await page.keyboard.press('End');
    const max = Number(await slider.inputValue());
    await waitState(page, { time: max });
    assert([24, 1440].includes(max), `Time max should represent 24:00: ${max}`);
    assert(await page.getByText('24:00', { exact: true }).first().isVisible());
    await page.keyboard.press('ArrowLeft');
    const changed = Number(await slider.inputValue());
    await waitState(page, { time: changed });
    assert(changed < max && changed > min);
    observations.windowTime = { min, max, changed, state: (await snapshot(page)).interaction.time };
    return observations.windowTime;
  }, page);

  for (const weather of ['Sunny', 'Cloudy', 'Overcast', 'Rainy', 'Snowy']) {
    await check(`Window selects ${weather} with a native button and updates application state only`, async () => {
      if ((await snapshot(page)).interaction.activeObject !== 'window') await focus(page, 'window');
      const before = await snapshot(page);
      await clickControl(page, weather);
      await waitState(page, { weather });
      const after = await snapshot(page);
      assert.equal(after.interaction.activeObject, 'window');
      assert.deepEqual(after.camera, before.camera, 'Weather state must not alter the camera');
      assert.deepEqual(after.mechanical, before.mechanical, 'v0.4 weather must not change geometry or lights');
      return { weather: after.interaction.weather };
    }, page);
  }
  await check('Window state persists after Back without adding weather rendering', async () => {
    const before = await snapshot(page);
    const image = await screenshot(page, 'v04_window_panel.png');
    const after = await hero(page, heroPose);
    assert.equal(after.interaction.weather, 'Snowy');
    assert.equal(after.interaction.time, before.interaction.time);
    return { time: after.interaction.time, weather: after.interaction.weather, screenshot: image };
  }, page);

  await check('Non-interactive visible geometry does not start a semantic action or camera fly', async () => {
    await hero(page, heroPose);
    const point = (await hitPoints(page)).__noninteractive;
    assert(point, 'Need a true non-interactive raycast surface');
    await page.mouse.move(point.x, point.y);
    await page.mouse.click(point.x, point.y);
    const after = await snapshot(page);
    assert.equal(after.interaction.activeObject, null);
    assert.equal(after.interaction.hoveredObject, null);
    assert.equal(after.interaction.isCameraBusy, false);
    assert.deepEqual(cameraPose(after.camera), heroPose);
    return { point, state: after.interaction };
  }, page);

  await check('Rapid competing scene clicks queue return without switching objects and keep exact transforms', async () => {
    await hero(page, heroPose);
    const points = await hitPoints(page);
    if (points.macbook) await page.mouse.click(points.macbook.x, points.macbook.y);
    else await page.getByRole('combobox', { name: 'Explore objects', exact: true }).selectOption('macbook');
    const first = await snapshot(page);
    assert.equal(first.interaction.activeObject, 'macbook');
    const competing = ['piano', 'monitor', 'trashcan', 'macbook', 'phone', 'window'].filter((id) => points[id]);
    assert(competing.length >= 3, 'Need multiple visible objects for conflicting physical clicks');
    for (const id of competing) await page.mouse.click(points[id].x, points[id].y);
    await waitState(page, { activeObject: null, interactionPhase: 'idle', isCameraBusy: false });
    const after = await snapshot(page);
    assert.deepEqual(cameraPose(after.camera), heroPose);
    hingeEndpoint(after.mechanical, 'macbook', 'closed', 'MacBook after rapid clicks and Back');
    return { firstPhase: first.interaction.interactionPhase, state: after.interaction };
  }, page);

  await check('Rapid Piano control clicks remain safe and repeated extend/retract cycles have no drift', async () => {
    await focus(page, 'piano');
    await waitState(page, { pianoState: 'extended' });
    const button = page.getByRole('button', { name: 'Toggle piano', exact: true });
    const bounds = await button.boundingBox();
    assert(bounds);
    for (let index = 0; index < 8; index++) await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await settled(page, 'piano');
    const rapid = await snapshot(page);
    assert(['extended', 'retracted'].includes(rapid.interaction.pianoState));
    pianoEndpoint(rapid.mechanical, rapid.interaction.pianoState, 'Piano after rapid toggles');
    for (let cycle = 0; cycle < 4; cycle++) {
      const before = await snapshot(page);
      const expected = before.interaction.pianoState === 'extended' ? 'retracted' : 'extended';
      await clickControl(page, 'Toggle piano');
      await waitState(page, { pianoState: expected, interactionPhase: 'focused' });
      const state = await snapshot(page);
      pianoEndpoint(state.mechanical, expected, `Piano cycle ${cycle + 1}`);
    }
    await hero(page, heroPose);
    return { rapidState: rapid.interaction.pianoState, exactCycles: 4 };
  }, page);

  await check('Back and ESC remain deterministic through repeated complete interaction sessions', async () => {
    const sessions = [];
    for (const [index, id] of ['monitor', 'macbook', 'trashcan', 'ipad', 'phone'].entries()) {
      await focus(page, id);
      const after = await hero(page, heroPose, index % 2 === 0 ? 'escape' : 'button');
      hingeEndpoint(after.mechanical, 'macbook', 'closed', 'MacBook after repeated sessions');
      hingeEndpoint(after.mechanical, 'trash', 'closed', 'Trash after repeated sessions');
      sessions.push(id);
    }
    return { sessions, exactHeroReturns: sessions.length };
  }, page);

  await check('Back requested during focus queues a safe return instead of leaving a stuck animation', async () => {
    await hero(page, heroPose);
    const point = (await hitPoints(page)).macbook;
    if (point) await page.mouse.click(point.x, point.y);
    else await page.getByRole('combobox', { name: 'Explore objects', exact: true }).selectOption('macbook');
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.waitForFunction(() => {
      const value = window.__ROOM_DEBUG__?.snapshot().interaction;
      return value && value.activeObject === null && !value.isCameraBusy;
    }, undefined, { timeout: 15_000 });
    const after = await snapshot(page);
    assert.deepEqual(cameraPose(after.camera), heroPose);
    hingeEndpoint(after.mechanical, 'macbook', 'closed', 'Queued Back MacBook close');
    return { after: after.interaction };
  }, page);

  await check('Keyboard-accessible object selector provides a non-hover path and restores keyboard focus after Back', async () => {
    const selector = page.getByRole('combobox', { name: 'Explore objects', exact: true });
    await selector.selectOption('phone');
    await settled(page, 'phone');
    assert(await page.getByRole('heading', { name: 'Contact', exact: true }).isVisible());
    await hero(page, heroPose);
    assert.equal(await selector.evaluate((element) => document.activeElement === element), true);
    return { selection: 'phone', focusRestored: true };
  }, page);

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const mobile = await mobileContext.newPage();
  observe(mobile, 'mobile-interactions');
  await mobile.goto(`${origin}/?debug=1`, { waitUntil: 'domcontentloaded' });
  await ready(mobile);
  const mobileHero = cameraPose((await snapshot(mobile)).camera);
  observations.mobile = { hero: mobileHero, touches: [] };

  for (const id of ids) {
    await check(`390×844 real touchscreen ${id} focus and visible Back path`, async () => {
      const result = await focus(mobile, id, { touch: true });
      const back = mobile.getByRole('button', { name: 'Back', exact: true });
      const bounds = await back.boundingBox();
      assert(bounds && bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= 391 && bounds.y + bounds.height <= 845, 'Back must be visible within the phone viewport');
      assert(bounds.width >= 40 && bounds.height >= 40, 'Back must have a usable touch area');
      const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflow, false);
      if (id === 'monitor') await screenshot(mobile, 'v04_mobile_focus.png');
      // Real touch input is used for both entering and leaving a focused view.
      await back.tap();
      await mobile.waitForFunction(() => window.__ROOM_DEBUG__?.snapshot().interaction.activeObject === null, undefined, { timeout: 15_000 });
      const after = await snapshot(mobile);
      assert.deepEqual(cameraPose(after.camera), mobileHero);
      assert.equal(after.interaction.isCameraBusy, false);
      observations.mobile.touches.push({ id, point: result.point, back: bounds });
      return { point: result.point, back: bounds, focusedCamera: result.state.camera };
    }, mobile);
  }

  await check('Mobile Window slider, weather, and Marshall controls work with native touch controls', async () => {
    await focus(mobile, 'window', { touch: true });
    await mobile.getByRole('button', { name: 'Rainy', exact: true }).tap();
    await waitState(mobile, { weather: 'Rainy' });
    const slider = mobile.getByRole('slider', { name: 'Time', exact: true });
    const bounds = await slider.boundingBox();
    assert(bounds);
    const previous = Number(await slider.inputValue());
    await mobile.touchscreen.tap(bounds.x + bounds.width * 0.8, bounds.y + bounds.height / 2);
    const next = Number(await slider.inputValue());
    assert.notEqual(next, previous);
    await waitState(mobile, { time: next });
    await hero(mobile, mobileHero);
    await focus(mobile, 'marshall', { touch: true });
    const power = (await snapshot(mobile)).interaction.marshallPower;
    await mobile.getByRole('button', { name: power === 'on' ? 'Power: On' : 'Power: Off', exact: true }).tap();
    const expected = power === 'on' ? 'off' : 'on';
    await waitState(mobile, { marshallPower: expected });
    await hero(mobile, mobileHero);
    return { sliderBefore: previous, sliderAfter: next, weather: 'Rainy', power: expected };
  }, mobile);

  const reducedContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const reduced = await reducedContext.newPage();
  observe(reduced, 'reduced-motion');
  await reduced.goto(`${origin}/?debug=1`, { waitUntil: 'domcontentloaded' });
  await ready(reduced);
  const reducedHero = cameraPose((await snapshot(reduced)).camera);
  await check('Reduced-motion preference keeps focus, hinge, piano and Back functional at exact endpoints', async () => {
    assert.equal(await reduced.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
    assert.equal((await snapshot(reduced)).interaction.reducedMotion, true, 'The interaction controller must consume the preference');
    const started = Date.now();
    await focus(reduced, 'macbook');
    const open = await snapshot(reduced);
    hingeEndpoint(open.mechanical, 'macbook', 'open', 'Reduced-motion MacBook open');
    const closed = await hero(reduced, reducedHero);
    hingeEndpoint(closed.mechanical, 'macbook', 'closed', 'Reduced-motion MacBook close');
    await focus(reduced, 'piano');
    await waitState(reduced, { pianoState: 'extended' });
    const piano = await snapshot(reduced);
    pianoEndpoint(piano.mechanical, 'extended', 'Reduced-motion Piano extended');
    await clickControl(reduced, 'Toggle piano');
    await waitState(reduced, { pianoState: 'retracted', interactionPhase: 'focused' });
    const retracted = await snapshot(reduced);
    pianoEndpoint(retracted.mechanical, 'retracted', 'Reduced-motion Piano retracted');
    await hero(reduced, reducedHero);
    return { elapsedMs: Date.now() - started, note: 'Elapsed includes browser automation and software rendering; endpoint correctness is deterministic.' };
  }, reduced);

  const demandContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const demand = await demandContext.newPage();
  observe(demand, 'demand-rendering');
  await demand.goto(`${origin}/?debug=1&demand=1`, { waitUntil: 'domcontentloaded' });
  await ready(demand);
  await check('Demand rendering stops while idle, advances during GSAP focus and stops after animation', async () => {
    observations.demandStartup = await waitForCanvasReady(demand, { quietMs: 250 });
    // These bounded observation windows measure frame inactivity, not animation timing.
    await demand.waitForTimeout(300);
    const idleStart = (await snapshot(demand)).renderFrames;
    await demand.waitForTimeout(500);
    const idleEnd = (await snapshot(demand)).renderFrames;
    assert.equal(idleEnd, idleStart, 'Idle demand Canvas is still rendering');
    const before = await snapshot(demand);
    const point = (await hitPoints(demand)).monitor;
    await demand.mouse.click(point.x, point.y);
    await settled(demand, 'monitor');
    // React/R3F may deliver the final invalidated frame after the logical state
    // settles under software-renderer load. Observe bounded visual quiescence;
    // the independent 500ms zero-frame assertion below still rejects a loop.
    observations.demandFocusedReady = await waitForCanvasReady(demand, { quietMs: 250, timeoutMs: 20_000 });
    const animated = (await snapshot(demand)).renderFrames;
    assert(animated > idleEnd + 2, 'GSAP focus did not invalidate frames');
    await demand.waitForTimeout(500);
    const focusedIdle = (await snapshot(demand)).renderFrames;
    assert.equal(focusedIdle, animated, 'Focused demand Canvas is still rendering after animations settled');
    await hero(demand, cameraPose(before.camera));
    observations.demandReturnedReady = await waitForCanvasReady(demand, { quietMs: 250, timeoutMs: 20_000 });
    const returnEnd = (await snapshot(demand)).renderFrames;
    await demand.waitForTimeout(500);
    assert.equal((await snapshot(demand)).renderFrames, returnEnd, 'Returning leaves an always-running render loop');
    return { idleStart, idleEnd, animated, focusedIdle, returnEnd };
  }, demand);

  await check('All interaction sessions finish without critical console errors, React warnings or failed assets', async () => {
    const errors = runtime.filter(({ type }) => type === 'error' || type === 'pageerror');
    const reactWarnings = runtime.filter(({ type, text }) => type === 'warning' && /React|update|render|Maximum/i.test(text));
    assert.deepEqual(errors, [], JSON.stringify(errors));
    assert.deepEqual(reactWarnings, [], JSON.stringify(reactWarnings));
    assert.deepEqual(failedRequests, [], JSON.stringify(failedRequests));
    return { consoleErrors: 0, reactWarnings: 0, failedRequests: 0 };
  });
} finally {
  await browser.close();
  const result = {
    generatedAt: new Date().toISOString(), origin,
    browser: 'Installed Google Chrome; Playwright headless; ANGLE SwiftShader (software WebGL)',
    note: 'Debug bridge is read-only. All state changes use real browser input; no fixture mutates frozen scene assets.',
    summary: { passed: checks.filter(({ passed }) => passed).length, failed: checks.filter(({ passed }) => !passed).length },
    checks, observations, runtime, failedRequests,
  };
  await fs.writeFile(path.join(output, 'interaction_browser.json'), JSON.stringify(result, null, 2) + '\n');
  await fs.writeFile(path.join(output, 'INTERACTION_BROWSER_VALIDATION.md'), [
    '# v0.4 Interaction Browser Validation', '',
    `- Generated: ${result.generatedAt}`,
    `- URL: ${origin}`,
    `- Browser: ${result.browser}`,
    `- Result: ${result.summary.passed} passed; ${result.summary.failed} failed`,
    '- Every UI state change is driven by native mouse, touch, or keyboard input.',
    '- Exact camera/mechanical endpoints are observed only through the development-only debug bridge.',
    '- Touch checks validate real browser event wiring at visible raycast pixels; synthetic coordinates do not replace a physical-device usability review.', '',
    '| Check | Result |', '| --- | --- |',
    ...checks.map(({ name, passed }) => `| ${name} | ${passed ? 'PASS' : 'FAIL'} |`), '',
    'Raw snapshots, input coordinates, errors and screenshot references: `interaction_browser.json`.', '',
    ...checks.filter(({ passed }) => !passed).map(({ name, error }) => `## ${name}\n\n\`\`\`\n${error}\n\`\`\``),
  ].join('\n'));
  process.stdout.write(`RESULT ${result.summary.passed} passed; ${result.summary.failed} failed\n`);
  if (result.summary.failed > 0) process.exitCode = 1;
}
