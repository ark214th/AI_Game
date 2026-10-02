import { SPECIES, FOODS, TOYS, ACCS, SPECIALS, ITEMS, WALLS, FLOORS, NEEDS, SPOTS, TAGS, ROOM, MAX_ROOMS, SUITE_HEARTS } from './data.mjs';
import * as C from './core.mjs';
import * as D from './draw.mjs';
import { Sound } from './audio.mjs';

const $ = id => document.getElementById(id);
const DEBUG = new URLSearchParams(location.search).has('debug');
const STORE = 'fushigi-pet-hotel-v1';

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
}
addEventListener('resize', resize);
resize();
const toV = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / S, y: (e.clientY - r.top) / S }; };
const domCenter = el => { const r = el.getBoundingClientRect(); return { x: (r.left + r.width / 2) / S, y: (r.top + r.height / 2) / S }; };
const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

// ---------- じょうたい ----------
let scene = 'title';           // title / hotel / room / bath / night / morning
let T = 0;
let curRoom = -1, decor = false, tab = 'item';
let night = 0, nightTarget = 0;
let actors = [];               // きょうの お客さん（save.today.guests と おなじ ならび）
let leavers = [];              // チェックアウトで かえる ところ
let parts = [];
let timers = [];
let shownHearts = save.hearts;
let care = null;               // へやの 中の おせわ：food / play / sleep
let foodDrag = null, eating = null, petting = null, drag = null, bath = null;
let handHint = 0, tipUntil = 0, tipText = '', hintIdx = 0;
let camX = 0, camTarget = null, down = null, guestDrag = null, selected = -1;
let building = null, pendingBuild = new Set();
let idleAt = 6;
const punyu = { sq: 0, v: 0 };
let speeches = [];
let pointerId = null;

const later = (sec, fn) => timers.push({ at: T + sec, fn });
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const guests = () => save.today?.guests || [];
const R_BASE = 105;
const sizeOf = species => (SPECIES[species]?.big ? 1.55 : 1);
const rOf = (a, species) => R_BASE * sizeOf(species) * D.depth(a.y) * a.pop;
const LOBBY_Y = 560, DOOR_X = 150;

function toast(str, sec = 1.8) {
  const t = $('toast');
  t.textContent = str; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), sec * 1000);
}
function firstTip(key, str) { if (save.tips[key]) return; save.tips[key] = true; persist(); later(0.3, () => toast(str, 2.6)); }

// ---------- おきゃくさん（うごき）----------
function genDirt(n = 5) { return Array.from({ length: n }, (_, i) => ({ x: rand(-0.6, 0.6), y: -0.62 + i * 0.18 + rand(-0.05, 0.05), a: 1 })); }
function makeActor(g, arriving = false) {
  const baseY = g.species === 'fuwari' ? 500 : 525;
  return {
    x: arriving ? DOOR_X : rand(320, 680), tx: 500, y: g.room < 0 ? LOBBY_Y : baseY, ty: baseY, baseY, lift: 0, liftT: 0,
    alpha: arriving ? 0 : 1, sq: 0, v: 0, jumpT: -9, spin: 0,
    mood: 'normal', moodUntil: 0, say: '', sayUntil: 0, look: 0, lookUntil: 0, shake: 0, puff: 1, puffT: 1, mouth: 0,
    needAt: T + 1.5, lastNeed: null, dirt: null, pet: 0, favD: 0, allD: 0, favRub: 0, spotSaid: false, wanderAt: 0, pop: 1,
    asleep: C.isHappy(g), thanked: C.isHappy(g), lastComment: -99, towel: 0,
    fluff: 0, flame: 0.35, bloom: 0.3, shine: 0.3, rollT: -9, rollDir: 1, cream: 0,
  };
}
function syncActors() {
  const gs = guests();
  while (actors.length < gs.length) actors.push(makeActor(gs[actors.length], true));
  actors.length = gs.length;
}
function resetActors() { actors = guests().map(g => makeActor(g)); }
const poke = (a, v = 0.25) => { a.v += v * 7; };
const jump = a => { a.jumpT = T; poke(a, -0.2); };
const setMood = (a, m, sec = 1.5) => { a.mood = m; a.moodUntil = T + sec; };
const say = (a, str, sec = 2.4) => { a.say = str; a.sayUntil = T + sec; };
const rollAngle = a => { const u = (T - a.rollT) / 0.6; return u >= 0 && u < 1 ? a.rollDir * u * Math.PI * 2 : 0; };
const jumpOff = a => { const u = (T - a.jumpT) / 0.55; return u >= 0 && u <= 1 ? Math.sin(u * Math.PI) * 70 : 0; };
function moodOf(gi) {
  const a = actors[gi], g = guests()[gi];
  if (T < a.moodUntil) return a.mood;
  if (a.asleep || night > 0.5) return 'sleep';
  return C.isHappy(g) ? 'happy' : 'normal';
}
const needIcon = (g, need) => (need === 'special' ? SPECIALS[SPECIES[g.species].special]?.icon || '💫' : NEEDS[need].icon);
const needSay = (g, need) => (need === 'special' ? SPECIALS[SPECIES[g.species].special]?.need || '' : NEEDS[need].say);
const showNeed = gi => { const g = guests()[gi], a = actors[gi]; return g && a && night < 0.3 && !a.asleep && T >= a.needAt ? C.needOf(g) : null; };
const sleepCareOn = gi => care?.type === 'sleep' && care.gi === gi;
const stOf = gi => {
  const a = actors[gi], g = guests()[gi];
  return {
    t: T + gi * 1.7, sq: a.sq, mood: moodOf(gi), look: a.look, mouth: a.mouth, alpha: a.alpha,
    dirt: C.needOf(g) === 'bath' ? a.dirt : null, puff: a.puff, shake: a.shake,
    blanket: a.asleep || (sleepCareOn(gi) && Math.abs(a.x - a.tx) < 8), towel: T < a.towel, suitcase: g.room < 0,
    acc: g.acc, fluff: g.log?.special ? 1 : a.fluff, flame: g.log?.special ? 1.2 : a.flame, bloom: g.log?.special ? 1 : a.bloom, shine: g.log?.special ? 1 : a.shine, cream: g.log?.special ? 5 : a.cream,
    rot: rollAngle(a),
  };
}

function moveActor(a, dt, speed) {
  const d = a.tx - a.x;
  if (Math.abs(d) > 3) {
    a.x += Math.sign(d) * Math.min(Math.abs(d), speed * dt);
    if (T > a.lookUntil) a.look = Math.sign(d) * 0.6;
    if (Math.sin(T * 10) > 0.93) poke(a, 0.04);
  }
  a.y += (a.ty - a.y) * Math.min(1, dt * 5);
  a.lift += (a.liftT - a.lift) * Math.min(1, dt * 5);
}

function updateActors(dt) {
  const gs = guests();
  let waitIdx = 0;
  gs.forEach((g, gi) => {
    const a = actors[gi]; if (!a) return;
    a.v += (-120 * a.sq - 9 * a.v) * dt; a.sq = clamp(a.sq + a.v * dt, -0.3, 0.3);
    a.shake = Math.max(0, a.shake - dt * 1.2);
    a.puff += (a.puffT - a.puff) * Math.min(1, dt * 4);
    a.pop = Math.min(1, a.pop + dt * 2.5);
    a.alpha = Math.min(1, a.alpha + dt * 2);
    if (T > a.lookUntil) a.look *= 0.9;
    if (!(foodDrag && C.guestAt(save, curRoom) === gi)) a.mouth *= 0.85;
    if (C.needOf(g) === 'bath' && !a.dirt) a.dirt = genDirt(SPECIES[g.species].big ? 7 : 5);
    // ふきだしが でたら ひとこと
    const need = showNeed(gi);
    if (need && need !== a.lastNeed) { a.lastNeed = need; if (T > a.sayUntil) say(a, needSay(g, need), 2.2); }
    if (g.room < 0) {
      a.tx = 330 + waitIdx++ * 130; a.ty = LOBBY_Y; a.liftT = 0;
      moveActor(a, dt, 150);
      return;
    }
    const room = save.rooms[g.room], bed = C.bedOf(room);
    const inView = (scene === 'room' || scene === 'bath') && curRoom === g.room && !decor;
    a.ty = a.baseY; a.liftT = 0;
    let speed = 90;
    if (a.asleep || sleepCareOn(gi)) {
      if (bed) { a.tx = bed.x + 20; a.ty = bed.y + 3; a.liftT = 58; } else a.tx = 500;
      speed = 160;
    } else if (care?.type === 'play' && care.gi === gi && care.toy) { a.tx = care.targetX ?? 560; speed = 330; }
    else if (inView) a.tx = 560;
    else if (T > a.wanderAt && night < 0.5) { a.tx = rand(260, 740); a.wanderAt = T + rand(3, 7); }
    moveActor(a, dt, speed);
  });
  for (const l of leavers) {
    const a = l.a;
    a.v += (-120 * a.sq - 9 * a.v) * dt; a.sq = clamp(a.sq + a.v * dt, -0.3, 0.3);
    moveActor(a, dt, 150);
    if (a.x <= DOOR_X + 20) a.alpha = Math.max(0, a.alpha - dt * 2.5);
  }
  leavers = leavers.filter(l => l.a.alpha > 0);
  punyu.v += (-120 * punyu.sq - 9 * punyu.v) * dt; punyu.sq = clamp(punyu.sq + punyu.v * dt, -0.3, 0.3);
}

// ---------- パーティクル ----------
function heartTarget() { return domCenter($('heartPill')); }
function burstHearts(x, y, n) {
  for (let i = 0; i < n; i++) parts.push({ k: 'heart', x, y, vx: rand(-160, 160), vy: rand(-420, -260), t: -i * 0.12, life: 9 });
}
function sparkles(x, y, n = 8, spread = 80) {
  for (let i = 0; i < n; i++) parts.push({ k: 'spark', x: x + rand(-spread, spread), y: y + rand(-spread, spread), vx: rand(-40, 40), vy: rand(-90, -20), t: 0, life: rand(0.5, 0.9), s: rand(10, 20) });
}
function confetti(x, y) {
  const cols = ['#ff6f91', '#ffd84a', '#5cc8ff', '#7ee081', '#b58cff'];
  for (let i = 0; i < 30; i++) parts.push({ k: 'conf', x, y, vx: rand(-380, 380), vy: rand(-700, -300), t: 0, life: rand(1.2, 1.8), s: rand(8, 14), c: cols[i % 5], rot: rand(0, 6) });
}
function notes(x, y, n = 3) { for (let i = 0; i < n; i++) parts.push({ k: 'note', x: x + rand(-40, 40), y, vx: rand(-30, 30), vy: -80, t: -i * 0.15, life: 1.2, s: 40 }); }
function updateParts(dt) {
  const tg = heartTarget();
  for (const p of parts) {
    p.t += dt;
    if (p.t < 0) continue;
    if (p.k === 'heart') {
      if (p.t < 0.45) { p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
      else {
        const k = Math.min(1, dt * 6 + (p.t - 0.45) * dt * 20);
        p.x += (tg.x - p.x) * k; p.y += (tg.y - p.y) * k;
        if (Math.hypot(tg.x - p.x, tg.y - p.y) < 20) {
          p.dead = true; shownHearts = Math.min(save.hearts, shownHearts + 1); sound.play('heart', 0.05);
          const pill = $('heartPill'); pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump');
        }
      }
    } else {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.k === 'drop' || p.k === 'conf' || p.k === 'crumb') p.vy += (p.k === 'conf' ? 900 : 1400) * dt;
      if (p.k === 'steam') p.vx += Math.sin(T * 3 + p.s) * 20 * dt;
    }
    if (p.t > p.life) p.dead = true;
  }
  parts = parts.filter(p => !p.dead);
  if (!parts.some(p => p.k === 'heart')) shownHearts = save.hearts;
}
function drawParts() {
  for (const p of parts) {
    if (p.t < 0) continue;
    const u = p.t / p.life;
    if (p.k === 'heart') D.drawHeart(ctx, p.x, p.y, 44);
    else if (p.k === 'spark') { ctx.globalAlpha = 1 - u; ctx.fillStyle = '#ffe45c'; D.star(ctx, p.x, p.y, p.s * (1 - u * 0.5)); ctx.fill(); ctx.globalAlpha = 1; }
    else if (p.k === 'note') { ctx.globalAlpha = 1 - u; D.text(ctx, '♪', p.x, p.y, p.s, { color: '#ff6f91', stroke: '#fff', sw: 6 }); ctx.globalAlpha = 1; }
    else if (p.k === 'zz') { ctx.globalAlpha = Math.sin(u * Math.PI); D.text(ctx, 'Z', p.x, p.y, p.s, { color: '#fff', stroke: '#7a6ee0', sw: 5 }); ctx.globalAlpha = 1; }
    else if (p.k === 'drop') { ctx.fillStyle = 'rgba(120,200,255,.85)'; D.ell(ctx, p.x, p.y, 5, 11); ctx.fill(); }
    else if (p.k === 'pop') { ctx.globalAlpha = 1 - u; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; D.circ(ctx, p.x, p.y, p.s * (1 + u)); ctx.stroke(); ctx.globalAlpha = 1; }
    else if (p.k === 'conf') { ctx.save(); ctx.globalAlpha = 1 - u * u; ctx.translate(p.x, p.y); ctx.rotate(p.rot + p.t * 8); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); }
    else if (p.k === 'crumb') { ctx.fillStyle = p.c || '#c98b55'; D.circ(ctx, p.x, p.y, p.s); ctx.fill(); }
    else if (p.k === 'steam') { ctx.globalAlpha = 0.35 * Math.sin(u * Math.PI); ctx.fillStyle = '#fff'; D.circ(ctx, p.x, p.y, 20 + u * 40); ctx.fill(); ctx.globalAlpha = 1; }
  }
}

