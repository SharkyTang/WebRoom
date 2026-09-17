'use client';
import { Component, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { AgXToneMapping, SRGBColorSpace } from 'three';
import type { InteractionId, RoomLoadStatus, RoomPerformance, RoomValidation } from '@/types/room';
import { RoomScene } from './RoomScene';
import type { InteractionState, InteractionStore } from '@/lib/room/interactionState';
export type RoomCanvasProps = {
  interaction: InteractionState; store: InteractionStore;
  debug: boolean; demandDiagnostics: boolean; status: RoomLoadStatus; validation: RoomValidation | null; hovered: InteractionId | null; selected: InteractionId | null; performance: RoomPerformance | null;
  onProgress:(value:number)=>void; onValidation:(value:RoomValidation)=>void; onReady:()=>void; onError:(message:string)=>void; onHover:(id:InteractionId|null)=>void; onSelect:(id:InteractionId|null)=>void; onPerformance:(value:RoomPerformance)=>void;
};
class CanvasBoundary extends Component<{ children: ReactNode; onError:(message:string)=>void }, {failed:boolean}> {
  state = { failed:false };
  static getDerivedStateFromError() { return {failed:true}; }
  componentDidCatch(error:Error) { this.props.onError(`WebGL rendering failed: ${error.message}`); }
  render() { return this.state.failed ? null : this.props.children; }
}
export default function RoomCanvas(props: RoomCanvasProps) {
  return <CanvasBoundary onError={props.onError}><Canvas dpr={[1, 1.5]} frameloop={props.debug && !props.demandDiagnostics ? 'always' : 'demand'} gl={{antialias:true, powerPreference:'low-power', toneMapping:AgXToneMapping, outputColorSpace:SRGBColorSpace}} onPointerMissed={() => props.onHover(null)} onPointerLeave={() => props.onHover(null)} fallback={<p role="alert">WebGL 2 is unavailable in this browser.</p>}>
    <color attach="background" args={['#c6cdd5']} /><RoomScene {...props} />
  </Canvas></CanvasBoundary>;
}
