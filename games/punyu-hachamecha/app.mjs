// 画面の切りかえ・かいわ・タッチとキー入力・保存（localStorage）・core と view の接続
import * as C from './core.mjs';
import { View } from './view.mjs';
import { Sound } from './audio.mjs';
import {
  FRIENDS, RESIDENTS, FOGS, ISLANDS, STICKERS, LETTERS, GOALS, FOG_CLEAR, ENDING_TEXT, SHARDS, SHARD_NAME,
  SHELL_NEED, JANKEN_WINS, TOPPINGS, TOPPING_NAME, DECO_MIN, DECO_MAX, STAR_NEED, CHASE_NEED, CHEER_NEED, MAIN_IDS,
} from './data.mjs';
import { handCanvas, toppingCanvas } from './hands.mjs';

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
let aimStart = 0, wobbleUntil = 0;
let pendingCleared = [];

const show = (el, on) => { el.hidden = !on; };
function callout(text, ms = 1300) {
  const c = $('callout'); c.textContent = text; c.classList.add('show');
  clearTimeout(callout._t); callout._t = setTimeout(() => c.classList.remove('show'), ms);
}
// ともだち でも、すんでいる こ でも
const who = (id) => FRIENDS.find((f) => f.id === id) || RESIDENTS.find((r) => r.id === id);
const flowersHtml = (n) => [0, 1, 2].map((i) => `<span class="${i < n ? 'yes' : 'no'}">🌸</span>`).join('');
const chantOn = (el, text, cls = '') => { el.textContent = text; el.className = 'chant ' + cls; void el.offsetWidth; el.classList.add('pop'); };

function updateHud() {
  $('smileCount').textContent = C.smiles(state);
  $('shardCount').textContent = state.shards.length;
  $('soundBtn').textContent = state.sound ? '🔊' : '🔇';
}

// いま する こと（がめんの うえ）
let goalNow = '';
function goalText() {
  if (!playing || look || C.modal(state)) return '';
  if (!moved) return `👆 ${GOALS.move}`;
  const g = C.guideGoal(state);
  if (!g) return state.ending ? `🌈 ${GOALS.end}` : '';
  if (g.kind === 'friend' || g.kind === 'res') return `💬 ${who(g.id).name}${GOALS.talk}`;
  if (g.kind === 'beach') return C.islandAt(state.player) === 'umibe' ? `🐚 ${GOALS.shells}（${state.shells.got.length}/${SHELL_NEED}）` : `🌈 ${GOALS.toBeach}`;
  if (g.kind === 'star') return `⭐ ${GOALS.stars}（${state.stars.got.length}/${STAR_NEED}）`;
  if (g.kind === 'pad') return `⭐ ${GOALS.pad}`;
  if (g.kind === 'kaze') return `💨 ${GOALS.chase}（${state.chase.caught}/${CHASE_NEED}）`;
  if (g.kind === 'item') { const r = who(g.res); return `✨ ${r.itemName}${GOALS.find}（${state.res[r.id].got.length}/${r.spots.length}）`; }
  return '';
}
function updateGoal() {
  const text = goalText(), el = $('goal');
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
  const f = who(id);
  uiOpen = true; faceTo = view.friends[id] ? view.friendPos(id) : f.home;
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
  const f = who(res.friend);
  sound.play('fanfare');
  view.celebrate(res.friend);
  for (const id of res.also || []) view.celebrate(id);
  if (res.first) { const isl = ISLANDS.find((i) => i.id === f.island); view.burstFlowers(isl.x, isl.z); }
  mutter(f.icon, f.say.done, 2600);
  store.save(state); updateHud();
  pendingCleared = pendingCleared.concat(res.cleared || []);
  // まず えがおを みせて から、ごほうびの がめん
  setTimeout(() => {
    const st = STICKERS.find((x) => x.id === res.friend), lt = LETTERS.find((x) => x.id === res.friend);
    $('rewardEmoji').textContent = f.icon;
    $('rewardFlowers').innerHTML = res.ending ? '' : flowersHtml(res.flowers);
    const also = (res.also || []).map((id) => STICKERS.find((x) => x.id === id)).map((x) => `<div class="book-item"><div class="ic">${x.icon}</div><div class="nm">${x.name}</div></div>`).join('');
    $('rewardItems').innerHTML = res.first
      ? `<div class="book-item"><div class="ic">${st.icon}</div><div class="nm">${st.name}</div></div>` +
        `<div class="book-item"><div class="ic">💌</div><div class="nm">${lt.from}から</div></div>` + also
      : '';
    show($('rewardAgain'), !res.ending && res.flowers < 3);
    show($('reward'), true);
  }, 2400);
}
function closeReward() { sound.play('tap'); show($('reward'), false); uiOpen = false; }
$('rewardClose').addEventListener('click', () => {
  closeReward();
  if (lastDone?.ending) { lastDone = null; pendingCleared = []; showEnding(); } else nextFog();
});
$('rewardAgain').addEventListener('click', () => { closeReward(); startReplay(lastDone.friend); });
function startReplay(id) {
  say(id, who(id).say.again, () => { const r = C.replay(state, id); if (r) afterBegin(r); });
}

