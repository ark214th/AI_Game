import { SPECIES, FOODS, ITEMS, WALLS, FLOORS, NEEDS, SPOTS, TAGS, ROOM, MAX_ROOMS } from './data.mjs';
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

// ---------- じょうたい ----------
let scene = 'title';           // title / hotel / room / bath / night / morning
let T = 0;
let curRoom = -1, decor = false, tab = 'item';
let night = 0, nightTarget = 0;
let actors = [];
let parts = [];
let timers = [];
let shownHearts = save.hearts;
let plate = null, foodDrag = null, petting = null, drag = null, bath = null;
let handHint = 0, tipUntil = 0, tipText = '', hintIdx = 0;
const punyu = { sq: 0, v: 0 };
let speeches = [];
let pointerId = null;

const later = (sec, fn) => timers.push({ at: T + sec, fn });
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const guests = () => save.today?.guests || [];
const R_BASE = 105;

function toast(str, sec = 1.8) {
  const t = $('toast');
  t.textContent = str; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), sec * 1000);
}
function firstTip(key, str) { if (save.tips[key]) return; save.tips[key] = true; persist(); later(0.3, () => toast(str, 2.6)); }

// ---------- おきゃくさん（うごき）----------
function genDirt() { return Array.from({ length: 5 }, (_, i) => ({ x: rand(-0.6, 0.6), y: -0.62 + i * 0.18 + rand(-0.05, 0.05), a: 1 })); }
function makeActor(g) {
  return {
    x: rand(320, 680), tx: 500, y: g.species === 'fuwari' ? 500 : 525, sq: 0, v: 0,
    mood: 'normal', moodUntil: 0, say: '', sayUntil: 0, look: 0, lookUntil: 0, shake: 0, puff: 1, puffT: 1, mouth: 0,
    needAt: T + 1.5, dirt: null, pet: 0, favD: 0, allD: 0, favRub: 0, spotSaid: false, wanderAt: 0, pop: 1, greeted: false, hop: 0,
  };
}
function resetActors() { actors = guests().map(makeActor); }
const poke = (a, v = 0.25) => { a.v += v * 7; };
const setMood = (a, m, sec = 1.5) => { a.mood = m; a.moodUntil = T + sec; };
const say = (a, str, sec = 2.4) => { a.say = str; a.sayUntil = T + sec; };
function moodOf(gi) {
  const a = actors[gi], g = guests()[gi];
  if (T < a.moodUntil) return a.mood;
  if (night > 0.5) return 'sleep';
  return C.isHappy(g) ? 'happy' : 'normal';
}
const showNeed = gi => { const g = guests()[gi]; return g && night < 0.3 && T >= actors[gi].needAt ? C.needOf(g) : null; };
const stOf = gi => {
  const a = actors[gi];
  return { t: T + gi * 1.7, sq: a.sq, mood: moodOf(gi), look: a.look, mouth: a.mouth, dirt: C.needOf(guests()[gi]) === 'bath' ? a.dirt : null, puff: a.puff, shake: a.shake };
};

function updateActors(dt) {
  guests().forEach((g, gi) => {
    const a = actors[gi]; if (!a) return;
    const acc = -120 * a.sq - 9 * a.v;
    a.v += acc * dt; a.sq = clamp(a.sq + a.v * dt, -0.3, 0.3);
    a.shake = Math.max(0, a.shake - dt * 1.2);
    a.puff += (a.puffT - a.puff) * Math.min(1, dt * 4);
    a.pop = Math.min(1, a.pop + dt * 2.5);
    if (T > a.lookUntil) a.look *= 0.9;
    if (!(foodDrag && C.guestAt(save, curRoom) === gi)) a.mouth *= 0.85;
    if (C.needOf(g) === 'bath' && !a.dirt) a.dirt = genDirt();
    const inView = (scene === 'room' || scene === 'bath') && curRoom === g.room && !decor;
    if (inView) a.tx = 560;
    else if (T > a.wanderAt && night < 0.5) { a.tx = rand(260, 740); a.wanderAt = T + rand(3, 7); }
    const d = a.tx - a.x;
    if (Math.abs(d) > 4) {
      a.x += Math.sign(d) * Math.min(Math.abs(d), 90 * dt);
      if (T > a.lookUntil) a.look = Math.sign(d) * 0.6;
      a.hop += dt * 9; if (Math.sin(a.hop) > 0.97) poke(a, 0.05);
    }
  });
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
      if (p.k === 'drop') p.vy += 1400 * dt;
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
    else if (p.k === 'note') { ctx.globalAlpha = 1 - u; D.text(ctx, '♪', p.x, p.y, p.s, { color: '#ff6f91' }); ctx.globalAlpha = 1; }
    else if (p.k === 'zz') { ctx.globalAlpha = Math.sin(u * Math.PI); D.text(ctx, 'Z', p.x, p.y, p.s, { color: '#fff', stroke: '#7a6ee0', sw: 5 }); ctx.globalAlpha = 1; }
    else if (p.k === 'drop') { ctx.fillStyle = 'rgba(120,200,255,.85)'; D.ell(ctx, p.x, p.y, 5, 11); ctx.fill(); }
    else if (p.k === 'pop') { ctx.globalAlpha = 1 - u; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; D.circ(ctx, p.x, p.y, p.s * (1 + u)); ctx.stroke(); ctx.globalAlpha = 1; }
  }
}

