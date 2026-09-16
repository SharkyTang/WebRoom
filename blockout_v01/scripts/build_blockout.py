"""Build only Sharky's Room Blockout v0.1. Run with Blender --background."""
import bpy, math, json, os
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector, Matrix
from pathlib import Path

OUT = Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
    bpy.data.collections.remove(c)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1.0
scene.unit_settings.length_unit = 'METERS'
scene['stage'] = 'Blender Blockout v0.1 — STOP before detailed modeling'
scene['coordinate_system'] = 'Blender Z-up, meters. glTF export uses standard Y-up.'
scene['reference'] = 'room_master_reference.jpeg'
scene['piano_manual_test'] = 'INT_PianoRail local Y: retracted 1.94, extended 1.29 (default).'

groups = ['ENVIRONMENT','FURNITURE','TECH','INTERACTIVE','DISPLAY_MODELS','DECORATIONS','LIGHTING','CAMERAS_TARGETS']
root_collection = bpy.data.collections.new('SharkysRoom')
scene.collection.children.link(root_collection)
root = bpy.data.objects.new('SharkysRoom', None)
root_collection.objects.link(root)
root.empty_display_type = 'PLAIN_AXES'
root.empty_display_size = .15
collections, parents = {}, {}
for name in groups:
    col = bpy.data.collections.new(name)
    root_collection.children.link(col)
    collections[name] = col
    obj = bpy.data.objects.new(name, None)
    col.objects.link(obj)
    obj.parent = root
    obj.empty_display_size = .1
    obj['role'] = 'Collection hierarchy mirrored as an exportable glTF group'
    parents[name] = obj

def material(name, color, rough=.8, emission=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color,1)
    bs.inputs['Roughness'].default_value = rough
    if emission:
        bs.inputs['Emission Color'].default_value = (*color,1)
        bs.inputs['Emission Strength'].default_value = emission
    return m

M = {
    'shell': material('MAT_RoomShell_Greybox', (.39,.42,.45)),
    'furniture': material('MAT_Furniture_Greybox', (.48,.46,.43)),
    'soft': material('MAT_SoftProxy_Greybox', (.30,.33,.36)),
    'tech': material('MAT_DarkTechnology_Greybox', (.065,.079,.095)),
    'glass': material('MAT_GlassProxy_Greybox', (.23,.34,.42), .5),
    'screen': material('MAT_ScreenProxy_Greybox', (.35,.55,.62), .6, .18),
}

def link(obj, group, parent=None):
    collections[group].objects.link(obj)
    obj.parent = parent if parent is not None else parents[group]
    return obj

class Geometry:
    def __init__(self): self.v, self.f, self.mi = [], [], []
    def box(self, c, d, mat=0, rot=None):
        x,y,z = [s/2 for s in d]
        v = [(-x,-y,-z),(-x,-y,z),(-x,y,-z),(-x,y,z),(x,-y,-z),(x,-y,z),(x,y,-z),(x,y,z)]
        off = len(self.v)
        self.v.extend([tuple((rot @ Vector(p) if rot else Vector(p))+Vector(c)) for p in v])
        faces=[(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)]
        self.f.extend([tuple(off+i for i in f) for f in faces]); self.mi.extend([mat]*6)
        return self
    def cylinder(self, c, radius, height, mat=0, n=16, top=None):
        off=len(self.v); top = radius if top is None else top
        for z,r in [(-height/2,radius),(height/2,top)]:
            self.v.extend([(c[0]+r*math.cos(2*math.pi*i/n),c[1]+r*math.sin(2*math.pi*i/n),c[2]+z) for i in range(n)])
        faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
        faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
        self.f.extend([tuple(off+i for i in f) for f in faces]); self.mi.extend([mat]*len(faces))
        return self
    def ellipsoid(self,c,d,mat=0,n=16,rings=8):
        off=len(self.v)
        self.v.append((c[0],c[1],c[2]-d[2]/2))
        for j in range(1,rings):
            a=-math.pi/2+math.pi*j/rings
            self.v.extend([(c[0]+d[0]/2*math.cos(a)*math.cos(2*math.pi*i/n),c[1]+d[1]/2*math.cos(a)*math.sin(2*math.pi*i/n),c[2]+d[2]/2*math.sin(a)) for i in range(n)])
        top=len(self.v)-off; self.v.append((c[0],c[1],c[2]+d[2]/2))
        faces=[]
        for i in range(n): faces.append((0,1+(i+1)%n,1+i))
        for j in range(rings-2):
            a=1+j*n; b=a+n
            faces.extend([(a+i,a+(i+1)%n,b+(i+1)%n,b+i) for i in range(n)])
        a=1+(rings-2)*n
        for i in range(n): faces.append((a+i,a+(i+1)%n,top))
        self.f.extend([tuple(off+i for i in f) for f in faces]); self.mi.extend([mat]*len(faces))
        return self
    def object(self,name,group,loc=(0,0,0),mats=('furniture',),parent=None,bevel=0):
        mesh=bpy.data.meshes.new(name+'_Mesh'); mesh.from_pydata(self.v,[],self.f); mesh.update()
        obj=link(bpy.data.objects.new(name,mesh),group,parent)
        obj.location=loc
        for m in mats: mesh.materials.append(M[m])
        for p,i in zip(mesh.polygons,self.mi): p.material_index=i
        if bevel:
            mod=obj.modifiers.new('Blockout_Edge_Softening','BEVEL'); mod.width=bevel; mod.segments=1
        return obj

