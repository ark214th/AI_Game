import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { WORLDS, FINAL, ALL_WORLDS, FRIENDS, MIX, W, H } from './data.mjs';
import * as C from './core.mjs';

const dir = new URL('.', import.meta.url);
const stagesOf = kind => ALL_WORLDS.flatMap(w => w.stages).filter(s => s.kind === kind);
const DT = 1 / 60;

test('がめんに でる もじに かんじが ない', () => {
  for (const f of readdirSync(dir).filter(f => /\.(mjs|html)$/.test(f) && !f.includes('.test.'))) {
    const src = readFileSync(new URL(f, dir), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
    const m = src.match(/[一-鿿々]+/);
    assert.equal(m, null, `${f}: ${m && m[0]}`);
  }
});

test('せかいは 5つ＋さいご、それぞれ 3ステージ', () => {
  assert.equal(WORLDS.length, 5);
  for (const w of ALL_WORLDS) { assert.equal(w.stages.length, 3); assert.ok(w.title.length === 2 && w.sub); }
  assert.deepEqual(FINAL.stages.map(s => s.kind), ['danmaku', 'adventure', 'rhythm']);
});

// ---------------- 弾幕 ----------------
test('弾幕：あたらなければ さいごまで すすむ。ながさ と たまの かずは ほどほど', () => {
  for (const def of stagesOf('danmaku')) {
    const s = C.newDanmaku(def); s.god = true;
    let t = 0, maxB = 0, fastest = 0;
    while (!s.done && t < 300) { C.stepDanmaku(s, DT, {}); t += DT; maxB = Math.max(maxB, s.bullets.length); for (const b of s.bullets) fastest = Math.max(fastest, Math.hypot(b.vx, b.vy)); s.ev.length = 0; }
    assert.ok(s.done, def.name);
    assert.ok(t > 55 && t < 170, `${def.name} ながさ ${t}`);
    assert.ok(maxB < 320, `${def.name} たまが おおすぎ ${maxB}`);
    assert.ok(fastest > 140 && fastest <= 190, `${def.name} はやさ ${fastest}`);
    assert.equal(s.hp, s.maxHp);
  }
  assert.ok(C.DM.PR <= 8, 'あたりはんていは ちいさい');
});

test('弾幕：うごかないと ハートが なくなって しっぱいに なる', () => {
  for (const def of stagesOf('danmaku')) {
    const s = C.newDanmaku(def);
    for (let i = 0; i < 60 * 200 && !s.done && !s.failed; i++) { C.stepDanmaku(s, DT, {}); s.ev.length = 0; }
    assert.ok(s.failed, def.name); assert.equal(s.hp, 0); assert.equal(s.hits, C.HEARTS);
  }
});

const still = (x, y) => ({ x, y, vx: 0, vy: 0, r: 8, t: 0 });
function armed() {
  const s = C.newDanmaku(stagesOf('danmaku')[0]);
  s.gap = 0; s.pi = 0; s.spawn = { left: 0, next: 9, side: 'l', k: 0 }; s.enemies.push({ x: 400, y: 100, side: 'l', baseY: 100, t: 0, hp: 99, r: 22, fire: 99 });
  return s;
}
test('弾幕：あたると ハートが へり、むてきに なり、まわりの たまが ほしに かわる', () => {
  const s = armed();
  s.bullets.push(still(s.px, s.py), still(s.px + 60, s.py), still(50, 50));
  C.stepDanmaku(s, DT, {});
  assert.equal(s.hits, 1); assert.equal(s.hp, C.HEARTS - 1); assert.ok(s.inv > 1); assert.equal(s.bullets.length, 1); assert.equal(s.items.length + s.stars, 2);
  s.bullets.push(still(s.px, s.py));
  C.stepDanmaku(s, DT, {});
  assert.equal(s.hits, 1, 'むてきの あいだは あたらない');
});

test('弾幕：ボムは 2かい。たまが ぜんぶ ほしに なる', () => {
  const s = armed();
  s.bullets.push(still(100, 100), still(800, 300), still(s.px + 300, s.py));
  C.stepDanmaku(s, DT, { bomb: true });
  assert.equal(s.bullets.length, 0); assert.equal(s.bombs, 1); assert.ok(s.inv > 1.5);
  C.stepDanmaku(s, DT, { bomb: true }); C.stepDanmaku(s, DT, { bomb: true });
  assert.equal(s.bombs, 0);
});

test('弾幕：やりなおしは しっぱいした こうげきから。ほしは ひきつぐ', () => {
  const def = stagesOf('danmaku')[2], s = C.newDanmaku(def, 7, { phase: 3, stars: 12 });
  assert.equal(s.stars, 12); assert.equal(s.hp, C.HEARTS);
  for (let i = 0; i < 60 * 3; i++) C.stepDanmaku(s, DT, {});
  assert.equal(s.pi, 3); assert.equal(s.boss.kind, def.phases[3].boss);
});

test('弾幕：うごくと はんいの そとへ でない', () => {
  const s = C.newDanmaku(stagesOf('danmaku')[0]);
  C.stepDanmaku(s, DT, { dx: -5000, dy: 5000 });
  assert.ok(s.px >= 30 && s.py <= H - 30);
});

// ---------------- 冒険 ----------------
const cell = (x, y) => [x * C.TS + 30, y * C.TS + 30];
function walk(s, mx, my, sec, act = false) { for (let i = 0; i < sec * 60 && !s.done && !s.exit; i++) { C.stepAdventure(s, DT, { mx, my, act }); s.ev.length = 0; } }
const roomsOf = def => (def.rooms ? def.rooms.map(r => ({ ...def, ...r })) : [def]);
const count = (map, ch) => map.join('').split(ch).length - 1;
// くさ・とびら・ブロックは どかせる ものとして、P から とどくか
function reachable(map, goal) {
  const find = ch => { for (let y = 0; y < 9; y++) { const x = map[y].indexOf(ch); if (x >= 0) return [x, y]; } return null; };
  const [sx, sy] = find('P'), seen = new Set([`${sx},${sy}`]), q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift();
    if (map[y][x] === goal) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = `${nx},${ny}`; if (map[ny][nx] !== '#' && !seen.has(k)) { seen.add(k); q.push([nx, ny]); } }
  }
  return false;
}

