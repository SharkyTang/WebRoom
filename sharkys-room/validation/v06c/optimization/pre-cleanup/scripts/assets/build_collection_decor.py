"""Original stylized C assets. Frozen anchors/A/B remain read-only.
Canonical collection geometry is uniformly scaled and baked into original anchor-local
Y-up metre vertices. Export roots remain identity; no light/camera/animation exports.
"""
from pathlib import Path
import sys,math,json,hashlib,struct
import bpy,bmesh
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_production_assets import xyz,web,pbr,box,combine,finish
from v06a_blender_common import reset,mesh_web,bounds
PROJECT=Path(__file__).resolve().parents[2]
SOURCE=PROJECT/'public/models/sharkys_room_blockout_FINAL.glb'
COLLECTIONS={'eiffel':('Eiffel','DSP_EiffelTower_Bounds'),'hogwarts':('Hogwarts','DSP_Castle_Bounds'),'minastirith':('MinasTirith','DSP_Architecture_Bounds'),'falcon':('Falcon','DSP_Falcon_Bounds'),'bridge':('TowerBridge','DSP_Bridge_Bounds'),'sls':('SLS','DSP_TallRocket_Bounds'),'ferrari':('Ferrari','DSP_Vehicle_Bounds'),'mercedes':('Mercedes','DSP_MercedesAMGF1_Bounds')}
FAMILIES=(*COLLECTIONS,'plants','cola','dog','fixtures','wallart')
DETAILS={}

def root(name,anchor):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o['v06c_anchor']=anchor;o['coordinate_contract']='identity root; Y-up metres; anchor-local vertices';return o

def mat(name,color,metal=0,rough=.48):
 m=pbr('MAT_V06C_'+name,color,metal,rough);m.use_backface_culling=True;return m

def merge(parent,keep=()):
 groups={}
 for o in list(parent.children_recursive):
  if o.type=='MESH' and o.name not in keep:groups.setdefault((o.parent.name,o.data.materials[0].name),[]).append(o)
 for i,items in enumerate(groups.values()):combine(parent.name+'_Material_'+str(i),items)

def rod(name,a,b,r,material,parent,segments=8):
 v=Vector(b)-Vector(a);center=(Vector(a)+Vector(b))/2
 bpy.ops.mesh.primitive_cylinder_add(vertices=segments,radius=r,depth=v.length,location=xyz(center))
 o=bpy.context.object;o.rotation_mode='QUATERNION';o.rotation_quaternion=Vector((0,0,1)).rotation_difference(Vector(xyz(v)).normalized())
 return finish(o,name,material,parent,0)

def cone(name,c,r1,r2,h,material,parent,segments=16):
 bpy.ops.mesh.primitive_cone_add(vertices=segments,radius1=r1,radius2=r2,depth=h,location=xyz(c));return finish(bpy.context.object,name,material,parent,0)

def sphere(name,c,r,material,parent,segments=16,rings=10):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,radius=1,location=xyz(c));o=bpy.context.object;o.scale=(r[0],r[2],r[1]);finish(o,name,material,parent,0)
 for f in o.data.polygons:f.use_smooth=True
 return o

def polygon(name,verts,faces,material,parent):
 o=mesh_web(name,verts,faces,material,parent);bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();return o

def beam(name,a,b,width,material,parent):return rod(name,a,b,width,material,parent,8)

def slot_for(anchor):
 data=json.loads((PROJECT/'validation/v06a/planning/frozen-space-contract.json').read_text())
 assert data['inputGLBSHA256']==hashlib.sha256(SOURCE.read_bytes()).hexdigest()
 for slot in data['cabinet']['slots']:
  for proxy in slot['proxies']:
   if proxy['name']==anchor:return slot,proxy
 raise ValueError(anchor)

