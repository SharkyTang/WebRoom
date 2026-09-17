"""Original v0.5 pilot assets. Run with Blender 5.2.1 --background --python FILE.

All dimensions below are in the ORIGINAL anchor's glTF Y-up metres. Conversion
to Blender is performed once on vertices: (x, y, z) -> (x, -z, y). The standard
glTF exporter reverses that conversion. Do not rotate or offset imported roots.
"""
from pathlib import Path
import json
import math
import hashlib
import sys
import bpy
from mathutils import Vector, Matrix
import numpy as np

PROJECT = Path(__file__).resolve().parents[2]
VERSION = "0.5.0"
FAMILIES = ("monitor", "macbook", "marshall")
SOURCE = PROJECT / "public/models/sharkys_room_blockout_FINAL.glb"


def xyz(p):
    return (p[0], -p[2], p[1])


def web(p):
    return (p[0], p[2], -p[1])


def reset():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.meshes, bpy.data.materials, bpy.data.images):
        for item in list(collection):
            if item.users == 0:
                collection.remove(item)
    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.scale_length = 1


def pbr(name, color, metal=0.0, rough=0.4):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    n = m.node_tree.nodes.get("Principled BSDF")
    if n is None:
        m.node_tree.nodes.clear()
        n = m.node_tree.nodes.new("ShaderNodeBsdfPrincipled")
        n.name = "Principled BSDF"
        output = m.node_tree.nodes.new("ShaderNodeOutputMaterial")
        m.node_tree.links.new(n.outputs["BSDF"], output.inputs["Surface"])
    n.inputs["Base Color"].default_value = (*color, 1)
    n.inputs["Metallic"].default_value = metal
    n.inputs["Roughness"].default_value = rough
    return m


def root(name, anchor):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj["v05_anchor"] = anchor
    obj["v05_local_coordinate_contract"] = "Y-up metres in GLB; identity root; Blender vertices converted once"
    obj["v05_standard_pose"] = "closed" if name == "VIS_MacBookLid" else "static"
    obj["v05_version"] = VERSION
    return obj


def finish(obj, name, material, parent, bevel=0, segments=3):
    obj.name = name
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if bevel:
        mod = obj.modifiers.new("Manufactured edge radii", "BEVEL")
        mod.width = bevel
        mod.segments = segments
        bpy.ops.object.modifier_apply(modifier=mod.name)
        # Retain planar manufactured faces while smoothing rounded bevel strips.
        for face in obj.data.polygons:
            face.use_smooth = len(face.vertices) == 4
        norm = obj.modifiers.new("Weighted corner normals", "WEIGHTED_NORMAL")
        norm.keep_sharp = True
        bpy.ops.object.modifier_apply(modifier=norm.name)
    obj.data.materials.clear()
    obj.data.materials.append(material)
    obj.parent = parent
    if not obj.data.uv_layers:
        obj.data.uv_layers.new(name="UVMap")
    return obj


def box(name, center, size, material, parent, bevel=0.002, segments=3):
    bpy.ops.mesh.primitive_cube_add(size=1, location=xyz(center))
    obj = bpy.context.object
    obj.scale = (size[0], size[2], size[1])
    return finish(obj, name, material, parent, bevel, segments)


def cylinder(name, center, radius, depth, material, parent, axis=(0, 1, 0), vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=xyz(center))
    obj = bpy.context.object
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(Vector(xyz(axis)))
    return finish(obj, name, material, parent, min(depth * 0.2, radius * .10), 2)


