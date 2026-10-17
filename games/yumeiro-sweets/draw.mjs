// え を かく（がぞうは つかわず、ずけいだけで かく）
import { CREAMS, DRESSES, THEMES } from './data.mjs';
import { areaOf } from './core.mjs';

export const INK = '#6b4560';
const TAU = Math.PI * 2;

// ---------- きほんの かたち ----------
export function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
export function ell(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU); }
export function circ(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.abs(r), 0, TAU); }
export function starPath(ctx, x, y, r1, r2 = r1 * 0.5, n = 5, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1, a = rot + (i * Math.PI) / n; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath();
}
export function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.95);
  ctx.bezierCurveTo(x - s * 1.25, y + s * 0.15, x - s * 0.95, y - s * 0.95, x, y - s * 0.38);
  ctx.bezierCurveTo(x + s * 0.95, y - s * 0.95, x + s * 1.25, y + s * 0.15, x, y + s * 0.95);
  ctx.closePath();
}
export function drawHeart(ctx, x, y, s, color = '#ff6f9f') {
  ctx.fillStyle = color; heartPath(ctx, x, y, s); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.6)'; ell(ctx, x - s * 0.42, y - s * 0.28, s * 0.2, s * 0.13, -0.6); ctx.fill();
}
// 4つの とがりの きらきら
export function sparkle(ctx, x, y, s, color = '#fff') {
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s);
  ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.fill();
}
export function text(ctx, str, x, y, size, { color = INK, align = 'center', base = 'middle', weight = 900, stroke = null, sw = 0 } = {}) {
  ctx.font = `${weight} ${size}px "Hiragino Maru Gothic ProN","Hiragino Sans","Rounded Mplus 1c","Yu Gothic",system-ui,sans-serif`;
  ctx.textAlign = align; ctx.textBaseline = base;
  if (stroke) { ctx.lineJoin = 'round'; ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.strokeText(str, x, y); }
  ctx.fillStyle = color; ctx.fillText(str, x, y);
}
export const hash = i => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const cream = id => CREAMS[id] || CREAMS.white;

// ---------- おかし ----------
function areaPath(ctx, base) {
  const a = areaOf(base);
  ctx.beginPath();
  for (const p of a.add) {
    if (p.t === 'e') { ctx.moveTo(p.x + p.rx, p.y); ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, TAU); }
    else { ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.w, p.y); ctx.lineTo(p.x + p.w, p.y + p.h); ctx.lineTo(p.x, p.y + p.h); ctx.closePath(); }
  }
  for (const p of a.sub) { ctx.moveTo(p.x + p.rx, p.y); ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, TAU, true); }
}

function plate(ctx, y, rx, ry) {
  ctx.fillStyle = 'rgba(120,70,110,.12)'; ell(ctx, 0.5, y + ry * 0.45, rx * 1.02, ry * 1.05); ctx.fill();
  ctx.fillStyle = '#ffffff'; ell(ctx, 0.5, y, rx, ry); ctx.fill();
  ctx.strokeStyle = '#f3d3e3'; ctx.lineWidth = 0.012; ctx.stroke();
  ctx.strokeStyle = '#fbe6ef'; ell(ctx, 0.5, y - ry * 0.05, rx * 0.72, ry * 0.62); ctx.stroke();
}

const BODY = {
  cake() {
    plate(ctx_, 0.86, 0.46, 0.085);
    const c = ctx_;
    c.fillStyle = '#f2c98a'; ell(c, 0.5, 0.8, 0.36, 0.09); c.fill();
    c.fillStyle = '#ffe0a6'; c.fillRect(0.14, 0.44, 0.72, 0.36);
    // あいだの クリームと いちご
    c.fillStyle = '#fffaf2'; c.beginPath(); c.moveTo(0.14, 0.58); c.ellipse(0.5, 0.58, 0.36, 0.09, 0, Math.PI, 0, true); c.lineTo(0.86, 0.64); c.ellipse(0.5, 0.64, 0.36, 0.09, 0, 0, Math.PI); c.closePath(); c.fill();
    c.fillStyle = '#ff6f8e';
    for (const x of [0.22, 0.38, 0.54, 0.7]) { c.beginPath(); c.arc(x + 0.04, 0.665 + Math.sin(x * 9) * 0.01, 0.035, Math.PI, 0); c.fill(); }
    c.fillStyle = '#fff1cc'; ell(c, 0.5, 0.44, 0.36, 0.11); c.fill();
    c.strokeStyle = 'rgba(200,140,80,.25)'; c.lineWidth = 0.01; c.beginPath(); c.ellipse(0.5, 0.44, 0.36, 0.11, 0, 0, Math.PI); c.stroke();
  },
  cupcake() {
    const c = ctx_;
    plate(c, 0.88, 0.36, 0.06);
    // カップ
    c.save();
    c.beginPath(); c.moveTo(0.2, 0.56); c.lineTo(0.8, 0.56); c.lineTo(0.71, 0.88); c.quadraticCurveTo(0.5, 0.92, 0.29, 0.88); c.closePath();
    c.fillStyle = '#ffc6dc'; c.fill(); c.clip();
    c.fillStyle = '#ffe6f0';
    for (let i = 0; i < 9; i++) { const x = 0.2 + i * 0.07; c.beginPath(); c.moveTo(x, 0.56); c.lineTo(x + 0.035, 0.56); c.lineTo(x + 0.03 + (0.5 - x) * 0.18, 0.92); c.lineTo(x + (0.5 - x) * 0.18, 0.92); c.closePath(); c.fill(); }
    c.restore();
    // ケーキの ぶぶん
    c.fillStyle = '#d99a62'; ell(c, 0.5, 0.5, 0.33, 0.22); c.fill();
    c.fillStyle = '#f0bd84'; ell(c, 0.5, 0.46, 0.31, 0.2); c.fill();
    c.fillStyle = 'rgba(255,255,255,.35)'; ell(c, 0.4, 0.37, 0.1, 0.05, -0.3); c.fill();
    // カップの ふち
    c.fillStyle = '#ffadc9';
    for (let i = 0; i < 7; i++) { circ(c, 0.22 + i * 0.093, 0.585, 0.045); c.fill(); }
  },
  donut() {
    const c = ctx_;
    plate(c, 0.86, 0.45, 0.075);
    c.fillStyle = '#c98651'; ell(c, 0.5, 0.59, 0.37, 0.27); c.fill();
    c.fillStyle = '#eab27a'; ell(c, 0.5, 0.56, 0.37, 0.26); c.fill();
    c.fillStyle = 'rgba(255,255,255,.25)'; ell(c, 0.32, 0.45, 0.1, 0.05, -0.4); c.fill();
    // まんなかの あな
    c.fillStyle = '#c98651'; ell(c, 0.5, 0.53, 0.11, 0.075); c.fill();
    c.fillStyle = '#fff6fa'; ell(c, 0.5, 0.545, 0.1, 0.06); c.fill();
  },
  pancake() {
    const c = ctx_;
    plate(c, 0.84, 0.46, 0.08);
    for (const top of [0.6, 0.5, 0.4]) {
      c.fillStyle = '#d58f4e'; ell(c, 0.5, top + 0.08, 0.37, 0.12); c.fill();
      c.fillRect(0.13, top, 0.74, 0.08);
      c.fillStyle = '#e8a965'; c.fillRect(0.13, top + 0.02, 0.74, 0.03);
      c.fillStyle = '#f7d394'; ell(c, 0.5, top, 0.37, 0.12); c.fill();
    }
    c.fillStyle = '#fff3c4'; rr(c, 0.43, 0.34, 0.14, 0.07, 0.02); c.fill();
    c.fillStyle = '#ffe58f'; c.fillRect(0.43, 0.39, 0.14, 0.02);
  },
  parfait(sw) {
    const c = ctx_;
    c.fillStyle = 'rgba(120,70,110,.12)'; ell(c, 0.5, 0.92, 0.22, 0.03); c.fill();
    c.fillStyle = '#eef6ff'; ell(c, 0.5, 0.9, 0.17, 0.035); c.fill(); c.fillRect(0.47, 0.74, 0.06, 0.16);
    const used = [...new Set([...sw.frost.map(f => f.c), ...sw.dollops.map(d => d.c)])];
    const l1 = cream(used[0] || 'pink').c, l2 = cream(used[1] || 'white').c;
    c.save();
    c.beginPath(); c.moveTo(0.21, 0.36); c.quadraticCurveTo(0.26, 0.72, 0.4, 0.77); c.lineTo(0.6, 0.77); c.quadraticCurveTo(0.74, 0.72, 0.79, 0.36); c.closePath();
    c.clip();
    c.fillStyle = '#f2c27c'; c.fillRect(0, 0.64, 1, 0.2);
    c.fillStyle = '#e0a85e'; for (let i = 0; i < 8; i++) { circ(c, 0.3 + i * 0.06, 0.68 + (i % 2) * 0.03, 0.02); c.fill(); }
    c.fillStyle = l2; c.fillRect(0, 0.55, 1, 0.09);
    c.fillStyle = l1; c.fillRect(0, 0.46, 1, 0.09);
    c.fillStyle = '#fffaf2'; c.fillRect(0, 0.3, 1, 0.16);
    c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(0.25, 0.36, 0.05, 0.36);
    c.restore();
    c.strokeStyle = 'rgba(160,190,230,.6)'; c.lineWidth = 0.012;
    c.beginPath(); c.moveTo(0.21, 0.36); c.quadraticCurveTo(0.26, 0.72, 0.4, 0.77); c.lineTo(0.6, 0.77); c.quadraticCurveTo(0.74, 0.72, 0.79, 0.36); c.stroke();
    // うえの アイス
    c.fillStyle = '#fff6e4';
    for (const [x, y, r] of [[0.36, 0.36, 0.11], [0.64, 0.36, 0.11], [0.5, 0.27, 0.13]]) { circ(c, x, y, r); c.fill(); }
    c.fillStyle = 'rgba(230,200,160,.35)'; ell(c, 0.5, 0.42, 0.26, 0.05); c.fill();
  },
};
let ctx_ = null;

