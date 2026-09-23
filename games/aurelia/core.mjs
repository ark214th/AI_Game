import {COURSES,TYPES,phraseRows} from './courses.mjs?v=2';
export const SAVE_KEY = 'aurelia.save.v1';
export const GATES = [650, 1450, 2500];
export const ZONES = ['翠緑の参道', '水鏡の神殿', '暁の聖域'];
export const UPGRADE_DEFS = [
  {id:'flame',name:'星火のランタン',icon:'☀',text:'灯火の最大量 +14',detail:'長く走るための、旅の灯り。'},
  {id:'guard',name:'守護の外套',icon:'◇',text:'衝突時の灯火消費 −1.5',detail:'3段階ごとに耐久力も +1。'},
  {id:'magnet',name:'引力の護符',icon:'◎',text:'結晶を引き寄せる範囲が拡大',detail:'少し離れた結晶も拾える。'},
  {id:'fortune',name:'黄金の羅針盤',icon:'✧',text:'持ち帰る結晶 +10%',detail:'次の強化を少し早く。'}
];
export const BOONS = [
  {id:'sustain',name:'泉の祝福',icon:'≈',text:'この探索中、灯火の消費が20%減る。'},
  {id:'resonance',name:'疾風の祝福',icon:'ϟ',text:'この探索中、共鳴が35%速くたまる。'},
  {id:'treasure',name:'黄金の祝福',icon:'✧',text:'この探索で持ち帰る結晶が30%増える。'}
];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const integer=(v,max=1e8)=>Number.isFinite(v)?clamp(Math.floor(v),0,max):0;
export function normalizeSave(raw={}) {
  if(!raw||typeof raw!=='object'||Array.isArray(raw))raw={};
  const s={version:1,wallet:integer(raw.wallet),best:integer(raw.best),runs:integer(raw.runs),clears:integer(raw.clears),tutorial:raw.tutorial===true,levels:{},settings:{sound:raw.settings?.sound!==false,quality:['auto','high','low'].includes(raw.settings?.quality)?raw.settings.quality:'auto',buttons:raw.settings?.buttons===true}};
  for(const u of UPGRADE_DEFS)s.levels[u.id]=integer(raw.levels?.[u.id],12);
  return s;
}
export function upgradeCost(level){return Math.round(45*Math.pow(1.47,level));}
export function stats(save){return {energy:100+save.levels.flame*14,hp:3+Math.floor(save.levels.guard/3),damage:Math.max(6,24-save.levels.guard*1.5),magnet:.55+save.levels.magnet*.045,fortune:1+save.levels.fortune*.1};}
export function purchase(save,id){if(!UPGRADE_DEFS.some(u=>u.id===id))return false;const lv=save.levels[id],cost=upgradeCost(lv);if(lv>=12||save.wallet<cost)return false;save.wallet-=cost;save.levels[id]++;return true;}
export function rng(seed){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export const TRAINING_END=145;
export const PICKUPS=new Set(['coin','flame','relic']);
export class Run {
  constructor(save,seed=Date.now()){
    this.save=save;this.stat=stats(save);this.random=rng(seed);this.seed=seed;
    Object.assign(this,{distance:0,time:0,lane:1,x:0,y:0,vy:0,slide:0,energy:this.stat.energy,hp:this.stat.hp,speed:14,charge:0,boost:0,invincible:0,combo:0,maxCombo:0,coins:0,gems:0,perfect:0,dodges:0,zone:0,momentum:0,stumble:0,hitStop:0,jumpBuffer:0,airClean:false,lastMove:-9,lastAction:-9,gate:0,reason:'',settled:false,nextID:1,nextSection:1,previousCourse:'',practiceFailures:0});
    this.state='running';this.events=[];this.objects=[];this.rows=[];this.sections=new Map();this.boons={sustain:0,resonance:0,treasure:0};this.training=!save.tutorial;
    const first=this.training?45:32,spacing=this.training?40:26;
    for(const lane of [0,1,2]){this.add('hurdle',lane,first);this.add('arch',lane,first+spacing);}
    this.add('block',0,first+spacing*2);this.add('block',1,first+spacing*2);
    for(const z of [first-14,first-10,first-6,first+spacing-14,first+spacing-10])this.add('coin',1,z);
    this.add('flame',2,first+spacing*2+12);
    this.nextChunk=first+spacing*2+40;this.generate();
  }
  emit(type,data={}){this.events.push({type,...data});}
  add(type,lane,z,extra={}){
    const o={id:this.nextID++,type,lane,z,done:false,height:type==='flame'?1.5:1.13,...extra};this.objects.push(o);
    if(!PICKUPS.has(type)){let row=this.rows.find(r=>r.z===z);if(!row){row={z,objects:[],done:false};this.rows.push(row);}row.objects.push(o);}
    return o;
  }
  generate(){
    while(this.nextChunk<this.distance+180){
      const start=this.nextChunk,zone=start<650?0:start<1450?1:2;
      const available=COURSES.filter(c=>c.minZone<=zone&&c.id!==this.previousCourse);
      const course=available[Math.floor(this.random()*available.length)];
      const end=start+(course.rows.length-1)*course.spacing;
      const gate=GATES.find(g=>start<g+35&&end+40>g-35);
      if(gate!==undefined){this.nextChunk=gate+45;continue;}
      const id=this.nextSection++,mirror=this.random()<.5;
      const section={id,course:course.id,start,end:end+38,risk:!!course.risk,cleared:0,failed:false,required:course.rows.length};this.sections.set(id,section);
      for(const row of phraseRows(course,start,mirror)){
        for(let lane=0;lane<3;lane++)if(row.layout[lane]!=='_')this.add(TYPES[row.layout[lane]],lane,row.z,{section:id,risk:!!course.risk});
        // The floor trail shows the intended movement before the obstacle arrives.
        for(const offset of [-13,-9,-5])this.add('coin',row.route,row.z+offset,{section:id,trail:true});
        if(row.layout[row.route]==='h'||row.layout[row.route]==='g')this.add('coin',row.route,row.z+1,{height:2.55,section:id});
      }
      if(course.risk){const lane=mirror?2:0;this.add('relic',lane,end+12,{section:id,height:1.3});}
      // Recovery has no hazards. The supply line continues from the last action.
      const lane=mirror?2-course.rows.at(-1)[1]:course.rows.at(-1)[1];
      this.add('flame',lane,end+27,{section:id});for(const dz of [22,31,36])this.add('coin',lane,end+dz,{section:id});
      this.nextChunk=end+62;this.previousCourse=course.id;
    }
  }
  input(action){
    if(this.state!=='running')return false;
    if(action==='left'||action==='right'){
      const next=clamp(this.lane+(action==='left'?-1:1),0,2);if(next===this.lane)return false;
      const from=this.lane;this.lane=next;this.lastMove=this.time;this.emit('move',{side:next-from});
    }else if(action==='jump'){
      if(this.y>.08){if(this.vy<0)this.jumpBuffer=.14;return false;}
      this.slide=0;this.y=.01;this.vy=8.5;this.airClean=false;this.lastAction=this.time;this.emit('jump');
    }else if(action==='slide'){
      if(this.y>.05){this.vy=-13;this.emit('dive');}this.slide=.78;this.lastAction=this.time;this.emit('slide');
    }else if(action==='boost'){
      if(this.charge<100||this.boost>0)return false;this.charge=0;this.boost=4.8;this.momentum=1;this.energy=Math.min(this.stat.energy,this.energy+12);this.emit('boost');
    }else return false;
    return true;
  }
  gainCharge(amount){const prev=this.charge;this.charge=clamp(this.charge+amount*(1+.35*this.boons.resonance),0,100);if(prev<100&&this.charge>=100)this.emit('ready');}
  success(kind,o){
    this.combo++;this.maxCombo=Math.max(this.combo,this.maxCombo);this.momentum=clamp(this.momentum+.24,0,1);
    if(kind==='perfect'){this.perfect++;this.energy=Math.min(this.stat.energy,this.energy+5);this.gainCharge(13);if(o.type==='gap'||o.type==='hurdle')this.airClean=true;}
    else{this.dodges++;this.gainCharge(8);}
    this.emit(kind,{combo:this.combo,obstacle:o.type,id:o.id,side:Math.sign(this.x-(o.lane-1))||1});
  }
  hit(o){
    if(this.invincible>0||this.boost>0)return false;
    this.combo=0;this.momentum=0;this.stumble=.78;this.hitStop=.065;this.airClean=false;
    const event={id:o.id,obstacle:o.type,side:Math.sign(this.x-(o.lane-1))||((o.id%2)?1:-1)};
    if(this.training&&this.distance<TRAINING_END){this.practiceFailures++;this.invincible=1.2;this.emit('practice',event);return true;}
    this.hp--;this.energy=Math.max(0,this.energy-this.stat.damage);this.invincible=1.3;this.emit('hit',event);
    if(this.hp<=0)this.end(o.type==='gap'?'足場の切れ目に飲まれた':'遺跡の障害物に阻まれた',false,o.type);
    return true;
  }
  crossRow(row){
    row.done=true;for(const o of row.objects)o.done=true;
    const section=this.sections.get(row.objects[0]?.section);
    const nearest=[...row.objects].sort((a,b)=>Math.abs(this.x-a.lane+1)-Math.abs(this.x-b.lane+1))[0];
    const dx=Math.abs(this.x-(nearest.lane-1));
    if(this.boost>0){
      for(const o of row.objects)if(Math.abs(this.x-(o.lane-1))<1.5){o.broken=true;this.emit('smash',{id:o.id,obstacle:o.type,lane:o.lane,z:o.z});}
      return;
    }
    if(dx<.61){
      const ok=((nearest.type==='hurdle'||nearest.type==='gap')&&this.y>.70)||(nearest.type==='arch'&&this.slide>0&&this.y<.25);
      if(ok){this.success('perfect',nearest);if(section)section.cleared++;}
      else{if(section)section.failed=true;this.hit(nearest);}
    }else{
      if(!section?.risk&&section)section.cleared++;
      if(dx<1.42&&this.time-this.lastMove<.43)this.success('dodge',nearest);
    }
  }
  step(dt){
    if(this.state!=='running')return;dt=clamp(dt,0,.05);
    if(this.hitStop>0){this.hitStop=Math.max(0,this.hitStop-dt);return;}
    this.time+=dt;this.stumble=Math.max(0,this.stumble-dt);this.momentum=Math.max(0,this.momentum-dt*.025);this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);
    const target=14+Math.min(4,this.distance*.0022)+this.momentum*2.6+(this.boost>0?6:0);
    this.speed=target*(this.stumble>0?1-.42*Math.min(1,this.stumble/.5):1);
    const before=this.distance;this.distance+=this.speed*dt;this.x+=(this.lane-1-this.x)*Math.min(1,dt*18);
    this.vy-=22*dt;this.y+=this.vy*dt;
    if(this.y<0){const landed=this.vy< -2;this.y=0;this.vy=0;if(landed){this.emit('land',{clean:this.airClean});this.airClean=false;if(this.jumpBuffer>0){this.jumpBuffer=0;this.input('jump');}}}
    this.slide=Math.max(0,this.slide-dt);this.boost=Math.max(0,this.boost-dt);this.invincible=Math.max(0,this.invincible-dt);
    // Every attempt has the same warm-up budget; finishing the tutorial is never a penalty.
    if(this.distance>TRAINING_END)this.energy-=dt*(2.2+this.zone*.12)*Math.pow(.8,this.boons.sustain)*(this.boost>0?.25:1);
    for(const row of this.rows){if(!row.done&&before<row.z&&this.distance>=row.z){this.crossRow(row);if(this.state!=='running')break;}}
    if(this.state!=='running')return;
    for(const o of this.objects){
      if(o.done||!PICKUPS.has(o.type))continue;
      const dz=o.z-this.distance,dx=Math.abs(this.x-(o.lane-1)),section=this.sections.get(o.section);
      const unlocked=o.type!=='relic'||(section&&!section.failed&&section.cleared>=section.required);
      const reach=o.type==='coin'?this.stat.magnet:.65;
      const closeVertically=Math.abs(1.13+this.y-o.height)<.9||this.boost>0;
      if(unlocked&&dz<2.4&&dz> -1.3&&dx<reach&&closeVertically){
        o.done=true;const event={id:o.id,lane:o.lane,z:o.z,height:o.height};
        if(o.type==='coin'){const value=2+Math.floor(this.combo/5);this.coins+=value;this.gems++;this.gainCharge(2.5);this.emit('coin',{...event,value});}
        else if(o.type==='flame'){this.energy=Math.min(this.stat.energy,this.energy+12);this.emit('flame',event);}
        else{this.coins+=30;this.energy=Math.min(this.stat.energy,this.energy+20);this.boost=Math.max(this.boost,3.2);this.momentum=1;this.emit('relic',event);this.emit('boost',{automatic:true});}
      }
      if(dz< -2)o.done=true;
    }
    this.objects=this.objects.filter(o=>o.z>this.distance-18);this.rows=this.rows.filter(r=>r.z>this.distance-18);
    for(const [id,s]of this.sections)if(s.end<this.distance-20)this.sections.delete(id);
    if(this.energy<=0){this.energy=0;this.end('ランタンの灯火が尽きた',false,'exhausted');return;}
    if(this.gate<GATES.length&&this.distance>=GATES[this.gate]){
      this.distance=GATES[this.gate];this.gate++;
      if(this.gate===GATES.length){this.end('暁の秘宝を持ち帰った',true,'victory');return;}
      this.zone=this.gate;this.energy=Math.min(this.stat.energy,this.energy+35);this.hp=Math.min(this.stat.hp,this.hp+1);this.state='blessing';this.emit('gate',{zone:this.zone});
    }
    this.generate();
  }
  chooseBoon(id){if(this.state!=='blessing'||!BOONS.some(b=>b.id===id))return false;this.boons[id]++;this.state='running';this.emit('blessing',{id});return true;}
  end(reason,won=false,cause='retire'){if(this.state==='ended')return;this.state='ended';this.reason=reason;this.won=won;this.endCause=cause;this.emit('end',{won,cause});}
  reward(){const exploration=Math.floor(this.distance/12),challenge=(this.gems>=24?25:0)+(this.perfect>=8?35:0),clear=this.won?180:0;const base=this.coins+exploration+challenge+clear;return {coins:this.coins,exploration,challenge,clear,bonus:Math.floor(base*(this.stat.fortune+.3*this.boons.treasure-1)),total:Math.floor(base*(this.stat.fortune+.3*this.boons.treasure))};}
  settle(){if(this.settled)return null;this.settled=true;const reward=this.reward();const previous=this.save.best;this.save.wallet+=reward.total;this.save.best=Math.max(this.save.best,Math.floor(this.distance));this.save.runs++;if(this.won)this.save.clears++;if(this.distance>=TRAINING_END)this.save.tutorial=true;return {...reward,record:Math.floor(this.distance)>previous};}
}
