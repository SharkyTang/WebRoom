import type { Group } from 'three';
import type { InteractionId } from '@/types/room';
import { useRoomInteractions } from './InteractionManager';
export function RoomModel({scene,hovered,onHover,onSelect}:{scene:Group;hovered:InteractionId|null;onHover:(id:InteractionId|null)=>void;onSelect:(id:InteractionId|null)=>void}) {
  const handlers=useRoomInteractions(hovered,onHover,onSelect);
  return <primitive object={scene} dispose={null} {...handlers}/>;
}