// ---------- ホテルの ならびかた（よこに ひろがる。2かいだて）----------
const SLOTS = [[1, 0], [-1, 0], [0, 1], [1, 1], [-1, 1], [2, 0], [2, 1], [-2, 0], [-2, 1]];
function hotelLayout() {
  const regular = C.regularCount(save), si = C.suiteIdx(save);
  const cells = [{ kind: 'lobby', col: 0, row: 0 }];
  save.rooms.forEach((r, i) => { if (!r.suite) { const k = C.regularOrder(save, i); cells.push({ kind: 'room', idx: i, col: SLOTS[k][0], row: SLOTS[k][1] }); } });
  if (regular < MAX_ROOMS) cells.push({ kind: 'locked', col: SLOTS[regular][0], row: SLOTS[regular][1] });
  const minC = Math.min(...cells.map(c => c.col));
  let maxC = Math.max(...cells.map(c => c.col));
  const floors = 2;
  for (let col = minC; col <= maxC; col++) for (let row = 0; row < floors; row++) if (!cells.some(c => c.col === col && c.row === row)) cells.push({ kind: 'facade', col, row });
  // スイートルーム（2かい ぶん × 2へや ぶんの おおきな へや）。へやが 4つに なったら こうじの ばしょが でる
  const suiteCol = maxC + 1;
  if (si >= 0) cells.push({ kind: 'room', idx: si, suite: true, col: suiteCol, row: 0, span: 2 });
  else if (regular >= 4) cells.push({ kind: 'suiteLocked', col: suiteCol, row: 0, span: 2 });
  if (si >= 0 || regular >= 4) maxC = suiteCol + 1;
  const top = 100, roofH = 80, groundH = 66, pad = 14;
  const availH = H - top - roofH - groundH - 10;
  let ch = Math.min(290, (availH - pad * 3) / 2), cw = ch * 1.6;
  const fitW = (W - 40 - pad * 4) / 3;
  if (cw > fitW) { cw = Math.max(fitW, 300); ch = cw / 1.6; }
  const cols = maxC - minC + 1;
  const bw = cols * (cw + pad) + pad, bh = floors * (ch + pad) + pad;
  const maxPan = Math.max(0, (bw - (W - 40)) / 2);
  camX = clamp(camX, -maxPan, maxPan);
  const bx = (W - bw) / 2 - camX, groundY = H - groundH, by = groundY - bh;
  for (const c of cells) {
    const n = c.span || 1;
    c.rect = { x: bx + pad + (c.col - minC) * (cw + pad), y: by + bh - pad - (c.row + n) * ch - (c.row + n - 1) * pad, w: n * cw + (n - 1) * pad, h: n * ch + (n - 1) * pad };
  }
  const lobby = cells[0].rect;
  return { bx, by, bw, bh, pad, roofH, floors, ch, cw, cells, groundY, maxPan, signX: lobby.x + lobby.w / 2, minC };
}
const cellOf = (L, idx) => L.cells.find(c => c.kind === 'room' && c.idx === idx);
function focusCell(idx) {
  const L = hotelLayout(), c = idx < 0 ? L.cells[0] : cellOf(L, idx);
  if (!c) return;
  camTarget = camX + (c.rect.x + c.rect.w / 2 - W / 2);
}

function roomRect() {
  const top = H * 0.12 + 8;
  let availW, availH;
  let left = 20;
  if (decor) { availH = H - H * 0.25 - top - 14; availW = W - 40; }
  else if (W / H < 1.6) { availH = H - top - (H * 0.125 + 34); availW = W - 40; }
  else { availW = W - (H * 0.3 + 60) - 30; availH = H - top - 16; left = 30; }
  const w = Math.min(availW, availH * 1.6), h = w / 1.6;
  return { x: left + (availW - w) / 2, y: top + (availH - h) / 2, w, h };
}

// へやの ざひょう → がめんの ざひょう
function screenOf(a, species, rect, toff = 0) {
  const s = rect.w / ROOM.w;
  const r = rOf(a, species) * s;
  const x = rect.x + a.x * s, y = rect.y + (a.y - a.lift - jumpOff(a)) * s;
  const bc = D.bodyCenter(species, x, y, r, { t: T + toff, sq: a.sq, puff: a.puff });
  return { x, y, r, bc, head: { x: bc.x, y: bc.y - r * a.puff - 8 } };
}
const actorScreen = (gi, rect) => screenOf(actors[gi], guests()[gi].species, rect, gi * 1.7);
function guestScreenAnywhere(gi) {
  const g = guests()[gi];
  if (scene === 'room' && curRoom === g.room && g.room >= 0) return actorScreen(gi, roomRect());
  const L = hotelLayout(), c = g.room < 0 ? L.cells[0] : cellOf(L, g.room);
  return actorScreen(gi, c.rect);
}

// ---------- かく ----------
function creatureExtra(a, species, toff, st) {
  return { y: a.y, draw: c => D.drawCreature(c, species, a.x, a.y - a.lift - jumpOff(a), rOf(a, species), st) };
}

function drawRoomCell(idx, rect, big) {
  const gi = C.guestAt(save, idx);
  const extras = [];
  const a = gi >= 0 ? actors[gi] : null, g = gi >= 0 ? guests()[gi] : null;
  if (a && !(guestDrag && guestDrag.gi === gi)) extras.push(creatureExtra(a, g.species, gi * 1.7, stOf(gi)));
  if (big && care?.type === 'play' && care.toy === 'ball' && care.ball.state !== 'carried') {
    const b = care.ball;
    extras.push({ y: Math.max(b.floorY ?? 600, 400) + 1, draw: c => { c.fillStyle = 'rgba(58,42,74,.15)'; D.ell(c, b.x, 606, 26, 7); c.fill(); D.drawBall(c, b.x, b.y, 30, b.rot); } });
  }
  D.drawRoom(ctx, save.rooms[idx], rect, {
    t: T, night: night > 0.5, extras, hide: drag?.item,
    after: c => {
      if (!a) return;
      const r = rOf(a, g.species);
      const topY = a.y - a.lift - jumpOff(a) - D.hoverOf(g.species, r, T + gi * 1.7) - r * 2 * a.puff;
      if (big && care?.type === 'play' && care.toy === 'ball' && care.ball.state === 'carried') D.drawBall(c, a.x, topY - 10, 30);
      if (big && care?.type === 'play' && care.toy === 'bubble') for (const b of care.bubbles) D.drawBubble(c, b.x, b.y, b.r);
      const need = showNeed(gi);
      if (need && scene !== 'bath' && !(big && T < a.sayUntil) && !care) {
        const bx = a.x + r * 0.95, by = topY + 40, size = big ? 100 : 140;
        D.drawNeedBubble(c, bx, by, needIcon(g, need), size, Math.max(0, Math.sin(T * 4)));
        if (need === 'pet' && a.pet > 0) {
          c.strokeStyle = '#ff6f91'; c.lineWidth = size * 0.09; c.lineCap = 'round';
          c.beginPath(); c.arc(bx, by - size * 0.62, size * 0.55, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, a.pet)); c.stroke();
        }
      } else if (C.isHappy(g) && !a.asleep && night < 0.5 && Math.sin(T * 2 + gi) > 0.2) {
        D.text(c, '♪', a.x + r * 0.9, topY + 10 - Math.sin(T * 2 + gi) * 14, big ? 48 : 70, { color: '#ff6f91', stroke: '#fff', sw: 8 });
      }
      if (a.asleep && !big) D.text(c, 'Zz', a.x + r * 0.9, topY + 20 + Math.sin(T * 2) * 10, 80, { color: '#fff', stroke: '#7a6ee0', sw: 10 });
    },
  });
  ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = big ? 8 : 4; D.rr(ctx, rect.x, rect.y, rect.w, rect.h, big ? 16 : 8); ctx.stroke();
  if (a) {
    const p = actorScreen(gi, rect);
    if (a.say && T < a.sayUntil) speeches.push({ x: p.head.x, y: p.head.y, text: a.say, size: big ? 34 : 26 });
    if ((a.asleep || night > 0.5) && Math.random() < (big ? 0.03 : 0.012)) parts.push({ k: 'zz', x: p.head.x + p.r * 0.5, y: p.head.y, vx: 20, vy: -30, t: 0, life: 2, s: big ? 40 : 24 });
  }
}

function drawLobbyCell(cell) {
  const rect = cell.rect, s = rect.w / ROOM.w;
  const extras = [{ y: 420, draw: c => D.drawCreature(c, 'punyu', 530, 420, 88, { t: T, sq: punyu.sq, mood: night > 0.5 ? 'sleep' : 'happy' }) }];
  guests().forEach((g, gi) => {
    if (g.room >= 0 || (guestDrag && guestDrag.gi === gi)) return;
    const st = stOf(gi);
    extras.push(creatureExtra(actors[gi], g.species, gi * 1.7, st));
  });
  for (const l of leavers) extras.push(creatureExtra(l.a, l.species, 0, { t: T, sq: l.a.sq, mood: 'happy', alpha: l.a.alpha, suitcase: true, look: -0.6 }));
  D.drawLobby(ctx, rect, {
    night: night > 0.5, extras,
    after: c => { if (selected >= 0 && guests()[selected]?.room < 0) { const a = actors[selected]; c.strokeStyle = '#ffd84a'; c.lineWidth = 10; D.ell(c, a.x, a.y + 4, 120, 30); c.stroke(); } },
  });
  ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 4; D.rr(ctx, rect.x, rect.y, rect.w, rect.h, 8); ctx.stroke();
  // おきゃくさんの おねがい / さようなら
  guests().forEach((g, gi) => {
    if (g.room >= 0 || (guestDrag && guestDrag.gi === gi)) return;
    const a = actors[gi], p = actorScreen(gi, rect);
    const text = a.say && T < a.sayUntil ? a.say : Math.abs(a.x - a.tx) < 10 ? TAGS[g.wish].wish : '';
    if (text) speeches.push({ x: p.head.x, y: p.head.y, text, size: 24 });
    if (!guestDrag && (save.tips.checkins || 0) < 3 && Math.abs(a.x - a.tx) < 10) {
      const L = hotelLayout(), free = C.freeRooms(save, g.species).map(i => cellOf(L, i)).filter(Boolean)[0];
      if (free) {
        const u = (T % 2.2) / 1.6, e = Math.min(1, u);
        const hx = p.bc.x + (free.rect.x + free.rect.w / 2 - p.bc.x) * e, hy = p.bc.y + (free.rect.y + free.rect.h / 2 - p.bc.y) * e;
        if (u < 1.2) { ctx.globalAlpha = 0.85; D.emoji(ctx, '👆', hx + 20, hy + 40, 64); ctx.globalAlpha = 1; }
      }
    }
  });
  for (const l of leavers) if (l.a.say && T < l.a.sayUntil) { const p = screenOf(l.a, l.species, rect); speeches.push({ x: p.head.x, y: p.head.y, text: l.a.say, size: 24 }); }
  const tip = currentTip();
  if (tip && scene === 'hotel' && C.waitingGuest(save) < 0) speeches.push({ x: rect.x + 530 * s, y: rect.y + 240 * s, text: tip, size: 26 });
}

function drawHotel() {
  const L = hotelLayout();
  D.drawSky(ctx, W, H, night, T);
  D.drawGround(ctx, W, H, L.groundY - 4, night);
  D.drawHotelShell(ctx, L, night);
  for (const cell of L.cells) {
    if (cell.kind === 'lobby') drawLobbyCell(cell);
    else if (cell.kind === 'room') {
      drawRoomCell(cell.idx, cell.rect, false);
      if (pendingBuild.has(cell.idx)) D.drawScaffold(ctx, cell.rect, 0, T);
      else if (building?.idx === cell.idx) D.drawScaffold(ctx, cell.rect, clamp((T - building.t0) / 2, 0, 1), T);
      if (guestDrag) {
        const free = C.guestAt(save, cell.idx) < 0 && C.roomFits(save, guests()[guestDrag.gi].species, cell.idx);
        ctx.strokeStyle = free ? (inRect(guestDrag.p, cell.rect) ? '#ffd84a' : 'rgba(255,216,74,.7)') : 'rgba(90,61,85,.25)';
        ctx.lineWidth = inRect(guestDrag.p, cell.rect) && free ? 12 : 6; D.rr(ctx, cell.rect.x, cell.rect.y, cell.rect.w, cell.rect.h, 10); ctx.stroke();
      }
    } else if (cell.kind === 'locked') D.drawLockedCell(ctx, cell.rect, C.nextRoomHearts(save), save.hearts);
    else if (cell.kind === 'suiteLocked') D.drawLockedCell(ctx, cell.rect, SUITE_HEARTS, save.hearts, 'スイートルーム');
    else D.drawFacade(ctx, cell.rect, night);
    if (cell.suite && cell.kind === 'room') { const k = cell.rect.w / 700; ctx.fillStyle = 'rgba(255,255,255,.9)'; D.rr(ctx, cell.rect.x + cell.rect.w / 2 - 110 * k, cell.rect.y + 10 * k, 220 * k, 40 * k, 20 * k); ctx.fill(); D.text(ctx, '👑 スイート', cell.rect.x + cell.rect.w / 2, cell.rect.y + 30 * k, 24 * k, { color: '#b58cff' }); }
  }
  if (guestDrag) {
    const g = guests()[guestDrag.gi], a = actors[guestDrag.gi];
    D.drawCreature(ctx, g.species, guestDrag.p.x, guestDrag.p.y + 60, 64 * sizeOf(g.species), { t: T, mood: 'happy', suitcase: true, sq: a.sq });
  }
  // ひろい ホテルは よこに うごかせる
  if (L.maxPan > 0 && scene === 'hotel' && guestDrag) {
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    if (camX > -L.maxPan + 5) { ctx.fillRect(0, 0, 150, H); }
    if (camX < L.maxPan - 5) { ctx.fillRect(W - 150, 0, 150, H); }
  }
  if (L.maxPan > 0 && scene === 'hotel') {
    ctx.globalAlpha = 0.8;
    if (camX > -L.maxPan + 5) D.text(ctx, '◀', 36, H / 2, 44, { color: '#fff', stroke: 'rgba(90,61,85,.4)' });
    if (camX < L.maxPan - 5) D.text(ctx, '▶', W - 36, H / 2, 44, { color: '#fff', stroke: 'rgba(90,61,85,.4)' });
    ctx.globalAlpha = 1;
  }
}

function currentTip() {
  if (!save.today || night > 0.3) return '';
  if (C.allDone(save)) return 'みんな ねたよ。\nおやすみ しようね';
  if (T < tipUntil) return tipText;
  const started = guests().some(g => g.done > 0);
  if (save.day === 1 && !started && guests().some(g => g.room >= 0)) return 'ふきだしの ある へやを\nタッチしてね';
  return '';
}
const HINTS = ['へやを かざると\nおきゃくさんが よろこぶよ', 'おてがみに ヒントが\nかいてあるかも', 'なでると よろこぶ\nところが あるよ', 'ハートを あつめると\nへやが ふえるよ', 'すきな おもちゃが\nあるみたい'];

// へやの がめんの みぎうえ：おきゃくさんの かお（タッチで へやを いどう）
function faceSlots() {
  return guests().map((g, gi) => ({ gi, x: W - 64 - gi * 96, y: 58, r: 40 }));
}
function drawFaces() {
  for (const f of faceSlots()) {
    const g = guests()[f.gi], a = actors[f.gi], cur = g.room === curRoom && g.room >= 0;
    ctx.fillStyle = cur ? '#fff3a8' : '#fff'; D.circ(ctx, f.x, f.y, f.r); ctx.fill();
    ctx.lineWidth = cur ? 7 : 4; ctx.strokeStyle = cur ? '#ffc93c' : '#f0c3d2'; ctx.stroke();
    ctx.save(); D.circ(ctx, f.x, f.y, f.r - 3); ctx.clip();
    D.drawCreature(ctx, g.species, f.x, f.y + f.r * 0.95, f.r * 0.62, { t: T + f.gi, mood: a.asleep ? 'sleep' : 'normal' });
    ctx.restore();
    const need = showNeed(f.gi);
    const badge = g.room < 0 ? '🛎️' : a.asleep ? '💤' : need && !cur ? needIcon(g, need) : null;
    if (badge) {
      ctx.fillStyle = '#fff'; D.circ(ctx, f.x - f.r * 0.75, f.y + f.r * 0.7, 20); ctx.fill();
      ctx.strokeStyle = '#ff8fab'; ctx.lineWidth = 3; ctx.stroke();
      D.emoji(ctx, badge, f.x - f.r * 0.75, f.y + f.r * 0.7, 24 + (need && !cur ? Math.sin(T * 6) * 3 : 0));
    }
  }
}