// ---------- ホテルの ならびかた ----------
function hotelLayout() {
  const n = save.rooms.length, locked = n < MAX_ROOMS ? 1 : 0;
  const slots = 1 + n + locked, floors = Math.ceil(slots / 2);
  const top = 100, roofH = 110, groundH = 70, pad = 14;
  const availH = H - top - roofH - groundH - 6;
  let ch = Math.min(250, (availH - pad * (floors + 1)) / floors), cw = ch * 1.6;
  if (2 * cw + 3 * pad > W - 40) { cw = (W - 40 - 3 * pad) / 2; ch = cw / 1.6; }
  const bw = 2 * cw + 3 * pad, bh = floors * ch + (floors + 1) * pad;
  const bx = (W - bw) / 2, by = H - groundH - bh;
  const cells = [];
  for (let i = 0; i < slots; i++) {
    const f = Math.floor(i / 2), col = i % 2;
    const rect = { x: bx + pad + col * (cw + pad), y: by + bh - pad - (f + 1) * ch - f * pad, w: cw, h: ch };
    cells.push(i === 0 ? { kind: 'lobby', rect } : i <= n ? { kind: 'room', idx: i - 1, rect } : { kind: 'locked', rect });
  }
  return { bx, by, bw, bh, pad, roofH, floors, cw, ch, cells };
}

function roomRect() {
  const top = H * 0.12 + 8;
  let availW, availH;
  if (decor) { availH = H - H * 0.25 - top - 14; availW = W - 40; }
  else if (W / H < 1.6) { availH = H - top - (H * 0.15 + 30); availW = W - 40; }
  else { availW = W - 2 * (H * 0.15 + 40); availH = H - top - 16; }
  const w = Math.min(availW, availH * 1.6), h = w / 1.6;
  return { x: (W - w) / 2, y: top + (availH - h) / 2, w, h };
}

// へやの ざひょう → がめんの ざひょう
function actorScreen(gi, rect) {
  const a = actors[gi], g = guests()[gi], s = rect.w / ROOM.w;
  const r = R_BASE * D.depth(a.y) * a.pop * s;
  const x = rect.x + a.x * s, y = rect.y + a.y * s;
  const bc = D.bodyCenter(g.species, x, y, r, { t: T + gi * 1.7, sq: a.sq, puff: a.puff });
  return { x, y, r, bc, head: { x: bc.x, y: bc.y - r * a.puff - 8 } };
}

// ---------- かく ----------
function drawRoomCell(idx, rect, big) {
  const gi = C.guestAt(save, idx);
  const extras = [];
  if (gi >= 0 && actors[gi]) {
    const g = guests()[gi], a = actors[gi];
    extras.push({ y: a.y, draw: c => D.drawCreature(c, g.species, a.x, a.y, R_BASE * D.depth(a.y) * a.pop, stOf(gi)) });
  }
  D.drawRoom(ctx, save.rooms[idx], rect, {
    t: T, night: night > 0.5, extras, hide: drag?.item,
    after: c => {
      if (gi < 0 || !actors[gi]) return;
      const a = actors[gi], g = guests()[gi], r = R_BASE * D.depth(a.y) * a.pop;
      const topY = a.y - D.hoverOf(g.species, r, T + gi * 1.7) - r * 2 * a.puff;
      const need = showNeed(gi);
      if (need && scene !== 'bath' && !(big && T < a.sayUntil)) {
        const bx = a.x + r * 0.95, by = topY + 40, size = big ? 100 : 140;
        D.drawNeedBubble(c, bx, by, NEEDS[need].icon, size, Math.max(0, Math.sin(T * 4)));
        if (need === 'pet' && a.pet > 0) {
          c.strokeStyle = '#ff6f91'; c.lineWidth = size * 0.09; c.lineCap = 'round';
          c.beginPath(); c.arc(bx, by - size * 0.62, size * 0.55, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, a.pet)); c.stroke();
        }
      } else if (C.isHappy(g) && night < 0.5 && Math.sin(T * 2 + gi) > 0.2) {
        D.text(c, '♪', a.x + r * 0.9, topY + 10 - Math.sin(T * 2 + gi) * 14, big ? 48 : 70, { color: '#ff6f91', stroke: '#fff', sw: 8 });
      }
    },
  });
  ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = big ? 8 : 4; D.rr(ctx, rect.x, rect.y, rect.w, rect.h, big ? 16 : 8); ctx.stroke();
  if (gi >= 0 && actors[gi]) {
    const a = actors[gi];
    if (a.say && T < a.sayUntil) { const p = actorScreen(gi, rect); speeches.push({ x: p.head.x, y: p.head.y, text: a.say, size: big ? 34 : 26 }); }
    if (night > 0.5 && Math.random() < 0.012) { const p = actorScreen(gi, rect); parts.push({ k: 'zz', x: p.head.x + p.r * 0.5, y: p.head.y, vx: 20, vy: -30, t: 0, life: 2, s: big ? 40 : 24 }); }
  }
}

