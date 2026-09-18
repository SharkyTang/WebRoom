# v0.6 资产状态（2026-09-18，B 实施后）

A：技术完成，视觉确认待用户。B：8 个家族已制作、接入且本轮技术验收通过；用户视觉确认待定，真实设备性能未验收。详细结果见 `V06B_INTERACTIVE_ASSETS_REPORT.md` 与 `validation/v06b/verification-summary.json`。C：未开始。

当前网页 27 个正式家族 = 旧三件 + A16 + B8。原 85 个节点、九项语义/targets 与原布局/机构保留；正常装配后运行时为 283 节点，44 个原 proxy 网格被抑制。动态 VIS 增加不等于修改冻结源。

| 批次 / 资产 | 当前实现与状态 |
| --- | --- |
| v0.5 Monitor / MacBook / Marshall | 原 .blend/GLB/规格保留；既有正式屏幕/电源反馈继续使用 |
| A16 房间与家具 | 技术完成；本轮逐字节保留既有成果；作为暂定风格基线，视觉待确认 |
| B 钢琴 / 抽拉可视部件 | 正式琴体、52白键/36黑键、控制区、托板/滑条；0.65m原行程与桌下重开路径保留 |
| B iPad | 正式机身/独立屏幕，Memories 占位；没有真实相册页面 |
| B Phone / 支架 | 正式机身/独立屏幕/底座/背柱/托台，Contact 占位；没有真实联系方式 |
| B 垃圾桶 | 真实空腔、卷边、独立原轴心桶盖；退出关盖与彩蛋保留 |
| B 实体开关 | 固定面板、独立拨片，继承原总控；没有三组独立控制 |
| B 键盘 / 鼠标 / 耳机与架 | 明确键区/曲面鼠身滚轮/头梁耳罩与真实支杆；保持静态配件，不新增交互ID |
| C 全部收藏、植物、灯具外壳、书籍/墙画、杯装可乐、静态狗 | 未开始，未制作 |
| C Minas Tirith 格位 | 未开始；后续另行核对，不默认与 Hogwarts 共格 |

B 本轮回退点覆盖开工未提交 A 和未跟踪成果：`../local-backups/v06b-start-20260918-134334/`，978 个文件归档并逐文件校验；详见 `validation/v06b/snapshot.json`。开工 HEAD 为 `9cf802250b5823ef1b30fc7ab4f45d3265496ccc` / main，16 个已跟踪修改、552 个未跟踪文件。没有提交/推送/部署，没有修改用户暂存选择。

B8 GLB 合计 755,684 B / 20,240 triangles / 29 primitives。全初始 GLB 为 4,662,556 B；文件字节与网络传输、纹理内存和性能分开记录。见 `validation/v06b/final/asset-budget-ledger-optimized.json`。

同条件 Hero 实测 calls 121→137（+16）；SwiftShader 活动帧间隔较 A 仍增加约 18.2–24.0%，已先优化 B 隐藏键帽底面与微小倒角。不能将预算线内写成性能无回退或真机达标，详见 `validation/v06b/final/PERFORMANCE_COMPARISON.md`。

本轮实际源码已有初次钢琴“先收后展”的演示逻辑；该逻辑在开工快照中即存在，B 未新增或删除。后续规划语句不能覆盖当前实现事实。

交付：`V06B_INTERACTIVE_ASSETS_REPORT.md`、`assets-source/v06b/`、`validation/v06b/`。A 和 B 技术结果与用户视觉批准分开，未收到批准前不宣布 v0.6 全部完成。下一批仅建议 C；本次不自动进入。

---

## A 批交付时的历史记录（原文保留，以下不是当前 B 状态）

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
