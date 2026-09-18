# v0.6C 收藏与装饰交付报告

日期：2026-09-18。工作区：`/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room`。本轮只实施 C，接续当前真实已完成的 A/B；旧审计中 B 未开始仅是历史记录。

**C13 已制作并接入：几何、装配、既有交互与新生产网页检查通过。性能采样完成但存在明确成本增长，2 MB/约55 primitives工作目标未达到；不宣布全项技术验收无条件通过。用户视觉确认待完成。**

## 1. 真实基线与非覆盖回退点

开工为 `main`，HEAD `c83ec37fa37911ab7aa09b7694fce0b6b42f9e5f`，暂存/未暂存/未跟踪均为空。当前 B 已由用户提交；没有依据旧审计恢复旧 v0.5，也没有重复制作 A/B 或旧三件。

编辑前新建完整快照 `../local-backups/v06c-start-20260918-190519/`，包含源码、配置、测试、文档、可编辑源、GLB、贴图和全部当时实际文件；排除安装/构建缓存及快照目录本身。**1,510 个文件逐项 SHA 校验通过**，归档 **538,177,796 B**，SHA-256：

`51ffc98f5c027031a3745ca05101d01a2c4436cd3ee7ff402f7ee4b0cc1c519b`

清单、Git 状态及 binary patches 与归档一起保留；关键 A/B 源、导出、manifest、屏幕绑定和测试都在归档内。证据：`validation/v06c/snapshot.json`。需要恢复时应先解包到新的空目录核对，不直接覆盖当前成果。本轮没有 commit、push、reset、clean、丢弃暂存或部署。

已读本地最新 B 报告、状态、资源账本、README、管线、manifest/装配/材质/资源所有权、A 空间合同、原参考图，以及任务书要求的历史线索。开工实测：**旧三件+A16+B8=27 家族、283 个运行时节点、4,662,556 B 初始 GLB**。本轮 B 最小网页复测 16/16、冻结契约 361 项、开工单测 172 项及类型检查通过；C 前（B 完成后）性能基线另采 20/20。证据全部位于 `validation/v06c/baseline/`，未引用 B 历史数字冒充本轮结果。

沿用当前 A/B 外观作暂定风格基线，不据“B 已完成”推导用户已批准美术。全部 C 为风格化近似，不宣称官方套装或制造尺寸复刻。

## 2. 逐资产四种状态

最终共 **40 个正式家族、369 个运行时节点**。原 85 个源节点及身份保留，原九项语义/targets 未增加；70 个原 proxy mesh 按家族可逆抑制（C 前、B 完成后为44）。新增 C 为13家、20个可视根，不增加第十项入口。

| 资产 / 家族 | 模型制作 | 网页安装 | 技术验收 | 用户视觉确认 | GLB B | 三角面 / primitives |
| --- | --- | --- | --- | --- | ---: | ---: |
| 埃菲尔铁塔 / `eiffel` | 已制作 | 已安装 | 本家族几何/装配与网页通过 | **待用户** | 364,112 | 5,996 / 3 |
| 霍格沃茨 / `hogwarts` | 已制作 | 已安装 | 本家族几何/装配与网页通过 | **待用户** | 135,060 | 2,950 / 4 |
| 米那提斯白城 / `minastirith` | 已制作 | 已安装 | 本家族几何/装配与网页通过 | **待用户** | 307,428 | 5,280 / 4 |
| 千年隼 / `falcon` | 已制作 | 已安装 | 本家族几何/装配与网页通过 | **待用户** | 113,052 | 1,916 / 4 |
| Tower Bridge / `bridge` | 已制作 | 已安装 | 本家族几何/装配与网页通过 | **待用户** | 297,804 | 4,888 / 4 |
| SLS / `sls` | 已制作 | 已安装 | 本家族几何/装配与网页通过 | **待用户** | 128,244 | 2,176 / 4 |
| Ferrari F1 / `ferrari` | 已制作 | 已安装 | 本家族几何/装配与网页通过 | **待用户** | 119,244 | 2,396 / 4 |
| Mercedes-AMG F1 / `mercedes` | 已制作 | 已安装 | 本家族几何/装配与网页通过 | **待用户** | 119,264 | 2,396 / 4 |
| 原位五盆植物 / `plants` | 已制作 | 已安装 | 本家族几何/装配与网页通过 | **待用户** | 429,400 | 7,308 / 15 |
| 冰杯可乐 / `cola` | 已制作 | 已安装 | 本家族几何/装配与网页通过 | **待用户** | 29,352 | 896 / 3 |
| 静态睡姿狗 / `dog` | 已制作 | 已安装 | 本家族几何/装配与网页通过 | **待用户** | 142,356 | 4,796 / 3 |
| 四处灯具外壳/表面 / `fixtures` | 已制作 | 已安装 | 本家族几何/装配与网页通过 | **待用户** | 120,244 | 1,992 / 8 |
| 原创墙画 / `wallart` | 已制作 | 已安装 | 本家族几何/装配与网页通过 | **待用户** | 30,808 | 452 / 6 |

