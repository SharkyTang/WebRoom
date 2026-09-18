# v0.6 实际进度核对与三条规划合并登记

审计日期：2026-09-18（Asia/Shanghai）  
工程：`/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room`  
依据：`/Users/shaoqitang/Downloads/Sharkys_Room_Unified_Execution_Order_2026-09-18.md` 第 8 节；其他章节及旧任务书仅作规划背景。

## 1. 结论与本次权限

**当前是 v0.6A 技术完成，v0.6B/C 正式资产尚未制作；A 的用户视觉确认仍无可核实记录。下一批唯一推荐任务是 v0.6B：剩余交互设备与桌面配件的正式资产生产及接入。** 不重做 A，不将 B/C 占位物和旧交互原型计为正式资产完成，不直接启动 v0.7 或 v0.8。

本次只读现状、执行已有非破坏性验证、新增本报告。没有修改产品源码、模型、依赖、lockfile、既有报告或测试脚本，没有生成资产、实现新功能、提交、推送或部署。未提交的 A 批工作继续保留。

开工 HEAD 为 `9cf802250b5823ef1b30fc7ab4f45d3265496ccc`（v0.5）。**当前有效审计基线是这个 HEAD 加上工作区内已有的 v0.6A 未提交成果，不能只 checkout HEAD 就声称恢复了 A。** 顶层 `../README.md` 还写 v0.4.1，是过时说明；项目 README、实际 manifest、装配和运行网页均已到 A。`package.json` 的 `0.6.0-a.0` 仅作辅助证据。

本次临时验证材料位于 `/private/tmp/sharkys-post-v06-audit-07n_t3t5/`（下文简称 `E/`）。历史材料继续使用项目内 `validation/v06a/`；两者没有相互覆盖。临时目录可能被系统清理，关键结论与检查范围已写入本报告。

## 2. A/B/C 完成状态：实现、技术、视觉分别登记

| 批次 | 已实现 | 技术验收 | 用户视觉确认 | 证据与判定 |
| --- | --- | --- | --- | --- |
| v0.5 三件基础资产 | Monitor、MacBook、Marshall 正式模型及屏幕/指示灯绑定已接入 | 有历史验收；本次继续核对实际加载和交互 | 现有记录中无独立审美批准证据，作为暂定风格基线 | `FINAL_ASSET_PIPELINE_REPORT.md`、`assetManifest.ts`、`*_pilot.blend/glb`；不列入 B 重建 |
| v0.6A 房间与家具 | 16 个正式家族，含 Blender 源、GLB、规格、材质及装配 | 历史技术验收完成；本次现状回归见第 6 节 | **待确认**；本次机器截图检查不等于用户确认 | `V06A_ROOM_FURNITURE_REPORT.md`、`V06_ASSET_STATUS.md`、`assets-source/v06a/` 与运行时证据一致 |
| v0.6B 剩余设备与配件 | **正式资产未开始**；已有冻结灰盒、部分原型动作 | 原型交互可验证，但 B 正式外观、屏幕隔离及模型集成尚未验收 | 无 B 正式资产可供视觉确认 | manifest 中无 B 家族，实际 GLB/可视层仍是冻结 proxy，网页截图对应；不以缺报告单独下结论 |
| v0.6C 收藏与装饰 | **正式资产未开始**；已有收藏边界占位、植物/灯具/狗等简化体 | 原空间与格室受保护，不代表 C 模型验收完成 | 无 C 正式资产可供视觉确认 | 10 个 `DSP_*_Bounds` 仍是灰盒；未登记 C 可视家族；狗窝已正式化，但狗本身未正式化 |

历史最终索引 `validation/v06a/verification-summary.json` 记录：361 项契约、133 单测、类型检查/构建通过，198 项浏览器检查通过，另有 12 次严格冷加载像素对照、20 轮钢琴循环。**这些是历史结果，不冒充本次全部重跑。** 本次实读并对照其中 16 个 A GLB 哈希、15 个受保护 Web 文件哈希，31/31 一致；当前回归另列第 6 节。

