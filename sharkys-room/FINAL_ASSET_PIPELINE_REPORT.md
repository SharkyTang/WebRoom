# Sharky's Room — v0.5 正式资产生产流程试点报告

**SHARKY'S ROOM — v0.5 TECHNICAL COMPLETE**  
**VISUAL REVIEW PENDING USER CONFIRMATION**

验收时间：2026-09-17 至 2026-09-18（Asia/Shanghai）。Monitor、MacBook、Marshall 已作为独立 GLB 出现在原网页中，继承真实几何点击、屏幕/电源状态和原铰链。冻结房间、九项交互及 v0.4.1 钢琴入口保留。当前仅本机预览，没有公开发布；本轮停止在 v0.5，视觉风格仍待用户确认。

## 1. 起点和冻结边界

起点为 v0.4.1 提交 `7dfed76ec317ecfabc229826fb85255bb2051fc5`，开始时工作区干净。实施前实际重跑：源资产检查 361/361、单元测试 68/68、TypeScript 通过、浏览器 91/91；包含桌面与390px触屏的钢琴桌下重开及原生产模式。[基线证据](validation/v05/baseline/BASELINE_SUMMARY.md)

以下文件 SHA-256 在交付时重新核对，与基线一致：

| 冻结文件 | SHA-256 |
| --- | --- |
| `../blockout_FINAL/sharkys_room_blockout_FINAL.blend` | `fbf6ed79e728867947fb293b9ebb70d314c2289517e9837cc3085f69fe334720` |
| `../blockout_FINAL/sharkys_room_blockout_FINAL.glb` 与 public 副本 | `f34b3c665ba7b08e583325bef5e3c2024f45e43ebb12a6735aa3b13a97758da2` |
| `lib/room/frozenSceneManifest.json` | `84b793cdaba786d647ccde41e4c653ef64a4bcf3d0afd9d693f49a0064521f53` |

14 个 required nodes、9 个 targets、原五个技术锚点的身份/父级/原点、Hero 相机与投影保持。相机 focus 配置、动画时长、首次 MacBook 演示策略、0.65m 钢琴行程及基础灯光未修改。源模型仍为85节点；装配后运行时为142节点。源契约在装配前验证，装配契约允许已登记的 VIS 子树及原机构合法运动，两者独立通过。

依赖没有升级：Next 16.3.5、React 19.2.8、R3F 9.7.0、Drei 10.7.8、Three 0.186.0、GSAP 3.15.0。lockfile 仅项目版本从0.4.1变为0.5.0。

## 2. 资产、参考和制作方法

参考实际存在的 `../Sharkys_Room_Blockout_Pack/room_master_reference.jpeg` 与 `../blockout_FINAL/hero_FINAL.png`。它们仅用于形态、空间和配色参考，没有复制成贴图。三件均为**风格化近似**，尺寸来自冻结 proxy 包络，不声称对应精确商业型号。

几何由本项目参数化脚本在 Blender 5.2.1 LTS 中创建：应用倒角、加权法线，按共享材质合并重复几何，保留独立屏幕与指示灯。标准 PBR、UV、法线与命名元数据通过未压缩 GLB 导出，再在新 Blender 场景重新导入校验。没有新增压缩依赖。

| 资产 | 本轮可见形态 | 局部尺寸/包络（米） | 三角面 | primitives / 材质 | GLB字节 |
| --- | --- | --- | ---: | ---: | ---: |
| Monitor | 圆角边框、背壳、下巴、立柱、脚座、独立屏幕 | 头部1.16×0.62；含支架总包络1.16×0.77×0.24 | 3,348 | 4 / 4 | 95,904 |
| MacBook | 铝质近似机身、61键帽、键盘槽、触控板、端口、薄盖/边框 | 底座.34×.028×.235；盖.34×.0145×.224 | 14,780 | 9 / 6 | 445,776 |
| Marshall | 圆角箱体、织物网罩、黄铜边/三旋钮、顶板、小灯与脚垫 | .36×.29×约.189 | 4,464 | 5 / 5 | 577,608 |
| **合计** | 三件独立可编辑源与导出 | 适配原包络 | **22,592** | **18 / 15** | **1,119,288** |

这里的 primitives 是文件结构统计，实际 draw calls 在第6节单独测量。新资产面数低于60,000目标、网络文件约1.12 MB低于5 MB目标。原 FINAL 的411,892字节仍需加载；四个模型请求合计1,531,180字节，不包含应用 JS/HTML。`.blend` 与源PNG不由网页下载。

