// ゲームの きまり（がめんに よらない ぶぶん。node --test で たしかめる）
import { BASES, CREAMS, TOPPINGS, CUSTOMERS, DRESSES, THEMES, UNLOCKS, KIND_TABLE, PERFECT_HEARTS, GOOD_HEARTS, ALBUM_MAX, MAX_DOLLOPS, MAX_TOPPINGS, NAME_MAX } from './data.mjs';

// ---------- おかしの かたち（0〜1 の しかくの なか） ----------
// add：たす かたち、sub：くりぬく かたち。クリームを ぬれる ところ・かざれる ところ
const AREAS = {
  cake: { add: [{ t: 'e', x: 0.5, y: 0.44, rx: 0.36, ry: 0.11 }, { t: 'r', x: 0.14, y: 0.44, w: 0.72, h: 0.36 }, { t: 'e', x: 0.5, y: 0.8, rx: 0.36, ry: 0.09 }], sub: [] },
  cupcake: { add: [{ t: 'e', x: 0.5, y: 0.47, rx: 0.33, ry: 0.23 }], sub: [] },
  donut: { add: [{ t: 'e', x: 0.5, y: 0.55, rx: 0.37, ry: 0.27 }], sub: [{ t: 'e', x: 0.5, y: 0.53, rx: 0.11, ry: 0.075 }] },
  pancake: { add: [{ t: 'e', x: 0.5, y: 0.4, rx: 0.37, ry: 0.12 }, { t: 'r', x: 0.13, y: 0.4, w: 0.74, h: 0.08 }, { t: 'e', x: 0.5, y: 0.48, rx: 0.37, ry: 0.06 }], sub: [] },
  parfait: { add: [{ t: 'e', x: 0.5, y: 0.33, rx: 0.3, ry: 0.17 }], sub: [] },
};
export const areaOf = base => AREAS[base] || AREAS.cake;

const inPrim = (p, x, y) => p.t === 'e'
  ? ((x - p.x) / p.rx) ** 2 + ((y - p.y) / p.ry) ** 2 <= 1
  : x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h;

export function inside(base, x, y) {
  const a = areaOf(base);
  return a.add.some(p => inPrim(p, x, y)) && !a.sub.some(p => inPrim(p, x, y));
}

// ---------- クリームを ぬった ひろさ ----------
export const GRID = 24;
export function newCoverage(base) {
  const cells = new Uint8Array(GRID * GRID);
  let total = 0;
  for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) {
    if (inside(base, (i + 0.5) / GRID, (j + 0.5) / GRID)) { cells[j * GRID + i] = 1; total++; }
  }
  return { base, cells, total, done: 0 };
}

// ぬった ところを しるす（ふえた マスの かず を かえす）
export function paint(cov, x, y, r) {
  let added = 0;
  const i0 = Math.max(0, Math.floor((x - r) * GRID)), i1 = Math.min(GRID - 1, Math.floor((x + r) * GRID));
  const j0 = Math.max(0, Math.floor((y - r) * GRID)), j1 = Math.min(GRID - 1, Math.floor((y + r) * GRID));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const k = j * GRID + i;
    if (cov.cells[k] !== 1) continue;
    const cx = (i + 0.5) / GRID, cy = (j + 0.5) / GRID;
    if ((cx - x) ** 2 + (cy - y) ** 2 <= r * r) { cov.cells[k] = 2; added++; }
  }
  cov.done += added;
  return added;
}
export const coverage = cov => (cov.total ? cov.done / cov.total : 0);

// ---------- おかし ----------
export const newSweet = (base = 'cake') => ({ base, frost: [], dollops: [], tops: [], magic: false });

export function addDollop(sw, d) {
  if (sw.dollops.length >= MAX_DOLLOPS || !inside(sw.base, d.x, d.y)) return false;
  sw.dollops.push({ x: round3(d.x), y: round3(d.y), c: d.c, k: d.k || 'swirl' });
  return true;
}
export function addTopping(sw, t) {
  if (sw.tops.length >= MAX_TOPPINGS || !inside(sw.base, t.x, t.y)) return false;
  sw.tops.push({ x: round3(t.x), y: round3(t.y), id: t.id, r: round3(t.r || 0) });
  return true;
}
const round3 = v => Math.round(v * 1000) / 1000;

