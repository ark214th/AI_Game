import * as T from './vendor/three.module.min.js';
import {LANE, clamp} from './core.mjs';

const PI = Math.PI, TAU = PI * 2;
const materials = new Map(), shapes = new Map();
function mat(color, roughness = .72, metalness = 0) {
  const key = `${color}/${roughness}/${metalness}`;
  if (!materials.has(key)) materials.set(key, new T.MeshStandardMaterial({color, roughness, metalness}));
  return materials.get(key);
}
const palette = {cream:0xfff2d3, coral:0xf28168, teal:0x329a9c, dark:0x21465e, gold:0xffcd57, lime:0xddf298, pink:0xe9aa93, road:0x608c93};
function boxGeo(w,h,d,r=0) {
  const key = `${w}/${h}/${d}/${r}`;
  if (!shapes.has(key)) {
    if (!r) shapes.set(key, new T.BoxGeometry(w,h,d));
    else {
      r = Math.min(r, w/2-.001, h/2-.001, d/2-.001);
      const s = new T.Shape(), x=-w/2+r, y=-h/2+r, rw=w-2*r, rh=h-2*r;
      s.moveTo(x,y);s.lineTo(x+rw,y);s.lineTo(x+rw,y+rh);s.lineTo(x,y+rh);s.closePath();
      const g = new T.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:2,steps:1,curveSegments:1});
      g.translate(0,0,-d/2+r); g.computeVertexNormals(); shapes.set(key,g);
    }
  }
  return shapes.get(key);
}
function mesh(parent,geo,color,x=0,y=0,z=0){const m=new T.Mesh(geo,typeof color==='number'?mat(color):color);m.position.set(x,y,z);parent.add(m);return m;}
function box(p,w,h,d,color,x=0,y=0,z=0,r=0){return mesh(p,boxGeo(w,h,d,r),color,x,y,z);}
const sphereGeo = new T.SphereGeometry(1,12,8), cylinderGeo = new T.CylinderGeometry(1,1,1,10);
function ball(p,color,x,y,z,sx,sy=sx,sz=sx){const m=mesh(p,sphereGeo,color,x,y,z);m.scale.set(sx,sy,sz);return m;}
function cylinder(p,color,x,y,z,r,h){const m=mesh(p,cylinderGeo,color,x,y,z);m.scale.set(r,h,r);return m;}
function shadowTexture(){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');const g=x.createRadialGradient(32,32,0,32,32,31);g.addColorStop(0,'rgba(10,43,55,.48)');g.addColorStop(.4,'rgba(10,43,55,.25)');g.addColorStop(1,'rgba(10,43,55,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new T.CanvasTexture(c);}
function labelTexture(text,bg,fg){const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,512,128);x.strokeStyle=fg;x.lineWidth=3;x.strokeRect(10,10,492,108);x.fillStyle=fg;x.textAlign='center';x.textBaseline='middle';x.font='900 64px sans-serif';x.fillText(text,256,68);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;}

// Bake environment geometry per material: keep the authored detail without hundreds of small draw calls.
function bake(group){
  group.updateMatrixWorld(true); const buckets=new Map(); const extras=[];
  group.traverse(o=>{if(!o.isMesh)return;if(o.material.map){extras.push(o);return;}const key=o.material.uuid;if(!buckets.has(key))buckets.set(key,{material:o.material,positions:[],normals:[]});const b=buckets.get(key);const g=o.geometry.clone().applyMatrix4(o.matrixWorld);const f=g.index?g.toNonIndexed():g; b.positions.push(f.getAttribute('position').array);b.normals.push(f.getAttribute('normal').array);if(f!==g)f.dispose();g.dispose();});
  const out=new T.Group();
  for(const b of buckets.values()){const total=b.positions.reduce((n,a)=>n+a.length,0);const p=new Float32Array(total),n=new Float32Array(total);let offset=0;b.positions.forEach((a,i)=>{p.set(a,offset);n.set(b.normals[i],offset);offset+=a.length;});const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));g.setAttribute('normal',new T.BufferAttribute(n,3));g.computeBoundingSphere();out.add(new T.Mesh(g,b.material));}
  for(const e of extras){const m=e.clone();e.matrixWorld.decompose(m.position,m.quaternion,m.scale);out.add(m);}return out;
}

