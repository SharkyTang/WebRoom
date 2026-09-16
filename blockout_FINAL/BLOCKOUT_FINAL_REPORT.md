# BLOCKOUT_FINAL_REPORT — v0.2.1

## SHARKY'S ROOM — BLOCKOUT FINAL / COMPOSITION LOCKED

**Final Composition Lock 已完成。** 在完整几何、交互和实际 GLB 回读验收通过后，才向 Scene、`SharkysRoom` 根节点与 GLB root extras 写入冻结标记；冻结后的正式文件再次验收通过。

- 日期：2026-09-17。
- 基于已验证的 `blockout_v02/sharkys_room_blockout_v02.blend`，Blender 5.2.1 LTS，Metric，1 BU=1m，Z-up。
- 主任务依据：`Sharkys_Room_Blockout_v0.2.1_Codex_Prompt.md`，副本保存在 `SOURCE_v0.2.1_PROMPT.md`。
- 最终默认相机：**`CAM_Hero_FINAL`**，精确复制用户选定的 `CAM_Hero_48`。
- 原 v0.2 六项交付文件 SHA-256 全部保持不变。
- **本轮到此停止，等待 v0.3 — Web Foundation 任务说明。没有开始 Web、Interaction Prototype 或精模。**

## 1. 正式交付

| 文件 | 内容 |
|---|---|
| `sharkys_room_blockout_FINAL.blend` | 冻结后的 Blender spatial source of truth，默认最终相机 |
| `sharkys_room_blockout_FINAL.glb` | 已复验的 glTF 2.0 场景，命名/层级/相机/交互节点完整 |
| `hero_FINAL.png` | 使用 CAM_Hero_FINAL 实际渲染，1536×1024 |
| `BLOCKOUT_FINAL_REPORT.md` | 本报告 |

四项文件另打包为 `sharkys_room_blockout_FINAL_delivery.zip`。验收记录、精确变换快照和脚本留在工作目录。

## 2. v0.2 → v0.2.1 的修改

### 最终相机

新增 `CAM_Hero_FINAL`，完整复制 `CAM_Hero_48` 的位置、旋转、target、焦距、sensor、FOV、clip 和 DOF 设置；将其设为 Scene Active Camera。旧 `CAM_Hero`、`CAM_Hero_45`、`CAM_Hero_48`、`CAM_Hero_52` 原样保留为历史记录，均不作为默认相机。没有搜索新机位、创建新构图候选或重新取景。

### 展示柜内部

柜体整体宽 **3.75m**、深 **0.60m**、高 **2.60m**，对象 transform、origin 及外包围盒完全保持。只改内部：

1. 靠后的窄列竖隔板从世界 Y=2.02 移到 Y=1.90，扩大中小模型列，SLS 高格仍有完整净空。
2. 底部前区竖分隔从世界 Y=-0.15 移到 Y=-0.29，形成两处净宽约 0.81m 的独立 F1 低格。
3. 后侧窄列增加 Z=1.29、1.89 的两条短层板，形成三层不对称的小格。
4. 原中小建筑 proxy 移入窄列底格，Y 宽仅由 0.53 缩到 0.50m；深度 0.47、高度 0.45m 不变。
5. 原赛车 proxy 用作 Ferrari F1，Y 宽由 0.81 缩到 0.76m、中心 Y 从 -0.660 移到 -0.715；深度 0.42、高度 0.27m 不变。
6. 新增 Mercedes-AMG F1、一个中型和一个小型收藏品 bounding-box proxy。

Eiffel、Falcon、Hogwarts/large architecture、Tower Bridge 和 SLS 五个大型 proxy 的位置、尺寸和几何均保留。原 `DSP_TallRocket_Bounds` 用 reserved_asset 属性注明为 SLS；保留对象原名。全部仍是 bounding boxes，没有制作 LEGO 正式模型。

### 前景小圆桌

替换前已检查 `FUR_SideTable`：没有 children、constraints、animation、incoming driver 或其他对象引用；其 mesh 独占。采用**保留原对象，只替换 mesh**的方式：

- 原名称、parent=`FURNITURE`、collection、origin **(0.98,-2.19,0.27)**、原 modifier 与依赖均保留。
- 原 0.44×0.44×0.54m 方柱，改为直径 **0.48m**、厚 **0.03m** 圆台面。
- 三条直径 **0.028m** 的细腿，腿心分布半径 0.16m，落地至桌面下缘。
- 顶面仍为世界 Z=**0.54m**，原 `DEC_Lamp_Lounge` 位置、大小完全不动；桌面实际承托检测通过。
- 使用原有灰盒材质，没有新建材质、贴图或精模细节。

### 完全冻结的内容

Room/Floor/cutaway/Walls/Window/Door、Desk/Monitor、MacBook/Phone/Marshall/Keyboard/Mouse/Headphones、Piano/Office Chair、Bed/Sofa/Coffee Table/iPad/Beanbag/Trash Can/Light Switch/Dog area 均保持 v0.2 的 geometry、world transform、origin、parent 和相关机制。`Sofa → Coffee Table → Workstation` 与 `Dog Area → Side Table → Beanbag → Bed` 关系保留。

