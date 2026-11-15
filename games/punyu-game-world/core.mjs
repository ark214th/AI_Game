// ゲームの中身（描画・音・入力に依存しない。node --test で確かめられる）
import { W, H, FRIENDS, MIX } from './data.mjs';

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

// ハート：あたると 1つ へる。なくなると しっぱい（その ばしょから やりなおせる）
// s.god を たてると へらない（テストと かくにん用）
export const HEARTS = 3;
function loseHeart(s) {
  if (s.god) return;
  s.hp = Math.max(0, s.hp - 1);
  if (s.hp <= 0) { s.failed = true; s.ev.push({ t: 'fail' }); }
}

// ===================================================================
// 弾幕（STARFALL WALTZ の骨格：小さな当たり判定・かすり・ボム・スペル名・弾が星に変わる）
// ===================================================================
export const DM = { PR: 7, GRAZE: 38, SPEED: 360, INV: 1.6, BOMBS: 2 };

// o.phase：とちゅうの こうげきから はじめる（やりなおし用）
export function newDanmaku(def, seed = 7, o = {}) {
  return {
    kind: 'danmaku', def, rand: rng32(seed), t: 0, px: W / 2, py: H - 90, inv: 0, hits: 0, stars: o.stars || 0, graze: 0,
    hp: o.hp ?? HEARTS, maxHp: o.maxHp ?? HEARTS, bombs: DM.BOMBS, failed: false,
    bullets: [], shots: [], items: [], enemies: [], boss: null, pi: (o.phase || 0) - 1, pt: 0, gap: def.mix ? 0.4 : 1.6, pa: {}, spawn: null,
    shotT: 0, done: false, ending: false, ev: [],
  };
}

function fire(s, x, y, ang, speed, o = {}) {
  speed *= s.def.speed || 1;
  s.bullets.push({ x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r: o.r || 8, c: o.c || 'pink', shape: o.shape || 'orb', g: false, t: 0, mode: o.mode });
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
  ring(s, b, dt) {
    if (every(s, 'a', 1.1, dt)) ring(s, b, 14, 120, s.pa.an * 0.23, { c: 'cyan' });
    if (every(s, 'b', 2.2, dt)) fire(s, b.x, b.y, aim(s, b.x, b.y), 175, { c: 'pink', r: 10 });
  },
  rain(s, b, dt) {
    if (every(s, 'a', 0.26, dt)) fire(s, 30 + s.rand() * (W - 60), -10, Math.PI / 2 + (s.rand() - 0.5) * 0.24, 150, { c: 'gold', shape: 'star', r: 9 });
    if (every(s, 'b', 2.0, dt)) ring(s, b, 10, 110, s.pa.bn * 0.5, { c: 'cyan' });
  },
  // 三拍子：1拍めは輪、2・3拍めは ぷにゅ へ向かう扇
  waltz(s, b, dt) {
    if (!every(s, 'a', 0.5, dt)) return;
    if (s.pa.an % 3 === 1) ring(s, b, 12, 105, s.pa.an * 0.2, { c: 'gold', shape: 'star', r: 9 });
    else fan(s, b, 5, 140, 0.26, { c: 'pink' });
  },
  // 上からおりてくる幕。すきまが左右に動く
  curtain(s, b, dt) {
    if (every(s, 'a', 1.1, dt)) {
      const k = s.pa.an, gapX = W / 2 + Math.sin(k * 0.8) * 300;
      for (let x = 20 + (k % 2) * 26; x < W; x += 52) if (Math.abs(x - gapX) > 82) fire(s, x, -10, Math.PI / 2, 112, { c: k % 2 ? 'cyan' : 'green', shape: 'rice' });
    }
    if (every(s, 'b', 2.6, dt)) fan(s, b, 3, 150, 0.3, { c: 'pink' });
  },
  spiral(s, b, dt) {
    if (!every(s, 'a', 0.11, dt)) return;
    const a = s.pa.an * 0.29;
    for (let i = 0; i < 3; i++) fire(s, b.x, b.y, a + i * TAU / 3, 125, { c: ['violet', 'pink', 'cyan'][i] });
  },
  // 輪が いちど とまって、ぷにゅ の ほうへ うごきだす
  flower(s, b, dt) {
    if (every(s, 'a', 1.7, dt)) ring(s, b, 16, 170, s.pa.an * 0.2, { c: 'violet', shape: 'star', r: 9, mode: 'fermata' });
    if (every(s, 'b', 1.3, dt)) fan(s, b, 2, 130, 0.5, { c: 'gold' });
  },
  // 4ほんの うでが まわる
  cross(s, b, dt) {
    if (every(s, 'a', 0.15, dt)) { const a = s.pt * 0.55; for (let i = 0; i < 4; i++) fire(s, b.x, b.y, a + i * TAU / 4, 118, { c: i % 2 ? 'green' : 'cyan' }); }
    if (every(s, 'b', 2.3, dt)) fan(s, b, 3, 155, 0.28, { c: 'pink', r: 10 });
  },
  finale(s, b, dt) {
    if (!every(s, 'a', 0.5, dt)) return;
    const k = s.pa.an;
    if (k % 3 === 1) ring(s, b, 14, 105, k * 0.17, { c: 'gold', shape: 'star', r: 9 });
    else for (let i = 0; i < 2; i++) fire(s, 30 + s.rand() * (W - 60), -10, Math.PI / 2, 160, { c: 'white', shape: 'star', r: 9 });
    if (k % 6 === 5) fan(s, b, 5, 140, 0.28, { c: 'pink' });
  },
  glitch(s, b, dt) {
    if (every(s, 'a', 0.8, dt)) fan(s, b, 5, 135, 0.36, { c: 'green', shape: 'square' });
    if (every(s, 'b', 1.8, dt)) ring(s, b, 12, 100, s.pa.bn * 0.4, { c: 'violet', shape: 'square' });
  },
};