// つかった クリームの いろ
export function creamsUsed(sw) {
  const s = new Set();
  for (const f of sw.frost) s.add(f.c);
  for (const d of sw.dollops) s.add(d.c);
  return s;
}

// ちゅうもんに あっているか（まちがえても おこられない。よろこびかたが かわるだけ）
export function judge(order, sw) {
  const baseOk = sw.base === order.base;
  const needOk = order.need.k === 'cream' ? creamsUsed(sw).has(order.need.id) : sw.tops.some(t => t.id === order.need.id);
  const fancy = sw.tops.length + sw.dollops.length >= 6;
  if (baseOk && needOk) return { level: 'perfect', hearts: PERFECT_HEARTS + (fancy ? 1 : 0), baseOk, needOk, fancy };
  return { level: 'good', hearts: GOOD_HEARTS + (fancy ? 1 : 0), baseOk, needOk, fancy };
}

// ---------- ちゅうもん ----------
export function orderText(order) {
  const adj = order.need.k === 'cream' ? CREAMS[order.need.id].adj : TOPPINGS[order.need.id].adj;
  return `${adj} ${BASES[order.base].name} ください！`;
}

const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length) % arr.length];

export function makeOrder(save, rnd = Math.random) {
  const un = unlockedSet(save.hearts);
  const custs = Object.keys(CUSTOMERS).filter(c => un.has('cust:' + c));
  let pool = custs.filter(c => c !== save.lastCust);
  if (!pool.length) pool = custs;
  // あたらしく きた おきゃくさんは さいしょに くる
  const fresh = pool.filter(c => !save.met.includes(c));
  const cust = fresh.length ? fresh[0] : pick(pool, rnd);
  const cu = CUSTOMERS[cust];
  const bases = Object.keys(BASES).filter(b => un.has('base:' + b));
  const base = un.has('base:' + cu.base) && rnd() < 0.6 ? cu.base : pick(bases, rnd);
  const tops = Object.keys(TOPPINGS).filter(t => un.has('top:' + t));
  const creams = Object.keys(CREAMS).filter(c => un.has('cream:' + c));
  let need;
  if (rnd() < 0.5) {
    const id = un.has('top:' + cu.top) && rnd() < 0.6 ? cu.top : pick(tops, rnd);
    need = { k: 'top', id };
  } else {
    const id = un.has('cream:' + cu.cream) && rnd() < 0.6 ? cu.cream : pick(creams, rnd);
    need = { k: 'cream', id };
  }
  return { cust, base, need };
}

// ---------- ふえる もの ----------
export function unlockedSet(hearts) {
  const s = new Set();
  for (const u of UNLOCKS) if (hearts >= u.at) u.items.forEach(i => s.add(i));
  return s;
}
export const unlockedOf = (hearts, kind) => [...unlockedSet(hearts)].filter(i => i.startsWith(kind + ':')).map(i => i.slice(kind.length + 1));

// ハートが ふえて あたらしく ふえた もの
export function newlyUnlocked(before, after) {
  const a = unlockedSet(before);
  return [...unlockedSet(after)].filter(i => !a.has(i));
}
export function nextUnlock(hearts) {
  const u = UNLOCKS.find(u => u.at > hearts);
  return u ? u.at : null;
}

// ---------- なまえ（ひらがな キーボード） ----------
const DAKU = { か: 'が', き: 'ぎ', く: 'ぐ', け: 'げ', こ: 'ご', さ: 'ざ', し: 'じ', す: 'ず', せ: 'ぜ', そ: 'ぞ', た: 'だ', ち: 'ぢ', つ: 'づ', て: 'で', と: 'ど', は: 'ば', ひ: 'び', ふ: 'ぶ', へ: 'べ', ほ: 'ぼ', う: 'ゔ' };
const HANDAKU = { は: 'ぱ', ひ: 'ぴ', ふ: 'ぷ', へ: 'ぺ', ほ: 'ぽ' };
const SMALL = { あ: 'ぁ', い: 'ぃ', う: 'ぅ', え: 'ぇ', お: 'ぉ', や: 'ゃ', ゆ: 'ゅ', よ: 'ょ', つ: 'っ', わ: 'ゎ' };
const invert = o => Object.fromEntries(Object.entries(o).map(([a, b]) => [b, a]));
const UNDAKU = invert(DAKU), UNHANDAKU = invert(HANDAKU), UNSMALL = invert(SMALL);

