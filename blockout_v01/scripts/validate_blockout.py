"""Independent, non-saving Blender / GLB acceptance audit for Blockout v0.1.

Run with:
    blender --background sharkys_room_blockout_v01.blend \
        --python scripts/validate_blockout.py

Writes validation_results.json next to the .blend. Geometry and animation tests
are evaluated in memory, and every tested transform is restored. The script
never saves the .blend or overwrites the GLB.
"""

import argparse
import json
import math
from pathlib import Path
import struct
import sys
from datetime import datetime, timezone

import bpy
from mathutils import Matrix, Quaternion, Vector
from mathutils.bvhtree import BVHTree


GROUPS = (
    "ENVIRONMENT", "FURNITURE", "TECH", "INTERACTIVE", "DISPLAY_MODELS",
    "DECORATIONS", "LIGHTING", "CAMERAS_TARGETS",
)
GROUP_NAMES = {
    "ENVIRONMENT": (
        "ENV_RoomShell", "ENV_Floor", "ENV_Wall_Left", "ENV_Wall_Right",
        "ENV_WindowFrame", "ENV_WindowGlass", "ENV_Curtain_Left",
        "ENV_Curtain_Right", "ENV_CityBackground",
    ),
    "FURNITURE": (
        "FUR_Desk", "FUR_OfficeChair", "FUR_Bed", "FUR_BedsideTable",
        "FUR_Sofa", "FUR_CoffeeTable", "FUR_DisplayCabinet", "FUR_BeanBag",
    ),
    "TECH": (
        "TEC_MonitorBody", "TEC_MonitorScreen", "TEC_MacBookBase",
        "TEC_MacBookScreen", "TEC_Phone", "TEC_Marshall", "TEC_Keyboard",
        "TEC_Mouse", "TEC_Headphones", "TEC_iPad",
    ),
    "INTERACTIVE": (
        "INT_PianoRail", "INT_Piano", "INT_TrashCanBody", "INT_TrashCanLid",
        "INT_LightSwitch",
    ),
    "LIGHTING": (
        "LGT_Ambient", "LGT_WindowKey", "LGT_CabinetProxy", "LGT_DeskProxy",
        "LGT_BedProxy",
    ),
    "CAMERAS_TARGETS": (
        "CAM_Hero", "TGT_Monitor", "TGT_MacBook", "TGT_iPad",
        "TGT_Marshall", "TGT_Piano", "TGT_TrashCan", "TGT_LightSwitch",
        "TGT_Phone", "TGT_Window",
    ),
}
INTERACTIVE_NAMES = (
    "TEC_MonitorBody", "TEC_MonitorScreen", "TEC_MacBookBase",
    "TEC_MacBookScreen", "TEC_iPad", "TEC_Marshall", "TEC_Phone",
    "INT_PianoRail", "INT_Piano", "INT_TrashCanBody", "INT_TrashCanLid",
    "INT_LightSwitch", "ENV_WindowFrame", "ENV_WindowGlass",
)
TARGET_NAMES = GROUP_NAMES["CAMERAS_TARGETS"][1:]
REQUIRED_NAMES = tuple(n for names in GROUP_NAMES.values() for n in names)

checks = []
details = {}


def record(name, ok, evidence=None, severity="error"):
    checks.append({
        "check": name,
        "status": "pass" if ok else ("warning" if severity == "warning" else "fail"),
        "evidence": evidence,
    })


def vec(v):
    return [round(float(x), 6) for x in v]


def ancestors(obj):
    result = []
    while obj.parent:
        obj = obj.parent
        result.append(obj.name)
    return result


def bounds(obj, world=False):
    pts = [obj.matrix_world @ Vector(p) if world else Vector(p) for p in obj.bound_box]
    return [min(p[i] for p in pts) for i in range(3)], [max(p[i] for p in pts) for i in range(3)]


def aabb_intersects(a, b, epsilon=0.0003):
    # Touching faces are legitimate support contacts, not penetration.
    return all(min(a[1][i], b[1][i]) - max(a[0][i], b[0][i]) > epsilon for i in range(3))


def world_bvh(obj, depsgraph):
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        points = [evaluated.matrix_world @ v.co for v in mesh.vertices]
        faces = [tuple(p.vertices) for p in mesh.polygons]
        return BVHTree.FromPolygons(points, faces, all_triangles=False, epsilon=0.0)
    finally:
        evaluated.to_mesh_clear()


