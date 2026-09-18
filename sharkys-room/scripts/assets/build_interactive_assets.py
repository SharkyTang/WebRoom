"""Original v0.6B assets, authored in frozen-anchor local glTF Y-up metres.

Reuses the established v0.5 primitive/export conventions without rebuilding A.
No source node, animation, light or camera is exported with these visual assets.
"""
from pathlib import Path
import hashlib
import json
import math
import struct
import sys
import bpy
import bmesh
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_production_assets import xyz, web, pbr, box, cylinder, combine, rounded_plane, finish
from v06a_blender_common import mesh_web, reset, bounds

PROJECT = Path(__file__).resolve().parents[2]
SOURCE = PROJECT / 'public/models/sharkys_room_blockout_FINAL.glb'
FAMILIES = ('piano', 'ipad', 'phone', 'trashcan', 'lightswitch', 'keyboard', 'mouse', 'headphones')


def root(name, anchor):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj['v06b_anchor'] = anchor
    obj['coordinate_contract'] = 'identity root, metre-scale glTF Y-up anchor-local vertices'
    return obj


def material(name, color, metal=0, rough=.4):
    mat = pbr('MAT_V06B_' + name, color, metal, rough)
    mat.use_backface_culling = True
    return mat


def group_materials(prefix, objects):
    """Merge static repeated parts per material within ONE independently moving root."""
    grouped = {}
    for obj in objects:
        key = (obj.parent.name, obj.data.materials[0].name)
        grouped.setdefault(key, []).append(obj)
    for index, parts in enumerate(grouped.values()):
        combine(prefix + str(index), parts)


def piano():
    body = root('VIS_PianoBody', 'INT_Piano')
    slide = root('VIS_PianoSlide', 'INT_PianoRail')
    charcoal = material('Piano_SatinCasing', (.034,.043,.052), .22, .32)
    ivory = material('Piano_Ivory', (.87,.86,.81), 0, .27)
    ebony = material('Piano_Ebony', (.009,.012,.016), .03, .30)
    metal = material('Piano_SlideMetal', (.20,.23,.26), .72, .31)
    parts = []
    # The old envelope is x±.67, y[-.05,.054], z±.18. Keys and controls
    # occupy that volume instead of being added above the old top plane.
    parts.append(box('VIS_Piano_LowerCase',(0,-.015,0),(1.326,.065,.351),charcoal,body,.006,3))
    parts.append(box('VIS_Piano_RearControlDeck',(0,.030,-.133),(1.294,.038,.084),charcoal,body,.004,2))
    for x in (-.65,.65):
        parts.append(box('VIS_Piano_Cheek',(x,.019,.004),(.034,.065,.348),charcoal,body,.004,2))
    parts.append(box('VIS_Piano_FrontLip',(0,-.009,.173),(1.294,.04,.01),charcoal,body,.002,2))
    # 88-key visual layout: A0 through C8, 52 ivory fronts and 36 raised black keys.
    white_width = 1.256 / 52
    pitch_classes = [0,2,4,5,7,9,11]
    keys = list(range(21,109))
    white_notes = [note for note in keys if note % 12 in pitch_classes]
    white_index = {note: i for i,note in enumerate(white_notes)}
    for note in white_notes:
        i = white_index[note]
        x = -.628 + (i+.5)*white_width
        parts.append(box('VIS_Piano_WhiteKey',(x,.025,.050),(white_width-.0012,.024,.232),ivory,body,.00065,1))
    for note in keys:
        if note % 12 in pitch_classes:
            continue
        left = white_index[note-1]
        x = -.628 + (left+1)*white_width
        parts.append(box('VIS_Piano_BlackKey',(x,.040,-.008),(white_width*.58,.026,.126),ebony,body,.0009,1))
    # Restrained physical controls; no screen, audio, emitters or extra interactions.
    parts.append(box('VIS_Piano_ControlInset',(-.424,.0495,-.131),(.22,.001,.039),ebony,body,.002,2))
    for i in range(5):
        parts.append(box('VIS_Piano_ControlButton',(-.49+i*.033,.0512,-.133),(.019,.003,.020),metal,body,.001,1))
    parts.append(cylinder('VIS_Piano_VolumeDial',(-.588,.0505,-.132),.012,.005,metal,body,vertices=20))
    # Side runners and a tray bottom remain inside the same protected envelope.
    runners = [box('VIS_Piano_Tray',(0,-.049,0),(1.332,.002,.352),metal,slide,.0007,1)]
    for x in (-.666,.666):
        runners.append(box('VIS_Piano_SideRunner',(x,-.033,0),(.006,.030,.354),metal,slide,.001,1))
        for z in (-.135,.135):
            runners.append(cylinder('VIS_Piano_RunnerFastener',(x,-.032,z),.004,.002,metal,slide,axis=(1,0,0),vertices=12))
    group_materials('VIS_PianoCaseAndKeys_', parts)
    combine('VIS_PianoSlideHardware', runners)


