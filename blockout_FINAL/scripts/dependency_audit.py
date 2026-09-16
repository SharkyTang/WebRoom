"""Read-only side-table dependency inventory, reusable by final validator."""
import json
from pathlib import Path
import bpy


def dependency_audit(name="FUR_SideTable"):
    obj = bpy.data.objects.get(name)
    if not obj:
        return {"exists": False}
    refs = []
    drivers = []
    for owner in bpy.data.objects:
        for collection in (owner.constraints, owner.modifiers):
            for element in collection:
                for prop in element.bl_rna.properties:
                    if prop.type != "POINTER" or prop.identifier == "rna_type":
                        continue
                    try:
                        target = getattr(element, prop.identifier)
                        if target == obj:
                            refs.append({"owner": owner.name, "type": element.type,
                                         "name": element.name, "property": prop.identifier})
                    except (AttributeError, TypeError):
                        pass
        if owner.animation_data:
            for curve in owner.animation_data.drivers:
                for variable in curve.driver.variables:
                    for target in variable.targets:
                        if target.id == obj or target.id == obj.data:
                            drivers.append({"owner": owner.name, "data_path": curve.data_path,
                                            "variable": variable.name})
        for key, value in owner.items():
            if name in str(value):
                refs.append({"owner": owner.name, "type": "CUSTOM_PROPERTY",
                             "property": key, "value": str(value)})
    return {"exists": True, "name": obj.name, "type": obj.type,
            "parent": obj.parent.name if obj.parent else None,
            "collections": sorted(c.name for c in obj.users_collection),
            "children": sorted(o.name for o in obj.children),
            "constraints": [{"name": c.name, "type": c.type} for c in obj.constraints],
            "modifiers": [{"name": m.name, "type": m.type} for m in obj.modifiers],
            "animation_data_present": obj.animation_data is not None,
            "incoming_references": refs, "incoming_drivers": drivers,
            "mesh_data_users": obj.data.users if obj.data else None,
            "own_custom_properties": {k: str(v) for k, v in obj.items()},
            "world_origin": list(obj.matrix_world.translation),
            "local_bounds": [list(p) for p in obj.bound_box]}


if __name__ == "__main__":
    result = dependency_audit()
    output = Path(__file__).resolve().parents[1] / "side_table_dependency_before.json"
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print("SIDE_TABLE_DEPENDENCY " + json.dumps(result, ensure_ascii=False))
