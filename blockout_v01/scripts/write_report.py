"""Write the delivery report from the completed audits, then package four outputs."""
import json, zipfile, hashlib
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]
meta=json.loads((OUT/'build_metadata.json').read_text())
audit=json.loads((OUT/'validation_results.json').read_text())
rt=json.loads((OUT/'roundtrip_results.json').read_text())
assert audit['overall_status']=='pass', audit['summary']
assert rt['roundtrip_pass']
cam=meta['camera']; glb=audit['details']['glb']
def xyz(a): return ', '.join(f'{v:.6f}' for v in a)
checks={c['check']:c for c in audit['checks']}
report=f'''# Sharky's Room — BLOCKOUT_REPORT v0.1

**交付状态：Blender Blockout v0.1 完成，停止于本阶段，等待构图与空间关系 review。**

制作与检查环境：Blender {meta['blender_version']}，Metric，1 Blender Unit = 1 m，Blender Z 向上。日期：2026-09-16。

## 1. 依据与已完成内容

已解压并完整阅读 `CODEX_TASK.md`、`BLENDER_BLOCKOUT_SPEC.md`、`INTERACTIONS.md`、`SCENE_HIERARCHY.md`、`ASSET_LIST.csv`、`README.md`，并检查 `room_master_reference.jpeg`。以 CODEX_TASK 为主任务，其余指定文档为约束。参考图和源文档已收进 .blend，便于同文件复核；参考图不参与材质或 GLB 贴图。

- 以参考图的左后展示柜、后墙大窗和工作台、右侧床、左前沙发、中前茶几、右前 Beanbag 建立空间。
- 两个朝向 Hero Camera 的侧面开放，前方地台切角，保留类似参考图的 cutaway 外轮廓。
- 展示柜、桌、床、沙发、椅子等均为低复杂度 proxy；展示模型仅为命名 bounding boxes。
- 9 类交互、14 个 required nodes、9 个 focus targets、8 个 required collections 和 5 个轻量灯光节点均已建立。
- `SharkysRoom` 根节点下设置与 collections 同名的 8 个父 Empty，使 GLB 保留同样分组结构。
- 屏幕铰链、垃圾桶盖铰链、钢琴 rail parent 与开关轴心已实际采样测试；interactive objects 未 join/merge。
- 使用 6 个灰盒材质，无最终 PBR、纹理贴图、烘焙、LEGO/品牌精模、最终动画或网页 UI。

## 2. 交付文件

| 文件 | 说明 |
|---|---|
| `sharkys_room_blockout_v01.blend` | 可编辑源场景；默认 CAM_Hero，钢琴为抽出姿态 |
| `sharkys_room_blockout_v01.glb` | glTF 2.0，保留独立节点、层级、相机、灯光与 custom properties |
| `hero_camera_preview.png` | CAM_Hero 实际 Blender 渲染，1536 × 1024 |
| `BLOCKOUT_REPORT.md` | 本报告 |

额外验收记录位于 `validation_results.json`、`roundtrip_results.json`；可复现脚本在 `scripts/`。四个正式交付文件另打包为 `sharkys_room_blockout_v01_delivery.zip`。

## 3. 主要尺寸与位置

尺寸均为米，家具尺寸为 blockout 名义尺寸。

| 对象 | 尺寸 / 位置 |
|---|---|
| 房间 | 室内名义 X 7.20 × Y 5.80 × Z 3.00；左墙 x≈-3.6，后墙 y≈2.9 |
| 地台 | 外沿 7.38 × 5.98；厚 0.12；前角切角 |
| 展示柜 | 沿左墙宽 3.10、深 0.52、高 2.60；大格室保留独立模型占位 |
| 书桌 | 2.65 × 0.82；台面高 0.74；中心 XY=(-0.65, 1.95) |
| 钢琴 | 1.34 × 0.36 × 0.10；中心高 0.60；抽拉 0.65 |
| 双人床 | 床垫 1.60 × 2.00；中心 XY=(2.45, 1.13) |
| 沙发 | 宽 1.95、深约 0.88；中心 XY=(-2.15, -1.05)，绕 Z 转 76° |
| 茶几 | 1.10 × 0.65；高 0.48；中心 XY=(-0.50, -1.17) |
| 窗洞 | 宽 4.05；窗台高 0.90，顶部高 2.78；Frame / Glass 独立 |
| 灯开关 | 中心 z=1.20，位于左侧门旁 |
| 桌与床侧向间隔 | 名义约 0.95；计入床头板的最窄处约 0.93 |
| 琴与桌板净距 | 琴顶约 0.654，桌板底 0.670，净距约 0.016 |

桌脚/侧柜位于琴行程两侧；椅子位于抽出包络前方。默认钢琴全部抽出以方便在 Hero Camera 中检查。

## 4. Hero Camera

| 参数 | 值 |
|---|---|
| 名称 / 投影 | `CAM_Hero` / Perspective |
| 焦距 / Sensor width | {cam['lens_mm']:.0f} mm / {cam['sensor_width_mm']:.0f} mm |
| 位置 XYZ | ({xyz(cam['position'])}) |
| 旋转 XYZ（度） | ({xyz(cam['rotation_degrees'])}) |
| 瞄准点 XYZ | ({xyz(cam['target'])}) |
| Clip | 0.05–100 m |
| Lens shift | X=0，Y=0；确保 glTF 相机可保持相同投影 |
| 预览 | 1536 × 1024，Cycles 48 samples，AgX，无烘焙 |

房间约占画面宽 90%、高 83%；柜、桌、床、沙发、茶几同框可见。当前是参考驱动的灰盒构图，最终相似度与空间舒适度仍需用户 review。参考图中的 UI、夜景、材质与精细模型没有作为本阶段交付目标。

## 5. Required nodes 与手动测试

下表列出的 **14 / 14** required nodes 均在 `.blend` 和 `.glb` 中保留原名，具有独立对象/节点。`INT_PianoRail` 是 Empty 控制器，其余是独立 mesh。

| 交互 | Required nodes | Focus target | 结果 |
|---|---|---|---|
| Monitor | `TEC_MonitorBody`, `TEC_MonitorScreen` | `TGT_Monitor` | 通过 |
| MacBook | `TEC_MacBookBase`, `TEC_MacBookScreen` | `TGT_MacBook` | 通过 |
| iPad | `TEC_iPad` | `TGT_iPad` | 通过 |
| Marshall | `TEC_Marshall` | `TGT_Marshall` | 通过 |
| Piano | `INT_PianoRail` → `INT_Piano` | `TGT_Piano` | 通过 |
| Trash Can | `INT_TrashCanBody`, `INT_TrashCanLid` | `TGT_TrashCan` | 通过 |
| Light Switch | `INT_LightSwitch` | `TGT_LightSwitch` | 通过 |
| Phone | `TEC_Phone` | `TGT_Phone` | 通过 |
| Window | `ENV_WindowFrame`, `ENV_WindowGlass` | `TGT_Window` | 通过 |

在 Blender 的 Item / Transform 面板输入以下**局部**值即可测试，不需要动画关键帧：

| 操作对象 | 收起 / 关闭 | 抽出 / 打开 | Pivot |
|---|---|---|---|
| `INT_PianoRail` | Location Y = 1.94 | Location Y = 1.29（默认） | Y 轴平移，Piano 是其 child |
| `TEC_MacBookScreen` | Rotation X = 0° | Rotation X = -105°（默认） | 后边缘 X 铰链，origin=(-1.50,1.9775,0.776) |
| `INT_TrashCanLid` | Rotation X = 0°（默认） | Rotation X = -100° | 后边缘 X 铰链，origin=(1.12,1.993,0.474) |
| `INT_LightSwitch` | Rotation Y = -8°（默认） | Rotation Y = +8° | 以自身中心为轴心 |

开关预留控制 `LGT_CabinetProxy`、`LGT_DeskProxy`、`LGT_BedProxy`。`LGT_Ambient` 与 `LGT_WindowKey` 作为环境/窗光独立保留。这里只提供节点和控制语义，没有实现网页 click/tap、时间天气状态或灯光事件代码。

**坐标转换：**Blender 是 Z-up，GLB 按 glTF 标准导出为 Y-up：`(x,y,z) → (x,z,-y)`。钢琴在 Web 中的移动向量为 `(0,0,+0.65)`；开关 Blender +Y 对应 glTF -Z；屏幕与垃圾盖 X 铰链仍为 +X。`pivot_axis`、角度、retracted/extended 属性描述 Blender 坐标，另有明确的 `pivot_axis_gltf` / `slide_vector_gltf` 属性供后续对接。

## 6. 导出与验收结果

- 自动验收：**{audit['summary']['pass']} 项通过，{audit['summary']['fail']} 项失败，{audit['summary']['warning']} 项警告**。
- GLB：**{glb['size_bytes']:,} bytes = {glb['size_bytes']/1e6:.6f} MB**，低于 5 MB 目标。
- GLB 几何：{glb['nodes']} nodes，{glb['meshes']} meshes，{glb['triangles']:,} triangles，6 materials，0 textures/images。
- 8 个 required collections / 分组、14 个交互节点、9 个 targets、5 个灯节点全部存在；对象 scale 已应用为 1。
- 钢琴收起至抽出 15 个位置采样无穿面；三类旋转机构按约 1°间隔测试，未发现与检查对象穿面；测试后恢复默认变换。
- 主要家具和相关墙体/窗帘做静态相交检查，未发现严重穿模；自动检查属于有限采样和表面相交检测，仍结合 Hero 预览做了视觉复核。
- GLB 重新导入全新 Blender 场景成功：**{rt['reimported_objects']} / {rt['source_objects']} 对象回读**；原点、父子关系和几何范围无差异；相机矩阵最大误差 {rt['camera_world_matrix_max_error']:.2e}。
- GLB 回读渲染已检查，记录在 `review/glb_roundtrip_preview.png`。glTF 灯光保留 `KHR_lights_punctual`；Blender 的 World、光源半径和太阳角度等渲染设置不由该标准完整携带，因此回读图的阴影较硬。几何和相机保持一致，未以烘焙贴图补偿。

### CODEX_TASK 最终清单

- [x] Hero composition resembles reference（内部视觉复核；用户确认待下一轮）
- [x] Required collections exist
- [x] Required interactive nodes exist
- [x] MacBook hinge works
- [x] Piano slides without clipping
- [x] Trash lid opens
- [x] Light switch pivot works
- [x] Window independently selectable
- [x] GLB exports successfully
- [x] Names/hierarchy survive export
- [x] No unnecessary high-poly geometry

## 7. 仍需人工确认

1. 是否接受当前 Hero 镜头、前角切角、床/桌/沙发的相对位置与留白。
2. 7.2 × 5.8 m 的房间起始尺度是否符合预期；本轮由参考图估算，无实测平面图。
3. 后续展示模型的实际包围盒尺寸与展示比例。目前 Eiffel/Falcon 等仅有占位；在精模替换前需要确认是否加大格室或缩放模型。
4. 钢琴行程与椅子默认位置是否符合使用方式；实体琴轨结构、人体工学和最终键盘尺寸需后续明确。
5. 目标浏览器和移动设备的实际帧率尚未测试。本轮验证了 GLB 体积、几何复杂度与重新导入正确性。

**本轮到此停止；未进入精模替换或下一阶段。**
'''
(OUT/'BLOCKOUT_REPORT.md').write_text(report,encoding='utf-8')
names=['sharkys_room_blockout_v01.blend','sharkys_room_blockout_v01.glb','hero_camera_preview.png','BLOCKOUT_REPORT.md']
with zipfile.ZipFile(OUT/'sharkys_room_blockout_v01_delivery.zip','w',zipfile.ZIP_DEFLATED) as z:
    for name in names: z.write(OUT/name,arcname=name)
manifest={name:{'bytes':(OUT/name).stat().st_size,'sha256':hashlib.sha256((OUT/name).read_bytes()).hexdigest()} for name in names}
(OUT/'delivery_manifest.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps({'outputs':manifest,'zip_bytes':(OUT/'sharkys_room_blockout_v01_delivery.zip').stat().st_size},indent=2))
