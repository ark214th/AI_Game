/* Hillhop Garage 2. World coordinates: +x forward, +y up. */
(function(root){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function rng(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
const REGIONS=[
 {name:'草原の丘',en:'MEADOW TRAIL',tag:'01',length:48000,seed:214,amp:1.4,reward:1,sky:['#a8dcd4','#eff2cf'],mountain:'#8eb9ad',far:'#b0d2bc',hill:'#79a888',grass:'#668d43',edge:'#b4c66a',soil:'#b99765',deep:'#8c724e',accent:'#dfb044',description:'風に揺れる草原を、軽やかに。'},
 {name:'赤岩の峡谷',en:'COPPER CANYON',tag:'02',length:58000,seed:527,amp:1.65,reward:1.65,sky:['#eab58a','#ffdfab'],mountain:'#c08578',far:'#dda188',hill:'#c78561',grass:'#a06e47',edge:'#e5b76d',soil:'#bf7752',deep:'#8c5346',accent:'#d77d47',description:'赤い岩のあいだを、勢いよく。'},
 {name:'雲上の高原',en:'SKYLINE PASS',tag:'03',length:68000,seed:841,amp:1.9,reward:2.35,sky:['#88abbf','#e3dccc'],mountain:'#8195a9',far:'#b1bbbf',hill:'#7f9c97',grass:'#638b77',edge:'#cad4ae',soil:'#96978c',deep:'#666e73',accent:'#7ea7b8',description:'雲の向こうに、まだ見ぬ道。'}
];
const UPGRADES=[
 {key:'engine',name:'エンジン',icon:'⚙',detail:'助走を短く、狙った速度へ'},
 {key:'tires',name:'タイヤ',icon:'◎',detail:'谷底の荒れ道で減速を抑える'},
 {key:'suspension',name:'サスペンション',icon:'≋',detail:'着地の失敗を小さく、成功を広く'},
 {key:'tank',name:'燃料タンク',icon:'▣',detail:'燃料を増やして、もう一つ先へ'}
];
const MAX_LEVEL=20;
const COSTS=Array.from({length:MAX_LEVEL},(_,i)=>i<5?[120,240,450,750,1200][i]:1200+180*(i-5));
const tankCapacity=level=>100+12*level+1.8*Math.max(0,level-5)**2;
const handlingLevel=level=>level<=5?level:5+(level-5)*.15;
const PARTS=[
 {id:'none',name:'装備なし',help:'草原の中間地点で、最初のパーツが手に入ります。'},
 {id:'arm',name:'回収アーム',help:'コインと地上の燃料を広く回収。空中の燃料は自分で狙います。'},
 {id:'eco',name:'エコユニット',help:'アクセルを離している間の燃料消費を15%軽減します。'},
 {id:'jump',name:'ジャンプ補助',help:'長押しで、少し高く。短いジャンプの感覚はそのまま。'}
];
const PAINTS=['#f2bf4d','#e57d60','#6dafa2','#a6a1ca'];
function freshSave(){return{version:1,gameId:'hillhop-garage-2',courseVersion:1,coins:0,upgrades:{engine:0,tires:0,suspension:0,tank:0},unlocked:0,selected:0,part:'none',parts:['none'],records:Array.from({length:4},()=>({distance:0,time:0,legacyTime:0,medals:0})),milestones:[0,0,0],runs:0,paint:0,sound:.45,music:true,shake:true,remoteSeed:24681};}
function sanitizeSave(value){
 if(!value||value.gameId!=='hillhop-garage-2'||value.version!==1||typeof value.upgrades!=='object'||!Array.isArray(value.records))throw new Error('HILLHOP GARAGE 2 のセーブデータを選んでください。');
 const s=freshSave(),num=(v,min,max)=>Number.isFinite(v)?clamp(v,min,max):min;
 s.coins=Math.floor(num(value.coins,0,1e9));s.unlocked=Math.floor(num(value.unlocked,0,3));s.selected=Math.floor(num(value.selected,0,s.unlocked));
 for(const u of UPGRADES)s.upgrades[u.key]=Math.floor(num(value.upgrades[u.key],0,MAX_LEVEL));
 s.parts=['none'];for(const p of PARTS.slice(1))if(value.parts?.includes(p.id))s.parts.push(p.id);
 s.part=s.parts.includes(value.part)?value.part:'none';
 s.records=s.records.map((r,i)=>{const a=value.records[i]||{};const legacy=i<3&&value.courseVersion!==1;return{distance:num(a.distance,0,1e8),time:legacy?0:num(a.time,0,1e7),legacyTime:legacy?num(a.time,0,1e7):num(a.legacyTime,0,1e7),medals:Math.floor(num(a.medals,0,7))};});
 s.milestones=s.milestones.map((v,i)=>Math.floor(num(value.milestones?.[i],0,7)));
 s.runs=Math.floor(num(value.runs,0,1e7));s.paint=Math.floor(num(value.paint,0,3));s.sound=num(value.sound??.45,0,1);s.music=value.music!==false;s.shake=value.shake!==false;s.remoteSeed=Math.floor(num(value.remoteSeed??24681,1,0x7fffffff));
 return s;
}
class Track{
 constructor(index=0,seed=0){
  this.index=index;this.endless=index===3;this.region=REGIONS[Math.min(index,2)];this.seed=seed||this.region.seed;this.length=this.endless?Infinity:this.region.length;this.nodes=[];this.gaps=[];this.items=[];this.props=[];this.platforms=[];this.challenges=[];this.built=0;this.sectionCount=0;this.random=rng(this.seed);this.itemId=0;
  if(this.endless)this.extend(50000);else this.buildFinite();
 }
 addSection(start,width,profile,amp=1){
  for(let j=0;j<profile.length;j++){if(this.nodes.length&&j===0)continue;this.nodes.push({x:start+profile[j][0]*width,y:185+profile[j][1]*amp});}
 }
 buildFinite(){
  this.nodes=[{x:-1000,y:185},{x:600,y:185}];this.built=600;
  while(this.built+3000<this.length-800)this.addChallenge();
  this.nodes.push({x:this.length+1500,y:185});
  this.populate(800,this.length-400,rng(this.seed+357));this.addChallengeItems();
  this.props.push({type:'start',x:420},{type:'finish',x:this.length});
 }
 addChallenge(){
  const n=this.sectionCount++,start=this.built,stage=Math.min(this.index,2);
  const scale=n<2?1:[1,.93,1.08,1,.96,1.05][(n+stage*2)%6];
  const lift=stage*12,wide=stage===2&&n%4===3?60:0;
  const points=[[0,185],[200,185],[650,120],[1020,240+lift],[1150,255+lift],[1380,55],[1650+wide,235+lift],[2070+wide,105],[2470,185],[3100,185]];
  for(const [x,y]of points){if(x===0)continue;this.nodes.push({x:start+x*scale,y});}
  const c={id:n,a:start,scale,launchA:start+970*scale,launchB:start+1135*scale,landA:start+(1680+wide)*scale,landB:start+(2050+wide)*scale,roughA:start+1250*scale,roughB:start+1600*scale,fuelX:start+1460*scale,fuelY:365+lift,safeX:start+2700*scale,attempted:false,cleared:false,missed:false,itemsAdded:false};
  this.challenges.push(c);this.built=start+3100*scale;
  // Rare holes stay on the flat recovery stretch, away from the optional jump line.
  if(n>3&&n%9===7)this.gaps.push({a:start+2860*scale,b:start+2990*scale});
 }
 addChallengeItems(){
  for(const c of this.challenges){if(c.itemsAdded)continue;c.itemsAdded=true;
   this.addItem('fuel',c.fuelX,c.fuelY,10);Object.assign(this.items[this.items.length-1],{skill:true,challengeId:c.id});
   if(c.id%2===1)this.addItem('fuel',c.safeX,this.height(c.safeX)+47,8);
   for(let k=0;k<5;k++)this.addItem('coin',c.a+(1210+k*85)*c.scale,320+Math.sin(k/4*Math.PI)*60,3);
  }
 }
 extend(until){
  if(!this.nodes.length)this.nodes=[{x:-1000,y:185},{x:600,y:185}],this.built=600;
  const start=this.built;while(this.built<until)this.addChallenge();
  this.populate(Math.max(800,start+300),this.built-200,this.random);this.addChallengeItems();
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
  for(let x=from+2500;x<to;x+=5700+rand()*1400){if(!this.gaps.some(g=>Math.abs(g.a-x)<1300))this.addItem('magnet',x,this.height(x)+65);}
  for(let x=from;x<to;x+=150+rand()*180)this.props.push({type:rand()>.74?'tree':rand()>.65?'rock':'grass',x,size:.6+rand()*.8,seed:rand()});
  for(let x=from+1800;x<to;x+=4300)this.props.push({type:'sign',x,number:Math.floor(x/10)});

 }
 surface(x,previousY=Infinity){
  for(const p of this.platforms)if(x>p.a&&x<p.b&&previousY>=p.y+18)return{height:p.y,slope:0,platform:p};
  if(this.gapAt(x))return null;return{height:this.height(x),slope:this.slope(x)};
 }
}
class Run{
 constructor(index,save,seed){
  this.index=index;this.track=new Track(index,seed);this.upgrades={...save.upgrades};this.part=save.part;this.maxFuel=tankCapacity(save.upgrades.tank);this.fuel=this.maxFuel;
  this.x=250;this.y=this.track.height(this.x)+23;this.v=0;this.vx=0;this.vy=0;this.angle=0;this.omega=0;this.grounded=true;this.groundAge=1;this.airAge=0;this.coyote=.1;this.jumpBuffer=0;this.jumpHold=0;this.canHold=false;this.jumpWas=false;this.brakeAge=0;
  this.manualFlight=false;this.challenge=null;this.chain=0;this.bestChain=0;this.skillFuel=0;this.spentFuel=0;this.hardLandings=0;this.time=0;this.maxX=this.x;this.distance=0;this.coins=0;this.pickupCoins=0;this.nice=0;this.lastNiceX=-1000;this.turbo=0;this.magnet=0;this.stopped=0;this.flip=0;this.result=null;this.events=[];this.lastDust=0;this.landed=0;this.nextMilestone=0;this.bankCoins=0;this.savedDistance=0;this.collectedCoins=0;this.totalCoins=this.track.items.filter(i=>i.type==='coin').length;this.prevY=this.y;
 }
 emit(type,data={}){this.events.push({type,...data});}
 update(dt,input={}){
  if(this.result)return;this.time+=dt;this.landed=Math.max(0,this.landed-dt);this.turbo=Math.max(0,this.turbo-dt);this.magnet=Math.max(0,this.magnet-dt);this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);
  const u=this.upgrades,gas=!!input.gas&&this.fuel>0,brake=!!input.brake,jump=!!input.jump;
  if(jump&&!this.jumpWas)this.jumpBuffer=.15;this.jumpWas=jump;
  const burn=dt*(2.2*(this.part==='eco'&&!gas?.85:1)+(gas?3.8:0));this.spentFuel+=Math.min(this.fuel,burn);this.fuel=Math.max(0,this.fuel-burn);
  const ground=this.track.surface(this.x,this.y+3),slope=ground?ground.slope:0;
  if(this.grounded&&ground&&this.flip<=0){
   this.groundAge+=dt;this.coyote=.11;this.v=clamp(this.v,-80,880);
   const driveSpeed=670+handlingLevel(u.engine)*10+(this.turbo>0?85:0);
   const maxSpeed=860+handlingLevel(u.engine)*6+(this.turbo>0?60:0);
   const engine=gas&&this.v<driveSpeed?980*(1+handlingLevel(u.engine)*.08)*(1-.45*clamp(this.v/driveSpeed,0,1))*(this.turbo>0?1.3:1):0;
   const roughRoad=this.track.challenges.some(c=>this.x>c.roughA&&this.x<c.roughB);
   const resistance=(16+Math.abs(this.v)*.065+(roughRoad?145*(1-handlingLevel(u.tires)*.08):0))*(this.v>=0?1:-1);
   this.v+=(engine-900*Math.sin(slope)-resistance)*dt;
   if(brake){this.brakeAge+=dt;if(this.v>5)this.v=Math.max(0,this.v-1100*dt);else if(this.brakeAge>.45&&this.fuel>0)this.v=Math.max(-70,this.v-150*dt);else this.v=0;}else this.brakeAge=0;
   if(!gas&&Math.abs(this.v)<4&&Math.abs(slope)<.1)this.v=0;
   this.v=clamp(this.v,-75,maxSpeed);this.vx=this.v*Math.cos(slope);this.vy=this.v*Math.sin(slope);

   if(this.jumpBuffer>0&&this.groundAge>.16&&this.fuel>0){this.launch(slope);}
   // Wheels follow the road until the player jumps; shortcuts require a deliberate takeoff.
   if(this.grounded){
    const oldSlope=slope;this.x+=this.vx*dt;const s=this.track.surface(this.x,this.y+20);
    if(s){this.y=s.height+23;const rough=Math.abs(angleDiff(s.slope,oldSlope));this.v*=Math.max(.97,1-rough*(rough/dt>1.3?.5:.045)*(1-handlingLevel(u.tires)*.12));}
    else{this.grounded=false;this.airAge=0;this.canHold=false;}
   }
  }else if(this.grounded&&!ground){this.grounded=false;this.airAge=0;}
  if(!this.grounded){
   this.airAge+=dt;this.coyote=Math.max(0,this.coyote-dt);
   if(this.jumpBuffer>0&&this.coyote>0&&!this.canHold&&this.fuel>0)this.launch(slope);
   if(this.canHold&&jump&&this.jumpHold<.24&&this.vy>0&&this.fuel>0){this.vy+=(this.part==='jump'?970:720)*dt;this.jumpHold+=dt;}else if(!jump)this.canHold=false;
   this.prevY=this.y;this.vy-=900*dt;this.vx*=Math.exp(-.012*dt);this.x+=this.vx*dt;this.y+=this.vy*dt;
   const s=this.track.surface(this.x,this.prevY+1);
   if(s&&this.y<=s.height+23&&this.prevY>=s.height-35&&this.vy-this.vx*Math.tan(s.slope)<0){
    const impact=Math.max(0,-this.vy+this.vx*Math.tan(s.slope));const difference=Math.abs(angleDiff(this.angle,s.slope));
    const challenge=this.challenge;
    const nice=this.manualFlight&&challenge&&!challenge.cleared&&this.x>=challenge.landA&&this.x<=challenge.landB&&s.slope<-.12&&this.vx>400&&difference<.62+handlingLevel(u.suspension)*.018&&impact<600;
    let penalty=clamp((impact-150)/1200,0,.38)+clamp(difference-.2,0,1.2)*.15;penalty*=1-handlingLevel(u.suspension)*.085;
    this.v=Math.max(this.vx*.3,(this.vx*Math.cos(s.slope)+this.vy*Math.sin(s.slope))*(nice?1:1-penalty));
    if(nice){challenge.cleared=true;this.chain++;this.bestChain=Math.max(this.bestChain,this.chain);this.nice++;const reward=4+Math.min(5,this.chain)*2;this.coins+=reward;this.v=Math.min(900,Math.max(this.v,this.vx+35+Math.min(5,this.chain)*6));this.emit('nice',{x:this.x,y:this.y+55,chain:this.chain,reward});}
    else if(this.manualFlight){if(challenge||penalty>.16)this.chain=0;if(penalty>.16){this.hardLandings++;this.emit('roughLand',{x:this.x,y:this.y+45});}}
    this.y=s.height+23;this.grounded=true;this.groundAge=0;this.canHold=false;this.landed=.24;this.manualFlight=false;this.challenge=null;
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
  for(const c of this.track.challenges)if(!c.missed&&!c.cleared&&this.x>c.landB){c.missed=true;this.chain=0;}
  const radius=this.magnet>0?180:this.part==='arm'?72:48;
  for(const item of this.track.items){
   const reach=item.skill?54:radius;
   if(item.taken||Math.abs(item.x-this.x)>reach+35||item.skill&&(!this.manualFlight||this.grounded||this.vx<320))continue;
   const dx=item.x-this.x,dy=item.y-(this.y+18);const d=Math.hypot(dx,dy);
   if(d<reach){if(!item.skill&&this.magnet>0&&d>47){item.x=lerp(item.x,this.x,dt*9);item.y=lerp(item.y,this.y+18,dt*9);}else this.collect(item);}
  }
  if(this.grounded&&Math.abs(this.v)>65&&this.time-this.lastDust>.07){this.lastDust=this.time;this.emit('dust',{x:this.x-35,y:this.y-21,speed:this.v});}
  if(this.fuel<=0&&Math.hypot(this.vx,this.vy)<9)this.stopped+=dt;else this.stopped=0;
  if(this.y<this.track.height(this.x)-600)this.end('fall');
  else if(this.stopped>2)this.end('fuel');
  else if(this.x>=this.track.length)this.end('clear');
 }
 launch(slope){this.grounded=false;this.groundAge=0;this.airAge=0;this.coyote=0;this.jumpBuffer=0;this.jumpHold=0;this.canHold=true;this.vy=Math.max(0,this.vy*.35)+308;this.vx=Math.max(this.vx,30);this.manualFlight=true;this.challenge=this.track.challenges.find(c=>this.x>=c.launchA&&this.x<=c.launchB)||null;if(this.challenge)this.challenge.attempted=true;this.y+=2;this.emit('jump',{x:this.x,y:this.y-20});}
 collect(item){item.taken=true;if(item.type==='coin'){this.coins+=item.value;this.pickupCoins+=item.value;this.collectedCoins++;}else if(item.type==='fuel'){const gain=Math.min(this.maxFuel-this.fuel,item.value);this.fuel+=gain;if(item.skill)this.skillFuel+=gain;}else if(item.type==='turbo')this.turbo=4;else if(item.type==='magnet')this.magnet=8;this.emit('pickup',{item});}
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
const api={clamp,lerp,angleDiff,rng,REGIONS,UPGRADES,COSTS,MAX_LEVEL,tankCapacity,PARTS,PAINTS,freshSave,sanitizeSave,Track,Run,bankProgress,finishRun};root.Hillhop=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
