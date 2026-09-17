import { pianoRetractedHitArea } from '@/lib/room/pianoInteraction';

/** Runtime sibling of the frozen model. Inherits the same semantic event handlers. */
export function PianoRetractedHitArea({ active, visualize }: { active: boolean; visualize: boolean }) {
  if (!active) return null;
  return <mesh name={pianoRetractedHitArea.name} position={pianoRetractedHitArea.position}>
    <boxGeometry args={pianoRetractedHitArea.size} />
    {/* A hidden material skips drawing but preserves Three.js mesh raycasting. */}
    <meshBasicMaterial visible={process.env.NODE_ENV === 'development' && visualize} wireframe color="#d76622" depthWrite={false} />
  </mesh>;
}
