# v0.6C 收藏格位表

更新：2026-09-18，C 交付整理。八件命名收藏及其余 C 装饰均已完成制作与网页接入，共 13 个 C 家族；本表保留逐件格位数据与分组证据。最终全局技术结果以 [C 交付报告](V06C_COLLECTION_DECOR_REPORT.md) 和 [本轮验证索引](validation/v06c/verification-summary.json) 为准。**全部用户视觉确认仍待完成。**

尺寸来自实际 FINAL、当前 A 柜板、各 C 导出及 `validation/v06c/planning/space-measurements.json`。坐标为 glTF Y-up 米；尺寸栏使用宽 Z × 深 X × 高 Y，局部向量另明确按 X / Y / Z。所有收藏原父级为 `DISPLAY_MODELS`，不移动柜体、隔板、Bounds、锚点或原 pivot。

## 八件命名收藏的格位与状态

| 收藏（均明确必做） | 原锚点 | 原名义宽×深×高 m | A 正式板材后的内部净宽×深×高 m | 当前格位身份 | 制作 / 网页 / 技术 / 用户视觉 |
| --- | --- | --- | --- | --- | --- |
| Eiffel Tower / 埃菲尔铁塔 | `DSP_EiffelTower_Bounds` | 0.7200 × 0.5000 × 1.6000 | 0.7975 × 0.5700 × 1.7900 | 沿原命名独立槽位 | 正式源与导出完成 / 已安装 / 分组通过；全局结论见总报告 / 待确认 |
| Hogwarts / 霍格沃茨 | `DSP_Castle_Bounds` | 1.3000 × 0.4900 × 0.9700 | 1.6600 × 0.5700 × 1.1400 | 沿原命名独立槽位 | 正式源与导出完成 / 已安装 / 分组通过；全局结论见总报告 / 待确认 |
| Minas Tirith / 白城 | `DSP_Architecture_Bounds` | 0.5000 × 0.4700 × 0.4500 | 0.5475 × 0.5700 × 0.5250 | Architecture 暂定安排，未获用户视觉批准 | 正式源与导出完成 / 已安装 / 分组通过；全局结论见总报告 / 待确认 |
| Millennium Falcon / 千年隼 | `DSP_Falcon_Bounds` | 1.2800 × 0.4800 × 0.4500 | 1.6600 × 0.5700 × 0.5800 | 沿原命名独立槽位 | 正式源与导出完成 / 已安装 / 分组通过；全局结论见总报告 / 待确认 |
| Tower Bridge / 塔桥 | `DSP_Bridge_Bounds` | 1.4000 × 0.4700 × 0.4800 | 1.8700 × 0.5700 × 0.5700 | 沿原命名独立槽位 | 正式源与导出完成 / 已安装 / 分组通过；全局结论见总报告 / 待确认 |
| SLS | `DSP_TallRocket_Bounds` | 0.2900 × 0.3200 × 1.4400 | 0.4350 × 0.5700 × 1.7900 | 沿原命名独立槽位 | 正式源与导出完成 / 已安装 / 分组通过；全局结论见总报告 / 待确认 |
| Ferrari F1 | `DSP_Vehicle_Bounds` | 0.7600 × 0.4200 × 0.2700 | 0.8100 × 0.5700 × 0.5700 | 沿原命名独立槽位 | 正式源与导出完成 / 已安装 / 分组通过；全局结论见总报告 / 待确认 |
| Mercedes-AMG F1 | `DSP_MercedesAMGF1_Bounds` | 0.7600 × 0.4200 × 0.2700 | 0.8100 × 0.5700 × 0.5700 | 沿原命名独立槽位 | 正式源与导出完成 / 已安装 / 分组通过；全局结论见总报告 / 待确认 |

制作采用规范化几何统一缩放；局部展示朝向 90° 绕 Y 轴烘焙到顶点。全部导出可视根与运行时根的局部 TRS 保持 identity，原锚点 TRS 不变；不把世界柜体外框当作格室净空。Tower Bridge 沿当前桥类既定意图，不以历史“伦敦塔”文字差异另换建筑。

## 实际导出、统一缩放与承托

以下含底座尺寸来自当前 C GLB 对应统计；数值与本次实际 GLB SHA 及 `02-geometry.json` 输入一致。间隙按当前 A 板材真实顶面/内侧面复核；X/Z 两侧取各轴较小值，顶部单独列出。