def fit_collection(family,parent,preview=False):
 name,anchor=COLLECTIONS[family];slot,proxy=slot_for(anchor)
 objects=[o for o in parent.children_recursive if o.type=='MESH'];b=bounds(objects);pb=proxy['worldBounds'];origin=proxy['translation'];dim=[b['max'][i]-b['min'][i] for i in range(3)]
 available=[pb['size'][2]-.014,pb['size'][1]-.018,pb['size'][0]-.014]
 scale=min(available[i]/dim[i] for i in range(3));center=[(b['min'][i]+b['max'][i])/2 for i in range(3)]
 bottom=pb['min'][1]-origin[1]+.001
 for obj in objects:
  for v in obj.data.vertices:
   x,y,z=web(v.co);v.co=xyz(((z-center[2])*scale,(y-b['min'][1])*scale+bottom,-(x-center[0])*scale))
  obj.data.update()
 support=slot['worldBounds']['min'][1]-origin[1]+.00035
 base_material=mat(name+'_DisplayPlinth',(.044,.055,.062),.2,.49)
 # The old proxy floats above the real shelf; a named support fills only that gap.
 base=box('VIS_'+name+'Plinth',(0,(support+bottom)/2,0),(min(dim[2]*scale+.006,pb['size'][0]-.004),bottom-support,min(dim[0]*scale+.006,pb['size'][2]-.004)),base_material,parent,.0005,1)
 base['role']='support-only extension below original nominal proxy; real shelf clearance 0.35mm'
 merge(parent,keep=[base.name])
 parent['v06c_canonical_min']=b['min'];parent['v06c_canonical_max']=b['max'];parent['v06c_uniform_scale']=scale;parent['v06c_baked_y_rotation_degrees']=90
 DETAILS[family]={'originalAnchor':anchor,'originalParent':proxy['parent'],'nominalWorldBounds':pb,'compartmentWorldBounds':slot['worldBounds'],'canonicalBox':b,'uniformScale':scale,'bakedRotationYDegrees':90,'bodyLocalBottom':bottom,'supportLocalBottom':support,'supportExtensionM':bottom-support,'supportClearanceM':.00035,'previewOnly':preview,'provisionalSlot':family=='minastirith'}

def eiffel():
 r=root('VIS_Eiffel','DSP_EiffelTower_Bounds');steel=mat('Eiffel_WarmSteel',(.47,.43,.33),.58,.43);deck=mat('Eiffel_Decks',(.28,.26,.21),.5,.5)
 # Four splayed legs with open arches; no solid grey tower core.
 levels=[(0,.49),(.62,.31),(1.03,.23),(1.16,.225),(1.68,.135),(2.05,.093),(2.16,.089),(2.72,.036),(3.02,.02)]
 for sx in (-1,1):
  for sz in (-1,1):
   for (ya,wa),(yb,wb) in zip(levels,levels[1:]):beam('VIS_EiffelCorner',(sx*wa,ya,sz*wa),(sx*wb,yb,sz*wb),.017 if ya<1.1 else .011,steel,r)
   box('VIS_EiffelFoot',(sx*.46,.022,sz*.46),(.15,.044,.15),deck,r,.007,1)
 for i,((ya,wa),(yb,wb)) in enumerate(zip(levels,levels[1:])):
  if i==0:continue
  for side in (-1,1):
   beam('VIS_EiffelLattice',(-wa,ya,side*wa),(wb,yb,side*wb),.0065,steel,r)
   beam('VIS_EiffelLattice',(wa,ya,side*wa),(-wb,yb,side*wb),.0065,steel,r)
   beam('VIS_EiffelLattice',(side*wa,ya,-wa),(side*wb,yb,wb),.0065,steel,r)
   beam('VIS_EiffelLattice',(side*wa,ya,wa),(side*wb,yb,-wb),.0065,steel,r)
 for y,w in [(1.025,.29),(2.05,.14),(2.94,.053)]:
  box('VIS_EiffelPlatform',(0,y,0),(w*2,.041,w*2),deck,r,.004,1)
  for side in (-1,1):
   beam('VIS_EiffelRail',(-w,y+.072,side*w),(w,y+.072,side*w),.007,steel,r)
   beam('VIS_EiffelRail',(side*w,y+.072,-w),(side*w,y+.072,w),.007,steel,r)
   for k in range(6):
    t=-w+2*w*k/5;beam('VIS_EiffelBaluster',(t,y+.02,side*w),(t,y+.072,side*w),.004,steel,r)
 # Curved arch braces on all four sides, visible through the legs.
 for side in (-1,1):
  points=[(-.42+.84*i/16,.19+.41*math.sin(math.pi*i/16),side*.40) for i in range(17)]
  for a,b in zip(points,points[1:]):beam('VIS_EiffelArch',a,b,.017,steel,r);beam('VIS_EiffelArch',(a[2],a[1],a[0]),(b[2],b[1],b[0]),.017,steel,r)
 cone('VIS_EiffelSpire',(0,3.085,0),.023,.005,.15,steel,r,12)
 fit_collection('eiffel',r)

def roof(name,x,z,y,w,d,h,material,parent):
 return polygon(name,[(x-w/2,y,z-d/2),(x+w/2,y,z-d/2),(x+w/2,y,z+d/2),(x-w/2,y,z+d/2),(x,y+h,z-d/2),(x,y+h,z+d/2)],[(0,1,4),(3,5,2),(0,4,5,3),(1,2,5,4),(0,3,2,1)],material,parent)

