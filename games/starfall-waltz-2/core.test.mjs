import test from 'node:test';
import assert from 'node:assert/strict';
import {Game, W, H, PLAYER_R, GRAZE_R, POC_Y, DEATHBOMB_FRAMES, STOP_FRAMES, FORT_FRAMES, EXTENDS, ATTACKS, BOSSES, STAGES, DIFFICULTIES, CHARACTERS, BULLET_TYPES, COLORS} from './core.mjs';
import {SPELL_IDS} from './content.mjs';

// ボスの攻撃中、弾以外の要素を排除した検証用の状況
function arena(id = 'l_n1', o = {}) {
  const g = new Game({mode: 'practice', attack: id, difficulty: 2, seed: 5, ...o});
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
  const b = g.shot(W / 2 + PLAYER_R + 2.6 + 1.2, 300, 2, Math.PI / 2, 'orb', 'red');
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
  const g = new Game({mode: 'story', difficulty: 2, seed: 2});
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

test('ノヴァのボムは弾を星アイテムに変えて消し、スペルのボーナスを失う', () => {
  const g = arena('l_s1');
  for (let i = 0; i < 40; i++) g.shot(100 + i * 4, 120, 1, Math.PI / 2, 'orb', 'blue');
  g.step({bomb: true});
  assert.equal(g.bullets.length, 0);
  assert.ok(g.items.filter(i => i.type === 'star').length >= 40);
  assert.equal(g.atk.spell.failed, true); assert.equal(g.atk.spell.bonus, 0);
  run(g, 60);
  assert.equal(g.items.filter(i => i.type === 'star').length, 0, '星アイテムは自動で集まる');
});

test('クレメンタインのボムは時を止め、止まった弾は当たらず、最後にすべて星になる', () => {
  const g = arena('l_n1', {character: 1});
  assert.equal(g.char.id, 'clem');
  const b = g.shot(W / 2, 200, 2, Math.PI / 2, 'orb', 'blue'); b.age = 10;
  run(g, 5); g.atk.t = 100;
  const y = b.y, timer = g.atk.timer, hp = g.boss.hp;
  g.step({bomb: true});
  assert.equal(g.stopT, STOP_FRAMES - 1); assert.equal(g.bombs, 2);
  run(g, 60);
  assert.equal(b.y, y, '弾は進まない'); assert.equal(g.atk.timer, timer, '攻撃の残り時間も止まる');
  assert.ok(g.boss.hp < hp, '止まっている間もボスには攻撃が届く');
  g.player.x = g.player.px = b.x; g.player.y = g.player.py = b.y; g.player.invuln = 0;
  run(g, 20);
  assert.equal(g.player.state, 'alive', '止まった弾には当たらない');
  run(g, STOP_FRAMES);
  assert.equal(g.stopT, 0); assert.equal(g.bullets.length, 0);
  assert.ok(types(g).includes('stopEnd'));
});

test('自機ごとにショットが違う（ノヴァは追尾、クレメンタインの長針は雑魚を貫通）', () => {
  const nova = arena('l_n1'), clem = arena('l_n1', {character: 1});
  run(nova, 8); run(clem, 8);
  assert.ok(nova.shots.some(s => s.kind === 'star' && s.homing));
  assert.ok(clem.shots.some(s => s.kind === 'gear'));
  run(clem, 20, {focus: true});
  assert.ok(clem.shots.some(s => s.kind === 'hand' && s.pierce));
  const g = arena('l_n1', {character: 1}); g.shots.length = 0; g.boss.y = -300;
  const e1 = g.enemy({x: 100, y: 200, hp: 5}), e2 = g.enemy({x: 100, y: 150, hp: 5});
  g.shots.push({x: 100, y: 230, vx: 0, vy: -17, dmg: 8, kind: 'hand', homing: false, pierce: true, hits: [], dead: false, age: 0});
  g.player.x = g.player.px = 300;
  run(g, 6);
  assert.ok(e1.dead && e2.dead, '1発で2体を貫く');
});

test('かすりで共鳴ゲージが溜まり、満タンでフォルティッシモになる', () => {
  const g = arena();
  g.reso = .99;
  const near = g.shot(W / 2 + 30, 380, 0, 0, 'orb', 'red'); near.age = 10;
  const b = g.shot(W / 2 + 8, 300, 2, Math.PI / 2, 'orb', 'red'); b.age = 10;
  run(g, 45);
  assert.ok(g.fort, 'フォルティッシモ開始');
  assert.ok(types(g).includes('fortissimo'));
  assert.equal(near.dead, true, '始まりの一拍で近くの弾が消える');
  const pv = g.pointValue; g.fortT = 0; g.reso = 0;
  assert.ok(pv > g.pointValue, 'フォルティッシモ中は得点アイテムの価値が上がる');
});

test('フォルティッシモ中の被弾は共鳴が身代わりになり、ミスにならない', () => {
  const g = arena('l_s1');
  g.reso = 1; g.step({});
  assert.ok(g.fort);
  for (let i = 0; i < 20; i++) g.shot(100 + i * 8, 200, 0, 0, 'orb', 'blue');
  const lives = g.lives, bombs = g.bombs;
  g.playerHit();
  assert.equal(g.player.state, 'alive'); assert.equal(g.fort, false); assert.equal(g.reso, 0);
  assert.equal(g.lives, lives); assert.equal(g.bombs, bombs); assert.equal(g.guards, 1);
  assert.equal(g.bullets.length, 0, '弾は星になる');
  assert.equal(g.atk.spell.failed, true, 'スペルのボーナスは失う');
  assert.ok(g.player.invuln > 100);
  const t = arena(); t.boss.hp = t.boss.maxHp = 1e9; t.reso = 1; t.step({}); run(t, FORT_FRAMES);
  assert.equal(t.fort, false, '時間が来れば終わる');
});

test('被弾もボムもなく倒せばスペル取得、被弾していれば失敗', () => {
  const ok = arena('l_s1');
  run(ok, 50); ok.boss.hp = 1; ok.power = 4;
  run(ok, 30);
  assert.equal(ok.phase, 'practiceDone'); assert.equal(ok.result.captured, true); assert.equal(ok.captures, 1);
  assert.ok(ok.reso >= .25, 'スペル取得で共鳴ゲージが伸びる');
  const bad = arena('l_s1');
  bad.playerHit(); bad.step({bomb: true});
  run(bad, 50); bad.boss.hp = 1; run(bad, 30);
  assert.equal(bad.result.captured, false);
});

test('耐久スペルは時間切れまで耐えれば取得でき、ボスは攻撃を受けない', () => {
  const g = arena('x_s4');
  const hp = g.boss.hp;
  g.atk.timer = 5;
  run(g, 10, {focus: true});
  assert.equal(g.boss.hp, hp);
  assert.equal(g.result.captured, true);
});

test('時間切れの通常スペルはボーナスなし', () => {
  const g = arena('m_s1');
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

test('全ての攻撃が全難易度・両自機で最後まで動き、弾数が上限に届かない', () => {
  for (const id of Object.keys(ATTACKS)) for (const difficulty of [0, 1, 2, 3]) {
    const g = new Game({mode: 'practice', attack: id, difficulty, seed: 11, character: difficulty % 2});
    let max = 0;
    for (let i = 0; i < 90 * 60 && g.phase !== 'practiceDone'; i++) {
      g.player.invuln = 5; g.step({dx: Math.sin(i / 40), bomb: i === 700});
      max = Math.max(max, g.bullets.length);
      for (const b of g.bullets) {
        assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y), `${id} の弾座標`);
        assert.ok(BULLET_TYPES[b.type] && COLORS[b.color], `${id} の弾の種類と色 ${b.type}/${b.color}`);
      }
      g.events.length = 0;
    }
    assert.equal(g.phase, 'practiceDone', `${id}/${difficulty} が終了する`);
    assert.ok(max < 1200, `${id}/${difficulty} の最大弾数 ${max}`);
  }
});

test('同じシードなら同じ弾幕になる', () => {
  const a = new Game({mode: 'practice', attack: 'h_s1', seed: 99}), b = new Game({mode: 'practice', attack: 'h_s1', seed: 99});
  for (const g of [a, b]) for (let i = 0; i < 400; i++) { g.player.invuln = 9; g.step({}); }
  assert.ok(a.bullets.length > 20);
  assert.deepEqual(a.bullets.map(x => [x.x, x.y, x.color]), b.bullets.map(x => [x.x, x.y, x.color]));
});

for (const character of [0, 1]) test(`本編（${CHARACTERS[character].ja}）：道中→中ボス→会話→ボス戦を4ステージ通してエンディングまで進む`, () => {
  const g = new Game({mode: 'story', difficulty: 2, seed: 7, character});
  const seen = new Set(), mids = new Set(), tracks = []; let ended = false, dialogues = 0;
  for (let i = 0; i < 60 * 60 * 22 && !ended; i++) {
    if (g.dialogue) { dialogues++; assert.equal(typeof g.lineText(g.dialogue.lines[g.dialogue.i]), 'string'); g.advanceDialogue(); }
    g.player.invuln = 5; g.lives = 5;
    const bx = g.boss ? g.boss.x : W / 2;
    g.step({focus: true, dx: Math.abs(bx - g.player.x) > 3 ? Math.sign(bx - g.player.x) : 0});
    for (const e of g.events) {
      if (e.type === 'spell') seen.add(e.id); if (e.type === 'ending') ended = true;
      if (e.type === 'midEnter') mids.add(g.stageIndex); if (e.type === 'music') tracks.push(e.track);
    }
    g.events.length = 0;
  }
  assert.ok(ended, 'エンディングに到達');
  assert.equal(seen.size, SPELL_IDS.length, `全${SPELL_IDS.length}枚のスペルアリアに出会う`);
  assert.equal(mids.size, STAGES.length, '各ステージに中ボスが出る');
  assert.ok(dialogues >= BOSSES.reduce((n, b) => n + (b.dialogue?.length || 0), 0));
  assert.ok(g.power > 3, '道中のアイテムでパワーが育つ');
  for (const tr of ['stage1', 'boss1', 'stage2', 'boss2', 'stage3', 'boss3', 'stage4', 'selene', 'boss4', 'finale']) assert.ok(tracks.includes(tr), `${tr} が流れる`);
  assert.ok(tracks.indexOf('selene') < tracks.lastIndexOf('stage4'), '中ボスのあとは道中の曲に戻る');
});

test('デモ画面は自機なしで攻撃を巡回し続ける', () => {
  const g = new Game({mode: 'demo', seed: 1});
  const ids = new Set();
  for (let i = 0; i < 600 * 11; i++) { g.step({}); ids.add(g.atk.def.id); g.events.length = 0; }
  assert.ok(ids.size >= 10);
  assert.equal(g.score, 0); assert.equal(g.reso, 0);
});

test('LARGO（はじめて）は同じ弾幕を遅く・少なくし、ボスも早く倒れる', () => {
  const [largo, andante] = [0, 1].map(difficulty => new Game({mode: 'practice', attack: 'l_n1', difficulty, seed: 4}));
  assert.equal(DIFFICULTIES[0].id, 'largo'); assert.equal(largo.diff, andante.diff, '弾幕の型はANDANTEと同じ');
  const a = largo.ring(100, 100, 20, 2, 0, 'orb', 'red'), b = andante.ring(100, 100, 20, 2, 0, 'orb', 'red');
  assert.ok(a.length < b.length && a.length >= 3);
  assert.ok(a[0].speed < b[0].speed);
  assert.equal(largo.fan(0, 0, 5, 1, 2, 0, 'orb', 'red').length, 3);
  const hp = g => { for (let i = 0; i < 70 && g.phase !== 'attack'; i++) g.step({}); return g.boss.maxHp; };
  assert.ok(hp(largo) < hp(andante));
  const story = new Game({mode: 'story', difficulty: 0, seed: 1});
  assert.equal(story.lives, 4); assert.equal(story.bombs, 4);
});

test('会話中はボムを使わない', () => {
  const g = new Game({mode: 'story', seed: 1});
  g.midDone = true; g.stageT = g.stage.roadLen; g.waveCursor = g.stage.waves.length;
  for (let i = 0; i < 200 && !g.dialogue; i++) g.step({});
  assert.ok(g.dialogue);
  g.step({bomb: true});
  assert.equal(g.bombs, 3);
});

test('中ボスは攻撃のあと去り、道中が再開する。会話を飛ばしても曲は切り替わる', () => {
  const g = new Game({mode: 'story', seed: 1, stage: 3});
  g.stageT = g.stage.mid.at; g.waveCursor = 99; g.events.length = 0;
  for (let i = 0; i < 300 && !g.dialogue; i++) g.step({});
  assert.ok(g.dialogue && g.boss.def.id === 'selene');
  g.skipDialogue();
  assert.equal(g.phase, 'attack'); assert.equal(g.atk.mid, true);
  assert.ok(g.events.some(e => e.type === 'music' && e.track === 'selene'));
  g.player.invuln = 1e9; g.atk.t = 100; g.boss.hp = 0; g.step({});
  assert.equal(g.phase, 'midLeave');
  for (let i = 0; i < 200 && g.boss; i++) g.step({});
  assert.equal(g.boss, null); assert.equal(g.phase, 'road'); assert.equal(g.midDone, true);
  assert.ok(g.items.some(i => i.type === 'bigPower') || g.power > 1);
});

test('最後の攻撃を倒した瞬間にボス撃破になる。終曲は体力で三つの楽章に分かれる', () => {
  const g = new Game({mode: 'practice', attack: 'x_s5', seed: 1});
  for (let i = 0; i < 200; i++) { g.player.invuln = 5; g.step({}); }
  assert.equal(g.atk.ph, 0);
  g.boss.hp = g.boss.maxHp * .5; run(g, 2, () => ({})); g.player.invuln = 999;
  assert.equal(g.atk.ph, 1); assert.ok(g.events.some(e => e.type === 'movement' && e.n === 1));
  g.boss.hp = g.boss.maxHp * .2; run(g, 2);
  assert.equal(g.atk.ph, 2);
});