def rounded_plane(name, width, height, radius, center, material, parent, plane="XY", segments=7):
    # Ordered counterclockwise in its two geometric axes. XY faces +Z; XZ faces -Y.
    points = [(0, 0)]
    for cx, cy, start in [(width/2-radius, height/2-radius, 0),
                          (-width/2+radius, height/2-radius, 90),
                          (-width/2+radius, -height/2+radius, 180),
                          (width/2-radius, -height/2+radius, 270)]:
        for step in range(segments + 1):
            a = math.radians(start + 90 * step / segments)
            points.append((cx + radius * math.cos(a), cy + radius * math.sin(a)))
    vertices = []
    for a, b in points:
        p = (a+center[0], b+center[1], center[2]) if plane == "XY" else (a+center[0], center[1], b+center[2])
        vertices.append(xyz(p))
    count = len(points)-1
    faces = [(0, i+1, (i+1) % count+1) for i in range(count)]
    mesh = bpy.data.meshes.new(name + "_Geometry")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    mesh.materials.append(material)
    uv = mesh.uv_layers.new(name="UVMap")
    for poly in mesh.polygons:
        for loop in poly.loop_indices:
            a, b = points[mesh.loops[loop].vertex_index]
            # Blender bottom-left convention, exporter flips V into glTF's top-left convention.
            u, v = a/width+.5, b/height+.5
            # For XZ, +Z rises toward the screen TOP after the original -105deg
            # X hinge rotation. Blender v=1 there exports glTF v=0 (Canvas top).
            uv.data[loop].uv = (u, v)
    obj["surface_orientation"] = "front +Z, top +Y" if plane == "XY" else "closed front -Y, screen top +Z away from hinge"
    return obj


def combine(name, objects):
    if not objects:
        return
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    objects[0].name = name
    return objects[0]


def monitor():
    body = root("VIS_MonitorBody", "TEC_MonitorBody")
    shell = pbr("MAT_Monitor_CharcoalPolymer", (.055, .068, .079), .12, .35)
    alloy = pbr("MAT_Monitor_SatinGraphite", (.19, .22, .235), .72, .3)
    rubber = pbr("MAT_Monitor_Recesses", (.009, .013, .016), .05, .62)
    display = pbr("MAT_Monitor_Display", (1, 1, 1), 0, .34)
    # Head is an authored rounded shell, recessed inset and visible lower bezel.
    parts = [box("VIS_Monitor_RearShell", (0,0,-.003), (1.16,.62,.054), shell, body, .013, 5)]
    parts.append(box("VIS_Monitor_FrontBezel", (0,0,.029), (1.151,.612,.014), shell, body, .008, 4))
    parts.append(box("VIS_Monitor_LowerChin", (0,-.292,.032), (1.12,.026,.009), shell, body, .003, 3))
    combine("VIS_MonitorHousing", parts)
    alloyparts = [box("VIS_Monitor_Stem", (0,-.345,-.021), (.065,.20,.061), alloy, body, .006, 4),
                  box("VIS_Monitor_Foot", (0,-.445,.025), (.37,.03,.24), alloy, body, .010, 5),
                  box("VIS_Monitor_StemCollar", (0,-.255,-.025), (.10,.028,.027), alloy, body, .005, 3)]
    combine("VIS_MonitorStand", alloyparts)
    recesses = []
    for i in range(12):
        recesses.append(box("VIS_Monitor_Vent", (-.242+i*.044,.193,-.0305), (.026,.002,.001), rubber, body, .0004, 2))
    recesses.append(box("VIS_Monitor_CableSlot", (0,-.325,-.052), (.029,.062,.002), rubber, body, .004, 3))
    combine("VIS_MonitorRecessDetails", recesses)
    # Screen anchor is 0.036m in front of body anchor. Its face is at local +0.002.
    surf = rounded_plane("VIS_MonitorDisplaySurface", 1.102, .556, .005, (0,0,.002), display, None)
    surf["v05_anchor"] = "TEC_MonitorScreen"
    surf["v05_local_coordinate_contract"] = "identity root; XY surface faces +Z; exporter-flipped V"


