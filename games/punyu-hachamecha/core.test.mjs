// node --test games/punyu-hachamecha/core.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as C from './core.mjs';
import { FRIENDS, STAGES, STICKERS, LETTERS, HAT_SPOTS, STAR_SPOTS, STAR_RUNNER, SHELL_SPOTS, SHARD_SPOTS } from './data.mjs';

const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
// あいてが いつも チョキを だす らんすう（グーで かてる）
const chokiRng = seq(0.5);
// プレイヤーを ばしょへ ワープ
const warp = (s, p) => { s.player.x = p.x; s.player.z = p.z; };
// ともだちを「こまった」に して ミッションを はじめる
function startAt(s, id) {
  const f = FRIENDS.find((x) => x.id === id);
  warp(s, f.pos);
  return C.startMission(s, id);
}

test('さいしょは カニと ちゃぷが こまっている', () => {
  const s = C.newSave();
  assert.equal(s.friends.kani.state, 'sad');
  assert.equal(s.friends.chapu.state, 'sad');
  assert.equal(s.friends.kaze.state, 'away');
  assert.equal(s.friends.jelly.state, 'away');
  assert.equal(s.friends.kumokumo.state, 'away');
  assert.equal(s.stage, 0);
  assert.equal(s.smiles, 0);
});

test('いどう：あるけて、しまの そとへ でない', () => {
  const s = C.newSave();
  const x0 = s.player.x;
  C.setDir(s, 1, 0);
  for (let i = 0; i < 30; i++) C.stepPlayer(s, 0.1);
  assert.ok(s.player.x > x0, 'ひがしへ すすむ');
  for (let i = 0; i < 300; i++) C.stepPlayer(s, 0.1);
  assert.ok(Math.hypot(s.player.x, s.player.z) <= 24.21, 'はしで とまる');
  C.setDir(s, 0, 0);
  const px = s.player.x;
  C.stepPlayer(s, 0.1);
  assert.equal(s.player.x, px, 'とまると うごかない');
});

test('じゃんけん：2かい かったら せいこう、カニが おおきくなる', () => {
  const s = C.newSave();
  const m = startAt(s, 'kani');
  assert.equal(m.type, 'janken');
  let r = C.jankenPlay(s, 'gu', chokiRng);
  assert.equal(r.result, 'win');
  assert.equal(r.done, false);
  assert.ok(s.mission.crab > 1, 'カニが すこし おおきい');
  r = C.jankenPlay(s, 'gu', chokiRng);
  assert.equal(r.done, true);
  assert.equal(s.friends.kani.state, 'happy');
  assert.equal(s.mission, null);
  assert.ok(s.stickers.includes('kani'));
  assert.ok(s.letters.includes('kani'));
  assert.equal(s.smiles, 1);
});

test('じゃんけん：まけと あいこは へんてん なしで つづく', () => {
  const s = C.newSave();
  startAt(s, 'kani');
  // あいては パー（0.9→index2）→ グーは まけ
  let r = C.jankenPlay(s, 'gu', seq(0.9));
  assert.equal(r.result, 'lose');
  assert.equal(r.done, false);
  // あいても グー（0.1→index0）→ あいこ
  r = C.jankenPlay(s, 'gu', seq(0.1));
  assert.equal(r.result, 'draw');
  assert.equal(s.friends.kani.state, 'sad', 'まだ おわらない');
});

test('かいがら：3つ あつめたら せいこう', () => {
  const s = C.newSave();
  startAt(s, 'chapu');
  let r = null;
  for (let i = 0; i < 3; i++) { warp(s, SHELL_SPOTS[i]); r = C.collectShell(s, i); assert.ok(r); }
  assert.equal(r.done, true);
  assert.equal(s.friends.chapu.state, 'happy');
});

test('だんかい かいほう：カニと ちゃぷを たすけると つぎの 2にん', () => {
  const s = C.newSave();
  startAt(s, 'kani');
  C.jankenPlay(s, 'gu', chokiRng); C.jankenPlay(s, 'gu', chokiRng);
  assert.equal(s.friends.kaze.state, 'away', 'ちゃぷが まだ なので でてこない');
  startAt(s, 'chapu');
  for (let i = 0; i < 3; i++) { warp(s, SHELL_SPOTS[i]); C.collectShell(s, i); }
  assert.equal(s.friends.kaze.state, 'sad');
  assert.equal(s.friends.jelly.state, 'sad');
  assert.equal(s.friends.kumokumo.state, 'away');
  assert.equal(s.stage, 1);
});

test('ぼうし：5かい さわったら せいこう、さわるたび うごく', () => {
  const s = C.newSave();
  s.friends.kaze.state = 'sad';
  startAt(s, 'kaze');
  const spots = new Set();
  const hatRng = seq(0.13, 0.37, 0.61, 0.83, 0.29);
  let r = null;
  for (let i = 0; i < 5; i++) {
    warp(s, C.hatPos(s));
    spots.add(s.mission.hat);
    r = C.touchHat(s, hatRng);
    assert.ok(r);
  }
  assert.equal(r.done, true);
  assert.equal(s.friends.kaze.state, 'happy');
  assert.ok(spots.size >= 3, 'ぼうしは いろんな ばしょへ うごく');
});