function drawRoomView() {
  ctx.fillStyle = '#ffe0ea'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffd3e0';
  for (let x = 0; x < W; x += 60) ctx.fillRect(x, 0, 30, H);
  const rect = roomRect();
  drawRoomCell(curRoom, rect, true);
  const gi = C.guestAt(save, curRoom);
  if (gi >= 0) {
    const sp = SPECIES[guests()[gi].species];
    ctx.font = `800 32px ${D.FONT}`; const w1 = ctx.measureText(sp.name).width;
    ctx.font = `800 20px ${D.FONT}`; const w2 = ctx.measureText(sp.kind).width;
    const pw = w1 + w2 + 64, ny = rect.y + rect.h - 80, nx = rect.x + rect.w - pw - 16;
    ctx.fillStyle = 'rgba(255,255,255,.92)'; D.rr(ctx, nx, ny, pw, 64, 32); ctx.fill();
    D.text(ctx, sp.name, nx + 24, ny + 32, 32, { align: 'left' });
    D.text(ctx, sp.kind, nx + 40 + w1, ny + 34, 20, { align: 'left', color: '#a08596' });
  } else if (!decor) {
    D.text(ctx, 'あきべや', rect.x + rect.w / 2, rect.y + rect.h * 0.4, 40, { color: '#fff', stroke: 'rgba(90,61,85,.4)' });
    D.text(ctx, '「かざる」で すきに かざってね', rect.x + rect.w / 2, rect.y + rect.h * 0.4 + 56, 28, { color: '#fff', stroke: 'rgba(90,61,85,.4)' });
  }
  if (care?.type === 'food' && gi >= 0) drawPlate(rect);
  if (care?.type === 'play' && gi >= 0 && !care.toy) drawToyChoice(rect);
  if (care?.type === 'play' && care.toy === 'bubble') {
    const h = toyHome(rect, 0); D.drawWand(ctx, h.x, h.y, 90 + Math.sin(T * 4) * 4);
    if (!care.bubbles.length && T > care.hintAt) D.emoji(ctx, '👆', h.x + 30, h.y + 60 + Math.sin(T * 5) * 8, 56);
  }
  if (care?.type === 'play' && care.toy) {
    const txt = `${'●'.repeat(care.count)}${'○'.repeat(Math.max(0, care.goal - care.count))}`;
    D.text(ctx, txt, rect.x + rect.w / 2, rect.y + 40, 36, { color: '#ff6f91', stroke: '#fff', sw: 8 });
    if (care.toy === 'ball' && care.ball.state === 'rest' && T > care.hintAt) {
      const s = rect.w / ROOM.w;
      D.emoji(ctx, '👆', rect.x + (care.ball.x + 30) * s, rect.y + (care.ball.y + 60) * s + Math.sin(T * 5) * 8, 56);
      D.text(ctx, 'なげてね！', rect.x + care.ball.x * s, rect.y + (care.ball.y - 70) * s, 30, { color: '#fff', stroke: '#ff6f91' });
    }
  }
  if (care?.type === 'sleep' && gi >= 0 && T > care.hintAt) {
    const p = actorScreen(gi, rect);
    D.emoji(ctx, '👆', p.bc.x + 20, p.bc.y + 10 + Math.abs(Math.sin(T * 5)) * 20, 60);
    D.text(ctx, 'トントン してね', p.bc.x, p.head.y - 30, 30, { color: '#fff', stroke: '#7a6ee0' });
  }
  if (care?.type === 'dress' && gi >= 0) drawDressTray(rect);
  if (care?.type === 'special' && gi >= 0) drawSpecial(rect);
  if (eating) {
    const p = actorScreen(eating.gi, rect), u = (T - eating.t0) / 0.9;
    const k = u < 0.3 ? 1 : u < 0.55 ? 0.66 : u < 0.8 ? 0.33 : 0;
    if (k > 0) D.emoji(ctx, eating.icon, p.bc.x, p.bc.y + p.r * 0.35, rect.w * 0.07 * k);
  }
  if (T < handHint && gi >= 0) {
    const p = actorScreen(gi, rect), u = (handHint - T) * 3;
    D.emoji(ctx, '👆', p.bc.x + Math.sin(u * 2.2) * p.r * 0.5, p.bc.y - p.r * 0.2 + 40, 70);
  }
  if (drag) drawDragged(rect);
  if (!decor) drawFaces();
}

const plateCenter = rect => ({ x: rect.x + rect.w * 0.2, y: rect.y + rect.h * 0.86 });
const foodHome = (rect, i) => { const c = plateCenter(rect); return { x: c.x + (i - 1.5) * rect.w * 0.064, y: c.y - rect.w * 0.022 }; };
const ACC_IDS = Object.keys(ACCS);
const accHome = (rect, i) => { const c = plateCenter(rect); return { x: c.x + ((i % 3) - 1) * rect.w * 0.085, y: c.y - rect.w * 0.035 - Math.floor(i / 3) * rect.w * 0.08 }; };
const foodIcon = id => FOODS.find(f => f.id === id).icon;
const toyHome = (rect, i) => { const c = plateCenter(rect); return { x: c.x + (i - 0.5) * rect.w * 0.12, y: c.y - rect.w * 0.03 }; };
function drawPlate(rect) {
  const pc = plateCenter(rect);
  ctx.fillStyle = 'rgba(90,61,85,.15)'; D.ell(ctx, pc.x, pc.y + 14, rect.w * 0.13, rect.w * 0.035); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#ffc2d3'; ctx.lineWidth = 6;
  D.ell(ctx, pc.x, pc.y, rect.w * 0.13, rect.w * 0.04); ctx.fill(); ctx.stroke();
  care.foods.forEach((id, i) => {
    if (foodDrag?.i === i || (care.back === i && T < care.backUntil)) return;
    const h = foodHome(rect, i);
    D.emoji(ctx, foodIcon(id), h.x, h.y + Math.sin(T * 3 + i) * 3, rect.w * 0.058);
  });
  if (foodDrag) D.emoji(ctx, foodIcon(care.foods[foodDrag.i]), foodDrag.x, foodDrag.y, rect.w * 0.08);
}
function drawToyChoice(rect) {
  const pc = plateCenter(rect);
  ctx.fillStyle = 'rgba(255,255,255,.85)'; D.rr(ctx, pc.x - rect.w * 0.14, pc.y - rect.w * 0.1, rect.w * 0.28, rect.w * 0.13, 30); ctx.fill();
  const b = toyHome(rect, 0), w = toyHome(rect, 1), s = rect.w / ROOM.w;
  D.drawBall(ctx, w.x, w.y + Math.sin(T * 3) * 4, 40 * s * 1.1);
  D.drawWand(ctx, b.x, b.y + 20 + Math.sin(T * 3 + 1) * 4, 90 * s);
  D.text(ctx, 'しゃぼんだま', b.x, b.y + rect.w * 0.07, 20, {});
  D.text(ctx, 'ボール', w.x, w.y + rect.w * 0.07, 20, {});
  D.text(ctx, 'どれで あそぶ？', pc.x, pc.y - rect.w * 0.13, 30, { color: '#fff', stroke: '#ff6f91' });
}

function drawDragged(rect) {
  const s = rect.w / ROOM.w, d = ITEMS[drag.id];
  const pos = dragRoomPos(rect);
  ctx.save();
  if (pos.inside) {
    ctx.translate(rect.x + pos.x * s, rect.y + pos.y * s);
    const k = d.zone === 'floor' ? D.depth(pos.y) : 1;
    ctx.scale(s * k * 1.05, s * k * 1.05);
    ctx.globalAlpha = 0.9;
  } else {
    ctx.translate(drag.p.x, drag.p.y);
    const k = Math.min(120 / d.w, 120 / d.h);
    ctx.scale(k, k); ctx.translate(0, d.zone === 'floor' && !d.flat ? d.h / 2 : 0);
    ctx.globalAlpha = 0.7;
  }
  D.drawItem(ctx, drag.id, { t: T });
  ctx.restore();
  if (!pos.inside && !drag.fromDrawer) D.text(ctx, 'しまう', drag.p.x, drag.p.y - 90, 30, { color: '#fff', stroke: '#ff6f91' });
}

function dragRoomPos(rect) {
  const s = rect.w / ROOM.w;
  const drawerTop = $('drawer').getBoundingClientRect().top / S;
  // ひきだしより うえなら へやの 中に おく（はしで はなしても へやの はしに おさまる）
  const inside = drag.p.y < drawerTop - 10;
  const it = C.clampItem({ id: drag.id, x: (drag.p.x - rect.x) / s + drag.off.x, y: (drag.p.y - rect.y) / s + drag.off.y });
  return { inside, x: it.x, y: it.y };
}

// ---------- おふろ ----------
function bathGeom(gi = bath?.gi) {
  const big = gi >= 0 && SPECIES[guests()[gi]?.species]?.big;
  const r = Math.min(H * 0.22, W * 0.15) * (big ? 1.2 : 1), tubTop = H * 0.7;
  return { cx: W / 2, feet: tubTop + r * 0.5, r, tubTop, tubW: r * 3.6 };
}
function startBath(gi) {
  const g = guests()[gi], a = actors[gi], sp = SPECIES[g.species];
  scene = 'bath'; care = null;
  bath = { gi, phase: 'soap', foam: [], shower: null, rub: 0 };
  if (!a.dirt) a.dirt = genDirt(sp.big ? 7 : 5);
  a.dirt.forEach(d => { d.a = 1; });
  say(a, sp.say.bathStart, 2.6);
  setMood(a, sp.bath === 'nigate' ? 'pout' : 'happy', 2);
  firstTip('bath', 'ゆびで こすって あわあわ しよう！');
  sound.play('door');
}
function bathBody(gi) {
  const g = guests()[gi], a = actors[gi], G = bathGeom(gi);
  const bc = D.bodyCenter(g.species, G.cx, G.feet, G.r, { t: T + gi * 1.7, sq: a.sq, puff: a.puff });
  return { bc, r: G.r * a.puff, G };
}
function drawBath() {
  const gi = bath.gi, g = guests()[gi], a = actors[gi];
  const { bc, r, G } = bathBody(gi);
  ctx.fillStyle = '#d7f0ff'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#bfe3f7'; ctx.lineWidth = 4;
  for (let x = 0; x < W; x += 90) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 90) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.fillStyle = '#aee0f5'; ctx.fillRect(0, H * 0.8, W, H * 0.2);
  D.emoji(ctx, '🐥', G.cx + G.tubW * 0.36, G.tubTop - 18 + Math.sin(T * 2) * 5, 64);
  ctx.fillStyle = '#e9f7ff'; D.ell(ctx, G.cx, G.tubTop, G.tubW / 2, 40); ctx.fill();
  D.drawCreature(ctx, g.species, G.cx, G.feet, G.r, { ...stOf(gi), dirt: a.dirt, blanket: false });
  for (const f of bath.foam) {
    const x = bc.x + f.x * r, y = bc.y + f.y * r, s = f.s * r * (f.grow < 1 ? f.grow : 1);
    ctx.fillStyle = 'rgba(255,255,255,.95)'; D.circ(ctx, x, y, s); ctx.fill();
    ctx.strokeStyle = 'rgba(180,215,240,.8)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(200,230,255,.9)'; D.circ(ctx, x - s * 0.35, y - s * 0.35, s * 0.2); ctx.fill();
  }
  ctx.fillStyle = '#ffffff'; D.rr(ctx, G.cx - G.tubW / 2, G.tubTop, G.tubW, H - G.tubTop + 40, 60); ctx.fill();
  ctx.fillStyle = '#ffb3c8'; D.rr(ctx, G.cx - G.tubW / 2, G.tubTop + 40, G.tubW, 26, 13); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#d6ecf7'; ctx.lineWidth = 6;
  D.ell(ctx, G.cx, G.tubTop, G.tubW / 2 + 10, 26); ctx.stroke();
  for (let i = 0; i < 9; i++) { D.circ(ctx, G.cx - G.tubW * 0.42 + i * G.tubW * 0.105, G.tubTop - 4 + Math.sin(T * 3 + i) * 3, 22 + (i % 3) * 6); ctx.fill(); }
  if (bath.phase === 'rinse') {
    const sh = bath.shower || { x: G.cx + G.r * 1.8 + Math.sin(T * 3) * 10, y: bc.y - r * 1.6 };
    ctx.save(); ctx.translate(sh.x, sh.y);
    ctx.fillStyle = '#b8c4d6'; D.rr(ctx, -12, -120, 24, 110, 10); ctx.fill();
    ctx.fillStyle = '#dfe7f2'; ctx.beginPath(); ctx.ellipse(0, 0, 58, 26, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#9fb0c8'; for (let i = -3; i <= 3; i++) { D.circ(ctx, i * 13, 2, 4); ctx.fill(); }
    ctx.restore();
    if (!bath.shower) D.emoji(ctx, '👆', sh.x + 30, sh.y + 60 + Math.sin(T * 5) * 8, 56);
  }
  if (a.say && T < a.sayUntil) speeches.push({ x: bc.x, y: bc.y - r - 10, text: a.say, size: 34 });
  const msg = bath.phase === 'soap' ? 'ゴシゴシ こすって あわあわ！' : bath.phase === 'rinse' ? 'シャワーで あわを ながそう！' : bath.phase === 'dry' ? 'ふきふき…' : 'ピカピカ！';
  D.text(ctx, msg, W / 2, H * 0.17, 46, { color: '#fff', stroke: '#5cb8e8', sw: 12 });
}

