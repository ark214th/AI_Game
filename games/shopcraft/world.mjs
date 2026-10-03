// ボクセルの せかい：ブロックの きろく、地形づくり、道さがし（A*）、レイキャスト、セーブ。
import {BLOCKS, B} from './blocks.mjs';

export const GROUND = 8; // 地面の 上に 立つ 高さ（草ブロックは y=7）
export const ROAD_Z0 = 46, ROAD_Z1 = 49;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 家を 建てられる 場所（町の レベルが 上がるたびに ふえる）
export const HOUSE_SLOTS = [
  {x: 7, side: 'north'}, {x: 14, side: 'south'}, {x: 21, side: 'north'},
  {x: 7, side: 'south'}, {x: 14, side: 'north'}, {x: 21, side: 'south'},
  {x: 84, side: 'north'}, {x: 84, side: 'south'},
];

export class World {
  constructor(w = 96, h = 40, d = 96) {
    this.w = w; this.h = h; this.d = d;
    this.blocks = new Uint8Array(w * h * d);
    this.meta = new Uint8Array(w * h * d);
    this.shelves = new Map();   // idx -> {item, stock}
    this.signs = new Map();     // idx -> text
    this.registers = new Set(); // idx
    this.spawns = [];           // お客さんが 出てくる 場所 {x,y,z}
    this.housesBuilt = 0;
    this.version = 0;
    this.changes = [];          // 描画用の 変わった idx
  }
  idx(x, y, z) { return x + this.w * (z + this.d * y); }
  pos(i) { const x = i % this.w, r = (i - x) / this.w, z = r % this.d; return {x, y: (r - z) / this.d, z}; }
  inside(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < this.w && y < this.h && z < this.d; }
  get(x, y, z) { return this.inside(x, y, z) ? this.blocks[this.idx(x, y, z)] : 0; }
  getMeta(x, y, z) { return this.inside(x, y, z) ? this.meta[this.idx(x, y, z)] : 0; }
  // 描画用：せかいの 外の 地面は 石と して あつかう（へりの 面を かかない）
  getForMesh(x, y, z) {
    if (y < 0) return B.STONE;
    if (x < 0 || z < 0 || x >= this.w || z >= this.d) return y < GROUND ? B.STONE : 0;
    return y >= this.h ? 0 : this.blocks[this.idx(x, y, z)];
  }
  // プレイヤーの 体が ぶつかるか（せかいの はしは かべ）
  solidForBody(x, y, z) {
    if (y < 0) return true;
    if (x < 0 || z < 0 || x >= this.w || z >= this.d) return true;
    if (y >= this.h) return false;
    return BLOCKS[this.blocks[this.idx(x, y, z)]]?.solid ?? false;
  }
  solid(x, y, z) {
    if (!this.inside(x, y, z)) return y < 0;
    const b = BLOCKS[this.blocks[this.idx(x, y, z)]];
    return b ? b.solid : false;
  }

  set(x, y, z, id, meta = 0) {
    if (!this.inside(x, y, z)) return false;
    const i = this.idx(x, y, z);
    const old = this.blocks[i];
    if (old === id && this.meta[i] === meta) return false;
    if (old === B.SHELF) this.shelves.delete(i);
    if (old === B.SIGN) this.signs.delete(i);
    if (old === B.REGISTER) this.registers.delete(i);
    this.blocks[i] = id;
    this.meta[i] = meta;
    if (id === B.SHELF) this.shelves.set(i, {item: null, stock: 0});
    if (id === B.SIGN) this.signs.set(i, '');
    if (id === B.REGISTER) this.registers.add(i);
    this.version++;
    this.changes.push(i);
    return true;
  }

