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
// おさらと フォーク・ナイフ（🍽️ の えもじは iPad で ぶひんが ずれて みえるので ずけいで かく）
export function drawDish(ctx, x, y, size) {
  const k = size / 100;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#b9c7d9'; ctx.lineWidth = 5;
  circ(ctx, 0, 0, 34); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#d6e0ec'; ctx.lineWidth = 4; circ(ctx, 0, 0, 22); ctx.stroke();
  ctx.fillStyle = '#8f9bb0'; ctx.strokeStyle = '#8f9bb0'; ctx.lineCap = 'round';
  // フォーク
  ctx.lineWidth = 5;
  for (const dx of [-8, 0, 8]) { ctx.beginPath(); ctx.moveTo(-52 + dx * 0.6, -40); ctx.lineTo(-52 + dx * 0.6, -18); ctx.stroke(); }
  rr(ctx, -58, -22, 12, 12, 5); ctx.fill();
  rr(ctx, -55.5, -16, 7, 58, 3.5); ctx.fill();
  // ナイフ
  ctx.beginPath(); ctx.moveTo(48, -40); ctx.quadraticCurveTo(60, -30, 56, -2); ctx.lineTo(48, -2); ctx.closePath(); ctx.fill();
  rr(ctx, 48.5, -6, 7, 48, 3.5); ctx.fill();
  ctx.restore();
}
export function emoji(ctx, str, x, y, size) {
  if (str === '🍽️') { drawDish(ctx, x, y, size * 0.95); return; }
  ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",${FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000';
  ctx.fillText(str, x, y + size * 0.05);
}

// ---------- いきもの ----------
// (x, y) は あしもと。r は からだの はんけい
// st: { t, sq(つぶれ), mood, look(-1..1), mouth(0..1), dirt:[{x,y,a}], puff, shake, alpha,
//       acc(おしゃれ), flame(きつねの ひ), bloom(はなの さきぐあい), shine(ほしの ひかり), rot(ころころ) }
export function hoverOf(sp, r, t) {
  if (sp === 'fuwari') return r * (0.05 + Math.sin(t * 2.2) * 0.04);
  if (sp === 'ku') return r * (0.12 + Math.sin(t * 1.6) * 0.06);
  if (sp === 'dora') return r * (0.04 + Math.max(0, Math.sin(t * 3)) * 0.1);
  return 0;
}
export function bodyCenter(sp, x, y, r, st = {}) {
  const sq = st.sq || 0, puff = st.puff || 1;
  return { x, y: y - hoverOf(sp, r, st.t || 0) - r * (1 - sq) * puff };
}

// かおの いち（かめは あたまが まえに でている）
const FACE = { gorota: { y: 0.47, s: 0.55 }, ku: { y: 0.12, s: 0.85 }, chapu: { y: 0.02, s: 0.92 } };
// おしゃれを つける ところ
const ACC_AT = {
  fuwari: { x: 0.42, y: -0.86, s: 1 }, gorota: { x: 0.12, y: 0.06, s: 0.6, neck: 0.86, nw: 0.42 }, pokari: { x: 0.02, y: -0.9, s: 1 },
  chapu: { x: 0.42, y: -0.62, s: 0.9 }, popuri: { x: 0, y: -0.98, s: 1 }, kirara: { x: 0.02, y: -0.9, s: 0.95 },
  dora: { x: 0, y: -0.98, s: 1.1 }, ku: { x: 0.45, y: -0.78, s: 1.1 }, punyu: { x: 0.4, y: -0.8, s: 1 },
};

export function drawCreature(ctx, sp, x, y, r, st = {}) {
  const t = st.t || 0, sq = st.sq || 0, puff = st.puff || 1, a = st.alpha ?? 1;
  const hover = hoverOf(sp, r, t);
  ctx.save();
  ctx.globalAlpha = a * 0.16; ctx.fillStyle = '#3a2a4a';
  ell(ctx, x, y, r * (sp === 'ku' ? 1.05 : 0.85) * (1 - hover / (r * 2.5)) * puff, r * 0.16); ctx.fill();
  ctx.globalAlpha = a;
  const shake = st.shake ? Math.sin(t * 38) * r * 0.07 * st.shake : 0;
  ctx.translate(x + shake, y - hover - r * (1 - sq) * puff);
  if (st.rot) ctx.rotate(st.rot);
  ctx.scale(r * (1 + sq) * puff, r * (1 - sq) * puff);
  const body = BODIES[sp] || BODIES.punyu;
  body.back?.(ctx, t, st);
  body.main(ctx, t, st);
  if (st.dirt) for (const d of st.dirt) {
    if (d.a <= 0.02) continue;
    ctx.globalAlpha = a * d.a * 0.85; ctx.fillStyle = '#8b6a48';
    ell(ctx, d.x, d.y, 0.17, 0.13, d.x); ctx.fill();
    circ(ctx, d.x + 0.16, d.y - 0.1, 0.05); ctx.fill();
    circ(ctx, d.x - 0.14, d.y + 0.1, 0.04); ctx.fill();
  }
  ctx.globalAlpha = a;
  const f = FACE[sp];
  if (f) { ctx.save(); ctx.translate(0, f.y); ctx.scale(f.s, f.s); drawFace(ctx, sp, st); ctx.restore(); } else drawFace(ctx, sp, st);
  body.front?.(ctx, t, st);
  if (sp === 'punyu' && st.bow !== false) {
    ctx.fillStyle = '#ff5d86';
    ctx.beginPath(); ctx.moveTo(0, 0.62); ctx.lineTo(-0.24, 0.5); ctx.lineTo(-0.24, 0.76); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 0.62); ctx.lineTo(0.24, 0.5); ctx.lineTo(0.24, 0.76); ctx.closePath(); ctx.fill();
    circ(ctx, 0, 0.62, 0.07); ctx.fill();
  }
  if (st.acc) drawAcc(ctx, st.acc, ACC_AT[sp] || ACC_AT.punyu, t);
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
    ctx.fillStyle = '#fff6c2'; for (const [x2, y2] of [[-0.6, 0.5], [0.2, 0.7], [0.7, 0.35], [-0.2, 0.3]]) { star(ctx, x2, y2, 0.1); ctx.fill(); }
    ctx.fillStyle = '#c3d3ff'; ctx.fillRect(-1.18, 0.13, 2.38, 0.08);
  }
  ctx.restore();
  if (st.suitcase) {
    // にもつ
    const bx = x + r * (sp === 'ku' ? 1.3 : 1.02), s2 = r * 0.62;
    ctx.save(); ctx.globalAlpha = a;
    ctx.strokeStyle = '#8a5a3a'; ctx.lineWidth = s2 * 0.08;
    ctx.beginPath(); ctx.arc(bx, y - s2 * 0.78, s2 * 0.18, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#e8834e'; rr(ctx, bx - s2 * 0.45, y - s2 * 0.8, s2 * 0.9, s2 * 0.8, s2 * 0.12); ctx.fill();
    ctx.fillStyle = '#ffcf7a'; ctx.fillRect(bx - s2 * 0.45, y - s2 * 0.5, s2 * 0.9, s2 * 0.12);
    ctx.fillStyle = '#fff'; star(ctx, bx + s2 * 0.18, y - s2 * 0.22, s2 * 0.1); ctx.fill();
    ctx.restore();
  }
}

