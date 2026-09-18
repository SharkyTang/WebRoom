# v0.6 资产状态

**SHARKY'S ROOM — v0.6A TECHNICAL COMPLETE**  
**VISUAL REVIEW PENDING USER CONFIRMATION**  
**v0.6B / v0.6C NOT STARTED**

当前 A 批所有下列资产均技术通过，待用户视觉复核。v0.5 三件资产为暂定风格基线，未找到独立审美批准记录；B/C 没有本次执行授权。最终验证索引为 `validation/v06a/verification-summary.json`：361 项资产契约、133 单测、类型检查/构建与 198 项浏览器检查通过（含 7 项性能/故障采样，不代表性能无回退）；另有 12 次严格冷加载像素对照通过。

| 批次/资产 | 当前状态 |
| --- | --- |
| v0.5 Monitor / MacBook / Marshall | 原 .blend/GLB/规格逐字节保留，开工与本批真实网页复测 |
| A 地板/墙体/踢脚线/地台边缘 | 正式 GLB 已接入，源文件/UV/材质/回退齐全 |
| A 门/窗框/窗帘 | 正式 GLB 已接入；独立玻璃保留，Window 真网格可点 |
| A 书桌与既有侧柜 | 正式 GLB 已接入；4 个原实心体内建模，原钢琴空腔/16 mm 净空保留 |
| A 展示柜 | 正式 GLB 已接入；13 块板/10 格室实测，收藏 proxy 保留 |
| A 床/既有床边家具、沙发、办公椅 | 正式 GLB 已接入，软包/支脚与承托关系经过实际几何验证 |
| A 茶几/小圆边桌/Beanbag/地毯 | 正式 GLB 已接入；边桌为小圆面细腿，两块地毯各挂原锚点 |
| A 狗窝 | 正式 GLB 已接入；只替换旧床垫网格，狗身体/头 proxy 保留 |
| B iPad、Phone/支架、钢琴/轨道、垃圾桶、开关、键鼠、耳机/架 | **未开始，待后续授权** |
| C 全部收藏、植物、灯具外壳、书籍/墙画、杯装可乐、静态狗 | **未开始，待后续授权** |
| C Minas Tirith格位 | **未开始；后续单独核对，不默认为Hogwarts共用格** |

回退点：开工 HEAD `9cf802250b5823ef1b30fc7ab4f45d3265496ccc` 已包含 v0.5，开工工作区状态为空。本次未提交、推送或改动暂存区。开工源码/资产快照 `/private/tmp/sharkys-room-v06a-start-20260918.tar.gz`（排除node_modules、.next、历史validation、tsbuildinfo）；SHA-256 `e2b56b144d5a0760cdd358352d6f232ce5338b7e09bfe03106059407f6c0d5b0`。开工工作区状态另存 `/private/tmp/sharkys-v06a-start-status.txt`；冻结FINAL及历史证据保持原位。

交付索引：`V06A_ROOM_FURNITURE_REPORT.md`、`ASSET_BUDGETS.md`、`ASSET_PIPELINE_GUIDE.md`、`assets-source/v06a/`、`validation/v06a/`。16 个 A 家族与原三件共 19 家族，正常网页全部正式安装；原 85 节点仍保留，运行时共 241 节点。
