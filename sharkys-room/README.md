# Sharky's Room — v0.6A Room & Furniture

在现有 v0.5 基础上接入房间与主要家具的 16 个独立资产家族，保留 Monitor、MacBook、Marshall 三件正式资产。提供可编辑 Blender 源、原创纹理与可复现导出脚本；保留冻结 FINAL、48mm Hero、3:2 contain、九项交互和钢琴桌下重新打开入口。本次只执行 A 批，B/C 仍保留占位外观。

## 启动

需要 Node.js ≥20.9 与 npm。

```bash
cd "/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room"
npm install
npm run dev
```

打开 http://127.0.0.1:3000 。生产预览：

```bash
npm run build
npm start -- --port 3001
```

打开 http://127.0.0.1:3001 。仅监听本机，没有公开部署。

## 操作

鼠标悬停轻微高亮，点击／触屏轻点聚焦。也可用页脚 **Explore objects** 原生选择器打开全部 9 个物件；键盘可直接操作选择器与面板控件。聚焦后点击 **Back** 或按 **ESC** 返回精确 Hero Camera。移动端使用可见 Back，不依赖 hover。

| 物件 | 当前行为 |
| --- | --- |
| Monitor | 屏幕激活，Projects 占位 |
| MacBook | 铰链打开，About / Education；退出关闭 |
| iPad | 屏幕激活，Memories 占位 |
| Marshall | 首次电源开启，Power 控件切换；返回后保留状态，无音频 |
| Piano | 0.65m 抽拉；收回后悬停桌前下方显示 Pull-out Piano，点击／轻点重新抽出；Toggle piano 与选择器仍可用 |
| Trash Can | 开盖、Deleted ideas live here.；退出关盖 |
| Light Switch | 物理开关与 Cabinet / Desk / Bed 灯切换；保留状态 |
| Phone | 屏幕激活，Contact / GitHub / LinkedIn / Email 占位 |
| Window | Time 00:00–24:00 与五种天气状态；只更新状态与文字 |

冻结 GLB 的初始 MacBook 已打开、钢琴已抽出。为了保留初次 Hero，首次聚焦这两件物体时会**先收起再展开**，随后按实际状态切换。钢琴完全收回后，桌前下方启用 Web 专用的隐形点击区；悬停显示 **Pull-out Piano**，点击／触屏轻点即可重新抽出。抽出状态使用钢琴实体，悬停显示 **Put away Piano**。相机或机构运动期间点击区停用，普通桌面、椅子及其他物件保持原有命中规则。Explore objects 保留为键盘／辅助入口。

动画期间重复点击不会创建第二条相机动画；Back 会等待当前机构动作完成再返回。系统开启“减少动态效果”时，相机缩短为 80ms、机械动作立即完成。

## 验证命令

```bash
npm run verify:asset
npm run typecheck
npm test
npm run build
```

另开终端启动开发服务器后：

```bash
ROOM_TEST_OUTPUT=validation/v06a/v03-regression npm run test:browser
ROOM_TEST_OUTPUT=validation/v06a/v04-regression npm run test:interactions
ROOM_PIANO_CYCLES=20 ROOM_TEST_OUTPUT=validation/v06a/piano npm run test:piano
ROOM_TEST_OUTPUT=validation/v06a/v05-assets npm run test:assets
npm run test:furniture
```

另开终端启动生产服务器（3001）后：

```bash
ROOM_TEST_OUTPUT=validation/v06a/production npm run test:production
ROOM_TEST_OUTPUT=validation/v06a/piano ROOM_TEST_PRODUCTION=1 npm run test:piano
ROOM_TEST_OUTPUT=validation/v06a/v05-assets ROOM_TEST_PRODUCTION=1 ROOM_ASSET_DEV_EVIDENCE=validation/v06a/v05-assets/production-assets-browser.json npm run test:assets
ROOM_TEST_PRODUCTION=1 npm run test:furniture
```

浏览器测试默认使用 macOS Chrome；其他路径可设置 `CHROME_PATH`，服务地址可设置 `ROOM_TEST_URL`。Playwright 使用 ANGLE SwiftShader 软件 WebGL，触屏为浏览器模拟，不等同于真实手机性能验收。

生产钢琴专项需要先运行 `ROOM_PIANO_CYCLES=20 ROOM_TEST_OUTPUT=validation/v06a/piano npm run test:piano` 生成坐标。两种资产生产专项都先运行对应开发专项；使用自定义证据目录时设 `ROOM_ASSET_DEV_EVIDENCE` 或 `ROOM_FURNITURE_DEV_EVIDENCE` 指向实际 JSON。A 批性能独立采样使用 `ROOM_FURNITURE_PERFORMANCE_ONLY=1 npm run test:furniture`，避免与其他浏览器、Blender 或构建并行。详细命令见接入指南。