def box(name,group,c,d,mat='furniture',parent=None,origin=None,bevel=0):
    origin = c if origin is None else origin
    return Geometry().box(Vector(c)-Vector(origin),d).object(name,group,origin,(mat,),parent,bevel)
def empty(name,group,loc=(0,0,0),parent=None):
    o=link(bpy.data.objects.new(name,None),group,parent); o.location=loc; o.empty_display_size=.09
    o.empty_display_type='SPHERE'; return o
def rx(deg): return Matrix.Rotation(math.radians(deg),3,'X')

# Two solid rear walls, two open sides, and a real window opening.
shell=empty('ENV_RoomShell','ENVIRONMENT'); shell['dimensions_m']=[7.2,5.8,3.0]
g=Geometry()
# Reference-like clipped front corner: x-y <= 4.60, leaving a broad front edge.
outline=[(-3.69,-2.99),(1.61,-2.99),(3.69,-.91),(3.69,2.99),(-3.69,2.99)]
for z in [-.12,0]: g.v.extend([(x,y,z) for x,y in outline])
g.f=[(4,3,2,1,0),(5,6,7,8,9)]+[(i,(i+1)%5,(i+1)%5+5,i+5) for i in range(5)]
g.mi=[0]*len(g.f)
g.object('ENV_Floor','ENVIRONMENT',mats=('shell',))
g=Geometry()
g.box((0,.625,1.5),(.18,4.55,3))
g.box((0,-2.8,1.5),(.18,.2,3))
g.box((0,-2.175,2.575),(.18,1.05,.85))
g.object('ENV_Wall_Left','ENVIRONMENT',(-3.69,0,0),('shell',))
g=Geometry()
# Window x [-2.7,1.35], sill=.9, top=2.78.
g.box((-3.195,0,1.5),(.99,.18,3)).box((2.52,0,1.5),(2.34,.18,3))
g.box((-.675,0,.45),(4.05,.18,.9)).box((-.675,0,2.89),(4.05,.18,.22))
g.object('ENV_Wall_Right','ENVIRONMENT',(0,2.99,0),('shell',))
g=Geometry()
for x in [-2.7,1.35]: g.box((x,0,1.84),(.08,.13,1.96))
for z in [.9,2.78]: g.box((-.675,0,z),(4.12,.13,.08))
for x in [-1.35,0]: g.box((x,0,1.84),(.045,.10,1.84))
g.object('ENV_WindowFrame','ENVIRONMENT',(0,2.895,0),('tech',))
box('ENV_WindowGlass','ENVIRONMENT',(-.675,2.955,1.84),(3.96,.012,1.8),'glass')
for side,x in [('Left',-2.68),('Right',1.33)]:
    box('ENV_Curtain_'+side,'ENVIRONMENT',(x,2.73,1.48),(.30,.18,2.82),'soft')
