"""Author, bake and export a new chicken parmesan portion. Blender 5.x.
Run: Blender --background --python tools/build_chicken.py
All dimensions are metres. Outputs go to artifacts/chicken-build for review.
"""
import bpy, bmesh, json, math, random, time
from mathutils import Vector, noise
from pathlib import Path
from math import sin, cos, pi, sqrt, exp, atan2

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'source/chicken_parmesan'
OUT=ROOT/'artifacts/chicken-build'; OUT.mkdir(parents=True,exist_ok=True)
R=random.Random(47219)
PARTS=[]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.unit_settings.system='METRIC'
scene.render.engine='CYCLES';scene.cycles.samples=8;scene.cycles.use_denoising=False

def mesh(name,verts,faces,mat):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob)
    ob.data.materials.append(mat)
    for p in data.polygons:p.use_smooth=True
    PARTS.append(ob);return ob

def material(name,colors,roughness,scale=1000,bump=.00012):
    m=bpy.data.materials.new(name);m.use_nodes=True
    n=m.node_tree.nodes;l=m.node_tree.links;bs=n.get('Principled BSDF')
    bs.inputs['Roughness'].default_value=roughness;bs.inputs['IOR'].default_value=1.46
    tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=scale
    tex.inputs['Detail'].default_value=3;tex.inputs['Roughness'].default_value=.7
    coord=n.new('ShaderNodeTexCoord');l.new(coord.outputs['Object'],tex.inputs['Vector'])
    ramp=n.new('ShaderNodeValToRGB')
    for i,(pos,c) in enumerate(colors):
        e=ramp.color_ramp.elements[i] if i<2 else ramp.color_ramp.elements.new(pos)
        e.position=pos;e.color=(*c,1)
    l.new(tex.outputs['Fac'],ramp.inputs['Fac']);l.new(ramp.outputs['Color'],bs.inputs['Base Color'])
    b=n.new('ShaderNodeBump');b.inputs['Strength'].default_value=.34;b.inputs['Distance'].default_value=bump
    l.new(tex.outputs['Fac'],b.inputs['Height']);l.new(b.outputs['Normal'],bs.inputs['Normal'])
    return m

crumb=material('Crisp toasted breadcrumb crust',[(0,(.13,.039,.008)),(1,(.63,.32,.067))],.65,3600,.00025)
n=crumb.node_tree.nodes;l=crumb.node_tree.links;bs=n.get('Principled BSDF')
tc=n.new('ShaderNodeTexCoord');mapping=n.new('ShaderNodeVectorMath');mapping.operation='SCALE';mapping.inputs['Scale'].default_value=1/.070
l.new(tc.outputs['Object'],mapping.inputs[0])
image=n.new('ShaderNodeTexImage');image.image=bpy.data.images.load(str(SOURCE/'breading-color.png'))
image.projection='BOX';image.projection_blend=.18;l.new(mapping.outputs[0],image.inputs['Vector'])
l.new(image.outputs['Color'],bs.inputs['Base Color'])
bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.5;bump.inputs['Distance'].default_value=.00032
l.new(image.outputs['Color'],bump.inputs['Height']);l.new(bump.outputs['Normal'],bs.inputs['Normal'])
lightcrumb=material('Freshly fractured crumb',[(.2,(.35,.16,.043)),(.85,(.86,.59,.25))],.7,3900,.00018)
darkcrumb=material('Deep toasted crumbs',[(.1,(.05,.012,.003)),(.9,(.24,.076,.009))],.7,4000,.00014)
sauce=material('Reduced tomato and olive oil',[(.18,(.19,.012,.004)),(.5,(.37,.032,.007)),(.86,(.56,.080,.015))],.28,1500,.00015)
n=sauce.node_tree.nodes;l=sauce.node_tree.links;bs=n.get('Principled BSDF')
tc=n.new('ShaderNodeTexCoord');scale=n.new('ShaderNodeVectorMath');scale.operation='SCALE';scale.inputs['Scale'].default_value=1/.070
l.new(tc.outputs['Object'],scale.inputs[0]);offset=n.new('ShaderNodeVectorMath');offset.operation='ADD';offset.inputs[1].default_value=(.5,.5,0);l.new(scale.outputs[0],offset.inputs[0])
tex=n.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(SOURCE/'sauce-color.png'));l.new(offset.outputs[0],tex.inputs['Vector']);l.new(tex.outputs['Color'],bs.inputs['Base Color'])
bn=n.new('ShaderNodeBump');bn.inputs['Strength'].default_value=.34;bn.inputs['Distance'].default_value=.00020;l.new(tex.outputs['Color'],bn.inputs['Height']);l.new(bn.outputs['Normal'],bs.inputs['Normal'])
pulp=material('Small soft tomato fragments',[(.15,(.23,.013,.003)),(.82,(.46,.048,.009))],.32,2300,.00008)
cheese=material('Blistered whole milk mozzarella',[(.2,(.88,.79,.59)),(.56,(.95,.85,.63)),(.68,(.64,.32,.07)),(.76,(.25,.07,.009)),(.92,(.055,.013,.003))],.33,590,.000035)
n=cheese.node_tree.nodes;l=cheese.node_tree.links;bs=n.get('Principled BSDF')
tc=n.new('ShaderNodeTexCoord');scale=n.new('ShaderNodeVectorMath');scale.operation='SCALE';scale.inputs['Scale'].default_value=1/.075
l.new(tc.outputs['Object'],scale.inputs[0]);offset=n.new('ShaderNodeVectorMath');offset.operation='ADD';offset.inputs[1].default_value=(.5,.5,0);l.new(scale.outputs[0],offset.inputs[0])
tex=n.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(SOURCE/'cheese-color.png'));tex.projection='FLAT';l.new(offset.outputs[0],tex.inputs['Vector']);l.new(tex.outputs['Color'],bs.inputs['Base Color'])
bn=n.new('ShaderNodeBump');bn.inputs['Strength'].default_value=.27;bn.inputs['Distance'].default_value=.00012;l.new(tex.outputs['Color'],bn.inputs['Height']);l.new(bn.outputs['Normal'],bs.inputs['Normal'])
green=material('Fresh basil',[(.1,(.014,.045,.005)),(.45,(.031,.12,.009)),(.9,(.1,.25,.026))],.43,2200,.000025)
vein=material('Basil veins',[(.2,(.047,.13,.012)),(.8,(.12,.24,.034))],.48,2800,.00001)
parmesan=material('Fine parmesan shavings',[(.1,(.74,.63,.4)),(.9,(.97,.9,.70))],.68,3000,.00004)

