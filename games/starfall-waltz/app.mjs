// 画面遷移・入力・保存・固定フレームのループ
import {Game, W, H, DIFFICULTIES, MAX_POWER, clamp} from './core.mjs';
import {ATTACKS, BOSSES} from './content.mjs';
import {Renderer} from './render.mjs';
import {Sound} from './audio.mjs';

const $ = id => document.getElementById(id);
const STORE = 'starfall-waltz-v1', STEP = 1000 / 60, MAX_CONTINUES = 3;
const num = (v, d, lo, hi) => Number.isFinite(v) ? clamp(v, lo, hi) : d;
const fmt = n => Math.floor(n).toLocaleString('en-US');

// ---------- 保存 ----------
function fresh() { return {hi: [0, 0, 0], history: {}, seen: {}, cleared: [false, false, false], diff: 1, sound: true, music: .7, sfx: .7, sens: 1}; }
function load() {
  const s = fresh();
  try {
    const v = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (!v || typeof v !== 'object') return s;
    if (Array.isArray(v.hi)) s.hi = [0, 1, 2].map(i => num(v.hi[i], 0, 0, 1e12));
    if (Array.isArray(v.cleared)) s.cleared = [0, 1, 2].map(i => v.cleared[i] === true);
    if (v.history && typeof v.history === 'object') for (const [k, h] of Object.entries(v.history)) if (h && Number.isFinite(h.a) && Number.isFinite(h.c)) s.history[k] = {a: h.a, c: Math.min(h.c, h.a)};
    if (v.seen && typeof v.seen === 'object') for (const k of Object.keys(v.seen)) if (ATTACKS[k]) s.seen[k] = true;
    s.diff = [0, 1, 2].includes(v.diff) ? v.diff : 1; s.sound = v.sound !== false;
    s.music = num(v.music, .7, 0, 1); s.sfx = num(v.sfx, .7, 0, 1); s.sens = num(v.sens, 1, .6, 2);
  } catch {}
  return s;
}
let save = load();
function persist() { try { localStorage.setItem(STORE, JSON.stringify(save)); } catch {} }
const histKey = (id, diff) => `${id}:${diff}`;
const hist = (id, diff) => save.history[histKey(id, diff)] || {a: 0, c: 0};

// ---------- 状態 ----------
const canvas = $('field'), renderer = new Renderer(canvas);
const sound = new Sound({enabled: save.sound, music: save.music, sfx: save.sfx});
let game = null, demo = new Game({mode: 'demo', seed: 20260925}), screen = 'title', fieldCssW = W;
let acc = 0, last = performance.now(), endTimer = 0, endScreen = null;
const keys = new Set();
let bombQueued = false, touchFocus = false, drag = null, moveX = 0, moveY = 0;
renderer.history = id => game && game.mode !== 'demo' ? hist(id, game.diff) : null;

// ---------- 画面 ----------
const SCREENS = ['title', 'practice', 'help', 'settings', 'pause', 'gameover', 'practiceResult', 'ending'];
function show(name) {
  screen = name;
  for (const s of SCREENS) $(s).hidden = s !== name;
  document.body.dataset.screen = name;
  $('skipBtn').hidden = true;
  if (name !== 'playing') { drag = null; moveX = moveY = 0; }
  const first = name !== 'playing' && $(name)?.querySelector('.menu button:not([disabled]), .plist button:not([disabled]), button');
  if (first && !matchMedia('(pointer:coarse)').matches) first.focus({preventScroll: true});
}
function activeGame() { return game && screen !== 'title' && screen !== 'practice' && screen !== 'help' && screen !== 'settings' ? game : demo; }

