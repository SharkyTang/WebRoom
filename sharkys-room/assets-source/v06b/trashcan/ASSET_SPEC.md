# trashcan / v0.6B

原创近似造型，当前旧三件/A 为暂定风格基线，用户视觉待确认。无品牌模型/外部纹理。

真实中空桶身：连续旋转截面包含外壁、卷边、内壁和内底，无封口假平面。原后沿桶盖 pivot 与开合角度保留。原盖与桶口间有约11.5mm缝，新增局部 y=-.026 m 的内裙边，半径.176 m，小于桶口内径半径.178 m；只延展盖内侧以衔接开口，不移动桶身/轴心。

- 可编辑源 `blender-assets/trashcan_v06b.blend`；网页导出 `public/models/production/trashcan_v06b.glb`。
- 重建 `node scripts/assets/build-interactive-assets.mjs trashcan`，只覆盖该 B 产物。
- 原锚点装配：VIS_TrashCanBody → INT_TrashCanBody；VIS_TrashCanLid → INT_TrashCanLid。根恒等，不复制运动/节点身份，不新增动画/相机/灯。
- 标准 PBR/UV/法线；0 嵌入或外部纹理。B 初次导出为 1,912 三角面、4 glTF primitives、2 材质、57,508 B。2026-09-19 修整导出为 2,772 三角面、7 primitives、2 材质、88,696 B。
- `VIS_TrashCanFixedHinge` 归属桶身，包含后支座、两侧固定套筒及轴销；`VIS_TrashCanMovingKnuckle` 归属盖子，包含中间活动套筒及连接颈。轴心严格使用原盖节点，不移动桶身，不修改原 100° 开盖角度。
- 原 `VIS_TrashCanHollowShell` 的 position/normal/UV/index 缓冲完全一致。盖后沿增加真实轴孔，套筒内径半径 3.4 mm、轴销半径 2.5 mm，保留转动间隙；不增加封口面。固定支座限于桶身局部 x±.075、y[.190,.257]、z[-.207,-.169] m 后侧走廊。
- 0–100° 共 33 个角度采样，检查活动盖/铰链与连续桶壁、固定铰链的真实三角面相交；网页分别检查进入开盖及返回关盖。
- 内腔/轴心/包络与装配释放由真实GLB几何测试验证；网页故障回退和阶段证据见本批报告。开盖/退出关盖、原彩蛋、总控逻辑均继承原网页。
