// 弾幕のシミュレーション。1ステップ＝1フレーム（60fps固定）。DOMに依存しない。
import {
  W, H, TAU, PLAYER_R, GRAZE_R, POC_Y, DEATHBOMB_FRAMES, SPEED_FAST, SPEED_SLOW,
  BOMB_FRAMES, BOMB_INVULN, RESPAWN_INVULN, EXTENDS, MAX_LIVES, MAX_POWER, DIFFICULTIES, DEFAULT_LEVEL, BULLET_TYPES, clamp,
} from './consts.mjs';
import {STAGES, BOSSES, ATTACKS, DEMO_ATTACKS, WAVES} from './content.mjs';

export * from './consts.mjs';
export {STAGES, BOSSES, ATTACKS};

const MAX_BULLETS = 2600, MAX_STAR_ITEMS = 700;

// オプション（自機の周りの小さな天球儀）の配置。fk=0 低速解除, 1 低速
const SPREAD = [[], [[0, -26]], [[-22, -6], [22, -6]], [[-26, -2], [0, -28], [26, -2]], [[-32, 4], [-15, -22], [15, -22], [32, 4]]];
const FOCUS = [[], [[0, -22]], [[-10, -18], [10, -18]], [[-15, -13], [0, -25], [15, -13]], [[-19, -9], [-7, -23], [7, -23], [19, -9]]];
export function optionOffsets(power, fk) {
  const n = clamp(Math.floor(power), 1, 4), a = SPREAD[n], b = FOCUS[n];
  return a.map((o, i) => [o[0] + (b[i][0] - o[0]) * fk, o[1] + (b[i][1] - o[1]) * fk]);
}

export class Game {
  // difficulty は DIFFICULTIES の番号（0: LARGO … 3: PRESTO）。diff は弾幕パターンの段階（0〜2）
  constructor({mode = 'story', difficulty = DEFAULT_LEVEL, seed = 0x5eed, stage = 0, attack = null} = {}) {
    this.mode = mode; this.level = clamp(difficulty | 0, 0, DIFFICULTIES.length - 1); this.seed = (seed >>> 0) || 1;
    const d = this.rules = DIFFICULTIES[this.level];
    this.diff = d.tier; this.speedMul = d.bulletSpeed || 1; this.density = d.density || 1;
    this.bombStock = d.bombs || 3; this.deathbombFrames = d.deathbomb || DEATHBOMB_FRAMES;
    this.frame = 0; this.events = []; this.sfxSeen = new Set();
    this.bullets = []; this.lasers = []; this.shots = []; this.enemies = []; this.items = []; this.timers = [];
    this.boss = null; this.atk = null; this.dialogue = null; this.stage = null;
    this.stageIndex = stage; this.stageT = 0; this.phase = 'init'; this.phaseT = 0;
    this.score = 0; this.graze = 0; this.pointItems = 0; this.extendIndex = 0;
    this.continues = 0; this.captures = 0; this.misses = 0; this.bombsUsed = 0; this.deathbombs = 0;
    this.lives = mode === 'practice' ? 0 : d.lives;
    this.bombs = this.bombStock; this.power = mode === 'story' ? 1 : MAX_POWER;
    this.bombT = 0; this.bombX = 0; this.bombY = 0;
    this.gameOver = false; this.result = null; this.demoIndex = 0;
    this.player = {x: W / 2, y: H - 52, px: W / 2, py: H - 52, state: mode === 'demo' ? 'ghost' : 'alive',
      hitT: 0, invuln: 90, respawnT: 0, shotCd: 0, focus: false, fk: 0, target: null};
    if (mode === 'story') this.beginStage(stage);
    else if (mode === 'practice') this.beginPractice(attack);
    else if (mode === 'demo') this.beginDemo();
  }

