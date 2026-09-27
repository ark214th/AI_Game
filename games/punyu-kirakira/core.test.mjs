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

// 「おまかせ はしり」＋素朴なジャンプの自動操作。ステージが最後まで進めるかの確認用
export function bot(game) {
  const p = game.p, t = game.t;
  if (p.ride) return { jump: p.ride.y >= p.ride.top - 0.05 };
  const pit = p.grounded && !game.moverAhead() && t.floorAt(p.x + 0.8, p.y + 0.4, 0).h === null;
  const wall = t.walls.some(w => w.face === 1 && w.x > p.x && w.x - p.x < 1.3 && w.top > p.y + TUNE.stepUp && w.top < p.y + 2.5);
  const enemy = game.enemies.some(e => e.state === 'walk' && e.kind !== 'fly' && e.x > p.x && e.x - p.x < 2.4 && Math.abs(e.y - p.y) < 1);
  const spike = game.spikes.some(s => s.x > p.x && s.x - p.x < 1.9 && Math.abs(s.y - p.y) < 1);
  if (p.grounded && (pit || wall || enemy || spike)) bot.hold = 0.45;
  bot.hold = Math.max(0, (bot.hold || 0) - DT);
  return { jump: bot.hold > 0 };
}

// ボス戦：ボスが低いときに近づいて踏む。高いときや攻撃中は離れる
export function bossBot(game) {
  const B = game.boss, p = game.p;
  if (!B.active) return bot(game);
  if (B.done) {
    if (!game.goal) return {};
    return { right: game.goal.x > p.x + 0.3, left: game.goal.x < p.x - 0.3 };
  }
  const dx = B.x - p.x;
  const low = B.y - B.floor < 0.6 && B.state !== 'hurt';
  const shot = game.shots.some(s => Math.abs(s.x - p.x) < 1.8 && s.y - p.y < 1.2 && (s.kind === 'shell' || s.vy < 0));
  let move = 0, jump = false;
  if (low) { move = Math.sign(dx); if (Math.abs(dx) < 2.8 && p.grounded) jump = true; }
  else if (Math.abs(dx) < 4) move = -Math.sign(dx) || 1;
  if (shot && p.grounded) jump = true;
  if (!p.grounded) jump = bossBot.holding; // 空中ではジャンプを押しっぱなし
  bossBot.holding = jump || (!p.grounded && bossBot.holding);
  if (p.grounded) bossBot.holding = jump;
  return { left: move < 0, right: move > 0, jump };
}

for (const stage of STAGES) {
  test(`${stage.id}: 自動操作で最後まで進める`, () => {
    const g = new Game(stage, { autoRun: true });
    bot.hold = 0;
    let t = 0;
    const limit = stage.bossStage ? 200 : 180;
    while (g.state !== 'clear' && t < limit) {
      if (g.boss) g.autoRun = !g.boss.active;
      g.step(DT, stage.bossStage ? bossBot(g) : bot(g)); t += DT;
    }
    const where = `x=${g.p.x.toFixed(1)} y=${g.p.y.toFixed(1)} state=${g.state} boss=${g.boss ? g.boss.hp + '/' + g.boss.state : '-'}`;
    assert.equal(g.state, 'clear', `stuck at ${where}`);
    assert.equal(g.stats.faints, 0, `faints ${where}`);
    if (!stage.bossStage) assert.ok(g.stats.bubbles === 0, `bubbles ${g.stats.bubbles}`);
    console.log(`  ${stage.id}: ${t.toFixed(1)}秒 星${g.starCount}/${g.stars.length} メダル${g.medalCount} ダメージ${g.stats.hurts} 穴${g.stats.bubbles}`);
  });

  test(`${stage.id}: 穴は歩きのジャンプで越えられる幅（広い穴には足場がある）`, () => {
    const pieces = stage.terrain.pieces;
    for (let i = 1; i < pieces.length; i++) {
      const a = pieces[i - 1].x1, b = pieces[i].x0, w = b - a;
      if (w <= 3) continue;
      // 広い穴：動く足場・橋・ぽよん雲・くずれる足場のどれかがある
      const helps = stage.terrain.platforms.filter(q => q.x < b && q.x + q.w + (q.dx || 0) > a);
      assert.ok(helps.length > 0, `wide gap ${w} at ${a}`);
    }
  });

  test(`${stage.id}: 穴のすぐそばに敵やトゲを置かない`, () => {
    const P = stage.terrain.pieces;
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1].x1, b = P[i].x0;
      for (const e of stage.enemy) {
        if (e.type === 'fly') continue;
        assert.ok(!(e.x1 > a - 2.5 && e.x0 < b + 2.5), `enemy ${e.x} near gap ${a}`);
      }
      for (const s of stage.spike) assert.ok(!(s.x > a - 3 && s.x < b + 3), `spike ${s.x} near gap ${a}`);
    }
  });

  test(`${stage.id}: メダル3枚とゴール（またはボス）がある`, () => {
    for (const s of [...stage.star, ...stage.medal]) assert.ok(Number.isFinite(s.y));
    assert.equal(stage.medal.length, 3);
    assert.ok(stage.goal || stage.boss);
  });
}
