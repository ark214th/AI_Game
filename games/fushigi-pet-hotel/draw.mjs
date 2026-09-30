// 2D の え（いきもの・へや・家具・ホテル）。画像ファイルは つかわず 図形で かく
import { ROOM, ITEMS } from './data.mjs';

export const FONT = '"Hiragino Maru Gothic ProN","Hiragino Sans","Rounded Mplus 1c","Yu Gothic",system-ui,sans-serif';
export const INK = '#5a3d55';

// ---------- きほんの かたち ----------
export function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
export function ell(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, Math.PI * 2); }
export function circ(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.abs(r), 0, Math.PI * 2); }
export function star(ctx, x, y, r1, r2 = r1 * 0.48, n = 5, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1, a = rot + (i * Math.PI) / n; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath();
}
export function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s * 0.1, y + s * 0.25, x - s * 0.55, y, x - s * 0.5, y - s * 0.25);
  ctx.bezierCurveTo(x - s * 0.45, y - s * 0.55, x - s * 0.05, y - s * 0.55, x, y - s * 0.25);
  ctx.bezierCurveTo(x + s * 0.05, y - s * 0.55, x + s * 0.45, y - s * 0.55, x + s * 0.5, y - s * 0.25);
  ctx.bezierCurveTo(x + s * 0.55, y, x + s * 0.1, y + s * 0.25, x, y + s * 0.35);
  ctx.closePath();
}
export function drawHeart(ctx, x, y, s, color = '#ff6f91') {
  heartPath(ctx, x, y, s); ctx.fillStyle = color; ctx.fill();
  ctx.lineWidth = s * 0.08; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.6)'; ell(ctx, x - s * 0.22, y - s * 0.22, s * 0.1, s * 0.06, -0.6); ctx.fill();
}
const hash = i => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

export function text(ctx, str, x, y, size, { color = INK, align = 'center', base = 'middle', weight = 800, stroke = null, sw = 0 } = {}) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align; ctx.textBaseline = base;
  if (stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = sw || size * 0.22; ctx.strokeStyle = stroke; ctx.strokeText(str, x, y); }
  ctx.fillStyle = color; ctx.fillText(str, x, y);
}
export function emoji(ctx, str, x, y, size) {
  ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",${FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000';
  ctx.fillText(str, x, y + size * 0.05);
}

// ---------- いきもの ----------
// (x, y) は あしもと。r は からだの はんけい
// st: { t, sq(つぶれ), mood, look(-1..1), mouth(0..1), dirt:[{x,y,a}], puff, shake, alpha }
export function hoverOf(sp, r, t) { return sp === 'fuwari' ? r * (0.28 + Math.sin(t * 2.2) * 0.06) : 0; }
export function bodyCenter(sp, x, y, r, st = {}) {
  const sq = st.sq || 0, puff = st.puff || 1;
  return { x, y: y - hoverOf(sp, r, st.t || 0) - r * (1 - sq) * puff };
}

export function drawCreature(ctx, sp, x, y, r, st = {}) {
  const t = st.t || 0, sq = st.sq || 0, puff = st.puff || 1, a = st.alpha ?? 1;
  const hover = hoverOf(sp, r, t);
  ctx.save();
  ctx.globalAlpha = a * 0.16; ctx.fillStyle = '#3a2a4a';
  ell(ctx, x, y, r * 0.85 * (1 - hover / (r * 2.5)) * puff, r * 0.16); ctx.fill();
  ctx.globalAlpha = a;
  const shake = st.shake ? Math.sin(t * 38) * r * 0.07 * st.shake : 0;
  ctx.translate(x + shake, y - hover - r * (1 - sq) * puff);
  ctx.scale(r * (1 + sq) * puff, r * (1 - sq) * puff);
  if (sp === 'fuwari') bodyFuwari(ctx, t);
  else if (sp === 'gorota') bodyGorota(ctx);
  else bodyPunyu(ctx);
  if (st.dirt) for (const d of st.dirt) {
    if (d.a <= 0.02) continue;
    ctx.globalAlpha = a * d.a * 0.85; ctx.fillStyle = '#8b6a48';
    ell(ctx, d.x, d.y, 0.17, 0.13, d.x); ctx.fill();
    circ(ctx, d.x + 0.16, d.y - 0.1, 0.05); ctx.fill();
    circ(ctx, d.x - 0.14, d.y + 0.1, 0.04); ctx.fill();
  }
  ctx.globalAlpha = a;
  drawFace(ctx, sp, st);
  if (sp === 'punyu' && st.bow !== false) {
    ctx.fillStyle = '#ff5d86';
    ctx.beginPath(); ctx.moveTo(0, 0.62); ctx.lineTo(-0.24, 0.5); ctx.lineTo(-0.24, 0.76); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 0.62); ctx.lineTo(0.24, 0.5); ctx.lineTo(0.24, 0.76); ctx.closePath(); ctx.fill();
    circ(ctx, 0, 0.62, 0.07); ctx.fill();
  }
  if (st.towel) {
    // おふろあがりの タオル
    const w = Math.sin(t * 9) * 0.06;
    ctx.fillStyle = '#ffd36b';
    ctx.beginPath(); ctx.moveTo(-0.95, -0.35 + w); ctx.quadraticCurveTo(-0.9, -1.15, 0, -1.12); ctx.quadraticCurveTo(0.9, -1.15, 0.95, -0.35 - w);
    ctx.quadraticCurveTo(0.5, -0.5, 0, -0.48); ctx.quadraticCurveTo(-0.5, -0.5, -0.95, -0.35 + w); ctx.fill();
    ctx.fillStyle = '#ffb347'; for (let i = -2; i <= 2; i++) { ell(ctx, i * 0.34, -0.8, 0.06, 0.2, i * 0.15); ctx.fill(); }
  }
  if (st.blanket) {
    // もうふ
    ctx.fillStyle = '#9fb8ff';
    ctx.beginPath(); ctx.moveTo(-1.18, 0.15);
    for (let i = 0; i < 6; i++) ctx.quadraticCurveTo(-1.18 + (i + 0.5) * 0.397, 0.02, -1.18 + (i + 1) * 0.397, 0.15);
    ctx.lineTo(1.2, 0.75); ctx.quadraticCurveTo(1.22, 1.05, 0.9, 1.05); ctx.lineTo(-0.9, 1.05); ctx.quadraticCurveTo(-1.22, 1.05, -1.2, 0.75); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff6c2'; for (const [x, y] of [[-0.6, 0.5], [0.2, 0.7], [0.7, 0.35], [-0.2, 0.3]]) { star(ctx, x, y, 0.1); ctx.fill(); }
    ctx.fillStyle = '#c3d3ff'; ctx.fillRect(-1.18, 0.13, 2.38, 0.08);
  }
  ctx.restore();
  if (st.suitcase) {
    // にもつ
    const bx = x + r * 1.02, s2 = r * 0.62;
    ctx.save(); ctx.globalAlpha = a;
    ctx.strokeStyle = '#8a5a3a'; ctx.lineWidth = s2 * 0.08;
    ctx.beginPath(); ctx.arc(bx, y - s2 * 0.78, s2 * 0.18, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#e8834e'; rr(ctx, bx - s2 * 0.45, y - s2 * 0.8, s2 * 0.9, s2 * 0.8, s2 * 0.12); ctx.fill();
    ctx.fillStyle = '#ffcf7a'; ctx.fillRect(bx - s2 * 0.45, y - s2 * 0.5, s2 * 0.9, s2 * 0.12);
    ctx.fillStyle = '#fff'; star(ctx, bx + s2 * 0.18, y - s2 * 0.22, s2 * 0.1); ctx.fill();
    ctx.restore();
  }
}

