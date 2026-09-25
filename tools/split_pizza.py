"""Split the pizza slice into crust and topping submeshes so bread and cheese can shade
   and, later, deform independently.

The source asset is a single mesh with a single material: crust and cheese exist only as
pixels in the baked albedo/normal/roughness textures, so nothing downstream can treat them
differently. This classifies each triangle as bread or topping, then rewrites the GLB with
two primitives sharing one vertex buffer and one texture set, differing only in material.

Classification is geometric, not colour-based: the topping is the upward-facing surface
inside the crust ring. Colour was tried and rejected - browned cheese spots read as tan and
speckled the boundary. Verify a change with tools/preview_pizza_split.py, which renders the
classification over the albedo.

Run from the repo root:  python3 tools/split_pizza.py
"""
import json, struct, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'web/assets/food/pizza.glb'

# Boundary between the raised crust ring and the topping field, as a fraction of the wedge
# radius measured from the tip, plus the normal cutoff that separates the top face from the
# base and cut sides.
CRUST_RADIUS = .80
UPWARD = .30
# Melted cheese is wetter and glossier than baked bread. roughnessFactor multiplies the
# baked roughness map, so the texture's detail survives. A clearcoat was compared
# side by side at plate zoom and rejected: its broad white sheen mutes the albedo and
# reads as plastic. Leave CHEESE_CLEARCOAT at 0 unless a comparison says otherwise.
CHEESE_ROUGHNESS = .55
CHEESE_CLEARCOAT = 0
CHEESE_CLEARCOAT_ROUGHNESS = .30

COMPONENT = {5126: ('f', 4), 5123: ('H', 2), 5125: ('I', 4), 5121: ('B', 1)}
COUNT = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}


def read_glb(path):
    data = Path(path).read_bytes()
    magic, version, total = struct.unpack('<4sII', data[:12])
    if magic != b'glTF' or version != 2 or total != len(data):
        raise SystemExit(f'{path} is not a glTF 2.0 binary')
    offset, chunks = 12, {}
    while offset < len(data):
        length, kind = struct.unpack('<I4s', data[offset:offset + 8]); offset += 8
        chunks[kind.strip(b'\x00')] = data[offset:offset + length]; offset += length
    return json.loads(chunks[b'JSON']), chunks[b'BIN']


def accessor(gltf, binary, index):
    a = gltf['accessors'][index]; view = gltf['bufferViews'][a['bufferView']]
    fmt, size = COMPONENT[a['componentType']]; n = COUNT[a['type']]
    start = view.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = view.get('byteStride') or size * n
    return [struct.unpack_from('<' + fmt * n, binary, start + k * stride) for k in range(a['count'])]


def classify(positions, normals, triangles):
    """1 = topping (cheese, pepperoni, herbs, sauce), 0 = bread (crust ring, base, sides).

    Positions are in mesh space, where the node's +90 deg X rotation has not yet been
    applied, so the wedge lies in XY and its thickness runs along Z.
    """
    tip = max(p[1] for p in positions)
    radius = tip - min(p[1] for p in positions)
    out = []
    for tri in triangles:
        up = -sum(normals[i][2] for i in tri) / 3          # the node's +90 deg X turn makes -Z up
        reach = sum(tip - positions[i][1] for i in tri) / 3 / radius
        out.append(1 if (up > UPWARD and reach < CRUST_RADIUS) else 0)
    return out


def pad(buffer, alignment=4):
    while len(buffer) % alignment:
        buffer += b'\x00'
    return buffer


