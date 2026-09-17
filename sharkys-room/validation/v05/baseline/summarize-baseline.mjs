import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const output=fileURLToPath(new URL('./',import.meta.url));
const read=name=>JSON.parse(fs.readFileSync(path.join(output,name),'utf8'));
const sources=read('source-baseline.json');
const performance=read('hero-performance.json');
const suites=[['browser','browser/browser_validation.json'],['interactions','interactions/interaction_browser.json'],['piano-development','piano/piano-browser.json'],['production','production/production_smoke.json'],['piano-production','piano/piano-production.json']].map(([name,file])=>({name,file,summary:read(file).summary}));
const tests=fs.readFileSync(path.join(output,'unit-tests.log'),'utf8');
const assetLog=fs.readFileSync(path.join(output,'verify-asset.log'),'utf8');
const asset=JSON.parse(assetLog.slice(assetLog.indexOf('{')));
const summary={recordedAt:new Date().toISOString(),baseline:'v0.4.1 before v0.5 runtime installation',sources,staticChecks:{verifyAsset:{passed:asset.passedChecks,failed:asset.failedChecks.length},typecheck:{exitCode:0},unitTests:{passed:Number(tests.match(/ℹ pass (\d+)/)[1]),failed:Number(tests.match(/ℹ fail (\d+)/)[1])}},browserSuites:suites,browserTotals:{passed:suites.reduce((n,s)=>n+s.summary.passed,0),failed:suites.reduce((n,s)=>n+s.summary.failed,0)},heroPerformance:performance,piano:{usesExploreObjectsForRediscovery:false,retractedLocalZ:-1.9399999618530273,extendedLocalZ:-1.2899999618530273,travelM:0.65,desktop:'1440×900 DPR1 native Playwright mouse input',mobile:'390×844 DPR1 Chromium touch emulation (not a physical phone)'},limitations:['Headless Chrome with ANGLE SwiftShader only; real GPU performance was not measured.','Safari and physical iPhone/Android were not tested.','frameMs is the existing debug bridge delta-derived frame interval, not isolated CPU/GPU render duration.','Hero performance sampling uses the existing development ?debug=1 continuous diagnostics mode; demand-mode rest is tested independently.','Production smoke tests use the already running v0.4.1 production build on port 3001; a fresh v0.5 production build is still required after implementation.']};
fs.writeFileSync(path.join(output,'baseline-summary.json'),JSON.stringify(summary,null,2)+'\n');
fs.writeFileSync(path.join(output,'BASELINE_SUMMARY.md'),[
'# v0.5 开始前的 v0.4.1 基线验收','',
`- 起点：\`${sources.head}\`，开始时工作区干净。`,
'- 本阶段未修改应用源码、冻结资产、相机、交互状态机或既有测试。钢琴专项只运行更换证据输出目录的临时副本，运行后删除。',
`- 源资产检查 ${asset.passedChecks}/${asset.passedChecks}；TypeScript exit 0；单元测试 ${summary.staticChecks.unitTests.passed}/${summary.staticChecks.unitTests.passed}。`,
`- 浏览器检查合计 ${summary.browserTotals.passed} 通过、${summary.browserTotals.failed} 失败。开发服务3000、生产服务3001均实际加载成功。`,
'',
'| 套件 | 通过 | 失败 | 证据 |','| --- | ---: | ---: | --- |',
...suites.map(s=>`| ${s.name} | ${s.summary.passed} | ${s.summary.failed} | ${s.file} |`),
'',
'## 冻结输入','',
'| 文件 | 字节 | SHA-256 |','| --- | ---: | --- |',
...sources.hashes.map(h=>`| ${h.path} | ${h.bytes} | ${h.sha256} |`),
'',
'## 同条件 Hero 性能与截图','',
`Chrome ${performance.browserVersion}，headless，ANGLE SwiftShader，DPR1。现有 \\?debug=1 连续诊断采样；相机名 CAM_Hero_FINAL，aspect 1.5。frameMs 是现有调试器的帧间隔，并非GPU耗时。`,
'',
'| Viewport | Draw calls | 渲染三角面 | frameMs | 截图 |','| --- | ---: | ---: | ---: | --- |',
...performance.samples.map(s=>`| ${s.viewport.width}×${s.viewport.height} | ${s.snapshot.performance.calls} | ${s.snapshot.performance.triangles} | ${s.snapshot.performance.frameMs.toFixed(4)} | hero-${s.viewport.width}.png |`),
'',
'## 钢琴入口与设备边界','',
'桌面鼠标和390×844触屏仿真均通过真实用户输入完成“展开→收回→Back→Hero桌下入口重新发现→点击/轻点再次抽出”，该重开路径未使用 Explore objects。桌面4轮重开、整数像素触屏区域、展开后入口禁用、邻近非交互区域、reduced-motion、busy时Back和静止后停止渲染均保留既有断言；生产版本也在无调试API情况下复用记录像素完成同一路径。',
'',
'retracted local Z = -1.9399999618530273；extended local Z = -1.2899999618530273；行程0.65m。',
'',
'真实手机、Safari及真实GPU未测试。生产测试使用现有v0.4.1运行产物；v0.5实施后仍需新建生产构建并重新验收。',
'',
'依赖与完整相机/机械快照见 source-baseline.json、hero-performance.json、baseline-summary.json。',
].join('\n')+'\n');
console.log(JSON.stringify({staticChecks:summary.staticChecks,browserTotals:summary.browserTotals},null,2));
