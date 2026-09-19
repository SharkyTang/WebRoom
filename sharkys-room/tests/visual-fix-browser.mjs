import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {waitForCanvasReady} from './helpers/browserReady.mjs';

const output = process.env.ROOM_TEST_OUTPUT ?? 'validation/v06-fix/browser';
const origin = process.env.ROOM_TEST_URL ?? 'http://127.0.0.1:3000';
const stage = process.env.ROOM_FIX_STAGE ?? 'all';
const production = process.env.ROOM_TEST_PRODUCTION === '1';
const ids = ['monitor','macbook','ipad','marshall','piano','trashcan','lightswitch','phone','window'];
const checks = [], errors = [], contexts = [], poses = {};
const outsideInputs = {};
const devEvidence = production ? JSON.parse(await fs.readFile(process.env.ROOM_FIX_DEV_EVIDENCE,'utf8')) : null;
let viewportWidth;
await fs.mkdir(output, {recursive:true});
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const snap = page => page.evaluate(() => window.__ROOM_DEBUG__?.snapshot());
async function stable(page, id) {
  await page.waitForFunction(id => {
    const root=document.querySelector('main');
    return root?.getAttribute('data-room-status')==='ready' && (id ? document.querySelector(`aside[data-interaction="${id}"]`) && root.getAttribute('data-interaction-phase')==='focused' : !document.querySelector('aside.interaction-overlay') && ['idle','hovering'].includes(root.getAttribute('data-interaction-phase')));
  }, id, {timeout:30000});
  await page.waitForFunction(() => !window.__ROOM_DEBUG__?.snapshot().interaction.isCameraBusy);
}
async function shot(page,name) { await page.screenshot({path:path.join(output,name+'.png'),style:'.debug-panel{visibility:hidden!important}'}); }
async function check(name,fn,page) {
  try { await fn(); checks.push({name,passed:true}); console.log('PASS '+name); }
  catch(e) { checks.push({name,passed:false,error:String(e.stack),snapshot:page?await snap(page).catch(()=>null):null}); if(page)await shot(page,`failure-${checks.length}`).catch(()=>{}); throw e; }
}
async function open(page,id) { await page.getByRole('combobox',{name:'Explore objects'}).selectOption(id); await stable(page,id); await page.mouse.move(0,0); }
async function blank(page) {
  return page.evaluate(() => {
    const canvas=document.querySelector('canvas'),r=canvas.getBoundingClientRect();
    for(let dy=4;dy<r.height;dy+=20)for(let dx=4;dx<r.width;dx+=20){
      const p={x:Math.round(r.left+dx),y:Math.round(r.top+dy)};
      if(document.elementFromPoint(p.x,p.y)!==canvas)continue;
      if(!window.__ROOM_DEBUG__)return p;
      const active=window.__ROOM_DEBUG__.snapshot().interaction.activeObject;
      if([-2,0,2].every(x=>[-2,0,2].every(y=>document.elementFromPoint(p.x+x,p.y+y)===canvas && window.__ROOM_DEBUG__.hitTest(p.x+x,p.y+y)?.semanticId!==active)))return p;
    }
    throw Error('No unobscured outside scene pixel');
  });
}
async function outside(page,touch=false) {
  const id=await page.locator('aside.interaction-overlay').getAttribute('data-interaction');
  const p=production?devEvidence.outsideInputs[viewportWidth][id]:await blank(page);
  (outsideInputs[viewportWidth]??={})[id]=p;
  if(touch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);await stable(page,null);
}
async function stageBackground(page) {
  return page.evaluate(()=>{
    const stage=document.querySelector('.room-stage'),r=stage.getBoundingClientRect();
    for(let y=r.top+3;y<r.bottom;y+=15)for(let x=r.left+3;x<r.right;x+=15)
      if(document.elementFromPoint(x,y)===stage)return{x,y};
    throw Error('No exposed stage background');
  });
}
async function drag(page,dx=50,dy=0,touch=false) {
  const p=await page.evaluate(({dx,dy})=>{
    const canvas=document.querySelector('canvas'),r=canvas.getBoundingClientRect();
    for(let y=r.y+30;y<r.bottom-30;y+=30)for(let x=r.x+70;x<r.right-70;x+=30)
      if(document.elementFromPoint(x,y)===canvas&&document.elementFromPoint(x+dx,y+dy)===canvas)return{x,y};
    throw Error('No unobscured drag path');
  },{dx,dy});
  if(touch){
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:p.x,y:p.y}]});
    for(let i=1;i<=12;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:p.x+dx*i/12,y:p.y+dy*i/12}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  }else{await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+dx,p.y+dy,{steps:12});await page.mouse.up();}
  await page.waitForTimeout(200);
}
async function reset(page) { await page.getByRole('button',{name:'复位视角',exact:true}).click(); await page.waitForFunction(()=>!document.querySelector('.view-reset')?.disabled && !window.__ROOM_DEBUG__?.snapshot().interaction.isCameraBusy); await page.waitForTimeout(100); }
function shared(state) {const s=state.interaction;return Object.fromEntries(['pianoState','macbookState','trashState','lightsState','marshallPower','time','weather'].map(k=>[k,s[k]]));}
try {
  for(const width of (process.env.ROOM_FIX_WIDTHS?.split(',').map(Number)??(stage==='exit'?[1440,390]:[1440,768,390]))){
    viewportWidth=width;
    const touch=width===390;
    const context=await browser.newContext({viewport:{width,height:width===1440?900:width===768?1024:844},deviceScaleFactor:1,hasTouch:touch,isMobile:touch,recordVideo:{dir:path.join(output,'raw-video'),size:{width,height:width===1440?900:width===768?1024:844}}}); contexts.push(context);
    const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(production?origin:`${origin}/?debug=1&demand=1`);await stable(page,null);
    if(!production)await waitForCanvasReady(page,{quietMs:150});
    else {await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>Boolean(window.__ROOM_DEBUG__||window.__ROOM_INSPECTION__)),false);}
    const initial=await snap(page);poses[width]={initial};
    await shot(page,`${width}-hero`);
    if(stage!=='exit')await check(`${width}: room drag, bounded zoom, exact reset`,async()=>{
      await drag(page,60,0,touch);const rotated=await snap(page);
      if(!production){assert.notDeepEqual(rotated.camera.position,initial.camera.position);assert.deepEqual(shared(rotated),shared(initial));}
      await shot(page,`${width}-room-rotated`);
      const p=await blank(page);await page.mouse.move(p.x,p.y);await page.mouse.wheel(0,-240);await page.waitForTimeout(180);
      await reset(page);if(!production)assert.deepEqual((await snap(page)).camera,initial.camera);
    },page);
    for(const id of ids)await check(`${width}: ${id} panel isolation, navigation and outside return`,async()=>{
      await open(page,id);const focus=await snap(page);
      await page.locator('.overlay-heading h2').click();assert.equal(await page.locator(`aside[data-interaction="${id}"]`).count(),1);
      if(stage!=='exit'){
        await drag(page,35,0,touch);let rotated=await snap(page);
        if(!production && JSON.stringify(rotated.camera.position)===JSON.stringify(focus.camera.position)){await drag(page,-35,0,touch);rotated=await snap(page);}
        if(!production){assert.notDeepEqual(rotated.camera.position,focus.camera.position,`${id} camera must move`);assert.equal(rotated.interaction.activeObject,id);assert.deepEqual(shared(rotated),shared(focus));}
        await shot(page,`${width}-${id}-rotated`);
        await reset(page);if(!production){assert.deepEqual((await snap(page)).camera,focus.camera);assert.deepEqual(shared(await snap(page)),shared(focus));}
        const wheelPoint=await blank(page);await page.mouse.move(wheelPoint.x,wheelPoint.y);await page.mouse.wheel(0,160);await page.waitForTimeout(180);
        if(!production){let zoomed=await snap(page);if(JSON.stringify(zoomed.camera.position)===JSON.stringify(focus.camera.position)){await page.mouse.wheel(0,-160);await page.waitForTimeout(180);zoomed=await snap(page);}assert.notDeepEqual(zoomed.camera.position,focus.camera.position,`${id} zoom must move`);assert.equal(zoomed.camera.fov,focus.camera.fov);assert.deepEqual(shared(zoomed),shared(focus));}
        await reset(page);if(!production)assert.deepEqual((await snap(page)).camera,focus.camera);
      }
      if(id==='window'){await page.getByRole('button',{name:'Rainy',exact:true}).click();await page.getByRole('slider',{name:'Time',exact:true}).fill('18');}
      await shot(page,`${width}-${id}`);
      await outside(page,touch);
      if(!production){const after=await snap(page);assert.deepEqual(after.camera,initial.camera);assert(after.assembly.ok,JSON.stringify(after.assembly.errors));assert.equal(after.interaction.activeObject,null);if(id==='piano')assert.equal(after.interaction.pianoState,focus.interaction.pianoState);if(id==='trashcan')assert.equal(after.interaction.trashState,'closed');if(id==='macbook')assert.equal(after.interaction.macbookState,'closed');if(id==='window'){assert.equal(after.interaction.weather,'Rainy');assert.equal(after.interaction.time,18);}}
    },page);
    if(!production)await check(`${width}: stationary click on another object only exits; second click activates`,async()=>{
      await open(page,'monitor');
      const point=await page.evaluate(()=>Object.entries(window.__ROOM_DEBUG__.projected()).find(([id])=>id!=='monitor'&&id!=='__noninteractive'));
      assert(point);await page.mouse.click(point[1].x,point[1].y);await stable(page,null);assert.equal((await snap(page)).interaction.activeObject,null);
      const next=await page.evaluate(id=>window.__ROOM_DEBUG__.projected()[id],point[0]);assert(next);await page.mouse.click(next.x,next.y);await stable(page,point[0]);await page.keyboard.press('Escape');await stable(page,null);
    },page);
    await check(`${width}: outside click during focus queues original return`,async()=>{
      const p=await stageBackground(page);await page.getByRole('combobox',{name:'Explore objects'}).selectOption('trashcan');await page.mouse.click(p.x,p.y);await stable(page,null);
      if(!production){assert.equal((await snap(page)).interaction.trashState,'closed');assert.deepEqual((await snap(page)).camera,initial.camera);}
    },page);
    await check(`${width}: page margin exits while picker label and panel background remain isolated`,async()=>{
      await open(page,'phone');const label=await page.locator('.object-picker').boundingBox();assert(label);await page.mouse.click(label.x+8,label.y+5);assert.equal(await page.locator('aside[data-interaction="phone"]').count(),1);
      await page.mouse.click(2,2);await stable(page,null);
      if(!production)assert.deepEqual((await snap(page)).camera,initial.camera);
    },page);
    if(stage!=='exit'&&!production)await check(`${width}: static scene stops rendering after navigation and reset`,async()=>{
      await page.mouse.move(0,0);await page.waitForTimeout(1200);const before=await snap(page);await page.waitForTimeout(1000);const after=await snap(page);assert(after.renderFrames-before.renderFrames<=2);
    },page);
    await context.close();contexts.splice(contexts.indexOf(context),1);
  }
  assert.deepEqual(errors,[]);
} finally {
  for(const context of contexts)await context.close();await browser.close();
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify({stage,production,origin,checks,errors,poses,outsideInputs,summary:{passed:checks.filter(x=>x.passed).length,failed:checks.filter(x=>!x.passed).length}},null,2));
  console.log(`RESULT ${checks.filter(x=>x.passed).length} passed; ${checks.filter(x=>!x.passed).length} failed`);
}
