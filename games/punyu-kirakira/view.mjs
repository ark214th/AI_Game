// 3D表示。ゲームの計算は2D（core.mjs）で、見た目だけ立体にする
import * as T from './vendor/three.module.min.js';
import { TUNE, clamp } from './core.mjs';
import { ITEMS } from './rewards.mjs';

const COLORS = {
  punyu: 0xfff4f7, cheek: 0xff9fb8, eye: 0x3a2a3a,
  star: 0xffd84a, enemy: 0xb58cff, enemyDark: 0x8c63d9,
};

// ワールドごとの色と飾り
export const THEMES = {
  nohara: {
    sky: ['#7fd0ff', '#cdeeff', '#fff1f7'], fog: 0xe8f6ff, hemi: [0xffffff, 0xc9e7b8, 1.6], sun: 1.6,
    top: 0x8fdc6e, soil: 0xf2c79a, dots: [0xe0a97c], hills: [0xa8e58f, 0x97dc86, 0xb9ecb0], far: 0xc6e8f7, cloud: 0xffffff,
    plat: [0xfff0d6, 0xff9fc6], decor: 'flowers',
  },
  okashi: {
    sky: ['#ffb8d8', '#ffe0ee', '#fff6e6'], fog: 0xffeef5, hemi: [0xffffff, 0xf5c7d8, 1.6], sun: 1.5,
    top: 0xfff2f6, soil: 0x9a5b3c, dots: [0xff6f91, 0x7fd4ff, 0xffe066, 0x8be08b, 0xffffff], hills: [0xffb3d1, 0xffd28a, 0xd6b3ff], far: 0xffd9ea, cloud: 0xffffff,
    plat: [0xf2c98f, 0xff8fb5], decor: 'candy',
  },
  kumo: {
    sky: ['#8fd3ff', '#d9f1ff', '#ffffff'], fog: 0xeaf6ff, hemi: [0xffffff, 0xdfe8ff, 1.7], sun: 1.4,
    top: 0xffffff, soil: 0xe3e9fb, dots: [0xd3dcf7], hills: [0xffffff, 0xf3ecff, 0xe8f4ff], far: 0xeef6ff, cloud: 0xffffff,
    plat: [0xffffff, 0xbfe3ff], decor: 'sky',
  },
  umi: {
    sky: ['#4fc3f0', '#b8ecff', '#fff4d4'], fog: 0xdff5ff, hemi: [0xffffff, 0xf7e2a8, 1.6], sun: 1.7,
    top: 0xf7e2a8, soil: 0xe8c47e, dots: [0xffffff, 0xffc2b3], hills: [0x6ed3a0, 0x5cc59a, 0x84dcae], far: 0x9adfff, cloud: 0xffffff,
    plat: [0xd9a066, 0x8fd8ff], decor: 'beach', water: 0x3fb8e6,
  },
  hoshi: {
    sky: ['#141844', '#35347a', '#7b5aa8'], fog: 0x2a2b5e, hemi: [0xc9c4ff, 0x3a3570, 1.3], sun: 0.9, night: true,
    top: 0x9f92e6, soil: 0x4a4388, dots: [0x6b5fb5, 0xffe38a], hills: [0x3b3780, 0x463f8f, 0x2f2b6b], far: 0x25255a, cloud: 0x8e87c9,
    plat: [0xd9d2ff, 0xffd84a], decor: 'castle',
  },
};

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

// 動かない飾りを「材質ごと・横40マスの区画ごと」に1つの形へまとめる（iPhone向け）。
// 区画に分けておくと、画面の外の区画は丸ごと描かずに済む
const CHUNK = 40;
function mergeStatic(group) {
  group.updateMatrixWorld(true);
  const buckets = new Map();
  const out = new T.Group();
  const center = new T.Vector3();
  group.traverse(o => {
    if (!o.isMesh) return;
    if (Array.isArray(o.material) || o.material.map) { const c = o.clone(); o.matrixWorld.decompose(c.position, c.quaternion, c.scale); out.add(c); return; }
    const g = o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    g.computeBoundingBox();
    g.boundingBox.getCenter(center);
    const key = o.material.uuid + '|' + Math.floor(center.x / CHUNK);
    if (!buckets.has(key)) buckets.set(key, { mat: o.material, list: [] });
    buckets.get(key).list.push(g);
  });
  for (const { mat, list } of buckets.values()) {
    let nv = 0, ni = 0;
    for (const g of list) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3);
    const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let vo = 0, io = 0;
    for (const g of list) {
      const n = g.attributes.position.count;
      pos.set(g.attributes.position.array, vo * 3);
      if (g.attributes.normal) nor.set(g.attributes.normal.array, vo * 3);
      if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i++) idx[io + i] = a[i] + vo; io += a.length; }
      else { for (let i = 0; i < n; i++) idx[io + i] = vo + i; io += n; }
      vo += n;
      g.dispose();
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
    geo.setIndex(new T.BufferAttribute(idx, 1));
    geo.computeBoundingSphere();
    out.add(new T.Mesh(geo, mat));
  }
  return out;
}

