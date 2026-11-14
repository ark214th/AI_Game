// えの ぶひん：もじ・ぷにゅ（ふく つき）・なかまたち・はいけい。すべて ずけいで かく
import { W, H } from './data.mjs';

export const TAU = Math.PI * 2;
export const font = (px, w = 800) => `${w} ${px}px "Hiragino Maru Gothic ProN","Hiragino Sans","Yu Gothic","Noto Sans JP",system-ui,sans-serif`;
export const COL = {
  pink: '#ff7fc4', cyan: '#5fe3ff', gold: '#ffd84a', violet: '#b98bff', green: '#6ff09a', white: '#f4f6ff',
  skin: '#fff4f7', cheek: '#ff9fb8', eye: '#3a2a3a',
};

export function text(c, str, x, y, size, color = '#fff', o = {}) {
  c.font = font(size, o.weight || 800); c.textAlign = o.align || 'center'; c.textBaseline = o.base || 'middle';
  if (o.stroke) { c.lineJoin = 'round'; c.lineWidth = o.sw || Math.max(4, size * 0.22); c.strokeStyle = o.stroke; c.strokeText(str, x, y); }
  c.fillStyle = color; c.fillText(str, x, y);
}
// ことばの あいだの スペースで おりかえす
export function wrap(c, str, maxW, size, weight = 800) {
  c.font = font(size, weight);
  const lines = []; let cur = '';
  for (const w of str.split(' ')) {
    const tryLine = cur ? cur + ' ' + w : w;
    if (cur && c.measureText(tryLine).width > maxW) { lines.push(cur); cur = w; } else cur = tryLine;
  }
  if (cur) lines.push(cur);
  return lines;
}
export function rr(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
export function star(c, x, y, r, rot = 0, n = 5, inner = 0.48) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = rot - Math.PI / 2 + i * Math.PI / n, q = i % 2 ? r * inner : r; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
  c.closePath();
}
export function heart(c, x, y, r) {
  c.beginPath(); c.moveTo(x, y + r * 0.9);
  c.bezierCurveTo(x - r * 1.5, y - r * 0.2, x - r * 0.7, y - r * 1.2, x, y - r * 0.4);
  c.bezierCurveTo(x + r * 0.7, y - r * 1.2, x + r * 1.5, y - r * 0.2, x, y + r * 0.9); c.closePath();
}
const ell = (c, x, y, rx, ry, col, rot = 0) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU); c.fill(); };