function bodyFuwari(ctx, t) {
  const bumps = [[0, 0.12, 1.02, 0.86], [-0.55, -0.42, 0.5, 0.48], [0.05, -0.62, 0.56, 0.52], [0.6, -0.36, 0.48, 0.46], [-0.92, 0.18, 0.4, 0.38], [0.94, 0.16, 0.4, 0.38]];
  ctx.lineWidth = 0.14; ctx.strokeStyle = '#a9d2f0';
  for (const [x, y, rx, ry] of bumps) { ell(ctx, x, y, rx, ry); ctx.stroke(); }
  const g = ctx.createLinearGradient(0, -1.1, 0, 1);
  g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#d4ecff');
  ctx.fillStyle = g;
  for (const [x, y, rx, ry] of bumps) { ell(ctx, x, y, rx, ry); ctx.fill(); }
  // ちいさな しっぽの くも
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  circ(ctx, 1.25, 0.55 + Math.sin(t * 3) * 0.05, 0.14); ctx.fill();
  circ(ctx, 1.42, 0.42 + Math.sin(t * 3 + 1) * 0.05, 0.09); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.8)'; ell(ctx, -0.3, -0.7, 0.18, 0.09, -0.4); ctx.fill();
}

function bodyGorota(ctx) {
  ctx.fillStyle = '#6f6a80';
  ell(ctx, -0.45, 0.88, 0.22, 0.12); ctx.fill(); ell(ctx, 0.45, 0.88, 0.22, 0.12); ctx.fill();
  const g = ctx.createLinearGradient(0, -1, 0, 1);
  g.addColorStop(0, '#cbc7d8'); g.addColorStop(1, '#9893aa');
  ctx.fillStyle = g; ctx.strokeStyle = '#7b7690'; ctx.lineWidth = 0.08;
  ell(ctx, 0, 0.02, 1.08, 0.96); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(110,104,130,.35)';
  for (const [x, y, r] of [[-0.7, 0.35, 0.07], [0.62, 0.5, 0.09], [0.78, -0.1, 0.05], [-0.4, 0.66, 0.05], [0.25, 0.72, 0.06], [-0.82, -0.2, 0.05]]) { circ(ctx, x, y, r); ctx.fill(); }
  // あたまの こけ
  ctx.fillStyle = '#8cd062';
  ctx.beginPath();
  ctx.moveTo(-0.78, -0.5);
  ctx.bezierCurveTo(-0.6, -1.05, 0.6, -1.05, 0.8, -0.48);
  ctx.quadraticCurveTo(0.62, -0.38, 0.52, -0.46);
  ctx.quadraticCurveTo(0.42, -0.3, 0.26, -0.44);
  ctx.quadraticCurveTo(0.05, -0.34, -0.12, -0.46);
  ctx.quadraticCurveTo(-0.3, -0.32, -0.46, -0.46);
  ctx.quadraticCurveTo(-0.62, -0.36, -0.78, -0.5);
  ctx.fill();
  ctx.fillStyle = '#a8e07f'; ell(ctx, -0.25, -0.78, 0.2, 0.07, -0.2); ctx.fill();
  // めばえ
  ctx.strokeStyle = '#5da83e'; ctx.lineWidth = 0.06; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0.05, -0.9); ctx.quadraticCurveTo(0.02, -1.1, 0.08, -1.22); ctx.stroke();
  ctx.fillStyle = '#7cc653';
  ell(ctx, -0.08, -1.22, 0.16, 0.08, 0.5); ctx.fill();
  ell(ctx, 0.24, -1.26, 0.16, 0.08, -0.5); ctx.fill();
}

function bodyPunyu(ctx) {
  ctx.fillStyle = '#fff4f7'; ctx.strokeStyle = '#f0c3d2'; ctx.lineWidth = 0.07;
  for (const s of [-1, 1]) {
    ell(ctx, s * 0.52, -0.82, 0.22, 0.36, s * 0.15); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffadc3'; ell(ctx, s * 0.52, -0.8, 0.1, 0.2, s * 0.15); ctx.fill(); ctx.fillStyle = '#fff4f7';
  }
  ctx.fillStyle = '#ffd6e2';
  ell(ctx, -0.42, 0.9, 0.2, 0.1); ctx.fill(); ell(ctx, 0.42, 0.9, 0.2, 0.1); ctx.fill();
  ctx.fillStyle = '#fff4f7';
  ell(ctx, 0, 0.04, 1, 0.94); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.9)'; ell(ctx, -0.35, -0.55, 0.16, 0.08, -0.5); ctx.fill();
}

