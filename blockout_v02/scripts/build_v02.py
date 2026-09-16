"""Increment v0.1 in place in memory, save only v0.2; never rebuild the validated rigs."""
import bpy, json, math, hashlib
from pathlib import Path
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view

OUT=Path(__file__).resolve().parents[1]
BASE=OUT.parent/'blockout_v01'
SOURCE=BASE/'sharkys_room_blockout_v01.blend'
assert Path(bpy.data.filepath).resolve()==SOURCE.resolve(), 'Run on the validated v0.1 .blend'
manifest=json.loads((BASE/'delivery_manifest.json').read_text())
source_sha=hashlib.sha256(SOURCE.read_bytes()).hexdigest()
assert source_sha==manifest[SOURCE.name]['sha256'], 'Source differs from the validated delivery'
OUT.mkdir(exist_ok=True); (OUT/'review').mkdir(exist_ok=True)
scene=bpy.context.scene
scene['stage']='Blockout v0.2 — Composition Lock candidates; USER SELECTION PENDING'
scene['stop_condition']='Stop after v0.2. No v0.3, interaction prototype, detailed meshes or final materials.'
scene['source_v01_sha256']=source_sha
scene['final_hero_camera_selected']=False
scene['candidate_cameras']=['CAM_Hero_45','CAM_Hero_48','CAM_Hero_52']

def snapshot(obj):
    result={'location':list(obj.location),'rotation_degrees':[math.degrees(a) for a in obj.rotation_euler],
        'scale':list(obj.scale),'parent':obj.parent.name if obj.parent else None,
        'origin_world':list(obj.matrix_world.translation)}
    if obj.type=='MESH':
        points=[v.co for v in obj.data.vertices]
        result['local_geometry_dimensions']=[max(v[i] for v in points)-min(v[i] for v in points) for i in range(3)]
    return result
before={o.name:snapshot(o) for o in scene.objects}
changes={}
def changed(name,note):
    bpy.context.view_layer.update()
    changes[name]={'before':before[name],'after':snapshot(bpy.data.objects[name]),'reason':note}

class Boxes:
    def __init__(self): self.verts=[]; self.faces=[]
    def add(self,center,size):
        x,y,z=[n/2 for n in size]; o=len(self.verts)
        self.verts.extend([tuple(Vector(v)+Vector(center)) for v in
            [(-x,-y,-z),(-x,-y,z),(-x,y,-z),(-x,y,z),(x,-y,-z),(x,-y,z),(x,y,-z),(x,y,z)]])
        self.faces.extend([tuple(o+i for i in f) for f in
            [(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)]])
        return self
    def replace(self,name):
        obj=bpy.data.objects[name]; previous=obj.data
        mesh=bpy.data.meshes.new(name+'_Mesh_v02'); mesh.from_pydata(self.verts,[],self.faces); mesh.update()
        for mat in previous.materials: mesh.materials.append(mat)
        obj.data=mesh
        return obj

# Cabinet extends toward the door, with a tall rear bay and broad front bays.
# Preserve its existing object origin and hierarchy; all positions below are local.
cab=bpy.data.objects['FUR_DisplayCabinet']
g=Boxes()
ymin,ymax=-2.10,1.65  # world [-1.20,2.55], width 3.75m at original origin y=.90
g.add((-.285,(ymin+ymax)/2,1.30),(.03,3.75,2.60))
for y in [ymin+.04,ymax-.04]: g.add((0,y,1.30),(.60,.08,2.60))
for z in [.06,.70,2.56]: g.add((0,(ymin+ymax)/2,z),(.60,3.75,.07))
# Front bay world y [-1.12,.52]; middle shelf does not cross the tower bay.
g.add((0,-1.17,1.35),(.60,1.78,.07))
g.add((0,-.33,1.32),(.60,.06,2.50))
# Dedicated rocket slot and a smaller vertical display bay at the rear.
g.add((0,.52,1.65),(.60,.045,1.77))
g.add((0,1.12,1.65),(.60,.045,1.77))
# Low front partitions for the architecture/car shelf; still only broad blocks.
g.add((0,-1.05,.385),(.60,.04,.55))
g.replace(cab.name)
cab['dimensions_m']=[3.75,.60,2.60]
cab['v02_layout']='Wide architecture/Falcon bays; full-height tower bay; low car bays. Bounding boxes only.'
changed(cab.name,'Cabinet width 3.10→3.75m, depth .52→.60m; nonuniform shelves preserve tall tower space.')

