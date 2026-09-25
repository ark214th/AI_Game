import test from 'node:test';
import assert from 'node:assert/strict';
import {Game, W, H, PLAYER_R, GRAZE_R, POC_Y, DEATHBOMB_FRAMES, EXTENDS, ATTACKS, BOSSES} from './core.mjs';
import {TRACKS, midi, chord} from './music.mjs';

// ボスの攻撃中、弾以外の要素を排除した検証用の状況
function arena(id = 'c_n1', o = {}) {
  const g = new Game({mode: 'practice', attack: id, difficulty: 1, seed: 5, ...o});
  for (let i = 0; i < 70 && g.phase !== 'attack'; i++) g.step({});
  g.atk.def = {...g.atk.def, update() {}}; // 攻撃パターンを止める
  g.bullets.length = 0; g.player.invuln = 0; g.events.length = 0;
  g.player.x = g.player.px = W / 2; g.player.y = g.player.py = 380;
  return g;
}
const run = (g, n, input = {}) => { for (let i = 0; i < n; i++) g.step(typeof input === 'function' ? input(i) : input); };
const types = g => g.events.map(e => e.type);

test('当たり判定は見た目よりずっと小さく、すれすれの弾はかすりになる', () => {
  const g = arena();
  const b = g.shot(W / 2 + PLAYER_R + 2.6 + 1.2, 300, 2, Math.PI / 2, 'orb', 'red'); // 自機中心から約6px横を通過
  b.age = 10;
  run(g, 60);
  assert.equal(g.player.state, 'alive');
  assert.equal(g.graze, 1, 'すれすれの弾は1回だけかすりとして数える');
  const far = g.shot(W / 2 + GRAZE_R + 10, 300, 2, Math.PI / 2, 'orb', 'red'); far.age = 10;
  run(g, 60);
  assert.equal(g.graze, 1, 'かすり範囲外は数えない');
  const hit = g.shot(W / 2 + 1, 300, 2, Math.PI / 2, 'orb', 'red'); hit.age = 10;
  run(g, 60);
  assert.notEqual(g.player.state, 'alive');
});

test('1フレームで自機を飛び越える高速弾もすり抜けずに当たる', () => {
  const g = arena();
  const b = g.shot(W / 2, 380 - 12, 24, Math.PI / 2, 'pellet', 'white'); b.age = 10;
  g.step({});
  assert.equal(g.player.state, 'hit');
});

test(`被弾後${DEATHBOMB_FRAMES}フレーム以内のボムで被弾を取り消せる（喰らいボム）`, () => {
  for (let late = 1; late <= DEATHBOMB_FRAMES; late++) {
    const g = arena();
    g.playerHit();
    run(g, late - 1);
    assert.equal(g.player.state, 'hit', `${late}フレーム目まで猶予が続く`);
    g.step({bomb: true});
    assert.equal(g.player.state, 'alive', `${late}フレーム目のボムは間に合う`);
    assert.equal(g.lives, 0); assert.equal(g.bombs, 2); assert.equal(g.deathbombs, 1);
    assert.ok(g.player.invuln > 100 && g.bombT > 0);
    assert.ok(types(g).includes('deathbomb'));
  }
  const late = arena();
  late.playerHit(); run(late, DEATHBOMB_FRAMES);
  assert.equal(late.player.state, 'dead');
  late.step({bomb: true});
  assert.notEqual(late.player.state, 'alive', `${DEATHBOMB_FRAMES + 1}フレーム目では遅い`);
});

test('被弾中は動けず、ボムがなければ猶予後にミスになる', () => {
  const g = new Game({mode: 'story', difficulty: 1, seed: 2});
  g.bombs = 0; g.player.invuln = 0; g.power = 3;
  const x = g.player.x;
  g.playerHit();
  run(g, DEATHBOMB_FRAMES, {dx: 1, bomb: true});
  assert.equal(g.player.x, x);
  assert.equal(g.player.state, 'dead');
  assert.equal(g.lives, 1); assert.equal(g.bombs, 3, 'ミスするとボムは3発に戻る');
  assert.ok(g.power < 3 && g.power >= 1);
  run(g, 60);
  assert.equal(g.player.state, 'alive');
  assert.ok(g.player.invuln > 100, '復活直後は無敵');
});

test('ボムは弾を星アイテムに変えて消し、スペルのボーナスを失う', () => {
  const g = arena('c_s1');
  for (let i = 0; i < 40; i++) g.shot(100 + i * 4, 120, 1, Math.PI / 2, 'orb', 'blue');
  g.step({bomb: true});
  assert.equal(g.bullets.length, 0);
  assert.ok(g.items.filter(i => i.type === 'star').length >= 40);
  assert.equal(g.atk.spell.failed, true); assert.equal(g.atk.spell.bonus, 0);
  run(g, 60);
  assert.equal(g.items.filter(i => i.type === 'star').length, 0, '星アイテムは自動で集まる');
});

test('被弾もボムもなく倒せばスペル取得、被弾していれば失敗', () => {
  const ok = arena('c_s1');
  run(ok, 50); ok.boss.hp = 1; ok.power = 4;
  run(ok, 30);
  assert.equal(ok.phase, 'practiceDone'); assert.equal(ok.result.captured, true); assert.equal(ok.captures, 1);
  const bad = arena('c_s1');
  bad.playerHit(); bad.step({bomb: true});
  run(bad, 50); bad.boss.hp = 1; run(bad, 30);
  assert.equal(bad.result.captured, false);
});

