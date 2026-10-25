import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from './core.mjs';

const { T, W, H } = C;

test('せかいは おなじ たねなら おなじ。たからは ぜんぶ 1こずつ ある', () => {
  const a = C.genWorld(42), b = C.genWorld(42);
  assert.deepEqual(a.tiles, b.tiles);
  assert.equal(a.treasureAt.size, C.TREASURES.length);
  for (const [k, i] of a.treasureAt) {
    const [x, y] = C.unkey(k);
    assert.equal(C.tileAt(a, x, y), T.TREASURE);
    assert.equal(y, C.TREASURES[i].y);
  }
  for (let x = 0; x < W; x++) assert.equal(C.tileAt(a, x, H - 1), T.BEDROCK);
  // 地面の いちばん 上は ほらあなに なっていない
  for (let x = 0; x < W; x++) assert.notEqual(C.tileAt(a, x, 0), T.AIR);
});

test('ふかい ところの こうせきほど 高く 売れる', () => {
  const vals = C.BANDS.map(b => C.ORES[b.ore].value);
  for (let i = 1; i < vals.length; i++) assert.ok(vals[i] > vals[i - 1]);
  // どの そうにも その そうの こうせきが ある
  const w = C.genWorld(7);
  C.BANDS.forEach((b, bi) => {
    let n = 0;
    for (let y = b.from; y < (C.BANDS[bi + 1]?.from ?? H - 1); y++) for (let x = 0; x < W; x++) if (C.tileAt(w, x, y) === b.ore) n++;
    assert.ok(n >= 10, b.name);
  });
});

test('ドリルが よわいと かたい そうは ほれない。強いと はやく ほれる', () => {
  const w = C.genWorld(1);
  assert.equal(C.digInfo(w, 5, 3, 1).ok, true);
  const hard = C.digInfo(w, 5, 40, 1);
  assert.equal(hard.ok, false); assert.equal(hard.why, 'hard'); assert.equal(hard.need, 2);
  assert.ok(C.digInfo(w, 5, 40, 2).ok);
  assert.ok(C.digInfo(w, 5, 3, 4).time < C.digInfo(w, 5, 3, 1).time);
  assert.equal(C.digInfo(w, 5, H - 1, 6).why, 'bedrock');
  // どの そうも、さいごの ドリルで ほれる
  for (const b of C.BANDS) assert.ok(b.lvl <= C.UPGRADES.drill.vals.at(-1));
  for (const t of C.TREASURES) assert.ok(C.digInfo(w, 3, t.y, 6).ok);
});

test('ほると こうせき・化石・たからが 手に はいる', () => {
  const w = C.genWorld(3);
  const [[tk, ti]] = [...w.treasureAt];
  const [tx, ty] = C.unkey(tk);
  assert.deepEqual(C.dig(w, tx, ty), { treasure: ti });
  assert.equal(C.tileAt(w, tx, ty), T.AIR);
  const [[fk, fi]] = [...w.fossilAt].filter(([k]) => C.tileAt(w, ...C.unkey(k)) === T.FOSSIL);
  assert.deepEqual(C.dig(w, ...C.unkey(fk)), { fossil: fi });
});

test('ベルトは ホッパーに むかって ながれる。つながって いない ベルトは ながれない', () => {
  const w = C.genWorld(5), s = C.newSave(5);
  s.money = 1000;
  const hx = C.HOPPER.x;
  // ホッパーの よこ → した へ おりる たてあな
  for (let y = 0; y < 4; y++) C.dig(w, hx + 1, y);
  assert.ok(C.place(w, s, 'belt', hx + 1, -1));
  for (let y = 0; y < 4; y++) assert.ok(C.place(w, s, 'belt', hx + 1, y));
  assert.equal(C.place(w, s, 'belt', 3, 10), false, 'ほって いない ところには おけない');
  C.dig(w, 20, 5);
  assert.ok(C.place(w, s, 'belt', 20, 5));
  const flow = C.computeFlow(s);
  assert.equal(flow[C.mkey(hx + 1, -1)], C.mkey(hx, -1));
  assert.equal(flow[C.mkey(hx + 1, 3)], C.mkey(hx + 1, 2));
  assert.equal(flow[C.mkey(20, 5)], undefined);
  assert.equal(s.money, 1000 - 6 * C.BELT_COST);
});

