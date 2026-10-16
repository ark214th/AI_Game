import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from './core.mjs';
import { BASES, CREAMS, TOPPINGS, CUSTOMERS, DRESSES, THEMES, UNLOCKS, KIND_TABLE, ALBUM_MAX, MAX_TOPPINGS } from './data.mjs';

const seq = vals => { let i = 0; return () => vals[i++ % vals.length]; };

test('どの おかしも まんなかに かざれて、そとには かざれない', () => {
  for (const b of Object.keys(BASES)) {
    const a = C.areaOf(b).add[0];
    assert.ok(C.inside(b, a.x + (a.t === 'r' ? a.w / 2 : 0), a.y + 0.02) || b === 'donut', b);
    assert.equal(C.inside(b, 0.02, 0.02), false, b);
  }
  // ドーナツの あなには かざれない
  assert.equal(C.inside('donut', 0.5, 0.53), false);
  assert.equal(C.inside('donut', 0.5, 0.72), true);
});

test('クリームを ぬると ひろさが ふえ、おなじ ところは かぞえない', () => {
  const cov = C.newCoverage('cake');
  assert.ok(cov.total > 100);
  const a = C.paint(cov, 0.5, 0.6, 0.1);
  assert.ok(a > 0);
  assert.equal(C.paint(cov, 0.5, 0.6, 0.1), 0);
  for (let y = 0.3; y < 0.95; y += 0.04) for (let x = 0.1; x < 0.9; x += 0.04) C.paint(cov, x, y, 0.1);
  assert.equal(C.coverage(cov), 1);
});

test('かざりは おかしの うえにだけ、かずに かぎりが ある', () => {
  const sw = C.newSweet('cupcake');
  assert.equal(C.addTopping(sw, { x: 0.05, y: 0.05, id: 'star' }), false);
  for (let i = 0; i < MAX_TOPPINGS + 5; i++) C.addTopping(sw, { x: 0.5, y: 0.45, id: 'star' });
  assert.equal(sw.tops.length, MAX_TOPPINGS);
  assert.equal(C.addDollop(sw, { x: 0.5, y: 0.45, c: 'pink' }), true);
});

test('ちゅうもんどおりだと だいよろこび、ちがっても ハートは もらえる', () => {
  const order = { cust: 'usagi', base: 'cake', need: { k: 'top', id: 'strawberry' } };
  const sw = C.newSweet('cake');
  C.addTopping(sw, { x: 0.5, y: 0.45, id: 'strawberry' });
  assert.equal(C.judge(order, sw).level, 'perfect');
  const other = C.newSweet('donut');
  const r = C.judge(order, other);
  assert.equal(r.level, 'good');
  assert.ok(r.hearts >= 2);
  // クリームの ちゅうもんは ぬっても しぼっても よい
  const o2 = { cust: 'kuma', base: 'cupcake', need: { k: 'cream', id: 'choco' } };
  const s2 = C.newSweet('cupcake'); s2.dollops.push({ x: 0.5, y: 0.4, c: 'choco', k: 'swirl' });
  assert.equal(C.judge(o2, s2).level, 'perfect');
  const s3 = C.newSweet('cupcake'); s3.frost.push({ c: 'choco', p: [0.5, 0.4] });
  assert.equal(C.judge(o2, s3).level, 'perfect');
});

test('ちゅうもんは ふえた ものだけで できていて、ことばは ひらがな・カタカナ', () => {
  for (const hearts of [0, 10, 50, 200]) {
    const save = C.normalize({ hearts, met: Object.keys(CUSTOMERS) });
    const un = C.unlockedSet(hearts);
    for (let i = 0; i < 60; i++) {
      const o = C.makeOrder(save);
      assert.ok(un.has('cust:' + o.cust) && un.has('base:' + o.base));
      assert.ok(un.has((o.need.k === 'cream' ? 'cream:' : 'top:') + o.need.id));
      assert.match(C.orderText(o), /^[ぁ-んァ-ヶー 　！]+$/);
      save.lastCust = o.cust;
    }
  }
});

