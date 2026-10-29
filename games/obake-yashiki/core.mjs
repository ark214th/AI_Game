// オバケやしきの おかたづけ — ゲームの きまり（描画や 入力に よらない 部分）
// 単位は メートル。x は 右、y は 上、z は てまえ。プレイヤーは z = 4.5 から おくを 見て はじまる。

export const VOLS = 8;          // 1シリーズの 本の 数
export const BASE_CAP = 4;      // はじめに もてる 数

export const SECTIONS = [
  { name: 'うちゅう', icon: 'star', color: '#28386a' },
  { name: 'うみ', icon: 'fish', color: '#1d6672' },
  { name: 'どうぶつ', icon: 'paw', color: '#74461f' },
  { name: 'まほう', icon: 'moon', color: '#552a68' },
];

// 色は たなと かんけい ない（色だけで さがせないように）
const S = (sec, title, color, th, h, d) => ({ sec, title, color, th, h, d });
export const SERIES = [
  S(0, 'ほしぞら ずかん', '#1d3557', 0.085, 0.34, 0.25),
  S(0, 'ロケット はかせ', '#b8352a', 0.075, 0.30, 0.22),
  S(0, 'つきの うさぎ', '#d9b44a', 0.070, 0.29, 0.21),
  S(0, 'わくせい たんけん', '#2a8d80', 0.090, 0.35, 0.25),
  S(0, 'ながれぼしの よる', '#4b3b7a', 0.075, 0.31, 0.22),
  S(0, 'うちゅう ひこうし', '#d0d4dc', 0.080, 0.32, 0.23),
  S(1, 'くじらの たび', '#2b4a57', 0.080, 0.33, 0.24),
  S(1, 'さかな ずかん', '#d8673f', 0.090, 0.34, 0.25),
  S(1, 'たからじまの なぞ', '#8a5a2b', 0.075, 0.31, 0.22),
  S(1, 'うみの そこの まち', '#3b6fd0', 0.080, 0.30, 0.22),
  S(1, 'イルカと あそぼう', '#7cc4d8', 0.070, 0.29, 0.21),
  S(1, 'かいぞく せんちょう', '#2e2a28', 0.085, 0.34, 0.24),
  S(2, 'ねこの がっこう', '#e0954f', 0.070, 0.29, 0.21),
  S(2, 'もりの くまさん', '#6b4226', 0.080, 0.32, 0.23),
  S(2, 'ペンギン びより', '#26343d', 0.075, 0.30, 0.22),
  S(2, 'きょうりゅう ずかん', '#4f7a4a', 0.095, 0.36, 0.26),
  S(2, 'うさぎの パンやさん', '#e8a3a8', 0.070, 0.29, 0.21),
  S(2, 'ライオンの おうさま', '#c98a1e', 0.085, 0.33, 0.24),
  S(3, 'まほうつかいの でし', '#6a1e74', 0.085, 0.33, 0.24),
  S(3, 'ほうきで ゆうびん', '#a76f7d', 0.070, 0.29, 0.21),
  S(3, 'ドラゴンの たまご', '#8e1f24', 0.090, 0.35, 0.25),
  S(3, 'ふしぎな くすり', '#14684c', 0.075, 0.31, 0.22),
  S(3, 'おばけの おまつり', '#e07a2e', 0.080, 0.31, 0.23),
  S(3, 'まほうの ほうせき', '#2d5c8a', 0.075, 0.30, 0.22),
];
export const TOTAL = SERIES.length * VOLS;
export const PER_CASE = 6;                     // 1つの たなの れつの 数
export const rowOfSeries = s => s % PER_CASE;          // たなの 下から 何れつ目か
export const seriesAt = (sec, row) => sec * PER_CASE + row;

