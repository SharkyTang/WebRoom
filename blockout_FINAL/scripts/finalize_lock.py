"""Mark the accepted blockout locked only after geometry and actual roundtrip audits pass."""
import bpy, json, hashlib
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]
blend=OUT/'sharkys_room_blockout_FINAL.blend'
assert Path(bpy.data.filepath).resolve()==blend.resolve()
audit=json.loads((OUT/'validation_results.json').read_text())
roundtrip=json.loads((OUT/'roundtrip_results.json').read_text())
assert audit['overall_status']=='pass' and audit['summary']['fail']==0
assert roundtrip['roundtrip_pass']
(OUT/'review'/'initial_validation_before_lock.json').write_text(json.dumps(audit,indent=2,ensure_ascii=False))
(OUT/'review'/'initial_roundtrip_before_lock.json').write_text(json.dumps(roundtrip,indent=2,ensure_ascii=False))
status="SHARKY'S ROOM — BLOCKOUT FINAL / COMPOSITION LOCKED"
scene=bpy.context.scene; root=bpy.data.objects['SharkysRoom']
for owner in [scene,root]:
    owner['freeze_status']='COMPOSITION_LOCKED'
    owner['blockout_version']='v0.2.1'
    owner['blockout_status']=status
    owner['final_hero_camera']='CAM_Hero_FINAL'
root['spatial_source_of_truth']=True
scene['stage']=status
scene['final_hero_camera_selected']=True
scene.camera=bpy.data.objects['CAM_Hero_FINAL']
scene.render.filepath=str(OUT/'hero_FINAL.png')
text=bpy.data.texts['CURRENT_BLOCKOUT_STATUS']; text.clear()
text.write(status+'\n\nVersion: v0.2.1\n'
           'Final camera: CAM_Hero_FINAL (exact validated CAM_Hero_48 copy, user selected).\n'
           'Original v0.2 camera candidates are retained only as history.\n'
           'Geometry, interaction structure, pivots, full motions and actual GLB roundtrip passed before this freeze.\n'
           'Use this file as the spatial source of truth for future assets and Web work.\n'
           'STOP. Await explicit v0.3 — Web Foundation instructions. No prototype or detailed modeling has started.\n')
meta_path=OUT/'build_FINAL_metadata.json'; meta=json.loads(meta_path.read_text())
meta['freeze_status']='COMPOSITION_LOCKED'; meta['blockout_status']=status
meta['validation_status']='GEOMETRY_AND_ROUNDTRIP_PASSED_BEFORE_FREEZE'
meta['pre_freeze_validation_summary']=audit['summary']
meta['final_camera_parameters']=dict(meta['source_camera_parameters'])
meta['final_camera_parameters']['name']='CAM_Hero_FINAL'
meta['final_camera_parameters']['role']='User selected FINAL; no camera parameters changed'
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
bpy.ops.export_scene.gltf(filepath=str(OUT/'sharkys_room_blockout_FINAL.glb'),export_format='GLB',
                        export_cameras=True,export_lights=True,export_extras=True,export_yup=True,
                        export_apply=True,export_animations=False,export_materials='EXPORT')
meta['glb_bytes']=(OUT/'sharkys_room_blockout_FINAL.glb').stat().st_size
meta_path.write_text(json.dumps(meta,indent=2,ensure_ascii=False))
# Durable exact transforms for the later explicitly authorized Web Foundation task.
bpy.context.view_layer.update()
snapshot={}
for o in scene.objects:
    item={'type':o.type,'parent':o.parent.name if o.parent else None,
          'collections':[c.name for c in o.users_collection],
          'matrix_world':[list(row) for row in o.matrix_world],
          'matrix_basis':[list(row) for row in o.matrix_basis],
          'origin_world':list(o.matrix_world.translation)}
    if o.type=='MESH':
        depsgraph=bpy.context.evaluated_depsgraph_get(); evaluated=o.evaluated_get(depsgraph)
        mesh=evaluated.to_mesh(); points=[evaluated.matrix_world @ v.co for v in mesh.vertices]
        item['world_bounds']=[[min(v[i] for v in points) for i in range(3)],
                              [max(v[i] for v in points) for i in range(3)]]
        evaluated.to_mesh_clear()
    snapshot[o.name]=item
freeze={'version':'v0.2.1','status':status,'units':'meters, Blender Z-up',
        'final_camera':'CAM_Hero_FINAL','camera_parameters':meta['final_camera_parameters'],
        'objects':snapshot,'files':{name:hashlib.sha256((OUT/name).read_bytes()).hexdigest()
        for name in ['sharkys_room_blockout_FINAL.blend','sharkys_room_blockout_FINAL.glb','hero_FINAL.png']}}
(OUT/'spatial_freeze_manifest.json').write_text(json.dumps(freeze,indent=2,ensure_ascii=False))
print('FINAL_FREEZE_MARKED_AFTER_VALIDATION')
