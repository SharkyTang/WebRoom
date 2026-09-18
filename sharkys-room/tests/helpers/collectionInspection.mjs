/** TEST ONLY. Creates/synchronizes an isolated Next preview; never patches product sources. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const markerName = '.v06c-inspection-preview.json';
const sourceDirectories = ['app', 'components', 'lib', 'types'];
const sourceFiles = ['package.json', 'package-lock.json', 'tsconfig.json', 'next-env.d.ts', 'next.config.ts', 'next.config.mjs', 'postcss.config.mjs', 'eslint.config.mjs'];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
async function exists(file) { return fs.access(file).then(() => true, () => false); }
async function linkTree(source, destination) {
  const stat = await fs.lstat(source);
  if (stat.isSymbolicLink()) { await fs.symlink(await fs.readlink(source), destination); return; }
  if (stat.isDirectory()) { await fs.mkdir(destination); for (const item of await fs.readdir(source)) await linkTree(path.join(source, item), path.join(destination, item)); return; }
  await fs.link(source, destination);
}
export function patchBridge(original) {
  const importNeedle = "import { PerspectiveCamera, type Group } from 'three';";
  const hookNeedle = '    window.__ROOM_DEBUG__=api;return()=>{if(window.__ROOM_DEBUG__===api)delete window.__ROOM_DEBUG__;};';
  assert(original.includes(importNeedle) && original.includes(hookNeedle), 'DebugBridge changed: inspect patch anchors instead of silently applying an incompatible helper');
  return original.replace(importNeedle, "import { Box3, Light, Mesh, MeshStandardMaterial, PerspectiveCamera, Vector3, type Group } from 'three';").replace(hookNeedle, `    // TEST-ONLY inspection API, injected into an isolated source copy by the test helper.
    let saved: {position:number[];quaternion:number[];fov:number}|null=null;
    const inspection={
      testOnly:true,
      setView:(view:{position:number[];target:number[];fov?:number})=>{
        const state=get(),camera=state.camera;
        if(!(camera instanceof PerspectiveCamera))throw new Error('Perspective camera required');
        if(latest.current.store.getSnapshot().activeObject)throw new Error('Inspection requires idle Hero before changing camera');
        if(![...view.position,...view.target].every(Number.isFinite)||view.position.length!==3||view.target.length!==3)throw new Error('Finite xyz vectors required');
        if(!saved)saved={position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov};
        camera.position.fromArray(view.position);camera.lookAt(new Vector3().fromArray(view.target));
        if(view.fov!==undefined){if(!(view.fov>0&&view.fov<120))throw new Error('Invalid inspection FOV');camera.fov=view.fov;}
        camera.updateProjectionMatrix();camera.updateMatrixWorld(true);state.invalidate();return api.snapshot().camera;
      },
      restoreView:()=>{const state=get(),camera=state.camera;if(saved&&camera instanceof PerspectiveCamera){camera.position.fromArray(saved.position);camera.quaternion.fromArray(saved.quaternion);camera.fov=saved.fov;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);state.invalidate();saved=null;}return api.snapshot().camera;},
      snapshot:()=>{
        const state=get();state.scene.updateMatrixWorld(true);
        const nodes:unknown[]=[],lights:unknown[]=[];
        state.scene.traverse(node=>{
          if(node instanceof Light)lights.push({name:node.name,type:node.type,intensity:node.intensity,color:node.color.getHexString(),position:node.getWorldPosition(new Vector3()).toArray()});
          if(!(node instanceof Mesh)&&!node.name.startsWith('VIS_')&&!node.name.startsWith('DSP_')&&!node.name.startsWith('DEC_')&&!node.name.startsWith('FUR_'))return;
          const box=new Box3().setFromObject(node);
          nodes.push({name:node.name,type:node.type,parent:node.parent?.name??null,ancestors:(()=>{const names:string[]=[];for(let parent=node.parent;parent;parent=parent.parent)names.push(parent.name);return names;})(),family:node.userData.roomAssetFamily??null,visible:node.visible,position:node.getWorldPosition(new Vector3()).toArray(),matrixWorld:node.matrixWorld.toArray(),bounds:box.isEmpty()?null:{min:box.min.toArray(),max:box.max.toArray(),size:box.getSize(new Vector3()).toArray()},materials:node instanceof Mesh?(Array.isArray(node.material)?node.material:[node.material]).map(material=>({uuid:material.uuid,name:material.name,color:material instanceof MeshStandardMaterial?material.color.getHexString():null,emissive:material instanceof MeshStandardMaterial?material.emissive.getHexString():null,emissiveIntensity:material instanceof MeshStandardMaterial?material.emissiveIntensity:null})):[]});
        });return {testOnly:true,camera:api.snapshot().camera,nodes,lights};
      }
    };
    const inspectionWindow=window as unknown as {__ROOM_INSPECTION__?:typeof inspection};
    window.__ROOM_DEBUG__=api;inspectionWindow.__ROOM_INSPECTION__=inspection;
    return()=>{if(window.__ROOM_DEBUG__===api)delete window.__ROOM_DEBUG__;if(inspectionWindow.__ROOM_INSPECTION__===inspection)delete inspectionWindow.__ROOM_INSPECTION__;};`);
}
export async function prepareInspectionPreview(destination, { sync = false } = {}) {
  const target = path.resolve(destination), source = await fs.realpath(sourceRoot);
  assert(target !== source && !target.startsWith(source + path.sep), 'Inspection preview must be outside the product repository');
  const markerPath = path.join(target, markerName);
  if (sync) {
    const previous = JSON.parse(await fs.readFile(markerPath, 'utf8'));
    assert.equal(previous.sourceRoot, source, 'Only synchronize a preview created for this exact product repository');
  } else {
    assert(!(await exists(target)), `Refusing to overwrite an existing directory: ${target}`);
    await fs.mkdir(target, { recursive: true });
  }
  const originalBridge = await fs.readFile(path.join(source, 'components/room/DebugBridge.tsx'), 'utf8');
  for (const name of sourceDirectories) if (await exists(path.join(source, name))) await fs.cp(path.join(source, name), path.join(target, name), { recursive: true, force: true });
  for (const name of sourceFiles) if (await exists(path.join(source, name))) await fs.copyFile(path.join(source, name), path.join(target, name));
  if (!sync) {
    // Dependencies are reused without installation. Never run package install/update in this copy.
    await linkTree(path.join(source, 'node_modules'), path.join(target, 'node_modules'));
    await fs.symlink(path.join(source, 'public'), path.join(target, 'public'), 'dir');
  }
  await fs.writeFile(path.join(target, 'components/room/DebugBridge.tsx'), patchBridge(originalBridge));
  assert.equal(await fs.readFile(path.join(source, 'components/room/DebugBridge.tsx'), 'utf8'), originalBridge, 'Product DebugBridge must remain untouched');
  const report = { testOnly: true, generatedAt: new Date().toISOString(), sourceRoot: source, target, sourceBridgeSha256: digest(originalBridge), publicAccess: 'Symlink to current product public files, used read-only by preview. Do not build assets or install dependencies in this preview.', dependencies: 'Hardlinked installed files; no package install or dependency modifications.', synchronization: 'Stop preview, run sync, restart. public assets are shared read-only; source/manifest changes require sync.', command: `cd '${target.replaceAll("'", "'\\''")}' && npm run dev -- --port 3003`, limitation: 'Test camera/inspection evidence supplements, never replaces, normal production acceptance.' };
  await fs.writeFile(markerPath, JSON.stringify(report, null, 2) + '\n');
  return report;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, destination] = process.argv.slice(2);
  assert(['create', 'sync'].includes(mode) && destination, 'Usage: node tests/helpers/collectionInspection.mjs create|sync /private/tmp/unique-inspection-preview');
  console.log(JSON.stringify(await prepareInspectionPreview(destination, { sync: mode === 'sync' }), null, 2));
}
