// お店と お客さんの しくみ。DOM を使わない（テストで 1こまずつ 動かせる）。
import {
  B, BLOCKS, ITEM, START_ITEMS, LEVELS, MAX_LEVEL, CUSTOMER_TYPES, REGULARS, REGULAR, GIFT_VISITS,
  CRITERIA, GOALS, TALK,
} from './blocks.mjs';
import {mulberry32, HOUSE_SLOTS, GROUND, ROAD_Z0, ROAD_Z1} from './world.mjs';

export const SHELF_MAX = 8;
export const SHOP_RADIUS = 8;
export const STAR_STEPS = [0.2, 0.42, 0.65, 0.88]; // これを こえると ★が ふえる
export const WALK_SPEED = 2.3;

export function levelFor(total) {
  let l = 1;
  for (let i = 0; i < LEVELS.length; i++) if (total >= LEVELS[i]) l = i + 1;
  return Math.min(l, MAX_LEVEL);
}
export function starsFor(score) {
  let s = 1;
  for (const t of STAR_STEPS) if (score >= t) s++;
  return s;
}

export class Game {
  constructor(world, state = {}) {
    this.world = world;
    this.coins = num(state.coins, 30);
    this.totalSales = num(state.totalSales, 0);
    this.unlocked = new Set(Array.isArray(state.unlocked) ? state.unlocked.filter(k => ITEM[k]) : START_ITEMS);
    for (const k of START_ITEMS) this.unlocked.add(k);
    this.gifts = new Set(Array.isArray(state.gifts) ? state.gifts.filter(k => B[k] && BLOCKS[B[k]].gift) : []);
    this.regulars = state.regulars && typeof state.regulars === 'object' ? state.regulars : {};
    this.goalIndex = Math.min(num(state.goalIndex, 0), GOALS.length);
    this.flags = {restock: false, unlock: false, register: false, ...(state.flags || {})};
    this.stats = {sold: 0, served: 0, ...(state.stats || {})};
    this.missed = state.missed && typeof state.missed === 'object' ? state.missed : {};
    this.customers = [];
    this.events = [];
    this.spawnTimer = 2;
    this.nextId = 1;
    this.rnd = mulberry32(state.seed ?? (Date.now() & 0xffffffff));
    this.stockVersion = 0;
    this.shopCache = null;
    this.shopKey = '';
    this.time = 0;
    this.noShopHintTimer = 0;
    // サンドボックス：コイン むげん、品物・プレゼント・お客さんが ぜんぶ
    this.sandbox = !!state.sandbox;
    if (this.sandbox) {
      for (const it of Object.values(ITEM)) this.unlocked.add(it.key);
      for (const b of BLOCKS) if (b && b.gift) this.gifts.add(b.key);
    }
  }

  get level() { return this.sandbox ? MAX_LEVEL : levelFor(this.totalSales); }
  nextLevelAt() { return LEVELS[this.level] ?? null; }

  toJSON() {
    return {
      coins: this.coins, totalSales: this.totalSales, unlocked: [...this.unlocked], gifts: [...this.gifts],
      regulars: this.regulars, goalIndex: this.goalIndex, flags: this.flags, stats: this.stats, missed: this.missed,
      sandbox: this.sandbox,
    };
  }

  emit(type, data = {}) { this.events.push({type, ...data}); }
  takeEvents() { const e = this.events; this.events = []; return e; }

  // ---------- 店の ひょうか ----------
  shops() {
    const key = this.world.version + ':' + this.stockVersion;
    if (this.shopCache && this.shopKey === key) return this.shopCache;
    const w = this.world;
    const shops = [...w.registers].map(i => ({i, ...w.pos(i), shelves: []}));
    for (const [si, shelf] of w.shelves) {
      const p = w.pos(si);
      let best = null, bd = Infinity;
      // おなじ 階の レジを えらびやすく する（上下は 2ばいの きょりと して 見る）
      for (const s of shops) {
        const dy = Math.abs(s.y - p.y);
        if (dy > 6) continue;
        const flat = Math.hypot(s.x - p.x, s.z - p.z);
        const d = flat + dy * 2;
        if (flat <= SHOP_RADIUS && d < bd) { bd = d; best = s; }
      }
      if (best) best.shelves.push(si);
      shelf.shop = best ? best.i : null;
    }
    for (const s of shops) Object.assign(s, this.evaluate(s));
    this.shopCache = shops;
    this.shopKey = key;
    return shops;
  }

