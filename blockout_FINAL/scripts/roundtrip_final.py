"""Non-rendering actual GLB reimport comparison. Never saves blend or GLB."""
import argparse
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector


def snapshot():
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    result = {}
    for obj in bpy.context.scene.objects:
        item = {"type": obj.type, "parent": obj.parent.name if obj.parent else None,
                "origin": list(obj.matrix_world.translation),
                "world_matrix": [list(row) for row in obj.matrix_world]}
        if obj.type == "MESH":
            ev = obj.evaluated_get(dg)
            mesh = ev.to_mesh()
            try:
                points = [ev.matrix_world @ v.co for v in mesh.vertices]
                item["world_bounds"] = [[min(p[i] for p in points) for i in range(3)],
                                        [max(p[i] for p in points) for i in range(3)]]
                mesh.calc_loop_triangles()
                item["triangles"] = len(mesh.loop_triangles)
            finally:
                ev.to_mesh_clear()
        result[obj.name] = item
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--glb", type=Path)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    blend = Path(bpy.data.filepath)
    out = args.output_dir or blend.parent
    glb = args.glb or out / "sharkys_room_blockout_FINAL.glb"
    before = snapshot()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(glb))
    after = snapshot()
    missing, extra = sorted(set(before) - set(after)), sorted(set(after) - set(before))
    structure, origins, bounds, triangles, cameras = [], [], [], [], []
    for name, a in before.items():
        if name not in after:
            continue
        b = after[name]
        if (a["type"], a["parent"]) != (b["type"], b["parent"]):
            structure.append({"name": name, "before": [a["type"], a["parent"]], "after": [b["type"], b["parent"]]})
        delta = (Vector(a["origin"]) - Vector(b["origin"])).length
        if delta > 1e-4:
            origins.append({"name": name, "error_m": delta})
        if a["type"] == "MESH" and b["type"] == "MESH":
            error = max(abs(a["world_bounds"][j][i] - b["world_bounds"][j][i]) for j in range(2) for i in range(3))
            if error > 1e-4:
                bounds.append({"name": name, "max_error_m": error})
            if a["triangles"] != b["triangles"]:
                triangles.append({"name": name, "before": a["triangles"], "after": b["triangles"]})
        if a["type"] == "CAMERA":
            error = max(abs(a["world_matrix"][r][c] - b["world_matrix"][r][c]) for r in range(4) for c in range(4))
            cameras.append({"name": name, "world_matrix_max_error": error, "pass": error < 1e-5})
    passed = not (missing or extra or structure or origins or bounds or triangles) and len(cameras) == 5 and all(c["pass"] for c in cameras)
    report = {"source_blend": str(blend), "glb": str(glb), "roundtrip_pass": passed,
              "source_objects": len(before), "reimported_objects": len(after),
              "missing_objects": missing, "extra_objects": extra, "structure_errors": structure,
              "origin_errors": origins, "geometry_bounds_errors": bounds, "triangle_count_errors": triangles,
              "source_triangles": sum(o.get("triangles", 0) for o in before.values()),
              "reimported_triangles": sum(o.get("triangles", 0) for o in after.values()),
              "cameras": cameras,
              "note": "Actual Blender glTF importer used in a fresh scene. glTF Y-up is converted back to Blender Z-up. Projection fields are separately checked against the exported JSON by validate_v02.py. No render, .blend save or GLB export occurs."}
    out.mkdir(parents=True, exist_ok=True)
    result = out / "roundtrip_results.json"
    result.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print("FINAL_ROUNDTRIP_RESULT " + json.dumps(report, ensure_ascii=False))
    if not passed:
        raise RuntimeError("Actual GLB reimport comparison failed")


if __name__ == "__main__":
    main()
