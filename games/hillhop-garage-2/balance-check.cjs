const H=require('./core.js');
function play(index,level,style,seed=1){const save=H.freshSave();for(const k in save.upgrades)save.upgrades[k]=level;if(level>=3)save.part='eco';const r=new H.Run(index,save,H.REGIONS[index].seed+seed*17);let jt=-5,nextHold=.24,lastC=-1;
for(let t=0;t<350&&!r.result;t+=1/120){
 const c=r.track.challenges.find(c=>r.x<c.landB),approach=c&&r.x>c.launchA-500&&r.x<c.launchB;
 const plan={valley:[650,.82,.24],skim:[570,.8,.08],wide:[680,.94,.24],drop:[620,.90,.10],double:[690,.94,.24]}[c?.pattern]||[650,.82,.24];
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
 const land=offset=>{const r=new H.Run(0,H.freshSave()),c=r.track.challenges[0];r.x=c.landA+(c.landB-c.landA)*.45;r.y=r.track.height(r.x)+23.05;r.grounded=false;r.manualFlight=true;r.challenge=c;r.airAge=.7;r.vx=600;r.vy=-500;r.angle=r.track.slope(r.x)+offset;r.track.items=[];r.update(1/120,{});return r;};
 const perfect=land(.05),good=land(.5),crash=land(.95);
 assert.equal(perfect.just,1);assert.equal(good.nice,1);assert.equal(good.just,0);assert.equal(crash.hardLandings,1);assert(perfect.vx>600*1.2);assert(crash.vx<600*.45);

 // JUST carries road speed through a climb for half a second; brakes still win.
 assert.equal(perfect.landingGrace,.5);assert.equal(good.landingGrace,0);assert.equal(crash.landingGrace,0);
 const climb=()=>{const r=land(.05);r.track.height=x=>x*.4;r.track.slope=()=>Math.atan(.4);r.track.items=[];r.track.challenges=[];r.track.gaps=[];r.x=1000;r.y=r.track.height(r.x)+23;r.v=700;r.vx=700*Math.cos(r.track.slope(r.x));r.vy=700*Math.sin(r.track.slope(r.x));return r;};
 const carry=climb();for(let i=0;i<60;i++)carry.update(1/120,{});assert(Math.abs(carry.v-700)<.01);carry.update(1/120,{});assert(carry.v<699);
 const stopped=climb();for(let i=0;i<20;i++)stopped.update(1/120,{brake:true});assert(stopped.v<550);
 for(let i=0;i<3;i++)assert.equal(new Set(new H.Track(i).challenges.map(c=>c.pattern)).size,5);

 const track=new H.Track(3,412);const count=track.challenges.length;track.extend(track.built+25000);
 assert(track.challenges.length>count);assert(track.items.filter(i=>i.skill).length===track.challenges.length);
 for(let i=1;i<track.nodes.length;i++)assert(track.nodes[i].x>track.nodes[i-1].x);
 console.table(rows);console.log('PASS: landing contrast, five terrain patterns, skill return, late progression, save migration, endless extension');
}else module.exports=play;
