const H=require('./core.js');
function play(index,level,style,seed=1){const save=H.freshSave();for(const k in save.upgrades)save.upgrades[k]=level;if(level>=3)save.part='eco';const r=new H.Run(index,save,H.REGIONS[index].seed+seed*17);let jt=-5,nextHold=.24,lastC=-1;
for(let t=0;t<350&&!r.result;t+=1/120){
 const c=r.track.challenges.find(c=>r.x<c.landB),approach=c&&r.x>c.launchA-500&&r.x<c.launchB;
 const plan={valley:[650,.82,.24],skim:[570,.8,.08],wide:[680,.94,.24],drop:[620,.90,.10],double:[690,.94,.24],span:[680,.96,.24],steps:[570,.75,.08],shelf:[650,.88,.24],dive:[620,.85,.08]}[c?.pattern]||[650,.82,.24];
 let gas=style==='held'||style==='safe'&&r.vx<180||style==='ground'&&r.vx<600||['skill','learning','spam'].includes(style)&&r.grounded&&r.vx<(approach?plan[0]:480);
 let brake=false;
 let fraction=plan[1]-Math.max(0,r.vx-620)*.002;
 if(style==='learning')fraction+=[.02,-.45,0,-.6,.02][c?.id%5||0];
 const takeoff=c?c.launchA+(c.launchB-c.launchA)*Math.max(0,fraction):Infinity;
 if(['skill','learning'].includes(style)&&c&&lastC!==c.id&&r.x>=takeoff&&r.x<c.launchB&&r.grounded){jt=t;lastC=c.id;nextHold=plan[2]*(style==='learning'?[1,.4,.8,.4,1][c.id%5]:1);}
 if(style==='spam'&&r.grounded&&t-jt>1.1){jt=t;nextHold=.24;}
 const gap=r.track.gaps.find(g=>g.a>r.x&&g.a-r.x<500);if(gap&&r.grounded&&r.vx<320)gas=true;
 if(gap&&gap.a-r.x<Math.max(45,r.vx*.16)&&r.grounded&&t-jt>1){jt=t;nextHold=.24;}
 r.update(1/120,{gas,brake,jump:t-jt<nextHold});r.events=[];
 if(!Number.isFinite(r.x+r.y+r.fuel))throw Error('nonfinite');
 }
 H.finishRun(r,save);return{stage:index+1,level,style,result:r.result?.reason||'timeout',distance:Math.round(r.distance),time:Math.round(r.time),fuel:Math.round(r.fuel),nice:r.nice,just:r.just,hard:r.hardLandings,chain:r.bestChain,airFuel:Math.round(r.skillFuel),income:save.coins};}