原路线图关于 v0.4.1 的“用户已确认实际操作正常”仅说明当时的钢琴交互，不能扩展为对 A/B/C 外观的确认。

## 3. 正式资产与重点物件

### 3.1 当前正式加载清单

登记入口为 `lib/room/assets/assetManifest.ts`。正式家族共 **19 个：旧三件 + A16**；不是 19 件 B/C 模型。网页先加载冻结 FINAL，再装配独立 GLB。

| 家族 | 实际网页文件（均在 `public/models/production/`） | 原锚点/绑定 |
| --- | --- | --- |
| monitor | `monitor_pilot.glb` | `TEC_MonitorBody`、`TEC_MonitorScreen`；独立显示面 |
| macbook | `macbook_pilot.glb` | `TEC_MacBookBase`、`TEC_MacBookScreen`；显示面继承旧铰链 |
| marshall | `marshall_pilot.glb` | `TEC_Marshall`；独立电源指示灯 |
| floor | `floor_v06a.glb` | `ENV_Floor` |
| walls | `walls_v06a.glb` | `ENV_Wall_Left/Right` |
| door | `door_v06a.glb` | `ENV_Door`、`DEC_DoorHandle` |
| window | `window_v06a.glb` | `ENV_WindowFrame`；独立原玻璃保留 |
| curtains | `curtains_v06a.glb` | `ENV_Curtain_Left/Right` |
| desk | `desk_v06a.glb` | `FUR_Desk`，含既有侧柜 |
| cabinet | `cabinet_v06a.glb` | `FUR_DisplayCabinet` |
| bed / bedside | `bed_v06a.glb` / `bedside_v06a.glb` | `FUR_Bed` / `FUR_BedsideTable` |
| sofa / chair | `sofa_v06a.glb` / `chair_v06a.glb` | `FUR_Sofa` / `FUR_OfficeChair` |
| coffee / sidetable | `coffee_v06a.glb` / `sidetable_v06a.glb` | `FUR_CoffeeTable` / `FUR_SideTable` |
| beanbag | `beanbag_v06a.glb` | `FUR_BeanBag` |
| rugs | `rugs_v06a.glb` | `DEC_Rug_Workstation/Lounge` |
| dogbed | `dogbed_v06a.glb` | 只替换 `DEC_DogBedProxy_Mesh`，保留同组狗 proxy |

与 GLB 配对的可编辑源在 `blender-assets/`；A 的每家规格与统计在 `assets-source/v06a/{family}/`。A16 共 2,375,692 B、55,444 三角面；加 FINAL 和旧三件，初始 GLB 文件共 3,906,872 B。文件字节含嵌入纹理，不等同网络传输字节或显存。

判断“真正加载”的证据要求：正常页面 `data-asset-*=installed`；只读诊断 `assembly.ok=true`、家族在 `installedFamilies` 中、各家族可视 mesh 数大于 0；旧 proxy 受抑制；截图可见正式家具，实际正式可见网格仍可按原语义命中。文件存在或成功回退不单独算正式资产加载成功。当前实测详情见第 6 节。

本次 `E/interactions/interaction_browser.json → observations.initial` 实际记录 **19/19 installed、0 fallback、assembly errors=[]、85 个原节点、241 个运行时节点、31 个旧 proxy mesh 受抑制**。19 个家族均有真实 VIS 网格，共 80 个：Monitor 4、MacBook 9、Marshall 5，A16 合计 62。收回截图 `E/piano/piano_retracted_hover.png` 和触屏重开截图 `E/piano/piano_mobile_reopen.png` 已人工查看，正式家具与 B/C 灰盒同时存在，与登记相符。

### 3.2 用户要求的逐物件核对