def edge(a):
    return 1+.052*sin(3*a+.8)+.036*sin(5*a-1)+.018*cos(9*a+.6)+.010*sin(19*a)

def radius(x,y):
    a=atan2(y/.0315,x/.048);return sqrt((x/.048)**2+(y/.0315)**2)/edge(a)

def top(x,y):
    r=min(1,radius(x,y))
    return .004+.0095*max(0,1-r**5)**.42+.0015*exp(-((x+.015)/.025)**2-((y-.009)/.02)**2)+.00065*noise.noise(Vector((x*175,y*175,2.7)))+.00022*noise.noise(Vector((x*900,y*900,9)))

def sauce_edge(a):
    # Broad sauce coverage, with narrow runs towards two crust edges.
    return .80+.055*sin(4*a+1)+.033*cos(7*a)+.08*exp(-(math.atan2(sin(a+2.2),cos(a+2.2))/.20)**2)

def sauce_top(x,y):
    r=min(1,radius(x,y)/sauce_edge(atan2(y/.0315,x/.048)))
    fade=.06+.94*sqrt(max(0,1-r**8))
    return top(x,y)+fade*(.00085+.00048*noise.noise(Vector((x*390,y*390,3)))+.00018*noise.noise(Vector((x*1180,y*1180,5))))

def cheese_edge(a):return .64+.064*sin(3*a-.7)+.051*cos(5*a+1)+.030*sin(8*a-.6)+.15*exp(-(math.atan2(sin(a-1.9),cos(a-1.9))/.15)**2)

bubbles=[]
for i in range(32):
    a=R.random()*2*pi;r=sqrt(R.random())*.52
    bubbles.append((cos(a)*.048*r-.002,sin(a)*.0315*r,R.uniform(.0004,.0016),R.uniform(.001,.0032)))

def cheese_top(x,y):
    z=.00065+.00013*sin(x*580+y*280)
    for cx,cy,height,size in bubbles:z+=height*exp(-((x-cx)**2+(y-cy)**2)/(size*size))
    a=atan2(y/.0315,(x+.002)/.048)
    r=min(1,radius(x+.002,y)/cheese_edge(a))
    return sauce_top(x,y)+z*(.14+.86*sqrt(max(0,1-r**8)))

