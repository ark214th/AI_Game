// node --test games/fushigi-pet-hotel/core.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from './core.mjs';
import { SPECIES, ITEMS, FOODS, TAGS, WALLS, FLOORS, ROOM_HEARTS, MAX_ROOMS } from './data.mjs';

const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
const rng = seq(0.1, 0.7, 0.3, 0.9, 0.5);

// 1にちの おせわを ぜんぶ おわらせる（すきな ものを えらぶ）
function careAll(s) {
  s.today.guests.forEach((g, gi) => {
    while (!C.isHappy(g)) {
      const n = C.needOf(g);
      if (n === 'food') C.feed(s, gi, SPECIES[g.species].fav);
      else if (n === 'bath') C.bathDone(s, gi);
      else C.petDone(s, gi, 1);
    }
  });
}

test('はじめの データで 1にちを さいごまで あそべる', () => {
  const s = C.newSave();
  C.startDay(s, rng);
  assert.equal(s.today.guests.length, 2);
  assert.notEqual(s.today.guests[0].room, s.today.guests[1].room);
  for (const g of s.today.guests) assert.deepEqual([...g.needs].sort(), ['bath', 'food', 'pet']);
  assert.equal(C.endDay(s, rng), null, 'おせわが おわるまで よるに ならない');
  careAll(s);
  assert.ok(C.allDone(s));
  const res = C.endDay(s, rng);
  assert.equal(res.gifts.length, 2);
  assert.equal(s.day, 2);
  assert.equal(s.today, null);
});

test('ごはん：すき=ハート2、ふつう=1、にがて=たべない', () => {
  const s = C.newSave();
  C.startDay(s, rng);
  const gi = 0, g = s.today.guests[gi], sp = SPECIES[g.species];
  g.needs = ['food', 'bath', 'pet'];
  const h0 = s.hearts;
  const bad = C.feed(s, gi, sp.dislike);
  assert.equal(bad.result, 'dislike'); assert.equal(g.done, 0); assert.ok(s.zukan[g.species].dislike);
  const ok = C.feed(s, gi, FOODS.find(f => f.id !== sp.fav && f.id !== sp.dislike).id);
  assert.equal(ok.result, 'ok'); assert.equal(s.hearts, h0 + 1);
  g.done = 0;
  const fav = C.feed(s, gi, sp.fav);
  assert.equal(fav.result, 'fav'); assert.equal(s.hearts, h0 + 3); assert.ok(s.zukan[g.species].fav);
  assert.equal(C.feed(s, gi, sp.fav).result, 'notNow', 'いまの ねがいと ちがう おせわは なにも おきない');
});

test('なでる ばしょの はんてい', () => {
  assert.equal(C.spotAt(0, -0.7), 'atama');
  assert.equal(C.spotAt(0.7, 0.1), 'hoppe');
  assert.equal(C.spotAt(-0.7, 0.1), 'hoppe');
  assert.equal(C.spotAt(0, 0.5), 'onaka');
  for (const sp of Object.values(SPECIES)) assert.ok(['atama', 'hoppe', 'onaka'].includes(sp.spot));
});

test('すきな かざりの へやに とまり、かざると よろこぶ', () => {
  const s = C.newSave();
  s.rooms[1].wall = 'mizu';
  const rooms = C.assignRooms(s, ['gorota', 'fuwari']);
  assert.equal(rooms[1], 1, 'ふわりは みずいろの へやへ');
  s.today = null;
  const ev = C.startDay(s, seq(0.2));
  const fi = s.today.guests.findIndex(g => g.species === 'fuwari');
  assert.equal(s.today.guests[fi].room, 1);
  assert.ok(ev.some(e => e.type === 'likeRoom' && e.guest === fi));
  assert.ok(s.zukan.fuwari.tags.includes('mizu'));
  // くもの ものを おくと もう1かい よろこぶ。おなじ しるしは 1にち 1かい
  s.owned.kumobed = 1;
  C.placeItem(s, 1, 'kumobed', 500, 500);
  const r = C.decorReact(s, 1);
  assert.deepEqual(r.tags, ['kumo']);
  assert.equal(C.decorReact(s, 1), null);
});

