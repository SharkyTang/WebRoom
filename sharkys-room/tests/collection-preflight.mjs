/** One-off repeatable, explicitly labelled White City placement preview in isolated actual app. */
import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const output=process.env.ROOM_TEST_OUTPUT??'validation/v06c/planning/minastirith-preview/browser';
await fs.mkdir(output,{recursive:true});
const data=await fs.readFile('validation/v06c/planning/minastirith-preview/minastirith-preview.glb');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/models/production/minastirith_v06c.glb',route=>route.fulfill({status:200,contentType:'model/gltf-binary',body:data}));
try {
 await page.goto('http://127.0.0.1:3003/?debug=1&demand=1');
 await page.waitForSelector('[data-room-status="ready"]',{timeout:90000});
 for(const family of ['eiffel','hogwarts','minastirith'])await page.waitForSelector(`[data-asset-${family}="installed"]`);
 const first=await page.evaluate(()=>window.__ROOM_DEBUG__.snapshot());assert(first.assembly.ok);assert.equal(first.assembly.installedFamilies.length,30);
 const views=[{id:'cabinet-front',position:[-.15,1.65,-.7],target:[-3.22,1.35,-.68],fov:62},{id:'eiffel-front',position:[-1.60,1.60,-.92],target:[-3.23,1.53,-.995],fov:65},{id:'hogwarts-front',position:[-1.50,2.10,.36],target:[-3.22,1.92,.31],fov:51},{id:'minastirith-front',position:[-2.1,1.10,-2.17],target:[-3.22,1.00,-2.196],fov:34},{id:'minastirith-top-side',position:[-2.35,1.68,-1.83],target:[-3.22,1.00,-2.196],fov:38}];
 const observations=[];
 for(const view of views){const camera=await page.evaluate(v=>window.__ROOM_INSPECTION__.setView(v),view);await page.waitForTimeout(350);await page.screenshot({path:path.join(output,view.id+'.png'),style:'.debug-panel {visibility:hidden !important;}'});observations.push({view,camera});}
 const inspected=await page.evaluate(()=>window.__ROOM_INSPECTION__.snapshot());
 assert.equal(errors.length,0,errors.join('\n'));
 await fs.writeFile(path.join(output,'preflight.json'),JSON.stringify({previewOnly:true,method:'Real app in isolated source copy with only test camera helper. Route serves low-cost 3-tier candidate GLB; no formal White City completion claimed.',previewSha256:createHash('sha256').update(data).digest('hex'),first,observations,inspected,errors},null,2),{flag:'wx'});
 console.log('PASS White City low-cost preview in distinct original Architecture slot; screenshots require visual inspection.');
}finally{await browser.close();}
