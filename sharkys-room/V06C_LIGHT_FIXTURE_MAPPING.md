# v0.6C 灯具外壳、表面与原灯组对应登记

记录日期：2026-09-18。**四个外壳已完成制作、正式导出与 manifest 登记；实际 GLB 的 CPU 装配、几何和到达顺序验收通过。灯具组正常网页 23/23、初次近景技术检查 12/12、最终细节近景技术检查 18/18 通过；代理已查看相关截图，用户视觉确认仍待完成。** 本表同时保留原输入数据与正式导出的实际尺寸，不把静态映射登记写成独立灯控制完成。

本组 CPU 日志共 **107/107 通过**：几何 58 项、到达顺序与资源归属 49 项，失败/取消/跳过均为 0。本表更新只解析既有日志，并补充柜灯带分段与实板的专项回读，没有重复运行整套测试。证据及当时实际 GLB/Blend/测试源码的哈希索引见 [04-geometry-order.json](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06c/stages/04-geometry-order.json) 和 [原日志](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06c/stages/04-geometry-order.log)。这是第四组阶段证据：其后窗边植物及主生成器已有单独修复，不能把该索引当作全部最终 C 输入的哈希；本表所测灯具、墙画及相关 A/B 几何的哈希仍一致。

网页证据：[正常灯具组 23/23](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06c/stage-fixtures/collection-decor-browser.json)、[初次近景 12/12](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06c/inspection-fixtures/collection-decor-inspection.json)、[最终细节近景 18/18](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06c/inspection-final-details/collection-decor-inspection.json)。三者为不同范围，不相加作为独立灯具验收总数。最终细节包含床灯无遮挡视角、完整桌后条与局部扩散面、柜内四段条体；原床灯初次近景被床头遮挡，已由最终补拍替代可见性证据。代理逐图观察记录见 [VISIBILITY_REVIEW.md](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06c/inspection-final-details/VISIBILITY_REVIEW.md)。近景仅改变隔离验证副本的临时镜头，不能替代正常网页回归或用户审美确认。

本批只增加可视资产和独立表面，保留已有总开关及三盏原点光源。`Desk`、`Bed`、`Cabinet` 的独立状态属于后续版本，本批不新增灯组控制、混合态、第四组光源或昼夜逻辑。

## 1. 原光源的实测状态

坐标均为 Three/glTF 的 Y-up 世界坐标，单位为米。三盏光源均位于原 `LIGHTING` 父组，原节点、父级与变换保留。

| 原灯组身份 | 原节点类型 | 世界位置 X / Y / Z | 实测颜色 | 原导出 intensity 数值 | 当前加载后 intensity 数值 |
| --- | --- | --- | --- | ---: | ---: |
| 床边 | `LGT_BedProxy` / `PointLight` | `2.97 / 0.84 / -2.50` | `#fff7ec` | 652.216957 | 0.954930 |
| 书桌 | `LGT_DeskProxy` / `PointLight` | `-1.85 / 1.24 / -1.95` | `#fff7ec` | 489.162718 | 0.716197 |
| 展示柜 | `LGT_CabinetProxy` / `PointLight` | `-2.70 / 2.25 / -0.70` | `#fff5e7` | 3532.841849 | 5.172536 |

当前加载器已有 `intensity /= 683` 归一化；表中后列按此原有代码计算，未作新光照调参。三者原导出 `distance = 0`，四元数约为 `[-0.707107, 0, 0, 0.707107]`。原 `LGT_Ambient`、`LGT_WindowKey` 和现有环境补光不属于这次三组映射的新增灯具。

依据：[空间实测 JSON](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06c/planning/space-measurements.json)、[原有加载逻辑](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/components/room/RoomScene.tsx:39)、[原三灯清单](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/lib/room/animationConstants.ts:24)。

## 2. 可视灯具与独立表面登记

下表根、surface 和材质名均已由**正式 GLB 与静态 registry 逐项核实**。四种表面使用各自的、不透明 PBR 材质，`emissive = #000000`、无 emissive map，不共享家具、屏幕或其他灯面的可变材质实例。`fixtures` 家族使用 `stateSurface: null`、`surfaceRole: 'none'`，不接入既有 `indicator` 绑定器。