function refreshDifficulty() {
  for (const box of document.querySelectorAll('.difficulty')) {
    box.innerHTML = '';
    DIFFICULTIES.forEach((d, i) => {
      const b = document.createElement('button');
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(save.diff === i));
      b.innerHTML = `${d.name}<small>${d.ja}</small>`;
      b.addEventListener('click', () => { save.diff = i; persist(); sound.sfx('select'); refreshDifficulty(); if (screen === 'practice') buildPractice(); refreshTitle(); });
      box.appendChild(b);
    });
  }
}
function refreshTitle() { $('titleHi').textContent = fmt(save.hi[save.diff]); }
function buildPractice() {
  const list = $('practiceList'); list.innerHTML = '';
  let n = 0;
  BOSSES.forEach(b => {
    const h = document.createElement('h3'); h.innerHTML = `${b.name}<small>${b.ja}・${b.title}</small>`; list.appendChild(h);
    for (const id of b.attacks.filter(id => ATTACKS[id].spell)) {
      n++;
      const a = ATTACKS[id], seen = !!save.seen[id], h2 = hist(id, save.diff), btn = document.createElement('button');
      btn.disabled = !seen;
      btn.innerHTML = `<span class="no">No.${String(n).padStart(2, '0')}</span><span class="nm">${seen ? a.name : '？？？？？？'}<small>${seen ? a.ja : 'ゲーム本編で出会うと練習できます'}</small></span><span class="hs">${h2.c}/${h2.a}</span>`;
      btn.addEventListener('click', () => startPractice(id));
      list.appendChild(btn);
    }
  });
}
function refreshSettings() {
  $('soundToggle').querySelector('b').textContent = save.sound ? 'ON' : 'OFF';
  $('musicVol').value = save.music; $('sfxVol').value = save.sfx; $('sens').value = save.sens; $('sensOut').textContent = save.sens.toFixed(1);
}

// ---------- 進行 ----------
function beginGame(g) {
  sound.init(); game = g; renderer.reset(); endTimer = 0; acc = 0; bombQueued = false; moveX = moveY = 0;
  $('hudDiff').textContent = DIFFICULTIES[g.diff].name;
  show('playing'); sound.sfx('confirm');
}
function startStory() { beginGame(new Game({mode: 'story', difficulty: save.diff, seed: (Date.now() & 0x7fffffff) || 1})); }
function startPractice(id) { beginGame(new Game({mode: 'practice', attack: id, difficulty: save.diff, seed: (Date.now() & 0x7fffffff) || 1})); }
function toTitle() {
  persist(); sound.resume(); game = null; renderer.reset(); sound.play('title'); refreshTitle(); show('title');
}
function pause() {
  if (screen !== 'playing' || endTimer > 0) return;
  persist();
  show('pause'); sound.sfx('pause'); setTimeout(() => { if (screen === 'pause') sound.pause(); }, 160);
}
function resume() { sound.resume(); show('playing'); }
function retry() { sound.resume(); if (game?.mode === 'practice') startPractice(game.practiceId); else startStory(); }
function continueGame() {
  if (!game || game.continues >= MAX_CONTINUES) return;
  game.continueGame(); sound.resume(); show('playing');
}
function finishTo(name) {
  persist();
  if (name === 'gameover') {
    const left = MAX_CONTINUES - game.continues;
    $('continueBtn').disabled = left <= 0;
    $('continueInfo').textContent = left > 0 ? `あと${left}回` : 'CONTINUE';
    $('goSub').textContent = left > 0 ? 'コンティニューするとスコアは0から' : 'ステップを踏み外してしまった';
    $('goScore').textContent = `SCORE ${fmt(game.score)}`;
  } else if (name === 'practiceResult') {
    const r = game.result || {}, a = ATTACKS[game.practiceId], h = hist(a.id, game.diff);
    $('prTitle').innerHTML = `${r.captured ? 'SPELL CAPTURED!' : 'FAILED…'}<small>${r.captured ? 'お見事！' : r.died ? '被弾してしまった' : 'ボーナスを逃した'}</small>`;
    $('prName').textContent = `${a.name}　${a.ja}`;
    $('prHist').textContent = `History ${h.c} / ${h.a}　（${DIFFICULTIES[game.diff].name}）`;
  } else if (name === 'ending') {
    $('endStats').innerHTML = [['SCORE', fmt(game.score)], ['DIFFICULTY', DIFFICULTIES[game.diff].name], ['CAPTURED', `${game.captures} / 8`],
      ['MISS', game.misses], ['NOVA', game.bombsUsed], ['GRAZE', fmt(game.graze)], ['CONTINUE', game.continues]]
      .map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
    sound.play('ending');
  }
  show(name);
}

