// 画面の切りかえ・タッチとキー入力・保存（localStorage）・core と view の接続
import * as C from './core.mjs';
import { View } from './view.mjs';
import { Sound } from './audio.mjs';
import { FRIENDS, FOGS, ISLANDS, STICKERS, LETTERS, GOALS, SHARDS, SHARD_NAME, SHELL_NEED, JANKEN_WINS } from './data.mjs';
import { handCanvas } from './hands.mjs';

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
let jk = null;            // じゃんけんの みため { crab, punyu, tell, result }
let faceTo = null;        // かいわの あいて の ばしょ
let moved = false, movedAt = 0;
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
  pill.hidden = true;   // かいがらの かずは「いま する こと」に だす
}

// いま する こと（がめんの うえ）
let goalNow = '';
function updateGoal() {
  let text = '';
  if (playing && !state.janken) {
    const g = C.guideGoal(state);
    if (!moved) text = `👆 ${GOALS.move}`;
    else if (g?.kind === 'friend') text = `😢 ${friendDef(g.id).name}${GOALS.talk}`;
    else if (g?.kind === 'beach') text = C.islandAt(state.player) === 'umibe' ? `🐚 ${GOALS.shells}（${state.shells.got.length}/${SHELL_NEED}）` : `🌈 ${GOALS.toBeach}`;
    else if (g?.kind === 'soon') text = `🚧 ${GOALS.soon}`;
  }
  const el = $('goal');
  if (text === goalNow) return;
  goalNow = text; el.hidden = !text; el.textContent = text;
  el.classList.remove('new'); void el.offsetWidth; el.classList.add('new');
}
// ひとこと（とめずに だす みじかい ことば）
function mutter(icon, text, ms = 3200) {
  $('mutterIcon').textContent = icon; $('mutterText').textContent = text;
  const m = $('mutter'); m.hidden = true; void m.offsetWidth; m.hidden = false;
  clearTimeout(mutter._t); mutter._t = setTimeout(() => { m.hidden = true; }, ms);
}
// かいわ（タップで つぎへ）。おわったら then を よぶ
let talkQueue = [], talkThen = null, talkAt = 0;
function say(id, lines, then) {
  const f = friendDef(id);
  uiOpen = true; faceTo = view.friendPos(id);
  talkQueue = lines.slice(); talkThen = then;
  $('talkIcon').textContent = f.icon; $('talkName').textContent = f.name;
  show($('talk'), true); nextLine();
}
function nextLine() {
  if (!talkQueue.length) {
    show($('talk'), false); uiOpen = false; faceTo = null;
    const t = talkThen; talkThen = null; if (t) t();
    return;
  }
  $('talkText').textContent = talkQueue.shift();
  talkAt = performance.now(); sound.play('pop');
}
$('talk').addEventListener('pointerdown', (e) => { e.preventDefault(); if (performance.now() - talkAt > 350) nextLine(); });

