# v0.6C 证据导航

本目录记录 2026-09-18 本次 C 实施。起点为 A/B 已完成的 `c83ec37fa37911ab7aa09b7694fce0b6b42f9e5f`。历史、分组、最终结果分别保留，早期失败和补拍不删除，也不作为最终通过依据。用户视觉确认仍待完成。

## 最终结果与资源

- [交付报告](../../V06C_COLLECTION_DECOR_REPORT.md)、[收藏格位表](../../V06C_COLLECTION_SLOT_MAP.md)、[灯具对应表](../../V06C_LIGHT_FIXTURE_MAPPING.md)。
- [机器可读最终索引](verification-summary.json)：完成状态、独立套件、修复记录及限制。
- [冻结契约/单测/类型/构建](final/quality-optimized.json)：361 项契约、283 单测、类型检查及新生产构建。
- [C 正常开发网页 56/56](all-optimized/collection-decor-browser.json)、[未经 inspection 注入的生产网页 51/51](production-optimized/collection-decor-production.json)。
- [旧行为回归 154/154](final/legacy-regression-summary.json)：钢琴 10、通用交互 37、A 家具 50、B 资产 57；其中钢琴记录 20 次循环；此四套在零面清理前完成，清理后旧27家/产品交互代码不变，C 全套再次覆盖原九入口。
- [同条件 C 前基线](baseline/performance.json)、[C 后性能](performance-optimized/performance.json)、[性能对照说明](final/PERFORMANCE_COMPARISON.md)。软件 WebGL 数据不能视为硬件 GPU 或真机验收；清理前 C 性能仍保留在 `performance/performance.json`，最新为 `performance-optimized/`。
- [实际 GLB 资源账本](final/asset-budget-ledger-optimized.json)、[181 项严格保护输入](final/protected-review.json)、[13 家族规格/统计/源一致性](final/spec-source-review-optimized.json)、[生产构建输入一致性](final/production-build-verification-optimized.json)。
- [导出清理边界/幂等实测](optimization/helper-export-cleanup-validation.json)、[可复验脚本](optimization/verify-export-cleanup.py)、[录屏实际时长与格式](final/delivery-media-optimized.json)。
- [完整非覆盖回退快照登记](snapshot.json)、[本轮实际变更清单](final/changed-files.json)。

## 优先查看的真实网页证据

- [生产整屋桌面](production-optimized/production-hero-1440.png)、[平板](production-optimized/production-hero-768.png)、[手机触屏仿真](production-optimized/production-hero-390.png)。
- [生产网页交互录屏](production-optimized/v06c-all-interaction.mp4)：九入口/返回及钢琴路径，约 45 秒。
- [生产钢琴收回—桌下直接重开短片](piano-short-optimized/v06c-piano-underdesk-reopen.mp4)：14.68 秒，原生鼠标操作，未设置产品状态或镜头。
- [短片事件记录](piano-short-optimized/recording.json)、[短片桌下悬停图](piano-short-optimized/02-underdesk-hover.png)。
- [八件收藏近景索引](../../V06C_COLLECTION_SLOT_MAP.md)：建筑组在 `inspection-architecture-r2/`；Falcon/SLS/Mercedes 在 `inspection-collections/`；Ferrari/Bridge 补拍在 `inspection-collections-r2/`。
- [茶几三件物](inspection-final-details/inspection-coffee-context.png)、[冰杯/液体/冰](inspection-living-r2/inspection-cola-VIS_Cola-hero-side.png)、[原电脑桌](inspection-final-details/inspection-desk-context-final.png)、[睡狗与 A 狗窝](inspection-final-details/inspection-dog-and-A-bed.png)。
- [最终窗边整株](inspection-final-details-r2/inspection-plants-window-final-whole.png)、[窗帘净空与其余四盆保持证明](final/window-plant-clearance-comparison.json)、[最终地板承托](final/floor-support-evidence-optimized.json)。
- 灯壳/独立表面/墙画：`inspection-fixtures/` 与 `inspection-final-details/`；[最终逐图可见性记录](inspection-final-details/VISIBILITY_REVIEW.md)。

近景摄于零面清理前，其有效表面与最终版本精确一致；最终常规/生产整屋图另行重拍。近景通过临时验证副本镜头取得，保留所有原模型且不改主产品相机。它们辅助检查轮廓、材质和穿插；正常会话与生产网页证据独立保存。代理可见性检查不能代替用户视觉批准。

## 分组与修复记录

1. 白城先在 `planning/minastirith-preview/` 做低成本格位预览；首轮层间承托问题修复后以 `browser-r2/` 复核，再制作正式模型。预览不计入正式资产完成。
2. `stage-architecture/`、`stage-collections/`、`stage-living-r2/`、`stage-fixtures/` 分别为当组立即接入网页的结果；这些数字不相加当作独立最终覆盖。
3. 原 `inspection-living/` 杯子被后到达的 A 茶几误抑制，即使安装数量检查通过也不算可见性通过。公共装配已排除正式子资产；`inspection-living-r2/`、最终开发/生产检查及 49 项到达/卸载排列证明修复。
4. 初稿杯液与实际杯内壁的微小越界、狗尾与 A 软边相交均已修复，最终实际导出几何检验通过。早期几何失败日志仅作为过程记录。
5. 窗盆初稿与窗帘相交；只收紧窗盆/叶作者几何，其他四盆不变。最终使用 `inspection-final-details-r2/` 整株图及最终 clearance/support 证据，早期图不冒充最终模型。
6. 早期 Ferrari/Bridge 近景受原沙发/桌遮挡或镜头裁切，正式补拍在 `inspection-collections-r2/`。早期窗盆细节图未覆盖全部叶尖，整株补拍在 `inspection-final-details-r2/`。
7. 性能增长后另做严格退化面回收（1,366面，最终节省31,896 B；有效表面二进制精确不变）：原 C 文件在 `optimization/pre-cleanup/` 非覆盖保存；`final/pre-cleanup-visible-geometry.json` 与清理后精确属性比较独立保存。`.blend` 保留可编辑原始拓扑，生成器在导出步骤去除严格零面积索引/未引用顶点；规格区分源与导出三角面数。不得把未做的遮挡面候选写成已安全优化。
8. 首次 `piano-short/` 录制脚本对页脚文本使用不适用的 exact locator 而失败；只修测试定位，最新交付以 `piano-short-optimized/recording.json` 和对应约 15 秒 MP4 为准。

## 可复验命令

在应用目录使用现有依赖。证据输出须指定新的目录，避免覆盖本轮记录；主开发服务器默认为 `http://127.0.0.1:3000`。

```sh
npm run verify:asset
npm test
npm run typecheck -- --incremental false
npm run build
ROOM_REQUIRE_ALL_C=1 node scripts/assets/inspect-decor-budgets.mjs
ROOM_C_STAGE=all ROOM_TEST_OUTPUT=/private/tmp/v06c-new-browser node tests/collection-decor-browser.mjs
ROOM_TEST_OUTPUT=/private/tmp/v06c-new-performance ROOM_C_PERFORMANCE_BASELINE_FILE=validation/v06c/baseline/performance.json node tests/collection-decor-performance.mjs
```

性能脚本要求独占浏览器/渲染任务，并验证原 27 家族与冻结 FINAL 文件及环境、镜头、映射一致。新基线应在保留原输入的独立副本建立，不覆盖本轮基线。不以重复运行后的环境变化差异推导本轮结果。

本轮仅 C；未部署、未进入 v0.7/v0.8。其余平台和真实用户视觉反馈是明确未完成项，不隐含为技术通过。
