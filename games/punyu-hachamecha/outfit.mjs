// ぷにゅの きせかえ。『ゆめかわ かんじの しま』（1stGradeMath/kanji_mahou/island.mjs）の applyOutfit を そのまま うつした もの。
// おおきさは あちらの ぷにゅ（はんけい 0.45）に あわせて あるので、よぶ がわで body グループを かくだい する
import * as T from '../punyu-kirakira/vendor/three.module.min.js';
import { OUTFITS } from './data.mjs';

let toonRamp = null;
function toon(color, opts = {}) {
  if (!toonRamp) {
    const data = new Uint8Array([150, 150, 150, 255, 215, 215, 215, 255, 255, 255, 255, 255]);
    toonRamp = new T.DataTexture(data, 3, 1, T.RGBAFormat);
    toonRamp.minFilter = toonRamp.magFilter = T.NearestFilter;
    toonRamp.needsUpdate = true;
  }
  return new T.MeshToonMaterial({ color, gradientMap: toonRamp, ...opts });
}
const matCache = new Map();
const M = (c) => { if (!matCache.has(c)) matCache.set(c, toon(c)); return matCache.get(c); };

function starShape(outer = 0.42, inner = 0.2) {
  const s = new T.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? inner : outer;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  s.closePath();
  return s;
}
function heartShape() {
  const s = new T.Shape();
  s.moveTo(0, -0.35);
  s.bezierCurveTo(-0.45, -0.05, -0.45, 0.35, -0.2, 0.35);
  s.bezierCurveTo(-0.08, 0.35, 0, 0.25, 0, 0.18);
  s.bezierCurveTo(0, 0.25, 0.08, 0.35, 0.2, 0.35);
  s.bezierCurveTo(0.45, 0.35, 0.45, -0.05, 0, -0.35);
  return s;
}
const G = {
  ball: new T.SphereGeometry(1, 20, 14),
  mid: new T.SphereGeometry(1, 14, 9),
  low: new T.SphereGeometry(1, 8, 6),
  cone: new T.ConeGeometry(1, 1, 10),
  cyl: new T.CylinderGeometry(1, 1, 1, 14),
  box: new T.BoxGeometry(1, 1, 1),
  star: new T.ExtrudeGeometry(starShape(), { depth: 0.14, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2 }),
  heart: new T.ExtrudeGeometry(heartShape(), { depth: 0.18, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 2 }),
};
G.star.center(); G.heart.center();
const STAR_MAT = toon(0xffd84a, { emissive: 0x6b4a00, emissiveIntensity: 0.35 });
const R0 = 0.45; // ぷにゅの はんけい
const CHEEK = toon(0xff9fb8);

function part(parent, geo, mat, [x, y, z] = [0, 0, 0], [sx, sy, sz] = [1, 1, 1], rot) {
  const m = new T.Mesh(geo, typeof mat === 'number' ? M(mat) : mat);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz);
  if (rot) m.rotation.set(...rot);
  parent.add(m);
  return m;
}

