// まもれ！キングダム：え（ぜんぶ 図形で かく。がぞうは つかわない）
import { FIELD, PATH_W, TOWERS, ENEMIES, rng, towerStats, nearestOnPaths, buildPath } from './core.mjs';

const TAU = Math.PI * 2;
const THEMES = {
  meadow: { ground: '#7ecb6b', patch: ['#8fd67a', '#6fbd5f'], path: '#e3c98f', edge: '#b99a5e', mark: '#d2b577', sky: '#7ecb6b' },
  snow: { ground: '#e6f1fa', patch: ['#f5fbff', '#cfe2f2'], path: '#b9c6d6', edge: '#8797ab', mark: '#a6b5c8', sky: '#e6f1fa' },
  volcano: { ground: '#5b4239', patch: ['#6a4d42', '#4b352e'], path: '#8d857f', edge: '#3a2b26', mark: '#766e69', sky: '#5b4239' },
};

function circ(c, x, y, r, fill, stroke, lw = 2) {
  c.beginPath(); c.arc(x, y, r, 0, TAU);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
}
function ell(c, x, y, rx, ry, fill, stroke, lw = 2) {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
}
function poly(c, pts, fill, stroke, lw = 2) {
  c.beginPath(); c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.lineJoin = 'round'; c.stroke(); }
}
function rr(c, x, y, w, h, r, fill, stroke, lw = 2) {
  c.beginPath(); c.roundRect(x, y, w, h, r);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
}
const INK = '#3b2a22';
function eyes(c, x, y, gap, r = 2) { circ(c, x - gap, y, r, '#fff'); circ(c, x + gap, y, r, '#fff'); circ(c, x - gap + 0.6, y, r * 0.55, '#111'); circ(c, x + gap + 0.6, y, r * 0.55, '#111'); }
function star(c, x, y, r, fill) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
  c.closePath(); c.fillStyle = fill; c.fill();
}

// ───────── おしろ ─────────
export function drawCastle(c, x, y, lv = 0, t = 0) {
  const stone = '#d9d3c7', dark = '#a59d8f', roof = lv >= 3 ? '#d6a520' : '#c94f3d', trim = lv >= 2 ? '#e8c456' : '#8b8377';
  ell(c, x, y + 26, 66 + lv * 3, 16, 'rgba(0,0,0,.22)');
  const tower = (tx, ty, w, h, rf = roof) => {
    rr(c, tx - w / 2, ty - h, w, h, 3, stone, INK);
    c.fillStyle = dark; for (let i = 0; i < 3; i++) c.fillRect(tx - w / 2 + 3 + i * (w - 6) / 3, ty - h + 8 + (i % 2) * 9, (w - 12) / 3, 3);
    poly(c, [tx - w / 2 - 4, ty - h, tx, ty - h - w * 0.95, tx + w / 2 + 4, ty - h], rf, INK);
    rr(c, tx - 3, ty - h + 12, 6, 9, 3, '#4a3a55');
  };
  if (lv >= 1) { tower(x - 52, y + 18, 20, 44 + lv * 3); tower(x + 52, y + 18, 20, 44 + lv * 3); }
  if (lv >= 4) { tower(x - 30, y - 6, 16, 60, '#7a4fd0'); tower(x + 30, y - 6, 16, 60, '#7a4fd0'); }
  // かべ
  rr(c, x - 46, y - 24, 92, 46, 4, stone, INK);
  c.fillStyle = stone; c.strokeStyle = INK; c.lineWidth = 2;
  for (let i = 0; i < 6; i++) { c.beginPath(); c.rect(x - 46 + i * 16.4, y - 32, 10, 9); c.fill(); c.stroke(); }
  c.fillStyle = dark; for (let i = 0; i < 5; i++) c.fillRect(x - 38 + i * 17, y - 12 + (i % 2) * 12, 9, 3);
  if (lv >= 2) { c.fillStyle = trim; c.fillRect(x - 45, y - 23, 90, 3); }
  // まん中の とう
  const kh = 62 + lv * 5;
  tower(x, y - 2, 34, kh);
  // 門
  c.beginPath(); c.moveTo(x - 11, y + 22); c.lineTo(x - 11, y + 4); c.arc(x, y + 4, 11, Math.PI, 0); c.lineTo(x + 11, y + 22); c.closePath();
  c.fillStyle = '#6b4a2f'; c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
  c.strokeStyle = '#4b331f'; c.beginPath(); c.moveTo(x, y - 6); c.lineTo(x, y + 22); c.stroke();
  // はた
  const fy = y - 2 - kh - 34 * 0.95, w = Math.sin(t * 4) * 2;
  c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(x, fy); c.lineTo(x, fy - 20); c.stroke();
  poly(c, [x, fy - 20, x + 17, fy - 15 + w, x, fy - 9], lv >= 3 ? '#ffd84a' : '#3f8cff', INK, 1.5);
  if (lv >= 3) star(c, x, y - kh + 6, 5, '#ffd84a');
}