// まほうと もちものの パワーアップ（そろった れつの 数で ふえる）
export const UNLOCKS = [
  { rows: 1, key: 'yobiyose', name: 'よびよせ', desc: 'ちかくの 本が 手もとに とんでくる', cd: 4 },
  { rows: 3, key: 'bag6', name: 'おおきな かばん', desc: '本が 6さつ もてるように なった' },
  { rows: 6, key: 'michi', name: 'みちしるべ', desc: 'もっている 本の たなが ひかる', cd: 12, dur: 12 },
  { rows: 9, key: 'tondeke', name: 'とんでけ', desc: 'もっている 本が じぶんで たなへ とんでいく', cd: 8 },
  { rows: 12, key: 'bag8', name: 'まほうの かばん', desc: '本が 8さつ もてるように なった' },
  { rows: 15, key: 'tsumuji', name: 'つむじかぜ', desc: 'ゆかの 本が 10さつ いっきに たなへ', cd: 20 },
];

// ---------- へやの かたち ----------
export const ROOM = { x0: -8, x1: 8, z0: -10, z1: 6, h: 5.6 };
export const WALK = { x0: -7.25, x1: 7.25, z0: -9.25, z1: 5.2 };
export const START = { x: 0, z: 4.4, yaw: 0 };
export const EYE = 1.25;

export const CASE = { w: 1.2, d: 0.4, h: 2.78, rows: 6, slotW: 0.13 };
export const boardY = r => 0.06 + r * 0.44;            // たなの いたの まんなかの 高さ
export const boardTop = r => boardY(r) + 0.015;
export const slotX = v => (v - (VOLS - 1) / 2) * CASE.slotW;

export const TABLES = [
  { x: -3.3, z: -1.3, w: 2.0, d: 1.0 },
  { x: 3.3, z: -1.3, w: 2.0, d: 1.0 },
];

// 本だなの ならび。sec が 0 いじょうなら その たなは かたづける たな。
export function layout() {
  const cases = [];
  for (let i = 0; i < 13; i++) cases.push({ x: -7.2 + i * 1.2, z: ROOM.z0 + CASE.d / 2, rot: 0, sec: -1 });
  for (let i = 0; i < 11; i++) {
    cases.push({ x: ROOM.x0 + CASE.d / 2, z: -8.8 + i * 1.2, rot: Math.PI / 2, sec: -1 });
    cases.push({ x: ROOM.x1 - CASE.d / 2, z: -8.8 + i * 1.2, rot: -Math.PI / 2, sec: -1 });
  }
  for (const x of [-7.2, -6.0, -4.8, 4.8, 6.0, 7.2]) cases.push({ x, z: ROOM.z1 - CASE.d / 2, rot: Math.PI, sec: -1 });
  const mark = (pred, sec) => { cases.find(pred).sec = sec; };
  mark(c => c.rot === 0 && Math.abs(c.x + 2.4) < 0.01, 0);
  mark(c => c.rot === 0 && Math.abs(c.x - 2.4) < 0.01, 1);
  mark(c => c.rot > 1 && Math.abs(c.z + 1.6) < 0.01, 2);
  mark(c => c.rot < -1 && Math.abs(c.z + 1.6) < 0.01, 3);
  return cases;
}
export const CASES = layout();
export const sectionCase = sec => CASES.find(c => c.sec === sec);

// たなの 中の 位置（lx: 右、ly: 上、lz: まえ）を へやの 位置に
export function caseToWorld(c, lx, ly, lz) {
  const cs = Math.cos(c.rot), sn = Math.sin(c.rot);
  return { x: c.x + lx * cs + lz * sn, y: ly, z: c.z - lx * sn + lz * cs };
}
export const caseNormal = c => ({ x: Math.sin(c.rot), z: Math.cos(c.rot) });

// 本だなの まえの 立つ場所
export function approachPoint(c, dist = 0.95) {
  const n = caseNormal(c);
  return { x: c.x + n.x * (CASE.d / 2 + dist), z: c.z + n.z * (CASE.d / 2 + dist) };
}

// たなに しまった 本の 位置と むき
export function slotPose(s, v) {
  const ser = SERIES[s], c = sectionCase(ser.sec), r = rowOfSeries(s);
  const p = caseToWorld(c, slotX(v), boardTop(r) + ser.h / 2, CASE.d / 2 - 0.03 - ser.d / 2);
  return { ...p, yaw: c.rot };
}

