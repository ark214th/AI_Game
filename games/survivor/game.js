(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const canvas = $('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const ui = {
    hud:$('hud'), joy:$('joy'), stick:$('stick'), start:$('start'), starter:$('starterChoice'), starterGrid:$('starterChoiceGrid'),
    level:$('level'), paused:$('paused'), end:$('end'), cards:$('cards'), hpt:$('hpt'), hp:$('hp'), xpt:$('xpt'), xp:$('xp'),
    lv:$('lv'), tm:$('tm'), ko:$('ko'), weapons:$('weapons'), notice:$('notice'), boss:$('boss'), bossName:$('bossName'), bossbar:$('bossbar'),
    startBtn:$('startBtn'), starterCancel:$('starterCancel'), pauseBtn:$('pause'), resumeBtn:$('resume'), finishBtn:$('finishBtn'), retryBtn:$('retry'),
    soundBtn:$('sound'), endIcon:$('endico'), endTitle:$('endtitle'), endText:$('endtext'), resTime:$('restime'), resKo:$('resko'), resLv:$('reslv')
  };

  const TAU = Math.PI * 2;
  const GOAL_TIME = 300;
  const FIRST_BOSS_TIME = 240;
  const WEAPON_SLOTS = 4;
  const LIMITS = { enemies:135, shots:150, gems:210, effects:70, texts:80, bolts:12 };
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

  let W=0,H=0,D=1,running=false,paused=false,choosing=false,ended=false;
  let last=0,elapsed=0,spawnClock=0,bossClock=0,bonus=false,boss=null,firstBossSpawned=false;
  let enemies=[],shots=[],gems=[],effects=[],texts=[],bolts=[];
  let kills=0,shake=0,noticeTimer=0,soundOn=true,audio=null,nextEnemyId=1;
  let keys=Object.create(null),pointerId=null,joyX=0,joyY=0;

  const player = {
    x:0,y:0,r:18,speed:195,hp:100,maxHp:100,invuln:0,regen:0,armor:0,level:1,xp:0,nextXp:8,magnet:95,
    power:1,haste:1,moonTimer:.1,novaTimer:3,lightTimer:2,bladeTimer:1,orbitAngle:0,shield:0,fever:0
  };

  const weapons = {
    moon:{icon:'🌙',name:'月光弾',level:0,max:7,desc:'近い敵を狙う、扱いやすい遠距離攻撃。'},
    orbit:{icon:'🪐',name:'守護星',level:0,max:6,desc:'周囲を回る星で、近づく敵を迎え撃つ。'},
    nova:{icon:'❄️',name:'星霜の波',level:0,max:6,desc:'一定時間ごとに広範囲をまとめて攻撃。'},
    aura:{icon:'🧄',name:'聖なる香気',level:0,max:7,desc:'近くの敵へ常にダメージを与える。'},
    light:{icon:'⚡',name:'天雷',level:0,max:6,desc:'複数の敵へ連鎖する雷を落とす。'},
    blade:{icon:'🌒',name:'三日月刃',level:0,max:6,desc:'貫通する刃を周囲へ放射状に飛ばす。'}
  };

  const weaponUpgrades = Object.entries(weapons).map(([id,w]) => ({
    id,icon:w.icon,name:w.name,max:w.max,get level(){return weapons[id].level;},desc:w.desc,apply(){weapons[id].level++;}
  }));

  const passives = [
    {id:'boots',icon:'👢',name:'風渡りの靴',level:0,max:5,desc:'移動速度を10%上げる。',apply(){this.level++;player.speed*=1.10;}},
    {id:'heart',icon:'💖',name:'生命のしずく',level:0,max:5,desc:'最大HPを25増やし、HPを回復する。',apply(){this.level++;player.maxHp+=25;player.hp=Math.min(player.maxHp,player.hp+35);}},
    {id:'magnet',icon:'🧲',name:'星の引力',level:0,max:5,desc:'宝石を引き寄せる範囲を広げる。',apply(){this.level++;player.magnet+=50;}},
    {id:'power',icon:'🔥',name:'夜明けの火',level:0,max:5,desc:'すべての武器の攻撃力を10%上げる。',apply(){this.level++;player.power*=1.10;}},
    {id:'haste',icon:'⏱️',name:'時の砂',level:0,max:5,desc:'すべての武器の発動間隔を7%短くする。',apply(){this.level++;player.haste*=.93;}},
    {id:'regen',icon:'🌿',name:'月桂樹',level:0,max:4,desc:'毎秒HPを回復する。',apply(){this.level++;player.regen+=.65;}},
    {id:'armor',icon:'🛡️',name:'夜銀の鎧',level:0,max:4,desc:'敵から受けるダメージを軽減する。',apply(){this.level++;player.armor+=2.1;}}
  ];

  const repeatRewards = [
    {icon:'🍖',name:'月夜のごちそう',repeat:true,desc:'HPを最大値の45%回復する。',apply(){player.hp=Math.min(player.maxHp,player.hp+player.maxHp*.45);}},
    {icon:'💠',name:'星屑の加護',repeat:true,uses:0,maxUses:10,desc:'全武器の攻撃力を2%上げる（最大10回）。',apply(){this.uses++;player.power*=1.02;}},
    {icon:'🌟',name:'月光フィーバー',repeat:true,desc:'20秒間、攻撃力と攻撃速度が20%上がる。',apply(){player.fever=Math.max(player.fever,20);}},
    {icon:'🧲',name:'宝石の嵐',repeat:true,desc:'画面内の経験値宝石をすべて回収する。',apply(){for(const g of gems)g.collect=true;}},
    {icon:'🫧',name:'月の盾',repeat:true,desc:'次の3回のダメージを無効化する。',apply(){player.shield=Math.min(9,player.shield+3);}}
  ];

  const rand=(a,b)=>a+Math.random()*(b-a);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const dist2=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;
  const hit=(a,b)=>dist2(a,b)<(a.r+b.r)**2;
  function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function ownedWeaponCount(){return Object.values(weapons).filter(w=>w.level>0).length;}
  function ownedWeapons(){return weaponUpgrades.filter(u=>u.level>0&&u.level<u.max);}
  function newWeapons(){return weaponUpgrades.filter(u=>u.level===0&&ownedWeaponCount()<WEAPON_SLOTS);}
  function pushLimited(arr,item,limit){if(arr.length>=limit)arr.splice(0,arr.length-limit+1);arr.push(item);}

  function resize(){
    D=Math.min(2,window.devicePixelRatio||1);W=Math.max(320,innerWidth);H=Math.max(320,innerHeight);
    canvas.width=Math.round(W*D);canvas.height=Math.round(H*D);canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(D,0,0,D,0,0);
  }

  function reset(selectedWeapon){
    elapsed=0;spawnClock=0;bossClock=0;bonus=false;boss=null;firstBossSpawned=false;kills=0;shake=0;noticeTimer=0;ended=false;paused=false;choosing=false;
    enemies=[];shots=[];gems=[];effects=[];texts=[];bolts=[];nextEnemyId=1;
    Object.assign(player,{x:0,y:0,r:18,speed:195,hp:100,maxHp:100,invuln:0,regen:0,armor:0,level:1,xp:0,nextXp:8,magnet:95,power:1,haste:1,moonTimer:.1,novaTimer:3,lightTimer:2,bladeTimer:1,orbitAngle:0,shield:0,fever:0});
    Object.values(weapons).forEach(w=>w.level=0);
    weapons[selectedWeapon in weapons?selectedWeapon:'moon'].level=1;
    passives.forEach(p=>p.level=0);repeatRewards.forEach(r=>{if('uses'in r)r.uses=0;});
    joyX=joyY=0;updateStick();ui.boss.style.display='none';updateHud();
  }

  function audioOn(){if(!soundOn)return;try{audio||=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();}catch(_){soundOn=false;}}
  function beep(f=440,t=.04,type='sine',v=.025){if(!soundOn||!audio)return;const o=audio.createOscillator(),g=audio.createGain(),n=audio.currentTime;o.type=type;o.frequency.value=f;g.gain.setValueAtTime(v,n);g.gain.exponentialRampToValueAtTime(.0001,n+t);o.connect(g);g.connect(audio.destination);o.start(n);o.stop(n+t);}

  function buildStarterChoices(){
    ui.starterGrid.innerHTML='';
    for(const [id,w] of Object.entries(weapons)){
      const button=document.createElement('button');button.className='starter-weapon';button.dataset.weapon=id;
      button.innerHTML=`<span class="starter-icon">${w.icon}</span><h3>${w.name}</h3><p>${w.desc}</p>`;
      button.addEventListener('click',()=>startGame(id));ui.starterGrid.appendChild(button);
    }
  }

  function openStarter(){ui.starter.classList.remove('hidden');}
  function startGame(selectedWeapon){
    audioOn();reset(selectedWeapon);ui.start.classList.add('hidden');ui.end.classList.add('hidden');ui.paused.classList.add('hidden');ui.starter.classList.add('hidden');
    ui.hud.classList.remove('hidden');ui.joy.classList.remove('hidden');running=true;last=performance.now();showNotice(`${weapons[selectedWeapon].icon} ${weapons[selectedWeapon].name}で出撃！`,2);requestAnimationFrame(loop);
  }

  function spawnEnemy(type='slime',rank='normal'){
    if(enemies.length>=LIMITS.enemies)return;
    const a=Math.random()*TAU,d=Math.max(W,H)*.58+rand(80,170);
    const e={id:nextEnemyId++,x:player.x+Math.cos(a)*d,y:player.y+Math.sin(a)*d,r:16,hp:31,maxHp:31,speed:47,damage:10,xp:1,type,rank,dead:false,flash:0,touch:0,orbit:0,aura:0,icon:'🟢'};
    if(type==='bat')Object.assign(e,{r:13,hp:20,maxHp:20,speed:92,damage:9,xp:1,icon:'🦇'});
    else if(type==='skel')Object.assign(e,{r:17,hp:43,maxHp:43,speed:55,damage:13,xp:2,icon:'💀'});
    else if(type==='brute')Object.assign(e,{r:27,hp:125,maxHp:125,speed:34,damage:22,xp:5,icon:'👹'});
    const phase=Math.max(0,elapsed-45),baseScale=1+phase/700;
    e.hp*=baseScale;e.maxHp=e.hp;e.damage*=1+elapsed/1000;
    if(rank==='elite'){e.r*=1.18;e.hp*=4.5;e.maxHp=e.hp;e.damage*=1.35;e.xp*=5;e.speed*=1.05;}
    if(rank==='giant'){e.r*=1.55;e.hp*=11;e.maxHp=e.hp;e.damage*=1.8;e.xp*=12;e.speed*=.82;}
    enemies.push(e);
  }

  function spawnBoss(isMini=false){
    if(boss&&!boss.dead)return;
    const a=Math.random()*TAU,d=Math.max(W,H)*.62+170,bonusScale=1+Math.max(0,elapsed-GOAL_TIME)/120;
    boss={id:nextEnemyId++,type:'boss',rank:isMini?'mini':'boss',icon:'👾',x:player.x+Math.cos(a)*d,y:player.y+Math.sin(a)*d,r:isMini?40:52,
      hp:(isMini?1500:2800)*bonusScale,maxHp:0,speed:isMini?38:29,damage:isMini?24:30,xp:isMini?28:45,dead:false,flash:0,touch:0,orbit:0,aura:0};
    boss.maxHp=boss.hp;enemies.push(boss);ui.bossName.textContent=isMini?'月影の番人':'宵闇の王';ui.boss.style.display='block';
    showNotice(isMini?'⚠ 月影の番人が現れた！':'⚠ 宵闇の王が現れた！',2.5);beep(110,.45,'sawtooth',.06);
  }

  function updateSpawns(dt){
    if(!firstBossSpawned&&elapsed>=FIRST_BOSS_TIME){firstBossSpawned=true;spawnBoss(false);}
    if(bonus&&!boss){bossClock-=dt;if(bossClock<=0){spawnBoss(true);bossClock=65;}}
    spawnClock-=dt;if(spawnClock>0)return;
    const target=bonus?118:Math.min(105,55+Math.floor(elapsed/4));
    const ordinary=enemies.filter(e=>!e.dead&&e.type!=='boss').length,missing=Math.max(0,target-ordinary),count=Math.min(bonus?5:4,missing);
    const bonusSecs=Math.max(0,elapsed-GOAL_TIME),eliteChance=bonus?Math.min(.30,.12+bonusSecs/600):Math.min(.12,elapsed/1800),giantChance=bonus?Math.min(.08,.025+bonusSecs/1800):.01;
    for(let i=0;i<count;i++){
      const r=Math.random();let type='slime';if(elapsed>145&&r<.12)type='brute';else if(elapsed>55&&r<.36)type='skel';else if(elapsed>18&&r<.66)type='bat';
      const rr=Math.random(),rank=rr<giantChance?'giant':rr<giantChance+eliteChance?'elite':'normal';spawnEnemy(type,rank);
    }
    spawnClock=bonus?.12:.18;
  }

  function nearest(n,range=760){return enemies.filter(e=>!e.dead&&dist2(e,player)<range*range).sort((a,b)=>dist2(a,player)-dist2(b,player)).slice(0,n);}
  function attackPower(){return player.power*(player.fever>0?1.2:1);}
  function attackHaste(){return player.haste*(player.fever>0?.8:1);}

  function fireMoon(){const l=weapons.moon.level,n=1+Math.floor(l/2),targets=nearest(n);if(!targets.length)return;for(let i=0;i<n;i++){const t=targets[i%targets.length],a=Math.atan2(t.y-player.y,t.x-player.x);pushLimited(shots,{kind:'moon',icon:'🌙',x:player.x,y:player.y,r:6,vx:Math.cos(a)*500,vy:Math.sin(a)*500,life:1.5,damage:(10+l*6)*attackPower(),pierce:l>=7?2:l>=5?1:0,hit:new Set()},LIMITS.shots);}beep(690);}
  function fireBlades(){const l=weapons.blade.level,n=2+l,o=elapsed*.8;for(let i=0;i<n;i++){const a=o+i*TAU/n;pushLimited(shots,{kind:'blade',icon:'🌒',x:player.x,y:player.y,r:11,vx:Math.cos(a)*(275+l*16),vy:Math.sin(a)*(275+l*16),life:1.25+l*.08,damage:(16+l*9)*attackPower(),pierce:3+Math.floor(l/2),hit:new Set()},LIMITS.shots);}}
  function castNova(){const l=weapons.nova.level,r=135+l*24;pushLimited(effects,{ring:true,x:player.x,y:player.y,r:10,max:r,life:.55,total:.55},LIMITS.effects);for(const e of enemies)if(!e.dead&&dist2(e,player)<(r+e.r)**2)damageEnemy(e,(20+l*19)*attackPower());showNotice('星霜の波！',.5);beep(240,.25);}
  function castLightning(){const l=weapons.light.level,targets=nearest(Math.min(8,1+l),850);if(!targets.length)return;const pts=[{x:player.x,y:player.y}];for(const e of targets){damageEnemy(e,(18+l*13)*attackPower(),true);pts.push({x:e.x,y:e.y});}pushLimited(bolts,{pts,life:.17,total:.17},LIMITS.bolts);beep(1050,.08,'square',.04);}

  function damageEnemy(e,amount,crit=false){if(e.dead)return;e.hp-=amount;e.flash=.08;pushLimited(texts,{x:e.x,y:e.y-e.r,text:Math.round(amount),life:.5,crit},LIMITS.texts);if(e.hp<=0)killEnemy(e);}
  function dropGem(x,y,value,big=false){if(gems.length>=LIMITS.gems){const g=gems[Math.floor(Math.random()*gems.length)];if(g){g.value+=value;g.r=Math.min(10,g.r+.2);}return;}gems.push({x,y,r:big?7:5,value,vx:rand(-30,30),vy:rand(-30,30),life:0,dead:false,collect:false});}
  function killEnemy(e){
    e.dead=true;kills++;shake=e.type==='boss'?12:2;const count=e.type==='boss'?16:Math.max(1,Math.ceil(e.xp/3));
    for(let i=0;i<count;i++)dropGem(e.x+rand(-12,12),e.y+rand(-12,12),e.xp/count,e.type==='boss');
    if(e.type==='boss'){boss=null;ui.boss.style.display='none';showNotice(bonus?'中ボス撃破！ まだまだ続く！':'宵闇の王を倒した！',2);beep(880,.5,'triangle',.07);}
  }

  function gainXp(v){player.xp+=v;checkLevelUp();}
  function checkLevelUp(){if(choosing||ended||!running||player.xp<player.nextXp)return;player.xp-=player.nextXp;player.level++;player.nextXp=Math.floor(8+player.level*3.6+player.level**1.25);openUpgrade();}
  function buildUpgradePicks(){
    const picks=[],owned=shuffle(ownedWeapons());if(owned.length)picks.push(owned[0]);
    const pool=[...owned.filter(u=>!picks.includes(u)),...newWeapons(),...passives.filter(p=>p.level<p.max)];
    for(const u of shuffle(pool)){if(picks.length>=3)break;if(!picks.includes(u))picks.push(u);}
    for(const r of shuffle(repeatRewards.filter(r=>!('maxUses'in r)||r.uses<r.maxUses))){if(picks.length>=3)break;picks.push(r);}
    return picks.slice(0,3);
  }
  function openUpgrade(){
    choosing=paused=true;joyX=joyY=0;updateStick();ui.level.classList.remove('hidden');ui.cards.innerHTML='';
    for(const u of buildUpgradePicks()){
      const b=document.createElement('button');b.className='card';const detail=u.repeat?'何度でも取得可能':`現在 Lv.${u.level} → Lv.${u.level+1}`;
      b.innerHTML=`<span class="ico">${u.icon}</span><h3>${u.name}</h3><p>${u.desc}</p><small>${detail}</small>`;
      b.onclick=()=>{audioOn();u.apply();ui.level.classList.add('hidden');choosing=paused=false;updateHud();last=performance.now();beep(520,.12,'triangle',.05);setTimeout(checkLevelUp,0);};ui.cards.appendChild(b);
    }
  }

  function enterBonus(){if(bonus)return;bonus=true;bossClock=45;showNotice('🌅 夜明け達成！ ボーナスタイム！',3);}

  function update(dt){
    elapsed+=dt;if(!bonus&&elapsed>=GOAL_TIME)enterBonus();
    if(player.fever>0)player.fever-=dt;if(player.invuln>0)player.invuln-=dt;if(player.regen>0)player.hp=Math.min(player.maxHp,player.hp+player.regen*dt);
    if(noticeTimer>0&&(noticeTimer-=dt)<=0)ui.notice.style.opacity=0;
    let mx=joyX+(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0),my=joyY+(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0),ml=Math.hypot(mx,my);if(ml>1){mx/=ml;my/=ml;}player.x+=mx*player.speed*dt;player.y+=my*player.speed*dt;
    if(weapons.moon.level&&(player.moonTimer-=dt)<=0){fireMoon();player.moonTimer=Math.max(.2,.78-weapons.moon.level*.075)*attackHaste();}
    if(weapons.blade.level&&(player.bladeTimer-=dt)<=0){fireBlades();player.bladeTimer=Math.max(.8,2.7-weapons.blade.level*.25)*attackHaste();}
    if(weapons.nova.level&&(player.novaTimer-=dt)<=0){castNova();player.novaTimer=Math.max(3.1,8-weapons.nova.level*.72)*attackHaste();}
    if(weapons.light.level&&(player.lightTimer-=dt)<=0){castLightning();player.lightTimer=Math.max(.8,3.7-weapons.light.level*.42)*attackHaste();}
    player.orbitAngle+=dt*(1.65+weapons.orbit.level*.08);updateSpawns(dt);

    const orbs=[],orbCount=weapons.orbit.level?1+weapons.orbit.level:0;for(let i=0;i<orbCount;i++){const a=player.orbitAngle+i*TAU/orbCount;orbs.push({x:player.x+Math.cos(a)*(62+weapons.orbit.level*3),y:player.y+Math.sin(a)*(62+weapons.orbit.level*3),r:10});}
    const auraRadius=weapons.aura.level?58+weapons.aura.level*17:0;
    for(const e of enemies){
      if(e.dead)continue;e.flash=Math.max(0,e.flash-dt);e.touch=Math.max(0,e.touch-dt);e.orbit=Math.max(0,e.orbit-dt);e.aura=Math.max(0,e.aura-dt);
      const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;e.x+=dx/d*e.speed*dt;e.y+=dy/d*e.speed*dt;
      if(hit(e,player)&&e.touch<=0){
        if(player.shield>0){player.shield--;showNotice('月の盾！',.4);}
        else if(player.invuln<=0){const dmg=Math.max(1,e.damage-player.armor);player.hp-=dmg;player.invuln=.42;shake=7;pushLimited(texts,{x:player.x,y:player.y-24,text:'-'+Math.round(dmg),life:.7,crit:true,player:true},LIMITS.texts);beep(90,.14,'sawtooth',.05);if(player.hp<=0)return finish(false);}
        e.touch=.55;
      }
      if(e.orbit<=0)for(const o of orbs)if(hit(e,o)){damageEnemy(e,(10+weapons.orbit.level*8)*attackPower());e.orbit=.28;break;}
      if(auraRadius&&e.aura<=0&&dist2(e,player)<(auraRadius+e.r)**2){damageEnemy(e,(5+weapons.aura.level*4)*attackPower());e.aura=.22;e.x-=dx/d*3;e.y-=dy/d*3;}
    }
    for(const s of shots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;if(s.life<=0)continue;for(const e of enemies){if(e.dead||s.hit.has(e.id))continue;if(hit(s,e)){s.hit.add(e.id);damageEnemy(e,s.damage);if(s.pierce>0)s.pierce--;else{s.life=0;break;}}}}
    for(const g of gems){g.life+=dt;const dx=player.x-g.x,dy=player.y-g.y,d=Math.hypot(dx,dy)||1;if(g.collect||d<player.magnet){const pull=g.collect?1200:260+(player.magnet-d)*5;g.vx+=dx/d*pull*dt;g.vy+=dy/d*pull*dt;}g.vx*=Math.pow(.03,dt);g.vy*=Math.pow(.03,dt);g.x+=g.vx*dt;g.y+=g.vy*dt;if(d<player.r+g.r+5){g.dead=true;gainXp(g.value);}}
    for(const e of effects){e.life-=dt;e.r+=(e.max-e.r)*Math.min(1,dt*8);}for(const t of texts){t.life-=dt;t.y-=28*dt;}for(const b of bolts)b.life-=dt;
    enemies=enemies.filter(e=>!e.dead&&dist2(e,player)<2200*2200);shots=shots.filter(s=>s.life>0);gems=gems.filter(g=>!g.dead&&g.life<55);effects=effects.filter(e=>e.life>0);texts=texts.filter(t=>t.life>0);bolts=bolts.filter(b=>b.life>0);shake*=Math.pow(.02,dt);updateHud();
  }

  function finish(victory){if(ended)return;ended=true;running=false;paused=true;ui.hud.classList.add('hidden');ui.joy.classList.add('hidden');ui.end.classList.remove('hidden');ui.endIcon.textContent=victory?'🌅':'🌑';ui.endTitle.textContent=victory?'夜明けを制しました！':'力尽きました…';ui.endText.textContent=victory?'ボーナスタイムを終えて結果を表示します。':'十分に強くなりました。次はもっと長く戦えます。';ui.resTime.textContent=formatTime(elapsed);ui.resKo.textContent=kills;ui.resLv.textContent=player.level;}
  function updateHud(){
    ui.hpt.textContent=`${Math.max(0,Math.ceil(player.hp))} / ${Math.ceil(player.maxHp)}`;ui.hp.style.width=clamp(player.hp/player.maxHp*100,0,100)+'%';ui.xpt.textContent=`${Math.floor(player.xp)} / ${player.nextXp}`;ui.xp.style.width=clamp(player.xp/player.nextXp*100,0,100)+'%';ui.lv.textContent=player.level;ui.ko.textContent=kills;
    ui.tm.textContent=bonus?'BONUS '+formatTime(elapsed-GOAL_TIME):formatTime(Math.max(0,GOAL_TIME-elapsed));if(boss&&!boss.dead)ui.bossbar.style.width=clamp(boss.hp/boss.maxHp*100,0,100)+'%';
    ui.weapons.innerHTML=Object.values(weapons).filter(w=>w.level>0).map(w=>`<span class="chip">${w.icon} Lv.${w.level}</span>`).join('')+(player.shield?`<span class="chip">🫧 ×${player.shield}</span>`:'')+(player.fever>0?`<span class="chip">🌟 ${Math.ceil(player.fever)}s</span>`:'');
  }
  function formatTime(sec){sec=Math.max(0,sec);const m=Math.floor(sec/60),s=Math.floor(sec%60);return`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}
  function showNotice(text,duration=1.5){ui.notice.textContent=text;ui.notice.style.opacity=1;noticeTimer=duration;}
  function world(x,y){return{x:x-player.x+W/2,y:y-player.y+H/2};}

  function drawHealthBar(e,s){
    if(e.type==='boss')return;const width=Math.max(28,Math.min(76,e.r*2.4)),height=e.rank==='giant'?6:5,x=s.x-width/2,y=s.y+e.r+12,ratio=clamp(e.hp/e.maxHp,0,1);
    ctx.fillStyle='rgba(3,5,18,.88)';ctx.fillRect(x-1,y-1,width+2,height+2);ctx.fillStyle=e.rank==='elite'?'#ffd75e':e.rank==='giant'?'#ff845c':'#ff617f';ctx.fillRect(x,y,width*ratio,height);ctx.strokeStyle='rgba(235,240,255,.65)';ctx.lineWidth=1;ctx.strokeRect(x,y,width,height);
  }

  function draw(){
    const grd=ctx.createRadialGradient(W*.5,H*.45,20,W*.5,H*.5,Math.max(W,H)*.75);grd.addColorStop(0,bonus?'#33223f':'#171b42');grd.addColorStop(.58,'#0e1231');grd.addColorStop(1,'#07091c');ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);
    ctx.save();if(shake)ctx.translate(rand(-shake,shake),rand(-shake,shake));
    for(const g of gems){const s=world(g.x,g.y);ctx.fillStyle='#73d7ff';ctx.beginPath();ctx.moveTo(s.x,s.y-g.r*1.4);ctx.lineTo(s.x+g.r,s.y);ctx.lineTo(s.x,s.y+g.r*1.4);ctx.lineTo(s.x-g.r,s.y);ctx.closePath();ctx.fill();}
    for(const e of enemies){
      if(e.dead)continue;const s=world(e.x,e.y);if(s.x<-100||s.x>W+100||s.y<-100||s.y>H+100)continue;
      ctx.save();ctx.translate(s.x,s.y);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`${Math.max(27,Math.round(e.r*1.8))}px ${EMOJI_FONT}`;ctx.globalAlpha=e.flash>0?.5:1;ctx.shadowColor=e.rank==='elite'?'#ffd75e':e.rank==='giant'?'#ff704d':'rgba(70,70,120,.65)';ctx.shadowBlur=e.rank==='normal'?5:13;ctx.fillText(e.icon,0,0);ctx.globalAlpha=1;ctx.shadowBlur=0;
      if(e.rank==='elite'){ctx.font=`14px ${EMOJI_FONT}`;ctx.fillText('⭐',0,-e.r-14);}else if(e.rank==='giant'){ctx.font=`16px ${EMOJI_FONT}`;ctx.fillText('🔶',0,-e.r-16);}ctx.restore();drawHealthBar(e,s);
    }
    for(const s of shots){const p=world(s.x,s.y);ctx.font=`${s.kind==='blade'?23:17}px ${EMOJI_FONT}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(s.icon,p.x,p.y);}
    const orbitCount=weapons.orbit.level?1+weapons.orbit.level:0;for(let i=0;i<orbitCount;i++){const a=player.orbitAngle+i*TAU/orbitCount,p=world(player.x+Math.cos(a)*(62+weapons.orbit.level*3),player.y+Math.sin(a)*(62+weapons.orbit.level*3));ctx.font=`22px ${EMOJI_FONT}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🪐',p.x,p.y);}
    if(weapons.aura.level){const p=world(player.x,player.y),r=58+weapons.aura.level*17;ctx.strokeStyle='rgba(180,255,165,.28)';ctx.lineWidth=10;ctx.beginPath();ctx.arc(p.x,p.y,r,0,TAU);ctx.stroke();}
    for(const b of bolts){ctx.strokeStyle=`rgba(180,220,255,${clamp(b.life/b.total,0,1)})`;ctx.lineWidth=4;ctx.beginPath();b.pts.forEach((p,i)=>{const s=world(p.x,p.y);i?ctx.lineTo(s.x,s.y):ctx.moveTo(s.x,s.y);});ctx.stroke();}
    const p=world(player.x,player.y);ctx.globalAlpha=player.invuln>0&&Math.floor(player.invuln*18)%2===0?.45:1;ctx.font=`38px ${EMOJI_FONT}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='#8aa1ff';ctx.shadowBlur=16;ctx.fillText('🧙‍♂️',p.x,p.y-1);ctx.globalAlpha=1;ctx.shadowBlur=0;
    if(player.shield){ctx.strokeStyle='#a9ecff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,player.r+10,0,TAU);ctx.stroke();}
    for(const e of effects){const s=world(e.x,e.y);ctx.strokeStyle=`rgba(155,231,255,${clamp(e.life/e.total,0,1)})`;ctx.lineWidth=5;ctx.beginPath();ctx.arc(s.x,s.y,e.r,0,TAU);ctx.stroke();}
    for(const t of texts){const s=world(t.x,t.y);ctx.globalAlpha=clamp(t.life/.4,0,1);ctx.fillStyle=t.player?'#ff8097':t.crit?'#fff19d':'#f1f4ff';ctx.font=`900 ${t.crit?18:14}px sans-serif`;ctx.textAlign='center';ctx.fillText(t.text,s.x,s.y);}ctx.globalAlpha=1;ctx.restore();
  }

  function loop(now){if(!running)return;const dt=Math.min(.034,(now-last)/1000||0);last=now;try{if(!paused)update(dt);draw();}catch(error){console.error(error);finish(false);ui.endIcon.textContent='🛠️';ui.endTitle.textContent='ゲームを再開できます';ui.endText.textContent='一時的な処理エラーを検知しました。もう一度遊ぶから再開してください。';}if(running)requestAnimationFrame(loop);}

  function updateStick(){const max=42;ui.stick.style.transform=`translate(${joyX*max}px,${joyY*max}px)`;}
  function joystickEvent(e){const r=ui.joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,max=r.width*.34;let dx=e.clientX-cx,dy=e.clientY-cy,d=Math.hypot(dx,dy);if(d>max){dx=dx/d*max;dy=dy/d*max;}joyX=dx/max;joyY=dy/max;updateStick();}
  addEventListener('pointerdown',e=>{if(!running||paused||pointerId!==null)return;const r=ui.joy.getBoundingClientRect();if(e.clientX<Math.max(r.right+40,W*.55)&&e.clientY>H*.35){pointerId=e.pointerId;joystickEvent(e);try{canvas.setPointerCapture(e.pointerId);}catch(_){}}},{passive:false});
  addEventListener('pointermove',e=>{if(e.pointerId===pointerId){e.preventDefault();joystickEvent(e);}},{passive:false});
  function release(e){if(e.pointerId===pointerId){pointerId=null;joyX=joyY=0;updateStick();}}addEventListener('pointerup',release);addEventListener('pointercancel',release);
  addEventListener('keydown',e=>{keys[e.key]=true;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();});addEventListener('keyup',e=>{keys[e.key]=false;});addEventListener('contextmenu',e=>e.preventDefault());
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&running&&!paused&&!choosing){paused=true;ui.paused.classList.remove('hidden');}});

  ui.startBtn.onclick=openStarter;ui.retryBtn.onclick=openStarter;ui.starterCancel.onclick=()=>ui.starter.classList.add('hidden');
  ui.pauseBtn.onclick=()=>{if(!running||choosing)return;paused=true;ui.paused.classList.remove('hidden');};
  ui.resumeBtn.onclick=()=>{ui.paused.classList.add('hidden');paused=false;last=performance.now();};
  ui.finishBtn.onclick=()=>finish(true);
  ui.soundBtn.onclick=()=>{soundOn=!soundOn;ui.soundBtn.textContent=soundOn?'🔊 効果音 ON':'🔇 効果音 OFF';if(soundOn)audioOn();};
  addEventListener('resize',resize,{passive:true});buildStarterChoices();resize();reset('moon');draw();
})();