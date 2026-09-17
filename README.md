# WebRoom · Sharky's Room

个人交互式 3D 房间项目。目前为 **v0.4.1 — PIANO DISCOVERABILITY FIX**。钢琴收回后，可直接点击／轻点桌前下方重新抽出。保留 v0.4 的 9 项交互、GSAP 相机与机构动作、Back / ESC、移动触屏与减少动态效果。FINAL GLB 和空间冻结源文件保持不变。本轮停在 v0.4.1，等待 review，不自动进入 v0.5。

## v0.4.1 本地交互原型

- [项目与启动／操作说明](sharkys-room/README.md)
- [v0.4.1 钢琴发现性修复报告](sharkys-room/V0.4.1_PIANO_DISCOVERABILITY_REPORT.md)
- [v0.4 Interaction Prototype 验收报告](sharkys-room/INTERACTION_PROTOTYPE_REPORT.md)
- [Hero](sharkys-room/validation/v04/v04_hero.png) · [MacBook](sharkys-room/validation/v04/v04_macbook_open.png) · [手机交互](sharkys-room/validation/v04/v04_mobile_focus.png)
- [历史：v0.3 Web Foundation 报告](sharkys-room/WEB_FOUNDATION_REPORT.md)

```bash
cd sharkys-room
npm install
npm run dev
```

打开 http://127.0.0.1:3000 ，点击／轻点物件聚焦，Back 或 ESC 返回；也可使用页脚 Explore objects 选择器。v0.4 历史验收结果保留；v0.4.1 验收结果见本次钢琴修复报告。

## 最终 Blockout

![Final Hero Camera](blockout_FINAL/hero_FINAL.png)

- [FINAL Blender 场景](blockout_FINAL/sharkys_room_blockout_FINAL.blend)
- [FINAL GLB 模型](blockout_FINAL/sharkys_room_blockout_FINAL.glb)
- [最终报告](blockout_FINAL/BLOCKOUT_FINAL_REPORT.md)
- [四项交付包](blockout_FINAL/sharkys_room_blockout_FINAL_delivery.zip)
- [空间冻结快照](blockout_FINAL/spatial_freeze_manifest.json)

默认相机为 `CAM_Hero_FINAL`，精确复制已选定的 `CAM_Hero_48`。109 项检查通过，GLB 0.412 MB、6,566 三角面。v0.1 / v0.2 历史交付保持不变。

## 历史：v0.2 镜头候选

以下为 v0.2 的三个历史候选；其中 48mm 已在 v0.2.1 正式选定并复制为 FINAL。旧相机保留作历史记录，不作为默认相机。

| A · 45mm | B · 48mm | C · 52mm |
| --- | --- | --- |
| ![45mm 候选](blockout_v02/hero_45mm.png) | ![48mm 候选](blockout_v02/hero_48mm.png) | ![52mm 候选](blockout_v02/hero_52mm.png) |

- [v0.2 Blender 场景](blockout_v02/sharkys_room_blockout_v02.blend)
- [v0.2 GLB 模型](blockout_v02/sharkys_room_blockout_v02.glb)
- [v0.2 修改与验收报告](blockout_v02/BLOCKOUT_REPORT_v02.md)
- [v0.2 六项交付包](blockout_v02/sharkys_room_blockout_v02_delivery.zip)

v0.2 保留已验证的节点、层级、9 个交互目标和机械轴心；84 项检查通过，GLB 约 0.378 MB、6,010 三角面。v0.1 的原始交付保持不变，以下仍可查阅。

## v0.1 基础场景

- 房间与家具的灰盒模型、Hero Camera 和灯光占位。
- 独立交互节点、焦点目标，以及钢琴抽拉、屏幕与垃圾桶盖铰链的轴心设置。
- 可编辑 Blender 源文件、GLB 导出、预览图和验收记录。

v0.1 为历史建模阶段；网页基础已在 v0.3 实现。当前未进入精细建模和最终材质阶段。

## 文件导航

| 位置 | 内容 |
| --- | --- |
| [Sharkys_Room_Blockout_Pack](Sharkys_Room_Blockout_Pack/README.md) | 参考图、建模规格、交互约定和资源清单 |
| [Blender 源文件](blockout_v01/sharkys_room_blockout_v01.blend) | 可在 Blender 中编辑的首版场景 |
| [GLB 模型](blockout_v01/sharkys_room_blockout_v01.glb) | 后续网页加载使用的模型 |
| [制作与验收报告](blockout_v01/BLOCKOUT_REPORT.md) | 尺寸、节点、导出结果及待确认事项 |
| [制作和检查脚本](blockout_v01/scripts/) | 本版本的构建、验证和报告脚本 |
| [首版交付包](blockout_v01/sharkys_room_blockout_v01_delivery.zip) | 源模型、GLB、预览图和报告的打包文件 |

## 查看方式

下载项目后，使用 Blender 打开 `blockout_FINAL/sharkys_room_blockout_FINAL.blend`；仅查看构图可直接打开 `blockout_FINAL/hero_FINAL.png`。场景默认使用 `CAM_Hero_FINAL`，历史文件仅供对照。

模型细节、检查范围及后续需要人工确认的内容见制作与验收报告。
