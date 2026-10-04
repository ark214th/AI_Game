// 複数セーブ・サンドボックス・かいだん（2かい・3がい）の テスト
import test from 'node:test';
import assert from 'node:assert/strict';
import {B, ITEMS, BLOCKS, MAX_LEVEL} from './blocks.mjs';
import {World, GROUND} from './world.mjs';
import {Game, SHELF_MAX} from './game.mjs';
import {SaveStore, SLOT_MAX} from './saves.mjs';

const g = GROUND;
function mem() {
  const m = new Map();
  return {getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m};
}
function flat(w = 40, d = 40, h = 30) {
  const wd = new World(w, h, d);
  for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) for (let y = 0; y < g; y++) wd.set(x, y, z, y === 0 ? B.BEDROCK : B.STONE);
  wd.changes.length = 0;
  return wd;
}

test('the old single save becomes the first world and keeps sound settings', () => {
  const s = mem();
  s.setItem('shopcraft-v1', JSON.stringify({world: {w: 1}, game: {coins: 77, totalSales: 300}, sound: false, help: true}));
  const st = new SaveStore(s);
  assert.equal(st.migrate(), true);
  assert.deepEqual(st.list().map(m => [m.id, m.name, m.coins]), [[1, 'せかい1', 77]]);
  assert.deepEqual(st.load(1).game, {coins: 77, totalSales: 300});
  assert.equal(st.list()[0].level, 2);
  assert.equal(st.prefs().sound, false);
  assert.equal(st.prefs().last, 1);
  assert.equal(s.getItem('shopcraft-v1'), null);
  assert.equal(st.migrate(), false); // 2回目は なにも しない
});

test('worlds can be saved, renamed, and deleted, up to six', () => {
  const st = new SaveStore(mem());
  st.migrate();
  for (let n = 0; n < SLOT_MAX; n++) {
    assert.ok(st.canCreate());
    const id = st.nextId();
    assert.ok(st.save(id, {n}, {name: st.nextName(), sandbox: n % 2 === 1}));
  }
  assert.equal(st.canCreate(), false);
  assert.deepEqual(st.list().map(m => m.name), ['せかい1', 'せかい2', 'せかい3', 'せかい4', 'せかい5', 'せかい6']);
  st.rename(2, '  ぼくの 町  ');
  assert.equal(st.list()[1].name, 'ぼくの 町');
  st.remove(3);
  assert.equal(st.load(3), null);
  assert.ok(st.canCreate());
  assert.equal(st.nextName(), 'せかい2'); // 名前を かえたので あいた
  assert.deepEqual(st.load(4), {n: 3});
});

test('a full storage reports failure instead of throwing', () => {
  const s = mem();
  s.setItem = () => { throw new Error('QuotaExceededError'); };
  const st = new SaveStore(s);
  assert.equal(st.save(1, {}, {name: 'a'}), false);
});

test('sandbox mode has everything: all goods, all gifts, top town level, no goals', () => {
  const w = flat();
  const game = new Game(w, {sandbox: true});
  assert.equal(game.level, MAX_LEVEL);
  assert.ok(ITEMS.every(it => game.unlocked.has(it.key)));
  assert.ok(BLOCKS.filter(b => b && b.gift).every(b => game.blockAvailable(b.id)));
  assert.equal(game.currentGoal(), null);
  game.stats.sold = 5; game.update(0.01);
  assert.equal(game.goalIndex, 0);
  const copy = new Game(w, JSON.parse(JSON.stringify(game.toJSON())));
  assert.equal(copy.sandbox, true);
  assert.equal(new Game(w, {}).sandbox, false);
});

test('stairs have two collision boxes that turn with the stairs', () => {
  const w = flat();
  w.set(5, g, 5, B.STAIRS_WOOD, 0);
  const boxes = w.bodyBoxes(5, g, 5);
  assert.equal(boxes.length, 2);
  // 前（+z がわ）の 半分は 低い
  assert.equal(w.bodyHits(5.5, g + 0.5, 5.8, 0.15, 1.8), false);
  assert.equal(w.bodyHits(5.5, g + 0.5, 5.2, 0.15, 1.8), true);
  w.set(5, g, 5, B.STAIRS_WOOD, 2); // うしろ向き
  assert.equal(w.bodyHits(5.5, g + 0.5, 5.2, 0.15, 1.8), false);
  assert.equal(w.bodyHits(5.5, g + 0.5, 5.8, 0.15, 1.8), true);
  // ふつうの ブロックは 1つの 箱
  w.set(6, g, 5, B.STONE);
  assert.equal(w.bodyBoxes(6, g, 5).length, 1);
  assert.equal(w.bodyBoxes(7, g, 5), null);
});

// 1かいの 上に 2かいの ゆかを はり、かいだんで のぼれる 家
function twoFloors() {
  const w = flat();
  const F2 = g + 4; // 2かいの 足もと
  for (let x = 10; x <= 24; x++) for (let z = 10; z <= 20; z++) w.set(x, F2 - 1, z, B.PLANKS);
  // かいだん：z=19 で x=12 から 15 へ のぼる（前は -x がわ = meta 3）
  for (let k = 0; k < 4; k++) {
    const x = 12 + k, y = g + k;
    for (let yy = g; yy < y; yy++) w.set(x, yy, 19, B.PLANKS);
    w.set(x, y, 19, B.STAIRS_WOOD, 3);
    for (let yy = y + 1; yy <= F2 + 1; yy++) w.set(x, yy, 19, 0); // 頭の 上を あける
  }
  w.set(16, F2 - 1, 19, B.PLANKS);
  return {w, F2};
}

test('customers climb stairs to buy at a shop on the second floor', () => {
  const {w, F2} = twoFloors();
  w.set(20, F2, 14, B.REGISTER);
  w.set(22, F2, 14, B.SHELF);
  w.shelves.get(w.idx(22, F2, 14)).item = 'bread';
  w.shelves.get(w.idx(22, F2, 14)).stock = SHELF_MAX;
  w.spawns.push({x: 2, y: g, z: 2});
  const path = w.findPath({x: 2, y: g, z: 2}, [{x: 21, y: F2, z: 14}]);
  assert.ok(path, 'there is a way up');
  assert.ok(path.some(c => w.get(c.x, c.y - 1, c.z) === B.STAIRS_WOOD), 'the way uses the stairs');
  const game = new Game(w, {seed: 4});
  game.spawnTimer = 999;
  const c = game.spawn('villager');
  c.wants = ['bread'];
  let sold = false;
  for (let t = 0; t < 60 && !sold; t += 0.05) { game.update(0.05); sold = game.takeEvents().some(e => e.type === 'sale'); }
  assert.ok(sold);
});

test('a shelf belongs to the register on its own floor', () => {
  const {w, F2} = twoFloors();
  w.set(18, g, 14, B.REGISTER);   // 1かいの レジ
  w.set(18, F2, 12, B.REGISTER);  // 2かいの レジ（少し はなれて いる）
  w.set(18, F2, 15, B.SHELF);     // 2かいの たな：1かいの レジの ま上に 近い
  const game = new Game(w, {seed: 5});
  game.shops();
  assert.equal(w.shelves.get(w.idx(18, F2, 15)).shop, w.idx(18, F2, 12));
});
