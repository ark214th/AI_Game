// オバケやしきの おかたづけ — ゲームの きまり（描画や 入力に よらない 部分）

export const W = 1000, H = 750;
export const PER = 5;   // 1シリーズの 本の 数
export const CAP = 5;   // かごに 入る 数
export const COIN_BOOK = 10, COIN_ROW = 50, COIN_SCARE = 20;

export const SERIES = [
  { color: '#e2574c', dark: '#9e3129', mark: 'star' },
  { color: '#3f8fd9', dark: '#245f9a', mark: 'circle' },
  { color: '#4cb36a', dark: '#2c7a43', mark: 'tri' },
  { color: '#f2c230', dark: '#b08414', mark: 'square' },
];

// たなの 行（1行 = 1シリーズ、5スロット）
export const ROWS = [
  { s: 0, x: 130, y: 74,  w: 300, h: 96 },
  { s: 1, x: 130, y: 184, w: 300, h: 96 },
  { s: 2, x: 570, y: 74,  w: 300, h: 96 },
  { s: 3, x: 570, y: 184, w: 300, h: 96 },
];
export const BASKET = { x: 500, y: 688 };

export const slotX = (row, n) => row.x + 30 + (n - 1) * 60;
export const rowOf = s => ROWS.find(r => r.s === s);

const between = (rng, a, b) => a + rng() * (b - a);
export function floorSpot(rng, minY = 350, maxY = 600) {
  return { x: between(rng, 150, 850), y: between(rng, minY, maxY) };
}

export function createGame(rng = Math.random) {
  const piles = [];
  for (let i = 0; i < 6; i++) piles.push(floorSpot(rng, 370, 590));
  const items = [];
  let id = 0;
  for (let s = 0; s < SERIES.length; s++) for (let n = 1; n <= PER; n++) {
    const p = Math.floor(rng() * piles.length), c = piles[p];
    items.push({
      id: id++, s, n, state: 'floor',
      x: c.x + between(rng, -38, 38), y: c.y + between(rng, -22, 22),
      z: 0, pile: p, rot: between(rng, -0.5, 0.5), order: rng(),
    });
  }
  const g = { items, basket: [], coins: 0, scared: 0, rowDone: ROWS.map(() => false) };
  for (let p = 0; p < piles.length; p++) restack(g, p);
  return g;
}

// 山の 本を 下から じゅんに つみなおす
export function restack(g, pile) {
  if (pile < 0) return;
  g.items.filter(i => i.state === 'floor' && i.pile === pile)
    .sort((a, b) => a.order - b.order)
    .forEach((it, k) => { it.z = k; });
}

// ゆかの 本を かごへ
export function pick(g, id) {
  const it = g.items[id];
  if (!it || it.state !== 'floor') return { ok: false, why: 'notFloor' };
  if (g.basket.length >= CAP) return { ok: false, why: 'full' };
  it.state = 'basket';
  g.basket.push(id);
  const pile = it.pile;
  it.pile = -1;
  restack(g, pile);
  return { ok: true };
}

// かごの 中の おなじ色の 本を たなへ
export function putToRow(g, ri) {
  const row = ROWS[ri];
  if (!g.basket.length) return { placed: 0, why: 'empty', completed: [] };
  const match = g.basket.filter(id => g.items[id].s === row.s);
  if (!match.length) return { placed: 0, why: 'wrong', completed: [] };
  match.forEach(id => { g.items[id].state = 'shelf'; });
  g.basket = g.basket.filter(id => g.items[id].state === 'basket');
  g.coins += match.length * COIN_BOOK;
  return { placed: match.length, completed: checkRows(g) };
}

// あたらしく そろった 行を かえす
export function checkRows(g) {
  const done = [];
  ROWS.forEach((row, ri) => {
    const full = g.items.filter(i => i.s === row.s && i.state === 'shelf').length === PER;
    if (full && !g.rowDone[ri]) { g.rowDone[ri] = true; g.coins += COIN_ROW; done.push(ri); }
    if (!full) g.rowDone[ri] = false;
  });
  return done;
}

export const isCleared = g => g.items.every(i => i.state === 'shelf');
export const leftCount = g => g.items.filter(i => i.state !== 'shelf').length;

// オバケは 本が いちばん 多い たなを ねらう
export function chooseGhostRow(g, rng = Math.random) {
  const counts = ROWS.map(r => g.items.filter(i => i.s === r.s && i.state === 'shelf').length);
  let best = 0;
  counts.forEach((c, i) => { if (c > counts[best]) best = i; });
  return counts[best] === 0 ? Math.floor(rng() * ROWS.length) : best;
}

// オバケが たなに とどいた：その たなと かごの 本が ゆかへ
export function boo(g, ri, rng = Math.random) {
  const row = ROWS[ri];
  const hit = g.items.filter(i => (i.state === 'shelf' && i.s === row.s) || i.state === 'basket');
  hit.forEach(it => {
    const p = it.state === 'basket' ? floorSpot(rng, 520, 610) : floorSpot(rng, 350, 560);
    Object.assign(it, { state: 'floor', x: p.x, y: p.y, z: 0, pile: -1, rot: between(rng, -0.6, 0.6) });
  });
  g.basket = [];
  checkRows(g);
  return hit.length;
}

export function scare(g) {
  g.scared++;
  g.coins += COIN_SCARE;
}

export function targetPos(g, it) {
  if (it.state === 'floor') return { x: it.x, y: it.y - it.z * 9 };
  if (it.state === 'basket') {
    const i = g.basket.indexOf(it.id);
    return { x: BASKET.x - 160 + i * 80, y: BASKET.y };
  }
  const r = rowOf(it.s);
  return { x: slotX(r, it.n), y: r.y + r.h };
}
