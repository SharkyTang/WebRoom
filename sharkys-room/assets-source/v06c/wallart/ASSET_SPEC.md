# Wall art / 墙画 / v0.6C

模型制作：实际可编辑源与 GLB 已生成。网页登记：当前 manifest 已登记。技术验收：导出往返数据与实际几何结果分别记录，不把文件生成等同全量浏览器验收。用户视觉确认：**待确认**。

## 造型与来源

原墙画位置中的边框与原创简洁装饰图案；无私人照片或虚构个人信息。

原创程序化几何，造型由 `scripts/assets/v06c_fixture_geometry.py` 的对应 builder 制作，由 `scripts/assets/build_collection_decor.py` 安装 builder 并统一导出；沿当前房间参考的暖色、风格化收藏方向与本批明确清单。没有下载外部模型、贴图或品牌图案；不复制参考像素、不添加假文字。未有精确套装/制造规格的资料，属于风格化近似，不声称官方套装复刻或官方授权。

## 根与装配坐标

采用原锚点局部 glTF Y-up 米。各导出根保持 identity；不修改冻结锚点的父子关系、平移、旋转或缩放。具体包络/承托记录见 `asset-statistics.json` 的 roots/placement 及 `validation/v06c/planning/space-measurements.json`。

- `VIS_WallArt` → `DEC_WallArt`；local min=-0.429 / -0.439 / -0.014，max=0.429 / 0.439 / 0.016 m。

## 原创图案与来源边界

实际造型源为 `scripts/assets/v06c_fixture_geometry.py::build_wallart`：胡桃色边框、暖纸底、三层山脊与低饱和月形，使用浅厚度闭合多边形。正面沿原锚点局部 +Z 朝向室内；当前导出局部包络约[-0.429, -0.439, -0.014]至[0.429, 0.439, 0.016] m，在原[-0.43, -0.44, -0.0175]至[0.43, 0.44, 0.0175] m名义包络内。

图案为本批原创抽象装饰，没有外部图片、像素纹理、文字、个人照片、用户经历、证书或其他个人信息来源；不宣称描绘用户指定地点或收藏作品。六个材质均由本生成器设定标准 PBR 颜色；不下载、复制或冒充第三方画作。保留原墙画锚点和朝向，未增添墙画交互或改变内容面板。

## 材质、UV 与资源

使用标准 PBR、独立家族材质和导出法线；6/6 个 mesh 带 UV。重复构件只在同一根/材质下合并，收藏的独立承托节点保留；不跨 A/B 资产、屏幕或灯组表面合批。

| 材质 | Base color RGBA（线性值） | Metallic | Roughness | Alpha |
| --- | --- | --- | --- | --- |
| `MAT_V06C_WallArtWalnutFrame` | 0.24 / 0.155 / 0.095 / 1 | 0 | 0.59 | OPAQUE |
| `MAT_V06C_WallArtDistantSage` | 0.37 / 0.49 / 0.47 / 1 | 0 | 0.82 | OPAQUE |
| `MAT_V06C_WallArtMiddleTeal` | 0.21 / 0.36 / 0.37 / 1 | 0 | 0.82 | OPAQUE |
| `MAT_V06C_WallArtMutedMoon` | 0.79 / 0.67 / 0.39 / 1 | 0 | 0.78 | OPAQUE |
| `MAT_V06C_WallArtForeground` | 0.12 / 0.25 / 0.28 / 1 | 0 | 0.82 | OPAQUE |
| `MAT_V06C_WallArtWarmPaper` | 0.79 / 0.77 / 0.66 / 1 | 0 | 0.86 | OPAQUE |

- 实际 GLB：**30,808 B**；可编辑 .blend：**107,362 B**。
- 452 三角面、6 网格、6 primitives、6 材质、0 嵌入图片。primitives 不等于实际渲染 draw calls。
- 本家族无相机、灯光源或动画；无外部纹理/缓冲 URI。GLB 文件字节不等于 HTTP 传输量、显存或帧时间。
- GLB SHA-256：`355a2e23a5a6b5ca4c9fda32e2803f7d9db9c6b501d92d6677affbda2a04f772`。
- 实际字节/图片重复成本复核：`node scripts/assets/inspect-decor-budgets.mjs`；逐组账本留在 `validation/v06c/stages/`，不覆盖历史记录。

## 原锚点装配与完整回退

- `VIS_WallArt` → 原 `DEC_WallArt`；proxy=该原锚点中实际 mesh（不隐藏整个父组）。

通过整家族验证后再把正式可视根挂到原锚点、抑制对应 proxy 的材质与 raycast；保留原节点可寻址及九项交互身份。本家族为静态非交互资产，`stateSurface=null`、`surfaceRole=none`，不占设备屏幕状态绑定。加载或验证失败记为 fallback，保留原 proxy；成功安装后的撤销恢复原 mesh 材质/raycast/抑制标记并只释放本家族资源。取消、重试、卸载/重挂载与故障恢复由本轮专项/全局验收分别证明。

## 文件、重现与验收索引

- 源：`blender-assets/wallart_v06c.blend`；导出：`public/models/production/wallart_v06c.glb`。
- 生成记录：本目录 `asset-statistics.json`；包含实际导出 SHA、根 identity、包络和逐项往返检查。
- 重新生成本家族：`node scripts/assets/build-collection-decor.mjs wallart`。该命令会重新写本家族 C 源、GLB 与统计，执行前按任务要求保留快照；无需安装依赖。
- 更新本规格：`node assets-source/v06c/write-specs.mjs --update wallart`。仅从当前已导出并登记的对应 C 家族读取，拒绝 GLB/统计 SHA 不一致。
- CPU 几何/装配：`node --import tsx --test tests/collection-decor-geometry.test.ts`；全 C 齐备时加 `ROOM_REQUIRE_ALL_C=1`。
- 逐组 CPU/浏览器证据按对应资产批次在 `validation/v06c/stages/` 记录；本规格不把其他组的结果冒充本家族结果。
- 网页安装、故障恢复、生产构建、截图/录屏与用户视觉状态须查最终 `V06C_COLLECTION_DECOR_REPORT.md`；本规格不提前宣称全部 C 或视觉已通过。