  // ---- 乱数・補助 ----
  rand() { let x = this.seed; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.seed = x >>> 0; return this.seed / 4294967296; }
  rr(a, b) { return a + (b - a) * this.rand(); }
  dv(a, b, c) { return this.diff === 0 ? a : this.diff === 1 ? b : c; }
  // LARGO では弾の数を減らす（形は保つ）
  thin(n) { return this.density < 1 ? Math.max(3, Math.round(n * this.density)) : n; }
  emit(type, data = {}) { this.events.push({type, ...data}); }
  sfx(name) { if (!this.sfxSeen.has(name)) { this.sfxSeen.add(name); this.events.push({type: 'sfx', name}); } }
  aim(x, y) { const p = this.player; return Math.atan2(p.y - y, p.x - x); }
  after(frames, fn) { this.timers.push({t: frames, fn}); }
  get pointValue() { return 10000 + Math.floor(this.graze / 2) * 20; }
  get attackable() {
    const b = this.boss, a = this.atk;
    return !!(b && a && this.phase === 'attack' && !a.def.survival && a.t > 40 && this.mode !== 'demo');
  }

  // ---- 弾の生成 ----
  shot(x, y, speed, angle, type = 'orb', color = 'white', o = {}) {
    if (this.bullets.length >= MAX_BULLETS) return null;
    const t = BULLET_TYPES[type], scale = o.scale || 1, k = this.speedMul;
    const b = {x, y, px: x, py: y, speed: speed * k, angle, dir: angle, accel: (o.accel || 0) * k, curve: (o.curve || 0) * k,
      min: o.min === undefined ? -99 : o.min * k, max: o.max === undefined ? 99 : o.max * k, type, color, r: t.r * scale, scale, age: 0, grazed: false,
      fn: o.fn || null, d: o.d ? {...o.d} : null, keep: o.keep || 0, vx: 0, vy: 0, cart: false, manual: false,
      rot: this.rand() * TAU, dead: false};
    this.bullets.push(b); return b;
  }
  ring(x, y, n, speed, a0, type, color, o) {
    const out = []; n = this.thin(n);
    for (let i = 0; i < n; i++) out.push(this.shot(x, y, speed, a0 + i * TAU / n, type, color, o));
    return out;
  }
  fan(x, y, n, spread, speed, angle, type, color, o) {
    if (this.density < 1 && n > 1) n = Math.max(1, Math.round(n * this.density));
    if (n <= 1) return [this.shot(x, y, speed, angle, type, color, o)];
    const out = [];
    for (let i = 0; i < n; i++) out.push(this.shot(x, y, speed, angle + (i / (n - 1) - .5) * spread, type, color, o));
    return out;
  }
  laser(x, y, angle, o = {}) {
    const l = {x, y, angle, len: o.len || 560, w: o.w || 14, warn: o.warn ?? 50, life: o.life ?? 120,
      curve: o.curve || 0, activeCurve: o.activeCurve ?? o.curve ?? 0, color: o.color || 'white', age: 0, grazeCd: 0, fade: 0, dead: false};
    this.lasers.push(l); this.sfx('laserWarn'); return l;
  }
  enemy(o) {
    const e = {x: o.x, y: o.y, vx: o.vx || 0, vy: o.vy || 0, hp: o.hp || 14, maxHp: o.hp || 14, r: o.r || 10,
      kind: o.kind || 'wisp', color: o.color || 'cyan', age: 0, fn: o.fn || null, drops: o.drops || [],
      score: o.score || 300, dead: false, flash: 0};
    this.enemies.push(e); return e;
  }
  item(type, x, y) {
    if (type === 'star' && this.items.length > MAX_STAR_ITEMS) { this.score += this.starValue; return; }
    this.items.push({type, x, y, vx: type === 'star' ? 0 : this.rr(-1.2, 1.2), vy: type === 'star' ? -1 : -2.4 - this.rand() * 1.4,
      age: 0, homing: false, full: false});
  }
  get starValue() { return 300 + this.stageIndex * 200; }

  // ---- ボス ----
  moveBoss(x, y, frames = 60) {
    const b = this.boss; if (!b) return;
    b.sx = b.x; b.sy = b.y; b.tx = clamp(x, 40, W - 40); b.ty = clamp(y, 40, H * .45); b.mt = 0; b.md = Math.max(1, frames);
  }
  wander(frames = 60, range = 70) {
    const b = this.boss; if (!b) return;
    const toward = clamp((this.player.x - b.x) * .35, -range, range);
    this.moveBoss(clamp(b.x + toward + this.rr(-range, range) * .6, 72, W - 72), this.rr(78, 128), frames);
  }
  makeBoss(index, x = W / 2, y = -40) {
    const def = BOSSES[index];
    this.boss = {def, index, x, y, sx: x, sy: y, tx: x, ty: y, mt: 0, md: 0, hp: 1, maxHp: 1, idx: -1, familiars: [], flash: 0, t: 0};
    return this.boss;
  }

