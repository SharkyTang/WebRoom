# Sharky's Room — 资产生产与接入指南（v0.5）

本轮在 v0.4.1 工程中接入 Monitor、MacBook、Marshall。冻结房间负责空间、语义锚点、相机和机械运动；独立 GLB 只提供锚点局部坐标内的视觉部件。此流程可供后续已获授权的资产使用，本文不启动下一版本。

## 1. 文件与复现

| 内容 | 路径 |
| --- | --- |
| 尺寸、材质、UV、来源和使用限制 | `assets-source/{monitor,macbook,marshall}/ASSET_SPEC.md` |
| 实测源锚点与包围盒 | `assets-source/source-anchor-measurements.json` |
| 可编辑 Blender 源 | `blender-assets/*_pilot.blend` |
| 实际网页资源 | `public/models/production/*_pilot.glb` |
| 原创织物纹理 | `assets-source/marshall/woven_grille_basecolor_512.png` |
| 参数化建模、导出、重新导入检查 | `scripts/assets/build_production_assets.py` |
| 导出后的源尺寸与屏幕 UV 读回检查 | `scripts/assets/inspect_export_contract.mjs` |
| 装配登记与状态表面 | `lib/room/assets/assetManifest.ts` |

从项目根目录运行，已验证 Blender 5.2.1 LTS：

```sh
npm run assets:build                 # 重建三件源文件和 GLB
npm run assets:build -- macbook      # 只重建指定家族
node scripts/assets/inspect_export_contract.mjs
npm run verify:asset
npm run typecheck
npm test
npm run build
```

脚本优先使用 `BLENDER_BIN`，否则使用 macOS 的 `/Applications/Blender.app/Contents/MacOS/Blender`，再回退到 PATH 中的 `blender`。其他平台可设置 `BLENDER_BIN` 指向安装程序。生成器会覆盖所选家族的 `.blend`、GLB、统计和纹理；手工修改 `.blend` 前先保存副本，或将修改回写到生成脚本以便复现。它不会改写 FINAL 文件。

直接编辑现有 `.blend` 后，可使用 Blender 的 **File → Export → glTF 2.0** 导出至同名 GLB：格式 GLB、+Y Up、Apply Modifiers、UVs、Normals、Materials、Custom Properties 开启；Cameras、Lights、Animations 关闭；不启用压缩。导出全部且仅包含该家族的规定根节点，随后运行上述读回和测试命令。手工导出后须重新记录统计与截图，不能沿用旧统计宣称新模型通过。

## 2. 先量空间，再建几何

1. 读取未装配的 FINAL，记录目标锚点的类型、父级、TRS、局部/世界包围盒、朝向、桌面接触位置与活动净空。Mesh 锚点本身也可能带旧几何；不要假定每个锚点都是 Group。
2. 在 ASSET_SPEC 中明确风格化近似、参考来源和允许包络。不得移动桌子、邻物、targets 或 Hero 来适应新模型。
3. 确定哪些部件随哪个原锚点运动。为独立屏幕/指示灯建独立节点和材质，不依赖子节点数组顺序。
4. 优先轮廓、厚度、倒角和近景可辨细节。重复键帽/旋钮按材质合并；织物用合理尺寸纹理。不要逐键增加材质或逐孔堆几何。

本轮只使用已有房间参考图作造型参考，不将它们复制为贴图。三件几何和织物 PNG 均为本项目原创程序化制作，未下载产品模型、字标或纹理。型号和尺寸均不声称是实物规格。

## 3. 坐标与部件合同

单位是米，Web 使用 glTF Y-up。生成器将 Web 顶点 `(x,y,z)` 一次转换为 Blender `(x,-z,y)`，标准 glTF 导出再转换回来。Web 不加第二次全局旋转。各导出根节点 position=0、quaternion=identity、scale=1，无适配矩阵。

| GLB 根 | 挂接的原锚点 | 标准姿态/朝向 |
| --- | --- | --- |
| `VIS_MonitorBody` | `TEC_MonitorBody` | 前 +Z，上 +Y |
| `VIS_MonitorDisplaySurface` | `TEC_MonitorScreen` | 独立屏幕面，前 +Z |
| `VIS_MacBookBase` | `TEC_MacBookBase` | 桌面上的原底座包络 |
| `VIS_MacBookLid` | `TEC_MacBookScreen` | **闭合**定义，沿 +Z 延伸；所有上盖部件在此根下 |
| `VIS_MarshallBody` | `TEC_Marshall` | 前 +Z，上方控制区 +Y |

源文件内多个根各在自己的锚点原点，不能把它们在 Blender 中重叠的局部坐标误当成装配错误。若需要合体预览，只在临时预览副本中使用原锚点相对位置：Monitor 屏幕相对机身为 Web `(0,0,.036)`；MacBook 上盖相对底座为 Web `(0,.019,-.1175)`，并施加原铰链旋转。预览变换不可烘焙进导出根，也不可重复加到 Web。

MacBook 闭合四元数 `[0,0,0,1]`，打开仍使用原 `TEC_MacBookScreen` 四元数 `[-.7933533787727356,0,0,.6087614297866821]`，局部 X 约 -105°。不要把打开造型烘入上盖再由父节点打开第二次。更改几何后重新检查 21 个角度净空和 20 轮浏览器开合。

