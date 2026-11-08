// three.js による 3D表示（島・ぷにゅ・ともだち・ミッションの もの・パーティクル）
// 動きと当たり判定は core.mjs（2D）で計算し、ここは見た目だけを担う
import * as T from '../punyu-kirakira/vendor/three.module.min.js';
import { FRIENDS, HAT_SPOTS, SHELL_SPOTS, SHARD_SPOTS } from './data.mjs';

// 漢字ゲーム『ゆめかわ かんじの しま』と おなじ トゥーンの ざいりょう（3だんかいの かげで ゆめかわな ぬりえがたに なる）
let toonRamp = null;
function ramp() {
  if (!toonRamp) {
    const data = new Uint8Array([150, 150, 150, 255, 215, 215, 215, 255, 255, 255, 255, 255]);
    toonRamp = new T.DataTexture(data, 3, 1, T.RGBAFormat);
    toonRamp.minFilter = toonRamp.magFilter = T.NearestFilter;
    toonRamp.needsUpdate = true;
  }
  return toonRamp;
}
const mat = (color, opts = {}) => { const { roughness, ...rest } = opts; return new T.MeshToonMaterial({ color, gradientMap: ramp(), ...rest }); };
const basic = (color) => new T.MeshBasicMaterial({ color });
const sph = (r, color, opts) => new T.Mesh(new T.SphereGeometry(r, 24, 18), mat(color, opts));

// きまった じゅんばんの らんすう（かざりの はいちを まいかい おなじに）
const mulberry = (seed) => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// ふきだし（えもじを かいた スプライト）
function bubbleSprite(lines) {
  const c = document.createElement('canvas'); c.width = 192; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,0.95)';
  g.beginPath();
  if (g.roundRect) g.roundRect(16, 8, 160, 112, 36); else g.rect(16, 8, 160, 112);
  g.fill();
  g.beginPath(); g.moveTo(76, 116); g.lineTo(96, 148); g.lineTo(116, 116); g.closePath(); g.fill();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '64px serif';
  g.fillText(lines, 96, 66);
  const tex = new T.CanvasTexture(c);
  const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(2.4, 2.0, 1);
  return sp;
}

function starMesh() {
  const shape = new T.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 0.55 : 0.24, a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
  }
  shape.closePath();
  const geo = new T.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: false });
  return new T.Mesh(geo, mat(0xffd84a, { emissive: 0x6b4a00, emissiveIntensity: 0.35 }));
}

// かお（め と くち）。めと くちは ひかりに よらない くろ（漢字ゲーム方式）で、どの かくどでも よめる
function makeFace(eyeColor = 0x3a2a3a) {
  const grp = new T.Group();
  const fm = basic(eyeColor);
  const mk = (x) => { const e = new T.Mesh(new T.SphereGeometry(0.1, 12, 10), fm); e.scale.set(1, 1.2, 0.6); e.position.set(x, 0.12, 0.82); grp.add(e); return e; };
  const eyes = [mk(-0.3), mk(0.3)];
  const mouth = new T.Mesh(new T.TorusGeometry(0.13, 0.032, 8, 16, Math.PI), fm);
  mouth.position.set(0, -0.12, 0.84); mouth.rotation.z = Math.PI;
  grp.add(mouth);
  return { grp, eyes, mouth };
}
const setFace = (face, kind) => {
  const sy = kind === 'happy' || kind === 'sleep' ? 0.2 : 1;
  face.eyes.forEach((e) => e.scale.set(1, sy * 1.2, 0.6));
  face.mouth.scale.setScalar(kind === 'happy' ? 1.5 : kind === 'sad' ? 0.6 : 1);
};

