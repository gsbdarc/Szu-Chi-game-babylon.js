// Anime retheme: cel shading with ink lines and screentone, sakura, sparkles, manga SFX text, speed
// lines, impact frames, a mascot and eyecatches. Presentation only: it wraps game methods for effects
// and never touches research data. Flourish particles use their own layer so the plate photograph
// camera (default layer mask) never sees them.
const B=BABYLON,V=(x,y,z)=>new B.Vector3(x,y,z),FX_LAYER=0x10000000;
const calm=matchMedia('(prefers-reduced-motion: reduce)').matches;
const pick=a=>a[Math.floor(Math.random()*a.length)];
const wait=ms=>new Promise(r=>setTimeout(r,ms));

B.Effect.ShadersStore.animeFragmentShader=`
precision highp float;
varying vec2 vUV;
uniform sampler2D textureSampler;
uniform sampler2D depthSampler;
uniform vec2 screenSize;
uniform float time,aberration,speed,flash;
float luma(vec3 c){return dot(c,vec3(.299,.587,.114));}
float hash(float n){return fract(sin(n)*43758.5453);}
void main(){
  vec2 px=1./screenSize,c=vUV-.5;
  float r=length(c*vec2(screenSize.x/screenSize.y,1.));
  vec2 off=c*aberration*.014;
  vec3 col=vec3(texture2D(textureSampler,vUV+off).r,texture2D(textureSampler,vUV).g,texture2D(textureSampler,vUV-off).b);
  // Cel shading: pull luminance toward four flat bands, then push saturation.
  float l=luma(col),band=(floor(l*4.)+.5)/4.;
  col*=mix(1.,band/max(l,.02),.5);
  col=max(mix(vec3(luma(col)),col,1.55),0.);
  // Ink lines from depth discontinuities and strong luminance edges.
  float d=texture2D(depthSampler,vUV).r;
  float dx=abs(texture2D(depthSampler,vUV+vec2(px.x,0.)).r-texture2D(depthSampler,vUV-vec2(px.x,0.)).r);
  float dy=abs(texture2D(depthSampler,vUV+vec2(0.,px.y)).r-texture2D(depthSampler,vUV-vec2(0.,px.y)).r);
  float de=smoothstep(.03,.08,(dx+dy)/max(d,.0005));
  float lx=luma(texture2D(textureSampler,vUV+vec2(px.x,0.)).rgb)-luma(texture2D(textureSampler,vUV-vec2(px.x,0.)).rgb);
  float ly=luma(texture2D(textureSampler,vUV+vec2(0.,px.y)).rgb)-luma(texture2D(textureSampler,vUV-vec2(0.,px.y)).rgb);
  float le=smoothstep(.2,.38,length(vec2(lx,ly)));
  col=mix(col,vec3(.13,.07,.16),max(de,le*.7)*.9);
  // Manga screentone dots in the shadows.
  vec2 g=mat2(.707,-.707,.707,.707)*gl_FragCoord.xy/5.;
  float shade=smoothstep(.42,.1,l);
  col*=1.-.35*shade*step(length(fract(g)-.5),.42*shade+.08);
  col+=smoothstep(.72,1.,l)*.2;
  // Speed lines radiate from the centre while the camera travels.
  float a=atan(c.y,c.x),line=step(.8,hash(floor(a*90.)+floor(time*20.)));
  col=mix(col,vec3(1.),line*smoothstep(.2,.62,r)*speed*.8);
  col=mix(col,col*vec3(1.,.78,.9),smoothstep(.55,1.05,r));
  col=mix(col,vec3(1.,.97,.99),flash);
  gl_FragColor=vec4(col,1.);
}`;