// かたち：back（からだの うしろ）→ main（からだ）→ かお → front（まえに くる もの）
function feet(ctx, color, xs = [-0.42, 0.42], y = 0.9, rx = 0.2, ry = 0.11) { ctx.fillStyle = color; for (const x of xs) { ell(ctx, x, y, rx, ry); ctx.fill(); } }
function whiskers(ctx, color = '#6a4a3a') {
  ctx.strokeStyle = color; ctx.lineWidth = 0.035; ctx.lineCap = 'round';
  for (const s of [-1, 1]) for (const k of [-0.06, 0.06]) { ctx.beginPath(); ctx.moveTo(s * 0.42, 0.22 + k); ctx.lineTo(s * 0.8, 0.18 + k * 2.2); ctx.stroke(); }
}
function flameShape(ctx, x, y, s, t) {
  const f = Math.sin(t * 14) * 0.08;
  ctx.fillStyle = '#ff7a3d';
  ctx.beginPath(); ctx.moveTo(x, y + s * 0.5); ctx.bezierCurveTo(x - s * 0.55, y + s * 0.4, x - s * 0.4, y - s * 0.35, x + f, y - s * (1 + f)); ctx.bezierCurveTo(x + s * 0.4, y - s * 0.35, x + s * 0.55, y + s * 0.4, x, y + s * 0.5); ctx.fill();
  ctx.fillStyle = '#ffd84a';
  ctx.beginPath(); ctx.moveTo(x, y + s * 0.4); ctx.bezierCurveTo(x - s * 0.3, y + s * 0.3, x - s * 0.2, y - s * 0.2, x - f, y - s * 0.55); ctx.bezierCurveTo(x + s * 0.2, y - s * 0.2, x + s * 0.3, y + s * 0.3, x, y + s * 0.4); ctx.fill();
}
function flower(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  for (let k = 0; k < 5; k++) { const an = k * 1.2566; circ(ctx, x + Math.cos(an) * s * 0.55, y + Math.sin(an) * s * 0.55, s * 0.45); ctx.fill(); }
  ctx.fillStyle = '#ffd84a'; circ(ctx, x, y, s * 0.35); ctx.fill();
}

