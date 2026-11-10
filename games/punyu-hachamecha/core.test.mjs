// node --test games/punyu-hachamecha/core.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as C from './core.mjs';
import * as D from './data.mjs';

const { FRIENDS, RESIDENTS, SHELLS, SHARDS, ISLANDS, BRIDGES, TREES, ROCKS, SEA, shellPos } = D;
const res = (id) => RESIDENTS.find((r) => r.id === id);
const allOpen = () => { const s = C.newSave(); s.cleared = D.FOGS.map((f) => f.id); return s; };
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
const mul = (seed) => () => { seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const warp = (s, p) => { s.player.x = p.x; s.player.z = p.z; };
const home = (id) => FRIENDS.find((f) => f.id === id).home;
// なみが いちばん ひいた じかん
const EBB = SEA.period * 0.75;
// めざす ほうへ あるく（あんないの とおりに すすむ）
function walkTo(s, goal, maxSec = 60) {
  for (let t = 0; t < maxSec; t += 1 / 30) {
    const dx = goal.x - s.player.x, dz = goal.z - s.player.z;
    if (Math.hypot(dx, dz) < 0.6) return true;
    C.setDir(s, dx, dz); C.stepPlayer(s, 1 / 30);
  }
  return false;
}
function followGuide(s, done, maxSec = 90) {
  for (let t = 0; t < maxSec; t += 1 / 30) {
    if (done()) return true;
    const g = C.guideStep(s);
    if (!g) return false;
    C.setDir(s, g.x - s.player.x, g.z - s.player.z); C.stepPlayer(s, 1 / 30);
    C.touchItems(s); C.touchStars(s);   // ふれた ものは ひろう（がめんと おなじ）
  }
  return done();
}
function winJanken(s, { lose = 0 } = {}) {
  let r;
  for (let i = 0; i < 20 && s.janken; i++) {
    const opp = s.janken.opp;
    const win = Object.keys(D.BEATS).find((h) => D.BEATS[h] === opp);
    r = C.jankenPlay(s, lose-- > 0 ? D.BEATS[opp] : win);
  }
  return r;
}

// ---- あそびを さいごまで やる てつづき ----
function doShells(s, idx = [0, 1, 2]) {
  s.time = EBB; let r;
  for (const i of idx) { warp(s, shellPos(SHELLS[i])); r = C.touchShells(s); }
  return r;
}
function doJelly(s, exact = true) {
  const order = s.deco.order.slice();
  for (const t of exact ? order : ['cream', 'cream', 'cream'].map((x, i) => (order.includes(x) && i > 0 ? D.TOPPINGS.find((y) => !order.includes(y)) : x))) C.decoPut(s, t);
  return C.decoDone(s);
}
function doStars(s, goods = 5) {
  for (let i = 0; i < 12 && s.stars.phase === 'collect'; i++) {
    const k = s.stars.spots.findIndex((_, j) => !s.stars.got.includes(j));
    warp(s, s.stars.spots[k]); C.touchStars(s);
  }
  warp(s, { x: D.PAD.x + 2.5, z: D.PAD.z });
  assert.ok(C.starAim(s));
  let r; for (let i = 0; i < D.STAR_NEED; i++) r = C.shootStar(s, i < goods);
  return r;
}
// いたずらかぜを おいかける（まっすぐ むかう だけ）
function doChase(s, maxSec = 240) {
  for (let t = 0; t < maxSec && s.chase; t += 1 / 30) {
    C.setDir(s, s.chase.x - s.player.x, s.chase.z - s.player.z); C.stepPlayer(s, 1 / 30);
    const r = C.stepChase(s, 1 / 30);
    if (r?.done) return r;
  }
  return null;
}
function doItems(s, id) { let r; for (const p of res(id).spots) { warp(s, p); r = C.touchItems(s); } return r; }
const near = (s, home) => warp(s, { x: home.x + 1.5, z: home.z + 1.5 });
function talkTo(s, id) { near(s, home(id)); return C.talk(s, id); }

test('さいしょは みんな こまっていて、もやは はれていない', () => {
  const s = C.newSave();
  for (const f of FRIENDS) assert.equal(s.friends[f.id].state, 'sad');
  for (const r of RESIDENTS) assert.equal(s.res[r.id].state, r.arrive ? 'away' : 'sad');
  assert.equal(C.smiles(s), 0);
  assert.deepEqual(s.cleared, []);
  assert.ok(C.walkable(s, s.player));
  // もやの しまには まだ いけない
  assert.equal(C.walkable(s, home('jelly')), false);
});

test('ばしょの データが しまの うえに ある', () => {
  const s = allOpen();
  const free = (p, what) => { assert.ok(C.walkable(s, p), what); const q = { ...p }; s.player = q; };
  for (const f of FRIENDS) free(f.home, `${f.id} の ばしょ`);
  for (const r of RESIDENTS) { free(r.home, `${r.id} の ばしょ`); (r.spots || []).forEach((p, i) => free(p, `${r.id} の もの ${i}`)); }
  SHARDS.forEach((p, i) => free(p, `かけら ${i}`));
  SHELLS.forEach((sh, i) => free(shellPos(sh), `かいがら ${i}`));
  [...D.STAR_SPOTS, D.STAR_RUN_TO].forEach((p, i) => free(p, `ほし ${i}`));
  for (const o of [...TREES, ...ROCKS, D.CAKE, D.PAD]) assert.ok(C.islandAt(o), 'き・いわ など');
  for (const b of BRIDGES) { assert.ok(C.walkable(s, b.a), b.id); assert.ok(C.walkable(s, b.b), b.id); }
  // もの・ひとは、き や いわに うまっていない（1ぽ あるいても おしだされない）
  const s2 = allOpen();
  const pts = [...FRIENDS.map((f) => f.home), ...RESIDENTS.flatMap((r) => [r.home, ...(r.spots || [])]), ...SHARDS, ...D.STAR_SPOTS, D.STAR_RUN_TO];
  for (const p of pts) {
    warp(s2, p); C.setDir(s2, 0.2, 0); C.stepPlayer(s2, 0.01);
    assert.ok(Math.hypot(s2.player.x - p.x, s2.player.z - p.z) < 0.1, `うまっている: ${JSON.stringify(p)}`);
  }
});

test('しまの そとへは でられない・きを すりぬけない', () => {
  const s = C.newSave();
  for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, -0.7]]) {
    warp(s, D.PLAYER_START); C.setDir(s, x, z);
    for (let i = 0; i < 600; i++) { C.stepPlayer(s, 1 / 30); assert.ok(C.walkable(s, s.player)); }
    for (const t of TREES) assert.ok(Math.hypot(s.player.x - t.x, s.player.z - t.z) > 0.4 * t.s);
  }
  assert.equal(C.islandAt(s.player) === 'okashi', false);
});

