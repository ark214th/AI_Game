import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { WORLDS, FINAL, ALL_WORLDS, W, H } from './data.mjs';
import * as C from './core.mjs';

const dir = new URL('.', import.meta.url);
const stagesOf = kind => ALL_WORLDS.flatMap(w => w.stages).filter(s => s.kind === kind);

test('がめんに でる もじに かんじが ない', () => {
  for (const f of readdirSync(dir).filter(f => /\.(mjs|html)$/.test(f) && !f.includes('.test.'))) {
    const src = readFileSync(new URL(f, dir), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
    const m = src.match(/[一-鿿々]+/);
    assert.equal(m, null, `${f}: ${m && m[0]}`);
  }
});

test('せかいは 3つ＋さいご、それぞれ 3ステージ', () => {
  assert.equal(WORLDS.length, 3);
  for (const w of ALL_WORLDS) { assert.equal(w.stages.length, 3); assert.ok(w.title.length === 2 && w.sub); }
  assert.deepEqual(FINAL.stages.map(s => s.kind), ['danmaku', 'adventure', 'rhythm']);
});

test('弾幕：なにも しなくても さいごまで すすみ、ゲームオーバーに ならない', () => {
  for (const def of stagesOf('danmaku')) {
    const s = C.newDanmaku(def);
    let t = 0, maxB = 0;
    while (!s.done && t < 200) { C.stepDanmaku(s, 1 / 60, {}); t += 1 / 60; maxB = Math.max(maxB, s.bullets.length); s.ev.length = 0; }
    assert.ok(s.done, def.name);
    assert.ok(t < 110, `${def.name} ながすぎ ${t}`);
    assert.ok(maxB < 130, `${def.name} たまが おおすぎ ${maxB}`);
    assert.ok(C.rating(s) >= 1);
  }
});

test('弾幕：たまは おそく、あたりはんていは ちいさい', () => {
  for (const def of stagesOf('danmaku')) {
    const s = C.newDanmaku(def);
    let fastest = 0;
    for (let i = 0; i < 60 * 80 && !s.done; i++) { C.stepDanmaku(s, 1 / 60, {}); for (const b of s.bullets) fastest = Math.max(fastest, Math.hypot(b.vx, b.vy)); s.ev.length = 0; }
    assert.ok(fastest <= 125, `${def.name} ${fastest}`);
  }
  assert.ok(C.DM.PR <= 8);
});

test('弾幕：あたると むてきに なり、まわりの たまが ほしに かわる', () => {
  const s = C.newDanmaku(stagesOf('danmaku')[0]);
  s.gap = 0; s.pi = 0; s.spawn = { left: 0, next: 9, side: 'l', k: 0 }; s.enemies.push({ x: 400, y: 100, side: 'l', baseY: 100, t: 0, hp: 99, r: 22, fire: 99 });
  s.bullets.push({ x: s.px, y: s.py, vx: 0, vy: 0, r: 8, t: 0 }, { x: s.px + 60, y: s.py, vx: 0, vy: 0, r: 8, t: 0 }, { x: 50, y: 50, vx: 0, vy: 0, r: 8, t: 0 });
  C.stepDanmaku(s, 1 / 60, {});
  assert.equal(s.hits, 1); assert.ok(s.inv > 1); assert.equal(s.bullets.length, 1); assert.equal(s.items.length + s.stars, 2);
  s.bullets.push({ x: s.px, y: s.py, vx: 0, vy: 0, r: 8, t: 0 });
  C.stepDanmaku(s, 1 / 60, {});
  assert.equal(s.hits, 1, 'むてきの あいだは あたらない');
});

test('弾幕：うごくと はんいの そとへ でない', () => {
  const s = C.newDanmaku(stagesOf('danmaku')[0]);
  C.stepDanmaku(s, 1 / 60, { dx: -5000, dy: 5000 });
  assert.ok(s.px >= 30 && s.py <= H - 30);
});

const cell = (x, y) => [x * C.TS + 30, y * C.TS + 30];
function walk(s, mx, my, sec, act = false) { for (let i = 0; i < sec * 60 && !s.done; i++) { C.stepAdventure(s, 1 / 60, { mx, my, act }); s.ev.length = 0; } }

test('冒険：ちずは 16×9 で、ぷにゅと たからばこが ある', () => {
  for (const def of stagesOf('adventure')) {
    assert.equal(def.map.length, 9);
    for (const r of def.map) assert.equal(r.length, 16, def.name);
    assert.equal(def.map.join('').split('P').length, 2);
    assert.ok(def.map.join('').includes('C') || def.chestAt);
  }
});

test('冒険1：くさを きると かぎが でて、とびらが あき、たからばこで クリア', () => {
  const s = C.newAdventure(WORLDS[1].stages[0]);
  s.enemies = [];
  [s.px, s.py] = cell(4, 3);          // かぎの くさ (5,3) の ひだり
  walk(s, 1, 0, 0.3);
  C.stepAdventure(s, 1 / 60, { mx: 1, my: 0, act: true });
  assert.ok(s.hasKey); assert.equal(s.grid[3][5], '.');
  [s.px, s.py] = cell(10, 4);
  walk(s, 1, 0, 0.5);
  assert.ok(s.doorOpen);
  walk(s, 1, 0, 1.2); assert.ok(s.px > 11 * C.TS, 'とびらを とおれる');
  [s.px, s.py] = cell(14, 2);
  walk(s, 0, -1, 0.5);
  assert.equal(s.chest, 'open');
  walk(s, 0, 0, 4); assert.ok(s.done);
});

test('冒険1：かぎが ないと とびらは あかない', () => {
  const s = C.newAdventure(WORLDS[1].stages[0]);
  [s.px, s.py] = cell(10, 4);
  walk(s, 1, 0, 1);
  assert.equal(s.doorOpen, false); assert.ok(s.px < 11 * C.TS);
});

test('冒険2：ブロックは レールの うえだけ うごき、2つ のせると とびらが あく', () => {
  const s = C.newAdventure(WORLDS[1].stages[1]);
  s.enemies = [];
  [s.px, s.py] = cell(1, 2);
  walk(s, 1, 0, 6);
  assert.deepEqual([s.blocks[0].x, s.blocks[0].y], [6, 2]);
  assert.equal(s.doorOpen, false);
  // うえから おしても レールの そとへは でない
  [s.px, s.py] = cell(2, 5);
  walk(s, 0, 1, 1.5);
  assert.deepEqual([s.blocks[1].x, s.blocks[1].y], [2, 6]);
  [s.px, s.py] = cell(1, 6);
  walk(s, 1, 0, 6);
  assert.ok(C.switchesDown(s)); assert.ok(s.doorOpen);
});

test('冒険：スライムに さわっても はねかえる だけ。けんで たおせる', () => {
  const s = C.newAdventure(WORLDS[1].stages[1]);
  const e = s.enemies[0]; [s.px, s.py] = [e.x - 30, e.y];
  C.stepAdventure(s, 1 / 60, {});
  assert.equal(s.hits, 1); assert.ok(!s.done);
  s.inv = 0; s.kx = s.ky = 0; [s.px, s.py] = [e.x - 50, e.y]; s.dir = [1, 0]; s.cool = 0;
  const n = s.enemies.length;
  C.stepAdventure(s, 1 / 60, { act: true });
  assert.equal(s.enemies.length, n - 1);
});

test('冒険ボス：めを まわした ときだけ たたけて、たおすと たからばこが でる', () => {
  for (const def of stagesOf('adventure').filter(d => d.boss)) {
    const s = C.newAdventure(def), b = s.boss;
    [s.px, s.py] = [b.px - 70, b.py]; s.dir = [1, 0];
    C.stepAdventure(s, 1 / 60, { act: true });
    assert.equal(b.hp, b.maxHp, 'げんきな ときは きかない');
    let guard = 0;
    while (b.hp > 0 && guard++ < 60 * 120) {
      if (b.state === 'dizzy') { [s.px, s.py] = [b.px - 70, b.py]; s.dir = [1, 0]; s.kx = s.ky = 0; C.stepAdventure(s, 1 / 60, { act: true }); }
      else { [s.px, s.py] = [80, 470]; C.stepAdventure(s, 1 / 60, {}); }
      s.ev.length = 0;
    }
    assert.equal(b.hp, 0, def.name);
    assert.ok(s.grid.some(r => r.includes('C')));
    assert.ok(!s.done);
  }
});

test('リズム：ふめんは うたの ながさに おさまり、やさしい はやさ', () => {
  for (const def of stagesOf('rhythm')) {
    const { notes, len } = C.buildChart(def);
    assert.ok(notes.length >= 15, def.name);
    assert.ok(len > 20 && len < 50, `${def.name} ${len}`);
    assert.ok(notes[0].t >= 3, 'さいしょに じゅんびの じかん');
    for (let i = 1; i < notes.length; i++) assert.ok(notes[i].t - notes[i - 1].t >= 0.24, def.name);
    for (const b of def.bars) assert.equal(b.length, 8);
  }
});

test('リズム：ぴったりは かんぺき、すこし ずれても いいね、まちがえても へらない', () => {
  const def = WORLDS[2].stages[1], s = C.newRhythm(def), n0 = s.notes[0], n1 = s.notes[1];
  assert.equal(C.tapLane(s, n0.lane, n0.t + 0.05), 'perfect');
  assert.equal(C.tapLane(s, n1.lane, n1.t - 0.3), 'good');
  const k = s.kira;
  assert.equal(C.tapLane(s, 0, s.notes[2].t - 2), null);
  assert.equal(s.kira, k);
  C.stepRhythm(s, s.len + 1);
  assert.ok(s.done); assert.equal(s.miss, s.notes.length - 2);
  assert.equal(C.rating(s), 1);
});

test('リズム：さいしょの うたは どこを タッチしても あたる', () => {
  const s = C.newRhythm(WORLDS[2].stages[0]), n = s.notes[0];
  assert.ok(C.tapLane(s, (n.lane + 1) % 3, n.t));
  for (const m of s.notes) if (!m.res) C.tapLane(s, m.lane, m.t);
  assert.equal(C.rating(s), 3);
});

test('セーブ：クリアの きろくと さいごの せかいの かいほう', () => {
  let sv = C.newSave();
  const ids = WORLDS.map(w => w.id);
  assert.equal(C.finalUnlocked(sv, ids), false);
  C.recordStage(sv, 'star', 0, 3); assert.equal(sv.worlds.star.reached, 1);
  C.recordClear(sv, 'star', 2); C.recordClear(sv, 'star', 1);
  assert.equal(sv.worlds.star.stars, 2); assert.equal(sv.worlds.star.reached, 0);
  C.recordClear(sv, 'hero', 3); C.recordClear(sv, 'idol', 3);
  assert.ok(C.finalUnlocked(sv, ids));
  sv = C.loadSave(JSON.stringify(sv)); assert.ok(sv.worlds.hero.clear);
  assert.deepEqual(C.loadSave('こわれた'), C.newSave());
  assert.equal(C.avgStars([3, 2, 2]), 2);
});
