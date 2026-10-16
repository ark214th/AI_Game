import { BASES, CREAMS, TOPPINGS, NOZZLES, CUSTOMERS, DRESSES, THEMES, KIND_TABLE, KIND_LABEL, UNLOCKS } from './data.mjs';
import * as C from './core.mjs';
import * as D from './draw.mjs';
import { Sound } from './audio.mjs';

const $ = id => document.getElementById(id);
const STORE = 'yumeiro-sweets-v1';

// ---------- ほぞん ----------
let save;
try { save = C.normalize(JSON.parse(localStorage.getItem(STORE) || 'null')); } catch { save = C.newSave(); }
const persist = () => { try { localStorage.setItem(STORE, JSON.stringify(save)); } catch { /* ほぞん できなくても あそべる */ } };

const sound = new Sound(save.sound);
const canvas = $('world'), ctx = canvas.getContext('2d');

// キャンバスは たて 900 の ざひょうで かく（よこは がめんに あわせて のびる）
let W = 1200, H = 900, S = 1, DPR = 1;
function resize() {
  const cw = innerWidth, ch = innerHeight;
  DPR = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(cw * DPR); canvas.height = Math.round(ch * DPR);
  S = ch / 900; W = cw / S; H = 900;
  if (W < 1200) { S = cw / 1200; W = 1200; H = ch / S; }
  shelfKey = '';
}
addEventListener('resize', resize);
const toV = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / S, y: (e.clientY - r.top) / S }; };
const domCenter = el => { const r = el.getBoundingClientRect(); return { x: (r.left + r.width / 2) / S, y: (r.top + r.height / 2) / S }; };

// ---------- じょうたい ----------
let scene = 'title';        // title / henshin / shop / kitchen
let T = 0;
let order = null, sweet = null, cov = null, step = 0, maxStep = 0;
const sel = { cream: 'pink', nozzle: 'swirl', top: 'strawberry' };
let history = [];
let gesture = null;
let cust = null;            // { id, x, tx, mood, state, moodUntil }
let speech = null;          // { text, until, order }
let girl = { pose: 'idle', mood: 'idle', until: 0 };
let carried = null;         // わたす おかし { sweet, x, y, s, tx, ty, t0 }
let henshin = null;
let magic = null;
let parts = [];
let timers = [];
let shownHearts = save.hearts;
let unlockQueue = [], afterUnlock = null;
let lastInput = 0;
let shelf = [], shelfKey = '';
let nameReturn = 'henshin', kanaKata = false, draft = '';
let serving = false;

const later = (sec, fn) => timers.push({ at: T + sec, fn });
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const counterY = () => H - 230;
const girlPos = () => ({ x: W * 0.27, y: counterY(), s: 92 });
const custX = () => W * 0.68;
function kbox() {
  const s = Math.min(H * 0.74, W * 0.56);
  return { x: W * 0.315 - s / 2, y: H * 0.85 - s * 0.9, s };
}

function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 1600);
}

// ---------- がめんの きりかえ ----------
function show(id, on = true) { $(id).hidden = !on; }
function updateHud() {
  $('heartCount').textContent = shownHearts;
  const nx = C.nextUnlock(shownHearts);
  const prev = [...UNLOCKS].reverse().find(u => u.at <= shownHearts)?.at || 0;
  $('nextBar').firstElementChild.style.width = nx == null ? '100%' : `${Math.round(((shownHearts - prev) / (nx - prev)) * 100)}%`;
  $('gift').textContent = nx == null ? '👑' : '🎁';
}

function goTitle() {
  scene = 'title';
  show('title'); show('hud', false); show('panel', false); show('makeBtn', false);
}

function startHenshin() {
  scene = 'henshin';
  henshin = { t0: T, flashed: false, fan: false };
  show('title', false); show('hud', false); show('panel', false); show('makeBtn', false);
  sound.stopBgm();
  sound.play('henshin');
  parts = [];
}

function enterShop() {
  scene = 'shop'; henshin = null;
  show('hud'); show('panel', false);
  updateHud();
  sound.startBgm();
  if (!cust) later(0.6, newCustomer);
  else if (cust.state === 'wait') show('makeBtn');
}

function newCustomer() {
  if (scene !== 'shop' && scene !== 'kitchen') return;
  order = C.makeOrder(save);
  const first = !save.met.includes(order.cust);
  cust = { id: order.cust, x: W + 260, tx: custX(), mood: 'idle', state: 'enter', moodUntil: 0, first };
  sound.play('bell');
  speech = null;
}

function customerArrived() {
  cust.state = 'wait';
  const cu = CUSTOMERS[cust.id];
  const hello = cust.first ? `はじめまして！ ${cu.name} だよ` : pick(cu.hello);
  speech = { text: hello, until: T + 1.8 };
  later(1.9, () => {
    if (!cust || cust.state !== 'wait') return;
    speech = { text: C.orderText(order), until: Infinity, order: true };
    if (scene === 'shop') show('makeBtn');
  });
}

// ---------- つくる ----------
const STEPS = [
  { icon: '🍰', name: 'えらぶ', title: 'どの おかしに する？' },
  { icon: '🖌️', name: 'ぬる', title: 'ゆびで クリームを ぬってね' },
  { icon: '🧁', name: 'しぼる', title: 'おして クリームを しぼってね' },
  { icon: '🍓', name: 'のせる', title: 'タップして のせてね' },
  { icon: '🪄', name: 'まほう', title: 'さいごに まほうを かけよう！' },
];

function startKitchen() {
  sound.play('step');
  scene = 'kitchen';
  show('makeBtn', false); show('hud', false); show('panel');
  const bases = C.unlockedOf(save.hearts, 'base');
  sweet = C.newSweet(bases[0]);
  cov = C.newCoverage(sweet.base);
  history = []; step = 0; maxStep = 0; magic = null; serving = false;
  const creams = C.unlockedOf(save.hearts, 'cream'), tops = C.unlockedOf(save.hearts, 'top');
  if (!creams.includes(sel.cream)) sel.cream = creams[0];
  if (!tops.includes(sel.top)) sel.top = tops[0];
  lastInput = T;
  renderPanel();
}