const BODIES = {
  punyu: {
    main(ctx) {
      ctx.fillStyle = '#fff4f7'; ctx.strokeStyle = '#f0c3d2'; ctx.lineWidth = 0.07;
      for (const s of [-1, 1]) {
        ell(ctx, s * 0.52, -0.82, 0.22, 0.36, s * 0.15); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffadc3'; ell(ctx, s * 0.52, -0.8, 0.1, 0.2, s * 0.15); ctx.fill(); ctx.fillStyle = '#fff4f7';
      }
      feet(ctx, '#ffd6e2');
      ctx.fillStyle = '#fff4f7'; ell(ctx, 0, 0.04, 1, 0.94); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ell(ctx, -0.35, -0.55, 0.16, 0.08, -0.5); ctx.fill();
    },
  },
  // くもの ひつじ
  fuwari: {
    back(ctx) {
      ctx.fillStyle = '#6f6680';
      for (const x of [-0.4, 0.4]) { rr(ctx, x - 0.1, 0.55, 0.2, 0.48, 0.09); ctx.fill(); }
    },
    main(ctx, t, st) {
      const bumps = [[0, 0.1, 1.02, 0.84], [-0.55, -0.42, 0.5, 0.48], [0.05, -0.62, 0.56, 0.52], [0.6, -0.36, 0.48, 0.46], [-0.92, 0.12, 0.42, 0.4], [0.94, 0.1, 0.42, 0.4], [-0.5, 0.55, 0.45, 0.35], [0.5, 0.55, 0.45, 0.35]];
      const fl = 1 + (st.fluff || 0) * 0.12;
      ctx.lineWidth = 0.14; ctx.strokeStyle = '#b9d8ef';
      for (const [x, y, rx, ry] of bumps) { ell(ctx, x * fl, y, rx * fl, ry * fl); ctx.stroke(); }
      const g = ctx.createLinearGradient(0, -1.1, 0, 1);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e2f1ff');
      ctx.fillStyle = g;
      for (const [x, y, rx, ry] of bumps) { ell(ctx, x * fl, y, rx * fl, ry * fl); ctx.fill(); }
      // つの と みみ
      ctx.strokeStyle = '#e3bf86'; ctx.lineWidth = 0.1; ctx.lineCap = 'round';
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 0.52, -0.72, 0.16, s > 0 ? Math.PI : 0, s > 0 ? Math.PI * 2.6 : -Math.PI * 1.6, s < 0); ctx.stroke(); }
      ctx.fillStyle = '#f7d7e3'; ctx.strokeStyle = '#e5b9ca'; ctx.lineWidth = 0.05;
      for (const s of [-1, 1]) { ell(ctx, s * 0.88, -0.3, 0.26, 0.12, s * 0.5); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ell(ctx, -0.3, -0.72, 0.18, 0.09, -0.4); ctx.fill();
    },
  },
  // こけの かめ
  gorota: {
    back(ctx) {
      ctx.fillStyle = '#9ccf7a'; ctx.strokeStyle = '#78ad58'; ctx.lineWidth = 0.05;
      for (const [x, y] of [[-0.95, 0.55], [0.95, 0.55]]) { ell(ctx, x, y, 0.24, 0.16, x > 0 ? 0.5 : -0.5); ctx.fill(); ctx.stroke(); }
      for (const [x, y] of [[-0.55, 0.9], [0.55, 0.9]]) { ell(ctx, x, y, 0.22, 0.14); ctx.fill(); ctx.stroke(); }
    },
    main(ctx) {
      // こうら
      const g = ctx.createLinearGradient(0, -1, 0, 0.6);
      g.addColorStop(0, '#c9c4d6'); g.addColorStop(1, '#9893aa');
      ctx.fillStyle = g; ctx.strokeStyle = '#7b7690'; ctx.lineWidth = 0.07;
      ctx.beginPath(); ctx.ellipse(0, 0.45, 1.12, 1.35, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(110,104,130,.45)'; ctx.lineWidth = 0.05;
      for (const [x, y] of [[-0.55, -0.1], [0.55, -0.1], [0, 0.2], [-0.8, 0.3], [0.8, 0.3]]) { ctx.beginPath(); for (let k = 0; k < 6; k++) { const an = k * Math.PI / 3; ctx.lineTo(x + Math.cos(an) * 0.2, y + Math.sin(an) * 0.17); } ctx.closePath(); ctx.stroke(); }
      ctx.fillStyle = '#8f8aa2'; ell(ctx, 0, 0.45, 1.12, 0.14); ctx.fill();
      // あたまの こけ
      ctx.fillStyle = '#8cd062';
      ctx.beginPath(); ctx.moveTo(-0.78, -0.45);
      ctx.bezierCurveTo(-0.6, -1.05, 0.6, -1.05, 0.8, -0.45);
      for (let k = 0; k < 5; k++) ctx.quadraticCurveTo(0.8 - (k + 0.5) * 0.316, -0.3 - (k % 2) * 0.08, 0.8 - (k + 1) * 0.316, -0.45);
      ctx.fill();
      ctx.fillStyle = '#a8e07f'; ell(ctx, -0.25, -0.78, 0.2, 0.07, -0.2); ctx.fill();
      ctx.strokeStyle = '#5da83e'; ctx.lineWidth = 0.06; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0.05, -0.88); ctx.quadraticCurveTo(0.02, -1.08, 0.08, -1.2); ctx.stroke();
      ctx.fillStyle = '#7cc653'; ell(ctx, -0.08, -1.2, 0.16, 0.08, 0.5); ctx.fill(); ell(ctx, 0.24, -1.24, 0.16, 0.08, -0.5); ctx.fill();
      // あたま
      ctx.fillStyle = '#b3dd93'; ctx.strokeStyle = '#86bb68'; ctx.lineWidth = 0.06;
      ell(ctx, 0, 0.52, 0.46, 0.42); ctx.fill(); ctx.stroke();
    },
  },
  // ほのおの きつね
  pokari: {
    back(ctx, t, st) {
      ctx.fillStyle = '#ff9a4a'; ctx.strokeStyle = '#e97c2c'; ctx.lineWidth = 0.05;
      ctx.beginPath(); ctx.moveTo(0.6, 0.6); ctx.quadraticCurveTo(1.45, 0.75, 1.3, -0.15); ctx.quadraticCurveTo(1.0, 0.2, 0.7, 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
      flameShape(ctx, 1.3, -0.25, 0.32 * (0.6 + (st.flame ?? 0.8)), t);
    },
    main(ctx) {
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#ff9a4a';
        ctx.beginPath(); ctx.moveTo(s * 0.25, -0.75); ctx.lineTo(s * 0.72, -1.38); ctx.lineTo(s * 0.9, -0.55); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#5a3a3a'; ctx.beginPath(); ctx.moveTo(s * 0.62, -1.24); ctx.lineTo(s * 0.72, -1.38); ctx.lineTo(s * 0.78, -1.16); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffd1b3'; ctx.beginPath(); ctx.moveTo(s * 0.4, -0.78); ctx.lineTo(s * 0.68, -1.15); ctx.lineTo(s * 0.78, -0.66); ctx.closePath(); ctx.fill();
      }
      feet(ctx, '#7a4a3a');
      const g = ctx.createLinearGradient(0, -1, 0, 1); g.addColorStop(0, '#ffb05c'); g.addColorStop(1, '#ff8a3d');
      ctx.fillStyle = g; ctx.strokeStyle = '#e97c2c'; ctx.lineWidth = 0.06;
      ell(ctx, 0, 0.04, 1, 0.94); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff4e6';
      ctx.beginPath(); ctx.moveTo(-0.8, 0.05); ctx.quadraticCurveTo(-0.4, -0.05, 0, 0.12); ctx.quadraticCurveTo(0.4, -0.05, 0.8, 0.05); ctx.quadraticCurveTo(0.7, 0.95, 0, 0.97); ctx.quadraticCurveTo(-0.7, 0.95, -0.8, 0.05); ctx.fill();
    },
    front(ctx) { ctx.fillStyle = '#3a2a3a'; ell(ctx, 0, 0.14, 0.08, 0.055); ctx.fill(); },
  },
  // うみの ラッコ
  chapu: {
    back(ctx) { ctx.fillStyle = '#7d5540'; ell(ctx, 0.95, 0.72, 0.42, 0.14, -0.4); ctx.fill(); },
    main(ctx) {
      ctx.fillStyle = '#8f6248';
      for (const s of [-1, 1]) { circ(ctx, s * 0.7, -0.68, 0.17); ctx.fill(); }
      feet(ctx, '#6d4a36');
      const g = ctx.createLinearGradient(0, -1, 0, 1); g.addColorStop(0, '#a87658'); g.addColorStop(1, '#8a5d44');
      ctx.fillStyle = g; ctx.strokeStyle = '#6d4a36'; ctx.lineWidth = 0.06;
      ell(ctx, 0, 0.04, 1, 0.94); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f3e2cf'; ell(ctx, 0, 0.02, 0.74, 0.56); ctx.fill();
      ctx.fillStyle = '#5a3a2a'; for (const s of [-1, 1]) { circ(ctx, s * 0.7, -0.68, 0.08); ctx.fill(); }
    },
    front(ctx) {
      ctx.fillStyle = '#3a2a3a'; ctx.beginPath(); ctx.moveTo(-0.09, 0.1); ctx.lineTo(0.09, 0.1); ctx.lineTo(0, 0.18); ctx.closePath(); ctx.fill();
      whiskers(ctx, '#8a6a58');
      // おなかの かいがら
      ctx.fillStyle = '#ffb3c8';
      ctx.beginPath(); ctx.moveTo(0, 0.78); ctx.arc(0, 0.78, 0.2, Math.PI * 1.15, Math.PI * 1.85); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ff8fab'; ctx.lineWidth = 0.025; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(0, 0.78); ctx.lineTo(k * 0.07, 0.6); ctx.stroke(); }
      ctx.fillStyle = '#8f6248'; for (const s of [-1, 1]) { ell(ctx, s * 0.24, 0.72, 0.12, 0.09); ctx.fill(); }
    },
  },
  // はなの はりねずみ
  popuri: {
    back(ctx, t, st) {
      ctx.fillStyle = '#9a7560';
      ctx.beginPath();
      for (let k = 0; k <= 22; k++) { const an = Math.PI * (1.02 + k / 22 * 0.96) - Math.PI * 0.02, rr2 = k % 2 ? 1.18 : 1.4; ctx.lineTo(Math.cos(an) * rr2, 0.15 + Math.sin(an) * rr2 * 0.92); }
      ctx.closePath(); ctx.fill();
      const b = 0.55 + (st.bloom ?? 0.5) * 0.6;
      const cols = ['#ff8fab', '#ffd84a', '#ffffff', '#b58cff', '#ff8fab', '#7fc7ff', '#ffd84a'];
      for (let k = 0; k < 7; k++) { const an = Math.PI * (1.12 + k / 6 * 0.76); flower(ctx, Math.cos(an) * 1.18, 0.15 + Math.sin(an) * 1.1, 0.16 * b, cols[k]); }
    },
    main(ctx) {
      feet(ctx, '#c79a80');
      ctx.fillStyle = '#ffe9d2'; ctx.strokeStyle = '#e8c3a4'; ctx.lineWidth = 0.06;
      ell(ctx, 0, 0.12, 0.92, 0.86); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f7c9a8'; for (const s of [-1, 1]) { circ(ctx, s * 0.62, -0.58, 0.15); ctx.fill(); }
    },
    front(ctx) { ctx.fillStyle = '#3a2a3a'; circ(ctx, 0, 0.13, 0.06); ctx.fill(); },
  },
  // ほしの ねこ
  kirara: {
    back(ctx, t, st) {
      ctx.strokeStyle = '#7a7fd8'; ctx.lineWidth = 0.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0.7, 0.6); ctx.quadraticCurveTo(1.45, 0.5, 1.2, -0.3); ctx.stroke();
      const sh = st.shine ?? 0.4;
      const g = ctx.createRadialGradient(1.2, -0.45, 0.02, 1.2, -0.45, 0.45 + sh * 0.3);
      g.addColorStop(0, `rgba(255,236,140,${0.4 + sh * 0.5})`); g.addColorStop(1, 'rgba(255,236,140,0)');
      ctx.fillStyle = g; circ(ctx, 1.2, -0.45, 0.45 + sh * 0.3); ctx.fill();
      ctx.fillStyle = sh > 0.9 ? '#fff59a' : '#ffd84a'; star(ctx, 1.2, -0.45, 0.22 + sh * 0.05, 0.1, 5, -Math.PI / 2 + t * 0.5); ctx.fill();
    },
    main(ctx, t) {
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#8f95ea';
        ctx.beginPath(); ctx.moveTo(s * 0.2, -0.78); ctx.lineTo(s * 0.72, -1.3); ctx.lineTo(s * 0.88, -0.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffc1dc'; ctx.beginPath(); ctx.moveTo(s * 0.38, -0.78); ctx.lineTo(s * 0.68, -1.1); ctx.lineTo(s * 0.76, -0.64); ctx.closePath(); ctx.fill();
      }
      feet(ctx, '#6d73d0');
      const g = ctx.createLinearGradient(0, -1, 0, 1); g.addColorStop(0, '#a3a8f2'); g.addColorStop(1, '#7d83dc');
      ctx.fillStyle = g; ctx.strokeStyle = '#6d73d0'; ctx.lineWidth = 0.06;
      ell(ctx, 0, 0.04, 1, 0.94); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e6e4ff'; ell(ctx, 0, 0.3, 0.5, 0.3); ctx.fill();
      ctx.fillStyle = '#fff6c2';
      for (const [x, y, s] of [[-0.62, -0.3, 0.06], [0.7, 0.2, 0.05], [-0.45, 0.62, 0.05], [0.5, -0.55, 0.045]]) { star(ctx, x, y, s * (1 + Math.sin(t * 3 + x * 5) * 0.3)); ctx.fill(); }
      ctx.fillStyle = '#ffd84a'; star(ctx, 0, -0.52, 0.1); ctx.fill();
    },
    front(ctx) { ctx.fillStyle = '#ff8fab'; ell(ctx, 0, 0.14, 0.06, 0.045); ctx.fill(); whiskers(ctx, '#5a5fb0'); },
  },
  // ドラゴンの あかちゃん
  dora: {
    back(ctx, t) {
      const fl = Math.sin(t * 5) * 0.12;
      ctx.fillStyle = '#b58cff'; ctx.strokeStyle = '#8f63e0'; ctx.lineWidth = 0.05;
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(s * 0.7, -0.3); ctx.lineTo(s * 1.55, -0.95 - fl); ctx.quadraticCurveTo(s * 1.45, -0.45, s * 1.6, -0.2); ctx.quadraticCurveTo(s * 1.3, -0.1, s * 1.35, 0.15); ctx.quadraticCurveTo(s * 1.0, 0.05, s * 0.8, 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = '#6fcf9c';
      ctx.beginPath(); ctx.moveTo(0.6, 0.7); ctx.quadraticCurveTo(1.35, 0.95, 1.4, 0.45); ctx.lineTo(1.3, 0.55); ctx.quadraticCurveTo(1.1, 0.7, 0.7, 0.45); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff8fab'; ctx.beginPath(); ctx.moveTo(1.4, 0.3); ctx.lineTo(1.55, 0.5); ctx.lineTo(1.35, 0.58); ctx.closePath(); ctx.fill();
    },
    main(ctx) {
      ctx.fillStyle = '#ffe9a8';
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 0.22, -0.85); ctx.lineTo(s * 0.4, -1.3); ctx.lineTo(s * 0.52, -0.8); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = '#ff8fab'; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(k * 0.18 - 0.08, -0.9); ctx.lineTo(k * 0.18, -1.08); ctx.lineTo(k * 0.18 + 0.08, -0.9); ctx.fill(); }
      feet(ctx, '#57b884', [-0.45, 0.45], 0.9, 0.22, 0.12);
      const g = ctx.createLinearGradient(0, -1, 0, 1); g.addColorStop(0, '#8fe0b4'); g.addColorStop(1, '#63c690');
      ctx.fillStyle = g; ctx.strokeStyle = '#4fae7c'; ctx.lineWidth = 0.06;
      ell(ctx, 0, 0.04, 1, 0.94); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff1c2'; ell(ctx, 0, 0.5, 0.58, 0.45); ctx.fill();
      ctx.strokeStyle = '#f0d890'; ctx.lineWidth = 0.04; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-0.42, 0.42 + k * 0.17); ctx.quadraticCurveTo(0, 0.48 + k * 0.17, 0.42, 0.42 + k * 0.17); ctx.stroke(); }
    },
    front(ctx) { ctx.fillStyle = '#3f8a62'; circ(ctx, -0.07, 0.14, 0.03); ctx.fill(); circ(ctx, 0.07, 0.14, 0.03); ctx.fill(); },
  },
  // くじらの こ
  ku: {
    back(ctx, t) {
      ctx.fillStyle = '#5aa3e0';
      ctx.beginPath(); ctx.moveTo(0.9, -0.2); ctx.quadraticCurveTo(1.3, -0.5, 1.55, -0.95); ctx.quadraticCurveTo(1.35, -0.7, 1.2, -0.75); ctx.quadraticCurveTo(1.25, -0.5, 0.95, 0.05); ctx.closePath(); ctx.fill();
      // しおふき
      const u = (t * 1.2) % 1;
      ctx.fillStyle = `rgba(160,215,255,${0.9 - u * 0.5})`;
      for (const s of [-1, 0, 1]) { circ(ctx, s * (0.15 + u * 0.35), -0.95 - Math.sin(u * Math.PI) * 0.5 - (s === 0 ? 0.15 : 0), 0.09 + (1 - u) * 0.05); ctx.fill(); }
      ctx.fillStyle = 'rgba(200,235,255,.9)'; ell(ctx, 0, -0.9, 0.08, 0.12); ctx.fill();
    },
    main(ctx) {
      ctx.fillStyle = '#5aa3e0'; for (const s of [-1, 1]) { ell(ctx, s * 1.15, 0.45, 0.28, 0.12, s * 0.5); ctx.fill(); }
      const g = ctx.createLinearGradient(0, -1, 0, 1); g.addColorStop(0, '#86c4f5'); g.addColorStop(1, '#5aa3e0');
      ctx.fillStyle = g; ctx.strokeStyle = '#4a8fcc'; ctx.lineWidth = 0.06;
      ell(ctx, 0, 0.06, 1.22, 0.92); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#dff1ff'; ctx.beginPath(); ctx.ellipse(0, 0.35, 1.0, 0.62, 0, 0, Math.PI); ctx.fill();
      ctx.strokeStyle = '#b9ddf7'; ctx.lineWidth = 0.035; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * 0.25, 0.55); ctx.lineTo(k * 0.28, 0.9); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ell(ctx, -0.45, -0.55, 0.2, 0.08, -0.4); ctx.fill();
    },
  },
};

