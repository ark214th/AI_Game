// node --test games/fushigi-pet-hotel/core.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from './core.mjs';
import { SPECIES, ITEMS, FOODS, TAGS, WALLS, FLOORS, NEEDS, TOYS, ACCS, SPECIALS, ROOM_HEARTS, MAX_ROOMS, SUITE_HEARTS, NORMAL_IDS, BIG_IDS } from './data.mjs';

const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
const rng = seq(0.1, 0.7, 0.3, 0.9, 0.5);
// mulberry32（きまった じゅんばんの らんすう）
const lcg = (seed = 12345) => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

function careOne(s, gi) {
  const g = s.today.guests[gi], sp = SPECIES[g.species];
  while (!C.isHappy(g)) {
    const n = C.needOf(g);
    if (n === 'food') C.feed(s, gi, sp.fav);
    else if (n === 'bath') C.bathDone(s, gi);
    else if (n === 'pet') C.petDone(s, gi, 1);
    else if (n === 'play') C.playDone(s, gi, sp.toy);
    else if (n === 'dress') C.dressDone(s, gi, sp.acc);
    else if (n === 'special') C.specialDone(s, gi);
    else C.sleepDone(s, gi);
  }
}

// 1にちを さいごまで：くる → あんない → おせわ → つぎの お客さん
function playDay(s, r = rng) {
  let gi = C.startDay(s, r);
  while (gi >= 0) {
    const free = C.freeRooms(s, s.today.guests[gi].species);
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
  careOne(s, 0);
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
  careOne(s, 0);
  const gi = C.arrive(s, rng);
  assert.equal(C.checkIn(s, gi, 0), null);
  assert.equal(C.checkIn(s, gi, 9), null);
  assert.ok(C.checkIn(s, gi, 1));
  assert.deepEqual(C.freeRooms(s), []);
  // スイートは おおきな お客さん だけ
  s.hearts = SUITE_HEARTS; s.rooms.push({ wall: 'cream', floor: 'wood', items: [], suite: true });
  assert.equal(C.roomFits(s, 'fuwari', 2), false);
  assert.equal(C.roomFits(s, 'dora', 2), true);
  assert.equal(C.roomFits(s, 'dora', 0), false);
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
  assert.equal(r.full, false);
  assert.ok(s.zukan.fuwari.tags.includes('mizu'));
  // くもの ものを おくと もう1かい よろこぶ。おなじ しるしは 1にち 1かい
  s.owned.kumobed = 1;
  C.placeItem(s, 1, 'kumobed', 500, 500);
  assert.deepEqual(C.decorReact(s, 1).tags, ['kumo']);
  assert.equal(C.decorReact(s, 1), null);
  // ぜんぶ そろうと ボーナス
  s.owned.hoshilamp = 1;
  C.placeItem(s, 1, 'hoshilamp', 800, 500);
  const full = C.decorReact(s, 1);
  assert.equal(full.full, true);
  assert.equal(full.hearts, 1 + 2);
  assert.ok(C.writeLetter(s, s.today.guests[gi], null).lines.some(l => l.includes('ぜんぶ')));
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

test('おしゃれ・その子だけの おせわ', () => {
  const s = C.newSave();
  C.startDay(s, rng);
  const g = s.today.guests[0], sp = SPECIES[g.species];
  C.checkIn(s, 0, 0);
  g.needs = ['dress', 'special', 'dress', 'sleep'];
  const other = Object.keys(ACCS).find(a => a !== sp.acc);
  assert.equal(C.dressDone(s, 0, other).hearts, 1);
  assert.equal(g.acc, other);
  assert.equal(C.specialDone(s, 0).hearts, 2);
  assert.equal(C.dressDone(s, 0, sp.acc).hearts, 2);
  assert.ok(s.zukan[g.species].acc);
  assert.equal(C.specialDone(s, 0).result, 'notNow');
});

test('ホテルが おおきく なると あたらしい 子が くる', () => {
  const s = C.newSave();
  assert.deepEqual(C.availableSpecies(s).sort(), ['fuwari', 'gorota']);
  const met = new Set(), r = lcg(7);
  let days = 0;
  while (days < 150) { playDay(s, r); days++; for (const id of NORMAL_IDS) if (s.zukan[id].met) met.add(id); if (met.size === NORMAL_IDS.length) break; }
  assert.equal(met.size, NORMAL_IDS.length, `${days}にち で ぜんいん きた`);
  assert.ok(days <= 45, `ぜんいん くるまで ${days}にち`);
});

test('スイートルームと おおきな お客さん', () => {
  const s = C.newSave();
  let days = 0, bigs = new Set(), suiteAt = null; const r = lcg(3);
  while (days < 60) {
    const gi0 = C.startDay(s, r); void gi0;
    if (C.suiteIdx(s) >= 0 && suiteAt === null) suiteAt = s.day;
    for (const q of s.today.queue) if (SPECIES[q].big) bigs.add(q);
    // のこりを あそぶ
    let gi = 0;
    while (gi >= 0) {
      const g = s.today.guests[gi];
      assert.ok(C.checkIn(s, gi, C.freeRooms(s, g.species)[0]), g.species);
      careOne(s, gi);
      gi = C.canArrive(s) ? C.arrive(s, r) : -1;
    }
    const res = C.endDay(s, r);
    days++;
    if (res.suite >= 0) assert.equal(s.rooms[res.suite].suite, true);
    if (bigs.size === BIG_IDS.length) break;
  }
  assert.ok(C.suiteIdx(s) >= 0, 'スイートが できる');
  assert.deepEqual([...bigs].sort(), [...BIG_IDS].sort(), 'おおきな お客さんが ふたりとも くる');
  const big = SPECIES[BIG_IDS[0]];
  assert.ok(big.likes.length >= 2);
});

test('ぷにゅランドの ともだちは ホテルが おおきい と すぐ くる', () => {
  const s = C.newSave();
  for (let i = 0; i < 7; i++) s.rooms.push({ wall: 'cream', floor: 'wood', items: [] });
  for (const id of NORMAL_IDS.filter(id => !SPECIES[id].land)) s.zukan[id].met = 10;
  const landNormal = NORMAL_IDS.filter(id => SPECIES[id].land);
  assert.equal(landNormal.length, 4);
  assert.ok(landNormal.every(id => C.availableSpecies(s).includes(id)));
  // あたらしい 子が いつも さきに くる わけでは ない
  let landFirst = 0;
  const r = lcg(5);
  for (let k = 0; k < 40; k++) {
    const u = structuredClone(s); u.day = 30 + k;
    C.startDay(u, r);
    if (SPECIES[u.today.guests[0].species].land) landFirst++;
  }
  assert.ok(landFirst > 0 && landFirst < 40, `あたらしい 子も ふつうに まざる: ${landFirst}/40`);
  // おおきな お客さんの ひ：きのうの おおきな お客さんとは ちがう 子
  const t = C.newSave();
  for (let i = 0; i < 7; i++) t.rooms.push({ wall: 'cream', floor: 'wood', items: [] });
  t.rooms.push({ wall: 'cream', floor: 'wood', items: [], suite: true });
  t.day = 10; t.seen.dora = 7; t.seen.ku = 4; t.bigDay = t.day;
  C.startDay(t, rng);
  assert.notEqual(t.today.queue[0], 'dora');
  assert.ok(SPECIES[t.today.queue[0]].big);
});

test('ホテルが いっぱいに なると あたらしい どうぶつが くる', () => {
  const s = C.newSave();
  const late = NORMAL_IDS.filter(id => SPECIES[id].from === 9);
  assert.equal(late.length, 6);
  for (let i = 0; i < 6; i++) s.rooms.push({ wall: 'cream', floor: 'wood', items: [] });
  assert.ok(late.every(id => !C.availableSpecies(s).includes(id)), 'へやが 8つでは まだ こない');
  s.rooms.push({ wall: 'cream', floor: 'wood', items: [] });
  assert.ok(late.every(id => C.availableSpecies(s).includes(id)), 'へやが 9つで くる');
  for (const id of NORMAL_IDS.filter(id => SPECIES[id].from < 9)) s.zukan[id].met = 10;
  // まいにち くる 子は ばらばら。きのう きた 子は つづけて こない
  const comes = new Set();
  const r = lcg(9);
  for (let d = 0; d < 40; d++) {
    C.startDay(s, r);
    const ids = [s.today.guests[0].species, ...s.today.queue];
    for (const id of ids) { comes.add(id); s.seen[id] = s.day; }
    s.day++;
  }
  assert.ok(late.every(id => comes.has(id)), 'あたらしい どうぶつも いつか くる');
  assert.ok(NORMAL_IDS.filter(id => SPECIES[id].from < 9).some(id => comes.has(id)), 'まえからの 子も くる');
});

test('いろがえ と おさらの たべもの', () => {
  const it = C.clampItem({ id: 'sofa', x: 500, y: 500 });
  assert.equal(it.c, 0);
  for (let i = 0; i < ITEMS.sofa.colors.length; i++) C.recolor(it);
  assert.equal(it.c, 0, 'ひとまわり すると もとの いろ');
  assert.equal(C.recolor(C.clampItem({ id: 'iwa', x: 500, y: 500 })), false);
  for (const id of NORMAL_IDS) {
    const f = C.plateFoods(id, rng);
    assert.equal(f.length, 4);
    assert.ok(f.includes(SPECIES[id].fav) && f.includes(SPECIES[id].dislike));
    assert.equal(new Set(f).size, 4);
  }
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
  while (C.regularCount(s) < MAX_ROOMS && days < 200) { playDay(s); days++; }
  assert.equal(C.regularCount(s), MAX_ROOMS);
  assert.ok(days <= 30, `へやが ぜんぶ そろうまで ${days}にち`);
  assert.ok(s.hearts >= ROOM_HEARTS[MAX_ROOMS - 1]);
  assert.ok(s.letters.length <= 60);
});

test('おみやげで いつかは ぜんぶ そろう', () => {
  const s = C.newSave();
  // きまった らんすう（まいかい おなじ けっか）で 100にち
  let seed = 12345; const r = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let d = 0; d < 200; d++) playDay(s, r);
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
  for (const sp of Object.values(SPECIES)) {
    assert.ok(FOODS.some(f => f.id === sp.fav) && FOODS.some(f => f.id === sp.dislike) && sp.fav !== sp.dislike);
    assert.ok(ACCS[sp.acc]);
    if (!sp.big) assert.ok(SPECIALS[sp.special], sp.name);
    for (const g of sp.gifts) { const [k, id] = g.includes(':') ? g.split(':') : ['item', g]; assert.ok((k === 'wall' ? WALLS : k === 'floor' ? FLOORS : ITEMS)[id], g); }
  }
  const texts = JSON.stringify({ SPECIES, ITEMS, WALLS, FLOORS, TAGS, FOODS, NEEDS, TOYS, ACCS, SPECIALS });
  assert.ok(!/[一-鿿]/.test(texts), 'データに 漢字が ある');
  // ごはんの ふきだしは たべものの えに しない
  assert.ok(!FOODS.some(f => f.icon === NEEDS.food.icon));
});
