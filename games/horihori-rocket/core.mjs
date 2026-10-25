// ほりほり ロケット工場 の きまり（がめんや おとに かかわらない ところ）
// せかいは よこ W マス × たて H マス。y が 0 より 上は そら（いつも なにも ない）。

export const W = 30, H = 240, SKY = 7;
export const HOPPER = { x: 11, y: -1 };
export const HOME_X = 8.6;

// ---------- マスの しゅるい ----------
export const T = {
  AIR: 0, DIRT: 1, STONE: 2, HARD: 3, DEEP: 4, MAGMA: 5, CRYSTAL: 6, CORE: 7, BEDROCK: 8,
  COAL: 10, IRON: 11, SILVER: 12, GOLD: 13, RUBY: 14, DIAMOND: 15, RAINBOW: 16,
  FOSSIL: 20, TREASURE: 21,
};

export const ORES = {
  [T.COAL]: { name: '炭', value: 3, color: '#3a3a40', shine: '#8a8a96' },
  [T.IRON]: { name: '鉄', value: 7, color: '#c98a5a', shine: '#f2c49a' },
  [T.SILVER]: { name: '銀', value: 16, color: '#cfd8e6', shine: '#ffffff' },
  [T.GOLD]: { name: '金', value: 40, color: '#ffc928', shine: '#fff3a8' },
  [T.RUBY]: { name: 'ルビー', value: 90, color: '#ff3a5c', shine: '#ffb3c0' },
  [T.DIAMOND]: { name: 'ダイヤ', value: 200, color: '#5ee8ff', shine: '#e8fdff' },
  [T.RAINBOW]: { name: 'にじいろの 石', value: 480, color: '#c77dff', shine: '#ffd6ff' },
};

// ふかさごとの そう。lvl は ほるのに いる ドリルの つよさ
export const BANDS = [
  { from: 0, rock: T.DIRT, lvl: 1, ore: T.COAL, name: '土の そう', color: '#a8703f' },
  { from: 12, rock: T.STONE, lvl: 1, ore: T.IRON, name: '石の そう', color: '#8d8a86' },
  { from: 35, rock: T.HARD, lvl: 2, ore: T.SILVER, name: 'かたい 石の そう', color: '#6f7487' },
  { from: 65, rock: T.DEEP, lvl: 3, ore: T.GOLD, name: 'くらい 石の そう', color: '#4f4a66' },
  { from: 100, rock: T.MAGMA, lvl: 4, ore: T.RUBY, name: 'あつい 石の そう', color: '#7a3a34' },
  { from: 145, rock: T.CRYSTAL, lvl: 5, ore: T.DIAMOND, name: 'すいしょうの そう', color: '#3c4f7a' },
  { from: 195, rock: T.CORE, lvl: 6, ore: T.RAINBOW, name: 'ちきゅうの まんなか', color: '#5a2a5e' },
];

export function bandIndex(y) {
  let i = 0;
  for (let k = 0; k < BANDS.length; k++) if (y >= BANDS[k].from) i = k;
  return i;
}
export const bandAt = y => BANDS[bandIndex(y)];

// ロケットの パーツに いる たから
export const TREASURES = [
  { name: 'ふしぎな はぐるま', y: 28, color: '#ffb02e' },
  { name: 'ひかる ねんりょう', y: 58, color: '#7dff6a' },
  { name: 'ほしの かけら', y: 95, color: '#fff36a' },
  { name: 'そらいろの ガラス', y: 140, color: '#6ad8ff' },
  { name: 'ちきゅうの コア', y: 226, color: '#ff6ad5' },
];

export const FOSSILS = [
  { name: 'アンモナイト', from: 8, to: 60 },
  { name: 'サメの は', from: 15, to: 80 },
  { name: '三ようちゅう', from: 25, to: 100 },
  { name: 'きょうりゅうの ほね', from: 40, to: 130 },
  { name: 'きょうりゅうの たまご', from: 60, to: 150 },
  { name: 'マンモスの きば', from: 80, to: 170 },
  { name: 'ふしぎな 足あと', from: 110, to: 200 },
  { name: 'ドラゴンの ほね', from: 150, to: 236 },
];
export const fossilBonus = i => 60 * (i + 1) * (i + 1);

