// node --test games/punyu-gakkou/core.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newSave, normalize, buy, takeOut, stored, putAway, recolor, hangPicture, placeCraft, friendComments, friendLoves,
  tryBag, bagDone, bagChoices, dayNeeds, danceChart, judge, findNote, danceRate, danceStars, beatOf, songBeats, COUNT_IN, HIT,
  finishDay, diaryLines, mathQuestions, kokugoQuestions, quizStars, raceTap, raceDecay, raceRank, normalizeCostume, WORDS,
  ropeClear, ropeStars, ropePeriod, JUMP_TIME, tagStars, newCraft, addPart, clampPart, normalizeCraft, craftReady, dayStickers, itemDef,
} from './core.mjs';
import { SHOP, CLASSMATES, BAG_ITEMS, CRAFT_MAX_PARTS, SONGS, POSES } from './data.mjs';
import { DAYS, SUBJECTS, LUNCHES, AUDIENCE } from './story.mjs';
import { ITEMS, SPECIES } from '../fushigi-pet-hotel/data.mjs';

const PIC = 'data:image/jpeg;base64,AAAA';

test('クラスメートと おみせの かぐと みにくる みんなは ペットホテルに いる', () => {
  for (const sp of [...CLASSMATES, ...AUDIENCE]) assert.ok(SPECIES[sp], sp);
  for (const e of SHOP) assert.ok(ITEMS[e.id], e.id);
});

test('1しゅうかんの よてい：じゅぎょう・やすみじかん・きゅうしょく・はなす ひとが そろっている', () => {
  const who = new Set([...CLASSMATES, 'punyu', 'pururun', 'dora']);
  for (let d = 1; d <= 5; d++) {
    const D = DAYS[d];
    assert.equal(D.periods.length, 3);
    for (const p of D.periods) if (p) assert.ok(SUBJECTS[p.id], p.id);
    for (const p of D.periods) if (p?.arg?.song) assert.ok(SONGS[p.arg.song], p.arg.song);
    assert.ok(D.recess.length >= 2);
    for (const r of D.recess) assert.ok(CLASSMATES.includes(r.sp));
    assert.ok(LUNCHES[D.lunch]);
    for (const sp of Object.keys(LUNCHES[D.lunch].talk)) assert.ok(CLASSMATES.includes(sp));
    for (const l of [...D.walk, ...D.hello, ...D.bye, ...(D.lunchEnd || []), ...D.morning]) if (l.who) assert.ok(who.has(l.who), l.who);
    assert.ok(CLASSMATES.includes(D.walkWith));
  }
  assert.equal(DAYS[5].periods[2].id, 'recital', 'きんようびは はっぴょうかい');
});

test('ランドセル：その ひの じかんわりで いる ものが かわる', () => {
  for (let d = 1; d <= 5; d++) {
    const needs = dayNeeds(d), ch = bagChoices(d, 0);
    assert.equal(ch.length, 6);
    assert.equal(new Set(ch.map(x => x.id)).size, 6);
    for (const n of needs) assert.ok(ch.find(x => x.id === n && x.need), d + ':' + n);
    for (const x of ch.filter(x => !x.need)) assert.ok(x.say);
  }
  assert.deepEqual(dayNeeds(5), ['gym', 'costumebag']);
  const packed = [], needs = dayNeeds(1);
  assert.equal(tryBag(packed, 'donut', needs), 'no');
  assert.equal(tryBag(packed, 'crayon', needs), 'ok');
  assert.equal(tryBag(packed, 'crayon', needs), 'dup');
  assert.equal(bagDone(packed, needs), false);
  tryBag(packed, 'gym', needs); tryBag(packed, 'scissors', needs);
  assert.equal(bagDone(packed, needs), true);
});