形体、材质参数与织物纹理均由 Codex 为本项目原创制作，未使用第三方模型、产品字标或外部贴图；织物采用确定性经纬纹与种子5041的细噪声。参考图的授权不扩展为可分发贴图授权。细节和数据见 [Monitor规格](assets-source/monitor/ASSET_SPEC.md)、[MacBook规格](assets-source/macbook/ASSET_SPEC.md)、[Marshall规格](assets-source/marshall/ASSET_SPEC.md) 及各自 `asset-statistics.json`。

## 3. 装配和交互合同

| 新视觉根 | 原锚点 | 状态绑定 |
| --- | --- | --- |
| `VIS_MonitorBody` | `TEC_MonitorBody` | 静态机身 |
| `VIS_MonitorDisplaySurface` | `TEC_MonitorScreen` | Canvas屏幕 |
| `VIS_MacBookBase` | `TEC_MacBookBase` | 静态底座 |
| `VIS_MacBookLid` | `TEC_MacBookScreen` | 整个上盖继承原铰链；显示面在此子树中 |
| `VIS_MarshallBody` | `TEC_Marshall` | 仅子节点PowerIndicator响应电源 |

五个根都是 glTF Y-up 米制、identity TRS，不使用局部补偿矩阵。作者顶点到Blender轴向转换、glTF导出转换各一次，Web不再重复旋转。Monitor与MacBook的独立根在各自锚点原点建模；如何在Blender临时预览合体，见[流程指南](ASSET_PIPELINE_GUIDE.md)。

成功安装时，只替换6个旧 primitive 的可见材质并停用其 raycast；原节点本身可见性保持，正式子树正常绘制。撤销装配会恢复原材质和raycast引用。新增可见几何通过原祖先锚点解析相同 semantic ID；开发和生产的真实 mouse/touch 命中均验证了新资产，不依赖隐形旧方块。

集中登记同时检查必需节点唯一性及活动部件归属。MacBook盖壳、显示面必须属于Lid；Marshall网罩、指示灯必须属于Body。错误父级、重复节点或游离部件会被拒绝，不能带着半成品进入网页。

MacBook仍由原锚点驱动：closed `[0,0,0,1]`，open `[-.7933533787727356,0,0,.6087614297866821]`，局部X约`-1.8325958201 rad`。几何以闭合姿态定义，没有烘入第二次打开。实际GLB顶点在21个角度采样：盖与键盘的垂直净空闭合3.500mm、精确半开7.822mm、全开及采样最小2.879mm，均高于测试门槛0.8mm。浏览器原速开/关截帧和20轮原生点击/Back验证pivot、端点及精确Hero返回；半开PNG是连续动画中间截帧，并非暂停在精确52.5°的静态摆拍。

Marshall首次进入开启，Power可切换，Back后持久；小灯emissiveIntensity从0到2.4，箱体/网罩材质保持。屏幕和高亮使用独立材质克隆；修复了悬停cleanup可能覆盖Power新材质的竞争，实际“关闭→悬停正式几何→Power开启→Back”回归确认小灯维持2.4。

## 4. 屏幕与纹理

两块显示面独立使用 CanvasTexture。Monitor显示Projects，MacBook显示About / Education；可访问的操作仍在HTML面板。Canvas只在初始与激活状态变化时重绘，连续采样时更新次数不变。激活/退出继承原屏幕强度3/1，不让外壳一同发光。

| 纹理 | 像素 / 类型 | 色彩/方向 | 网络字节 | 展开估计（含mip） |
| --- | --- | --- | ---: | ---: |
| Monitor Canvas | 1024×512 RGBA，运行时 | sRGB，flipY=false | 0 独立图片请求 | 2,796,203 B |
| MacBook Canvas | 512×320 RGBA，运行时 | sRGB，flipY=false | 0 独立图片请求 | 873,814 B |
| Marshall网罩 | 512×512 RGBA PNG | sRGB，基础颜色 | 430,084 B，已包含在GLB中 | 1,398,102 B |
| **合计** | 三张独立图 | 无法线/粗糙度数据图 | 不重复计入GLB字节 | **约5,068,119 B / 4.83 MiB** |

内存估算为宽×高×4×4/3并向上取整，按唯一纹理计数；不包括驱动对齐、几何、Canvas CPU副本或其他资源，未使用GPU内存分析器。map与emissiveMap引用同一Canvas，不复制图片。屏幕UV实际读回证明文字正立：Monitor顶边+Y为V0；MacBook闭合+Z边在打开后成为顶边，亦为V0。

