import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from './core.mjs';

const mk = o => Object.assign(C.newMeta(), o);

// かんたんな 自動プレイ（よく 道が 見える 場所に おいて、安い 強化から 買う）
function playBot(meta, stageId, diffId = 'normal', { endless = false, maxWaves = 60 } = {}) {
  const g = C.createBattle(meta, stageId, diffId, endless);
  const samples = [];
  for (const p of g.paths) for (let d = 0; d <= p.len; d += 12) samples.push(C.pathPos(p, d));
  const bestSpot = type => {
    const range = C.TOWERS[type].lv[0].range;
    let best = null, bs = -1;
    for (let x = 40; x < C.FIELD.w - 30; x += 20) for (let y = 70; y < C.FIELD.h - 30; y += 20) {
      if (!C.canPlace(g, type, x, y)) continue;
      let s = 0; for (const q of samples) if (Math.hypot(q.x - x, q.y - y) < range) s++;
      if (s > bs) { bs = s; best = [x, y]; }
    }
    return best;
  };
  const order = ['archer', 'cannon', 'archer', 'ice', 'mage', 'cannon', 'barracks', 'mage', 'dragon', 'archer', 'mage', 'dragon'].filter(t => g.unlocked[t]);
  let bought = 0, acc = 0;
  const think = () => {
    for (let k = 0; k < 8; k++) {
      const want = Math.min(3 + Math.floor(g.wave * 0.7), 16), next = order[bought % order.length];
      if (g.towers.length < want && g.gold >= C.TOWERS[next].cost) { const s = bestSpot(next); if (s && C.placeTower(g, next, ...s)) { bought++; continue; } }
      const t = g.towers.filter(o => o.lv < 5).sort((a, b) => C.upgradeCost(a) - C.upgradeCost(b))[0];
      if (t && g.gold >= C.upgradeCost(t) && (g.towers.length >= want || C.upgradeCost(t) < C.TOWERS[next].cost * 0.7)) { C.upgradeTower(g, t, t.id % 2 ? 'a' : 'b'); continue; }
      return;
    }
  };
  let guard = 0;
  while (!g.over && guard++ < 400000) {
    if (!g.waveActive) { think(); if (g.wave >= maxWaves) break; C.startWave(g); }
    C.step(g, 1 / 30);
    if ((acc += 1 / 30) > 0.5) {
      acc = 0; think();
      if (g.hero.skillCd <= 0 && g.hero.downT <= 0 && g.enemies.length >= 5) C.useSkill(g, g.enemies[0].x, g.enemies[0].y);
    }
    g.events.length = 0;
  }
  return g;
}

test('道：長さと いちが 正しい', () => {
  const p = C.buildPath([[0, 0], [100, 0], [100, 50]]);
  assert.equal(p.len, 150);
  assert.deepEqual(C.pathPos(p, 125), { x: 100, y: 25 });
  assert.deepEqual(C.pathPos(p, 999), { x: 100, y: 50 });
  const n = C.nearestOnPaths([p], 50, 30);
  assert.equal(n.dist, 30); assert.equal(n.d, 50);
});

test('どの ステージも 道は おしろの 近くで おわり、タワーを おく 場所が ある', () => {
  for (const st of C.STAGES) {
    const g = C.createBattle(C.newMeta(), st.id);
    for (const p of g.paths) {
      const end = C.pathPos(p, p.len);
      assert.ok(Math.hypot(end.x - st.castle[0], end.y - st.castle[1]) < 70, st.id);
    }
    let spots = 0;
    for (let x = 30; x < C.FIELD.w; x += 20) for (let y = 70; y < C.FIELD.h; y += 20) if (C.canPlace(g, 'archer', x, y)) spots++;
    assert.ok(spots > 300, `${st.id} ${spots}`);
  }
});