// おしゃれ
function drawAcc(ctx, id, at, t) {
  ctx.save();
  if (id === 'scarf') {
    const y = at.neck ?? 0.48, w = at.nw ?? 0.85;
    ctx.fillStyle = '#ff5d6c';
    ctx.beginPath(); ctx.moveTo(-w, y - 0.08); ctx.quadraticCurveTo(0, y + 0.1, w, y - 0.08); ctx.lineTo(w, y + 0.08); ctx.quadraticCurveTo(0, y + 0.26, -w, y + 0.08); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w * 0.45, y + 0.1); ctx.lineTo(w * 0.62 + Math.sin(t * 4) * 0.03, y + 0.5); ctx.lineTo(w * 0.3, y + 0.46); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; for (let k = -2; k <= 2; k++) { ctx.fillRect(k * w * 0.3 - 0.03, y - 0.02 + Math.abs(k) * -0.02, 0.06, 0.1); }
    ctx.restore(); return;
  }
  ctx.translate(at.x, at.y); ctx.scale(at.s, at.s);
  if (id === 'ribbon') {
    ctx.fillStyle = '#ff5d86';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-0.35, -0.3, -0.38, 0.02); ctx.quadraticCurveTo(-0.35, 0.25, 0, 0); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(0.35, -0.3, 0.38, 0.02); ctx.quadraticCurveTo(0.35, 0.25, 0, 0); ctx.fill();
    ctx.fillStyle = '#ff8fab'; circ(ctx, 0, 0, 0.09); ctx.fill();
  } else if (id === 'crown') {
    const cols = ['#ff8fab', '#ffd84a', '#ffffff', '#b58cff', '#7fc7ff'];
    ctx.strokeStyle = '#6cbf57'; ctx.lineWidth = 0.06; ctx.beginPath(); ctx.ellipse(0, 0.05, 0.55, 0.14, 0, Math.PI * 0.05, Math.PI * 0.95, true); ctx.stroke();
    for (let k = 0; k < 5; k++) { const an = Math.PI * (1.1 + k * 0.2); flower(ctx, Math.cos(an) * 0.52, 0.05 + Math.sin(an) * 0.16, 0.13, cols[k]); }
  } else if (id === 'starpin') {
    ctx.fillStyle = '#ffd84a'; ctx.strokeStyle = '#ffb21e'; ctx.lineWidth = 0.04; star(ctx, 0, 0, 0.22, 0.1, 5, -Math.PI / 2 + Math.sin(t * 2) * 0.2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; circ(ctx, -0.05, -0.05, 0.04); ctx.fill();
  } else if (id === 'leafhat') {
    ctx.fillStyle = '#6cbf57'; ell(ctx, 0, 0, 0.45, 0.2, -0.2); ctx.fill();
    ctx.strokeStyle = '#4f9e3c'; ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(-0.4, 0.08); ctx.lineTo(0.4, -0.08); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0.1, -0.08); ctx.quadraticCurveTo(0.15, -0.3, 0.3, -0.35); ctx.stroke();
  } else if (id === 'shellpin') {
    ctx.fillStyle = '#ffd6e2';
    ctx.beginPath(); ctx.moveTo(0, 0.12); ctx.arc(0, 0.12, 0.26, Math.PI * 1.1, Math.PI * 1.9); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ff9fbd'; ctx.lineWidth = 0.03; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(0, 0.12); ctx.lineTo(k * 0.09, -0.1); ctx.stroke(); }
    ctx.fillStyle = '#fff'; circ(ctx, 0, 0.12, 0.05); ctx.fill();
  }
  ctx.restore();
}
export function accIconDraw(ctx, id, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  drawAcc(ctx, id, id === 'scarf' ? { neck: -0.1, nw: 0.7 } : { x: 0, y: 0, s: 1.6 }, 0);
  ctx.restore();
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
  const mx = lx * 0.8, my = 0.26;
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
  const base = { cream: '#fff0d4', pink: '#ffd6e4', mizu: '#c7eaff', mori: '#d3ecbf', yozora: '#3d4687', renga: '#f0b08e', umi: '#8fd0f5', hana: '#fff6d8' }[id] || '#fff0d4';
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
  } else if (id === 'renga') {
    ctx.fillStyle = '#e59c78';
    for (let y = 20, row = 0; y < H; y += 44, row++) for (let x = (row % 2) * 55 - 55; x < W; x += 110) { rr(ctx, x + 4, y, 102, 38, 6); ctx.fill(); }
  } else if (id === 'umi') {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#9fdcff'); g.addColorStop(1, '#5fb4e8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 5;
    for (let y = 60; y < H; y += 80) { ctx.beginPath(); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, y + Math.sin(x / 40) * 8); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 14; i++) { circ(ctx, hash(i + 400) * W, hash(i + 420) * H, 4 + hash(i) * 6); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,180,120,.8)';
    for (let i = 0; i < 4; i++) { const x = 120 + i * 230, y = 110 + (i % 2) * 120; ell(ctx, x, y, 22, 13); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 18, y); ctx.lineTo(x + 36, y - 11); ctx.lineTo(x + 36, y + 11); ctx.closePath(); ctx.fill(); }
  } else if (id === 'hana') {
    const cols = ['#ffb3c8', '#ffd84a', '#c9b3ff', '#9fd3ff'];
    for (let y = 45, row = 0; y < H; y += 80, row++) for (let x = row % 2 ? 80 : 30; x < W; x += 110) {
      const c = cols[(row + Math.floor(x / 110)) % 4];
      ctx.fillStyle = c; for (let k = 0; k < 5; k++) { const an = k * 1.2566; circ(ctx, x + Math.cos(an) * 10, y + Math.sin(an) * 10, 8); ctx.fill(); }
      ctx.fillStyle = '#fff'; circ(ctx, x, y, 6); ctx.fill();
    }
  }
  // てんじょう
  ctx.fillStyle = 'rgba(90,61,85,.12)'; ctx.fillRect(0, 0, W, 16);
}

