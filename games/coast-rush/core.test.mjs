import test from 'node:test';
import assert from 'node:assert/strict';
import {Run, LANE, halfDepth} from './core.mjs';
const step = (r, seconds) => { for(let i=0;i<Math.ceil(seconds*120)&&!r.dead;i++)r.update(1/120); };
const isolated = type => {const r=new Run({seed:1});r.entities=[];r.nextRow=10000;r.add(type,0,11);return r;};

test('jump and slide avoid their matching obstacle but not a tram',()=>{
  const jump=isolated('hurdle');jump.action('up');step(jump,1);assert.equal(jump.hearts,3);assert.equal(jump.clean,1);
  const slide=isolated('arch');slide.action('down');step(slide,1);assert.equal(slide.hearts,3);assert.equal(slide.clean,1);
  const wrong=isolated('arch');wrong.action('up');step(wrong,1);assert.equal(wrong.hearts,2);
  const tram=isolated('tram');tram.action('up');step(tram,1);assert.equal(tram.hearts,2);
});
test('three distinct collisions end a run; one long obstacle costs only one heart',()=>{
  const r=isolated('tram');step(r,1);assert.equal(r.hearts,2);
  step(r,2);r.add('tram',0,r.distance+12);step(r,1);assert.equal(r.hearts,1);
  step(r,2);r.add('tram',0,r.distance+12);step(r,1);assert.equal(r.hearts,0);assert.equal(r.dead,true);
  const end=r.distance;step(r,2);assert.equal(r.distance,end);
});
test('rush smashes every obstacle, attracts every lane, and ends with protection',()=>{
  const r=isolated('tram');r.flow=100;step(r,.01);assert.ok(r.rush>0);assert.equal(r.rushes,1);
  r.add('coin',-1,r.distance+8);r.add('coin',1,r.distance+8);step(r,.9);assert.equal(r.coins,2);assert.equal(r.hearts,3);
  step(r,6.2);assert.equal(r.rush,0);assert.ok(r.invincible>1.7);
  r.add('tram',0,r.distance+4);step(r,.5);assert.equal(r.hearts,3);
});
test('new runs reset all temporary state; deterministic seed reproduces a route',()=>{
  const a=new Run({seed:1234}),b=new Run({seed:1234});assert.deepEqual(a.entities,b.entities);
  a.action('left');a.flow=99;a.magnet=10;assert.equal(b.x,0);assert.equal(b.flow,0);assert.equal(b.magnet,0);
});
test('guided tutorial waits for input and permits a full successful learning sequence',()=>{
  const r=new Run({tutorial:true,seed:3});step(r,3);assert.equal(r.distance,24);assert.equal(r.lesson,0);
  r.action('right');step(r,3);assert.equal(r.distance,52);assert.equal(r.lesson,1);
  r.action('left');step(r,3);assert.equal(r.distance,90);assert.equal(r.lesson,2);
  r.action('up');step(r,3);assert.equal(r.distance,140);assert.equal(r.lesson,3);
  r.action('down');step(r,2);assert.equal(r.tutorial,false);assert.equal(r.hearts,3);
});
test('tutorial collision retries without consuming lives',()=>{
  const r=new Run({tutorial:true,seed:3});r.lesson=2;r.distance=96;r.y=0;r.lane=0;r.x=0;step(r,.15);
  assert.equal(r.hearts,3);assert.ok(r.distance<=90);assert.equal(r.lesson,2);
});
test('lane transition is fast, bounded, and does not teleport through its intermediate position',()=>{
  const r=new Run({seed:8});r.action('right');r.update(1/120);assert.ok(r.x>0&&r.x<LANE);
  step(r,.13);assert.ok(r.x>LANE*.97);r.action('right');assert.equal(r.lane,1);
  r.action('left');r.action('left');step(r,.25);assert.ok(Math.abs(r.x+LANE)<.02);
});
test('every generated row has a continuous empty route at maximum speed',()=>{
  let checked=0;
  for(let seed=1;seed<=100;seed++){
    const r=new Run({seed});r.distance=15000;r.generate();
    const byZ=new Map();for(const e of r.entities)if(['tram','arch','hurdle'].includes(e.type)){if(!byZ.has(e.z))byZ.set(e.z,[]);byZ.get(e.z).push(e);}
    let previousZ=-100,previousSafe=0;
    for(const [z,entities] of byZ){
      const occupied=new Set(entities.map(e=>e.lane));const clear=[-1,0,1].filter(l=>!occupied.has(l));assert.ok(clear.length);
      const safe=clear.sort((a,b)=>Math.abs(a-previousSafe)-Math.abs(b-previousSafe))[0];
      const time=(z-previousZ-2*halfDepth('tram'))/44;
      assert.ok(time>.48,`row spacing ${time}`);assert.ok(Math.abs(safe-previousSafe)<=2);
      previousZ=z;previousSafe=safe;checked++;
    }
  }
  assert.ok(checked>40000);
});
test('a coin-following player can run five minutes without unavoidable contact',()=>{
  for(let seed=1;seed<=12;seed++){
    const r=new Run({seed});
    for(let frame=0;frame<300*60;frame++){
      const front=r.entities.filter(e=>!e.done&&['tram','hurdle','arch'].includes(e.type)&&e.z-r.distance> -4.1&&e.z-r.distance<28).sort((a,b)=>a.z-b.z)[0];
      if(front){const occupied=new Set(r.entities.filter(e=>!e.done&&['tram','hurdle','arch'].includes(e.type)&&Math.abs(e.z-front.z)<.1).map(e=>e.lane));if(occupied.has(r.lane)){const safe=[-1,0,1].find(l=>!occupied.has(l));r.action(safe<r.lane?'left':'right');}}
      r.update(1/60);assert.equal(r.dead,false);
    }
    assert.equal(r.hearts,3,`seed ${seed} lost a life`);assert.ok(r.distance>10000);assert.ok(r.coins>500);assert.ok(r.rushes>1);
  }
});
