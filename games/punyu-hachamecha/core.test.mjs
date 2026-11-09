// node --test games/punyu-hachamecha/core.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as C from './core.mjs';
import * as D from './data.mjs';

const { FRIENDS, SHELLS, SHARDS, ISLANDS, BRIDGES, TREES, ROCKS, SEA, shellPos } = D;
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
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

test('さいしょは ふたりとも こまっていて、もやは はれていない', () => {
  const s = C.newSave();
  assert.equal(s.friends.chapu.state, 'sad');
  assert.equal(s.friends.kani.state, 'sad');
  assert.equal(C.smiles(s), 0);
  assert.deepEqual(s.cleared, []);
  assert.ok(C.walkable(s, s.player));
});

test('ばしょの データが しまの うえに ある', () => {
  const s = C.newSave();
  for (const f of FRIENDS) assert.ok(C.walkable(s, f.home) || C.islandAt(f.home), `${f.id} の ばしょ`);
  SHARDS.forEach((p, i) => assert.ok(C.walkable(s, p), `かけら ${i}`));
  SHELLS.forEach((sh, i) => assert.ok(C.walkable(s, shellPos(sh)), `かいがら ${i}`));
  for (const o of [...TREES, ...ROCKS]) assert.ok(C.islandAt(o), 'き・いわ');
});

test('しまの そとへは でられない・きを すりぬけない', () => {
  const s = C.newSave();
  for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, -0.7]]) {
    warp(s, D.PLAYER_START); C.setDir(s, x, z);
    for (let i = 0; i < 600; i++) { C.stepPlayer(s, 1 / 30); assert.ok(C.walkable(s, s.player)); }
    for (const t of TREES) assert.ok(Math.hypot(s.player.x - t.x, s.player.z - t.z) > 0.7 * t.s);
  }
  // きた（もやの はし）には わたれない
  const okashi = ISLANDS.find((i) => i.id === 'okashi');
  assert.ok(Math.hypot(s.player.x - okashi.x, s.player.z - okashi.z) > okashi.r + 5);
});

test('はしを わたって うみべへ いける', () => {
  const s = C.newSave();
  assert.ok(walkTo(s, BRIDGES[0].a));
  assert.ok(walkTo(s, BRIDGES[0].b));
  assert.ok(walkTo(s, home('kani')));
  assert.equal(C.islandAt(s.player), 'umibe');
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
  warp(s, { x: home('chapu').x + 1.5, z: home('chapu').z });
  assert.equal(C.nearTalkable(s), 'chapu');
});

test('ちゃぷ：はなしかけると ついてきて、かいがら 3つで えがお', () => {
  const s = C.newSave();
  warp(s, { x: home('chapu').x + 1, z: home('chapu').z });
  assert.deepEqual(C.talk(s, 'chapu'), { friend: 'chapu', play: 'shells' });
  assert.equal(s.friends.chapu.state, 'play');
  assert.deepEqual(s.party, ['chapu']);
  s.time = EBB;
  let r;
  for (const i of [0, 1, 2]) { warp(s, shellPos(SHELLS[i])); r = C.touchShells(s); assert.ok(r); }
  assert.equal(r.done, true);
  assert.equal(r.flowers, 1);
  assert.equal(s.friends.chapu.state, 'happy');
  assert.equal(s.shells, null);
  assert.ok(s.stickers.includes('chapu') && s.letters.includes('chapu'));
});

test('かいがらは なみに かくれている あいだは ひろえない', () => {
  const s = C.newSave();
  warp(s, { x: home('chapu').x + 1, z: home('chapu').z }); C.talk(s, 'chapu');
  warp(s, shellPos(SHELLS[0]));
  s.time = SEA.period * 0.25;            // なみが いちばん よせた とき
  assert.equal(C.touchShells(s), null);
  s.time = EBB;
  assert.equal(C.touchShells(s).index, 0);
  // にじいろは いちばん ひいた ときだけ
  s.time = 0;
  assert.equal(C.shellShown(SHELLS[3], s.time), false);
  assert.equal(C.shellShown(SHELLS[3], EBB), true);
});

test('にじいろの かいがらで はなまるが ふえる', () => {
  const s = C.newSave();
  warp(s, { x: home('chapu').x + 1, z: home('chapu').z }); C.talk(s, 'chapu');
  s.time = EBB;
  let r;
  for (const i of [3, 4, 0]) { warp(s, shellPos(SHELLS[i])); r = C.touchShells(s); }
  assert.equal(r.flowers, 3);
  assert.equal(s.friends.chapu.best, 3);
});

test('カニ：てを みぬいて 3かい かつと えがお。まけなしで はなまる 3つ', () => {
  const s = C.newSave();
  warp(s, { x: home('kani').x - 2, z: home('kani').z });
  assert.equal(C.talk(s, 'kani', seq(0.1, 0.5, 0.9)).play, 'janken');
  assert.ok(D.HANDS.includes(s.janken.opp));
  C.setDir(s, 1, 0); assert.equal(C.stepPlayer(s, 0.1), false);   // じゃんけん ちゅうは うごかない
  const r = winJanken(s);
  assert.equal(r.done, true);
  assert.equal(r.flowers, 3);
  assert.equal(s.friends.kani.state, 'happy');
  assert.deepEqual(s.party, ['kani']);
});