// ---- えがお と ごほうび ----
let lastDone = null;
function onDone(res) {
  lastDone = res;
  uiOpen = true;
  const f = friendDef(res.friend);
  sound.play('fanfare');
  view.celebrate(res.friend);
  if (res.first) { const isl = ISLANDS.find((i) => i.id === f.island); view.burstFlowers(isl.x, isl.z); }
  mutter(f.icon, f.say.done, 2600);
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
  }, 2400);
}
function closeReward() { sound.play('tap'); show($('reward'), false); uiOpen = false; }
$('rewardClose').addEventListener('click', () => {
  closeReward();
  if (pendingCleared.length) { const id = pendingCleared[0]; pendingCleared = []; fogCleared(id); }
});
$('rewardAgain').addEventListener('click', () => {
  closeReward();
  const id = lastDone.friend;
  say(id, friendDef(id).say.again, () => { const r = C.replay(state, id); if (r) afterBegin(r); });
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
  if (r.play === 'janken') openJanken();
  updateHud(); store.save(state);
}
function doTalk(id) {
  if (!playing || uiOpen) return;
  id = id || C.nearTalkable(state);
  if (!id || C.nearTalkable(state) !== id) return;
  say(id, friendDef(id).say.ask, () => { const r = C.talk(state, id); if (r) afterBegin(r); });
}
// はまべに ついたら、ちゃぷが ひろいかたを おしえる（1かい だけ）
function beachHint() {
  if (!state.shells || state.seen.includes('beach') || C.islandAt(state.player) !== 'umibe') return;
  state.seen.push('beach');
  say('chapu', friendDef('chapu').say.beach);
}

// ---- じゃんけん ----
// 3Dの カニと ぷにゅが ならんで しょうぶ。「じゃん・けん」の あと、カニの てが「ちらっ」と みえる。みぬけば かてる
let jankenTimers = [];
const later = (fn, ms) => { const t = setTimeout(fn, ms); jankenTimers.push(t); };
const clearTimers = () => { jankenTimers.forEach(clearTimeout); jankenTimers = []; };
const handBtns = [...document.querySelectorAll('.hand-btn')];
handBtns.forEach((b) => { b.querySelector('.hand-pic').style.backgroundImage = `url(${handCanvas(b.dataset.hand, 'punyu', 192).toDataURL()})`; });
const setHands = (on) => handBtns.forEach((b) => { b.disabled = !on; if (on) b.classList.remove('picked'); });
function showWins(w) { $('jankenWins').innerHTML = Array.from({ length: JANKEN_WINS }, (_, i) => `<span class="${i < w ? 'on' : 'off'}">⭐</span>`).join(''); }
function chant(text, cls = '') {
  const c = $('jkChant'); c.textContent = text; c.className = 'chant ' + cls;
  void c.offsetWidth; c.classList.add('pop');
}
function openJanken() {
  uiOpen = true; jk = { crab: null, punyu: null, tell: false, result: null };
  showWins(0); setHands(false);
  show($('janken'), true);
  chant('じゃんけん しょうぶ！', 'small'); sound.play('fanfare');
  later(jankenRound, 1500);
}
function jankenRound() {
  if (!state.janken) return;
  jk = { crab: null, punyu: null, tell: false, result: null };
  setHands(false);
  chant('じゃん'); view.beat(); sound.play('draw');
  later(() => { chant('けん'); view.beat(); sound.play('draw'); }, 520);
  later(() => {
    if (!state.janken) return;
    jk.tell = true; jk.crab = state.janken.opp; sound.play('kira');
    chant('ちらっ', 'small');
    setHands(true);
    later(() => { jk.tell = false; jk.crab = null; chant('どれを だす？', 'small'); }, C.tellMs(state.janken.rounds));
  }, 1100);
}
function closeJanken() {
  clearTimers(); jk = null;
  show($('janken'), false); uiOpen = false;
}
function playHand(hand) {
  if (!state.janken || handBtns[0].disabled) return;
  clearTimers();
  setHands(false);
  handBtns.find((b) => b.dataset.hand === hand).classList.add('picked');
  const r = C.jankenPlay(state, hand);
  if (!r) return;
  jk = { crab: r.opp, punyu: r.you, tell: false, result: null };
  chant('ぽん！'); view.beat(); sound.play('pop');
  later(() => {
    jk.result = r.result;
    if (r.result === 'win') { chant('かち！', 'win'); sound.play('win'); view.cheer(); view.burstStars(state.player.x, state.player.z); showWins(r.wins); }
    else if (r.result === 'lose') { chant('おしい！', 'lose'); sound.play('lose'); }
    else { chant('あいこ！', 'draw'); sound.play('draw'); }
  }, 600);
  later(() => { if (r.done) { closeJanken(); onDone(r); } else jankenRound(); }, 2100);
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
    if (!moved) { movedAt += dt; if (movedAt > 0.6) { moved = true; mutter('🦋', GOALS.guide, 4200); } }
    if (C.touchShards(state) >= 0) { sound.play('get'); view.burstStars(state.player.x, state.player.z); updateHud(); store.save(state); }
  }
  if (free) {
    const r = C.touchShells(state);
    if (r) {
      sound.play('get'); view.burstStars(state.player.x, state.player.z);
      if (r.rainbow) callout('にじいろ！', 1100);
      else if (r.got === 1 && !state.seen.includes('tip')) { state.seen.push('tip'); mutter('🦦', friendDef('chapu').say.tip, 4200); }
      updateHud(); store.save(state);
      if (r.done) onDone(r);
    }
    beachHint();
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
  updateGoal();
  view.sync(state, now / 1000, dt, { guide: free ? C.guideStep(state) : null, jk, look, faceTo, talking: !!faceTo });
  view.update(dt);
  requestAnimationFrame(frame);
}
updateHud();
requestAnimationFrame(frame);
