import { Mesh, Raycaster, Vector2, Vector3, type Camera, type Object3D } from 'three';
import { interactionIds, resolveInteraction, type InteractionId } from './interactiveObjects';
export type HitPoint={x:number;y:number};
export type VisibleHitPoints=Partial<Record<InteractionId|'__noninteractive',HitPoint>>;
/** Read-only test aid: each CSS point raycasts to the nearest active semantic target. */
export function visibleHitPoints(scene:Object3D,camera:Camera,canvas:HTMLCanvasElement):VisibleHitPoints {
  scene.updateWorldMatrix(true,true); camera.updateMatrixWorld();
  const rect=canvas.getBoundingClientRect(); const meshes:Mesh[]=[];
  scene.traverse(object=>{if(object instanceof Mesh) meshes.push(object);});
  const ray=new Raycaster();const ndc=new Vector2();const a=new Vector3();const b=new Vector3();const c=new Vector3();
  const result:VisibleHitPoints={};
  const desired=[...interactionIds,'__noninteractive'] as const;
  for(const id of desired) {
    const candidates:{x:number;y:number;area:number}[]=[];
    for(const mesh of meshes.filter(mesh=>(resolveInteraction(mesh)??'__noninteractive')===id)) {
      const geometry=mesh.geometry; const positions=geometry.attributes.position; const index=geometry.index;
      const count=index?.count??positions.count;
      for(let i=0;i<count;i+=3) {
        a.fromBufferAttribute(positions,index?index.getX(i):i).applyMatrix4(mesh.matrixWorld).project(camera);
        b.fromBufferAttribute(positions,index?index.getX(i+1):i+1).applyMatrix4(mesh.matrixWorld).project(camera);
        c.fromBufferAttribute(positions,index?index.getX(i+2):i+2).applyMatrix4(mesh.matrixWorld).project(camera);
        const x=(a.x+b.x+c.x)/3;const y=(a.y+b.y+c.y)/3;const z=(a.z+b.z+c.z)/3;
        if(Math.abs(x)>=.99||Math.abs(y)>=.99||z< -1||z>1) continue;
        candidates.push({x:rect.x+(x+1)/2*rect.width,y:rect.y+(1-y)/2*rect.height,area:Math.abs((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x))});
      }
    }
    candidates.sort((a,b)=>b.area-a.area);
    search:for(const candidate of candidates) {
      // Touch coordinates are quantized by browsers; verify the rounded pixel, not a subpixel sliver.
      for(const x of [Math.round(candidate.x),Math.floor(candidate.x),Math.ceil(candidate.x)]) for(const y of [Math.round(candidate.y),Math.floor(candidate.y),Math.ceil(candidate.y)]) {
        if(document.elementFromPoint(x,y)!==canvas) continue;
        ndc.set((x-rect.x)/rect.width*2-1,1-(y-rect.y)/rect.height*2);ray.setFromCamera(ndc,camera);
        const hit=ray.intersectObjects(meshes,false)[0];
        if(hit&&(resolveInteraction(hit.object)??'__noninteractive')===id) {result[id]={x,y};break search;}
      }
    }
  }
  return result;
}