def hogwarts():
 r=root('VIS_Hogwarts','DSP_Castle_Bounds');stone=mat('Hogwarts_Limestone',(.66,.54,.37),0,.67);slate=mat('Hogwarts_SlateRoofs',(.16,.22,.24),.1,.49);recess=mat('Hogwarts_Recesses',(.14,.115,.075),0,.76)
 box('VIS_HogwartsFoundation',(0,.045,0),(2.48,.09,.93),stone,r,.04,2)
 for x,z,w,d,h in [(-.45,.11,1.24,.44,.56),(.44,-.21,.76,.27,.58),(.71,.17,.27,.59,.44),(-.79,-.22,.30,.50,.45)]:
  box('VIS_HogwartsHall',(x,.09+h/2,z),(w,h,d),stone,r,.012,1);roof('VIS_HogwartsGabledRoof',x,z,.09+h,w+.045,d+.025,.20,slate,r)
  for i in range(max(2,int(w/.13))):
   wx=x-w*.4+i*w*.8/max(1,int(w/.13)-1)
   box('VIS_HogwartsGothicWindow',(wx,.09+h*.62,z+d/2+.001),(.033,h*.28,.008),recess,r,.01,2)
 for x,z,h,rad in [(-.97,.23,1.06,.115),(-.21,-.24,1.15,.135),(.18,.28,.76,.075),(.89,-.23,.82,.086),(1.04,.30,.52,.065),(-1.05,-.28,.58,.075)]:
  cone('VIS_HogwartsRoundTower',(x,.09+h/2,z),rad,rad*.93,h,stone,r,16)
  cone('VIS_HogwartsConicalRoof',(x,.09+h+.16,z),rad*1.20,.008,.32,slate,r,16)
  for dy in (.42,.7):
   box('VIS_HogwartsTowerWindow',(x,.09+h*dy,z+rad*.96),(.026,.09,.008),recess,r,.009,1)
 fit_collection('hogwarts',r)

def half_disk(name,radius,y,height,material,parent,segments=24,inner=0):
 # Closed semicircular terrace facing +Z, straight rear edge. Local X is facade width.
 points=[(math.cos(math.pi*i/segments)*radius,math.sin(math.pi*i/segments)*radius-.39) for i in range(segments+1)]
 if inner:points += [(math.cos(math.pi*i/segments)*inner,math.sin(math.pi*i/segments)*inner-.39) for i in range(segments,-1,-1)]
 else:points.append((0,-.39))
 n=len(points);v=[(x,yy,z) for yy in (y,y+height) for x,z in points];faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 return polygon(name,v,faces,material,parent)

def minastirith(preview=False):
 r=root('VIS_MinasTirith','DSP_Architecture_Bounds');stone=mat('MinasTirith_IvoryStone',(.79,.78,.70),0,.64);rock=mat('MinasTirith_Cliff',(.42,.46,.45),0,.84);roofmat=mat('MinasTirith_SilverRoofs',(.40,.49,.52),.16,.49)
 tiers=3 if preview else 7
 for i in range(tiers):
  frac=i/max(1,tiers-1);radius=1.0-.63*frac;y=.03+frac*.85
  half_disk('VIS_MinasTirithTerrace',radius,.03,y+.105,rock,r,24)
  half_disk('VIS_MinasTirithCurtainWall',radius,y+.13,.11,stone,r,24,inner=radius-.033)
  if not preview:
   for k in range(max(8,int(20*radius))):
    a=math.pi*(k+.5)/max(8,int(20*radius));x=math.cos(a)*(radius-.015);z=math.sin(a)*(radius-.015)-.39
    box('VIS_MinasTirithBattlement',(x,y+.265,z),(.046,.045,.037),stone,r,0)
   for k in range(5):
    a=.2+(math.pi-.4)*(k+.5)/5;rr=radius-.10
    x=math.cos(a)*rr;z=math.sin(a)*rr-.39
    box('VIS_MinasTirithCityHouse',(x,y+.1875,z),(.084,.105,.075),stone,r,.003,1)
    roof('VIS_MinasTirithHouseRoof',x,z,y+.24,.092,.081,.035,roofmat,r)
 # The distinctive high rock keel projects through the terrace arcs.
 polygon('VIS_MinasTirithRockSpur',[(-.055,.04,-.40),(.055,.04,-.40),(-.042,1.13,-.30),(.042,1.13,-.30),(-.012,.16,.73),(.012,.16,.73)],[(0,4,5,1),(0,1,3,2),(0,2,4),(1,5,3),(2,3,5,4)],rock,r)
 box('VIS_MinasTirithCitadel',(0,1.04,-.28),(.37,.18,.20),stone,r,.005,1)
 cone('VIS_MinasTirithWhiteTower',(.10,1.355,-.29),.038,.026,.48,stone,r,12)
 cone('VIS_MinasTirithTowerCrown',(.10,1.618,-.29),.044,.005,.046,roofmat,r,12)
 if not preview:
  for x in (-.125,.125):cone('VIS_MinasTirithUpperTurret',(x,1.21,-.25),.04,.029,.27,stone,r,12)
 fit_collection('minastirith',r,preview)

