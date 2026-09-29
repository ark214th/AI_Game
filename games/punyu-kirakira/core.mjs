// ぷにゅの きらきらランド — ゲームの動き（2Dで計算。描画は view.mjs が3Dで行う）
// 座標は1マス=1。x は右が正、y は上が正。プレイヤーの y は足もとの高さ。

export const TUNE = {
  radius: 0.45,
  walk: 4.6, run: 6.6, runDelay: 0.8,
  accel: 22, airAccel: 15, decel: 30, airDecel: 5,
  jumpV: 12.4, gHold: 27, gRise: 56, gFall: 40, maxFall: 16,
  coyote: 0.13, buffer: 0.17,
  stepUp: 0.35, snap: 0.45,
  slopeAcc: 9, maxSpeed: 13,
  springV: 19.5, dashSpeed: 12.5, dashTime: 1.2,
  stompBounce: 10, stompBounceHold: 13.5,
  bouncyV: 13.5, bouncyHoldV: 17,
  invuln: 2, bubbleTime: 1.5, faintTime: 1.4,
  starsForHeart: 100, maxHearts: 3,
};

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- 地形 ----------
// 足場の種類: static（ふつう）/ move（動く）/ crumble（乗るとくずれる）/ bouncy（ぽよんと弾む）/ bridge（スイッチで出る）
export class Terrain {
  constructor(pieces, platforms) {
    this.pieces = pieces.map(p => ({ pts: p.pts, x0: p.pts[0][0], x1: p.pts[p.pts.length - 1][0] }));
    this.platforms = platforms;
    this.walls = [];
    for (const p of this.pieces) {
      const a = p.pts[0], z = p.pts[p.pts.length - 1];
      this.walls.push({ x: a[0], top: a[1], face: 1 }); // 右へ進む人を止める
      this.walls.push({ x: z[0], top: z[1], face: -1 }); // 左へ進む人を止める
      for (let i = 1; i < p.pts.length; i++) {
        const [xa, ya] = p.pts[i - 1], [xb, yb] = p.pts[i];
        if (xa === xb && ya !== yb) this.walls.push({ x: xa, top: Math.max(ya, yb), face: yb > ya ? 1 : -1 });
      }
    }
    let lo = Infinity;
    for (const p of this.pieces) for (const [, y] of p.pts) lo = Math.min(lo, y);
    for (const p of platforms) lo = Math.min(lo, p.y - 1);
    this.lowest = lo;
    this.killY = lo - 3.5;
    this.x0 = this.pieces[0].x0;
    this.x1 = this.pieces[this.pieces.length - 1].x1;
  }
  // x での地面の高さ（段差ちょうどの位置では高いほう）。穴なら null
  groundAt(x) {
    for (const p of this.pieces) {
      if (x < p.x0 || x > p.x1) continue;
      let best = null;
      const pts = p.pts;
      for (let i = 1; i < pts.length; i++) {
        const [xa, ya] = pts[i - 1], [xb, yb] = pts[i];
        if (x < xa || x > xb) continue;
        const h = xb === xa ? Math.max(ya, yb) : lerp(ya, yb, (x - xa) / (xb - xa));
        if (best === null || h > best) best = h;
      }
      if (best !== null) return best;
    }
    return null;
  }
  // 足もとを支える面：maxTop 以下で一番高いもの
  floorAt(x, maxTop, halfWidth = 0.22) {
    let best = null, plat = null;
    for (const dx of [0, -halfWidth, halfWidth]) {
      const h = this.groundAt(x + dx);
      if (h !== null && h <= maxTop && (best === null || h > best)) best = h;
    }
    for (const p of this.platforms) {
      if (p.active === false) continue;
      if (x + halfWidth < p.x || x - halfWidth > p.x + p.w) continue;
      if (p.y <= maxTop && (best === null || p.y > best)) { best = p.y; plat = p; }
    }
    return { h: best, plat };
  }
  slopeAt(x) {
    const a = this.groundAt(x - 0.15), b = this.groundAt(x + 0.15);
    if (a === null || b === null) return 0;
    const s = (b - a) / 0.3;
    return Math.abs(s) > 2 ? 0 : s;
  }
  // 横移動を壁で止める。移動後の x を返す
  sweep(oldX, newX, feet, r) {
    if (newX > oldX) {
      let lim = newX;
      for (const w of this.walls) {
        if (w.face !== 1 || w.top <= feet + TUNE.stepUp) continue;
        if (w.x >= oldX + r - 1e-6 && w.x < lim + r) lim = w.x - r;
      }
      return Math.max(oldX, lim);
    }
    if (newX < oldX) {
      let lim = newX;
      for (const w of this.walls) {
        if (w.face !== -1 || w.top <= feet + TUNE.stepUp) continue;
        if (w.x <= oldX - r + 1e-6 && w.x > lim - r) lim = w.x + r;
      }
      return Math.min(oldX, lim);
    }
    return newX;
  }
}

// ---------- ステージの組み立て ----------
const LISTS = ['star', 'medal', 'spring', 'dash', 'enemy', 'checkpoint', 'sign', 'spike', 'updraft', 'loop', 'vent', 'switch', 'heart', 'chase', 'drop'];
export class Builder {
  constructor(y = 0) {
    this.x = -6; this.y = y;
    this.cur = [[this.x, y]];
    this.pieces = [];
    this.items = []; // 地面からの高さで置き、あとで確定
  }
  flat(len) { this.x += len; this.cur.push([this.x, this.y]); return this; }
  slope(len, dy) { this.x += len; this.y += dy; this.cur.push([this.x, this.y]); return this; }
  step(dy) { this.y += dy; this.cur.push([this.x, this.y]); return this; }
  gap(len, dy = 0) { this.pieces.push({ pts: this.cur }); this.x += len; this.y += dy; this.cur = [[this.x, this.y]]; return this; }
  // opts: { kind, dx, dy, period, phase, group, ref }
  platform(x, h, w, ref = x, opts = {}) { this.items.push({ kind: 'platform', x, h, w, ref, ...opts }); return this; }
  add(kind, x, h = 0, extra = {}) { this.items.push({ kind, x, h, ...extra }); return this; }
  stars(x, h, n, dx = 1, arc = 0) {
    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) : 0;
      this.items.push({ kind: 'star', x: x + i * dx, h: h + arc * 4 * t * (1 - t) });
    }
    return this;
  }
  finish(meta) {
    this.pieces.push({ pts: this.cur });
    const terrain0 = new Terrain(this.pieces, []);
    const refY = x => {
      let h = terrain0.groundAt(x);
      if (h !== null) return h;
      // 穴の上：手前の地面の高さを使う
      for (let d = 0.5; d < 40; d += 0.5) { h = terrain0.groundAt(x - d); if (h !== null) return h; }
      return 0;
    };
    const platforms = [], list = Object.fromEntries(LISTS.map(k => [k, []]));
    let goal = null, boss = null;
    for (const it of this.items) {
      if (it.kind !== 'platform') continue;
      const { kind, h, ref, type = 'static', ...rest } = it;
      platforms.push({ ...rest, kind: type, x: it.x, y: refY(ref) + h, w: it.w });
    }
    const terrain = new Terrain(this.pieces, platforms);
    const baseY = (x, onPlat) => {
      if (onPlat) { const f = terrain.floorAt(x, Infinity, 0); if (f.h !== null) return f.h; }
      return refY(x);
    };
    for (const it of this.items) {
      if (it.kind === 'platform') continue;
      const y = baseY(it.x, it.onPlat) + it.h;
      if (it.kind === 'goal') { goal = { x: it.x, y }; continue; }
      if (it.kind === 'boss') { boss = { type: it.type, x0: it.x, x1: it.x1, y: refY(it.x + 1), hp: it.hp || 3 }; continue; }
      const o = { ...it, y };
      delete o.kind; delete o.h;
      list[it.kind].push(o);
    }
    list.medal.forEach((m, i) => (m.id = i));
    list.checkpoint.sort((a, b) => a.x - b.x);
    return { ...meta, terrain, ...list, goal, boss, start: { x: 0, y: refY(0) } };
  }
}

