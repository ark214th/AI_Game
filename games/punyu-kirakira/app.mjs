import { Game, TUNE } from './core.mjs';
import { STAGES, STAGE_SLOTS } from './stages.mjs';
import { View } from './view.mjs';
import { Sound } from './audio.mjs';

const $ = id => document.getElementById(id);
const DEBUG = new URLSearchParams(location.search).has('debug');
const STORE = 'punyu-kirakira-v1';
const DT = 1 / 120;

// ---------- 保存 ----------
let save = { stages: {}, autoRun: false, sound: true };
try {
  const v = JSON.parse(localStorage.getItem(STORE) || 'null');
  if (v && typeof v === 'object') {
    save.stages = v.stages && typeof v.stages === 'object' ? v.stages : {};
    save.autoRun = v.autoRun === true;
    save.sound = v.sound !== false;
  }
} catch { /* 保存できない環境でも遊べる */ }
const persist = () => { try { localStorage.setItem(STORE, JSON.stringify(save)); } catch { /* noop */ } };
const stageSave = id => (save.stages[id] ||= { clear: false, medals: [false, false, false] });

const view = new View($('world'));
const sound = new Sound(save.sound);
let game = null, stage = null, mode = 'title', acc = 0, last = performance.now(), clearT = 0, calloutT = 0;
const debug = { invincible: false, hitbox: false };

// ---------- 画面の切りかえ ----------
function show(next) {
  mode = next;
  for (const id of ['title', 'select', 'settings', 'pause', 'result']) $(id).hidden = id !== next;
  const playing = next === 'play' || next === 'pause' || next === 'clear';
  $('hud').hidden = !playing;
  $('touch').hidden = next !== 'play';
  $('touch').classList.toggle('auto', save.autoRun);
  if (next !== 'play') input.left = input.right = input.jump = false, touches.clear(), paintButtons();
  $('debug').hidden = !(DEBUG && playing);
}

function startStage(s) {
  stage = s;
  const had = stageSave(s.id).medals;
  game = new Game(s, { autoRun: save.autoRun, invincible: debug.invincible, medalsHad: had });
  view.build(game);
  acc = 0; clearT = 0;
  show('play');
  hud(true);
  callout('よーい、スタート！', 1.4);
  sound.startBgm();
  buildDebug();
}

function callout(text, sec = 1.2) {
  const c = $('callout');
  c.textContent = text; c.classList.remove('show'); void c.offsetWidth; c.classList.add('show');
  calloutT = sec;
}

let lastHud = '';
function hud(force) {
  const key = `${game.hearts}|${game.starCount}|${game.medals.map(m => m.taken ? 1 : m.had ? 2 : 0).join('')}`;
  if (key === lastHud && !force) return;
  lastHud = key;
  $('hearts').innerHTML = Array.from({ length: TUNE.maxHearts }, (_, i) => `<span class="${i < game.hearts ? '' : 'off'}">♥</span>`).join('');
  $('starCount').textContent = game.starCount;
  [...$('medals').children].forEach((el, i) => { const m = game.medals[i]; el.className = m?.taken ? 'on' : m?.had ? 'had' : ''; });
}

function finishStage() {
  const s = stageSave(stage.id);
  s.clear = true;
  game.medals.forEach(m => { if (m.taken) s.medals[m.id] = true; });
  persist();
  [...$('resultMedals').children].forEach((el, i) => { el.className = game.medals[i]?.taken ? 'on' : s.medals[i] ? 'had' : ''; });
  $('resultStars').textContent = `${game.starCount} / ${game.stars.length}`;
  $('resultDebug').hidden = !DEBUG;
  if (DEBUG) $('resultDebug').textContent = `じかん ${game.time.toFixed(1)}びょう / ダメージ ${game.stats.hurts} / あな ${game.stats.bubbles} / 旗から ${game.stats.faints} / ジャンプ ${game.stats.jumps}`;
  show('result');
}

