import { useEffect } from 'react';
import { useCursor } from '@react-three/drei';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { resolveInteraction, type InteractionId } from '@/lib/room/interactiveObjects';
export function useRoomInteractions(hovered:InteractionId|null,onHover:(id:InteractionId|null)=>void,onSelect:(id:InteractionId|null)=>void) {
  const canvas=useThree(state=>state.gl.domElement);
  useCursor(Boolean(hovered));
  useEffect(()=>{canvas.style.cursor=hovered?'pointer':'auto'; return()=>{canvas.style.cursor='auto';};},[canvas,hovered]);
  return {
    onPointerMove:(event:ThreeEvent<PointerEvent>)=>{event.stopPropagation();onHover(resolveInteraction(event.object));},
    onPointerOut:()=>onHover(null),
    onClick:(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();onSelect(resolveInteraction(event.object));},
  };
}