function processEvents(g) {
  for (const e of g.events) {
    renderer.handle(e, g);
    switch (e.type) {
      case 'sfx': sound.sfx(e.name); break;
      case 'music': sound.play(e.track); break;
      case 'hit': sound.sfx('hit'); break;
      case 'death': sound.sfx('death'); break;
      case 'bomb': sound.sfx('bomb'); if (e.death) sound.sfx('deathbomb'); break;
      case 'spell':
        sound.sfx('spell'); save.seen[e.id] = true;
        { const k = histKey(e.id, g.diff), h = save.history[k] || {a: 0, c: 0}; h.a++; save.history[k] = h; }
        persist(); break;
      case 'capture': sound.sfx('capture'); { const h = save.history[histKey(e.id, g.diff)]; if (h) h.c = Math.min(h.a, h.c + 1); } persist(); break;
      case 'spellFail': sound.sfx('fail'); break;
      case 'extend': sound.sfx('extend'); break;
      case 'bombGet': case 'powerUp': case 'fullPower': sound.sfx('powerUp'); break;
      case 'enemyDown': sound.sfx('enemyDown'); break;
      case 'bossDown': sound.sfx('bossDown'); break;
      case 'stageClear': persist(); break;
      case 'countdown': sound.sfx(e.s <= 3 ? 'countdownLast' : 'countdown'); break;
      case 'gameover': endTimer = 80; endScreen = 'gameover'; break;
      case 'practiceDone': endTimer = e.died ? 80 : 100; endScreen = 'practiceResult'; break;
      case 'ending': endTimer = 150; endScreen = 'ending'; save.cleared[g.diff] = true; persist(); break;
    }
  }
  g.events.length = 0;
  if (g.mode === 'story' && g.score > save.hi[g.diff]) { save.hi[g.diff] = g.score; }
}

// ---------- 入力 ----------
function isFocus() { return keys.has('ShiftLeft') || keys.has('ShiftRight') || touchFocus; }
function buildInput() {
  let dx = 0, dy = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) dx--;
  if (keys.has('ArrowRight') || keys.has('KeyD')) dx++;
  if (keys.has('ArrowUp') || keys.has('KeyW')) dy--;
  if (keys.has('ArrowDown') || keys.has('KeyS')) dy++;
  const mx = clamp(moveX, -14, 14), my = clamp(moveY, -14, 14);
  moveX -= mx; moveY -= my;
  const bomb = bombQueued; bombQueued = false;
  return {dx, dy, focus: isFocus(), bomb, mx, my};
}
function setTouchFocus(v) { touchFocus = v; $('focusBtn').setAttribute('aria-pressed', String(v)); }
function markTouch() { if (!document.body.classList.contains('touch')) { document.body.classList.add('touch'); layout(); } }

addEventListener('keydown', e => {
  sound.init();
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (screen === 'playing') {
    if ((e.code === 'KeyX' || e.code === 'KeyK') && !e.repeat) bombQueued = true;
    if (game?.dialogue && !e.repeat && ['KeyZ', 'Enter', 'Space', 'KeyJ'].includes(e.code)) game.advanceDialogue();
    if (game?.dialogue && (e.code === 'ControlLeft' || e.code === 'ControlRight')) game.skipDialogue();
    if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) pause();
    return;
  }
  menuKey(e);
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { keys.clear(); pause(); } });

