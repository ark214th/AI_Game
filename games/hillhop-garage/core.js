/* Hillhop Garage. World coordinates: +x forward, +y up. */
(function(root){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function rng(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
const REGIONS=[
 {name:'草原の丘',en:'MEADOW TRAIL',tag:'01',length:68000,seed:214,amp:1.4,reward:1,sky:['#a8dcd4','#eff2cf'],mountain:'#8eb9ad',far:'#b0d2bc',hill:'#79a888',grass:'#668d43',edge:'#b4c66a',soil:'#b99765',deep:'#8c724e',accent:'#dfb044',description:'風に揺れる草原を、軽やかに。',fuel:[6500,16000,26000,36500,47500,58500],gaps:[[41680,41810]],par:190},
 {name:'赤岩の峡谷',en:'COPPER CANYON',tag:'02',length:78000,seed:527,amp:1.65,reward:1.65,sky:['#eab58a','#ffdfab'],mountain:'#c08578',far:'#dda188',hill:'#c78561',grass:'#a06e47',edge:'#e5b76d',soil:'#bf7752',deep:'#8c5346',accent:'#d77d47',description:'赤い岩のあいだを、勢いよく。',fuel:[6200,16500,27300,38500,49800,61400,71900],gaps:[[27830,27960],[57200,57350]],par:220},
 {name:'雲上の高原',en:'SKYLINE PASS',tag:'03',length:88000,seed:841,amp:1.9,reward:2.35,sky:['#88abbf','#e3dccc'],mountain:'#8195a9',far:'#b1bbbf',hill:'#7f9c97',grass:'#638b77',edge:'#cad4ae',soil:'#96978c',deep:'#666e73',accent:'#7ea7b8',description:'雲の向こうに、まだ見ぬ道。',fuel:[5900,16400,27400,38900,50900,63200,75500,83500],gaps:[[25630,25770],[50200,50350],[70350,70500]],par:250}
];
const UPGRADES=[
 {key:'engine',name:'エンジン',icon:'⚙',detail:'短い加速で、勢いを取り戻す'},
 {key:'tires',name:'タイヤ',icon:'◎',detail:'荒れた道でも、勢いを保つ'},
 {key:'suspension',name:'サスペンション',icon:'≋',detail:'着地をやさしく、安定して'},
 {key:'tank',name:'燃料タンク',icon:'▣',detail:'燃料を増やして、もう一つ先へ'}
];
const COSTS=[120,240,450,750,1200];
const PARTS=[
 {id:'none',name:'装備なし',help:'草原の中間地点で、最初のパーツが手に入ります。'},
 {id:'arm',name:'回収アーム',help:'近くのコインや燃料に、少し手が届きやすくなります。'},
 {id:'eco',name:'エコユニット',help:'アクセルを離して走るときの燃料消費を、さらに半分に。'},
 {id:'jump',name:'ジャンプ補助',help:'長押しで、少し高く。短いジャンプの感覚はそのまま。'}
];
const PAINTS=['#f2bf4d','#e57d60','#6dafa2','#a6a1ca'];
function freshSave(){return{version:1,courseVersion:2,coins:0,upgrades:{engine:0,tires:0,suspension:0,tank:0},unlocked:0,selected:0,part:'none',parts:['none'],records:Array.from({length:4},()=>({distance:0,time:0,legacyTime:0,medals:0})),milestones:[0,0,0],runs:0,paint:0,sound:.45,music:true,shake:true,remoteSeed:24681};}
function sanitizeSave(value){
 if(!value||value.version!==1||typeof value.upgrades!=='object'||!Array.isArray(value.records))throw new Error('このゲームのセーブデータではありません。');
 const s=freshSave(),num=(v,min,max)=>Number.isFinite(v)?clamp(v,min,max):min;
 s.coins=Math.floor(num(value.coins,0,1e9));s.unlocked=Math.floor(num(value.unlocked,0,3));s.selected=Math.floor(num(value.selected,0,s.unlocked));
 for(const u of UPGRADES)s.upgrades[u.key]=Math.floor(num(value.upgrades[u.key],0,5));
 s.parts=['none'];for(const p of PARTS.slice(1))if(value.parts?.includes(p.id))s.parts.push(p.id);
 s.part=s.parts.includes(value.part)?value.part:'none';
 s.records=s.records.map((r,i)=>{const a=value.records[i]||{};const legacy=i<3&&value.courseVersion!==2;return{distance:num(a.distance,0,1e8),time:legacy?0:num(a.time,0,1e7),legacyTime:legacy?num(a.time,0,1e7):num(a.legacyTime,0,1e7),medals:Math.floor(num(a.medals,0,7))};});
 s.milestones=s.milestones.map((v,i)=>Math.floor(num(value.milestones?.[i],0,7)));
 s.runs=Math.floor(num(value.runs,0,1e7));s.paint=Math.floor(num(value.paint,0,3));s.sound=num(value.sound??.45,0,1);s.music=value.music!==false;s.shake=value.shake!==false;s.remoteSeed=Math.floor(num(value.remoteSeed??24681,1,0x7fffffff));
 return s;
}
const PROFILES=[
 [[0,0],[.2,30],[.48,-70],[.76,75],[1,0]],
 [[0,0],[.28,145],[.67,-45],[1,0]],
 [[0,0],[.15,25],[.25,-18],[.36,38],[.47,-16],[.59,32],[.73,-30],[.86,43],[1,0]],
 [[0,0],[.19,65],[.52,-155],[.84,65],[1,0]],
 [[0,0],[.22,-45],[.61,175],[.8,140],[1,0]],
 [[0,0],[.28,110],[.76,-115],[1,0]],
 [[0,0],[.18,80],[.35,80],[.63,-30],[.83,-30],[1,0]]
];
const ORDERS=[[0,0,1,2,5,3,0,4,2,5,0,1,3,2,4,5,0,3],[0,1,3,2,4,5,6,3,2,4,0,5,6,2,3,4,1,5,0,3],[0,4,5,2,3,6,4,0,3,5,4,2,6,3,5,4,2,0,4,5,3,6]];
class Track{
 constructor(index=0,seed=0){
  this.index=index;this.endless=index===3;this.region=REGIONS[Math.min(index,2)];this.seed=seed||this.region.seed;this.length=this.endless?Infinity:this.region.length;this.nodes=[];this.gaps=[];this.items=[];this.props=[];this.platforms=[];this.built=0;this.random=rng(this.seed);this.itemId=0;
  if(this.endless)this.extend(50000);else this.buildFinite();
 }
 addSection(start,width,profile,amp=1){
  for(let j=0;j<profile.length;j++){if(this.nodes.length&&j===0)continue;this.nodes.push({x:start+profile[j][0]*width,y:185+profile[j][1]*amp});}
 }
 buildFinite(){
  this.nodes=[{x:-1000,y:185},{x:600,y:185}];let x=600,n=0;
  while(x<this.length+2500){const width=2350+(n%3)*200;this.addSection(x,width,PROFILES[ORDERS[this.index][n%ORDERS[this.index].length]],n===0?.45:this.region.amp);x+=width;n++;}
  this.built=x;const joins=this.nodes.filter(n=>Math.abs(n.y-185)<.001);this.gaps=this.region.gaps.map(g=>{const center=(g[0]+g[1])/2,join=joins.reduce((best,n)=>Math.abs(n.x-center)<Math.abs(best.x-center)?n:best),half=(g[1]-g[0])/2;return{a:join.x-half,b:join.x+half};});
  this.populate(800,this.length-400,rng(this.seed+357));
  for(const x of this.region.fuel)this.addItem('fuel',x,this.height(x)+47,this.index===0?18:20);
  this.props.push({type:'start',x:420},{type:'finish',x:this.length});
 }
 extend(until){
  if(!this.nodes.length)this.nodes=[{x:-1000,y:185},{x:600,y:185}],this.built=600;
  const start=this.built;let count=Math.floor(start/2800);
  while(this.built<until){const width=2450+this.random()*400;const startX=this.built;this.addSection(startX,width,PROFILES[Math.floor(this.random()*PROFILES.length)],1.45+Math.min(.45,count*.012));if(count>7&&count%10===7)this.gaps.push({a:startX-65,b:startX+70});this.built+=width;count++;}
  if(this.built>start){this.populate(Math.max(800,start+300),this.built-500,this.random);for(let x=Math.max(6200,Math.ceil(start/11000)*11000);x<this.built-400;x+=11000)this.addItem('fuel',x,this.height(x)+47,20);}
 }
 rawHeight(x){
  const a=this.nodes;let lo=0,hi=a.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(a[m].x>x)hi=m;else lo=m;}
  const p=a[lo],q=a[hi];const t=clamp((x-p.x)/(q.x-p.x),0,1);return lerp(p.y,q.y,(1-Math.cos(t*Math.PI))/2);
 }
 height(x){return this.rawHeight(x);}
 slope(x){return Math.atan2(this.height(x+12)-this.height(x-12),24);}
 gapAt(x){return this.gaps.find(g=>x>g.a&&x<g.b);}
 addItem(type,x,y,value=1){if(!this.gapAt(x)||type==='coin')this.items.push({id:this.itemId++,type,x,y,value,taken:false,phase:this.random()*6.28});}
 populate(from,to,rand){
  for(let x=from;x<to;x+=620+rand()*250){const high=rand()>.63;for(let k=0;k<6;k++){let px=x+k*43;let py=this.height(px)+48+(high?Math.sin(k/5*Math.PI)*95:Math.sin(k/5*Math.PI)*12);this.addItem('coin',px,py,Math.max(1,Math.round(this.region.reward)));}}
  for(let x=from+2500;x<to;x+=5700+rand()*1400){if(!this.gaps.some(g=>Math.abs(g.a-x)<1300))this.addItem(rand()>.5?'turbo':'magnet',x,this.height(x)+65);}
  for(let x=from;x<to;x+=150+rand()*180)this.props.push({type:rand()>.74?'tree':rand()>.65?'rock':'grass',x,size:.6+rand()*.8,seed:rand()});
  for(let x=from+1800;x<to;x+=4300)this.props.push({type:'sign',x,number:Math.floor(x/10)});
  for(let x=from+7100;x<to;x+=11500){const y=this.height(x)+120;this.platforms.push({a:x,b:x+280,y});for(let k=0;k<5;k++)this.addItem('coin',x+30+k*50,y+45,3);}
 }
 surface(x,previousY=Infinity){
  for(const p of this.platforms)if(x>p.a&&x<p.b&&previousY>=p.y+18)return{height:p.y,slope:0,platform:p};
  if(this.gapAt(x))return null;return{height:this.height(x),slope:this.slope(x)};
 }
}
class Run{
 constructor(index,save,seed){
  this.index=index;this.track=new Track(index,seed);this.upgrades={...save.upgrades};this.part=save.part;this.maxFuel=100+save.upgrades.tank*12;this.fuel=this.maxFuel;
  this.x=250;this.y=this.track.height(this.x)+23;this.v=0;this.vx=0;this.vy=0;this.angle=0;this.omega=0;this.grounded=true;this.groundAge=1;this.airAge=0;this.coyote=.1;this.jumpBuffer=0;this.jumpHold=0;this.canHold=false;this.jumpWas=false;this.brakeAge=0;
  this.time=0;this.maxX=this.x;this.distance=0;this.coins=0;this.pickupCoins=0;this.nice=0;this.lastNiceX=-1000;this.turbo=0;this.magnet=0;this.stopped=0;this.flip=0;this.result=null;this.events=[];this.lastDust=0;this.landed=0;this.nextMilestone=0;this.bankCoins=0;this.savedDistance=0;this.collectedCoins=0;this.totalCoins=this.track.items.filter(i=>i.type==='coin').length;this.prevY=this.y;
 }
 emit(type,data={}){this.events.push({type,...data});}
 update(dt,input={}){
  if(this.result)return;this.time+=dt;this.landed=Math.max(0,this.landed-dt);this.turbo=Math.max(0,this.turbo-dt);this.magnet=Math.max(0,this.magnet-dt);this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);
  const u=this.upgrades,gas=!!input.gas&&this.fuel>0,brake=!!input.brake,jump=!!input.jump;
  if(jump&&!this.jumpWas)this.jumpBuffer=.15;this.jumpWas=jump;
  this.fuel=Math.max(0,this.fuel-dt*(gas?8.5:1*(this.part==='eco'?.5:1)));
  const ground=this.track.surface(this.x,this.y+3),slope=ground?ground.slope:0;
  if(this.grounded&&ground&&this.flip<=0){
   this.groundAge+=dt;this.coyote=.11;this.v=clamp(this.v,-80,880);
   const driveSpeed=600+u.engine*12+(this.turbo>0?85:0);
   const maxSpeed=780+u.engine*8+(this.turbo>0?60:0);
   const engine=gas&&this.v<driveSpeed?980*(1+u.engine*.08)*(1-.45*clamp(this.v/driveSpeed,0,1))*(this.turbo>0?1.3:1):0;
   const resistance=(5+Math.abs(this.v)*.045)*(this.v>=0?1:-1);
   this.v+=(engine-900*Math.sin(slope)-resistance)*dt;
   if(brake){this.brakeAge+=dt;if(this.v>5)this.v=Math.max(0,this.v-1100*dt);else if(this.brakeAge>.45&&this.fuel>0)this.v=Math.max(-70,this.v-150*dt);else this.v=0;}else this.brakeAge=0;
   if(!gas&&Math.abs(this.v)<4&&Math.abs(slope)<.1)this.v=0;
   this.v=clamp(this.v,-75,maxSpeed);this.vx=this.v*Math.cos(slope);this.vy=this.v*Math.sin(slope);
   const curve=(this.track.height(this.x+15)-2*this.track.height(this.x)+this.track.height(this.x-15))/225;
   if(this.jumpBuffer>0&&this.groundAge>.16&&this.fuel>=.8){this.launch(slope);}
   else if(!ground.platform&&curve*this.v*this.v < -780&&this.v>130){this.grounded=false;this.airAge=0;this.canHold=false;this.y+=1.5;}
   if(this.grounded){
    const oldSlope=slope;this.x+=this.vx*dt;const s=this.track.surface(this.x,this.y+20);
    if(s){this.y=s.height+23;const rough=Math.abs(angleDiff(s.slope,oldSlope));this.v*=Math.max(.97,1-rough*(rough/dt>1.3?.5:.045)*(1-u.tires*.12));}
    else{this.grounded=false;this.airAge=0;this.canHold=false;}
   }
  }else if(this.grounded&&!ground){this.grounded=false;this.airAge=0;}
  if(!this.grounded){
   this.airAge+=dt;this.coyote=Math.max(0,this.coyote-dt);
   if(this.jumpBuffer>0&&this.coyote>0&&!this.canHold&&this.fuel>=.8)this.launch(slope);
   if(this.canHold&&jump&&this.jumpHold<.24&&this.vy>0&&this.fuel>0){this.vy+=(this.part==='jump'?970:720)*dt;this.jumpHold+=dt;this.fuel=Math.max(0,this.fuel-2*dt);}else if(!jump)this.canHold=false;
   this.prevY=this.y;this.vy-=900*dt;this.vx*=Math.exp(-.012*dt);this.x+=this.vx*dt;this.y+=this.vy*dt;
   const s=this.track.surface(this.x,this.prevY+1);
   if(s&&this.y<=s.height+23&&this.prevY>=s.height-35&&this.vy-this.vx*Math.tan(s.slope)<0){
    const impact=Math.max(0,-this.vy+this.vx*Math.tan(s.slope));const difference=Math.abs(angleDiff(this.angle,s.slope));
    const nice=this.airAge>.28&&difference<.34&&impact<405&&this.x>this.lastNiceX+160&&this.vx>90;
    let penalty=clamp((impact-170)/1600,0,.24)+clamp(difference-.25,0,1.2)*.17;penalty*=1-u.suspension*.115;
    this.v=(this.vx*Math.cos(s.slope)+this.vy*Math.sin(s.slope))*(nice?1:1-penalty);this.v=Math.max(this.v,this.vx*.42);
    this.y=s.height+23;this.grounded=true;this.groundAge=0;this.canHold=false;this.landed=.24;
    if(nice){this.nice++;this.coins+=2;this.lastNiceX=this.x;this.emit('nice',{x:this.x,y:this.y+55});}
    this.emit('land',{x:this.x,y:this.y-20,power:clamp(impact/450,.2,1),nice});
    if(difference>1.65){this.flip=.9;this.v=0;this.emit('flip');}
    this.airAge=0;
   }
  }
  if(this.flip>0){this.flip-=dt;this.v=0;this.vx=0;if(ground)this.y=ground.height+23;}
  const target=this.grounded?slope:Math.atan2(this.vy,this.vx||100)*.66;
  const manual=this.grounded?0:(gas?.7:0)-(brake?1.1:0);
  this.omega+=(angleDiff(target,this.angle)*(this.grounded?70:9)+manual*8-this.omega*(this.grounded?16:5))*dt;
  this.angle+=this.omega*dt;
  if(this.x<100){this.x=100;this.v=Math.max(0,this.v);this.vx=Math.max(0,this.vx);}
  this.maxX=Math.max(this.maxX,this.x);this.distance=Math.max(0,(this.maxX-250)/10);
  if(this.track.endless&&this.x>this.track.built-10000)this.track.extend(this.track.built+25000);
  const radius=this.magnet>0?180:this.part==='arm'?72:48;
  for(const item of this.track.items){
   if(item.taken||Math.abs(item.x-this.x)>radius+35)continue;
   const dx=item.x-this.x,dy=item.y-(this.y+18);const d=Math.hypot(dx,dy);
   if(d<radius){if(this.magnet>0&&d>47){item.x=lerp(item.x,this.x,dt*9);item.y=lerp(item.y,this.y+18,dt*9);}else this.collect(item);}
  }
  if(this.grounded&&Math.abs(this.v)>65&&this.time-this.lastDust>.07){this.lastDust=this.time;this.emit('dust',{x:this.x-35,y:this.y-21,speed:this.v});}
  if(this.fuel<=0&&Math.hypot(this.vx,this.vy)<9)this.stopped+=dt;else this.stopped=0;
  if(this.y<this.track.height(this.x)-600)this.end('fall');
  else if(this.stopped>2)this.end('fuel');
  else if(this.x>=this.track.length)this.end('clear');
 }
 launch(slope){this.grounded=false;this.groundAge=0;this.airAge=0;this.coyote=0;this.jumpBuffer=0;this.jumpHold=0;this.canHold=true;this.vy=Math.max(0,this.vy*.35)+308;this.vx=Math.max(this.vx,30);this.fuel-=.8;this.y+=2;this.emit('jump',{x:this.x,y:this.y-20});}
 collect(item){item.taken=true;if(item.type==='coin'){this.coins+=item.value;this.pickupCoins+=item.value;this.collectedCoins++;}else if(item.type==='fuel')this.fuel=Math.min(this.maxFuel,this.fuel+item.value);else if(item.type==='turbo')this.turbo=4;else if(item.type==='magnet')this.magnet=8;this.emit('pickup',{item});}
 end(reason){if(this.result)return;this.result={reason,distance:this.distance,time:this.time,fuel:this.fuel,coins:this.coins};this.emit('end',{reason});}
}
function bankProgress(run,save){
 const gained=Math.max(0,run.coins-run.bankCoins);save.coins+=gained;run.bankCoins=run.coins;
 const rewardRate=run.track.region.reward;
 const distanceSteps=Math.floor(run.distance/100),oldSteps=Math.floor(run.savedDistance/100);const distanceReward=Math.max(0,distanceSteps-oldSteps)*Math.round(2*rewardRate);save.coins+=distanceReward;run.savedDistance=run.distance;
 save.records[run.index].distance=Math.max(save.records[run.index].distance,run.distance);
 const bonuses=[];
 if(run.index<3){for(let i=0;i<3;i++){const bit=1<<i;if(run.x>=run.track.length*([.25,.5,.75][i])&&!(save.milestones[run.index]&bit)){save.milestones[run.index]|=bit;const reward=60+run.index*40;save.coins+=reward;bonuses.push({text:`新しい目印に到達！ +${reward}`,value:reward});}}
 if(run.index===0&&run.x>=run.track.length*.5&&!save.parts.includes('arm')){save.parts.push('arm');if(save.part==='none')save.part='arm';bonuses.push({text:'回収アームを手に入れた！',value:0});}}
 return{gained,distanceReward,bonuses};
}
function finishRun(run,save){
 const oldBest=save.records[run.index].distance;const bank=bankProgress(run,save);let bonus=0,newRegion=false;const awards=[];
 if(run.result?.reason==='clear'){
  const r=save.records[run.index];let earned=1;if(run.collectedCoins>=run.totalCoins*.6)earned|=2;if(run.fuel>=run.maxFuel*.2)earned|=4;
  const newBits=earned&~r.medals;for(let i=0;i<3;i++)if(newBits&(1<<i)){bonus+=80*(run.index+1);awards.push(['完走メダル','回収メダル','燃費メダル'][i]);}r.medals|=earned;r.time=r.time?Math.min(r.time,run.time):run.time;
  if(save.unlocked<=run.index){save.unlocked=Math.min(3,run.index+1);newRegion=true;bonus+=100*(run.index+1);}
  const part=run.index===0?'eco':run.index===1?'jump':null;if(part&&!save.parts.includes(part))save.parts.push(part);
 }
 save.coins+=bonus;save.runs++;return{...bank,bonus,awards,newRegion,record:run.distance>oldBest+1};
}
const api={clamp,lerp,angleDiff,rng,REGIONS,UPGRADES,COSTS,PARTS,PAINTS,freshSave,sanitizeSave,Track,Run,bankProgress,finishRun};root.Hillhop=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
