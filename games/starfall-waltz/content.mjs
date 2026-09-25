// ステージ・ボス・弾幕の定義。g は Game（core.mjs）、b はボス、t は攻撃開始からのフレーム数
import {W, H, TAU, RAINBOW, clamp} from './consts.mjs';

const GALAXY = ['white', 'cyan', 'blue', 'violet', 'pink', 'gold'];

// ================= 道中の敵 =================
function wisp(g, x, y, o) {
  return g.enemy({x, y, vx: o.vx || 0, vy: o.vy || 0, hp: o.hp || 15, r: 10, kind: 'wisp', color: o.color, score: 500,
    drops: [o.drop || (g.rand() < .55 ? 'power' : 'point')], fn: o.fn});
}
const aimedBurst = (g, e, n, spread, speed, type, color) => {
  if (e.y < 0 || e.y > H * .7) return;
  g.fan(e.x, e.y, n, spread, speed, g.aim(e.x, e.y), type, color); g.sfx('tan');
};

export const WAVES = {
  // 画面端から弧を描いて横切る
  swoop(g, {side = 1, y = 50, n = 7, gap = 11, color = 'gold', shots = 3}) {
    for (let i = 0; i < n; i++) g.after(i * gap + 1, () => {
      wisp(g, side > 0 ? -12 : W + 12, y, {vx: side * 2.4, vy: .1, color, fn: e => {
        e.vy += .017; e.vx *= .998;
        if (e.age === 42 || (g.diff === 2 && e.age === 84)) aimedBurst(g, e, g.dv(1, shots, shots + 2), .42, g.dv(2.2, 2.6, 3), 'pellet', color);
      }});
    });
  },
  // 上から降りて左右に散る
  column(g, {x = W / 2, n = 8, gap = 14, color = 'cyan'}) {
    for (let i = 0; i < n; i++) g.after(i * gap + 1, () => {
      const s = i % 2 ? 1 : -1;
      wisp(g, x, -12, {vy: 2.5, color, fn: e => {
        if (e.age > 28) { e.vx += s * .06; e.vy *= .984; }
        if (e.age === 34) aimedBurst(g, e, g.dv(1, 3, 5), .5, g.dv(2.4, 2.8, 3.2), 'rice', color);
      }});
    });
  },
  // ばらばらに降ってくる
  rain(g, {n = 12, gap = 16, color = 'blue'}) {
    for (let i = 0; i < n; i++) g.after(i * gap + 1, () => {
      const x = g.rr(30, W - 30);
      wisp(g, x, -12, {vy: 1.5, color, fn: e => {
        if (e.age % g.dv(90, 60, 42) === 30) aimedBurst(g, e, 1, 0, g.dv(1.8, 2.2, 2.6), 'orb', color);
      }});
    });
  },
  // 灯籠のような中型機。止まって輪を撃つ
  lanterns(g, {xs = [120, 264], color = 'violet', stay = 200, ring = 12}) {
    xs.forEach((x, idx) => g.after(1 + idx * 12, () => g.enemy({x, y: -24, hp: 170, r: 15, kind: 'lantern', color, score: 3000,
      drops: ['power', 'power', 'point', 'point', 'point'], fn: e => {
        if (e.age < 50) e.vy = 2.8 * (1 - e.age / 50);
        else if (e.age < 50 + stay) {
          e.vy = 0; const k = e.age - 50;
          if (k % g.dv(52, 38, 30) === 0) { g.ring(e.x, e.y, g.dv(ring - 4, ring, ring + 6), g.dv(1.5, 1.8, 2.1), g.rand() * TAU, 'rice', color); g.sfx('tan'); }
        } else e.vy -= .05;
      }})));
  },
  // 大型機。らせんを描いてから去る
  grand(g, {x = W / 2, color = 'gold', stay = 320, color2 = 'white'}) {
    g.enemy({x, y: -30, hp: 800, r: 22, kind: 'grand', color, score: 20000,
      drops: ['bigPower', 'point', 'point', 'point', 'point', 'point', 'point', 'point', 'point'], fn: e => {
        if (e.age < 70) e.vy = 2.4 * (1 - e.age / 70);
        else if (e.age < 70 + stay) {
          e.vy = 0; const k = e.age - 70;
          if (k % g.dv(7, 5, 4) === 0) {
            for (let i = 0; i < 3; i++) g.shot(e.x, e.y, g.dv(1.7, 2, 2.3), k * .071 + i * TAU / 3, 'orb', color);
            g.sfx('tan');
          }
          if (k % 60 === 30) g.fan(e.x, e.y, g.dv(3, 5, 7), .7, 2.8, g.aim(e.x, e.y), 'shard', color2);
        } else e.vy -= .04;
      }});
  },
};