// ---------- 1回のプレイ ----------
export class Game {
  constructor(stage, opts = {}) {
    this.stage = stage;
    // 動く足場などの状態はプレイごとに持つ
    const plats = stage.terrain.platforms.map(p => ({ ...p, bx: p.x, by: p.y, active: p.kind !== 'bridge', touchT: 0, fallT: 0, fy: 0, ddx: 0, ddy: 0 }));
    this.t = new Terrain(stage.terrain.pieces, plats);
    this.autoRun = !!opts.autoRun;
    this.invincible = !!opts.invincible;
    this.events = [];
    this.stars = stage.star.map(s => ({ x: s.x, y: s.y, taken: false }));
    this.medals = stage.medal.map(m => ({ x: m.x, y: m.y, id: m.id, taken: false, had: !!(opts.medalsHad && opts.medalsHad[m.id]) }));
    this.springs = stage.spring.map(s => ({ x: s.x, y: s.y, anim: 0 }));
    this.dashes = stage.dash.map(d => ({ x: d.x, y: d.y, dir: d.dir || 1, cool: 0 }));
    this.enemies = stage.enemy.map(e => ({
      kind: e.type || 'walk', x: e.x, y: e.y, baseY: e.y, x0: e.x0 ?? e.x - 2, x1: e.x1 ?? e.x + 2,
      dir: -1, state: 'walk', t: (e.x * 0.37) % 1.4, vx: 0, vy: 0, air: false,
    }));
    this.spikes = stage.spike.map(s => ({ x: s.x, y: s.y }));
    this.updrafts = stage.updraft.map(u => ({ x: u.x, w: u.w || 2, y: u.y, top: u.y + (u.height || 7) }));
    this.loops = stage.loop.map(l => ({ x: l.x, y: l.y, R: l.R || 2.4 }));
    this.vents = stage.vent.map(v => ({ x: v.x, y: v.y, t: 1.5, rise: v.rise || 8 }));
    this.rideBubbles = [];
    this.switches = stage.switch.map(s => ({ x: s.x, y: s.y, group: s.group || 1, on: false }));
    this.heartItems = stage.heart.map(h => ({ x: h.x, y: h.y, taken: false }));
    this.checkpoints = stage.checkpoint.map(c => ({ x: c.x, y: c.y, taken: false }));
    this.goal = stage.goal ? { ...stage.goal } : null;
    this.boss = stage.boss ? makeBoss(stage.boss) : null;
    this.shots = [];
    this.lostStars = [];
    this.chasers = stage.chase.map(c => ({ trigger: c.x, end: c.x1, speed: c.speed || 4, state: 'wait', x: 0, y: 0, r: 1.5, rot: 0, hit: false }));
    this.dropZones = stage.drop.map(d => ({ x0: d.x, x1: d.x1, every: d.every || 1.4, kind: d.type || 'nut', t: 0.4, n: 0 }));
    this.drops = [];
    this.wind = 0;
    this.p = {
      x: stage.start.x, y: stage.start.y, vx: 0, vy: 0, dir: 1, autoDir: 1,
      grounded: true, plat: null, coyote: 0, buffer: 0, holdTime: 0,
      rising: false, springRise: false, dash: 0, invuln: 0, landT: 0, airT: 0,
      loop: null, ride: null,
    };
    this.respawn = { x: stage.start.x, y: stage.start.y };
    this.safe = { x: stage.start.x, y: stage.start.y };
    this.hearts = TUNE.maxHearts;
    this.starCount = 0; this.starBank = 0;
    this.state = 'play'; this.stateT = 0;
    this.time = 0;
    this.stats = { hurts: 0, bubbles: 0, faints: 0, jumps: 0 };
    this.prevJump = false;
    this.bubbleFrom = null;
  }

  emit(type, x, y, extra) { this.events.push({ type, x, y, ...extra }); }

  step(dt, input) {
    this.time += dt;
    this.stateT += dt;
    for (const s of this.springs) s.anim = Math.max(0, s.anim - dt);
    for (const d of this.dashes) d.cool = Math.max(0, d.cool - dt);
    this.updatePlatforms(dt);
    this.updateEnemies(dt);
    this.updateVents(dt);
    if (this.boss) this.updateBoss(dt);
    this.updateShots(dt);
    this.updateChasers(dt);
    this.updateDrops(dt);
    this.updateLostStars(dt);
    if (this.state === 'play') {
      if (this.p.loop) this.updateLoop(dt);
      else if (this.p.ride) this.updateRide(dt, input);
      else this.updatePlayer(dt, input);
    } else if (this.state === 'bubble') this.updateBubble(dt);
    else if (this.state === 'faint') { if (this.stateT >= TUNE.faintTime) this.doRespawn(); }
    this.prevJump = !!input.jump;
  }