function drawHotel() {
  const L = hotelLayout();
  D.drawSky(ctx, W, H, night, T);
  D.drawGround(ctx, W, H, L.by + L.bh - 4, night);
  D.drawHotelShell(ctx, L, night);
  for (const cell of L.cells) {
    if (cell.kind === 'lobby') {
      const s = cell.rect.w / ROOM.w;
      D.drawLobby(ctx, cell.rect, { night: night > 0.5, extras: [{ y: 420, draw: c => D.drawCreature(c, 'punyu', 530, 420, 88, { t: T, sq: punyu.sq, mood: night > 0.5 ? 'sleep' : 'happy' }) }] });
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 4; D.rr(ctx, cell.rect.x, cell.rect.y, cell.rect.w, cell.rect.h, 8); ctx.stroke();
      const tip = currentTip();
      if (tip && scene === 'hotel') speeches.push({ x: cell.rect.x + 530 * s, y: cell.rect.y + 240 * s, text: tip, size: 26 });
    } else if (cell.kind === 'room') drawRoomCell(cell.idx, cell.rect, false);
    else D.drawLockedCell(ctx, cell.rect, C.nextRoomHearts(save), save.hearts);
  }
}

function currentTip() {
  if (!save.today || night > 0.3) return '';
  if (C.allDone(save)) return 'みんな まんぞく！\nおやすみ しようね';
  if (T < tipUntil) return tipText;
  const started = guests().some(g => g.done > 0);
  if (save.day === 1 && !started) return 'ふきだしの ある へやを\nタッチしてね';
  return '';
}
const HINTS = ['へやを かざると\nおきゃくさんが よろこぶよ', 'すきな たべものが\nあるみたい', 'なでると よろこぶ\nところが あるよ', 'ハートを あつめると\nへやが ふえるよ', 'ずかんも みてみてね'];

function drawRoomView() {
  ctx.fillStyle = '#ffe0ea'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffd3e0';
  for (let x = 0; x < W; x += 60) ctx.fillRect(x, 0, 30, H);
  const rect = roomRect();
  drawRoomCell(curRoom, rect, true);
  const gi = C.guestAt(save, curRoom);
  // なまえ
  if (gi >= 0) {
    const sp = SPECIES[guests()[gi].species];
    const ny = rect.y + rect.h - 80, nx = rect.x + rect.w - 286;
    ctx.fillStyle = 'rgba(255,255,255,.92)'; D.rr(ctx, nx, ny, 270, 64, 32); ctx.fill();
    D.text(ctx, sp.name, nx + 24, ny + 32, 32, { align: 'left' });
    D.text(ctx, sp.kind, nx + 134, ny + 34, 20, { align: 'left', color: '#a08596' });
  } else if (!decor) {
    D.text(ctx, 'あきべや', rect.x + rect.w / 2, rect.y + rect.h * 0.4, 40, { color: '#fff', stroke: 'rgba(90,61,85,.4)' });
    D.text(ctx, '「かざる」で すきに かざってね', rect.x + rect.w / 2, rect.y + rect.h * 0.4 + 56, 28, { color: '#fff', stroke: 'rgba(90,61,85,.4)' });
  }
  // おさら
  if (plate && gi >= 0) {
    const pc = plateCenter(rect);
    ctx.fillStyle = 'rgba(90,61,85,.15)'; D.ell(ctx, pc.x, pc.y + 14, rect.w * 0.13, rect.w * 0.035); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#ffc2d3'; ctx.lineWidth = 6;
    D.ell(ctx, pc.x, pc.y, rect.w * 0.13, rect.w * 0.04); ctx.fill(); ctx.stroke();
    FOODS.forEach((f, i) => {
      if (foodDrag?.i === i) return;
      const h = foodHome(rect, i);
      D.emoji(ctx, f.icon, h.x, h.y + Math.sin(T * 3 + i) * 3, rect.w * 0.07);
    });
    if (foodDrag) D.emoji(ctx, FOODS[foodDrag.i].icon, foodDrag.x, foodDrag.y, rect.w * 0.085);
  }
  // なでかたの おてほん
  if (T < handHint && gi >= 0) {
    const p = actorScreen(gi, rect), u = (handHint - T) * 3;
    D.emoji(ctx, '👆', p.bc.x + Math.sin(u * 2.2) * p.r * 0.5, p.bc.y - p.r * 0.2 + 40, 70);
  }
  // かざりつけで ひっぱっている もの
  if (drag) drawDragged(rect);
}

const plateCenter = rect => ({ x: rect.x + rect.w * 0.2, y: rect.y + rect.h * 0.86 });
const foodHome = (rect, i) => { const c = plateCenter(rect); return { x: c.x + (i - 1) * rect.w * 0.08, y: c.y - rect.w * 0.025 }; };

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
  const s = rect.w / ROOM.w, d = ITEMS[drag.id];
  const drawerTop = $('drawer').getBoundingClientRect().top / S;
  const inside = drag.p.y < drawerTop - 10 && drag.p.x > rect.x - 40 && drag.p.x < rect.x + rect.w + 40 && drag.p.y > rect.y - 60;
  const it = C.clampItem({ id: drag.id, x: (drag.p.x - rect.x) / s + drag.off.x, y: (drag.p.y - rect.y) / s + drag.off.y });
  void d;
  return { inside, x: it.x, y: it.y };
}

