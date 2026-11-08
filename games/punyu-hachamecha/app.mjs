// 画面の切りかえ・タッチとキー入力・保存（localStorage）・core と view の接続
import * as C from './core.mjs';
import { View } from './view.mjs';
import { Sound } from './audio.mjs';
import { FRIENDS, STICKERS, LETTERS, HAND_ICON, SHARD_SPOTS, SHARD_NAME } from './data.mjs';

const $ = (id) => document.getElementById(id);
const store = {
  load() { try { return C.deserialize(localStorage.getItem(C.SAVE_KEY)); } catch { return null; } },
  save(s) { try { localStorage.setItem(C.SAVE_KEY, C.serialize(s)); } catch { /* 保存できない環境では そのまま遊べる */ } },
};

let state = store.load() || C.newSave();
const view = new View($('world'));
const sound = new Sound(state.sound);
let playing = false, uiOpen = false, pendingEnding = false, saveTimer = 0;

const show = (el, on) => { el.hidden = !on; };
function callout(text, ms = 1100) {
  const c = $('callout'); c.textContent = text; c.classList.add('show');
  clearTimeout(callout._t); callout._t = setTimeout(() => c.classList.remove('show'), ms);
}
const friendDef = (id) => FRIENDS.find((f) => f.id === id);

function updateHud() {
  $('smileCount').textContent = state.smiles;
  $('shardCount').textContent = state.shards.length;
  $('soundBtn').textContent = state.sound ? '🔊' : '🔇';
  const m = state.mission, pill = $('missionPill');
  if (!m) { pill.hidden = true; return; }
  pill.hidden = false;
  const f = friendDef(m.friend);
  if (m.type === 'janken') pill.textContent = `${f.icon} ⭐ ${m.wins}/2`;
  else if (m.type === 'hat') pill.textContent = `🎩 ${m.touches}/5`;
  else if (m.type === 'stars') pill.textContent = `⭐ ${m.got.length}/5`;
  else if (m.type === 'shells') pill.textContent = `🐚 ${m.got.length}/3`;
  else if (m.type === 'cream') pill.textContent = `🍦 ${m.taps}/5`;
}

// ---- ごほうび と エンディング ----
function onMissionDone(res) {
  const f = friendDef(res.friend);
  sound.play('fanfare');
  view.burstHearts(f.pos.x, f.pos.z);
  const st = STICKERS.find((x) => x.id === res.friend);
  const lt = LETTERS.find((x) => x.id === res.friend);
  $('rewardEmoji').textContent = f.icon;
  $('rewardItems').innerHTML =
    `<div class="book-item"><div class="ic">${st.icon}</div><div class="nm">${st.name}</div></div>` +
    `<div class="book-item"><div class="ic">💌</div><div class="nm">${lt.from}から</div></div>`;
  uiOpen = true; show($('reward'), true);
  pendingEnding = res.ending;
  if (res.born?.length) setTimeout(() => callout('あたらしい おともだち！', 1600), 400);
  store.save(state); updateHud();
}
$('rewardClose').addEventListener('click', () => {
  sound.play('tap'); show($('reward'), false); uiOpen = false;
  if (pendingEnding) {
    pendingEnding = false;
    show($('ending'), true); uiOpen = true;
    view.fireworksOn = true; sound.play('fanfare');
    setTimeout(() => { view.fireworksOn = false; }, 14000);
  }
});
$('endingClose').addEventListener('click', () => { sound.play('tap'); show($('ending'), false); uiOpen = false; view.fireworksOn = false; });

// ---- ミッション開始と アクション ----
function startMission(id) {
  const m = C.startMission(state, id);
  if (!m) return;
  sound.play('pop');
  const f = friendDef(id);
  callout(f.bubble, 900);
  if (m.type === 'janken') openJanken();
  updateHud();
}