test('スティックの かたむきが はやさに なる', () => {
  const a = C.newSave(), b = C.newSave();
  C.setDir(a, 1, 0); C.setDir(b, 0.5, 0);
  C.stepPlayer(a, 0.1); C.stepPlayer(b, 0.1);
  assert.ok(a.player.x > b.player.x * 1.8 && b.player.x > 0);
  C.setDir(a, 0.05, 0); assert.deepEqual(a.dir, { x: 0, z: 0 });
});

test('とおくからは はなしかけられない', () => {
  const s = C.newSave();
  warp(s, { x: 10, z: 10 });
  assert.equal(C.nearTalkable(s), null);
  assert.equal(C.talk(s, 'chapu'), null);
  near(s, home('chapu'));
  assert.deepEqual(C.nearAction(s), { kind: 'friend', id: 'chapu' });
});

test('ちゃぷ：ついてきて、かいがら 3つで えがお。なみに かくれている あいだは ひろえない', () => {
  const s = C.newSave();
  assert.deepEqual(talkTo(s, 'chapu'), { friend: 'chapu', play: 'shells' });
  assert.deepEqual(s.party, ['chapu']);
  warp(s, shellPos(SHELLS[0])); s.time = SEA.period * 0.25;
  assert.equal(C.touchShells(s), null);
  assert.equal(C.shellShown(SHELLS[3], 0), false);
  const r = doShells(s);
  assert.equal(r.done, true); assert.equal(r.flowers, 1);
  assert.equal(s.friends.chapu.state, 'happy');
  const s2 = C.newSave(); talkTo(s2, 'chapu');
  assert.equal(doShells(s2, [3, 4, 0]).flowers, 3);
});

