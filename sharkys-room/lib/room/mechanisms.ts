import { gsap } from 'gsap';
import { getAssetStateBinding } from './assets/assetAssembly';
import { Light, Material, Mesh, MeshStandardMaterial, Object3D, Quaternion, Vector3 } from 'three';
import { interactiveObjects, type InteractionId } from './interactiveObjects';
import { animationDurations, animationEase, mechanicalEndpoints, practicalLightNames } from './animationConstants';

type HingeState = 'closed' | 'opening' | 'open' | 'closing';
type PianoState = 'retracted' | 'extending' | 'extended' | 'retracting';
type TransformSnapshot = { position: number[]; quaternion: number[]; rotation: number[] };
export type MechanismSnapshot = {
  macbookState: HingeState;
  trashState: HingeState;
  pianoState: PianoState;
  lightsState: 'on' | 'off';
  marshallPower: 'on' | 'off';
  transforms: { macbook: TransformSnapshot; trash: TransformSnapshot; piano: TransformSnapshot; switch: TransformSnapshot };
  lightValues: Record<string, number>;
  baseLightValues: Record<string, number>;
  screenValues: Partial<Record<'monitor' | 'macbook' | 'ipad' | 'phone', number[]>>;
  sourceEndpoints: { macbookOpenX: number; trashOpenX: number; switchOnZ: number; switchOffZ: number; pianoRetractedZ: number; pianoExtendedZ: number; pianoTravel: number };
};
export type MechanismController = {
  enter: (id: InteractionId, reducedMotion: boolean) => Promise<void>;
  exit: (id: InteractionId, reducedMotion: boolean) => Promise<void>;
  toggle: (id: 'piano' | 'lightswitch' | 'marshall', reducedMotion: boolean) => Promise<void>;
  snapshot: () => MechanismSnapshot;
  subscribe: (listener: () => void) => () => void;
  dispose: () => void;
};

type SavedTransform = { node: Object3D; position: Vector3; quaternion: Quaternion; scale: Vector3 };
type ActiveSurface = { mesh: Mesh; original: Material | Material[]; replacements: Material | Material[]; clones: MeshStandardMaterial[] };
const screenNodes = { monitor: interactiveObjects.monitor.nodes[1], macbook: interactiveObjects.macbook.nodes[1], ipad: interactiveObjects.ipad.nodes[0], phone: interactiveObjects.phone.nodes[0] } as const;

