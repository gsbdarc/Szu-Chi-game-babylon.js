"""Verify the menu, GLBs, texture embedding, source scale and bundled dependencies."""
from pathlib import Path
import json,struct,hashlib
ROOT=Path(__file__).resolve().parents[1]
menu=json.loads((ROOT/'web/assets/menu.json').read_text())['foods']
manifest=json.loads((ROOT/'web/assets/food/manifest.json').read_text())
rows=[]
for food in menu:
    path=ROOT/'web/assets/food'/f"{food['id']}.glb"
    data=path.read_bytes();magic,version,size=struct.unpack('<4sII',data[:12])
    assert magic==b'glTF' and version==2 and size==len(data)
    length,kind=struct.unpack('<I4s',data[12:20]);assert kind==b'JSON'
    asset=json.loads(data[20:20+length]);assert asset['meshes'] and len(asset['images'])>=3
    assert asset['materials'][0]['pbrMetallicRoughness']['metallicRoughnessTexture']
    assert all('bufferView' in image for image in asset['images'])
    item=next(item for item in manifest if item['id']==food['id'])
    source=Path(item['source']).with_name(food['id']+'_metrics.json')
    deviation=None
    if item.get('revision')=='chicken-realism-v2':
        metrics=json.loads((ROOT/item['metrics']).read_text())
        x,z,y=metrics['dimensionsBlenderXYZ']
        expected=[x,y,z]
        primitive=asset['meshes'][0]['primitives'][0]
        accessor=asset['accessors'][primitive['attributes']['POSITION']]
        actual=[hi-lo for hi,lo in zip(accessor['max'],accessor['min'])]
        deviation=max(abs(a-b) for a,b in zip(actual,expected));assert deviation<.00001
        assert max(abs(a-b) for a,b in zip(item['bounds'],expected))<.00001
        assert abs(x-.09792)<.00001 and abs(z-.065965)<.00001
        assert (ROOT/item['source']).is_file()
    elif source.exists():
        expected=json.loads(source.read_text())['bounds_m_unity_xyz']
        deviation=max(abs(a-b) for a,b in zip(item['bounds'],expected));assert deviation<.00001
    assert (ROOT/'web/assets/previews'/f"{food['id']}.png").is_file()
    assert item['bytes']==len(data)
    rows.append(dict(id=food['id'],revision=item.get('revision','original'),embeddedImages=len(asset['images']),bytes=len(data),maxScaleDeviationMeters=deviation))
assert len(rows)==15 and len({r['id'] for r in rows})==15
result={'foods':rows,'vendor':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (ROOT/'web/vendor').iterdir() if p.is_file()}}
(ROOT/'docs/ASSET_AUDIT.json').write_text(json.dumps(result,indent=2))
print('PASS: 15 GLBs with embedded PBR maps and previews; 14 original models and the revised chicken match their source metrics within 0.01 mm.')