| 物件 | 当前可见资产与行为 | 批次/剩余工作 |
| --- | --- | --- |
| 电钢琴/抽拉部件 | `INT_Piano` 在 `INT_PianoRail` 下，仍是深色琴体/浅色面灰盒；0.65 m 抽拉与桌下重开已实现；没有可辨识的正式琴键模型 | B：琴体、键盘外观、可见抽拉部件；曲目专区另属 v0.8C |
| 键盘 | `TEC_Keyboard` 灰盒板块，没有正式逐键外观；不是第十个交互对象 | B；保持原位置和静态装饰职责 |
| 鼠标 | `TEC_Mouse` 简化椭球，未登记正式可视家族 | B；不新增功能 |
| iPad | `TEC_iPad` 外壳/屏幕灰盒材质已分开；可聚焦、屏幕激活、打开 Memories 占位与返回 | B：正式外壳与独立屏幕；相册内容属 v0.7 |
| Phone / 支架 | `TEC_Phone` 薄机身/屏幕 proxy，Contact 只有 GitHub/LinkedIn/Email 文本；原生成器只有机身和屏幕两盒，未见正式支架资产 | B：手机与支架；不新增语义 ID 或真实联系方式 |
| 垃圾桶 | `INT_TrashCanBody/Lid` 灰盒，盖子沿既有 pivot 开合；退出关盖，短彩蛋已有 | B：正式桶身/盖；彩蛋产品化属 v0.7B |
| 实体灯开关 | `INT_LightSwitch` 与 `DEC_LightSwitchPlate` 灰盒；物理拨动和三盏 practical lights 的统一开/关已有 | B：可视外壳；三组独立控制属 v0.8A |
| 耳机/架 | `TEC_Headphones` 仍是方形头梁、耳罩和底座合并 proxy，没有独立正式耳机/架家族；v0.5 报告已记录耳机在近景遮住部分网罩 | B；不能新增遮挡使 Marshall/Phone 入口失效，也不为露出整个网罩擅自搬动物件；底座 proxy 不等于正式耳机架完成 |
| 收藏品 | 10 个 Bounds 占位，不是正式收藏模型 | C，逐项格位登记见下表 |
| 植物、灯具、墙画、可乐、狗 | 5 个 `DEC_Plant_*`、`DEC_Lamp_Bedside/Lounge`、`DEC_WallArt` 仍简化；狗身体/头 proxy 保留；未见独立杯装可乐或书籍正式资产 | C；狗窝属于 A，不能据此宣称狗已完成；书籍/可乐需后续核对具体承托位置 |

收藏意图与当前命名的对应来自原路线图/任务书，名称不是当前模型已表达出该外形的证据：

| 后续收藏 | 当前槽位/证据 | 状态 |
| --- | --- | --- |
| Eiffel Tower | `DSP_EiffelTower_Bounds` | 占位 |
| Millennium Falcon | `DSP_Falcon_Bounds` | 占位 |
| Hogwarts | `DSP_Castle_Bounds` | 占位 |
| Tower Bridge | `DSP_Bridge_Bounds` | 占位，保留桥的既定意图 |
| SLS | `DSP_TallRocket_Bounds` | 占位，具体造型待 C |
| Ferrari F1 | `DSP_Vehicle_Bounds` | 按原规划登记的目标，未完成模型 |
| Mercedes-AMG F1 | `DSP_MercedesAMGF1_Bounds` | 占位 |
| 其余大建筑/中小收藏 | `DSP_Architecture_Bounds`、`DSP_MediumModel_Bounds`、`DSP_SmallModel_Bounds` | 占位，具体清单与尺寸待 C |
| Minas Tirith | 无同名专属已确认槽位 | 单独保留需求；C 中先验证现有槽位的统一缩放/替换选项，不默认与 Hogwarts 共格，不扩柜 |

## 4. 钢琴重开、公共入口与内容面板

### 4.1 钢琴与返回的实际语义

