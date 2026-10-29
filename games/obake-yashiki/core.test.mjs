import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from './core.mjs';

// おなじ たねなら おなじ ならびに なる かんたんな 乱数
function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}
const idsOf = (g, s) => g.items.filter(i => i.s === s).map(i => i.id);

test('はじめは 4色×5さつ が ぜんぶ ゆかに あり、ゆかの はんいに おさまる', () => {
  const g = C.createGame(seeded(1));
  assert.equal(g.items.length, C.SERIES.length * C.PER);
  for (const it of g.items) {
    assert.equal(it.state, 'floor');
    assert.ok(it.x > 100 && it.x < 900, `x=${it.x}`);
    assert.ok(it.y > 330 && it.y < 620, `y=${it.y}`);
  }
  for (let s = 0; s < C.SERIES.length; s++) {
    assert.deepEqual(g.items.filter(i => i.s === s).map(i => i.n).sort(), [1, 2, 3, 4, 5]);
  }
});

test('山の 本は 0から じゅんに つまれ、ぬくと つみなおされる', () => {
  const g = C.createGame(seeded(2));
  const pile = g.items[0].pile;
  const before = g.items.filter(i => i.pile === pile).map(i => i.z).sort((a, b) => a - b);
  assert.deepEqual(before, before.map((_, k) => k));
  C.pick(g, g.items[0].id);
  const after = g.items.filter(i => i.state === 'floor' && i.pile === pile).map(i => i.z).sort((a, b) => a - b);
  assert.deepEqual(after, after.map((_, k) => k));
});

test('かごは 5さつまで。6さつめは はいらない', () => {
  const g = C.createGame(seeded(3));
  for (let i = 0; i < C.CAP; i++) assert.equal(C.pick(g, i).ok, true);
  assert.deepEqual(C.pick(g, C.CAP), { ok: false, why: 'full' });
  assert.equal(C.pick(g, 0).why, 'notFloor');
});

test('ちがう 色の たなには もどせない。おなじ 色だけ もどり、コインが ふえる', () => {
  const g = C.createGame(seeded(4));
  const red = idsOf(g, 0), blue = idsOf(g, 1);
  assert.equal(C.putToRow(g, 0).why, 'empty');
  C.pick(g, red[0]); C.pick(g, red[1]); C.pick(g, blue[0]);
  assert.equal(C.putToRow(g, 2).why, 'wrong');
  const r = C.putToRow(g, 0);
  assert.equal(r.placed, 2);
  assert.deepEqual(g.basket, [blue[0]]);
  assert.equal(g.coins, 2 * C.COIN_BOOK);
});

test('1れつ そろうと ボーナス。ぜんぶ もどすと クリア', () => {
  const g = C.createGame(seeded(5));
  for (let s = 0; s < C.SERIES.length; s++) {
    idsOf(g, s).forEach(id => C.pick(g, id));
    const ri = C.ROWS.findIndex(r => r.s === s);
    assert.deepEqual(C.putToRow(g, ri).completed, [ri]);
  }
  assert.equal(C.isCleared(g), true);
  assert.equal(C.leftCount(g), 0);
  assert.equal(g.coins, g.items.length * C.COIN_BOOK + C.ROWS.length * C.COIN_ROW);
});

test('オバケは 本の 多い たなを ねらい、とどくと その たなと かごが ちらかる', () => {
  const g = C.createGame(seeded(6));
  const green = idsOf(g, 2);
  green.slice(0, 3).forEach(id => C.pick(g, id));
  C.putToRow(g, 2);
  assert.equal(C.chooseGhostRow(g, seeded(9)), 2);
  C.pick(g, idsOf(g, 0)[0]);
  const n = C.boo(g, 2, seeded(7));
  assert.equal(n, 4);
  assert.equal(g.basket.length, 0);
  assert.ok(g.items.every(i => i.state === 'floor'));
  assert.equal(g.rowDone[2], false);
});

test('おいはらうと コインが ふえる', () => {
  const g = C.createGame(seeded(8));
  C.scare(g);
  assert.equal(g.scared, 1);
  assert.equal(g.coins, C.COIN_SCARE);
});