def falcon():
 r=root('VIS_Falcon','DSP_Falcon_Bounds');hull=mat('Falcon_AlloyPanels',(.55,.57,.55),.28,.53);dark=mat('Falcon_Recesses',(.13,.16,.17),.16,.62);accent=mat('Falcon_RedPanels',(.38,.16,.12),.16,.6)
 # Disk has a round plan; fore mandibles extend to -X, not a stretched saucer.
 center=(.06,.30,0)
 cone('VIS_FalconLowerSaucer',(center[0],.275,0),.68,.75,.075,hull,r,40)
 cone('VIS_FalconUpperSaucer',(center[0],.35,0),.75,.52,.09,hull,r,40)
 cone('VIS_FalconDorsalCore',(center[0],.405,0),.29,.21,.035,hull,r,32)
 for sign in (-1,1):
  z=sign*.30
  polygon('VIS_FalconMandible',[(-.35,.285,z-.13),(-1.01,.285,z-.10),(-1.01,.375,z-.10),(-.35,.405,z-.13),(-.35,.285,z+.13),(-1.01,.285,z+.10),(-1.01,.375,z+.10),(-.35,.405,z+.13)],[(0,1,2,3),(4,7,6,5),(0,4,5,1),(3,2,6,7),(0,3,7,4),(1,5,6,2)],hull,r)
  box('VIS_FalconMandibleInset',(-.69,.38,z),(.43,.009,.10),dark,r,.001,1)
 # Offset, forward-facing side cockpit and its glazed cap.
 rod('VIS_FalconCockpitNeck',(-.05,.355,.51),(-.28,.355,.79),.095,hull,r,16)
 rod('VIS_FalconCockpitTube',(-.28,.355,.79),(-.63,.355,.79),.084,hull,r,16)
 rod('VIS_FalconCockpitGlass',(-.63,.355,.79),(-.74,.355,.79),.076,dark,r,16)
 for a in [0,.5,1.0,1.5,2.0,2.5]:
  x=.06+.45*math.cos(a);z=.45*math.sin(a)
  cone('VIS_FalconCoolingVent',(x,.406,z),.062,.062,.007,dark,r,16)
 for i in range(18):
  a=2*math.pi*i/18
  beam('VIS_FalconRadialPanel',(.06+.31*math.cos(a),.411,.31*math.sin(a)),(.06+.61*math.cos(a),.383,.61*math.sin(a)),.007,dark if i%4 else accent,r)
 for z in (-.46,-.18,.17):box('VIS_FalconAccentPanel',(.43,.394,z),(.12,.009,.055),accent,r,.001,1)
 rod('VIS_FalconDishStem',(-.25,.42,-.27),(-.25,.50,-.27),.014,hull,r)
 cone('VIS_FalconSensorDish',(-.25,.515,-.27),.115,.084,.025,hull,r,20)
 box('VIS_FalconDisplayCradle',(.1,.12,0),(.48,.24,.33),dark,r,.015,1)
 fit_collection('falcon',r)

def bridge():
 r=root('VIS_TowerBridge','DSP_Bridge_Bounds');stone=mat('TowerBridge_Stone',(.67,.65,.53),0,.65);blue=mat('TowerBridge_BlueSteel',(.12,.34,.43),.38,.42);dark=mat('TowerBridge_Deck',(.23,.28,.28),.2,.55)
 box('VIS_TowerBridgeBase',(0,.025,0),(3.18,.05,.62),dark,r,.015,1)
 box('VIS_TowerBridgeRoad',(0,.165,0),(3.04,.055,.35),dark,r,.005,1)
 for x in (-.72,.72):
  # Tower legs retain a visibly open arch instead of a solid block at deck level.
  for z in (-.20,.20):box('VIS_TowerBridgeTowerLeg',(x,.43,z),(.28,.73,.10),stone,r,.008,1)
  box('VIS_TowerBridgeTowerUpper',(x,.82,0),(.32,.30,.51),stone,r,.009,1)
  roof('VIS_TowerBridgeTowerRoof',x,0,.98,.37,.55,.19,blue,r)
  for xx in (-.13,.13):
   for zz in (-.22,.22):
    cone('VIS_TowerBridgePinnacle',(x+xx,1.06,zz),.045,.008,.34,stone,r,10)
  for yy in (.78,.89):
   for xx in (-.08,.08):box('VIS_TowerBridgeWindow',(x+xx,yy,.259),(.041,.062,.008),dark,r,.009,1)
 box('VIS_TowerBridgeHighWalkway',(0,.89,0),(1.16,.075,.27),blue,r,.004,1)
 for side in (-1,1):
  for z in (-.20,.20):
   pts=[]
   for i in range(13):
    t=i/12;x=side*(.73+.77*t);y=.75-.53*(2*t-t*t);pts.append((x,y,z))
    if i%2==0:beam('VIS_TowerBridgeHanger',(x,.195,z),(x,y,z),.008,blue,r)
   for a,b in zip(pts,pts[1:]):beam('VIS_TowerBridgeSuspension',a,b,.017,blue,r)
 for z in (-.19,.19):
  beam('VIS_TowerBridgeRail',(-1.51,.255,z),(1.51,.255,z),.01,blue,r)
  for i in range(31):beam('VIS_TowerBridgeBaluster',(-1.5+i*.1,.19,z),(-1.5+i*.1,.255,z),.006,blue,r)
 fit_collection('bridge',r)