def ipad():
    body = root('VIS_iPadBody', 'TEC_iPad')
    alloy = material('iPad_SatinAlloy', (.32,.36,.39), .72, .3)
    glass = material('iPad_GlassBezel', (.008,.012,.017), .04, .24)
    display = material('iPad_Display', (1,1,1), 0, .4)
    box('VIS_iPadHousing',(0,-.0005,0),(.248,.014,.178),alloy,body,.005,4)
    bezel = [box('VIS_iPadBezel',(0,.007,0),(.245,.004,.175),glass,body,.004,3)]
    bezel.append(cylinder('VIS_iPadCamera',(.119,.00925,0),.0016,.0005,glass,body,vertices=12))
    combine('VIS_iPadBezelAndCamera',bezel)
    # Rotate an upright XY display -90 degrees around X in the vertices only:
    # +Y is the face, -Z its top; exported UV V=0 remains at that top.
    screen = rounded_plane('VIS_iPadDisplaySurface',.227,.157,.005,(0,0,0),display,body)
    for vertex in screen.data.vertices:
        x,y,z=web(vertex.co)
        vertex.co=xyz((x,.0098+z,-y))
    screen.data.update()
    screen['surface_orientation']='front +Y; top -Z; exported glTF UV top-left'


def phone():
    body = root('VIS_PhoneBody', 'TEC_Phone')
    stand = root('VIS_PhoneStand', 'TEC_Phone')
    stand.parent = body
    alloy = material('Phone_SatinFrameAndStand', (.29,.33,.37), .7, .3)
    black = material('Phone_GlassAndRubber', (.008,.012,.018), .02, .28)
    display = material('Phone_Display', (1,1,1), 0, .4)
    box('VIS_PhoneHousing',(0,0,-.0005),(.082,.164,.016),alloy,body,.006,4)
    bezel=[box('VIS_PhoneBezel',(0,0,.0085),(.080,.162,.003),black,body,.006,3)]
    bezel.append(box('VIS_PhoneSpeaker',(0,.074,.0104),(.019,.002,.0007),black,body,.0005,2))
    combine('VIS_PhoneGlassDetails',bezel)
    rounded_plane('VIS_PhoneDisplaySurface',.072,.145,.005,(0,-.001,.0102),display,body)
    # World-horizontal base is inverse-baked into the frozen -12deg phone frame.
    base=box('VIS_PhoneStandBase',(.16,.7435,-1.762),(.106,.006,.106),alloy,stand,.006,3)
    c,s=math.cos(math.radians(12)),math.sin(math.radians(12))
    for vertex in base.data.vertices:
        x,y,z=web(vertex.co); dy,dz=y-.84,z+1.75
        vertex.co=xyz((x-.16,c*dy-s*dz,s*dy+c*dz))
    base.data.update()
    structure=[base,box('VIS_PhoneStandSpine',(0,-.017,-.019),(.018,.150,.009),alloy,stand,.003,3),
        box('VIS_PhoneCradle',(0,-.0845,.0015),(.092,.004,.03),alloy,stand,.002,2),
        box('VIS_PhoneCradleFrontLip',(0,-.080,.016),(.092,.009,.003),alloy,stand,.001,2)]
    combine('VIS_PhoneStandStructure',structure)


def lathe(name, profile, mat, parent, center=(0,0,0), segments=48):
    """Revolve a closed radial section, retaining real inner walls and open cavities."""
    verts, rings, faces = [], [], []
    for radius,y in profile:
        ring=[]
        for i in range(segments if radius else 1):
            angle=2*math.pi*i/segments
            ring.append(len(verts)); verts.append((center[0]+radius*math.cos(angle),center[1]+y,center[2]+radius*math.sin(angle)))
        rings.append(ring)
    for a,b in zip(rings,rings[1:]):
        for i in range(segments):
            j=(i+1)%segments
            faces.append((a[0],b[i],b[j]) if len(a)==1 else (a[i],b[0],a[j]) if len(b)==1 else (a[i],b[i],b[j],a[j]))
    return mesh_web(name,verts,faces,mat,parent,smooth=True)


