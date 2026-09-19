# v0.7A 内容契约

结构版本 `1`，当前内容修订 `v07a-empty-r1`。数据位于 `content/room/`，六份 JSON 是唯一产品数据源；本批全部为合法空集合/可空区块，没有个人材料获批或录入。没有 UI、路由或屏幕运行时绑定。字段的精确 TypeScript 定义见 `lib/content/types.ts`，运行时约束见 `validate.ts`。

## 共同规则

- `site.json` 必需 `schemaVersion: 1`、稳定格式的 `contentRevision`；不等于软件版本。
- ID 格式为小写 ASCII 字母开头、字母数字和单个连字符分段。项目、教育、相册、图片、渠道、素材 ID **全局唯一**，修改标题或排序不改 ID。About 与 contact intro 使用固定批准键。
- `order` 是非负安全整数；默认按 order 升序，同序按 ASCII ID 升序。排序不依赖地区或随机数。
- 必需文本非空；正文只支持字符串/字符串段落或条目数组，不支持 HTML/MDX 执行。未来 UI 必须按普通文本渲染，不能用 innerHTML。
- `?` 表示可省略；可选字段出现时必须有效，不能随意填 `null`。只有 About、Contact intro 及文档宽高明确支持 null。空数组是合法空集合，非法结构绝不转成空状态。
- `PartialDate` 为 `{precision: year|month|day, value: YYYY|YYYY-MM|YYYY-MM-DD, estimated?: boolean}`；校验真实日历、闰年和精度。只有用户提供到日才填日。区间比较仅采用两端共同已知精度，不补造一月一日。
- 对外链接只支持 HTTPS；禁止凭据、自定义端口、IP 字面量、单标签/本地/保留/示例主机、脚本协议、路径占位 `#`。邮件为经确认的邮箱与完全匹配的 `mailto:value`，禁止附加邮件头。此校验不进行 DNS、链接探测或账号发现；有效性及公开范围仍须用户确认。允许的普通域名也不能免除人工确认。
- 素材通过 ID 引用；引用必须存在且用途一致。没有素材就省略引用，不生成假截图。未知字段被拒绝，防止误加入私人备注。

## 四个域

| 数据文件 / 设备 | 必需字段 | 可选字段及规则 |
| --- | --- | --- |
| projects.json / Monitor | 数组；每条 `id,title,order,summary,projectStatus,role,technologies,overview,contribution` | technologies 可为明确确认的空数组；overview/contribution 至少一段。状态仅 completed / in-progress / concept / paused。 |
| 项目详情扩展 | 同一记录，不另建详情副本 | `date:{start?,end?,ongoing?}`；未知日期省略 date，ongoing 仅用于 in-progress 且不同时有 end；`outcomes,coverMediaId,galleryMediaIds,links,limitations,nextSteps,tags,featured`。links 每项 kind(code/demo/article/website)、label、url 必需。成果不得臆造，数值出处留在批准登记。 |
| profile.json / MacBook | `{about:null或About,education:[]}` | 两区块独立查询和独立缺失，不互相阻塞。 |
| About | `displayName,headline,aboutParagraphs`（至少一段） | `portraitMediaId,interests,skills,resumeMediaId,resumeUrl`。名字和身份不可由账户推测；简历后补。 |
| Education | 每条 `id,institution,program,status,order` | status 为 studying/completed/paused/withdrawn；`start,end,description` 可省略。在读的 end 必须 estimated:true；completed 的 end 不得标预计；缺 end 不推导日期。 |
| memories.json / iPad | 相册 `id,title,order,images`；图片 `id,mediaId,order,alt` | 相册 description/dateLabel 可选；有图片必须有同相册 coverImageId，空相册必须有真实 description，不能假装加载。图片 caption/dateLabel/locationLabel 可选，不读取 EXIF 推测位置或故事。图片 ID 全局唯一，查单图仍需 albumId，禁止跨相册回退。 |
| contact.json / Phone | `{intro:null或文本,channels:[]}`；每渠道 `id,type,label,order,value,url` | type 为 email/github/linkedin/website/other；allowCopy/description/preferred 可选，至多一个 preferred；没有显式 true 不推定首选。GitHub/LinkedIn 类型校验对应主机。不产生发送邮件/留言后端。 |