def sls():
 r=root('VIS_SLS','DSP_TallRocket_Bounds');orange=mat('SLS_CoreOrange',(.65,.26,.065),.05,.56);white=mat('SLS_WhiteStages',(.85,.85,.80),.12,.4);dark=mat('SLS_InterstageAndEngines',(.12,.15,.17),.45,.49)
 cone('VIS_SLS_Core',(0,1.75,0),.24,.24,2.94,orange,r,24)
 cone('VIS_SLS_CoreUpper',(0,3.31,0),.24,.175,.19,white,r,24)
 cone('VIS_SLS_UpperStage',(0,3.67,0),.175,.175,.54,white,r,24)
 cone('VIS_SLS_OrionAdapter',(0,4.03,0),.175,.105,.18,white,r,24)
 cone('VIS_SLS_OrionCapsule',(0,4.21,0),.105,.025,.18,white,r,24)
 rod('VIS_SLS_LaunchAbort',(0,4.30,0),(0,4.54,0),.02,white,r,12)
 for side in (-1,1):
  x=side*.395
  cone('VIS_SLS_Booster',(x,1.52,0),.115,.115,2.56,white,r,20)
  cone('VIS_SLS_BoosterNose',(x,2.97,0),.115,.018,.34,white,r,20)
  for y in (.37,.95,1.55,2.18,2.72):cone('VIS_SLS_BoosterBand',(x,y,0),.118,.118,.022,dark,r,20)
  cone('VIS_SLS_BoosterNozzle',(x,.15,0),.15,.065,.20,dark,r,20)
  for y in (.6,2.4):rod('VIS_SLS_BoosterBrace',(side*.20,y,0),(side*.38,y,0),.024,dark,r)
 for x in (-.11,.11):
  for z in (-.11,.11):cone('VIS_SLS_RS25',(x,.145,z),.073,.035,.23,dark,r,14)
 cone('VIS_SLS_DisplayMount',(0,.035,0),.27,.27,.07,dark,r,24)
 fit_collection('sls',r)

def racecar(family,tag,color):
 r=root('VIS_'+tag,COLLECTIONS[family][1]);paint=mat(tag+'_Body',color,.3,.34);rubber=mat(tag+'_TyresCockpit',(.018,.022,.025),.03,.63);accent=mat(tag+'_Accent',(.06,.53,.48) if family=='mercedes' else (.80,.79,.71),.32,.38)
 # Closed wedge chassis and narrow tapered nose, four separate open wheels.
 polygon('VIS_'+tag+'Chassis',[(-1.02,.15,-.24),(.90,.15,-.095),(.90,.25,-.095),(-.35,.40,-.24),(-1.02,.15,.24),(.90,.15,.095),(.90,.25,.095),(-.35,.40,.24)],[(0,1,2,3),(4,7,6,5),(0,4,5,1),(3,2,6,7),(0,3,7,4),(1,5,6,2)],paint,r)
 for side in (-1,1):
  box('VIS_'+tag+'Sidepod',(-.28,.23,side*.255),(.91,.18,.19),paint,r,.045,2)
  box('VIS_'+tag+'SideAccent',(-.23,.328,side*.285),(.75,.009,.04),accent,r,.004,1)
  for x in (-.80,.84):
   rod('VIS_'+tag+'Tyre',(x,.23,side*.43),(x,.23,side*.65),.23,rubber,r,24)
   rod('VIS_'+tag+'WheelRim',(x,.23,side*.651),(x,.23,side*.659),.103,accent,r,20)
   for ax in (-.2,.2):beam('VIS_'+tag+'Suspension',(x+ax,.23,side*.12),(x,.23,side*.50),.022,rubber,r)
 box('VIS_'+tag+'FrontWing',(1.075,.135,0),(.25,.045,1.27),paint,r,.018,2)
 box('VIS_'+tag+'FrontFlap',(1.02,.19,0),(.15,.036,1.18),accent,r,.008,1)
 box('VIS_'+tag+'RearWing',(-1.05,.65,0),(.27,.055,1.15),paint,r,.012,1)
 for z in (-.51,.51):box('VIS_'+tag+'RearEndplate',(-1.05,.585,z),(.28,.16,.025),paint,r,.004,1)
 for z in (-.27,.27):box('VIS_'+tag+'WingPylon',(-1.06,.42,z),(.035,.40,.04),rubber,r,.004,1)
 sphere('VIS_'+tag+'Cockpit',(-.24,.39,0),(.23,.08,.17),rubber,r,20,10)
 # Raised open halo arch above a recess; no imaginary driver/brand label.
 pts=[(-.27+.23*math.cos(math.pi*i/12),.45+.10*math.sin(math.pi*i/12),.17*math.sin(math.pi*i/12)) for i in range(13)]
 for a,b in zip(pts,pts[1:]):beam('VIS_'+tag+'Halo',a,b,.018,accent,r)
 beam('VIS_'+tag+'HaloPillar',(-.01,.34,0),(-.01,.45,0),.02,accent,r)
 cone('VIS_'+tag+'AirIntake',(-.50,.51,0),.084,.050,.20,paint,r,12)
 fit_collection(family,r)