def trashcan():
    body=root('VIS_TrashCanBody','INT_TrashCanBody')
    lid=root('VIS_TrashCanLid','INT_TrashCanLid')
    shell=material('TrashCan_WarmEnamel',(.65,.66,.63),.22,.35)
    inside=material('TrashCan_InnerLiner',(.055,.064,.067),.04,.65)
    # One continuous cross-section: outside, rolled lip, inside, inset floor.
    profile=[(0,-.224),(.148,-.224),(.158,-.216),(.185,.203),(.19,.215),(.187,.224),(.178,.224),(.175,.211),(.146,-.19),(0,-.194)]
    bowl=lathe('VIS_TrashCanHollowShell',profile,shell,body)
    bowl.data.materials.append(inside)
    for face in bowl.data.polygons:
        if face.index>=6*48: face.material_index=1
    # Original lid pivot is the rear edge; all authored vertices extend toward +Z.
    cover=[cylinder('VIS_TrashCanCover',(0,0,.193),.192,.022,shell,lid,vertices=48),
        box('VIS_TrashCanHinge',(0,0,.007),(.10,.020,.014),shell,lid,.003,3)]
    combine('VIS_TrashCanLidShell',cover)
    # Small inset skirt bridges the old 11.5mm visual gap without moving either pivot.
    # Its outer radius .176 is inside the .178+ mouth, leaving radial clearance.
    lathe('VIS_TrashCanLidInnerSkirt',[(.172,-.011),(.172,-.026),(.176,-.026),(.176,-.011),(.172,-.011)],inside,lid,(0,0,.193))


def lightswitch():
    plate=root('VIS_LightSwitchPlate','DEC_LightSwitchPlate')
    rocker=root('VIS_LightSwitchRocker','INT_LightSwitch')
    ivory=material('LightSwitch_IvoryPolymer',(.77,.75,.69),0,.33)
    inset=material('LightSwitch_InsetAndMark',(.12,.14,.15),.12,.48)
    box('VIS_LightSwitchPlateHousing',(0,0,0),(.025,.178,.118),ivory,plate,.005,4)
    box('VIS_LightSwitchSocket',(.012,0,0),(.005,.116,.084),inset,plate,.003,3)
    box('VIS_LightSwitchMovingPaddle',(0,0,0),(.020,.096,.063),ivory,rocker,.005,4)
    box('VIS_LightSwitchPhysicalMark',(.0105,.03,0),(.0006,.003,.022),inset,rocker,.0002,1)


def ellipsoid(name, center, radii, mat, parent):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=xyz(center))
    obj=bpy.context.object; obj.scale=(radii[0],radii[2],radii[1])
    finish(obj,name,mat,parent)
    for face in obj.data.polygons: face.use_smooth=True
    return obj


def keyboard():
    body=root('VIS_Keyboard','TEC_Keyboard')
    shell=material('Keyboard_CaseAndFeet',(.026,.035,.042),.25,.4)
    keymat=material('Keyboard_Keycaps',(.12,.16,.18),.06,.46)
    accent=material('Keyboard_AccentKeys',(.29,.39,.39),.12,.42)
    parts=[box('VIS_KeyboardChassis',(0,-.004,0),(.438,.018,.154),shell,body,.005,3)]
    for x in (-.18,.18):
        for z in (-.052,.052): parts.append(box('VIS_KeyboardFoot',(x,-.019,z),(.032,.013,.022),shell,body,.002,2))
    pitch=.021; left=-.202
    layouts=[[1]*13+[2],[1.5]+[1]*12+[1.5],[1.75]+[1]*11+[2.25],[2.25]+[1]*10+[2.75],[1.25,1.25,1.25,6.25,1.25,1.25,1.25,1.25]]
    for row,widths in enumerate(layouts):
        cursor=left
        for index,units in enumerate(widths):
            width=units*pitch
            parts.append(box('VIS_KeyboardTypingKey',(cursor+width/2,.0085,-.026+row*.022),(width-.002,.010,.019),keymat,body,.0015,1))
            cursor+=width
    # Separated function/navigation/arrow groups, distinct from the long space bar.
    for index in range(13):
        x=left+.5*pitch+index*.024
        parts.append(box('VIS_KeyboardFunctionKey',(x,.007,-.06),(.019,.009,.014),accent if index==0 else keymat,body,.0015,1))
    for x in (.137,.158,.179):
        for z in (-.026,-.004): parts.append(box('VIS_KeyboardNavigation',(x,.0085,z),(.019,.010,.019),keymat,body,.0015,1))
        parts.append(box('VIS_KeyboardArrow',(x,.0085,.062),(.019,.010,.019),accent,body,.0015,1))
    parts.append(box('VIS_KeyboardArrowUp',(.158,.0085,.040),(.019,.010,.019),accent,body,.0015,1))
    # Key undersides sit inside the opaque case (.0035 < casing top .005).
    # Drop those occluded polygons; retain visible key silhouette and seams.
    for obj in parts:
        if obj.data.materials[0] == shell:
            continue
        bm=bmesh.new(); bm.from_mesh(obj.data)
        hidden=[face for face in bm.faces if web(face.normal)[1] < -.999]
        bmesh.ops.delete(bm,geom=hidden,context='FACES')
        bm.to_mesh(obj.data); bm.free()
    group_materials('VIS_KeyboardMerged_',parts)


