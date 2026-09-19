// v0.7A room preservation evidence only: no content UI or room-state mutation APIs.
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const output=process.env.ROOM_TEST_OUTPUT;
const origin=process.env.ROOM_TEST_URL;
assert(output&&origin&&process.env.ROOM_V07A_PIANO_EVIDENCE&&process.env.ROOM_V07A_NAV_EVIDENCE);
await fs.mkdir(output,{recursive:true});
await fs.access(path.join(output,'results.json')).then(()=>{throw Error('Refusing to overwrite evidence');},e=>{if(e.code!=='ENOENT')throw e;});
const piano=JSON.parse(await fs.readFile(process.env.ROOM_V07A_PIANO_EVIDENCE,'utf8')).observations.desktop;
const navigation=JSON.parse(await fs.readFile(process.env.ROOM_V07A_NAV_EVIDENCE,'utf8'));
const checks=[],events=[],errors=[],responses=[];
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,recordVideo:{dir:path.join(output,'raw-video'),size:{width:1440,height:900}}});
const page=await context.newPage(),video=page.video(),started=performance.now();
page.on('pageerror',e=>errors.push(String(e)));
page.on('response',r=>{if(r.url().endsWith('.glb'))responses.push(r);});
const stable=async id=>{await page.waitForFunction(id=>{const m=document.querySelector('main');return m?.dataset.roomStatus==='ready'&&(id?m.dataset.interactionPhase==='focused'&&document.querySelector(`aside[data-interaction="${id}"]`):['idle','hovering'].includes(m.dataset.interactionPhase)&&!document.querySelector('aside.interaction-overlay'));},id,{timeout:30000});};
const shot=async name=>{events.push({name,elapsedMs:performance.now()-started});await page.screenshot({path:path.join(output,`${name}.png`)});};
const open=async id=>{await page.getByRole('combobox',{name:'Explore objects'}).selectOption(id);await stable(id);};
const back=async()=>{await page.getByRole('button',{name:'Back',exact:true}).click();await stable(null);};
const reset=async()=>{await page.getByRole('button',{name:'复位视角',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.view-reset').disabled);};
async function check(name,fn){try{await fn();checks.push({name,passed:true});console.log('PASS '+name);}catch(e){checks.push({name,passed:false,error:String(e.stack)});await shot('failure-'+checks.length).catch(()=>{});throw e;}}
async function canvasPoint(){return page.evaluate(()=>{const c=document.querySelector('canvas'),r=c.getBoundingClientRect();for(let y=r.top+50;y<r.bottom-50;y+=25)for(let x=r.left+120;x<r.right-120;x+=25)if([-90,0,90].every(dx=>document.elementFromPoint(x+dx,y)===c))return{x,y};throw Error('No clear input path');});}
async function drag(dx,dy){const p=await canvasPoint();await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+dx,p.y+dy,{steps:20});await page.mouse.up();await page.waitForTimeout(250);}
async function zoom(delta){const p=await canvasPoint();await page.mouse.move(p.x,p.y);await page.mouse.wheel(0,delta);await page.waitForTimeout(220);}
let failure;
try{
 await page.goto(origin);await stable(null);await page.waitForTimeout(300);
 await check('Production installs all forty families and exposes no room debug/inspection API',async()=>{
  const installed=await page.locator('main').evaluate(m=>[...m.attributes].filter(a=>a.name.startsWith('data-asset-')).map(a=>({name:a.name,value:a.value})));
  assert.equal(installed.length,40);assert(installed.every(a=>a.value==='installed'));
  assert.equal(await page.evaluate(()=>Boolean(window.__ROOM_DEBUG__||window.__ROOM_INSPECTION__)),false);await shot('01-overview');
 });
 await check('Native overview rotation, wheel zoom and view reset remain usable',async()=>{await drag(65,-15);await shot('02-overview-rotated');await zoom(-180);await reset();});
 await check('Original piano first sequence, retract, Back and natural under-desk reopening',async()=>{
  await page.mouse.click(piano.initialPiano.x,piano.initialPiano.y);await stable('piano');await page.getByText('Piano: extended',{exact:true}).waitFor();
  await drag(-45,-65);await zoom(180);await shot('03-piano-connection');await reset();
  await page.getByRole('button',{name:'Toggle piano',exact:true}).click();await stable('piano');await page.getByText('Piano: retracted',{exact:true}).waitFor();await shot('04-piano-retracted');await back();await shot('05-underdesk-entry');
  await page.mouse.move(piano.proxy.x,piano.proxy.y);await page.waitForTimeout(200);await page.mouse.click(piano.proxy.x,piano.proxy.y);await stable('piano');await page.getByText('Piano: extended',{exact:true}).waitFor();await shot('06-underdesk-reopened');await back();
 });
 await check('Window slider/weather controls remain isolated and persist through four device visits',async()=>{
  await open('window');await page.getByRole('slider',{name:'Time',exact:true}).fill('18');await page.getByRole('button',{name:'Rainy',exact:true}).click();assert.equal(await page.locator('aside[data-interaction="window"]').count(),1);await back();
  for(const [i,id]of ['monitor','macbook','ipad','phone'].entries()){await open(id);await shot('07-device-'+id);if(i%2){await page.keyboard.press('Escape');await stable(null);}else await back();}
  await open('window');assert.equal(await page.getByRole('slider',{name:'Time',exact:true}).inputValue(),'18');assert.equal(await page.getByRole('button',{name:'Rainy',exact:true}).getAttribute('aria-pressed'),'true');await back();
 });
 await check('Marshall explicit off survives exit/refocus and total-light control remains usable',async()=>{
  await open('marshall');await page.getByRole('button',{name:'Power: On',exact:true}).click();await stable('marshall');await back();await open('monitor');await back();await open('marshall');assert(await page.getByRole('button',{name:'Power: Off',exact:true}).isVisible());await back();
  await open('lightswitch');assert(await page.getByRole('button',{name:'Lights: Off',exact:true}).isVisible());await page.getByRole('button',{name:'Lights: Off',exact:true}).click();await stable('lightswitch');await back();
 });
 await check('Trash lid/hinge opens, reset works, and first outside click only exits',async()=>{
  await open('trashcan');await zoom(1200);await drag(-40,25);await shot('08-trash-hinge');await reset();const p=navigation.outsideInputs[1440].trashcan;await page.mouse.click(p.x,p.y);await stable(null);await shot('09-returned-overview');
 });
 await check('No new content/debug route, source JSON, local approval register or test fixture is downloadable',async()=>{
  for(const route of ['/content/room/projects.json','/docs/content/approved-records.json','/tests/content/fixtures/content.ts','/api/content','/api/content/debug']){const r=await context.request.get(origin+route);assert.equal(r.status(),404,route);const t=await r.text();assert(!t.includes('TEST_ONLY_V07A_SYNTHETIC_NEVER_PUBLISH'));}
  const html=await page.content();assert(!html.includes('TEST_ONLY_V07A_SYNTHETIC_NEVER_PUBLISH'));assert(!html.includes('PRIVATE_DRAFT_SENTINEL'));
 });
 await check('Every loaded GLB byte matches the current protected source',async()=>{
  const hashes=[];for(const response of responses){assert.equal(response.status(),200);const url=new URL(response.url()),bytes=await response.body(),source=await fs.readFile(path.join('public',decodeURIComponent(url.pathname)));assert.equal(createHash('sha256').update(bytes).digest('hex'),createHash('sha256').update(source).digest('hex'));hashes.push({url:url.pathname,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
  assert.equal(new Set(hashes.map(h=>h.url)).size,41);await fs.writeFile(path.join(output,'served-asset-hashes.json'),JSON.stringify(hashes,null,2));
 });
 assert.deepEqual(errors,[]);
}catch(e){failure=String(e.stack);process.exitCode=1;}
finally{
 await context.close();await browser.close();
 const raw=await video.path(),mp4=path.join(output,'room-regression.mp4');
 const convert=spawnSync('/opt/homebrew/bin/ffmpeg',['-n','-i',raw,'-c:v','libx264','-preset','fast','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',mp4],{encoding:'utf8'});
 await fs.writeFile(path.join(output,'results.json'),JSON.stringify({origin,generatedAt:new Date().toISOString(),production:true,nativeInputsOnly:true,pianoEvidence:process.env.ROOM_V07A_PIANO_EVIDENCE,navigationEvidence:process.env.ROOM_V07A_NAV_EVIDENCE,checks,events,errors,failure,video:{raw,mp4,conversionExitCode:convert.status},summary:{passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length}},null,2));
 console.log(`RESULT ${checks.filter(c=>c.passed).length} passed; ${checks.filter(c=>!c.passed).length} failed`);
}