test('タワーは 道の 上・おしろの そば・ほかの タワーの 上には おけない', () => {
  const g = C.createBattle(C.newMeta(), 'meadow');
  assert.equal(C.placeReason(g, 'archer', 720, 200), 'path');
  assert.equal(C.placeReason(g, 'archer', 100, 440), 'castle');
  assert.equal(C.placeReason(g, 'mage', 600, 220), 'lock');
  assert.ok(C.placeTower(g, 'archer', 600, 220));
  assert.equal(C.placeReason(g, 'archer', 610, 225), 'tower');
  assert.equal(g.gold, C.BASE_GOLD - 60);
  g.gold = 10;
  assert.equal(C.placeTower(g, 'archer', 300, 250), null);
});

test('強化と 進化：レベル3で 2つの 道に 分かれ、レベル5で 止まる。売ると 7わり もどる', () => {
  const g = C.createBattle(C.newMeta(), 'meadow'); g.gold = 5000;
  const t = C.placeTower(g, 'archer', 600, 220);
  assert.ok(C.upgradeTower(g, t)); assert.ok(C.upgradeTower(g, t));
  assert.equal(t.lv, 3);
  assert.equal(C.upgradeTower(g, t), false, '進化は どちらか えらぶ');
  assert.ok(C.upgradeTower(g, t, 'b')); assert.ok(C.upgradeTower(g, t));
  assert.equal(t.lv, 5); assert.equal(C.upgradeCost(t), null);
  assert.equal(C.upgradeTower(g, t), false);
  const before = g.gold; C.sellTower(g, t);
  assert.equal(g.gold - before, Math.floor(t.spent * 0.7));
  assert.equal(g.towers.length, 0);
});

test('どの タワーも レベルが 上がるほど 強くなり、ねだんも 上がる', () => {
  const power = s => s.n ? s.n * s.hp * s.dmg : s.slow ? s.range * s.slow * (1 + (s.stun || 0)) * (s.vuln || 1) : s.dmg / s.rate * (s.splash ? 2 : 1) * (s.chain ? 1 + s.chain * 0.7 : 1) * (s.beam ? 2 : 1) * s.range + (s.burn || 0) * 500;
  for (const id of C.TOWER_IDS) for (const br of ['a', 'b']) {
    let prev = 0, prevCost = 0;
    for (let lv = 1; lv <= 5; lv++) {
      const v = power(C.towerStats(id, lv, br));
      assert.ok(v > prev, `${id} ${br} lv${lv}: ${v} > ${prev}`);
      prev = v;
      if (lv < 5) { const c = C.upgradeCost({ type: id, lv }); assert.ok(c > prevCost); prevCost = c; }
    }
    assert.ok(C.towerStats(id, 1, null, 5).dmg > C.towerStats(id, 1, null, 0).dmg);
  }
});

test('よろいは 弱い こうげきを はじくが、まほうは つきぬける。空の てきに たいほうは 当たらない', () => {
  const g = C.createBattle(C.newMeta(), 'meadow');
  const e = { hp: 100, armor: 7, vulnT: 0, dead: false, gold: 0 };
  assert.equal(C.damage(g, e, 8), 2);
  assert.equal(C.damage(g, e, 8, true), 8);
  // コウモリだけの 波を たいほうだけで むかえる
  g.gold = 9999;
  for (const [x, y] of [[660, 180], [660, 260], [780, 200], [540, 270]]) C.placeTower(g, 'cannon', x, y);
  g.waveActive = true; g.spawns = [{ at: 0, type: 'bat', path: 0, mul: 1, w: 0 }];
  for (let i = 0; i < 30 * 40 && !g.over && g.waveActive; i++) C.step(g, 1 / 30);
  assert.equal(g.lives, g.maxLives - 1);
  assert.equal(g.kills, 0);
});

test('氷の とうは てきを のろくし、スライムは たおすと 2ひきに 分かれる', () => {
  const g = C.createBattle(mk({ towers: { archer: 1, cannon: 1, ice: 1 } }), 'meadow'); g.gold = 9999;
  C.placeTower(g, 'ice', 860, 160);
  g.waveActive = true; g.spawns = [{ at: 0, type: 'slime', path: 0, mul: 1, w: 0 }];
  for (let i = 0; i < 90; i++) C.step(g, 1 / 30);
  const e = g.enemies[0];
  assert.ok(e.slow > 0 && e.d < C.ENEMIES.slime.spd * 3);
  C.damage(g, e, 9999, true); C.step(g, 1 / 30);
  assert.deepEqual(g.enemies.map(o => o.type), ['mini', 'mini']);
});

