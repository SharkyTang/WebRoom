"""Original v0.6A architecture. Explicit family arguments prevent unreviewed batches."""
import sys
import math
import json
from pathlib import Path
import bpy
sys.path.insert(0, str(Path(__file__).resolve().parent))
from v06a_blender_common import *


def prism(name, polygon_xz, top, bottom, material, parent):
    n = len(polygon_xz)
    vertices = [(x,top,z) for x,z in polygon_xz] + [(x,bottom,z) for x,z in polygon_xz]
    faces = [tuple(range(n)), tuple(reversed(range(n,2*n)))]
    faces += [(i+n,(i+1)%n+n,(i+1)%n,i) for i in range(n)]
    return mesh_web(name, vertices, faces, material, parent)


def clip_corner(polygon):
    out=[]
    for i,a in enumerate(polygon):
        b=polygon[(i+1)%len(polygon)]
        da,db=a[0]+a[1]-4.60,b[0]+b[1]-4.60
        if da <= 1e-9:
            out.append(a)
        if (da < 0) != (db < 0):
            t=da/(da-db)
            out.append((a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])))
    # A boundary through an existing corner may emit a duplicate point.
    clean=[]
    for p in out:
        if not clean or math.dist(p,clean[-1])>1e-7:
            clean.append(p)
    if len(clean)>1 and math.dist(clean[0],clean[-1])<1e-7:
        clean.pop()
    return clean


def floor():
    parent=root("VIS_Floor","ENV_Floor")
    wood=wood_material("MAT_V06A_FloorOak",rough=.50)
    edge=pbr("MAT_V06A_PlatformEdge",(.085,.060,.044),0,.55)
    seam=pbr("MAT_V06A_FloorSeam",(.045,.029,.018),0,.84)
    outline=[(-3.69,2.99),(1.61,2.99),(3.69,.91),(3.69,-2.99),(-3.69,-2.99)]
    prism("VIS_FloorCutawayPlinth",outline,-.019,-.12,edge,parent)
    prism("VIS_FloorJointSubstrate",outline,-.0025,-.020,seam,parent)
    planks=[]
    rows=34
    row_width=5.98/rows
    for row in range(rows):
        zmin=-2.99+row*row_width+.00075
        zmax=-2.99+(row+1)*row_width-.00075
        start=-3.69-(row%3)*.47
        col=0
        while start<3.69:
            x0=max(-3.69,start)+.00065
            x1=min(3.69,start+1.41)-.00065
            start+=1.41
            if x1<=x0: continue
            polygon=clip_corner([(x0,zmax),(x1,zmax),(x1,zmin),(x0,zmin)])
            if len(polygon)<3: continue
            o=prism(f"VIS_FloorPlank_{row}_{col}",polygon,0,-.017,wood,parent)
            finish(o,o.name,wood,parent,.0006,1)
            project_uv(o,grain_axis=0,scale=.72)
            for uv in o.data.uv_layers.active.data:
                uv.uv.x+=(row*.271+col*.173)%1
                uv.uv.y+=(row*.391+col*.137)%1
            planks.append(o)
            col+=1
    combine("VIS_FloorOakPlanks",planks)
    parent["cutawayOutlineXZ"]=json.dumps(outline)
    parent["plankCount"]=len(planks)
    parent["contactTopY"]=0.0