def layer(name,boundary,height,mat,rings=26,segs=144,thickness=.0004,center=(0,0),base=False):
    vs=[(center[0],center[1],height(*center))];fs=[]
    for k in range(1,rings+1):
        r=k/rings
        for j in range(segs):
            a=j*2*pi/segs;rr=r*edge(a)*boundary(a)
            x=.048*rr*cos(a)+center[0];y=.0315*rr*sin(a)+center[1]
            z=height(x,y)
            if not base:z-=.0002*r**18
            vs.append((x,y,z))
        for j in range(segs):
            nxt=(j+1)%segs
            if k==1:fs.append((0,1+j,1+nxt))
            else:
                p=1+(k-2)*segs;q=p+segs;fs.append((p+j,q+j,q+nxt,p+nxt))
    lower=len(vs)
    for j in range(segs):
        x,y,z=vs[1+(rings-1)*segs+j]
        vs.append((x*.997,y*.997,.0005+.0004*sin(j*.7)**2 if base else z-thickness))
    for j in range(segs):
        a=1+(rings-1)*segs+j;b=1+(rings-1)*segs+(j+1)%segs
        fs.append((a,lower+j,lower+(j+1)%segs,b))
    fs.append(tuple(reversed([lower+j for j in range(segs)])))
    return mesh(name,vs,fs,mat)

layer('Irregular hand-breaded cutlet',lambda a:1,top,crumb,30,160,base=True)
layer('Sauce follows the cutlet',sauce_edge,sauce_top,sauce,28,144)
layer('Melted mozzarella with soft blisters',cheese_edge,cheese_top,cheese,32,160,center=(-.002,0))

# Construct many tiny baked-in flakes in batches, preserving a small draw count.
def flecks(name,count,mat,accept,size,zfn):
    vs=[];fs=[]
    for i in range(count):
        for _ in range(100):
            a=R.random()*2*pi;r=sqrt(R.random());x=.048*r*edge(a)*cos(a);y=.0315*r*edge(a)*sin(a)
            if accept(x,y,a,r):break
        else:continue
        sx=R.uniform(*size);sy=sx*R.uniform(.45,1.4);sz=sx*R.uniform(.18,.5);z=zfn(x,y)+sz*.2;rot=R.random()*pi
        start=len(vs)
        for xx,yy,zz in [(0,0,sz),(-sx,-sy,0),(sx,-sy*.65,-sz*.35),(sx*.75,sy,0),(-sx*.8,sy*.55,-sz*.15),(0,0,-sz*.6)]:
            vs.append((x+xx*cos(rot)-yy*sin(rot),y+xx*sin(rot)+yy*cos(rot),z+zz))
        fs.extend(tuple(start+j for j in f) for f in [(0,1,2),(0,2,3),(0,3,4),(0,4,1),(5,2,1),(5,3,2),(5,4,3),(5,1,4)])
    return mesh(name,vs,fs,mat)

flecks('Jagged crisp breadcrumb relief',850,crumb,lambda x,y,a,r:r>sauce_edge(a)-.08,(.00020,.00080),top)
flecks('Golden crumb peaks',150,lightcrumb,lambda x,y,a,r:r>sauce_edge(a)-.03,(.00013,.00042),top)
flecks('Scattered browned crumbs',70,darkcrumb,lambda x,y,a,r:r>.75,(.00012,.00032),top)
flecks('Tomato pulp in the sauce',190,pulp,lambda x,y,a,r:cheese_edge(a)+.03<r<sauce_edge(a)-.025,(.00012,.00043),sauce_top)
flecks('Finely grated parmesan',75,parmesan,lambda x,y,a,r:r<.55,(.00006,.00019),cheese_top)

def tube(name,points,width,mat):
    vs=[];fs=[];sides=5
    for i,p in enumerate(points):
        for j in range(sides):
            a=2*pi*j/sides;vs.append((p[0]+cos(a)*width,p[1],p[2]+sin(a)*width))
        if i:
            for j in range(sides):fs.append(((i-1)*sides+j,(i-1)*sides+(j+1)%sides,i*sides+(j+1)%sides,i*sides+j))
    return mesh(name,vs,fs,mat)

