// まもれ！キングダム：ゲームの 計算（がめんには さわらない）
import {
  FIELD, PATH_W, TOWER_R, TOWERS, TOWER_IDS, UP_MUL, SELL_RATE, ENEMIES, HEROES, HERO_IDS, HERO_LV_COST, HERO_LV_MAX,
  DIFFS, STAGES, POW_COST, POW_STEP, CASTLE_UPS, GUARD, BASE_GOLD, BASE_LIVES, waveSpec, hpScale,
} from './data.mjs';

export * from './data.mjs';

const hyp = Math.hypot;

// ───────── 道 ─────────
export function buildPath(pts) {
  const segs = [];
  let len = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], l = hyp(x2 - x1, y2 - y1);
    segs.push({ x1, y1, x2, y2, l, at: len });
    len += l;
  }
  return { pts, segs, len };
}
export function pathPos(p, d) {
  d = Math.max(0, Math.min(p.len, d));
  for (const s of p.segs) {
    if (d <= s.at + s.l) {
      const k = s.l ? (d - s.at) / s.l : 0;
      return { x: s.x1 + (s.x2 - s.x1) * k, y: s.y1 + (s.y2 - s.y1) * k };
    }
  }
  const s = p.segs[p.segs.length - 1];
  return { x: s.x2, y: s.y2 };
}
function segNearest(s, x, y) {
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
  const k = s.l ? Math.max(0, Math.min(1, ((x - s.x1) * dx + (y - s.y1) * dy) / (s.l * s.l))) : 0;
  const px = s.x1 + dx * k, py = s.y1 + dy * k;
  return { x: px, y: py, dist: hyp(x - px, y - py), d: s.at + s.l * k };
}
// いちばん 近い 道の 点
export function nearestOnPaths(paths, x, y) {
  let best = null;
  paths.forEach((p, pi) => {
    for (const s of p.segs) {
      const n = segNearest(s, x, y);
      if (!best || n.dist < best.dist) best = { ...n, path: pi };
    }
  });
  return best;
}

// ───────── ずっと のこる データ ─────────
export function newMeta() {
  return {
    v: 1, gems: 0, pow: {}, castle: {}, towers: { archer: 1, cannon: 1 }, heroes: { squire: 1 }, hero: 'squire',
    clears: {}, best: {}, runs: 0, totalGems: 0, hint: 0, sound: true,
  };
}
export function loadMeta(json) {
  const m = newMeta();
  try {
    const o = typeof json === 'string' ? JSON.parse(json) : json;
    if (o && typeof o === 'object') {
      for (const k of Object.keys(m)) if (o[k] != null && typeof o[k] === typeof m[k]) m[k] = o[k];
    }
  } catch { /* こわれた データは すてる */ }
  m.gems = Math.max(0, Math.floor(m.gems) || 0);
  m.towers.archer = 1; m.towers.cannon = 1; m.heroes.squire = m.heroes.squire || 1;
  if (!m.heroes[m.hero]) m.hero = 'squire';
  return m;
}
export const clearKey = (stageId, diffId) => `${stageId}:${diffId}`;
export function stageOpen(meta, si) { return si === 0 || !!meta.clears[clearKey(STAGES[si - 1].id, 'normal')]; }
export function diffOpen(meta, si, di) {
  if (!stageOpen(meta, si)) return false;
  return di === 0 || !!meta.clears[clearKey(STAGES[si].id, DIFFS[di - 1].id)];
}
export function endlessOpen(meta, si) { return !!meta.clears[clearKey(STAGES[si].id, 'normal')]; }
// おしろの 見た目の レベル（0〜4）
export function castleLevel(meta) {
  const c = meta.castle, n = (c.gold || 0) + (c.life || 0) + (c.guard || 0) * 2;
  return Math.min(4, Math.floor(n / 4));
}