function drawFace(ctx, sp, st) {
  const t = st.t || 0, mood = st.mood || 'normal';
  const lx = (st.look || 0) * 0.14;
  const ey = sp === 'gorota' ? 0.02 : -0.02;
  const ink = '#3a2a3a';
  ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 0.075;
  const blink = mood === 'normal' || mood === 'eat' ? ((t + (sp === 'gorota' ? 1.3 : 0)) % 3.6) < 0.13 : false;
  for (const s of [-1, 1]) {
    const ex = s * 0.33 + lx;
    if (mood === 'happy' || mood === 'bliss') {
      ctx.beginPath();
      if (mood === 'happy') ctx.arc(ex, ey + 0.06, 0.11, Math.PI * 1.1, Math.PI * 1.9);
      else ctx.arc(ex, ey - 0.04, 0.11, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    } else if (mood === 'yuck') {
      ctx.beginPath(); ctx.moveTo(ex - s * 0.1, ey - 0.09); ctx.lineTo(ex + s * 0.06, ey); ctx.lineTo(ex - s * 0.1, ey + 0.09); ctx.stroke();
    } else if (mood === 'sleep' || blink) {
      ctx.beginPath(); ctx.moveTo(ex - 0.1, ey + 0.02); ctx.quadraticCurveTo(ex, ey + 0.08, ex + 0.1, ey + 0.02); ctx.stroke();
    } else {
      ell(ctx, ex, ey, 0.085, 0.12); ctx.fill();
      ctx.fillStyle = '#fff'; circ(ctx, ex + 0.03, ey - 0.05, 0.035); ctx.fill(); ctx.fillStyle = ink;
    }
  }
  // ほっぺ
  ctx.fillStyle = mood === 'bliss' ? 'rgba(255,120,160,.75)' : 'rgba(255,150,180,.6)';
  ell(ctx, -0.6 + lx * 0.5, 0.2, 0.16, 0.09); ctx.fill();
  ell(ctx, 0.6 + lx * 0.5, 0.2, 0.16, 0.09); ctx.fill();
  // くち
  const mx = lx * 0.8, my = 0.24;
  ctx.fillStyle = ink;
  if (mood === 'eat' && (st.mouth || 0) > 0.05) {
    const m = st.mouth;
    ell(ctx, mx, my + 0.04, 0.1 + m * 0.08, 0.05 + m * 0.16); ctx.fill();
    ctx.fillStyle = '#ff8fab'; ell(ctx, mx, my + 0.08 + m * 0.08, 0.07 + m * 0.04, 0.04 + m * 0.05); ctx.fill();
  } else if (mood === 'happy' || mood === 'bliss') {
    ctx.beginPath(); ctx.moveTo(mx - 0.13, my); ctx.quadraticCurveTo(mx, my + 0.28, mx + 0.13, my); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff8fab'; ell(ctx, mx, my + 0.1, 0.06, 0.035); ctx.fill();
  } else if (mood === 'yuck') {
    ctx.beginPath(); ctx.moveTo(mx - 0.14, my + 0.05);
    for (let i = 1; i <= 4; i++) ctx.lineTo(mx - 0.14 + i * 0.07, my + (i % 2 ? -0.01 : 0.05));
    ctx.stroke();
  } else if (mood === 'sleep') {
    circ(ctx, mx, my + 0.04, 0.035); ctx.fill();
  } else if (mood === 'pout') {
    ctx.beginPath(); ctx.moveTo(mx - 0.07, my + 0.06); ctx.quadraticCurveTo(mx, my, mx + 0.07, my + 0.06); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(mx - 0.08, my); ctx.quadraticCurveTo(mx, my + 0.09, mx + 0.08, my); ctx.stroke();
  }
}

// ---------- へや ----------
export const depth = y => 0.8 + 0.32 * (y - ROOM.floorTop) / (ROOM.floorBottom - ROOM.floorTop);

// へやの中の 家具の あたりはんい（へやの ざひょう）
export function itemBox(it) {
  const d = ITEMS[it.id];
  if (d.zone === 'wall') return { x0: it.x - d.w / 2, y0: it.y - d.h / 2, x1: it.x + d.w / 2, y1: it.y + d.h / 2 };
  const k = depth(it.y);
  if (d.flat) return { x0: it.x - d.w / 2 * k, y0: it.y - d.h / 2 * k, x1: it.x + d.w / 2 * k, y1: it.y + d.h / 2 * k };
  return { x0: it.x - d.w / 2 * k, y0: it.y - d.h * k, x1: it.x + d.w / 2 * k, y1: it.y + 6 };
}

export function drawWall(ctx, id) {
  const W = ROOM.w, H = ROOM.wallBottom;
  const base = { cream: '#fff0d4', pink: '#ffd6e4', mizu: '#c7eaff', mori: '#d3ecbf', yozora: '#3d4687' }[id] || '#fff0d4';
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
  if (id === 'cream') {
    ctx.fillStyle = '#f5d9a8';
    for (let y = 40, row = 0; y < H; y += 60, row++) for (let x = row % 2 ? 60 : 30; x < W; x += 60) { circ(ctx, x, y, 5); ctx.fill(); }
  } else if (id === 'pink') {
    ctx.fillStyle = '#ffe6ee';
    for (let x = 0; x < W; x += 80) ctx.fillRect(x, 0, 40, H);
    ctx.fillStyle = '#ffb8cf';
    for (let y = 50, row = 0; y < H; y += 90, row++) for (let x = row % 2 ? 100 : 60; x < W; x += 160) { heartPath(ctx, x, y, 22); ctx.fill(); }
  } else if (id === 'mizu') {
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    for (let i = 0; i < 9; i++) {
      const x = 60 + hash(i) * 880, y = 50 + hash(i + 9) * 260, s = 0.6 + hash(i + 3) * 0.6;
      circ(ctx, x, y, 22 * s); ctx.fill(); circ(ctx, x + 24 * s, y + 6 * s, 17 * s); ctx.fill(); circ(ctx, x - 24 * s, y + 7 * s, 15 * s); ctx.fill();
    }
  } else if (id === 'mori') {
    ctx.fillStyle = '#b6dc9b';
    for (let y = 40, row = 0; y < H; y += 70, row++) for (let x = row % 2 ? 70 : 20; x < W; x += 100) { ell(ctx, x, y, 16, 8, -0.7); ctx.fill(); ell(ctx, x + 14, y + 8, 12, 6, 0.6); ctx.fill(); }
  } else if (id === 'yozora') {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2f3777'); g.addColorStop(1, '#5a62ad');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = i % 3 ? '#fff6c2' : '#ffe06a';
      star(ctx, hash(i) * W, 20 + hash(i + 40) * (H - 60), 5 + hash(i + 7) * 7); ctx.fill();
    }
    ctx.fillStyle = '#fff3b0'; circ(ctx, 860, 80, 34); ctx.fill();
    ctx.fillStyle = '#3a4282'; circ(ctx, 876, 70, 30); ctx.fill();
  }
  // てんじょう
  ctx.fillStyle = 'rgba(90,61,85,.12)'; ctx.fillRect(0, 0, W, 16);
}

