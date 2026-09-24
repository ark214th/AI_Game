import {Run,clamp} from './core.mjs';
import {View} from './view.mjs';
import {Sound} from './audio.mjs';

const $=id=>document.getElementById(id);
const STORE='coast-rush-v1';
let saved={best:0,score:0,tutorial:false,sound:true};
try{const value=JSON.parse(localStorage.getItem(STORE)||'null');if(value&&typeof value==='object'){saved.best=Number.isFinite(value.best)?Math.max(0,value.best):0;saved.score=Number.isFinite(value.score)?Math.max(0,value.score):0;saved.tutorial=value.tutorial===true;saved.sound=value.sound!==false;}}catch{}
function save(){try{localStorage.setItem(STORE,JSON.stringify(saved));}catch{}}
const view=new View($('world')),sound=new Sound(saved.sound);
let run=new Run({seed:127}),mode='title',last=performance.now(),accumulator=0,calloutTime=0,hitTime=0,deathTime=0,zoneIndex=-1,lastHud=-1,gesture=null,wasBest=false;
let visualClock=0,announcementPriority=0;
const ZONES=['SEASIDE AVENUE','PALM PROMENADE','GOLDEN COAST'];
const ui={distance:$('distance'),coins:$('coins'),flowFill:$('flowFill'),hearts:$('hearts'),combo:$('combo'),power:$('power'),tutorial:$('tutorial')};
function setMode(next){
  mode=next;for(const id of ['title','pauseScreen','result'])$(id).hidden=true;
  if(next==='title')$('title').hidden=false;if(next==='paused')$('pauseScreen').hidden=false;if(next==='result')$('result').hidden=false;
  $('hud').hidden=next==='title'||next==='result';$('zone').hidden=next==='title'||next==='result';
  if(next!=='running'){ui.tutorial.hidden=true;ui.combo.hidden=true;ui.power.hidden=true;}
  $('game').classList.toggle('rushing',next==='running'&&run.rush>0);
  gesture=null;accumulator=0;
}
function announce(title,sub='',seconds=1.1,priority=1){if(calloutTime>0&&priority<announcementPriority)return;announcementPriority=priority;$('callout').firstElementChild.textContent=title;$('callout').lastElementChild.textContent=sub;$('callout').classList.add('show');calloutTime=seconds;}
function clearAnnouncements(){$('callout').classList.remove('show');calloutTime=0;$('hitFlash').classList.remove('hit');hitTime=0;}
function refreshTitle(){$('titleBest').textContent=`${Math.floor(saved.best).toLocaleString()} m`;$('sound').textContent=`♫ サウンド ${saved.sound?'ON':'OFF'}`;}
function start(tutorial=false){
  sound.init();run=new Run({tutorial});view.reset();zoneIndex=-1;lastHud=-1;deathTime=0;wasBest=false;clearAnnouncements();setMode('running');
  if(!tutorial)announce('LET’S GO!','コインの道をつないで、ラッシュへ',1.4);
}
function home(){run=new Run({seed:127});view.reset();clearAnnouncements();setMode('title');refreshTitle();}
function finish(){
  const best=run.distance>saved.best; saved.best=Math.max(saved.best,Math.floor(run.distance));saved.score=Math.max(saved.score,run.score);save();
  $('resultLabel').textContent=best?'NEW BEST!':'NICE RUN!';$('resultDistance').innerHTML=`${Math.floor(run.distance).toLocaleString()}<small>m</small>`;
  $('resultCoins').textContent=run.coins;$('resultChain').textContent=run.bestChain;$('resultRush').textContent=run.rushes;$('resultScore').textContent=run.score.toLocaleString();
  $('resultMessage').textContent={tram:'電車は左右によけよう。少し先のコインが道しるべ。',hurdle:'オレンジの柵は、上スワイプで軽やかにジャンプ。',arch:'青いゲートは、下スワイプでくぐり抜けよう。'}[run.cause]||'次は、もう少し遠くまで。';
  clearAnnouncements();setMode('result');
}
function events(list){
  for(const e of list){
    view.event(e,run);sound.event(e);
    if(e.type==='chain')announce(`${e.n} CHAIN`,'いいリズム！',.65);
    if(e.type==='clean'&&run.rush<=0)announce(e.kind==='hurdle'?'NICE JUMP!':e.kind==='arch'?'SMOOTH!':'SO CLOSE!','FLOW +',.65);
    if(e.type==='rush')announce('COAST RUSH!','無敵 ＋ コイン吸引',1.65,3);
    if(e.type==='rushEnd')announce('KEEP IT FLOWING','もう一度、ラッシュへ',.9);
    if(e.type==='magnet')announce('MAGNET!','コインをまとめて吸い寄せる',1.15);
    if(e.type==='hit'){hitTime=.3;$('hitFlash').classList.add('hit');if(!run.dead)announce('まだ走れる！',`あと ${run.hearts} 回`,.8,4);}
    if(e.type==='lesson')announce('NICE!','その調子',.65);
    if(e.type==='tutorialDone'){saved.tutorial=true;save();announce('READY TO RUSH','コインと回避でゲージをためよう',1.7);}
    if(e.type==='retryLesson')announce('もう一度やってみよう','矢印の方向にスワイプ',.8);
    if(e.type==='dead'){deathTime=.7;gesture=null;}
  }
}
function action(a){if(mode!=='running'||run.dead)return;run.events=[];run.action(a);events(run.events);}
function pause(){if(mode==='running'&&!run.dead){setMode('paused');clearAnnouncements();}}
$('start').addEventListener('click',()=>start(!saved.tutorial));$('practice').addEventListener('click',()=>start(true));
$('again').addEventListener('click',()=>start(false));$('restart').addEventListener('click',()=>start(false));
$('home').addEventListener('click',home);$('resultHome').addEventListener('click',home);
$('pause').addEventListener('click',pause);$('resume').addEventListener('click',()=>{sound.init();setMode('running');announce('LET’S GO!','',.5);});
$('skipTutorial').addEventListener('click',()=>{saved.tutorial=true;save();start(false);});
$('sound').addEventListener('click',()=>{sound.init();saved.sound=sound.toggle();save();refreshTitle();});