box('ENV_CityBackground','ENVIRONMENT',(-.675,3.25,1.84),(4.5,.015,2.12),'glass')
box('ENV_Door','ENVIRONMENT',(-3.59,-2.175,1.065),(.075,.99,2.13),'furniture')
box('DEC_DoorHandle','DECORATIONS',(-3.525,-1.85,1.02),(.06,.12,.035),'tech')

# Display cabinet along the left wall. Wide shelves and bounding boxes only.
g=Geometry()
g.box((-.245,0,1.3),(.03,3.10,2.6))
for y in [-1.51,1.51]: g.box((0,y,1.3),(.52,.08,2.6))
for z in [.06,.72,1.35,2.56]: g.box((0,0,z),(.52,3.10,.07))
g.box((0,.18,.69),(.52,.06,1.30))
g.object('FUR_DisplayCabinet','FURNITURE',(-3.25,.9,0),('tech',))
display_proxies=[
 ('Falcon_Bounds',(-3.24,.18,1.00),(.42,1.12,.45)),
 ('EiffelTower_Bounds',(-3.24,1.50,1.96),(.42,.62,1.13)),
 ('TallRocket_Bounds',(-3.24,2.13,1.98),(.28,.28,1.17)),
 ('Castle_Bounds',(-3.24,.05,1.72),(.43,1.12,.65)),
 ('Bridge_Bounds',(-3.24,1.73,1.02),(.42,1.15,.49)),
 ('Architecture_Bounds',(-3.24,.1,.36),(.42,1.0,.49)),
 ('Vehicle_Bounds',(-3.24,1.50,.28),(.40,.68,.33)),
]
for name,c,d in display_proxies:
    o=box('DSP_'+name,'DISPLAY_MODELS',c,d,'furniture')
    o['proxy_only']=True; o['purpose']='Reserved bounding volume; no final model geometry'

# Desk 2.65 x .82, top exactly .74 m; drawers at the sides only.
g=Geometry().box((0,0,.705),(2.65,.82,.07))
for x in [-1.1,1.1]: g.box((x,.025,.335),(.40,.70,.67))
g.box((0,.36,.595),(1.75,.06,.10))
desk=g.object('FUR_Desk','FURNITURE',(-.65,1.95,0),('furniture',),bevel=.008)
desk['dimensions_m']=[2.65,.82,.74]
desk['piano_clearance']='Central 1.8 m opening; front travel corridor remains clear'

# Chair facing +Y; its front edge stays below the piano's extended rear-to-front range.
g=Geometry().box((0,0,.445),(.54,.50,.10),0)
g.box((0,-.225,.77),(.51,.075,.57),0)
g.cylinder((0,0,.25),.045,.30,1)
for deg in [0,72,144,216,288]:
    a=math.radians(deg)
    g.box((.13*math.cos(a),.13*math.sin(a),.08),(.30,.035,.035),1,Matrix.Rotation(a,3,'Z'))
    g.cylinder((.27*math.cos(a),.27*math.sin(a),.055),.042,.055,1,n=10)
g.object('FUR_OfficeChair','FURNITURE',(-1.05,.59,0),('soft','tech'),bevel=.009)

# Bed on the right. Only a frame, mattress, broad cover and pillow blocks.
g=Geometry().box((0,0,.20),(1.64,2.04,.32),0)
g.box((0,0,.42),(1.60,2.0,.20),1)
g.box((0,-.22,.535),(1.62,1.54,.05),2)
g.box((0,1.04,.53),(1.70,.12,1.02),0)
for x in [-.40,.40]: g.box((x,.67,.575),(.68,.43,.15),2,rx(8))
bed=g.object('FUR_Bed','FURNITURE',(2.45,1.13,0),('tech','furniture','soft'),bevel=.015)
bed['mattress_dimensions_m']=[1.6,2.0]
box('FUR_BedsideTable','FURNITURE',(2.95,2.52,.29),(.60,.53,.58),'furniture',bevel=.01)