test('家具は もっている かず までしか おけない', () => {
  const s = C.newSave();
  assert.equal(C.available(s, 'bed'), 0);
  assert.equal(C.placeItem(s, 0, 'bed', 500, 500), null);
  const rug = C.placeItem(s, 0, 'rug', -100, 9999);
  assert.ok(rug);
  assert.ok(rug.x >= 0 && rug.y <= 625, 'へやの そとには おけない');
  assert.equal(C.available(s, 'rug'), 0);
  C.removeItem(s, 0, rug);
  assert.equal(C.available(s, 'rug'), 1);
});

test('ハートが たまると へやが ふえる（さいだいまで）', () => {
  const s = C.newSave();
  let days = 0;
  while (s.rooms.length < MAX_ROOMS && days < 100) {
    C.startDay(s, rng); careAll(s); C.endDay(s, rng); days++;
  }
  assert.equal(s.rooms.length, MAX_ROOMS);
  assert.ok(days <= 12, `へやが ぜんぶ そろうまで ${days}にち`);
  assert.ok(s.hearts >= ROOM_HEARTS[MAX_ROOMS - 1]);
  for (const r of s.rooms) assert.ok(r.items.every(it => ITEMS[it.id]));
});

test('おみやげで いつかは ぜんぶ そろう', () => {
  const s = C.newSave();
  for (let d = 0; d < 60; d++) { C.startDay(s, Math.random); careAll(s); C.endDay(s, Math.random); }
  for (const sp of Object.values(SPECIES)) for (const g of sp.gifts) {
    const [k, id] = g.includes(':') ? g.split(':') : ['item', g];
    if (k === 'wall') assert.ok(s.walls.includes(id), id);
    else if (k === 'floor') assert.ok(s.floors.includes(id), id);
    else assert.ok(s.owned[id] > 0, id);
  }
});

test('ほぞんデータを よみなおしても おなじ', () => {
  const s = C.newSave();
  C.startDay(s, rng);
  C.feed(s, 0, SPECIES[s.today.guests[0].species].fav);
  const back = C.normalize(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(back, s);
  assert.deepEqual(C.normalize(null), C.newSave());
  assert.deepEqual(C.normalize({ v: 1, rooms: 'x', owned: { bed: -3 } }).rooms.length, 2);
  // おきすぎた 家具は へらす
  const bad = JSON.parse(JSON.stringify(s)); bad.owned.bed = 1;
  assert.equal(C.placedCount(C.normalize(bad), 'bed'), 1);
});

test('データの ととのい：しるし・がめんの 字', () => {
  const all = [...Object.values(ITEMS), ...Object.values(WALLS), ...Object.values(FLOORS)];
  for (const d of all) for (const t of d.tags) assert.ok(TAGS[t], t);
  for (const sp of Object.values(SPECIES)) {
    for (const t of sp.likes) assert.ok(TAGS[t], t);
    // おきゃくさんが すきな かざりは どれも てに はいる
    for (const t of sp.likes) {
      const reachable = Object.values(SPECIES).some(o => o.gifts.some(g => {
        const [k, id] = g.includes(':') ? g.split(':') : ['item', g];
        return (k === 'wall' ? WALLS[id] : k === 'floor' ? FLOORS[id] : ITEMS[id]).tags.includes(t);
      })) || C.newSave().walls.some(w => WALLS[w].tags.includes(t));
      assert.ok(reachable, t);
    }
  }
  // 漢字を つかわない
  const texts = JSON.stringify({ SPECIES, ITEMS, WALLS, FLOORS, TAGS, FOODS });
  assert.ok(!/[一-鿿]/.test(texts), 'データに 漢字が ある');
});