  // ---------- 足場 ----------
  updatePlatforms(dt) {
    const p = this.p;
    for (const q of this.t.platforms) {
      q.ddx = q.ddy = 0;
      if (q.kind === 'move') {
        // 行って、止まって、帰って、止まる（両はしで少し待つので乗り降りしやすい）
        const u = ((this.time / (q.period || 4) + (q.phase || 0)) % 1 + 1) % 1;
        const tri = u < 0.5 ? u * 2 : 2 - u * 2;
        const e = clamp((tri - 0.15) / 0.7, 0, 1);
        const k = e * e * (3 - 2 * e);
        const nx = q.bx + (q.dx || 0) * k, ny = q.by + (q.dy || 0) * k;
        q.ddx = nx - q.x; q.ddy = ny - q.y; q.x = nx; q.y = ny;
        if (p.grounded && p.plat === q && this.state === 'play') { p.x += q.ddx; p.y = q.y; }
      } else if (q.kind === 'bridge' && q.timer && q.active) {
        // 時間で消える橋：のこり2秒で点滅し、消えたらスイッチがもどる
        q.timeLeft -= dt;
        if (q.timeLeft <= 0) {
          q.active = false;
          if (p.plat === q) { p.grounded = false; p.plat = null; }
          for (const sw of this.switches) if (sw.group === (q.group || 1)) sw.on = false;
          this.emit('bridgeOff', q.x + q.w / 2, q.y);
        }
      } else if (q.kind === 'crumble') {
        if (q.active) {
          if (p.grounded && p.plat === q) q.touchT += dt;
          else if (q.touchT > 0) q.touchT = Math.max(0, q.touchT - dt * 0.5);
          if (q.touchT >= (q.quick ? 0.45 : 0.75)) {
            q.active = false; q.fallT = 0; q.fy = 0;
            if (p.plat === q) { p.grounded = false; p.plat = null; }
            this.emit('crumble', q.x + q.w / 2, q.y);
          }
        } else {
          q.fallT += dt; q.fy -= dt * (2 + q.fallT * 8);
          const overlap = Math.abs(p.x - (q.x + q.w / 2)) < q.w / 2 + 0.6 && Math.abs(p.y - q.y) < 1.2;
          if (q.fallT > 3 && !overlap) { q.active = true; q.touchT = 0; q.fy = 0; this.emit('restore', q.x + q.w / 2, q.y); }
        }
      }
    }
  }

  updatePlayer(dt, input) {
    const p = this.p, T = TUNE, r = T.radius;
    p.invuln = Math.max(0, p.invuln - dt);
    p.landT = Math.max(0, p.landT - dt);
    p.dash = Math.max(0, p.dash - dt);

    // --- 入力 ---
    let move = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (this.autoRun) move = this.autoMove();
    const jumpPressed = input.jump && !this.prevJump;
    if (jumpPressed) p.buffer = T.buffer; else p.buffer = Math.max(0, p.buffer - dt);
    if (move !== 0) { p.dir = move; p.holdTime += dt; } else p.holdTime = 0;
    if (p.dash > 0 && move === 0) move = p.dir; // ダッシュ中は手を離しても走り続ける

    // --- 横の速さ ---
    let top = p.holdTime > T.runDelay ? T.run : T.walk;
    if (this.autoRun) top = T.walk;
    if (p.dash > 0) top = Math.max(top, T.dashSpeed);
    const acc = p.grounded ? T.accel : T.airAccel;
    if (move !== 0) {
      if (Math.sign(p.vx) === -move && Math.abs(p.vx) > 0.5) p.vx += move * (acc + T.decel) * dt; // 切り返しは素早く
      else if (Math.abs(p.vx) < top || Math.sign(p.vx) !== move) p.vx += move * acc * dt;
      if (Math.sign(p.vx) === move && Math.abs(p.vx) > top) {
        // 上限を超えているとき（坂・ダッシュのあと）はゆっくり戻す
        const over = Math.abs(p.vx) - top;
        p.vx = move * (top + over * Math.exp(-dt * (p.dash > 0 ? 0 : 1.6)));
      }
    } else {
      const dec = (p.grounded ? T.decel : T.airDecel) * dt;
      p.vx = Math.abs(p.vx) <= dec ? 0 : p.vx - Math.sign(p.vx) * dec;
    }
    if (p.grounded && !p.plat) {
      const s = this.t.slopeAt(p.x);
      if (s !== 0) {
        const add = -s * T.slopeAcc * dt;
        // 下り坂は加速、上り坂は少しだけ減速（止まりはしない）
        if (s < 0 && Math.sign(p.vx) >= 0 || s > 0 && Math.sign(p.vx) <= 0) p.vx += add;
        else if (move === 0) p.vx += add * 0.5;
      }
    }
    p.vx = clamp(p.vx, -T.maxSpeed, T.maxSpeed);

    // --- ジャンプ ---
    if (p.grounded) p.coyote = T.coyote; else p.coyote = Math.max(0, p.coyote - dt);
    if (p.buffer > 0 && p.coyote > 0) {
      p.vy = T.jumpV; p.grounded = false; p.plat = null; p.coyote = 0; p.buffer = 0;
      p.rising = true; p.springRise = false; this.stats.jumps++;
      this.emit('jump', p.x, p.y);
    }
    if (!input.jump) p.rising = false;

    // 上昇気流：中にいるあいだは、ふわっと上へ運ばれる
    const lift = this.updrafts.find(u => Math.abs(p.x - u.x) < u.w / 2 && p.y >= u.y - 0.5 && p.y < u.top);
    if (lift) {
      if (p.grounded) { p.grounded = false; p.plat = null; }
      const k = clamp((lift.top - p.y) / 1.5, 0.15, 1);
      p.vy = Math.min(p.vy + 42 * k * dt, 7 * k + 1);
      p.springRise = false;
    } else {
      const g = p.vy > 0 ? (p.rising || p.springRise ? T.gHold : T.gRise) : T.gFall;
      // 頂上付近は少しふわっと
      const hang = Math.abs(p.vy) < 2.2 && !p.grounded ? 0.6 : 1;
      if (!p.grounded) p.vy = Math.max(-T.maxFall, p.vy - g * hang * dt);
    }
    if (p.vy <= 0) p.springRise = false;

    // --- 移動と当たり ---
    const oldX = p.x, oldY = p.y;
    const push = this.wind * dt;
    let nx = this.t.sweep(oldX, p.x + p.vx * dt + push, p.y, r);
    if (Math.abs(nx - (oldX + p.vx * dt + push)) > 1e-9) p.vx = 0;
    nx = clamp(nx, this.t.x0 + r, this.t.x1 - r);
    if (this.boss && this.boss.active && !this.boss.done) nx = clamp(nx, this.boss.x0 + r, this.boss.x1 - r);
    p.x = nx;
    const wasGrounded = p.grounded;
    let ny = p.grounded ? p.y : p.y + p.vy * dt;
    const f = this.t.floorAt(p.x, Math.max(oldY, ny) + (wasGrounded ? T.stepUp : 0.02));
    if (f.h !== null && p.vy <= 0 && ny <= f.h + (wasGrounded ? T.snap : 0)) {
      if (f.plat && f.plat.kind === 'bouncy' && !wasGrounded) {
        // ぽよんと弾む雲：ジャンプを押していると高く跳ぶ
        p.y = f.h; p.vy = input.jump ? T.bouncyHoldV : T.bouncyV; p.springRise = true; p.rising = false;
        p.grounded = false; p.plat = null; p.airT = 0; p.landT = 0.2;
        f.plat.boing = 0.4;
        this.emit('boing', p.x, p.y);
      } else {
        p.y = f.h; p.vy = 0; p.plat = f.plat;
        if (!wasGrounded) {
          p.landT = 0.22;
          this.emit('land', p.x, p.y, { impact: p.airT });
        }
        p.grounded = true; p.airT = 0;
      }
    } else {
      if (wasGrounded) { p.grounded = false; p.plat = null; ny = p.y + p.vy * dt; }
      p.y = ny; p.airT += dt;
    }

    // 安全な場所を覚える（穴から助けるときに戻す場所）
    if (p.grounded && (!p.plat || p.plat.kind === 'static')) {
      const ok = [-1.2, 1.2].every(d => { const q = this.t.floorAt(p.x + d, p.y + 0.3, 0); return q.h !== null && (!q.plat || q.plat.kind === 'static'); });
      if (ok && !this.enemyNear(p.x, 2.5) && !this.spikeNear(p.x, 2)) { this.safe.x = p.x; this.safe.y = p.y; }
    }

    // ループ：地面を右へ走って入口を通ると、くるっと一回転
    for (const l of this.loops) {
      if (p.grounded && oldX < l.x && p.x >= l.x && Math.abs(p.y - l.y) < 0.5) {
        p.loop = { l, th: 0, speed: Math.max(p.vx, 8) };
        p.invuln = Math.max(p.invuln, 0.3);
        this.emit('loop', l.x, l.y);
        return;
      }
    }

    this.touchThings(dt, input);

    if (p.y < this.t.killY) this.startBubble();
  }

