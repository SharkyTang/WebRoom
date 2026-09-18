# V06B_INTERACTIVE_ASSETS_REPORT

日期：2026-09-18  
工程：`/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room`  
本批：v0.6B 剩余交互设备与桌面配件  
**B8 已实现，功能、资产契约与本轮网页技术检查通过；用户视觉待确认。软件渲染成本仍较 A 基线增加，详见第 7 节，不宣称真机性能已达标。**

## 1. 本次授权与实施结论

本批依据用户明确授权执行 `Sharkys_Room_v0.6B_Codex_Prompt_After_Audit.md`，在既有工程增量完成钢琴、iPad、Phone 与支架、垃圾桶、实体开关、键盘、鼠标、耳机与架。已完成的只读审计作为依据，没有再次执行整份审计。更新后的总计划只用于理解版本顺序。

本轮沿用 Blender → GLB → 原锚点可视装配。8 个 B 家族均有可编辑源、真实导出物、规格和实际网页安装证据。全屋登记共 **27 个正式家族：旧三件＋A16＋B8**；原冻结 FINAL 仍独立保留。

当前旧三件与 A 为**暂定风格基线，用户视觉待确认**，本轮没有把旧截图或自动检查当作审美批准。B 为原创程序化风格近似；缺少精确设备型号的对象不声明为型号级复刻或制造尺寸。

最终技术结论：**B 已实现且本轮技术验收通过，视觉待确认；性能测量完成并保留明确限制，未验收真实设备性能。**  
A 状态：技术完成、视觉待确认。C 状态：未开始。不能据此宣布“v0.6 全部完成”。

## 2. 真实开工状态与完整回退点

| 项目 | 开工记录 |
| --- | --- |
| Git HEAD | `9cf802250b5823ef1b30fc7ab4f45d3265496ccc` |
| 分支 | `main` |
| 工作区状态 | 16 个已跟踪修改条目、552 个未跟踪条目；原始记录保留于快照 `status.txt` |
| 非覆盖式快照 | `/Users/shaoqitang/Documents/ChatGPT/网页小屋/local-backups/v06b-start-20260918-134334/` |
| 内容 | 工作区源码、配置、测试、文档、可编辑模型、GLB 和未跟踪 A 成果；共 978 个清单文件 |
| 排除 | `.git`、安装／构建缓存、Python 缓存、快照目录自身；没有排除真实 A 资产 |
| 压缩包 | `workspace.tar.gz` |
| 压缩包 SHA256 | `3aff67e2d6dc61eeb36afe583340ec013d9ecc67a903f93acb2c749f56bd56c9` |
| 完整性 | 开工逐文件对照清单；本轮独立复核再次计算压缩包 SHA，结果一致 |

快照覆盖的是含未提交 A 的真实工作区，不是仅指向旧 HEAD 的标签，也不只是 Git patch。保留了原暂存／未暂存记录，没有重置工作区、清理未跟踪资产、提交、推送或部署。

证据：[snapshot.json](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06b/snapshot.json)；快照目录中的 `manifest.json`、`status.txt`、`staged.patch`、`unstaged.patch`、`index.txt`。

## 3. 逐家族交付状态

表中“技术”只陈述已完成证据；完整交付技术状态须以第 6 节最终结果为准。