// ================= 弾の振る舞い =================
function gearTooth(b) {
  const d = b.d, k = b.age;
  if (k > d.rel) return;
  b.manual = true;
  const R = d.R * Math.min(1, k / 24), th = d.th + d.w * k;
  b.x = d.cx + d.vx * k + Math.cos(th) * R; b.y = d.cy + d.vy * k + Math.sin(th) * R;
  if (k === d.rel) {
    b.manual = false; b.angle = th + Math.sign(d.w) * Math.PI / 2;
    b.speed = d.sp * .6; b.accel = .02; b.max = d.sp * 1.6; b.fn = null;
  }
}
function clockHand(b, g) {
  const k = g.atk ? g.atk.t % 60 : 30;
  if (k < 14) { if (!b.d.frozen) { b.d.frozen = true; b.d.sp = b.speed; } b.speed = 0; }
  else if (b.d.frozen) {
    // チク・タクと左右交互に向きを変え、全体としては外へ進む
    b.d.frozen = false; b.speed = b.d.sp; b.angle += b.d.turn; b.d.turn = -b.d.turn;
  }
}
function prism(b, g) {
  if (b.age !== b.d.split) return;
  b.dead = true; g.emit('prism', {x: b.x, y: b.y}); g.sfx('split');
  const sp = g.dv(.16, .14, .12);
  for (let k = 0; k < 7; k++) g.shot(b.x, b.y, .6, b.angle + (k - 3) * sp, 'rice', RAINBOW[k], {accel: .03, max: g.dv(2.4, 2.8, 3.2)});
  if (g.diff >= 1) for (let k = 0; k < 7; k++) g.shot(b.x, b.y, .5, b.angle + Math.PI + (k - 3) * sp * 1.5, 'pellet', RAINBOW[k], {accel: .02, max: 1.8});
}
function orbit(b, g) {
  const d = b.d;
  if (b.age < d.bound) {
    const dx = d.cx - b.x, dy = d.cy - b.y, d2 = dx * dx + dy * dy + 120, a = d.GM / d2, inv = 1 / Math.sqrt(d2);
    b.vx += dx * inv * a; b.vy += dy * inv * a;
  } else {
    const sp = Math.hypot(b.vx, b.vy) || 1, ns = clamp(sp, 1.2, g.dv(2.2, 2.6, 3));
    b.vx *= ns / sp; b.vy *= ns / sp; b.fn = null; g.emit('release', {x: b.x, y: b.y});
  }
}
function meteor(b, g) {
  if (b.age % b.d.every === 0 && b.y > 0 && b.y < H - 20)
    g.shot(b.x, b.y, g.rr(.4, .8), Math.PI / 2 + g.rr(-.35, .35), 'pellet', g.rand() < .5 ? 'cyan' : 'white', {accel: .008, max: 1.3});
}
function sphere(b) {
  const d = b.d; b.manual = true; d.r += d.vr; d.th += d.w;
  b.x = d.cx + Math.cos(d.th) * d.r; b.y = d.cy + Math.sin(d.th) * d.r;
}
function galaxy(b, g) {
  if (b.age === b.d.at) { b.accel = .018; b.max = g.dv(2, 2.3, 2.6); b.min = -99; b.curve = b.d.c; }
  if (b.age === b.d.at + 90) b.curve = 0;
}
function meteors(g, n, dir, speed) {
  for (let i = 0; i < n; i++) {
    const x = g.rr(20, W - 20);
    g.shot(x - dir * 40, -14, speed, Math.PI / 2 - dir * .42, 'star', 'white', {scale: 1.4, keep: 60, fn: meteor, d: {every: g.dv(10, 9, 8)}});
  }
  g.sfx('meteor');
}

