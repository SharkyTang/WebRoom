"""Read-only GLB review renders; never saves or exports an asset file."""
from pathlib import Path
import sys
import bpy
from mathutils import Vector

PROJECT = Path(__file__).resolve().parents[3]
OUTPUT = PROJECT / 'validation/v06a/furniture-review'
OUTPUT.mkdir(parents=True, exist_ok=True)

families = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else 'bed bedside sofa chair coffee sidetable beanbag rugs dogbed'.split()
for family in families:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(PROJECT / 'public/models/production' / f'{family}_v06a.glb'))
    if family == 'rugs':
        # Display both independent roots beside each other, only in this review scene.
        bpy.data.objects['VIS_RugWorkstation'].location.x = -1.55
        bpy.data.objects['VIS_RugLounge'].location.x = 1.55
    bpy.context.view_layer.update()
    points = [obj.matrix_world @ vertex.co for obj in bpy.context.scene.objects
              if obj.type == 'MESH' for vertex in obj.data.vertices]
    lower = Vector([min(point[i] for point in points) for i in range(3)])
    upper = Vector([max(point[i] for point in points) for i in range(3)])
    center = (lower + upper)/2
    size = max(upper-lower)

    camera_data = bpy.data.cameras.new('ReviewCamera')
    camera = bpy.data.objects.new('ReviewCamera', camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = center + Vector((1.3, -2.2, 1.6)).normalized()*size*3
    camera.rotation_euler = (center-camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera_data.type = 'ORTHO'
    camera_data.ortho_scale = size*1.45
    bpy.context.scene.camera = camera

    for name, direction, energy, light_size in [
        ('Softbox', (0, -1, 2), 500, 4), ('Fill', (-2, 0, 1), 260, 3),
    ]:
        data = bpy.data.lights.new(name, 'AREA')
        data.energy, data.shape, data.size = energy, 'DISK', light_size
        obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(obj)
        obj.location = center + Vector(direction)*max(size, 1.3)
        obj.rotation_euler = (center-obj.location).to_track_quat('-Z', 'Y').to_euler()
    world = bpy.data.worlds.new('ReviewWorld')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (.32, .35, .38, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = .7
    bpy.context.scene.world = world
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 20
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.filepath = str(OUTPUT / f'{family}.png')
    bpy.ops.render.render(write_still=True)
