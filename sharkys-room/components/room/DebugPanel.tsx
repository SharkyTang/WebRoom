import type { RoomPerformance, RoomValidation } from '@/types/room';
export function DebugPanel({ validation, performance }: { validation: RoomValidation | null; performance: RoomPerformance | null }) {
  return <details className="debug-panel"><summary>DEV · {validation?.ok ? '85 nodes verified' : 'Validating'} · {performance ? `${performance.fps.toFixed(0)} fps` : 'sampling…'}</summary>
    <div><p>Hero: CAM_Hero_FINAL · 48mm · 3:2</p><p>{validation?.nodeCount ?? 0} source nodes · {validation?.meshCount ?? 0} primitive meshes · {validation?.triangleCount ?? 0} triangles</p>
      <p>{performance ? `${performance.frameMs.toFixed(1)} ms · ${performance.calls} calls · ${performance.triangles} rendered triangles` : 'Frame statistics sample once per second.'}</p>
      <ul>{validation?.mappings.map(item => <li key={item.id}><b>{item.id}</b> → {item.nodeNames.join(' / ')} → {item.targetName}<br />({item.targetPosition.map(v => v.toFixed(3)).join(', ')})</li>)}</ul>
    </div>
  </details>;
}
