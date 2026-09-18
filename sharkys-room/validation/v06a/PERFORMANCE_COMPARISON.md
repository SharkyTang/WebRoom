# v0.6A isolated performance comparison

Recorded 2026-09-17T18:13:55.708Z. Installed Chrome headless, ANGLE SwiftShader, DPR 1. Same fixed Hero and read-only continuous sampler as the fresh v0.5 baseline. The other coordinated Chrome and Blender jobs had finished before this run.

## Hero and loading

| Viewport | Calls v0.5 → A | Triangles v0.5 → A | Frame interval ms v0.5 → A | First ready ms | All 19 installed ms |
| --- | --- | --- | --- | --- | --- |
| 1440×900 | 84 → 121 | 28902 → 80666 | 26.71 → 50.7 | 2177.1 | 1528.9 |
| 768×1024 | 84 → 121 | 28902 → 80666 | 18.95 → 40.53 | 435.8 | 430.9 |
| 390×844 | 84 → 121 | 28902 → 80666 | 16.67 → 35.69 | 442 | 437.3 |

Frame interval is the existing sampler interval, not an isolated GPU/CPU duration. Startup is local warm-server navigation in a fresh browser context, not internet cold-start time. Baseline readiness was separately measured only for desktop and mobile; no earlier 768px readiness number is invented.

## Model network resources

| Viewport | Requests | Encoded body bytes | Transfer bytes including headers | Decoded body bytes |
| --- | --- | --- | --- | --- |
| 1440 | 20 | 1741116 | 1747116 | 3906872 |
| 768 | 20 | 1741116 | 1747116 | 3906872 |
| 390 | 20 | 1741116 | 1747116 | 3906872 |

Baseline model network: 699006 encoded bytes; 700206 transfer bytes; 1531180 decoded bytes across four model requests. Current file ledger: 3906872 bytes across twenty GLBs. These totals cover model requests, not the page's JavaScript/CSS. Embedded images are already part of those GLBs and are not added twice.

Raw GLB split: 873680 embedded-image bytes plus 3033192 bytes of geometry/JSON/material/hierarchy/container data. 18 image embeddings contain 11 distinct byte-identical contents totaling 529203 unique source-image bytes. Repeated embeddings still consume delivered bytes and may own separate runtime textures; this source-content deduplication is not network or GPU sharing. HTTP compression is measured for the complete GLB responses above, so no invented compressed geometry-versus-texture split is reported.

## Texture and renderer counters

| Viewport | Business texture UUIDs | Estimated mipmapped RGBA bytes | Renderer geometries | Renderer textures |
| --- | --- | --- | --- | --- |
| 1440 | 20 | 28835853 | 152 | 21 |
| 768 | 20 | 28835853 | 152 | 21 |
| 390 | 20 | 28835853 | 152 | 21 |

Business UUIDs deduplicate the texture objects observed under registered production assets. Equal filenames across GLBs do not establish sharing. rendererMemory is Three.js live allocation counting, which can include resources outside those asset groups; it is a separate measure. Mipmapped RGBA bytes are a dimensional estimate, not measured GPU memory. No physical GPU, phone or Safari test is claimed.

## Focus render counters

| Viewport | Focus | Calls v0.5 → A | Triangles v0.5 → A | Interval ms v0.5 → A |
| --- | --- | --- | --- | --- |
| 1440 | monitor | 25 → 31 | 8400 → 27614 | 34.59 → 33.05 |
| 1440 | macbook | 23 → 36 | 15548 → 35366 | 36.55 → 33.3 |
| 1440 | marshall | 21 → 28 | 8416 → 24930 | 33.66 → 29.04 |
| 1440 | piano | 32 → 51 | 20188 → 46924 | 33.67 → 40.56 |
| 390 | monitor | 25 → 31 | 8400 → 27614 | 16.66 → 16.68 |
| 390 | macbook | 23 → 36 | 15548 → 35366 | 16.67 → 16.67 |
| 390 | marshall | 21 → 28 | 8416 → 24930 | 16.66 → 16.67 |
| 390 | piano | 32 → 51 | 20188 → 46924 | 16.66 → 18.69 |

Every recorded focus camera was compared component-by-component with the same-viewport baseline and matched exactly.

## Native action intervals

| Viewport | Action | Mean ms v0.5 → A | p95 ms v0.5 → A |
| --- | --- | --- | --- |
| 1440 | monitor: Hero to focus and mechanism | 28.51 → 40.06 | 34.9 → 52.1 |
| 1440 | monitor: Back including mechanism exit | 32.97 → 36.64 | 42.6 → 51.9 |
| 1440 | macbook: Hero to focus and mechanism | 33.84 → 38.1 | 39.4 → 53.3 |
| 1440 | macbook: Back including mechanism exit | 35.8 → 38.57 | 40.4 → 54.7 |
| 1440 | marshall: Hero to focus and mechanism | 30.48 → 42.19 | 34.1 → 53.8 |
| 1440 | marshall: Back including mechanism exit | 33.67 → 38.34 | 37.2 → 53.6 |
| 1440 | piano: Hero to focus and mechanism | 32.83 → 44.91 | 37.1 → 56 |
| 1440 | piano: Back including mechanism exit | 35.4 → 49.8 | 38.5 → 58.1 |
| 390 | monitor: Hero to focus and mechanism | 16.66 → 24.04 | 17.6 → 36.9 |
| 390 | monitor: Back including mechanism exit | 16.45 → 20.59 | 17.4 → 35.7 |
| 390 | macbook: Hero to focus and mechanism | 16.48 → 19.89 | 17.1 → 35.5 |
| 390 | macbook: Back including mechanism exit | 16.66 → 20.12 | 16.8 → 36.1 |
| 390 | marshall: Hero to focus and mechanism | 16.56 → 23.87 | 16.7 → 35.9 |
| 390 | marshall: Back including mechanism exit | 16.67 → 22.08 | 16.8 → 35.9 |
| 390 | piano: Hero to focus and mechanism | 16.52 → 22.51 | 16.7 → 35.9 |
| 390 | piano: Back including mechanism exit | 16.67 → 27.14 | 16.8 → 36.9 |

Actions use native mouse/touch and Back; a read-only per-animation-frame observer uses the same filtering method as the baseline. Its overhead is included, so these are observed interaction intervals rather than isolated render costs.

## Representative failure and recovery times

| Family / fault | First fallback ms | Room ready ms | Retry all 19 installed ms | Retry room ready ms | Atomic fallback / recovered |
| --- | --- | --- | --- | --- | --- |
| floor / 404 | 435.9 | 440.9 | 409.4 | 413.1 | 0 family VIS, 18 others / 19 restored |
| bed / corrupt-image | 459.9 | 465.4 | 413.3 | 884.6 | 0 family VIS, 18 others / 19 restored |

Failure and refresh timings use performance.now within their separately recorded navigation time origins. They observe the DOM asset reports, not the moment the HTTP/decode error was first detected internally. Recovery uses the actual refresh button; injected fallback is not formal asset installation. Local warm service, not internet latency.