- 冻结 Hero 初始钢琴是展开的；store 的初始字面值虽写 retracted，但运行时 `attach()` 立即同步实际机构状态为 extended。不能把初始化常量误判为初次网页已收回。
- 初次聚焦钢琴先收再展开；随后聚焦/切换遵循现有 toggle 行为。**Back 只退回 Hero，不自动收琴。** 已收回状态在 Back 后保留。
- 收回后，`PianoRetractedHitArea` 成为与冻结模型同层的 Web 点击辅助；位置 `[-0.65, 0.52, -1.35]`，尺寸 `[1.5, 0.32, 0.4]`。它通过同一语义表解析为 `piano`，不靠新增 GLB 节点或 mesh 序号。
- 辅助区只在收回且可操作时启用，移动/返回等待中停用；鼠标悬停为 `Pull-out Piano`，展开实体为 `Put away Piano`。触屏不用 hover；Explore objects 与 Toggle piano 仍可用。
- `cameraAnimation.ts` 保存初始 Hero 的位置/四元数/投影，返回结束精确赋值；`interactionState.ts` 串行处理相机与机构，忙时 Back 排队。现状是回到固定原 Hero，并未实现任意用户轨道视角的恢复。

源码证据：`lib/room/pianoInteraction.ts`、`components/room/PianoRetractedHitArea.tsx`、`lib/room/interactiveObjects.ts`、`lib/room/mechanisms.ts`、`lib/room/interactionState.ts`、`lib/room/cameraAnimation.ts`。本次钢琴专项 10/10 通过，包含桌面 4 轮桌下重开、390×844 触屏仿真、减少动态效果、端点/相机准确性、负向遮挡及普通/调试隐藏画布严格一致。

### 4.2 现有共享实现与可复用边界

| 位置 | 已有能力 | 后续边界 |
| --- | --- | --- |
| `app/page.tsx` → `RoomApp.tsx` | 单页应用；每个 RoomApp 一个 store；`useSyncExternalStore` 订阅；没有四套独立网站 | 延续同一房间实例与内容来源 |
| `interactiveObjects.ts` / `InteractionManager.tsx` | 九项 ID、14 个原语义节点、9 targets；可见 mesh 沿祖先解析语义；原生点击/触屏共用 | 新 VIS 必须归属原锚点，不依赖数组序号，不给键鼠等加交互 ID |
| `RoomApp.tsx` | Explore objects、全局 ESC；退出后焦点回到选择器 | 现有选择器在未 ready/有活动对象时禁用；WebGL 失败时不能替代独立 HTML 内容路径 |
| `InteractionOverlay.tsx` | 公共 aside、标题、Back、忙碌/返回/错误提示；进入将焦点放在 Back | 现有是原型公共壳，非完整 v0.7B；无项目列表/详情层级、内容加载/空/失败模型；返回焦点是统一选择器而非原触发元素 |
| `app/globals.css` | 3:2 contain；桌面侧面板、≤600 px 底部面板；可见焦点、Back 最小高度 | 需在 v0.7B 产品化长内容、手机操作与 WebGL 不可用回退，不重复造退出机制 |
| `focusViews.ts` / `CameraController.tsx` / `cameraAnimation.ts` | 九个 focus 视角，GSAP 单通道，保持桌面 48mm Hero，精确返回 | 模型阶段保护布局、Hero、focus 与机械端点 |
| `assetManifest.ts` / `loadProductionAssets.ts` / `assetAssembly.ts` | FINAL 先校验，家族并行下载、完整后原子安装，旧 proxy 抑制，独立 stateSurface，失败按家族回退 | 沿用 Blender → GLB → 原锚点流程；不重新生成整屋，不引入新管线 |
| `resourceOwnership.ts` / `assetDiagnostics.ts` | 资源释放与撤销装配、纹理/网格/绑定诊断 | 保留取消/重载安全性；不以重复纹理文件名推断 GPU 共享 |