| 已导出可视灯具根 / 装配父级 | 独立 surface | 实际 surface 材质名 | 原灯组对应 / 依据 | 本批性质与待决项 |
| --- | --- | --- | --- | --- |
| `VIS_FixtureBedside` → `DEC_Lamp_Bedside` | `VIS_FixtureBedsideSurface` | `MAT_V06C_FixtureBedsideSurface` | `LGT_BedProxy` 的 X/Z 与原床灯完全同位；灯点位于灯壳局部 Y = 0.26，落在原灯罩高度内 | 床边外壳的空间对应有明确依据；本批只预留独立表面，不实现表面随开关的状态绑定 |
| `VIS_FixtureLounge` → `DEC_Lamp_Lounge` | `VIS_FixtureLoungeSurface` | `MAT_V06C_FixtureLoungeSurface` | 保留原休闲灯身份及边桌承托；现有三点灯中没有专属 Lounge 灯点 | 只正式化原可视外壳；未来与哪组关联仍未确定，不归入 Desk，不建立第四组 |
| `VIS_FixtureDeskStrip` → `FUR_Desk` | `VIS_FixtureDeskStripSurface` | `MAT_V06C_FixtureDeskStripSurface` | 书桌后沿下表面是现有结构；可登记为 Desk 组的静态灯具候选 | 原 Desk 点灯位于左上方，与新增后沿灯带不物理同位；映射是后续候选，不移动原点灯、不新增控制 |
| `VIS_FixtureCabinetStrip` → `FUR_DisplayCabinet` | `VIS_FixtureCabinetStripSurface` | `MAT_V06C_FixtureCabinetStripSurface` | 展示柜顶板下表面可承载分段灯带；各段避开原分隔板 | 可登记为 Cabinet 组的静态灯具候选；原点灯位于柜前，与灯带不物理同位，后续绑定与配光待定 |

床灯和休闲灯仅替换各自原 `DEC_Lamp_*` 下的两件指定可视 mesh，保留原锚点和身份。桌灯带与柜灯带均已明确 `proxyMeshNames: []`。严格校验要求四个 surface 唯一存在并属于对应根；缺失、重复、误挂其他根均在抑制原 proxy 前拒绝。`fixtures / desk / cabinet` 的 6 种到达顺序 × 6 种卸载顺序共 36 个真实 GLB 场景通过，未误隐藏、释放或回滚覆盖其他家族。

## 3. 原两盏台灯的空间包络

| 灯具 | 原锚点世界位置 | 原局部可视包络 X / Y / Z | 实际承托 |
| --- | --- | --- | --- |
| Bedside | `[2.97, 0.58, -2.50]` | `[-0.10, 0.10] / [0, 0.385] / [-0.10, 0.10]` | A 床头柜顶，世界 Y = 0.58 |
| Lounge | `[0.98, 0.54, 2.19]` | `[-0.10, 0.10] / [0, 0.385] / [-0.10, 0.10]` | A 小圆边桌顶，世界 Y = 0.54 |

两者原父级均为 `DECORATIONS`，原旋转为单位四元数，缩放为 `[1, 1, 1]`。正式壳体已形成灯座、灯杆、支撑和空心薄壁灯罩，两者实际局部包络均为 `[-0.097999997, 0, -0.097999997] → [0.097999997, 0.378500015, 0.097999997]`，留在原包络内，底部实际承托通过。床灯和休闲灯的两个原 mesh 分别是各自的 `_Mesh` 与 `_Mesh_1`，精准抑制与卸载恢复已通过。

## 4. 新增灯带的实际导出几何

### 书桌后沿

`FUR_Desk` 原世界位置约为 `[-0.65, 0, -1.95]`。`VIS_FixtureDeskStrip` 的根保持 identity；1.6 m 条体完整尺寸已从正式导出的顶点回读，包含外壳、端帽与独立扩散面。

| 范围 | 书桌局部坐标 | 换算后的世界坐标 |
| --- | --- | --- |
| X | `[-0.800000012, 0.800000012]` | `[-1.449999988, 0.150000036]` |
| Y | `[0.664999962, 0.669499993]` | `[0.664999962, 0.669499993]` |
| Z | `[-0.405000001, -0.394999981]` | `[-2.355000049, -2.345000029]` |

A 实际桌板下表面为 Y = 0.669999957；灯带上沿的实际接触偏移为 **0.499964 mm**。条体完整尺寸为 `1.600000024 × 0.004500031 × 0.010000020 m`（X/Y/Z）。原后撑局部 Z 为 `[-0.39, -0.33]`，灯带位于其后侧，水平间距约 5 mm；针对实际 A 桌体的实体检查通过。它不在桌面新增台灯，不改变桌面物件清单。

已使用 **B 实际 `VIS_PianoBody` 与 `VIS_PianoSlide` 双根**检查完整 0.65 m 行程的 17 个姿态，包含收回、25%、50%、75%、完全展开及中间采样，均不与新增条体碰撞。条体到琴体/滑轨的实际导出包围盒距离**保守下界最小为 228.315633 mm**，发生在完全收回姿态；该值不是最近三角面对的精确距离。原桌板下表面到琴顶的垂直净空各姿态均为 **16.999930 mm**，保留原至少 16 mm 的要求（数值验收阈值 15.99 mm）。完整 17 点观测保留在证据 JSON 中。

### 展示柜顶板下方