| 家族 | 制作 | 网页安装 | 技术验收 | 用户视觉确认 |
| --- | --- | --- | --- | --- |
| 电钢琴／抽拉件 | 完成；`.blend`、GLB、规格齐全 | 实际 VIS 已安装 | 通过：几何、网页、故障／恢复、最终生产；详见第 6 节 | **待用户确认** |
| iPad | 完成；`.blend`、GLB、规格齐全 | 实际 VIS 已安装 | 通过：几何、网页、故障／恢复、最终生产；详见第 6 节 | **待用户确认** |
| Phone／支架 | 完成；`.blend`、GLB、规格齐全 | 实际 VIS 已安装 | 通过：几何、网页、故障／恢复、最终生产；详见第 6 节 | **待用户确认** |
| 垃圾桶／独立桶盖 | 完成；`.blend`、GLB、规格齐全 | 实际 VIS 已安装 | 通过：几何、网页、故障／恢复、最终生产；详见第 6 节 | **待用户确认** |
| 实体灯开关 | 完成；`.blend`、GLB、规格齐全 | 实际 VIS 已安装 | 通过：几何、网页、故障／恢复、最终生产；详见第 6 节 | **待用户确认** |
| 游戏键盘 | 完成；`.blend`、GLB、规格齐全 | 实际 VIS 已安装 | 通过：几何、网页、故障／恢复、最终生产；详见第 6 节 | **待用户确认** |
| 游戏鼠标 | 完成；`.blend`、GLB、规格齐全 | 实际 VIS 已安装 | 通过：几何、网页、故障／恢复、最终生产；详见第 6 节 | **待用户确认** |
| 耳机／耳机架 | 完成；`.blend`、GLB、规格齐全 | 实际 VIS 已安装 | 通过：几何、网页、故障／恢复、最终生产；详见第 6 节 | **待用户确认** |

每个家族均交付：

- `blender-assets/<family>_v06b.blend`：可编辑源。
- `public/models/production/<family>_v06b.glb`：网页实际加载文件。
- `assets-source/v06b/<family>/ASSET_SPEC.md`：来源、尺寸、原锚点、装配与约束。
- `assets-source/v06b/<family>/asset-statistics.json`：生成及导出回读记录；独立预算账本另从真实 GLB 解析，未拿生成统计代替实测。

制作与重现入口：[制作计划](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/assets-source/v06b/PRODUCTION_PLAN.md)、[Blender 生成器](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/scripts/assets/build_interactive_assets.py)、[生成命令入口](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/scripts/assets/build-interactive-assets.mjs)。

```text
node scripts/assets/build-interactive-assets.mjs piano
node scripts/assets/build-interactive-assets.mjs ipad phone
node scripts/assets/build-interactive-assets.mjs trashcan lightswitch
node scripts/assets/build-interactive-assets.mjs keyboard mouse headphones
```

这些是重现说明，不表示交付后继续自动生成；重新运行会更新对应 B 文件，应先保存当前回退点。

## 4. 实际接入、原语义和几何约束

### 4.1 钢琴与抽拉件

`VIS_PianoBody` 装到 `INT_Piano`；`VIS_PianoSlide` 装到 `INT_PianoRail`。后者显式使用空 `proxyMeshNames`，防止递归抑制已装琴体。可见琴键、控制区、侧滑轨与托板继承原轨道，未增加逐键交互、MIDI 或音频状态。

保持原轨道局部 Z 初始展开端 `Z=-1.2899999618530273`，收回端 `Z=-1.9399999618530273`，行程精确 **0.65 m**。新导出根均为恒等变换，没有二次应用位置或旋转。

A 桌底真实世界 `Y≈0.669999957`；原琴最高约 `.654000025`，旧净空约 **16 mm**。B 新琴最高局部 `Y≈.053`，桌下净空约 **17 mm**。CPU 以真实 GLB 顶点检查完整琴体与抽拉件包络，并在 **17 个行程位置**检查与 A 正式桌体、椅子的关系，覆盖展开、1/4、半收、3/4、收回及中间采样。

`PianoRetractedHitArea` 定位、尺寸、启用条件和 `piano` 语义未变。开发模式验证了桌面、平板尺寸、390px 触屏仿真的“收回 → Back → Hero 桌下直接点击 → 重新展开”；保留 Explore objects 与 Toggle piano，但自然桌下入口有独立命中证据。

**开工实际源码已存在 `firstPianoActivation`：初次进入先收后展。B 没有新增、删除或改写这段行为。** 后续进入按当前实际状态切换；Back 仅退回 Hero，并保留当时的展开／收回状态。此处以开工源码为准，不沿用附件规划推断该逻辑尚不存在。

