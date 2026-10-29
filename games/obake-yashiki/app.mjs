// オバケやしきの おかたづけ — そうさ・まほう・がめんの 文字
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
const R = C.BODY, SPEED = 2.4;
const move = { sx: 0, sy: 0, vx: 0, vz: 0 };    // sx, sy: スティックの たおしぐあい（-1〜1、sy は まえが +）

// ぶつかったら おしもどす。かどでも はんたいがわへ とばないよう、いちばん ちかい 点から おす
function collide(p) {
  const piles = C.pileCenters(g);
  for (let pass = 0; pass < 2; pass++) {
    p.x = Math.max(C.WALK.x0, Math.min(C.WALK.x1, p.x));
    p.z = Math.max(C.WALK.z0, Math.min(C.WALK.z1, p.z));
    for (const o of OBS) {
      const cx = Math.max(o.x0, Math.min(o.x1, p.x)), cz = Math.max(o.z0, Math.min(o.z1, p.z));
      const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
      if (d >= R) continue;
      if (d > 1e-6) { p.x = cx + dx / d * R; p.z = cz + dz / d * R; continue; }
      const push = [[p.x - o.x0, -1, 0], [o.x1 - p.x, 1, 0], [p.z - o.z0, 0, -1], [o.z1 - p.z, 0, 1]].sort((a, b) => a[0] - b[0])[0];
      p.x += push[1] * (push[0] + R); p.z += push[2] * (push[0] + R);
    }
    for (const q of piles) {
      const dx = p.x - q.x, dz = p.z - q.z, d = Math.hypot(dx, dz), min = R + 0.3;
      if (d < min && d > 1e-6) { p.x = q.x + dx / d * min; p.z = q.z + dz / d * min; }
    }
  }
  return p;
}
function stopWalking() { player.path = []; player.target = null; player.intent = null; player.stuck = 0; }
function walkTo(x, z, intent = null) {
  const path = C.findPath(g, player, { x, z });
  if (!path || !path.length) { if (intent) toast('そこまで いけないみたい'); return; }
  player.path = path;
  player.target = path[path.length - 1];
  player.intent = intent;
  player.stuck = 0;
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

// その ばしょの ほうへ ふりむく（ばねの ように ゆっくり うごきだして、ゆっくり とまる）
const lookVel = { yaw: 0, pitch: 0 };
function faceTo(x, z, y) {
  const dx = x - player.x, dz = z - player.z, d = Math.max(0.3, Math.hypot(dx, dz));
  player.look = { yaw: player.yaw + angDiff(Math.atan2(-dx, -dz), player.yaw), pitch: Math.max(-1.0, Math.min(0.7, Math.atan2(y - C.EYE, d))) };
}
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
function updateLook(dt) {
  if (lookDragging()) { player.look = null; lookVel.yaw = lookVel.pitch = 0; return; }
  if (!player.look) return;
  const w = 5.5, cap = 2.2;
  for (const k of ['yaw', 'pitch']) {
    const err = player.look[k] - player[k];
    lookVel[k] += (w * w * err - 2 * w * lookVel[k]) * dt;
    lookVel[k] = Math.max(-cap, Math.min(cap, lookVel[k]));
    player[k] += lookVel[k] * dt;
  }
  if (Math.abs(player.look.yaw - player.yaw) < 0.003 && Math.abs(player.look.pitch - player.pitch) < 0.003 && Math.hypot(lookVel.yaw, lookVel.pitch) < 0.05) {
    player.look = null; lookVel.yaw = lookVel.pitch = 0;
  }
}

function updatePlayer(dt) {
  let wx = 0, wz = 0;
  const stick = Math.hypot(move.sx, move.sy);
  if (stick > 0) {
    if (player.target) stopWalking();
    player.look = null;
    const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw), rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
    wx = (rx * move.sx + fx * move.sy) * SPEED; wz = (rz * move.sx + fz * move.sy) * SPEED;
  } else if (player.target) {
    if (player.intent && intentReady(player.intent)) { const it = player.intent; stopWalking(); runIntent(it); return; }
    // まがりかどは てまえで つぎへ（かくっと まがらない）
    while (player.path.length > 1 && distTo(player.path[0].x, player.path[0].z) < 0.35) player.path.shift();
    const way = player.path[0], d = distTo(way.x, way.z);
    if (player.path.length === 1 && d < 0.05) {
      const it = player.intent; stopWalking();
      if (it && intentReady(it)) runIntent(it);
    } else {
      const sp = player.path.length === 1 ? SPEED * Math.min(1, 0.25 + d / 0.5) : SPEED;
      wx = (way.x - player.x) / d * sp; wz = (way.z - player.z) / d * sp;
    }
  }
  const k = 1 - Math.exp(-dt * 9);
  move.vx += (wx - move.vx) * k; move.vz += (wz - move.vz) * k;
  if (Math.hypot(move.vx, move.vz) < 0.01) { move.vx = move.vz = 0; return; }
  const before = { x: player.x, z: player.z };
  const p = collide({ x: player.x + move.vx * dt, z: player.z + move.vz * dt });
  player.x = p.x; player.z = p.z;
  const moved = Math.hypot(p.x - before.x, p.z - before.z);
  // かべに そって すべった ぶんだけの はやさに する
  if (dt > 0) { move.vx = (p.x - before.x) / dt; move.vz = (p.z - before.z) / dt; }
  player.step += moved;
  if (player.step > 0.62) { player.step = 0; sfx.step(); }
  if (player.target && moved < Math.hypot(wx, wz) * dt * 0.25) {
    player.stuck += dt;
    if (player.stuck > 0.6) {
      const it = player.intent; stopWalking();
      if (it && intentReady(it)) runIntent(it);
      else if (it) toast('そこまで いけないみたい。まわりこんでみよう');
    }
  } else player.stuck = 0;
}
const isMoving = () => Math.hypot(move.vx, move.vz) > 0.2;

