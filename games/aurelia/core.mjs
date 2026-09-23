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
export function stats(save){return {energy:100+save.levels.flame*14,hp:2+Math.floor(save.levels.guard/3),damage:Math.max(6,24-save.levels.guard*1.5),magnet:.55+save.levels.magnet*.045,fortune:1+save.levels.fortune*.1};}
export function purchase(save,id){if(!UPGRADE_DEFS.some(u=>u.id===id))return false;const lv=save.levels[id],cost=upgradeCost(lv);if(lv>=12||save.wallet<cost)return false;save.wallet-=cost;save.levels[id]++;return true;}
export function rng(seed){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export class Run {
  constructor(save,seed=Date.now()){
    this.save=save;this.stat=stats(save);this.random=rng(seed);this.seed=seed;
    this.distance=0;this.time=0;this.lane=1;this.x=0;this.y=0;this.vy=0;this.slide=0;this.energy=this.stat.energy;this.hp=this.stat.hp;this.speed=13;
    this.charge=0;this.boost=0;this.invincible=0;this.combo=0;this.maxCombo=0;this.coins=0;this.gems=0;this.perfect=0;this.dodges=0;this.zone=0;
    this.state='running';this.events=[];this.objects=[];this.nextRow=210;this.nextID=1;this.boons={sustain:0,resonance:0,treasure:0};this.gate=0;this.reason='';this.settled=false;this.lastMove=-9;this.training=!save.tutorial;this.practiceFailures=0;
    this.add('hurdle',1,65);this.add('arch',1,115);this.add('block',1,165);
    for(const d of [42,47,52,86,91,96,136,141,146])this.add('coin',1,d);
    this.add('flame',0,178);this.add('coin',0,172);this.add('coin',2,172);
    this.generate();
  }
  emit(type,data={}){this.events.push({type,...data});}
  add(type,lane,z,extra={}){const o={id:this.nextID++,type,lane,z,done:false,...extra};this.objects.push(o);return o;}
  generate(){
    while(this.nextRow<this.distance+180){
      let z=this.nextRow;
      if(GATES.some(g=>Math.abs(z-g)<42)){this.nextRow+=26;continue;}
      const zone=z<650?0:z<1450?1:2;
      const lane=Math.floor(this.random()*3),r=this.random();
      let type=r<.30?'hurdle':r<.56?'arch':r<.80?'block':'gap';
      this.add(type,lane,z);
      // Keep at least one open lane, and 1.1+ seconds between demanding rows.
      if(zone>0&&this.random()<.38+zone*.10)this.add(this.random()<.6?'block':type,(lane+1+Math.floor(this.random()*2))%3,z);
      // The obstacle lane has a reward just after the obstacle: a deliberate risk.
      const rewardLane=type==='block'?(lane+1)%3:lane;
      for(let i=0;i<3;i++)this.add('coin',rewardLane,z+5+i*3,{high:type==='gap'||type==='hurdle'});
      if(this.random()<.40)this.add('flame',(lane+2)%3,z+12);
      this.nextRow+=28-zone*2+this.random()*10;
    }
  }
  input(action){
    if(this.state!=='running')return false;
    if(action==='left'||action==='right'){const next=clamp(this.lane+(action==='left'?-1:1),0,2);if(next===this.lane)return false;this.lane=next;this.lastMove=this.time;this.emit('move');}
    else if(action==='jump'){if(this.y>.08)return false;this.slide=0;this.y=.01;this.vy=8.5;this.emit('jump');}
    else if(action==='slide'){if(this.y>.05){this.vy=-13;this.emit('dive');}this.slide=.86;this.emit('slide');}
    else if(action==='boost'){if(this.charge<100||this.boost>0)return false;this.charge=0;this.boost=4.8;this.energy=Math.min(this.stat.energy,this.energy+12);this.emit('boost');}
    return true;
  }
  gainCharge(amount){const prev=this.charge;this.charge=clamp(this.charge+amount*(1+.35*this.boons.resonance),0,100);if(prev<100&&this.charge>=100)this.emit('ready');}
  success(kind){
    this.combo++;this.maxCombo=Math.max(this.combo,this.maxCombo);
    if(kind==='perfect'){this.perfect++;this.energy=Math.min(this.stat.energy,this.energy+5);this.gainCharge(14);}
    else{this.dodges++;this.gainCharge(7);}
    this.emit(kind,{combo:this.combo});
  }
  hit(type){
    if(this.invincible>0||this.boost>0)return;
    this.combo=0;
    if(this.training&&this.distance<190){this.practiceFailures++;this.invincible=1.1;this.emit('practice',{obstacle:type});return;}
    this.hp--;this.energy=Math.max(0,this.energy-this.stat.damage);this.invincible=1.6;this.emit('hit',{obstacle:type});
    if(this.hp<=0)this.end(type==='gap'?'足場の切れ目に飲まれた':'遺跡の障害物に阻まれた');
  }
  step(dt){
    if(this.state!=='running')return;
    dt=clamp(dt,0,.05);this.time+=dt;
    this.speed=13+Math.min(5.8,this.distance*.0027)+(this.boost>0?6:0);
    const before=this.distance;this.distance+=this.speed*dt;
    this.x+=(this.lane-1-this.x)*Math.min(1,dt*16);
    this.vy-=22*dt;this.y+=this.vy*dt;if(this.y<0){if(this.vy< -2)this.emit('land');this.y=0;this.vy=0;}
    this.slide=Math.max(0,this.slide-dt);this.boost=Math.max(0,this.boost-dt);this.invincible=Math.max(0,this.invincible-dt);
    if(!this.training||this.distance>190)this.energy-=dt*(3.0+this.zone*.15)*Math.pow(.8,this.boons.sustain)*(this.boost>0?.3:1);
    for(const o of this.objects){
      if(o.done)continue;
      const dz=o.z-this.distance,dx=Math.abs(this.x-(o.lane-1));
      if(o.type==='coin'||o.type==='flame'){
        const reach=o.type==='coin'?this.stat.magnet:.63;
        if(dz<1.8&&dz> -1.2&&dx<reach){o.done=true;if(o.type==='coin'){const value=2+Math.floor(this.combo/5);this.coins+=value;this.gems++;this.gainCharge(3);this.emit('coin',{id:o.id,value});}else{this.energy=Math.min(this.stat.energy,this.energy+12);this.emit('flame',{id:o.id});}}
        if(dz< -2)o.done=true;
      }else if(before<o.z&&this.distance>=o.z){
        o.done=true;
        if(dx<.61){
          const cleared=this.boost>0||(o.type==='hurdle'&&this.y>.7)||(o.type==='gap'&&this.y>.6)||(o.type==='arch'&&this.slide>0&&this.y<.25);
          if(cleared){if(this.boost<=0)this.success('perfect');else this.emit('smash',{id:o.id});}
          else this.hit(o.type);
        }else if(dx<1.45&&this.time-this.lastMove<.4)this.success('dodge');
        if(this.state!=='running')break;
      }
    }
    this.objects=this.objects.filter(o=>o.z>this.distance-18);
    if(this.state!=='running')return;
    if(this.energy<=0){this.energy=0;this.end('ランタンの灯火が尽きた');return;}
    if(this.gate<GATES.length&&this.distance>=GATES[this.gate]){
      this.distance=GATES[this.gate];this.gate++;
      if(this.gate===GATES.length){this.end('暁の秘宝を持ち帰った',true);return;}
      this.zone=this.gate;this.energy=Math.min(this.stat.energy,this.energy+35);this.hp=Math.min(this.stat.hp,this.hp+1);this.state='blessing';this.emit('gate',{zone:this.zone});
    }
    this.generate();
  }
  chooseBoon(id){if(this.state!=='blessing'||!BOONS.some(b=>b.id===id))return false;this.boons[id]++;this.state='running';this.emit('blessing',{id});return true;}
  end(reason,won=false){if(this.state==='ended')return;this.state='ended';this.reason=reason;this.won=won;this.emit('end',{won});}
  reward(){const exploration=Math.floor(this.distance/12),challenge=(this.gems>=24?25:0)+(this.perfect>=8?35:0),clear=this.won?180:0;const base=this.coins+exploration+challenge+clear;return {coins:this.coins,exploration,challenge,clear,bonus:Math.floor(base*(this.stat.fortune+.3*this.boons.treasure-1)),total:Math.floor(base*(this.stat.fortune+.3*this.boons.treasure))};}
  settle(){if(this.settled)return null;this.settled=true;const reward=this.reward();const previous=this.save.best;this.save.wallet+=reward.total;this.save.best=Math.max(this.save.best,Math.floor(this.distance));this.save.runs++;if(this.won)this.save.clears++;if(this.distance>=190)this.save.tutorial=true;return {...reward,record:Math.floor(this.distance)>previous};}
}
