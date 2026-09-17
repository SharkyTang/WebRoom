import type { RoomPerformance, RoomValidation } from '@/types/room';
import { isPianoRetractedHitAreaActive } from '@/lib/room/pianoInteraction';
import type { InteractionState } from '@/lib/room/interactionState';
export function DebugPanel({ validation, performance, interaction, ready }: { validation: RoomValidation | null; performance: RoomPerformance | null; interaction: InteractionState; ready: boolean }) {
  return <details className="debug-panel"><summary>DEV · {validation?.ok ? '85 nodes verified' : 'Validating'} · {performance ? `${performance.fps.toFixed(0)} fps` : 'sampling…'}</summary>
    <div><p>phase: {interaction.interactionPhase} · active: {interaction.activeObject ?? "—"}<br/>hovered: {interaction.hoveredObject ?? "—"} · cameraBusy: {String(interaction.isCameraBusy)}<br/>pianoState: {interaction.pianoState}<br/>pianoRetractedHitAreaActive: {String(ready && isPianoRetractedHitAreaActive(interaction))}<br/>macbook: {interaction.macbookState}<br/>trash: {interaction.trashState} · lights: {interaction.lightsState}<br/>marshall: {interaction.marshallPower} · time: {interaction.time} · weather: {interaction.weather}</p><p>Hero: CAM_Hero_FINAL · 48mm · 3:2</p><p>{validation?.nodeCount ?? 0} source nodes · {validation?.meshCount ?? 0} primitive meshes · {validation?.triangleCount ?? 0} triangles</p>
      <p>{performance ? `${performance.frameMs.toFixed(1)} ms · ${performance.calls} calls · ${performance.triangles} rendered triangles` : 'Frame statistics sample once per second.'}</p>
      <ul>{validation?.mappings.map(item => <li key={item.id}><b>{item.id}</b> → {item.nodeNames.join(' / ')} → {item.targetName}<br />({item.targetPosition.map(v => v.toFixed(3)).join(', ')})</li>)}</ul>
    </div>
  </details>;
}