def mouse():
    body=root('VIS_Mouse','TEC_Mouse')
    shell=material('Mouse_CurvedShell',(.16,.20,.22),.25,.34)
    dark=material('Mouse_ButtonsAndSole',(.035,.047,.055),.05,.43)
    metal=material('Mouse_ScrollWheel',(.40,.44,.43),.65,.31)
    # A broad flat lower shell meets the desk; a full ellipsoid would look perched
    # on a separate platform. The upper dome still matches the button surfaces.
    profile=[(0,-.0225),(.91,-.0225),(.99,-.017),(1,-.0035)]
    profile += [(math.cos(math.pi*i/24),-.0035+.019*math.sin(math.pi*i/24)) for i in range(1,12)]
    profile.append((0,.0155))
    mouse_shell=lathe('VIS_MouseShell',profile,shell,body,segments=32)
    for vertex in mouse_shell.data.vertices:
        x,y,z=web(vertex.co); vertex.co=xyz((x*.032,y,z*.051))
    mouse_shell.data.update()
    details=[ellipsoid('VIS_MouseSole',(0,-.024,0),(.023,.0015,.033),dark,body)]
    # Two curved button skins separated by an actual center gap, following the shell.
    for side in (-1,1):
        verts=[]; faces=[]; cols=6; rows=9
        for row in range(rows):
            z=-.043+row*.037/(rows-1)
            limit=.032*math.sqrt(1-(z/.051)**2)
            for col in range(cols):
                x=side*(.0012+(limit*.87-.0012)*col/(cols-1))
                y=-.0035+.019*math.sqrt(max(0,1-(x/.032)**2-(z/.051)**2))+.00065
                verts.append((x,y,z))
        for row in range(rows-1):
            for col in range(cols-1):
                a=row*cols+col
                face=(a,a+cols,a+cols+1,a+1)
                faces.append(face if side==1 else tuple(reversed(face)))
        details.append(mesh_web('VIS_MouseButton',verts,faces,dark,body,smooth=True))
    combine('VIS_MouseButtonsAndSole',details)
    cylinder('VIS_MouseScrollWheel',(0,.010,-.019),.006,.010,metal,body,axis=(1,0,0),vertices=20)


def band(name, parent, mat, outer, inner, half_depth, segments=28):
    verts=[]; faces=[]
    for i in range(segments+1):
        a=math.pi*i/segments
        for rx,ry,z in [(outer[0],outer[1],-half_depth),(outer[0],outer[1],half_depth),(inner[0],inner[1],half_depth),(inner[0],inner[1],-half_depth)]:
            verts.append((rx*math.cos(a),.095+ry*math.sin(a),z))
    for i in range(segments):
        for j in range(4): faces.append((i*4+j,i*4+(j+1)%4,(i+1)*4+(j+1)%4,(i+1)*4+j))
    faces.extend([(3,2,1,0),tuple(segments*4+j for j in range(4))])
    obj=mesh_web(name,verts,faces,mat,parent,smooth=True)
    bm=bmesh.new(); bm.from_mesh(obj.data); bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces)); bm.to_mesh(obj.data); bm.free()
    return obj