  // ---- 進行 ----
  beginStage(i) {
    this.stageIndex = i; this.stage = STAGES[i]; this.stageT = 0; this.phase = 'road'; this.phaseT = 0;
    this.boss = null; this.atk = null; this.timers = []; this.waveCursor = 0;
    this.emit('stage', {index: i}); this.emit('music', {track: this.stage.music});
  }
  beginBoss() {
    const b = this.makeBoss(this.stage.boss);
    this.moveBoss(W / 2, 104, 80); this.phase = 'bossIntro'; this.phaseT = 0; this.timers = [];
    this.emit('bossEnter', {boss: b.index});
  }
  beginPractice(id) {
    const def = ATTACKS[id]; if (!def) throw new Error('unknown attack ' + id);
    this.practiceId = id; this.stageIndex = BOSSES[def.boss].stage; this.stage = STAGES[this.stageIndex];
    this.makeBoss(def.boss, W / 2, 30); this.moveBoss(W / 2, 104, 40);
    this.phase = 'bossIntro'; this.phaseT = 20;
    this.emit('stage', {index: this.stageIndex, practice: true}); this.emit('music', {track: BOSSES[def.boss].music});
  }
  beginDemo() {
    const def = ATTACKS[DEMO_ATTACKS[0]];
    this.stageIndex = BOSSES[def.boss].stage; this.stage = STAGES[this.stageIndex];
    this.makeBoss(def.boss, W / 2, 104); this.startAttack(def);
  }
  startDialogue() {
    this.dialogue = {lines: this.boss.def.dialogue, i: 0}; this.phase = 'dialogue';
    this.checkDialogueMusic();
  }
  checkDialogueMusic() {
    const line = this.dialogue.lines[this.dialogue.i];
    if (line && line.music) this.emit('music', {track: this.boss.def.music});
  }
  advanceDialogue() {
    if (!this.dialogue) return;
    this.dialogue.i++;
    if (this.dialogue.i >= this.dialogue.lines.length) { this.dialogue = null; this.nextAttack(); }
    else this.checkDialogueMusic();
  }
  skipDialogue() {
    if (!this.dialogue) return;
    if (!this.dialogue.lines.slice(0, this.dialogue.i + 1).some(l => l.music)) this.emit('music', {track: this.boss.def.music});
    this.dialogue = null; this.nextAttack();
  }
  nextAttack() {
    const b = this.boss; b.idx++;
    if (b.idx >= b.def.attacks.length) return this.bossDefeated();
    this.startAttack(ATTACKS[b.def.attacks[b.idx]]);
  }
  startAttack(def) {
    const b = this.boss, total = def.time * 60;
    const base = (1 + this.stageIndex) * 1000000 + this.diff * 500000 + (def.last ? 2000000 : 0);
    this.atk = {def, t: 0, timer: total, total, spell: def.spell ? {base, bonus: base, failed: false} : null};
    b.hp = b.maxHp = Math.round(def.hp * (this.rules.bossHp || 1)); b.familiars = []; this.phase = 'attack'; this.phaseT = 0; this.timers = [];
    if (def.spell) this.emit('spell', {id: def.id, boss: b.index});
    else this.emit('nonspell', {id: def.id});
    def.init?.(this, b);
  }
  endAttack(defeated) {
    const a = this.atk, def = a.def, b = this.boss, spell = a.spell;
    this.cancelAll(true); this.clearLasers(); this.timers = [];
    const cleared = defeated || !!def.survival;
    if (cleared && this.mode !== 'demo') {
      const pts = def.spell ? 8 : 5, pw = def.spell ? 4 : 3;
      for (let i = 0; i < pts; i++) this.item('point', b.x + this.rr(-30, 30), b.y + this.rr(-20, 20));
      for (let i = 0; i < pw; i++) this.item('power', b.x + this.rr(-30, 30), b.y + this.rr(-20, 20));
      if (def.spell && this.boss.idx === this.boss.def.attacks.length - 2 && this.mode === 'story') this.item('bigPower', b.x, b.y);
    }
    let captured = false;
    if (spell) {
      captured = !spell.failed && cleared;
      if (captured) { this.score += spell.bonus; this.captures++; this.emit('capture', {id: def.id, bonus: spell.bonus}); }
      else this.emit('spellFail', {id: def.id, timeout: !cleared});
    }
    this.emit('attackEnd', {id: def.id, defeated, x: b.x, y: b.y, spell: !!spell});
    this.atk = null; b.familiars = [];
    if (this.mode === 'practice') {
      this.phase = 'practiceDone'; this.result = {captured, defeated: cleared};
      this.emit('practiceDone', {captured, id: def.id});
      return;
    }
    this.phase = 'between'; this.phaseT = 0; this.moveBoss(W / 2, 104, 50);
  }
  bossDefeated() {
    const b = this.boss;
    this.emit('bossDown', {x: b.x, y: b.y, boss: b.index});
    for (let i = 0; i < 16; i++) this.item('point', b.x + this.rr(-50, 50), b.y + this.rr(-30, 30));
    const bonus = (this.stageIndex + 1) * 2000000 + Math.round(this.power * 100) * 1000 + this.graze * 500;
    this.score += bonus; this.boss = null; this.phase = 'clear'; this.phaseT = 0;
    this.emit('stageClear', {bonus, index: this.stageIndex});
  }
  continueGame() {
    if (!this.gameOver) return;
    this.continues++; this.score = this.continues; this.gameOver = false;
    this.lives = this.rules.lives; this.bombs = this.bombStock; this.respawn();
  }

