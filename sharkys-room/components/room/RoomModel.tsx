import type { Group } from 'three';
import type { InteractionId } from '@/types/room';
import { useRoomInteractions } from './InteractionManager';
import { PianoRetractedHitArea } from './PianoRetractedHitArea';
export function RoomModel({scene,hovered,onHover,pianoHitAreaActive,visualizeHitAreas}:{scene:Group;hovered:InteractionId|null;onHover:(id:InteractionId|null)=>void;pianoHitAreaActive:boolean;visualizeHitAreas:boolean}) {
  const handlers=useRoomInteractions(hovered,onHover);
  return <group {...handlers}>
    <primitive object={scene} dispose={null}/>
    <PianoRetractedHitArea active={pianoHitAreaActive} visualize={visualizeHitAreas}/>
  </group>;
}