### 4.2 iPad 与 Phone／支架

iPad、Phone 分别沿原 `TEC_iPad`、`TEC_Phone` 锚点，外壳与正式显示面分离。独立显示面使用现有屏幕绑定与激活机制，只绘制 Memories／Contact 原型标题与占位反馈；没有真实相册、联系方式、设备系统界面或新数据层。

iPad 显示面朝局部 +Y，画布顶部位于局部 -Z；Phone 显示面朝局部 +Z。测试从实际三角面法线和 UV 核对正向与文字方向，验证激活不使整机外壳发光，也不改变其他屏幕。

Phone 的水平底座由世界坐标逆变换写入固定手机锚点局部顶点，VIS 根仍为恒等变换；增加底座、支撑杆、托台与前挡边，不移动手机锚点。对手机本体沿用旧包络，对必要支架单独检验桌面自由空间与承托射线，避免把手机原 proxy 的空中包围盒误当作支架边界。

### 4.3 垃圾桶与实体开关

垃圾桶具有真实开口、内壁和底部，桶盖继续独立装到原后沿 pivot `INT_TrashCanLid`。盖沿裙边在局部向下延至约 `-.026 m`，位于桶口内侧，用于衔接旧桶身／桶盖约 11.5 mm 视觉间隙；没有移动桶身或盖轴。保持原开合、退出关盖和现有彩蛋。

实体开关固定面板装到 `DEC_LightSwitchPlate`，拨片装到 `INT_LightSwitch`，原 ±8° 拨动和统一灯光总控保持。没有三灯组独立状态。面板本身仍为装饰，拨片命中原灯开关语义。

### 4.4 键盘、鼠标、耳机与架

键盘包含键帽行列、功能／方向键区及长空格，鼠标包含曲面机壳、分离按钮面和滚轮，耳机包含弧形头梁、耳罩软垫及真实中央支撑杆、承托鞍座和底座。

键盘与鼠标在原锚点下补支承，局部最低约 `-.0255 m`，对应世界桌面上约 0.5 mm；不移动原桌面占位。耳机与架留在原整体包络内。三者仍是静态配件，没有第十项正式交互；网页中另核对可见配件及邻近 Monitor／Marshall／Phone 入口。

## 5. 修改范围与保护输入

本批已有产品源码的实质扩展只有下列三处：

| 文件 | 必要变化 |
| --- | --- |
| `lib/room/assets/assetManifest.ts` | 登记 B8、原锚点与独立显示面／可动根；固定 A16 成员清单，避免新增 B 被误算入 A |
| `lib/room/assets/screenTextures.ts` | 增加 iPad／Phone 类型、画布尺寸、简单 Memories／Contact 原型分支；旧两设备绘制分支保留 |
| `lib/room/assets/assetAssembly.ts` | 使用共享 `ScreenId` 类型兼容四种屏幕；装配事务、回退及资源释放逻辑未改 |

此外新增 B 源／导出／规格、生成与真实 GLB 预算脚本、B CPU 与浏览器验收；现有家具浏览器套件仅适配明确的 old3＋A16＋B8 成员数及正式几何要求。现有 interaction 浏览器套件对 demand 静止观测的时序修正见第 8 节。当前更新文档：`README.md`、`V06_ASSET_STATUS.md`、本报告；`ASSET_BUDGETS.md` 只新增历史时点说明与 B 账本指向，A 历史预算和结论保留。完整既有文件差异见 `validation/v06b/final/workspace-delta.json`。

独立复核对照**开工快照 SHA，未与旧 HEAD 混比**，共 **142 项保护输入不变**：

| 保护类别 | 文件数 | 结果 |
| --- | ---: | --- |
| FINAL 源与空间冻结清单 | 5 | SHA 一致 |
| 网页冻结 GLB／冻结节点 manifest | 2 | SHA 一致 |
| A16 源、导出、纹理与规格等 | 77 | SHA 一致 |
| 旧三件源、导出及规格等 | 15 | SHA 一致 |
| 机制、相机、交互入口、状态、UI 等其余产品源码 | 33 | SHA 一致 |
| 既有生成器与公共 helper | 6 | SHA 一致 |
| package.json／lockfile | 2 | SHA 一致 |
| A 报告／已完成的整合审计 | 2 | SHA 一致 |

