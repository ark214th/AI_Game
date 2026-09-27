// node --test games/punyu-kirakira/rewards.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, STICKERS, unlockedItems, unlockedStickers, normalizeProgress, medalCount } from './rewards.mjs';
import { STAGES } from './stages.mjs';

const empty = normalizeProgress({});
const full = normalizeProgress({
  stages: Object.fromEntries(STAGES.map(s => [s.id, { clear: true, medals: [true, true, true], noDamage: true }])),
  starsTotal: 5000, flags: { loop: true, ride: true, switch: true, boing: true }, stomps: 50,
});

test('はじめから使えるきせかえがある（あたま・かお・いろ）', () => {
  const have = unlockedItems(empty);
  for (const slot of ['head', 'face', 'color']) assert.ok(ITEMS.some(i => i.slot === slot && have.has(i.id)), slot);
  assert.equal(unlockedStickers(empty).size, 0);
});

test('ぜんぶ遊ぶと、きせかえとシールがすべてそろう', () => {
  assert.equal(medalCount(full), STAGES.length * 3);
  assert.equal(unlockedItems(full).size, ITEMS.length);
  assert.equal(unlockedStickers(full).size, STICKERS.length);
});

test('id は重ならず、まだのものにはヒントがある', () => {
  for (const list of [ITEMS, STICKERS]) assert.equal(new Set(list.map(x => x.id)).size, list.length);
  const have = unlockedItems(empty);
  for (const it of ITEMS) if (!have.has(it.id)) assert.ok(it.hint, it.id);
  for (const st of STICKERS) assert.ok(st.hint && st.icon, st.id);
});

test('古い保存データでもこわれない', () => {
  const p = normalizeProgress({ stages: { '1-1': { clear: true } }, starsTotal: 'x' });
  assert.equal(p.starsTotal, 0);
  assert.ok(unlockedItems(p).has('flower'));
  assert.equal(medalCount(p), 0);
});