// ぶつかる もの（へやの 中の 四角）
export function obstacles() {
  const out = CASES.map(c => {
    const side = Math.abs(Math.sin(c.rot)) > 0.5;
    const hw = (side ? CASE.d : CASE.w) / 2, hd = (side ? CASE.w : CASE.d) / 2;
    return { x0: c.x - hw, x1: c.x + hw, z0: c.z - hd, z1: c.z + hd };
  });
  // テーブルは まわりの いすも ふくめる
  for (const t of TABLES) out.push({ x0: t.x - t.w / 2 - 0.1, x1: t.x + t.w / 2 + 0.1, z0: t.z - t.d / 2 - 0.6, z1: t.z + t.d / 2 + 0.6 });
  return out;
}

// ---------- 乱数 ----------
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- ゲームの はじまり ----------
const PILE_SIZES = [22, 20, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7];

function placePiles(rng) {
  const obs = obstacles(), app = CASES.filter(c => c.sec >= 0).map(c => approachPoint(c));
  const piles = [];
  let guard = 0;
  while (piles.length < PILE_SIZES.length && guard++ < 5000) {
    const p = { x: -6.2 + rng() * 12.4, z: -8.3 + rng() * 11.4 };
    if (obs.some(o => p.x > o.x0 - 0.45 && p.x < o.x1 + 0.45 && p.z > o.z0 - 0.45 && p.z < o.z1 + 0.45)) continue;
    if (piles.some(q => Math.hypot(q.x - p.x, q.z - p.z) < 1.35)) continue;
    if (app.some(q => Math.hypot(q.x - p.x, q.z - p.z) < 0.9)) continue;
    if (Math.hypot(p.x - START.x, p.z - START.z) < 1.4) continue;
    const lean = rng() * Math.PI * 2;
    piles.push({ ...p, yaw: rng() * Math.PI, lx: Math.cos(lean), lz: Math.sin(lean) });
  }
  return piles;
}

export function createGame(seed = 1) {
  const rng = mulberry32(seed);
  const piles = placePiles(rng);
  const order = [];
  for (let s = 0; s < SERIES.length; s++) for (let v = 0; v < VOLS; v++) order.push({ s, v });
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const items = order.map((o, id) => ({ id, s: o.s, v: o.v, state: 'floor', pile: -1, k: 0, spill: false, jx: 0, jz: 0, yaw: 0, roll: 0 }));
  let n = 0;
  PILE_SIZES.forEach((size, p) => {
    let spills = 0;
    for (let k = 0; k < size && n < items.length; k++, n++) {
      // 山から すべりおちた 本は 山の まわりの ゆかに ちらばる
      const spill = size > 4 && rng() < 0.22;
      const a = rng() * Math.PI * 2 + spills * 1.9, r = 0.3 + rng() * 0.22;
      if (spill) spills++;
      Object.assign(items[n], {
        pile: p, k, spill,
        jx: spill ? Math.cos(a) * r : (rng() - 0.5) * 0.08,
        jz: spill ? Math.sin(a) * r : (rng() - 0.5) * 0.08,
        yaw: (rng() - 0.5) * (spill ? 3 : 1.1), roll: (rng() - 0.5) * 0.05,
      });
    }
  });
  return { seed, piles, items, hand: [], rows: SERIES.map(() => false), time: 0 };
}

// ---------- しらべる ----------
export const rowsDone = g => g.rows.filter(Boolean).length;
export const has = (g, key) => UNLOCKS.some(u => u.key === key && rowsDone(g) >= u.rows);
export const capacity = g => has(g, 'bag8') ? 8 : has(g, 'bag6') ? 6 : BASE_CAP;
export const leftCount = g => g.items.filter(i => i.state !== 'shelf').length;
export const isCleared = g => g.items.every(i => i.state === 'shelf');
export const pileItems = (g, p) => g.items.filter(i => i.state === 'floor' && i.pile === p).sort((a, b) => a.k - b.k);
export const nextUnlock = g => UNLOCKS.find(u => rowsDone(g) < u.rows) || null;

// ゆかの 本の 位置（山の 下から つみあげる）
export function floorPose(g, it) {
  const pile = g.piles[it.pile];
  let y = 0;
  let n = 0;
  if (!it.spill) for (const b of pileItems(g, it.pile)) { if (b === it) break; if (!b.spill) { y += SERIES[b.s].th; n++; } }
  // 高い 山は すこし かたむいて つみあがる
  const lean = it.spill ? 0 : n * n * 0.0004;
  return { x: pile.x + it.jx + pile.lx * lean, y: y + SERIES[it.s].th / 2, z: pile.z + it.jz + pile.lz * lean, yaw: pile.yaw + it.yaw, roll: it.roll };
}

