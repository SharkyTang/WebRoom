import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{for(let i=0;i<6;i++){
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,reducedMotion:'reduce'}),page=await context.newPage();
 await page.addInitScript(()=>{window.__trace=[];for(const type of ['pointerdown','pointerup','click'])document.addEventListener(type,event=>{const c=document.querySelector('canvas'),r=c?.getBoundingClientRect();window.__trace.push({type,at:performance.now(),x:event.clientX,y:event.clientY,offsetX:event.offsetX,offsetY:event.offsetY,rect:r?.toJSON(),parentRect:c?.parentElement.getBoundingClientRect().toJSON(),width:c?.width,height:c?.height,hit:window.__ROOM_DEBUG__?.hitTest(event.clientX,event.clientY),active:window.__ROOM_DEBUG__?.snapshot().interaction.activeObject});},true);});
 await page.route('**/models/production/floor_v06a.glb',r=>r.fulfill({status:404,contentType:'text/plain',body:'fixture'}));
 await page.goto('http://127.0.0.1:3000/?debug=1&demand=1',{waitUntil:'domcontentloaded'});
 await page.waitForSelector('[data-room-status="ready"][data-asset-floor="fallback"]');
 await page.waitForFunction(()=>Object.values(window.__ROOM_DEBUG__.snapshot().assets).every(a=>a.status!=='loading'));
 for(const family of ['monitor','macbook','marshall','floor','walls','door','window','curtains','desk','cabinet','bed','bedside','sofa','chair','coffee','sidetable','beanbag','rugs','dogbed'])await page.waitForSelector(`[data-asset-${family}="${family==='floor'?'fallback':'installed'}"]`);await page.locator('.asset-fallback').waitFor();
 const before=await page.evaluate(()=>{const api=window.__ROOM_DEBUG__,c=document.querySelector('canvas'),r=c.getBoundingClientRect(),point=api.projected().monitor;return {at:performance.now(),point,hit:api.hitTest(point.x,point.y),rect:r.toJSON(),parentRect:c.parentElement.getBoundingClientRect().toJSON(),width:c.width,height:c.height,interaction:api.snapshot().interaction};});
 await page.mouse.click(before.point.x,before.point.y);
 await page.waitForSelector('[data-interaction-phase="focused"]');
 const after=await page.evaluate(()=>({trace:window.__trace,interaction:window.__ROOM_DEBUG__.snapshot().interaction}));results.push({i,before,...after});console.log(JSON.stringify(results.at(-1)));
 await context.close();
}}finally{await browser.close();await fs.writeFile(new URL('./fallback-diagnostic.json',import.meta.url),JSON.stringify(results,null,2)+'\n');}
