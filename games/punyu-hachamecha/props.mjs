// しまの かざり。『ゆめかわ かずうさガーデン』（1stGradeMath/kazuusa_garden）の かざりを そのまま うつした もの。
// うごく かざりは userData.tick(t) を もつ（ふんすい・ふうせん・ブランコ・メリーゴーランド など）
import * as THREE from '../punyu-kirakira/vendor/three.module.min.js';

let ramp = null;
function toon(color) {
  if (!ramp) { ramp = new THREE.DataTexture(new Uint8Array([150, 150, 150, 255, 215, 215, 215, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat); ramp.minFilter = ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true; }
  return new THREE.MeshToonMaterial({ color, gradientMap: ramp });
}
const tcache = {};
const T = (c) => tcache[c] || (tcache[c] = toon(c));
const RAINBOW = ['#ff8fa3', '#ffb36b', '#ffe066', '#9ee493', '#7fd0f5', '#a39bff', '#e79bff'];
const GEO = {
  sph: new THREE.SphereGeometry(1, 20, 14), sphLo: new THREE.SphereGeometry(1, 12, 8),
  cheek: new THREE.CircleGeometry(0.085, 24), happy: new THREE.TorusGeometry(0.075, 0.022, 6, 18, Math.PI),
};
const MAT = { eye: new THREE.MeshBasicMaterial({ color: 0x3b1f3f }), cheek: new THREE.MeshBasicMaterial({ color: 0xff78ad, transparent: true, opacity: 0.55 }) };
function M3(geo, color, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(geo, typeof color === 'string' ? T(color) : color); m.position.set(x, y, z);
  if (o.rx) m.rotation.x = o.rx; if (o.ry) m.rotation.y = o.ry; if (o.rz) m.rotation.z = o.rz;
  if (o.s !== undefined) Array.isArray(o.s) ? m.scale.set(...o.s) : m.scale.setScalar(o.s);
  return m;
}
const grp = (...a) => { const g = new THREE.Group(); a.forEach((x) => g.add(x)); return g; };
function heartGeo(size = 1, depth = .25) {
  const s = new THREE.Shape(), x = -.25, y = -.5;
  s.moveTo(x + .25, y + .25); s.bezierCurveTo(x + .25, y + .25, x + .2, y, x, y); s.bezierCurveTo(x - .3, y, x - .3, y + .35, x - .3, y + .35);
  s.bezierCurveTo(x - .3, y + .55, x - .1, y + .77, x + .25, y + .95); s.bezierCurveTo(x + .6, y + .77, x + .8, y + .55, x + .8, y + .35);
  s.bezierCurveTo(x + .8, y + .35, x + .8, y, x + .5, y); s.bezierCurveTo(x + .35, y, x + .25, y + .25, x + .25, y + .25);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: .06, bevelThickness: .06, bevelSegments: 3, curveSegments: 16 });
  g.center(); g.rotateZ(Math.PI); g.scale(size, size, size); return g;
}
function starGeo(r = .5, depth = .15) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, rr = i % 2 ? r * .45 : r; const px = Math.cos(a) * rr, py = Math.sin(a) * rr; i ? s.lineTo(px, py) : s.moveTo(px, py); }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: .04, bevelThickness: .04, bevelSegments: 2 }); g.center(); return g;
}
const HEART = heartGeo(1), STAR = starGeo(0.5);
function cloud(s = 1) { const g = new THREE.Group(); [[0, 0, 0, 1], [1, -.15, 0, .75], [-1, -.2, 0, .7], [.45, .45, 0, .7]].forEach(([x, y, z, r]) => g.add(M3(GEO.sph, '#ffffff', x, y, z, { s: r }))); g.scale.setScalar(s); return g; }
const DECO = {
  rainbow: () => { const g = new THREE.Group(); RAINBOW.slice(0, 6).forEach((c, i) => g.add(M3(new THREE.TorusGeometry(3.6 - i * .34, .19, 10, 48, Math.PI), c, 0, 0, 0))); g.add(cloud(.9).translateX(-3.2).translateY(.3)); g.add(cloud(.9).translateX(3.2).translateY(.3)); return g; },
  castle: () => {
    const g = new THREE.Group();
    g.add(M3(new THREE.CylinderGeometry(.9, .95, 2.4, 20), '#ffe7f3', 0, 1.2, 0)); g.add(M3(new THREE.ConeGeometry(1.1, 1.4, 20), '#c9a4ff', 0, 3.1, 0));
    for (const s of [-1, 1]) { g.add(M3(new THREE.CylinderGeometry(.5, .52, 1.8, 16), '#fff3f9', s * 1.3, .9, .2)); g.add(M3(new THREE.ConeGeometry(.64, 1.1, 16), '#ff9fd0', s * 1.3, 2.35, .2)); }
    g.add(M3(new THREE.BoxGeometry(.6, .9, .1), '#d86aa6', 0, .45, .92)); g.add(M3(HEART, '#ff6fb3', 0, 1.75, .9, { s: .35 }));
    g.add(M3(new THREE.CylinderGeometry(.02, .02, .7, 6), '#ffffff', 0, 4.1, 0)); g.add(M3(new THREE.BoxGeometry(.4, .25, .02), '#ff6fb3', .2, 4.3, 0));
    return g;
  },
  cake: () => {
    const g = new THREE.Group();
    g.add(M3(new THREE.CylinderGeometry(1.3, 1.3, 1, 28), '#fff3f8', 0, .5, 0)); g.add(M3(new THREE.TorusGeometry(1.3, .14, 8, 36), '#ffb6d5', 0, 1, 0, { rx: Math.PI / 2 }));
    g.add(M3(new THREE.CylinderGeometry(.9, .9, .8, 28), '#ffe0ee', 0, 1.4, 0)); g.add(M3(new THREE.TorusGeometry(.9, .12, 8, 30), '#ffffff', 0, 1.8, 0, { rx: Math.PI / 2 }));
    g.add(M3(GEO.sph, '#ff4f79', 0, 2.1, 0, { s: [.34, .4, .34] })); for (let i = 0; i < 4; i++) g.add(M3(new THREE.ConeGeometry(.08, .25, 6), '#5cc26c', Math.cos(i * 1.57) * .12, 2.45, Math.sin(i * 1.57) * .12, { rz: Math.cos(i * 1.57) * -.8, rx: Math.sin(i * 1.57) * .8 }));
    g.add(M3(new THREE.BoxGeometry(.5, .7, .1), '#c77dab', 0, .35, 1.28)); g.add(M3(GEO.sph, '#ffe066', .12, .35, 1.34, { s: .04 }));
    return g;
  },
  mushroom: () => {
    const g = new THREE.Group();
    g.add(M3(new THREE.CylinderGeometry(.65, .75, 1.5, 20), '#fff7ea', 0, .75, 0)); g.add(M3(new THREE.SphereGeometry(1.35, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), '#ff8fb8', 0, 1.35, 0, { s: [1, .85, 1] }));
    [[.6, 2.1, .7], [-.7, 2, .6], [0, 2.45, .3], [.9, 1.75, -.4], [-.3, 1.9, -.9]].forEach(([x, y, z]) => g.add(M3(GEO.sph, '#ffffff', x, y, z, { s: .16 })));
    g.add(M3(new THREE.CylinderGeometry(.25, .25, .1, 16, 1, false, 0, Math.PI), '#c77dab', 0, .35, .72, { rx: Math.PI / 2, rz: Math.PI / 2 }));
    g.add(M3(new THREE.BoxGeometry(.42, .6, .1), '#c77dab', 0, .35, .72)); g.add(M3(new THREE.CircleGeometry(.18, 16), '#bfeaff', .4, .95, .62, { ry: .5 }));
    return g;
  },
  fountain: () => {
    const g = new THREE.Group();
    g.add(M3(new THREE.CylinderGeometry(1.4, 1.5, .5, 28), '#efe8ff', 0, .25, 0)); g.add(M3(new THREE.CylinderGeometry(1.2, 1.2, .1, 28), '#a8e6ff', 0, .48, 0));
    g.add(M3(new THREE.CylinderGeometry(.18, .25, 1.2, 12), '#efe8ff', 0, 1, 0)); g.add(M3(new THREE.CylinderGeometry(.6, .3, .3, 20), '#efe8ff', 0, 1.6, 0)); g.add(M3(new THREE.CylinderGeometry(.5, .5, .05, 20), '#a8e6ff', 0, 1.74, 0));
    const drops = []; for (let i = 0; i < 10; i++) { const d = M3(GEO.sphLo, '#bff0ff', 0, 1.8, 0, { s: .08 }); d.userData.ph = i / 10; g.add(d); drops.push(d); }
    g.userData.tick = (t) => drops.forEach((d, i) => { const k = (t * .8 + d.userData.ph) % 1, a = i / 10 * Math.PI * 2; d.position.set(Math.cos(a) * k * .9, 1.8 + k * 1.2 - k * k * 1.7, Math.sin(a) * k * .9); });
    return g;
  },
  balloons: () => {
    const g = new THREE.Group(), cols = ['#ff8fc6', '#b8a4ff', '#8fdcff', '#ffe066', '#9ee493'], bs = [];
    cols.forEach((c, i) => { const b = new THREE.Group(); const x = (i - 2) * .45, h = 2.2 + (i % 2) * .5; b.add(M3(HEART, c, 0, h, 0, { s: .55 })); b.add(M3(new THREE.CylinderGeometry(.008, .008, h, 4), '#ffffff', 0, h / 2, 0)); b.position.x = x; b.userData.ph = i; g.add(b); bs.push(b); });
    g.add(M3(new THREE.BoxGeometry(.5, .3, .5), '#ffd1e8', 0, .15, 0));
    g.userData.tick = t => bs.forEach(b => { b.rotation.z = Math.sin(t * 1.3 + b.userData.ph) * .08; b.rotation.y = Math.sin(t * .7 + b.userData.ph) * .4; });
    return g;
  },
  lollipop: () => {
    const g = new THREE.Group();
    for (const [x, z, s] of [[0, 0, 1], [1.2, .5, .75]]) {
      const l = new THREE.Group(); l.add(M3(new THREE.CylinderGeometry(.07, .07, 2.4, 8), '#ffffff', 0, 1.2, 0));
      ['#ff8fc6', '#ffffff', '#b8a4ff', '#ffffff', '#8fdcff'].forEach((c, i) => l.add(M3(new THREE.TorusGeometry(.7 - i * .14, .08, 8, 28), c, 0, 2.6, 0)));
      l.add(M3(GEO.sph, '#ffe066', 0, 2.6, 0, { s: [.1, .1, .06] })); l.position.set(x, 0, z); l.scale.setScalar(s); g.add(l);
    }
    return g;
  },
  pond: () => {
    const g = new THREE.Group(); g.add(M3(new THREE.CylinderGeometry(1.6, 1.6, .06, 32), '#aee6ff', 0, .04, 0)); g.add(M3(new THREE.TorusGeometry(1.6, .12, 8, 32), '#efe8ff', 0, .06, 0, { rx: Math.PI / 2 }));
    [[.5, .3], [-.6, -.2], [.1, -.7]].forEach(([x, z], i) => { g.add(M3(new THREE.CylinderGeometry(.35, .35, .03, 16), '#8fdc9f', x, .09, z)); if (i < 2) for (let j = 0; j < 6; j++) g.add(M3(new THREE.ConeGeometry(.08, .3, 6), '#ff9fcf', x + Math.cos(j) * .08, .2, z + Math.sin(j) * .08, { rx: Math.sin(j) * .5, rz: -Math.cos(j) * .5 })); });
    return g;
  },
  teaset: () => {
    const g = new THREE.Group(); g.add(M3(new THREE.CylinderGeometry(1, 1, .1, 24), '#ffffff', 0, .8, 0)); g.add(M3(new THREE.CylinderGeometry(.12, .2, .8, 10), '#ffd1e8', 0, .4, 0));
    g.add(M3(GEO.sph, '#ff9fcf', 0, 1.1, 0, { s: .28 })); g.add(M3(new THREE.CylinderGeometry(.04, .06, .3, 8), '#ff9fcf', .3, 1.15, 0, { rz: -.8 })); g.add(M3(GEO.sph, '#ffffff', 0, 1.4, 0, { s: .07 }));
    [[.55, .3], [-.5, .35], [0, -.6]].forEach(([x, z], i) => { g.add(M3(new THREE.CylinderGeometry(.13, .1, .18, 12), ['#b8a4ff', '#8fdcff', '#ffe066'][i], x, .94, z)); });
    for (const [x, z] of [[1.4, .2], [-1.4, .2]]) g.add(M3(new THREE.CylinderGeometry(.35, .35, .5, 16), '#ffe0ee', x, .25, z));
    return g;
  },
};
Object.assign(DECO, {
  swing: () => {
    const g = new THREE.Group();
    for (const s of [-1, 1]) for (const z of [-1, 1]) g.add(M3(new THREE.CylinderGeometry(.06, .06, 2.45, 8), '#ffb3d9', s * 1.05, 1.15, z * .38, { rx: z * .32 }));
    g.add(M3(new THREE.CylinderGeometry(.07, .07, 2.3, 8), '#c9a4ff', 0, 2.3, 0, { rz: Math.PI / 2 }));
    const seat = new THREE.Group(); seat.position.y = 2.3; g.add(seat);
    for (const s of [-1, 1]) seat.add(M3(new THREE.CylinderGeometry(.015, .015, 1.6, 4), '#ffffff', s * .35, -.8, 0));
    seat.add(M3(new THREE.BoxGeometry(.9, .08, .4), '#ff8fc6', 0, -1.6, 0));
    g.userData.tick = t => seat.rotation.x = Math.sin(t * 1.6) * .35; return g;
  },
  slide: () => {
    const g = new THREE.Group(); g.add(M3(new THREE.BoxGeometry(.9, .1, .9), '#ffe066', -.8, 1.6, 0));
    for (const x of [-1.2, -.4]) for (const z of [-.4, .4]) g.add(M3(new THREE.CylinderGeometry(.05, .05, 1.6, 6), '#ffffff', x, .8, z));
    g.add(M3(new THREE.BoxGeometry(2.45, .08, .8), '#8fdcff', .6, .84, 0, { rz: -.7 }));
    for (let i = 0; i < 4; i++) g.add(M3(new THREE.BoxGeometry(.12, .06, .8), '#ff9fcf', -1.3, .3 + i * .35, 0));
    return g;
  },
  carousel: () => {
    const g = new THREE.Group(); g.add(M3(new THREE.CylinderGeometry(1.3, 1.35, .22, 28), '#fff0f7', 0, .11, 0));
    g.add(M3(new THREE.CylinderGeometry(.08, .08, 2.2, 8), '#ffd35c', 0, 1.2, 0)); g.add(M3(new THREE.ConeGeometry(1.5, .8, 28), '#ff9fd0', 0, 2.6, 0)); g.add(M3(GEO.sph, '#ffe066', 0, 3.05, 0, { s: .14 }));
    const rot = new THREE.Group(); g.add(rot);
    ['#ffffff', '#c9a4ff', '#8fdcff', '#ffe066'].forEach((c, i) => { const a = i / 4 * Math.PI * 2, x = Math.sin(a) * .9, z = Math.cos(a) * .9; rot.add(M3(new THREE.CylinderGeometry(.025, .025, 2, 6), '#ffd35c', x, 1.2, z)); const h = new THREE.Group(); h.add(M3(GEO.sph, c, 0, 0, 0, { s: [.32, .2, .16] })); h.add(M3(GEO.sph, c, .28, .16, 0, { s: .13 })); h.add(M3(new THREE.ConeGeometry(.04, .14, 6), '#ffd35c', .3, .3, 0)); h.position.set(x, .9, z); h.rotation.y = -a; h.userData.ph = i; rot.add(h); });
    g.userData.tick = t => { rot.rotation.y = t * .6; rot.children.forEach(h => { if (h.userData.ph !== undefined) h.position.y = .9 + Math.sin(t * 2 + h.userData.ph * 1.6) * .15; }); }; return g;
  },
  tent: () => { const g = new THREE.Group(); g.add(M3(new THREE.ConeGeometry(1.1, 1.9, 6), '#c9a4ff', 0, .95, 0)); g.add(M3(new THREE.BoxGeometry(.5, .7, .05), '#7258d6', 0, .35, .93)); [[.5, 1.2], [-.4, .9], [.1, 1.5]].forEach(([x, y]) => g.add(M3(STAR, '#ffe066', x * .6, y, (1.9 - y) * .5, { s: .2 }))); g.add(M3(new THREE.CylinderGeometry(.015, .015, .5, 4), '#ffffff', 0, 2.1, 0)); g.add(M3(new THREE.BoxGeometry(.3, .18, .02), '#ff8fc6', .15, 2.25, 0)); return g; },
  snowman: () => { const g = new THREE.Group(); g.add(M3(GEO.sph, '#ffffff', 0, .6, 0, { s: .62 })); g.add(M3(GEO.sph, '#ffffff', 0, 1.42, 0, { s: .42 })); for (const s of [-1, 1]) g.add(M3(GEO.sphLo, '#3b1f3f', s * .14, 1.5, .37, { s: .05 })); g.add(M3(new THREE.ConeGeometry(.06, .3, 8), '#ffa040', 0, 1.42, .5, { rx: Math.PI / 2 })); g.add(M3(new THREE.TorusGeometry(.38, .08, 8, 20), '#ff8fc6', 0, 1.1, 0, { rx: Math.PI / 2 })); g.add(M3(new THREE.CylinderGeometry(.26, .3, .35, 16), '#9d82f5', 0, 1.95, 0)); g.add(M3(new THREE.CylinderGeometry(.42, .42, .04, 20), '#9d82f5', 0, 1.78, 0)); return g; },
  icecream: () => { const g = new THREE.Group(); g.add(M3(new THREE.BoxGeometry(1.5, .8, .8), '#fff0f7', 0, .6, 0)); for (const s of [-1, 1]) g.add(M3(new THREE.TorusGeometry(.18, .06, 8, 16), '#c9a4ff', s * .5, .18, .42)); g.add(M3(new THREE.CylinderGeometry(.03, .03, 1.6, 6), '#ffffff', .5, 1.6, 0)); g.add(M3(new THREE.ConeGeometry(1, .45, 16), '#ff9fcf', .5, 2.5, 0)); g.add(M3(new THREE.ConeGeometry(.18, .55, 12), '#f5c48a', -.3, 1.25, 0, { rx: Math.PI })); g.add(M3(GEO.sph, '#ffc2e0', -.3, 1.6, 0, { s: .22 })); g.add(M3(GEO.sph, '#bff0ff', -.3, 1.85, 0, { s: .19 })); return g; },
  flowerbed: () => { const g = new THREE.Group(); g.add(M3(new THREE.BoxGeometry(3.2, .18, 1), '#e9d6ff', 0, .09, 0)); for (let i = 0; i < 9; i++) { const x = -1.3 + i * .33, z = (i % 2) * .3 - .15, c = ['#ff8fc6', '#ffe066', '#c9a4ff', '#ffffff', '#ff9a7a'][i % 5]; g.add(M3(new THREE.CylinderGeometry(.02, .02, .5, 4), '#5cc26c', x, .4, z)); g.add(M3(GEO.sphLo, c, x, .7, z, { s: [.11, .14, .11] })); } return g; },
  heartarch: () => { const g = new THREE.Group(); g.add(M3(new THREE.TorusGeometry(1.4, .12, 10, 36, Math.PI), '#ff9fd0', 0, 0, 0)); for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI; g.add(M3(GEO.sphLo, i % 2 ? '#ffffff' : '#ffe066', Math.cos(a) * 1.4, Math.sin(a) * 1.4, .1, { s: .12 })); } g.add(M3(HEART, '#ff6fb1', 0, 1.75, 0, { s: .55 })); return g; },
  hotair: () => { const g = new THREE.Group(), b = new THREE.Group(); g.add(b); b.add(M3(GEO.sph, '#ffb3d9', 0, 1.3, 0, { s: [1, 1.15, 1] })); b.add(M3(new THREE.TorusGeometry(1, .08, 8, 28), '#ffffff', 0, 1.3, 0, { rx: Math.PI / 2 })); b.add(M3(new THREE.BoxGeometry(.5, .4, .5), '#f5c48a', 0, -.15, 0)); for (const [x, z] of [[-.22, -.22], [.22, -.22], [-.22, .22], [.22, .22]]) b.add(M3(new THREE.CylinderGeometry(.01, .01, .6, 4), '#ffffff', x, .25, z)); g.userData.tick = t => { const a = t * .08; b.position.set(Math.cos(a) * 11, 7.5 + Math.sin(t * .7) * .4, Math.sin(a) * 11); }; return g; },
  moon: () => { const g = new THREE.Group(); g.add(M3(GEO.sph, '#fff1a8', 0, 0, 0, { s: 1.2 })); for (const s of [-1, 1]) { g.add(M3(GEO.happy, MAT.eye, s * .4, .15, 1.15, { s: 2.2, rz: Math.PI })); g.add(M3(GEO.cheek, MAT.cheek, s * .65, -.15, 1.05, { s: 2 })); } return g; },
});

// id の かざりを つくる（ない id は null）
export function buildDeco(id) { return DECO[id] ? DECO[id]() : null; }