function goStep(i) {
  if (i === step || i > maxStep + 1 || magic) return;
  step = i; maxStep = Math.max(maxStep, i);
  lastInput = T;
  sound.play('step');
  renderPanel();
}

function wantOf(kind, id) {
  if (!order) return false;
  if (kind === 'base') return order.base === id;
  if (kind === 'cream') return order.need.k === 'cream' && order.need.id === id;
  if (kind === 'top') return order.need.k === 'top' && order.need.id === id;
  return false;
}

function itemButton(label, drawFn, { on = false, want = false, size = 10 } = {}) {
  const b = document.createElement('button');
  b.className = 'item' + (on ? ' on' : '');
  const px = Math.max(40, Math.round(innerHeight * size / 100));
  b.appendChild(D.iconCanvas(px, drawFn));
  const s = document.createElement('span'); s.textContent = label; b.appendChild(s);
  if (want) { const w = document.createElement('i'); w.className = 'want'; w.textContent = 'ちゅうもん'; b.appendChild(w); }
  return b;
}

const baseIcon = b => (g, px) => D.drawSweet(g, C.newSweet(b), 0, 0, px);
const creamIcon = c => (g, px) => { g.save(); g.scale(px, px); D.drawDollop(g, 0.5, 0.72, 0.36, c, 'swirl'); g.restore(); };
const topIcon = id => (g, px) => { g.save(); g.scale(px, px); D.drawTopping(g, id, 0.5, 0.52, 0.33, 0); g.restore(); };
const nozzleIcon = (k, c) => (g, px) => { g.save(); g.scale(px, px); D.drawDollop(g, 0.5, 0.75, 0.38, c, k); g.restore(); };

function renderPanel() {
  const st = $('steps'); st.innerHTML = '';
  STEPS.forEach((s, i) => {
    const b = document.createElement('button');
    b.innerHTML = `<span>${s.icon}</span>${s.name}`;
    if (i === step) b.classList.add('on'); else if (i <= maxStep) b.classList.add('done');
    b.disabled = i > maxStep + 1 || !!magic;
    b.onclick = () => goStep(i);
    st.appendChild(b);
  });
  $('panelTitle').textContent = STEPS[step].title;
  const box = $('panelItems'); box.innerHTML = '';
  const sub = $('panelSub'); sub.innerHTML = '';
  if (step === 0) {
    for (const b of C.unlockedOf(save.hearts, 'base')) {
      const el = itemButton(BASES[b].name, baseIcon(b), { on: sweet.base === b, want: wantOf('base', b) });
      el.onclick = () => chooseBase(b);
      box.appendChild(el);
    }
  } else if (step === 1 || step === 2) {
    for (const c of C.unlockedOf(save.hearts, 'cream')) {
      const el = itemButton(CREAMS[c].name, creamIcon(c), { on: sel.cream === c, want: wantOf('cream', c) });
      el.onclick = () => { sel.cream = c; sound.play('pick'); lastInput = T; renderPanel(); };
      box.appendChild(el);
    }
    if (step === 2) for (const k of C.unlockedOf(save.hearts, 'nozzle')) {
      const el = itemButton(NOZZLES[k].name, nozzleIcon(k, sel.cream), { on: sel.nozzle === k, size: 6 });
      el.onclick = () => { sel.nozzle = k; sound.play('pick'); renderPanel(); };
      sub.appendChild(el);
    }
  } else if (step === 3) {
    for (const id of C.unlockedOf(save.hearts, 'top')) {
      const el = itemButton(TOPPINGS[id].name, topIcon(id), { on: sel.top === id, want: wantOf('top', id) });
      el.onclick = () => { sel.top = id; sound.play('pick'); lastInput = T; renderPanel(); };
      box.appendChild(el);
    }
  } else {
    const el = document.createElement('button');
    el.className = 'item wand'; el.innerHTML = '<b>🪄</b>まほうを かける！';
    el.onclick = castMagic;
    box.appendChild(el);
  }
  updateButtons();
}

function updateButtons() {
  const kind = { 1: 'frost', 2: 'dollop', 3: 'top' }[step];
  $('undoBtn').disabled = !history.some(h => h.k === kind) || !!magic;
  $('undoBtn').style.visibility = kind ? 'visible' : 'hidden';
  const nb = $('nextBtn');
  nb.style.visibility = step < 4 ? 'visible' : 'hidden';
  nb.disabled = !!magic;
  const good = step === 0 || (step === 1 && C.coverage(cov) > 0.4) || (step === 2 && sweet.dollops.length >= 3) || (step === 3 && sweet.tops.length >= 2);
  nb.classList.toggle('glow', good);
}

function chooseBase(b) {
  if (b !== sweet.base) {
    sweet = C.newSweet(b); cov = C.newCoverage(b); history = [];
  }
  sound.play('pick');
  later(0.25, () => { if (scene === 'kitchen' && step === 0) goStep(1); });
  renderPanel();
}

function recomputeCoverage() {
  cov = C.newCoverage(sweet.base);
  if (sweet.frost.some(f => f.fill)) { for (let i = 0; i < cov.cells.length; i++) if (cov.cells[i] === 1) { cov.cells[i] = 2; cov.done++; } return; }
  for (const f of sweet.frost) for (let i = 0; i < f.p.length; i += 2) C.paint(cov, f.p[i], f.p[i + 1], BRUSH);
}

function undo() {
  const kind = { 1: 'frost', 2: 'dollop', 3: 'top' }[step];
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i];
    if (h.k !== kind) continue;
    history.splice(i, 1);
    if (kind === 'frost') {
      const idx = sweet.frost.lastIndexOf(h.f);
      if (idx >= 0) sweet.frost.splice(idx, 1);
      recomputeCoverage();
    } else if (kind === 'dollop') sweet.dollops.splice(sweet.dollops.length - h.n, h.n);
    else sweet.tops.splice(sweet.tops.length - h.n, h.n);
    sound.play('undo');
    break;
  }
  updateButtons();
}