// おみせに ならぶ もの
export function shopItems(meta) {
  const out = [];
  for (const id of TOWER_IDS) {
    const T = TOWERS[id];
    if (!meta.towers[id]) {
      out.push({ id: 'tower_' + id, cat: 'tower', ref: id, kind: 'unlock', name: T.name, icon: T.icon, desc: T.desc, lv: 0, max: 1, cost: T.unlock });
    } else {
      const lv = meta.pow[id] || 0;
      out.push({ id: 'pow_' + id, cat: 'tower', ref: id, kind: 'pow', name: T.name, icon: T.icon,
        desc: `強さ +${Math.round(POW_STEP * 100)}%`, lv, max: POW_COST.length, cost: POW_COST[lv] ?? null });
    }
  }
  for (const id of HERO_IDS) {
    const H = HEROES[id], lv = meta.heroes[id] || 0;
    out.push({ id: 'hero_' + id, cat: 'hero', ref: id, kind: lv ? 'herolv' : 'unlock', name: H.name, icon: H.icon,
      desc: `${H.desc} わざ「${H.skill.name}」`, lv, max: HERO_LV_MAX, cost: lv ? (HERO_LV_COST[lv] ?? null) : H.cost });
  }
  for (const [id, U] of Object.entries(CASTLE_UPS)) {
    const lv = meta.castle[id] || 0;
    out.push({ id: 'castle_' + id, cat: 'castle', ref: id, kind: 'castle', name: U.name, icon: U.icon, desc: U.desc, lv, max: U.cost.length, cost: U.cost[lv] ?? null });
  }
  for (const it of out) it.can = it.cost != null && it.lv < it.max && meta.gems >= it.cost;
  return out;
}
export function buy(meta, itemId) {
  const it = shopItems(meta).find(i => i.id === itemId);
  if (!it || !it.can) return false;
  meta.gems -= it.cost;
  if (it.cat === 'tower') { if (it.kind === 'unlock') meta.towers[it.ref] = 1; else meta.pow[it.ref] = it.lv + 1; }
  else if (it.cat === 'hero') { meta.heroes[it.ref] = it.lv + 1; if (it.kind === 'unlock') meta.hero = it.ref; }
  else meta.castle[it.ref] = it.lv + 1;
  return true;
}

// ───────── タワーの 強さ ─────────
export function towerStats(type, lv, branch, pow = 0) {
  const T = TOWERS[type];
  const s = { ...(lv <= 3 ? T.lv[lv - 1] : T[branch].lv[lv - 4]) };
  const m = 1 + POW_STEP * pow;
  s.dmg = Math.round(s.dmg * m);
  if (s.hp) s.hp = Math.round(s.hp * m);
  if (s.burn) s.burn = Math.round(s.burn * m);
  return s;
}
export function upgradeCost(t) {
  if (t.lv >= 5) return null;
  return Math.round(TOWERS[t.type].cost * UP_MUL[t.lv - 1] / 5) * 5;
}
export function heroStats(id, lv = 1) {
  const H = HEROES[id], m = 1 + 0.35 * (lv - 1);
  return { ...H, hp: Math.round(H.hp * m), dmg: Math.round(H.dmg * m), skill: { ...H.skill, dmg: H.skill.dmg ? Math.round(H.skill.dmg * m) : 0 } };
}