test('カニ：3かい かつと えがお。まけなしで はなまる 3つ、まけが おおいと 1つ。やめても また できる', () => {
  const s = C.newSave();
  assert.equal(talkTo(s, 'kani').play, 'janken');
  C.setDir(s, 1, 0); assert.equal(C.stepPlayer(s, 0.1), false);
  assert.ok(C.quit(s)); assert.equal(s.friends.kani.state, 'sad');
  assert.ok(C.talk(s, 'kani'));
  assert.equal(C.jankenPlay(s, s.janken.opp).result, 'draw');
  const r = winJanken(s);
  assert.equal(r.flowers, 3); assert.deepEqual(s.party, ['kani']);
  const s2 = C.newSave(); talkTo(s2, 'kani');
  assert.equal(winJanken(s2, { lose: 3 }).flowers, 1);
  assert.ok(C.tellMs(0) > C.tellMs(3) && C.tellMs(99) >= 400);
});

test('すんでいる こ：ものを あつめると えがお。ふたり えがおで おかしの もりの もやが はれる', () => {
  const s = C.newSave();
  near(s, res('popuri').home);
  assert.deepEqual(C.nearAction(s), { kind: 'res', id: 'popuri' });
  warp(s, res('popuri').spots[0]); assert.equal(C.touchItems(s), null);   // はなす まえは ひろえない
  near(s, res('popuri').home);
  assert.deepEqual(C.talkRes(s, 'popuri'), { res: 'popuri', quest: true });
  assert.equal(C.guideGoal(s).kind, 'item');
  const r = doItems(s, 'popuri');
  assert.equal(r.done, true); assert.deepEqual(r.cleared, []);
  assert.equal(s.res.popuri.state, 'happy'); assert.ok(s.stickers.includes('popuri'));
  talkTo(s, 'chapu');
  assert.deepEqual(doShells(s).cleared, ['okashi']);
  assert.ok(C.walkable(s, home('jelly')));
});

test('ゼリー：3つ いじょう のせると えがお。ちゅうもんどおりで はなまる 3つ', () => {
  const s = allOpen();
  assert.equal(talkTo(s, 'jelly', seq(0.1, 0.5, 0.9)).play, 'deco');
  assert.equal(new Set(s.deco.order).size, 3);
  C.decoPut(s, 'cream'); assert.equal(C.decoDone(s), null);
  assert.ok(C.decoUndo(s));
  const r = doJelly(s);
  assert.equal(r.flowers, 3); assert.equal(s.friends.jelly.deco.length, 3);
  assert.equal(C.decoMatch(['cream', 'ichigo', 'hoshi'], ['cream', 'cream', 'choco']), 1);
  for (let i = 0; i < 9; i++) C.decoPut(s, 'cream');
  const s2 = allOpen(); talkTo(s2, 'jelly');
  for (let i = 0; i < 9; i++) C.decoPut(s2, s2.deco.order[0]);
  assert.equal(s2.deco.put.length, D.DECO_MAX);
  assert.equal(C.decoDone(s2).flowers, 1);
});