# A single low complexity sofa assembly; 1.95m wide, turned toward the table.
g=Geometry().box((0,0,.25),(1.95,.86,.27),0)
g.box((0,.36,.61),(1.95,.16,.62),0)
for x in [-.91,.91]: g.box((x,0,.50),(.15,.87,.44),0)
for x in [-.44,.44]: g.box((x,-.025,.43),(.84,.66,.12),1)
for x in [-.38,.37]: g.box((x,.21,.69),(.66,.15,.42),1,rx(-10))
sofa=g.object('FUR_Sofa','FURNITURE',(-2.15,-1.05,0),('soft','furniture'),bevel=.025)
sofa.rotation_euler.z=math.radians(76)
sofa['width_m']=1.95
g=Geometry().box((0,0,.445),(1.1,.65,.07))
for x in [-.43,.43]:
    for y in [-.22,.22]: g.box((x,y,.21),(.055,.055,.42))
table=g.object('FUR_CoffeeTable','FURNITURE',(-.5,-1.17,0),('furniture',),bevel=.018)
table.rotation_euler.z=math.radians(-10)
g=Geometry().ellipsoid((0,0,.31),(1.0,.95,.62)).ellipsoid((0,.27,.61),(.9,.53,.78))
g.object('FUR_BeanBag','FURNITURE',(1.83,-1.84,0),('soft',))

# Tech: each required object remains a separate addressable mesh.
g=Geometry().box((0,0,0),(.94,.06,.52))
g.box((0,.02,-.34),(.065,.065,.20))
g.box((0,-.025,-.445),(.37,.24,.03))
g.object('TEC_MonitorBody','TECH',(-.42,2.12,1.20),('tech',),bevel=.006)
box('TEC_MonitorScreen','TECH',(-.42,2.084,1.20),(.883,.008,.461),'screen')
box('TEC_MacBookBase','TECH',(-1.50,1.86,.757),(.34,.235,.028),'tech',bevel=.004)
# Hinge is the rear edge; the closed panel extends toward local -Y.
g=Geometry().box((0,-.112,.014),(.34,.224,.022),0)
g.box((0,-.113,-.0005),(.304,.192,.004),1)
screen=g.object('TEC_MacBookScreen','TECH',(-1.50,1.9775,.776),('tech','screen'))
screen.rotation_euler.x=math.radians(-105)
screen['pivot_axis']='X'; screen['closed_angle_deg']=0.; screen['open_angle_deg']=-105.
screen['pivot_description']='Rear hinge, local X; closed panel extends toward local -Y'
g=Geometry().box((0,0,0),(.083,.017,.165),0).box((0,-.01,0),(.069,.004,.145),1)
phone=g.object('TEC_Phone','TECH',(.16,1.75,.84),('tech','screen'))
phone.rotation_euler.x=math.radians(-12)
box('TEC_Marshall','TECH',(.39,2.06,.885),(.36,.19,.29),'tech',bevel=.012)
box('TEC_Keyboard','TECH',(-.42,1.68,.766),(.44,.155,.028),'tech',bevel=.004)
Geometry().ellipsoid((0,0,0),(.065,.105,.035)).object('TEC_Mouse','TECH',(-.065,1.62,.766),('tech',))
g=Geometry()
# A coarse square arch for headphones; no brand detail.
g.box((0,0,.20),(.19,.035,.04)).box((-.093,0,.13),(.032,.035,.14)).box((.093,0,.13),(.032,.035,.14))
for x in [-.10,.10]: g.box((x,0,.07),(.055,.07,.11))
g.box((0,0,-.007),(.17,.12,.015))
g.object('TEC_Headphones','TECH',(.51,1.62,.755),('tech',))
g=Geometry().box((0,0,0),(.25,.18,.015),0).box((0,0,.0085),(.22,.15,.003),1)
ipad=g.object('TEC_iPad','TECH',(-.66,-1.18,.49),('tech','screen'))
ipad.rotation_euler.z=math.radians(-10)

