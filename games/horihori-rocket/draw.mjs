// え（すべて ずけいで かく）
import { T, ORES, BANDS, TREASURES, bandIndex } from './core.mjs';

const hash = (x, y) => {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
};

const shade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

// ---------- マスの え（さきに かいて おく） ----------
export class TileArt {
  constructor() { this.size = 0; this.cache = new Map(); }

  setSize(ts) {
    if (ts === this.size) return;
    this.size = ts; this.cache.clear();
  }

  get(kind, band, v) {
    const key = `${kind}|${band}|${v}`;
    let c = this.cache.get(key);
    if (!c) { c = this.make(kind, band, v); this.cache.set(key, c); }
    return c;
  }

  canvas() {
    const c = document.createElement('canvas');
    c.width = c.height = Math.ceil(this.size);
    return c;
  }

  rock(g, s, band, v, dark = 0) {
    const col = BANDS[band].color;
    g.fillStyle = shade(col, dark);
    g.fillRect(0, 0, s, s);
    let h = hash(band * 7 + 3, v * 13 + 1);
    const R = () => { h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; h = (h ^ (h >>> 13)) >>> 0; return (h % 10000) / 10000; };
    for (let i = 0; i < 9; i++) {
      g.fillStyle = shade(col, (R() < 0.5 ? -0.22 : 0.16) + dark);
      const r = s * (0.04 + R() * 0.08);
      g.beginPath(); g.arc(R() * s, R() * s, r, 0, Math.PI * 2); g.fill();
    }
    if (band >= 5 && !dark) { // すいしょうの きらきら
      g.fillStyle = 'rgba(180,230,255,.5)';
      for (let i = 0; i < 3; i++) { const x = R() * s, y = R() * s; g.fillRect(x, y, s * 0.05, s * 0.05); }
    }
  }

  make(kind, band, v) {
    const c = this.canvas(), g = c.getContext('2d'), s = this.size;
    if (kind === 'back') { // ほった あとの おく
      this.rock(g, s, band, v, -0.55);
      return c;
    }
    if (kind === T.BEDROCK) {
      g.fillStyle = '#1d1a24'; g.fillRect(0, 0, s, s);
      g.fillStyle = '#2f2a3a';
      for (let i = 0; i < 4; i++) g.fillRect(((v * 7 + i * 5) % 10) / 10 * s, ((v * 3 + i * 7) % 10) / 10 * s, s * 0.25, s * 0.12);
      return c;
    }
    this.rock(g, s, band, v);
    // ふちを すこし くらく して マスを わかりやすく
    g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = Math.max(1, s * 0.04);
    g.strokeRect(0, 0, s, s);
    if (band === 0 && kind === T.DIRT) {
      g.fillStyle = 'rgba(255,230,190,.12)'; g.fillRect(0, 0, s, s * 0.15);
    }
    const ore = ORES[kind];
    if (ore) {
      const spots = [[0.3, 0.3, 0.17], [0.68, 0.42, 0.14], [0.42, 0.7, 0.15], [0.75, 0.75, 0.1]];
      for (const [x, y, r] of spots) gem(g, (x + ((v & 1) ? 0.04 : -0.03)) * s, y * s, r * s, ore.color, ore.shine, kind);
    } else if (kind === T.FOSSIL) {
      g.save(); g.translate(s / 2, s / 2); g.rotate(v * 0.7);
      g.fillStyle = '#f3ead2'; g.strokeStyle = '#a8986f'; g.lineWidth = s * 0.04;
      g.beginPath(); g.roundRect(-s * 0.28, -s * 0.06, s * 0.56, s * 0.12, s * 0.06); g.fill(); g.stroke();
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) { g.beginPath(); g.arc(sx * s * 0.3, sy * s * 0.07, s * 0.08, 0, Math.PI * 2); g.fill(); g.stroke(); }
      g.restore();
    }
    return c;
  }
}

