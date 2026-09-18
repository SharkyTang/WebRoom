"""Deterministic export-only removal of exactly zero-area glTF triangles.

The editable Blender mesh is deliberately unchanged. ``clean_exported_glb(path)``
must run after export and before recording final export statistics/roundtrip.
No epsilon, decimation, welding, normal calculation, material edit or transform
edit is used. Surviving vertex attribute records are copied byte for byte.
An export without zero-area triangles is not rewritten at all.
"""
from copy import deepcopy
import json
import math
import os
from pathlib import Path
import struct
import tempfile


_COMPONENTS = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2),
               5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
_WIDTHS = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}


def _records(document, binary, accessor_index):
    accessor = document['accessors'][accessor_index]
    if 'sparse' in accessor or 'bufferView' not in accessor:
        raise ValueError('Cleanup requires dense buffer-backed accessors')
    if accessor['type'] not in _WIDTHS:
        raise ValueError('Unsupported vertex/index accessor shape')
    code, component_bytes = _COMPONENTS[accessor['componentType']]
    width = _WIDTHS[accessor['type']]
    size = component_bytes * width
    view = document['bufferViews'][accessor['bufferView']]
    if view.get('buffer', 0) != 0 or view.get('extensions'):
        raise ValueError('Compressed/multiple-buffer views are not supported')
    stride = view.get('byteStride', size)
    relative = accessor.get('byteOffset', 0)
    count = accessor['count']
    if stride < size or relative < 0 or count < 0:
        raise ValueError('Invalid accessor layout')
    end = relative + ((count - 1) * stride + size if count else 0)
    start = view.get('byteOffset', 0)
    if end > view['byteLength'] or start + view['byteLength'] > len(binary):
        raise ValueError('Accessor exceeds its declared buffer view')
    return [binary[start + relative + i * stride:start + relative + i * stride + size]
            for i in range(count)], '<' + code * width


def _zero_area(a, b, c):
    # Python double arithmetic on decoded float32 coordinates matches the audit.
    # Do not use mathutils float32 cross products or squared-length underflow.
    u = tuple(b[i] - a[i] for i in range(3))
    v = tuple(c[i] - a[i] for i in range(3))
    return (u[1] * v[2] - u[2] * v[1] == 0.0
            and u[2] * v[0] - u[0] * v[2] == 0.0
            and u[0] * v[1] - u[1] * v[0] == 0.0)


def _accessor_references(document):
    """Return mutable containers/keys for standard glTF accessor references."""
    references = []
    for mesh in document.get('meshes', []):
        for primitive in mesh['primitives']:
            references.extend((primitive['attributes'], key)
                              for key in primitive['attributes'])
            if 'indices' in primitive:
                references.append((primitive, 'indices'))
            for target in primitive.get('targets', []):
                references.extend((target, key) for key in target)
    for skin in document.get('skins', []):
        if 'inverseBindMatrices' in skin:
            references.append((skin, 'inverseBindMatrices'))
    for animation in document.get('animations', []):
        for sampler in animation['samplers']:
            references.extend(((sampler, 'input'), (sampler, 'output')))
    return references


def _view_references(value):
    if isinstance(value, dict):
        for key, child in value.items():
            if key == 'bufferView' and isinstance(child, int):
                yield value, key
            elif key != 'extras':
                yield from _view_references(child)
    elif isinstance(value, list):
        for child in value:
            yield from _view_references(child)