## 公开素材

`media.json` 数组的每条必需：`id,path,kind,mimeType,width,height,bytes,sha256,purpose,alt`；可选 `thumbnailMediaId`。

- path 为 `/content/...` 下小写安全文件名，扩展 png/jpg/jpeg/webp/pdf，不允许 `..`、编码路径、反斜线、绝对私有路径或符号链接。
- 图片 kind=image，宽高为正整数，mimeType 为 image/png/jpeg/webp；purpose 为 project/portrait/memory。文档 kind=document、application/pdf、purpose=resume、宽高都为 null。
- bytes 与 SHA-256 对应实际公开衍生文件。校验磁盘文件存在、普通文件属性、实际字节数、散列、文件头/MIME 和图片尺寸。PNG/JPEG/WebP 读取头部尺寸，PDF 检查文件头；不是完整解码或元数据清理工具。图像可解码、EXIF/人物隐私、许可仍需素材交付时另验。
- 缩略图是同用途的另一张已登记图片，不能自引用、成环或继续引用缩略图。公开文件路径不能重复登记。`public/content/` 下未登记文件也会报错，避免下架后残留原件。
- 图片原件位置、作者/许可证明、隐私处理、批准原文不进产品数据；只在用户指定的本地私有位置保管，本批没有创建或扫描该位置。

## 批准与只读接口

`docs/content/approved-records.json` 只记录批准键、status=approved、revision、规范 JSON SHA-256、真实批准日期和 evidence ID，不含原文或原件路径。人工记录在 CONTENT_APPROVAL_REGISTER.md；两者不是自动授予许可的系统。

键为 projects/id、profile/about、education/id、memories/id、contact/intro、contact/id、media/id。相册批准散列覆盖其全部图片元数据；素材批准散列覆盖素材 SHA/用途。只有当前内容修订与整条公开记录散列都匹配才通过。未批准、已修改、重复或过期 grant 导致 error，**不返回任何数据**。移除的批准记录移到历史登记，不能残留活动 grant。没有真实记录时无需伪造批准。

调用顺序：`readApprovedContent(projectRoot)` → `createContentRepository(result)` → 查询。loader/publication 为 Node-only，读取指定六份 JSON 和本地批准登记，不提供 HTTP/debug endpoint；纯 validateContent 仅校验结构，不能作为发布批准。

| 接口 | 返回 |
| --- | --- |
| listProjects({tag?}) | 编辑顺序的轻量摘要；未知 tag 返回 empty，无全文搜索 |
| getProject(id) | 完整正文或 not-found，绝不回退到第一条 |
| getProfile / getAbout / listEducation | 整体或独立区块的 ready/empty |
| listAlbums / getAlbum(id) / getImage(albumId,imageId) | 相册摘要、已排序图片详情、严格所属相册内的图片 |
| getContact / listContacts / getMedia(id) | 联系区块/渠道/素材，只读 |
| getScreenSummary(projects/profile/memories/contact) | title、count、短文本来自同一公开源；最多80个 Unicode 码点，详情不截断 |

列表/区块结果为 `{status:ready|empty,data}`；详情为 ready 或 `{status:not-found,entity,id}`；错误为 `{status:error,issues:[{path,code,message,recordId?}]}`，错误不带原始输入。静态同步查询没有 loading。集合与记录拷贝并深冻结，调用者不能修改源数据。MacBook 数量为 About 区块+教育条目，Memories 数量为图片数；有空相册说明可 ready 而图片数为0，内容齐备仍需单独判断。摘要不携带长文、原图或批准信息。

## 发布边界

本批正式入口未 import 内容模块、测试夹具或本地批准登记；public 没有新文件。测试合成内容仅在 tests/content/fixtures。未来 B 只接收校验通过的投影，不能从客户端导入 Node-only 源或私人草稿。数据错误 fail closed，无部分泄漏；没有新增 API、CMS、数据库或四屏订阅。