test('冒険：ちずは 16×9。へやは かいだんで つながり、さいごに たからばこ', () => {
  for (const def of stagesOf('adventure')) {
    const rooms = roomsOf(def);
    assert.equal(rooms.length, C.roomCount(def));
    rooms.forEach((r, i) => {
      const tag = `${def.name} へや${i + 1}`, last = i === rooms.length - 1;
      assert.equal(r.map.length, 9, tag);
      for (const row of r.map) assert.equal(row.length, 16, tag);
      assert.equal(count(r.map, 'P'), 1, tag);
      if (last) { assert.ok(count(r.map, 'C') === 1 || r.chestAt, tag); assert.equal(count(r.map, 'X'), 0, tag); }
      else { assert.equal(count(r.map, 'X'), 1, tag); assert.ok(reachable(r.map, 'X'), tag); }
      if (count(r.map, 'C')) assert.ok(reachable(r.map, 'C'), tag);
      if (r.door === 'key') { assert.equal(count(r.map, 'k'), 1, tag); assert.ok(reachable(r.map, 'k'), tag); }
      if (r.door === 'switch') assert.equal(count(r.map, 'B'), count(r.map, 's'), tag);
      if (r.door === 'clear') assert.ok(count(r.map, 'e') + count(r.map, 'E') >= 2, tag);
      if (r.door !== 'none') assert.equal(count(r.map, 'D'), 1, tag);
    });
  }
  assert.ok(WORLDS[1].stages.reduce((n, d) => n + C.roomCount(d), 0) >= 8, 'へやは ぜんぶで 8つ いじょう');
});

test('冒険1-1：かぎで とびらが あき、かいだんで つぎの へやへ。ほしと ハートを ひきつぐ', () => {
  let s = C.newAdventure(WORLDS[1].stages[0]);
  s.enemies = [];
  [s.px, s.py] = cell(4, 3); walk(s, 1, 0, 0.3);
  C.stepAdventure(s, DT, { mx: 1, my: 0, act: true });
  assert.ok(s.hasKey); assert.equal(s.grid[3][5], '.');
  [s.px, s.py] = cell(10, 4); walk(s, 1, 0, 0.5);
  assert.ok(s.doorOpen);
  walk(s, 1, 0, 3);
  assert.ok(s.exit, 'かいだんに ついた');
  s.stars = 9; s.hp = 2;
  s = C.nextRoom(s);
  assert.equal(s.room, 1); assert.equal(s.stars, 9); assert.equal(s.hp, 2); assert.equal(s.def.door, 'clear'); assert.ok(!s.exit);
  s.hp = 0; const again = C.retryRoom(s);
  assert.equal(again.room, 1); assert.equal(again.hp, C.HEARTS); assert.equal(again.stars, 9);
});

test('冒険1-1：かぎが ないと とびらは あかない', () => {
  const s = C.newAdventure(WORLDS[1].stages[0]);
  s.enemies = []; [s.px, s.py] = cell(10, 4);
  walk(s, 1, 0, 1);
  assert.equal(s.doorOpen, false); assert.ok(s.px < 11 * C.TS);
});

