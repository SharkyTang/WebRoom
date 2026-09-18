# Hogwarts / 霍格沃茨 / v0.6C

模型制作：实际可编辑源与 GLB 已生成。网页登记：当前 manifest 已登记。技术验收：导出往返数据与实际几何结果分别记录，不把文件生成等同全量浏览器验收。用户视觉确认：**待确认**。

## 造型与来源

不同高度的厅堂、坡屋顶、圆塔与尖顶，沿独立基础平台组成城堡轮廓；保留独立收藏身份。

原创程序化几何，由 `scripts/assets/build_collection_decor.py` 制作；沿当前房间参考的暖色、风格化收藏方向与本批明确清单。没有下载外部模型、贴图或品牌图案；不复制参考像素、不添加假文字。未有精确套装/制造规格的资料，属于风格化近似，不声称官方套装复刻或官方授权。

## 格位、规范化与承托

所有尺寸为 glTF Y-up 米，向量顺序为 X / Y / Z。原锚点 `DSP_Castle_Bounds`、父级 `DISPLAY_MODELS`、Bounds 和 A 柜板保持。根 `VIS_Hogwarts` 的平移/旋转为零、scale=1；统一缩放与 90° Y 轴展示朝向烘焙在局部顶点中，不对根或单轴做拉伸。

| 项目 | 实际数据 |
| --- | --- |
| 原锚点世界位置 | -3.225 / 1.915 / 0.31 m |
| 原名义占位尺寸 | 0.49 / 0.97 / 1.3 m |
| A 正式板材后实测内部净尺寸 | 0.57 / 1.14 / 1.66 m |
| 制作规范体包络 min → max | -1.24 / 0 / -0.4825 → 1.24 / 1.56 / 0.4775 m |
| 主体统一缩放系数 | 0.4958333543501799 |
| 缩放后主体尺寸（不含承托补段） | 0.476 / 0.7735 / 1.229667 m |
| 含底座实际导出局部 min → max | -0.241 / -0.52965 / -0.617833 → 0.241 / 0.2895 / 0.617833 m |
| 含底座实际导出尺寸 | 0.482 / 0.81915 / 1.235667 m |
| 承托面 | `VIS_CabinetPanel_06`，world Y=1.385 m |
| 主体底 local Y / 底座底 local Y | -0.484 / -0.52965 m |
| 底座向下承托补段 | 45.65 mm |
| 实际最低点到承托面 | 0.35 mm |
| 实际顶部到上板净空 | 320.5 mm |
| X两侧 / Z两侧最小包络净空 | 34 / 192.167 mm |

主体留在原名义包络；原 proxy 底高于正式柜板，因此独立命名的 Plinth 只向下补足承托，不声称含底座整体仍在旧灰盒内部。设计接触偏移为 0.35 mm；不移动格板来消除悬空。表中间隙是导出包络与当前实测柜板坐标的复核，薄杆/突出几何与承托三角面仍由 `tests/collection-decor-geometry.test.ts` 检查。

收藏身份沿任务书明确要求与原独立槽位，不借本批调整已确认收藏或柜体。

## 材质、UV 与资源

使用标准 PBR、独立家族材质和导出法线；4/4 个 mesh 带 UV。重复构件只在同一根/材质下合并，收藏的独立承托节点保留；不跨 A/B 资产、屏幕或灯组表面合批。

| 材质 | Base color RGBA（线性值） | Metallic | Roughness | Alpha |
| --- | --- | --- | --- | --- |
| `MAT_V06C_Hogwarts_SlateRoofs` | 0.16 / 0.22 / 0.24 / 1 | 0.1 | 0.49 | OPAQUE |
| `MAT_V06C_Hogwarts_Limestone` | 0.66 / 0.54 / 0.37 / 1 | 0 | 0.67 | OPAQUE |
| `MAT_V06C_Hogwarts_Recesses` | 0.14 / 0.115 / 0.075 / 1 | 0 | 0.76 | OPAQUE |
| `MAT_V06C_Hogwarts_DisplayPlinth` | 0.044 / 0.055 / 0.062 / 1 | 0.2 | 0.49 | OPAQUE |

