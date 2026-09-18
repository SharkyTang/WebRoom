# Phone 与支架 / v0.6B

原创风格化近似，沿用当前旧三件/A 暂定材质，不声称制造型号复刻；用户视觉确认另列。没有下载品牌模型、商标或外部图片。

手机本体仍在原 x±.0415 / y±.0825 / z[-.0085,.012] m 内。独立 VIS_PhoneStand 含水平底座、背支柱、下托台与前挡边；底座顶点按原 -12° 锚点逆变换烘焙，根变换恒等。支架限定实际自由空间 world x[.09,.23], y[.740,.93], z[-1.84,-1.67]；最低世界 y≈.7405 m，0.5 mm 接触余量。真实射线检验托台承接手机下缘，不调整手机锚点。

- 可编辑源：`blender-assets/phone_v06b.blend`；导出：`public/models/production/phone_v06b.glb`。
- 重建：`node scripts/assets/build-interactive-assets.mjs phone`（只覆盖所选 B 产物；手改前另存）。
- 装配：`VIS_PhoneBody` → `TEC_Phone`，身份、父级、原布局与原 target 不变；显示面是独立可寻址子节点，外壳不跟随屏幕发光。
- 标准 PBR、完整 UV/法线，0 嵌入贴图；运行时 Canvas 256×512 Contact 占位标题，没有真实数据、联系方式、链接或仿系统页面。
- 实际导出：1220 三角面、4 可视网格、3 材质、39,068 B GLB。各部件在同一固定根内按材质合并，显示面/支架结构保持可单独验证。
- 技术证据：第一块 iPad `validation/v06b/stages/02-ipad-pilot.json/png`；本组几何与浏览器记录见 `validation/v06b/stages/02-*` 和 `stage-screens/`。Phone 首轮支柱低点测试失败，已修短支柱重新导出，原失败日志保留；最终以本批报告为准。
