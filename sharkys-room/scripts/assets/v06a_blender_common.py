"""Shared original v0.6A authoring helpers; all geometry input is Web Y-up metres."""
from pathlib import Path
import hashlib
import json
import math
import struct
import zlib
import bpy
import numpy as np
from mathutils import Vector
from build_production_assets import xyz, web, pbr as _pilot_pbr, box, cylinder, combine, finish, rounded_plane

PROJECT = Path(__file__).resolve().parents[2]
VERSION = "0.6A"
SOURCE = PROJECT / "public/models/sharkys_room_blockout_FINAL.glb"
SOURCE_COMPONENTS = PROJECT / "validation/v06a/planning/blender-solid-components.json"


def pbr(name, color, metal=0, rough=.4):
    material = _pilot_pbr(name, color, metal, rough)
    # All v0.6A objects are closed geometry with authored outward winding.
    material.use_backface_culling = True
    return material


def reset():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.meshes, bpy.data.materials, bpy.data.images):
        for item in list(collection):
            if item.users == 0:
                collection.remove(item)
    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.scale_length = 1
    bpy.context.preferences.filepaths.save_version = 0


def root(name, anchor):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj["v06a_anchor"] = anchor
    obj["v06a_coordinate_contract"] = "identity root; glTF Y-up metre anchor-local vertices"
    obj["v06a_version"] = VERSION
    return obj


def component(name, parent, index, minimum, maximum):
    obj = root(name, parent.get("v06a_anchor", ""))
    obj.parent = parent
    obj["sourceComponentIndex"] = index
    obj["sourceMin"] = minimum
    obj["sourceMax"] = maximum
    return obj


