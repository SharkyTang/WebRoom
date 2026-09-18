/** Observe readiness without mutating the room or invalidating its renderer. */
export async function waitForCanvasReady(page, { interactionId = null, quietMs = 0, timeoutMs = 10_000 } = {}) {
  return page.evaluate(async ({ interactionId, quietMs, timeoutMs }) => {
    const start = performance.now();
    let previous = '', stable = 0, samples = 0, mismatched = 0;
    let previousFrames = -1, lastFrameChange = start;
    return new Promise((resolve, reject) => {
      function sample() {
        const canvas = document.querySelector('canvas'), api = window.__ROOM_DEBUG__;
        if (!canvas || !api) return reject(new Error('Canvas/diagnostics disappeared during readiness observation'));
        const now = performance.now(), state = api.snapshot();
        const rect = canvas.getBoundingClientRect(), parent = canvas.parentElement.getBoundingClientRect();
        samples++;
        // Footer changes can resize the parent before R3F updates its Canvas.
        const consistent = Math.abs(rect.width - parent.width) < .1
          && Math.abs(rect.height - parent.height) < .1
          && Math.abs(canvas.width - rect.width * devicePixelRatio) < 1.1
          && Math.abs(canvas.height - rect.height * devicePixelRatio) < 1.1;
        const assetsReady = state.status === 'ready'
          && Object.values(state.assets).every(asset => ['installed', 'fallback'].includes(asset.status));
        const point = consistent && interactionId ? api.projected()[interactionId] : null;
        const hit = point ? api.hitTest(point.x, point.y) : null;
        const key = JSON.stringify({ x: rect.x, y: rect.y, width: rect.width, height: rect.height,
          bufferWidth: canvas.width, bufferHeight: canvas.height, point, semanticId: hit?.semanticId,
          rendererMemory: state.rendererMemory });
        if (state.renderFrames !== previousFrames) lastFrameChange = now;
        previousFrames = state.renderFrames;
        const rayReady = !interactionId || hit?.semanticId === interactionId;
        if (consistent && assetsReady && rayReady && key === previous) stable++;
        else { stable = 0; lastFrameChange = now; }
        if (!consistent) mismatched++;
        previous = key;
        // This optional startup quiet period is bounded. An always-running
        // renderer fails readiness; the independent 500ms assertions still run.
        if (stable >= 3 && now - lastFrameChange >= quietMs) return resolve({
          id: interactionId, samples, mismatched, elapsedMs: now - start,
          quietMs, renderFrames: state.renderFrames, rendererMemory: state.rendererMemory,
          rect: rect.toJSON(), point,
        });
        if (now - start > timeoutMs) return reject(new Error(`Canvas readiness exceeded ${timeoutMs}ms: ${key}`));
        requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    });
  }, { interactionId, quietMs, timeoutMs });
}