// ---------- おふろ ----------
function bathGeom() {
  const r = Math.min(H * 0.22, W * 0.15), tubTop = H * 0.7;
  return { cx: W / 2, feet: tubTop + r * 0.5, r, tubTop, tubW: r * 3.6 };
}
function startBath(gi) {
  const g = guests()[gi], a = actors[gi], sp = SPECIES[g.species];
  scene = 'bath'; plate = null;
  bath = { gi, phase: 'soap', foam: [], shower: null, rub: 0 };
  if (!a.dirt) a.dirt = genDirt();
  a.dirt.forEach(d => { d.a = 1; });
  say(a, sp.say.bathStart, 2.6);
  setMood(a, sp.bath === 'nigate' ? 'pout' : 'happy', 2);
  firstTip('bath', 'ゆびで こすって あわあわ しよう！');
  sound.play('door');
}
function bathBody(gi) {
  const g = guests()[gi], a = actors[gi], G = bathGeom();
  const bc = D.bodyCenter(g.species, G.cx, G.feet, G.r, { t: T + gi * 1.7, sq: a.sq, puff: a.puff });
  return { bc, r: G.r * a.puff, G };
}
function drawBath() {
  const gi = bath.gi, g = guests()[gi], a = actors[gi];
  const { bc, r, G } = bathBody(gi);
  // タイルの かべ
  ctx.fillStyle = '#d7f0ff'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#bfe3f7'; ctx.lineWidth = 4;
  for (let x = 0; x < W; x += 90) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 90) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.fillStyle = '#aee0f5'; ctx.fillRect(0, H * 0.8, W, H * 0.2);
  // あひる
  D.emoji(ctx, '🐥', G.cx + G.tubW * 0.36, G.tubTop - 18 + Math.sin(T * 2) * 5, 64);
  // おゆの うしろがわ
  ctx.fillStyle = '#e9f7ff'; D.ell(ctx, G.cx, G.tubTop, G.tubW / 2, 40); ctx.fill();
  D.drawCreature(ctx, g.species, G.cx, G.feet, G.r, { ...stOf(gi), dirt: a.dirt });
  // あわ
  for (const f of bath.foam) {
    const x = bc.x + f.x * r, y = bc.y + f.y * r, s = f.s * r * (f.grow < 1 ? f.grow : 1);
    ctx.fillStyle = 'rgba(255,255,255,.95)'; D.circ(ctx, x, y, s); ctx.fill();
    ctx.strokeStyle = 'rgba(180,215,240,.8)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(200,230,255,.9)'; D.circ(ctx, x - s * 0.35, y - s * 0.35, s * 0.2); ctx.fill();
  }
  // おふろおけ（まえ）
  ctx.fillStyle = '#ffffff'; D.rr(ctx, G.cx - G.tubW / 2, G.tubTop, G.tubW, H - G.tubTop + 40, 60); ctx.fill();
  ctx.fillStyle = '#ffb3c8'; D.rr(ctx, G.cx - G.tubW / 2, G.tubTop + 40, G.tubW, 26, 13); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#d6ecf7'; ctx.lineWidth = 6;
  D.ell(ctx, G.cx, G.tubTop, G.tubW / 2 + 10, 26); ctx.stroke();
  for (let i = 0; i < 9; i++) { D.circ(ctx, G.cx - G.tubW * 0.42 + i * G.tubW * 0.105, G.tubTop - 4 + Math.sin(T * 3 + i) * 3, 22 + (i % 3) * 6); ctx.fill(); }
  // シャワー
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
  const msg = bath.phase === 'soap' ? 'ゴシゴシ こすって あわあわ！' : bath.phase === 'rinse' ? 'シャワーで あわを ながそう！' : 'ピカピカ！';
  D.text(ctx, msg, W / 2, H * 0.17, 46, { color: '#fff', stroke: '#5cb8e8', sw: 12 });
}

function bathDown(p) { bath.last = p; bathMove(p); }
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
    if (a.dirt.every(s => s.a < 0.05) && bath.foam.length >= 16) {
      bath.phase = 'rinse'; sound.play('ok');
    }
  } else if (bath.phase === 'rinse') {
    bath.shower = { x: p.x, y: Math.min(p.y, bc.y - r * 1.25) };
  }
}
function updateBath(dt) {
  if (!bath) return;
  for (const f of bath.foam) f.grow = Math.min(1, (f.grow || 0) + dt * 5);
  const gi = bath.gi, a = actors[gi], g = guests()[gi];
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
      bath.phase = 'done';
      a.puffT = 1; sound.play('shine');
      const sp = SPECIES[g.species];
      setMood(a, 'happy', 3); say(a, sp.say.bathEnd, 2.4);
      if (g.species === 'fuwari') a.shake = 1.2;
      poke(a, 0.3);
      sparkles(bc.x, bc.y, 14, r);
      later(2.3, finishBath);
    }
  } else if (bath.phase !== 'done') a.puffT = 1;
}
function finishBath() {
  if (!bath) return;
  const gi = bath.gi, a = actors[gi];
  const res = C.bathDone(save, gi);
  bath = null; scene = 'room'; a.dirt = null;
  persist();
  later(0.2, () => { reward(gi, res.hearts); if (res.learned) toast('📖 ずかんに かいたよ！'); });
}