function bathMove(p) {
  const gi = bath.gi, a = actors[gi], g = guests()[gi];
  const { bc, r, G } = bathBody(gi);
  const d = bath.last ? Math.hypot(p.x - bath.last.x, p.y - bath.last.y) : 0;
  bath.last = p;
  if (bath.phase === 'soap') {
    const dx = (p.x - bc.x) / r, dy = (p.y - bc.y) / r;
    if (dx * dx + dy * dy > 1.3 || p.y > G.tubTop) return;
    bath.rub += d;
    if (bath.rub > 18 && bath.foam.length < 80) {
      bath.rub = 0;
      bath.foam.push({ x: dx + rand(-0.1, 0.1), y: dy + rand(-0.1, 0.1), s: rand(0.1, 0.18), grow: 0 });
      sound.play('bubble', 0.06);
    }
    for (const s of a.dirt) if (Math.hypot(s.x - dx, s.y - dy) < 0.4) s.a = Math.max(0, s.a - d / (r * 1.1));
    sound.play('scrub', 0.08);
    if (Math.random() < 0.1) poke(a, 0.06);
    if (g.species === 'gorota') setMood(a, 'bliss', 0.4);
    if (a.dirt.every(s => s.a < 0.05) && bath.foam.length >= (SPECIES[g.species].big ? 26 : 16)) { bath.phase = 'rinse'; sound.play('ok'); }
  } else if (bath.phase === 'rinse') {
    bath.shower = { x: p.x, y: Math.min(p.y, bc.y - r * 1.25) };
  }
}
function updateBath(dt) {
  if (!bath) return;
  for (const f of bath.foam) f.grow = Math.min(1, (f.grow || 0) + dt * 5);
  const gi = bath.gi, a = actors[gi], g = guests()[gi], G = bathGeom();
  if (Math.random() < dt * 4) parts.push({ k: 'steam', x: G.cx + rand(-G.tubW * 0.45, G.tubW * 0.45), y: G.tubTop - 10, vx: 0, vy: -60, t: 0, life: 2.2, s: rand(0, 6) });
  if (bath.phase === 'rinse' && bath.shower && pointerId !== null) {
    const { bc, r } = bathBody(gi), sh = bath.shower;
    for (let i = 0; i < 3; i++) parts.push({ k: 'drop', x: sh.x + rand(-40, 40), y: sh.y + 10, vx: rand(-20, 20), vy: rand(200, 400), t: 0, life: 0.6 });
    sound.play('splash', 0.05);
    if (g.species === 'fuwari') { a.puffT = 1.3; setMood(a, 'yuck', 0.3); }
    for (const f of bath.foam) {
      const fx = bc.x + f.x * r;
      if (Math.abs(fx - sh.x) < 75 && Math.random() < dt * 9) {
        f.dead = true;
        parts.push({ k: 'pop', x: fx, y: bc.y + f.y * r, vx: 0, vy: 0, t: 0, life: 0.3, s: f.s * r });
        sound.play('bubble', 0.04);
      }
    }
    bath.foam = bath.foam.filter(f => !f.dead);
    if (!bath.foam.length) {
      // タオルで ふきふき → ピカピカ
      bath.phase = 'dry'; a.puffT = 1; a.towel = T + 1.4;
      if (g.species === 'fuwari') a.shake = 1.2;
      setMood(a, 'bliss', 1.4); sound.play('scrub');
      later(1.4, () => {
        if (!bath) return;
        bath.phase = 'done'; sound.play('shine');
        const sp = SPECIES[g.species], { bc: c2, r: r2 } = bathBody(gi);
        setMood(a, 'happy', 3); say(a, sp.say.bathEnd, 2.4); jump(a);
        sparkles(c2.x, c2.y, 16, r2);
        later(2, finishBath);
      });
    }
  } else if (bath.phase === 'soap' || bath.phase === 'rinse') a.puffT = 1;
}
function finishBath() {
  if (!bath) return;
  const gi = bath.gi, a = actors[gi];
  const res = C.bathDone(save, gi);
  bath = null; scene = 'room'; a.dirt = null;
  persist();
  later(0.2, () => { reward(gi, res.hearts); if (res.learned) toast('📖 ずかんに かいたよ！'); });
}

// ---------- あそぶ ----------
function startPlay(gi) {
  care = { type: 'play', gi, toy: null, count: 0, goal: 3, hintAt: T + 1.5 };
  sound.play('pop');
  firstTip('play', 'どれで あそぶか えらんでね');
}
function chooseToy(toy) {
  care.toy = toy; care.count = 0; care.hintAt = T + 1.2;
  care.goal = toy === 'ball' ? 3 : 6;
  care.ball = { x: 200, y: 560, vx: 0, vy: 0, state: 'rest', rot: 0, floorY: 600 };
  care.bubbles = [];
  const a = actors[care.gi], sp = SPECIES[guests()[care.gi].species];
  if (toy === sp.toy) { say(a, sp.say.toyFav, 2); setMood(a, 'happy', 2); jump(a); sound.play('like'); }
  else { say(a, 'いいよ〜', 1.5); sound.play('pop'); }
}
function updatePlay(dt) {
  if (care?.type !== 'play' || !care.toy || scene !== 'room') return;
  const gi = care.gi, a = actors[gi];
  if (care.toy === 'ball') {
    const b = care.ball;
    if (b.state === 'fly') {
      b.vy += 1800 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vx * dt * 0.02;
      if (b.x < 40) { b.x = 40; b.vx = Math.abs(b.vx) * 0.6; }
      if (b.x > 960) { b.x = 960; b.vx = -Math.abs(b.vx) * 0.6; }
      if (b.y > 580) {
        b.y = 580; b.vy = -Math.abs(b.vy) * 0.45; b.vx *= 0.8;
        if (Math.abs(b.vy) > 120) sound.play('drop', 0.1);
        if (Math.abs(b.vy) < 80) { b.vy = 0; b.state = 'ground'; }
      }
      care.targetX = b.x;
    } else if (b.state === 'ground') {
      b.vx *= Math.pow(0.2, dt); b.x += b.vx * dt; b.rot += b.vx * dt * 0.02;
      care.targetX = b.x;
      if (Math.abs(a.x - b.x) < 50) { b.state = 'carried'; poke(a, 0.2); sound.play('pick'); care.targetX = 560; }
    } else if (b.state === 'carried') {
      care.targetX = 560;
      if (Math.abs(a.x - 560) < 12) {
        care.count++; b.state = 'rest'; b.x = 200; b.y = 560; care.hintAt = T + 2;
        jump(a); notes(guestScreenAnywhere(gi).head.x, guestScreenAnywhere(gi).head.y);
        sound.play('ok');
        if (care.count >= care.goal) finishPlay();
      }
    } else care.targetX = 560;
  } else {
    // しゃぼんだま：ふわふわ とぶ あわを ぴょんと わる
    const headY = a.baseY - 2 * R_BASE * D.depth(a.baseY);
    for (const b of care.bubbles) {
      b.t += dt; b.x += b.vx * dt + Math.sin(b.t * 2 + b.ph) * 30 * dt; b.y += b.vy * dt;
      b.vy = Math.min(b.vy + 8 * dt, 25);
      if (b.x < 60 || b.x > 940) b.vx *= -1;
    }
    const target = care.bubbles.slice().sort((p, q) => Math.abs(p.x - a.x) - Math.abs(q.x - a.x))[0];
    care.targetX = target ? target.x : 560;
    if (target && Math.abs(target.x - a.x) < 60 && target.y > headY - 120 && T - a.jumpT > 0.6) {
      jump(a);
      later(0.25, () => popBubble(target));
    }
    care.bubbles = care.bubbles.filter(b => b.t < 9 && !b.dead);
  }
}
function popBubble(b) {
  if (!care || care.type !== 'play' || b.dead) return;
  b.dead = true;
  const rect = roomRect(), s = rect.w / ROOM.w;
  parts.push({ k: 'pop', x: rect.x + b.x * s, y: rect.y + b.y * s, vx: 0, vy: 0, t: 0, life: 0.35, s: b.r * s });
  sound.play('bubble');
  care.count++;
  if (care.count >= care.goal) finishPlay();
}
function blowBubbles() {
  const h = { x: 200, y: 470 };
  for (let i = 0; i < 4; i++) care.bubbles.push({ x: h.x + rand(-20, 20), y: h.y - rand(0, 40), vx: rand(80, 220), vy: rand(-90, -40), r: rand(26, 40), t: 0, ph: rand(0, 6) });
  sound.play('bubble'); care.hintAt = T + 4;
}
function finishPlay() {
  const gi = care.gi, a = actors[gi], sp = SPECIES[guests()[gi].species];
  const res = C.playDone(save, gi, care.toy);
  care = null;
  if (res.result === 'notNow') return;
  say(a, res.result === 'fav' ? 'たのしかった〜！' : sp.say.toyOk, 2);
  sound.play(res.result === 'fav' ? 'fav' : 'ok');
  reward(gi, res.hearts);
  if (res.learned) later(0.8, () => toast('📖 すきな あそびが わかった！'));
}

// ---------- ねかしつけ ----------
function startSleep(gi) {
  care = { type: 'sleep', gi, taps: 0, hintAt: T + 1.6 };
  const a = actors[gi];
  if (!C.bedOf(save.rooms[guests()[gi].room])) say(a, 'ベッドが ないなぁ… ゆかで ねるね', 2.4);
  else say(a, 'ふわぁ〜', 1.5);
  sound.play('pop');
  firstTip('sleep', 'やさしく トントン してね');
}
const LULLABY = [659, 587, 523, 587, 659, 659, 659];
function tapSleep(gi, p) {
  const a = actors[gi];
  if (Math.abs(a.x - a.tx) > 12) return;
  care.taps++; care.hintAt = T + 3;
  sound.tone?.(LULLABY[(care.taps - 1) % LULLABY.length], 0.5, { type: 'sine', vol: 0.18 });
  poke(a, 0.12); setMood(a, 'bliss', 1.2);
  notes(p.x, p.y - 20, 1);
  if (care.taps >= 5) {
    const res = C.sleepDone(save, gi);
    care = null;
    a.asleep = true;
    say(a, SPECIES[guests()[gi].species].say.sleepEnd, 2);
    sound.play('night');
    reward(gi, res.hearts);
  }
}

// ---------- おしゃれ ----------
function drawDressTray(rect) {
  const c = plateCenter(rect);
  ctx.fillStyle = 'rgba(255,255,255,.88)'; D.rr(ctx, c.x - rect.w * 0.14, c.y - rect.w * 0.165, rect.w * 0.28, rect.w * 0.19, 30); ctx.fill();
  ctx.strokeStyle = '#ffc2d3'; ctx.lineWidth = 5; ctx.stroke();
  ACC_IDS.forEach((id, i) => {
    if (care.accDrag?.id === id) return;
    const h = accHome(rect, i);
    D.emoji(ctx, ACCS[id].icon, h.x, h.y + Math.sin(T * 3 + i) * 3, rect.w * 0.058);
  });
  D.text(ctx, 'どれを つける？', c.x, c.y - rect.w * 0.19, 30, { color: '#fff', stroke: '#ff6f91' });
  if (care.accDrag) D.emoji(ctx, ACCS[care.accDrag.id].icon, care.accDrag.x, care.accDrag.y, rect.w * 0.075);
}
function dropAcc(gi, id, p) {
  const s = actorScreen(gi, roomRect()), a = actors[gi], g = guests()[gi], sp = SPECIES[g.species];
  if (Math.hypot(p.x - s.head.x, p.y - (s.head.y + s.r * 0.3)) > s.r * 1.1) return;
  const res = C.dressDone(save, gi, id);
  if (res.result === 'notNow') return;
  care = null;
  sparkles(s.head.x, s.head.y + 20, 10, 50); sound.play(res.result === 'fav' ? 'fav' : 'ok');
  say(a, res.result === 'fav' ? `${ACCS[id].name}、だいすき！` : 'にあう？ えへへ', 2.2); setMood(a, 'happy', 2);
  reward(gi, res.hearts);
  if (res.learned) later(0.8, () => toast('📖 すきな おしゃれが わかった！'));
}