设备内容现状：Monitor = Projects 占位；MacBook = About / Education 标题和开盖状态；iPad = Memories 占位；Phone = 联系渠道名，无真实链接；Trash Can = `Deleted ideas live here.`。`screenTextures.ts` 只支持 Monitor/MacBook CanvasTexture 标题与预览卡片，且文字仍是占位；没有维护真实项目/履历/相册/联系方式的内容数据层。

因此可以说**已有供 v0.7/v0.8 复用的原型基础**，不能说这两个版本已交付，也不应删除这些代码再建一套系统。特别是 iPad/Phone 正式屏幕接入时，除独立显示节点外，还要限定扩展目前仅接收 `monitor | macbook` 的屏幕类型和绑定，不能只加模型就假定完整复用已成立。

### 4.3 灯、环境和音频的现状

| 项目 | 已有事实 | 后续复用与缺口 |
| --- | --- | --- |
| 共享状态 | `interactionState.ts` 有 `lightsState`、`marshallPower`、`time`、`weather`，集中在当前 store | 适合沿现有订阅/动作入口扩展；状态仅当前挂载期保持，reload/重新 attach 重置，无持久化实现 |
| 三组灯身份 | `animationConstants.ts` 有 `LGT_CabinetProxy`、`LGT_DeskProxy`、`LGT_BedProxy`；冻结 GLB 是三盏独立 point light | 有稳定身份可复用；不能把“已有三盏灯”写成“已有三组独立状态” |
| 当前灯开关 | `mechanisms.ts` 通过单一 on/off 同时 tween 三盏强度及实体拨片；只写 practical lights | **已有总控原型，没有独立组开关或混合态。** 环境基光、窗光、屏幕/指示灯不被一起清零 |
| 灯具可视外壳 | 冻结场景有床边/休闲区灯壳 proxy，A 静态家族 `stateSurface=null` | C 应保留可定位的外壳/材质，并明确和 Desk/Bed/Cabinet 的对应；不能仅凭外壳名字假定已完成三组材质绑定，也不擅增第四组 |
| 时间/天气 | Time 0–24，步进 0.25 小时；Sunny/Cloudy/Overcast/Rainy/Snowy 已有选择状态 | 当前仅改值与文字；没有昼夜色光过渡、雨雪渲染。v0.8A/B 应接入同一环境状态，不能互相覆写灯组 |
| Marshall | `marshallPower` 和独立小灯反馈；首次进入开机，Back 后保留电源，UI 明示无音频 | Power 不等于真实 playing；不能复用该布尔量冒充播放状态 |
| Piano 音乐入口 | `pianoState` 与 Piano 面板/语义入口已有 | 只有机构；没有曲目、播放器、音量、音源或音乐区内容 |
| 共用音频底层 | 对 app/components/lib 与 public 的检索未见 Audio/AudioContext/音频资源或曲目数据实现 | v0.8C 需要在现有应用中新增共享音频能力；沿用入口与状态订阅，不另建房间/返回系统。本次不创建接口或虚假播放反馈 |

灯光实施时再固定总控恢复、混合态与时间/手动优先规则，避免保存互相矛盾的第四份总开关状态。音频实施时再固定来源、曲目、真实播放/暂停、音量与错误，并区分关面板、收琴、停止、换来源；两类主音乐互斥是合并建议，仍需在该批行为约定中明确，不宣称已实现。

## 5. 三条规划的范围差异登记（只规划）

原路线图参考：Downloads 中实际存在的 `Sharkys_Room_Roadmap_v0.4.1_to_v1.0.md`，重点第 4–6、12 节；原资产任务书 `Sharkys_Room_v0.6_Full_Room_Asset_Production_Codex_Prompt.md`。未将文件名 `(2)` 视为必须条件；没有以未取得的旧 Post_v0.6 全文推定额外授权或 P 阶段映射。