# Rail motion and panel pivots are authored in mesh local coordinates, with unit scale.
rail=empty('INT_PianoRail','INTERACTIVE',(-.65,1.29,.60))
rail.empty_display_type='ARROWS'; rail.empty_display_size=.22
rail['slide_axis']='Y'; rail['slide_distance_m']=-.65
rail['retracted_local_y_m']=1.94; rail['extended_local_y_m']=1.29
rail['default_pose']='Extended for Hero Camera and inspection; no keyframes'
rail['slide_vector_blender']=[0.,-.65,0.]; rail['slide_vector_gltf']=[0.,0.,.65]
rail['motion_hint']='Move rail Y from 1.94 to 1.29; its piano child follows. No keyframes in v0.1.'
g=Geometry().box((0,0,0),(1.34,.36,.10),0)
g.box((0,-.035,.052),(1.25,.25,.004),1)
piano=g.object('INT_Piano','INTERACTIVE',(0,0,0),('tech','furniture'),rail)
piano['dimensions_m']=[1.34,.36,.10]
piano['blockout_note']='Continuous keybed stripe only; no final keys or instrument detail'

# Cylinder body is open at the top. Lid has its rear-edge hinge at local origin.
g=Geometry(); n=20; radius=.19; inner=.169; height=.45
for z,r in [(-height/2,radius),(height/2,radius),(height/2,inner),(-height/2+.025,inner)]:
    g.v.extend([(r*math.cos(2*math.pi*i/n),r*math.sin(2*math.pi*i/n),z) for i in range(n)])
for a,b in [(0,n),(n,2*n),(2*n,3*n)]:
    for i in range(n):
        g.f.append((a+i,a+(i+1)%n,b+(i+1)%n,b+i)); g.mi.append(0)
g.f.append(tuple(range(3*n,4*n))); g.mi.append(0)
g.object('INT_TrashCanBody','INTERACTIVE',(1.12,1.80,.225),('tech',))
lid=Geometry().cylinder((0,-.193,0),.193,.025,n=20).object('INT_TrashCanLid','INTERACTIVE',(1.12,1.993,.474),('tech',))
lid['pivot_axis']='X'; lid['closed_angle_deg']=0.; lid['open_angle_deg']=-100.
lid['pivot_description']='Rear edge hinge local X; disk extends toward local -Y'

box('DEC_LightSwitchPlate','DECORATIONS',(-3.577,-1.47,1.2),(.03,.12,.18),'furniture')
switch=box('INT_LightSwitch','INTERACTIVE',(-3.539,-1.47,1.2),(.022,.065,.098),'tech')
switch.rotation_euler.y=math.radians(-8)
switch['pivot_axis']='Y'; switch['closed_angle_deg']=-8.; switch['open_angle_deg']=8.
switch['controls_light_nodes']=['LGT_CabinetProxy','LGT_DeskProxy','LGT_BedProxy']
switch['control_scope']='Future room practical lights; excludes screen emissive, window and ambient daylight'

# Minimal decorative composition proxies (no folds, leaves, or dog animation).
box('DEC_Rug_Workstation','DECORATIONS',(-.48,.71,.008),(2.94,2.00,.016),'soft')
box('DEC_Rug_Lounge','DECORATIONS',(-1.12,-1.22,.012),(2.82,1.77,.018),'soft')
def plant(name,c,size):
    g=Geometry().cylinder((0,0,size*.15),size*.15,size*.30,0,12,top=size*.19)
    g.cylinder((0,0,size*.43),size*.026,size*.35,1,8)
    g.ellipsoid((0,0,size*.70),(size*.62,size*.58,size*.59),1,12,6)
    return g.object(name,'DECORATIONS',c,('furniture','soft'))
plant('DEC_Plant_Window',(1.33,2.53,0),1.28)
plant('DEC_Plant_Sofa',(-2.63,-2.21,0),.8)
plant('DEC_Plant_Cabinet',(-3.20,1.2,2.61),.33)
plant('DEC_Plant_Desk',(-1.78,2.14,.74),.29)
plant('DEC_Plant_CoffeeTable',(-.13,-1.10,.48),.24)
g=Geometry().ellipsoid((0,0,.10),(1.1,.75,.20),0)
g.ellipsoid((0,0,.23),(.66,.38,.29),1)
g.ellipsoid((.29,-.07,.29),(.23,.24,.23),1)
g.object('DEC_DogBedProxy','DECORATIONS',(-.30,-2.40,0),('soft','furniture'))
def lamp(name,c):
    g=Geometry().cylinder((0,0,.025),.1,.05,0)
    g.cylinder((0,0,.14),.018,.22,0,8)
    g.ellipsoid((0,0,.26),(.20,.20,.25),1,12,6)
    g.object(name,'DECORATIONS',c,('tech','screen'))
