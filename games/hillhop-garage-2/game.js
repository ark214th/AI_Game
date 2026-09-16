/* Original canvas artwork and audio for Hillhop Garage. No external assets. */
(()=>{'use strict';
const H=Hillhop,{clamp,lerp,rng,REGIONS,UPGRADES,COSTS,MAX_LEVEL,tankCapacity,PARTS,PAINTS}=H;
const $=id=>document.getElementById(id),canvas=$('world'),ctx=canvas.getContext('2d');
let save,saveWarning=false;const KEY='hillhop-garage-2-v1';
try{const raw=localStorage.getItem(KEY);save=raw?H.sanitizeSave(JSON.parse(raw)):H.freshSave();}catch{save=H.freshSave();saveWarning=true;}
let mode='menu',tab='routes',run=null,menuTrack=new H.Track(Math.min(save.selected,2)),activeRegion=REGIONS[Math.min(save.selected,2)],selected=save.selected;
let w=1200,h=720,dpr=1,screenScale=1,clock=0,last=0,accumulator=0,camX=0,camY=210,zoom=1,shake=0,wheelSpin=0,bankTimer=0;
let particles=[],floaters=[],calloutTime=0,tipTime=0,toastTime=0,resultData=null,runInitialCoins=0,previousBest=0,tutorialSeen=new Set(),hudTimer=0,landingTime=0,landingBursts=[];
let lesson=null,lessonView='';
let input={gas:false,brake:false,jump:false},pressedPointers=new Map(),keys=new Set();
const format=n=>Math.floor(n).toLocaleString('ja-JP');const meters=n=>`${format(n)} m`;const timeString=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
function persist(){try{localStorage.setItem(KEY,JSON.stringify(save));return true;}catch{if(!saveWarning){saveWarning=true;toast('自動保存ができません。設定からセーブを書き出してください。',7);}return false;}}
function toast(text,seconds=2.8){$('toast').textContent=text;$('toast').classList.add('show');toastTime=seconds;}
function callout(text,seconds=1.35){if(landingTime>0){toast(text,seconds);return;}$('callout').textContent=text;$('callout').classList.add('show');calloutTime=seconds;}
function landingFeedback(kind,title,detail){
 calloutTime=0;$('callout').classList.remove('show');const el=$('landingFeedback');el.className=`landing-feedback ${kind}`;el.innerHTML=`<b>${title}</b><span>${detail}</span>`;el.style.animation='none';void el.offsetWidth;el.style.animation='';landingTime=kind==='just'?1.35:1.1;
}
function tip(text,seconds=4){$('tip').textContent=text;$('tip').classList.add('show');tipTime=seconds;}
function setTab(name){tab=name;for(const el of document.querySelectorAll('[data-tab]'))el.classList.toggle('active',el.dataset.tab===name);for(const id of ['routes','garage','records'])$(id).hidden=id!==name;refreshMenu();}
function routePicture(index){const r=REGIONS[Math.min(index,2)];return`<svg viewBox="0 0 100 65" aria-hidden="true"><rect width="100" height="65" fill="${r.sky[0]}"/><circle cx="77" cy="16" r="9" fill="#fff2cc"/><path d="M0 45L22 20 40 39 67 13 100 43V65H0" fill="${r.mountain}"/><path d="M0 49Q20 27 46 49T100 40V65H0" fill="${r.hill}"/><path d="M0 61Q32 40 61 55T100 49V65H0" fill="${r.grass}"/><path d="M0 60Q32 39 61 54T100 48" stroke="${r.edge}" stroke-width="3" fill="none"/></svg>`;}
function medalCount(){return save.records.reduce((n,r)=>n+[1,2,4].filter(b=>r.medals&b).length,0);}
function refreshMenu(){
 $('wallet').textContent=format(save.coins);$('routeCount').textContent=`${String(Math.min(save.unlocked+1,3)).padStart(2,'0')} / 03`;
 $('routeList').innerHTML=[...REGIONS,{name:'果てしない遠征',en:'THE LONG WAY HOME'}].map((r,i)=>{
  if(i===3&&save.unlocked<3)return'';const unlocked=i<=save.unlocked,rec=save.records[i],pct=i<3?Math.min(100,rec.distance/(REGIONS[i].length/10)*100):0;
  return`<button class="route-card ${selected===i?'selected':''}" data-route="${i}" ${unlocked?'':'disabled'}><div class="route-picture">${routePicture(i)}</div><div class="route-detail"><b>${i===3?'∞':String(i+1).padStart(2,'0')}　${r.name}</b><small>${!unlocked?'前の地域を完走すると解放':rec.medals&1?rec.time?`踏破済み · BEST ${timeString(rec.time)}`:'前の地形で踏破 · 新コースに挑戦':rec.distance?`最高 ${meters(rec.distance)}`:i===3?'育てた相棒と、どこまでも':'新しい道が待っています'}</small><div class="route-mini-progress"><i style="width:${pct}%"></i></div></div><span class="route-symbol">${!unlocked?'⌑':rec.medals&1?'✓':selected===i?'●':'›'}</span></button>`;
 }).join('');
 $('partSelect').innerHTML=PARTS.filter(p=>save.parts.includes(p.id)).map(p=>`<option value="${p.id}" ${save.part===p.id?'selected':''}>${p.name}</option>`).join('');$('partHelp').textContent=PARTS.find(p=>p.id===save.part).help;
 $('routeHint').textContent=selected===3?'前回と同じ道に、何度でも挑戦できます。':activeRegion.description;
 $('heroTag').textContent=tab==='garage'?'BUILT BY YOU. READY FOR MORE.':selected===3?'THE LONG WAY HOME':activeRegion.en;
 $('heroName').textContent=tab==='garage'?'少しずつ、頼もしく。':save.runs===0?'旅は、ここから。':selected===3?'道は、まだ続いている。':activeRegion.description;
 $('heroNote').textContent=tab==='garage'?'強化した分だけ、遠くへ行ける。':save.runs===0?'加速して、跳んで、次の下りへつなごう。':save.records[selected].distance?`前回までの最高記録 ${meters(save.records[selected].distance)}`:'新しい景色が、あなたを待っています。';
 const total=Object.values(save.upgrades).reduce((a,b)=>a+b,0);$('heroStats').innerHTML=`<span class="hero-stat">愛車の成長<b>${total} / ${MAX_LEVEL*4}</b></span><span class="hero-stat">燃料タンク<b>${Math.round(tankCapacity(save.upgrades.tank))}</b></span><span class="hero-stat">旅のメダル<b>${medalCount()} / 9</b></span>`;
 $('upgradeCount').textContent=`${total} / ${MAX_LEVEL*4}`;$('upgrades').innerHTML=UPGRADES.map(u=>{const level=save.upgrades[u.key],max=level===MAX_LEVEL,cost=COSTS[level];return`<div class="upgrade"><div class="upgrade-icon">${u.icon}</div><div><strong>${u.name}</strong><small>${u.detail} · Lv ${level} / ${MAX_LEVEL}${u.key==='tank'?` · 容量 ${Math.round(tankCapacity(level))}${max?'':` → ${Math.round(tankCapacity(level+1))}`}`:u.key==='engine'?` · 加速力 +${Math.round((level<=5?level:5+(level-5)*.15)*8)}%`:''}</small><div class="level-dots">${Array.from({length:5},(_,i)=>`<i class="${i<Math.ceil(level/4)?'on':''}"></i>`).join('')}</div></div><button class="buy" data-buy="${u.key}" ${max||save.coins<cost?'disabled':''}>${max?'MAX':`● ${format(cost)}`}</button></div>`;}).join('');
 $('runCount').textContent=`${save.runs} RUNS`;$('recordList').innerHTML=REGIONS.map((r,i)=>{const rec=save.records[i];return`<div class="record-card"><div class="record-top"><b>${r.name}</b><small>${rec.distance?meters(rec.distance):'—'}${rec.time?` · ${timeString(rec.time)}`:rec.legacyTime?` · 旧 ${timeString(rec.legacyTime)}`:''}</small></div><div class="medals">${['完走','コイン60%回収','燃料20%を残す'].map((m,j)=>`<span class="medal ${rec.medals&(1<<j)?'earned':''}">${rec.medals&(1<<j)?'★':'☆'} ${m}</span>`).join('')}</div></div>`;}).join('')+(save.unlocked===3?`<div class="record-card"><div class="record-top"><b>果てしない遠征</b><small>${meters(save.records[3].distance)}</small></div></div>`:'');
 $('paintList').innerHTML=PAINTS.map((c,i)=>`<button class="paint ${save.paint===i?'selected':''}" data-paint="${i}" style="background:${c}" aria-label="車体色 ${['サンイエロー','コーラル','ミント','ラベンダー'][i]}${i*2>medalCount()?`（メダル${i*2}枚で解放）`:''}" ${i*2>medalCount()?'disabled':''}>${i*2>medalCount()?'⌑':''}</button>`).join('');
}
function chooseRoute(index){if(index>save.unlocked)return;selected=index;save.selected=index;activeRegion=REGIONS[Math.min(index,2)];menuTrack=new H.Track(Math.min(index,2));persist();refreshMenu();}
function clearInput(){input={gas:false,brake:false,jump:false};pressedPointers.clear();keys.clear();for(const el of document.querySelectorAll('.pedal'))el.classList.remove('pressed');}
function startRun(sameSeed=true){
 if(save.tutorial==='new'){offerLesson();return;}resetLessonUI();
 audio.start();closeModal();clearInput();if(selected===3&&!sameSeed){save.remoteSeed=(Date.now()%0x7fffffff)||1;persist();}
 run=new H.Run(selected,save,selected===3?save.remoteSeed:REGIONS[selected].seed+save.runs*17);activeRegion=run.track.region;mode='playing';particles=[];floaters=[];landingBursts=[];landingTime=0;$('landingFeedback').className='landing-feedback';clock=0;accumulator=0;camX=run.x;camY=run.y;zoom=1;wheelSpin=0;bankTimer=0;runInitialCoins=save.coins;previousBest=save.records[selected].distance;tutorialSeen=new Set();
 $('menu').hidden=true;$('hud').hidden=false;$('stageLabel').textContent=selected===3?'∞ / 果てしない遠征':`${activeRegion.tag} / ${activeRegion.name}`;$('bestMarker').style.left=`${clamp(previousBest*10/run.track.length*100,0,100)}%`;$('bestMarker').hidden=selected===3||previousBest===0;
 callout(selected>0&&selected<3?activeRegion.en:'LET’S ROLL!',1.5);updateHUD();
}
function goMenu(name='routes'){if(run&&mode!=='result'){H.bankProgress(run,save);persist();}mode='menu';run=null;resetLessonUI();clearInput();closeModal();$('hud').hidden=true;$('menu').hidden=false;menuTrack=new H.Track(Math.min(selected,2));activeRegion=REGIONS[Math.min(selected,2)];setTab(name);}
function pauseRun(){if(mode!=='playing')return;if(lesson){mode='paused';clearInput();showModal(`<div class="eyebrow">DRIVING SCHOOL</div><h2>ひとやすみ。</h2><button class="primary" data-action="resume">練習をつづける</button><button class="secondary" data-action="lesson">説明からやり直す</button><button class="text-button" data-action="menu">メニューへ</button>`);return;}mode='paused';clearInput();H.bankProgress(run,save);persist();showModal(`<div class="eyebrow">TAKE A BREATHER</div><h2>ひとやすみ。</h2><p>ここまでのコインは、持ち帰れます。</p><button class="primary" data-action="resume">つづける <span>→</span></button><button class="secondary" data-action="retry">最初から走る</button><button class="secondary" data-action="garage">ガレージへ</button><button class="text-button" data-action="help">走り方を確認する</button><button class="text-button" data-action="settings">音・操作・セーブの設定</button>`);}
function showModal(html,closable=true){$('modalBody').innerHTML=html;$('modal').hidden=false;$('modalClose').hidden=!closable;}
function closeModal(){ $('modal').hidden=true; }
function resumeRun(){if(mode==='paused'){closeModal();clearInput();mode='playing';accumulator=0;}}
function showResult(){
 if(mode==='result')return;const prevBest=previousBest;resultData=H.finishRun(run,save);persist();mode='result';clearInput();updateHUD();const clear=run.result.reason==='clear';audio.effect(clear?'clear':'fail');
 const allGained=save.coins-runInitialCoins,newRecord=run.distance>prevBest+1;
 let message=clear?resultData.newRegion?(selected===2?'3つの地域を踏破！ 果てしない遠征が開きました。':`${REGIONS[selected+1].name}への道が開きました。`):'いい走りでした。次は、もう一つのメダルへ。':run.result.reason==='fuel'?'燃料切れ。谷を跳び越え、空中の燃料と下りの着地を狙ってみよう。':'落とし穴に落ちてしまいました。手前から勢いをつけて跳ぼう。';
 const canBuy=UPGRADES.some(u=>save.upgrades[u.key]<MAX_LEVEL&&save.coins>=COSTS[save.upgrades[u.key]]);
 showModal(`<div class="eyebrow">${clear?'TRAIL COMPLETE':newRecord?'A LITTLE FURTHER':'BACK TO THE GARAGE'}</div><div class="result-stamp">${clear?'★ ★ ★':newRecord?'✦':'↟'}</div><h2>${clear?'走りきった！':newRecord?'新しい景色まで、来た。':'もう一度、あの坂へ。'}</h2><div class="result-big">${format(run.distance)} <small>m</small></div><p>${newRecord?`自己記録を ${meters(run.distance-prevBest)} 更新！`:previousBest?`自己記録まで、あと ${meters(Math.max(0,previousBest-run.distance))}`:''}</p><div class="result-stats"><div><span>今回のコイン</span><b>+${format(allGained)}</b></div><div><span>斜面着地 / 最長連続</span><b>${run.nice} / ${run.bestChain}</b></div><div><span>走行時間</span><b>${timeString(run.time)}</b></div></div><div class="result-bonus">JUST ${run.just}回 ／ 空中の燃料 +${Math.round(run.skillFuel)} ／ 大減速 ${run.hardLandings}回<br>${message}${resultData.awards.length?`<br>★ ${resultData.awards.join(' / ')}`:''}</div><button class="primary" data-action="${clear&&resultData.newRegion?'next':'retry'}">${clear&&resultData.newRegion?'次の道へ':'もう一度走る'} <span>→</span></button><button class="secondary" data-action="garage">${canBuy?'● 強化できるパーツがあります':'車を育てる'}</button>${selected===3?'<button class="text-button" data-action="newExpedition">新しい道に挑む</button>':''}<button class="text-button" data-action="menu">行き先を選ぶ</button>`,false);
}
function settings(){
 const wasPlaying=mode==='playing';if(wasPlaying){mode='paused';clearInput();H.bankProgress(run,save);persist();}
 showModal(`<div class="eyebrow">MAKE YOURSELF AT HOME</div><h2>旅の設定</h2><label class="settings-row">音量<input id="volume" type="range" min="0" max="1" step=".05" value="${save.sound}" aria-label="音量"></label><label class="settings-row">BGM<input id="music" type="checkbox" ${save.music?'checked':''}></label><label class="settings-row">着地の画面揺れ<input id="shake" type="checkbox" ${save.shake?'checked':''}></label><div class="key-help">アクセル：→ / D　ブレーキ：← / A<br>ジャンプ：SPACE / ↑　短押しは低く、長押しは高く。ジャンプの燃料消費なし。<br>黄色の帯で跳び、青緑の下りへ着地。空中ではアクセルを離そう。<br>空中では、アクセルで前を上げ、ブレーキで前を下げます。<br>一時停止：ESC / P</div><p>進み具合は自動保存されます。別の端末や「ホーム画面に追加」へ移すときは、セーブを書き出して読み込んでください。</p><p>旧版とは別のセーブです。車を比べたいときは、旧版のコイン・強化・パーツをコピーできます。</p><button class="secondary" data-action="copyCar">旧版の車をコピー</button><div class="settings-save"><button class="secondary" data-action="export">セーブを書き出す</button><button class="secondary" data-action="import">セーブを読み込む</button></div><button class="primary" data-action="settingsDone" style="margin-top:22px">${mode==='paused'?'走行に戻る':'戻る'}</button>`);
 $('volume').oninput=e=>{save.sound=Number(e.target.value);audio.start();persist();};$('music').onchange=e=>{save.music=e.target.checked;persist();};$('shake').onchange=e=>{save.shake=e.target.checked;persist();};
}
function showHelp(){showModal(`<div class="eyebrow">HILLHOP GARAGE 2</div><h2>勢いを、つなぐ。</h2><div class="drive-guide"><p><b>① 黄色の帯までに助走</b><br>谷の手前でアクセル。遅いまま跳ぶと、向こうの登りにぶつかります。</p><p><b>② 跳んで、空中の燃料へ</b><br>黄色の帯でジャンプ。短い谷は低く、広い谷は高く。段差や二連の山も出現します。ジャンプの燃料消費はありません。</p><p><b>③ 青緑の下りへ着地</b><br>空中はアクセルを離し、車の鼻を下りへ。角度が合うと JUST！ 光と加速で勢いがつながります。斜めにぶつかると大減速。</p></div><p>地面の道は安全ですが、遠回りと荒れ道で燃料を使います。失敗してもコインを持ち帰り、車を育てられます。</p><button class="primary" data-action="lesson">操作を練習する</button><button class="secondary" data-action="settingsDone">戻る</button>`);}
function offerLesson(){
 save.tutorial='seen';persist();
 showModal(`<div class="eyebrow">DRIVING SCHOOL</div><h2>まずは、ひと跳び。</h2><p>助走、ジャンプ、空中でアクセルを離す、姿勢を合わせて着地。ひとつずつ実際に操作して練習できます。</p><p>大事なところで時間が止まります。失敗してもすぐやり直せて、燃料切れもありません。練習中はコインや記録も変わりません。</p><button class="primary" data-action="lesson">操作を練習する</button><button class="secondary" data-action="skipLesson">練習せずに走る</button><p>練習はメニューからいつでも開けます。</p>`);
}
function resetLessonUI(){
 lesson=null;lessonView='';$('coach').hidden=true;$('hud').classList.remove('practicing');
 for(const name of ['gas','brake','jump'])$(name).classList.remove('coach-focus');
}
function startLesson(guided=true){
 if(run&&!run.practice&&mode!=='result')H.bankProgress(run,save);
 if(save.tutorial==='new')save.tutorial='seen';persist();audio.start();closeModal();clearInput();
 lesson=new DrivingLesson(guided);run=lesson.run;mode='playing';activeRegion=REGIONS[0];
 particles=[];floaters=[];landingBursts=[];landingTime=0;$('landingFeedback').className='landing-feedback';
 calloutTime=tipTime=0;$('callout').classList.remove('show');$('tip').classList.remove('show');
 accumulator=0;bankTimer=0;camX=run.x;camY=run.y;zoom=.85;wheelSpin=0;previousBest=0;
 $('menu').hidden=true;$('hud').hidden=false;$('hud').classList.add('practicing');$('bestMarker').hidden=true;$('coach').hidden=false;
 lessonView='';updateHUD();updateLessonUI();
}
function continueLesson(){
 if(!lesson||mode!=='playing')return;
 if(lesson.stage==='release'&&(input.gas||input.jump))return;
 if(lesson.continue()){clearInput();updateLessonUI();}
}
function retryLesson(){
 if(!lesson)return;closeModal();clearInput();mode='playing';
 if(!lesson.retry()){startLesson(lesson.guided);return;}
 particles=[];floaters=[];landingBursts=[];landingTime=0;$('landingFeedback').className='landing-feedback';accumulator=0;camX=run.x+200;camY=run.y;lessonView='';updateLessonUI();
}
function updateLessonUI(){
 if(!lesson)return;
 const state=lesson.stage,ready=state==='release'&&!input.gas&&!input.jump||state==='pose'&&lesson.poseMatched;
 const key=`${state}:${ready}:${lesson.guided}`;if(key===lessonView)return;lessonView=key;
 const copy={
  drive:lesson.guided?['1 / 5 · 助走','アクセルを押し続けよう','黄色の帯までに速度をつけます。踏み切りの場所で、いったん止まります。','gas']:['仕上げの練習','今度は、自分のタイミングで','黄色でジャンプを少し長押し → 空中で離す → 青緑に着地。今回は時間が止まりません。',''],
  jump:['2 / 5 · ジャンプ','ジャンプを少し長押し','アクセルはそのままで大丈夫。ジャンプを押すと時間が動き、空中でまた止まります。','jump'],
  rise:['2 / 5 · ジャンプ','少しだけ、押し続けよう','長押しすると高く、短押しすると低く跳べます。ジャンプ自体には燃料を使いません。','jump'],
  release:['3 / 5 · 空中の操作',ready?'離せました！':'アクセルとジャンプを離そう','空中でアクセルを離しても、前への勢いは続きます。燃料を節約しながら、着地を狙いましょう。',ready?'':'gas'],
  pose:['4 / 5 · 姿勢の練習',ready?'下りの角度に合いました！':'ブレーキで、車の前を下げよう',ready?'押し続けすぎると下を向きすぎます。反対に、アクセルを押すと前が上がります。':'車を空中で止めています。ブレーキを少し押し、車体を青緑の線に合わせましょう。',ready?'':'brake'],
  land:['5 / 5 · 着地（ゆっくり）','青緑の下りへ、着地しよう','何も押さなくても鼻先は自然に下がります。必要なときだけ、ブレーキで下げる／アクセルで上げる。',''],
  celebrate:['5 / 5 · 成功！',run.just?'JUST！ 勢いがつながった！':'GOOD！ 下りに着地できました','角度がぴったり合うとJUST。加速して、次の坂へつながります。',''],
  failed:['もう一度、同じ場所から','大丈夫。すぐにやり直せます',lesson.failure,''],
  done:['練習完了',run.just?'JUST着地、できましたね。':'下りへの着地、できましたね。','本番では、空中の燃料を取りながら着地をつなぎます。短い谷は短押し、長い谷は長押しで跳び分けましょう。','']
 }[state];
 $('coachStep').textContent=copy[0];$('coachTitle').textContent=copy[1];$('coachText').textContent=copy[2];
 for(const name of ['gas','brake','jump'])$(name).classList.toggle('coach-focus',copy[3]===name);
 const next=$('coachNext');next.hidden=!['release','pose'].includes(state);next.disabled=!ready;next.textContent=state==='pose'?'着地してみる':'姿勢の練習へ';
 $('coachRetry').hidden=state!=='failed';$('coachAgain').hidden=state!=='done';$('coachPlay').hidden=state!=='done';
 $('coachExit').textContent=state==='done'?'メニューに戻る':'練習を終える';
 if(state==='done'&&save.tutorial!=='done'){save.tutorial='done';persist();}
}

function copyOldCar(){
 let old;try{old=JSON.parse(localStorage.getItem('hillhop-garage-v1'));if(!old||old.version!==1||!old.upgrades)throw Error();}catch{toast('同じブラウザに旧版のセーブが見つかりませんでした。');return;}
 showModal(`<div class="eyebrow">BRING YOUR CAR</div><h2>旧版の車をコピー？</h2><p>「2」のコイン・強化・パーツを、旧版のデータで置き換えます。「2」のコース記録は保持し、旧版のセーブは変更しません。</p><button class="primary" id="confirmCarCopy">コピーする</button><button class="secondary" data-action="settings">戻る</button>`);
 $('confirmCarCopy').onclick=()=>{const copy=H.sanitizeSave({...save,coins:old.coins,upgrades:old.upgrades,parts:old.parts,part:old.part});save=copy;persist();closeModal();goMenu('garage');toast('旧版の車を「2」にコピーしました。');};
}
function exportSave(){if(run&&mode!=='result'){H.bankProgress(run,save);persist();}const blob=new Blob([JSON.stringify(save,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='hillhop-2-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);toast('セーブを書き出しました。');}
$('importFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>100000)throw new Error('セーブファイルを確認してください。');const data=H.sanitizeSave(JSON.parse(await file.text()));showModal(`<div class="eyebrow">WELCOME BACK</div><h2>この旅を引き継ぐ？</h2><p>コイン ${format(data.coins)} ／ 出走 ${data.runs}回<br>現在のセーブは、このデータで置き換わります。</p><button class="primary" id="confirmImport">読み込む</button><button class="secondary" data-action="settings">キャンセル</button>`);$('confirmImport').onclick=()=>{save=data;run=null;mode='menu';selected=data.selected;persist();goMenu();toast('旅の続きを読み込みました。');};}catch(error){toast(error.message||'セーブを読み込めませんでした。',5);}e.target.value='';};
document.addEventListener('click',e=>{
 const route=e.target.closest('[data-route]'),buy=e.target.closest('[data-buy]'),paint=e.target.closest('[data-paint]'),action=e.target.closest('[data-action]');
 if(route){audio.start();audio.effect('click');chooseRoute(Number(route.dataset.route));}
 if(buy){const key=buy.dataset.buy,lv=save.upgrades[key],cost=COSTS[lv];if(lv<MAX_LEVEL&&save.coins>=cost){save.coins-=cost;save.upgrades[key]++;persist();audio.start();audio.effect('upgrade');toast(`${UPGRADES.find(u=>u.key===key).name}がレベル${lv+1}に！`);refreshMenu();}}
 if(paint){save.paint=Number(paint.dataset.paint);persist();refreshMenu();audio.effect('click');}
 if(action){audio.start();const a=action.dataset.action;if(a==='lesson')startLesson();else if(a==='skipLesson'){save.tutorial='seen';persist();startRun();}else if(a==='coachNext')continueLesson();else if(a==='coachRetry')retryLesson();else if(a==='coachAgain')startLesson(false);else if(a==='coachPlay'){save.tutorial='done';persist();startRun();}else if(a==='resume')resumeRun();else if(a==='retry'){if(run&&mode!=='result'){H.bankProgress(run,save);persist();}startRun();}else if(a==='garage')goMenu('garage');else if(a==='menu')goMenu();else if(a==='next'){chooseRoute(Math.min(3,selected+1));startRun();}else if(a==='newExpedition')startRun(false);else if(a==='settings')settings();else if(a==='settingsDone'){closeModal();if(mode==='paused')resumeRun();else refreshMenu();}else if(a==='help')showHelp();else if(a==='copyCar')copyOldCar();else if(a==='export')exportSave();else if(a==='import')$('importFile').click();}
 const t=e.target.closest('[data-tab]');if(t){setTab(t.dataset.tab);audio.effect('click');}
});
$('partSelect').onchange=e=>{save.part=e.target.value;persist();refreshMenu();};$('start').onclick=()=>startRun();$('garageStart').onclick=()=>startRun();$('settingsOpen').onclick=settings;$('pause').onclick=pauseRun;$('modalClose').onclick=()=>{if(mode==='paused')resumeRun();else closeModal();};
function syncInput(){for(const name of ['gas','brake','jump']){input[name]=[...pressedPointers.values()].includes(name)||[...keys].some(k=>keyMap[k]===name);$(name).classList.toggle('pressed',input[name]);}}
const keyMap={ArrowRight:'gas',KeyD:'gas',ArrowLeft:'brake',KeyA:'brake',Space:'jump',ArrowUp:'jump',KeyW:'jump'};
for(const name of ['gas','brake','jump']){const button=$(name);button.onpointerdown=e=>{e.preventDefault();if(mode!=='playing')return;audio.start();button.setPointerCapture(e.pointerId);pressedPointers.set(e.pointerId,name);syncInput();};const release=e=>{pressedPointers.delete(e.pointerId);syncInput();};button.onpointerup=release;button.onpointercancel=release;button.onlostpointercapture=release;}
document.addEventListener('keydown',e=>{if(e.target.matches('input,select'))return;if(e.code==='Enter'&&lesson&&mode==='playing'){e.preventDefault();if(!e.repeat)continueLesson();return;}if(['Escape','KeyP'].includes(e.code)){if(e.repeat)return;e.preventDefault();if(mode==='playing')pauseRun();else if(mode==='paused')resumeRun();return;}if(keyMap[e.code]&&mode==='playing'){e.preventDefault();keys.add(e.code);syncInput();audio.start();}});
document.addEventListener('keyup',e=>{if(keyMap[e.code]){e.preventDefault();keys.delete(e.code);syncInput();}});
for(const name of ['gas','brake','jump'])for(const event of ['touchstart','touchmove'])$(name).addEventListener(event,e=>{if(mode==='playing'&&e.cancelable)e.preventDefault();},{passive:false});
document.addEventListener('contextmenu',e=>e.preventDefault());document.addEventListener('visibilitychange',()=>{if(document.hidden){if(mode==='playing')pauseRun();audio.suspend();}else audio.resume();});window.addEventListener('blur',()=>{if(mode==='playing')pauseRun();});window.addEventListener('pagehide',()=>{if(run&&mode!=='result')H.bankProgress(run,save);persist();});

// A softly layered engine and a small acoustic-style melody, synthesized locally.
class Sound{
 constructor(){this.ctx=null;this.nextNote=0;this.note=0;this.lastCoin=0;}
 start(){if(!this.ctx){try{const Audio=window.AudioContext||window.webkitAudioContext;this.ctx=new Audio();this.master=this.ctx.createGain();this.master.gain.value=save.sound*.22;this.master.connect(this.ctx.destination);this.engine=this.ctx.createOscillator();this.engine.type='sawtooth';this.filter=this.ctx.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=280;this.engineGain=this.ctx.createGain();this.engineGain.gain.value=0;this.engine.connect(this.filter);this.filter.connect(this.engineGain);this.engineGain.connect(this.master);this.engine.start();}catch{return;}}this.resume();}
 resume(){if(this.ctx?.state==='suspended')this.ctx.resume().catch(()=>{});}
 suspend(){if(this.ctx)this.ctx.suspend().catch(()=>{});}
 tone(freq,duration=.12,type='sine',volume=.4,slide=0,delay=0){if(!this.ctx)return;const t=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(slide,t+duration);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration+.02);}
 effect(kind){if(!this.ctx)return;const t=this.ctx.currentTime;if(kind==='coin'){if(t-this.lastCoin<.04)return;this.lastCoin=t;this.tone(880+(Math.floor(clock*5)%3)*110,.1,'sine',.25,1450);}else if(kind==='jump')this.tone(190,.16,'triangle',.22,360);else if(kind==='land')this.tone(80,.1,'triangle',.2,40);else if(kind==='just'){this.tone(180,.22,'triangle',.4,720);[784,1175,1568].forEach((f,i)=>this.tone(f,.28,'sine',.32,0,i*.045));}else if(kind==='crash'){this.tone(135,.24,'sawtooth',.3,38);this.tone(65,.32,'triangle',.45,25);}else if(kind==='nice'){this.tone(587,.15,'sine',.25);this.tone(880,.22,'sine',.2,0,.06);}else if(kind==='fuel'){this.tone(392,.14,'triangle',.35);this.tone(587,.25,'triangle',.3,0,.1);}else if(kind==='upgrade'||kind==='clear'){[392,494,587,784].forEach((v,i)=>this.tone(v,.35,'triangle',.3,0,i*.08));}else if(kind==='fail'){this.tone(294,.3,'triangle',.25,180);this.tone(196,.4,'triangle',.2,110,.2);}else if(kind==='turbo')this.tone(130,.3,'sawtooth',.1,400);else this.tone(440,.06,'sine',.13);}
 update(){if(!this.ctx||this.ctx.state!=='running')return;const t=this.ctx.currentTime;this.master.gain.setTargetAtTime(save.sound*.22,t,.05);const driving=mode==='playing';this.engineGain.gain.setTargetAtTime(driving?.025+(input.gas?.06:.015):0,t,.12);this.engine.frequency.setTargetAtTime(driving?44+Math.abs(run.vx)*.12+(input.gas?15:0):45,t,.08);this.filter.frequency.setTargetAtTime(input.gas?390:190,t,.1);if(save.music&&save.sound>0&&t>=this.nextNote){const melody=[392,0,494,587,0,494,440,0,349,0,440,523,0,440,392,0,330,0,392,494,0,587,494,440,349,0,392,440,0,330,294,0];const f=melody[this.note%melody.length];if(f)this.tone(f,.5,'triangle',driving?.075:.13);if(this.note%8===0)this.tone([130.81,174.61,164.81,146.83][Math.floor(this.note/8)%4],1.1,'sine',.11);this.note++;this.nextNote=t+.28;}}
}
const audio=new Sound();

function resize(){const rect=canvas.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);screenScale=rect.height/720;w=rect.width/screenScale;h=720;ctx.setTransform(dpr*screenScale,0,0,dpr*screenScale,0,0);}
window.addEventListener('resize',resize);resize();
function path(points,fill,stroke=null,width=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function ellipse(x,y,rx,ry,color){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
function rounded(x,y,width,height,r,fill,stroke=null,line=1){ctx.beginPath();ctx.roundRect(x,y,width,height,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}}
function line(x1,y1,x2,y2,color,width){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function text(value,x,y,size,color,align='center',weight=800){ctx.fillStyle=color;ctx.font=`${weight} ${size}px -apple-system, BlinkMacSystemFont, sans-serif`;ctx.textAlign=align;ctx.fillText(value,x,y);}
function cloud(x,y,s,alpha=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.globalAlpha=alpha;ctx.fillStyle='#fff9e8';ctx.beginPath();ctx.moveTo(-60,15);ctx.bezierCurveTo(-80,15,-72,-10,-48,-11);ctx.bezierCurveTo(-47,-43,-12,-43,0,-21);ctx.bezierCurveTo(25,-43,54,-25,49,-5);ctx.bezierCurveTo(77,-10,85,18,57,19);ctx.lineTo(-60,19);ctx.fill();ctx.restore();}
function background(r,camera){
 const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,r.sky[0]);sky.addColorStop(.78,r.sky[1]);ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
 const sunX=w*.69-camera*.008;const glow=ctx.createRadialGradient(sunX,135,0,sunX,135,150);glow.addColorStop(0,'#fffbd98a');glow.addColorStop(1,'#fffbd900');ctx.fillStyle=glow;ctx.fillRect(sunX-150,-15,300,300);ellipse(sunX,135,35,35,'#fff2c9');
 for(let i=-1;i<7;i++){const x=((i*310-camera*.065+clock*2)%(w+500)+w+500)%(w+500)-180;cloud(x,85+(i%3)*49,.65+(i%2)*.32,.72);}
 const bands=[{factor:.12,base:355,amp:145,color:r.far,period:570},{factor:.23,base:415,amp:125,color:r.mountain,period:440},{factor:.4,base:490,amp:80,color:r.hill,period:390}];
 for(let b=0;b<bands.length;b++){const band=bands[b];ctx.beginPath();ctx.moveTo(-20,h);for(let x=-20;x<w+25;x+=12){const px=x+camera*band.factor;let y=band.base-Math.pow((Math.sin(px/band.period*3)+1)*.5,b===0?2:1)*band.amp-Math.sin(px/157+2)*18;if(r===REGIONS[1]&&b<2)y=Math.round(y/28)*28;if(r===REGIONS[2]&&b===0)y-=Math.abs(Math.sin(px/135))*65;ctx.lineTo(x,y);}ctx.lineTo(w+20,h);ctx.fillStyle=band.color;ctx.fill();
  if(b===1&&r===REGIONS[2]){for(let i=0;i<6;i++){const x=i*300-camera*.23%300;path([[x,322],[x+24,270],[x+55,318],[x+37,309],[x+29,319],[x+20,307]],'#d7ddd1');}}
 }
 // Distant groves, a windmill and cable silhouettes make each place recognizable.
 if(r===REGIONS[0]){for(let i=0;i<10;i++){let x=i*170-camera*.4%170;tree(x,476+Math.sin((x+camera*.4)/180)*17,.28,'#648f79',i*.23,false);}const x=((800-camera*.22)%(w+700)+(w+700))%(w+700)-180;windmill(x,430,.7);}
 if(r===REGIONS[1]){for(let i=0;i<7;i++){let x=i*250-camera*.4%250;cactus(x,476,.5,'#9b805f');}}
 if(r===REGIONS[2]){for(let i=0;i<6;i++){let x=i*280-camera*.4%280;pine(x,466,.58,'#67857f');}let x=800-camera*.22%1600;line(x,390,x,280,'#668287',3);line(x-45,287,x+45,287,'#668287',3);ctx.beginPath();ctx.moveTo(x-900,264);ctx.quadraticCurveTo(x-420,375,x,287);ctx.quadraticCurveTo(x+420,375,x+900,264);ctx.strokeStyle='#66828766';ctx.lineWidth=1.4;ctx.stroke();}
 if(r===REGIONS[1]){
  const ax=((900-camera*.28)%(w+1000)+w+1000)%(w+1000)-300;
  ctx.save();ctx.strokeStyle='#a77358';ctx.lineWidth=47;ctx.beginPath();ctx.moveTo(ax,492);ctx.lineTo(ax,402);ctx.bezierCurveTo(ax,240,ax+245,240,ax+245,402);ctx.lineTo(ax+245,492);ctx.stroke();
  ctx.strokeStyle='#d79b6f';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(ax-16,392);ctx.bezierCurveTo(ax,247,ax+250,240,ax+260,390);ctx.stroke();
  for(let j=0;j<4;j++){const tx=ax+370+j*62;line(tx,490,tx,434,'#82684f',6);line(tx,486,tx+62,438,'#82684f',3);}line(ax+358,433,ax+630,433,'#82684f',7);ctx.restore();
 }
 if(r===REGIONS[2]){
  for(let i=-1;i<8;i++){const cx=((i*225-camera*.17)%(w+450)+w+450)%(w+450)-190;cloud(cx,492+(i%2)*22,1.6,.35);}
  const t=.26,cx=800-camera*.22%1600+2*(1-t)*t*420+t*t*900,cy=(1-t)**2*287+2*(1-t)*t*375+t*t*264;
  line(cx,cy,cx,cy+16,'#668287',2);rounded(cx-15,cy+14,30,23,5,'#c29664','#627d80',2);rounded(cx-10,cy+18,20,10,2,'#dbe5da');
 }
 for(let i=0;i<4;i++){const x=((i*211+clock*9-camera*.08)%(w+160)+w+160)%(w+160)-60,y=190+(i%3)*35;ctx.beginPath();ctx.moveTo(x-7,y);ctx.quadraticCurveTo(x-3,y-4-Math.sin(clock*4+i)*2,x,y);ctx.quadraticCurveTo(x+4,y-5+Math.sin(clock*4+i)*2,x+8,y);ctx.strokeStyle='#53776b66';ctx.lineWidth=1.5;ctx.stroke();}
}
function tree(x,y,s,color,seed=0,detailed=true){ctx.save();ctx.translate(x,y);ctx.scale(s,s);line(0,0,-2,-88,detailed?'#706c46':color,9);line(-2,-48,-28,-78,detailed?'#706c46':color,5);ellipse(-28,-87,28,34,color);ellipse(18,-109,35,39,color);ellipse(-8,-128,29,30,color);ellipse(32,-78,29,28,color);if(detailed){ellipse(-18,-118,21,20,'#aac475');ellipse(14,-137,16,15,'#aac475');ellipse(30,-93,17,17,'#8eaf62');}ctx.restore();}
function pine(x,y,s,color){ctx.save();ctx.translate(x,y);ctx.scale(s,s);line(0,0,0,-112,'#6b7463',7);for(let i=0;i<3;i++)path([[-39+i*9,-20-i*27],[0,-92-i*20],[39-i*9,-20-i*27]],color);ctx.restore();}
function cactus(x,y,s,color){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.lineCap='round';line(0,0,0,-89,color,17);line(0,-36,-25,-36,color,13);line(-25,-36,-25,-64,color,13);line(0,-54,23,-54,color,12);line(23,-54,23,-78,color,12);line(-3,-12,-3,-78,'#c6b98c55',3);ctx.restore();}
function windmill(x,y,s){ctx.save();ctx.translate(x,y);ctx.scale(s,s);path([[-12,0],[-6,-100],[7,-100],[15,0]],'#d5dbb1');line(-8,0,7,-100,'#789388',2);ellipse(0,-103,9,9,'#739286');ctx.save();ctx.translate(0,-103);ctx.rotate(clock*.24);for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);path([[3,3],[10,49],[-5,59],[-5,13]],'#eaf0d3','#aab9a1',1);}ctx.restore();ctx.restore();}
function screenPos(x,y){return{x:(x-camX)*zoom+w*.29,y:h*.53-(y-camY)*zoom};}
function groundPath(track,left,right,offset=0){ctx.beginPath();let first=true;for(let x=left;x<=right+15;x+=15){const p=screenPos(x,track.height(x)+offset);if(first){ctx.moveTo(p.x,p.y);first=false;}else ctx.lineTo(p.x,p.y);}ctx.lineTo(screenPos(right+15,0).x,h+150);ctx.lineTo(screenPos(left,0).x,h+150);ctx.closePath();}
function terrain(track,r){
 const left=camX-w*.29/zoom-40,right=camX+w*.75/zoom+40;
 const spans=[];let from=left;for(const gap of track.gaps){if(gap.b<left||gap.a>right)continue;spans.push([from,gap.a]);from=gap.b;}spans.push([from,right]);
 for(const [a,b]of spans){if(b<=a)continue;groundPath(track,a,b);const soil=ctx.createLinearGradient(0,350,0,h+30);soil.addColorStop(0,r.soil);soil.addColorStop(1,r.deep);ctx.fillStyle=soil;ctx.fill();ctx.save();ctx.clip();
  for(let j=0;j<5;j++){ctx.beginPath();for(let x=a-30;x<b+40;x+=25){const p=screenPos(x,track.height(x)-55-j*66-Math.sin(x/173+j)*15);if(x===a-30)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}ctx.strokeStyle=j%2?'#eeddb617':'#594d3921';ctx.lineWidth=(j%2?4:9)*zoom;ctx.stroke();}
  for(let i=Math.floor(a/93);i<b/93+1;i++){const seed=Math.abs(Math.sin(i*78.233)),x=i*93,p=screenPos(x,track.height(x)-55-seed*280);path([[p.x-5,p.y],[p.x+3,p.y-3],[p.x+11,p.y+4],[p.x-2,p.y+7]],'#493f3420');}
  ctx.restore();
  ctx.beginPath();for(let x=a;x<=b+1;x+=7){const p=screenPos(Math.min(x,b),track.height(Math.min(x,b)));if(x===a)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}ctx.strokeStyle=r.grass;ctx.lineWidth=14*zoom;ctx.lineJoin='round';ctx.stroke();ctx.strokeStyle=r.edge;ctx.lineWidth=4*zoom;ctx.stroke();
 }
 for(const gap of track.gaps){if(gap.b<left||gap.a>right)continue;for(const gx of [gap.a,gap.b]){const p=screenPos(gx,track.height(gx));line(p.x,p.y+6,p.x,h+100,r.deep,5);for(let j=0;j<5;j++){line(p.x,p.y+35+j*34,p.x+(gx===gap.a?-12:12),p.y+25+j*34,'#e7c69444',3);}}const marker=screenPos(gap.a-260,track.height(gap.a-260));warningSign(marker.x,marker.y,zoom);}
 for(const p of track.platforms){if(p.b<left||p.a>right)continue;const a=screenPos(p.a,p.y),b=screenPos(p.b,p.y);rounded(a.x,a.y,b.x-a.x,12*zoom,2,'#b58a56','#785f43',2);for(let px=a.x+10;px<b.x;px+=20*zoom)line(px,a.y+1,px,a.y+10*zoom,'#785f43',1);for(const xx of [p.a+25,p.b-25]){const top=screenPos(xx,p.y-10),bot=screenPos(xx,track.height(xx));line(top.x,top.y,bot.x,bot.y,'#826e4f',7*zoom);}line(a.x+23*zoom,a.y+15*zoom,b.x-23*zoom,a.y+55*zoom,'#a58c60',3*zoom);}
}
function challengeArt(track){
 const left=camX-w*.35/zoom,right=camX+w*.8/zoom;
 const band=(a,b,color)=>{ctx.beginPath();for(let x=a;x<=b;x+=7){const p=screenPos(x,track.height(x)+4);if(x===a)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}ctx.strokeStyle=color;ctx.lineWidth=9*zoom;ctx.lineCap='round';ctx.stroke();ctx.lineCap='butt';};
 for(const c of track.challenges){if(c.landB<left||c.launchA>right)continue;
  band(c.launchA,c.launchB,'#ffd16d');band(c.landA,c.landB,c.cleared?'#dcffd5':'#70ded0');
  for(let x=c.launchA+12;x<c.launchB-10;x+=40){const p=screenPos(x,track.height(x)+25);line(p.x-6*zoom,p.y+4*zoom,p.x,p.y-4*zoom,'#fff6c3',3*zoom);line(p.x,p.y-4*zoom,p.x+6*zoom,p.y+4*zoom,'#fff6c3',3*zoom);}
  for(let x=c.roughA;x<c.roughB;x+=38){const p=screenPos(x,track.height(x)+3);path([[p.x-6*zoom,p.y],[p.x,p.y-7*zoom],[p.x+9*zoom,p.y]],'#716951');}
  if(!lesson)continue;
  const take=screenPos((c.launchA+c.launchB)/2,track.height(c.launchB)+90),land=screenPos((c.landA+c.landB)/2,track.height((c.landA+c.landB)/2)+75);
  rounded(take.x-65,take.y-34,130,43,12,'#fff0c1f2');text(c.name,take.x,take.y-16,12,'#795224');text('↟ 踏み切り',take.x,take.y,10,'#8b612a');
  rounded(land.x-48,land.y-18,96,27,13,'#ddfff0ed');text(c.cleared?'✓ つながった':'↘ 下りへ着地',land.x,land.y,11,'#286e66');
 }
}
function warningSign(x,y,s){ctx.save();ctx.translate(x,y);ctx.scale(s,s);line(0,0,0,-63,'#7b6c4e',5);path([[0,-91],[22,-54],[-22,-54]],'#f0c251','#686548',3);text('!',0,-61,25,'#695542');ctx.restore();}
function scenery(track,r){const left=camX-w*.33/zoom-150,right=camX+w*.8/zoom+150;
 for(const p of track.props){if(p.x<left||p.x>right||track.gapAt(p.x))continue;const pos=screenPos(p.x,track.height(p.x));const s=zoom*(p.size||1);
  if(p.type==='tree'){if(r===REGIONS[1])cactus(pos.x,pos.y,s*.9,'#748a60');else if(r===REGIONS[2])pine(pos.x,pos.y,s,'#4f7866');else tree(pos.x,pos.y,s*.8,'#769b56',p.seed);}
  else if(p.type==='rock'){ctx.save();ctx.translate(pos.x,pos.y);ctx.scale(s,s);path([[-17,1],[-13,-12],[1,-20],[14,-10],[21,1]],r===REGIONS[1]?'#b88967':'#8b9674');path([[-13,-12],[1,-20],[14,-10],[-2,-7]],'#d0c69b77');ctx.restore();}
  else if(p.type==='grass'){ctx.save();ctx.translate(pos.x,pos.y+1);ctx.scale(s,s);const sway=Math.sin(clock*1.8+p.x)*3;line(-5,0,-10+sway,-16,r.grass,2);line(0,0,sway,-21,r.grass,2);line(4,0,11+sway,-12,r.grass,2);if(p.seed>.6){ellipse(sway,-22,3,3,r===REGIONS[0]?'#f0d674':'#e7dfbc');ellipse(-10+sway,-17,2.3,2.3,'#f7edc3');}ctx.restore();}
  else if(p.type==='sign'){ctx.save();ctx.translate(pos.x,pos.y);ctx.scale(zoom,zoom);line(0,0,0,-53,'#8a7857',4);rounded(-22,-62,44,21,4,'#f3e9bd','#baaa79',1);text(`${p.number}`,0,-48,10,'#5d765f');ctx.restore();}
  else if(p.type==='sector'){ctx.save();ctx.translate(pos.x,pos.y);ctx.scale(zoom,zoom);line(-72,0,-72,-108,'#706b55',5);line(72,0,72,-108,'#706b55',5);rounded(-89,-116,178,43,6,r===REGIONS[1]?'#714e40':'#41686e','#f1d89f',2);text(p.name,0,-89,16,'#fff2ce');for(let j=0;j<5;j++)path([[-70+j*30,-71],[-50+j*30,-71],[-60+j*30,-53]],j%2?'#efc56e':'#79bbad');ctx.restore();}
  else if(p.type==='finish'||p.type==='start'){ctx.save();ctx.translate(pos.x,pos.y);ctx.scale(zoom,zoom);line(0,0,0,-166,'#516d5e',7);line(220,0,220,-166,'#516d5e',7);rounded(-12,-170,244,41,4,p.type==='finish'?'#fff4d0':'#367668');text(p.type==='finish'?'FINISH · おかえり':'HAVE A GOOD TRIP',110,-143,p.type==='finish'?18:14,p.type==='finish'?'#31564c':'#fff3d0');if(p.type==='finish'){for(let k=0;k<12;k++)if(k%2===0)ctx.fillStyle='#31564c',ctx.fillRect(k*20-12,-170,20,8);}ctx.restore();}
 }
}
function itemArt(item,px,py,size=1){ctx.save();ctx.translate(px,py);ctx.scale(size,size);const bob=Math.sin(clock*3+item.phase)*3;ctx.translate(0,bob);const type=item.type;
 if(type==='coin'){const sx=.74+Math.abs(Math.sin(clock*1.5+item.phase))*.26;ctx.scale(sx,1);ellipse(0,2,11,12,'#b78330');ellipse(0,0,11,12,item.value>1?'#ffe185':'#f5c658');ctx.beginPath();ctx.ellipse(0,0,7.3,8.2,0,0,Math.PI*2);ctx.strokeStyle='#d89b33';ctx.lineWidth=1.8;ctx.stroke();line(-2,-4,-2,4,'#fff1a5',2.5);}
 else{const glow=ctx.createRadialGradient(0,0,5,0,0,36);glow.addColorStop(0,type==='fuel'?'#ffdf9077':'#fff9d999');glow.addColorStop(1,'#fff9d900');ctx.fillStyle=glow;ctx.fillRect(-36,-36,72,72);
  if(type==='fuel'){if(item.skill){ctx.beginPath();ctx.arc(0,0,30,0,Math.PI*2);ctx.strokeStyle='#fff3b8';ctx.lineWidth=3;ctx.stroke();rounded(-35,-56,70,23,11,'#31534cec');text('AIR +10',0,-40,12,'#fff9d5');}ctx.rotate(-.1);rounded(-14,-17,28,34,5,'#de7648','#914f37',2);rounded(-8,-22,14,6,2,'#995c3c');rounded(7,-23,9,7,2,'#585f4a');line(-9,-10,8,8,'#f3b276',2);line(8,-10,-9,8,'#f3b276',2);path([[0,-9],[-5,1],[-1,1],[-3,9],[6,-2],[1,-2]],'#fff2c3');}
  else if(type==='magnet'){rounded(-17,-18,34,36,10,'#f6f0c9','#4d8e82',2);ctx.beginPath();ctx.moveTo(-8,-8);ctx.lineTo(-8,5);ctx.quadraticCurveTo(0,16,8,5);ctx.lineTo(8,-8);ctx.strokeStyle='#df7a58';ctx.lineWidth=7;ctx.stroke();line(-8,-8,-8,-2,'#e4e9d7',7);line(8,-8,8,-2,'#e4e9d7',7);}
  else{rounded(-16,-18,32,36,9,'#4e9390','#345f59',2);path([[1,-12],[-9,3],[-1,3],[-3,13],[10,-3],[2,-3]],'#ffe6a0');}}
 ctx.restore();}
function wheel(x,y,r,spin){ctx.save();ctx.translate(x,y);ctx.rotate(spin);ellipse(0,0,r+1,r+1,'#213b3c');ellipse(0,0,r-3,r-3,'#344b48');for(let i=0;i<12;i++){ctx.save();ctx.rotate(i*Math.PI/6);rounded(-2,-r+1,4,5,1,'#708077');ctx.restore();}ellipse(0,0,r*.58,r*.58,'#acb5a0');ellipse(0,0,r*.4,r*.4,'#5b7771');for(let i=0;i<5;i++){const a=i*Math.PI*2/5;line(Math.cos(a)*r*.19,Math.sin(a)*r*.19,Math.cos(a)*r*.47,Math.sin(a)*r*.47,'#d5dac5',3);}ellipse(0,0,3,3,'#eadfb5');ctx.restore();}
function drawCar(x,y,angle,scale,spin,upgrades,throttle=false,air=false){
 const main=PAINTS[save.paint],spring=Math.sin(clock*16)*(throttle?1.3:.2),bounce=run&&mode!=='menu'?Math.sin(run.landed/.24*Math.PI)*5:Math.sin(clock*1.8)*.6;
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.rotate(-angle);ctx.lineJoin='round';ctx.lineCap='round';
 if(throttle){for(let i=0;i<3;i++)ellipse(-66-i*10,-13+Math.sin(clock*21+i)*2,5-i,3-i*.4,`rgba(229,217,171,${.25-i*.065})`);}
 const radius=21+Math.min(5,upgrades.tires)*.65;const rearY=spring-bounce*.3,frontY=-spring-bounce*.3;
 line(-38,rearY,-26,-24-bounce,'#465652',5);line(40,frontY,29,-24-bounce,'#465652',5);
 for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*37,-1-bounce*.3);for(let i=0;i<7;i++)ctx.lineTo(side*34+(i%2?3:-3),-4-i*3-bounce*.6);ctx.strokeStyle=upgrades.suspension>2?'#cf8057':'#e4c987';ctx.lineWidth=2.7;ctx.stroke();}
 wheel(-39,rearY,radius,spin);wheel(41,frontY,radius,spin);
 ctx.translate(0,-bounce);
 // Roll cage, seats and a helmeted driver, all visible through the cabin.
 path([[-30,-26],[-23,-61],[13,-65],[33,-28]],'#324f4d','#203f3c',3);
 path([[-20,-56],[-23,-31],[20,-31],[10,-58]],'#91b7ad');
 path([[-20,-56],[-21,-41],[-1,-57]],'#d3e5cc88');
 rounded(-15,-41,11,19,4,'#416560');
 ellipse(7,-43,8,9,'#edd8a2');ellipse(7,-47,10,8,'#eee8c8');rounded(7,-46,9,5,2,'#577b78');line(8,-33,20,-29,'#e7d2a0',5);line(20,-33,25,-28,'#375550',3);
 line(-26,-28,-20,-61,'#ede3b5',4);line(-20,-61,12,-63,'#ede3b5',4);line(12,-63,31,-29,'#ede3b5',4);line(-5,-61,-4,-29,'#395b52',3);
 // The body silhouette: short tail, upright cabin, rounded hood.
 path([[-61,-25],[-47,-31],[-23,-30],[-17,-21],[19,-21],[27,-34],[48,-32],[62,-22],[60,-8],[-60,-8]],main,'#685d39',2.5);
 path([[-59,-23],[-47,-28],[-27,-27],[-21,-21],[21,-21],[28,-30],[46,-28],[53,-23]],'#fff0a366');
 path([[-57,-9],[58,-9],[56,-4],[-55,-4]],'#aa7c3e');
 rounded(-19,-20,35,15,4,main);line(-13,-10,9,-10,'#dbefc5',2.5);text('07',-2,-10,10,'#3b5c50');
 // Mudguards frame the moving wheels.
 ctx.beginPath();ctx.arc(-39,0,radius+6,Math.PI*1.08,Math.PI*1.93);ctx.strokeStyle='#486357';ctx.lineWidth=7;ctx.stroke();ctx.beginPath();ctx.arc(41,0,radius+6,Math.PI*1.08,Math.PI*1.93);ctx.stroke();
 rounded(56,-25,8,9,3,'#fff1b5','#976e40',1.5);rounded(-64,-23,5,8,1,'#c96c4c');rounded(55,-6,13,5,2,'#4b6559');rounded(-67,-7,12,5,2,'#4b6559');
 line(-48,-32,-52,-45,'#36524a',3);rounded(-60,-52,19,16,3,'#587c66','#355347',2);line(-53,-47,-46,-41,'#8fa685',2);
 if(upgrades.tank>0){rounded(-53,-47,8+Math.min(5,upgrades.tank),8+Math.min(5,upgrades.tank)*2,2,'#cf8356','#6c6548',1.5);}
 if(upgrades.engine>1){rounded(32,-38,18,7,2,'#587267');for(let i=0;i<3;i++)line(36+i*4,-36,36+i*4,-32,'#c1c7a5',1.5);}
 if(upgrades.engine>3){line(-15,-67,13,-67,'#304d45',4);for(let i=0;i<3;i++)ellipse(-10+i*9,-69,3.8,3.8,'#fff5bd');}
 if(save.part==='arm'){line(62,-11,74,-18,'#526f5b',3);line(74,-18,80,-12,'#526f5b',3);}
 if(save.part==='jump'){rounded(20,-7,12,6,2,'#8fa4bd');}
 ctx.restore();
}
function processEvents(){for(const e of run.events){
 if(e.type==='pickup'){const i=e.item;audio.effect(i.type);if(i.type==='coin'){emitParticles(i.x,i.y,6,'#f4d67f',65);floaters.push({x:i.x,y:i.y+10,text:`+${i.value}`,life:.65,max:.65,color:'#fff4ba',size:13});}else{emitParticles(i.x,i.y,16,i.type==='fuel'?'#efbc77':'#b9e5c5',110);if(i.type==='fuel'){if(landingTime<=0)callout(`${i.skill?'AIR FUEL':'FUEL'} +${i.value}`,1);}else callout(i.type==='turbo'?'TURBO!':'MAGNET!',1);}}
 else if(e.type==='dust')emitParticles(e.x,e.y,1,'#e3d7aa',Math.abs(e.speed)*.1,.65);
 else if(e.type==='jump'){audio.effect('jump');emitParticles(e.x,e.y,8,'#e8dfb9',85);}
 else if(e.type==='land'){if(!e.nice&&!e.hard)audio.effect('land');emitParticles(e.x,e.y,Math.round(6+e.power*9),'#e6d5ab',70+e.power*70);if(save.shake)shake=Math.max(shake,e.power*(e.just?4:e.hard?10:3));}
 else if(e.type==='nice'){
  audio.effect(e.just?'just':'nice');emitParticles(e.x,e.y-15,e.just?38:14,e.just?'#fff0a2':'#b9efce',e.just?240:130);
  landingFeedback(e.just?'just':'good',e.just?'JUST!':'GOOD',e.just?`着地加速 ＋${Math.max(0,Math.round((e.after-e.before)*.36))} km/h · FLOW ×${e.chain}`:`速度キープ · FLOW ×${e.chain}`);
  if(e.just)landingBursts.push({x:e.x,y:e.y-20,life:.65,max:.65});
  floaters.push({x:e.x,y:e.y+60,text:lesson?'着地成功':`COIN +${e.reward}`,life:1.1,max:1.1,color:'#d2ffe3',size:18});
 }
 else if(e.type==='roughLand'){
  audio.effect('crash');emitParticles(e.x,e.y-15,26,'#b79c7c',190);landingFeedback('crash','CRASH!',`大減速 −${Math.round((1-e.after/Math.max(1,e.before))*100)}%`);
  if(save.shake)shake=Math.max(shake,10);
 }
 else if(e.type==='flip')tip('ひと休みして、起き上がります。',1.2);
 else if(e.type==='end'&&!lesson)showResult();
 }run.events.length=0;}
function emitParticles(x,y,count,color,power=70,life=.6){for(let i=0;i<count;i++)particles.push({x,y,vx:(Math.random()-.6)*power*2,vy:20+Math.random()*power,life:life*(.6+Math.random()*.7),max:life,r:2+Math.random()*5,color});}
function updateFX(dt){for(const b of landingBursts)b.life-=dt;landingBursts=landingBursts.filter(b=>b.life>0);if(landingTime>0&&(landingTime-=dt)<=0)$('landingFeedback').className='landing-feedback';for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy-=100*dt;p.vx*=Math.exp(-2*dt);}particles=particles.filter(p=>p.life>0);for(const f of floaters){f.life-=dt;f.y+=32*dt;}floaters=floaters.filter(f=>f.life>0);shake*=Math.exp(-12*dt);}
function render(){
 const menu=mode==='menu';if(menu){activeRegion=REGIONS[Math.min(selected,2)];camX=1130+Math.sin(clock*.12)*20;camY=280;zoom=1;}
 ctx.save();ctx.setTransform(dpr*screenScale,0,0,dpr*screenScale,0,0);ctx.clearRect(0,0,w,h);background(activeRegion,menu?clock*4:camX);
 if(menu){
  const carX=w<750?w*.38:w*.31,carY=w<750?h*.31:h*.53;
  // A quiet, grassy roadside garage overlook, with plenty of breathing room.
  ctx.beginPath();ctx.moveTo(0,h);ctx.lineTo(0,h*.61);ctx.bezierCurveTo(w*.25,h*.52,w*.5,h*.60,w,h*.55);ctx.lineTo(w,h);ctx.fillStyle=activeRegion.grass;ctx.fill();
  ctx.beginPath();ctx.moveTo(0,h*.615);ctx.bezierCurveTo(w*.25,h*.53,w*.5,h*.61,w,h*.56);ctx.strokeStyle=activeRegion.edge;ctx.lineWidth=8;ctx.stroke();
  const groundY=carY+41;ellipse(carX+8,groundY+6,110,13,'#294c4424');
  ctx.save();ctx.translate(carX,groundY);path([[-155,2],[-100,-12],[122,-5],[179,10],[90,20],[-100,14]],'#dfd7a5');for(let i=0;i<18;i++)ellipse(-130+i*17,Math.sin(i*9)*7+7,2,1,'#aa9d7180');ctx.restore();
  drawCar(carX,groundY-38,0,w<750?1.8:2.05,0,save.upgrades,false,false);
  if(w>900){const signX=carX-185;line(signX,groundY+3,signX,groundY-77,'#7f7959',6);rounded(signX-34,groundY-87,68,31,4,'#fff1c8','#afac7d',2);text('GARAGE',signX,groundY-67,10,'#456c5e');}
  const fade=ctx.createLinearGradient(0,h*.68,0,h);fade.addColorStop(0,'#eef1d300');fade.addColorStop(1,'#e8edc8bc');ctx.fillStyle=fade;ctx.fillRect(0,h*.65,w,h*.35);
 }else if(run){
  const tr=run.track;ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);scenery(tr,activeRegion);terrain(tr,activeRegion);challengeArt(tr);
  for(const i of tr.items){if(i.taken)continue;const p=screenPos(i.x,i.y);if(p.x>-60&&p.x<w+60&&p.y>-80&&p.y<h+40)itemArt(i,p.x,p.y,zoom);}
  const pos=screenPos(run.x,run.y),ground=screenPos(run.x,tr.height(run.x));if(!tr.gapAt(run.x)){ctx.globalAlpha=clamp(1-(run.y-tr.height(run.x))/300,.08,.32);ellipse(ground.x,ground.y+1,48*zoom,8*zoom,'#28483f');ctx.globalAlpha=1;}
  if(Math.abs(run.vx)>470){const speed=clamp((Math.abs(run.vx)-470)/320,0,.7);for(let i=0;i<5;i++){const sx=((i*211-clock*run.vx*.75)%(w+200)+w+200)%(w+200)-100,sy=h*(.48+i*.055);line(sx,sy,sx+24+speed*45,sy,`rgba(255,249,223,${speed*.4})`,1.2);}}
  if(run.landingBoost>0){
   const strength=Math.min(1,run.landingBoost/.3);for(let i=0;i<7;i++){const y=pos.y+(-35+i*9)*zoom;line(pos.x-45*zoom,y,pos.x-(135+i%3*42)*zoom,y,`rgba(170,255,220,${strength*(.65-i*.05)})`,(5-i*.45)*zoom);}
  }
  for(const b of landingBursts){const p=screenPos(b.x,b.y),t=1-b.life/b.max;ctx.globalAlpha=(1-t)*.9;ctx.beginPath();ctx.ellipse(p.x,p.y,(35+t*130)*zoom,(12+t*55)*zoom,0,0,Math.PI*2);ctx.strokeStyle='#fff3b0';ctx.lineWidth=(5-t*4)*zoom;ctx.stroke();for(let i=0;i<10;i++){const a=i*Math.PI/5,r=(30+t*115)*zoom;line(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r*.6,p.x+Math.cos(a)*(r+20*zoom),p.y+Math.sin(a)*(r+20*zoom)*.6,'#d1ffdb',3*zoom);}ctx.globalAlpha=1;}
  if(run.turbo>0&&input.gas){for(let i=0;i<4;i++)line(pos.x-80*zoom-i*17,pos.y-17*zoom+i*5,pos.x-135*zoom-i*27,pos.y-17*zoom+i*5,'#fff0ab99',3-i*.4);}
  if(run.magnet>0){ctx.beginPath();ctx.arc(pos.x,pos.y-15*zoom,80*zoom+Math.sin(clock*5)*6,0,Math.PI*2);ctx.strokeStyle='#fff5c469';ctx.lineWidth=2;ctx.setLineDash([4,12]);ctx.stroke();ctx.setLineDash([]);}
  if(lesson?.stage==='pose'){
   const a=lesson.targetAngle,dx=Math.cos(a)*82*zoom,dy=-Math.sin(a)*82*zoom;
   line(pos.x-dx,pos.y-dy,pos.x+dx,pos.y+dy,'#214f53',9*zoom);line(pos.x-dx,pos.y-dy,pos.x+dx,pos.y+dy,'#83f4dc',5*zoom);
   text('この角度に合わせよう',pos.x,pos.y-78*zoom,15,'#275e58');
  }
  drawCar(pos.x,pos.y,run.angle,zoom,wheelSpin,run.upgrades,input.gas,!run.grounded);
  for(const p of particles){const v=screenPos(p.x,p.y);ctx.globalAlpha=clamp(p.life/p.max,0,.65);ellipse(v.x,v.y,p.r*zoom*(1.4-p.life/p.max*.4),p.r*zoom*.8,p.color);}ctx.globalAlpha=1;
  for(const f of floaters){const p=screenPos(f.x,f.y);ctx.globalAlpha=Math.min(1,f.life/.25);ctx.shadowColor='#31544b88';ctx.shadowBlur=3;text(f.text,p.x,p.y,f.size,f.color);ctx.shadowBlur=0;}ctx.globalAlpha=1;
  const nextGap=tr.gaps.find(g=>g.a>run.x&&g.a-run.x<Math.max(1500,Math.abs(run.vx)*2.6));if(nextGap&&nextGap.a-run.x>150){const p=screenPos(nextGap.a,tr.height(nextGap.a));rounded(clamp(p.x-50,130,w-150),148,116,31,15,'#fff5d4e8');text(`↟ 穴まで ${Math.ceil((nextGap.a-run.x)/10)} m`,clamp(p.x+8,188,w-92),168,11,'#966638');}
  if(previousBest>10&&previousBest*10+250>run.x-250&&previousBest*10+250<run.x+1600){const bx=previousBest*10+250,by=tr.height(bx),p=screenPos(bx,by);line(p.x,p.y,p.x,p.y-95*zoom,'#edc765',3*zoom);path([[p.x,p.y-96*zoom],[p.x+48*zoom,p.y-89*zoom],[p.x,p.y-69*zoom]],'#edc765');text('BEST',p.x+19*zoom,p.y-81*zoom,8*zoom,'#5a6848');}
 }
 const vignette=ctx.createLinearGradient(0,h*.82,0,h);vignette.addColorStop(0,'#1c413500');vignette.addColorStop(1,'#183d352a');ctx.fillStyle=vignette;ctx.fillRect(0,h*.82,w,h*.18);ctx.restore();
}
function updateHUD(){if(!run)return;if(lesson){$('stageLabel').textContent='DRIVING SCHOOL';$('distanceLabel').textContent='練習コース';$('speedValue').textContent=Math.round(Math.max(0,run.vx)*.36);$('terrainHint').textContent='';return;}
 $('distanceLabel').textContent=meters(run.distance);$('routeFill').style.width=`${run.track.endless?Math.min(100,(run.distance%1000)/10):clamp(run.x/run.track.length*100,0,100)}%`;
 $('fuelValue').textContent=Math.ceil(run.fuel);$('fuelFill').style.width=`${Math.max(0,run.fuel/run.maxFuel*100)}%`;$('fuelFill').parentElement.parentElement.classList.toggle('low',run.fuel<20);
 $('ecoLabel').textContent=run.fuel<=0?'EMPTY':input.gas?'加速中':run.vx>430?'快走中':'惰性';$('ecoLabel').style.color=input.gas&&run.fuel>0?'#c76c42':'#387f77';
 $('runCoins').textContent=format(run.coins+Math.floor(run.distance/100)*Math.round(2*activeRegion.reward));
 const sector=!run.track.endless&&activeRegion.sections?.filter(s=>run.x>=s.at*run.track.length).at(-1);if(sector)$('stageLabel').textContent=`${activeRegion.tag} / ${sector.name}`;
 const c=run.track.challenges.find(c=>c.landB>run.x),air=c&&run.track.items.find(i=>i.skill&&i.challengeId===c.id&&!i.taken);
 $('fuelNext').textContent=air&&air.x>run.x?`空中の燃料 +10 ／ ${Math.ceil((air.x-run.x)/10)} m先`:'';
 $('speedValue').textContent=Math.round(Math.max(0,run.vx)*.36);$('flowValue').textContent=run.chain?`FLOW ×${run.chain}`:'FLOW —';$('flowValue').classList.toggle('active',run.chain>0);$('flowValue').classList.toggle('boosting',run.landingBoost>0);$('terrainHint').textContent='';
 $('effectBadges').innerHTML=(run.landingBoost>0?'<span class="boost-badge">✦ JUST BOOST</span>':'')+(run.magnet>0?`<span>∩ MAGNET ${Math.ceil(run.magnet)}s</span>`:'')+(run.turbo>0?`<span>ϟ TURBO ${Math.ceil(run.turbo)}s</span>`:'');
}
function updateTutorial(){if(!run||lesson)return;const show=(id,cond,msg,dur=4)=>{if(cond&&!tutorialSeen.has(id)){tutorialSeen.add(id);tip(msg,dur);}};
 show('stall',run.time>8&&run.grounded&&Math.abs(run.vx)<8&&run.fuel>20,'助走が足りないときはアクセルで立て直そう。次の谷で取り返せます。',5);
 show('fuel',run.fuel<20&&run.fuel>0,'燃料が残りわずか。空中の補給に届けば、もう少し先へ！',3);
 show('empty',run.fuel<=0,'燃料切れ！ 転がって補給に届けば復活できます。',5);
}
function frame(ts){const dt=last?Math.min((ts-last)/1000,.05):1/60;last=ts;clock+=dt;
 if(mode==='playing'&&run){accumulator+=dt;while(accumulator>=1/120&&mode==='playing'){if(lesson)lesson.update(1/120,input);else run.update(1/120,input);processEvents();if(lesson)updateLessonUI();accumulator-=1/120;}wheelSpin+=(lesson?.frozen?0:run.vx)*dt/22;const targetZoom=lerp(.92,.70,clamp((Math.abs(run.vx)-280)/520,0,1));zoom=lerp(zoom,targetZoom,1-Math.exp(-dt*2));camX=lerp(camX,run.x+clamp(run.vx*.34,0,280),1-Math.exp(-dt*5));camY=lerp(camY,run.y+Math.max(-50,Math.min(55,run.vy*.1)),1-Math.exp(-dt*3));bankTimer+=dt;if(!lesson&&bankTimer>1.5){bankTimer=0;const bank=H.bankProgress(run,save);for(const b of bank.bonuses){callout(b.text,2);audio.effect('upgrade');}persist();}updateTutorial();hudTimer+=dt;if(hudTimer>.08){updateHUD();hudTimer=0;}}
 if(mode==='menu'||mode==='playing'||mode==='result')updateFX(dt);if(calloutTime>0&&(calloutTime-=dt)<=0)$('callout').classList.remove('show');if(tipTime>0&&(tipTime-=dt)<=0)$('tip').classList.remove('show');if(toastTime>0&&(toastTime-=dt)<=0)$('toast').classList.remove('show');audio.update();render();requestAnimationFrame(frame);
}
refreshMenu();requestAnimationFrame(frame);if(saveWarning)toast('保存を確認できませんでした。設定からバックアップを読み込めます。',6);
})();