// ---------- おみせ ----------
export const UPGRADES = {
  drill: { name: 'ドリル', icon: '⛏️', vals: [1, 2, 3, 4, 5, 6], costs: [0, 80, 400, 1500, 5000, 15000], info: v => `かたさ ${v} まで ほれる` },
  bag: { name: 'バッグ', icon: '🎒', vals: [8, 15, 25, 40, 70, 120], costs: [0, 50, 250, 900, 3000, 9000], info: v => `${v}こ もてる` },
  tank: { name: 'でんち', icon: '🔋', vals: [50, 80, 130, 200, 300, 450], costs: [0, 60, 300, 1100, 3500, 10000], info: v => `${v}びょう もぐれる` },
  jet: { name: 'ジェット', icon: '🚀', vals: [5, 7, 9, 12, 16], costs: [0, 100, 500, 2000, 6000], info: v => `はやさ ${v}` },
};

export const ROOMS = [
  { id: 'workshop', name: '作業場', icon: '🔧', cost: 200, info: 'じどうドリルが おけるように なる' },
  { id: 'museum', name: '化石の へや', icon: '🦴', cost: 300, info: '見つけた 化石を かざって 見られる' },
  { id: 'tower', name: '見はり台', icon: '🔭', cost: 600, info: 'たからの ある ほうを やじるしで おしえて くれる' },
  { id: 'pad', name: 'ロケットきち', icon: '🛰️', cost: 1500, info: 'ロケットが つくれるように なる' },
  { id: 'factory', name: '工場', icon: '🏭', cost: 2500, info: 'こうせきが 1.5ばいの ねだんで 売れる' },
  { id: 'teleport', name: 'テレポーター', icon: '🌀', cost: 4000, info: '🏠ボタンで すぐに 地上へ もどれる' },
];

export const PARTS = [
  { name: 'エンジン', cost: 800 },
  { name: 'ねんりょうタンク', cost: 3000 },
  { name: 'ロケットの 体', cost: 8000 },
  { name: 'まど', cost: 20000 },
  { name: 'さきっぽ', cost: 50000 },
];

export const BELT_COST = 3;
export const DRILL_TIME = 5; // じどうドリルが 1こ ほる びょう
export const DRILL_BUF = 8;
export const drillCost = n => Math.round(120 * Math.pow(1.3, n) / 10) * 10;

// ---------- らんすう ----------
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- せかいを つくる ----------
export function genWorld(seed) {
  const R = rng(seed);
  const tiles = new Uint8Array(W * H);
  const fossilAt = new Map(); // "x,y" → 化石の ばんごう
  const treasureAt = new Map(); // "x,y" → たからの ばんごう
  const idx = (x, y) => y * W + x;
  for (let y = 0; y < H; y++) {
    const rock = bandAt(y).rock;
    for (let x = 0; x < W; x++) tiles[idx(x, y)] = rock;
  }
  const inBand = (x, y, b) => x >= 0 && x < W && y >= 0 && y < H - 1 && bandIndex(y) === b;
  // こうせきの すじ
  BANDS.forEach((b, bi) => {
    const to = bi + 1 < BANDS.length ? BANDS[bi + 1].from : H - 1;
    const area = W * (to - b.from);
    const veins = [[b.ore, area * 0.016], bi > 0 ? [BANDS[bi - 1].ore, area * 0.006] : null].filter(Boolean);
    for (const [ore, n] of veins) {
      for (let v = 0; v < n; v++) {
        let x = Math.floor(R() * W), y = b.from + Math.floor(R() * (to - b.from));
        const len = 2 + Math.floor(R() * 4);
        for (let s = 0; s < len; s++) {
          if (inBand(x, y, bi)) tiles[idx(x, y)] = ore;
          if (R() < 0.5) x += R() < 0.5 ? -1 : 1; else y += R() < 0.5 ? -1 : 1;
        }
      }
    }
  });
  // ほらあな（8マスより ふかい ところ）
  for (let c = 0; c < 26; c++) {
    const cy = 10 + Math.floor(R() * (H - 20)), cx = 2 + Math.floor(R() * (W - 4));
    const rx = 1 + R() * 2.5, ry = 0.8 + R() * 1.2;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      if (x < 0 || x >= W || y < 8 || y >= H - 1) continue;
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) tiles[idx(x, y)] = T.AIR;
    }
  }
  // 化石（それぞれ 3こ）
  FOSSILS.forEach((f, i) => {
    for (let k = 0; k < 3; k++) {
      const x = Math.floor(R() * W), y = f.from + Math.floor(R() * (f.to - f.from));
      tiles[idx(x, y)] = T.FOSSIL; fossilAt.set(`${x},${y}`, i);
    }
  });
  // たから
  TREASURES.forEach((t, i) => {
    const x = 3 + Math.floor(R() * (W - 6));
    tiles[idx(x, t.y)] = T.TREASURE; treasureAt.set(`${x},${t.y}`, i);
  });
  // いちばん 下は ほれない
  for (let x = 0; x < W; x++) tiles[idx(x, H - 1)] = T.BEDROCK;
  return { tiles, fossilAt, treasureAt };
}