// ───────── バトル ─────────
export function createBattle(meta, stageId, diffId = 'normal', endless = false) {
  const si = STAGES.findIndex(s => s.id === stageId), st = STAGES[si], diff = DIFFS.find(d => d.id === diffId);
  const paths = st.paths.map(buildPath);
  const lives = BASE_LIVES + CASTLE_UPS.life.step * (meta.castle.life || 0);
  const hs = heroStats(meta.hero, meta.heroes[meta.hero] || 1);
  const hp0 = pathPos(paths[0], paths[0].len - 70);
  const g = {
    si, stage: st, diff, endless, paths, t: 0,
    gold: BASE_GOLD + CASTLE_UPS.gold.step * (meta.castle.gold || 0), lives, maxLives: lives,
    wave: 0, cleared: 0, waveActive: false, waveT: 0, spawns: [], auto: false, autoT: 0,
    enemies: [], towers: [], soldiers: [], shots: [], events: [], nextId: 1, kills: 0, over: null, buffT: 0,
    pow: { ...meta.pow }, unlocked: { ...meta.towers },
    guard: GUARD[meta.castle.guard || 0] ? { ...GUARD[meta.castle.guard], x: st.castle[0], y: st.castle[1] - 30, cd: 0 } : null,
    hero: { type: meta.hero, s: hs, x: hp0.x, y: hp0.y, tx: hp0.x, ty: hp0.y, hp: hs.hp, maxHp: hs.hp, cd: 0, skillCd: 0, downT: 0, block: hs.block, hero: true, face: 1, fx: null },
  };
  return g;
}
const ev = (g, e) => { if (g.events.length < 400) g.events.push(e); };

export function placeReason(g, type, x, y) {
  if (!g.unlocked[type]) return 'lock';
  if (x < 26 || x > FIELD.w - 26 || y < 62 || y > FIELD.h - 26) return 'edge';
  const n = nearestOnPaths(g.paths, x, y);
  if (n.dist < PATH_W + TOWER_R - 4) return 'path';
  const [cx, cy] = g.stage.castle;
  if (hyp(x - cx, y - cy + 10) < 82) return 'castle';
  for (const t of g.towers) if (hyp(t.x - x, t.y - y) < TOWER_R * 2 - 2) return 'tower';
  if (type === 'barracks' && n.dist > TOWERS.barracks.lv[0].range) return 'far';
  return null;
}
export const canPlace = (g, type, x, y) => !placeReason(g, type, x, y);

function rally(g, t) {
  if (t.type !== 'barracks') return;
  const n = nearestOnPaths(g.paths, t.x, t.y);
  t.rally = { path: n.path, d: n.d };
  syncSoldiers(g, t);
}
function syncSoldiers(g, t) {
  const s = towerStats(t.type, t.lv, t.branch, g.pow[t.type]);
  const mine = g.soldiers.filter(o => o.owner === t.id);
  const p = g.paths[t.rally.path];
  for (let i = 0; i < s.n; i++) {
    const off = (i - (s.n - 1) / 2) * 15;
    const pos = pathPos(p, t.rally.d + off);
    const side = (i % 2 ? 1 : -1) * 6;
    let o = mine[i];
    if (!o) { o = { id: g.nextId++, owner: t.id, hp: s.hp, downT: 0, cd: 0, block: 1, x: pos.x, y: pos.y + side }; g.soldiers.push(o); }
    const ratio = o.maxHp ? o.hp / o.maxHp : 1;
    Object.assign(o, { x: pos.x, y: pos.y + side, maxHp: s.hp, hp: Math.max(o.downT > 0 ? 0 : 1, Math.round(s.hp * ratio)), dmg: s.dmg, rate: s.rate, elite: t.branch === 'a', lv: t.lv });
  }
}
export function placeTower(g, type, x, y) {
  const T = TOWERS[type];
  if (g.over || g.gold < T.cost || !canPlace(g, type, x, y)) return null;
  g.gold -= T.cost;
  const t = { id: g.nextId++, type, x, y, lv: 1, branch: null, cd: 0.2, spent: T.cost, ang: -Math.PI / 2, stunT: 0, fx: null };
  g.towers.push(t);
  rally(g, t);
  ev(g, { t: 'place', x, y });
  return t;
}
export function upgradeTower(g, t, branch) {
  const cost = upgradeCost(t);
  if (g.over || cost == null || g.gold < cost) return false;
  if (t.lv === 3) { if (branch !== 'a' && branch !== 'b') return false; t.branch = branch; }
  g.gold -= cost; t.spent += cost; t.lv++;
  if (t.type === 'barracks') syncSoldiers(g, t);
  ev(g, { t: 'upgrade', x: t.x, y: t.y, evolve: t.lv === 4 });
  return true;
}
export const sellValue = t => Math.floor(t.spent * SELL_RATE);
export function sellTower(g, t) {
  const i = g.towers.indexOf(t);
  if (i < 0) return false;
  g.towers.splice(i, 1);
  g.soldiers = g.soldiers.filter(o => o.owner !== t.id);
  for (const e of g.enemies) if (e.blockedBy && e.blockedBy.owner === t.id) e.blockedBy = null;
  g.gold += sellValue(t);
  ev(g, { t: 'sell', x: t.x, y: t.y });
  return true;
}