test('冒険1-2：スライムを ぜんぶ たおすと とびらが あく（コウモリは かぞえない）', () => {
  const s = C.newAdventure(WORLDS[1].stages[0], 11, { room: 1 });
  s.god = true;
  assert.ok(s.enemies.some(e => e.type === 'bat'));
  for (const e of s.enemies.filter(e => e.type !== 'bat')) {
    assert.equal(s.doorOpen, false);
    [s.px, s.py] = [e.x - 50, e.y]; s.dir = [1, 0]; s.cool = 0; s.kx = s.ky = 0;
    C.stepAdventure(s, DT, { act: true });
  }
  assert.equal(C.foesLeft(s), 0); assert.ok(s.doorOpen);
});

test('冒険2-1：ブロックは レールの うえだけ うごき、ぜんぶ のせると とびらが あく', () => {
  const s = C.newAdventure(WORLDS[1].stages[1]);
  s.enemies = [];
  [s.px, s.py] = cell(1, 2); walk(s, 1, 0, 6);
  assert.deepEqual([s.blocks[0].x, s.blocks[0].y], [6, 2]);
  assert.equal(s.doorOpen, false);
  [s.px, s.py] = cell(2, 5); walk(s, 0, 1, 1.5);
  assert.deepEqual([s.blocks[1].x, s.blocks[1].y], [2, 6], 'うえから おしても レールの そとへは でない');
  [s.px, s.py] = cell(1, 6); walk(s, 1, 0, 6);
  assert.ok(C.switchesDown(s)); assert.ok(s.doorOpen);
});

test('冒険2-2：たての レールの ブロックは うえから おす', () => {
  const s = C.newAdventure(WORLDS[1].stages[1], 11, { room: 1 });
  s.enemies = [];
  const b = s.blocks.find(k => k.x === 9);
  [s.px, s.py] = cell(9, 1); walk(s, 0, 1, 5);
  assert.deepEqual([b.x, b.y], [9, 5]);
  assert.equal(s.doorOpen, false, 'のこり ふたつ');
});

test('冒険：てきに さわると ハートが へり、なくなると しっぱい。けんで たおせる', () => {
  const s = C.newAdventure(WORLDS[1].stages[1]);
  const e = s.enemies.find(k => k.type === 'slime'); [s.px, s.py] = [e.x - 30, e.y];
  C.stepAdventure(s, DT, {});
  assert.equal(s.hits, 1); assert.equal(s.hp, C.HEARTS - 1); assert.ok(!s.failed);
  s.inv = 0; s.kx = s.ky = 0; [s.px, s.py] = [e.x - 50, e.y]; s.dir = [1, 0]; s.cool = 0;
  const n = s.enemies.length;
  C.stepAdventure(s, DT, { act: true });
  assert.equal(s.enemies.length, n - 1);
  s.hp = 1; s.inv = 0; const e2 = s.enemies[0]; [s.px, s.py] = [e2.x, e2.y];
  C.stepAdventure(s, DT, {});
  assert.ok(s.failed);
});

test('冒険：おおスライムは 3かい。コウモリは かべで おりかえす', () => {
  const s = C.newAdventure(WORLDS[1].stages[1], 11, { room: 2 });
  s.god = true;
  const big = s.enemies.find(e => e.type === 'big');
  for (let i = 0; i < 3; i++) {
    assert.ok(s.enemies.includes(big));
    [s.px, s.py] = [big.x - 60, big.y]; s.dir = [1, 0]; s.cool = 0; big.stun = 0; s.kx = s.ky = 0;
    C.stepAdventure(s, DT, { act: true });
  }
  assert.ok(!s.enemies.includes(big));
  const bat = s.enemies.find(e => e.type === 'bat' && e.vy);
  [s.px, s.py] = cell(1, 7); let minY = 1e9, maxY = 0;
  for (let i = 0; i < 60 * 8; i++) { C.stepAdventure(s, DT, {}); minY = Math.min(minY, bat.y); maxY = Math.max(maxY, bat.y); }
  assert.ok(minY >= 60 && maxY <= 8 * 60 && maxY - minY > 200, `${minY}-${maxY}`);
});

