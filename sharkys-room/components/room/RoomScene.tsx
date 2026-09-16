import { useEffect, useState } from 'react';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Light, Mesh, PerspectiveCamera, type Group, type Material } from 'three';
import { MODEL_URL, HERO_CAMERA_NAME } from '@/lib/room/sceneConstants';
import { validateScene } from '@/lib/room/diagnostics';
import { RoomModel } from './RoomModel';
import { HeroCamera } from './HeroCamera';
import { DebugBridge } from './DebugBridge';
import type { RoomCanvasProps } from './RoomCanvas';
function disposeScene(scene: Group) {
  const materials = new Set<Material>();
  scene.traverse(object => { if (object instanceof Mesh) {object.geometry.dispose(); (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => materials.add(m));} });
  materials.forEach(material => material.dispose());
}
export function RoomScene(props: RoomCanvasProps) {
  const {onError, onProgress, onValidation} = props;
  const [room, setRoom] = useState<Group | null>(null);
  useEffect(() => {
    const controller = new AbortController(); let loaded:Group|null = null;
    async function load() {
      try {
        const response = await fetch(MODEL_URL, {signal:controller.signal});
        if (!response.ok) throw new Error(`GLB download failed: HTTP ${response.status}`);
        const total = Number(response.headers.get('content-length'));
        const reader = response.body?.getReader();
        if (!reader) throw new Error('GLB response has no readable body');
        const chunks:Uint8Array[] = []; let bytes = 0;
        while (true) { const {done,value} = await reader.read(); if(done) break; chunks.push(value); bytes += value.length; if(total) onProgress(Math.min(90,bytes/total*90)); }
        const data = new Uint8Array(bytes); let offset=0; for (const chunk of chunks) {data.set(chunk,offset);offset+=chunk.length;}
        const gltf = await new GLTFLoader().parseAsync(data.buffer, '/models/');
        loaded=gltf.scene;
        if(controller.signal.aborted) {disposeScene(loaded);loaded=null;return;}
        const result = validateScene(loaded); onValidation(result);
        if (!result.ok) throw new Error(`Frozen scene validation failed: ${[...result.missingNodes,...result.missingTargets,...result.errors].join('; ')}`);
        // Blender exports photometric values; normalize light intensity only, preserving all source transforms.
        loaded.traverse(object => { if(object instanceof Light) object.intensity /= 683; });
        onProgress(98); setRoom(loaded);
      } catch(error) { if(!controller.signal.aborted) onError(error instanceof Error ? error.message : String(error)); }
    }
    void load();
    return () => {controller.abort(); if(loaded) disposeScene(loaded);};
  }, [onError,onProgress,onValidation]);
  const camera=room?.getObjectByName(HERO_CAMERA_NAME);
  return <><hemisphereLight args={['#ecf2ff','#656875',1.6]} />
    {room && camera instanceof PerspectiveCamera && <><HeroCamera source={camera} onReady={props.onReady} /><RoomModel scene={room} hovered={props.hovered} onHover={props.onHover} onSelect={props.onSelect}/></>}
    {props.debug && <DebugBridge room={room} {...props} />}
  </>;
}
