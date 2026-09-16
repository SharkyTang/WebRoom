"""Non-saving v0.2 acceptance audit using v0.1 checks and a live v0.1 snapshot.

blender --background sharkys_room_blockout_v02.blend --python scripts/validate_v02.py

Optional --baseline, --glb and --output-dir follow Blender's -- separator.
Both blend files are opened read-only by Blender, never saved or exported.
Outputs validation_v02_results.json. Blender --python-exit-code 1 is supported.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import struct
import sys

import bpy
from mathutils import Matrix, Quaternion, Vector

ROOT = Path(__file__).resolve().parents[2]
BASE_VALIDATOR = ROOT / "blockout_v01/scripts/validate_blockout.py"
spec = importlib.util.spec_from_file_location("v01_acceptance", BASE_VALIDATOR)
v01 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v01)
record = v01.record
CAMERAS = {"CAM_Hero_45": 45.0, "CAM_Hero_48": 48.0, "CAM_Hero_52": 52.0}
MONITOR_GEOMETRY_EXCEPTIONS = {"TEC_MonitorBody", "TEC_MonitorScreen"}


def native(value):
    if isinstance(value, (str, bool, int, float)) or value is None:
        return value
    if hasattr(value, "items"):
        return {str(k): native(v) for k, v in value.items()}
    return [native(v) for v in value]


def matrix(value):
    return [[float(v) for v in row] for row in value]


def max_delta(a, b):
    if isinstance(a, (list, tuple)):
        if len(a) != len(b):
            return float("inf")
        return max((max_delta(x, y) for x, y in zip(a, b)), default=0.0)
    return abs(float(a) - float(b))


def geometry_hash(mesh):
    h = hashlib.sha256()
    for v in mesh.vertices:
        h.update(struct.pack("<3f", *v.co))
    for p in mesh.polygons:
        h.update(struct.pack("<I", len(p.vertices)))
        h.update(struct.pack("<" + "I" * len(p.vertices), *p.vertices))
    return h.hexdigest()


def camera_params(obj):
    data = obj.data
    return {
        "type": data.type, "lens_mm": data.lens, "sensor_width_mm": data.sensor_width,
        "sensor_height_mm": data.sensor_height, "sensor_fit": data.sensor_fit,
        "clip_start_m": data.clip_start, "clip_end_m": data.clip_end,
        "shift": [data.shift_x, data.shift_y], "world_matrix": matrix(obj.matrix_world),
        "local_location": list(obj.location), "rotation_mode": obj.rotation_mode,
        "local_rotation_degrees": [math.degrees(x) for x in obj.rotation_euler],
        "local_scale": list(obj.scale), "custom_properties": native(dict(obj.items())),
    }


def snapshot():
    bpy.context.view_layer.update()
    result = {}
    for o in bpy.context.scene.objects:
        item = {"type": o.type, "parent": o.parent.name if o.parent else None,
                "collections": sorted(c.name for c in o.users_collection),
                "matrix_world": matrix(o.matrix_world), "matrix_basis": matrix(o.matrix_basis),
                "matrix_parent_inverse": matrix(o.matrix_parent_inverse),
                "rotation_mode": o.rotation_mode,
                "dimensions": list(o.dimensions), "origin_world": list(o.matrix_world.translation),
                "properties": native(dict(o.items()))}
        if o.type == "MESH":
            item["local_geometry_sha256"] = geometry_hash(o.data)
            item["local_bounds"] = native(v01.bounds(o))
            item["mesh_counts"] = [len(o.data.vertices), len(o.data.polygons)]
        if o.type == "CAMERA":
            item["camera"] = camera_params(o)
        result[o.name] = item
    return {"objects": result, "active_camera": bpy.context.scene.camera.name if bpy.context.scene.camera else None,
            "collections": {c.name: sorted(k.name for k in c.children) for c in bpy.data.collections}}


def compare_preservation(old, new):
    a, b = old["objects"], new["objects"]
    missing = sorted(set(a) - set(b))
    record("v02_all_v01_scene_object_names_preserved", not missing,
           {"baseline_object_count": len(a), "current_object_count": len(b), "missing": missing,
            "added": sorted(set(b) - set(a))})
    for field in ("type", "parent", "collections"):
        errors = [{"name": n, "before": o[field], "after": b[n][field]} for n, o in a.items()
                  if n in b and o[field] != b[n][field]]
        record("v02_all_v01_object_" + field + "_preserved", not errors and not missing, errors)
    collection_changes = [{"name": n, "before": v, "after": new["collections"].get(n)}
                          for n, v in old["collections"].items() if new["collections"].get(n) != v]
    record("v02_v01_collection_hierarchy_preserved", not collection_changes, collection_changes)
    protected = (*v01.INTERACTIVE_NAMES, *v01.TARGET_NAMES, *v01.GROUPS, "SharkysRoom")
    for field in ("matrix_world", "matrix_basis", "matrix_parent_inverse"):
        errors = [{"name": n, "max_abs_delta": max_delta(a[n][field], b[n][field])}
                  for n in protected if n in a and n in b and max_delta(a[n][field], b[n][field]) > 1e-7]
        record("v02_protected_" + field + "_unchanged", not errors and all(n in b for n in protected), errors)
    geometry_errors = [n for n in v01.INTERACTIVE_NAMES if n not in MONITOR_GEOMETRY_EXCEPTIONS
                       and n in a and n in b and a[n].get("local_geometry_sha256") != b[n].get("local_geometry_sha256")]
    record("v02_interactive_local_mesh_geometry_unchanged_except_monitor", not geometry_errors,
           {"changed_unapproved_geometry": geometry_errors,
            "authorized_proxy_resize": sorted(MONITOR_GEOMETRY_EXCEPTIONS)})
    property_errors = []
    rotation_errors = []
    for n in protected:
        if n not in a or n not in b:
            continue
        if a[n]["rotation_mode"] != b[n]["rotation_mode"]:
            rotation_errors.append(n)
        for key, val in a[n]["properties"].items():
            if b[n]["properties"].get(key) != val:
                property_errors.append({"name": n, "key": key, "before": val,
                                        "after": b[n]["properties"].get(key)})
    record("v02_interaction_custom_properties_preserved", not property_errors, property_errors)
    record("v02_protected_rotation_modes_preserved", not rotation_errors, rotation_errors)
    base_cam_equal = "CAM_Hero" in b and a["CAM_Hero"]["camera"] == b["CAM_Hero"]["camera"]
    record("v02_CAM_Hero_full_parameters_exactly_preserved", base_cam_equal,
           {"baseline": a["CAM_Hero"]["camera"], "current": b.get("CAM_Hero", {}).get("camera")})
    record("v02_no_final_camera_selected_active_baseline", new["active_camera"] == "CAM_Hero",
           {"active_camera": new["active_camera"], "decision": "User must choose among candidates after review."})
    rail = bpy.data.objects.get("INT_PianoRail")
    travel = float(rail.get("slide_distance_m", 0)) if rail else 0
    record("v02_piano_exact_0_65m_travel_preserved", abs(abs(travel) - 0.65) < 1e-7, {"signed_travel_m": travel})
    changes = {}
    for n, before in a.items():
        if n not in b:
            continue
        after = b[n]
        fields = [key for key in ("matrix_world", "dimensions", "local_geometry_sha256")
                  if before.get(key) != after.get(key)]
        if fields:
            changes[n] = {"changed_fields": fields, "before_origin_world": before["origin_world"],
                          "after_origin_world": after["origin_world"],
                          "before_dimensions": before["dimensions"], "after_dimensions": after["dimensions"]}
    v01.details["v01_to_v02_object_changes"] = changes


def check_candidates(glb_path):
    scene = bpy.context.scene
    params = {}
    for name, lens in CAMERAS.items():
        o = bpy.data.objects.get(name)
        ok = bool(o and o.type == "CAMERA" and o.data.type == "PERSP" and o.data.lens == lens
                  and o.parent and o.parent.name == "CAMERAS_TARGETS"
                  and "CAMERAS_TARGETS" in [c.name for c in o.users_collection])
        record(name + "_candidate_lens_hierarchy", ok,
               camera_params(o) if o and o.type == "CAMERA" else None)
        if o and o.type == "CAMERA":
            params[name] = camera_params(o)
    record("v02_candidates_have_independent_camera_data", len(params) == 3 and
           len({bpy.data.objects[n].data.as_pointer() for n in params}) == 3,
           {n: bpy.data.objects[n].data.name for n in params})
    v01.details["candidate_cameras"] = params
    gltf, _, _ = v01.read_glb(glb_path)
    nodes = gltf.get("nodes", [])
    by_name = {n.get("name"): i for i, n in enumerate(nodes)}
    parents = {c: i for i, n in enumerate(nodes) for c in n.get("children", [])}
    basis = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, -1, 0, 0), (0, 0, 0, 1)))
    def node_world(i):
        n = nodes[i]
        if "matrix" in n:
            flat = n["matrix"]
            local = Matrix([[flat[c * 4 + r] for c in range(4)] for r in range(4)])
        else:
            q = n.get("rotation", (0, 0, 0, 1))
            local = Matrix.Translation(Vector(n.get("translation", (0, 0, 0)))) @ Quaternion((q[3], q[0], q[1], q[2])).to_matrix().to_4x4() @ Matrix.Diagonal(Vector(list(n.get("scale", (1, 1, 1))) + [1]))
        return node_world(parents[i]) @ local if i in parents else local
    for name in ("CAM_Hero", *CAMERAS):
        i = by_name.get(name)
        o = bpy.data.objects.get(name)
        exported = i is not None and "camera" in nodes[i]
        record(name + "_glb_camera_exported", exported,
               {"node_index": i, "camera_index": nodes[i].get("camera") if i is not None else None})
        if not exported or not o:
            continue
        actual = node_world(i)
        expected = basis @ o.matrix_world
        delta = max_delta(matrix(actual), matrix(expected))
        record(name + "_glb_world_matrix_preserved", delta < 1e-5, {"max_abs_matrix_error": delta})
        d = o.data
        aspect = scene.render.resolution_x * scene.render.pixel_aspect_x / (scene.render.resolution_y * scene.render.pixel_aspect_y)
        horizontal = d.sensor_fit == "HORIZONTAL" or (d.sensor_fit == "AUTO" and aspect >= 1)
        expected_yfov = 2 * math.atan((d.sensor_width / aspect if horizontal else d.sensor_height) / (2 * d.lens))
        projection = gltf["cameras"][nodes[i]["camera"]]
        p = projection.get("perspective", {})
        projection_ok = (projection.get("type") == "perspective" and
                         abs(p.get("yfov", 0) - expected_yfov) < 1e-6 and
                         abs(p.get("aspectRatio", aspect) - aspect) < 1e-6 and
                         abs(p.get("znear", 0) - d.clip_start) < 1e-6 and
                         abs(p.get("zfar", 0) - d.clip_end) < 1e-5 and
                         abs(d.shift_x) < 1e-8 and abs(d.shift_y) < 1e-8)
        record(name + "_glb_projection_clip_preserved", projection_ok,
               {"lens_mm": d.lens, "expected_yfov": expected_yfov, "exported": projection,
                "sensor_shift": [d.shift_x, d.shift_y]})


def check_glb_old_graph(baseline_path, glb_path):
    old, _, _ = v01.read_glb(baseline_path)
    new, _, _ = v01.read_glb(glb_path)
    def graph(gltf):
        nodes = gltf.get("nodes", [])
        parents = {c: nodes[i].get("name") for i, n in enumerate(nodes) for c in n.get("children", [])}
        return {n.get("name"): {"parent": parents.get(i), "mesh_node": "mesh" in n,
                                "camera_node": "camera" in n, "extras": n.get("extras", {})}
                for i, n in enumerate(nodes)}
    a, b = graph(old), graph(new)
    graph_errors = [{"name": n, "before": {k: v for k, v in o.items() if k != "extras"},
                     "after": {k: v for k, v in b.get(n, {}).items() if k != "extras"}}
                    for n, o in a.items() if n not in b or any(o[k] != b[n][k] for k in ("parent", "mesh_node", "camera_node"))]
    record("v02_glb_all_v01_nodes_parent_and_node_types_preserved", not graph_errors,
           {"baseline_nodes": len(a), "current_nodes": len(b), "errors": graph_errors})
    props_errors = []
    for n in (*v01.INTERACTIVE_NAMES, *v01.TARGET_NAMES):
        for key, value in a.get(n, {}).get("extras", {}).items():
            if b.get(n, {}).get("extras", {}).get(key) != value:
                props_errors.append({"name": n, "key": key})
    record("v02_glb_v01_interaction_extras_preserved", not props_errors, props_errors)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--baseline", type=Path, default=ROOT / "blockout_v01/sharkys_room_blockout_v01.blend")
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--glb", type=Path)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    current_path = Path(bpy.data.filepath)
    output = args.output_dir or current_path.parent
    glb = args.glb or output / "sharkys_room_blockout_v02.glb"
    try:
        current = snapshot()
        bpy.ops.wm.open_mainfile(filepath=str(args.baseline))
        baseline = snapshot()
        bpy.ops.wm.open_mainfile(filepath=str(current_path))
        compare_preservation(baseline, current)
        v01.check_blend()
        v01.test_hinge("TEC_MacBookScreen", -55)
        v01.test_hinge("INT_TrashCanLid", -75)
        v01.test_hinge("INT_LightSwitch", 8, centered=True)
        v01.test_piano()
        v01.check_static_furniture_clearance()
        for name in ("TEC_MacBookScreen", "INT_TrashCanLid", "INT_LightSwitch"):
            v01.check_hinge_sweep_collisions(name)
        v01.check_glb(glb)
        check_candidates(glb)
        check_glb_old_graph(args.baseline.with_suffix(".glb"), glb)
    except Exception as exc:
        import traceback
        record("validator_completed_without_exception", False, {"error": str(exc), "traceback": traceback.format_exc()})
    counts = {s: sum(c["status"] == s for c in v01.checks) for s in ("pass", "fail", "warning")}
    report = {
        "validation_version": "2.0", "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "blend_path": str(current_path), "baseline_blend_path": str(args.baseline),
        "blender_version": bpy.app.version_string,
        "overall_status": "fail" if counts["fail"] else "pass_with_warnings" if counts["warning"] else "pass",
        "summary": counts, "checks": v01.checks, "details": v01.details,
        "verification_scope": {
            "automated": "Full v0.1 acceptance checks, baseline structure/mechanical preservation, exact 0.65m piano travel, 15 piano poses, 106/101/33 hinge poses, static furniture BVH, candidate camera nodes/projection/world transforms, GLB graph preservation.",
            "requires_visual_review": "Composition preference, reference resemblance and spatial comfort require human review. Collision checks sample surface intersections, not continuous solid containment.",
            "file_preservation": "No Blender save or GLB export occurs. Baseline snapshots are made by opening files sequentially; candidate scene reloaded before motion tests, then transforms restored.",
        },
    }
    output.mkdir(parents=True, exist_ok=True)
    path = output / "validation_v02_results.json"
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print("BLOCKOUT_V02_VALIDATION " + json.dumps({"status": report["overall_status"], "summary": counts, "output": str(path)}))
    for c in v01.checks:
        if c["status"] != "pass":
            print(c["status"].upper() + " " + c["check"] + ": " + json.dumps(c["evidence"], ensure_ascii=False))
    if counts["fail"]:
        raise RuntimeError("Blockout v0.2 acceptance failed; see validation_v02_results.json")


if __name__ == "__main__":
    main()