const lerp = (a, b, t) => a + (b - a) * t;
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export class View {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.quality = 1; // 重いときだけ下げる（上げ直さない）
    this.applied = { w: 0, h: 0, ratio: 0 };
    this.needResize = true;
    this.slowSince = 0;
    this.targetInterval = 1 / 60;
    this.cannotKeepUp = false;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(30, 1, 2, 160);
    this.cam = { x: 0, y: 2, look: 2.5 };
    this.clock = 0;
    this.frameTimes = [];
    this.debugHitbox = false;
    this.setupLights();
    this.shared();
    this.sparkMats = new Map();
    this.sparkPool = [];
    // iOS はメモリが足りないと WebGL を一時的に止めることがある
    canvas.addEventListener('webglcontextlost', e => e.preventDefault());
  }

  setupSky(th) {
    const c = document.createElement('canvas');
    c.width = 2; c.height = 256;
    const g = c.getContext('2d'), grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, th.sky[0]); grd.addColorStop(0.72, th.sky[1]); grd.addColorStop(1, th.sky[2]);
    g.fillStyle = grd; g.fillRect(0, 0, 2, 256);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    this.scene.background?.dispose?.();
    this.scene.background = tex;
    this.scene.fog = new T.Fog(th.fog, 45, 120);
    this.hemi.color.setHex(th.hemi[0]); this.hemi.groundColor.setHex(th.hemi[1]); this.hemi.intensity = th.hemi[2];
    this.sun.intensity = th.sun;
  }

  setupLights() {
    this.hemi = new T.HemisphereLight(0xffffff, 0xc9e7b8, 1.6);
    this.scene.add(this.hemi);
    this.sun = new T.DirectionalLight(0xffffff, 1.6);
    this.sun.position.set(-4, 10, 8);
    this.scene.add(this.sun);
  }

  shared() {
    this.geo = {
      star: new T.ExtrudeGeometry(starShape(), { depth: 0.14, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2 }),
      bigStar: new T.ExtrudeGeometry(starShape(1.3, 0.6), { depth: 0.4, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.14, bevelSegments: 3 }),
      heart: new T.ExtrudeGeometry(heartShape(), { depth: 0.18, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 2 }),
      ball: new T.SphereGeometry(1, 20, 14),
      mid: new T.SphereGeometry(1, 14, 9),
      low: new T.SphereGeometry(1, 8, 6),
      spark: new T.OctahedronGeometry(0.12),
      cone: new T.ConeGeometry(1, 1, 8),
      cyl: new T.CylinderGeometry(1, 1, 1, 12),
    };
    this.geo.star.center(); this.geo.bigStar.center(); this.geo.heart.center();
    this.mat = {
      star: toon(COLORS.star, { emissive: 0x6b4a00, emissiveIntensity: 0.35 }),
      white: toon(0xffffff), eye: new T.MeshBasicMaterial({ color: COLORS.eye }), shine: new T.MeshBasicMaterial({ color: 0xffffff }),
      cheek: toon(COLORS.cheek), shadow: new T.MeshBasicMaterial({ color: 0x2c2c4a, transparent: true, opacity: 0.22, depthWrite: false }),
      heart: toon(0xff5d86, { emissive: 0x80203a, emissiveIntensity: 0.35 }),
      bubble: new T.MeshToonMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0.42, emissive: 0x6fb8ff, emissiveIntensity: 0.25, depthWrite: false }),
    };
  }

  // 画面サイズの変化は印だけ付け、実際の変更は描画の直前に行う。
  // 描画と描画のあいだにキャンバスの大きさを変えると、中身が消えて画面がちらつくため。
  resize() { this.needResize = true; }

  applySize() {
    const w = Math.max(1, this.canvas.clientWidth || window.innerWidth), h = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    // 描く画素数に上限をつける（大きな iPad で重くなりすぎないように）
    const MAX_PIXELS = 2.2e6;
    let ratio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(MAX_PIXELS / (w * h))) * this.quality;
    ratio = Math.max(0.75, Math.round(ratio * 20) / 20);
    const a = this.applied;
    if (a.w === w && a.h === h && a.ratio === ratio) return;
    a.w = w; a.h = h; a.ratio = ratio;
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---------- ステージを組み立てる ----------
  build(game) {
    if (this.pGroup) { for (const q of this.particles) this.sparkPool.push(q.m); this.pGroup.clear(); this.pGroup.removeFromParent(); }
    if (this.world) { this.scene.remove(this.world); this.dispose(this.world); }
    this.game = game;
    this.world = new T.Group();
    this.scene.add(this.world);
    const st = game.stage, t = game.t;
    const th = this.th = THEMES[st.theme] || THEMES.nohara;
    this.setupSky(th);
    this.stat = new T.Group();
    this.buildGround(t, th);
    this.buildBackdrop(t, th);
    this.buildDecor(t, th);
    for (const p of t.platforms) if (p.kind === 'static') this.stat.add(this.makePlatform(p, th));
    this.world.add(mergeStatic(this.stat));
    this.stat = null;
    const add = (o, x, y, z = 0) => { o.position.set(x, y, z); this.world.add(o); return o; };
    this.dynPlats = t.platforms.filter(p => p.kind !== 'static').map(p => ({ p, m: add(this.makeDynPlatform(p, th), p.x, p.y) }));
    this.starMeshes = game.stars.map(s => add(new T.Mesh(this.geo.star, this.mat.star), s.x, s.y));
    this.medalMeshes = game.medals.map(m => add(this.makeMedal(m.had), m.x, m.y));
    this.heartMeshes = game.heartItems.map(h => add(new T.Mesh(this.geo.heart, this.mat.heart), h.x, h.y));
    this.springMeshes = game.springs.map(s => add(this.makeSpring(), s.x, s.y));
    this.dashMeshes = game.dashes.map(d => add(this.makeDash(), d.x, d.y));
    this.enemyMeshes = game.enemies.map(e => add(this.makeEnemy(e.kind), e.x, e.y));
    this.spikeMeshes = game.spikes.map(s => add(this.makeSpike(), s.x, s.y));
    this.updraftMeshes = game.updrafts.map(u => add(this.makeUpdraft(u, th), u.x, u.y));
    this.loopMeshes = game.loops.map(l => add(this.makeLoop(l), l.x + 0.6, l.y + l.R, -0.9));
    this.ventMeshes = game.vents.map(v => add(this.makeVent(), v.x, v.y));
    this.switchMeshes = game.switches.map(s => add(this.makeSwitch(), s.x, s.y));
    this.flagMeshes = game.checkpoints.map(c => add(this.makeFlag(), c.x, c.y, -0.6));
    for (const s of st.sign) add(this.makeSign(s.icon), s.x, s.y, -1.4);
    this.goalMesh = null;
    if (game.goal) this.goalMesh = add(this.makeGoal(), game.goal.x, game.goal.y);
    this.bossMesh = null; this.gates = [];
    if (game.boss) {
      const B = game.boss;
      this.bossMesh = add(this.makeBoss(B.type), B.x, B.y);
      for (const x of [B.x0, B.x1]) { const gate = add(this.makeGate(th), x, B.floor, -0.2); gate.visible = false; this.gates.push(gate); }
    }
    this.shotMeshes = new Map();
    this.lostMeshes = new Map();
    this.dropMeshes = new Map();
    this.chaseMeshes = game.chasers.map(() => { const m = this.makeChaseBall(th); m.visible = false; this.world.add(m); return m; });
    this.rideMeshes = new Map();
    this.player = this.makePunyu();
    this.world.add(this.player);
    this.playerShadow = new T.Mesh(new T.CircleGeometry(0.45, 20), this.mat.shadow);
    this.playerShadow.rotation.x = -Math.PI / 2;
    this.world.add(this.playerShadow);
    this.bubble = new T.Mesh(this.geo.ball, this.mat.bubble);
    this.bubble.scale.setScalar(0.85); this.bubble.visible = false;
    this.world.add(this.bubble);
    this.windLines = this.makeWindLines();
    this.particles = [];
    this.pGroup = new T.Group(); this.world.add(this.pGroup);
    this.hitboxes = null;
    this.cam.x = game.p.x; this.cam.y = game.p.y + 2; this.cam.look = 2.5;
    this.snapCamera = true;
  }

  dispose(obj) {
    const keepG = new Set(Object.values(this.geo)), keepM = new Set([...Object.values(this.mat), ...this.sparkMats.values()]);
    obj.traverse(o => {
      if (o.geometry && !keepG.has(o.geometry)) o.geometry.dispose();
      for (const m of [].concat(o.material || [])) if (!keepM.has(m)) { m.map?.dispose(); m.dispose(); }
    });
  }

  buildGround(t, th) {
    const soil = toon(th.soil), grass = toon(th.top);
    const bottom = t.lowest - 9;
    for (const piece of t.pieces) {
      const pts = piece.pts;
      const s = new T.Shape();
      s.moveTo(pts[0][0], bottom);
      for (const [x, y] of pts) s.lineTo(x, y - 0.25); // ふちの丸み(0.2)を足しても草より下
      s.lineTo(pts[pts.length - 1][0], bottom);
      s.closePath();
      const body = new T.Mesh(new T.ExtrudeGeometry(s, { depth: 4, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.2, bevelSegments: 2, curveSegments: 1 }), soil);
      body.position.z = -3.3; // 手前の面はぷにゅのすぐ前（段差でぷにゅが隠れないように）
      this.stat.add(body);
      // 上の層（草・クリーム・雲・砂・石畳）
      const g = new T.Shape();
      g.moveTo(pts[0][0] - 0.1, pts[0][1] + 0.08);
      for (const [x, y] of pts) g.lineTo(x, y - 0.04); // ふちの丸み(0.12)を足した表面が、足もとの高さとほぼ同じになる
      g.lineTo(pts[pts.length - 1][0] + 0.1, pts[pts.length - 1][1] + 0.08);
      for (let i = pts.length - 1; i >= 0; i--) g.lineTo(pts[i][0] + (i === pts.length - 1 ? 0.1 : i === 0 ? -0.1 : 0), pts[i][1] - 0.45);
      g.closePath();
      const top = new T.Mesh(new T.ExtrudeGeometry(g, { depth: 4.2, bevelEnabled: true, bevelThickness: 0.18, bevelSize: 0.12, bevelSegments: 2 }), grass);
      top.position.z = -3.45;
      this.stat.add(top);
      // おかしの森：クリームのたれ
      if (th.decor === 'candy') {
        for (let x = piece.x0 + 0.3; x < piece.x1 - 0.2; x += 0.55) {
          const gy = t.groundAt(x); if (gy === null) continue;
          const d = new T.Mesh(this.geo.low, grass); d.scale.set(0.24, 0.22 + ((x * 7) % 1) * 0.25, 0.12); d.position.set(x, gy - 0.45, 0.92); this.stat.add(d);
        }
      }
      // 土の模様
      const r = rng(Math.floor(piece.x0 * 13 + 7));
      const dots = th.dots.map(c => toon(c));
      for (let x = piece.x0 + 1; x < piece.x1 - 1; x += 1.3 + r() * 1.8) {
        const gy = t.groundAt(x);
        if (gy === null) continue;
        const m = new T.Mesh(this.geo.low, dots[Math.floor(r() * dots.length)]);
        if (th.decor === 'candy') { m.scale.set(0.2, 0.07, 0.05); m.rotation.z = r() * 3; } // カラースプレー
        else m.scale.set(0.22 + r() * 0.12, 0.16 + r() * 0.08, 0.05);
        m.position.set(x, gy - 1 - r() * 3, 0.92);
        this.stat.add(m);
      }
    }
    // 海：穴の下は水
    if (th.water) {
      const water = new T.Mesh(new T.BoxGeometry(t.x1 - t.x0 + 120, 0.4, 60), toon(th.water, { transparent: true, opacity: 0.85 }));
      water.position.set((t.x0 + t.x1) / 2, t.lowest - 1.6, -24);
      this.stat.add(water);
    }
  }

  buildBackdrop(t, th) {
    const r = rng(42);
    const hillMats = th.hills.map(c => toon(c));
    for (let x = t.x0 - 30; x < t.x1 + 40; x += 14 + r() * 10) {
      const m = new T.Mesh(this.geo.mid, hillMats[Math.floor(r() * hillMats.length)]);
      const s = 9 + r() * 8;
      m.scale.set(s * 1.4, s, s * 0.6);
      m.position.set(x, t.lowest - s * (th.decor === 'umi' ? 0.7 : 0.45), -34 - r() * 10);
      if (th.decor === 'beach') { m.scale.set(s * 1.8, s * 0.5, s * 0.5); m.position.y = t.lowest - 2; m.position.z = -46 - r() * 8; }
      this.stat.add(m);
    }
    const far = toon(th.far);
    for (let x = t.x0 - 40; x < t.x1 + 60; x += 30 + r() * 20) {
      const m = new T.Mesh(this.geo.mid, far);
      const s = 18 + r() * 10;
      m.scale.set(s * 1.6, s, 4);
      m.position.set(x, t.lowest - s * 0.3, -70);
      if (th.decor === 'beach') { m.scale.set(s * 3, 2, 4); m.position.y = t.lowest - 1; }
      this.stat.add(m);
    }
    const cloud = toon(th.cloud, th.night ? { transparent: true, opacity: 0.5 } : {});
    for (let x = t.x0 - 20; x < t.x1 + 40; x += 12 + r() * 14) {
      const c = new T.Group();
      for (let i = 0; i < 4; i++) {
        const m = new T.Mesh(this.geo.low, cloud);
        const s = 1 + r() * 0.9;
        m.scale.set(s, s * 0.8, s * 0.7);
        m.position.set(i * 1.1 - 1.6, (i === 1 || i === 2) ? 0.5 : 0, 0);
        c.add(m);
      }
      c.position.set(x, 9 + r() * 6, -26 - r() * 10);
      if (th.decor === 'sky') c.position.y = t.lowest - 2 + r() * 14;
      this.stat.add(c);
    }
    // 雲の上：下にも雲の海
    if (th.decor === 'sky') {
      for (let x = t.x0 - 30; x < t.x1 + 40; x += 5 + r() * 3) {
        const m = new T.Mesh(this.geo.low, cloud); const s = 3 + r() * 2;
        m.scale.set(s, s * 0.6, s); m.position.set(x, t.lowest - 5 - r() * 2, -6 - r() * 20);
        this.stat.add(m);
      }
      // 虹
      const cols = [0xff6f91, 0xffb84d, 0xffe45c, 0x7ee081, 0x5cc8ff, 0xa98bff];
      for (let x = t.x0 + 20; x < t.x1; x += 70) {
        cols.forEach((col, i) => {
          const m = new T.Mesh(new T.TorusGeometry(14 - i * 0.7, 0.36, 6, 40, Math.PI), toon(col, { transparent: true, opacity: 0.8 }));
          m.position.set(x, t.lowest - 2, -50); this.stat.add(m);
        });
      }
    }
    // 夜空の星と、遠くのお城
    if (th.night) {
      const pts = [];
      for (let i = 0; i < 400; i++) pts.push((t.x0 - 60) + r() * (t.x1 - t.x0 + 160), t.lowest + 4 + r() * 40, -90 - r() * 10);
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
      this.world.add(new T.Points(geo, new T.PointsMaterial({ color: 0xfff6c8, size: 0.35, fog: false })));
      const wall = toon(0x5a52a8), roof = toon(0xff8fc0), win = toon(0xffe38a, { emissive: 0xffc94d, emissiveIntensity: 1 });
      for (let x = t.x0 + 10; x < t.x1 + 20; x += 45) {
        const c = new T.Group();
        for (const [dx, h, rr] of [[-5, 10, 1.6], [0, 15, 2.2], [5, 11, 1.7]]) {
          const tw = new T.Mesh(this.geo.cyl, wall); tw.scale.set(rr, h, rr); tw.position.set(dx, h / 2, 0); c.add(tw);
          const cone = new T.Mesh(this.geo.cone, roof); cone.scale.set(rr * 1.25, rr * 2.2, rr * 1.25); cone.position.set(dx, h + rr * 1.1, 0); c.add(cone);
          const w = new T.Mesh(this.geo.low, win); w.scale.set(0.4, 0.6, 0.2); w.position.set(dx, h * 0.7, rr); c.add(w);
        }
        c.position.set(x, t.lowest - 2, -40);
        this.stat.add(c);
      }
    }
  }

  buildDecor(t, th) {
    const r = rng(7);
    const addTo = (grp, x, y, z, s = 1) => { grp.position.set(x, y, z); grp.scale.setScalar(s); this.stat.add(grp); };
    const petals = [0xff8fb5, 0xffc94d, 0xffffff, 0xb79cff, 0x7fd4ff].map(c => toon(c));
    const center = toon(0xffcf3f), stem = toon(0x5bb34a);
    this.stemGeo = new T.CylinderGeometry(0.03, 0.03, 0.5, 4, 1, true);
    const flower = () => {
      const f = new T.Group();
      const st = new T.Mesh(this.stemGeo, stem); st.position.y = 0.25; f.add(st);
      const pm = petals[Math.floor(r() * petals.length)];
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const p = new T.Mesh(this.geo.low, pm); p.scale.set(0.1, 0.1, 0.05);
        p.position.set(Math.cos(a) * 0.12, 0.55 + Math.sin(a) * 0.12, 0); f.add(p);
      }
      const c = new T.Mesh(this.geo.low, center); c.scale.setScalar(0.07); c.position.set(0, 0.55, 0.03); f.add(c);
      return f;
    };
    const candyCols = [0xff6f91, 0x7fd4ff, 0xffe066, 0x9be07f, 0xc49bff].map(c => toon(c));
    const stick = toon(0xffffff);
    const lollipop = (big) => {
      const g = new T.Group();
      const h = big ? 3.2 : 1.1;
      const s = new T.Mesh(this.geo.cyl, stick); s.scale.set(0.06 * (big ? 2 : 1), h, 0.06 * (big ? 2 : 1)); s.position.y = h / 2; g.add(s);
      const cols = [candyCols[Math.floor(r() * 5)], stick];
      for (let i = 0; i < 4; i++) {
        const d = new T.Mesh(this.geo.cyl, cols[i % 2]); const rr = (big ? 1.2 : 0.4) * (1 - i * 0.22);
        d.scale.set(rr, 0.12 + i * 0.01, rr); d.rotation.x = Math.PI / 2; d.position.set(0, h + (big ? 1.1 : 0.35), i * 0.02); g.add(d);
      }
      return g;
    };
    const cupcake = () => {
      const g = new T.Group();
      const cup = new T.Mesh(new T.CylinderGeometry(0.35, 0.26, 0.45, 10), candyCols[Math.floor(r() * 5)]); cup.position.y = 0.22; g.add(cup);
      const cream = new T.Mesh(this.geo.low, stick); cream.scale.set(0.4, 0.3, 0.4); cream.position.y = 0.5; g.add(cream);
      const cherry = new T.Mesh(this.geo.low, toon(0xff3d6e)); cherry.scale.setScalar(0.12); cherry.position.y = 0.82; g.add(cherry);
      return g;
    };
    const puff = (mat) => {
      const g = new T.Group();
      for (let i = 0; i < 3; i++) { const m = new T.Mesh(this.geo.low, mat); const s = 0.45 + r() * 0.3; m.scale.set(s, s * 0.75, s * 0.7); m.position.set(i * 0.5 - 0.5, i === 1 ? 0.2 : 0, 0); g.add(m); }
      return g;
    };
    const cloudMat = toon(0xffffff), cloudMat2 = toon(0xeaf2ff);
    const trunk = toon(0xc98f5e), palmLeaf = toon(0x4fbf6a), shellMats = [toon(0xffc2b3), toon(0xfff0d6), toon(0xffd6ea)], starfish = toon(0xff9a5c);
    const palm = () => {
      const g = new T.Group();
      let x = 0, y = 0;
      for (let i = 0; i < 6; i++) { const m = new T.Mesh(this.geo.cyl, trunk); m.scale.set(0.2 - i * 0.015, 0.6, 0.2 - i * 0.015); x += 0.12; y += 0.55; m.position.set(x, y, 0); m.rotation.z = -0.2; g.add(m); }
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const l = new T.Mesh(this.geo.low, palmLeaf); l.scale.set(1.2, 0.12, 0.35); l.position.set(x + Math.cos(a) * 0.9, y + 0.1 - Math.abs(Math.sin(a)) * 0.2, Math.sin(a) * 0.9); l.rotation.y = -a; l.rotation.z = -0.35; g.add(l); }
      return g;
    };
    const lanternPost = toon(0x3b3578), lanternGlow = toon(0xffe38a, { emissive: 0xffc94d, emissiveIntensity: 1.1 }), crystal = toon(0xc3a6ff, { emissive: 0x7a5cff, emissiveIntensity: 0.5 });
    const lantern = () => {
      const g = new T.Group();
      const post = new T.Mesh(this.geo.cyl, lanternPost); post.scale.set(0.07, 1.8, 0.07); post.position.y = 0.9; g.add(post);
      const glow = new T.Mesh(this.geo.low, lanternGlow); glow.scale.set(0.28, 0.34, 0.28); glow.position.y = 1.95; g.add(glow);
      const cap = new T.Mesh(this.geo.cone, lanternPost); cap.scale.set(0.3, 0.25, 0.3); cap.position.y = 2.35; g.add(cap);
      return g;
    };
    const bush = toon(0x74c95e), leaf = [toon(0x7ed56a), toon(0x9be07f)];
    for (const piece of t.pieces) {
      for (let x = piece.x0 + 0.6; x < piece.x1 - 0.4; x += 0.8 + r() * 1.8) {
        const y = t.groundAt(x);
        if (y === null) continue;
        const z = -1.2 - r() * 1.8;
        if (th.decor === 'flowers') addTo(flower(), x, y, z, 0.9 + r() * 0.5);
        else if (th.decor === 'candy') { const k = r(); if (k < 0.45) addTo(lollipop(false), x, y, z, 0.9 + r() * 0.4); else if (k < 0.7) addTo(cupcake(), x, y, z); else { const gd = new T.Mesh(this.geo.low, candyCols[Math.floor(r() * 5)]); gd.scale.set(0.25, 0.22, 0.25); gd.position.set(x, y + 0.05, z); this.stat.add(gd); } }
        else if (th.decor === 'sky') { if (r() < 0.6) addTo(puff(r() < 0.5 ? cloudMat : cloudMat2), x, y, z, 0.8 + r() * 0.6); }
        else if (th.decor === 'beach') { const k = r(); if (k < 0.4) { const sh = new T.Mesh(this.geo.cone, shellMats[Math.floor(r() * 3)]); sh.scale.set(0.2, 0.25, 0.2); sh.rotation.z = 0.8; sh.position.set(x, y + 0.1, z); this.stat.add(sh); } else if (k < 0.6) { const sf = new T.Mesh(this.geo.star, starfish); sf.scale.setScalar(0.6); sf.rotation.x = -1.2; sf.position.set(x, y + 0.05, z); this.stat.add(sf); } }
        else if (th.decor === 'castle') { if (r() < 0.35) { const c = new T.Mesh(new T.OctahedronGeometry(0.3), crystal); c.scale.set(0.8, 1.6, 0.8); c.position.set(x, y + 0.4, z); this.stat.add(c); } }
      }
      for (let x = piece.x0 + 2; x < piece.x1 - 1; x += 7 + r() * 9) {
        const y = t.groundAt(x);
        if (y === null) continue;
        const z = -4.8 - r() * 2;
        if (th.decor === 'flowers') {
          if (r() < 0.5) addTo(puff(bush), x, y + 0.3, -2.6, 1.5);
          else {
            const g = new T.Group();
            const tr = new T.Mesh(new T.CylinderGeometry(0.22, 0.3, 2.4, 8), trunk); tr.position.y = 1.2; g.add(tr);
            const lm = leaf[Math.floor(r() * 2)];
            for (let i = 0; i < 3; i++) { const m = new T.Mesh(this.geo.mid, lm); const s = 1.1 + r() * 0.4; m.scale.set(s, s * 0.9, s * 0.8); m.position.set(i * 0.9 - 0.9, 2.8 + (i === 1 ? 0.6 : 0), 0); g.add(m); }
            addTo(g, x, y, z);
          }
        } else if (th.decor === 'candy') addTo(lollipop(true), x, y, z, 0.8 + r() * 0.4);
        else if (th.decor === 'sky') addTo(puff(cloudMat), x, y + 0.2, -3, 2 + r());
        else if (th.decor === 'beach') addTo(palm(), x, y, z, 1 + r() * 0.3);
        else if (th.decor === 'castle') addTo(lantern(), x, y, -2.2);
      }
    }
  }

  makePlatform(p, th) {
    const g = new T.Group();
    const body = new T.Mesh(new T.BoxGeometry(p.w, 0.42, 2.2), toon(th.plat[0]));
    body.position.set(p.w / 2, -0.26, 0);
    const top = new T.Mesh(new T.BoxGeometry(p.w + 0.12, 0.16, 2.3), toon(th.plat[1]));
    top.position.set(p.w / 2, -0.04, 0);
    g.add(body, top);
    // ふちの飾り
    const dm = toon(th.plat[1]);
    for (let x = 0.3; x < p.w; x += 0.6) {
      const d = new T.Mesh(this.geo.low, dm);
      d.scale.set(0.2, 0.18, 0.1); d.position.set(x, -0.14, 1.15); g.add(d);
    }
    g.position.set(p.x, p.y, 0);
    return g;
  }

  // 動く・くずれる・ぽよん・スイッチの橋（毎フレーム動かすので、まとめない）
  makeDynPlatform(p, th) {
    const g = new T.Group();
    const inner = new T.Group(); g.add(inner);
    if (p.kind === 'bouncy') {
      const m = toon(0xffffff), m2 = toon(0xffe3f0);
      for (let x = 0.3; x < p.w; x += 0.55) {
        const s = 0.5 + ((x * 3.7) % 1) * 0.2;
        const b = new T.Mesh(this.geo.low, (x * 10) % 2 < 1 ? m : m2); b.scale.set(s, s * 0.7, 1); b.position.set(x, -0.3, 0); inner.add(b);
      }
      const eyeL = new T.Mesh(this.geo.low, this.mat.eye); eyeL.scale.set(0.07, 0.1, 0.05); eyeL.position.set(p.w / 2 - 0.2, -0.2, 0.98); inner.add(eyeL);
      const eyeR = eyeL.clone(); eyeR.position.x = p.w / 2 + 0.2; inner.add(eyeR);
    } else if (p.kind === 'crumble') {
      const cookie = toon(0xe3b06b), chip = toon(0x6b3b22);
      const body = new T.Mesh(new T.BoxGeometry(p.w, 0.5, 2.1), cookie); body.position.set(p.w / 2, -0.25, 0); inner.add(body);
      for (let x = 0.35; x < p.w; x += 0.7) { const c = new T.Mesh(this.geo.low, chip); c.scale.set(0.1, 0.08, 0.04); c.position.set(x, -0.25 + ((x * 5) % 1 - 0.5) * 0.25, 1.06); inner.add(c); }
    } else if (p.kind === 'bridge') {
      const star = toon(0xffd84a, { emissive: 0x805a00, emissiveIntensity: 0.3 });
      for (let x = 0; x < p.w - 0.1; x += 1) {
        const b = new T.Mesh(new T.BoxGeometry(0.96, 0.5, 2), star); b.position.set(x + 0.5, -0.25, 0); inner.add(b);
        const s = new T.Mesh(this.geo.star, this.mat.white); s.scale.setScalar(0.7); s.position.set(x + 0.5, -0.25, 1.05); inner.add(s);
      }
      // まだ出ていない橋の「予告」の点線
      const ghost = new T.Mesh(new T.BoxGeometry(p.w, 0.5, 2), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false }));
      ghost.position.set(p.w / 2, -0.25, 0); g.add(ghost);
      g.userData.ghost = ghost;
    } else {
      // 動く足場：ミントの天板と、左右／上下の矢印
      const body = new T.Mesh(new T.BoxGeometry(p.w, 0.42, 2.2), toon(th.plat[0])); body.position.set(p.w / 2, -0.26, 0); inner.add(body);
      const top = new T.Mesh(new T.BoxGeometry(p.w + 0.12, 0.16, 2.3), toon(0x7fe0c4)); top.position.set(p.w / 2, -0.04, 0); inner.add(top);
      const arrow = new T.Mesh(this.geo.cone, toon(0x2fa88a)); arrow.scale.set(0.16, 0.3, 0.05);
      const a2 = arrow.clone();
      if (p.dy) { arrow.position.set(p.w / 2, -0.26 + 0.05, 1.12); a2.position.set(p.w / 2, -0.26 - 0.1, 1.12); a2.rotation.z = Math.PI; arrow.position.y += 0.02; }
      else { arrow.rotation.z = -Math.PI / 2; arrow.position.set(p.w / 2 + 0.3, -0.26, 1.12); a2.rotation.z = Math.PI / 2; a2.position.set(p.w / 2 - 0.3, -0.26, 1.12); }
      inner.add(arrow, a2);
    }
    g.userData.inner = inner;
    return g;
  }

  makeMedal(had) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    const cols = ['#ff6f91', '#ffb84d', '#ffe45c', '#7ee081', '#5cc8ff', '#a98bff'];
    cols.forEach((col, i) => { x.fillStyle = col; x.beginPath(); x.arc(64, 64, 64 - i * 9, 0, Math.PI * 2); x.fill(); });
    x.fillStyle = '#fff'; x.font = 'bold 44px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('★', 64, 67);
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
    const face = toon(0xffffff, { map: tex, transparent: had, opacity: had ? 0.55 : 1 });
    const rim = toon(0xffd84a, { transparent: had, opacity: had ? 0.55 : 1 });
    const m = new T.Mesh(new T.CylinderGeometry(0.62, 0.62, 0.16, 32), [rim, face, face]);
    m.rotation.x = Math.PI / 2;
    const g = new T.Group(); g.add(m);
    return g;
  }

  makeSpring() {
    const g = new T.Group();
    const base = new T.Mesh(new T.CylinderGeometry(0.55, 0.6, 0.18, 20), toon(0x7a8cff)); base.position.y = 0.09; g.add(base);
    const coil = new T.Group();
    for (let i = 0; i < 3; i++) { const t = new T.Mesh(new T.TorusGeometry(0.34, 0.07, 8, 20), toon(0xdfe6ff)); t.rotation.x = Math.PI / 2; t.position.y = 0.25 + i * 0.16; coil.add(t); }
    g.add(coil);
    const top = new T.Mesh(new T.CylinderGeometry(0.58, 0.58, 0.16, 20), toon(0xff6f91)); top.position.y = 0.72; g.add(top);
    g.userData = { coil, top };
    return g;
  }

  // ダッシュパネル：地面の上の光る板と、奥に立つ大きな矢印。遠くからでも見えるように
  makeDash() {
    const g = new T.Group();
    const rim = new T.Mesh(new T.BoxGeometry(2.3, 0.1, 1.9), toon(0xff9a3d)); rim.position.y = 0.06; g.add(rim);
    const pad = new T.Mesh(new T.BoxGeometry(2.1, 0.12, 1.7), toon(0xfff2a8, { emissive: 0xffc94d, emissiveIntensity: 0.5 })); pad.position.y = 0.09; g.add(pad);
    const chevron = () => { const s = new T.Shape(); s.moveTo(0, 0.35); s.lineTo(0.3, 0); s.lineTo(0, -0.35); s.lineTo(-0.18, -0.35); s.lineTo(0.12, 0); s.lineTo(-0.18, 0.35); s.closePath(); return s; };
    const flatGeo = new T.ShapeGeometry(chevron());
    const standGeo = new T.ExtrudeGeometry(chevron(), { depth: 0.12, bevelEnabled: false });
    const arrows = [];
    for (let i = 0; i < 3; i++) {
      const m = new T.Mesh(flatGeo, new T.MeshBasicMaterial({ color: 0xff7a3d }));
      m.rotation.x = -Math.PI / 2; m.position.set(-0.55 + i * 0.5, 0.16, 0);
      g.add(m); arrows.push(m);
      const up = new T.Mesh(standGeo, new T.MeshBasicMaterial({ color: 0xff7a3d }));
      up.scale.setScalar(1.3); up.position.set(-0.7 + i * 0.6, 0.9, -1.1);
      g.add(up); arrows.push(up);
    }
    g.userData = { arrows };
    return g;
  }

  makeFlag() {
    const g = new T.Group();
    const pole = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 2.6, 8), toon(0xffffff)); pole.position.y = 1.3; g.add(pole);
    const knob = new T.Mesh(this.geo.ball, toon(0xffd84a)); knob.scale.setScalar(0.14); knob.position.y = 2.65; g.add(knob);
    const s = new T.Shape(); s.moveTo(0, 0); s.lineTo(1.1, -0.35); s.lineTo(0, -0.7); s.closePath();
    const flag = new T.Mesh(new T.ShapeGeometry(s), toon(0xb7c4d6, { side: T.DoubleSide }));
    flag.position.set(0.05, 2.5, 0); g.add(flag);
    g.userData = { flag };
    return g;
  }

  makeSign(icon) {
    const g = new T.Group();
    const post = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 1.1, 6), toon(0xc98f5e)); post.position.y = 0.55; g.add(post);
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#e7a86f'; x.fillRect(0, 0, 128, 128);
    x.fillStyle = '#fffaf0'; x.beginPath(); x.roundRect(4, 4, 120, 120, 26); x.fill();
    x.strokeStyle = '#e7a86f'; x.lineWidth = 8; x.stroke();
    x.fillStyle = '#ff6f91'; x.font = 'bold 84px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(icon === 'right' ? '➜' : icon === 'up' ? '⬆' : '⤴', 64, 70);
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
    const board = new T.Mesh(new T.BoxGeometry(1, 1, 0.1), [toon(0xe7a86f), toon(0xe7a86f), toon(0xe7a86f), toon(0xe7a86f), toon(0xffffff, { map: tex }), toon(0xe7a86f)]);
    board.position.y = 1.35; g.add(board);
    return g;
  }

  makeGoal() {
    const g = new T.Group();
    const star = new T.Mesh(this.geo.bigStar, toon(0xffe066, { emissive: 0xffb300, emissiveIntensity: 0.4 }));
    g.add(star);
    const ring = new T.Mesh(new T.TorusGeometry(1.9, 0.08, 8, 48), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
    g.add(ring);
    g.userData = { star, ring };
    return g;
  }

  // きせかえ：あたま・かお・いろ
  setOutfit(outfit) {
    this.outfit = { ...outfit };
    if (this.player) this.applyOutfit(this.player);
  }

  burstPlayer() {
    if (!this.player) return;
    const p = this.player.position;
    // アップで見ているので、小さな粒だけ
    this.burst(p.x, p.y + 0.3, 0xffe066, 10, 2.2);
    this.burst(p.x, p.y + 0.3, 0xff8fb5, 8, 2.2);
  }

  applyOutfit(root) {
    const u = root.userData, o = this.outfit || {};
    const item = ITEMS.find(i => i.id === o.color);
    u.rainbow = o.color === 'rainbow';
    u.skin.color.setHex(item && item.color ? item.color : COLORS.punyu);
    if (u.acc) { u.body.remove(u.acc); this.dispose(u.acc); }
    const acc = new T.Group();
    u.acc = acc; u.body.add(acc);
    const r = TUNE.radius;
    const M = c => toon(c);
    const put = (geo, mat, [x, y, z], [sx, sy, sz], rot) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); if (rot) m.rotation.set(...rot); acc.add(m); return m; };
    switch (o.head) {
      case 'ribbon': {
        const red = M(0xff5d86);
        put(this.geo.low, red, [0.2, r * 0.95, 0.05], [0.14, 0.09, 0.07], [0, 0, 0.5]);
        put(this.geo.low, red, [0.36, r * 0.82, 0.05], [0.14, 0.09, 0.07], [0, 0, -0.4]);
        put(this.geo.low, M(0xff3d6e), [0.28, r * 0.9, 0.08], [0.06, 0.06, 0.06]);
        break;
      }
      case 'flower': {
        const cols = [0xff8fb5, 0xffe066, 0xffffff, 0xb79cff, 0x7fd4ff];
        for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; put(this.geo.low, M(cols[i % 5]), [Math.cos(a) * 0.3, r * 0.78, Math.sin(a) * 0.3], [0.08, 0.08, 0.08]); }
        break;
      }
      case 'strawberry': {
        put(this.geo.cone, M(0xff3d6e), [0, r + 0.2, 0], [0.3, 0.42, 0.3]);
        for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; put(this.geo.low, M(0x5bb34a), [Math.cos(a) * 0.18, r + 0.02, Math.sin(a) * 0.18], [0.12, 0.04, 0.06], [0, -a, 0]); }
        for (let i = 0; i < 4; i++) put(this.geo.low, M(0xfff3a8), [(i - 1.5) * 0.08, r + 0.12 + (i % 2) * 0.1, 0.22 - (i % 2) * 0.04], [0.02, 0.03, 0.02]);
        break;
      }
      case 'cloud': {
        const w = M(0xffffff);
        for (const [x, y, sc] of [[0, 0.2, 0.2], [-0.18, 0.12, 0.15], [0.18, 0.12, 0.15], [0.08, 0.3, 0.13]]) put(this.geo.low, w, [x, r + y, 0], [sc, sc * 0.8, sc]);
        break;
      }
      case 'straw': {
        const straw = M(0xf2d38a);
        put(this.geo.cyl, straw, [0, r * 0.88, 0], [0.5, 0.03, 0.5]);
        put(this.geo.low, straw, [0, r * 0.95, 0], [0.26, 0.2, 0.26]);
        put(this.geo.cyl, M(0xff6f91), [0, r * 0.95, 0], [0.265, 0.05, 0.265]);
        break;
      }
      case 'crown': {
        const gold = toon(0xffd84a, { emissive: 0x6b4a00, emissiveIntensity: 0.3 });
        put(this.geo.cyl, gold, [0, r * 0.95, 0], [0.22, 0.08, 0.22]);
        for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; put(this.geo.cone, gold, [Math.cos(a) * 0.18, r * 0.95 + 0.12, Math.sin(a) * 0.18], [0.06, 0.16, 0.06]); }
        put(this.geo.low, M(0xff5d86), [0, r * 0.95, 0.22], [0.05, 0.05, 0.03]);
        break;
      }
      case 'starpin': put(this.geo.star, this.mat.star, [0.26, r * 0.72, 0.18], [0.45, 0.45, 0.45], [0, 0, 0.3]); break;
      case 'tiara': {
        const gold = toon(0xffe08a, { emissive: 0x6b4a00, emissiveIntensity: 0.25 });
        put(new T.TorusGeometry(0.2, 0.025, 6, 20, Math.PI), gold, [0, r * 0.9, 0.08], [1, 0.6, 1], [-0.5, 0, 0]);
        for (let i = -2; i <= 2; i++) put(this.geo.cone, gold, [i * 0.08, r * 0.9 + 0.1 - Math.abs(i) * 0.03, 0.12], [0.03, 0.1 - Math.abs(i) * 0.02, 0.03]);
        put(this.geo.low, toon(0x7fd4ff, { emissive: 0x2f6fbf, emissiveIntensity: 0.4 }), [0, r * 0.9 + 0.05, 0.16], [0.045, 0.055, 0.03]);
        break;
      }
      case 'princess': {
        const pink = toon(0xffa8d0);
        put(this.geo.cone, pink, [0.05, r + 0.33, -0.02], [0.2, 0.62, 0.2], [0, 0, -0.12]);
        put(this.geo.low, this.mat.star, [0.12, r + 0.66, -0.02], [0.06, 0.06, 0.06]);
        put(this.geo.low, toon(0xffffff, { transparent: true, opacity: 0.7 }), [0.2, r + 0.35, -0.12], [0.08, 0.35, 0.05], [0, 0, -0.5]);
        break;
      }
      case 'bunny': {
        const w = toon(0xffffff), pink = this.mat.cheek;
        for (const sx of [-1, 1]) {
          put(this.geo.low, w, [sx * 0.14, r + 0.3, -0.02], [0.08, 0.28, 0.06], [0, 0, -sx * 0.15]);
          put(this.geo.low, pink, [sx * 0.14, r + 0.3, 0.03], [0.04, 0.2, 0.03], [0, 0, -sx * 0.15]);
        }
        break;
      }
    }
    // 耳はぼうし系のときは隠す
    u.ears.forEach(e => (e.visible = !['strawberry', 'straw', 'cloud', 'bunny'].includes(o.head)));
    switch (o.face) {
      case 'glasses': {
        const frame = toon(0xff6f91), lens = toon(0xffffff, { transparent: true, opacity: 0.35 });
        for (const sx of [-1, 1]) {
          put(new T.TorusGeometry(0.09, 0.018, 6, 20), frame, [sx * 0.15, 0.07, r * 1.0], [1, 1, 1]);
          put(new T.CircleGeometry(0.085, 16), lens, [sx * 0.15, 0.07, r * 1.0], [1, 1, 1]);
        }
        put(this.geo.cyl, frame, [0, 0.09, r * 1.01], [0.014, 0.06, 0.014], [0, 0, Math.PI / 2]);
        break;
      }
      case 'hearts': {
        const pink = toon(0xff5d86, { transparent: true, opacity: 0.85 });
        for (const sx of [-1, 1]) put(this.geo.heart, pink, [sx * 0.15, 0.07, r * 1.0], [0.28, 0.28, 0.2]);
        break;
      }
      case 'starcheek': for (const sx of [-1, 1]) put(this.geo.star, this.mat.star, [sx * 0.27, -0.07, r * 0.9], [0.22, 0.22, 0.15]); break;
      case 'starglasses': {
        const y = toon(0xffd84a, { transparent: true, opacity: 0.8 });
        for (const sx of [-1, 1]) put(this.geo.star, y, [sx * 0.15, 0.07, r * 1.0], [0.5, 0.5, 0.2]);
        put(this.geo.cyl, toon(0xff6f91), [0, 0.09, r * 1.01], [0.014, 0.05, 0.014], [0, 0, Math.PI / 2]);
        break;
      }
    }
    // せなか
    u.flaps = [];
    switch (o.back) {
      case 'cape': {
        const cape = new T.Mesh(new T.PlaneGeometry(1.0, 0.78, 1, 4), toon(0xff4f7b, { side: T.DoubleSide }));
        cape.position.set(0, -0.12, -r * 0.95); cape.rotation.x = 0.15; acc.add(cape);
        put(this.geo.cyl, toon(0xffd84a), [0, 0.22, -r * 0.55], [0.3, 0.03, 0.2]);
        u.flaps.push({ m: cape, kind: 'cape' });
        break;
      }
      case 'balloon': {
        put(this.geo.cyl, toon(0xffffff), [0.2, r + 0.35, -0.25], [0.006, 0.7, 0.006], [0, 0, -0.25]);
        const b = put(this.geo.mid, toon(0xff5d86), [0.36, r + 0.85, -0.3], [0.22, 0.26, 0.22]);
        put(this.geo.low, this.mat.shine, [0.3, r + 0.93, -0.12], [0.04, 0.06, 0.02]);
        u.flaps.push({ m: b, kind: 'balloon' });
        break;
      }
      case 'angel':
      case 'butterfly': {
        const cols = o.back === 'angel' ? [0xffffff, 0xffffff] : [0xff9ad5, 0xb79cff];
        for (const sx of [-1, 1]) {
          const pivot = new T.Group(); pivot.position.set(sx * 0.12, 0.08, -r * 0.8); acc.add(pivot);
          const w = new T.Mesh(this.geo.low, toon(cols[0], o.back === 'butterfly' ? { transparent: true, opacity: 0.9 } : {}));
          w.scale.set(0.32, o.back === 'angel' ? 0.2 : 0.26, 0.05); w.position.set(sx * 0.28, 0.08, 0); pivot.add(w);
          const w2 = new T.Mesh(this.geo.low, toon(cols[1])); w2.scale.set(0.2, 0.14, 0.05); w2.position.set(sx * 0.22, -0.15, 0); pivot.add(w2);
          u.flaps.push({ m: pivot, kind: 'wing', sx });
        }
        break;
      }
    }
    u.cheeks.forEach(ch => (ch.visible = o.face !== 'starcheek'));
  }

  makePunyu() {
    const root = new T.Group();
    const body = new T.Group();
    root.add(body);
    const r = TUNE.radius;
    const skin = toon(COLORS.punyu);
    const ears = [], cheeks = [];
    const ball = new T.Mesh(this.geo.ball, skin); ball.scale.set(r * 1.05, r, r); body.add(ball);
    for (const s of [-1, 1]) {
      const ear = new T.Mesh(this.geo.ball, skin); ear.scale.set(0.14, 0.2, 0.12); ear.position.set(s * 0.25, r * 0.85, -0.05); ear.rotation.z = -s * 0.4; body.add(ear);
      const inner = new T.Mesh(this.geo.ball, this.mat.cheek); inner.scale.set(0.07, 0.11, 0.05); inner.position.set(s * 0.25, r * 0.86, 0.06); inner.rotation.z = -s * 0.4; body.add(inner);
      ears.push(ear, inner);
      const eye = new T.Mesh(this.geo.ball, this.mat.eye); eye.scale.set(0.065, 0.09, 0.05); eye.position.set(s * 0.15, 0.06, r * 0.93); body.add(eye);
      const hl = new T.Mesh(this.geo.ball, new T.MeshBasicMaterial({ color: 0xffffff })); hl.scale.setScalar(0.025); hl.position.set(s * 0.15 + 0.02, 0.1, r * 0.99); body.add(hl);
      const ch = new T.Mesh(this.geo.ball, this.mat.cheek); ch.scale.set(0.09, 0.055, 0.04); ch.position.set(s * 0.27, -0.07, r * 0.84); body.add(ch);
      cheeks.push(ch);
      const foot = new T.Mesh(this.geo.ball, toon(0xffd6e2)); foot.scale.set(0.13, 0.08, 0.14); foot.position.set(s * 0.18, -r * 0.92, 0.05); body.add(foot);
      body.userData['foot' + s] = foot;
    }
    const mouth = new T.Mesh(new T.TorusGeometry(0.05, 0.015, 6, 12, Math.PI), this.mat.eye); mouth.position.set(0, -0.06, r * 0.97); mouth.rotation.z = Math.PI; body.add(mouth);
    const tail = new T.Mesh(this.geo.ball, skin); tail.scale.setScalar(0.1); tail.position.set(0, -0.1, -r * 0.95); body.add(tail);
    root.userData = { body, skin, ears, cheeks };
    this.applyOutfit(root);
    return root;
  }

  // いたずらっ子たち。kind: walk（もやもや）/ hop（ゼリー）/ fly（ハチ）/ crab（カニ）
  face(body, z, { eyeX = 0.14, eyeY = 0.05, size = 1, brows = true, grin = true } = {}) {
    for (const s of [-1, 1]) {
      const w = new T.Mesh(this.geo.low, this.mat.white); w.scale.set(0.11 * size, 0.12 * size, 0.05); w.position.set(s * eyeX, eyeY, z); body.add(w);
      const p = new T.Mesh(this.geo.low, this.mat.eye); p.scale.set(0.05 * size, 0.07 * size, 0.03); p.position.set(s * eyeX * 0.93 - 0.03 * size, eyeY - 0.01, z + 0.04); body.add(p);
      if (brows) { const brow = new T.Mesh(new T.BoxGeometry(0.14 * size, 0.03 * size, 0.02), this.mat.eye); brow.position.set(s * eyeX, eyeY + 0.15 * size, z + 0.02); brow.rotation.z = s * 0.35; body.add(brow); }
    }
    if (grin) { const g = new T.Mesh(new T.TorusGeometry(0.07 * size, 0.018 * size, 6, 12, Math.PI), this.mat.eye); g.position.set(0, eyeY - 0.15 * size, z + 0.02); g.rotation.z = Math.PI; body.add(g); }
  }

  makeEnemy(kind = 'walk') {
    const root = new T.Group();
    const body = new T.Group(); root.add(body);
    const u = { body };
    if (kind === 'hop') {
      const m = new T.Mesh(this.geo.mid, toon(0xff8fc8, { transparent: true, opacity: 0.88 })); m.scale.set(0.44, 0.4, 0.4); body.add(m);
      const cherry = new T.Mesh(this.geo.low, toon(0xff3d6e)); cherry.scale.setScalar(0.1); cherry.position.set(0, 0.45, 0); body.add(cherry);
      this.face(body, 0.38, { brows: false });
    } else if (kind === 'fly') {
      const m = new T.Mesh(this.geo.mid, toon(0xffd84a)); m.scale.set(0.42, 0.36, 0.36); body.add(m);
      const stripe = new T.Mesh(this.geo.mid, toon(0x4a3a5a)); stripe.scale.set(0.12, 0.37, 0.37); stripe.position.x = -0.12; body.add(stripe);
      const wings = [];
      for (const s of [-1, 1]) { const w = new T.Mesh(this.geo.low, toon(0xe8f7ff, { transparent: true, opacity: 0.8 })); w.scale.set(0.28, 0.14, 0.05); w.position.set(s * 0.1, 0.36, -0.1); body.add(w); wings.push(w); }
      u.wings = wings;
      this.face(body, 0.34, { eyeX: 0.13 });
    } else if (kind === 'crab') {
      const m = new T.Mesh(this.geo.mid, toon(0xff7a5c)); m.scale.set(0.5, 0.32, 0.36); body.add(m);
      const claws = [];
      for (const s of [-1, 1]) {
        const c = new T.Mesh(this.geo.low, toon(0xff5c45)); c.scale.set(0.16, 0.18, 0.12); c.position.set(s * 0.55, 0.15, 0.1); body.add(c); claws.push(c);
        const stalk = new T.Mesh(this.geo.cyl, toon(0xff7a5c)); stalk.scale.set(0.03, 0.18, 0.03); stalk.position.set(s * 0.12, 0.35, 0.15); body.add(stalk);
        const e = new T.Mesh(this.geo.low, this.mat.white); e.scale.setScalar(0.08); e.position.set(s * 0.12, 0.46, 0.18); body.add(e);
        const pp = new T.Mesh(this.geo.low, this.mat.eye); pp.scale.setScalar(0.04); pp.position.set(s * 0.12, 0.46, 0.25); body.add(pp);
      }
      u.claws = claws;
      const g = new T.Mesh(new T.TorusGeometry(0.07, 0.018, 6, 12, Math.PI), this.mat.eye); g.position.set(0, -0.02, 0.35); g.rotation.z = Math.PI; body.add(g);
    } else {
      const m = new T.Mesh(this.geo.mid, toon(COLORS.enemy)); m.scale.set(0.42, 0.38, 0.4); body.add(m);
      const tuft = new T.Mesh(new T.ConeGeometry(0.1, 0.25, 8), toon(COLORS.enemyDark)); tuft.position.set(0.04, 0.42, 0); tuft.rotation.z = -0.4; body.add(tuft);
      this.face(body, 0.37);
    }
    if (kind !== 'fly') for (const s of [-1, 1]) { const foot = new T.Mesh(this.geo.low, toon(kind === 'crab' ? 0xff5c45 : kind === 'hop' ? 0xff6fae : COLORS.enemyDark)); foot.scale.set(0.12, 0.07, 0.12); foot.position.set(s * 0.18, -0.36, 0.04); body.add(foot); }
    const dizzy = new T.Group();
    for (let i = 0; i < 3; i++) { const s = new T.Mesh(this.geo.star, this.mat.star); s.scale.setScalar(0.35); dizzy.add(s); }
    dizzy.visible = false; dizzy.position.y = 0.55; root.add(dizzy);
    u.dizzy = dizzy;
    root.userData = u;
    return root;
  }

  // うに（トゲ）：さわると痛い
  makeSpike() {
    const g = new T.Group();
    const core = new T.Mesh(this.geo.mid, toon(0x4b3f8f)); core.scale.setScalar(0.3); core.position.y = 0.35; g.add(core);
    const tip = toon(0xb9a8ff);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const c = new T.Mesh(this.geo.cone, tip); c.scale.set(0.08, 0.3, 0.08);
      c.position.set(Math.cos(a) * 0.38, 0.35 + Math.sin(a) * 0.38, 0); c.rotation.z = a - Math.PI / 2; g.add(c);
    }
    for (const s of [-1, 1]) { const e = new T.Mesh(this.geo.low, this.mat.white); e.scale.set(0.06, 0.08, 0.03); e.position.set(s * 0.1, 0.4, 0.28); g.add(e); const pp = new T.Mesh(this.geo.low, this.mat.eye); pp.scale.set(0.03, 0.045, 0.02); pp.position.set(s * 0.1, 0.39, 0.31); g.add(pp); }
    return g;
  }

  // 上昇気流：うすい光の柱と、のぼっていく葉っぱ
  makeUpdraft(u, th) {
    const g = new T.Group();
    const h = u.top - u.y;
    const col = new T.Mesh(new T.CylinderGeometry(u.w / 2, u.w / 2, h, 16, 1, true), new T.MeshBasicMaterial({ color: th.night ? 0xc9b8ff : 0xffffff, transparent: true, opacity: 0.16, depthWrite: false, side: T.DoubleSide }));
    col.position.y = h / 2; g.add(col);
    const leaves = [];
    const mat = toon(th.night ? 0xffe38a : th.decor === 'sky' ? 0xa8e0ff : 0x9be07f);
    for (let i = 0; i < 7; i++) { const l = new T.Mesh(this.geo.low, mat); l.scale.set(0.12, 0.05, 0.08); l.userData.k = i / 7; g.add(l); leaves.push(l); }
    g.userData = { leaves, h, w: u.w };
    return g;
  }

  // ループ：虹色の輪
  makeLoop(l) {
    const g = new T.Group();
    const cols = [0xff6f91, 0xffe45c, 0x5cc8ff];
    cols.forEach((c, i) => {
      const m = new T.Mesh(new T.TorusGeometry(l.R + 0.15 + i * 0.22, 0.1, 6, 48), toon(c));
      g.add(m);
    });
    return g;
  }

  makeVent() {
    const g = new T.Group();
    const shell = new T.Mesh(new T.CylinderGeometry(0.5, 0.7, 0.35, 14), toon(0xffc2d6)); shell.position.y = 0.17; g.add(shell);
    const hole = new T.Mesh(new T.CylinderGeometry(0.34, 0.34, 0.05, 14), toon(0x6fb8ff)); hole.position.y = 0.36; g.add(hole);
    return g;
  }

  makeSwitch() {
    const g = new T.Group();
    const base = new T.Mesh(new T.CylinderGeometry(0.55, 0.65, 0.25, 16), toon(0x6b5fb5)); base.position.y = 0.12; g.add(base);
    const btn = new T.Mesh(this.geo.star, toon(0xffd84a, { emissive: 0xffb300, emissiveIntensity: 0.5 })); btn.scale.setScalar(1.3); btn.position.y = 0.75; g.add(btn);
    g.userData = { btn };
    return g;
  }

  // ボスのひろばの門（ボス戦のあいだだけ出る）
  makeGate(th) {
    const g = new T.Group();
    const mat = toon(th.plat[1]);
    const post = new T.Mesh(this.geo.cyl, mat); post.scale.set(0.25, 5, 0.25); post.position.y = 2.5; g.add(post);
    for (let i = 0; i < 5; i++) { const b = new T.Mesh(this.geo.low, toon([0xff8fb5, 0xffe066, 0x7fd4ff, 0x9be07f, 0xc49bff][i])); b.scale.setScalar(0.3); b.position.set(0, 0.8 + i * 1, 0.3); g.add(b); }
    return g;
  }

  makeBoss(type) {
    const root = new T.Group();
    const body = new T.Group(); root.add(body);
    const u = { body, type };
    const faceZ = 1.02;
    if (type === 'jelly') {
      const m = new T.Mesh(this.geo.ball, toon(0xff7fbf, { transparent: true, opacity: 0.9 })); m.scale.set(1.2, 1.05, 1.05); body.add(m);
      const cream = new T.Mesh(this.geo.mid, toon(0xffffff)); cream.scale.set(0.6, 0.3, 0.6); cream.position.y = 1; body.add(cream);
      const cherry = new T.Mesh(this.geo.mid, toon(0xff2d5e)); cherry.scale.setScalar(0.25); cherry.position.y = 1.35; body.add(cherry);
    } else if (type === 'cloud') {
      const mat = toon(0xf4f1ff);
      for (const [x, y, s] of [[0, 0, 1.1], [-0.9, -0.2, 0.8], [0.9, -0.2, 0.8], [-0.4, 0.55, 0.7], [0.45, 0.5, 0.75]]) { const m = new T.Mesh(this.geo.mid, mat); m.scale.set(s, s * 0.85, s * 0.8); m.position.set(x, y, 0); body.add(m); }
      const zz = new T.Group();
      for (let i = 0; i < 3; i++) { const z = new T.Mesh(new T.TorusGeometry(0.12 + i * 0.04, 0.03, 4, 4), toon(0x8fb8ff)); z.position.set(0.9 + i * 0.35, 1 + i * 0.4, 0); z.rotation.z = Math.PI / 4; zz.add(z); }
      zz.visible = false; root.add(zz); u.zz = zz;
    } else if (type === 'crab') {
      const m = new T.Mesh(this.geo.ball, toon(0xff7a5c)); m.scale.set(1.3, 0.85, 0.95); body.add(m);
      const claws = [];
      for (const s of [-1, 1]) {
        const c = new T.Group();
        const arm = new T.Mesh(this.geo.cyl, toon(0xff5c45)); arm.scale.set(0.12, 0.6, 0.12); arm.position.y = 0.3; c.add(arm);
        const pinch = new T.Mesh(this.geo.mid, toon(0xff5c45)); pinch.scale.set(0.38, 0.45, 0.3); pinch.position.y = 0.8; c.add(pinch);
        c.position.set(s * 1.25, 0.2, 0.3); c.rotation.z = -s * 0.5; body.add(c); claws.push(c);
      }
      u.claws = claws;
    } else if (type === 'wind') {
      const m = new T.Mesh(this.geo.ball, toon(0xb9a8ff)); m.scale.set(1.05, 1, 1); body.add(m);
      const swirl = new T.Mesh(new T.TorusGeometry(0.35, 0.08, 6, 20, Math.PI * 1.5), toon(0xe6dcff)); swirl.position.set(0.2, 1.05, 0); body.add(swirl);
      const cheeks = [];
      for (const s of [-1, 1]) { const ch = new T.Mesh(this.geo.mid, toon(0xffb3d9)); ch.scale.set(0.3, 0.24, 0.2); ch.position.set(s * 0.62, -0.2, 0.8); body.add(ch); cheeks.push(ch); }
      u.cheeks = cheeks;
    } else {
      const m = new T.Mesh(this.geo.ball, toon(COLORS.enemy)); m.scale.set(1.15, 1.05, 1.05); body.add(m);
      const crown = new T.Group();
      for (let i = -1; i <= 1; i++) { const c = new T.Mesh(this.geo.cone, toon(0xffd84a, { emissive: 0x6b4a00, emissiveIntensity: 0.3 })); c.scale.set(0.16, 0.35, 0.16); c.position.set(i * 0.22, 1.15 + (i === 0 ? 0.08 : 0), 0); crown.add(c); }
      body.add(crown);
      for (const s of [-1, 1]) { const f = new T.Mesh(this.geo.mid, toon(COLORS.enemyDark)); f.scale.set(0.35, 0.18, 0.35); f.position.set(s * 0.5, -0.98, 0.1); body.add(f); }
    }
    // 顔（大きめ・こわくない）
    const eyes = new T.Group(); body.add(eyes);
    for (const s of [-1, 1]) {
      const w = new T.Mesh(this.geo.low, this.mat.white); w.scale.set(0.24, 0.28, 0.08); w.position.set(s * 0.32, 0.15, faceZ * 0.95); eyes.add(w);
      const p = new T.Mesh(this.geo.low, this.mat.eye); p.scale.set(0.12, 0.16, 0.05); p.position.set(s * 0.3, 0.12, faceZ * 1.02); eyes.add(p);
      const hl = new T.Mesh(this.geo.low, this.mat.shine); hl.scale.setScalar(0.04); hl.position.set(s * 0.3 + 0.04, 0.2, faceZ * 1.05); eyes.add(hl);
    }
    // 目を回したとき・なかよしになったときの目（にっこり）
    const happy = new T.Group(); body.add(happy); happy.visible = false;
    for (const s of [-1, 1]) { const h = new T.Mesh(new T.TorusGeometry(0.15, 0.04, 6, 12, Math.PI), this.mat.eye); h.position.set(s * 0.32, 0.12, faceZ); happy.add(h); }
    const mouth = new T.Mesh(new T.TorusGeometry(0.2, 0.05, 6, 14, Math.PI), this.mat.eye); mouth.position.set(0, -0.28, faceZ * 0.97); mouth.rotation.z = Math.PI; body.add(mouth);
    for (const s of [-1, 1]) { const ch = new T.Mesh(this.geo.low, this.mat.cheek); ch.scale.set(0.16, 0.1, 0.05); ch.position.set(s * 0.62, -0.12, faceZ * 0.85); body.add(ch); }
    const dizzy = new T.Group();
    for (let i = 0; i < 4; i++) { const s = new T.Mesh(this.geo.star, this.mat.star); s.scale.setScalar(0.6); dizzy.add(s); }
    dizzy.visible = false; dizzy.position.y = 1.5; root.add(dizzy);
    Object.assign(u, { eyes, happy, dizzy, mats: [] });
    body.traverse(o => { if (o.material && o.material.isMeshToonMaterial) u.mats.push(o.material); });
    root.userData = u;
    return root;
  }

  // おいかけっこの大玉：ワールドの色のしましま玉に、がんばる顔
  makeChaseBall(th) {
    const root = new T.Group();
    const g = new T.Group(); root.add(g);
    const ball = new T.Group(); g.add(ball);
    const cols = th.decor === 'candy' ? [0xff8fb5, 0xffffff] : th.decor === 'beach' ? [0xff6f61, 0xffffff, 0x4fc3f7, 0xffe066] : th.night ? [0x9f92e6, 0xffe38a] : [0x8fdc6e, 0xfff4d6];
    const n = 8;
    for (let i = 0; i < n; i++) {
      const seg = new T.Mesh(new T.SphereGeometry(1.5, 16, 12, (i / n) * Math.PI * 2, (Math.PI * 2) / n), toon(cols[i % cols.length]));
      ball.add(seg);
    }
    const face = new T.Group(); g.add(face);
    for (const sx of [-1, 1]) {
      const w = new T.Mesh(this.geo.low, this.mat.white); w.scale.set(0.3, 0.34, 0.1); w.position.set(sx * 0.45, 0.3, 1.42); face.add(w);
      const pp = new T.Mesh(this.geo.low, this.mat.eye); pp.scale.set(0.15, 0.18, 0.06); pp.position.set(sx * 0.42 + 0.08, 0.28, 1.5); face.add(pp);
      const br = new T.Mesh(new T.BoxGeometry(0.34, 0.07, 0.05), this.mat.eye); br.position.set(sx * 0.45, 0.72, 1.4); br.rotation.z = -sx * 0.3; face.add(br);
    }
    const mouth = new T.Mesh(new T.TorusGeometry(0.22, 0.06, 6, 14, Math.PI), this.mat.eye); mouth.position.set(0.05, -0.35, 1.42); mouth.rotation.z = Math.PI; face.add(mouth);
    const shadow = new T.Mesh(new T.CircleGeometry(1.5, 24), new T.MeshBasicMaterial({ color: 0x3a2050, transparent: true, opacity: 0.4, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.visible = false; this.world.add(shadow);
    root.userData = { body: g, ball, face, shadow };
    return root;
  }

  makeDrop(kind) {
    if (kind === 'hail') { const m = new T.Mesh(new T.IcosahedronGeometry(0.35, 0), toon(0xd6f0ff, { emissive: 0x6fb8ff, emissiveIntensity: 0.3 })); return m; }
    if (kind === 'coconut') {
      const g = new T.Group();
      const m = new T.Mesh(this.geo.mid, toon(0x8a5a33)); m.scale.setScalar(0.38); g.add(m);
      for (let i = 0; i < 3; i++) { const d = new T.Mesh(this.geo.low, this.mat.eye); d.scale.setScalar(0.06); d.position.set((i - 1) * 0.12, 0.1 - Math.abs(i - 1) * 0.05, 0.34); g.add(d); }
      return g;
    }
    if (kind === 'candy') {
      const g = new T.Group(), pink = toon(0xff8fb5);
      const m = new T.Mesh(this.geo.mid, pink); m.scale.set(0.3, 0.3, 0.3); g.add(m);
      for (const sx of [-1, 1]) { const w = new T.Mesh(this.geo.cone, toon(0xffffff)); w.scale.set(0.2, 0.25, 0.2); w.rotation.z = sx * Math.PI / 2; w.position.x = sx * 0.4; g.add(w); }
      return g;
    }
    if (kind === 'meteor') { const m = new T.Mesh(this.geo.star, toon(0xffe38a, { emissive: 0xffb300, emissiveIntensity: 0.7 })); m.scale.setScalar(1.4); return m; }
    const g = new T.Group();
    const core = new T.Mesh(this.geo.mid, toon(0x8a5a33)); core.scale.setScalar(0.3); g.add(core);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; const c2 = new T.Mesh(this.geo.cone, toon(0xc9a36b)); c2.scale.set(0.05, 0.2, 0.05); c2.position.set(Math.cos(a) * 0.35, Math.sin(a) * 0.35, 0); c2.rotation.z = a - Math.PI / 2; g.add(c2); }
    return g;
  }

  makeShot(kind) {
    if (kind === 'rain') { const m = new T.Mesh(this.geo.low, toon(0x6fb8ff, { emissive: 0x2f6fbf, emissiveIntensity: 0.3 })); m.scale.set(0.2, 0.28, 0.2); return m; }
    if (kind === 'shell') {
      const g = new T.Group();
      const s = new T.Mesh(this.geo.cone, toon(0xffd6ea)); s.scale.set(0.3, 0.45, 0.3); s.position.y = 0.3; g.add(s);
      const b = new T.Mesh(this.geo.low, toon(0xffb3cf)); b.scale.set(0.3, 0.15, 0.3); b.position.y = 0.1; g.add(b);
      return g;
    }
    const m = new T.Mesh(this.geo.star, toon(0xffe38a, { emissive: 0xffb300, emissiveIntensity: 0.6 })); m.scale.setScalar(0.9); return m;
  }

  makeWindLines() {
    const g = new T.Group();
    const mat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false });
    for (let i = 0; i < 10; i++) { const l = new T.Mesh(new T.BoxGeometry(1.4, 0.05, 0.05), mat); l.userData.k = i / 10; g.add(l); }
    g.visible = false;
    this.world.add(g);
    return g;
  }

  // ---------- 演出 ----------
  // 粒は作り直さずに使い回す（途中で材質や形を作るとカクつくため）
  burst(x, y, color, n = 8, speed = 3.5, geo = this.geo.spark) {
    let mat = this.sparkMats.get(color);
    if (!mat) { mat = new T.MeshBasicMaterial({ color }); this.sparkMats.set(color, mat); }
    for (let i = 0; i < n && this.particles.length < 140; i++) {
      const m = this.sparkPool.pop() || new T.Mesh(geo, mat);
      m.geometry = geo; m.material = mat; m.visible = true;
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      m.position.set(x, y, 0.3); m.scale.setScalar(1);
      this.pGroup.add(m);
      this.particles.push({ m, vx: Math.cos(a) * speed * (0.6 + Math.random() * 0.5), vy: Math.sin(a) * speed * (0.6 + Math.random() * 0.5) + 1, life: 0.6 + Math.random() * 0.3 });
    }
  }

  onEvent(e) {
    switch (e.type) {
      case 'star': this.burst(e.x, e.y, 0xffe066, 6, 3); break;
      case 'medal': this.burst(e.x, e.y, 0xff8fb5, 14, 5); this.burst(e.x, e.y, 0x7fd4ff, 10, 4); break;
      case 'spring': this.burst(e.x, e.y + 0.7, 0xffffff, 8, 3); break;
      case 'boing': this.burst(e.x, e.y, 0xffffff, 8, 3); break;
      case 'dash': this.burst(e.x, e.y + 0.3, 0xffa94d, 10, 4); break;
      case 'loop': this.burst(e.x, e.y + 0.5, 0xffe066, 10, 4, this.geo.star); break;
      case 'stomp': this.burst(e.x, e.y + 0.3, 0xffffff, 10, 4); this.burst(e.x, e.y + 0.3, 0xffe066, 5, 3, this.geo.star); break;
      case 'land': if (e.impact > 0.4) this.burst(e.x, e.y + 0.05, 0xffffff, 6, 2); break;
      case 'hurt': this.shake = 0.25; this.burst(e.x, e.y, 0xff7a9c, 8, 3); break;
      case 'checkpoint': this.burst(e.x + 0.5, e.y + 2.5, 0xffe066, 16, 5, this.geo.star); break;
      case 'goal': this.burst(e.x, e.y, 0xffe066, 24, 7, this.geo.star); this.burst(e.x, e.y, 0xff8fb5, 20, 5); break;
      case 'goalAppear':
        if (!this.goalMesh) { this.goalMesh = this.makeGoal(); this.world.add(this.goalMesh); }
        this.goalMesh.position.set(e.x, e.y, 0); this.goalAppear = 0;
        this.burst(e.x, e.y, 0xffe066, 24, 6, this.geo.star);
        break;
      case 'pop': this.burst(e.x, e.y, 0xbfe9ff, 12, 4); break;
      case 'ride': this.burst(e.x, e.y + 0.8, 0xbfe9ff, 8, 3); break;
      case 'heart': this.burst(e.x, e.y + 0.6, 0xff6f91, 12, 4); break;
      case 'crumble': this.burst(e.x, e.y - 0.2, 0xe3b06b, 12, 3); break;
      case 'switch': this.burst(e.x, e.y + 0.8, 0xffe066, 16, 5, this.geo.star); break;
      case 'splash': this.burst(e.x, e.y + 0.1, e.kind === 'rain' ? 0x8fcfff : 0xffe38a, 6, 2.5); break;
      case 'thud': this.shake = 0.2; this.burst(e.x, e.y + 0.1, 0xffffff, 10, 3); break;
      case 'bossStart': this.bossIntro = 1.2; break;
      case 'bossHit': this.shake = 0.3; this.burst(e.x, e.y + 1, 0xffffff, 14, 5); this.burst(e.x, e.y + 1, 0xffe066, 8, 4, this.geo.star); break;
      case 'bossDown': this.shake = 0.4; this.burst(e.x, e.y + 1, 0xff8fb5, 24, 7); this.burst(e.x, e.y + 1, 0xffe066, 20, 6, this.geo.star); break;
      case 'respawn': this.snapCamera = true; break;
      case 'scatter': this.shake = 0.2; break;
      case 'chaseStart': this.shake = 0.45; this.burst(e.x, e.y + 0.2, 0xffffff, 16, 5); break;
      case 'chaseEnd': this.shake = 0.35; this.burst(e.x, e.y, 0xffffff, 18, 6); this.burst(e.x, e.y, 0xffe066, 10, 5, this.geo.star); break;
      case 'bridgeOff': this.burst(e.x, e.y, 0xffe066, 10, 3, this.geo.star); break;
      case 'bossAngry': this.shake = 0.3; break;
    }
  }

  // ---------- 毎フレームの更新 ----------
  update(dt) {
    const g = this.game;
    if (!g) return;
    this.clock += dt;
    const c = this.clock, p = g.p;

    // ぷにゅ
    const pl = this.player, body = pl.userData.body;
    pl.position.set(p.x, p.y + TUNE.radius, 0);
    const moving = p.grounded && Math.abs(p.vx) > 0.3;
    let sx = 1, sy = 1;
    if (!p.grounded) { const k = clamp(p.vy / 20, -0.3, 0.35); sy = 1 + k * 0.5; sx = 1 - k * 0.3; }
    if (p.landT > 0) { const k = Math.sin((p.landT / 0.22) * Math.PI); sy = 1 - k * 0.28; sx = 1 + k * 0.22; }
    const bob = moving ? Math.abs(Math.sin(c * (10 + Math.abs(p.vx) * 1.5))) * 0.1 : Math.sin(c * 3) * 0.015;
    body.scale.set(sx, sy, sx);
    body.position.y = bob - (1 - sy) * TUNE.radius * 0.6;
    const face = p.dir * 0.55;
    body.rotation.y += (face - body.rotation.y) * Math.min(1, dt * 12);
    body.rotation.z = moving ? -Math.sign(p.vx) * Math.min(0.2, Math.abs(p.vx) * 0.02) : 0;
    if (p.dash > 0) body.rotation.z = -p.dir * 0.3;
    if (p.loop) body.rotation.z = -p.loop.th; // ループでは くるっと回る
    if (g.state === 'faint') body.rotation.z = Math.sin(c * 14) * 0.3;
    pl.visible = !(p.invuln > 0 && g.state === 'play' && !p.ride && Math.floor(c * 12) % 2 === 0);
    if (pl.userData.rainbow) pl.userData.skin.color.setHSL((c * 0.15) % 1, 0.75, 0.86);
    for (const f of pl.userData.flaps || []) {
      if (f.kind === 'wing') f.m.rotation.y = f.sx * (0.35 + Math.sin(c * (p.grounded ? 4 : 14)) * 0.35);
      else if (f.kind === 'cape') f.m.rotation.x = 0.15 + Math.min(0.9, Math.abs(p.vx) * 0.1 + (p.grounded ? 0 : 0.3)) + Math.sin(c * 8) * 0.06;
      else f.m.position.y = TUNE.radius + 0.85 + Math.sin(c * 2.5) * 0.05;
    }
    if (this.closeUp) { body.rotation.y = Math.sin(c * 1.1) * 0.95; body.rotation.z = 0; body.scale.set(1, 1, 1); body.position.y = Math.abs(Math.sin(c * 3)) * 0.05; }
    this.bubble.visible = g.state === 'bubble' || !!p.ride;
    if (this.bubble.visible) { this.bubble.position.copy(pl.position); const w = 1 + Math.sin(c * 8) * 0.05; this.bubble.scale.set(0.85 * w, 0.85 / w, 0.85); }
    // 影
    const f = g.t.floorAt(p.x, p.y + 0.05, 0.1).h;
    this.playerShadow.visible = f !== null && g.state !== 'bubble' && !p.loop;
    if (f !== null) { const hgt = p.y - f; this.playerShadow.position.set(p.x, f + 0.03, 0); this.playerShadow.scale.setScalar(clamp(1 - hgt * 0.1, 0.4, 1)); }

    // 足場
    for (const { p: q, m } of this.dynPlats) {
      const inner = m.userData.inner;
      m.position.set(q.x, q.y, 0);
      if (q.kind === 'crumble') {
        const shake = q.active && q.touchT > 0 ? Math.sin(c * 60) * 0.05 * Math.min(1, q.touchT * 2) : 0;
        inner.position.set(shake, q.active ? 0 : q.fy, 0);
        inner.rotation.z = q.active ? 0 : -q.fallT * 0.3;
        m.visible = q.active || q.fallT < 1.5;
      } else if (q.kind === 'bouncy') {
        q.boing = Math.max(0, (q.boing || 0) - dt);
        const k = q.boing > 0 ? Math.sin((q.boing / 0.4) * Math.PI * 3) * 0.2 * (q.boing / 0.4) : 0;
        inner.scale.set(1, 1 - k, 1);
      } else if (q.kind === 'bridge') {
        q.pop = q.active ? Math.min(1, (q.pop || 0) + dt * 4) : 0;
        inner.visible = q.active; inner.scale.set(1, q.pop, 1);
        m.userData.ghost.visible = !q.active;
        m.userData.ghost.material.opacity = 0.12 + Math.sin(c * 4) * 0.06;
        if (q.active && q.timer && q.timeLeft < 2) inner.visible = Math.floor(c * (q.timeLeft < 1 ? 16 : 8)) % 2 === 0;
      }
    }

    // 星・メダル・ハート
    const near = x => this.closeUp && Math.abs(x - p.x) < 3.5; // きせかえ画面では、ぷにゅの前にあるものを隠す
    g.stars.forEach((s, i) => { const m = this.starMeshes[i]; m.visible = !s.taken && !near(s.x); if (!s.taken) { m.rotation.y = Math.sin(c * 2.4 + s.x * 0.7) * 0.7; m.position.y = s.y + Math.sin(c * 3 + s.x) * 0.06; } });
    g.medals.forEach((md, i) => { const m = this.medalMeshes[i]; m.visible = !md.taken && !near(md.x); m.rotation.y = c * 1.6; m.position.y = md.y + Math.sin(c * 2.5) * 0.1; });
    g.heartItems.forEach((h, i) => { const m = this.heartMeshes[i]; m.visible = !h.taken; m.rotation.y = Math.sin(c * 2) * 0.6; m.position.y = h.y + Math.sin(c * 3) * 0.1; m.scale.setScalar(1 + Math.sin(c * 6) * 0.06); });
    g.springs.forEach((s, i) => { const u = this.springMeshes[i].userData, k = s.anim > 0 ? Math.sin((s.anim / 0.35) * Math.PI * 2) * 0.35 * (s.anim / 0.35) : 0; u.coil.scale.y = 1 + k; u.top.position.y = 0.72 + k * 0.4; });
    g.dashes.forEach((d, i) => { const a = this.dashMeshes[i].userData.arrows; a.forEach((m, j) => { const k = (Math.sin(c * 8 - (j >> 1)) + 1) / 2; m.material.color.setHSL(0.06 + 0.06 * k, 1, 0.5 + 0.15 * k); }); });
    g.checkpoints.forEach((cp, i) => { const fl = this.flagMeshes[i].userData.flag; if (cp.taken) fl.material.color.setHex(0xff8fb5); fl.rotation.y = Math.sin(c * 3 + i) * 0.25; });
    g.switches.forEach((sw, i) => { const b = this.switchMeshes[i].userData.btn; b.position.y = sw.on ? 0.4 : 0.75 + Math.sin(c * 3) * 0.06; b.rotation.y = sw.on ? 0 : c * 2; });
    this.updraftMeshes.forEach(m => { const u = m.userData; u.leaves.forEach((l, j) => { const k = (u.leaves.length ? (c * 0.35 + l.userData.k) % 1 : 0); l.position.set(Math.sin(c * 2 + j) * u.w * 0.3, k * u.h, Math.cos(c * 2 + j) * 0.4); l.rotation.set(c * 3 + j, c * 2, 0); }); });
    this.loopMeshes.forEach(m => { m.rotation.z = Math.sin(c) * 0.02; });

    // 敵
    g.enemies.forEach((e, i) => {
      const m = this.enemyMeshes[i], u = m.userData;
      m.visible = e.state !== 'gone' && !near(e.x);
      m.position.set(e.x, e.y + 0.4, 0);
      u.dizzy.visible = e.state !== 'walk';
      if (e.state === 'walk') {
        u.body.rotation.y = e.dir * 0.5; u.body.rotation.z = 0;
        u.body.position.y = e.kind === 'fly' ? 0 : Math.abs(Math.sin(c * 7 + i)) * 0.08;
        if (e.kind === 'hop') { const sq = e.air ? 1 + clamp(e.vy / 20, -0.2, 0.2) : 1 - Math.max(0, Math.sin(e.t * 4)) * 0.12; u.body.scale.set(2 - sq, sq, 2 - sq); }
        else u.body.scale.set(1, 1, 1);
        if (u.wings) u.wings.forEach((w, j) => { w.rotation.x = Math.sin(c * 40 + j * Math.PI) * 0.6; });
        if (u.claws) u.claws.forEach((cl, j) => { cl.position.y = 0.15 + Math.abs(Math.sin(c * 6 + j)) * 0.08; });
      } else {
        u.body.rotation.z += dt * (e.state === 'flee' ? 14 : 4); u.dizzy.rotation.y = c * 6;
        u.dizzy.children.forEach((s, j) => { const a = c * 5 + (j * Math.PI * 2) / 3; s.position.set(Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4); });
        if (e.state === 'dizzy') u.body.scale.set(1.2, 0.7, 1.2); else u.body.scale.set(1, 1, 1);
      }
    });
    this.spikeMeshes.forEach((m, i) => { m.rotation.z = Math.sin(c * 2 + i) * 0.08; });

    // しゃぼん玉（乗りもの）
    const seen = new Set();
    for (const b of g.rideBubbles) {
      seen.add(b);
      let m = this.rideMeshes.get(b);
      if (!m) { m = new T.Mesh(this.geo.ball, this.mat.bubble); this.world.add(m); this.rideMeshes.set(b, m); }
      const w = 1 + Math.sin(c * 6 + b.x) * 0.05;
      m.position.set(b.x, b.y + 0.8, 0); m.scale.set(0.85 * w, 0.85 / w, 0.85);
      m.visible = !b.rider;
    }
    for (const [b, m] of this.rideMeshes) if (!seen.has(b)) { this.world.remove(m); this.rideMeshes.delete(b); }

    // ボス
    if (this.bossMesh) this.updateBoss(dt, c);
    // ボスの攻撃
    const seenS = new Set();
    for (const s of g.shots) {
      seenS.add(s);
      let m = this.shotMeshes.get(s);
      if (!m) { m = this.makeShot(s.kind); this.world.add(m); this.shotMeshes.set(s, m); }
      m.position.set(s.x, s.y + (s.kind === 'shell' ? 0 : s.r), 0.1);
      if (s.kind === 'shell') m.rotation.z = -s.x * 1.2; else m.rotation.z += dt * 4;
    }
    for (const [s, m] of this.shotMeshes) if (!seenS.has(s)) { this.world.remove(m); this.shotMeshes.delete(s); }
    // とびちった星
    const seenL = new Set();
    for (const st of g.lostStars) {
      seenL.add(st);
      let m = this.lostMeshes.get(st);
      if (!m) { m = new T.Mesh(this.geo.star, this.mat.star); this.world.add(m); this.lostMeshes.set(st, m); }
      m.position.set(st.x, st.y + 0.3, 0.2); m.rotation.y = c * 8;
      m.visible = st.t < 3.3 || Math.floor(c * 14) % 2 === 0; // 消える前は点滅
    }
    for (const [st, m] of this.lostMeshes) if (!seenL.has(st)) { this.world.remove(m); this.lostMeshes.delete(st); }
    // おいかけっこの大玉
    g.chasers.forEach((ch, i) => {
      const m = this.chaseMeshes[i];
      const u = m.userData;
      m.visible = ch.state === 'fall' || ch.state === 'windup' || ch.state === 'roll';
      u.shadow.visible = ch.state === 'fall';
      if (!m.visible) { u.shadow.visible = false; return; }
      m.position.set(ch.x, ch.y + ch.r, 0);
      u.ball.rotation.z = ch.rot;
      if (ch.state === 'fall') {
        // 落ちてくる場所に、だんだん大きくなる影
        const k = Math.min(1, ch.t / 0.8);
        u.shadow.position.set(ch.x, ch.gy + 0.05, 0);
        u.shadow.scale.setScalar(0.5 + k * 0.7 + Math.sin(c * 16) * 0.04);
        u.body.scale.set(1, 1, 1);
      } else if (ch.state === 'windup') {
        // ぐぐっ
        const k = Math.sin(Math.min(1, ch.t / 0.5) * Math.PI);
        u.body.scale.set(1 + k * 0.15, 1 - k * 0.2, 1 + k * 0.15);
        u.body.position.y = -k * 0.3;
      } else { u.body.scale.set(1, 1, 1); u.body.position.y = 0; }
      u.face.position.y = ch.state === 'roll' ? Math.abs(Math.sin(c * 10)) * 0.08 : 0;
    });
    // 上から落ちてくるもの：先に影で知らせる
    const seenD = new Set();
    for (const d of g.drops) {
      seenD.add(d);
      let o = this.dropMeshes.get(d);
      if (!o) {
        o = { shadow: new T.Mesh(new T.CircleGeometry(0.55, 20), new T.MeshBasicMaterial({ color: 0x3a2050, transparent: true, opacity: 0.4, depthWrite: false })), obj: this.makeDrop(d.kind) };
        o.shadow.rotation.x = -Math.PI / 2; this.world.add(o.shadow, o.obj); this.dropMeshes.set(d, o);
      }
      const k = d.state === 'warn' ? Math.min(1, d.t / 1.1) : 1;
      o.shadow.position.set(d.x, d.gy + 0.04, 0);
      o.shadow.scale.setScalar(0.4 + k * 0.6 + Math.sin(c * 16) * 0.05);
      o.shadow.material.opacity = 0.25 + k * 0.3;
      o.obj.visible = d.state === 'fall' || d.t > 0.8;
      o.obj.position.set(d.x, d.state === 'fall' ? d.y + 0.35 : d.gy + 9, 0.1);
      o.obj.rotation.z = c * 5;
    }
    for (const [d, o] of this.dropMeshes) if (!seenD.has(d)) { this.world.remove(o.shadow, o.obj); o.shadow.geometry.dispose(); this.dropMeshes.delete(d); }
    // 風の線
    this.windLines.visible = g.wind !== 0;
    if (g.wind) this.windLines.children.forEach((l, j) => {
      const k = (c * 0.9 + l.userData.k) % 1;
      l.position.set(this.cam.x + (g.wind > 0 ? -1 : 1) * (9 - k * 18), p.y + 0.5 + ((j * 1.7) % 4) - 1, 0.5);
    });

    if (this.goalMesh) {
      const u = this.goalMesh.userData; u.star.rotation.y = c * 1.5;
      this.goalAppear = Math.min(1, (this.goalAppear ?? 1) + dt * 2);
      this.goalMesh.scale.setScalar(this.goalAppear);
      this.goalMesh.position.y = g.goal ? g.goal.y + Math.sin(c * 2) * 0.15 : this.goalMesh.position.y;
      u.ring.scale.setScalar(1 + Math.sin(c * 3) * 0.06);
    }

    // 粒
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const q = this.particles[i];
      q.life -= dt;
      if (q.life <= 0) { this.pGroup.remove(q.m); this.sparkPool.push(q.m); this.particles[i] = this.particles[this.particles.length - 1]; this.particles.pop(); continue; }
      q.vy -= 6 * dt; q.m.position.x += q.vx * dt; q.m.position.y += q.vy * dt;
      q.m.rotation.z += dt * 6;
      q.m.scale.setScalar(Math.min(1, q.life / 0.3));
    }

    this.updateCamera(dt);
    if (this.debugHitbox) this.drawHitboxes(); else if (this.hitboxes) { this.world.remove(this.hitboxes); this.hitboxes = null; }
    this.adapt(dt);
    this.applySize();
    this.renderer.render(this.scene, this.camera);
  }

  updateBoss(dt, c) {
    const g = this.game, B = g.boss, m = this.bossMesh, u = m.userData;
    m.position.set(B.x, B.y + B.r, 0);
    for (const gate of this.gates) { gate.visible = B.active && !B.done; }
    const hurt = B.state === 'hurt', rest = B.state === 'sleep' || B.state === 'tired' || B.state === 'rest';
    u.eyes.visible = !(hurt || B.done || B.state === 'sleep');
    u.happy.visible = !u.eyes.visible;
    u.dizzy.visible = hurt;
    if (hurt) { u.dizzy.rotation.y = c * 6; u.dizzy.children.forEach((s, j) => { const a = c * 5 + (j * Math.PI * 2) / 4; s.position.set(Math.cos(a) * 1, 0, Math.sin(a) * 1); }); }
    // 踏まれたら白く光る
    const flash = B.flash > 0 && Math.floor(c * 20) % 2 === 0;
    // ほんきモード（のこり1回）：ほんのり赤く光る
    const angry = B.angry && !B.done && !flash;
    for (const mt of u.mats) { mt.emissive.setHex(flash ? 0xffffff : angry ? 0xff3366 : 0x000000); mt.emissiveIntensity = flash ? 0.6 : angry ? 0.18 + Math.sin(c * 8) * 0.1 : 0; }
    // 顔の向き・体のゆれ
    const dir = Math.sign(g.p.x - B.x) || 1;
    u.body.rotation.y += (dir * 0.35 - u.body.rotation.y) * Math.min(1, dt * 4);
    let sy = 1;
    if (B.state === 'crouch' || B.state === 'throw' && B.t < 0.8) sy = 0.82;
    else if (B.state === 'jump' || B.state === 'hop') sy = 1.12;
    else if (rest) sy = 0.92 + Math.sin(c * 2) * 0.03;
    else sy = 1 + Math.sin(c * 5) * 0.04;
    if (B.done) { sy = 1 + Math.sin(c * 6) * 0.06; u.body.rotation.y = Math.sin(c * 2) * 0.4; }
    u.body.scale.set(2 - sy, sy, 2 - sy);
    if (u.zz) { u.zz.visible = B.state === 'sleep'; u.zz.position.y = Math.sin(c * 2) * 0.2; }
    if (u.cheeks) { const puff = B.state === 'puff' ? (B.t < 0.9 ? 1 + B.t * 0.6 : 1.5) : 1; u.cheeks.forEach(ch => ch.scale.set(0.3 * puff, 0.24 * puff, 0.2 * puff)); }
    if (u.claws) u.claws.forEach((cl, j) => { cl.rotation.z = (j ? -1 : 1) * (0.5 + (B.state === 'throw' ? 0.6 : Math.abs(Math.sin(c * 4)) * 0.3)); });
    if (B.done) { u.body.rotation.z = 0; }
  }

  updateCamera(dt) {
    const g = this.game, p = g.p;
    let lookTarget = clamp(p.dir * 2.6 + p.vx * 0.25, -3.5, 5.5);
    // おいかけっこ中は、後ろの大玉も見えるように前を見すぎない
    if (g.chasers.some(ch => ch.state === 'fall' || ch.state === 'windup' || ch.state === 'roll')) lookTarget = 0.5;
    let tx = p.x;
    const vh = 10.5; // 画面の縦に見える高さ（マス）
    let ty = p.y + 1.6;
    // ボス戦：ひろば全体が見えるようにカメラを止める
    const B = g.boss;
    if (B && B.active && !B.done) {
      const halfW = (vh * this.camera.aspect) / 2;
      const w = B.x1 - B.x0;
      tx = w <= halfW * 2 - 1 ? (B.x0 + B.x1) / 2 : clamp(p.x, B.x0 + halfW - 0.5, B.x1 - halfW + 0.5);
      lookTarget = 0;
      ty = B.floor + 3.4;
    }
    if (g.state === 'bubble') ty = Math.max(ty, g.safe.y + 1.6);
    ty = Math.max(ty, g.t.killY + 5);
    if (this.snapCamera) { this.cam.x = tx; this.cam.y = ty; this.cam.look = lookTarget; this.snapCamera = false; }
    const k = 1 - Math.exp(-dt * 5);
    this.cam.look += (lookTarget - this.cam.look) * (1 - Math.exp(-dt * 2.2));
    this.cam.x += (tx - this.cam.x) * Math.min(1, k * 2.2);
    // 上下はゆっくり（小さなジャンプでは揺らさない）
    const dy = ty - this.cam.y;
    const dead = p.grounded || (B && B.active) ? 0 : 1.2;
    if (Math.abs(dy) > dead) this.cam.y += (dy - Math.sign(dy) * dead) * (1 - Math.exp(-dt * (p.grounded ? 3 : 4)));
    const dist = vh / 2 / Math.tan((this.camera.fov * Math.PI) / 360);
    let sx = 0, sy = 0;
    if (this.shake > 0) { this.shake -= dt; sx = (Math.random() - 0.5) * 0.25; sy = (Math.random() - 0.5) * 0.25; }
    const cx = this.cam.x + this.cam.look;
    // きせかえ画面：ぷにゅに近づく（画面の右がわに大きく）
    const z = this.zoom = (this.zoom ?? 0) + ((this.closeUp ? 1 : 0) - (this.zoom ?? 0)) * (1 - Math.exp(-dt * 5));
    const zd = 4.3, zvh = 2 * zd * Math.tan((this.camera.fov * Math.PI) / 360);
    const zx = p.x - zvh * this.camera.aspect * 0.24, zy = p.y + 0.62;
    this.camera.position.set(lerp(cx, zx, z) + sx, lerp(this.cam.y + 2.2, zy + 0.35, z) + sy, lerp(dist, zd, z));
    this.camera.lookAt(lerp(cx, zx, z) + sx, lerp(this.cam.y, zy, z) + sy, 0);
  }

  drawHitboxes() {
    if (this.hitboxes) this.world.remove(this.hitboxes);
    const g = this.game, grp = new T.Group(), mat = new T.LineBasicMaterial({ color: 0xff0000 });
    const circle = (x, y, r, color) => { const pts = []; for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI * 2; pts.push(new T.Vector3(x + Math.cos(a) * r, y + Math.sin(a) * r, 1)); } grp.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), color ? new T.LineBasicMaterial({ color }) : mat)); };
    circle(g.p.x, g.p.y + TUNE.radius, TUNE.radius, 0x0000ff);
    for (const e of g.enemies) if (e.state === 'walk') circle(e.x, e.y + 0.42, 0.38);
    for (const s of g.spikes) circle(s.x, s.y + 0.35, 0.3);
    if (g.boss && g.boss.active) circle(g.boss.x, g.boss.y + g.boss.r, g.boss.r, 0xff00ff);
    for (const s of g.shots) circle(s.x, s.y + s.r, s.r);
    for (const ch of g.chasers) if (ch.state === 'roll') circle(ch.x, ch.y + ch.r, ch.r);
    for (const d of g.drops) if (d.state === 'fall') circle(d.x, d.y + 0.35, 0.32);
    this.hitboxes = grp; this.world.add(grp);
  }

  // 重い状態が続くときだけ解像度を少し下げる。一時的な引っかかりでは下げない
  adapt(dt) {
    if (dt <= 0) return;
    this.frameTimes.push(dt);
    this.worst = Math.max(this.worst || 0, dt);
    this.windowTime = (this.windowTime || 0) + dt;
    if (this.windowTime < 1.5) return; // 1.5秒ごとに判定
    this.windowTime = 0;
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const typical = sorted[Math.floor(sorted.length * 0.5)];
    this.fps = 1 / typical;
    this.worstShown = this.worst; this.worst = 0;
    this.frameTimes.length = 0;
    // 目標の間隔（60fps なら 1/60 秒）を保てていなければ「重い」
    if (typical > this.targetInterval * 1.25) this.slowSince++; else this.slowSince = 0;
    if (this.slowSince >= 2) {
      this.slowSince = 0;
      if (this.quality > 0.7) this.quality = Math.max(0.7, this.quality - 0.15);
      else this.cannotKeepUp = true; // 画質を下げても間に合わない → app.mjs が 30fps に切りかえる
    }
  }
  get renderInfo() { return `${this.applied.w}x${this.applied.h}@${this.applied.ratio}`; }
}