test('冒険ボス：めを まわした ときだけ たたけて、たおすと たからばこが でる', () => {
  const defs = [roomsOf(WORLDS[1].stages[2]).at(-1), FINAL.stages[1]];
  for (const def of defs) {
    const s = C.newAdventure(def), b = s.boss; s.god = true;
    [s.px, s.py] = [b.px - 70, b.py]; s.dir = [1, 0];
    C.stepAdventure(s, DT, { act: true });
    assert.equal(b.hp, b.maxHp, 'げんきな ときは きかない');
    let guard = 0, called = 0;
    while (b.hp > 0 && guard++ < 60 * 200) {
      if (b.state === 'dizzy') { [s.px, s.py] = [b.px - 70, b.py]; s.dir = [1, 0]; s.kx = s.ky = 0; C.stepAdventure(s, DT, { act: true }); }
      else { [s.px, s.py] = [80, 470]; C.stepAdventure(s, DT, {}); }
      called += s.ev.filter(e => e.t === 'call').length; s.ev.length = 0;
    }
    assert.equal(b.hp, 0); assert.equal(called, 2, 'なかまを 2かい よぶ');
    assert.ok(s.grid.some(r => r.includes('C'))); assert.ok(!s.done);
  }
});

// ---------------- リズム ----------------
test('リズム：ふめんは うたの ながさに おさまり、どうじ おしも ある', () => {
  for (const def of stagesOf('rhythm')) {
    const { notes, len } = C.buildChart(def);
    assert.ok(notes.length >= 40, def.name);
    assert.ok(len > 30 && len < 60, `${def.name} ${len}`);
    assert.ok(notes[0].t >= 3, 'さいしょに じゅんびの じかん');
    for (const b of def.bars) { assert.equal(b.length, 8); assert.match(b, /^[.1-6]+$/); }
    const times = [...new Set(notes.map(n => n.t))];
    for (let i = 1; i < times.length; i++) assert.ok(times[i] - times[i - 1] >= 0.22, def.name);
    assert.ok(notes.length > times.length, `${def.name} どうじ おし`);
  }
});

test('リズム：ぴったりは かんぺき、すこし ずれると いいね、おおきく ずれると あたらない', () => {
  const def = WORLDS[2].stages[1], s = C.newRhythm(def), [n0, n1, n2] = s.notes;
  assert.equal(C.tapLane(s, n0.lane, n0.t + 0.05), 'perfect');
  assert.equal(C.tapLane(s, n1.lane, n1.t - 0.18), 'good');
  const k = s.kira;
  assert.equal(C.tapLane(s, n2.lane, n2.t - 0.4), null);
  assert.equal(C.tapLane(s, (n2.lane + 1) % 3, n2.t), null, 'ちがう ばしょは あたらない');
  assert.equal(s.kira, k);
});

test('リズム：きらきらが たりないと しっぱい、6わり いじょうで クリア', () => {
  const def = WORLDS[2].stages[0];
  const bad = C.newRhythm(def); C.stepRhythm(bad, bad.len + 1);
  assert.ok(bad.failed && !bad.done);
  const ok = C.newRhythm(def);
  ok.notes.forEach((n, i) => { if (i % 3) C.tapLane(ok, n.lane, n.t); });
  C.stepRhythm(ok, ok.len + 1);
  assert.ok(ok.done && !ok.failed); assert.equal(C.rating(ok), 1);
  const full = C.newRhythm(def);
  for (const n of full.notes) C.tapLane(full, n.lane, n.t);
  C.stepRhythm(full, full.len + 1);
  assert.equal(C.rating(full), 3); assert.equal(C.rating(full, 1), 1, 'やりなおすと ★1');
});

test('リズム：どうじ おしは りょうほう べつべつに あたる', () => {
  const s = C.newRhythm(WORLDS[2].stages[0]);
  const t = s.notes.find((n, i) => s.notes[i + 1] && s.notes[i + 1].t === n.t).t, pair = s.notes.filter(n => n.t === t);
  assert.equal(pair.length, 2);
  for (const n of pair) assert.ok(C.tapLane(s, n.lane, t));
  assert.ok(pair.every(n => n.res));
});

// ---------------- レース ----------------
test('レース：コースの ながさは ほどほど。あたらなければ ゴールできる', () => {
  for (const def of stagesOf('race')) {
    const s = C.newRace(def); s.god = true;
    let t = 0;
    while (!s.done && t < 200) { C.stepRace(s, DT, {}); t += DT; s.ev.length = 0; }
    assert.ok(s.done, def.name); assert.ok(t > 35 && t < 110, `${def.name} ${t}`);
    assert.ok(s.place >= 1 && s.place <= 4);
  }
});

