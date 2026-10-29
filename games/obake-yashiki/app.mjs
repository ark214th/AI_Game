// オバケやしきの おかたづけ — そうさ・まほう・がめんの 文字
import * as T from './vendor/three.module.min.js';
import * as C from './core.mjs';
import { View, drawIcon } from './view.mjs';
import { sfx, unlockAudio } from './audio.mjs';

const SAVE_KEY = 'obake-yashiki-v2';
const $ = id => document.getElementById(id);
const canvas = $('world');
const view = new View(canvas);

let g = null, running = false, paused = false;
const player = { x: C.START.x, z: C.START.z, yaw: C.START.yaw, pitch: -0.12, target: null, path: [], look: null, intent: null, stuck: 0, step: 0 };
const cd = {}, magicTime = { michi: 0 };
const OBS = C.obstacles();

// ---------- ほぞん ----------
function save() {
  if (!g) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(C.serialize(g))); } catch {}
}
function loadSave() {
  try { return C.restore(JSON.parse(localStorage.getItem(SAVE_KEY) || 'null')); } catch { return null; }
}

// ---------- いどう ----------
const R = C.BODY;
function resolve(p) {
  p.x = Math.max(C.WALK.x0, Math.min(C.WALK.x1, p.x));
  p.z = Math.max(C.WALK.z0, Math.min(C.WALK.z1, p.z));
  for (const o of OBS) {
    const x0 = o.x0 - R, x1 = o.x1 + R, z0 = o.z0 - R, z1 = o.z1 + R;
    if (p.x > x0 && p.x < x1 && p.z > z0 && p.z < z1) {
      const push = [[p.x - x0, -1, 0], [x1 - p.x, 1, 0], [p.z - z0, 0, -1], [z1 - p.z, 0, 1]].sort((a, b) => a[0] - b[0])[0];
      p.x += push[1] * push[0]; p.z += push[2] * push[0];
    }
  }
  return p;
}
function walkTo(x, z, intent = null) {
  const path = C.findPath(g, player, { x, z });
  if (!path || !path.length) { if (intent) toast('そこまで いけないみたい'); return; }
  player.path = path;
  player.target = path[path.length - 1];
  player.intent = intent;
  player.stuck = 0;
  player.manual = false;
}
function distTo(x, z) { return Math.hypot(player.x - x, player.z - z); }

function intentReady(it) {
  if (!it) return false;
  if (it.kind === 'pick') { const p = g.piles[g.items[it.id].pile]; return !p || distTo(p.x, p.z) < 1.55; }
  if (it.kind === 'row') { const c = C.sectionCase(C.SERIES[it.s].sec); const a = C.approachPoint(c, 0.3); return distTo(a.x, a.z) < 1.5; }
  return false;
}
function runIntent(it) {
  if (it.kind === 'pick') { const p = g.piles[g.items[it.id].pile]; if (p) faceTo(p.x, p.z, 0.15); doPick(it.id); }
  else if (it.kind === 'row') {
    const c = C.sectionCase(C.SERIES[it.s].sec), n = C.caseNormal(c);
    faceTo(c.x + n.x * C.CASE.d / 2, c.z + n.z * C.CASE.d / 2, C.boardTop(C.rowOfSeries(it.s)) + 0.18);
    doShelve(it.s);
  }
}
// その ばしょの ほうへ ゆっくり ふりむく
function faceTo(x, z, y) {
  const dx = x - player.x, dz = z - player.z, d = Math.max(0.3, Math.hypot(dx, dz));
  player.look = { yaw: Math.atan2(-dx, -dz), pitch: Math.max(-1.0, Math.min(0.7, Math.atan2(y - C.EYE, d))) };
}
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
function updateLook(dt) {
  if (touch.id !== null && touch.drag) { player.look = null; player.manual = true; return; }
  const goal = player.look || (!player.manual && player.path.length && player.target ? { yaw: Math.atan2(-(player.path[0].x - player.x), -(player.path[0].z - player.z)), pitch: null } : null);
  if (!goal) return;
  const k = 1 - Math.exp(-dt * (player.look ? 6 : 2.5));
  player.yaw += angDiff(goal.yaw, player.yaw) * k;
  if (goal.pitch !== null) player.pitch += (goal.pitch - player.pitch) * k;
  if (player.look && Math.abs(angDiff(goal.yaw, player.yaw)) < 0.01 && Math.abs(goal.pitch - player.pitch) < 0.01) player.look = null;
}

