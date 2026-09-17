import { CanvasTexture, SRGBColorSpace } from 'three';

export type ScreenId = 'monitor' | 'macbook';
export type ScreenTexture = { texture: CanvasTexture; setActive: (active: boolean) => void; dispose: () => void };

/** Static canvas is painted only when the content state changes, never on a frame loop. */
export function createScreenTexture(id: ScreenId): ScreenTexture {
  const canvas = document.createElement('canvas');
  canvas.width = id === 'monitor' ? 1024 : 512;
  canvas.height = id === 'monitor' ? 512 : 320;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D screen creation failed');
  const texture = new CanvasTexture(canvas);
  texture.name = `Runtime_${id}_CanvasScreen`;
  texture.colorSpace = SRGBColorSpace;
  texture.flipY = false; // Matches exported glTF UVs; no second axis conversion.
  texture.anisotropy = 4;
  texture.userData.contentUpdates = 0;
  let previous: boolean | null = null;
  function setActive(active: boolean) {
    if (active === previous) return;
    previous = active;
    const ctx = context!;
    const w = canvas.width, h = canvas.height, s = w / 1024;
    ctx.fillStyle = '#101d29'; ctx.fillRect(0, 0, w, h);
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#203648'); gradient.addColorStop(1, '#101923');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#d9aa7e'; ctx.fillRect(58 * s, 52 * s, 36 * s, 5 * s);
    ctx.fillStyle = '#b7c6d0'; ctx.font = `${18 * s}px Arial`; ctx.fillText('SHARKY’S ROOM', 112 * s, 63 * s);
    ctx.fillStyle = '#f6eee4'; ctx.font = `500 ${id === 'monitor' ? 66 : 28}px Arial`;
    ctx.fillText(id === 'monitor' ? 'Projects' : 'About / Education', 58 * s, h * .40);
    ctx.fillStyle = '#bccbd4'; ctx.font = `${24 * s}px Arial`;
    ctx.fillText('A space for ideas, coming soon.', 60 * s, h * .51);
    const top = h * .64, gap = 18 * s, cardWidth = (w - 116 * s - gap * 2) / 3;
    for (let i = 0; i < 3; i++) {
      const x = 58 * s + i * (cardWidth + gap);
      ctx.fillStyle = ['#2e4b59', '#46575e', '#675950'][i];
      ctx.beginPath(); ctx.roundRect(x, top, cardWidth, h * .19, 10 * s); ctx.fill();
      ctx.fillStyle = '#e5dfd6'; ctx.font = `${18 * s}px Arial`;
      ctx.fillText(id === 'monitor' ? `0${i + 1}  /  Preview` : ['About', 'Learning', 'Next'][i], x + 18 * s, top + h * .12);
    }
    ctx.fillStyle = active ? '#efb77e' : '#6f8796'; ctx.font = `${15 * s}px Arial`;
    ctx.fillText(active ? 'SELECTED  /  CONTENT PREVIEW' : 'SELECT TO EXPLORE', 60 * s, h * .93);
    texture.userData.contentUpdates++;
    texture.needsUpdate = true;
  }
  setActive(false);
  return { texture, setActive, dispose: () => texture.dispose() };
}
