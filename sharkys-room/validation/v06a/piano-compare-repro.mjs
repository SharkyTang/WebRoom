import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const {PNG}=createRequire(import.meta.url)(path.join(root,'node_modules/playwright-core/lib/utilsBundle.js'));
const noAA=process.env.ROOM_REPRO_NO_AA==='1';
const contextNoAA=process.env.ROOM_REPRO_CONTEXT_NO_AA==='1';
const withMask=process.env.ROOM_REPRO_MASK==='1';
const run=process.env.ROOM_REPRO_RUN??'';
if(!/^[a-z0-9-]*$/.test(run))throw new Error('ROOM_REPRO_RUN must be a simple artifact suffix');
const out=path.join(root,'validation/v06a/piano-compare-repro'+(run?'-'+run:withMask?'-mask':contextNoAA?'-forced-no-aa':noAA?'-no-aa':''));
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',...(noAA?['--disable-gl-multisampling']:[])]});
const result={origin:'http://127.0.0.1:3000',noAA,contextNoAA,errors:[],pairs:[],states:{}};
let mask=new Set();
const snapshot=p=>p.evaluate(()=>window.__ROOM_DEBUG__?.snapshot()??null);
const settle=p=>p.waitForSelector('[data-interaction-phase="focused"]');
async function open(debug){
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
 if(contextNoAA)await context.addInitScript(()=>{
  const getContext=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(type,attributes){return getContext.call(this,type,type==='webgl2'||type==='webgl'?{...attributes,antialias:false}:attributes);};
 });
 const page=await context.newPage();
 page.on('pageerror',e=>result.errors.push(e.message));
 await page.goto(result.origin+(debug?'/?debug=1&demand=1':'/'),{waitUntil:'domcontentloaded'});
 await page.waitForSelector('[data-room-status="ready"]',{timeout:60000});
 await page.mouse.move(0,0);
 await page.waitForTimeout(350);
 result.states[debug?'debugGL':'normalGL']=await page.evaluate(()=>{const gl=document.querySelector('canvas').getContext('webgl2');return {attributes:gl.getContextAttributes(),samples:gl.getParameter(gl.SAMPLES),depthBits:gl.getParameter(gl.DEPTH_BITS)}});
 return page;
}
function pixels(a,b){
 const pa=PNG.sync.read(a),pb=PNG.sync.read(b);
 const diff=new PNG({width:pa.width,height:pa.height});
 let count=0,maxDelta=0,totalDelta=0,entryChanges=0;const box=[pa.width,pa.height,-1,-1],tiles={};
 for(let i=0;i<pa.data.length;i+=4){
  const x=(i/4)%pa.width,y=Math.floor(i/4/pa.width);
  let change=0;for(let c=0;c<4;c++)change=Math.max(change,Math.abs(pa.data[i+c]-pb.data[i+c]));
  if(change){count++;if(mask.has(y*pa.width+x))entryChanges++;maxDelta=Math.max(maxDelta,change);totalDelta+=change;box[0]=Math.min(box[0],x);box[1]=Math.min(box[1],y);box[2]=Math.max(box[2],x);box[3]=Math.max(box[3],y);const tile=`${Math.floor(x/100)},${Math.floor(y/100)}`;tiles[tile]=(tiles[tile]??0)+1;}
  const shade=Math.round((pa.data[i]+pa.data[i+1]+pa.data[i+2])/12);
  diff.data[i]=change?255:shade;diff.data[i+1]=change?0:shade;diff.data[i+2]=change?0:shade;diff.data[i+3]=255;
 }
 return {metrics:{pngBytesEqual:a.equals(b),rgbaEqual:count===0,width:pa.width,height:pa.height,changedPixels:count,maxChannelDelta:maxDelta,entryChanges,entryPixels:mask.size,meanChangedMaxDelta:count?totalDelta/count:0,bounds:count?box:null,tiles},diff:PNG.sync.write(diff)};
}
async function pair(debug,normal,name){
 await debug.mouse.move(0,0);await normal.mouse.move(0,0);
 for(const page of [debug,normal])await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const a=await debug.locator('canvas').screenshot({style:'.debug-panel { visibility: hidden !important; }'});
 const b=await normal.locator('canvas').screenshot();
 await fs.writeFile(path.join(out,name+'-debug.png'),a);await fs.writeFile(path.join(out,name+'-normal.png'),b);
 const stats=pixels(a,b);await fs.writeFile(path.join(out,name+'-diff.png'),stats.diff);
 result.pairs.push({name,...stats.metrics});
 result.states[name]={debug:await snapshot(debug),normal:await normal.evaluate(()=>({debug:!!window.__ROOM_DEBUG__,phase:document.querySelector('main').dataset.interactionPhase,footer:document.querySelector('.page-footer').innerText,canvas:document.querySelector('canvas').getBoundingClientRect().toJSON()}))};
 console.log(name,stats.metrics);
}
async function retract(page,point){
 await page.mouse.click(point.x,point.y);await settle(page);
 await page.getByRole('button',{name:'Toggle piano',exact:true}).click();await settle(page);
 await page.getByText('Piano: retracted',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Back',exact:true}).click();
 await page.waitForSelector('[data-interaction-phase="idle"]');await page.mouse.move(0,0);
}
try{
 const debug=await open(true),normal=await open(false);
 const point=await debug.evaluate(()=>window.__ROOM_DEBUG__.projected().piano);
 result.initialPoint=point;
 await pair(debug,normal,'initial');
 await retract(debug,point);await retract(normal,point);
 if(withMask){const data=await debug.evaluate(()=>{const r=document.querySelector('canvas').getBoundingClientRect(), pixels=[];for(let y=285;y<=361;y++)for(let x=504;x<=635;x++)if(window.__ROOM_DEBUG__.hitTest(r.x+x+.5,r.y+y+.5)?.runtimeTarget==='PianoRetractedHitArea')pixels.push(y*1080+x);return {pixels,probe531323:window.__ROOM_DEBUG__.hitTest(r.x+531.5,r.y+323.5)}});mask=new Set(data.pixels);result.entryMask=data;}
 await pair(debug,normal,'retracted-native');
 await debug.waitForTimeout(1000);await normal.waitForTimeout(1000);
 await pair(debug,normal,'retracted-delayed');
 const points=await debug.evaluate(()=>window.__ROOM_DEBUG__.projected());
 for(const [id,p] of Object.entries(points)){if(id.startsWith('__'))continue;await debug.mouse.move(p.x,p.y);await debug.waitForTimeout(100);}
 await debug.mouse.move(0,0);await debug.waitForTimeout(350);
 await pair(debug,normal,'after-semantic-hovers');
}catch(error){result.failure=String(error.stack??error);console.log(result.failure);process.exitCode=1;}
finally{await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');}