test('カニ：まけ・あいこ でも つづけられる。まけが おおいと はなまるは 1つ', () => {
  const s = C.newSave();
  warp(s, { x: home('kani').x - 2, z: home('kani').z }); C.talk(s, 'kani');
  const d = C.jankenPlay(s, s.janken.opp);
  assert.equal(d.result, 'draw'); assert.equal(d.done, false);
  const r = winJanken(s, { lose: 3 });
  assert.equal(r.done, true); assert.equal(r.flowers, 1);
});

test('じゃんけんは とちゅうで やめても また できる', () => {
  const s = C.newSave();
  warp(s, { x: home('kani').x - 2, z: home('kani').z }); C.talk(s, 'kani');
  assert.ok(C.jankenQuit(s));
  assert.equal(s.friends.kani.state, 'sad');
  assert.ok(C.talk(s, 'kani'));
});

test('てが みえる じかんは かいを かさねると みじかく なる', () => {
  assert.ok(C.tellMs(0) > C.tellMs(3));
  assert.ok(C.tellMs(99) >= 400);
});

test('ふたり えがおで もやが はれる。もういちど あそぶと はなまるを ふやせる', () => {
  const s = C.newSave();
  warp(s, { x: home('kani').x - 2, z: home('kani').z }); C.talk(s, 'kani');
  const r1 = winJanken(s, { lose: 1 });
  assert.deepEqual(r1.cleared, []); assert.equal(r1.flowers, 2);
  warp(s, { x: home('chapu').x + 1, z: home('chapu').z }); C.talk(s, 'chapu');
  s.time = EBB; let r2;
  for (const i of [0, 1, 2]) { warp(s, shellPos(SHELLS[i])); r2 = C.touchShells(s); }
  assert.deepEqual(r2.cleared, ['okashi']);
  assert.equal(C.smiles(s), 2);
  assert.ok(C.replay(s, 'kani'));
  const r3 = winJanken(s);
  assert.equal(r3.first, false); assert.equal(r3.better, true); assert.equal(s.friends.kani.best, 3);
  assert.equal(C.smiles(s), 2);
});

test('あんない：ちゃぷ → はしを わたって はまべ → カニ → もやの はし', () => {
  const s = C.newSave();
  assert.equal(C.guideGoal(s).id, 'chapu');
  assert.ok(followGuide(s, () => C.nearTalkable(s) === 'chapu'));
  C.talk(s, 'chapu');
  assert.equal(C.guideGoal(s).kind, 'beach');
  assert.equal(C.guideStep(s).kind, 'bridge');
  assert.ok(followGuide(s, () => C.islandAt(s.player) === 'umibe' && Math.hypot(s.player.x - D.BEACH_SPOT.x, s.player.z - D.BEACH_SPOT.z) < 1.5));
  s.time = EBB;
  for (const i of [0, 1, 2]) { warp(s, shellPos(SHELLS[i])); C.touchShells(s); }
  assert.equal(C.guideGoal(s).id, 'kani');
  assert.ok(followGuide(s, () => C.nearTalkable(s) === 'kani'));
  C.talk(s, 'kani'); assert.equal(C.guideGoal(s), null);
  winJanken(s);
  assert.equal(C.guideGoal(s).kind, 'soon');
  assert.ok(followGuide(s, () => C.islandAt(s.player) === 'nohara' && s.player.z < -18));
});

test('かけらは ふれると あつまる（1かい だけ）', () => {
  const s = C.newSave();
  warp(s, SHARDS[2]);
  assert.equal(C.touchShards(s), 2);
  assert.equal(C.touchShards(s), -1);
  assert.deepEqual(s.shards, [2]);
});

test('ほぞんデータを よみなおせる', () => {
  const s = C.newSave();
  warp(s, { x: home('chapu').x + 1, z: home('chapu').z }); C.talk(s, 'chapu');
  s.time = EBB; warp(s, shellPos(SHELLS[3])); C.touchShells(s);
  warp(s, SHARDS[0]); C.touchShards(s);
  const t = C.deserialize(C.serialize(s));
  assert.equal(t.friends.chapu.state, 'play');
  assert.deepEqual(t.shells, { got: [3] });
  assert.deepEqual(t.party, ['chapu']);
  assert.deepEqual(t.shards, [0]);
  assert.deepEqual(t.player, s.player);
});

test('こわれた ほぞんデータは つかわない・なおして よむ', () => {
  assert.equal(C.deserialize('{'), null);
  assert.equal(C.deserialize('{"version":1,"friends":{}}'), null);
  const t = C.deserialize({ version: 2, friends: { kani: { state: 'play', best: 9 }, chapu: { state: 'happy' } }, player: { x: 999, z: 0 }, shards: [1, 1, 99, 'a'], party: ['x'] });
  assert.equal(t.friends.kani.state, 'sad');
  assert.equal(t.friends.kani.best, 3);
  assert.deepEqual(t.party, ['chapu']);
  assert.deepEqual(t.stickers, ['chapu']);
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
