// node --test games/punyu-kirakira/core.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, TUNE, Builder } from './core.mjs';
import { STAGES } from './stages.mjs';

const DT = 1 / 120;

function flatStage(len = 60) {
  const b = new Builder(0);
  b.flat(len);
  return b.finish({ id: 't' });
}

function simulate(game, input, seconds) {
  for (let i = 0; i < seconds / DT; i++) game.step(DT, typeof input === 'function' ? input(game) : input);
}

test('ジャンプの高さ：短く押しても1マス以上、長押しで2マス半ほど', () => {
  const high = (holdFrames) => {
    const g2 = new Game(flatStage());
    let f = 0, top = 0;
    for (let i = 0; i < 180; i++) { g2.step(DT, { jump: f++ < holdFrames }); top = Math.max(top, g2.p.y); }
    return top;
  };
  const tap = high(1), hold = high(200);
  assert.ok(tap > 1.2 && tap < 1.8, `tap ${tap}`);
  assert.ok(hold > 2.3 && hold < 3.0, `hold ${hold}`);
});

test('足場のはしから少し遅れてもジャンプできる', () => {
  const b = new Builder(0);
  b.flat(12).gap(4).flat(10);
  const g = new Game(b.finish({ id: 't' }));
  let pressAt = -1;
  simulate(g, gm => {
    // 足場が切れて 0.08 秒後に押し、そのまま押し続ける
    if (pressAt < 0 && !gm.p.grounded && gm.p.airT > 0.07) pressAt = gm.time;
    return { right: true, jump: pressAt >= 0 && gm.time - pressAt < 0.4 };
  }, 4);
  assert.ok(g.stats.jumps === 1, 'coyote jump');
  assert.equal(g.stats.bubbles, 0);
});

test('穴に落ちると、しゃぼん玉で安全な場所へ戻る（ハート1つ減るだけ）', () => {
  const b = new Builder(0);
  b.flat(10).gap(6).flat(10);
  const g = new Game(b.finish({ id: 't' }));
  simulate(g, { right: true }, 3);
  assert.equal(g.stats.bubbles, 1);
  assert.equal(g.hearts, TUNE.maxHearts - 1);
  simulate(g, {}, 2);
  assert.equal(g.state, 'play');
  assert.ok(g.p.grounded && g.p.x < 4.1, `back on ground at ${g.p.x}`);
});

test('ハートがなくなってもゲームオーバーにならず、旗から再開する', () => {
  const g = new Game(flatStage());
  for (let i = 0; i < 3; i++) { g.p.invuln = 0; g.hurt(g.p.x + 1); }
  assert.equal(g.state, 'faint');
  simulate(g, {}, 2);
  assert.equal(g.state, 'play');
  assert.equal(g.hearts, TUNE.maxHearts);
});

test('ばねに乗ると高く跳ぶ', () => {
  const b = new Builder(0);
  b.flat(30);
  b.add('spring', 3);
  const g = new Game(b.finish({ id: 't' }));
  let top = 0;
  for (let i = 0; i < 400; i++) { g.step(DT, { right: g.p.x < 3 }); top = Math.max(top, g.p.y); }
  assert.ok(top > 6.5, `spring top ${top}`);
});

test('いたずらっ子は上から踏むと逃げていく', () => {
  const b = new Builder(0);
  b.flat(30);
  b.add('enemy', 6, 0, { x0: 6, x1: 6.01 });
  const g = new Game(b.finish({ id: 't' }));
  g.p.x = 6; g.p.y = 2; g.p.grounded = false; g.p.vy = -3;
  simulate(g, {}, 0.3);
  assert.notEqual(g.enemies[0].state, 'walk');
  assert.equal(g.hearts, TUNE.maxHearts);
});

// 「おまかせ はしり」＋素朴なジャンプの自動操作で、ステージを最後まで進めるか
function bot(game) {
  const p = game.p, t = game.t;
  const ahead = p.x + 1.4;
  const pit = p.grounded && t.floorAt(ahead, p.y + 0.4, 0).h === null;
  const wall = t.walls.some(w => w.face === 1 && w.x > p.x && w.x - p.x < 1.3 && w.top > p.y + TUNE.stepUp && w.top < p.y + 2.5);
  const enemy = game.enemies.some(e => e.state === 'walk' && e.x > p.x && e.x - p.x < 2.4 && Math.abs(e.y - p.y) < 1);
  if (p.grounded && (pit || wall || enemy)) bot.hold = 0.35;
  bot.hold = Math.max(0, (bot.hold || 0) - DT);
  return { jump: bot.hold > 0 };
}

for (const stage of STAGES) {
  test(`${stage.id}: おまかせ はしり で最後まで進める`, () => {
    const g = new Game(stage, { autoRun: true });
    bot.hold = 0;
    let t = 0;
    while (g.state !== 'clear' && t < 240) { g.step(DT, bot(g)); t += DT; }
    assert.equal(g.state, 'clear', `stuck at x=${g.p.x.toFixed(1)} state=${g.state}`);
    assert.ok(t < 120, `time ${t}`);
    assert.equal(g.stats.faints, 0);
    assert.ok(g.stats.bubbles === 0, `bubbles ${g.stats.bubbles}`);
    console.log(`  ${stage.id}: ${t.toFixed(1)}秒 星${g.starCount}/${g.stars.length} メダル${g.medalCount} ダメージ${g.stats.hurts}`);
  });

  test(`${stage.id}: 穴は歩きのジャンプで余裕をもって越えられる幅`, () => {
    const pieces = stage.terrain.pieces;
    for (let i = 1; i < pieces.length; i++) {
      const w = pieces[i].x0 - pieces[i - 1].x1;
      assert.ok(w <= 3, `gap ${w} at ${pieces[i].x0}`);
    }
  });

  test(`${stage.id}: 星とメダルは空中の届く高さにある`, () => {
    for (const s of [...stage.star, ...stage.medal]) {
      assert.ok(Number.isFinite(s.y));
      const f = stage.terrain.floorAt(s.x, s.y, 1.5).h;
      assert.ok(f === null || s.y - f < 8, `too high at ${s.x}`);
    }
    assert.equal(stage.medal.length, 3);
    assert.ok(stage.goal);
  });
}
