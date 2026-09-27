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
  invuln: 2, bubbleTime: 1.5, faintTime: 1.4,
  starsForHeart: 100, maxHearts: 3,
};

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- 地形 ----------
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
export class Builder {
  constructor(y = 0) {
    this.x = -6; this.y = y;
    this.cur = [[this.x, y]];
    this.pieces = []; this.platforms = [];
    this.items = []; // 地面からの高さで置き、あとで確定
    this.fixed = [];
  }
  flat(len) { this.x += len; this.cur.push([this.x, this.y]); return this; }
  slope(len, dy) { this.x += len; this.y += dy; this.cur.push([this.x, this.y]); return this; }
  step(dy) { this.y += dy; this.cur.push([this.x, this.y]); return this; }
  gap(len, dy = 0) { this.pieces.push({ pts: this.cur }); this.x += len; this.y += dy; this.cur = [[this.x, this.y]]; return this; }
  platform(x, h, w, ref = x) { this.items.push({ kind: 'platform', x, h, w, ref }); return this; }
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
      for (let d = 0.5; d < 30; d += 0.5) { h = terrain0.groundAt(x - d); if (h !== null) return h; }
      return 0;
    };
    const platforms = [], list = { star: [], medal: [], spring: [], dash: [], enemy: [], checkpoint: [], sign: [] };
    let goal = null;
    for (const it of this.items) {
      if (it.kind === 'platform') { platforms.push({ x: it.x, y: refY(it.ref) + it.h, w: it.w }); continue; }
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
      const o = { ...it, y };
      delete o.kind; delete o.h;
      list[it.kind].push(o);
    }
    list.medal.forEach((m, i) => (m.id = i));
    list.checkpoint.sort((a, b) => a.x - b.x);
    return { ...meta, terrain, ...list, goal, start: { x: 0, y: refY(0) } };
  }
}

