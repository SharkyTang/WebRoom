# v0.7A 内容数据层交付报告

**已完成本次授权的 A00–A06，停止于 v0.7A。** 四个内容域的数据契约、校验、批准/素材检查、只读查询和短摘要接口已落地；没有接入正式设备页面、公共面板或四屏运行时。本批新增25个数据/模块/测试/文档文件，开工3,553个原文件全部未变。没有提交、推送或部署。

日期：2026-09-19。工程：`/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room`。证据 run-id：`20260919-145055-d84262`，以下证据链接均为本次实跑结果。

## 实现完成情况

| 任务 | 实际交付 | 状态 |
| --- | --- | --- |
| A00 基线/完整快照 | 核实工程与4个用户未提交文件；完整归档、逐文件SHA及新目录恢复验证；三视口原生网页基线 | 完成 |
| A01 内容盘点 | Monitor→Projects、MacBook→About/Education、iPad→Memories、Phone→Contact；占位/真实资料分清 | 完成 |
| A02 数据结构 | 六份JSON、schemaVersion/contentRevision、稳定ID、排序、项目/教育状态、精确日期、可空区块 | 完成 |
| A03 校验与接口 | 必需/可选/枚举/日期/引用/路径/链接校验；整条批准散列与实际文件校验；只读查询、empty/error/not-found、同源短摘要 | 完成 |
| A04 真实资料/素材登记 | 正式数据全部合法空；批准数0、素材0，逐项登记缺口；没有假项目、经历、照片故事或联系方式 | 结构完成，真实资料未录入 |
| A05 测试/更新指南 | 67项隔离内容测试、明确TEST ONLY夹具、逐步新增/批准/下架/回退指南 | 完成 |
| A06 工程/网页/交付 | 类型、全量单测、资产契约、隔离生产构建、三视口网页回归、真实截图/录像、保护哈希/产物检查 | 本批已测范围通过 |

实现路径：`content/room/`、`lib/content/`、`scripts/validate-content.ts`、`tests/content.test.ts`。正式数据与测试夹具隔离，内容层不依赖Three、Canvas、RoomApp、store、相机、机构或屏幕运行时。Node-only加载/发布校验不提供HTTP或debug endpoint；所有批准/字段/文件检查成功才返回公开投影，错误不会返回部分记录。

## 技术验收：本次真实结果

| 检查 | 结果 | 新证据 |
| --- | --- | --- |
| 内容结构/批准/实际文件检查 | 合法，四域empty，0条真实内容 | [content-check-r1.log](validation/v07a/20260919-145055-d84262/content-check-r1.log) |
| 内容专项 | **67/67** | [content-tests-r2.log](validation/v07a/20260919-145055-d84262/content-tests-r2.log) |
| 类型检查 | 通过 | [typecheck-r3.log](validation/v07a/20260919-145055-d84262/typecheck-r3.log) |
| 全量单测/几何/状态 | **363/363**，其中已含67项内容测试 | [unit-r2.log](validation/v07a/20260919-145055-d84262/unit-r2.log) |
| 原资产/85节点契约 | **361/361** | [asset-contract.log](validation/v07a/20260919-145055-d84262/asset-contract.log) |
| 当前源生产构建 | 通过，隔离副本 | [build-r2.log](validation/v07a/20260919-145055-d84262/build-r2.log) |
| 原九项交互/Back/ESC/共享状态 | **37/37** | [开发结果](validation/v07a/20260919-145055-d84262/final/interactions/interaction_browser.json) |
| 三视口旋转/缩放/复位/外部退出/控件隔离 | **42/42** | [开发导航](validation/v07a/20260919-145055-d84262/final/navigation/results.json) |
| 钢琴发现路径，含20轮收回→返回→桌下自然重开 | **10/10** | [钢琴结果](validation/v07a/20260919-145055-d84262/final/piano/piano-browser.json) |
| 双指、取消、拖出画布、减少动画、刷新/resize | **8/8** | [手势结果](validation/v07a/20260919-145055-d84262/final/gestures/results.json) |
| 生产三视口九项导航/退出 | **36/36** | [生产导航](validation/v07a/20260919-145055-d84262/production-navigation/results.json) |
| 生产关键路径/公开边界/实际资产 | **8/8** | [生产录屏套件](validation/v07a/20260919-145055-d84262/production-room/results.json) |
| 基线→最终网页截图 | **60/60整图RGBA完全一致**，未设差异容差 | [逐图像素比较](validation/v07a/20260919-145055-d84262/baseline-final-pixels.json) |
| 保护文件 | **3,553/3,553 SHA一致** | [保护哈希索引](validation/v07a/20260919-145055-d84262/protected-files.json) |
| 生产输入/公开产物 | 170输入一致；106个产物文件无测试标记；无遗漏运行时输入 | [构建与隐私检查](validation/v07a/20260919-145055-d84262/production-inputs-and-privacy.json) |

开发基线另实跑42项导航和10项钢琴（基线4轮），不将其重复累计到最终结果。最终网页覆盖1440×900、768×1024和390×844。环境为macOS、Node v26.0.0、原锁定依赖、安装版Chrome headless / ANGLE SwiftShader；390触摸与双指为浏览器模拟。

最终生产副本 `/private/tmp/sharkys-v07a-build-3569s4xx`，仅通过本机 `127.0.0.1:3108` 验收；[170个输入](validation/v07a/20260919-145055-d84262/build-inputs.json) 与当前源对应。Next生成声明只留在副本；原 next-env.d.ts、next.config.ts、tsconfig.json 和依赖/lockfile未变。早期成功构建r1随后被r2替代，两份日志和输入记录都保留。