test('へいしは 地上の てきを 止める。たおれても しばらくすると もどる', () => {
  const g = C.createBattle(mk({ towers: { archer: 1, cannon: 1, barracks: 1 } }), 'meadow'); g.gold = 9999;
  const t = C.placeTower(g, 'barracks', 800, 80);
  assert.equal(g.soldiers.length, 2);
  g.hero.tx = g.hero.x = 900; g.hero.ty = g.hero.y = 500;
  g.waveActive = true; g.spawns = [{ at: 0, type: 'ogre', path: 0, mul: 1, w: 0 }];
  let blocked = false, downs = 0;
  for (let i = 0; i < 30 * 30; i++) { C.step(g, 1 / 30); if (g.enemies[0]?.blockedBy) blocked = true; downs += g.events.filter(e => e.t === 'soldierDown').length; g.events.length = 0; }
  assert.ok(blocked); assert.ok(downs >= 1);
  g.enemies = []; for (let i = 0; i < 30 * 10; i++) C.step(g, 1 / 30);
  assert.ok(g.soldiers.every(o => o.downT <= 0 && o.hp === o.maxHp));
  C.upgradeTower(g, t); C.upgradeTower(g, t);
  assert.equal(g.soldiers.length, 3);
  C.sellTower(g, t); assert.equal(g.soldiers.length, 0);
});

test('ボスは タワーを こおらせる。ヒーローの わざは まちじかんが ある', () => {
  const g = C.createBattle(mk({ heroes: { squire: 1, mage: 1 }, hero: 'mage' }), 'snow'); g.gold = 9999;
  const t = C.placeTower(g, 'archer', 700, 200);
  g.waveActive = true; g.spawns = [{ at: 0, type: 'icegiant', path: 0, mul: 1, w: 0 }];
  let frozen = false;
  for (let i = 0; i < 30 * 30; i++) { C.step(g, 1 / 30); if (t.stunT > 0) frozen = true; }
  assert.ok(frozen);
  const boss = g.enemies[0], hp = boss.hp;
  assert.equal(C.useSkill(g), false, 'ねらう わざは 場所が いる');
  assert.ok(C.useSkill(g, boss.x, boss.y));
  assert.ok(boss.hp < hp - 400);
  assert.equal(C.useSkill(g, boss.x, boss.y), false);
  assert.ok(g.hero.skillCd > 0);
});

test('波は だんだん 強くなり、さいごの 波には ボスが 出る', () => {
  C.STAGES.forEach((st, si) => {
    const cost = w => C.waveSpec(si, w).reduce((s, g) => s + g.count * C.ENEMIES[g.type].cost, 0) * C.hpScale(w);
    // ボスの いない 波だけを くらべる（ボスの 波は とくべつに 強い）
    const plain = [...Array(st.waves).keys()].filter(w => !C.waveSpec(si, w).some(g => C.ENEMIES[g.type].boss));
    for (let i = 1; i < plain.length; i++) assert.ok(cost(plain[i]) > cost(plain[i - 1]), `${st.id} ${plain[i]}`);
    assert.ok(C.waveSpec(si, st.waves - 1).some(g => g.type === st.boss));
    assert.deepEqual(C.waveSpec(si, 3), C.waveSpec(si, 3));
    for (let w = 0; w < st.waves; w++) for (const g of C.waveSpec(si, w)) assert.ok(g.path < st.paths.length && g.count >= 1);
  });
  assert.ok(C.waveSpec(0, 44, true).some(g => C.ENEMIES[g.type].boss));
});