def desk():
    parent=root("VIS_Desk","FUR_Desk")
    wood=wood_material("MAT_V06A_DeskOak",rough=.40)
    dark=pbr("MAT_V06A_DeskStructure",(.048,.043,.038),.10,.48)
    handle=pbr("MAT_V06A_DeskBrushedHandles",(.13,.115,.095),.68,.35)
    labels=["Top","LeftPedestal","RightPedestal","RearBrace"]
    for info in source_components("FUR_Desk"):
        index=info["componentIndex"]
        b=info["localBoundsWeb"]
        lo,hi=b["min"],b["max"]
        c=[(lo[i]+hi[i])/2 for i in range(3)]
        s=[hi[i]-lo[i] for i in range(3)]
        group=component(f"VIS_DeskSolid_{index}_{labels[index]}",parent,index,lo,hi)
        if index==0:
            top=box("VIS_DeskSolid_0_WoodTop",c,s,wood,group,.004,4)
            project_uv(top,grain_axis=0,scale=.75)
            top["v06a_support"]=True
        elif index==3:
            box("VIS_DeskSolid_3_RearBrace",c,s,dark,group,.004,3)
        else:
            shell=[]
            for x in (lo[0]+.009,hi[0]-.009):
                shell.append(box(f"VIS_Desk_{index}_Side",(x,c[1],c[2]),(.018,s[1],s[2]),wood,group,.002,3))
            shell.append(box(f"VIS_Desk_{index}_Back",(c[0],c[1],lo[2]+.009),(s[0]-.036,s[1],.018),wood,group,.002,3))
            shell.append(box(f"VIS_Desk_{index}_Top",(c[0],hi[1]-.009,c[2]),(s[0]-.036,.018,s[2]-.018),wood,group,.002,3))
            shell.append(box(f"VIS_Desk_{index}_Lower",(c[0],.035,c[2]),(s[0]-.036,.02,s[2]-.018),wood,group,.002,3))
            handles=[]
            for d,(y0,y1) in enumerate(((.055,.250),(.262,.449),(.461,.645))):
                shell.append(box(f"VIS_Desk_{index}_Drawer_{d}",(c[0],(y0+y1)/2,hi[2]-.009),(s[0]-.048,y1-y0,.016),wood,group,.0025,3))
                handles.append(box(f"VIS_Desk_{index}_Handle_{d}",(c[0],y1-.031,hi[2]-.001),(s[0]*.36,.007,.002),handle,group,.0008,2))
            for obj in shell: project_uv(obj,grain_axis=0,scale=.85)
            combine(f"VIS_DeskSolid_{index}_WoodCarcassAndDrawers",shell)
            combine(f"VIS_DeskSolid_{index}_Handles",handles)
            box(f"VIS_DeskSolid_{index}_RecessedToe",(c[0],.0125,c[2]-.014),(s[0]-.04,.025,s[2]-.06),dark,group,.003,3)


def walls():
    plaster=pbr("MAT_V06A_WarmPlaster",(.60,.53,.44),0,.88)
    trim=pbr("MAT_V06A_WallLowerTrim",(.15,.105,.072),0,.58)
    for side in ("Left","Right"):
        parent=root("VIS_Wall"+side,"ENV_Wall_"+side)
        bodies=[]; trims=[]
        for info in source_components("ENV_Wall_"+side):
            lo=list(info["localBoundsWeb"]["min"]);hi=list(info["localBoundsWeb"]["max"])
            if lo[1] < .001:
                c=[(lo[i]+hi[i])/2 for i in range(3)];s=[hi[i]-lo[i] for i in range(3)]
                c[1]=.0425;s[1]=.085
                trims.append(box(f"VIS_Wall{side}_Skirting",c,s,trim,parent,.0015,2))
                lo[1]=.085
            c=[(lo[i]+hi[i])/2 for i in range(3)];s=[hi[i]-lo[i] for i in range(3)]
            bodies.append(box(f"VIS_Wall{side}_Plaster",c,s,plaster,parent,.0025,2))
        combine(f"VIS_Wall{side}Plaster",bodies)
        combine(f"VIS_Wall{side}Skirting",trims)


