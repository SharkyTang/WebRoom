# iPad / v0.6B

原创风格化近似，沿用当前旧三件/A 暂定材质，不声称制造型号复刻；用户视觉确认另列。没有下载品牌模型、商标或外部图片。

薄缎面金属机身、黑玻璃边框与倒角、独立显示面。机身局部包络仍在原 x±.125 / y[-.0075,.010] / z±.09 m 内。显示面朝 +Y、顶部朝 -Z；实际导出 UV 检查不翻转/镜像。

- 可编辑源：`blender-assets/ipad_v06b.blend`；导出：`public/models/production/ipad_v06b.glb`。
- 重建：`node scripts/assets/build-interactive-assets.mjs ipad`（只覆盖所选 B 产物；手改前另存）。
- 装配：`VIS_iPadBody` → `TEC_iPad`，身份、父级、原布局与原 target 不变；显示面是独立可寻址子节点，外壳不跟随屏幕发光。
- 标准 PBR、完整 UV/法线，0 嵌入贴图；运行时 Canvas 512×360 Memories 占位标题，没有真实数据、联系方式、链接或仿系统页面。
- 实际导出：756 三角面、3 可视网格、3 材质、25,776 B GLB。各部件在同一固定根内按材质合并，显示面/支架结构保持可单独验证。
- 技术证据：第一块 iPad `validation/v06b/stages/02-ipad-pilot.json/png`；本组几何与浏览器记录见 `validation/v06b/stages/02-*` 和 `stage-screens/`。Phone 首轮支柱低点测试失败，已修短支柱重新导出，原失败日志保留；最终以本批报告为准。
