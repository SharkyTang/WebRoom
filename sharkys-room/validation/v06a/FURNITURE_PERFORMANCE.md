# v0.6A Furniture Browser Evidence

Mode: performance
Generated: 2026-09-17T18:13:55.708Z
Result: 7 passed; 0 failed.

All application state changes use native browser input or navigation. Diagnostics only observe. Fault fallbacks are never counted as successful formal asset installation.

Installed Chrome headless, ANGLE SwiftShader, DPR1; 390px is touch emulation. Real GPU, physical mobile and Safari not tested.
Frame intervals include diagnostics and are not isolated CPU/GPU time. Per-family texture dimensions estimate memory, with no unproven cross-family sharing. Local warm-server timings are not internet cold starts.

| Check | Result |
| --- | --- |
| Isolated 1440px Hero, loading, network and texture resources compare with actual v0.5 baseline | PASS |
| Isolated 768px Hero, loading, network and texture resources compare with actual v0.5 baseline | PASS |
| Isolated 390px Hero, loading, network and texture resources compare with actual v0.5 baseline | PASS |
| Timed floor 404 fallback is atomic and native refresh restores every family | PASS |
| Timed bed corrupt-image fallback is atomic and native refresh restores every family | PASS |
| All nineteen exported GLBs remain unchanged throughout this evidence run | PASS |
| Normal A-batch sessions have no runtime errors; injected fault diagnostics stay isolated | PASS |