// ---------- タイトル・メニュー ----------
function renderSelect() {
  $('stageList').innerHTML = '';
  STAGE_SLOTS.forEach((slot, i) => {
    const s = save.stages[slot.id];
    const b = document.createElement('button');
    b.className = 'stage' + (slot.ready ? '' : ' locked');
    b.innerHTML = `<span class="num">${i + 1}</span><span>${slot.ready ? (s?.clear ? 'クリア！' : 'あそべるよ') : 'もうすぐ'}</span>` +
      `<span class="medals">${[0, 1, 2].map(k => `<i class="${s?.medals?.[k] ? 'on' : ''}"></i>`).join('')}</span>`;
    b.onclick = () => {
      if (!slot.ready) { sound.play('tap'); return; }
      sound.play('tap');
      startStage(STAGES.find(st => st.id === slot.id));
    };
    $('stageList').append(b);
  });
}
function renderSettings() {
  $('autoBtn').textContent = `おまかせ はしり：${save.autoRun ? 'オン' : 'オフ'}`;
  $('autoBtn').classList.toggle('on', save.autoRun);
  $('soundBtn').textContent = `おと：${save.sound ? 'オン' : 'オフ'}`;
  $('soundBtn').classList.toggle('on', save.sound);
}

$('playBtn').onclick = () => { sound.unlock(); sound.play('tap'); renderSelect(); show('select'); };
$('settingsBtn').onclick = () => { sound.unlock(); sound.play('tap'); renderSettings(); show('settings'); };
document.querySelectorAll('.back').forEach(b => (b.onclick = () => { sound.play('tap'); show('title'); }));
$('autoBtn').onclick = () => { save.autoRun = !save.autoRun; persist(); renderSettings(); sound.play('tap'); };
$('soundBtn').onclick = () => { save.sound = !save.sound; sound.setOn(save.sound); persist(); renderSettings(); sound.play('tap'); };
$('pauseBtn').addEventListener('pointerdown', e => { e.stopPropagation(); if (mode === 'play') { sound.play('tap'); show('pause'); } });
$('resumeBtn').onclick = () => { sound.play('tap'); last = performance.now(); show('play'); };
$('retryBtn').onclick = () => { sound.play('tap'); startStage(stage); };
$('quitBtn').onclick = () => { sound.play('tap'); sound.stopBgm(); renderSelect(); show('select'); };
$('againBtn').onclick = () => { sound.play('tap'); startStage(stage); };
$('homeBtn').onclick = () => { sound.play('tap'); sound.stopBgm(); game = null; demo = null; show('title'); };

// ---------- 入力 ----------
const input = { left: false, right: false, jump: false };
const touches = new Map();
function zoneOf(x) {
  // 画面の左半分は移動、右半分はジャンプ。◀ と ▶ の境目はボタンのまんなか
  if (x > window.innerWidth * 0.5) return 'jump';
  if (save.autoRun) return 'jump';
  const l = $('btnLeft').getBoundingClientRect(), r = $('btnRight').getBoundingClientRect();
  const mid = (l.right + r.left) / 2;
  return x < mid ? 'left' : 'right';
}
function syncTouches() {
  input.left = input.right = input.jump = false;
  for (const z of touches.values()) input[z] = true;
  if (input.left && input.right) input.left = input.right = false, input[[...touches.values()].filter(z => z !== 'jump').pop()] = true;
  paintButtons();
}
function paintButtons() {
  $('btnLeft').classList.toggle('on', input.left || keys.left);
  $('btnRight').classList.toggle('on', input.right || keys.right);
  $('btnJump').classList.toggle('on', input.jump || keys.jump);
}
const touchEl = $('touch');
touchEl.addEventListener('pointerdown', e => { e.preventDefault(); sound.unlock(); touchEl.setPointerCapture?.(e.pointerId); touches.set(e.pointerId, zoneOf(e.clientX)); syncTouches(); });
touchEl.addEventListener('pointermove', e => {
  if (!touches.has(e.pointerId)) return;
  const prev = touches.get(e.pointerId), z = zoneOf(e.clientX);
  // 移動の指がジャンプ側へはみ出しても移動のまま、ジャンプの指は移動にならない
  if (prev === 'jump' || z === 'jump') return;
  if (z !== prev) { touches.set(e.pointerId, z); syncTouches(); }
});
for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) touchEl.addEventListener(t, e => { if (touches.delete(e.pointerId)) syncTouches(); });

