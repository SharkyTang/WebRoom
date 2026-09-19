/** Screen-space gesture classification shared by canvas clicks and camera navigation. */
export function createPointerGestures(threshold = 6) {
  const pointers = new Map<number, { x: number; y: number }>();
  let dragged = false;
  let suppressClick = false;
  return {
    down(id: number, x: number, y: number) {
      if (!pointers.size) { dragged = false; suppressClick = false; }
      pointers.set(id, { x, y });
      if (pointers.size > 1) dragged = suppressClick = true;
    },
    move(id: number, x: number, y: number) {
      const start = pointers.get(id);
      if (start && Math.hypot(x - start.x, y - start.y) >= threshold) dragged = suppressClick = true;
      return !start || dragged;
    },
    up(id: number) { pointers.delete(id); },
    cancel(id?: number) { if (id === undefined) pointers.clear(); else pointers.delete(id); dragged = suppressClick = true; },
    has: (id: number) => pointers.has(id),
    get dragging() { return dragged && pointers.size > 0; },
    get suppressClick() { return suppressClick; },
  };
}

/** Capture listeners run before Three/OrbitControls so one drag cannot also click a mesh. */
export function bindPointerGestures(canvas: HTMLCanvasElement, onDrag: () => void) {
  const gestures = createPointerGestures();
  const down = (event: PointerEvent) => {
    if (event.button !== 0) return;
    gestures.down(event.pointerId, event.clientX, event.clientY);
    canvas.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent) => {
    if (!gestures.move(event.pointerId, event.clientX, event.clientY)) event.stopImmediatePropagation();
    if (gestures.dragging) onDrag();
  };
  const up = (event: PointerEvent) => { gestures.up(event.pointerId); };
  const cancel = (event: PointerEvent) => gestures.cancel(event.pointerId);
  const lost = (event: PointerEvent) => { if (gestures.has(event.pointerId)) cancel(event); };
  const leave = (event: PointerEvent) => { if (!canvas.hasPointerCapture(event.pointerId) && gestures.has(event.pointerId)) cancel(event); };
  const click = (event: MouseEvent) => { if (event.button !== 0 || gestures.suppressClick) { event.preventDefault(); event.stopImmediatePropagation(); } };
  const blur = () => gestures.cancel();
  canvas.addEventListener('pointerdown', down, true);
  canvas.addEventListener('pointermove', move, true);
  canvas.addEventListener('pointerup', up, true);
  canvas.addEventListener('pointercancel', cancel, true);
  canvas.addEventListener('lostpointercapture', lost, true);
  canvas.addEventListener('pointerleave', leave, true);
  canvas.addEventListener('click', click, true);
  window.addEventListener('blur', blur);
  return {
    gestures,
    dispose() {
      canvas.removeEventListener('pointerdown', down, true);
      canvas.removeEventListener('pointermove', move, true);
      canvas.removeEventListener('pointerup', up, true);
      canvas.removeEventListener('pointercancel', cancel, true);
      canvas.removeEventListener('lostpointercapture', lost, true);
      canvas.removeEventListener('pointerleave', leave, true);
      canvas.removeEventListener('click', click, true);
      window.removeEventListener('blur', blur);
      gestures.cancel();
    },
  };
}
