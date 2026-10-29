import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from './core.mjs';

test('本は 24シリーズ × 8かん。どの シリーズも たなの れつが 1つずつ ある', () => {
  assert.equal(C.TOTAL, 192);
  const g = C.createGame(1);
  assert.equal(g.items.length, 192);
  const seen = new Set(C.SERIES.map((_, s) => `${C.SERIES[s].sec}-${C.rowOfSeries(s)}`));
  assert.equal(seen.size, C.SERIES.length);
  for (let s = 0; s < C.SERIES.length; s++) assert.equal(C.seriesAt(C.SERIES[s].sec, C.rowOfSeries(s)), s);
});

test('本の 色は たなの しるしに ならない（おなじ たなに いろいろな 色）', () => {
  for (let sec = 0; sec < C.SECTIONS.length; sec++) {
    const colors = new Set(C.SERIES.filter(s => s.sec === sec).map(s => s.color));
    assert.equal(colors.size, C.PER_CASE);
  }
});

test('本の 山は どの たねでも ぜんぶ おけて、本だなや テーブルに かさならない', () => {
  for (const seed of [1, 2, 3, 99, 12345, 777777]) {
    const g = C.createGame(seed);
    assert.equal(g.piles.length, 14);
    assert.ok(g.items.every(i => i.state === 'floor' && i.pile >= 0));
    for (const p of g.piles) assert.ok(!C.obstacles().some(o => p.x > o.x0 && p.x < o.x1 && p.z > o.z0 && p.z < o.z1));
  }
});

test('おなじ たねなら おなじ ちらかりかた', () => {
  assert.deepEqual(C.createGame(42).items, C.createGame(42).items);
});

test('もてる 数を こえて ひろえない', () => {
  const g = C.createGame(3);
  const ids = g.items.slice(0, C.BASE_CAP + 1).map(i => i.id);
  ids.slice(0, C.BASE_CAP).forEach(id => assert.ok(C.pick(g, id).ok));
  assert.deepEqual(C.pick(g, ids[C.BASE_CAP]), { ok: false, why: 'full' });
});

test('山の 上の 本は 下の 本を とると おりてくる', () => {
  const g = C.createGame(5);
  const stack = C.pileItems(g, 0).filter(i => !i.spill);
  const top = stack[stack.length - 1];
  const before = C.floorPose(g, top).y;
  C.pick(g, stack[0].id);
  assert.ok(C.floorPose(g, top).y < before);
});

test('ちがう たなには しまえない。おなじ たなの べつの れつなら おしいと おしえる', () => {
  const g = C.createGame(7);
  const it = g.items.find(i => i.s === 0);
  C.pick(g, it.id);
  assert.equal(C.shelveRow(g, C.seriesAt(1, 0)).why, 'wrong');
  assert.equal(C.shelveRow(g, 1).why, 'otherRow');
  assert.equal(it.state, 'hand');
  const r = C.shelveRow(g, 0);
  assert.deepEqual(r.placed, [it.id]);
  assert.equal(it.state, 'shelf');
  assert.equal(g.hand.length, 0);
});

test('れつが そろうと まほうを おぼえ、かばんが 大きくなる', () => {
  const g = C.createGame(9);
  const fill = s => C.shelveDirect(g, g.items.filter(i => i.s === s).map(i => i.id));
  const first = fill(0);
  assert.deepEqual(first.completed, [0]);
  assert.deepEqual(first.unlocked.map(u => u.key), ['yobiyose']);
  assert.ok(C.has(g, 'yobiyose') && !C.has(g, 'michi'));
  assert.equal(C.capacity(g), 4);
  fill(1); fill(2);
  assert.equal(C.capacity(g), 6);
  for (let s = 3; s < 12; s++) fill(s);
  assert.equal(C.capacity(g), 8);
  for (let s = 12; s < C.SERIES.length; s++) fill(s);
  assert.ok(C.isCleared(g));
  assert.equal(C.nextUnlock(g), null);
});

test('ちかい じゅんに ゆかの 本を えらぶ', () => {
  const g = C.createGame(11);
  const p = g.piles[3];
  const near = C.nearestFloor(g, p.x, p.z, 3);
  assert.equal(near.length, 3);
  assert.ok(near.every(i => i.pile === 3));
});

test('ほぞんして よみこむと しまった 本が もどる（手の 本は ゆかに もどる）', () => {
  const g = C.createGame(13);
  C.shelveDirect(g, g.items.filter(i => i.s === 4).map(i => i.id));
  const held = g.items.find(i => i.state === 'floor');
  C.pick(g, held.id);
  g.time = 123.4;
  const back = C.restore(JSON.parse(JSON.stringify(C.serialize(g))));
  assert.equal(back.items.filter(i => i.state === 'shelf').length, 8);
  assert.ok(back.rows[4]);
  assert.equal(back.items[held.id].state, 'floor');
  assert.equal(back.time, 123);
  assert.equal(C.restore({ v: 1 }), null);
  assert.equal(C.restore(null), null);
});

test('たなの 本の いちは その たなの まえに ならぶ', () => {
  for (let s = 0; s < C.SERIES.length; s++) {
    const c = C.sectionCase(C.SERIES[s].sec), n = C.caseNormal(c);
    const a = C.slotPose(s, 0), b = C.slotPose(s, C.VOLS - 1);
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 0.8);
    const front = (a.x - c.x) * n.x + (a.z - c.z) * n.z;
    assert.ok(front > -C.CASE.d / 2 && front < C.CASE.d / 2);
  }
});

test('スタートから どの たなの まえにも あるいて いける', () => {
  const g = C.createGame(21);
  for (let sec = 0; sec < C.SECTIONS.length; sec++) {
    const a = C.approachPoint(C.sectionCase(sec));
    const path = C.findPath(g, C.START, a);
    assert.ok(path && path.length, `たな ${sec}`);
    const end = path[path.length - 1];
    assert.ok(Math.hypot(end.x - a.x, end.z - a.z) < 0.3);
    let prev = C.START;
    for (const p of path) {
      for (let k = 1; k <= 20; k++) assert.ok(!C.blocked(g, prev.x + (p.x - prev.x) * k / 20, prev.z + (p.z - prev.z) * k / 20), 'みちの とちゅうで ぶつかる');
      prev = p;
    }
  }
});

test('本の 山の まんなかを めざしても、山の てまえまで あるける', () => {
  const g = C.createGame(22);
  for (const p of g.piles) {
    const path = C.findPath(g, C.START, p);
    assert.ok(path && path.length);
    const end = path[path.length - 1];
    assert.ok(Math.hypot(end.x - p.x, end.z - p.z) < 1.2);
  }
});
