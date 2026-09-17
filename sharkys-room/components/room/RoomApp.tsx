'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { InteractionId, RoomLoadStatus, RoomPerformance, RoomValidation } from '@/types/room';
import { createInteractionStore } from '@/lib/room/interactionState';
import { interactiveObjects, interactionIds } from '@/lib/room/interactiveObjects';
import { LoadingScreen } from './LoadingScreen';
import { assetFamilies, assetManifest, initialAssetLoadReport } from '@/lib/room/assets/assetManifest';
import { DebugPanel } from './DebugPanel';
import { InteractionOverlay } from './InteractionOverlay';
const RoomCanvas = dynamic(() => import('./RoomCanvas'), { ssr: false });
export default function RoomApp() {
  const [store] = useState(createInteractionStore);
  const [assets, setAssets] = useState(initialAssetLoadReport);
  const fallbackAssets = assetFamilies.filter(id => assets[id].status === 'fallback');
  const interaction = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [debug, setDebug] = useState(false);
  const [demandDiagnostics, setDemandDiagnostics] = useState(false);
  const [visualizeHitAreas, setVisualizeHitAreas] = useState(false);
  const picker = useRef<HTMLSelectElement>(null);
  const previousActive = useRef<InteractionId | null>(null);
  useEffect(() => {
    if (previousActive.current && !interaction.activeObject) picker.current?.focus({preventScroll:true});
    previousActive.current = interaction.activeObject;
  }, [interaction.activeObject]);
  const [status, setStatus] = useState<RoomLoadStatus>('loading');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<RoomValidation | null>(null);
  const [performance, setPerformance] = useState<RoomPerformance | null>(null);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setDebug(process.env.NODE_ENV === 'development' && query.get('debug') === '1');
    setDemandDiagnostics(query.get('demand') === '1');
    setVisualizeHitAreas(process.env.NODE_ENV === 'development' && query.get('debug') === '1' && query.get('hitareas') === '1');
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => store.setReducedMotion(preference.matches);
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') void store.back(); };
    update(); preference.addEventListener('change', update); window.addEventListener('keydown', keydown);
    return () => { preference.removeEventListener('change', update); window.removeEventListener('keydown', keydown); };
  }, [store]);
  const onError = useCallback((message: string) => { setError(message); setStatus('error'); }, []);
  const onReady = useCallback(() => { setProgress(100); setStatus('ready'); }, []);
  const onSelect = useCallback((id: InteractionId | null) => { if (id) void store.activate(id); }, [store]);
  return <main className="room-app" data-room-status={status} data-interaction-phase={interaction.interactionPhase} data-asset-monitor={assets.monitor.status} data-asset-macbook={assets.macbook.status} data-asset-marshall={assets.marshall.status}>
    <header className="page-header"><div><span className="eyebrow">A ROOM IN PROGRESS</span><h1>Sharky’s Room<span>.</span></h1></div><span className="phase">INTERACTION PROTOTYPE<br /><b>v0.5 / ASSET PILOT</b></span></header>
    <section className="room-stage" aria-label="Sharky's frozen room blockout">
      <div className="canvas-frame"><RoomCanvas assets={assets} onAssets={setAssets} visualizeHitAreas={visualizeHitAreas} debug={debug} demandDiagnostics={demandDiagnostics} status={status} validation={validation} hovered={interaction.hoveredObject} selected={interaction.activeObject} interaction={interaction} store={store} performance={performance} onProgress={setProgress} onValidation={setValidation} onReady={onReady} onError={onError} onHover={store.hover} onSelect={onSelect} onPerformance={setPerformance}/></div>
      {status !== 'ready' && <LoadingScreen progress={progress} error={error} />}
      {status === 'ready' && <InteractionOverlay state={interaction} store={store} />}
    </section>
    <footer className="page-footer"><div><p>{interaction.hoveredObject ? interaction.hoveredObject === 'piano' ? interaction.pianoState === 'retracted' ? 'Pull-out Piano' : 'Put away Piano' : interactiveObjects[interaction.hoveredObject].label : '点击或轻点物件，探索房间'}<br /><span>{interaction.activeObject ? 'Back 或 Esc 返回房间' : '也可通过右侧选择器打开物件'}</span></p>{fallbackAssets.length > 0 && <p role="status" className="asset-fallback">{fallbackAssets.map(id => assetManifest[id].label).join(' / ')} 暂用基础模型 <button disabled={Boolean(interaction.activeObject)} onClick={() => window.location.reload()}>刷新重试</button></p>}</div>
      <label className="object-picker">选择物件<select ref={picker} aria-label="Explore objects" value="" disabled={status !== 'ready' || Boolean(interaction.activeObject)} onChange={event => { const id = event.target.value as InteractionId; if (interactionIds.includes(id)) void store.activate(id); }}><option value="">Explore objects…</option>{interactionIds.map(id => <option key={id} value={id}>{interactiveObjects[id].label}</option>)}</select></label>
    </footer>
    {debug && <DebugPanel assets={assets} ready={status === 'ready'} validation={validation} performance={performance} interaction={interaction} />}
  </main>;
}