## 3. Final Hero Camera 参数

| 参数 | 最终值 |
|---|---|
| Name / source | CAM_Hero_FINAL / CAM_Hero_48 |
| Active camera | CAM_Hero_FINAL |
| Projection / Lens | Perspective / 48mm |
| Position XYZ / m | (7.891778, -10.294089, 7.609460) |
| Euler XYZ / degree | (62.335646, 0.000001, 37.522180) |
| Quaternion WXYZ | (0.810192, 0.490048, 0.166455, 0.275198) |
| Target XYZ / m | (-0.043089, 0.038550, 0.780006) |
| Sensor width × height | 36 × 24mm，Sensor Fit=AUTO |
| Horizontal / vertical FOV | 41.112090° / 28.072487° |
| Shift X / Y | 0 / 0 |
| Clip near / far | 0.05 / 100m |
| DOF | 关闭 |
| Resolution / pixel aspect | 1536×1024 / 1:1 |
| Render | Cycles，64 samples，denoise，AgX；灯光不变 |
| Parent / collection | CAMERAS_TARGETS / CAMERAS_TARGETS |

精确浮点值与 4×4 world matrix 保存在 `build_FINAL_metadata.json` 和 `spatial_freeze_manifest.json`。对比 v0.2 已选镜头，所有参数一致。`hero_FINAL.png` 使用上述最终相机渲染。

## 4. 冻结的主要尺寸

单位为米，家具尺寸为本阶段 proxy 名义尺寸。

| 对象 | 尺寸 |
|---|---|
| Room | 内部名义 7.20 × 5.80 × 3.00 |
| Floor/cutaway | 外沿 7.38 × 5.98，厚 0.12，前切角不变 |
| Display Cabinet | 宽 3.75 × 深 0.60 × 高 2.60 |
| Desk | 2.80 × 0.82，台面高 0.74 |
| Monitor head / screen | 头部宽1.16×高0.62；screen宽1.105×高0.560 |
| Piano | 1.34 × 0.36 × 0.10，中心高 0.60，行程 0.65 |
| Bed mattress | 1.60 × 2.00 |
| Sofa | 名义宽1.95、深约0.88，Z旋转98°不变 |
| Coffee Table | 1.10 × 0.65，高0.48 |
| Beanbag | 原 proxy 的78%，包围体约0.780×0.788×0.780 |
| Side Table | 直径0.48，高0.54，台面厚0.03 |
| Window opening | 宽4.05，窗台高0.90，顶部高2.78 |
| Light Switch | 中心高1.20 |

所有对象 world positions、parents、origins 和实际 evaluated bounding boxes 已记录于冻结快照，供以后资产替换对齐。

## 5. 最终展示柜格室

下表顺序为**沿墙宽 Y × 深 X × 高 Z**。净空采用层板与隔板内表面，深度从背板内侧计算。proxy 是预留尺寸，不是正式模型。

| 格室 / 未来模型 | 净空 W×D×H / m | Proxy W×D×H / m | Proxy node |
|---|---|---|---|
| Hogwarts / large architecture | 1.6600 × 0.570 × 1.140 | 1.300 × 0.490 × 0.970 | `DSP_Castle_Bounds` |
| Millennium Falcon | 1.6600 × 0.570 × 0.580 | 1.280 × 0.480 × 0.450 | `DSP_Falcon_Bounds` |
| Eiffel Tower | 0.7975 × 0.570 × 1.790 | 0.720 × 0.500 × 1.600 | `DSP_EiffelTower_Bounds` |
| SLS | 0.4350 × 0.570 × 1.790 | 0.290 × 0.320 × 1.440 | `DSP_TallRocket_Bounds` |
| Ferrari F1 | 0.8100 × 0.570 × 0.570 | 0.760 × 0.420 × 0.270 | `DSP_Vehicle_Bounds` |
| Mercedes-AMG F1 | 0.8100 × 0.570 × 0.570 | 0.760 × 0.420 × 0.270 | `DSP_MercedesAMGF1_Bounds` |
| Tower Bridge | 1.8700 × 0.570 × 0.570 | 1.400 × 0.470 × 0.480 | `DSP_Bridge_Bounds` |
| Medium architecture | 0.5475 × 0.570 × 0.525 | 0.500 × 0.470 × 0.450 | `DSP_Architecture_Bounds` |
| Medium collectible | 0.5475 × 0.570 × 0.540 | 0.360 × 0.390 × 0.380 | `DSP_MediumModel_Bounds` |
| Small collectible | 0.5475 × 0.570 × 0.605 | 0.290 × 0.340 × 0.350 | `DSP_SmallModel_Bounds` |

