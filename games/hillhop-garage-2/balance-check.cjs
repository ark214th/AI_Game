const H=require('./core.js');
function play(index,level,style,seed=1){const save=H.freshSave();for(const k in save.upgrades)save.upgrades[k]=level;if(level>=3)save.part='eco';const r=new H.Run(index,save,H.REGIONS[index].seed+seed*17);let jt=-5,nextHold=.24,lastC=-1;
for(let t=0;t<350&&!r.result;t+=1/120){
 const c=r.track.challenges.find(c=>r.x<c.landB),local=c?(r.x-c.a)/c.scale:9999;
 let gas=style==='held'||style==='safe'&&r.vx<180||style==='ground'&&r.vx<600||['skill','learning','spam'].includes(style)&&r.grounded&&r.vx<(local>650&&local<1135?650:480);
 let brake=false;
 if(['skill','learning'].includes(style)&&c&&lastC!==c.id&&local>=(style==='learning'?[1100,1010,1070,980,1090][c.id%5]:Math.max(1000,1090-(r.vx-600)*.55))&&local<1135&&r.grounded){jt=t;lastC=c.id;nextHold=style==='learning'?[.24,.1,.2,.12,.24][c.id%5]:.24;}
 if(style==='spam'&&r.grounded&&t-jt>1.1){jt=t;nextHold=.24;}
 const gap=r.track.gaps.find(g=>g.a>r.x&&g.a-r.x<Math.max(65,r.vx*.20));if(gap&&r.grounded&&t-jt>1){jt=t;nextHold=.24;}
 r.update(1/120,{gas,brake,jump:t-jt<nextHold});r.events=[];
 if(!Number.isFinite(r.x+r.y+r.fuel))throw Error('nonfinite');
 }
 H.finishRun(r,save);return{stage:index+1,level,style,result:r.result?.reason||'timeout',distance:Math.round(r.distance),time:Math.round(r.time),fuel:Math.round(r.fuel),nice:r.nice,chain:r.bestChain,airFuel:Math.round(r.skillFuel),income:save.coins};}
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
 const track=new H.Track(3,412);const count=track.challenges.length;track.extend(track.built+25000);
 assert(track.challenges.length>count);assert(track.items.filter(i=>i.skill).length===track.challenges.length);
 for(let i=1;i<track.nodes.length;i++)assert(track.nodes[i].x>track.nodes[i-1].x);
 console.table(rows);console.log('PASS: skill return, late progression, save identity, endless extension');
}else module.exports=play;
