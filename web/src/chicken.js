import {plateSurface,supportAt} from './placement.js';
const B=BABYLON;

/** Bake the imported coordinate transform before deforming. Every serving owns
 * its geometry; textures/materials stay shared with the six tray portions. */
export function prepareChicken(root){
  const meshes=root.getChildMeshes().filter(mesh=>mesh.getTotalVertices());
  for(const mesh of meshes)mesh.computeWorldMatrix(true);
  const mesh=B.Mesh.MergeMeshes(meshes,true,true,undefined,false,false);
  mesh.name='Hand-breaded chicken parmesan';mesh.parent=root;
  // Merging bakes glTF's reflected root. Use the scene's face orientation.
  mesh.sideOrientation=B.Material.CounterClockWiseSideOrientation;
  return mesh;
}

/** Damped bending/compression during contact, in metres and seconds. This is
 * an artistic approximation, not measured food elasticity or a fluid solver.
 * Only an active serving updates vertex buffers; resting portions are static. */
export class ChickenMotion {
  constructor(portion,plate,grid,animate){
    this.p=portion;this.mesh=portion.root.getChildMeshes().find(m=>m.getTotalVertices());
    this.rest=new Float32Array(this.mesh.getVerticesData(B.VertexBuffer.PositionKind));
    this.positions=new Float32Array(this.rest);
    this.restNormals=new Float32Array(this.mesh.getVerticesData(B.VertexBuffer.NormalKind));
    this.normals=new Float32Array(this.restNormals);this.indices=this.mesh.getIndices();
    this.mesh.setVerticesData(B.VertexBuffer.PositionKind,this.positions,true);
    this.mesh.setVerticesData(B.VertexBuffer.NormalKind,this.normals,true);
    this.film=new JuiceFilm(plate,portion);this.place(grid);
    if(animate)this.start();
  }
  place(grid){
    this.support=new Float32Array(grid);
    const r=this.p.root.rotation;
    this.rotation=B.Matrix.RotationYawPitchRoll(r.y,r.x,r.z).m;
    // Check actual resting vertices as well as the game's 3 mm triangle grid.
    // This preserves contact with the rim and with previously served foods.
    this.p.y=Math.max(this.p.y,this.requiredHeight(this.rest));this.finish();
  }
  requiredHeight(positions){
    const m=this.rotation,p=this.p;let height=0;
    for(let i=0;i<positions.length;i+=3){
      const x=positions[i],y=positions[i+1],z=positions[i+2];
      const px=x*m[0]+y*m[4]+z*m[8]+p.x,py=x*m[1]+y*m[5]+z*m[9],pz=x*m[2]+y*m[6]+z*m[10]+p.z;
      height=Math.max(height,supportAt(this.support,px,pz)-py+.0002);
    }
    return height;
  }
  start(){
    this.active=true;this.p.animating=true;this.time=0;this.accumulator=0;
    this.y=.045;this.v=-.10;this.angle=-.26;this.angularV=.35;
    this.bend=.0012;this.bendV=0;this.squash=0;this.squashV=0;
    this.contactAge=-1;this.impacts=0;this.film.update(0);this.apply();
  }
  step(dt){
    if(!this.active)return;
    this.accumulator+=Math.min(dt,.05);
    while(this.accumulator>=1/240&&this.active){this.integrate(1/240);this.accumulator-=1/240;}
    if(this.active){this.apply();this.film.update(this.contactAge<0?0:1-Math.exp(-this.contactAge*2.4));}
  }
  integrate(h){
    this.time+=h;if(this.time<.36)return;
    this.v-=9.81*h;this.y+=this.v*h;
    this.bendV+=(-540*this.bend-31*this.bendV)*h;this.bend+=this.bendV*h;
    this.squashV+=(-760*this.squash-39*this.squashV)*h;this.squash+=this.squashV*h;
    if(this.contactAge>=0){this.angularV+=(-240*this.angle-25*this.angularV)*h;this.contactAge+=h;}
    this.angle+=this.angularV*h;
    const minimum=-.049*Math.abs(Math.sin(this.angle))+Math.min(0,this.bend);
    if(this.y+minimum<0){
      const speed=-this.v;this.y=-minimum;this.v=speed>.10?speed*.055:0;
      if(this.contactAge<0){
        this.contactAge=0;this.impacts++;this.bendV+=Math.min(.13,speed*.10);
        this.squashV-=Math.min(.022,speed*.019);this.angularV+=this.angle<0?2.1:-2.1;
      }
    }
    if(this.time>2.75&&Math.abs(this.angle)<.002&&Math.abs(this.bend)<.00004)this.finish();
  }
  apply(){
    const ca=Math.cos(this.angle),sa=Math.sin(this.angle),squash=Math.max(-.0015,Math.min(.001,this.squash));
    for(let i=0;i<this.rest.length;i+=3){
      const x=this.rest[i],y=this.rest[i+1],z=this.rest[i+2],soft=Math.min(1,y/.018);
      const yy=y+this.bend*(Math.min(1,(x/.049)**2)-.12)*(1+.2*soft)+squash*soft;
      this.positions[i]=x*ca-yy*sa;this.positions[i+1]=x*sa+yy*ca;this.positions[i+2]=z;
    }
    const p=this.p;
    if(this.time<.36){
      const t=this.time/.36,s=t*t*(3-2*t);
      p.root.position.set(p.x*s,.10*(1-s)+(p.y+.045)*s+Math.sin(t*Math.PI)*.045,.4*(1-s)+p.z*s);
    }else{
      p.root.position.set(p.x,Math.max(p.y+this.y,this.requiredHeight(this.positions)),p.z);
    }
    this.mesh.updateVerticesData(B.VertexBuffer.PositionKind,this.positions,true,false);
    B.VertexData.ComputeNormals(this.positions,this.indices,this.normals);
    this.mesh.updateVerticesData(B.VertexBuffer.NormalKind,this.normals);
  }
  finish(){
    this.active=false;this.p.animating=false;this.angle=0;this.bend=0;this.y=0;this.contactAge=10;
    this.positions.set(this.rest);this.mesh.updateVerticesData(B.VertexBuffer.PositionKind,this.positions,true,false);
    this.mesh.updateVerticesData(B.VertexBuffer.NormalKind,this.restNormals);
    this.p.root.position.set(this.p.x,this.p.y,this.p.z);this.film.update(1);
  }
  dispose(){this.active=false;this.film.dispose();}
  snapshot(){return {active:this.active,seconds:this.time||0,contactAge:this.contactAge,impacts:this.impacts||0,bend:this.bend,angle:this.angle,filmAmount:this.film.amount};}
}

