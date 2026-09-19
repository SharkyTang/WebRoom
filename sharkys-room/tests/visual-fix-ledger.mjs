import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { tsImport } from 'tsx/esm/api';
const root=path.resolve(import.meta.dirname,'..');
const {assetFamilies,assetManifest}=await tsImport('../lib/room/assets/assetManifest.ts',import.meta.url);
const snapshot=JSON.parse(await fs.readFile(path.join(root,'validation/v06-fix/snapshot.json')));
const manifest=JSON.parse(await fs.readFile(path.join(snapshot.directory,'manifest.json')));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function info(bytes){const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));const primitives=doc.meshes.flatMap(m=>m.primitives);return{bytes:bytes.length,triangles:primitives.reduce((n,p)=>n+doc.accessors[p.indices??p.attributes.POSITION].count/3,0),primitives:primitives.length,materials:doc.materials.length,textures:(doc.images??[]).length,sha256:sha(bytes)};}
const assets=[];
for(const id of assetFamilies){
  const definition=assetManifest[id],file=`sharkys-room/public${definition.url}`,current=await fs.readFile(path.join(root,'public',definition.url));
  const after=info(current),original=manifest.files[file];assert(original,file);
  const before=['piano','trashcan'].includes(id)?info(await fs.readFile(path.join(root,`validation/v06-fix/baseline/${id}_v06b.glb`))):after;
  assert.equal(before.sha256,original.sha256,`Unapproved asset modification: ${id}`);
  assets.push({id,url:definition.url,before,after,beforeSHA256:before.sha256,afterSHA256:after.sha256,changed:before.sha256!==after.sha256,delta:Object.fromEntries(['bytes','triangles','primitives','materials','textures'].map(k=>[k,after[k]-before[k]]))});
}
const protectedFiles=[];
for(const [file,record] of Object.entries(manifest.files)){
  if(!file.startsWith('sharkys-room/'))continue;
  const local=file.slice('sharkys-room/'.length);
  const assetInput=/^(assets-source|blender-assets|public)\//.test(local)&&!/(?:\/|^)(piano|trashcan)(?:\/|_)/.test(local);
  const exact=['package.json','package-lock.json','next.config.ts','next-env.d.ts','lib/room/mechanisms.ts','lib/room/cameraAnimation.ts','lib/room/focusViews.ts','lib/room/pianoInteraction.ts','lib/room/frozenSceneManifest.json','lib/room/assets/fixtureRegistry.ts','lib/room/assets/screenTextures.ts','V06C_COLLECTION_SLOT_MAP.md','V06C_LIGHT_FIXTURE_MAPPING.md'].includes(local);
  if(!assetInput&&!exact)continue;
  const current=sha(await fs.readFile(path.join(root,local)));assert.equal(current,record.sha256,`Protected file changed: ${local}`);protectedFiles.push({file:local,sha256:current});
}
assert.equal(assets.length,40);assert.deepEqual(assets.filter(x=>x.changed).map(x=>x.id).sort(),['piano','trashcan']);
const total=field=>Object.fromEntries(['bytes','triangles','primitives','materials','textures'].map(k=>[k,assets.reduce((n,a)=>n+a[field][k],0)]));
const report={at:new Date().toISOString(),snapshot,assets,totals:{before:total('before'),after:total('after'),delta:total('delta')},protectedFiles,protectedFileCount:protectedFiles.length,sourceGLB:manifest.files['sharkys-room/public/models/sharkys_room_blockout_FINAL.glb'],scope:'Only piano and trashcan visual exports/source revised; 38 other families and listed inputs match the complete start snapshot.'};
await fs.writeFile(path.join(root,'validation/v06-fix/resource-ledger.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({protectedFiles:protectedFiles.length,changed:assets.filter(a=>a.changed),totals:report.totals},null,2));
