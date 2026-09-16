"""Produce the v0.2 report/package from the saved scene metadata and independent audits."""
import json, math, hashlib, zipfile, struct
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]
BASE=OUT.parent/'blockout_v01'
m=json.loads((OUT/'build_v02_metadata.json').read_text())
a=json.loads((OUT/'validation_v02_results.json').read_text())
r=json.loads((OUT/'roundtrip_v02_results.json').read_text())
assert a['overall_status']=='pass' and r['roundtrip_pass']
assert not m['final_camera_selected'] and m['saved_active_camera']=='CAM_Hero'
old_manifest=json.loads((BASE/'delivery_manifest.json').read_text())
for name,record in old_manifest.items():
    assert hashlib.sha256((BASE/name).read_bytes()).hexdigest()==record['sha256'],name+' changed'
for focal in [45,48,52]:
    p=OUT/f'hero_{focal}mm.png'
    data=p.read_bytes()
    assert data[:8]==b'\x89PNG\r\n\x1a\n' and struct.unpack('>II',data[16:24])==(1536,1024)
g=a['details']['glb']
cams=m['cameras']
def v(values): return '('+', '.join(f'{n:.6f}' for n in values)+')'
def pos(name,when): return v(m['changes'][name][when]['location'])
def camrow(label,key,formatter=lambda x:str(x)):
    return '| '+label+' | '+' | '.join(formatter(cams[f'CAM_Hero_{f}'][key]) for f in [45,48,52])+' |'
rows=[
    camrow('相机名','name'),camrow('焦距 mm','lens_mm',lambda x:f'{x:.0f}'),
    camrow('位置 XYZ / m','position_xyz_m',v),
    camrow('Euler XYZ / 度','rotation_xyz_degrees',v),
    camrow('Quaternion WXYZ','rotation_quaternion_wxyz',v),
    camrow('瞄准点 XYZ / m','target_xyz_m',v),
    camrow('水平 FOV / 度','horizontal_fov_degrees',lambda x:f'{x:.6f}'),
    camrow('垂直 FOV / 度','vertical_fov_degrees',lambda x:f'{x:.6f}'),
    camrow('Sensor width / height / mm','sensor_width_mm',lambda x:f'{x:.0f}')
]
# Last sensor row is explicitly filled from both sensor dimensions.
rows[-1]='| Sensor width × height / mm | '+' | '.join(f"{cams[f'CAM_Hero_{f}']['sensor_width_mm']:.0f} × {cams[f'CAM_Hero_{f}']['sensor_height_mm']:.0f}" for f in [45,48,52])+' |'
camera_table='\n'.join(rows)
proxy_rows=[]
for name,p in m['display_proxies'].items():
    dx,dy,dz=p['dimensions_xyz_m']
    proxy_rows.append(f'| `{name}` | {dy:.2f} × {dx:.2f} × {dz:.2f} | {v(p["position"])} |')
change_rows=[]
for name,c in m['changes'].items():
    change_rows.append(f'| `{name}` | {v(c["before"]["location"])} | {v(c["after"]["location"])} |')