| 收藏 | 可视根 | 主体统一 scale | 含底座实际宽×深×高 m | 承托板 / world Y m | Plinth 向下补段 mm | 最低点到实板 mm | 上板净空 mm | X侧 / Z侧净空 mm |
| --- | --- | ---: | --- | --- | ---: | ---: | ---: | --- |
| Eiffel Tower / 埃菲尔铁塔 | `VIS_Eiffel` | 0.454205585 | 0.4920 × 0.4920 × 1.4539 | `VIS_CabinetPanel_04` / 0.735000 | 15.650 | 0.350 | 335.778 | 29.000 / 149.000 |
| Hogwarts / 霍格沃茨 | `VIS_Hogwarts` | 0.495833354 | 1.2357 × 0.4820 × 0.8191 | `VIS_CabinetPanel_06` / 1.385000 | 45.650 | 0.350 | 320.500 | 34.000 / 192.167 |
| Minas Tirith / 白城 | `VIS_MinasTirith` | 0.241799822 | 0.4920 × 0.2792 × 0.4277 | `VIS_CabinetPanel_04` / 0.735000 | 38.150 | 0.350 | 96.960 | 135.383 / 27.750 |
| Millennium Falcon / 千年隼 | `VIS_Falcon` | 0.286945804 | 0.5282 × 0.4720 × 0.2070 | `VIS_CabinetPanel_04` / 0.735000 | 55.650 | 0.350 | 372.636 | 39.000 / 545.879 |
| Tower Bridge / 塔桥 | `VIS_TowerBridge` | 0.375609778 | 1.2004 × 0.2389 × 0.5076 | `VIS_CabinetPanel_03` / 0.095000 | 45.650 | 0.350 | 62.000 | 155.561 / 319.780 |
| SLS | `VIS_SLS` | 0.253210994 | 0.2820 × 0.1427 × 1.1752 | `VIS_CabinetPanel_04` / 0.735000 | 25.650 | 0.350 | 614.422 | 203.633 / 36.500 |
| Ferrari F1 | `VIS_Ferrari` | 0.308042488 | 0.7422 × 0.4120 × 0.2543 | `VIS_CabinetPanel_03` / 0.095000 | 45.650 | 0.350 | 315.301 | 69.000 / 33.889 |
| Mercedes-AMG F1 | `VIS_Mercedes` | 0.308042488 | 0.7422 × 0.4120 × 0.2543 | `VIS_CabinetPanel_03` / 0.095000 | 45.650 | 0.350 | 315.301 | 69.000 / 33.889 |

原灰盒底面本来高于正式承托板 15–55 mm。主体留在原名义包络内；独立命名 Plinth 向下延伸到实板上方约 0.35 mm，完整填补承托关系。因此本表明确区分“主体名义包络”和“含底座导出包络”，不把底座补段静默算作原灰盒内部。没有削短塔尖、切翼、单轴压扁或修改 Bounds。CPU 验收使用真实导出三角面、板材与底部点/面采样，10 µm 为数值容差；支撑判定最多 1 mm，用于已登记亚毫米接触间隙，不能容许明显悬浮。

| 收藏 | 根的原锚点世界位置 X/Y/Z m | 含底座局部 min X/Y/Z m | 含底座局部 max X/Y/Z m |
| --- | --- | --- | --- |
| Eiffel Tower / 埃菲尔铁塔 | -3.225000 / 1.550000 / -0.995000 | -0.246000 / -0.814650 / -0.246000 | 0.246000 / 0.639222 / 0.246000 |
| Hogwarts / 霍格沃茨 | -3.225000 / 1.915000 / 0.310000 | -0.241000 / -0.529650 / -0.617833 | 0.241000 / 0.289500 / 0.617833 |
| Minas Tirith / 白城 | -3.225000 / 0.997500 / -2.196250 | -0.139617 / -0.262150 / -0.246000 | 0.139617 / 0.165540 / 0.246000 |
| Millennium Falcon / 千年隼 | -3.225000 / 1.015000 / 0.310000 | -0.236000 / -0.279650 / -0.264121 | 0.236000 / -0.072636 / 0.264121 |
| Tower Bridge / 塔桥 | -3.225000 / 0.380000 / -1.520000 | -0.119439 / -0.284650 / -0.600220 | 0.119439 / 0.223000 / 0.600220 |
| SLS | -3.225000 / 1.480000 / -1.700000 | -0.071367 / -0.744650 / -0.141000 | 0.071367 / 0.430578 / 0.141000 |
| Ferrari F1 | -3.225000 / 0.275000 / 0.715000 | -0.206000 / -0.179650 / -0.371111 | 0.206000 / 0.074699 / 0.371111 |
| Mercedes-AMG F1 | -3.225000 / 0.275000 / -0.135000 | -0.206000 / -0.179650 / -0.371111 | 0.206000 / 0.074699 / 0.371111 |