test('くもくもさん：ほしを 5つ ひろって（1つは にげる）、ほしの だいから とばす', () => {
  const s = allOpen();
  assert.equal(talkTo(s, 'kumokumo').play, 'stars');
  warp(s, D.STAR_SPOTS[D.STAR_RUNNER]);
  assert.equal(C.touchStars(s).ran, true);
  assert.equal(C.starAim(s), false);
  assert.equal(C.guideGoal(s).kind, 'star');
  const r = doStars(s, 5);
  assert.equal(r.done, true); assert.equal(r.flowers, 3);
  const s2 = allOpen(); talkTo(s2, 'kumokumo');
  assert.equal(doStars(s2, 1).flowers, 1);
  assert.ok(C.ringGood(Math.PI / 2.4) && !C.ringGood(0));
});

test('いたずらかぜ：4かい タッチで えがお。ごちゃんの ブロックが もどる', () => {
  const s = allOpen();
  near(s, res('go').home);
  assert.deepEqual(C.talkRes(s, 'go'), { res: 'go', quest: false });
  assert.equal(C.blocksOf(s, 'go'), 1);
  assert.equal(talkTo(s, 'kaze').play, 'chase');
  const hoshi = ISLANDS.find((i) => i.id === 'hoshi');
  let maxR = 0, seen = 0;
  for (let t = 0; t < 240 && s.chase; t += 1 / 30) {
    C.setDir(s, s.chase.x - s.player.x, s.chase.z - s.player.z); C.stepPlayer(s, 1 / 30);
    const r = C.stepChase(s, 1 / 30);
    if (s.chase) { maxR = Math.max(maxR, Math.hypot(s.chase.x - hoshi.x, s.chase.z - hoshi.z)); seen = Math.max(seen, C.blocksOf(s, 'go')); }
    if (r?.done) { assert.ok(r.flowers >= 1); assert.deepEqual(r.also, ['go']); }
  }
  assert.equal(s.chase, null, 'つかまえられる');
  assert.ok(maxR < hoshi.r - 1, 'かぜは しまから でない');
  assert.equal(seen, 4);
  assert.equal(C.blocksOf(s, 'go'), 5);
  assert.equal(s.res.go.state, 'happy');
});

test('さんちゃん：ブロックを 2つ みつけると 3つに なる', () => {
  const s = allOpen();
  near(s, res('san').home); C.talkRes(s, 'san');
  assert.equal(C.blocksOf(s, 'san'), 1);
  warp(s, res('san').spots[0]); C.touchItems(s);
  assert.equal(C.blocksOf(s, 'san'), 2);
  assert.equal(doItems(s, 'san').done, true);
  assert.equal(C.blocksOf(s, 'san'), 3);
});

test('さいしょから さいごまで、あんないの とおりに あそべる', () => {
  const s = C.newSave();
  const play = {
    chapu: () => { assert.ok(followGuide(s, () => C.islandAt(s.player) === 'umibe')); return doShells(s); },
    kani: () => winJanken(s),
    jelly: () => doJelly(s),
    kumokumo: () => { assert.ok(followGuide(s, () => C.islandAt(s.player) === 'kumo' && s.stars.got.length > 0, 120)); return doStars(s, 3); },
    kaze: () => doChase(s),
  };
  const order = [];
  for (let n = 0; n < 30 && !s.ending; n++) {
    const g = C.guideGoal(s);
    assert.ok(g, 'つぎに する ことが ある');
    assert.ok(followGuide(s, () => !!C.nearAction(s), 150), `たどりつける: ${g.id}`);
    const a = C.nearAction(s);
    if (a.kind === 'res') { C.talkRes(s, a.id); if (res(a.id).spots) { assert.ok(followGuide(s, () => s.res[a.id].got.length > 0, 120), a.id); doItems(s, a.id); } order.push(a.id); continue; }
    assert.ok(C.talk(s, a.id), a.id);
    order.push(a.id);
    if (a.id === 'moya') { let r; for (let i = 0; i < D.CHEER_NEED; i++) r = C.cheer(s); assert.equal(r.ending, true); break; }
    assert.equal(play[a.id]().done, true, a.id);
  }
  assert.equal(s.ending, true, order.join(' → '));
  assert.equal(C.smiles(s), 11);
  assert.equal(order[order.length - 1], 'moya');
  assert.deepEqual(s.cleared.slice().sort(), ['hoshi', 'kumo', 'moya', 'okashi']);
  // エンディングの あとは ゆうがた。おうちへ あんない する
  assert.equal(s.phase, 'evening');
  assert.equal(C.guideGoal(s).kind, 'bed');
  assert.ok(s.hearts >= 20);
  // もういちど あそぶと、その この しまへ とぶ
  assert.ok(C.replay(s, 'kani')); assert.equal(C.islandAt(s.player), 'umibe');
  assert.equal(winJanken(s).first, false);
  assert.equal(C.smiles(s), 11);
});

