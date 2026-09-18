# Sharky's Room — v0.6C Collection & Decor

当前在旧三件、A16、B8 上接入 C13，共 **40 个正式家族**：八件收藏、五处原位植物、一杯冰可乐、静态睡姿狗、四处静态灯具外壳与墙画。保留冻结 FINAL、原布局、九项交互、0.65 m 钢琴机构及桌下重新打开路径。当前结果见 [C 交付报告](V06C_COLLECTION_DECOR_REPORT.md)、[收藏格位表](V06C_COLLECTION_SLOT_MAP.md)、[灯具对应表](V06C_LIGHT_FIXTURE_MAPPING.md)；**用户视觉确认待完成**。

白城使用 Architecture 未分配格的暂定方案，不替换 Hogwarts。灯具仅预留独立非自发光表面，三组独立控制尚未实现。没有合适已允许位置的书籍未新增。页面角标和 package.json 仍保留历史 v0.6A 标记，本批未借资产收尾重做 UI 或改依赖；实际进度以 manifest 和本轮报告为准。

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

以上 B 命令继续可用；本轮 C 证据在 `validation/v06c/`，完整索引见 C 报告与 `validation/v06c/verification-summary.json`。浏览器默认 macOS Chrome/ANGLE SwiftShader，触屏为仿真；可以通过 `CHROME_PATH`、`ROOM_TEST_URL` 选择浏览器和本地服务。生产包不暴露诊断 API，使用真实像素、页面状态和相同资产哈希复核。

```bash
node scripts/assets/inspect-interactive-budgets.mjs  # 直接读取实际 GLB 的资源账本
ROOM_TEST_OUTPUT=validation/v06b/recheck-performance node tests/interactive-assets-performance.mjs
```

上述性能命令属于 B 专项复验，B 开工时的 A19 历史基线在 `validation/v06b/baseline/performance.json`；C 开工时的 B27 基线在 `validation/v06c/baseline/performance.json`。当前 C 场景不能重新生成并冒充任一旧基线，C 复验使用下方“C 复现与验收”命令。性能比较必须独占浏览器/渲染任务，区分 GLB 文件字节、Resource Timing 网络字节、纹理展开估算与软件渲染帧间隔，不代替真机验收。

## 正式资产

40 个家族的 `.blend` 在 `blender-assets/`，网页 GLB 在 `public/models/production/`。旧三件使用 `_pilot`，A 使用 `_v06a`，B 使用 `_v06b`，C 使用 `_v06c`；尺寸、材质、UV、来源与统计分别在 `assets-source/v06a/`、`assets-source/v06b/`、`assets-source/v06c/`。四块屏幕独立使用 CanvasTexture，Marshall 仍仅保留电源反馈。C 对应 proxy 可逆退场，A 狗窝保留；无旧 proxy 的可乐/灯带失败时明确记为 fallback，不冒充正常安装。

```sh
node scripts/assets/build-interactive-assets.mjs piano  # 只重建指定 B 家族
node scripts/assets/build-interactive-assets.mjs        # 重建 B8；不会重做 A/旧三件
node scripts/assets/inspect-interactive-budgets.mjs
```

生成会覆盖所选家族的生成文件，手工编辑前先另存副本。加载/贴图失败时，有旧 proxy 的家族保留完整灰盒；无旧 proxy 的可乐和灯带明确缺席并记录 fallback。页脚显示原因提示及“刷新重试”，重试从初始状态重新加载。正式模型成功后旧灰盒不渲染也不接收点击，原语义与机械锚点继续保留。详见 [ASSET_PIPELINE_GUIDE.md](ASSET_PIPELINE_GUIDE.md)。

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
- `validation/v06b/`：历史 B 工作区快照校验、A19 开工基线、四组局部回归、B 全量故障/生产验证、截图/录像与同环境增量。

当前统一状态见 [V06_ASSET_STATUS.md](V06_ASSET_STATUS.md)，其中历史 A/B 原文已单独标记。历史 B 交付见 [V06B_INTERACTIVE_ASSETS_REPORT.md](V06B_INTERACTIVE_ASSETS_REPORT.md) 和 `validation/v06b/`；其他历史报告保留：[A 房间家具](V06A_ROOM_FURNITURE_REPORT.md)、[整合审计](POST_V06_INTEGRATION_AUDIT.md)、[旧三件](FINAL_ASSET_PIPELINE_REPORT.md)。

C 开工完整 A/B 回退点见 `validation/v06c/snapshot.json`；当时 main / c83ec37，工作区干净，完整归档仍包含所有真实源和资产。没有提交、推送、部署或更新依赖。本次停在 C 交付，后续仅建议用户视觉复核后再明确进入 v0.7A。

## C 复现与验收

```bash
# 仅重新生成明确指定的 C 家族；会写该家族源与导出，先保留当前副本
node scripts/assets/build-collection-decor.mjs eiffel
ROOM_REQUIRE_ALL_C=1 node scripts/assets/inspect-decor-budgets.mjs
ROOM_REQUIRE_ALL_C=1 node --import tsx --test tests/collection-decor-geometry.test.ts tests/collection-decor-order.test.ts tests/collection-decor-clearance.test.ts
ROOM_C_STAGE=all ROOM_TEST_OUTPUT=validation/v06c/recheck-all node tests/collection-decor-browser.mjs
ROOM_TEST_PRODUCTION=1 ROOM_C_STAGE=all ROOM_C_DEV_EVIDENCE=validation/v06c/recheck-all/collection-decor-browser.json ROOM_TEST_OUTPUT=validation/v06c/recheck-production ROOM_TEST_URL=http://127.0.0.1:3001 node tests/collection-decor-browser.mjs
# 单独运行性能采样，其他浏览器验收/Blender/构建结束后再启动
ROOM_TEST_OUTPUT=validation/v06c/recheck-performance ROOM_C_PERFORMANCE_BASELINE_FILE=validation/v06c/baseline/performance.json node tests/collection-decor-performance.mjs
```

C 前当前 B27 基线在 `validation/v06c/baseline/`，不能拿现在的 C 场景重新生成并冒充。完整资源账本从 GLB 直接读取，C 增加 2,336,368 B、43,442 三角面、66 primitives；全初始 GLB 6,998,924 B。严格零面积导出清理后的网络/活动帧间隔已测，成本仍增长，不能宣称预算全达标或性能无回退。所有 C 几何、墙画和材质均本批自制，无外部图片或新依赖；来源和规格见 `assets-source/v06c/README.md`。

近景使用 `tests/helpers/collectionInspection.mjs` 在临时验证副本注入镜头检查，仅作可见性补充；主网页和新生产包不含该 API，也没有新增收藏交互。原始截图、失败及修复记录均留在 `validation/v06c/`，报告指定最终有效版本。