const BRUSH = 0.09;
function kitchenDown(p) {
  const b = kbox(), u = (p.x - b.x) / b.s, v = (p.y - b.y) / b.s;
  lastInput = T;
  if (magic) return;
  if (step === 1) {
    const f = { c: sel.cream, p: [C3(u), C3(v)] };
    sweet.frost.push(f);
    history.push({ k: 'frost', f });
    gesture = { k: 'frost', f, lu: u, lv: v };
    spread(u, v);
  } else if (step === 2) {
    const h = { k: 'dollop', n: 0 };
    gesture = { k: 'dollop', h, lu: -9, lv: -9 };
    tryDollop(u, v);
  } else if (step === 3) {
    const h = { k: 'top', n: 0 };
    gesture = { k: 'top', h, lu: -9, lv: -9 };
    tryTopping(u, v);
  }
}
function kitchenMove(p) {
  if (!gesture) return;
  const b = kbox(), u = (p.x - b.x) / b.s, v = (p.y - b.y) / b.s;
  lastInput = T;
  const d = Math.hypot(u - gesture.lu, v - gesture.lv);
  if (gesture.k === 'frost' && d > 0.014) { gesture.f.p.push(C3(u), C3(v)); gesture.lu = u; gesture.lv = v; spread(u, v); }
  else if (gesture.k === 'dollop' && d > 0.075) tryDollop(u, v);
  else if (gesture.k === 'top' && d > 0.11) tryTopping(u, v);
}
const C3 = v => Math.round(v * 1000) / 1000;

function spread(u, v) {
  const added = C.paint(cov, u, v, BRUSH);
  if (added) sound.play('spread', 0.06);
  if (Math.random() < 0.25 && C.inside(sweet.base, u, v)) burst(u, v, 1, 'spark', CREAMS[sel.cream].l);
  if (!sweet.frost.some(f => f.fill) && C.coverage(cov) >= 0.86) {
    // おなじ いろの すじは けして、つるんと した しあがりに する
    const fill = { c: sel.cream, fill: true, p: [] };
    sweet.frost = [fill, ...sweet.frost.filter(f => f.c !== sel.cream)];
    history = history.filter(h => h.k !== 'frost' || sweet.frost.includes(h.f));
    history.push({ k: 'frost', f: fill });
    gesture = null;
    recomputeCoverage();
    sound.play('full');
    for (let i = 0; i < 12; i++) burst(rand(0.15, 0.85), rand(0.3, 0.85), 1, 'spark', '#fff');
    toast('ぴかぴか！');
  }
  updateButtons();
}

function tryDollop(u, v) {
  if (C.addDollop(sweet, { x: u, y: v, c: sel.cream, k: sel.nozzle })) {
    if (gesture.h.n === 0) history.push(gesture.h);
    gesture.h.n++; gesture.lu = u; gesture.lv = v;
    sound.play('squeeze', 0.05);
    burst(u, v - 0.06, 2, 'spark', '#fff');
    updateButtons();
  } else if (sweet.dollops.length >= 70) toast('もう いっぱい！');
}
function tryTopping(u, v) {
  if (C.addTopping(sweet, { x: u, y: v, id: sel.top, r: rand(-0.35, 0.35) })) {
    if (gesture.h.n === 0) history.push(gesture.h);
    gesture.h.n++; gesture.lu = u; gesture.lv = v;
    sound.play('place');
    burst(u, v, 3, 'spark', '#fff3a8');
    updateButtons();
  } else if (sweet.tops.length >= 40) toast('もう いっぱい！');
}

function castMagic() {
  if (magic) return;
  magic = { t0: T };
  sound.play('magic');
  renderPanel();
  later(0.8, () => { sweet.magic = true; sound.play('full'); });
  later(1.5, () => { sound.play('done'); magic.done = T; });
  later(2.8, serveSweet);
}

// ---------- わたす ----------
function serveSweet() {
  scene = 'shop'; magic = null; serving = true;
  show('panel', false); show('hud');
  const g = girlPos();
  carried = { sweet, x: g.x + 40, y: counterY() - 210, s: 200, tx: cust.x - 100, ty: counterY() - 190, t0: T };
  girl = { pose: 'give', mood: 'happy', until: T + 1.2 };
  speech = null;
  later(1.0, receive);
}

function receive() {
  const res = C.serve(save, order, sweet);
  persist();
  const cu = CUSTOMERS[cust.id];
  cust.mood = res.level === 'perfect' ? 'super' : 'happy'; cust.moodUntil = T + 3.2;
  const goodLines = ['わあ！ はじめて みた！ すてき！', 'とっても おいしそう！', 'こんな おかし しらなかった！'];
  speech = { text: res.level === 'perfect' ? pick(cu.love) : pick(goodLines), until: T + 3 };
  sound.play(res.level === 'perfect' ? 'perfect' : 'good');
  const cx = cust.x, cy = counterY() - 200;
  for (let i = 0; i < 18; i++) parts.push({ k: 'heart', x: cx + rand(-120, 120), y: cy + rand(-80, 60), vx: rand(-60, 60), vy: rand(-220, -80), t: 0, life: rand(1, 1.8), s: rand(10, 22), c: pick(['#ff8fbd', '#ffb6d0', '#c7a8ff', '#ff6fa8']) });
  if (res.level === 'perfect') for (let i = 0; i < 50; i++) parts.push({ k: 'conf', x: W / 2 + rand(-W / 2, W / 2), y: rand(-60, 0), vx: rand(-40, 40), vy: rand(120, 260), rot: rand(0, 6), t: 0, life: rand(2.2, 3.4), s: rand(10, 18), c: pick(['#ff9cc6', '#aee0ff', '#fff08a', '#c7a8ff', '#aef0d6']) });
  const pill = domCenter($('heartPill'));
  for (let i = 0; i < res.hearts; i++) later(0.5 + i * 0.22, () => parts.push({ k: 'fly', x: cx, y: cy, x0: cx, y0: cy, tx: pill.x, ty: pill.y, t: 0, life: 0.8, s: 26 }));
  if (res.fancy) later(1.0, () => toast('きらきら ボーナス！'));
  later(0.5 + res.hearts * 0.22 + 1.2, () => {
    unlockQueue = res.unlocked.slice();
    afterUnlock = customerLeave;
    nextUnlockPopup();
  });
}

