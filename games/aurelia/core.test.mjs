import assert from 'node:assert/strict';
import {Run,SAVE_KEY,normalizeSave,purchase,stats,upgradeCost,GATES,TRAINING_END} from './core.mjs?v=4';
import {COURSES,phraseRows} from './courses.mjs?v=4';
const fresh=()=>normalizeSave({tutorial:true});
assert.equal(SAVE_KEY,'aurelia.save.v1');
const old=normalizeSave({version:1,wallet:423,best:912,runs:6,tutorial:true,levels:{flame:4,guard:3,magnet:2,fortune:1},settings:{sound:false,buttons:true,quality:'low'}});
assert.equal(old.wallet,423);assert.equal(old.best,912);assert.deepEqual(old.levels,{flame:4,guard:3,magnet:2,fortune:1});assert.deepEqual(old.settings,{sound:false,buttons:true});
assert.equal(normalizeSave(null).wallet,0);assert.equal(normalizeSave({levels:{flame:999}}).levels.flame,12);
const save=fresh();save.wallet=100;assert.equal(purchase(save,'flame'),true);assert.equal(save.wallet,55);assert.equal(stats(save).energy,114);assert.equal(purchase(save,'flame'),false);assert.equal(save.wallet,55);assert.equal(purchase(save,'unknown'),false);
for(let i=1;i<12;i++)assert.ok(upgradeCost(i)>upgradeCost(i-1));
function empty(){const r=new Run(fresh(),42);r.objects=[];r.rows=[];r.sections.clear();r.nextChunk=1e9;return r;}
function isolated(type,action,all=false){const r=empty();for(const lane of all?[0,1,2]:[1])r.add(type,lane,8);while(r.distance<9&&r.state==='running'){if(8-r.distance<4.5&&!r.did){if(action)r.input(action);r.did=true;}r.step(1/120);}return r;}
for(const [type,action] of [['hurdle','jump'],['arch','slide'],['gap','jump']]){const r=isolated(type,action,true);assert.equal(r.hp,3);assert.equal(r.perfect,1,'one action across three lanes earns one success');}
assert.equal(isolated('block','left').hp,3);assert.equal(isolated('block','jump',true).hp,2);assert.equal(isolated('arch','jump',true).hp,2);assert.equal(isolated('hurdle',null,true).hp,2);
const stumble=isolated('block',null);assert.ok(stumble.stumble>0);assert.ok(stumble.speed<14);assert.ok(stumble.events.some(e=>e.type==='hit'&&e.obstacle==='block'));
const landed=isolated('hurdle','jump');while(landed.y>0)landed.step(1/120);assert.ok(landed.events.some(e=>e.type==='land'&&e.clean));assert.ok(landed.momentum>0);
const practice=new Run(normalizeSave(),8);while(practice.distance<TRAINING_END)practice.step(1/120);assert.equal(practice.hp,3);assert.ok(practice.practiceFailures>=3);
const boost=empty();for(const l of [0,1,2])boost.add('block',l,7);boost.charge=100;assert.equal(boost.input('boost'),true);for(let i=0;i<70;i++)boost.step(1/120);assert.equal(boost.hp,3);assert.equal(boost.objects.filter(o=>o.broken).length,3);assert.equal(boost.events.filter(e=>e.type==='smash').length,3);
const rest=empty();rest.state='blessing';rest.step(.05);assert.equal(rest.distance,0);assert.equal(rest.chooseBoon('invalid'),false);assert.equal(rest.chooseBoon('sustain'),true);
const paid=empty();paid.distance=501;paid.coins=123;paid.end('test');const reward=paid.settle();assert.equal(paid.save.wallet,reward.total);assert.equal(paid.settle(),null);assert.equal(paid.save.wallet,reward.total);
// A reward cannot be taken by entering the risk route only at its exit.
for(const [cleared,failed,expected]of [[2,false,false],[3,true,false],[3,false,true]]){
 const r=empty();r.sections.set(1,{id:1,risk:true,cleared,failed,required:3,end:30});r.add('relic',1,8,{section:1,height:1.3});while(r.distance<10)r.step(1/120);assert.equal(r.coins===30,expected);assert.equal(r.boost>0,expected);
}
// Course grammar remains readable, requires actual actions, and includes recovery.
for(const course of COURSES){for(const mirror of [false,true]){const rows=phraseRows(course,100,mirror);assert.ok(rows.every(r=>r.layout[r.route]!=='b'));assert.ok(course.spacing>=25);}}
let fullRows=0,riskSections=0;
for(let seed=1;seed<=80;seed++){
 const r=new Run(fresh(),seed);r.distance=2500;r.generate();const rows=r.rows.filter(x=>x.z>145).sort((a,b)=>a.z-b.z);
 for(let i=0;i<rows.length;i++){const row=rows[i];assert.ok(row.objects.some(o=>o.type!=='block')||row.objects.length<3);assert.ok(GATES.every(g=>Math.abs(row.z-g)>25));if(i)assert.ok(row.z-rows[i-1].z>=25);if(row.objects.length===3)fullRows++;}
 for(const s of r.sections.values()){assert.ok(s.end-s.start<150);if(s.risk)riskSections++;}
}
assert.ok(fullRows>0&&riskSections>0);
function simulate(seed,levels={},policy='flow',fps=60){
 const r=new Run(normalizeSave({tutorial:true,levels}),seed);let frame=0,rowCount=0,lastRow=null,acted=false,desired=1,relics=0,hits=0;
 while(r.state!=='ended'&&frame++<fps*300){
  if(r.state==='blessing')r.chooseBoon('sustain');
  const row=r.rows.find(x=>!x.done&&x.z>r.distance);
  if(row&&row.z-r.distance<20){
   if(row!==lastRow){lastRow=row;rowCount++;acted=false;const trail=r.objects.find(o=>o.type==='coin'&&o.z===row.z-9);desired=trail?.lane??1;
    if(row.objects.find(o=>o.lane===desired)?.type==='block')desired=[0,1,2].find(l=>!row.objects.some(o=>o.lane===l&&o.type==='block'))??1;
   }
   if(desired<r.lane)r.input('left');else if(desired>r.lane)r.input('right');
   const hazard=row.objects.find(o=>o.lane===desired);
   if(hazard&&row.z-r.distance<r.speed*.31&&!acted){acted=true;if(!(policy==='learning'&&rowCount%6===0))r.input(hazard.type==='arch'?'slide':'jump');}
  }
  if(policy==='flow'&&r.charge>=100&&!r.sections.get(row?.objects[0]?.section)?.risk)r.input('boost');
  r.step(1/fps);for(const e of r.events){if(e.type==='relic')relics++;if(e.type==='hit')hits++;}r.events.length=0;
 }
 assert.ok(frame<fps*300,'run terminates');return {distance:Math.floor(r.distance),won:!!r.won,hp:r.hp,perfect:r.perfect,relics,hits,energy:Math.floor(r.energy)};
}
const summary=[];
for(const seed of [11,22,33,44,55]){
 const flow=simulate(seed),learning=simulate(seed,{},'learning'),equipped=simulate(seed,{flame:12,guard:12},'learning');
 assert.equal(flow.won,true,`a clean run must be completable: ${seed} ${JSON.stringify(flow)}`);assert.equal(flow.hits,0,`authored phrases must be physically solvable: ${seed}`);
 assert.ok(equipped.distance>=learning.distance);summary.push({seed,flow:flow.distance,learning:learning.distance,equipped:equipped.distance,relics:flow.relics});
}
const thirty=simulate(77,{},'flow',30),sixty=simulate(77,{},'flow',60);assert.equal(thirty.won,true);assert.equal(sixty.won,true);assert.equal(thirty.hits,0);assert.equal(sixty.hits,0);
assert.ok(summary.some(x=>x.equipped>x.learning),'equipment must help imperfect runs');
console.log('PASS: old saves, purchases, row collision deduplication, landing feedback, stumble, practice, smash, risk rewards, course grammar, 80 seeds and 30/60 Hz runs.');console.table(summary);