// ---------- タッチ（ひだりしたで あるく、ほかの ばしょで みまわす・タップ） ----------
const pointers = new Map();
const stickEl = $('stick'), knob = $('knob'), STICK_R = 56;
const lookDragging = () => [...pointers.values()].some(p => p.kind === 'look' && p.moved);
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  if (!running || paused) return;
  unlockAudio();
  try { canvas.setPointerCapture(e.pointerId); } catch {}
  const r = canvas.getBoundingClientRect();
  const inStick = e.clientX - r.left < r.width * 0.34 && e.clientY - r.top > r.height * 0.45;
  if (inStick && ![...pointers.values()].some(p => p.kind === 'stick')) {
    pointers.set(e.pointerId, { kind: 'stick', ox: e.clientX, oy: e.clientY });
    stickEl.style.left = (e.clientX - r.left) + 'px';
    stickEl.style.top = (e.clientY - r.top) + 'px';
    stickEl.classList.add('active');
    return;
  }
  pointers.set(e.pointerId, { kind: 'look', sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, t0: performance.now(), moved: false });
});
canvas.addEventListener('pointermove', e => {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  if (p.kind === 'stick') {
    let dx = e.clientX - p.ox, dy = e.clientY - p.oy;
    const d = Math.hypot(dx, dy);
    if (d > STICK_R) { dx = dx / d * STICK_R; dy = dy / d * STICK_R; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    const nx = dx / STICK_R, ny = -dy / STICK_R, mag = Math.hypot(nx, ny), dead = 0.15;
    const k = mag < dead ? 0 : (mag - dead) / (1 - dead) / mag;
    move.sx = nx * k; move.sy = ny * k;
    return;
  }
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (!p.moved && Math.hypot(p.x - p.sx, p.y - p.sy) > 12) p.moved = true;
  if (p.moved) {
    const k = e.pointerType === 'mouse' ? 0.005 : 0.0062;
    player.yaw -= dx * k;
    player.pitch = Math.max(-1.15, Math.min(0.85, player.pitch - dy * k));
  }
});
const endPointer = e => {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  pointers.delete(e.pointerId);
  if (p.kind === 'stick') {
    move.sx = move.sy = 0;
    knob.style.transform = '';
    stickEl.style.left = stickEl.style.top = '';
    stickEl.classList.remove('active');
    return;
  }
  if (e.type === 'pointerup' && !p.moved && performance.now() - p.t0 < 600) tap(p.x, p.y);
};
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
function releaseAll() {
  pointers.clear(); move.sx = move.sy = 0;
  knob.style.transform = ''; stickEl.style.left = stickEl.style.top = ''; stickEl.classList.remove('active');
}

// 本や たなを タッチすると、とおくても そこまで あるいて いく
function tap(cx, cy) {
  const r = canvas.getBoundingClientRect();
  const hit = view.hitTest((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  if (!hit) return;
  if (hit.kind === 'book') {
    const it = { kind: 'pick', id: hit.id };
    if (intentReady(it)) { stopWalking(); runIntent(it); }
    else { const p = g.piles[g.items[hit.id].pile]; walkTo(p.x, p.z, it); }
  } else if (hit.kind === 'row') {
    const it = { kind: 'row', s: hit.s };
    if (intentReady(it)) { stopWalking(); runIntent(it); }
    else { const a = C.approachPoint(C.sectionCase(C.SERIES[hit.s].sec), 1.25); walkTo(a.x, a.z, it); }
  }
}

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
  $('unlockScreen').hidden = false; paused = true; releaseAll();
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
  releaseAll(); move.vx = move.vz = 0;
  for (const k of Object.keys(cd)) cd[k] = 0;
  magicTime.michi = 0;
  view.setGame(g);
  lastHand = '';
  running = true; paused = false;
  for (const id of ['startScreen', 'clearScreen', 'menuScreen']) $(id).hidden = true;
  $('hud').hidden = false;
  hud(); save();
  toast(g.time > 0 ? 'おかえり！ つづきから はじめよう' : 'ひだりしたの まるで あるくよ。みぎがわを なぞると まわりが みえるよ', 4.5);
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
$('menuBtn').addEventListener('click', () => { paused = true; releaseAll(); $('menuScreen').hidden = false; });
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
  const moving = running && isMoving();
  view.bob = moving ? Math.sin(t * 9) * 0.005 : 0;
  cam.position.set(player.x, C.EYE + (moving ? Math.abs(Math.sin(t * 9)) * 0.012 : 0), player.z);
  cam.rotation.set(player.pitch, player.yaw, 0);
  if (g) {
    const guide = magicTime.michi > 0 ? new Set(g.hand.map(id => g.items[id].s)) : new Set();
    view.rowGlow = C.SERIES.map((_, s) => guide.has(s));
    view.beaconOn = C.SECTIONS.map((_, sec) => [...guide].some(s => C.SERIES[s].sec === sec));
    view.update(dt, t);
  }
  if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) $('toast').classList.remove('show'); }
  hudTick();
  view.resize();
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
  get g() { return g; }, player, view, C, castMagic, tap, walkTo, doPick, doShelve, move,
  get paused() { return paused; }, unlockOk: () => $('unlockOk').click(),
  look(yaw, pitch) { player.yaw = yaw; player.pitch = pitch; },
  warp(x, z) { player.x = x; player.z = z; player.target = null; },
};