每家真实 `.blend` 位于 `blender-assets/<family>_v06c.blend`，网页实际文件为 `public/models/production/<family>_v06c.glb`；材质、UV、identity 根、局部边界、来源、roundtrip 和 SHA 在 `assets-source/v06c/<family>/ASSET_SPEC.md`、`asset-statistics.json`。所有导出均重新导入 Blender 验证 mesh/三角面/根/UV/边界，没有用截图或重命名文件冒充源模型。

书籍是有位置前提的条件项：没有已确认且不侵占桌面/茶几/白城的允许位置，因此本批不新增；这不是用户取消需求。两处无明确收藏用途的泛称小格保留空置。

## 3. 收藏格位与白城安排

完整逐项尺寸、源锚点/父级、名义 Bounds、实际柜板后净空、统一缩放系数、局部坐标、承托与截图索引见 [收藏格位表](V06C_COLLECTION_SLOT_MAP.md)。数值由冻结 FINAL 与实际 A 柜板顶点读取，未用外部柜尺寸代替内部净空。

八件各自保留原身份：Eiffel、Hogwarts、Falcon、Tower Bridge、SLS、Ferrari、Mercedes 与白城。收藏仅在可视顶点中作统一缩放和 90° Y 展示朝向；导出根保持 identity，没有单轴挤压、截掉塔尖、扩柜或移动隔板。

白城先核对现有占用，再用低成本三层预览验证 Architecture 格。首轮预览发现层间承托问题，修正为连续实心山体后在网页复看，再制作七层城墙、房屋、城垛、岩脊和上层核心的正式版本。正式根 `VIS_MinasTirith` → `DSP_Architecture_Bounds`；**此格是本批提出的暂定安排，仍待用户视觉确认**。Hogwarts 独立保留，不与白城共格。预览证据在 `validation/v06c/planning/minastirith-preview/browser-r2/`，预览不算正式模型。

铁塔到上板约 **335.778 mm**，白城到上板约 **96.960 mm**；实际三角面未进入 A 柜板。各旧灰盒原本高于承托板，本批以独立 Plinth 只向下补足承托，底部偏移约 **0.35 mm**；主体仍在名义 Bounds 内，报告不把补段也说成旧灰盒内部。

`DSP_MediumModel_Bounds`、`DSP_SmallModel_Bounds` 无确认收藏身份，正式状态空置。仅抑制可见灰盒材质/raycast，保留两个源 mesh 身份/变换，随白城家族撤销/失败恢复。不隐藏有明确名称的必做收藏来宣称完成。桥类沿当前 Tower Bridge 意图，不借历史“伦敦塔”措辞更换另一件建筑。

## 4. 生活物件、承托和实际发现的修复

五盆植物沿五个 `DEC_Plant_*`，有盆口、土面、茎和闭合叶片；无透明叶片堆叠、风动或新增盆数。窗边初稿与原窗帘的空间发生冲突，已只收紧这盆的盆/叶作者几何。修后盆体/叶片/土茎对真实窗帘前平面的最小净空分别为 **10.465 / 33.535 / 23.920 mm**；在该次窗盆修形阶段，其他四盆 position/normal/UV/index 和材质语义签名一致；最终导出清理改变零面索引/未引用顶点数组后，改以全部有效三角属性逐字节一致证明保留外观，窗帘、床、桌与原锚点不动。

