import test from 'node:test';
import assert from 'node:assert/strict';
import {B, BLOCKS, ITEM, ITEMS, CUSTOMER_TYPES, REGULARS, GOALS} from './blocks.mjs';
import {World, GROUND, rleEncode, rleDecode} from './world.mjs';
import {Game, SHELF_MAX, levelFor, starsFor} from './game.mjs';

const g = GROUND;
// たいらな 小さい せかい
function flat(w = 40, d = 40) {
  const wd = new World(w, 24, d);
  for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) {
    wd.set(x, 0, z, B.BEDROCK);
    for (let y = 1; y < g; y++) wd.set(x, y, z, y === g - 1 ? B.GRASS : B.STONE);
  }
  wd.changes.length = 0;
  return wd;
}
function run(game, seconds, dt = 1 / 20) {
  const all = [];
  for (let t = 0; t < seconds; t += dt) { game.update(dt); all.push(...game.takeEvents()); }
  return all;
}
// レジ1つ・たな1つの 店と 出てくる 場所
function shopWorld(item = 'bread') {
  const w = flat();
  w.set(20, g, 20, B.REGISTER);
  w.set(22, g, 20, B.SHELF);
  w.shelves.get(w.idx(22, g, 20)).item = item;
  w.shelves.get(w.idx(22, g, 20)).stock = SHELF_MAX;
  w.spawns.push({x: 3, y: g, z: 3});
  return w;
}

test('block and item tables are consistent', () => {
  for (const b of BLOCKS.filter(Boolean)) assert.equal(B[b.key], b.id);
  for (const t of Object.values(CUSTOMER_TYPES)) for (const k of t.likes) assert.ok(ITEM[k], k);
  for (const r of REGULARS) { assert.ok(B[r.gift], r.gift); assert.ok(BLOCKS[B[r.gift]].gift); assert.ok(CUSTOMER_TYPES[r.type]); }
  assert.equal(new Set(ITEMS.map(i => i.key)).size, ITEMS.length);
  assert.ok(ITEMS.every(i => i.price > 0 && i.cost >= 0));
});

test('set/get, doors take two cells, bedrock cannot be broken', () => {
  const w = flat();
  assert.ok(w.place(5, g, 5, B.DOOR, 1));
  assert.equal(w.get(5, g + 1, 5), B.DOOR_TOP);
  assert.equal(w.remove(5, g + 1, 5), B.DOOR);
  assert.equal(w.get(5, g, 5), 0);
  assert.equal(w.get(5, g + 1, 5), 0);
  assert.equal(w.remove(5, 0, 5), 0);
  assert.equal(w.get(5, 0, 5), B.BEDROCK);
  assert.equal(w.place(5, g - 1, 5, B.STONE), false); // うまっている
});

test('raycast hits the first block and reports the face', () => {
  const w = flat();
  w.set(10, g, 5, B.STONE);
  const hit = w.raycast(5.5, g + 0.5, 5.5, 1, 0, 0, 8);
  assert.deepEqual([hit.x, hit.y, hit.z, hit.nx], [10, g, 5, -1]);
  const down = w.raycast(5.5, g + 1.5, 5.5, 0, -1, 0, 8);
  assert.deepEqual([down.x, down.y, down.z, down.ny], [5, g - 1, 5, 1]);
  assert.equal(w.raycast(5.5, g + 3.5, 5.5, 0, 1, 0, 8), null);
});

test('path finding walks around walls, through doors, and steps up one block', () => {
  const w = flat();
  for (let z = 0; z < 40; z++) { w.set(15, g, z, B.STONE); w.set(15, g + 1, z, B.STONE); }
  assert.equal(w.findPath({x: 5, y: g, z: 5}, [{x: 25, y: g, z: 5}]), null);
  w.set(15, g, 30, 0); w.set(15, g + 1, 30, 0);
  w.place(15, g, 30, B.DOOR);
  const p = w.findPath({x: 5, y: g, z: 5}, [{x: 25, y: g, z: 5}]);
  assert.ok(p && p.some(c => c.x === 15 && c.z === 30));
  // 1だんの だんさ
  const w2 = flat();
  for (let x = 10; x < 40; x++) for (let z = 0; z < 40; z++) w2.set(x, g, z, B.PLANKS);
  const up = w2.findPath({x: 5, y: g, z: 5}, [{x: 20, y: g + 1, z: 5}]);
  assert.ok(up);
  assert.equal(up.at(-1).y, g + 1);
  // 2だんは のぼれない
  for (let x = 10; x < 40; x++) for (let z = 0; z < 40; z++) w2.set(x, g + 1, z, B.PLANKS);
  assert.equal(w2.findPath({x: 5, y: g, z: 5}, [{x: 20, y: g + 2, z: 5}]), null);
});

