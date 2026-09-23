import assert from 'node:assert/strict';
import {World} from './view.js?v=4';
import {Run,normalizeSave} from './core.mjs?v=4';

const gradient={addColorStop(){}};
const context={fillRect(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},createRadialGradient(){return gradient;}};
globalThis.document={createElement(){return {width:256,height:256,getContext(){return context;}};}};
globalThis.matchMedia=()=>({matches:false});globalThis.devicePixelRatio=3;
let frames=0,pixelRatio=0;
const renderer={shadowMap:{},capabilities:{getMaxAnisotropy:()=>4},setClearColor(){},setPixelRatio(value){pixelRatio=value;},setSize(){},render(scene,camera){
  assert.equal(this.shadowMap.enabled,true,'shadows stay enabled for every render');
  assert.equal(this.shadowMap.autoUpdate,true,'moving shadows update for every render');
  scene.updateMatrixWorld();camera.updateMatrixWorld();scene.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite),`${o.type} transforms`));frames++;
}};
const world=new World({clientWidth:390,clientHeight:844},renderer);
assert.equal(pixelRatio,3,'render at device pixel ratio without an adaptive cap');
assert.equal(world.low,undefined);assert.equal(typeof world.setPerformanceLow,'undefined');assert.equal(typeof world.setQuality,'undefined');
const run=new Run(normalizeSave({tutorial:true,settings:{quality:'low'}}),21);
for(let i=0;i<90;i++){if(i===3)run.input('jump');if(i===32)run.input('slide');run.step(1/60);for(const e of run.events.splice(0))world.event(e,run);world.update(run,i%3===0?.1:1/60,true);}
assert.ok(world.pillars.every(g=>g.visible),'pillars stay in the full scene');
assert.ok(world.rocks.every(g=>g.visible),'rock formations stay in the full scene');
assert.ok(world.torches.every(g=>g.visible),'torches stay in the full scene');
world.resetEffects();
world.spawnParticles(0,1,0,0xffd280,100);assert.equal(world.particles.length,100,'all requested particles are emitted');
for(let i=0;i<100;i++)world.ring(0,0xffd798);assert.equal(world.effects.length,100,'all requested visual reactions are rendered');
world.debris(0,0,true);assert.equal(world.effects.length,114,'debris is not reduced or capped');
for(const e of [{type:'hit',obstacle:'gap',side:1},{type:'land',clean:true},{type:'boost'},{type:'smash',obstacle:'block',lane:1,z:run.distance}])world.event(e,run);
run.won=true;world.event({type:'end',won:true,cause:'victory'},run);world.update(run,1/60,false);assert.ok(world.victoryGem.visible);
world.resetEffects();assert.equal(world.effects.length,0);assert.equal(world.particles.length,0);
console.log(`PASS: ${frames} Three.js renders keep moving shadows on, use native DPR, retain all scenery and effects, and clean them up.`);