// ---------- おせわの けっか ----------
function reward(gi, hearts) {
  const a = actors[gi], g = guests()[gi];
  let pos;
  if (scene === 'room' && curRoom === g.room) pos = actorScreen(gi, roomRect()).head;
  else { const cell = hotelLayout().cells.find(c => c.kind === 'room' && c.idx === g.room); pos = cell ? actorScreen(gi, cell.rect).head : { x: W / 2, y: H / 2 }; }
  burstHearts(pos.x, pos.y, hearts);
  sparkles(pos.x, pos.y + 40, 6, 60);
  poke(a, 0.3);
  a.needAt = T + 1.8;
  a.pet = 0; a.favD = 0; a.allD = 0;
  persist();
  if (C.isHappy(g) && !a.thanked) {
    a.thanked = true;
    later(1.2, () => { say(a, 'ありがとう！ だいまんぞく！', 2.4); setMood(a, 'happy', 2.4); sound.play('like'); });
    if (C.allDone(save)) later(2.2, () => { toast('みんな まんぞく！ 🌙'); });
  }
}

function refuse(gi, str) {
  const a = actors[gi]; sound.play('no'); a.shake = 0.7; say(a, str, 1.6);
}

// ごはん
function feed(gi, food) {
  const a = actors[gi], g = guests()[gi], sp = SPECIES[g.species];
  const res = C.feed(save, gi, food);
  a.mouth = 1; setMood(a, 'eat', 0.4);
  if (res.result === 'dislike') {
    sound.play('yuck'); setMood(a, 'yuck', 1.6); a.shake = 1.1; say(a, sp.say.dislike, 2.2); a.look = -1; a.lookUntil = T + 1.5;
    if (res.learned) { persist(); later(0.8, () => toast('📖 にがてな たべものが わかった！')); }
    return;
  }
  sound.play('munch');
  plate = null;
  later(0.45, () => {
    const fav = res.result === 'fav';
    setMood(a, fav ? 'happy' : 'happy', 2); say(a, fav ? sp.say.fav : sp.say.ok, 2.4); sound.play(fav ? 'fav' : 'ok');
    reward(gi, res.hearts);
    if (res.learned) later(0.8, () => toast('📖 すきな たべものが わかった！'));
  });
}

// ---------- ゆび の そうさ ----------
function hitGuest(p) {
  const gi = C.guestAt(save, curRoom); if (gi < 0) return null;
  const s = actorScreen(gi, roomRect());
  const dx = (p.x - s.bc.x) / (s.r * actors[gi].puff), dy = (p.y - s.bc.y) / (s.r * actors[gi].puff);
  return dx * dx + dy * dy < 1.25 ? { gi, dx, dy, r: s.r } : null;
}

function onDown(p) {
  if (scene === 'hotel') {
    const cell = hotelLayout().cells.find(c => p.x >= c.rect.x && p.x <= c.rect.x + c.rect.w && p.y >= c.rect.y && p.y <= c.rect.y + c.rect.h);
    if (!cell) return;
    if (cell.kind === 'room') enterRoom(cell.idx);
    else if (cell.kind === 'lobby') { punyu.v += 2.5; sound.play('bell'); tipText = HINTS[hintIdx++ % HINTS.length]; tipUntil = T + 3.5; }
    else { sound.play('tap'); toast('ハートを あつめると へやが ふえるよ'); }
    return;
  }
  if (scene === 'bath') { bathDown(p); return; }
  if (scene !== 'room') return;
  const rect = roomRect();
  if (decor) {
    const s = rect.w / ROOM.w, u = (p.x - rect.x) / s, v = (p.y - rect.y) / s;
    const items = save.rooms[curRoom].items;
    const order = [
      ...items.filter(it => ITEMS[it.id].zone === 'floor' && !ITEMS[it.id].flat).sort((a, b) => b.y - a.y),
      ...items.filter(it => ITEMS[it.id].flat),
      ...items.filter(it => ITEMS[it.id].zone === 'wall'),
    ];
    const hit = order.find(it => { const b = D.itemBox(it); return u >= b.x0 - 10 && u <= b.x1 + 10 && v >= b.y0 - 10 && v <= b.y1 + 10; });
    if (hit) { drag = { id: hit.id, item: hit, fromDrawer: false, off: { x: hit.x - u, y: hit.y - v }, p }; sound.play('pick'); }
    return;
  }
  const gi = C.guestAt(save, curRoom);
  if (gi < 0) return;
  if (plate) {
    for (let i = 0; i < FOODS.length; i++) {
      const h = foodHome(rect, i);
      if (Math.hypot(p.x - h.x, p.y - h.y) < rect.w * 0.05) { foodDrag = { i, x: p.x, y: p.y }; sound.play('pick'); return; }
    }
  }
  const hg = hitGuest(p);
  if (hg) { petting = { gi, last: p }; poke(actors[gi], 0.15); }
}