function customerLeave() {
  if (!cust) return;
  speech = { text: 'またね！', until: T + 1.2 };
  sound.play('bye');
  later(0.9, () => { cust.state = 'leave'; cust.tx = W + 300; });
}

// ---------- あたらしい もの ----------
function nextUnlockPopup() {
  const it = unlockQueue.shift();
  if (!it) { show('unlock', false); const f = afterUnlock; afterUnlock = null; f?.(); return; }
  const [kind, id] = it.split(':');
  if (kind === 'nozzle') return nextUnlockPopup();
  const name = KIND_TABLE[kind][id].name;
  $('unlockLabel').textContent = `${KIND_LABEL[kind]}が ふえたよ！`;
  $('unlockLabel').classList.remove('yay'); void $('unlockLabel').offsetWidth; $('unlockLabel').classList.add('yay');
  $('unlockName').textContent = name;
  const box = $('unlockIcon'); box.innerHTML = '';
  const px = Math.round(innerHeight * 0.26);
  box.appendChild(D.iconCanvas(px, previewIcon(kind, id)));
  show('unlock');
  sound.play('unlock');
}
function previewIcon(kind, id) {
  return (g, px) => {
    if (kind === 'base') return baseIcon(id)(g, px);
    if (kind === 'cream') return creamIcon(id)(g, px);
    if (kind === 'top') return topIcon(id)(g, px);
    g.save(); g.scale(px / 100, px / 100);
    if (kind === 'cust') D.drawCustomer(g, id, 50, 96, 24, { mood: 'happy', t: 0.3 });
    else if (kind === 'dress') D.drawGirl(g, 50, 98, 22, { dress: id, mood: 'happy' });
    else if (kind === 'theme') themeSwatch(g, id);
    g.restore();
  };
}
function themeSwatch(g, id) {
  const th = THEMES[id];
  g.save(); D.rr(g, 6, 6, 88, 88, 18); g.clip();
  g.fillStyle = th.wall; g.fillRect(0, 0, 100, 100);
  g.fillStyle = th.stripe; for (let x = 6; x < 100; x += 20) g.fillRect(x, 0, 10, 100);
  for (let x = 0, i = 0; x < 100; x += 20, i++) { g.fillStyle = th.awn[i % 2]; g.fillRect(x, 0, 20, 22); g.beginPath(); g.arc(x + 10, 22, 10, 0, Math.PI); g.fill(); }
  g.fillStyle = th.counter; g.fillRect(0, 70, 100, 30);
  g.fillStyle = th.trim; for (let x = 0; x < 110; x += 14) { g.beginPath(); g.arc(x, 70, 7, 0, Math.PI); g.fill(); }
  g.restore();
}

// ---------- アルバム・きせかえ・せってい ----------
function openAlbum() {
  sound.play('tap');
  const grid = $('albumGrid'); grid.innerHTML = '';
  const list = [...save.album].reverse();
  $('albumEmpty').hidden = list.length > 0;
  const px = Math.round(innerHeight * 0.18);
  for (const e of list) {
    const d = document.createElement('div'); d.className = 'ph';
    d.appendChild(D.iconCanvas(px, (g, s) => {
      D.drawSweet(g, e.sweet, 0, s * 0.04, s * 0.96, { glint: false });
      g.save(); g.translate(s * 0.86, s * 0.95); D.drawCustomer(g, e.cust, 0, 0, s * 0.055, { mood: 'happy', t: 0.3 }); g.restore();
    }));
    if (e.level === 'perfect') { const f = document.createElement('span'); f.className = 'fav'; f.textContent = '♥'; d.appendChild(f); }
    grid.appendChild(d);
  }
  show('album');
}