function updatePlayer(dt) {
  if (!player.target) return;
  if (player.intent && intentReady(player.intent)) {
    const it = player.intent; player.target = null; player.intent = null; runIntent(it); return;
  }
  const way = player.path[0];
  const dx = way.x - player.x, dz = way.z - player.z, d = Math.hypot(dx, dz);
  if (d < 0.06) {
    player.path.shift();
    if (player.path.length) return;
    const it = player.intent; player.target = null; player.intent = null;
    if (it && intentReady(it)) runIntent(it);
    return;
  }
  const speed = 2.3, step = Math.min(d, speed * dt);
  const before = { x: player.x, z: player.z };
  const p = resolve({ x: player.x + dx / d * step, z: player.z + dz / d * step });
  player.x = p.x; player.z = p.z;
  const moved = Math.hypot(p.x - before.x, p.z - before.z);
  player.step += moved;
  if (player.step > 0.62) { player.step = 0; sfx.step(); }
  if (moved < step * 0.25) {
    player.stuck += dt;
    if (player.stuck > 0.35) {
      const it = player.intent; player.target = null; player.intent = null;
      if (it && intentReady(it)) runIntent(it);
      else if (it) toast('そこまで いけないみたい。まわりこんでみよう');
    }
  } else player.stuck = 0;
}

// ---------- タッチ ----------
const touch = { id: null, x: 0, y: 0, sx: 0, sy: 0, drag: false, t: 0 };
canvas.addEventListener('pointerdown', e => {
  if (!running || paused) return;
  if (touch.id !== null) return;
  try { canvas.setPointerCapture(e.pointerId); } catch {}
  Object.assign(touch, { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, drag: false, t: performance.now() });
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerId !== touch.id) return;
  const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
  touch.x = e.clientX; touch.y = e.clientY;
  if (!touch.drag && Math.hypot(e.clientX - touch.sx, e.clientY - touch.sy) > 12) touch.drag = true;
  if (touch.drag) {
    const k = 3.2 / Math.max(600, canvas.clientWidth);
    player.yaw += dx * k;
    player.pitch = Math.max(-1.15, Math.min(0.85, player.pitch + dy * k));
  }
});
const endTouch = e => {
  if (e.pointerId !== touch.id) return;
  const wasTap = !touch.drag && performance.now() - touch.t < 600;
  touch.id = null;
  if (wasTap && e.type === 'pointerup') tap(e.clientX, e.clientY);
};
canvas.addEventListener('pointerup', endTouch);
canvas.addEventListener('pointercancel', endTouch);