// ───────── タワー ─────────
function pips(c, t) {
  if (t.lv <= 1) return;
  const n = t.lv - 1, col = t.lv >= 4 ? '#ffd84a' : '#fff';
  for (let i = 0; i < n; i++) star(c, t.x + (i - (n - 1) / 2) * 9, t.y + 22, 4.2, col);
}
export function drawTower(c, t, time = 0, ghost = false) {
  const { x, y, type, lv, branch } = t, evo = lv >= 4, k = 1 + (lv - 1) * 0.04;
  if (!ghost) ell(c, x, y + 14, 22, 8, 'rgba(0,0,0,.25)');
  if (evo) ell(c, x, y + 13, 23, 9, null, '#ffd84a', 2.5);
  c.save(); c.translate(x, y); c.scale(k, k);
  const ang = t.ang ?? -Math.PI / 2, kick = t.cd != null ? Math.max(0, 1 - (t.cdMax ? (t.cdMax - t.cd) / 0.15 : 1)) : 0;
  if (type === 'archer') {
    const wood = '#b8773a', roof = branch === 'a' ? '#e0483a' : branch === 'b' ? '#2f6fd6' : '#7a5230';
    poly(c, [-13, 14, -10, -8, 10, -8, 13, 14], wood, INK);
    c.strokeStyle = '#8a5526'; c.lineWidth = 2; c.beginPath(); c.moveTo(-11, 2); c.lineTo(11, 2); c.moveTo(-12, 9); c.lineTo(12, 9); c.stroke();
    rr(c, -15, -14, 30, 7, 2, '#d49a55', INK);
    // 弓を もった 人
    circ(c, 0, -21, 6, '#ffd9b0', INK); poly(c, [-6, -22, 0, -31, 6, -22], roof, INK, 1.5);
    c.save(); c.translate(0, -17); c.rotate(ang);
    c.strokeStyle = INK; c.lineWidth = 2.2; c.beginPath(); c.arc(7, 0, 8, -1.2, 1.2); c.stroke();
    if (branch === 'a') { c.beginPath(); c.arc(11, 0, 8, -1.1, 1.1); c.stroke(); }
    if (branch === 'b') { c.strokeStyle = '#2f6fd6'; c.lineWidth = 3; c.beginPath(); c.moveTo(4, 0); c.lineTo(22, 0); c.stroke(); }
    c.restore();
    if (lv >= 2) poly(c, [10, -14, 10, -30, 20, -26, 10, -22], lv >= 3 ? '#ffd84a' : '#fff', INK, 1.2);
  } else if (type === 'cannon') {
    const body = branch === 'b' ? '#b23a2a' : '#4c5560', hi = branch === 'b' ? '#ff8a3c' : '#8b96a3';
    ell(c, 0, 6, 17, 11, '#9aa1a9', INK); ell(c, 0, 3, 14, 9, '#c3c9cf');
    c.save(); c.translate(0, -2); c.rotate(ang);
    const L = (branch === 'a' ? 26 : 22) + lv, W = (branch === 'a' ? 9 : 6.5) + lv * 0.5;
    rr(c, -6 - kick * 3, -W, L, W * 2, 4, body, INK); rr(c, L - 10 - kick * 3, -W - 1.5, 6, W * 2 + 3, 2, hi, INK, 1.5);
    c.restore();
    circ(c, 0, -2, 7 + lv * 0.4, body, INK); circ(c, -2, -4, 2, hi);
  } else if (type === 'ice') {
    const g = 0.5 + 0.5 * Math.sin(time * 3 + x);
    ell(c, 0, 8, 15, 8, '#8fa9c2', INK);
    circ(c, 0, -8, 20 + g * 3, `rgba(150,225,255,${0.12 + g * 0.1})`);
    const cry = (cx, h, w, col) => poly(c, [cx, 8, cx - w, -h * 0.4, cx, -h, cx + w, -h * 0.4], col, '#3a7fb0', 1.8);
    if (lv >= 2) cry(-10, 18, 5, '#a8e2ff'); if (lv >= 3) cry(10, 20, 5, '#a8e2ff');
    cry(0, 30 + lv * 2, 9, branch === 'a' ? '#dff6ff' : branch === 'b' ? '#7fb6ff' : '#7dd3ff');
    c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-3, -20); c.lineTo(-3, -6); c.stroke();
  } else if (type === 'mage') {
    const robe = branch === 'a' ? '#4f7fe8' : branch === 'b' ? '#c04fd8' : '#8a5fd6';
    poly(c, [-11, 14, -9, -12, 9, -12, 11, 14], '#cbbfe8', INK);
    rr(c, -3, 0, 6, 9, 3, '#4a3a6e');
    poly(c, [-13, -12, 0, -34 - lv, 13, -12], robe, INK);
    const g = 0.5 + 0.5 * Math.sin(time * 5 + y), oy = -42 - lv + Math.sin(time * 2.5 + x) * 2;
    circ(c, 0, oy, 9 + g * 2, 'rgba(255,255,255,.25)'); circ(c, 0, oy, 5.5 + (evo ? 1.5 : 0), branch === 'a' ? '#fff27a' : '#ff9cf5', '#fff', 1.5);
    if (lv >= 2) star(c, 0, -18, 4, '#ffd84a');
  } else if (type === 'barracks') {
    rr(c, -15, -8, 30, 22, 3, '#e6d3b0', INK);
    poly(c, [-19, -8, 0, -26, 19, -8], branch === 'a' ? '#5c6f8f' : '#c9503c', INK);
    rr(c, -5, 2, 10, 12, 2, '#6b4a2f', INK, 1.5);
    c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(11, -18); c.lineTo(11, -36); c.stroke();
    poly(c, [11, -36, 23, -32, 11, -28], branch === 'b' ? '#3fbf6a' : '#3f8cff', INK, 1.2);
    poly(c, [-13, -4, -7, -4, -7, 3, -10, 6, -13, 3], evo ? '#ffd84a' : '#9fb4cc', INK, 1.2);
  } else if (type === 'dragon') {
    const col = branch === 'b' ? '#f2c62e' : branch === 'a' ? '#c4281c' : '#e0563a', bel = branch === 'b' ? '#fff6b0' : '#ffc98a';
    ell(c, 0, 8, 19, 10, '#6e5a4c', INK); ell(c, 0, 5, 14, 6, '#4a3a30');
    for (let i = -1; i <= 1; i++) ell(c, i * 8, 5, 3.4, 4.4, '#f5efe0', INK, 1);
    c.save(); c.translate(0, -12); c.rotate(ang);
    const flap = Math.sin(time * 6) * 4;
    poly(c, [-6, -4, -18, -16 - flap, -2, -9], col, INK, 1.5); poly(c, [-6, 4, -18, 16 + flap, -2, 9], col, INK, 1.5);
    ell(c, 0, 0, 11, 8, col, INK); rr(c, 6, -5.5, 15 + lv, 11, 5, col, INK); rr(c, 14 + lv, -3, 6, 6, 2, bel);
    circ(c, 9, -3.5, 1.8, '#fff'); circ(c, 9, 3.5, 1.8, '#fff');
    poly(c, [3, -7, -2, -13, 6, -8], bel, INK, 1); poly(c, [3, 7, -2, 13, 6, 8], bel, INK, 1);
    c.restore();
  }
  c.restore();
  if (!ghost) pips(c, t);
  if (t.stunT > 0) {
    if (t.stunKind === 'fire') {
      for (let i = 0; i < 4; i++) { const a = time * 9 + i * 1.7; poly(c, [x - 14 + i * 9, y + 10, x - 10 + i * 9 + Math.sin(a) * 2, y - 14 - Math.abs(Math.sin(a)) * 12, x - 6 + i * 9, y + 10], i % 2 ? '#ffb02e' : '#ff5a2a'); }
    } else {
      c.globalAlpha = 0.6; rr(c, x - 20, y - 36, 40, 54, 8, '#bfeaff', '#fff', 2); c.globalAlpha = 1;
      c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 10, y - 26); c.lineTo(x - 4, y - 10); c.moveTo(x + 6, y - 20); c.lineTo(x + 10, y - 4); c.stroke();
    }
  }
}

