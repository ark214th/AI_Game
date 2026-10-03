// 16x16 の ドット絵を コードで かく（画像ファイルは 使わない）。
import {TILE_NAMES, ATLAS_SIZE, ITEMS, ITEM} from './blocks.mjs';
import {mulberry32} from './world.mjs';
import {ICONS} from './icons.mjs';

const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const clamp = v => Math.max(0, Math.min(255, Math.round(v)));

class Pix {
  constructor(rnd) { this.d = new Uint8ClampedArray(16 * 16 * 4); this.rnd = rnd; }
  set(x, y, c, a = 255, f = 1) {
    if (x < 0 || y < 0 || x > 15 || y > 15) return;
    const rgb = typeof c === 'string' ? hex(c) : c, i = (y * 16 + x) * 4;
    this.d[i] = clamp(rgb[0] * f); this.d[i + 1] = clamp(rgb[1] * f); this.d[i + 2] = clamp(rgb[2] * f); this.d[i + 3] = a;
  }
  get(x, y) { const i = (y * 16 + x) * 4; return [this.d[i], this.d[i + 1], this.d[i + 2]]; }
  mul(x, y, f) { const c = this.get(x, y); this.set(x, y, c, this.d[(y * 16 + x) * 4 + 3], f); }
  noise(c, v = 0.1) { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) this.set(x, y, c, 255, 1 + (this.rnd() * 2 - 1) * v); }
  rect(x0, y0, w, h, c, f = 1) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, c, 255, f); }
  bevel(light = 1.25, dark = 0.72) {
    for (let k = 0; k < 16; k++) { this.mul(k, 0, light); this.mul(0, k, light); this.mul(k, 15, dark); this.mul(15, k, dark); }
  }
}

