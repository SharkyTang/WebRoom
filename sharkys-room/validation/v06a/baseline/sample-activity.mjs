import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const output=fileURLToPath(new URL('./',import.meta.url));
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const snap=page=>page.evaluate(()=>window.__ROOM_DEBUG__.snapshot());
const results=[];
for(const viewport of [{width:1440,height:900},{width:390,height:844}]) {
  const touch=viewport.width===390;
  const context=await browser.newContext({viewport,deviceScaleFactor:1,hasTouch:touch,isMobile:touch});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    window.__baselineLoads=[];let previous='';
    const observer=new MutationObserver(()=>{
      const main=document.querySelector('[data-room-status]');if(!main)return;
      const state={room:main.getAttribute('data-room-status'),monitor:main.getAttribute('data-asset-monitor'),macbook:main.getAttribute('data-asset-macbook'),marshall:main.getAttribute('data-asset-marshall')};
      const key=JSON.stringify(state);if(key!==previous){window.__baselineLoads.push({atMs:performance.now(),...state});previous=key;}
    });
    observer.observe(document,{attributes:true,childList:true,subtree:true});
  });
  await page.goto('http://127.0.0.1:3000/?debug=1',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[data-room-status="ready"]',{timeout:60000});
  const hero=(await snap(page)).camera;
  const loads=await page.evaluate(()=>window.__baselineLoads);
  assert(loads.some(s=>s.room==='ready'&&s.monitor==='installed'&&s.macbook==='installed'&&s.marshall==='installed'));
  async function record(label,action) {
    await page.evaluate(()=>{
      window.__baselineFrames=[];window.__baselineSampling=true;
      function sample(){const s=window.__ROOM_DEBUG__.snapshot();window.__baselineFrames.push({atMs:performance.now(),renderFrames:s.renderFrames,phase:s.interaction.interactionPhase,cameraBusy:s.interaction.isCameraBusy,activeObject:s.interaction.activeObject,macbookState:s.interaction.macbookState,pianoState:s.interaction.pianoState});if(window.__baselineSampling)requestAnimationFrame(sample);}
      sample();
    });
    await action();
    const samples=await page.evaluate(()=>{window.__baselineSampling=false;return window.__baselineFrames;});
    const intervals=[];
    const active=s=>s.cameraBusy||['focusing','interacting','returning'].includes(s.phase);
    for(let i=1;i<samples.length;i++){const a=samples[i-1],b=samples[i],frames=b.renderFrames-a.renderFrames,elapsed=b.atMs-a.atMs;if(frames>0&&elapsed>0&&elapsed<250&&active(a)&&active(b))intervals.push(elapsed/frames);}
    assert(intervals.length>0,`${label} must contain real active rendered frames`);
    const sorted=[...intervals].sort((a,b)=>a-b),mean=intervals.reduce((a,b)=>a+b,0)/intervals.length;
    return {label,sampleCount:samples.length,renderedActiveIntervals:intervals.length,observedIntervalMs:{mean,median:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))],max:sorted.at(-1)},samples};
  }
  async function select(id){const p=await page.evaluate(id=>window.__ROOM_DEBUG__.projected()[id],id);assert(p,`Visible ${id} pixel`);if(touch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);await page.waitForSelector('[data-interaction-phase="focused"]',{timeout:15000});assert.equal((await snap(page)).interaction.activeObject,id);}
  async function back(){const b=page.getByRole('button',{name:'Back',exact:true});if(touch)await b.tap();else await b.click();await page.waitForSelector('[data-interaction-phase="idle"]',{timeout:15000});assert.deepEqual((await snap(page)).camera,hero);}
  const actions=[],focus=[];
  for(const id of ['monitor','macbook','marshall','piano']) {
    actions.push(await record(`${id}: Hero to focus and mechanism`,()=>select(id)));
    await page.mouse.move(0,0);await page.waitForTimeout(1500);
    const s=await snap(page);assert.equal(s.assembly.ok,true);
    focus.push({id,camera:s.camera,performance:s.performance,mechanical:s.mechanical});
    actions.push(await record(`${id}: Back including mechanism exit`,back));
  }
  assert.deepEqual(errors,[]);
  results.push({viewport,dpr:1,loadMilestones:loads,firstReadyMs:loads.find(s=>s.room==='ready')?.atMs,allFamiliesInstalledMs:loads.find(s=>s.monitor==='installed'&&s.macbook==='installed'&&s.marshall==='installed')?.atMs,focus,actions,errors});
  await context.close();
}
await browser.close();
await fs.writeFile(path.join(output,'activity-performance.json'),JSON.stringify({recordedAt:new Date().toISOString(),note:'Native mouse/touch actions; read-only per-RAF diagnostic sampler. Existing development ?debug=1 continuous mode; normal demand-stop behavior is independently tested. Observed browser/render-frame intervals include instrumentation and are not isolated GPU/CPU timings. Startup is local warm dev-server navigation with cold browser contexts, not an internet cold-start benchmark. Chrome headless / SwiftShader; no physical phone.',results},null,2)+'\n');
console.log(JSON.stringify(results.map(r=>({viewport:r.viewport,firstReadyMs:r.firstReadyMs,allFamiliesInstalledMs:r.allFamiliesInstalledMs,actions:r.actions.map(a=>({label:a.label,intervalMs:a.observedIntervalMs})),focus:r.focus.map(f=>({id:f.id,performance:f.performance}))})),null,2));