baseline=cams['CAM_Hero']
report=f'''# BLOCKOUT_REPORT_v02 — Composition Lock 候选 review

**本轮状态：v0.2 制作与验收完成，最终 Hero Camera 和 Composition 尚未锁定。**

日期：2026-09-16。制作环境：Blender {m['blender_version']}。单位：米，Blender Z-up。从已验证的 `blockout_v01/sharkys_room_blockout_v01.blend` 直接读取和修改后另存，未重新生成或覆盖 v0.1。原始四项交付文件的 SHA-256 均与 v0.1 manifest 一致。

## 1. 本轮输出与停止点

- `sharkys_room_blockout_v02.blend`
- `sharkys_room_blockout_v02.glb`
- `hero_45mm.png`
- `hero_48mm.png`
- `hero_52mm.png`
- `BLOCKOUT_REPORT_v02.md`

六项文件打包为 `sharkys_room_blockout_v02_delivery.zip`。验收 JSON、制作脚本和额外基准图保留在工作目录中。所有模型仍为灰盒；未制作正式 LEGO、最终材质/纹理、网页、React/R3F/GSAP、Weather VFX 或新的交互系统。

**文件默认相机仍为未改动的 `CAM_Hero`（原 v0.1 的 48mm 基准）。三个新候选均标记 UNREVIEWED；没有把任何候选替换成最终 Hero。停止于 v0.2，等待用户选择，不进入 v0.3。**

## 2. 相比 v0.1 的构图修改

| 项目 | v0.1 | v0.2 | 目的 / 保留条件 |
|---|---|---|---|
| 展示柜 | 宽 3.10、深 0.52、高 2.60 | 宽 3.75、深 0.60、高 2.60 | 沿左墙加宽约 21%；Y 覆盖 -0.65…2.45 → -1.20…2.55；对象 origin/parent 不动 |
| 层板 | 中层横跨柜体，高低区分较少 | 高窄塔格、宽高建筑格、宽低 Falcon 格、低矮赛车/桥梁格 | 中层不再横穿 Eiffel 高格；全部仍是柜框、宽层板和 bounding boxes |
| 书桌 | 2.65 × 0.82，高 0.74 | 2.80 × 0.82，高 0.74 | 仅沿 X 增宽；桌面、支脚高度、琴的 Y/Z 包络不变 |
| Monitor 头部 | 0.94 × 0.52（宽×高） | 1.16 × 0.62 | 单独放大头部 mesh；底座/立柱、Body/Screen 的 origin 和位置不动 |
| Monitor Screen | 0.883 × 0.461 | 1.105 × 0.560 | 与外壳同步放大，仍为独立节点；TGT_Monitor 不动 |
| 沙发 | (-2.15,-1.05,0)，Z=76° | (-2.13,-1.12,0)，Z=98° | 转向茶几，轮廓与桌前空间形成联系；尺寸不变 |
| 茶几 | (-0.50,-1.17,0)，Z=-10° | (-0.83,-1.02,0)，Z=-4° | 靠近沙发并略向工作区移动；沙发至茶几中心距离约 1.65 → 1.30 m |
| iPad | 独立对象及 TGT | 完全保留原位置、origin、尺寸 | 新茶几仍承托原位 iPad，未改动交互节点 |
| Beanbag | 100% 原 mesh，(1.83,-1.84,0) | mesh 缩至 78%，(2.13,-1.76,0) | 右移 0.30 m、向后 0.08 m；对象 scale 仍为 (1,1,1) |
| 茶几植物 | (-0.13,-1.10,0.48) | (-0.51,-0.92,0.48) | 跟随新桌面范围 |
| 沙发旁植物 | (-2.63,-2.21,0) | (-2.80,-2.29,0) | 避开沙发转角后的扶手，仍为简单 proxy |
| 床 / Trash Can / Dog area | v0.1 位置与体量 | 保持原状 | 未为镜头方案搬动这三个区域 |

桌面 MacBook、Phone、Marshall、Keyboard、Mouse、Headphones 保持原有独立对象和布局。工作台重点由更宽的桌面和更醒目的 Monitor 建立，而没有修改已验证交互节点的坐标。

### 展示格室与占位范围

柜内沿 Y 分配宽度，X 为深度。大建筑格净宽约 1.66、净高 1.14；Falcon 格净宽约 1.66、净高 0.58；Eiffel 格净宽约 0.798、净高 1.79；低层赛车格净宽约 0.95、净高 0.57；开放深度约 0.57。格室边框与占位体之间保留空隙。

以下是预留模型的 **bounding-box proxy 尺寸**，不表示最终模型比例已确认：

| 占位对象 | 宽 Y × 深 X × 高 Z / m | 世界中心 XYZ / m |
|---|---|---|
{chr(10).join(proxy_rows)}

未来实际模型需按这些格室核对包围盒；本阶段没有制作 LEGO 形体。

## 3. Hero Camera A / B / C

三张图使用**完全相同的场景、灯光、材质、分辨率和渲染设置**。镜头焦距、位置、角度、瞄准点分别调整，未采用只换焦距且保持原机位的做法。

| 候选 | 视觉区别 | Review 图 |
|---|---|---|
| A / 45mm | 机位更近，俯视约 29.34°；桌面和层板顶面更多，纵深较明显 | `hero_45mm.png` |
| B / 48mm | 俯视约 27.66°；接近原基准的前后关系，取景适配新布局 | `hero_48mm.png` |
| C / 52mm | 后退且俯视约 25.89°；前后更紧凑、家具立面比重更强 | `hero_52mm.png` |

内部视觉复核：三个版本均完整保留地台、展示柜、工作台、床、沙发、茶几。52mm 中垃圾桶下部与床边出现少量二维投影重叠，桶盖及大部分桶身仍清楚；未为此移动冻结区域。三张均是候选，未指定优胜者。

### 完整相机参数

坐标与角度采用 Blender 原生 Z-up，Euler 顺序 XYZ，Quaternion 顺序 WXYZ。

| 参数 | A / 45mm | B / 48mm | C / 52mm |
|---|---|---|---|
{camera_table}
| 投影 / Sensor Fit | Perspective / AUTO | Perspective / AUTO | Perspective / AUTO |
| Shift X / Y | 0 / 0 | 0 / 0 | 0 / 0 |
| Clip near / far / m | 0.05 / 100 | 0.05 / 100 | 0.05 / 100 |
| 分辨率 / 像素比 | 1536×1024 / 1:1 | 1536×1024 / 1:1 | 1536×1024 / 1:1 |
| Depth of Field | 关闭 | 关闭 | 关闭 |
| Parent / Collection | CAMERAS_TARGETS | CAMERAS_TARGETS | CAMERAS_TARGETS |
| Render | Cycles 64 samples + denoise，AgX | 同左 | 同左 |

三个候选均无 lens shift，以保持 glTF 对称投影正确。每张房间占画面宽约 93%，上下留完整边界。全部 4×4 world matrix 及原始浮点参数另存于 `build_v02_metadata.json`。

**原基准 `CAM_Hero` 完全保留：**48mm；位置 {v(baseline['position_xyz_m'])}；Euler XYZ {v(baseline['rotation_xyz_degrees'])}°；瞄准点 {v(baseline['target_xyz_m'])}；Sensor 36×24mm；Shift 0/0；Clip 0.05–100m。保存时 active camera 仍是它。

在 Blender 里比较新候选：在「场景属性 → Camera」选择 `CAM_Hero_45`、`CAM_Hero_48` 或 `CAM_Hero_52`，进入相机视图查看。也可直接比较三张 PNG；该操作不代表已经确认最终 Hero。

## 4. v0.1 结构与交互复检

**独立验收：{a['summary']['pass']} 项通过，{a['summary']['fail']} 项失败，{a['summary']['warning']} 项警告。**

| 检查 | 结果 |
|---|---|
| 原 v0.1 全部 78 个对象 | 名称、类型、parent 和 collection membership 均保留；仅新增 3 相机 |
| 8 个 required collections 与 GLB 分组 | 保留 ENVIRONMENT / FURNITURE / TECH / INTERACTIVE / DISPLAY_MODELS / DECORATIONS / LIGHTING / CAMERAS_TARGETS |
| 14 个 required interactive nodes | 全部保留独立节点、world/basis/parent-inverse 矩阵和 origin；仅 Monitor 两个 mesh 的几何尺寸按授权改变 |
| 9 个 TGT targets | 名称、父级、位置和变换全部与 v0.1 一致 |
| MacBook hinge | 局部几何、origin、X 轴、0°…-105°、custom properties 均保留；106 个姿态无穿面 |
| Piano rail / parent-child | INT_Piano 为 INT_PianoRail child；默认 Y=1.29；收起 Y=1.94；0.65m 行程不变 |
| Piano clearance | 15 个全行程位置无穿面；琴顶约 z=0.654、桌板底 z=0.670，净距约 16mm |
| Trash lid | 后沿 X 轴 pivot 和 0°…-100°不变；101 个姿态无穿面 |
| Light Switch | 中心 Y 轴 pivot 和 -8°…+8°不变；33 个姿态无穿面 |
| Window | Frame / Glass 独立可选，位置与 hierarchy 不变 |
| 静态家具 | 原有家具、墙和窗帘检查通过，未发现严重穿模 |
| Cameras | 原 CAM_Hero 参数及 active 状态保留；三候选拥有独立 camera data 并正确导出 |
| 变换恢复 | 所有验收动作仅在内存测试，恢复默认状态，未覆盖 .blend / .glb |

保留的 required node names：

```text
TEC_MonitorBody       TEC_MonitorScreen
TEC_MacBookBase       TEC_MacBookScreen
TEC_iPad             TEC_Marshall             TEC_Phone
INT_PianoRail        INT_Piano
INT_TrashCanBody     INT_TrashCanLid          INT_LightSwitch
ENV_WindowFrame      ENV_WindowGlass
```

9 个 targets：`TGT_Monitor`、`TGT_MacBook`、`TGT_iPad`、`TGT_Marshall`、`TGT_Piano`、`TGT_TrashCan`、`TGT_LightSwitch`、`TGT_Phone`、`TGT_Window`。

检测采用离散姿态采样与 mesh 表面相交检查，并结合三张 Hero 预览做视觉复核；并非连续碰撞或实体家具工程验证。浏览器运行时和帧率不在本轮范围。

## 5. GLB 导出结果

- 文件大小：**{g['size_bytes']:,} bytes = {g['size_bytes']/1e6:.6f} MB**，低于 5 MB。
- 三角面：**{g['triangles']:,}**（v0.1 为 5,974）；{g['meshes']} meshes，{g['nodes']} nodes。
- 6 个原灰盒材质，0 textures / images；未加入 PBR 纹理或烘焙。
- 包含 4 个相机：原 `CAM_Hero` 与 3 个候选。GLB 没有“最终 Hero 已选定”的状态。
- glTF 2.0 标准 Y-up；保留节点名称、层级、extras、相机和 `KHR_lights_punctual`。
- 实际导入全新 Blender 场景：**{r['reimported_objects']}/{r['source_objects']} 对象**；名称、parent、origin、包围盒与三角面数一致。
- 四个相机的 world matrix 与 GLB 投影参数一致；回读矩阵最大误差 {max(c['world_matrix_max_error'] for c in r['cameras']):.3e}。
- 与 v0.1 一样，Blender World、光源柔影半径等不会由 glTF 标准完整携带；三张候选 PNG 采用相同的 Blender 灯光设置，适合相互比较构图。

验收记录：`validation_v02_results.json`、`roundtrip_v02_results.json`。制作记录：`build_v02_metadata.json`。另有原相机拍摄新布局的 `review/hero_v02_baseline_48mm.png`，便于区分家具改动与镜头改动。

## 6. 仍需用户决定

1. 最终采用 **45mm、48mm 还是 52mm**，以及是否还需微调机位或取景。
2. 展示柜 3.75m 的视觉占比、不同格室分配及大模型占位是否符合预期。
3. 当前更醒目的工作台、沙发 → 茶几 → 工作台关系，以及缩小后的 Beanbag 是否可以锁定。
4. 未来模型实际包围盒/展示比例，尤其 Eiffel Tower 与 Millennium Falcon，是否按本轮格室适配。
5. 52mm 中垃圾桶与床边的少量投影重叠是否可接受。

**等待用户确认最终 Hero Camera 和 Composition。本轮没有进入 v0.3 Interaction Prototype 或精模。**

## 附录：修改对象的准确位置

以下为对象 Location，父组均无额外变换；对于展示柜，origin 保留在原位，宽度扩展由其局部 mesh 完成。

| 对象 | v0.1 Location XYZ / m | v0.2 Location XYZ / m |
|---|---|---|
{chr(10).join(change_rows)}
'''
(OUT/'BLOCKOUT_REPORT_v02.md').write_text(report,encoding='utf-8')
names=['sharkys_room_blockout_v02.blend','sharkys_room_blockout_v02.glb','hero_45mm.png','hero_48mm.png','hero_52mm.png','BLOCKOUT_REPORT_v02.md']
with zipfile.ZipFile(OUT/'sharkys_room_blockout_v02_delivery.zip','w',zipfile.ZIP_DEFLATED) as z:
    for name in names:z.write(OUT/name,arcname=name)
with zipfile.ZipFile(OUT/'sharkys_room_blockout_v02_delivery.zip') as z: assert z.testzip() is None
deliveries={name:{'bytes':(OUT/name).stat().st_size,'sha256':hashlib.sha256((OUT/name).read_bytes()).hexdigest()} for name in names}
(OUT/'delivery_v02_manifest.json').write_text(json.dumps(deliveries,indent=2))
print(json.dumps({'validation':a['summary'],'glb_bytes':g['size_bytes'],'triangles':g['triangles'],
                  'outputs':list(deliveries),'zip_bytes':(OUT/'sharkys_room_blockout_v02_delivery.zip').stat().st_size,
                  'v01_untouched':True,'final_camera_selected':False},ensure_ascii=False,indent=2))
