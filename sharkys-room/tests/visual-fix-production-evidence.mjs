import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const output=process.env.ROOM_TEST_OUTPUT??'validation/v06-fix/production-evidence';
const origin=process.env.ROOM_TEST_URL??'http://127.0.0.1:3005';
const piano=JSON.parse(await fs.readFile('validation/v06-fix/final/piano-r2/piano-browser.json')).observations.desktop;
const navigation=JSON.parse(await fs.readFile('validation/v06-fix/final/navigation/results.json'));
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,recordVideo:{dir:path.join(output,'raw-video'),size:{width:1440,height:900}}});
const page=await context.newPage(),errors=[],events=[];page.on('pageerror',e=>errors.push(String(e)));
const started=performance.now(),mark=name=>events.push({name,elapsedMs:performance.now()-started});
const wait=async id=>{await page.waitForFunction(id=>{const m=document.querySelector('main');return m?.dataset.roomStatus==='ready'&&(id?m.dataset.interactionPhase==='focused'&&document.querySelector(`aside[data-interaction="${id}"]`):['idle','hovering'].includes(m.dataset.interactionPhase)&&!document.querySelector('aside.interaction-overlay'));},id);};
const shot=async name=>{mark(name);await page.screenshot({path:path.join(output,name+'.png')});};
const reset=async()=>{await page.getByRole('button',{name:'复位视角',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.view-reset').disabled);};
async function startPoint(){return page.evaluate(()=>{const canvas=document.querySelector('canvas'),r=canvas.getBoundingClientRect();for(let y=r.top+45;y<r.bottom-45;y+=25)for(let x=r.left+120;x<r.right-120;x+=25)if([-100,0,100].every(dx=>document.elementFromPoint(x+dx,y)===canvas))return{x,y};throw Error('Missing clear canvas input path');});}
async function drag(dx,dy=0){const p=await startPoint();await page.mouse.move(p.x,p.y);await page.mouse.down();for(let i=1;i<=30;i++){await page.mouse.move(p.x+dx*i/30,p.y+dy*i/30);await page.waitForTimeout(18);}await page.mouse.up();await page.waitForTimeout(300);}
async function zoom(delta,steps=5){const p=await startPoint();await page.mouse.move(p.x,p.y);for(let i=0;i<steps;i++){await page.mouse.wheel(0,delta);await page.waitForTimeout(80);}}
let video;
try{
  await page.goto(origin);await wait(null);await page.waitForTimeout(500);
  assert.equal(await page.evaluate(()=>Boolean(window.__ROOM_DEBUG__||window.__ROOM_INSPECTION__)),false);
  assert.equal(await page.locator('main[data-asset-piano="installed"][data-asset-trashcan="installed"]').count(),1);
  video=page.video();await shot('01-default-overview');await drag(100,-20);await shot('02-room-rotation');await zoom(-120);await reset();
  mark('piano-enter');await page.getByRole('combobox').selectOption('piano');await wait('piano');await shot('03-piano-extended');
  await drag(-60,-85);await zoom(100);await shot('04-piano-connection-side');await page.waitForTimeout(700);
  mark('piano-retract-start');await page.getByRole('button',{name:'Toggle piano',exact:true}).click();await wait('piano');await shot('05-piano-retracted');
  mark('piano-extend-start');await page.getByRole('button',{name:'Toggle piano',exact:true}).click();await wait('piano');await page.waitForTimeout(600);
  await page.getByRole('button',{name:'Toggle piano',exact:true}).click();await wait('piano');await page.getByRole('button',{name:'Back',exact:true}).click();await wait(null);await shot('06-underdesk-entry');
  mark('native-underdesk-reopen');await page.mouse.move(piano.proxy.x,piano.proxy.y);await page.waitForTimeout(500);await page.mouse.click(piano.proxy.x,piano.proxy.y);await wait('piano');await page.getByText('Piano: extended',{exact:true}).waitFor();await shot('07-underdesk-reopened');
  mark('piano-outside-exit');const outside=navigation.outsideInputs[1440].piano;await page.mouse.click(outside.x,outside.y);await wait(null);
  mark('trash-open');await page.getByRole('combobox').selectOption('trashcan');await wait('trashcan');await zoom(120,16);await shot('08-trash-open-full');
  await drag(-55,15);await shot('09-trash-hinge-side');await page.waitForTimeout(800);await drag(90,85);await shot('10-trash-cavity-other-side');
  await reset();mark('trash-outside-close');const trashOutside=navigation.outsideInputs[1440].trashcan;await page.mouse.click(trashOutside.x,trashOutside.y);await wait(null);await shot('11-outside-return');await page.waitForTimeout(800);
  assert.deepEqual(errors,[]);
}finally{
  await context.close();await browser.close();
  let conversion;
  if(video){const source=await video.path(),mp4=path.join(output,'visual-interaction-demo.mp4');const r=spawnSync('/opt/homebrew/bin/ffmpeg',['-n','-i',source,'-c:v','libx264','-preset','fast','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',mp4],{encoding:'utf8'});conversion={source,mp4,status:r.status,error:r.status?r.stderr.slice(-1200):null};}
  await fs.writeFile(path.join(output,'evidence.json'),JSON.stringify({origin,production:true,inspectionAPI:false,nativeInputsOnly:true,events,errors,conversion},null,2));
}
