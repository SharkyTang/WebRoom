# trashcan / v0.6B

原创近似造型，当前旧三件/A 为暂定风格基线，用户视觉待确认。无品牌模型/外部纹理。

真实中空桶身：连续旋转截面包含外壁、卷边、内壁和内底，无封口假平面。原后沿桶盖 pivot 与开合角度保留。原盖与桶口间有约11.5mm缝，新增局部 y=-.026 m 的内裙边，半径.176 m，小于桶口内径半径.178 m；只延展盖内侧以衔接开口，不移动桶身/轴心。

- 可编辑源 `blender-assets/trashcan_v06b.blend`；网页导出 `public/models/production/trashcan_v06b.glb`。
- 重建 `node scripts/assets/build-interactive-assets.mjs trashcan`，只覆盖该 B 产物。
- 原锚点装配：VIS_TrashCanBody → INT_TrashCanBody；VIS_TrashCanLid → INT_TrashCanLid。根恒等，不复制运动/节点身份，不新增动画/相机/灯。
- 标准PBR/UV/法线；0嵌入或外部纹理。1912 三角面，3 Blender网格，4 glTF primitives，2 材质，57,508 B。
- 内腔/轴心/包络与装配释放由真实GLB几何测试验证；网页故障回退和阶段证据见本批报告。开盖/退出关盖、原彩蛋、总控逻辑均继承原网页。