lamp('DEC_Lamp_Bedside',(2.97,2.5,.58))
box('FUR_SideTable','FURNITURE',(.98,-2.19,.27),(.44,.44,.54),'furniture',bevel=.01)
lamp('DEC_Lamp_Lounge',(.98,-2.19,.54))
box('DEC_WallArt','DECORATIONS',(2.45,2.877,1.87),(.86,.035,.88),'tech')

# Future click/tap focus targets. No web UI or camera animation is implemented.
target_points = {
 'Monitor':(-.42,2.08,1.20),'MacBook':(-1.50,1.97,.94),'iPad':(-.66,-1.18,.50),
 'Marshall':(.39,2.06,.885),'Piano':(-.65,1.29,.60),'TrashCan':(1.12,1.80,.46),
 'LightSwitch':(-3.54,-1.47,1.2),'Phone':(.16,1.75,.84),'Window':(-.675,2.90,1.84)
}
node_map={
 'Monitor':['TEC_MonitorBody','TEC_MonitorScreen'],
 'MacBook':['TEC_MacBookBase','TEC_MacBookScreen'], 'iPad':['TEC_iPad'],
 'Marshall':['TEC_Marshall'], 'Piano':['INT_PianoRail','INT_Piano'],
 'TrashCan':['INT_TrashCanBody','INT_TrashCanLid'], 'LightSwitch':['INT_LightSwitch'],
 'Phone':['TEC_Phone'], 'Window':['ENV_WindowFrame','ENV_WindowGlass']
}
for i,(key,points) in enumerate(target_points.items(),1):
    t=empty('TGT_'+key,'CAMERAS_TARGETS',points)
    t['role']='Future click/tap camera focus target'
    for name in node_map[key]:
        obj=bpy.data.objects[name]; obj['interaction_id']=f'INT-{i:02}'
        obj['target_name']=t.name; obj['interaction_key']=key.lower()
        obj['activation']='click/tap; hover enhancement only (future web implementation)'
        if 'pivot_axis' in obj:
            obj['pivot_axis_blender']=obj['pivot_axis']
            obj['pivot_axis_gltf']={'X':'+X','Y':'-Z','Z':'+Y'}[obj['pivot_axis']]

def aim(o,point): o.rotation_euler=(Vector(point)-o.location).to_track_quat('-Z','Y').to_euler()
camdata=bpy.data.cameras.new('CAM_Hero_Data')
cam=link(bpy.data.objects.new('CAM_Hero',camdata),'CAMERAS_TARGETS')
cam_target=Vector((-.1,.1,1.02))
cam.location=(10.8,-14.2,10.0); aim(cam,cam_target)
camdata.type='PERSP'; camdata.lens=48; camdata.sensor_width=36
camdata.clip_start=.05; camdata.clip_end=100
scene.camera=cam
cam['composition']='Elevated three-quarter cutaway, reference-led furniture silhouette'

def light(name,typ,loc,energy,color,radius=1,target=None):
    data=bpy.data.lights.new(name+'_Data',typ); data.energy=energy; data.color=color
    if typ in {'POINT','SPOT'}: data.shadow_soft_size=radius
    if typ=='SUN': data.angle=math.radians(18)
    if typ=='SPOT': data.spot_size=math.radians(150); data.spot_blend=.8
    obj=link(bpy.data.objects.new(name,data),'LIGHTING'); obj.location=loc
    if target: aim(obj,target)
    return obj
light('LGT_Ambient','SUN',(1,-4,7),1.8,(.89,.94,1),target=(0,1,0))
light('LGT_WindowKey','POINT',(-.5,2.52,2.5),200,(.83,.92,1),1.0)
light('LGT_CabinetProxy','POINT',(-2.70,.7,2.25),65,(1,.91,.80),.55)
light('LGT_DeskProxy','POINT',(-1.85,1.95,1.24),9,(1,.93,.84),.20)
light('LGT_BedProxy','POINT',(2.97,2.5,.84),12,(1,.93,.84),.18)
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.20,.23,.28,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.55
scene.render.engine='CYCLES'; scene.cycles.samples=48; scene.cycles.use_denoising=True
scene.cycles.max_bounces=5
scene.render.resolution_x=1536; scene.render.resolution_y=1024; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.film_transparent=False
scene.view_settings.view_transform='AgX'
scene.render.filepath=str(OUT/'hero_camera_preview.png')
scene.render.fps=24
scene.frame_start=1; scene.frame_end=1

