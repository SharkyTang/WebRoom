# v0.6C 来源、复现与资源登记

范围为本轮收藏与装饰13家，接续实际已完成的旧三件+A+B。模型制作、网页安装、技术验收、用户视觉确认分开记录；本来源清单不表示用户已经确认外观，也不授权后续版本或部署。最终验收与真实网页证据见 `V06C_COLLECTION_DECOR_REPORT.md`。

## 来源与近似程度

共同参考为项目已有 `../Sharkys_Room_Blockout_Pack/room_master_reference.jpeg` 的房间配色/收藏/绿植/睡狗方向、当前旧三件+A/B正式风格、冻结空间身份，以及用户本轮明确的C收藏清单。参考图没有直接用作纹理或像素贴图。各模型由 `scripts/assets/build_collection_decor.py` 在Blender中程序化创建；灯具与墙画的具体造型 builder 位于 `scripts/assets/v06c_fixture_geometry.py`，由主生成器安装并统一导出。沿用已有几何/导出辅助函数；没有下载或打包第三方模型、图像、官方套装或扫描数据。

| 家族 | 已有要求/参考意图 | 几何和素材来源 | 许可及未核实项 |
| --- | --- | --- | --- |
| `eiffel` / 埃菲尔铁塔 | 收分塔腿、拱、桁架、平台与完整塔尖 | 本批原创程序化几何；无外部模型/图片 | 未取得或宣称官方外观/商标授权；按风格化近似登记 |
| `hogwarts` / 霍格沃茨 | 错落厅堂、圆塔与尖顶；独立Castle格 | 本批原创程序化几何；无外部模型/图片 | 未取得或宣称官方外观/商标授权；按风格化近似登记 |
| `minastirith` / 米那提斯白城 | 七层城墙、岩脊、上层核心与白塔；Architecture暂定格 | 本批原创程序化几何；无外部模型/图片 | 未取得或宣称官方外观/商标授权；按风格化近似登记 |
| `falcon` / 千年隼 | 圆盘、前分叉、偏置驾驶舱；不拉伸飞船 | 本批原创程序化几何；无外部模型/图片 | 未取得或宣称官方外观/商标授权；按风格化近似登记 |
| `bridge` / Tower Bridge | 沿当前双塔桥类意图；不把伦敦塔措辞当新增地标 | 本批原创程序化几何；无外部模型/图片 | 未取得或宣称官方外观/商标授权；按风格化近似登记 |
| `sls` / SLS | 分段核心箭体与侧部结构 | 本批原创程序化几何；无外部模型/图片 | 未取得或宣称官方外观/商标授权；按风格化近似登记 |
| `ferrari` / Ferrari F1 | 红色开轮赛车；不含品牌标识贴图 | 本批原创程序化几何；无外部模型/图片 | 未取得或宣称官方外观/商标授权；按风格化近似登记 |
| `mercedes` / Mercedes-AMG F1 | 银灰/青绿开轮赛车；独立于Ferrari | 本批原创程序化几何；无外部模型/图片 | 未取得或宣称官方外观/商标授权；按风格化近似登记 |
| `plants` / 原五盆植物 | 暖色盆、宽叶；五个原锚点不增加数量 | 本批原创程序化几何；无外部模型/图片 | 未取得或宣称官方外观/商标授权；按风格化近似登记 |
| `cola` / 冰杯可乐 | 杯壁、可乐与冰块；无瓶罐/托盘/流体 | 本批原创程序化几何；无外部模型/图片 | 未取得或宣称官方外观/商标授权；按风格化近似登记 |
| `dog` / 静态睡姿狗 | 房间参考中金棕睡狗方向；非用户真实宠物声明 | 本批原创程序化几何；无外部模型/图片 | 未取得或宣称官方外观/商标授权；按风格化近似登记 |
| `fixtures` / 灯具外壳/独立表面 | 原床头/休闲灯壳与桌/柜既有结构；三组仅静态预留 | `v06c_fixture_geometry.py::build_fixtures` 原创几何；无外部模型/图片 | 独立表面不等于可控照明；实际灯组与配光留后续 |
| `wallart` / 墙画 | 原创纸色/山形/月形几何与木框；无私人照片/文字 | `v06c_fixture_geometry.py::build_wallart` 原创闭合几何；无外部模型/图片 | 无个人信息来源，不宣称特定地点、个人经历或第三方画作 |

