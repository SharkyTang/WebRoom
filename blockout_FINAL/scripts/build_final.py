"""v0.2.1: two mesh refinements and a verbatim copy of the selected 48mm camera."""
import bpy, json, math, hashlib
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parents[1]
BASE=OUT.parent/'blockout_v02'
SOURCE=BASE/'sharkys_room_blockout_v02.blend'
assert Path(bpy.data.filepath).resolve()==SOURCE.resolve()
source_hash=hashlib.sha256(SOURCE.read_bytes()).hexdigest()
manifest=json.loads((BASE/'delivery_v02_manifest.json').read_text())
assert source_hash==manifest[SOURCE.name]['sha256']
OUT.mkdir(exist_ok=True); (OUT/'review').mkdir(exist_ok=True)
prompt_path=Path('/Users/shaoqitang/Downloads/Sharkys_Room_Blockout_v0.2.1_Codex_Prompt.md')
(OUT/'SOURCE_v0.2.1_PROMPT.md').write_text(prompt_path.read_text())
scene=bpy.context.scene
scene['stage']='Blockout v0.2.1 — Final Composition Lock / VALIDATION PENDING'
scene['freeze_status']='VALIDATION_PENDING'
scene['final_hero_camera_selected']=True
scene['final_hero_camera']='CAM_Hero_FINAL'
scene['selected_from']='CAM_Hero_48'
scene['stop_condition']='Stop at v0.2.1. Await an explicit v0.3 Web Foundation task.'
scene['source_v02_sha256']=source_hash

def snapshot(o):
    bpy.context.view_layer.update()
    d={'origin_world':list(o.matrix_world.translation),'location':list(o.location),
       'rotation_degrees':[math.degrees(a) for a in o.rotation_euler],
       'parent':o.parent.name if o.parent else None,'scale':list(o.scale)}
    if o.type=='MESH':
        d['local_bounds']=[[min(v.co[i] for v in o.data.vertices) for i in range(3)],
                           [max(v.co[i] for v in o.data.vertices) for i in range(3)]]
    return d
before={o.name:snapshot(o) for o in scene.objects}

class Geometry:
    def __init__(self): self.v=[]; self.f=[]; self.mi=[]
    def box(self,c,d,mat=0):
        x,y,z=[a/2 for a in d]; off=len(self.v)
        self.v.extend([tuple(Vector(v)+Vector(c)) for v in [(-x,-y,-z),(-x,-y,z),(-x,y,-z),(-x,y,z),(x,-y,-z),(x,-y,z),(x,y,-z),(x,y,z)]])
        fs=[(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)]
        self.f.extend([tuple(off+i for i in f) for f in fs]); self.mi.extend([mat]*len(fs))
        return self
    def cylinder(self,c,r,h,n=24,mat=0):
        off=len(self.v)
        for z in [-h/2,h/2]:
            self.v.extend([(c[0]+r*math.cos(2*math.pi*i/n),c[1]+r*math.sin(2*math.pi*i/n),c[2]+z) for i in range(n)])
        fs=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
        fs.extend([(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)])
        self.f.extend([tuple(off+i for i in f) for f in fs]); self.mi.extend([mat]*len(fs))
        return self
    def replace(self,obj,material_names=None):
        mats=list(obj.data.materials) if material_names is None else [bpy.data.materials[n] for n in material_names]
        mesh=bpy.data.meshes.new(obj.name+'_Mesh_FINAL'); mesh.from_pydata(self.v,[],self.f); mesh.update()
        for mat in mats: mesh.materials.append(mat)
        for face,idx in zip(mesh.polygons,self.mi): face.material_index=idx
        obj.data=mesh
        return obj

# Preserve all original cabinet panels, moving only two internal dividers.
cab=bpy.data.objects['FUR_DisplayCabinet']
assert len(cab.data.vertices)==88, 'Unexpected v02 cabinet topology'
g=Geometry()
g.v=[tuple(v.co) for v in cab.data.vertices]
g.f=[tuple(p.vertices) for p in cab.data.polygons]
g.mi=[p.material_index for p in cab.data.polygons]
for i in range(72,80):
    p=list(g.v[i]); p[1]-=.12; g.v[i]=tuple(p)
