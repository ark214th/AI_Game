const assert=require('node:assert/strict');
const H=require('./core.js'),Lesson=require('./tutorial.js'),dt=1/120;
function step(l,input={}){l.run.events=[];l.update(dt,input);}
function until(l,condition,input,max=2400){for(let n=0;n<max&&!condition();n++)step(l,typeof input==='function'?input(l):input);assert(condition(),`stuck in ${l.stage}`);}
const l=new Lesson();until(l,()=>l.stage==='jump',{gas:true});
const takeoff={x:l.run.x,fuel:l.run.fuel,time:l.run.time};for(let i=0;i<240;i++)step(l,{});assert.equal(l.run.x,takeoff.x);assert.equal(l.run.time,takeoff.time);
until(l,()=>l.stage==='release',{gas:true,jump:true});
const air={x:l.run.x,y:l.run.y,time:l.run.time};for(let i=0;i<240;i++)step(l,{gas:true,jump:true});assert.equal(l.run.x,air.x);assert.equal(l.run.y,air.y);assert.equal(l.run.time,air.time);
l.continue();assert.equal(l.stage,'pose');until(l,()=>l.poseMatched,{brake:true});assert(Math.abs(H.angleDiff(l.run.angle,l.targetAngle))<.16);assert.equal(l.run.x,air.x);
l.continue();until(l,()=>['failed','done'].includes(l.stage),{});assert.equal(l.stage,'done');assert.equal(l.run.just,1);
const save=H.freshSave();save.coins=1234;save.upgrades.engine=8;save.tutorial='done';const before=structuredClone(save);H.bankProgress(l.run,save);H.finishRun(l.run,save);assert.deepEqual(save,before);assert.deepEqual(H.sanitizeSave(save),save);
const old=structuredClone(save);delete old.tutorial;const migrated=H.sanitizeSave(old);assert.equal(migrated.tutorial,'new');assert.equal(migrated.coins,1234);assert.equal(migrated.upgrades.engine,8);
// A too-short jump fails, then the same takeoff remains available with fresh pickups.
assert(l.retry());step(l,{jump:true});until(l,()=>l.stage==='release',{});l.continue();until(l,()=>l.poseMatched,{brake:true});l.continue();until(l,()=>['failed','done'].includes(l.stage),{});assert.equal(l.stage,'failed');assert(l.retry());assert.equal(l.stage,'jump');assert.equal(l.run.x,takeoff.x);assert(l.run.track.items.every(i=>!i.taken));assert.equal(l.run.just,0);
// Unguided practice never freezes; a deliberate leap can finish it too.
const free=new Lesson(false);let jumpAt=-1;
for(let n=0;n<2400&&!['done','failed'].includes(free.stage);n++){if(jumpAt<0&&free.run.x>=free.challenge.launchA+132)jumpAt=n;step(free,{gas:free.run.grounded,jump:jumpAt>=0&&n-jumpAt<27});}
assert.equal(free.stage,'done');assert.equal(free.run.just,1);
console.log('PASS: guided inputs, frozen explanation, pitch control, JUST landing, retry, unassisted practice, save compatibility and no practice rewards.');