/** Two thin, feathered tomato/oil films projected onto the porcelain profile.
 * Geometry is clipped inside the rim; it never participates in food placement
 * or picking. Stacked portions project their drippings onto the same plate. */
class JuiceFilm {
  constructor(plate,portion){
    this.p=portion;this.layers=[];const scene=plate.getScene();
    for(const [name,rx,rz,color,alpha,lift,phase] of [
      ['Fine amber oil',.058,.039,'#b07924',.28,.00012,.4],
      ['Tomato cooking juices',.055,.0365,'#a63a17',.58,.00022,1.2]
    ]){
      const segments=80,rings=7,rest=[0,0,0],indices=[],colors=[1,1,1,1];
      for(let k=1;k<=rings;k++)for(let j=0;j<segments;j++){
        const a=j/segments*Math.PI*2,r=k/rings,ripple=1+.06*Math.sin(a*3+phase)+.018*Math.sin(a*7+1)+.012*Math.cos(a*13);
        rest.push(Math.cos(a)*rx*r*ripple,0,Math.sin(a)*rz*r*ripple);
        colors.push(1,1,1,k===rings?.05:k===rings-1?.65:1);
        const next=(j+1)%segments;
        if(k===1)indices.push(0,1+j,1+next);
        else{const p=1+(k-2)*segments,q=p+segments;indices.push(p+j,q+j,q+next,p+j,q+next,p+next);}
      }
      const positions=new Float32Array(rest),normals=new Float32Array(rest.length);
      const data=new B.VertexData();Object.assign(data,{positions,normals,indices,colors});
      const mesh=new B.Mesh(name,scene);data.applyToMesh(mesh,true);mesh.parent=plate;mesh.isPickable=false;mesh.hasVertexAlpha=true;
      const mat=new B.PBRMaterial(name+' material',scene);mat.albedoColor=B.Color3.FromHexString(color);mat.metallic=0;mat.roughness=.14;mat.alpha=alpha;
      mat.backFaceCulling=false;mat.clearCoat.isEnabled=true;mat.clearCoat.intensity=.35;mat.clearCoat.roughness=.12;
      mesh.material=mat;mesh.receiveShadows=true;this.layers.push({mesh,rest,positions,normals,indices,lift});
    }
  }
  update(amount){
    this.amount=amount;const p=this.p,scale=.52+.48*amount,c=Math.cos(p.angle),s=Math.sin(p.angle);
    for(const layer of this.layers){
      const {mesh,rest,positions,normals,indices,lift}=layer;mesh.visibility=amount;mesh.setEnabled(amount>0);
      for(let i=0;i<rest.length;i+=3){
        const x=rest[i]*scale,z=rest[i+2]*scale;
        let px=p.x+c*x+s*z+.001,pz=p.z-s*x+c*z-.001;
        const radius=Math.hypot(px,pz),clip=Math.min(1,.1425/Math.max(radius,.0001));px*=clip;pz*=clip;
        positions[i]=px;positions[i+1]=plateSurface(Math.hypot(px,pz))+lift;positions[i+2]=pz;
      }
      B.VertexData.ComputeNormals(positions,indices,normals);
      mesh.updateVerticesData(B.VertexBuffer.PositionKind,positions,true,false);
      mesh.updateVerticesData(B.VertexBuffer.NormalKind,normals);
    }
  }
  dispose(){for(const {mesh} of this.layers)mesh.dispose(false,true);}
}