export function tileAt(world, x, y) {
  if (y < 0) return T.AIR;
  if (x < 0 || x >= W || y >= H) return T.BEDROCK;
  return world.tiles[y * W + x];
}
export const solid = (world, x, y) => tileAt(world, x, y) !== T.AIR;

// ---------- ほる ----------
// { ok, time, why } を かえす。time は ほるのに かかる びょう
export function digInfo(world, x, y, power) {
  const t = tileAt(world, x, y);
  if (t === T.AIR) return { ok: false, why: 'air' };
  if (t === T.BEDROCK || y >= H - 1) return { ok: false, why: 'bedrock' };
  const bi = bandIndex(y), lvl = BANDS[bi].lvl;
  if (power < lvl) return { ok: false, why: 'hard', need: lvl };
  const extra = t === T.DIRT || t === BANDS[bi].rock ? 1 : 1.2;
  const time = 0.38 * (1 + 0.12 * bi) * extra / (1 + 0.55 * (power - lvl));
  return { ok: true, time };
}

// ほった マスから なにが 手に はいるか
export function dig(world, x, y) {
  const t = tileAt(world, x, y), key = `${x},${y}`;
  world.tiles[y * W + x] = T.AIR;
  if (ORES[t]) return { ore: t };
  if (t === T.FOSSIL) return { fossil: world.fossilAt.get(key) ?? 0 };
  if (t === T.TREASURE) return { treasure: world.treasureAt.get(key) ?? 0 };
  return {};
}

// ---------- お金 ----------
export const sellValue = (ore, s) => Math.round(ORES[ore].value * (s.rooms.factory ? 1.5 : 1));
export const upVal = (s, k) => UPGRADES[k].vals[s.up[k]];
export const upNextCost = (s, k) => UPGRADES[k].costs[s.up[k] + 1];
export const bagCount = s => Object.values(s.bag).reduce((a, b) => a + b, 0);

export function buyUpgrade(s, k) {
  const c = upNextCost(s, k);
  if (c === undefined || s.money < c) return false;
  s.money -= c; s.up[k]++;
  return true;
}
export function buyRoom(s, id) {
  const r = ROOMS.find(r => r.id === id);
  if (!r || s.rooms[id] || s.money < r.cost) return false;
  s.money -= r.cost; s.rooms[id] = true;
  return true;
}
// つぎに つくる パーツが つくれるか
export function partState(s) {
  const i = s.parts;
  if (i >= PARTS.length) return { i, done: true };
  if (!s.rooms.pad) return { i, why: 'pad' };
  if (!s.treasures[i]) return { i, why: 'treasure' };
  if (s.money < PARTS[i].cost) return { i, why: 'money' };
  return { i, ok: true };
}
export function buyPart(s) {
  const p = partState(s);
  if (!p.ok) return false;
  s.money -= PARTS[p.i].cost; s.parts++;
  return true;
}