def axis_index(value, default="X"):
    value = str(value or default).upper().replace("LOCAL_", "").lstrip("+-")
    return {"X": 0, "Y": 1, "Z": 2}.get(value, {"X": 0, "Y": 1, "Z": 2}[default])


def check_blend():
    scene = bpy.context.scene
    record("blend_metric_units", scene.unit_settings.system == "METRIC" and abs(scene.unit_settings.scale_length - 1.0) < 1e-6,
           {"system": scene.unit_settings.system, "scale_length": scene.unit_settings.scale_length, "up_axis": "Z (Blender)"})
    missing_collections = [n for n in GROUPS if n not in bpy.data.collections]
    record("blend_required_collections", not missing_collections, {"required": list(GROUPS), "missing": missing_collections})
    missing = [n for n in REQUIRED_NAMES if n not in bpy.data.objects]
    record("blend_required_exact_names", not missing, {"required_count": len(REQUIRED_NAMES), "missing": missing})
    root = bpy.data.objects.get("SharkysRoom")
    record("blend_root_empty", root is not None and root.type == "EMPTY", {"name": root.name if root else None, "type": root.type if root else None})
    group_errors = []
    for group in GROUPS:
        obj = bpy.data.objects.get(group)
        if not obj or obj.type != "EMPTY" or not obj.parent or obj.parent.name != "SharkysRoom":
            group_errors.append(group)
    record("blend_export_group_empties", not group_errors, {"incorrect_groups": group_errors})
    hierarchy_errors = []
    collection_errors = []
    for group, names in GROUP_NAMES.items():
        collection = bpy.data.collections.get(group)
        for name in names:
            obj = bpy.data.objects.get(name)
            if obj and group not in ancestors(obj):
                hierarchy_errors.append({"object": name, "expected_ancestor": group, "actual": ancestors(obj)})
            if obj and collection and name not in collection.all_objects:
                collection_errors.append({"object": name, "expected_collection": group})
    record("blend_required_hierarchy", not hierarchy_errors, hierarchy_errors)
    record("blend_required_collection_membership", not collection_errors, collection_errors)
    targets = [{"name": n, "type": bpy.data.objects[n].type if n in bpy.data.objects else None} for n in TARGET_NAMES]
    record("blend_nine_target_empties", len(targets) == 9 and all(t["type"] == "EMPTY" for t in targets), targets)
    independent = []
    pointers = {}
    for name in INTERACTIVE_NAMES:
        obj = bpy.data.objects.get(name)
        # A rail may be either its own mesh or an Empty translation controller.
        valid = bool(obj and (obj.type == "MESH" or (name == "INT_PianoRail" and obj.type == "EMPTY")))
        shared = []
        if obj and obj.type == "MESH":
            ptr = obj.data.as_pointer()
            shared = pointers.setdefault(ptr, [])
            shared.append(name)
        independent.append({"name": name, "type": obj.type if obj else None, "independent_object": valid})
    shared_data = [names for names in pointers.values() if len(names) > 1]
    record("blend_interactive_independent_objects", all(x["independent_object"] for x in independent), independent)
    record("blend_interactive_independent_mesh_data", not shared_data, {"shared_mesh_datablocks": shared_data})
    piano = bpy.data.objects.get("INT_Piano")
    record("blend_piano_parent", bool(piano and piano.parent and piano.parent.name == "INT_PianoRail"), {"parent": piano.parent.name if piano and piano.parent else None})
    scales = [{"object": o.name, "scale": vec(o.scale)} for o in scene.objects if o.type in {"MESH", "EMPTY"} and any(abs(v - 1) > 1e-5 for v in o.scale)]
    record("blend_applied_mesh_and_empty_scale", not scales, scales)
    camera = bpy.data.objects.get("CAM_Hero")
    record("blend_hero_camera", bool(camera and camera.type == "CAMERA" and scene.camera == camera),
           {"active_camera": scene.camera.name if scene.camera else None, "type": camera.data.type if camera and camera.type == "CAMERA" else None})
    if camera and camera.type == "CAMERA":
        details["hero_camera"] = {"projection": camera.data.type, "lens_mm": camera.data.lens,
                                  "location": vec(camera.location), "rotation_euler_deg": [round(math.degrees(x), 4) for x in camera.rotation_euler],
                                  "clip_start_m": camera.data.clip_start, "clip_end_m": camera.data.clip_end,
                                  "render_resolution": [scene.render.resolution_x, scene.render.resolution_y], "render_percentage": scene.render.resolution_percentage}
        record("blend_hero_perspective", camera.data.type == "PERSP", {"projection": camera.data.type}, "warning")
    mesh_counts = []
    for obj in scene.objects:
        if obj.type != "MESH":
            continue
        obj.data.calc_loop_triangles()
        mesh_counts.append({"name": obj.name, "vertices": len(obj.data.vertices), "triangles": len(obj.data.loop_triangles)})
    total = sum(x["triangles"] for x in mesh_counts)
    details["blend_geometry"] = {"mesh_objects": len(mesh_counts), "vertices": sum(x["vertices"] for x in mesh_counts),
                                  "triangles": total, "largest_meshes": sorted(mesh_counts, key=lambda x: x["triangles"], reverse=True)[:12]}
    record("blend_low_complexity_geometry", total < 100000 and all(x["triangles"] < 15000 for x in mesh_counts), details["blend_geometry"])
    materials = [m.name for m in bpy.data.materials if m.users]
    record("blend_small_material_palette", len(materials) <= 12, {"count": len(materials), "names": materials}, "warning")
    material_images = {}
    for material in bpy.data.materials:
        if not material.users or not material.node_tree:
            continue
        for node in material.node_tree.nodes:
            if node.type == "TEX_IMAGE" and node.image:
                material_images[node.image.name] = node.image
    images = [{"name": im.name, "width": im.size[0], "height": im.size[1]} for im in material_images.values()]
    record("blend_no_high_resolution_material_textures", all(max(im["width"], im["height"]) <= 1024 for im in images), images)
    details["reference_images_allowed_as_documentation"] = [
        {"name": im.name, "width": im.size[0], "height": im.size[1], "packed": bool(im.packed_file), "fake_user": bool(im.use_fake_user)}
        for im in bpy.data.images if im.source != "VIEWER" and im.name not in material_images and im.users
    ]
    details["main_dimensions_m"] = {name: vec(bpy.data.objects[name].dimensions) for name in (
        "ENV_Floor", "FUR_Desk", "FUR_Bed", "FUR_Sofa", "FUR_CoffeeTable", "FUR_DisplayCabinet", "INT_Piano"
    ) if name in bpy.data.objects}