function strokeFrost(ctx, f, w) {
  const p = f.p;
  if (p.length < 2) return;
  ctx.beginPath(); ctx.moveTo(p[0], p[1]);
  if (p.length === 2) ctx.lineTo(p[0] + 0.001, p[1]);
  for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
  ctx.lineWidth = w; ctx.stroke();
}

export function drawFrosting(ctx, sw) {
  if (!sw.frost.length) return;
  ctx.save();
  areaPath(ctx, sw.base); ctx.clip();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const f of sw.frost) {
    const k = cream(f.c);
    if (f.fill) {
      ctx.fillStyle = k.c; ctx.fillRect(0, 0, 1, 1);
      ctx.fillStyle = k.l; ctx.globalAlpha = 0.5; ell(ctx, 0.38, 0.38, 0.14, 0.04, -0.2); ctx.fill(); ctx.globalAlpha = 1;
      continue;
    }
    ctx.strokeStyle = k.d; ctx.save(); ctx.translate(0, 0.008); strokeFrost(ctx, f, 0.2); ctx.restore();
    ctx.strokeStyle = k.c; strokeFrost(ctx, f, 0.18);
    ctx.strokeStyle = k.l; ctx.globalAlpha = 0.55; ctx.save(); ctx.translate(-0.012, -0.018); strokeFrost(ctx, f, 0.05); ctx.restore(); ctx.globalAlpha = 1;
  }
  // まるみの かげ
  if (sw.base === 'cake' || sw.base === 'pancake') {
    const y = sw.base === 'cake' ? 0.44 : 0.4, rx = sw.base === 'cake' ? 0.36 : 0.37, ry = sw.base === 'cake' ? 0.11 : 0.12;
    ctx.strokeStyle = 'rgba(120,60,90,.1)'; ctx.lineWidth = 0.012; ctx.beginPath(); ctx.ellipse(0.5, y, rx, ry, 0, 0.1, Math.PI - 0.1); ctx.stroke();
  }
  ctx.restore();
}

export function drawDollop(ctx, x, y, s, cid, kind = 'swirl') {
  const k = cream(cid);
  if (kind === 'drop') {
    ctx.fillStyle = k.d; ell(ctx, x, y + s * 0.05, s * 0.85, s * 0.55); ctx.fill();
    ctx.fillStyle = k.c; ctx.beginPath();
    ctx.moveTo(x - s * 0.82, y - s * 0.05);
    ctx.bezierCurveTo(x - s * 0.88, y - s * 0.72, x - s * 0.2, y - s * 0.8, x + s * 0.02, y - s * 0.88);
    ctx.bezierCurveTo(x + s * 0.25, y - s * 0.8, x + s * 0.9, y - s * 0.65, x + s * 0.82, y - s * 0.05);
    ctx.quadraticCurveTo(x, y + s * 0.45, x - s * 0.82, y - s * 0.05); ctx.fill();
    ctx.fillStyle = k.l; ell(ctx, x - s * 0.35, y - s * 0.4, s * 0.2, s * 0.13, -0.5); ctx.fill();
    return;
  }
  // ほしがたの しぼりぐち：ひとつの やまに すじが はいった ホイップ
  const body = () => {
    ctx.beginPath(); ctx.moveTo(x - s * 0.92, y);
    ctx.bezierCurveTo(x - s * 0.95, y - s * 0.5, x - s * 0.3, y - s * 0.62, x + s * 0.04, y - s * 1.22);
    ctx.bezierCurveTo(x + s * 0.3, y - s * 0.62, x + s * 0.95, y - s * 0.5, x + s * 0.92, y);
    ctx.ellipse(x, y, s * 0.92, s * 0.36, 0, 0, Math.PI); ctx.closePath();
  };
  ctx.fillStyle = k.d; ell(ctx, x, y + s * 0.08, s * 0.92, s * 0.36); ctx.fill();
  ctx.fillStyle = k.c; body(); ctx.fill();
  ctx.save(); body(); ctx.clip();
  ctx.lineCap = 'round';
  for (let i = -3; i <= 3; i++) {
    const bx = x + i * s * 0.29, by = y + s * 0.34 * Math.sqrt(1 - (i / 3.3) ** 2);
    ctx.strokeStyle = k.d; ctx.globalAlpha = 0.5; ctx.lineWidth = s * 0.07;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(x + i * s * 0.2, y - s * 0.55, x + s * 0.04, y - s * 1.2); ctx.stroke();
    ctx.strokeStyle = k.l; ctx.globalAlpha = 0.8; ctx.lineWidth = s * 0.06;
    ctx.beginPath(); ctx.moveTo(bx - s * 0.11, by - s * 0.02); ctx.quadraticCurveTo(x + i * s * 0.2 - s * 0.09, y - s * 0.55, x + s * 0.02, y - s * 1.1); ctx.stroke();
  }
  ctx.restore(); ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.7; ell(ctx, x - s * 0.36, y - s * 0.36, s * 0.1, s * 0.2, 0.5); ctx.fill(); ctx.globalAlpha = 1;
}

