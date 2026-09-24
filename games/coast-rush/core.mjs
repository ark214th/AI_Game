export const LANE = 2.8;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const halfDepth = type => type === 'tram' ? 3.6 : .48;
const hazard = type => ['tram', 'hurdle', 'arch'].includes(type);

export class Run {
  constructor({seed = Date.now(), tutorial = false} = {}) {
    this.seed = seed >>> 0; this.entities = []; this.events = []; this.id = 0;
    this.distance = 0; this.time = 0; this.speed = 22; this.lane = 0; this.x = 0;
    this.y = 0; this.vy = 0; this.slide = 0; this.jumpBuffer = 0;
    this.hearts = 3; this.invincible = 0; this.flow = 0; this.rush = 0;
    this.magnet = 0; this.coins = 0; this.chain = 0; this.bestChain = 0;
    this.clean = 0; this.rushes = 0; this.score = 0; this.dead = false;
    this.lastCoin = -10; this.lastMove = -10; this.fromLane = 0;
    this.tutorial = tutorial; this.lesson = 0; this.nextRow = 72;
    this.pathLane = 0; this.rows = 0; this.nextPower = 270; this.finishGrace = 0;
    if (tutorial) {
      for (let d = 12; d < 40; d += 3) this.add('coin', 1, d);
      for (let d = 48; d < 76; d += 3) this.add('coin', 0, d);
      this.add('hurdle', 0, 100); this.add('arch', 0, 150);
      for (let d = 94; d < 108; d += 2.5) this.add('coin', 0, d, 1.7);
      for (let d = 144; d < 162; d += 2.5) this.add('coin', 0, d, .5);
      this.nextRow = 210;
    } else { for (let d = 12; d < 53; d += 3) this.add('coin', 0, d); }
    this.generate();
  }
  random() { let x = this.seed || 1; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.seed = x >>> 0; return this.seed / 4294967296; }
  emit(type, data = {}) { this.events.push({type, ...data}); }
  add(type, lane, z, y = .85) { const e = {id: ++this.id, type, lane, z, y, done:false, entered:false}; this.entities.push(e); return e; }
  generate() {
    while (this.nextRow < this.distance + 165) {
      const z = this.nextRow, row = this.rows++, difficulty = Math.min(1, z / 1800);
      const next = clamp(this.pathLane + (this.random() < .5 ? -1 : 1), -1, 1);
      const safe = next === this.pathLane ? 0 : next;
      const pattern = row % 7;
      for (let lane = -1; lane <= 1; lane++) {
        if (lane === safe) continue;
        let type = 'tram';
        if (pattern === 2 || pattern === 5) type = lane === this.pathLane ? 'hurdle' : 'tram';
        if (pattern === 3 || pattern === 6) type = lane === this.pathLane ? 'arch' : 'hurdle';
        if (row < 2 && lane !== this.pathLane) continue;
        this.add(type, lane, z);
        if (type === 'hurdle') for (let i = -2; i <= 2; i++) this.add('coin', lane, z + i * 2.1, 1.7 + .3 * (1 - Math.abs(i) / 2));
        if (type === 'arch') for (let i = -1; i <= 1; i++) this.add('coin', lane, z + i * 2.5, .48);
      }
      for (let i = 0; i < 8; i++) this.add('coin', safe, z - 10 + i * 2.6);
      if (z > this.nextPower) { this.add('magnet', safe, z + 5, 1.1); this.nextPower = z + 320; }
      this.pathLane = safe;
      this.nextRow += 36 - difficulty * 7 + this.random() * 5;
    }
  }
  get hint() {
    if (!this.tutorial) return null;
    return [
      {arrow:'→', text:'右へスワイプ', sub:'コインの道へ、ひとっ飛び', at:8},
      {arrow:'←', text:'左へスワイプ', sub:'小さなスワイプで、すばやく移動', at:38},
      {arrow:'↑', text:'上へスワイプ', sub:'オレンジの柵をジャンプ！', at:78},
      {arrow:'↓', text:'下へスワイプ', sub:'青いゲートをくぐろう', at:128}
    ][this.lesson] || null;
  }
  action(a) {
    if (this.dead) return;
    if (a === 'left' || a === 'right') {
      const next = clamp(this.lane + (a === 'left' ? -1 : 1), -1, 1);
      if (next !== this.lane) { this.fromLane = this.lane; this.lane = next; this.lastMove = this.time; this.emit('move', {direction:a}); }
      if (this.tutorial && this.distance >= 5 && this.lesson === 0 && this.lane === 1) { this.lesson = 1; this.emit('lesson'); }
      else if (this.tutorial && this.distance >= 35 && this.lesson === 1 && this.lane === 0) { this.lesson = 2; this.emit('lesson'); }
    }
    if (a === 'up') {
      if (this.y < .06) this.jump(); else this.jumpBuffer = .15;
    }
    if (a === 'down') { this.slide = .8; this.jumpBuffer = 0; if (this.y > 0) this.vy = -17; this.emit('slide'); }
  }
  jump() { this.vy = 11.5; this.y = .01; this.slide = 0; this.emit('jump'); }
  gainFlow(n) { if (this.rush <= 0) this.flow = Math.min(100, this.flow + n); }
  startRush() { this.flow = 0; this.rush = 7; this.rushes++; this.emit('rush'); }
  update(dt) {
    this.events = [];
    if (this.dead) return;
    dt = Math.min(dt, 1 / 30); this.time += dt;
    for (const k of ['slide','jumpBuffer','invincible','magnet','finishGrace']) this[k] = Math.max(0, this[k] - dt);
    if (this.rush > 0) {
      this.rush = Math.max(0, this.rush - dt);
      if (this.rush === 0) { this.invincible = 2; this.finishGrace = 2; this.emit('rushEnd'); }
    }
    const target = (this.tutorial ? 22 : 24 + Math.min(10, this.distance / 220)) + (this.rush > 0 ? 9 : 0);
    this.speed += (target - this.speed) * Math.min(1, dt * 3);
    let advance = this.speed * dt;
    if (this.tutorial) {
      const gates = [24, 52, 90, 140]; const gate = gates[this.lesson];
      const waiting = this.lesson < 2 || (this.lesson === 2 ? this.y === 0 : this.slide === 0);
      if (waiting && gate !== undefined && this.distance <= gate) advance = Math.min(advance, Math.max(0, gate - this.distance));
    }
    this.distance += advance;
    this.x += (this.lane * LANE - this.x) * (1 - Math.exp(-26 * dt));
    if (this.y > 0 || this.vy > 0) {
      this.vy -= 29 * dt; this.y = Math.max(0, this.y + this.vy * dt);
      if (this.y === 0) { this.vy = 0; this.emit('land'); if (this.jumpBuffer > 0) this.jump(); }
    }
    this.generate();
    for (const e of this.entities) {
      if (e.done) continue;
      const d = e.z - this.distance, dx = Math.abs(e.lane * LANE - this.x);
      if (!hazard(e.type)) {
        const pull = this.rush > 0 || this.magnet > 0;
        if (d < (pull ? 12 : 1.7) && d > -2 && (dx < .95 || (pull && e.type === 'coin')) && (pull || Math.abs(e.y - (this.y + .85)) < 1.35)) {
          e.done = true;
          if (e.type === 'coin') {
            this.coins++; this.chain++; this.bestChain = Math.max(this.bestChain, this.chain); this.lastCoin = this.time;
            this.gainFlow(1.65); this.emit('coin', {e, chain:this.chain});
            if (this.chain % 20 === 0) { this.gainFlow(5); this.emit('chain', {n:this.chain}); }
          } else { this.magnet = 10; this.emit('magnet', {e}); }
        } else if (d < -3) e.done = true;
        continue;
      }
      const depth = halfDepth(e.type) + .42;
      if (Math.abs(d) < depth && dx < 1.18) {
        const safe = (e.type === 'hurdle' && this.y > .88) || (e.type === 'arch' && this.slide > 0 && this.y < .35);
        if (this.rush > 0) { e.done = true; this.gainFlow(3); this.emit('smash', {e}); }
        else if (!safe && this.invincible <= 0) {
          if (this.tutorial) { this.distance = e.z - 10; this.y = 0; this.vy = 0; this.slide = 0; this.emit('retryLesson'); break; }
          e.hit = true; this.hearts--; this.invincible = 1.6; this.chain = 0; this.flow = Math.max(0, this.flow - 25);
          this.emit('hit', {e});
          if (this.hearts === 0) { this.dead = true; this.cause = e.type; this.emit('dead'); break; }
        } else if (safe) e.entered = true;
      }
      if (d < -depth && !e.done) {
        e.done = true;
        const closeDodge = this.time - this.lastMove < .5 && this.fromLane === e.lane;
        if (!e.hit && (e.entered || closeDodge)) {
          this.clean++; this.gainFlow(e.entered ? 9 : 6); this.emit('clean', {kind:e.entered ? e.type : 'dodge'});
        }
        if (this.tutorial && ((e.type === 'hurdle' && this.lesson === 2) || (e.type === 'arch' && this.lesson === 3))) {
          if (e.entered) { this.lesson++; this.emit('lesson'); }
          else { e.done = false; this.distance = e.z - 10; this.lane = 0; this.x = 0; this.y = 0; this.vy = 0; this.slide = 0; this.emit('retryLesson'); break; }
        }
      }
    }
    if (this.tutorial && this.lesson === 4 && this.distance > 169) { this.tutorial = false; this.emit('tutorialDone'); }
    if (!this.tutorial && this.flow >= 100 && !this.rush) this.startRush();
    if (this.time - this.lastCoin > 2.5) this.chain = 0;
    this.entities = this.entities.filter(e => e.z > this.distance - 16);
    this.score = Math.floor(this.distance * 3 + this.coins * 15 + this.clean * 75 + this.rushes * 300);
  }
}
