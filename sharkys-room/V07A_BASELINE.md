# v0.7A 开工基线

实施日期：2026-09-19；run-id：`20260919-145055-d84262`。工程为 `/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room`，Git根为上一级网页小屋，分支 `main`，HEAD `6472e39e669a130a63adc21a77c3851c873c5a70`。本批不提交、推送或部署。

## 当前实际状态

v0.6A/B/C 已制作并接入，40个正式家族，冻结FINAL仍独立保留。最新 V06_VISUAL_INTERACTION_FIX_REPORT.md 和 V06_VISUAL_CONFIRMATION.md 的四组（旋转缩放、外部退出隔离、钢琴连接/行程、垃圾桶连接/铰链）已于2026-09-19获用户确认，本次用户再次明确；不要求重新批准。旧B/C“尚未开始”及对应旧待确认不作为当前依据。

开工有4个用户未提交文件，全部保存并保护：V06_ASSET_DETAIL_REVIEW.md、V06_VISUAL_CONFIRMATION.md、V06_VISUAL_INTERACTION_FIX_REPORT.md、validation/v06-fix/final/ACCEPTANCE_SUMMARY.json。没有暂存、未跟踪内容层或现成B页面。此前忽略的原始录像、Blender备份与点文件也纳入快照。只查阅本工程、明确附件与项目相关指导；没有从个人资料或网络补齐内容。

已读取 README/package/lockfile、测试入口、RoomApp、InteractionOverlay、共享store、相机控制、输入/机构、screenTextures及正式资产登记。现有四屏与Contact标签是占位，本批不将其转作真实资料。

## 可恢复快照

位置：`../local-backups/v07a-start-20260919-145055-d84262/`。

- workspace.tar.gz：1,578,753,077 B，SHA-256 `2cd69952a9d1ff0cf3150d738a7ea7ade00afee3b21fa26722a9eb35f043bf4d`。
- manifest.json：3,853个条目、3,553个文件，原文件总字节1,662,901,644；无符号链接。manifest SHA-256 `38db4d02c1f439451c79444ed80f0dc59972131bf6e0769358f84a351b43df04`。
- 重新逐文件读取归档；解包到新建 restore-verified 并逐文件核验大小/SHA；同时确认源在归档期间没有变化。
- 包含工作区根下源码、配置/类型声明、文档、测试、已有证据、可编辑模型、GLB、纹理、点文件及全部不可重建忽略文件。
- 排除实际安装/缓存：sharkys-room/node_modules、sharkys-room/.next、tsconfig.tsbuildinfo、实际 __pycache__ / .pyc，以及既有local-backups树。另明确排除.git历史；HEAD/分支/完整状态、索引清单及原索引、暂存/未暂存binary diff单独保存。**不宣称全部Git历史已归档**。精确逐项排除见私有manifest。
- 快照目录0700，文件由受限umask生成，仅本机保存；不将配置原文、Git补丁或完整私人归档复制到public/共享证据。

首轮快照因 Python3.9 的 tarfile 不支持 filter 参数而在解包验证阶段失败，未写产品文件。失败快照与 verification-failed.json 留在原唯一目录，随后建立上述全新成功快照。没有覆盖恢复、reset或clean。

## 本次真实网页基线

开工开发服务 `127.0.0.1:3000`，PID85161，lsof确认cwd为当前工程。没有重启用户服务。Chrome headless / ANGLE SwiftShader；三个视口1440×900、768×1024、390×844（390为触摸模拟）。

- baseline/navigation-r2：本次实跑42/42，三视口九项近景、总览/近景旋转缩放复位、外部退出、第一下只退出/第二下进入、动画中排队返回、面板/控件/边缘隔离、闲置停止渲染；截图60张与三份原始录像。
- baseline/piano：本次实跑10/10，4轮桌面自然重开循环、模拟触摸桌下入口、减少动画、精确端点、正常与隐藏调试Canvas像素比较。
- baseline/navigation.log：首轮Chrome沙箱启动被EPERM阻止，保留原日志；提升本机浏览器执行权限后重跑成功，未把启动失败算产品故障。

全部路径相对 `validation/v07a/20260919-145055-d84262/`。基线取自本次，不复制历史计数。

## 受保护行为与首次节奏

原九项为monitor/macbook/ipad/marshall/piano/trashcan/lightswitch/phone/window。返回目标为默认Hero；复位只恢复当前视图，不重放机构。左键/单指旋转、滚轮/双指缩放、6 CSS像素点击/拖动区分和原碰撞保护保留。外部第一下只退出，控件隔离。

真实源码与本轮基线录像：首次MacBook保留初始打开，聚焦后先关再开；钢琴初始伸出，首次聚焦先收再展；后续按原实际状态切换。原cameraFocus/Return为1.1s，hinge为0.55s，piano单段0.65s，power为0.2s，减少动态行为不变。钢琴原0.65m行程、中轨半行程跟随与桌下自然重开保留；垃圾桶100°及正确固定/活动连接保留。

钢琴位置、Marshall电源、总灯、time/weather退出后保留；MacBook/垃圾桶退出按原流程关闭。没有修改机构、模型、布局、画质或屏幕Canvas。页面角标/package中的历史v0.6A文字保持。

## 历史限制

C13曾未达≤2MB/约55 primitives目标，活动软件渲染成本仍在；最新四组确认不消除这些限制。本次不做性能优化或独立性能benchmark。实体手机/平板、Safari、Firefox、硬件GPU、互联网弱网与完整辅助技术未测；既有其他模型精修候选不纳入A。