// ---------- 1回のプレイ ----------
export class Game {
  constructor(stage, opts = {}) {
    this.stage = stage;
    this.t = stage.terrain;
    this.autoRun = !!opts.autoRun;
    this.invincible = !!opts.invincible;
    this.events = [];
    this.stars = stage.star.map(s => ({ x: s.x, y: s.y, taken: false }));
    this.medals = stage.medal.map(m => ({ x: m.x, y: m.y, id: m.id, taken: false, had: !!(opts.medalsHad && opts.medalsHad[m.id]) }));
    this.springs = stage.spring.map(s => ({ x: s.x, y: s.y, anim: 0 }));
    this.dashes = stage.dash.map(d => ({ x: d.x, y: d.y, dir: d.dir || 1, cool: 0 }));
    this.enemies = stage.enemy.map(e => ({ x: e.x, y: e.y, x0: e.x0 ?? e.x - 2, x1: e.x1 ?? e.x + 2, dir: -1, state: 'walk', t: 0, vx: 0, vy: 0 }));
    this.checkpoints = stage.checkpoint.map(c => ({ x: c.x, y: c.y, taken: false }));
    this.goal = stage.goal;
    this.p = {
      x: stage.start.x, y: stage.start.y, vx: 0, vy: 0, dir: 1,
      grounded: true, plat: null, coyote: 0, buffer: 0, holdTime: 0,
      rising: false, springRise: false, dash: 0, invuln: 0, landT: 0, airT: 0,
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
    this.updateEnemies(dt);
    if (this.state === 'play') this.updatePlayer(dt, input);
    else if (this.state === 'bubble') this.updateBubble(dt);
    else if (this.state === 'faint') { if (this.stateT >= TUNE.faintTime) this.doRespawn(); }
    this.prevJump = !!input.jump;
  }

  updatePlayer(dt, input) {
    const p = this.p, T = TUNE, r = T.radius;
    p.invuln = Math.max(0, p.invuln - dt);
    p.landT = Math.max(0, p.landT - dt);
    p.dash = Math.max(0, p.dash - dt);

    // --- 入力 ---
    let move = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (this.autoRun) move = 1;
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
    const g = p.vy > 0 ? (p.rising || p.springRise ? T.gHold : T.gRise) : T.gFall;
    // 頂上付近は少しふわっと
    const hang = Math.abs(p.vy) < 2.2 && !p.grounded ? 0.6 : 1;
    if (!p.grounded) p.vy = Math.max(-T.maxFall, p.vy - g * hang * dt);
    if (p.vy <= 0) p.springRise = false;

    // --- 移動と当たり ---
    const oldX = p.x, oldY = p.y;
    let nx = this.t.sweep(oldX, p.x + p.vx * dt, p.y, r);
    if (nx !== oldX + p.vx * dt) p.vx = 0;
    nx = clamp(nx, this.t.x0 + r, this.t.x1 - r);
    p.x = nx;
    const wasGrounded = p.grounded;
    let ny = p.grounded ? p.y : p.y + p.vy * dt;
    const f = this.t.floorAt(p.x, Math.max(oldY, ny) + (wasGrounded ? T.stepUp : 0.02));
    if (f.h !== null && p.vy <= 0 && ny <= f.h + (wasGrounded ? T.snap : 0)) {
      p.y = f.h; p.vy = 0; p.plat = f.plat;
      if (!wasGrounded) {
        p.landT = 0.22;
        this.emit('land', p.x, p.y, { impact: p.airT });
      }
      p.grounded = true; p.airT = 0;
    } else {
      if (wasGrounded) { p.grounded = false; p.plat = null; ny = p.y + p.vy * dt; }
      p.y = ny; p.airT += dt;
    }

    // 安全な場所を覚える（穴から助けるときに戻す場所）
    if (p.grounded) {
      const ok = [-1.2, 1.2].every(d => this.t.floorAt(p.x + d, p.y + 0.3, 0).h !== null);
      if (ok && !this.enemyNear(p.x, 2.5)) { this.safe.x = p.x; this.safe.y = p.y; }
    }

    this.touchThings(dt, input);

    if (p.y < this.t.killY) this.startBubble();
  }

  enemyNear(x, d) { return this.enemies.some(e => e.state === 'walk' && Math.abs(e.x - x) < d); }

  touchThings(dt, input) {
    const p = this.p, r = TUNE.radius, cx = p.x, cy = p.y + r;
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
    for (const c of this.checkpoints) {
      if (!c.taken && p.x >= c.x) {
        c.taken = true; this.respawn = { x: c.x, y: c.y };
        this.emit('checkpoint', c.x, c.y);
      }
    }
    if (this.goal && this.state === 'play' && p.x >= this.goal.x - 0.6) {
      this.state = 'clear'; this.stateT = 0;
      this.emit('goal', this.goal.x, this.goal.y);
    }
  }

  hurt(fromX) {
    const p = this.p;
    if (p.invuln > 0 || this.invincible) return;
    this.hearts--; this.stats.hurts++;
    p.invuln = TUNE.invuln;
    const away = Math.sign(p.x - fromX) || -1;
    p.vx = away * 5; p.vy = 7; p.grounded = false; p.rising = false;
    this.emit('hurt', p.x, p.y + 0.5, { hearts: this.hearts });
    if (this.hearts <= 0) this.startFaint();
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
      p.x = b.x; p.y = b.y + 0.9; p.vx = 0; p.vy = 0; p.grounded = false;
      p.invuln = TUNE.invuln; this.state = 'play'; this.stateT = 0;
      this.emit('pop', p.x, p.y + 0.4);
    }
  }

  doRespawn() {
    const p = this.p;
    this.hearts = TUNE.maxHearts;
    p.x = this.respawn.x; p.y = this.respawn.y; p.vx = 0; p.vy = 0; p.grounded = true; p.plat = null;
    p.invuln = TUNE.invuln; p.dash = 0;
    this.safe = { ...this.respawn };
    this.state = 'play'; this.stateT = 0;
    this.emit('respawn', p.x, p.y);
  }

  updateEnemies(dt) {
    for (const e of this.enemies) {
      e.t += dt;
      if (e.state === 'walk') {
        e.x += e.dir * 1.1 * dt;
        if (e.x < e.x0) { e.x = e.x0; e.dir = 1; }
        if (e.x > e.x1) { e.x = e.x1; e.dir = -1; }
        const h = this.t.floorAt(e.x, e.y + 0.5, 0).h;
        if (h !== null) e.y = h;
      } else if (e.state === 'dizzy') {
        if (e.t > 0.7) { e.state = 'flee'; e.t = 0; e.vx = (e.x > this.p.x ? 1 : -1) * 7; e.vy = 8; }
      } else if (e.state === 'flee') {
        e.x += e.vx * dt; e.vy -= 20 * dt; e.y += e.vy * dt;
        if (e.t > 2.5) e.state = 'gone';
      }
    }
  }

  get medalCount() { return this.medals.filter(m => m.taken).length; }
  drainEvents() { const e = this.events; this.events = []; return e; }
}