function tap(cx, cy) {
  unlockAudio();
  const r = canvas.getBoundingClientRect();
  const hit = view.hitTest((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  if (!hit) return;
  if (hit.kind === 'book') {
    const it = { kind: 'pick', id: hit.id };
    if (intentReady(it)) { player.target = null; runIntent(it); }
    else { const p = g.piles[g.items[hit.id].pile]; walkTo(p.x, p.z, it); }
  } else if (hit.kind === 'row') {
    const it = { kind: 'row', s: hit.s };
    if (intentReady(it)) { player.target = null; runIntent(it); }
    else { const a = C.approachPoint(C.sectionCase(C.SERIES[hit.s].sec), 1.25); walkTo(a.x, a.z, it); }
  } else if (hit.kind === 'floor') {
    walkTo(hit.point.x, hit.point.z);
    if (player.target) showMarker(player.target);
  }
}

// あるく ばしょの しるし
const marker = new T.Mesh(new T.RingGeometry(0.16, 0.22, 32), new T.MeshBasicMaterial({ color: '#ffe2a0', transparent: true, opacity: 0, depthWrite: false }));
marker.rotation.x = -Math.PI / 2; marker.position.y = 0.01;
view.scene.add(marker);
let markerT = 0;
function showMarker(p) { marker.position.x = p.x; marker.position.z = p.z; markerT = 1; }

// ---------- 本を ひろう・しまう ----------
function doPick(id) {
  const r = C.pick(g, id);
  if (r.ok) {
    view.fly(id, { dur: 0.38, arc: 0.25 });
    sfx.pick();
    if (!flags.picked) { flags.picked = true; setTimeout(() => toast('本の マークと なまえを みて、おなじ たなを さがそう', 4.5), 500); }
  } else if (r.why === 'full') {
    toast('もう もてないよ。たなに しまおう'); sfx.nope();
  }
  hud();
}

function doShelve(s) {
  const r = C.shelveRow(g, s);
  if (!r.placed.length) {
    sfx.nope();
    if (r.why === 'empty') toast('本を もっていないよ');
    else if (r.why === 'otherRow') toast('おしい！ おなじ たなの べつの れつ みたい');
    else toast('ここじゃ ないみたい。マークを よく みてね');
    return;
  }
  r.placed.forEach((id, i) => view.fly(id, { dur: 0.5, arc: 0.12, delay: i * 0.13 }));
  afterPlace(r, (r.placed.length - 1) * 0.13 + 0.5);
}

function afterPlace(r, wait) {
  hud(); save();
  setTimeout(() => {
    r.completed.forEach((s, i) => setTimeout(() => celebrate(s), i * 350));
    const extra = r.completed.length * 350;
    setTimeout(() => {
      r.unlocked.forEach(u => queueUnlock(u));
      if (C.isCleared(g)) setTimeout(finish, 900);
      hud();
    }, extra + 300);
  }, wait * 1000);
}

function celebrate(s) {
  view.rowFlash[s] = 1;
  const c = C.sectionCase(C.SERIES[s].sec), r = C.rowOfSeries(s);
  for (let k = 0; k < 6; k++) {
    const p = C.caseToWorld(c, (k / 5 - 0.5) * 1.0, C.boardTop(r) + 0.25, C.CASE.d / 2 + 0.05);
    view.burst(p, k % 2 ? '#ffd27a' : '#fff4d0', 14, 0.6, 1.4);
  }
  sfx.row();
  toast(`「${C.SERIES[s].title}」が そろった！`, 2.4, true);
}

view.onLand = it => {
  if (it.state !== 'shelf') return;
  sfx.place();
  view.burst(view.books[it.id].position, '#ffe7a8', 6, 0.25, 0.6);
};

// ---------- まほう ----------
const MAGIC_KEYS = ['yobiyose', 'michi', 'tondeke', 'tsumuji'];
const magicDef = key => C.UNLOCKS.find(u => u.key === key);

function castMagic(key) {
  if (!running || paused || (cd[key] || 0) > 0 || !C.has(g, key)) return;
  unlockAudio();
  const def = magicDef(key);
  if (key === 'yobiyose') {
    const free = C.capacity(g) - g.hand.length;
    if (free <= 0) { toast('もう もてないよ。たなに しまおう'); sfx.nope(); return; }
    const ids = C.nearestFloor(g, player.x, player.z, free);
    if (!ids.length) return;
    ids.forEach((it, i) => { C.pick(g, it.id); view.fly(it.id, { dur: 0.7, arc: 0.7, delay: i * 0.08, spin: 3 }); });
    sparkleAround(0.8, '#bfe3ff');
  } else if (key === 'michi') {
    if (!g.hand.length) { toast('本を もっているときに つかってね'); sfx.nope(); return; }
    magicTime.michi = def.dur;
  } else if (key === 'tondeke') {
    if (!g.hand.length) { toast('本を もっているときに つかってね'); sfx.nope(); return; }
    const r = C.shelveDirect(g, [...g.hand]);
    r.placed.forEach((id, i) => view.fly(id, { dur: 1.1, arc: 1.3, delay: i * 0.15, spin: 4 }));
    afterPlace(r, (r.placed.length - 1) * 0.15 + 1.1);
  } else if (key === 'tsumuji') {
    const ids = C.nearestFloor(g, player.x, player.z, 10).map(i => i.id);
    if (!ids.length) return;
    const r = C.shelveDirect(g, ids);
    r.placed.forEach((id, i) => view.fly(id, { dur: 1.6, arc: 2.4, delay: i * 0.12, spin: 8 }));
    sparkleAround(1.6, '#d9c2ff');
    afterPlace(r, (r.placed.length - 1) * 0.12 + 1.6);
  }
  cd[key] = def.cd;
  sfx.magic();
  hud();
}
function sparkleAround(rad, color) {
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2;
    view.burst({ x: player.x + Math.cos(a) * rad, y: 0.6, z: player.z + Math.sin(a) * rad }, color, 5, 0.3, 1.6);
  }
}

// ---------- がめんの 文字 ----------
const flags = { picked: false };
let toastTimer = 0;
function toast(text, sec = 2.6, big = false) {
  const el = $('toast');
  el.textContent = text; el.classList.toggle('big', big); el.hidden = false;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  toastTimer = sec;
}

function iconCanvas(type, size, color, bg) {
  const c = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = c.height = size * dpr; c.style.width = c.style.height = size + 'px';
  const x = c.getContext('2d'); x.scale(dpr, dpr);
  if (bg) { x.fillStyle = bg; x.beginPath(); x.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); x.fill(); }
  drawIcon(x, type, size / 2, size / 2, size * 0.32, color);
  return c;
}