复核时新增模型恰好 B 的 8 个 `.blend` 与 8 个 GLB，所有实际导出根为恒等变换，未新增 app／components／lib／types 产品文件。证据：[保护输入独立复核](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06b/protected-inputs-review.json)。此文件记录其生成时点的检查；交付前若又更改受保护输入，须重新核对而不是沿用旧结论。

## 6. 本轮测试结果

环境：本机已安装 Chrome headless、ANGLE SwiftShader 软件渲染、DPR 1；1440×900 桌面、768×1024 平板尺寸、390×844 触屏仿真。触屏仿真不等于真机。测试使用实际页面鼠标／触屏／键盘输入，调试接口用于读状态与定位可见表面。

### 6.1 已完成的质量与几何检查

| 命令／检查 | 本轮结果 | 证据 |
| --- | --- | --- |
| `npm run verify:asset` | **361 项契约检查通过**；冻结 85 节点／九语义／九 targets 未变 | `validation/v06b/final/verify-asset-optimized.log` |
| `npm test` | **172／172 通过**，包括 B 的 CPU 几何与装配测试；不再重复叠加其子集数量 | `validation/v06b/final/unit-tests-optimized.log` |
| `npm run typecheck -- --incremental false` | 退出码 0 | `validation/v06b/final/typecheck-optimized.log` |
| B 专项 CPU 几何（最终配件版） | **39／39 通过** | `validation/v06b/final/geometry-optimized.log` |
| `npm run build` | 本轮当前源码构建成功，退出码 0 | `validation/v06b/final/build-optimized.log`、`production-build-optimized.json` |

构建使用当前源码／public 的独立复制目录及现有依赖硬链接，没有重新安装依赖，也没有把未知旧包作为生产结果。已记录 build ID：`M2z6Vzd_8okDagjqhYb1Z`。生产验证明确连接这一本轮构建的 `http://127.0.0.1:3002`，实际结果如下。

### 6.2 四组立即接入后的局部网页验证

| 实施顺序 | 最终有效局部结果 | 持久证据目录 |
| --- | ---: | --- |
| 1. 钢琴与抽拉件 | 14／14 | `validation/v06b/stage-piano-r2/` |
| 2. iPad＋Phone／支架 | 16／16 | `validation/v06b/stage-screens/` |
| 3. 垃圾桶＋实体开关 | 18／18 | `validation/v06b/stage-mechanisms-r3/` |
| 4. 键盘＋鼠标＋耳机／架 | 22／22 | `validation/v06b/stage-accessories-r2/` |
| 合计 | **70 个阶段检查通过** | 各目录 `interactive-assets-browser.json`／`.md` |

70 是四次有效阶段运行的检查总数，不代表 70 个完全独立的功能，也不重复计入早期失败或重复重跑次数。

### 6.3 B 全量开发模式验收

**57／57 通过**：[完整 JSON](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06b/all-final/interactive-assets-browser.json)、[可读索引](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06b/all-final/interactive-assets-browser.md)、`validation/v06b/final/interactive-assets-browser-optimized.log`。

覆盖三种视口的 27 家族实际安装、九项正式几何进入、Back／ESC 与固定 Hero 返回、键鼠耳机静态语义及入口保留；桌下钢琴自然重开、动画中间状态与减少动态效果；八家族逐个 GLB 404 的完整 proxy 回退、其余家族继续安装和刷新恢复；取消加载／重新加载与资源形状稳定；本次运行前后 GLB 哈希一致。故障注入页面中的预期错误作为回退证据保留，未把 fallback 算成正式安装通过。

独立原钢琴浏览器套件：`npm run test:piano`，**10／10 通过**，`ROOM_PIANO_CYCLES=20`；证据 `validation/v06b/piano/piano-browser.json` 与 `final/piano.log`。

