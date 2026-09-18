# Sleeping dog / 静态睡姿狗 / v0.6C

模型制作：实际可编辑源与 GLB 已生成。网页登记：当前 manifest 已登记。技术验收：导出往返数据与实际几何结果分别记录，不把文件生成等同全量浏览器验收。用户视觉确认：**待确认**。

## 造型与来源

原狗位置上的静态睡姿犬，保留 A 狗窝；无毛发系统、动画或新入口。

原创程序化几何，由 `scripts/assets/build_collection_decor.py` 制作；沿当前房间参考的暖色、风格化收藏方向与本批明确清单。没有下载外部模型、贴图或品牌图案；不复制参考像素、不添加假文字。未有精确套装/制造规格的资料，属于风格化近似，不声称官方套装复刻或官方授权。

## 根与装配坐标

采用原锚点局部 glTF Y-up 米。各导出根保持 identity；不修改冻结锚点的父子关系、平移、旋转或缩放。具体包络/承托记录见 `asset-statistics.json` 的 roots/placement 及 `validation/v06c/planning/space-measurements.json`。

- `VIS_SleepingDog` → `DEC_DogBedProxy`；local min=-0.2709 / 0.085 / -0.11782，max=0.3139 / 0.257 / 0.153674 m。

## 静态姿势与 A 狗窝隔离

沿已有参考制作近似金棕睡姿犬，不宣称用户真实宠物或精确犬种；身体、头、垂耳、前后爪、尾和闭眼均为静态几何，无骨骼、毛发、呼吸、声音或新入口。

最终 C 几何统一比例0.86、基准Y=0.085 m烘焙：X/Z同比缩放，Y=origin+(Y-origin)×scale。根保持identity，原狗锚点不动。真实导出顶点与A围沿的碰撞及内垫接触通过本轮CPU检查。仅抑制 `DEC_DogBedProxy_Mesh_1`；保留父组 `DEC_DogBedProxy` 和 A 的 `VIS_DogBed`、`VIS_DogBedInsetPad`、`VIS_DogBedSoftSurround`。

本组CPU证据：`validation/v06c/stages/03-geometry-final.json`，当时11家C共49/49通过；网页及后续变更以对应新证据为准。

## 材质、UV 与资源

使用标准 PBR、独立家族材质和导出法线；3/3 个 mesh 带 UV。重复构件只在同一根/材质下合并，收藏的独立承托节点保留；不跨 A/B 资产、屏幕或灯组表面合批。

| 材质 | Base color RGBA（线性值） | Metallic | Roughness | Alpha |
| --- | --- | --- | --- | --- |
| `MAT_V06C_Dog_GoldenCoat` | 0.55 / 0.3 / 0.11 / 1 | 0 | 0.79 | OPAQUE |
| `MAT_V06C_Dog_NoseClosedEyes` | 0.035 / 0.022 / 0.015 / 1 | 0 | 0.49 | OPAQUE |
| `MAT_V06C_Dog_EarsMuzzle` | 0.31 / 0.15 / 0.055 / 1 | 0 | 0.83 | OPAQUE |

- 实际 GLB：**142,356 B**；可编辑 .blend：**164,094 B**。
- 4,796 三角面、3 网格、3 primitives、3 材质、0 嵌入图片。primitives 不等于实际渲染 draw calls。
- 本家族无相机、灯光源或动画；无外部纹理/缓冲 URI。GLB 文件字节不等于 HTTP 传输量、显存或帧时间。
- GLB SHA-256：`61182573896ec1442e4a4ed71b5df4bed4d98a90ccdb859cf68595f6ae41fc5d`。
- 实际字节/图片重复成本复核：`node scripts/assets/inspect-decor-budgets.mjs`；逐组账本留在 `validation/v06c/stages/`，不覆盖历史记录。

## 原锚点装配与完整回退

- `VIS_SleepingDog` → 原 `DEC_DogBedProxy`；proxy=["DEC_DogBedProxy_Mesh_1"]。

通过整家族验证后再把正式可视根挂到原锚点、抑制对应 proxy 的材质与 raycast；保留原节点可寻址及九项交互身份。本家族为静态非交互资产，`stateSurface=null`、`surfaceRole=none`，不占设备屏幕状态绑定。加载或验证失败记为 fallback，保留原 proxy；成功安装后的撤销恢复原 mesh 材质/raycast/抑制标记并只释放本家族资源。取消、重试、卸载/重挂载与故障恢复由本轮专项/全局验收分别证明。

## 文件、重现与验收索引

- 源：`blender-assets/dog_v06c.blend`；导出：`public/models/production/dog_v06c.glb`。
- 生成记录：本目录 `asset-statistics.json`；包含实际导出 SHA、根 identity、包络和逐项往返检查。
- 重新生成本家族：`node scripts/assets/build-collection-decor.mjs dog`。该命令会重新写本家族 C 源、GLB 与统计，执行前按任务要求保留快照；无需安装依赖。
- 更新本规格：`node assets-source/v06c/write-specs.mjs --update dog`。仅从当前已导出并登记的对应 C 家族读取，拒绝 GLB/统计 SHA 不一致。
- CPU 几何/装配：`node --import tsx --test tests/collection-decor-geometry.test.ts`；全 C 齐备时加 `ROOM_REQUIRE_ALL_C=1`。
- 逐组 CPU/浏览器证据按对应资产批次在 `validation/v06c/stages/` 记录；本规格不把其他组的结果冒充本家族结果。
- 网页安装、故障恢复、生产构建、截图/录屏与用户视觉状态须查最终 `V06C_COLLECTION_DECOR_REPORT.md`；本规格不提前宣称全部 C 或视觉已通过。