// ちかい じゅんに ゆかの 本を n さつ
export function nearestFloor(g, x, z, n) {
  return g.items.filter(i => i.state === 'floor')
    .map(i => ({ i, d: Math.hypot(g.piles[i.pile].x - x, g.piles[i.pile].z - z) - i.k * 0.001 }))
    .sort((a, b) => a.d - b.d).slice(0, n).map(o => o.i);
}

// ---------- うごかす ----------
function restack(g, p) { pileItems(g, p).forEach((b, k) => { b.k = k; }); }

// ゆかの 本を 手に もつ
export function pick(g, id) {
  const it = g.items[id];
  if (!it || it.state !== 'floor') return { ok: false, why: 'gone' };
  if (g.hand.length >= capacity(g)) return { ok: false, why: 'full' };
  it.state = 'hand';
  g.hand.push(id);
  restack(g, it.pile);
  return { ok: true };
}

// あたらしく そろった れつを しらべる
function checkRows(g) {
  const done = [];
  SERIES.forEach((_, s) => {
    if (g.rows[s]) return;
    if (g.items.filter(i => i.s === s && i.state === 'shelf').length === VOLS) { g.rows[s] = true; done.push(s); }
  });
  return done;
}

// 手の 本の うち、この れつの 本を ぜんぶ しまう
export function shelveRow(g, s) {
  if (!g.hand.length) return { placed: [], why: 'empty', completed: [], unlocked: [] };
  const placed = g.hand.filter(id => g.items[id].s === s);
  if (!placed.length) {
    const near = g.hand.some(id => SERIES[g.items[id].s].sec === SERIES[s].sec);
    return { placed: [], why: near ? 'otherRow' : 'wrong', completed: [], unlocked: [] };
  }
  return finishPlace(g, placed);
}

// まほうで 本を そのまま たなへ（手の 本 でも ゆかの 本 でも）
export function shelveDirect(g, ids) {
  return finishPlace(g, ids.filter(id => g.items[id] && g.items[id].state !== 'shelf'));
}

function finishPlace(g, ids) {
  const before = rowsDone(g);
  const piles = new Set();
  for (const id of ids) {
    const it = g.items[id];
    if (it.state === 'floor') piles.add(it.pile);
    it.state = 'shelf';
  }
  g.hand = g.hand.filter(id => g.items[id].state === 'hand');
  piles.forEach(p => restack(g, p));
  const completed = checkRows(g);
  const after = rowsDone(g);
  const unlocked = UNLOCKS.filter(u => u.rows > before && u.rows <= after);
  return { placed: ids, completed, unlocked };
}

// ---------- ほぞん ----------
export function serialize(g) {
  return { v: 2, seed: g.seed, shelf: g.items.filter(i => i.state === 'shelf').map(i => i.id), time: Math.round(g.time) };
}
export function restore(data) {
  if (!data || data.v !== 2 || !Number.isFinite(data.seed)) return null;
  const g = createGame(data.seed);
  const ids = (data.shelf || []).filter(id => Number.isInteger(id) && g.items[id]);
  ids.forEach(id => { g.items[id].state = 'shelf'; });
  g.piles.forEach((_, p) => restack(g, p));
  checkRows(g);
  g.time = Number(data.time) || 0;
  return g;
}

// ---------- みちさがし（本の 山や テーブルを よけて あるく） ----------
export const BODY = 0.28;                       // プレイヤーの はば（半分）
const CELL = 0.2;
const GX = Math.round((WALK.x1 - WALK.x0) / CELL) + 1, GZ = Math.round((WALK.z1 - WALK.z0) / CELL) + 1;
const STATIC = obstacles();

