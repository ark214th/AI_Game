import * as T from './vendor/three.module.min.js';
import {rng,PICKUPS} from './core.mjs?v=4';
const LANE=2.3;
const lerp=T.MathUtils.lerp;
export class World {
  constructor(canvas,renderer=null){
    this.canvas=canvas;this.clock=0;this.travel=0;this.shake=0;this.kick=0;this.objectViews=new Map();this.pool={};this.particles=[];this.effects=[];this.lastTravel=0;this.effectTick=0;this.reaction={hit:0,land:0,near:0,collect:0,surge:0,slide:0,death:0,ending:false,side:1,gap:false};this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.renderer=renderer||new T.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
    this.renderer.setClearColor(0x000000,0);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.22;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.shadowMap.autoUpdate=true;
    this.scene=new T.Scene();this.scene.fog=new T.FogExp2(0x32534e,.021);
    this.camera=new T.PerspectiveCamera(59,1,.1,190);this.camera.position.set(0,4.7,9.2);
    this.scene.add(new T.HemisphereLight(0xffe6b2,0x173e3e,2.1));
    this.sun=new T.DirectionalLight(0xffd8a0,3.1);this.sun.position.set(-12,22,-30);this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);Object.assign(this.sun.shadow.camera,{left:-14,right:14,top:22,bottom:-15,near:.5,far:80});this.sun.shadow.camera.updateProjectionMatrix();this.sun.shadow.bias=-.0006;this.sun.shadow.normalBias=.06;this.sun.target.position.set(0,0,-12);this.scene.add(this.sun,this.sun.target);
    const fill=new T.DirectionalLight(0x70dccc,1.2);fill.position.set(5,6,8);this.scene.add(fill);
    this.runnerLight=new T.PointLight(0x99ffe0,5,7,2);this.runnerLight.position.set(0,2,1);this.scene.add(this.runnerLight);
    this.geos={box:new T.BoxGeometry(1,1,1),cyl:new T.CylinderGeometry(1,1,1,10),sphere:new T.SphereGeometry(1,14,10),gem:new T.OctahedronGeometry(.25),ring:new T.TorusGeometry(1,.05,5,40)};
    const stone=this.stoneTexture();
    this.mat={
      floor:new T.MeshStandardMaterial({color:0x9caa90,map:stone,roughness:.92}),stone:new T.MeshStandardMaterial({color:0xc0b993,map:stone,roughness:.86}),dark:new T.MeshStandardMaterial({color:0x354e43,map:stone,roughness:.9}),gold:new T.MeshStandardMaterial({color:0xcb9d51,metalness:.65,roughness:.34}),trim:new T.MeshStandardMaterial({color:0xffd797,metalness:.4,roughness:.33,emissive:0xb37725,emissiveIntensity:.35}),cyan:new T.MeshStandardMaterial({color:0x8affdf,emissive:0x40e4bd,emissiveIntensity:1.6,roughness:.3}),gem:new T.MeshStandardMaterial({color:0xffdb81,emissive:0xe6a12c,emissiveIntensity:1.1,metalness:.45,roughness:.18}),green:new T.MeshStandardMaterial({color:0x254f3a,roughness:1}),bark:new T.MeshStandardMaterial({color:0x403c27,roughness:1}),cloth:new T.MeshStandardMaterial({color:0x294f56,roughness:.9}),scarf:new T.MeshStandardMaterial({color:0xd46b37,side:T.DoubleSide,roughness:.93}),leather:new T.MeshStandardMaterial({color:0x3c3028,roughness:.9}),skin:new T.MeshStandardMaterial({color:0xc49a72,roughness:.9}),boot:new T.MeshStandardMaterial({color:0x202d2c,roughness:.9}),abyss:new T.MeshBasicMaterial({color:0x061d25}),water:new T.MeshPhysicalMaterial({color:0x3eacb1,transparent:true,opacity:.5,roughness:.15,metalness:.3})
    };
    this.glowTexture=this.makeGlow();
    this.buildRoad();this.buildScenery();this.buildRunner();this.buildMotes();
    this.resize();
  }
  stoneTexture(){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');const r=rng(2808);x.fillStyle='#9b9b86';x.fillRect(0,0,256,256);for(let i=0;i<6500;i++){const a=r(),g=Math.floor(110+r()*90);x.fillStyle=`rgba(${g},${g},${g-12},${.15+r()*.2})`;x.fillRect(r()*256,r()*256,a<.8?1:5,a<.8?1:3);}x.strokeStyle='#434b4170';x.lineWidth=3;x.strokeRect(3,3,250,250);x.strokeStyle='#c4c0a475';x.lineWidth=1;x.strokeRect(6,6,244,244);for(let i=0;i<7;i++){x.beginPath();let px=r()*256,py=r()*256;x.moveTo(px,py);for(let j=0;j<5;j++){px+=r()*20-10;py+=r()*13;x.lineTo(px,py);}x.strokeStyle='#4a534633';x.stroke();}const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());return texture;}
  makeGlow(){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.12,'rgba(255,255,255,.65)');g.addColorStop(.4,'rgba(255,255,255,.15)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new T.CanvasTexture(c);}
  mesh(geo,mat,parent,pos=[0,0,0],scale=[1,1,1]){const m=new T.Mesh(this.geos[geo]||geo,this.mat[mat]||mat);m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  glow(parent,color,size,pos){const mat=new T.SpriteMaterial({map:this.glowTexture,color,transparent:true,blending:T.AdditiveBlending,depthWrite:false,opacity:.65});const s=new T.Sprite(mat);s.scale.set(size,size,1);s.position.set(...pos);parent.add(s);return s;}
  buildRoad(){
    this.road=new T.InstancedMesh(this.geos.box,this.mat.floor,126);this.road.instanceMatrix.setUsage(T.DynamicDrawUsage);this.road.receiveShadow=true;this.road.frustumCulled=false;this.scene.add(this.road);
    this.edges=new T.InstancedMesh(this.geos.box,this.mat.stone,84);this.edges.instanceMatrix.setUsage(T.DynamicDrawUsage);this.edges.receiveShadow=true;this.edges.frustumCulled=false;this.scene.add(this.edges);
    this.inlays=new T.InstancedMesh(this.geos.box,this.mat.gold,84);this.inlays.instanceMatrix.setUsage(T.DynamicDrawUsage);this.inlays.frustumCulled=false;this.scene.add(this.inlays);
    this.riskPath=new T.InstancedMesh(this.geos.box,new T.MeshBasicMaterial({color:0xffcc6e,transparent:true,opacity:.48,depthWrite:false}),128);this.riskPath.instanceMatrix.setUsage(T.DynamicDrawUsage);this.riskPath.frustumCulled=false;this.riskPath.count=0;this.scene.add(this.riskPath);this.dummy=new T.Object3D();this.mat4=new T.Matrix4();
    this.water=this.mesh('box','water',this.scene,[0,-3,-60],[180,.08,180]);this.water.castShadow=false;
  }
  pillar(){const g=new T.Group();this.mesh('box','dark',g,[0,.25,0],[1.55,.5,1.5]);this.mesh('box','stone',g,[0,.65,0],[1.22,.26,1.18]);this.mesh('cyl','stone',g,[0,2.65,0],[.48,3.8,.48]);this.mesh('cyl','gold',g,[0,1.03,0],[.55,.13,.55]);this.mesh('cyl','gold',g,[0,4.38,0],[.55,.14,.55]);this.mesh('box','stone',g,[0,4.6,0],[1.25,.28,1.25]);this.mesh('box','dark',g,[0,4.87,0],[1.42,.22,1.42]);const cap=this.mesh('sphere','green',g,[.15,5.1,0],[.87,.24,.85]);cap.rotation.z=.12;return g;}
  buildScenery(){
    const r=rng(720);this.pillars=[];
    for(let i=0;i<14;i++){const g=this.pillar();const side=i%2?-1:1;g.userData={side,index:Math.floor(i/2),broken:i%5===0};if(g.userData.broken)g.scale.y=.58;this.scene.add(g);this.pillars.push(g);}
    this.arches=[];for(let i=0;i<4;i++){const g=new T.Group();for(const x of [-4.85,4.85]){this.mesh('box','stone',g,[x,3.5,0],[1.1,7,1.2]);this.mesh('box','gold',g,[x,5.3,0],[1.25,.18,1.35]);}this.mesh('box','stone',g,[0,7,0],[11.1,.7,1.5]);this.mesh('box','gold',g,[0,7.43,0],[11.5,.12,1.6]);const tor=this.mesh('ring','trim',g,[0,6.9,.78],[.55,.55,.55]);const glyph=this.mesh('gem','cyan',g,[0,6.9,.8],[1.4,1.4,1.4]);this.glow(g,0xdcc58a,2,[0,6.9,.9]);this.scene.add(g);this.arches.push(g);}
    this.rocks=[];const geo=new T.IcosahedronGeometry(1,1);
    for(let i=0;i<26;i++){const g=new T.Group();const scale=2+r()*4;this.mesh(geo,'dark',g,[0,-2,0],[scale,6+r()*9,scale]);this.mesh(geo,'green',g,[0,3,0],[scale*1.02,2,scale]);if(i%2===0){const tree=this.mesh('cyl','bark',g,[0,7,0],[.16,7,.2]);tree.rotation.z=(r()-.5)*.2;for(let j=0;j<3;j++){const leaf=this.mesh(geo,'green',g,[r()*3-1.5,10+j*.6,r()*3-1.5],[3.4,1.5,2.9]);leaf.rotation.z=r();}}g.userData={side:i%2?-1:1,index:Math.floor(i/2),offset:8+r()*17};this.scene.add(g);this.rocks.push(g);}
    this.torches=[];for(let i=0;i<12;i++){const g=new T.Group();this.mesh('box','dark',g,[0,.7,0],[.55,1.4,.55]);this.mesh('cyl','gold',g,[0,1.5,0],[.43,.18,.43]);const flame=this.mesh('gem','cyan',g,[0,1.88,0],[.6,1.2,.6]);this.glow(g,0x77ffe0,2.1,[0,1.9,0]);g.userData={index:Math.floor(i/2),side:i%2?-1:1,flame};this.scene.add(g);this.torches.push(g);}
    // Thin shafts give the distant architecture a luminous, layered silhouette.
    this.beams=[];const beamMat=new T.MeshBasicMaterial({color:0xffdf9e,transparent:true,opacity:.033,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide});for(let i=0;i<4;i++){const b=new T.Mesh(new T.CylinderGeometry(.1,3.6,44,6,1,true),beamMat);b.position.set(-15+i*13,12,-65-i*7);b.rotation.z=-.38;b.rotation.x=.25;this.scene.add(b);this.beams.push(b);}
  }
  buildRunner(){
    this.runner=new T.Group();this.scene.add(this.runner);this.body=new T.Group();this.runner.add(this.body);
    this.mesh(new T.CapsuleGeometry(.33,.55,5,12),'cloth',this.body,[0,1.28,0],[1,1,.68]);this.mesh('box','leather',this.body,[0,1.1,.24],[.54,.55,.22]);this.mesh('box','gold',this.body,[0,1.1,.37],[.14,.21,.03]);this.mesh('cyl','leather',this.body,[0,.91,0],[.34,.14,.25]);
    this.head=this.mesh('sphere','cloth',this.body,[0,1.99,0],[.29,.33,.28]);this.mesh('sphere','skin',this.body,[0,1.96,-.18],[.22,.23,.14]);const hood=this.mesh('sphere','cloth',this.body,[0,2.03,.09],[.29,.32,.23]);this.mesh('box','gold',this.body,[0,1.85,.28],[.21,.045,.025]);
    this.legs=[];this.arms=[];
    for(const sign of [-1,1]){
      const leg=new T.Group();leg.position.set(sign*.18,.91,0);this.body.add(leg);this.mesh('cyl','leather',leg,[0,-.22,0],[.125,.45,.125]);const knee=new T.Group();knee.position.y=-.43;leg.add(knee);this.mesh('cyl','cloth',knee,[0,-.19,0],[.12,.4,.12]);this.mesh('box','boot',knee,[0,-.4,-.075],[.27,.2,.39]);this.mesh('cyl','gold',knee,[0,-.23,0],[.13,.06,.13]);this.legs.push({leg,knee});
      const arm=new T.Group();arm.position.set(sign*.38,1.57,0);this.body.add(arm);this.mesh('sphere','gold',arm,[0,0,0],[.19,.18,.19]);this.mesh('cyl','cloth',arm,[0,-.19,0],[.12,.37,.12]);const elbow=new T.Group();elbow.position.y=-.35;arm.add(elbow);elbow.rotation.x=-.9;this.mesh('cyl','leather',elbow,[0,-.17,0],[.095,.32,.095]);this.mesh('sphere','skin',elbow,[0,-.35,0],[.10,.12,.10]);this.arms.push({arm,elbow});
    }
    const scarfGeo=new T.PlaneGeometry(.42,1.65,2,10);this.scarf=new T.Mesh(scarfGeo,this.mat.scarf);this.scarf.position.set(0,1.61,.32);this.scarf.castShadow=true;this.body.add(this.scarf);this.scarfOriginal=scarfGeo.attributes.position.array.slice();
    this.mesh('cyl','gold',this.body,[.43,.96,.1],[.13,.32,.13]);this.ember=this.mesh('sphere',this.mat.cyan.clone(),this.body,[.43,.96,.1],[.12,.22,.12]);this.lampGlow=this.glow(this.body,0x95ffe3,1.8,[.43,.96,.16]);
    const shadowMat=new T.MeshBasicMaterial({map:this.glowTexture,color:0x07191a,transparent:true,opacity:.66,depthWrite:false});this.shadow=new T.Mesh(new T.PlaneGeometry(1.6,1.6),shadowMat);this.shadow.rotation.x=-Math.PI/2;this.shadow.position.y=.018;this.scene.add(this.shadow);
    this.aura=this.glow(this.runner,0x9bffdf,3.7,[0,1.2,0]);this.aura.visible=false;
    this.readyRing=this.mesh('ring',new T.MeshBasicMaterial({color:0xffde8d,transparent:true,opacity:.8,depthWrite:false}),this.runner,[0,1.3,.35],[.62,.62,.62]);this.readyRing.visible=false;
    this.victoryGem=this.mesh('gem','gem',this.runner,[0,2.85,0],[1.6,2.2,1.6]);this.victoryGem.visible=false;
    this.ribbons=[];
    for(const side of [-1,1]){const geo=new T.PlaneGeometry(.12,3.8,1,16);const mat=new T.MeshBasicMaterial({color:0xa3ffe1,transparent:true,opacity:.5,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending});const mesh=new T.Mesh(geo,mat);this.runner.add(mesh);this.ribbons.push({mesh,base:geo.attributes.position.array.slice(),side});}
  }
  buildMotes(){const r=rng(447);const a=new Float32Array(100*3);for(let i=0;i<100;i++){a[i*3]=(r()-.5)*26;a[i*3+1]=r()*12;a[i*3+2]=-r()*100;}const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(a,3));const m=new T.PointsMaterial({color:0xffdca1,size:.10,map:this.glowTexture,transparent:true,opacity:.65,blending:T.AdditiveBlending,depthWrite:false});this.motes=new T.Points(g,m);this.scene.add(this.motes);}
  makeObstacle(type){
    const g=new T.Group();
    if(type==='coin'){const gem=this.mesh('gem','gem',g,[0,1.13,0],[1,1.3,1]);this.mesh('ring','gold',g,[0,1.13,0],[.34,.34,.34]);this.glow(g,0xffbd50,1.5,[0,1.13,0]);g.userData.spin=gem;}
    else if(type==='flame'){this.mesh('cyl','gold',g,[0,1.02,0],[.30,.10,.30]);const gem=this.mesh('gem','cyan',g,[0,1.5,0],[1.15,1.7,1.15]);this.glow(g,0x68ffe1,2.6,[0,1.5,0]);g.userData.spin=gem;}
    else if(type==='relic'){
      const core=this.mesh('gem','gem',g,[0,1.3,0],[2.0,2.6,2.0]);g.userData.spin=core;g.userData.lights=[];
      const halo=this.mesh('ring','gold',g,[0,1.3,0],[.79,.79,.79]);g.userData.halo=halo;
      for(let i=0;i<3;i++){const a=i*Math.PI*2/3;const light=this.mesh('gem','dark',g,[Math.sin(a)*.8,1.3+Math.cos(a)*.8,.06],[.7,.7,.7]);g.userData.lights.push(light);}
      g.userData.glow=this.glow(g,0xffd789,3.8,[0,1.3,0]);
    }
    else if(type==='hurdle'){this.mesh('box','dark',g,[0,.29,0],[2.0,.58,.75]);this.mesh('box','gold',g,[0,.67,0],[2.05,.20,.83]);this.mesh('box','trim',g,[0,.80,.42],[1.85,.07,.03]);for(const x of [-.85,.85])this.mesh('box','stone',g,[x,.53,0],[.3,1.02,.95]);this.chevron(g,1,0xefd08b,1.25);}
    else if(type==='arch'){for(const x of [-.96,.96]){this.mesh('box','dark',g,[x,1.28,0],[.23,2.56,.72]);this.mesh('box','gold',g,[x,2.3,0],[.32,.14,.83]);}this.mesh('box','stone',g,[0,1.90,0],[2.2,1.10,.8]);this.mesh('box','cyan',g,[0,1.32,.43],[1.84,.08,.04]);this.chevron(g,-1,0x84edcd,2.07);}
    else if(type==='block'){this.mesh('box','dark',g,[0,1.15,0],[1.95,2.3,1.45]);this.mesh('box','stone',g,[0,2.4,0],[2.12,.22,1.65]);this.mesh('box','gold',g,[0,.4,.735],[1.86,.10,.03]);this.mesh('box','gold',g,[0,2.03,.735],[1.86,.09,.03]);this.mesh('gem','gold',g,[0,1.24,.76],[1.2,1.7,.30]);for(const x of [-.68,.68])this.mesh('box','stone',g,[x,1.3,.77],[.18,1.2,.16]);}
    else if(type==='gap'){const pit=this.mesh('box','abyss',g,[0,-.35,0],[2.3,.05,7.7]);pit.castShadow=false;for(const z of [-3.85,3.85]){this.mesh('box','gold',g,[0,.04,z],[2.3,.08,.16]);for(const x of [-1,1])this.mesh('box','trim',g,[x,.08,z],[.12,.12,.5]);}this.chevron(g,1,0xefd08b,.5,3.7);}
    return g;
  }
  chevron(g,dir,color,y,z=.48){const mat=new T.MeshBasicMaterial({color});for(const sign of [-1,1]){const bar=this.mesh('box',mat,g,[sign*.13,y,z],[.08,.39,.02]);bar.rotation.z=sign*dir*.75;} }
  spawnParticles(x,y,z,color,count=10){for(let i=0;i<count;i++){const mat=new T.SpriteMaterial({map:this.glowTexture,color,blending:T.AdditiveBlending,depthWrite:false});const s=new T.Sprite(mat);s.position.set(x,y,z);s.scale.setScalar(.12+Math.random()*.17);this.scene.add(s);this.particles.push({mesh:s,life:.6+Math.random()*.4,velocity:new T.Vector3((Math.random()-.5)*5,Math.random()*4,(Math.random()-.5)*5)});}}
  resetEffects(){
    for(const f of [...this.effects,...this.particles]){this.scene.remove(f.mesh);if(f.owned!==false)f.mesh.material.dispose();}
    this.effects=[];this.particles=[];Object.assign(this.reaction,{hit:0,land:0,near:0,collect:0,surge:0,slide:0,death:0,ending:false,side:1,gap:false});this.lastTravel=0;this.effectTick=0;this.shake=0;this.kick=0;
  }
  ring(x,color,size=1,vertical=false){
    const mat=new T.MeshBasicMaterial({color,transparent:true,opacity:.85,depthWrite:false,blending:T.AdditiveBlending});const mesh=new T.Mesh(this.geos.ring,mat);mesh.position.set(x,vertical?1.1:.05,0);mesh.rotation.x=vertical?0:-Math.PI/2;mesh.scale.setScalar(.2);this.scene.add(mesh);this.effects.push({kind:'ring',mesh,life:.43,total:.43,size,vertical});
  }
  debris(x,z,strong=false){
    const count=strong?14:7;
    for(let i=0;i<count;i++){const mesh=new T.Mesh(this.geos.box,i%3===0?this.mat.gold:this.mat.stone);const size=(strong?.22:.07)+Math.random()*(strong?.38:.12);mesh.scale.set(size,size*.7,size);mesh.position.set(x+(Math.random()-.5)*1.2,.5+Math.random()*1.5,z);this.scene.add(mesh);this.effects.push({kind:'debris',mesh,owned:false,life:strong?1.1:.65,total:strong?1.1:.65,velocity:new T.Vector3((Math.random()-.5)*8,2+Math.random()*5,1+Math.random()*5)});}
  }
  collect(e,run){
    const mesh=new T.Mesh(this.geos.gem,e.type==='flame'?this.mat.cyan:this.mat.gem);mesh.position.set((e.lane-1)*LANE,e.height,-(e.z-run.distance));mesh.scale.setScalar(e.type==='relic'?2.1:e.type==='flame'?1.3:1);this.scene.add(mesh);
    this.effects.push({kind:'pickup',mesh,owned:false,life:.27,total:.27,start:mesh.position.clone(),recovery:e.type!=='coin'});
  }
  event(e,run){
    const x=run.x*LANE,r=this.reaction;
    if(e.type==='hit'||e.type==='practice'){
      r.hit=.8;r.side=e.side;r.gap=e.obstacle==='gap';this.shake=this.reduced?0:.18;this.debris(x,0,false);
      if(r.gap)this.ring(x,0x8dffe1,2,true);
    }
    if(e.type==='perfect'){
      if(e.obstacle==='arch'){r.slide=.45;this.ring(x,0xffd798,1.6);this.spawnParticles(x,.18,.6,0xffd798,12);}
      else this.spawnParticles(x,1.2,-.5,0xffde96,7);
    }
    if(e.type==='dodge'){r.near=.35;r.side=e.side;this.spawnParticles(x-e.side*.35,1.15,0,0xe9efbd,12);}
    if(e.type==='land'){r.land=e.clean?.28:.17;this.ring(x,e.clean?0xffdf98:0x769c92,e.clean?1.65:.8);this.spawnParticles(x,.12,0,e.clean?0xffd899:0x9d9a77,e.clean?14:5);if(e.clean)this.kick=.13;}
    if(PICKUPS.has(e.type))this.collect(e,run);
    if(e.type==='boost'){r.surge=.6;this.ring(x,0xffe7b2,3.4,true);this.ring(x,0x94ffdc,3);this.spawnParticles(x,1,0,0xffe6a8,22);}
    if(e.type==='smash'){if(e.obstacle!=='gap')this.debris((e.lane-1)*LANE,0,true);else this.ring(x,0x97ffe5,2);this.shake=this.reduced?0:.075;}
    if(e.type==='end'){r.ending=true;r.death=0;r.gap=e.cause==='gap';if(e.won){this.ring(x,0xffdf93,4);this.spawnParticles(x,2,0,0xffdf93,28);}}
  }
  updateEffects(run,dt,travelDelta){
    for(let i=this.effects.length-1;i>=0;i--){const f=this.effects[i];f.life-=dt;
      if(f.life<=0){this.scene.remove(f.mesh);if(f.owned!==false)f.mesh.material.dispose();if(f.kind==='pickup'){this.reaction.collect=f.recovery?.6:.17;this.spawnParticles((run?.x||0)*LANE+.43,1.05+(run?.y||0),.1,f.recovery?0x94ffe0:0xffd280,f.recovery?10:3);}this.effects.splice(i,1);continue;}
      const t=1-f.life/f.total;
      if(f.kind==='pickup'){
        const target=new T.Vector3((run?.x||0)*LANE+.43,1.05+(run?.y||0),.1);const ease=1-Math.pow(1-t,2);f.mesh.position.lerpVectors(f.start,target,ease);f.mesh.position.y+=Math.sin(t*Math.PI)*.65;f.mesh.rotation.y+=dt*13;f.mesh.scale.multiplyScalar(Math.pow(.97,dt*60));
      }else if(f.kind==='ring'){f.mesh.scale.setScalar(.2+t*f.size);f.mesh.material.opacity=(1-t)*.7;f.mesh.position.z+=travelDelta+(f.vertical?dt*7:0);}
      else{f.mesh.position.addScaledVector(f.velocity,dt);f.mesh.position.z+=travelDelta;f.velocity.y-=dt*14;f.mesh.rotation.x+=dt*7;f.mesh.rotation.z+=dt*5;if(f.mesh.position.y<.08){f.mesh.position.y=.08;f.velocity.y=Math.abs(f.velocity.y)*.25;}f.mesh.scale.multiplyScalar(Math.pow(.992,dt*60));}
    }
  }
  animateRunner(run,dt,active){
    const r=this.reaction,time=this.clock,boost=!!run&&run.boost>0,flow=run?.momentum||0;
    for(const key of ['hit','land','near','collect','surge','slide'])r[key]=Math.max(0,r[key]-dt);
    if(r.ending)r.death+=dt;
    const y=run?.y||0,slide=!!run&&run.slide>0&&y<.4,moving=!!run&&active;
    const phase=run?run.distance*1.45:time*2,hit=r.hit/.8,land=r.land/.28,near=r.near/.35;
    const sway=hit*r.side*(.35+Math.sin((1-hit)*18)*.18);
    let sink=r.gap&&hit>0?-Math.sin((1-hit)*Math.PI)*1.45:0;
    if(r.ending&&run&&!run.won){sink=run.endCause==='gap'?-Math.min(7,r.death*r.death*8):0;}
    this.runner.position.set((run?.x||0)*LANE+sway*.24,y+(boost?.22:0)+sink,0);this.runner.visible=true;
    this.body.position.set(0,moving&&!slide&&y===0?Math.abs(Math.sin(phase))*.075:0,slide?.35:hit*.32);
    let rx=slide?-1.17:boost?-.36:-.12-flow*.10;
    let rz=run?-(run.lane-1-run.x)*.40:0;
    rx+=hit*.7+land*.14;rz+=sway+near*r.side*.38;
    let sy=slide?.62:1-land*.20-hit*.14;
    if(r.ending&&run&&!run.won&&run.endCause!=='gap'){const f=Math.min(1,r.death*2.2);rx=run.endCause==='exhausted'?-.45*f:.2;rz=run.endCause==='exhausted'?.1:1.35*f*r.side;sy=1-f*.4;}
    this.body.rotation.x=lerp(this.body.rotation.x,rx,1-Math.exp(-dt*22));this.body.rotation.z=lerp(this.body.rotation.z,rz,1-Math.exp(-dt*20));this.body.rotation.y=near*r.side*.45;this.body.scale.y=lerp(this.body.scale.y,sy,1-Math.exp(-dt*25));
    for(let i=0;i<2;i++){const side=i===0?1:-1;
      this.legs[i].leg.rotation.x=slide?-.9:y>.1?-.62*side:moving?Math.sin(phase)*(.8+flow*.1)*side:.08*side;
      this.legs[i].knee.rotation.x=slide?1.25:y>.1?.95:Math.max(0,Math.sin(phase)*side)*1.15+land*.5;
      this.arms[i].arm.rotation.x=slide?-.35:y>.1?-1.2:moving?-Math.sin(phase)*.72*side:Math.sin(time)*.04;
      this.arms[i].arm.rotation.z=hit*side*.9+(boost?side*.16:0);this.arms[i].elbow.rotation.x=boost?-1.45:-.9;
    }
    this.victoryGem.visible=r.ending&&!!run?.won;this.victoryGem.rotation.y=time*1.7;if(this.victoryGem.visible){for(const a of this.arms){a.arm.rotation.x=-2.65;a.elbow.rotation.x=-.3;}}
    const pos=this.scarf.geometry.attributes.position;for(let i=0;i<pos.count;i++){const oy=this.scarfOriginal[i*3+1],t=(.825-oy)/1.65;pos.setXYZ(i,this.scarfOriginal[i*3]+Math.sin(time*9-t*6)*.14*t,.25-t*(boost?.18:.6),.03+t*(moving?(boost?1.75:1.2):.3)+Math.sin(time*10-t*5)*.09*t);}pos.needsUpdate=true;this.scarf.geometry.computeVertexNormals();
    this.shadow.position.x=this.runner.position.x;this.shadow.scale.setScalar(Math.max(.2,1-y*.15));this.shadow.material.opacity=Math.max(0,.55-y*.13);this.shadow.visible=sink>-.4;
    const fuel=run?run.energy/run.stat.energy:1;const recovery=r.collect;const light=Math.max(.07,fuel);
    this.ember.scale.set(.12,.10+light*.23+recovery*.35,.12);this.ember.material.color.setHex(fuel<.23?0xffa266:0x9affdb);this.ember.material.emissive.setHex(fuel<.23?0xff633b:0x40e4bd);this.ember.material.emissiveIntensity=.6+light*2+recovery*4;
    this.lampGlow.scale.setScalar(1+light+recovery*2);this.lampGlow.material.opacity=.16+light*.44+recovery*.5;this.lampGlow.material.color.copy(this.ember.material.color);
    this.runnerLight.position.set(this.runner.position.x+.4,1.4+y,.4);this.runnerLight.color.copy(this.ember.material.color);this.runnerLight.intensity=boost?14:1+light*4+recovery*15;
    this.aura.visible=boost||r.surge>0;this.aura.material.opacity=boost?.32+Math.sin(time*10)*.06:r.surge*.5;
    this.readyRing.visible=!!run&&run.charge>=100&&!boost;this.readyRing.rotation.z=time*.8;this.readyRing.material.opacity=.55+Math.sin(time*5)*.2;
    for(const ribbon of this.ribbons){const a=ribbon.mesh.geometry.attributes.position;const strength=boost?1:flow*.55;ribbon.mesh.visible=strength>.10&&moving;ribbon.mesh.material.opacity=strength*.62;ribbon.mesh.material.color.setHex(boost?0xffdc95:0x94fadb);for(let i=0;i<a.count;i++){const t=(1.9-ribbon.base[i*3+1])/3.8;a.setXYZ(i,ribbon.side*(.33+t*.38)+ribbon.base[i*3]+Math.sin(time*10-t*8)*.05*t,.7+Math.sin(t*4+time*6)*.08,t*(boost?4.6:2.5));}a.needsUpdate=true;}
    this.effectTick+=dt;if(moving&&this.effectTick>.075){this.effectTick=0;if(slide)this.spawnParticles(this.runner.position.x,.1,.5,0xffcd86,2);if(boost){this.spawnParticles(this.runner.position.x,1,1.2,0xffe6a3,2);if(Math.sin(time*18)>.65)this.ring(this.runner.position.x,0xafe5cf,2.5,true);}}
    this.shake=Math.max(0,this.shake-dt);this.kick=Math.max(0,this.kick-dt);
    const targetFov=(this.camera.aspect>1?65:59)+(this.reduced?0:boost?7:flow*2.2);this.camera.fov=lerp(this.camera.fov,targetFov,1-Math.exp(-dt*5));this.camera.updateProjectionMatrix();
    const sh=this.reduced?0:this.shake;this.camera.position.set((run?.x||0)*.27+Math.sin(time*73)*sh,4.65+Math.cos(time*61)*sh-(this.reduced?0:land*.07),9.2+this.kick);this.camera.lookAt((run?.x||0)*.16,1.65,-22);
  }
  bend(z){return (Math.sin((this.travel+z)/100)-Math.sin(this.travel/100)-Math.cos(this.travel/100)*z/100)*6;}
  resize(){const w=this.canvas.clientWidth,h=this.canvas.clientHeight;this.renderer.setPixelRatio(devicePixelRatio||1);this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.fov=w>h?65:59;this.camera.updateProjectionMatrix();}
  update(run,dt,active){
    this.clock+=dt;this.travel=run?run.distance:this.clock*3;const time=this.clock;
    const gaps=run?run.objects.filter(o=>o.type==='gap'):[];
    const first=Math.floor(this.travel/4)*4-12;
    for(let i=0;i<42;i++){
      const world=first+i*4,z=world-this.travel,center=this.bend(z);
      for(let lane=0;lane<3;lane++){const hidden=gaps.some(o=>o.lane===lane&&Math.abs(o.z-world)<4);this.dummy.position.set(center+(lane-1)*LANE,hidden?-15:-.22,-z);this.dummy.rotation.set(0,0,0);this.dummy.scale.set(2.27,.42,3.94);this.dummy.updateMatrix();this.road.setMatrixAt(i*3+lane,this.dummy.matrix);}
      for(let s=0;s<2;s++){const x=center+(s===0?-1:1)*3.61;this.dummy.position.set(x,-.04,-z);this.dummy.scale.set(.26,.35,3.98);this.dummy.updateMatrix();this.edges.setMatrixAt(i*2+s,this.dummy.matrix);this.dummy.position.set(x,.14,-z);this.dummy.scale.set(.085,.025,3.65);this.dummy.updateMatrix();this.inlays.setMatrixAt(i*2+s,this.dummy.matrix);}
    }
    let riskCount=0;
    if(run)for(const section of run.sections.values())if(section.risk){
      const reward=run.objects.find(o=>o.type==='relic'&&o.section===section.id);if(!reward)continue;
      for(let at=section.start-16;at<section.end-28;at+=5){const dz=at-run.distance;if(dz< -8||dz>120)continue;for(const side of [-1,1]){if(riskCount>=128)break;this.dummy.position.set(this.bend(dz)+(reward.lane-1)*LANE+side*.96,.025,-dz);this.dummy.scale.set(.07,.012,3.3);this.dummy.updateMatrix();this.riskPath.setMatrixAt(riskCount++,this.dummy.matrix);}}
    }
    this.riskPath.count=riskCount;this.riskPath.instanceMatrix.needsUpdate=true;
    this.road.instanceMatrix.needsUpdate=true;this.edges.instanceMatrix.needsUpdate=true;this.inlays.instanceMatrix.needsUpdate=true;
    for(const g of this.pillars){const z=((g.userData.index*20-this.travel)%140+140)%140-10;g.position.set(this.bend(z)+g.userData.side*4.35,0,-z);}
    for(let i=0;i<this.arches.length;i++){const z=((i*44-this.travel)%176+176)%176-12;const g=this.arches[i];g.position.set(this.bend(z),0,-z);g.visible=z<125;}
    for(const g of this.rocks){const z=((g.userData.index*14-this.travel*.87)%182+182)%182-18;g.position.set(this.bend(z)+g.userData.side*g.userData.offset,-3,-z);}
    for(const g of this.torches){const z=((g.userData.index*23-this.travel)%138+138)%138-10;g.position.set(this.bend(z)+g.userData.side*3.95,0,-z);g.userData.flame.rotation.y=time;g.userData.flame.scale.y=1.1+Math.sin(time*6)*.14;}
    const live=new Set();
    if(run)for(const o of run.objects){
      const dz=o.z-run.distance;if(dz>125||dz< -10||o.broken||o.done&&PICKUPS.has(o.type))continue;
      live.add(o.id);let g=this.objectViews.get(o.id);if(!g){g=this.pool[o.type]?.pop()||this.makeObstacle(o.type);g.userData.type=o.type;this.scene.add(g);this.objectViews.set(o.id,g);}
      g.position.set(this.bend(dz)+(o.lane-1)*LANE,0,-dz);g.visible=true;
      if(g.userData.spin){g.userData.spin.rotation.y=time*(o.type==='relic'?1.3:2);g.position.y=(o.type==='coin'?o.height-1.13:0)+Math.sin(time*3+o.id)*.07;}
      if(o.type==='relic'){const section=run.sections.get(o.section);const progress=section?.failed?0:section?.cleared||0;const unlocked=progress>=3;g.userData.spin.material=unlocked?this.mat.gem:this.mat.dark;g.userData.glow.material.opacity=unlocked?.72:.08;g.userData.halo.material=unlocked?this.mat.trim:this.mat.gold;g.userData.lights.forEach((light,i)=>light.material=i<progress?this.mat.cyan:this.mat.dark);g.userData.halo.rotation.z=time*(unlocked?3:.3);}
    }
    for(const [id,g]of this.objectViews){if(!live.has(id)){this.scene.remove(g);this.objectViews.delete(id);(this.pool[g.userData.type]??=[]).push(g);}}
    const moving=!!run&&active;const travelDelta=run?Math.max(0,Math.min(2,this.travel-this.lastTravel)):0;this.lastTravel=this.travel;
    this.animateRunner(run,dt,active);this.updateEffects(run,dt,travelDelta);
    const zone=run?.zone||0;const colors=[0x32534e,0x193e4a,0x6b6250];this.scene.fog.color.lerp(new T.Color(colors[zone]),dt*.4);this.mat.floor.color.lerp(new T.Color([0x9caa90,0x698e91,0xb5a17a][zone]),dt*.5);this.mat.water.opacity=zone===1?.6:.24;this.water.position.y=zone===1?-1.2:-5;
    const a=this.motes.geometry.attributes.position;for(let i=0;i<a.count;i++){let z=a.getZ(i)+dt*(moving?run.speed*.65:1.5);if(z>8)z=-100;a.setZ(i,z);a.setX(i,a.getX(i)+Math.sin(time*.4+i)*dt*.11);}a.needsUpdate=true;
    for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt;if(p.life<=0){this.scene.remove(p.mesh);p.mesh.material.dispose();this.particles.splice(i,1);continue;}p.mesh.position.addScaledVector(p.velocity,dt);p.mesh.position.z+=travelDelta;p.velocity.y-=dt*3;p.mesh.material.opacity=Math.min(1,p.life*2);}
    this.renderer.render(this.scene,this.camera);
  }
}