  // プレイヤーが ブロックを おく（ドアは 2マス）。成功で true。
  place(x, y, z, id, meta = 0) {
    if (!this.inside(x, y, z) || y < 1) return false;
    if (this.get(x, y, z) !== 0 && !this.replaceable(x, y, z)) return false;
    if (id === B.DOOR) {
      if (!this.inside(x, y + 1, z) || (this.get(x, y + 1, z) !== 0 && !this.replaceable(x, y + 1, z))) return false;
      this.set(x, y, z, B.DOOR, meta);
      this.set(x, y + 1, z, B.DOOR_TOP, meta);
      return true;
    }
    return this.set(x, y, z, id, meta);
  }
  replaceable(x, y, z) {
    const id = this.get(x, y, z);
    return id === B.FLOWER_RED || id === B.FLOWER_YELLOW || id === B.FLOWER_BLUE;
  }
  // こわす。こわせたら こわした ブロックの id を かえす。
  remove(x, y, z) {
    if (!this.inside(x, y, z) || y < 1) return 0;
    const id = this.get(x, y, z);
    if (!id || id === B.BEDROCK) return 0;
    if (id === B.DOOR) { if (this.get(x, y + 1, z) === B.DOOR_TOP) this.set(x, y + 1, z, 0); }
    if (id === B.DOOR_TOP) { if (this.get(x, y - 1, z) === B.DOOR) { this.set(x, y - 1, z, 0); this.set(x, y, z, 0); return B.DOOR; } }
    this.set(x, y, z, 0);
    return id;
  }

  // お客さんが 立てる マス：足と 頭が あいていて、足もとが 歩ける ブロック
  canStand(x, y, z) {
    if (!this.inside(x, y, z) || y < 1 || y + 1 >= this.h) return false;
    if (this.solid(x, y, z) || this.solid(x, y + 1, z)) return false;
    const below = BLOCKS[this.get(x, y - 1, z)];
    return !!below && below.solid && below.walkTop;
  }
  // そのマスを 体が 通れるか（2マスの 高さ）
  clear2(x, y, z) { return this.inside(x, y, z) && !this.solid(x, y, z) && !this.solid(x, y + 1, z); }

  // A* で 道を さがす。goals: [{x,y,z}]。見つからなければ null。
  findPath(start, goals, maxNodes = 9000) {
    if (!goals.length) return null;
    const goalSet = new Set(goals.map(g => this.idx(g.x, g.y, g.z)));
    const startI = this.idx(start.x, start.y, start.z);
    if (goalSet.has(startI)) return [{x: start.x, y: start.y, z: start.z}];
    const h = (x, y, z) => {
      let best = Infinity;
      for (const g of goals) {
        const dx = Math.abs(g.x - x), dz = Math.abs(g.z - z);
        const v = Math.max(dx, dz) + 0.414 * Math.min(dx, dz) + Math.abs(g.y - y);
        if (v < best) best = v;
      }
      return best;
    };
    const gScore = new Map([[startI, 0]]);
    const came = new Map();
    const heap = new MinHeap();
    heap.push(h(start.x, start.y, start.z), startI);
    const closed = new Set();
    let expanded = 0;
    while (heap.size) {
      const cur = heap.pop();
      if (closed.has(cur)) continue;
      if (goalSet.has(cur)) {
        const path = [];
        for (let c = cur; c !== undefined; c = came.get(c)) path.push(this.pos(c));
        return path.reverse();
      }
      closed.add(cur);
      if (++expanded > maxNodes) return null;
      const {x, y, z} = this.pos(cur);
      const g0 = gScore.get(cur);
      for (const [dx, dz] of DIRS8) {
        const diag = dx !== 0 && dz !== 0;
        for (const dy of [0, 1, -1]) {
          if (diag && dy !== 0) continue;
          const nx = x + dx, ny = y + dy, nz = z + dz;
          if (!this.canStand(nx, ny, nz)) continue;
          if (dy === 1 && this.solid(x, y + 2, z)) continue;
          if (dy === -1 && this.solid(nx, y + 1, nz)) continue;
          if (diag && (!this.clear2(x + dx, y, z) || !this.clear2(x, y, z + dz))) continue;
          const ni = this.idx(nx, ny, nz);
          if (closed.has(ni)) continue;
          const ng = g0 + (diag ? 1.414 : 1) + (dy ? 0.4 : 0);
          if (ng < (gScore.get(ni) ?? Infinity)) {
            gScore.set(ni, ng);
            came.set(ni, cur);
            heap.push(ng + h(nx, ny, nz), ni);
          }
          break;
        }
      }
    }
    return null;
  }

