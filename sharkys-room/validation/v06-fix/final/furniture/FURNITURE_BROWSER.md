# v0.6A Furniture Browser Evidence

Mode: development
Generated: 2026-09-19T04:54:02.907Z
Result: 17 passed; 1 failed.

All application state changes use native browser input or navigation. Diagnostics only observe. Fault fallbacks are never counted as successful formal asset installation.

Installed Chrome headless, ANGLE SwiftShader, DPR1; 390px is touch emulation. Real GPU, physical mobile and Safari not tested.
Frame intervals include diagnostics and are not isolated CPU/GPU time. Per-family texture dimensions estimate memory, with no unproven cross-family sharing. Local warm-server timings are not internet cold starts.

| Check | Result |
| --- | --- |
| 1440×900 shows all A16 plus original three families with exact frozen targets | PASS |
| 1440px visible desk, chair and floor stop rays without becoming semantic controls | PASS |
| 1440px native monitor focus retains a real visible target and clear Back | PASS |
| 1440px native macbook focus retains a real visible target and clear Back | PASS |
| 1440px native ipad focus retains a real visible target and clear Back | PASS |
| 1440px native marshall focus retains a real visible target and clear Back | PASS |
| 1440px native piano focus retains a real visible target and clear Back | PASS |
| 1440px native trashcan focus retains a real visible target and clear Back | PASS |
| 1440px native lightswitch focus retains a real visible target and clear Back | PASS |
| 1440px native phone focus retains a real visible target and clear Back | PASS |
| 1440px native window focus retains a real visible target and clear Back | PASS |
| 1440px desk piano rediscovery works without the selector and retains neighbouring occlusion | PASS |
| 1440px demand rendering rests after furniture, camera and mechanism activity | PASS |
| 768×1024 shows all A16 plus original three families with exact frozen targets | PASS |
| 768px visible desk, chair and floor stop rays without becoming semantic controls | PASS |
| 768px native window focus retains a real visible target and clear Back | PASS |
| 768px native monitor focus retains a real visible target and clear Back | PASS |
| 768px native macbook focus retains a real visible target and clear Back | FAIL |

## 768px native macbook focus retains a real visible target and clear Back

```
page.evaluate: Error: Canvas readiness exceeded 10000ms: {"x":40,"y":290.671875,"width":688,"height":458.65625,"bufferWidth":688,"bufferHeight":458,"point":{"x":434,"y":483},"semanticId":"macbook","rendererMemory":{"geometries":252,"textures":23}}
    at sample (eval at evaluate (:311:30), <anonymous>:38:52)
    at waitForCanvasReady (/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/tests/helpers/browserReady.mjs:3:15)
    at stableCanvas (/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/tests/furniture-browser.mjs:57:58)
    at pointFor (/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/tests/furniture-browser.mjs:59:9)
    at /Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/tests/furniture-browser.mjs:148:198
    at async check (/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/tests/furniture-browser.mjs:53:53)
    at async file:///Users/shaoqitang/Documents/ChatGPT/%E7%BD%91%E9%A1%B5%E5%B0%8F%E5%B1%8B/sharkys-room/tests/furniture-browser.mjs:148:33
```
