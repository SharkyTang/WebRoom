"""Replay export cleanup on temporary copies, never on formal/source assets.

Hogwarts/Bridge/Plants inputs are explicitly the pre-cleanup backup. The other
ten inputs are current, unaffected formal GLBs. This is a helper regression,
not a claim that the current formal C library still has 1,366 zero-area faces.
Run from any directory; --output creates a new evidence JSON without overwrite.
"""
import argparse
import collections
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import struct
import sys
import tempfile

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[3]
FAMILIES = ('eiffel', 'hogwarts', 'minastirith', 'falcon', 'bridge', 'sls',
            'ferrari', 'mercedes', 'plants', 'cola', 'dog', 'fixtures', 'wallart')
PRE_COPY = {'hogwarts': 602, 'bridge': 128, 'plants': 636}
HELPER = ROOT / 'scripts/assets/v06c_mesh_cleanup.py'
spec = importlib.util.spec_from_file_location('cleanup', HELPER)
cleanup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cleanup)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def parse(path):
    data = path.read_bytes()
    length = struct.unpack_from('<I', data, 12)[0]
    return json.loads(data[20:20 + length]), data[28 + length:]


def records(document, binary, index):
    accessor = document['accessors'][index]
    view = document['bufferViews'][accessor['bufferView']]
    width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[accessor['type']]
    code, size = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2),
                  5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}[accessor['componentType']]
    size *= width
    stride = view.get('byteStride', size)
    start = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
    return [binary[start + i * stride:start + i * stride + size]
            for i in range(accessor['count'])], '<' + code * width


def signature(path):
    """Independent decoder: exact oriented corner records, ignoring zero faces."""
    document, binary = parse(path)
    signatures = []
    for mesh in document['meshes']:
        for primitive in mesh['primitives']:
            attributes = {key: records(document, binary, index)[0]
                          for key, index in primitive['attributes'].items()}
            raw, fmt = records(document, binary, primitive['indices'])
            indices = [struct.unpack(fmt, value)[0] for value in raw]
            triangles, zero = [], 0
            for start in range(0, len(indices), 3):
                triangle = indices[start:start + 3]
                a, b, c = [struct.unpack('<fff', attributes['POSITION'][i]) for i in triangle]
                u = [b[i] - a[i] for i in range(3)]
                v = [c[i] - a[i] for i in range(3)]
                cross = (u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2],
                         u[0] * v[1] - u[1] * v[0])
                if cross == (0., 0., 0.):
                    zero += 1
                    continue
                triangles.append(b''.join(attributes[key][i]
                                          for i in triangle for key in sorted(attributes)))
            metadata = {key: {name: value for name, value in document['accessors'][index].items()
                              if name not in ('bufferView', 'byteOffset', 'count', 'min', 'max')}
                        for key, index in primitive['attributes'].items()}
            signatures.append((primitive.get('material'), metadata, collections.Counter(triangles), zero))
    return document, signatures


def valid(signatures):
    return [(material, metadata, triangles) for material, metadata, triangles, _ in signatures]