function doAction() {
  if (!playing || uiOpen) return;
  const a = C.findAction(state);
  if (!a) return;
  if (a.kind === 'talk') startMission(a.friend);
  else if (a.kind === 'hat') { const r = C.touchHat(state); if (r) { sound.play('pop'); view.burstStars(state.player.x, state.player.z); if (r.done) onMissionDone(r); updateHud(); } }
  else if (a.kind === 'star') { const r = C.collectStar(state, a.index); if (r?.ran) { sound.play('pop'); callout('にげた！', 700); } else if (r) { sound.play('get'); view.burstStars(state.player.x, state.player.z); if (r.done) onMissionDone(r); updateHud(); } }
  else if (a.kind === 'shell') { const r = C.collectShell(state, a.index); if (r) { sound.play('get'); view.burstStars(state.player.x, state.player.z); if (r.done) onMissionDone(r); updateHud(); } }
  else if (a.kind === 'cream') { const r = C.tapCream(state); if (r) { sound.play('pop'); if (r.done) onMissionDone(r); updateHud(); } }
}

// ---- じゃんけん ----
let jankenBusy = false;
function openJanken() {
  uiOpen = true; jankenBusy = false;
  $('oppHand').textContent = '❓'; $('youHand').textContent = '❓';
  $('jankenMsg').textContent = 'じゃんけん…';
  $('jankenWins').textContent = '☆ ☆';
  show($('janken'), true);
}
document.querySelectorAll('.hand-btn').forEach((b) => b.addEventListener('click', () => {
  if (jankenBusy || !state.mission) return;
  jankenBusy = true;
  const r = C.jankenPlay(state, b.dataset.hand);
  if (!r) { jankenBusy = false; return; }
  $('oppHand').textContent = HAND_ICON[r.opp];
  $('youHand').textContent = HAND_ICON[r.you];
  $('jankenMsg').textContent = r.result === 'win' ? 'かった！' : r.result === 'lose' ? 'まけた…' : 'あいこ！';
  const w = r.done ? 2 : state.mission.wins;
  $('jankenWins').textContent = ['☆', '☆'].map((_, i) => (i < w ? '⭐' : '☆')).join(' ');
  sound.play(r.result === 'win' ? 'win' : r.result === 'lose' ? 'lose' : 'draw');
  updateHud();
  setTimeout(() => {
    jankenBusy = false;
    if (r.done) { show($('janken'), false); uiOpen = false; onMissionDone(r); }
    else { $('oppHand').textContent = '❓'; $('youHand').textContent = '❓'; $('jankenMsg').textContent = 'じゃんけん…'; }
  }, 950);
}));

// ---- シールちょう / おてがみ ----
let bookTab = 'sticker';
function renderBook() {
  $('bookTitle').textContent = bookTab === 'letter' ? 'おてがみ' : 'シールちょう';
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === bookTab));
  const body = $('bookBody');
  if (bookTab === 'sticker') {
    body.innerHTML = STICKERS.map((st) => {
      const has = state.stickers.includes(st.id);
      return `<div class="book-item ${has ? '' : 'off'}"><div class="ic">${st.icon}</div><div class="nm">${has ? st.name : '？？？'}</div></div>`;
    }).join('');
  } else if (bookTab === 'letter') {
    const got = LETTERS.filter((l) => state.letters.includes(l.id));
    body.innerHTML = got.length ? got.map((l) =>
      `<div class="book-item letter"><div class="ic">${l.icon}</div><div class="tx">${l.text}<br><small>${l.from} より</small></div></div>`).join('')
      : '<div class="book-empty">💌</div>';
  } else {
    const n = state.shards.length;
    body.innerHTML = `<div class="book-item"><div class="ic">✦</div><div class="nm">${SHARD_NAME}<br>${n} / ${SHARD_SPOTS.length}</div></div>` +
      SHARD_SPOTS.map((_, i) => `<div class="book-item ${state.shards.includes(i) ? '' : 'off'}"><div class="ic">✦</div><div class="nm">${state.shards.includes(i) ? 'みつけた' : '？？？'}</div></div>`).join('');
  }
}
function openBook(tab) { bookTab = tab; renderBook(); uiOpen = true; show($('book'), true); sound.play('tap'); }
$('bookBtn').addEventListener('click', () => openBook('sticker'));
$('letterBtn').addEventListener('click', () => openBook('letter'));
$('bookBtn2').addEventListener('click', () => openBook('sticker'));
$('bookClose').addEventListener('click', () => { show($('book'), false); uiOpen = false; sound.play('tap'); });
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => { bookTab = t.dataset.tab; renderBook(); }));