| 需求 | 原范围 | 本次明确登记的最新方向 | 归属 |
| --- | --- | --- | --- |
| 钢琴曲专区 | 以抽拉与再次发现为最低范围，无弹奏要求 | 增加曲目入口；不是 88 键可弹奏/MIDI/录音/学琴系统 | 模型/抽拉 v0.6B；音乐 v0.8C |
| Marshall | 主动播放/暂停/音量/关闭 | 非钢琴音乐的主播放器，与钢琴共用音频底层 | v0.8C |
| 独立灯与总控 | 室内灯组切换；每灯单控原列发布后 | 书桌、床边、展示柜三组独立灯 + 总开关，纳入本轮路线 | 灯壳 C；真实状态与昼夜联调 v0.8A |
| 音乐来源 | 可公开使用的首发音频，不依赖流媒体账号 | 内置音乐保证基础体验；音乐平台仅可选增强，网易云为用户偏好 | v0.8C；平台可用性/素材公开使用范围届时核对 |

以下没有自动升级为首发硬要求：分组亮度编辑、复杂灯光编辑器、自动/手动策略的某个具体方案、本地音频导入、迷你播放条、流媒体账号登录。总控/播放策略需要定义，不代表旧提示词中的任一细节已批准。

网易云本地下载文件不自动等同可浏览器解码或可公开托管的音频。本次不上传音频，不接平台，不处理受保护下载格式。

保留执行骨架：**必要 v0.6 资产收尾（当前先 B，再按实际结果安排 C）→ v0.7A 内容数据 → v0.7B 公共 UI 与四设备页面 → v0.8A 昼夜/三灯组 → v0.8B 天气 → v0.8C 共用音频 → v0.9 整体验收。**

v0.7B 的内部顺序：公共面板/标题/返回/ESC/焦点/内容状态与移动行为 → Monitor 列表/详情完整闭环 → MacBook → iPad → Phone → Trash Can 彩蛋 → 桌面/触屏/键盘/非 3D 路径回归。这是同一版本内的子任务顺序，不新增并行版本或四套网站。缺少真实内容应列清单，不编造个人经历、项目状态、照片授权或联系地址。

## 6. 已运行检查、结果与未测边界

本次直接运行当前工作区已有测试，浏览器结果通过 `ROOM_TEST_OUTPUT` 写入 E/。构建在 E/build-copy/sharkys-room 的隔离副本中运行：复制当前 app/components/lib/public/config/lockfile，复用当前已安装依赖的文件，不执行 install；Next 生成文件与构建缓存仅写入副本。生产预览使用该新构建的 `127.0.0.1:3002`，开发复测使用已核实 cwd 的原 `127.0.0.1:3000`。

| 本次检查 | 结果 | 证据 |
| --- | --- | --- |
| `npm run verify:asset` | 361 通过，0 失败 | `E/verify-asset.log` |
| `npm test` | 133 通过，0 失败；含真实导出几何、钢琴轨道/净空、装配与状态契约 | `E/unit-tests.log` |
| `npm run typecheck -- --incremental false` | 退出 0；避免写工作区 tsbuildinfo | `E/typecheck.log` |
| 隔离副本 `npm run build` | Next 16.3.5 / Turbopack 生产构建通过，退出 0 | `E/build.log` |
| `ROOM_PIANO_CYCLES=4 npm run test:piano` | 10 通过，0 失败 | `E/piano/piano-browser.json`、`E/piano-retry.log` |
| `npm run test:interactions` | 37 通过，0 失败；九项原生可见命中、返回/ESC、灯与环境状态、触屏、选择器与焦点恢复 | `E/interactions/interaction_browser.json` |
| `ROOM_TEST_VIDEO=0 npm run test:furniture` | 50 通过，0 失败；1440×900 / 768×1024 / 390×844 的 A16+旧三件装配、可见命中与返回；16 家族逐一 404、floor/bed 坏图片、刷新恢复及加载取消/重载 | `E/furniture/furniture-browser.json` |
| `ROOM_TEST_PRODUCTION=1 npm run test:furniture`（URL 指向 3002，开发证据指定为本次 JSON） | 24 通过，0 失败；新生产构建中桌面/触屏十九家族加载、九项设备真实点击/Back、桌下重开；不暴露 debug API | `E/furniture-production/furniture-production.json` |
| 历史索引哈希与当前实物对照 | 16 个 A GLB + 15 个受保护 Web 文件，31/31 相同 | `validation/v06a/verification-summary.json` 与当前文件 SHA-256 |