function onMove(p) {
  if (scene === 'bath' && bath) { bathMove(p); return; }
  if (drag) { drag.p = p; return; }
  if (foodDrag) {
    foodDrag.x = p.x; foodDrag.y = p.y;
    const gi = C.guestAt(save, curRoom); if (gi < 0) return;
    const s = actorScreen(gi, roomRect()), a = actors[gi];
    const mouth = { x: s.bc.x, y: s.bc.y + s.r * 0.26 };
    const dist = Math.hypot(p.x - mouth.x, p.y - mouth.y);
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
        for (let i = 0; i < 4; i++) parts.push({ k: 'note', x: p.x + rand(-40, 40), y: p.y - 30, vx: rand(-30, 30), vy: -80, t: -i * 0.15, life: 1.2, s: 40 });
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
  if (scene === 'bath' && bath) { bath.last = null; if (bath.phase === 'rinse') bath.shower = null; return; }
  if (drag) {
    const rect = roomRect(), pos = dragRoomPos(rect);
    if (!cancel && pos.inside) {
      if (drag.fromDrawer) C.placeItem(save, curRoom, drag.id, pos.x, pos.y);
      else { drag.item.x = pos.x; drag.item.y = pos.y; C.clampItem(drag.item); }
      sound.play('drop');
      decorChanged();
    } else if (!cancel && !drag.fromDrawer) {
      C.removeItem(save, curRoom, drag.item); sound.play('pick'); decorChanged();
    }
    drag = null;
    return;
  }
  if (foodDrag) {
    const gi = C.guestAt(save, curRoom);
    if (gi >= 0 && !cancel) {
      const s = actorScreen(gi, roomRect());
      if (Math.hypot(p.x - s.bc.x, p.y - (s.bc.y + s.r * 0.26)) < s.r * 0.95) feed(gi, FOODS[foodDrag.i].id);
    }
    foodDrag = null;
    return;
  }
  petting = null;
}

canvas.addEventListener('pointerdown', e => {
  sound.unlock();
  if (pointerId !== null) return;
  pointerId = e.pointerId;
  onDown(toV(e));
});
addEventListener('pointermove', e => { if (e.pointerId === pointerId) onMove(toV(e)); });
const up = e => { if (e.pointerId !== pointerId) return; pointerId = null; onUp(toV(e), e.type === 'pointercancel'); };
addEventListener('pointerup', up);
addEventListener('pointercancel', up);

// ---------- がめんの きりかえ ----------
function enterRoom(idx) {
  scene = 'room'; curRoom = idx; decor = false; plate = null; sound.play('door');
  const gi = C.guestAt(save, idx);
  if (gi >= 0) {
    const a = actors[gi], sp = SPECIES[guests()[gi].species];
    if (!a.greeted) { a.greeted = true; later(0.3, () => say(a, sp.say.hello, 2.2)); }
    if (showNeed(gi)) firstTip('tool', 'ひかっている ボタンを おしてね');
  } else firstTip('empty', 'ここは あきべや。 かざって みよう！');
}
function leaveRoom() {
  scene = 'hotel'; decor = false; plate = null; foodDrag = null; drag = null; sound.play('tap');
}

$('backBtn').onclick = () => {
  sound.play('tap');
  if (scene === 'bath') { bath = null; scene = 'room'; actors.forEach(a => { a.puffT = 1; }); return; }
  leaveRoom();
};
$('decorBtn').onclick = () => { decor = true; plate = null; tab = 'item'; sound.play('pop'); renderDrawer(); firstTip('decor', 'かぐを ゆびで はこんでね'); };
$('decorDone').onclick = () => { decor = false; drag = null; sound.play('ok'); };
for (const b of document.querySelectorAll('.dtabs button')) b.onclick = () => { tab = b.dataset.tab; sound.play('tap'); renderDrawer(); };

for (const b of document.querySelectorAll('.tool')) b.onclick = () => {
  sound.unlock();
  const gi = C.guestAt(save, curRoom); if (gi < 0 || scene !== 'room') return;
  const need = showNeed(gi), tool = b.dataset.tool;
  if (tool === 'food') {
    if (need === 'food') { plate = plate ? null : true; sound.play('pop'); if (plate) firstTip('food', 'たべものを くちまで はこんでね'); }
    else refuse(gi, C.isHappy(guests()[gi]) ? 'おなか いっぱい〜' : 'いまは おなか すいてないよ');
  } else if (tool === 'bath') {
    if (need === 'bath') startBath(gi);
    else refuse(gi, 'いまは きれいだよ');
  } else {
    handHint = T + 2; sound.play('tap');
  }
};

$('sleepBtn').onclick = () => {
  if (!C.allDone(save) || scene !== 'hotel') return;
  sound.play('night');
  scene = 'night'; nightTarget = 1;
  later(3.4, () => {
    const res = C.endDay(save);
    persist();
    showMorning(res);
  });
};

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

function showMorning(res) {
  scene = 'morning';
  const list = $('giftList'); list.innerHTML = '';
  for (const gf of res.gifts) {
    const el = document.createElement('div'); el.className = 'gift';
    const name = gf.kind === 'item' ? ITEMS[gf.id].name : gf.kind === 'wall' ? `かべがみ「${WALLS[gf.id].name}」` : `ゆか「${FLOORS[gf.id].name}」`;
    el.append(gf.kind === 'item' ? itemThumb(gf.id) : decoThumb(gf.kind, gf.id));
    el.insertAdjacentHTML('beforeend', `<div class="from">${SPECIES[gf.species].name} から おみやげ</div><div class="what">${name}</div>`);
    list.append(el);
  }
  $('unlockLine').hidden = !res.unlocked.length;
  $('morningTitle').textContent = 'あさに なったよ！';
  showScreen('morning');
  sound.play('gift');
  if (res.unlocked.length) later(0.8, () => sound.play('unlock'));
}

$('nextDayBtn').onclick = () => {
  showScreen(null);
  beginDay();
};

function beginDay() {
  const events = C.startDay(save);
  persist();
  resetActors();
  actors.forEach(a => { a.pop = 0; a.needAt = T + 2.2; });
  nightTarget = 0; scene = 'hotel'; curRoom = -1;
  sound.play('morning');
  later(0.6, () => sound.play('door'));
  events.forEach((ev, i) => later(1.4 + i * 0.8, () => {
    const a = actors[ev.guest], sp = SPECIES[guests()[ev.guest].species];
    if (!a) return;
    say(a, sp.say.room, 2.4); setMood(a, 'happy', 2.4); sound.play('like');
    reward(ev.guest, ev.hearts);
    if (!save.tips.likeRoom) { save.tips.likeRoom = true; later(0.8, () => toast('へやの かざりが すきみたい！')); }
  }));
}

function decorChanged() {
  persist();
  renderDrawer();
  const r = C.decorReact(save, curRoom);
  if (!r) return;
  const a = actors[r.guest], sp = SPECIES[guests()[r.guest].species];
  later(0.3, () => {
    say(a, `わあ！ ${r.tags.map(t => TAGS[t].icon).join('')} すき！`, 2.4); setMood(a, 'happy', 2); sound.play('like');
    reward(r.guest, r.hearts);
    toast('📖 すきな かざりが わかった！');
  });
}

function renderDrawer() {
  for (const b of document.querySelectorAll('.dtabs button')) b.classList.toggle('on', b.dataset.tab === tab);
  const box = $('drawerItems'); box.innerHTML = '';
  const room = save.rooms[curRoom]; if (!room) return;
  if (tab === 'item') {
    for (const id of Object.keys(ITEMS).filter(id => save.owned[id] > 0)) {
      const n = C.available(save, id);
      const el = document.createElement('div'); el.className = 'ditem' + (n ? '' : ' empty');
      el.append(itemThumb(id));
      el.insertAdjacentHTML('beforeend', `<div class="dname">${ITEMS[id].name}</div><div class="count">${n}</div>`);
      el.addEventListener('pointerdown', e => {
        sound.unlock(); e.preventDefault();
        if (pointerId !== null) return;
        if (!C.available(save, id)) { sound.play('no'); return; }
        pointerId = e.pointerId;
        const d = ITEMS[id];
        drag = { id, item: null, fromDrawer: true, off: { x: 0, y: d.zone === 'floor' && !d.flat ? d.h * 0.45 : 0 }, p: toV(e) };
        sound.play('pick');
      });
      box.append(el);
    }
  } else {
    const list = tab === 'wall' ? save.walls : save.floors, table = tab === 'wall' ? WALLS : FLOORS;
    for (const id of list) {
      const el = document.createElement('button'); el.className = 'ditem' + ((tab === 'wall' ? room.wall : room.floor) === id ? ' on' : '');
      el.append(decoThumb(tab, id));
      el.insertAdjacentHTML('beforeend', `<div class="dname">${table[id].name}</div>`);
      el.onclick = () => {
        if (tab === 'wall') room.wall = id; else room.floor = id;
        sound.play('pop'); decorChanged();
      };
      box.append(el);
    }
  }
}

// ---------- ずかん・せってい ----------
function renderZukan() {
  const box = $('zukanCards'); box.innerHTML = '';
  for (const [id, sp] of Object.entries(SPECIES)) {
    const z = save.zukan[id], met = z.met > 0;
    const el = document.createElement('div'); el.className = 'card';
    el.append(thumb(g => {
      g.translate(0, 8);
      D.drawCreature(g, id, 50, 82, 30, { t: 1, mood: met ? 'happy' : 'normal' });
      if (!met) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#c9bcc4'; g.fillRect(0, -10, 100, 110); }
    }));
    const q = '<span class="q">？</span>';
    const food = f => FOODS.find(x => x.id === f);
    const tags = sp.likes.map(t => (z.tags.includes(t) ? TAGS[t].icon : q)).join(' ');
    el.insertAdjacentHTML('beforeend', `
      <div class="name">${met ? sp.name : '？？？'}</div>
      <div class="kind">${met ? sp.kind : 'まだ あっていないよ'}</div>
      <dl>
        <dt>とまった かず</dt><dd>${z.met}</dd>
        <dt>すきな たべもの</dt><dd>${z.fav ? `<span class="fi">${food(sp.fav).icon}</span>` : q}</dd>
        <dt>にがてな たべもの</dt><dd>${z.dislike ? `<span class="fi">${food(sp.dislike).icon}</span>` : q}</dd>
        <dt>なでると よろこぶ</dt><dd>${z.spot ? SPOTS[sp.spot] : q}</dd>
        <dt>おふろ</dt><dd>${z.bath ? (sp.bath === 'daisuki' ? 'だいすき' : 'にがて') : q}</dd>
        <dt>すきな かざり</dt><dd>${tags}</dd>
      </dl>`);
    box.append(el);
  }
}

let overlay = null;
function showScreen(id) {
  overlay = id;
  for (const s of ['title', 'settings', 'zukan', 'morning']) $(s).hidden = s !== id;
}
$('zukanBtn').onclick = () => { sound.play('tap'); renderZukan(); showScreen('zukan'); };
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
  shownHearts = 0; parts = []; timers = [];
  showScreen(null); beginDay();
};

