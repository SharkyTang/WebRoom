# Plants / 原五处植物 / v0.6C

模型制作：实际可编辑源与 GLB 已生成。网页登记：当前 manifest 已登记。技术验收：导出往返数据与实际几何结果分别记录，不把文件生成等同全量浏览器验收。用户视觉确认：**待确认**。

## 造型与来源

花盆、盆口/土面、茎叶层次；保持原植物锚点和设备入口。

原创程序化几何，由 `scripts/assets/build_collection_decor.py` 制作；沿当前房间参考的暖色、风格化收藏方向与本批明确清单。没有下载外部模型、贴图或品牌图案；不复制参考像素、不添加假文字。未有精确套装/制造规格的资料，属于风格化近似，不声称官方套装复刻或官方授权。

## 根与装配坐标

采用原锚点局部 glTF Y-up 米。各导出根保持 identity；不修改冻结锚点的父子关系、平移、旋转或缩放。具体包络/承托记录见 `asset-statistics.json` 的 roots/placement 及 `validation/v06c/planning/space-measurements.json`。

- `VIS_PlantCabinet` → `DEC_Plant_Cabinet`；local min=-0.058058 / -0.01465 / -0.060005，max=0.06982 / 0.31774 / 0.055413 m。
- `VIS_PlantCoffeeTable` → `DEC_Plant_CoffeeTable`；local min=-0.042224 / 0.00035 / -0.04364，max=0.050778 / 0.231302 / 0.040301 m。
- `VIS_PlantDesk` → `DEC_Plant_Desk`；local min=-0.05102 / 0.00035 / -0.052731，max=0.061357 / 0.279323 / 0.048697 m。
- `VIS_PlantSofa` → `DEC_Plant_Sofa`；local min=-0.149388 / 0.00035 / -0.149555，max=0.16926 / 0.769139 / 0.134336 m。
- `VIS_PlantWindow` → `DEC_Plant_Window`；local min=-0.145628 / 0.00035 / -0.104535，max=0.165 / 1.230142 / 0.104535 m。

## 原五盆与真实承托

保留 Cabinet、CoffeeTable、Desk、Sofa、Window 五处原位。仅用闭合宽叶与 PBR，不用 alpha 叶片叠层或风动。Cabinet 的盆底按真实柜顶下移，local Y≈-0.014649866 m；其他四盆接触偏移0.35 mm。

仅地面两盆按 A 真实拼缝核对：OakPlanks 顶 Y=0，JointSubstrate 顶 Y≈-0.0025 m。窗盆收窄前的历史验证：525个底面样点中523点直接接触木板，另2点命中既有缝底，间隙2.85 mm=2.5 mm真实缝深+0.35 mm接触偏移；沙发盆521/521点直接接触。均匀底面网格、四象限非共线接触、至少80%直接承托及不穿板同时检查，其他承托容差未放宽。详见 `validation/v06c/stages/floor-support-evidence-r2.json`。

最终窗盆为原锚点内独立重新塑形，作者尺寸 rx=0.22、rz=0.115、盆半径0.1035 m、盆高为允许总高×0.23；未对冻结锚点或 A 窗帘/床/桌缩放、移动。新实际世界包络 X/Y/Z 为0.310628/1.229792/0.209070 m；盆体/土茎/叶片距真实窗帘最前 Z 面分别约10.465/23.920/33.535 mm，均超过1 mm。其他四盆的局部 position/normal/UV/index 缓冲与材质语义签名完全一致。见 `validation/v06c/final/window-plant-clearance-comparison.json`。

最终窗盆和沙发盆各521/521个底面样点均直接落在木板上，接触偏移仍0.35 mm；最终证据为 `validation/v06c/final/floor-support-evidence.json`。旧2.85 mm跨缝记录保留为此前测试规则修正的依据，不能冒充最终窗盆当前样点。

本组CPU证据：`validation/v06c/stages/03-geometry-final.json`，当时11家C共49/49通过；网页及后续变更以对应新证据为准。

## 材质、UV 与资源

使用标准 PBR、独立家族材质和导出法线；15/15 个 mesh 带 UV。重复构件只在同一根/材质下合并，收藏的独立承托节点保留；不跨 A/B 资产、屏幕或灯组表面合批。

| 材质 | Base color RGBA（线性值） | Metallic | Roughness | Alpha |
| --- | --- | --- | --- | --- |
| `MAT_V06C_Plants_Leaves` | 0.12 / 0.28 / 0.12 / 1 | 0 | 0.62 | OPAQUE |
| `MAT_V06C_Plants_Ceramic` | 0.72 / 0.71 / 0.64 / 1 | 0.02 | 0.48 | OPAQUE |
| `MAT_V06C_Plants_SoilAndStems` | 0.13 / 0.17 / 0.07 / 1 | 0 | 0.91 | OPAQUE |

