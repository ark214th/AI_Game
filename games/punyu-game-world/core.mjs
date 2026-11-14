// ゲームの中身（描画・音・入力に依存しない。node --test で確かめられる）
import { W, H } from './data.mjs';

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function rng32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ===================================================================
// 弾幕（STARFALL WALTZ の骨格：小さな当たり判定・かすり・スペル名・弾が星に変わる）
// むずかしさは大きく下げてある：弾はおそく少なく、当たっても「ぽよん」となるだけ
// ===================================================================
export const DM = { PR: 7, GRAZE: 38, SPEED: 330, INV: 1.6 };

export function newDanmaku(def, seed = 7) {
  return {
    kind: 'danmaku', def, rand: rng32(seed), t: 0, px: W / 2, py: H - 90, inv: 0, hits: 0, stars: 0, graze: 0,
    bullets: [], shots: [], items: [], enemies: [], boss: null, pi: -1, pt: 0, gap: 1.6, pa: {}, spawn: null,
    shotT: 0, done: false, ending: false, ev: [],
  };
}

function fire(s, x, y, ang, speed, o = {}) {
  s.bullets.push({ x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r: o.r || 8, c: o.c || 'pink', shape: o.shape || 'orb', g: false, t: 0 });
}
function every(s, key, period, dt) {
  s.pa[key] = (s.pa[key] ?? period * 0.6) + dt;
  if (s.pa[key] >= period) { s.pa[key] -= period; s.pa[key + 'n'] = (s.pa[key + 'n'] || 0) + 1; return true; }
  return false;
}
const aim = (s, x, y) => Math.atan2(s.py - y, s.px - x);
function ring(s, b, n, speed, off, o) { for (let i = 0; i < n; i++) fire(s, b.x, b.y, off + i * TAU / n, speed, o); }
function fan(s, b, n, speed, spread, o) { const a = aim(s, b.x, b.y); for (let i = 0; i < n; i++) fire(s, b.x, b.y, a + (i - (n - 1) / 2) * spread, speed, o); }

export const PATTERNS = {
  ring(s, b, dt) { if (every(s, 'a', 1.5, dt)) ring(s, b, 10, 85, s.pa.an * 0.31, { c: 'cyan' }); },
  rain(s, b, dt) {
    if (every(s, 'a', 0.45, dt)) fire(s, 40 + s.rand() * (W - 80), -10, Math.PI / 2 + (s.rand() - 0.5) * 0.16, 112, { c: 'gold', shape: 'star', r: 9 });
    if (every(s, 'b', 2.6, dt)) ring(s, b, 6, 80, s.pa.bn * 0.5, { c: 'cyan' });
  },
  // 三拍子：1拍めは輪、2・3拍めは ぷにゅ へ向かう扇
  waltz(s, b, dt) {
    if (!every(s, 'a', 0.55, dt)) return;
    const k = s.pa.an % 3;
    if (k === 1) ring(s, b, 8, 80, s.pa.an * 0.2, { c: 'gold', shape: 'star', r: 9 });
    else fan(s, b, 3, 104, 0.34, { c: 'pink' });
  },
  // 上からおりてくる幕。すきまが左右にゆっくり動く
  curtain(s, b, dt) {
    if (!every(s, 'a', 1.5, dt)) return;
    const k = s.pa.an, gapX = W / 2 + Math.sin(k * 0.9) * 290;
    for (let x = 30 + (k % 2) * 31; x < W; x += 62) if (Math.abs(x - gapX) > 115) fire(s, x, -10, Math.PI / 2, 80, { c: k % 2 ? 'cyan' : 'green', shape: 'rice' });
  },
  spiral(s, b, dt) {
    if (!every(s, 'a', 0.14, dt)) return;
    const a = s.pa.an * 0.33;
    fire(s, b.x, b.y, a, 92, { c: 'violet' }); fire(s, b.x, b.y, a + Math.PI, 92, { c: 'pink' });
  },
  finale(s, b, dt) {
    if (!every(s, 'a', 0.55, dt)) return;
    const k = s.pa.an;
    if (k % 3 === 1) ring(s, b, 10, 78, k * 0.17, { c: 'gold', shape: 'star', r: 9 });
    else fire(s, 40 + s.rand() * (W - 80), -10, Math.PI / 2, 118, { c: 'white', shape: 'star', r: 9 });
    if (k % 6 === 5) fan(s, b, 3, 100, 0.36, { c: 'pink' });
  },
  glitch(s, b, dt) {
    if (every(s, 'a', 1.0, dt)) fan(s, b, 5, 98, 0.42, { c: 'green', shape: 'square' });
    if (every(s, 'b', 2.3, dt)) ring(s, b, 8, 76, s.pa.bn * 0.4, { c: 'violet', shape: 'square' });
  },
};

