// node --test games/fushigi-pet-hotel/core.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from './core.mjs';
import { SPECIES, ITEMS, FOODS, TAGS, WALLS, FLOORS, NEEDS, TOYS, ROOM_HEARTS, MAX_ROOMS } from './data.mjs';

const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
const rng = seq(0.1, 0.7, 0.3, 0.9, 0.5);

function careOne(s, gi) {
  const g = s.today.guests[gi], sp = SPECIES[g.species];
  while (!C.isHappy(g)) {
    const n = C.needOf(g);
    if (n === 'food') C.feed(s, gi, sp.fav);
    else if (n === 'bath') C.bathDone(s, gi);
    else if (n === 'pet') C.petDone(s, gi, 1);
    else if (n === 'play') C.playDone(s, gi, sp.toy);
    else C.sleepDone(s, gi);
  }
}

// 1にちを さいごまで：くる → あんない → おせわ → つぎの お客さん
function playDay(s, r = rng) {
  let gi = C.startDay(s, r);
  while (gi >= 0) {
    const free = C.freeRooms(s);
    const best = free.map(i => ({ i, n: C.likedTags(s.rooms[i], s.today.guests[gi].species).length })).sort((a, b) => b.n - a.n)[0];
    assert.ok(C.checkIn(s, gi, best.i));
    careOne(s, gi);
    gi = C.canArrive(s) ? C.arrive(s, r) : -1;
  }
  assert.ok(C.allDone(s));
  return C.endDay(s, r);
}

test('1にちを さいごまで あそべる（ひとりずつ くる）', () => {
  const s = C.newSave();
  const gi = C.startDay(s, rng);
  assert.equal(gi, 0);
  assert.equal(s.today.guests.length, 1, 'さいしょは 1ぴき');
  assert.equal(s.today.queue.length, 1);
  const g = s.today.guests[0];
  assert.equal(g.room, -1, 'ロビーで まつ');
  assert.equal(C.needOf(g), null, 'へやに はいるまで おせわは ない');
  assert.equal(g.needs.length, 4);
  assert.equal(g.needs[3], 'sleep', 'ねるのは さいご');
  assert.ok(SPECIES[g.species].likes.includes(g.wish));
  assert.equal(C.canArrive(s), false, 'あんない するまで つぎは こない');
  C.checkIn(s, 0, 1);
  assert.equal(C.canArrive(s), false, 'おせわを 1つ するまで こない');
  C.bathDone(s, 0); C.feed(s, 0, 'apple'); C.petDone(s, 0, 0); C.playDone(s, 0, 'ball');
  assert.equal(C.canArrive(s), true);
  assert.equal(C.endDay(s, rng), null, 'ぜんいん おわるまで よるに ならない');
  const s2 = C.newSave();
  const res = playDay(s2);
  assert.equal(res.letters.length, 2);
  assert.equal(s2.day, 2);
  assert.equal(s2.today, null);
  assert.equal(s2.letters.length, 2);
});

test('チェックイン：ほかの 子が いる へやには はいれない', () => {
  const s = C.newSave();
  C.startDay(s, rng);
  assert.ok(C.checkIn(s, 0, 0));
  assert.equal(C.checkIn(s, 0, 1), null, '2かい はいれない');
  C.feed(s, 0, 'apple'); C.bathDone(s, 0); C.petDone(s, 0, 0); C.playDone(s, 0, 'ball');
  const gi = C.arrive(s, rng);
  assert.equal(C.checkIn(s, gi, 0), null);
  assert.equal(C.checkIn(s, gi, 9), null);
  assert.ok(C.checkIn(s, gi, 1));
  assert.deepEqual(C.freeRooms(s), []);
});

test('すきな かざりの へやに あんないすると よろこぶ', () => {
  const s = C.newSave();
  s.rooms[1].wall = 'mizu';
  C.startDay(s, seq(0.99));
  const gi = 0;
  s.today.guests[gi].species = 'fuwari';
  const r = C.checkIn(s, gi, 1);
  assert.deepEqual(r.liked, ['mizu']);
  assert.equal(r.hearts, 1);
  assert.ok(s.zukan.fuwari.tags.includes('mizu'));
  // くもの ものを おくと もう1かい よろこぶ。おなじ しるしは 1にち 1かい
  s.owned.kumobed = 1;
  C.placeItem(s, 1, 'kumobed', 500, 500);
  assert.deepEqual(C.decorReact(s, 1).tags, ['kumo']);
  assert.equal(C.decorReact(s, 1), null);
});

