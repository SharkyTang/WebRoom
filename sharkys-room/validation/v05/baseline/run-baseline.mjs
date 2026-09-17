import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
// Historical v0.4.1 runner: rerun only against the recorded v0.4.1 checkout.
// Evidence uses the current script's read-only diagnostics and native inputs.
const root = new URL('../../../', import.meta.url);
const output = new URL('./', import.meta.url);
const results = [];
const pianoSource=await fs.readFile(new URL('tests/piano-discoverability-browser.mjs',root),'utf8');
const pianoCopy=pianoSource.replace("path.join(root, 'validation/v041')","path.join(root, 'validation/v05/baseline/piano')");
if(pianoSource===pianoCopy)throw new Error('Expected v0.4.1 piano output declaration; inspect runner before using another version.');
await fs.writeFile(new URL('tests/.v05-baseline-piano.mjs',root),pianoCopy,{flag:'wx'});
async function run(name, script, env = {}) {
  const out = new URL(`${name}.log`, output);
  const child = spawn(process.execPath, [script], { cwd: root, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  for (const stream of [child.stdout, child.stderr]) stream.on('data', data => { log += data; process.stdout.write(data); });
  const code = await new Promise(resolve => child.once('close', resolve));
  await fs.writeFile(out, log);
  results.push({ name, script, exitCode: code });
  await fs.writeFile(new URL('browser-command-results.json', output), JSON.stringify(results, null, 2));
}
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const performance = [];
for(const viewport of [{width:1440,height:900},{width:390,height:844}]) {
  const context = await browser.newContext({viewport,deviceScaleFactor:1,hasTouch:viewport.width===390,isMobile:viewport.width===390});
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3000/?debug=1');
  await page.waitForFunction(()=>window.__ROOM_DEBUG__?.snapshot().performance?.calls > 0,{},{timeout:60000});
  await page.waitForTimeout(1500);
  const snapshot=await page.evaluate(()=>window.__ROOM_DEBUG__.snapshot());
  const renderer=await page.evaluate(()=>{const c=document.querySelector('canvas'),gl=c.getContext('webgl2'),d=gl.getExtension('WEBGL_debug_renderer_info');return {userAgent:navigator.userAgent,dpr:devicePixelRatio,canvasWidth:c.width,canvasHeight:c.height,renderer:d?gl.getParameter(d.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)}});
  await page.screenshot({path:fileURLToPath(new URL(`hero-${viewport.width}.png`,output)),style:'.debug-panel {visibility:hidden !important;}'});
  performance.push({viewport,renderer,snapshot,note:'Initial unchanged v0.4.1 Hero; development debug sampling mode; frameMs is delta-based observed frame interval, not isolated GPU time; headless SwiftShader.'});
  await context.close();
}
await fs.writeFile(new URL('hero-performance.json',output),JSON.stringify({recordedAt:new Date().toISOString(),browserVersion:browser.version(),samples:performance},null,2));
await browser.close();
await run('browser','tests/browser-validation.mjs',{ROOM_TEST_OUTPUT:fileURLToPath(new URL('browser/',output)),ROOM_TEST_URL:'http://127.0.0.1:3000'});
await run('interactions','tests/interaction-browser.mjs',{ROOM_TEST_OUTPUT:fileURLToPath(new URL('interactions/',output)),ROOM_TEST_URL:'http://127.0.0.1:3000'});
await run('piano-development','tests/.v05-baseline-piano.mjs',{ROOM_TEST_URL:'http://127.0.0.1:3000'});
await run('production','tests/production-smoke.mjs',{ROOM_TEST_OUTPUT:fileURLToPath(new URL('production/',output)),ROOM_TEST_URL:'http://127.0.0.1:3001'});
await run('piano-production','tests/.v05-baseline-piano.mjs',{ROOM_TEST_URL:'http://127.0.0.1:3001',ROOM_TEST_PRODUCTION:'1'});
await fs.unlink(new URL('tests/.v05-baseline-piano.mjs',root));
console.log('BASELINE BROWSER SUITES COMPLETE',JSON.stringify(results));
process.exitCode=results.some(result=>result.exitCode!==0)?1:0;