def macbook():
    base = root("VIS_MacBookBase", "TEC_MacBookBase")
    lid = root("VIS_MacBookLid", "TEC_MacBookScreen")
    alloy = pbr("MAT_MacBook_SatinAluminum", (.54,.585,.62), .80, .30)
    rim = pbr("MAT_MacBook_MachinedEdge", (.66,.70,.73), .82, .23)
    dark = pbr("MAT_MacBook_GraphiteKeys", (.027,.033,.039), .12, .54)
    black = pbr("MAT_MacBook_BlackGlassBezel", (.007,.010,.014), .05, .27)
    trackpad = pbr("MAT_MacBook_Trackpad", (.43,.475,.51), .63, .40)
    display = pbr("MAT_MacBook_Display", (1,1,1), 0, .34)
    box("VIS_MacBookChassis", (0,-.0015,0), (.34,.024,.235), alloy, base, .006, 5)
    combine("VIS_MacBookMachinedDetails", [
        box("VIS_MacBook_Deck", (0,.0107,0), (.329,.0018,.222), rim, base, .0007, 3),
        cylinder("VIS_MacBook_HingeBar", (0,.008,-.1115), .006, .271, rim, base, axis=(1,0,0), vertices=32)])
    # Keyboard well and display bezel stay separate material families from luminous screens.
    box("VIS_MacBookKeyboardWell", (0,.0118,-.024), (.294,.0008,.133), black, base, .00035, 2)
    caps = []
    for row in range(5):
        for col in range(12):
            width = .0208
            caps.append(box("VIS_MacBook_Key", (-.1331+col*.0242,.0132,-.075+row*.0209), (width,.0016,.0174), dark, base, .00065, 3))
    caps.append(box("VIS_MacBook_Spacebar", (0,.0132,.031), (.12,.0016,.012), dark, base, .00065, 3))
    # Feet, ports and keys share material and one geometry draw call.
    for x in (-.130,.130):
        for z in (-.087,.087):
            caps.append(cylinder("VIS_MacBook_Foot", (x,-.0133,z), .009,.0014,dark,base,vertices=16))
    for x in (-.1696,.1696):
        for z in (-.075,-.052):
            caps.append(box("VIS_MacBook_Port",(x,-.002,z),(.0007,.003,.012),dark,base,.0003,2))
    combine("VIS_MacBookKeysAndPorts", caps)
    box("VIS_MacBookTrackpad", (0,.012,.077), (.115,.0012,.061), trackpad, base, .0005, 3)
    # CLOSED mesh: extends +Z from original rear-edge hinge, no baked -105deg rotation.
    box("VIS_MacBookLidHousing", (0,.007,.112), (.34,.012,.224), alloy, lid, .0055, 5)
    box("VIS_MacBookLidBezel", (0,.0003,.112), (.329,.002,.213), black, lid, .0009, 3)
    rounded_plane("VIS_MacBookDisplaySurface", .307,.185,.003,(0,-.0015,.111),display,lid,plane="XZ")
    # Tiny camera lens is geometry on the non-emissive bezel, well within original envelope.
    cylinder("VIS_MacBookCamera",(0,-.0011,.0095),.0011,.0003,dark,lid,axis=(0,-1,0),vertices=16)