### 6.4 既有全局回归与本轮生产验证

| 项目 | 最终结果 | 本轮证据 |
| --- | ---: | --- |
| `npm run test:interactions` | **37／37** | `interactions-r2/interaction_browser.json`；保留首次 36／1 与排查过程 |
| `npm run test:furniture` | **50／50** | `furniture/furniture-browser.json`；包括 A16 逐家失败与恢复 |
| B 生产模式 | **44／44** | `production-final/interactive-assets-production.json`；三视口，原生像素重放，开发API不存在 |
| 既有钢琴生产回归 | **3／3** | `piano/piano-production.json`；桌面/触屏桌下重开 |
| 既有家具生产回归 | **24／24** | `furniture-production/furniture-production.json` |

上述相对路径统一位于 `validation/v06b/`。既有钢琴、interactions、家具开发及生产回归在最终键盘减面前完成；之后仅优化静态键盘 GLB，并重新通过 361 契约、172 单测、类型、构建、B 全量开发 57 项与最终生产 44 项。最后两项直接使用优化后的全部资产；没有把旧构建证据冒充最终包。实际命令、环境变量和退出码保存在 `final/browser-regressions.json`（首跑）、`final/browser-regressions-r2.json`（旧套件重跑）、`final/quality-optimized.json` 与 `verification-summary.json`。所有最终项退出码为 0；失败原始目录没有覆盖。开发/生产回归项有覆盖重叠，不以简单相加声称独立功能数量。

B 专项与最终生产的实际命令为：

```text
ROOM_B_STAGE=all ROOM_TEST_OUTPUT=validation/v06b/all-final node tests/interactive-assets-browser.mjs
ROOM_TEST_PRODUCTION=1 ROOM_B_STAGE=all ROOM_B_DEV_EVIDENCE=validation/v06b/all-final/interactive-assets-browser.json ROOM_TEST_OUTPUT=validation/v06b/production-final ROOM_TEST_URL=http://127.0.0.1:3002 node tests/interactive-assets-browser.mjs
ROOM_TEST_OUTPUT=validation/v06b/performance-optimized ROOM_TEST_URL=http://127.0.0.1:3000 node tests/interactive-assets-performance.mjs
```

性能最终结果见第 7 节；它与功能回归分开采样，没有并行运行其他浏览器、Blender 或构建。

## 7. 真实资源账本与性能边界

依据 [最终 GLB 预算账本](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06b/final/asset-budget-ledger-optimized.json)，由 [字节级检查脚本](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/scripts/assets/inspect-interactive-budgets.mjs)直接解析文件、glTF accessor 与嵌图。每家族纹理栏仅指 GLB 嵌入图像，不包括运行时 Canvas。

| 家族 | GLB 字节 | 三角面 | mesh 定义 | primitives | 材质 | 嵌图数／尺寸 | 可编辑 .blend 字节 |
| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| 电钢琴／抽拉件 | 269,144 | 6,260 | 5 | 5 | 4 | 0／无嵌图 | 162,210 |
| iPad | 25,776 | 756 | 3 | 3 | 3 | 0／无嵌图 | 111,267 |
| Phone／支架 | 39,068 | 1,220 | 4 | 4 | 3 | 0／无嵌图 | 120,622 |
| 垃圾桶／独立桶盖 | 57,508 | 1,912 | 3 | 4 | 2 | 0／无嵌图 | 123,049 |
| 实体灯开关 | 27,244 | 832 | 4 | 4 | 2 | 0／无嵌图 | 108,992 |
| 游戏键盘 | 206,320 | 4,148 | 3 | 3 | 3 | 0／无嵌图 | 148,778 |
| 游戏鼠标 | 49,428 | 1,820 | 3 | 3 | 3 | 0／无嵌图 | 127,341 |
| 耳机／耳机架 | 81,196 | 3,292 | 3 | 3 | 3 | 0／无嵌图 | 131,793 |
| **B 合计** | **755,684** | **20,240** | **28** | **29** | **23（跨家族分别计）** | **0** | 见逐项 |