export function drawFloor(ctx, id) {
  const W = ROOM.w, y0 = ROOM.wallBottom, H = ROOM.h - y0;
  const base = { wood: '#e5b17a', carpet: '#ffa2c1', kusa: '#9fd676', kumo: '#eef6ff', iwa: '#d2ccd9' }[id] || '#e5b17a';
  ctx.fillStyle = base; ctx.fillRect(0, y0, W, H);
  if (id === 'wood') {
    ctx.strokeStyle = '#cc955e'; ctx.lineWidth = 3;
    for (let y = y0 + 34, row = 0; y < ROOM.h; y += 40, row++) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      for (let x = (row % 2) * 110 + 60; x < W; x += 220) { ctx.beginPath(); ctx.moveTo(x, y - 40); ctx.lineTo(x, y); ctx.stroke(); }
    }
  } else if (id === 'carpet') {
    ctx.fillStyle = '#ffb7cf';
    for (let y = y0 + 30, row = 0; y < ROOM.h; y += 45, row++) for (let x = row % 2 ? 60 : 20; x < W; x += 80) { star(ctx, x, y, 7, 3.5, 4, 0); ctx.fill(); }
  } else if (id === 'kusa') {
    ctx.strokeStyle = '#7fbe56'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let i = 0; i < 60; i++) {
      const x = hash(i) * W, y = y0 + 20 + hash(i + 70) * (H - 20);
      ctx.beginPath(); ctx.moveTo(x - 7, y - 12); ctx.lineTo(x, y); ctx.lineTo(x + 7, y - 12); ctx.stroke();
    }
    for (let i = 0; i < 10; i++) {
      const x = hash(i + 200) * W, y = y0 + 30 + hash(i + 230) * (H - 40);
      ctx.fillStyle = i % 2 ? '#fff' : '#ffe36b';
      for (let k = 0; k < 5; k++) { const a = k * 1.256; circ(ctx, x + Math.cos(a) * 6, y + Math.sin(a) * 6, 4.5); ctx.fill(); }
      ctx.fillStyle = '#ffb347'; circ(ctx, x, y, 3.5); ctx.fill();
    }
  } else if (id === 'kumo') {
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#d8e9f7'; ctx.lineWidth = 3;
    for (let i = 0; i < 14; i++) {
      const x = hash(i + 50) * W, y = y0 + 25 + hash(i + 90) * (H - 30), s = 0.7 + hash(i + 11) * 0.5;
      ell(ctx, x, y, 44 * s, 16 * s); ctx.fill(); ctx.stroke();
    }
  } else if (id === 'iwa') {
    ctx.fillStyle = '#e2dde7';
    for (let y = y0 + 8, row = 0; y < ROOM.h; y += 52, row++) for (let x = (row % 2) * 50 - 40; x < W; x += 100) { rr(ctx, x + 4, y, 92, 44, 14); ctx.fill(); }
  }
  // はばき
  ctx.fillStyle = '#fff8ee'; ctx.fillRect(0, y0 - 10, W, 18);
  ctx.fillStyle = 'rgba(90,61,85,.12)'; ctx.fillRect(0, y0 + 8, W, 6);
}

// 家具を かく（ゆかの 家具は あしもとが げんてん、かべの 家具は まんなかが げんてん）
export function drawItem(ctx, id, opt = {}) {
  const f = ITEM_DRAW[id]; if (f) f(ctx, opt);
}