// ───────── てき ─────────
function drawEnemy(c, e, time) {
  const { x, r } = e, bob = Math.abs(Math.sin(time * 8 + e.id * 1.3)) * (e.stunT > 0 || e.blockedBy ? 0.4 : 2.2);
  const lift = e.fly ? 20 + Math.sin(time * 4 + e.id) * 3 : 0, y = e.y - bob - lift, f = e.face || -1;
  ell(c, x, e.y + r * 0.75, r * (e.fly ? 0.7 : 0.95), r * 0.34, 'rgba(0,0,0,.25)');
  c.save(); c.translate(x, y); c.scale(f, 1);
  const flash = e.hitT > 0;
  switch (e.type) {
    case 'goblin':
      poly(c, [-7, -6, -15, -11, -8, -1], '#5fae3e', INK, 1.5); poly(c, [7, -6, 15, -11, 8, -1], '#5fae3e', INK, 1.5);
      circ(c, 0, 0, 9.5, '#6fc24a', INK); eyes(c, 2, -2, 3.4, 2.4);
      c.strokeStyle = INK; c.lineWidth = 1.5; c.beginPath(); c.arc(2, 3, 3.5, 0.1, Math.PI - 0.1); c.stroke();
      c.strokeStyle = '#8a5526'; c.lineWidth = 3; c.beginPath(); c.moveTo(10, 4); c.lineTo(15, -8); c.stroke();
      break;
    case 'wolf':
      ell(c, -2, 2, 12, 7, '#8d95a3', INK); poly(c, [-13, 0, -20, -6, -12, 4], '#8d95a3', INK, 1.5);
      circ(c, 8, -3, 7, '#a3abb8', INK); poly(c, [4, -8, 5, -15, 9, -9], '#8d95a3', INK, 1.2); poly(c, [9, -9, 12, -15, 13, -7], '#8d95a3', INK, 1.2);
      circ(c, 10, -4, 1.6, '#ffe24a'); circ(c, 14.5, -1, 1.5, INK);
      break;
    case 'bat': {
      const fl = Math.sin(time * 16 + e.id) * 7;
      poly(c, [-4, 0, -20, -8 + fl, -15, 3, -9, 1, -6, 6], '#7a4fb8', INK, 1.5); poly(c, [4, 0, 20, -8 + fl, 15, 3, 9, 1, 6, 6], '#7a4fb8', INK, 1.5);
      circ(c, 0, 0, 7.5, '#9466d8', INK); poly(c, [-5, -6, -4, -12, -1, -7], '#9466d8', INK, 1); poly(c, [5, -6, 4, -12, 1, -7], '#9466d8', INK, 1);
      eyes(c, 0, -1, 3, 2); break;
    }
    case 'slime': case 'mini': {
      const s = e.type === 'mini' ? 0.62 : 1, sq = 1 + Math.sin(time * 6 + e.id) * 0.08;
      c.scale(s * sq, s / sq);
      c.beginPath(); c.moveTo(-13, 9); c.quadraticCurveTo(-15, -12, 0, -13); c.quadraticCurveTo(15, -12, 13, 9); c.closePath();
      c.fillStyle = '#4fc3e8'; c.fill(); c.strokeStyle = '#1f6f94'; c.lineWidth = 2; c.stroke();
      ell(c, -5, -6, 3, 2, 'rgba(255,255,255,.7)'); eyes(c, 2, 0, 4, 2.6); break;
    }
    case 'knight':
      rr(c, -8, -2, 16, 14, 4, '#9aa6b5', INK); circ(c, 0, -6, 8.5, '#c9d2dd', INK);
      c.fillStyle = INK; c.fillRect(-1, -9, 8, 3); poly(c, [-3, -14, 0, -21, 3, -14], '#e0483a', INK, 1.2);
      poly(c, [4, -1, 14, -1, 14, 7, 9, 12, 4, 7], '#5f7fb5', INK, 1.5);
      break;
    case 'shaman': {
      poly(c, [-9, 12, -6, -4, 6, -4, 9, 12], '#8a3fa8', INK); circ(c, 0, -7, 7, '#b78ad0', INK); poly(c, [-8, -9, 0, -22, 8, -9], '#5c2a78', INK);
      eyes(c, 1.5, -6, 2.6, 1.8);
      c.strokeStyle = '#6b4a2f'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(11, 12); c.lineTo(11, -14); c.stroke();
      circ(c, 11, -16, 4 + Math.sin(time * 5) * 0.8, '#7dff9a', '#fff', 1); break;
    }
    case 'ogre': case 'ogreking': {
      const s = e.type === 'ogreking' ? 1.5 : 1;
      c.scale(s, s);
      ell(c, 0, 4, 15, 13, '#b5793f', INK); circ(c, 0, -10, 10, '#c98a4c', INK);
      eyes(c, 2, -11, 4, 2.4); c.fillStyle = '#fff'; c.fillRect(-2, -5, 3, 4); c.fillRect(5, -5, 3, 4);
      c.strokeStyle = INK; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-4, -5); c.lineTo(9, -5); c.stroke();
      rr(c, 13, -18, 8, 24, 4, '#7a5230', INK);
      if (e.type === 'ogreking') poly(c, [-8, -18, -8, -26, -4, -21, 0, -27, 4, -21, 8, -26, 8, -18], '#ffd84a', INK, 1.2);
      break;
    }
    case 'icegiant':
      poly(c, [-22, 22, -26, -6, -14, -24, 0, -30, 14, -24, 26, -6, 22, 22], '#9fd8f5', '#2f6f9a', 2.5);
      poly(c, [-14, -24, -18, -40, -6, -28], '#dff6ff', '#2f6f9a', 2); poly(c, [14, -24, 18, -40, 6, -28], '#dff6ff', '#2f6f9a', 2); poly(c, [-4, -29, 0, -44, 4, -29], '#dff6ff', '#2f6f9a', 2);
      poly(c, [-12, -2, -4, -14, 8, -6, 2, 10, -10, 12], 'rgba(255,255,255,.45)');
      circ(c, -4, -12, 3.5, '#12365a'); circ(c, 10, -12, 3.5, '#12365a'); circ(c, -3, -13, 1.2, '#fff'); circ(c, 11, -13, 1.2, '#fff');
      c.strokeStyle = '#12365a'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-4, 0); c.lineTo(10, 0); c.stroke();
      break;
    case 'firedragon': {
      const fl = Math.sin(time * 7) * 9;
      poly(c, [-8, -4, -44, -26 + fl, -34, 4, -20, 2, -12, 12], '#a01f18', INK, 2); poly(c, [8, -4, 44, -26 + fl, 34, 4, 20, 2, 12, 12], '#a01f18', INK, 2);
      ell(c, 0, 4, 18, 22, '#d93a26', INK); ell(c, 0, 8, 10, 14, '#ffb357');
      poly(c, [-2, 24, -10, 40, 4, 30], '#d93a26', INK, 1.5);
      circ(c, 0, -20, 14, '#e2472f', INK); poly(c, [-10, -28, -14, -42, -4, -32], '#ffd84a', INK, 1.5); poly(c, [10, -28, 14, -42, 4, -32], '#ffd84a', INK, 1.5);
      eyes(c, 0, -22, 6, 3.4); rr(c, -6, -14, 12, 8, 3, '#ffb357', INK, 1.5);
      break;
    }
  }
  if (flash) { c.globalCompositeOperation = 'lighter'; circ(c, 0, 0, r * 1.2, 'rgba(255,255,255,.45)'); c.globalCompositeOperation = 'source-over'; }
  c.restore();
  // じょうたい
  if (e.slowT > 0) circ(c, x, y, r + 4, 'rgba(140,215,255,.35)');
  if (e.stunT > 0) { rr(c, x - r - 3, y - r - 5, r * 2 + 6, r * 2 + 9, 5, 'rgba(200,240,255,.55)', '#fff', 1.5); }
  if (e.burnT > 0) for (let i = 0; i < 3; i++) { const a = time * 10 + i * 2 + e.id; poly(c, [x - 7 + i * 7, y - r, x - 5 + i * 7 + Math.sin(a) * 2, y - r - 9 - Math.abs(Math.sin(a)) * 6, x - 3 + i * 7, y - r], i % 2 ? '#ffd03a' : '#ff6a2a'); }
  if (e.hp < e.maxHp || e.boss) {
    const w = e.boss ? 60 : Math.max(20, r * 2.2), hy = y - r * (e.boss ? 1.9 : 1.5) - 8;
    rr(c, x - w / 2 - 1, hy - 1, w + 2, e.boss ? 8 : 5.5, 3, 'rgba(0,0,0,.6)');
    rr(c, x - w / 2, hy, Math.max(1, w * e.hp / e.maxHp), e.boss ? 6 : 3.5, 2, e.boss ? '#ff4d6a' : '#ff5a4a');
  }
}

