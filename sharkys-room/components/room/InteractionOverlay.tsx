import { useEffect, useRef } from 'react';
import { interactiveObjects } from '@/lib/room/interactiveObjects';
import { formatTime, weatherOptions, type InteractionState, type InteractionStore } from '@/lib/room/interactionState';

const headings = { monitor: 'Projects', macbook: 'About / Education', ipad: 'Memories', marshall: 'Music', piano: 'Piano', trashcan: 'Deleted ideas', lightswitch: 'Room lights', phone: 'Contact', window: 'Environment' };
export function InteractionOverlay({ state, store }: { state: InteractionState; store: InteractionStore }) {
  const back = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (state.activeObject) back.current?.focus({ preventScroll: true }); }, [state.activeObject]);
  if (!state.activeObject) return null;
  const id = state.activeObject;
  const ready = state.interactionPhase === 'focused' && !state.isCameraBusy;
  return <aside className="interaction-overlay" aria-label={`${interactiveObjects[id].label} interaction`} data-interaction={id}>
    <div className="overlay-heading"><h2>{headings[id]}</h2><button ref={back} onClick={() => void store.back()} aria-label="Back" disabled={state.interactionPhase === 'returning'}>← Back</button></div>
    <p className="prototype-caption">Interaction prototype</p>
    <div className="interaction-content" aria-busy={!ready}>
      {id === 'monitor' && <p>Projects<br /><span>作品内容将在后续阶段加入。</span></p>}
      {id === 'macbook' && <p>About / Education<br /><span>屏幕状态：{state.macbookState}</span></p>}
      {id === 'ipad' && <p>Memories<br /><span>回忆内容占位</span></p>}
      {id === 'marshall' && <><button disabled={!ready} onClick={() => void store.toggle('marshall')} aria-label={`Power: ${state.marshallPower === 'on' ? 'On' : 'Off'}`}>Power: {state.marshallPower === 'on' ? 'On' : 'Off'}</button><p className="small-note">本轮仅切换电源状态，无音频播放。</p></>}
      {id === 'piano' && <><p>Piano: {state.pianoState}</p><button aria-label="Toggle piano" disabled={!ready} onClick={() => void store.toggle('piano')}>{state.pianoState === 'extended' ? 'Retract piano' : 'Extend piano'}</button></>}
      {id === 'trashcan' && <p>Deleted ideas live here.</p>}
      {id === 'lightswitch' && <><button disabled={!ready} onClick={() => void store.toggle('lightswitch')} aria-label={`Lights: ${state.lightsState === 'on' ? 'On' : 'Off'}`}>Lights: {state.lightsState === 'on' ? 'On' : 'Off'}</button><p className="small-note">Cabinet · Desk · Bed</p></>}
      {id === 'phone' && <ul className="contact-placeholders"><li>GitHub</li><li>LinkedIn</li><li>Email</li></ul>}
      {id === 'window' && <><label className="time-control">Time <output>{formatTime(state.time)}</output><input aria-label="Time" type="range" min="0" max="24" step="0.25" value={state.time} disabled={!ready} onChange={event => store.setTime(Number(event.target.value))}/></label><fieldset disabled={!ready}><legend>Weather</legend><div className="weather-options">{weatherOptions.map(weather => <button key={weather} aria-pressed={state.weather === weather} onClick={() => store.setWeather(weather)}>{weather}</button>)}</div></fieldset><p className="small-note">{formatTime(state.time)} · {state.weather}<br />仅更新状态，天气画面留待后续。</p></>}
    </div>
    {!ready && <p role="status" className="transition-status">{state.returnRequested ? 'Returning after this movement…' : state.interactionPhase === 'returning' ? 'Returning to Hero…' : 'Moving into place…'}</p>}
    {state.error && <p role="alert">{state.error}</p>}
  </aside>;
}
