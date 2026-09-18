# v0.6C architecture evidence

Mode: isolated-test-camera
Generated: 2026-09-18T11:24:54.112Z
Result: 13 passed; 0 failed.

Installed Chrome headless ANGLE SwiftShader, DPR1; normal sessions 1440 desktop / 390 touch emulation (+768 for all); inspection desktop only. No physical mobile/GPU/Safari evidence.
Technical evidence only; user visual confirmation remains pending.
Camera temporarily changed only in isolated source copy; no new product focus/target. Must accompany normal production evidence.

| Check | Result |
| --- | --- |
| Inspection API exists only in the explicitly isolated preview | PASS |
| Isolated webpage closeup cabinet-overall | PASS |
| Isolated webpage closeup desk-context | PASS |
| Isolated webpage closeup eiffel-VIS_Eiffel-hero-side | PASS |
| Isolated webpage closeup eiffel-VIS_Eiffel-side | PASS |
| Isolated webpage closeup eiffel-VIS_Eiffel-top | PASS |
| Isolated webpage closeup hogwarts-VIS_Hogwarts-hero-side | PASS |
| Isolated webpage closeup minastirith-VIS_MinasTirith-hero-side | PASS |
| Isolated webpage closeup minastirith-VIS_MinasTirith-side | PASS |
| Isolated webpage closeup minastirith-VIS_MinasTirith-top | PASS |
| Inspection restores the exact original Hero and leaves protected state unchanged | PASS |
| Exports stay unchanged while browser evidence is collected | PASS |
| Normal C sessions have no runtime/resource errors; injected failures remain isolated | PASS |