def main():
    gltf, binary = read_glb(TARGET)
    mesh = gltf['meshes'][0]

    # Idempotent: merge whatever primitives exist, then split again.
    positions = normals = uvs = None
    triangles = []
    for prim in mesh['primitives']:
        if positions is None:
            positions = accessor(gltf, binary, prim['attributes']['POSITION'])
            normals = accessor(gltf, binary, prim['attributes']['NORMAL'])
            uvs = accessor(gltf, binary, prim['attributes']['TEXCOORD_0'])
        elif prim['attributes']['POSITION'] != mesh['primitives'][0]['attributes']['POSITION']:
            raise SystemExit('primitives do not share one vertex buffer; re-run from the original asset')
        flat = [i[0] for i in accessor(gltf, binary, prim['indices'])]
        triangles += [tuple(flat[t:t + 3]) for t in range(0, len(flat), 3)]

    groups = classify(positions, normals, triangles)
    bread = [t for t, g in zip(triangles, groups) if not g]
    cheese = [t for t, g in zip(triangles, groups) if g]
    print(f'{len(triangles)} triangles -> {len(bread)} bread, {len(cheese)} topping '
          f'({len(cheese) / len(triangles) * 100:.0f}% topping)')
    if not bread or not cheese:
        raise SystemExit('classification produced an empty group; check CRUST_RADIUS/UPWARD')

    wide = len(positions) > 65535
    ifmt, itype = ('<I', 5125) if wide else ('<H', 5123)

    out = bytearray(); views = []; accessors = []

    def add_view(payload, target=None):
        nonlocal out
        out = bytearray(pad(bytes(out)))
        view = {'buffer': 0, 'byteOffset': len(out), 'byteLength': len(payload)}
        if target: view['target'] = target
        views.append(view); out += payload
        return len(views) - 1

    def add_attribute(rows, kind, minmax=False):
        payload = b''.join(struct.pack('<' + 'f' * len(r), *r) for r in rows)
        a = {'bufferView': add_view(payload, 34962), 'componentType': 5126,
             'count': len(rows), 'type': kind}
        if minmax:
            a['min'] = [min(r[i] for r in rows) for i in range(len(rows[0]))]
            a['max'] = [max(r[i] for r in rows) for i in range(len(rows[0]))]
        accessors.append(a); return len(accessors) - 1

    def add_indices(tris):
        flat = [i for tri in tris for i in tri]
        payload = b''.join(struct.pack(ifmt, i) for i in flat)
        accessors.append({'bufferView': add_view(payload, 34963), 'componentType': itype,
                          'count': len(flat), 'type': 'SCALAR'})
        return len(accessors) - 1

    a_pos = add_attribute(positions, 'VEC3', minmax=True)
    a_nrm = add_attribute(normals, 'VEC3')
    a_uv = add_attribute(uvs, 'VEC2')
    i_bread, i_cheese = add_indices(bread), add_indices(cheese)

    images = []
    for image in gltf['images']:
        view = gltf['bufferViews'][image['bufferView']]
        blob = binary[view.get('byteOffset', 0):view.get('byteOffset', 0) + view['byteLength']]
        images.append({k: v for k, v in image.items() if k != 'bufferView'}
                      | {'bufferView': add_view(blob)})

    base = gltf['materials'][0]
    crust = {k: v for k, v in base.items()}
    crust['name'] = 'pizza_crust'
    cheese_mat = json.loads(json.dumps(crust))
    cheese_mat['name'] = 'pizza_cheese'
    cheese_mat['pbrMetallicRoughness']['roughnessFactor'] = CHEESE_ROUGHNESS
    if CHEESE_CLEARCOAT:
        cheese_mat['extensions'] = {'KHR_materials_clearcoat': {
            'clearcoatFactor': CHEESE_CLEARCOAT,
            'clearcoatRoughnessFactor': CHEESE_CLEARCOAT_ROUGHNESS}}

    attributes = {'POSITION': a_pos, 'NORMAL': a_nrm, 'TEXCOORD_0': a_uv}
    doc = {
        'asset': gltf['asset'],
        'scene': gltf.get('scene', 0),
        'scenes': gltf['scenes'],
        'nodes': gltf['nodes'],
        'meshes': [{'name': mesh.get('name', 'Pizza slice'), 'primitives': [
            {'attributes': attributes, 'indices': i_bread, 'material': 0},
            {'attributes': attributes, 'indices': i_cheese, 'material': 1}]}],
        'materials': [crust, cheese_mat],
        'textures': gltf['textures'],
        'images': images,
        'accessors': accessors,
        'bufferViews': views,
        'buffers': [{'byteLength': len(out)}],
    }
    used = set(gltf.get('extensionsUsed', [])) | ({'KHR_materials_clearcoat'} if CHEESE_CLEARCOAT else set())
    if used: doc['extensionsUsed'] = sorted(used)
    if 'samplers' in gltf: doc['samplers'] = gltf['samplers']

    body = pad(bytes(out))
    text = pad(json.dumps(doc, separators=(',', ':')).encode(), 4).replace(b'\x00', b' ')
    blob = (struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(text) + 8 + len(body))
            + struct.pack('<I4s', len(text), b'JSON') + text
            + struct.pack('<I4s', len(body), b'BIN\x00') + body)
    before = TARGET.stat().st_size
    TARGET.write_bytes(blob)
    print(f'wrote {TARGET.relative_to(ROOT)}: {before} -> {len(blob)} bytes '
          f'({len(blob) - before:+d}), 2 primitives, materials pizza_crust + pizza_cheese')


if __name__ == '__main__':
    sys.exit(main())