def ferrari():racecar('ferrari','Ferrari',(.68,.027,.019))
def mercedes():racecar('mercedes','Mercedes',(.24,.29,.31))


def lathe_local(name,profile,material,parent,center=(0,0,0),segments=24):
 verts=[];rings=[];faces=[]
 for rad,y in profile:
  ring=[]
  for i in range(segments if rad else 1):
   a=i*2*math.pi/segments;ring.append(len(verts));verts.append((center[0]+rad*math.cos(a),center[1]+y,center[2]+rad*math.sin(a)))
  rings.append(ring)
 for a,b in zip(rings,rings[1:]):
  for i in range(segments):
   j=(i+1)%segments
   faces.append((a[0],b[i],b[j]) if len(a)==1 else (a[i],b[0],a[j]) if len(b)==1 else (a[i],b[i],b[j],a[j]))
 o=polygon(name,verts,faces,material,parent)
 for f in o.data.polygons:f.use_smooth=True
 return o

def leaf(name,start,end,width,material,parent):
 start=Vector(start);end=Vector(end);axis=end-start;side=axis.cross(Vector((0,1,0))).normalized()
 if side.length<.1:side=Vector((1,0,0))
 verts=[]
 for layer in (-1,1):
  for i in range(7):
   t=i/6;mid=start+axis*t+Vector((0,.12*axis.length*math.sin(math.pi*t),0));w=width*math.sin(math.pi*t)
   for sign in (-1,1):verts.append(tuple(mid+side*w*sign+Vector((0,layer*.0008,0))))
 faces=[]
 for i in range(6):faces +=[(i*2,i*2+1,i*2+3,i*2+2),(14+i*2,14+i*2+2,14+i*2+3,14+i*2+1),(i*2,i*2+2,14+i*2+2,14+i*2),(i*2+1,14+i*2+1,14+i*2+3,i*2+3)]
 faces +=[(0,14,15,1),(12,13,27,26)]
 return polygon(name,verts,faces,material,parent)

def plants():
 measured=json.loads((PROJECT/'validation/v06c/planning/space-measurements.json').read_text())['plants']
 ceramic=mat('Plants_Ceramic',(.72,.71,.64),.02,.48);soil=mat('Plants_SoilAndStems',(.13,.17,.07),0,.91);foliage=mat('Plants_Leaves',(.12,.28,.12),0,.62)
 DETAILS['plants']={'positions':[],'reference':'Five original positions; broad closed leaves, no alpha layering/wind; warm ceramic pots'}
 for record in measured:
  anchor=record['anchor'];suffix=anchor.split('DEC_Plant_')[1];r=root('VIS_Plant'+suffix,anchor)
  limit=record['localEnvelope'];h=limit['max'][1]*.975;rx=limit['size'][0]/2*.91;rz=limit['size'][2]/2*.91;potrad=min(rx,rz)*.63;poth=h*.34
  if suffix=='Window':
   # The original broad proxy envelope overlaps the real A curtain. Author a
   # slimmer pot and upright fan of leaves within its forward clear space.
   rx=.22;rz=.115;potrad=.1035;poth=h*.23
  support=record['suggestedRootLocalBottom']+.00035
  profile=[(0,support),(potrad*.72,support),(potrad*.80,support+.006),(potrad,poth-.012),(potrad*1.01,poth),(potrad*.91,poth),(potrad*.89,poth-.014),(potrad*.69,.012),(0,.012)]
  lathe_local('VIS_Plant'+suffix+'Pot',profile,ceramic,r,segments=24)
  cone('VIS_Plant'+suffix+'Soil',(0,poth-.010,0),potrad*.88,potrad*.88,.01,soil,r,24)
  count=19 if h>.5 else 13
  for i in range(count):
   a=i*2.39996323;level=i/max(1,count-1);y=poth+(.12+.75*level)*(h-poth)
   length=.75-.35*level
   start=(.008*math.sin(a),poth-.005,.008*math.cos(a));joint=(rx*.22*math.cos(a),y,rz*.22*math.sin(a));tip=(rx*length*math.cos(a),y+(.09 if i%2 else -.08)*(h-poth),rz*length*math.sin(a))
   rod('VIS_Plant'+suffix+'Stem',start,joint,.0015 if h<.5 else .003,soil,r,6)
   leaf('VIS_Plant'+suffix+'Leaf',joint,tip,min(rx,rz)*(.17+.035*(i%3)),foliage,r)
  # A young central pair supplies height without a spike-shaped crown.
  leaf('VIS_Plant'+suffix+'Crown',(.0,h*.74,0),(rx*.17,h*.99,rz*.12),min(rx,rz)*.16,foliage,r)
  merge(r);DETAILS['plants']['positions'].append({'root':r.name,'anchor':anchor,'localEnvelope':limit,'supportLocalY':support})