const keys = { left: false, right: false, jump: false };
const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'jump', ArrowUp: 'jump', KeyW: 'jump', KeyZ: 'jump' };
addEventListener('keydown', e => {
  sound.unlock();
  if (KEYMAP[e.code]) { keys[KEYMAP[e.code]] = true; e.preventDefault(); paintButtons(); }
  if ((e.code === 'Escape' || e.code === 'KeyP') && mode === 'play') show('pause');
  else if ((e.code === 'Escape' || e.code === 'KeyP') && mode === 'pause') { last = performance.now(); show('play'); }
});
addEventListener('keyup', e => { if (KEYMAP[e.code]) { keys[KEYMAP[e.code]] = false; paintButtons(); } });
addEventListener('blur', () => { keys.left = keys.right = keys.jump = false; touches.clear(); syncTouches(); if (mode === 'play') show('pause'); });
document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'play') show('pause'); });
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());
addEventListener('resize', () => view.resize());

// ---------- テスト用 ----------
function buildDebug() {
  if (!DEBUG) return;
  const d = $('debug');
  d.innerHTML = '<span class="info" id="dbgInfo"></span>';
  const btn = (label, on, fn) => { const b = document.createElement('button'); b.textContent = label; if (on !== null) b.classList.toggle('on', on); b.onclick = e => { e.stopPropagation(); fn(b); }; b.addEventListener('pointerdown', e => e.stopPropagation()); d.append(b); };
  btn('むてき', debug.invincible, b => { debug.invincible = !debug.invincible; game.invincible = debug.invincible; b.classList.toggle('on', debug.invincible); });
  btn('あたり', debug.hitbox, b => { debug.hitbox = !debug.hitbox; view.debugHitbox = debug.hitbox; b.classList.toggle('on', debug.hitbox); });
  game.checkpoints.forEach((c, i) => btn(`旗${i + 1}`, null, () => warp(c.x, c.y)));
  btn('ゴール前', null, () => { const x = game.goal.x - 8; warp(x, game.t.groundAt(x) ?? game.goal.y); });
  btn('セーブ消去', null, () => { if (confirm('保存データを消しますか？')) { try { localStorage.removeItem(STORE); } catch { /* noop */ } location.reload(); } });
}
function warp(x, y) { Object.assign(game.p, { x, y, vx: 0, vy: 0, grounded: false }); game.safe = { x, y }; view.snapCamera = true; }

// ---------- メインループ ----------
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (mode === 'play' || mode === 'clear') {
    acc += dt;
    const inp = { left: input.left || keys.left, right: input.right || keys.right, jump: input.jump || keys.jump };
    while (acc >= DT) { game.step(DT, inp); acc -= DT; }
    for (const e of game.drainEvents()) {
      view.onEvent(e);
      sound.play(e.type, e);
      if (e.type === 'medal') callout('メダル ゲット！');
      if (e.type === 'checkpoint') callout('はた ゲット！', 1);
      if (e.type === 'heart') callout('ハート ふえた！');
      if (e.type === 'faint') callout('はたから もういちど！', 1.6);
      if (e.type === 'goal') { callout('やったー！', 2); mode = 'clear'; sound.stopBgm(); $('touch').hidden = true; }
    }
    hud();
    if (mode === 'clear') { clearT += dt; if (clearT > 2) finishStage(); }
    if (DEBUG && $('dbgInfo')) $('dbgInfo').textContent = `x ${game.p.x.toFixed(1)}  vx ${game.p.vx.toFixed(1)}  ${game.time.toFixed(1)}s  fps ${view.fps ? view.fps.toFixed(0) : '-'}  dmg ${game.stats.hurts}  あな ${game.stats.bubbles}`;
  } else dt = mode === 'pause' ? 0 : dt;
  if (calloutT > 0) { calloutT -= dt; if (calloutT <= 0) $('callout').classList.remove('show'); }
  if (game) view.update(dt);
  else titleScene(dt);
}

// タイトルの背景：ステージを借りて、ぷにゅがのんびり歩く
let demo = null;
function titleScene(dt) {
  if (!demo) { demo = new Game(STAGES[0], { autoRun: true, invincible: true }); view.build(demo); }
  for (let t = 0; t < Math.min(dt, 0.05); t += DT) demo.step(DT, { jump: demo.p.grounded && demo.t.floorAt(demo.p.x + 1.4, demo.p.y + 0.4, 0).h === null });
  demo.drainEvents();
  if (demo.p.x > 40) {
    Object.assign(demo.p, { x: demo.stage.start.x, y: demo.stage.start.y, vx: 0, vy: 0 });
    demo.stars.forEach(s => (s.taken = false));
    view.snapCamera = true;
  }
  view.update(dt);
}

$('loading').hidden = true;
show('title');
requestAnimationFrame(frame);