let closetTab = 'dress';
function openCloset() { sound.play('tap'); show('makeBtn', false); renderCloset(); show('closet'); }
function renderCloset() {
  document.querySelectorAll('#closet .tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === closetTab));
  const box = $('closetItems'); box.innerHTML = '';
  const table = closetTab === 'dress' ? DRESSES : THEMES;
  const un = C.unlockedSet(save.hearts);
  for (const id of Object.keys(table)) {
    const key = `${closetTab}:${id}`;
    const at = UNLOCKS.find(u => u.items.includes(key))?.at ?? 0;
    const open = un.has(key);
    const cur = closetTab === 'dress' ? save.dress === id : save.theme === id;
    let el;
    if (open) el = itemButton(table[id].name, previewIcon(closetTab, id), { on: cur, size: 11 });
    else {
      el = itemButton(`♥${at}`, (g, px) => { g.fillStyle = '#ead9e2'; D.circ(g, px / 2, px / 2, px * 0.4); g.fill(); D.text(g, '？', px / 2, px / 2 + 2, px * 0.45, { color: '#fff' }); }, { size: 11 });
      el.classList.add('locked');
    }
    el.onclick = () => {
      if (!open) { sound.play('tap'); toast(`ハートが ${at}こに なると ふえるよ`); return; }
      if (closetTab === 'dress') save.dress = id; else save.theme = id;
      persist(); sound.play('full');
      const g = girlPos();
      for (let i = 0; i < 14; i++) parts.push({ k: 'spark', x: g.x + rand(-120, 120), y: g.y - rand(0, 330), vx: rand(-30, 30), vy: rand(-80, -20), t: 0, life: rand(0.6, 1.2), s: rand(8, 16), c: '#fff' });
      girl = { pose: 'cheer', mood: 'happy', until: T + 1 };
      shelfKey = '';
      renderCloset();
    };
    box.appendChild(el);
  }
}

function openSettings() { sound.play('tap'); $('resetBtn').dataset.sure = ''; $('resetBtn').textContent = 'さいしょから あそぶ'; updateSoundBtn(); show('settings'); }
function updateSoundBtn() { $('soundBtn').textContent = save.sound ? '🔊 おと：あり' : '🔇 おと：なし'; }

// ---------- なまえ ----------
const KANA_COLS = [
  ['あ', 'い', 'う', 'え', 'お'], ['か', 'き', 'く', 'け', 'こ'], ['さ', 'し', 'す', 'せ', 'そ'], ['た', 'ち', 'つ', 'て', 'と'],
  ['な', 'に', 'ぬ', 'ね', 'の'], ['は', 'ひ', 'ふ', 'へ', 'ほ'], ['ま', 'み', 'む', 'め', 'も'], ['や', '', 'ゆ', '', 'よ'],
  ['ら', 'り', 'る', 'れ', 'ろ'], ['わ', '', 'を', '', ''], ['ん', '', '', '', ''],
];
function buildKana() {
  const k = $('kana'); k.innerHTML = '';
  KANA_COLS.forEach((col, ci) => col.forEach((ch, ri) => {
    if (!ch) return;
    const b = document.createElement('button');
    b.textContent = kanaKata ? C.kata(ch) : ch;
    b.style.gridColumn = String(KANA_COLS.length - ci);
    b.style.gridRow = String(ri + 1);
    b.onclick = () => { draft = C.typeChar(draft, b.textContent); sound.play('key'); updateName(); };
    k.appendChild(b);
  }));
  $('kanaMode').textContent = kanaKata ? 'ひらがな' : 'カタカナ';
}
function updateName() { $('nameText').textContent = draft; $('nameOk').disabled = !draft; }
function openName(ret) {
  nameReturn = ret; draft = save.name || ''; kanaKata = false;
  buildKana(); updateName();
  show('title', false); show('settings', false); show('nameScreen');
}
function closeName(name) {
  save.name = name; save.named = true; persist();
  show('nameScreen', false);
  shelfKey = '';
  if (nameReturn === 'henshin') startHenshin(); else enterShop();
}

// ---------- つぶつぶ ----------
function burst(u, v, n, k, c) {
  const b = kbox();
  for (let i = 0; i < n; i++) parts.push({ k, x: b.x + u * b.s + rand(-10, 10), y: b.y + v * b.s + rand(-10, 10), vx: rand(-60, 60), vy: rand(-120, -30), t: 0, life: rand(0.4, 0.8), s: rand(6, 12), c });
}
function updateParts(dt) {
  for (const p of parts) {
    p.t += dt;
    if (p.k === 'fly') {
      const u = Math.min(1, p.t / p.life), e = u * u * (3 - 2 * u);
      p.x = p.x0 + (p.tx - p.x0) * e; p.y = p.y0 + (p.ty - p.y0) * e - Math.sin(u * Math.PI) * 140;
      if (u >= 1 && !p.hit) {
        p.hit = true; shownHearts = Math.min(save.hearts, shownHearts + 1); updateHud(); sound.play('heart');
        const pill = $('heartPill'); pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump');
      }
    } else {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.k === 'conf') { p.rot += dt * 5; p.vx += Math.sin(p.t * 3 + p.s) * 20 * dt; }
      if (p.k === 'heart') p.vy += 30 * dt;
    }
  }
  parts = parts.filter(p => p.t < p.life);
}
function drawParts() {
  for (const p of parts) {
    const u = p.t / p.life;
    ctx.globalAlpha = p.k === 'fly' ? 1 : 1 - u * u;
    if (p.k === 'spark') D.sparkle(ctx, p.x, p.y, p.s * (1 - u * 0.5), p.c);
    else if (p.k === 'heart' || p.k === 'fly') D.drawHeart(ctx, p.x, p.y, p.s, p.c || '#ff6fa8');
    else if (p.k === 'conf') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); }
  }
  ctx.globalAlpha = 1;
}

// ---------- たなの おかし（つくった ものが かざられる） ----------
function updateShelf() {
  const key = `${save.album.length}:${S}:${save.theme}`;
  if (key === shelfKey) return;
  shelfKey = key;
  const recent = save.album.slice(-8).reverse();
  const px = Math.round(140 * S);
  shelf = recent.map(e => D.iconCanvas(px, (g, s) => D.drawSweet(g, e.sweet, 0, 0, s, { glint: false }), DPR));
}

