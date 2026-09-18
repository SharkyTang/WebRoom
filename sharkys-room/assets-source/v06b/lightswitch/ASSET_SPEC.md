# lightswitch / v0.6B

原创近似造型，当前旧三件/A 为暂定风格基线，用户视觉待确认。无品牌模型/外部纹理。

暖白聚合物面板、暗色嵌槽、独立圆角拨片和非发光实体刻线。固定面板与可动拨片分根，均在原包络内；正面朝原 +X 方向。沿用原 ±8° 拨片与统一灯开关，没有三组独立状态或新光源。

- 可编辑源 `blender-assets/lightswitch_v06b.blend`；网页导出 `public/models/production/lightswitch_v06b.glb`。
- 重建 `node scripts/assets/build-interactive-assets.mjs lightswitch`，只覆盖该 B 产物。
- 原锚点装配：VIS_LightSwitchPlate → DEC_LightSwitchPlate；VIS_LightSwitchRocker → INT_LightSwitch。根恒等，不复制运动/节点身份，不新增动画/相机/灯。
- 标准PBR/UV/法线；0嵌入或外部纹理。832 三角面，4 Blender网格，4 glTF primitives，2 材质，27,244 B。
- 内腔/轴心/包络与装配释放由真实GLB几何测试验证；网页故障回退和阶段证据见本批报告。开盖/退出关盖、原彩蛋、总控逻辑均继承原网页。

网页近景曾观察到面板与嵌槽共面闪纹，面板厚度从 .029 收至 .025 m（仍在原包络），分离前表面后重新导出/截图/18项阶段复测通过，原失败/旧画面保留。