垃圾桶单个 mesh 包含多个材质 primitive，因此 mesh 数和 primitive 数不同。静态重复键帽与部件按同父级／同材质合并；没有跨独立可动根或显示面盲目合并。

| 初始 GLB 文件载荷 | 字节 |
| --- | ---: |
| 冻结 FINAL | 411,892 |
| 旧三件 | 1,119,288 |
| A16 | 2,375,692 |
| B 前合计 | **3,906,872** |
| 新增 B8 | **755,684** |
| B 后合计（28 个 GLB） | **4,662,556** |
| 本批增长 | **755,684 B，约 19.34%** |

B 文件由 JSON **34,524 B**、GLB 容器头 **224 B**、其他 BIN **720,936 B** 构成；无嵌图，不把法线、UV、索引、材质、层级等全部误标成“纯几何”。B8 无外部 URI、无数据 URI、无导出相机／灯／动画；原 FINAL 自身保留的相机灯光不属于 B 禁止项。

沿用既有预算文档对 B 的**暂定审查线**：约 60,000 triangles、≤1.2 MB 文件增量、约 +25 draw calls。它们是已有规划审查线，不是新增的批准硬上限。本次文件与几何低于对应参考；同条件实测 Hero draw calls 增加 16，低于 +25 审查线。这个增量来自网页测量，不能将 29 primitives 直接当成 +29 calls。

iPad 运行时 Canvas 为 512×360，Phone 为 256×512；没有新增下载 PNG。Canvas 会增加运行时纹理资源，真实纹理数和显存不能由“GLB 零嵌图”推断为零。跨 GLB 图像 SHA 去重仅描述内容复用，原 A／旧三件中的重复嵌图仍计入实际各文件载荷，不能从传输账本扣掉。

这些数字为**未压缩 GLB 文件字节**，不等于 HTTP `transferSize`／`encodedBodySize`、全站首屏总量、显存或互联网冷启动成本。

同条件前后性能方法：与 `validation/v06b/baseline/performance.json` 使用相同 Chrome headless／SwiftShader、DPR 1、视口、场景、质量档与读数方式；每视口新 context、独占采样，Hero 两秒观察与原生进入／返回的 RAF 帧间隔。不得将历史 A 报告其他时点直接相减作为本轮增量。

| 视口 | Hero calls 前→后 | 可见三角面 前→后 | Hero 帧间隔 A／首版 B／最终 B（ms） | 最终 B 较 A |
| --- | ---: | ---: | ---: | ---: |
| 1440×900 | 121→137 | 80,666→100,256 | 48.91／61.04／57.83 | +8.91 ms／+18.2% |
| 768×1024 | 121→137 | 80,666→100,256 | 41.48／51.31／49.44 | +7.95 ms／+19.2% |
| 390×844 | 121→137 | 80,666→100,256 | 35.56／46.67／44.09 | +8.53 ms／+24.0% |

首版 B 测得显著成本增长后，针对键盘微小倒角减面并删除被外壳完整遮挡的键帽底面；键帽此前已按材质合批。优化减少 **5,544 triangles、62,832 B**，calls 不变。两版 GLB 独立复核确认删除的 168 个底面共 672 个顶点／重心采样均被底壳遮蔽约 1.5–2.5 mm，可见顶面和主要侧面保留，见 [优化复核](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06b/final/keyboard-optimization-review.json)。最终网页近景重新截取，没有修改 A、全站质量档或机构。

优化后的软件渲染帧间隔较首版 B 改善约 1.88–3.21 ms，**仍明显高于 A**；不把预算线内等同于无性能回退。上述为各时点单次独占采样，变化有调度噪声，不能当作硬件 GPU 帧耗时或可靠真机 FPS。详细桌面／触屏共 16 组原生进入与返回的 mean／p95，以及完整方法，见 [同条件性能对照](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06b/final/PERFORMANCE_COMPARISON.md) 和 `final/performance-summary.json`。性能检查 **21／21 通过**证明采样环境、旧资产与结构检查成立，不代表满足未设定的流畅度门槛。

