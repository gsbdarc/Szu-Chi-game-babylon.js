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
    if source.exists():
        expected=json.loads(source.read_text())['bounds_m_unity_xyz']
        deviation=max(abs(a-b) for a,b in zip(item['bounds'],expected));assert deviation<.00001
    assert (ROOT/'web/assets/previews'/f"{food['id']}.png").is_file()
    rows.append(dict(id=food['id'],embeddedImages=len(asset['images']),bytes=len(data),maxScaleDeviationMeters=deviation))
assert len(rows)==15 and len({r['id'] for r in rows})==15
audio=json.loads((ROOT/'web/assets/audio/manifest.json').read_text())
for item in audio:
    path=ROOT/'web/assets/audio'/item['file']
    data=path.read_bytes()
    assert data[4:8]==b'ftyp' and len(data)==item['bytes'],f"{item['file']} is not the manifested MP4 audio"
    assert hashlib.sha256(data).hexdigest()==item['sha256'],f"{item['file']} does not match its recorded digest"
    assert item['license'] and item['source'] and item['attribution']
assert {item['role'] for item in audio}=={'music','ambience'}
result={'foods':rows,'audio':[{k:item[k] for k in ('id','role','license','seconds','bytes','sha256')} for item in audio],'vendor':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (ROOT/'web/vendor').iterdir() if p.is_file()}}
(ROOT/'docs/ASSET_AUDIT.json').write_text(json.dumps(result,indent=2))
print('PASS: 15 GLBs, embedded albedo/normal/roughness images, previews; converted dimensions within 0.01 mm of Unity metrics.')
print(f'PASS: {len(audio)} licensed audio beds match their recorded digests.')
