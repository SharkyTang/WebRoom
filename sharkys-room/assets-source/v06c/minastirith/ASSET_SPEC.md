# Minas Tirith / 米那提斯白城 / v0.6C

模型制作：实际可编辑源与 GLB 已生成。网页登记：当前 manifest 已登记。技术验收：导出往返数据与实际几何结果分别记录，不把文件生成等同全量浏览器验收。用户视觉确认：**待确认**。

## 造型与来源

七层弧形城墙和平台、城垛、逐层房屋、中央岩脊、上层核心和白塔；完整山城轮廓与霍格沃茨分开。

原创程序化几何，由 `scripts/assets/build_collection_decor.py` 制作；沿当前房间参考的暖色、风格化收藏方向与本批明确清单。没有下载外部模型、贴图或品牌图案；不复制参考像素、不添加假文字。未有精确套装/制造规格的资料，属于风格化近似，不声称官方套装复刻或官方授权。

## 格位、规范化与承托

所有尺寸为 glTF Y-up 米，向量顺序为 X / Y / Z。原锚点 `DSP_Architecture_Bounds`、父级 `DISPLAY_MODELS`、Bounds 和 A 柜板保持。根 `VIS_MinasTirith` 的平移/旋转为零、scale=1；统一缩放与 90° Y 轴展示朝向烘焙在局部顶点中，不对根或单轴做拉伸。

| 项目 | 实际数据 |
| --- | --- |
| 原锚点世界位置 | -3.225 / 0.9975 / -2.19625 m |
| 原名义占位尺寸 | 0.47 / 0.45 / 0.5 m |
| A 正式板材后实测内部净尺寸 | 0.57 / 0.525 / 0.5475 m |
| 制作规范体包络 min → max | -1.004964 / 0.03 / -0.4 → 1.004964 / 1.641 / 0.73 m |
| 主体统一缩放系数 | 0.24179982242508966 |
| 缩放后主体尺寸（不含承托补段） | 0.273234 / 0.38954 / 0.486 m |
| 含底座实际导出局部 min → max | -0.139617 / -0.26215 / -0.246 → 0.139617 / 0.16554 / 0.246 m |
| 含底座实际导出尺寸 | 0.279234 / 0.42769 / 0.492 m |
| 承托面 | `VIS_CabinetPanel_04`，world Y=0.735 m |
| 主体底 local Y / 底座底 local Y | -0.224 / -0.26215 m |
| 底座向下承托补段 | 38.15 mm |
| 实际最低点到承托面 | 0.35 mm |
| 实际顶部到上板净空 | 96.96 mm |
| X两侧 / Z两侧最小包络净空 | 135.383 / 27.75 mm |

主体留在原名义包络；原 proxy 底高于正式柜板，因此独立命名的 Plinth 只向下补足承托，不声称含底座整体仍在旧灰盒内部。设计接触偏移为 0.35 mm；不移动格板来消除悬空。表中间隙是导出包络与当前实测柜板坐标的复核，薄杆/突出几何与承托三角面仍由 `tests/collection-decor-geometry.test.ts` 检查。

白城为本批提出的 Architecture 格临时安排：开工实测记录未发现该泛称格已有已确认收藏，低成本三层预览已在网页核对后再制作本正式七层版本。此安排未获得用户视觉批准；不替换 Hogwarts、不扩柜、不改隔板。预览证据：`validation/v06c/planning/minastirith-preview/browser-r2/preflight.json`，该预览不是正式模型交付。

## 材质、UV 与资源

使用标准 PBR、独立家族材质和导出法线；4/4 个 mesh 带 UV。重复构件只在同一根/材质下合并，独立承托节点保留；不跨 A/B 资产、屏幕或灯组表面合批。

| 材质 | Base color RGBA（线性值） | Metallic | Roughness | Alpha |
| --- | --- | --- | --- | --- |
| `MAT_V06C_MinasTirith_IvoryStone` | 0.79 / 0.78 / 0.7 / 1 | 0 | 0.64 | OPAQUE |
| `MAT_V06C_MinasTirith_SilverRoofs` | 0.4 / 0.49 / 0.52 / 1 | 0.16 | 0.49 | OPAQUE |
| `MAT_V06C_MinasTirith_Cliff` | 0.42 / 0.46 / 0.45 / 1 | 0 | 0.84 | OPAQUE |
| `MAT_V06C_MinasTirith_DisplayPlinth` | 0.044 / 0.055 / 0.062 / 1 | 0.2 | 0.49 | OPAQUE |

- 实际 GLB：**307,428 B**；可编辑 .blend：**164,802 B**。
- 5,280 三角面、4 网格、4 primitives、4 材质、0 嵌入图片。primitives 不等于实际渲染 draw calls。
- 本家族无相机、灯光源或动画；无外部纹理/缓冲 URI。GLB 文件字节不等于 HTTP 传输量、显存或帧时间。
- GLB SHA-256：`ecb4baa2cf92c1d77d49d80770d0cdcff696acad4a5b31067d5af19a71d2c51d`。
- 实际字节/图片重复成本复核：`node scripts/assets/inspect-decor-budgets.mjs`；逐组账本留在 `validation/v06c/stages/`，不覆盖历史记录。

## 原锚点装配与完整回退

- `VIS_MinasTirith` → 原 `DSP_Architecture_Bounds`；proxy=该原锚点中实际 mesh（不隐藏整个父组）。

通过整家族验证后再把正式可视根挂到原锚点、抑制对应 proxy 的材质与 raycast；保留原节点可寻址及九项交互身份。本家族为静态非交互资产，`stateSurface=null`、`surfaceRole=none`，不占设备屏幕状态绑定。加载或验证失败记为 fallback，保留原 proxy；成功安装后的撤销恢复原 mesh 材质/raycast/抑制标记并只释放本家族资源。取消、重试、卸载/重挂载与故障恢复由本轮专项/全局验收分别证明。

本家族还可逆抑制已登记、未分配的泛称占位 `DSP_MediumModel_Bounds`、`DSP_SmallModel_Bounds`。原节点身份保留；此家族失败或撤销后恢复这些灰盒，不能据此宣称它们曾是已完成收藏。

## 文件、重现与验收索引

- 源：`blender-assets/minastirith_v06c.blend`；导出：`public/models/production/minastirith_v06c.glb`。
- 生成记录：本目录 `asset-statistics.json`；包含实际导出 SHA、根 identity、包络和逐项往返检查。
- 重新生成本家族：`node scripts/assets/build-collection-decor.mjs minastirith`。该命令会重新写本家族 C 源、GLB 与统计，执行前按任务要求保留快照；无需安装依赖。
- 更新本规格：`node assets-source/v06c/write-specs.mjs --update minastirith`。仅从当前已导出并登记的对应 C 家族读取，拒绝 GLB/统计 SHA 不一致。
- CPU 几何/装配：`node --import tsx --test tests/collection-decor-geometry.test.ts`；全 C 齐备时加 `ROOM_REQUIRE_ALL_C=1`。
- 已记录的首组 CPU 证据：`validation/v06c/stages/01-geometry.json`（首组三家 16 项通过；属于当时快照，后续变更以新证据为准）。
- 网页安装、故障恢复、生产构建、截图/录屏与用户视觉状态须查最终 `V06C_COLLECTION_DECOR_REPORT.md`；本规格不提前宣称全部 C 或视觉已通过。