**本次四套浏览器检查合计 121 通过、0 失败；契约 361、单测 133、类型和构建均通过。** 生产专项明确设置 `ROOM_TEST_URL=http://127.0.0.1:3002`、`ROOM_FURNITURE_DEV_EVIDENCE` 指向 `E/furniture/furniture-browser.json`，没有借用旧生产包或旧采点。正常会话没有关键浏览器错误；故障注入的预期 404/坏图日志单独保留，回退通过只证明恢复能力。钢琴生产路径由本次家具生产专项覆盖，未另跑 `test:piano` 的 production 模式。

完整性核对：开工记录了 982 个已有文件的 SHA-256（排除 `.git`、`node_modules`、`.next`、tsbuildinfo 等安装/运行缓存）。其中 **981 个保持一致、0 个删除**；唯一额外变化是顶层 `.DS_Store` 元数据，来源未归因，本轮没有编辑或覆盖恢复它。产品源码、全部模型、package/lockfile、既有测试/文档/验收证据均保持一致。原先 16 项已修改文件、549 项未跟踪文件的 Git 状态条目全部保留，暂存区完全相同；Git 状态只新增本报告一项。证据：`E/before-hashes.json`、`E/before-git-status.txt`、`E/before-index.txt`、`E/integrity-final.json`。

本次启动的临时生产服务已经停止；原有 3000 开发服务保留。除本报告外，没有在工程目录新增测试证据或验证脚本。

当前环境实读：macOS 26.6.2、Node 26.0.0、已安装 Chrome 153.0.8010.48 headless、ANGLE SwiftShader、DPR 1。历史 A 报告使用 Chrome 152.0.7977.83，不将两个环境的性能混算。鼠标/触屏及 ESC/滑块按键通过浏览器输入，诊断只读；选择器专项使用 `selectOption` 并检查 Back 后焦点，未做全站纯 Tab/Enter 遍历。触屏是 390×844 仿真，不是真机。首轮 Chrome 启动被沙盒终止（SIGABRT/EPERM）；临时生产端口首轮 listen EPERM，均经权限流程重试。前者没有执行到应用断言，后者没有成功启动服务；不计作产品失败。

本次未重新执行 Blender 建模/导出、资产生成、原历史 20 轮钢琴与 12 次独立冷加载全量重复、独占性能专项、Safari/Firefox、实体手机、硬件 GPU/远程弱网性能、屏幕阅读器完整审计或互联网部署验证。未实现的内容、昼夜/天气、分组灯与音乐不要求“提前通过”。截图仅为本次观察，用户视觉验收仍待本人确认。

本次已查看 `E/furniture/hero_after.png`、`focus_phone.png`、`focus_ipad.png` 及前述钢琴截图：正式 A 材质/旧三件与灰盒 B/C 的区分清楚；Phone/iPad 面板仍是原型，返回按钮可见。没有用这些截图替代用户审美批准。家具专项本次关闭录屏，仅生成现有脚本的截图/JSON；历史录屏保留原位。

## 7. 阻断与可后置事项