function gem(g, x, y, r, col, shine, kind) {
  g.fillStyle = 'rgba(0,0,0,.25)';
  g.beginPath(); g.arc(x + r * 0.15, y + r * 0.2, r, 0, Math.PI * 2); g.fill();
  if (kind === T.RAINBOW) {
    const gr = g.createLinearGradient(x - r, y - r, x + r, y + r);
    ['#ff6b6b', '#ffd93d', '#6bff95', '#6bc8ff', '#c77dff'].forEach((c, i) => gr.addColorStop(i / 4, c));
    g.fillStyle = gr;
  } else g.fillStyle = col;
  g.beginPath();
  if (kind >= T.RUBY) { g.moveTo(x, y - r); g.lineTo(x + r, y); g.lineTo(x, y + r); g.lineTo(x - r, y); g.closePath(); }
  else g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = shine;
  g.beginPath(); g.arc(x - r * 0.35, y - r * 0.35, r * 0.3, 0, Math.PI * 2); g.fill();
}

// こうせきの つぶ（ベルトの 上や バッグの アイコン）
export function drawOre(g, ore, x, y, r) {
  const o = ORES[ore];
  gem(g, x, y, r, o.color, o.shine, ore);
}

export function drawTreasure(g, i, x, y, s, t) {
  const tr = TREASURES[i];
  const p = 0.5 + 0.5 * Math.sin(t * 4);
  const gl = g.createRadialGradient(x, y, 0, x, y, s * 0.9);
  gl.addColorStop(0, tr.color + 'cc'); gl.addColorStop(1, tr.color + '00');
  g.fillStyle = gl; g.globalAlpha = 0.5 + p * 0.5;
  g.beginPath(); g.arc(x, y, s * 0.9, 0, Math.PI * 2); g.fill();
  g.globalAlpha = 1;
  // たからばこ
  const w = s * 0.62, h = s * 0.44;
  g.fillStyle = '#a0522d'; g.strokeStyle = '#5a2a10'; g.lineWidth = s * 0.04;
  g.beginPath(); g.roundRect(x - w / 2, y - h / 2 + s * 0.06, w, h, s * 0.06); g.fill(); g.stroke();
  g.fillStyle = '#c0703d';
  g.beginPath(); g.roundRect(x - w / 2, y - h / 2 - s * 0.06, w, h * 0.45, [s * 0.14, s * 0.14, s * 0.03, s * 0.03]); g.fill(); g.stroke();
  g.fillStyle = '#ffd34a'; g.fillRect(x - s * 0.06, y - s * 0.05, s * 0.12, s * 0.16);
}

