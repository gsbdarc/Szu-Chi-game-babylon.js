"""Exercise the revised food in the actual standalone game using isolated Chrome."""
import base64
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright
from test_pages import site, ready, saved, snapshot

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/chicken'
OUT.mkdir(parents=True, exist_ok=True)


def scene_counts(page):
    return page.evaluate('''()=>{const s=BABYLON.Engine.Instances[0].scenes[0];return {
      food:s.meshes.filter(m=>m.metadata?.portion&&m.getTotalVertices()).length,
      films:s.meshes.filter(m=>m.name==='Fine amber oil'||m.name==='Tomato cooking juices').length,
      geometries:s.geometries.length,materials:s.materials.length};}''')


def check(base):
    errors=[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(channel='chrome',headless=True,args=['--no-proxy-server'])
        page=browser.new_page(viewport={'width':1440,'height':1000})
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(base+'?SESSION_ID=chicken-check-'+uuid.uuid4().hex)
        ready(page)
        page.get_by_role('button',name='Explore the buffet').click();ready(page)
        empty=scene_counts(page)
        # Observe actual render frames and vertex buffers, not just timer state.
        page.evaluate('''()=>{const B=BABYLON,s=B.Engine.Instances[0].scenes[0];window.chickenFrames=[];
          window.trayRest=s.meshes.filter(m=>m.name==='Hand-breaded chicken parmesan').map(m=>({m,rest:Array.from(m.getVerticesData('position'))}));
          window.chickenObserver=s.onAfterRenderObservable.add(()=>{
            const p=buffet.snapshot().portions[0];if(!p)return;
            const m=s.meshes.find(m=>m.metadata?.portion===p.id&&m.getTotalVertices());
            const pos=m.getVerticesData('position'),world=m.computeWorldMatrix(true),plate=m.parent.parent;
            let low=Infinity;const v=new B.Vector3(),out=new B.Vector3();
            for(let i=0;i<pos.length;i+=3){B.Vector3.FromArrayToRef(pos,i,v);B.Vector3.TransformCoordinatesToRef(v,world,out);low=Math.min(low,out.y-plate.getAbsolutePosition().y);}
            chickenFrames.push({...p.motion,low,geometry:m.geometry.uniqueId,vertex:pos[1]});
          });}''')
        page.locator('#add').click()
        page.wait_for_function('buffet.snapshot().portions[0]&&!buffet.snapshot().portions[0].motion.active',timeout=20000)
        frames=page.evaluate('''()=>{BABYLON.Engine.Instances[0].scenes[0].onAfterRenderObservable.remove(chickenObserver);return chickenFrames;}''')
        assert any(f['contactAge']<0 for f in frames)
        assert any(f['impacts']==1 for f in frames)
        assert max(abs(f['bend']) for f in frames)>.0008
        assert min(f['low'] for f in frames)>=.009-1e-6
        assert all(f['filmAmount']==0 for f in frames if f['contactAge']<0)
        assert any(0<f['filmAmount']<.9 for f in frames)
        assert page.evaluate('trayRest.every(({m,rest})=>rest.every((x,i)=>x===m.getVerticesData("position")[i]))')
        assert page.evaluate('trayRest.every(({m})=>m.geometry.uniqueId!==chickenFrames[0].geometry)')
        assert scene_counts(page)['films']==2
        page.locator('#view').click();ready(page)
        page.screenshot(path=str(OUT/'plate.png'))
        # Generate the menu preview from the actual game asset and lighting.
        data=page.evaluate('''async()=>{const B=BABYLON,s=B.Engine.Instances[0].scenes[0],m=s.meshes.find(m=>m.metadata?.portion&&m.getTotalVertices()),p=m.getAbsolutePosition(),c=new B.FreeCamera('Preview render',p.add(new B.Vector3(0,.12,-.115)),s);c.minZ=.002;c.fov=.72;c.setTarget(p.add(new B.Vector3(0,.006,0)));await s.whenReadyAsync();const image=await B.Tools.CreateScreenshotUsingRenderTargetAsync(s.getEngine(),c,{width:512,height:512});c.dispose();return image;}''')
        (OUT/'preview.png').write_bytes(base64.b64decode(data.split(',')[1]))
        # Drag near the rim; film must stay on the curved plate and follow food.
        point=page.evaluate('buffet.point("portion",0)')
        page.mouse.move(point['x'],point['y']);page.mouse.down()
        page.mouse.move(point['x']+130,point['y']+65,steps=12);page.mouse.up()
        assert any(e['eventType']=='portion_moved' for e in snapshot(page)['session']['events'])
        moved=snapshot(page)['portions'][0]
        assert abs(moved['x'])+abs(moved['z'])>.01
        film=page.evaluate('''()=>{const s=BABYLON.Engine.Instances[0].scenes[0];return s.meshes.filter(m=>m.name==='Fine amber oil'||m.name==='Tomato cooking juices').map(m=>Array.from(m.getVerticesData('position')));}''')
        # The loop also detects NaN geometry and out-of-plate sauce after movement.
        for positions in film:
            for i in range(0,len(positions),3):
                assert (positions[i]**2+positions[i+2]**2)**.5<=.14251
                assert .009<positions[i+1]<.024
        saved(page);before=snapshot(page)['session']['portions']
        page.reload();ready(page);page.get_by_role('button',name='Continue your plate').click();ready(page)
        assert snapshot(page)['session']['portions']==before
        assert scene_counts(page)['films']==2
        page.locator('#undo').click();assert scene_counts(page)==empty
        # Chronological saved order can differ from vertical order after a drag.
        for _ in range(2):page.locator('#add').click()
        page.wait_for_function('buffet.snapshot().portions.every(p=>!p.motion.active)',timeout=20000)
        page.locator('#view').click();ready(page)
        first=page.evaluate('buffet.point("portion",0)');second=page.evaluate('buffet.point("portion",1)')
        page.mouse.move(first['x'],first['y']);page.mouse.down()
        page.mouse.move(second['x'],second['y'],steps=12);page.mouse.up()
        stacked=snapshot(page)['portions']
        assert stacked[0]['y']>stacked[1]['y']+.01
        saved(page);page.reload();ready(page)
        restored=snapshot(page)['portions']
        assert [(p['x'],p['y'],p['z']) for p in restored]==[(p['x'],p['y'],p['z']) for p in stacked]
        page.get_by_role('button',name='Continue your plate').click();ready(page)
        page.locator('#undo').click();page.locator('#undo').click()
        # A photograph requested during serving must capture a settled portion.
        page.locator('#add').click();page.locator('#photo').click()
        page.get_by_role('heading',name='Your plate photograph').wait_for(timeout=60000)
        assert not snapshot(page)['portions'][0]['motion']['active']
        page.get_by_role('button',name='Back',exact=True).click()
        page.locator('#undo').click()
        # Capacity stresses all unique meshes and repeated interrupt/settle paths.
        for _ in range(40):page.locator('#add').click()
        page.wait_for_function('buffet.snapshot().portions.every(p=>!p.motion.active)',timeout=20000)
        full=snapshot(page)
        assert len(full['portions'])==40
        assert all(p['extent']<=.1431 for p in full['portions'])
        assert scene_counts(page)['films']==80
        page.locator('#add').click();assert len(snapshot(page)['portions'])==40
        page.locator('#view').click();ready(page)
        page.screenshot(path=str(OUT/'capacity.png'))
        for _ in range(40):page.locator('#undo').click()
        assert scene_counts(page)==empty, (scene_counts(page),empty)
        assert not errors,errors
        report={'testedAt':datetime.now(timezone.utc).isoformat(),'frames':len(frames),
                'minimumVertexY':min(f['low'] for f in frames),'maxBendMeters':max(abs(f['bend']) for f in frames),
                'contactBeforePooling':True,'independentGeometry':True,'drag':True,'reload':True,'reorderedStackRestore':True,
                'photographSettlesMotion':True,'capacity':40,'cleanup':True,'fpsAtCapacity':full['fps'],'errors':errors}
        (OUT/'report.json').write_text(json.dumps(report,indent=2))
        browser.close()
        print('PASS chicken: contact, bending, pooling, independent meshes, drag, reload, photograph, 40 portions and cleanup.')


if __name__=='__main__':
    with site(None) as base:check(base)