test('レース：コーンで ハートが へり、なくなると しっぱい。よければ あたらない', () => {
  const def = WORLDS[3].stages[0], s = C.newRace(def);
  s.rivals = [];
  s.objs = [{ z: 100, lane: 1, type: 'cone' }, { z: 200, lane: 1, type: 'coin' }, { z: 5000, lane: 0, type: 'cone' }];
  for (let i = 0; i < 120; i++) C.stepRace(s, DT, {});
  assert.equal(s.hits, 1); assert.equal(s.hp, C.HEARTS - 1); assert.ok(!s.done);
  C.stepRace(s, DT, { turn: -1 }); C.stepRace(s, DT, { turn: -1 }); assert.equal(s.lane, 0);
  C.stepRace(s, DT, { turn: 1 }); C.stepRace(s, DT, { turn: 1 }); C.stepRace(s, DT, { turn: 1 }); assert.equal(s.lane, 2);
  while (!s.done && s.t < 100) C.stepRace(s, DT, {});
  assert.equal(s.hits, 1, 'みぎの レーンに いれば あたらない');
  const f = C.newRace(def); f.rivals = [];
  f.objs = [1, 2, 3].map(i => ({ z: i * 900, lane: 1, type: 'cone' }));
  for (let i = 0; i < 60 * 30 && !f.failed; i++) C.stepRace(f, DT, {});
  assert.ok(f.failed); assert.equal(f.hp, 0);
});

test('レース：4ばんは しっぱい、3ばん いないは クリア。まえの カートには つかえる', () => {
  const def = WORLDS[3].stages[0];
  const last = C.newRace(def); last.objs = []; last.dist = def.len - 50; for (const r of last.rivals) r.dist = def.len + 500;
  for (let i = 0; i < 60 * 5 && !last.failed && !last.done; i++) C.stepRace(last, DT, {});
  assert.ok(last.failed); assert.equal(last.place, 4);
  const third = C.newRace(def); third.objs = []; third.dist = def.len - 50; third.rivals[0].dist = 0; for (const r of third.rivals.slice(1)) r.dist = def.len + 500;
  for (let i = 0; i < 60 * 5 && !third.done; i++) C.stepRace(third, DT, {});
  assert.ok(third.done); assert.equal(third.place, 3); assert.equal(C.rating(third), 1);
  const s = C.newRace(def); s.objs = []; s.rivals = [{ kind: 'slime', dist: 400, lane: 1, x: 1, v: 200, turn: 99, drop: 99 }];
  let bumped = false;
  for (let i = 0; i < 60 * 6; i++) { C.stepRace(s, DT, {}); bumped ||= s.ev.some(e => e.t === 'bump'); s.ev.length = 0; }
  assert.ok(bumped); assert.ok(s.dist < s.rivals[0].dist, 'まうしろ からは ぬかせない');
});

test('レース：バグバグは ブロックを おとす', () => {
  const def = WORLDS[3].stages[2], s = C.newRace(def); s.god = true;
  const n = s.objs.length; let drops = 0;
  for (let i = 0; i < 60 * 12; i++) { C.stepRace(s, DT, {}); drops += s.ev.filter(e => e.t === 'drop').length; s.ev.length = 0; }
  assert.ok(drops >= 2); assert.equal(s.objs.length, n + drops);
});

// ---------------- ひろい せかい ----------------
const hyp = Math.hypot;
function fwalk(s, mx, my, sec, act = false) { for (let i = 0; i < sec * 60 && !s.done && !s.failed; i++) { C.stepField(s, DT, { mx, my, act }); s.ev.length = 0; } }
// とうの ふもとへ おいて、てっぺんまで のぼらせる
function climbTower(s, t) { s.x = t.x; s.z = t.z - t.r - 30; s.cam = 0; s.state = 'walk'; s.y = 0; s.sta = 1; fwalk(s, 0, -1, 0.5); assert.equal(s.state, 'climb'); for (let i = 0; i < 60 * 12 && s.state === 'climb'; i++) C.stepField(s, DT, { mx: 0, my: -1 }); }

test('ひろい せかい：ちずの つじつま（とうは のぼりきれる、しまへは とんで とどく）', () => {
  for (const def of stagesOf('field')) {
    assert.ok(hyp(...def.start) < def.size && hyp(...def.goal) < def.size, def.name);
    for (const t of def.towers) assert.ok(t.h < C.FD.CLIMB * C.FD.STA * 0.9, `${def.name} とうが たかすぎ`);
    const top = Math.max(...def.towers.map(t => t.h));
    for (const q of def.seeds) {
      assert.ok(hyp(q.x, q.z) < def.size - 60, def.name);
      const lake = def.lakes.find(l => hyp(q.x - l.x, q.z - l.z) < l.r);
      if (lake) assert.ok(hyp(q.x - lake.x, q.z - lake.z) < lake.island - 40, `${def.name} たねが みずの なか`);
      // そら や しま の たねは、どれかの とうから とんで とどく
      if (lake || (q.y > 0 && !def.towers.some(t => t.x === q.x && t.z === q.z))) {
        assert.ok(def.towers.some(t => { const d = hyp(q.x - t.x, q.z - t.z), drop = d / C.FD.GLIDE * C.FD.SINK; return t.h - drop >= q.y - 30; }), `${def.name} とどかない たね`);
        assert.ok(q.y < top);
      }
    }
    const s = C.newField(def);
    assert.ok(s.trees.length >= def.trees * 0.8, `${def.name} きが すくない ${s.trees.length}`);
    for (const t of s.trees) assert.ok(!def.lakes.some(l => hyp(t.x - l.x, t.z - l.z) < l.r), 'きは みずの そと');
  }
  assert.ok(stagesOf('field').reduce((n, d) => n + d.seeds.length, 0) >= 9);
});