def leaf(cx,cy,length,width,angle):
    vs=[];fs=[];steps=24;across=8
    def point(u,v):
        xx=width*.5*sin(pi*u)**.8*v;yy=(u-.5)*length
        x=cx+xx*cos(angle)-yy*sin(angle);y=cy+xx*sin(angle)+yy*cos(angle)
        z=cheese_top(x,y)+.00023+.0005*sin(pi*u)+.00042*abs(v)**2*sin(u*3*pi+.6)+.00025*(1-abs(v))
        return (x,y,z)
    for i in range(steps+1):
        for j in range(across+1):vs.append(point(.008+.984*i/steps,-1+2*j/across))
    for i in range(steps):
        for j in range(across):
            a=i*(across+1)+j;fs.append((a,a+1,a+across+2,a+across+1))
    ob=mesh('Tender basil leaf',vs,fs,green)
    mod=ob.modifiers.new('Thin leaf thickness','SOLIDIFY');mod.thickness=.00006
    bpy.context.view_layer.objects.active=ob;bpy.ops.object.modifier_apply(modifier=mod.name)
    tube('Basil midrib',[tuple(Vector(point(.04+.90*k/18,0))+Vector((0,0,.00008))) for k in range(19)],.000075,vein)
    for k in range(1,6):
        for side in [-1,1]:
            tube('Basil fine veins',[tuple(Vector(point(.08+k*.13+t*.05,side*t*.20))+Vector((0,0,.00004))) for t in range(4)],.000027,vein)

leaf(.009,.006,.019,.010,-.7)
leaf(.016,-.001,.014,.008,1.0)

bpy.ops.object.select_all(action='DESELECT')
for ob in PARTS:ob.select_set(True)
bpy.context.view_layer.objects.active=PARTS[0];bpy.ops.object.join();ob=bpy.context.object;ob.name='chicken_parmesan_v2'
# Preserve existing serving footprint while retaining a believable thinner cutlet.
lo=Vector(tuple(min(v.co[i] for v in ob.data.vertices) for i in range(3)))
hi=Vector(tuple(max(v.co[i] for v in ob.data.vertices) for i in range(3)))
for v in ob.data.vertices:
    v.co.x=(v.co.x-(lo.x+hi.x)/2)*.09792/(hi.x-lo.x)
    v.co.y=(v.co.y-(lo.y+hi.y)/2)*.065965/(hi.y-lo.y)
    v.co.z-=lo.z
bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free()
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.2,island_margin=.003,area_weight=.4);bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'chicken-parmesan-editable.blend'))
maps={}
for label,kind in [('color','DIFFUSE'),('normal','NORMAL'),('roughness','ROUGHNESS')]:
    im=bpy.data.images.new('Chicken '+label,width=2048,height=2048,alpha=False)
    if label!='color':im.colorspace_settings.name='Non-Color'
    for mat in ob.data.materials:
        nodes=mat.node_tree.nodes
        for node in nodes:node.select=False
        node=nodes.new('ShaderNodeTexImage');node.name='BAKE_TARGET';node.image=im;node.select=True;nodes.active=node
    scene.render.bake.margin=8
    if kind=='DIFFUSE':bpy.ops.object.bake(type=kind,pass_filter={'COLOR'})
    else:bpy.ops.object.bake(type=kind)
    im.filepath_raw=str(OUT/f'chicken-{label}.png');im.file_format='PNG';im.save();maps[label]=im
    for mat in ob.data.materials:
        for node in list(mat.node_tree.nodes):
            if node.name.startswith('BAKE_TARGET'):mat.node_tree.nodes.remove(node)
    print('BAKED',label,flush=True)

baked=bpy.data.materials.new('Chicken parmesan — baked PBR');baked.use_nodes=True
n=baked.node_tree.nodes;l=baked.node_tree.links;bs=n.get('Principled BSDF');bs.inputs['Metallic'].default_value=0
for label,socket in [('color','Base Color'),('roughness','Roughness')]:
    node=n.new('ShaderNodeTexImage');node.image=maps[label];l.new(node.outputs['Color'],bs.inputs[socket])
node=n.new('ShaderNodeTexImage');node.image=maps['normal'];nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.8
l.new(node.outputs['Color'],nm.inputs['Color']);l.new(nm.outputs['Normal'],bs.inputs['Normal'])
ob.data.materials.clear();ob.data.materials.append(baked)
for p in ob.data.polygons:p.material_index=0
bpy.ops.export_scene.gltf(filepath=str(OUT/'chicken-parmesan-v2.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=False)
ob.data.calc_loop_triangles()
metrics={'vertices':len(ob.data.vertices),'triangles':len(ob.data.loop_triangles),'dimensionsBlenderXYZ':list(ob.dimensions),'textureSize':2048,'source':'Authored Blender geometry; AI-generated breading, cheese and sauce color textures; procedural surface detail and basil.'}
(OUT/'chicken-metrics.json').write_text(json.dumps(metrics,indent=2)+'\n')
print(json.dumps(metrics),flush=True)
