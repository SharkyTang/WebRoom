# Sharky's Room — v0.3 Web Foundation

基于冻结的 FINAL GLB 的本地 Next.js + React Three Fiber 灰盒页面。

## 运行

需要 Node.js ≥ 20.9 和 npm。首次运行：

```bash
cd "/Users/shaoqitang/Documents/ChatGPT/网页小屋/sharkys-room"
npm install
npm run dev
```

打开 http://127.0.0.1:3000 。在房间的小物件上悬停／点击，页面下方会显示 `Hovered` / `Selected` 语义 ID。手机或触屏使用轻点。本轮仅验证识别，不播放机械动作、相机动画或内容面板。

开发诊断地址：http://127.0.0.1:3000/?debug=1 。展开左上角 DEV 面板查看节点、targets、FPS、frame time、draw calls。只在开发环境启用；生产即使带 `?debug=1` 也禁用。没有自由旋转／WASD 控制。

## 检查与生产运行

```bash
npm run verify:asset
npm test
npm run typecheck
npm run build
npm start -- --port 3001
```

生产预览：http://127.0.0.1:3001 。服务器仅监听本机；没有部署至外网。

真实 Chrome 验收（需先分别启动 dev / production server）：

```bash
npm run test:browser
npm run test:production
```

默认使用 macOS 已安装的 Google Chrome。其他路径使用 `CHROME_PATH` 环境变量；测试地址用 `ROOM_TEST_URL` 覆盖。测试脚本的 SwiftShader 是软件 WebGL，性能数字不能替代真实手机或 GPU 基准。

## 结构

- `app/`：页面入口、布局、基础响应式样式。
- `components/room/`：Canvas、模型、冻结相机、事件识别、加载／错误提示、开发诊断。
- `lib/room/interactiveObjects.ts`：唯一的 9 语义 → 14 节点 → 9 targets 配置。
- `lib/room/diagnostics.ts`：GLTFLoader 结果与冻结结构的只读比对。
- `lib/room/frozenSceneManifest.json`：85 个原始节点和相机的冻结快照。
- `public/models/`：FINAL GLB 的逐字节副本。
- `scripts/verify-asset.mjs`：资产 SHA256、尺寸、hierarchy、transform 检查。
- `tests/`：真实资产契约测试和浏览器鼠标／触屏／生产验证。
- `validation/`：截图、验收结果和构建日志。

## 冻结与显示

直接加载 GLB，使用 `CAM_Hero_FINAL` 的独立相机副本。Three.js 使用导出的 Y-up 坐标；不再二次旋转模型。所有屏幕尺寸均以固定 3:2 画幅 contain，保留完整 Hero 构图。窄屏留白多、手机与开关等物件的触摸面积很小，最终移动 UX 留待后续规格。

几何、节点名、父子关系、pivots、targets 和 `.blend` 均未修改。仅对 Web 灯光强度做统一换算并添加基础半球补光；不包含 Blender 的软阴影／AO。普通模式按需渲染；开发诊断模式持续渲染以采样 FPS。

完整验收、依赖版本和限制见 [WEB_FOUNDATION_REPORT.md](WEB_FOUNDATION_REPORT.md)。完成本轮后停在 v0.3，等待下一阶段指令。