function toItem(s, b, mag) { s.items.push({ x: b.x, y: b.y, vy: -40, mag }); }

function startPhase(s) {
  s.pi++; s.pt = 0; s.pa = {};
  const ph = s.def.phases[s.pi];
  if (!ph) { s.ending = true; s.gap = 1.8; return; }
  if (ph.type === 'wave') { s.spawn = { left: ph.n, next: 0.2, side: ph.side, k: 0 }; }
  else {
    if (!s.boss || s.boss.kind !== ph.boss) { s.boss = { kind: ph.boss, x: W / 2, y: -70, bt: 0, r: 40 }; s.ev.push({ t: 'bossIn', boss: ph.boss }); }
    s.boss.hp = s.boss.maxHp = ph.hp;
    if (ph.name) s.ev.push({ t: 'spell', name: ph.name, boss: ph.boss });
  }
}

function endPhase(s) {
  for (const b of s.bullets) toItem(s, b, true);
  s.bullets.length = 0;
  for (const e of s.enemies) e.leave = true;
  s.spawn = null;
  const next = s.def.phases[s.pi + 1];
  if (s.boss && (!next || next.type !== 'boss' || next.boss !== s.boss.kind)) { s.ev.push({ t: 'bossDown', x: s.boss.x, y: s.boss.y, boss: s.boss.kind }); s.boss = null; }
  s.ev.push({ t: 'phaseClear' });
  s.gap = 1.5; s.pt = -1;
}

