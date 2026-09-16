# Codex Task — Build Sharky's Room Blender Blockout v0.1

你现在负责第一阶段 Blender Blockout。请严格阅读本文件夹中的：
- room_master_reference.jpeg
- BLENDER_BLOCKOUT_SPEC.md
- INTERACTIONS.md
- SCENE_HIERARCHY.md
- ASSET_LIST.csv

## Objective
创建一个轻量、结构清晰、可导出到 Web 的 Sharky's Room Blender greybox。

## Priority
1. Hero Camera 构图
2. 房间/家具比例
3. 交互对象分离、命名、pivot
4. 无严重穿模
5. GLB export correctness
6. 性能
7. 细节（最低优先级）

## Important
不要尝试直接完成最终视觉效果。
不要精模 LEGO 或品牌设备。
不要因为视觉方便而合并 interactive objects。
不要擅自改变 required object names。

## Required outputs
- sharkys_room_blockout_v01.blend
- sharkys_room_blockout_v01.glb
- hero_camera_preview.png
- BLOCKOUT_REPORT.md

`BLOCKOUT_REPORT.md` 说明：
- 已完成内容
- 使用的主要尺寸
- Hero camera 参数
- GLB 大小
- required nodes 检查结果
- 仍需人工确认的问题

## Final validation checklist
- [ ] Hero composition resembles reference
- [ ] Required collections exist
- [ ] Required interactive nodes exist
- [ ] MacBook hinge works
- [ ] Piano slides without clipping
- [ ] Trash lid opens
- [ ] Light switch pivot works
- [ ] Window independently selectable
- [ ] GLB exports successfully
- [ ] Names/hierarchy survive export
- [ ] No unnecessary high-poly geometry

完成 blockout 后停止，不要自行进入精模阶段，等待下一轮 review。