let lastHand = '';
function hud() {
  if (!g) return;
  const done = C.rowsDone(g);
  $('left').textContent = `のこり ${C.leftCount(g)}さつ`;
  $('rows').textContent = `そろった れつ ${done} / ${C.SERIES.length}`;
  const nx = C.nextUnlock(g);
  $('next').textContent = nx ? `つぎの まほうまで あと ${nx.rows - done}れつ` : 'まほうは ぜんぶ つかえるよ！';
  $('cap').textContent = `もちもの ${g.hand.length} / ${C.capacity(g)}`;
  const key = g.hand.join(',') + '/' + C.capacity(g);
  if (key !== lastHand) {
    lastHand = key;
    const list = $('handList');
    list.replaceChildren(...g.hand.map(id => {
      const it = g.items[id], ser = C.SERIES[it.s], sec = C.SECTIONS[ser.sec];
      const li = document.createElement('li');
      li.style.setProperty('--book', ser.color);
      const ic = iconCanvas(sec.icon, 30, ser.color, '#f6e7c4');
      const t = document.createElement('span'); t.className = 'title'; t.textContent = ser.title;
      const v = document.createElement('b'); v.textContent = it.v + 1;
      li.append(ic, t, v);
      return li;
    }));
    $('handEmpty').hidden = g.hand.length > 0;
  }
  for (const k of MAGIC_KEYS) $('m-' + k).hidden = !C.has(g, k);
  $('magic').hidden = !MAGIC_KEYS.some(k => C.has(g, k));
}
function hudTick() {
  for (const k of MAGIC_KEYS) {
    const b = $('m-' + k); if (b.hidden) continue;
    const def = magicDef(k), left = cd[k] || 0;
    b.style.setProperty('--cd', left > 0 ? (left / def.cd * 360) + 'deg' : '0deg');
    b.classList.toggle('cool', left > 0);
    b.classList.toggle('on', k === 'michi' && magicTime.michi > 0);
  }
}
MAGIC_KEYS.forEach(k => $('m-' + k).addEventListener('click', () => castMagic(k)));

// まほうを おぼえた おしらせ
const unlockQueue = [];
function queueUnlock(u) { unlockQueue.push(u); if (unlockQueue.length === 1) showUnlock(); }
function showUnlock() {
  const u = unlockQueue[0]; if (!u) return;
  $('unlockName').textContent = u.name;
  $('unlockDesc').textContent = u.desc;
  $('unlockHow').textContent = u.cd ? 'みぎしたの ボタンで つかえるよ' : '';
  $('unlockScreen').hidden = false; paused = true;
  sfx.unlock();
}
$('unlockOk').addEventListener('click', () => {
  unlockQueue.shift(); $('unlockScreen').hidden = true; paused = false;
  if (unlockQueue.length) setTimeout(showUnlock, 250);
});