test('クリーム：5かい トントンで せいこう', () => {
  const s = C.newSave();
  s.friends.jelly.state = 'sad';
  startAt(s, 'jelly');
  let r = null;
  for (let i = 0; i < 5; i++) r = C.tapCream(s);
  assert.equal(r.done, true);
  assert.equal(s.friends.jelly.state, 'happy');
  // とおくでは トントン できない
  const s2 = C.newSave(); s2.friends.jelly.state = 'sad'; C.startMission(s2, 'jelly');
  warp(s2, { x: 20, z: 20 });
  assert.equal(C.tapCream(s2), null);
});

test('ほし：にげる ほしは 1かい にげて、5つで せいこう', () => {
  const s = C.newSave();
  s.friends.kumokumo.state = 'sad';
  const m = startAt(s, 'kumokumo');
  assert.equal(m.type, 'stars');
  warp(s, m.spots[STAR_RUNNER]);
  const ran = C.collectStar(s, STAR_RUNNER);
  assert.equal(ran.ran, true, '1かいめは にげる');
  assert.notDeepEqual(m.spots[STAR_RUNNER], STAR_SPOTS[STAR_RUNNER], 'べつの ばしょへ うごいた');
  let r = null;
  for (let i = 0; i < 5; i++) { warp(s, m.spots[i]); r = C.collectStar(s, i); assert.ok(r, `${i}つめ`); }
  assert.equal(r.done, true);
  assert.equal(s.friends.kumokumo.state, 'happy');
});

test('かけら：10こ あつめられ、かさねて とれない', () => {
  const s = C.newSave();
  for (let i = 0; i < SHARD_SPOTS.length; i++) {
    warp(s, SHARD_SPOTS[i]);
    assert.equal(C.collectShard(s, i), true);
    assert.equal(C.collectShard(s, i), false, 'おなじ かけらは 2かい とれない');
  }
  assert.equal(s.shards.length, 10);
});

test('さいごまで：5にん たすけると エンディングと にじシール', () => {
  const s = C.newSave();
  // 1だんめ
  startAt(s, 'kani'); C.jankenPlay(s, 'gu', chokiRng); C.jankenPlay(s, 'gu', chokiRng);
  startAt(s, 'chapu'); for (let i = 0; i < 3; i++) { warp(s, SHELL_SPOTS[i]); C.collectShell(s, i); }
  // 2だんめ
  startAt(s, 'kaze'); for (let i = 0; i < 5; i++) { warp(s, C.hatPos(s)); C.touchHat(s, seq(0.2, 0.5, 0.8)); }
  startAt(s, 'jelly'); for (let i = 0; i < 5; i++) C.tapCream(s);
  assert.equal(s.friends.kumokumo.state, 'sad', 'さいごの 1にんが でてくる');
  // 3だんめ
  const m = startAt(s, 'kumokumo');
  let last = null;
  for (let i = 0; i < 5; i++) { warp(s, m.spots[i]); last = C.collectStar(s, i); if (last?.ran) { warp(s, m.spots[i]); last = C.collectStar(s, i); } }
  assert.equal(last.done, true);
  assert.equal(last.ending, true);
  assert.equal(s.ending, true);
  assert.equal(s.smiles, 5);
  assert.equal(s.stickers.length, 6, '5にんぶん ＋ にじ');
  assert.ok(s.stickers.includes('niji'));
  assert.equal(s.letters.length, 5);
  assert.ok(C.allHappy(s));
});

test('ほぞん：かきだして よみなおせる', () => {
  const s = C.newSave();
  startAt(s, 'kani'); C.jankenPlay(s, 'gu', chokiRng); C.jankenPlay(s, 'gu', chokiRng);
  warp(s, SHARD_SPOTS[0]); C.collectShard(s, 0);
  s.sound = false;
  const back = C.deserialize(C.serialize(s));
  assert.equal(back.friends.kani.state, 'happy');
  assert.deepEqual(back.shards, [0]);
  assert.equal(back.smiles, 1);
  assert.equal(back.sound, false);
  assert.equal(C.deserialize('こわれたデータ'), null);
  assert.equal(C.deserialize(null), null);
});

test('はなしかけ：ちかくの こまった こが わかる', () => {
  const s = C.newSave();
  warp(s, { x: 0, z: 15 });
  assert.equal(C.nearSadFriend(s), null, 'とおいと はなせない');
  warp(s, FRIENDS[0].pos);
  assert.equal(C.nearSadFriend(s), 'kani');
  const a = C.findAction(s);
  assert.equal(a.kind, 'talk'); assert.equal(a.friend, 'kani');
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
  for (const str of stringsOf({ FRIENDS, STAGES, STICKERS, LETTERS })) {
    assert.ok(!KANJI.test(str), `漢字が まざっている: ${str}`);
  }
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