export function drawFloor(ctx, id) {
  const W = ROOM.w, y0 = ROOM.wallBottom, H = ROOM.h - y0;
  const base = { wood: '#e5b17a', carpet: '#ffa2c1', kusa: '#9fd676', kumo: '#eef6ff', iwa: '#d2ccd9', suna: '#f5dfae', hanaf: '#a8dc84', hoshicarpet: '#3f4690' }[id] || '#e5b17a';
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
  } else if (id === 'suna') {
    ctx.fillStyle = '#e8cc92'; for (let i = 0; i < 70; i++) { circ(ctx, hash(i + 500) * W, y0 + 15 + hash(i + 560) * (H - 15), 2 + hash(i) * 2); ctx.fill(); }
    for (let i = 0; i < 5; i++) { const x = hash(i + 600) * W, y = y0 + 40 + hash(i + 610) * (H - 60); ctx.fillStyle = i % 2 ? '#ffd6e2' : '#fff'; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, 12, Math.PI * 1.1, Math.PI * 1.9); ctx.closePath(); ctx.fill(); }
  } else if (id === 'hanaf') {
    const cols = ['#ff8fab', '#ffd84a', '#ffffff', '#c9b3ff'];
    for (let i = 0; i < 40; i++) {
      const x = hash(i + 700) * W, y = y0 + 20 + hash(i + 740) * (H - 25);
      ctx.fillStyle = cols[i % 4]; for (let k = 0; k < 5; k++) { const an = k * 1.2566; circ(ctx, x + Math.cos(an) * 6, y + Math.sin(an) * 4, 5); ctx.fill(); }
      ctx.fillStyle = '#ffb347'; circ(ctx, x, y, 3); ctx.fill();
    }
  } else if (id === 'hoshicarpet') {
    ctx.fillStyle = '#fff6c2'; for (let i = 0; i < 30; i++) { star(ctx, hash(i + 800) * W, y0 + 15 + hash(i + 830) * (H - 20), 4 + hash(i + 3) * 5); ctx.fill(); }
    ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 4; ctx.strokeRect(20, y0 + 20, W - 40, H - 30);
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
// いろを うすく（しろと まぜる）/ こく（くろと まぜる）
function mixHex(hex, to, k) {
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255];
  return `rgb(${c.map(v => Math.round(v + (to - v) * k)).join(',')})`;
}
const light = (h, k = 0.45) => mixHex(h, 255, k), dark = (h, k = 0.2) => mixHex(h, 0, k);
export function itemColor(it) { const d = ITEMS[it.id]; return d.colors ? d.colors[(it.c || 0) % d.colors.length] : null; }

