// 画面の切りかえ・タッチとキー入力・保存（localStorage）・core と view の接続
import * as C from './core.mjs';
import { View } from './view.mjs';
import { Sound } from './audio.mjs';
import { FRIENDS, FOGS, ISLANDS, STICKERS, LETTERS, HAND_ICON, SHARDS, SHARD_NAME, SHELL_NEED, JANKEN_WINS } from './data.mjs';

const $ = (id) => document.getElementById(id);
const store = {
  load() { try { return C.deserialize(localStorage.getItem(C.SAVE_KEY)); } catch { return null; } },
  save(s) { try { localStorage.setItem(C.SAVE_KEY, C.serialize(s)); } catch { /* 保存できない環境では そのまま遊べる */ } },
};

let state = store.load() || C.newSave();
const view = new View($('world'));
const sound = new Sound(state.sound);
let playing = false, uiOpen = false, saveTimer = 0;
let look = null;          // カメラが よそを みている あいだ（もやが はれる えんしゅつ）
let tell = false;         // カニが てを みせている あいだ
let pendingCleared = [];

const show = (el, on) => { el.hidden = !on; };
function callout(text, ms = 1300) {
  const c = $('callout'); c.textContent = text; c.classList.add('show');
  clearTimeout(callout._t); callout._t = setTimeout(() => c.classList.remove('show'), ms);
}
const friendDef = (id) => FRIENDS.find((f) => f.id === id);
const flowersHtml = (n) => [0, 1, 2].map((i) => `<span class="${i < n ? 'yes' : 'no'}">🌸</span>`).join('');

function updateHud() {
  $('smileCount').textContent = C.smiles(state);
  $('shardCount').textContent = state.shards.length;
  $('soundBtn').textContent = state.sound ? '🔊' : '🔇';
  const pill = $('missionPill');
  pill.hidden = !state.shells;
  if (state.shells) pill.textContent = `🐚 ${state.shells.got.length}/${SHELL_NEED}`;
}

// ---- えがお と ごほうび ----
let lastDone = null;
function onDone(res) {
  lastDone = res;
  uiOpen = true;
  const f = friendDef(res.friend);
  sound.play('fanfare');
  view.celebrate(res.friend);
  if (res.first) { const isl = ISLANDS.find((i) => i.id === f.island); view.burstFlowers(isl.x, isl.z); }
  store.save(state); updateHud();
  // まず えがおを みせて から、ごほうびの がめん
  setTimeout(() => {
    const st = STICKERS.find((x) => x.id === res.friend), lt = LETTERS.find((x) => x.id === res.friend);
    $('rewardEmoji').textContent = f.icon;
    $('rewardFlowers').innerHTML = flowersHtml(res.flowers);
    $('rewardItems').innerHTML = res.first
      ? `<div class="book-item"><div class="ic">${st.icon}</div><div class="nm">${st.name}</div></div>` +
        `<div class="book-item"><div class="ic">💌</div><div class="nm">${lt.from}から</div></div>`
      : '';
    show($('rewardAgain'), res.flowers < 3);
    show($('reward'), true);
    pendingCleared = pendingCleared.concat(res.cleared || []);
  }, 1500);
}
function closeReward() { sound.play('tap'); show($('reward'), false); uiOpen = false; }
$('rewardClose').addEventListener('click', () => {
  closeReward();
  if (pendingCleared.length) { const id = pendingCleared[0]; pendingCleared = []; fogCleared(id); }
});
$('rewardAgain').addEventListener('click', () => {
  closeReward();
  const r = C.replay(state, lastDone.friend);
  if (r) afterBegin(r);
  // もやの えんしゅつは、あとで「つぎへ」を えらんだ ときに みせる
});

// もやが はれる：カメラが そちらを みて、はなびが あがる
function fogCleared(id) {
  const fog = FOGS.find((f) => f.id === id), isl = ISLANDS.find((i) => i.id === id);
  uiOpen = true;
  look = { x: fog.x, z: fog.z - 4, zoom: 1.35 };
  view.fwAt = { x: isl.x, z: isl.z + 6 }; view.fireworksOn = true;
  sound.play('fanfare');
  setTimeout(() => callout('もやが はれた！', 2600), 900);
  setTimeout(() => { look = null; uiOpen = false; view.fireworksOn = false; }, 5200);
}

// ---- はなしかける ----
function afterBegin(r) {
  sound.play('pop');
  if (r.play === 'shells') callout('🐚 いっしょに さがそう！', 1800);
  if (r.play === 'janken') openJanken();
  updateHud(); store.save(state);
}
function doTalk(id) {
  if (!playing || uiOpen) return;
  const r = C.talk(state, id || C.nearTalkable(state));
  if (r) afterBegin(r);
}

