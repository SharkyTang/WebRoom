# Sharky's Room — v0.4 Interaction Prototype

**SHARKY'S ROOM — v0.4 INTERACTION PROTOTYPE COMPLETE**

验收日期：2026-09-17。本轮在现有 `sharkys-room/` 内实现，没有创建第二个 Next.js 项目。

## 1. 交付与范围

9 个语义交互均围绕冻结 FINAL GLB 的既有节点实现。源 `.blend`、GLB、几何、parent hierarchy、origins/pivots、targets 和源 Hero Camera 未改。机械姿态仅在运行时按约定变化。

保留 v0.3：直接 GLB 加载、14 required nodes、9 targets、冻结快照校验、加载／错误提示、3:2 contain、鼠标／触屏射线识别、按需渲染、生产模式与开发诊断边界。

成果包括源码、更新 README、本报告、`validation/v04/` 中的测试证据和截图。没有制作正式模型、PBR、天气画面、音乐／外部服务、后端或最终作品集内容，没有公开部署。

## 2. 依赖

新增 **GSAP 3.15.0**，相机、机构和电源过渡共用此动画系统。其余主依赖保持 v0.3：Next.js 16.3.5、React / React DOM 19.2.8、R3F 9.7.0、Drei 10.7.8、Three.js 0.186.0、TypeScript 5.9.3。`package-lock.json` 已同步，安装与 audit 成功（0 vulnerabilities）。