const toHira = ch => { const c = ch.charCodeAt(0); return c >= 0x30a1 && c <= 0x30f6 ? String.fromCharCode(c - 0x60) : ch; };
const toKata = ch => { const c = ch.charCodeAt(0); return c >= 0x3041 && c <= 0x3096 ? String.fromCharCode(c + 0x60) : ch; };
export const kata = s => [...s].map(toKata).join('');

// さいごの もじに ゛ ゜ ちいさく を つける（もういちど おすと もどる）
export function modifyLast(name, mod) {
  const chars = [...name];
  if (!chars.length) return name;
  const last = chars[chars.length - 1];
  const isK = last !== toHira(last);
  const h = toHira(last);
  let n = h;
  if (mod === 'daku') n = DAKU[h] || UNDAKU[h] || (UNHANDAKU[h] && DAKU[UNHANDAKU[h]]) || h;
  else if (mod === 'handaku') n = HANDAKU[h] || UNHANDAKU[h] || (UNDAKU[h] && HANDAKU[UNDAKU[h]]) || h;
  else if (mod === 'small') n = SMALL[h] || UNSMALL[h] || h;
  chars[chars.length - 1] = isK ? toKata(n) : n;
  return chars.join('');
}
export function typeChar(name, ch) {
  return [...name].length >= NAME_MAX ? name : name + ch;
}
export const backspace = name => [...name].slice(0, -1).join('');

// よびかた（「ちゃん」が 2かい つかないように）
export function callName(name) {
  const n = (name || '').trim();
  if (!n) return 'パティシエさん';
  if (/(ちゃん|チャン|くん|クン|さん|サン)$/.test(n)) return n;
  return n + 'ちゃん';
}

// ---------- ほぞん ----------
export const newSave = () => ({ v: 1, name: '', named: false, hearts: 0, served: 0, perfect: 0, met: [], lastCust: null, dress: 'pink', theme: 'ichigo', album: [], sound: true });

export function normalize(s) {
  const d = newSave();
  if (!s || typeof s !== 'object') return d;
  const o = { ...d, ...s };
  o.name = typeof o.name === 'string' ? [...o.name].slice(0, NAME_MAX).join('') : '';
  o.named = !!o.named;
  for (const k of ['hearts', 'served', 'perfect']) o[k] = Number.isFinite(o[k]) && o[k] >= 0 ? Math.floor(o[k]) : 0;
  o.met = Array.isArray(o.met) ? o.met.filter(c => CUSTOMERS[c]) : [];
  if (!CUSTOMERS[o.lastCust]) o.lastCust = null;
  const un = unlockedSet(o.hearts);
  if (!DRESSES[o.dress] || !un.has('dress:' + o.dress)) o.dress = 'pink';
  if (!THEMES[o.theme] || !un.has('theme:' + o.theme)) o.theme = 'ichigo';
  o.album = Array.isArray(o.album) ? o.album.filter(validEntry).slice(-ALBUM_MAX) : [];
  o.sound = o.sound !== false;
  return o;
}
function validEntry(e) {
  return e && e.sweet && BASES[e.sweet.base] && CUSTOMERS[e.cust]
    && Array.isArray(e.sweet.frost) && Array.isArray(e.sweet.dollops) && Array.isArray(e.sweet.tops);
}

// できた おかしを わたす
export function serve(save, order, sweet) {
  const res = judge(order, sweet);
  const before = save.hearts;
  save.hearts += res.hearts;
  save.served++;
  if (res.level === 'perfect') save.perfect++;
  if (!save.met.includes(order.cust)) save.met.push(order.cust);
  save.lastCust = order.cust;
  save.album.push({ cust: order.cust, level: res.level, sweet: JSON.parse(JSON.stringify(sweet)) });
  if (save.album.length > ALBUM_MAX) save.album.splice(0, save.album.length - ALBUM_MAX);
  return { ...res, unlocked: newlyUnlocked(before, save.hearts) };
}
