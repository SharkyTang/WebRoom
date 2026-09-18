# v0.6C 制作与验收计划（2026-09-18）

本批仅收藏/装饰。基线 HEAD c83ec37fa37911ab7aa09b7694fce0b6b42f9e5f，main，开工工作区干净；完整1510文件快照见 validation/v06c/snapshot.json。旧三件+A16+B8共27家族，初始GLB 4,662,556 B。B已有实现不重做。

当前外观为暂定风格基线，用户视觉仍待确认。参考既有 room_master_reference.jpeg 的暖色收藏/绿植/金棕睡狗意图与本批明确清单；使用原创程序化近似，不复制参考像素、官方模型、品牌标识或假文字。没有精确套装/犬种制造规格的主张。

## 顺序与工作预算

1. 真实A/B快照、当前回归和独占性能基线。
2. 实测格位/板材/承托，白城低成本三层预览；灯壳映射核对。
3. 高风险 eiffel / hogwarts / minastirith：每组立即接入、浏览器局部验证。
4. 其余 falcon / bridge / sls / ferrari / mercedes，随后局部验收。
5. plants（原五盆）/ cola（茶几新增非交互子节点）/ dog，随后局部验收。
6. fixtures（床头/休闲外壳+既有结构上的Desk/Cabinet条形外壳）/ wallart，随后局部验收。
7. 全量CPU、旧A/B套件、C逐家故障/恢复、独立新生产构建、实际网页证据和同条件性能。

沿用旧ASSET_BUDGETS的C暂定审查线150k triangles/3 MB库增量/+60 calls；这不是用户批准的硬上限。本批工作目标尽量≤65k triangles/≤2 MB/C最多约55 primitives；按材质合并重复栏杆、窗、砖和叶片，不建不可见积木内部。默认无外来贴图/无高分辨率图片/无持续动画。超出或明显帧成本增长先查本批无必要细节。

## 空间与装配

每收藏主体统一缩放并在GLB局部顶点烘焙90度展示朝向；根保持identity。旧Bounds/柜板不改。原proxy底比实板悬高15–45mm的项，用独立命名Plinth承托填空隙；表中分别记录主体名义包络和底座向下延伸，不谎称整体仍在灰盒内。

白城只暂定空闲Architecture格，与Hogwarts独立；须浏览器预览看清层叠轮廓后再完成正式细节。Medium/Small无明确物件用途，保持预留，原节点保留；仅可逆抑制未分配灰盒，不擅加收藏。

杯子失败：现有family fallback状态+页脚提示/刷新；杯子暂时缺席而A茶几/B iPad继续可用，不把缺件记为installed。狗仅抑制DEC_DogBedProxy_Mesh_1，A狗窝不动。灯面独立静态材质emissive=0，不挂Marshall状态绑定、不新增light或状态。

## 证据口径

正常开发/新生产网页承担加载和九项交互验收。收藏多角度近景使用隔离源码副本中的测试镜头（helper tests/helpers/collectionInspection.mjs）；仅副本暴露相机检查API，产品DebugBridge/focus/targets不改。截图明确标记临时检查镜头，不将其冒充默认Hero。

最后技术与视觉分别登记，C交付停止；不自动实施v0.7/v0.8或部署。