for i in range(80,88):
    p=list(g.v[i]); p[1]-=.14; g.v[i]=tuple(p)
for z in [1.29,1.89]:
    # Slightly interlock with the divider/frame; free compartment width is .5475.
    g.box((0,1.29625,z),(.60,.585,.06))
g.replace(cab)

# Minimal changes to two old proxies; the five large/tall proxy boxes remain untouched.
architecture=bpy.data.objects['DSP_Architecture_Bounds']
Geometry().box((0,0,0),(.47,.50,.45)).replace(architecture)
architecture.location=(-3.225,2.19625,.9975)
car=bpy.data.objects['DSP_Vehicle_Bounds']
Geometry().box((0,0,0),(.42,.76,.27)).replace(car)
car.location=(-3.225,-.715,.275)

new_specs={
    'DSP_MercedesAMGF1_Bounds':((-3.225,.135,.275),(.42,.76,.27),'Mercedes-AMG F1'),
    'DSP_MediumModel_Bounds':((-3.225,2.19625,1.59),(.39,.36,.38),'Medium collectible'),
    'DSP_SmallModel_Bounds':((-3.225,2.19625,2.2225),(.34,.29,.35),'Small collectible'),
}
for name,(position,size,asset) in new_specs.items():
    mesh=bpy.data.meshes.new(name+'_Placeholder')
    obj=bpy.data.objects.new(name,mesh)
    bpy.data.collections['DISPLAY_MODELS'].objects.link(obj)
    obj.parent=bpy.data.objects['DISPLAY_MODELS']
    obj.location=position
    Geometry().box((0,0,0),size).replace(obj,['MAT_Furniture_Greybox'])
    obj['proxy_only']=True; obj['purpose']='Reserved bounding volume only; not a detailed model'

asset_labels={
    'DSP_EiffelTower_Bounds':'Eiffel Tower','DSP_Falcon_Bounds':'Millennium Falcon',
    'DSP_Castle_Bounds':'Hogwarts / large architecture','DSP_Bridge_Bounds':'Tower Bridge',
    'DSP_TallRocket_Bounds':'SLS','DSP_Vehicle_Bounds':'Ferrari F1',
    'DSP_Architecture_Bounds':'Medium architecture / collectible',
    **{n:s[2] for n,s in new_specs.items()},
}
for name,asset in asset_labels.items():
    obj=bpy.data.objects[name]; obj['reserved_asset']=asset
    obj['reserved_dimensions_xyz_m']=[max(v.co[i] for v in obj.data.vertices)-min(v.co[i] for v in obj.data.vertices) for i in range(3)]

# Keep the exact FUR_SideTable object/dependencies/origin. Replace only its local mesh.
side=bpy.data.objects['FUR_SideTable']
assert not side.children and not side.constraints and side.animation_data is None
g=Geometry().cylinder((0,0,.255),.24,.03,24,0)
for angle in [90,210,330]:
    a=math.radians(angle)
    g.cylinder((.16*math.cos(a),.16*math.sin(a),-.015),.014,.51,12,1)
g.replace(side,['MAT_Furniture_Greybox','MAT_DarkTechnology_Greybox'])

# Copy the user-selected camera verbatim; historical cameras remain untouched.
selected=bpy.data.objects['CAM_Hero_48']
final=selected.copy(); final.data=selected.data.copy()
final.name='CAM_Hero_FINAL'; final.data.name='CAM_Hero_FINAL_Data'
bpy.data.collections['CAMERAS_TARGETS'].objects.link(final)
final.parent=selected.parent
final['candidate_status']='FINAL — user selected CAM_Hero_48'
final['candidate_description']='Exact copy of validated CAM_Hero_48; no new framing'
final['locked_source_camera']='CAM_Hero_48'
scene.camera=final
bpy.context.view_layer.update()