// ================= ボスの攻撃 =================
export const ATTACKS = {
  // ---- クレメンタイン ----
  c_n1: {boss: 0, name: 'Brass Overture', ja: '真鍮の序曲', hp: 4200, time: 35,
    init: g => g.moveBoss(W / 2, 100, 40),
    update(g, b, t) {
      if (t < 30) return;
      const iv = g.dv(14, 10, 8);
      if (t % iv === 0) {
        const n = g.dv(8, 10, 12), a = t * .019;
        g.ring(b.x, b.y, n, 1.9, a, 'rice', 'gold');
        g.ring(b.x, b.y, n, 1.9, -a + Math.PI / n, 'rice', 'cyan');
        g.sfx('tan');
      }
      if (t % 120 === 60) g.fan(b.x, b.y, g.dv(3, 5, 7), g.dv(.5, .6, .7), 3.2, g.aim(b.x, b.y), 'orb', 'red');
      if (t % 180 === 150) g.wander(60, 50);
    }},
  c_s1: {boss: 0, spell: true, name: 'Gear Aria "Tourbillon"', ja: '歯車譜「トゥールビヨン」', hp: 7800, time: 50,
    init: g => g.moveBoss(W / 2, 96, 40),
    update(g, b, t) {
      if (t % g.dv(120, 105, 90) === 20) {
        for (const s of [-1, 1]) {
          const cx = b.x + s * 56, cy = b.y + 14, ang = g.aim(cx, cy) + s * .25, v = .75;
          const vx = Math.cos(ang) * v, vy = Math.sin(ang) * v, w = s * .055, rel = g.dv(100, 95, 90);
          const n = g.dv(10, 13, 16), sp = g.dv(1.4, 1.6, 1.8);
          for (let i = 0; i < n; i++) g.shot(cx, cy, 0, 0, 'gear', 'gold', {fn: gearTooth, d: {cx, cy, vx, vy, th: i * TAU / n, R: 34, w, rel, sp}});
          const m = g.dv(0, 5, 7);
          for (let i = 0; i < m; i++) g.shot(cx, cy, 0, 0, 'pellet', 'cyan', {fn: gearTooth, d: {cx, cy, vx, vy, th: i * TAU / m, R: 15, w: -w * 1.6, rel: rel + 10, sp: sp * .85}});
        }
        g.sfx('gear');
      }
      if (t > 30 && t % g.dv(80, 60, 45) === 0) { g.fan(b.x, b.y, g.dv(1, 3, 3), .45, 2.4, g.aim(b.x, b.y), 'star', 'white'); g.sfx('tan'); }
      if (t % 240 === 200) g.wander(60, 40);
    }},
  c_n2: {boss: 0, name: 'Pendulum Sway', ja: '振り子の揺らぎ', hp: 4600, time: 35,
    init: g => g.moveBoss(W / 2, 92, 40),
    update(g, b, t) {
      if (t < 30) return;
      const sw = Math.sin((t - 30) * TAU / g.dv(190, 170, 150));
      if (t % 36 < g.dv(18, 21, 24) && t % g.dv(4, 3, 3) === 0) {
        for (const s of [-1, 1]) g.shot(b.x + s * 8, b.y + 6, g.dv(2.4, 2.7, 3), Math.PI / 2 + s * (.62 + .52 * sw), 'rice', s < 0 ? 'orange' : 'cyan');
        g.sfx('tan');
      }
      if (t % g.dv(100, 80, 64) === 50) g.ring(b.x, b.y, g.dv(12, 16, 20), 1.4, g.rand() * TAU, 'orb', 'blue');
      if (t % 90 === 20) g.fan(b.x, b.y, 3, .3, 3, g.aim(b.x, b.y), 'shard', 'red');
    }},
  c_s2: {boss: 0, spell: true, name: 'Clock Aria "Midnight Chime"', ja: '時計譜「真夜中の鐘」', hp: 8500, time: 55,
    init: g => g.moveBoss(W / 2, 110, 40),
    update(g, b, t) {
      const k = t % 60, tick = Math.floor(t / 60), iv = g.dv(12, 10, 8);
      if (k === 0) { g.sfx(tick % 6 === 5 ? 'chime' : 'tick'); g.emit('tick', {n: tick}); }
      if (k === 0 && tick % 6 === 5) g.ring(b.x, b.y, g.dv(8, 10, 12), 1.3, g.rand() * TAU, 'big', 'gold', {fn: clockHand, d: {turn: 0}});
      if (k >= 18 && (k - 18) % iv === 0) {
        const par = ((k - 18) / iv) % 2;
        g.ring(b.x, b.y, g.dv(12, 15, 18), g.dv(1.7, 1.9, 2.1), tick * .21 + k * .013, 'rice', par ? 'white' : 'gold',
          {fn: clockHand, d: {turn: (par ? 1 : -1) * Math.PI / 6}});
        g.sfx('tan');
      }
    }},

  // ---- アイリス ----
  i_n1: {boss: 1, name: 'Chromatic Prelude', ja: '半音階の前奏曲', hp: 6000, time: 35,
    init: g => g.moveBoss(W / 2, 100, 40),
    update(g, b, t) {
      if (t < 30) return;
      const iv = g.dv(6, 4, 3);
      if (t % iv === 0) {
        const e = Math.floor(t / iv);
        for (let i = 0; i < 5; i++) g.shot(b.x, b.y, g.dv(2, 2.3, 2.5), t * .034 + i * TAU / 5, 'orb', RAINBOW[(Math.floor(e / 2) + i) % 7]);
        g.sfx('tan');
      }
      if (t % g.dv(16, 12, 9) === 0) for (let i = 0; i < 5; i++) g.shot(b.x, b.y, 1.4, -t * .027 + i * TAU / 5 + .3, 'pellet', 'white');
      if (t % 200 === 170) g.wander(60, 50);
    }},
  i_s1: {boss: 1, spell: true, name: 'Glass Aria "Rose Window"', ja: '硝子譜「ローズウィンドウ」', hp: 11000, time: 50,
    init: g => g.moveBoss(W / 2, 110, 40),
    update(g, b, t) {
      const P = g.dv(120, 100, 85);
      if (t % P === 15) {
        const w = Math.floor(t / P), p = [5, 7, 6, 8][w % 4], N = g.dv(100, 140, 176), rot = g.rand() * TAU, dir = w % 2 ? 1 : -1;
        for (let i = 0; i < N; i++) {
          const th = i / N * TAU, r = Math.abs(Math.cos(p * th / 2)), petal = Math.round(th * p / TAU) % p;
          g.shot(b.x, b.y, .85 + 1.75 * r, th + rot, r > .55 ? 'rice' : 'orb', RAINBOW[petal % 7], {curve: dir * .0022});
        }
        g.sfx('bloom');
      }
      if (t % P === Math.floor(P / 2) + 15) { g.fan(b.x, b.y, g.dv(3, 3, 5), .3, g.dv(2.6, 3, 3.3), g.aim(b.x, b.y), 'shard', 'white'); g.sfx('tan'); }
      if (t % (P * 2) === P + 60) g.wander(50, 40);
    }},
  i_n2: {boss: 1, name: 'Cathedral Beams', ja: '聖堂の光条', hp: 6500, time: 35,
    init: g => g.moveBoss(W / 2, 96, 40),
    update(g, b, t) {
      if (t < 20) return;
      const C = 200, k = (t - 20) % C;
      if (k === 0) {
        const n = g.dv(4, 5, 6), base = g.aim(b.x, b.y) + Math.PI / n, dir = Math.floor((t - 20) / C) % 2 ? 1 : -1;
        for (let i = 0; i < n; i++) g.laser(b.x, b.y, base + i * TAU / n, {warn: 50, life: 110, w: 14, activeCurve: dir * g.dv(.0035, .0042, .0045), color: RAINBOW[(i * 2) % 7]});
      }
      if (t % g.dv(26, 20, 15) === 0) { g.ring(b.x, b.y, g.dv(10, 14, 18), 1.5, t * .05, 'pellet', RAINBOW[Math.floor(t / 20) % 7]); g.sfx('tan'); }
    }},
  i_s2: {boss: 1, spell: true, name: 'Prism Aria "Spectral Dispersion"', ja: '分光譜「七色の分散」', hp: 12000, time: 55,
    init: g => g.moveBoss(W / 2, 100, 40),
    update(g, b, t) {
      if (t > 20 && t % g.dv(46, 36, 28) === 0) {
        g.shot(b.x, b.y, 3, g.aim(b.x, b.y) + g.rr(-.8, .8), 'big', 'white', {accel: -.045, min: .5, fn: prism, d: {split: g.dv(60, 62, 64)}});
        g.sfx('tan');
      }
      if (t % g.dv(90, 75, 60) === 40) g.ring(b.x, b.y, g.dv(10, 14, 18), 1.3, g.rand() * TAU, 'shard', 'white');
      if (t % 180 === 120) g.wander(60, 50);
    }},

  // ---- セレネ ----
  s_n1: {boss: 2, name: 'Celestial Mechanics', ja: '天体力学', hp: 7500, time: 35,
    init: g => g.moveBoss(W / 2, 104, 40),
    update(g, b, t) {
      b.familiars.length = 0;
      const iv = g.dv(9, 7, 5), sp = g.dv(1.6, 1.9, 2.1);
      for (let k = 0; k < 3; k++) {
        const ph = t * .018 + k * TAU / 3, fx = b.x + Math.cos(ph) * 64, fy = b.y + Math.sin(ph) * 45, col = ['blue', 'violet', 'gold'][k];
        b.familiars.push({x: fx, y: fy, color: col});
        if (t > 40 && t % iv === k * 2) {
          const a = t * .047 * (k % 2 ? 1 : -1) + k;
          g.shot(fx, fy, sp, a, 'orb', col); g.shot(fx, fy, sp, a + Math.PI, 'orb', col);
        }
      }
      if (t > 40 && t % 9 === 0) g.sfx('tan');
      if (t % 240 === 200) g.wander(60, 40);
    }},
  s_s1: {boss: 2, spell: true, name: 'Orbit Aria "Kepler\'s Ellipse"', ja: '軌道譜「ケプラーの楕円」', hp: 13500, time: 55,
    init: g => g.moveBoss(W / 2, 110, 40),
    update(g, b, t) {
      const P = g.dv(105, 90, 76);
      if (t % P === 10) {
        const w = Math.floor(t / P), dir = w % 2 ? 1 : -1, N = g.dv(15, 21, 27), r0 = 38, GM = 300, cx = b.x, cy = b.y, off = g.rand() * TAU;
        for (let i = 0; i < N; i++) {
          const th = off + i * TAU / N, v0 = Math.sqrt(GM / r0) * (.66 + .12 * (i % 3));
          const s = g.shot(cx + Math.cos(th) * r0, cy + Math.sin(th) * r0, 0, 0, 'orb', dir > 0 ? (i % 3 ? 'blue' : 'white') : (i % 3 ? 'violet' : 'white'),
            {fn: orbit, d: {cx, cy, GM, bound: g.dv(160, 150, 140)}});
          if (s) { s.cart = true; s.vx = -Math.sin(th) * v0 * dir; s.vy = Math.cos(th) * v0 * dir; }
        }
        g.sfx('orbit');
      }
      if (t % g.dv(120, 90, 70) === 60) { g.fan(b.x, b.y, 3, .5, 2.2, g.aim(b.x, b.y), 'star', 'gold'); g.sfx('tan'); }
      if (t % (P * 3) === P * 2) g.wander(60, 40);
    }},
  s_n2: {boss: 2, name: 'Pentacle Bloom', ja: '五芒の開花', hp: 7500, time: 35,
    init: g => g.moveBoss(W / 2, 100, 40),
    update(g, b, t) {
      const P = g.dv(64, 52, 44);
      if (t % P === 20) {
        const w = Math.floor(t / P), rot = g.rand() * TAU, m = g.dv(5, 6, 8), sp = g.dv(1.9, 2.2, 2.5), col = w % 2 ? 'gold' : 'blue', dir = w % 2 ? 1 : -1;
        const pts = [];
        for (let i = 0; i < 10; i++) { const R = i % 2 ? .382 : 1, a = rot + i * TAU / 10; pts.push([Math.cos(a) * R, Math.sin(a) * R]); }
        for (let i = 0; i < 10; i++) {
          const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % 10];
          for (let j = 0; j < m; j++) {
            const f = j / m, x = ax + (bx - ax) * f, y = ay + (by - ay) * f, tip = j === 0 && i % 2 === 0;
            g.shot(b.x, b.y, sp * Math.hypot(x, y), Math.atan2(y, x), tip ? 'star' : 'orb', tip ? 'white' : col, {curve: dir * .0035});
          }
        }
        g.sfx('bloom');
      }
      if (t % g.dv(40, 30, 24) === 0) g.fan(b.x, b.y, g.dv(1, 2, 3), .3, 3, g.aim(b.x, b.y), 'pellet', 'white');
      if (t % (P * 3) === P * 2 + 40) g.wander(40, 50);
    }},
  s_s2: {boss: 2, spell: true, name: 'Star Aria "Meteor Waltz"', ja: '星譜「流星のワルツ」', hp: 14000, time: 55,
    init: g => g.moveBoss(W / 2, 100, 40),
    update(g, b, t) {
      if (t < 20) return;
      const tt = t - 20, beat = Math.floor(tt / 24) % 3, bar = Math.floor(tt / 72);
      if (tt % 24 === 0) {
        if (beat === 0) { g.ring(b.x, b.y, g.dv(16, 22, 28), 1.7, bar * .17, 'star', 'gold'); g.sfx('tan'); g.emit('beat', {}); }
        else meteors(g, g.dv(1, 2, 3), bar % 2 ? 1 : -1, g.dv(3, 3.3, 3.6));
      }
      if (bar % 4 === 3 && tt % 72 === 36) g.wander(40, 50);
    }},
  s_s3: {boss: 2, spell: true, survival: true, name: 'Sphere Aria "Harmonia Mundi"', ja: '天球譜「ハルモニア・ムンディ」', hp: 1, time: 32,
    init: g => g.moveBoss(W / 2, 120, 40),
    update(g, b, t) {
      const P = g.dv(78, 66, 56);
      if (t % P === 10) {
        const w = Math.floor(t / P), N = g.dv(60, 76, 92), gap = g.dv(7, 6, 6), g1 = Math.floor(g.rand() * N), dir = w % 2 ? 1 : -1;
        const vr = w % 3 === 2 ? 1.55 : 1.25, col = dir > 0 ? 'cyan' : 'gold';
        for (let i = 0; i < N; i++) {
          const d1 = (i - g1 + N) % N, d2 = (i - g1 - Math.floor(N / 2) + N) % N;
          if (d1 < gap || d2 < gap) continue;
          g.shot(b.x, b.y, 0, 0, 'orb', col, {fn: sphere, d: {cx: b.x, cy: b.y, r: 6, th: i * TAU / N, vr, w: dir * g.dv(.0035, .0042, .005)}});
        }
        g.sfx('orbit');
      }
      if (t % 150 === 100) g.shot(b.x, b.y, 1.1, g.aim(b.x, b.y), 'big', 'violet');
    }},
  s_s4: {boss: 2, spell: true, last: true, name: 'Last Aria "Starfall Waltz"', ja: '終曲「星降る円舞曲」', hp: 16000, time: 65,
    init: g => g.moveBoss(W / 2, 110, 40),
    update(g, b, t) {
      if (t < 30) return;
      const iv = g.dv(4, 3, 3), arms = g.dv(3, 3, 4);
      if (t % iv === 0) {
        const e = Math.floor(t / iv);
        for (let i = 0; i < arms; i++) g.shot(b.x, b.y, 3.8, t * .052 + i * TAU / arms, 'orb', GALAXY[(e >> 2) % GALAXY.length],
          {accel: -.07, min: .7, fn: galaxy, d: {at: 40, c: (i % 2 ? 1 : -1) * .0045}});
        g.sfx('tan');
      }
      if (t % 72 === 0) { g.ring(b.x, b.y, g.dv(6, 8, 10), 1.05, t * .01, 'big', 'gold'); g.sfx('chime'); }
      if (t % 144 === 108) meteors(g, g.dv(1, 2, 2), Math.floor(t / 144) % 2 ? 1 : -1, 3.2);
      if (t % 360 === 300) g.wander(60, 40);
    }},
};
for (const [id, a] of Object.entries(ATTACKS)) a.id = id;
export const SPELL_IDS = Object.keys(ATTACKS).filter(id => ATTACKS[id].spell);
export const DEMO_ATTACKS = ['c_s1', 'i_s1', 's_s1', 'c_s2', 'i_s2', 's_s4', 's_s3', 's_n2'];