/** Owns only runtime motion, isolated screen materials, and three practical light intensities. */
export function createMechanisms(room: Object3D, invalidate: () => void): MechanismController {
  function required(name: string): Object3D {
    const node = room.getObjectByName(name);
    if (!node) throw new Error(`Missing mechanism node: ${name}`);
    return node;
  }
  const macbook = required(screenNodes.macbook);
  const trash = required(interactiveObjects.trashcan.nodes[1]);
  const piano = required(interactiveObjects.piano.nodes[0]);
  const lightSwitch = required(interactiveObjects.lightswitch.nodes[0]);
  const movingNodes = [macbook, trash, piano, lightSwitch];
  const originals: SavedTransform[] = movingNodes.map(node => ({node, position: node.position.clone(), quaternion: node.quaternion.clone(), scale: node.scale.clone()}));
  const originalMaterials = new Map<Mesh, Material | Material[]>();
  room.traverse(node => { if (node instanceof Mesh) originalMaterials.set(node, node.material); });
  const practicalLights = practicalLightNames.map(name => {
    const light = required(name);
    if (!(light instanceof Light)) throw new Error(`Expected exported light: ${name}`);
    return { light, intensity: light.intensity };
  });
  const baseLights: Light[] = [];
  room.traverse(node => { if (node instanceof Light && !(practicalLightNames as readonly string[]).includes(node.name)) baseLights.push(node); });
  // The frozen Hero intentionally exports the laptop open and the piano extended.
  // Their initial pose remains untouched. Motion endpoints use the inspected source,
  // retaining its float32 rounding while keeping rail travel exactly 0.65 metres.
  const macbookOpen = macbook.quaternion.clone();
  const macbookOpenX = macbook.rotation.x;
  const pianoExtendedZ = piano.position.z;
  const pianoRetractedZ = pianoExtendedZ - mechanicalEndpoints.piano.travel;
  const switchOn = lightSwitch.quaternion.clone();
  const switchOnZ = lightSwitch.rotation.z;
  const switchOffZ = -switchOnZ;
  const axisX = new Vector3(1, 0, 0);
  const axisZ = new Vector3(0, 0, 1);
  const identity = new Quaternion();
  const trashOpen = new Quaternion().setFromAxisAngle(axisX, mechanicalEndpoints.trash.open);
  const switchOff = new Quaternion().setFromAxisAngle(axisZ, switchOffZ);
  let macbookState: HingeState = 'open';
  let trashState: HingeState = 'closed';
  let pianoState: PianoState = 'extended';
  let lightsState: 'on' | 'off' = 'on';
  let marshallPower: 'on' | 'off' = 'off';
  let disposed = false;
  let firstPianoActivation = true;
  let firstMarshallActivation = true;
  const listeners = new Set<() => void>();
  const activeSurfaces = new Map<InteractionId, ActiveSurface[]>();
  const operations = new Map<string, Promise<void>>();
  const animations = new Set<{ tween: gsap.core.Tween; finish: () => void }>();

  function duration(seconds: number, reduced: boolean) { return reduced ? animationDurations.reduced : seconds; }
  function notify() { if (!disposed) listeners.forEach(listener => listener()); }
  function frame() { room.updateMatrixWorld(true); invalidate(); }
  function exclusive(key: string, action: () => Promise<void>): Promise<void> {
    if (disposed) return Promise.resolve();
    const pending = operations.get(key);
    if (pending) return pending;
    const promise = action().finally(() => { if (operations.get(key) === promise) operations.delete(key); });
    operations.set(key, promise);
    return promise;
  }
  function animate(seconds: number, update: (progress: number) => void): Promise<void> {
    if (disposed) return Promise.resolve();
    if (!seconds) { update(1); frame(); return Promise.resolve(); }
    return new Promise(resolve => {
      const progress = { value: 0 };
      let record: { tween: gsap.core.Tween; finish: () => void } | undefined;
      const finish = () => { if (record) animations.delete(record); resolve(); };
      const tween = gsap.to(progress, { value: 1, duration: seconds, ease: animationEase, onUpdate: () => { if (!disposed) { update(progress.value); frame(); } }, onComplete: finish, onInterrupt: finish });
      record = { tween, finish };
      animations.add(record);
    });
  }
  async function hinge(node: Object3D, endpoint: Quaternion, seconds: number) {
    const start = node.quaternion.clone();
    await animate(seconds, progress => node.quaternion.slerpQuaternions(start, endpoint, progress));
    if (!disposed) { node.quaternion.copy(endpoint); frame(); }
  }
  function surfaces(id: InteractionId): ActiveSurface[] {
    const existing = activeSurfaces.get(id);
    if (existing) return existing;
    const name = id === 'marshall' ? interactiveObjects.marshall.nodes[0] : screenNodes[id as keyof typeof screenNodes];
    if (!name) return [];
    const created: ActiveSurface[] = [];
    const binding = getAssetStateBinding(room, id);
    const candidates: Mesh[] = [];
    if (binding) candidates.push(...binding.meshes);
    else required(name).traverse(node => { if (node instanceof Mesh && !node.userData.roomProxySuppressed) candidates.push(node); });
    for (const node of candidates) {
      const original = originalMaterials.get(node)!;
      const materials = Array.isArray(original) ? original : [original];
      const clones: MeshStandardMaterial[] = [];
      const replacements = materials.map(material => {
        if (!(material instanceof MeshStandardMaterial) || (!binding && id !== 'marshall' && material.name !== 'MAT_ScreenProxy_Greybox')) return material;
        const copy = material.clone();
        if (id === 'marshall') { if (!binding) copy.emissive.set('#699080'); copy.emissiveIntensity = 0; }
        clones.push(copy);
        return copy;
      });
      if (!clones.length) continue;
      const replacement = Array.isArray(original) ? replacements : replacements[0];
      created.push({ mesh: node, original, replacements: replacement, clones });
      node.material = replacement;
    }
    activeSurfaces.set(id, created);
    return created;
  }
  function releaseSurfaces(id: InteractionId) {
    for (const surface of activeSurfaces.get(id) ?? []) {
      surface.mesh.material = surface.original;
      surface.clones.forEach(material => material.dispose());
    }
    activeSurfaces.delete(id);
    frame();
  }
  async function setScreen(id: InteractionId, active: boolean, reduced: boolean) {
    if (!(id in screenNodes)) return;
    getAssetStateBinding(room, id)?.screen?.setActive(active);
    const owned = active ? surfaces(id) : activeSurfaces.get(id) ?? [];
    const values = owned.flatMap(surface => surface.clones.map(material => ({material, start: material.emissiveIntensity})));
    await animate(duration(animationDurations.power, reduced), progress => values.forEach(({material, start}) => { material.emissiveIntensity = start + ((active ? 3 : 1) - start) * progress; }));
    if (!active && !disposed) releaseSurfaces(id);
  }
  async function moveMacbook(open: boolean, reduced: boolean) {
    macbookState = open ? 'opening' : 'closing';
    notify();
    await hinge(macbook, open ? macbookOpen : identity, duration(animationDurations.hinge, reduced));
    if (!disposed) { macbookState = open ? 'open' : 'closed'; notify(); }
  }
  async function moveTrash(open: boolean, reduced: boolean) {
    trashState = open ? 'opening' : 'closing';
    notify();
    await hinge(trash, open ? trashOpen : identity, duration(animationDurations.hinge, reduced));
    if (!disposed) { trashState = open ? 'open' : 'closed'; notify(); }
  }
  async function setMarshall(on: boolean, reduced: boolean) {
    marshallPower = on ? 'on' : 'off';
    notify();
    const values = surfaces('marshall').flatMap(surface => surface.clones.map(material => ({material, start: material.emissiveIntensity})));
    await animate(duration(animationDurations.power, reduced), progress => values.forEach(({material, start}) => {material.emissiveIntensity = start + ((on ? getAssetStateBinding(room, 'marshall') ? 2.4 : .28 : 0) - start) * progress;}));
    if (!on && !disposed) releaseSurfaces('marshall');
  }
  async function movePiano(extend: boolean, reduced: boolean) {
        pianoState = extend ? 'extending' : 'retracting';
        notify();
        const start = piano.position.z;
        const end = extend ? pianoExtendedZ : pianoRetractedZ;
        await animate(duration(animationDurations.piano, reduced), progress => { piano.position.z = start + (end - start) * progress; });
        if (!disposed) { piano.position.z = end; pianoState = extend ? 'extended' : 'retracted'; frame(); notify(); }
  }
  function toggle(id: 'piano' | 'lightswitch' | 'marshall', reduced: boolean): Promise<void> {
    return exclusive(id, async () => {
      if (id === 'piano') {
        await movePiano(pianoState === 'retracted', reduced);
      } else if (id === 'lightswitch') {
        const on = lightsState === 'off';
        lightsState = on ? 'on' : 'off';
        notify();
        const starts = practicalLights.map(({light}) => light.intensity);
        await Promise.all([
          hinge(lightSwitch, on ? switchOn : switchOff, duration(animationDurations.switch, reduced)),
          animate(duration(animationDurations.switch, reduced), progress => practicalLights.forEach(({light, intensity}, index) => {light.intensity = starts[index] + ((on ? intensity : 0) - starts[index]) * progress;})),
        ]);
        if (!disposed) { practicalLights.forEach(({light, intensity}) => {light.intensity = on ? intensity : 0;}); frame(); }
      } else await setMarshall(marshallPower !== 'on', reduced);
    });
  }
  function enter(id: InteractionId, reduced: boolean): Promise<void> {
    if (id === 'piano') {
      if (!firstPianoActivation) return toggle(id, reduced);
      return exclusive(id, async () => {
        firstPianoActivation = false;
        // Preserve the authored extended Hero, then visibly prepare the first pull-out.
        await movePiano(false, reduced);
        if (!disposed) await movePiano(true, reduced);
      });
    }
    if (id === 'lightswitch') return toggle(id, reduced);
    return exclusive(id, async () => {
      if (id === 'macbook') {
        // First focus demonstrates the hinge while retaining the frozen initial Hero.
        if (macbookState === 'open') await moveMacbook(false, reduced);
        if (disposed) return;
        await moveMacbook(true, reduced);
      } else if (id === 'trashcan') await moveTrash(true, reduced);
      else if (id === 'marshall' && firstMarshallActivation) { firstMarshallActivation = false; await setMarshall(true, reduced); }
      if (!disposed) await setScreen(id, true, reduced);
    });
  }
  function exit(id: InteractionId, reduced: boolean): Promise<void> {
    return exclusive(id, async () => {
      await setScreen(id, false, reduced);
      if (disposed) return;
      if (id === 'macbook') await moveMacbook(false, reduced);
      if (id === 'trashcan') await moveTrash(false, reduced);
    });
  }
  function snapshot(): MechanismSnapshot {
    const transform = (node: Object3D): TransformSnapshot => ({ position: node.position.toArray(), quaternion: node.quaternion.toArray(), rotation: [node.rotation.x, node.rotation.y, node.rotation.z] });
    return {
      macbookState, trashState, pianoState, lightsState, marshallPower,
      transforms: { macbook: transform(macbook), trash: transform(trash), piano: transform(piano), switch: transform(lightSwitch) },
      lightValues: Object.fromEntries(practicalLights.map(({light}) => [light.name, light.intensity])),
      baseLightValues: Object.fromEntries(baseLights.map(light => [light.name, light.intensity])),
      screenValues: Object.fromEntries([...activeSurfaces.entries()].filter(([id]) => id in screenNodes).map(([id, owned]) => [id, owned.flatMap(surface => surface.clones.map(material => material.emissiveIntensity))])),
      sourceEndpoints: {macbookOpenX, trashOpenX: mechanicalEndpoints.trash.open, switchOnZ, switchOffZ, pianoRetractedZ, pianoExtendedZ, pianoTravel: mechanicalEndpoints.piano.travel},
    };
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    listeners.clear();
    for (const animation of [...animations]) { animation.tween.kill(); animation.finish(); }
    animations.clear();
    for (const id of [...activeSurfaces.keys()]) releaseSurfaces(id);
    for (const {node, position, quaternion, scale} of originals) { node.position.copy(position); node.quaternion.copy(quaternion); node.scale.copy(scale); }
    practicalLights.forEach(({light, intensity}) => {light.intensity = intensity;});
    frame();
  }
  return {enter, exit, toggle, snapshot, subscribe: listener => { listeners.add(listener); return () => {listeners.delete(listener);}; }, dispose};
}
