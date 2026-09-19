import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { Box3, Mesh, Ray, Triangle, Vector3, type Object3D } from 'three';
import { readGeometryGlb } from './helpers/productionGlb';
import { assetManifest, type AssetFamily } from '../lib/room/assets/assetManifest';
import { installAssetFamily, validateAssembly } from '../lib/room/assets/assetAssembly';
import { createPianoSlideFollower } from '../lib/room/pianoSlideFollower';
import { createMechanisms } from '../lib/room/mechanisms';
import { resolveInteraction } from '../lib/room/interactiveObjects';

const exports = new Map<string, Awaited<ReturnType<typeof readGeometryGlb>>>();
before(async () => {
  exports.set('source', await readGeometryGlb(new URL('../public/models/sharkys_room_blockout_FINAL.glb',import.meta.url)));
  for (const id of ['desk','chair','fixtures','piano','trashcan'] as AssetFamily[]) exports.set(id,await readGeometryGlb(new URL(`../public${assetManifest[id].url}`,import.meta.url)));
  exports.set('oldPiano',await readGeometryGlb(new URL('../validation/v06-fix/baseline/piano_v06b.glb',import.meta.url)));
  exports.set('oldTrash',await readGeometryGlb(new URL('../validation/v06-fix/baseline/trashcan_v06b.glb',import.meta.url)));
});
function node(root:Object3D,name:string){const value=root.getObjectByName(name);assert(value,name);return value;}
function meshes(root:Object3D){const list:Mesh[]=[];root.traverse(n=>{if(n instanceof Mesh)list.push(n);});return list;}
function triangles(root:Object3D){
  root.updateWorldMatrix(true,true);const out:Triangle[]=[];
  for(const mesh of meshes(root)){
    const p=mesh.geometry.getAttribute('position'),idx=mesh.geometry.index;
    for(let i=0;i<(idx?.count??p.count);i+=3){const v=(j:number)=>new Vector3().fromBufferAttribute(p,idx?.getX(i+j)??i+j).applyMatrix4(mesh.matrixWorld);out.push(new Triangle(v(0),v(1),v(2)));}
  }return out;
}
function box(root:Object3D){const result=new Box3();for(const t of triangles(root))for(const p of [t.a,t.b,t.c])result.expandByPoint(p);return result;}
function install(ids:AssetFamily[]){const room=exports.get('source')!.scene.clone(true);const owners=ids.map(id=>installAssetFamily(room,id,exports.get(id)!.scene.clone(true)));room.updateMatrixWorld(true);return{room,dispose:()=>owners.reverse().forEach(o=>o.dispose())};}
function triangleRecord(t:Triangle){return{t,box:new Box3().setFromPoints([t.a,t.b,t.c])};}
const edgeRay=new Ray(),edgeDirection=new Vector3(),edgeHit=new Vector3();
function crosses(a:Triangle,b:Triangle){
  for(const [from,to] of [[a.a,a.b],[a.b,a.c],[a.c,a.a]]){
    const length=from.distanceTo(to);if(length<1e-8)continue;
    edgeRay.set(from,edgeDirection.subVectors(to,from).normalize());
    const hit=edgeRay.intersectTriangle(b.a,b.b,b.c,false,edgeHit);
    if(hit && from.distanceTo(hit)>1e-7 && from.distanceTo(hit)<length-1e-7)return true;
  }return false;
}