function palm(g,x,z,variant=0){
  const trunk=cylinder(g,0xc59a6e,x,2.8,z,.16,5.6);trunk.rotation.z=.1;
  cylinder(g,palette.cream,x,1.1,z,.18,.1);
  const crown=new T.Group();crown.position.set(x-.28,5.5,z);g.add(crown);
  ball(crown,0x62ac7d,0,.02,0,.38,.35,.38);
  for(let i=0;i<7;i++){
    const a=i*TAU/7+variant,geo=new T.BufferGeometry();
    const p=[0,.05,0, .4,.05,.7, 0,-.7,2.2, -.4,.05,.7];
    geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setIndex([0,1,2,0,2,3,2,1,0,3,2,0]);geo.computeVertexNormals();
    const leaf=mesh(crown,geo,i%2?0x3c996d:0x71ba77);leaf.rotation.y=a;
  }
}
function building(g,x,z,color,h,variant){
  const w=5.8,d=7.5;
  box(g,w,h,d,color,x,h/2,z,.12);box(g,w+.25,.25,d+.2,palette.cream,x,h+.1,z,.05);
  box(g,w+.05,.35,d+.05,0xefccaa,x,.35,z);
  box(g,.12,h-.6,d-.1,0xffffff,x+2.94,h/2,z);
  for(let floor=0;floor<Math.floor((h-1)/2);floor++) for(let col=0;col<3;col++){
    const wz=z+(col-1)*2.15,wy=2.5+floor*2;
    box(g,.16,1.3,.94,palette.cream,x+2.96,wy,wz,.04);
    box(g,.18,1.08,.72,0x397886,x+3.02,wy,wz,.03);
    box(g,.2,.08,.74,0x9dcac9,x+3.06,wy,wz);
    if(floor===0){box(g,.46,.12,1.15,palette.cream,x+3.12,wy-.73,wz);box(g,.16,.34,.94,palette.teal,x+3.28,wy-.57,wz);}
  }
  box(g,.17,1.85,1.5,palette.dark,x+3.04,1.13,z);
  for(let i=0;i<7;i++)box(g,1.3,.15,.45,i%2?palette.cream:palette.coral,x+3.4,2.17,z-1.4+i*.46);
  const m=new T.MeshBasicMaterial({map:labelTexture(['MARE','CIAO!','SURF','LIDO'][variant%4],'#24576a','#fff1cf')});
  const sign=mesh(g,new T.PlaneGeometry(3.7,.92),m,x+3.08,3.53,z);sign.rotation.y=PI/2;
  box(g,1,.7,1.2,palette.teal,x+1,h+.53,z-2,.1);
}
function scenery(index){
  const g=new T.Group(), length=42;
  box(g,9.8,.3,length,palette.road,0,-.19,-length/2);
  box(g,3,.42,length,palette.cream,-6.3,-.1,-length/2);
  box(g,4.2,.42,length,0xe7cfaa,6.65,-.1,-length/2);
  for(const side of [-1,1]) {
    box(g,.3,.18,length,0xffdfaa,side*4.85,.06,-length/2);
    box(g,.11,.015,length,0xe8dbbc,side*4.45,.007,-length/2);
  }
  for(let z=-1;z>-length;z-=5.25){
    for(const x of [-1.4,1.4])box(g,.085,.017,1.7,0xb5d4cc,x,.012,z);
    box(g,3,.02,.07,0xd3b894,-6.3,.13,z);box(g,3.3,.02,.07,0xcdb797,6.55,.13,z);
    cylinder(g,0x88aaa9,8.65,.66,z,.065,1.12);
  }
  for(const y of [.55,1.03])box(g,.055,.055,length,0xd1ede0,8.65,y,-length/2);
  building(g,-11,-11,[0xefac83,0xe1b9a3,0xf4d998][index%3],8+(index%3)*1.5,index);
  building(g,-11,-32,[0x83b6b3,0xd7988b,0xd5ccb3][index%3],10+(index%2)*2,index+1);
  palm(g,6.6,-8,index);palm(g,7,-30,index+2);
  box(g,2,.45,1.1,0xf3b696,6.2,.39,-17,.1);box(g,1.85,.08,1.02,palette.cream,6.2,.66,-17,.04);
  const pole=cylinder(g,palette.dark,-5.8,3.1,-24,.07,6);pole.rotation.z=-.04;
  box(g,1.1,.12,.12,palette.dark,-5.25,6.1,-24);ball(g,0xffefad,-4.74,5.99,-24,.3,.14,.27);
  box(g,.14,1.45,.9,index%2?palette.coral:palette.teal,-5.75,4.8,-24,.04);
  cylinder(g,0xb37f5d,10.5,1.4,-19,.06,2.8);
  const umbrella=mesh(g,new T.ConeGeometry(1.5,.65,10,1,false),index%2?palette.coral:palette.cream,10.5,2.8,-19);
  umbrella.rotation.y=.2;
  box(g,2,.17,3,0xf4d699,11.3,.14,-20.5,.08);
  if(index%2===0){
    const rope=cylinder(g,palette.dark,0,8.3,-38,.025,16);rope.rotation.z=PI/2;
    for(let i=-4;i<=4;i++){const f=mesh(g,new T.ConeGeometry(.34,.72,3),[palette.coral,palette.cream,palette.teal][(i+4)%3],i*1.7,7.96,-38);f.rotation.z=PI;f.rotation.y=PI/2;}
  }
  return bake(g);
}

