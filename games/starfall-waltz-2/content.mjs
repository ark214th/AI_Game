// ステージ・ボス・弾幕の定義。g は Game（core.mjs）、b はボス、t は攻撃開始からのフレーム数
import {W, H, TAU, RAINBOW, clamp} from './consts.mjs';

const GALAXY = ['white', 'cyan', 'blue', 'violet', 'pink', 'gold'];
const AURORA = ['green', 'cyan', 'blue', 'violet', 'pink'];
const DOWN = Math.PI / 2;

// ================= 道中の敵 =================
function wisp(g, x, y, o) {
  return g.enemy({x, y, vx: o.vx || 0, vy: o.vy || 0, hp: o.hp || 15, r: 10, kind: o.kind || 'wisp', color: o.color, score: 500,
    drops: [o.drop || (g.rand() < .55 ? 'power' : 'point')], fn: o.fn});
}
const onScreen = e => e.y > 0 && e.y < H * .7 && e.x > 0 && e.x < W;
const aimedBurst = (g, e, n, spread, speed, type, color) => {
  if (!onScreen(e)) return;
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
  // V字の編隊でまっすぐ降り、左右へ開く
  vee(g, {x = W / 2, n = 7, color = 'green'}) {
    for (let i = 0; i < n; i++) {
      const k = i - (n - 1) / 2;
      g.after(1 + Math.abs(k) * 9, () => wisp(g, x + k * 26, -12, {vy: 2.2, color, fn: e => {
        if (e.age > 50) { e.vx += Math.sign(k || 1) * .05; e.vy *= .99; }
        if (e.age === 44) aimedBurst(g, e, g.dv(1, 1, 3), .3, g.dv(2.2, 2.7, 3.1), 'petal', color);
      }}));
    }
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
  // クラゲ。ゆらゆら漂いながら雫を落とす
  jellies(g, {xs = [80, 192, 304], color = 'cyan', gap = 26}) {
    xs.forEach((x, idx) => g.after(1 + idx * gap, () => g.enemy({x, y: -18, hp: 46, r: 12, kind: 'jelly', color, score: 1200,
      drops: ['power', 'point'], fn: e => {
        e.vy = .75 + .45 * Math.sin(e.age * .07); e.vx = Math.sin(e.age * .03 + idx * 2) * .8;
        if (e.age % g.dv(80, 60, 46) === 40 && onScreen(e)) { g.fan(e.x, e.y + 6, g.dv(2, 3, 5), g.dv(.5, .7, .9), g.dv(1.7, 2, 2.3), DOWN, 'drop', color); g.sfx('tan'); }
      }})));
  },
  // 本。横から滑り込み、開いて羽根ペンを放ち、飛び去る
  books(g, {side = 1, y = 70, n = 5, color = 'gold'}) {
    for (let i = 0; i < n; i++) g.after(1 + i * 12, () => {
      const tx = side > 0 ? 50 + i * 56 : W - 50 - i * 56;
      g.enemy({x: side > 0 ? -16 : W + 16, y: y + i * 8, hp: 34, r: 11, kind: 'book', color, score: 900, drops: [i % 2 ? 'power' : 'point'], fn: e => {
        if (e.age < 46) e.x += (tx - e.x) * .09;
        else if (e.age === 60 || (g.diff > 0 && e.age === 96)) aimedBurst(g, e, g.dv(2, 3, 3), .28, g.dv(2.5, 3, 3.4), 'quill', color);
        else if (e.age > 120) { e.vy -= .05; e.vx += side * .03; }
      }});
    });
  },
  // 影。少し溜めてから、こちらへまっすぐ飛び込んでくる
  shades(g, {n = 6, gap = 22, color = 'violet'}) {
    for (let i = 0; i < n; i++) g.after(1 + i * gap, () => {
      const x = g.rr(40, W - 40);
      g.enemy({x, y: -14, hp: 20, r: 10, kind: 'shade', color, score: 800, drops: [g.rand() < .5 ? 'power' : 'point'], fn: e => {
        if (e.age < 30) e.vy = 2.2 * (1 - e.age / 30);
        else if (e.age === 46) { const a = g.aim(e.x, e.y), sp = g.dv(3.6, 4.4, 5); e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp; g.sfx('dash'); }
        else if (e.age > 46 && e.age % g.dv(99, 14, 9) === 0 && e.y < H * .6) g.shot(e.x, e.y, .3, g.rand() * TAU, 'pellet', color, {accel: .012, max: 1.4});
      }});
    });
  },
  // 灯籠のような中型機。止まって輪を撃つ
  lanterns(g, {xs = [120, 264], color = 'violet', stay = 200, ring = 12, type = 'rice'}) {
    xs.forEach((x, idx) => g.after(1 + idx * 12, () => g.enemy({x, y: -24, hp: 170, r: 15, kind: 'lantern', color, score: 3000,
      drops: ['power', 'power', 'point', 'point', 'point'], fn: e => {
        if (e.age < 50) e.vy = 2.8 * (1 - e.age / 50);
        else if (e.age < 50 + stay) {
          e.vy = 0; const k = e.age - 50;
          if (k % g.dv(52, 38, 30) === 0) { g.ring(e.x, e.y, g.dv(ring - 4, ring, ring + 6), g.dv(1.5, 1.8, 2.1), g.rand() * TAU, type, color); g.sfx('tan'); }
        } else e.vy -= .05;
      }})));
  },
  // 大型機。らせんを描いてから去る
  grand(g, {x = W / 2, color = 'gold', stay = 320, color2 = 'white', type = 'orb'}) {
    g.enemy({x, y: -30, hp: 800, r: 22, kind: 'grand', color, score: 20000,
      drops: ['bigPower', 'point', 'point', 'point', 'point', 'point', 'point', 'point', 'point'], fn: e => {
        if (e.age < 70) e.vy = 2.4 * (1 - e.age / 70);
        else if (e.age < 70 + stay) {
          e.vy = 0; const k = e.age - 70;
          if (k % g.dv(7, 5, 4) === 0) {
            for (let i = 0; i < 3; i++) g.shot(e.x, e.y, g.dv(1.7, 2, 2.3), k * .071 + i * TAU / 3, type, color);
            g.sfx('tan');
          }
          if (k % 60 === 30) g.fan(e.x, e.y, g.dv(3, 5, 7), .7, 2.8, g.aim(e.x, e.y), 'shard', color2);
        } else e.vy -= .04;
      }});
  },
};

// ================= 弾の振る舞い =================
// 揺れる幕：縦に降りながら、高さに応じて横へ波打つ
function curtain(b, g) {
  const d = b.d; b.manual = true; d.y += d.vy;
  b.y = d.y; b.x = d.x0 + Math.sin(d.y * .021 + (g.atk ? g.atk.t : 0) * d.w) * d.A;
}
// リボン：進みながら左右にうねる
function ribbon(b) { b.curve = b.d.a * Math.cos(b.age * b.d.w + b.d.ph); }
// 泡：しばらく漂ってから弾けて雫の輪になる
function bubblePop(b, g) {
  if (b.age !== b.d.pop) return;
  b.dead = true; g.emit('pop', {x: b.x, y: b.y}); g.sfx('pop');
  const n = g.thin(g.dv(6, 8, 10)), a0 = g.rand() * TAU;
  for (let i = 0; i < n; i++) g.shot(b.x, b.y, .5, a0 + i * TAU / n, 'drop', i % 2 ? 'cyan' : 'white', {accel: .025, max: g.dv(1.7, 2, 2.3)});
}
// 潮の満ち引き：すべての弾の速さが呼吸する
function tide(b, g) { b.speed = b.d.sp * (1 + .62 * Math.sin((g.atk ? g.atk.t : 0) * TAU / 150 + b.d.ph)); }
// 噴水：放物線を描いて落ち、潮の向きで横へ流される
function fountain(b, g) {
  const k = g.speedMul, t = g.atk ? g.atk.t : 0;
  b.vy = Math.min(b.vy + .034 * k, b.d.cap); b.vx += Math.sin(t * TAU / 400) * .009 * k;
}
// 渦：外から中心へ巻き込まれていく
function whirl(b) {
  const d = b.d; b.manual = true; d.r -= d.vr; d.th += d.w;
  b.x = d.cx + Math.cos(d.th) * d.r; b.y = d.cy + Math.sin(d.th) * d.r;
  if (d.r < 16) b.dead = true;
}
// 通路：横へ進み、決まった列で下へ折れる
function aisle(b) { if (b.age === b.d.turn) { b.angle = DOWN; b.speed = b.d.sp; } }
// 彗星：太陽（ボス）を焦点にした楕円を、近いほど速く回る。尾は太陽の反対へ伸びる
function comet(b, g) {
  const d = b.d; b.manual = true;
  const r = d.p / (1 + d.e * Math.cos(d.th - DOWN));
  d.th += d.dir * d.L / (r * r);
  const r2 = d.p / (1 + d.e * Math.cos(d.th - DOWN));
  b.x = d.cx + Math.cos(d.th) * r2; b.y = d.cy + Math.sin(d.th) * r2;
  if (Math.abs(d.th - DOWN) > d.span) { b.dead = true; return; }
  if (b.x < -10 || b.x > W + 10 || b.y < -10 || b.y > H) return;
  // 太陽に近いほど、尾は濃くなる
  const n = r2 < 95 ? d.rate : r2 < 180 ? 1 : b.age % 3 === 0 ? 1 : 0;
  for (let i = 0; i < n; i++) {
    const a = Math.atan2(b.y - d.cy, b.x - d.cx) + g.rr(-.3, .3);
    g.shot(b.x, b.y, g.rr(.5, .9), a, g.rand() < .5 ? 'pellet' : 'rice', g.rand() < .4 ? 'white' : 'cyan', {accel: .012, max: g.dv(1.5, 1.8, 2.1)});
  }
}
// 壁で一度だけ跳ね返る
function bounce(b) {
  if (b.d.left <= 0) return;
  if ((b.x < 4 && Math.cos(b.angle) < 0) || (b.x > W - 4 && Math.cos(b.angle) > 0)) { b.angle = Math.PI - b.angle; b.d.left--; b.color = 'gold'; }
}
// 重力で楕円軌道を描いてから放たれる（前作「ケプラーの楕円」）
function orbit(b, g) {
  const d = b.d;
  if (b.age < d.bound) {
    const dx = d.cx - b.x, dy = d.cy - b.y, d2 = dx * dx + dy * dy + 120, a = d.GM / d2, inv = 1 / Math.sqrt(d2);
    b.vx += dx * inv * a; b.vy += dy * inv * a;
  } else {
    const sp = Math.hypot(b.vx, b.vy) || 1, ns = clamp(sp, 1.2, g.dv(2.2, 2.6, 3)) * g.speedMul;
    b.vx *= ns / sp; b.vy *= ns / sp; b.fn = null; g.emit('release', {x: b.x, y: b.y});
  }
}
// フェルマータ：小節の終わりで全ての音符が止まり、向きを変えて再開する
function fermata(b, g) {
  const k = g.atk ? g.atk.t % 150 : 0;
  if (k >= 100) { if (!b.d.held) { b.d.held = true; b.d.sp = b.speed; } b.speed = 0; }
  else if (b.d.held) { b.d.held = false; b.speed = b.d.sp; b.angle += b.d.turn; }
}
// タクト：ボスを軸に回る弾の棒
function baton(b, g) {
  const bo = g.boss, a = g.atk; if (!bo || !a) { b.dead = true; return; }
  b.manual = true;
  const ang = a.rod + b.d.side, r = b.d.r * Math.min(1, b.age / 40);
  b.x = bo.x + Math.cos(ang) * r; b.y = bo.y + Math.sin(ang) * r;
}
function spawnRod(g, b) {
  for (const side of [0, Math.PI]) for (let i = 2; i < 20; i++)
    g.shot(b.x, b.y, 0, 0, i % 4 ? 'rice' : 'note', i % 4 ? 'white' : 'pink', {keep: 99999, fn: baton, d: {r: i * 22, side}});
}
function meteor(b, g) {
  if (b.age % b.d.every === 0 && b.y > 0 && b.y < H - 20)
    g.shot(b.x, b.y, g.rr(.4, .8), DOWN + g.rr(-.35, .35), 'pellet', g.rand() < .5 ? 'cyan' : 'white', {accel: .008, max: 1.3});
}
function meteors(g, n, dir, speed) {
  for (let i = 0; i < n; i++) {
    const x = g.rr(20, W - 20);
    g.shot(x - dir * 40, -14, speed, DOWN - dir * .42, 'star', 'white', {scale: 1.4, keep: 60, fn: meteor, d: {every: g.dv(10, 9, 8)}});
  }
  g.sfx('meteor');
}
function sphere(b) {
  const d = b.d; b.manual = true; d.r += d.vr; d.th += d.w;
  b.x = d.cx + Math.cos(d.th) * d.r; b.y = d.cy + Math.sin(d.th) * d.r;
}
function galaxy(b, g) {
  if (b.age === b.d.at) { b.accel = .018 * g.speedMul; b.max = g.dv(2, 2.3, 2.6) * g.speedMul; b.min = -99; b.curve = b.d.c * g.speedMul; }
  if (b.age === b.d.at + 90) b.curve = 0;
}
// ボスの周りを回る使い魔の位置を b.familiars に入れて返す
function familiars(b, n, R, ph, colors, ry = 1) {
  b.familiars.length = 0;
  for (let k = 0; k < n; k++) {
    const a = ph + k * TAU / n;
    b.familiars.push({x: b.x + Math.cos(a) * R, y: b.y + Math.sin(a) * R * ry, color: colors[k % colors.length], a});
  }
  return b.familiars;
}

// ================= ボスの攻撃 =================
export const ATTACKS = {
  // ---- 1面：ルミ・ボレアリス（極光の機織り） ----
  l_m1: {boss: 0, name: 'Loom Shuttle', ja: '杼の往復', hp: 3000, time: 24,
    init: g => g.moveBoss(70, 90, 40),
    update(g, b, t) {
      if (t < 40) return;
      const P = g.dv(150, 130, 110), k = (t - 40) % P;
      if (k === 0) g.moveBoss(b.x < W / 2 ? W - 70 : 70, 84 + g.rr(0, 20), P - 30);
      if (k < P - 30 && t % g.dv(9, 7, 5) === 0) {
        g.shot(b.x, b.y + 8, g.dv(1.7, 2, 2.3), DOWN, 'rice', AURORA[Math.floor(t / 20) % 5]);
        if (g.diff > 0) g.shot(b.x, b.y + 8, 1.2, DOWN + (b.x < W / 2 ? .5 : -.5), 'pellet', 'white');
        g.sfx('tan');
      }
      if (k === P - 16) { g.fan(b.x, b.y, g.dv(5, 7, 9), 1, 2.4, g.aim(b.x, b.y), 'petal', 'pink'); g.sfx('tan'); }
    }},
  l_n1: {boss: 0, name: 'Northern Lights', ja: '北の灯', hp: 4400, time: 35,
    init: g => g.moveBoss(W / 2, 100, 40),
    update(g, b, t) {
      if (t < 30) return;
      const iv = g.dv(15, 11, 9);
      if (t % iv === 0) {
        const n = g.dv(8, 10, 12), a = Math.sin(t * .013) * 1.4;
        g.ring(b.x, b.y, n, 1.9, a, 'petal', 'green');
        g.ring(b.x, b.y, n, 1.6, -a + Math.PI / n, 'petal', 'cyan');
        g.sfx('tan');
      }
      if (t % 110 === 70) { g.fan(b.x, b.y, g.dv(3, 5, 7), g.dv(.5, .6, .7), 3, g.aim(b.x, b.y), 'orb', 'pink'); g.sfx('tan'); }
      if (t % 200 === 160) g.wander(60, 50);
    }},
  l_s1: {boss: 0, spell: true, name: 'Weave Aria "Aurora Curtain"', ja: '織光譜「オーロラ・カーテン」', hp: 7600, time: 50,
    init: g => g.moveBoss(W / 2, 92, 40),
    update(g, b, t) {
      if (t < 30) return;
      const gap = g.density < 1 ? 64 : g.dv(56, 48, 44), cols = Math.ceil(W / gap) + 1, iv = g.dv(8, 7, 6), vy = g.dv(1.25, 1.45, 1.6) * g.speedMul;
      // 幕は「糸」の束。偶数列と奇数列が交互に降りてくる
      if (t % iv === 0) {
        const e = Math.floor(t / iv), on = e % 16;
        for (let j = 0; j < cols; j++) {
          if ((j % 2 ? (on + 8) % 16 : on) >= g.dv(8, 9, 10)) continue;
          g.shot(j * gap, -8, 0, DOWN, 'petal', AURORA[(j + Math.floor(e / 16)) % 5], {keep: 20, fn: curtain, d: {x0: j * gap - 4, y: -8, vy, A: 17, w: .028}});
        }
      }
      if (t % g.dv(120, 90, 70) === 60) { g.fan(b.x, b.y, g.dv(1, 3, 3), .5, 2.1, g.aim(b.x, b.y), 'orb', 'white'); g.sfx('tan'); }
      if (t % 120 === 0) g.sfx('bloom');
      if (t % 260 === 200) g.wander(70, 60);
    }},
  l_n2: {boss: 0, name: 'Warp and Weft', ja: '経糸と緯糸', hp: 4800, time: 35,
    init: g => g.moveBoss(W / 2, 96, 40),
    update(g, b, t) {
      if (t < 30) return;
      const iv = g.dv(7, 5, 4), sp = g.dv(2.1, 2.4, 2.7);
      if (t % iv === 0) {
        const e = Math.floor(t / iv), sw = Math.sin(t * .02) * .22;
        // 斜めに交差する二組の糸
        if (e % 10 < 7) for (const s of [-1, 1]) g.shot(b.x + s * 20, b.y, sp, DOWN + s * (.34 + sw), 'rice', s < 0 ? 'green' : 'violet');
        if ((e + 5) % 10 < 7) for (const s of [-1, 1]) g.shot(b.x + s * 20, b.y, sp, DOWN + s * (.95 + sw), 'rice', s < 0 ? 'cyan' : 'pink');
        g.sfx('tan');
      }
      if (t % g.dv(100, 80, 64) === 50) g.ring(b.x, b.y, g.dv(12, 16, 20), 1.35, g.rand() * TAU, 'orb', 'white');
      if (t % 220 === 180) g.wander(50, 30);
    }},
  l_s2: {boss: 0, spell: true, name: 'Polar Aria "Borealis Ribbon"', ja: '極光譜「ボレアリス・リボン」', hp: 8400, time: 55,
    init: g => g.moveBoss(W / 2, 104, 40),
    update(g, b, t) {
      if (t < 30) return;
      const iv = g.dv(5, 4, 3), arms = g.dv(3, 4, 5);
      if (t % iv === 0) {
        const e = Math.floor(t / iv), col = AURORA[Math.floor(t / 36) % 5];
        for (let i = 0; i < arms; i++) g.shot(b.x, b.y, g.dv(1.7, 1.9, 2.1), t * .011 + i * TAU / arms, 'petal', col,
          {fn: ribbon, d: {a: .02, w: .05, ph: e * .19}});
        g.sfx('tan');
      }
      if (t % g.dv(110, 84, 66) === 40) { g.ring(b.x, b.y, g.dv(8, 12, 16), 1.5, g.rand() * TAU, 'star', 'white'); g.sfx('bloom'); }
      if (t % 300 === 240) g.wander(60, 40);
    }},

  // ---- 2面：マリス・ノクティルカ（潮汐の観測手） ----
  m_m1: {boss: 1, spell: true, name: 'Foam Aria "Sea Foam"', ja: '泡沫譜「シーフォーム」', hp: 5200, time: 32,
    init: g => g.moveBoss(W / 2, 96, 40),
    update(g, b, t) {
      if (t > 20 && t % g.dv(34, 26, 20) === 0) {
        g.shot(b.x, b.y, g.rr(2.4, 3.4), DOWN + g.rr(-1.15, 1.15), 'bubble', 'cyan', {accel: -.045, min: .35, fn: bubblePop, d: {pop: g.dv(84, 80, 76)}});
        g.sfx('bubble');
      }
      if (t % g.dv(140, 110, 90) === 70) { g.fan(b.x, b.y, 3, .36, 2.3, g.aim(b.x, b.y), 'drop', 'white'); g.sfx('tan'); }
      if (t % 200 === 150) g.wander(60, 50);
    }},
  m_n1: {boss: 1, name: 'Ebb and Flow', ja: '干満', hp: 6000, time: 35,
    init: g => g.moveBoss(W / 2, 100, 40),
    update(g, b, t) {
      if (t < 30) return;
      if (t % g.dv(26, 20, 16) === 0) {
        const w = Math.floor(t / 20);
        g.ring(b.x, b.y, g.dv(12, 15, 18), g.dv(1.5, 1.7, 1.9), w * .23, 'drop', w % 2 ? 'blue' : 'cyan', {fn: tide, d: {sp: g.dv(1.5, 1.7, 1.9) * g.speedMul, ph: 0}});
        g.sfx('tan');
      }
      if (t % 150 === 112) { g.fan(b.x, b.y, g.dv(3, 5, 5), .5, 2.8, g.aim(b.x, b.y), 'shard', 'white'); g.sfx('wave'); }
      if (t % 300 === 250) g.wander(60, 40);
    }},
  m_s1: {boss: 1, spell: true, name: 'Tide Aria "Spring Tide"', ja: '潮汐譜「スプリング・タイド」', hp: 10500, time: 52,
    init: g => g.moveBoss(W / 2, 120, 40),
    update(g, b, t) {
      const f = familiars(b, 2, 96, 0, ['cyan', 'blue'], 0);
      if (t < 30) return;
      const cap = g.dv(2.1, 2.4, 2.7) * g.speedMul;
      if (t % g.dv(6, 5, 4) === 0) {
        for (const [i, s] of [[0, f[0]], [1, b], [2, f[1]]]) {
          if (Math.floor(t / 60) % 3 === i && g.diff < 2) continue;
          const a = -DOWN + g.rr(-.62, .62), v = g.rr(2.2, 3.6) * g.speedMul;
          const sh = g.shot(s.x, s.y, 0, 0, 'drop', i === 1 ? 'white' : i ? 'blue' : 'cyan', {keep: 420, fn: fountain, d: {cap}});
          if (sh) { sh.cart = true; sh.vx = Math.cos(a) * v; sh.vy = Math.sin(a) * v; }
        }
        g.sfx('tan');
      }
      if (t % 400 === 0) g.sfx('wave');
      if (t % g.dv(160, 120, 96) === 80) g.shot(b.x, b.y, 1.2, g.aim(b.x, b.y), 'bubble', 'white');
    }},
  m_n2: {boss: 1, name: 'Undertow', ja: '引き波', hp: 6500, time: 35,
    init: g => g.moveBoss(W / 2, 92, 40),
    update(g, b, t) {
      if (t < 30) return;
      const P = g.dv(86, 70, 58);
      if (t % P === 0) {
        // 画面を横切る波。二か所の切れ目を抜ける
        const w = Math.floor(t / P), step = 13, n = Math.ceil(W / step) + 1, hole = g.density < 1 ? 5 : g.dv(4, 3, 3);
        const g1 = Math.floor(g.rr(1, n - hole - 1)), g2 = (g1 + Math.floor(n / 2) + Math.floor(g.rr(-3, 3)) + n) % n, ph = g.rand() * TAU;
        for (let i = 0; i < n; i++) {
          if ((i >= g1 && i < g1 + hole) || (i >= g2 && i < g2 + hole)) continue;
          g.shot(i * step, -10 + Math.sin(i * .42 + ph) * 12, g.dv(1.35, 1.6, 1.85), DOWN, 'drop', w % 2 ? 'cyan' : 'blue', {keep: 40});
        }
        g.sfx('wave');
      }
      if (t % g.dv(60, 44, 34) === 20) { g.fan(b.x, b.y, g.dv(1, 2, 3), .24, 2.6, g.aim(b.x, b.y), 'orb', 'white'); g.sfx('tan'); }
      if (t % 240 === 200) g.wander(60, 60);
    }},
  m_s2: {boss: 1, spell: true, name: 'Noctiluca Aria "Maelstrom"', ja: '夜光譜「ノクティルカの渦」', hp: 11500, time: 55,
    init: g => g.moveBoss(W / 2, 150, 50),
    update(g, b, t) {
      if (t < 50) return;
      const C = 600, k = (t - 50) % C, dir = Math.floor((t - 50) / C) % 2 ? -1 : 1, arms = g.dv(5, 6, 7);
      if (k === 0) g.sfx('whirl');
      // 渦の腕。途切れた所から内側へ抜けられる
      if (k < C - 170 && t % 4 === 0 && k % 64 < g.dv(40, 44, 48)) {
        for (let i = 0; i < arms; i++) g.shot(-99, -99, 0, 0, i % 2 ? 'drop' : 'orb', i % 2 ? 'cyan' : 'blue',
          {keep: 900, fn: whirl, d: {cx: b.x, cy: b.y, r: 330, th: dir * k * .0105 + i * TAU / arms, vr: g.dv(1.1, 1.25, 1.4) * g.speedMul, w: dir * g.dv(.0052, .006, .0068) * g.speedMul}});
      }
      if (t % g.dv(110, 84, 64) === 30) { g.ring(b.x, b.y, g.dv(5, 7, 9), .95, g.rand() * TAU, 'bubble', 'white'); g.sfx('bubble'); }
    }},

  // ---- 3面：ハレー・クイル（彗星の司書） ----
  h_m1: {boss: 2, spell: true, name: 'Index Aria "Call Number"', ja: '索引譜「コール・ナンバー」', hp: 5600, time: 32,
    init: g => g.moveBoss(W / 2, 80, 40),
    update(g, b, t) {
      if (t < 30) return;
      const P = g.dv(100, 84, 70);
      if (t % P === 0) {
        // 棚の通路をなぞるように、横へ走ってから下へ折れる
        const n = g.dv(5, 6, 7), off = g.rr(0, 30), sp = g.dv(1.9, 2.2, 2.5);
        for (let j = 0; j < g.dv(3, 4, 5); j++) g.after(1 + j * 7, () => {
          for (const s of [-1, 1]) for (let i = 0; i < n; i++)
            g.shot(b.x, b.y, 3.4, s > 0 ? 0 : Math.PI, 'quill', i % 2 ? 'gold' : 'white', {fn: aisle, d: {turn: Math.round((18 + off + i * 30) / (3.4 * g.speedMul)), sp: sp * g.speedMul}});
        });
        g.sfx('page');
      }
      if (t % g.dv(70, 54, 42) === 35) { g.fan(b.x, b.y, 3, .3, 2.7, g.aim(b.x, b.y), 'orb', 'cyan'); g.sfx('tan'); }
    }},
  h_n1: {boss: 2, name: 'Periodic Orbit', ja: '周期軌道', hp: 7200, time: 35,
    init: g => g.moveBoss(W / 2, 100, 40),
    update(g, b, t) {
      if (t < 30) return;
      if (t % g.dv(70, 54, 44) === 0) {
        const a = g.aim(b.x, b.y) + g.rr(-.3, .3);
        g.shot(b.x, b.y, g.dv(2.6, 3, 3.3), a, 'comet', 'white', {fn: meteor, d: {every: g.dv(7, 6, 5)}});
        g.sfx('meteor');
      }
      if (t % g.dv(22, 17, 13) === 0) { g.ring(b.x, b.y, g.dv(7, 9, 11), 1.8, t * .037, 'quill', Math.floor(t / 60) % 2 ? 'gold' : 'blue'); g.sfx('tan'); }
      if (t % 210 === 170) g.wander(60, 50);
    }},
  h_s1: {boss: 2, spell: true, name: 'Comet Aria "Halley\'s Tail"', ja: '彗星譜「ハレーズ・テイル」', hp: 12500, time: 52,
    init: g => g.moveBoss(W / 2, 96, 40),
    update(g, b, t) {
      if (t < 20) return;
      const P = g.dv(190, 150, 124);
      if ((t - 20) % P === 0) {
        const dir = Math.floor((t - 20) / P) % 2 ? 1 : -1;
        g.shot(-99, -99, 0, 0, 'comet', 'white', {scale: 1.5, keep: 2000, fn: comet,
          d: {cx: b.x, cy: b.y, p: g.rr(100, 132), e: .8, L: 236 * g.speedMul, th: DOWN - dir * 2.28, dir, span: 2.3, rate: g.dv(1, 2, 2)}});
        g.sfx('meteor');
      }
      if (t % g.dv(96, 72, 56) === 48) { g.fan(b.x, b.y, g.dv(3, 3, 5), .6, 1.9, g.aim(b.x, b.y), 'star', 'gold'); g.sfx('tan'); }
    }},
  h_n2: {boss: 2, name: 'Marginalia', ja: '欄外の書き込み', hp: 7400, time: 35,
    init: g => g.moveBoss(W / 2, 96, 40),
    update(g, b, t) {
      if (t < 30) return;
      const P = g.dv(54, 44, 36);
      if (t % P === 0) {
        const w = Math.floor(t / P), s = w % 2 ? 1 : -1, n = g.dv(5, 7, 9);
        // 壁で跳ね返って戻ってくる羽根ペン
        g.fan(b.x, b.y, n, 1.1, g.dv(2.2, 2.5, 2.8), DOWN + s * 1.02, 'quill', 'white', {fn: bounce, d: {left: 1}});
        g.sfx('page');
      }
      if (t % g.dv(90, 70, 56) === 45) g.ring(b.x, b.y, g.dv(10, 14, 18), 1.4, g.rand() * TAU, 'orb', 'blue');
      if (t % 180 === 140) g.wander(50, 40);
    }},
  h_s2: {boss: 2, spell: true, name: 'Shelf Aria "Library of Babel"', ja: '書架譜「バベルの図書館」', hp: 12000, time: 52,
    init: g => g.moveBoss(W / 2, 84, 40),
    update(g, b, t) {
      if (t < 20) return;
      // 左右から滑ってくる本棚の列。段ごとに向きが逆
      const sp = g.dv(1.05, 1.25, 1.45), slot = Math.round(15 / (sp * g.speedMul)), hole = g.density < 1 ? 5 : g.dv(4, 3, 3);
      if (t % slot === 0) {
        const e = Math.floor(t / slot);
        for (let r = 0; r < 6; r++) {
          if ((e + r * 4) % 10 >= 10 - hole) continue;
          const s = r % 2 ? 1 : -1;
          g.shot(s > 0 ? -8 : W + 8, 152 + r * 48, sp, s > 0 ? 0 : Math.PI, 'rice', ['gold', 'white', 'cyan', 'blue', 'violet', 'pink'][r], {keep: 30});
        }
      }
      if (t % g.dv(110, 86, 68) === 40) { g.shot(b.x, b.y, g.dv(1.9, 2.2, 2.5), g.aim(b.x, b.y), 'comet', 'white'); g.sfx('meteor'); }
      if (t % g.dv(200, 150, 120) === 100) { g.fan(b.x, b.y, g.dv(3, 5, 7), 1.2, 1.6, DOWN, 'quill', 'gold'); g.sfx('page'); }
      if (t % 240 === 200) g.wander(60, 80);
    }},
  h_s3: {boss: 2, spell: true, name: 'Period Aria "The Seventy-Sixth Year"', ja: '周期譜「七十六年目の帰還」', hp: 13000, time: 55,
    init: g => g.moveBoss(W / 2, 150, 50),
    update(g, b, t) {
      if (t < 50) return;
      const P = g.dv(58, 48, 40);
      if (t % P === 0) {
        // 遠ざかり、戻り、通り過ぎてゆく輪
        const w = Math.floor(t / P);
        g.ring(b.x, b.y, g.dv(12, 15, 18), 2.7, w * .31, w % 2 ? 'orb' : 'star', w % 2 ? 'white' : 'gold', {accel: -.03, min: -g.dv(1.7, 2, 2.3), keep: 400});
        g.sfx('orbit');
      }
      if (t % g.dv(150, 116, 92) === 75) { g.shot(b.x, b.y, 2.6, g.aim(b.x, b.y), 'comet', 'cyan', {fn: meteor, d: {every: 7}}); g.sfx('meteor'); }
    }},

  // ---- 4面：セレネ（中ボス）とノクス・エクリプティカ（月蝕の歌姫） ----
  s_m1: {boss: 4, stage: 3, music: 'selene', spell: true, name: 'Orbit Aria "Kepler\'s Ellipse — Da Capo"', ja: '軌道譜「ケプラーの楕円・再演」', hp: 8800, time: 40,
    init: g => g.moveBoss(W / 2, 110, 40),
    update(g, b, t) {
      const P = g.dv(100, 84, 70);
      if (t % P === 10) {
        // 二つの焦点から交互に
        const w = Math.floor(t / P), dir = w % 2 ? 1 : -1, N = g.thin(g.dv(14, 19, 24)), r0 = 36, GM = 300, cx = b.x + dir * 54, cy = b.y, off = g.rand() * TAU;
        for (let i = 0; i < N; i++) {
          const th = off + i * TAU / N, v0 = Math.sqrt(GM / r0) * (.66 + .12 * (i % 3));
          const s = g.shot(cx + Math.cos(th) * r0, cy + Math.sin(th) * r0, 0, 0, i % 3 ? 'orb' : 'crescent', dir > 0 ? (i % 3 ? 'blue' : 'white') : (i % 3 ? 'violet' : 'gold'),
            {fn: orbit, d: {cx, cy, GM, bound: g.dv(160, 150, 140)}});
          if (s) { s.cart = true; s.vx = -Math.sin(th) * v0 * dir; s.vy = Math.cos(th) * v0 * dir; }
        }
        g.sfx('orbit');
      }
      if (t % g.dv(120, 90, 70) === 60) { g.fan(b.x, b.y, 3, .5, 2.2, g.aim(b.x, b.y), 'star', 'gold'); g.sfx('tan'); }
    }},
  x_n1: {boss: 3, name: 'Five Lines', ja: '五線', hp: 7800, time: 35,
    init: g => g.moveBoss(W / 2, 96, 40),
    update(g, b, t) {
      if (t < 30) return;
      const ang = DOWN + Math.sin(t * .0125) * g.dv(.6, .7, .8);
      if (t % 4 === 0) {
        const e = Math.floor(t / 4), nx = Math.cos(ang + DOWN), ny = Math.sin(ang + DOWN);
        for (let i = -2; i <= 2; i++) {
          if ((e + (i + 2) * 2) % 7 >= g.dv(4, 5, 5)) continue;
          g.shot(b.x + nx * i * 19, b.y + ny * i * 19, g.dv(2.3, 2.6, 2.9), ang, 'rice', 'white');
        }
      }
      if (t % g.dv(52, 40, 32) === 0) { g.fan(b.x, b.y, g.dv(2, 3, 4), .9, 1.7, g.aim(b.x, b.y), 'note', Math.floor(t / 52) % 2 ? 'violet' : 'pink'); g.sfx('note'); }
      if (t % 250 === 200) g.wander(60, 40);
    }},
  x_s1: {boss: 3, spell: true, name: 'Rest Aria "Fermata"', ja: '休符譜「フェルマータ」', hp: 13500, time: 55,
    init: g => g.moveBoss(W / 2, 108, 40),
    update(g, b, t) {
      const k = t % 150;
      if (k === 100) { g.sfx('tick'); g.emit('tick', {}); }
      if (k === 0 && t > 0) g.sfx('note');
      if (t > 20 && k < 96 && k % g.dv(24, 19, 15) === 0) {
        const w = Math.floor(t / 15);
        g.ring(b.x, b.y, g.dv(11, 14, 17), g.dv(1.6, 1.8, 2), w * .37, 'note', w % 2 ? 'violet' : 'pink', {fn: fermata, d: {turn: (w % 2 ? 1 : -1) * .55}});
        g.sfx('tan');
      }
      // 止まった音符のあいだを、狙い撃ちが抜けてくる
      if (k > 106 && k < 144 && k % g.dv(12, 9, 7) === 0) { g.fan(b.x, b.y, g.dv(1, 3, 3), .2, g.dv(2.8, 3.2, 3.6), g.aim(b.x, b.y), 'rice', 'white'); g.sfx('tan'); }
      if (t % 300 === 290) g.wander(40, 30);
    }},
  x_n2: {boss: 3, name: 'Chromatic Descent', ja: '半音階の下降', hp: 8200, time: 35,
    init(g, b) { g.moveBoss(W / 2, 110, 40); g.atk.a = 0; g.atk.da = 0; },
    update(g, b, t) {
      if (t < 30) return;
      const a = g.atk, iv = g.dv(5, 4, 3), arms = g.dv(4, 5, 5);
      if (t % iv === 0) {
        // 角速度が少しずつ増え、波と粒の境目のような模様になる
        a.da += .0031 * iv / 3; a.a += a.da;
        const e = Math.floor(t / iv);
        for (let i = 0; i < arms; i++) g.shot(b.x, b.y, g.dv(1.8, 2, 2.2), a.a + i * TAU / arms, 'orb', RAINBOW[(6 - Math.floor(e / 6) % 7)]);
        g.sfx('tan');
      }
      if (t % g.dv(140, 100, 80) === 70) g.fan(b.x, b.y, g.dv(1, 3, 5), .5, 2.7, g.aim(b.x, b.y), 'crescent', 'white');
    }},
  x_s2: {boss: 3, spell: true, name: 'Eclipse Aria "Diamond Ring"', ja: '蝕甚譜「ダイヤモンドリング」', hp: 14000, time: 55,
    init: g => g.moveBoss(W / 2, 124, 40),
    update(g, b, t) {
      const n = 6, f = familiars(b, n, 62 * Math.min(1, t / 40), t * .017, ['white', 'gold']);
      if (t < 50) return;
      if (t % g.dv(8, 6, 5) === 0) {
        for (const s of f) g.shot(s.x, s.y, g.dv(1.7, 1.9, 2.1), s.a + .5, 'shard', s.color);
        g.sfx('tan');
      }
      const k = (t - 50) % 250;
      if (k === 120) {
        // ダイヤモンドの一閃。予告線のあと、太い光が走る
        const a0 = g.aim(b.x, b.y), cv = (g.rand() < .5 ? 1 : -1) * g.dv(.002, .0032, .0042);
        // 予告線の段階から同じ向きに回るので、どちらへ掃くかが先に読める
        g.laser(b.x, b.y, a0, {warn: 56, life: 80, w: 26, curve: cv, activeCurve: cv, color: 'gold'});
        if (g.diff > 0) for (const s of [-1, 1]) g.laser(b.x, b.y, a0 + s * 1.05, {warn: 56, life: 80, w: 12, color: 'white'});
      }
      if (k === 176) { g.ring(b.x, b.y, g.dv(14, 20, 26), 2.2, g.rand() * TAU, 'star', 'gold'); g.sfx('bloom'); }
    }},
  x_n3: {boss: 3, name: 'Baton', ja: 'タクト', hp: 8400, time: 35,
    init(g, b) { g.moveBoss(W / 2, 130, 40); g.atk.rod = 0; spawnRod(g, b); },
    update(g, b, t) {
      if (t < 60) return;
      const a = g.atk, w = g.dv(.0105, .0125, .0145) * g.speedMul;
      a.rod += w * (Math.floor((t - 60) / 640) % 2 ? -1 : 1) * Math.min(1, (t - 60) / 60);
      if (t % 90 === 0 && !g.bullets.some(x => x.fn === baton)) spawnRod(g, b); // ボムで消えた棒は張り直す
      if (t % g.dv(64, 50, 40) === 0) { g.fan(b.x, b.y, g.dv(3, 5, 7), .9, 1.9, g.aim(b.x, b.y), 'orb', 'violet'); g.sfx('tick'); g.emit('tick', {}); }
      if (g.diff === 2 && t % 100 === 50) g.ring(b.x, b.y, 12, 1.3, g.rand() * TAU, 'pellet', 'pink');
    }},
  x_s3: {boss: 3, spell: true, dark: true, name: 'Night Aria "Moonless Nocturne"', ja: '夜想譜「月のない夜のノクターン」', hp: 13000, time: 52,
    init: g => g.moveBoss(W / 2, 100, 40),
    update(g, b, t) {
      if (t < 40) return;
      // 暗がりの中、灯りの届く範囲だけがはっきり見える
      if (t % g.dv(11, 8, 6) === 0) g.shot(g.rr(8, W - 8), -10, g.rr(1.1, g.dv(1.6, 1.9, 2.2)), DOWN + g.rr(-.2, .2), g.rand() < .25 ? 'crescent' : 'star', g.rand() < .5 ? 'white' : 'blue', {keep: 30});
      if (t % g.dv(96, 76, 60) === 0) { g.ring(b.x, b.y, g.dv(10, 14, 18), 1.25, g.rand() * TAU, 'orb', 'violet'); g.sfx('tan'); }
      if (t % g.dv(170, 130, 100) === 85) { g.shot(b.x, b.y, 1.05, g.aim(b.x, b.y), 'big', 'gold'); g.sfx('chime'); }
      if (t % 260 === 200) g.wander(70, 70);
    }},
  x_s4: {boss: 3, spell: true, survival: true, name: 'Totality Aria "Corona"', ja: '皆既譜「コロナ」', hp: 1, time: 34,
    init: g => g.moveBoss(W / 2, 150, 50),
    update(g, b, t) {
      if (t < 50) return;
      const C = 330, k = (t - 50) % C, w = Math.floor((t - 50) / C), dir = w % 2 ? -1 : 1;
      if (k === 0) {
        // コロナの光条。ゆっくり回る
        const n = g.dv(4, 5, 6), base = g.aim(b.x, b.y) + Math.PI / n;
        for (let i = 0; i < n; i++) g.laser(b.x, b.y, base + i * TAU / n, {warn: 64, life: 230, w: 13, activeCurve: dir * g.dv(.003, .0038, .0045) * g.speedMul, color: i % 2 ? 'gold' : 'white'});
      }
      const P = g.dv(74, 62, 52);
      if (t % P === 0) {
        const N = g.dv(60, 70, 80), on = g.density < 1 ? 3 : g.dv(4, 5, 5), off = g.rand() * TAU, d2 = Math.floor(t / P) % 2 ? 1 : -1;
        for (let i = 0; i < N; i++) {
          if (i % 8 >= on) continue;
          g.shot(b.x, b.y, 0, 0, 'orb', d2 > 0 ? 'red' : 'orange', {fn: sphere, d: {cx: b.x, cy: b.y, r: 8, th: off + i * TAU / N, vr: g.dv(1.1, 1.25, 1.4) * g.speedMul, w: d2 * .004 * g.speedMul}});
        }
        g.sfx('orbit');
      }
    }},
  x_s5: {boss: 3, spell: true, last: true, music: 'finale', name: 'Last Aria "Starfall Waltz — Second Night"', ja: '終曲「星降る円舞曲・第二夜」', hp: 21000, time: 80,
    init(g, b) { g.moveBoss(W / 2, 110, 40); g.atk.ph = 0; g.atk.a = 0; g.atk.da = 0; },
    update(g, b, t) {
      if (t < 30) return;
      const a = g.atk, k = b.hp / b.maxHp, ph = k > .66 ? 0 : k > .33 ? 1 : 2;
      if (ph !== a.ph) {
        // 楽章が変わる。弾は星になって降ってくる
        a.ph = ph; a.t0 = t; g.cancelAll(true); g.clearLasers(); g.emit('movement', {n: ph, x: b.x, y: b.y}); g.sfx('bloom');
        g.moveBoss(W / 2, 110, 40); return;
      }
      const tt = t - (a.t0 || 0);
      if (a.t0 && tt < 50) return;
      if (ph === 0) {
        // 第一楽章：三拍子。一拍目に星の輪、二・三拍目に流星
        const beat = Math.floor(tt / 24) % 3, bar = Math.floor(tt / 72);
        if (tt % 24 === 0) {
          if (beat === 0) { g.ring(b.x, b.y, g.dv(16, 22, 28), 1.7, bar * .17, 'star', 'gold'); g.sfx('tan'); g.emit('beat', {}); }
          else meteors(g, g.dv(1, 2, 3), bar % 2 ? 1 : -1, g.dv(3, 3.3, 3.6));
        }
        if (bar % 4 === 3 && tt % 72 === 36) g.wander(40, 50);
      } else if (ph === 1) {
        // 第二楽章：渦を巻く銀河
        const iv = g.dv(4, 3, 3), arms = g.dv(3, 3, 4);
        if (tt % iv === 0) {
          const e = Math.floor(tt / iv);
          for (let i = 0; i < arms; i++) g.shot(b.x, b.y, 3.8, tt * .052 + i * TAU / arms, 'orb', GALAXY[(e >> 2) % GALAXY.length],
            {accel: -.07, min: .7, fn: galaxy, d: {at: 40, c: (i % 2 ? 1 : -1) * .0045}});
          g.sfx('tan');
        }
        if (tt % 72 === 0) { g.ring(b.x, b.y, g.dv(6, 8, 10), 1.05, tt * .01, 'crescent', 'gold', {scale: 1.5}); g.sfx('chime'); g.emit('beat', {}); }
        if (tt % 360 === 300) g.wander(60, 40);
      } else {
        // 終楽章：夜明け。金色の音符が波紋のように広がる
        const iv = g.dv(6, 5, 4), arms = g.dv(4, 5, 6);
        if (tt % iv === 0) {
          a.da += .0026 * iv / 4; a.a += a.da;
          for (let i = 0; i < arms; i++) g.shot(b.x, b.y, g.dv(1.7, 1.9, 2.1), a.a + i * TAU / arms, i % 2 ? 'note' : 'star', i % 2 ? 'gold' : 'white');
          g.sfx('tan');
        }
        if (tt % 72 === 0) g.emit('beat', {});
        if (tt % 144 === 72) meteors(g, g.dv(1, 2, 2), Math.floor(tt / 144) % 2 ? 1 : -1, 3.1);
      }
    }},
};
for (const [id, a] of Object.entries(ATTACKS)) a.id = id;
export const SPELL_IDS = Object.keys(ATTACKS).filter(id => ATTACKS[id].spell);
export const DEMO_ATTACKS = ['l_s2', 'm_s1', 'h_s1', 'x_n2', 'l_s1', 'm_s2', 'h_s3', 'x_s1', 's_m1', 'x_s5'];

// ================= ボス =================
// 会話：who は 'p'（自機）か 'boss'。text は文字列、または自機ごとの {nova, clem}。face は表情
export const BOSSES = [
  {id: 'lumi', name: 'LUMI BOREALIS', ja: 'ルミ・ボレアリス', title: '極光の機織り', color: '#6df0c0', stage: 0, music: 'boss1',
    attacks: ['l_n1', 'l_s1', 'l_n2', 'l_s2'],
    dialogue: [
      {who: 'p', face: 'normal', text: {nova: 'きれいなオーロラ。……なのに、風の音も、氷の鳴る音もしない。', clem: 'カチ、コチ。……ワタシの秒針の音しか聞こえません。この空、静かすぎます。'}},
      {who: 'boss', face: 'smile', text: 'しーっ。織っている途中なの。音を立てると、糸がほつれてしまう。', music: true},
      {who: 'p', face: 'surprise', text: {nova: '音を、織ってるの？', clem: '音を糸に？ 規格外の織機ですね。'}},
      {who: 'boss', face: 'normal', text: '月が欠けてから、夜の音がどんどん抜けていくの。だから残った音を、光の幕にしまっているのよ。'},
      {who: 'p', face: 'angry', text: {nova: 'しまい込んだら、誰にも聞こえないよ。ほどかせてもらうね！', clem: 'しまった音は、鳴らなければ錆びます。ワタシが保証します。'}},
    ]},
  {id: 'maris', name: 'MARIS NOCTILUCA', ja: 'マリス・ノクティルカ', title: '潮汐の観測手', color: '#6aa8ff', stage: 1, music: 'boss2',
    attacks: ['m_n1', 'm_s1', 'm_n2', 'm_s2'],
    dialogue: [
      {who: 'boss', face: 'normal', text: '記録、三十二夜目。干潮のまま。波音、なし。……あら、観測の邪魔よ。'},
      {who: 'p', face: 'normal', text: {nova: '海が止まってる。月がないと、潮も動かないんだ。', clem: '潮の満ち引きは、月の振り子。振り子が止まれば、海も止まる。道理です。'}},
      {who: 'boss', face: 'angry', text: 'だから私が代わりに引いているの。この腕で、毎晩、海をまるごと。', music: true},
      {who: 'p', face: 'surprise', text: {nova: '腕で！？', clem: '……出力の桁がおかしいです。'}},
      {who: 'boss', face: 'smile', text: 'ちょうどいいわ。あなたで、今夜の満潮を試させて。'},
    ]},
  {id: 'halley', name: 'HALLEY QUILL', ja: 'ハレー・クイル', title: '彗星の司書', color: '#ffe08a', stage: 2, music: 'boss3',
    attacks: ['h_n1', 'h_s1', 'h_n2', 'h_s2', 'h_s3'],
    dialogue: [
      {who: 'boss', face: 'surprise', text: 'おや、返却かい？ ……違うか。七十六年ぶりに戻ってみれば、月の頁だけが抜き取られていてね。'},
      {who: 'p', face: 'normal', text: {nova: '月を持っていった人を探してるの。知らない？', clem: '貸出記録を見せてください。延滞者に用があります。'}},
      {who: 'boss', face: 'smile', text: '知っているとも。蝕の玉座の歌姫さ。招待状まで預かっている。「今夜、いちばん静かな演奏会へ」。', music: true},
      {who: 'p', face: 'angry', text: {nova: 'それ、ちょうだい！', clem: 'その招待状、ワタシ宛てに書き換えを。'}},
      {who: 'boss', face: 'normal', text: '彗星便は、宛名の主にしか渡せない決まりでね。──追いつけたら、考えよう。'},
    ]},
  {id: 'nox', name: 'NOX ECLIPTICA', ja: 'ノクス・エクリプティカ', title: '月蝕の歌姫', color: '#ff6f9c', stage: 3, music: 'boss4',
    attacks: ['x_n1', 'x_s1', 'x_n2', 'x_s2', 'x_n3', 'x_s3', 'x_s4', 'x_s5'],
    dialogue: [
      {who: 'boss', face: 'normal', text: 'ようこそ。客席はどこも空いているわ。今夜の演目は「静寂」。全四楽章、休憩なし。'},
      {who: 'p', face: 'angry', text: {nova: '月を返して。みんなの夜から、音が消えてるんだよ。', clem: '月を返却してください。世界中の時計が、拍子を見失っています。'}},
      {who: 'boss', face: 'smile', text: '消えたのではないわ。私が預かったの。……ねえ、休符を聴いたことはある？'},
      {who: 'boss', face: 'normal', text: '私は天球の音楽の「休符」。千年歌っても、誰の耳にも届かなかった。だから一晩だけ、世界を私の番にしたの。', music: true},
      {who: 'p', face: 'normal', text: {nova: '……休符は、音があるから休符なんだよ。ひとりきりじゃ、ただの無音だ。', clem: '休符だけの楽譜は、止まった時計と同じです。ワタシは、それがどれほど寂しいか知っています。'}},
      {who: 'boss', face: 'angry', text: 'なら、聴かせて。あなたの音が、私の静寂より美しいかどうか！'},
    ]},
  {id: 'selene', name: 'SELENE ASTRAEA', ja: 'セレネ・アストライア', title: '大天球儀の主', color: '#9ec1ff', stage: 3, music: 'selene', attacks: ['s_m1'], dialogue: null},
];
const SELENE_TALK = [
  {who: 'boss', face: 'smile', text: {nova: '久しぶりね、星の子。次の夜も踊ってくれると、信じていたわ。', clem: 'あら、クレメンタイン。あなたが舞台に立つ側になるなんてね。'}, music: 'selene'},
  {who: 'p', face: 'surprise', text: {nova: 'セレネ！ 月がなくなったのに、どうしてここに？', clem: 'セレネ様。月は……あなたの月は、ご無事ですか。'}},
  {who: 'boss', face: 'normal', text: '月は蝕の向こう。あの子は強いわよ。──だから先に、ステップを確かめさせて。'},
];

// ================= ステージ =================
export const STAGES = [
  {id: 'aurora', name: 'AURORA PROMENADE', ja: '極光の遊歩道', music: 'stage1', boss: 0, roadLen: 2300, mid: {at: 1150, boss: 0, attack: 'l_m1'}, waves: [
    [70, 'swoop', {side: 1, y: 50, color: 'green', shots: 1}],
    [300, 'swoop', {side: -1, y: 70, color: 'cyan', shots: 1}],
    [520, 'vee', {x: W / 2, color: 'green'}],
    [700, 'lanterns', {xs: [120, 264], color: 'pink', type: 'petal'}],
    [960, 'column', {x: 110, color: 'cyan', n: 6}],
    [1040, 'column', {x: 274, color: 'green', n: 6}],
    [1240, 'vee', {x: 110, n: 5, color: 'pink'}],
    [1330, 'vee', {x: 274, n: 5, color: 'violet'}],
    [1500, 'grand', {x: W / 2, color: 'green', color2: 'pink', type: 'petal'}],
    [1920, 'rain', {n: 10, color: 'cyan'}],
    [1980, 'lanterns', {xs: [90, 294], color: 'violet', type: 'petal'}],
  ]},
  {id: 'tide', name: 'TIDEGLASS OBSERVATORY', ja: '潮硝子の天文台', music: 'stage2', boss: 1, roadLen: 2400, mid: {at: 1180, boss: 1, attack: 'm_m1'}, waves: [
    [70, 'jellies', {xs: [80, 192, 304], color: 'cyan'}],
    [280, 'swoop', {side: 1, y: 60, color: 'blue', n: 9, gap: 9}],
    [330, 'swoop', {side: -1, y: 100, color: 'white', n: 9, gap: 9}],
    [600, 'jellies', {xs: [60, 150, 234, 324], color: 'blue', gap: 18}],
    [820, 'column', {x: W / 2, color: 'cyan', n: 10}],
    [1000, 'lanterns', {xs: [120, 264], color: 'blue', type: 'drop', stay: 130}],
    [1260, 'rain', {n: 16, gap: 12, color: 'cyan'}],
    [1500, 'grand', {x: W / 2, color: 'blue', color2: 'cyan', type: 'drop'}],
    [1900, 'jellies', {xs: [100, 284], color: 'pink'}],
    [1960, 'vee', {x: W / 2, color: 'white'}],
    [2140, 'swoop', {side: 1, y: 50, color: 'cyan', n: 8}],
  ]},
  {id: 'archive', name: 'COMET ARCHIVE', ja: '彗星書庫', music: 'stage3', boss: 2, roadLen: 2500, mid: {at: 1200, boss: 2, attack: 'h_m1'}, waves: [
    [70, 'books', {side: 1, y: 60, color: 'gold'}],
    [260, 'books', {side: -1, y: 60, color: 'cyan'}],
    [470, 'rain', {n: 14, gap: 11, color: 'white'}],
    [700, 'lanterns', {xs: [80, 192, 304], color: 'blue', ring: 14, type: 'quill'}],
    [960, 'books', {side: 1, y: 50, n: 6, color: 'white'}],
    [1000, 'books', {side: -1, y: 110, n: 6, color: 'gold'}],
    [1280, 'swoop', {side: 1, y: 40, color: 'gold', n: 10, gap: 8}],
    [1310, 'swoop', {side: -1, y: 80, color: 'blue', n: 10, gap: 8}],
    [1500, 'grand', {x: 120, color: 'gold', stay: 260, type: 'quill'}],
    [1560, 'grand', {x: 264, color: 'blue', stay: 220}],
    [2020, 'books', {side: 1, y: 70, color: 'cyan'}],
    [2100, 'vee', {x: W / 2, color: 'gold'}],
    [2260, 'lanterns', {xs: [130, 254], color: 'white', stay: 150, type: 'quill'}],
  ]},
  {id: 'umbra', name: 'UMBRA THRONE', ja: '蝕の玉座', music: 'stage4', boss: 3, roadLen: 2300, mid: {at: 1100, boss: 4, attack: 's_m1', music: 'selene', dialogue: SELENE_TALK}, waves: [
    [70, 'shades', {n: 6, color: 'violet'}],
    [300, 'swoop', {side: 1, y: 50, color: 'red', n: 10, gap: 9}],
    [330, 'swoop', {side: -1, y: 90, color: 'violet', n: 10, gap: 9}],
    [560, 'lanterns', {xs: [96, 288], color: 'red', ring: 16, type: 'crescent'}],
    [760, 'shades', {n: 8, gap: 16, color: 'pink'}],
    [900, 'vee', {x: W / 2, n: 9, color: 'white'}],
    [1200, 'rain', {n: 18, gap: 10, color: 'violet'}],
    [1440, 'grand', {x: W / 2, color: 'red', color2: 'white', stay: 280, type: 'crescent'}],
    [1840, 'shades', {n: 8, gap: 14, color: 'red'}],
    [1900, 'lanterns', {xs: [70, 160, 224, 314], color: 'violet', stay: 180, type: 'crescent'}],
    [2120, 'swoop', {side: 1, y: 60, color: 'gold', n: 8}],
  ]},
];
