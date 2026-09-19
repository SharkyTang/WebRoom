import { waitForCanvasReady } from './helpers/browserReady.mjs';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const output=process.env.ROOM_TEST_OUTPUT??'validation/v06-fix/gestures',origin=process.env.ROOM_TEST_URL??'http://127.0.0.1:3000';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const checks=[],errors=[];const snap=p=>p.evaluate(()=>window.__ROOM_DEBUG__.snapshot());
async function wait(page,id){await page.waitForFunction(id=>{const snapshot=window.__ROOM_DEBUG__?.snapshot(),s=snapshot?.interaction;return snapshot?.status==='ready'&&snapshot.camera?.name==='CAM_Hero_FINAL'&&s&&s.activeObject===id&&!s.isCameraBusy&&(id?s.interactionPhase==='focused':['idle','hovering'].includes(s.interactionPhase));},id,{timeout:30000});}
async function open(page,id){await page.getByRole('combobox',{name:'Explore objects'}).selectOption(id);await wait(page,id);}
async function check(name,fn,page){try{await fn();checks.push({name,passed:true});console.log('PASS '+name);}catch(error){checks.push({name,passed:false,error:String(error.stack),snapshot:await snap(page)});await page.screenshot({path:path.join(output,'failure.png')});throw error;}}
function pose(s){return s.camera;}
try{
  for(const reduced of [false,true]){
    const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true,isMobile:true,reducedMotion:reduced?'reduce':'no-preference'}),page=await ctx.newPage();page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(origin+'/?debug=1&demand=1');await wait(page,null);await waitForCanvasReady(page);const initial=await snap(page);
    const scenePoint=async()=>page.evaluate(()=>{const c=document.querySelector('canvas'),r=c.getBoundingClientRect();return{x:Math.round(r.x+r.width*.45),y:Math.round(r.y+55)};});
    await check(`reduced=${reduced}: two-finger dolly/rotate and cancellation never exit or toggle`,async()=>{
      await open(page,'trashcan');const before=await snap(page),p=await scenePoint(),cdp=await ctx.newCDPSession(page);
      const points=d=>[{id:1,x:p.x-d,y:p.y},{id:2,x:p.x+d,y:p.y}];
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points(25)});
      for(const d of [30,35,40,45,50])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points(d)});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(200);
      const after=await snap(page);assert.notDeepEqual(after.camera.position,before.camera.position);assert.equal(after.interaction.activeObject,'trashcan');assert.equal(after.interaction.trashState,'open');
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:3,x:p.x,y:p.y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
      assert.equal((await snap(page)).interaction.activeObject,'trashcan');await cdp.detach();
      await page.getByRole('button',{name:'复位视角',exact:true}).tap();await wait(page,'trashcan');assert.deepEqual(pose(await snap(page)),pose(before));
      await page.keyboard.press('Escape');await wait(page,null);assert.deepEqual(pose(await snap(page)),pose(initial));
    },page);
    await check(`reduced=${reduced}: dragging actual piano does not toggle; Escape during a drag releases camera ownership`,async()=>{
      await open(page,'piano');const before=await snap(page);const point=await page.evaluate(()=>window.__ROOM_DEBUG__.projected().piano);assert(point);
      await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+20,point.y,{steps:5});await page.mouse.up();
      assert.equal((await snap(page)).interaction.pianoState,before.interaction.pianoState);
      const leaving=await scenePoint();await page.mouse.move(leaving.x,leaving.y);await page.mouse.down();await page.mouse.move(2,2,{steps:12});await page.mouse.up();
      assert.equal((await snap(page)).interaction.activeObject,'piano','Dragging out of canvas must not turn the page margin into an exit click');
      assert.equal((await snap(page)).interaction.pianoState,before.interaction.pianoState);
      const p=await scenePoint();await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+20,p.y,{steps:5});await page.keyboard.press('Escape');await page.mouse.up();await wait(page,null);
      assert.deepEqual(pose(await snap(page)),pose(initial));await open(page,'phone');await page.getByRole('button',{name:'Back',exact:true}).tap();await wait(page,null);
    },page);
    await check(`reduced=${reduced}: five-pixel click jitter still exits and held gestures cannot leak into next view`,async()=>{
      await open(page,'phone');
      const p=await page.evaluate(()=>{const c=document.querySelector('canvas'),r=c.getBoundingClientRect();for(let y=r.top+10;y<r.bottom-10;y+=20)for(let x=r.left+10;x<r.right-20;x+=20)if([0,5].every(dx=>document.elementFromPoint(x+dx,y)===c&&window.__ROOM_DEBUG__.hitTest(x+dx,y)?.semanticId!=='phone'))return{x,y};});assert(p);
      await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+5,p.y,{steps:5});await page.mouse.up();await wait(page,null);assert.deepEqual(pose(await snap(page)),pose(initial));
    },page);
    await check(`reduced=${reduced}: resize/reload preserves forty families and has no duplicated resources`,async()=>{
      for(let i=0;i<3;i++){await page.setViewportSize({width:i%2?768:390,height:844});await page.reload();await wait(page,null);await waitForCanvasReady(page);const s=await snap(page);assert.equal(s.assembly.installedFamilies.length,40);assert(s.assembly.ok);assert.deepEqual(s.rendererMemory,initial.rendererMemory);assert.deepEqual(s.camera,initial.camera);}
    },page);
    await ctx.close();
  }
  assert.deepEqual(errors,[]);
}finally{await browser.close();await fs.writeFile(path.join(output,'results.json'),JSON.stringify({checks,errors,summary:{passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length}},null,2));}
