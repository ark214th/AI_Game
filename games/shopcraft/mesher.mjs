// チャンク（16x16 の 柱）の ポリゴンを つくる。DOM なし。
import {BLOCKS, TILE, ATLAS_SIZE} from './blocks.mjs';

export const CHUNK = 16;
const AO = [0.52, 0.68, 0.84, 1];
// c: 外から 見て 左下・右下・右上・左上
const FACES = [
  {n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], shade: 0.74, side: 'side', uv: p => [1 - p[2], p[1]]},
  {n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], shade: 0.74, side: 'side', uv: p => [p[2], p[1]]},
  {n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], shade: 1, side: 'top', uv: p => [p[0], 1 - p[2]]},
  {n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], shade: 0.56, side: 'bottom', uv: p => [p[0], p[2]]},
  {n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], shade: 0.88, side: 'side', uv: p => [p[0], p[1]]},
  {n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], shade: 0.88, side: 'side', uv: p => [1 - p[0], p[1]]},
];

export function tileFor(tiles, side) {
  const name = typeof tiles === 'string' ? tiles : (tiles[side] || tiles.side || tiles.top);
  return TILE[name] ?? 0;
}

function tileRect(t) {
  const n = ATLAS_SIZE, col = t % n, row = Math.floor(t / n), e = 0.0004;
  return {u0: col / n + e, u1: (col + 1) / n - e, v0: 1 - (row + 1) / n + e, v1: 1 - row / n - e};
}

// 向き（meta 0..3）で 箱を まわす（中心 8,8）
export function rotateBox(b, r) {
  let [x0, y0, z0, x1, y1, z1] = b;
  for (let k = 0; k < (r & 3); k++) {
    // (x,z) -> (z, 16-x)
    const nx0 = z0, nx1 = z1, nz0 = 16 - x1, nz1 = 16 - x0;
    x0 = nx0; x1 = nx1; z0 = nz0; z1 = nz1;
  }
  return [x0, y0, z0, x1, y1, z1];
}

class Buf {
  constructor() { this.p = []; this.u = []; this.c = []; this.i = []; this.n = 0; }
  quad(ps, uvs, cols, flip) {
    const b = this.n;
    for (let k = 0; k < 4; k++) {
      this.p.push(ps[k][0], ps[k][1], ps[k][2]);
      this.u.push(uvs[k][0], uvs[k][1]);
      this.c.push(cols[k], cols[k], cols[k]);
    }
    if (flip) this.i.push(b + 1, b + 2, b + 3, b + 1, b + 3, b);
    else this.i.push(b, b + 1, b + 2, b, b + 2, b + 3);
    this.n += 4;
  }
  out() {
    return {
      positions: new Float32Array(this.p), uvs: new Float32Array(this.u),
      colors: new Float32Array(this.c), indices: new Uint32Array(this.i),
    };
  }
}

export function buildChunk(world, cx, cz) {
  const buf = new Buf();
  const get = (x, y, z) => world.getForMesh(x, y, z);
  const opaque = id => !!BLOCKS[id]?.opaque;
  const x0 = cx * CHUNK, z0 = cz * CHUNK;
  for (let y = 0; y < world.h; y++) for (let lz = 0; lz < CHUNK; lz++) for (let lx = 0; lx < CHUNK; lx++) {
    const x = x0 + lx, z = z0 + lz;
    if (x >= world.w || z >= world.d) continue;
    const id = world.blocks[world.idx(x, y, z)];
    if (!id) continue;
    const b = BLOCKS[id];
    if (!b) continue;
    if (b.shape === 'cube') cube(buf, get, opaque, b, x, y, z);
    else if (b.shape === 'cross') cross(buf, b, x, y, z);
    else if (b.shape === 'boxes') boxes(buf, get, opaque, b, x, y, z, world.meta[world.idx(x, y, z)]);
  }
  return buf.out();
}

