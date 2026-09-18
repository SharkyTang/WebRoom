# Mercedes-AMG F1 / v0.6C

模型制作：实际可编辑源与 GLB 已生成。网页登记：当前 manifest 已登记。技术验收：导出往返数据与实际几何结果分别记录，不把文件生成等同全量浏览器验收。用户视觉确认：**待确认**。

## 造型与来源

开轮车身、驾驶舱、前后翼及银灰/青绿配色，独立于 Ferrari 收藏。

原创程序化几何，由 `scripts/assets/build_collection_decor.py` 制作；沿当前房间参考的暖色、风格化收藏方向与本批明确清单。没有下载外部模型、贴图或品牌图案；不复制参考像素、不添加假文字。未有精确套装/制造规格的资料，属于风格化近似，不声称官方套装复刻或官方授权。

## 格位、规范化与承托

所有尺寸为 glTF Y-up 米，向量顺序为 X / Y / Z。原锚点 `DSP_MercedesAMGF1_Bounds`、父级 `DISPLAY_MODELS`、Bounds 和 A 柜板保持。根 `VIS_Mercedes` 的平移/旋转为零、scale=1；统一缩放与 90° Y 轴展示朝向烘焙在局部顶点中，不对根或单轴做拉伸。

| 项目 | 实际数据 |
| --- | --- |
| 原锚点世界位置 | -3.225 / 0.275 / -0.135 m |
| 原名义占位尺寸 | 0.42 / 0.27 / 0.76 m |
| A 正式板材后实测内部净尺寸 | 0.57 / 0.57 / 0.81 m |
| 制作规范体包络 min → max | -1.19 / 0 / -0.659 → 1.2 / 0.6775 / 0.659 m |
| 主体统一缩放系数 | 0.30804248825431196 |
| 缩放后主体尺寸（不含承托补段） | 0.406 / 0.208699 / 0.736222 m |
| 含底座实际导出局部 min → max | -0.206 / -0.17965 / -0.371111 → 0.206 / 0.074699 / 0.371111 m |
| 含底座实际导出尺寸 | 0.412 / 0.254349 / 0.742222 m |
| 承托面 | `VIS_CabinetPanel_03`，world Y=0.095 m |
| 主体底 local Y / 底座底 local Y | -0.134 / -0.17965 m |
| 底座向下承托补段 | 45.65 mm |
| 实际最低点到承托面 | 0.35 mm |
| 实际顶部到上板净空 | 315.301 mm |
| X两侧 / Z两侧最小包络净空 | 69 / 33.889 mm |

主体留在原名义包络；原 proxy 底高于正式柜板，因此独立命名的 Plinth 只向下补足承托，不声称含底座整体仍在旧灰盒内部。设计接触偏移为 0.35 mm；不移动格板来消除悬空。表中间隙是导出包络与当前实测柜板坐标的复核，薄杆/突出几何与承托三角面仍由 `tests/collection-decor-geometry.test.ts` 检查。

收藏身份沿任务书明确要求与原独立槽位，不借本批调整已确认收藏或柜体。

## 材质、UV 与资源

使用标准 PBR、独立家族材质和导出法线；4/4 个 mesh 带 UV。重复构件只在同一根/材质下合并，独立承托节点保留；不跨 A/B 资产、屏幕或灯组表面合批。

| 材质 | Base color RGBA（线性值） | Metallic | Roughness | Alpha |
| --- | --- | --- | --- | --- |
| `MAT_V06C_Mercedes_Body` | 0.24 / 0.29 / 0.31 / 1 | 0.3 | 0.34 | OPAQUE |
| `MAT_V06C_Mercedes_TyresCockpit` | 0.018 / 0.022 / 0.025 / 1 | 0.03 | 0.63 | OPAQUE |
| `MAT_V06C_Mercedes_Accent` | 0.06 / 0.53 / 0.48 / 1 | 0.32 | 0.38 | OPAQUE |
| `MAT_V06C_Mercedes_DisplayPlinth` | 0.044 / 0.055 / 0.062 / 1 | 0.2 | 0.49 | OPAQUE |

- 实际 GLB：**119,264 B**；可编辑 .blend：**132,263 B**。
- 2,396 三角面、4 网格、4 primitives、4 材质、0 嵌入图片。primitives 不等于实际渲染 draw calls。
- 本家族无相机、灯光源或动画；无外部纹理/缓冲 URI。GLB 文件字节不等于 HTTP 传输量、显存或帧时间。
- GLB SHA-256：`2f6d1caa872c534dadf8603431695cf18693e8db9f8c0b3cf7975ad6b128583b`。
- 实际字节/图片重复成本复核：`node scripts/assets/inspect-decor-budgets.mjs`；逐组账本留在 `validation/v06c/stages/`，不覆盖历史记录。

## 原锚点装配与完整回退

- `VIS_Mercedes` → 原 `DSP_MercedesAMGF1_Bounds`；proxy=该原锚点中实际 mesh（不隐藏整个父组）。

通过整家族验证后再把正式可视根挂到原锚点、抑制对应 proxy 的材质与 raycast；保留原节点可寻址及九项交互身份。本家族为静态非交互资产，`stateSurface=null`、`surfaceRole=none`，不占设备屏幕状态绑定。加载或验证失败记为 fallback，保留原 proxy；成功安装后的撤销恢复原 mesh 材质/raycast/抑制标记并只释放本家族资源。取消、重试、卸载/重挂载与故障恢复由本轮专项/全局验收分别证明。

## 文件、重现与验收索引

- 源：`blender-assets/mercedes_v06c.blend`；导出：`public/models/production/mercedes_v06c.glb`。
- 生成记录：本目录 `asset-statistics.json`；包含实际导出 SHA、根 identity、包络和逐项往返检查。
- 重新生成本家族：`node scripts/assets/build-collection-decor.mjs mercedes`。该命令会重新写本家族 C 源、GLB 与统计，执行前按任务要求保留快照；无需安装依赖。
- 更新本规格：`node assets-source/v06c/write-specs.mjs --update mercedes`。仅从当前已导出并登记的对应 C 家族读取，拒绝 GLB/统计 SHA 不一致。
- CPU 几何/装配：`node --import tsx --test tests/collection-decor-geometry.test.ts`；全 C 齐备时加 `ROOM_REQUIRE_ALL_C=1`。
- 逐组 CPU/浏览器证据按对应资产批次在 `validation/v06c/stages/` 记录；本规格不把其他组的结果冒充本家族结果。
- 网页安装、故障恢复、生产构建、截图/录屏与用户视觉状态须查最终 `V06C_COLLECTION_DECOR_REPORT.md`；本规格不提前宣称全部 C 或视觉已通过。