// もやが はれる：カメラが そちらを みて、はなびが あがる（いくつも はれた ときは じゅんばんに）
function nextFog() {
  if (!pendingCleared.length || uiOpen) return;
  const id = pendingCleared.shift();
  const fog = FOGS.find((f) => f.id === id), isl = ISLANDS.find((i) => i.id === id);
  uiOpen = true;
  look = { x: (fog.x + isl.x) / 2, z: (fog.z + isl.z) / 2 + 4, zoom: 1.45 };
  view.fwAt = { x: isl.x, z: isl.z + 6 }; view.fireworksOn = true;
  sound.play('fanfare');
  setTimeout(() => callout(FOG_CLEAR, 2400), 900);
  setTimeout(() => { mutter('🌈', isl.name, 2600); }, 2300);
  setTimeout(() => { look = null; uiOpen = false; view.fireworksOn = false; nextFog(); }, 5000);
}

// エンディング：にじ と はなび
function showEnding() {
  uiOpen = true;
  const isl = ISLANDS.find((i) => i.id === 'moya');
  look = { x: isl.x, z: isl.z + 3, zoom: 1.2 };
  view.fwAt = { x: isl.x, z: isl.z + 2 }; view.fireworksOn = true;
  sound.play('fanfare'); setTimeout(() => sound.play('fanfare'), 1200);
  $('endingText').textContent = ENDING_TEXT;
  setTimeout(() => show($('ending'), true), 1800);
  store.save(state);
}
$('endingClose').addEventListener('click', () => {
  sound.play('tap'); show($('ending'), false); look = null; uiOpen = false;
  setTimeout(() => { view.fireworksOn = false; }, 6000);
});

// ---- はなしかける ----
function afterBegin(r) {
  if (r.play === 'janken') openJanken();
  if (r.play === 'deco') openDeco();
  if (r.play === 'cheer') openCheer();
  updateHud(); store.save(state);
}
function doAction(pick) {
  if (!playing || uiOpen) return;
  const a = C.nearAction(state);
  if (!a || (pick && (pick.kind !== a.kind || pick.id !== a.id))) return;
  if (a.kind === 'friend') say(a.id, who(a.id).say.ask, () => { const r = C.talk(state, a.id); if (r) afterBegin(r); });
  else if (a.kind === 'res') say(a.id, who(a.id).say.ask, () => { C.talkRes(state, a.id); store.save(state); });
  else if (a.kind === 'pad') {
    const go = () => { if (C.starAim(state)) openAim(); };
    if (state.seen.includes('pad')) go(); else { state.seen.push('pad'); say('kumokumo', who('kumokumo').say.pad, go); }
  }
}
// はまべに ついたら、ちゃぷが ひろいかたを おしえる（1かい だけ）
function beachHint() {
  if (!state.shells || state.seen.includes('beach') || C.islandAt(state.player) !== 'umibe') return;
  state.seen.push('beach');
  say('chapu', who('chapu').say.beach);
}

// とちゅうで やめる
document.querySelectorAll('.quit').forEach((b) => b.addEventListener('click', () => {
  sound.play('tap'); C.quit(state);
  clearTimers(); jk = null;
  for (const id of ['janken', 'deco', 'aim', 'cheer']) show($(id), false);
  uiOpen = false; updateHud();
}));

// ---- じゃんけん ----
// 3Dの カニと ぷにゅが ならんで しょうぶ。「じゃん・けん」の あと、カニの てが「ちらっ」と みえる。みぬけば かてる
let jankenTimers = [];
const later = (fn, ms) => { const t = setTimeout(fn, ms); jankenTimers.push(t); };
function clearTimers() { jankenTimers.forEach(clearTimeout); jankenTimers = []; }
const handBtns = [...document.querySelectorAll('.hand-btn')];
handBtns.forEach((b) => { b.querySelector('.hand-pic').style.backgroundImage = `url(${handCanvas(b.dataset.hand, 'punyu', 192).toDataURL()})`; });
const setHands = (on) => handBtns.forEach((b) => { b.disabled = !on; if (on) b.classList.remove('picked'); });
function showWins(w) { $('jankenWins').innerHTML = Array.from({ length: JANKEN_WINS }, (_, i) => `<span class="${i < w ? 'on' : 'off'}">⭐</span>`).join(''); }
const chant = (text, cls) => chantOn($('jkChant'), text, cls);
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
function closeJanken() { clearTimers(); jk = null; show($('janken'), false); uiOpen = false; }
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

