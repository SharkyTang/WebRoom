"""Read-only FINAL geometry audit; writes planning JSON only, never saves/exports.

Run: /Applications/Blender.app/Contents/MacOS/Blender --background
  ../blockout_FINAL/sharkys_room_blockout_FINAL.blend --python-exit-code 1
  --python validation/v06a/planning/measure_blender_components.py
"""
from pathlib import Path
import hashlib
import json
import bpy

OUT = Path(__file__).resolve().parent
PROJECT = OUT.parents[2]
SOURCE = PROJECT.parent / 'blockout_FINAL/sharkys_room_blockout_FINAL.blend'
assert Path(bpy.data.filepath).resolve() == SOURCE.resolve()
initial_hash = hashlib.sha256(SOURCE.read_bytes()).hexdigest()

A_NODES = [
    'ENV_RoomShell', 'ENV_Floor', 'ENV_Wall_Left', 'ENV_Wall_Right',
    'ENV_WindowFrame', 'ENV_WindowGlass', 'ENV_Curtain_Left', 'ENV_Curtain_Right',
    'ENV_Door', 'DEC_DoorHandle', 'FUR_DisplayCabinet', 'FUR_Desk',
    'FUR_OfficeChair', 'FUR_Bed', 'FUR_BedsideTable', 'FUR_Sofa',
    'FUR_CoffeeTable', 'FUR_BeanBag', 'FUR_SideTable',
    'DEC_Rug_Workstation', 'DEC_Rug_Lounge', 'DEC_DogBedProxy',
]
LABELS = {
    'FUR_Desk': ['tabletop', 'left_integrated_side_cabinet', 'right_integrated_side_cabinet', 'rear_crossbar'],
    'FUR_DisplayCabinet': ['back_panel', 'front_end_panel', 'rear_end_panel', 'bottom_shelf', 'full_lower_shelf', 'top_shelf', 'castle_falcon_shelf', 'main_divider', 'eiffel_sls_divider', 'sls_small_slots_divider', 'f1_divider', 'small_slot_lower_shelf', 'small_slot_upper_shelf'],
    'FUR_Bed': ['bed_frame', 'mattress', 'cover', 'headboard', 'left_pillow', 'right_pillow'],
    'FUR_Sofa': ['base', 'back', 'left_arm', 'right_arm', 'left_seat', 'right_seat', 'left_back_cushion', 'right_back_cushion'],
    'FUR_CoffeeTable': ['tabletop', 'leg_1', 'leg_2', 'leg_3', 'leg_4'],
    'FUR_SideTable': ['round_tabletop', 'leg_1', 'leg_2', 'leg_3'],
    'FUR_BeanBag': ['lower_soft_volume', 'raised_back_soft_volume'],
    'DEC_DogBedProxy': ['dog_bed_only_A', 'future_dog_body_proxy_preserve_for_C', 'future_dog_head_proxy_preserve_for_C'],
    'ENV_Wall_Left': ['rear_wall_segment', 'front_door_jamb_segment', 'door_lintel'],
    'ENV_Wall_Right': ['left_window_jamb_wall', 'right_window_jamb_wall', 'window_sill_wall', 'window_lintel_wall'],
}

def web(point):
    return [float(point[0]), float(point[2]), -float(point[1])]

def bounds(points):
    points = list(points)
    if not points:
        return None
    lo = [min(p[i] for p in points) for i in range(3)]
    hi = [max(p[i] for p in points) for i in range(3)]
    return {'min': lo, 'max': hi, 'size': [hi[i] - lo[i] for i in range(3)]}

def components(obj):
    adjacent = [set() for _ in obj.data.vertices]
    for edge in obj.data.edges:
        a, b = edge.vertices
        adjacent[a].add(b)
        adjacent[b].add(a)
    remaining = set(range(len(adjacent)))
    result = []
    while remaining:
        seed = min(remaining)
        remaining.remove(seed)
        todo, ids = [seed], []
        while todo:
            index = todo.pop()
            ids.append(index)
            for other in adjacent[index]:
                if other in remaining:
                    remaining.remove(other)
                    todo.append(other)
        component_ids = set(ids)
        faces = [face for face in obj.data.polygons if set(face.vertices).issubset(component_ids)]
        points = [obj.data.vertices[index].co for index in ids]
        labels = LABELS.get(obj.name, [])
        result.append({
            'componentIndex': len(result),
            'label': labels[len(result)] if len(result) < len(labels) else 'component_' + str(len(result)),
            'vertexCount': len(ids), 'polygonCount': len(faces),
            'materialNames': sorted({obj.data.materials[face.material_index].name for face in faces}),
            'localBoundsBlender': bounds(points),
            'localBoundsWeb': bounds(web(p) for p in points),
            'worldBoundsWeb': bounds(web(obj.matrix_world @ p) for p in points),
        })
    return result

bpy.context.view_layer.update()
objects = {}
for name in A_NODES + ['INT_Piano', 'FUR_OfficeChair']:
    obj = bpy.data.objects[name]
    record = {'type': obj.type, 'parent': obj.parent.name if obj.parent else None,
              'originWeb': web(obj.matrix_world.translation)}
    if obj.type == 'MESH':
        record['components'] = components(obj)
        record['meshDataMaterials'] = [mat.name for mat in obj.data.materials]
        record['localBoundsWeb'] = bounds(web(v.co) for v in obj.data.vertices)
        record['worldBoundsWeb'] = bounds(web(obj.matrix_world @ v.co) for v in obj.data.vertices)
    objects[name] = record

assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == initial_hash
payload = {'source': str(SOURCE), 'sha256BeforeAndAfter': initial_hash,
           'coordinateSystem': 'Web/glTF Y-up metres unless field explicitly says Blender',
           'method': 'Fresh read of frozen .blend raw disconnected topology; original vertex order preserves solid components. No scene edits, save, or export.',
           'objects': objects}
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'blender-solid-components.json').write_text(json.dumps(payload, indent=2, ensure_ascii=False))
print(json.dumps({'objects': len(objects), 'deskSolids': len(objects['FUR_Desk']['components']),
                  'cabinetPanels': len(objects['FUR_DisplayCabinet']['components']),
                  'dogBedAndDogComponents': objects['DEC_DogBedProxy']['components'],
                  'output': str(OUT / 'blender-solid-components.json')}))