$('playBtn').onclick = () => {
  sound.unlock(); sound.startBgm(); sound.play('bell');
  showScreen(null);
  if (!save.today) beginDay();
  else { resetActors(); scene = 'hotel'; }
};

// ---------- DOM の ひょうじ ----------
let uiKey = '';
function syncUI() {
  const gi = scene === 'room' ? C.guestAt(save, curRoom) : -1;
  const need = gi >= 0 ? showNeed(gi) : null;
  const hudMode = scene === 'hotel' ? 'hotel' : scene === 'bath' ? 'bath' : decor ? 'decor' : 'room';
  const key = [scene, decor, overlay, gi, need, shownHearts, save.day, C.allDone(save), hudMode].join('|');
  if (key === uiKey) return;
  uiKey = key;
  const inGame = scene === 'hotel' || scene === 'room' || scene === 'bath';
  $('hud').hidden = !inGame;
  $('hud').className = hudMode;
  $('heartCount').textContent = shownHearts;
  $('dayPill').textContent = `${save.day}にちめ`;
  $('tools').hidden = !(scene === 'room' && !decor && gi >= 0);
  for (const b of document.querySelectorAll('.tool')) b.classList.toggle('want', b.dataset.tool === need);
  $('drawer').hidden = !(scene === 'room' && decor);
  $('sleepBtn').hidden = !(scene === 'hotel' && C.allDone(save) && !overlay);
}

