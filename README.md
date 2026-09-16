# WebRoom · Sharky's Room

个人交互式 3D 房间项目。目前为 **v0.3 — WEB FOUNDATION COMPLETE**。冻结的 FINAL GLB 已接入本地 Next.js + React Three Fiber 页面，保持 48mm Hero 构图和原始场景结构，完成 9 项悬停／点击／触屏识别。已停止在 v0.3，等待 review；尚未进入正式交互动画或精模。

## v0.3 本地网页

- [Web 项目与启动说明](sharkys-room/README.md)
- [Web Foundation 验收报告](sharkys-room/WEB_FOUNDATION_REPORT.md)
- [桌面截图](sharkys-room/validation/web_desktop_1440.png) · [手机截图](sharkys-room/validation/web_mobile_390.png)

```bash
cd sharkys-room
npm install
npm run dev
```

打开 http://127.0.0.1:3000 ，悬停／点击物件后查看页脚 semantic ID。当前只验证识别。37 项契约测试、361 项资产检查与 39 项浏览器检查通过。

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
