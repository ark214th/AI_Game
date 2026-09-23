import assert from 'node:assert/strict';
import {World} from './view.js?v=3';
import {Run,normalizeSave} from './core.mjs?v=3';

const gradient={addColorStop(){}};
const context={fillRect(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},createRadialGradient(){return gradient;}};
globalThis.document={createElement(){return {width:256,height:256,getContext(){return context;}};}};
globalThis.matchMedia=()=>({matches:false});globalThis.devicePixelRatio=2;
let frames=0;
const renderer={shadowMap:{},capabilities:{getMaxAnisotropy:()=>4},setClearColor(){},setPixelRatio(){},setSize(){},render(scene,camera){
  scene.updateMatrixWorld();camera.updateMatrixWorld();scene.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite),`${o.type} transforms`));frames++;
}};
const world=new World({clientWidth:390,clientHeight:844},'auto',renderer);
assert.equal(renderer.shadowMap.enabled,true);assert.equal(renderer.shadowMap.autoUpdate,true);
const run=new Run(normalizeSave({tutorial:true}),21);
for(let i=0;i<90;i++){if(i===3)run.input('jump');if(i===32)run.input('slide');run.step(1/60);for(const e of run.events.splice(0))world.event(e,run);world.update(run,1/60,true);}
world.setPerformanceLow(true);assert.equal(renderer.shadowMap.enabled,false);
world.setPerformanceLow(false);assert.equal(renderer.shadowMap.enabled,true);assert.equal(renderer.shadowMap.autoUpdate,true);
world.setQuality('low');world.setPerformanceLow(false);assert.equal(renderer.shadowMap.enabled,false,'manual lightweight setting stays lightweight');
world.setQuality('auto');assert.equal(renderer.shadowMap.enabled,true,'automatic setting restores moving shadows');
for(const e of [{type:'hit',obstacle:'gap',side:1},{type:'land',clean:true},{type:'boost'},{type:'smash',obstacle:'block',lane:1,z:run.distance}])world.event(e,run);
run.won=true;world.event({type:'end',won:true,cause:'victory'},run);world.update(run,1/60,false);assert.ok(world.victoryGem.visible);
world.resetEffects();assert.equal(world.effects.length,0);assert.equal(world.particles.length,0);
console.log(`PASS: ${frames} Three.js scene updates, finite transforms, auto-shadow disable/recovery, manual quality modes, effect cleanup.`);
