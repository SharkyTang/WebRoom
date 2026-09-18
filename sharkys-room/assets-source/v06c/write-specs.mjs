/** Regenerate only explicitly selected C ASSET_SPEC.md documents from current exports. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { tsImport } from 'tsx/esm/api';

const directory = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(directory, '../..');
const args = process.argv.slice(2), update = args.includes('--update');
const selected = args.filter(value => value !== '--update');
const descriptions = {
  eiffel: ['Eiffel Tower / 埃菲尔铁塔', '收分四塔腿、透空拱形支撑、交叉桁架、分层平台、栏杆与完整塔尖；不是实心尖柱。'],
  hogwarts: ['Hogwarts / 霍格沃茨', '不同高度的厅堂、坡屋顶、圆塔与尖顶，沿独立基础平台组成城堡轮廓；保留独立收藏身份。'],
  minastirith: ['Minas Tirith / 米那提斯白城', '七层弧形城墙和平台、城垛、逐层房屋、中央岩脊、上层核心和白塔；完整山城轮廓与霍格沃茨分开。'],
  falcon: ['Millennium Falcon / 千年隼', '圆盘主体、前端分叉、偏置驾驶舱与上下层结构；主体比例统一缩放。'],
  bridge: ['Tower Bridge / 塔桥', '双塔、桥面与连接结构；沿当前桥类槽位意图制作，不新增另一座建筑身份。'],
  sls: ['SLS / 太空发射系统', '核心箭体、侧部助推结构、顶部与底座的分段轮廓。'],
  ferrari: ['Ferrari F1 / 法拉利 F1', '开轮车身、驾驶舱、前后翼及红色配色，独立于 Mercedes 收藏。'],
  mercedes: ['Mercedes-AMG F1', '开轮车身、驾驶舱、前后翼及银灰/青绿配色，独立于 Ferrari 收藏。'],
  plants: ['Plants / 原五处植物', '花盆、盆口/土面、茎叶层次；保持原植物锚点和设备入口。'],
  cola: ['Iced cola / 冰杯可乐', '杯口、杯壁、杯底、可乐液面与杯内冰块；茶几上单个杯子，无托盘或流体动画。'],
  dog: ['Sleeping dog / 静态睡姿狗', '原狗位置上的静态睡姿犬，保留 A 狗窝；无毛发系统、动画或新入口。'],
  fixtures: ['Light fixtures / 灯具外壳', '有依据的外壳和独立命名的预留表面；当前不发光，静态登记，不增加真实灯光系统。'],
  wallart: ['Wall art / 墙画', '原墙画位置中的边框与原创简洁装饰图案；无私人照片或虚构个人信息。'],
};
if (!selected.length || selected.some(family => !Object.hasOwn(descriptions, family))) throw new Error(`Usage: node assets-source/v06c/write-specs.mjs [--update] ${Object.keys(descriptions).join('|')} ...`);
const { assetManifest } = await tsImport('../../lib/room/assets/assetManifest.ts', import.meta.url);
const { fixtureRegistry, cabinetFixtureSegments } = await tsImport('../../lib/room/assets/fixtureRegistry.ts', import.meta.url);
const space = JSON.parse(await fs.readFile(path.join(project, 'validation/v06c/planning/space-measurements.json'), 'utf8'));
const hash = value => createHash('sha256').update(value).digest('hex');
const n = (value, digits = 6) => Number(value.toFixed(digits));
const vector = values => values.map(value => n(value)).join(' / ');
const size = box => box.max.map((value, index) => value - box.min[index]);
const comma = value => value.toLocaleString('en-US');
function parseGlb(bytes) {
  if (bytes.toString('ascii', 0, 4) !== 'glTF' || bytes.readUInt32LE(8) !== bytes.length) throw new Error('Invalid GLB');
  return JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'));
}
for (const family of selected) {
  const specPath = path.join(directory, family, 'ASSET_SPEC.md');
  const statistics = JSON.parse(await fs.readFile(path.join(directory, family, 'asset-statistics.json'), 'utf8'));
  const definition = assetManifest[family];
  if (!definition) throw new Error(`Not registered: ${family}`);
  const glbFile = `public${definition.url}`, blendFile = `blender-assets/${family}_v06c.blend`;
  const bytes = await fs.readFile(path.join(project, glbFile)), blendBytes = await fs.readFile(path.join(project, blendFile));
  if (hash(bytes) !== statistics.glbSHA256 || bytes.length !== statistics.glbBytes) throw new Error(`GLB/statistics mismatch: ${family}; regenerate statistics first`);
  const gltf = parseGlb(bytes);
  const placement = statistics.placement ?? {};
  const slot = space.cabinet.slots.find(value => value.family === family);
  const roots = Object.entries(statistics.roots);
  const materials = (gltf.materials ?? []).map(material => `| \`${material.name}\` | ${vector(material.pbrMetallicRoughness?.baseColorFactor ?? [1, 1, 1, 1])} | ${n(material.pbrMetallicRoughness?.metallicFactor ?? 1)} | ${n(material.pbrMetallicRoughness?.roughnessFactor ?? 1)} | ${material.alphaMode ?? 'OPAQUE'} |`).join('\n');
  let geometry = '';
  if (slot && placement.uniformScale) {
    const [rootName, root] = roots[0], local = root.localBoxYUp;
    const world = { min: local.min.map((value, index) => value + slot.worldAnchor[index]), max: local.max.map((value, index) => value + slot.worldAnchor[index]) };
    const canonicalSize = size(placement.canonicalBox);
    const bodySize = [canonicalSize[2], canonicalSize[1], canonicalSize[0]].map(value => value * placement.uniformScale);
    const gaps = { left: world.min[0] - slot.actualSlotWorld.min[0], right: slot.actualSlotWorld.max[0] - world.max[0], top: slot.actualSlotWorld.max[1] - world.max[1], zMin: world.min[2] - slot.actualSlotWorld.min[2], zMax: slot.actualSlotWorld.max[2] - world.max[2], support: world.min[1] - slot.support.worldY };
    geometry = `## 格位、规范化与承托\n\n所有尺寸为 glTF Y-up 米，向量顺序为 X / Y / Z。原锚点 \`${placement.originalAnchor}\`、父级 \`${placement.originalParent}\`、Bounds 和 A 柜板保持。根 \`${rootName}\` 的平移/旋转为零、scale=1；统一缩放与 ${placement.bakedRotationYDegrees}° Y 轴展示朝向烘焙在局部顶点中，不对根或单轴做拉伸。\n\n| 项目 | 实际数据 |\n| --- | --- |\n| 原锚点世界位置 | ${vector(slot.worldAnchor)} m |\n| 原名义占位尺寸 | ${vector(slot.originalProxyWorld.size)} m |\n| A 正式板材后实测内部净尺寸 | ${vector(slot.actualSlotWorld.size)} m |\n| 制作规范体包络 min → max | ${vector(placement.canonicalBox.min)} → ${vector(placement.canonicalBox.max)} m |\n| 主体统一缩放系数 | ${placement.uniformScale} |\n| 缩放后主体尺寸（不含承托补段） | ${vector(bodySize)} m |\n| 含底座实际导出局部 min → max | ${vector(local.min)} → ${vector(local.max)} m |\n| 含底座实际导出尺寸 | ${vector(size(local))} m |\n| 承托面 | \`${slot.support.mesh}\`，world Y=${n(slot.support.worldY)} m |\n| 主体底 local Y / 底座底 local Y | ${n(placement.bodyLocalBottom)} / ${n(placement.supportLocalBottom)} m |\n| 底座向下承托补段 | ${n(placement.supportExtensionM * 1000, 3)} mm |\n| 实际最低点到承托面 | ${n(gaps.support * 1000, 3)} mm |\n| 实际顶部到上板净空 | ${n(gaps.top * 1000, 3)} mm |\n| X两侧 / Z两侧最小包络净空 | ${n(Math.min(gaps.left, gaps.right) * 1000, 3)} / ${n(Math.min(gaps.zMin, gaps.zMax) * 1000, 3)} mm |\n\n主体留在原名义包络；原 proxy 底高于正式柜板，因此独立命名的 Plinth 只向下补足承托，不声称含底座整体仍在旧灰盒内部。设计接触偏移为 0.35 mm；不移动格板来消除悬空。表中间隙是导出包络与当前实测柜板坐标的复核，薄杆/突出几何与承托三角面仍由 \`tests/collection-decor-geometry.test.ts\` 检查。\n\n${family === 'minastirith' ? '白城为本批提出的 Architecture 格临时安排：开工实测记录未发现该泛称格已有已确认收藏，低成本三层预览已在网页核对后再制作本正式七层版本。此安排未获得用户视觉批准；不替换 Hogwarts、不扩柜、不改隔板。预览证据：`validation/v06c/planning/minastirith-preview/browser-r2/preflight.json`，该预览不是正式模型交付。' : '收藏身份沿任务书明确要求与原独立槽位，不借本批调整已确认收藏或柜体。'}\n\n`;
  } else {
    geometry = `## 根与装配坐标\n\n采用原锚点局部 glTF Y-up 米。各导出根保持 identity；不修改冻结锚点的父子关系、平移、旋转或缩放。具体包络/承托记录见 \`asset-statistics.json\` 的 roots/placement 及 \`validation/v06c/planning/space-measurements.json\`。\n\n${roots.map(([name, root]) => `- \`${name}\` → \`${root.anchor}\`；local min=${vector(root.localBoxYUp.min)}，max=${vector(root.localBoxYUp.max)} m。`).join('\n')}\n\n`;
  }
  const parts = definition.parts.map(part => `- \`${part.root}\` → 原 \`${part.anchor}\`；proxy=${part.proxyMeshNames ? JSON.stringify(part.proxyMeshNames) : '该原锚点中实际 mesh（不隐藏整个父组）'}。`).join('\n');
  const retired = definition.retiredPlaceholderMeshes?.length ? `\n本家族还可逆抑制已登记、未分配的泛称占位 \`${definition.retiredPlaceholderMeshes.join('`、`')}\`。原节点身份保留；此家族失败或撤销后恢复这些灰盒，不能据此宣称它们曾是已完成收藏。\n` : '';
  const text = `# ${descriptions[family][0]} / v0.6C\n\n模型制作：实际可编辑源与 GLB 已生成。网页登记：当前 manifest 已登记。技术验收：导出往返数据与实际几何结果分别记录，不把文件生成等同全量浏览器验收。用户视觉确认：**待确认**。\n\n## 造型与来源\n\n${descriptions[family][1]}\n\n原创程序化几何，由 \`scripts/assets/build_collection_decor.py\` 制作；沿当前房间参考的暖色、风格化收藏方向与本批明确清单。没有下载外部模型、贴图或品牌图案；不复制参考像素、不添加假文字。未有精确套装/制造规格的资料，属于风格化近似，不声称官方套装复刻或官方授权。\n\n${geometry}## 材质、UV 与资源\n\n使用标准 PBR、独立家族材质和导出法线；${statistics.uvMeshes}/${statistics.meshCount} 个 mesh 带 UV。重复构件只在同一根/材质下合并，独立承托节点保留；不跨 A/B 资产、屏幕或灯组表面合批。\n\n| 材质 | Base color RGBA（线性值） | Metallic | Roughness | Alpha |\n| --- | --- | --- | --- | --- |\n${materials}\n\n- 实际 GLB：**${comma(bytes.length)} B**；可编辑 .blend：**${comma(blendBytes.length)} B**。\n- ${comma(statistics.triangles)} 三角面、${statistics.meshCount} 网格、${statistics.gltfPrimitives} primitives、${statistics.materialCount} 材质、${statistics.textureCount} 嵌入图片。primitives 不等于实际渲染 draw calls。\n- 本家族无相机、灯光源或动画；无外部纹理/缓冲 URI。GLB 文件字节不等于 HTTP 传输量、显存或帧时间。\n- GLB SHA-256：\`${hash(bytes)}\`。\n- 实际字节/图片重复成本复核：\`node scripts/assets/inspect-decor-budgets.mjs\`；逐组账本留在 \`validation/v06c/stages/\`，不覆盖历史记录。\n\n## 原锚点装配与完整回退\n\n${parts}\n\n通过整家族验证后再把正式可视根挂到原锚点、抑制对应 proxy 的材质与 raycast；保留原节点可寻址及九项交互身份。本家族为静态非交互资产，\`stateSurface=${definition.stateSurface}\`、\`surfaceRole=${definition.surfaceRole}\`，不占设备屏幕状态绑定。加载或验证失败记为 fallback，保留原 proxy；成功安装后的撤销恢复原 mesh 材质/raycast/抑制标记并只释放本家族资源。取消、重试、卸载/重挂载与故障恢复由本轮专项/全局验收分别证明。\n${retired}\n## 文件、重现与验收索引\n\n- 源：\`${blendFile}\`；导出：\`${glbFile}\`。\n- 生成记录：本目录 \`asset-statistics.json\`；包含实际导出 SHA、根 identity、包络和逐项往返检查。\n- 重新生成本家族：\`node scripts/assets/build-collection-decor.mjs ${family}\`。该命令会重新写本家族 C 源、GLB 与统计，执行前按任务要求保留快照；无需安装依赖。\n- 更新本规格：\`node assets-source/v06c/write-specs.mjs --update ${family}\`。仅从当前已导出并登记的对应 C 家族读取，拒绝 GLB/统计 SHA 不一致。\n- CPU 几何/装配：\`node --import tsx --test tests/collection-decor-geometry.test.ts\`；全 C 齐备时加 \`ROOM_REQUIRE_ALL_C=1\`。\n${['eiffel', 'hogwarts', 'minastirith'].includes(family) ? '- 已记录的首组 CPU 证据：`validation/v06c/stages/01-geometry.json`（首组三家 16 项通过；属于当时快照，后续变更以新证据为准）。' : '- 逐组 CPU/浏览器证据按对应资产批次在 `validation/v06c/stages/` 记录；本规格不把其他组的结果冒充本家族结果。'}\n- 网页安装、故障恢复、生产构建、截图/录屏与用户视觉状态须查最终 \`V06C_COLLECTION_DECOR_REPORT.md\`；本规格不提前宣称全部 C 或视觉已通过。\n`;
  const livingDetails = {
    plants: '## 原五盆与真实承托\n\n保留 Cabinet、CoffeeTable、Desk、Sofa、Window 五处原位。仅用闭合宽叶与 PBR，不用 alpha 叶片叠层或风动。Cabinet 的盆底按真实柜顶下移，local Y≈-0.014649866 m；其他四盆接触偏移0.35 mm。\n\n仅地面两盆按 A 真实拼缝核对：OakPlanks 顶 Y=0，JointSubstrate 顶 Y≈-0.0025 m。窗盆525个底面样点中523点直接接触木板，另2点命中既有缝底，间隙2.85 mm=2.5 mm真实缝深+0.35 mm接触偏移；沙发盆521/521点直接接触。均匀底面网格、四象限非共线接触、至少80%直接承托及不穿板同时检查，其他承托容差未放宽。详见 `validation/v06c/stages/floor-support-evidence-r2.json`。',
    cola: '## 杯内空间与无旧 proxy 降级\n\n杯底中心为茶几原局部 (-0.245, 0.4805, -0.015) m；外径约0.08 m、高0.145 m，杯底到桌面约0.5 mm。保留杯口、内外杯壁、实体杯底、液面和三块冰，仅用薄壁 alpha 混合，不启用 transmission、折射或流体系统。\n\nCPU 检验从实际 Glass 内向三角面提取剖面：局部Y约0.490500/0.619500/0.625500 m，内半径约0.028/0.036/0.0365 m。液体与冰全部导出顶点满足内腔高度、插值内径及实际多边形杯壁距离。初版液面穿壁约0.1124 mm，现液体顶半径0.034 m；10 µm数值容差未放宽。冰与液体的正常漂浮重叠允许。\n\n没有旧杯子 proxy，`proxyMeshNames=[]`；不抑制茶几、iPad或其他已安装VIS。失败时杯子缺席、家族状态为fallback，由既有页脚提示及刷新重试；**缺杯子是明确降级，不是installed成功**。重试完整安装后才登记成功，撤销只释放杯子并保留A茶几和B iPad。',
    dog: `## 静态姿势与 A 狗窝隔离\n\n沿已有参考制作近似金棕睡姿犬，不宣称用户真实宠物或精确犬种；身体、头、垂耳、前后爪、尾和闭眼均为静态几何，无骨骼、毛发、呼吸、声音或新入口。\n\n最终 C 几何统一比例${placement.poseUniformScale}、基准Y=${placement.poseScaleOriginY} m烘焙：X/Z同比缩放，Y=origin+(Y-origin)×scale。根保持identity，原狗锚点不动。真实导出顶点与A围沿的碰撞及内垫接触通过本轮CPU检查。仅抑制 \`DEC_DogBedProxy_Mesh_1\`；保留父组 \`DEC_DogBedProxy\` 和 A 的 \`VIS_DogBed\`、\`VIS_DogBedInsetPad\`、\`VIS_DogBedSoftSurround\`。`,
  };
  if (family === 'plants') {
    livingDetails.plants = livingDetails.plants.replace('窗盆525个底面样点', '窗盆收窄前的历史验证：525个底面样点');
    livingDetails.plants += '\n\n最终窗盆为原锚点内独立重新塑形，作者尺寸 rx=0.22、rz=0.115、盆半径0.1035 m、盆高为允许总高×0.23；未对冻结锚点或 A 窗帘/床/桌缩放、移动。新实际世界包络 X/Y/Z 为0.310628/1.229792/0.209070 m；盆体/土茎/叶片距真实窗帘最前 Z 面分别约10.465/23.920/33.535 mm，均超过1 mm。其他四盆的局部 position/normal/UV/index 缓冲与材质语义签名完全一致。见 `validation/v06c/final/window-plant-clearance-comparison.json`。\n\n最终窗盆和沙发盆各521/521个底面样点均直接落在木板上，接触偏移仍0.35 mm；最终证据为 `validation/v06c/final/floor-support-evidence.json`。旧2.85 mm跨缝记录保留为此前测试规则修正的依据，不能冒充最终窗盆当前样点。';
  }
  let finalText = text.replace('重复构件只在同一根/材质下合并，独立承托节点保留；', '重复构件只在同一根/材质下合并，收藏的独立承托节点保留；');
  if (livingDetails[family]) finalText = finalText.replace('## 材质、UV 与资源', `${livingDetails[family]}\n\n本组CPU证据：\`validation/v06c/stages/03-geometry-final.json\`，当时11家C共49/49通过；网页及后续变更以对应新证据为准。\n\n## 材质、UV 与资源`);
  if (family === 'cola') finalText = finalText.replace('加载或验证失败记为 fallback，保留原 proxy；成功安装后的撤销恢复原 mesh 材质/raycast/抑制标记并只释放本家族资源。', '加载或验证失败明确记录缺杯子的 fallback，保留原茶几及 iPad；撤销只移除并释放杯子，不把已有家具或 VIS 当成 proxy。');
  if (family === 'fixtures' || family === 'wallart') {
    finalText = finalText.replace('由 `scripts/assets/build_collection_decor.py` 制作', '造型由 `scripts/assets/v06c_fixture_geometry.py` 的对应 builder 制作，由 `scripts/assets/build_collection_decor.py` 安装 builder 并统一导出');
  }
  if (family === 'fixtures') {
    for (const entry of fixtureRegistry) {
      const material = gltf.materials?.find(item => item.name === entry.surfaceMaterial);
      if (placement.surfaces?.[entry.surface] !== entry.surfaceMaterial || !material) throw new Error(`Missing actual fixture surface material: ${entry.surface}`);
      if ((material.emissiveFactor ?? [0, 0, 0]).some(value => value !== 0)) throw new Error(`C fixture must remain nonemissive: ${entry.surface}`);
    }
    const surfaces = fixtureRegistry.map(entry => `| \`${entry.surface}\` | \`${entry.surfaceMaterial}\` | ${entry.futureGroup ?? '未分配'} | ${entry.mappingStatus} |`).join('\n');
    const fixtureDetails = `## 四个独立表面与静态对应\n\n床头与休闲灯均有加重底座、灯杆、灯座、三根罩支撑、薄壁空心灯罩与金属包边；不是把实心圆锥当灯罩。桌下 U 形条壳固定在原桌后沿下方；柜顶下条壳分四段，避开原隔板。以下名称同时来自实际 GLB 材质、导出统计和 \`lib/room/assets/fixtureRegistry.ts\`，四个表面使用四份不同材质，不共用可变表面材质。\n\n| 独立可寻址表面 | 实际 GLB 材质 | 后续候选组 | 当前登记状态 |\n| --- | --- | --- | --- |\n${surfaces}\n\n所有表面当前 emissive RGB=0；Blender emission strength=0，\`stateSurface=null\`、\`surfaceRole=none\`、\`runtimeBinding=null\`。本批未创建光源、可控照明状态、表面状态 binder、配光或与总开关的新联动。四个独立表面不等于四组可控灯：床头与原 Bed 点灯有空间对应，Desk/Cabinet 仅作候选对应；Lounge 无原专属光源、归属待定，不能冒充 Desk 或第四组。原三盏光源与总开关语义保持。\n\n柜条四段局部 Z 区间（m）：${cabinetFixtureSegments.map(segment => `${segment.compartment} [${segment.localZ.join(', ')}]`).join('；')}。四段同属一个 Cabinet surface/材质，未跨隔板连成实体，也未与其他三表面合批。桌条上表面与 A 桌板下表面约0.5 mm接触偏移；灯条与真实 A 柜板、八件收藏及 B 钢琴机构范围内17个姿态采样的专项数据见 \`V06C_LIGHT_FIXTURE_MAPPING.md\` 和 \`validation/v06c/stages/04-geometry-order.json\`。该阶段记录不替代后续最终网页、性能或用户视觉确认。\n\n床头/休闲灯仅抑制各自两个旧灯 proxy mesh；桌条/柜条没有旧 proxy，\`proxyMeshNames=[]\`，不抑制 A 桌柜或 B 钢琴。任一根/表面不完整时整家族 fallback：旧两灯保持、附加灯条缺席，不把部分到达记为成功。\n\n`;
    finalText = finalText.replace('## 材质、UV 与资源', fixtureDetails + '## 材质、UV 与资源');
  }
  if (family === 'wallart') {
    const wallartDetails = '## 原创图案与来源边界\n\n实际造型源为 `scripts/assets/v06c_fixture_geometry.py::build_wallart`：胡桃色边框、暖纸底、三层山脊与低饱和月形，使用浅厚度闭合多边形。正面沿原锚点局部 +Z 朝向室内；当前导出局部包络约[-0.429, -0.439, -0.014]至[0.429, 0.439, 0.016] m，在原[-0.43, -0.44, -0.0175]至[0.43, 0.44, 0.0175] m名义包络内。\n\n图案为本批原创抽象装饰，没有外部图片、像素纹理、文字、个人照片、用户经历、证书或其他个人信息来源；不宣称描绘用户指定地点或收藏作品。六个材质均由本生成器设定标准 PBR 颜色；不下载、复制或冒充第三方画作。保留原墙画锚点和朝向，未增添墙画交互或改变内容面板。\n\n';
    finalText = finalText.replace('## 材质、UV 与资源', wallartDetails + '## 材质、UV 与资源');
  }
  if (statistics.exportCleanup) {
    const sourceTriangles = statistics.sourceTriangles;
    const exportedTriangles = (gltf.meshes ?? []).reduce((sum, mesh) => sum + mesh.primitives.reduce((subtotal, primitive) => {
      if ((primitive.mode ?? 4) !== 4) throw new Error(`Non-triangle cleanup primitive: ${family}`);
      return subtotal + gltf.accessors[primitive.indices ?? primitive.attributes.POSITION].count / 3;
    }, 0), 0);
    if (!Number.isInteger(sourceTriangles) || sourceTriangles < exportedTriangles || exportedTriangles !== statistics.triangles || statistics.exportCleanup.exportedTriangles !== exportedTriangles) throw new Error(`Source/export cleanup triangle accounting mismatch: ${family}`);
    const cleanupDetails = `## 可编辑源与导出后严格清理\n\n本家族 \`.blend\` 保留原始可编辑拓扑；没有声称 Blender 源中的零面积面已经删除。生成流程先保存源文件并从 Blender 导出，再由 \`scripts/assets/v06c_mesh_cleanup.py::clean_exported_glb\` 在实际 GLB 上过滤严格零面积三角形索引、收紧不再被引用的顶点。判断为 POSITION 叉积严格等于零，不用面积阈值；保留有效三角形的逐顶点属性字节、材质和节点身份，不重建 Blender 法线。\n\n| 三角面统计口径 | 数量 |\n| --- | ---: |\n| Blender 可编辑源（\`sourceTriangles\`） | ${comma(sourceTriangles)} |\n| 清理后的最终 GLB（\`triangles\`） | ${comma(exportedTriangles)} |\n| 导出后剔除的严格零面积三角形 | ${comma(sourceTriangles - exportedTriangles)} |\n\n本规格资源数字与网页加载以最终 GLB 为准。\`asset-statistics.json\` 的 \`exportCleanup\` 保存清理记录；\`roundtripChecks.triangles\` 比较最终 GLB 统计与重新导入该 GLB 的结果，不表示源与清理后导出的三角面数完全相同。\n\n使用 \`node scripts/assets/build-collection-decor.mjs ${family}\` 可重现“可编辑源 → Blender 原始导出 → GLB 严格清理 → 最终 GLB 往返核验”的完整流程；在 Blender 中手动点击导出不会自动执行这一步 Python 后处理。有效几何的独立前后比较采用 \`scripts/assets/compare-decor-visible-geometry.mjs\` 与 \`validation/v06c/final/pre-cleanup-visible-geometry.json\`，默认按全部 POSITION/NORMAL/UV 字节精确比较；规格生成本身不代替该比较、浏览器复测或性能验收。\n\n`;
    finalText = finalText.replace('## 原锚点装配与完整回退', cleanupDetails + '## 原锚点装配与完整回退');
  }
  await fs.writeFile(specPath, finalText, { flag: update ? 'w' : 'wx' });
  process.stdout.write(JSON.stringify({ family, output: path.relative(project, specPath), glbBytes: bytes.length, glbSHA256: hash(bytes), visualApproval: 'pending' }) + '\n');
}