test('じどうドリルは 作業場が あると おけて、ベルトに こうせきを だす', () => {
  const w = C.genWorld(9), s = C.newSave(9);
  s.money = 5000;
  const x = C.HOPPER.x + 1;
  for (let y = 0; y < 15; y++) C.dig(w, x, y);
  w.tiles[15 * W + x] = T.STONE;
  for (let y = -1; y < 15; y++) C.place(w, s, 'belt', x, y);
  C.dig(w, x - 1, 14);
  assert.equal(C.place(w, s, 'drill', x - 1, 14), false, '作業場が いる');
  w.tiles[15 * W + x - 1] = T.STONE;
  assert.ok(C.buyRoom(s, 'workshop'));
  const before = s.money;
  assert.ok(C.place(w, s, 'drill', x - 1, 14));
  assert.equal(before - s.money, C.drillCost(0));
  const flow = C.computeFlow(s);
  assert.equal(C.tickDrills(s, flow, 1).length, 0);
  const out = C.tickDrills(s, flow, C.DRILL_TIME);
  assert.equal(out.length, 1);
  assert.equal(out[0].ore, T.IRON);
  assert.equal(out[0].to, C.mkey(x, 14));
  // こわすと お金が もどる
  const m = s.money;
  C.removeMachine(s, x - 1, 14);
  assert.equal(s.money, m + C.drillCost(0));
});

test('ロケットは きち・たから・お金が そろうと じゅんばんに つくれる', () => {
  const s = C.newSave(1);
  s.money = 1e6;
  assert.equal(C.partState(s).why, 'pad');
  C.buyRoom(s, 'pad');
  assert.equal(C.partState(s).why, 'treasure');
  s.treasures[0] = true;
  assert.ok(C.buyPart(s));
  assert.equal(s.parts, 1);
  assert.equal(C.buyPart(s), false);
  s.treasures.fill(true);
  while (C.buyPart(s));
  assert.equal(s.parts, C.PARTS.length);
  assert.ok(C.partState(s).done);
});

test('やることは じゅんばんに すすむ', () => {
  const s = C.newSave(1);
  const ns = [];
  const push = () => ns.push(C.goal(s).n);
  push(); s.stats.dug = 3; push(); s.stats.earned = 5; push(); s.up.drill = 1; push();
  s.rooms.workshop = true; push(); s.stats.auto = 1; push(); s.rooms.pad = true; push();
  s.treasures[0] = true; push(); s.parts = 5; push(); s.cleared = true; push();
  for (let i = 1; i < ns.length; i++) assert.ok(ns[i] > ns[i - 1], JSON.stringify(ns));
});

test('ほぞんして よみこむと もとに もどる', () => {
  const s = C.newSave(77);
  const base = C.genWorld(77), w = C.genWorld(77);
  C.dig(w, 4, 0); C.dig(w, 4, 1); C.dig(w, 10, 50);
  s.money = 123; s.up.drill = 2; s.rooms.tower = true; s.bag[T.GOLD] = 3;
  s.machines['4,1'] = { k: 'belt', paid: 3 };
  s.dug = C.encodeDug(w, base);
  const back = C.normalize(JSON.parse(JSON.stringify(s)));
  assert.equal(back.money, 123); assert.equal(back.up.drill, 2); assert.equal(back.rooms.tower, true);
  assert.equal(back.bag[T.GOLD], 3);
  assert.equal(back.machines['4,1'].k, 'belt');
  const w2 = C.genWorld(back.seed);
  C.applyDug(w2, back.dug);
  assert.deepEqual(w2.tiles, w.tiles);
  // こわれた データでも あそべる
  assert.equal(C.normalize({ v: 1, money: 'x', up: { drill: 99 } }).up.drill, C.UPGRADES.drill.vals.length - 1);
  assert.equal(C.normalize(null).money, 0);
});

test('お金の バランス：ロケット かんせいまでの ねだんが 高すぎない', () => {
  const total = C.PARTS.reduce((a, p) => a + p.cost, 0) + C.ROOMS.reduce((a, r) => a + r.cost, 0)
    + C.UPGRADES.drill.costs.reduce((a, b) => a + b, 0);
  // ダイヤを 120こ（バッグ さいだい）で なんかい 売れば いいか
  const trips = total / (C.ORES[T.DIAMOND].value * 1.5 * 120);
  assert.ok(trips < 10, `trips=${trips}`);
});

test('じどうドリルの ねだんは ふえていくが 1まんえんで とまる', () => {
  for (let n = 1; n < 40; n++) assert.ok(C.drillCost(n) >= C.drillCost(n - 1));
  assert.ok(C.drillCost(16) < 10000);
  assert.equal(C.drillCost(17), 10000);
  assert.equal(C.drillCost(100), 10000);
});
