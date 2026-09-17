import type { InteractionId } from './interactiveObjects';
import type { MechanismController, MechanismSnapshot } from './mechanisms';
import type { CameraAnimator } from './cameraAnimation';

export const weatherOptions = ['Sunny', 'Cloudy', 'Overcast', 'Rainy', 'Snowy'] as const;
export type Weather = typeof weatherOptions[number];
export type InteractionPhase = 'idle' | 'hovering' | 'focusing' | 'focused' | 'interacting' | 'returning';
export type InteractionState = {
  activeObject: InteractionId | null;
  hoveredObject: InteractionId | null;
  interactionPhase: InteractionPhase;
  isCameraBusy: boolean;
  pianoState: 'retracted' | 'extending' | 'extended' | 'retracting';
  macbookState: 'closed' | 'opening' | 'open' | 'closing';
  trashState: 'closed' | 'opening' | 'open' | 'closing';
  lightsState: 'on' | 'off';
  marshallPower: 'on' | 'off';
  time: number;
  weather: Weather;
  reducedMotion: boolean;
  returnRequested: boolean;
  error: string | null;
};
export type InteractionRuntime = { camera: CameraAnimator; mechanisms: MechanismController };
export const initialInteractionState: InteractionState = {
  activeObject: null, hoveredObject: null, interactionPhase: 'idle', isCameraBusy: false,
  pianoState: 'retracted', macbookState: 'open', trashState: 'closed', lightsState: 'on', marshallPower: 'off',
  time: 12, weather: 'Sunny', reducedMotion: false, returnRequested: false, error: null,
};
const toggles = new Set<InteractionId>(['piano', 'lightswitch', 'marshall']);

/** One owner serializes camera and mechanical operations; frame updates never write React state. */
export function createInteractionStore() {
  let state = { ...initialInteractionState };
  let runtime: InteractionRuntime | null = null;
  let generation = 0;
  const listeners = new Set<() => void>();
  const publish = (patch: Partial<InteractionState>) => {
    state = { ...state, ...patch };
    listeners.forEach(listener => listener());
  };
  const syncMechanisms = (value: MechanismSnapshot) => publish({
    pianoState: value.pianoState, macbookState: value.macbookState, trashState: value.trashState,
    lightsState: value.lightsState, marshallPower: value.marshallPower,
  });
  const current = (token: number) => runtime !== null && token === generation;
  const fail = (error: unknown) => publish({ error: error instanceof Error ? error.message : String(error) });

  async function returnHome() {
    if (!runtime || !state.activeObject || state.interactionPhase === 'returning') return;
    if (state.interactionPhase === 'focusing' || state.interactionPhase === 'interacting') {
      publish({ returnRequested: true });
      return;
    }
    const token = generation; const owner = runtime; const id = state.activeObject;
    publish({ interactionPhase: 'returning', isCameraBusy: true, hoveredObject: null, returnRequested: false });
    try {
      const closing = owner.mechanisms.exit(id, state.reducedMotion);
      syncMechanisms(owner.mechanisms.snapshot());
      await closing; if (!current(token)) return;
      syncMechanisms(owner.mechanisms.snapshot());
      await owner.camera.home(state.reducedMotion); if (!current(token)) return;
      publish({ activeObject: null, interactionPhase: 'idle', isCameraBusy: false, hoveredObject: null });
    } catch (error) { if (current(token)) fail(error); }
  }

  async function toggle(id: 'piano' | 'lightswitch' | 'marshall') {
    if (!runtime || state.activeObject !== id || state.interactionPhase !== 'focused') return;
    const token = generation; const owner = runtime;
    publish({ interactionPhase: 'interacting', hoveredObject: null });
    try {
      const action = owner.mechanisms.toggle(id, state.reducedMotion);
      syncMechanisms(owner.mechanisms.snapshot());
      await action; if (!current(token)) return;
      syncMechanisms(owner.mechanisms.snapshot());
      publish({ interactionPhase: 'focused' });
      if (state.returnRequested) await returnHome();
    } catch (error) { if (current(token)) fail(error); }
  }

  async function activate(id: InteractionId) {
    if (!runtime) return;
    if (state.activeObject) {
      if (state.activeObject === id && toggles.has(id)) await toggle(id as 'piano' | 'lightswitch' | 'marshall');
      return;
    }
    if (state.interactionPhase !== 'idle' && state.interactionPhase !== 'hovering') return;
    const owner = runtime; const token = generation;
    publish({ activeObject: id, hoveredObject: null, interactionPhase: 'focusing', isCameraBusy: true, error: null });
    try {
      await owner.camera.focus(id, state.reducedMotion); if (!current(token)) return;
      publish({ interactionPhase: 'interacting', isCameraBusy: false });
      const action = owner.mechanisms.enter(id, state.reducedMotion);
      syncMechanisms(owner.mechanisms.snapshot());
      await action; if (!current(token)) return;
      syncMechanisms(owner.mechanisms.snapshot());
      publish({ interactionPhase: 'focused' });
      if (state.returnRequested) await returnHome();
    } catch (error) { if (current(token)) fail(error); }
  }

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    attach: (value: InteractionRuntime) => {
      generation++; runtime = value; publish({ ...initialInteractionState, reducedMotion: state.reducedMotion });
      syncMechanisms(value.mechanisms.snapshot());
      const unsubscribe = value.mechanisms.subscribe(() => syncMechanisms(value.mechanisms.snapshot()));
      return () => { if (runtime === value) { generation++; runtime = null; unsubscribe(); value.camera.dispose(); value.mechanisms.dispose(); } };
    },
    hover: (id: InteractionId | null) => {
      if (state.activeObject || state.isCameraBusy || state.hoveredObject === id) return;
      publish({ hoveredObject: id, interactionPhase: id ? 'hovering' : 'idle' });
    },
    activate, back: returnHome, toggle,
    setTime: (time: number) => { if (state.activeObject === 'window' && state.interactionPhase === 'focused' && Number.isFinite(time)) publish({ time: Math.min(24, Math.max(0, time)) }); },
    setWeather: (weather: Weather) => { if (state.activeObject === 'window' && state.interactionPhase === 'focused' && weatherOptions.includes(weather)) publish({ weather }); },
    setReducedMotion: (reducedMotion: boolean) => publish({ reducedMotion }),
    mechanicalSnapshot: () => runtime?.mechanisms.snapshot() ?? null,
    cameraSnapshot: () => runtime?.camera.snapshot() ?? null,
  };
}
export type InteractionStore = ReturnType<typeof createInteractionStore>;
export function formatTime(time: number) {
  const minutes = Math.round(time * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
