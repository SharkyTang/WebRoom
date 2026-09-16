# Sharky's Room --- Blockout v0.2.1 Final Composition Lock

基于当前已经完成并验证的 `sharkys_room_blockout_v02.blend`，开始
**Blockout v0.2.1 --- Final Composition Lock**。

本阶段是 Blender Blockout 的最后一次构图调整。完成并通过验证后，Blockout
的空间布局、Hero Camera、交互节点和主要家具位置将被冻结，下一阶段进入
Web Foundation。

## 1. 锁定最终 Hero Camera

正式选择 v0.2 中的 `CAM_Hero_48` 作为最终 Hero Camera，并复制/重命名为
`CAM_Hero_FINAL`。

要求： - Focal Length = 48mm - 保留 `CAM_Hero_48` 已验证的 position /
rotation / target / FOV - 不再寻找新机位或创建新候选 - 将
`CAM_Hero_FINAL` 设置为 Scene Active Camera -
保留旧候选相机作为历史记录，但不得作为默认 Camera

## 2. Display Cabinet --- 最后一次层板优化

保留 v0.2 展示柜整体尺寸：Width ≈ 3.75m、Depth ≈ 0.60m、Height ≈
2.60m。禁止继续扩大或移动整个展示柜。

仅调整内部 shelf / compartment layout，使其更像 LEGO / collectible
display wall。增加不同尺寸格室并保持非对称层次，同时继续为 Eiffel
Tower、Millennium Falcon、Hogwarts/large architecture、Tower
Bridge、SLS、Ferrari F1、Mercedes-AMG F1 和中小模型预留空间。

Eiffel/SLS 需要 tall compartment；Falcon 需要 wide compartment；F1
可使用低矮横向格室。不得为了增加格子而导致未来大型模型穿模。Bounding-box
proxies 仅做最小必要调整。禁止制作正式 LEGO 模型。

## 3. Front-right Pedestal → Small Round Side Table

将 Beanbag 附近前景的方形 pedestal/cube-like object 替换为与
`room_master_reference.jpeg` 更接近的小型圆桌 `FUR_SideTable`。

结构建议： - Round tabletop - Simple thin legs / central support

要求：尺寸小、视觉轻、不抢 Beanbag/Bed 焦点，并维持
`Dog Area → Side Table → Beanbag → Bed` 动线。桌面可保留简单 lamp/cup
proxy，不精模。替换前检查原对象 dependency，避免破坏 hierarchy。

## 4. Composition 正式冻结

除上述展示柜内部与前景小圆桌外，禁止继续调整： Room
dimensions、Floor/cutaway、Walls、Window、Door、Desk、Monitor
position、MacBook、Phone、Marshall、Keyboard/Mouse/Headphones、Piano、Office
Chair、Bed、Sofa、Coffee Table、iPad、Beanbag、Trash Can、Light
Switch、Dog area。

保留当前 `Sofa → Coffee Table → Workstation` 视觉关系。

## 5. Interactive Architecture 完全冻结

以下节点不得 rename/join/merge/delete，不得改变 parent、origin、pivot
或已验证机制：

`TEC_MonitorBody`, `TEC_MonitorScreen`, `TEC_MacBookBase`,
`TEC_MacBookScreen`, `TEC_iPad`, `TEC_Marshall`, `TEC_Phone`,
`INT_PianoRail`, `INT_Piano`, `INT_TrashCanBody`, `INT_TrashCanLid`,
`INT_LightSwitch`, `ENV_WindowFrame`, `ENV_WindowGlass`.

保留全部 targets： `TGT_Monitor`, `TGT_MacBook`, `TGT_iPad`,
`TGT_Marshall`, `TGT_Piano`, `TGT_TrashCan`, `TGT_LightSwitch`,
`TGT_Phone`, `TGT_Window`.

继续保证 MacBook hinge、Piano 0.65m pull-out、Trash lid、Light Switch
toggle、Window Frame/Glass 独立均正常。

## 6. 本阶段禁止事项

不要精模；不要制作正式 LEGO/最终家具/PBR/textures；不要加入复杂
lighting、Weather VFX、React、R3F、GSAP；不要开始 Interaction
Prototype；不要修改冻结的 furniture composition 或重新设计 Scene
Hierarchy。

本阶段唯一目标是 Final Composition Lock。

## 7. Validation

完成后重新执行 v0.2 完整 validation，至少检查： required collections、14
required interactive nodes、9 focus
targets、hierarchy、origins/pivots、MacBook hinge、Piano full slide
range/clearance、Trash lid、Light Switch、Window independent
nodes、static intersection、GLB export、GLB
round-trip、`CAM_Hero_FINAL`。

确保展示柜和 Side Table 修改没有引入明显穿模。

## 8. Final Deliverables

输出： - `sharkys_room_blockout_FINAL.blend` -
`sharkys_room_blockout_FINAL.glb` - `hero_FINAL.png` -
`BLOCKOUT_FINAL_REPORT.md`

`hero_FINAL.png` 必须使用 `CAM_Hero_FINAL` 渲染。

报告记录：v0.2→v0.2.1 修改、Final Hero Camera
参数、最终房间/主要家具尺寸、展示柜格室布局、interactive
node/pivot/mechanism validation、GLB size、triangle count、round-trip
result、warnings/unresolved issues。

## 9. Final Blockout Freeze

若全部 validation 通过，将版本标记：

**SHARKY'S ROOM --- BLOCKOUT FINAL / COMPOSITION LOCKED**

从此作为 Web 与正式建模的 spatial source of
truth。后续资产替换尽可能保持 World position、overall bounding
box、Camera、Interaction target、Pivot、Parent hierarchy。

完成后立即停止。不要自行开始 v0.3。等待 **v0.3 --- Web Foundation**
任务说明。