const MAC = ['#ffb6d0', '#aee0ff', '#aef0d6', '#d8bfff', '#fff0a0'];

export function drawTopping(ctx, id, x, y, s, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  const c = ctx;
  switch (id) {
    case 'strawberry': {
      c.fillStyle = '#ff5c7f'; c.beginPath(); c.moveTo(0, 1.05);
      c.bezierCurveTo(-1.05, 0.5, -1.0, -0.65, 0, -0.55); c.bezierCurveTo(1.0, -0.65, 1.05, 0.5, 0, 1.05); c.fill();
      c.fillStyle = '#ff8fa8'; ell(c, -0.38, -0.15, 0.2, 0.32, 0.3); c.fill();
      c.fillStyle = '#fff2a8'; for (const [a, b] of [[-0.35, 0.15], [0.3, 0.05], [0, 0.45], [-0.2, -0.2], [0.35, 0.45], [0.05, -0.05]]) { ell(c, a, b, 0.06, 0.09); c.fill(); }
      c.fillStyle = '#6fcf7f'; for (let i = 0; i < 5; i++) { c.save(); c.translate(0, -0.6); c.rotate(-1.2 + i * 0.6); ell(c, 0, -0.18, 0.12, 0.28); c.fill(); c.restore(); }
      break;
    }
    case 'heart':
      c.fillStyle = '#e75a8f'; heartPath(c, 0, 0.06, 1); c.fill();
      c.fillStyle = '#ff8fbd'; heartPath(c, 0, -0.02, 0.9); c.fill();
      c.fillStyle = 'rgba(255,255,255,.65)'; ell(c, -0.4, -0.3, 0.2, 0.12, -0.6); c.fill();
      break;
    case 'star':
      c.lineJoin = 'round';
      c.fillStyle = '#f2b84a'; c.strokeStyle = '#f2b84a'; c.lineWidth = 0.25; starPath(c, 0, 0.06, 1, 0.5); c.fill(); c.stroke();
      c.fillStyle = '#ffe070'; c.strokeStyle = '#ffe070'; c.lineWidth = 0.2; starPath(c, 0, 0, 0.92, 0.46); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.7)'; ell(c, -0.25, -0.3, 0.14, 0.09, -0.6); c.fill();
      break;
    case 'cherry':
      c.strokeStyle = '#6aa85a'; c.lineWidth = 0.12; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -0.2); c.quadraticCurveTo(0.1, -0.9, 0.55, -1.15); c.stroke();
      c.fillStyle = '#8fd47a'; ell(c, 0.75, -1.05, 0.3, 0.14, -0.4); c.fill();
      c.fillStyle = '#d93a5c'; circ(c, 0, 0.25, 0.62); c.fill();
      c.fillStyle = '#ff5c7f'; circ(c, -0.04, 0.2, 0.56); c.fill();
      c.fillStyle = 'rgba(255,255,255,.7)'; ell(c, -0.25, -0.02, 0.15, 0.1, -0.6); c.fill();
      break;
    case 'ribbon':
      c.fillStyle = '#e46fa3';
      for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(sx * 0.6, -0.95, sx * 1.05, -0.45); c.quadraticCurveTo(sx * 1.15, 0.2, 0, 0); c.fill(); }
      for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(0, 0.05); c.lineTo(sx * 0.55, 0.95); c.lineTo(sx * 0.25, 0.85); c.closePath(); c.fill(); }
      c.fillStyle = '#ff9cc8';
      for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(0, -0.05); c.quadraticCurveTo(sx * 0.55, -0.82, sx * 0.92, -0.42); c.quadraticCurveTo(sx * 1.0, 0.08, 0, -0.05); c.fill(); }
      c.fillStyle = '#e46fa3'; rr(c, -0.22, -0.24, 0.44, 0.42, 0.14); c.fill();
      c.fillStyle = 'rgba(255,255,255,.5)'; ell(c, -0.55, -0.45, 0.16, 0.08, -0.6); c.fill();
      break;
    case 'macaron': {
      const col = MAC[Math.floor(hash(Math.round((x + y) * 1000)) * MAC.length)];
      c.fillStyle = 'rgba(0,0,0,.08)'; ell(c, 0, 0.55, 0.95, 0.4); c.fill();
      c.fillStyle = col; ell(c, 0, 0.32, 0.92, 0.36); c.fill();
      c.fillStyle = '#fffaf2'; rr(c, -0.86, -0.12, 1.72, 0.3, 0.14); c.fill();
      c.fillStyle = col; ell(c, 0, -0.25, 0.92, 0.42); c.fill();
      c.fillStyle = 'rgba(255,255,255,.55)'; ell(c, -0.35, -0.42, 0.28, 0.1, -0.2); c.fill();
      break;
    }
    case 'crown':
      c.lineJoin = 'round';
      c.fillStyle = '#f2b84a'; c.beginPath(); c.moveTo(-0.95, 0.6); c.lineTo(-1.0, -0.5); c.lineTo(-0.5, 0.0); c.lineTo(0, -0.85); c.lineTo(0.5, 0.0); c.lineTo(1.0, -0.5); c.lineTo(0.95, 0.6); c.closePath(); c.fill();
      c.fillStyle = '#ffe070'; c.beginPath(); c.moveTo(-0.82, 0.48); c.lineTo(-0.86, -0.25); c.lineTo(-0.48, 0.15); c.lineTo(0, -0.6); c.lineTo(0.48, 0.15); c.lineTo(0.86, -0.25); c.lineTo(0.82, 0.48); c.closePath(); c.fill();
      c.fillStyle = '#ff6fa3'; circ(c, 0, 0.22, 0.17); c.fill();
      c.fillStyle = '#7fc8ff'; circ(c, -0.5, 0.3, 0.12); c.fill(); circ(c, 0.5, 0.3, 0.12); c.fill();
      c.fillStyle = '#fff'; for (const [a, b] of [[-1, -0.5], [0, -0.85], [1, -0.5]]) { circ(c, a, b, 0.12); c.fill(); }
      break;
    case 'rainbow': {
      const cols = ['#ff8fae', '#ffc27a', '#fff08a', '#9fe6b8', '#9fd4ff', '#c7a8ff'];
      c.lineCap = 'butt';
      cols.forEach((col, i) => { c.strokeStyle = col; c.lineWidth = 0.15; c.beginPath(); c.arc(0, 0.45, 1.05 - i * 0.14, Math.PI, 0); c.stroke(); });
      c.fillStyle = '#fff';
      for (const sx of [-1, 1]) { circ(c, sx * 0.85, 0.5, 0.26); c.fill(); circ(c, sx * 0.62, 0.55, 0.2); c.fill(); circ(c, sx * 1.08, 0.56, 0.18); c.fill(); }
      break;
    }
    case 'butterfly':
      c.fillStyle = '#c7a8ff'; ell(c, -0.5, -0.32, 0.5, 0.42, -0.4); c.fill(); ell(c, 0.5, -0.32, 0.5, 0.42, 0.4); c.fill();
      c.fillStyle = '#ffb6d0'; ell(c, -0.42, 0.35, 0.36, 0.3, 0.4); c.fill(); ell(c, 0.42, 0.35, 0.36, 0.3, -0.4); c.fill();
      c.fillStyle = '#fff'; for (const [a, b] of [[-0.55, -0.35], [0.55, -0.35], [-0.42, 0.38], [0.42, 0.38]]) { circ(c, a, b, 0.11); c.fill(); }
      c.fillStyle = '#7b5a8a'; rr(c, -0.08, -0.55, 0.16, 1.1, 0.08); c.fill();
      c.strokeStyle = '#7b5a8a'; c.lineWidth = 0.06; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-0.02, -0.5); c.quadraticCurveTo(-0.2, -0.9, -0.35, -0.95); c.moveTo(0.02, -0.5); c.quadraticCurveTo(0.2, -0.9, 0.35, -0.95); c.stroke();
      break;
    case 'bear':
      c.fillStyle = '#d29a68'; circ(c, -0.62, -0.6, 0.32); c.fill(); circ(c, 0.62, -0.6, 0.32); c.fill();
      circ(c, 0, 0, 0.85); c.fill();
      c.fillStyle = '#e8b989'; circ(c, 0, -0.04, 0.76); c.fill();
      c.fillStyle = '#f7d7b0'; ell(c, 0, 0.25, 0.34, 0.25); c.fill();
      c.fillStyle = '#6b4560'; circ(c, -0.3, -0.12, 0.09); c.fill(); circ(c, 0.3, -0.12, 0.09); c.fill(); ell(c, 0, 0.15, 0.1, 0.07); c.fill();
      c.fillStyle = 'rgba(255,130,160,.5)'; circ(c, -0.5, 0.15, 0.12); c.fill(); circ(c, 0.5, 0.15, 0.12); c.fill();
      break;
  }
  ctx.restore();
}