所有已有正式资产/装配保持：当前40组GLB **6,733,744 B**，加冻结FINAL **7,145,636 B**。生产网页实际请求的41个GLB逐一与当前文件SHA一致，见[服务资源散列](validation/v07a/20260919-145055-d84262/production-room/served-asset-hashes.json)。这是本批重新读取结果，新增模型/纹理字节为0；没有降低画质来通过回归。

## 真实网页证据

[52.28秒生产网页操作录屏](validation/v07a/20260919-145055-d84262/production-room/room-regression.mp4)（11,910,482 B）。从真实页面原生操作录制，包含总览旋转、钢琴连接/收回/桌下自然重开、四设备原页面、环境/电源控件、垃圾桶开合及外部返回；没有使用临时产品页面或生成图片。原始WebM和三视口完整导航录像一并保留。

- [1440生产总览](validation/v07a/20260919-145055-d84262/production-navigation/1440-hero.png) · [768总览](validation/v07a/20260919-145055-d84262/production-navigation/768-hero.png) · [390总览](validation/v07a/20260919-145055-d84262/production-navigation/390-hero.png)
- [钢琴连接](validation/v07a/20260919-145055-d84262/production-room/03-piano-connection.png) · [收回](validation/v07a/20260919-145055-d84262/production-room/04-piano-retracted.png) · [桌下重开](validation/v07a/20260919-145055-d84262/production-room/06-underdesk-reopened.png)
- [垃圾桶连接](validation/v07a/20260919-145055-d84262/production-room/08-trash-hinge.png) · [外部退出后总览](validation/v07a/20260919-145055-d84262/production-room/09-returned-overview.png)

原相机/输入/返回、首次MacBook和钢琴动作节奏、共享状态规则均按原行为保留。内容层未接UI；这些证据证明原房间未被破坏，不是新内容页验收。

## 真实内容完整度与用户待确认

**批准并录入的真实内容为0。** Projects、About、Education、Memories和Contact均为missing；这是资料未齐，不是数据结构失败。没有私人原件、未批准文案或测试夹具进入public/客户端。生产请求源码JSON、批准登记、测试目录和假设内容API均返回404；现有调试代码没有内容模块引用。

用户后续需要提供：首批项目标题/摘要/真实状态/职责/技术/背景与贡献；对外显示名/About/教育文案；获准展示的照片及alt/说明/隐私和许可范围；至少一种有效且允许公开的联系方式。封面、头像、公开链接、成果数字、简历均可后补。具体对应字段见[缺口清单](docs/content/CONTENT_GAPS.md)。新UI语言/参考和垃圾桶是否改文案待确认；当前垃圾桶彩蛋保持不变，未建立新业务系统。

原四组用户视觉确认仍为2026-09-19通过，本批没有改动它们，也没有把技术测试冒充新的用户体验批准。

## 失败记录与未测限制

[失败登记](validation/v07a/20260919-145055-d84262/failure-register.json) 保留：首轮快照Python解包参数不兼容（未写产品文件，另建成功快照）；Chrome/监听端口沙箱EPERM（取得本机执行权限后复跑）；新内容测试中的类型缩窄判断错误（已修正）。最终上述内容/工程/网页结果无未解决失败；没有删失败日志或调低断言。

没有本次重新执行所有A/B/C专项故障注入、资产逐件视觉精修或独立性能benchmark；本批用实际GLB单测、源字节保护和九项/导航/钢琴/手势/生产检查覆盖相关回归。C的历史资源目标未达和活动软件渲染成本仍保留，未宣称达到60FPS或全平台解决。实体手机/平板、Safari、Firefox、硬件GPU、真实弱网和完整辅助技术未测。B的长内容滚动、图片加载错误UI、复制/外链、内部返回、非3D内容入口尚未实施与验收。

## 交付与回退

必需文档：[CONTENT_SCHEMA](docs/content/CONTENT_SCHEMA.md)、[CONTENT_INVENTORY](docs/content/CONTENT_INVENTORY.md)、[CONTENT_GAPS](docs/content/CONTENT_GAPS.md)、[CONTENT_APPROVAL_REGISTER](docs/content/CONTENT_APPROVAL_REGISTER.md)、[CONTENT_UPDATE_GUIDE](docs/content/CONTENT_UPDATE_GUIDE.md)、[V07A_BASELINE](V07A_BASELINE.md)、[V07A_FILE_CHANGES](V07A_FILE_CHANGES.md)。本批新增文件逐项列于[file-changes.json](validation/v07a/20260919-145055-d84262/file-changes.json)，证据完整索引与SHA见[EVIDENCE_INDEX.json](validation/v07a/20260919-145055-d84262/EVIDENCE_INDEX.json)。

完整受限快照：`/Users/shaoqitang/Documents/ChatGPT/网页小屋/local-backups/v07a-start-20260919-145055-d84262`，包含源码、配置、证据、可编辑模型、GLB/纹理、点文件及不可重建忽略文件。归档SHA `2cd69952a9d1ff0cf3150d738a7ea7ade00afee3b21fa26722a9eb35f043bf4d`；详见[RESTORE.md](../local-backups/v07a-start-20260919-145055-d84262/RESTORE.md)。.git全部历史明确未归档，原索引/状态/HEAD/暂存和未暂存binary diff已另存。

回退前先保护后续工作，把归档解到新空目录并核验manifest，再按变更清单隔离本批新增文件。原文件本批零变化，不需要用旧提交覆盖；禁止reset/clean或覆盖式恢复。未提交、未推送、未部署。

**本批在A06交付后停止。下一批只建议“B01：公共界面＋Monitor完整闭环”，等待另行授权。**