窗盆初稿底部跨过 A 地板 2.5 mm 拼缝，不能把板缝误判为整盆悬浮。检测改为真实板顶承托、四象限稳定支撑和凹缝实际 substrate 验证，其他平面承托容差不放宽。最终收窄后的两处地面植物都为 **521/521** 样点直接落在板面，间隙0.35 mm；初稿跨缝证据仍保留，未冒充最终结果。

可乐挂在既有 `FUR_CoffeeTable` 下，`proxyMeshNames:[]`，茶几局部底中心 `[-.245,.4805,-.015]` m、高 .145 m、半径 .04 m。真实杯壁/杯口/底部、深色液体和三冰块都可见，未加罐、瓶、托盘或液体动画。初稿液体顶半径对实际内壁有约0.1124 mm越界，已缩小至.034 m；检验按导出内向三角面/内壁剖面逐顶点复核，数值容差仍10微米。

网页近景还找出加载顺序问题：C 杯子先到、A 茶几后到时，旧默认递归 proxy 搜集会误隐藏杯子。公共装配最小修复为排除已带 `roomAssetFamily` 的正式子节点；没有改家具、共享状态或机构。新增到达/卸载顺序测试防止再次发生。已安装不再只用 mesh 数推断：真实网页要求每个 C mesh 保留正式 PBR 材质。首轮杯子缺席截图/JSON作为失败证据保留，不能引用那次检查宣称可见通过。

小狗沿 `DEC_DogBedProxy`，仅替换 `_Mesh_1` 身体 proxy，保留 A 的 `VIS_DogBed`、软边与内垫。初稿尾部与软边相交，整体睡姿围绕 Y=.085 m 等比缩至.86后，通过实际软边三角面和内垫接触检查。为参考方向的金棕垂耳睡狗，无动画/毛发系统，不声称用户真实宠物。

茶几最终仅 **iPad + 一杯冰可乐 + 小植物**。电脑桌继续为既有显示屏、MacBook、Phone/支架、Marshall、耳机/架、植物、游戏键盘与鼠标；未加书堆、杯子、相框或台面大灯。原钢琴在桌下，植物/杯/灯壳不取得设备交互身份。

## 5. 灯具外壳与独立表面

见 [灯具对应表](V06C_LIGHT_FIXTURE_MAPPING.md) 和 `lib/room/assets/fixtureRegistry.ts`。两盏原台灯形成底座、杆、薄壁罩；另在现有桌后沿下方和柜顶板下方登记被允许的条体。四个根、四个独立 surface/material 均实际导出且为非自发光 PBR；surface 必须存在并从属正确根，缺失/误挂会整家族回退。

| 外壳 | 对应状态 | 本批边界 |
| --- | --- | --- |
| Bedside | 原 Bed 点灯与灯壳 X/Z 同位，空间对应明确 | 仅外壳/表面，未做状态绑定 |
| DeskStrip | 原桌后沿下表面；Desk 候选 | 不移动原点灯，不加桌面灯 |
| CabinetStrip | 柜顶下方四段，避开隔板；Cabinet 候选 | 不合成穿隔板的一整条，不改柜体 |
| Lounge | 保留休闲灯身份；组归属待定 | 不冒充 Desk，不新建第四组 |

三盏原点灯的位置/颜色/强度归一化和统一总开关保留。新增 surface `emissive=#000000`、`stateSurface:null`、`surfaceRole:none`，不接屏幕/Marshall binder，无新灯光系统、昼夜或音乐。

DeskStrip 实际长1.6 m，位于后撑后侧；对 B 琴体和滑轨17个行程姿态，新增条体的保守最小分离约 **228.316 mm**，原桌底到琴顶净空 **16.99993 mm**。柜条四段对 A 板材和八件收藏无相交，顶板接触偏移约0.5 mm。Lounge 归属以及 Desk/Cabinet 候选未来配光/绑定留给另行授权的 v0.8A，不以此假报三组独立控制完成。

墙画沿原 `DEC_WallArt`，木框加原创几何山/月图案，不含用户照片、个人信息、假证书或文字。无贴图和新入口。

