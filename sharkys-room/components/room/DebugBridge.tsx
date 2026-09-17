import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, type Group } from 'three';
import { visibleHitPoints, type VisibleHitPoints } from '@/lib/room/visibleHitPoints';
import type { RoomCanvasProps } from './RoomCanvas';
export type DebugSnapshot=Pick<RoomCanvasProps,'status'|'validation'|'hovered'|'selected'|'performance'|'interaction'> & {mechanical:ReturnType<RoomCanvasProps["store"]["mechanicalSnapshot"]>;cameraAnimation:ReturnType<RoomCanvasProps["store"]["cameraSnapshot"]>;renderFrames:number;camera:{name:string;position:number[];quaternion:number[];fov:number;aspect:number;near:number;far:number}|null};
declare global {interface Window {__ROOM_DEBUG__?:{snapshot:()=>DebugSnapshot;projected:()=>VisibleHitPoints}}}
export function DebugBridge(props:RoomCanvasProps & {room:Group|null}) {
  const get=useThree(state=>state.get);const latest=useRef(props);latest.current=props;
  const renderFrames=useRef(0);
  const timing=useRef({elapsed:0,frames:0});
  useFrame((state,delta)=>{
    renderFrames.current++;
    timing.current.elapsed+=delta;timing.current.frames++;
    if(timing.current.elapsed>=1){const {elapsed,frames}=timing.current;latest.current.onPerformance({fps:frames/elapsed,frameMs:elapsed/frames*1000,calls:state.gl.info.render.calls,triangles:state.gl.info.render.triangles});timing.current.elapsed=0;timing.current.frames=0;}
  });
  useEffect(()=>{
    if(process.env.NODE_ENV!=='development') return;
    const api={snapshot:():DebugSnapshot=>{const p=latest.current;const camera=get().camera;return {status:p.status,validation:p.validation,hovered:p.hovered,selected:p.selected,performance:p.performance,interaction:p.store.getSnapshot(),mechanical:p.store.mechanicalSnapshot(),cameraAnimation:p.store.cameraSnapshot(),renderFrames:renderFrames.current,camera:camera instanceof PerspectiveCamera?{name:camera.name,position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov,aspect:camera.aspect,near:camera.near,far:camera.far}:null};},
      projected:()=>{const {room}=latest.current;const {camera,gl}=get();return room?visibleHitPoints(room,camera,gl.domElement):{};}};
    window.__ROOM_DEBUG__=api;return()=>{if(window.__ROOM_DEBUG__===api)delete window.__ROOM_DEBUG__;};
  },[get]);
  return null;
}