# Compartment net-space bounds in the unchanged cabinet object's local axes.
def compartment(name,y0,y1,z0,z1,proxies):
    return {'name':name,'bounds_local':[[-.27,y0-.9,z0],[.30,y1-.9,z1]],'proxies':proxies}
compartments=[
 compartment('Hogwarts / large architecture',-1.12,.54,1.385,2.525,['DSP_Castle_Bounds']),
 compartment('Millennium Falcon',-1.12,.54,.735,1.315,['DSP_Falcon_Bounds']),
 compartment('Eiffel Tower',.60,1.3975,.735,2.525,['DSP_EiffelTower_Bounds']),
 compartment('SLS',1.4425,1.8775,.735,2.525,['DSP_TallRocket_Bounds']),
 compartment('Ferrari F1',-1.12,-.31,.095,.665,['DSP_Vehicle_Bounds']),
 compartment('Mercedes-AMG F1',-.27,.54,.095,.665,['DSP_MercedesAMGF1_Bounds']),
 compartment('Tower Bridge',.60,2.47,.095,.665,['DSP_Bridge_Bounds']),
 compartment('Medium architecture',1.9225,2.47,.735,1.26,['DSP_Architecture_Bounds']),
 compartment('Medium collectible',1.9225,2.47,1.32,1.86,['DSP_MediumModel_Bounds']),
 compartment('Small collectible',1.9225,2.47,1.92,2.525,['DSP_SmallModel_Bounds']),
]
modified=['FUR_DisplayCabinet','FUR_SideTable','DSP_Architecture_Bounds','DSP_Vehicle_Bounds']
changes={n:{'before':before[n],'after':snapshot(bpy.data.objects[n])} for n in modified}
metadata={'version':'v0.2.1','source_blend':str(SOURCE),'source_v02_sha256':source_hash,
          'validation_status':'PENDING','freeze_status':'VALIDATION_PENDING','selected_camera':'CAM_Hero_48',
          'final_camera':'CAM_Hero_FINAL','changes':changes,'new_proxies':new_specs,
          'cabinet_compartments':compartments,'asset_labels':asset_labels,
          'source_camera_parameters':json.loads((BASE/'build_v02_metadata.json').read_text())['cameras']['CAM_Hero_48'],
          'side_table':{'diameter_m':.48,'tabletop_thickness_m':.03,'top_world_z_m':.54,
                        'leg_count':3,'leg_diameter_m':.028,'leg_center_radius_m':.16,
                        'origin_world':list(side.matrix_world.translation),'dependencies_preserved':True},
          'scene_units':'meters, Blender Z-up; standard glTF Y-up export'}
(OUT/'build_FINAL_metadata.json').write_text(json.dumps(metadata,indent=2,ensure_ascii=False))
scene.render.resolution_x=1536; scene.render.resolution_y=1024; scene.render.resolution_percentage=100
scene.render.filepath=str(OUT/'hero_FINAL.png')
text=bpy.data.texts.new('V021_FINAL_COMPOSITION_TASK'); text.write(prompt_path.read_text())
text=bpy.data.texts.new('CURRENT_BLOCKOUT_STATUS')
text.write('Blockout v0.2.1. CAM_Hero_FINAL is an exact copy of the user-selected CAM_Hero_48.\nValidation pending. Stop before v0.3 Web Foundation.\n')
bpy.ops.object.select_all(action='DESELECT'); final.select_set(True); bpy.context.view_layer.objects.active=final
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D': area.spaces.active.region_3d.view_perspective='CAMERA'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'sharkys_room_blockout_FINAL.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'sharkys_room_blockout_FINAL.glb'),export_format='GLB',
                        export_cameras=True,export_lights=True,export_extras=True,export_yup=True,
                        export_apply=True,export_animations=False,export_materials='EXPORT')
print('FINAL_BUILD_EXPORT_COMPLETE')
bpy.ops.render.render(write_still=True)
print('FINAL_CAMERA_RENDER_COMPLETE')