  // 「おまかせ はしり」の歩く向き。動く足場の前では待つ。ボス戦では端で折り返す
  autoMove() {
    const p = this.p;
    if (this.boss && this.boss.done) {
      if (!this.goal) return 0;
      return Math.abs(this.goal.x - p.x) < 0.3 ? 0 : Math.sign(this.goal.x - p.x);
    }
    if (this.boss && this.boss.active) {
      if (p.x < this.boss.x0 + 1.2) p.autoDir = 1;
      if (p.x > this.boss.x1 - 1.2) p.autoDir = -1;
      return p.autoDir;
    }
    if (!p.grounded) return 1;
    // 先に足場がある（のぼり段差・少しの下り段差を含む）なら進む
    const ahead = this.t.floorAt(p.x + 0.9, p.y + 0.4, 0.05);
    if (ahead.h !== null && ahead.h > p.y - 1.5) return 1;
    const g = this.t.groundAt(p.x + 0.9);
    if (g !== null && g > p.y) return 1; // のぼり段差（ジャンプはプレイヤーが押す）
    // 先が穴で、そこを動く足場が通るなら、目の前に来るまで待つ。ふつうの穴なら進む（ジャンプは自分で）
    return this.moverAhead() ? 0 : 1;
  }

  moverAhead() {
    const p = this.p;
    return this.t.platforms.some(q => q.kind === 'move' &&
      q.bx < p.x + 3 && q.bx + q.w + Math.max(0, q.dx || 0) > p.x + 0.3 &&
      Math.min(q.by, q.by + (q.dy || 0)) < p.y + 1 && Math.max(q.by, q.by + (q.dy || 0)) > p.y - 1);
  }

  enemyNear(x, d) { return this.enemies.some(e => e.state === 'walk' && Math.abs(e.x - x) < d); }
  spikeNear(x, d) { return this.spikes.some(s => Math.abs(s.x - x) < d); }

  updateLoop(dt) {
    const p = this.p, L = p.loop, l = L.l;
    L.th += (L.speed / l.R) * dt;
    const th = Math.min(L.th, Math.PI * 2);
    p.x = l.x + l.R * Math.sin(th) + (th / (Math.PI * 2)) * 1.2;
    p.y = l.y + l.R - l.R * Math.cos(th);
    p.vx = L.speed; p.vy = 0; p.grounded = false;
    this.collect();
    if (L.th >= Math.PI * 2) {
      p.loop = null; p.x = l.x + 1.2; p.y = l.y; p.grounded = true; p.vx = L.speed; p.dash = Math.max(p.dash, 0.6);
    }
  }

  // ---------- しゃぼん玉（乗りもの） ----------
  updateVents(dt) {
    for (const v of this.vents) {
      v.t -= dt;
      if (v.t <= 0) { v.t = 2.6; this.rideBubbles.push({ x: v.x, y: v.y + 0.3, top: v.y + v.rise, vy: 1.9, life: 7, rider: false, pop: false }); }
    }
    for (const b of this.rideBubbles) {
      b.life -= dt;
      b.y = Math.min(b.top, b.y + b.vy * dt);
      b.x += Math.sin((b.life + b.x) * 2) * 0.15 * dt;
      if (b.life <= 0 && !b.pop) { b.pop = true; if (b.rider) this.leaveRide(false); this.emit('pop', b.x, b.y + 0.8); }
    }
    this.rideBubbles = this.rideBubbles.filter(b => !b.pop);
  }

  updateRide(dt, input) {
    const p = this.p, b = p.ride;
    const move = this.autoRun ? 0.5 : (input.right ? 1 : 0) - (input.left ? 1 : 0);
    b.x = this.t.sweep(b.x, b.x + move * 2.2 * dt, b.y + 0.35, 0.7); // がけはすりぬけない
    p.x = b.x; p.y = b.y + 0.35; p.vx = move * 2; p.vy = 0;
    p.invuln = Math.max(p.invuln - dt, 0);
    if (input.jump && !this.prevJump) { this.leaveRide(true); return; }
    this.collect();
  }

  leaveRide(jump) {
    const p = this.p, b = p.ride;
    if (!b) return;
    b.pop = true; b.rider = false; p.ride = null;
    p.vy = jump ? 10.5 : 3; p.rising = jump; p.grounded = false; p.buffer = 0; p.coyote = 0;
    this.emit('pop', p.x, p.y + 0.5);
    if (jump) this.emit('jump', p.x, p.y);
  }