// ---------- きかい（ベルトと じどうドリル） ----------
export const mkey = (x, y) => `${x},${y}`;
export const unkey = k => k.split(',').map(Number);

export function canPlace(world, s, kind, x, y) {
  if (x < 0 || x >= W) return false;
  const k = mkey(x, y);
  if (s.machines[k] || (x === HOPPER.x && y === HOPPER.y)) return false;
  if (kind === 'belt') {
    if (y === -1) return true;
    return y >= 0 && y < H - 1 && tileAt(world, x, y) === T.AIR;
  }
  if (kind === 'drill') {
    return !!s.rooms.workshop && y >= 0 && y < H - 1 && tileAt(world, x, y) === T.AIR && solid(world, x, y + 1);
  }
  return false;
}

export function placeCost(s, kind) {
  if (kind === 'belt') return BELT_COST;
  return drillCost(Object.values(s.machines).filter(m => m.k === 'drill').length);
}

export function place(world, s, kind, x, y) {
  if (!canPlace(world, s, kind, x, y)) return false;
  const c = placeCost(s, kind);
  if (s.money < c) return false;
  s.money -= c;
  s.machines[mkey(x, y)] = kind === 'belt' ? { k: 'belt', paid: c } : { k: 'drill', paid: c, t: 0, buf: 0 };
  return true;
}

// こわすと はらった お金は ぜんぶ もどる。ためていた こうせきも バッグの かわりに お金に なる
export function removeMachine(s, x, y) {
  const k = mkey(x, y), m = s.machines[k];
  if (!m) return false;
  s.money += m.paid;
  if (m.k === 'drill' && m.buf) s.money += m.buf * sellValue(m.ore || bandAt(y).ore, s);
  delete s.machines[k];
  return true;
}

// ホッパーから ベルトを たどって、どの ベルトが つぎに どこへ はこぶかを きめる
export function computeFlow(s) {
  const flow = {};
  const hk = mkey(HOPPER.x, HOPPER.y);
  const q = [[HOPPER.x, HOPPER.y]];
  const seen = new Set([hk]);
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
      const nx = x + dx, ny = y + dy, nk = mkey(nx, ny);
      if (seen.has(nk)) continue;
      const m = s.machines[nk];
      if (!m || m.k !== 'belt') continue;
      seen.add(nk); flow[nk] = mkey(x, y);
      q.push([nx, ny]);
    }
  }
  return flow;
}

// じどうドリルの となりで ホッパーに つながっている ベルト
export function drillOutlet(flow, x, y) {
  for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
    const k = mkey(x + dx, y + dy);
    if (flow[k]) return k;
  }
  if (Math.abs(x - HOPPER.x) + Math.abs(y - HOPPER.y) === 1) return mkey(HOPPER.x, HOPPER.y);
  return null;
}

// じどうドリルを すすめる。でてきた こうせきを [{from, ore}] で かえす
export function tickDrills(s, flow, dt) {
  const out = [];
  for (const [k, m] of Object.entries(s.machines)) {
    if (m.k !== 'drill') continue;
    const [x, y] = unkey(k);
    m.ore = bandAt(y).ore;
    m.t += dt;
    while (m.t >= DRILL_TIME) {
      m.t -= DRILL_TIME;
      if (m.buf < DRILL_BUF) m.buf++;
    }
    const outlet = drillOutlet(flow, x, y);
    if (outlet && m.buf > 0) { m.buf--; out.push({ from: k, to: outlet, ore: m.ore }); }
  }
  return out;
}