// ---- 入力 ----
const held = new Set();
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
document.querySelectorAll('.dbtn').forEach((b) => {
  const d = b.dataset.dir;
  const on = (e) => { e.preventDefault(); held.add(d); b.classList.add('on'); sound.unlock(); };
  const off = () => { held.delete(d); b.classList.remove('on'); };
  b.addEventListener('pointerdown', on);
  b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
});
const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
addEventListener('keydown', (e) => {
  if (KEYMAP[e.code]) { held.add(KEYMAP[e.code]); e.preventDefault(); }
  if (e.code === 'Space') { e.preventDefault(); doAction(); }
});
addEventListener('keyup', (e) => { if (KEYMAP[e.code]) held.delete(KEYMAP[e.code]); });
$('btnAction').addEventListener('pointerdown', (e) => { e.preventDefault(); sound.unlock(); doAction(); });

// キャンバスの タップ（レイキャスト）
$('world').addEventListener('pointerdown', (e) => {
  sound.unlock();
  if (!playing || uiOpen) return;
  const pick = view.pick((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
  if (!pick) return;
  if (pick.kind === 'friend') { const a = C.findAction(state); if (a?.kind === 'talk' && a.friend === pick.id) startMission(pick.id); }
  else if (pick.kind === 'hat' || pick.kind === 'star' || pick.kind === 'shell' || pick.kind === 'shard') doActionFor(pick);
});
function doActionFor(pick) {
  const a = C.findAction(state);
  if (!a) return;
  if (pick.kind === 'hat' && a.kind === 'hat') doAction();
  if ((pick.kind === 'star' && a.kind === 'star' && a.index === pick.index) || (pick.kind === 'shell' && a.kind === 'shell' && a.index === pick.index)) doAction();
}

// ---- 画面の ボタン ----
$('playBtn').addEventListener('click', () => {
  sound.unlock(); sound.startBgm(); sound.play('tap');
  playing = true;
  show($('title'), false); show($('hud'), true); show($('touch'), true);
  if (state.ending) { /* クリア後の じゆう あそび */ }
  updateHud();
});
$('soundBtn').addEventListener('click', () => {
  state.sound = !state.sound; sound.unlock(); sound.setOn(state.sound);
  if (state.sound) sound.startBgm();
  store.save(state); updateHud();
});
if (new URLSearchParams(location.search).has('debug')) {
  show($('debugBar'), true);
  $('resetBtn').addEventListener('click', () => { localStorage.removeItem(C.SAVE_KEY); location.reload(); });
}

// ---- ループ ----
view.resize(); addEventListener('resize', () => view.resize());
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (playing && !uiOpen) {
    let x = 0, z = 0;
    for (const d of held) { x += DIRS[d][0]; z += DIRS[d][1]; }
    C.setDir(state, x, z);
    if (C.stepPlayer(state, dt)) {
      // かけら は ふれたら あつめる
      for (let i = 0; i < SHARD_SPOTS.length; i++) {
        if (C.collectShard(state, i)) { sound.play('get'); view.burstStars(state.player.x, state.player.z); updateHud(); store.save(state); break; }
      }
    }
  } else C.setDir(state, 0, 0);
  saveTimer += dt;
  if (saveTimer > 5) { saveTimer = 0; if (playing) store.save(state); }
  view.sync(state, now / 1000);
  view.update(dt);
  requestAnimationFrame(frame);
}
updateHud();
requestAnimationFrame(frame);