export function stepDanmaku(s, dt, inp = {}) {
  if (s.done) return;
  s.t += dt;
  s.px = clamp(s.px + (inp.dx || 0) + (inp.kx || 0) * DM.SPEED * dt, 30, W - 30);
  s.py = clamp(s.py + (inp.dy || 0) + (inp.ky || 0) * DM.SPEED * dt, 70, H - 34);
  if (s.inv > 0) s.inv -= dt;

  const ph = s.def.phases[s.pi];
  if (s.gap > 0) {
    s.gap -= dt;
    if (s.gap <= 0) { if (s.ending) { s.done = true; return; } startPhase(s); }
  } else if (ph) {
    s.pt += dt;
    if (ph.type === 'wave') {
      const sp = s.spawn;
      if (sp && sp.left > 0 && (sp.next -= dt) <= 0) {
        const side = sp.side === 'both' ? (sp.k % 2 ? 'r' : 'l') : sp.side;
        s.enemies.push({ x: side === 'l' ? -30 : W + 30, y: 0, side, baseY: 135 + (sp.k % 3) * 50, t: 0, hp: 2, r: 22, fire: 1.2 + s.rand() * 1.4 });
        sp.left--; sp.k++; sp.next = 0.9;
      }
      if (s.pt >= ph.dur || (sp.left === 0 && s.enemies.length === 0 && s.pt > 2)) endPhase(s);
    } else if (s.boss) {
      const b = s.boss;
      if (b.y > 100) PATTERNS[ph.pattern](s, b, dt);
      if (b.hp <= 0 || s.pt >= ph.dur) endPhase(s);
    }
  }

  // ボスのうごき
  if (s.boss) { const b = s.boss; b.bt += dt; b.y += (112 - b.y) * Math.min(1, dt * 2.5); b.x = W / 2 + Math.sin(b.bt * 0.5) * 220; }

  // ざこ
  for (const e of s.enemies) {
    e.t += dt;
    e.x += (e.side === 'l' ? 1 : -1) * (e.leave ? 420 : 105) * dt;
    e.y = e.baseY + Math.sin(e.t * 1.6) * 36;
    if (!e.leave && e.x > 60 && e.x < W - 60 && (e.fire -= dt) <= 0) { e.fire = 2.7; fire(s, e.x, e.y, aim(s, e.x, e.y), 95, { c: 'pink' }); }
    if (e.hp <= 0) { e.dead = true; toItem(s, e, false); s.ev.push({ t: 'pop', x: e.x, y: e.y }); }
    else if (e.x < -80 || e.x > W + 80) e.dead = true;
  }
  s.enemies = s.enemies.filter(e => !e.dead);

  // じどうショット（ねらった あいての ほうへ まがる）
  const targets = s.boss && s.boss.y > 60 ? [s.boss, ...s.enemies] : s.enemies;
  if ((s.shotT -= dt) <= 0 && targets.length && s.gap <= 0) { s.shotT = 0.2; s.shots.push({ x: s.px, y: s.py - 26 }); }
  for (const sh of s.shots) {
    let tg = null, best = 1e9;
    for (const e of targets) { if (e.leave) continue; const d = Math.abs(e.x - sh.x) + Math.abs(e.y - sh.y) * 0.3; if (d < best) { best = d; tg = e; } }
    sh.y -= 640 * dt;
    if (tg) { sh.x += clamp(tg.x - sh.x, -300 * dt, 300 * dt); if (Math.hypot(tg.x - sh.x, tg.y - sh.y) < tg.r + 14) { tg.hp -= 1; sh.dead = true; s.ev.push({ t: 'shotHit', x: sh.x, y: sh.y }); } }
    if (sh.y < -20) sh.dead = true;
  }
  s.shots = s.shots.filter(x => !x.dead);

  // たま
  let hit = false;
  for (const b of s.bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.t += dt;
    if (b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) { b.dead = true; continue; }
    const d = Math.hypot(b.x - s.px, b.y - s.py);
    if (s.inv <= 0 && d < DM.PR + b.r) hit = true;
    else if (!b.g && d < DM.GRAZE) { b.g = true; s.graze++; s.ev.push({ t: 'graze', x: b.x, y: b.y }); }
  }
  if (hit) {
    s.hits++; s.inv = DM.INV; s.ev.push({ t: 'hit', x: s.px, y: s.py });
    for (const b of s.bullets) if (Math.hypot(b.x - s.px, b.y - s.py) < 160) { b.dead = true; toItem(s, b, true); }
  }
  s.bullets = s.bullets.filter(b => !b.dead);

  // ほし（アイテム）
  for (const it of s.items) {
    const dx = s.px - it.x, dy = s.py - it.y, d = Math.hypot(dx, dy) || 1;
    if (it.mag || d < 130) { const v = (it.mag ? 620 : 420) * dt; it.x += dx / d * Math.min(v, d); it.y += dy / d * Math.min(v, d); }
    else { it.vy = Math.min(it.vy + 120 * dt, 70); it.y += it.vy * dt; }
    if (d < 30) { it.dead = true; s.stars++; s.ev.push({ t: 'star', x: it.x, y: it.y }); }
    else if (it.y > H + 30) it.dead = true;
  }
  s.items = s.items.filter(i => !i.dead);
}

// ===================================================================
// 冒険（見下ろし型。くさを切る・ブロックを押す・たからばこを開ける）
// ===================================================================
export const TS = 60;
const HALF = 17;
const SOLID = new Set(['#', 'g', 'k', 'D', 'C']);

export function newAdventure(def, seed = 11) {
  const grid = def.map.map(r => [...r]);
  const s = {
    kind: 'adventure', def, rand: rng32(seed), t: 0, grid, blocks: [], enemies: [], switches: [],
    px: 90, py: 90, dir: [0, 1], kx: 0, ky: 0, inv: 0, hits: 0, stars: 0, hasKey: false, doorOpen: false,
    chest: 'closed', swing: 0, cool: 0, pushT: 0, boss: null, done: false, doneT: 0, ev: [], moving: false,
  };
  grid.forEach((row, y) => row.forEach((ch, x) => {
    const cx = x * TS + TS / 2, cy = y * TS + TS / 2;
    if (ch === 'P') { s.px = cx; s.py = cy; row[x] = '.'; }
    else if (ch === 'e') { s.enemies.push(newSlime(cx, cy)); row[x] = '.'; }
    else if (ch === 'B') { s.blocks.push({ x, y, ox: 0, oy: 0 }); row[x] = '='; }
    else if (ch === 's') s.switches.push({ x, y });
  }));
  if (def.boss) s.boss = { ...def.boss, px: def.boss.x * TS + 30, py: def.boss.y * TS + 30, maxHp: def.boss.hp, r: 46, state: 'wait', st: 1.4, hops: 0, z: 0, hitCool: 0, sx: 0, sy: 0, tx: 0, ty: 0, called: false };
  return s;
}
const newSlime = (x, y) => ({ x, y, tx: x, ty: y, wait: 0.6, r: 18 });

