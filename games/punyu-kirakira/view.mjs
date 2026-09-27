// 3D表示。ゲームの計算は2D（core.mjs）で、見た目だけ立体にする
import * as T from './vendor/three.module.min.js';
import { TUNE, clamp } from './core.mjs';

const COLORS = {
  skyTop: '#7fd0ff', skyBottom: '#fff1f7',
  grass: 0x8fdc6e, grassDark: 0x6cc35a, soil: 0xf2c79a, soilDark: 0xe0a97c,
  punyu: 0xfff4f7, cheek: 0xff9fb8, eye: 0x3a2a3a,
  star: 0xffd84a, enemy: 0xb58cff, enemyDark: 0x8c63d9,
  platform: 0xfff0d6, platformTop: 0xff9fc6,
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

// 動かない飾りを材質ごとに1つの形へまとめて、描画の回数を減らす（iPhone向け）
function mergeStatic(group) {
  group.updateMatrixWorld(true);
  const buckets = new Map();
  const out = new T.Group();
  group.traverse(o => {
    if (!o.isMesh) return;
    if (Array.isArray(o.material) || o.material.map) { const c = o.clone(); o.matrixWorld.decompose(c.position, c.quaternion, c.scale); out.add(c); return; }
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    if (!buckets.has(o.material)) buckets.set(o.material, []);
    buckets.get(o.material).push(g);
  });
  for (const [mat, list] of buckets) {
    let n = 0;
    for (const g of list) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    let off = 0;
    for (const g of list) {
      pos.set(g.attributes.position.array, off * 3);
      if (g.attributes.normal) nor.set(g.attributes.normal.array, off * 3);
      off += g.attributes.position.count;
      g.dispose();
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
    geo.computeBoundingSphere();
    const m = new T.Mesh(geo, mat);
    m.frustumCulled = false;
    out.add(m);
  }
  return out;
}

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export class View {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(30, 1, 0.5, 200);
    this.cam = { x: 0, y: 2, look: 2.5 };
    this.clock = 0;
    this.frameTimes = [];
    this.debugHitbox = false;
    this.setupSky();
    this.setupLights();
    this.shared();
    this.resize();
  }

  setupSky() {
    const c = document.createElement('canvas');
    c.width = 2; c.height = 256;
    const g = c.getContext('2d'), grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, COLORS.skyTop); grd.addColorStop(0.75, '#cdeeff'); grd.addColorStop(1, COLORS.skyBottom);
    g.fillStyle = grd; g.fillRect(0, 0, 2, 256);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    this.scene.background = tex;
    this.scene.fog = new T.Fog(0xe8f6ff, 45, 120);
  }

  setupLights() {
    this.scene.add(new T.HemisphereLight(0xffffff, 0xc9e7b8, 1.6));
    const sun = new T.DirectionalLight(0xffffff, 1.6);
    sun.position.set(-4, 10, 8);
    this.scene.add(sun);
  }

  shared() {
    this.geo = {
      star: new T.ExtrudeGeometry(starShape(), { depth: 0.14, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2 }),
      bigStar: new T.ExtrudeGeometry(starShape(1.3, 0.6), { depth: 0.4, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.14, bevelSegments: 3 }),
      ball: new T.SphereGeometry(1, 20, 14),
      spark: new T.OctahedronGeometry(0.12),
    };
    this.geo.star.center(); this.geo.bigStar.center();
    this.mat = {
      star: toon(COLORS.star, { emissive: 0x6b4a00, emissiveIntensity: 0.35 }),
      white: toon(0xffffff), eye: new T.MeshBasicMaterial({ color: COLORS.eye }),
      cheek: toon(COLORS.cheek), shadow: new T.MeshBasicMaterial({ color: 0x2c4a2c, transparent: true, opacity: 0.22, depthWrite: false }),
    };
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---------- ステージを組み立てる ----------
  build(game) {
    if (this.world) { this.scene.remove(this.world); this.dispose(this.world); }
    this.game = game;
    this.world = new T.Group();
    this.scene.add(this.world);
    const st = game.stage, t = st.terrain;
    this.stat = new T.Group();
    this.buildGround(t);
    this.buildBackdrop(t);
    this.buildDecor(t);
    for (const p of t.platforms) this.stat.add(this.makePlatform(p));
    this.world.add(mergeStatic(this.stat));
    this.stat = null;
    this.starMeshes = game.stars.map(s => { const m = new T.Mesh(this.geo.star, this.mat.star); m.position.set(s.x, s.y, 0); this.world.add(m); return m; });
    this.medalMeshes = game.medals.map(m => { const g = this.makeMedal(m.had); g.position.set(m.x, m.y, 0); this.world.add(g); return g; });
    this.springMeshes = game.springs.map(s => { const g = this.makeSpring(); g.position.set(s.x, s.y, 0); this.world.add(g); return g; });
    this.dashMeshes = game.dashes.map(d => { const g = this.makeDash(); g.position.set(d.x, d.y, 0); this.world.add(g); return g; });
    this.enemyMeshes = game.enemies.map(() => { const g = this.makeEnemy(); this.world.add(g); return g; });
    this.flagMeshes = game.checkpoints.map(c => { const g = this.makeFlag(); g.position.set(c.x, c.y, -0.6); this.world.add(g); return g; });
    for (const s of st.sign) { const g = this.makeSign(s.icon); g.position.set(s.x, s.y, -1.4); this.world.add(g); }
    if (game.goal) { this.goalMesh = this.makeGoal(); this.goalMesh.position.set(game.goal.x, game.goal.y, 0); this.world.add(this.goalMesh); }
    this.player = this.makePunyu();
    this.world.add(this.player);
    this.playerShadow = new T.Mesh(new T.CircleGeometry(0.45, 20), this.mat.shadow);
    this.playerShadow.rotation.x = -Math.PI / 2;
    this.world.add(this.playerShadow);
    this.bubble = new T.Mesh(this.geo.ball, new T.MeshToonMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0.45, gradientMap: toonRamp, emissive: 0x6fb8ff, emissiveIntensity: 0.2 }));
    this.bubble.scale.setScalar(0.85); this.bubble.visible = false;
    this.world.add(this.bubble);
    this.particles = [];
    this.pGroup = new T.Group(); this.world.add(this.pGroup);
    this.hitboxes = null;
    this.cam.x = game.p.x; this.cam.y = game.p.y + 2; this.cam.look = 2.5;
    this.snapCamera = true;
  }

  dispose(obj) {
    const keepG = new Set(Object.values(this.geo)), keepM = new Set(Object.values(this.mat));
    obj.traverse(o => {
      if (o.geometry && !keepG.has(o.geometry)) o.geometry.dispose();
      for (const m of [].concat(o.material || [])) if (!keepM.has(m)) { m.map?.dispose(); m.dispose(); }
    });
  }

  buildGround(t) {
    const soil = toon(COLORS.soil), grass = toon(COLORS.grass);
    const bottom = t.lowest - 9;
    for (const piece of t.pieces) {
      const pts = piece.pts;
      const s = new T.Shape();
      s.moveTo(pts[0][0], bottom);
      for (const [x, y] of pts) s.lineTo(x, y - 0.05);
      s.lineTo(pts[pts.length - 1][0], bottom);
      s.closePath();
      const body = new T.Mesh(new T.ExtrudeGeometry(s, { depth: 4, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.2, bevelSegments: 2, curveSegments: 1 }), soil);
      body.position.z = -3.3; // 手前の面はぷにゅのすぐ前（段差でぷにゅが隠れないように）
      this.stat.add(body);
      // 草の層（上面にそって少し厚く）
      const g = new T.Shape();
      g.moveTo(pts[0][0] - 0.1, pts[0][1] + 0.08);
      for (const [x, y] of pts) g.lineTo(x, y + 0.08);
      g.lineTo(pts[pts.length - 1][0] + 0.1, pts[pts.length - 1][1] + 0.08);
      for (let i = pts.length - 1; i >= 0; i--) g.lineTo(pts[i][0] + (i === pts.length - 1 ? 0.1 : i === 0 ? -0.1 : 0), pts[i][1] - 0.45);
      g.closePath();
      const top = new T.Mesh(new T.ExtrudeGeometry(g, { depth: 4.2, bevelEnabled: true, bevelThickness: 0.18, bevelSize: 0.12, bevelSegments: 2 }), grass);
      top.position.z = -3.45;
      this.stat.add(top);
      // 土の模様（まるい石）
      const r = rng(Math.floor(piece.x0 * 13 + 7));
      const dot = toon(COLORS.soilDark);
      for (let x = piece.x0 + 1; x < piece.x1 - 1; x += 1.6 + r() * 2) {
        const gy = t.groundAt(x);
        if (gy === null) continue;
        const m = new T.Mesh(this.geo.ball, dot);
        m.scale.set(0.22 + r() * 0.12, 0.16 + r() * 0.08, 0.05);
        m.position.set(x, gy - 1 - r() * 3, 0.92);
        this.stat.add(m);
      }
    }
  }

  buildBackdrop(t) {
    const r = rng(42);
    const hillMats = [toon(0xa8e58f), toon(0x97dc86), toon(0xb9ecb0)];
    for (let x = t.x0 - 30; x < t.x1 + 40; x += 14 + r() * 10) {
      const m = new T.Mesh(this.geo.ball, hillMats[Math.floor(r() * 3)]);
      const s = 9 + r() * 8;
      m.scale.set(s * 1.4, s, s * 0.6);
      m.position.set(x, t.lowest - s * 0.45, -34 - r() * 10);
      this.stat.add(m);
    }
    const far = toon(0xc6e8f7);
    for (let x = t.x0 - 40; x < t.x1 + 60; x += 30 + r() * 20) {
      const m = new T.Mesh(this.geo.ball, far);
      const s = 18 + r() * 10;
      m.scale.set(s * 1.6, s, 4);
      m.position.set(x, t.lowest - s * 0.3, -70);
      this.stat.add(m);
    }
    const cloud = toon(0xffffff);
    for (let x = t.x0 - 20; x < t.x1 + 40; x += 12 + r() * 14) {
      const c = new T.Group();
      for (let i = 0; i < 4; i++) {
        const m = new T.Mesh(this.geo.ball, cloud);
        const s = 1 + r() * 0.9;
        m.scale.set(s, s * 0.8, s * 0.7);
        m.position.set(i * 1.1 - 1.6, (i === 1 || i === 2) ? 0.5 : 0, 0);
        c.add(m);
      }
      c.position.set(x, 9 + r() * 6, -26 - r() * 10);
      this.stat.add(c);
    }
  }

  buildDecor(t) {
    const r = rng(7);
    const petals = [0xff8fb5, 0xffc94d, 0xffffff, 0xb79cff, 0x7fd4ff].map(c => toon(c));
    const center = toon(0xffcf3f), stem = toon(0x5bb34a);
    const bush = toon(0x74c95e), trunk = toon(0xc98f5e), leaf = [toon(0x7ed56a), toon(0x9be07f)];
    const flowerGeo = new T.SphereGeometry(1, 10, 8);
    const addFlower = (x, y, z, s = 1) => {
      const f = new T.Group();
      const st = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.5, 5), stem);
      st.position.y = 0.25; f.add(st);
      const pm = petals[Math.floor(r() * petals.length)];
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const p = new T.Mesh(flowerGeo, pm);
        p.scale.set(0.1, 0.1, 0.05);
        p.position.set(Math.cos(a) * 0.12, 0.55 + Math.sin(a) * 0.12, 0);
        f.add(p);
      }
      const c = new T.Mesh(flowerGeo, center); c.scale.setScalar(0.07); c.position.set(0, 0.55, 0.03); f.add(c);
      f.position.set(x, y, z); f.scale.setScalar(s);
      this.stat.add(f);
    };
    for (const piece of t.pieces) {
      for (let x = piece.x0 + 0.6; x < piece.x1 - 0.4; x += 0.7 + r() * 1.6) {
        const y = t.groundAt(x);
        if (y === null) continue;
        addFlower(x, y, -1.2 - r() * 1.8, 0.9 + r() * 0.5);
      }
      for (let x = piece.x0 + 2; x < piece.x1 - 1; x += 7 + r() * 9) {
        const y = t.groundAt(x);
        if (y === null) continue;
        if (r() < 0.5) {
          const g = new T.Group();
          for (let i = 0; i < 3; i++) { const m = new T.Mesh(this.geo.ball, bush); const s = 0.7 + r() * 0.4; m.scale.set(s, s * 0.8, s * 0.7); m.position.set(i * 0.8 - 0.8, i === 1 ? 0.3 : 0, 0); g.add(m); }
          g.position.set(x, y + 0.2, -2.6); this.stat.add(g);
        } else {
          const g = new T.Group();
          const tr = new T.Mesh(new T.CylinderGeometry(0.22, 0.3, 2.4, 8), trunk); tr.position.y = 1.2; g.add(tr);
          const lm = leaf[Math.floor(r() * 2)];
          for (let i = 0; i < 3; i++) { const m = new T.Mesh(this.geo.ball, lm); const s = 1.1 + r() * 0.4; m.scale.set(s, s * 0.9, s * 0.8); m.position.set(i * 0.9 - 0.9, 2.8 + (i === 1 ? 0.6 : 0), 0); g.add(m); }
          g.position.set(x, y, -4.8 - r() * 2); this.stat.add(g);
        }
      }
    }
  }

  makePlatform(p) {
    const g = new T.Group();
    const body = new T.Mesh(new T.BoxGeometry(p.w, 0.42, 2.2), toon(COLORS.platform));
    body.position.set(p.w / 2, -0.26, 0);
    const top = new T.Mesh(new T.BoxGeometry(p.w + 0.12, 0.16, 2.3), toon(COLORS.platformTop));
    top.position.set(p.w / 2, -0.04, 0);
    g.add(body, top);
    // ふちのたれ（クリームのような飾り）
    for (let x = 0.3; x < p.w; x += 0.6) {
      const d = new T.Mesh(this.geo.ball, toon(COLORS.platformTop));
      d.scale.set(0.2, 0.18, 0.1); d.position.set(x, -0.14, 1.15); g.add(d);
    }
    g.position.set(p.x, p.y, 0);
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

  makeDash() {
    const g = new T.Group();
    const pad = new T.Mesh(new T.BoxGeometry(2, 0.08, 1.6), toon(0xfff2a8)); pad.position.y = 0.04; g.add(pad);
    const arrows = [];
    for (let i = 0; i < 3; i++) {
      const s = new T.Shape(); s.moveTo(0, 0.35); s.lineTo(0.3, 0); s.lineTo(0, -0.35); s.lineTo(-0.15, -0.35); s.lineTo(0.12, 0); s.lineTo(-0.15, 0.35); s.closePath();
      const m = new T.Mesh(new T.ShapeGeometry(s), new T.MeshBasicMaterial({ color: 0xff7a3d }));
      m.rotation.x = -Math.PI / 2; m.position.set(-0.55 + i * 0.5, 0.09, 0);
      g.add(m); arrows.push(m);
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

  makePunyu() {
    const root = new T.Group();
    const body = new T.Group();
    root.add(body);
    const r = TUNE.radius;
    const skin = toon(COLORS.punyu);
    const ball = new T.Mesh(this.geo.ball, skin); ball.scale.set(r * 1.05, r, r); body.add(ball);
    for (const s of [-1, 1]) {
      const ear = new T.Mesh(this.geo.ball, skin); ear.scale.set(0.14, 0.2, 0.12); ear.position.set(s * 0.25, r * 0.85, -0.05); ear.rotation.z = -s * 0.4; body.add(ear);
      const inner = new T.Mesh(this.geo.ball, this.mat.cheek); inner.scale.set(0.07, 0.11, 0.05); inner.position.set(s * 0.25, r * 0.86, 0.06); inner.rotation.z = -s * 0.4; body.add(inner);
      const eye = new T.Mesh(this.geo.ball, this.mat.eye); eye.scale.set(0.065, 0.09, 0.05); eye.position.set(s * 0.15, 0.06, r * 0.93); body.add(eye);
      const hl = new T.Mesh(this.geo.ball, new T.MeshBasicMaterial({ color: 0xffffff })); hl.scale.setScalar(0.025); hl.position.set(s * 0.15 + 0.02, 0.1, r * 0.99); body.add(hl);
      const ch = new T.Mesh(this.geo.ball, this.mat.cheek); ch.scale.set(0.09, 0.055, 0.04); ch.position.set(s * 0.27, -0.07, r * 0.84); body.add(ch);
      const foot = new T.Mesh(this.geo.ball, toon(0xffd6e2)); foot.scale.set(0.13, 0.08, 0.14); foot.position.set(s * 0.18, -r * 0.92, 0.05); body.add(foot);
      body.userData['foot' + s] = foot;
    }
    const mouth = new T.Mesh(new T.TorusGeometry(0.05, 0.015, 6, 12, Math.PI), this.mat.eye); mouth.position.set(0, -0.06, r * 0.97); mouth.rotation.z = Math.PI; body.add(mouth);
    const tail = new T.Mesh(this.geo.ball, skin); tail.scale.setScalar(0.1); tail.position.set(0, -0.1, -r * 0.95); body.add(tail);
    root.userData = { body };
    return root;
  }

  makeEnemy() {
    const root = new T.Group();
    const body = new T.Group(); root.add(body);
    const m = new T.Mesh(this.geo.ball, toon(COLORS.enemy)); m.scale.set(0.42, 0.38, 0.4); body.add(m);
    const tuft = new T.Mesh(new T.ConeGeometry(0.1, 0.25, 8), toon(COLORS.enemyDark)); tuft.position.set(0.04, 0.42, 0); tuft.rotation.z = -0.4; body.add(tuft);
    for (const s of [-1, 1]) {
      const w = new T.Mesh(this.geo.ball, this.mat.white); w.scale.set(0.11, 0.12, 0.05); w.position.set(s * 0.14, 0.05, 0.37); body.add(w);
      const p = new T.Mesh(this.geo.ball, this.mat.eye); p.scale.set(0.05, 0.07, 0.03); p.position.set(s * 0.13 - 0.03, 0.04, 0.41); body.add(p);
      const brow = new T.Mesh(new T.BoxGeometry(0.14, 0.03, 0.02), this.mat.eye); brow.position.set(s * 0.14, 0.2, 0.39); brow.rotation.z = s * 0.35; body.add(brow);
      const foot = new T.Mesh(this.geo.ball, toon(COLORS.enemyDark)); foot.scale.set(0.12, 0.07, 0.12); foot.position.set(s * 0.18, -0.36, 0.04); body.add(foot);
    }
    const grin = new T.Mesh(new T.TorusGeometry(0.07, 0.018, 6, 12, Math.PI), this.mat.eye); grin.position.set(0, -0.1, 0.39); grin.rotation.z = Math.PI; body.add(grin);
    const dizzy = new T.Group();
    for (let i = 0; i < 3; i++) { const s = new T.Mesh(this.geo.star, this.mat.star); s.scale.setScalar(0.35); dizzy.add(s); }
    dizzy.visible = false; dizzy.position.y = 0.55; root.add(dizzy);
    root.userData = { body, dizzy };
    return root;
  }

  // ---------- 演出 ----------
  burst(x, y, color, n = 8, speed = 3.5, geo = this.geo.spark) {
    const mat = new T.MeshBasicMaterial({ color, transparent: true });
    for (let i = 0; i < n; i++) {
      const m = new T.Mesh(geo, mat);
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      m.position.set(x, y, 0.3);
      this.pGroup.add(m);
      this.particles.push({ m, vx: Math.cos(a) * speed * (0.6 + Math.random() * 0.5), vy: Math.sin(a) * speed * (0.6 + Math.random() * 0.5) + 1, life: 0.6 + Math.random() * 0.3, max: 0.9, mat });
    }
  }

  onEvent(e) {
    switch (e.type) {
      case 'star': this.burst(e.x, e.y, 0xffe066, 6, 3); break;
      case 'medal': this.burst(e.x, e.y, 0xff8fb5, 14, 5); this.burst(e.x, e.y, 0x7fd4ff, 10, 4); break;
      case 'spring': this.burst(e.x, e.y + 0.7, 0xffffff, 8, 3); break;
      case 'dash': this.burst(e.x, e.y + 0.3, 0xffa94d, 10, 4); break;
      case 'stomp': this.burst(e.x, e.y + 0.3, 0xffffff, 10, 4); this.burst(e.x, e.y + 0.3, 0xffe066, 5, 3, this.geo.star); break;
      case 'land': if (e.impact > 0.4) this.burst(e.x, e.y + 0.05, 0xffffff, 6, 2); break;
      case 'hurt': this.shake = 0.25; this.burst(e.x, e.y, 0xff7a9c, 8, 3); break;
      case 'checkpoint': this.burst(e.x + 0.5, e.y + 2.5, 0xffe066, 16, 5, this.geo.star); break;
      case 'goal': this.burst(e.x, e.y, 0xffe066, 24, 7, this.geo.star); this.burst(e.x, e.y, 0xff8fb5, 20, 5); break;
      case 'pop': this.burst(e.x, e.y, 0xbfe9ff, 12, 4); break;
      case 'heart': this.burst(e.x, e.y + 0.6, 0xff6f91, 12, 4); break;
      case 'respawn': this.snapCamera = true; break;
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
    const faint = g.state === 'faint';
    if (faint) { body.rotation.z = Math.sin(c * 14) * 0.3; }
    pl.visible = !(p.invuln > 0 && g.state === 'play' && Math.floor(c * 12) % 2 === 0);
    this.bubble.visible = g.state === 'bubble';
    if (this.bubble.visible) { this.bubble.position.copy(pl.position); const w = 1 + Math.sin(c * 8) * 0.05; this.bubble.scale.set(0.85 * w, 0.85 / w, 0.85); }
    // 影
    const f = g.t.floorAt(p.x, p.y + 0.05, 0.1).h;
    this.playerShadow.visible = f !== null && g.state !== 'bubble';
    if (f !== null) { const hgt = p.y - f; this.playerShadow.position.set(p.x, f + 0.03, 0); this.playerShadow.scale.setScalar(clamp(1 - hgt * 0.1, 0.4, 1)); }

    // 星
    g.stars.forEach((s, i) => { const m = this.starMeshes[i]; m.visible = !s.taken; if (!s.taken) { m.rotation.y = Math.sin(c * 2.4 + s.x * 0.7) * 0.7; m.position.y = s.y + Math.sin(c * 3 + s.x) * 0.06; } });
    g.medals.forEach((md, i) => { const m = this.medalMeshes[i]; m.visible = !md.taken; m.rotation.y = c * 1.6; m.position.y = md.y + Math.sin(c * 2.5) * 0.1; });
    g.springs.forEach((s, i) => { const u = this.springMeshes[i].userData, k = s.anim > 0 ? Math.sin((s.anim / 0.35) * Math.PI * 2) * 0.35 * (s.anim / 0.35) : 0; u.coil.scale.y = 1 + k; u.top.position.y = 0.72 + k * 0.4; });
    g.dashes.forEach((d, i) => { const a = this.dashMeshes[i].userData.arrows; a.forEach((m, j) => m.material.color.setHSL(0.06 + 0.05 * ((Math.sin(c * 8 - j) + 1) / 2), 1, 0.6)); });
    g.checkpoints.forEach((cp, i) => { const fl = this.flagMeshes[i].userData.flag; if (cp.taken) fl.material.color.setHex(0xff8fb5); fl.rotation.y = Math.sin(c * 3 + i) * 0.25; });
    g.enemies.forEach((e, i) => {
      const m = this.enemyMeshes[i], u = m.userData;
      m.visible = e.state !== 'gone';
      m.position.set(e.x, e.y + 0.4, 0);
      u.dizzy.visible = e.state !== 'walk';
      if (e.state === 'walk') { u.body.rotation.y = e.dir * 0.5; u.body.position.y = Math.abs(Math.sin(c * 7 + i)) * 0.08; u.body.scale.set(1, 1, 1); }
      else { u.body.rotation.z += dt * (e.state === 'flee' ? 14 : 4); u.dizzy.rotation.y = c * 6; u.dizzy.children.forEach((s, j) => { const a = c * 5 + (j * Math.PI * 2) / 3; s.position.set(Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4); }); if (e.state === 'dizzy') u.body.scale.set(1.2, 0.7, 1.2); else u.body.scale.set(1, 1, 1); }
    });
    if (this.goalMesh) { const u = this.goalMesh.userData; u.star.rotation.y = c * 1.5; this.goalMesh.position.y = g.goal.y + Math.sin(c * 2) * 0.15; u.ring.scale.setScalar(1 + Math.sin(c * 3) * 0.06); }

    // 粒
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const q = this.particles[i];
      q.life -= dt;
      if (q.life <= 0) { this.pGroup.remove(q.m); this.particles.splice(i, 1); continue; }
      q.vy -= 6 * dt; q.m.position.x += q.vx * dt; q.m.position.y += q.vy * dt;
      q.m.rotation.z += dt * 6;
      q.m.material.opacity = Math.min(1, q.life / 0.3);
    }

    this.updateCamera(dt);
    if (this.debugHitbox) this.drawHitboxes(); else if (this.hitboxes) { this.world.remove(this.hitboxes); this.hitboxes = null; }
    this.renderer.render(this.scene, this.camera);
    this.adapt(dt);
  }

  updateCamera(dt) {
    const g = this.game, p = g.p;
    const lookTarget = clamp(p.dir * 2.6 + p.vx * 0.25, -3.5, 5.5);
    let ty = p.y + 1.6;
    if (g.state === 'bubble') ty = Math.max(ty, g.safe.y + 1.6);
    ty = Math.max(ty, g.t.killY + 5);
    if (this.snapCamera) { this.cam.x = p.x; this.cam.y = ty; this.cam.look = lookTarget; this.snapCamera = false; }
    const k = 1 - Math.exp(-dt * 5);
    this.cam.look += (lookTarget - this.cam.look) * (1 - Math.exp(-dt * 2.2));
    this.cam.x += (p.x - this.cam.x) * Math.min(1, k * 2.2);
    // 上下はゆっくり（小さなジャンプでは揺らさない）
    const dy = ty - this.cam.y;
    const dead = p.grounded ? 0 : 1.2;
    if (Math.abs(dy) > dead) this.cam.y += (dy - Math.sign(dy) * dead) * (1 - Math.exp(-dt * (p.grounded ? 3 : 4)));
    const vh = 10.5; // 画面の縦に見える高さ（マス）
    const dist = vh / 2 / Math.tan((this.camera.fov * Math.PI) / 360);
    let sx = 0, sy = 0;
    if (this.shake > 0) { this.shake -= dt; sx = (Math.random() - 0.5) * 0.25; sy = (Math.random() - 0.5) * 0.25; }
    const cx = this.cam.x + this.cam.look;
    this.camera.position.set(cx + sx, this.cam.y + 2.2 + sy, dist);
    this.camera.lookAt(cx + sx, this.cam.y + sy, 0);
  }

  drawHitboxes() {
    if (this.hitboxes) this.world.remove(this.hitboxes);
    const g = this.game, grp = new T.Group(), mat = new T.LineBasicMaterial({ color: 0xff0000 });
    const circle = (x, y, r, color) => { const pts = []; for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI * 2; pts.push(new T.Vector3(x + Math.cos(a) * r, y + Math.sin(a) * r, 1)); } grp.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), color ? new T.LineBasicMaterial({ color }) : mat)); };
    circle(g.p.x, g.p.y + TUNE.radius, TUNE.radius, 0x0000ff);
    for (const e of g.enemies) if (e.state === 'walk') circle(e.x, e.y + 0.42, 0.38);
    this.hitboxes = grp; this.world.add(grp);
  }

  // 重いときは解像度を少し下げる
  adapt(dt) {
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 90) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    this.fps = 1 / avg;
    if (avg > 1 / 45 && this.pixelRatio > 1) { this.pixelRatio = Math.max(1, this.pixelRatio - 0.25); this.renderer.setPixelRatio(this.pixelRatio); this.resize(); }
  }
}