test('おみせ：ほう石で 買え、足りないと 買えない。買ったものは バトルに きく', () => {
  const m = C.newMeta();
  assert.equal(C.buy(m, 'tower_ice'), false);
  m.gems = 1000;
  assert.ok(C.buy(m, 'tower_ice')); assert.equal(m.gems, 850); assert.equal(m.towers.ice, 1);
  assert.ok(C.buy(m, 'pow_archer')); assert.ok(C.buy(m, 'castle_gold')); assert.ok(C.buy(m, 'castle_life')); assert.ok(C.buy(m, 'castle_guard'));
  assert.ok(C.buy(m, 'hero_knight')); assert.equal(m.hero, 'knight');
  const g = C.createBattle(m, 'meadow');
  assert.equal(g.gold, C.BASE_GOLD + 40); assert.equal(g.maxLives, C.BASE_LIVES + 4);
  assert.ok(g.guard); assert.ok(g.unlocked.ice); assert.equal(g.hero.type, 'knight');
  assert.ok(C.towerStats('archer', 1, null, g.pow.archer).dmg > 8);
  for (const id of C.TOWER_IDS) { m.gems = 99999; for (let i = 0; i < 9; i++) C.buy(m, 'pow_' + id) || C.buy(m, 'tower_' + id); }
  assert.ok(C.shopItems(m).filter(i => i.cat === 'tower').every(i => i.cost == null && !i.can));
  const back = C.loadMeta(JSON.stringify(m));
  assert.deepEqual(back, m);
  assert.deepEqual(C.loadMeta('こわれた'), C.newMeta());
});

test('ステージは じゅんばんに 開く。ほう石は 負けても もらえ、はじめての クリアは ボーナスつき', () => {
  const m = C.newMeta();
  assert.ok(C.stageOpen(m, 0)); assert.ok(!C.stageOpen(m, 1)); assert.ok(!C.diffOpen(m, 0, 1)); assert.ok(!C.endlessOpen(m, 0));
  const lose = C.createBattle(m, 'meadow'); lose.cleared = 4; lose.over = 'lose';
  assert.equal(C.applyResult(m, lose).total, 24); assert.equal(m.gems, 24);
  const win = C.createBattle(m, 'meadow'); win.cleared = 10; win.over = 'win';
  const r = C.applyResult(m, win);
  assert.equal(r.base, 100); assert.equal(r.bonus, 50); assert.ok(r.first);
  assert.ok(C.stageOpen(m, 1)); assert.ok(C.diffOpen(m, 0, 1)); assert.ok(C.endlessOpen(m, 0));
  const again = C.createBattle(m, 'meadow'); again.cleared = 10; again.over = 'win';
  assert.equal(C.applyResult(m, again).bonus, 0);
  assert.equal(m.runs, 3);
});

test('バランス：はじめてでも 草原は クリアできる。雪山は 買いものを すると とどく', () => {
  const fresh = playBot(C.newMeta(), 'meadow');
  assert.equal(fresh.over, 'win');
  const snowFresh = playBot(C.newMeta(), 'snow');
  assert.equal(snowFresh.over, 'lose'); assert.ok(snowFresh.cleared >= 3, `雪山 ${snowFresh.cleared}`);
  const some = mk({ pow: { archer: 2, cannon: 2, ice: 1 }, castle: { gold: 2, life: 1 }, towers: { archer: 1, cannon: 1, ice: 1, mage: 1 } });
  assert.equal(playBot(some, 'snow').over, 'win');
});

test('バランス：ぜんぶ 買うと 火山の むずかしいまで 勝てる。はてしないは いつか おわる', () => {
  const max = mk({ pow: Object.fromEntries(C.TOWER_IDS.map(t => [t, 5])), castle: { gold: 5, life: 5, guard: 3 }, towers: Object.fromEntries(C.TOWER_IDS.map(t => [t, 1])), heroes: { squire: 1, knight: 3, mage: 3, rider: 3 }, hero: 'rider' });
  assert.equal(playBot(max, 'volcano', 'hard').over, 'win');
  const e = playBot(C.newMeta(), 'meadow', 'normal', { endless: true, maxWaves: 80 });
  assert.equal(e.over, 'lose'); assert.ok(e.cleared > 10 && e.cleared < 80);
  assert.ok(C.battleGems(e) > 100);
});