// ───────── へいしと ヒーロー ─────────
function hpBar(c, x, y, w, ratio, col = '#5be36a') {
  rr(c, x - w / 2 - 1, y - 1, w + 2, 6, 3, 'rgba(0,0,0,.6)'); rr(c, x - w / 2, y, Math.max(1, w * ratio), 4, 2, col);
}
function drawSoldier(c, o, time) {
  if (o.downT > 0) { c.globalAlpha = 0.5; ell(c, o.x, o.y + 6, 7, 3, '#fff'); c.globalAlpha = 1; return; }
  const sw = o.swing != null ? Math.max(0, 1 - (time - o.swing) / 0.2) : 0, f = o.face || 1;
  ell(c, o.x, o.y + 8, 7, 3, 'rgba(0,0,0,.25)');
  c.save(); c.translate(o.x, o.y); c.scale(f, 1);
  rr(c, -5, -2, 10, 10, 3, o.elite ? '#c9d2dd' : '#3f7fd6', INK, 1.5); circ(c, 0, -6, 5.5, '#ffd9b0', INK, 1.5);
  c.beginPath(); c.arc(0, -7, 5.8, Math.PI, 0); c.fillStyle = o.elite ? '#ffd84a' : '#8b96a3'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.5; c.stroke();
  c.save(); c.translate(5, 0); c.rotate(-0.9 + sw * 1.8); c.strokeStyle = '#e8eef5'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -11); c.stroke(); c.restore();
  c.restore();
  if (o.hp < o.maxHp) hpBar(c, o.x, o.y - 18, 16, o.hp / o.maxHp);
}
export function drawHero(c, h, time, selected = false) {
  const s = h.s, f = h.face || 1, down = h.downT > 0;
  const lift = s.fly ? 26 + Math.sin(time * 3) * 3 : 0, bob = h.moving && !s.fly ? Math.abs(Math.sin(time * 10)) * 3 : 0;
  const x = h.x, y = h.y - lift - bob;
  if (selected) { ell(c, h.x, h.y + 10, 24, 11, 'rgba(255,255,255,.3)', '#fff', 2.5); }
  ell(c, h.x, h.y + 11, s.fly ? 14 : 13, 5, 'rgba(0,0,0,.28)');
  const sw = h.swing != null ? Math.max(0, 1 - (time - h.swing) / 0.22) : 0;
  const hk = h.icon ? 1 : 1.25;
  c.save(); c.translate(x, y); c.scale(f * hk, hk);
  if (down) { c.globalAlpha = 0.45; c.rotate(1.3); }
  if (h.type === 'squire' || h.type === 'knight') {
    const big = h.type === 'knight', body = big ? '#e2b23a' : '#58a85c';
    if (big) poly(c, [-9, -6, -15, 12, -3, 10], '#c0392b', INK, 1.5);
    rr(c, -8, -4, 16, 16, 5, body, INK); circ(c, 0, -11, 8.5, '#ffd9b0', INK);
    c.beginPath(); c.arc(0, -12.5, 8.8, Math.PI * 1.05, -0.05 * Math.PI); c.fillStyle = big ? '#d8dee6' : '#7a5230'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.8; c.stroke();
    if (big) poly(c, [-2, -21, 1, -29, 4, -21], '#e0483a', INK, 1.2);
    eyes(c, 2, -10, 3, 1.8);
    c.save(); c.translate(9, 0); c.rotate(-0.8 + sw * 2.2);
    c.strokeStyle = INK; c.lineWidth = big ? 6 : 4.5; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, big ? -24 : -17); c.stroke();
    c.strokeStyle = '#eef3f8'; c.lineWidth = big ? 3.5 : 2.5; c.beginPath(); c.moveTo(0, -2); c.lineTo(0, big ? -23 : -16); c.stroke();
    c.strokeStyle = '#ffd84a'; c.lineWidth = 3; c.beginPath(); c.moveTo(-4, 0); c.lineTo(4, 0); c.stroke();
    c.restore();
    poly(c, [-13, -3, -5, -3, -5, 6, -9, 10, -13, 6], big ? '#3f6fd6' : '#b8773a', INK, 1.5);
  } else if (h.type === 'mage') {
    poly(c, [-10, 13, -7, -5, 7, -5, 10, 13], '#8f6be8', INK); circ(c, 0, -11, 8, '#ffd9b0', INK);
    poly(c, [-12, -13, 2, -34, 12, -13], '#5a3fc0', INK); star(c, 1, -20, 3.5, '#ffd84a'); eyes(c, 2, -10, 3, 1.8);
    c.strokeStyle = '#6b4a2f'; c.lineWidth = 3; c.beginPath(); c.moveTo(13, 13); c.lineTo(13, -18); c.stroke();
    circ(c, 13, -21, 5 + sw * 3, '#ffe66a', '#fff', 1.5);
  } else {
    const fl = Math.sin(time * 9) * 8;
    poly(c, [-4, -2, -26, -16 + fl, -20, 6, -8, 6], '#b8281c', INK, 1.8); poly(c, [4, -2, 22, -18 + fl, 20, 4, 8, 6], '#b8281c', INK, 1.8);
    ell(c, 0, 4, 15, 9, '#e2573b', INK); poly(c, [-13, 4, -26, 10, -13, 9], '#e2573b', INK, 1.5);
    rr(c, 9, -8, 16, 11, 5, '#e2573b', INK); circ(c, 19, -5, 1.8, '#fff'); poly(c, [12, -8, 10, -15, 16, -9], '#ffd84a', INK, 1);
    rr(c, -5, -11, 9, 11, 3, '#3f6fd6', INK, 1.5); circ(c, 0, -15, 5.5, '#ffd9b0', INK, 1.5);
    c.beginPath(); c.arc(0, -16, 5.8, Math.PI, 0); c.fillStyle = '#d8dee6'; c.fill(); c.stroke();
  }
  c.restore();
  if (h.fx && h.fx.until > 0 && time < h.fxT) flame(c, x + f * 22, y - 4, h.fx.x2, h.fx.y2, h.fx.w, time);
  if (down) {
    c.fillStyle = '#fff'; c.font = 'bold 13px system-ui,sans-serif'; c.textAlign = 'center'; c.strokeStyle = INK; c.lineWidth = 3;
    const tx = `${Math.ceil(h.downT)}`; c.strokeText(tx, h.x, h.y - 22); c.fillText(tx, h.x, h.y - 22);
  } else if (!h.icon) hpBar(c, x, y - (h.type === 'mage' ? 50 : 44), 34, h.hp / h.maxHp, '#4fd1ff');
}
function flame(c, x1, y1, x2, y2, w, time) {
  const n = 9;
  for (let i = 0; i < n; i++) {
    const k = (i + (time * 6) % 1) / n, px = x1 + (x2 - x1) * k, py = y1 + (y2 - y1) * k;
    const r = (w / 2) * (0.35 + k * 0.75) + Math.sin(time * 20 + i) * 2;
    circ(c, px + Math.sin(time * 13 + i * 2) * 3, py + Math.cos(time * 11 + i) * 3, r, i % 3 === 0 ? 'rgba(255,225,90,.75)' : i % 3 === 1 ? 'rgba(255,140,40,.7)' : 'rgba(240,70,30,.6)');
  }
}

