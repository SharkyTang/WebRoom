/** Read actual exported bytes; record single-sided winding/closure and source envelopes. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=(p)=>JSON.parse(fs.readFileSync(path.join(project,p),'utf8'));
const source=read('validation/v06a/planning/frozen-space-contract.json');
const solids=read('validation/v06a/planning/blender-solid-components.json');
const families=['floor','desk','walls','door','window','curtains','cabinet'];
const tolerance=1e-6;
const subtract=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const within=(v,b)=>v.every((x,i)=>x>=b.min[i]-tolerance&&x<=b.max[i]+tolerance);
const report={scope:'Actual v0.6A architecture GLB bytes; no asset mutation',toleranceMetres:tolerance,families:{}};

for(const family of families){
  const data=fs.readFileSync(path.join(project,`public/models/production/${family}_v06a.glb`));
  const jsonLength=data.readUInt32LE(12),doc=JSON.parse(data.subarray(20,20+jsonLength));
  const bin=data.subarray(20+jsonLength+8);
  function attribute(id){
    const a=doc.accessors[id],v=doc.bufferViews[a.bufferView];
    const width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],bytes={5126:4,5125:4,5123:2,5121:1}[a.componentType];
    const start=(v.byteOffset||0)+(a.byteOffset||0),stride=v.byteStride||width*bytes;
    const reader={5126:'readFloatLE',5125:'readUInt32LE',5123:'readUInt16LE',5121:'readUInt8'}[a.componentType];
    return Array.from({length:a.count},(_,i)=>Array.from({length:width},(_,c)=>bin[reader](start+i*stride+c*bytes)));
  }
  const objects=new Map(doc.nodes.map((n,i)=>[i,{...n,index:i}]));
  function descendantPrimitives(index){
    const n=objects.get(index);return [...(n.mesh===undefined?[]:doc.meshes[n.mesh].primitives.map(p=>({node:n.name,primitive:p}))),...(n.children||[]).flatMap(descendantPrimitives)];
  }
  const errors=[],primitiveResults=[],envelopes=[];
  for(const n of doc.nodes){
    if(n.matrix||n.translation?.some(v=>Math.abs(v)>tolerance)||n.rotation?.some((v,i)=>Math.abs(v-(i===3?1:0))>tolerance)||n.scale?.some(v=>Math.abs(v-1)>tolerance))errors.push(`Non-identity node: ${n.name}`);
  }
  if(doc.materials.some(m=>m.doubleSided===true))errors.push('Unnecessary double-sided material');
  for(const index of doc.scenes[doc.scene||0].nodes){
    const n=objects.get(index),anchor=n.extras.v06a_anchor,bounds=source.assets[anchor].localBounds;
    let vertices=0;
    for(const {node,primitive:p} of descendantPrimitives(index)){
      const positions=attribute(p.attributes.POSITION),normals=attribute(p.attributes.NORMAL),uv=attribute(p.attributes.TEXCOORD_0);
      const indices=p.indices===undefined?positions.map((_,i)=>i):attribute(p.indices).flat();
      let signedVolume=0,normalDisagreements=0,degenerate=0,topTriangles=0,badTopTriangles=0;
      const edges=new Map();
      const key=(p)=>p.map(v=>Math.round(v/1e-7)).join(',');
      for(const v of positions){vertices++;if(!within(v,bounds))errors.push(`${node} exceeds ${anchor} envelope`);if(family==='floor'&&v[0]+v[2]>4.6+tolerance)errors.push(`${node} crosses cutaway`);}
      for(let i=0;i<indices.length;i+=3){
        const ids=indices.slice(i,i+3),ps=ids.map(j=>positions[j]),[a,b,c]=ps;
        const normal=cross(subtract(b,a),subtract(c,a)),areaSquared=dot(normal,normal);
        if(areaSquared<1e-24){degenerate++;continue;}
        signedVolume+=dot(a,cross(b,c))/6;
        if(ids.some(j=>dot(normal,normals[j]) < -Math.sqrt(areaSquared)*1e-5))normalDisagreements++;
        if(family==='floor'&&ps.every(v=>Math.abs(v[1])<1e-7)){topTriangles++;if(normal[1]<=0)badTopTriangles++;}
        if(family==='walls'||family==='window'){
          const original=solids.objects[anchor].components;
          if(!original.some(component=>ps.every(v=>within(v,component.localBoundsWeb))))errors.push(`${node} triangle leaves original solid union`);
        }
        for(let k=0;k<3;k++){const a=key(ps[k]),b=key(ps[(k+1)%3]);if(a===b)continue;const ordered=a<b,[lo,hi]=ordered?[a,b]:[b,a],ek=lo+'|'+hi;const value=edges.get(ek)||{count:0,direction:0};value.count++;value.direction+=ordered?1:-1;edges.set(ek,value);}
      }
      const openEdges=[...edges.values()].filter(e=>e.count===1).length;
      const inconsistentEdges=[...edges.values()].filter(e=>e.direction!==0).length;
      if(signedVolume<=0)errors.push(`${node} has nonpositive signed volume`);
      if(openEdges||inconsistentEdges)errors.push(`${node} has open/inconsistent edges`);
      if(badTopTriangles)errors.push(`${node} has inverted top triangles`);
      if(normalDisagreements)errors.push(`${node} has normals pointing behind a triangle`);
      if(uv.length!==positions.length)errors.push(`${node} UV count mismatch`);
      primitiveResults.push({node,triangles:indices.length/3,signedVolume,openEdges,inconsistentEdges,normalDisagreements,degenerateTriangles:degenerate,topTriangles,badTopTriangles});
    }
    envelopes.push({root:n.name,anchor,checkedVertices:vertices,insideSourceEnvelope:true});
  }
  let sourceComponentCount=0;
  for(const [index,n]of objects){
    if(n.extras?.sourceComponentIndex===undefined)continue;
    sourceComponentCount++;
    const anchor=n.extras.v06a_anchor;
    const original=solids.objects[anchor].components[n.extras.sourceComponentIndex].localBoundsWeb;
    for(const {node,primitive:p}of descendantPrimitives(index))for(const vertex of attribute(p.attributes.POSITION))if(!within(vertex,original))errors.push(`${node} leaves original component ${n.extras.sourceComponentIndex}`);
  }
  report.families[family]={singleSided:true,sourceComponentCount,envelopes,primitives:primitiveResults,errors:[...new Set(errors)],pass:errors.length===0};
  console.log(`${family}: ${errors.length===0?'PASS':'FAIL'}, ${primitiveResults.length} closed primitives, ${sourceComponentCount} source components, ${[...new Set(errors)].join('; ')}`);
}
report.pass=Object.values(report.families).every(f=>f.pass);
fs.writeFileSync(path.join(project,'assets-source/v06a/architecture-export-audit.json'),JSON.stringify(report,null,2)+'\n');
if(!report.pass)process.exitCode=1;