export function makeRunner(){
  const root=new T.Group(),body=new T.Group();root.add(body);
  const hips=new T.Group();hips.position.y=.75;body.add(hips);
  box(hips,.62,.33,.42,palette.dark,0,.07,0,.12);
  box(body,.75,.65,.49,palette.cream,0,1.25,0,.16);
  box(body,.73,.23,.5,palette.teal,0,1.03,0,.09);
  box(body,.57,.62,.24,palette.coral,0,1.25,.34,.1);
  box(body,.4,.17,.28,0xe66953,0,1.06,.43,.04);
  for(const x of [-.23,.23])box(body,.075,.56,.035,0xf3c796,x,1.35,.49,.015);
  const badge=box(body,.11,.25,.015,palette.cream,.01,1.38,.49,.015);badge.rotation.z=-.35;
  cylinder(body,0xe6b293,0,1.65,0,.16,.2);
  ball(body,0xf5c7a0,0,1.94,-.025,.37,.4,.34);
  ball(body,0x443e40,0,2.06,.018,.38,.27,.36);
  const cap=ball(body,palette.teal,0,2.16,-.025,.4,.23,.38);cap.rotation.x=-.1;
  box(body,.58,.09,.34,palette.teal,0,2.15,-.33,.04);
  box(body,.29,.08,.045,0xf6d291,0,2.12,.371,.035);
  ball(body,0xf5c7a0,-.37,1.93,0,.08,.12,.09);ball(body,0xf5c7a0,.37,1.93,0,.08,.12,.09);
  const arms=[],legs=[];
  for(const side of [-1,1]){
    const arm=new T.Group();arm.position.set(side*.44,1.47,0);body.add(arm);
    box(arm,.23,.4,.26,palette.cream,0,-.14,0,.08);
    const fore=new T.Group();fore.position.set(0,-.32,0);arm.add(fore);fore.rotation.x=-.65;
    box(fore,.18,.29,.2,0xeebc99,0,-.12,0,.07);ball(fore,0xf5c7a0,0,-.29,0,.12,.13,.12);arms.push(arm);
    const leg=new T.Group();leg.position.set(side*.195,.76,0);body.add(leg);
    box(leg,.245,.35,.27,palette.dark,0,-.13,0,.07);
    const knee=new T.Group();knee.position.y=-.28;leg.add(knee);
    box(knee,.175,.29,.18,0xe6b293,0,-.105,0,.055);
    box(knee,.2,.12,.22,palette.cream,0,-.245,0,.03);
    box(knee,.29,.19,.47,palette.cream,0,-.33,-.1,.065);
    box(knee,.3,.065,.49,palette.coral,0,-.414,-.1,.025);
    box(knee,.303,.065,.2,palette.teal,0,-.31,-.015,.025);legs.push({leg,knee});
  }
  const scarf=new T.Group();scarf.position.set(.25,1.6,.24);body.add(scarf);
  const tail=box(scarf,.17,.08,.63,palette.gold,0,-.03,.25,.035);tail.rotation.x=.2;
  body.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  return {root,body,arms,legs,scarf};
}
export function obstacle(type){
  const g=new T.Group();
  if(type==='tram'){
    box(g,2.24,.24,7.1,palette.dark,0,.37,0,.1);
    box(g,2.25,2.65,7,palette.coral,0,1.97,0,.23);
    box(g,2.3,.32,6.8,palette.cream,0,3.3,0,.15);
    box(g,2.18,.25,6.9,palette.cream,0,1.27,0,.04);
    box(g,1.91,.87,.07,palette.dark,0,2.38,3.52,.12);
    box(g,.045,.86,.1,0xffce9b,0,2.38,3.55);
    box(g,1.42,.35,.09,0xe9bb80,0,1.64,3.53,.1);
    for(const x of [-.74,.74]){ball(g,0xfff1a8,x,1.61,3.6,.135,.135,.05);box(g,.1,1,5.55,palette.dark,x>0?1.128:-1.128,2.4,0);}
    for(let z=-2;z<=2;z+=1.35)for(const x of [-1.14,1.14])box(g,.04,1.07,.08,palette.cream,x,2.4,z);
    for(const z of [-2.4,2.4])for(const x of [-1,1]){const wheel=cylinder(g,palette.dark,x,.35,z,.31,.22);wheel.rotation.z=PI/2;}
    box(g,1.2,.14,2.8,palette.dark,0,3.5,-.3,.04);
    // Bright end bumper and lamps make the collision face unambiguous.
    box(g,2.02,.15,.16,0xffdea3,0,.72,3.55,.04);
  }else if(type==='hurdle'){
    for(const x of [-.94,.94]){box(g,.18,1.1,.24,palette.dark,x,.52,0,.035);box(g,.48,.1,.6,palette.dark,x,.08,0,.04);}
    box(g,2.15,.64,.32,palette.coral,0,.69,0,.07);
    for(let x=-.75;x<=.8;x+=.5){const stripe=box(g,.2,.52,.025,palette.cream,x,.69,.18);stripe.rotation.z=-.38;}
    box(g,2.24,.09,.38,palette.gold,0,1.04,0,.035);
  }else if(type==='arch'){
    for(const x of [-1.12,1.12]){box(g,.18,2.55,.25,palette.teal,x,1.26,0,.05);box(g,.4,.1,.55,palette.dark,x,.07,0,.03);}
    box(g,2.4,1.06,.42,palette.teal,0,1.91,0,.09);
    box(g,2.4,.1,.46,0xb5eade,0,1.37,0,.035);
    for(const x of [-.57,0,.57]){const v=box(g,.1,.3,.04,palette.cream,x-.075,1.88,.24);v.rotation.z=.7;const w=box(g,.1,.3,.04,palette.cream,x+.075,1.88,.24);w.rotation.z=-.7;}
    box(g,2.4,.12,.5,palette.cream,0,2.5,0,.04);
  }else{
    const ring=mesh(g,new T.TorusGeometry(.45,.14,8,18,PI*1.5),0x92f1da,0,0,0);ring.rotation.z=PI*1.25;
    for(const x of [-.32,.32])box(g,.21,.22,.25,palette.cream,x,-.32,0,.04);
  }
  const combined=bake(g);combined.traverse(o=>{if(o.isMesh){o.castShadow=type!=='magnet';o.receiveShadow=true;}});return combined;
}