const wood = '#c98b55', woodDark = '#a8703f';
const ITEM_DRAW = {
  bed(ctx) {
    ctx.fillStyle = woodDark; ctx.fillRect(-115, -20, 14, 20); ctx.fillRect(100, -20, 14, 20);
    ctx.fillStyle = wood; rr(ctx, -128, -135, 34, 135, 12); ctx.fill();
    rr(ctx, -122, -58, 248, 40, 10); ctx.fill();
    ctx.fillStyle = '#fffdf8'; rr(ctx, -100, -86, 222, 36, 14); ctx.fill();
    ctx.fillStyle = '#ffb3c8'; rr(ctx, -28, -90, 152, 46, 16); ctx.fill();
    ctx.fillStyle = '#ffd1de'; for (let x = -10; x < 120; x += 34) ctx.fillRect(x, -90, 14, 46);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#eadfe6'; ctx.lineWidth = 3; ell(ctx, -62, -92, 38, 16); ctx.fill(); ctx.stroke();
  },
  kumobed(ctx) {
    ctx.fillStyle = '#bfe0f7';
    for (const [x, y, r] of [[-95, -45, 42], [-40, -55, 50], [25, -55, 50], [90, -45, 44]]) { circ(ctx, x, y, r); ctx.fill(); }
    ctx.fillStyle = '#ffffff';
    for (const [x, y, r] of [[-95, -55, 38], [-40, -66, 46], [25, -66, 46], [90, -55, 40], [-10, -100, 36], [55, -92, 30]]) { circ(ctx, x, y, r); ctx.fill(); }
    ctx.fillStyle = '#e3f2ff'; ell(ctx, -70, -104, 34, 15); ctx.fill();
    ctx.fillStyle = '#ffd95a'; star(ctx, 70, -108, 12); ctx.fill();
  },
  rug(ctx) {
    ctx.fillStyle = '#ffcf7a'; ell(ctx, 0, 0, 150, 35); ctx.fill();
    ctx.strokeStyle = '#fff4d6'; ctx.lineWidth = 6; ell(ctx, 0, 0, 118, 26); ctx.stroke();
    ctx.strokeStyle = '#ffae4d'; ctx.lineWidth = 5; ell(ctx, 0, 0, 80, 17); ctx.stroke();
  },
  ueki(ctx) {
    ctx.fillStyle = '#5fae48';
    for (const [x, y, rx, ry, r] of [[-26, -110, 20, 52, -0.4], [26, -110, 20, 52, 0.4], [0, -135, 20, 55, 0], [-40, -80, 16, 40, -0.9], [40, -80, 16, 40, 0.9]]) { ell(ctx, x, y, rx, ry, r); ctx.fill(); }
    ctx.fillStyle = '#7cc862'; ell(ctx, -6, -140, 7, 30, 0); ctx.fill();
    ctx.fillStyle = '#e07a4a'; ctx.beginPath(); ctx.moveTo(-42, -62); ctx.lineTo(42, -62); ctx.lineTo(32, 0); ctx.lineTo(-32, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f09a6a'; rr(ctx, -48, -70, 96, 18, 6); ctx.fill();
  },
  iwa(ctx) {
    ctx.fillStyle = '#9d98ae'; ell(ctx, -20, -45, 62, 45); ctx.fill();
    ctx.fillStyle = '#b8b3c7'; ell(ctx, -28, -52, 50, 36); ctx.fill();
    ctx.fillStyle = '#a8a3b8'; ell(ctx, 50, -26, 34, 26); ctx.fill();
    ctx.fillStyle = '#8cd062'; ell(ctx, -30, -84, 34, 10); ctx.fill(); ell(ctx, 52, -48, 18, 6); ctx.fill();
  },
  kinoko(ctx) {
    ctx.fillStyle = '#fff6e8'; rr(ctx, -24, -70, 48, 70, 16); ctx.fill();
    ctx.fillStyle = '#ff6a6a'; ctx.beginPath(); ctx.ellipse(0, -66, 58, 48, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    for (const [x, y, r] of [[-28, -84, 10], [8, -100, 12], [34, -78, 8], [-4, -74, 6]]) { circ(ctx, x, y, r); ctx.fill(); }
  },
  hoshilamp(ctx, o) {
    const g = ctx.createRadialGradient(0, -170, 5, 0, -170, 80);
    g.addColorStop(0, 'rgba(255,236,140,.75)'); g.addColorStop(1, 'rgba(255,236,140,0)');
    ctx.fillStyle = g; circ(ctx, 0, -170, 80); ctx.fill();
    ctx.fillStyle = '#b89ad8'; ell(ctx, 0, -6, 34, 10); ctx.fill();
    ctx.fillRect(-4, -140, 8, 134);
    ctx.fillStyle = '#ffd84a'; ctx.strokeStyle = '#ffb21e'; ctx.lineWidth = 4;
    star(ctx, 0, -170, 40 + Math.sin((o.t || 0) * 3) * 2, 19); ctx.fill(); ctx.stroke();
  },
  doll(ctx) { drawCreature(ctx, 'punyu', 0, 0, 40, { t: 0, mood: 'happy', bow: false }); },
  window(ctx, o) {
    ctx.fillStyle = '#ffffff'; rr(ctx, -85, -75, 170, 150, 14); ctx.fill();
    const g = ctx.createLinearGradient(0, -65, 0, 65);
    if (o.night) { g.addColorStop(0, '#1f2660'); g.addColorStop(1, '#46508f'); } else { g.addColorStop(0, '#7fcfff'); g.addColorStop(1, '#d6f1ff'); }
    ctx.fillStyle = g; rr(ctx, -72, -62, 144, 124, 8); ctx.fill();
    if (o.night) { ctx.fillStyle = '#fff3b0'; circ(ctx, 30, -30, 14); ctx.fill(); star(ctx, -40, -20, 6); ctx.fill(); star(ctx, -10, 20, 4); ctx.fill(); }
    else { ctx.fillStyle = '#fff'; circ(ctx, -30, -20, 14); ctx.fill(); circ(ctx, -12, -24, 16); ctx.fill(); circ(ctx, 6, -18, 12); ctx.fill(); ctx.fillStyle = '#8fdc6e'; ell(ctx, 0, 70, 90, 30); ctx.fill(); }
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-4, -62, 8, 124); ctx.fillRect(-72, -4, 144, 8);
    ctx.fillStyle = '#ffb3c8';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 90, -80); ctx.lineTo(s * 52, -80); ctx.quadraticCurveTo(s * 70, 0, s * 90, 78); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#d9a26a'; rr(ctx, -100, -86, 200, 12, 6); ctx.fill();
  },
  nijie(ctx) {
    ctx.fillStyle = '#e0a857'; rr(ctx, -80, -57, 160, 114, 10); ctx.fill();
    ctx.fillStyle = '#fffaf0'; rr(ctx, -68, -45, 136, 90, 6); ctx.fill();
    ctx.save(); rr(ctx, -68, -45, 136, 90, 6); ctx.clip();
    ctx.lineWidth = 9;
    ['#ff6f6f', '#ffb14d', '#ffe45c', '#7ee081', '#5cc8ff', '#a98bff'].forEach((c, i) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(0, 45, 70 - i * 9, Math.PI, 0); ctx.stroke(); });
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#cfe6f7'; ctx.lineWidth = 3;
    for (const [x, y] of [[-48, 32], [48, 32]]) { circ(ctx, x, y, 16); ctx.fill(); circ(ctx, x + 14, y + 4, 12); ctx.fill(); circ(ctx, x - 14, y + 4, 12); ctx.fill(); }
    ctx.restore();
  },
  hoshikazari(ctx, o) {
    ctx.strokeStyle = '#c9a27a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-145, -32); ctx.quadraticCurveTo(0, 30, 145, -32); ctx.stroke();
    const cols = ['#ffd84a', '#ff9fc0', '#8fd3ff', '#b9a0ff', '#ffd84a'];
    for (let i = 0; i < 5; i++) {
      const u = (i + 0.5) / 5, x = -145 + u * 290, y = -32 + 2 * u * (1 - u) * 62 * 1.02;
      const sw = Math.sin((o.t || 0) * 2 + i) * 0.15;
      ctx.save(); ctx.translate(x, y); ctx.rotate(sw);
      ctx.strokeStyle = '#c9a27a'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 12); ctx.stroke();
      ctx.fillStyle = cols[i]; star(ctx, 0, 28, 17); ctx.fill();
      ctx.restore();
    }
  },
  wreath(ctx) {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      ctx.fillStyle = i % 2 ? '#5fae48' : '#7cc862';
      ell(ctx, Math.cos(a) * 42, Math.sin(a) * 42, 18, 10, a + 1.2); ctx.fill();
    }
    ctx.fillStyle = '#ff6a6a';
    for (const a of [0.6, 2.2, 3.8, 5.2]) { circ(ctx, Math.cos(a) * 44, Math.sin(a) * 44, 6); ctx.fill(); }
    ctx.fillStyle = '#ff8fab';
    ctx.beginPath(); ctx.moveTo(0, 44); ctx.lineTo(-24, 30); ctx.lineTo(-24, 58); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 44); ctx.lineTo(24, 30); ctx.lineTo(24, 58); ctx.closePath(); ctx.fill();
  },
};