// ---- まいにち・おみせ・アルバム ----
// エンディングまで すすめた データ
function cleared() {
  const s = allOpen();
  for (const id of D.MAIN_IDS) { s.friends[id].state = 'happy'; s.friends[id].ever = true; s.friends[id].best = 3; s.party.push(id); }
  s.friends.kumokumo.sky = 0; s.res.go.state = 'happy'; s.res.go.ever = true;
  talkTo(s, 'moya'); let r; for (let i = 0; i < D.CHEER_NEED; i++) r = C.cheer(s);
  assert.equal(r.evening, true);
  return s;
}
// きょうの おねがいを ぜんぶ かたづける
function doDay(s) {
  const play = { chapu: () => doShells(s), kani: () => winJanken(s), jelly: () => doJelly(s), kumokumo: () => doStars(s, 5), kaze: () => doChase(s) };
  let last;
  for (const t of s.today.slice()) {
    if (t.kind === 'friend') { assert.ok(talkTo(s, t.id), t.id); last = play[t.id](); assert.equal(last.done, true, t.id); }
    else { near(s, res(t.id).home); const r = C.talkRes(s, t.id); assert.ok(r, t.id); last = r.done ? r : doItems2(s, t.id); assert.equal(last.done, true, t.id); }
  }
  return last;
}
function doItems2(s, id) { let r; for (const p of C.spotsOf(s, res(id))) { warp(s, p); r = C.touchItems(s); } return r; }

test('まいにち：ゆうがたに おうちで ねむると つぎの ひ。3にんが まっていて、かずうさが ひっこして くる', () => {
  const s = cleared();
  assert.equal(C.sleep({ ...C.newSave() }), null);            // ゆうがた では ない
  warp(s, { x: D.HOUSE.x, z: D.HOUSE.z + 2.6 });
  assert.deepEqual(C.nearAction(s), { kind: 'bed', id: 'house' });
  const smilesBefore = C.smiles(s);
  const r = C.sleep(s, seq(0.13, 0.57, 0.31, 0.83, 0.45));
  assert.equal(r.day, 2); assert.equal(r.comer, 'b1');
  assert.deepEqual(s.today.map((t) => t.id), ['chapu', 'kani', 'popuri', 'b1']);
  assert.equal(s.friends.chapu.state, 'sad'); assert.ok(!s.party.includes('chapu') && s.party.includes('jelly'));
  assert.equal(C.smiles(s), smilesBefore, 'えがおの かずは へらない');
  assert.equal(s.cleared.length, 4);
  for (const p of C.spotsOf(s, res('popuri'))) assert.ok(C.walkable(s, p));
  assert.notDeepEqual(C.spotsOf(s, res('popuri')), res('popuri').spots);
  const before = s.hearts;
  const last = doDay(s);
  assert.equal(last.evening, true); assert.equal(last.bonus, 3);
  assert.equal(s.phase, 'evening');
  assert.ok(s.hearts >= before + 3 + 2 + 3 + 2);
  assert.equal(s.res.b1.ever, true);
  assert.equal(C.smiles(s), smilesBefore + 2);   // ぽぷり（はじめて）と いちちゃん
});