def woven_image():
    # Deterministic original 512px color texture; no downloaded logo or reference pixels.
    size = 512
    y, x = np.mgrid[0:size,0:size]
    rng = np.random.default_rng(5041)
    warp = (.5+.5*np.cos(x*2*np.pi/8))**3
    weft = (.5+.5*np.cos(y*2*np.pi/8))**3
    alternating = ((x//8+y//8)%2)
    thread = np.maximum(warp*(.68+.25*alternating), weft*(.93-.25*alternating))
    grain = rng.uniform(-.028,.028,(size,size))
    value = np.clip(.19+.52*thread+grain,0,1)
    rgba = np.ones((size,size,4),dtype=np.float32)
    for c, factor in enumerate((1,.90,.70)):
        rgba[:,:,c] = value*factor
    image = bpy.data.images.new("Marshall_Woven_Original_512",width=size,height=size,alpha=True)
    image.colorspace_settings.name = "sRGB"
    image.pixels.foreach_set(rgba.ravel())
    target = PROJECT / "assets-source/marshall/woven_grille_basecolor_512.png"
    image.filepath_raw = str(target)
    image.file_format = "PNG"
    image.save()
    image.pack()
    return image


def marshall():
    body = root("VIS_MarshallBody", "TEC_Marshall")
    leather = pbr("MAT_Marshall_WarmCharcoal", (.059,.051,.043), .04,.68)
    gold = pbr("MAT_Marshall_BrushedBrass", (.61,.40,.16), .74,.34)
    rubber = pbr("MAT_Marshall_ControlAndFeet", (.018,.021,.019), .02,.62)
    cloth = pbr("MAT_Marshall_WovenGrille", (1,1,1), 0,.93)
    led = pbr("MAT_Marshall_PowerIndicator", (.12,.095,.055), .08,.35)
    tex = cloth.node_tree.nodes.new("ShaderNodeTexImage")
    tex.name = "Original embedded 512px woven base color"
    tex.image = woven_image()
    cloth.node_tree.links.new(tex.outputs["Color"],cloth.node_tree.nodes.get("Principled BSDF").inputs["Base Color"])
    # Rounded cabinet leaves room for top controls and rubber isolation feet.
    box("VIS_MarshallCabinet",(0,-.0015,-.001),(.36,.263,.187),leather,body,.012,5)
    # Slim brass piping around front fascia, joined with controls for material reuse.
    trims = []
    for x in (-.166,.166):
        trims.append(box("VIS_Marshall_Piping",(x,-.006,.091),(.003,.234,.003),gold,body,.0012,3))
    for y in (-.122,.110):
        trims.append(box("VIS_Marshall_Piping",(0,y,.091),(.332,.003,.003),gold,body,.0012,3))
    top = [box("VIS_Marshall_ControlPlate",(0,.131,-.032),(.288,.002,.078),rubber,body,.0008,3)]
    for i,x in enumerate((-.041,.028,.097)):
        trims.append(cylinder("VIS_Marshall_Dial",(x,.138,-.033),.013,.014,gold,body,vertices=32))
        top.append(cylinder("VIS_Marshall_DialInset",(x,.144995,-.033),.0095,.00001,rubber,body,vertices=24))
        trims.append(box("VIS_Marshall_DialMark",(x,.144999,-.039),(.001,.000002,.003),gold,body,0))
    for x in (-.12,.12):
        for z in (-.055,.055):
            top.append(box("VIS_Marshall_Foot",(x,-.139,z),(.048,.012,.037),rubber,body,.004,3))
    combine("VIS_MarshallBrassTrimAndDials",trims)
    combine("VIS_MarshallControlAndFeet",top)
    rounded_plane("VIS_MarshallGrille",.325,.224,.008,(0,-.006,.0945),cloth,body)
    cylinder("VIS_MarshallPowerIndicator",(-.111,.134,-.033),.005,.005,led,body,vertices=24)
    led.node_tree.nodes.get("Principled BSDF").inputs["Emission Color"].default_value=(.6,.25,.03,1)
    led.node_tree.nodes.get("Principled BSDF").inputs["Emission Strength"].default_value=0


def bounds(objects):
    ps=[web(obj.matrix_world @ v.co) for obj in objects if obj.type=="MESH" for v in obj.data.vertices]
    return {"min":[min(p[i] for p in ps) for i in range(3)],"max":[max(p[i] for p in ps) for i in range(3)]} if ps else None


def stats(family):
    bpy.context.view_layer.update()
    meshes=[obj for obj in bpy.context.scene.objects if obj.type=="MESH"]
    for obj in meshes:
        obj.data.calc_loop_triangles()
    materials={m.name for obj in meshes for m in obj.data.materials}
    roots=[obj for obj in bpy.context.scene.objects if obj.parent is None]
    result={"version":VERSION,"family":family,"triangles":sum(len(obj.data.loop_triangles) for obj in meshes),
            "meshCount":len(meshes),"materialCount":len(materials),"materials":sorted(materials),
            "textureCount":1 if family=="marshall" else 0,
            "roots":{o.name:{"location":list(o.location),"rotation":list(o.rotation_euler),"scale":list(o.scale),
                             "anchor":o.get("v05_anchor"),"localBoxYUp":bounds([o]+list(o.children_recursive))} for o in roots},
            "uvMeshes":sum(bool(o.data.uv_layers) for o in meshes),"textureDecodedBytesEstimate":512*512*4 if family=="marshall" else 0,
            "textureDecodedBytesWithMipmapsEstimate":round(512*512*4*4/3) if family=="marshall" else 0}
    return result


def glb_doc(path):
    import struct
    data = path.read_bytes()
    length, kind = struct.unpack_from("<II",data,12)
    assert kind==0x4E4F534A
    return json.loads(data[20:20+length])


def build(family):
    reset()
    bpy.context.preferences.filepaths.save_version = 0
    globals()[family]()
    bpy.context.view_layer.update()
    result = stats(family)
    scene=bpy.context.scene
    scene["asset_pipeline"]="Sharky's Room v0.5 original stylized approximation; editable authored mesh source"
    scene["frozen_source_sha256"]=hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    scene["reproduce"]="/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/assets/build_production_assets.py"
    blend = PROJECT / "blender-assets" / (family+"_pilot.blend")
    glb = PROJECT / "public/models/production" / (family+"_pilot.glb")
    bpy.ops.wm.save_as_mainfile(filepath=str(blend),check_existing=False)
    bpy.ops.export_scene.gltf(filepath=str(glb),export_format="GLB",export_yup=True,
                              export_apply=True,export_texcoords=True,export_normals=True,
                              export_materials="EXPORT",export_extras=True,export_cameras=False,
                              export_lights=False,export_animations=False,export_image_format="AUTO")
    doc=glb_doc(glb)
    result["glbBytes"]=glb.stat().st_size
    result["blendBytes"]=blend.stat().st_size
    result["glbSHA256"]=hashlib.sha256(glb.read_bytes()).hexdigest()
    result["gltfPrimitives"]=sum(len(m["primitives"]) for m in doc.get("meshes",[]))
    result["embeddedImageBytes"]=sum(doc["bufferViews"][i["bufferView"]]["byteLength"] for i in doc.get("images",[]))
    result["exportRootTransforms"]={doc["nodes"][n]["name"]:{k:doc["nodes"][n].get(k) for k in ("translation","rotation","scale","matrix")} for n in doc["scenes"][doc.get("scene",0)]["nodes"]}
    # Fresh import roundtrip validates the file that the actual app receives.
    reset()
    bpy.ops.import_scene.gltf(filepath=str(glb))
    after=stats(family)
    checks={"meshCount":after["meshCount"]==result["meshCount"],"triangles":after["triangles"]==result["triangles"],
            "uvEveryMesh":after["uvMeshes"]==after["meshCount"],"sameRoots":set(after["roots"])==set(result["roots"])}
    for name, value in result["roots"].items():
        b0=value["localBoxYUp"];b1=after["roots"][name]["localBoxYUp"]
        checks[name+"_bounds"]=max(abs(b0[k][i]-b1[k][i]) for k in ("min","max") for i in range(3))<1e-6
    assert all(checks.values()),checks
    result["roundtripChecks"]=checks
    (PROJECT/"assets-source"/family/"asset-statistics.json").write_text(json.dumps(result,indent=2)+"\n")
    print("ASSET_COMPLETE "+json.dumps(result))
    return result


if __name__=="__main__":
    args=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
    selected=args or list(FAMILIES)
    for family in selected:
        if family not in FAMILIES:
            raise ValueError(f"Unknown family: {family}")
        build(family)