test('ひろい せかい：スティックは カメラから みた むき。みずには はいれない', () => {
  const def = WORLDS[4].stages[0], s = C.newField(def);
  s.trees = []; s.rocks = []; s.enemies = [];
  const z0 = s.z; fwalk(s, 0, -1, 1);
  assert.ok(s.z > z0 + 200 && Math.abs(s.x) < 5, 'うえ＝まえ');
  s.cam = Math.PI / 2; const x0 = s.x; fwalk(s, 0, -1, 1);
  assert.ok(s.x > x0 + 150, 'カメラが みぎを むくと みぎへ');
  const l = def.lakes[0]; s.cam = 0; s.x = l.x; s.z = l.z - l.r - 40; fwalk(s, 0, -1, 2);
  assert.ok(hyp(s.x - l.x, s.z - l.z) >= l.r - 1, 'みずの ふちで とまる');
});

test('ひろい せかい：とうを のぼって たねを とり、とんで しまへ おりる', () => {
  const def = WORLDS[4].stages[0], s = C.newField(def), t = def.towers[0], l = def.lakes[0];
  s.enemies = [];
  climbTower(s, t);
  assert.equal(s.state, 'top'); assert.equal(s.y, t.h); assert.ok(s.sta > 0.2, 'スタミナは たりる');
  C.stepField(s, DT, {}); assert.ok(s.got[0], 'とうの うえの たね');
  s.cam = Math.atan2(l.x - t.x, l.z - t.z); fwalk(s, 0, -1, 0.8);
  assert.equal(s.state, 'glide');
  let rings = 0;
  for (let i = 0; i < 60 * 30 && s.state === 'glide'; i++) {
    const want = Math.atan2(l.x - s.x, l.z - s.z), near = hyp(l.x - s.x, l.z - s.z) < 60;
    C.stepField(s, DT, { mx: C.clamp((want - s.head) * 3, -1, 1), act: near });
    rings += s.ev.filter(e => e.t === 'ring').length; s.ev.length = 0;
  }
  assert.equal(s.state, 'walk'); assert.ok(hyp(s.x - l.x, s.z - l.z) < l.island, 'しまに おりた');
  fwalk(s, 0, 0, 0.1); assert.ok(s.got[1], 'しまの たね');
  assert.ok(rings >= 1, 'わっかを くぐった');
});

test('ひろい せかい：スタミナが きれると すべりおちる（いたくない）。みずに おちても もどされる だけ', () => {
  const def = WORLDS[4].stages[0], s = C.newField(def), t = def.towers[0], l = def.lakes[0];
  s.enemies = []; s.x = t.x; s.z = t.z - t.r - 30; s.sta = 0.3; fwalk(s, 0, -1, 0.4);
  assert.equal(s.state, 'climb');
  let slipped = false;
  for (let i = 0; i < 60 * 6 && s.state === 'climb'; i++) { C.stepField(s, DT, { mx: 0, my: -1 }); slipped ||= s.ev.some(e => e.t === 'slip'); s.ev.length = 0; }
  assert.ok(slipped); assert.ok(s.y < t.h);
  fwalk(s, 0, 0, 2);
  assert.equal(s.state, 'walk'); assert.equal(s.y, 0); assert.equal(s.hp, C.HEARTS);
  s.state = 'glide'; s.y = 5; s.x = l.x + l.island + 60; s.z = l.z; s.head = 0;
  fwalk(s, 0, 0, 0.5);
  assert.equal(s.state, 'walk'); assert.ok(hyp(s.x - l.x, s.z - l.z) >= l.r); assert.equal(s.hp, C.HEARTS);
});