test('まいにち：10にちめまで あそべる。かずうさが 10にん そろうと おしろが たつ', () => {
  const s = cleared();
  const rng = mul(7);
  let castle = false;
  for (let d = 2; d <= 10; d++) {
    const r = C.sleep(s, rng);
    assert.equal(r.day, d);
    for (const t of s.today) if (t.kind === 'res') for (const p of C.spotsOf(s, res(t.id))) assert.ok(C.walkable(s, p), `${t.id} の もの`);
    if (r.comer) { assert.equal(C.blocksOf(s, r.comer), res(r.comer).n - res(r.comer).find); }
    const today = s.today.slice();
    for (const t of today) {
      if (t.kind !== 'res') continue;
      near(s, res(t.id).home); const q = C.talkRes(s, t.id); const fin = q.done ? q : doItems2(s, t.id);
      if (fin.castle) castle = true;
    }
    s.today = s.today.filter((t) => t.kind === 'friend');
    doDay(s);
    assert.equal(s.phase, 'evening', `${d}にちめ`);
    if (r.comer) assert.equal(C.blocksOf(s, r.comer), res(r.comer).n);
  }
  assert.equal(C.bunniesHome(s), 10);
  assert.ok(castle && C.castleBuilt(s));
  assert.ok(s.friends.kani.lv >= 1, 'じょうずに なると レベルが あがる');
  assert.ok(C.tellMs(0, 2) < C.tellMs(0, 0));
  assert.ok(s.album.sky.length >= 2 && s.album.jelly.length >= 2);
  assert.equal(C.sleep(s, rng).comer, null);
});

test('おみせ：ハートで きせかえを かって きる。かざりは じゅんばんに しまへ おかれる', () => {
  const s = C.newSave();
  assert.deepEqual(C.buy(s, 'ribbon'), { ok: false, short: true });
  s.hearts = 20;
  assert.deepEqual(C.buy(s, 'ribbon'), { ok: true, worn: true });
  assert.equal(s.hearts, 20 - D.PRICE.head); assert.equal(s.outfit.head, 'ribbon');
  C.buy(s, 'head-none'); assert.equal(s.outfit.head, 'head-none');
  C.buy(s, 'ribbon'); assert.equal(s.hearts, 20 - D.PRICE.head, 'もっている ものは ただで きられる');
  const r = C.buy(s, 'swing');
  assert.equal(r.ok, true); assert.deepEqual(r.spot, C.DECO_SPOTS[0]);
  assert.equal(C.buy(s, 'swing').ok, false);
  // かざりは とおれない
  warp(s, { x: r.spot.x, z: r.spot.z + 3 }); C.setDir(s, 0, -1);
  for (let i = 0; i < 60; i++) C.stepPlayer(s, 1 / 30);
  assert.ok(Math.hypot(s.player.x - r.spot.x, s.player.z - r.spot.z) > 1.4);
  const t = C.deserialize(C.serialize(s));
  assert.deepEqual(t.outfit, s.outfit); assert.deepEqual(t.decos, ['swing']); assert.equal(t.hearts, s.hearts);
});

test('かざりの ばしょ と かずうさの おうちは、しまの うえで なにとも かさならない', () => {
  const s = allOpen();
  assert.ok(C.DECO_SPOTS.length >= D.DECOS.length);
  const homes = RESIDENTS.filter((r) => r.arrive).map((r) => r.home);
  const all = [...C.DECO_SPOTS, ...homes, C.CASTLE_SPOT];
  all.forEach((p, i) => {
    assert.ok(C.walkable(s, p), JSON.stringify(p));
    all.forEach((q, j) => { if (i < j) assert.ok(Math.hypot(p.x - q.x, p.z - q.z) > 3, `${JSON.stringify(p)} ${JSON.stringify(q)}`); });
    for (const f of FRIENDS) assert.ok(Math.hypot(p.x - f.home.x, p.z - f.home.z) > 4);
  });
});