def mesh_web(name, vertices, faces, material, parent, uv_axes=(0,2), uv_scale=(1,1), smooth=False):
    data = bpy.data.meshes.new(name + "_Geometry")
    data.from_pydata([xyz(p) for p in vertices], [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    data.materials.append(material)
    uv = data.uv_layers.new(name="UVMap")
    for face in data.polygons:
        face.use_smooth = smooth
        for loop in face.loop_indices:
            p = vertices[data.loops[loop].vertex_index]
            uv.data[loop].uv = (p[uv_axes[0]] * uv_scale[0], p[uv_axes[1]] * uv_scale[1])
    return obj


def project_uv(obj, grain_axis=0, scale=1.0):
    """Planar physical UV for each face; coordinate values are in metres."""
    uv = obj.data.uv_layers.active or obj.data.uv_layers.new(name="UVMap")
    for face in obj.data.polygons:
        normal = web(face.normal)
        excluded = max(range(3), key=lambda i: abs(normal[i]))
        axes = [i for i in range(3) if i != excluded]
        if grain_axis in axes:
            axes.remove(grain_axis)
            axes.insert(0, grain_axis)
        for loop in face.loop_indices:
            p = web(obj.data.vertices[obj.data.loops[loop].vertex_index].co)
            uv.data[loop].uv = (p[axes[0]] * scale, p[axes[1]] * scale * 3.2)
    return obj


def source_components(name):
    return json.loads(SOURCE_COMPONENTS.read_text())["objects"][name]["components"]


def bounds(objects):
    pts = [web(o.matrix_world @ v.co) for o in objects if o.type == "MESH" for v in o.data.vertices]
    return {"min": [min(p[i] for p in pts) for i in range(3)], "max": [max(p[i] for p in pts) for i in range(3)]} if pts else None


def png_write(path, array):
    height, width, channels = array.shape
    assert channels in (3,4)
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff)
    header = struct.pack(">IIBBBBB", width, height, 8, 2 if channels == 3 else 6, 0, 0, 0)
    raw = b"".join(b"\0" + row.tobytes() for row in array)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def wood_material(name="MAT_V06A_WarmOak", tint=(1,1,1), rough=.48):
    image_path = PROJECT / "assets-source/v06a/shared/warm_oak_basecolor_512.png"
    if not image_path.exists():
        y,x = np.mgrid[0:512,0:512].astype(float)
        # Original periodic longitudinal grain; subtle pores, no baked lighting.
        phase = y*2*math.pi/30 + .55*np.sin(x*2*math.pi/512) + .20*np.sin(x*2*math.pi/128)
        grain = .022*np.sin(phase) + .012*np.sin(phase*3.1) + .007*np.sin(y*2*math.pi/5)
        broad = .035*np.sin(y*2*math.pi/173 + .3*np.sin(x*2*math.pi/512))
        pores = -.02*(np.sin(x*2*math.pi/31 + y*.5)>.95)*(np.sin(y*.45)>.88)
        result = np.stack([np.clip(c + grain + broad + pores, 0, 1) for c in (.64,.435,.263)],axis=-1)
        png_write(image_path, np.round(result*255).astype(np.uint8))
    image = bpy.data.images.get("V06A_OriginalWarmOak512")
    if image is None:
        image = bpy.data.images.load(str(image_path), check_existing=True)
        image.name = "V06A_OriginalWarmOak512"
        image.colorspace_settings.name = "sRGB"
        image.pack()
    mat = pbr(name, tint, 0, rough)
    texture = mat.node_tree.nodes.new("ShaderNodeTexImage")
    texture.image = image
    texture.extension = "REPEAT"
    mat.node_tree.links.new(texture.outputs["Color"], mat.node_tree.nodes.get("Principled BSDF").inputs["Base Color"])
    return mat


def current_stats(family):
    bpy.context.view_layer.update()
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    for obj in meshes:
        obj.data.calc_loop_triangles()
    roots = [o for o in bpy.context.scene.objects if o.parent is None]
    mats = {m.name for o in meshes for m in o.data.materials}
    return {"version": VERSION, "family": family,
        "triangles": sum(len(o.data.loop_triangles) for o in meshes), "meshCount": len(meshes),
        "materialCount": len(mats), "materials": sorted(mats),
        "uvMeshes": sum(bool(o.data.uv_layers) for o in meshes),
        "roots": {o.name: {"anchor": o.get("v06a_anchor"), "location": list(o.location),
            "rotation": list(o.rotation_euler), "scale": list(o.scale),
            "localBoxYUp": bounds([o] + list(o.children_recursive))} for o in roots},
        "sourceComponents": [{"node": o.name, "sourceComponentIndex": o["sourceComponentIndex"],
            "sourceMin": list(o["sourceMin"]), "sourceMax": list(o["sourceMax"]),
            "localBoxYUp": bounds([o] + list(o.children_recursive))}
            for o in bpy.context.scene.objects if "sourceComponentIndex" in o],
        "sourceSHA256": hashlib.sha256(SOURCE.read_bytes()).hexdigest()}


def export_family(family, generator="build_architecture_assets.py"):
    stats = current_stats(family)
    blend = PROJECT / "blender-assets" / f"{family}_v06a.blend"
    glb = PROJECT / "public/models/production" / f"{family}_v06a.glb"
    folder = PROJECT / "assets-source/v06a" / family
    folder.mkdir(parents=True, exist_ok=True)
    bpy.context.scene["v06a_source"] = "Original procedural stylized approximation; frozen FINAL is read only"
    bpy.context.scene["v06a_reproduce"] = f"Blender --background --python-exit-code 1 --python scripts/assets/{generator} -- {family}"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend), check_existing=False)
    bpy.ops.export_scene.gltf(filepath=str(glb), export_format="GLB", export_yup=True,
        export_apply=True, export_texcoords=True, export_normals=True, export_materials="EXPORT",
        export_extras=True, export_cameras=False, export_lights=False, export_animations=False,
        export_image_format="AUTO")
    data = glb.read_bytes()
    doc = json.loads(data[20:20+struct.unpack_from("<I",data,12)[0]])
    stats.update({"glbBytes": len(data), "blendBytes": blend.stat().st_size,
        "glbSHA256": hashlib.sha256(data).hexdigest(),
        "gltfPrimitives": sum(len(m["primitives"]) for m in doc.get("meshes",[])),
        "textureCount": len(doc.get("images",[])),
        "embeddedImageBytes": sum(doc["bufferViews"][i["bufferView"]]["byteLength"] for i in doc.get("images",[])),
        "exportRootTransforms": {doc["nodes"][n]["name"]:{k:doc["nodes"][n].get(k) for k in ("translation","rotation","scale","matrix")}
            for n in doc["scenes"][doc.get("scene",0)]["nodes"]}})
    bin_start = 20 + struct.unpack_from("<I", data, 12)[0] + 8
    image_stats = []
    for img in doc.get("images", []):
        view = doc["bufferViews"][img["bufferView"]]
        encoded = data[bin_start + view.get("byteOffset", 0):bin_start + view.get("byteOffset", 0) + view["byteLength"]]
        size = struct.unpack_from(">II", encoded, 16) if encoded[:8] == b"\x89PNG\r\n\x1a\n" else (None,None)
        image_stats.append({"name":img.get("name"),"mimeType":img.get("mimeType"),"width":size[0],"height":size[1],"encodedBytes":len(encoded)})
    stats["images"] = image_stats
    stats["decodedTextureBytesRGBA8Estimate"] = sum(i["width"]*i["height"]*4 for i in image_stats if i["width"] and i["height"])
    stats["decodedTextureBytesWithMipmapsEstimate"] = round(stats["decodedTextureBytesRGBA8Estimate"]*4/3)
    reset()
    bpy.ops.import_scene.gltf(filepath=str(glb))
    after = current_stats(family)
    checks = {"meshCount": after["meshCount"] == stats["meshCount"],
        "triangles": after["triangles"] == stats["triangles"],
        "uvEveryMesh": after["uvMeshes"] == after["meshCount"],
        "sameRoots": set(after["roots"]) == set(stats["roots"])}
    for name, value in stats["roots"].items():
        b0,b1=value["localBoxYUp"],after["roots"][name]["localBoxYUp"]
        checks[name+"_bounds"] = max(abs(b0[k][i]-b1[k][i]) for k in ("min","max") for i in range(3)) < 1e-6
    assert all(checks.values()),checks
    stats["roundtripChecks"] = checks
    (folder / "asset-statistics.json").write_text(json.dumps(stats,indent=2)+"\n")
    print("ASSET_COMPLETE "+json.dumps(stats))
    return stats