def clean_exported_glb(path):
    """Clean a project GLB in place atomically and return measured accounting.

    Supports indexed TRIANGLES, float32 VEC3 positions and unsigned indices.
    Rejects sparse/compressed/morph geometry rather than dropping unsupported
    data. Each changed primitive gets independent dense attribute/index views;
    unchanged primitives retain their original attribute bytes and layout.
    All non-geometry buffer views (including embedded images) are retained.
    """
    path = Path(path)
    original = path.read_bytes()
    if len(original) < 28 or struct.unpack_from('<4sII', original) != (b'glTF', 2, len(original)):
        raise ValueError('Expected a complete glTF 2 binary file')
    chunks = []
    offset = 12
    while offset < len(original):
        length, kind = struct.unpack_from('<II', original, offset)
        offset += 8
        if length % 4 or offset + length > len(original):
            raise ValueError('Invalid GLB chunk bounds/alignment')
        chunks.append((kind, original[offset:offset + length]))
        offset += length
    if [kind for kind, _ in chunks] != [0x4E4F534A, 0x004E4942]:
        raise ValueError('Expected one JSON and one BIN chunk')
    document = json.loads(chunks[0][1])
    binary = chunks[1][1]
    buffers = document.get('buffers', [])
    if len(buffers) != 1 or buffers[0].get('uri') or buffers[0]['byteLength'] > len(binary):
        raise ValueError('Expected one embedded binary buffer')
    unsupported = {'KHR_draco_mesh_compression', 'EXT_meshopt_compression',
                   'EXT_mesh_gpu_instancing', 'KHR_animation_pointer'}
    if unsupported.intersection(document.get('extensionsUsed', [])):
        raise ValueError('Unsupported accessor/buffer extension')
    original_view_count = len(document.get('bufferViews', []))
    view_payloads = [binary[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
                     for v in document.get('bufferViews', [])]
    for view, payload in zip(document.get('bufferViews', []), view_payloads):
        if view.get('buffer', 0) != 0 or len(payload) != view['byteLength']:
            raise ValueError('Invalid original buffer view')
    original_geometry_views = set()
    plans, rows = [], []
    for mesh_index, mesh in enumerate(document.get('meshes', [])):
        for primitive_index, primitive in enumerate(mesh['primitives']):
            if primitive.get('mode', 4) != 4 or 'indices' not in primitive or primitive.get('targets'):
                raise ValueError('Expected indexed triangles without morph targets')
            attributes = primitive['attributes']
            position = document['accessors'][attributes['POSITION']]
            if position['componentType'] != 5126 or position['type'] != 'VEC3':
                raise ValueError('Expected float32 VEC3 positions')
            positions_raw, position_format = _records(document, binary, attributes['POSITION'])
            positions = [struct.unpack(position_format, record) for record in positions_raw]
            if not all(math.isfinite(v) for point in positions for v in point):
                raise ValueError('Nonfinite position')
            index_accessor = document['accessors'][primitive['indices']]
            if index_accessor['componentType'] not in (5121, 5123, 5125) or index_accessor['type'] != 'SCALAR':
                raise ValueError('Expected unsigned scalar indices')
            index_raw, index_format = _records(document, binary, primitive['indices'])
            indices = [struct.unpack(index_format, record)[0] for record in index_raw]
            if len(indices) % 3 or any(index >= len(positions) for index in indices):
                raise ValueError('Invalid triangle indices')
            kept = []
            removed = 0
            for i in range(0, len(indices), 3):
                triangle = indices[i:i + 3]
                if _zero_area(*(positions[index] for index in triangle)):
                    removed += 1
                else:
                    kept.extend(triangle)
            if removed and not kept:
                raise ValueError('Refusing to remove a whole primitive/its identity')
            used = sorted(set(kept)) if removed else list(range(len(positions)))
            row = {'mesh': mesh.get('name', str(mesh_index)), 'meshIndex': mesh_index,
                   'primitiveIndex': primitive_index, 'material': primitive.get('material'),
                   'sourceTriangles': len(indices) // 3, 'exportedTriangles': len(kept) // 3,
                   'removedZeroAreaTriangles': removed,
                   'sourceVertices': len(positions), 'exportedVertices': len(used),
                   'removedUnreferencedVertices': len(positions) - len(used)}
            rows.append(row)
            for accessor_index in [primitive['indices'], *attributes.values()]:
                accessor = document['accessors'][accessor_index]
                if 'bufferView' in accessor:
                    original_geometry_views.add(accessor['bufferView'])
            if removed:
                records = {}
                for semantic, accessor_index in attributes.items():
                    values, format_string = _records(document, binary, accessor_index)
                    if len(values) != len(positions):
                        raise ValueError('Vertex attributes have mismatched counts')
                    records[semantic] = (values, format_string)
                plans.append((primitive, used, kept, records, index_format))
    result = {'sourceTriangles': sum(row['sourceTriangles'] for row in rows),
              'exportedTriangles': sum(row['exportedTriangles'] for row in rows),
              'removedZeroAreaTriangles': sum(row['removedZeroAreaTriangles'] for row in rows),
              'removedUnreferencedVertices': sum(row['removedUnreferencedVertices'] for row in rows),
              'beforeBytes': len(original), 'afterBytes': len(original), 'primitives': rows}
    if not plans:
        return result

    def append_accessor(template, values, format_string, target):
        view_index = len(document['bufferViews'])
        payload = b''.join(values)
        document['bufferViews'].append({'buffer': 0, 'byteLength': len(payload), 'target': target})
        view_payloads.append(payload)
        accessor = deepcopy(template)
        accessor.update(bufferView=view_index, byteOffset=0, count=len(values))
        if 'min' in accessor or 'max' in accessor:
            unpacked = [struct.unpack(format_string, value) for value in values]
            for key, operation in (('min', min), ('max', max)):
                if key in accessor:
                    accessor[key] = [operation(column) for column in zip(*unpacked)]
        document['accessors'].append(accessor)
        return len(document['accessors']) - 1

    for primitive, used, kept, records, index_format in plans:
        remap = {old: new for new, old in enumerate(used)}
        for semantic, (values, format_string) in records.items():
            old_accessor = document['accessors'][primitive['attributes'][semantic]]
            primitive['attributes'][semantic] = append_accessor(
                old_accessor, [values[index] for index in used], format_string, 34962)
        old_accessor = document['accessors'][primitive['indices']]
        primitive['indices'] = append_accessor(
            old_accessor, [struct.pack(index_format, remap[index]) for index in kept], index_format, 34963)

    references = _accessor_references(document)
    retained_accessors = sorted({container[key] for container, key in references})
    accessor_remap = {old: new for new, old in enumerate(retained_accessors)}
    for container, key in references:
        container[key] = accessor_remap[container[key]]
    document['accessors'] = [document['accessors'][index] for index in retained_accessors]
    view_refs = list(_view_references(document))
    # Preserve arbitrary original non-geometry views even if they are orphaned.
    used_views = {container[key] for container, key in view_refs}
    used_views.update(set(range(original_view_count)) - original_geometry_views)
    retained_views = sorted(used_views)
    view_remap = {old: new for new, old in enumerate(retained_views)}
    for container, key in view_refs:
        container[key] = view_remap[container[key]]
    output_binary = bytearray()
    views = []
    for index in retained_views:
        output_binary.extend(b'\0' * (-len(output_binary) % 4))
        view = deepcopy(document['bufferViews'][index])
        view.update(buffer=0, byteOffset=len(output_binary), byteLength=len(view_payloads[index]))
        views.append(view)
        output_binary.extend(view_payloads[index])
    document['bufferViews'] = views
    document['buffers'][0]['byteLength'] = len(output_binary)
    output_binary.extend(b'\0' * (-len(output_binary) % 4))
    json_bytes = json.dumps(document, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    json_bytes += b' ' * (-len(json_bytes) % 4)
    output = (struct.pack('<4sII', b'glTF', 2, 28 + len(json_bytes) + len(output_binary))
              + struct.pack('<II', len(json_bytes), 0x4E4F534A) + json_bytes
              + struct.pack('<II', len(output_binary), 0x004E4942) + output_binary)
    result['afterBytes'] = len(output)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(prefix=path.name + '.', suffix='.tmp', dir=path.parent, delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(output)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(temporary, path.stat().st_mode)
        os.replace(temporary, path)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()
    return result