13 块柜体 panel 与 10 个 proxy 的实体包围盒/表面相交均已检查，10 个 proxy 全部处于各自格室净空内，未穿透层板，也未互相交叠。五个大型 proxy 的尺寸没有缩减；SLS 格净宽由约0.555调整为0.435m，原0.290m宽的SLS占位仍完整容纳。

## 6. 交互、结构与机构验收

**正式冻结后完整验收：109 PASS / 0 FAIL / 0 WARNING。**

| 检查项 | 结果 |
|---|---|
| 原 v0.2 的81个对象 | 全部保留名称、类型、父级、collection；新增仅最终camera及3个DSP proxy |
| Required collections | 8组全部保留，collection hierarchy不变 |
| 14 interactive nodes | 独立节点、geometry、world/basis/parent-inverse矩阵、origin、properties均与v0.2一致 |
| 9 focus targets | 原名、parent、world transform及properties完全不变 |
| MacBook hinge | X轴、后沿pivot、0°…-105°；106个姿态无穿面 |
| Piano | INT_PianoRail→INT_Piano父子结构；收起Y=1.94、抽出Y=1.29；0.65m全行程15采样通过 |
| Piano clearance | 琴顶约Z=.654、桌板底Z=.670，约16mm净距保留；椅子未进入运动范围 |
| Trash lid | 后沿X pivot，0°…-100°；101个姿态无穿面 |
| Light Switch | 中心Y pivot，-8°…+8°；33个姿态无穿面 |
| Window | Frame/Glass保留独立mesh与节点 |
| Static intersection | 原有家具、墙、窗帘检查通过；新增柜格/proxy及圆桌与全场景检查通过 |
| Side Table dependencies | 原依赖完整保留；灯具底部向下raycast均命中桌面 |
| Final Camera | 与CAM_Hero_48精确一致且为active；旧4相机不变 |
| Freeze declaration | Scene、Root与GLB root extras均为COMPOSITION_LOCKED |

14个 required nodes：

```text
TEC_MonitorBody       TEC_MonitorScreen
TEC_MacBookBase       TEC_MacBookScreen
TEC_iPad             TEC_Marshall             TEC_Phone
INT_PianoRail        INT_Piano
INT_TrashCanBody     INT_TrashCanLid          INT_LightSwitch
ENV_WindowFrame      ENV_WindowGlass
```

9个 targets：`TGT_Monitor`、`TGT_MacBook`、`TGT_iPad`、`TGT_Marshall`、`TGT_Piano`、`TGT_TrashCan`、`TGT_LightSwitch`、`TGT_Phone`、`TGT_Window`。

证据文件：`validation_results.json`、`side_table_dependency_before.json`。测试只在内存改变姿态并恢复，未覆盖交付中的机构默认状态。

## 7. GLB 与 actual round-trip

- **411,892 bytes = 0.411892 MB**，小于5MB目标。
- **6,566 triangles**；85 nodes，55 meshes，13,480 exported vertices。
- 6个既有灰盒材质，0 textures / images，5个相机。
- glTF 2.0标准Y-up，保留原层级、独立节点、extras、相机与 `KHR_lights_punctual`。
- 冻结后的GLB在全新Blender场景中实际导入成功：**85/85对象**；名称、parent、origin、mesh bounding boxes、triangle count全部一致。
- 五个相机 world matrix 通过，最大误差 2.384e-07；GLB FOV / aspect / clip 同时通过检查。
- 结果见 `roundtrip_results.json`。Blender Z-up坐标转GLB为 `(x,y,z)→(x,z,-y)`；冻结快照使用Blender坐标。

## 8. Warnings / unresolved issues

**没有阻碍本次冻结的问题，自动验收无警告。**

- 既定Hero镜头中，底部F1格部分被原沙发遮挡；这属于保留的构图关系，两格都已独立预留并通过净空验证，不为此移动冻结家具。
- 正式模型尚未制作，后续实际模型必须适配已冻结格室的world position和包围盒；不得直接用未经适配的更大模型替换。
- 自动机构检查为离散采样，结合实际渲染视觉复核，不等同于连续碰撞求解或实体家具工程验证。
- Blender World、柔影半径等设置不由glTF标准完整携带；这是原有导出边界，不影响本次几何/相机锁定。
- 浏览器界面、点击交互和设备帧率尚未实现或测试，留待明确授权的v0.3 Web Foundation。

## 9. 冻结声明

**SHARKY'S ROOM — BLOCKOUT FINAL / COMPOSITION LOCKED**

本次 `.blend` 和 `.glb` 作为后续Web与正式建模的 **spatial source of truth**。替换资产时尽可能保持 world position、overall bounding box、CAM_Hero_FINAL、interaction target、pivot和parent hierarchy。不要因模型细节替换而再次漂移空间构图。

`spatial_freeze_manifest.json` 保存85个对象的精确矩阵、origin、parent和包围盒，以及正式模型和预览的SHA-256。

**完成后已停止。等待 v0.3 — Web Foundation 任务说明。**