| 方案 | 本轮判断 |
| --- | --- |
| emissive-only | 适合激活和指示灯，不能承载动态文字占位 |
| **CanvasTexture（采用）** | 简单文字/卡片可附着真实屏幕，状态变化时更新，负担有限 |
| Drei Html | 可访问DOM方便，但屏幕透视、遮挡与焦点管理增加复杂度；现有HTML面板已承接完整控件 |
| render-to-texture | 适合动态3D或复杂场景屏幕，增加离屏渲染/资源成本，本轮没有需要 |

## 5. 失败、取消与资源生命周期

每个家族的模型、必要部件和纹理全部解析/验证后整体替换。三个家族均settle后才挂接交互运行时，避免在活动tween中途重绑。任一GLB404或Marshall嵌入PNG解码失败，整个对应家族保留可用灰盒，其他家族照常使用；页脚显示基础模型提示和空闲时的刷新重试。正式加载成功和故障回退在测试中分开计，不以回退冒充正式模型通过。

加载取消会中止fetch；解码晚到后也检查取消并释放，不回写旧实例。重复安装被拒绝；连续导航离开/三次重入/恢复请求后刷新均通过。重试采用整页重载，会恢复初始交互状态。

原FINAL、每个未缓存的GLB结果、Canvas/状态克隆、hover克隆各有独立所有者。GLB在根部件移走前捕获资源引用，去重释放geometry/material/texture并关闭ImageBitmap；不会释放其他家族或仍使用的源资源。卸载先停机构tween，再撤装配与源资源；dispose可重复调用。故障安装回滚、晚到取消、共享资源只释放一次、活动tween teardown均有测试。

## 6. 同条件性能实测

本机macOS26.6.2、arm64；Chrome152.0.7977.83，经Playwright headless + ANGLE SwiftShader。DPR均为1，源CAM_Hero_FINAL、3:2 contain、同一开发`?debug=1`持续诊断采样。v0.5最终数据在其他浏览器测试及构建全部结束后单独采集，未使用并行阶段的较慢数值。[完整性能证据](validation/v05/performance/production-assets-browser.json)

| viewport / 实际canvas | draw calls v0.4.1→v0.5 | 三角面 v0.4.1→v0.5 | 帧间隔 v0.4.1→v0.5 |
| --- | --- | --- | --- |
| 1440×900 / 1080×720 | 72→84（**+12**） | 6,566→28,902 | 16.6656→25.9256ms（+9.2601ms） |
| 390×844 / 360×240 | 72→84（**+12**） | 6,566→28,902 | 16.6689→16.6689ms |

实测+12 calls低于约+30目标；新增18个primitives替换了6个旧primitives。渲染三角面替换前后差值22,336，因移除了原256个被替换三角面，所以不等于新增GLB总面数22,592。

`frameMs`来自现有调试器的帧间隔delta，**不是独立GPU或CPU渲染耗时**。软件WebGL的桌面持续采样约38.57fps，存在可见性能下降，不能声明为稳定60fps；390仿真canvas较小，约60fps不能推断真实手机性能。正常/生产仍为`frameloop="demand"`，静止后停止绘帧，动画/纹理变化时invalidate。真实GPU、真实手机和Safari未测试；没有全平台通过结论。

## 7. 最终验证

| 验证 | 结果 | 可追溯证据 |
| --- | --- | --- |
| `npm run verify:asset` | 361/361 | `validation/v05/verify-asset.log`、最终摘要 |
| TypeScript | 通过 | `validation/v05/typecheck.log` |
| `npm test` | **100/100**（原68 + 新32） | `validation/v05/unit-tests.log` |
| `npm run build` | 通过，Next生产静态构建 | `validation/v05/build.log` |
| 原基础浏览器 | 34/34 | [JSON](validation/v05/v03-regression/browser_validation.json) |
| 原九项交互浏览器 | 37/37 | [JSON](validation/v05/v04-regression/interaction_browser.json) |
| 钢琴专项开发 | 10/10 | [JSON](validation/v05/piano/piano-browser.json) |
| 原生产模式 | 7/7 | [JSON](validation/v05/production/production_smoke.json) |
| 钢琴专项生产 | 3/3 | [JSON](validation/v05/piano/piano-production.json) |
| 三资产专项开发 | 18/18 | [JSON](validation/v05/production-assets-browser.json) |
| 三资产专项生产 | 8/8 | [JSON](validation/v05/production-assets-production.json) |
| 独立性能与运行错误检查 | 3/3 | [JSON](validation/v05/performance/production-assets-browser.json) |

