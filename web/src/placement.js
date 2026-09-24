// Sample actual food triangle surfaces on a 3 mm grid. Fitting one portion at a time
// uses its bottom surface against the plate/meal heightfield, preventing penetration.
const B=BABYLON, CELL=.003, N=101, MID=50, R=.143;
function triangle(map,a,b,c){
  const minX=Math.floor(Math.min(a.x,b.x,c.x)/CELL),maxX=Math.ceil(Math.max(a.x,b.x,c.x)/CELL),minZ=Math.floor(Math.min(a.z,b.z,c.z)/CELL),maxZ=Math.ceil(Math.max(a.z,b.z,c.z)/CELL);
  const det=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(det)<1e-12)return;
  for(let iz=minZ;iz<=maxZ;iz++)for(let ix=minX;ix<=maxX;ix++){
    const x=ix*CELL,z=iz*CELL,u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/det,v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/det,w=1-u-v;
    if(u<-.025||v<-.025||w<-.025)continue;const y=u*a.y+v*b.y+w*c.y,key=ix+','+iz,old=map.get(key);
    if(old){old.low=Math.min(old.low,y);old.high=Math.max(old.high,y);}else map.set(key,{ix,iz,low:y,high:y});
  }
}
export function sampleShape(root,angle){
  root.computeWorldMatrix(true);const rot=B.Matrix.RotationY(angle),base=B.Matrix.Invert(root.getWorldMatrix());const map=new Map();
  for(const mesh of root.getChildMeshes()){
    const positions=mesh.getVerticesData(B.VertexBuffer.PositionKind),indices=mesh.getIndices();if(!positions||!indices)continue;
    const matrix=mesh.computeWorldMatrix(true).multiply(base).multiply(rot),vertices=[];
    for(let i=0;i<positions.length;i+=3)vertices.push(B.Vector3.TransformCoordinates(B.Vector3.FromArray(positions,i),matrix));
    for(let i=0;i<indices.length;i+=3)triangle(map,vertices[indices[i]],vertices[indices[i+1]],vertices[indices[i+2]]);
  }
  return [...map.values()];
}
function surface(r){if(r<.106)return .009;return .01+(Math.min(r,.139)-.106)/.033*.0135;}
export class Placement {
  constructor(){this.reset();}
  reset(){this.grid=new Float32Array(N*N);for(let z=0;z<N;z++)for(let x=0;x<N;x++)this.grid[z*N+x]=surface(Math.hypot(x-MID,z-MID)*CELL);}
  occupy(p){for(const v of p.shape){const x=v.ix+Math.round(p.x/CELL)+MID,z=v.iz+Math.round(p.z/CELL)+MID;if(x>=0&&x<N&&z>=0&&z<N)this.grid[z*N+x]=Math.max(this.grid[z*N+x],p.y+v.high);}}
  rebuild(portions){this.reset();for(const p of portions)this.occupy(p);}
  heightAt(shape,x,z){
    const dx=Math.round(x/CELL),dz=Math.round(z/CELL);let height=0;
    for(const v of shape)height=Math.max(height,this.grid[(v.iz+dz+MID)*N+v.ix+dx+MID]-v.low);
    return height+.0002;
  }
  // Like heightAt, but tolerates positions partly off the grid (used to plan flight paths).
  clearAt(shape,x,z){const dx=Math.round(x/CELL),dz=Math.round(z/CELL);let height=-Infinity;for(const v of shape){const ix=v.ix+dx+MID,iz=v.iz+dz+MID;if(ix>=0&&ix<N&&iz>=0&&iz<N)height=Math.max(height,this.grid[iz*N+ix]-v.low);}return height;}
  fit(shape,preferred){
    let best=null,score=Infinity;
    for(let z=-44;z<=44;z+=2)for(let x=-44;x<=44;x+=2){
      let y=0,valid=true;
      for(const v of shape){const ix=x+v.ix,iz=z+v.iz;if(Math.hypot(ix,iz)*CELL>R){valid=false;break;}y=Math.max(y,this.grid[(iz+MID)*N+ix+MID]-v.low);}
      if(!valid)continue;
      // Prefer the lowest supported location; drag uses the nearest feasible location.
      const distance=preferred?Math.hypot(x*CELL-preferred.x,z*CELL-preferred.z):Math.hypot(x,z)*CELL;
      const s=preferred?distance+y*.35:y*5+distance*.06;
      if(s<score){score=s;best={x:x*CELL,y:y+.0002,z:z*CELL};}
    }
    if(!best)throw new Error('This portion cannot fit on the plate.');return best;
  }
}