// ================= ボス =================
export const BOSSES = [
  {id: 'clementine', name: 'CLEMENTINE', ja: 'クレメンタイン', title: '時計仕掛けの踊り子', color: '#ffc35a', stage: 0, music: 'boss1',
    attacks: ['c_n1', 'c_s1', 'c_n2', 'c_s2'],
    dialogue: [
      {who: 'nova', text: '歯車の庭がこんなに騒がしいなんて。星を落としているのは、あなた？'},
      {who: 'boss', text: 'カチ、コチ。ワタシは時を刻むだけ。……でも今夜は、刻みすぎてしまうの。', music: true},
      {who: 'nova', text: 'じゃあ少しだけ、針を止めさせてもらうね。'},
      {who: 'boss', text: '踊りましょう。一拍ずつ、正確に！'},
    ]},
  {id: 'iris', name: 'IRIS VITRAIL', ja: 'アイリス・ヴィトレイユ', title: '薔薇窓の精', color: '#ff79d8', stage: 1, music: 'boss2',
    attacks: ['i_n1', 'i_s1', 'i_n2', 'i_s2'],
    dialogue: [
      {who: 'boss', text: 'ようこそ、光の聖堂へ。あなたの影、とても綺麗な色をしているわ。', music: true},
      {who: 'nova', text: '影に色なんてないよ。'},
      {who: 'boss', text: 'ここでは、どんな光も七つに分かれるの。……あなたも、ね。'},
      {who: 'nova', text: '分かれる前に、通り抜けてみせる！'},
    ]},
  {id: 'selene', name: 'SELENE ASTRAEA', ja: 'セレネ・アストライア', title: '大天球儀の主', color: '#9ec1ff', stage: 2, music: 'boss3',
    attacks: ['s_n1', 's_s1', 's_n2', 's_s2', 's_s3', 's_s4'],
    dialogue: [
      {who: 'boss', text: '天球の音楽が聞こえるかしら。星々は、私の拍子で廻っているの。'},
      {who: 'nova', text: 'その拍子が狂って、街に星が降ってきてるんだけど。'},
      {who: 'boss', text: '狂ってなどいないわ。これは新しい円舞曲。', music: true},
      {who: 'boss', text: '最後まで踊りきれたら、調律を返してあげる。'},
      {who: 'nova', text: '受けて立つよ。ステップなら、ここまでで全部覚えた！'},
    ]},
];

