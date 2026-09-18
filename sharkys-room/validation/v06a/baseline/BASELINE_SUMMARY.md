# v0.6A 开工前：当前 v0.5 基线复核

完成时间：2026-09-17T16:54:18.131Z

**开工技术门槛通过。** 当前三件正式资产真实显示、可点击，原钢琴桌下入口与九项交互可用；未发现冻结源、现有交互或构建阻断。可继续已授权的v0.6A。此结论不代表用户视觉批准，也不授权B/C。

版本 0.5.0；资产验证 361 项、单测 100 项、TypeScript和生产构建均通过。浏览器本轮实际 117 通过、0 失败。

| 套件 | 通过 | 失败 | 证据 |
| --- | ---: | ---: | --- |
| production assets development | 18 | 0 | assets/production-assets-browser.json |
| piano development | 10 | 0 | piano/piano-browser.json |
| browser | 34 | 0 | browser/browser_validation.json |
| interactions | 37 | 0 | interactions/interaction_browser.json |
| production core | 7 | 0 | production/production_smoke.json |
| piano production | 3 | 0 | piano/piano-production.json |
| production assets production | 8 | 0 | assets/production-assets-production.json |

## 当前同条件 Hero

Isolated headless Chrome / SwiftShader; existing ?debug=1 continuous sampler; DPR1; frameMs is observed frame interval, not isolated GPU render duration.

| Viewport / DPR | Canvas | Calls | 渲染三角面 | 帧间隔 ms | 截图 |
| --- | --- | ---: | ---: | ---: | --- |
| 1440×900 / 1 | 1080×720 | 84 | 28902 | 26.7079 | hero-1440.png |
| 390×844 / 1 | 360×240 | 84 | 28902 | 16.6683 | hero-390.png |
| 768×1024 / 1 | 688×458 | 84 | 28902 | 18.9509 | hero-768.png |

## 资源与活动性能

四个初始必需模型合计 1,531,180 B：FINAL 411,892 B，三个生产GLB 1,119,288 B。嵌入PNG 430,084 B已包含在GLB中，不重复相加。其余几何/材质/JSON/容器合计 1,101,096 B。本统计不包含应用JS/HTML。

本次本地HTTP四模型请求的encodedBodySize合计 699,006 B，decodedBodySize合计 1,531,180 B；浏览器报告含头部transferSize合计 700,206 B。这是当前服务实际传输观察，不能将压缩后字节当作模型源文件或显存大小。

| 生产家族 | 三角面 | primitives | 材质 | GLB B | 嵌入PNG B |
| --- | ---: | ---: | ---: | ---: | ---: |
| monitor | 3348 | 4 | 4 | 95904 | 0 |
| macbook | 14780 | 9 | 6 | 445776 | 0 |
| marshall | 4464 | 5 | 5 | 577608 | 430084 |

运行时独立纹理 3 张（含两个Canvas屏幕），RGBA+Mipmaps估计 5,068,119 B；这是尺寸推算，不是实测显存。完整色彩空间/尺寸见baseline-summary.json。

| Viewport | 首次ready ms | 三件installed ms |
| --- | ---: | ---: |
| 1440×900 | 1536.00 | 1530.70 |
| 390×844 | 424.50 | 419.60 |

真实鼠标/触屏操作中的Monitor、MacBook、Marshall、Piano进入与Back阶段均记录帧间隔分布；各聚焦视角实测calls见activity-performance.json。正常demand停止绘帧与纹理不逐帧更新由实际专项另行通过。

保护输入 16 个文件在本次基线前后SHA256一致；详见source-ledger.json和baseline-summary.json。包括FINAL .blend/两GLB、冻结清单、三件生产.blend/GLB、三件规格、package/lock和现有manifest。本阶段未改主应用或现有测试，未执行Git写操作。

## 钢琴与证据边界

开发和生产均通过桌面/390触屏“收回→Back→桌下入口→再次抽出”，该路径未依赖Explore objects。原有4轮循环、入口启停、误触负向、reduced-motion等断言保持；A批最终验收需另补至少20轮，不把旧4轮写成20轮。

- Chrome headless / ANGLE SwiftShader, DPR1; 390px is touch emulation, not a real phone. Safari and real GPU were not tested.
- Existing diagnostic frameMs and active sampler intervals are observed frame intervals including instrumentation, not isolated GPU/CPU render duration.
- Local warm development server startup timing is not an internet cold-start benchmark.
- Existing v0.5 piano suite includes four Hero rediscovery cycles; v0.6A final acceptance separately requires at least 20.
- No v0.6A model or application change is included in this baseline. B/C are not authorized by these test results.
