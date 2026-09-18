import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:1440,height:900}]){const background=await browser.newPage({viewport,deviceScaleFactor:1});await background.goto('http://127.0.0.1:3000/?debug=1',{waitUntil:'domcontentloaded'});await background.waitForFunction(()=>window.__ROOM_DEBUG__?.snapshot().status==='ready',undefined,{timeout:60000});}
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 await page.goto('http://127.0.0.1:3000/?debug=1&demand=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__ROOM_DEBUG__?.snapshot().status==='ready',undefined,{timeout:60000});
 const samples=await page.evaluate(()=>new Promise(resolve=>{const values=[],start=performance.now();function sample(){const s=window.__ROOM_DEBUG__.snapshot(),c=document.querySelector('canvas'),r=c.getBoundingClientRect(),p=c.parentElement.getBoundingClientRect();values.push({at:performance.now()-start,frames:s.renderFrames,assets:Object.fromEntries(Object.entries(s.assets).map(([id,a])=>[id,a.status])),memory:s.rendererMemory,textureUpdates:Object.fromEntries(['monitor','macbook'].map(id=>[id,s.assetVisuals[id].stateSurfaces.map(s=>s.textureUpdates)])),canvas:r.toJSON(),parent:p.toJSON(),buffer:[c.width,c.height],phase:s.interaction.interactionPhase});if(performance.now()-start>2000)resolve(values);else requestAnimationFrame(sample);}sample();}));
 await fs.writeFile(new URL('./startup-loaded-observation.json',import.meta.url),JSON.stringify({note:'Read-only RAF timeline after old ready condition; no input or application state mutation.',samples},null,2)+'\n');let key='';for(const s of samples){const next=JSON.stringify([s.frames,s.memory,s.buffer,s.canvas.width,s.canvas.height,s.textureUpdates]);if(next!==key){console.log(JSON.stringify(s));key=next;}}
}finally{await browser.close();}