## 正式资产

19 个家族的 `.blend` 在 `blender-assets/`，网页 GLB 在 `public/models/production/`。v0.5 文件使用 `_pilot`，A 批使用 `_v06a` 后缀；A 批尺寸、材质、UV、来源与统计在 `assets-source/v06a/`。两块屏幕仍使用运行时 CanvasTexture，Marshall 仍使用独立小指示灯。狗窝只替换床垫 proxy，原狗身体和头的占位保留至 C 批。

```sh
npm run assets:build                # 需要 Blender，重建源文件及 GLB
npm run assets:build -- monitor     # 只重建一个家族
npm run assets:build:room           # 重建 A 批 16 个家族
npm run assets:build:room -- desk floor  # 只重建指定 A 批家族
node scripts/assets/inspect_export_contract.mjs
```

生成会覆盖所选家族的生成文件，手工编辑前先另存副本。加载/贴图失败时按家族保留完整灰盒，页脚显示原因提示及“刷新重试”；重试从初始状态重新加载。正式模型成功后旧灰盒不渲染也不接收点击，原语义与机械锚点继续保留。详见 [ASSET_PIPELINE_GUIDE.md](ASSET_PIPELINE_GUIDE.md)。

## 开发诊断

- `http://127.0.0.1:3000/?debug=1`：节点、targets、交互状态、相机和性能面板。
- `http://127.0.0.1:3000/?debug=1&demand=1`：保留只读诊断 API，但使用按需渲染，验证动画后停止绘帧。
- `?debug=1&hitareas=1`：仅开发环境显示已启用的钢琴点击区线框。
- 诊断提供 `pianoState` 与 `pianoRetractedHitAreaActive`；点击区只在收回且可操作时启用。
- 生产环境忽略 debug / hitareas 参数，不暴露开发 API。

普通模式始终按需渲染，GSAP `onUpdate` 才触发动画帧；开发 FPS 面板可使用持续采样。

## 结构

- `components/room/`：保留 v0.3 加载、Canvas、模型、Hero、诊断拆分；新增 CameraController、InteractionOverlay、HoverHighlight。
- `lib/room/interactiveObjects.ts`：唯一语义映射；冻结 GLB 节点与 Web runtime targets 分开声明。
- `lib/room/pianoInteraction.ts` / `components/room/PianoRetractedHitArea.tsx`：桌前下方的 Web 点击区和状态门槛，不修改模型。
- `lib/room/interactionState.ts`：集中状态、动作互斥、Back 排队、环境状态。
- `lib/room/focusViews.ts` / `cameraAnimation.ts`：9 个相对 target 偏移与可复用相机动画。
- `lib/room/animationConstants.ts` / `mechanisms.ts`：精确机构端点、GSAP、独立材质和 practical lights。
- `lib/room/assets/`：家族登记、装配校验、Canvas 屏幕、原子回退与资源所有权。
- `public/models/`：FINAL GLB 的逐字节副本。
- `tests/`：保留的 v0.3 契约／浏览器覆盖，加相机、机构、状态机与完整交互测试。
- `validation/v041/`：钢琴专项截图、回归结果、构建日志与冻结资产完整性证据；v0.4 历史结果仍在 `validation/v04/`。
- `validation/v05/`：v0.4.1 实测基线、新资产截图/录像、20轮开合、故障回退与性能记录。
- `validation/v06a/`：本次真实 v0.5 开工基线、空间快照、A 批截图/录像、故障回退与性能增量。

浏览器回归按上述命令把结果保存到 `validation/v06a/`，保留旧版证据。生产钢琴专项使用 `ROOM_TEST_OUTPUT=validation/v06a/piano ROOM_TEST_PRODUCTION=1 npm run test:piano`（先运行开发专项生成坐标记录）。

本次交付见 [v0.6A 房间与家具报告](V06A_ROOM_FURNITURE_REPORT.md)、[资产状态](V06_ASSET_STATUS.md) 和 [资产预算](ASSET_BUDGETS.md)。历史报告保留：[v0.5 三件资产](FINAL_ASSET_PIPELINE_REPORT.md)、[v0.4.1 钢琴修复](V0.4.1_PIANO_DISCOVERABILITY_REPORT.md)、[v0.4 交互](INTERACTION_PROTOTYPE_REPORT.md)、[v0.3 基础](WEB_FOUNDATION_REPORT.md)。

本轮停在 v0.6A 技术交付，视觉效果待用户确认。v0.6B / v0.6C 未开始。