export function waveCount(g) { return g.endless ? Infinity : g.stage.waves; }
export function startWave(g) {
  if (g.over || g.waveActive || g.wave >= waveCount(g)) return false;
  const w = g.wave, mul = g.stage.hp * g.diff.hp * hpScale(w, g.endless);
  g.spawns = [];
  for (const grp of waveSpec(g.si, w, g.endless)) {
    for (let i = 0; i < grp.count; i++) g.spawns.push({ at: grp.delay + i * grp.gap, type: grp.type, path: grp.path, mul, w });
  }
  g.spawns.sort((a, b) => a.at - b.at);
  g.wave++; g.waveActive = true; g.waveT = 0;
  ev(g, { t: 'wave', n: g.wave, boss: g.spawns.some(s => ENEMIES[s.type].boss) });
  return true;
}
function spawn(g, type, path, d, mul, w) {
  const E = ENEMIES[type], p = pathPos(g.paths[path], d);
  const e = {
    id: g.nextId++, type, path, d, x: p.x, y: p.y, hp: Math.round(E.hp * mul), spd: E.spd, armor: E.armor || 0, atk: E.atk * Math.sqrt(mul),
    fly: !!E.fly, boss: !!E.boss, r: E.r, gold: Math.round(E.gold * (1 + 0.03 * w)), leak: E.leak, mul, w,
    slowT: 0, slow: 0, stunT: 0, burnT: 0, burn: 0, vulnT: 0, vuln: 1, blockedBy: null, auraT: E.aura ? E.aura.every * 0.6 : 0, hitT: 0, dead: false, face: -1,
  };
  e.maxHp = e.hp;
  g.enemies.push(e);
  return e;
}

export function damage(g, e, dmg, pierce = false) {
  if (e.dead) return 0;
  let v = pierce ? dmg : Math.max(dmg - e.armor, dmg * 0.25);
  if (e.vulnT > 0) v *= e.vuln;
  e.hp -= v; e.hitT = 0.12;
  if (e.hp <= 0) { e.dead = true; g.kills++; g.gold += e.gold; ev(g, { t: 'die', x: e.x, y: e.y, type: e.type, gold: e.gold, boss: e.boss }); }
  return v;
}
const targetable = (e, air) => !e.dead && (air || !e.fly);
const remain = (g, e) => g.paths[e.path].len - e.d;
function firstInRange(g, x, y, range, air) {
  let best = null, br = Infinity;
  for (const e of g.enemies) {
    if (!targetable(e, air) || hyp(e.x - x, e.y - y) > range + e.r) continue;
    const r = remain(g, e);
    if (r < br) { br = r; best = e; }
  }
  return best;
}
function splash(g, x, y, r, dmg, o = {}) {
  for (const e of g.enemies) {
    if (!targetable(e, o.air) || hyp(e.x - x, e.y - y) > r + e.r) continue;
    damage(g, e, dmg, o.pierce);
    if (o.burn && !e.dead) { e.burn = Math.max(e.burn, o.burn); e.burnT = Math.max(e.burnT, o.burnT); }
    if (o.stun && !e.dead) e.stunT = Math.max(e.stunT, e.boss ? o.stun * 0.4 : o.stun);
  }
}
function chain(g, from, first, s) {
  const pts = [[from.x, from.y - 18], [first.x, first.y]], hit = new Set([first]);
  damage(g, first, s.dmg, s.pierce);
  let cur = first;
  for (let i = 0; i < s.chain; i++) {
    let nx = null, nd = 95;
    for (const e of g.enemies) { if (e.dead || hit.has(e)) continue; const d = hyp(e.x - cur.x, e.y - cur.y); if (d < nd) { nd = d; nx = e; } }
    if (!nx) break;
    hit.add(nx); pts.push([nx.x, nx.y]); damage(g, nx, s.dmg * 0.7, s.pierce); cur = nx;
  }
  ev(g, { t: 'bolt', pts, kind: 'zap' });
}
function beam(g, t, tg, s) {
  const dx = tg.x - t.x, dy = tg.y - t.y, l = hyp(dx, dy) || 1, ex = t.x + dx / l * s.range, ey = t.y + dy / l * s.range;
  const seg = { x1: t.x, y1: t.y, x2: ex, y2: ey, l: s.range };
  for (const e of g.enemies) {
    if (e.dead) continue;
    if (segNearest(seg, e.x, e.y).dist > s.beam / 2 + e.r) continue;
    damage(g, e, s.dmg, false);
    if (s.burn && !e.dead) { e.burn = Math.max(e.burn, s.burn); e.burnT = Math.max(e.burnT, s.burnT); }
  }
  t.fx = { x2: ex, y2: ey, w: s.beam, until: g.t + 0.3 };
}