test('customers do not walk on top of shelves or counters', () => {
  const w = flat();
  for (let z = 0; z < 40; z++) w.set(15, g, z, B.SHELF);
  for (let z = 0; z < 40; z++) w.set(15, g + 2, z, B.STONE); // 上を ふさいでも 歩けない
  assert.equal(w.canStand(15, g + 1, 10), false);
  assert.equal(w.findPath({x: 5, y: g, z: 5}, [{x: 25, y: g, z: 5}]), null);
});

test('world save round trip keeps blocks, shelves, signs, and spawns', () => {
  const w = shopWorld('apple');
  w.set(18, g, 18, B.SIGN);
  w.signs.set(w.idx(18, g, 18), 'パン屋');
  const copy = World.deserialize(JSON.parse(JSON.stringify(w.serialize())));
  assert.deepEqual(copy.blocks, w.blocks);
  assert.deepEqual(copy.shelves.get(w.idx(22, g, 20)), {item: 'apple', stock: SHELF_MAX});
  assert.equal(copy.signs.get(w.idx(18, g, 18)), 'パン屋');
  assert.ok(copy.registers.has(w.idx(20, g, 20)));
  assert.deepEqual(copy.spawns, w.spawns);
  assert.equal(rleDecode(rleEncode(new Uint8Array([1, 1, 2])), 4), null); // 長さが ちがう
});

test('a customer walks to the shelf, takes an item, pays at the register, and leaves', () => {
  const w = shopWorld('bread');
  const game = new Game(w, {seed: 1, coins: 0});
  const c = game.spawn('villager');
  c.wants = ['bread'];
  const events = run(game, 40);
  const sale = events.find(e => e.type === 'sale');
  assert.ok(sale, 'sold something');
  assert.deepEqual(sale.items, ['bread']);
  assert.equal(w.shelves.get(w.idx(22, g, 20)).stock, SHELF_MAX - 1 - events.filter(e => e.type === 'take' && e.id !== c.id).length);
  assert.ok(game.coins >= ITEM.bread.price);
  assert.ok(events.some(e => e.type === 'gone' && e.id === c.id));
});

test('a customer who cannot find the item says so and remembers it', () => {
  const w = shopWorld('bread');
  const game = new Game(w, {seed: 2});
  game.spawnTimer = 999;
  const c = game.spawn('knight');
  c.wants = ['iron_sword'];
  c.subOk = false;
  const events = run(game, 30);
  assert.ok(events.some(e => e.type === 'missing' && e.item === 'iron_sword'));
  assert.deepEqual(game.topMissed(), ['iron_sword']);
  assert.ok(!events.some(e => e.type === 'sale'));
  assert.equal(game.coins, 30);
});

test('a shop without a door is unreachable; adding a door lets customers in', () => {
  const w = shopWorld('bread');
  // レジと たなを かべで かこむ
  for (let x = 17; x <= 25; x++) for (let z = 17; z <= 23; z++) {
    if (x > 17 && x < 25 && z > 17 && z < 23) continue;
    for (let y = g; y < g + 3; y++) w.set(x, y, z, B.PLANKS);
  }
  const game = new Game(w, {seed: 3});
  game.spawnTimer = 999;
  const c = game.spawn('villager');
  c.wants = ['bread'];
  let events = run(game, 10);
  assert.ok(events.some(e => e.type === 'bubble' && e.id === c.id && e.text === '入れない…'));
  w.set(21, g, 23, 0); w.set(21, g + 1, 23, 0);
  w.place(21, g, 23, B.DOOR);
  const c2 = game.spawn('villager');
  c2.wants = ['bread'];
  events = run(game, 40);
  assert.ok(events.some(e => e.type === 'sale' && e.id === c2.id));
  assert.ok(events.some(e => e.type === 'door' && e.id === c2.id));
});

test('shop rating rises with goods, lights, decorations, roof, and a named sign', () => {
  const w = shopWorld('bread');
  const game = new Game(w, {seed: 4});
  const base = game.shops()[0];
  assert.ok(base.stars <= 2);
  const items = ['apple', 'wood_sword', 'stone_sword', 'cookie', 'fish'];
  game.unlocked = new Set(ITEMS.map(i => i.key));
  items.forEach((k, n) => { w.set(19 + n, g, 23, B.SHELF); game.stockShelf(w.idx(19 + n, g, 23), k); });
  for (const [x, z] of [[17, 17], [24, 17], [17, 25], [24, 25]]) w.set(x, g, z, B.LANTERN);
  for (const [x, id] of [[16, B.FLOWER_RED], [17, B.FLOWER_BLUE], [18, B.POT], [19, B.BARREL], [25, B.TABLE], [26, B.BOOKSHELF]]) w.set(x, g, 15, id);
  w.fill(14, g + 4, 14, 28, g + 4, 28, B.PLANKS);
  w.set(20, g, 18, B.SIGN);
  const shop = game.shops()[0];
  assert.ok(shop.score > base.score);
  assert.ok(shop.stars >= 4);
  game.setSign(w.idx(20, g, 18), 'ぶき屋');
  const named = game.shops()[0];
  assert.equal(named.name, 'ぶき屋');
  assert.ok(named.score > shop.score);
  assert.equal(named.stars, 5);
  assert.deepEqual(named.hints, []);
});

