import {buildHall,makePlate,makeSoftServe,stationX} from './world.js';
import {ResearchSession,download} from './research.js';
import {Placement,sampleShape} from './placement.js';
const B=BABYLON,V=(x,y,z)=>new B.Vector3(x,y,z),$=id=>document.getElementById(id);
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let game;

class BuffetGame {
  constructor(research,foods){this.research=research;this.foods=foods;this.portions=[];this.station=0;this.started=false;this.moving=false;this.plateView=false;this.finishing=false;this.finished=research.data.completed;this.selected=null;this.models=new Map();this.shapeCache=new Map();this.placement=new Placement();this.soundOn=research.config.soundEnabled;this.dispensers=new Map();this.dialog=$('dialog');}
  async init(){
    this.canvas=$('scene');this.engine=new B.Engine(this.canvas,true,{preserveDrawingBuffer:true,stencil:true,powerPreference:'high-performance'});this.engine.setHardwareScalingLevel(1/Math.min(window.devicePixelRatio||1,1.5));
    this.scene=new B.Scene(this.engine);this.scene.clearColor=new B.Color4(.82,.86,.87,1);this.scene.environmentTexture=B.CubeTexture.CreateFromPrefilteredData('vendor/environment.env',this.scene);this.scene.environmentIntensity=.55;
    this.scene.imageProcessingConfiguration.toneMappingEnabled=true;this.scene.imageProcessingConfiguration.toneMappingType=B.ImageProcessingConfiguration.TONEMAPPING_ACES;this.scene.imageProcessingConfiguration.exposure=1;this.scene.imageProcessingConfiguration.contrast=1.2;
    this.camera=new B.FreeCamera('Guided participant view',V(0,5.1,-7.5),this.scene);this.camera.minZ=.015;this.camera.maxZ=55;this.camera.fov=.84;this.look=V(0,1,0);this.camera.setTarget(this.look);this.camera.inputs.clear();
    const hemi=new B.HemisphericLight('Daylight',V(0,1,0),this.scene);hemi.intensity=.4;hemi.groundColor=new B.Color3(.24,.23,.2);
    const sun=new B.DirectionalLight('Afternoon sun',V(-.45,-1,.5),this.scene);sun.position=V(3,8,-3);sun.diffuse=new B.Color3(1,.95,.84);sun.intensity=2;
    this.sun=sun;sun.shadowFrustumSize=2.6;sun.autoUpdateExtends=false;sun.shadowMinZ=.1;sun.shadowMaxZ=20;
    this.shadows=new B.ShadowGenerator(2048,sun);this.shadows.usePercentageCloserFiltering=true;this.shadows.filteringQuality=B.ShadowGenerator.QUALITY_MEDIUM;this.shadows.bias=.00001;this.shadows.normalBias=.0001;this.shadows.setDarkness(.2);
    const hall=buildHall(this.scene,this.foods.length);this.rig=new B.TransformNode('Participant plate rig',this.scene);this.rig.position.x=stationX(0);this.plate=makePlate(this.scene);this.plate.parent=this.rig;this.plate.position=V(0,.93,-.59);this.plate.setEnabled(false);
    const post=new B.FxaaPostProcess('Antialiasing',1,this.camera);
    this.engine.runRenderLoop(()=>this.scene.render());window.addEventListener('resize',()=>{this.engine.resize();this.fitCamera();});
    for(let i=0;i<this.foods.length;i++){
      const f=this.foods[i];$('loading-text').textContent=`Preparing ${f.name.toLowerCase()} · ${i+1} of ${this.foods.length}`;
      if(f.dispenser){this.swirl??=makeSoftServe(this.scene);this.dispensers.set(i,hall.dispenser(stationX(i),i,f.name));continue;}
      const model=await B.LoadAssetContainerAsync(`assets/food/${f.id}.glb`,this.scene);this.models.set(f.id,model);
      const station=new B.TransformNode(f.name+' station',this.scene);station.position=V(stationX(i),.946,0);
      for(let k=0;k<(f.id==='pizza'?4:6);k++){const root=this.spawn(f.id);root.parent=station;root.position=V((k%3-1)*.139,0,(Math.floor(k/3)-.5)*.17);root.rotation.y=k%2?.2:-.15;for(const mesh of root.getChildMeshes())mesh.metadata={station:i};}
      const hit=B.MeshBuilder.CreateBox('Dish target',{width:.52,height:.09,depth:.43},this.scene);hit.parent=station;hit.position.y=.025;hit.visibility=0;hit.isPickable=true;hit.metadata={station:i};
      hall.label(f.name,[stationX(i),.946,-.348],.221,.075,true);
    }
    for(const record of this.research.data.portions){const f=this.foods.find(f=>f.id===record.foodId);if(!f)throw new Error('A saved dish is missing from this study menu.');this.createPortion(f,record,false);}
    this.bind();this.fitCamera();await this.scene.whenReadyAsync();$('loading').hidden=true;
    if(this.finished){this.started=true;this.plate.setEnabled(true);await this.moveView(true,false);this.showCompletion();}else if(this.debugStation()!==null)this.begin(this.debugStation());else this.welcome();this.refresh();
    // Read-only diagnostics for repeatable canvas and placement checks.
    Object.defineProperty(window,'buffet',{value:{snapshot:()=>({station:this.station,started:this.started,moving:this.moving,pouring:!!this.pouring,plateView:this.plateView,finished:this.finished,selected:this.selected?.portionId,session:structuredClone(this.research.data),saved:this.research.saved,saveError:this.research.error,engine:'Babylon.js '+B.Engine.Version,meshes:this.scene.meshes.length,fps:this.engine.getFps(),portions:this.portions.map(p=>({id:p.portionId,food:p.foodId,x:p.x,y:p.y,z:p.z,extent:Math.max(...p.shape.map(s=>Math.hypot(p.x+s.ix*.003,p.z+s.iz*.003)))}))}),point:(name,index=0)=>this.project(name==='dish'?V(stationX(this.station),.97,0):name==='portion'&&this.portions[index]?this.portions[index].root.getAbsolutePosition().add(V(0,.025,0)):this.plate.getAbsolutePosition().add(V(0,.02,0)))}});
  }
  spawn(id){const root=new B.TransformNode(id+' portion',this.scene);if(this.foods.find(f=>f.id===id)?.dispenser){const swirl=this.swirl.clone(id+' swirl');swirl.setEnabled(true);swirl.parent=root;swirl.isPickable=true;swirl.receiveShadows=true;this.shadows.addShadowCaster(swirl);return root;}const instance=this.models.get(id).instantiateModelsToScene(n=>n+' copy',false,{doNotInstantiate:true});for(const node of instance.rootNodes)node.parent=root;for(const mesh of root.getChildMeshes()){mesh.isPickable=true;mesh.receiveShadows=true;this.shadows.addShadowCaster(mesh);}return root;}
  project(point){const rect=this.canvas.getBoundingClientRect(),p=B.Vector3.Project(point,B.Matrix.Identity(),this.scene.getTransformMatrix(),this.camera.viewport.toGlobal(this.engine.getRenderWidth(),this.engine.getRenderHeight()));return {x:rect.x+p.x/this.engine.getRenderWidth()*rect.width,y:rect.y+p.y/this.engine.getRenderHeight()*rect.height};}
  fitCamera(){const aspect=this.canvas.clientWidth/this.canvas.clientHeight;this.camera.fov=2*Math.atan(Math.tan(.42)*Math.max(1,.85/aspect));if(!this.started){this.camera.position=V(0,1,0).add(V(0,4.1,-7.5).scale(Math.max(1,1.5/Math.max(.85,aspect))));this.camera.setTarget(V(0,1,0));}else if(this.plateView&&!this.moving){const pose=this.platePose(this.camera.fov,aspect);this.camera.position=pose.target;this.look=pose.look;this.camera.setTarget(this.look);}}
  get current(){return this.foods[this.station];}
  get busy(){return this.moving||this.pouring||this.finished||this.finishing||this.capturing||!this.started||this.dialog.open;}
  get mealHeight(){return Math.max(.03,...this.portions.map(p=>p.y+Math.max(...p.shape.map(s=>s.high))));}
  platePose(fov,aspect,x=this.rig.position.x){
    const height=this.mealHeight,center=V(x,.93+height*.5,-.59);
    const halfFov=Math.atan(Math.tan(fov/2)*Math.min(1,aspect));
    const radius=Math.hypot(.145,height*.5),distance=Math.max(.54,radius/Math.sin(halfFov)*1.12);
    return {target:center.add(V(0,1,-.34).normalize().scale(distance)),look:center};
  }
  async moveView(plate=false,animate=true){
    if(this.moving)return;this.moving=true;this.plateView=plate;this.refresh();
    if(plate){clearTimeout(this.toastTimer);$('toast').classList.remove('visible');}
    const x=stationX(this.station),rigTo=V(x,0,0),from=this.camera.position.clone(),fromLook=this.look.clone(),fromRig=this.rig.position.clone();
    const pose=this.platePose(this.camera.fov,this.canvas.clientWidth/this.canvas.clientHeight,x);
    const lift=this.current.dispenser?1:0,target=plate?pose.target:V(x,1.62+lift*.05,-1.24-lift*.12),look=plate?pose.look:V(x,.95+lift*.2,-.28+lift*.06);
    const duration=animate?(plate?500:800):0,start=performance.now();
    await new Promise(resolve=>{const frame=()=>{const t=duration?Math.min(1,(performance.now()-start)/duration):1,s=t*t*(3-2*t);this.camera.position=B.Vector3.Lerp(from,target,s);this.look=B.Vector3.Lerp(fromLook,look,s);this.camera.setTarget(this.look);this.rig.position=B.Vector3.Lerp(fromRig,rigTo,s);if(t<1)requestAnimationFrame(frame);else resolve();};frame();});
    this.sun.position=V(x+2.25,5,-2.5);this.moving=false;this.fitCamera();this.refresh();
  }
  // Debug shortcut: ?debug&station=soft_serve (food id or 1-based number) skips the welcome and overview.
  debugStation(){const q=new URLSearchParams(location.search);if(!q.has('debug'))return null;const s=q.get('station')??'',i=this.foods.findIndex(f=>f.id===s);return i>=0?i:Math.max(0,Math.min(this.foods.length-1,(parseInt(s,10)||1)-1));}
  async begin(jump=null){if(this.started)return;this.close();this.started=true;this.moving=true;this.overview=true;this.research.record('begin');this.initAudio();this.refresh();await wait(jump===null?this.research.config.introSeconds*1000:0);if(jump!==null)this.station=jump;this.overview=false;this.moving=false;this.plate.setEnabled(true);this.research.record('station_view',this.current.id);await this.moveView();}
  async navigate(index){if(this.busy||index<0||index>=this.foods.length)return;this.selected=null;this.station=index;this.research.record('station_view',this.current.id);this.tone(510,.055);await this.moveView(false);}
  shapeFor(id,root,angle){const key=id+':'+angle;if(!this.shapeCache.has(key))this.shapeCache.set(key,sampleShape(root,angle));return this.shapeCache.get(key);}
  createPortion(food,record=null,animate=true){
    const root=this.spawn(food.id);root.parent=this.plate;const angle=record?.rotation??((this.portions.length*137.5)%360)*Math.PI/180;const shape=this.shapeFor(food.id,root,angle);root.rotation.y=angle;
    const pose=record?.position||this.placement.fit(shape),p={portionId:record?.portionId||crypto.randomUUID().replaceAll('-',''),foodId:food.id,addedAt:record?.addedAt??this.research.elapsed,root,angle,shape,...pose};
    root.position.copyFromFloats(p.x,p.y,p.z);for(const mesh of root.getChildMeshes())mesh.metadata={portion:p.portionId};this.portions.push(p);this.placement.occupy(p);
    if(animate){p.animating=true;const from=V(0,.075,.4),to=root.position.clone(),start=performance.now();const frame=()=>{if(root.isDisposed()||!p.animating)return;const t=Math.min(1,(performance.now()-start)/430),s=t*t*(3-2*t);root.position=B.Vector3.Lerp(from,to,s);root.position.y+=Math.sin(t*Math.PI)*.045;if(t<1)requestAnimationFrame(frame);else p.animating=false;};frame();}
    return p;
  }
  add(){if(this.busy)return;if(this.portions.length>=this.research.config.maxPortions){this.toast('This plate has reached the study’s portion limit.');this.settleLever();return;}if(this.current.dispenser)return this.pour();const p=this.createPortion(this.current);this.research.setPortions(this.portions);this.research.record('portion_added',p.foodId,p.portionId);this.tone(920,.13);this.toast(this.current.name+' added · '+this.count(this.current.id)+' on your plate');this.refresh();}
  tween(ms,fn){return new Promise(resolve=>{const start=performance.now(),frame=()=>{const t=ms?Math.min(1,(performance.now()-start)/ms):1;fn(t*t*(3-2*t),t);if(t<1)requestAnimationFrame(frame);else resolve();};frame();});}
  settleLever(){const lever=this.dispensers.get(this.station)?.lever;if(lever?.rotation.x){const from=lever.rotation.x;this.tween(180,s=>lever.rotation.x=from*(1-s));}}
  // Slide the plate under the nozzle, pull the lever and pipe a swirl straight onto the chosen spot.
  async pour(){
    const food=this.current,d=this.dispensers.get(this.station),home=V(stationX(this.station),0,0);this.pouring=true;this.refresh();
    try{
      const p=this.createPortion(food,null,false),swirl=p.root.getChildMeshes()[0],height=swirl.getBoundingInfo().maximum.y;swirl.scaling.setAll(1e-4);
      this.research.setPortions(this.portions);this.research.record('portion_added',p.foodId,p.portionId);
      const under=V(d.nozzle.x-p.x,0,d.nozzle.z+.59-p.z),lever=d.lever,pulled=-1.05,from=lever.rotation.x;
      await this.tween(320,s=>this.rig.position=B.Vector3.Lerp(home,under,s));
      await this.tween(170,s=>lever.rotation.x=from+(pulled-from)*s);this.tone(640,.09);
      const drop=d.nozzle.y-this.plate.getAbsolutePosition().y,stream=B.MeshBuilder.CreateCylinder('Soft serve stream',{height:1,diameter:.02,tessellation:12},this.scene);stream.material=swirl.material;stream.parent=this.plate;stream.isPickable=false;
      await this.tween(1150,(_,t)=>{const grow=Math.min(1,t*1.08),top=p.y+height*grow,length=Math.max(.001,drop-top);swirl.scaling.copyFromFloats(.6+.4*Math.min(1,grow*1.7),grow,.6+.4*Math.min(1,grow*1.7));swirl.rotation.y=(1-grow)**2*Math.PI*3;stream.scaling.y=t<.93?length:length*(1-(t-.93)/.07);stream.position.copyFromFloats(p.x,drop-stream.scaling.y/2,p.z);});
      stream.dispose();swirl.scaling.setAll(1);swirl.rotation.y=0;
      await this.tween(180,s=>lever.rotation.x=pulled*(1-s));
      await this.tween(320,s=>this.rig.position=B.Vector3.Lerp(under,home,s));
      this.tone(920,.13);this.toast(food.name+' added · '+this.count(food.id)+' on your plate');
    }finally{this.rig.position=home;this.pouring=false;this.refresh();}
  }
  count(id){return this.portions.filter(p=>p.foodId===id).length;}
  repack(exclude=null){this.placement.reset();for(const p of this.portions.filter(p=>p!==exclude).sort((a,b)=>a.y-b.y)){p.animating=false;p.y=this.placement.heightAt(p.shape,p.x,p.z);p.root.position.copyFromFloats(p.x,p.y,p.z);this.placement.occupy(p);}}
  remove(portion){if(this.busy||!this.research.config.allowRemoval||!portion)return;this.portions.splice(this.portions.indexOf(portion),1);portion.root.dispose();this.selected=null;this.repack();this.research.setPortions(this.portions);this.research.record('portion_removed',portion.foodId,portion.portionId);this.refresh();}
  async togglePlate(){if(this.busy)return;this.selected=null;this.research.record(this.plateView?'dish_view':'plate_view',this.current.id);await this.moveView(!this.plateView);}
  toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2700);}
  refresh(){
    const active=this.started&&!this.finished&&!this.overview;for(const id of ['dish','plate-summary'])$(id).hidden=!active;
    $('food-name').textContent=this.current.name;$('category').textContent=`${this.current.category} / ${String(this.station+1).padStart(2,'0')}`;$('description').textContent=this.current.description;$('portion').textContent=this.current.portionLabel+' per selection';$('dish-count').textContent=this.count(this.current.id)+' of this dish on your plate';
    $('total').textContent=this.portions.length+' portion'+(this.portions.length===1?'':'s');$('view').textContent=this.plateView?'Return to dish':'View plate';$('sound').textContent=this.soundOn?'Sound on':'Sound off';$('sound').disabled=!this.research.config.soundEnabled;
    $('previous').textContent=this.station?`‹ ${this.foods[this.station-1].name}`:'Start of the buffet';$('next').textContent=this.station<this.foods.length-1?`${this.foods[this.station+1].name} ›`:'End of the buffet';
    $('previous').disabled=this.busy||this.station===0;$('next').disabled=this.busy||this.station===this.foods.length-1;$('add').disabled=this.busy||this.plateView;$('add').textContent=this.current.dispenser?'Pull the lever +':'Add one portion +';$('view').disabled=this.moving||this.finishing||this.capturing;$('review').disabled=this.moving||this.finishing||this.capturing;
    $('undo').hidden=!this.research.config.allowRemoval;$('undo').disabled=this.busy||!this.portions.length;$('photo').hidden=!this.research.config.screenshotsEnabled;$('photo').disabled=this.busy||this.capturing;
    $('plate-tools').hidden=!this.plateView||this.finished||this.finishing;$('remove').hidden=!this.selected||!this.research.config.allowRemoval;$('selected-name').textContent=this.selected?this.foods.find(f=>f.id===this.selected.foodId).name:'Select a portion to move or remove it.';
    $('progress-label').textContent=this.started?`${String(this.station+1).padStart(2,'0')} / ${this.foods.length} · CHOOSE AT YOUR OWN PACE`:'';$('progress').firstElementChild.style.width=this.started?`${(this.station+1)/this.foods.length*100}%`:'0';
  }
  modal(title,body,actions,locked=false){this.previousFocus=document.activeElement;$('dialog-title').textContent=title;$('dialog-body').innerHTML=body;$('dialog-actions').replaceChildren();$('close-dialog').hidden=locked;this.locked=locked;for(const [text,fn,primary] of actions){const b=document.createElement('button');b.textContent=text;if(primary)b.className='primary';b.onclick=fn;$('dialog-actions').append(b);}if(!this.dialog.open)this.dialog.showModal();this.refresh();}
  close(){this.dialog.close();this.refresh();this.previousFocus?.focus();}
  welcome(){this.modal(this.research.config.studyTitle,`<p>Build a plate as you would in a cafeteria.<br>Take your time and choose what you would like.</p><div class="steps"><div><b>01 &nbsp; Browse</b><p>Move left or right along the buffet.</p></div><div><b>02 &nbsp; Serve</b><p>Tap a dish or drag it onto your plate.</p></div><div><b>03 &nbsp; Review</b><p>Check your plate, then finish your meal.</p></div></div><p class="study-instructions">${escapeHTML(this.research.config.instructions)}</p>${this.research.localOnly?'<p>Your meal and photographs are saved only in this browser. Download a copy to keep them.</p>':''}`,[[this.portions.length?'Continue your plate →':'Explore the buffet →',()=>this.begin(),true]],true);}
  help(){if(this.moving||this.finishing)return;this.modal('Make yourself a plate',`<p>Use the arrows to explore the dishes. Click the current dish or <b>Add one portion</b> to serve it. You can also drag from its tray onto your plate.</p><p>Open <b>View plate</b> to select and rearrange individual portions.${this.research.config.allowRemoval?' Use Undo last or select a portion to remove it.':''}</p><p>When you are ready, choose <b>Review meal</b> and confirm. ${this.research.config.screenshotsEnabled?'Photograph saves an image of your plate.':''}</p><p>${this.foods.some(f=>f.dispenser)?'At the soft-serve machine, pull the lever and the swirl goes straight onto your plate.':''}</p><p>Keyboard: ← / → to browse · Space to serve · P to view your plate.</p>`,[['Back to the buffet',()=>this.close(),true]]);}
  menu(){if(this.moving||this.finishing)return;this.modal('Today’s buffet',`<div class="menu-grid">${this.foods.map((f,i)=>`<button data-station="${i}"><img loading="lazy" src="assets/previews/${f.id}.png" alt="${escapeHTML(f.name)}">${escapeHTML(f.name)}<br><small>${this.count(f.id)} on your plate</small></button>`).join('')}</div>`,[['Back',()=>this.close()]]);for(const button of $('dialog-body').querySelectorAll('button'))button.onclick=()=>{if(!this.started||this.finished){this.close();return;}const i=Number(button.dataset.station);this.close();this.navigate(i);};}
  details(){if(this.moving)return;this.research.record('dish_information',this.current.id);this.modal(this.current.name,`<p>${escapeHTML(this.current.description)}</p><p><b>One selection:</b> ${escapeHTML(this.current.portionLabel)}</p><p>${escapeHTML(this.current.ingredients)}</p>`,[['Back to dish',()=>this.close(),true]]);}
  mealHTML(){return this.portions.length?this.foods.filter(f=>this.count(f.id)).map(f=>`<div class="meal-row"><span>${escapeHTML(f.name)}</span><span>${this.count(f.id)}</span></div>`).join(''):'<p>Your plate is empty. You can return to the buffet or finish without selecting any food.</p>';}
  async review(){if(this.busy)return;if(!this.plateView)await this.moveView(true);this.research.record('review');this.modal('Your meal, your choice',this.mealHTML()+`<p>${this.portions.length} portions selected. Ready to finish?</p>`,[['Keep exploring',()=>this.close()],['Finish meal',()=>this.finish(),true]]);}
  async capture(show=true){if(this.capturing||!this.research.config.screenshotsEnabled)return;this.capturing=true;this.refresh();let camera;
    try{const pose=this.platePose(.68,1);camera=new B.FreeCamera('Plate photograph',pose.target,this.scene);camera.minZ=.01;camera.fov=.68;camera.setTarget(pose.look);await this.scene.whenReadyAsync();const data=await B.Tools.CreateScreenshotUsingRenderTargetAsync(this.engine,camera,{width:1024,height:1024},'image/png',1,true);await this.research.queueScreenshot(data);if(show){this.modal('Your plate photograph',`<img class="screenshot-preview" alt="Photograph of your selected meal" src="${data}"><p>The image is linked to this session.</p>`,[['Back',()=>this.close()],['Download PNG',async()=>download(await(await fetch(data)).blob(),'my-buffet-plate.png'),true]]);}return data;}
    finally{camera?.dispose();this.capturing=false;this.refresh();}
  }
  async finish(){if(this.finishing||this.finished||this.moving)return;this.finishing=true;this.close();this.refresh();this.modal('Saving your meal','<p>Please keep this page open while your plate is saved.</p>',[],true);try{await wait(450);if(this.research.config.screenshotsEnabled)await this.capture(false);this.research.setPortions(this.portions);this.research.complete();this.finished=true;this.finishing=false;this.showCompletion();}catch(error){this.finishing=false;this.modal('Your meal is still here',`<p>We could not finish saving the plate photograph. ${escapeHTML(error.message)}</p>`,[['Return to review',()=>{this.close();this.review();}],['Try again',()=>this.finish(),true]]);}}
  showCompletion(){const actions=[['Download your choices',()=>download(JSON.stringify(this.research.data,null,2),`buffet-${this.research.data.sessionId}.json`)]];if(this.research.localOnly){actions.push(['Download meal and photographs',()=>this.research.recovery()],['Start a new meal',()=>{const url=new URL(location.href);url.searchParams.delete('sessionId');url.searchParams.set('SESSION_ID',crypto.randomUUID());location.assign(url.href);},true]);}else actions.push(['Retry saving',()=>this.research.flush()]);this.modal('Thank you for choosing a meal',this.mealHTML()+`<p id="completion-state">${escapeHTML($('save-state').textContent)}</p><p>${this.research.localOnly?'Your meal is saved only in this browser. Download it to keep a copy; it has not been sent to a researcher.':this.research.parentOrigin?'Once your survey receives your choices, use its Next button to continue.':'Your choices are recorded for this dining session.'}</p><small>Session ${escapeHTML(this.research.data.sessionId)}</small>`,actions,true);}
  initAudio(){if(!this.research.config.soundEnabled||this.audio)return;this.audio=new AudioContext();this.gain=this.audio.createGain();this.gain.gain.value=this.soundOn?.12:0;this.gain.connect(this.audio.destination);const n=this.audio.sampleRate*6,buffer=this.audio.createBuffer(1,n,this.audio.sampleRate),data=buffer.getChannelData(0);let last=0;for(let i=0;i<n;i++){last+=(Math.random()*2-1-last)*.025;data[i]=last*.045;}const source=this.audio.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(this.gain);source.start();}
  tone(freq,seconds){if(!this.audio||!this.soundOn)return;this.audio.resume();const o=this.audio.createOscillator(),g=this.audio.createGain(),now=this.audio.currentTime;o.frequency.value=freq;g.gain.setValueAtTime(.3,now);g.gain.exponentialRampToValueAtTime(.001,now+seconds);o.connect(g);g.connect(this.gain);o.start();o.stop(now+seconds);}
  pointerPoint(event){const rect=this.canvas.getBoundingClientRect();return {x:event.clientX-rect.left,y:event.clientY-rect.top};}
  pick(event){const p=this.pointerPoint(event);return this.scene.pick(p.x,p.y,m=>m.isPickable&&!!m.metadata);}
  planePoint(event){const p=this.pointerPoint(event),ray=this.scene.createPickingRay(p.x,p.y,B.Matrix.Identity(),this.camera),distance=ray.intersectsPlane(B.Plane.FromPositionAndNormal(this.plate.getAbsolutePosition().add(V(0,.01,0)),B.Axis.Y));return distance===null?null:ray.origin.add(ray.direction.scale(distance)).subtract(this.plate.getAbsolutePosition());}
  bind(){
    $('previous').onclick=()=>this.navigate(this.station-1);$('next').onclick=()=>this.navigate(this.station+1);$('add').onclick=()=>this.add();$('view').onclick=()=>this.togglePlate();$('undo').onclick=()=>this.remove(this.portions.at(-1));$('remove').onclick=()=>this.remove(this.selected);$('photo').onclick=()=>this.capture().catch(e=>this.toast(e.message));$('review').onclick=()=>this.review();$('menu').onclick=()=>this.menu();$('help').onclick=()=>this.help();$('details').onclick=()=>this.details();$('recovery').onclick=()=>this.research.recovery();$('close-dialog').onclick=()=>this.close();
    this.dialog.addEventListener('cancel',event=>{if(this.locked)event.preventDefault();});this.dialog.addEventListener('close',()=>this.refresh());
    $('sound').onclick=()=>{if(!this.research.config.soundEnabled)return;this.initAudio();this.soundOn=!this.soundOn;this.gain.gain.value=this.soundOn?.12:0;this.research.record(this.soundOn?'sound_unmuted':'sound_muted');this.refresh();};
    $('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{this.toast('Full screen is not available in this browser.');}};
    window.addEventListener('keydown',e=>{if(this.busy||e.repeat||e.altKey||e.ctrlKey||e.metaKey||e.target.matches('input,textarea,select')||(e.key===' '&&e.target.closest('button')))return;switch(e.key){case'ArrowLeft':e.preventDefault();this.navigate(this.station-1);break;case'ArrowRight':e.preventDefault();this.navigate(this.station+1);break;case' ':e.preventDefault();if(!this.plateView)this.add();break;case'p':case'P':this.togglePlate();break;}});
    this.canvas.addEventListener('pointerdown',event=>{if(this.busy||event.button!==0)return;const hit=this.pick(event),meta=hit?.pickedMesh?.metadata;this.press={id:event.pointerId,x:event.clientX,y:event.clientY,meta,drag:false};if(this.plateView&&meta?.portion){this.selected=this.portions.find(p=>p.portionId===meta.portion);this.refresh();}this.canvas.setPointerCapture(event.pointerId);});
    this.canvas.addEventListener('pointermove',event=>{if(!this.press||this.press.id!==event.pointerId)return;if(Math.hypot(event.clientX-this.press.x,event.clientY-this.press.y)>9)this.press.drag=true;if(this.press.drag&&this.press.meta?.station===this.station)this.canvas.style.cursor='grabbing';const lever=this.press.meta?.station===this.station&&!this.plateView&&!this.busy&&this.dispensers.get(this.station)?.lever;if(lever)lever.rotation.x=-Math.min(1,Math.max(0,event.clientY-this.press.y)/110)*1.05;});
    this.canvas.addEventListener('pointerup',event=>{const press=this.press;this.press=null;this.canvas.style.cursor='';if(!press||press.id!==event.pointerId||this.busy)return;const point=this.planePoint(event),onPlate=point&&Math.hypot(point.x,point.z)<.145;
      if(press.meta?.station===this.station&&!this.plateView){if(this.current.dispenser)this.add();else if(press.drag?onPlate:this.pick(event)?.pickedMesh?.metadata?.station===this.station)this.add();}
      else if(press.meta?.portion&&this.plateView&&press.drag&&onPlate){const p=this.portions.find(p=>p.portionId===press.meta.portion);p.animating=false;this.repack(p);Object.assign(p,this.placement.fit(p.shape,point));p.root.position.copyFromFloats(p.x,p.y,p.z);this.placement.occupy(p);this.research.setPortions(this.portions);this.research.record('portion_moved',p.foodId,p.portionId);this.fitCamera();this.refresh();}
    });this.canvas.addEventListener('pointercancel',()=>{this.press=null;this.canvas.style.cursor='';if(!this.pouring)this.settleLever();});
  }
}

try{
  const research=await ResearchSession.open(text=>{$('save-state').textContent=text;if($('completion-state'))$('completion-state').textContent=text;});
  const {foods:all}=await(await fetch('assets/menu.json')).json();const foods=research.config.foodOrder.length?research.config.foodOrder.map(id=>all.find(f=>f.id===id)):all;if(foods.some(f=>!f)||!foods.length)throw new Error('This study menu contains an unknown food.');
  game=new BuffetGame(research,foods);await game.init();
}catch(error){console.error(error);$('loading').hidden=false;$('loading').innerHTML=`<h1>We couldn’t set the table</h1><p>${escapeHTML(error.message)}</p><button class="primary" onclick="location.reload()">Try again</button>`;}