export class View {
  constructor(canvas){
    this.canvas=canvas;this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.65));this.renderer.outputColorSpace=T.SRGBColorSpace;
    this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    this.scene=new T.Scene();this.scene.background=new T.Color(0x9adcd8);this.scene.fog=new T.Fog(0xabe1d9,55,155);
    this.camera=new T.PerspectiveCamera(61,1,.15,235);
    this.scene.add(new T.HemisphereLight(0xd8f8fc,0xe4b68e,2.3));
    const sun=new T.DirectionalLight(0xffefd2,3.4);sun.position.set(-15,25,14);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-13;sun.shadow.camera.right=13;sun.shadow.camera.top=26;sun.shadow.camera.bottom=-12;sun.shadow.camera.near=1;sun.shadow.camera.far=75;sun.shadow.bias=-.0004;sun.shadow.normalBias=.035;sun.target.position.set(0,0,-13);this.scene.add(sun,sun.target);
    const ocean=box(this.scene,350,.1,380,0x50bfc4,125,-.65,-110);ocean.receiveShadow=true;
    const beach=box(this.scene,9,.2,380,0xf1d3a6,13,-.2,-110);
    this.chunks=[];for(let i=0;i<6;i++){const c=scenery(i);c.traverse(o=>{if(o.isMesh)o.receiveShadow=true;});this.scene.add(c);this.chunks.push(c);}
    const horizon=new T.Group();
    for(let i=0;i<9;i++){
      const x=17+i*6,z=-100-i*10;
      for(let k=0;k<3;k++)ball(horizon,0xfaf8e8,x+k*2.5,18+Math.sin(i)*4+(k===1?1:0),z,3.6,1.5+(k===1?.8:0),1.9);
    }
    const sunBall=ball(horizon,0xfff0bb,48,30,-160,11,11,2);sunBall.material=new T.MeshBasicMaterial({color:0xffefc7});
    for(let i=0;i<5;i++){const island=mesh(horizon,new T.ConeGeometry(12+i*3,7+i,5),0x76babe,48+i*18,0,-95-i*13);island.scale.z=.4;}
    this.scene.add(bake(horizon));
    this.runner=makeRunner();this.scene.add(this.runner.root);
    const shadowMat=new T.MeshBasicMaterial({map:shadowTexture(),transparent:true,depthWrite:false,opacity:.85});
    this.shadow=mesh(this.scene,new T.PlaneGeometry(2.35,2.35),shadowMat,0,.025,0);this.shadow.rotation.x=-PI/2;
    this.objectMap=new Map();this.pools={tram:[],hurdle:[],arch:[],magnet:[]};
    const coinMat=new T.MeshStandardMaterial({color:0xffd15e,metalness:.55,roughness:.28,emissive:0x8d4900,emissiveIntensity:.17});
    const coinGeo=new T.CylinderGeometry(.29,.29,.105,12);coinGeo.rotateX(PI/2);
    this.coinMesh=new T.InstancedMesh(coinGeo,coinMat,300);this.coinMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);this.coinMesh.frustumCulled=false;this.scene.add(this.coinMesh);
    const starGeo=new T.OctahedronGeometry(.15,0);starGeo.scale(.67,1.1,.25);this.coinStars=new T.InstancedMesh(starGeo,new T.MeshBasicMaterial({color:0xfff3b2}),300);this.coinStars.instanceMatrix.setUsage(T.DynamicDrawUsage);this.coinStars.frustumCulled=false;this.scene.add(this.coinStars);
    this.particles=Array.from({length:180},()=>({life:0,max:1,pos:new T.Vector3(),velocity:new T.Vector3(),color:new T.Color(),size:.1}));
    this.particleMesh=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.86}),180);this.particleMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);this.particleMesh.frustumCulled=false;this.scene.add(this.particleMesh);
    this.particleCursor=0;this.dummy=new T.Object3D();this.time=0;this.phase=0;this.landing=0;this.shake=0;this.coinPulse=0;this.footClock=0;this.fov=61;this.lastX=0;
    this.trail=[];
    for(let i=0;i<2;i++){const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(26*6),3));const ids=[];for(let j=0;j<25;j++)ids.push(j*2,j*2+1,j*2+2,j*2+1,j*2+3,j*2+2);geometry.setIndex(ids);const m=new T.Mesh(geometry,new T.MeshBasicMaterial({color:i?0xffdf95:0x95ffee,transparent:true,opacity:.54,side:T.DoubleSide,depthWrite:false}));m.frustumCulled=false;this.scene.add(m);this.trail.push({mesh:m,points:[]});}
    this.resize();
  }
  resize(){const w=this.canvas.clientWidth,h=this.canvas.clientHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.landscape=w>h;}
  reset(){for(const o of this.objectMap.values()){o.visible=false;this.pools[o.userData.type].push(o);}this.objectMap.clear();for(const p of this.particles)p.life=0;this.trail.forEach(t=>t.points=[]);this.shake=0;this.landing=0;this.lastX=0;}
  burst(x,y,z,color,count=8,force=3){
    for(let i=0;i<count;i++){const p=this.particles[this.particleCursor++%this.particles.length];p.life=p.max=.25+Math.random()*.4;p.pos.set(x,y,z);p.velocity.set((Math.random()-.5)*force,Math.random()*force+1,(Math.random()-.5)*force);p.color.set(color);p.size=.035+Math.random()*.08;}
  }
  event(e,run){
    if(e.type==='coin'){this.burst(e.e.lane*LANE,e.e.y,-(e.e.z-run.distance),palette.gold,4,2);this.coinPulse=.12;}
    if(e.type==='jump')this.burst(run.x,.15,0,0xf6edcc,6,2);
    if(e.type==='land'){this.landing=.25;this.burst(run.x,.08,0,0xe2f6de,9,3);}
    if(e.type==='move')this.burst(run.x,.15,.15,0xd9ffea,4,1.6);
    if(e.type==='clean')this.burst(run.x,1,0,0xaaffdb,16,4);
    if(e.type==='rush')this.burst(run.x,1,0,palette.gold,44,10);
    if(e.type==='smash'){this.burst(e.e.lane*LANE,1.5,-(e.e.z-run.distance),e.e.type==='arch'?palette.teal:palette.coral,22,12);this.shake=.08;}
    if(e.type==='hit'){this.burst(run.x,1,0,palette.coral,22,7);this.shake=.3;}
  }
  update(run,dt,mode){
    const moving=mode==='running'||mode==='title';this.time+=dt;const t=this.time;
    const dist=run.distance, title=mode==='title', rush=run.rush>0;
    this.chunks.forEach((c,i)=>{c.position.z=((dist-i*42+42)%252+252)%252-168;});
    const targetFov=(this.landscape?63:61)+(rush?8:Math.min(3,(run.speed-24)*.3));this.fov+=(targetFov-this.fov)*(1-Math.exp(-3*dt));this.camera.fov=this.fov;this.camera.updateProjectionMatrix();
    const camX=run.x*.15+Math.sin(dist*.0025)*.25;
    this.shake=Math.max(0,this.shake-dt);const shake=Math.sin(t*83)*this.shake*.13;
    this.camera.position.set(camX+shake,this.landscape?5.6:6.8,(this.landscape?10:10.8));
    this.camera.lookAt(camX*.4,1.4,-19);this.camera.rotation.z+=clamp((run.lane*LANE-run.x)*-.007,-.016,.016);
    const warm=(Math.sin(dist/850-1)+1)*.5;
    this.scene.background.set(0x9adcd8).lerp(new T.Color(0xe9c8a6),warm*.25);this.scene.fog.color.copy(this.scene.background);
    if(moving)this.phase+=dt*(run.speed*.51);const phase=this.phase;
    this.landing=Math.max(0,this.landing-dt);const squash=Math.sin(this.landing/.25*PI)*.16;
    const bob=run.y>0?0:Math.abs(Math.sin(phase))*.08;
    const {root,body,arms,legs,scarf}=this.runner;root.position.set(run.x,run.y+bob,0);
    const lean=clamp((run.lane*LANE-run.x)*-.3,-.44,.44);root.rotation.z+=(lean-root.rotation.z)*(1-Math.exp(-14*dt));
    const slide=run.slide>0&&run.y<.3;
    body.position.y=slide?-.35:0;body.rotation.x+=( (slide?-1.05:(run.y>0?-.19:-.11))-body.rotation.x)*(1-Math.exp(-20*dt));
    body.scale.set(1+squash*.3,1-squash,1+squash*.3);
    for(let i=0;i<2;i++){
      const swing=Math.sin(phase+i*PI);arms[i].rotation.x=slide?-.8:run.y>0?-1.6+swing*.13:swing*.83;
      arms[i].rotation.z=(i===0?-.1:.1)+(rush?(i===0?-.1:.1):0);
      legs[i].leg.rotation.x=slide?(i===0?-1.3:.3):run.y>0?(i===0?-.75:.45):-swing*.92;
      legs[i].knee.rotation.x=slide?1.3:run.y>0?.75:Math.max(0,swing)*1.25;
    }
    scarf.rotation.x=.18+Math.sin(t*20)*.2;scarf.rotation.y=Math.sin(t*12)*.25;
    root.visible=!run.dead&&run.invincible>0&&!run.finishGrace?Math.floor(t*14)%3!==0:true;
    this.shadow.position.x=run.x;const shadowScale=1-run.y*.13;this.shadow.scale.set(shadowScale,.8*shadowScale,1);this.shadow.material.opacity=.82-run.y*.16;
    if(moving&&run.y<.1){this.footClock+=dt;const frequency=rush?.045:.085;if(this.footClock>frequency){this.footClock=0;this.burst(run.x+(Math.sin(phase)>0?.2:-.2),.09,.2,slide?0xffd395:0xd9e8d8,slide?3:1,slide?2:1);}}
    let coins=0;const alive=new Set();const dummy=this.dummy;
    for(const e of run.entities){
      const depth=e.z-dist;if(e.done||depth>148||depth< -12)continue;
      if(e.type==='coin'){
        if(coins>=300)continue;
        dummy.position.set(e.lane*LANE,e.y+Math.sin(t*4+e.z)*.045,-depth);dummy.rotation.set(0,t*2.2+e.z*.07,0);dummy.scale.setScalar(1);dummy.updateMatrix();this.coinMesh.setMatrixAt(coins,dummy.matrix);
        dummy.translateZ(.067);dummy.updateMatrix();this.coinStars.setMatrixAt(coins,dummy.matrix);coins++;continue;
      }
      alive.add(e.id);let o=this.objectMap.get(e.id);
      if(!o){o=this.pools[e.type].pop()||obstacle(e.type);o.userData.type=e.type;o.visible=true;this.scene.add(o);this.objectMap.set(e.id,o);}
      o.position.set(e.lane*LANE,e.type==='magnet'?1.5+Math.sin(t*4)*.15:0,-depth);
      if(e.type==='magnet')o.rotation.y=t*2;
    }
    for(const [id,o]of this.objectMap)if(!alive.has(id)){o.visible=false;this.pools[o.userData.type].push(o);this.objectMap.delete(id);}
    this.coinMesh.count=coins;this.coinMesh.instanceMatrix.needsUpdate=true;this.coinStars.count=coins;this.coinStars.instanceMatrix.needsUpdate=true;
    let pcount=0;
    for(const p of this.particles){if(p.life<=0)continue;p.life-=dt;if(p.life<=0)continue;p.velocity.y-=dt*6;p.pos.addScaledVector(p.velocity,dt);if(moving)p.pos.z+=run.speed*dt*.55;dummy.position.copy(p.pos);dummy.rotation.set(p.life*4,p.life*7,0);dummy.scale.setScalar(p.size*Math.min(1,p.life*5));dummy.updateMatrix();this.particleMesh.setMatrixAt(pcount,dummy.matrix);this.particleMesh.setColorAt(pcount,p.color);pcount++;}
    this.particleMesh.count=pcount;this.particleMesh.instanceMatrix.needsUpdate=true;if(this.particleMesh.instanceColor)this.particleMesh.instanceColor.needsUpdate=true;
    for(let i=0;i<2;i++){
      const tr=this.trail[i];tr.mesh.visible=moving;
      if(moving){for(const p of tr.points)p.z+=run.speed*dt;tr.points.unshift(new T.Vector3(run.x+(i?-.2:.2),.12+run.y,0));if(tr.points.length>26)tr.points.pop();}
      const a=tr.mesh.geometry.attributes.position;for(let j=0;j<26;j++){const p=tr.points[Math.min(j,tr.points.length-1)]||root.position;const width=(rush?.16:.035)*(1-j/26);a.setXYZ(j*2,p.x-width,p.y,p.z);a.setXYZ(j*2+1,p.x+width,p.y,p.z);}a.needsUpdate=true;tr.mesh.material.opacity=rush?.65:.25;
    }
    this.renderer.render(this.scene,this.camera);
  }
}