# Reuse every named display proxy, changing only the reserved bounding volumes.
# Dimensions are XYZ; for this wall, Y is the visible bay width and X the depth.
proxy_specs={
 'DSP_Falcon_Bounds':((-3.225,-.31,1.015),(.48,1.28,.45),'Wide low Falcon bay'),
 'DSP_EiffelTower_Bounds':((-3.225,.995,1.55),(.50,.72,1.60),'Tall narrow Eiffel bay'),
 'DSP_TallRocket_Bounds':((-3.225,1.70,1.48),(.32,.29,1.44),'Tall narrow rocket bay'),
 'DSP_Castle_Bounds':((-3.225,-.31,1.915),(.49,1.30,.97),'Wide tall architecture bay'),
 'DSP_Bridge_Bounds':((-3.225,1.52,.38),(.47,1.40,.48),'Long low bridge bay'),
 'DSP_Architecture_Bounds':((-3.225,.19,.365),(.47,.53,.45),'Small architecture bay'),
 'DSP_Vehicle_Bounds':((-3.225,-.66,.275),(.42,.81,.27),'Low racing car bay'),
}
for name,(position,dimensions,note) in proxy_specs.items():
    obj=Boxes().add((0,0,0),dimensions).replace(name)
    obj.location=position
    obj['reserved_dimensions_xyz_m']=list(dimensions)
    obj['v02_bay']=note
    changed(name,note+'; proxy only, no model details.')

# Desk remains at the same height and position. Widening only X keeps piano Z/Y clearance.
desk=bpy.data.objects['FUR_Desk']
for v in desk.data.vertices: v.co.x*=2.80/2.65
desk.data.update(); desk['dimensions_m']=[2.80,.82,.74]
changed(desk.name,'Widen desk X 2.65→2.80m without altering its height or the piano movement envelope.')

# First 8 body vertices belong to the monitor head. Never scale the stand vertically.
body=bpy.data.objects['TEC_MonitorBody']
for v in list(body.data.vertices)[:8]:
    v.co.x*=1.16/.94
    v.co.z*=.62/.52
body.data.update()
screen=bpy.data.objects['TEC_MonitorScreen']
for v in screen.data.vertices:
    v.co.x*=1.105/.883
    v.co.z*=.56/.461
screen.data.update()
changed(body.name,'Monitor head .94×.52→1.16×.62m; stand/base and all object transforms preserved.')
changed(screen.name,'Screen enlarged to 1.105×.56m in local geometry; required name, origin and target unchanged.')

# Sofa -> coffee table -> workstation: orient seat toward a closer coffee table.
sofa=bpy.data.objects['FUR_Sofa']; sofa.location=(-2.13,-1.12,0); sofa.rotation_euler.z=math.radians(98)
changed(sofa.name,'Rotate Z 76→98 degrees, lightly reposition toward the lounge-to-workstation flow.')
table=bpy.data.objects['FUR_CoffeeTable']; table.location=(-.83,-1.02,0); table.rotation_euler.z=math.radians(-4)
changed(table.name,'Move closer to sofa and slightly toward workstation; leave TEC_iPad and TGT_iPad at their validated positions.')
plant=bpy.data.objects['DEC_Plant_CoffeeTable']; plant.location=(-.51,-.92,.48)
changed(plant.name,'Keep supported on the relocated tabletop.')
plant=bpy.data.objects['DEC_Plant_Sofa']; plant.location=(-2.80,-2.29,0)
changed(plant.name,'Small adjustment to clear the rotated sofa arm while keeping the door approach open.')