def replay_assets(folder):
    rows = []
    for family in FAMILIES:
        current = ROOT / 'public/models/production' / f'{family}_v06c.glb'
        source = (ROOT / 'validation/v06c/optimization/pre-cleanup/public/models/production'
                  / current.name) if family in PRE_COPY else current
        source_bytes, formal_bytes = source.read_bytes(), current.read_bytes()
        target = folder / current.name
        shutil.copyfile(source, target)
        before_document, before_signature = signature(target)
        result = cleanup.clean_exported_glb(target)
        after_document, after_signature = signature(target)
        _, formal_signature = signature(current)
        assert result['removedZeroAreaTriangles'] == PRE_COPY.get(family, 0), family
        assert valid(before_signature) == valid(after_signature), family + ': valid attributes changed'
        assert valid(after_signature) == valid(formal_signature), family + ': formal valid attributes differ'
        assert all(zero == 0 for *_, zero in after_signature), family + ': zeros remain after replay'
        assert all(zero == 0 for *_, zero in formal_signature), family + ': current formal still has zero faces'
        for key in ('nodes', 'materials', 'scenes', 'scene', 'images', 'textures', 'samplers', 'extensions'):
            assert before_document.get(key) == after_document.get(key), family + ': changed ' + key
        cleaned_bytes = target.read_bytes()
        if not result['removedZeroAreaTriangles']:
            assert source_bytes == cleaned_bytes, family + ': unnecessary file rewrite'
        second = cleanup.clean_exported_glb(target)
        assert second['removedZeroAreaTriangles'] == 0 and cleaned_bytes == target.read_bytes(), family + ': non-idempotent'
        assert source.read_bytes() == source_bytes and current.read_bytes() == formal_bytes, family + ': input mutation'
        rows.append({'family': family, 'input': str(source.relative_to(ROOT)),
                     'inputKind': 'pre-cleanup backup' if family in PRE_COPY else 'current unaffected formal export',
                     'inputSHA256': sha(source_bytes), 'replayedOutputSHA256': sha(cleaned_bytes),
                     'currentFormalSHA256': sha(formal_bytes), 'currentFormalBytes': len(formal_bytes),
                     'currentFormalZeroAreaTriangles': sum(zero for *_, zero in formal_signature),
                     'exactValidTriangleAttributes': True, 'sameValidAttributesAsCurrentFormal': True,
                     'identityAndMaterialsUnchanged': True, 'idempotent': True, 'inputsUnchanged': True,
                     'accounting': result})
    return rows