// へやを まるごと かく。rect は がめんの ばしょ（よこ:たて = 1000:625）
// opts: { t, night, extras:[{y, draw(ctx)}], after(ctx), hide: item }
export function drawRoom(ctx, room, rect, opts = {}) {
  const s = rect.w / ROOM.w;
  ctx.save();
  ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip();
  ctx.translate(rect.x, rect.y); ctx.scale(s, s);
  drawWall(ctx, room.wall);
  drawFloor(ctx, room.floor);
  const o = { t: opts.t || 0, night: opts.night };
  const vis = room.items.filter(it => it !== opts.hide);
  for (const it of vis.filter(it => ITEMS[it.id].zone === 'wall')) { ctx.save(); ctx.translate(it.x, it.y); drawItem(ctx, it.id, o); ctx.restore(); }
  for (const it of vis.filter(it => ITEMS[it.id].flat)) { ctx.save(); ctx.translate(it.x, it.y); const k = depth(it.y); ctx.scale(k, k); drawItem(ctx, it.id, o); ctx.restore(); }
  const list = vis.filter(it => ITEMS[it.id].zone === 'floor' && !ITEMS[it.id].flat).map(it => ({
    y: it.y, draw: c => { c.save(); c.translate(it.x, it.y); const k = depth(it.y); c.scale(k, k); drawItem(c, it.id, o); c.restore(); },
  }));
  if (opts.extras) list.push(...opts.extras);
  list.sort((a, b) => a.y - b.y);
  for (const e of list) e.draw(ctx);
  if (opts.night) { ctx.fillStyle = 'rgba(30,30,90,.35)'; ctx.fillRect(0, 0, ROOM.w, ROOM.h); }
  if (opts.after) opts.after(ctx);
  ctx.restore();
}

// ロビー（うけつけ と ドア）
export function drawLobby(ctx, rect, opts = {}) {
  const s = rect.w / ROOM.w;
  ctx.save();
  ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip();
  ctx.translate(rect.x, rect.y); ctx.scale(s, s);
  ctx.fillStyle = '#ffe3b8'; ctx.fillRect(0, 0, ROOM.w, ROOM.wallBottom);
  ctx.fillStyle = '#ffd49a'; for (let x = 0; x < ROOM.w; x += 70) ctx.fillRect(x, 0, 35, ROOM.wallBottom);
  ctx.fillStyle = 'rgba(90,61,85,.12)'; ctx.fillRect(0, 0, ROOM.w, 16);
  // ゆか：いちまつ
  for (let y = ROOM.wallBottom, r = 0; y < ROOM.h; y += 50, r++) for (let x = 0, c = 0; x < ROOM.w; x += 70, c++) { ctx.fillStyle = (r + c) % 2 ? '#f6e3c8' : '#fff7ea'; ctx.fillRect(x, y, 70, 50); }
  ctx.fillStyle = '#fff8ee'; ctx.fillRect(0, ROOM.wallBottom - 10, ROOM.w, 18);
  // ドア
  ctx.fillStyle = '#b77a45'; ctx.beginPath(); ctx.moveTo(60, 400); ctx.lineTo(60, 180); ctx.arc(160, 180, 100, Math.PI, 0); ctx.lineTo(260, 400); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d99a5e'; ctx.beginPath(); ctx.moveTo(78, 400); ctx.lineTo(78, 185); ctx.arc(160, 185, 82, Math.PI, 0); ctx.lineTo(242, 400); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffe45c'; circ(ctx, 225, 300, 10); ctx.fill();
  ctx.fillStyle = '#ff9fc0'; ell(ctx, 160, 440, 110, 24); ctx.fill();
  // かんばん
  ctx.fillStyle = '#fff'; rr(ctx, 420, 60, 200, 64, 20); ctx.fill();
  text(ctx, 'うけつけ', 520, 93, 34, { color: '#ff6f91' });
  // うけつけの つくえ
  const extras = [{ y: 520, draw: c => {
    c.fillStyle = '#c98b55'; rr(c, 380, 360, 300, 160, 16); c.fill();
    c.fillStyle = '#e8b27a'; rr(c, 370, 350, 320, 30, 12); c.fill();
    c.fillStyle = '#ffd84a'; c.beginPath(); c.arc(640, 350, 20, Math.PI, 0); c.fill(); c.fillRect(620, 346, 40, 6);
    c.fillStyle = '#ffe9c7'; star(c, 530, 445, 34); c.fill();
  } }];
  if (opts.extras) extras.push(...opts.extras);
  extras.sort((a, b) => a.y - b.y);
  for (const e of extras) e.draw(ctx);
  ctx.save(); ctx.translate(860, 600); ctx.scale(1.1, 1.1); drawItem(ctx, 'ueki'); ctx.restore();
  if (opts.night) { ctx.fillStyle = 'rgba(30,30,90,.35)'; ctx.fillRect(0, 0, ROOM.w, ROOM.h); }
  if (opts.after) opts.after(ctx);
  ctx.restore();
}

// まだ ない へや（こうじちゅう）
export function drawLockedCell(ctx, rect, need, have) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; rr(ctx, rect.x, rect.y, rect.w, rect.h, 10); ctx.fill();
  ctx.setLineDash([14, 10]); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,.9)'; rr(ctx, rect.x + 6, rect.y + 6, rect.w - 12, rect.h - 12, 10); ctx.stroke();
  ctx.setLineDash([]);
  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2, u = rect.w / 340;
  text(ctx, 'つぎの へや', cx, cy - 42 * u, 26 * u, { color: '#fff', stroke: 'rgba(90,61,85,.45)' });
  const bw = rect.w * 0.66, bx = cx - bw / 2, by = cy - 4 * u, bh = 26 * u;
  ctx.fillStyle = 'rgba(255,255,255,.8)'; rr(ctx, bx, by, bw, bh, bh / 2); ctx.fill();
  ctx.fillStyle = '#ff8fab'; rr(ctx, bx, by, Math.max(bh, bw * Math.min(1, have / need)), bh, bh / 2); ctx.fill();
  drawHeart(ctx, bx - 4 * u, by + bh / 2, 40 * u);
  text(ctx, `${Math.min(have, need)} / ${need}`, cx, cy + 50 * u, 24 * u, { color: '#fff', stroke: 'rgba(90,61,85,.45)' });
  ctx.restore();
}