test('ひろい せかい：スライムで ハートが へり、けんで たおせる。きを きると りんごで かいふく', () => {
  const def = WORLDS[4].stages[0], s = C.newField(def), e = s.enemies[0];
  s.x = e.x; s.z = e.z - 30; C.stepField(s, DT, {});
  assert.equal(s.hp, C.HEARTS - 1); assert.equal(s.hits, 1);
  s.inv = 0; s.kx = s.kz = 0; s.x = e.x; s.z = e.z - 80; s.head = 0; s.cool = 0;
  const n = s.enemies.length; C.stepField(s, DT, { act: true });
  assert.equal(s.enemies.length, n - 1);
  s.enemies = []; const tr = s.trees[0]; tr.apple = true; s.x = tr.x; s.z = tr.z - 70; s.head = 0; s.cool = 0;
  C.stepField(s, DT, { act: true });
  assert.equal(tr.apple, false);
  fwalk(s, 0, 0, 0.2);
  assert.equal(s.hp, C.HEARTS, 'りんごで ハートが もどる');
});

test('ひろい せかい：たねを ぜんぶ あつめると ひかりの きが ひらき、そこで クリア', () => {
  const def = WORLDS[4].stages[0], s = C.newField(def);
  s.enemies = []; s.trees = []; s.rocks = [];
  s.x = def.goal[0]; s.z = def.goal[1] - 110; fwalk(s, 0, -1, 1);
  assert.ok(!s.done && s.goalT === 0, 'たねが たりないと ひらかない');
  def.seeds.forEach(q => { s.x = q.x; s.z = q.z; s.y = q.y; C.stepField(s, DT, {}); });
  assert.equal(C.seedsLeft(s), 0); assert.ok(s.goalOpen);
  s.y = 0; s.state = 'walk'; s.x = def.goal[0]; s.z = def.goal[1] - 130; fwalk(s, 0, -1, 5);
  assert.ok(s.done);
  const f = C.newField(def); f.got[0] = true; f.stars = 10; f.hp = 0;
  const again = C.retryField(f);
  assert.ok(again.got[0]); assert.equal(again.hp, C.HEARTS); assert.equal(again.stars, 10);
});

test('ひろい せかい ボス：うごけない ときだけ けんが きく。そらから おちると 2つ ぶん', () => {
  const def = WORLDS[4].stages[2], s = C.newField(def), b = s.boss;
  s.god = true; s.trees = []; s.rocks = [];
  assert.equal(s.goalOpen, false);
  s.x = b.x; s.z = b.z - b.r - 60; s.head = 0;
  C.stepField(s, DT, { act: true }); assert.equal(b.hp, b.maxHp, 'げんきな ときは きかない');
  let guard = 0, thuds = 0;
  while (b.state !== 'stuck' && guard++ < 60 * 30) { s.x = b.x; s.z = b.z - 500; C.stepField(s, DT, {}); thuds += s.ev.filter(e => e.t === 'thud').length; s.ev.length = 0; }
  assert.equal(b.state, 'stuck'); assert.ok(thuds >= 3, 'いわ 2つ と ドスン');
  s.x = b.x; s.z = b.z - b.r - 60; s.head = 0; s.cool = 0; s.kx = s.kz = 0;
  C.stepField(s, DT, { act: true }); assert.equal(b.hp, b.maxHp - 1);
  s.state = 'glide'; s.dive = true; s.y = 20; s.x = b.x + 10; s.z = b.z; s.tw = def.towers[0];
  fwalk(s, 0, 0, 0.3);
  assert.equal(b.hp, b.maxHp - 3, 'ずどん で 2つ');
  b.hp = 1; b.state = 'stuck'; b.st = 3; b.hitCool = 0; s.state = 'walk'; s.y = 0; s.x = b.x; s.z = b.z - b.r - 60; s.head = 0; s.cool = 0;
  C.stepField(s, DT, { act: true });
  assert.equal(b.hp, 0); assert.ok(s.goalOpen);
});

