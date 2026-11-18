// node --test games/punyu-gakkou/core.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newSave, normalize, buy, takeOut, stored, putAway, recolor, hangPicture, placeCraft, friendComments, friendLoves,
  tryBag, bagDone, danceChart, judge, findNote, danceRate, danceStars, BEAT, COUNT_IN, SONG_BEATS, HIT,
  ropeClear, ropeStars, ropePeriod, JUMP_TIME, tagStars, newCraft, addPart, clampPart, normalizeCraft, craftReady, dayStickers, itemDef,
} from './core.mjs';
import { SHOP, CLASSMATES, BAG_ITEMS, CRAFT_MAX_PARTS, FEEDBACK, RECESS, SCHEDULE } from './data.mjs';
import { ITEMS, SPECIES } from '../fushigi-pet-hotel/data.mjs';

const PIC = 'data:image/jpeg;base64,AAAA';

test('クラスメートと おみせの かぐは ペットホテルに いる', () => {
  for (const sp of CLASSMATES) assert.ok(SPECIES[sp], sp);
  for (const r of RECESS) assert.ok(CLASSMATES.includes(r.sp));
  for (const e of SHOP) assert.ok(ITEMS[e.id], e.id);
});

test('じかんわりの もちものは ランドセルに いれられる もの', () => {
  for (const sc of SCHEDULE) assert.ok(BAG_ITEMS.find(b => b.id === sc.item && b.need), sc.item);
  for (const b of BAG_ITEMS.filter(b => !b.need)) assert.ok(b.say, b.id + ' に ことばが ある');
});

test('ランドセル：いる もの だけ はいる', () => {
  const packed = [];
  assert.equal(tryBag(packed, 'donut'), 'no');
  assert.equal(tryBag(packed, 'crayon'), 'ok');
  assert.equal(tryBag(packed, 'crayon'), 'dup');
  assert.equal(bagDone(packed), false);
  tryBag(packed, 'gym'); tryBag(packed, 'scissors');
  assert.equal(bagDone(packed), true);
});

test('ほぞん：こわれた データでも はじめられる', () => {
  assert.deepEqual(normalize(null), newSave());
  assert.deepEqual(normalize('x'), newSave());
  const s = normalize({ stickers: -5, outfit: 'zzz', room: { wall: 'nope', items: [{ id: 'nope', x: 1, y: 1 }, { id: 'sofa', x: 99999, y: 0 }] }, owned: { sofa: 1, nope: 3 }, pictures: ['javascript:1', PIC] });
  assert.equal(s.stickers, 0);
  assert.equal(s.outfit, 'ribbon');
  assert.equal(s.room.wall, 'pink');
  assert.deepEqual(s.room.items.map(i => i.id), ['sofa']);
  assert.ok(s.room.items[0].x <= 1000);
  assert.deepEqual(s.owned, { sofa: 1 });
  assert.deepEqual(s.pictures, [PIC]);
});

test('ほぞん：え と つくった ものの かざりは のこる', () => {
  const s = newSave();
  hangPicture(s, PIC);
  placeCraft(s, { base: 'cup', color: '#ffd84a', parts: [{ type: 'eyes', x: 0, y: -80, color: '#fff' }] });
  const t = normalize(JSON.parse(JSON.stringify(s)));
  assert.equal(t.room.items.filter(i => i.id === 'mypic').length, 1);
  assert.equal(t.room.items.filter(i => i.id === 'mycraft').length, 1);
  assert.equal(t.crafts[0].base, 'cup');
  // え が ない ref は けす
  const u = normalize({ ...JSON.parse(JSON.stringify(s)), pictures: [] });
  assert.equal(u.room.items.filter(i => i.id === 'mypic').length, 0);
});

test('え は 6まいまで。ふるい ものは かべからも はずれる', () => {
  const s = newSave();
  for (let i = 0; i < 8; i++) hangPicture(s, PIC + i);
  assert.equal(s.pictures.length, 6);
  const pics = s.room.items.filter(i => i.id === 'mypic');
  assert.equal(pics.length, 6);
  for (const it of pics) assert.ok(s.pictures[it.ref], 'ref が ある');
  assert.equal(s.pictures[5], PIC + 7);
});

test('おみせ：シールで かえて、しまって また だせる', () => {
  const s = newSave();
  s.stickers = 5;
  assert.equal(buy(s, 'sofa'), s.room.items.at(-1));
  assert.equal(s.stickers, 0);
  assert.equal(buy(s, 'cushion'), null, 'シールが たりない');
  const sofa = s.room.items.find(i => i.id === 'sofa');
  assert.equal(stored(s, 'sofa'), 0);
  assert.ok(putAway(s, sofa));
  assert.equal(stored(s, 'sofa'), 1);
  assert.ok(takeOut(s, 'sofa'));
  assert.equal(stored(s, 'sofa'), 0);
  assert.equal(takeOut(s, 'sofa'), null);
  assert.equal(putAway(s, s.room.items.find(i => i.id === 'bed')), false, 'ベッドは しまえない');
  assert.ok(recolor(sofa)); assert.equal(sofa.c, 1);
});