| 分类 | 当前判断 | 处理归属 |
| --- | --- | --- |
| 现有功能的运行阻断 | 本次覆盖内未发现构建失败、无法返回、钢琴桌下入口失效、重要节点破坏或正式家族无法加载 | **没有需要插在 B 前的最小修复批次**；不据此承诺未测平台无问题 |
| v0.6 整版完成的阻断 | B 关键设备仍为灰盒，C 收藏/装饰未完成，不能把整版记作验收完成 | 下一批 B；B 后安排必要 C，避免整版重做 |
| 用户视觉确认缺口 | A 木材色调、软包比例、窗帘褶皱、整体材质密度仍待确认 | 下批启动时登记采用的风格基线；如有具体否定项再限定处理，不虚构已确认 |
| C 特定范围待决 | Minas Tirith 槽位未确认；书籍/杯装可乐具体资产未登记 | 留到 C 处理，不阻断 B，也不静默删掉 |
| 性能风险 | 历史软件渲染 Hero 帧间隔桌面 26.71→50.70 ms、移动仿真 16.67→35.69 ms；calls 84→121 | 这是历史观察，不能说无性能回退或承诺真实设备 60 FPS；B 逐批控量、实测增量，硬件目标验证留待后续 |
| 可后置润色 | 轻微材质色调/缝线/装饰细节、基础光偏平、原型标题与面板 | 非明确关键缺陷不反复重做 A；UI 归 v0.7，最终光照归 v0.8A |
| 资料一致性 | 顶层 README 仍停 v0.4.1、旧路线图勾选是历史状态 | 本报告登记现状；以后文档维护再同步，本次不改旧文件 |

钢琴“首次先收再展开”、MacBook“首次先关再开”是当前原型既定行为，原路线图已安排 v0.7B 产品化；本轮不误报为需要立即修改机构的阻断。

## 8. 下一批唯一推荐任务与停止点

**任务：v0.6B 剩余交互设备与桌面配件正式资产生产、接入和验收。当前仅推荐，未开始。**

允许的后续修改范围（需要下一批明确授权后才生效）：

1. iPad、Phone/支架、电钢琴/可见抽拉部件、垃圾桶、实体开关、键盘、鼠标、耳机/架的可编辑 Blender 源、GLB、纹理、规格与统计。
2. `lib/room/assets/` 内 B 家族登记、必要装配和屏幕绑定扩展；`scripts/assets/` 内对应 B 生成/校验；相关测试、资产预算与 B 验收报告。只做接入上述资产所必需的兼容改动，不借机大改状态或 UI。
3. 开工先保存包含**当前未提交 A** 的可回退基线，记录沿用的 A/旧三件风格确认状态，复核正式模型加载和钢琴基线。

必须保护：冻结 FINAL 及原 85 节点、九项语义/targets、布局/家具包络/格室、桌面 Hero 与现有 focus、机械 pivot 与 0.65 m 行程、约 16 mm 桌下净空、Back/ESC/合理焦点、桌下再次打开和辅助选择器、旧三件正式资产及 A16。按实际几何验证净空，不能靠移动桌椅或扩大交互区遮掩穿模。不得更换框架、依赖、lockfile 或模型生产管线。

B 的验收必须覆盖：新可见表面仍映射同一语义；iPad/Phone 屏幕与外壳独立；钢琴展开/半收/收回无干涉，鼠标/触屏下“收回 → Back → 桌下重开”通过；垃圾桶盖/拨片继承原轴心；九项进入、Back/ESC 与 Hero 恢复；辅助入口、资源失败完整回退/重试；构建/类型/关键单测；同条件载荷、draw calls 与动画性能增量。技术通过和用户视觉确认分开记录。

停止点：交付 `V06B_INTERACTIVE_ASSETS_REPORT.md`、逐资产证据、关键路径截图/录屏和预算；列出待视觉确认项后停止。**不得顺带制作 C 收藏、v0.7 真实设备页面、v0.8 灯光/音乐；也不得把本报告当作实施授权。**

本次第 8 节审计与规划登记完成，到此停止。