## 6. 修改范围与保护结果

现有产品代码只改 `lib/room/assets/assetManifest.ts` 与 `assetAssembly.ts`，另增纯静态 `fixtureRegistry.ts`。变更为 C 登记、4 surface 必需层级、共享锚点避免误抑制、未分配泛称 DSP 可逆退场。其余为 C 源/导出/规格、生成器、检验、当前说明与证据。旧 B/A 浏览器脚本仅将明确枚举的 C 家族纳入兼容白名单，旧家族必须存在及故障断言保留。

**181 项严格保护输入逐字节不变**：FINAL、旧三件/A/B 可编辑源和正式资源、布局/语义/相机/钢琴入口/屏幕与共享状态、package/lock 等。7个共享观察项中仅 manifest/assembly 改动；不谎称这两个 Web 文件哈希未变。新 registry 单独列出。详情见 `validation/v06c/final/protected-review.json` 和 `spec-source-review-optimized.json`。

历史 A/B 报告及旧审计未覆写；当前状态、README、管线和预算新增 C 说明。没有升级安装依赖、创建新产品应用、改原布局、增加真实内容/设备页面、音乐、昼夜或新灯控。

## 7. 本轮验收

环境：macOS、本机 Blender 5.2.1 LTS、Node v26.0.0、项目原有锁定依赖；Chrome 153 headless / ANGLE SwiftShader、DPR1。1440×900、768×1024、390×844触屏仿真；这不是实体iPhone、Safari、Firefox或硬件GPU验收。

| 检查 | 本轮结果 | 证据 |
| --- | --- | --- |
| `npm run verify:asset` | 361通过 | `final/verify-asset-optimized.log` |
| `npm test` | 283/283 | `final/unit-tests-optimized.log`；含C几何58、到达顺序49、窗盆clearance4 |
| `npm run typecheck -- --incremental false` | exit 0 | `final/typecheck-optimized.log` |
| `npm run build` | exit 0，新生产包 | `final/build-optimized.log`、`final/production-build-inputs-optimized.json`、`final/production-build-verification-optimized.json` |
| C最终开发网页 | 56/56 | `all-optimized/collection-decor-browser.json` |
| C最终生产网页 | 51/51 | `production-optimized/collection-decor-production.json` |
| 既有钢琴20轮/交互/家具/B专项 | 10/10 + 37/37 + 50/50 + 57/57，共154/154 | `final/legacy-regression-summary.json` |
| 同条件性能 | 21/21采样一致性检查通过；有成本增长，见第8节 | `performance-optimized/performance.json` |

本表所有相对证据路径均基于 `validation/v06c/`。开发网页覆盖40家正式PBR安装与未误抑制检查、九入口真实mouse/touch/keyboard操作、Back/ESC精确Hero、设备四屏与Marshall材料隔离、垃圾桶/总开关、时间/天气不重置、无交互装饰、钢琴展开/半收/收回/桌下自然重开、reduced-motion及静态按需停止绘帧。

逐组立即接入并回归：首组几何16/网页24，第二组几何36/网页26，第三组最终几何49/网页24，第四组几何+顺序107/网页23；这是各自阶段快照，不相加冒充独立全屋测试总数。后续修复和最终结果优先于早期阶段日志。

13个C家族逐一GLB404→明确fallback→原交互可用→刷新恢复；可乐和灯带无旧proxy时明确缺席，不计installed。CPU覆盖缺根/坏surface、原子拒绝、卸载精确恢复和资源所有权；可乐/茶几、狗/狗窝、fixture/桌/柜所有相关到达与卸载排列均检查。C无外部/嵌入图像，不虚构坏图测试；旧A/Marshall相关坏图断言通过既有家具回归保留。取消加载与多次重进无重复安装，静态资源稳定。

本轮生产包来自当前产品源码和public的独立临时验证副本，**84个输入SHA与主工作区一致**，未注入inspection API；`npm run build` 后在本机3005验证。主项目不新增近景API、debug产品入口或收藏focus；测试用临时近景副本不能单独替代正常会话/生产证据。

## 8. 资源增量与性能