// ---- じゃんけん ----
// カニは だす まえに、はさみを「ぴくっ」と うごかして てを ちらっと みせる。みぬけば かてる
let jankenTimers = [];
const later = (fn, ms) => { const t = setTimeout(fn, ms); jankenTimers.push(t); };
const handBtns = [...document.querySelectorAll('.hand-btn')];
const setHands = (on) => handBtns.forEach((b) => { b.disabled = !on; });
function winsText(w) { return Array.from({ length: JANKEN_WINS }, (_, i) => (i < w ? '⭐' : '☆')).join(' '); }
function openJanken() {
  uiOpen = true;
  $('jankenWins').textContent = winsText(0);
  show($('janken'), true);
  jankenRound();
}
function jankenRound() {
  if (!state.janken) return;
  const opp = $('oppHand');
  opp.textContent = '❓'; opp.classList.remove('peek'); $('youHand').textContent = '❓';
  $('jankenMsg').textContent = 'じゃんけん…';
  setHands(false);
  later(() => {
    if (!state.janken) return;
    tell = true; sound.play('kira');
    opp.textContent = HAND_ICON[state.janken.opp]; opp.classList.add('peek');
    $('jankenMsg').textContent = 'ちらっ';
    setHands(true);
    later(() => { tell = false; opp.textContent = '❓'; opp.classList.remove('peek'); $('jankenMsg').textContent = 'ぽん！'; }, C.tellMs(state.janken.rounds));
  }, 650);
}
function closeJanken() {
  jankenTimers.forEach(clearTimeout); jankenTimers = []; tell = false;
  show($('janken'), false); uiOpen = false;
}
function playHand(hand) {
  if (!state.janken || handBtns[0].disabled) return;
  jankenTimers.forEach(clearTimeout); jankenTimers = []; tell = false;
  setHands(false);
  const r = C.jankenPlay(state, hand);
  if (!r) return;
  const opp = $('oppHand'); opp.classList.remove('peek');
  opp.textContent = HAND_ICON[r.opp]; $('youHand').textContent = HAND_ICON[r.you];
  $('jankenMsg').textContent = r.result === 'win' ? 'かった！' : r.result === 'lose' ? 'おしい！' : 'あいこ！';
  $('jankenWins').textContent = winsText(r.wins);
  sound.play(r.result === 'win' ? 'win' : r.result === 'lose' ? 'lose' : 'draw');
  if (r.result === 'win') view.burstStars(state.player.x, state.player.z);
  later(() => {
    if (r.done) { closeJanken(); onDone(r); } else jankenRound();
  }, 1150);
}
handBtns.forEach((b) => b.addEventListener('click', () => playHand(b.dataset.hand)));
$('jankenQuit').addEventListener('click', () => { sound.play('tap'); C.jankenQuit(state); closeJanken(); updateHud(); });

// ---- シールちょう / おてがみ ----
let bookTab = 'sticker';
function renderBook() {
  $('bookTitle').textContent = bookTab === 'letter' ? 'おてがみ' : 'シールちょう';
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === bookTab));
  const body = $('bookBody');
  if (bookTab === 'sticker') {
    body.innerHTML = STICKERS.map((st) => {
      const has = state.stickers.includes(st.id), best = state.friends[st.id]?.best || 0;
      return `<div class="book-item ${has ? '' : 'off'}"><div class="ic">${st.icon}</div><div class="nm">${has ? st.name : '？？？'}</div>${has ? `<div class="fl flowers">${flowersHtml(best)}</div>` : ''}</div>`;
    }).join('');
  } else if (bookTab === 'letter') {
    const got = LETTERS.filter((l) => state.letters.includes(l.id));
    body.innerHTML = got.length ? got.map((l) =>
      `<div class="book-item letter"><div class="ic">${l.icon}</div><div class="tx">${l.text}<br><small>${l.from} より</small></div></div>`).join('')
      : '<div class="book-empty">💌</div>';
  } else {
    const n = state.shards.length;
    body.innerHTML = `<div class="book-item"><div class="ic">✦</div><div class="nm">${SHARD_NAME}<br>${n} / ${SHARDS.length}</div></div>` +
      SHARDS.map((_, i) => `<div class="book-item ${state.shards.includes(i) ? '' : 'off'}"><div class="ic">✦</div><div class="nm">${state.shards.includes(i) ? 'みつけた' : '？？？'}</div></div>`).join('');
  }
}
let bookWasOpen = false;
function openBook(tab) { if (uiOpen && playing) return; bookTab = tab; renderBook(); bookWasOpen = uiOpen; uiOpen = true; show($('book'), true); sound.unlock(); sound.play('tap'); }
$('bookBtn').addEventListener('click', () => openBook('sticker'));
$('letterBtn').addEventListener('click', () => openBook('letter'));
$('bookBtn2').addEventListener('click', () => openBook('sticker'));
$('bookClose').addEventListener('click', () => { show($('book'), false); uiOpen = bookWasOpen; sound.play('tap'); });
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => { bookTab = t.dataset.tab; renderBook(); }));