export function applyOutfit(root, o) {
  const u = root.userData;
  const item = OUTFITS.find(i => i.id === o.color);
  u.rainbow = o.color === 'rainbow';
  u.skin.color.setHex(item && item.color ? item.color : 0xfff4f7);
  if (u.acc) u.body.remove(u.acc);
  const acc = new T.Group(); u.acc = acc; u.body.add(acc);
  const r = R0;
  const put = (geo, mat, p, s, rot) => part(acc, geo, mat, p, s, rot);
  switch (o.head) {
    case 'ribbon': {
      put(G.low, 0xff5d86, [0.2, r * 0.95, 0.05], [0.14, 0.09, 0.07], [0, 0, 0.5]);
      put(G.low, 0xff5d86, [0.36, r * 0.82, 0.05], [0.14, 0.09, 0.07], [0, 0, -0.4]);
      put(G.low, 0xff3d6e, [0.28, r * 0.9, 0.08], [0.06, 0.06, 0.06]);
      break;
    }
    case 'flower': {
      const cols = [0xff8fb5, 0xffe066, 0xffffff, 0xb79cff, 0x7fd4ff];
      for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; put(G.low, cols[i % 5], [Math.cos(a) * 0.3, r * 0.78, Math.sin(a) * 0.3], [0.08, 0.08, 0.08]); }
      break;
    }
    case 'strawberry': {
      put(G.cone, 0xff3d6e, [0, r + 0.2, 0], [0.3, 0.42, 0.3]);
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; put(G.low, 0x5bb34a, [Math.cos(a) * 0.18, r + 0.02, Math.sin(a) * 0.18], [0.12, 0.04, 0.06], [0, -a, 0]); }
      for (let i = 0; i < 4; i++) put(G.low, 0xfff3a8, [(i - 1.5) * 0.08, r + 0.12 + (i % 2) * 0.1, 0.22 - (i % 2) * 0.04], [0.02, 0.03, 0.02]);
      break;
    }
    case 'cloud': for (const [x, y, sc] of [[0, 0.2, 0.2], [-0.18, 0.12, 0.15], [0.18, 0.12, 0.15], [0.08, 0.3, 0.13]]) put(G.low, 0xffffff, [x, r + y, 0], [sc, sc * 0.8, sc]); break;
    case 'straw': {
      put(G.cyl, 0xf2d38a, [0, r * 0.88, 0], [0.5, 0.03, 0.5]);
      put(G.low, 0xf2d38a, [0, r * 0.95, 0], [0.26, 0.2, 0.26]);
      put(G.cyl, 0xff6f91, [0, r * 0.95, 0], [0.265, 0.05, 0.265]);
      break;
    }
    case 'witch': {
      put(G.cyl, 0x8a63d9, [0, r * 0.9, 0], [0.42, 0.03, 0.42]);
      put(G.cone, 0x8a63d9, [0.04, r + 0.3, -0.02], [0.24, 0.62, 0.24], [0, 0, -0.18]);
      put(G.cyl, 0xffd84a, [0, r * 0.98, 0], [0.245, 0.06, 0.245]);
      put(G.star, STAR_MAT, [0.1, r + 0.42, 0.14], [0.3, 0.3, 0.3]);
      break;
    }
    case 'crown': {
      const gold = toon(0xffd84a, { emissive: 0x6b4a00, emissiveIntensity: 0.3 });
      put(G.cyl, gold, [0, r * 0.95, 0], [0.22, 0.08, 0.22]);
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; put(G.cone, gold, [Math.cos(a) * 0.18, r * 0.95 + 0.12, Math.sin(a) * 0.18], [0.06, 0.16, 0.06]); }
      put(G.low, 0xff5d86, [0, r * 0.95, 0.22], [0.05, 0.05, 0.03]);
      break;
    }
    case 'starpin': put(G.star, STAR_MAT, [0.26, r * 0.72, 0.18], [0.45, 0.45, 0.45], [0, 0, 0.3]); break;
    case 'tiara': {
      const gold = toon(0xffe08a, { emissive: 0x6b4a00, emissiveIntensity: 0.25 });
      put(new T.TorusGeometry(0.2, 0.025, 6, 20, Math.PI), gold, [0, r * 0.9, 0.08], [1, 0.6, 1], [-0.5, 0, 0]);
      for (let i = -2; i <= 2; i++) put(G.cone, gold, [i * 0.08, r * 0.9 + 0.1 - Math.abs(i) * 0.03, 0.12], [0.03, 0.1 - Math.abs(i) * 0.02, 0.03]);
      put(G.low, toon(0x7fd4ff, { emissive: 0x2f6fbf, emissiveIntensity: 0.4 }), [0, r * 0.9 + 0.05, 0.16], [0.045, 0.055, 0.03]);
      break;
    }
    case 'princess': {
      put(G.cone, 0xffa8d0, [0.05, r + 0.33, -0.02], [0.2, 0.62, 0.2], [0, 0, -0.12]);
      put(G.low, STAR_MAT, [0.12, r + 0.66, -0.02], [0.06, 0.06, 0.06]);
      put(G.low, toon(0xffffff, { transparent: true, opacity: 0.7 }), [0.2, r + 0.35, -0.12], [0.08, 0.35, 0.05], [0, 0, -0.5]);
      break;
    }
    case 'bunny': {
      for (const sx of [-1, 1]) {
        put(G.low, 0xffffff, [sx * 0.14, r + 0.3, -0.02], [0.08, 0.28, 0.06], [0, 0, -sx * 0.15]);
        put(G.low, CHEEK, [sx * 0.14, r + 0.3, 0.03], [0.04, 0.2, 0.03], [0, 0, -sx * 0.15]);
      }
      break;
    }
  }
  u.ears.forEach(e => (e.visible = !['strawberry', 'straw', 'cloud', 'bunny', 'witch'].includes(o.head)));
  switch (o.face) {
    case 'glasses': {
      const frame = M(0xff6f91), lens = toon(0xffffff, { transparent: true, opacity: 0.35 });
      for (const sx of [-1, 1]) {
        put(new T.TorusGeometry(0.09, 0.018, 6, 20), frame, [sx * 0.15, 0.07, r * 1.0]);
        put(new T.CircleGeometry(0.085, 16), lens, [sx * 0.15, 0.07, r * 1.0]);
      }
      put(G.cyl, frame, [0, 0.09, r * 1.01], [0.014, 0.06, 0.014], [0, 0, Math.PI / 2]);
      break;
    }
    case 'hearts': for (const sx of [-1, 1]) put(G.heart, toon(0xff5d86, { transparent: true, opacity: 0.85 }), [sx * 0.15, 0.07, r * 1.0], [0.28, 0.28, 0.2]); break;
    case 'starcheek': for (const sx of [-1, 1]) put(G.star, STAR_MAT, [sx * 0.27, -0.07, r * 0.9], [0.22, 0.22, 0.15]); break;
    case 'starglasses': {
      const y = toon(0xffd84a, { transparent: true, opacity: 0.8 });
      for (const sx of [-1, 1]) put(G.star, y, [sx * 0.15, 0.07, r * 1.0], [0.5, 0.5, 0.2]);
      put(G.cyl, 0xff6f91, [0, 0.09, r * 1.01], [0.014, 0.05, 0.014], [0, 0, Math.PI / 2]);
      break;
    }
    case 'hige': for (const sx of [-1, 1]) put(G.low, 0x5a3e36, [sx * 0.09, -0.02, r * 0.98], [0.1, 0.035, 0.03], [0, 0, sx * 0.25]); break;
  }
  u.flaps = [];
  switch (o.back) {
    case 'cape': {
      const cape = new T.Mesh(new T.PlaneGeometry(1.0, 0.78, 1, 4), toon(0xff4f7b, { side: T.DoubleSide }));
      cape.position.set(0, -0.12, -r * 0.95); cape.rotation.x = 0.15; acc.add(cape);
      put(G.cyl, 0xffd84a, [0, 0.22, -r * 0.55], [0.3, 0.03, 0.2]);
      u.flaps.push({ m: cape, kind: 'cape' });
      break;
    }
    case 'balloon': {
      put(G.cyl, 0xffffff, [0.2, r + 0.35, -0.25], [0.006, 0.7, 0.006], [0, 0, -0.25]);
      const b = put(G.mid, 0xff5d86, [0.36, r + 0.85, -0.3], [0.22, 0.26, 0.22]);
      u.flaps.push({ m: b, kind: 'balloon' });
      break;
    }
    case 'randoseru': {
      put(G.box, 0xff6f91, [0, 0.02, -r * 0.95], [0.5, 0.52, 0.24]);
      put(G.cyl, 0xff6f91, [0, 0.28, -r * 0.95], [0.25, 0.24, 0.12], [0, 0, Math.PI / 2]);
      put(G.box, 0xffd84a, [0, -0.02, -r * 0.95 - 0.13], [0.1, 0.1, 0.02]);
      break;
    }
    case 'angel':
    case 'butterfly': {
      const cols = o.back === 'angel' ? [0xffffff, 0xffffff] : [0xff9ad5, 0xb79cff];
      for (const sx of [-1, 1]) {
        const pivot = new T.Group(); pivot.position.set(sx * 0.12, 0.08, -r * 0.8); acc.add(pivot);
        part(pivot, G.low, o.back === 'butterfly' ? toon(cols[0], { transparent: true, opacity: 0.9 }) : M(cols[0]), [sx * 0.28, 0.08, 0], [0.32, o.back === 'angel' ? 0.2 : 0.26, 0.05]);
        part(pivot, G.low, cols[1], [sx * 0.22, -0.15, 0], [0.2, 0.14, 0.05]);
        u.flaps.push({ m: pivot, kind: 'wing', sx });
      }
      break;
    }
  }
  u.cheeks.forEach(ch => (ch.visible = o.face !== 'starcheek'));
}