// ---------- かく ----------
function drawSpeech() {
  if (!speech || !cust || T > speech.until) return;
  const cy = counterY();
  const fs = speech.order ? 40 : 36;
  ctx.font = `900 ${fs}px "Hiragino Maru Gothic ProN",system-ui,sans-serif`;
  const lines = wrap(speech.text, 470);
  const tw = Math.max(...lines.map(l => ctx.measureText(l).width));
  const w = Math.max(260, tw + 70), lh = fs * 1.3;
  const h = lines.length * lh + 50 + (speech.order ? 120 : 0);
  const x = Math.max(20, Math.min(W - w - 20, cust.x - w / 2));
  const y = Math.max(96, cy - 345 - h);
  D.bubble(ctx, x, y, w, h, cust.x - 40, cy - 330);
  lines.forEach((l, i) => D.text(ctx, l, x + w / 2, y + 30 + lh * (i + 0.5), fs, { color: '#6b4560' }));
  if (speech.order) {
    const iy = y + 30 + lh * lines.length + 6;
    D.drawSweet(ctx, C.newSweet(order.base), x + w / 2 - 125, iy, 110, { glint: false });
    D.text(ctx, '＋', x + w / 2, iy + 58, 40, { color: '#ff9cc6' });
    needIcon(x + w / 2 + 70, iy + 56, 46);
  }
}
function needIcon(x, y, s) {
  if (order.need.k === 'top') D.drawTopping(ctx, order.need.id, x, y, s * 0.8, 0);
  else D.drawDollop(ctx, x, y + s * 0.55, s, order.need.id, 'swirl');
}
function wrap(str, max) {
  const words = str.split(' '), lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (cur && ctx.measureText(t).width > max) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

function blinkAt(seed) { return ((T + seed) % 3.9) < 0.13; }

function drawShopScene(dt) {
  const cy = counterY();
  updateShelf();
  D.drawShop(ctx, W, H, save.theme, T, { name: save.name, shelf, counterY: cy, signX: Math.max(250, girlPos().x) });
  const g = girlPos();
  if (T > girl.until && girl.pose !== 'idle') girl = { pose: 'idle', mood: 'idle', until: 0 };
  D.drawGirl(ctx, g.x, g.y, g.s, { t: T, dress: save.dress, pose: girl.pose, mood: girl.mood, blink: blinkAt(0) });
  if (cust) {
    const dx = cust.tx - cust.x;
    if (Math.abs(dx) > 2) {
      cust.x += Math.sign(dx) * Math.min(Math.abs(dx), dt * 520);
      if (Math.abs(cust.tx - cust.x) <= 2) {
        cust.x = cust.tx;
        if (cust.state === 'enter') customerArrived();
        else if (cust.state === 'leave') { cust = null; carried = null; serving = false; later(1.0, newCustomer); }
      }
    }
    if (cust) {
      const walking = Math.abs(cust.tx - cust.x) > 2;
      if (cust.moodUntil && T > cust.moodUntil) { cust.mood = 'idle'; cust.moodUntil = 0; }
      const hop = walking ? Math.abs(Math.sin(T * 10)) * 18 : 0;
      D.drawCustomer(ctx, cust.id, cust.x, cy - hop, 82, { t: T, mood: cust.mood, blink: blinkAt(1.3) });
    }
  }
  D.drawCounter(ctx, W, H, save.theme, cy);
  if (carried) {
    const u = Math.min(1, (T - carried.t0) / 0.9), e = u * u * (3 - 2 * u);
    if (cust && cust.state === 'leave') { carried.tx = cust.x - 100; }
    const x = carried.x + (carried.tx - carried.x) * e, y = carried.y + (carried.ty - carried.y) * e - Math.sin(u * Math.PI) * 60;
    const fx = cust && cust.state === 'leave' ? cust.x - 100 : x;
    D.drawSweet(ctx, carried.sweet, fx - carried.s / 2, y, carried.s, { t: T });
  }
  drawSpeech();
}

function drawKitchenScene() {
  D.drawKitchen(ctx, W, H, save.theme, T);
  const b = kbox();
  // ケーキスタンドの ひかり
  const gl = ctx.createRadialGradient(b.x + b.s / 2, b.y + b.s * 0.6, 10, b.x + b.s / 2, b.y + b.s * 0.6, b.s * 0.6);
  gl.addColorStop(0, 'rgba(255,255,255,.8)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl; ctx.fillRect(b.x - 40, b.y, b.s + 80, b.s);
  D.drawSweet(ctx, sweet, b.x, b.y, b.s, { t: T });

  // ちゅうもんの メモ
  if (order) {
    const cu = CUSTOMERS[order.cust];
    ctx.font = '900 30px "Hiragino Maru Gothic ProN",system-ui,sans-serif';
    const lines = wrap(C.orderText(order), 320);
    const mh = 72 + lines.length * 38;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,.94)'; D.rr(ctx, 16, 16, 470, mh, 30); ctx.fill();
    ctx.strokeStyle = '#ffb6d0'; ctx.lineWidth = 5; ctx.stroke();
    D.rr(ctx, 16, 16, 470, mh, 30); ctx.clip();
    D.drawCustomer(ctx, order.cust, 84, 16 + mh, 33, { t: T, blink: blinkAt(2) });
    ctx.restore();
    D.text(ctx, cu.name, 150, 46, 24, { color: '#c896ad', align: 'left' });
    lines.forEach((l, i) => D.text(ctx, l, 150, 88 + i * 38, 30, { align: 'left' }));
  }

  // ゆびの ヒント
  const idle = T - lastInput;
  const needHint = (step === 1 && C.coverage(cov) < 0.15) || (step === 2 && !sweet.dollops.length) || (step === 3 && !sweet.tops.length);
  if (needHint && idle > 2.5 && !magic) {
    const a = C.areaOf(sweet.base).add[0];
    const ph = (T * 0.8) % 1;
    let hx = a.x, hy = a.y + (a.t === 'r' ? a.h / 2 : 0);
    if (step === 1) hx += Math.sin(ph * Math.PI * 2) * 0.18;
    const press = step === 1 ? 0 : Math.max(0, Math.sin(ph * Math.PI * 2)) * 14;
    ctx.globalAlpha = 0.9;
    ctx.font = '84px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('👆', b.x + hx * b.s + 10, b.y + hy * b.s + press);
    ctx.globalAlpha = 1;
  }

  // まほう
  if (magic) {
    const k = T - magic.t0;
    if (k < 1.2) {
      for (let i = 0; i < 3; i++) parts.push({ k: 'spark', x: b.x + rand(0.1, 0.9) * b.s, y: b.y + rand(-0.05, 0.3) * b.s, vx: rand(-20, 20), vy: rand(150, 300), t: 0, life: rand(0.6, 1.1), s: rand(8, 18), c: pick(['#fff', '#fff3a8', '#ffd3e6', '#e2d2ff']) });
      // まわる ステッキ
      const ang = k * 5;
      const wx = b.x + b.s / 2 + Math.cos(ang) * b.s * 0.35, wy = b.y + b.s * 0.25 + Math.sin(ang) * b.s * 0.12;
      ctx.save(); ctx.translate(wx, wy); ctx.rotate(0.5);
      ctx.strokeStyle = '#ff8fbd'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(0, 100); ctx.stroke();
      ctx.fillStyle = '#ffe070'; D.starPath(ctx, 0, 0, 40, 18); ctx.fill();
      ctx.restore();
    }
    if (magic.done) {
      const u = Math.min(1, (T - magic.done) / 0.4);
      const sc = 0.6 + 0.4 * Math.sin(u * Math.PI / 2) + (u >= 1 ? Math.sin(T * 6) * 0.02 : 0);
      ctx.save(); ctx.translate(b.x + b.s / 2, b.y + b.s * 0.12); ctx.scale(sc, sc);
      D.text(ctx, 'できあがり！', 0, 0, 84, { color: '#ff6fa8', stroke: '#fff', sw: 18 });
      ctx.restore();
    }
  }
}

function drawHenshin() {
  const k = T - henshin.t0;
  const dr = DRESSES[save.dress] || DRESSES.pink;
  const g = ctx.createRadialGradient(W / 2, H * 0.45, 30, W / 2, H * 0.45, W * 0.7);
  g.addColorStop(0, '#fff3fa'); g.addColorStop(0.35, '#ffb6d6'); g.addColorStop(0.7, '#c7a8ff'); g.addColorStop(1, '#8f7ae0');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // ひかりの すじ
  ctx.save(); ctx.translate(W / 2, H * 0.45); ctx.rotate(T * 0.3);
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, -60); ctx.lineTo(W, 60); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  for (let i = 0; i < 26; i++) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(T * 4 + i); D.sparkle(ctx, D.hash(i) * W, D.hash(i + 40) * H, 6 + D.hash(i + 3) * 10, '#fff'); }
  ctx.globalAlpha = 1;

  const after = k >= 2.4;
  const cx = W / 2, by = H + 20, s = 150;
  if (k < 2.4) {
    const spin = k > 0.6 ? (k - 0.6) * Math.PI * 3 : 0;
    const lift = k > 0.6 ? Math.min(1, (k - 0.6) / 0.6) * 40 : 0;
    D.drawGirl(ctx, cx, by - lift, s, { t: T, casual: true, pose: k > 1.0 ? 'cheer' : 'idle', spin: k > 0.6 ? spin : null, blink: k > 1.0 });
    if (k > 1.4) {
      // リボンが まきつく
      const u = Math.min(1, (k - 1.4) / 1.0);
      for (let r = 0; r < 3; r++) {
        ctx.strokeStyle = r === 1 ? dr.sub : dr.main; ctx.lineWidth = 26; ctx.lineCap = 'round'; ctx.globalAlpha = 0.9;
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) {
          const q = i / 40; if (q > u) break;
          const a = q * Math.PI * 5 + T * 3 + r * 2.1;
          const yy = by - 520 * q - r * 30 + 60, xx = cx + Math.cos(a) * (190 - q * 40);
          i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  } else {
    D.drawGirl(ctx, cx, by, s, { t: T, dress: save.dress, pose: 'up', mood: k > 3.2 ? 'happy' : 'idle', blink: blinkAt(0) });
    if (!henshin.fan) {
      henshin.fan = true; sound.play('fanfare');
      for (let i = 0; i < 40; i++) { const a = rand(0, Math.PI * 2), sp = rand(200, 620); parts.push({ k: i % 2 ? 'heart' : 'spark', x: cx, y: H * 0.45, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: rand(1, 1.8), s: rand(12, 26), c: pick(['#ff8fbd', '#fff', '#ffe070', '#c7a8ff']) }); }
    }
    const u = Math.min(1, (k - 2.6) / 0.5);
    if (u > 0) {
      ctx.save(); ctx.translate(W / 2, 150); const sc = 0.5 + 0.5 * Math.sin(u * Math.PI / 2); ctx.scale(sc, sc);
      D.text(ctx, 'きらきら パティシエ', 0, 0, 78, { color: '#ff5d9e', stroke: '#fff', sw: 18 });
      if (save.name) D.text(ctx, `${save.name}！`, 0, 92, 70, { color: '#9a6ae6', stroke: '#fff', sw: 16 });
      ctx.restore();
    }
    if (k > 3.6) D.text(ctx, 'タップで すすむ', W / 2, H - 50, 30, { color: '#fff', stroke: 'rgba(160,90,160,.6)', sw: 8 });
  }
  if (k > 2.2 && !henshin.flashed) { henshin.flashed = true; sound.play('flash'); }
  if (k > 2.1 && k < 2.9) { ctx.fillStyle = `rgba(255,255,255,${1 - Math.abs(k - 2.4) / 0.5})`; ctx.fillRect(0, 0, W, H); }
  if (k > 6) enterShop();
}

function drawTitle() {
  const cy = counterY();
  updateShelf();
  D.drawShop(ctx, W, H, save.theme, T, { name: save.name, shelf, counterY: cy });
  D.drawGirl(ctx, W * 0.17, cy, 88, { t: T, dress: save.dress, blink: blinkAt(0) });
  D.drawCustomer(ctx, 'usagi', W * 0.84, cy, 76, { t: T, blink: blinkAt(1) });
  D.drawCounter(ctx, W, H, save.theme, cy);
  const demo = TITLE_SWEETS;
  demo.forEach((sw, i) => { const x = W * (0.3 + i * 0.2) - 90, y = cy - 175 + Math.sin(T * 2 + i) * 8; D.drawSweet(ctx, sw, x, y, 180, { t: T }); });
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(0, 0, W, H);
}
const TITLE_SWEETS = (() => {
  const a = C.newSweet('cake'); a.frost.push({ c: 'pink', fill: true, p: [] }); a.magic = true;
  for (const [x, y] of [[0.25, 0.44], [0.38, 0.38], [0.5, 0.36], [0.62, 0.38], [0.75, 0.44]]) a.dollops.push({ x, y, c: 'white', k: 'swirl' });
  for (const [x, y] of [[0.32, 0.46], [0.5, 0.49], [0.68, 0.46]]) a.tops.push({ x, y, id: 'strawberry', r: 0 });
  const b = C.newSweet('cupcake'); b.frost.push({ c: 'lavender', fill: true, p: [] }); b.magic = true;
  b.dollops.push({ x: 0.5, y: 0.42, c: 'pink', k: 'swirl' }); b.tops.push({ x: 0.5, y: 0.28, id: 'star', r: 0.2 }, { x: 0.3, y: 0.5, id: 'heart', r: -0.3 }, { x: 0.7, y: 0.5, id: 'heart', r: 0.3 });
  const c = C.newSweet('donut'); c.frost.push({ c: 'sky', fill: true, p: [] }); c.magic = true;
  c.tops.push({ x: 0.3, y: 0.5, id: 'ribbon', r: -0.2 }, { x: 0.68, y: 0.48, id: 'star', r: 0.2 }, { x: 0.5, y: 0.72, id: 'heart', r: 0 });
  return [a, b, c];
})();

// ---------- ループ ----------
let lastFrame = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000); lastFrame = now; T += dt;
  for (const tm of timers.filter(t => t.at <= T)) { timers.splice(timers.indexOf(tm), 1); tm.fn(); }
  ctx.setTransform(DPR * S, 0, 0, DPR * S, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (scene === 'title') drawTitle();
  else if (scene === 'henshin') drawHenshin();
  else if (scene === 'shop') drawShopScene(dt);
  else if (scene === 'kitchen') drawKitchenScene();
  updateParts(dt);
  drawParts();
  requestAnimationFrame(frame);
}