- 实际 GLB：**429,400 B**；可编辑 .blend：**167,276 B**。
- 7,308 三角面、15 网格、15 primitives、3 材质、0 嵌入图片。primitives 不等于实际渲染 draw calls。
- 本家族无相机、灯光源或动画；无外部纹理/缓冲 URI。GLB 文件字节不等于 HTTP 传输量、显存或帧时间。
- GLB SHA-256：`4575c8c7f98e7e8736fb7e2e4734e52e6ac9e5dfa02d028192c6e5c860a3abcb`。
- 实际字节/图片重复成本复核：`node scripts/assets/inspect-decor-budgets.mjs`；逐组账本留在 `validation/v06c/stages/`，不覆盖历史记录。

## 可编辑源与导出后严格清理

本家族 `.blend` 保留原始可编辑拓扑；没有声称 Blender 源中的零面积面已经删除。生成流程先保存源文件并从 Blender 导出，再由 `scripts/assets/v06c_mesh_cleanup.py::clean_exported_glb` 在实际 GLB 上过滤严格零面积三角形索引、收紧不再被引用的顶点。判断为 POSITION 叉积严格等于零，不用面积阈值；保留有效三角形的逐顶点属性字节、材质和节点身份，不重建 Blender 法线。

| 三角面统计口径 | 数量 |
| --- | ---: |
| Blender 可编辑源（`sourceTriangles`） | 7,944 |
| 清理后的最终 GLB（`triangles`） | 7,308 |
| 导出后剔除的严格零面积三角形 | 636 |

本规格资源数字与网页加载以最终 GLB 为准。`asset-statistics.json` 的 `exportCleanup` 保存清理记录；`roundtripChecks.triangles` 比较最终 GLB 统计与重新导入该 GLB 的结果，不表示源与清理后导出的三角面数完全相同。

使用 `node scripts/assets/build-collection-decor.mjs plants` 可重现“可编辑源 → Blender 原始导出 → GLB 严格清理 → 最终 GLB 往返核验”的完整流程；在 Blender 中手动点击导出不会自动执行这一步 Python 后处理。有效几何的独立前后比较采用 `scripts/assets/compare-decor-visible-geometry.mjs` 与 `validation/v06c/final/pre-cleanup-visible-geometry.json`，默认按全部 POSITION/NORMAL/UV 字节精确比较；规格生成本身不代替该比较、浏览器复测或性能验收。

## 原锚点装配与完整回退

- `VIS_PlantCabinet` → 原 `DEC_Plant_Cabinet`；proxy=该原锚点中实际 mesh（不隐藏整个父组）。
- `VIS_PlantCoffeeTable` → 原 `DEC_Plant_CoffeeTable`；proxy=该原锚点中实际 mesh（不隐藏整个父组）。
- `VIS_PlantDesk` → 原 `DEC_Plant_Desk`；proxy=该原锚点中实际 mesh（不隐藏整个父组）。
- `VIS_PlantSofa` → 原 `DEC_Plant_Sofa`；proxy=该原锚点中实际 mesh（不隐藏整个父组）。
- `VIS_PlantWindow` → 原 `DEC_Plant_Window`；proxy=该原锚点中实际 mesh（不隐藏整个父组）。

通过整家族验证后再把正式可视根挂到原锚点、抑制对应 proxy 的材质与 raycast；保留原节点可寻址及九项交互身份。本家族为静态非交互资产，`stateSurface=null`、`surfaceRole=none`，不占设备屏幕状态绑定。加载或验证失败记为 fallback，保留原 proxy；成功安装后的撤销恢复原 mesh 材质/raycast/抑制标记并只释放本家族资源。取消、重试、卸载/重挂载与故障恢复由本轮专项/全局验收分别证明。

## 文件、重现与验收索引

- 源：`blender-assets/plants_v06c.blend`；导出：`public/models/production/plants_v06c.glb`。
- 生成记录：本目录 `asset-statistics.json`；包含实际导出 SHA、根 identity、包络和逐项往返检查。
- 重新生成本家族：`node scripts/assets/build-collection-decor.mjs plants`。该命令会重新写本家族 C 源、GLB 与统计，执行前按任务要求保留快照；无需安装依赖。
- 更新本规格：`node assets-source/v06c/write-specs.mjs --update plants`。仅从当前已导出并登记的对应 C 家族读取，拒绝 GLB/统计 SHA 不一致。
- CPU 几何/装配：`node --import tsx --test tests/collection-decor-geometry.test.ts`；全 C 齐备时加 `ROOM_REQUIRE_ALL_C=1`。
- 逐组 CPU/浏览器证据按对应资产批次在 `validation/v06c/stages/` 记录；本规格不把其他组的结果冒充本家族结果。
- 网页安装、故障恢复、生产构建、截图/录屏与用户视觉状态须查最终 `V06C_COLLECTION_DECOR_REPORT.md`；本规格不提前宣称全部 C 或视觉已通过。