// ---------------- まぜこぜ・ともだち・セーブ ----------------
test('まぜこぜ：おなじ あそびは つづかず、どれも さいごまで すすむ', () => {
  for (const seed of [1, 2, 3]) {
    const list = C.buildMix(C.rng32(seed));
    assert.equal(list.length, MIX.rounds);
    list.forEach((def, i) => {
      if (i) assert.notEqual(def.kind, list[i - 1].kind);
      let t = 0;
      if (def.kind === 'danmaku') { const s = C.newDanmaku(def); s.god = true; while (!s.done && t < 60) { C.stepDanmaku(s, DT, {}); t += DT; s.ev.length = 0; } assert.ok(s.done && t < 20, `danmaku ${t}`); }
      else if (def.kind === 'race') { const s = C.newRace(def); s.god = true; while (!s.done && t < 60) { C.stepRace(s, DT, {}); t += DT; } assert.ok(s.done && t < 25, `race ${t}`); }
      else if (def.kind === 'rhythm') { const { notes, len } = C.buildChart(def); assert.ok(notes.length >= 4 && len < 16); for (const b of def.bars) assert.equal(b.length, 8); }
      else {
        const s = C.newAdventure(def); assert.ok(C.foesLeft(s) >= 3);
        for (const r of def.map) assert.equal(r.length, 16);
        s.god = true; const e = s.enemies.find(k => k.type === 'slime'); s.enemies = [e];
        [s.px, s.py] = [e.x - 50, e.y]; s.dir = [1, 0]; C.stepAdventure(s, DT, { act: true });
        assert.ok(s.grid.some(r => r.includes('C')), 'スライムが いなくなると たからばこが でる');
      }
    });
    assert.ok(list.at(-1).speed === undefined || list.at(-1).speed <= 1.6);
  }
});

test('まぜこぜ：ハートは まえの あそびから ひきつげる', () => {
  const def = C.buildMix(C.rng32(1)).find(d => d.kind === 'danmaku');
  const s = C.newDanmaku(def, 7, { hp: 1, maxHp: MIX.hearts });
  assert.equal(s.hp, 1); assert.equal(s.maxHp, 4);
  s.gap = 0; s.pi = 0; s.boss = { kind: 'bug', x: 480, y: 112, bt: 0, r: 40, hp: 9, maxHp: 9 };
  s.bullets.push(still(s.px, s.py));
  C.stepDanmaku(s, DT, {});
  assert.ok(s.failed);
});

test('ともだち：★が ふえると ふえ、バグバグは エンディングの あと', () => {
  const sv = C.newSave();
  assert.equal(C.friendsOf(sv).length, 0); assert.equal(C.nextFriend(sv).need, 2);
  C.recordClear(sv, 'star', 3);
  assert.deepEqual(C.friendsOf(sv).map(f => f.id), ['starkid']);
  for (const id of ['hero', 'idol', 'race', 'bug']) C.recordClear(sv, id, 3);
  assert.equal(C.totalStars(sv), 15);
  C.recordClear(sv, 'wild', 3); assert.equal(C.totalStars(sv), 18); assert.equal(C.nextFriend(sv), null);
  assert.equal(C.friendsOf(sv).length, FRIENDS.length - 1);
  sv.ending = true; assert.equal(C.friendsOf(sv).length, FRIENDS.length);
  assert.ok(Math.max(...FRIENDS.filter(f => !f.ending).map(f => f.need)) <= 15);
  assert.equal(C.recordMix(sv, 40), true); assert.equal(C.recordMix(sv, 30), false); assert.equal(sv.mix.best, 40);
});

test('★の つけかた：やりなおすと ★1。あたった かずで ★2 か ★3', () => {
  assert.equal(C.rating({ kind: 'danmaku', hits: 0 }), 3);
  assert.equal(C.rating({ kind: 'danmaku', hits: 2 }), 2);
  assert.equal(C.rating({ kind: 'adventure', hits: 0 }, 1), 1);
  assert.equal(C.rating({ kind: 'race', place: 1 }), 3);
  assert.equal(C.rating({ kind: 'race', place: 1 }, 2), 1);
  assert.equal(C.avgStars([3, 2, 2]), 2);
});

test('セーブ：クリアの きろくと さいごの せかいの かいほう', () => {
  let sv = C.newSave();
  const ids = WORLDS.map(w => w.id);
  assert.equal(C.finalUnlocked(sv, ids), false);
  C.recordStage(sv, 'star', 0, 3); assert.equal(sv.worlds.star.reached, 1);
  C.recordClear(sv, 'star', 2); C.recordClear(sv, 'star', 1);
  assert.equal(sv.worlds.star.stars, 2); assert.equal(sv.worlds.star.reached, 0);
  C.recordClear(sv, 'hero', 3); C.recordClear(sv, 'idol', 3);
  assert.equal(C.finalUnlocked(sv, ids), false);
  C.recordClear(sv, 'race', 1);
  assert.equal(C.finalUnlocked(sv, ids), false);
  C.recordClear(sv, 'wild', 1);
  assert.ok(C.finalUnlocked(sv, ids));
  const old = C.newSave(); old.worlds.bug = { clear: false, stars: 0, reached: 1 };
  assert.ok(C.finalUnlocked(old, ids), 'いちど ひらいたら ひらいた まま');
  sv = C.loadSave(JSON.stringify(sv)); assert.ok(sv.worlds.hero.clear);
  assert.deepEqual(C.loadSave('こわれた'), C.newSave());
});