// ───────── がめん ぜんたい ─────────
export class Renderer {
  constructor(canvas) {
    this.cv = canvas; this.c = canvas.getContext('2d');
    this.bg = document.createElement('canvas');
    this.view = { s: 1, ox: 0, oy: 0, w: 0, h: 0, dpr: 1 };
    this.fx = []; this.stage = null; this.shake = 0;
  }
  setStage(stage) {
    this.stage = stage; this.paths = stage.paths.map(buildPath); this.fx = []; this.shake = 0;
    const r = rng(stage.id.length * 97 + stage.waves), deco = [];
    for (let i = 0; i < 520 && deco.length < 150; i++) {
      const x = -220 + r() * (FIELD.w + 440), y = -160 + r() * (FIELD.h + 320), k = r(), sz = 0.8 + r() * 0.6;
      if (nearestOnPaths(this.paths, x, y).dist < PATH_W + 26) continue;
      if (Math.hypot(x - stage.castle[0], y - stage.castle[1]) < 100) continue;
      deco.push({ x, y, k, sz });
    }
    this.deco = deco.sort((a, b) => a.y - b.y);
    this.paintBg();
  }
  resize() {
    const cv = this.cv, w = cv.clientWidth, h = cv.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (!w || !h) return;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const s = Math.min(w / FIELD.w, h / FIELD.h);
    this.view = { s, ox: (w - FIELD.w * s) / 2, oy: (h - FIELD.h * s) / 2, w, h, dpr };
    if (this.stage) this.paintBg();
  }
  toField(cx, cy) { const v = this.view; return { x: (cx - v.ox) / v.s, y: (cy - v.oy) / v.s }; }
  xf(c) { const v = this.view; c.setTransform(v.dpr * v.s, 0, 0, v.dpr * v.s, v.ox * v.dpr, v.oy * v.dpr); }
  paintBg() {
    const v = this.view, b = this.bg, st = this.stage, th = THEMES[st.id];
    if (!v.w) return;
    b.width = this.cv.width; b.height = this.cv.height;
    const c = b.getContext('2d');
    c.fillStyle = th.ground; c.fillRect(0, 0, b.width, b.height);
    this.xf(c);
    const r = rng(st.waves * 31 + 5);
    for (let i = 0; i < 70; i++) ell(c, -220 + r() * (FIELD.w + 440), -160 + r() * (FIELD.h + 320), 30 + r() * 70, 14 + r() * 26, th.patch[i % 2]);
    // 道
    c.lineCap = 'round'; c.lineJoin = 'round';
    const trace = p => {
      const a = p.pts[0], b2 = p.pts[1], l = Math.hypot(b2[0] - a[0], b2[1] - a[1]);
      c.beginPath(); c.moveTo(a[0] - (b2[0] - a[0]) / l * 500, a[1] - (b2[1] - a[1]) / l * 500);
      for (const q of p.pts) c.lineTo(q[0], q[1]);
    };
    for (const p of this.paths) { trace(p); c.strokeStyle = th.edge; c.lineWidth = PATH_W * 2 + 8; c.stroke(); }
    for (const p of this.paths) { trace(p); c.strokeStyle = th.path; c.lineWidth = PATH_W * 2; c.stroke(); }
    c.fillStyle = th.mark;
    for (const p of this.paths) for (let d = 14; d < p.len; d += 26) {
      const s = p.segs.find(q => d <= q.at + q.l) || p.segs[0], k = (d - s.at) / s.l, rr2 = rng(Math.floor(d) + p.len | 0);
      ell(c, s.x1 + (s.x2 - s.x1) * k + (rr2() - 0.5) * 26, s.y1 + (s.y2 - s.y1) * k + (rr2() - 0.5) * 26, 3 + rr2() * 4, 2 + rr2() * 2.5, th.mark);
    }
    for (const d of this.deco) this.decoItem(c, st.id, d);
  }
  decoItem(c, id, d) {
    const { x, y, k, sz } = d;
    c.save(); c.translate(x, y); c.scale(sz, sz);
    if (id === 'meadow') {
      if (k < 0.3) { ell(c, 0, 12, 14, 5, 'rgba(0,0,0,.18)'); rr(c, -3, 0, 6, 13, 2, '#8a5a30', INK, 1.5); circ(c, 0, -8, 15, '#3f9a4a', INK); circ(c, -5, -12, 6, '#57b561'); }
      else if (k < 0.45) { ell(c, 0, 2, 10, 7, '#a9b0b8', INK); ell(c, -3, 0, 4, 2.5, '#cfd5db'); }
      else if (k < 0.8) { const col = ['#fff', '#ffe14a', '#ff8fb8'][Math.floor(k * 100) % 3]; for (let i = 0; i < 5; i++) circ(c, Math.cos(i * 1.257) * 3.2, Math.sin(i * 1.257) * 3.2, 2.3, col); circ(c, 0, 0, 1.8, '#f2a81d'); }
      else { c.strokeStyle = '#4f9e45'; c.lineWidth = 2; c.beginPath(); c.moveTo(-5, 4); c.lineTo(-7, -5); c.moveTo(0, 4); c.lineTo(0, -8); c.moveTo(5, 4); c.lineTo(7, -5); c.stroke(); }
    } else if (id === 'snow') {
      if (k < 0.4) { ell(c, 0, 13, 13, 5, 'rgba(60,90,130,.18)'); rr(c, -2.5, 4, 5, 10, 2, '#6b4a2f', INK, 1.2); poly(c, [-13, 6, 0, -8, 13, 6], '#2f7a5a', INK, 1.5); poly(c, [-10, -3, 0, -17, 10, -3], '#35875f', INK, 1.5); poly(c, [-6, -10, 0, -22, 6, -10], '#fff', INK, 1.2); }
      else if (k < 0.6) { poly(c, [-9, 6, -4, -8, 3, -3, 8, -11, 11, 6], '#bfe6ff', '#6aa6cc', 1.5); }
      else if (k < 0.75) { circ(c, 0, 4, 7, '#fff', '#9ab4cc', 1.5); circ(c, 0, -6, 5, '#fff', '#9ab4cc', 1.5); circ(c, -1.5, -7, 0.9, INK); circ(c, 1.8, -7, 0.9, INK); poly(c, [0, -5.5, 5, -4.5, 0, -4], '#ff8a2a'); }
      else ell(c, 0, 0, 16, 6, '#fff');
    } else {
      if (k < 0.25) { ell(c, 0, 0, 20, 10, '#3a1d12', '#2a1510', 2); ell(c, 0, 0, 15, 7, '#ff7a1a'); ell(c, -3, -1, 8, 3.5, '#ffd03a'); }
      else if (k < 0.6) { poly(c, [-11, 7, -7, -8, 1, -12, 9, -5, 12, 7], '#4a3a36', '#231815', 2); poly(c, [-5, -4, 0, -9, 3, -2], '#6b5750'); }
      else if (k < 0.8) { c.strokeStyle = '#2a1d19'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 10); c.lineTo(0, -8); c.moveTo(0, -1); c.lineTo(-7, -9); c.moveTo(0, -4); c.lineTo(6, -12); c.stroke(); }
      else { c.strokeStyle = '#ff8a2a'; c.lineWidth = 2; c.beginPath(); c.moveTo(-9, 0); c.lineTo(-3, 3); c.lineTo(2, -2); c.lineTo(9, 1); c.stroke(); }
    }
    c.restore();
  }

  // できごとから えんしゅつを 作る
  feed(events) {
    for (const e of events) {
      const P = (n, col, sp = 90, size = 3, life = 0.5) => { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = sp * (0.4 + Math.random() * 0.8); this.fx.push({ k: 'p', x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life, max: life, col, size: size * (0.6 + Math.random() * 0.8) }); } };
      switch (e.t) {
        case 'die': P(e.boss ? 40 : 7, e.boss ? '#ffd84a' : '#fff', e.boss ? 200 : 90, e.boss ? 5 : 3, e.boss ? 0.9 : 0.4);
          this.fx.push({ k: 't', x: e.x, y: e.y - 12, text: `+${e.gold}`, col: '#ffe14a', life: 0.8, max: 0.8 });
          if (e.boss) { this.shake = 0.5; this.fx.push({ k: 'r', x: e.x, y: e.y, r: 120, col: '#ffd84a', life: 0.6, max: 0.6 }); } break;
        case 'boom': this.fx.push({ k: 'b', x: e.x, y: e.y, r: e.r, fire: e.fire, life: 0.32, max: 0.32 }); P(6, e.fire ? '#ff8a2a' : '#ffd9a0', 110, 3, 0.35); break;
        case 'hit': P(2, '#fff', 50, 2, 0.2); break;
        case 'slash': this.fx.push({ k: 's', x: e.x, y: e.y, life: 0.18, max: 0.18, a: Math.random() * TAU }); break;
        case 'bolt': this.fx.push({ k: 'z', pts: e.pts, kind: e.kind, life: 0.2, max: 0.2, seed: Math.random() * 99 }); break;
        case 'pulse': this.fx.push({ k: 'r', x: e.x, y: e.y, r: e.r, col: e.freeze ? '#fff' : '#9be3ff', life: 0.45, max: 0.45, fill: true }); break;
        case 'aura': this.fx.push({ k: 'r', x: e.x, y: e.y, r: e.r, col: e.kind === 'fire' ? '#ff6a2a' : '#bfeaff', life: 0.7, max: 0.7, fill: true }); this.shake = 0.25; break;
        case 'place': P(10, '#fff', 80, 3, 0.4); break;
        case 'sell': P(8, '#ffe14a', 80, 3, 0.4); break;
        case 'upgrade': P(e.evolve ? 30 : 14, e.evolve ? '#ffd84a' : '#9bffb0', e.evolve ? 150 : 100, 3.5, 0.7); this.fx.push({ k: 'r', x: e.x, y: e.y, r: e.evolve ? 70 : 40, col: '#ffd84a', life: 0.5, max: 0.5 }); break;
        case 'leak': this.shake = 0.35; this.fx.push({ k: 't', x: e.x, y: e.y - 40, text: `-${e.n}`, col: '#ff6a6a', life: 1, max: 1, big: true }); break;
        case 'heroUp': case 'soldierUp': P(8, '#9bffb0', 70, 3, 0.5); break;
        case 'skill':
          if (e.id === 'meteor') { this.fx.push({ k: 'm', x: e.x, y: e.y, r: e.r, life: 0.5, max: 0.5 }); this.shake = 0.5; }
          else if (e.id === 'spin') { this.fx.push({ k: 'r', x: e.x, y: e.y, r: e.r, col: '#ffe14a', life: 0.5, max: 0.5, fill: true }); this.shake = 0.3; }
          else if (e.id === 'breath') { this.fx.push({ k: 'f', life: 0.9, max: 0.9 }); this.shake = 0.5; }
          else this.fx.push({ k: 'c', life: 1, max: 1 });
          break;
      }
    }
    if (this.fx.length > 500) this.fx.splice(0, this.fx.length - 500);
  }

  draw(g, ui, time, dt) {
    const c = this.c, v = this.view;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(this.bg, 0, 0);
    this.xf(c);
    if (this.shake > 0) { this.shake -= dt; c.translate((Math.random() - 0.5) * 8 * this.shake, (Math.random() - 0.5) * 8 * this.shake); }
    // 入り口
    for (const p of this.paths) {
      const a = p.pts[0], b = p.pts[1], vert = Math.abs(b[1] - a[1]) > Math.abs(b[0] - a[0]);
      const gx = vert ? a[0] : FIELD.w - 22, gy = vert ? 34 : a[1];
      c.save(); c.translate(gx, gy); if (vert) c.rotate(-Math.PI / 2);
      rr(c, -10, -PATH_W - 12, 22, PATH_W * 2 + 24, 6, '#3b3147', INK, 2.5); rr(c, -6, -PATH_W - 4, 14, PATH_W * 2 + 8, 5, '#120d1c');
      circ(c, 1, -6, 2.5, `rgba(255,80,80,${0.5 + 0.5 * Math.sin(time * 3)})`); circ(c, 1, 6, 2.5, `rgba(255,80,80,${0.5 + 0.5 * Math.sin(time * 3 + 1)})`);
      c.restore();
    }
    // はんい
    const rangeRing = (x, y, r, ok = true) => { circ(c, x, y, r, ok ? 'rgba(255,255,255,.16)' : 'rgba(255,60,60,.2)', ok ? 'rgba(255,255,255,.85)' : 'rgba(255,90,90,.9)', 2); };
    if (ui.selTower) { const t = ui.selTower, s = towerStats(t.type, t.lv, t.branch, g.pow[t.type]); rangeRing(t.x, t.y, s.range); }
    if (ui.heroSel && !g.hero.s.block) rangeRing(g.hero.x, g.hero.y, g.hero.s.range);
    // ならべて かく（おくから 手前へ）
    const items = [];
    for (const t of g.towers) items.push([t.y, 0, t]);
    for (const o of g.soldiers) items.push([o.y, 1, o]);
    for (const e of g.enemies) if (!e.fly) items.push([e.y, 2, e]);
    if (!g.hero.s.fly) items.push([g.hero.y, 3, g.hero]);
    items.push([g.stage.castle[1], 4, null]);
    items.sort((a, b) => a[0] - b[0]);
    for (const [, k, o] of items) {
      if (k === 0) { drawTower(c, o, time); if (o.fx && o.fx.until > g.t) flame(c, o.x + Math.cos(o.ang) * 20, o.y - 12 + Math.sin(o.ang) * 20, o.fx.x2, o.fx.y2 - 6, o.fx.w, time); }
      else if (k === 1) drawSoldier(c, o, g.t);
      else if (k === 2) { c.globalAlpha = Math.min(1, o.d / 30 + 0.1); drawEnemy(c, o, time); c.globalAlpha = 1; }
      else if (k === 3) this.hero(c, g, time, ui);
      else {
        const [cx, cy] = g.stage.castle; drawCastle(c, cx, cy, ui.castleLv || 0, time);
        hpBar(c, cx, cy + 34, 80, g.lives / g.maxLives, g.lives / g.maxLives > 0.4 ? '#ff5a7a' : '#ff2a2a');
      }
    }
    for (const e of g.enemies) if (e.fly) { c.globalAlpha = Math.min(1, e.d / 30 + 0.1); drawEnemy(c, e, time); c.globalAlpha = 1; }
    if (g.hero.s.fly) this.hero(c, g, time, ui);
    // たま
    for (const b of g.shots) {
      if (b.kind === 'cannon') {
        const tot = Math.hypot(b.tx - b.sx, b.ty - b.sy) || 1, k = 1 - Math.hypot(b.tx - b.x, b.ty - b.y) / tot, arc = Math.sin(Math.max(0, Math.min(1, k)) * Math.PI) * Math.min(40, tot * 0.3);
        ell(c, b.x, b.y + 6, 5, 2.5, 'rgba(0,0,0,.25)'); circ(c, b.x, b.y - arc, b.big ? 6.5 : 5, b.s.burn ? '#ff7a2a' : '#2b2f36', INK, 1.5);
      } else {
        c.save(); c.translate(b.x, b.y); c.rotate(b.ang || 0);
        c.strokeStyle = '#6b4a2f'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-9, 0); c.lineTo(5, 0); c.stroke(); poly(c, [5, -3, 11, 0, 5, 3], '#e8eef5', INK, 1);
        c.restore();
      }
    }
    this.effects(c, time, dt);
    // おこうと している タワー
    if (ui.ghost) {
      const q = ui.ghost, s = towerStats(q.type, 1, null, g.pow[q.type]);
      rangeRing(q.x, q.y, s.range, q.ok);
      c.globalAlpha = q.ok ? 0.85 : 0.45; drawTower(c, { x: q.x, y: q.y, type: q.type, lv: 1, branch: null }, time, true); c.globalAlpha = 1;
    }
    if (ui.aim) { const q = ui.aim; circ(c, q.x, q.y, q.r, 'rgba(255,200,60,.25)', '#ffd84a', 3); star(c, q.x, q.y, 9, '#ffd84a'); }
    if (ui.heroSel && ui.pointer) { c.setLineDash([6, 6]); c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(g.hero.x, g.hero.y); c.lineTo(ui.pointer.x, ui.pointer.y); c.stroke(); c.setLineDash([]); }
    if (g.buffT > 0) { c.setTransform(v.dpr, 0, 0, v.dpr, 0, 0); c.strokeStyle = `rgba(255,220,80,${0.35 + 0.25 * Math.sin(time * 8)})`; c.lineWidth = 10; c.strokeRect(0, 0, v.w, v.h); }
  }
  hero(c, g, time, ui) {
    const h = g.hero;
    h.fxT = h.fx ? h.fx.until - g.t + time : 0;
    if (h.fx && h.fx.until <= g.t) h.fx = null;
    drawHero(c, h, time, !!ui.heroSel);
    if (h.tx !== h.x || h.ty !== h.y) star(c, h.tx, h.ty, 6, 'rgba(255,255,255,.8)');
  }
  effects(c, time, dt) {
    const v = this.view;
    for (const f of this.fx) {
      f.life -= dt;
      const k = Math.max(0, f.life / f.max);
      if (f.k === 'p') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 220 * dt; c.globalAlpha = k; circ(c, f.x, f.y, f.size, f.col); c.globalAlpha = 1; }
      else if (f.k === 't') {
        c.globalAlpha = Math.min(1, k * 2); c.font = `900 ${f.big ? 22 : 13}px system-ui,sans-serif`; c.textAlign = 'center';
        c.strokeStyle = INK; c.lineWidth = 3; c.strokeText(f.text, f.x, f.y - (1 - k) * 22); c.fillStyle = f.col; c.fillText(f.text, f.x, f.y - (1 - k) * 22); c.globalAlpha = 1;
      } else if (f.k === 'r') { c.globalAlpha = k; circ(c, f.x, f.y, f.r * (1 - k * 0.6), f.fill ? f.col + '33' : null, f.col, 3); c.globalAlpha = 1; }
      else if (f.k === 'b') {
        c.globalAlpha = k; circ(c, f.x, f.y, f.r * (1 - k * 0.5), f.fire ? '#ff7a1a' : '#ffb347'); circ(c, f.x, f.y, f.r * (1 - k * 0.5) * 0.6, '#fff3b0'); c.globalAlpha = 1;
      } else if (f.k === 's') { c.globalAlpha = k; c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(f.x, f.y, 13, f.a, f.a + 2.2); c.stroke(); c.globalAlpha = 1; }
      else if (f.k === 'z') {
        const col = f.kind === 'zap' ? '#fff27a' : f.kind === 'big' ? '#ff7af0' : '#d6a8ff', r = rng(Math.floor(f.seed * 1000));
        c.globalAlpha = k; c.lineCap = 'round';
        for (const [lw, cl] of [[f.kind === 'big' ? 9 : 6, col], [f.kind === 'big' ? 4 : 2.5, '#fff']]) {
          c.strokeStyle = cl; c.lineWidth = lw; c.beginPath(); c.moveTo(f.pts[0][0], f.pts[0][1]);
          for (let i = 1; i < f.pts.length; i++) {
            const [ax, ay] = f.pts[i - 1], [bx, by] = f.pts[i];
            if (f.kind === 'zap') for (let j = 1; j < 4; j++) c.lineTo(ax + (bx - ax) * j / 4 + (r() - 0.5) * 16, ay + (by - ay) * j / 4 + (r() - 0.5) * 16);
            c.lineTo(bx, by);
          }
          c.stroke();
        }
        const e = f.pts[f.pts.length - 1]; circ(c, e[0], e[1], f.kind === 'big' ? 16 * k + 4 : 7, col);
        c.globalAlpha = 1;
      } else if (f.k === 'm') {
        const q = 1 - k;
        if (q < 0.5) { const p = q / 0.5, mx = f.x + (1 - p) * 220, my = f.y - (1 - p) * 420; c.strokeStyle = 'rgba(255,200,80,.7)'; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.moveTo(mx + 50, my - 95); c.lineTo(mx, my); c.stroke(); star(c, mx, my, 20, '#fff3b0'); }
        else { const p = (q - 0.5) / 0.5; c.globalAlpha = 1 - p; circ(c, f.x, f.y, f.r * (0.4 + p * 0.6), '#ff8a2a'); circ(c, f.x, f.y, f.r * (0.4 + p * 0.6) * 0.6, '#fff3b0'); c.globalAlpha = 1; }
      } else if (f.k === 'f') {
        c.save(); c.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
        const gr = c.createLinearGradient(0, v.h, 0, 0); gr.addColorStop(0, `rgba(255,90,20,${0.6 * k})`); gr.addColorStop(1, `rgba(255,210,60,${0.25 * k})`);
        c.fillStyle = gr; c.fillRect(0, 0, v.w, v.h); c.restore();
      } else if (f.k === 'c') {
        c.save(); c.setTransform(v.dpr, 0, 0, v.dpr, 0, 0); c.globalAlpha = k * 0.35; c.fillStyle = '#ffe14a'; c.fillRect(0, 0, v.w, v.h); c.restore();
      }
    }
    this.fx = this.fx.filter(f => f.life > 0);
  }
}

