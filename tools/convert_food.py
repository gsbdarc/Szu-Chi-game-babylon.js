"""Convert Asta_test's actual FBX portions and baked textures to meter-scale GLB.
Run Blender --background --python tools/convert_food.py -- /path/to/Asta_test
"""
import bpy, json, sys
import numpy as np
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[sys.argv.index('--') + 1]) if '--' in sys.argv else ROOT.parent / 'Asta_test'
FOOD = SOURCE / 'Assets/Buffet/Food/Resources/Food'
OUT = ROOT / 'web/assets/food'
manifest = []
for item in json.loads((ROOT / 'web/assets/menu.json').read_text())['foods']:
    name = item['id']
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.fbx(filepath=str(FOOD / (name + '.fbx')))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    nodes, links = material.node_tree.nodes, material.node_tree.links
    shader = nodes.get('Principled BSDF')
    shader.inputs['Roughness'].default_value = .64
    shader.inputs['Metallic'].default_value = 0
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(str(FOOD / (name + '_Albedo.png')))
    links.new(tex.outputs['Color'], shader.inputs['Base Color'])
    normal = nodes.new('ShaderNodeTexImage')
    normal.image = bpy.data.images.load(str(FOOD / (name + '_Normal.png')))
    normal.image.colorspace_settings.name = 'Non-Color'
    mapping = nodes.new('ShaderNodeNormalMap')
    mapping.inputs['Strength'].default_value = .65
    links.new(normal.outputs['Color'], mapping.inputs['Color'])
    links.new(mapping.outputs['Normal'], shader.inputs['Normal'])
    # Unity stores smoothness in Surface.A; glTF stores roughness in its ORM.G.
    # Repack the existing baked data so ingredient-specific gloss is retained.
    surface = bpy.data.images.load(str(FOOD / (name + '_Surface.png')))
    surface.colorspace_settings.name = 'Non-Color'
    pixels = np.empty(surface.size[0] * surface.size[1] * 4, dtype=np.float32)
    surface.pixels.foreach_get(pixels)
    pixels = pixels.reshape(-1, 4)
    roughness = 1 - pixels[:, 3].copy()
    pixels[:, :3] = roughness[:, None]
    pixels[:, 3] = 1
    rough_image = bpy.data.images.new(name + '_roughness', width=surface.size[0], height=surface.size[1])
    rough_image.colorspace_settings.name = 'Non-Color'
    rough_image.pixels.foreach_set(pixels.ravel())
    rough_image.pack()
    rough = nodes.new('ShaderNodeTexImage')
    rough.image = rough_image
    links.new(rough.outputs['Color'], shader.inputs['Roughness'])
    for obj in meshes:
        obj.data.materials.clear()
        obj.data.materials.append(material)
    # FBX is authored in meters; preserve shape but verify against Unity's metrics.
    corners = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    lo = Vector(tuple(min(c[i] for c in corners) for i in range(3)))
    hi = Vector(tuple(max(c[i] for c in corners) for i in range(3)))
    dims = hi - lo
    metrics = json.loads((FOOD / (name + '_metrics.json')).read_text())
    expected = metrics['bounds_m_unity_xyz']
    scale = expected[0] / dims.x
    for obj in meshes:
        obj.location *= scale
        obj.scale *= scale
        obj.location -= Vector(((lo.x + hi.x)*.5, (lo.y + hi.y)*.5, lo.z)) * scale
    bpy.ops.export_scene.gltf(filepath=str(OUT / (name + '.glb')), export_format='GLB',
                             use_selection=False, export_yup=True, export_animations=False)
    manifest.append(dict(id=name, bounds=[round(dims.x*scale,6),round(dims.z*scale,6),round(dims.y*scale,6)],
                         source=str(FOOD / (name + '.fbx')), bytes=(OUT / (name + '.glb')).stat().st_size))
    print('CONVERTED', name, manifest[-1]['bounds'], flush=True)
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2))
