# v0.6A Furniture Browser Evidence

Mode: development
Generated: 2026-09-17T17:18:12.096Z
Result: 29 passed; 1 failed.

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
| 768px native macbook focus retains a real visible target and clear Back | PASS |
| 768px native marshall focus retains a real visible target and clear Back | PASS |
| 768px demand rendering rests after furniture, camera and mechanism activity | PASS |
| 390×844 shows all A16 plus original three families with exact frozen targets | PASS |
| 390px visible desk, chair and floor stop rays without becoming semantic controls | PASS |
| 390px native window focus retains a real visible target and clear Back | PASS |
| 390px native monitor focus retains a real visible target and clear Back | PASS |
| 390px native macbook focus retains a real visible target and clear Back | PASS |
| 390px native marshall focus retains a real visible target and clear Back | PASS |
| 390px desk piano rediscovery works without the selector and retains neighbouring occlusion | PASS |
| 390px demand rendering rests after furniture, camera and mechanism activity | PASS |
| Default development rendering exposes neither diagnostics nor hit-area UI | PASS |
| floor: isolated GLB404 keeps the full proxy family and all other eighteen formal families | FAIL |

## floor: isolated GLB404 keeps the full proxy family and all other eighteen formal families

```
page.waitForFunction: Timeout 20000ms exceeded.
    at stateIs (/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/tests/furniture-browser.mjs:48:50)
    at activate (/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/tests/furniture-browser.mjs:61:145)
    at async file:///Users/shaoqitang/Documents/ChatGPT/%E7%BD%91%E9%A1%B5%E5%B0%8F%E5%B1%8B/sharkys-room/tests/furniture-browser.mjs:125:431
    at async check (/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/tests/furniture-browser.mjs:46:53)
    at async file:///Users/shaoqitang/Documents/ChatGPT/%E7%BD%91%E9%A1%B5%E5%B0%8F%E5%B1%8B/sharkys-room/tests/furniture-browser.mjs:125:7
```