const PAINT = {
  grass_top(p) { p.noise('#6aa83b', 0.13); for (let n = 0; n < 18; n++) p.mul(p.rnd() * 16 | 0, p.rnd() * 16 | 0, 0.82); },
  grass_side(p) {
    PAINT.dirt(p);
    for (let x = 0; x < 16; x++) {
      const h = 2 + (p.rnd() < 0.5 ? 1 : 0) + (p.rnd() < 0.25 ? 1 : 0);
      for (let y = 0; y < h; y++) p.set(x, y, '#6aa83b', 255, 1 + (p.rnd() - 0.5) * 0.2);
    }
  },
  dirt(p) { p.noise('#8a5f3a', 0.14); for (let n = 0; n < 14; n++) p.mul(p.rnd() * 16 | 0, p.rnd() * 16 | 0, p.rnd() < 0.5 ? 0.75 : 1.2); },
  stone(p) { p.noise('#8d8d8d', 0.08); for (let n = 0; n < 7; n++) { const x = p.rnd() * 14 | 0, y = p.rnd() * 16 | 0; p.mul(x, y, 0.78); p.mul(x + 1, y, 0.82); } },
  cobble(p) {
    const pts = Array.from({length: 10}, () => [p.rnd() * 16, p.rnd() * 16, 0.85 + p.rnd() * 0.35]);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      let a = Infinity, b = Infinity, ai = 0;
      for (let i = 0; i < pts.length; i++) for (const ox of [-16, 0, 16]) for (const oy of [-16, 0, 16]) {
        const d = Math.hypot(x - pts[i][0] - ox, y - pts[i][1] - oy);
        if (d < a) { b = a; a = d; ai = i; } else if (d < b) b = d;
      }
      p.set(x, y, '#8a8a8a', 255, b - a < 1.2 ? 0.55 : pts[ai][2] * (1 + (p.rnd() - 0.5) * 0.1));
    }
  },
  planks(p, base = '#b48a52') {
    p.noise(base, 0.06);
    for (let row = 0; row < 4; row++) {
      const seam = (p.rnd() * 12 | 0) + 2, f = 0.94 + p.rnd() * 0.12;
      for (let y = row * 4; y < row * 4 + 4; y++) for (let x = 0; x < 16; x++) p.mul(x, y, f);
      for (let x = 0; x < 16; x++) p.mul(x, row * 4 + 3, 0.72);
      for (let y = row * 4; y < row * 4 + 3; y++) p.mul(seam, y, 0.72);
      for (let n = 0; n < 3; n++) p.mul(p.rnd() * 16 | 0, row * 4 + (p.rnd() * 3 | 0), 0.86);
    }
  },
  planks_dark(p) { PAINT.planks(p, '#6b4a2b'); },
  planks_birch(p) { PAINT.planks(p, '#d8c690'); },
  log_side(p) {
    p.noise('#6e5232', 0.08);
    for (let x = 0; x < 16; x++) { const f = x % 4 === 0 ? 0.7 : x % 4 === 2 ? 1.1 : 1; for (let y = 0; y < 16; y++) p.mul(x, y, f * (1 + (p.rnd() - 0.5) * 0.1)); }
  },
  log_top(p) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const r = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
      if (r > 6.5) p.set(x, y, '#6e5232', 255, 0.9 + p.rnd() * 0.15);
      else p.set(x, y, (Math.round(r) % 2) ? '#a8824c' : '#c49a5e', 255, 1 + (p.rnd() - 0.5) * 0.08);
    }
  },
  stone_bricks(p) {
    p.noise('#8a8a8a', 0.06);
    for (let row = 0; row < 2; row++) {
      const off = row ? 4 : 0;
      for (let x = 0; x < 16; x++) { p.set(x, row * 8 + 7, '#5a5a5a'); p.mul(x, row * 8, 1.15); }
      for (let y = row * 8; y < row * 8 + 7; y++) { p.set((off + 8) % 16, y, '#5a5a5a'); p.mul((off + 9) % 16, y, 1.12); p.set(off, y, '#5a5a5a'); p.mul((off + 1) % 16, y, 1.12); }
    }
  },
  bricks(p) {
    p.noise('#a5563f', 0.1);
    for (let row = 0; row < 4; row++) {
      const off = row % 2 ? 4 : 0;
      for (let x = 0; x < 16; x++) p.set(x, row * 4 + 3, '#c8beb0', 255, 0.95 + p.rnd() * 0.1);
      for (let y = row * 4; y < row * 4 + 3; y++) { p.set(off, y, '#c8beb0'); p.set((off + 8) % 16, y, '#c8beb0'); }
    }
  },
  glass(p) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const edge = x === 0 || y === 0 || x === 15 || y === 15;
      if (edge) p.set(x, y, '#dff4fb', 255);
      else p.set(x, y, '#ffffff', 0);
    }
    for (const [x, y] of [[3, 4], [4, 3], [5, 2], [4, 5], [10, 11], [11, 10], [12, 9], [3, 12]]) p.set(x, y, '#ffffff', 255);
  },
  sand(p) { p.noise('#dccf94', 0.07); for (let n = 0; n < 12; n++) p.mul(p.rnd() * 16 | 0, p.rnd() * 16 | 0, 0.88); },
  plaster(p) { p.noise('#eeeae0', 0.035); },
  roof_red(p, base = '#b8442f') {
    p.noise(base, 0.07);
    for (let row = 0; row < 4; row++) {
      const off = row % 2 ? 2 : 0;
      for (let x = 0; x < 16; x++) { p.mul(x, row * 4 + 3, 0.62); p.mul(x, row * 4, 1.15); }
      for (let x = off; x < 16; x += 4) for (let y = row * 4; y < row * 4 + 3; y++) p.mul(x, y, 0.75);
    }
  },
  roof_blue(p) { PAINT.roof_red(p, '#3b5fa8'); },
  leaves(p) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (p.rnd() < 0.16) p.set(x, y, '#000000', 0);
      else p.set(x, y, '#3f8a2c', 255, 0.75 + p.rnd() * 0.5);
    }
  },
  path_top(p) { p.noise('#a08a5a', 0.16); for (let n = 0; n < 20; n++) { const x = p.rnd() * 15 | 0, y = p.rnd() * 15 | 0; p.set(x, y, '#c8b88a'); p.set(x + 1, y + 1, '#6e5f3e'); } },
  path_side(p) { PAINT.dirt(p); for (let x = 0; x < 16; x++) for (let y = 0; y < 2; y++) p.set(x, y, '#a08a5a', 255, 1 + (p.rnd() - 0.5) * 0.2); },
  bookshelf(p) {
    PAINT.planks(p);
    const cols = ['#b83a3a', '#3a5ab8', '#3a9a4a', '#d8b03a', '#7a3ab8', '#e0e0d0', '#8a5a30'];
    for (const y0 of [1, 9]) {
      for (let x = 1; x < 15;) {
        const w = 1 + (p.rnd() < 0.4 ? 1 : 0), h = 5 + (p.rnd() < 0.5 ? 1 : 0), c = cols[p.rnd() * cols.length | 0];
        for (let k = 0; k < w && x < 15; k++, x++) for (let y = y0 + 6 - h; y < y0 + 6; y++) p.set(x, y, c, 255, k === 0 ? 1 : 0.85);
        if (p.rnd() < 0.2) x++;
      }
    }
  },
  glow(p) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const v = Math.sin(x * 1.3 + p.rnd()) + Math.cos(y * 1.1 + p.rnd());
      p.set(x, y, v > 0.9 ? '#fff6c8' : v > -0.6 ? '#ffd96a' : '#d89a30');
    }
  },
  gold(p) { p.noise('#f5d442', 0.05); p.bevel(1.2, 0.75); for (let k = 3; k < 12; k++) p.mul(k, 14 - k, 1.15); },
  diamond(p) { p.noise('#4ee6dc', 0.06); p.bevel(1.25, 0.7); for (const [x, y] of [[4, 4], [10, 7], [6, 11], [12, 3]]) { p.set(x, y, '#ffffff'); p.set(x + 1, y, '#c8fff9'); } },
  emerald(p) { p.noise('#2fcf6a', 0.06); p.bevel(1.25, 0.7); for (let k = 0; k < 6; k++) { p.mul(5 + k, 5, 1.2); p.mul(5, 5 + k, 1.2); } },
  barrel_side(p) {
    p.noise('#8a6038', 0.06);
    for (let x = 0; x < 16; x += 4) for (let y = 0; y < 16; y++) p.mul(x, y, 0.72);
    for (const y of [2, 3, 12, 13]) for (let x = 0; x < 16; x++) p.set(x, y, '#3a3a40', 255, y % 2 ? 0.85 : 1.1);
  },
  barrel_top(p) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const edge = x < 2 || y < 2 || x > 13 || y > 13;
      p.set(x, y, edge ? '#3a3a40' : '#a8784a', 255, 0.92 + p.rnd() * 0.14);
    }
    for (let x = 2; x < 14; x++) { p.mul(x, 5, 0.75); p.mul(x, 10, 0.75); }
  },
  iron(p) { p.noise('#d2d2d6', 0.035); p.bevel(1.12, 0.78); },
  dark(p) { p.noise('#2a2a30', 0.08); },
  screen(p) {
    p.noise('#22303a', 0.05);
    for (let y = 2; y < 14; y++) for (let x = 2; x < 14; x++) p.set(x, y, '#1e5a3a');
    for (const [x, y] of [[4, 5], [5, 5], [4, 7], [5, 9], [4, 9], [8, 5], [9, 5], [10, 5], [9, 7], [9, 9], [11, 9], [12, 9]]) p.set(x, y, '#7cff9c');
  },
  flower_red(p) { flower(p, '#e03a3a', '#ffd040'); },
  flower_yellow(p) { flower(p, '#f6d02a', '#ff8a20'); },
  flower_blue(p) { flower(p, '#4a6ae8', '#ffffff'); },
  pot(p) { p.noise('#b8643a', 0.06); for (let x = 0; x < 16; x++) { p.mul(x, 0, 1.2); p.mul(x, 1, 1.2); p.mul(x, 4, 0.8); } },
  lantern(p) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const frame = x < 2 || x > 13 || y < 2 || y > 13 || x === 7 || x === 8;
      const r = Math.hypot(x - 7.5, y - 7.5);
      p.set(x, y, frame ? '#2a2a30' : r < 4 ? '#fff4c0' : '#ffc84a');
    }
  },
  star(p) {
    p.noise('#2b2f7a', 0.06);
    const S = ['.......Y........', '......YYY.......', '......YWY.......', 'YYYYYYWWWYYYYYY.', '.YYYYWWWWWYYYY..', '..YYYWWWWWYYY...', '...YYWWWWWYY....', '...YYYYWYYYY....', '..YYYYY.YYYYY...', '..YYY.....YYY...', '.YY.........YY..'];
    S.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') p.set(x, y + 3, ch === 'W' ? '#fffbe0' : '#ffd84a'); }));
  },
  crystal(p) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const f = ((x + y) % 6 < 2 ? 1.25 : 1) * ((x - y + 16) % 7 < 1 ? 0.8 : 1);
      p.set(x, y, '#b98aff', 255, f * (0.95 + p.rnd() * 0.1));
    }
    p.bevel(1.2, 0.75);
  },
  bedrock(p) { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, p.rnd() < 0.3 ? '#1e1e1e' : p.rnd() < 0.5 ? '#6a6a6a' : '#444444'); },
  quartz(p) { p.noise('#f2efe8', 0.02); p.bevel(1.03, 0.9); },
  obsidian(p) { p.noise('#22182e', 0.12); for (let n = 0; n < 8; n++) p.set(p.rnd() * 16 | 0, p.rnd() * 16 | 0, '#5a3a8a'); },
  tile_check(p) { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, ((x >> 3) + (y >> 3)) % 2 ? '#2e2e36' : '#f0efe8', 255, 1 + (p.rnd() - 0.5) * 0.05); },
};
const WOOLS = {
  wool_red: '#c53a32', wool_blue: '#3550b0', wool_yellow: '#f0c829', wool_green: '#4f9a2e', wool_white: '#ececec',
  wool_black: '#262630', wool_pink: '#ee8fb0', wool_orange: '#ec8a2a', wool_cyan: '#55c2dc', wool_purple: '#8445b5', wool_brown: '#7a5030',
};
for (const [k, c] of Object.entries(WOOLS)) PAINT[k] = p => { p.noise(c, 0.05); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + y * 3) % 5 === 0) p.mul(x, y, 0.9); };