“原创几何”只描述本次制作方式，不自动意味着拥有参考建筑、虚构作品、车辆外观或品牌标识的官方授权。没有精确套装编号、官方零件数量、真实制造尺寸或犬种资料时明确采用风格化近似，不编造授权、型号一致性或用户经历。C全部13家无嵌入/外部图片、无PNG输入；墙画由原创几何形成，不编造用户相片、证书或私密内容。

## 文件与可复现流程

每家保留真实可编辑Blender源、GLB、`assets-source/v06c/<family>/asset-statistics.json` 和对应规格。实际GLB统计以 `validation/v06c/final/asset-budget-ledger-optimized.json` 为准；下表不是网络传输量。

| 家族 | 可编辑源 | 导出 | GLB字节 | 三角面 | primitives |
| --- | --- | --- | ---: | ---: | ---: |
| `eiffel` | `blender-assets/eiffel_v06c.blend` | `public/models/production/eiffel_v06c.glb` | 364,112 | 5,996 | 3 |
| `hogwarts` | `blender-assets/hogwarts_v06c.blend` | `public/models/production/hogwarts_v06c.glb` | 135,060 | 2,950 | 4 |
| `minastirith` | `blender-assets/minastirith_v06c.blend` | `public/models/production/minastirith_v06c.glb` | 307,428 | 5,280 | 4 |
| `falcon` | `blender-assets/falcon_v06c.blend` | `public/models/production/falcon_v06c.glb` | 113,052 | 1,916 | 4 |
| `bridge` | `blender-assets/bridge_v06c.blend` | `public/models/production/bridge_v06c.glb` | 297,804 | 4,888 | 4 |
| `sls` | `blender-assets/sls_v06c.blend` | `public/models/production/sls_v06c.glb` | 128,244 | 2,176 | 4 |
| `ferrari` | `blender-assets/ferrari_v06c.blend` | `public/models/production/ferrari_v06c.glb` | 119,244 | 2,396 | 4 |
| `mercedes` | `blender-assets/mercedes_v06c.blend` | `public/models/production/mercedes_v06c.glb` | 119,264 | 2,396 | 4 |
| `plants` | `blender-assets/plants_v06c.blend` | `public/models/production/plants_v06c.glb` | 429,400 | 7,308 | 15 |
| `cola` | `blender-assets/cola_v06c.blend` | `public/models/production/cola_v06c.glb` | 29,352 | 896 | 3 |
| `dog` | `blender-assets/dog_v06c.blend` | `public/models/production/dog_v06c.glb` | 142,356 | 4,796 | 3 |
| `fixtures` | `blender-assets/fixtures_v06c.blend` | `public/models/production/fixtures_v06c.glb` | 120,244 | 1,992 | 8 |
| `wallart` | `blender-assets/wallart_v06c.blend` | `public/models/production/wallart_v06c.glb` | 30,808 | 452 | 6 |
| **合计** | 13份.blend | 13份GLB | **2,336,368** | **43,442** | **66** |

- 生成单家：`node scripts/assets/build-collection-decor.mjs <family>`。只选择已经授权的家族；该命令会重写选中C产物和统计，先保留完整快照。没有指定家族时会生成全部C，不作为日常局部修复命令使用。
- 更新规格：`node assets-source/v06c/write-specs.mjs --update <family>`。读取当前manifest/GLB/统计，SHA不一致时拒绝写规格；不运行Blender。
- 读取最终账本：`ROOM_REQUIRE_ALL_C=1 node scripts/assets/inspect-decor-budgets.mjs`。写新证据时使用 `--output NEW.json`，目录须存在；wx拒绝覆盖旧证据。
- 实际导出几何：`ROOM_REQUIRE_ALL_C=1 node --import tsx --test tests/collection-decor-geometry.test.ts`；窗盆邻接回归：`node --import tsx --test tests/collection-decor-clearance.test.ts`。网页、故障、生产与性能另行运行，不把CPU通过当作网页全部通过。

本轮只有 Hogwarts、Bridge、Plants 应用导出后严格零面积清理。可编辑 `.blend` 保留原拓扑，`sourceTriangles` 分别为3,552 / 5,016 / 7,944；最终 `triangles` 为2,950 / 4,888 / 7,308，`exportCleanup` 记录其差额。完整命令先保存源，再由 `v06c_mesh_cleanup.py::clean_exported_glb` 过滤实际GLB的严格零面积索引并移除未引用顶点，最后重新导入最终GLB核对；手动Blender导出不会自动调用后处理。其余10家文件未重导或清理。

