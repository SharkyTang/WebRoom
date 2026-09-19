# v0.6 视觉与交互修整实施报告

日期：2026-09-19。**本批实施及技术验收完成；四组用户视觉确认于 2026-09-19 通过。** 当前生产预览：[http://127.0.0.1:3005/](http://127.0.0.1:3005/)。本批到此停止，不进入后续版本或部署。

## 交付入口

- [用户视觉确认步骤与真实截图](V06_VISUAL_CONFIRMATION.md)
- [约 35 秒生产网页操作录屏](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06-fix/production-evidence-r2/visual-interaction-demo.mp4)
- [全部 40 组物件的结构/细节登记](V06_ASSET_DETAIL_REVIEW.md)
- [逐模型资源增量账本](V06_VISUAL_FIX_RESOURCE_LEDGER.md)
- [技术结果机器可读索引](validation/v06-fix/final/ACCEPTANCE_SUMMARY.json)

## 本批结果与保护范围

房间总览和原九项交互近景已支持左键/单指旋转、滚轮/双指缩放与“复位视角”。相机正立、禁止平移/自动旋转/惯性；保留原 FOV、Hero 和焦点。总览距离限制为原观察距离的 0.65–1.4 倍，近景为 0.7–1.6 倍。可见实体的真实三角面用于阻止穿越，包含墙与玻璃；不会为导航自动隐藏或透明化墙体。

点击空白、地面、墙、其他物件，以及页面边缘空白，统一进入原返回流程；第一下只退出，再点才进入另一个物件。当前物件仍保留原点击行为。面板、按钮、滑块和选择器不触发外部退出。以 6 CSS 像素区分拖动；处理多指、取消、失去指针、拖出画布与动画中的退出排队。聚焦/返回/机构动作/视角复位期间暂停手动相机控制；静止后停止按帧更新。复位只恢复当前视图，不重新触发机构。

钢琴增加桌底固定支架、固定外轨、半行程中轨及紧固件；固定件挂到原桌节点，原内轨随原琴体移动。中轨只读取原轨道位移的一半，没有独立动画或状态。垃圾桶增加桶身固定支座、轴销与随盖转动的活动套筒，盖后沿有真实轴孔。

原布局、85 个原始节点、默认镜头、九个语义入口、钢琴 0.65 m 行程和桌下重新打开、垃圾桶 100° 转角、原 Back/ESC 规则保持。原琴体/键盘/内滑轨和原连续桶身的几何缓冲逐项一致。38 组其他模型及保护清单共 **187 个文件**与开工快照 SHA256 一致，包括收藏格位/灯具登记、依赖声明、用户原有类型声明和局域网配置。

共享状态仍按原规则：钢琴位置、Marshall 电源、总灯、时间/天气返回后保留；笔记本与垃圾桶按原流程收回/关闭。设备内容、音乐、昼夜与灯组功能范围保持。新增连接件归属钢琴原交互，没有第十个交互对象。

## 快照与回退

开工完整快照：

[快照恢复说明](../local-backups/v06-fix-start-20260919-120407/RESTORE.md) · [文件清单与 SHA256](../local-backups/v06-fix-start-20260919-120407/manifest.json) · [归档验证](../local-backups/v06-fix-start-20260919-120407/verification.json)。

位置：/Users/shaoqitang/Documents/ChatGPT/网页小屋/local-backups/v06-fix-start-20260919-120407。归档 workspace.tar.gz 共 **940,669,018 B**，已重新逐项读取验证 **2,440 个文件**，可恢复项目文件总量 1,006,637,683 B。源码、可编辑模型、正式资产、材质、登记、已有证据及未提交/未跟踪项目文件均包含。Git 内部数据、历史快照、node_modules/.next 等可重建目录列为排除项；HEAD、暂存/未暂存补丁与状态单独保存。

归档 SHA256：

`5236fde07674cd1a4b243e0e4fc6be86ebef6da9c70026c9b84d8fc3c825f7c5`

回退时先解包到新建空目录，对 manifest.json 逐项校验，再选择本批相应文件恢复；避免用旧提交覆盖开工时用户已有更改。钢琴组包含生成器/源/GLB/manifest/半行程跟随器；垃圾桶组包含生成器/源/GLB/manifest。输入与相机组共享 store/控制器，应作为完整组回退并重跑相关交互。开工快照保留，不在当前工作区自动执行覆盖回退。

## 结构验收

| 对象 | 本次验证 | 结果 |
| --- | --- | --- |
| 钢琴 | 原体/键/内轨 position、normal、UV、index 缓冲保持 | 通过 |
| 钢琴 | 0–0.65 m 共 33 点；固定件桌底间隙约 0.35 mm；原琴体净空不少于约 16 mm | 通过 |
| 钢琴 | 外轨/中轨轴向重叠不少于约 85 mm，中轨/内轨不少于约 57 mm | 通过 |
| 钢琴 | 对 A 桌板、柜体、横撑、椅子与桌下灯带做真实三角面/包络检查 | 通过 |
| 钢琴 | 原生网页 20 轮收回、Back、桌下重开；精确端点及 Hero 返回 | 通过，无累积偏移 |
| 垃圾桶 | 原连续外壁/卷边/内壁/底面缓冲保持；无封口遮盖面 | 通过 |
| 垃圾桶 | 固定支座归桶身，活动套筒归盖；原 pivot 与 100° 角保持 | 通过 |
| 垃圾桶 | 0–100° 共 33 个角度，活动盖/铰链与桶口、固定件真实三角面相交检查 | 通过 |

新增固定件独立定义约束，没有放宽全部原琴体碰撞条件。中轨依赖原机构派生位置；铰链仅留真实转动间隙。每一组都完成导出后立即接入网页验证，再继续下一组；[钢琴阶段](validation/v06-fix/stage-piano/browser/interactive-assets-browser.json) 和 [垃圾桶阶段](validation/v06-fix/stage-trashcan/browser/interactive-assets-browser.json) 保留。几何采样与网页证据不代表任意连续时间、所有设备下的数学穷尽证明。

## 工程与网页技术验收

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| 单元/实际 GLB 几何/场景契约 | 296/296 | [日志](validation/v06-fix/final/unit.log) |
| 原资产与语义校验 | 361/361 | [日志](validation/v06-fix/final/verify-asset.log) |
| 类型检查 | 通过 | [日志](validation/v06-fix/final/typecheck-r2.log) |
| 最终 Next 生产构建 | 通过 | [日志](validation/v06-fix/final/build-r2.log) |
| 原九项交互与共享状态 | 37/37 | [结果](validation/v06-fix/final/interactions/interaction_browser.json) |
| A 家具网页回归 | 50/50 | [结果](validation/v06-fix/final/furniture-r2/furniture-browser.json) |
| B 交互资产网页回归 | 57/57 | [结果](validation/v06-fix/final/b/interactive-assets-browser.json) |
| C 收藏装饰网页回归 | 56/56 | [结果](validation/v06-fix/final/c/collection-decor-browser.json) |
| 钢琴发现路径（含 20 轮连续重开） | 10/10 | [结果](validation/v06-fix/final/piano-r2/piano-browser.json) |
| 导航、退出、页面空白及面板隔离 / 三宽度 | 42/42 | [结果](validation/v06-fix/final/navigation-r3/results.json) |
| 双指、取消、拖出画布、减少动画与刷新 | 8/8 | [结果](validation/v06-fix/final/gestures-r3/results.json) |
| 最终生产导航与退出 / 三宽度 | 36/36 | [结果](validation/v06-fix/final/production-navigation-r2/results.json) |
| 最终生产 A/B/C 安装、九项路径及故障恢复 | 51/51 | [结果](validation/v06-fix/final/production-c-r2/collection-decor-production.json) |
| 全部资产隔离网页检查 / 补拍 | 72/72 | [结果](validation/v06-fix/final/inspection/collection-decor-inspection.json) |
| 被遮挡资产补拍与保护检查 | 10/10 | [结果](validation/v06-fix/final/inspection-supplement/collection-decor-inspection.json) |
| 同页 20 次进入/复位/返回的监听与资源检查 | 通过，无监听数量增长，闲置停止渲染 | [结果](validation/v06-fix/final/lifecycle-r2/results.json) |

覆盖 1440×900、768×1024、390×844，原生鼠标/键盘/触摸事件、双指、快速点击、焦点和机构动画中的返回、控件隔离、刷新、尺寸变化、加载取消与重挂载。生产构建没有 debug/inspection API；[89 个生产输入 SHA256 对照](validation/v06-fix/final/production-inputs-verified.json) 与当前工作区一致。生产构建在隔离目录执行，避免 Next 自动生成的 next-env.d.ts 覆盖用户工作区已有声明。

环境：macOS 本机已安装 Chrome，headless ANGLE SwiftShader，触摸为浏览器模拟。没有将这些结果写成实体手机、Safari 或硬件 GPU 全平台通过。故障注入引起的预期 404/回退单独登记，不计作正式资产加载成功；正常会话的运行时错误检查为零。

测试中同步了本次授权的外部点击规则；原“同一屏幕点快速多击仍留在物件”的断言与新规则冲突，快速外部点击现验证排队退出。窄屏等待曾因重复搜索全部射线目标超时，已改为稳定镜头下复用候选像素并逐帧独立射线确认。早期调试记录保留，上表指定的最终目录才是验收依据。

## 资源与性能

40 组正式 GLB：6,587,032 → **6,733,744 B**，增加 **146,712 B（143.27 KiB，2.23%）**；三角面增加 **3,868**，primitives 增加 5，材质和纹理增量均为 0。加上未变的原 FINAL，模型文件共 **7,145,636 B**。完整逐项数值与可编辑 .blend 增量见 [资源账本](V06_VISUAL_FIX_RESOURCE_LEDGER.md)。

以开工时完整 40 组 C 版本为基线，保留原画质、FOV、光照、资源条件，按视图各测三次。最终九组帧间隔中位数均未超过 5% 退化门槛。768 钢琴视图初次为 +5.99%，独立复测未复现（33.43 ms，−11.71%）；两轮原始记录均保留，未在测量间降画质或更换模型。当前结论限于未观察到可重复的超阈值退化，不能推断所有硬件都没有性能影响。

| 宽度 | 视图 | C 基线 ms | 修整后 ms | 变化 |
| --- | --- | ---: | ---: | ---: |
| 1440 | hero | 80.24 | 77.16 | -3.84% |
| 1440 | piano | 50.14 | 49.53 | -1.21% |
| 1440 | trashcan | 30.40 | 28.25 | -7.06% |
| 768 | hero | 71.66 | 66.85 | -6.71% |
| 768 | piano | 37.86 | 33.43 | -11.71% |
| 768 | trashcan | 18.07 | 16.71 | -7.53% |
| 390 | hero | 66.84 | 64.71 | -3.19% |
| 390 | piano | 28.05 | 28.46 | +1.44% |
| 390 | trashcan | 16.71 | 16.71 | +0.00% |

[性能对照及 draw calls/三角面/纹理计数](validation/v06-fix/final/PERFORMANCE_COMPARISON.md)。这组数值用于同条件回归，不能宣称真实手机帧率或把波动解读为优化收益；按需渲染的静止停止由独立检查验证。首次被 HMR 干扰的采样作废；1440 因与末尾手势测试短暂重叠而独立复测；768 因初次钢琴视图超阈值独立复测。最终表不使用已知受干扰数据，性能对照保留 768 初次异常及完整复测结果。

## 真实网页证据与遗留项

主录屏为 1440×900 生产构建、约 34.88 秒，包含总览旋转、近景旋转/缩放、外部退出、钢琴完整开合与桌下重开、垃圾桶开合/连接与内腔。三宽度完整导航录像和截图另保留在 production-navigation-r2；资产生产回归录像在 production-c-r2。

| 观察点 | 真实生产截图 |
| --- | --- |
| 总览旋转 | [截图](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06-fix/production-evidence-r2/02-room-rotation.png) |
| 钢琴拉出及桌底连接 | [截图](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06-fix/production-evidence-r2/04-piano-connection-side.png) |
| 钢琴收回 / 行程中途 | [收回](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06-fix/production-evidence-r2/05-piano-retracted.png) · [录屏中间帧](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06-fix/production-evidence-r2/piano-frame-15.25.png) |
| 桌下重新打开 | [截图](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06-fix/production-evidence-r2/07-underdesk-reopened.png) |
| 垃圾桶全开 / 铰链 / 内腔 | [全开](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06-fix/production-evidence-r2/08-trash-open-full.png) · [侧面](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06-fix/production-evidence-r2/09-trash-hinge-side.png) · [内腔](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06-fix/production-evidence-r2/10-trash-cavity-other-side.png) |
| 垃圾桶开合中途 / 闭合 | [中间帧](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06-fix/production-evidence-r2/trash-frame-32.35.png) · [闭合帧](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06-fix/production-evidence-r2/trash-frame-32.57.png) |

录屏中间帧只证明真实动画中间状态，不声称精确 50%；33 点几何测试包含精确半行程。全部 40 组资产另有 67 个隔离网页检查视图及 5 个补拍视图。隔离相机只用于资产核查，不作为用户正常导航和生产验收的替代。

其他物件的接缝、按钮、纹理、材质等已逐项列入 [结构/细节清单](V06_ASSET_DETAIL_REVIEW.md)，状态为精修候选待处理/待视觉确认，未扩大模型修改范围。千年隼、床头柜和床头灯的部分近照存在原家具遮挡，已补拍并登记观察限制；薄灯带在总览仍难辨。页眉沿用旧 v0.6A 文案作为遗留登记，实际 40 组装配以当前检查结果为准。

## 用户视觉确认与停止点

| 分组 | 技术结果 | 用户视觉结果 |
| --- | --- | --- |
| 房间/近景旋转、缩放 | 通过 | 用户确认通过（2026-09-19） |
| 外部退出与操作隔离 | 通过 | 用户确认通过（2026-09-19） |
| 钢琴连接与三种行程观感 | 通过 | 用户确认通过（2026-09-19） |
| 垃圾桶衔接、间隙与铰链观感 | 通过 | 用户确认通过（2026-09-19） |

用户于 2026-09-19 在本任务中明确回复“通过”，据此将 [视觉确认材料](V06_VISUAL_CONFIRMATION.md) 中本批四组记为通过。技术证据仍单独保留；其他物件的后续精修候选仍保留原登记，不因本次确认自动执行。当前停止于本批交付。
