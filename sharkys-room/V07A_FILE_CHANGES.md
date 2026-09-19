# v0.7A 实际文件变更与回退

本批只新增文件。开工已有的3,553个文件SHA-256全部相同，4个用户未提交的修整/确认文件也保持原样；Git原有diff未覆盖、未提交、未推送。证据见本轮 protected-files.json；全清单在受限快照 manifest.json。

## 新增产品数据与接口（13个文件）

| 文件 | 内容 |
| --- | --- |
| content/room/site.json | schemaVersion、空内容修订 |
| content/room/projects.json | Projects空数组 |
| content/room/profile.json | About=null、Education空数组 |
| content/room/memories.json | Memories空数组 |
| content/room/contact.json | intro=null、渠道空数组 |
| content/room/media.json | 公开素材空登记 |
| lib/content/types.ts | 字段与结果状态契约 |
| lib/content/validate.ts | 结构、日期、链接、排序值和引用校验 |
| lib/content/publication.server.ts | 批准散列、文件/尺寸/路径、公开边界校验 |
| lib/content/source.server.ts | 指定项目六份JSON与批准登记的只读加载 |
| lib/content/selectors.ts | 稳定排序与四类短摘要派生 |
| lib/content/repository.ts | 不依赖3D的只读查询与错误/空/not-found |
| scripts/validate-content.ts | 无新依赖的内容检查入口 |

## 新增测试（3个文件）

- tests/content.test.ts：67项内容与隔离检查；通过原npm test自动发现。
- tests/content/fixtures/content.ts：明确TEST ONLY的合成夹具，真实文件测试仅在临时测试目录生成。
- tests/v07a-production-browser.mjs：本批生产房间回归、真实录屏、公开资源检查；没有新产品页面。其余原有测试文件未改。

## 新增登记与文档（9个文件）

- docs/content/approved-records.json：空的机器批准登记，不含私人原文。
- docs/content/CONTENT_SCHEMA.md
- docs/content/CONTENT_INVENTORY.md
- docs/content/CONTENT_GAPS.md
- docs/content/CONTENT_APPROVAL_REGISTER.md
- docs/content/CONTENT_UPDATE_GUIDE.md
- V07A_BASELINE.md
- V07A_FILE_CHANGES.md
- V07A_CONTENT_REPORT.md

共25个模块/数据/测试/文档文件，另有本轮 validation/v07a/20260919-145055-d84262/ 下新增日志、截图、录像、命令/输入哈希和验证索引；逐文件路径/大小/SHA见该目录 file-changes.json 与 EVIDENCE_INDEX.json。失败/被后续结果替代的日志原样保留。

## 严格保护

RoomApp、RoomCanvas、InteractionOverlay、共享store、相机/手势/输入、机构/返回时序、screenTextures、装配/manifest、40家族源/GLB/纹理、冻结FINAL、收藏/灯具登记、原测试、旧文档、package.json、package-lock.json、next-env.d.ts、next.config.ts、tsconfig.json均没有本批改动。没有新增依赖、版本标记调整、建模或资产生成。

生产构建与生成声明只在 /private/tmp 的独立副本内；该副本不是另建产品工程，不把副本生成文件复制回工作区。目录与170个构建输入见 build-inputs.json；input/隐私检查见 production-inputs-and-privacy.json。

## 回退分组

1. 先保存后续工作新的完整快照。查当前文件相对本批 file-changes.json 的SHA，有后续修改时保留，不能一键删除或覆盖。
2. 内容组：将上述13个新增内容/接口文件与 docs/content/approved-records.json 一起移到新的本地隔离目录，避免遗留不兼容入口；本批没有房间运行时引用需要拆除。
3. 测试/文档组：同时移出3个新增测试和本批文档；证据与本次快照独立保留，不能删除既有validation。未来B若依赖A，不可只回退A，需先梳理后续依赖。
4. 若任何旧文件需要恢复，只从 `../local-backups/v07a-start-20260919-145055-d84262/` 归档解包到新空目录，按manifest校验后选定恢复；完整方法见该目录RESTORE.md。不得用旧HEAD、reset/clean或覆盖式解压回退。

本批原文件零变化，正常回退只需隔离本批新增内容，不触碰用户已有成果。停止于A00–A06；后续唯一建议为B01：公共界面＋Monitor完整闭环，等待另行授权。