test('1しゅうかん：にっきを かくと つぎの ひ。きんようびの つぎは また げつようび', () => {
  const s = newSave();
  for (let d = 1; d <= 5; d++) { assert.equal(s.week.day, d); finishDay(s, d, { lines: diaryLines(d, { draw: true, danceStars: 2 }, 'ふわり'), pic: null, stars: 2, friend: 'fuwari' }); }
  assert.equal(s.week.day, 1); assert.equal(s.week.cleared, true); assert.equal(s.week.weeks, 1);
  const t = normalize(JSON.parse(JSON.stringify(s)));
  assert.equal(t.week.cleared, true); assert.equal(Object.keys(t.diary).length, 5);
  assert.ok(t.diary[5].lines.some(l => l.includes('はっぴょうかい')));
  assert.equal(normalize({ week: { day: 9 } }).week.day, 1);
});

test('さんすう と こくご の もんだい', () => {
  for (let seed = 0; seed < 30; seed++) {
    for (const q of mathQuestions(seed)) {
      assert.ok(q.choices.includes(q.answer)); assert.equal(new Set(q.choices).size, 3);
      assert.ok(q.answer >= 1 && q.answer <= 10, 'こたえは 10まで');
      assert.ok(q.choices.every(n => n >= 1));
    }
    for (const q of kokugoQuestions(seed)) {
      assert.ok(q.choices.includes(q.answer)); assert.equal(new Set(q.choices).size, 3);
      assert.equal([...q.word][q.hole], q.answer);
    }
  }
  for (const [w] of WORDS) assert.match(w, /^[ぁ-ん]+$/, 'ひらがな だけ');
  assert.equal(quizStars(0), 3); assert.equal(quizStars(4), 1);
});

test('かけっこ：はやく タッチすれば 1いに なれる', () => {
  let v = 0, me = 0; const op = [0, 0];
  for (let t = 0; t < 30 && me < 100; t += 0.05) {
    if (Math.round(t * 20) % 5 === 0) v = raceTap(v);      // 1びょうに 4かい
    v = raceDecay(v, 0.05); me += v * 0.05 * 0.7;
    op[0] += 10.5 * 0.05 * 0.7; op[1] += 11.3 * 0.05 * 0.7;
  }
  assert.equal(raceRank(me, op), 1);
  assert.equal(raceRank(10, [20, 5]), 2);
});

test('いしょう：へんな データは なおす', () => {
  assert.equal(normalizeCostume(null), null);
  assert.deepEqual(normalizeCostume({ hat: 'x', cape: 'y', deco: 'z' }), { hat: 'crown', cape: '#ff6f91', deco: 'sparkle' });
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

test('ダンス：どの きょくも おんぷは じゅんばんで、ボタンの かずに おさまる', () => {
  for (const id of Object.keys(SONGS)) for (const part of [0, 1]) {
    const ch = danceChart(id, part), BEAT = beatOf(id);
    assert.ok(ch.length >= 12, id);
    for (let i = 1; i < ch.length; i++) assert.ok(ch[i].t >= ch[i - 1].t);
    assert.ok(ch[0].t >= COUNT_IN * BEAT);
    assert.ok(ch.at(-1).beat < songBeats(id, part));
    for (const n of ch) assert.ok(n.lane >= 0 && n.lane < SONGS[id].lanes, id + ' lane');
    for (const k of SONGS[id].bars) assert.ok(SONGS[id].pat[k], id + ' ' + k);
    // おなじ ボタンが 8ぶ より ちかくない
    for (let i = 1; i < ch.length; i++) for (let j = i - 1; j >= 0 && ch[i].t - ch[j].t < BEAT; j--) {
      if (ch[i].lane === ch[j].lane) assert.ok(ch[i].t - ch[j].t >= BEAT / 2 - 1e-9, id);
    }
    if (part === 1) assert.ok(ch.length < danceChart(id).length);
    assert.equal(SONGS[id].mel.length, 32);
  }
  assert.ok(POSES.length >= 4);
});

test('ダンス：はんてい と ほし', () => {
  assert.equal(judge(0.05), 'perfect');
  assert.equal(judge(-0.15), 'good');
  assert.equal(judge(0.3), null);
  const notes = [{ t: 1, lane: 0 }, { t: 1, lane: 1 }, { t: 2, lane: 0 }];
  assert.equal(findNote(notes, 1, 1.05), notes[1]);
  assert.equal(findNote(notes, 0, 1.5), null);
  assert.equal(findNote(notes, 0, 1.9), notes[2]);
  const n = danceChart('kirakira').length;
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
});