def test_hinge(name, default_angle, centered=False):
    obj = bpy.data.objects.get(name)
    if not obj or obj.type != "MESH":
        record(name + "_pivot_motion", False, "Missing mesh")
        return
    axis = axis_index(obj.get("pivot_axis", "X"))
    bb = bounds(obj)
    perpendicular = [i for i in range(3) if i != axis]
    extent_axis = max(perpendicular, key=lambda i: bb[1][i] - bb[0][i])
    extent = bb[1][extent_axis] - bb[0][extent_axis]
    edge_distance = min(abs(bb[0][extent_axis]), abs(bb[1][extent_axis]))
    center_distance = abs((bb[0][extent_axis] + bb[1][extent_axis]) * 0.5)
    tolerance = max(0.012, extent * (0.3 if centered else 0.07))
    pivot_ok = (center_distance if centered else edge_distance) <= tolerance
    record(name + "_pivot_geometry", pivot_ok, {"local_axis": "XYZ"[axis], "local_bounds": bb,
           "geometry_long_axis": "XYZ"[extent_axis], "edge_distance_m": edge_distance,
           "center_distance_m": center_distance, "tolerance_m": tolerance, "expected": "centered toggle" if centered else "hinge at mesh edge"})
    original_basis = obj.matrix_basis.copy()
    original_mode = obj.rotation_mode
    origin = obj.matrix_world.translation.copy()
    p = max((v.co for v in obj.data.vertices), key=lambda v: sum(v[i] ** 2 for i in perpendicular)).copy()
    try:
        obj.rotation_mode = "XYZ"
        current_angle = math.degrees(obj.rotation_euler[axis])
        closed_angle = float(obj.get("closed_angle_deg", current_angle))
        open_angle = float(obj.get("open_angle_deg", closed_angle + default_angle))
        obj.rotation_euler[axis] = math.radians(closed_angle)
        bpy.context.view_layer.update()
        closed_world = obj.matrix_world @ p
        origin_drift = 0.0
        poses = []
        for step in range(9):
            angle = closed_angle + (open_angle - closed_angle) * step / 8
            obj.rotation_euler[axis] = math.radians(angle)
            bpy.context.view_layer.update()
            drift = (obj.matrix_world.translation - origin).length
            origin_drift = max(origin_drift, drift)
            poses.append({"angle_deg": angle, "origin_world": vec(obj.matrix_world.translation),
                          "free_edge_world": vec(obj.matrix_world @ p)})
        displacement = (obj.matrix_world @ p - closed_world).length
        record(name + "_pivot_motion", origin_drift < 1e-5 and displacement > min(0.003, extent * 0.05),
               {"axis": "XYZ"[axis], "closed_angle_deg": closed_angle, "open_angle_deg": open_angle,
                "sample_count": len(poses), "origin_drift_m": origin_drift, "free_edge_displacement_m": displacement})
        details.setdefault("hinge_motion_samples", {})[name] = poses
    finally:
        obj.rotation_mode = original_mode
        obj.matrix_basis = original_basis
        bpy.context.view_layer.update()
    record(name + "_transform_restored", all(abs(obj.matrix_basis[r][c] - original_basis[r][c]) < 1e-6 for r in range(4) for c in range(4)))