function cube(buf, get, opaque, b, x, y, z) {
  for (const f of FACES) {
    const nid = get(x + f.n[0], y + f.n[1], z + f.n[2]);
    if (opaque(nid)) continue;
    if (b.transparent && nid === b.id) continue;
    const r = tileRect(tileFor(b.tiles, f.side));
    const ps = [], uvs = [], cols = [], ao = [];
    for (let k = 0; k < 4; k++) {
      const c = f.c[k];
      ps.push([x + c[0], y + c[1], z + c[2]]);
      uvs.push([[r.u0, r.v0], [r.u1, r.v0], [r.u1, r.v1], [r.u0, r.v1]][k]);
      let a = 3;
      if (!b.light) {
        // AO：面の 前の 3マス
        const fx = x + f.n[0], fy = y + f.n[1], fz = z + f.n[2];
        const d = [c[0] ? 1 : -1, c[1] ? 1 : -1, c[2] ? 1 : -1];
        const axes = [0, 1, 2].filter(i => f.n[i] === 0);
        const o1 = [0, 0, 0], o2 = [0, 0, 0];
        o1[axes[0]] = d[axes[0]]; o2[axes[1]] = d[axes[1]];
        const s1 = opaque(get(fx + o1[0], fy + o1[1], fz + o1[2])) ? 1 : 0;
        const s2 = opaque(get(fx + o2[0], fy + o2[1], fz + o2[2])) ? 1 : 0;
        const cc = opaque(get(fx + o1[0] + o2[0], fy + o1[1] + o2[1], fz + o1[2] + o2[2])) ? 1 : 0;
        a = s1 && s2 ? 0 : 3 - (s1 + s2 + cc);
      }
      ao.push(a);
      cols.push(b.light ? 1 : f.shade * AO[a]);
    }
    buf.quad(ps, uvs, cols, ao[0] + ao[2] < ao[1] + ao[3]);
  }
}

function cross(buf, b, x, y, z) {
  const r = tileRect(tileFor(b.tiles, 'side'));
  const uv = [[r.u0, r.v0], [r.u1, r.v0], [r.u1, r.v1], [r.u0, r.v1]];
  const i = 0.15, o = 0.85;
  const quads = [
    [[x + i, y, z + i], [x + o, y, z + o], [x + o, y + 1, z + o], [x + i, y + 1, z + i]],
    [[x + o, y, z + i], [x + i, y, z + o], [x + i, y + 1, z + o], [x + o, y + 1, z + i]],
  ];
  for (const q of quads) {
    buf.quad(q, uv, [0.95, 0.95, 0.95, 0.95], false);
    buf.quad([q[1], q[0], q[3], q[2]], [uv[0], uv[1], uv[2], uv[3]], [0.8, 0.8, 0.8, 0.8], false);
  }
}

function boxes(buf, get, opaque, b, x, y, z, meta) {
  for (const box of b.boxes) {
    const bb = b.faced ? rotateBox(box.b, meta) : box.b;
    const lo = [bb[0] / 16, bb[1] / 16, bb[2] / 16], hi = [bb[3] / 16, bb[4] / 16, bb[5] / 16];
    for (const f of FACES) {
      // ブロックの はしに ある 面は、となりが うまっていれば かかない
      const axis = f.n[0] ? 0 : f.n[1] ? 1 : 2, pos = f.n[axis] > 0;
      const onEdge = pos ? hi[axis] >= 1 : lo[axis] <= 0;
      if (onEdge && hi[axis] - lo[axis] > 0 && opaque(get(x + f.n[0], y + f.n[1], z + f.n[2]))) continue;
      const r = tileRect(tileFor(box.t, f.side));
      const pts = f.c.map(c => [c[0] ? hi[0] : lo[0], c[1] ? hi[1] : lo[1], c[2] ? hi[2] : lo[2]]);
      let loc = pts.map(p => f.uv(p));
      for (const k of [0, 1]) {
        const vs = loc.map(l => l[k]);
        const mn = Math.min(...vs), mx = Math.max(...vs);
        if (mx - mn > 1) loc = loc.map(l => { const n = l.slice(); n[k] = (l[k] - mn) / (mx - mn); return n; });
        else if (mx > 1) loc = loc.map(l => { const n = l.slice(); n[k] = l[k] - (mx - 1); return n; });
        else if (mn < 0) loc = loc.map(l => { const n = l.slice(); n[k] = l[k] - mn; return n; });
      }
      const uvs = loc.map(([u, v]) => [r.u0 + (r.u1 - r.u0) * u, r.v0 + (r.v1 - r.v0) * v]);
      const shade = b.light ? 1 : f.shade;
      buf.quad(pts.map(p => [x + p[0], y + p[1], z + p[2]]), uvs, [shade, shade, shade, shade], false);
    }
  }
}