function blobShadow(r) {
  const m = new T.Mesh(new T.CircleGeometry(r, 20), new T.MeshBasicMaterial({ color: 0x5a7a4a, transparent: true, opacity: 0.18, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.03;
  return m;
}

// ---- キャラづくり ----
function buildPunyu() {
  const g = new T.Group();
  const body = sph(0.85, 0xfff4f7); body.scale.set(1, 0.92, 0.95); body.position.y = 0.8; g.add(body);
  for (const sx of [-1, 1]) {
    const ear = sph(0.27, 0xfff4f7); ear.position.set(sx * 0.46, 1.52, 0); g.add(ear);
    const inner = sph(0.14, 0xff9fb8); inner.position.set(sx * 0.46, 1.5, 0.16); g.add(inner);
    const cheek = sph(0.13, 0xff9fb8); cheek.scale.set(1, 0.7, 0.4); cheek.position.set(sx * 0.56, 0.74, 0.66); g.add(cheek);
  }
  const tail = sph(0.2, 0xfff4f7); tail.position.set(0, 0.42, -0.78); g.add(tail);
  const face = makeFace(); face.grp.position.y = 0.79; g.add(face.grp);
  g.add(blobShadow(0.95));
  return { grp: g, face, body };
}

function buildFriend(f) {
  const g = new T.Group();
  let face = null, extra = {};
  if (f.id === 'kani') {
    const body = sph(1, 0xff7a59); body.scale.set(1.25, 0.78, 1); body.position.y = 0.72; g.add(body);
    for (const sx of [-1, 1]) {
      const claw = sph(0.42, 0xff8f6b); claw.position.set(sx * 1.35, 0.55, 0.55); g.add(claw);
      const stalk = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 0.5), mat(0xff7a59)); stalk.position.set(sx * 0.35, 1.45, 0.2); g.add(stalk);
      const eye = sph(0.14, 0x3a2a3a); eye.material = basic(0x3a2a3a); eye.position.set(sx * 0.35, 1.72, 0.2); g.add(eye);
    }
    // カニの めは くきの さきの 2つだけ（つうじょうの かおの めは かさなるので かくす）
    face = makeFace(); face.eyes.forEach((e) => { e.visible = false; }); face.grp.position.set(0, 0.95, 0.15); g.add(face.grp);
  } else if (f.id === 'chapu') {
    const body = sph(0.95, 0xa9744f); body.position.y = 0.85; g.add(body);
    const belly = sph(0.62, 0xf3ddba); belly.scale.set(1, 1, 0.55); belly.position.set(0, 0.66, 0.55); g.add(belly);
    for (const sx of [-1, 1]) { const ear = sph(0.2, 0x8a5a38); ear.position.set(sx * 0.52, 1.62, 0); g.add(ear); }
    const tail = sph(0.4, 0x8a5a38); tail.scale.set(1.3, 0.35, 0.8); tail.position.set(0, 0.22, -0.95); g.add(tail);
    face = makeFace(); face.grp.position.set(0, 0.78, 0.12); g.add(face.grp);
  } else if (f.id === 'kaze') {
    const b1 = sph(0.95, 0xbfe6f7); b1.position.y = 0.8; g.add(b1);
    const b2 = sph(0.62, 0xd8f2fc); b2.position.set(0.25, 1.65, 0); g.add(b2);
    const ring = new T.Mesh(new T.TorusGeometry(1.05, 0.09, 10, 28), mat(0x9fd8ef));
    ring.rotation.x = Math.PI / 2.4; ring.position.y = 0.85; g.add(ring); extra.ring = ring;
    face = makeFace(); face.grp.position.set(0, 0.72, 0.18); g.add(face.grp);
  } else if (f.id === 'jelly') {
    const dome = new T.Mesh(new T.SphereGeometry(1, 28, 20, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xffb7d5, { transparent: true, opacity: 0.9 }));
    dome.position.y = 0.15; g.add(dome);
    const base = sph(1, 0xffc9de); base.scale.set(1, 0.3, 1); base.position.y = 0.16; g.add(base);
    const cream = new T.Group();
    const c1 = sph(0.42, 0xffffff); c1.position.y = 0; cream.add(c1);
    const c2 = sph(0.28, 0xffffff); c2.position.y = 0.3; cream.add(c2);
    const c3 = sph(0.15, 0xffffff); c3.position.y = 0.52; cream.add(c3);
    const cherry = sph(0.11, 0xff4d6d); cherry.position.y = 0.68; cream.add(cherry);
    cream.position.y = 1.12; cream.scale.setScalar(0.001); g.add(cream); extra.cream = cream;
    face = makeFace(); face.grp.position.y = 0.55; face.grp.children.forEach((c) => { c.position.z += 0.18; }); g.add(face.grp);
  } else if (f.id === 'kumokumo') {
    for (const [x, y, z, r] of [[0, 0.75, 0, 0.95], [-0.8, 0.6, 0.1, 0.65], [0.8, 0.62, -0.05, 0.7], [0.1, 1.25, 0, 0.62], [-0.35, 1.05, 0.3, 0.5]]) {
      const p = sph(r, 0xffffff); p.position.set(x, y, z); g.add(p);
    }
    const cap = new T.Mesh(new T.ConeGeometry(0.42, 0.55, 16), mat(0x8fb8ff)); cap.position.set(0.15, 1.95, 0); cap.rotation.z = 0.35; g.add(cap);
    // くもは もこもこで かおが うもれやすいので、おおきく まえに だす
    face = makeFace(); face.grp.position.set(0, 0.78, 0.55); face.grp.scale.setScalar(1.25); g.add(face.grp);
  }
  g.add(blobShadow(1.15));
  return { grp: g, face, ...extra };
}

export class View {
  constructor(canvas) {
    this.renderer = new T.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    if (T.SRGBColorSpace) this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.scene = new T.Scene();
    // そら（漢字ゲームと おなじ ゆめかわ グラデーション：ピンク→ラベンダー→みずいろ→ミント）
    const skyC = document.createElement('canvas'); skyC.width = 2; skyC.height = 256;
    const sg = skyC.getContext('2d'); const grd = sg.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, '#ffc9e6'); grd.addColorStop(0.45, '#f1d3ff'); grd.addColorStop(0.8, '#d6ecff'); grd.addColorStop(1, '#e8fff6');
    sg.fillStyle = grd; sg.fillRect(0, 0, 2, 256);
    const skyTex = new T.CanvasTexture(skyC); if (T.SRGBColorSpace) skyTex.colorSpace = T.SRGBColorSpace;
    this.scene.background = skyTex;
    this.scene.fog = new T.Fog(0xf3e6ff, 55, 130);
    this.camera = new T.PerspectiveCamera(30, 1, 0.1, 300);
    this.scene.add(new T.HemisphereLight(0xffffff, 0xe4d4ff, 1.6));
    const sun = new T.DirectionalLight(0xffffff, 1.5); sun.position.set(-5, 12, 9); this.scene.add(sun);
    this.pickables = [];
    this.effects = [];
    this.fireworksOn = false;
    this.fwTimer = 0;
    this.camPos = new T.Vector3(0, 19, 45.5);
    this.buildIsland();
    this.punyu = buildPunyu(); this.scene.add(this.punyu.grp);
    this.friends = {};
    for (const f of FRIENDS) {
      const b = buildFriend(f);
      b.grp.position.set(f.pos.x, 0, f.pos.z);
      const bubble = bubbleSprite(f.id === 'kani' ? '❗✊' : '❗' + f.bubble);
      bubble.position.set(f.pos.x, 3.6, f.pos.z); bubble.visible = false; this.scene.add(bubble);
      const proxy = new T.Mesh(new T.SphereGeometry(1.9, 10, 8), new T.MeshBasicMaterial({ visible: false }));
      proxy.position.set(f.pos.x, 1, f.pos.z); proxy.userData.pick = { kind: 'friend', id: f.id };
      this.scene.add(proxy); this.pickables.push(proxy);
      this.friends[f.id] = { ...b, bubble, baseY: 0 };
      this.scene.add(b.grp);
    }
    this.buildMissionObjects();
    this.raycaster = new T.Raycaster();
  }

  buildIsland() {
    const S = this.scene;
    const side = new T.Mesh(new T.CylinderGeometry(27.5, 24, 3.4, 40), mat(0xa8e58f)); side.position.y = -1.75; S.add(side);
    const top = new T.Mesh(new T.CircleGeometry(27.5, 40), mat(0xbdf0a4)); top.rotation.x = -Math.PI / 2; top.position.y = 0; S.add(top);
    // うかぶ しまの うらがわ（漢字ゲーム風の ピーチ色の すい）
    const under = new T.Mesh(new T.ConeGeometry(25.5, 11, 28), mat(0xf2c9a8)); under.rotation.x = Math.PI; under.position.y = -8.9; S.add(under);
    const under2 = new T.Mesh(new T.ConeGeometry(15, 6.5, 20), mat(0xe8b896)); under2.rotation.x = Math.PI; under2.position.set(5, -13, 2); S.add(under2);
    const sand = new T.Mesh(new T.CircleGeometry(7, 24), mat(0xfff1c9)); sand.rotation.x = -Math.PI / 2; sand.position.set(16, 0.02, 12); S.add(sand);
    const pond = new T.Mesh(new T.CircleGeometry(5, 24), mat(0x8fd8ff, { emissive: 0x2c7fb8, emissiveIntensity: 0.25 })); pond.rotation.x = -Math.PI / 2; pond.position.set(-16, 0.02, 10); S.add(pond);
    // そらの くもは CSS で 画面に ながす（この カメラでは 3Dの くもが 画面の わくに はいらないため）
    // くもくもさんの たかだい（くも）。かおが かくれないよう、くもくもさんより おくに おく
    for (const [x, z, r] of [[0, -19, 3.4], [-2.4, -18.4, 2.2], [2.4, -19.4, 2.4]]) {
      const c = sph(r, 0xffffff); c.scale.y = 0.38; c.position.set(x, 0.25, z); S.add(c);
    }
    // こみち
    const rnd = mulberry(42);
    for (const [x, z] of [[0, 8], [4, 3], [9, 6], [13, 9], [-6, 4], [-11, 7], [-5, -4], [-10, -7], [5, -6], [9, -10], [0, -12]]) {
      const p = new T.Mesh(new T.CircleGeometry(1.6, 14), mat(0xf3e2b8)); p.rotation.x = -Math.PI / 2; p.position.set(x, 0.015, z); S.add(p);
    }
    // き
    const treeAt = (x, z, s = 1) => {
      const g = new T.Group();
      const trunk = new T.Mesh(new T.CylinderGeometry(0.32 * s, 0.42 * s, 1.6 * s, 8), mat(0xc8915e)); trunk.position.y = 0.8 * s; g.add(trunk);
      for (const [dx, dy, dz, r] of [[0, 2.4, 0, 1.5], [-0.9, 1.9, 0.2, 1.0], [0.9, 2.0, -0.2, 1.1]]) {
        const leaf = sph(r * s, 0x8fdc6e); leaf.position.set(dx * s, dy * s, dz * s); g.add(leaf);
      }
      g.position.set(x, 0, z); S.add(g);
    };
    treeAt(-7, -3); treeAt(7, 12, 1.2); treeAt(-21, -9, 0.9); treeAt(21, -13); treeAt(-3, 21, 1.1); treeAt(15, 19, 0.85); treeAt(-22, 16);
    // はな と くさ
    const flowerColors = [0xff8fb5, 0xffe066, 0xffffff, 0xb79cff, 0xff6f91, 0x8fd8ff];
    for (let i = 0; i < 52; i++) {
      const a = rnd() * Math.PI * 2, r = 4 + rnd() * 21, x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.hypot(x - 16, z - 12) < 6.4 || Math.hypot(x + 16, z - 10) < 4.6) continue;
      const stem = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 0.5, 5), mat(0x6fbf5f)); stem.position.set(x, 0.25, z); S.add(stem);
      const head = sph(0.17, flowerColors[i % flowerColors.length]); head.position.set(x, 0.55, z); S.add(head);
    }
    for (let i = 0; i < 36; i++) {
      const a = rnd() * Math.PI * 2, r = 3 + rnd() * 22, x = Math.cos(a) * r, z = Math.sin(a) * r;
      const tuft = new T.Mesh(new T.ConeGeometry(0.32, 0.7, 6), mat(0x7fcf6a)); tuft.position.set(x, 0.3, z); S.add(tuft);
    }
    for (const [x, z, r] of [[-12, 16, 0.9], [22, 6, 1.2], [-19, -14, 1.0]]) {
      const rock = new T.Mesh(new T.DodecahedronGeometry(r), mat(0xc9c2d6)); rock.position.set(x, r * 0.5, z); S.add(rock);
    }
  }

  buildMissionObjects() {
    const S = this.scene;
    // ぼうし
    const hat = new T.Group();
    const brim = new T.Mesh(new T.CylinderGeometry(0.62, 0.62, 0.09, 20), mat(0xf2d38a)); hat.add(brim);
    const topH = new T.Mesh(new T.SphereGeometry(0.42, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xf2d38a)); topH.position.y = 0.03; hat.add(topH);
    const band = new T.Mesh(new T.TorusGeometry(0.43, 0.06, 8, 20), mat(0xff6b81)); band.rotation.x = Math.PI / 2; band.position.y = 0.06; hat.add(band);
    hat.visible = false; hat.userData.pick = { kind: 'hat' };
    S.add(hat); this.hatGrp = hat; this.pickables.push(hat);
    // ほし
    this.starGrps = [];
    for (let i = 0; i < 5; i++) { const st = starMesh(); st.visible = false; st.userData.pick = { kind: 'star', index: i }; S.add(st); this.starGrps.push(st); this.pickables.push(st); }
    // かいがら
    this.shellGrps = SHELL_SPOTS.map((p, i) => {
      const g = new T.Group();
      const sh = sph(0.42, 0xffd1e8); sh.scale.set(1, 0.55, 1); g.add(sh);
      const sh2 = sph(0.3, 0xfff0f7); sh2.scale.set(1, 0.5, 1); sh2.position.set(0, 0.14, 0.1); g.add(sh2);
      g.position.set(p.x, 0.25, p.z); g.visible = false; g.userData.pick = { kind: 'shell', index: i };
      g.traverse((o) => { o.userData.pick = { kind: 'shell', index: i }; });
      S.add(g); this.pickables.push(g); return g;
    });
    // かけら
    this.shardGrps = SHARD_SPOTS.map((p, i) => {
      const m = new T.Mesh(new T.OctahedronGeometry(0.3), mat(0xffd84a, { emissive: 0x6b4a00, emissiveIntensity: 0.35 }));
      m.position.set(p.x, 0.8, p.z); m.userData.pick = { kind: 'shard', index: i };
      S.add(m); this.pickables.push(m); return m;
    });
    // ハートの スプライト よう テクスチャ
    const c = document.createElement('canvas'); c.width = c.height = 96;
    const g2 = c.getContext('2d'); g2.font = '76px serif'; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText('💗', 48, 52);
    this.heartTex = new T.CanvasTexture(c);
    const c2 = document.createElement('canvas'); c2.width = c2.height = 64;
    const g3 = c2.getContext('2d'); g3.font = '52px serif'; g3.textAlign = 'center'; g3.textBaseline = 'middle'; g3.fillText('✦', 32, 36);
    this.starTex = new T.CanvasTexture(c2);
  }

  spawnParticles(tex, x, y, z, n, colors, spread = 2.4, up = 3.2) {
    for (let i = 0; i < n; i++) {
      const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, color: colors[i % colors.length], depthWrite: false }));
      sp.position.set(x, y, z);
      sp.scale.setScalar(0.55 + Math.random() * 0.5);
      this.scene.add(sp);
      this.effects.push({ sp, vx: (Math.random() - 0.5) * spread, vy: up * (0.6 + Math.random() * 0.7), vz: (Math.random() - 0.5) * spread, life: 1.1 + Math.random() * 0.5, t: 0, grav: -2.2 });
    }
  }
  burstHearts(x, z) { this.spawnParticles(this.heartTex, x, 2, z, 9, [0xffffff]); }
  burstStars(x, z) { this.spawnParticles(this.starTex, x, 1.2, z, 8, [0xffe066, 0xffffff, 0xffb7d5]); }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  // 状態を 見た目に はんえい
  sync(s, t) {
    // ぷにゅ
    const moving = s.dir.x !== 0 || s.dir.z !== 0;
    const bounce = moving ? Math.abs(Math.sin(t * 11)) * 0.16 : Math.sin(t * 2.2) * 0.03;
    this.punyu.grp.position.set(s.player.x, bounce, s.player.z);
    this.punyu.grp.rotation.y = s.facing;
    this.punyu.body.scale.set(1 + bounce * 0.35, 0.92 - bounce * 0.3, 0.95);
    setFace(this.punyu.face, s.mission ? 'normal' : 'happy');
    // ともだち
    for (const f of FRIENDS) {
      const b = this.friends[f.id], st = s.friends[f.id].state;
      const happy = st === 'happy', away = st === 'away';
      b.grp.position.y = happy ? Math.abs(Math.sin(t * 3 + f.pos.x)) * 0.08 : 0;
      b.grp.scale.setScalar(f.id === 'kani' && s.mission?.type === 'janken' ? s.mission.crab : 1);
      b.bubble.visible = st === 'sad';
      if (b.face) setFace(b.face, happy ? 'happy' : away ? 'sleep' : 'sad');
      if (b.ring) b.ring.rotation.z = t * 0.8;
      if (b.cream) {
        const target = happy ? 1 : s.mission?.type === 'cream' ? Math.max(0.001, s.mission.taps / 5) : 0.001;
        b.cream.scale.setScalar(target);
      }
      b.grp.rotation.z = away ? 0.06 : 0;
    }
    // ミッションの もの
    const m = s.mission;
    this.hatGrp.visible = !!m && m.type === 'hat';
    if (this.hatGrp.visible) { const p = HAT_SPOTS[m.hat]; this.hatGrp.position.set(p.x, 1.3 + Math.sin(t * 2.4) * 0.25, p.z); this.hatGrp.rotation.y = t * 1.4; }
    this.starGrps.forEach((st, i) => {
      const on = !!m && m.type === 'stars' && !m.got.includes(i);
      st.visible = on;
      if (on) { st.position.set(m.spots[i].x, 0.7 + Math.sin(t * 3 + i) * 0.12, m.spots[i].z); st.rotation.y = t * 1.6; }
    });
    this.shellGrps.forEach((g, i) => {
      const on = !!m && m.type === 'shells' && !m.got.includes(i);
      g.visible = on;
      if (on) g.scale.setScalar(1 + Math.sin(t * 4 + i * 2) * 0.12);
    });
    this.shardGrps.forEach((g, i) => {
      g.visible = !s.shards.includes(i);
      g.rotation.y = t * 2 + i;
      g.position.y = 0.8 + Math.sin(t * 2.6 + i * 1.3) * 0.12;
    });
    // カメラ（正面少し斜め上から。遠くから狭い画角で撮り、パースを弱めて平行投影に近づける）
    const target = new T.Vector3(s.player.x, 19, s.player.z + 30.5);
    this.camPos.lerp(target, 0.06);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(s.player.x, 0.9, s.player.z - 2.5);
  }

  update(dt) {
    // パーティクル
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i]; e.t += dt;
      e.vy += e.grav * dt;
      e.sp.position.x += e.vx * dt; e.sp.position.y += e.vy * dt; e.sp.position.z += e.vz * dt;
      e.sp.material.opacity = Math.max(0, 1 - e.t / e.life);
      if (e.t >= e.life) { this.scene.remove(e.sp); e.sp.material.dispose(); this.effects.splice(i, 1); }
    }
    // はなび
    if (this.fireworksOn) {
      this.fwTimer -= dt;
      if (this.fwTimer <= 0) {
        this.fwTimer = 0.65;
        const x = (Math.random() - 0.5) * 34, z = -6 - Math.random() * 14, y = 11 + Math.random() * 4;
        this.spawnParticles(this.starTex, x, y, z, 22, [0xff6b81, 0xffd84a, 0x7fd0ff, 0xb8f28a, 0xffb7d5], 5.5, 0.6);
        for (const e of this.effects.slice(-22)) e.grav = -1.2;
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  // タップした ばしょに ある ものを かえす
  pick(nx, ny) {
    this.raycaster.setFromCamera({ x: nx, y: ny }, this.camera);
    const hits = this.raycaster.intersectObjects(this.pickables.filter((o) => o.visible !== false), true);
    for (const h of hits) {
      let o = h.object;
      while (o) { if (o.userData.pick) return o.userData.pick; o = o.parent; }
    }
    return null;
  }
}