export function pileCenters(g) {
  return g.piles.filter((_, p) => g.items.some(i => i.state === 'floor' && i.pile === p && !i.spill));
}
export function blocked(g, x, z, piles = pileCenters(g)) {
  if (x < WALK.x0 || x > WALK.x1 || z < WALK.z0 || z > WALK.z1) return true;
  for (const o of STATIC) if (x > o.x0 - BODY && x < o.x1 + BODY && z > o.z0 - BODY && z < o.z1 + BODY) return true;
  for (const p of piles) if (Math.hypot(x - p.x, z - p.z) < BODY + 0.3) return true;
  return false;
}
function clearLine(g, a, b, piles) {
  const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(d / 0.08);
  for (let i = 1; i <= n; i++) if (blocked(g, a.x + (b.x - a.x) * i / n, a.z + (b.z - a.z) * i / n, piles)) return false;
  return true;
}

// from から to までの とおりみち（まがりかどの 点の ならび）。 いけない ときは null
export function findPath(g, from, to) {
  const piles = pileCenters(g);
  const cx = x => Math.max(0, Math.min(GX - 1, Math.round((x - WALK.x0) / CELL)));
  const cz = z => Math.max(0, Math.min(GZ - 1, Math.round((z - WALK.z0) / CELL)));
  const px = i => WALK.x0 + i * CELL, pz = j => WALK.z0 + j * CELL;
  const free = new Uint8Array(GX * GZ);
  for (let j = 0; j < GZ; j++) for (let i = 0; i < GX; i++) free[j * GX + i] = blocked(g, px(i), pz(j), piles) ? 0 : 1;
  // スタートや ゴールが ふさがっていたら いちばん ちかい あいた マスへ
  const nearestFree = (i0, j0) => {
    if (free[j0 * GX + i0]) return [i0, j0];
    for (let r = 1; r < Math.max(GX, GZ); r++) {
      let best = null, bd = Infinity;
      for (let j = j0 - r; j <= j0 + r; j++) for (let i = i0 - r; i <= i0 + r; i++) {
        if (i < 0 || j < 0 || i >= GX || j >= GZ || !free[j * GX + i]) continue;
        const d = Math.hypot(i - i0, j - j0); if (d < bd) { bd = d; best = [i, j]; }
      }
      if (best) return best;
    }
    return null;
  };
  const s = nearestFree(cx(from.x), cz(from.z)), e = nearestFree(cx(to.x), cz(to.z));
  if (!s || !e) return null;
  const S = s[1] * GX + s[0], E = e[1] * GX + e[0];
  const gs = new Float32Array(GX * GZ).fill(Infinity), prev = new Int32Array(GX * GZ).fill(-1), done = new Uint8Array(GX * GZ);
  const open = [S]; gs[S] = 0;
  const h = k => Math.hypot(k % GX - e[0], Math.floor(k / GX) - e[1]);
  while (open.length) {
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (gs[open[k]] + h(open[k]) < gs[open[bi]] + h(open[bi])) bi = k;
    const cur = open.splice(bi, 1)[0];
    if (cur === E) break;
    if (done[cur]) continue;
    done[cur] = 1;
    const ci = cur % GX, cj = Math.floor(cur / GX);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = ci + di, nj = cj + dj;
      if (ni < 0 || nj < 0 || ni >= GX || nj >= GZ) continue;
      const nk = nj * GX + ni;
      if (!free[nk] || (di && dj && (!free[cj * GX + ni] || !free[nj * GX + ci]))) continue;
      const ng = gs[cur] + (di && dj ? Math.SQRT2 : 1);
      if (ng < gs[nk]) { gs[nk] = ng; prev[nk] = cur; open.push(nk); }
    }
  }
  if (S !== E && prev[E] < 0) return null;
  const cells = [];
  for (let k = E; k >= 0; k = k === S ? -1 : prev[k]) cells.unshift({ x: px(k % GX), z: pz(Math.floor(k / GX)) });
  const end = blocked(g, to.x, to.z, piles) ? cells[cells.length - 1] : { x: to.x, z: to.z };
  cells[cells.length - 1] = end;
  // みとおしの きく 点は とばして まっすぐ あるく
  const out = [];
  let a = { x: from.x, z: from.z }, i = 0;
  while (i < cells.length) {
    let j = cells.length - 1;
    while (j > i && !clearLine(g, a, cells[j], piles)) j--;
    out.push(cells[j]); a = cells[j]; i = j + 1;
  }
  return out;
}
