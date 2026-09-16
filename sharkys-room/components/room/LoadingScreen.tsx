export function LoadingScreen({ progress, error }: { progress: number; error: string | null }) {
  return <div className="load-overlay"><div className="load-card" role={error ? 'alert' : 'status'}>
    <span className="eyebrow">SHARKY’S ROOM</span>
    <h2>{error ? 'Room could not load' : 'Loading room...'}</h2>
    {error ? <><p className="error-detail">{error}</p><button onClick={() => window.location.reload()}>重新加载</button></> : <><progress max={100} value={progress} aria-label="GLB loading progress" /><p>{Math.round(progress)}%</p></>}
  </div></div>;
}
