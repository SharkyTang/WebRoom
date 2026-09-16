"""Refresh non-model report metadata from the saved scene; do not save or export."""
import bpy, json, math
from pathlib import Path
OUT=Path(__file__).resolve().parents[1]
path=OUT/'build_v02_metadata.json'
meta=json.loads(path.read_text())
bpy.context.view_layer.update()
for name,change in meta['changes'].items():
    o=bpy.data.objects[name]
    change['after']['location']=list(o.location)
    change['after']['rotation_degrees']=[math.degrees(a) for a in o.rotation_euler]
    change['after']['origin_world']=list(o.matrix_world.translation)
    change['after']['scale']=list(o.scale)
    if o.type=='MESH':
        change['after']['local_geometry_dimensions']=[max(v.co[i] for v in o.data.vertices)-min(v.co[i] for v in o.data.vertices) for i in range(3)]
path.write_text(json.dumps(meta,indent=2,ensure_ascii=False))
print('V02_REPORT_METADATA_REFRESHED_WITHOUT_SAVING_SCENE')