def test_piano():
    piano = bpy.data.objects.get("INT_Piano")
    rail = bpy.data.objects.get("INT_PianoRail")
    if not piano or not rail:
        record("piano_slide_test", False, "Missing rail or piano")
        return
    controller_name = str(piano.get("slide_controller", rail.get("slide_controller", "INT_PianoRail")))
    controller = bpy.data.objects.get(controller_name) or rail
    axis_label = str(controller.get("slide_axis", piano.get("slide_axis", "-Y")))
    axis = axis_index(axis_label, "Y")
    travel = float(controller.get("slide_distance_m", piano.get("slide_distance_m", 0.65)))
    direction = -1.0 if axis_label.startswith("-") else 1.0
    # Positive distance with a signed axis; negative distance remains supported.
    delta = direction * travel
    record("piano_slide_travel_range", 0.55 <= abs(travel) <= 0.70,
           {"controller": controller.name, "axis": axis_label, "travel_m": travel})
    original = controller.matrix_basis.copy()
    original_location = controller.location.copy()
    axis_suffix = "xyz"[axis]
    retracted_position = float(controller.get("retracted_local_" + axis_suffix + "_m", original_location[axis]))
    extended_position = float(controller.get("extended_local_" + axis_suffix + "_m", retracted_position + delta))
    record("piano_slide_endpoints_match_travel", abs((extended_position - retracted_position) - delta) < 1e-5,
           {"retracted_local_m": retracted_position, "extended_local_m": extended_position,
            "default_pose_local_m": original_location[axis], "signed_travel_m": delta})
    samples = []
    collisions = []
    # Chair can be a moveable obstruction but is still checked: users should not
    # have to guess whether the initial pose intersects the playing position.
    obstacles = [o for o in bpy.context.scene.objects if o.type == "MESH"
                 and o != piano and o != rail and "INT_Piano" not in ancestors(o)
                 and "INT_PianoRail" not in ancestors(o)
                 and not o.name.startswith(("DSP_", "TGT_", "LGT_"))]
    try:
        for step in range(15):
            fraction = step / 14.0
            controller.location = original_location.copy()
            controller.location[axis] = retracted_position + (extended_position - retracted_position) * fraction
            bpy.context.view_layer.update()
            depsgraph = bpy.context.evaluated_depsgraph_get()
            piano_bounds = bounds(piano, world=True)
            candidates = [o for o in obstacles if aabb_intersects(piano_bounds, bounds(o, world=True))]
            hit_names = []
            if candidates:
                piano_bvh = world_bvh(piano, depsgraph)
                for obstacle in candidates:
                    if piano_bvh.overlap(world_bvh(obstacle, depsgraph)):
                        hit_names.append(obstacle.name)
                        collisions.append({"travel_fraction": round(fraction, 6), "obstacle": obstacle.name})
            samples.append({"travel_fraction": round(fraction, 6), "position_world": vec(piano.matrix_world.translation),
                            "bounds_world": piano_bounds, "surface_intersections": hit_names})
        displacement = (Vector(samples[-1]["position_world"]) - Vector(samples[0]["position_world"])).length
        record("piano_slide_translation", abs(displacement - abs(travel)) < 1e-4,
               {"expected_m": abs(travel), "observed_m": displacement, "controller": controller.name})
        record("piano_slide_mesh_collision_samples", not collisions,
               {"sample_count": len(samples), "collisions": collisions,
                "method": "world-space mesh BVH surface intersection, 15 evenly spaced poses; touching AABB faces excluded",
                "limitation": "Surface intersections only; complete containment and continuous collision between samples need visual review."})
        details["piano_motion_samples"] = samples
    finally:
        controller.matrix_basis = original
        bpy.context.view_layer.update()
    record("piano_transform_restored", all(abs(controller.matrix_basis[r][c] - original[r][c]) < 1e-6 for r in range(4) for c in range(4)))