## 4. UV、PBR 与屏幕

使用标准 metallic/roughness PBR。数据型贴图保持线性；颜色贴图用 sRGB。记录像素尺寸、实际文件字节、UV 和共享关系，压缩后的 PNG 字节不能代替显存估计。

- Monitor 显示面：+Y 顶边 V=0、底边 V=1，左 U=0、右 U=1。
- MacBook 显示面：闭合面法线 -Y；闭合 +Z 边打开后成为顶边，因此该边 V=0，铰链边 V=1。必须用打开姿态的读回结果验方向。
- 两块屏幕由 `screenTextures.ts` 创建 sRGB CanvasTexture，`flipY=false`。Monitor 为 1024×512，MacBook 为 512×320；材质的 map 和 emissiveMap 共享同一张图。
- 纹理仅在初始和激活状态变化时绘制，`setActive` 对同状态直接返回；不能把静态文字重绘放入帧循环。
- Marshall 网罩用 512×512 原创颜色纹理并嵌入 GLB。小灯 `VIS_MarshallPowerIndicator` 独立绑定；箱体和网罩不随 Power 发光。

屏幕仅呈现 Projects / About / Education 占位。可访问的完整操作保留在 HTML 面板中。

## 5. 接入、回退与释放

在 `assetManifest.ts` 集中登记 URL、命名前缀、各根/锚点关系、必需节点、活动部件归属及状态表面。新增 visual 节点使用唯一的 VIS 前缀，不复制 TEC、INT、TGT 名称。

加载顺序为 FINAL → 未装配源契约 → 并行下载各家族 → 每个家族完整校验 → 原子装配 → 装配契约 → 挂接交互运行时。所有家族成功或回退后才进入 ready，因此没有在活动 tween 中途换绑定对象的情况。

`assetAssembly.ts` 将正式根直接挂到原锚点。旧 Mesh 的材质暂时换成 invisible material，并将其 raycast 替换为空函数；保留 Mesh 节点本身的 visible=true，让新子树正常显示。原 Group 中的旧 primitives 同样处理。新模型真实几何沿祖先锚点解析原 semantic ID。钢琴的 v0.4.1 专用入口保持现有实现。

家族任一必要节点、纹理解码或父级合同失败，就保留该家族完整 proxy；其余家族继续使用。页脚提示“暂用基础模型”，空闲时可点击“刷新重试”，从新加载实例重试。刷新会恢复初始交互状态；本轮不实现正在操作时热切换模型。开发者可临时让该家族 URL 返回 404 验证回退，完成后恢复路径并刷新；这不是正式模型验收通过。

资源所有权：

- 每次 GLTFLoader 结果不共享全局缓存；在部件移出加载场景前捕获其 geometry/material/texture，去重后释放一次，ImageBitmap 同步 close。
- 源 FINAL 有独立 owner，不能被新资产的 cleanup 释放。
- CanvasTexture、状态材质克隆、隐藏材质由装配层拥有；悬停材质由悬停 effect 拥有。
- mechanism teardown 先停止 tween 并恢复状态材质，随后撤销装配，再释放源资源。悬停 cleanup 只恢复自己仍占用的材质，不覆盖 Power 操作的新材质。
- 取消信号和每个异步延续都检查卸载状态，晚到加载结果只清理，不装回新页面；dispose 是幂等的。

## 6. 验收命令与证据

启动开发服务 3000 后，顺序执行：

```sh
ROOM_TEST_OUTPUT=validation/v05/v03-regression npm run test:browser
ROOM_TEST_OUTPUT=validation/v05/v04-regression npm run test:interactions
ROOM_TEST_OUTPUT=validation/v05/piano npm run test:piano
npm run test:assets
ROOM_ASSET_PERFORMANCE_ONLY=1 ROOM_TEST_OUTPUT=validation/v05/performance npm run test:assets
```

性能单独采样期间不要并行构建或运行其他浏览器套件。默认测试用已安装 Chrome 与 ANGLE SwiftShader，DPR1；`CHROME_PATH`、`ROOM_TEST_URL` 可改路径/地址。触屏为 390×844 仿真。改路径或浏览器后须在报告标注环境差异。

完成 `npm run build` 并用当前构建重启生产服务 3001 后：

```sh
ROOM_TEST_OUTPUT=validation/v05/production npm run test:production
ROOM_TEST_OUTPUT=validation/v05/piano ROOM_TEST_PRODUCTION=1 npm run test:piano
ROOM_TEST_PRODUCTION=1 npm run test:assets
```

后两项使用开发专项记录的实际可见几何/桌下入口像素，在生产环境用真实 mouse/touch 操作，并断言没有调试 API。正式资产专项默认读取 `validation/v05/production-assets-browser.json`；自定义开发证据位置时，使用 `ROOM_ASSET_DEV_EVIDENCE=/绝对路径/production-assets-browser.json` 指定。钢琴专项使用同一 `ROOM_TEST_OUTPUT` 目录读取开发坐标。

必须同时检查 source 契约和 assembly 契约。85 是原节点数；加入正式部件后当前运行时为 142，不能把原检查删掉，也不能强行把运行时总数固定成 85。屏幕方向、接触关系、近景材质、真实点击和钢琴重开要查看浏览器证据，不能只看单元测试。未测的真实手机、Safari 和硬件 GPU 应保持“未测试”。
