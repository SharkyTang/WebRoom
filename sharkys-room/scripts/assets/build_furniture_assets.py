"""Original v0.6A furniture, in frozen anchor-local glTF Y-up metres.

Run after the desk/floor browser gate:
  Blender --background --python-exit-code 1 --python scripts/assets/build_furniture_assets.py -- FAMILY [...]
Families: bed bedside sofa chair coffee sidetable beanbag rugs dogbed.
No frozen source or v0.5 output is opened for writing.
"""
from pathlib import Path
import hashlib
import math
import sys
import bpy
import numpy as np
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from v06a_blender_common import (
    PROJECT, reset, root, pbr, box, cylinder, combine, mesh_web, project_uv,
    wood_material, png_write, export_family,
)

TAU = math.pi * 2


def textile(name, color, rough=.9):
    """Original 512px repeating warp/weft color; no reference pixels or baked light."""
    filename = name.lower().replace('mat_v06a_', '') + '_weave_512.png'
    path = PROJECT / 'assets-source/v06a/shared' / filename
    if not path.exists():
        y, x = np.mgrid[0:512, 0:512]
        warp = .014 * np.cos(x * math.pi / 2) * (.65 + .35 * np.cos(y * math.pi / 8))
        weft = .011 * np.cos(y * math.pi / 2) * (.65 - .35 * np.cos(x * math.pi / 8))
        broad = .007 * np.cos((x + y) * TAU / 64)
        pixels = np.stack([np.clip(c + warp + weft + broad, 0, 1) for c in color], axis=-1)
        png_write(path, np.round(pixels * 255).astype(np.uint8))
    image = bpy.data.images.load(str(path), check_existing=True)
    image.colorspace_settings.name = 'sRGB'
    image.pack()
    material = pbr(name, (1, 1, 1), 0, rough)
    texture = material.node_tree.nodes.new('ShaderNodeTexImage')
    texture.image = image
    texture.extension = 'REPEAT'
    material.node_tree.links.new(texture.outputs['Color'], material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    return material


def signed_power(value, exponent):
    return math.copysign(abs(value) ** exponent, value)


def rotate_x(point, angle):
    x, y, z = point
    c, s = math.cos(angle), math.sin(angle)
    return x, y*c-z*s, y*s+z*c


def cushion(name, center, size, material, parent, exponent=.45, horizontal=.35, tilt=0, rings=10, segments=24):
    """Closed superellipsoid: rounded broad cushion surfaces, not a recolored cube."""
    def placed(point):
        rotated = rotate_x(point, tilt)
        return tuple(center[i] + rotated[i] for i in range(3))
    # Use one exact vertex at each pole. pow(cos(pi/2), exponent) is nonzero
    # in floating point and would leave a microscopic hole in a ring-based cap.
    vertices = [placed((0, -size[1]/2, 0))]
    for row in range(1, rings):
        latitude = -math.pi/2 + row*math.pi/rings
        radius = abs(math.cos(latitude)) ** exponent
        for column in range(segments):
            theta = column*TAU/segments
            p = (size[0]/2*radius*signed_power(math.cos(theta), horizontal),
                 size[1]/2*signed_power(math.sin(latitude), exponent),
                 size[2]/2*radius*signed_power(math.sin(theta), horizontal))
            vertices.append(placed(p))
    top = len(vertices)
    vertices.append(placed((0, size[1]/2, 0)))
    faces = []
    for column in range(segments):
        faces.append((0, 1+column, 1+(column+1) % segments))
        last = 1+(rings-2)*segments
        faces.append((top, last+(column+1) % segments, last+column))
    for row in range(rings-2):
        for column in range(segments):
            nxt = (column + 1) % segments
            faces.append((1+row*segments+column, 1+(row+1)*segments+column, 1+(row+1)*segments+nxt, 1+row*segments+nxt))
    obj = mesh_web(name, vertices, faces, material, parent, smooth=True)
    project_uv(obj, 0, 2.4)
    return obj


def tube(name, points, radius, material, parent, sides=4, closed=False):
    """Low-cost seam or piping; all vertices remain part of the editable mesh."""
    vectors = [Vector(point) for point in points]
    vertices = []
    for index, point in enumerate(vectors):
        previous = vectors[index-1] if index or closed else point
        following = vectors[(index+1) % len(vectors)] if index+1 < len(vectors) or closed else point
        tangent = (following-previous).normalized()
        reference = Vector((0, 1, 0)) if abs(tangent.y) < .92 else Vector((1, 0, 0))
        normal = tangent.cross(reference).normalized()
        binormal = tangent.cross(normal).normalized()
        for side in range(sides):
            offset = radius*(math.cos(side*TAU/sides)*normal + math.sin(side*TAU/sides)*binormal)
            vertices.append(tuple(point + offset))
    faces = []
    for index in range(len(vectors) if closed else len(vectors)-1):
        for side in range(sides):
            following = (index+1) % len(vectors)
            faces.append((index*sides+side, index*sides+(side+1) % sides,
                          following*sides+(side+1) % sides, following*sides+side))
    if not closed:
        faces.extend([tuple(reversed(range(sides))), tuple((len(vectors)-1)*sides+i for i in range(sides))])
    return mesh_web(name, vertices, faces, material, parent, smooth=True)


def seam_loop(name, center, size, material, parent, y=0, tilt=0, radius=.0015):
    points = []
    for step in range(48):
        theta = step*TAU/48
        p = (size[0]/2*signed_power(math.cos(theta), .35), y,
             size[1]/2*signed_power(math.sin(theta), .35))
        p = rotate_x(p, tilt)
        points.append(tuple(center[i] + p[i] for i in range(3)))
    return tube(name, points, radius, material, parent, closed=True)


def support(name, objects):
    result = combine(name, objects)
    result['v06a_support'] = True
    return result


def rod(name, start, end, radius, material, parent, segments=12):
    a, b = Vector(start), Vector(end)
    direction = b-a
    return cylinder(name, tuple((a+b)/2), radius, direction.length, material, parent, axis=tuple(direction.normalized()), vertices=segments)


def blanket(parent, material):
    vertices = []
    nx, nz = 24, 28
    for layer in range(2):
        for row in range(nz+1):
            v = row/nz*2-1
            for column in range(nx+1):
                u = column/nx*2-1
                rounded = 1-.025*abs(u*v)**8
                x = .808*u*rounded
                z = .22 + .768*v*rounded
                taper = max(0, (1-u*u)*(1-v*v))**.28
                folds = .008*math.sin(u*math.pi*5 + v*2.2) + .0035*math.sin(v*math.pi*6 + u*4)
                y = .539 + folds*taper + .004*(1-u*u)*(1-v*v) - (.016 if layer == 0 else 0)
                vertices.append((x, y, z))
    count = (nx+1)*(nz+1)
    faces = []
    for row in range(nz):
        for column in range(nx):
            a = row*(nx+1)+column
            faces.append((a, a+1, a+nx+2, a+nx+1))
            faces.append((count+a+nx+1, count+a+nx+2, count+a+1, count+a))
    boundary = list(range(nx+1)) + [row*(nx+1)+nx for row in range(1,nz+1)]
    boundary += [nz*(nx+1)+column for column in range(nx-1,-1,-1)]
    boundary += [row*(nx+1) for row in range(nz-1,0,-1)]
    for index, a in enumerate(boundary):
        b = boundary[(index+1) % len(boundary)]
        faces.append((a, count+a, count+b, b))
    return mesh_web('VIS_BedFoldedCover', vertices, faces, material, parent, uv_scale=(2.5,2.5), smooth=True)


def bed():
    parent = root('VIS_Bed', 'FUR_Bed')
    wood = wood_material(rough=.48)
    linen = textile('MAT_V06A_Linen', (.77,.73,.65))
    blue = textile('MAT_V06A_BlueGreyBedding', (.26,.34,.40))
    seam = pbr('MAT_V06A_BeddingSeams', (.48,.49,.46), 0, .84)
    metal = pbr('MAT_V06A_Graphite', (.055,.064,.065), .35, .42)
    wooden = [box('VIS_BedFrame', (0,.19,0), (1.64,.30,2.04), wood, parent, .028, 3),
              box('VIS_BedHeadboard', (0,.53,-1.054), (1.70,1.02,.092), wood, parent, .025, 3)]
    for obj in wooden: project_uv(obj, 0, 1.4)
    combine('VIS_BedWoodStructure', wooden)
    soft = [cushion('VIS_BedMattress', (0,.42,0), (1.60,.20,2.00), linen, parent, .36),
            cushion('VIS_BedHeadboardUpholstery', (0,.77,-1.0), (1.55,.43,.040), linen, parent, .4)]
    for x in [-.40,.40]:
        soft.append(cushion('VIS_BedPillow', (x,.582,-.67), (.66,.16,.42), linen, parent, .55, .5, rings=10))
    combine('VIS_BedLinenVolumes', soft)
    blanket(parent, blue)
    seams = [seam_loop('VIS_BedMattressPiping', (0,.43,0), (1.592,1.992), seam, parent, radius=.0015)]
    for x in [-.40,.40]: seams.append(seam_loop('VIS_BedPillowSeam', (x,.582,-.67), (.65,.41), seam, parent, radius=.0012))
    for x in [-.52,0,.52]: seams.append(tube('VIS_BedHeadboardStitch', [(x,.575,-.977),(x,.965,-.977)], .0012, seam, parent))
    combine('VIS_BedFineSeams', seams)
    legs = [cylinder('VIS_BedFoot', (x,.048,z), .028,.096,metal,parent,vertices=12) for x in [-.70,.70] for z in [-.85,.85]]
    support('VIS_BedSupportFeet', legs)


def bedside():
    parent = root('VIS_Bedside', 'FUR_BedsideTable')
    wood = wood_material(rough=.48)
    dark = pbr('MAT_V06A_Graphite', (.055,.064,.065), .18, .48)
    # Separate side/back panels leave a real recessed front instead of hiding
    # decorative drawer faces behind a solid coplanar box face.
    parts = [box('VIS_BedsideLeft',(-.287,-.005,0),(.026,.57,.53),wood,parent,.005,3),
             box('VIS_BedsideRight',(.287,-.005,0),(.026,.57,.53),wood,parent,.005,3),
             box('VIS_BedsideBack',(0,-.005,-.253),(.548,.57,.024),wood,parent,.003,2),
             box('VIS_BedsideBottom',(0,-.28,0),(.548,.02,.53),wood,parent,.003,2),
             box('VIS_BedsideTop',(0,.28,0),(.60,.02,.53),wood,parent,.006,3)]
    darks = []
    for y in [-.177,0,.177]:
        # Recessed shadow band and inset front: everything remains inside original Z=.265.
        darks.append(box('VIS_BedsideDrawerReveal',(0,y,.250),(.55,.162,.008),dark,parent,.003,2))
        parts.append(box('VIS_BedsideDrawer',(0,y,.255),(.536,.149,.008),wood,parent,.003,2))
        darks.append(box('VIS_BedsideInsetPull',(0,y+.04,.261),(.112,.008,.004),dark,parent,.001,2))
    for obj in parts: project_uv(obj,0,2)
    combine('VIS_BedsideWood',parts)
    combine('VIS_BedsideRevealsAndPulls',darks)


def sofa():
    parent = root('VIS_Sofa','FUR_Sofa')
    fabric = textile('MAT_V06A_TaupeUpholstery',(.48,.425,.365))
    seam = pbr('MAT_V06A_TaupeSeams',(.265,.235,.205),0,.88)
    metal = pbr('MAT_V06A_Graphite',(.055,.064,.065),.35,.42)
    parts = [cushion('VIS_SofaPlinth',(0,.25,0),(1.95,.27,.86),fabric,parent,.30),
             cushion('VIS_SofaBackStructure',(0,.61,-.36),(1.95,.62,.16),fabric,parent,.34)]
    for x in [-.91,.91]: parts.append(cushion('VIS_SofaArm',(x,.50,0),(.15,.44,.87),fabric,parent,.45))
    for x in [-.44,.44]: parts.append(cushion('VIS_SofaSeat',(x,.43,.025),(.84,.12,.66),fabric,parent,.48))
    for x in [-.38,.37]: parts.append(cushion('VIS_SofaBackCushion',(x,.69,-.21),(.66,.42,.15),fabric,parent,.55,.40,tilt=math.radians(-10)))
    combine('VIS_SofaUpholsteredVolumes',parts)
    seams=[]
    for x in [-.44,.44]: seams.append(seam_loop('VIS_SofaSeatPiping',(x,.434,.025),(.825,.645),seam,parent,radius=.0014))
    for x in [-.38,.37]:
        points=[]
        for step in range(48):
            theta=TAU*step/48
            local=(.322*signed_power(math.cos(theta),.4),.202*signed_power(math.sin(theta),.4),.073)
            rotated=rotate_x(local,math.radians(-10))
            points.append((x+rotated[0],.69+rotated[1],-.21+rotated[2]))
        seams.append(tube('VIS_SofaBackPiping',points,.0012,seam,parent,closed=True))
    combine('VIS_SofaSeams',seams)
    # The source 98-degree anchor rotation puts X=.78/Z=.23 beyond the rug
    # corner. Pull only these new feet inward, leaving the frozen sofa untouched.
    legs=[cylinder('VIS_SofaFoot',(x,.078,z),.022,.114,metal,parent,vertices=12) for x in [-.72,.72] for z in [-.23,.23]]
    support('VIS_SofaSupportFeet',legs)


def chair():
    parent=root('VIS_Chair','FUR_OfficeChair')
    textile_mat=textile('MAT_V06A_ChairFabric',(.215,.25,.27),.85)
    metal=pbr('MAT_V06A_ChairGraphite',(.055,.064,.071),.40,.36)
    rubber=pbr('MAT_V06A_ChairRubber',(.028,.033,.036),.05,.85)
    upholstered=[cushion('VIS_ChairSeat',(0,.445,0),(.535,.10,.495),textile_mat,parent,.42),
                 cushion('VIS_ChairBack',(0,.77,.225),(.49,.54,.065),textile_mat,parent,.44)]
    for x in [-.235,.235]: upholstered.append(cushion('VIS_ChairArmrest',(x,.655,0),(.054,.034,.33),textile_mat,parent,.4,rings=6,segments=16))
    combine('VIS_ChairUpholstery',upholstered)
    frame=[cylinder('VIS_ChairGasLift',(0,.248,0),.035,.296,metal,parent,vertices=16),
           box('VIS_ChairBackSpine',(0,.682,.248),(.047,.398,.026),metal,parent,.010,3)]
    for x in [-.222,.222]: frame.append(box('VIS_ChairArmPost',(x,.565,.10),(.027,.15,.026),metal,parent,.008,2))
    wheels=[]
    for degree in [0,72,144,216,288]:
        angle=math.radians(degree)
        x,z=.265*math.cos(angle),-.265*math.sin(angle)
        frame.append(rod('VIS_ChairStarSpoke',(0,.105,0),(x,.078,z),.017,metal,parent))
        frame.append(cylinder('VIS_ChairCasterPin',(x,.079,z),.012,.050,metal,parent,vertices=10))
        wheels.append(cylinder('VIS_ChairCasterWheel',(x,.044,z),.028,.035,rubber,parent,axis=(math.sin(angle),0,math.cos(angle)),vertices=16))
    combine('VIS_ChairFrame',frame)
    support('VIS_ChairSupportWheels',wheels)


def coffee():
    parent=root('VIS_Coffee','FUR_CoffeeTable')
    wood=wood_material(rough=.44)
    metal=pbr('MAT_V06A_Graphite',(.055,.064,.065),.4,.38)
    top=box('VIS_CoffeeTop',(0,.445,0),(1.10,.07,.65),wood,parent,.024,4)
    project_uv(top,0,1.8)
    legs=[box('VIS_CoffeeFoot',(x,.2205,z),(.055,.399,.055),metal,parent,.009,3) for x in [-.43,.43] for z in [-.22,.22]]
    support('VIS_CoffeeSupportFeet',legs)


def sidetable():
    parent=root('VIS_SideTable','FUR_SideTable')
    wood=wood_material(rough=.43)
    metal=pbr('MAT_V06A_Graphite',(.055,.064,.065),.4,.38)
    top=cylinder('VIS_SideTableRoundTop',(0,.255,0),.24,.03,wood,parent,vertices=40)
    project_uv(top,0,2.2)
    legs=[]
    for degree in [90,210,330]:
        angle=math.radians(degree)
        legs.append(cylinder('VIS_SideTableLeg',(.16*math.cos(angle),-.015,-.16*math.sin(angle)),.014,.51,metal,parent,vertices=12))
    support('VIS_SideTableSupportThreeLegs',legs)


def beanbag():
    parent=root('VIS_Beanbag','FUR_BeanBag')
    fabric=textile('MAT_V06A_BeanbagWeave',(.52,.49,.42))
    seam=pbr('MAT_V06A_BeanbagSeam',(.29,.275,.24),0,.90)
    n=48
    vertices=[(0,.315,.025)]
    rings=[]
    # Concave seat -> rising rear bolster -> skirt -> flat grounded underside.
    for r in [.22,.45,.68,.84,1.0]:
        ring=[]
        for index in range(n):
            t=index*TAU/n
            rear=max(0,-math.sin(t))**1.8
            radial=1-.018*math.sin(t*7+r*4)**2*r
            x=.387*r*math.cos(t)*radial
            z=-.022*r + .389*r*math.sin(t)*radial
            y=.315+.045*r*r + .39*rear*r**2.5 + .007*math.sin(t*8+r*3)*r*(1-r*.7)
            ring.append(len(vertices));vertices.append((x,y,z))
        rings.append(ring)
    for level in [(.94,.15),(.78,.025),(.64,0)]:
        scale,height=level;ring=[]
        for index in range(n):
            t=index*TAU/n
            radial=1-.012*math.sin(t*7)**2
            ring.append(len(vertices));vertices.append((.387*scale*math.cos(t)*radial,height,-.022*scale+.389*scale*math.sin(t)*radial))
        rings.append(ring)
    bottom=len(vertices);vertices.append((0,0,0))
    faces=[]
    for index in range(n): faces.append((0,rings[0][index],rings[0][(index+1)%n]))
    for first,second in zip(rings,rings[1:]):
        for index in range(n): faces.append((first[index],second[index],second[(index+1)%n],first[(index+1)%n]))
    for index in range(n): faces.append((bottom,rings[-1][(index+1)%n],rings[-1][index]))
    faces=[tuple(reversed(face)) for face in faces]
    body=mesh_web('VIS_BeanbagSculptedSeat',vertices,faces,fabric,parent,uv_scale=(3,3),smooth=True)
    body['v06a_shape']='Single concave seat shell with raised back, soft skirt and grounded base; no two-sphere substitute'
    # A seam centered on a shell edge intersects that shell and flickers at Hero
    # depth precision. Offset the whole seam by the actual outward surface normal.
    normals=[Vector((0,0,0)) for _ in vertices]
    for face in faces:
        a=Vector(vertices[face[0]])
        normal=Vector((0,0,0))
        for offset in range(1,len(face)-1):
            normal += (Vector(vertices[face[offset]])-a).cross(Vector(vertices[face[offset+1]])-a)
        for vertex in face: normals[vertex] += normal
    normals=[normal.normalized() for normal in normals]
    seam_parts=[]
    for index in [3,15,27,39]:
        points=[tuple(Vector(vertices[rings[row][index]])+normals[rings[row][index]]*.0025+
                      Vector((0,.007 if row < 5 else 0,0))) for row in reversed(range(len(rings)-1))]
        seam_parts.append(tube('VIS_BeanbagPanelSeam',points,.0010,seam,parent))
    combine('VIS_BeanbagSeams',seam_parts)


def rugs():
    cloth=textile('MAT_V06A_RugWeave',(.57,.585,.55),.95)
    border=textile('MAT_V06A_RugBorder',(.34,.39,.39),.93)
    for name,anchor,width,depth,bottom,top in [
        ('VIS_RugWorkstation','DEC_Rug_Workstation',2.94,2.00,-.008,.008),
        ('VIS_RugLounge','DEC_Rug_Lounge',2.82,1.77,-.012,.009),
    ]:
        parent=root(name,anchor)
        # The upper border/field share one plane; there are no stacked coplanar faces.
        base=box(name+'Backing',(0,(bottom+top-.002)/2,0),(width,top-.002-bottom,depth),border,parent,.004,3)
        edge=.038
        frame=[base]
        for x in [-width/2+edge/2,width/2-edge/2]: frame.append(box(name+'LongBinding',(x,top-.001,0),(edge,.002,depth),border,parent,.0005,2))
        for z in [-depth/2+edge/2,depth/2-edge/2]: frame.append(box(name+'ShortBinding',(0,top-.001,z),(width-edge*2,.002,edge),border,parent,.0005,2))
        combine(name+'BoundEdge',frame)
        x,z=width/2-edge,depth/2-edge
        mesh_web(name+'WovenField',[(-x,top,-z),(-x,top,z),(x,top,z),(x,top,-z)],[(0,1,2,3)],cloth,parent,uv_scale=(2.5,2.5))


def dogbed():
    parent=root('VIS_DogBed','DEC_DogBedProxy')
    outer=textile('MAT_V06A_DogBedUpholstery',(.48,.43,.355))
    inner=textile('MAT_V06A_DogBedCushion',(.65,.595,.50))
    shell=[cushion('VIS_DogBedBase',(0,.025,0),(1.09,.05,.74),outer,parent,.7,.7,rings=8,segments=32)]
    vertices=[];faces=[];around,cross=48,12
    for i in range(around):
        t=i*TAU/around
        entrance=1-.25*max(0,math.sin(t))**8
        for j in range(cross):
            a=j*TAU/cross
            vertices.append(((.464+.077*math.cos(a))*math.cos(t),
                             .117 + .076*entrance*math.sin(a),
                             (.291+.077*math.cos(a))*math.sin(t)))
    for i in range(around):
        for j in range(cross): faces.append((i*cross+j,i*cross+(j+1)%cross,((i+1)%around)*cross+(j+1)%cross,((i+1)%around)*cross+j))
    shell.append(mesh_web('VIS_DogBedBolsteredRim',vertices,faces,outer,parent,uv_scale=(3,3),smooth=True))
    combine('VIS_DogBedSoftSurround',shell)
    cushion('VIS_DogBedInsetPad',(0,.056,0),(.79,.058,.43),inner,parent,.65,.7,rings=8,segments=32)
    parent['v06a_partial_proxy']='Replace DEC_DogBedProxy_Mesh only; preserve DEC_DogBedProxy_Mesh_1 for future C dog'


BUILDERS={'bed':bed,'bedside':bedside,'sofa':sofa,'chair':chair,'coffee':coffee,'sidetable':sidetable,'beanbag':beanbag,'rugs':rugs,'dogbed':dogbed}

if __name__ == '__main__':
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    if not args:
        raise SystemExit('Specify explicit furniture families after the desk/floor browser gate; no automatic all-family generation.')
    assert all(family in BUILDERS for family in args), args
    protected=[PROJECT/'public/models/sharkys_room_blockout_FINAL.glb']
    protected += [PROJECT/'public/models/production'/f'{family}_pilot.glb' for family in ['monitor','macbook','marshall']]
    hashes={path:hashlib.sha256(path.read_bytes()).hexdigest() for path in protected}
    for family in args:
        reset();BUILDERS[family]();export_family(family,generator='build_furniture_assets.py')
    assert all(hashlib.sha256(path.read_bytes()).hexdigest()==digest for path,digest in hashes.items())