def check_static_furniture_clearance():
    """Check independent main furniture; avoid intentional floor/support contact."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    furniture = [bpy.data.objects[n] for n in GROUP_NAMES["FURNITURE"]
                 if n in bpy.data.objects and bpy.data.objects[n].type == "MESH"]
    curtains_walls = [bpy.data.objects[n] for n in (
        "ENV_Curtain_Left", "ENV_Curtain_Right", "ENV_Wall_Left", "ENV_Wall_Right"
    ) if n in bpy.data.objects and bpy.data.objects[n].type == "MESH"]
    pairs = [(a, b) for i, a in enumerate(furniture) for b in furniture[i + 1:]]
    pairs.extend((a, b) for a in furniture for b in curtains_walls)
    bvh_cache = {}
    evidence = []
    intersections = []
    for a, b in pairs:
        ab, bb = bounds(a, True), bounds(b, True)
        axis_gaps = [max(0.0, ab[0][i] - bb[1][i], bb[0][i] - ab[1][i]) for i in range(3)]
        broad_overlap = aabb_intersects(ab, bb)
        contacts = []
        if broad_overlap:
            for o in (a, b):
                if o.name not in bvh_cache:
                    bvh_cache[o.name] = world_bvh(o, depsgraph)
            contacts = bvh_cache[a.name].overlap(bvh_cache[b.name])
        item = {"objects": [a.name, b.name], "positive_axis_gaps_m": vec(axis_gaps),
                "aabb_separation_lower_bound_m": round(Vector(axis_gaps).length, 6),
                "aabb_overlap": broad_overlap, "surface_intersection_pairs": len(contacts)}
        evidence.append(item)
        if contacts:
            intersections.append(item)
    record("static_main_furniture_curtains_and_walls_no_surface_intersections", not intersections,
           {"checked_pairs": len(pairs), "intersections": intersections,
            "method": "Main furniture pairs and each furniture versus rear walls/curtains, world BVH after non-touching AABB filter.",
            "excluded_intentional_contacts": "Floor support, internal parts of the same furniture mesh, rugs, supported tabletop tech, cabinet display proxies.",
            "limitation": "Surface intersection test cannot prove absence of a smaller enclosed solid entirely inside a larger solid."})
    details["static_furniture_pair_clearances"] = evidence


def check_hinge_sweep_collisions(name):
    obj = bpy.data.objects.get(name)
    if not obj or obj.type != "MESH":
        record(name + "_sweep_collision_test", False, "Missing mesh")
        return
    axis = axis_index(obj.get("pivot_axis", "X"))
    original_basis = obj.matrix_basis.copy()
    original_mode = obj.rotation_mode
    current = math.degrees(obj.rotation_euler[axis])
    start = float(obj.get("closed_angle_deg", current))
    end = float(obj.get("open_angle_deg", current))
    obstacles = [o for o in bpy.context.scene.objects if o.type == "MESH" and o != obj and obj.name not in ancestors(o)]
    bvh_cache = {}
    collisions = []
    mechanical_contacts = []
    sample_count = max(33, math.ceil(abs(end - start)) + 1)
    try:
        obj.rotation_mode = "XYZ"
        for step in range(sample_count):
            angle = start + (end - start) * step / (sample_count - 1)
            obj.rotation_euler[axis] = math.radians(angle)
            bpy.context.view_layer.update()
            depsgraph = bpy.context.evaluated_depsgraph_get()
            moving_bounds = bounds(obj, True)
            candidates = [o for o in obstacles if aabb_intersects(moving_bounds, bounds(o, True))]
            moving_bvh = world_bvh(obj, depsgraph) if candidates else None
            for obstacle in candidates:
                if obstacle.name not in bvh_cache:
                    bvh_cache[obstacle.name] = world_bvh(obstacle, depsgraph)
                overlap = moving_bvh.overlap(bvh_cache[obstacle.name])
                if not overlap:
                    continue
                other_bounds = bounds(obstacle, True)
                overlap_depths = [max(0, min(moving_bounds[1][i], other_bounds[1][i]) - max(moving_bounds[0][i], other_bounds[0][i])) for i in range(3)]
                evidence = {"angle_deg": angle, "obstacle": obstacle.name, "surface_triangle_pairs": len(overlap),
                            "aabb_overlap_depths_m": vec(overlap_depths)}
                # Blockout laptop panels may rest against the base within 3 mm
                # at their fully closed stop. Surface crossings elsewhere fail.
                if name == "TEC_MacBookScreen" and obstacle.name == "TEC_MacBookBase" and step == 0 and min(overlap_depths) <= 0.003:
                    mechanical_contacts.append(evidence)
                else:
                    collisions.append(evidence)
    finally:
        obj.rotation_mode = original_mode
        obj.matrix_basis = original_basis
        bpy.context.view_layer.update()
    record(name + "_sweep_collision_test", not collisions,
           {"sample_count": sample_count, "closed_angle_deg": start, "open_angle_deg": end,
            "collisions": collisions, "closed_stop_contacts_within_3mm": mechanical_contacts,
            "method": "World-space mesh BVH, at most 1 degree per step; all other scene mesh objects tested after broad phase.",
            "contact_rule": "Only laptop screen/base contact up to 3 mm at the fully closed stop is classified as mechanical contact.",
            "limitation": "Discrete sampled surface-intersection check, not analytic continuous or solid containment verification."})
    record(name + "_sweep_transform_restored", all(abs(obj.matrix_basis[r][c] - original_basis[r][c]) < 1e-6 for r in range(4) for c in range(4)))


def read_glb(path):
    data = path.read_bytes()
    if len(data) < 20:
        raise ValueError("GLB too short")
    magic, version, length = struct.unpack_from("<4sII", data, 0)
    if magic != b"glTF" or version != 2 or length != len(data):
        raise ValueError("Invalid GLB header / length")
    offset, gltf, bin_bytes = 12, None, 0
    while offset < len(data):
        chunk_length, kind = struct.unpack_from("<I4s", data, offset)
        offset += 8
        chunk = data[offset:offset + chunk_length]
        if len(chunk) != chunk_length:
            raise ValueError("Truncated GLB chunk")
        if kind == b"JSON":
            gltf = json.loads(chunk.decode("utf-8").rstrip(" \x00"))
        elif kind == b"BIN\x00":
            bin_bytes += chunk_length
        offset += chunk_length
    if gltf is None:
        raise ValueError("No GLB JSON chunk")
    return gltf, len(data), bin_bytes


def check_glb(path):
    record("glb_exists", path.exists(), str(path))
    if not path.exists():
        return
    try:
        gltf, size, bin_bytes = read_glb(path)
    except Exception as exc:
        record("glb_valid_container", False, str(exc))
        return
    record("glb_valid_container", True, {"version": gltf.get("asset", {}).get("version"), "size_bytes": size, "binary_chunk_bytes": bin_bytes})
    record("glb_under_5_MB", size < 5_000_000, {"bytes": size, "decimal_MB": round(size / 1e6, 6), "MiB": round(size / 1048576, 6)})
    nodes = gltf.get("nodes", [])
    by_name = {}
    for i, node in enumerate(nodes):
        by_name.setdefault(node.get("name", ""), []).append(i)
    missing = [n for n in (*REQUIRED_NAMES, *GROUPS, "SharkysRoom") if n not in by_name]
    duplicated = {n: indices for n, indices in by_name.items() if n and len(indices) > 1}
    record("glb_required_exact_names", not missing, {"missing": missing, "node_count": len(nodes)})
    record("glb_unique_node_names", not duplicated, duplicated)
    parents = {}
    duplicate_parent_nodes = []
    for i, node in enumerate(nodes):
        for child in node.get("children", []):
            if child in parents:
                duplicate_parent_nodes.append(child)
            parents[child] = i
    def node_ancestors(index):
        visited, names = set(), []
        while index in parents and index not in visited:
            visited.add(index)
            index = parents[index]
            names.append(nodes[index].get("name", ""))
        return names
    hierarchy_errors = []
    for group, names in GROUP_NAMES.items():
        for name in names:
            if name in by_name and group not in node_ancestors(by_name[name][0]):
                hierarchy_errors.append({"object": name, "expected_ancestor": group, "actual": node_ancestors(by_name[name][0])})
    for group in GROUPS:
        if group in by_name and "SharkysRoom" not in node_ancestors(by_name[group][0]):
            hierarchy_errors.append({"object": group, "expected_ancestor": "SharkysRoom"})
    piano_idx = by_name.get("INT_Piano", [None])[0]
    piano_parent = nodes[parents[piano_idx]].get("name") if piano_idx in parents else None
    if piano_parent != "INT_PianoRail":
        hierarchy_errors.append({"object": "INT_Piano", "expected_parent": "INT_PianoRail", "actual_parent": piano_parent})
    record("glb_hierarchy_preserved", not hierarchy_errors and not duplicate_parent_nodes,
           {"hierarchy_errors": hierarchy_errors, "multiple_parent_nodes": duplicate_parent_nodes})
    distinct = []
    mesh_node_ids = []
    for name in INTERACTIVE_NAMES:
        indices = by_name.get(name, [])
        node = nodes[indices[0]] if indices else {}
        ok = len(indices) == 1 and ("mesh" in node or name == "INT_PianoRail")
        distinct.append({"name": name, "node": indices[0] if indices else None, "mesh": node.get("mesh"), "valid": ok})
        if indices:
            mesh_node_ids.append(indices[0])
    record("glb_interactive_independent_nodes", all(x["valid"] for x in distinct) and len(set(mesh_node_ids)) == len(INTERACTIVE_NAMES), distinct)
    # Blender is Z-up, while standard glTF is Y-up. Compare exported world
    # origins after the official (+X,+Z,-Y) basis conversion, not raw values.
    basis = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, -1, 0, 0), (0, 0, 0, 1)))
    world_cache = {}
    def node_world(index):
        if index in world_cache:
            return world_cache[index]
        node = nodes[index]
        if "matrix" in node:
            flat = node["matrix"]
            local = Matrix([[flat[c * 4 + r] for c in range(4)] for r in range(4)])
        else:
            t = Matrix.Translation(Vector(node.get("translation", (0, 0, 0))))
            q = node.get("rotation", (0, 0, 0, 1))
            r = Quaternion((q[3], q[0], q[1], q[2])).to_matrix().to_4x4()
            scale = list(node.get("scale", (1, 1, 1))) + [1]
            local = t @ r @ Matrix.Diagonal(Vector(scale))
        world = node_world(parents[index]) @ local if index in parents else local
        world_cache[index] = world
        return world
    pivot_comparisons = []
    for name in (*INTERACTIVE_NAMES, *TARGET_NAMES):
        obj = bpy.data.objects.get(name)
        if obj is None or name not in by_name:
            continue
        actual = node_world(by_name[name][0]).translation
        expected = basis @ obj.matrix_world.translation
        error = (actual - expected).length
        pivot_comparisons.append({"name": name, "exported_world_origin_Y_up": vec(actual),
                                  "expected_world_origin_Y_up": vec(expected), "error_m": error})
    record("glb_interactive_and_target_world_origins_preserved", len(pivot_comparisons) == len(INTERACTIVE_NAMES) + len(TARGET_NAMES)
           and all(item["error_m"] < 0.0001 for item in pivot_comparisons), pivot_comparisons)
    exported_targets = [n for n in TARGET_NAMES if n in by_name]
    record("glb_nine_targets", len(exported_targets) == 9, {"exported": exported_targets})
    hero = nodes[by_name["CAM_Hero"][0]] if "CAM_Hero" in by_name else {}
    record("glb_hero_camera_exported", "camera" in hero, {"camera_index": hero.get("camera"), "camera_count": len(gltf.get("cameras", []))})
    blender_camera = bpy.data.objects.get("CAM_Hero")
    if "camera" in hero and blender_camera and blender_camera.type == "CAMERA":
        exported_camera = gltf["cameras"][hero["camera"]]
        scene = bpy.context.scene
        camera = blender_camera.data
        aspect = scene.render.resolution_x * scene.render.pixel_aspect_x / (scene.render.resolution_y * scene.render.pixel_aspect_y)
        sensor_fit = camera.sensor_fit
        # AUTO selects the longer render axis. Horizontal sensor fit uses width;
        # Blender vertical sensor fit uses height, with pixel aspect applied.
        horizontal = sensor_fit == "HORIZONTAL" or (sensor_fit == "AUTO" and aspect >= 1)
        expected_yfov = 2 * math.atan((camera.sensor_width / aspect if horizontal else camera.sensor_height) / (2 * camera.lens))
        perspective = exported_camera.get("perspective", {})
        actual_yfov = perspective.get("yfov")
        shift_ok = abs(camera.shift_x) < 1e-6 and abs(camera.shift_y) < 1e-6
        record("glb_hero_camera_projection_matches_blend", actual_yfov is not None and abs(actual_yfov - expected_yfov) < 1e-6
               and abs(perspective.get("aspectRatio", aspect) - aspect) < 1e-6 and shift_ok,
               {"expected_vertical_fov_rad": expected_yfov, "exported_vertical_fov_rad": actual_yfov,
                "expected_aspect_ratio": aspect, "exported_aspect_ratio": perspective.get("aspectRatio"),
                "blender_sensor_shift": [camera.shift_x, camera.shift_y]})
    materials = [m.get("name", "") for m in gltf.get("materials", [])]
    triangles, vertices = 0, 0
    for mesh in gltf.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            attributes = primitive.get("attributes", {})
            count = gltf["accessors"][attributes["POSITION"]]["count"] if "POSITION" in attributes else 0
            vertices += count
            n = gltf["accessors"][primitive["indices"]]["count"] if "indices" in primitive else count
            mode = primitive.get("mode", 4)
            triangles += n // 3 if mode == 4 else max(0, n - 2) if mode in (5, 6) else 0
    details["glb"] = {"path": str(path), "size_bytes": size, "nodes": len(nodes), "meshes": len(gltf.get("meshes", [])),
                      "triangles": triangles, "vertices": vertices, "materials": materials,
                      "textures": len(gltf.get("textures", [])), "images": len(gltf.get("images", [])),
                      "cameras": gltf.get("cameras", []), "extensions_used": gltf.get("extensionsUsed", []),
                      "root_scene_nodes": [nodes[i].get("name", "") for i in gltf.get("scenes", [{}])[gltf.get("scene", 0)].get("nodes", [])]}
    record("glb_low_complexity_geometry", triangles < 100000, {"triangles": triangles, "vertices": vertices})
    record("glb_small_material_palette", len(materials) <= 12, {"count": len(materials), "names": materials}, "warning")
    record("glb_no_texture_payload", not gltf.get("images"), {"images": len(gltf.get("images", []))})


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--glb", type=Path)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    output_dir = args.output_dir or Path(bpy.data.filepath).parent
    glb_path = args.glb or output_dir / "sharkys_room_blockout_v01.glb"
    original_dirty = bpy.data.is_dirty
    try:
        check_blend()
        test_hinge("TEC_MacBookScreen", -55)
        test_hinge("INT_TrashCanLid", -75)
        test_hinge("INT_LightSwitch", 8, centered=True)
        test_piano()
        check_static_furniture_clearance()
        for name in ("TEC_MacBookScreen", "INT_TrashCanLid", "INT_LightSwitch"):
            check_hinge_sweep_collisions(name)
        check_glb(glb_path)
    except Exception as exc:
        import traceback
        record("validator_completed_without_exception", False, {"error": str(exc), "traceback": traceback.format_exc()})
    counts = {status: sum(c["status"] == status for c in checks) for status in ("pass", "fail", "warning")}
    report = {
        "validation_version": "1.0", "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "blend_path": bpy.data.filepath, "blender_version": bpy.app.version_string,
        "overall_status": "fail" if counts["fail"] else "pass_with_warnings" if counts["warning"] else "pass",
        "summary": counts, "checks": checks, "details": details,
        "verification_scope": {
            "automated": "Required names, collections, hierarchy, independent interactive meshes, target empties, local pivot geometry, transform restoration, sampled piano mesh collisions, GLB container/nodes/materials/triangles/camera/size.",
            "requires_visual_review": "Reference resemblance, comfortable proportions, furniture relationships, full hinge sweep collisions and visual realism are not automatically certified.",
            "file_preservation": "Audit does not call save or export; tested object transforms are restored in memory.",
            "initial_blend_dirty_flag": original_dirty,
        },
    }
    output_dir.mkdir(parents=True, exist_ok=True)
    result_path = output_dir / "validation_results.json"
    result_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print("BLOCKOUT_VALIDATION " + json.dumps({"status": report["overall_status"], "summary": counts, "output": str(result_path)}))
    for check in checks:
        if check["status"] != "pass":
            print(check["status"].upper() + " " + check["check"] + ": " + json.dumps(check["evidence"], ensure_ascii=False))


if __name__ == "__main__":
    main()