当前13家有效三角的全部位置/法线/UV属性字节、winding、材质与节点/TRS均与清理前精确一致，零法线容差，见 `validation/v06c/final/post-cleanup-visible-geometry.json`；这证明清理保留已有外表面，不等于用户视觉批准。实际文件节省31,896 B、退化面减少1,366、未引用顶点减少1,054；旧账本与审查记录作为清理前历史保留。

导出保持glTF Y-up、米制、identity roots、PBR/UV/法线，没有相机、光源或动画。重复可视细节按同根/材质合并；不跨可动机构、原锚点、屏幕或独立灯具surface合并。收藏主体统一缩放并烘焙展示朝向；原85节点和A/B源不变。需要补承托的独立Plinth与主体包络分别登记，见 `V06C_COLLECTION_SLOT_MAP.md`。

## 特殊归属、失败与修复记录

白城为Architecture未分配格的暂定安排，经低成本网页预检后形成正式七层模型；未替换霍格沃茨、未扩柜，仍待用户视觉确认。Medium/Small原节点保留，仅在白城家族成功安装时可逆抑制其无已确认用途灰盒。无合适已允许书籍位置，未向电脑桌或茶几增加书堆。

杯子没有旧proxy；失败时明确fallback/缺杯子、既有页脚提示与刷新重试，不把缺失记成installed。狗只抑制原身体/头mesh，A狗窝保持。窗边植物仅重塑自己可视几何以避开真实窗帘：窗帘/床/桌/原锚点未移动，窗盆修形前后、导出清理之前，其他四盆position/normal/UV/index及材质语义签名一致，见 `validation/v06c/final/window-plant-clearance-comparison.json`。最终床垫、杯内壁与地面承托按真实GLB检查，旧失败证据保留。

灯具只做外壳和四个独立材质表面；`fixtureRegistry.ts`为静态对应登记，表面emissive为0、无runtimeBinding。床头与Bed有空间对应，Desk/Cabinet条体是后续候选映射，Lounge归属未定；不冒充Desk、不新增第四个灯组。三组独立状态、最终配光与总开关联动实现留到后续，详见 `V06C_LIGHT_FIXTURE_MAPPING.md`。

## 当前预算与性能证据边界

C前GLB真实基线4,662,556 B，本批+2,336,368 B，C后41个初始GLB共6,998,924 B。C有66 mesh/primitives和51材质定义、0图片/0新增重复编码图片；全屋原有18份嵌入图片873,680 B保持，不能扣除344,477 B旧跨文件重复来缩小载荷。

**工作目标并非全部达成：**43,442 triangles低于65k目标；2.336368 MB超过2 MB工作目标336,368 B，66 primitives超过约55目标11个。保留150k triangles/3 MB库增量/+60同Hero calls的临时审查线，不伪称为用户批准的硬指标。当前文件/几何未触及前两线，最终Hero增加40 calls低于+60线；primitive不等于draw call，审查线以内也不代表性能无回退。

最终独占性能已完成，原始路径分别保留 `validation/v06c/baseline/performance.json`、`validation/v06c/performance/performance.json`（清理前）和 `validation/v06c/performance-optimized/performance.json`（最终）。按“基线 / 清理前 / 最终”，三尺寸Hero frameMs为57.933 / 76.962 / 75.307、50.115 / 68.820 / 68.220、44.735 / 65.294 / 64.000；calls为137 / 177 / 177。最终桌面活动mean47.074 ms、390px为27.901 ms，分别比基线42.786 / 25.095增加10.02% / 11.18%。**21/21通过的是测量协议检查；性能无明显回退项未通过，用户视觉仍待确认。**

最终模型encodedBodySize 2,457,373 B、transferSize 2,469,673 B、decoded/file 6,998,924 B；纹理UUID和RGBA+mip估算不变。回收后Hero样本略低，桌面活动mean略高、部分focus更高，有限单次软件渲染样本不支持普遍改善或置信因果，也不能推算真机60 FPS。完整三列mean/p95、资源与环境边界见 `validation/v06c/final/PERFORMANCE_COMPARISON.md`；最终资源与技术状态由交付报告分别记录，本批交付后停止。