  evaluate(shop) {
    const w = this.world, R = SHOP_RADIUS;
    const goods = new Set();
    for (const si of shop.shelves) { const s = w.shelves.get(si); if (s && s.item && s.stock > 0) goods.add(s.item); }
    let lights = 0, deco = 0, signText = '', hasSign = false, signD = Infinity;
    const kinds = new Set();
    for (let dy = -1; dy <= 6; dy++) for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
      if (dx * dx + dz * dz > R * R) continue;
      const x = shop.x + dx, y = shop.y + dy, z = shop.z + dz;
      const id = w.get(x, y, z);
      if (!id) continue;
      const b = BLOCKS[id];
      if (b.light) lights++;
      if (b.deco) { deco++; kinds.add(id); }
      if (id === B.SIGN) {
        hasSign = true;
        const t = w.signs.get(w.idx(x, y, z)) || '';
        const d = dx * dx + dz * dz;
        if (t && d < signD) { signD = d; signText = t; }
      }
    }
    // 屋根：レジと たなの 上に ブロックが あるか
    const cells = [shop, ...shop.shelves.map(i => w.pos(i))];
    let covered = 0;
    for (const c of cells) {
      for (let dy = 1; dy <= 8; dy++) { const id = w.get(c.x, c.y + dy, c.z); if (id && BLOCKS[id].solid) { covered++; break; } }
    }
    // 広さ：レジの まわりから 歩ける マスを かぞえる
    let space = 0;
    const start = w.standCellsAround(shop.x, shop.y, shop.z);
    const seen = new Set(start.map(c => w.idx(c.x, c.y, c.z)));
    const queue = [...start];
    while (queue.length && space < 60) {
      const c = queue.shift();
      space++;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (const dy of [0, 1, -1]) {
        const nx = c.x + dx, ny = c.y + dy, nz = c.z + dz;
        if ((nx - shop.x) ** 2 + (nz - shop.z) ** 2 > R * R || Math.abs(ny - shop.y) > 2) continue;
        const ni = w.idx(nx, ny, nz);
        if (seen.has(ni) || !w.canStand(nx, ny, nz)) continue;
        seen.add(ni); queue.push({x: nx, y: ny, z: nz});
        break;
      }
    }
    const scores = {
      goods: Math.min(1, goods.size / 6),
      light: Math.min(1, lights / 4),
      deco: Math.min(1, (deco + kinds.size) / 10),
      roof: covered / cells.length,
      space: Math.min(1, space / 40),
      sign: signText ? 1 : hasSign ? 0.5 : 0,
    };
    let score = 0;
    for (const c of CRITERIA) score += c.weight * scores[c.key];
    const hints = CRITERIA.filter(c => scores[c.key] < 0.7).sort((a, b) => scores[a.key] - scores[b.key]).map(c => c.hint);
    return {scores, score, stars: starsFor(score), name: signText, goods, hints};
  }

  bestStars() { return this.shops().reduce((m, s) => Math.max(m, s.stars), 0); }

  // ---------- プレイヤーの そうさ ----------
  customerAt(x, y, z) {
    return this.customers.some(c => c.state !== 'gone' && c.cell.x === x && c.cell.z === z && (c.cell.y === y || c.cell.y + 1 === y));
  }
  placeBlock(x, y, z, id, meta = 0) {
    if (this.customerAt(x, y, z) || (id === B.DOOR && this.customerAt(x, y + 1, z))) return false;
    const ok = this.world.place(x, y, z, id, meta);
    if (ok && id === B.REGISTER) this.flags.register = true;
    return ok;
  }
  breakBlock(x, y, z) { return this.world.remove(x, y, z); }

  stockShelf(idx, itemKey) {
    const s = this.world.shelves.get(idx);
    if (!s || !this.unlocked.has(itemKey)) return false;
    s.item = itemKey;
    s.stock = SHELF_MAX;
    this.flags.restock = true;
    this.stockVersion++;
    return true;
  }
  clearShelf(idx) {
    const s = this.world.shelves.get(idx);
    if (!s) return false;
    s.item = null; s.stock = 0; this.stockVersion++;
    return true;
  }
  // その店の たなを ぜんぶ いっぱいに する
  refillShop(regIdx) {
    const shop = this.shops().find(s => s.i === regIdx);
    if (!shop) return 0;
    let n = 0;
    for (const si of shop.shelves) {
      const s = this.world.shelves.get(si);
      if (s && s.item && s.stock < SHELF_MAX) { s.stock = SHELF_MAX; n++; }
    }
    if (n) { this.stockVersion++; this.flags.restock = true; }
    return n;
  }
  canUnlock(key) {
    const it = ITEM[key];
    return !!it && !this.unlocked.has(key) && this.level >= it.level && this.coins >= it.cost;
  }
  unlock(key) {
    if (!this.canUnlock(key)) return false;
    this.coins -= ITEM[key].cost;
    this.unlocked.add(key);
    this.flags.unlock = true;
    return true;
  }
  setSign(idx, text) {
    if (!this.world.signs.has(idx)) return false;
    this.world.signs.set(idx, String(text).trim().slice(0, 12));
    this.world.version++;
    this.world.changes.push(idx);
    return true;
  }
  blockAvailable(id) {
    const b = BLOCKS[id];
    return !!b && !!b.cat && (!b.gift || this.gifts.has(b.key));
  }

  // ---------- 1こま すすめる ----------
  update(dt) {
    this.time += dt;
    const shops = this.shops();
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const stars = shops.reduce((m, s) => Math.max(m, s.stars), 0);
      const interval = 10 / (0.5 + 0.22 * stars) * (1 - 0.06 * (this.level - 1));
      this.spawnTimer = interval * (0.7 + this.rnd() * 0.6);
      const cap = Math.min(14, 2 + stars + this.level);
      if (!shops.length) {
        if (this.time - this.noShopHintTimer > 25) { this.noShopHintTimer = this.time; this.emit('hint', {text: 'レジを おくと お客さんが 来るよ'}); }
      } else if (this.customers.length < cap && this.world.spawns.length) this.spawn();
    }
    for (const c of this.customers) this.step(c, dt);
    const before = this.customers.length;
    this.customers = this.customers.filter(c => c.state !== 'gone');
    if (this.customers.length !== before) this.emit('roster');
    this.checkGoals();
  }

  spawn(forceType = null) {
    const lvl = this.level;
    const types = Object.entries(CUSTOMER_TYPES).filter(([, t]) => t.level <= lvl);
    let typeKey = forceType;
    if (!typeKey) {
      let total = types.reduce((s, [, t]) => s + t.weight, 0), r = this.rnd() * total;
      typeKey = types[0][0];
      for (const [k, t] of types) { r -= t.weight; if (r <= 0) { typeKey = k; break; } }
    }
    const type = CUSTOMER_TYPES[typeKey];
    const present = new Set(this.customers.map(c => c.regular).filter(Boolean));
    const regs = REGULARS.filter(r => r.type === typeKey && !present.has(r.key));
    const regular = regs.length && this.rnd() < 0.5 ? regs[Math.floor(this.rnd() * regs.length)] : null;
    // ほしい 物
    const stocked = new Set();
    for (const s of this.world.shelves.values()) if (s.item && s.stock > 0 && s.shop != null) stocked.add(s.item);
    const likes = type.likes.filter(k => ITEM[k].level <= lvl + 1);
    const likedStocked = likes.filter(k => stocked.has(k));
    const n = type.buys[0] + Math.floor(this.rnd() * (type.buys[1] - type.buys[0] + 1));
    const wants = [];
    for (let k = 0; k < n; k++) {
      const pool = (likedStocked.length && this.rnd() < 0.75 ? likedStocked : likes).filter(x => !wants.includes(x));
      if (!pool.length) break;
      wants.push(pool[Math.floor(this.rnd() * pool.length)]);
    }
    const sp = this.world.spawns[Math.floor(this.rnd() * this.world.spawns.length)];
    const cell = this.world.canStand(sp.x, sp.y, sp.z) ? {...sp} : this.world.nearestStand(sp.x, sp.y, sp.z, 5);
    if (!cell) return null;
    const c = {
      id: this.nextId++, type: typeKey, regular: regular ? regular.key : null, name: regular ? regular.name : type.name,
      look: {...type.look, ...(regular?.look || {})},
      x: cell.x + 0.5, y: cell.y, z: cell.z + 0.5, cell, spawn: {...cell}, yaw: Math.PI,
      path: null, pathI: 0, goals: null, state: 'plan', timer: 0.6, wants, carrying: [], target: null, shop: null,
      life: 0, walking: false, subOk: this.rnd() < 0.6, fade: 1,
    };
    this.customers.push(c);
    this.emit('spawn', {id: c.id});
    if (regular && (this.regulars[regular.key]?.visits || 0) > 0) this.say(c, TALK.regular);
    else if (wants[0]) this.say(c, pick(this.rnd, TALK.want), wants[0]);
    return c;
  }

  say(c, text, item = null) { this.emit('bubble', {id: c.id, text, item}); }

  // プレイヤーが お客さんを タップした
  greet(c) {
    if (!c || c.state === 'poof' || c.state === 'gone') return;
    if (c.carrying.length && c.state !== 'leave') this.say(c, TALK.carry, c.carrying[c.carrying.length - 1].item);
    else if (c.wants[0]) this.say(c, pick(this.rnd, TALK.want), c.wants[0]);
    else if (c.regular) this.say(c, `${c.name}だよ。${pick(this.rnd, TALK.hello)}`);
    else this.say(c, pick(this.rnd, TALK.hello));
  }

  shopOfShelf(si) { const s = this.world.shelves.get(si); return s ? s.shop : null; }

  // 店の たなで その品物が ある ところ（★が 高い 店から）
  findShelves(pred) {
    const shops = this.shops();
    const stars = new Map(shops.map(s => [s.i, s.stars]));
    const out = [];
    for (const [si, s] of this.world.shelves) {
      if (s.shop == null || !s.item || s.stock <= 0 || !pred(s.item)) continue;
      out.push({si, stars: stars.get(s.shop) || 0});
    }
    return out.sort((a, b) => b.stars - a.stars);
  }

  goTo(c, goals, state) {
    const path = goals.length ? this.world.findPath(c.cell, goals) : null;
    if (!path) return false;
    c.path = path; c.pathI = 0; c.goals = goals; c.state = state; c.walking = true;
    c.goalCell = path[path.length - 1];
    return true;
  }

  leave(c) {
    c.target = null;
    if (!this.goTo(c, [c.spawn], 'leave')) { c.state = 'poof'; c.timer = 0.6; }
  }

  step(c, dt) {
    c.life += dt;
    const w = this.world;
    if (w.solid(c.cell.x, c.cell.y, c.cell.z) || w.solid(c.cell.x, c.cell.y + 1, c.cell.z)) {
      const n = w.nearestStand(c.cell.x, c.cell.y, c.cell.z, 3);
      if (n) { c.cell = n; c.x = n.x + 0.5; c.y = n.y; c.z = n.z + 0.5; if (c.goals) this.goTo(c, c.goals, c.state); }
      else { c.state = 'poof'; c.timer = 0.6; }
    }
    if (c.life > 160 && c.state !== 'leave' && c.state !== 'poof' && c.state !== 'gone') this.leave(c);
    switch (c.state) {
      case 'plan': {
        c.timer -= dt;
        if (c.timer > 0) return;
        this.plan(c);
        return;
      }
      case 'toShelf': case 'toRegister': case 'leave':
        if (this.walk(c, dt)) this.arrive(c);
        return;
      case 'browse': {
        c.timer -= dt;
        if (c.timer > 0) return;
        const s = w.shelves.get(c.target);
        const want = c.wants[0];
        if (s && s.item && s.stock > 0 && (s.item === want || (c.substitute && s.item === c.substitute))) {
          s.stock--; this.stockVersion++;
          c.carrying.push({item: s.item, shop: s.shop});
          c.shop = s.shop;
          this.emit('take', {id: c.id, item: s.item, shelf: c.target});
          this.say(c, s.item === want ? (this.rnd() < 0.5 ? TALK.exact : pick(this.rnd, TALK.take)) : TALK.substitute, s.item);
          if (s.stock === 0) this.emit('soldOut', {shelf: c.target, item: s.item});
        } else {
          this.say(c, TALK.soldOut, want);
        }
        c.wants.shift();
        c.substitute = null;
        c.state = 'plan'; c.timer = 0.3;
        return;
      }
      case 'pay': {
        c.timer -= dt;
        if (c.timer > 0) return;
        this.pay(c);
        return;
      }
      case 'poof':
        c.timer -= dt;
        c.fade = Math.max(0, c.timer / 0.6);
        if (c.timer <= 0) { c.state = 'gone'; this.emit('gone', {id: c.id}); }
        return;
    }
  }

  plan(c) {
    const want = c.wants[0];
    if (!want) {
      if (c.carrying.length) this.goRegister(c);
      else this.leave(c);
      return;
    }
    let list = this.findShelves(k => k === want);
    c.substitute = null;
    if (!list.length) {
      const type = CUSTOMER_TYPES[c.type];
      const held = new Set(c.carrying.map(x => x.item));
      const subs = c.subOk ? this.findShelves(k => type.likes.includes(k) && k !== want && !held.has(k) && !c.wants.includes(k)) : [];
      if (subs.length) {
        list = subs;
        c.substitute = this.world.shelves.get(subs[0].si).item;
        list = subs.filter(s => this.world.shelves.get(s.si).item === c.substitute);
      } else {
        this.say(c, TALK.missing, want);
        this.missed[want] = (this.missed[want] || 0) + 1;
        this.emit('missing', {id: c.id, item: want});
        c.wants.shift();
        c.timer = 1.2;
        return;
      }
    }
    for (const {si} of list.slice(0, 4)) {
      const p = this.world.pos(si);
      const goals = this.world.standCellsAround(p.x, p.y, p.z);
      if (this.goTo(c, goals, 'toShelf')) { c.target = si; return; }
    }
    this.say(c, TALK.blocked);
    this.emit('hint', {text: 'お客さんが 入れないよ。ドアや 道を 作ろう'});
    c.wants = [];
    if (c.carrying.length) this.goRegister(c); else this.leave(c);
  }

  goRegister(c) {
    const w = this.world;
    const order = [...w.registers].sort((a, b) => (a === c.shop ? -1 : b === c.shop ? 1 : dist(w.pos(a), c.cell) - dist(w.pos(b), c.cell)));
    const busy = new Set(this.customers.filter(o => o !== c && (o.state === 'pay' || o.state === 'toRegister') && o.goalCell).map(o => w.idx(o.goalCell.x, o.goalCell.y, o.goalCell.z)));
    for (const ri of order.slice(0, 4)) {
      const p = w.pos(ri);
      const all = w.standCellsAround(p.x, p.y, p.z);
      const free = all.filter(g => !busy.has(w.idx(g.x, g.y, g.z)));
      if (this.goTo(c, free.length ? free : all, 'toRegister')) { c.target = ri; return; }
    }
    // レジに 行けない：品物を もどして 帰る
    this.say(c, TALK.noRegister);
    for (const it of c.carrying) this.returnItem(it.item);
    c.carrying = [];
    this.leave(c);
  }

  returnItem(item) {
    for (const s of this.world.shelves.values()) if (s.item === item && s.stock < SHELF_MAX) { s.stock++; this.stockVersion++; return; }
  }

  // 道に そって 歩く。着いたら true。
  walk(c, dt) {
    const w = this.world;
    if (!c.path) return true;
    let move = WALK_SPEED * dt;
    while (move > 0) {
      const next = c.path[c.pathI + 1];
      if (!next) { c.walking = false; c.goalCell = c.cell; return true; }
      if (!w.canStand(next.x, next.y, next.z)) {
        if (!this.goTo(c, c.goals, c.state)) this.blocked(c);
        return false;
      }
      const tx = next.x + 0.5, tz = next.z + 0.5;
      const dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz);
      if (d > 0.001) c.yaw = Math.atan2(dx, dz);
      if (d <= move) {
        c.x = tx; c.z = tz; c.y = next.y; move -= d;
        c.cell = {x: next.x, y: next.y, z: next.z};
        c.pathI++;
        if (w.get(next.x, next.y, next.z) === B.DOOR) {
          this.emit('door', {id: c.id, x: next.x, y: next.y, z: next.z});
          // りっぱな 店に 入ったら よろこぶ
          if (c.state === 'toShelf' && !c.wowed) {
            c.wowed = true;
            const shop = this.shops().find(s => s.i === this.shopOfShelf(c.target));
            if (shop && shop.stars >= 4 && this.rnd() < 0.6) this.say(c, pick(this.rnd, TALK.wow));
          }
        }
      } else {
        c.x += dx / d * move; c.z += dz / d * move;
        const fy = next.y - c.y;
        if (fy) c.y += Math.sign(fy) * Math.min(Math.abs(fy), move * 1.6);
        move = 0;
      }
    }
    return false;
  }

  // 道が ふさがれた
  blocked(c) {
    c.walking = false;
    if (c.state === 'leave') { c.state = 'poof'; c.timer = 0.6; return; }
    this.say(c, TALK.blocked);
    if (c.state === 'toRegister') { this.goRegister(c); return; }
    c.wants.shift();
    c.substitute = null;
    c.state = 'plan'; c.timer = 0.8;
  }

  arrive(c) {
    const w = this.world;
    c.walking = false;
    if (c.state === 'toShelf') {
      const p = w.pos(c.target);
      c.yaw = Math.atan2(p.x + 0.5 - c.x, p.z + 0.5 - c.z);
      c.state = 'browse'; c.timer = 1.1;
    } else if (c.state === 'toRegister') {
      if (!w.registers.has(c.target)) { this.goRegister(c); return; }
      const p = w.pos(c.target);
      c.yaw = Math.atan2(p.x + 0.5 - c.x, p.z + 0.5 - c.z);
      c.state = 'pay'; c.timer = 1.3;
    } else if (c.state === 'leave') {
      c.state = 'poof'; c.timer = 0.6;
    }
  }

  pay(c) {
    const shop = this.shops().find(s => s.i === c.target);
    const stars = shop ? shop.stars : 1;
    const sum = c.carrying.reduce((s, it) => s + ITEM[it.item].price, 0);
    const tip = Math.round(sum * 0.04 * (stars - 1));
    const before = this.level;
    this.coins += sum + tip;
    this.totalSales += sum + tip;
    this.stats.sold += c.carrying.length;
    this.stats.served++;
    const p = this.world.pos(c.target);
    this.emit('sale', {id: c.id, amount: sum, tip, items: c.carrying.map(x => x.item), x: p.x + 0.5, y: p.y + 1.2, z: p.z + 0.5});
    c.carrying = [];
    // ひとこと
    let line = pick(this.rnd, TALK.thanks);
    if (shop) {
      const sc = shop.scores;
      const good = CRITERIA.filter(k => sc[k.key] >= 0.75);
      const bad = CRITERIA.filter(k => sc[k.key] < 0.4);
      const r = this.rnd();
      if (bad.length && r < 0.45) line = pick(this.rnd, bad).ask;
      else if (good.length && r < 0.85) line = pick(this.rnd, good).praise;
    }
    // じょうれんさん
    if (c.regular) {
      const rec = this.regulars[c.regular] || (this.regulars[c.regular] = {visits: 0, gifted: false});
      rec.visits++;
      const reg = REGULAR[c.regular];
      if (rec.visits >= GIFT_VISITS && !rec.gifted) {
        rec.gifted = true;
        this.gifts.add(reg.gift);
        line = TALK.gift;
        this.emit('gift', {id: c.id, name: reg.name, block: reg.gift});
      }
    }
    this.say(c, line);
    const after = this.level;
    if (after > before) this.levelUp(after);
    this.leave(c);
  }

  levelUp(level) {
    let house = null;
    for (let slot = this.world.housesBuilt; slot < 8 && !house; slot++) {
      if (this.houseSlotFree(slot)) house = this.world.buildHouse(slot);
      else this.world.housesBuilt = slot + 1;
    }
    this.emit('level', {level, house: !!house});
  }

  houseSlotFree(slot) {
    const w = this.world;
    const natural = new Set([0, B.GRASS, B.DIRT, B.STONE, B.FLOWER_RED, B.FLOWER_YELLOW, B.FLOWER_BLUE, B.LEAVES, B.LOG, B.PATH]);
    const s = slotBox(slot);
    if (!s) return false;
    for (let y = s.y0; y <= s.y1; y++) for (let z = s.z0; z <= s.z1; z++) for (let x = s.x0; x <= s.x1; x++) {
      if (!natural.has(w.get(x, y, z))) return false;
    }
    return true;
  }

  checkGoals() {
    if (this.sandbox) return;
    const g = GOALS[this.goalIndex];
    if (!g) return;
    if (this.goalDone(g.key)) {
      this.coins += g.reward;
      this.goalIndex++;
      this.emit('goal', {text: g.text, reward: g.reward});
    }
  }
  goalDone(key) {
    switch (key) {
      case 'firstSale': return this.stats.sold >= 1;
      case 'restock': return this.flags.restock;
      case 'unlock': return this.flags.unlock;
      case 'register': return this.flags.register;
      case 'sign': return [...this.world.signs.values()].some(t => t);
      case 'stars3': return this.bestStars() >= 3;
      case 'level2': return this.level >= 2;
      case 'gift': return this.gifts.size >= 1;
      case 'stars5': return this.bestStars() >= 5;
      case 'level4': return this.level >= 4;
      case 'level6': return this.level >= 6;
    }
    return false;
  }
  currentGoal() { return this.sandbox ? null : GOALS[this.goalIndex] || null; }

  // お客さんが ほしがったのに なかった 物（多い じゅん）
  topMissed(n = 3) {
    return Object.entries(this.missed).filter(([k, v]) => ITEM[k] && v > 0).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
  }
}

function slotBox(slot) {
  const s = HOUSE_SLOTS[slot];
  if (!s) return null;
  const north = s.side === 'north';
  const zf = north ? ROAD_Z0 - 4 : ROAD_Z1 + 4, zb = north ? zf - 4 : zf + 4;
  return {x0: s.x - 1, x1: s.x + 5, z0: Math.min(zf, zb) - 1, z1: Math.max(zf, zb) + 1, y0: GROUND, y1: GROUND + 6};
}

const num = (v, d) => (Number.isFinite(v) ? v : d);
const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.z - b.z) + Math.abs(a.y - b.y);