// ---------- ふきだし ----------
export function drawSpeech(ctx, x, y, str, size = 30, { maxW = 9999, color = '#fff', ink = INK } = {}) {
  ctx.font = `800 ${size}px ${FONT}`;
  const lines = str.split('\n');
  const w = Math.min(maxW, Math.max(...lines.map(l => ctx.measureText(l).width)) + size * 1.2);
  const h = lines.length * size * 1.3 + size * 0.7;
  let bx = x - w / 2; const by = y - h - size * 0.5;
  bx = Math.max(8, bx);
  ctx.save();
  ctx.shadowColor = 'rgba(90,61,85,.2)'; ctx.shadowOffsetY = 4; ctx.shadowBlur = 0;
  ctx.fillStyle = color; rr(ctx, bx, by, w, h, size * 0.7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - size * 0.35, by + h - 2); ctx.lineTo(x, y); ctx.lineTo(x + size * 0.35, by + h - 2); ctx.closePath(); ctx.fill();
  ctx.restore();
  lines.forEach((l, i) => text(ctx, l, bx + w / 2, by + size * 0.35 + size * 1.3 * (i + 0.5), size, { color: ink }));
  return { x: bx, y: by, w, h };
}

export function drawNeedBubble(ctx, x, y, icon, size, pulse = 0) {
  const s = size * (1 + pulse * 0.08);
  ctx.save();
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#ffb3c8'; ctx.lineWidth = s * 0.07;
  circ(ctx, x, y - s * 0.62, s * 0.5); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - s * 0.14, y - s * 0.2); ctx.lineTo(x, y); ctx.lineTo(x + s * 0.14, y - s * 0.2); ctx.fill();
  emoji(ctx, icon, x, y - s * 0.62, s * 0.55);
  ctx.restore();
}