// ---- 入力 ----
// スティック：がめんの どこを さわっても、そこが スティックの まんなかに なる
const stick = { id: null, ox: 0, oy: 0, x: 0, z: 0 };
const STICK_R = 58;
const stickEl = $('stick'), knob = $('knob');
function drawStick() {
  stickEl.classList.toggle('on', stick.id !== null);
  if (stick.id === null) { stickEl.style.left = stickEl.style.top = stickEl.style.bottom = ''; knob.style.transform = ''; return; }
  stickEl.style.left = `${stick.ox - 66}px`; stickEl.style.top = `${stick.oy - 66}px`; stickEl.style.bottom = 'auto';
  knob.style.transform = `translate(${stick.x * STICK_R}px, ${stick.z * STICK_R}px)`;
}
const world = $('world');
world.addEventListener('pointerdown', (e) => {
  sound.unlock();
  if (!playing || uiOpen) return;
  // ともだちを ちょくせつ タップしても はなしかけられる
  const pick = view.pick((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
  if (pick?.kind === 'friend' && C.nearTalkable(state) === pick.id) { doTalk(pick.id); return; }
  if (stick.id !== null) return;
  stick.id = e.pointerId; stick.ox = e.clientX; stick.oy = e.clientY; stick.x = stick.z = 0;
  try { world.setPointerCapture(e.pointerId); } catch { /* なくても うごく */ }
  drawStick();
});
world.addEventListener('pointermove', (e) => {
  if (e.pointerId !== stick.id) return;
  let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy;
  const d = Math.hypot(dx, dy);
  // ゆびが とおくへ いったら、スティックの まんなかも ついていく（ゆびが はなれても とまらない）
  if (d > STICK_R) { stick.ox += dx * (1 - STICK_R / d); stick.oy += dy * (1 - STICK_R / d); dx *= STICK_R / d; dy *= STICK_R / d; }
  stick.x = dx / STICK_R; stick.z = dy / STICK_R;
  drawStick();
});
const stickEnd = (e) => { if (e.pointerId !== stick.id) return; stick.id = null; stick.x = stick.z = 0; drawStick(); };
world.addEventListener('pointerup', stickEnd); world.addEventListener('pointercancel', stickEnd);

const held = new Set();
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
const HANDKEY = { Digit1: 'gu', Digit2: 'choki', Digit3: 'pa' };
addEventListener('keydown', (e) => {
  if (KEYMAP[e.code]) { held.add(KEYMAP[e.code]); e.preventDefault(); }
  if (e.code === 'Space') { e.preventDefault(); doTalk(); }
  if (HANDKEY[e.code] && state.janken) playHand(HANDKEY[e.code]);
});
addEventListener('keyup', (e) => { if (KEYMAP[e.code]) held.delete(KEYMAP[e.code]); });
addEventListener('blur', () => held.clear());
$('btnAction').addEventListener('pointerdown', (e) => { e.preventDefault(); sound.unlock(); doTalk(); });

// ---- 画面の ボタン ----
$('playBtn').addEventListener('click', () => {
  sound.unlock(); sound.startBgm(); sound.play('tap');
  playing = true;
  show($('title'), false); show($('hud'), true); show($('touch'), true);
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
  window.__game = { get state() { return state; }, C, view };
}

// ---- ループ ----
view.resize(); addEventListener('resize', () => view.resize());
let last = performance.now(), nearId = null;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const free = playing && !uiOpen;
  let x = 0, z = 0;
  if (free) {
    x = stick.x; z = stick.z;
    for (const d of held) { x += DIRS[d][0]; z += DIRS[d][1]; }
  }
  C.setDir(state, x, z);
  if (C.stepPlayer(state, dt)) {
    if (C.touchShards(state) >= 0) { sound.play('get'); view.burstStars(state.player.x, state.player.z); updateHud(); store.save(state); }
  }
  if (free) {
    const r = C.touchShells(state);
    if (r) {
      sound.play('get'); view.burstStars(state.player.x, state.player.z);
      if (r.rainbow) callout('にじいろ！', 1100);
      updateHud(); store.save(state);
      if (r.done) onDone(r);
    }
  }
  // はなしかけ られる とき だけ、ボタンが ひかる
  const near = free ? C.nearTalkable(state) : null;
  if (near !== nearId) {
    nearId = near;
    const btn = $('btnAction');
    btn.classList.toggle('ready', !!near);
    btn.textContent = near ? friendDef(near).bubble : '！';
    if (near) sound.play('kira');
  }
  saveTimer += dt;
  if (saveTimer > 5) { saveTimer = 0; if (playing) store.save(state); }
  view.sync(state, now / 1000, dt, { guide: free ? C.guideStep(state) : null, tell, look });
  view.update(dt);
  requestAnimationFrame(frame);
}
updateHud();
requestAnimationFrame(frame);