test('まえの ほぞんデータ（ハートが ない ころ）も よめる。えがおの ぶんの ハートを もらえる', () => {
  const t = C.deserialize({ version: 2, friends: { chapu: { state: 'happy', best: 2 }, kani: { state: 'happy', best: 3 } }, res: { popuri: { state: 'happy', got: [0, 1, 2] } }, shards: [0, 1] });
  assert.equal(t.friends.chapu.ever, true); assert.equal(C.smiles(t), 3);
  assert.equal(t.hearts, 3 * 2 + 2);
  assert.equal(t.day, 1); assert.equal(t.res.b1.state, 'away');
});

test('かけらは ふれると あつまる（1かい だけ）', () => {
  const s = C.newSave();
  warp(s, SHARDS[2]);
  assert.equal(C.touchShards(s), 2);
  assert.equal(C.touchShards(s), -1);
});

test('ほぞんデータを よみなおせる', () => {
  const s = C.newSave();
  talkTo(s, 'chapu'); s.time = EBB; warp(s, shellPos(SHELLS[3])); C.touchShells(s);
  near(s, res('popuri').home); C.talkRes(s, 'popuri'); warp(s, res('popuri').spots[1]); C.touchItems(s);
  talkTo(s, 'kani'); winJanken(s);
  warp(s, SHARDS[0]); C.touchShards(s);
  const t = C.deserialize(C.serialize(s));
  assert.equal(t.friends.chapu.state, 'play');
  assert.deepEqual(t.shells, { got: [3] });
  assert.deepEqual(t.party, ['chapu', 'kani']);
  assert.deepEqual(t.res.popuri, { state: 'play', got: [1], ever: false });
  assert.equal(t.hearts, s.hearts);
  assert.deepEqual(t.shards, [0]);
  assert.deepEqual(t.player, s.player);
  assert.equal(t.friends.kani.best, 3);
});

test('こわれた ほぞんデータは つかわない・なおして よむ', () => {
  assert.equal(C.deserialize('{'), null);
  assert.equal(C.deserialize('{"version":1,"friends":{}}'), null);
  const t = C.deserialize({ version: 2, friends: { kani: { state: 'play', best: 9 }, chapu: { state: 'happy' }, moya: { state: 'happy' }, jelly: { state: 'happy', deco: ['cream', 'x'] } }, player: { x: 999, z: 0 }, shards: [1, 1, 99, 'a'], party: ['x'] });
  assert.equal(t.friends.kani.state, 'sad');
  assert.equal(t.friends.moya.state, 'sad');
  assert.equal(t.ending, false);
  assert.deepEqual(t.friends.jelly.deco, ['cream']);
  assert.deepEqual(t.party, ['chapu', 'jelly']);
  assert.deepEqual(t.cleared, ['okashi']);
  assert.deepEqual(t.shards, [1]);
  assert.deepEqual(t.player, D.PLAYER_START);
});

// ---- 漢字チェック ----
const KANJI = /[一-龯]/;
function stringsOf(v, out = []) {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => stringsOf(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => stringsOf(x, out));
  return out;
}
test('データの もじに 漢字が ない', () => {
  for (const str of stringsOf({ ...D })) assert.ok(!KANJI.test(str), `漢字が まざっている: ${str}`);
});
test('index.html の もじに 漢字が ない', () => {
  const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  assert.ok(!KANJI.test(html), 'index.html に 漢字が ある');
});
test('app.mjs / view.mjs / core.mjs の 表示もじに 漢字が ない', () => {
  for (const file of ['app.mjs', 'view.mjs', 'core.mjs']) {
    let src = readFileSync(new URL('./' + file, import.meta.url), 'utf8');
    src = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    const literals = src.match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g) || [];
    for (const lit of literals) assert.ok(!KANJI.test(lit), `${file}: 漢字が まざっている: ${lit}`);
  }
});