def synthetic(folder):
    vertices = [(0., 0., 0.), (1e-20, 0., 0.), (0., 1e-20, 0.),
                (1., 1., 1.), (2., 2., 2.), (3., 3., 3.)]
    vertex_bytes = b''.join(struct.pack('<8f', *point, 0., 0., 1., i / 8., i / 16.)
                            for i, point in enumerate(vertices))
    image, orphan = b'IMAGE-BYTES!', b'KEEP-EXTRA!!'
    binary = bytearray(vertex_bytes)
    index_offset = len(binary)
    binary.extend(bytes(range(6)))
    binary.extend(b'\0' * (-len(binary) % 4))
    image_offset = len(binary)
    binary.extend(image)
    orphan_offset = len(binary)
    binary.extend(orphan)
    document = {'asset': {'version': '2.0'}, 'buffers': [{'byteLength': len(binary)}],
                'bufferViews': [{'buffer': 0, 'byteOffset': 0, 'byteLength': len(vertex_bytes), 'byteStride': 32, 'target': 34962},
                                {'buffer': 0, 'byteOffset': index_offset, 'byteLength': 6, 'target': 34963},
                                {'buffer': 0, 'byteOffset': image_offset, 'byteLength': len(image)},
                                {'buffer': 0, 'byteOffset': orphan_offset, 'byteLength': len(orphan)}],
                'accessors': [{'bufferView': 0, 'byteOffset': 0, 'componentType': 5126, 'count': 6, 'type': 'VEC3'},
                              {'bufferView': 0, 'byteOffset': 12, 'componentType': 5126, 'count': 6, 'type': 'VEC3'},
                              {'bufferView': 0, 'byteOffset': 24, 'componentType': 5126, 'count': 6, 'type': 'VEC2'},
                              {'bufferView': 1, 'componentType': 5121, 'count': 6, 'type': 'SCALAR'}],
                'meshes': [{'name': 'Probe', 'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1, 'TEXCOORD_0': 2},
                                                           'indices': 3, 'material': 0}]}],
                'nodes': [{'name': 'VIS_Probe', 'mesh': 0, 'translation': [1, 2, 3]}],
                'materials': [{'name': 'Preserve'}], 'images': [{'bufferView': 2, 'mimeType': 'image/png'}],
                'scenes': [{'nodes': [0]}], 'scene': 0}
    # The image view is an opaque sentinel, not a claimed decodable PNG.
    encoded = json.dumps(document).encode()
    encoded += b' ' * (-len(encoded) % 4)
    binary.extend(b'\0' * (-len(binary) % 4))
    payload = (struct.pack('<4sII', b'glTF', 2, 28 + len(encoded) + len(binary))
               + struct.pack('<II', len(encoded), 0x4e4f534a) + encoded
               + struct.pack('<II', len(binary), 0x004e4942) + binary)
    target = folder / 'synthetic.glb'
    target.write_bytes(payload)
    result = cleanup.clean_exported_glb(target)
    actual, data = parse(target)
    assert result['removedZeroAreaTriangles'] == 1 and result['exportedTriangles'] == 1
    assert actual['nodes'] == document['nodes'] and actual['materials'] == document['materials']
    views = [data[view.get('byteOffset', 0):view.get('byteOffset', 0) + view['byteLength']]
             for view in actual['bufferViews']]
    assert views[actual['images'][0]['bufferView']] == image and orphan in views
    for semantic, offset, width in [('POSITION', 0, 12), ('NORMAL', 12, 12), ('TEXCOORD_0', 24, 8)]:
        index = actual['meshes'][0]['primitives'][0]['attributes'][semantic]
        assert views[actual['accessors'][index]['bufferView']] == b''.join(
            vertex_bytes[i * 32 + offset:i * 32 + offset + width] for i in range(3))
    index_accessor = actual['accessors'][actual['meshes'][0]['primitives'][0]['indices']]
    assert index_accessor['componentType'] == 5121
    cleaned = target.read_bytes()
    second = cleanup.clean_exported_glb(target)
    assert second['removedZeroAreaTriangles'] == 0 and cleaned == target.read_bytes()
    return {'accounting': result, 'tinyNonzeroTrianglePreserved': True,
            'tinyTriangleCrossZ': struct.unpack('<f', struct.pack('<f', 1e-20))[0] ** 2,
            'interleavedAttributeBytesPreserved': True, 'uint8IndicesPreserved': True,
            'embeddedNonGeometrySentinelPreserved': True, 'orphanNonGeometryViewPreserved': True,
            'nodesAndMaterialsPreserved': True, 'idempotent': True,
            'imageCaseLimit': 'Opaque byte sentinel only; not PNG decoding or browser image validation.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, help='New output JSON; existing files are refused')
    args = parser.parse_args()
    if args.output and args.output.exists():
        raise FileExistsError(args.output)
    with tempfile.TemporaryDirectory(prefix='v06c-export-cleanup-regression-') as temporary:
        rows = replay_assets(Path(temporary))
        synthetic_result = synthetic(Path(temporary))
    result = {'generatedAt': datetime.now(timezone.utc).isoformat(), 'ok': True,
              'scope': 'Pure Python helper regression on temporary copies. No Blender, browser, source model or formal export writes.',
              'inputPolicy': 'Hogwarts/Bridge/Plants use optimization/pre-cleanup backup; the other ten use current unaffected formal exports.',
              'interpretation': 'The 1366 removal total belongs to replayed pre-cleanup inputs, not the current formal library. Replay output bytes omit later re-export provenance changes and must not replace the final production ledger.',
              'script': str(Path(__file__).resolve().relative_to(ROOT)), 'scriptSHA256': sha(Path(__file__).read_bytes()),
              'helper': str(HELPER.relative_to(ROOT)), 'helperSHA256': sha(HELPER.read_bytes()),
              'pythonVersion': sys.version, 'command': [sys.executable, *sys.argv],
              'summary': {'assetFamilies': len(rows), 'preCleanupInputs': len(PRE_COPY), 'currentUnaffectedInputs': 10,
                          'replayedRemovedZeroAreaTriangles': sum(row['accounting']['removedZeroAreaTriangles'] for row in rows),
                          'replayedRemovedUnreferencedVertices': sum(row['accounting']['removedUnreferencedVertices'] for row in rows),
                          'replayedInputBytes': sum(row['accounting']['beforeBytes'] for row in rows),
                          'replayedOutputBytes': sum(row['accounting']['afterBytes'] for row in rows),
                          'currentFormalBytes': sum(row['currentFormalBytes'] for row in rows),
                          'currentFormalZeroAreaTriangles': sum(row['currentFormalZeroAreaTriangles'] for row in rows)},
              'assets': rows, 'synthetic': synthetic_result}
    assert result['summary']['replayedRemovedZeroAreaTriangles'] == 1366
    encoded = json.dumps(result, indent=2) + '\n'
    if args.output:
        with args.output.open('x') as stream:
            stream.write(encoded)
        print(json.dumps({'output': str(args.output), 'ok': True, 'summary': result['summary']}))
    else:
        print(encoded)


if __name__ == '__main__':
    main()