const tileAt = (s, x, y) => (s.grid[y] && s.grid[y][x]) || '#';
const blockAt = (s, x, y) => s.blocks.find(b => b.x === x && b.y === y);
function solidCell(s, x, y) {
  const ch = tileAt(s, x, y);
  if (ch === 'D') return !s.doorOpen;
  return SOLID.has(ch) || !!blockAt(s, x, y);
}
function solidAt(s, px, py) {
  for (const [ox, oy] of [[-HALF, -HALF], [HALF, -HALF], [-HALF, HALF], [HALF, HALF]]) if (solidCell(s, Math.floor((px + ox) / TS), Math.floor((py + oy) / TS))) return true;
  return false;
}
function knock(s, fx, fy, power = 520) {
  const dx = s.px - fx, dy = s.py - fy, d = Math.hypot(dx, dy) || 1;
  s.kx = dx / d * power; s.ky = dy / d * power;
}
function hurt(s, fx, fy) {
  knock(s, fx, fy);
  if (s.inv > 0) return;
  s.hits++; s.inv = 1.2; s.ev.push({ t: 'hit', x: s.px, y: s.py });
}
export const switchesDown = s => s.switches.length > 0 && s.switches.every(w => blockAt(s, w.x, w.y));

function openChest(s) {
  if (s.chest !== 'closed') return;
  s.chest = 'open'; s.doneT = 3.2; s.dir = [0, 1]; s.ev.push({ t: 'chest' });
}

