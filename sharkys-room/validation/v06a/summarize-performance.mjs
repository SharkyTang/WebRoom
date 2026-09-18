import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const directory=new URL('./',import.meta.url);
const read=async name=>JSON.parse(await fs.readFile(new URL(name,directory),'utf8'));
const result=await read('furniture-performance.json');
assert.equal(result.summary.failed,0);
const baseline=await read('baseline/hero-performance.json');
const baselineActivity=await read('baseline/activity-performance.json');
const round=value=>Number(value.toFixed(2));
const sums=resources=>Object.fromEntries(['encodedBodySize','transferSize','decodedBodySize'].map(key=>[key,resources.reduce((total,item)=>total+item[key],0)]));
const samples=result.observations.performance.map(sample=>{
 const old=baseline.samples.find(s=>s.viewport.width===sample.viewport.width),oldActivity=baselineActivity.results.find(s=>s.viewport.width===sample.viewport.width);
 return {viewport:sample.viewport,canvas:sample.environment.canvas,baseline:old.snapshot.performance,current:sample.current,addedCalls:sample.addedCalls,intervalDeltaMs:sample.intervalDeltaMs,firstReadyMs:sample.firstReadyMs,allNineteenInstalledMs:sample.allFamiliesInstalledMs,baselineFirstReadyMs:oldActivity?.firstReadyMs??null,baselineAllThreeInstalledMs:oldActivity?.allFamiliesInstalledMs??null,network:sums(sample.environment.resources),baselineNetwork:sums(old.environment.resourceEntries),modelRequestCount:sample.environment.resources.length,rendererMemory:sample.resources.rendererMemory,textureLedger:sample.textureLedger};
});
for(const group of result.observations.activity)for(const focus of group.focus)assert.deepEqual(focus.camera,baselineActivity.results.find(old=>old.viewport.width===group.viewport.width).focus.find(old=>old.id===focus.id).camera,`Focus camera changed: ${group.viewport.width}/${focus.id}`);
const activity=result.observations.activity.map(group=>({viewport:group.viewport,actions:group.actions.map(action=>({label:action.label,baseline:group.baselineActions.find(a=>a.label===action.label).observedIntervalMs,current:action.observedIntervalMs})),focus:group.focus.map(focus=>({id:focus.id,baseline:group.baselineFocus.find(f=>f.id===focus.id).performance,current:focus.performance}))}));
const fallbacks=result.observations.fallbackTimings.map(timing=>({family:timing.family,kind:timing.kind,firstFallbackMs:timing.failedNavigation.firstFallbackMs,firstReadyMs:timing.failedNavigation.firstReadyMs,retryAllInstalledMs:timing.retryNavigation.allNineteenInstalledMs,retryReadyMs:timing.retryNavigation.firstReadyMs,fallbackVisualMeshes:timing.fallbackVisualMeshes,otherFamilies:timing.otherInstalledFamilies.length,retryFamilies:timing.retryInstalledFamilies.length}));
const modelFileBytes=result.observations.modelFiles.reduce((total,file)=>total+file.bytes,0);
const embeddedImages=[];
for(const file of result.observations.modelFiles){
 const bytes=await fs.readFile(new URL(`../../public${file.url}`,directory)),jsonLength=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.toString('utf8',20,20+jsonLength)),binaryStart=20+jsonLength+8;
 for(const image of gltf.images??[]){assert(image.bufferView!==undefined,'External model image needs separate network accounting');const view=gltf.bufferViews[image.bufferView],data=bytes.subarray(binaryStart+(view.byteOffset??0),binaryStart+(view.byteOffset??0)+view.byteLength);embeddedImages.push({model:file.url,name:image.name??null,mimeType:image.mimeType,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});}
}
const uniqueImages=new Map(embeddedImages.map(image=>[image.sha256,image]));
const embeddedImageBytes=embeddedImages.reduce((sum,image)=>sum+image.bytes,0);
const modelBreakdown={embeddedImages,embeddedImageCount:embeddedImages.length,embeddedImageBytes,uniqueEncodedImageContents:uniqueImages.size,uniqueEncodedImageBytes:[...uniqueImages.values()].reduce((sum,image)=>sum+image.bytes,0),nonImageGLBBytes:modelFileBytes-embeddedImageBytes,note:'Raw GLB byte split. Non-image remainder includes geometry, JSON, materials, hierarchy, padding and container data; it is not geometry alone. Same embedded image content in different GLBs is counted in actual delivered bytes, even if its source-content ledger deduplicates.'};
const compact={generatedAt:result.generatedAt,summary:result.summary,samples,activity,fallbacks,modelFileBytes,modelBreakdown,limits:result.measurementLimits};
await fs.writeFile(new URL('performance-summary.json',directory),JSON.stringify(compact,null,2)+'\n');
const output=['# v0.6A isolated performance comparison','',`Recorded ${result.generatedAt}. Installed Chrome headless, ANGLE SwiftShader, DPR 1. Same fixed Hero and read-only continuous sampler as the fresh v0.5 baseline. The other coordinated Chrome and Blender jobs had finished before this run.`, '',
'## Hero and loading','',
'| Viewport | Calls v0.5 → A | Triangles v0.5 → A | Frame interval ms v0.5 → A | First ready ms | All 19 installed ms |','| --- | --- | --- | --- | --- | --- |',
...samples.map(s=>`| ${s.viewport.width}×${s.viewport.height} | ${s.baseline.calls} → ${s.current.calls} | ${s.baseline.triangles} → ${s.current.triangles} | ${round(s.baseline.frameMs)} → ${round(s.current.frameMs)} | ${round(s.firstReadyMs)} | ${round(s.allNineteenInstalledMs)} |`),'',
'Frame interval is the existing sampler interval, not an isolated GPU/CPU duration. Startup is local warm-server navigation in a fresh browser context, not internet cold-start time. Baseline readiness was separately measured only for desktop and mobile; no earlier 768px readiness number is invented.','',
'## Model network resources','',
'| Viewport | Requests | Encoded body bytes | Transfer bytes including headers | Decoded body bytes |','| --- | --- | --- | --- | --- |',
...samples.map(s=>`| ${s.viewport.width} | ${s.modelRequestCount} | ${s.network.encodedBodySize} | ${s.network.transferSize} | ${s.network.decodedBodySize} |`),'',
`Baseline model network: ${samples[0].baselineNetwork.encodedBodySize} encoded bytes; ${samples[0].baselineNetwork.transferSize} transfer bytes; ${samples[0].baselineNetwork.decodedBodySize} decoded bytes across four model requests. Current file ledger: ${modelFileBytes} bytes across twenty GLBs. These totals cover model requests, not the page's JavaScript/CSS. Embedded images are already part of those GLBs and are not added twice.`, '',
`Raw GLB split: ${embeddedImageBytes} embedded-image bytes plus ${modelBreakdown.nonImageGLBBytes} bytes of geometry/JSON/material/hierarchy/container data. ${embeddedImages.length} image embeddings contain ${uniqueImages.size} distinct byte-identical contents totaling ${modelBreakdown.uniqueEncodedImageBytes} unique source-image bytes. Repeated embeddings still consume delivered bytes and may own separate runtime textures; this source-content deduplication is not network or GPU sharing. HTTP compression is measured for the complete GLB responses above, so no invented compressed geometry-versus-texture split is reported.`, '',
'## Texture and renderer counters','',
'| Viewport | Business texture UUIDs | Estimated mipmapped RGBA bytes | Renderer geometries | Renderer textures |','| --- | --- | --- | --- | --- |',
...samples.map(s=>`| ${s.viewport.width} | ${s.textureLedger.uniqueTextureUuids} | ${s.textureLedger.estimatedUniqueRGBABytesWithMipmaps} | ${s.rendererMemory.geometries} | ${s.rendererMemory.textures} |`),'',
'Business UUIDs deduplicate the texture objects observed under registered production assets. Equal filenames across GLBs do not establish sharing. rendererMemory is Three.js live allocation counting, which can include resources outside those asset groups; it is a separate measure. Mipmapped RGBA bytes are a dimensional estimate, not measured GPU memory. No physical GPU, phone or Safari test is claimed.','',
'## Focus render counters','',
'| Viewport | Focus | Calls v0.5 → A | Triangles v0.5 → A | Interval ms v0.5 → A |','| --- | --- | --- | --- | --- |',
...activity.flatMap(group=>group.focus.map(f=>`| ${group.viewport.width} | ${f.id} | ${f.baseline.calls} → ${f.current.calls} | ${f.baseline.triangles} → ${f.current.triangles} | ${round(f.baseline.frameMs)} → ${round(f.current.frameMs)} |`)),'',
'Every recorded focus camera was compared component-by-component with the same-viewport baseline and matched exactly.','',
'## Native action intervals','',
'| Viewport | Action | Mean ms v0.5 → A | p95 ms v0.5 → A |','| --- | --- | --- | --- |',
...activity.flatMap(g=>g.actions.map(a=>`| ${g.viewport.width} | ${a.label} | ${round(a.baseline.mean)} → ${round(a.current.mean)} | ${round(a.baseline.p95)} → ${round(a.current.p95)} |`)),'',
'Actions use native mouse/touch and Back; a read-only per-animation-frame observer uses the same filtering method as the baseline. Its overhead is included, so these are observed interaction intervals rather than isolated render costs.','',
'## Representative failure and recovery times','',
'| Family / fault | First fallback ms | Room ready ms | Retry all 19 installed ms | Retry room ready ms | Atomic fallback / recovered |','| --- | --- | --- | --- | --- | --- |',
...fallbacks.map(f=>`| ${f.family} / ${f.kind} | ${round(f.firstFallbackMs)} | ${round(f.firstReadyMs)} | ${round(f.retryAllInstalledMs)} | ${round(f.retryReadyMs)} | ${f.fallbackVisualMeshes} family VIS, ${f.otherFamilies} others / ${f.retryFamilies} restored |`),'',
'Failure and refresh timings use performance.now within their separately recorded navigation time origins. They observe the DOM asset reports, not the moment the HTTP/decode error was first detected internally. Recovery uses the actual refresh button; injected fallback is not formal asset installation. Local warm service, not internet latency.',''];
await fs.writeFile(new URL('PERFORMANCE_COMPARISON.md',directory),output.join('\n'));
console.log(JSON.stringify({summary:compact.summary,samples:samples.map(({viewport,baseline,current,firstReadyMs,allNineteenInstalledMs,network,rendererMemory,textureLedger})=>({viewport,baseline,current,firstReadyMs,allNineteenInstalledMs,network,rendererMemory,textureUUIDs:textureLedger.uniqueTextureUuids,estimatedTextureBytes:textureLedger.estimatedUniqueRGBABytesWithMipmaps})),fallbacks,modelFileBytes},null,2));
