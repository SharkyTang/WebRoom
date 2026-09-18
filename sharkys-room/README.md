# Sharky's Room — v0.6B Interactive Assets

在旧三件与 A16 基础上增量接入 B8：钢琴/滑轨、iPad、Phone/支架、垃圾桶、实体开关、键盘、鼠标、耳机/架，共 27 个正式资产家族。提供可编辑 Blender 源、独立 GLB、规格与可复现导出脚本；冻结 FINAL、48mm Hero、3:2 contain、九项交互、既有机构/返回与桌下钢琴重开入口保持原样。A 技术完成，B 已接入且本轮技术验收通过；详细结果及性能限制见 B 报告，视觉待用户确认。C 尚未开始。

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

另开终端启动开发服务器后（输出目录请用未使用的新目录）：

```bash
ROOM_REQUIRE_ALL_B=1 node --import tsx --test tests/interactive-asset-geometry.test.ts
ROOM_B_STAGE=all ROOM_TEST_OUTPUT=validation/v06b/recheck-all node tests/interactive-assets-browser.mjs
ROOM_PIANO_CYCLES=20 ROOM_TEST_OUTPUT=validation/v06b/recheck-piano npm run test:piano
ROOM_TEST_OUTPUT=validation/v06b/recheck-interactions npm run test:interactions
ROOM_TEST_OUTPUT=validation/v06b/recheck-furniture npm run test:furniture
```

新构建的生产服务器（3001）启动后，用同轮开发证据重放：

```bash
ROOM_TEST_PRODUCTION=1 ROOM_B_STAGE=all ROOM_B_DEV_EVIDENCE=validation/v06b/recheck-all/interactive-assets-browser.json ROOM_TEST_OUTPUT=validation/v06b/recheck-production ROOM_TEST_URL=http://127.0.0.1:3001 node tests/interactive-assets-browser.mjs
```

本轮现有证据在 `validation/v06b/`，完整索引见 B 报告。浏览器默认 macOS Chrome/ANGLE SwiftShader，触屏为仿真；可以通过 `CHROME_PATH`、`ROOM_TEST_URL` 选择浏览器和本地服务。生产包不暴露诊断 API，使用真实像素、页面状态和相同资产哈希复核。

```bash
node scripts/assets/inspect-interactive-budgets.mjs  # 直接读取实际 GLB 的资源账本
ROOM_TEST_OUTPUT=validation/v06b/recheck-performance node tests/interactive-assets-performance.mjs
```

性能比较必须独占浏览器/渲染任务。开工前 A19 基线已保存在 `validation/v06b/baseline/performance.json`；当前 B 场景不能冒充开工基线。测量区分 GLB 文件字节、Resource Timing 网络字节、纹理展开估算与软件渲染帧间隔，不代替真机验收。

## 正式资产

27 个家族的 `.blend` 在 `blender-assets/`，网页 GLB 在 `public/models/production/`。旧三件使用 `_pilot`，A 使用 `_v06a`，B 使用 `_v06b`；尺寸、材质、UV、来源与统计分别在 `assets-source/v06a/`、`assets-source/v06b/`。四块屏幕独立使用 CanvasTexture，Marshall 仍仅保留电源反馈。狗身体/头、收藏等 C 占位继续保留。

```sh
node scripts/assets/build-interactive-assets.mjs piano  # 只重建指定 B 家族
node scripts/assets/build-interactive-assets.mjs        # 重建 B8；不会重做 A/旧三件
node scripts/assets/inspect-interactive-budgets.mjs
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
- `validation/v06a/`：保留的 A 批历史基线、空间快照、截图/录像、故障回退与性能增量。
- `validation/v06b/`：本轮工作区快照校验、A19 开工基线、四组局部回归、B 全量故障/生产验证、截图/录像与同环境增量。

B 交付见 [V06B_INTERACTIVE_ASSETS_REPORT.md](V06B_INTERACTIVE_ASSETS_REPORT.md)、[V06_ASSET_STATUS.md](V06_ASSET_STATUS.md) 和 `validation/v06b/`。历史报告保留：[A 房间家具](V06A_ROOM_FURNITURE_REPORT.md)、[整合审计](POST_V06_INTEGRATION_AUDIT.md)、[旧三件](FINAL_ASSET_PIPELINE_REPORT.md)。

包含未提交 A 与未跟踪成果的本地回退快照见 `validation/v06b/snapshot.json`。没有提交、推送、部署或更新依赖。本轮停在 B 交付，用户视觉确认单独记录；后续 C 仅为建议，尚未执行。