test('shelves far from any register are not part of a shop', () => {
  const w = shopWorld('bread');
  w.set(35, g, 35, B.SHELF);
  const game = new Game(w, {seed: 5});
  game.stockShelf(w.idx(35, g, 35), 'apple');
  const shop = game.shops()[0];
  assert.equal(shop.shelves.length, 1);
  assert.equal(w.shelves.get(w.idx(35, g, 35)).shop, null);
});

test('unlocking costs coins and needs the town level; coins never go negative', () => {
  const game = new Game(shopWorld(), {seed: 6, coins: 45});
  assert.equal(game.unlock('bow'), false); // レベル2
  assert.ok(game.unlock('stone_sword'));
  assert.equal(game.coins, 5);
  assert.equal(game.unlock('cookie'), false);
  assert.equal(game.coins, 5);
  assert.equal(game.stockShelf([...game.world.shelves.keys()][0], 'iron_sword'), false); // まだ ない
});

test('levels and stars follow their thresholds', () => {
  assert.equal(levelFor(0), 1);
  assert.equal(levelFor(199), 1);
  assert.equal(levelFor(200), 2);
  assert.equal(levelFor(1e9), 6);
  assert.equal(starsFor(0), 1);
  assert.equal(starsFor(0.5), 3);
  assert.equal(starsFor(1), 5);
});

test('regulars bring a gift after enough visits and a level up builds a new house', () => {
  const w = new World();
  w.generate(7);
  const game = new Game(w, {seed: 7, totalSales: 190});
  const housesBefore = w.spawns.length;
  let gift = null, level = null;
  for (let n = 0; n < 6 && !gift; n++) {
    const c = game.spawn('villager');
    c.regular = 'tom'; c.name = 'トム'; c.wants = ['bread'];
    // たなを いつも いっぱいに
    for (const s of w.shelves.values()) if (s.item) s.stock = SHELF_MAX;
    for (let t = 0; t < 60 && game.customers.includes(c); t += 0.05) {
      game.update(0.05);
      for (const e of game.takeEvents()) { if (e.type === 'gift') gift = e; if (e.type === 'level') level = e; }
    }
  }
  assert.ok(gift, 'got a gift');
  assert.equal(gift.block, 'EMERALD');
  assert.ok(game.gifts.has('EMERALD'));
  assert.ok(game.blockAvailable(B.EMERALD));
  assert.ok(level && level.level === 2);
  assert.equal(w.spawns.length, housesBefore + 1);
});

test('goals are completed in order and pay rewards', () => {
  const w = shopWorld('bread');
  const game = new Game(w, {seed: 8, coins: 0});
  game.stats.sold = 1;
  game.update(0.01);
  assert.equal(game.goalIndex, 1);
  assert.equal(game.coins, GOALS[0].reward);
  game.stockShelf(w.idx(22, g, 20), 'apple');
  game.update(0.01);
  assert.equal(game.goalIndex, 2);
});

test('players cannot place a block inside a customer', () => {
  const w = shopWorld('bread');
  const game = new Game(w, {seed: 9});
  const c = game.spawn('villager');
  assert.equal(game.placeBlock(c.cell.x, c.cell.y + 1, c.cell.z, B.STONE), false);
  assert.ok(game.placeBlock(c.cell.x + 5, c.cell.y, c.cell.z + 5, B.STONE));
});

test('generated world has a reachable starter stall that sells', () => {
  const w = new World();
  w.generate(7);
  assert.equal(w.spawns.length, 3);
  const game = new Game(w, {seed: 10});
  const shops = game.shops();
  assert.equal(shops.length, 1);
  assert.equal(shops[0].shelves.length, 2);
  for (const s of w.spawns) assert.ok(w.canStand(s.x, s.y, s.z), 'spawn is standable');
  const events = run(game, 90);
  assert.ok(events.filter(e => e.type === 'sale').length >= 2);
  assert.ok(!events.some(e => e.type === 'bubble' && e.text === '入れない…'));
});