- 实际 GLB：**135,060 B**；可编辑 .blend：**148,368 B**。
- 2,950 三角面、4 网格、4 primitives、4 材质、0 嵌入图片。primitives 不等于实际渲染 draw calls。
- 本家族无相机、灯光源或动画；无外部纹理/缓冲 URI。GLB 文件字节不等于 HTTP 传输量、显存或帧时间。
- GLB SHA-256：`934f91ddf9e9e6bb2b3650aa3042c7b1a978105aa1b012082da455a90a88c4a6`。
- 实际字节/图片重复成本复核：`node scripts/assets/inspect-decor-budgets.mjs`；逐组账本留在 `validation/v06c/stages/`，不覆盖历史记录。

## 可编辑源与导出后严格清理

本家族 `.blend` 保留原始可编辑拓扑；没有声称 Blender 源中的零面积面已经删除。生成流程先保存源文件并从 Blender 导出，再由 `scripts/assets/v06c_mesh_cleanup.py::clean_exported_glb` 在实际 GLB 上过滤严格零面积三角形索引、收紧不再被引用的顶点。判断为 POSITION 叉积严格等于零，不用面积阈值；保留有效三角形的逐顶点属性字节、材质和节点身份，不重建 Blender 法线。

| 三角面统计口径 | 数量 |
| --- | ---: |
| Blender 可编辑源（`sourceTriangles`） | 3,552 |
| 清理后的最终 GLB（`triangles`） | 2,950 |
| 导出后剔除的严格零面积三角形 | 602 |

本规格资源数字与网页加载以最终 GLB 为准。`asset-statistics.json` 的 `exportCleanup` 保存清理记录；`roundtripChecks.triangles` 比较最终 GLB 统计与重新导入该 GLB 的结果，不表示源与清理后导出的三角面数完全相同。

使用 `node scripts/assets/build-collection-decor.mjs hogwarts` 可重现“可编辑源 → Blender 原始导出 → GLB 严格清理 → 最终 GLB 往返核验”的完整流程；在 Blender 中手动点击导出不会自动执行这一步 Python 后处理。有效几何的独立前后比较采用 `scripts/assets/compare-decor-visible-geometry.mjs` 与 `validation/v06c/final/pre-cleanup-visible-geometry.json`，默认按全部 POSITION/NORMAL/UV 字节精确比较；规格生成本身不代替该比较、浏览器复测或性能验收。

## 原锚点装配与完整回退

- `VIS_Hogwarts` → 原 `DSP_Castle_Bounds`；proxy=该原锚点中实际 mesh（不隐藏整个父组）。

通过整家族验证后再把正式可视根挂到原锚点、抑制对应 proxy 的材质与 raycast；保留原节点可寻址及九项交互身份。本家族为静态非交互资产，`stateSurface=null`、`surfaceRole=none`，不占设备屏幕状态绑定。加载或验证失败记为 fallback，保留原 proxy；成功安装后的撤销恢复原 mesh 材质/raycast/抑制标记并只释放本家族资源。取消、重试、卸载/重挂载与故障恢复由本轮专项/全局验收分别证明。

## 文件、重现与验收索引

- 源：`blender-assets/hogwarts_v06c.blend`；导出：`public/models/production/hogwarts_v06c.glb`。
- 生成记录：本目录 `asset-statistics.json`；包含实际导出 SHA、根 identity、包络和逐项往返检查。
- 重新生成本家族：`node scripts/assets/build-collection-decor.mjs hogwarts`。该命令会重新写本家族 C 源、GLB 与统计，执行前按任务要求保留快照；无需安装依赖。
- 更新本规格：`node assets-source/v06c/write-specs.mjs --update hogwarts`。仅从当前已导出并登记的对应 C 家族读取，拒绝 GLB/统计 SHA 不一致。
- CPU 几何/装配：`node --import tsx --test tests/collection-decor-geometry.test.ts`；全 C 齐备时加 `ROOM_REQUIRE_ALL_C=1`。
- 已记录的首组 CPU 证据：`validation/v06c/stages/01-geometry.json`（首组三家 16 项通过；属于当时快照，后续变更以新证据为准）。
- 网页安装、故障恢复、生产构建、截图/录屏与用户视觉状态须查最终 `V06C_COLLECTION_DECOR_REPORT.md`；本规格不提前宣称全部 C 或视觉已通过。