  // ---- 1フレーム ----
  step(input = {}) {
    if (this.gameOver || this.phase === 'ending' || this.phase === 'practiceDone') return;
    this.frame++; this.sfxSeen.clear();
    this.updatePlayer(input);
    this.updateFlow();
    for (let i = 0; i < this.timers.length; i++) { const t = this.timers[i]; if (--t.t <= 0) { t.fn(); t.done = true; } }
    if (this.timers.length) this.timers = this.timers.filter(t => !t.done);
    this.updateBoss(); this.updateEnemies(); this.updateShots(); this.updateBullets(); this.updateLasers();
    this.updateBomb(); this.updateItems(); this.collide();
  }

  updateFlow() {
    this.phaseT++;
    switch (this.phase) {
      case 'road': {
        this.stageT++;
        const waves = this.stage.waves;
        while (this.waveCursor < waves.length && waves[this.waveCursor][0] <= this.stageT) {
          const [, name, params] = waves[this.waveCursor++]; WAVES[name](this, params || {});
        }
        if (this.stageT >= this.stage.roadLen && (this.enemies.length === 0 || this.stageT > this.stage.roadLen + 240)) this.beginBoss();
        break;
      }
      case 'bossIntro':
        if (this.phaseT >= 80) {
          if (this.mode === 'story' && this.boss.def.dialogue) this.startDialogue();
          else if (this.mode === 'practice') this.startAttack(ATTACKS[this.practiceId]);
          else this.nextAttack();
        }
        break;
      case 'attack': {
        const a = this.atk, b = this.boss;
        a.t++; a.timer--;
        if (a.spell && !a.spell.failed) a.spell.bonus = Math.floor(a.spell.base * (.3 + .7 * Math.min(1, (a.timer + 300) / a.total)) / 10) * 10;
        a.def.update(this, b, a.t);
        if (this.mode === 'demo') {
          if (a.t >= 600) {
            this.cancelAll(false); this.clearLasers(); this.timers = [];
            this.demoIndex = (this.demoIndex + 1) % DEMO_ATTACKS.length;
            const def = ATTACKS[DEMO_ATTACKS[this.demoIndex]];
            if (def.boss !== b.index) { this.makeBoss(def.boss, W / 2, 104); this.stageIndex = BOSSES[def.boss].stage; this.stage = STAGES[this.stageIndex]; }
            this.startAttack(def);
          }
          break;
        }
        if (a.timer > 0 && a.timer <= 600 && a.timer % 60 === 0) this.emit('countdown', {s: a.timer / 60});
        if (!a.def.survival && b.hp <= 0) this.endAttack(true);
        else if (a.timer <= 0) this.endAttack(false);
        break;
      }
      case 'between':
        if (this.phaseT >= 70) this.nextAttack();
        break;
      case 'clear':
        if (this.phaseT >= 260) {
          if (this.stageIndex >= STAGES.length - 1) { this.phase = 'ending'; this.emit('ending', {}); }
          else this.beginStage(this.stageIndex + 1);
        }
        break;
    }
  }

