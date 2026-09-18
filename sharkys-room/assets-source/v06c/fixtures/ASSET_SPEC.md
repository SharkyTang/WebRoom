# Light fixtures / 灯具外壳 / v0.6C

模型制作：实际可编辑源与 GLB 已生成。网页登记：当前 manifest 已登记。技术验收：导出往返数据与实际几何结果分别记录，不把文件生成等同全量浏览器验收。用户视觉确认：**待确认**。

## 造型与来源

有依据的外壳和独立命名的预留表面；当前不发光，静态登记，不增加真实灯光系统。

原创程序化几何，造型由 `scripts/assets/v06c_fixture_geometry.py` 的对应 builder 制作，由 `scripts/assets/build_collection_decor.py` 安装 builder 并统一导出；沿当前房间参考的暖色、风格化收藏方向与本批明确清单。没有下载外部模型、贴图或品牌图案；不复制参考像素、不添加假文字。未有精确套装/制造规格的资料，属于风格化近似，不声称官方套装复刻或官方授权。

## 根与装配坐标

采用原锚点局部 glTF Y-up 米。各导出根保持 identity；不修改冻结锚点的父子关系、平移、旋转或缩放。具体包络/承托记录见 `asset-statistics.json` 的 roots/placement 及 `validation/v06c/planning/space-measurements.json`。

- `VIS_FixtureBedside` → `DEC_Lamp_Bedside`；local min=-0.098 / 0 / -0.098，max=0.098 / 0.3785 / 0.098 m。
- `VIS_FixtureLounge` → `DEC_Lamp_Lounge`；local min=-0.098 / 0 / -0.098，max=0.098 / 0.3785 / 0.098 m。
- `VIS_FixtureDeskStrip` → `FUR_Desk`；local min=-0.8 / 0.665 / -0.405，max=0.8 / 0.6695 / -0.395 m。
- `VIS_FixtureCabinetStrip` → `FUR_DisplayCabinet`；local min=0.248 / 2.5205 / -1.54，max=0.272 / 2.5245 / 1.99 m。

## 四个独立表面与静态对应

床头与休闲灯均有加重底座、灯杆、灯座、三根罩支撑、薄壁空心灯罩与金属包边；不是把实心圆锥当灯罩。桌下 U 形条壳固定在原桌后沿下方；柜顶下条壳分四段，避开原隔板。以下名称同时来自实际 GLB 材质、导出统计和 `lib/room/assets/fixtureRegistry.ts`，四个表面使用四份不同材质，不共用可变表面材质。

| 独立可寻址表面 | 实际 GLB 材质 | 后续候选组 | 当前登记状态 |
| --- | --- | --- | --- |
| `VIS_FixtureBedsideSurface` | `MAT_V06C_FixtureBedsideSurface` | bed | spatial-correspondence |
| `VIS_FixtureLoungeSurface` | `MAT_V06C_FixtureLoungeSurface` | 未分配 | unassigned |
| `VIS_FixtureDeskStripSurface` | `MAT_V06C_FixtureDeskStripSurface` | desk | candidate |
| `VIS_FixtureCabinetStripSurface` | `MAT_V06C_FixtureCabinetStripSurface` | cabinet | candidate |

所有表面当前 emissive RGB=0；Blender emission strength=0，`stateSurface=null`、`surfaceRole=none`、`runtimeBinding=null`。本批未创建光源、可控照明状态、表面状态 binder、配光或与总开关的新联动。四个独立表面不等于四组可控灯：床头与原 Bed 点灯有空间对应，Desk/Cabinet 仅作候选对应；Lounge 无原专属光源、归属待定，不能冒充 Desk 或第四组。原三盏光源与总开关语义保持。

柜条四段局部 Z 区间（m）：hogwarts [0.39, 1.99]；eiffel [-0.4675, 0.27]；sls [-0.9475, -0.5725]；small-reserved [-1.54, -1.0525]。四段同属一个 Cabinet surface/材质，未跨隔板连成实体，也未与其他三表面合批。桌条上表面与 A 桌板下表面约0.5 mm接触偏移；灯条与真实 A 柜板、八件收藏及 B 钢琴机构范围内17个姿态采样的专项数据见 `V06C_LIGHT_FIXTURE_MAPPING.md` 和 `validation/v06c/stages/04-geometry-order.json`。该阶段记录不替代后续最终网页、性能或用户视觉确认。