埃菲尔铁塔当前含底座高约 1.4539 m，顶部到真实上板净空约 335.78 mm；透空拱脚/桁架/平台和塔尖均保留，尺寸与穿板判断均以当前导出为据。更细的规范体原始包络、PBR 参数、UV、来源与装配回退见每家 `ASSET_SPEC.md` / `asset-statistics.json`。

## 白城的暂定安排与未分配格

先核对 Architecture 真实占用，再做低成本网页三层预览，然后制作独立七层正式模型。Architecture 实测净格 0.5475 × 0.5700 × 0.5250 m，白城含底座导出 0.4920 × 0.2792 × 0.4277 m；统一缩放系数约 0.241799822。当前安排可容纳完整轮廓、上下有明确净空与承托，未替换 Hogwarts 或其他命名收藏，未扩柜。它是本批提出的**暂定格位**，不是用户已确认的布局或审美。

低成本预检索引：`validation/v06c/planning/minastirith-preview/browser-r2/preflight.json`。预览只证明当时候选空间和展示可读性观察，不冒充正式模型或最终视觉批准。正式模型见下列登记。

| 原泛称槽位 | 原名义宽×深×高 m | 正式柜板后净宽×深×高 m | 当前处理与理由 |
| --- | --- | --- | --- |
| `DSP_MediumModel_Bounds` | 0.3600 × 0.3900 × 0.3800 | 0.5475 × 0.5700 × 0.5400 | 未发现已确认具体收藏，预留空置；只在白城家族成功安装时可逆抑制该灰盒 mesh，原冻结节点保留，白城失败/撤销恢复。 |
| `DSP_SmallModel_Bounds` | 0.2900 × 0.3400 × 0.3500 | 0.5475 × 0.5700 × 0.6050 | 未发现已确认具体收藏，预留空置；只在白城家族成功安装时可逆抑制该灰盒 mesh，原冻结节点保留，白城失败/撤销恢复。 |

这两格不是被取消的命名收藏，不用复制收藏或新增书堆来凑满。当前没有原书籍节点或已允许位置；不侵占白城候选格、电脑桌或茶几，故书籍保留条件项而不新增。

## 源、导出、网页证据与待决项

