"""Render the pizza crust/topping classification so a change to it can be eyeballed.

Writes artifacts/pizza-split.png: the slice from above through its own UVs, beside the
same view tinted by group (warm = topping, cool = bread). Use this to check the split
before trusting tools/split_pizza.py, and after editing CRUST_RADIUS or UPWARD.

Run from the repo root:  python3 tools/preview_pizza_split.py
"""
import struct, sys
from pathlib import Path
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
from split_pizza import TARGET, read_glb, accessor, classify

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts'
SIZE = 460


def main():
    gltf, binary = read_glb(TARGET)
    mesh = gltf['meshes'][0]
    first = mesh['primitives'][0]
    positions = accessor(gltf, binary, first['attributes']['POSITION'])
    normals = accessor(gltf, binary, first['attributes']['NORMAL'])
    uvs = accessor(gltf, binary, first['attributes']['TEXCOORD_0'])
    triangles = []
    for prim in mesh['primitives']:
        flat = [i[0] for i in accessor(gltf, binary, prim['indices'])]
        triangles += [tuple(flat[t:t + 3]) for t in range(0, len(flat), 3)]
    groups = classify(positions, normals, triangles)

    image = gltf['images'][gltf['textures'][gltf['materials'][0]['pbrMetallicRoughness']
                                            ['baseColorTexture']['index']]['source']]
    view = gltf['bufferViews'][image['bufferView']]
    blob = binary[view.get('byteOffset', 0):view.get('byteOffset', 0) + view['byteLength']]
    tmp = OUT / '_albedo.png'; OUT.mkdir(exist_ok=True); tmp.write_bytes(blob)
    tex = Image.open(tmp).convert('RGB'); TW, TH = tex.size; tp = tex.load()

    # Mesh space: the node's +90 deg X turn means -Z is up and Y runs tip to crust.
    xs = [p[0] for p in positions]; ys = [p[1] for p in positions]
    X0, X1, Y0, Y1 = min(xs), max(xs), min(ys), max(ys)

    def draw(tint):
        img = Image.new('RGB', (SIZE, SIZE), (18, 20, 18)); ip = img.load()
        depth = [[9.0] * SIZE for _ in range(SIZE)]
        for tri, group in zip(triangles, groups):
            if -sum(normals[i][2] for i in tri) / 3 < .05:
                continue
            pts = [positions[i] for i in tri]
            sx = [(p[0] - X0) / (X1 - X0) * (SIZE - 1) for p in pts]
            sy = [(Y1 - p[1]) / (Y1 - Y0) * (SIZE - 1) for p in pts]
            det = (sy[1] - sy[2]) * (sx[0] - sx[2]) + (sx[2] - sx[1]) * (sy[0] - sy[2])
            if abs(det) < 1e-9:
                continue
            for py in range(max(0, int(min(sy))), min(SIZE, int(max(sy)) + 2)):
                for px in range(max(0, int(min(sx))), min(SIZE, int(max(sx)) + 2)):
                    a = ((sy[1] - sy[2]) * (px - sx[2]) + (sx[2] - sx[1]) * (py - sy[2])) / det
                    b = ((sy[2] - sy[0]) * (px - sx[2]) + (sx[0] - sx[2]) * (py - sy[2])) / det
                    c = 1 - a - b
                    if a < -.001 or b < -.001 or c < -.001:
                        continue
                    z = a * pts[0][2] + b * pts[1][2] + c * pts[2][2]
                    if z >= depth[py][px]:
                        continue
                    depth[py][px] = z
                    u = a * uvs[tri[0]][0] + b * uvs[tri[1]][0] + c * uvs[tri[2]][0]
                    v = a * uvs[tri[0]][1] + b * uvs[tri[1]][1] + c * uvs[tri[2]][1]
                    r, g, bl = tp[min(TW - 1, max(0, int(u * TW))), min(TH - 1, max(0, int(v * TH)))]
                    ip[px, py] = ((min(255, r // 2 + 128), g // 2, bl // 2) if group
                                  else (r // 2, g // 2, min(255, bl // 2 + 128))) if tint else (r, g, bl)
        return img

    out = Image.new('RGB', (SIZE * 2 + 8, SIZE + 22), (245, 243, 236))
    label = ImageDraw.Draw(out)
    out.paste(draw(False), (0, 22)); out.paste(draw(True), (SIZE + 8, 22))
    label.text((4, 6), 'albedo', fill=(10, 10, 10))
    label.text((SIZE + 12, 6), f'warm = topping ({sum(groups)}), cool = bread ({len(groups) - sum(groups)})',
               fill=(10, 10, 10))
    target = OUT / 'pizza-split.png'
    out.save(target); tmp.unlink()
    print(f'{sum(groups)} topping / {len(groups) - sum(groups)} bread triangles -> {target.relative_to(ROOT)}')


if __name__ == '__main__':
    sys.exit(main())