beanbag=bpy.data.objects['FUR_BeanBag']
for v in beanbag.data.vertices: v.co*=.78
beanbag.data.update(); beanbag.location=(2.13,-1.76,0)
changed(beanbag.name,'Apply 78% proxy geometry size; move X +.30m and Y +.08m to reduce foreground dominance.')

scene.render.resolution_x=1536; scene.render.resolution_y=1024; scene.render.resolution_percentage=100
scene.render.engine='CYCLES'; scene.cycles.samples=64; scene.cycles.use_denoising=True
scene.render.image_settings.file_format='PNG'
bpy.context.view_layer.update()
# Source CAM_Hero is the untouched baseline and remains active in the saved file.
baseline=bpy.data.objects['CAM_Hero']
assert baseline.data.lens==48
camera_records={}
def camera_record(cam,target=None,label=None):
    return {'name':cam.name,'role':label,'type':cam.data.type,'lens_mm':cam.data.lens,
        'sensor_width_mm':cam.data.sensor_width,'sensor_height_mm':cam.data.sensor_height,
        'sensor_fit':cam.data.sensor_fit,'position_xyz_m':list(cam.location),
        'rotation_xyz_degrees':[math.degrees(v) for v in cam.rotation_euler],
        'rotation_quaternion_wxyz':list(cam.rotation_euler.to_quaternion()),
        'matrix_world':[list(row) for row in cam.matrix_world],
        'target_xyz_m':target,'shift_xy':[cam.data.shift_x,cam.data.shift_y],
        'clip_start_m':cam.data.clip_start,'clip_end_m':cam.data.clip_end,
        'resolution':[1536,1024],'pixel_aspect':[scene.render.pixel_aspect_x,scene.render.pixel_aspect_y],
        'horizontal_fov_degrees':math.degrees(2*math.atan(cam.data.sensor_width/(2*cam.data.lens))),
        'vertical_fov_degrees':math.degrees(2*math.atan(cam.data.sensor_width/(3*cam.data.lens))),
        'dof_enabled':cam.data.dof.use_dof}
old_meta=json.loads((BASE/'build_metadata.json').read_text())
camera_records['CAM_Hero']=camera_record(baseline,old_meta['camera']['target'],'Unchanged v0.1 baseline, not the final v0.2 selection')
points=[o.matrix_world @ v.co for o in scene.objects if o.type=='MESH' for v in o.data.vertices]
def aim(cam,target): cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
def bounds(cam):
    proj=[world_to_camera_view(scene,cam,p) for p in points]
    return [min(p.x for p in proj),max(p.x for p in proj),min(p.y for p in proj),max(p.y for p in proj)]

# Three separately composed candidates, same assets/materials/light and output format.
# Degrees below specify the initial azimuth from -Y and elevation above the horizontal.
camera_specs=[
 (45,39.0,29.0,'A — closer perspective, more visible shelf/table tops'),
 (48,37.4,27.4,'B — baseline-adjacent view, adjusted framing for v0.2 furniture'),
 (52,39.5,25.8,'C — longer lens and lower angle, less foreground exaggeration'),
]
for focal,azimuth,elevation,label in camera_specs:
    cam=baseline.copy(); cam.data=baseline.data.copy()
    cam.name=f'CAM_Hero_{focal}'; cam.data.name=f'CAM_Hero_{focal}_Data'
    bpy.data.collections['CAMERAS_TARGETS'].objects.link(cam)
    cam.parent=bpy.data.objects['CAMERAS_TARGETS']
    cam.data.lens=focal; cam.data.shift_x=0; cam.data.shift_y=0
    target=Vector((-.04,.08,.84))
    az=math.radians(azimuth); el=math.radians(elevation)
    cam.location=target+Vector((math.sin(az),-math.cos(az),math.tan(el)))*(13*focal/48)
    aim(cam,target); bpy.context.view_layer.update()
    # Fit actual mesh vertices to equal review margins, optimizing both pose and distance.
    for _ in range(12):
        x0,x1,y0,y1=bounds(cam)
        ratio=max((x1-x0)/.93,(y1-y0)/.87)
        distance=(cam.location-target).length
        width=distance*cam.data.sensor_width/cam.data.lens
        local_delta=Vector((((x0+x1)/2-.5)*width,((y0+y1)/2-.535)*width/1.5,0))
        target+=cam.rotation_euler.to_quaternion() @ local_delta
        aim(cam,target)
        cam.location=target+(cam.location-target)*ratio
        bpy.context.view_layer.update()
    cam['candidate_status']='UNREVIEWED — user to select; no final Hero chosen'
    cam['composition_target_xyz_m']=list(target)
    cam['candidate_description']=label
    camera_records[cam.name]=camera_record(cam,list(target),label)
    camera_records[cam.name]['projected_bounds_xy']=bounds(cam)

