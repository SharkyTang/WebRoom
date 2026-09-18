# v0.6A furniture browser run notes

Final development suite: **50 passed, 0 failed** (`furniture-browser.json`). Final production suite: **24 passed, 0 failed** (`furniture-production.json`). Both runs record and compare all nineteen GLB SHA-256 hashes at their start and end. No exported asset changed within either accepted run.

The development run uses real mouse input at 1440×900 and 768×1024, and real browser touch input under 390×844 mobile emulation. Read-only diagnostics locate visible geometry, inspect state, and check original 85-node source mappings and the complete installed assembly. No application store setter or synthetic semantic activation is used. Production uses recorded visible development pixels and the installed data attributes; it exposes no diagnostic API even with the debug query present.

The sixteen separate 404 tests each retain that family's proxy and the other eighteen complete production families, then use a native refresh button to restore all nineteen. Corrupted embedded images in the floor and bed independently reject the entire affected family. Expected fallbacks are tested recovery behavior, never proof that a formal asset installed successfully.

Delayed desk loading was abandoned by actual page navigation. Three subsequent fresh assemblies were identical: 241 runtime nodes, 152 renderer geometries, and 21 renderer textures. These counters are resource observations, not a measured GPU-memory leak proof.

The initial attempt is preserved under `first-pass/`: 29 normal checks passed before the floor-fallback interaction timed out. Its sampled point was taken while the Canvas still had its previous size. The fallback footer reduced the parent container from 1080×720 to approximately 1020.609×680.406; by the actual pointerdown, the Canvas had resized and the saved pixel hit Window. Six instrumented reproductions in `first-pass/fallback-diagnostic.json` record the old sampled rectangle, new pointer-event rectangle, and corresponding real ray results. The application routed the actual click correctly.

The test now waits until the Canvas rectangle, parent rectangle, drawing buffer and projected ray result agree across consecutive animation frames, then obtains a fresh pixel. It does not use a fixed long sleep or replace the physical click with a selector. The complete final run, including all sixteen fallback/retry sequences, passes with this correction. The normal screenshots were also retaken after the final local bed/cabinet/curtain/beanbag visual corrections and again after the final stable opaque VIS render-order fix; first-pass imagery is retained as history and is not current acceptance evidence.

`interaction_regression.mp4` is an actual Chrome recording converted to H.264: 1440×900, 25 fps, 59.52 seconds, 7,947,408 bytes. It includes native focus actions and the full Piano retract → Back → desk-entry reopen sequence. It is not a rendered concept video.

Environment: installed Chrome in headless mode with ANGLE SwiftShader and DPR 1. Mobile is touch emulation, not a physical phone. No real-GPU, physical-mobile or Safari claim is made. Independent performance measurement runs separately from these functional sessions and completed with 7/7 checks and is reported in `furniture-performance.json` and `PERFORMANCE_COMPARISON.md`.

Accepted functional suites were rerun after the final opaque production VIS render-order fix. Earlier accepted screenshots, videos, and furniture/asset JSON are preserved under `before-render-order/`; they are history, not the current image set.
