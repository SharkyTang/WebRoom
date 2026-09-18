# v0.5 Production Asset Browser Validation

Generated: 2026-09-17T17:39:37.182Z
Mode: production
Result: 0 passed; 1 failed.

Every state change uses native mouse/touch/keyboard or navigation; the debug API only observes. Expected fallback tests are separate from successful production-asset acceptance.

| Check | Result |
| --- | --- |
| Production asset suite setup | FAIL |

Touch emulation, not a physical phone. Safari and real GPU not tested.

## Production asset suite setup

```
AssertionError [ERR_ASSERTION]: Production coordinates must come from a passing development run

1 !== 0

    at file:///Users/shaoqitang/Documents/ChatGPT/%E7%BD%91%E9%A1%B5%E5%B0%8F%E5%B1%8B/sharkys-room/tests/production-assets-browser.mjs:186:12
```