test('耐久スペルは時間切れまで耐えれば取得でき、ボスは攻撃を受けない', () => {
  const g = arena('s_s3');
  const hp = g.boss.hp;
  g.atk.timer = 5;
  run(g, 10, {focus: true});
  assert.equal(g.boss.hp, hp);
  assert.equal(g.result.captured, true);
});

test('時間切れの通常スペルはボーナスなし', () => {
  const g = arena('i_s1');
  g.atk.timer = 3; run(g, 5);
  assert.equal(g.result.captured, false);
});

test('上部の線より上ではアイテムをすべて最大価値で回収する', () => {
  const g = arena();
  g.item('point', 30, 400); g.item('point', 350, 420);
  g.player.x = g.player.px = 60; g.player.y = g.player.py = POC_Y - 10;
  const before = g.score;
  run(g, 80);
  assert.equal(g.pointItems, 2);
  assert.equal(g.score - before >= g.pointValue * 2, true);
});

test('得点アイテムで残機が増える', () => {
  const g = new Game({mode: 'story', seed: 1});
  const lives = g.lives;
  g.pointItems = EXTENDS[0] - 1; g.item('point', g.player.x, g.player.y);
  run(g, 3);
  assert.equal(g.lives, lives + 1);
  assert.ok(g.events.some(e => e.type === 'extend'));
});

test('予告中のレーザーは当たらず、照射中は当たる', () => {
  const g = arena();
  g.laser(W / 2, 100, Math.PI / 2, {warn: 30, life: 100});
  run(g, 20);
  assert.equal(g.player.state, 'alive');
  run(g, 25);
  assert.equal(g.player.state, 'hit');
});

test('残機がなくなるとゲームオーバー、コンティニューでスコアは回数に戻る', () => {
  const g = new Game({mode: 'story', seed: 3});
  g.lives = 0; g.score = 123456; g.player.invuln = 0;
  g.playerHit(); run(g, DEATHBOMB_FRAMES);
  assert.equal(g.gameOver, true);
  const f = g.frame; g.step({}); assert.equal(g.frame, f, 'ゲームオーバー中は進まない');
  g.continueGame();
  assert.equal(g.score, 1); assert.equal(g.lives, 2); assert.equal(g.player.state, 'alive');
});

test('全ての攻撃が全難易度で最後まで動き、弾数が上限に届かない', () => {
  for (const id of Object.keys(ATTACKS)) for (const difficulty of [0, 1, 2]) {
    const g = new Game({mode: 'practice', attack: id, difficulty, seed: 11});
    let max = 0;
    for (let i = 0; i < 70 * 60 && g.phase !== 'practiceDone'; i++) {
      g.player.invuln = 5; g.step({dx: Math.sin(i / 40)});
      max = Math.max(max, g.bullets.length);
      for (const b of g.bullets) assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y), `${id} の弾座標`);
      g.events.length = 0;
    }
    assert.equal(g.phase, 'practiceDone', `${id}/${difficulty} が終了する`);
    assert.ok(max < 1200, `${id}/${difficulty} の最大弾数 ${max}`);
  }
});

test('同じシードなら同じ弾幕になる', () => {
  const a = new Game({mode: 'practice', attack: 'i_s2', seed: 99}), b = new Game({mode: 'practice', attack: 'i_s2', seed: 99});
  run(a, 400); run(b, 400);
  assert.deepEqual(a.bullets.map(x => [x.x, x.y, x.color]), b.bullets.map(x => [x.x, x.y, x.color]));
});

test('本編：道中→会話→ボス4連戦を3ステージ通してエンディングまで進む', () => {
  const g = new Game({mode: 'story', difficulty: 1, seed: 7});
  const seen = new Set(); let ended = false, dialogues = 0;
  for (let i = 0; i < 60 * 60 * 12 && !ended; i++) {
    if (g.dialogue) { dialogues++; g.advanceDialogue(); }
    g.player.invuln = 5; g.lives = 5;
    const bx = g.boss ? g.boss.x : W / 2;
    g.step({focus: true, dx: Math.abs(bx - g.player.x) > 3 ? Math.sign(bx - g.player.x) : 0});
    for (const e of g.events) { if (e.type === 'spell') seen.add(e.id); if (e.type === 'ending') ended = true; }
    g.events.length = 0;
  }
  assert.ok(ended, 'エンディングに到達');
  assert.equal(seen.size, 8, '全8枚のスペルアリアに出会う');
  assert.ok(dialogues >= BOSSES.reduce((n, b) => n + b.dialogue.length, 0));
  assert.ok(g.power > 3, '道中のアイテムでパワーが育つ');
});

test('デモ画面は自機なしで攻撃を巡回し続ける', () => {
  const g = new Game({mode: 'demo', seed: 1});
  const ids = new Set();
  for (let i = 0; i < 600 * 9; i++) { g.step({}); ids.add(g.atk.def.id); g.events.length = 0; }
  assert.ok(ids.size >= 8);
  assert.equal(g.score, 0);
});

test('楽曲データは3/4拍子で、音名とコードが解釈できる', () => {
  for (const [id, t] of Object.entries(TRACKS)) {
    for (const [c, mel] of t.bars) {
      assert.ok(chord(c), `${id}: ${c}`);
      const tokens = mel.split(/\s+/);
      assert.equal(tokens.length, 6, `${id}: ${mel}`);
      for (const tk of tokens) if (tk !== '-' && tk !== '.') assert.ok(midi(tk) !== null, `${id}: ${tk}`);
      assert.notEqual(tokens[0], '-', `${id}: 小節頭はのばさない`);
    }
  }
});