  // ---- 自機 ----
  updatePlayer(input) {
    const p = this.player; p.px = p.x; p.py = p.y;
    if (p.state === 'ghost') return;
    p.focus = !!input.focus; p.fk += ((p.focus ? 1 : 0) - p.fk) * .25;
    if (p.invuln > 0) p.invuln--;
    if (p.state === 'dead') { if (--p.respawnT <= 0) this.respawn(); return; }
    if (p.state === 'hit') {
      // 喰らいボム：被弾から deathbombFrames フレーム以内のボム入力で被弾を取り消す
      if (input.bomb && this.bombs > 0) { p.state = 'alive'; this.deathbombs++; this.bomb(true); this.emit('deathbomb', {x: p.x, y: p.y}); }
      else if (--p.hitT <= 0) this.die();
      return;
    }
    let dx = input.dx || 0, dy = input.dy || 0;
    if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
    const sp = p.focus ? SPEED_SLOW : SPEED_FAST;
    p.x += dx * sp + clamp(input.mx || 0, -14, 14);
    p.y += dy * sp + clamp(input.my || 0, -14, 14);
    p.x = clamp(p.x, 8, W - 8); p.y = clamp(p.y, 16, H - 14);
    if (input.bomb && this.bombs > 0 && this.bombT <= 0 && this.phase !== 'dialogue') this.bomb(false);
    if (this.phase !== 'dialogue' && this.phase !== 'bossIntro') this.fire();
  }
  fire() {
    const p = this.player;
    if (--p.shotCd > 0) return;
    p.shotCd = 4;
    for (const s of [-5, 5]) this.shots.push({x: p.x + s, y: p.y - 10, vx: 0, vy: -15, dmg: 6, kind: 'main', homing: false, dead: false, age: 0});
    const focused = p.fk > .5;
    for (const [ox, oy] of optionOffsets(this.power, p.fk)) {
      if (focused) this.shots.push({x: p.x + ox, y: p.y + oy, vx: 0, vy: -14, dmg: 6.5, kind: 'needle', homing: false, dead: false, age: 0});
      else {
        const a = -Math.PI / 2 + ox * .014;
        this.shots.push({x: p.x + ox, y: p.y + oy, vx: Math.cos(a) * 10, vy: Math.sin(a) * 10, dmg: 3.6, kind: 'star', homing: true, dead: false, age: 0});
      }
    }
    if (this.frame % 8 < 4) this.sfx('shot');
  }
  bomb(death) {
    const p = this.player;
    this.bombs--; this.bombsUsed++; this.bombT = BOMB_FRAMES; this.bombX = p.x; this.bombY = p.y;
    p.invuln = Math.max(p.invuln, BOMB_INVULN); this.failSpell();
    this.cancelAll(true); this.clearLasers();
    this.emit('bomb', {x: p.x, y: p.y, death});
  }
  playerHit() {
    const p = this.player;
    p.state = 'hit'; p.hitT = this.deathbombFrames; this.failSpell();
    this.emit('hit', {x: p.x, y: p.y});
  }
  die() {
    const p = this.player;
    p.state = 'dead'; p.respawnT = 50; this.misses++; this.lives--;
    this.emit('death', {x: p.x, y: p.y});
    this.cancelAll(false); this.clearLasers();
    if (this.mode === 'story') {
      const lost = Math.min(this.power - 1, .6);
      this.power = Math.max(1, this.power - .6);
      for (let i = 0; i < Math.round(lost / .05 * .6); i++) this.item('power', p.x + this.rr(-40, 40), Math.min(p.y, H - 80) + this.rr(-20, 10));
    }
    this.bombs = this.bombStock;
    if (this.lives < 0) {
      this.lives = 0;
      if (this.mode === 'practice') { this.phase = 'practiceDone'; this.result = {captured: false, died: true}; this.emit('practiceDone', {captured: false, died: true, id: this.practiceId}); }
      else { this.gameOver = true; this.emit('gameover', {}); }
    }
  }
  respawn() {
    const p = this.player;
    p.state = 'alive'; p.x = p.px = W / 2; p.y = p.py = H - 52; p.invuln = RESPAWN_INVULN; p.hitT = 0;
    this.emit('respawn', {});
  }
  failSpell() {
    const s = this.atk?.spell;
    if (s && !s.failed) { s.failed = true; s.bonus = 0; this.emit('bonusFailed', {}); }
  }

