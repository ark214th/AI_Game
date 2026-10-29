// オバケやしきの おかたづけ — 描画・入力・オバケの うごき
import * as C from './core.mjs';
import { sfx, unlockAudio } from './audio.mjs';

const { W, H, SERIES, ROWS, BASKET, CAP, PER } = C;
const canvas = document.getElementById('world');
const ctx = canvas.getContext('2d');
const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const FONT = '"Hiragino Maru Gothic ProN","Hiragino Sans","Yu Gothic",sans-serif';

let g, ghost, particles, texts, elapsed, nextGhost, shake, running = false;
let basketShake = 0;
const rowShake = ROWS.map(() => 0);
const pointer = { down: false, x: 0, y: 0, lighting: false };
const view = { scale: 1, ox: 0, oy: 0, dpr: 1 };
const rand = (a, b) => a + Math.random() * (b - a);

function reset() {
  g = C.createGame();
  g.items.forEach(it => { const t = C.targetPos(g, it); it.dx = t.x; it.dy = t.y; });
  ghost = null; particles = []; texts = [];
  elapsed = 0; nextGhost = 10; shake = 0;
}

// ---------- 入力 ----------
function toWorld(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left - view.ox) / view.scale, y: (e.clientY - r.top - view.oy) / view.scale };
}
const drawKey = (a, b) => (a.y + a.z * 30) - (b.y + b.z * 30);
function floorItemAt(p) {
  const list = g.items.filter(i => i.state === 'floor').sort(drawKey).reverse();
  return list.find(it => {
    const t = C.targetPos(g, it);
    return Math.abs(p.x - t.x) < 36 && p.y > t.y - 28 && p.y < t.y + 30;
  });
}
const rowIndexAt = p => ROWS.findIndex(r => p.x > r.x - 20 && p.x < r.x + r.w + 20 && p.y > r.y - 4 && p.y < r.y + r.h + 14);

canvas.addEventListener('pointerdown', e => {
  if (!running) return;
  try { canvas.setPointerCapture(e.pointerId); } catch {}
  const p = toWorld(e);
  Object.assign(pointer, { down: true, x: p.x, y: p.y });
  if (ghost && ghost.state === 'come' && Math.hypot(p.x - ghost.x, p.y - ghost.y) < 75) { pointer.lighting = true; return; }
  const it = floorItemAt(p);
  if (it) {
    const r = C.pick(g, it.id);
    if (r.ok) sfx.pick();
    else { say('かごが いっぱい！', BASKET.x, BASKET.y - 60, '#ffcf6b'); basketShake = 0.4; sfx.nope(); }
    return;
  }
  const ri = rowIndexAt(p);
  if (ri >= 0) put(ri);
});
canvas.addEventListener('pointermove', e => {
  if (!pointer.down) return;
  const p = toWorld(e); pointer.x = p.x; pointer.y = p.y;
});
const up = () => { pointer.down = false; pointer.lighting = false; };
canvas.addEventListener('pointerup', up);
canvas.addEventListener('pointercancel', up);

function put(ri) {
  const row = ROWS[ri];
  const r = C.putToRow(g, ri);
  if (!r.placed) {
    rowShake[ri] = 0.4; sfx.nope();
    say(r.why === 'empty' ? 'かごが からっぽ' : 'ここじゃ ないみたい', row.x + row.w / 2, row.y + 20, '#c9b8dc');
    return;
  }
  for (let k = 0; k < r.placed; k++) setTimeout(sfx.place, k * 70);
  say('+' + r.placed * C.COIN_BOOK, row.x + row.w / 2, row.y + 10, '#ffcf6b');
  r.completed.forEach(celebrate);
  if (C.isCleared(g)) setTimeout(finish, 900);
}
function celebrate(ri) {
  const row = ROWS[ri];
  sfx.row();
  say('そろった！ +' + C.COIN_ROW, row.x + row.w / 2, row.y + 40, '#fff7e6', 34);
  for (let k = 0; k < 40; k++) particles.push({
    x: rand(row.x, row.x + row.w), y: rand(row.y, row.y + row.h),
    vx: rand(-80, 80), vy: rand(-220, -60), life: rand(0.7, 1.3), c: k % 2 ? SERIES[row.s].color : '#ffcf6b',
  });
}
function say(text, x, y, color = '#fff7e6', size = 24) { texts.push({ text, x, y, color, size, life: 1.3 }); }

