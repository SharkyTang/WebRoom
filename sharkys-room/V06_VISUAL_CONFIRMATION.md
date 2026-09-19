# v0.6 用户视觉确认

打开 [当前生产构建预览](http://127.0.0.1:3005/)，刷新后检查。下面只收集视觉和操作手感意见；技术测试结果另见 [实施报告](V06_VISUAL_INTERACTION_FIX_REPORT.md)。用户于 **2026-09-19** 在本任务中回复“通过”，本批四组均已记录为 **用户视觉确认通过**。下列操作与截图保留作为确认依据。

[35 秒真实网页操作录屏](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06-fix/production-evidence-r2/visual-interaction-demo.mp4)。录屏来自无 debug/检查 API 的生产构建，全部操作使用原生鼠标、滚轮与按钮。

## 1. 旋转、缩放与复位

在总览按住鼠标左键拖动，或单指拖动；滚轮或双指缩放。进入任一现有交互物件，再做同样操作，最后点“复位视角”。相机保持正立，墙体保持显示。记录旋转是否顺手、缩放距离是否够用；遮挡仍可能由原家具布局造成。

![真实网页总览旋转](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06-fix/production-evidence-r2/02-room-rotation.png)

记录：**通过**。确认日期：2026-09-19；依据：用户在本任务中回复“通过”。

## 2. 外部退出与面板操作

进入物件，点击空白/地板/墙/其他物件，或页面边缘空白，应返回默认总览。点击其他物件时第一次只退出，再点才进入。拖动结束不能触发退出；点当前物件仍沿用原行为。试用时间滑块、天气按钮和面板内空白，确认不会误退出。Back 和 ESC 仍可用。

[退出后的默认总览](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06-fix/production-evidence-r2/11-outside-return.png)；录屏展示钢琴外部退出和垃圾桶退出关盖。

记录：**通过**。确认日期：2026-09-19；依据：用户在本任务中回复“通过”。

## 3. 钢琴与桌子的连接

进入钢琴，将视角拖低，查看桌底固定支架与两侧轨道。依次收回、拉出，再收回并退出；点击桌下入口重新打开。中间状态可暂停录屏观察。

![钢琴拉出状态的连接](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06-fix/production-evidence-r2/04-piano-connection-side.png)

[收回状态](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06-fix/production-evidence-r2/05-piano-retracted.png) · [行程中间的真实录屏帧](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06-fix/production-evidence-r2/piano-frame-15.25.png) · [桌下重新打开](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06-fix/production-evidence-r2/07-underdesk-reopened.png)。中间帧不声称恰好 50%；精确半行程和两端由 33 点几何测试核验。

记录：**通过**。确认日期：2026-09-19；依据：用户在本任务中回复“通过”。

## 4. 垃圾桶桶身、桶口与翻盖

进入垃圾桶，缩远后从两侧观察铰链，再稍微抬高观察内壁与桶底。点击外部，观察原来的先关盖再返回流程。确认卷边、盖裙的活动间隙是否自然。

![垃圾桶打开及固定连接](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06-fix/production-evidence-r2/08-trash-open-full.png)

[侧面铰链](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06-fix/production-evidence-r2/09-trash-hinge-side.png) · [抬高后的内腔](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06-fix/production-evidence-r2/10-trash-cavity-other-side.png) · [开合中间帧](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06-fix/production-evidence-r2/trash-frame-32.35.png) · [闭合帧](/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room/validation/v06-fix/production-evidence-r2/trash-frame-32.57.png)。内腔沿用现有较暗的材质与照明，深浅观感仍需确认。

记录：**通过**。确认日期：2026-09-19；依据：用户在本任务中回复“通过”。

其余 40 组资产的具体位置与精修候选见 [逐物件清单](V06_ASSET_DETAIL_REVIEW.md)。本批交付后停止，不自动开始精修、后续版本或部署。