  // ---- 各オブジェクト ----
  updateBoss() {
    const b = this.boss; if (!b) return;
    b.t++; if (b.flash > 0) b.flash--;
    if (b.mt < b.md) {
      b.mt++; const k = b.mt / b.md, e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      b.x = b.sx + (b.tx - b.sx) * e; b.y = b.sy + (b.ty - b.sy) * e;
    }
  }
  updateEnemies() {
    for (const e of this.enemies) {
      e.age++; if (e.flash > 0) e.flash--;
      e.fn?.(e, this);
      e.x += e.vx; e.y += e.vy;
      if (e.age > 40 && (e.x < -60 || e.x > W + 60 || e.y < -70 || e.y > H + 60)) e.dead = true;
    }
    if (this.enemies.some(e => e.dead)) this.enemies = this.enemies.filter(e => !e.dead);
  }
  killEnemy(e) {
    e.dead = true; this.score += e.score;
    for (const d of e.drops) this.item(d, e.x + this.rr(-12, 12), e.y + this.rr(-10, 10));
    this.emit('enemyDown', {x: e.x, y: e.y, kind: e.kind, color: e.color});
  }
  nearestTarget(x, y) {
    let best = null, bd = 1e9;
    for (const e of this.enemies) { if (e.y < 0) continue; const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; best = e; } }
    if (this.boss && this.phase === 'attack') { const b = this.boss, d = (b.x - x) ** 2 + (b.y - y) ** 2; if (d < bd) best = b; }
    return best;
  }
  updateShots() {
    const b = this.boss, bossHittable = b && this.phase === 'attack' && this.mode !== 'demo', canHurt = this.attackable;
    let target = null;
    if (this.shots.some(s => s.homing)) target = this.nearestTarget(this.player.x, this.player.y);
    for (const s of this.shots) {
      s.age++;
      if (s.homing && target && s.age > 2) {
        const want = Math.atan2(target.y - s.y, target.x - s.x), cur = Math.atan2(s.vy, s.vx);
        let d = want - cur; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
        const a = cur + clamp(d, -.14, .14), sp = 10.5;
        s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp;
      }
      s.x += s.vx; s.y += s.vy;
      if (s.y < -20 || s.x < -20 || s.x > W + 20 || s.y > H + 20) { s.dead = true; continue; }
      if (bossHittable && Math.abs(s.x - b.x) < 30 && Math.abs(s.y - b.y) < 30) {
        s.dead = true;
        if (canHurt) {
          b.hp -= s.dmg; b.flash = 2; this.score += 10;
          this.sfx(b.hp < b.maxHp * .2 ? 'hitLow' : 'hitBoss');
        }
        this.emit('shotHit', {x: s.x, y: s.y + 6, kind: s.kind});
        continue;
      }
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (Math.abs(s.x - e.x) < e.r + 5 && Math.abs(s.y - e.y) < e.r + 8) {
          s.dead = true; e.hp -= s.dmg; e.flash = 2; this.score += 10; this.sfx('hitEnemy');
          if (e.hp <= 0) this.killEnemy(e);
          this.emit('shotHit', {x: s.x, y: s.y, kind: s.kind});
          break;
        }
      }
    }
    this.shots = this.shots.filter(s => !s.dead);
  }
  updateBullets() {
    const list = this.bullets;
    for (let i = 0; i < list.length; i++) {
      const b = list[i]; if (b.dead) continue;
      b.px = b.x; b.py = b.y; b.age++;
      if (b.fn) { b.fn(b, this); if (b.dead) continue; }
      if (b.manual) { const dx = b.x - b.px, dy = b.y - b.py; if (dx || dy) b.dir = Math.atan2(dy, dx); }
      else if (b.cart) { b.x += b.vx; b.y += b.vy; b.dir = Math.atan2(b.vy, b.vx); }
      else {
        if (b.accel) b.speed = clamp(b.speed + b.accel, b.min, b.max);
        b.angle += b.curve; b.dir = b.angle;
        b.x += Math.cos(b.angle) * b.speed; b.y += Math.sin(b.angle) * b.speed;
      }
      const m = 24 + b.r * 2;
      if (b.age > b.keep && (b.x < -m || b.x > W + m || b.y < -m || b.y > H + m)) b.dead = true;
    }
    let j = 0;
    for (let i = 0; i < list.length; i++) if (!list[i].dead) list[j++] = list[i];
    list.length = j;
  }
  updateLasers() {
    for (const l of this.lasers) {
      l.age++; if (l.grazeCd > 0) l.grazeCd--;
      l.angle += l.age < l.warn ? l.curve : l.activeCurve;
      if (l.fade > 0 && ++l.fade > 20) l.dead = true;
      if (!l.fade && l.age >= l.warn + l.life) l.fade = 1;
    }
    if (this.lasers.some(l => l.dead)) this.lasers = this.lasers.filter(l => !l.dead);
  }
  updateBomb() {
    if (this.bombT <= 0) return;
    this.bombT--;
    const age = BOMB_FRAMES - this.bombT, r = Math.min(520, age * 7), r2 = r * r;
    this.bombX += (this.player.x - this.bombX) * .08; this.bombY += (this.player.y - this.bombY) * .08;
    for (const b of this.bullets) {
      if ((b.x - this.bombX) ** 2 + (b.y - this.bombY) ** 2 < r2) { b.dead = true; this.emit('cancel', {x: b.x, y: b.y, color: b.color, bt: b.type}); this.item('star', b.x, b.y); }
    }
    for (const l of this.lasers) if (!l.fade) l.fade = 1;
    for (const e of this.enemies) {
      if (!e.dead && (e.x - this.bombX) ** 2 + (e.y - this.bombY) ** 2 < r2 && e.y > -10) { e.hp -= 9; e.flash = 2; if (e.hp <= 0) this.killEnemy(e); }
    }
    if (this.attackable && this.bombT < BOMB_FRAMES - 20) { this.boss.hp -= 5; this.boss.flash = 2; }
  }
  updateItems() {
    const p = this.player, alive = p.state === 'alive';
    const autoAll = alive && (p.y < POC_Y || this.bombT > 0 || this.phase === 'clear');
    const reach = p.fk > .5 ? 38 : 26;
    for (const it of this.items) {
      it.age++;
      if (alive && !it.homing && (autoAll || (it.type === 'star' && it.age > 24))) { it.homing = true; it.full = autoAll || it.type === 'star'; }
      if (it.homing && alive) {
        const dx = p.x - it.x, dy = p.y - it.y, d = Math.hypot(dx, dy) || 1, sp = Math.min(12, 6 + it.age * .05);
        it.x += dx / d * Math.min(sp, d); it.y += dy / d * Math.min(sp, d);
      } else {
        it.homing = false; it.vy = Math.min(it.vy + .065, 1.8); it.vx *= .95; it.x += it.vx; it.y += it.vy;
      }
      if (alive && Math.abs(it.x - p.x) < reach && Math.abs(it.y - p.y) < reach) { this.collect(it); it.dead = true; }
      else if (it.y > H + 16) it.dead = true;
    }
    this.items = this.items.filter(i => !i.dead);
  }
  collect(it) {
    switch (it.type) {
      case 'power': case 'bigPower': {
        if (this.power >= MAX_POWER) { this.score += 5000; break; }
        const before = this.power;
        this.power = Math.min(MAX_POWER, Math.round((this.power + (it.type === 'bigPower' ? 1 : .05)) * 100) / 100);
        if (Math.floor(this.power) > Math.floor(before)) this.emit('powerUp', {level: Math.floor(this.power)});
        if (this.power >= MAX_POWER) this.emit('fullPower', {});
        this.sfx('item'); break;
      }
      case 'point': {
        const v = it.full ? this.pointValue : Math.floor(this.pointValue * Math.max(.3, 1 - (it.y - POC_Y) / (H - POC_Y) * .7) / 10) * 10;
        this.score += v; this.pointItems++; this.emit('pointGet', {x: it.x, y: it.y, value: v, full: v === this.pointValue});
        if (this.extendIndex < EXTENDS.length && this.pointItems >= EXTENDS[this.extendIndex]) { this.extendIndex++; this.extend(); }
        this.sfx('item'); break;
      }
      case 'star': this.score += this.starValue; this.sfx('star'); break;
      case 'life': this.extend(); break;
      case 'bomb': this.bombs = Math.min(8, this.bombs + 1); this.emit('bombGet', {}); break;
    }
  }
  extend() {
    if (this.lives < MAX_LIVES) { this.lives++; this.emit('extend', {}); }
    else { this.bombs = Math.min(8, this.bombs + 1); this.emit('bombGet', {}); }
  }
  cancelAll(toItems) {
    for (const b of this.bullets) {
      if (b.dead) continue;
      b.dead = true; this.emit('cancel', {x: b.x, y: b.y, color: b.color, bt: b.type});
      if (toItems && this.mode !== 'demo') this.item('star', b.x, b.y);
    }
    this.bullets.length = 0;
  }
  clearLasers() { for (const l of this.lasers) if (!l.fade) l.fade = 1; }

  // ---- 当たり判定 ----
  collide() {
    const p = this.player;
    if (p.state !== 'alive') return;
    const vulnerable = p.invuln <= 0 && this.bombT <= 0;
    // 自機と弾の相対移動を線分として扱い、高速弾のすり抜けを防ぐ
    for (const b of this.bullets) {
      if (b.age < 4) continue;
      const ex = b.x - p.x, ey = b.y - p.y;
      if (ex > 40 || ex < -40 || ey > 40 || ey < -40) continue;
      const sx = b.px - p.px, sy = b.py - p.py, dx = ex - sx, dy = ey - sy, len = dx * dx + dy * dy;
      const t = len > 0 ? clamp(-(sx * dx + sy * dy) / len, 0, 1) : 0;
      const cx = sx + dx * t, cy = sy + dy * t, d2 = cx * cx + cy * cy;
      if (!b.grazed && p.invuln <= 0 && d2 < (GRAZE_R + b.r) ** 2) { b.grazed = true; this.addGraze(b.x, b.y); }
      if (vulnerable && d2 < (b.r + PLAYER_R) ** 2) { this.playerHit(); return; }
    }
    for (const l of this.lasers) {
      if (l.fade || l.age < l.warn) continue;
      const c = Math.cos(l.angle), s = Math.sin(l.angle), rx = p.x - l.x, ry = p.y - l.y;
      const along = rx * c + ry * s, across = Math.abs(-rx * s + ry * c);
      if (along < 0 || along > l.len) continue;
      const grow = Math.min(1, (l.age - l.warn) / 8);
      if (vulnerable && grow >= 1 && across < l.w * .32 + PLAYER_R) { this.playerHit(); return; }
      if (l.grazeCd <= 0 && p.invuln <= 0 && across < l.w * .5 + GRAZE_R) { l.grazeCd = 6; this.addGraze(p.x - s * l.w * .5, p.y + c * l.w * .5); }
    }
    if (!vulnerable) return;
    for (const e of this.enemies) if (Math.hypot(e.x - p.x, e.y - p.y) < e.r * .45 + PLAYER_R) { this.playerHit(); return; }
    const b = this.boss;
    if (b && this.phase !== 'dialogue' && Math.hypot(b.x - p.x, b.y - p.y) < 12) this.playerHit();
  }
  addGraze(x, y) { this.graze++; this.score += 500; this.emit('graze', {x, y}); this.sfx('graze'); }
}
