import { Game, TUNE } from './core.mjs';
import { STAGES, WORLDS } from './stages.mjs';
import { View } from './view.mjs';
import { Sound } from './audio.mjs';
import { ITEMS, STICKERS, DEFAULT_OUTFIT, unlockedItems, unlockedStickers, normalizeProgress } from './rewards.mjs';

const $ = id => document.getElementById(id);
const DEBUG = new URLSearchParams(location.search).has('debug');
const STORE = 'punyu-kirakira-v1';
const DT = 1 / 120;

// ---------- 保存 ----------
let save = { stages: {}, autoRun: false, sound: true, starsTotal: 0, flags: {}, stomps: 0, outfit: { ...DEFAULT_OUTFIT }, seenItems: [], seenStickers: [] };
try {
  const v = JSON.parse(localStorage.getItem(STORE) || 'null');
  if (v && typeof v === 'object') {
    save.stages = v.stages && typeof v.stages === 'object' ? v.stages : {};
    save.autoRun = v.autoRun === true;
    save.sound = v.sound !== false;
    Object.assign(save, normalizeProgress(v));
    const ids = new Set(ITEMS.map(i => i.id));
    if (v.outfit && typeof v.outfit === 'object') for (const k of ['head', 'face', 'color']) if (ids.has(v.outfit[k])) save.outfit[k] = v.outfit[k];
    save.seenItems = Array.isArray(v.seenItems) ? v.seenItems : [];
    save.seenStickers = Array.isArray(v.seenStickers) ? v.seenStickers : [];
  }
} catch { /* 保存できない環境でも遊べる */ }
const persist = () => { try { localStorage.setItem(STORE, JSON.stringify(save)); } catch { /* noop */ } };
const stageSave = id => (save.stages[id] ||= { clear: false, medals: [false, false, false] });

// ステージは順番にあそべるようになる（テスト用の ?debug では全部あそべる）
const stageIndex = id => STAGES.findIndex(s => s.id === id);
const unlocked = i => DEBUG || i === 0 || !!save.stages[STAGES[i - 1].id]?.clear;
const worldUnlocked = w => unlocked(STAGES.findIndex(s => s.world === w));

const view = new View($('world'));
view.setOutfit(save.outfit);
if (DEBUG) { window.__view = view; window.__start = id => startStage(STAGES.find(s => s.id === id)); window.__game = () => game; }
const sound = new Sound(save.sound);
let game = null, stage = null, mode = 'title', last = performance.now(), clearT = 0, calloutT = 0, selWorld = 1;
const debug = { invincible: false, hitbox: false };