// ---------- そら と ホテルの そと ----------
export function drawSky(ctx, W, H, night = 0, t = 0) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  const mix = (a, b) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * night)).join(',')})`;
  g.addColorStop(0, mix([127, 208, 255], [34, 40, 96]));
  g.addColorStop(1, mix([214, 242, 255], [86, 84, 150]));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (night > 0.05) {
    ctx.globalAlpha = night;
    for (let i = 0; i < 50; i++) { ctx.fillStyle = '#fff7c8'; star(ctx, hash(i) * W, hash(i + 90) * H * 0.7, 3 + hash(i + 5) * 4 + Math.sin(t * 2 + i) * 1); ctx.fill(); }
    ctx.fillStyle = '#fff3b0'; circ(ctx, W * 0.85, H * 0.15, 42); ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (night < 0.95) {
    ctx.globalAlpha = 1 - night;
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    for (let i = 0; i < 5; i++) {
      const x = ((hash(i) * W + t * (8 + i * 3)) % (W + 300)) - 150, y = 60 + hash(i + 20) * H * 0.35, s = 0.7 + hash(i + 7) * 0.7;
      circ(ctx, x, y, 34 * s); ctx.fill(); circ(ctx, x + 38 * s, y + 8 * s, 26 * s); ctx.fill(); circ(ctx, x - 36 * s, y + 10 * s, 24 * s); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

export function drawGround(ctx, W, H, gy, night = 0) {
  ctx.fillStyle = night > 0.5 ? '#4f7a58' : '#8fdc6e'; ctx.fillRect(0, gy, W, H - gy);
  ctx.fillStyle = night > 0.5 ? '#44694c' : '#7ccb5c';
  for (let i = 0; i < 18; i++) { ell(ctx, hash(i + 300) * W, gy + 20 + hash(i + 330) * (H - gy - 20), 40, 10); ctx.fill(); }
  // もりの き
  for (let i = 0; i < 8; i++) {
    const x = (i + 0.5) / 8 * W + (hash(i + 60) - 0.5) * 80, h = 90 + hash(i + 70) * 70;
    ctx.fillStyle = night > 0.5 ? '#3e5f45' : '#6cbf57';
    circ(ctx, x, gy - h * 0.6, h * 0.42); ctx.fill();
    circ(ctx, x - h * 0.25, gy - h * 0.4, h * 0.3); ctx.fill();
    circ(ctx, x + h * 0.25, gy - h * 0.4, h * 0.3); ctx.fill();
  }
}

// ホテルの たてもの（へやの まわりの かべ・やね・かんばん）
// L: { bx, by, bw, bh, pad, roofH, floors, ch, signX }（よこに ひろがる たてもの）
export function drawHotelShell(ctx, L, night = 0) {
  const { bx, by, bw, bh, pad } = L;
  ctx.fillStyle = night > 0.5 ? '#c7a3b8' : '#ffe0ea';
  rr(ctx, bx, by, bw, bh, 18); ctx.fill();
  ctx.strokeStyle = '#e8a9bf'; ctx.lineWidth = 6; ctx.stroke();
  // やね（よせむね）
  const rh = L.roofH, inset = Math.min(rh * 1.4, bw * 0.2);
  ctx.fillStyle = '#ff7f9f';
  ctx.beginPath(); ctx.moveTo(bx - 30, by + 6); ctx.lineTo(bx + inset, by - rh); ctx.lineTo(bx + bw - inset, by - rh); ctx.lineTo(bx + bw + 30, by + 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ff9fb8';
  for (let x = bx + inset + 40; x < bx + bw - inset - 20; x += 80) ctx.fillRect(x - 3, by - rh + 10, 6, rh - 6);
  ctx.fillStyle = '#ff6a8e'; ctx.fillRect(bx + inset - 6, by - rh - 6, bw - inset * 2 + 12, 12);
  // えんとつ
  ctx.fillStyle = '#d9738f'; ctx.fillRect(bx + bw - inset - 60, by - rh - 44, 34, 44);
  // かんばん（ロビーの うえ）
  const sw = 420, sh = rh * 0.46, sx = L.signX ?? bx + bw / 2;
  ctx.fillStyle = '#fffaf0'; rr(ctx, sx - sw / 2, by - sh - 16, sw, sh, sh / 2); ctx.fill();
  ctx.strokeStyle = '#ffb3c8'; ctx.lineWidth = 4; ctx.stroke();
  text(ctx, 'ふしぎな ペットホテル', sx, by - sh / 2 - 16, sh * 0.5, { color: '#ff6f91' });
  // かいの さかいめ
  ctx.fillStyle = '#e8a9bf';
  for (let f = 1; f < L.floors; f++) ctx.fillRect(bx + 8, by + bh - pad - f * (L.ch + pad) + pad / 2 - 4, bw - 16, 8);
}

// まだ へやが ない ところ：そとの かべ（まど と はなだん）
export function drawFacade(ctx, rect, night = 0) {
  const k = rect.w / 340;
  ctx.save();
  ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip();
  ctx.fillStyle = night > 0.5 ? '#c7a3b8' : '#ffe0ea'; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = night > 0.5 ? '#bb97ac' : '#ffd3e0';
  for (let y = rect.y + 18 * k; y < rect.y + rect.h; y += 36 * k) ctx.fillRect(rect.x, y, rect.w, 3 * k);
  for (const u of [0.27, 0.73]) {
    const cx = rect.x + rect.w * u, top = rect.y + rect.h * 0.2, w = rect.w * 0.2, h = rect.h * 0.46;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(cx - w / 2 - 6 * k, top + h + 4 * k); ctx.lineTo(cx - w / 2 - 6 * k, top + w / 2); ctx.arc(cx, top + w / 2, w / 2 + 6 * k, Math.PI, 0); ctx.lineTo(cx + w / 2 + 6 * k, top + h + 4 * k); ctx.closePath(); ctx.fill();
    ctx.fillStyle = night > 0.5 ? '#ffe7a3' : '#a9dcff'; ctx.beginPath(); ctx.moveTo(cx - w / 2, top + h); ctx.lineTo(cx - w / 2, top + w / 2); ctx.arc(cx, top + w / 2, w / 2, Math.PI, 0); ctx.lineTo(cx + w / 2, top + h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(cx - 2 * k, top, 4 * k, h); ctx.fillRect(cx - w / 2, top + h * 0.55, w, 4 * k);
    ctx.fillStyle = '#c98b55'; rr(ctx, cx - w * 0.7, top + h + 2 * k, w * 1.4, 16 * k, 5 * k); ctx.fill();
    const cols = ['#ff6f91', '#ffd84a', '#ff9fc0', '#b58cff'];
    for (let i = 0; i < 4; i++) { const fx = cx - w * 0.5 + i * w / 3; ctx.fillStyle = '#6cbf57'; circ(ctx, fx, top + h + 2 * k, 7 * k); ctx.fill(); ctx.fillStyle = cols[i]; circ(ctx, fx, top + h - 5 * k, 6 * k); ctx.fill(); }
  }
  ctx.restore();
}

// こうじちゅうの あしば（u: 0→1 で できあがる）
export function drawScaffold(ctx, rect, u, t = 0) {
  ctx.save();
  ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip();
  ctx.fillStyle = `rgba(255,236,200,${1 - u * 0.6})`; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = '#d99a5e'; ctx.lineWidth = rect.w * 0.02;
  for (let i = 0; i <= 4; i++) { const x = rect.x + rect.w * i / 4; ctx.beginPath(); ctx.moveTo(x, rect.y); ctx.lineTo(x, rect.y + rect.h); ctx.stroke(); }
  for (let j = 0; j <= 3; j++) { const y = rect.y + rect.h * j / 3; ctx.beginPath(); ctx.moveTo(rect.x, y); ctx.lineTo(rect.x + rect.w, y); ctx.stroke(); }
  ctx.strokeStyle = '#e8b27a';
  for (let i = 0; i < 4; i++) { const x = rect.x + rect.w * i / 4; ctx.beginPath(); ctx.moveTo(x, rect.y + rect.h); ctx.lineTo(x + rect.w / 4, rect.y); ctx.stroke(); }
  const k = rect.w / 340;
  emoji(ctx, '🔨', rect.x + rect.w * (0.3 + 0.4 * u), rect.y + rect.h * 0.45 + Math.sin(t * 20) * 8 * k, 60 * k);
  ctx.restore();
}

export function drawBall(ctx, x, y, r, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = '#fff'; circ(ctx, 0, 0, r); ctx.fill();
  ctx.strokeStyle = '#d9c9d2'; ctx.lineWidth = r * 0.08; ctx.stroke();
  ctx.fillStyle = '#ff6f91'; ctx.beginPath(); ctx.arc(0, 0, r, -0.5, 0.9); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#5cc8ff'; ctx.beginPath(); ctx.arc(0, 0, r, 1.6, 3.0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.arc(0, 0, r, 3.7, 5.1); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ell(ctx, -r * 0.35, -r * 0.4, r * 0.25, r * 0.14, -0.6); ctx.fill();
  ctx.restore();
}

export function drawBubble(ctx, x, y, r) {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,.1)'); g.addColorStop(0.8, 'rgba(190,230,255,.25)'); g.addColorStop(1, 'rgba(255,190,240,.7)');
  ctx.fillStyle = g; circ(ctx, x, y, r); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = Math.max(1.5, r * 0.06); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.9)'; ell(ctx, x - r * 0.4, y - r * 0.4, r * 0.18, r * 0.1, -0.7); ctx.fill();
}

export function drawWand(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.4);
  ctx.fillStyle = '#b89ad8'; rr(ctx, -s * 0.06, 0, s * 0.12, s * 0.9, s * 0.05); ctx.fill();
  ctx.strokeStyle = '#ff8fc8'; ctx.lineWidth = s * 0.1; circ(ctx, 0, -s * 0.22, s * 0.26); ctx.stroke();
  ctx.fillStyle = 'rgba(200,235,255,.5)'; circ(ctx, 0, -s * 0.22, s * 0.21); ctx.fill();
  ctx.restore();
}