| 模型网络账本（各视口一致） | A19 | 最终 B27 | 增量 |
| --- | ---: | ---: | ---: |
| Resource Timing transferSize | 1,747,116 B | 1,952,443 B | +205,327 B |
| encodedBodySize | 1,741,116 B | 1,944,043 B | +202,927 B |
| decodedBodySize | 3,906,872 B | 4,662,556 B | +755,684 B |

网络数据来自本地暖服务、新 context；不含页面 JS／CSS，不等于真实互联网冷启动。Three rendererMemory 为 **152→181 geometries、21→23 textures**；正式家族唯一纹理 UUID **20→22**。RGBA8＋完整 mip 估算 **28,835,853→30,517,944 B**，增加 **1,682,091 B**，来自两块新 Canvas；计数／估算均不是实际 VRAM。

本轮未得到可作为可靠跨版本对照的首次 ready 时间，不用网络 duration 代替，也不补造数字。平板只测 Hero，动画 mean／p95 来自桌面与触屏仿真；硬件 GPU、Safari、实体手机／平板和实际网络下的体验仍未测。

## 8. 实施中发现、修正与保留的失败记录

| 观察 | 处理 | 后续证据 |
| --- | --- | --- |
| 早期钢琴浏览器脚本假设再次进入后一定展开，实际旧机制会切换到收回 | 脚本依据真实状态，必要时使用已有 Toggle piano 准备展开；未更改机构或 Back | `stage-piano-r2` 14／14 |
| Phone 初版支架最低世界 Y≈.737923，穿入 `.740000` 桌面 | 在同锚点局部调整 B 支撑几何；保留手机锚点与原桌 | `02-screens-geometry-r2.log`、`stage-screens` |
| 初版垃圾桶关闭轴角读数为 `-0`，`assert.strictEqual` 采用 `Object.is` 区分 `-0` 与 `0`，触发无几何偏差的失败 | 按数值零／机械容差检查，保留真正开合断言 | `stage-mechanisms-r2`／`r3` 均 18／18 |
| 鼠标初版完整椭球外观像悬在独立底座上 | 在原包络内修为有平底的下壳／上部曲面与底垫，重新导出及接入 | `04-mouse-build-r2.log`、`04-accessories-geometry-r2.log`、`stage-accessories-r2` |
| 旧 interactions 套件 demand 首跑在逻辑动画结束后 500ms 内多观察到 1 个尾帧（17≠16） | 先用三个全新 context 独立观察；三次约 1.5 秒期间帧数分别稳定在 33／35／34。套件随后复用现有 `waitForCanvasReady`，要求 250ms 静止且总等待有界，再保留独立 500ms 零帧断言。产品运行时代码未改 | `final/demand-followup.json`；重跑 `interactions-r2` **37／37 通过** |

初跑失败日志与图片仍保留，没有覆盖或改标为通过。上述 demand 修正处理的是“逻辑状态已完成”与“最后一次画面 invalidation 已完成”之间的观测边界；它不删除零帧断言；随后已完整重跑原套件并取得 37／37 通过。

另一次实际截图发现开关面板与暗槽共面闪纹；将面板厚度从 .029 收至 .025 m，仍在原包络内，重新导出后 `stage-mechanisms-r3` 18／18 通过，近景确认闪纹消失。开工时服务未启动导致的 ERR_CONNECTION_REFUSED、Blender 启动失败和 Python helper 路径导入失败也如实保存在 `stage-evidence-index.json`；修正环境/导入后生成与回归成功，不把这些工具故障写作产品失败。

## 9. 实际网页截图与录屏索引

以下均为本轮实际网页截取／录制，不是 Blender 预览或生成式示意。完整逐项索引见 `validation/v06b/all-final/interactive-assets-browser.md`。

