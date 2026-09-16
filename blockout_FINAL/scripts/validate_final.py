"""Read-only final blockout acceptance against the validated v0.2 source.

Run Blender with the final blend loaded, --python-exit-code 1 --python this-file.
The audit never saves a blend or exports a GLB. JSON results are the only output.
"""
import argparse
from datetime import datetime, timezone
import importlib.util
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


v02 = module("v02_audit", ROOT / "blockout_v02/scripts/validate_v02.py")
v01 = v02.v01
deps = module("side_table_dependencies", Path(__file__).with_name("dependency_audit.py"))
record = v01.record


def scene_snapshot():
    result = v02.snapshot()
    result["side_table_dependencies"] = deps.dependency_audit()
    result["render_geometry"] = [bpy.context.scene.render.resolution_x,
                                  bpy.context.scene.render.resolution_y,
                                  bpy.context.scene.render.pixel_aspect_x,
                                  bpy.context.scene.render.pixel_aspect_y]
    for o in bpy.context.scene.objects:
        result["objects"][o.name]["modifiers"] = [{"name": m.name, "type": m.type,
            "viewport": m.show_viewport, "render": m.show_render,
            "width": getattr(m, "width", None), "segments": getattr(m, "segments", None)} for m in o.modifiers]
    return result


def compare_frozen(before, after):
    old, new = before["objects"], after["objects"]
    missing = sorted(set(old) - set(new))
    added = sorted(set(new) - set(old))
    record("final_all_v02_objects_retained", not missing,
           {"baseline_count": len(old), "final_count": len(new), "missing": missing, "added": added})
    allowed_additions = [n for n in added if n == "CAM_Hero_FINAL" or n.startswith("DSP_") or n.startswith("FUR_DisplayCabinet_")]
    record("final_only_authorized_new_objects", len(allowed_additions) == len(added), added)
    for field in ("type", "parent", "collections"):
        errors = [{"name": n, "before": a[field], "after": new[n][field]} for n, a in old.items()
                  if n in new and a[field] != new[n][field]]
        record("final_v02_all_object_" + field + "_preserved", not errors and not missing, errors)
    record("final_collection_hierarchy_unchanged", before["collections"] == after["collections"],
           {"before": before["collections"], "after": after["collections"]})
    transform_exceptions = {n for n in old if n.startswith("DSP_")}
    mesh_exceptions = transform_exceptions | {"FUR_DisplayCabinet", "FUR_SideTable"}
    errors = {key: [] for key in ("matrix_world", "matrix_basis", "matrix_parent_inverse", "rotation_mode", "local_geometry_sha256", "modifiers", "properties")}
    changes = {}
    for name, a in old.items():
        if name not in new:
            continue
        b = new[name]
        for key in errors:
            if key.startswith("matrix") or key == "rotation_mode":
                if name in transform_exceptions:
                    continue
            elif key in ("local_geometry_sha256", "modifiers", "properties") and name in mesh_exceptions:
                continue
            if key == "properties" and name == "SharkysRoom":
                # Final freeze declarations may be added to the root; v0.2's
                # existing properties and all interactive properties stay fixed.
                mismatch = any(b[key].get(k) != val for k, val in a[key].items())
            else:
                mismatch = a.get(key) != b.get(key)
            if mismatch:
                errors[key].append(name)
        changed_fields = [k for k in ("matrix_world", "local_geometry_sha256", "dimensions", "properties", "modifiers") if a.get(k) != b.get(k)]
        if changed_fields:
            changes[name] = {"changed_fields": changed_fields,
                             "before_origin": a["origin_world"], "after_origin": b["origin_world"],
                             "before_dimensions": a["dimensions"], "after_dimensions": b["dimensions"]}
    for key, value in errors.items():
        record("final_frozen_" + key + "_exactly_preserved", not value, {"changed_frozen_objects": value})
    v01.details["v02_to_final_changes"] = changes
    oldcab, newcab = old["FUR_DisplayCabinet"], new["FUR_DisplayCabinet"]
    record("final_cabinet_outer_bounds_and_origin_unchanged",
           oldcab["origin_world"] == newcab["origin_world"] and v02.max_delta(oldcab["local_bounds"], newcab["local_bounds"]) < 1e-6,
           {"old_origin": oldcab["origin_world"], "new_origin": newcab["origin_world"],
            "old_local_bounds": oldcab["local_bounds"], "new_local_bounds": newcab["local_bounds"]})
    for name in ("CAM_Hero", "CAM_Hero_45", "CAM_Hero_48", "CAM_Hero_52"):
        record(name + "_historic_camera_exactly_unchanged", old[name]["camera"] == new[name]["camera"], new[name]["camera"])
    final = new.get("CAM_Hero_FINAL")
    source = old["CAM_Hero_48"]["camera"]
    camera = final.get("camera", {}) if final else {}
    camera_fields = [k for k in source if k != "custom_properties"]
    equal = all(camera.get(k) == source[k] for k in camera_fields)
    target = source["custom_properties"]["composition_target_xyz_m"]
    target_equal = camera.get("custom_properties", {}).get("composition_target_xyz_m") == target
    record("final_camera_exact_copy_of_selected_v02_48", equal and target_equal,
           {"matching_transform_lens_sensor_clip": equal, "target_preserved": target_equal,
            "expected_target": target, "parameters": camera})
    record("final_active_camera_is_CAM_Hero_FINAL", after["active_camera"] == "CAM_Hero_FINAL", after["active_camera"])
    record("final_render_aspect_resolution_preserved", before["render_geometry"] == after["render_geometry"], after["render_geometry"])
    travel = float(bpy.data.objects["INT_PianoRail"].get("slide_distance_m", 0))
    record("final_piano_exact_0_65m_travel_preserved", abs(abs(travel) - .65) < 1e-7, travel)
    depkeys = ("parent", "collections", "children", "constraints", "modifiers", "animation_data_present", "incoming_references", "incoming_drivers", "world_origin", "own_custom_properties")
    a, b = before["side_table_dependencies"], after["side_table_dependencies"]
    depchanges = [k for k in depkeys if a[k] != b[k]]
    record("final_side_table_dependencies_preserved", not depchanges, {"changed_fields": depchanges, "before": a, "after": b})
    v01.details["active_final_camera"] = camera
    v01.details["side_table_dependency_audit"] = {"before": a, "after": b}