// ---- ぷにゅ ----
// o: costume('none'|'star'|'hero'|'idol'), mouth('smile'|'open'|'o'), eyes('open'|'happy'|'dizzy'), squash, t, swing(0..1), dir(-1..1), hold(もちあげ)
export function drawPunyu(c, x, y, r, o = {}) {
  const { costume = 'none', mouth = 'smile', eyes = 'open', squash = 0, t = 0, swing = 0, dir = 0, hold = false } = o;
  c.save(); c.translate(x, y); c.scale(1 + squash, 1 - squash);
  const flut = Math.sin(t * 5) * r * 0.06;
  if (costume === 'star' || costume === 'hero') {
    c.fillStyle = costume === 'star' ? '#5a3fd0' : '#3f7fe0';
    c.beginPath(); c.moveTo(-r * 0.7, -r * 0.3); c.quadraticCurveTo(-r * 1.45, r * 0.4, -r * 1.15 + flut, r * 1.0);
    c.lineTo(r * 1.15 + flut, r * 1.0); c.quadraticCurveTo(r * 1.45, r * 0.4, r * 0.7, -r * 0.3); c.fill();
  }
  // あし・みみ・からだ
  ell(c, -r * 0.42, r * 0.88, r * 0.24, r * 0.14, '#ffdfe8'); ell(c, r * 0.42, r * 0.88, r * 0.24, r * 0.14, '#ffdfe8');
  for (const sx of [-1, 1]) { ell(c, sx * r * 0.56, -r * 0.82, r * 0.22, r * 0.32, COL.skin, sx * 0.25); ell(c, sx * r * 0.56, -r * 0.8, r * 0.1, r * 0.18, COL.cheek, sx * 0.25); }
  ell(c, 0, 0, r, r * 0.92, COL.skin);
  // アイドルの スカート
  if (costume === 'idol') {
    c.save(); c.beginPath(); c.ellipse(0, 0, r * 1.02, r * 0.94, 0, 0, TAU); c.clip();
    c.fillStyle = '#ff7fc4'; c.fillRect(-r * 1.1, r * 0.42, r * 2.2, r);
    c.restore();
    for (let i = -3; i <= 3; i++) ell(c, i * r * 0.3, r * 0.44, r * 0.17, r * 0.13, i % 2 ? '#fff' : '#ffc1e3');
    c.fillStyle = COL.gold; star(c, 0, r * 0.68, r * 0.14); c.fill();
  }
  // かお
  const ex = dir * r * 0.1;
  for (const sx of [-1, 1]) {
    const px = sx * r * 0.34 + ex, py = -r * 0.1;
    if (eyes === 'happy') { c.strokeStyle = COL.eye; c.lineWidth = r * 0.08; c.lineCap = 'round'; c.beginPath(); c.arc(px, py + r * 0.06, r * 0.13, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
    else if (eyes === 'dizzy') { c.strokeStyle = COL.eye; c.lineWidth = r * 0.07; c.lineCap = 'round'; c.beginPath(); c.moveTo(px - r * 0.1, py - r * 0.1); c.lineTo(px + r * 0.1, py + r * 0.1); c.moveTo(px + r * 0.1, py - r * 0.1); c.lineTo(px - r * 0.1, py + r * 0.1); c.stroke(); }
    else { const bl = Math.sin(t * 2.3 + 4) > 0.992 ? 0.15 : 1; ell(c, px, py, r * 0.12, r * 0.17 * bl, COL.eye); if (bl === 1) ell(c, px + r * 0.04, py - r * 0.06, r * 0.045, r * 0.045, '#fff'); }
    ell(c, sx * r * 0.62 + ex * 0.5, r * 0.16, r * 0.17, r * 0.1, COL.cheek);
  }
  c.strokeStyle = COL.eye; c.fillStyle = '#e8607f'; c.lineWidth = r * 0.07; c.lineCap = 'round';
  if (mouth === 'open') { c.beginPath(); c.arc(ex, r * 0.16, r * 0.14, 0, Math.PI); c.closePath(); c.fill(); }
  else if (mouth === 'o') { c.beginPath(); c.arc(ex, r * 0.22, r * 0.07, 0, TAU); c.fill(); }
  else { c.beginPath(); c.arc(ex, r * 0.12, r * 0.13, Math.PI * 0.15, Math.PI * 0.85); c.stroke(); }

  // ふくの まえがわ
  if (costume === 'star') {
    c.fillStyle = '#3b2aa8'; c.beginPath(); c.moveTo(-r * 0.62, -r * 0.7); c.quadraticCurveTo(-r * 0.1, -r * 1.5, r * 0.34 + flut, -r * 1.95); c.quadraticCurveTo(r * 0.3, -r * 1.3, r * 0.62, -r * 0.7); c.closePath(); c.fill();
    ell(c, 0, -r * 0.72, r * 0.82, r * 0.16, '#5a3fd0');
    c.fillStyle = COL.gold; star(c, 0, -r * 1.12, r * 0.2, t); c.fill();
    star(c, r * 0.34 + flut, -r * 1.95, r * 0.13); c.fill();
    // つえ
    c.strokeStyle = '#fff'; c.lineWidth = r * 0.08; c.beginPath(); c.moveTo(r * 0.8, r * 0.5); c.lineTo(r * 1.15, -r * 0.3); c.stroke();
    c.fillStyle = COL.gold; star(c, r * 1.17, -r * 0.42, r * 0.24, t * 2); c.fill();
  } else if (costume === 'hero') {
    c.fillStyle = '#e8483f'; c.beginPath(); c.ellipse(0, -r * 0.6, r * 0.72, r * 0.5, 0, Math.PI, TAU); c.fill();
    c.fillRect(-r * 0.78, -r * 0.66, r * 1.56, r * 0.14);
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(r * 0.5, -r * 1.2, r * 0.12, r * 0.42, 0.5, 0, TAU); c.fill();
    ell(c, 0, -r * 0.6, r * 0.1, r * 0.1, COL.gold);
    // たて
    ell(c, -r * 0.92, r * 0.3, r * 0.34, r * 0.38, '#2f5fc0'); ell(c, -r * 0.92, r * 0.3, r * 0.24, r * 0.28, '#6fa4ff');
    c.fillStyle = COL.gold; star(c, -r * 0.92, r * 0.3, r * 0.15); c.fill();
    // けん（swing で ふりおろす）
    c.save(); c.translate(r * 0.9, r * 0.35); c.rotate(-0.5 + swing * 2.2 + (hold ? -0.3 : 0));
    c.fillStyle = '#dfe8f5'; c.beginPath(); c.moveTo(-r * 0.09, 0); c.lineTo(-r * 0.09, -r * 0.95); c.lineTo(0, -r * 1.15); c.lineTo(r * 0.09, -r * 0.95); c.lineTo(r * 0.09, 0); c.fill();
    c.fillStyle = COL.gold; c.fillRect(-r * 0.24, -r * 0.05, r * 0.48, r * 0.12); c.fillStyle = '#b5651d'; c.fillRect(-r * 0.07, r * 0.05, r * 0.14, r * 0.24);
    c.restore();
  } else if (costume === 'idol') {
    c.fillStyle = '#ff5fae';
    for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(0, -r * 0.92); c.lineTo(sx * r * 0.62, -r * 1.32); c.lineTo(sx * r * 0.62, -r * 0.66); c.closePath(); c.fill(); }
    ell(c, 0, -r * 0.94, r * 0.16, r * 0.16, '#ffd0e8');
    // マイク
    c.strokeStyle = '#8c8ca8'; c.lineWidth = r * 0.1; c.beginPath(); c.moveTo(r * 0.78, r * 0.52); c.lineTo(r * 0.6, r * 0.2); c.stroke();
    ell(c, r * 0.56, r * 0.12, r * 0.15, r * 0.15, '#5a5a78');
    c.fillStyle = COL.gold; star(c, -r * 0.9, -r * 0.2 + Math.sin(t * 4) * r * 0.05, r * 0.14, t * 2); c.fill();
  }
  c.restore();
}

// ---- なかまたち ----
export function drawBug(c, x, y, r, o = {}) {      // バグバグ：かくかくした むらさきの いたずらっこ
  const { t = 0, mood = 'grin', glitch = 1 } = o;
  c.save(); c.translate(x, y);
  const u = r / 4;
  c.fillStyle = '#8a5be0';
  for (const [gx, gy, gw, gh] of [[-3, -4, 6, 1], [-4, -3, 8, 6], [-3, 3, 6, 1], [-4, -6, 1, 2], [3, -6, 1, 2]]) c.fillRect(gx * u, gy * u, gw * u, gh * u);
  c.fillStyle = '#a983f2'; c.fillRect(-3 * u, -3 * u, 6 * u, 2 * u);
  c.fillStyle = '#58f0a0'; c.fillRect(-4.4 * u, -6.6 * u, 1.8 * u, u); c.fillRect(2.6 * u, -6.6 * u, 1.8 * u, u);
  // め・くち
  c.fillStyle = '#fff';
  if (mood === 'dizzy') { text(c, '×', -1.6 * u, -0.6 * u, u * 2.4, '#fff'); text(c, '×', 1.6 * u, -0.6 * u, u * 2.4, '#fff'); }
  else if (mood === 'cry' || mood === 'happy') { c.strokeStyle = '#fff'; c.lineWidth = u * 0.5; c.lineCap = 'round'; for (const sx of [-1, 1]) { c.beginPath(); c.arc(sx * 1.6 * u, -0.4 * u, u * 0.8, mood === 'happy' ? Math.PI * 1.1 : Math.PI * 0.1, mood === 'happy' ? Math.PI * 1.9 : Math.PI * 0.9); c.stroke(); } }
  else { c.fillRect(-2.6 * u, -1.6 * u, 1.8 * u, 2 * u); c.fillRect(0.8 * u, -1.6 * u, 1.8 * u, 2 * u); c.fillStyle = '#1a0b33'; c.fillRect(-1.8 * u, -0.8 * u, u, 1.2 * u); c.fillRect(1.6 * u, -0.8 * u, u, 1.2 * u); }
  c.fillStyle = mood === 'cry' ? '#8fd0ff' : '#58f0a0';
  if (mood === 'cry') { c.fillRect(-2.4 * u, 0.6 * u, 0.6 * u, 1.6 * u); c.fillRect(1.8 * u, 0.6 * u, 0.6 * u, 1.6 * u); c.fillStyle = '#fff'; c.fillRect(-u, 1.6 * u, 2 * u, 0.5 * u); }
  else if (mood === 'happy') { c.fillRect(-1.5 * u, 1.2 * u, 3 * u, 0.6 * u); c.fillRect(-u, 1.8 * u, 2 * u, 0.5 * u); }
  else { c.fillRect(-2 * u, 1.2 * u, 4 * u, 0.6 * u); c.fillRect(-2 * u, 0.8 * u, 0.6 * u, 0.5 * u); c.fillRect(1.4 * u, 0.8 * u, 0.6 * u, 0.5 * u); }
  // ちらつく かけら
  if (glitch) { c.fillStyle = '#58f0a0'; for (let i = 0; i < 4; i++) { const a = Math.floor(t * 7 + i * 2.3); c.fillRect(((a * 37 + i * 51) % 11 - 5.5) * u, ((a * 23 + i * 17) % 9 - 6) * u, u * 0.7, u * 0.7); } }
  c.restore();
}

export function drawSlime(c, x, y, r, o = {}) {
  const { t = 0, color = '#58c8f0', crown = false, dizzy = false, squash = Math.sin(t * 5) * 0.08 } = o;
  c.save(); c.translate(x, y); c.scale(1 + squash, 1 - squash);
  c.fillStyle = color; c.beginPath(); c.moveTo(-r, r * 0.7); c.quadraticCurveTo(-r * 1.05, -r * 0.9, 0, -r); c.quadraticCurveTo(r * 1.05, -r * 0.9, r, r * 0.7); c.quadraticCurveTo(0, r * 1.0, -r, r * 0.7); c.fill();
  ell(c, -r * 0.4, -r * 0.5, r * 0.2, r * 0.12, 'rgba(255,255,255,.6)', -0.5);
  if (dizzy) { text(c, '×', -r * 0.32, 0, r * 0.5, '#234'); text(c, '×', r * 0.32, 0, r * 0.5, '#234'); }
  else { ell(c, -r * 0.32, 0, r * 0.1, r * 0.15, '#234'); ell(c, r * 0.32, 0, r * 0.1, r * 0.15, '#234'); }
  c.strokeStyle = '#234'; c.lineWidth = r * 0.07; c.lineCap = 'round'; c.beginPath(); c.arc(0, r * 0.22, r * 0.14, dizzy ? Math.PI * 1.1 : 0.2, dizzy ? Math.PI * 1.9 : Math.PI - 0.2); c.stroke();
  if (crown) { c.fillStyle = COL.gold; c.beginPath(); c.moveTo(-r * 0.5, -r * 0.85); c.lineTo(-r * 0.5, -r * 1.4); c.lineTo(-r * 0.25, -r * 1.1); c.lineTo(0, -r * 1.5); c.lineTo(r * 0.25, -r * 1.1); c.lineTo(r * 0.5, -r * 1.4); c.lineTo(r * 0.5, -r * 0.85); c.closePath(); c.fill(); ell(c, 0, -r * 1.0, r * 0.08, r * 0.08, '#ff5f7f'); }
  c.restore();
}

export function drawStarKid(c, x, y, r, t = 0) {   // ほしっこ（弾幕の ざこ）
  c.save(); c.translate(x, y); c.rotate(Math.sin(t * 3) * 0.2);
  c.fillStyle = '#ffe680'; star(c, 0, 0, r * 1.2, 0, 5, 0.6); c.fill();
  ell(c, -r * 0.3, -r * 0.05, r * 0.1, r * 0.14, '#5a3a20'); ell(c, r * 0.3, -r * 0.05, r * 0.1, r * 0.14, '#5a3a20');
  ell(c, -r * 0.5, r * 0.2, r * 0.14, r * 0.08, '#ffa07a'); ell(c, r * 0.5, r * 0.2, r * 0.14, r * 0.08, '#ffa07a');
  c.restore();
}

export function drawComet(c, x, y, r, t = 0) {     // ほうきぼしの ポポ
  c.save(); c.translate(x, y);
  for (let i = 0; i < 5; i++) ell(c, Math.sin(t * 3 + i) * r * 0.2, -r * (0.7 + i * 0.35), r * (0.7 - i * 0.12), r * 0.3, `rgba(120,220,255,${0.5 - i * 0.09})`);
  ell(c, 0, 0, r, r, '#7fd8ff'); ell(c, -r * 0.3, -r * 0.35, r * 0.3, r * 0.18, 'rgba(255,255,255,.6)', -0.5);
  ell(c, -r * 0.33, 0, r * 0.11, r * 0.16, '#234'); ell(c, r * 0.33, 0, r * 0.11, r * 0.16, '#234');
  ell(c, -r * 0.6, r * 0.25, r * 0.16, r * 0.09, '#ff9fb8'); ell(c, r * 0.6, r * 0.25, r * 0.16, r * 0.09, '#ff9fb8');
  c.strokeStyle = '#234'; c.lineWidth = r * 0.07; c.lineCap = 'round'; c.beginPath(); c.arc(0, r * 0.22, r * 0.13, 0.2, Math.PI - 0.2); c.stroke();
  c.restore();
}

export function drawLuna(c, x, y, r, o = {}) {     // つきの ひめ ルナリア
  const { t = 0, mood = 'calm' } = o;
  c.save(); c.translate(x, y);
  c.fillStyle = '#c9b6ff'; c.beginPath(); c.moveTo(-r * 0.5, r * 0.4); c.lineTo(-r * 1.25, r * 1.7 + Math.sin(t * 2) * 3); c.lineTo(r * 1.25, r * 1.7 - Math.sin(t * 2) * 3); c.lineTo(r * 0.5, r * 0.4); c.fill();
  for (let i = -2; i <= 2; i++) ell(c, i * r * 0.5, r * 1.7, r * 0.27, r * 0.14, '#fff');
  ell(c, 0, 0, r, r, '#fff6c8');
  ell(c, r * 0.45, -r * 0.3, r * 0.2, r * 0.2, '#f3e2a0'); ell(c, -r * 0.5, r * 0.45, r * 0.13, r * 0.13, '#f3e2a0');
  c.fillStyle = COL.gold; c.beginPath(); c.moveTo(-r * 0.45, -r * 0.85); c.lineTo(-r * 0.45, -r * 1.35); c.lineTo(-r * 0.2, -r * 1.05); c.lineTo(0, -r * 1.45); c.lineTo(r * 0.2, -r * 1.05); c.lineTo(r * 0.45, -r * 1.35); c.lineTo(r * 0.45, -r * 0.85); c.closePath(); c.fill();
  if (mood === 'happy') { c.strokeStyle = '#5a4a6a'; c.lineWidth = r * 0.08; c.lineCap = 'round'; for (const sx of [-1, 1]) { c.beginPath(); c.arc(sx * r * 0.34, 0, r * 0.13, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); } }
  else { ell(c, -r * 0.34, -r * 0.05, r * 0.1, r * 0.16, '#5a4a6a'); ell(c, r * 0.34, -r * 0.05, r * 0.1, r * 0.16, '#5a4a6a'); }
  ell(c, -r * 0.62, r * 0.22, r * 0.16, r * 0.09, '#ffb0c8'); ell(c, r * 0.62, r * 0.22, r * 0.16, r * 0.09, '#ffb0c8');
  c.strokeStyle = '#5a4a6a'; c.lineWidth = r * 0.07; c.lineCap = 'round'; c.beginPath(); c.arc(0, r * 0.22, r * 0.12, 0.2, Math.PI - 0.2); c.stroke();
  if (mood === 'bugged') drawBug(c, r * 0.9, -r * 1.1, r * 0.4, { t });
  c.restore();
}

export function drawBossByKind(c, kind, x, y, r, o = {}) {
  if (kind === 'comet') drawComet(c, x, y, r, o.t);
  else if (kind === 'luna') drawLuna(c, x, y, r * 0.9, o);
  else if (kind === 'king') drawSlime(c, x, y, r, { ...o, color: '#7fe08a', crown: true });
  else drawBug(c, x, y, r, o);
}

export function drawItem(c, kind, x, y, r, t = 0) {
  c.save(); c.translate(x, y);
  if (kind === 'shield') { ell(c, 0, 0, r, r * 1.1, '#2f5fc0'); ell(c, 0, 0, r * 0.72, r * 0.82, '#6fa4ff'); c.fillStyle = COL.gold; star(c, 0, 0, r * 0.45); c.fill(); }
  else if (kind === 'sword') { c.rotate(0.6); c.fillStyle = '#eaf6ff'; c.beginPath(); c.moveTo(-r * 0.18, r * 0.3); c.lineTo(-r * 0.18, -r); c.lineTo(0, -r * 1.3); c.lineTo(r * 0.18, -r); c.lineTo(r * 0.18, r * 0.3); c.fill(); c.fillStyle = COL.gold; c.fillRect(-r * 0.5, r * 0.3, r, r * 0.2); c.fillStyle = '#b5651d'; c.fillRect(-r * 0.12, r * 0.5, r * 0.24, r * 0.5); }
  else if (kind === 'crown') { c.fillStyle = COL.gold; c.beginPath(); c.moveTo(-r, r * 0.6); c.lineTo(-r, -r * 0.6); c.lineTo(-r * 0.5, 0); c.lineTo(0, -r * 0.9); c.lineTo(r * 0.5, 0); c.lineTo(r, -r * 0.6); c.lineTo(r, r * 0.6); c.closePath(); c.fill(); ell(c, 0, r * 0.25, r * 0.16, r * 0.16, '#ff5f7f'); }
  else if (kind === 'heart') { c.fillStyle = '#ff6f9f'; heart(c, 0, 0, r); c.fill(); }
  else if (kind === 'key') { c.strokeStyle = COL.gold; c.lineWidth = r * 0.3; c.beginPath(); c.arc(-r * 0.4, 0, r * 0.4, 0, TAU); c.moveTo(0, 0); c.lineTo(r, 0); c.moveTo(r * 0.7, 0); c.lineTo(r * 0.7, r * 0.45); c.stroke(); }
  c.restore();
}

// カセット（せかいの しるし）
export function drawCart(c, x, y, w, h, world, o = {}) {
  const { locked = false, t = 0 } = o;
  c.save(); c.translate(x, y);
  c.fillStyle = 'rgba(0,0,0,.25)'; rr(c, -w / 2 + 4, -h / 2 + 8, w, h, 16); c.fill();
  c.fillStyle = locked ? '#5b5f73' : '#e9ecf5'; rr(c, -w / 2, -h / 2, w, h, 16); c.fill();
  c.fillStyle = locked ? '#44485a' : '#c9cedd'; c.fillRect(-w / 2 + 14, h / 2 - 22, w - 28, 12);
  const g = c.createLinearGradient(0, -h / 2, 0, h / 2 - 30); g.addColorStop(0, locked ? '#3b3f52' : world.color); g.addColorStop(1, locked ? '#2d3040' : world.color2);
  c.fillStyle = g; rr(c, -w / 2 + 12, -h / 2 + 12, w - 24, h - 48, 10); c.fill();
  c.restore();
}

// ---- はいけい ----
const hash = i => { const v = Math.sin(i * 127.1) * 43758.5453; return v - Math.floor(v); };

export function bgSky(c, t, o = {}) {
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, o.top || '#120b3a'); g.addColorStop(0.6, o.mid || '#3a1f73'); g.addColorStop(1, o.bot || '#7a3f9a');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) {
    const sp = 12 + hash(i) * 40, x = hash(i + 100) * W, y = (hash(i + 200) * H + t * sp) % H, tw = 0.5 + 0.5 * Math.sin(t * 2 + i);
    c.fillStyle = `rgba(255,255,255,${0.3 + tw * 0.6})`; c.fillRect(x, y, 2 + hash(i + 5) * 2, 2 + hash(i + 5) * 2);
  }
}
export function bgRoom(c, t) {
  c.fillStyle = '#ffe9c9'; c.fillRect(0, 0, W, H); c.fillStyle = '#f7c98b'; c.fillRect(0, 380, W, 160);
  c.fillStyle = '#e8b170'; for (let x = 0; x < W; x += 120) c.fillRect(x, 380, 3, 160);
  c.fillStyle = '#fff'; rr(c, 90, 70, 210, 170, 14); c.fill(); c.fillStyle = '#9fdcff'; rr(c, 104, 84, 182, 142, 8); c.fill();
  ell(c, 150, 130, 34, 16, '#fff'); ell(c, 230, 170, 40, 18, '#fff'); c.fillStyle = '#fff'; c.fillRect(190, 84, 8, 142); c.fillRect(104, 150, 182, 8);
  c.fillStyle = '#ff9fb8'; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(60 + i * 46, 44); c.lineTo(106 + i * 46, 44); c.lineTo(83 + i * 46, 72); c.fill(); }
}
// ゲームき（テレビ と ほんたい）
export function drawConsole(c, x, y, s, t, screen) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = '#6b5a8c'; rr(c, -150, -130, 300, 220, 22); c.fill();
  c.fillStyle = '#16122b'; rr(c, -128, -110, 256, 170, 12); c.fill();
  c.save(); rr(c, -128, -110, 256, 170, 12); c.clip(); if (screen) screen(c); c.restore();
  c.fillStyle = '#4c3f68'; c.fillRect(-60, 90, 120, 16);
  c.fillStyle = '#d9dcec'; rr(c, -110, 104, 220, 46, 10); c.fill(); c.fillStyle = '#ff7fc4'; c.fillRect(-30, 110, 60, 10);
  ell(c, 80, 127, 8, 8, Math.sin(t * 4) > 0 ? '#6ff09a' : '#3fa35a');
  c.restore();
}
export function screenNoise(c, t, amt = 1) {
  for (let i = 0; i < 40 * amt; i++) { const a = Math.floor(t * 12) * 13 + i; c.fillStyle = ['#58f0a0', '#b98bff', '#ff7fc4', '#fff'][a % 4]; c.fillRect(-128 + hash(a) * 256, -110 + hash(a + 9) * 170, 6 + hash(a + 3) * 40, 4 + hash(a + 7) * 8); }
}
export function bgTunnel(c, t, col = '#58f0a0', col2 = '#1a0b33') {
  c.fillStyle = col2; c.fillRect(0, 0, W, H);
  c.save(); c.translate(W / 2, H / 2);
  for (let i = 0; i < 12; i++) {
    const k = ((i + t * 2.2) % 12) / 12, s = k * k * 700 + 6;
    c.strokeStyle = col; c.globalAlpha = 0.15 + k * 0.7; c.lineWidth = 2 + k * 8;
    c.save(); c.rotate(k * 1.6 + t * 0.4); c.strokeRect(-s, -s * 0.6, s * 2, s * 1.2); c.restore();
  }
  c.restore(); c.globalAlpha = 1;
}
export function bgField(c, t) {
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#7fd0ff'); g.addColorStop(0.55, '#d9f4ff'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 4; i++) { const x = (i * 300 + t * 12) % (W + 240) - 120; ell(c, x, 80 + i * 26, 60, 22, '#fff'); ell(c, x + 40, 70 + i * 26, 44, 20, '#fff'); }
  c.fillStyle = '#8fb8d8'; c.beginPath(); c.moveTo(0, 330); c.lineTo(160, 190); c.lineTo(300, 320); c.lineTo(470, 160); c.lineTo(640, 330); c.lineTo(800, 220); c.lineTo(W, 330); c.lineTo(W, H); c.lineTo(0, H); c.fill();
  // とおくの おしろ
  c.fillStyle = '#b9a6d9'; c.fillRect(700, 210, 120, 120); c.fillRect(685, 180, 30, 150); c.fillRect(805, 180, 30, 150); c.fillRect(745, 160, 30, 60);
  c.fillStyle = '#e8483f'; for (const x of [700, 820, 760]) { c.beginPath(); c.moveTo(x - 22, x === 760 ? 160 : 180); c.lineTo(x, x === 760 ? 120 : 140); c.lineTo(x + 22, x === 760 ? 160 : 180); c.fill(); }
  c.fillStyle = '#5fc45a'; c.fillRect(0, 330, W, H - 330); c.fillStyle = '#4bb04a';
  for (let i = 0; i < 40; i++) c.fillRect(hash(i) * W, 340 + hash(i + 50) * 190, 16, 6);
}
export function bgStage(c, t) {
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#5a1f8a'); g.addColorStop(0.7, '#ff6fb0'); g.addColorStop(1, '#ffc1e3'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 5; i++) {
    const x = 120 + i * 180, a = Math.sin(t * 1.3 + i * 1.7) * 0.35;
    c.save(); c.translate(x, -20); c.rotate(a); const lg = c.createLinearGradient(0, 0, 0, 520); lg.addColorStop(0, ['rgba(255,255,255,.35)', 'rgba(127,224,255,.3)', 'rgba(255,216,74,.3)'][i % 3]); lg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = lg; c.beginPath(); c.moveTo(-10, 0); c.lineTo(10, 0); c.lineTo(110, 520); c.lineTo(-110, 520); c.fill(); c.restore();
  }
  for (let i = 0; i < 30; i++) { const tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 2.1); c.fillStyle = `rgba(255,255,255,${tw * 0.8})`; star(c, hash(i) * W, hash(i + 40) * 300, 3 + hash(i + 7) * 5, t + i); c.fill(); }
}
export function bgGlitch(c, t) {
  c.fillStyle = '#1a0b33'; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 26; i++) { const a = Math.floor(t * 5) * 7 + i; c.fillStyle = ['#2d1457', '#3d1f6b', '#24406b', '#1f5a4a'][a % 4]; c.fillRect(Math.floor(hash(a) * 16) * 60, Math.floor(hash(a + 3) * 9) * 60, 60 * (1 + (a % 3)), 60); }
  c.fillStyle = 'rgba(88,240,160,.5)'; for (let i = 0; i < 8; i++) { const a = Math.floor(t * 9) * 3 + i; c.fillRect(hash(a) * W, hash(a + 1) * H, 40 + hash(a + 2) * 120, 4); }
}