function flower(p, petal, center) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, '#000000', 0);
  for (let y = 7; y < 16; y++) p.set(7, y, '#3f8a2c');
  for (const [x, y] of [[6, 11], [5, 10], [8, 13], [9, 12]]) p.set(x, y, '#4fa83a');
  for (const [x, y] of [[7, 3], [6, 4], [8, 4], [5, 5], [9, 5], [6, 6], [8, 6], [7, 7], [6, 5], [8, 5], [7, 4], [7, 6]]) p.set(x, y, petal);
  p.set(7, 5, center);
}

export function makeAtlas(doc = document) {
  const size = ATLAS_SIZE * 16;
  const cv = doc.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  TILE_NAMES.forEach((name, t) => {
    const p = new Pix(mulberry32(1000 + t * 77));
    (PAINT[name] || (q => q.noise('#ff00ff', 0)))(p);
    const img = new ImageData(p.d, 16, 16);
    ctx.putImageData(img, (t % ATLAS_SIZE) * 16, Math.floor(t / ATLAS_SIZE) * 16);
  });
  return cv;
}

// ---- 品物の アイコン ----
const iconCache = new Map(), urlCache = new Map();
export function itemCanvas(key, doc = document) {
  if (iconCache.has(key)) return iconCache.get(key);
  const it = ITEM[key];
  const ic = ICONS[it.icon];
  const pal = {...ic.pal, ...(it.pal || {})};
  const cv = doc.createElement('canvas');
  cv.width = cv.height = 16;
  const ctx = cv.getContext('2d');
  ic.map.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    ctx.fillStyle = pal[ch] || '#ff00ff';
    ctx.fillRect(x, y, 1, 1);
  }));
  iconCache.set(key, cv);
  return cv;
}
export function itemURL(key, size = 64) {
  const k = key + '@' + size;
  if (urlCache.has(k)) return urlCache.get(k);
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(itemCanvas(key), 0, 0, size, size);
  const url = cv.toDataURL();
  urlCache.set(k, url);
  return url;
}
export const allItemKeys = () => ITEMS.map(i => i.key);

// ---- お客さんの 顔 ----
export function faceCanvas(look, doc = document) {
  const cv = doc.createElement('canvas');
  cv.width = cv.height = 16;
  const ctx = cv.getContext('2d');
  const f = (c, x, y, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  f(look.skin, 0, 0, 16, 16);
  if (look.hair && look.hat !== 'helmet') f(look.hair, 0, 0, 16, 3);
  // 目
  f('#ffffff', 3, 7, 3, 2); f('#ffffff', 10, 7, 3, 2);
  f('#2a2a3a', 4, 7, 2, 2); f('#2a2a3a', 10, 7, 2, 2);
  // まゆ
  f(look.hair || '#4a3020', 3, 5, 3, 1); f(look.hair || '#4a3020', 10, 5, 3, 1);
  // 口
  f('#a0524a', 6, 12, 4, 1);
  f('#e89a8a', 2, 10, 2, 1); f('#e89a8a', 12, 10, 2, 1);
  if (look.beard) { f(look.beard, 2, 11, 12, 5); f('#a0524a', 6, 12, 4, 1); }
  return cv;
}