if(require.main===module){
 const assert=require('node:assert/strict');
 const rows=['safe','ground','spam','learning','skill'].map(style=>play(0,0,style));
 assert(rows.every(r=>r.result!=='timeout'&&r.result!=='fall'));
 assert(rows[4].result==='clear'&&rows[4].distance>rows[0].distance*2);
 assert(rows[4].distance>rows[3].distance&&rows[3].distance>rows[2].distance);
 assert(rows[4].nice>rows[3].nice&&rows[3].nice>rows[0].nice);
 for(let stage=0;stage<3;stage++)assert.equal(play(stage,20,'safe').result,'clear');
 const save=H.freshSave();save.coins=3456;save.upgrades.tank=20;save.upgrades.engine=3;
 assert.deepEqual(H.sanitizeSave(save),save);
 assert.throws(()=>H.sanitizeSave({...save,gameId:undefined}));
 const old=structuredClone(save);old.courseVersion=1;old.records[0].time=123;old.unlocked=2;
 const migrated=H.sanitizeSave(old);assert.equal(migrated.coins,old.coins);assert.deepEqual(migrated.upgrades,old.upgrades);assert.equal(migrated.unlocked,2);assert.equal(migrated.records[0].legacyTime,123);assert.deepEqual(H.sanitizeSave(migrated),migrated);
 const previous=structuredClone(save);previous.courseVersion=2;previous.unlocked=3;previous.records.forEach((r,i)=>{r.time=100+i;r.medals=7;r.distance=4500+i*1000;});
 const updated=H.sanitizeSave(previous);assert.equal(updated.records[0].time,100);assert.equal(updated.records[3].time,103);for(const i of [1,2]){assert.equal(updated.records[i].time,0);assert.equal(updated.records[i].legacyTime,100+i);assert.equal(updated.records[i].medals,7);assert.equal(updated.records[i].distance,previous.records[i].distance);}assert.deepEqual(H.sanitizeSave(updated),updated);
 const land=offset=>{const r=new H.Run(0,H.freshSave()),c=r.track.challenges[0];r.x=c.landA+(c.landB-c.landA)*.45;r.y=r.track.height(r.x)+23.05;r.grounded=false;r.manualFlight=true;r.challenge=c;r.airAge=.7;r.vx=600;r.vy=-500;r.angle=r.track.slope(r.x)+offset;r.track.items=[];r.update(1/120,{});return r;};
 const perfect=land(.05),good=land(.5),crash=land(.95);
 assert.equal(perfect.just,1);assert.equal(good.nice,1);assert.equal(good.just,0);assert.equal(crash.hardLandings,1);assert(perfect.vx>600*1.2);assert(crash.vx<600*.45);

 // JUST carries road speed through a climb for half a second; brakes still win.
 assert.equal(perfect.landingGrace,.5);assert.equal(good.landingGrace,0);assert.equal(crash.landingGrace,0);
 const climb=()=>{const r=land(.05);r.track.height=x=>x*.4;r.track.slope=()=>Math.atan(.4);r.track.items=[];r.track.challenges=[];r.track.gaps=[];r.x=1000;r.y=r.track.height(r.x)+23;r.v=700;r.vx=700*Math.cos(r.track.slope(r.x));r.vy=700*Math.sin(r.track.slope(r.x));return r;};
 const carry=climb();for(let i=0;i<60;i++)carry.update(1/120,{});assert(Math.abs(carry.v-700)<.01);carry.update(1/120,{});assert(carry.v<699);
 const stopped=climb();for(let i=0;i<20;i++)stopped.update(1/120,{brake:true});assert(stopped.v<550);
 for(let i=0;i<3;i++)assert.equal(new Set(new H.Track(i).challenges.map(c=>c.pattern)).size,[5,6,7][i]);

 // Each new silhouette has an unupgraded route that collects air fuel and lands JUST.
 for(const [stage,pattern,speed,fraction,hold] of [[1,'span',660,.95,.24],[1,'steps',540,.5,.1],[2,'shelf',600,.75,.24],[2,'dive',540,.75,.1]]){
  const r=new H.Run(stage,H.freshSave()),c=r.track.challenges.find(c=>c.pattern===pattern);r.track.challenges=[c];r.track.items=r.track.items.filter(i=>i.skill&&i.challengeId===c.id);r.x=c.a+200;r.y=r.track.height(r.x)+23;r.v=r.vx=300;let jt=-1,landed=false;
  for(let t=0;t<6&&!landed;t+=1/120){if(jt<0&&r.x>=c.launchA+(c.launchB-c.launchA)*fraction)jt=t;r.update(1/120,{gas:r.grounded&&r.vx<speed,jump:jt>=0&&t-jt<hold});landed=r.events.some(e=>e.type==='land'&&jt>=0);r.events=[];}
  assert.equal(r.just,1,pattern);assert(r.skillFuel>0,pattern+' air fuel');
 }
 for(const stage of [1,2]){const skilled=play(stage,0,'skill'),safe=play(stage,0,'safe');assert.equal(skilled.result,'clear');assert(skilled.distance>safe.distance*3);rows.push(safe,skilled);}
 for(let stage=0;stage<3;stage++){const t=new H.Track(stage);for(let i=1;i<t.nodes.length;i++)assert(t.nodes[i].x>t.nodes[i-1].x);assert.equal(t.items.filter(i=>i.skill).length,t.challenges.length);}
 const track=new H.Track(3,412);const count=track.challenges.length;track.extend(track.built+25000);
 assert(track.challenges.length>count);assert(track.items.filter(i=>i.skill).length===track.challenges.length);
 for(let i=1;i<track.nodes.length;i++)assert(track.nodes[i].x>track.nodes[i-1].x);
 console.table(rows);console.log('PASS: landing contrast, regional terrain patterns, skill return, late progression, save migration, endless extension');
}else module.exports=play;