| 收藏 | 可编辑源 / 导出 | 规格 | 正常网页与故障恢复 | 近景登记 |
| --- | --- | --- | --- | --- |
| Eiffel Tower / 埃菲尔铁塔 | `blender-assets/eiffel_v06c.blend` / `public/models/production/eiffel_v06c.glb` | `assets-source/v06c/eiffel/ASSET_SPEC.md` | `validation/v06c/stage-architecture/collection-decor-browser.json` | `validation/v06c/inspection-architecture-r2/inspection-eiffel-VIS_Eiffel-front.png`：文件已落盘；本登记仅核对路径，未据此宣称看图批准 |
| Hogwarts / 霍格沃茨 | `blender-assets/hogwarts_v06c.blend` / `public/models/production/hogwarts_v06c.glb` | `assets-source/v06c/hogwarts/ASSET_SPEC.md` | `validation/v06c/stage-architecture/collection-decor-browser.json` | `validation/v06c/inspection-architecture-r2/inspection-hogwarts-VIS_Hogwarts-front.png`：文件已落盘；本登记仅核对路径，未据此宣称看图批准 |
| Minas Tirith / 白城 | `blender-assets/minastirith_v06c.blend` / `public/models/production/minastirith_v06c.glb` | `assets-source/v06c/minastirith/ASSET_SPEC.md` | `validation/v06c/stage-architecture/collection-decor-browser.json` | `validation/v06c/inspection-architecture-r2/inspection-minastirith-VIS_MinasTirith-front.png`：文件已落盘；本登记仅核对路径，未据此宣称看图批准 |
| Millennium Falcon / 千年隼 | `blender-assets/falcon_v06c.blend` / `public/models/production/falcon_v06c.glb` | `assets-source/v06c/falcon/ASSET_SPEC.md` | `validation/v06c/stage-collections/collection-decor-browser.json` | `validation/v06c/inspection-collections/inspection-falcon-VIS_Falcon-front.png`：文件已落盘；本登记仅核对路径，未据此宣称看图批准 |
| Tower Bridge / 塔桥 | `blender-assets/bridge_v06c.blend` / `public/models/production/bridge_v06c.glb` | `assets-source/v06c/bridge/ASSET_SPEC.md` | `validation/v06c/stage-collections/collection-decor-browser.json` | `validation/v06c/inspection-collections/inspection-bridge-VIS_TowerBridge-front.png`：文件已落盘；本登记仅核对路径，未据此宣称看图批准 |
| SLS | `blender-assets/sls_v06c.blend` / `public/models/production/sls_v06c.glb` | `assets-source/v06c/sls/ASSET_SPEC.md` | `validation/v06c/stage-collections/collection-decor-browser.json` | `validation/v06c/inspection-collections/inspection-sls-VIS_SLS-front.png`：文件已落盘；本登记仅核对路径，未据此宣称看图批准 |
| Ferrari F1 | `blender-assets/ferrari_v06c.blend` / `public/models/production/ferrari_v06c.glb` | `assets-source/v06c/ferrari/ASSET_SPEC.md` | `validation/v06c/stage-collections/collection-decor-browser.json` | `validation/v06c/inspection-collections/inspection-ferrari-VIS_Ferrari-front.png`：文件已落盘；本登记仅核对路径，未据此宣称看图批准 |
| Mercedes-AMG F1 | `blender-assets/mercedes_v06c.blend` / `public/models/production/mercedes_v06c.glb` | `assets-source/v06c/mercedes/ASSET_SPEC.md` | `validation/v06c/stage-collections/collection-decor-browser.json` | `validation/v06c/inspection-collections/inspection-mercedes-VIS_Mercedes-front.png`：文件已落盘；本登记仅核对路径，未据此宣称看图批准 |

同目录已保存浅侧面 `-shallow-side.png` 和格内顶部 `-top-in-slot.png`；近景使用隔离源码副本的临时测试镜头，不改变产品 Hero/focus/targets，不独自替代普通网页验收。展示柜整体：`validation/v06c/inspection-architecture-r2/inspection-cabinet-overall.png`；第二组近景索引已保存为 `validation/v06c/inspection-collections/collection-decor-inspection.json`。表中首轮近景作为阶段证据保留；Ferrari/Bridge 的最终无遮挡补拍与代理观察见 `validation/v06c/inspection-collections-r2/` 及其中的 `VISIBILITY_REVIEW.md`。代理可见性观察不等于用户视觉批准。

保留的首两组阶段技术证据（不是当前全屋总量）：

- `validation/v06c/stages/01-geometry.json`：首组三家 CPU 16/16；`validation/v06c/stage-architecture/collection-decor-browser.json`：首组网页 24/24。
- `validation/v06c/stages/02-geometry.json`：八件真实 GLB CPU 36/36；`validation/v06c/stage-collections/collection-decor-browser.json`：第二组网页 26/26，包括新五家逐家 404/恢复及已有路径局部回归。
- `validation/v06c/stages/02-budget.json`：八件 C 收藏共 1,591,256 B、28,728 triangles、31 mesh/primitives、31 材质、0 图片；第二组时全初始 GLB 6,253,812 B。文件字节不是网络传输量或帧时间。
- `validation/v06c/stages/02-protected-review.json`：188 项基线复核；181 个严格保护输入全部不变，7 个公共管线观察项中仅 manifest 与 assembly 发生已登记 C 增量；不声称这两个公共 Web 文件哈希未变。原 27 家与 FINAL GLB 哈希一致。

本表的分组计数和阶段截图继续保留；当前 13 个 C 家族的安装、全局九项交互、故障恢复、生产与同条件性能结果统一见 [C 交付报告](V06C_COLLECTION_DECOR_REPORT.md) 和 [本轮验证索引](validation/v06c/verification-summary.json)，不沿用早期阶段状态推断最终结论。用户对全部收藏造型、白城暂定格位和整体风格的视觉确认仍待完成；不自动进入 v0.7/v0.8 或部署。