// ---------- やること ----------
export function goal(s) {
  if (s.stats.dug < 3) return { text: '▼ボタンで 地面を ほって みよう', n: 0 };
  if (s.stats.earned <= 0) return { text: 'こうせきを ホッパーに 入れて 売ろう（上に もどろう）', n: 1 };
  if (s.up.drill + s.up.bag + s.up.tank + s.up.jet === 0) return { text: '🛒おみせで どうぐを 強く しよう', n: 2 };
  if (!s.rooms.workshop) return { text: '🛒おみせの「きち」で 作業場を たてよう', n: 3 };
  if (s.stats.auto <= 0) return { text: '🔧で じどうドリルを おいて、ベルトで ホッパーと つなごう', n: 4 };
  if (!s.rooms.pad) return { text: '🛒おみせの「きち」で ロケットきちを たてよう', n: 5 };
  const p = partState(s);
  if (p.done) return s.cleared ? { text: 'クリア！ 化石を ぜんぶ あつめられるかな？', n: 99 } : { text: '🛒おみせの「ロケット」で はっしゃ しよう！', n: 98 };
  const tr = TREASURES[p.i];
  if (p.why === 'treasure') return { text: `たから「${tr.name}」を さがそう（ふかさ ${tr.y}m）`, n: 6 + p.i * 2, treasure: p.i };
  return { text: `ロケットの「${PARTS[p.i].name}」を つくろう（${PARTS[p.i].cost}えん）`, n: 7 + p.i * 2 };
}

// ---------- ほぞん ----------
export function newSave(seed = Math.floor(Math.random() * 1e9)) {
  return {
    v: 1, seed, money: 0,
    up: { drill: 0, bag: 0, tank: 0, jet: 0 },
    rooms: {}, parts: 0, cleared: false,
    bag: {}, treasures: TREASURES.map(() => false), fossils: FOSSILS.map(() => 0),
    machines: {}, dug: '', px: HOME_X, py: -1.8,
    stats: { dug: 0, earned: 0, auto: 0, deepest: 0 },
    sound: true,
  };
}

// ほった ところを ビットで ちいさく する
export function encodeDug(world, base) {
  const bytes = new Uint8Array(Math.ceil(W * H / 8));
  for (let i = 0; i < W * H; i++) if (world.tiles[i] === T.AIR && base.tiles[i] !== T.AIR) bytes[i >> 3] |= 1 << (i & 7);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return typeof btoa === 'function' ? btoa(str) : Buffer.from(str, 'binary').toString('base64');
}
export function applyDug(world, b64) {
  if (!b64) return;
  const str = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  for (let i = 0; i < W * H; i++) if (str.charCodeAt(i >> 3) & (1 << (i & 7))) world.tiles[i] = T.AIR;
}

export function normalize(raw) {
  const s = newSave(raw && Number.isFinite(raw.seed) ? raw.seed : undefined);
  if (!raw || raw.v !== 1) return s;
  const num = (v, d) => (Number.isFinite(v) ? v : d);
  s.money = Math.max(0, num(raw.money, 0));
  for (const k of Object.keys(s.up)) s.up[k] = Math.min(UPGRADES[k].vals.length - 1, Math.max(0, num(raw.up?.[k], 0) | 0));
  for (const r of ROOMS) if (raw.rooms?.[r.id]) s.rooms[r.id] = true;
  s.parts = Math.min(PARTS.length, Math.max(0, num(raw.parts, 0) | 0));
  s.cleared = !!raw.cleared;
  for (const [k, v] of Object.entries(raw.bag || {})) if (ORES[k] && v > 0) s.bag[k] = v | 0;
  s.treasures = TREASURES.map((_, i) => !!raw.treasures?.[i]);
  s.fossils = FOSSILS.map((_, i) => Math.max(0, num(raw.fossils?.[i], 0) | 0));
  for (const [k, m] of Object.entries(raw.machines || {})) {
    if (!m || (m.k !== 'belt' && m.k !== 'drill')) continue;
    s.machines[k] = m.k === 'belt' ? { k: 'belt', paid: num(m.paid, BELT_COST) } : { k: 'drill', paid: num(m.paid, 120), t: 0, buf: Math.min(DRILL_BUF, num(m.buf, 0)) };
  }
  s.dug = typeof raw.dug === 'string' ? raw.dug : '';
  s.px = num(raw.px, HOME_X); s.py = num(raw.py, -1.8);
  for (const k of Object.keys(s.stats)) s.stats[k] = num(raw.stats?.[k], 0);
  s.sound = raw.sound !== false;
  return s;
}