C13：**2,336,368 B（2.336 MB）、43,442三角面、66 mesh/primitives、51份家族内材质定义、0图片**。全初始41个GLB含冻结源：**4,662,556 → 6,998,924 B（+50.11%）**。文件包括嵌入资源，不重复加PNG；无新增C纹理请求或纹理展开分配。原18份嵌入图片的跨文件重复成本完整保留登记，未假设同名图片在GPU自动共享。

前置工作目标≤2 MB/约55 primitives本轮未达到（+336,368 B/+11）；65k三角面目标内。沿历史暂定审查线150k triangles/3 MB/+60 calls作复核，不把它们写成用户批准的硬限。开工已按同根/材质合并重复窗、栏杆、砖、茎叶；不建立不可见积木内部。最终成本分家列在上表，全屋/图片/剩余结构字节见 `final/asset-budget-ledger-optimized.json` 和 `ASSET_BUDGETS.md`。

| Hero视口 | calls 前→后 | 绘制三角面 前→后 | 连续诊断帧间隔 ms 前→后 | 增幅 |
| --- | ---: | ---: | ---: | ---: |
| 1440 px | 137 → 177 | 100,256 → 141,742 | 57.933 → 75.307 | +29.99% |
| 768 px | 137 → 177 | 100,256 → 141,742 | 50.115 → 68.220 | +36.13% |
| 390 px | 137 → 177 | 100,256 → 141,742 | 44.735 → 64.000 | +43.07% |

正常原生focus/Back的16个动作均值等权平均：桌面 **42.786 → 47.074 ms（+10.02%）**，390触屏仿真 **25.095 → 27.901 ms（+11.18%）**；每动作分布及原始样本保留，不能把此摘要当成所有帧混合的总体均值。按需静态会话可停止渲染，连续诊断Hero不代表静止页面持续掉帧。纹理对象估算仍为 **30,517,944 B、22个资产纹理UUID**，renderer纹理计数23，C新增估算为0；这是展开估算，未测VRAM。完整网络载荷、各动作分位数和资源项见 [性能对照](validation/v06c/final/PERFORMANCE_COMPARISON.md)。

**性能结论：采样工具检查通过不代表性能目标通过。** 实测+40 calls低于历史+60临时审查线；文件与primitives工作目标未达、软件渲染活动成本增加，作为本批未收敛风险保留。清理后的Hero采样略低、桌面动作均值略高于清理前，有限软件样本不能证明清理带来稳定帧率改善。未降低全站画质、改旧家具、合并独立灯面或取消收藏来降低数字。

性能增长后的收敛：另存 `optimization/pre-cleanup/` 非覆盖 C 快照；只对霍格沃茨、桥和植物的 GLB 严格零面积三角索引及未引用顶点做确定性导出清理，共去除 **1,366 面 / 1,054 未引用顶点**。实际 C 文件 **2,368,264 → 2,336,368 B（节省31,896 B）**，三角面 **44,808 → 43,442**，primitives/calls不因这一清理减少。源 `.blend` 保留原可编辑拓扑，统计分别登记 `sourceTriangles` 与最终导出 `triangles`；生成器每次导出都执行清理并对最终GLB重新导入验证。有效三角的 POSITION/NORMAL/UV、绕序、材质、节点路径/变换精确二进制一致（容差为0），见 `final/post-cleanup-visible-geometry.json`。其他10家C导出完全不改。较小的被遮挡面仅登记候选，没有在缺少逐面证明时泛删内壁或端盖；不把这些未实施候选写成已优化。

清理后再次运行361契约、283单测、类型检查、新生产构建、C开发/生产网页和独占性能。上表最终路径以 `*-optimized` 为准；四套旧专项154项发生在清理前，有效表面完全相同且旧27家/产品交互代码未变，清理后的C全套再次检查九入口及钢琴路径。清理前C网页/性能仍原位保留为过程证据。

性能采用本轮B27基线及最终C40相同视口、Hero、灯光、DPR与采样器，在其他Chrome/Blender/构建结束后单独运行。两秒Hero连续诊断、实际进入/返回的RAF间隔、Resource Timing网络载荷、纹理展开估算分别记录。软件渲染帧间隔包含浏览器调度和诊断，不是GPU时间；本地暖开发服务器也不是互联网冷加载，不能据通过断言宣布性能无回退或正式可上线。