// ================= ステージ =================
export const STAGES = [
  {id: 'brass', name: 'BRASS GARDEN', ja: '真鍮の歯車庭園', music: 'stage1', boss: 0, roadLen: 2150, waves: [
    [60, 'swoop', {side: 1, y: 50, color: 'gold', shots: 1}],
    [300, 'swoop', {side: -1, y: 70, color: 'gold', shots: 1}],
    [540, 'lanterns', {xs: [120, 264], color: 'orange'}],
    [860, 'column', {x: W / 2, color: 'cyan'}],
    [1060, 'swoop', {side: 1, y: 40, color: 'cyan', n: 8}],
    [1080, 'swoop', {side: -1, y: 90, color: 'gold', n: 8}],
    [1300, 'grand', {x: W / 2, color: 'gold'}],
    [1720, 'rain', {n: 10, color: 'orange'}],
    [1780, 'lanterns', {xs: [90, 294], color: 'cyan'}],
  ]},
  {id: 'glass', name: 'ROSE WINDOW NAVE', ja: '薔薇窓の聖堂', music: 'stage2', boss: 1, roadLen: 2300, waves: [
    [60, 'column', {x: 110, color: 'pink'}],
    [200, 'column', {x: 274, color: 'violet'}],
    [420, 'swoop', {side: 1, y: 60, color: 'red', n: 9, gap: 9}],
    [470, 'swoop', {side: -1, y: 100, color: 'blue', n: 9, gap: 9}],
    [720, 'lanterns', {xs: [80, 192, 304], color: 'violet', ring: 14}],
    [1050, 'rain', {n: 16, gap: 12, color: 'cyan'}],
    [1350, 'grand', {x: W / 2, color: 'pink', color2: 'cyan'}],
    [1760, 'swoop', {side: 1, y: 40, color: 'yellow', n: 10, gap: 8}],
    [1790, 'swoop', {side: -1, y: 80, color: 'green', n: 10, gap: 8}],
    [1950, 'lanterns', {xs: [130, 254], color: 'red', stay: 160}],
  ]},
  {id: 'orrery', name: 'THE GRAND ORRERY', ja: '大天球儀', music: 'stage3', boss: 2, roadLen: 2400, waves: [
    [60, 'rain', {n: 14, gap: 12, color: 'blue'}],
    [330, 'swoop', {side: 1, y: 50, color: 'white', n: 10, gap: 9}],
    [360, 'swoop', {side: -1, y: 90, color: 'blue', n: 10, gap: 9}],
    [640, 'lanterns', {xs: [96, 288], color: 'violet', ring: 16}],
    [820, 'column', {x: W / 2, color: 'cyan', n: 10}],
    [1100, 'grand', {x: 120, color: 'blue', stay: 260}],
    [1160, 'grand', {x: 264, color: 'violet', stay: 220}],
    [1600, 'rain', {n: 18, gap: 10, color: 'white'}],
    [1880, 'lanterns', {xs: [70, 160, 224, 314], color: 'blue', stay: 180}],
    [2100, 'swoop', {side: 1, y: 60, color: 'gold', n: 8}],
  ]},
];