test('おなじ おきゃくさんは つづけて こない。はじめての こは さきに くる', () => {
  const save = C.normalize({ hearts: 0, met: ['usagi'], lastCust: 'usagi' });
  assert.equal(C.makeOrder(save, seq([0.1])).cust, 'kuma');
  save.met.push('kuma'); save.lastCust = 'kuma';
  assert.equal(C.makeOrder(save, seq([0.9])).cust, 'usagi');
});

test('ハートが たまると あたらしい ものが ふえ、さいごまで ぜんぶ ふえる', () => {
  assert.deepEqual(C.newlyUnlocked(4, 6), ['base:donut']);
  const all = C.unlockedSet(9999);
  for (const [kind, table] of Object.entries(KIND_TABLE)) for (const id of Object.keys(table)) assert.ok(all.has(`${kind}:${id}`), `${kind}:${id}`);
  for (const u of UNLOCKS) for (const it of u.items) { const [k, id] = it.split(':'); assert.ok(KIND_TABLE[k]?.[id], it); }
  assert.equal(C.nextUnlock(0), 5);
  assert.equal(C.nextUnlock(9999), null);
});

test('わたすと ハートと アルバムが ふえる', () => {
  const save = C.newSave();
  const order = { cust: 'usagi', base: 'cake', need: { k: 'top', id: 'strawberry' } };
  const sw = C.newSweet('cake'); C.addTopping(sw, { x: 0.5, y: 0.45, id: 'strawberry' });
  const r = C.serve(save, order, sw);
  assert.equal(save.hearts, 3);
  assert.equal(save.album.length, 1);
  assert.deepEqual(save.met, ['usagi']);
  sw.tops.length = 0; // アルバムは コピーで のこる
  assert.equal(save.album[0].sweet.tops.length, 1);
  for (let i = 0; i < ALBUM_MAX + 3; i++) C.serve(save, order, sw);
  assert.equal(save.album.length, ALBUM_MAX);
  assert.ok(r.unlocked.length === 0);
});

test('ひらがな キーボード：゛ ゜ ちいさく と カタカナ', () => {
  assert.equal(C.modifyLast('はな', 'daku'), 'はな');
  assert.equal(C.modifyLast('か', 'daku'), 'が');
  assert.equal(C.modifyLast('が', 'daku'), 'か');
  assert.equal(C.modifyLast('は', 'handaku'), 'ぱ');
  assert.equal(C.modifyLast('ぱ', 'daku'), 'ば');
  assert.equal(C.modifyLast('ば', 'handaku'), 'ぱ');
  assert.equal(C.modifyLast('ぱ', 'handaku'), 'は');
  assert.equal(C.modifyLast('ゆ', 'small'), 'ゅ');
  assert.equal(C.modifyLast('ゅ', 'small'), 'ゆ');
  assert.equal(C.modifyLast('カ', 'daku'), 'ガ');
  assert.equal(C.kata('みるく'), 'ミルク');
  assert.equal(C.typeChar('あいうえおか', 'き'), 'あいうえおか');
  assert.equal(C.backspace('あい'), 'あ');
  assert.equal(C.modifyLast('', 'daku'), '');
});

test('よびかた', () => {
  assert.equal(C.callName('もも'), 'ももちゃん');
  assert.equal(C.callName('ももちゃん'), 'ももちゃん');
  assert.equal(C.callName(''), 'パティシエさん');
});

test('こわれた ほぞんでも あそべる', () => {
  assert.deepEqual(C.normalize(null), C.newSave());
  const s = C.normalize({ hearts: -3, dress: 'rainbow', theme: 'nope', album: [{ bad: 1 }], met: ['usagi', 'x'], name: 'あいうえおかきく' });
  assert.equal(s.hearts, 0);
  assert.equal(s.dress, 'pink');
  assert.equal(s.theme, 'ichigo');
  assert.deepEqual(s.album, []);
  assert.deepEqual(s.met, ['usagi']);
  assert.equal(s.name, 'あいうえおか');
});

test('がめんに でる ことばに かんじが ない', () => {
  const texts = [];
  for (const t of [BASES, CREAMS, TOPPINGS, DRESSES, THEMES]) for (const v of Object.values(t)) texts.push(v.name, v.adj || '');
  for (const c of Object.values(CUSTOMERS)) texts.push(c.name, ...c.hello, ...c.love);
  for (const s of texts) assert.doesNotMatch(s, /[一-鿿]/, s);
});