export function stepAdventure(s, dt, inp = {}) {
  if (s.done) return;
  s.t += dt;
  if (s.chest === 'open') { if ((s.doneT -= dt) <= 0) s.done = true; return; }
  if (s.inv > 0) s.inv -= dt;
  if (s.cool > 0) s.cool -= dt;
  if (s.swing > 0) s.swing -= dt;

  // いどう
  let mx = inp.mx || 0, my = inp.my || 0; const m = Math.hypot(mx, my);
  if (m > 1) { mx /= m; my /= m; }
  s.moving = m > 0.25;
  if (s.moving) s.dir = Math.abs(mx) > Math.abs(my) ? [Math.sign(mx), 0] : [0, Math.sign(my)];
  const vx = (s.moving ? mx * 200 : 0) + s.kx, vy = (s.moving ? my * 200 : 0) + s.ky;
  s.kx *= Math.max(0, 1 - dt * 7); s.ky *= Math.max(0, 1 - dt * 7);
  let blocked = false;
  const nx = s.px + vx * dt; if (!solidAt(s, nx, s.py)) s.px = nx; else if (s.dir[0]) blocked = true;
  const ny = s.py + vy * dt; if (!solidAt(s, s.px, ny)) s.py = ny; else if (s.dir[1]) blocked = true;

  // めのまえの マス
  const fx = Math.floor((s.px + s.dir[0] * (HALF + 8)) / TS), fy = Math.floor((s.py + s.dir[1] * (HALF + 8)) / TS);
  const front = tileAt(s, fx, fy);
  if (s.moving && blocked) {
    const b = blockAt(s, fx, fy);
    if (b) {
      s.pushT += dt;
      if (s.pushT > 0.22) {
        const tx = b.x + s.dir[0], ty = b.y + s.dir[1], tt = tileAt(s, tx, ty);
        const free = (tt === '=' || tt === 's') && !blockAt(s, tx, ty) && !s.enemies.some(e => Math.floor(e.x / TS) === tx && Math.floor(e.y / TS) === ty);
        if (free) {
          b.ox = -s.dir[0] * TS; b.oy = -s.dir[1] * TS; b.x = tx; b.y = ty; s.ev.push({ t: 'push' });
          if (tt === 's') s.ev.push({ t: 'switch' });
          if (s.def.door === 'switch' && !s.doorOpen && switchesDown(s)) { s.doorOpen = true; s.ev.push({ t: 'door' }); }
        }
        s.pushT = 0;
      }
    } else s.pushT = 0;
    if (front === 'D' && !s.doorOpen && s.def.door === 'key') {
      if (s.hasKey) { s.doorOpen = true; s.ev.push({ t: 'door' }); } else if (s.cool <= 0) { s.cool = 0.8; s.ev.push({ t: 'locked' }); }
    }
    if (front === 'C') openChest(s);
  } else s.pushT = 0;
  for (const b of s.blocks) { b.ox *= Math.max(0, 1 - dt * 14); b.oy *= Math.max(0, 1 - dt * 14); }

  // けん
  if (inp.act && s.cool <= 0) {
    if (front === 'C') { openChest(s); return; }
    s.swing = 0.22; s.cool = 0.34; s.ev.push({ t: 'swing' });
    if (front === 'g' || front === 'k') {
      s.grid[fy][fx] = '.'; s.ev.push({ t: 'cut', x: fx * TS + 30, y: fy * TS + 30 });
      if (front === 'k') { s.hasKey = true; s.ev.push({ t: 'key', x: fx * TS + 30, y: fy * TS + 30 }); } else { s.stars++; s.ev.push({ t: 'star', x: fx * TS + 30, y: fy * TS + 30 }); }
    }
    const hx = s.px + s.dir[0] * 36, hy = s.py + s.dir[1] * 36;
    for (const e of s.enemies) if (Math.hypot(e.x - hx, e.y - hy) < 56) { e.dead = true; s.stars += 2; s.ev.push({ t: 'pop', x: e.x, y: e.y }); }
    s.enemies = s.enemies.filter(e => !e.dead);
    const b = s.boss;
    if (b && b.hp > 0 && b.z < 8 && Math.hypot(b.px - hx, b.py - hy) < b.r + 46) {
      if (b.state === 'dizzy' && b.hitCool <= 0) {
        b.hp--; b.hitCool = 0.4; s.ev.push({ t: 'bossHit', x: b.px, y: b.py });
        if (b.hp <= 0) {
          s.ev.push({ t: 'bossDown', x: b.px, y: b.py, boss: b.kind });
          for (const e of s.enemies) s.ev.push({ t: 'pop', x: e.x, y: e.y });
          s.enemies = [];
          const [cx0, cy] = s.def.chestAt;
          const cx = [cx0, cx0 + 3, cx0 - 3].find(x => Math.abs(s.px - (x * TS + 30)) > 50 || Math.abs(s.py - (cy * TS + 30)) > 50);
          s.grid[cy][cx] = 'C'; s.ev.push({ t: 'chestAppear' });
        }
      } else if (b.state !== 'dizzy') s.ev.push({ t: 'clang' });
    }
  }

  // スライム
  for (const e of s.enemies) {
    const dx = e.tx - e.x, dy = e.ty - e.y, d = Math.hypot(dx, dy);
    if (d > 1) { const v = Math.min(d, 60 * dt); e.x += dx / d * v; e.y += dy / d * v; }
    else if ((e.wait -= dt) <= 0) {
      e.wait = 0.5 + s.rand() * 1.0;
      const [ox, oy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(s.rand() * 4)];
      const cx = Math.floor(e.x / TS) + ox, cy = Math.floor(e.y / TS) + oy;
      if (!solidCell(s, cx, cy) && tileAt(s, cx, cy) !== 'D') { e.tx = cx * TS + 30; e.ty = cy * TS + 30; }
    }
    if (Math.hypot(e.x - s.px, e.y - s.py) < e.r + 18) hurt(s, e.x, e.y);
  }

  // ボス：3かい とんで くる → めを まわす（ここで たたける）
  const b = s.boss;
  if (b && b.hp > 0) {
    b.st -= dt; if (b.hitCool > 0) b.hitCool -= dt;
    if (b.state === 'wait' && b.st <= 0) {
      if (b.hops >= 3) { b.state = 'dizzy'; b.st = 3.2; b.hops = 0; s.ev.push({ t: 'dizzy' }); }
      else {
        b.state = 'hop'; b.st = 0.9; b.hops++; b.sx = b.px; b.sy = b.py;
        const dx = s.px - b.px, dy = s.py - b.py, d = Math.hypot(dx, dy) || 1, len = Math.min(d, 190);
        b.tx = clamp(b.px + dx / d * len, 110, W - 110); b.ty = clamp(b.py + dy / d * len, 130, H - 110);
      }
    } else if (b.state === 'hop') {
      const k = clamp(1 - b.st / 0.9, 0, 1);
      b.px = b.sx + (b.tx - b.sx) * k; b.py = b.sy + (b.ty - b.sy) * k; b.z = Math.sin(k * Math.PI) * 90;
      if (b.st <= 0) { b.state = 'wait'; b.st = 0.55; b.z = 0; s.ev.push({ t: 'thud', x: b.px, y: b.py }); if (Math.hypot(b.px - s.px, b.py - s.py) < b.r + 30) hurt(s, b.px, b.py); }
    } else if (b.state === 'dizzy' && b.st <= 0) { b.state = 'wait'; b.st = 0.6; }
    if (b.state === 'wait' && b.z === 0 && Math.hypot(b.px - s.px, b.py - s.py) < b.r + 14) hurt(s, b.px, b.py);
    if (!b.called && b.hp <= b.maxHp / 2) {
      b.called = true; s.enemies.push(newSlime(2 * TS + 30, 6 * TS + 30), newSlime(13 * TS + 30, 2 * TS + 30)); s.ev.push({ t: 'call' });
    }
  }
}