// ---------- その子だけの おせわ ----------
function startSpecial(gi) {
  const g = guests()[gi], kind = SPECIES[g.species].special;
  if (!kind) return;
  care = { type: 'special', gi, kind, prog: 0, count: 0, goal: { fan: 8, roll: 4, shell: 3, cream: 5, stars: 5, janken: 3 }[kind] || 1, hintAt: T + 1.2 };
  if (kind === 'shell') care.shells = [[170, 585], [860, 590], [330, 600]].map(([x, y]) => ({ x: x + rand(-30, 30), y, found: false, t0: 0 }));
  if (kind === 'stars') care.stars = [[140, 110], [310, 230], [820, 120], [700, 300], [460, 90]].map(([x, y], i) => ({ x: x + rand(-30, 30), y: y + rand(-20, 20), found: false, t0: 0, ph: i }));
  if (kind === 'janken') care.jk = { phase: 'choose', until: 0 };
  if (kind === 'pinwheel') { care.ang = 0; care.spin = 0; }
  const a = actors[gi];
  if (kind === 'cream') a.cream = 0;
  if (kind === 'fan') a.flame = 0.35;
  sound.play('pop');
  say(a, SPECIALS[kind].need, 2);
}
const tailPos = (gi, rect) => { const s = actorScreen(gi, rect); return { x: s.bc.x + s.r * 1.25, y: s.bc.y - s.r * 0.38, r: s.r }; };
function specialProgress(gi, amount, p) {
  const a = actors[gi], k = care.kind;
  care.prog = Math.min(1, care.prog + amount);
  if (k === 'fluff') { a.fluff = care.prog; if (Math.random() < 0.3) parts.push({ k: 'steam', x: p.x + rand(-30, 30), y: p.y, vx: rand(-40, 40), vy: -60, t: 0, life: 0.8, s: 1 }); sound.play('scrub', 0.08); }
  if (k === 'water') { a.bloom = 0.3 + care.prog * 0.7; sound.play('splash', 0.06); }
  if (k === 'polish') { a.shine = 0.3 + care.prog * 0.7; if (Math.random() < 0.3) sparkles(p.x, p.y, 1, 20); sound.play('scrub', 0.08); }
  if (k === 'pinwheel') { sound.play('splash', 0.1); if (Math.random() < 0.05) say(a, 'ひゅるる〜！', 0.8); }
  if (Math.random() < 0.06) poke(a, 0.06);
  setMood(a, 'bliss', 0.4);
  if (care.prog >= 1) finishSpecial();
}
function finishSpecial() {
  const gi = care.gi, a = actors[gi], kind = care.kind;
  const res = C.specialDone(save, gi);
  care = null;
  if (res.result === 'notNow') return;
  a.fluff = 1; a.flame = 1.2; a.bloom = 1; a.shine = 1; a.cream = 5;
  const p = guestScreenAnywhere(gi);
  sparkles(p.bc.x, p.bc.y, 14, p.r); sound.play('fav');
  say(a, SPECIALS[kind].done, 2.4); setMood(a, 'happy', 2.4);
  reward(gi, res.hearts);
}
const JANKEN = ['✊', '✌️', '✋'];
const jankenHome = (rect, i) => { const c = plateCenter(rect); return { x: c.x + (i - 1) * rect.w * 0.085, y: c.y - rect.w * 0.04 }; };
const pinwheelPos = (rect) => { const sc = rect.w / ROOM.w; return { x: rect.x + 300 * sc, y: rect.y + 300 * sc, r: 85 * sc }; };
function specialDown(p, rect) {
  const gi = care.gi, s = actorScreen(gi, rect), k = care.kind, sc = rect.w / ROOM.w;
  care.hintAt = T + 3;
  if (k === 'cream') {
    if (Math.hypot(p.x - s.bc.x, p.y - (s.bc.y - s.r * 0.75)) > s.r * 0.9) return true;
    if (care.count >= care.goal) return true;
    care.count++; actors[gi].cream = care.count;
    sparkles(s.bc.x, s.bc.y - s.r * 0.9, 4, 30); sound.play('pop'); poke(actors[gi], 0.1);
    if (care.count >= care.goal) later(0.5, () => { if (care?.kind === 'cream') finishSpecial(); });
    return true;
  }
  if (k === 'stars') {
    const st = care.stars.find(q => !q.found && Math.hypot(p.x - (rect.x + q.x * sc), p.y - (rect.y + q.y * sc)) < 50 * sc + 26);
    if (st) {
      st.found = true; st.t0 = T; care.count++; sound.tone?.([523, 587, 659, 698, 784][care.count - 1], 0.4, { type: 'triangle', vol: 0.2 });
      sparkles(p.x, p.y, 6, 30); say(actors[gi], ['いち…', 'に…', 'さん…', 'よん…', 'ご…'][care.count - 1], 1);
      if (care.count >= care.goal) later(0.9, () => { if (care?.kind === 'stars') finishSpecial(); });
    }
    return true;
  }
  if (k === 'janken') {
    if (care.jk.phase !== 'choose') return true;
    const i = JANKEN.findIndex((_, i) => { const h = jankenHome(rect, i); return Math.hypot(p.x - h.x, p.y - h.y) < rect.w * 0.04; });
    if (i < 0) return true;
    const them = Math.floor(Math.random() * 3);
    const res = i === them ? 'あいこ！' : (i - them + 3) % 3 === 2 ? 'かち！' : 'まけ〜';
    care.jk = { phase: 'show', mine: i, them, res, until: T + 1.6 };
    say(actors[gi], `じゃんけん ぽん！ ${JANKEN[them]}`, 1.5); sound.play(res === 'かち！' ? 'like' : 'pop'); jump(actors[gi]);
    care.count++;
    later(1.6, () => { if (care?.kind !== 'janken') return; if (care.count >= care.goal) finishSpecial(); else care.jk = { phase: 'choose' }; });
    return true;
  }
  if (k === 'pinwheel') { care.rub = { last: p }; return true; }
  if (k === 'fan') {
    const tp = tailPos(gi, rect);
    if (Math.hypot(p.x - tp.x, p.y - tp.y) > tp.r * 1.3 && Math.hypot(p.x - s.bc.x, p.y - s.bc.y) > s.r * 1.2) return true;
    care.count++; care.fanAt = T; care.fanP = p;
    actors[gi].flame = 0.35 + care.count / care.goal * 0.85;
    sparkles(tp.x, tp.y, 3, 20); sound.play('pop'); poke(actors[gi], 0.08);
    if (care.count >= care.goal) finishSpecial();
    return true;
  }
  if (k === 'shell') {
    const sh = care.shells.find(q => !q.found && Math.hypot(p.x - (rect.x + q.x * sc), p.y - (rect.y + q.y * sc)) < 60 * sc + 26);
    if (sh) {
      sh.found = true; sh.t0 = T; care.count++; sound.play('pick'); sparkles(p.x, p.y, 5, 30);
      if (care.count >= care.goal) later(0.6, () => { if (care?.kind === 'shell') finishSpecial(); });
    }
    return true;
  }
  if (k === 'roll') { care.swipe = { x0: p.x }; return true; }
  care.rub = { last: p }; care.toolP = p;
  return true;
}
function specialMove(p, rect) {
  const gi = care.gi, k = care.kind, s = actorScreen(gi, rect);
  if (k === 'roll' && care.swipe) {
    const dx = p.x - care.swipe.x0;
    if (Math.abs(dx) > 140) {
      care.swipe.x0 = p.x; care.count++;
      const a = actors[gi]; a.rollT = T; a.rollDir = Math.sign(dx); poke(a, 0.2); sound.play('drop');
      if (care.count >= care.goal) later(0.7, () => { if (care?.kind === 'roll') finishSpecial(); });
    }
    return;
  }
  if (!care.rub) return;
  const d = Math.hypot(p.x - care.rub.last.x, p.y - care.rub.last.y);
  care.rub.last = p; care.toolP = p;
  if (k === 'pinwheel') {
    const pw = pinwheelPos(rect);
    if (Math.hypot(p.x - pw.x, p.y - pw.y) < pw.r * 1.8) { care.spin = Math.min(30, care.spin + d * 0.06); specialProgress(gi, d / (s.r * 12), p); }
    return;
  }
  if (k === 'fluff' && Math.hypot(p.x - s.bc.x, p.y - s.bc.y) < s.r * 1.25) specialProgress(gi, d / (s.r * 10), p);
  if (k === 'polish') { const tp = tailPos(gi, rect); if (Math.hypot(p.x - tp.x, p.y - tp.y) < tp.r * 0.9) specialProgress(gi, d / (s.r * 7), p); }
  if (k === 'water') {
    const sp = { x: p.x - 70, y: p.y + 10 };
    if (Math.random() < 0.6) parts.push({ k: 'drop', x: sp.x + rand(-8, 8), y: sp.y, vx: rand(-30, 10), vy: rand(100, 200), t: 0, life: 0.5 });
    if (Math.abs(sp.x - s.bc.x) < s.r * 1.3 && sp.y < s.bc.y + s.r * 0.2) specialProgress(gi, d / (s.r * 9) + 0.004, sp);
  }
}
function drawSpecial(rect) {
  const gi = care.gi, k = care.kind, s = actorScreen(gi, rect), sc = rect.w / ROOM.w;
  D.text(ctx, SPECIALS[k].how, rect.x + rect.w / 2, rect.y + 40, 32, { color: '#fff', stroke: '#ff6f91', sw: 9 });
  // すすみぐあい
  const bw = rect.w * 0.3, bx = rect.x + rect.w / 2 - bw / 2, by = rect.y + 70, u = care.goal > 1 ? care.count / care.goal : care.prog;
  ctx.fillStyle = 'rgba(255,255,255,.85)'; D.rr(ctx, bx, by, bw, 22, 11); ctx.fill();
  ctx.fillStyle = '#ff8fab'; D.rr(ctx, bx, by, Math.max(22, bw * u), 22, 11); ctx.fill();
  if (k === 'stars') for (const q of care.stars) {
    let x = rect.x + q.x * sc, y = rect.y + q.y * sc;
    if (q.found) { const t = clamp((T - q.t0) / 0.6, 0, 1); x += (s.head.x - x) * t; y += (s.head.y - y) * t; if (t >= 1) continue; }
    const tw = 1 + Math.sin(T * 5 + q.ph) * 0.2;
    const g = ctx.createRadialGradient(x, y, 2, x, y, 50 * sc + 20); g.addColorStop(0, 'rgba(255,240,150,.7)'); g.addColorStop(1, 'rgba(255,240,150,0)');
    ctx.fillStyle = g; D.circ(ctx, x, y, 50 * sc + 20); ctx.fill();
    ctx.fillStyle = '#ffe45c'; ctx.strokeStyle = '#ffb21e'; ctx.lineWidth = 3; D.star(ctx, x, y, (28 * sc + 12) * tw); ctx.fill(); ctx.stroke();
  }
  if (k === 'janken') {
    const c = plateCenter(rect);
    ctx.fillStyle = 'rgba(255,255,255,.88)'; D.rr(ctx, c.x - rect.w * 0.14, c.y - rect.w * 0.09, rect.w * 0.28, rect.w * 0.1, 30); ctx.fill();
    JANKEN.forEach((h, i) => { const q = jankenHome(rect, i); const on = care.jk.phase === 'show' && care.jk.mine === i; D.emoji(ctx, h, q.x, q.y + (on ? -10 : Math.sin(T * 3 + i) * 3), rect.w * (on ? 0.07 : 0.055)); });
    if (care.jk.phase === 'show') D.text(ctx, care.jk.res, s.bc.x, s.head.y - 90, 52, { color: '#fff', stroke: care.jk.res === 'かち！' ? '#ff6f91' : '#7fc7ff', sw: 12 });
  }
  if (k === 'pinwheel') {
    const pw = pinwheelPos(rect);
    care.ang += care.spin * (1 / 60); care.spin *= 0.985;
    ctx.save(); ctx.fillStyle = '#c98b55'; D.rr(ctx, pw.x - 6, pw.y, 12, pw.r * 2.2, 6); ctx.fill();
    ctx.translate(pw.x, pw.y); ctx.rotate(care.ang);
    const cols = ['#ff8fab', '#7fc7ff', '#ffd84a', '#8fd36a'];
    for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -pw.r); ctx.quadraticCurveTo(pw.r * 0.75, -pw.r * 0.7, 0, 0); ctx.fill(); }
    ctx.fillStyle = '#fff'; D.circ(ctx, 0, 0, pw.r * 0.12); ctx.fill();
    ctx.restore();
  }
  if (k === 'shell') for (const q of care.shells) {
    let x = rect.x + q.x * sc, y = rect.y + q.y * sc;
    if (q.found) { const t = clamp((T - q.t0) / 0.5, 0, 1); x += (s.bc.x - x) * t; y += (s.bc.y + s.r * 0.6 - y) * t - Math.sin(t * Math.PI) * 80; if (t >= 1) continue; }
    ctx.fillStyle = '#ffd6e2'; ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.arc(x, y + 8, 30 * sc + 10, Math.PI * 1.1, Math.PI * 1.9); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ff9fbd'; ctx.lineWidth = 3; for (let j = -2; j <= 2; j++) { ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.lineTo(x + j * 10, y - 20 * sc - 8); ctx.stroke(); }
    if (!q.found && Math.sin(T * 5 + q.x) > 0.6) { ctx.fillStyle = '#ffe45c'; D.star(ctx, x + 20, y - 20, 8); ctx.fill(); }
  }
  if (k === 'fan' && T - (care.fanAt ?? -9) < 0.35) {
    const q = care.fanP, an = Math.sin((T - care.fanAt) * 30) * 0.5;
    ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(an);
    ctx.fillStyle = '#c98b55'; ctx.fillRect(-4, 0, 8, 60);
    ctx.fillStyle = '#ffb3c8'; D.circ(ctx, 0, -20, 40); ctx.fill(); ctx.strokeStyle = '#ff8fab'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
  }
  if (care.toolP && care.rub) {
    const q = care.toolP;
    if (k === 'fluff') { ctx.fillStyle = '#c98b55'; D.rr(ctx, q.x - 10, q.y - 10, 20, 70, 8); ctx.fill(); ctx.fillStyle = '#ffb3c8'; D.rr(ctx, q.x - 40, q.y - 30, 80, 28, 10); ctx.fill(); ctx.fillStyle = '#fff'; for (let j = -3; j <= 3; j++) ctx.fillRect(q.x + j * 10 - 2, q.y - 44, 4, 16); }
    if (k === 'water') { ctx.fillStyle = '#7fc7ff'; D.rr(ctx, q.x - 30, q.y - 30, 70, 55, 14); ctx.fill(); ctx.beginPath(); ctx.moveTo(q.x - 28, q.y - 10); ctx.lineTo(q.x - 75, q.y + 5); ctx.lineTo(q.x - 70, q.y + 14); ctx.lineTo(q.x - 26, q.y + 8); ctx.fill(); ctx.strokeStyle = '#5aa3e0'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(q.x + 5, q.y - 32, 22, Math.PI, 0); ctx.stroke(); }
    if (k === 'polish') { ctx.fillStyle = '#bfe3ff'; D.rr(ctx, q.x - 30, q.y - 30, 60, 60, 14); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); }
  }
  if (T > care.hintAt) {
    const tp = tailPos(gi, rect);
    const at = k === 'fan' || k === 'polish' ? tp : k === 'water' ? { x: s.bc.x + 60, y: s.bc.y - s.r * 1.1 } : s.bc;
    if (k === 'roll') D.emoji(ctx, '👉', s.bc.x - 120 + ((T * 180) % 240), s.bc.y + s.r * 0.8, 60);
    else if (k === 'pinwheel') { const pw = pinwheelPos(rect); D.emoji(ctx, '👆', pw.x + Math.cos(T * 4) * pw.r * 0.7, pw.y + 40 + Math.sin(T * 4) * pw.r * 0.7, 60); }
    else if (k === 'cream') D.emoji(ctx, '👆', s.bc.x + 10, s.bc.y - s.r * 0.6 + Math.abs(Math.sin(T * 6)) * 20, 60);
    else if (k === 'janken' && care.jk.phase === 'choose') { const q = jankenHome(rect, Math.floor(T) % 3); D.emoji(ctx, '👆', q.x + 20, q.y + 60, 50); }
    else if (k !== 'shell' && k !== 'stars' && k !== 'janken') D.emoji(ctx, '👆', at.x + 20 + (k === 'fan' ? 0 : Math.sin(T * 6) * 30), at.y + 40 + (k === 'fan' ? Math.abs(Math.sin(T * 6)) * 20 : 0), 60);
  }
}

// ---------- おせわの けっか ----------
function reward(gi, hearts) {
  const a = actors[gi], g = guests()[gi];
  const pos = guestScreenAnywhere(gi).head;
  burstHearts(pos.x, pos.y, hearts);
  sparkles(pos.x, pos.y + 40, 6, 60);
  if (!a.asleep) jump(a);
  a.needAt = T + 1.8;
  a.pet = 0; a.favD = 0; a.allD = 0;
  persist();
  if (C.isHappy(g) && !a.thanked) {
    a.thanked = true;
    later(1.4, () => { confetti(pos.x, pos.y); sound.play('like'); });
    if (C.allDone(save)) later(2.2, () => { toast('みんな ねたよ 🌙 おやすみ しよう'); });
  }
}
function refuse(gi, str) { const a = actors[gi]; sound.play('no'); a.shake = 0.7; say(a, str, 1.6); }

function feed(gi, food) {
  const a = actors[gi], g = guests()[gi], sp = SPECIES[g.species];
  const res = C.feed(save, gi, food);
  a.mouth = 1; setMood(a, 'eat', 0.4);
  if (res.result === 'dislike') {
    sound.play('yuck'); setMood(a, 'yuck', 1.6); a.shake = 1.1; say(a, sp.say.dislike, 2.2); a.look = -1; a.lookUntil = T + 1.5;
    care.back = care.foods.indexOf(food); care.backUntil = T + 0.6;
    if (res.learned) { persist(); later(0.8, () => toast('📖 にがてな たべものが わかった！')); }
    return;
  }
  care = null;
  // もぐもぐ：3かいで たべおわる
  eating = { gi, icon: FOODS.find(f => f.id === food).icon, t0: T };
  const crumbs = () => {
    const p = guestScreenAnywhere(gi);
    for (let i = 0; i < 5; i++) parts.push({ k: 'crumb', x: p.bc.x + rand(-20, 20), y: p.bc.y + p.r * 0.35, vx: rand(-160, 160), vy: rand(-250, -80), t: 0, life: 0.8, s: rand(3, 6), c: food === 'apple' ? '#fff1c9' : food === 'ame' ? '#ff9fc0' : '#c98b55' });
    poke(a, 0.12); a.mouth = 1; setMood(a, 'eat', 0.3); sound.play('munch');
  };
  [0, 0.3, 0.55].forEach(t => later(t, crumbs));
  later(0.9, () => {
    eating = null;
    const fav = res.result === 'fav';
    setMood(a, 'happy', 2); say(a, fav ? sp.say.fav : sp.say.ok, 2.4); sound.play(fav ? 'fav' : 'ok');
    if (fav) a.shake = 0.4;
    reward(gi, res.hearts);
    if (res.learned) later(0.8, () => toast('📖 すきな たべものが わかった！'));
  });
}