// ---------- オバケ ----------
function spawnGhost() {
  const ri = C.chooseGhostRow(g), row = ROWS[ri];
  const right = row.x + row.w / 2 > W / 2;
  const fromLeft = right ? Math.random() < 0.3 : Math.random() < 0.7;
  ghost = { x: fromLeft ? -70 : W + 70, y: rand(300, 420), ri, state: 'come', light: 0, t: 0, phase: Math.random() * 6 };
  sfx.ghost(); say('オバケが きた！', W / 2, 330, '#c9b8dc', 32);
}
function updateGhost(dt) {
  if (!ghost) {
    if (!C.isCleared(g)) { nextGhost -= dt; if (nextGhost <= 0) spawnGhost(); }
    return;
  }
  const o = ghost; o.t += dt;
  const row = ROWS[o.ri];
  if (o.state === 'come') {
    const tx = row.x + row.w / 2, ty = row.y + row.h / 2;
    const lit = pointer.lighting && pointer.down && Math.hypot(pointer.x - o.x, pointer.y - o.y) < 110;
    o.light = lit ? Math.min(1, o.light + dt / 0.9) : Math.max(0, o.light - dt * 0.6);
    const sp = lit ? 10 : 58;
    const dx = tx - o.x, dy = ty - o.y, d = Math.hypot(dx, dy);
    o.x += dx / d * sp * dt; o.y += dy / d * sp * dt;
    if (o.light >= 1) {
      o.state = 'flee'; pointer.lighting = false; C.scare(g); sfx.flee();
      say('ひゃ〜っ！ +' + C.COIN_SCARE, o.x, o.y - 70, '#ffcf6b', 28);
    } else if (d < 26) {
      o.state = 'laugh'; o.t = 0;
      sfx.boo(); shake = reduceMotion ? 0 : 14;
      say('ばあっ！', tx, row.y + 30, '#fff7e6', 44);
      const n = C.boo(g, o.ri);
      if (n) say(n + 'さつ ちらかった…', W / 2, 480, '#c9b8dc', 24);
    }
  } else if (o.state === 'flee') {
    o.y -= 420 * dt; o.x += Math.sin(o.t * 20) * 4;
    if (o.y < -120) { ghost = null; nextGhost = rand(12, 19); }
  } else {
    if (o.t > 1.0) { o.x += (o.x > W / 2 ? 1 : -1) * 380 * dt; o.y -= 60 * dt; }
    if (o.x < -120 || o.x > W + 120) { ghost = null; nextGhost = rand(12, 19); }
  }
}

