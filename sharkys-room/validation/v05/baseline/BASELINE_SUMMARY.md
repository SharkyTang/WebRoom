# v0.5 开始前的 v0.4.1 基线验收

- 起点：`7dfed76ec317ecfabc229826fb85255bb2051fc5`，开始时工作区干净。
- 本阶段未修改应用源码、冻结资产、相机、交互状态机或既有测试。钢琴专项只运行更换证据输出目录的临时副本，运行后删除。
- 源资产检查 361/361；TypeScript exit 0；单元测试 68/68。
- 浏览器检查合计 91 通过、0 失败。开发服务3000、生产服务3001均实际加载成功。

| 套件 | 通过 | 失败 | 证据 |
| --- | ---: | ---: | --- |
| browser | 34 | 0 | browser/browser_validation.json |
| interactions | 37 | 0 | interactions/interaction_browser.json |
| piano-development | 10 | 0 | piano/piano-browser.json |
| production | 7 | 0 | production/production_smoke.json |
| piano-production | 3 | 0 | piano/piano-production.json |

## 冻结输入

| 文件 | 字节 | SHA-256 |
| --- | ---: | --- |
| ../blockout_FINAL/sharkys_room_blockout_FINAL.blend | 713580 | fbf6ed79e728867947fb293b9ebb70d314c2289517e9837cc3085f69fe334720 |
| ../blockout_FINAL/sharkys_room_blockout_FINAL.glb | 411892 | f34b3c665ba7b08e583325bef5e3c2024f45e43ebb12a6735aa3b13a97758da2 |
| public/models/sharkys_room_blockout_FINAL.glb | 411892 | f34b3c665ba7b08e583325bef5e3c2024f45e43ebb12a6735aa3b13a97758da2 |
| lib/room/frozenSceneManifest.json | 27894 | 84b793cdaba786d647ccde41e4c653ef64a4bcf3d0afd9d693f49a0064521f53 |
| package.json | 1110 | 55e3e2baa5d48dc45e9e684ea3ebb869fbb8a2b8384c7912b896328b51243388 |
| package-lock.json | 77324 | afe3baf7ba7a81ef8e5a687d1733f79888c43d95342080b39a1bf22e01c41d69 |

## 同条件 Hero 性能与截图

Chrome 152.0.7977.83，headless，ANGLE SwiftShader，DPR1。现有 \?debug=1 连续诊断采样；相机名 CAM_Hero_FINAL，aspect 1.5。frameMs 是现有调试器的帧间隔，并非GPU耗时。

| Viewport | Draw calls | 渲染三角面 | frameMs | 截图 |
| --- | ---: | ---: | ---: | --- |
| 1440×900 | 72 | 6566 | 16.6656 | hero-1440.png |
| 390×844 | 72 | 6566 | 16.6689 | hero-390.png |

## 钢琴入口与设备边界

桌面鼠标和390×844触屏仿真均通过真实用户输入完成“展开→收回→Back→Hero桌下入口重新发现→点击/轻点再次抽出”，该重开路径未使用 Explore objects。桌面4轮重开、整数像素触屏区域、展开后入口禁用、邻近非交互区域、reduced-motion、busy时Back和静止后停止渲染均保留既有断言；生产版本也在无调试API情况下复用记录像素完成同一路径。

retracted local Z = -1.9399999618530273；extended local Z = -1.2899999618530273；行程0.65m。

真实手机、Safari及真实GPU未测试。生产测试使用现有v0.4.1运行产物；v0.5实施后仍需新建生产构建并重新验收。

依赖与完整相机/机械快照见 source-baseline.json、hero-performance.json、baseline-summary.json。