// ---------- ゆび の そうさ ----------
function hitGuest(p, rect = roomRect()) {
  const gi = C.guestAt(save, curRoom); if (gi < 0) return null;
  const s = actorScreen(gi, rect);
  const dx = (p.x - s.bc.x) / (s.r * actors[gi].puff), dy = (p.y - s.bc.y) / (s.r * actors[gi].puff);
  return dx * dx + dy * dy < 1.25 ? { gi, dx, dy, r: s.r } : null;
}
function hitWaitingGuest(p) {
  const L = hotelLayout(), rect = L.cells[0].rect;
  for (let gi = guests().length - 1; gi >= 0; gi--) {
    if (guests()[gi].room >= 0) continue;
    const s = actorScreen(gi, rect);
    if (Math.hypot(p.x - s.bc.x, p.y - s.bc.y) < s.r * 1.4) return gi;
  }
  return -1;
}

function onDown(p) {
  if (scene === 'hotel') {
    const wg = hitWaitingGuest(p);
    if (wg >= 0) { guestDrag = { gi: wg, p, start: p, moved: false }; poke(actors[wg], 0.2); sound.play('pick'); return; }
    down = { p, cam0: camX, panned: false };
    return;
  }
  if (scene === 'bath') { bath.last = p; bathMove(p); return; }
  if (scene !== 'room') return;
  const rect = roomRect();
  if (!decor) {
    const f = faceSlots().find(f => Math.hypot(p.x - f.x, p.y - f.y) < f.r + 6);
    if (f) { goToGuest(f.gi); return; }
  }
  if (decor) {
    const s = rect.w / ROOM.w, u = (p.x - rect.x) / s, v = (p.y - rect.y) / s;
    const items = save.rooms[curRoom].items;
    const order = [
      ...items.filter(it => ITEMS[it.id].zone === 'floor' && !ITEMS[it.id].flat).sort((a, b) => b.y - a.y),
      ...items.filter(it => ITEMS[it.id].flat),
      ...items.filter(it => ITEMS[it.id].zone === 'wall'),
    ];
    const hit = order.find(it => { const b = D.itemBox(it); return u >= b.x0 - 10 && u <= b.x1 + 10 && v >= b.y0 - 10 && v <= b.y1 + 10; });
    if (hit) { drag = { id: hit.id, item: hit, fromDrawer: false, off: { x: hit.x - u, y: hit.y - v }, p, start: p, moved: false }; sound.play('pick'); }
    return;
  }
  const gi = C.guestAt(save, curRoom);
  if (gi < 0 || eating) return;
  const s = rect.w / ROOM.w;
  if (care?.type === 'food') {
    for (let i = 0; i < care.foods.length; i++) {
      const h = foodHome(rect, i);
      if (Math.hypot(p.x - h.x, p.y - h.y) < rect.w * 0.035) { foodDrag = { i, x: p.x, y: p.y }; sound.play('pick'); return; }
    }
  }
  if (care?.type === 'play' && !care.toy) {
    const b = toyHome(rect, 0), w = toyHome(rect, 1);
    if (Math.hypot(p.x - b.x, p.y - b.y) < rect.w * 0.06) { chooseToy('bubble'); return; }
    if (Math.hypot(p.x - w.x, p.y - w.y) < rect.w * 0.06) { chooseToy('ball'); return; }
  }
  if (care?.type === 'play' && care.toy === 'ball' && care.ball.state === 'rest') {
    const b = care.ball;
    if (Math.hypot(p.x - (rect.x + b.x * s), p.y - (rect.y + b.y * s)) < 70 * s + 30) { care.ballDrag = { hist: [{ p, t: T }] }; b.state = 'hold'; sound.play('pick'); return; }
  }
  if (care?.type === 'play' && care.toy === 'bubble') {
    const h = toyHome(rect, 0);
    if (Math.hypot(p.x - h.x, p.y - h.y) < rect.w * 0.07) { blowBubbles(); return; }
    const hitB = care.bubbles.find(b => Math.hypot(p.x - (rect.x + b.x * s), p.y - (rect.y + b.y * s)) < b.r * s + 20);
    if (hitB) { popBubble(hitB); return; }
  }
  if (care?.type === 'dress') {
    const i = ACC_IDS.findIndex((_, i) => { const h = accHome(rect, i); return Math.hypot(p.x - h.x, p.y - h.y) < rect.w * 0.04; });
    if (i >= 0) { care.accDrag = { id: ACC_IDS[i], x: p.x, y: p.y }; sound.play('pick'); return; }
  }
  if (care?.type === 'special' && specialDown(p, rect)) return;
  const hg = hitGuest(p, rect);
  if (hg && sleepCareOn(gi)) { tapSleep(gi, p); return; }
  if (hg && !actors[gi].asleep) { petting = { gi, last: p }; poke(actors[gi], 0.15); }
}

function onMove(p) {
  if (guestDrag) { guestDrag.p = p; if (Math.hypot(p.x - guestDrag.start.x, p.y - guestDrag.start.y) > 14) guestDrag.moved = true; return; }
  if (down && scene === 'hotel') {
    const dx = p.x - down.p.x;
    if (Math.abs(dx) > 14) down.panned = true;
    if (down.panned) { camX = down.cam0 - dx; camTarget = null; }
    return;
  }
  if (scene === 'bath' && bath) { bathMove(p); return; }
  if (drag) { drag.p = p; if (drag.start && Math.hypot(p.x - drag.start.x, p.y - drag.start.y) > 12) drag.moved = true; return; }
  if (care?.accDrag) { care.accDrag.x = p.x; care.accDrag.y = p.y; return; }
  if (care?.type === 'special') { specialMove(p, roomRect()); return; }
  if (care?.ballDrag) {
    const rect = roomRect(), s = rect.w / ROOM.w, b = care.ball;
    b.x = clamp((p.x - rect.x) / s, 40, 960); b.y = clamp((p.y - rect.y) / s, 200, 580);
    care.ballDrag.hist.push({ p, t: T }); if (care.ballDrag.hist.length > 6) care.ballDrag.hist.shift();
    return;
  }
  if (foodDrag) {
    foodDrag.x = p.x; foodDrag.y = p.y;
    const gi = C.guestAt(save, curRoom); if (gi < 0) return;
    const s = actorScreen(gi, roomRect()), a = actors[gi];
    const dist = Math.hypot(p.x - s.bc.x, p.y - (s.bc.y + s.r * 0.26));
    a.mouth = clamp(1.5 - dist / (s.r * 1.8), 0, 1);
    if (a.mouth > 0.05 && T > a.moodUntil - 0.2) setMood(a, 'eat', 0.3);
    a.look = clamp((p.x - s.bc.x) / (s.r * 3), -1, 1); a.lookUntil = T + 0.3;
    return;
  }
  if (petting) {
    const hg = hitGuest(p);
    const d = Math.hypot(p.x - petting.last.x, p.y - petting.last.y);
    petting.last = p;
    if (!hg || d < 1) return;
    const gi = hg.gi, a = actors[gi], g = guests()[gi], sp = SPECIES[g.species];
    const spot = C.spotAt(hg.dx, hg.dy), fav = spot === sp.spot;
    setMood(a, fav ? 'bliss' : 'happy', 0.5);
    sound.play('pet', 0.35);
    if (Math.random() < 0.08) poke(a, 0.08);
    if (Math.random() < (fav ? 0.2 : 0.08)) sparkles(p.x, p.y, 1, 20);
    if (fav) {
      a.favRub += d;
      if (a.favRub > hg.r * 1.6 && !a.spotSaid) {
        a.spotSaid = true; say(a, sp.say.spot, 2);
        notes(p.x, p.y - 30, 4);
        if (C.learnSpot(save, g.species)) { persist(); later(0.6, () => toast('📖 なでると よろこぶ ところが わかった！')); }
      }
    }
    if (showNeed(gi) === 'pet') {
      a.pet += d / (hg.r * 11) * (fav ? 1.7 : 1);
      a.allD += d; if (fav) a.favD += d;
      if (a.pet >= 1) {
        const res = C.petDone(save, gi, a.favD / Math.max(1, a.allD));
        say(a, sp.say.petEnd, 2.2); setMood(a, 'bliss', 1.8); sound.play(res.hearts > 1 ? 'fav' : 'ok');
        petting = null;
        reward(gi, res.hearts);
      }
    }
  }
}

function onUp(p, cancel) {
  if (guestDrag) {
    const gd = guestDrag; guestDrag = null;
    if (cancel) return;
    const L = hotelLayout();
    if (!gd.moved) {
      // タッチだけ → えらんで、へやを タッチ
      selected = gd.gi; say(actors[gd.gi], TAGS[guests()[gd.gi].wish].wish.replace('\n', ''), 2.2);
      toast('つれていく へやを タッチしてね'); return;
    }
    const cell = L.cells.find(c => c.kind === 'room' && inRect(p, c.rect));
    if (cell) tryCheckIn(gd.gi, cell.idx); else sound.play('no');
    return;
  }
  if (down && scene === 'hotel') {
    const d = down; down = null;
    if (d.panned || cancel) return;
    hotelTap(p);
    return;
  }
  if (scene === 'bath' && bath) { bath.last = null; if (bath.phase === 'rinse') bath.shower = null; return; }
  if (drag && !drag.fromDrawer && !drag.moved && !cancel) {
    if (C.recolor(drag.item)) { sound.play('pop'); persist(); const gi = C.guestAt(save, curRoom); if (gi >= 0 && Math.random() < 0.5) later(0.2, () => say(actors[gi], 'いい いろ〜', 1.4)); }
    drag = null;
    return;
  }
  if (drag) {
    const rect = roomRect(), pos = dragRoomPos(rect);
    if (!cancel && pos.inside) {
      if (drag.fromDrawer) C.placeItem(save, curRoom, drag.id, pos.x, pos.y);
      else { drag.item.x = pos.x; drag.item.y = pos.y; C.clampItem(drag.item); }
      sound.play('drop');
      decorChanged({ kind: 'item', id: drag.id });
    } else if (!cancel && !drag.fromDrawer) {
      C.removeItem(save, curRoom, drag.item); sound.play('pick'); decorChanged(null);
    }
    drag = null;
    return;
  }
  if (care?.ballDrag) {
    const h = care.ballDrag.hist, b = care.ball, rect = roomRect(), s = rect.w / ROOM.w;
    care.ballDrag = null;
    const a0 = h[0], a1 = h[h.length - 1], dt = Math.max(0.016, a1.t - a0.t);
    let vx = (a1.p.x - a0.p.x) / s / dt, vy = (a1.p.y - a0.p.y) / s / dt;
    if (Math.hypot(vx, vy) < 200) { vx = 650; vy = -700; }
    b.vx = clamp(vx, -1600, 1600); b.vy = clamp(vy, -1500, 600); b.state = 'fly';
    sound.play('pop');
    return;
  }
  if (care?.accDrag) {
    const id = care.accDrag.id; care.accDrag = null;
    const gi = C.guestAt(save, curRoom);
    if (gi >= 0 && !cancel) dropAcc(gi, id, p);
    return;
  }
  if (care?.type === 'special') { care.swipe = null; care.rub = null; return; }
  if (foodDrag) {
    const gi = C.guestAt(save, curRoom);
    if (gi >= 0 && !cancel) {
      const s = actorScreen(gi, roomRect());
      if (care?.foods && Math.hypot(p.x - s.bc.x, p.y - (s.bc.y + s.r * 0.26)) < s.r * 0.95) feed(gi, care.foods[foodDrag.i]);
    }
    foodDrag = null;
    return;
  }
  petting = null;
}

function hotelTap(p) {
  const L = hotelLayout();
  const canL = camX > -L.maxPan + 5, canR = camX < L.maxPan - 5;
  if (L.maxPan > 0 && Math.abs(p.y - H / 2) < 60 && ((p.x < 64 && canL) || (p.x > W - 64 && canR))) { sound.play('tap'); camTarget = clamp(camX + Math.sign(p.x - W / 2) * (L.cw + L.pad) * 1.5, -L.maxPan, L.maxPan); return; }
  const cell = L.cells.find(c => inRect(p, c.rect));
  if (!cell) return;
  if (cell.kind === 'room') {
    if (selected >= 0 && guests()[selected]?.room < 0) { tryCheckIn(selected, cell.idx); return; }
    enterRoom(cell.idx);
  } else if (cell.kind === 'lobby') { punyu.v += 2.5; sound.play('bell'); tipText = HINTS[hintIdx++ % HINTS.length]; tipUntil = T + 3.5; }
  else if (cell.kind === 'locked') { sound.play('tap'); toast('ハートを あつめると へやが ふえるよ'); }
  else if (cell.kind === 'suiteLocked') { sound.play('tap'); toast(`ハートが ${SUITE_HEARTS} で スイートルームが できるよ`); }
}

function tryCheckIn(gi, roomIdx) {
  const g = guests()[gi], a = actors[gi], sp = SPECIES[g.species];
  if (C.guestAt(save, roomIdx) >= 0) { sound.play('no'); toast('そこは ほかの おきゃくさんが いるよ'); return; }
  if (!C.roomFits(save, g.species, roomIdx)) { sound.play('no'); toast(sp.big ? 'おおきくて はいれないよ〜 👑スイートへ！' : 'そこは おおきな おきゃくさんの へやだよ'); return; }
  const res = C.checkIn(save, gi, roomIdx);
  if (!res) return;
  selected = -1;
  save.tips.checkins = (save.tips.checkins || 0) + 1;
  persist();
  a.x = 500; a.tx = 500; a.y = a.baseY; a.pop = 0; a.needAt = T + 2.4; a.lastComment = T;
  sound.play('door');
  if (res.liked.length) {
    later(0.4, () => { say(a, `${res.liked.map(t => TAGS[t].icon).join('')} ${sp.say.room}`, 2.6); setMood(a, 'happy', 2.5); sound.play('like'); reward(gi, res.hearts); a.needAt = T + 2.4; });
    later(1.4, () => toast('📖 すきな かざりが わかった！'));
    if (res.full) later(2.2, () => fullRoomFx(gi));
  } else {
    later(0.4, () => { say(a, sp.say.roomMeh, 2.6); setMood(a, 'pout', 2); });
    if (!save.tips.meh) { save.tips.meh = true; later(3, () => toast('かざりを たすと よろこぶかも！')); }
  }
}