test('ごはん：すき=ハート2、ふつう=1、にがて=たべない', () => {
  const s = C.newSave();
  C.startDay(s, rng);
  const gi = 0, g = s.today.guests[gi], sp = SPECIES[g.species];
  C.checkIn(s, gi, 0);
  g.needs = ['food', 'bath', 'pet', 'sleep'];
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

test('あそぶ・ねる：すきな おもちゃ と ベッド', () => {
  const s = C.newSave();
  C.startDay(s, rng);
  const g = s.today.guests[0], sp = SPECIES[g.species];
  C.checkIn(s, 0, 0);
  g.needs = ['play', 'sleep'];
  const other = Object.keys(TOYS).find(t => t !== sp.toy);
  const r1 = C.playDone(s, 0, other);
  assert.equal(r1.hearts, 1); assert.equal(s.zukan[g.species].toy, false);
  g.done = 0;
  const r2 = C.playDone(s, 0, sp.toy);
  assert.equal(r2.hearts, 2); assert.ok(s.zukan[g.species].toy);
  s.rooms[0].items = s.rooms[0].items.filter(it => !ITEMS[it.id].bed);
  assert.equal(C.sleepDone(s, 0).hearts, 1, 'ベッドが ないと ハート1');
  g.done = 1;
  C.placeItem(s, 0, 'bed', 300, 470);
  assert.equal(C.sleepDone(s, 0).hearts, 2);
  assert.ok(C.isHappy(g));
});

test('なでる ばしょの はんてい', () => {
  assert.equal(C.spotAt(0, -0.7), 'atama');
  assert.equal(C.spotAt(0.7, 0.1), 'hoppe');
  assert.equal(C.spotAt(-0.7, 0.1), 'hoppe');
  assert.equal(C.spotAt(0, 0.5), 'onaka');
});

test('おてがみ：へやの かんそうと ヒント', () => {
  const s = C.newSave();
  C.startDay(s, rng);
  const g = s.today.guests[0];
  g.species = 'fuwari'; g.wish = 'kumo';
  C.checkIn(s, 0, 0);
  g.log = { food: 'fav', bed: true };
  const plain = C.writeLetter(s, g, { kind: 'item', id: 'kumobed' });
  assert.ok(plain.lines.some(l => l.includes('くも☁️の ある へやだと')), 'すきな ものが ない へや → つぎの ヒント');
  assert.ok(plain.lines.some(l => l.includes('にじいろアメ')));
  assert.ok(plain.lines.some(l => l.includes('ぐっすり')));
  assert.equal(plain.lines.at(-1), 'ふわりより');
  s.owned.hoshilamp = 1; C.placeItem(s, 0, 'hoshilamp', 800, 500);
  assert.ok(C.writeLetter(s, g, null).lines.some(l => l.includes('ほしの ランプが とっても すてき')));
});

test('ハートが たまると へやが ふえる（さいだいまで）', () => {
  const s = C.newSave();
  let days = 0;
  while (s.rooms.length < MAX_ROOMS && days < 200) { playDay(s); days++; }
  assert.equal(s.rooms.length, MAX_ROOMS);
  assert.ok(days <= 30, `へやが ぜんぶ そろうまで ${days}にち`);
  assert.ok(s.hearts >= ROOM_HEARTS[MAX_ROOMS - 1]);
  assert.ok(s.letters.length <= 60);
});

test('おみやげで いつかは ぜんぶ そろう', () => {
  const s = C.newSave();
  for (let d = 0; d < 60; d++) playDay(s, Math.random);
  for (const sp of Object.values(SPECIES)) for (const g of sp.gifts) {
    const [k, id] = g.includes(':') ? g.split(':') : ['item', g];
    if (k === 'wall') assert.ok(s.walls.includes(id), id);
    else if (k === 'floor') assert.ok(s.floors.includes(id), id);
    else assert.ok(s.owned[id] > 0, id);
  }
});

test('家具は もっている かず までしか おけない', () => {
  const s = C.newSave();
  assert.equal(C.available(s, 'bed'), 0);
  assert.equal(C.placeItem(s, 0, 'bed', 500, 500), null);
  const rug = C.placeItem(s, 0, 'rug', -100, 9999);
  assert.ok(rug.x >= 0 && rug.y <= 625, 'へやの そとには おけない');
  C.removeItem(s, 0, rug);
  assert.equal(C.available(s, 'rug'), 1);
});

test('ほぞんデータを よみなおしても おなじ', () => {
  const s = C.newSave();
  C.startDay(s, rng);
  C.checkIn(s, 0, 1);
  C.feed(s, 0, SPECIES[s.today.guests[0].species].fav);
  s.letters.push(C.writeLetter(s, s.today.guests[0], { kind: 'wall', id: 'mori' }));
  const back = C.normalize(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(back, s);
  assert.deepEqual(C.normalize(null), C.newSave());
  assert.equal(C.normalize({ v: 1, rooms: 'x', owned: { bed: -3 } }).rooms.length, 2);
  const bad = JSON.parse(JSON.stringify(s)); bad.owned.bed = 1;
  assert.equal(C.placedCount(C.normalize(bad), 'bed'), 1);
  // まえの バージョンの データ（queue が ない、ねる が ない）も よめる
  const old = { v: 1, day: 3, hearts: 5, today: { guests: [{ species: 'gorota', room: 0, needs: ['food', 'bath', 'pet'], done: 1, hearts: 1, reacted: [] }] } };
  const o = C.normalize(old);
  assert.equal(o.today.guests[0].room, 0);
  assert.deepEqual(o.today.queue, []);
  assert.equal(C.needOf(o.today.guests[0]), 'bath');
});

test('データの ととのい：しるし・がめんの 字', () => {
  const all = [...Object.values(ITEMS), ...Object.values(WALLS), ...Object.values(FLOORS)];
  for (const d of all) for (const t of d.tags) assert.ok(TAGS[t], t);
  for (const sp of Object.values(SPECIES)) {
    assert.ok(TOYS[sp.toy]);
    for (const t of sp.likes) {
      assert.ok(TAGS[t], t);
      const reachable = Object.values(SPECIES).some(o => o.gifts.some(g => {
        const [k, id] = g.includes(':') ? g.split(':') : ['item', g];
        return (k === 'wall' ? WALLS[id] : k === 'floor' ? FLOORS[id] : ITEMS[id]).tags.includes(t);
      })) || C.newSave().walls.some(w => WALLS[w].tags.includes(t));
      assert.ok(reachable, t);
    }
  }
  const texts = JSON.stringify({ SPECIES, ITEMS, WALLS, FLOORS, TAGS, FOODS, NEEDS, TOYS });
  assert.ok(!/[一-鿿]/.test(texts), 'データに 漢字が ある');
  // ごはんの ふきだしは たべものの えに しない
  assert.ok(!FOODS.some(f => f.icon === NEEDS.food.icon));
});