// ---- かざりつけ（ぷるるんゼリー） ----
// したの かざりを おすと、ゼリーの あたまに ぽとんと のる。ちゅうもんと おなじ ものが のると ひかる
const topBtns = TOPPINGS.map((t) => {
  const b = document.createElement('button'); b.className = 'top-btn'; b.dataset.top = t;
  b.append(toppingCanvas(t, 132), document.createTextNode(TOPPING_NAME[t]));
  b.addEventListener('click', () => {
    if (!C.decoPut(state, t)) return;
    sound.play('pop'); wobbleUntil = performance.now() + 450;
    drawDeco();
  });
  $('decoTray').append(b);
  return b;
});
function drawDeco() {
  const d = state.deco; if (!d) return;
  const rest = d.put.slice();
  $('decoOrder').replaceChildren(...d.order.map((t) => {
    const c = toppingCanvas(t, 108), i = rest.indexOf(t);
    if (i >= 0) { rest.splice(i, 1); c.className = 'ok'; } else c.className = 'yet';
    return c;
  }));
  topBtns.forEach((b) => { b.disabled = d.put.length >= DECO_MAX; });
  $('decoUndo').disabled = !d.put.length;
  $('decoDone').disabled = d.put.length < DECO_MIN;
}
function openDeco() { uiOpen = true; show($('deco'), true); drawDeco(); }
$('decoUndo').addEventListener('click', () => { if (C.decoUndo(state)) { sound.play('tap'); drawDeco(); } });
$('decoDone').addEventListener('click', () => {
  const r = C.decoDone(state);
  if (!r) return;
  show($('deco'), false); uiOpen = false; wobbleUntil = performance.now() + 1500;
  onDone(r);
});

// ---- ほしを そらへ（くもくもさん） ----
// わっかが おおきく なった ときに「えいっ」と おすと「ぴったり」
function openAim() {
  uiOpen = true; aimStart = performance.now();
  chantOn($('aimChant'), '', 'small'); $('aimBtn').disabled = false;
  show($('aim'), true);
}
$('aimBtn').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if ($('aimBtn').disabled || state.stars?.phase !== 'aim') return;
  const good = C.ringGood((performance.now() - aimStart) / 1000);
  const r = C.shootStar(state, good);
  if (!r) return;
  chantOn($('aimChant'), good ? 'ぴったり！' : 'えいっ！', good ? 'win' : 'small');
  sound.play(good ? 'win' : 'pop'); view.cheer();
  $('aimBtn').disabled = true;
  setTimeout(() => {
    if (r.done) { show($('aim'), false); uiOpen = false; onDone(r); } else $('aimBtn').disabled = false;
  }, r.done ? 1300 : 550);
});

// ---- えがおを とどける（でかもやもや） ----
// おす たびに、ぷにゅと ともだちが ひとりずつ ハートを とばす
function openCheer() {
  uiOpen = true; chantOn($('cheerChant'), `💗 0/${CHEER_NEED}`, 'small'); $('cheerBtn').disabled = false;
  show($('cheer'), true);
}
$('cheerBtn').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if ($('cheerBtn').disabled || !state.cheer) return;
  const senders = ['punyu', ...state.party.filter((id) => id !== 'moya')];
  const n = state.cheer.n;
  view.sendHeart(senders[n % senders.length], 'moya');
  if (n === CHEER_NEED - 1) for (const id of senders) view.sendHeart(id, 'moya');
  const r = C.cheer(state);
  chantOn($('cheerChant'), `💗 ${r.n}/${CHEER_NEED}`, r.done ? 'win' : 'small');
  sound.play(r.done ? 'fanfare' : 'win');
  $('cheerBtn').disabled = true;
  setTimeout(() => {
    if (r.done) { show($('cheer'), false); uiOpen = false; onDone(r); } else $('cheerBtn').disabled = false;
  }, r.done ? 1400 : 650);
});