function toItem(s, b, mag) { s.items.push({ x: b.x, y: b.y, vy: -40, mag }); }

function startPhase(s) {
  s.pi++; s.pt = 0; s.pa = {};
  const ph = s.def.phases[s.pi];
  if (!ph) { s.ending = true; s.gap = s.def.mix ? 0.6 : 1.8; return; }
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
  s.gap = s.def.mix ? 0.5 : 1.5; s.pt = -1;
}

export function stepDanmaku(s, dt, inp = {}) {
  if (s.done || s.failed) return;
  s.t += dt;
  s.px = clamp(s.px + (inp.dx || 0) + (inp.kx || 0) * DM.SPEED * dt, 30, W - 30);
  s.py = clamp(s.py + (inp.dy || 0) + (inp.ky || 0) * DM.SPEED * dt, 70, H - 34);
  if (s.inv > 0) s.inv -= dt;

  // ボム：がめんの たまを ぜんぶ ほしに かえる
  if (inp.bomb && s.bombs > 0 && s.gap <= 0) {
    s.bombs--; s.inv = Math.max(s.inv, 2);
    for (const b of s.bullets) toItem(s, b, true);
    s.bullets.length = 0; s.ev.push({ t: 'bomb', x: s.px, y: s.py });
  }

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
        s.enemies.push({ x: side === 'l' ? -30 : W + 30, y: 0, side, baseY: 135 + (sp.k % 3) * 50, t: 0, hp: 2, r: 22, fire: 0.9 + s.rand() * 1.2 });
        sp.left--; sp.k++; sp.next = 0.75;
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

  // ざこ（3ほうこうに うつ）
  for (const e of s.enemies) {
    e.t += dt;
    e.x += (e.side === 'l' ? 1 : -1) * (e.leave ? 420 : 120) * dt;
    e.y = e.baseY + Math.sin(e.t * 1.6) * 36;
    if (!e.leave && e.x > 60 && e.x < W - 60 && (e.fire -= dt) <= 0) { e.fire = 1.9; const a = aim(s, e.x, e.y); for (const d of [-0.3, 0, 0.3]) fire(s, e.x, e.y, a + d, 132, { c: 'pink' }); }
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
    if (b.mode === 'fermata') {
      if (b.t < 0.9) { const k = Math.max(0, 1 - dt * 3); b.vx *= k; b.vy *= k; }
      else if (b.t >= 1.3 && !b.re) { b.re = true; const a = aim(s, b.x, b.y), v = 150 * (s.def.speed || 1); b.vx = Math.cos(a) * v; b.vy = Math.sin(a) * v; }
    }
    b.x += b.vx * dt; b.y += b.vy * dt; b.t += dt;
    if (b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) { b.dead = true; continue; }
    const d = Math.hypot(b.x - s.px, b.y - s.py);
    if (s.inv <= 0 && d < DM.PR + b.r) hit = true;
    else if (!b.g && d < DM.GRAZE) { b.g = true; s.graze++; s.ev.push({ t: 'graze', x: b.x, y: b.y }); }
  }
  if (hit) {
    s.hits++; s.inv = DM.INV; s.ev.push({ t: 'hit', x: s.px, y: s.py });
    for (const b of s.bullets) if (Math.hypot(b.x - s.px, b.y - s.py) < 160) { b.dead = true; toItem(s, b, true); }
    loseHeart(s);
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
// 冒険（見下ろし型。1ステージは いくつかの へやが つながっている）
// ===================================================================
export const TS = 60;
const HALF = 17;
const SOLID = new Set(['#', 'g', 'k', 'D', 'C']);
const ENEMY = {
  slime: { r: 18, hp: 1, speed: 85, score: 2 },
  big: { r: 27, hp: 3, speed: 62, score: 5 },
  bat: { r: 16, hp: 1, speed: 150, score: 3 },
};
const newEnemy = (type, x, y, o = {}) => ({ type, x, y, tx: x, ty: y, wait: 0.6, stun: 0, ...ENEMY[type], ...o });
export const roomCount = def => (def.rooms ? def.rooms.length : 1);

// o.room：なんばんめの へやか。o.stars / o.hp：まえの へやから ひきつぐ
export function newAdventure(stage, seed = 11, o = {}) {
  const room = o.room || 0, def = stage.rooms ? { ...stage, ...stage.rooms[room] } : stage;
  const grid = def.map.map(r => [...r]);
  const s = {
    kind: 'adventure', def, stage, room, seed, rand: rng32(seed + room * 7), t: 0, grid, blocks: [], enemies: [], switches: [],
    px: 90, py: 90, dir: [0, 1], kx: 0, ky: 0, inv: 0, hits: o.hits || 0, stars: o.stars || 0, startStars: o.stars || 0,
    hp: o.hp ?? HEARTS, maxHp: o.maxHp ?? HEARTS, failed: false, hasKey: false, doorOpen: false, exit: false,
    chest: 'closed', swing: 0, cool: 0, pushT: 0, boss: null, done: false, doneT: 0, ev: [], moving: false,
  };
  grid.forEach((row, y) => row.forEach((ch, x) => {
    const cx = x * TS + TS / 2, cy = y * TS + TS / 2;
    if (ch === 'P') { s.px = cx; s.py = cy; row[x] = '.'; }
    else if (ch === 'e') { s.enemies.push(newEnemy('slime', cx, cy)); row[x] = '.'; }
    else if (ch === 'E') { s.enemies.push(newEnemy('big', cx, cy)); row[x] = '.'; }
    else if (ch === 'b') { s.enemies.push(newEnemy('bat', cx, cy, { vx: 1, vy: 0 })); row[x] = '.'; }
    else if (ch === 'v') { s.enemies.push(newEnemy('bat', cx, cy, { vx: 0, vy: 1 })); row[x] = '.'; }
    else if (ch === 'B') { s.blocks.push({ x, y, ox: 0, oy: 0 }); row[x] = '='; }
    else if (ch === 's') s.switches.push({ x, y });
  }));
  if (def.boss) s.boss = { ...def.boss, px: def.boss.x * TS + 30, py: def.boss.y * TS + 30, maxHp: def.boss.hp, r: 46, state: 'wait', st: 1.4, hops: 0, z: 0, hitCool: 0, sx: 0, sy: 0, tx: 0, ty: 0, calls: 0 };
  return s;
}
// つぎの へやへ（ハート・ほし・あたった かずは そのまま）
export const nextRoom = s => newAdventure(s.stage, s.seed, { room: s.room + 1, stars: s.stars, hits: s.hits, hp: s.hp, maxHp: s.maxHp });
// しっぱい したら、その へやの あたまから（ハートは まんたん）
export const retryRoom = s => newAdventure(s.stage, s.seed, { room: s.room, stars: s.startStars, hits: s.hits, maxHp: s.maxHp });

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
  s.hits++; s.inv = 1.3; s.ev.push({ t: 'hit', x: s.px, y: s.py });
  loseHeart(s);
}
function placeChest(s) {
  const [cx0, cy] = s.def.chestAt;
  const cx = [cx0, cx0 + 3, cx0 - 3].find(x => Math.abs(s.px - (x * TS + 30)) > 50 || Math.abs(s.py - (cy * TS + 30)) > 50);
  s.grid[cy][cx] = 'C'; s.chestPlaced = true; s.ev.push({ t: 'chestAppear' });
}
export const switchesDown = s => s.switches.length > 0 && s.switches.every(w => blockAt(s, w.x, w.y));
// 「ぜんぶ たおす」の かぞえかた：コウモリは かぞえない
export const foesLeft = s => s.enemies.filter(e => e.type !== 'bat').length;

function openChest(s) {
  if (s.chest !== 'closed') return;
  s.chest = 'open'; s.doneT = s.def.quick ? 1.5 : 3.2; s.dir = [0, 1]; s.ev.push({ t: 'chest' });
}
function afterKill(s) {
  s.enemies = s.enemies.filter(e => !e.dead);
  if (foesLeft(s) > 0) return;
  if (s.def.goal === 'slimes' && !s.chestPlaced) placeChest(s);
  if (s.def.door === 'clear' && !s.doorOpen) { s.doorOpen = true; s.ev.push({ t: 'door' }); }
}

export function stepAdventure(s, dt, inp = {}) {
  if (s.done || s.failed || s.exit) return;
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
  const vx = (s.moving ? mx * 210 : 0) + s.kx, vy = (s.moving ? my * 210 : 0) + s.ky;
  s.kx *= Math.max(0, 1 - dt * 7); s.ky *= Math.max(0, 1 - dt * 7);
  let blocked = false;
  const nx = s.px + vx * dt; if (!solidAt(s, nx, s.py)) s.px = nx; else if (s.dir[0]) blocked = true;
  const ny = s.py + vy * dt; if (!solidAt(s, s.px, ny)) s.py = ny; else if (s.dir[1]) blocked = true;
  if (tileAt(s, Math.floor(s.px / TS), Math.floor(s.py / TS)) === 'X') { s.exit = true; s.ev.push({ t: 'exit' }); return; }

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
    if (front === 'D' && !s.doorOpen) {
      if (s.def.door === 'key' && s.hasKey) { s.doorOpen = true; s.ev.push({ t: 'door' }); }
      else if (s.cool <= 0) { s.cool = 0.8; s.ev.push({ t: 'locked', door: s.def.door }); }
    }
    if (front === 'C') openChest(s);
  } else s.pushT = 0;
  for (const b of s.blocks) { b.ox *= Math.max(0, 1 - dt * 14); b.oy *= Math.max(0, 1 - dt * 14); }

  // けん
  if (inp.act && s.cool <= 0) {
    if (front === 'C') { openChest(s); return; }
    s.swing = 0.22; s.cool = 0.32; s.ev.push({ t: 'swing' });
    if (front === 'g' || front === 'k') {
      s.grid[fy][fx] = '.'; s.ev.push({ t: 'cut', x: fx * TS + 30, y: fy * TS + 30 });
      if (front === 'k') { s.hasKey = true; s.ev.push({ t: 'key', x: fx * TS + 30, y: fy * TS + 30 }); }
      else if (s.hp < s.maxHp && s.rand() < 0.22) { s.hp++; s.ev.push({ t: 'heart', x: fx * TS + 30, y: fy * TS + 30 }); }
      else { s.stars++; s.ev.push({ t: 'star', x: fx * TS + 30, y: fy * TS + 30 }); }
    }
    const hx = s.px + s.dir[0] * 36, hy = s.py + s.dir[1] * 36;
    let killed = false;
    for (const e of s.enemies) {
      if (e.stun > 0.15 || Math.hypot(e.x - hx, e.y - hy) >= 40 + e.r) continue;
      e.hp--; e.stun = 0.45;
      if (e.hp <= 0) { e.dead = true; killed = true; s.stars += e.score; s.ev.push({ t: 'pop', x: e.x, y: e.y }); }
      else s.ev.push({ t: 'bossHit', x: e.x, y: e.y });
    }
    if (killed) afterKill(s);
    const b = s.boss;
    if (b && b.hp > 0 && b.z < 8 && Math.hypot(b.px - hx, b.py - hy) < b.r + 46) {
      if (b.state === 'dizzy' && b.hitCool <= 0) {
        b.hp--; b.hitCool = 0.4; s.ev.push({ t: 'bossHit', x: b.px, y: b.py });
        if (b.hp <= 0) {
          s.ev.push({ t: 'bossDown', x: b.px, y: b.py, boss: b.kind });
          for (const e of s.enemies) s.ev.push({ t: 'pop', x: e.x, y: e.y });
          s.enemies = [];
          placeChest(s);
        }
      } else if (b.state !== 'dizzy') s.ev.push({ t: 'clang' });
    }
  }

  // てき
  for (const e of s.enemies) {
    if (e.stun > 0) { e.stun -= dt; continue; }
    if (e.type === 'bat') {
      // まっすぐ とんで、かべで おりかえす
      const ax = e.x + e.vx * (e.speed * dt + 20), ay = e.y + e.vy * (e.speed * dt + 20);
      if (solidCell(s, Math.floor(ax / TS), Math.floor(ay / TS)) || tileAt(s, Math.floor(ax / TS), Math.floor(ay / TS)) === 'D') { e.vx = -e.vx; e.vy = -e.vy; }
      else { e.x += e.vx * e.speed * dt; e.y += e.vy * e.speed * dt; }
    } else {
      const dx = e.tx - e.x, dy = e.ty - e.y, d = Math.hypot(dx, dy);
      if (d > 1) { const v = Math.min(d, e.speed * dt); e.x += dx / d * v; e.y += dy / d * v; }
      else if ((e.wait -= dt) <= 0) {
        e.wait = 0.15 + s.rand() * 0.5;
        // ちかくに いると ぷにゅ の ほうへ よってくる
        let dir = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(s.rand() * 4)];
        const px = s.px - e.x, py = s.py - e.y;
        if (Math.hypot(px, py) < 5 * TS && s.rand() < 0.65) dir = Math.abs(px) > Math.abs(py) ? [Math.sign(px), 0] : [0, Math.sign(py)];
        const cx = Math.floor(e.x / TS) + dir[0], cy = Math.floor(e.y / TS) + dir[1], tt = tileAt(s, cx, cy);
        if (!solidCell(s, cx, cy) && tt !== 'D' && tt !== 'X') { e.tx = cx * TS + 30; e.ty = cy * TS + 30; }
      }
    }
    if (Math.hypot(e.x - s.px, e.y - s.py) < e.r + 18) hurt(s, e.x, e.y);
  }

  // ボス：3かい とんで くる → めを まわす（ここで たたける）
  const b = s.boss;
  if (b && b.hp > 0) {
    b.st -= dt; if (b.hitCool > 0) b.hitCool -= dt;
    if (b.state === 'wait' && b.st <= 0) {
      if (b.hops >= 3) { b.state = 'dizzy'; b.st = 2.5; b.hops = 0; s.ev.push({ t: 'dizzy' }); }
      else {
        b.state = 'hop'; b.st = 0.75; b.hops++; b.sx = b.px; b.sy = b.py;
        const dx = s.px - b.px, dy = s.py - b.py, d = Math.hypot(dx, dy) || 1, len = Math.min(d, 230);
        b.tx = clamp(b.px + dx / d * len, 110, W - 110); b.ty = clamp(b.py + dy / d * len, 130, H - 110);
      }
    } else if (b.state === 'hop') {
      const k = clamp(1 - b.st / 0.75, 0, 1);
      b.px = b.sx + (b.tx - b.sx) * k; b.py = b.sy + (b.ty - b.sy) * k; b.z = Math.sin(k * Math.PI) * 90;
      if (b.st <= 0) { b.state = 'wait'; b.st = 0.4; b.z = 0; s.ev.push({ t: 'thud', x: b.px, y: b.py }); if (Math.hypot(b.px - s.px, b.py - s.py) < b.r + 62) hurt(s, b.px, b.py); }
    } else if (b.state === 'dizzy' && b.st <= 0) { b.state = 'wait'; b.st = 0.6; }
    if (b.state === 'wait' && b.z === 0 && Math.hypot(b.px - s.px, b.py - s.py) < b.r + 14) hurt(s, b.px, b.py);
    // たいりょくが へると なかまを よぶ（2かい）
    if (b.calls < 2 && b.hp <= b.maxHp * (2 - b.calls) / 3) {
      b.calls++; s.enemies.push(newEnemy('slime', 2 * TS + 30, 6 * TS + 30), newEnemy('slime', 13 * TS + 30, 2 * TS + 30)); s.ev.push({ t: 'call' });
    }
  }
}