const ITEM_DRAW = {
  bed(ctx, o) {
    const c = o.color || '#ffb3c8';
    ctx.fillStyle = woodDark; ctx.fillRect(-115, -20, 14, 20); ctx.fillRect(100, -20, 14, 20);
    ctx.fillStyle = wood; rr(ctx, -128, -135, 34, 135, 12); ctx.fill();
    rr(ctx, -122, -58, 248, 40, 10); ctx.fill();
    ctx.fillStyle = '#fffdf8'; rr(ctx, -100, -86, 222, 36, 14); ctx.fill();
    ctx.fillStyle = c; rr(ctx, -28, -90, 152, 46, 16); ctx.fill();
    ctx.fillStyle = light(c); for (let x = -10; x < 120; x += 34) ctx.fillRect(x, -90, 14, 46);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#eadfe6'; ctx.lineWidth = 3; ell(ctx, -62, -92, 38, 16); ctx.fill(); ctx.stroke();
  },
  bigbed(ctx, o) {
    const c = o.color || '#c9b3ff';
    ctx.fillStyle = '#e8b86a'; rr(ctx, -215, -230, 46, 230, 18); ctx.fill();
    ctx.fillStyle = '#ffd84a'; star(ctx, -192, -238, 26); ctx.fill();
    ctx.fillStyle = woodDark; ctx.fillRect(-195, -24, 18, 24); ctx.fillRect(185, -24, 18, 24);
    ctx.fillStyle = '#e8b86a'; rr(ctx, -205, -70, 420, 50, 14); ctx.fill();
    ctx.fillStyle = '#fffdf8'; rr(ctx, -175, -110, 385, 48, 18); ctx.fill();
    ctx.fillStyle = c; rr(ctx, -60, -116, 270, 62, 22); ctx.fill();
    ctx.fillStyle = light(c); for (let x = -40; x < 200; x += 50) { star(ctx, x, -86, 12); ctx.fill(); }
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#eadfe6'; ctx.lineWidth = 4; ell(ctx, -115, -118, 55, 22); ctx.fill(); ctx.stroke();
  },
  kumobed(ctx) {
    ctx.fillStyle = '#bfe0f7';
    for (const [x, y, r] of [[-95, -45, 42], [-40, -55, 50], [25, -55, 50], [90, -45, 44]]) { circ(ctx, x, y, r); ctx.fill(); }
    ctx.fillStyle = '#ffffff';
    for (const [x, y, r] of [[-95, -55, 38], [-40, -66, 46], [25, -66, 46], [90, -55, 40], [-10, -100, 36], [55, -92, 30]]) { circ(ctx, x, y, r); ctx.fill(); }
    ctx.fillStyle = '#e3f2ff'; ell(ctx, -70, -104, 34, 15); ctx.fill();
    ctx.fillStyle = '#ffd95a'; star(ctx, 70, -108, 12); ctx.fill();
  },
  rug(ctx, o) {
    const c = o.color || '#ffcf7a';
    ctx.fillStyle = c; ell(ctx, 0, 0, 150, 35); ctx.fill();
    ctx.strokeStyle = light(c, 0.6); ctx.lineWidth = 6; ell(ctx, 0, 0, 118, 26); ctx.stroke();
    ctx.strokeStyle = dark(c, 0.12); ctx.lineWidth = 5; ell(ctx, 0, 0, 80, 17); ctx.stroke();
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
  kinoko(ctx, o) {
    ctx.fillStyle = '#fff6e8'; rr(ctx, -24, -70, 48, 70, 16); ctx.fill();
    ctx.fillStyle = o.color || '#ff6a6a'; ctx.beginPath(); ctx.ellipse(0, -66, 58, 48, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
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
  tsukilamp(ctx, o) {
    const g = ctx.createRadialGradient(0, -160, 5, 0, -160, 85);
    g.addColorStop(0, 'rgba(210,220,255,.8)'); g.addColorStop(1, 'rgba(210,220,255,0)');
    ctx.fillStyle = g; circ(ctx, 0, -160, 85); ctx.fill();
    ctx.fillStyle = '#6d73d0'; ell(ctx, 0, -6, 38, 10); ctx.fill(); ctx.fillRect(-4, -118, 8, 112);
    ctx.fillStyle = '#fff3b0'; circ(ctx, 0, -160, 44); ctx.fill();
    ctx.save(); circ(ctx, 0, -160, 44); ctx.clip(); ctx.fillStyle = 'rgba(80,90,180,.55)'; circ(ctx, 22, -172, 40); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#fff'; star(ctx, -48, -205, 8 + Math.sin((o.t || 0) * 4) * 2); ctx.fill();
  },
  doll(ctx) { drawCreature(ctx, 'punyu', 0, 0, 40, { t: 0, mood: 'happy', bow: false }); },
  danro(ctx, o) {
    ctx.fillStyle = '#d9826a'; rr(ctx, -110, -200, 220, 200, 10); ctx.fill();
    ctx.strokeStyle = '#c06b54'; ctx.lineWidth = 3;
    for (let y = -170, r2 = 0; y < 0; y += 30, r2++) { ctx.beginPath(); ctx.moveTo(-110, y); ctx.lineTo(110, y); ctx.stroke(); for (let x = -110 + (r2 % 2) * 30; x < 110; x += 60) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 30); ctx.stroke(); } }
    ctx.fillStyle = '#f3d2a8'; rr(ctx, -125, -214, 250, 22, 8); ctx.fill();
    ctx.fillStyle = '#3a2a3a'; ctx.beginPath(); ctx.moveTo(-65, 0); ctx.lineTo(-65, -95); ctx.arc(0, -95, 65, Math.PI, 0); ctx.lineTo(65, 0); ctx.closePath(); ctx.fill();
    const t = o.t || 0;
    const g = ctx.createRadialGradient(0, -40, 5, 0, -40, 70); g.addColorStop(0, 'rgba(255,200,90,.9)'); g.addColorStop(1, 'rgba(255,120,60,0)');
    ctx.fillStyle = g; circ(ctx, 0, -40, 70); ctx.fill();
    flameShapeW(ctx, -18, -35, 38, t); flameShapeW(ctx, 20, -32, 32, t + 1); flameShapeW(ctx, 0, -45, 46, t + 2);
    ctx.fillStyle = '#8a5a3a'; rr(ctx, -45, -14, 90, 14, 6); ctx.fill();
  },
  sofa(ctx, o) {
    const c = o.color || '#ff8fab';
    ctx.fillStyle = woodDark; ctx.fillRect(-100, -14, 12, 14); ctx.fillRect(88, -14, 12, 14);
    ctx.fillStyle = dark(c, 0.08); rr(ctx, -120, -120, 240, 80, 30); ctx.fill();
    ctx.fillStyle = c; rr(ctx, -115, -68, 230, 56, 20); ctx.fill();
    ctx.fillStyle = dark(c, 0.12); rr(ctx, -128, -95, 38, 85, 18); ctx.fill(); rr(ctx, 90, -95, 38, 85, 18); ctx.fill();
    ctx.fillStyle = light(c, 0.3); rr(ctx, -85, -108, 80, 46, 16); ctx.fill(); rr(ctx, 5, -108, 80, 46, 16); ctx.fill();
  },
  table(ctx, o) {
    const c = o.color || '#c98b55';
    ctx.fillStyle = woodDark; rr(ctx, -9, -80, 18, 80, 6); ctx.fill(); ell(ctx, 0, -2, 40, 8); ctx.fill();
    ctx.fillStyle = dark(c, 0.15); ell(ctx, 0, -78, 75, 20); ctx.fill();
    ctx.fillStyle = c; ell(ctx, 0, -84, 75, 18); ctx.fill();
    ctx.fillStyle = '#fff'; rr(ctx, -12, -108, 24, 22, 5); ctx.fill(); ctx.fillStyle = '#ff9fc0'; circ(ctx, 0, -112, 9); ctx.fill();
  },
  cushion(ctx, o) {
    const c = o.color || '#ffd36b';
    ctx.fillStyle = dark(c, 0.1); rr(ctx, -55, -52, 110, 52, 24); ctx.fill();
    ctx.fillStyle = c; rr(ctx, -52, -58, 104, 48, 22); ctx.fill();
    ctx.fillStyle = light(c, 0.5); circ(ctx, 0, -34, 6); ctx.fill();
  },
  hondana(ctx, o) {
    const c = o.color || '#c98b55';
    ctx.fillStyle = c; rr(ctx, -75, -200, 150, 200, 8); ctx.fill();
    ctx.fillStyle = dark(c, 0.25);
    for (let k = 0; k < 3; k++) ctx.fillRect(-64, -188 + k * 62, 128, 52);
    const cols = ['#ff8fab', '#7fc7ff', '#ffd84a', '#8fd36a', '#b58cff', '#ffb347'];
    for (let k = 0; k < 3; k++) for (let i = 0; i < 6; i++) { ctx.fillStyle = cols[(i + k * 2) % 6]; const h = 38 + ((i * 7 + k * 3) % 12); ctx.fillRect(-60 + i * 20, -140 + k * 62 - h + 2, 16, h); }
  },
  suisou(ctx, o) {
    const t = o.t || 0;
    ctx.fillStyle = '#c98b55'; rr(ctx, -85, -34, 170, 34, 6); ctx.fill();
    ctx.fillStyle = 'rgba(140,210,255,.75)'; rr(ctx, -80, -150, 160, 116, 10); ctx.fill();
    ctx.strokeStyle = '#e9f7ff'; ctx.lineWidth = 5; ctx.stroke();
    ctx.fillStyle = '#f3dca7'; rr(ctx, -78, -52, 156, 18, 6); ctx.fill();
    ctx.fillStyle = '#5fae48'; for (const x of [-55, 50]) { ell(ctx, x, -80, 8, 30, 0.2); ctx.fill(); }
    for (let i = 0; i < 2; i++) {
      const fx = Math.sin(t * 0.8 + i * 2) * 45, fy = -100 + i * 22, dir = Math.cos(t * 0.8 + i * 2) > 0 ? 1 : -1;
      ctx.fillStyle = i ? '#ffb347' : '#ff6f91'; ell(ctx, fx, fy, 14, 9); ctx.fill();
      ctx.beginPath(); ctx.moveTo(fx - dir * 12, fy); ctx.lineTo(fx - dir * 24, fy - 8); ctx.lineTo(fx - dir * 24, fy + 8); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 3; i++) { circ(ctx, 30 + i * 5, -60 - ((t * 30 + i * 25) % 80), 4); ctx.fill(); }
  },
  kaigara(ctx, o) {
    const c = o.color || '#ffd6e2';
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, -4); ctx.arc(0, -4, 60, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = dark(c, 0.15); ctx.lineWidth = 4; for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(k * 17, -58 + Math.abs(k) * 5); ctx.stroke(); }
    ctx.fillStyle = dark(c, 0.1); rr(ctx, -16, -12, 32, 12, 5); ctx.fill();
    ctx.fillStyle = '#fff'; circ(ctx, 30, -10, 8); ctx.fill();
  },
  kabin(ctx, o) {
    const c = o.color || '#ff6f91';
    ctx.strokeStyle = '#5fae48'; ctx.lineWidth = 4;
    for (const [x, y] of [[-22, -140], [0, -150], [22, -138]]) { ctx.beginPath(); ctx.moveTo(0, -60); ctx.quadraticCurveTo(x * 0.5, -100, x, y); ctx.stroke(); }
    flowerW(ctx, -22, -140, 16, '#ff8fab'); flowerW(ctx, 0, -152, 18, '#ffd84a'); flowerW(ctx, 22, -138, 16, '#b58cff');
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-18, -70); ctx.quadraticCurveTo(-45, -35, -28, 0); ctx.lineTo(28, 0); ctx.quadraticCurveTo(45, -35, 18, -70); ctx.closePath(); ctx.fill();
    ctx.fillStyle = light(c, 0.5); ell(ctx, -10, -35, 5, 14); ctx.fill();
  },
  dragonlamp(ctx, o) {
    const t = o.t || 0;
    const g = ctx.createRadialGradient(0, -150, 5, 0, -150, 95); g.addColorStop(0, 'rgba(255,190,90,.8)'); g.addColorStop(1, 'rgba(255,190,90,0)');
    ctx.fillStyle = g; circ(ctx, 0, -150, 95); ctx.fill();
    ctx.fillStyle = '#8f63e0'; ell(ctx, 0, -8, 48, 12); ctx.fill(); ctx.fillRect(-6, -90, 12, 84);
    ctx.fillStyle = '#b58cff'; ell(ctx, 0, -92, 30, 10); ctx.fill();
    ctx.fillStyle = '#ffe7a8'; ell(ctx, 0, -150, 44, 58); ctx.fill();
    ctx.fillStyle = '#ffb347'; for (const [x, y] of [[-18, -170], [15, -140], [-8, -120], [20, -180]]) { circ(ctx, x, y, 7); ctx.fill(); }
    ctx.fillStyle = '#6fcf9c'; ctx.beginPath(); ctx.moveTo(-40, -150); ctx.lineTo(-62, -185 - Math.sin(t * 5) * 6); ctx.lineTo(-48, -140); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(40, -150); ctx.lineTo(62, -185 - Math.sin(t * 5) * 6); ctx.lineTo(48, -140); ctx.closePath(); ctx.fill();
  },
  funsui(ctx, o) {
    const t = o.t || 0;
    ctx.fillStyle = '#d6ecf7'; ell(ctx, 0, -20, 100, 26); ctx.fill();
    ctx.fillStyle = '#a9dcff'; ell(ctx, 0, -26, 88, 18); ctx.fill();
    ctx.fillStyle = '#b8c4d6'; rr(ctx, -100, -26, 200, 26, 10); ctx.fill();
    ctx.fillStyle = '#6fb5f0'; ell(ctx, 0, -70, 48, 36); ctx.fill();
    ctx.fillStyle = '#dff1ff'; ctx.beginPath(); ctx.ellipse(0, -60, 38, 22, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#3a2a3a'; circ(ctx, -16, -75, 4); ctx.fill(); circ(ctx, 16, -75, 4); ctx.fill();
    ctx.fillStyle = 'rgba(160,215,255,.9)';
    for (let i = 0; i < 10; i++) { const u = ((t * 0.9 + i / 10) % 1); for (const s of [-1, 1]) { circ(ctx, s * u * 70, -110 - Math.sin(u * Math.PI) * 60 + u * 70, 6 * (1 - u * 0.5)); ctx.fill(); } }
  },
  window(ctx, o) {
    const c = o.color || '#ffb3c8';
    ctx.fillStyle = '#ffffff'; rr(ctx, -85, -75, 170, 150, 14); ctx.fill();
    const g = ctx.createLinearGradient(0, -65, 0, 65);
    if (o.night) { g.addColorStop(0, '#1f2660'); g.addColorStop(1, '#46508f'); } else { g.addColorStop(0, '#7fcfff'); g.addColorStop(1, '#d6f1ff'); }
    ctx.fillStyle = g; rr(ctx, -72, -62, 144, 124, 8); ctx.fill();
    if (o.night) { ctx.fillStyle = '#fff3b0'; circ(ctx, 30, -30, 14); ctx.fill(); star(ctx, -40, -20, 6); ctx.fill(); star(ctx, -10, 20, 4); ctx.fill(); }
    else { ctx.fillStyle = '#fff'; circ(ctx, -30, -20, 14); ctx.fill(); circ(ctx, -12, -24, 16); ctx.fill(); circ(ctx, 6, -18, 12); ctx.fill(); ctx.fillStyle = '#8fdc6e'; ell(ctx, 0, 70, 90, 30); ctx.fill(); }
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-4, -62, 8, 124); ctx.fillRect(-72, -4, 144, 8);
    ctx.fillStyle = c;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 90, -80); ctx.lineTo(s * 52, -80); ctx.quadraticCurveTo(s * 70, 0, s * 90, 78); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#d9a26a'; rr(ctx, -100, -86, 200, 12, 6); ctx.fill();
  },
  hoshimado(ctx, o) {
    const t = o.t || 0;
    ctx.fillStyle = '#fff'; circ(ctx, 0, 0, 85); ctx.fill();
    const g = ctx.createLinearGradient(0, -75, 0, 75); g.addColorStop(0, '#232a6e'); g.addColorStop(1, '#4b53a0');
    ctx.fillStyle = g; circ(ctx, 0, 0, 72); ctx.fill();
    ctx.fillStyle = '#fff3b0'; circ(ctx, 28, -28, 18); ctx.fill(); ctx.fillStyle = '#2d3578'; circ(ctx, 36, -34, 15); ctx.fill();
    ctx.fillStyle = '#fff6c2'; for (let i = 0; i < 7; i++) { star(ctx, -45 + (i * 37) % 90, -40 + (i * 53) % 90, 5 + Math.sin(t * 3 + i) * 2); ctx.fill(); }
    ctx.fillStyle = '#fff'; ctx.fillRect(-4, -72, 8, 144); ctx.fillRect(-72, -4, 144, 8);
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
  hoshikazari(ctx, o) { garland(ctx, o, (c, i) => { c.fillStyle = ['#ffd84a', '#ff9fc0', '#8fd3ff', '#b9a0ff', '#ffd84a'][i]; star(c, 0, 28, 17); c.fill(); }); },
  hanakazari(ctx, o) { garland(ctx, o, (c, i) => flowerW(c, 0, 26, 17, ['#ff8fab', '#ffd84a', '#ffffff', '#b58cff', '#ff8fab'][i])); },
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
function garland(ctx, o, drawOne) {
  ctx.strokeStyle = '#c9a27a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-145, -32); ctx.quadraticCurveTo(0, 30, 145, -32); ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const u = (i + 0.5) / 5, x = -145 + u * 290, y = -32 + 2 * u * (1 - u) * 62 * 1.02;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin((o.t || 0) * 2 + i) * 0.15);
    ctx.strokeStyle = '#c9a27a'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 12); ctx.stroke();
    drawOne(ctx, i);
    ctx.restore();
  }
}
function flowerW(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  for (let k = 0; k < 5; k++) { const an = k * 1.2566 - Math.PI / 2; circ(ctx, x + Math.cos(an) * s * 0.55, y + Math.sin(an) * s * 0.55, s * 0.45); ctx.fill(); }
  ctx.fillStyle = '#ffb347'; circ(ctx, x, y, s * 0.32); ctx.fill();
}
function flameShapeW(ctx, x, y, s, t) {
  const f = Math.sin(t * 12) * 0.1;
  ctx.fillStyle = '#ff7a3d';
  ctx.beginPath(); ctx.moveTo(x, y + s * 0.5); ctx.bezierCurveTo(x - s * 0.55, y + s * 0.4, x - s * 0.4, y - s * 0.35, x + f * s, y - s * (1 + f)); ctx.bezierCurveTo(x + s * 0.4, y - s * 0.35, x + s * 0.55, y + s * 0.4, x, y + s * 0.5); ctx.fill();
  ctx.fillStyle = '#ffd84a';
  ctx.beginPath(); ctx.moveTo(x, y + s * 0.4); ctx.bezierCurveTo(x - s * 0.3, y + s * 0.3, x - s * 0.2, y - s * 0.2, x - f * s, y - s * 0.55); ctx.bezierCurveTo(x + s * 0.2, y - s * 0.2, x + s * 0.3, y + s * 0.3, x, y + s * 0.4); ctx.fill();
}

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
  for (const it of vis.filter(it => ITEMS[it.id].zone === 'wall')) { ctx.save(); ctx.translate(it.x, it.y); drawItem(ctx, it.id, { ...o, color: itemColor(it) }); ctx.restore(); }
  for (const it of vis.filter(it => ITEMS[it.id].flat)) { ctx.save(); ctx.translate(it.x, it.y); const k = depth(it.y); ctx.scale(k, k); drawItem(ctx, it.id, { ...o, color: itemColor(it) }); ctx.restore(); }
  const list = vis.filter(it => ITEMS[it.id].zone === 'floor' && !ITEMS[it.id].flat).map(it => ({
    y: it.y, draw: c => { c.save(); c.translate(it.x, it.y); const k = depth(it.y); c.scale(k, k); drawItem(c, it.id, { ...o, color: itemColor(it) }); c.restore(); },
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
export function drawLockedCell(ctx, rect, need, have, label = 'つぎの へや') {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; rr(ctx, rect.x, rect.y, rect.w, rect.h, 10); ctx.fill();
  ctx.setLineDash([14, 10]); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,.9)'; rr(ctx, rect.x + 6, rect.y + 6, rect.w - 12, rect.h - 12, 10); ctx.stroke();
  ctx.setLineDash([]);
  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2, u = Math.min(rect.w / 340, 1.6);
  text(ctx, label, cx, cy - 42 * u, 26 * u, { color: '#fff', stroke: 'rgba(90,61,85,.45)' });
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