function sprite(scene,name,draw,size=128){const t=new B.DynamicTexture(name,size,scene,true);const c=t.getContext();c.clearRect(0,0,size,size);draw(c,size);t.update();t.hasAlpha=true;return t;}
const petal=(c,s)=>{c.translate(s/2,s/2);const g=c.createRadialGradient(0,0,2,0,0,s*.45);g.addColorStop(0,'#fff4f9');g.addColorStop(1,'#ff8fc0');c.fillStyle=g;c.beginPath();c.moveTo(0,-s*.42);c.bezierCurveTo(s*.36,-s*.3,s*.3,s*.26,0,s*.42);c.bezierCurveTo(-s*.3,s*.26,-s*.36,-s*.3,0,-s*.42);c.fill();c.globalCompositeOperation='destination-out';c.beginPath();c.moveTo(0,-s*.28);c.lineTo(-s*.09,-s*.47);c.lineTo(s*.09,-s*.47);c.fill();};
const star=(c,s)=>{c.translate(s/2,s/2);const g=c.createRadialGradient(0,0,0,0,0,s*.5);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.25,'rgba(255,250,210,.6)');g.addColorStop(1,'rgba(255,240,180,0)');c.fillStyle=g;c.fillRect(-s/2,-s/2,s,s);c.fillStyle='#fff';c.beginPath();for(let i=0;i<4;i++){c.rotate(Math.PI/2);c.moveTo(0,0);c.quadraticCurveTo(s*.05,-s*.05,0,-s*.48);c.quadraticCurveTo(-s*.05,-s*.05,0,0);}c.fill();};
const heart=(c,s)=>{c.translate(s/2,s*.56);c.fillStyle='#ff4f9a';c.strokeStyle='#fff';c.lineWidth=s*.05;c.beginPath();c.moveTo(0,s*.3);c.bezierCurveTo(-s*.5,-s*.05,-s*.25,-s*.45,0,-s*.18);c.bezierCurveTo(s*.25,-s*.45,s*.5,-s*.05,0,s*.3);c.fill();c.stroke();};

const MASCOT=`<svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="rice" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#eee6f4"/></linearGradient></defs>
<path d="M60 8 C72 8 112 78 108 94 C104 110 16 110 12 94 C8 78 48 8 60 8Z" fill="url(#rice)" stroke="#22122a" stroke-width="4" stroke-linejoin="round"/>
<rect x="36" y="80" width="48" height="26" rx="4" fill="#1f3b2d" stroke="#22122a" stroke-width="3"/>
<g class="eyes"><ellipse cx="45" cy="60" rx="6" ry="9" fill="#22122a"/><ellipse cx="75" cy="60" rx="6" ry="9" fill="#22122a"/><circle cx="47" cy="56" r="2.6" fill="#fff"/><circle cx="77" cy="56" r="2.6" fill="#fff"/><circle cx="43" cy="64" r="1.3" fill="#fff"/><circle cx="73" cy="64" r="1.3" fill="#fff"/></g>
<g class="happy"><path d="M38 62 Q45 52 52 62" fill="none" stroke="#22122a" stroke-width="4" stroke-linecap="round"/><path d="M68 62 Q75 52 82 62" fill="none" stroke="#22122a" stroke-width="4" stroke-linecap="round"/></g>
<ellipse cx="34" cy="72" rx="7" ry="4" fill="#ff9ec7" opacity=".8"/><ellipse cx="86" cy="72" rx="7" ry="4" fill="#ff9ec7" opacity=".8"/>
<path d="M53 72 Q56.5 77 60 72 Q63.5 77 67 72" fill="none" stroke="#22122a" stroke-width="3" stroke-linecap="round"/></svg>`;

