'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import type { InteractionId, RoomLoadStatus, RoomPerformance, RoomValidation } from '@/types/room';
import { LoadingScreen } from './LoadingScreen';
import { DebugPanel } from './DebugPanel';
const RoomCanvas = dynamic(() => import('./RoomCanvas'), { ssr: false });
export default function RoomApp() {
  const [debug, setDebug] = useState(false);
  const [status, setStatus] = useState<RoomLoadStatus>('loading');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<RoomValidation | null>(null);
  const [hovered, setHovered] = useState<InteractionId | null>(null);
  const [selected, setSelected] = useState<InteractionId | null>(null);
  const [performance, setPerformance] = useState<RoomPerformance | null>(null);
  useEffect(() => { setDebug(process.env.NODE_ENV === 'development' && new URLSearchParams(window.location.search).get('debug') === '1'); }, []);
  const onError = useCallback((message: string) => { setError(message); setStatus('error'); }, []);
  const onReady = useCallback(() => { setProgress(100); setStatus('ready'); }, []);
  return <main className="room-app" data-room-status={status}>
    <header className="page-header"><div><span className="eyebrow">A ROOM IN PROGRESS</span><h1>Sharky’s Room<span>.</span></h1></div><span className="phase">WEB FOUNDATION<br /><b>v0.3 / GREYBOX</b></span></header>
    <section className="room-stage" aria-label="Sharky's frozen room blockout">
      <div className="canvas-frame">
        <RoomCanvas debug={debug} status={status} validation={validation} hovered={hovered} selected={selected} performance={performance} onProgress={setProgress} onValidation={setValidation} onReady={onReady} onError={onError} onHover={setHovered} onSelect={setSelected} onPerformance={setPerformance} />
      </div>
      {status !== 'ready' && <LoadingScreen progress={progress} error={error} />}
    </section>
    <footer className="page-footer"><p>悬停或轻点房间里的小物件<br /><span>本阶段仅显示识别结果</span></p><div className="interaction-readout" aria-live="polite"><span>Hovered: <b>{hovered ?? '—'}</b></span><span>Selected: <b>{selected ?? '—'}</b></span></div></footer>
    {debug && <DebugPanel validation={validation} performance={performance} />}
  </main>;
}