  collect() {
    const p = this.p, cx = p.x, cy = p.y + TUNE.radius;
    for (const s of this.stars) {
      if (s.taken) continue;
      if ((s.x - cx) ** 2 + (s.y - cy) ** 2 < 0.85 ** 2) {
        s.taken = true; this.starCount++; this.starBank++;
        this.emit('star', s.x, s.y);
        if (this.starBank >= TUNE.starsForHeart) {
          this.starBank -= TUNE.starsForHeart;
          if (this.hearts < TUNE.maxHearts) { this.hearts++; this.emit('heart', cx, cy); }
        }
      }
    }
    for (const m of this.medals) {
      if (m.taken) continue;
      if ((m.x - cx) ** 2 + (m.y - cy) ** 2 < 1.0 ** 2) { m.taken = true; this.emit('medal', m.x, m.y, { id: m.id }); }
    }
    for (const s of this.lostStars) {
      if (s.t < 0.45 || s.gone) continue;
      if ((s.x - cx) ** 2 + (s.y + 0.3 - cy) ** 2 < 0.95 ** 2) { s.gone = true; this.starCount++; this.starBank++; this.emit('star', s.x, s.y + 0.3, { back: true }); }
    }
    for (const h of this.heartItems) {
      if (h.taken) continue;
      if ((h.x - cx) ** 2 + (h.y - cy) ** 2 < 0.9 ** 2) {
        h.taken = true;
        if (this.hearts < TUNE.maxHearts) this.hearts++;
        this.emit('heart', h.x, h.y);
      }
    }
  }

  touchThings(dt, input) {
    const p = this.p, r = TUNE.radius, cx = p.x, cy = p.y + r;
    this.collect();
    for (const s of this.springs) {
      if (Math.abs(p.x - s.x) < 0.7 && p.y <= s.y + 0.75 && p.y >= s.y - 0.2 && p.vy <= 0.1) {
        p.vy = TUNE.springV; p.grounded = false; p.plat = null; p.springRise = true; p.rising = false; p.coyote = 0; p.buffer = 0;
        p.y = Math.max(p.y, s.y + 0.05);
        s.anim = 0.35;
        this.emit('spring', s.x, s.y);
      }
    }
    for (const d of this.dashes) {
      if (d.cool > 0) continue;
      if (p.grounded && Math.abs(p.x - d.x) < 0.9 && Math.abs(p.y - d.y) < 0.4) {
        p.vx = Math.max(p.vx * d.dir, TUNE.dashSpeed) * d.dir; p.dir = d.dir; p.dash = TUNE.dashTime; d.cool = 0.5;
        this.emit('dash', d.x, d.y);
      }
    }
    for (const sw of this.switches) {
      if (sw.on) continue;
      if (Math.abs(p.x - sw.x) < 0.8 && Math.abs(p.y - sw.y) < 0.9) {
        sw.on = true;
        let timed = false;
        for (const q of this.t.platforms) if (q.kind === 'bridge' && (q.group || 1) === sw.group) { q.active = true; q.timeLeft = q.timer || 0; timed ||= !!q.timer; }
        this.emit('switch', sw.x, sw.y, { timed });
      }
    }
    for (const b of this.rideBubbles) {
      if (b.rider || b.pop) continue;
      if ((b.x - cx) ** 2 + (b.y + 0.8 - cy) ** 2 < 1.0 ** 2 && p.invuln < TUNE.invuln - 0.3) {
        b.rider = true; p.ride = b; p.dash = 0;
        this.emit('ride', b.x, b.y);
        return;
      }
    }
    for (const e of this.enemies) {
      if (e.state !== 'walk') continue;
      const ey = e.y + 0.42;
      const dx = e.x - cx, dy = ey - cy;
      if (dx * dx + dy * dy > (r + 0.38) ** 2) continue;
      if ((p.vy < 0 || !p.grounded && p.airT > 0.05) && cy > ey - 0.05) {
        e.state = 'dizzy'; e.t = 0;
        p.vy = input.jump ? TUNE.stompBounceHold : TUNE.stompBounce; p.rising = !!input.jump; p.grounded = false;
        this.emit('stomp', e.x, ey);
      } else if (p.dash > 0) {
        e.state = 'dizzy'; e.t = 0;
        this.emit('stomp', e.x, ey, { bump: true });
      } else this.hurt(e.x);
    }
    for (const s of this.spikes) {
      const dx = s.x - cx, dy = s.y + 0.35 - cy;
      if (dx * dx + dy * dy < (r + 0.3) ** 2) this.hurt(s.x);
    }
    for (const c of this.chasers) {
      if (c.state !== 'roll') continue;
      const dx = cx - c.x, dy = cy - (c.y + c.r);
      if (dx * dx + dy * dy > (c.r + r - 0.1) ** 2) continue;
      if (dx > 0) {
        // 追いつかれた：いたいけど、前へ ぽーんと はじき出される
        if (p.invuln <= 0 && !this.invincible) { c.hit = true; this.hurt(c.x); }
        p.vx = 9; p.vy = 10.5; p.grounded = false; p.plat = null; p.x = Math.max(p.x, c.x + c.r * 0.6);
      } else p.x = Math.min(p.x, c.x - c.r - r + 0.1); // 後ろからは押すだけ
    }
    for (const d of this.drops) {
      if (d.state !== 'fall') continue;
      const dx = d.x - cx, dy = d.y + 0.35 - cy;
      if (dx * dx + dy * dy < (r + 0.32) ** 2) { this.hurt(d.x); d.state = 'gone'; this.emit('splash', d.x, d.y, { kind: d.kind }); }
    }
    if (this.boss) this.touchBoss(input);
    for (const c of this.checkpoints) {
      if (!c.taken && p.x >= c.x) {
        c.taken = true; this.respawn = { x: c.x, y: c.y };
        this.emit('checkpoint', c.x, c.y);
      }
    }
    if (this.goal && this.state === 'play') {
      const g = this.goal;
      const reached = g.touch ? Math.abs(p.x - g.x) < 1.3 && Math.abs(cy - g.y) < 2.2 : p.x >= g.x - 0.6;
      if (reached) {
        this.state = 'clear'; this.stateT = 0;
        this.emit('goal', g.x, g.y);
      }
    }
  }

  hurt(fromX) {
    const p = this.p;
    if (p.invuln > 0 || this.invincible) return;
    this.hearts--; this.stats.hurts++;
    p.invuln = TUNE.invuln;
    const away = Math.sign(p.x - fromX) || -1;
    p.vx = away * 5; p.vy = 7; p.grounded = false; p.rising = false; p.plat = null;
    this.scatterStars();
    this.emit('hurt', p.x, p.y + 0.5, { hearts: this.hearts });
    if (this.hearts <= 0) this.startFaint();
  }

