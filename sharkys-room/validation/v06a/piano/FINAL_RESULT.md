# Final piano acceptance

**10 passed, 0 failed; 20 complete Hero rediscovery cycles; exit code 0.**

```sh
ROOM_PIANO_CYCLES=20 ROOM_TEST_OUTPUT=validation/v06a/piano node tests/piano-discoverability-browser.mjs
```

Started 2026-09-17T18:03:26.562Z; completed 2026-09-17T18:07:17.918Z. The run lasted 231.356 seconds. `final-run.json` includes the exact command, working directory, timestamps, exit code and SHA-256 hashes of the tested script/runtime assembly. `final-run.log` and `piano-browser.json` hold the full results.

The normal and debug-hidden pages both retained the application's real **antialias=true, samples=4, depthBits=24** settings. Their complete 1080×720 canvas images are identical as both PNG bytes and decoded RGBA: **0 changed pixels, maximum channel delta 0**. No threshold, ROI exclusion, selected successful retry or disabled-AA control was used in the final pass. The two PNGs and difference image are saved alongside this report.

The primary path uses native canvas clicks, Toggle piano and Back. It verifies the original 0.65 m absolute travel and Hero camera over 20 cycles, competing input, focused/retracted hover, desk/chair/floor negatives, every other semantic target, fallback selection as a separate feature check, demand rendering, debug wireframe, 390×844 touch rediscovery and reduced motion. The normal page has no diagnostics API/UI and reopens through the actual recorded undertray pixel. No browser runtime or asset errors occurred.

Before this full run, three independent cold-loading pairs passed all four phases (initial, native retraction, delayed capture and all semantic hovers) with exact PNG/RGBA equality under the same normal AA settings. See `../piano-stable-short-runs.json` and the three `piano-compare-repro-stable-*` folders.

Prior failures were preserved in `../piano-second-pass-failure/`, `../piano-controlled-sampling-failure/` and `../piano-before-stable-final/`. The earlier AA-disabled experiment was insufficient: a later cold pair still differed at one contact pixel. The accepted fix is deterministic ordering of registered opaque VIS meshes, leaving frozen geometry, anchors, original source ordering, transparent sorting and the original piano entry intact. The diagnostic history remains in `../piano-compare-repro/DIAGNOSIS.md`.