| 内容 | 证据 |
| --- | --- |
| 整屋 Hero：桌面／平板尺寸／触屏尺寸 | `all-final/hero-1440.png`、`all-final/hero-768.png`、`all-final/hero-390.png` |
| 钢琴展开／运动中间观察／收回 | `all-final/1440-piano-extended.png`、`all-final/1440-piano-half-observation.png`、`all-final/1440-piano-retracted.png` |
| 桌下自然重开前／后 | `all-final/1440-piano-underdesk-before-reopen.png`、`all-final/1440-piano-reopened.png` |
| 触屏尺寸桌下重开前／后 | `all-final/390-piano-underdesk-before-reopen.png`、`all-final/390-piano-reopened.png` |
| 平板尺寸与减少动态效果 | `all-final/768-piano-*.png`、`all-final/reduced-piano-*.png` |
| 新设备近景 | `all-final/focus-1440-ipad.png`、`all-final/focus-1440-phone.png`、`all-final/focus-1440-trashcan.png`、`all-final/focus-1440-lightswitch.png` |
| 键鼠／耳机所在桌面及邻近入口 | `all-final/1440-piano-extended.png`、`all-final/focus-1440-phone.png`、`all-final/focus-1440-marshall.png` |
| 旧三件与窗口回归近景 | `all-final/focus-1440-monitor.png`、`all-final/focus-1440-macbook.png`、`all-final/focus-1440-marshall.png`、`all-final/focus-1440-window.png` |
| B 全量实际网页录屏 | [v06b-all-interaction.mp4](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06b/all-final/v06b-all-interaction.mp4) |
| 四组逐步接入录屏 | `stage-piano-r2/v06b-piano-interaction.mp4`、`stage-screens/v06b-screens-interaction.mp4`、`stage-mechanisms-r3/v06b-mechanisms-interaction.mp4`、`stage-accessories-r2/v06b-accessories-interaction.mp4` |
| 最终生产截图／录屏 | `production-final/production-hero-{1440,768,390}.png`、`production-final/production-1440-focus-*.png`、`production-final/production-390-underdesk-reopen.png`；[最终生产录屏](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06b/production-final/v06b-all-interaction.mp4) |

生产录屏来自真实原生点击，未合成房间画面；生产包不显示开发诊断面板。最终生产录屏 **44.88 秒**，开发完整录屏 **64.80 秒**；文件 SHA 见 `verification-summary.json`；开发与生产的原始 WebM／MP4 均保留。

上表省略前缀的路径统一位于 `validation/v06b/`。运动中间截图是在检测到中间行程时发起拍摄，JSON 保留截图前／后姿态；没有暂停或改写动画来伪造精确“50%”静帧。

## 10. 限制、视觉确认与停止点

页面原顶栏仍显示预存的 v0.6A 文案，package version 仍为 0.6.0-a.0；本批保护 UI 与 package 文件，实际批次以 27 家族安装结果、资产清单和本报告为准。

硬件 GPU、Safari、实体手机／平板及实际网络环境尚未验证；现有 SwiftShader 和触屏仿真结果不能替代这些环境。资源计数稳定不等于测得了精确 GPU 显存占用或证明所有浏览器永不泄漏。

请用户独立确认整体风格连续性、钢琴键组与控制区、iPad／Phone 的外壳和屏幕可读性、Phone 承托外观、垃圾桶开合结构、开关厚度与拨片、键鼠及耳机架识别度。自动截图／技术通过不能改写“待用户视觉确认”。

本批没有重做 A 或旧三件，没有修改原布局、钢琴机构、桌下重开入口与返回语义；没有提前实施 C、真实设备页面、音乐／音源、昼夜／天气或三组独立灯，也没有部署。

交付动作：**B8 全部已接入且本轮技术验收通过；视觉与真实设备性能待确认。本轮到此停止。**  
下一批仅建议：**v0.6C 收藏／装饰正式资产，按后续独立授权执行。**  
本轮交付后停止，不自动进入 C 或其他后续版本。