  // ダメージを受けると星がとびちる。少しのあいだなら拾いなおせる
  scatterStars() {
    const n = Math.min(this.starCount, 10);
    if (n <= 0) return;
    this.starCount -= n; this.starBank = Math.max(0, this.starBank - n);
    const p = this.p;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (0.15 + 0.7 * (i / Math.max(1, n - 1)));
      const sp = 4 + (i % 3) * 1.3;
      this.lostStars.push({ x: p.x, y: p.y + 0.6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + 4, t: 0, gone: false });
    }
    this.emit('scatter', p.x, p.y + 0.5, { n });
  }

  updateLostStars(dt) {
    for (const s of this.lostStars) {
      s.t += dt;
      s.vy -= 25 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      s.vx *= Math.exp(-dt * 0.6);
      const f = this.t.floorAt(s.x, s.y + 0.4, 0.1).h;
      if (f !== null && s.y < f && s.vy < 0) { s.y = f; s.vy = Math.abs(s.vy) > 2 ? -s.vy * 0.55 : 0; }
      if (s.t > 4.5 || s.y < this.t.killY) s.gone = true;
    }
    this.lostStars = this.lostStars.filter(s => !s.gone);
  }

  // ---------- おいかけっこ：後ろから大玉が転がってくる ----------
  updateChasers(dt) {
    const p = this.p;
    for (const c of this.chasers) {
      if (c.state === 'wait') {
        if (this.state === 'play' && p.x > c.trigger && p.x < c.end) {
          c.state = 'roll'; c.x = Math.max(this.t.x0 + 2, p.x - 11); c.hit = false;
          c.y = this.t.groundAt(c.x) ?? p.y;
          this.emit('chaseStart', c.x, c.y);
        }
      } else if (c.state === 'roll') {
        const gap = p.x - c.x;
        // はなれすぎると少し速く（画面の中に見えているように）、近いときは決まった速さ
        const sp = gap > 11 ? c.speed + 2.5 : c.speed;
        c.x += sp * dt; c.rot -= (sp / c.r) * dt;
        const g = this.t.groundAt(c.x);
        if (g !== null) c.y += (g - c.y) * Math.min(1, dt * 10);
        if (c.x >= c.end) { c.state = 'done'; this.emit('chaseEnd', c.x, c.y + c.r, { safe: !c.hit }); }
      }
    }
  }

  // ---------- 上から落ちてくるもの（影で予告してから落ちる） ----------
  updateDrops(dt) {
    const p = this.p;
    for (const z of this.dropZones) {
      if (this.state !== 'play' || p.x < z.x0 - 4 || p.x > z.x1) continue;
      if (!z.announced) { z.announced = true; this.emit('dropZone', z.x0, p.y); }
      z.t -= dt;
      if (z.t > 0) continue;
      z.t = z.every;
      const offs = this.autoRun ? [11, 12.5, 10.5] : [3, 5, 1.8, 4, 6];
      const x = p.x + offs[z.n++ % offs.length] * (p.dir || 1);
      if (x < z.x0 || x > z.x1) continue; // 区間の外には落とさない
      if (this.drops.some(d => Math.abs(d.x - x) < 1.2)) continue;
      const g = this.t.floorAt(x, p.y + 6, 0.1).h;
      if (g === null) continue;
      this.drops.push({ x, gy: g, y: g + 9, vy: 0, t: 0, state: 'warn', kind: z.kind });
    }
    for (const d of this.drops) {
      d.t += dt;
      if (d.state === 'warn' && d.t > 1.1) d.state = 'fall';
      if (d.state === 'fall') {
        d.vy -= 26 * dt; d.y += d.vy * dt;
        if (d.y <= d.gy) { d.state = 'gone'; this.emit('splash', d.x, d.gy, { kind: d.kind }); }
      }
    }
    this.drops = this.drops.filter(d => d.state !== 'gone');
  }

  startFaint() {
    this.state = 'faint'; this.stateT = 0; this.stats.faints++;
    this.emit('faint', this.p.x, this.p.y);
  }

  startBubble() {
    const p = this.p;
    if (!this.invincible) { this.hearts--; }
    this.stats.bubbles++;
    if (this.hearts <= 0) { this.startFaint(); return; }
    this.state = 'bubble'; this.stateT = 0;
    this.bubbleFrom = { x: p.x, y: p.y };
    p.vx = 0; p.vy = 0;
    this.emit('bubble', p.x, p.y, { hearts: this.hearts });
  }

  updateBubble() {
    const p = this.p, k = clamp(this.stateT / TUNE.bubbleTime, 0, 1);
    const e = k * k * (3 - 2 * k);
    const a = this.bubbleFrom, b = this.safe;
    p.x = lerp(a.x, b.x, e);
    p.y = lerp(a.y, b.y + 0.9, e) + Math.sin(k * Math.PI) * 3.5;
    if (k >= 1) {
      p.x = b.x; p.y = b.y + 0.9; p.vx = 0; p.vy = 0; p.grounded = false; p.plat = null;
      p.invuln = TUNE.invuln; this.state = 'play'; this.stateT = 0;
      this.emit('pop', p.x, p.y + 0.4);
    }
  }

  doRespawn() {
    const p = this.p;
    this.hearts = TUNE.maxHearts;
    p.x = this.respawn.x; p.y = this.respawn.y; p.vx = 0; p.vy = 0; p.grounded = true; p.plat = null;
    p.invuln = TUNE.invuln; p.dash = 0; p.loop = null; p.ride = null;
    this.safe = { ...this.respawn };
    this.shots.length = 0; this.wind = 0; this.drops.length = 0;
    for (const c of this.chasers) if (c.state === 'roll') c.state = 'wait';
    if (this.boss && !this.boss.done) resetBoss(this.boss); // ボスの残りハートはそのまま
    this.state = 'play'; this.stateT = 0;
    this.emit('respawn', p.x, p.y);
  }

  // ---------- 敵 ----------
  updateEnemies(dt) {
    for (const e of this.enemies) {
      e.t += dt;
      if (e.state === 'walk') {
        const speed = e.kind === 'crab' ? 1.9 : e.kind === 'fly' ? 1.3 : e.kind === 'hop' ? 0.8 : 1.1;
        e.x += e.dir * speed * dt;
        if (e.x < e.x0) { e.x = e.x0; e.dir = 1; }
        if (e.x > e.x1) { e.x = e.x1; e.dir = -1; }
        if (e.kind === 'fly') { e.y = e.baseY + Math.sin(e.t * 1.8) * 0.9; continue; }
        const h = this.t.floorAt(e.x, e.y + 0.5, 0).h;
        if (e.kind === 'hop') {
          if (!e.air && e.t > 1.4) { e.air = true; e.vy = 7.5; e.t = 0; }
          if (e.air) {
            e.vy -= 22 * dt; e.y += e.vy * dt;
            if (h !== null && e.y <= h && e.vy < 0) { e.y = h; e.air = false; e.t = 0; }
          } else if (h !== null) e.y = h;
        } else if (h !== null) e.y = h;
      } else if (e.state === 'dizzy') {
        if (e.t > 0.7) { e.state = 'flee'; e.t = 0; e.vx = (e.x > this.p.x ? 1 : -1) * 7; e.vy = 8; }
      } else if (e.state === 'flee') {
        e.x += e.vx * dt; e.vy -= 20 * dt; e.y += e.vy * dt;
        if (e.t > 2.5) e.state = 'gone';
      }
    }
  }

  // ---------- ボス ----------
  updateBoss(dt) {
    const B = this.boss, p = this.p;
    B.t += dt; B.flash = Math.max(0, B.flash - dt);
    if (!B.active) {
      if (!B.done && this.state === 'play' && p.x > B.x0 + 2) { B.active = true; B.t = 0; this.emit('bossStart', B.cx, B.y); }
      return;
    }
    if (B.done) {
      B.t2 += dt;
      B.y = lerp(B.y, B.floor + (B.type === 'cloud' || B.type === 'wind' ? 1.2 : 0), 1 - Math.exp(-dt * 3));
      if (!this.goal && B.t2 > 1.4) { this.goal = { x: B.cx, y: B.floor + 1.6, touch: true }; this.emit('goalAppear', B.cx, B.floor + 1.6); }
      return;
    }
    BOSS_AI[B.type](this, B, dt);
    // 画面の中にとどめる
    B.x = clamp(B.x, B.x0 + B.r, B.x1 - B.r);
  }

  touchBoss(input) {
    const B = this.boss, p = this.p;
    if (!B.active || B.done || B.state === 'hurt') return;
    const cx = p.x, cy = p.y + TUNE.radius, by = B.y + B.r;
    const dx = cx - B.x, dy = cy - by;
    if (dx * dx + dy * dy > (B.r + 0.42) ** 2) return;
    if ((p.vy < 0 || !p.grounded) && cy > by + B.r * 0.15) {
      B.hp--; B.flash = 0.6;
      p.vy = input.jump ? 15 : 12.5; p.rising = !!input.jump; p.grounded = false;
      p.vx = Math.sign(dx || 1) * 3;
      if (B.hp <= 0) {
        B.done = true; B.t2 = 0; B.state = 'happy'; this.shots.length = 0; this.wind = 0;
        this.emit('bossDown', B.x, by);
      } else {
        B.state = 'hurt'; B.t = 0; B.vy = 0;
        this.emit('bossHit', B.x, by, { hp: B.hp });
        if (B.hp === 1) { B.angry = true; this.emit('bossAngry', B.x, by); }
      }
    } else this.hurt(B.x);
  }

  updateShots(dt) {
    const p = this.p, cx = p.x, cy = p.y + TUNE.radius;
    for (const s of this.shots) {
      s.life -= dt;
      s.vy -= s.g * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.kind === 'shell') {
        const h = this.t.floorAt(s.x, s.y + 0.5, 0).h;
        if (h !== null) s.y = h;
        if (this.boss && (s.x < this.boss.x0 + 0.4 || s.x > this.boss.x1 - 0.4)) { if (s.bounced) s.life = 0; else { s.vx *= -1; s.bounced = true; } }
      } else {
        const h = this.t.floorAt(s.x, s.y + 0.3, 0).h;
        if (h !== null && s.y <= h) { s.life = 0; this.emit('splash', s.x, h, { kind: s.kind }); }
      }
      if (this.state === 'play' && !p.loop && !p.ride && (s.x - cx) ** 2 + (s.y + s.r - cy) ** 2 < (s.r + 0.38) ** 2) { this.hurt(s.x); s.life = 0; }
    }
    this.shots = this.shots.filter(s => s.life > 0);
  }

  get medalCount() { return this.medals.filter(m => m.taken).length; }
  drainEvents() { const e = this.events; this.events = []; return e; }
}