def cola():
 r=root('VIS_Cola','FUR_CoffeeTable');c=(-.245,.4805,-.015)
 glass=mat('Cola_Glass',(.77,.87,.88),0,.12);glass.diffuse_color=(.77,.87,.88,.28);glass.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.28;glass.surface_render_method='DITHERED'
 liquid=mat('Cola_Liquid',(.075,.018,.009),0,.23);ice=mat('Cola_Ice',(.65,.79,.80),.04,.15)
 lathe_local('VIS_ColaGlass',[(0,0),(.030,0),(.032,.005),(.040,.143),(.0395,.145),(.0365,.145),(.036,.139),(.028,.010),(0,.010)],glass,r,c,32)
 cone('VIS_ColaLiquid',(c[0],c[1]+.0615,c[2]),.028,.034,.103,liquid,r,32)
 for i,(x,z) in enumerate([(-.014,-.006),(.012,-.009),(.002,.016)]):
  box('VIS_ColaIce'+str(i),(c[0]+x,c[1]+.119+(i%2)*.003,c[2]+z),(.018,.019,.018),ice,r,.003,2)
 merge(r)
 DETAILS['cola']={'anchor':'FUR_CoffeeTable','geometryLocalBaseCentre':c,'height':.145,'radius':.04,'proxyMeshNames':[],'fallback':'Absent cup + existing explicit family fallback status/footer/retry. Coffee table and iPad remain installed. Missing cup is not success.','liquidTopLocalAboveBase':.113,'iceInsideInnerRadius':.036,'glassMethod':'alpha-blended thin wall; no physical transmission/refraction system'}

def dog():
 r=root('VIS_SleepingDog','DEC_DogBedProxy');coat=mat('Dog_GoldenCoat',(.55,.30,.11),0,.79);ears=mat('Dog_EarsMuzzle',(.31,.15,.055),0,.83);dark=mat('Dog_NoseClosedEyes',(.035,.022,.015),0,.49)
 sphere('VIS_SleepingDogBody',(-.10,.185,0),(.215,.100,.132),coat,r,24,14)
 sphere('VIS_SleepingDogHaunch',(-.195,.155,.065),(.115,.067,.100),coat,r,20,12)
 for z in (-.055,.055):sphere('VIS_SleepingDogForePaw',(.135,.101,z),(.136,.016,.033),coat,r,20,10)
 sphere('VIS_SleepingDogHindPaw',(-.16,.108,-.09),(.11,.023,.047),coat,r,20,10)
 sphere('VIS_SleepingDogHead',(.185,.159,.004),(.101,.074,.082),coat,r,24,14)
 sphere('VIS_SleepingDogMuzzle',(.285,.128,.026),(.072,.034,.054),coat,r,20,12)
 sphere('VIS_SleepingDogNose',(.347,.135,.026),(.018,.015,.030),dark,r,16,10)
 for side in (-1,1):
  sphere('VIS_SleepingDogFloppyEar',(.136,.159,side*.079),(.068,.061,.022),ears,r,20,12)
  eye=[(.239+.009*math.sin(math.pi*i/6),.177-.008*math.sin(math.pi*i/6),side*(.047+.021*i/6)) for i in range(7)]
  for a,b in zip(eye,eye[1:]):rod('VIS_SleepingDogClosedEye',a,b,.0024,dark,r,6)
 tail=[(-.249,.15,.07),(-.292,.133,.11),(-.285,.12,.155),(-.23,.112,.162),(-.174,.11,.148),(-.12,.111,.126)]
 for i,(a,b) in enumerate(zip(tail,tail[1:])):rod('VIS_SleepingDogCurledTail',a,b,.022-i*.0025,coat,r,10)
 # Uniformly size the whole pose to the actual curved inner bolster, preserving anatomy.
 for obj in r.children_recursive:
  if obj.type=='MESH':
   for v in obj.data.vertices:
    x,y,z=web(v.co);v.co=xyz((x*.86,.085+(y-.085)*.86,z*.86))
   obj.data.update()
 merge(r);DETAILS['dog']={'anchor':'DEC_DogBedProxy','suppressedOnly':['DEC_DogBedProxy_Mesh_1'],'preserved':'A VIS_DogBed cushion and surround','pose':'Static curled/resting, floppy ears and closed eyes; no bones/animation','poseUniformScale':.86,'poseScaleOriginY':.085,'reference':'Golden-brown sleeping dog in existing room reference; stylized approximate dog, not a claim about the user real pet'}


