import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const output=fileURLToPath(new URL('./',import.meta.url));
const root=fileURLToPath(new URL('../../../',import.meta.url));
const results=[];
const write=async(name,value)=>fs.writeFile(path.join(output,name),JSON.stringify(value,null,2)+'\n');
async function run(name,command,args,env={}) {
  console.log(`START ${name}`);
  const startedAt=new Date().toISOString();
  const child=spawn(command,args,{cwd:root,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});
  let log='';
  for(const stream of [child.stdout,child.stderr])stream.on('data',data=>{log+=data;process.stdout.write(data);});
  const code=await new Promise(resolve=>child.once('close',resolve));
  await fs.writeFile(path.join(output,`${name}.log`),log);
  results.push({name,command,args,startedAt,finishedAt:new Date().toISOString(),exitCode:code});
  await write('command-results.json',results);
  console.log(`COMPLETE ${name} ${code}`);
  if(code!==0)throw new Error(`${name} failed with exit ${code}; no batch modelling may begin`);
}
const familyFiles=['monitor','macbook','marshall'].flatMap(id=>[`blender-assets/${id}_pilot.blend`,`public/models/production/${id}_pilot.glb`,`assets-source/${id}/ASSET_SPEC.md`]);
const files=['../blockout_FINAL/sharkys_room_blockout_FINAL.blend','../blockout_FINAL/sharkys_room_blockout_FINAL.glb','public/models/sharkys_room_blockout_FINAL.glb','lib/room/frozenSceneManifest.json','package.json','package-lock.json','lib/room/assets/assetManifest.ts',...familyFiles];
const hashes=[];
for(const file of files){const bytes=await fs.readFile(path.join(root,file));hashes.push({path:file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
await write('source-ledger.json',{recordedAt:new Date().toISOString(),node:process.version,package:JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8')),files:hashes,note:'Read-only source ledger. Git state and rollback point are recorded by the parent task; this runner performs no Git mutation.'});
try {
  await run('verify-asset','npm',['run','verify:asset']);
  await run('typecheck','npm',['run','typecheck']);
  await run('unit-tests','npm',['test']);
  await run('production-build','npm',['run','build']);
  console.log('STATIC_BASELINE_PASS: verify, typecheck, unit and production build complete');
  await run('production-assets-development',process.execPath,['tests/production-assets-browser.mjs'],{ROOM_TEST_OUTPUT:path.join(output,'assets'),ROOM_TEST_URL:'http://127.0.0.1:3000',ROOM_ASSET_SKIP_PERFORMANCE:'1',ROOM_TEST_VIDEO:'0'});
  await run('piano-development',process.execPath,['tests/piano-discoverability-browser.mjs'],{ROOM_TEST_OUTPUT:path.join(output,'piano'),ROOM_TEST_URL:'http://127.0.0.1:3000'});
  console.log('KEY_BASELINE_PASS: production visuals, mechanisms, material state, fallback and piano rediscovery all work');
  await run('browser',process.execPath,['tests/browser-validation.mjs'],{ROOM_TEST_OUTPUT:path.join(output,'browser'),ROOM_TEST_URL:'http://127.0.0.1:3000'});
  await run('interactions',process.execPath,['tests/interaction-browser.mjs'],{ROOM_TEST_OUTPUT:path.join(output,'interactions'),ROOM_TEST_URL:'http://127.0.0.1:3000'});
  await run('production-smoke',process.execPath,['tests/production-smoke.mjs'],{ROOM_TEST_OUTPUT:path.join(output,'production'),ROOM_TEST_URL:'http://127.0.0.1:3001'});
  await run('piano-production',process.execPath,['tests/piano-discoverability-browser.mjs'],{ROOM_TEST_OUTPUT:path.join(output,'piano'),ROOM_TEST_URL:'http://127.0.0.1:3001',ROOM_TEST_PRODUCTION:'1'});
  await run('production-assets-production',process.execPath,['tests/production-assets-browser.mjs'],{ROOM_TEST_OUTPUT:path.join(output,'assets'),ROOM_TEST_URL:'http://127.0.0.1:3001',ROOM_TEST_PRODUCTION:'1',ROOM_ASSET_DEV_EVIDENCE:path.join(output,'assets/production-assets-browser.json')});
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const samples=[];
  for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:768,height:1024}]) {
    const context=await browser.newContext({viewport,deviceScaleFactor:1,hasTouch:viewport.width===390,isMobile:viewport.width===390});
    const page=await context.newPage(), errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:3000/?debug=1',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('[data-room-status="ready"]',{timeout:60000});
    for(const family of ['monitor','macbook','marshall'])await page.waitForSelector(`[data-asset-${family}="installed"]`);
    await page.waitForFunction(()=>window.__ROOM_DEBUG__?.snapshot().performance?.calls>0,undefined,{timeout:30000});
    const before=await page.evaluate(()=>window.__ROOM_DEBUG__.snapshot());
    await page.waitForTimeout(1500);
    const snapshot=await page.evaluate(()=>window.__ROOM_DEBUG__.snapshot());
    assert.equal(snapshot.assembly.ok,true);assert(snapshot.renderFrames>before.renderFrames);
    for(const family of ['monitor','macbook'])assert.deepEqual(snapshot.assetVisuals[family].stateSurfaces.map(s=>s.textureUpdates),before.assetVisuals[family].stateSurfaces.map(s=>s.textureUpdates));
    const environment=await page.evaluate(()=>{const c=document.querySelector('canvas'),gl=c.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return {userAgent:navigator.userAgent,dpr:devicePixelRatio,canvas:{width:c.width,height:c.height},renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),resourceEntries:performance.getEntriesByType('resource').filter(r=>r.name.includes('/models/')).map(r=>({name:r.name,transferSize:r.transferSize,encodedBodySize:r.encodedBodySize,decodedBodySize:r.decodedBodySize,duration:r.duration}))};});
    await page.screenshot({path:path.join(output,`hero-${viewport.width}.png`),style:'.debug-panel {visibility:hidden !important;}'});
    assert.deepEqual(errors,[]);
    samples.push({viewport,environment,snapshot,errors});
    await context.close();
  }
  await write('hero-performance.json',{recordedAt:new Date().toISOString(),browserVersion:browser.version(),mode:'Isolated headless Chrome / SwiftShader; existing ?debug=1 continuous sampler; DPR1; frameMs is observed frame interval, not isolated GPU render duration.',samples});
  await browser.close();
  await write('completion.json',{ok:true,finishedAt:new Date().toISOString(),commands:results.length,sourceAssetBytes:hashes.filter(h=>h.path.startsWith('public/models/')).reduce((n,h)=>n+h.bytes,0)});
  console.log('V05_BASELINE_COMPLETE: all current checks and isolated evidence succeeded');
}catch(error){await write('completion.json',{ok:false,error:String(error.stack??error),finishedAt:new Date().toISOString()});console.error(error);process.exitCode=1;}