// すきな ものが ぜんぶ そろった へや
function fullRoomFx(gi) {
  const p = guestScreenAnywhere(gi).head, a = actors[gi];
  confetti(p.x, p.y); sparkles(p.x, p.y, 16, 120); jump(a);
  say(a, 'だいすきな へや！ ゆめみたい〜！', 2.6); setMood(a, 'bliss', 2.4); sound.play('unlock');
  toast('💖 すきな ものが ぜんぶ そろった！', 2.4);
}

function goToGuest(gi) {
  const g = guests()[gi];
  sound.play('tap');
  if (g.room < 0) { leaveRoom(); focusCell(-1); return; }
  if (g.room !== curRoom) enterRoom(g.room);
}

// ---------- がめんの きりかえ ----------
function enterRoom(idx) {
  scene = 'room'; curRoom = idx; decor = false; care = null; eating = null; sound.play('door');
  const gi = C.guestAt(save, idx);
  if (gi >= 0) {
    const a = actors[gi];
    if (!a.asleep && T - a.lastComment > 25) { a.lastComment = T; later(0.4, () => roomComment(gi)); }
    if (showNeed(gi)) firstTip('tool', 'ひかっている ボタンを おしてね');
  } else firstTip('empty', 'ここは あきべや。 かざって みよう！');
}
// へやの かんそう（すきな 家具を なまえで いう）
function roomComment(gi) {
  const g = guests()[gi], a = actors[gi], sp = SPECIES[g.species], room = save.rooms[g.room];
  const items = C.likedItems(room, g.species);
  if (items.length) { const it = items[Math.floor(Math.random() * items.length)]; say(a, `${ITEMS[it.id].name}、すてき！`, 2.2); setMood(a, 'happy', 1.5); }
  else if (C.likedTags(room, g.species).length) say(a, sp.say.room, 2.2);
  else if (room.items.length <= 2) say(a, 'ちょっと さみしい へや…', 2.2);
  else say(a, 'いい へや だね', 2);
}
function leaveRoom() {
  scene = 'hotel'; decor = false; care = null; foodDrag = null; drag = null; eating = null; sound.play('tap');
  focusCell(curRoom);
}

$('backBtn').onclick = () => {
  sound.play('tap');
  if (scene === 'bath') { bath = null; scene = 'room'; actors.forEach(a => { a.puffT = 1; }); return; }
  leaveRoom();
};
$('decorBtn').onclick = () => { decor = true; care = null; tab = 'item'; sound.play('pop'); renderDrawer(); requestAnimationFrame(paintArrows); if (save.tips.decor && !save.tips.recolor) firstTip('recolor', 'かぐを タッチすると いろが かわるよ'); firstTip('decor', 'かぐを うえに ひっぱって はこんでね'); };
$('decorDone').onclick = () => { decor = false; drag = null; sound.play('ok'); };
for (const b of document.querySelectorAll('.dtabs button')) b.onclick = () => { tab = b.dataset.tab; sound.play('tap'); renderDrawer(); $('drawerItems').scrollLeft = 0; paintArrows(); };

const REFUSE = { food: 'いまは おなか すいてないよ', bath: 'いまは きれいだよ', play: 'いまは あそばない〜', sleep: 'まだ ねむくないよ', dress: 'いまは このままで いいよ', special: 'いまは だいじょうぶ〜' };
for (const b of document.querySelectorAll('.tool')) b.onclick = () => {
  sound.unlock();
  const gi = C.guestAt(save, curRoom); if (gi < 0 || scene !== 'room' || eating) return;
  const need = showNeed(gi), tool = b.dataset.tool, a = actors[gi];
  if (a.asleep) { say(a, 'すやすや…', 1.4); sound.play('tap'); return; }
  if (tool === 'pet') { handHint = T + 2; sound.play('tap'); return; }
  if (care?.type === tool) { care = null; sound.play('tap'); return; }
  if (need !== tool) { refuse(gi, C.isHappy(guests()[gi]) ? 'もう まんぞく〜' : REFUSE[tool]); return; }
  if (tool === 'food') { care = { type: 'food', gi, foods: C.plateFoods(guests()[gi].species) }; sound.play('pop'); firstTip('food', 'たべものを くちまで はこんでね'); }
  else if (tool === 'dress') { care = { type: 'dress', gi }; sound.play('pop'); firstTip('dress', 'すきな ものを あたまに のせてね'); }
  else if (tool === 'special') startSpecial(gi);
  else if (tool === 'bath') startBath(gi);
  else if (tool === 'play') startPlay(gi);
  else if (tool === 'sleep') startSleep(gi);
};

// ---------- よる → あさ（チェックアウト・おてがみ・ぞうちく）----------
$('sleepBtn').onclick = () => {
  if (!C.allDone(save) || scene !== 'hotel') return;
  sound.play('night');
  scene = 'night'; nightTarget = 1; selected = -1;
  later(3, () => {
    const departing = guests().map((g, gi) => ({ species: g.species, a: actors[gi], room: g.room }));
    const res = C.endDay(save);
    persist();
    actors = [];
    morning(departing, res);
  });
};

function morning(departing, res) {
  scene = 'morning'; nightTarget = 0;
  pendingBuild = new Set(res.unlocked);
  focusCell(-1);
  sound.play('morning');
  let t = 1.4;
  departing.forEach(d => {
    later(t, () => {
      const a = d.a; a.asleep = false; a.x = 820; a.tx = DOOR_X; a.y = LOBBY_Y; a.ty = LOBBY_Y; a.lift = 0; a.liftT = 0; a.alpha = 1; a.pop = 1;
      leavers.push({ species: d.species, a });
      say(a, SPECIES[d.species].say.bye, 2.4); sound.play('pop');
      later(2.4, () => sound.play('door'));
    });
    t += 2.8;
  });
  later(t + 0.4, () => showLetters(res.letters, 0, () => buildRooms([...res.unlocked], res)));
}

function buildRooms(list, res) {
  if (!list.length) {
    beginDay();
    if (res?.newSpecies?.length) later(2.6, () => { toast('🎉 あたらしい おきゃくさんが くるように なったよ！', 2.8); sound.play('gift'); });
    return;
  }
  const idx = list.shift();
  focusCell(idx);
  later(0.6, () => {
    pendingBuild.delete(idx);
    building = { idx, t0: T };
    sound.play('scrub');
    const knock = setInterval(() => sound.play('drop'), 250);
    later(2, () => {
      clearInterval(knock);
      const c = cellOf(hotelLayout(), idx);
      if (c) { sparkles(c.rect.x + c.rect.w / 2, c.rect.y + c.rect.h / 2, 20, c.rect.w * 0.4); confetti(c.rect.x + c.rect.w / 2, c.rect.y + c.rect.h / 2); }
      building = null; sound.play('unlock'); toast(save.rooms[idx]?.suite ? '👑 スイートルームが できたよ！' : '🏨 あたらしい へやが できたよ！', 2.4);
      later(2.4, () => buildRooms(list, res));
    });
  });
}

function beginDay() {
  leavers = [];
  const gi = C.startDay(save);
  persist();
  actors = [];
  syncActors();
  scene = 'hotel'; curRoom = -1; focusCell(-1);
  if (gi >= 0) arrivalFx(gi);
}
function arrivalFx(gi) {
  const g = guests()[gi], a = actors[gi];
  sound.play('bell');
  later(0.5, () => { say(a, SPECIES[g.species].say.arrive, 2.2); sound.play('door'); });
  if (SPECIES[g.species].big) { later(0.9, () => { sound.play('unlock'); toast('✨ おおきな おきゃくさんが きたよ！ 👑スイートへ', 2.8); }); focusCell(-1); }
  if (SPECIES[g.species].land && save.zukan[g.species].met <= 1) later(SPECIES[g.species].big ? 3.8 : 1, () => { punyu.v += 3; sound.play('like'); toast('🌟 ぷにゅランドから ともだちが きたよ！', 2.8); tipText = 'わあ！ ぷにゅランドの\nともだちだ〜！'; tipUntil = T + 4; });
  if (scene === 'room' || scene === 'bath') toast('🛎️ おきゃくさんが きたよ！', 2.2);
}

// ---------- おてがみ ----------
function letterCard(l) {
  const el = document.createElement('div'); el.className = 'letter';
  const stamp = thumb(g => D.drawCreature(g, l.species, 50, 86, 30, { t: 1, mood: 'happy' }));
  stamp.className = 'stamp';
  el.append(stamp);
  const body = document.createElement('div'); body.className = 'lines';
  l.lines.forEach((line, i) => { const p = document.createElement('p'); p.textContent = line; if (i === 0) p.className = 'to'; if (i === l.lines.length - 1) p.className = 'from'; body.append(p); });
  el.append(body);
  if (l.gift) {
    const gift = document.createElement('div'); gift.className = 'giftbox';
    gift.append(l.gift.kind === 'item' ? itemThumb(l.gift.id) : decoThumb(l.gift.kind, l.gift.id));
    const name = l.gift.kind === 'item' ? ITEMS[l.gift.id].name : l.gift.kind === 'wall' ? `かべがみ「${WALLS[l.gift.id].name}」` : `ゆか「${FLOORS[l.gift.id].name}」`;
    gift.insertAdjacentHTML('beforeend', `<small>おみやげ</small><b>${name}</b>`);
    el.append(gift);
  }
  return el;
}
function showLetters(list, i, done) {
  if (i >= list.length) { showScreen(null); done && done(); return; }
  const l = list[i];
  const box = $('letterBox'); box.innerHTML = ''; box.append(letterCard(l));
  $('letterTitle').textContent = done ? '💌 おてがみが とどいたよ！' : '💌 おてがみ';
  $('letterNext').textContent = i < list.length - 1 ? 'つぎの おてがみ' : done ? 'よんだ！' : 'とじる';
  l.read = true;
  const saved = save.letters.find(x => x === l || (x.species === l.species && x.day === l.day && x.lines.join() === l.lines.join()));
  if (saved) saved.read = true;
  persist();
  showScreen('letterView');
  sound.play(done ? 'gift' : 'tap');
  $('letterNext').onclick = () => { sound.play('tap'); showLetters(list, i + 1, done); if (!done && i + 1 >= list.length) showScreen('letters'); };
}
function renderLetters() {
  const box = $('letterList'); box.innerHTML = '';
  if (!save.letters.length) { box.innerHTML = '<p class="note">まだ おてがみは ないよ。<br>おきゃくさんが かえるときに くれるよ。</p>'; return; }
  [...save.letters].reverse().forEach(l => {
    const el = document.createElement('button'); el.className = 'mini' + (l.read ? '' : ' new');
    el.append(thumb(g => D.drawCreature(g, l.species, 50, 88, 30, { t: 1, mood: 'happy' })));
    el.insertAdjacentHTML('beforeend', `<small>${l.day}にちめ</small><b>${SPECIES[l.species].name}</b>`);
    el.onclick = () => { showLetters([l], 0, null); };
    box.append(el);
  });
}

function thumb(draw, px = 100) {
  const c = document.createElement('canvas'); c.width = c.height = px * 2;
  const g = c.getContext('2d'); g.scale(px * 2 / 100, px * 2 / 100);
  draw(g); return c;
}
const itemThumb = id => thumb(g => {
  const d = ITEMS[id], s = Math.min(84 / d.w, 84 / d.h);
  g.translate(50, d.zone === 'floor' && !d.flat ? 50 + d.h * s / 2 : 50); g.scale(s, s);
  D.drawItem(g, id, { t: 0 });
});
const decoThumb = (kind, id) => thumb(g => {
  D.rr(g, 6, 6, 88, 88, 16); g.save(); g.clip();
  g.scale(0.3, 0.3);
  if (kind === 'wall') { g.translate(-20, -10); D.drawWall(g, id); } else { g.translate(-20, -395); D.drawFloor(g, id); }
  g.restore();
  g.strokeStyle = '#e4c9d4'; g.lineWidth = 3; D.rr(g, 6, 6, 88, 88, 16); g.stroke();
});

// ---------- かざりつけ ----------
function decorChanged(what) {
  persist();
  renderDrawer();
  const gi = C.guestAt(save, curRoom);
  if (gi < 0 || !what) return;
  const a = actors[gi], g = guests()[gi], sp = SPECIES[g.species];
  const r = C.decorReact(save, curRoom);
  const name = what.kind === 'item' ? ITEMS[what.id].name : what.kind === 'wall' ? 'この かべ' : 'この ゆか';
  if (r) {
    later(0.3, () => {
      say(a, `わあ！ ${name}、だいすき！`, 2.4); setMood(a, 'happy', 2); sound.play('like');
      reward(r.guest, r.hearts);
      toast('📖 すきな かざりが わかった！');
    });
    if (r.full) later(1.8, () => fullRoomFx(r.guest));
    return;
  }
  const tags = what.kind === 'item' ? ITEMS[what.id].tags : what.kind === 'wall' ? WALLS[what.id].tags : FLOORS[what.id].tags;
  if (tags.some(t => sp.likes.includes(t))) later(0.3, () => { say(a, `${name}、いいね！`, 1.8); jump(a); });
  else if (Math.random() < 0.4) later(0.3, () => { notes(guestScreenAnywhere(gi).head.x, guestScreenAnywhere(gi).head.y, 1); });
}

function renderDrawer() {
  for (const b of document.querySelectorAll('.dtabs button')) b.classList.toggle('on', b.dataset.tab === tab);
  const box = $('drawerItems'); box.innerHTML = '';
  const room = save.rooms[curRoom]; if (!room) return;
  if (tab === 'item') {
    for (const id of Object.keys(ITEMS).filter(id => save.owned[id] > 0 && !(id === 'bigbed' && !room.suite))) {
      const n = C.available(save, id);
      const el = document.createElement('div'); el.className = 'ditem' + (n ? '' : ' empty'); el.dataset.id = id;
      el.append(itemThumb(id));
      el.insertAdjacentHTML('beforeend', `<div class="dname">${ITEMS[id].name}</div><div class="count">${n}</div>`);
      box.append(el);
    }
  } else {
    const list = tab === 'wall' ? save.walls : save.floors, table = tab === 'wall' ? WALLS : FLOORS;
    for (const id of list) {
      const el = document.createElement('div'); el.className = 'ditem' + ((tab === 'wall' ? room.wall : room.floor) === id ? ' on' : ''); el.dataset.id = id;
      el.append(decoThumb(tab, id));
      el.insertAdjacentHTML('beforeend', `<div class="dname">${table[id].name}</div>`);
      box.append(el);
    }
  }
  paintArrows();
}