def door():
    parent=root("VIS_DoorBody","ENV_Door")
    wood=wood_material("MAT_V06A_DoorOak",rough=.47)
    parts=[]
    for z in (-.4525,.4525):
        parts.append(box("VIS_Door_Stile",(0,0,z),(.075,2.13,.085),wood,parent,.004,3))
    for y in (-1.0125,1.0125):
        parts.append(box("VIS_Door_Rail",(0,y,0),(.075,.105,.82),wood,parent,.004,3))
    parts.append(box("VIS_Door_Crossrail",(0,.075,0),(.075,.10,.82),wood,parent,.003,3))
    parts.append(box("VIS_Door_UpperInset",(-.003,.544,0),(.058,.822,.813),wood,parent,.004,3))
    parts.append(box("VIS_Door_LowerInset",(-.003,-.467,0),(.058,.966,.813),wood,parent,.004,3))
    for obj in parts: project_uv(obj,grain_axis=1,scale=.75)
    combine("VIS_DoorPanelAndFrame",parts)
    handle_parent=root("VIS_DoorHandle","DEC_DoorHandle")
    brass=pbr("MAT_V06A_DoorSatinBrass",(.33,.235,.135),.74,.32)
    combine("VIS_DoorHandleLever",[
        cylinder("VIS_DoorHandle_Rosette",(-.011,0,0),.016,.019,brass,handle_parent,axis=(1,0,0),vertices=24),
        cylinder("VIS_DoorHandle_Spindle",(.003,0,0),.009,.033,brass,handle_parent,axis=(1,0,0),vertices=20),
        cylinder("VIS_DoorHandle_Grip",(.020,0,0),.008,.105,brass,handle_parent,axis=(0,0,1),vertices=20)])


def window():
    parent=root("VIS_WindowFrame","ENV_WindowFrame")
    graphite=pbr("MAT_V06A_WindowGraphite",(.075,.095,.11),.45,.34)
    edge=pbr("MAT_V06A_WindowSatinRebate",(.15,.17,.175),.60,.30)
    body=[]; fronts=[]
    for info in source_components("ENV_WindowFrame"):
        lo,hi=info["localBoundsWeb"]["min"],info["localBoundsWeb"]["max"]
        c=[(lo[i]+hi[i])/2 for i in range(3)];s=[hi[i]-lo[i] for i in range(3)]
        rear_size=s.copy();rear_size[2]-=.014
        rear_center=c.copy();rear_center[2]-=.007
        body.append(box("VIS_Window_ProfileBody",rear_center,rear_size,graphite,parent,.003,3))
        front_size=s.copy();front_size[2]=.014
        cross_axis=0 if s[1]>s[0] else 1
        front_size[cross_axis]*=.72
        front_center=c.copy();front_center[2]=hi[2]-.007
        fronts.append(box("VIS_Window_RebatedFace",front_center,front_size,edge,parent,.002,3))
    combine("VIS_WindowStructuralProfiles",body)
    combine("VIS_WindowInsetFaces",fronts)


def curtains():
    cloth=pbr("MAT_V06A_CurtainLinen",(.29,.225,.172),0,.91)
    header=pbr("MAT_V06A_CurtainHeader",(.255,.198,.149),0,.88)
    nx,ny=36,16
    for side in ("Left","Right"):
        parent=root("VIS_Curtain"+side,"ENV_Curtain_"+side)
        vertices=[]
        for layer in (-1,1):
            for j in range(ny+1):
                v=j/ny
                for i in range(nx+1):
                    u=i/nx
                    x=-.148+.296*u
                    y=-1.395+2.784*v + .004*math.sin(u*8*math.pi)*(1-v)**7
                    z=.071*math.sin(u*10*math.pi+.08*math.sin(v*4*math.pi))*(.86+.14*math.sin(v*math.pi))+.006*math.sin(v*5*math.pi+u*2*math.pi)+layer*.0015
                    vertices.append((x,y,z))
        count=(nx+1)*(ny+1)
        faces=[]
        for j in range(ny):
            for i in range(nx):
                a=j*(nx+1)+i;b=a+1;c=b+nx+1;d=a+nx+1
                faces.extend([(d,c,b,a),(a+count,b+count,c+count,d+count)])
        # Close perimeter so grazing angles show cloth thickness rather than an open sheet.
        boundary=list(range(nx+1))+[j*(nx+1)+nx for j in range(1,ny+1)]+[ny*(nx+1)+i for i in reversed(range(nx))]+[j*(nx+1) for j in reversed(range(1,ny))]
        for k,a in enumerate(boundary):
            b=boundary[(k+1)%len(boundary)]
            faces.append((a,b,b+count,a+count))
        folded=mesh_web(f"VIS_Curtain{side}FoldedLinen",vertices,faces,cloth,parent,uv_axes=(0,1),uv_scale=(3.2,.5),smooth=True)
        # Thin connecting rims must not average opposite front/back normals.
        for polygon in list(folded.data.polygons)[2*nx*ny:]:
            polygon.use_smooth=False
        box(f"VIS_Curtain{side}GatheredHeader",(0,1.398,0),(.30,.024,.17),header,parent,.007,3)