// ---------- そうさ ----------
let pid = null;
canvas.addEventListener('pointerdown', e => {
  sound.unlock();
  if (pid !== null) return;
  pid = e.pointerId;
  try { canvas.setPointerCapture(e.pointerId); } catch { /* なくても よい */ }
  const p = toV(e);
  if (scene === 'kitchen') kitchenDown(p);
  else if (scene === 'henshin' && T - henshin.t0 > 0.5) enterShop();
  else if (scene === 'shop' && cust && cust.state === 'wait' && !serving && Math.abs(p.x - cust.x) < 110 && p.y > counterY() - 330 && p.y < counterY()) {
    cust.mood = 'happy'; cust.moodUntil = T + 0.9; sound.play('heart');
    for (let i = 0; i < 5; i++) parts.push({ k: 'heart', x: cust.x + rand(-60, 60), y: counterY() - 250, vx: rand(-40, 40), vy: rand(-160, -80), t: 0, life: 1, s: rand(10, 16), c: '#ff8fbd' });
  } else if (scene === 'shop') {
    const g = girlPos();
    if (Math.abs(p.x - g.x) < 110 && p.y > counterY() - 330 && p.y < counterY()) { girl = { pose: 'cheer', mood: 'happy', until: T + 0.8 }; sound.play('heart'); }
  }
});
canvas.addEventListener('pointermove', e => { if (e.pointerId !== pid) return; if (scene === 'kitchen') kitchenMove(toV(e)); });
const up = e => { if (e.pointerId !== pid) return; pid = null; gesture = null; };
canvas.addEventListener('pointerup', up);
canvas.addEventListener('pointercancel', up);
document.addEventListener('pointerdown', () => sound.unlock(), { capture: true });

