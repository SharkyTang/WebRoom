# Iced cola / 冰杯可乐 / v0.6C

模型制作：实际可编辑源与 GLB 已生成。网页登记：当前 manifest 已登记。技术验收：导出往返数据与实际几何结果分别记录，不把文件生成等同全量浏览器验收。用户视觉确认：**待确认**。

## 造型与来源

杯口、杯壁、杯底、可乐液面与杯内冰块；茶几上单个杯子，无托盘或流体动画。

原创程序化几何，由 `scripts/assets/build_collection_decor.py` 制作；沿当前房间参考的暖色、风格化收藏方向与本批明确清单。没有下载外部模型、贴图或品牌图案；不复制参考像素、不添加假文字。未有精确套装/制造规格的资料，属于风格化近似，不声称官方套装复刻或官方授权。

## 根与装配坐标

采用原锚点局部 glTF Y-up 米。各导出根保持 identity；不修改冻结锚点的父子关系、平移、旋转或缩放。具体包络/承托记录见 `asset-statistics.json` 的 roots/placement 及 `validation/v06c/planning/space-measurements.json`。

- `VIS_Cola` → `FUR_CoffeeTable`；local min=-0.285 / 0.4805 / -0.055，max=-0.205 / 0.6255 / 0.025 m。

## 杯内空间与无旧 proxy 降级

杯底中心为茶几原局部 (-0.245, 0.4805, -0.015) m；外径约0.08 m、高0.145 m，杯底到桌面约0.5 mm。保留杯口、内外杯壁、实体杯底、液面和三块冰，仅用薄壁 alpha 混合，不启用 transmission、折射或流体系统。

CPU 检验从实际 Glass 内向三角面提取剖面：局部Y约0.490500/0.619500/0.625500 m，内半径约0.028/0.036/0.0365 m。液体与冰全部导出顶点满足内腔高度、插值内径及实际多边形杯壁距离。初版液面穿壁约0.1124 mm，现液体顶半径0.034 m；10 µm数值容差未放宽。冰与液体的正常漂浮重叠允许。

没有旧杯子 proxy，`proxyMeshNames=[]`；不抑制茶几、iPad或其他已安装VIS。失败时杯子缺席、家族状态为fallback，由既有页脚提示及刷新重试；**缺杯子是明确降级，不是installed成功**。重试完整安装后才登记成功，撤销只释放杯子并保留A茶几和B iPad。

本组CPU证据：`validation/v06c/stages/03-geometry-final.json`，当时11家C共49/49通过；网页及后续变更以对应新证据为准。

## 材质、UV 与资源

使用标准 PBR、独立家族材质和导出法线；3/3 个 mesh 带 UV。重复构件只在同一根/材质下合并，收藏的独立承托节点保留；不跨 A/B 资产、屏幕或灯组表面合批。

| 材质 | Base color RGBA（线性值） | Metallic | Roughness | Alpha |
| --- | --- | --- | --- | --- |
| `MAT_V06C_Cola_Glass` | 0.77 / 0.87 / 0.88 / 0.28 | 0 | 0.12 | BLEND |
| `MAT_V06C_Cola_Ice` | 0.65 / 0.79 / 0.8 / 1 | 0.04 | 0.15 | OPAQUE |
| `MAT_V06C_Cola_Liquid` | 0.075 / 0.018 / 0.009 / 1 | 0 | 0.23 | OPAQUE |

- 实际 GLB：**29,352 B**；可编辑 .blend：**111,144 B**。
- 896 三角面、3 网格、3 primitives、3 材质、0 嵌入图片。primitives 不等于实际渲染 draw calls。
- 本家族无相机、灯光源或动画；无外部纹理/缓冲 URI。GLB 文件字节不等于 HTTP 传输量、显存或帧时间。
- GLB SHA-256：`777befe2380d9e2ed40738441ab9ec26a07949a7f1da5f6f8286195ea1d25109`。
- 实际字节/图片重复成本复核：`node scripts/assets/inspect-decor-budgets.mjs`；逐组账本留在 `validation/v06c/stages/`，不覆盖历史记录。

## 原锚点装配与完整回退

- `VIS_Cola` → 原 `FUR_CoffeeTable`；proxy=[]。

通过整家族验证后再把正式可视根挂到原锚点、抑制对应 proxy 的材质与 raycast；保留原节点可寻址及九项交互身份。本家族为静态非交互资产，`stateSurface=null`、`surfaceRole=none`，不占设备屏幕状态绑定。加载或验证失败明确记录缺杯子的 fallback，保留原茶几及 iPad；撤销只移除并释放杯子，不把已有家具或 VIS 当成 proxy。取消、重试、卸载/重挂载与故障恢复由本轮专项/全局验收分别证明。

## 文件、重现与验收索引

- 源：`blender-assets/cola_v06c.blend`；导出：`public/models/production/cola_v06c.glb`。
- 生成记录：本目录 `asset-statistics.json`；包含实际导出 SHA、根 identity、包络和逐项往返检查。
- 重新生成本家族：`node scripts/assets/build-collection-decor.mjs cola`。该命令会重新写本家族 C 源、GLB 与统计，执行前按任务要求保留快照；无需安装依赖。
- 更新本规格：`node assets-source/v06c/write-specs.mjs --update cola`。仅从当前已导出并登记的对应 C 家族读取，拒绝 GLB/统计 SHA 不一致。
- CPU 几何/装配：`node --import tsx --test tests/collection-decor-geometry.test.ts`；全 C 齐备时加 `ROOM_REQUIRE_ALL_C=1`。
- 逐组 CPU/浏览器证据按对应资产批次在 `validation/v06c/stages/` 记录；本规格不把其他组的结果冒充本家族结果。
- 网页安装、故障恢复、生产构建、截图/录屏与用户视觉状态须查最终 `V06C_COLLECTION_DECOR_REPORT.md`；本规格不提前宣称全部 C 或视觉已通过。