def headphones():
    body=root('VIS_Headphones','TEC_Headphones')
    casing=material('Headphones_SatinCasing',(.075,.098,.115),.24,.35)
    cushion=material('Headphones_SoftPads',(.021,.028,.034),0,.72)
    metal=material('Headphones_StandAlloy',(.29,.34,.36),.72,.32)
    parts=[band('VIS_HeadphonesOuterBand',body,casing,(.106,.121),(.09,.105),.022),
        band('VIS_HeadphonesHeadPad',body,cushion,(.091,.105),(.083,.100),.020),
        box('VIS_HeadphonesStandBase',(0,-.007,0),(.168,.015,.117),metal,body,.008,4),
        cylinder('VIS_HeadphonesStandPost',(0,.094,-.019),.006,.19,metal,body,vertices=20),
        box('VIS_HeadphonesStandSaddle',(0,.194,0),(.050,.012,.046),metal,body,.006,3)]
    for side in (-1,1):
        parts.append(ellipsoid('VIS_HeadphonesEarCup',(side*.098,.063,0),(.025,.046,.037),casing,body))
        parts.append(ellipsoid('VIS_HeadphonesEarPad',(side*.080,.063,0),(.014,.039,.032),cushion,body))
    group_materials('VIS_HeadphonesMerged_',parts)


def stats(family):
    bpy.context.view_layer.update()
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    for obj in meshes:
        obj.data.calc_loop_triangles()
    roots = [o for o in bpy.context.scene.objects if o.parent is None]
    return {'version':'0.6B','family':family,'triangles':sum(len(o.data.loop_triangles) for o in meshes),
        'meshCount':len(meshes),'uvMeshes':sum(bool(o.data.uv_layers) for o in meshes),
        'materialCount':len({m.name for o in meshes for m in o.data.materials}),
        'materials':sorted({m.name for o in meshes for m in o.data.materials}),
        'roots':{o.name:{'anchor':o.get('v06b_anchor'),'location':list(o.location),'rotation':list(o.rotation_euler),
            'scale':list(o.scale),'localBoxYUp':bounds([o]+list(o.children_recursive))} for o in roots},
        'sourceSHA256':hashlib.sha256(SOURCE.read_bytes()).hexdigest()}


def build(family):
    reset()
    globals()[family]()
    result = stats(family)
    folder = PROJECT/'assets-source/v06b'/family
    folder.mkdir(parents=True,exist_ok=True)
    blend = PROJECT/'blender-assets'/f'{family}_v06b.blend'
    glb = PROJECT/'public/models/production'/f'{family}_v06b.glb'
    bpy.context.scene['source'] = 'Original procedural stylized approximation, no manufacturer model or licensed product marks'
    bpy.context.scene['reproduce'] = f'node scripts/assets/build-interactive-assets.mjs {family}'
    bpy.context.scene['frozen_source_sha256'] = result['sourceSHA256']
    bpy.ops.wm.save_as_mainfile(filepath=str(blend),check_existing=False)
    bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_yup=True,export_apply=True,
        export_texcoords=True,export_normals=True,export_materials='EXPORT',export_extras=True,
        export_cameras=False,export_lights=False,export_animations=False,export_image_format='AUTO')
    data = glb.read_bytes()
    doc = json.loads(data[20:20+struct.unpack_from('<I',data,12)[0]])
    result.update({'glbBytes':len(data),'blendBytes':blend.stat().st_size,'glbSHA256':hashlib.sha256(data).hexdigest(),
        'gltfPrimitives':sum(len(m['primitives']) for m in doc.get('meshes',[])),
        'textureCount':len(doc.get('images',[])),
        'embeddedImageBytes':sum(doc['bufferViews'][i['bufferView']]['byteLength'] for i in doc.get('images',[])),
        'exportRootTransforms':{doc['nodes'][n]['name']:{k:doc['nodes'][n].get(k) for k in ('translation','rotation','scale','matrix')}
            for n in doc['scenes'][doc.get('scene',0)]['nodes']}})
    reset()
    bpy.ops.import_scene.gltf(filepath=str(glb))
    after=stats(family)
    checks={'meshCount':after['meshCount']==result['meshCount'],'triangles':after['triangles']==result['triangles'],
        'uvEveryMesh':after['uvMeshes']==after['meshCount'],'sameRoots':set(after['roots'])==set(result['roots'])}
    for name,value in result['roots'].items():
        a,b=value['localBoxYUp'],after['roots'][name]['localBoxYUp']
        checks[name+'_bounds']=max(abs(a[k][i]-b[k][i]) for k in ('min','max') for i in range(3))<1e-6
    assert all(checks.values()),checks
    result['roundtripChecks']=checks
    (folder/'asset-statistics.json').write_text(json.dumps(result,indent=2)+'\n')
    print('ASSET_COMPLETE '+json.dumps(result))


if __name__=='__main__':
    selected=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else list(FAMILIES)
    for family in selected:
        if family not in FAMILIES or family not in globals():
            raise ValueError('Family not implemented or not in B scope: '+family)
        build(family)