describe('visual repair actual exported structural connections',()=>{
  it('trash keeps the original continuous hollow shell geometry exactly',()=>{
    for(const old of meshes(node(exports.get('oldTrash')!.scene,'VIS_TrashCanHollowShell'))){
      const current=node(exports.get('trashcan')!.scene,old.name) as Mesh;
      for(const attribute of ['position','normal','uv'])assert.deepEqual(current.geometry.getAttribute(attribute).array,old.geometry.getAttribute(attribute).array);
      assert.deepEqual(current.geometry.index?.array,old.geometry.index?.array);
    }
  });
  it('trash fixed support stays on the body, reaches the original axis, and clears moving lid through 33 angles',()=>{
    const {room,dispose}=install(['trashcan']);const body=node(room,'INT_TrashCanBody'),hinge=node(room,'INT_TrashCanLid');
    const fixed=node(room,'VIS_TrashCanFixedHinge'),knuckle=node(room,'VIS_TrashCanMovingKnuckle');
    const fixedMatrix=fixed.matrixWorld.clone(),pivot=hinge.position.clone(),initial=hinge.quaternion.clone();
    const fixedTriangles=triangles(fixed).map(triangleRecord),bodyTriangles=triangles(node(room,'VIS_TrashCanHollowShell')).map(triangleRecord);
    const bodyOrigin=body.getWorldPosition(new Vector3()),hingeOrigin=hinge.getWorldPosition(new Vector3());
    const corridor=new Box3(new Vector3(-.075,.190,-.207),new Vector3(.075,.257,-.169)).translate(bodyOrigin);
    try{
      assert(corridor.containsBox(box(fixed)),'Fixed support confined to documented rear hinge corridor');
      assert.equal(fixed.parent?.name,'VIS_TrashCanBody');assert.equal(knuckle.parent?.name,'VIS_TrashCanLid');
      const fixedBox=box(fixed);assert(fixedBox.min.y<box(node(room,'VIS_TrashCanHollowShell')).max.y && fixedBox.max.y>hingeOrigin.y,'Support spans rim to original axis');
      for(let step=0;step<=32;step++){
        hinge.rotation.x=-100*Math.PI/180*step/32;room.updateMatrixWorld(true);
        assert(fixed.matrixWorld.equals(fixedMatrix));assert(hinge.position.equals(pivot));
        for(const a of triangles(node(room,'VIS_TrashCanLid')).map(triangleRecord))for(const b of [...fixedTriangles,...bodyTriangles]){
          if(!a.box.intersectsBox(b.box))continue;
          assert(!crosses(a.t,b.t)&&!crosses(b.t,a.t),`Moving lid intersects ${fixedTriangles.includes(b)?'fixed hinge':'body'} at ${step*100/32} degrees: ${JSON.stringify({moving:[a.t.a,a.t.b,a.t.c],fixed:[b.t.a,b.t.b,b.t.c]})}`);
        }
        assert(validateAssembly(room).ok);
      }
    }finally{hinge.quaternion.copy(initial);dispose();}
  });
  it('piano preserves every original body/key/inner-slide geometry buffer',()=>{
    for(const rootName of ['VIS_PianoBody','VIS_PianoSlide'])for(const old of meshes(node(exports.get('oldPiano')!.scene,rootName))){
      const current=node(exports.get('piano')!.scene,old.name) as Mesh;
      for(const attribute of ['position','normal','uv'])assert.deepEqual(current.geometry.getAttribute(attribute).array,old.geometry.getAttribute(attribute).array,old.name+':'+attribute);
      assert.deepEqual(current.geometry.index?.array,old.geometry.index?.array,old.name+':indices');
    }
  });
  it('piano fixed mounting, half-travel follower and overlapping rails clear real desk/chair/strip at 33 poses',()=>{
    const {room,dispose}=install(['desk','chair','fixtures','piano']);const follower=createPianoSlideFollower(room);
    const rail=node(room,'INT_PianoRail'),start=rail.position.z, mount=node(room,'VIS_PianoFixedMount'),middle=node(room,'VIS_PianoMiddleStage');
    const fixed=node(room,'VIS_PianoFixedHardware'),moving=node(room,'VIS_PianoMiddleHardware'),inner=node(room,'VIS_PianoSlide');
    const obstacles=[...triangles(node(room,'VIS_Desk')),...triangles(node(room,'VIS_Chair')),...triangles(node(room,'VIS_FixtureDeskStrip'))];
    const fixedPose=mount.matrixWorld.clone(), underside=box(node(room,'VIS_DeskSolid_0_Top')).min.y;
    try{
      assert.equal(mount.parent?.name,'FUR_Desk');assert.equal(resolveInteraction(fixed),'piano');assert.equal(resolveInteraction(moving),'piano');
      assert(Math.abs(underside-box(fixed).max.y-.00035)<.00001,'Mount reaches the actual underside within 0.35mm');
      for(let step=0;step<=32;step++){
        rail.position.z=start-.65+.65*step/32;follower.update();room.updateMatrixWorld(true);
        assert.equal(middle.position.z,(rail.position.z-start)/2);assert(mount.matrixWorld.equals(fixedPose));
        const a=box(fixed),b=box(moving),c=box(inner);
        assert(Math.min(a.max.z,b.max.z)-Math.max(a.min.z,b.min.z)>=.0849,'Outer/middle overlap >=85mm');
        assert(Math.min(b.max.z,c.max.z)-Math.max(b.min.z,c.min.z)>=.0569,'Middle/inner overlap >=57mm');
        for(const name of ['VIS_PianoFixedHardware','VIS_PianoMiddleHardware','VIS_PianoBody','VIS_PianoSlide']){
          const interior=box(node(room,name)).expandByScalar(-.000001);
          assert.equal(obstacles.filter(t=>interior.intersectsTriangle(t)).length,0,`${name} intersects obstacle at ${step}/32`);
        }
        assert(underside-box(node(room,'VIS_PianoBody')).max.y>=.01599);
        assert(validateAssembly(room).ok,JSON.stringify(validateAssembly(room).errors));
      }
    }finally{rail.position.z=start;follower.dispose();dispose();}
  });
  it('piano follower retains exact endpoints and original Back behavior for twenty cycles',async()=>{
    const {room,dispose}=install(['piano']), follower=createPianoSlideFollower(room),controller=createMechanisms(room,()=>follower.update());
    try{
      for(let i=0;i<20;i++){
        await controller.toggle('piano',true);assert(Math.abs(node(room,'VIS_PianoMiddleStage').position.z+.65/2)<1e-12);
        await controller.exit('piano',true);assert(Math.abs(node(room,'VIS_PianoMiddleStage').position.z+.65/2)<1e-12);
        await controller.toggle('piano',true);assert.equal(node(room,'VIS_PianoMiddleStage').position.z,0);
      }
    }finally{controller.dispose();follower.dispose();dispose();}
  });
});