# Guard critical interaction matrices and targets before writing any v0.2 artifacts.
required=['TEC_MonitorBody','TEC_MonitorScreen','TEC_MacBookBase','TEC_MacBookScreen','TEC_iPad',
          'TEC_Marshall','TEC_Phone','INT_PianoRail','INT_Piano','INT_TrashCanBody','INT_TrashCanLid',
          'INT_LightSwitch','ENV_WindowFrame','ENV_WindowGlass']
for name in required+[n for n in before if n.startswith('TGT_')]+['CAM_Hero']:
    after=snapshot(bpy.data.objects[name]); old=before[name]
    for key in ['location','rotation_degrees','scale','origin_world']:
        assert all(abs(a-b)<1e-6 for a,b in zip(after[key],old[key])),(name,key)
    assert after['parent']==old['parent']

scene.camera=baseline
scene.render.filepath=str(OUT/'review'/'hero_v02_baseline_48mm.png')
bpy.ops.object.select_all(action='DESELECT'); baseline.select_set(True); bpy.context.view_layer.objects.active=baseline
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D': area.spaces.active.region_3d.view_perspective='CAMERA'
text=bpy.data.texts.new('V02_REVIEW_README')
text.write('Blockout v0.2 Composition Lock candidates. CAM_Hero is the untouched v0.1 baseline.\n'
           'CAM_Hero_45 / CAM_Hero_48 / CAM_Hero_52 are UNREVIEWED candidates; choose camera manually.\n'
           'No final camera selected; no interaction prototype or detailed modeling.\n'
           'All original required interaction transforms, pivots, 9 targets and parents preserved.\n')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'sharkys_room_blockout_v02.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'sharkys_room_blockout_v02.glb'),export_format='GLB',
    export_cameras=True,export_lights=True,export_extras=True,export_yup=True,export_apply=True,
    export_animations=False,export_materials='EXPORT')
metadata={'source_blend':str(SOURCE),'source_v01_sha256':source_sha,'blender_version':bpy.app.version_string,
          'stage':'v0.2 Composition Lock — camera decision pending','final_camera_selected':False,
          'saved_active_camera':'CAM_Hero','changes':changes,'cameras':camera_records,
          'display_proxies':{n:{'position':p,'dimensions_xyz_m':d,'bay':r} for n,(p,d,r) in proxy_specs.items()},
          'display_cabinet_overall_wdh_m':[3.75,.60,2.60],
          'glb_bytes':(OUT/'sharkys_room_blockout_v02.glb').stat().st_size}
(OUT/'build_v02_metadata.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2))
print('V02_BUILD_AND_EXPORT_COMPLETE')
for focal,_,_,_ in camera_specs:
    scene.camera=bpy.data.objects[f'CAM_Hero_{focal}']
    scene.render.filepath=str(OUT/f'hero_{focal}mm.png')
    bpy.ops.render.render(write_still=True)
scene.camera=baseline
scene.render.filepath=str(OUT/'review'/'hero_v02_baseline_48mm.png')
bpy.ops.render.render(write_still=True)
print('V02_ALL_RENDERS_COMPLETE')