def stats(family):
 bpy.context.view_layer.update();meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];roots=[o for o in bpy.context.scene.objects if o.parent is None]
 for o in meshes:o.data.calc_loop_triangles()
 return {'version':'0.6C','family':family,'triangles':sum(len(o.data.loop_triangles) for o in meshes),'meshCount':len(meshes),'uvMeshes':sum(bool(o.data.uv_layers) for o in meshes),'materialCount':len({m.name for o in meshes for m in o.data.materials}),'materials':sorted({m.name for o in meshes for m in o.data.materials}),'roots':{o.name:{'anchor':o.get('v06c_anchor'),'location':list(o.location),'rotation':list(o.rotation_euler),'scale':list(o.scale),'localBoxYUp':bounds([o]+list(o.children_recursive))} for o in roots},'placement':DETAILS.get(family,{}),'sourceSHA256':hashlib.sha256(SOURCE.read_bytes()).hexdigest()}

def build(family,preview=False):
 reset();DETAILS.clear()
 if preview:minastirith(True)
 else:globals()[family]()
 result=stats(family);folder=PROJECT/'assets-source/v06c'/family;folder.mkdir(parents=True,exist_ok=True)
 if preview:
  folder=PROJECT/'validation/v06c/planning/minastirith-preview';folder.mkdir(parents=True,exist_ok=True);blend=folder/'minastirith-preview.blend';glb=folder/'minastirith-preview.glb'
 else:blend=PROJECT/'blender-assets'/f'{family}_v06c.blend';glb=PROJECT/'public/models/production'/f'{family}_v06c.glb'
 bpy.context.scene['source']='Original procedural stylized approximation from project reference and task brief; no external models/textures/brand artwork'
 bpy.context.scene['reproduce']=f'node scripts/assets/build-collection-decor.mjs {family}'
 bpy.ops.wm.save_as_mainfile(filepath=str(blend),check_existing=False)
 bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_yup=True,export_apply=True,export_texcoords=True,export_normals=True,export_materials='EXPORT',export_extras=True,export_cameras=False,export_lights=False,export_animations=False,export_image_format='AUTO')
 data=glb.read_bytes();doc=json.loads(data[20:20+struct.unpack_from('<I',data,12)[0]])
 result.update({'glbBytes':len(data),'blendBytes':blend.stat().st_size,'glbSHA256':hashlib.sha256(data).hexdigest(),'gltfPrimitives':sum(len(m['primitives']) for m in doc.get('meshes',[])),'textureCount':len(doc.get('images',[])),'exportRootTransforms':{doc['nodes'][i]['name']:{k:doc['nodes'][i].get(k) for k in ('translation','rotation','scale','matrix')} for i in doc['scenes'][doc.get('scene',0)]['nodes']}})
 reset();bpy.ops.import_scene.gltf(filepath=str(glb));after=stats(family);checks={'meshCount':result['meshCount']==after['meshCount'],'triangles':result['triangles']==after['triangles'],'uvEveryMesh':after['uvMeshes']==after['meshCount'],'sameRoots':set(result['roots'])==set(after['roots'])}
 for n,value in result['roots'].items():
  a,b=value['localBoxYUp'],after['roots'][n]['localBoxYUp'];checks[n+'_bounds']=max(abs(a[k][i]-b[k][i]) for k in ('min','max') for i in range(3))<1e-6
 assert all(checks.values()),checks
 result['roundtripChecks']=checks;(folder/'asset-statistics.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print('ASSET_COMPLETE '+json.dumps(result),flush=True)

from v06c_fixture_geometry import install as install_fixture_geometry
install_fixture_geometry(globals())

if __name__=='__main__':
 selected=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else list(FAMILIES)
 for f in selected:
  if f=='minastirith-preview':build('minastirith',True)
  elif f in FAMILIES and f in globals():build(f)
  else:raise ValueError('Not an implemented authorized C family: '+f)