def local_bounds_in(obj, space):
    transform = space.matrix_world.inverted() @ obj.matrix_world
    points = [transform @ v.co for v in obj.data.vertices]
    return [[min(p[i] for p in points) for i in range(3)], [max(p[i] for p in points) for i in range(3)]]


def connected_component_bounds(obj):
    """Cabinet panels are disconnected box components, enabling solid AABB checks."""
    adjacent = {v.index: set() for v in obj.data.vertices}
    for edge in obj.data.edges:
        a, b = edge.vertices
        adjacent[a].add(b)
        adjacent[b].add(a)
    left, components = set(adjacent), []
    while left:
        todo, ids = [left.pop()], []
        while todo:
            index = todo.pop()
            ids.append(index)
            for neighbor in adjacent[index]:
                if neighbor in left:
                    left.remove(neighbor)
                    todo.append(neighbor)
        points = [obj.data.vertices[i].co for i in ids]
        bounds = [[min(p[i] for p in points) for i in range(3)], [max(p[i] for p in points) for i in range(3)]]
        components.append({"bounds": bounds, "vertices": len(ids)})
    return components


def cabinet_checks(output):
    cabinet = bpy.data.objects["FUR_DisplayCabinet"]
    proxies = [o for o in bpy.context.scene.objects if o.name.startswith("DSP_") and o.type == "MESH"]
    hierarchy_errors = [o.name for o in proxies if not o.parent or o.parent.name != "DISPLAY_MODELS"
                        or "DISPLAY_MODELS" not in [c.name for c in o.users_collection]]
    record("final_all_display_proxies_keep_display_hierarchy", not hierarchy_errors, hierarchy_errors)
    dg = bpy.context.evaluated_depsgraph_get()
    cabinet_bvh = v01.world_bvh(cabinet, dg)
    slab_components = connected_component_bounds(cabinet)
    local_bounds = {o.name: local_bounds_in(o, cabinet) for o in proxies}
    errors, solid_errors, pair_errors = [], [], []
    for obj in proxies:
        hits = cabinet_bvh.overlap(v01.world_bvh(obj, dg))
        if hits:
            errors.append({"proxy": obj.name, "surface_pairs": len(hits)})
        for index, panel in enumerate(slab_components):
            if v01.aabb_intersects(local_bounds[obj.name], panel["bounds"]):
                solid_errors.append({"proxy": obj.name, "cabinet_panel_index": index, "panel": panel})
    for index, a in enumerate(proxies):
        for b in proxies[index + 1:]:
            if v01.aabb_intersects(local_bounds[a.name], local_bounds[b.name]):
                pair_errors.append([a.name, b.name])
    record("final_display_proxies_do_not_cross_cabinet_surfaces", not errors, errors)
    record("final_display_proxies_do_not_penetrate_solid_box_panels", not solid_errors,
           {"cabinet_connected_panels": len(slab_components), "penetrations": solid_errors})
    record("final_display_proxies_do_not_overlap_one_another", not pair_errors, pair_errors)
    metadata = json.loads((output / "build_FINAL_metadata.json").read_text())
    compartments = metadata.get("cabinet_compartments", [])
    containment, assigned = [], []
    for compartment in compartments:
        cb = compartment["bounds_local"]
        for name in compartment.get("proxies", []):
            assigned.append(name)
            pb = local_bounds.get(name)
            ok = pb is not None and all(pb[0][i] >= cb[0][i] - 1e-5 and pb[1][i] <= cb[1][i] + 1e-5 for i in range(3))
            containment.append({"proxy": name, "compartment": compartment["name"], "contained": ok,
                                "proxy_bounds_cabinet_local": pb, "compartment_bounds_local": cb,
                                "lower_clearance_xyz_m": [pb[0][i] - cb[0][i] for i in range(3)] if pb else None,
                                "upper_clearance_xyz_m": [cb[1][i] - pb[1][i] for i in range(3)] if pb else None})
    record("final_every_proxy_assigned_to_one_compartment", sorted(assigned) == sorted(local_bounds),
           {"assigned": assigned, "scene_proxies": sorted(local_bounds)})
    record("final_all_proxies_contained_in_reserved_clear_space", bool(containment) and all(x["contained"] for x in containment), containment)
    record("final_compartments_keep_cabinet_outer_envelope", all(all(c["bounds_local"][0][i] >= v01.bounds(cabinet)[0][i] - 1e-5 and c["bounds_local"][1][i] <= v01.bounds(cabinet)[1][i] + 1e-5 for i in range(3)) for c in compartments), compartments)
    v01.details["cabinet_compartments"] = compartments
    v01.details["display_proxy_containment"] = containment
    v01.details["cabinet_solid_panel_bounds"] = slab_components