function fireTower(g, t, s) {
  const T = TOWERS[t.type];
  if (t.type === 'ice') {
    let any = false;
    for (const e of g.enemies) {
      if (e.dead || hyp(e.x - t.x, e.y - t.y) > s.range + e.r) continue;
      any = true;
      damage(g, e, s.dmg, true);
      if (e.dead) continue;
      const sl = e.boss ? s.slow * 0.5 : s.slow;
      if (sl >= e.slow || e.slowT <= 0) { e.slow = sl; e.slowT = s.slowT; }
      if (s.stun) e.stunT = Math.max(e.stunT, e.boss ? s.stun * 0.4 : s.stun);
      if (s.vuln) { e.vuln = s.vuln; e.vulnT = s.slowT; }
    }
    if (any) ev(g, { t: 'pulse', x: t.x, y: t.y, r: s.range, freeze: !!s.stun });
    return any;
  }
  const tg = firstInRange(g, t.x, t.y, s.range, T.air);
  if (!tg) return false;
  t.ang = Math.atan2(tg.y - t.y, tg.x - t.x);
  if (s.chain) chain(g, t, tg, s);
  else if (s.beam) beam(g, t, tg, s);
  else if (t.type === 'mage') {
    damage(g, tg, s.dmg, true);
    if (s.splash) splash(g, tg.x, tg.y, s.splash, s.dmg * 0.5, { air: true, pierce: true });
    ev(g, { t: 'bolt', pts: [[t.x, t.y - 22], [tg.x, tg.y]], kind: t.branch === 'b' ? 'big' : 'magic' });
  } else {
    g.shots.push({ kind: t.type, x: t.x, y: t.y - 14, sx: t.x, sy: t.y - 14, tx: tg.x, ty: tg.y, target: tg, spd: t.type === 'cannon' ? 330 : 560, s, air: T.air, big: t.lv >= 4 });
    ev(g, { t: 'shot', kind: t.type });
  }
  return true;
}