def cabinet():
    parent=root("VIS_Cabinet","FUR_DisplayCabinet")
    wood=wood_material("MAT_V06A_CabinetOak",rough=.49)
    graphite=pbr("MAT_V06A_CabinetDarkFrame",(.053,.059,.062),.18,.46)
    for info in source_components("FUR_DisplayCabinet"):
        index=info["componentIndex"]
        lo,hi=info["localBoundsWeb"]["min"],info["localBoundsWeb"]["max"]
        c=[(lo[i]+hi[i])/2 for i in range(3)];s=[hi[i]-lo[i] for i in range(3)]
        group=component(f"VIS_CabinetSolid_{index:02}",parent,index,lo,hi)
        if index==0:
            box("VIS_CabinetBackSubstrate",(lo[0]+.003,c[1],c[2]),(.006,s[1],s[2]-.002),graphite,group,.0008,1)
            boards=[]
            for j in range(20):
                z0=lo[2]+j*s[2]/20+.00065;z1=lo[2]+(j+1)*s[2]/20-.00065
                obj=box("VIS_CabinetBackOakSlat",((lo[0]+.006+hi[0])/2,c[1],(z0+z1)/2),(s[0]-.006,s[1],z1-z0),wood,group,.0015,2)
                project_uv(obj,grain_axis=1,scale=.72)
                boards.append(obj)
            combine("VIS_CabinetBackOakPanels",boards)
        else:
            horizontal=s[1]<.15
            if horizontal:
                # Frozen boards intentionally interlock. Recess their differently
                # colored end faces inside that existing solid volume to avoid
                # coplanar wood/metal triangles at all upright intersections.
                draw_lo,draw_hi=list(lo),list(hi)
                draw_lo[0]+=.001
                draw_hi[0]-=.004
                if abs(draw_lo[2]+1.65)<1e-5: draw_lo[2]+=.001
                if abs(draw_hi[2]-2.10)<1e-5: draw_hi[2]-=.001
                c=[(draw_lo[i]+draw_hi[i])/2 for i in range(3)]
                s=[draw_hi[i]-draw_lo[i] for i in range(3)]
            obj=box(f"VIS_CabinetPanel_{index:02}",c,s,wood if horizontal else graphite,group,.003,3)
            project_uv(obj,grain_axis=2 if horizontal else 1,scale=.75)
            if horizontal:
                obj["v06a_support"]=True
                obj["coplanarCorrection"]="Within frozen board: front X -4mm, back X +1mm, outer Z ends inset 1mm; support Y unchanged"


BUILDERS={"floor":floor,"desk":desk,"walls":walls,"door":door,"window":window,"curtains":curtains,"cabinet":cabinet}

if __name__=="__main__":
    args=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
    if not args:
        raise SystemExit("Specify explicit reviewed families: floor desk walls door window curtains cabinet.")
    for family in args:
        if family not in BUILDERS:
            raise ValueError(f"Unknown or not-yet-released family: {family}")
        reset()
        BUILDERS[family]()
        export_family(family)