  // 近くの 立てる マスを さがす（ブロックに うまった ときなど）
  nearestStand(x, y, z, r = 4) {
    let best = null, bd = Infinity;
    for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const d = dx * dx + dz * dz + dy * dy * 1.5;
      if (d < bd && this.canStand(x + dx, y + dy, z + dz)) { bd = d; best = {x: x + dx, y: y + dy, z: z + dz}; }
    }
    return best;
  }

  // ブロックの まわりで お客さんが 立てる マス（たな・レジの 前）
  standCellsAround(x, y, z) {
    const out = [];
    for (const [dx, dz] of DIRS4) for (const dy of [0, -1]) {
      if (this.canStand(x + dx, y + dy, z + dz)) { out.push({x: x + dx, y: y + dy, z: z + dz}); break; }
    }
    return out;
  }

  // 目から レイを とばして 当たった ブロック。{x,y,z,id,nx,ny,nz,dist}
  raycast(ox, oy, oz, dx, dy, dz, maxDist = 8) {
    let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
    const sx = Math.sign(dx), sy = Math.sign(dy), sz = Math.sign(dz);
    const tdx = sx ? Math.abs(1 / dx) : Infinity, tdy = sy ? Math.abs(1 / dy) : Infinity, tdz = sz ? Math.abs(1 / dz) : Infinity;
    let tx = sx ? ((sx > 0 ? x + 1 - ox : ox - x) * tdx) : Infinity;
    let ty = sy ? ((sy > 0 ? y + 1 - oy : oy - y) * tdy) : Infinity;
    let tz = sz ? ((sz > 0 ? z + 1 - oz : oz - z) * tdz) : Infinity;
    let nx = 0, ny = 0, nz = 0, t = 0;
    for (let i = 0; i < 200 && t <= maxDist; i++) {
      const id = this.get(x, y, z);
      if (id && BLOCKS[id] && BLOCKS[id].shape !== 'none') return {x, y, z, id, nx, ny, nz, dist: t};
      if (id === B.DOOR_TOP) return {x, y, z, id, nx, ny, nz, dist: t};
      if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; nx = -sx; ny = 0; nz = 0; }
      else if (ty < tz) { y += sy; t = ty; ty += tdy; nx = 0; ny = -sy; nz = 0; }
      else { z += sz; t = tz; tz += tdz; nx = 0; ny = 0; nz = -sz; }
      if (y < 0 || y >= this.h + 2) break;
    }
    return null;
  }

  // ---------- 地形づくり ----------
  generate(seed = 7) {
    const rnd = mulberry32(seed);
    const {w, d} = this;
    const noise = valueNoise(seed);
    // 地面と へりの 丘
    for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) {
      const edge = Math.min(x, w - 1 - x, z, d - 1 - z);
      let top = GROUND - 1;
      const roadLike = z >= ROAD_Z0 - 1 && z <= ROAD_Z1 + 1;
      if (edge < 7 && !roadLike) top += Math.round((7 - edge) * 0.9 + noise(x / 9, z / 9) * 3);
      for (let y = 0; y <= top; y++) {
        const id = y === 0 ? B.BEDROCK : y < top - 2 ? B.STONE : y < top ? B.DIRT : B.GRASS;
        this.blocks[this.idx(x, y, z)] = id;
      }
    }
    // 大通り
    for (let x = 0; x < w; x++) for (let z = ROAD_Z0; z <= ROAD_Z1; z++) {
      this.blocks[this.idx(x, GROUND - 1, z)] = B.PATH;
    }
    // 町の 門
    this.buildGate(28);
    // 木と 花
    for (let n = 0; n < 220; n++) {
      const x = 2 + Math.floor(rnd() * (w - 4)), z = 2 + Math.floor(rnd() * (d - 4));
      if (z > 30 && z < 66) continue; // 大通りの まわりは あけておく
      const y = this.surfaceY(x, z);
      if (this.get(x, y - 1, z) !== B.GRASS) continue;
      if (rnd() < 0.42) this.tree(x, y, z, rnd);
      else this.blocks[this.idx(x, y, z)] = [B.FLOWER_RED, B.FLOWER_YELLOW, B.FLOWER_BLUE][Math.floor(rnd() * 3)];
    }
    // 最初の 家
    for (let i = 0; i < 3; i++) this.buildHouse(i);
    // はじめての 屋台
    this.buildStarterStall();
    this.version++;
    this.changes.length = 0;
  }

  surfaceY(x, z) {
    for (let y = this.h - 1; y > 0; y--) if (BLOCKS[this.get(x, y, z)]?.solid) return y + 1;
    return 1;
  }

  tree(x, y, z, rnd) {
    const hgt = 4 + Math.floor(rnd() * 2);
    for (let dy = -2; dy <= 1; dy++) {
      const r = dy >= 0 ? 1 : 2;
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) === r && Math.abs(dz) === r && (dy === 1 || rnd() < 0.5)) continue;
        const yy = y + hgt + dy;
        if (this.inside(x + dx, yy, z + dz) && !this.get(x + dx, yy, z + dz)) this.blocks[this.idx(x + dx, yy, z + dz)] = B.LEAVES;
      }
    }
    for (let i = 0; i < hgt; i++) this.blocks[this.idx(x, y + i, z)] = B.LOG;
  }

  fill(x0, y0, z0, x1, y1, z1, id, meta = 0) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
      for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++)
        for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, z, id, meta);
  }

  buildGate(x) {
    const g = GROUND;
    for (const z of [ROAD_Z0 - 1, ROAD_Z1 + 1]) {
      this.fill(x, g, z, x, g + 4, z, B.STONE_BRICKS);
      this.set(x, g + 5, z, B.LANTERN);
    }
    this.fill(x, g + 5, ROAD_Z0, x, g + 5, ROAD_Z1, B.PLANKS_DARK);
    this.set(x, g + 6, ROAD_Z0 + 1, B.BANNER_RED, 0);
    this.set(x, g + 6, ROAD_Z1 - 1, B.BANNER_BLUE, 0);
  }

  // お客さんの 家（町の レベルが 上がると ふえる）
  buildHouse(slot) {
    const s = HOUSE_SLOTS[slot];
    if (!s) return null;
    const g = GROUND;
    const north = s.side === 'north';
    const x0 = s.x, x1 = s.x + 4;
    const zf = north ? ROAD_Z0 - 4 : ROAD_Z1 + 4;      // 前の かべ（道がわ）
    const zb = north ? zf - 4 : zf + 4;                  // うしろの かべ
    const fwd = north ? 1 : -1;
    const wall = [B.PLANKS, B.PLASTER, B.BRICKS, B.PLANKS_BIRCH][slot % 4];
    const roof = slot % 2 ? B.ROOF_BLUE : B.ROOF_RED;
    // ゆかを たいらに
    this.fill(x0 - 1, g, Math.min(zf, zb) - 1, x1 + 1, g + 7, Math.max(zf, zb) + 1, 0);
    this.fill(x0 - 1, g - 1, Math.min(zf, zb) - 1, x1 + 1, g - 1, Math.max(zf, zb) + 1, B.GRASS);
    this.fill(x0, g - 1, Math.min(zf, zb), x1, g - 1, Math.max(zf, zb), B.PLANKS_DARK);
    for (let y = g; y < g + 3; y++) for (let z = Math.min(zf, zb); z <= Math.max(zf, zb); z++) for (let x = x0; x <= x1; x++) {
      const edgeX = x === x0 || x === x1, edgeZ = z === zf || z === zb;
      if (!edgeX && !edgeZ) continue;
      this.set(x, y, z, edgeX && edgeZ ? B.LOG : wall);
    }
    // まど
    for (const x of [x0 + 1, x1 - 1]) this.set(x, g + 1, zb, B.GLASS);
    for (const z of [zf - fwd * 2]) { this.set(x0, g + 1, z, B.GLASS); this.set(x1, g + 1, z, B.GLASS); }
    this.set(x0 + 1, g + 1, zf, B.GLASS);
    this.set(x1 - 1, g + 1, zf, B.GLASS);
    // 屋根（だんだん 小さく）
    for (let k = 0; k < 3; k++) {
      const zz0 = Math.min(zf, zb) - 1 + k, zz1 = Math.max(zf, zb) + 1 - k;
      this.fill(x0 - 1 + k, g + 3 + k, zz0, x1 + 1 - k, g + 3 + k, zz1, roof);
    }
    // ドアと 道
    const dx = x0 + 2;
    this.set(dx, g, zf, 0); this.set(dx, g + 1, zf, 0);
    const meta = north ? 0 : 2;
    this.place(dx, g, zf, B.DOOR, meta);
    this.set(x0 + 1, g + 2, zf + fwd, B.LANTERN);
    for (let z = zf + fwd; north ? z < ROAD_Z0 : z > ROAD_Z1; z += fwd) this.set(dx, g - 1, z, B.PATH);
    this.set(dx + 2, g, zf + fwd, B.FLOWER_RED);
    const spawn = {x: dx, y: g, z: zf + fwd * 2};
    this.spawns.push(spawn);
    this.housesBuilt = Math.max(this.housesBuilt, slot + 1);
    return spawn;
  }

  buildStarterStall() {
    const g = GROUND;
    this.fill(36, g - 1, 42, 40, g - 1, 44, B.PLANKS);
    for (const [x, z] of [[36, 42], [40, 42], [36, 44], [40, 44]]) this.fill(x, g, z, x, g + 2, z, B.LOG);
    this.fill(35, g + 3, 41, 41, g + 3, 45, B.ROOF_RED);
    this.fill(36, g + 4, 42, 40, g + 4, 44, B.ROOF_RED);
    this.set(37, g, 44, B.SHELF, 0);
    this.set(38, g, 44, B.SHELF, 0);
    this.set(39, g, 44, B.REGISTER, 0);
    this.shelves.set(this.idx(37, g, 44), {item: 'bread', stock: 8});
    this.shelves.set(this.idx(38, g, 44), {item: 'wood_sword', stock: 8});
    this.set(41, g, 45, B.BARREL);
  }

  // ---------- セーブ ----------
  serialize() {
    return {
      w: this.w, h: this.h, d: this.d,
      blocks: rleEncode(this.blocks), meta: rleEncode(this.meta),
      shelves: [...this.shelves].map(([i, s]) => [i, s.item, s.stock]),
      signs: [...this.signs],
      spawns: this.spawns, housesBuilt: this.housesBuilt,
    };
  }
  static deserialize(o) {
    const wd = new World(o.w, o.h, o.d);
    const blocks = rleDecode(o.blocks, wd.blocks.length), meta = rleDecode(o.meta, wd.meta.length);
    if (!blocks || !meta) return null;
    wd.blocks = blocks; wd.meta = meta;
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i] === B.SHELF) wd.shelves.set(i, {item: null, stock: 0});
      if (blocks[i] === B.SIGN) wd.signs.set(i, '');
      if (blocks[i] === B.REGISTER) wd.registers.add(i);
    }
    for (const [i, item, stock] of o.shelves || []) if (wd.shelves.has(i)) wd.shelves.set(i, {item, stock});
    for (const [i, text] of o.signs || []) if (wd.signs.has(i)) wd.signs.set(i, String(text).slice(0, 12));
    wd.spawns = Array.isArray(o.spawns) ? o.spawns : [];
    wd.housesBuilt = o.housesBuilt | 0;
    return wd;
  }
}