// おかしを まるごと かく（x,y：ひだりうえ、S：おおきさ）
export function drawSweet(ctx, sw, x, y, S, { t = 0, glint = true } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(S, S);
  ctx_ = ctx;
  BODY[sw.base]?.(sw);
  drawFrosting(ctx, sw);
  const ds = [...sw.dollops].sort((a, b) => a.y - b.y);
  for (const d of ds) drawDollop(ctx, d.x, d.y, 0.068, d.c, d.k);
  const ts = [...sw.tops].sort((a, b) => a.y - b.y);
  for (const tp of ts) drawTopping(ctx, tp.id, tp.x, tp.y, 0.062, tp.r);
  if (sw.magic && glint) {
    for (let i = 0; i < 9; i++) {
      const a = Math.sin(t * 3 + i * 1.7) * 0.5 + 0.5;
      ctx.globalAlpha = 0.35 + a * 0.65;
      sparkle(ctx, 0.15 + hash(i + 3) * 0.7, 0.2 + hash(i + 11) * 0.6, 0.012 + a * 0.022, i % 3 ? '#fff' : '#fff3a8');
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// ---------- キャラクター ----------
// かお（ex：めの よこの はなれ、ey：めの たかさ）
function face(ctx, { ex, ey, er, mood, blink, mouthY, cheekX, cheekY, cheekR, eye = '#5a3550', tears = false, t = 0 }) {
  const happy = mood === 'happy' || mood === 'super';
  ctx.lineCap = 'round';
  if (happy) {
    ctx.strokeStyle = eye; ctx.lineWidth = er * 0.55;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * ex, ey + er * 0.5, er * 0.95, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
  } else if (blink) {
    ctx.strokeStyle = eye; ctx.lineWidth = er * 0.45;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * ex, ey - er * 0.2, er * 0.8, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); }
  } else {
    for (const s of [-1, 1]) {
      ctx.fillStyle = eye; ell(ctx, s * ex, ey, er, er * 1.12); ctx.fill();
      ctx.fillStyle = '#fff'; circ(ctx, s * ex - er * 0.3, ey - er * 0.38, er * 0.38); ctx.fill();
      circ(ctx, s * ex + er * 0.35, ey + er * 0.4, er * 0.16); ctx.fill();
    }
  }
  ctx.fillStyle = mood === 'super' ? 'rgba(255,110,150,.6)' : 'rgba(255,140,170,.45)';
  for (const s of [-1, 1]) { ell(ctx, s * cheekX, cheekY, cheekR * (mood === 'super' ? 1.25 : 1), cheekR * 0.62); ctx.fill(); }
  ctx.strokeStyle = eye; ctx.lineWidth = er * 0.38;
  if (mood === 'super') {
    ctx.fillStyle = '#ff7f9f'; ctx.beginPath(); ctx.arc(0, mouthY - er * 0.2, er * 0.95, 0.1, Math.PI - 0.1); ctx.closePath(); ctx.fill();
    ctx.stroke();
  } else {
    // ω の くち
    ctx.beginPath(); ctx.arc(-er * 0.45, mouthY, er * 0.45, 0.2, Math.PI - 0.2); ctx.moveTo(er * 0.9, mouthY); ctx.arc(er * 0.45, mouthY, er * 0.45, 0.2, Math.PI - 0.2); ctx.stroke();
  }
  if (tears) {
    ctx.fillStyle = '#9fd8ff';
    for (const s of [-1, 1]) { const d = ((t * 1.4 + (s > 0 ? 0.5 : 0)) % 1); ctx.globalAlpha = 1 - d; ell(ctx, s * (ex + er * 1.1), ey + er + d * er * 4, er * 0.35, er * 0.5); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
}

function paws(ctx, color, line, y = -0.05, dx = 0.55) {
  ctx.fillStyle = color; ctx.strokeStyle = line; ctx.lineWidth = 0.05;
  for (const s of [-1, 1]) { ell(ctx, s * dx, y, 0.24, 0.17); ctx.fill(); ctx.stroke(); }
}

const CUST = {
  usagi(ctx, st) {
    const W = '#fffafc', L = '#f2c7d8';
    ctx.lineWidth = 0.06; ctx.strokeStyle = L;
    const flop = Math.sin(st.t * 2) * 0.05 + (st.mood === 'super' ? Math.sin(st.t * 14) * 0.12 : 0);
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * 0.38, -2.65); ctx.rotate(s * (0.12 + flop));
      ctx.fillStyle = W; ell(ctx, 0, -0.45, 0.27, 0.72); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffc4d8'; ell(ctx, 0, -0.42, 0.13, 0.52); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = W; ell(ctx, 0, -0.45, 0.95, 0.75); ctx.fill(); ctx.stroke();
    ell(ctx, 0, -1.75, 1.1, 0.98); ctx.fill(); ctx.stroke();
    paws(ctx, W, L);
    face(ctx, { ex: 0.42, ey: -1.78, er: 0.13, mood: st.mood, blink: st.blink, mouthY: -1.45, cheekX: 0.68, cheekY: -1.48, cheekR: 0.2 });
  },
  kuma(ctx, st) {
    const B = '#e9c29b', D = '#c99a72';
    ctx.lineWidth = 0.06; ctx.strokeStyle = D;
    for (const s of [-1, 1]) { ctx.fillStyle = B; circ(ctx, s * 0.78, -2.55, 0.34); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#f7d9bd'; circ(ctx, s * 0.78, -2.55, 0.18); ctx.fill(); }
    ctx.fillStyle = B; ell(ctx, 0, -0.45, 0.92, 0.72); ctx.fill(); ctx.stroke();
    ell(ctx, 0, -1.75, 1.08, 0.95); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f7dfc6'; ell(ctx, 0, -1.4, 0.4, 0.28); ctx.fill();
    ctx.fillStyle = '#7a4f4a'; ell(ctx, 0, -1.5, 0.11, 0.08); ctx.fill();
    paws(ctx, B, D);
    face(ctx, { ex: 0.45, ey: -1.85, er: 0.13, mood: st.mood, blink: st.blink, mouthY: -1.33, cheekX: 0.7, cheekY: -1.5, cheekR: 0.18, tears: st.mood === 'super', t: st.t });
  },
  hitsuji(ctx, st) {
    const Wo = '#fffaf0', L = '#eadcc6';
    ctx.fillStyle = Wo; ctx.strokeStyle = L; ctx.lineWidth = 0.05;
    for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; circ(ctx, Math.cos(a) * 0.95, -0.5 + Math.sin(a) * 0.55, 0.38); ctx.fill(); ctx.stroke(); }
    ell(ctx, 0, -0.5, 0.95, 0.6); ctx.fill();
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; circ(ctx, Math.cos(a) * 1.0, -1.8 + Math.sin(a) * 0.85, 0.4); ctx.fill(); ctx.stroke(); }
    ell(ctx, 0, -1.8, 1.05, 0.9); ctx.fill();
    ctx.fillStyle = '#e8c69a'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 0.88, -1.55, 0.24, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#f8dfd0'; ell(ctx, 0, -1.6, 0.72, 0.6); ctx.fill();
    // ねむねむ ぼうし
    ctx.fillStyle = '#aee0ff'; ctx.beginPath(); ctx.moveTo(-0.85, -2.25); ctx.quadraticCurveTo(0, -3.1, 0.95, -3.0); ctx.quadraticCurveTo(0.6, -2.6, 0.85, -2.25); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; rr(ctx, -0.95, -2.38, 1.9, 0.26, 0.13); ctx.fill(); circ(ctx, 1.0, -3.0, 0.17); ctx.fill();
    ctx.fillStyle = '#ffe070'; starPath(ctx, 0.05, -2.62, 0.17, 0.08); ctx.fill();
    paws(ctx, Wo, L);
    const sleepy = st.mood === 'idle';
    face(ctx, { ex: 0.32, ey: -1.62, er: 0.11, mood: st.mood, blink: sleepy || st.blink, mouthY: -1.3, cheekX: 0.5, cheekY: -1.38, cheekR: 0.15 });
  },
  neko(ctx, st) {
    const B = '#dccaff', D = '#b9a0ec';
    ctx.lineWidth = 0.06; ctx.strokeStyle = D; ctx.lineJoin = 'round';
    for (const s of [-1, 1]) {
      ctx.fillStyle = B; ctx.beginPath(); ctx.moveTo(s * 0.95, -2.05); ctx.lineTo(s * 0.8, -2.95); ctx.lineTo(s * 0.2, -2.6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffc4dc'; ctx.beginPath(); ctx.moveTo(s * 0.8, -2.25); ctx.lineTo(s * 0.74, -2.75); ctx.lineTo(s * 0.4, -2.55); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = B; ell(ctx, 0, -0.45, 0.92, 0.72); ctx.fill(); ctx.stroke();
    ell(ctx, 0, -1.75, 1.12, 0.92); ctx.fill(); ctx.stroke();
    drawTopping(ctx, 'ribbon', 0.62, -2.55, 0.3, 0.3);
    ctx.strokeStyle = D; ctx.lineWidth = 0.04;
    for (const s of [-1, 1]) for (const dy of [-0.06, 0.08]) { ctx.beginPath(); ctx.moveTo(s * 0.75, -1.45 + dy); ctx.lineTo(s * 1.25, -1.5 + dy * 2); ctx.stroke(); }
    paws(ctx, B, D);
    face(ctx, { ex: 0.44, ey: -1.8, er: 0.15, mood: st.mood, blink: st.blink, mouthY: -1.4, cheekX: 0.68, cheekY: -1.5, cheekR: 0.18, eye: '#5d3f7a' });
  },
  penguin(ctx, st) {
    const N = '#5f6fbf', D = '#47549c';
    ctx.lineWidth = 0.06; ctx.strokeStyle = D;
    ctx.fillStyle = N; ell(ctx, 0, -0.5, 1.0, 0.75); ctx.fill(); ctx.stroke();
    ell(ctx, 0, -1.75, 1.08, 0.98); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ell(ctx, 0, -0.42, 0.65, 0.55); ctx.fill();
    for (const s of [-1, 1]) { ell(ctx, s * 0.38, -1.7, 0.45, 0.55); ctx.fill(); }
    ell(ctx, 0, -1.42, 0.7, 0.42); ctx.fill();
    ctx.fillStyle = '#ffb34d'; ell(ctx, 0, -1.48, 0.17, 0.1); ctx.fill();
    drawTopping(ctx, 'star', 0, -2.75, 0.22, 0.2);
    paws(ctx, N, D, -0.1, 0.75);
    face(ctx, { ex: 0.4, ey: -1.78, er: 0.12, mood: st.mood, blink: st.blink, mouthY: -1.3, cheekX: 0.66, cheekY: -1.48, cheekR: 0.16 });
  },
  punyu(ctx, st) {
    const Wp = '#fff4f7', L = '#f0c3d2';
    ctx.lineWidth = 0.06; ctx.strokeStyle = L;
    for (const s of [-1, 1]) {
      ctx.fillStyle = Wp; ell(ctx, s * 0.62, -2.35, 0.26, 0.38, s * 0.15); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffadc3'; ell(ctx, s * 0.62, -2.33, 0.12, 0.22, s * 0.15); ctx.fill();
    }
    ctx.fillStyle = Wp; ell(ctx, 0, -1.25, 1.2, 1.12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ell(ctx, -0.42, -1.85, 0.2, 0.1, -0.5); ctx.fill();
    ctx.fillStyle = '#ff5d86';
    ctx.beginPath(); ctx.moveTo(0, -0.42); ctx.lineTo(-0.28, -0.56); ctx.lineTo(-0.28, -0.26); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -0.42); ctx.lineTo(0.28, -0.56); ctx.lineTo(0.28, -0.26); ctx.closePath(); ctx.fill();
    circ(ctx, 0, -0.42, 0.08); ctx.fill();
    paws(ctx, Wp, L);
    face(ctx, { ex: 0.42, ey: -1.32, er: 0.14, mood: st.mood, blink: st.blink, mouthY: -0.95, cheekX: 0.72, cheekY: -1.0, cheekR: 0.22 });
  },
};

// おきゃくさん（x：まんなか、y：カウンターの たかさ、s：おおきさ）
export function drawCustomer(ctx, id, x, y, s, st = {}) {
  const t = st.t || 0;
  const bounce = st.mood === 'super' ? Math.abs(Math.sin(t * 9)) * 0.35 : st.mood === 'happy' ? Math.abs(Math.sin(t * 6)) * 0.15 : Math.sin(t * 2.2) * 0.03;
  ctx.save(); ctx.translate(x, y - bounce * s); ctx.scale(s, s);
  if (st.flip) ctx.scale(-1, 1);
  (CUST[id] || CUST.usagi)(ctx, { t, mood: st.mood || 'idle', blink: st.blink });
  ctx.restore();
}

// パティシエの おんなのこ（casual：へんしん まえ）
export function drawGirl(ctx, x, y, s, st = {}) {
  const t = st.t || 0, casual = st.casual, dr = DRESSES[st.dress] || DRESSES.pink;
  const hair = casual ? '#a87560' : dr.hair, hairD = casual ? '#8a5a48' : dr.hairD;
  const skin = '#ffeadf', skinD = '#f2c9b8';
  const pose = st.pose || 'idle';
  const bob = Math.sin(t * 2.4) * 0.03;
  ctx.save(); ctx.translate(x, y + bob * s); ctx.scale(s, s);
  if (st.spin != null) ctx.scale(Math.cos(st.spin) || 0.001, 1);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  // ツインテール（うしろ）
  if (!casual) {
    const sway = Math.sin(t * 2.2) * 0.06;
    for (const sd of [-1, 1]) {
      ctx.save(); ctx.translate(sd * 0.95, -2.45); ctx.rotate(sd * (0.25 + sway));
      ctx.fillStyle = hairD; ell(ctx, sd * 0.12, 0.95, 0.45, 1.05); ctx.fill();
      ctx.fillStyle = hair; ell(ctx, sd * 0.08, 0.9, 0.38, 0.98); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ell(ctx, -sd * 0.08, 0.5, 0.08, 0.35); ctx.fill();
      ctx.restore();
    }
  } else {
    ctx.fillStyle = hairD; ell(ctx, 0, -1.75, 1.04, 1.0); ctx.fill();
  }

  // からだ
  const main = casual ? '#ffe3ef' : dr.main, sub = casual ? '#ffffff' : dr.sub;
  ctx.fillStyle = main;
  ctx.beginPath(); ctx.moveTo(-0.6, -1.05); ctx.lineTo(0.6, -1.05); ctx.quadraticCurveTo(0.95, -0.4, 1.05, 0.4); ctx.lineTo(-1.05, 0.4); ctx.quadraticCurveTo(-0.95, -0.4, -0.6, -1.05); ctx.fill();
  if (dr.rainbow && !casual) {
    const cols = ['#ff9ccb', '#ffc98a', '#fff08a', '#9fe6b8', '#9fd4ff', '#c7a8ff'];
    ctx.save(); ctx.clip(); cols.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(-1.2, -0.9 + i * 0.22, 2.4, 0.23); }); ctx.restore();
  }
  if (!casual) {
    // エプロンと フリル
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(-0.45, -0.75); ctx.lineTo(0.45, -0.75); ctx.lineTo(0.62, 0.4); ctx.lineTo(-0.62, 0.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = sub;
    for (let i = 0; i < 6; i++) { circ(ctx, -0.42 + i * 0.168, -0.75, 0.1); ctx.fill(); }
    ctx.fillStyle = main; rr(ctx, -0.42, -0.42, 0.84, 0.1, 0.05); ctx.fill();
    drawHeart(ctx, 0, -0.95, 0.17, '#ff6f9f');
    ctx.fillStyle = '#ffe070'; circ(ctx, 0, -0.95, 0.05); ctx.fill();
  } else {
    ctx.fillStyle = '#ff9cc6'; drawHeart(ctx, 0, -0.45, 0.22, '#ffadd0');
  }
  // そで
  ctx.fillStyle = casual ? '#ffe3ef' : sub;
  for (const sd of [-1, 1]) { circ(ctx, sd * 0.78, -0.9, 0.32); ctx.fill(); }

  // うで
  const HANDS = {
    idle: [[-0.95, -0.1], [0.95, -0.1]],
    give: [[-0.45, -0.55], [0.45, -0.55]],
    up: [[-0.95, -0.15], [0.9, -2.3]],
    cheer: [[-1.2, -2.1], [1.2, -2.1]],
  };
  const hands = HANDS[pose] || HANDS.idle;
  for (let i = 0; i < 2; i++) {
    const sd = i ? 1 : -1, [hx, hy] = hands[i];
    ctx.strokeStyle = skin; ctx.lineWidth = 0.26;
    ctx.beginPath(); ctx.moveTo(sd * 0.8, -0.85); ctx.quadraticCurveTo(sd * 1.0 + (hx - sd) * 0.2, (hy - 0.85) / 2, hx, hy); ctx.stroke();
    ctx.fillStyle = skin; circ(ctx, hx, hy, 0.17); ctx.fill();
    if (i === 1 && pose === 'up' && !casual) {
      ctx.strokeStyle = '#ff8fbd'; ctx.lineWidth = 0.1; ctx.beginPath(); ctx.moveTo(hx, hy + 0.1); ctx.lineTo(hx, hy - 0.55); ctx.stroke();
      ctx.fillStyle = '#ffe070'; starPath(ctx, hx, hy - 0.75, 0.3, 0.14); ctx.fill();
      ctx.fillStyle = '#fff'; circ(ctx, hx - 0.06, hy - 0.8, 0.06); ctx.fill();
    }
  }

  // あたま
  // ほそめの りんかく（したに いくほど すっきり）
  ctx.fillStyle = skin; ctx.beginPath();
  ctx.moveTo(-0.84, -1.85);
  ctx.bezierCurveTo(-0.84, -1.38, -0.42, -1.0, 0, -0.97);
  ctx.bezierCurveTo(0.42, -1.0, 0.84, -1.38, 0.84, -1.85);
  ctx.ellipse(0, -1.95, 0.84, 0.98, 0, 0.102, Math.PI - 0.102, true);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = skinD; ctx.globalAlpha = 0.4; ell(ctx, 0, -1.05, 0.35, 0.08); ctx.fill(); ctx.globalAlpha = 1;
  // まえがみ
  ctx.fillStyle = hair;
  ctx.beginPath(); ctx.ellipse(0, -1.95, 0.92, 1.04, 0, Math.PI * 0.93, Math.PI * 2.07);
  const tips = casual ? [[0.88, -1.4], [0.5, -2.0], [0.18, -1.62], [-0.18, -2.05], [-0.5, -1.66], [-0.9, -1.38]] : [[0.9, -1.55], [0.57, -2.05], [0.28, -1.72], [0, -2.1], [-0.3, -1.72], [-0.59, -2.05], [-0.9, -1.55]];
  for (let i = 0; i < tips.length; i++) { const [px, py] = tips[i]; ctx.quadraticCurveTo(px + 0.1, py - 0.3, px, py); }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ell(ctx, -0.45, -2.5, 0.28, 0.08, -0.4); ctx.fill();
  if (casual) { ctx.fillStyle = hair; for (const sd of [-1, 1]) { ell(ctx, sd * 0.86, -1.5, 0.2, 0.5, sd * 0.1); ctx.fill(); } }
  else {
    // ぼうし（ちいさな コックさんの ぼうし）
    ctx.save(); ctx.translate(0.25, -2.85); ctx.rotate(0.18);
    ctx.fillStyle = '#ffffff';
    for (const [px, py, r] of [[-0.35, -0.25, 0.32], [0.05, -0.42, 0.38], [0.42, -0.22, 0.3]]) { circ(ctx, px, py, r); ctx.fill(); }
    rr(ctx, -0.55, -0.2, 1.1, 0.34, 0.12); ctx.fill();
    ctx.fillStyle = dr.main; rr(ctx, -0.55, -0.02, 1.1, 0.14, 0.07); ctx.fill();
    ctx.restore();
    for (const sd of [-1, 1]) drawTopping(ctx, 'ribbon', sd * 0.95, -2.5, 0.22, sd * 0.3);
  }
  // かお
  ctx.save(); ctx.translate(0, -1.75);
  const mood = st.mood || 'idle';
  const happy = mood === 'happy' || mood === 'super';
  if (happy) {
    ctx.strokeStyle = '#6a3d6e'; ctx.lineWidth = 0.1;
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(sd * 0.38, 0.05, 0.17, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
  } else if (st.blink) {
    ctx.strokeStyle = '#6a3d6e'; ctx.lineWidth = 0.08;
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(sd * 0.38, -0.05, 0.16, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); }
  } else {
    for (const sd of [-1, 1]) {
      ctx.fillStyle = '#6a3d6e'; ell(ctx, sd * 0.38, 0, 0.17, 0.24); ctx.fill();
      ctx.fillStyle = casual ? '#a26a80' : '#d06aa0'; ell(ctx, sd * 0.38, 0.09, 0.13, 0.13); ctx.fill();
      ctx.fillStyle = '#fff'; circ(ctx, sd * 0.38 - 0.06, -0.09, 0.07); ctx.fill(); circ(ctx, sd * 0.38 + 0.06, 0.1, 0.03); ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(255,130,160,.45)'; for (const sd of [-1, 1]) { ell(ctx, sd * 0.62, 0.22, 0.17, 0.1); ctx.fill(); }
  ctx.strokeStyle = '#c75a7a'; ctx.lineWidth = 0.07;
  if (happy) { ctx.fillStyle = '#ff8fa8'; ctx.beginPath(); ctx.arc(0, 0.33, 0.15, 0, Math.PI); ctx.closePath(); ctx.fill(); }
  else { ctx.beginPath(); ctx.arc(0, 0.28, 0.1, 0.25, Math.PI - 0.25); ctx.stroke(); }
  ctx.restore();
  ctx.restore();
}

// ---------- ふきだし ----------
export function bubble(ctx, x, y, w, h, tx, ty, { fill = '#ffffff', line = '#ffb6d0' } = {}) {
  ctx.save();
  ctx.fillStyle = 'rgba(150,80,120,.15)'; rr(ctx, x + 4, y + 8, w, h, 34); ctx.fill();
  ctx.fillStyle = fill; ctx.strokeStyle = line; ctx.lineWidth = 6;
  const cx = Math.max(x + 50, Math.min(x + w - 50, tx));
  rr(ctx, x, y, w, h, 34); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 26, y + h - 3); ctx.lineTo(tx, ty); ctx.lineTo(cx + 26, y + h - 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = fill; ctx.fillRect(cx - 24, y + h - 8, 48, 8);
  ctx.restore();
}

// ---------- はいけい ----------
export function drawShop(ctx, W, H, themeId, t, { name = '', shelf = [], counterY, signX } = {}) {
  const th = THEMES[themeId] || THEMES.ichigo;
  ctx.fillStyle = th.wall; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = th.stripe; for (let x = 0; x < W; x += 90) ctx.fillRect(x, 0, 45, H);
  if (th.night) { for (let i = 0; i < 40; i++) { ctx.globalAlpha = 0.25 + 0.25 * Math.sin(t * 2 + i); sparkle(ctx, hash(i) * W, 120 + hash(i + 50) * (counterY - 160), 4 + hash(i + 9) * 5, '#ffe9a8'); } ctx.globalAlpha = 1; }

  // まど
  const wx = W / 2 - 190, wy = 175, ww = 380, wh = 300;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(wx, wy + wh); ctx.lineTo(wx, wy + ww / 2); ctx.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0); ctx.lineTo(wx + ww, wy + wh); ctx.closePath();
  const g = ctx.createLinearGradient(0, wy, 0, wy + wh); g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
  ctx.fillStyle = g; ctx.fill(); ctx.save(); ctx.clip();
  if (th.night) {
    ctx.fillStyle = '#fff6c8'; circ(ctx, wx + ww * 0.72, wy + 90, 34); ctx.fill(); ctx.fillStyle = th.sky[0]; circ(ctx, wx + ww * 0.72 + 16, wy + 80, 30); ctx.fill();
    for (let i = 0; i < 14; i++) sparkle(ctx, wx + hash(i + 2) * ww, wy + hash(i + 7) * wh * 0.8, 3 + 3 * (0.5 + 0.5 * Math.sin(t * 3 + i)), '#fff');
  } else {
    for (let i = 0; i < 3; i++) {
      const cx = wx + ((t * 12 + i * 160) % (ww + 200)) - 100, cy = wy + 80 + i * 70;
      ctx.fillStyle = 'rgba(255,255,255,.95)'; circ(ctx, cx, cy, 26); ctx.fill(); circ(ctx, cx + 28, cy - 10, 30); ctx.fill(); circ(ctx, cx + 58, cy, 24); ctx.fill(); rr(ctx, cx - 10, cy, 80, 24, 12); ctx.fill();
    }
    // にじ
    ctx.globalAlpha = 0.45; ['#ff9cc0', '#ffd08a', '#fff39a', '#a6ecc0', '#a6d8ff', '#cdb2ff'].forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(wx + ww / 2, wy + wh + 40, 240 - i * 12, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }); ctx.globalAlpha = 1;
  }
  ctx.restore();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 18; ctx.stroke();
  ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.moveTo(wx, wy + wh * 0.55); ctx.lineTo(wx + ww, wy + wh * 0.55); ctx.stroke();
  ctx.restore();
  // カーテン
  ctx.fillStyle = th.awn[0]; ctx.globalAlpha = 0.85;
  for (const sd of [-1, 1]) {
    const ex = sd < 0 ? wx - 30 : wx + ww + 30;
    ctx.beginPath(); ctx.moveTo(ex, wy - 20); ctx.lineTo(ex + sd * -110, wy - 20); ctx.quadraticCurveTo(ex + sd * -20, wy + 140, ex + sd * -10, wy + 230); ctx.quadraticCurveTo(ex + sd * 20, wy + 270, ex, wy + 330); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // かんばん
  const sign = name ? `${name}の おかしやさん` : 'ゆめいろ おかしやさん';
  ctx.font = '900 34px "Hiragino Maru Gothic ProN",system-ui,sans-serif';
  const sw2 = Math.max(300, ctx.measureText(sign).width + 70), sx = signX ?? W / 2;
  ctx.fillStyle = 'rgba(150,80,120,.15)'; rr(ctx, sx - sw2 / 2 + 4, 136, sw2, 58, 29); ctx.fill();
  ctx.fillStyle = '#ffffff'; rr(ctx, sx - sw2 / 2, 130, sw2, 58, 29); ctx.fill();
  ctx.strokeStyle = th.trim; ctx.lineWidth = 5; ctx.stroke();
  text(ctx, sign, sx, 160, 34, { color: '#e2589a' });
  drawHeart(ctx, sx - sw2 / 2 + 2, 132, 16, '#ff8fbd'); drawHeart(ctx, sx + sw2 / 2 - 2, 132, 16, '#ff8fbd');

  // たな（つくった おかしが ならぶ）
  const shelves = [[60, W / 2 - 300], [W / 2 + 300, W - 60]];
  const sy = [330, 520];
  let si = 0;
  for (const [x0, x1] of shelves) {
    if (x1 - x0 < 160) continue;
    for (const y of sy) {
      ctx.fillStyle = 'rgba(150,80,120,.12)'; rr(ctx, x0, y + 8, x1 - x0, 22, 10); ctx.fill();
      ctx.fillStyle = '#ffffff'; rr(ctx, x0, y, x1 - x0, 20, 10); ctx.fill();
      ctx.fillStyle = th.trim; for (let x = x0 + 14; x < x1 - 8; x += 28) { ctx.beginPath(); ctx.arc(x, y + 20, 10, 0, Math.PI); ctx.fill(); }
      const n = Math.max(1, Math.floor((x1 - x0) / 150));
      for (let k = 0; k < n; k++) {
        const cx = x0 + ((k + 0.5) * (x1 - x0)) / n;
        const img = shelf[si++];
        if (img) ctx.drawImage(img, cx - 70, y - 128, 140, 140);
        else jar(ctx, cx, y, (si * 7) % 3, th);
      }
    }
  }

  // ガーランド
  const cols = [th.awn[0], '#fff3a8', '#aee0ff', '#c7a8ff', '#aef0d6'];
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 90);
  for (let x = 0; x <= W; x += 40) ctx.lineTo(x, 90 + Math.sin(x / W * Math.PI * 4) * 14 + 14); ctx.stroke();
  for (let x = 20, i = 0; x < W; x += 60, i++) { const y = 90 + Math.sin(x / W * Math.PI * 4) * 14 + 14; ctx.fillStyle = cols[i % cols.length]; ctx.beginPath(); ctx.moveTo(x - 16, y); ctx.lineTo(x + 16, y); ctx.lineTo(x, y + 30); ctx.closePath(); ctx.fill(); }
  // ひさし
  for (let x = 0, i = 0; x < W + 80; x += 80, i++) {
    ctx.fillStyle = th.awn[i % 2]; ctx.fillRect(x, 0, 80, 70);
    ctx.beginPath(); ctx.arc(x + 40, 70, 40, 0, Math.PI); ctx.fill();
  }
  ctx.fillStyle = 'rgba(150,80,120,.08)'; ctx.fillRect(0, 62, W, 8);
}

function jar(ctx, x, y, k, th) {
  if (k === 0) {
    ctx.fillStyle = 'rgba(255,255,255,.7)'; rr(ctx, x - 34, y - 82, 68, 82, 18); ctx.fill();
    ctx.fillStyle = th.awn[0]; rr(ctx, x - 30, y - 92, 60, 16, 8); ctx.fill();
    for (let i = 0; i < 6; i++) { ctx.fillStyle = ['#ffb6d0', '#aee0ff', '#fff0a0', '#aef0d6'][i % 4]; circ(ctx, x - 16 + (i % 3) * 16, y - 18 - Math.floor(i / 3) * 20, 9); ctx.fill(); }
  } else if (k === 1) {
    ctx.fillStyle = '#ffffff'; rr(ctx, x - 26, y - 46, 52, 46, 12); ctx.fill();
    ctx.fillStyle = '#8fdcb0'; for (const [a, b] of [[-16, -60], [0, -76], [16, -60]]) { ell(ctx, x + a, y + b, 14, 22); ctx.fill(); }
    ctx.fillStyle = '#ffb6d0'; circ(ctx, x, y - 80, 10); ctx.fill();
  } else {
    ctx.fillStyle = '#fff'; rr(ctx, x - 40, y - 36, 80, 36, 16); ctx.fill();
    ctx.fillStyle = '#ffd6a0'; for (let i = 0; i < 3; i++) { circ(ctx, x - 22 + i * 22, y - 40, 14); ctx.fill(); }
    ctx.fillStyle = '#ff8fbd'; for (let i = 0; i < 3; i++) { circ(ctx, x - 22 + i * 22, y - 46, 4); ctx.fill(); }
  }
}

export function drawCounter(ctx, W, H, themeId, y) {
  const th = THEMES[themeId] || THEMES.ichigo;
  ctx.fillStyle = 'rgba(150,80,120,.15)'; ctx.fillRect(0, y - 6, W, 14);
  ctx.fillStyle = '#ffffff'; rr(ctx, -20, y - 14, W + 40, 34, 14); ctx.fill();
  ctx.fillStyle = th.counter; ctx.fillRect(0, y + 18, W, H - y);
  ctx.fillStyle = th.trim; for (let x = 0; x < W + 40; x += 46) { ctx.beginPath(); ctx.arc(x, y + 18, 23, 0, Math.PI); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  for (let x = 40, r = 0; x < W; x += 110, r++) for (let yy = y + 90 + (r % 2) * 50; yy < H; yy += 100) { circ(ctx, x, yy, 12); ctx.fill(); }
}

export function drawKitchen(ctx, W, H, themeId, t) {
  const th = THEMES[themeId] || THEMES.ichigo;
  ctx.fillStyle = th.night ? '#4a4690' : '#fffaf6'; ctx.fillRect(0, 0, W, H);
  const sz = 90;
  ctx.fillStyle = th.night ? '#423e82' : th.stripe;
  for (let y = 0; y < H; y += sz) for (let x = (y / sz) % 2 ? sz : 0; x < W; x += sz * 2) ctx.fillRect(x, y, sz, sz);
  // ふわふわ うかぶ もの
  for (let i = 0; i < 14; i++) {
    const x = hash(i) * W, y = ((hash(i + 30) * H - t * (12 + hash(i) * 14)) % H + H) % H;
    ctx.globalAlpha = 0.4;
    if (i % 3 === 0) drawHeart(ctx, x, y, 14, '#ffb6d0'); else if (i % 3 === 1) sparkle(ctx, x, y, 12, '#fff3a8'); else { ctx.fillStyle = '#d8c4ff'; circ(ctx, x, y, 9); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  // テーブル
  const ty = H * 0.8;
  ctx.fillStyle = 'rgba(150,80,120,.15)'; ctx.fillRect(0, ty - 6, W, 12);
  ctx.fillStyle = th.night ? '#7a6cd8' : '#ffd0e2'; ctx.fillRect(0, ty, W, H - ty);
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  for (let x = 0; x < W; x += 60) for (let y = ty; y < H; y += 60) if (((x + y) / 60) % 2 === 0) ctx.fillRect(x, y, 60, 60);
}

// ---------- アイコン（ちいさな キャンバス） ----------
export function iconCanvas(size, fn, dpr = Math.min(devicePixelRatio || 1, 2)) {
  const c = document.createElement('canvas');
  c.width = c.height = Math.round(size * dpr);
  const g = c.getContext('2d'); g.scale(dpr, dpr);
  fn(g, size);
  return c;
}