function useBlockers(g, dt) {
  const hero = g.hero, blockers = g.soldiers.filter(o => o.downT <= 0);
  if (hero.downT <= 0 && hero.block) blockers.push(hero);
  for (const b of blockers) b.eng = 0;
  for (const e of g.enemies) {
    const b = e.blockedBy;
    if (!b) continue;
    if (e.dead || b.downT > 0 || b.hp <= 0 || (b.owner && !g.soldiers.includes(b)) || hyp(b.x - e.x, b.y - e.y) > 40 + e.r) e.blockedBy = null;
    else b.eng++;
  }
  for (const e of g.enemies) {
    if (e.dead || e.fly || e.blockedBy) continue;
    for (const b of blockers) {
      if (b.eng >= b.block || hyp(b.x - e.x, b.y - e.y) > 16 + e.r) continue;
      if (b.hero && (hyp(b.tx - b.x, b.ty - b.y) > 2)) continue;
      e.blockedBy = b; b.eng++; break;
    }
  }
  for (const e of g.enemies) {
    const b = e.blockedBy;
    if (!b || e.dead || e.stunT > 0) continue;
    b.hp -= e.atk * dt;
    if (b.hp <= 0) {
      b.hp = 0; b.downT = b.hero ? 9 : 7;
      ev(g, { t: b.hero ? 'heroDown' : 'soldierDown', x: b.x, y: b.y });
    }
  }
  // へいしの こうげきと かいふく
  for (const o of g.soldiers) {
    if (o.downT > 0) { o.downT -= dt; if (o.downT <= 0) { o.hp = o.maxHp; ev(g, { t: 'soldierUp', x: o.x, y: o.y }); } continue; }
    o.cd -= dt;
    let tg = null, bd = 30;
    for (const e of g.enemies) { if (e.dead || e.fly) continue; const d = hyp(e.x - o.x, e.y - o.y) - e.r; if (d < bd) { bd = d; tg = e; } }
    if (tg) { o.face = tg.x < o.x ? -1 : 1; if (o.cd <= 0) { o.cd = o.rate; o.swing = g.t; damage(g, tg, o.dmg); } }
    else o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.06 * dt);
  }
}

function stepHero(g, dt) {
  const h = g.hero, s = h.s;
  h.skillCd = Math.max(0, h.skillCd - dt);
  if (h.downT > 0) { h.downT -= dt; if (h.downT <= 0) { h.hp = h.maxHp; ev(g, { t: 'heroUp', x: h.x, y: h.y }); } return; }
  const dx = h.tx - h.x, dy = h.ty - h.y, l = hyp(dx, dy);
  h.moving = l > 1;
  if (h.moving) {
    const st = Math.min(l, s.spd * dt);
    h.x += dx / l * st; h.y += dy / l * st; h.face = dx < 0 ? -1 : 1;
    for (const e of g.enemies) if (e.blockedBy === h) e.blockedBy = null;
    if (!s.fly) return;
  }
  h.cd -= dt;
  const tg = firstInRange(g, h.x, h.y, s.range, !!s.air);
  if (tg) {
    h.face = tg.x < h.x ? -1 : 1;
    if (h.cd <= 0) {
      h.cd = s.rate; h.swing = g.t;
      if (h.type === 'mage') {
        damage(g, tg, s.dmg, true); splash(g, tg.x, tg.y, s.splash, s.dmg * 0.5, { air: true, pierce: true });
        ev(g, { t: 'bolt', pts: [[h.x, h.y - 26], [tg.x, tg.y]], kind: 'magic' });
      } else if (h.type === 'rider') {
        splash(g, tg.x, tg.y, s.splash, s.dmg, { air: true });
        h.fx = { x2: tg.x, y2: tg.y, w: 26, until: g.t + 0.3 };
      } else {
        if (s.cleave) splash(g, h.x, h.y, s.cleave + 10, s.dmg, {}); else damage(g, tg, s.dmg);
        ev(g, { t: 'slash', x: tg.x, y: tg.y });
      }
    }
  } else if (!h.eng) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.05 * dt);
}
export function moveHero(g, x, y) {
  const h = g.hero;
  if (g.over) return false;
  x = Math.max(16, Math.min(FIELD.w - 16, x)); y = Math.max(50, Math.min(FIELD.h - 16, y));
  if (h.block) { const n = nearestOnPaths(g.paths, x, y); if (n.dist < 60) { x = n.x; y = n.y; } }
  h.tx = x; h.ty = y;
  return true;
}
// ひっさつわざ。ねらう わざは x, y に おとす
export function useSkill(g, x, y) {
  const h = g.hero, k = h.s.skill;
  if (g.over || h.downT > 0 || h.skillCd > 0) return false;
  if (k.aim && (x == null || y == null)) return false;
  h.skillCd = k.cd;
  if (k.id === 'cheer') g.buffT = 6;
  else if (k.id === 'spin') splash(g, h.x, h.y, k.r, k.dmg, { air: true, stun: k.stun });
  else if (k.id === 'meteor') splash(g, x, y, k.r, k.dmg, { air: true, pierce: true, burn: k.burn, burnT: k.burnT });
  else if (k.id === 'breath') splash(g, FIELD.w / 2, FIELD.h / 2, 2000, k.dmg, { air: true, burn: k.burn, burnT: k.burnT });
  ev(g, { t: 'skill', id: k.id, x: k.aim ? x : h.x, y: k.aim ? y : h.y, r: k.r || 0 });
  return true;
}