`FUR_DisplayCabinet` 原世界位置约为 `[-3.25, 0, -0.90]`。`VIS_FixtureCabinetStrip` 根保持 identity，实际局部完整包络为 `[0.247999996, 2.520499945, -1.540000081] → [0.271999985, 2.524500132, 1.990000010]`。横截面实测宽 **23.999989 mm**、厚 **4.000187 mm**。整体 Z 包络跨度约 3.53 m **包含三处断开区间**，四段实体总长约 3.20 m，并非连续灯条。

A 顶板实际下表面为 Y = 2.524999857，灯带上沿实际接触偏移为 **0.499725 mm**。四段各 72 个三角面，共 288 个；全部三角面落在四个登记区间内，没有跨间隔连接面。四段共享本 Cabinet surface 的独立材质，没有与其他灯组或柜体共用该材质。

| 对应上部格位 | 实际柜局部 Z 范围（约，m） | 实际世界 Z 范围（约，m） |
| --- | --- | --- |
| Hogwarts 格 | `[0.39, 1.99]` | `[-0.51, 1.09]` |
| Eiffel 格 | `[-0.4675, 0.27]` | `[-1.3675, -0.63]` |
| SLS 格 | `[-0.9475, -0.5725]` | `[-1.8475, -1.4725]` |
| 上部 Small 预留格 | `[-1.54, -1.0525]` | `[-2.44, -1.9525]` |

Small 格的灯带属于原柜结构承载，不表示该格新增了收藏或书籍。原 `LGT_CabinetProxy` 位于柜前约 25 cm，保留其原位置；本表不把灯带位置伪装成该点灯的位置。

专项实际回读检查了柜灯带 288 个三角面与 A 柜体 14 个导出板材网格的实体包围盒：扣除 0.01 mm 数值接触容差后，**0 个三角面进入板材内部**。针对 8 件正式收藏的实际包围盒同样为 0 相交；灯带最低点到最高收藏 Hogwarts 顶部的垂直分离为 **315.999985 mm**。该补充检查单独记录在 `supplementalCabinetGeometry`，未冒充原 107 项中的已有断言。

## 5. 当前证据与后续状态

| 核对项 | 当前状态 | 实际证据 / 剩余事项 |
| --- | --- | --- |
| 四个根与四个 surface 的实际导出、装配 | 已导出、已登记；CPU 与正常网页通过 | 灯具组正常网页 23/23；四根及独立 PBR 表面加载，故障回退与刷新恢复通过 |
| 材质隔离、`emissive = 0`、无新光源 | CPU 与实际 GLB 回读通过 | 四独立表面材质，不透明、无 emissive map；灯具 GLB 无 camera/light/animation/external URI |
| 两盏原台灯的包络与承托 | CPU 通过 | 原包络、实际接触、指定 mesh 抑制与完整回退通过 |
| DeskStrip 的后沿承托与钢琴全行程 | CPU 通过 | 1.6 m 完整条体；17 姿态无碰撞，228.316 mm 保守最小条体距离，16.99993 mm 原桌底净空 |
| CabinetStrip 四段与柜板/收藏关系 | 实际 GLB 专项回读通过 | 四段、288 三角面；14 件板材及 8 件收藏均无上述相交 |
| 到达顺序与资源归属 | CPU 通过 | 灯具/桌/柜 36 种到达与卸载组合；四灯面缺失、重复和误挂拒绝 |
| 原总开关与三点灯状态 | 实现保留；正常网页回归通过 | 1440/390 视口原 lightswitch 操作及返回通过；无新增状态绑定，不能用独立表面存在推导独立控制完成 |
| 外壳与灯带可见性 | 代理已查看最终补拍 | 初次近景 12/12、最终细节 18/18 技术检查；完整桌条、柜内四段与无遮挡床灯的观察记录另列 |
| 用户视觉确认 | 待用户 | 已有真实网页截图与录屏，仍需用户明确反馈，单独于技术验收登记 |

灯具正式 [GLB](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/public/models/production/fixtures_v06c.glb) 为 **120,244 B / 1,992 三角面 / 8 primitives / 5 材质 / 0 贴图**，SHA-256 为 `3b23cd742184e4a6f8ffc7461c897bbd5d4a49a892eb19f746e2f489bd335e9f`；[Blend 源文件](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/blender-assets/fixtures_v06c.blend) 为 115,366 B。同期墙画实际 GLB 为 30,808 B / 452 三角面；两家正式资产均无外部 URI、相机、光源或动画。以上资源数据直接解析实际 GLB，未以生成器 statistics 代替真实测量。

后续未决项是 Lounge 的灯组归属，以及 Desk/Cabinet 候选灯带与未来真实配光、状态绑定的关系。它们不授权在 C 中改造灯光系统；本批完成后仍须停止，按后续明确授权再处理。