const surface=$('game');
surface.addEventListener('pointerdown',e=>{
  if(e.target.closest('button,a')||mode!=='running'||run.dead||gesture)return;
  e.preventDefault();gesture={id:e.pointerId,x:e.clientX,y:e.clientY,time:performance.now(),used:false};
  surface.setPointerCapture?.(e.pointerId);sound.init();
});
surface.addEventListener('pointermove',e=>{
  if(!gesture||gesture.id!==e.pointerId)return;e.preventDefault();
  const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
  const threshold=clamp(Math.min(innerWidth,innerHeight)*.035,17,32);
  if(Math.max(Math.abs(dx),Math.abs(dy))<threshold)return;
  if(gesture.used)return;gesture.used=true;
  action(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');
});
function release(e){if(gesture&&gesture.id===e.pointerId)gesture=null;}
surface.addEventListener('pointerup',release);surface.addEventListener('pointercancel',release);surface.addEventListener('lostpointercapture',release);
surface.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
surface.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});
document.addEventListener('dblclick',e=>e.preventDefault());
addEventListener('keydown',e=>{
  const key={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowUp:'up',w:'up',W:'up',' ':'up',ArrowDown:'down',s:'down',S:'down'}[e.key];
  if(key){e.preventDefault();if(!e.repeat)action(key);}
  if(e.key==='Escape'||e.key==='p'||e.key==='P'){if(mode==='running')pause();else if(mode==='paused')$('resume').click();}
  if(e.key==='Enter'&&(mode==='title'||mode==='result'))start(mode==='title'&&!saved.tutorial);
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();last=performance.now();accumulator=0;});
addEventListener('blur',pause);addEventListener('pagehide',pause);addEventListener('resize',()=>view.resize());
window.visualViewport?.addEventListener('resize',()=>view.resize());
$('world').addEventListener('webglcontextlost',e=>{e.preventDefault();pause();$('errorDetail').textContent='画面の描画が中断されました。再読み込みすると、保存したベスト記録から遊べます。';$('error').hidden=false;});

function hud(){
  ui.distance.textContent=Math.floor(run.distance).toLocaleString();ui.coins.textContent=run.coins;
  ui.hearts.textContent='♥ '.repeat(run.hearts)+'♡ '.repeat(3-run.hearts);ui.hearts.setAttribute('aria-label',`ライフ${run.hearts}`);
  const rush=run.rush>0;ui.flowFill.style.width=`${rush?run.rush/7*100:run.flow}%`;
  $('flowLabel').textContent=rush?'RUSH!': 'FLOW';$('flowHelp').textContent=rush?`無敵 ＋ 吸引  ${run.rush.toFixed(1)}s`:'コインと回避でラッシュへ';
  $('game').classList.toggle('rushing',rush);
  ui.combo.hidden=run.chain<5;if(run.chain>=5)ui.combo.firstElementChild.textContent=run.chain;
  ui.power.hidden=run.magnet<=0||rush;if(run.magnet>0)ui.power.querySelector('b').textContent=Math.ceil(run.magnet);
  $('bestMarker').textContent=saved.best>0?`BEST ${Math.floor(saved.best).toLocaleString()} m`:'';
  const hint=run.hint;ui.tutorial.hidden=!(hint&&run.distance>=hint.at);
  if(!ui.tutorial.hidden){$('hintArrow').textContent=hint.arrow;$('hintText').textContent=hint.text;$('hintSub').textContent=hint.sub;}
  const zone=Math.floor(run.distance/600)%ZONES.length;if(zone!==zoneIndex){$('zoneText').textContent=ZONES[zone];if(zoneIndex>=0&&!run.rush)announce('FRESH AIR',ZONES[zone],1);zoneIndex=zone;}
  if(!wasBest&&saved.best>100&&run.distance>saved.best){wasBest=true;announce('NEW BEST!','まだまだ、走れる。',1.4);}
}
function frame(now){
  const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;visualClock+=dt;
  if(mode==='running'){
    if(run.dead){deathTime-=dt;if(deathTime<=0)finish();}
    else{accumulator+=dt;while(accumulator>=1/120){run.update(1/120);events(run.events);accumulator-=1/120;if(run.dead)break;}}
    if(mode==='running'&&visualClock-lastHud>.05){hud();lastHud=visualClock;}
  }else if(mode==='title'){
    run.distance+=dt*7;run.speed=17;run.generate();run.entities=run.entities.filter(e=>e.z>run.distance-12);
  }
  if(calloutTime>0){calloutTime-=dt;if(calloutTime<=0)$('callout').classList.remove('show');}
  if(hitTime>0){hitTime-=dt;if(hitTime<=0)$('hitFlash').classList.remove('hit');}
  sound.update(mode==='running'&&!run.dead,run.rush>0);
  view.update(run,mode==='paused'?0:dt,run.dead?'dead':mode);
  requestAnimationFrame(frame);
}
refreshTitle();$('loading').hidden=true;requestAnimationFrame(frame);
