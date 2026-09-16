"""Reimport the delivered GLB in a fresh Blender scene; never overwrite delivery files."""
import bpy, json, math
from mathutils import Vector
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]
source_scene=bpy.context.scene
def snapshot():
    dg=bpy.context.evaluated_depsgraph_get()
    result={}
    for o in bpy.context.scene.objects:
        item={'type':o.type,'parent':o.parent.name if o.parent else None,
              'world_origin':list(o.matrix_world.translation)}
        if o.type=='MESH':
            ev=o.evaluated_get(dg); mesh=ev.to_mesh()
            points=[ev.matrix_world @ v.co for v in mesh.vertices]
            item['bounds']=[[min(v[i] for v in points) for i in range(3)],
                            [max(v[i] for v in points) for i in range(3)]]
            ev.to_mesh_clear()
        result[o.name]=item
    return result
source=snapshot()
camera_matrix=[list(row) for row in source_scene.camera.matrix_world]
camera_fov=source_scene.camera.data.angle_y
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(OUT/'sharkys_room_blockout_v01.glb'))
bpy.context.view_layer.update()
loaded=snapshot()
missing=sorted(set(source)-set(loaded))
parent_errors=[]; bounds_errors=[]; origin_errors=[]
for name,a in source.items():
    if name not in loaded: continue
    b=loaded[name]
    if a['parent']!=b['parent']: parent_errors.append(name)
    origin_delta=(Vector(a['world_origin'])-Vector(b['world_origin'])).length
    if origin_delta>1e-4: origin_errors.append({'name':name,'delta_m':origin_delta})
    if 'bounds' in a and 'bounds' in b:
        error=max(abs(a['bounds'][j][i]-b['bounds'][j][i]) for j in range(2) for i in range(3))
        if error>1e-4: bounds_errors.append({'name':name,'max_bound_error_m':error})
scene=bpy.context.scene
scene.camera=bpy.data.objects['CAM_Hero']
camera_error=max(abs(scene.camera.matrix_world[i][j]-camera_matrix[i][j]) for i in range(4) for j in range(4))
scene.world=bpy.data.worlds.new('Roundtrip_Render_World')
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.20,.23,.28,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.55
scene.render.engine='CYCLES'; scene.cycles.samples=48; scene.cycles.use_denoising=True; scene.cycles.max_bounces=5
scene.render.resolution_x=1536; scene.render.resolution_y=1024; scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(OUT/'review'/'glb_roundtrip_preview.png')
result={'missing_objects':missing,'parent_errors':parent_errors,'origin_errors':origin_errors,
        'geometry_bounds_errors':bounds_errors,'source_objects':len(source),'reimported_objects':len(loaded),
        'camera_world_matrix_max_error':camera_error,
        'note':'glTF uses Y-up; importer restores Z-up. World background is restored for render comparison because glTF does not serialize the Blender World.',
        'roundtrip_pass':not(missing or parent_errors or bounds_errors or origin_errors) and camera_error<1e-5}
(OUT/'roundtrip_results.json').write_text(json.dumps(result,indent=2,ensure_ascii=False))
print('ROUNDTRIP_RESULT',json.dumps(result))
bpy.ops.render.render(write_still=True)
print('ROUNDTRIP_RENDER_COMPLETE')