// ---------- まいフレーム ----------
function update(dt) {
  T += dt;
  night += (nightTarget - night) * Math.min(1, dt * 1.5);
  const due = timers.filter(t => t.at <= T); timers = timers.filter(t => t.at > T);
  due.forEach(t => t.fn());
  updateActors(dt);
  updateBath(dt);
  updateParts(dt);
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

// ---------- テスト用 ----------
if (DEBUG) {
  const dbg = $('debug'); dbg.hidden = false;
  const btn = (label, fn) => { const b = document.createElement('button'); b.textContent = label; b.onclick = fn; dbg.append(b); };
  btn('❤+10', () => { save.hearts += 10; shownHearts = save.hearts; persist(); });
  btn('ぜんぶ おせわ', () => { for (const g of guests()) { g.done = g.needs.length; } actors.forEach(a => { a.thanked = true; }); persist(); });
  btn('データけす', () => { localStorage.removeItem(STORE); location.reload(); });
  window.__save = () => save;
  window.__state = () => ({ scene, curRoom, decor, bath, T, plate });
  // がめんの ばしょ（CSS ピクセル）。じどう テストで つかう
  window.__geom = () => {
    const px = p => ({ x: p.x * S, y: p.y * S });
    const out = { cells: hotelLayout().cells.map(c => ({ kind: c.kind, idx: c.idx, ...px({ x: c.rect.x + c.rect.w / 2, y: c.rect.y + c.rect.h / 2 }) })) };
    if (scene === 'room') {
      const rect = roomRect(); out.room = { ...px(rect), w: rect.w * S, h: rect.h * S };
      const gi = C.guestAt(save, curRoom);
      if (gi >= 0) { const a = actorScreen(gi, rect); out.body = px(a.bc); out.r = a.r * S; out.mouth = px({ x: a.bc.x, y: a.bc.y + a.r * 0.26 }); }
      out.foods = FOODS.map((_, i) => px(foodHome(rect, i)));
    }
    if (scene === 'bath' && bath) { const b = bathBody(bath.gi); out.body = px(b.bc); out.r = b.r * S; }
    return out;
  };
}

if (save.today) resetActors();
showScreen('title');
$('loading').hidden = true;
requestAnimationFrame(frame);