床头/休闲灯仅抑制各自两个旧灯 proxy mesh；桌条/柜条没有旧 proxy，`proxyMeshNames=[]`，不抑制 A 桌柜或 B 钢琴。任一根/表面不完整时整家族 fallback：旧两灯保持、附加灯条缺席，不把部分到达记为成功。

## 材质、UV 与资源

使用标准 PBR、独立家族材质和导出法线；8/8 个 mesh 带 UV。重复构件只在同一根/材质下合并，收藏的独立承托节点保留；不跨 A/B 资产、屏幕或灯组表面合批。

| 材质 | Base color RGBA（线性值） | Metallic | Roughness | Alpha |
| --- | --- | --- | --- | --- |
| `MAT_V06C_FixtureBrushedBronze` | 0.18 / 0.135 / 0.081 / 1 | 0.58 | 0.43 | OPAQUE |
| `MAT_V06C_FixtureBedsideSurface` | 0.75 / 0.72 / 0.63 / 1 | 0 | 0.67 | OPAQUE |
| `MAT_V06C_FixtureCabinetStripSurface` | 0.75 / 0.72 / 0.63 / 1 | 0 | 0.67 | OPAQUE |
| `MAT_V06C_FixtureDeskStripSurface` | 0.75 / 0.72 / 0.63 / 1 | 0 | 0.67 | OPAQUE |
| `MAT_V06C_FixtureLoungeSurface` | 0.75 / 0.72 / 0.63 / 1 | 0 | 0.67 | OPAQUE |

- 实际 GLB：**120,244 B**；可编辑 .blend：**115,366 B**。
- 1,992 三角面、8 网格、8 primitives、5 材质、0 嵌入图片。primitives 不等于实际渲染 draw calls。
- 本家族无相机、灯光源或动画；无外部纹理/缓冲 URI。GLB 文件字节不等于 HTTP 传输量、显存或帧时间。
- GLB SHA-256：`3b23cd742184e4a6f8ffc7461c897bbd5d4a49a892eb19f746e2f489bd335e9f`。
- 实际字节/图片重复成本复核：`node scripts/assets/inspect-decor-budgets.mjs`；逐组账本留在 `validation/v06c/stages/`，不覆盖历史记录。

## 原锚点装配与完整回退

- `VIS_FixtureBedside` → 原 `DEC_Lamp_Bedside`；proxy=["DEC_Lamp_Bedside_Mesh","DEC_Lamp_Bedside_Mesh_1"]。
- `VIS_FixtureLounge` → 原 `DEC_Lamp_Lounge`；proxy=["DEC_Lamp_Lounge_Mesh","DEC_Lamp_Lounge_Mesh_1"]。
- `VIS_FixtureDeskStrip` → 原 `FUR_Desk`；proxy=[]。
- `VIS_FixtureCabinetStrip` → 原 `FUR_DisplayCabinet`；proxy=[]。

通过整家族验证后再把正式可视根挂到原锚点、抑制对应 proxy 的材质与 raycast；保留原节点可寻址及九项交互身份。本家族为静态非交互资产，`stateSurface=null`、`surfaceRole=none`，不占设备屏幕状态绑定。加载或验证失败记为 fallback，保留原 proxy；成功安装后的撤销恢复原 mesh 材质/raycast/抑制标记并只释放本家族资源。取消、重试、卸载/重挂载与故障恢复由本轮专项/全局验收分别证明。

## 文件、重现与验收索引

- 源：`blender-assets/fixtures_v06c.blend`；导出：`public/models/production/fixtures_v06c.glb`。
- 生成记录：本目录 `asset-statistics.json`；包含实际导出 SHA、根 identity、包络和逐项往返检查。
- 重新生成本家族：`node scripts/assets/build-collection-decor.mjs fixtures`。该命令会重新写本家族 C 源、GLB 与统计，执行前按任务要求保留快照；无需安装依赖。
- 更新本规格：`node assets-source/v06c/write-specs.mjs --update fixtures`。仅从当前已导出并登记的对应 C 家族读取，拒绝 GLB/统计 SHA 不一致。
- CPU 几何/装配：`node --import tsx --test tests/collection-decor-geometry.test.ts`；全 C 齐备时加 `ROOM_REQUIRE_ALL_C=1`。
- 逐组 CPU/浏览器证据按对应资产批次在 `validation/v06c/stages/` 记录；本规格不把其他组的结果冒充本家族结果。
- 网页安装、故障恢复、生产构建、截图/录屏与用户视觉状态须查最终 `V06C_COLLECTION_DECOR_REPORT.md`；本规格不提前宣称全部 C 或视觉已通过。
