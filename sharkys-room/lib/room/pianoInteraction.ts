import type { InteractionState } from './interactionState';

/** Web-only aid in loaded glTF Y-up metres; independent of the moving rail/GLB. */
export const pianoRetractedHitArea = {
  name: 'PianoRetractedHitArea',
  position: [-0.65, 0.52, -1.35] as [number, number, number],
  size: [1.5, 0.32, 0.4] as [number, number, number],
} as const;

export function isPianoRetractedHitAreaActive(state: InteractionState): boolean {
  if (state.pianoState !== 'retracted' || state.isCameraBusy || state.returnRequested) return false;
  return state.activeObject === null
    ? state.interactionPhase === 'idle' || state.interactionPhase === 'hovering'
    : state.activeObject === 'piano' && state.interactionPhase === 'focused';
}