// ひきだし：よこに スワイプで スクロール、うえに ひっぱると 家具を もつ、タッチで おく
let press = null;
function paintArrows() {
  const box = $('drawerItems');
  $('drawerL').classList.toggle('off', box.scrollLeft <= 2);
  $('drawerR').classList.toggle('off', box.scrollLeft + box.clientWidth >= box.scrollWidth - 2);
}
$('drawerItems').addEventListener('scroll', paintArrows);
$('drawerL').onclick = () => { sound.play('tap'); $('drawerItems').scrollBy({ left: -$('drawerItems').clientWidth * 0.8, behavior: 'smooth' }); };
$('drawerR').onclick = () => { sound.play('tap'); $('drawerItems').scrollBy({ left: $('drawerItems').clientWidth * 0.8, behavior: 'smooth' }); };
$('drawerItems').addEventListener('pointerdown', e => {
  sound.unlock(); e.preventDefault();
  if (pointerId !== null) return;
  pointerId = e.pointerId;
  const el = e.target.closest('.ditem');
  press = { x0: e.clientX, y0: e.clientY, sx: $('drawerItems').scrollLeft, id: el?.dataset.id || null, kind: tab, mode: null };
});
function startItemDrag(id, e) {
  if (!C.available(save, id)) { sound.play('no'); return false; }
  const d = ITEMS[id];
  drag = { id, item: null, fromDrawer: true, off: { x: 0, y: d.zone === 'floor' && !d.flat ? d.h * 0.45 : 0 }, p: toV(e) };
  sound.play('pick');
  return true;
}
function drawerMove(e) {
  const dx = e.clientX - press.x0, dy = e.clientY - press.y0;
  if (!press.mode) {
    if (press.kind === 'item' && press.id && dy < -12 && Math.abs(dy) > Math.abs(dx) * 0.7) {
      const id = press.id; press = null;
      if (!startItemDrag(id, e)) press = { mode: 'none' };
      return;
    }
    if (Math.abs(dx) > 8) press.mode = 'scroll';
  }
  if (press.mode === 'scroll') $('drawerItems').scrollLeft = press.sx - dx;
}
function drawerUp() {
  const p = press; press = null;
  if (p.mode || !p.id) return;
  const room = save.rooms[curRoom]; if (!room) return;
  // タッチだけ：家具は へやに おく／かべがみ・ゆかは かえる
  if (p.kind === 'item') {
    const d = ITEMS[p.id];
    if (!C.available(save, p.id)) { sound.play('no'); return; }
    const y = d.zone === 'wall' ? rand(130, 230) : d.flat ? rand(500, 560) : rand(470, 600);
    C.placeItem(save, curRoom, p.id, rand(220, 780), y);
    sound.play('drop'); decorChanged({ kind: 'item', id: p.id });
  } else {
    if (p.kind === 'wall') room.wall = p.id; else room.floor = p.id;
    sound.play('pop'); decorChanged({ kind: p.kind, id: p.id });
  }
}

// ---------- ずかん・せってい ----------
const TOY_ICON = { ball: '⚽', bubble: '🫧' };
function renderZukan() {
  const box = $('zukanCards'); box.innerHTML = '';
  for (const [id, sp] of Object.entries(SPECIES)) {
    const z = save.zukan[id], met = z.met > 0;
    const el = document.createElement('div'); el.className = 'card' + (sp.big ? ' big' : '');
    el.append(thumb(g => {
      g.translate(0, 8);
      D.drawCreature(g, id, 50, 82, sp.big ? 27 : 30, { t: 1, mood: met ? 'happy' : 'normal', flame: 1, bloom: 1, shine: 1 });
      if (!met) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#c9bcc4'; g.fillRect(0, -10, 100, 110); }
    }));
    const q = '<span class="q">？</span>';
    const food = f => FOODS.find(x => x.id === f);
    const tags = sp.likes.map(t => (z.tags.includes(t) ? TAGS[t].icon : q)).join(' ');
    const rows = [
      ['とまった かず', z.met],
      ['すきな たべもの', z.fav ? `<span class="fi">${food(sp.fav).icon}</span>` : q],
      ['にがてな たべもの', z.dislike ? `<span class="fi">${food(sp.dislike).icon}</span>` : q],
      ['すきな あそび', z.toy ? `<span class="fi">${TOYS[sp.toy].icon}</span>` : q],
      ['すきな おしゃれ', z.acc ? `<span class="fi">${ACCS[sp.acc].icon}</span>` : q],
      ['なでると よろこぶ', z.spot ? SPOTS[sp.spot] : q],
      ['おふろ', z.bath ? (sp.bath === 'daisuki' ? 'だいすき' : 'にがて') : q],
      ...(sp.special ? [['とくべつな おせわ', met ? SPECIALS[sp.special].icon : q]] : []),
      ['すきな かざり', tags],
    ];
    el.insertAdjacentHTML('beforeend', `
      <div class="name">${met ? sp.name : '？？？'}</div>
      <div class="kind">${met ? sp.kind : sp.big ? 'おおきな おきゃくさん' : 'まだ あっていないよ'}</div>
      <dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`);
    box.append(el);
  }
}

let overlay = null;
function showScreen(id) {
  overlay = id;
  for (const s of ['title', 'settings', 'zukan', 'letters', 'letterView']) $(s).hidden = s !== id;
}
$('zukanBtn').onclick = () => { sound.play('tap'); renderZukan(); showScreen('zukan'); };
$('letterBtn').onclick = () => { sound.play('tap'); renderLetters(); showScreen('letters'); };
$('setBtn').onclick = () => { sound.play('tap'); paintSettings(); showScreen('settings'); };
for (const b of document.querySelectorAll('.back')) b.onclick = () => { sound.play('tap'); showScreen(scene === 'title' ? 'title' : null); };
function paintSettings() {
  $('soundBtn').textContent = save.sound ? '🔊 おと：オン' : '🔈 おと：オフ';
  $('soundBtn').classList.toggle('on', save.sound);
  $('resetBtn').textContent = 'さいしょから あそぶ'; $('resetBtn').dataset.sure = '';
}
$('soundBtn').onclick = () => {
  save.sound = !save.sound; sound.setOn(save.sound); persist(); paintSettings();
  if (save.sound) { sound.unlock(); sound.startBgm(); sound.play('tap'); }
};
$('resetBtn').onclick = () => {
  const b = $('resetBtn');
  if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'ほんとうに けす？ もういちど おしてね'; return; }
  const snd = save.sound;
  save = C.newSave(); save.sound = snd; persist();
  shownHearts = 0; parts = []; timers = []; leavers = []; care = null; camX = 0;
  showScreen(null); beginDay();
};

$('playBtn').onclick = () => {
  sound.unlock(); sound.startBgm(); sound.play('bell');
  showScreen(null);
  if (!save.today) beginDay();
  else { resetActors(); scene = 'hotel'; focusCell(-1); }
};

// ---------- DOM の ひょうじ ----------
let uiKey = '';
function syncUI() {
  const gi = scene === 'room' ? C.guestAt(save, curRoom) : -1;
  const need = gi >= 0 ? showNeed(gi) : null;
  const hudMode = scene === 'hotel' ? 'hotel' : scene === 'bath' ? 'bath' : decor ? 'decor' : 'room';
  const unread = save.letters.filter(l => !l.read).length;
  const asleep = gi >= 0 && actors[gi]?.asleep;
  const key = [scene, decor, overlay, gi, need, shownHearts, save.day, C.allDone(save), hudMode, unread, care?.type, asleep].join('|');
  if (key === uiKey) return;
  uiKey = key;
  const inGame = scene === 'hotel' || scene === 'room' || scene === 'bath';
  $('hud').hidden = !inGame;
  $('hud').className = hudMode;
  $('heartCount').textContent = shownHearts;
  $('dayPill').textContent = `${save.day}にちめ`;
  $('letterBtn').classList.toggle('new', unread > 0);
  $('tools').hidden = !(scene === 'room' && !decor && gi >= 0);
  $('tools').classList.toggle('asleep', !!asleep);
  const sp = gi >= 0 ? SPECIES[guests()[gi].species] : null;
  const spb = document.querySelector('.tool[data-tool=special]');
  spb.hidden = !sp?.special;
  if (sp?.special) { spb.querySelector('span').textContent = SPECIALS[sp.special].icon; spb.querySelector('small').textContent = SPECIALS[sp.special].name; }
  for (const b of document.querySelectorAll('.tool')) {
    b.classList.toggle('want', b.dataset.tool === need && !care);
    b.classList.toggle('on', b.dataset.tool === care?.type);
  }
  $('drawer').hidden = !(scene === 'room' && decor);
  $('sleepBtn').hidden = !(scene === 'hotel' && C.allDone(save) && !overlay);
}

// ---------- まいフレーム ----------
function update(dt) {
  T += dt;
  night += (nightTarget - night) * Math.min(1, dt * 1.5);
  if (camTarget !== null) { camX += (camTarget - camX) * Math.min(1, dt * 5); if (Math.abs(camTarget - camX) < 1) camTarget = null; }
  if (scene === 'hotel' && guestDrag) {
    const edge = 150, x = guestDrag.p.x;
    if (x < edge) { camX -= (edge - x) / edge * 900 * dt; camTarget = null; }
    else if (x > W - edge) { camX += (x - (W - edge)) / edge * 900 * dt; camTarget = null; }
  }
  const due = timers.filter(t => t.at <= T); timers = timers.filter(t => t.at > T);
  due.forEach(t => t.fn());
  // つぎの おきゃくさん
  if ((scene === 'hotel' || scene === 'room' || scene === 'bath') && C.canArrive(save)) {
    const gi = C.arrive(save); persist(); syncActors(); arrivalFx(gi);
  }
  updateActors(dt);
  updateBath(dt);
  updatePlay(dt);
  updateParts(dt);
  // ときどき ひとりごと
  if (scene === 'hotel' && T > idleAt) {
    idleAt = T + rand(7, 12);
    const cands = guests().map((g, gi) => gi).filter(gi => guests()[gi].room >= 0 && !actors[gi].asleep && T > actors[gi].sayUntil);
    if (cands.length) {
      const gi = cands[Math.floor(Math.random() * cands.length)], need = showNeed(gi), sp = SPECIES[guests()[gi].species];
      say(actors[gi], need ? needSay(guests()[gi], need) : sp.say.idle[Math.floor(Math.random() * sp.say.idle.length)], 2.2);
    }
  }
  if (scene === 'night' && Math.random() < dt * 3) parts.push({ k: 'zz', x: rand(W * 0.3, W * 0.7), y: H * 0.5, vx: rand(-20, 20), vy: -50, t: 0, life: 2, s: 40 });
}

function draw() {
  ctx.setTransform(S * DPR, 0, 0, S * DPR, 0, 0);
  speeches = [];
  if (scene === 'room') drawRoomView();
  else if (scene === 'bath' && bath) drawBath();
  else drawHotel();
  for (const sp of speeches) D.drawSpeech(ctx, sp.x, sp.y, sp.text, sp.size);
  drawParts();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  try { update(dt); draw(); syncUI(); } catch (e) { console.error(e); }
  requestAnimationFrame(frame);
}

canvas.addEventListener('pointerdown', e => {
  sound.unlock();
  if (pointerId !== null) return;
  pointerId = e.pointerId;
  onDown(toV(e));
});
addEventListener('pointermove', e => { if (e.pointerId !== pointerId) return; if (press) { if (press.mode !== 'none') drawerMove(e); return; } onMove(toV(e)); });
const up = e => { if (e.pointerId !== pointerId) return; pointerId = null; if (press) { if (press.mode !== 'none' && e.type !== 'pointercancel') drawerUp(); press = null; return; } onUp(toV(e), e.type === 'pointercancel'); };
addEventListener('pointerup', up);
addEventListener('pointercancel', up);

// ---------- テスト用 ----------
if (DEBUG) {
  const dbg = $('debug'); dbg.hidden = false;
  const btn = (label, fn) => { const b = document.createElement('button'); b.textContent = label; b.onclick = fn; dbg.append(b); };
  btn('❤+10', () => { save.hearts += 10; shownHearts = save.hearts; persist(); });
  btn('ぜんぶ おせわ', () => {
    for (const [gi, g] of guests().entries()) { if (g.room < 0) C.checkIn(save, gi, C.freeRooms(save, g.species)[0]); g.done = g.needs.length; }
    while (C.canArrive(save) || save.today?.queue.length) { if (guests().some(g => g.room < 0)) break; const gi = C.arrive(save); syncActors(); const g = guests()[gi]; C.checkIn(save, gi, C.freeRooms(save, g.species)[0]); g.done = g.needs.length; }
    syncActors(); actors.forEach(a => { a.thanked = true; a.asleep = true; }); persist();
  });
  btn('データけす', () => { localStorage.removeItem(STORE); location.reload(); });
  window.__save = () => save;
  window.__focus = idx => { focusCell(idx); };
  window.__T = () => T;
  window.__state = () => ({ scene, curRoom, decor, bath, T, care: care && { ...care }, camX, overlay });
  // がめんの ばしょ（CSS ピクセル）。じどう テストで つかう
  window.__geom = () => {
    const px = p => ({ x: p.x * S, y: p.y * S });
    const L = hotelLayout();
    const out = { cells: L.cells.map(c => ({ kind: c.kind, idx: c.idx, ...px({ x: c.rect.x + c.rect.w / 2, y: c.rect.y + c.rect.h / 2 }) })) };
    out.waiting = guests().map((g, gi) => (g.room < 0 ? { gi, ...px(actorScreen(gi, L.cells[0].rect).bc) } : null)).filter(Boolean);
    if (scene === 'room') {
      const rect = roomRect(); out.room = { ...px(rect), w: rect.w * S, h: rect.h * S };
      const gi = C.guestAt(save, curRoom);
      if (gi >= 0) { const a = actorScreen(gi, rect); out.body = px(a.bc); out.r = a.r * S; out.mouth = px({ x: a.bc.x, y: a.bc.y + a.r * 0.26 }); }
      out.foods = FOODS.map((_, i) => px(foodHome(rect, i)));
      out.toys = [0, 1].map(i => px(toyHome(rect, i)));
      if (care?.type === 'play' && care.toy) { const s = rect.w / ROOM.w; out.ball = px({ x: rect.x + care.ball.x * s, y: rect.y + care.ball.y * s }); out.bubbles = care.bubbles.map(b => px({ x: rect.x + b.x * s, y: rect.y + b.y * s })); }
      out.faces = faceSlots().map(f => ({ gi: f.gi, ...px(f) }));
      out.accs = ACC_IDS.map((_, i) => px(accHome(rect, i)));
      if (gi >= 0) { const tp = tailPos(gi, rect); out.tail = px(tp); out.head = px(actorScreen(gi, rect).head); }
      if (care?.type === 'special' && care.stars) { const s2 = rect.w / ROOM.w; out.stars = care.stars.map(q => px({ x: rect.x + q.x * s2, y: rect.y + q.y * s2 })); }
      if (care?.type === 'special' && care.kind === 'janken') out.janken = [0, 1, 2].map(i => px(jankenHome(rect, i)));
      if (care?.type === 'special' && care.kind === 'pinwheel') out.pinwheel = px(pinwheelPos(rect));
      if (care?.type === 'special' && care.shells) { const s2 = rect.w / ROOM.w; out.shells = care.shells.map(q => px({ x: rect.x + q.x * s2, y: rect.y + q.y * s2 })); }
    }
    if (scene === 'bath' && bath) { const b = bathBody(bath.gi); out.body = px(b.bc); out.r = b.r * S; }
    return out;
  };
}

if (save.today) resetActors();
showScreen('title');
$('loading').hidden = true;
requestAnimationFrame(frame);