// ---------- ほりほりごう（プレイヤー） ----------
export function drawPlayer(g, x, y, s, st) {
  // x, y は まんなか。st = { face: -1|1, dir: 'l'|'r'|'d'|'u'|null, drilling, jet, t }
  g.save(); g.translate(x, y);
  const f = st.face;
  // ジェットの ほのお
  if (st.jet) {
    for (const sx of [-0.22, 0.22]) {
      const fl = s * (0.25 + Math.random() * 0.2);
      const gr = g.createLinearGradient(0, s * 0.35, 0, s * 0.35 + fl);
      gr.addColorStop(0, '#fff6a0'); gr.addColorStop(0.5, '#ff9a2e'); gr.addColorStop(1, 'rgba(255,60,0,0)');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(sx * s - s * 0.08, s * 0.33); g.lineTo(sx * s + s * 0.08, s * 0.33); g.lineTo(sx * s, s * 0.35 + fl); g.closePath(); g.fill();
    }
  }
  // ドリル
  const dir = st.dir || (f > 0 ? 'r' : 'l');
  const ang = { r: 0, d: Math.PI / 2, l: Math.PI, u: -Math.PI / 2 }[dir];
  g.save(); g.rotate(ang);
  const spin = st.drilling ? (st.t * 30) % 1 : 0;
  g.fillStyle = '#b8c2cc'; g.strokeStyle = '#59636e'; g.lineWidth = s * 0.03;
  g.beginPath(); g.moveTo(s * 0.3, -s * 0.16); g.lineTo(s * 0.62, 0); g.lineTo(s * 0.3, s * 0.16); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = '#7d8893';
  for (let k = 0; k < 3; k++) {
    const px = s * (0.34 + ((k / 3 + spin) % 1) * 0.24);
    const hh = s * 0.16 * (1 - (px / s - 0.3) / 0.32);
    g.beginPath(); g.moveTo(px, -hh); g.lineTo(px + s * 0.04, hh); g.stroke();
  }
  g.restore();
  // からだ
  const bob = st.drilling ? Math.sin(st.t * 60) * s * 0.015 : 0;
  g.translate(0, bob);
  g.fillStyle = '#ffb627'; g.strokeStyle = '#a5620b'; g.lineWidth = s * 0.04;
  g.beginPath(); g.roundRect(-s * 0.36, -s * 0.12, s * 0.72, s * 0.42, s * 0.1); g.fill(); g.stroke();
  g.fillStyle = '#e8492f';
  g.fillRect(-s * 0.36, s * 0.08, s * 0.72, s * 0.06);
  // キャタピラ
  g.fillStyle = '#3c3f47';
  g.beginPath(); g.roundRect(-s * 0.38, s * 0.26, s * 0.76, s * 0.14, s * 0.07); g.fill();
  g.fillStyle = '#80858f';
  for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(-s * 0.27 + k * s * 0.18, s * 0.33, s * 0.04, 0, Math.PI * 2); g.fill(); }
  // まど と うんてんしゅ
  g.fillStyle = '#bff0ff'; g.strokeStyle = '#a5620b';
  g.beginPath(); g.arc(f * s * 0.04, -s * 0.12, s * 0.24, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#ffd9b3';
  g.beginPath(); g.arc(f * s * 0.06, -s * 0.15, s * 0.11, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffd400'; // ヘルメット
  g.beginPath(); g.arc(f * s * 0.06, -s * 0.18, s * 0.12, Math.PI, 0); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(f * s * 0.06, -s * 0.27, s * 0.035, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#2b2b2b';
  g.beginPath(); g.arc(f * s * 0.1, -s * 0.14, s * 0.018, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(f * s * 0.03, -s * 0.14, s * 0.018, 0, Math.PI * 2); g.fill();
  g.restore();
}

// ---------- ベルト・ドリル・ホッパー ----------
export function drawBelt(g, x, y, s, dir, t, ok) {
  // dir: [dx, dy] つぎの マスへの むき。null なら つながって いない
  g.save(); g.translate(x + s / 2, y + s / 2);
  const vert = dir && dir[1] !== 0;
  if (vert) {
    g.fillStyle = ok ? '#4b5563' : '#6b6b6b';
    g.fillRect(-s * 0.3, -s / 2, s * 0.08, s); g.fillRect(s * 0.22, -s / 2, s * 0.08, s);
    g.fillStyle = ok ? '#2f3640' : '#555';
    g.fillRect(-s * 0.22, -s / 2, s * 0.44, s);
    g.fillStyle = ok ? '#ffcf3f' : '#999';
    const off = ((t * 1.2 * (dir[1] < 0 ? -1 : 1)) % 1 + 1) % 1;
    for (let k = -1; k < 3; k++) {
      const yy = -s / 2 + ((k / 2 + off / 2) % 1) * s;
      g.fillRect(-s * 0.2, yy, s * 0.4, s * 0.06);
    }
  } else {
    const yb = s * 0.18;
    g.fillStyle = ok ? '#2f3640' : '#555';
    g.beginPath(); g.roundRect(-s / 2, yb, s, s * 0.22, s * 0.1); g.fill();
    g.fillStyle = ok ? '#ffcf3f' : '#999';
    const sx = dir ? dir[0] : 1;
    const off = ((t * 1.2 * sx) % 1 + 1) % 1;
    for (let k = 0; k < 3; k++) {
      const xx = -s / 2 + ((k / 3 + off / 3 * 1) % 1) * s;
      g.beginPath();
      g.moveTo(xx - sx * s * 0.06, yb + s * 0.04); g.lineTo(xx + sx * s * 0.04, yb + s * 0.11); g.lineTo(xx - sx * s * 0.06, yb + s * 0.18);
      g.lineWidth = s * 0.04; g.strokeStyle = g.fillStyle; g.stroke();
    }
    g.fillStyle = '#6b7280';
    for (const xx of [-s * 0.4, 0, s * 0.4]) { g.beginPath(); g.arc(xx, yb + s * 0.32, s * 0.05, 0, Math.PI * 2); g.fill(); }
  }
  if (!ok) {
    g.fillStyle = '#ff5a5a'; g.font = `900 ${s * 0.4}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('!', 0, -s * 0.15);
  }
  g.restore();
}

export function drawAutoDrill(g, x, y, s, t, ok, buf) {
  g.save(); g.translate(x + s / 2, y + s / 2);
  // あし
  g.fillStyle = '#4b5563';
  g.fillRect(-s * 0.38, s * 0.3, s * 0.12, s * 0.2); g.fillRect(s * 0.26, s * 0.3, s * 0.12, s * 0.2);
  // ドリルの さき（下に ささる）
  const sp = ok ? Math.sin(t * 40) * s * 0.02 : 0;
  g.fillStyle = '#b8c2cc';
  g.beginPath(); g.moveTo(-s * 0.12 + sp, s * 0.32); g.lineTo(s * 0.12 + sp, s * 0.32); g.lineTo(sp, s * 0.56); g.closePath(); g.fill();
  // はこ
  g.fillStyle = ok ? '#3fa7ff' : '#7a8899'; g.strokeStyle = '#1d4e89'; g.lineWidth = s * 0.04;
  g.beginPath(); g.roundRect(-s * 0.4, -s * 0.3, s * 0.8, s * 0.62, s * 0.1); g.fill(); g.stroke();
  // はぐるま
  g.save(); g.translate(0, 0); g.rotate(ok ? t * 3 : 0);
  g.fillStyle = '#ffcf3f';
  for (let k = 0; k < 8; k++) { g.rotate(Math.PI / 4); g.fillRect(-s * 0.04, -s * 0.2, s * 0.08, s * 0.08); }
  g.beginPath(); g.arc(0, 0, s * 0.14, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1d4e89'; g.beginPath(); g.arc(0, 0, s * 0.05, 0, Math.PI * 2); g.fill();
  g.restore();
  if (!ok) {
    g.fillStyle = '#fff'; g.beginPath(); g.arc(s * 0.3, -s * 0.36, s * 0.16, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ff5a5a'; g.font = `900 ${s * 0.26}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(buf > 0 ? String(buf) : '!', s * 0.3, -s * 0.35);
  }
  g.restore();
}

export function drawHopper(g, x, y, s, t, pulse) {
  // x, y は マスの ひだり上。地面の 上に たつ
  g.save(); g.translate(x + s / 2, y + s);
  const k = 1 + pulse * 0.08;
  g.scale(k, k);
  g.fillStyle = '#5c6470';
  g.fillRect(-s * 0.32, -s * 0.15, s * 0.1, s * 0.15); g.fillRect(s * 0.22, -s * 0.15, s * 0.1, s * 0.15);
  g.fillStyle = '#2ec27e'; g.strokeStyle = '#17784a'; g.lineWidth = s * 0.05;
  g.beginPath();
  g.moveTo(-s * 0.62, -s * 1.05); g.lineTo(s * 0.62, -s * 1.05); g.lineTo(s * 0.24, -s * 0.35); g.lineTo(s * 0.24, -s * 0.12);
  g.lineTo(-s * 0.24, -s * 0.12); g.lineTo(-s * 0.24, -s * 0.35); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#1f1f24';
  g.beginPath(); g.ellipse(0, -s * 1.02, s * 0.5, s * 0.1, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffd34a'; g.strokeStyle = '#b8860b'; g.lineWidth = s * 0.03;
  g.beginPath(); g.arc(0, -s * 0.62, s * 0.17, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#b8860b'; g.font = `900 ${s * 0.22}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('¥', 0, -s * 0.61);
  g.restore();
}

// ---------- きち（地上の たてもの） ----------
export function drawBase(g, ox, gy, s, rooms, t) {
  // ox: x=0 の がめん x、gy: 地面の がめん y
  const X = v => ox + v * s;
  // いえ
  if (!rooms.workshop && !rooms.museum) {
    // テント
    g.fillStyle = '#f2994a'; g.strokeStyle = '#a0522d'; g.lineWidth = s * 0.05;
    g.beginPath(); g.moveTo(X(2), gy); g.lineTo(X(3.5), gy - s * 1.6); g.lineTo(X(5), gy); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#7a3b10';
    g.beginPath(); g.moveTo(X(3.2), gy); g.lineTo(X(3.5), gy - s * 0.9); g.lineTo(X(3.8), gy); g.closePath(); g.fill();
  } else {
    house(g, X(2), gy, s * 3, s * 2.1, '#ffe7b3', '#d9534f');
  }
  if (rooms.workshop) {
    g.fillStyle = '#9aa5b1'; g.fillRect(X(5.1), gy - s * 1.3, s * 1.7, s * 1.3);
    g.fillStyle = '#6b7785'; g.fillRect(X(5.1), gy - s * 1.45, s * 1.7, s * 0.2);
    g.fillStyle = '#3f4954'; g.fillRect(X(5.5), gy - s * 0.9, s * 0.9, s * 0.9);
    gear(g, X(5.95), gy - s * 1.15, s * 0.16, t);
  }
  if (rooms.museum) {
    g.fillStyle = '#f5f0e6'; g.fillRect(X(0.1), gy - s * 1.4, s * 1.8, s * 1.4);
    g.fillStyle = '#c9b99a';
    g.beginPath(); g.moveTo(X(0), gy - s * 1.4); g.lineTo(X(1), gy - s * 1.9); g.lineTo(X(2), gy - s * 1.4); g.closePath(); g.fill();
    for (const c of [0.3, 0.85, 1.4]) { g.fillStyle = '#e2d8c4'; g.fillRect(X(c), gy - s * 1.3, s * 0.18, s * 1.3); }
    g.fillStyle = '#a8986f'; g.font = `${s * 0.45}px sans-serif`; g.textAlign = 'center'; g.fillText('🦴', X(1), gy - s * 0.45);
  }
  if (rooms.tower) {
    g.strokeStyle = '#7a5230'; g.lineWidth = s * 0.08;
    const tx = X(-0.2) + s * 0.5;
    g.beginPath(); g.moveTo(tx - s * 0.3, gy); g.lineTo(tx - s * 0.1, gy - s * 3); g.moveTo(tx + s * 0.3, gy); g.lineTo(tx + s * 0.1, gy - s * 3);
    g.moveTo(tx - s * 0.25, gy - s); g.lineTo(tx + s * 0.25, gy - s * 1.6); g.stroke();
    g.fillStyle = '#c0392b'; g.fillRect(tx - s * 0.35, gy - s * 3.4, s * 0.7, s * 0.45);
    g.fillStyle = '#ffd34a'; g.fillRect(tx - s * 0.2, gy - s * 3.3, s * 0.4, s * 0.22);
  }
  if (rooms.teleport) {
    const tx = X(6.9), ty = gy;
    g.fillStyle = '#5b4b8a'; g.fillRect(tx, ty - s * 0.15, s * 1, s * 0.15);
    const gr = g.createLinearGradient(0, ty - s * 1.6, 0, ty);
    gr.addColorStop(0, 'rgba(160,120,255,0)'); gr.addColorStop(1, 'rgba(160,120,255,.7)');
    g.fillStyle = gr; g.fillRect(tx + s * 0.1, ty - s * 1.6, s * 0.8, s * 1.45);
    g.strokeStyle = '#d6c8ff'; g.lineWidth = s * 0.04;
    for (let k = 0; k < 3; k++) { const yy = ty - s * (((t * 0.8 + k / 3) % 1) * 1.4 + 0.1); g.beginPath(); g.ellipse(tx + s * 0.5, yy, s * 0.35, s * 0.08, 0, 0, Math.PI * 2); g.stroke(); }
  }
}

export function drawFactory(g, x, gy, s, t) {
  // ホッパーの うしろに たつ 工場
  g.fillStyle = '#8b6f5a'; g.fillRect(x, gy - s * 1.8, s * 3.2, s * 1.8);
  g.fillStyle = '#6f5646';
  for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x + k * s * 1.07, gy - s * 1.8); g.lineTo(x + (k + 1) * s * 1.07, gy - s * 1.8); g.lineTo(x + (k + 1) * s * 1.07, gy - s * 2.4); g.closePath(); g.fill(); }
  g.fillStyle = '#5a4538'; g.fillRect(x + s * 2.6, gy - s * 3.1, s * 0.4, s * 1.4);
  g.fillStyle = '#ffe58a';
  for (let k = 0; k < 3; k++) g.fillRect(x + s * (0.3 + k * 0.95), gy - s * 1.2, s * 0.5, s * 0.4);
  for (let k = 0; k < 3; k++) {
    const p = (t * 0.4 + k / 3) % 1;
    g.fillStyle = `rgba(230,230,235,${0.6 * (1 - p)})`;
    g.beginPath(); g.arc(x + s * 2.8 + p * s * 0.6, gy - s * 3.2 - p * s * 1.2, s * (0.2 + p * 0.3), 0, Math.PI * 2); g.fill();
  }
}

function house(g, x, gy, w, h, wall, roof) {
  g.fillStyle = wall; g.strokeStyle = '#8a5a2b'; g.lineWidth = w * 0.02;
  g.fillRect(x, gy - h * 0.62, w, h * 0.62); g.strokeRect(x, gy - h * 0.62, w, h * 0.62);
  g.fillStyle = roof;
  g.beginPath(); g.moveTo(x - w * 0.08, gy - h * 0.6); g.lineTo(x + w / 2, gy - h); g.lineTo(x + w * 1.08, gy - h * 0.6); g.closePath(); g.fill();
  g.fillStyle = '#8a5a2b'; g.fillRect(x + w * 0.42, gy - h * 0.38, w * 0.16, h * 0.38);
  g.fillStyle = '#9fe0ff'; g.fillRect(x + w * 0.12, gy - h * 0.48, w * 0.18, h * 0.16); g.fillRect(x + w * 0.7, gy - h * 0.48, w * 0.18, h * 0.16);
}

function gear(g, x, y, r, t) {
  g.save(); g.translate(x, y); g.rotate(t);
  g.fillStyle = '#ffcf3f';
  for (let k = 0; k < 8; k++) { g.rotate(Math.PI / 4); g.fillRect(-r * 0.25, -r * 1.3, r * 0.5, r * 0.5); }
  g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
  g.restore();
}

// ---------- ロケット ----------
// parts: できた かず（0〜5）。cx: まんなか、gy: 地面
export function drawRocket(g, cx, gy, s, parts, pad, t, flame = 0, lift = 0) {
  if (!pad) {
    // よてい地の かんばん
    g.fillStyle = '#c9a26b'; g.fillRect(cx - s * 0.05, gy - s * 1.1, s * 0.1, s * 1.1);
    g.fillStyle = '#f5e6c8'; g.strokeStyle = '#8a6a3b'; g.lineWidth = s * 0.04;
    g.beginPath(); g.roundRect(cx - s * 0.9, gy - s * 1.6, s * 1.8, s * 0.6, s * 0.08); g.fill(); g.stroke();
    g.fillStyle = '#6b4a20'; g.font = `900 ${s * 0.22}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('ロケットきち', cx, gy - s * 1.38); g.fillText('よてい地', cx, gy - s * 1.15);
    return;
  }
  // はっしゃだい
  g.fillStyle = '#6b7280'; g.fillRect(cx - s * 2, gy - s * 0.25, s * 4, s * 0.25);
  g.fillStyle = '#facc15';
  for (let k = 0; k < 8; k++) if (k % 2 === 0) g.fillRect(cx - s * 2 + k * s * 0.5, gy - s * 0.25, s * 0.5, s * 0.08);
  // やぐら
  if (parts < 5) {
    const base = gy - s * 0.25;
    g.strokeStyle = '#d97706'; g.lineWidth = s * 0.06;
    const tx = cx + s * 1.3;
    g.beginPath(); g.moveTo(tx, base); g.lineTo(tx, base - s * 5.2); g.moveTo(tx + s * 0.5, base); g.lineTo(tx + s * 0.5, base - s * 5.2);
    for (let k = 0; k < 7; k++) { g.moveTo(tx, base - k * s * 0.75); g.lineTo(tx + s * 0.5, base - (k + 1) * s * 0.75); }
    g.stroke();
  }
  const base = gy - s * 0.25 - lift;
  const bw = s * 1.1;
  const seg = [ // [下, 上]
    [0, 1.1], [1.1, 2.2], [2.2, 3.3], [3.3, 3.9], [3.9, 5.2],
  ];
  // まだの パーツは うすい せんで
  for (let i = 0; i < 5; i++) {
    const done = i < parts;
    const [a, b] = seg[i];
    const y0 = base - a * s, y1 = base - b * s;
    g.globalAlpha = done ? 1 : 0.35;
    g.setLineDash(done ? [] : [s * 0.1, s * 0.08]);
    g.lineWidth = s * 0.05; g.strokeStyle = done ? '#334155' : '#fff';
    if (i === 0) { // エンジンと はね
      if (done && flame > 0) {
        const fl = s * (1 + flame * 2.5 + Math.random() * 0.5);
        const gr = g.createLinearGradient(0, y0, 0, y0 + fl);
        gr.addColorStop(0, '#fffbe0'); gr.addColorStop(0.4, '#ffb02e'); gr.addColorStop(1, 'rgba(255,60,0,0)');
        g.fillStyle = gr;
        g.beginPath(); g.moveTo(cx - bw * 0.35, y0); g.lineTo(cx + bw * 0.35, y0); g.lineTo(cx, y0 + fl); g.closePath(); g.fill();
      }
      g.fillStyle = done ? '#64748b' : 'transparent';
      g.beginPath(); g.moveTo(cx - bw * 0.3, y0 - s * 0.25); g.lineTo(cx + bw * 0.3, y0 - s * 0.25); g.lineTo(cx + bw * 0.4, y0); g.lineTo(cx - bw * 0.4, y0); g.closePath(); if (done) g.fill(); g.stroke();
      g.fillStyle = done ? '#ef4444' : 'transparent';
      for (const sx of [-1, 1]) {
        g.beginPath(); g.moveTo(cx + sx * bw / 2, y1 + s * 0.2); g.lineTo(cx + sx * bw * 1.0, y0 - s * 0.1); g.lineTo(cx + sx * bw / 2, y0 - s * 0.25); g.closePath(); if (done) g.fill(); g.stroke();
      }
      g.fillStyle = done ? '#e2e8f0' : 'transparent';
      g.beginPath(); g.rect(cx - bw / 2, y1, bw, y0 - s * 0.25 - y1); if (done) g.fill(); g.stroke();
    } else if (i === 4) { // さきっぽ
      g.fillStyle = done ? '#ef4444' : 'transparent';
      g.beginPath(); g.moveTo(cx - bw / 2, y0); g.quadraticCurveTo(cx - bw * 0.45, y1 + s * 0.4, cx, y1); g.quadraticCurveTo(cx + bw * 0.45, y1 + s * 0.4, cx + bw / 2, y0); g.closePath(); if (done) g.fill(); g.stroke();
    } else {
      g.fillStyle = done ? (i === 1 ? '#f8fafc' : '#e2e8f0') : 'transparent';
      g.beginPath(); g.rect(cx - bw / 2, y1, bw, y0 - y1); if (done) g.fill(); g.stroke();
      if (done && i === 1) { g.fillStyle = '#3b82f6'; g.fillRect(cx - bw / 2, y1 + (y0 - y1) * 0.4, bw, (y0 - y1) * 0.2); }
      if (done && i === 2) { g.fillStyle = '#334155'; g.font = `900 ${s * 0.32}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('★', cx, (y0 + y1) / 2); }
      if (i === 3) {
        g.fillStyle = done ? '#93c5fd' : 'transparent';
        g.beginPath(); g.arc(cx, (y0 + y1) / 2, s * 0.22, 0, Math.PI * 2); if (done) g.fill(); g.stroke();
      }
    }
    g.setLineDash([]); g.globalAlpha = 1;
  }
}

// そら（地上の はいけい）
export function drawSky(g, w, h, gy, t, up = 0) {
  const gr = g.createLinearGradient(0, 0, 0, Math.max(1, gy));
  const k = Math.min(1, up);
  gr.addColorStop(0, k > 0 ? mix('#5ec8ff', '#0b1030', k) : '#5ec8ff');
  gr.addColorStop(1, k > 0 ? mix('#c9f0ff', '#1b2a6b', k) : '#c9f0ff');
  g.fillStyle = gr; g.fillRect(0, 0, w, Math.max(0, gy));
  if (k > 0.3) {
    g.fillStyle = `rgba(255,255,255,${(k - 0.3) * 1.2})`;
    for (let i = 0; i < 60; i++) { const x = (hash(i, 1) % 1000) / 1000 * w, y = (hash(i, 2) % 1000) / 1000 * gy; g.fillRect(x, y, 2, 2); }
  }
  // くも
  g.fillStyle = `rgba(255,255,255,${0.85 * (1 - k)})`;
  for (let i = 0; i < 4; i++) {
    const cx = ((hash(i, 9) % 1000) / 1000 * w + t * 12 * (1 + i * 0.3)) % (w + 200) - 100;
    const cy = gy * (0.15 + 0.15 * i);
    for (const [dx, dy, r] of [[0, 0, 26], [28, 6, 20], [-26, 8, 18], [10, -12, 18]]) { g.beginPath(); g.arc(cx + dx, cy + dy, r, 0, Math.PI * 2); g.fill(); }
  }
}

function mix(a, b, k) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const c = [16, 8, 0].map(sh => Math.round(((pa >> sh) & 255) * (1 - k) + ((pb >> sh) & 255) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export { bandIndex, hash };