export function step(g, dt) {
  if (g.over) return;
  g.t += dt;
  g.buffT = Math.max(0, g.buffT - dt);
  if (g.waveActive) {
    g.waveT += dt;
    while (g.spawns.length && g.spawns[0].at <= g.waveT) { const s = g.spawns.shift(); spawn(g, s.type, s.path, 0, s.mul, s.w); }
  } else if (g.auto && g.wave > 0 && g.wave < waveCount(g)) {
    g.autoT -= dt;
    if (g.autoT <= 0) startWave(g);
  }
  // てき
  for (const e of g.enemies) {
    if (e.dead) continue;
    const E = ENEMIES[e.type];
    e.hitT = Math.max(0, e.hitT - dt);
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slow = 0; }
    if (e.vulnT > 0) e.vulnT -= dt;
    if (e.burnT > 0) { e.burnT -= dt; e.hp -= e.burn * dt * (e.vulnT > 0 ? e.vuln : 1); if (e.hp <= 0) { e.hp = 0; damage(g, e, 1, true); continue; } }
    if (E.heal) {
      for (const o of g.enemies) if (o !== e && !o.dead && o.hp < o.maxHp && hyp(o.x - e.x, o.y - e.y) < E.healR) o.hp = Math.min(o.maxHp, o.hp + E.heal * e.mul * dt);
    }
    if (E.aura) {
      e.auraT -= dt;
      if (e.auraT <= 0) {
        e.auraT = E.aura.every;
        let any = false;
        for (const t of g.towers) if (hyp(t.x - e.x, t.y - e.y) < E.aura.r) { t.stunT = E.aura.dur; t.stunKind = E.aura.kind; any = true; }
        ev(g, { t: 'aura', x: e.x, y: e.y, r: E.aura.r, kind: E.aura.kind, any });
      }
    }
    if (e.stunT > 0) { e.stunT -= dt; continue; }
    if (e.blockedBy) continue;
    e.d += e.spd * (1 - e.slow) * dt;
    const p = g.paths[e.path], pos = pathPos(p, e.d);
    if (Math.abs(pos.x - e.x) > 0.01) e.face = pos.x < e.x ? -1 : 1;
    e.x = pos.x; e.y = pos.y;
    if (e.d >= p.len) {
      e.dead = true; e.leaked = true;
      g.lives = Math.max(0, g.lives - e.leak);
      ev(g, { t: 'leak', x: e.x, y: e.y, n: e.leak });
    }
  }
  useBlockers(g, dt);
  stepHero(g, dt);
  // タワー
  const haste = g.buffT > 0 ? 1.5 : 1;
  for (const t of g.towers) {
    if (t.stunT > 0) { t.stunT -= dt; continue; }
    if (t.type === 'barracks') continue;
    t.cd -= dt * haste;
    if (t.cd > 0) continue;
    const s = towerStats(t.type, t.lv, t.branch, g.pow[t.type]);
    t.cd = fireTower(g, t, s) ? s.rate : 0.1;
  }
  if (g.guard) {
    const q = g.guard;
    q.cd -= dt * haste;
    if (q.cd <= 0) {
      const tg = firstInRange(g, q.x, q.y, q.range, true);
      if (tg) { q.cd = q.rate; g.shots.push({ kind: 'archer', x: q.x, y: q.y, sx: q.x, sy: q.y, tx: tg.x, ty: tg.y, target: tg, spd: 560, s: { dmg: q.dmg }, air: true }); ev(g, { t: 'shot', kind: 'archer' }); }
      else q.cd = 0.1;
    }
  }
  // たま
  for (const b of g.shots) {
    if (b.target && !b.target.dead) { b.tx = b.target.x; b.ty = b.target.y; }
    const dx = b.tx - b.x, dy = b.ty - b.y, l = hyp(dx, dy), st = b.spd * dt;
    if (l <= st + 4) {
      b.done = true;
      if (b.s.splash) { splash(g, b.tx, b.ty, b.s.splash, b.s.dmg, { air: b.air, burn: b.s.burn, burnT: b.s.burnT }); ev(g, { t: 'boom', x: b.tx, y: b.ty, r: b.s.splash, fire: !!b.s.burn }); }
      else if (b.target && !b.target.dead) { damage(g, b.target, b.s.dmg, b.s.pierce); ev(g, { t: 'hit', x: b.tx, y: b.ty }); }
    } else { b.x += dx / l * st; b.y += dy / l * st; b.ang = Math.atan2(dy, dx); }
  }
  g.shots = g.shots.filter(b => !b.done);
  // たおれた てきを かたづける
  if (g.enemies.some(e => e.dead)) {
    const add = [];
    for (const e of g.enemies) {
      const sp = ENEMIES[e.type].split;
      if (e.dead && !e.leaked && sp) for (let i = 0; i < 2; i++) add.push([sp, e.path, Math.max(0, e.d - 6 - i * 14), e.mul, e.w]);
    }
    g.enemies = g.enemies.filter(e => !e.dead);
    for (const a of add) spawn(g, ...a);
  }
  if (g.lives <= 0) { g.over = 'lose'; ev(g, { t: 'lose' }); return; }
  if (g.waveActive && !g.spawns.length && !g.enemies.length) {
    g.waveActive = false; g.cleared++;
    const bonus = 25 + 6 * (g.wave - 1);
    g.gold += bonus; g.autoT = 2.5;
    ev(g, { t: 'waveClear', n: g.wave, bonus });
    if (g.cleared >= waveCount(g)) { g.over = 'win'; ev(g, { t: 'win' }); }
  }
}

// ───────── ほうしゅう ─────────
export function battleGems(g) {
  const st = g.stage;
  let v = 0;
  for (let w = 0; w < g.cleared; w++) v += st.gemWave * (g.endless ? 1 + w / 8 : 1);
  if (g.over === 'win') v += st.gemWin;
  return Math.round(v * g.diff.gem);
}
// バトルの けっかを ずっと のこる データに 足す
export function applyResult(meta, g) {
  const base = battleGems(g), key = clearKey(g.stage.id, g.diff.id);
  const first = g.over === 'win' && !g.endless && !meta.clears[key];
  const bonus = first ? Math.round(base * 0.5) : 0;
  if (g.over === 'win' && !g.endless) meta.clears[key] = 1;
  const bk = g.stage.id + (g.endless ? ':endless' : ':' + g.diff.id);
  const newBest = g.cleared > (meta.best[bk] || 0);
  if (newBest) meta.best[bk] = g.cleared;
  meta.gems += base + bonus; meta.totalGems += base + bonus; meta.runs++;
  return { base, bonus, total: base + bonus, first, newBest, waves: g.cleared };
}
