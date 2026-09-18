# headphones / v0.6B

原创风格化桌面配件；以冻结占位和当前旧三件/A 暂定风格为准，不声称特定型号复刻，用户视觉待确认。

弧形头梁与内衬、左右圆润耳罩/软垫、真实中央支杆、托座与底座。支杆在三个高度有真实可射线命中表面，托座承接头梁。整体仍在原 TEC_Headphones 包络内，底座世界最低 y≈.7405m；不借摆件遮挡 Phone/Marshall。

- 可编辑源 `blender-assets/headphones_v06b.blend`；导出 `public/models/production/headphones_v06b.glb`。
- 重建：`node scripts/assets/build-interactive-assets.mjs headphones`，只覆盖该 B 产物，手改前另存。
- 独立恒等根挂回原 TEC 节点，仍为静态非语义配件；不增加第十个交互 ID、目标、页面或状态。
- 标准PBR，完整 UV/法线，0 嵌图/外部纹理；按同一固定根和材质合并，不跨任何独立轴心。
- 实际 3292 三角面、3 可视网格、3 材质、81,196 B GLB。
- 几何、真实网页可见性、静态点击及周边入口证据见 `validation/v06b/stages/04-*`、`stage-accessories/` 和整批最终报告。