// ---------- ボスの動き（どれもゆっくり・予告つき・上から踏めばOK） ----------
function makeBoss(def) {
  const B = { ...def, maxHp: def.hp, cx: (def.x0 + def.x1) / 2, floor: def.y, r: 1.1, done: false, active: false, flash: 0 };
  resetBoss(B);
  return B;
}
function resetBoss(B) {
  B.x = B.cx + 3; B.y = B.floor; B.vx = 0; B.vy = 0; B.dir = -1; B.t = 0; B.t2 = 0; B.state = 'idle'; B.active = false; B.cycle = 0;
  if (B.type === 'cloud' || B.type === 'wind') B.y = B.floor + 4.5;
}
const hurtRecover = (B, dt, after) => {
  // 踏まれたあとは少し目を回す（この間は当たっても痛くない）
  if (B.t > 1.2) { B.state = after; B.t = 0; }
};
const BOSS_AI = {
  // ワールド1：でかもやもや。行ったり来たり、ときどき大きくジャンプ
  blob(g, B, dt) {
    const angry = B.maxHp - B.hp;
    if (B.state === 'hurt') { B.y = Math.max(B.floor, B.y + B.vy * dt); B.vy -= 30 * dt; hurtRecover(B, dt, 'walk'); return; }
    if (B.state === 'idle') { if (B.t > 1) { B.state = 'walk'; B.t = 0; } return; }
    if (B.state === 'walk') {
      B.x += B.dir * (1.6 + angry * 0.5) * dt;
      if (B.x <= B.x0 + B.r + 0.05) B.dir = 1;
      if (B.x >= B.x1 - B.r - 0.05) B.dir = -1;
      if (B.t > (B.angry ? 2.2 : 3.2)) { B.state = 'crouch'; B.t = 0; }
    } else if (B.state === 'crouch') {
      if (B.t > 0.6) { B.state = 'jump'; B.t = 0; B.vy = B.angry ? 11.5 : 10; }
    } else if (B.state === 'jump') {
      B.x += B.dir * 2.2 * dt; B.vy -= 22 * dt; B.y += B.vy * dt;
      if (B.x <= B.x0 + B.r + 0.05) B.dir = 1;
      if (B.x >= B.x1 - B.r - 0.05) B.dir = -1;
      if (B.y <= B.floor) { B.y = B.floor; B.state = 'walk'; B.t = 0; g.emit('thud', B.x, B.floor); }
    }
  },
  // ワールド2：ぷるるんゼリー。ぴょーんと跳んで近づき、着地したら少し休む
  jelly(g, B, dt) {
    if (B.state === 'hurt') { B.vy -= 25 * dt; B.y = Math.max(B.floor, B.y + B.vy * dt); hurtRecover(B, dt, 'rest'); return; }
    if (B.state === 'idle' || B.state === 'rest') { B.y = B.floor; if (B.t > (B.state === 'idle' ? 1 : B.angry ? 0.9 : 1.5)) { B.state = 'crouch'; B.t = 0; } return; }
    if (B.state === 'crouch') {
      if (B.t > (B.angry ? 0.4 : 0.5)) {
        const target = clamp(g.p.x, B.x0 + 2, B.x1 - 2);
        B.vx = clamp((target - B.x) / 1.0, -5, 5); B.vy = 11; B.state = 'hop'; B.t = 0;
      }
    } else if (B.state === 'hop') {
      B.x += B.vx * dt; B.vy -= 22 * dt; B.y += B.vy * dt;
      if (B.y <= B.floor && B.vy < 0) { B.y = B.floor; B.state = 'rest'; B.t = 0; g.emit('thud', B.x, B.floor); }
    }
  },
  // ワールド3：くもくもさん。空から雨つぶを落とし、ときどき降りてきて眠る
  cloud(g, B, dt) {
    const high = B.floor + 4.6;
    if (B.state === 'hurt') { B.y = lerp(B.y, high, 1 - Math.exp(-dt * 2)); hurtRecover(B, dt, 'float'); return; }
    if (B.state === 'idle') { if (B.t > 1) { B.state = 'float'; B.t = 0; } return; }
    if (B.state === 'float') {
      B.y = lerp(B.y, high + Math.sin(B.t * 2) * 0.3, 1 - Math.exp(-dt * 3));
      B.x += B.dir * 2 * dt;
      if (B.x <= B.x0 + 2) B.dir = 1;
      if (B.x >= B.x1 - 2) B.dir = -1;
      B.cycle += dt;
      if (B.cycle > (B.angry ? 1.1 : 1.5)) {
        B.cycle = 0;
        for (const dx of B.angry ? [-0.9, 0.9] : [0]) g.shots.push({ kind: 'rain', x: B.x + dx + (Math.random() - 0.5) * 0.6, y: B.y - 0.1, vx: 0, vy: -1, g: 4, r: 0.25, life: 5 });
      }
      if (B.t > (B.angry ? 5 : 6)) { B.state = 'down'; B.t = 0; }
    } else if (B.state === 'down') {
      B.y = lerp(B.y, B.floor, 1 - Math.exp(-dt * 3));
      if (B.t > 1) { B.state = 'sleep'; B.t = 0; B.y = B.floor; }
    } else if (B.state === 'sleep') {
      if (B.t > 3.2) { B.state = 'float'; B.t = 0; }
    }
  },
  // ワールド4：おおきなカニ。横歩きして、ときどき貝がらをころがす
  crab(g, B, dt) {
    if (B.state === 'hurt') { hurtRecover(B, dt, 'walk'); return; }
    if (B.state === 'idle') { if (B.t > 1) { B.state = 'walk'; B.t = 0; } return; }
    if (B.state === 'walk') {
      B.x += B.dir * (1.8 + (B.maxHp - B.hp) * 0.3) * dt;
      if (B.x <= B.x0 + B.r + 0.05) B.dir = 1;
      if (B.x >= B.x1 - B.r - 0.05) B.dir = -1;
      if (B.t > 3.4) { B.state = 'throw'; B.t = 0; }
    } else if (B.state === 'throw') {
      const throwAt = B.angry ? [0.8, 1.6] : [0.8];
      B.thrown = B.thrown || 0;
      if (B.thrown < throwAt.length && B.t > throwAt[B.thrown]) {
        B.thrown++;
        const d = Math.sign(g.p.x - B.x) || 1;
        g.shots.push({ kind: 'shell', x: B.x + d * 1.3, y: B.floor, vx: d * 3, vy: 0, g: 0, r: 0.3, life: 9 });
      }
      if (B.t > (B.angry ? 2.4 : 1.6)) { B.state = 'walk'; B.t = 0; B.thrown = 0; }
    }
  },
  // ワールド5：いたずらかぜ。ふーっと風を吹いて、星の玉をまき、疲れると降りてくる
  wind(g, B, dt) {
    const high = B.floor + 4.4;
    g.wind = 0;
    if (B.state === 'hurt') { B.y = lerp(B.y, high, 1 - Math.exp(-dt * 2)); hurtRecover(B, dt, 'float'); return; }
    if (B.state === 'idle') { if (B.t > 1) { B.state = 'float'; B.t = 0; } return; }
    if (B.state === 'float') {
      B.y = lerp(B.y, high + Math.sin(B.t * 2.2) * 0.3, 1 - Math.exp(-dt * 3));
      B.x += B.dir * 1.8 * dt;
      if (B.x <= B.x0 + 2) B.dir = 1;
      if (B.x >= B.x1 - 2) B.dir = -1;
      if (B.t > 2.5) { B.state = B.cycle % 2 === 0 ? 'puff' : 'toss'; B.cycle++; B.t = 0; }
    } else if (B.state === 'puff') {
      // 0.9秒ほっぺをふくらませてから、2秒間ふーっ（押し戻すだけで痛くない）
      if (B.t > 0.9) g.wind = Math.sign(g.p.x - B.x || 1) * (B.angry ? 3 : 2.4);
      if (B.t > 2.9) { B.state = 'tired'; B.t = 0; }
    } else if (B.state === 'toss') {
      if (B.t > 0.7 && !B.thrown) {
        B.thrown = true;
        for (const vx of B.angry ? [-3.6, -1.8, 0, 1.8, 3.6] : [-2.6, 0, 2.6]) g.shots.push({ kind: 'orb', x: B.x, y: B.y + 0.8, vx, vy: 5, g: 9, r: 0.3, life: 5 });
      }
      if (B.t > 1.6) { B.state = 'tired'; B.t = 0; B.thrown = false; }
    } else if (B.state === 'tired') {
      B.y = lerp(B.y, B.floor, 1 - Math.exp(-dt * 3));
      if (B.t > 3.4) { B.state = 'float'; B.t = 0; }
    }
  },
};
