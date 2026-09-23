import assert from 'node:assert/strict';
import {Run,normalizeSave,purchase,stats,upgradeCost,GATES} from './core.mjs';

const fresh=()=>normalizeSave({tutorial:true});
assert.equal(normalizeSave(null).wallet,0);
assert.equal(normalizeSave({wallet:-10,levels:{flame:999}}).levels.flame,12);
assert.equal(normalizeSave({wallet:Infinity}).wallet,0);
const save=fresh();save.wallet=100;
assert.equal(purchase(save,'flame'),true);assert.equal(save.wallet,55);assert.equal(stats(save).energy,114);
assert.equal(purchase(save,'flame'),false);assert.equal(save.wallet,55);
assert.equal(purchase(save,'unknown'),false);
for(let i=1;i<12;i++)assert.ok(upgradeCost(i)>upgradeCost(i-1));

function isolated(type,action,lead){const r=new Run(fresh(),42);r.objects=[];r.nextRow=1e9;r.add(type,1,8);while(r.distance<8&&r.state==='running'){if(8-r.distance<lead&&!r.did){r.input(action);r.did=true;}r.step(1/120);}return r;}
assert.equal(isolated('hurdle','jump',5).hp,2);
assert.equal(isolated('arch','slide',5).hp,2);
assert.equal(isolated('gap','jump',5).hp,2);
assert.equal(isolated('block','left',5).hp,2);
assert.equal(isolated('block','jump',5).hp,1);
assert.equal(isolated('arch','jump',5).hp,1);
const practice=new Run(normalizeSave(),8);for(let i=0;i<1600&&practice.distance<188;i++)practice.step(1/120);assert.equal(practice.hp,2);assert.ok(practice.practiceFailures>=3);
const boost=new Run(fresh(),7);boost.objects=[];boost.nextRow=1e9;boost.add('gap',1,7);boost.charge=100;assert.equal(boost.input('boost'),true);for(let i=0;i<60;i++)boost.step(1/120);assert.equal(boost.hp,2);assert.equal(boost.charge,0);
const stopped=new Run(fresh());stopped.state='blessing';const frozen=stopped.distance;stopped.step(.05);assert.equal(stopped.distance,frozen);assert.equal(stopped.chooseBoon('invalid'),false);assert.equal(stopped.chooseBoon('sustain'),true);
const paid=new Run(fresh());paid.distance=501;paid.coins=123;paid.end('test');const reward=paid.settle();assert.equal(paid.save.wallet,reward.total);assert.equal(paid.settle(),null);assert.equal(paid.save.wallet,reward.total);

// Generated rows always leave a safe lane and enough time to change lanes.
for(let seed=1;seed<=120;seed++){
  const r=new Run(fresh(),seed);r.distance=2500;r.generate();const rows=new Map();
  for(const o of r.objects.filter(o=>!['coin','flame'].includes(o.type))){if(o.z<210)continue;const lanes=rows.get(o.z)||new Set();lanes.add(o.lane);rows.set(o.z,lanes);assert.ok(GATES.every(g=>Math.abs(o.z-g)>=42));}
  const sorted=[...rows.keys()].sort((a,b)=>a-b);for(let i=0;i<sorted.length;i++){assert.ok(rows.get(sorted[i]).size<=2);if(i>0)assert.ok(sorted[i]-sorted[i-1]>=24);}
}

function simulate(seed,levels={},policy='safe'){
  const r=new Run(normalizeSave({tutorial:true,levels}),seed);let frames=0;
  while(r.state!=='ended'&&frames++<40000){
    if(r.state==='blessing')r.chooseBoon('sustain');
    const upcoming=r.objects.filter(o=>!o.done&&o.z>r.distance).sort((a,b)=>a.z-b.z);
    const hazards=upcoming.filter(o=>!['coin','flame'].includes(o.type));
    if(policy==='flow'){
      const flame=upcoming.find(o=>o.type==='flame'&&o.z-r.distance<12);
      if(flame&&!hazards.some(o=>o.lane===flame.lane&&o.z-r.distance<12)){
        if(flame.lane<r.lane)r.input('left');if(flame.lane>r.lane)r.input('right');
      }
    }
    const threat=hazards.find(o=>o.lane===r.lane&&o.z-r.distance<8);
    if(threat){
      if(policy==='flow'&&threat.type!=='block'){
        if(threat.z-r.distance<r.speed*.35)r.input(threat.type==='arch'?'slide':'jump');
      }else{
        const choices=[0,1,2].filter(l=>!hazards.some(o=>o.lane===l&&Math.abs(o.z-threat.z)<8));choices.sort((a,b)=>Math.abs(a-r.lane)-Math.abs(b-r.lane));
        if(choices[0]<r.lane)r.input('left');if(choices[0]>r.lane)r.input('right');
      }
    }
    if(policy==='flow'&&r.charge>=100)r.input('boost');
    r.step(1/60);r.events.length=0;
  }
  assert.ok(frames<40000,'simulation terminates');
  return {distance:Math.floor(r.distance),won:!!r.won,hp:r.hp,energy:Math.floor(r.energy),reward:r.reward().total,perfect:r.perfect};
}
const summary=[];
for(const seed of [11,22,33,44,55]){const base=simulate(seed),upgraded=simulate(seed,{flame:12,guard:12,magnet:0,fortune:0}),flow=simulate(seed,{},'flow');assert.ok(upgraded.distance>base.distance,`upgrades must extend safe runs, seed ${seed}`);assert.equal(upgraded.won,true,`max equipment must be sufficient, seed ${seed}`);summary.push({seed,base,upgraded,flow});}
console.log('PASS: save normalization, purchases, collisions, tutorial, boost, gates, rewards, 120 course seeds, progression.');
console.table(summary.map(s=>({seed:s.seed,base:s.base.distance,upgraded:s.upgraded.distance,flow:s.flow.distance})));