## 9. 真实网页截图与录屏

最终常规会话和生产截图使用冻结Hero，近景只使用单独临时验证镜头、保持所有原模型可见。柜内窄格/被原沙发或桌挡住的收藏近景曾重拍，镜头记录说明广角透视；不改家具来换取截图。全部图为真实网页，不是Blender渲染。

| 内容 | 持久证据 |
| --- | --- |
| 同条件C前/C后Hero | `baseline/hero-{1440,768,390}.png`、`performance-optimized/hero-{1440,768,390}.png` |
| 正常最终整屋 | `all-optimized/hero-{1440,768,390}.png` |
| 新生产整屋、九入口/钢琴重开 | `production-optimized/production-hero-*.png`、`production-optimized/production-*-underdesk-reopen.png` |
| 柜整体、铁塔/霍格沃茨/白城正侧顶 | `inspection-architecture-r2/`、`inspection-final-details/inspection-restored-hero.png` |
| 千年隼/SLS/Mercedes近景 | `inspection-collections/` |
| Ferrari/Bridge无遮挡补拍 | `inspection-collections-r2/`及`VISIBILITY_REVIEW.md` |
| 杯体/液体/冰 | `inspection-living-r2/inspection-cola-VIS_Cola-hero-side.png` |
| 茶几三物、电脑桌、狗与A狗窝 | `inspection-final-details/inspection-coffee-context.png`、`inspection-final-details/inspection-desk-context-final.png`、`inspection-final-details/inspection-dog-and-A-bed.png` |
| 修后窗边整株与承托 | `inspection-final-details-r2/inspection-plants-window-final-whole.png`；原底部/帘间隙图在`inspection-final-details/` |
| 台灯/桌后条/柜条四段/墙画 | `inspection-fixtures/`与`inspection-final-details/` |
| 本轮短录屏 | `all-optimized/v06c-all-interaction.mp4`、`production-optimized/v06c-all-interaction.mp4`；14.68秒独立钢琴短片`piano-short-optimized/v06c-piano-underdesk-reopen.mp4` |
| 故障与刷新恢复 | `all-optimized/fault-glb404-*.png`、`all-optimized/restored-glb404-*.png`，对应JSON含原生输入/状态 |

[生产整屋截图](validation/v06c/production-optimized/production-hero-1440.png) · [生产网页录屏](validation/v06c/production-optimized/v06c-all-interaction.mp4) · [最终测试索引](validation/v06c/verification-summary.json)

近景图摄于严格零面清理前，清理后有效表面精确不变，正常最终/生产截图另行重拍。代理已逐图复核必要轮廓和空间问题并修复，**代理可见性检查不等于用户视觉批准**。所有C造型、白城暂定格位、色彩/细节仍等待用户明确视觉确认。

## 10. 未决项与停止点

本批模型/材质/源/导出/接入已完成，几何、资源回退、原九项行为、钢琴重开、生产构建和网页检查通过；**工作预算与活动成本尚有风险，整批不作“无条件全部技术通过”结论**。用户视觉确认独立待定。当前只交付 C 及已知限制，不自动执行后续版本。

- 用户视觉确认待完成；包含白城格位和全部风格化近似，不把文件生成/技术通过当作批准。
- Lounge未来灯组归属待定；Desk/Cabinet灯带与实际灯源、状态绑定/配光留给另行授权的v0.8A。
- 未测实体手机、硬件GPU、Safari/Firefox和互联网弱网；本轮用本机Chrome触屏仿真与软件WebGL。THREE.Clock弃用/ReadPixels软件警告在开工基线已有，未借C改依赖。
- 真实项目/个人内容、设备内容页面、音乐、昼夜、雨雪、独立灯控和可弹奏钢琴均不是本批成果。

下一步先复核 **C 视觉（含白城格位）与本批成本风险**；这些条件得到处理或明确接受后，才具备另行授权 v0.7A 内容数据的前提。本次停止在C报告及证据交付，不自动执行v0.7、v0.8或部署。