通过 GSAP `onUpdate` 更新运行时值并 invalidate R3F，在取消／卸载时 kill tween 并结束 pending Promise；用法参考 [GSAP 官方文档](https://gsap.com/docs/v3/GSAP/gsap.to/)。

## 3. 集中状态与互斥

`lib/room/interactionState.ts` 通过一个外部 store 和 React `useSyncExternalStore` 管理：

```text
idle / hovering → focusing → interacting → focused
                         ↑                    ↓
                         └── 同物件控制切换 ────┘
focused → returning（先关闭需要复位的机构）→ idle
```

字段包含 `activeObject`、`hoveredObject`、`interactionPhase`、`isCameraBusy`、全部机械状态、灯／电源、time、weather、reducedMotion 与 returnRequested。

- 首个 activation 同步占有 activeObject，快速点击不会启动第二次相机飞行。
- focused 时只接受当前物件的明确控制；进入其他物件须先 Back。
- 机械动作期间忽略冲突点击。Back／ESC 可排队，当前动作完成后关闭需要复位的机构，再回 Hero。
- 运行时 attach 使用 generation 标记；旧 Promise 在卸载／替换后不能回写新状态。
- 各控制器清理 tween、订阅、材质克隆与监听；没有按动画帧更新 React state。

`CameraController` 连接 scene 与 store；UI 在 `InteractionOverlay`，机构集中于 `mechanisms.ts`，避免把逻辑堆入 RoomApp。

## 4. 相机架构与精确返回

保留 v0.3 的 `HeroCamera` 渲染副本，源 `CAM_Hero_FINAL` 不变。相机副本标记 manual，锁定 3:2 projection；保存 position、quaternion、FOV、aspect、near、far、zoom。

`cameraAnimation.ts` 统一使用位置 lerp 与 quaternion slerp。所有 focus 基于实际加载的 `TGT_*` world position，加集中偏移；不重复做 Blender→glTF 转换。结束时显式赋值到目标，返回时逐项复制保存的 Hero，消除累积误差。

常规 focus / return 均 **1.1s，sine.inOut**；减少动态效果为 **0.08s**。无 OrbitControls、WASD 或自由滚轮相机。

真实 GLB 检查覆盖：9 个 focus 的中心射线命中、相机中心路径无 mesh 穿越、near 距离保护，以及反复返回的精确相机值。浏览器另用真实 Back／ESC 对比精确 endpoints。路径检查不是完整连续 near-plane 碰撞求解；实际截图也复核了可见构图。

## 5. 集中 focus 配置

单位：米，Three/glTF Y-up。`position = TGT world + offset`；`lookAt = TGT world + lookOffset`。冻结 target 本身不动。

| ID | offset XYZ | lookOffset XYZ | 构图用途 |
| --- | --- | --- | --- |
| monitor | (0.15, 0.32, 2.05) | (0, 0, 0) | 工作站正面，读清屏幕 |
| macbook | (0.25, 0.48, 1.05) | (0, -0.06, 0) | 俯看屏幕与底座；全顶点入画检查 |
| ipad | (0.4, 1, 0.9) | (0, 0, 0) | 茶几斜上方 |
| marshall | (0.35, 0.35, 1.1) | (0, 0, 0) | 音箱右前方 |
| piano | (0.9, 0.7, 1.6) | (0, 0, -0.2) | 留出轨道抽拉区域 |
| trashcan | (0.2, 0.68, 1.15) | (0, -0.1, 0) | 桌床之间斜上方 |
| lightswitch | (0.9, 0.18, 0.35) | (0, 0, 0) | 从室内面向左墙 |
| phone | (0.24, 0.36, 0.82) | (0, 0, 0) | 桌面上方近景 |
| window | (0.45, 0.3, 3.8) | (0, 0, 0) | 窗户局部近景与环境面板 |

以上为人工可审查的统一配置，保存在 `focusViews.ts`。MacBook 的目视复核发现基座下缘紧贴底边，因此仅微调 lookOffset；相机位置与运动路径不变。手机共用这些偏移和 3:2 画幅，不移动家具。

## 6. 9 项交互与退出策略

| 物件 | 进入／控制 | Back 后 |
| --- | --- | --- |
| Monitor | 聚焦、独立屏幕材质激活、Projects 占位 | 屏幕还原、Hero |
| MacBook | 聚焦、local X 铰链打开、About / Education | 屏幕还原、关闭再 Hero |
| iPad | 聚焦、屏幕激活、Memories | 屏幕还原、Hero |
| Marshall | 首次 ON；原生 Power 按钮 On / Off | 电源持久；明确关掉后再次进入仍 Off |
| Piano | 首次演示抽出，随后 rail 绝对端点切换 | 保留当前抽拉状态 |
| Trash Can | 聚焦、开盖、Deleted ideas live here. | 关盖再 Hero |
| Light Switch | 聚焦、物理开关与 practical 灯切换 | 保留灯和开关状态 |
| Phone | 聚焦、屏幕激活、Contact / GitHub / LinkedIn / Email | 屏幕还原、Hero；无外链跳转 |
| Window | 聚焦、Time 与五天气按钮 | 环境状态持久；画面不随天气改变 |

**初始姿态的处理：**实际 FINAL GLB 已把 MacBook 打开、Piano 抽出。首次 Hero 原样保留，不偷偷覆盖 source 姿态。首次 MacBook 聚焦后可见地 close→open；首次 Piano 聚焦后可见地 retract→extend。之后按真实状态切换。MacBook 退出关闭，因此后续 Hero 中的机械姿态与初次略有不同；Hero 相机始终精确恢复。

## 7. 精确机械端点

所有数值来自实际加载的 Three.js 对象；保留原 origin、parent、scale。动画末尾显式复制端点，不使用增量累加。

| 机构 | 被修改节点／轴 | 端点 |
| --- | --- | --- |
| MacBook | TEC_MacBookScreen / local X quaternion | closed identity；open X = **-1.8325958201049857 rad**（源约 -105°） |
| Piano | INT_PianoRail / local position.z | retracted **-1.9399999618530273**；extended **-1.2899999618530273**；差 **+0.65m** |
| Trash | INT_TrashCanLid / local X quaternion | closed identity；open **-1.7453292519943295 rad**（-100°） |
| Switch | INT_LightSwitch / local Z quaternion | ON **+0.13962636763260744 rad**；OFF **-0.13962636763260744 rad**（约 ±8°） |

MacBook open quaternion 原值 `[-0.7933533787727356, 0, 0, 0.6087614297866821]`。Switch ON 原值 `[0, 0, 0.06975648552179337, 0.9975640773773193]`。关闭铰链 quaternion 为 `[0,0,0,1]`。

Piano 的 X/Y 固定 `(-0.6499999761581421, 0.6000000238418579)`，只 tween rail Z；`INT_Piano` 仍是 rail 的 child，未改 child transform。冻结约 16mm 桌下净距沿既有 0.65m 轨道保持，未创建新机构。Blender Y 方向已转为 glTF -Z，故抽出为 +Z；Switch 的 Blender Y 轴对应这里的 Z 轴，符号按加载值确定。

普通机械时长：hinge 0.55s、piano 0.65s、switch 0.2s、power 0.2s，统一 power2.inOut。重复 20 轮抽拉与实际 tween 测试无端点漂移。dispose 恢复四机构创建时的原始 TRS。

精确快照：[runtime_contract.json](validation/v04/runtime_contract.json)。

## 8. 灯光与屏幕／材质隔离

开关只控制以下 three lights 的运行时 intensity（已沿用 v0.3 ÷683 换算）：

| Light name | ON intensity | OFF |
| --- | --- | --- |
| LGT_CabinetProxy | 5.172535650486599 | 0 |
| LGT_DeskProxy | 0.716197243913529 | 0 |
| LGT_BedProxy | 0.954929658551372 | 0 |

`LGT_Ambient=1`、`LGT_WindowKey=15.915494309189532`、Web hemisphere fill=1.6 保持不变。关闭 practical 后房间仍可读、可导航；不制作最终夜景。

Monitor / MacBook / iPad / Phone 仅克隆各自 screen proxy 材质，调整 emissiveIntensity，退出恢复原材质引用并 dispose 克隆。Marshall 单独拥有电源材质克隆。Hover 只在未聚焦时临时克隆高亮，离开立即恢复，不把共享材质改成所有物体同时发光。

机制测试证明 practical 切换不改 base lights 或 screen 值；浏览器也检查了 Lights Off 后仍能进入并激活屏幕。

## 9. Window 状态 API

`InteractionState.time: number`，范围 **0–24**；native range input 以 0.25h（15 分钟）步长输入，显示 `00:00` 到 `24:00`。store 接受有限数值并限制范围。

`InteractionState.weather` 只接受 **Sunny / Cloudy / Overcast / Rainy / Snowy**。`setTime` / `setWeather` 只在 Window focused 时生效，返回后持久保存。

这些字段是后续视觉系统可消费的状态，本轮只更新 state 与文本。不驱动 shader、天空、雨雪、外景或昼夜灯光。

## 10. 桌面、移动与可访问入口

保留真实 GLB raycast，无永久热点标签。桌面 hover 显示 pointer、临时轻高亮和页脚物件名；触屏不依赖 hover。

所有九项另有原生 HTML `Explore objects` 选择器。这样 Phone / Switch 的手指操作不依赖几像素几何，收回后被遮挡的钢琴也可再次打开。**没有添加隐形 Mesh 或扩大重叠 hit proxy**；选择器是明确的同语义入口，真实场景点击保持原有遮挡关系。

聚焦面板包含语义 `<button>` Back；ESC 为附加路径。手机 Back 在视口内且至少 44px 高。按钮、slider、weather 和选择器可键盘操作，返回后焦点回到选择器；未把键盘焦点困在 Canvas。

390×844 延续 3:2 contain 与上下留白，面板在下方；桌面面板在右上。场景几何未为移动端重排。

## 11. Reduced motion、性能与清理

监听 `prefers-reduced-motion` 及其变化。减少动态效果时相机缩为 80ms，机构与 power 立即落到精确端点，交互、Back 和 UI 状态全部保留。

普通模式仍为 R3F `frameloop="demand"`。GSAP 动画每次更新才 invalidate，最后一帧精确赋值后停止；无后处理、持续全局 React frame state 或额外动画系统。

开发 `?debug=1` 保留 v0.3 FPS 采样；`?debug=1&demand=1` 提供只读帧计数以验证按需模式。生产不暴露 API。订阅仅在交互枚举状态改变时更新 React；动画细节保持 Three.js mutable values。

## 12. 测试与构建

本轮测试保留原有覆盖，增加真实 GLB 相机／机构／状态机及实际浏览器输入：

- **62 / 62 单元与契约测试**：原 37 项，加相机 6 项、机构 10 项、状态机 9 项。
- `verify:asset`：361 项通过，public GLB 与 FINAL 逐字节一致。
- TypeScript：通过。
- `npm run build`：成功；首页、not-found、图标静态生成。
- 浏览器最终统计见下一节及对应 JSON。

关键覆盖：精确 Hero 返回；全部机械绝对端点；Piano 反复抽拉；三 practical 灯开关；Marshall Off 持久；Time 边界与五天气；快速重复点击；busy 时 Back 排队；ESC；mobile tap / Back；键盘选择器；非交互物体无误触；reduced motion；取消清理；demand 停止绘帧。

原 v0.3 浏览器测试保留 required nodes、语义、resize、加载／404／缺节点、默认诊断边界及无错误等检查。由于 v0.4 点击会移动镜头，每次选择后增加 Back；生产固定相机检查仍验证未选择状态下 drag/wheel/WASD 无自由探索。这些是阶段行为所需适配，没有删减覆盖。

证据：

- [unit_tests.txt](validation/v04/unit_tests.txt)
- [typecheck.txt](validation/v04/typecheck.txt)
- [production_build.txt](validation/v04/production_build.txt)
- [asset_verification.txt](validation/v04/asset_verification.txt)
- [frozen_source_integrity.json](validation/v04/frozen_source_integrity.json)

## 13. 浏览器与移动验证

**78 / 78 浏览器检查通过，0 失败：**

| 验收套件 | 结果 | 证据 |
| --- | --- | --- |
| v0.3 原有浏览器回归 | 34 / 34 | [browser_validation.json](validation/v04/v03-regression/browser_validation.json) |
| v0.4 交互 | 37 / 37 | [interaction_browser.json](validation/v04/interaction_browser.json) |
| 生产模式（原 5 项 + 新 2 项） | 7 / 7 | [production_smoke.json](validation/v04/production/production_smoke.json) |

普通交互流程中 **0 critical console error、0 pageerror、0 failed asset**。详细逐项清单见 [INTERACTION_BROWSER_VALIDATION.md](validation/v04/INTERACTION_BROWSER_VALIDATION.md)。

Demand 实测：idle 帧计数 **2→2**，focus 动画推进到 **24**，focused idle **24→24**，返回 Hero 到 **45** 后停止增长。手机 Back 实测 **74×44 px**，9 项真实触屏点击／返回全部通过。

使用本机 Google Chrome + Playwright，真实 mouse、touchscreen、keyboard 和 HTML 控件；只读 debug API 用来观察状态／端点，没有调用 store setter 来冒充用户操作。

测试环境使用 ANGLE SwiftShader 软件 WebGL。移动验证为 390×844 触屏仿真；保留 v0.3 的 1920×1080、1440×900、1280×720、768×1024、390×844 适配检查。没有声称在真实手机硬件、Safari 或 Firefox 完成验收。

初始九项使用实际可见几何点点击／轻点。后续钢琴收回导致遮挡时，重复压力测试走用户可用的原生选择器，仍以真实鼠标／键盘输入驱动。

## 14. 截图

| 画面 | 文件 |
| --- | --- |
| Hero | [v04_hero.png](validation/v04/v04_hero.png) |
| Monitor focus | [v04_monitor_focus.png](validation/v04/v04_monitor_focus.png) |
| MacBook open | [v04_macbook_open.png](validation/v04/v04_macbook_open.png) |
| Piano extended | [v04_piano_extended.png](validation/v04/v04_piano_extended.png) |
| Lights Off | [v04_lights_off.png](validation/v04/v04_lights_off.png) |
| Window panel | [v04_window_panel.png](validation/v04/v04_window_panel.png) |
| Mobile focus | [v04_mobile_focus.png](validation/v04/v04_mobile_focus.png) |

这些是实际浏览器截图，不是生成的概念图。

## 15. 已知视觉差异与限制

- 仍为灰盒。沿用 v0.3 基础灯光，没有 Blender AO／接触软阴影；关闭 practical 不会变成最终夜景。
- Window 是有意的局部近景，外框左右边缘可超出画面；控制面板与窗体清楚。Piano 聚焦左边留白偏紧但未裁切。
- 初始 MacBook open / Piano extended 与源 GLB 一致；首次准备循环、退出策略与持久状态已明确，不把姿态改动写回资产。
- 小物件实际几何命中面积仍小；可使用 Explore objects。尚未做最终移动交互设计。
- Marshall 只有电源 UI，无音频；Contact 和内容区域都是占位；天气仅 state。不存在个人链接或服务配置需求。
- Three/R3F 可能每次 Canvas mount 出现一次 `THREE.Clock` 弃用 warning；软件截图可能出现 ReadPixels 性能提示。它们与 React 错误循环或资源缺失不同，未屏蔽日志。
- 软件 WebGL 数据仅证明运行和诊断，不代表真实 GPU／手机长期帧率。

## 16. 运行与停止点

```bash
cd "/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room"
npm install
npm run dev
```

开发：[http://127.0.0.1:3000](http://127.0.0.1:3000)。生产：`npm run build` 后 `npm start -- --port 3001`，打开 [http://127.0.0.1:3001](http://127.0.0.1:3001)。

本轮结束后停在 v0.4，等待用户 review 和下一份任务规格，不自动进入 v0.5。