// ---------- はじまりと おわり ----------
function begin(game) {
  unlockAudio();
  g = game;
  Object.assign(player, { x: C.START.x, z: C.START.z, yaw: C.START.yaw, pitch: -0.12, target: null, path: [], look: null, intent: null });
  for (const k of Object.keys(cd)) cd[k] = 0;
  magicTime.michi = 0;
  view.setGame(g);
  lastHand = '';
  running = true; paused = false;
  for (const id of ['startScreen', 'clearScreen', 'menuScreen']) $(id).hidden = true;
  $('hud').hidden = false;
  hud(); save();
  toast(g.time > 0 ? 'おかえり！ つづきから はじめよう' : 'ゆかを タッチすると あるけるよ。がめんを なぞると まわりが みえるよ', 4.5);
}
function finish() {
  if (!running) return;
  running = false;
  sfx.clear();
  const m = Math.floor(g.time / 60), s = Math.floor(g.time % 60);
  $('stats').replaceChildren(...[`タイム ${m}:${String(s).padStart(2, '0')}`, `${C.TOTAL}さつ ぜんぶ`].map(t => { const el = document.createElement('span'); el.textContent = t; return el; }));
  $('clearScreen').hidden = false; $('hud').hidden = true;
  try { localStorage.removeItem(SAVE_KEY); } catch {}
}
function showStart() {
  const saved = loadSave();
  const can = saved && !C.isCleared(saved) && saved.items.some(i => i.state === 'shelf');
  $('continueBtn').hidden = !can;
  $('startBtn').textContent = can ? 'はじめから' : 'はじめる';
  $('startBtn').classList.toggle('secondary', !!can);
  $('startScreen').hidden = false;
}
const newGame = () => begin(C.createGame(Math.floor(Math.random() * 1e9)));
$('startBtn').addEventListener('click', newGame);
$('continueBtn').addEventListener('click', () => { const s = loadSave(); if (s) begin(s); else newGame(); });
$('againBtn').addEventListener('click', newGame);
$('menuBtn').addEventListener('click', () => { paused = true; $('menuScreen').hidden = false; });
$('resumeBtn').addEventListener('click', () => { paused = false; $('menuScreen').hidden = true; });
$('restartBtn').addEventListener('click', () => { if (confirm('さいしょから やりなおす？')) newGame(); });

// ---------- まいフレーム ----------
let last = performance.now(), saveT = 0, hudT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const t = now / 1000;
  if (running && !paused) {
    g.time += dt;
    updatePlayer(dt);
    updateLook(dt);
    for (const k of Object.keys(cd)) cd[k] = Math.max(0, cd[k] - dt);
    magicTime.michi = Math.max(0, magicTime.michi - dt);
    saveT += dt; if (saveT > 10) { saveT = 0; save(); }
    hudT += dt; if (hudT > 0.25) { hudT = 0; hud(); }
  }
  const cam = view.camera;
  const moving = !!player.target;
  view.bob = moving ? Math.sin(t * 9) * 0.006 : 0;
  cam.position.set(player.x, C.EYE + (moving ? Math.abs(Math.sin(t * 9)) * 0.02 : 0), player.z);
  cam.rotation.set(player.pitch, player.yaw, 0);
  if (g) {
    const guide = magicTime.michi > 0 ? new Set(g.hand.map(id => g.items[id].s)) : new Set();
    view.rowGlow = C.SERIES.map((_, s) => guide.has(s));
    view.beaconOn = C.SECTIONS.map((_, sec) => [...guide].some(s => C.SERIES[s].sec === sec));
    view.update(dt, t);
  }
  markerT = Math.max(0, markerT - dt * 1.2);
  marker.material.opacity = markerT * 0.8;
  marker.scale.setScalar(1 + (1 - markerT) * 0.6);
  if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) $('toast').classList.remove('show'); }
  hudTick();
  view.render();
  requestAnimationFrame(frame);
}

function resize() { view.resize(); }
window.addEventListener('resize', resize);
resize();
view.setGame(C.createGame(7));
g = null;
$('loading').hidden = true;
showStart();
requestAnimationFrame(frame);

// たしかめよう（Playwright から つかう）
window.__game = {
  get g() { return g; }, player, view, C, castMagic, tap, walkTo, doPick, doShelve,
  get paused() { return paused; }, unlockOk: () => $('unlockOk').click(),
  look(yaw, pitch) { player.yaw = yaw; player.pitch = pitch; },
  warp(x, z) { player.x = x; player.z = z; player.target = null; },
};