// ---------- 描画 ----------
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function mark(type, x, y, s, color) {
  ctx.fillStyle = color; ctx.beginPath();
  if (type === 'circle') ctx.arc(x, y, s, 0, Math.PI * 2);
  else if (type === 'square') ctx.rect(x - s * 0.85, y - s * 0.85, s * 1.7, s * 1.7);
  else if (type === 'tri') { ctx.moveTo(x, y - s); ctx.lineTo(x + s, y + s * 0.8); ctx.lineTo(x - s, y + s * 0.8); ctx.closePath(); }
  else { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * 0.45 : s; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); }
  ctx.fill();
}
function drawRoom(t) {
  ctx.fillStyle = '#3b2a4a'; ctx.fillRect(0, 0, W, 300);
  ctx.fillStyle = '#433055';
  for (let x = 0; x < W; x += 50) ctx.fillRect(x, 0, 22, 300);
  // まど と つき
  rr(462, 70, 76, 150, 38); ctx.fillStyle = '#20345a'; ctx.fill();
  ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(512, 112, 18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#20345a'; ctx.beginPath(); ctx.arc(503, 106, 16, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#5a3420'; ctx.lineWidth = 6; rr(462, 70, 76, 150, 38); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(500, 72); ctx.lineTo(500, 220); ctx.moveTo(464, 150); ctx.lineTo(536, 150); ctx.stroke();
  // ろうそく
  ctx.fillStyle = '#f3e6cc'; ctx.fillRect(494, 248, 12, 30);
  const fl = Math.sin(t * 9) * 1.5;
  const glow = ctx.createRadialGradient(500, 240, 2, 500, 240, 60);
  glow.addColorStop(0, 'rgba(255,207,107,.45)'); glow.addColorStop(1, 'rgba(255,207,107,0)');
  ctx.fillStyle = glow; ctx.fillRect(440, 180, 120, 120);
  ctx.fillStyle = '#ffcf6b'; ctx.beginPath(); ctx.ellipse(500 + fl * 0.3, 240, 5, 9 + fl, 0, 0, Math.PI * 2); ctx.fill();
  // ゆか
  ctx.fillStyle = '#7d5136';
  ctx.beginPath(); ctx.moveTo(60, 300); ctx.lineTo(940, 300); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#6a432b'; ctx.lineWidth = 2;
  for (let i = 0; i <= 12; i++) { ctx.beginPath(); ctx.moveTo(60 + i * (880 / 12), 300); ctx.lineTo(i * (W / 12), H); ctx.stroke(); }
  ctx.globalAlpha = 0.35;
  for (const y of [360, 440, 540, 660]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.globalAlpha = 1;
  // じゅうたん
  ctx.fillStyle = '#6b2f45'; ctx.beginPath(); ctx.ellipse(500, 480, 360, 120, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#a6485f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(500, 480, 330, 100, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#4a2b1a'; ctx.fillRect(0, 292, W, 12);
  // 本だな
  for (const cx of [110, 550]) {
    ctx.fillStyle = '#5a3420'; rr(cx, 56, 340, 246, 8); ctx.fill();
    ctx.fillStyle = '#2e1a10'; ctx.fillRect(cx + 16, 70, 308, 100); ctx.fillRect(cx + 16, 180, 308, 100);
    ctx.fillStyle = '#8a5a35'; ctx.fillRect(cx + 10, 168, 320, 12); ctx.fillRect(cx + 10, 278, 320, 14);
    ctx.fillStyle = '#6b4128'; ctx.fillRect(cx, 50, 340, 12);
  }
}
function drawSlots(t) {
  const want = new Set(g.basket.map(id => g.items[id].s));
  ROWS.forEach((row, ri) => {
    const sh = rowShake[ri] > 0 ? Math.sin(rowShake[ri] * 60) * 6 : 0;
    const S = SERIES[row.s];
    if (want.has(row.s)) {
      ctx.fillStyle = `rgba(255,207,107,${0.12 + 0.08 * Math.sin(t * 6)})`;
      ctx.fillRect(row.x - 14 + sh, row.y - 4, row.w + 28, row.h + 4);
    }
    for (let n = 1; n <= PER; n++) {
      const x = C.slotX(row, n) + sh, b = row.y + row.h;
      ctx.setLineDash([5, 5]); ctx.strokeStyle = S.color; ctx.globalAlpha = 0.5; ctx.lineWidth = 2;
      rr(x - 22, b - 80, 44, 78, 4); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = S.color; ctx.font = `20px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(n), x, b - 40); ctx.globalAlpha = 1;
    }
    const tx = row.x - 2 + sh, ty = row.y + row.h + 6;
    ctx.fillStyle = '#f3e6cc'; ctx.beginPath(); ctx.arc(tx, ty, 13, 0, Math.PI * 2); ctx.fill();
    mark(S.mark, tx, ty, 8, S.color);
  });
}
function bookStanding(it, x, y, sc = 1, ang = 0) {
  const S = SERIES[it.s];
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(sc, sc);
  rr(-22, -80, 44, 80, 4); ctx.fillStyle = S.color; ctx.fill();
  ctx.fillStyle = S.dark; ctx.fillRect(-22, -72, 44, 6); ctx.fillRect(-22, -14, 44, 6);
  mark(S.mark, 0, -55, 8, '#fff7e6');
  ctx.fillStyle = '#fff7e6'; ctx.beginPath(); ctx.arc(0, -32, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = S.dark; ctx.font = `bold 17px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(it.n), 0, -31);
  ctx.restore();
}
function bookLying(it, x, y, sc = 1) {
  const S = SERIES[it.s];
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.rotate(it.rot);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(2, 16, 32, 10, 0, 0, Math.PI * 2); ctx.fill();
  rr(-28, -12, 56, 26, 5); ctx.fillStyle = S.dark; ctx.fill();
  rr(-28, -18, 56, 26, 5); ctx.fillStyle = S.color; ctx.fill();
  ctx.fillStyle = S.dark; ctx.fillRect(-28, -18, 9, 26);
  ctx.fillStyle = '#fff7e6'; ctx.beginPath(); ctx.arc(8, -5, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = S.dark; ctx.font = `bold 15px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(it.n), 8, -4);
  mark(S.mark, -7, -5, 5, '#fff7e6');
  ctx.restore();
}
function drawItem(it) {
  const tp = C.targetPos(g, it);
  if (Math.hypot(tp.x - it.dx, tp.y - it.dy) > 26) bookStanding(it, it.dx, it.dy + 30, 0.75, Math.sin(it.id + it.dx * 0.03) * 0.4);
  else if (it.state === 'shelf') bookStanding(it, it.dx, it.dy);
  else if (it.state === 'basket') bookLying(it, it.dx, it.dy - 6, 0.9);
  else bookLying(it, it.dx, it.dy);
}
function drawBasket() {
  const sh = basketShake > 0 ? Math.sin(basketShake * 60) * 7 : 0;
  ctx.save(); ctx.translate(sh, 0);
  rr(BASKET.x - 210, BASKET.y - 34, 420, 66, 20); ctx.fillStyle = '#b07a3e'; ctx.fill();
  ctx.strokeStyle = '#8a5a28'; ctx.lineWidth = 3;
  for (let x = BASKET.x - 200; x < BASKET.x + 210; x += 18) { ctx.beginPath(); ctx.moveTo(x, BASKET.y - 30); ctx.lineTo(x + 8, BASKET.y + 28); ctx.stroke(); }
  rr(BASKET.x - 216, BASKET.y - 40, 432, 14, 7); ctx.fillStyle = '#cf9a52'; ctx.fill();
  ctx.fillStyle = '#fff7e6'; ctx.font = `16px ${FONT}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillText(`かご ${g.basket.length}/${CAP}`, BASKET.x + 204, BASKET.y - 54);
  ctx.restore();
}
function drawGhost(t) {
  const o = ghost; if (!o) return;
  const row = ROWS[o.ri];
  const bob = Math.sin(t * 3 + o.phase) * 8;
  const shiver = o.light > 0 ? Math.sin(t * 70) * 3 * o.light : 0;
  const x = o.x + shiver, y = o.y + bob;
  if (o.state === 'come') {
    ctx.setLineDash([4, 10]); ctx.strokeStyle = 'rgba(201,184,220,.35)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(row.x + row.w / 2, row.y + row.h / 2); ctx.stroke(); ctx.setLineDash([]);
  }
  if (pointer.lighting && o.state === 'come') {
    ctx.fillStyle = 'rgba(255,230,140,.18)';
    ctx.beginPath(); ctx.moveTo(470, H + 10); ctx.lineTo(530, H + 10); ctx.lineTo(x + 70, y); ctx.lineTo(x - 70, y); ctx.closePath(); ctx.fill();
    const lg = ctx.createRadialGradient(x, y, 10, x, y, 100);
    lg.addColorStop(0, 'rgba(255,240,170,.55)'); lg.addColorStop(1, 'rgba(255,240,170,0)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(x, y, 100, 0, Math.PI * 2); ctx.fill();
  }
  ctx.save(); ctx.translate(x, y);
  ctx.globalAlpha = 0.93;
  ctx.fillStyle = o.light > 0.05 ? `rgb(255,${248 - o.light * 30},${235 - o.light * 90})` : '#f4f0ff';
  ctx.beginPath(); ctx.arc(0, -10, 44, Math.PI, 0); ctx.lineTo(44, 40);
  for (let i = 0; i < 4; i++) { const x0 = 44 - i * 22; ctx.quadraticCurveTo(x0 - 11, 40 + Math.sin(t * 8 + i) * 6 + 12, x0 - 22, 40); }
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#2a1c33'; ctx.strokeStyle = '#2a1c33'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  if (o.light > 0.15 || o.state === 'flee') {
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 22, -24); ctx.lineTo(s * 12, -16); ctx.lineTo(s * 22, -8); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(0, 12, 8, 10, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.beginPath(); ctx.ellipse(-15, -16, 6, 9, 0, 0, Math.PI * 2); ctx.ellipse(15, -16, 6, 9, 0, 0, Math.PI * 2); ctx.fill();
    if (o.state === 'laugh') { ctx.beginPath(); ctx.arc(0, 6, 16, 0, Math.PI); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(0, 6, 9, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke(); }
  }
  ctx.fillStyle = 'rgba(255,140,160,.55)'; ctx.beginPath(); ctx.arc(-28, 0, 6, 0, Math.PI * 2); ctx.arc(28, 0, 6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (o.state === 'come' && o.light > 0) {
    rr(x - 40, y - 76, 80, 10, 5); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fill();
    rr(x - 40, y - 76, 80 * o.light, 10, 5); ctx.fillStyle = '#ffcf6b'; ctx.fill();
  }
}
function drawHUD() {
  ctx.textBaseline = 'middle';
  rr(14, 8, 210, 38, 19); ctx.fillStyle = 'rgba(29,20,38,.75)'; ctx.fill();
  ctx.fillStyle = '#fff7e6'; ctx.font = `20px ${FONT}`; ctx.textAlign = 'left';
  ctx.fillText(`のこり ${C.leftCount(g)}さつ`, 32, 28);
  rr(W - 234, 8, 220, 38, 19); ctx.fillStyle = 'rgba(29,20,38,.75)'; ctx.fill();
  ctx.fillStyle = '#ffcf6b'; ctx.beginPath(); ctx.arc(W - 210, 27, 11, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c9922e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(W - 210, 27, 6, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#fff7e6'; ctx.fillText(String(g.coins), W - 192, 28);
  ctx.textAlign = 'right'; ctx.fillStyle = '#c9b8dc';
  ctx.fillText(clock(elapsed), W - 30, 28);
}
const clock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function draw(t) {
  const { dpr, scale, ox, oy } = view;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#1d1426'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const sx = shake > 0 ? rand(-shake, shake) : 0, sy = shake > 0 ? rand(-shake, shake) : 0;
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (ox + sx * scale), dpr * (oy + sy * scale));
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  drawRoom(t);
  drawSlots(t);
  g.items.filter(i => i.state === 'shelf').forEach(drawItem);
  g.items.filter(i => i.state === 'floor').sort(drawKey).forEach(drawItem);
  drawBasket();
  g.items.filter(i => i.state === 'basket').forEach(drawItem);
  drawGhost(t);
  particles.forEach(p => { ctx.globalAlpha = Math.max(0, Math.min(1, p.life)); ctx.fillStyle = p.c; ctx.fillRect(p.x - 4, p.y - 4, 8, 8); });
  ctx.globalAlpha = 1;
  texts.forEach(tx => {
    ctx.globalAlpha = Math.min(1, tx.life * 1.5);
    ctx.font = `bold ${tx.size}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(29,20,38,.85)'; ctx.strokeText(tx.text, tx.x, tx.y);
    ctx.fillStyle = tx.color; ctx.fillText(tx.text, tx.x, tx.y);
  });
  ctx.globalAlpha = 1;
  drawHUD();
  ctx.restore();
}

// ---------- ループ ----------
function update(dt) {
  if (running) elapsed += dt;
  const k = 1 - Math.exp(-dt * 11);
  g.items.forEach(it => { const tp = C.targetPos(g, it); it.dx += (tp.x - it.dx) * k; it.dy += (tp.y - it.dy) * k; });
  particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt; });
  particles = particles.filter(p => p.life > 0);
  texts.forEach(tx => { tx.y -= 30 * dt; tx.life -= dt; });
  texts = texts.filter(tx => tx.life > 0);
  shake = Math.max(0, shake - dt * 30);
  basketShake = Math.max(0, basketShake - dt);
  for (let i = 0; i < rowShake.length; i++) rowShake[i] = Math.max(0, rowShake[i] - dt);
  if (running) updateGhost(dt);
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt); draw(now / 1000);
  requestAnimationFrame(frame);
}
function resize() {
  const r = canvas.getBoundingClientRect();
  view.dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(r.width * view.dpr); canvas.height = Math.round(r.height * view.dpr);
  view.scale = Math.min(r.width / W, r.height / H);
  view.ox = (r.width - W * view.scale) / 2; view.oy = (r.height - H * view.scale) / 2;
}
window.addEventListener('resize', resize);

// ---------- がめん ----------
const startScreen = document.getElementById('startScreen');
const clearScreen = document.getElementById('clearScreen');
function start() {
  unlockAudio();
  reset(); running = true;
  startScreen.hidden = true; clearScreen.hidden = true;
}
function finish() {
  if (!running) return;
  running = false; ghost = null; sfx.clear();
  const stats = document.getElementById('stats');
  stats.replaceChildren(...[`タイム ${clock(elapsed)}`, `コイン ${g.coins}`, `おいはらった オバケ ${g.scared}`].map(s => {
    const el = document.createElement('span'); el.textContent = s; return el;
  }));
  clearScreen.hidden = false;
}
document.getElementById('startBtn').addEventListener('click', start);
document.getElementById('againBtn').addEventListener('click', start);

reset(); resize();
requestAnimationFrame(frame);