// ---- シールちょう / おてがみ ----
let bookTab = 'sticker';
function renderBook() {
  $('bookTitle').textContent = bookTab === 'letter' ? 'おてがみ' : 'シールちょう';
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === bookTab));
  const body = $('bookBody');
  if (bookTab === 'sticker') {
    body.innerHTML = STICKERS.map((st) => {
      const has = state.stickers.includes(st.id), best = state.friends[st.id]?.best || 0;
      const again = has && playing && MAIN_IDS.includes(st.id) ? `<button class="replay" data-replay="${st.id}">🔁 あそぶ</button>` : '';
      const fl = has && MAIN_IDS.includes(st.id) ? `<div class="fl flowers">${flowersHtml(best)}</div>` : '';
      return `<div class="book-item ${has ? '' : 'off'}"><div class="ic">${st.icon}</div><div class="nm">${has ? st.name : '？？？'}</div>${fl}${again}</div>`;
    }).join('');
    body.querySelectorAll('[data-replay]').forEach((b) => b.addEventListener('click', () => {
      if (C.modal(state) || state.shells || state.stars || state.chase) return;
      show($('book'), false); uiOpen = false; sound.play('tap');
      startReplay(b.dataset.replay);
    }));
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
function openBook(tab) { if (uiOpen && playing) return; bookTab = tab; renderBook(); uiOpen = true; show($('book'), true); sound.unlock(); sound.play('tap'); }
$('bookBtn').addEventListener('click', () => openBook('sticker'));
$('letterBtn').addEventListener('click', () => openBook('letter'));
$('bookBtn2').addEventListener('click', () => openBook('sticker'));
$('bookClose').addEventListener('click', () => { show($('book'), false); uiOpen = false; sound.play('tap'); });
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
  const a = pick && C.nearAction(state);
  if (a && a.kind === pick.kind && a.id === pick.id) { doAction(pick); return; }
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
  if (e.code === 'Space') { e.preventDefault(); doAction(); }
  if (HANDKEY[e.code] && state.janken) playHand(HANDKEY[e.code]);
});
addEventListener('keyup', (e) => { if (KEYMAP[e.code]) held.delete(KEYMAP[e.code]); });
addEventListener('blur', () => held.clear());
$('btnAction').addEventListener('pointerdown', (e) => { e.preventDefault(); sound.unlock(); doAction(); });

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
let last = performance.now(), nearKey = '';
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
    const P = state.player;
    const r = C.touchShells(state);
    if (r) {
      sound.play('get'); view.burstStars(P.x, P.z);
      if (r.rainbow) callout('にじいろ！', 1100);
      else if (r.got === 1 && !state.seen.includes('tip')) { state.seen.push('tip'); mutter('🦦', who('chapu').say.tip, 4200); }
      store.save(state);
      if (r.done) onDone(r);
    }
    // すんでいる この おねがいの もの
    const it = C.touchItems(state);
    if (it) {
      const rd = who(it.res);
      sound.play('get'); view.burstStars(P.x, P.z);
      if (it.done) {
        sound.play('fanfare'); view.celebrate(it.res); mutter(rd.icon, rd.say.done, 3200);
        pendingCleared = pendingCleared.concat(it.cleared);
        setTimeout(nextFog, 1800);
      }
      updateHud(); store.save(state);
    }
    // ほし
    const st = C.touchStars(state);
    if (st) {
      if (st.ran) { sound.play('pop'); callout('にげた！', 900); }
      else { sound.play('get'); view.burstStars(P.x, P.z); }
    }
    // おいかけっこ
    const ch = C.stepChase(state, dt);
    if (ch) {
      sound.play('win'); view.burstStars(P.x, P.z);
      if (ch.done) onDone(ch); else callout(`タッチ！ ${ch.caught}/${CHASE_NEED}`, 1100);
    }
    beachHint();
  }
  // はなしかけ られる とき だけ、ボタンが ひかる
  const near = free ? C.nearAction(state) : null, key = near ? near.kind + near.id : '';
  if (key !== nearKey) {
    nearKey = key;
    const btn = $('btnAction');
    btn.classList.toggle('ready', !!near);
    btn.textContent = !near ? '！' : near.kind === 'pad' ? '⭐' : near.kind === 'res' ? who(near.id).icon : who(near.id).bubble;
    if (near) sound.play('kira');
  }
  saveTimer += dt;
  if (saveTimer > 5) { saveTimer = 0; if (playing) store.save(state); }
  updateGoal();
  view.sync(state, now / 1000, dt, {
    guide: free ? C.guideStep(state) : null, jk, look, faceTo, talking: !!faceTo,
    aimT: (now - aimStart) / 1000, wobble: now < wobbleUntil,
  });
  view.update(dt);
  requestAnimationFrame(frame);
}
updateHud();
requestAnimationFrame(frame);