// ===================================================================
// リズム
// ===================================================================
export const RH = { PERFECT: 0.13, GOOD: 0.36, FALL: 1.7 };

export function buildChart(def) {
  const half = 30 / def.bpm, notes = [];
  def.bars.forEach((bar, bi) => [...bar].forEach((ch, i) => { if (ch !== '.') notes.push({ t: (bi * 8 + i) * half, lane: +ch - 1, res: null }); }));
  return { notes, len: def.bars.length * 8 * half };
}

export function newRhythm(def) {
  const { notes, len } = buildChart(def);
  return { kind: 'rhythm', def, notes, len, t: -1, kira: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0, hits: 0, stars: 0, done: false, ev: [] };
}

export function stepRhythm(s, t) {
  s.t = t;
  for (const n of s.notes) if (!n.res && t > n.t + RH.GOOD) { n.res = 'miss'; s.miss++; s.combo = 0; s.ev.push({ t: 'miss', lane: n.lane }); }
  if (t >= s.len + 0.6) s.done = true;
}

export function tapLane(s, lane, t) {
  let best = null, bd = RH.GOOD;
  for (const n of s.notes) {
    if (n.res) continue;
    if (n.t - t > RH.GOOD) break;
    const d = Math.abs(n.t - t);
    if (d <= bd && (n.lane === lane || s.def.anyLane)) { bd = d; best = n; }
  }
  if (!best) { s.ev.push({ t: 'tap', lane }); return null; }
  const res = bd <= RH.PERFECT ? 'perfect' : 'good';
  best.res = res; s[res]++; s.combo++; s.maxCombo = Math.max(s.maxCombo, s.combo);
  s.kira += res === 'perfect' ? 2 : 1; s.stars = s.kira;
  s.ev.push({ t: res, lane: best.lane, combo: s.combo });
  return res;
}
export const rhythmRatio = s => (s.perfect + s.good) / Math.max(1, s.notes.length);

// ===================================================================
// けっか・セーブ
// ===================================================================
export function rating(s) {
  if (s.kind === 'rhythm') { const r = rhythmRatio(s); return r >= 0.8 ? 3 : r >= 0.5 ? 2 : 1; }
  if (s.kind === 'danmaku') return s.hits <= 2 ? 3 : s.hits <= 6 ? 2 : 1;
  return s.hits <= 1 ? 3 : s.hits <= 4 ? 2 : 1;
}
export const avgStars = list => clamp(Math.round(list.reduce((a, b) => a + b, 0) / Math.max(1, list.length)), 1, 3);

export const newSave = () => ({ v: 1, opening: false, worlds: {}, ending: false, sound: true });
export function loadSave(text) {
  try { const o = JSON.parse(text); if (o && o.v === 1 && typeof o.worlds === 'object') return { ...newSave(), ...o }; } catch { /* こわれていたら あたらしく */ }
  return newSave();
}
const slot = (save, id) => (save.worlds[id] ||= { clear: false, stars: 0, reached: 0 });
export function recordStage(save, id, stageIdx, total) { const w = slot(save, id); w.reached = stageIdx + 1 >= total ? 0 : stageIdx + 1; return save; }
export function recordClear(save, id, stars) { const w = slot(save, id); w.clear = true; w.reached = 0; w.stars = Math.max(w.stars, stars); return save; }
export const finalUnlocked = (save, ids) => ids.every(id => save.worlds[id]?.clear);