def side_table_checks():
    table = bpy.data.objects["FUR_SideTable"]
    lamp = bpy.data.objects["DEC_Lamp_Lounge"]
    dg = bpy.context.evaluated_depsgraph_get()
    bvh = v01.world_bvh(table, dg)
    intersections = []
    for other in bpy.context.scene.objects:
        if other.type != "MESH" or other == table:
            continue
        if v01.aabb_intersects(v01.bounds(table, True), v01.bounds(other, True)):
            overlaps = bvh.overlap(v01.world_bvh(other, dg))
            if overlaps:
                intersections.append({"other": other.name, "surface_pairs": len(overlaps)})
    record("final_side_table_no_static_mesh_intersections", not intersections, intersections)
    lamp_points = [lamp.matrix_world @ v.co for v in lamp.data.vertices]
    bottom = min(p.z for p in lamp_points)
    foot_points = [p for p in lamp_points if abs(p.z - bottom) < 1e-5]
    foot_points.append(Vector((lamp.matrix_world.translation.x, lamp.matrix_world.translation.y, bottom)))
    support = []
    for p in foot_points:
        hit, normal, face, distance = bvh.ray_cast(p + Vector((0, 0, .05)), Vector((0, 0, -1)), .10)
        error = abs(hit.z - p.z) if hit is not None else None
        support.append({"lamp_foot": list(p), "table_hit": list(hit) if hit is not None else None,
                        "height_error_m": error, "supported": error is not None and error < .003})
    record("final_lamp_supported_by_round_tabletop", all(p["supported"] for p in support), support)
    zmax = max(v.co.z for v in table.data.vertices)
    perimeter = [v.co for v in table.data.vertices if abs(v.co.z - zmax) < 1e-5]
    radii = [(p.x ** 2 + p.y ** 2) ** .5 for p in perimeter if (p.x ** 2 + p.y ** 2) ** .5 > .02]
    round_top = len(radii) >= 12 and max(radii) - min(radii) < .005
    record("final_side_table_round_lightweight_proxy", round_top and max(table.dimensions.x, table.dimensions.y) <= .60,
           {"top_perimeter_vertices": len(radii), "min_radius": min(radii) if radii else None,
            "max_radius": max(radii) if radii else None, "dimensions": list(table.dimensions)})
    v01.details["side_table_lamp_support"] = support


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--baseline", type=Path, default=ROOT / "blockout_v02/sharkys_room_blockout_v02.blend")
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--glb", type=Path)
    parser.add_argument("--require-locked", action="store_true")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    final_path = Path(bpy.data.filepath)
    output = args.output_dir or final_path.parent
    glb = args.glb or output / "sharkys_room_blockout_FINAL.glb"
    try:
        current = scene_snapshot()
        bpy.ops.wm.open_mainfile(filepath=str(args.baseline))
        baseline = scene_snapshot()
        bpy.ops.wm.open_mainfile(filepath=str(final_path))
        compare_frozen(baseline, current)
        def adapted_record(name, ok, evidence=None, severity="error"):
            if name == "blend_hero_camera":
                cam = bpy.context.scene.camera
                return record("blend_final_hero_camera", bool(cam and cam.name == "CAM_Hero_FINAL" and cam.type == "CAMERA"),
                              {"active_camera": cam.name if cam else None})
            return record(name, ok, evidence, severity)
        v01.record = adapted_record
        v01.check_blend()
        v01.test_hinge("TEC_MacBookScreen", -55)
        v01.test_hinge("INT_TrashCanLid", -75)
        v01.test_hinge("INT_LightSwitch", 8, centered=True)
        v01.test_piano()
        v01.check_static_furniture_clearance()
        for name in ("TEC_MacBookScreen", "INT_TrashCanLid", "INT_LightSwitch"):
            v01.check_hinge_sweep_collisions(name)
        v01.check_glb(glb)
        v02.CAMERAS["CAM_Hero_FINAL"] = 48.0
        # The v02 candidate audit expects 3 cameras; final adds a fourth copy.
        def candidate_record(name, ok, evidence=None, severity="error"):
            if name == "v02_candidates_have_independent_camera_data":
                cams = [bpy.data.objects[n] for n in v02.CAMERAS]
                return record("final_four_additional_cameras_have_independent_data", len({o.data.as_pointer() for o in cams}) == 4,
                              {o.name: o.data.name for o in cams})
            return adapted_record(name, ok, evidence, severity)
        v02.record = candidate_record
        v02.check_candidates(glb)
        v02.check_glb_old_graph(args.baseline.with_suffix(".glb"), glb)
        cabinet_checks(output)
        side_table_checks()
        scene = bpy.context.scene
        root = bpy.data.objects["SharkysRoom"]
        marker_keys = ("freeze_status", "blockout_version", "blockout_status", "final_hero_camera", "spatial_source_of_truth")
        markers = {"scene": {k: v02.native(scene.get(k)) for k in marker_keys},
                   "root": {k: v02.native(root.get(k)) for k in marker_keys},
                   "stage": scene.get("stage"), "final_hero_camera_selected": scene.get("final_hero_camera_selected")}
        v01.details["final_freeze_markers"] = markers
        if args.require_locked:
            expected = {"freeze_status": "COMPOSITION_LOCKED", "blockout_version": "v0.2.1",
                        "blockout_status": "SHARKY'S ROOM — BLOCKOUT FINAL / COMPOSITION LOCKED",
                        "final_hero_camera": "CAM_Hero_FINAL"}
            locked = all(scene.get(k) == v and root.get(k) == v for k, v in expected.items())
            locked = locked and root.get("spatial_source_of_truth") == True and scene.get("final_hero_camera_selected") == True
            locked = locked and scene.get("stage") == expected["blockout_status"]
            record("final_freeze_declaration_complete", locked, markers)
            gltf, _, _ = v01.read_glb(glb)
            export_root = next((n for n in gltf.get("nodes", []) if n.get("name") == "SharkysRoom"), {})
            extras = export_root.get("extras", {})
            record("final_glb_freeze_declaration_preserved", all(extras.get(k) == v for k, v in expected.items()) and extras.get("spatial_source_of_truth") == True, extras)
    except Exception as exc:
        import traceback
        record("final_validator_completed_without_exception", False, {"error": str(exc), "traceback": traceback.format_exc()})
    counts = {s: sum(c["status"] == s for c in v01.checks) for s in ("pass", "fail", "warning")}
    report = {"validation_version": "2.1_FINAL", "timestamp_utc": datetime.now(timezone.utc).isoformat(),
              "blend_path": str(final_path), "baseline_blend_path": str(args.baseline), "blender_version": bpy.app.version_string,
              "overall_status": "fail" if counts["fail"] else "pass_with_warnings" if counts["warning"] else "pass",
              "summary": counts, "checks": v01.checks, "details": v01.details,
              "verification_scope": {"automated": "Frozen v02 structure, transforms and geometry; selected camera exact copy and all five camera exports; full v01 motion/static checks; cabinet solid slab/proxy and clear-space checks; side-table dependency and lamp support.",
                                     "limitations": "Composition preference requires visual review. Motion collision checks are discrete surface intersections; cabinet panel checks add axis-aligned solid-overlap detection."
                                     }}
    output.mkdir(parents=True, exist_ok=True)
    path = output / "validation_results.json"
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print("FINAL_VALIDATION " + json.dumps({"status": report["overall_status"], "summary": counts, "output": str(path)}))
    for check in v01.checks:
        if check["status"] != "pass":
            print(check["status"].upper() + " " + check["check"] + ": " + json.dumps(check["evidence"], ensure_ascii=False))
    if counts["fail"]:
        raise RuntimeError("Final blockout acceptance failed")


if __name__ == "__main__":
    main()