# Store reference in the .blend for review only; no reference texture in the GLB.
reference=OUT.parent/'Sharkys_Room_Blockout_Pack'/'room_master_reference.jpeg'
image=bpy.data.images.load(str(reference)); image.name='REFERENCE_RoomMaster_DO_NOT_MODEL_DETAILS'; image.use_fake_user=True; image.pack()
for fn in ['CODEX_TASK.md','BLENDER_BLOCKOUT_SPEC.md','INTERACTIONS.md','SCENE_HIERARCHY.md','ASSET_LIST.csv','README.md']:
    text=bpy.data.texts.new('SOURCE_'+fn); text.write((reference.parent/fn).read_text(encoding='utf-8-sig'))

bpy.context.view_layer.update()
# Fit actual mesh vertices, including the clipped floor, to a reference-like framing.
points=[o.matrix_world @ v.co for o in scene.objects if o.type=='MESH' for v in o.data.vertices]
def projected_bounds():
    p=[world_to_camera_view(scene,cam,v) for v in points]
    return min(v.x for v in p),max(v.x for v in p),min(v.y for v in p),max(v.y for v in p)
for _ in range(10):
    x0,x1,y0,y1=projected_bounds()
    ratio=max((x1-x0)/.90,(y1-y0)/.86)
    distance=(cam.location-cam_target).length
    frame_width=distance*camdata.sensor_width/camdata.lens
    delta=Vector((((x0+x1)/2-.5)*frame_width,((y0+y1)/2-.53)*frame_width/1.5,0))
    cam_target+=cam.rotation_euler.to_quaternion() @ delta
    aim(cam,cam_target)
    cam.location=cam_target+(cam.location-cam_target)*ratio
    bpy.context.view_layer.update()
# Keep a symmetric projection: glTF cameras do not carry Blender sensor shift.
hero_bounds=projected_bounds()
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_perspective='CAMERA'
        area.spaces.active.overlay.show_extras=False
        area.spaces.active.shading.type='MATERIAL'
bpy.ops.object.select_all(action='DESELECT')
bpy.context.view_layer.objects.active=cam
cam.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'sharkys_room_blockout_v01.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'sharkys_room_blockout_v01.glb'),export_format='GLB',
    export_cameras=True,export_lights=True,export_extras=True,export_yup=True,export_apply=True,
    export_animations=False,export_materials='EXPORT')
metadata={
 'blender_version':bpy.app.version_string,'dimensions':{'room':[7.2,5.8,3.0],'floor_thickness':.12,
 'cabinet':[3.1,.52,2.6],'desk':[2.65,.82,.74],'bed_mattress':[1.6,2.0],
 'sofa_width':1.95,'coffee_table':[1.1,.65,.48],'piano':[1.34,.36,.10],'piano_travel':.65,
 'switch_height':1.2,'desk_bed_lateral_gap':.95},
 'camera':{'position':list(cam.location),'rotation_degrees':[math.degrees(x) for x in cam.rotation_euler],
 'target':list(cam_target),'lens_mm':camdata.lens,'sensor_width_mm':camdata.sensor_width,
 'shift_x':camdata.shift_x,'shift_y':camdata.shift_y,'projected_bounds_xy':hero_bounds,
 'type':'Perspective','resolution':[1536,1024]},'materials':len(M),
 'glb_bytes':(OUT/'sharkys_room_blockout_v01.glb').stat().st_size,
 'interaction_targets':target_points,
}
(OUT/'build_metadata.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2))
print('BLOCKOUT_BUILD_AND_EXPORT_COMPLETE',json.dumps(metadata))
bpy.ops.render.render(write_still=True)
print('HERO_RENDER_COMPLETE')
