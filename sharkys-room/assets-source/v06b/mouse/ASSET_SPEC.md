# mouse / v0.6B

原创风格化桌面配件；以冻结占位和当前旧三件/A 暂定风格为准，不声称特定型号复刻，用户视觉待确认。

封闭曲面鼠身、两片贴合曲率的独立左右按键表皮、中缝、实体滚轮和底部脚垫。左右键间有真实几何间隔，没有点击功能。原X/Z占位和上沿不变，底垫到局部 y=-.0255 m，承接既有桌面。

- 可编辑源 `blender-assets/mouse_v06b.blend`；导出 `public/models/production/mouse_v06b.glb`。
- 重建：`node scripts/assets/build-interactive-assets.mjs mouse`，只覆盖该 B 产物，手改前另存。
- 独立恒等根挂回原 TEC 节点，仍为静态非语义配件；不增加第十个交互 ID、目标、页面或状态。
- 标准PBR，完整 UV/法线，0 嵌图/外部纹理；按同一固定根和材质合并，不跨任何独立轴心。
- 实际 1820 三角面、3 可视网格、3 材质、49,428 B GLB。
- 几何、真实网页可见性、静态点击及周边入口证据见 `validation/v06b/stages/04-*`、`stage-accessories/` 和整批最终报告。

近景检查后，下半壳改为宽平底连续曲面，并用隐藏在外轮廓内的椭圆脚垫替代矩形脚垫；保留旧截图并在 stage-accessories-r2 重新验证。