function menuKey(e) {
  if (e.repeat && !e.code.startsWith('Arrow')) return;
  const root = $(screen); if (!root) return;
  const items = [...root.querySelectorAll('button:not([disabled]), a[href], input')].filter(el => el.offsetParent !== null && !el.closest('.difficulty'));
  const i = items.indexOf(document.activeElement);
  if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
    const n = items.length; if (!n) return;
    const next = i < 0 ? 0 : (i + (e.code === 'ArrowDown' ? 1 : -1) + n) % n;
    items[next].focus(); sound.sfx('select');
  } else if ((e.code === 'ArrowLeft' || e.code === 'ArrowRight') && root.querySelector('.difficulty') && document.activeElement?.type !== 'range') {
    save.diff = clamp(save.diff + (e.code === 'ArrowRight' ? 1 : -1), 0, 2); persist(); refreshDifficulty(); refreshTitle();
    if (screen === 'practice') buildPractice();
    sound.sfx('select');
  } else if (['KeyZ', 'Enter', 'Space'].includes(e.code)) {
    const el = document.activeElement;
    if (el && root.contains(el) && el.tagName !== 'INPUT') { e.preventDefault(); el.click(); }
  } else if (['KeyX', 'Escape', 'Backspace'].includes(e.code)) {
    sound.sfx('cancel');
    if (screen === 'pause') resume();
    else if (['practice', 'help', 'settings'].includes(screen)) { show('title'); refreshTitle(); }
  }
}

document.addEventListener('pointerdown', e => {
  sound.init();
  if (e.pointerType === 'touch') markTouch();
  if (screen !== 'playing' || e.target.closest('button, a, input')) return;
  if (game?.dialogue) game.advanceDialogue();
  drag = {id: e.pointerId, x: e.clientX, y: e.clientY};
  e.preventDefault();
}, {passive: false});
document.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id || screen !== 'playing') return;
  const k = W / fieldCssW * save.sens * (isFocus() ? .55 : 1);
  moveX += (e.clientX - drag.x) * k; moveY += (e.clientY - drag.y) * k;
  drag.x = e.clientX; drag.y = e.clientY;
});
const endDrag = e => { if (drag && e.pointerId === drag.id) drag = null; };
document.addEventListener('pointerup', endDrag); document.addEventListener('pointercancel', endDrag);
document.addEventListener('contextmenu', e => e.preventDefault());

$('bombBtn').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); sound.init(); markTouch(); if (screen === 'playing') bombQueued = true; });
$('focusBtn').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); sound.init(); markTouch(); setTouchFocus(!touchFocus); });
$('pauseBtn').addEventListener('click', pause);
$('skipBtn').addEventListener('click', () => game?.skipDialogue());

const ACTIONS = {
  start: startStory, practice: () => { persist(); sound.resume(); sound.play('title'); buildPractice(); show('practice'); }, help: () => show('help'),
  settings: () => { refreshSettings(); show('settings'); }, title: toTitle, resume, retry, continue: continueGame,
};
document.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
  sound.init(); const act = b.dataset.act;
  if (!['start', 'retry', 'continue'].includes(act)) sound.sfx(act === 'title' ? 'cancel' : 'confirm');
  ACTIONS[act]?.();
}));
$('soundToggle').addEventListener('click', () => { save.sound = !save.sound; sound.setEnabled(save.sound); persist(); refreshSettings(); sound.sfx('select'); });
$('musicVol').addEventListener('input', e => { save.music = Number(e.target.value); sound.setMusic(save.music); persist(); });
$('sfxVol').addEventListener('input', e => { save.sfx = Number(e.target.value); sound.setSfx(save.sfx); persist(); sound.sfx('item'); });
$('sens').addEventListener('input', e => { save.sens = Number(e.target.value); persist(); $('sensOut').textContent = save.sens.toFixed(1); });
$('resetData').addEventListener('click', () => {
  if (!confirm('ハイスコアとスペルアリアの記録を消去しますか？')) return;
  const keep = {sound: save.sound, music: save.music, sfx: save.sfx, sens: save.sens, diff: save.diff};
  save = {...fresh(), ...keep}; persist(); refreshTitle(); sound.sfx('cancel');
});