// ---------- 画面の切りかえ ----------
function show(next) {
  mode = next;
  for (const id of ['title', 'select', 'settings', 'pause', 'result', 'ending', 'dress', 'book']) $(id).hidden = id !== next;
  view.closeUp = next === 'dress';
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
  runFlags = {}; runStomps = 0;
  view.build(game);
  clearT = 0;
  show('play');
  hud(true);
  callout(s.bossStage ? 'この さきに だれか いるよ…' : 'よーい、スタート！', 1.6);
  sound.startBgm(s.theme);
  $('bossBar').hidden = true; lastBoss = '';
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
let lastBoss = '';
function bossHud() {
  const B = game.boss;
  const show = !!(B && B.active && !B.done);
  const key = show ? `${B.hp}/${B.maxHp}` : '';
  if (key === lastBoss) return;
  lastBoss = key;
  $('bossBar').hidden = !show;
  if (show) $('bossHearts').innerHTML = Array.from({ length: B.maxHp }, (_, i) => `<span class="${i < B.hp ? '' : 'off'}">●</span>`).join('');
}

let runFlags = {}, runStomps = 0;
const progress = () => normalizeProgress(save);

function finishStage() {
  const beforeItems = unlockedItems(progress()), beforeStickers = unlockedStickers(progress());
  const s = stageSave(stage.id);
  s.clear = true;
  game.medals.forEach(m => { if (m.taken) s.medals[m.id] = true; });
  if (game.stats.hurts === 0 && game.stats.bubbles === 0 && game.stats.faints === 0) s.noDamage = true;
  save.starsTotal += game.starCount;
  save.stomps += runStomps;
  Object.assign(save.flags, runFlags);
  persist();
  // あたらしく もらえた シールと きせかえ
  const newStickers = [...unlockedStickers(progress())].filter(id => !beforeStickers.has(id));
  const newItems = [...unlockedItems(progress())].filter(id => !beforeItems.has(id));
  const box = $('resultNew');
  box.innerHTML = '';
  if (newStickers.length) box.innerHTML += `<div>あたらしい シール！ <span class="new-icons">${newStickers.map(id => STICKERS.find(x => x.id === id).icon).join('')}</span></div>`;
  if (newItems.length) box.innerHTML += `<div>きせかえが ふえたよ！ <span class="new-icons">${newItems.map(id => ITEMS.find(x => x.id === id).icon).join('')}</span></div>`;
  box.hidden = !box.innerHTML;
  refreshBadges();
  [...$('resultMedals').children].forEach((el, i) => { el.className = game.medals[i]?.taken ? 'on' : s.medals[i] ? 'had' : ''; });
  $('resultStars').textContent = `${game.starCount} / ${game.stars.length}`;
  $('resultDebug').hidden = !DEBUG;
  if (DEBUG) $('resultDebug').textContent = `じかん ${game.time.toFixed(1)}びょう / ダメージ ${game.stats.hurts} / あな ${game.stats.bubbles} / 旗から ${game.stats.faints} / ジャンプ ${game.stats.jumps}`;
  const i = stageIndex(stage.id);
  $('nextBtn').hidden = !(i + 1 < STAGES.length);
  $('resultTitle').textContent = stage.bossStage ? 'なかよしに なったよ！' : 'クリア！';
  if (stage.final) { $('endingNew').innerHTML = box.innerHTML; show('ending'); sound.play('goal'); return; }
  show('result');
}

// ---------- きせかえ ----------
const SLOTS = [['head', 'あたま'], ['face', 'かお'], ['color', 'いろ']];
let dressSlot = 'head';
function renderDress() {
  const have = unlockedItems(progress());
  $('dressTabs').innerHTML = '';
  for (const [slot, label] of SLOTS) {
    const b = document.createElement('button');
    b.className = 'dtab' + (slot === dressSlot ? ' on' : '');
    b.textContent = label;
    b.onclick = () => { sound.play('tap'); dressSlot = slot; renderDress(); };
    $('dressTabs').append(b);
  }
  $('dressItems').innerHTML = '';
  for (const it of ITEMS.filter(i => i.slot === dressSlot)) {
    const open = have.has(it.id);
    const b = document.createElement('button');
    const isNew = open && !save.seenItems.includes(it.id) && it.hint;
    b.className = 'ditem' + (save.outfit[it.slot] === it.id ? ' on' : '') + (open ? '' : ' locked') + (isNew ? ' new' : '');
    b.innerHTML = `<span class="dicon">${open ? it.icon : '？'}</span><span class="dname">${open ? it.name : it.hint}</span>`;
    b.onclick = () => {
      if (!open) { sound.play('tap'); return; }
      sound.play('switch');
      save.outfit[it.slot] = it.id;
      view.setOutfit(save.outfit);
      view.burstPlayer();
      persist(); renderDress();
    };
    $('dressItems').append(b);
  }
  // 見たものは NEW を消す
  save.seenItems = [...new Set([...save.seenItems, ...ITEMS.filter(i => i.slot === dressSlot && have.has(i.id)).map(i => i.id)])];
  persist(); refreshBadges();
}

// ---------- シール帳 ----------
function renderBook() {
  const have = unlockedStickers(progress());
  const grid = $('stickerGrid');
  grid.innerHTML = '';
  for (const st of STICKERS) {
    const open = have.has(st.id);
    const b = document.createElement('button');
    b.className = 'sticker' + (open ? '' : ' locked') + (open && !save.seenStickers.includes(st.id) ? ' new' : '');
    b.textContent = open ? st.icon : '？';
    b.onclick = () => { sound.play(open ? 'star' : 'tap'); $('stickerInfo').textContent = open ? st.name : 'ヒント：' + st.hint; };
    grid.append(b);
  }
  $('stickerCount').textContent = `${have.size} / ${STICKERS.length}`;
  $('stickerInfo').textContent = 'シールを さわってみてね';
  save.seenStickers = [...have];
  persist(); refreshBadges();
}

function refreshBadges() {
  const p = progress();
  const newItems = [...unlockedItems(p)].some(id => !save.seenItems.includes(id) && ITEMS.find(i => i.id === id).hint);
  const newStickers = [...unlockedStickers(p)].some(id => !save.seenStickers.includes(id));
  $('dressBtn').classList.toggle('new', newItems);
  $('bookBtn').classList.toggle('new', newStickers);
}

// ---------- タイトル・メニュー ----------
function renderSelect() {
  // ワールドのタブ
  const tabs = $('worldTabs');
  tabs.innerHTML = '';
  for (const w of WORLDS) {
    const open = worldUnlocked(w.id);
    const b = document.createElement('button');
    b.className = 'wtab' + (w.id === selWorld ? ' on' : '') + (open ? '' : ' locked');
    b.innerHTML = `<span class="wicon">${open ? w.icon : '🔒'}</span><span>${w.id}</span>`;
    b.onclick = () => { sound.play('tap'); if (!open) return; selWorld = w.id; renderSelect(); };
    tabs.append(b);
  }
  const world = WORLDS.find(w => w.id === selWorld);
  $('worldName').textContent = world.name;
  $('select').dataset.theme = world.theme;
  $('stageList').innerHTML = '';
  STAGES.forEach((st, i) => {
    if (st.world !== selWorld) return;
    const s = save.stages[st.id];
    const open = unlocked(i);
    const b = document.createElement('button');
    b.className = 'stage' + (open ? '' : ' locked') + (st.bossStage ? ' boss' : '');
    const label = !open ? 'まだだよ' : s?.clear ? 'クリア！' : st.bossStage ? 'ボス！' : 'あそべるよ';
    b.innerHTML = `<span class="num">${st.bossStage ? '★' : st.id.split('-')[1]}</span><span>${label}</span>` +
      `<span class="medals">${[0, 1, 2].map(k => `<i class="${s?.medals?.[k] ? 'on' : ''}"></i>`).join('')}</span>`;
    b.onclick = () => {
      sound.play('tap');
      if (open) startStage(st);
    };
    $('stageList').append(b);
  });
  const got = Object.values(save.stages).reduce((n, s) => n + (s.medals || []).filter(Boolean).length, 0);
  $('medalTotal').textContent = `${got} / ${STAGES.length * 3}`;
}
// いちばん新しくあそべるワールドを選んでおく
function pickWorld() {
  let w = 1;
  STAGES.forEach((st, i) => { if (unlocked(i)) w = st.world; });
  selWorld = w;
}
function renderSettings() {
  $('autoBtn').textContent = `おまかせ はしり：${save.autoRun ? 'オン' : 'オフ'}`;
  $('autoBtn').classList.toggle('on', save.autoRun);
  $('soundBtn').textContent = `おと：${save.sound ? 'オン' : 'オフ'}`;
  $('soundBtn').classList.toggle('on', save.sound);
}

$('playBtn').onclick = () => { sound.unlock(); sound.play('tap'); pickWorld(); renderSelect(); show('select'); };
$('settingsBtn').onclick = () => { sound.unlock(); sound.play('tap'); renderSettings(); show('settings'); };
$('dressBtn').onclick = () => { sound.unlock(); sound.play('tap'); dressSlot = 'head'; show('dress'); renderDress(); };
$('bookBtn').onclick = () => { sound.unlock(); sound.play('tap'); show('book'); renderBook(); };
document.querySelectorAll('.back').forEach(b => (b.onclick = () => { sound.play('tap'); if (game) { game = null; demo = null; sound.stopBgm(); } show('title'); }));
$('autoBtn').onclick = () => { save.autoRun = !save.autoRun; persist(); renderSettings(); sound.play('tap'); };
$('soundBtn').onclick = () => { save.sound = !save.sound; sound.setOn(save.sound); persist(); renderSettings(); sound.play('tap'); };
$('pauseBtn').addEventListener('pointerdown', e => { e.stopPropagation(); if (mode === 'play') { sound.play('tap'); show('pause'); } });
$('resumeBtn').onclick = () => { sound.play('tap'); last = performance.now(); show('play'); };
$('retryBtn').onclick = () => { sound.play('tap'); startStage(stage); };
$('quitBtn').onclick = () => { sound.play('tap'); sound.stopBgm(); renderSelect(); show('select'); };
$('againBtn').onclick = () => { sound.play('tap'); startStage(stage); };
$('homeBtn').onclick = () => { sound.play('tap'); sound.stopBgm(); game = null; demo = null; show('title'); };
$('nextBtn').onclick = () => {
  sound.play('tap');
  const next = STAGES[stageIndex(stage.id) + 1];
  if (next) { selWorld = next.world; startStage(next); }
};
$('selectBtn').onclick = () => { sound.play('tap'); sound.stopBgm(); selWorld = stage.world; renderSelect(); show('select'); };
$('endingBtn').onclick = () => { sound.play('tap'); sound.stopBgm(); game = null; demo = null; show('title'); };

const BOSS_NAMES = { blob: 'でかもやもや', jelly: 'ぷるるんゼリー', cloud: 'くもくもさん', crab: 'おおきなカニ', wind: 'いたずらかぜ' };

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
window.visualViewport?.addEventListener('resize', () => view.resize());
addEventListener('orientationchange', () => view.resize());

// ---------- テスト用 ----------
function buildDebug() {
  if (!DEBUG) return;
  const d = $('debug');
  d.innerHTML = '<span class="info" id="dbgInfo"></span>';
  const btn = (label, on, fn) => { const b = document.createElement('button'); b.textContent = label; if (on !== null) b.classList.toggle('on', on); b.onclick = e => { e.stopPropagation(); fn(b); }; b.addEventListener('pointerdown', e => e.stopPropagation()); d.append(b); };
  btn('むてき', debug.invincible, b => { debug.invincible = !debug.invincible; game.invincible = debug.invincible; b.classList.toggle('on', debug.invincible); });
  btn('あたり', debug.hitbox, b => { debug.hitbox = !debug.hitbox; view.debugHitbox = debug.hitbox; b.classList.toggle('on', debug.hitbox); });
  game.checkpoints.forEach((c, i) => btn(`旗${i + 1}`, null, () => warp(c.x, c.y)));
  if (game.goal) btn('ゴール前', null, () => { const x = game.goal.x - 8; warp(x, game.t.groundAt(x) ?? game.goal.y); });
  if (game.boss) btn('ボス前', null, () => { const x = game.boss.x0 - 2; warp(x, game.t.groundAt(x) ?? game.boss.floor); });
  btn(`fps:${fpsMode === 'auto' ? '自動' : fpsMode}`, null, b => {
    fpsMode = fpsMode === 'auto' ? '60' : fpsMode === '60' ? '30' : 'auto';
    try { fpsMode === 'auto' ? localStorage.removeItem(FPS_KEY) : localStorage.setItem(FPS_KEY, fpsMode); } catch { /* noop */ }
    setTargetFps(fpsMode === '30' ? 30 : 60);
    b.textContent = `fps:${fpsMode === 'auto' ? '自動' : fpsMode}`;
  });
  btn('セーブ消去', null, () => { if (confirm('保存データを消しますか？')) { try { localStorage.removeItem(STORE); } catch { /* noop */ } location.reload(); } });
}
function warp(x, y) { Object.assign(game.p, { x, y, vx: 0, vy: 0, grounded: false }); game.safe = { x, y }; view.snapCamera = true; }

// ---------- メインループ ----------
// 画面の更新は 60fps か 30fps に固定する。
// 120Hz の iPad では1回おきに描き、60fps を保てない端末では安定した 30fps に落とす
// （40〜55fps でばらつくより、30fps で一定のほうが動きがなめらかに見えるため）
const FPS_KEY = 'punyu-kirakira-fps';
let fpsMode = 'auto'; // 'auto' | '60' | '30'
try { const v = localStorage.getItem(FPS_KEY); if (v === '60' || v === '30') fpsMode = v; } catch { /* noop */ }
let targetFps = fpsMode === '30' ? 30 : 60;
function setTargetFps(fps) { targetFps = fps; view.targetInterval = 1 / fps; view.cannotKeepUp = false; view.slowSince = 0; view.frameTimes.length = 0; }
setTargetFps(targetFps);

function frame(now) {
  requestAnimationFrame(frame);
  // 目標の間隔に満たないうちは描かない（4ms は画面更新のゆらぎの許容分）
  if (now - last < 1000 / targetFps - 4) return;
  let dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (fpsMode === 'auto' && targetFps === 60 && view.cannotKeepUp) setTargetFps(30);
  if (mode === 'play' || mode === 'clear') {
    const inp = { left: input.left || keys.left, right: input.right || keys.right, jump: input.jump || keys.jump };
    // 画面の更新1回ぶんの時間を等分して計算する。
    // 決まった刻みで計算すると、更新ごとに計算回数が1回・2回・3回とばらつき、動きがガタつくため
    const n = Math.max(1, Math.ceil(dt / DT - 0.01));
    for (let i = 0; i < n; i++) game.step(dt / n, inp);
    for (const e of game.drainEvents()) {
      view.onEvent(e);
      sound.play(e.type, e);
      if (e.type === 'medal') callout('メダル ゲット！');
      if (e.type === 'loop' || e.type === 'ride' || e.type === 'switch' || e.type === 'boing') runFlags[e.type] = true;
      if (e.type === 'stomp') runStomps++;
      if (e.type === 'checkpoint') callout('はた ゲット！', 1);
      if (e.type === 'heart') callout('ハート ふえた！');
      if (e.type === 'faint') callout('はたから もういちど！', 1.6);
      if (e.type === 'goal') { callout('やったー！', 2); mode = 'clear'; sound.stopBgm(); $('touch').hidden = true; }
      if (e.type === 'switch') callout('はしが でたよ！');
      if (e.type === 'bossStart') { callout(BOSS_NAMES[game.boss.type] + ' が あらわれた！', 2); sound.startBgm('boss'); }
      if (e.type === 'bossHit') callout(e.hp === 1 ? 'あと 1かい！' : 'いいね！', 1);
      if (e.type === 'bossDown') { callout('なかよしに なったよ！', 2.2); sound.stopBgm(); }
      if (e.type === 'goalAppear') callout('ほしのかけらだ！', 1.4);
    }
    hud(); bossHud();
    if (mode === 'clear') { clearT += dt; if (clearT > 2) finishStage(); }
    if (DEBUG && $('dbgInfo')) $('dbgInfo').textContent = `x ${game.p.x.toFixed(1)}  vx ${game.p.vx.toFixed(1)}  ${game.time.toFixed(1)}s  fps ${view.fps ? view.fps.toFixed(0) : '-'}/${targetFps}${fpsMode === 'auto' ? '自動' : '固定'}  最長 ${view.worstShown ? (view.worstShown * 1000).toFixed(0) : '-'}ms  cpu ${cpuMs.toFixed(1)}ms  △${(view.renderer.info.render.triangles / 1000).toFixed(0)}k  ${view.renderInfo}  dmg ${game.stats.hurts}  あな ${game.stats.bubbles}`;
  } else dt = mode === 'pause' ? 0 : dt;
  if (calloutT > 0) { calloutT -= dt; if (calloutT <= 0) $('callout').classList.remove('show'); }
  if (game) view.update(dt);
  else titleScene(dt);
  // テスト用：1コマの計算と描画命令にかかった時間（端末の処理が重いのか、描画が重いのかの切り分け用）
  cpuMs = cpuMs * 0.95 + (performance.now() - now) * 0.05;
}
let cpuMs = 0;

// タイトルの背景：ステージを借りて、ぷにゅがのんびり歩く
let demo = null;
function titleScene(dt) {
  if (!demo) { demo = new Game(STAGES[0], { autoRun: true, invincible: true }); view.build(demo); }
  const n = mode === 'dress' ? 0 : Math.max(1, Math.ceil(Math.min(dt, 0.05) / DT - 0.01));
  for (let i = 0; i < n; i++) demo.step(Math.min(dt, 0.05) / n, { jump: demo.p.grounded && demo.t.floorAt(demo.p.x + 1.4, demo.p.y + 0.4, 0).h === null });
  demo.drainEvents();
  if (demo.p.x > 40) {
    Object.assign(demo.p, { x: demo.stage.start.x, y: demo.stage.start.y, vx: 0, vy: 0 });
    demo.stars.forEach(s => (s.taken = false));
    view.snapCamera = true;
  }
  view.update(dt);
}

$('loading').hidden = true;
refreshBadges();
show('title');
requestAnimationFrame(frame);