// おみせや ボタンに つかう 小さな え
export function iconCanvas(kind, id, size = 64, extra = {}) {
  const cv = document.createElement('canvas'), dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = cv.height = size * dpr; cv.style.width = cv.style.height = size + 'px';
  const c = cv.getContext('2d'); c.scale(dpr * size / 64, dpr * size / 64);
  if (kind === 'tower') drawTower(c, { x: 32, y: 44, type: id, lv: extra.lv || 1, branch: extra.branch || null, ang: -0.6 }, 0.6, true);
  else if (kind === 'hero') { c.translate(32, 46); c.scale(1.3, 1.3); drawHero(c, { x: 0, y: 0, type: id, s: { fly: false }, hp: 1, maxHp: 1, downT: 0, face: 1, icon: true }, 0.2); }
  else if (kind === 'enemy') { const E = ENEMIES[id], k = 24 / E.r; c.translate(32, 38); c.scale(k, k); drawEnemy(c, { x: 0, y: 0, type: id, r: E.r, id: 1, hp: 1, maxHp: 1, face: -1, fly: false, boss: false, hitT: 0 }, 0.1); }
  else if (kind === 'castle') { c.translate(32, 50); c.scale(0.4, 0.4); drawCastle(c, 0, 0, extra.lv || 0, 0); }
  return cv;
}
export { TOWERS };