export function installAnime(game){
  const {scene,camera,canvas,engine}=game,stage=document.getElementById('stage');
  document.documentElement.classList.add('anime');
  // Post-processing: one uber shader for cel, ink, screentone, speed lines and impact frames.
  const depth=scene.enableDepthRenderer(camera,false).getDepthMap(),fx={time:0,aberration:.35,speed:0,flash:0,tilt:0,punch:0};
  const post=new B.PostProcess('Anime cel and ink','anime',['screenSize','time','aberration','speed','flash'],['depthSampler'],1,camera);
  post.onApply=e=>{e.setTexture('depthSampler',depth);e.setFloat2('screenSize',post.width,post.height);e.setFloat('time',fx.time);e.setFloat('aberration',fx.aberration);e.setFloat('speed',fx.speed);e.setFloat('flash',fx.flash);};
  camera.layerMask|=FX_LAYER;
  scene.clearColor=new B.Color4(.99,.84,.92,1);
  const sky=scene.materials.find(m=>m.name==='Campus daylight');if(sky){sky.albedoColor=B.Color3.FromHexString('#8fd3ff');sky.emissiveColor=new B.Color3(.45,.7,1);}
  const glow=scene.materials.find(m=>m.name==='Warm fixtures');if(glow)glow.emissiveColor=new B.Color3(1,.7,.9);
  // Sakura drift through the whole hall, indoors or not.
  const petals=new B.ParticleSystem('Sakura',600,scene);petals.particleTexture=sprite(scene,'petal',petal);petals.layerMask=FX_LAYER;
  petals.emitter=V(0,0,0);petals.minEmitBox=V(-7,2.3,-3.2);petals.maxEmitBox=V(7,3.3,1.5);petals.color1=new B.Color4(1,.8,.9,1);petals.color2=new B.Color4(1,.93,.97,1);petals.colorDead=new B.Color4(1,.8,.9,0);
  petals.minSize=.028;petals.maxSize=.055;petals.minLifeTime=9;petals.maxLifeTime=14;petals.emitRate=calm?8:30;petals.gravity=V(0,-.22,0);petals.direction1=V(-.35,-.4,-.25);petals.direction2=V(.35,-.1,.3);
  petals.minEmitPower=.1;petals.maxEmitPower=.3;petals.minAngularSpeed=-2.5;petals.maxAngularSpeed=2.5;petals.blendMode=B.ParticleSystem.BLENDMODE_STANDARD;petals.preWarmCycles=300;petals.start();
  const starTex=sprite(scene,'sparkle',star),heartTex=sprite(scene,'heart',heart);
  function burst(at,{count=45,texture=starTex,size=[.012,.04],power=[.25,.8],colors=[[1,.95,.6],[.6,.95,1]],life=[.4,1],gravity=-.6}={}){
    const ps=new B.ParticleSystem('Kira kira',count,scene);ps.particleTexture=texture;ps.layerMask=FX_LAYER;ps.emitter=at.clone();ps.createSphereEmitter(.02);
    ps.color1=new B.Color4(...colors[0],1);ps.color2=new B.Color4(...colors[1],1);ps.colorDead=new B.Color4(1,1,1,0);ps.minSize=size[0];ps.maxSize=size[1];ps.minLifeTime=life[0];ps.maxLifeTime=life[1];
    ps.minEmitPower=power[0];ps.maxEmitPower=power[1];ps.gravity=V(0,gravity,0);ps.minAngularSpeed=-4;ps.maxAngularSpeed=4;ps.blendMode=texture===heartTex?B.ParticleSystem.BLENDMODE_STANDARD:B.ParticleSystem.BLENDMODE_ONEONE;
    ps.emitRate=0;ps.manualEmitCount=count;ps.targetStopDuration=life[1]+.3;ps.disposeOnStop=true;ps.start();
  }
  function impact(strength=1){if(calm)return;fx.flash=Math.max(fx.flash,.28*strength);fx.aberration=Math.max(fx.aberration,1.6*strength);fx.punch=Math.max(fx.punch,strength);}
  // Frame loop: decay impacts, speed lines and dutch angle while travelling, FOV punch-in.
  // Portions in flight from a tray; each gets a sparkle burst when it lands.
  const watch=[];
  let baseFov=camera.fov,punchFov=0;
  scene.onBeforeRenderObservable.add(()=>{
    const dt=Math.min(.05,engine.getDeltaTime()/1000);fx.time+=dt;fx.flash*=Math.exp(-dt*9);fx.aberration=.35+(fx.aberration-.35)*Math.exp(-dt*6);
    const travelling=game.moving&&game.started&&!game.plateView&&!calm;fx.speed+=((travelling?1:0)-fx.speed)*Math.min(1,dt*8);
    fx.tilt+=((travelling?.09*Math.sin(fx.time*2.3):0)-fx.tilt)*Math.min(1,dt*5);camera.upVector.copyFromFloats(Math.sin(fx.tilt),Math.cos(fx.tilt),0);
    if(!game.moving){if(punchFov===0)baseFov=camera.fov;fx.punch*=Math.exp(-dt*7);punchFov=fx.punch>.01?fx.punch*.05:0;camera.fov=baseFov*(1-punchFov);}
    for(const w of watch.splice(0)){if(w.p.animating)watch.push(w);else landed(w);}
  });
  function landed(w){if(w.p.root.isDisposed())return;const at=w.p.root.getAbsolutePosition().add(V(0,.03,0));burst(at);sfx(pick(['キラキラ!!','KIRA KIRA!','✧ SUGOI ✧','ドーン!!']),project(at));chime();impact(.8);}
  // DOM overlays: SFX text, mascot, eyecatch.
  const layer=document.createElement('div');layer.id='anime-fx';stage.append(layer);
  const project=at=>{const p=game.project(at),r=stage.getBoundingClientRect();return {x:p.x-r.x,y:p.y-r.y};};
  function sfx(text,at=null,{size=1,color=pick(['pink','cyan','yellow','violet'])}={}){const r=stage.getBoundingClientRect(),el=document.createElement('span');el.className='sfx '+color;el.textContent=text;const x=at?.x??r.width*(.25+Math.random()*.5),y=at?.y??r.height*(.3+Math.random()*.3);el.style.cssText=`left:${x}px;top:${y}px;--r:${(Math.random()*24-12).toFixed(1)}deg;--s:${size}`;layer.append(el);setTimeout(()=>el.remove(),1500);}
  const mascot=document.createElement('div');mascot.id='mascot';mascot.innerHTML=MASCOT+'<div class="bubble" role="status" aria-live="polite"></div>';stage.append(mascot);
  let sayTimer;function say(text,mood='happy'){const b=mascot.querySelector('.bubble');b.textContent=text;mascot.className='talking '+mood;void mascot.offsetWidth;mascot.classList.add('bounce');clearTimeout(sayTimer);sayTimer=setTimeout(()=>mascot.className='',2800);}
  async function eyecatch(title,subtitle){const el=document.createElement('div');el.className='eyecatch';el.innerHTML=`<div class="burst"></div><div class="panel"><small>${subtitle}</small><b>${title}</b></div>`;stage.append(el);await wait(2300);el.remove();}
  // Sound: pentatonic sparkle chime and a filtered-noise whoosh, through the game's own mix.
  function chime(){const a=game.audio;if(!a||!game.soundOn)return;a.resume();[1318.5,1568,1760,2093,2637].forEach((f,i)=>{const o=a.createOscillator(),g=a.createGain(),t=a.currentTime+i*.055;o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.18,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+.35);o.connect(g);g.connect(game.gain);o.start(t);o.stop(t+.4);});}
  function whoosh(){const a=game.audio;if(!a||!game.soundOn)return;a.resume();const n=a.sampleRate*.4,buf=a.createBuffer(1,n,a.sampleRate),d=buf.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);const s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain(),t=a.currentTime;s.buffer=buf;f.type='bandpass';f.Q.value=1.5;f.frequency.setValueAtTime(350,t);f.frequency.exponentialRampToValueAtTime(2600,t+.35);g.gain.value=.35;s.connect(f);f.connect(g);g.connect(game.gain);s.start(t);}
  // Hooks. Each wrapper calls the original and only adds presentation.
  const wrap=(name,fn)=>{const original=game[name].bind(game);game[name]=(...args)=>fn(original,...args);};
  wrap('add',(original)=>{const before=game.portions.length,food=game.current,result=original();const p=game.portions.at(-1);
    if(!food.dispenser&&game.portions.length>before){watch.push({p});say(pick([`${food.name}!! Sugoi~!`,'Itadakimasu! (≧▽≦)',`Kawaii ${food.name.toLowerCase()} desu ne~ ♡`,'Nice pick, senpai!','Omnomnom~ ✧']));}
    if(game.portions.length>before&&before<9&&game.portions.length>=9)setTimeout(()=>{sfx("IT'S OVER 9000!!",null,{size:1.6,color:'yellow'});impact(1.3);say('Your plate power level... is off the charts!!','shock');},650);
    return result;});
  wrap('pour',async(original)=>{const d=game.dispensers.get(game.station);sfx('GACHAN!!',project(d.lever.getAbsolutePosition()),{color:'cyan'});say('Soft Serve no Jutsu!! ☆','fired');impact(.6);
    let alive=true;(async()=>{await wait(700);if(alive)sfx('ジュワ〜♪',project(d.nozzle),{color:'pink'});while(alive&&game.pouring){burst(d.nozzle.add(V(0,-.02,0)),{count:4,texture:heartTex,size:[.012,.022],power:[.15,.35],gravity:.15,life:[.6,1.1]});await wait(160);}})();
    try{return await original();}finally{alive=false;const p=game.portions.at(-1);if(p?.layer!==undefined){const at=p.root.getAbsolutePosition().add(V(0,.08,0));burst(at,{count:60});burst(at,{count:14,texture:heartTex,size:[.015,.03],gravity:.2});sfx(p.layer?'PURU PURU♡ TOWER!!':'PURU PURU♡',project(at),{color:'pink',size:p.layer?1.3:1});chime();impact(1);}}});
  wrap('navigate',async(original,index)=>{const from=game.station,go=!game.busy&&index>=0&&index<game.foods.length&&index!==from;if(go){whoosh();sfx(pick(['シュッ!','ZOOM!!','いくぞ!','DASH!']),null,{size:.9});}
    const result=await original(index);if(go)say(game.current.dispenser?'Th-the legendary soft serve machine?!':pick([`${game.current.name}, appear!!`,`Next up: ${game.current.name}! ✧`,'Ikuzo~!','Hmm… this one smells amazing']));return result;});
  wrap('togglePlate',async(original)=>{if(!game.busy){sfx(game.plateView?'もどる!':'ジャーン!!',null,{color:'violet'});whoosh();}return original();});
  wrap('remove',(original,portion)=>{const before=game.portions.length,result=original(portion);if(game.portions.length<before){sfx('さよなら…',null,{color:'violet',size:.8});say('Sayonara, little portion… (╥﹏╥)','sad');}return result;});
  wrap('capture',async(original,show=true)=>{if(show&&!game.capturing){sfx('パシャ!!',null,{color:'yellow'});impact(1.2);}return original(show);});
  wrap('review',async(original)=>{const result=await original();if(game.dialog.open)say(game.portions.length?'Is this your final form?!':'An empty plate… how mysterious (・_・;)','shock');return result;});
  wrap('begin',async(original,...args)=>{if(!game.started){eyecatch('THE BUFFET AWAKENS!!','EPISODE 01');setTimeout(()=>say('Yoroshiku! Let\'s build the ultimate plate!! ☆'),2000);}return original(...args);});
  wrap('toast',(original,text)=>original(text+'  '+pick(['(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧','☆⌒(ゝ。∂)','(๑˃ᴗ˂)ﻭ','ヽ(>∀<☆)ノ','(✿◠‿◠)'])));
  wrap('showCompletion',(original)=>{const result=original();if(!calm){canvas.classList.add('freeze');confetti();}const tbc=document.createElement('div');tbc.className='tbc';tbc.innerHTML='<span>To Be Continued</span>';game.dialog.append(tbc);sfx('MISSION COMPLETE!!',null,{size:1.5,color:'yellow'});say('Otsukaresama deshita!! ✧','happy');return result;});
  function confetti(){const c=document.createElement('canvas');c.className='confetti';game.dialog.append(c);const g=c.getContext('2d'),w=c.width=innerWidth,h=c.height=innerHeight,colors=['#ff5fa2','#38d6ff','#ffe45c','#b98cff','#7dffb2'];const bits=Array.from({length:160},()=>({x:Math.random()*w,y:-Math.random()*h,vx:Math.random()*2-1,vy:2+Math.random()*3,r:Math.random()*6,s:4+Math.random()*6,c:pick(colors)}));let frames=0;(function step(){g.clearRect(0,0,w,h);for(const b of bits){b.x+=b.vx;b.y+=b.vy;b.r+=.1;g.save();g.translate(b.x,b.y);g.rotate(b.r);g.fillStyle=b.c;g.fillRect(-b.s/2,-b.s/4,b.s,b.s/2);g.restore();}if(++frames<360)requestAnimationFrame(step);else c.remove();})();}
  // Title flourish.
  document.title='✧ The Common Table ✧ Anime Buffet Arc';
}
