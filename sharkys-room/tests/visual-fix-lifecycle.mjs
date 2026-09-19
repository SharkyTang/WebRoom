import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {waitForCanvasReady} from './helpers/browserReady.mjs';
const output=process.env.ROOM_TEST_OUTPUT??'validation/v06-fix/final/lifecycle';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:768,height:1024},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));let result={passed:false};
const wait=id=>page.waitForFunction(id=>{const s=window.__ROOM_DEBUG__?.snapshot();return s?.status==='ready'&&s.interaction.activeObject===id&&!s.interaction.isCameraBusy&&(id?s.interaction.interactionPhase==='focused':['idle','hovering'].includes(s.interaction.interactionPhase));},id);
try{
  await page.goto('http://127.0.0.1:3000/?debug=1&demand=1');await wait(null);await waitForCanvasReady(page);
  const session=await page.context().newCDPSession(page);
  async function listeners(){
    const result={};
    for(const expression of ['window','document','document.querySelector("canvas")']){
      const {result:object}=await session.send('Runtime.evaluate',{expression,objectGroup:'navigation-listeners'});
      const {listeners}=await session.send('DOMDebugger.getEventListeners',{objectId:object.objectId});
      result[expression]=listeners.map(l=>`${l.type}:${l.useCapture}:${l.passive}:${l.once}`).sort();
    }
    await session.send('Runtime.releaseObjectGroup',{objectGroup:'navigation-listeners'});return result;
  }
  async function cycle(){await page.getByRole('combobox').selectOption('phone');await wait('phone');await page.getByRole('button',{name:'复位视角',exact:true}).click();await wait('phone');await page.getByRole('button',{name:'Back',exact:true}).click();await wait(null);await page.mouse.move(0,0);}
  await cycle();const before=await page.evaluate(()=>window.__ROOM_DEBUG__.snapshot()),listenersBefore=await listeners();
  for(let i=0;i<20;i++)await cycle();
  const after=await page.evaluate(()=>window.__ROOM_DEBUG__.snapshot()),listenersAfter=await listeners();
  assert.deepEqual(listenersAfter,listenersBefore);assert.deepEqual(after.camera,before.camera);assert.deepEqual(after.rendererMemory,before.rendererMemory);assert(after.assembly.ok);assert.deepEqual(errors,[]);
  await page.waitForTimeout(800);const frames=await page.evaluate(()=>window.__ROOM_DEBUG__.snapshot().renderFrames);await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>window.__ROOM_DEBUG__.snapshot().renderFrames),frames);
  result={passed:true,cycles:20,listenersBefore,listenersAfter,rendererMemory:after.rendererMemory,exactHero:true,idleFramesUnchanged:true,errors};
}catch(error){result={...result,error:String(error.stack),errors};process.exitCode=1;}finally{await browser.close();await fs.writeFile(`${output}/results.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));}