// ===================================================================
// リズム
// ===================================================================
export const RH = { PERFECT: 0.1, GOOD: 0.22, FALL: 1.5, PASS: 0.6 };
// ふめんの もじ：1 2 3 = ひだり・まんなか・みぎ。4 5 6 = ふたつ どうじ（1+2・2+3・1+3）
export const LANES = { 1: [0], 2: [1], 3: [2], 4: [0, 1], 5: [1, 2], 6: [0, 2] };

export function buildChart(def) {
  const half = 30 / def.bpm, notes = [];
  def.bars.forEach((bar, bi) => [...bar].forEach((ch, i) => { for (const lane of LANES[ch] || []) notes.push({ t: (bi * 8 + i) * half, lane, res: null }); }));
  return { notes, len: def.bars.length * 8 * half };
}

export function newRhythm(def) {
  const { notes, len } = buildChart(def);
  return { kind: 'rhythm', def, notes, len, t: -1, kira: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0, hits: 0, stars: 0, failed: false, done: false, ev: [], fall: def.fall || RH.FALL, pass: def.pass ?? RH.PASS };
}

export function stepRhythm(s, t) {
  if (s.done || s.failed) return;
  s.t = t;
  for (const n of s.notes) if (!n.res && t > n.t + RH.GOOD) { n.res = 'miss'; s.miss++; s.combo = 0; s.ev.push({ t: 'miss', lane: n.lane }); }
  if (t < s.len + 0.6) return;
  // うたの おわり：きらきらが たりないと もういちど
  if (rhythmRatio(s) < s.pass && !s.god) { s.failed = true; s.ev.push({ t: 'fail' }); } else s.done = true;
}