test('1にち あそぶと かぐが いくつか かえる シールが もらえる', () => {
  const all = dayStickers({ draw: true, recess: true, lunch: true, craft: true, dance: true, danceStars: 3 });
  const min = dayStickers({ draw: true, recess: true, lunch: true, craft: true, dance: true, danceStars: 0 });
  const prices = SHOP.map(e => e.price).sort((a, b) => a - b);
  assert.ok(min >= prices[0] + prices[1] + prices[2], 'いちばん すくなくても 3つ かえる');
  assert.ok(all >= 13);
});

test('ともだちの ことば：すきな ものが あると よろこぶ', () => {
  for (const sp of CLASSMATES) {
    const s = newSave();
    assert.ok(friendComments(s.room, sp).length >= 1);
    // すきな しるしの かぐを おく
    const like = Object.keys(ITEMS).find(id => SHOP.some(e => e.id === id) && ITEMS[id].tags.some(t => SPECIES[sp].likes.includes(t)));
    if (!like) continue;
    s.stickers = 99; buy(s, like);
    assert.equal(friendLoves(s.room, sp), true, sp + ' は ' + like + ' が すき');
  }
});

test('ダンス：おんぷは じゅんばんで、さいしょの 4はくは かぞえるだけ', () => {
  const ch = danceChart();
  assert.ok(ch.length >= 40);
  for (let i = 1; i < ch.length; i++) assert.ok(ch[i].t >= ch[i - 1].t);
  assert.ok(ch[0].t >= COUNT_IN * BEAT);
  assert.ok(ch.at(-1).beat < SONG_BEATS);
  for (const n of ch) assert.ok(n.lane >= 0 && n.lane <= 3);
  // おなじ ボタンが ちかすぎない（8ぶ より みじかくない）
  for (let i = 1; i < ch.length; i++) for (let j = i - 1; j >= 0 && ch[i].t - ch[j].t < BEAT; j--) {
    if (ch[i].lane === ch[j].lane) assert.ok(ch[i].t - ch[j].t >= BEAT / 2 - 1e-9);
  }
});

test('ダンス：はんてい と ほし', () => {
  assert.equal(judge(0.05), 'perfect');
  assert.equal(judge(-0.15), 'good');
  assert.equal(judge(0.3), null);
  const notes = [{ t: 1, lane: 0 }, { t: 1, lane: 1 }, { t: 2, lane: 0 }];
  assert.equal(findNote(notes, 1, 1.05), notes[1]);
  assert.equal(findNote(notes, 0, 1.5), null);
  assert.equal(findNote(notes, 0, 1.9), notes[2]);
  const n = danceChart().length;
  assert.equal(danceStars(danceRate(n, 0, n)), 3);
  assert.equal(danceStars(danceRate(0, 0, n)), 0);
  assert.equal(danceStars(danceRate(Math.ceil(n / 2), 0, n)), 1);
  assert.ok(HIT.good > HIT.perfect);
});

test('なわとび：とんでいる まんなかで なわが くれば こえられる', () => {
  assert.equal(ropeClear(null), false);
  assert.equal(ropeClear(0), false);
  assert.equal(ropeClear(JUMP_TIME / 2), true);
  assert.equal(ropeClear(JUMP_TIME), false);
  // いちばん はやくても、とんでいる あいだに なわが 1しゅう しない
  assert.ok(ropePeriod(100) > JUMP_TIME);
  assert.ok(ropePeriod(0) > ropePeriod(9));
  assert.equal(ropeStars(0), 3); assert.equal(ropeStars(5), 1);
  assert.equal(tagStars(10), 3); assert.equal(tagStars(100), 1);
});

test('こうさく：ぶひんは だいの まわりに おさまり、かずに かぎりが ある', () => {
  const c = newCraft('ball');
  assert.equal(craftReady(c), false);
  assert.ok(addPart(c, 'eyes'));
  assert.equal(addPart(c, 'nope'), null);
  const p = addPart(c, 'star', 999, -999);
  assert.ok(p.x <= 95 && p.y >= -175);
  assert.equal(craftReady(c), true);
  while (addPart(c, 'heart'));
  assert.equal(c.parts.length, CRAFT_MAX_PARTS);
  assert.deepEqual(clampPart({ x: -500, y: 500 }), { x: -95, y: 10 });
  assert.equal(normalizeCraft({ base: 'nope' }), null);
  assert.equal(normalizeCraft({ base: 'box', color: 'red', parts: [{ type: 'eyes', x: 0, y: 0 }, { type: 'bad', x: 0, y: 0 }] }).parts.length, 1);
});

test('かぐの きまりが ぜんぶ ある', () => {
  for (const id of ['mypic', 'mycraft', ...SHOP.map(e => e.id), 'bed', 'window', 'rug']) assert.ok(itemDef(id), id);
  assert.equal(FEEDBACK.length, 6);
});