export const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

class MinHeap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.k.length; }
  push(key, val) {
    const k = this.k, v = this.v;
    let i = k.length; k.push(key); v.push(val);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= key) break;
      k[i] = k[p]; v[i] = v[p]; i = p;
    }
    k[i] = key; v[i] = val;
  }
  pop() {
    const k = this.k, v = this.v;
    const top = v[0], lastK = k.pop(), lastV = v.pop();
    if (k.length) {
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i, mk = lastK;
        if (l < k.length && k[l] < mk) { m = l; mk = k[l]; }
        if (r < k.length && k[r] < mk) { m = r; mk = k[r]; }
        if (m === i) break;
        k[i] = k[m]; v[i] = v[m]; i = m;
      }
      k[i] = lastK; v[i] = lastV;
    }
    return top;
  }
}

function valueNoise(seed) {
  const hash = (x, y) => {
    let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 982451653);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const sm = t => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = sm(x - xi), fy = sm(y - yi);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), e = hash(xi + 1, yi + 1);
    return (a + (b - a) * fx) + ((c + (e - c) * fx) - (a + (b - a) * fx)) * fy;
  };
}

// ランレングスで ちぢめて base64 に
export function rleEncode(arr) {
  const out = [];
  for (let i = 0; i < arr.length;) {
    const v = arr[i];
    let n = 1;
    while (n < 255 && i + n < arr.length && arr[i + n] === v) n++;
    out.push(v, n);
    i += n;
  }
  let s = '';
  const bytes = Uint8Array.from(out);
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export function rleDecode(b64, length) {
  try {
    const s = atob(b64);
    const out = new Uint8Array(length);
    let o = 0;
    for (let i = 0; i + 1 < s.length; i += 2) {
      const v = s.charCodeAt(i), n = s.charCodeAt(i + 1);
      if (o + n > length) return null;
      out.fill(v, o, o + n);
      o += n;
    }
    return o === length ? out : null;
  } catch {
    return null;
  }
}