export function tapLane(s, lane, t) {
  let best = null, bd = RH.GOOD;
  for (const n of s.notes) {
    if (n.res) continue;
    if (n.t - t > RH.GOOD) break;
    const d = Math.abs(n.t - t);
    if (d <= bd && n.lane === lane) { bd = d; best = n; }
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
// レース（3レーン。コーンで ハートが へる。3ばん いないで ゴールすれば クリア）
// ===================================================================
export const RC = { SPEED: 390 };

export function newRace(def, seed = 5, o = {}) {
  const rand = rng32(seed), objs = [];
  for (let z = 900; z < def.len - 500; z += (300 + rand() * 240) / def.density) {
    const r = rand(), lane = Math.floor(rand() * 3);
    if (r < 0.5) { objs.push({ z, lane, type: 'cone' }); if (r < 0.09 * def.density) objs.push({ z, lane: (lane + 1) % 3, type: 'cone' }); }
    else if (r < 0.86) for (let i = 0; i < 3; i++) objs.push({ z: z + i * 80, lane, type: 'coin' });
    else objs.push({ z, lane, type: 'boost' });
  }
  const base = RC.SPEED * (def.speed || 1);
  const rivals = def.rivals.map((kind, i) => ({ kind, dist: 220 * (i + 1), lane: (i * 2) % 3, x: (i * 2) % 3, v: base * (kind === 'bug' ? 0.985 : 0.9 + i * 0.03), turn: 1.5 + rand() * 2, drop: 3 }));
  return { kind: 'race', def, rand, t: 0, dist: 0, lane: 1, x: 1, speed: 0, boost: 0, spin: 0, hits: 0, stars: 0, hp: o.hp ?? HEARTS, maxHp: o.maxHp ?? HEARTS, failed: false,
    objs, rivals, done: false, goalT: 0, place: 0, bumpT: 0, ev: [] };
}
export const racePlace = s => 1 + s.rivals.filter(r => r.dist > s.dist).length;

export function stepRace(s, dt, inp = {}) {
  if (s.done || s.failed) return;
  s.t += dt;
  for (const r of s.rivals) {
    r.dist += r.v * dt; r.x += (r.lane - r.x) * Math.min(1, dt * 5);
    if (s.goalT > 0) continue;
    // ときどき レーンを かえる（ぷにゅ の すぐ まえ では かえない）
    if ((r.turn -= dt) <= 0) { r.turn = 2.5 + s.rand() * 3; const dz = r.dist - s.dist; if (dz < -40 || dz > 260) r.lane = clamp(r.lane + (s.rand() < 0.5 ? -1 : 1), 0, 2); }
    // バグバグは まえを はしっていると ブロックを おとす
    if (r.kind === 'bug' && (r.drop -= dt) <= 0) { r.drop = 3.4; const z = r.dist - 30; if (z > s.dist + 380 && z < s.def.len - 300) { s.objs.push({ z, lane: r.lane, type: 'cone' }); s.ev.push({ t: 'drop' }); } }
  }
  if (s.goalT > 0) {
    s.dist += s.speed * dt; s.speed *= Math.max(0, 1 - dt * 1.2);
    if ((s.goalT -= dt) <= 0) { if (s.place > 3 && !s.god && !s.def.mix) { s.failed = true; s.ev.push({ t: 'fail' }); } else s.done = true; }
    return;
  }
  if (inp.turn) { const nl = clamp(s.lane + inp.turn, 0, 2); if (nl !== s.lane) { s.lane = nl; s.ev.push({ t: 'lane' }); } }
  s.x += (s.lane - s.x) * Math.min(1, dt * 12);
  const base = RC.SPEED * (s.def.speed || 1), target = s.spin > 0 ? base * 0.35 : s.boost > 0 ? base * 1.45 : base;
  s.speed += (target - s.speed) * Math.min(1, dt * 3);
  if (s.spin > 0) s.spin -= dt;
  if (s.boost > 0) s.boost -= dt;
  if (s.bumpT > 0) s.bumpT -= dt;
  // まえの カートに ぶつかると すこし おそく なる（よこに よけて ぬかす）
  for (const r of s.rivals) {
    const dz = r.dist - s.dist;
    if (dz > 0 && dz < 75 && Math.abs(r.x - s.x) < 0.6 && s.speed > r.v * 0.92) { s.speed = r.v * 0.92; if (s.bumpT <= 0) { s.bumpT = 0.6; s.ev.push({ t: 'bump', lane: s.x }); } }
  }
  const prev = s.dist; s.dist += s.speed * dt;
  for (const o of s.objs) {
    if (o.hit || o.z < prev - 10 || o.z > s.dist + 10 || Math.abs(o.lane - s.x) >= 0.5) continue;
    if (o.type === 'coin') { o.hit = true; s.stars++; s.ev.push({ t: 'star', lane: s.x }); }
    else if (o.type === 'boost') { o.hit = true; s.boost = 1.6; s.ev.push({ t: 'boost', lane: s.x }); }
    else if (s.spin <= 0) { o.hit = true; s.spin = 1.0; s.hits++; s.ev.push({ t: 'hit', lane: s.x }); loseHeart(s); if (s.failed) return; }
  }
  if (s.dist >= s.def.len) { s.place = racePlace(s); s.goalT = 2.2; s.ev.push({ t: 'goal', place: s.place }); }
}

// ===================================================================
// まぜこぜ モード：みじかい あそびが つぎつぎ くる。ハートが なくなるまで つづく
// ===================================================================
const RH_POOL = ['1...2...', '3...2...', '1.2.3...', '3.2.1...', '2.2.2...', '1...3...', '1.2.3.2.', '2.2.3...', '3.3.1...', '4...5...', '6...2...', '1.3.2...'];
const RH_HARD = ['1.2.3.2.', '3.2.1.2.', '4.2.5.2.', '6.2.6...', '1.1.3.3.', '4.3.5.1.'];
export function buildMix(rand, rounds = MIX.rounds) {
  const kinds = ['danmaku', 'adventure', 'rhythm', 'race'], pick = list => list[Math.floor(rand() * list.length)], out = [];
  let last = null;
  for (let i = 0; i < rounds; i++) {
    let k; do k = pick(kinds); while (k === last);
    last = k;
    const sp = Math.min(1.6, 1 + i * 0.05);
    if (k === 'danmaku') out.push({ kind: k, costume: 'star', mix: true, name: 'たまよけ', hint: 'たまを よけて ほしを あつめよう', speed: sp,
      phases: [{ type: 'boss', boss: pick(['comet', 'luna', 'bug']), hp: 99999, dur: 12, pattern: pick(['ring', 'waltz', 'rain', 'curtain', 'spiral', 'glitch', 'flower', 'cross']) }] });
    else if (k === 'adventure') {
      const map = ['################', ...Array.from({ length: 7 }, () => '#..............#'), '################'].map(r => [...r]);
      map[4][2] = 'P';
      const put = ch => { for (;;) { const x = 5 + Math.floor(rand() * 9), y = 2 + Math.floor(rand() * 5); if (map[y][x] === '.') { map[y][x] = ch; return; } } };
      for (let n = 0; n < Math.min(6, 3 + Math.floor(i / 3)); n++) put('e');
      if (i >= 4) put('E');
      if (i >= 2) put(rand() < 0.5 ? 'b' : 'v');
      out.push({ kind: k, costume: 'hero', mix: true, name: 'スライム たいじ', hint: 'スライムを ぜんぶ やっつけて たからばこを あけよう', theme: pick(['field', 'cave', 'castle']),
        goal: 'slimes', quick: true, door: 'none', item: 'heart', itemName: 'ハート', chestAt: [8, 1], map: map.map(r => r.join('')) });
    } else if (k === 'rhythm') { const pool = i >= 5 ? RH_HARD : RH_POOL; out.push({ kind: k, costume: 'idol', mix: true, name: 'リズム', hint: 'わっかに かさなったら タッチ！', bpm: Math.min(150, Math.round(104 + i * 4)), key: pick([60, 62, 65]), chords: [0, 7, 9, 5], pass: 0.5,
      bars: ['........', pick(pool), pick(pool), pick(pool), '2.......'] }); }
    else out.push({ kind: k, costume: 'racer', mix: true, name: 'レース', hint: 'ひだりと みぎで よけて はしろう', theme: pick(['field', 'sea']), len: 4600, density: Math.min(1.6, 1 + i * 0.05), speed: Math.min(1.4, sp), rivals: ['slime', 'starkid', 'comet'] });
  }
  return out;
}

// ===================================================================
// けっか・セーブ
// ===================================================================
// ★3：やりなおし なしで じょうずに。★2：やりなおし なし。★1：クリア
export function rating(s, retries = 0) {
  if (retries > 0) return 1;
  if (s.kind === 'rhythm') { const r = rhythmRatio(s); return r >= 0.92 ? 3 : r >= 0.78 ? 2 : 1; }
  if (s.kind === 'race') return s.place <= 1 ? 3 : s.place === 2 ? 2 : 1;
  return s.hits <= 1 ? 3 : 2;
}
export const avgStars = list => clamp(Math.round(list.reduce((a, b) => a + b, 0) / Math.max(1, list.length)), 1, 3);

export const newSave = () => ({ v: 1, opening: false, worlds: {}, ending: false, sound: true, mix: { best: 0, plays: 0 }, friendsSeen: [] });
export function loadSave(text) {
  try { const o = JSON.parse(text); if (o && o.v === 1 && typeof o.worlds === 'object') return { ...newSave(), ...o }; } catch { /* こわれていたら あたらしく */ }
  return newSave();
}
const slot = (save, id) => (save.worlds[id] ||= { clear: false, stars: 0, reached: 0 });
export function recordStage(save, id, stageIdx, total) { const w = slot(save, id); w.reached = stageIdx + 1 >= total ? 0 : stageIdx + 1; return save; }
export function recordClear(save, id, stars) { const w = slot(save, id); w.clear = true; w.reached = 0; w.stars = Math.max(w.stars, stars); return save; }
// ともだち：あつめた ★の かずで ふえる。バグバグは エンディングの あと
export const totalStars = save => Object.values(save.worlds).reduce((a, w) => a + (w.clear ? w.stars : 0), 0);
export const friendsOf = save => { const n = totalStars(save); return FRIENDS.filter(f => (f.ending ? save.ending : n >= f.need)); };
export const nextFriend = save => { const n = totalStars(save); return FRIENDS.find(f => !f.ending && n < f.need) || null; };
export function recordMix(save, score) { const m = (save.mix ||= { best: 0, plays: 0 }); m.plays++; const isBest = score > m.best; m.best = Math.max(m.best, score); return isBest; }
export const finalUnlocked = (save, ids) => ids.every(id => save.worlds[id]?.clear);
