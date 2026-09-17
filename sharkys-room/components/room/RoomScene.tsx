import { useEffect, useRef, useState } from 'react';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Light, PerspectiveCamera, type Group } from 'three';
import { MODEL_URL, HERO_CAMERA_NAME } from '@/lib/room/sceneConstants';
import { validateScene } from '@/lib/room/diagnostics';
import { RoomModel } from './RoomModel';
import { HeroCamera } from './HeroCamera';
import { CameraController } from './CameraController';
import { HoverHighlight } from './HoverHighlight';
import { DebugBridge } from './DebugBridge';
import { isPianoRetractedHitAreaActive } from '@/lib/room/pianoInteraction';
import type { RoomCanvasProps } from './RoomCanvas';
import { loadProductionAssets } from '@/lib/room/assets/loadProductionAssets';
import { ownObjectResources } from '@/lib/room/assets/resourceOwnership';
export function RoomScene(props: RoomCanvasProps) {
  const {onError, onProgress, onValidation, onAssets} = props;
  const runtimeCleanup = useRef<(() => void) | null>(null);
  const [room, setRoom] = useState<Group | null>(null);
  useEffect(() => {
    const controller = new AbortController(); let loaded:Group|null = null;
    let sourceOwner: ReturnType<typeof ownObjectResources> | undefined;
    let assetOwner: Awaited<ReturnType<typeof loadProductionAssets>> | undefined;
    setRoom(null);
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
        loaded=gltf.scene; sourceOwner = ownObjectResources(loaded);
        if(controller.signal.aborted) {sourceOwner.dispose();loaded=null;return;}
        const result = validateScene(loaded); onValidation(result);
        if (!result.ok) throw new Error(`Frozen scene validation failed: ${[...result.missingNodes,...result.missingTargets,...result.errors].join('; ')}`);
        // Blender exports photometric values; normalize light intensity only, preserving all source transforms.
        loaded.traverse(object => { if(object instanceof Light) object.intensity /= 683; });
        onProgress(94);
        assetOwner = await loadProductionAssets(loaded, controller.signal);
        if (controller.signal.aborted) { assetOwner.dispose(); sourceOwner.dispose(); return; }
        if (!assetOwner.assembly.ok) throw new Error(`Asset assembly contract failed: ${assetOwner.assembly.errors.join('; ')}`);
        onAssets(assetOwner.report); onProgress(98); setRoom(loaded);
      } catch(error) { assetOwner?.dispose(); sourceOwner?.dispose(); loaded=null; if(!controller.signal.aborted) onError(error instanceof Error ? error.message : String(error)); }
    }
    void load();
    return () => {runtimeCleanup.current?.(); controller.abort(); assetOwner?.dispose(); sourceOwner?.dispose();};
  }, [onError,onProgress,onValidation,onAssets]);
  const camera=room?.getObjectByName(HERO_CAMERA_NAME);
  return <><hemisphereLight args={['#ecf2ff','#656875',1.6]} />
    {room && camera instanceof PerspectiveCamera && <><HeroCamera source={camera} /><CameraController runtimeCleanup={runtimeCleanup} room={room} store={props.store} onReady={props.onReady}/><HoverHighlight room={room} hovered={props.hovered}/><RoomModel scene={room} hovered={props.hovered} onHover={props.onHover} onSelect={props.onSelect} pianoHitAreaActive={props.status === 'ready' && isPianoRetractedHitAreaActive(props.interaction)} visualizeHitAreas={props.debug && props.visualizeHitAreas}/></>}
    {props.debug && <DebugBridge room={room} {...props} />}
  </>;
}
