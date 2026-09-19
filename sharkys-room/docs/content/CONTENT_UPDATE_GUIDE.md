# 内容维护指南

工作目录：`/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room`。本批只建立内容数据层，网页外观没有新页面；正式预览真实内容需下一批另行授权。

## 收集与更新

1. 先取得用户明确提供的材料和具体公开范围；照 CONTENT_GAPS.md 收集少量决定性字段。私人原件和草稿保存在用户指定的私有位置，不能临时放入 public、前端模块或测试目录。
2. 修改 `content/room/` 对应的 projects/profile/memories/contact JSON。参照 CONTENT_SCHEMA.md，保留既有 ID；新增 ID 不依赖数组下标。没有信息就省略可选字段；About/intro 可 null，集合可 []。不要拿 tests/content/fixtures 的例子填产品数据。
3. 如有真实素材，只在获得授权后处理公开衍生图；独立保留原件，检查人物/位置/EXIF/许可。把衍生图放到 `public/content/projects/<id>/`、`profile/`、`memories/<id>/` 等安全小写路径，在 media.json 填实际尺寸、字节、SHA-256、用途和alt。可用系统 `shasum -a 256 <具体文件>` 获取文件散列。校验器只核文件头/尺寸/字节，不替代实际看图或清除隐私元数据。
4. 更新 site.json 的 contentRevision。取得针对该版本的明确批准后，在 CONTENT_APPROVAL_REGISTER.md 写不含敏感原文的范围和依据 ID，再在 approved-records.json 记录 key/status/revision/sha256/approvedOn/evidence。规范记录散列用 `lib/content/publication.server.ts` 的 `contentDigest(record)`；素材字节散列是另一层，不可混淆。不可自动把 draft 改成 approved。
5. 运行下列真实存在的命令。命令失败要解决或恢复合法空数据，不把 error 改为 empty 来绕过校验。详细错误输出只有路径、代码和记录ID，没有原始私密值。

```sh
node --import tsx scripts/validate-content.ts
node --import tsx --test tests/content.test.ts
npm run typecheck
npm test
npm run verify:asset
```

内容测试通过不等于批准或全站已部署。本批没有新增 npm content 脚本，不要调用不存在的命令。

## 查询接口

服务端/本地先调用 `readApprovedContent(projectRoot)`，将结果交给 `createContentRepository`。来源和批准检查失败时查询全部保持 error，不暴露部分有效数据。没有批准内容则合法 empty。详情不存在使用 not-found。正常更新只改 JSON 与公开素材，不改 RoomApp、相机、store、模型或四套 UI。

摘要只能通过 getScreenSummary 从当前记录派生；不要再维护第二份屏幕文字。摘要最多80码点，完整正文仍在 getProject。About 与 Education 可单独维护。

## 构建与浏览器

`npm run build` 是现存命令，但 Next 会重写 next-env.d.ts。**不要在用户原工作区直接构建**：新建隔离目录，复制当前 app/components/lib/types/content/public、所需测试/脚本、配置/依赖文件与本地依赖，保存输入 SHA256，再在副本执行 build/start。Next生成声明留在副本；严禁复制回原目录。复现本批的脚本和构建路径见 validation/v07a/20260919-145055-d84262/build-inputs.json 及 V07A_CONTENT_REPORT.md。

B 才可将批准投影接入页面。到那时在本地真实网页验证受影响列表/详情/图片错误/空状态/摘要，并回归共享退出、钢琴重开和其他原交互。另行保存新 run-id 下的证据；用户确认和技术结果分表。当前既有房间预览没有办法展示新 JSON，不能新建临时产品页代替 B。

## 删除与下架

先新建并验证完整快照。移除记录及全部引用，移除/隔离不用的公开衍生文件；校验器会拒绝 public/content 内未登记文件、悬空封面和过期 grant。保留私有原件与历史批准依据。详情被删后应 not-found，不能回退到另一条；检查新的生产产物和本地旧构建副本，不操作外网缓存/存储。

## 回退

本批回退组见 V07A_FILE_CHANGES.md。先保护后续工作，再解包本批开工快照到新的空目录并核验 manifest/SHA；按组移出本批新增内容模块/测试/文档，不覆盖已有用户文件。禁止 git reset/clean、用旧 HEAD 覆盖用户未提交修整，禁止删原模型/旧证据。提交、推送、部署和 B01 均需另行授权。
