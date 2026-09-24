const B = BABYLON;
const V = (x,y,z) => new B.Vector3(x,y,z);
export const stationX = i => (i - 7) * .7;

// Meter-scale reconstruction of Asta_test/CafeteriaEnvironment.cs.
export function buildHall(scene) {
  const batches = new Map();
  function material(name, color, metallic=0, roughness=.6, texture='') {
    const m = new B.PBRMaterial(name,scene); m.albedoColor=B.Color3.FromHexString(color);m.metallic=metallic;m.roughness=roughness;
    if(texture){
      const t=new B.DynamicTexture(name+' grain',256,scene,false);const c=t.getContext();let seed=381;
      const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
      c.fillStyle='#eeeeee';c.fillRect(0,0,256,256);
      for(let i=0;i<7000;i++){const v=190+Math.floor(random()*60);c.fillStyle=`rgba(${v},${v},${v},.2)`;let x=random()*256,y=random()*256;c.fillRect(x,y,texture==='oak'?1:3,texture==='oak'?20+random()*100:2);}
      if(texture==='tile'){c.fillStyle='#9a9e92';for(let y=0;y<256;y+=64){c.fillRect(0,y,256,1);for(let x=(y/64%2)*64;x<256;x+=128)c.fillRect(x,y,1,64);}}
      t.update();t.uScale=t.vScale=3;m.albedoTexture=t;
    }
    batches.set(m,[]);return m;
  }
  const oak=material('Quarter-sawn oak','#9c6438',.04,.7,'oak'),pale=material('Natural oak furniture','#bf925e',.03,.65,'oak'),stone=material('Warm quartz','#dddbce',.02,.5,'stone'),floor=material('Limestone','#a4a99f',0,.8,'stone'),tile=material('Glazed ivory tile','#c1cabe',.03,.5,'tile'),grout=material('Grout','#777b71'),steel=material('Satin stainless steel','#b1bcc0',.76,.35),brushed=material('Brushed steel','#909b9e',.72,.45),dark=material('Blackened steel','#253331',.5,.45),charcoal=material('Charcoal enamel','#101b18',.2,.7),brass=material('Warm brass','#95703f',.7,.4),plaster=material('Mineral plaster','#d5d2bf',0,.9,'stone'),linen=material('Linen upholstery','#98a58d'),sage=material('Deep sage timber','#344f40'),leaf=material('Leaves','#234c1b'),leafLight=material('Leaf highlights','#526e29'),clay=material('Planters','#815439'),skin=material('Diners','#956e53'),shirt=material('Clothing','#54645b');
  const glow=material('Warm fixtures','#fff4d8');glow.emissiveColor=new B.Color3(1,.9,.7);
  const sky=material('Campus daylight','#c6dee6');sky.emissiveColor=new B.Color3(.4,.5,.55);
  const glass=material('Sneeze guard','#d1eeec',0,.13);glass.alpha=.10;glass.backFaceCulling=false;
  function add(m,mat,p){m.material=mat;m.position.copyFrom(p);m.isPickable=false;batches.get(mat).push(m);return m;}
  function box(p,s,m){return add(B.MeshBuilder.CreateBox('furnishing',{width:s[0],height:s[1],depth:s[2]},scene),m,V(...p));}
  function cyl(a,b,r,m,n=12){a=V(...a);b=V(...b);const d=b.subtract(a);const mesh=B.MeshBuilder.CreateCylinder('detail',{height:d.length(),diameter:r*2,tessellation:n},scene);mesh.rotationQuaternion=B.Quaternion.FromUnitVectorsToRef(B.Axis.Y,d.normalize(),new B.Quaternion());return add(mesh,m,a.add(b).scale(.5));}
  function ell(p,s,m){const mesh=B.MeshBuilder.CreateSphere('organic detail',{segments:8,diameter:2},scene);mesh.scaling.copyFromFloats(...s);return add(mesh,m,V(...p));}
  function plant(x,z,h){cyl([x,0,z],[x,h*.24,z],h*.13,clay,18);cyl([x,h*.2,z],[x,h*.85,z],.018,pale);for(let i=0;i<13;i++){const a=i*2.4,y=h*(.45+(i%5)*.12);ell([x+Math.cos(a)*h*.16,y,z+Math.sin(a)*h*.16],[h*.14,h*.17,h*.1],i%2?leaf:leafLight);}}
  function label(text,p,w,h,flat=false){const t=new B.DynamicTexture(text,{width:1024,height:192},scene,true);const ctx=t.getContext();ctx.fillStyle='#f4f1e6';ctx.fillRect(0,0,1024,192);ctx.fillStyle='#33493c';ctx.font='48px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,96,960);t.update();const mat=new B.StandardMaterial(text,scene);mat.diffuseTexture=t;mat.specularColor=B.Color3.Black();mat.emissiveColor=new B.Color3(.12,.12,.12);const mesh=B.MeshBuilder.CreatePlane(text,{width:w,height:h,sideOrientation:B.Mesh.DOUBLESIDE},scene);mesh.position=V(...p);mesh.material=mat;mesh.isPickable=false;if(flat)mesh.rotation.x=Math.PI/2;return mesh;}
  box([0,-.05,-1],[18,.1,15],floor);
  for(let x=-12;x<=12;x++)box([x*.75,.002,-1],[.0035,.001,15],grout);
  for(let z=-11;z<=8;z++)box([0,.002,z*.75],[18,.001,.0035],grout);
  box([0,2.1,4.3],[18,4.2,.2],plaster);box([0,1.63,4.175],[12.8,2.8,.05],tile);
  box([0,.1,4.12],[18,.2,.09],dark);box([0,3.48,3.2],[13.5,.16,2.15],plaster);box([0,3.39,2.11],[13.5,.025,.025],glow);
  for(let i=-14;i<=14;i++)box([i*.45,3.62,1.67],[.055,.2,1.12],pale);
  for(const side of [-1,1]){
    const x=side*8.2;box([x,.42,-1.1],[.22,.84,10.2],plaster);box([x,3.85,-1.1],[.24,.5,10.2],plaster);box([x+side*.14,2.23,-1.1],[.025,2.84,10.1],sky);box([x,.87,-1.1],[.34,.08,10.2],stone);
    for(let z=-3;z<=3;z++)box([x,2.23,-1.1+z*1.66],[.22,2.9,.07],charcoal);box([x,2.64,-1.1],[.18,.045,10.2],charcoal);
    for(let i=0;i<9;i++){let z=-5.6+i*1.1;ell([x,1.03,z],[.07,.3,.72],sage);cyl([x-side*.08,.92,z],[x-side*.08,2.2,z],.025,pale);ell([x-side*.07,2.17,z],[.06,.62,.39],sage);}
    plant(side*7.7,.48,1.65);plant(side*7.7,-5.7,1.42);
  }
  box([7.05,1.14,4.03],[1.22,2.28,.14],pale);box([7.05,1.53,3.94],[.84,.83,.02],glass);cyl([6.65,1.02,3.91],[6.65,1.23,3.91],.018,steel);
  box([-7.18,1.74,4.04],[1.14,1.04,.07],pale);box([-7.18,1.74,3.99],[1.05,.95,.01],sage);label('CAMPUS DINING',[-7.18,2.05,3.97],.95,.12);
  for(let j=0;j<3;j++){box([-7.48+j*.3,1.72,3.968],[.24,.34,.004],plaster);for(let k=0;k<4;k++)box([-7.48+j*.3,1.78-k*.035,3.96],[.15,.004,.002],sage);}
  for(let g=0;g<3;g++){
    let x=(g-1)*3.5;box([x,.46,.02],[3.39,.84,.97],oak);box([x,.077,.035],[3.24,.13,.86],charcoal);box([x,.9,-.01],[3.44,.055,1.09],stone);box([x,.838,-.479],[3.34,.025,.012],brass);box([x,.911,-.64],[3.44,.031,.19],stone);box([x,.886,-.728],[3.37,.025,.012],brass);
    for(let s=0;s<28;s++)box([x-1.62+s*.12,.46,-.472],[.005,.71,.01],dark);
    label(['MAINS','SIDES','FRESH & SWEET'][g],[x,.47,-.489],1.1,.15);
    box([x,1.49,.43],[3.43,.045,.47],oak);box([x,1.461,.24],[3.28,.014,.022],glow);box([x,1.31,.29],[3.21,.27,.008],glass);
    for(const e of [-1,1]){cyl([x+e*1.65,.924,.37],[x+e*1.65,1.478,.37],.024,brass);cyl([x+e*1.65,.932,.37],[x+e*1.65,.948,.37],.047,steel);}
    cyl([x-1.61,1.176,.29],[x+1.61,1.176,.29],.007,steel);
  }
  for(let i=0;i<15;i++){let x=stationX(i);box([x,.932,0],[.525,.022,.44],dark);box([x,.937,0],[.474,.006,.389],brushed);for(const z of [-.21,.21])box([x,.95,z],[.519,.036,.021],steel);for(const e of [-.253,.253])box([x+e,.95,0],[.019,.036,.405],steel);box([x,.937,-.348],[.235,.012,.087],brass);}
  for(let i=0;i<8;i++){let x=-3.6+i*1.02;box([x,.43,3.67],[.995,.79,.73],brushed);box([x,.89,3.65],[1.02,.055,.83],steel);box([x,.975,4.05],[1.02,.18,.025],brushed);for(const d of [-1,1]){box([x+d*.25,.46,3.288],[.478,.66,.025],steel);cyl([x+d*.13,.54,3.246],[x+d*.13,.72,3.246],.011,dark);}}
  // Refrigeration, double ovens, extraction canopies and cooktops.
  box([-5.5,1.14,3.58],[1.24,2.2,.95],dark);for(const s of [-1,1]){box([-5.5+s*.302,1.18,3.086],[.588,1.9,.065],brushed);cyl([-5.5+s*.08,.99,3.017],[-5.5+s*.08,1.5,3.017],.014,steel);}for(let v=0;v<8;v++)box([-5.96+v*.13,.13,3.09],[.064,.086,.005],brushed);
  box([5.45,1.08,3.6],[1,2.1,.85],brushed);for(let o=0;o<2;o++){let y=.6+o*.94;box([5.45,y,3.155],[.88,.65,.06],steel);box([5.45,y-.035,3.122],[.66,.37,.012],charcoal);cyl([5.12,y+.22,3.077],[5.78,y+.22,3.077],.017,dark);box([5.45,y+.41,3.164],[.83,.115,.025],charcoal);for(let k=0;k<3;k++)cyl([5.16+k*.29,y+.41,3.146],[5.16+k*.29,y+.41,3.12],.033,steel);}
  for(const x of [-2.15,2.25]){box([x,2.49,3.57],[2.7,.24,1.05],brushed);box([x,2.62,3.63],[2.12,.12,.8],steel);box([x,2.9,3.82],[.58,.51,.47],brushed);box([x,2.356,3.61],[2.44,.013,.75],dark);for(let s=0;s<13;s++)box([x-1.14+s*.19,2.342,3.62],[.065,.012,.67],steel);box([x,2.345,3.085],[2.48,.018,.031],glow);box([x,.927,3.56],[1.13,.027,.6],dark);for(const ix of [-1,1])for(const iz of [-1,1]){cyl([x+ix*.27,.95,3.56+iz*.14],[x+ix*.27,.965,3.56+iz*.14],.075,charcoal);box([x+ix*.27,.975,3.56+iz*.14],[.2,.015,.014],steel);box([x+ix*.27,.975,3.56+iz*.14],[.014,.015,.2],steel);}cyl([x+.27,.97,3.7],[x+.27,1.14,3.7],.108,brushed);cyl([x+.27,1.14,3.7],[x+.27,1.154,3.7],.114,steel);cyl([x+.27,1.154,3.7],[x+.27,1.177,3.7],.026,charcoal);}
  box([-.1,.93,3.55],[.69,.013,.44],steel);box([-.1,.945,3.55],[.58,.01,.34],dark);cyl([-.1,.94,3.79],[-.1,1.22,3.79],.014,steel);cyl([-.1,1.22,3.79],[-.1,1.22,3.595],.014,steel);
  box([0,.91,1.83],[6.2,.05,.62],steel);box([0,.29,1.86],[6.06,.035,.5],brushed);for(let i=-3;i<=3;i+=2)for(const z of [1.62,2.06])cyl([i,.06,z],[i,.91,z],.028,steel);
  for(let i=0;i<4;i++){let x=-2.5+i*1.65;box([x,.945,1.85],[.38,.021,.3],pale);cyl([x+.32,.935,1.95],[x+.32,1.12,1.95],.063,brushed);for(let u=0;u<3;u++){cyl([x+.3+u*.018,1.03,1.95],[x+.3+u*.04,1.27,1.96],.007,steel);ell([x+.3+u*.04,1.27,1.96],[.018,.029,.009],steel);}for(let b=0;b<3;b++)ell([x,.345+b*.031,1.82],[.14,.05,.14],brushed);}
  for(let s=0;s<3;s++)box([-6.05,.19+s*.34,1.53],[.69,.027,.51],steel);for(const x of [-1,1])for(const z of [-1,1]){cyl([-6.05+x*.3,.09,1.53+z*.21],[-6.05+x*.3,1,1.53+z*.21],.017,steel);ell([-6.05+x*.3,.07,1.53+z*.21],[.025,.053,.053],charcoal);}for(let i=0;i<6;i++)cyl([-5.93,.89+i*.014,1.53],[-5.93,.9+i*.014,1.53],.122,stone,24);
  box([6.52,.45,2.13],[1.07,.87,.68],sage);box([6.52,.905,2.13],[1.12,.045,.73],stone);for(let i=0;i<2;i++){let x=6.25+i*.45;box([x,.969,2.16],[.31,.085,.33],charcoal);cyl([x,1.01,2.175],[x,1.45,2.175],.12,brushed);cyl([x,1.45,2.175],[x,1.474,2.175],.126,charcoal);cyl([x,1.18,2.04],[x,1.18,1.98],.023,charcoal);}label('COFFEE & TEA',[6.52,.54,1.783],.8,.12);
  function table(x,z){cyl([x,.735,z],[x,.772,z],.45,pale,32);cyl([x,.065,z],[x,.735,z],.04,charcoal);cyl([x,.025,z],[x,.055,z],.265,charcoal,24);cyl([x,.773,z],[x,.891,z],.039,stone);ell([x,.94,z],[.08,.1,.08],leafLight);}
  function chair(x,z,side){box([x,.443,z],[.4,.045,.39],pale);box([x+side*.178,.705,z],[.035,.32,.39],pale);for(const dx of [-1,1])for(const dz of [-1,1])cyl([x+dx*.19,.025,z+dz*.18],[x+dx*.135,.44,z+dz*.145],.014,charcoal);}
  for(const s of [-1,1]){for(let r=0;r<3;r++){let x=s*6.78,z=-1.3-r*1.85;table(x,z);chair(x-.61,z,-1);chair(x+.61,z,1);}box([s*6.45,.33,-6.4],[2.22,.55,.6],pale);box([s*6.45,.635,-6.4],[2.17,.09,.58],linen);box([s*6.45,.97,-6.66],[2.23,.68,.1],linen);table(s*6.45,-5.71);for(const z of [-2.42,-4.27]){cyl([s*6.72,2.8,z],[s*6.72,4.15,z],.008,charcoal);ell([s*6.72,2.76,z],[.23,.12,.23],brass);cyl([s*6.72,2.69,z],[s*6.72,2.7,z],.2,glow);}}
  for(const [x,z,s] of [[-7.39,-3.15,1],[7.39,-1.3,-1],[6.17,-5,1],[-6.17,-5,-1]]){ell([x,.78,z],[.14,.27,.2],shirt);ell([x,1.12,z],[.1,.13,.1],skin);cyl([x,.54,z-.1],[x+s*.25,.47,z-.1],.065,dark);cyl([x,.54,z+.1],[x+s*.25,.47,z+.1],.065,dark);cyl([x,.86,z-.19],[x+s*.32,.79,z-.18],.04,skin);}
  for(const [mat,meshes] of batches){if(!meshes.length)continue;const merged=B.Mesh.MergeMeshes(meshes,true,true,undefined,false,false);merged.name=mat.name;merged.isPickable=false;merged.receiveShadows=true;merged.freezeWorldMatrix();}
  return {label};
}

export function makePlate(scene) {
  const profile=[[0,.004],[.077,.004],[.083,.001],[.089,.001],[.091,.007],[.113,.009],[.141,.017],[.145,.020],[.144,.023],[.139,.0235],[.115,.017],[.106,.010],[.095,.009],[0,.009]];
  const plate=B.MeshBuilder.CreateLathe('White porcelain · 29 cm',{shape:profile.map(([r,h])=>V(r,h,0)),tessellation:96,sideOrientation:B.Mesh.DOUBLESIDE},scene);
  const m=new B.PBRMaterial('Glazed white porcelain',scene);m.albedoColor=new B.Color3(.96,.96,.93);m.metallic=0;m.roughness=.22;plate.material=m;plate.receiveShadows=true;plate.isPickable=true;plate.metadata={plate:true};return plate;
}