$('playBtn').onclick = () => { sound.unlock(); sound.play('tap'); if (!save.named) openName('henshin'); else startHenshin(); };
$('makeBtn').onclick = () => { if (cust && cust.state === 'wait') startKitchen(); };
$('nextBtn').onclick = () => goStep(step + 1);
$('undoBtn').onclick = undo;
$('albumBtn').onclick = openAlbum;
$('closetBtn').onclick = openCloset;
$('setBtn').onclick = openSettings;
document.querySelectorAll('.screen .back').forEach(b => b.onclick = () => {
  sound.play('tap'); b.closest('.screen').hidden = true;
  if (scene === 'shop' && cust && cust.state === 'wait' && speech?.order) show('makeBtn');
});
document.querySelectorAll('#closet .tabs button').forEach(b => b.onclick = () => { closetTab = b.dataset.tab; sound.play('tap'); renderCloset(); });
$('soundBtn').onclick = () => { save.sound = !save.sound; sound.setOn(save.sound); persist(); updateSoundBtn(); sound.play('tap'); };
$('renameBtn').onclick = () => { sound.play('tap'); openName('shop'); };
$('replayBtn').onclick = () => { show('settings', false); startHenshin(); };
$('resetBtn').onclick = () => {
  const b = $('resetBtn');
  if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'ほんとうに けす？ もういちど おしてね'; sound.play('tap'); return; }
  save = C.newSave(); persist(); shownHearts = 0; cust = null; speech = null; order = null; carried = null; timers = [];
  show('settings', false); goTitle();
};
$('unlockOk').onclick = () => { sound.play('tap'); nextUnlockPopup(); };

document.querySelectorAll('.kana-side [data-mod]').forEach(b => b.onclick = () => { draft = C.modifyLast(draft, b.dataset.mod); sound.play('key'); updateName(); });
document.querySelectorAll('.kana-side [data-ch]').forEach(b => b.onclick = () => { draft = C.typeChar(draft, b.dataset.ch); sound.play('key'); updateName(); });
$('kanaMode').onclick = () => { kanaKata = !kanaKata; $('kanaMode').classList.toggle('on', kanaKata); sound.play('tap'); buildKana(); };
$('kanaDel').onclick = () => { draft = C.backspace(draft); sound.play('del'); updateName(); };
$('nameOk').onclick = () => { if (!draft) return; sound.play('done'); closeName(draft); };
$('nameLater').onclick = () => { sound.play('tap'); closeName(save.name || ''); };

document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
document.addEventListener('gesturestart', e => e.preventDefault());

resize();
updateHud();
$('loading').hidden = true;
requestAnimationFrame(frame);

// テスト用（?test を つけた ときだけ）
if (new URLSearchParams(location.search).has('test')) window.__game = { get scene() { return scene; }, get save() { return save; }, get sweet() { return sweet; }, get order() { return order; }, kbox, goStep, startKitchen, castMagic, get step() { return step; } };