// ---------- レイアウト ----------
let layoutTimer = 0;
function layout() {
  const vw = innerWidth, vh = innerHeight, touch = document.body.classList.contains('touch'), land = vw >= vh * 1.02;
  document.body.classList.toggle('portrait', !land); document.body.classList.toggle('landscape', land);
  let availW, availH;
  if (land) {
    const hudW = clamp(vw * .19, 150, 240), ctrlW = touch ? clamp(vw * .13, 96, 170) : 0;
    document.documentElement.style.setProperty('--hudW', hudW + 'px'); document.documentElement.style.setProperty('--ctrlW', ctrlW + 'px');
    availW = vw - hudW - ctrlW - 60; availH = vh - 34;
  } else {
    availW = vw - 24; availH = vh - 60 - (touch ? 104 : 0) - 44;
  }
  const s = Math.max(.4, Math.min(availW / W, availH / H)), cssW = Math.floor(W * s), cssH = Math.floor(H * s);
  canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px'; fieldCssW = cssW;
  let dpr = Math.min(2, devicePixelRatio || 1);
  if (cssW * cssH * dpr * dpr > 2.6e6) dpr = Math.sqrt(2.6e6 / (cssW * cssH));
  const pw = Math.round(cssW * dpr), ph = Math.round(cssH * dpr);
  if (pw !== canvas.width || ph !== canvas.height) renderer.resize(pw, ph);
}
addEventListener('resize', () => { clearTimeout(layoutTimer); layoutTimer = setTimeout(layout, 80); });

// ---------- 情報欄 ----------
const hudCache = {};
function setHud(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
function updateHud() {
  const g = activeGame(), real = g !== demo;
  setHud('hudHi', fmt(Math.max(save.hi[real ? g.diff : save.diff], real && g.mode === 'story' ? g.score : 0)));
  setHud('hudScore', real ? fmt(g.score) : '0');
  setHud('hudLives', real ? (g.lives > 0 ? '★'.repeat(g.lives) : '—') : '');
  setHud('hudBombs', real ? (g.bombs > 0 ? '✦'.repeat(g.bombs) : '—') : '');
  setHud('hudPower', real ? (g.power >= MAX_POWER ? 'MAX' : g.power.toFixed(2)) : '');
  setHud('hudGraze', real ? fmt(g.graze) : '');
  setHud('hudPoint', real ? fmt(g.pointValue) : '');
  if (real && screen === 'playing') $('skipBtn').hidden = !g.dialogue;
}

// ---------- ループ ----------
function tickOnce() {
  if (screen === 'playing' && game) {
    game.step(buildInput());
    processEvents(game); renderer.tick(game);
    if (endTimer > 0 && --endTimer === 0) finishTo(endScreen);
  } else if (activeGame() === demo) {
    demo.step({});
    for (const e of demo.events) if (e.type !== 'music' && e.type !== 'stage') renderer.handle(e, demo);
    demo.events.length = 0; renderer.tick(demo);
  }
}
function frame(now) {
  acc += Math.min(100, now - last); last = now;
  let steps = 0;
  while (acc >= STEP && steps < 4) { acc -= STEP; steps++; tickOnce(); }
  if (steps >= 4) acc = 0; // 処理落ち時は時間を捨てて、公平なスローモーションにする
  const g = activeGame();
  renderer.draw(g, {demo: g === demo});
  updateHud();
  requestAnimationFrame(frame);
}

if (matchMedia('(pointer:coarse)').matches) document.body.classList.add('touch');
layout(); refreshDifficulty(); refreshTitle(); show('title'); sound.play('title');
$('loading').hidden = true;
requestAnimationFrame(t => { last = t; frame(t); });
window.__starfall = {get game() { return game; }, get demo() { return demo; }, get screen() { return screen; }, sound, startPractice, startStory};
