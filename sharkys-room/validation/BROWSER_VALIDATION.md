# v0.3 Browser Validation

- Generated: 2026-09-16T17:09:26.173Z
- URL: http://localhost:3000
- Browser: Installed Google Chrome, Playwright headless, ANGLE SwiftShader (software WebGL)
- Result: 34 passed; 0 failed
- Performance readings are local software-renderer observations, not a hardware performance benchmark.
- Pointer/touch tests use real browser input. Frozen assets are never edited.

## Observations

- Performance sample: 52.14 FPS; 19.18 ms; 72 renderer calls; 6,566 rendered triangles.
- The controlled GLB-404 scenario intentionally generates one browser resource error; it is not a normal-mode failure.
- Non-blocking dependency/browser warnings are retained in the JSON log: THREE.Clock deprecation on Canvas mount, and software-renderer ReadPixels warnings during screenshots.
- Mobile checks use accurate synthetic finger coordinates; this verifies touch event wiring, not final finger-sized target usability.
- Visual review: the complete frozen room fits desktop and mobile. The fixed 3:2 composition creates vertical whitespace on phones. The browser has flatter illumination and brighter localized reflections than Blender, with no Blender ambient occlusion or soft contact shadows.

| Check | Result |
| --- | --- |
| GLB loads and browser renders the frozen room | PASS |
| Development diagnostics report frame timing and renderer counters | PASS |
| Frozen scene exposes every required node, target, and unchanged scene counts | PASS |
| Real mouse hover and click identify monitor | PASS |
| Real mouse hover and click identify macbook | PASS |
| Real mouse hover and click identify ipad | PASS |
| Real mouse hover and click identify marshall | PASS |
| Real mouse hover and click identify piano | PASS |
| Real mouse hover and click identify trashcan | PASS |
| Real mouse hover and click identify lightswitch | PASS |
| Real mouse hover and click identify phone | PASS |
| Real mouse hover and click identify window | PASS |
| Non-interactive geometry does not report a semantic hit | PASS |
| Resize 1920×1080: canvas visible and no horizontal overflow | PASS |
| Resize 1440×900: canvas visible and no horizontal overflow | PASS |
| Resize 1280×720: canvas visible and no horizontal overflow | PASS |
| Resize 768×1024: canvas visible and no horizontal overflow | PASS |
| Resize 390×844: canvas visible and no horizontal overflow | PASS |
| Normal user mode displays the room without developer diagnostics | PASS |
| 390px touch device loads and fits without overflow | PASS |
| 390px real touch tap identifies monitor | PASS |
| 390px real touch tap identifies macbook | PASS |
| 390px real touch tap identifies ipad | PASS |
| 390px real touch tap identifies marshall | PASS |
| 390px real touch tap identifies piano | PASS |
| 390px real touch tap identifies trashcan | PASS |
| 390px real touch tap identifies lightswitch | PASS |
| 390px real touch tap identifies phone | PASS |
| 390px real touch tap identifies window | PASS |
| Capture 390px normal-mode mobile screenshot | PASS |
| Loading screen remains visible and page responsive during delayed GLB download | PASS |
| GLB 404 produces a readable error instead of silently continuing | PASS |
| Missing required interactive node produces an explicit error | PASS |
| Normal desktop/mobile runtime has no critical console errors or missing assets | PASS |

Detailed snapshots, frame/renderer readings, console output, and failure evidence: `browser_validation.json`.

## Production smoke

Latest production build at `http://localhost:3001`: **5 passed; 0 failed**.

- Desktop 1440 × 900 and mobile 390 × 844 loaded the actual GLB with HTTP 200, rendered the ready state, and had no horizontal overflow.
- `?debug=1` did not expose the development API or panel in production.
- Actual drag, mouse wheel, and WASD input left the rendered canvas PNG byte-for-byte identical (188,488 bytes), confirming fixed camera behavior.
- No console errors, page errors, or failed asset requests occurred. The same non-blocking dependency and screenshot warnings were recorded.
- Evidence: `production_smoke.json`, `web_production_1440.png`, `web_production_390.png`.

Combined browser result: **39 passed; 0 failed**.