浏览器合计**120项通过、0失败**。最终生产测试使用本轮新构建及重启后的3001服务。默认和生产不暴露debugAPI/panel；生产桌面、触屏直接点击开发验明的新几何像素完成三资产聚焦/Back。正常会话无运行错误；故障测试产生的预期404/纹理解码错误单列。

完整交付哈希、各套件数量与性能汇总见[verification-summary.json](validation/v05/verification-summary.json)；命令结果另存为[command-results.txt](validation/v05/command-results.txt)，即使本机`.log`文件被Git全局忽略也保留摘要。

钢琴回归在桌面和390触屏上**未使用Explore objects完成重开**：收回→Back精确Hero→桌下可发现入口→点击/轻点抽出。展开后入口禁用、实体琴体可点、邻近桌/椅/地面负向命中、busy Back、reduced-motion和demand停止均通过。端点仍为`-1.9399999618530273`与`-1.2899999618530273`，行程0.65m。

一次开发钢琴跑测在源码热更新期间发生等待超时；代码稳定后整套10项及生产3项重新运行全部通过，最终证据采用完整重跑结果。源验证与原测试断言未被删弱。

## 8. 浏览器视觉交付与待确认事项

以下均为真实网页截图，无Blender渲染或AI概念图替代。已目视核对圆角/轮廓、显示方向、近景材质、MacBook开合、移动布局、无旧proxy重叠以及钢琴入口。

- [Hero全景](validation/v05/v05_hero.png)
- [Monitor聚焦](validation/v05/v05_monitor_focus.png)
- [MacBook全开](validation/v05/v05_macbook_open.png)、[动画中间截帧](validation/v05/v05_macbook_half.png)、[闭合](validation/v05/v05_macbook_closed.png)
- [Marshall聚焦](validation/v05/v05_marshall_focus.png)
- [钢琴桌下重新打开](validation/v05/v05_piano_reopen.png)
- [390px移动版](validation/v05/v05_mobile.png)
- [交互录像](validation/v05/v05_interactions.mp4)：38.60秒，1440×900，H.264，25fps，6,458,568字节；覆盖三件资产及钢琴收回后的桌下重开。

待用户确认：银色笔记本的厚度/倒角、Monitor边框与屏幕明暗、Marshall棕灰箱体和黄铜网罩的风格。本轮没有审美批准记录。Marshall聚焦视角中，原前景耳机灰盒遮住部分下网罩；本轮保持原布局，未擅自移动或制作耳机。键帽无字符、屏幕是占位内容；没有真实作品集、音乐服务或最终暖夜景。

## 9. 修改与复用

新增：三份`.blend`、三份GLB、`assets-source/`规格/PNG/测量/统计/UV记录、`scripts/assets/`生产及读回脚本、`lib/room/assets/`登记/校验/加载/屏幕/资源/诊断、两份资产单元测试、一份资产浏览器专项、`validation/v05/`证据、本文及[生产流程指南](ASSET_PIPELINE_GUIDE.md)。

修改：`RoomScene`接入分层加载/清理；`CameraController`提供提前teardown；`RoomApp/RoomCanvas`传递家族状态和回退提示；`DebugBridge/DebugPanel/debugHitTest`区分源与运行时诊断；`mechanisms/HoverHighlight/visibleHitPoints`绑定新表面并排除旧proxy；`globals.css`提供回退按钮；`package.json`增加构建/测试入口；lockfile仅项目版本；钢琴浏览器脚本仅支持证据输出目录；README与`.gitignore`更新（原始WebM录像中间文件不纳入版本交付）。

未修改：FINAL源文件/public副本、冻结清单、`interactiveObjects`语义定义、`focusViews`、`animationConstants`、`interactionState`、钢琴入口组件/状态规则与相机算法。下一批已获授权的资产可沿用本流程，前提是各自重新测量空间、定义活动部件、验证来源及真实浏览器预算；本轮没有启动v0.6。

实现对照项目安装版本，并查阅官方说明：[Three Object3D](https://threejs.org/docs/pages/Object3D.html)、[GLTFLoader资源处理](https://threejs.org/docs/pages/GLTFLoader.html)、[R3F按需渲染](https://raw.githubusercontent.com/pmndrs/react-three-fiber/master/docs/advanced/scaling-performance.mdx)。
