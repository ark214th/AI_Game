// three.js による 3D表示（しま・はし・うみ・ぷにゅ・ともだち・ちょうちょ・もや・パーティクル）
// 動きと当たり判定は core.mjs（2D）で計算し、ここは見た目だけを担う
import * as T from '../punyu-kirakira/vendor/three.module.min.js';
import {
  ISLANDS, BRIDGES, FOGS, TREES, ROCKS, POND, SEA, FRIENDS, SHELLS, shellPos, SHARDS, FOLLOW_GAP,
} from './data.mjs';
import { waveR, shellShown } from './core.mjs';
import { handCanvas } from './hands.mjs';

// 漢字ゲーム『ゆめかわ かんじの しま』と おなじ トゥーンの ざいりょう（3だんかいの かげ）
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
const mat = (color, opts = {}) => new T.MeshToonMaterial({ color, gradientMap: ramp(), ...opts });
const basic = (color, opts = {}) => new T.MeshBasicMaterial({ color, ...opts });
const sph = (r, color, opts) => new T.Mesh(new T.SphereGeometry(r, 24, 18), mat(color, opts));
const flat = (geo, m, x, y, z) => { const o = new T.Mesh(geo, m); o.rotation.x = -Math.PI / 2; o.position.set(x, y, z); return o; };
const ease = (cur, target, dt, k = 6) => cur + (target - cur) * (1 - Math.exp(-dt * k));

// きまった じゅんばんの らんすう（かざりの はいちを まいかい おなじに）
const mulberry = (seed) => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

function canvasSprite(w, h, draw, sx, sy) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'));
  const tex = new T.CanvasTexture(c); if (T.SRGBColorSpace) tex.colorSpace = T.SRGBColorSpace;
  const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(sx, sy, 1);
  return sp;
}
function emojiTexture(ch, size = 96) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.font = `${size * 0.78}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, size / 2, size * 0.55);
  return new T.CanvasTexture(c);
}
// ふきだし（えもじを かいた スプライト）
function bubbleSprite(text) {
  return canvasSprite(192, 160, (g) => {
    g.fillStyle = 'rgba(255,255,255,0.96)';
    g.beginPath(); if (g.roundRect) g.roundRect(16, 8, 160, 112, 36); else g.rect(16, 8, 160, 112); g.fill();
    g.beginPath(); g.moveTo(76, 116); g.lineTo(96, 148); g.lineTo(116, 116); g.closePath(); g.fill();
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '60px serif'; g.fillText(text, 96, 66);
  }, 2.9, 2.4);
}

// ---- かお ----
// め・くち・なみだは ひかりに よらない いろで、どの かくどでも よめる
// こまった：への字ぐち＋なみだ ／ ふつう：にっこり ／ えがお：めが アーチ＋おおきな くち
function makeFace({ ex = 0.3, ey = 0.12, ez = 0.82, my = -0.12, mz = 0.84, es = 1, noEyes = false, tearAt = null } = {}) {
  const grp = new T.Group();
  const ink = basic(0x3a2a3a), white = basic(0xffffff);
  const eyes = [], arcs = [], tears = [];
  for (const sx of [-1, 1]) {
    const e = new T.Group(); e.position.set(sx * ex, ey, ez);
    const ball = new T.Mesh(new T.SphereGeometry(0.12 * es, 14, 12), ink); ball.scale.set(1, 1.3, 0.6); e.add(ball);
    const shine = new T.Mesh(new T.SphereGeometry(0.045 * es, 8, 6), white); shine.position.set(0.04 * es, 0.07 * es, 0.07 * es); e.add(shine);
    grp.add(e); eyes.push(e);
    const a = new T.Mesh(new T.TorusGeometry(0.12 * es, 0.036 * es, 6, 14, Math.PI), ink); a.position.set(sx * ex, ey - 0.03, ez + 0.03); grp.add(a); arcs.push(a);
    const tp = tearAt ? tearAt[sx < 0 ? 0 : 1] : [sx * ex, ey - 0.17, ez + 0.06];
    const tr = new T.Mesh(new T.SphereGeometry(0.08, 10, 8), basic(0x6fc6ff)); tr.position.set(...tp); tr.userData.base = tp; grp.add(tr); tears.push(tr);
  }
  const mouth = new T.Mesh(new T.TorusGeometry(0.13, 0.036, 8, 16, Math.PI), ink);
  mouth.position.set(0, my, mz); grp.add(mouth);
  // えがおの ときの あいた くち
  const open = new T.Mesh(new T.SphereGeometry(0.15, 14, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), basic(0xff7a9c));
  open.scale.set(1, 1.05, 0.45); open.position.set(0, my + 0.04, mz - 0.02); grp.add(open);
  return { grp, eyes, arcs, tears, mouth, open, my, noEyes };
}
function setFace(face, kind, t = 0) {
  const happy = kind === 'happy', sad = kind === 'sad';
  const blink = kind === 'normal' && (t % 3.4) < 0.12;
  face.eyes.forEach((e) => { e.visible = !face.noEyes && !happy; e.scale.set(1, blink ? 0.12 : 1, 1); });
  face.arcs.forEach((a) => { a.visible = !face.noEyes && happy; });
  face.mouth.visible = !happy;
  face.open.visible = happy;
  face.mouth.rotation.z = sad ? 0 : Math.PI;
  face.mouth.position.y = face.my + (sad ? -0.13 : 0);
  face.mouth.scale.setScalar(sad ? 0.85 : 1);
  face.tears.forEach((tr, i) => {
    tr.visible = sad;
    if (!sad) return;
    const k = (t * 0.8 + i * 0.5) % 1;
    tr.position.y = tr.userData.base[1] - k * 0.45;
    tr.scale.set(0.8 * (1 - k * 0.5), 1.35 * (1 - k * 0.5), 0.6);
  });
}

function blobShadow(r) {
  return flat(new T.CircleGeometry(r, 20), basic(0x5a6a7a, { transparent: true, opacity: 0.16, depthWrite: false }), 0, 0.04, 0);
}
const ball = (parent, color, pos, scale, rotZ = 0, useBasic = false) => {
  const m = new T.Mesh(new T.SphereGeometry(1, 22, 16), useBasic ? basic(color) : mat(color));
  m.position.set(...pos); m.scale.set(...scale); m.rotation.z = rotZ; parent.add(m); return m;
};

// ---- キャラづくり ----
// からだは head グループに まとめ、すこし うしろへ かたむける（うえからの カメラに かおが むく）
// grp（ばしょ・むき）＞ inner（はねる・つぶれる）＞ head（かたむき）
function buildPunyu() {
  const g = new T.Group(), inner = new T.Group(), head = new T.Group(); g.add(inner); inner.add(head);
  head.position.y = 0.88; head.rotation.x = -0.3;
  const skin = 0xfff4f7, pink = 0xff9fb8;
  // 『きらきらランド』『かんじの しま』の ぷにゅと おなじ つくり（まるい からだ・ちいさな みみ・ほっぺ・ピンクの あし）
  ball(head, skin, [0, 0, 0], [0.9, 0.86, 0.86]);
  for (const sx of [-1, 1]) {
    ball(head, skin, [sx * 0.43, 0.73, -0.08], [0.24, 0.34, 0.2], -sx * 0.4);
    ball(head, pink, [sx * 0.43, 0.75, 0.1], [0.12, 0.19, 0.09], -sx * 0.4);
    ball(head, pink, [sx * 0.5, -0.1, 0.68], [0.16, 0.1, 0.07]);
    ball(inner, 0xffd6e2, [sx * 0.32, 0.12, 0.12], [0.22, 0.13, 0.26]);
  }
  ball(head, skin, [0, -0.2, -0.82], [0.18, 0.18, 0.18]);
  const face = makeFace({ ex: 0.27, ey: 0.1, ez: 0.8, my: -0.1, mz: 0.84, es: 1.05 }); head.add(face.grp);
  g.add(blobShadow(0.95));
  return { grp: g, inner, head, face };
}

function buildFriend(id) {
  const g = new T.Group(), inner = new T.Group(), head = new T.Group(); g.add(inner); inner.add(head);
  let face = null; const extra = {};
  if (id === 'kani') {
    head.position.y = 0.78; head.rotation.x = -0.18;
    const red = 0xff7a5c, dark = 0xff5c45;
    ball(head, red, [0, 0, 0], [1.3, 0.82, 0.98]);
    ball(head, 0xffb49c, [0, -0.2, 0.55], [0.8, 0.42, 0.5]);
    extra.claws = [];
    for (const sx of [-1, 1]) {
      // うで＋はさみ（うえの おおきい は と、したの ちいさい は）
      const claw = new T.Group();
      const arm = new T.Mesh(new T.CylinderGeometry(0.13, 0.13, 0.6, 8), mat(dark)); arm.position.y = 0.3; claw.add(arm);
      ball(claw, dark, [0, 0.85, 0], [0.42, 0.48, 0.34]);
      ball(claw, dark, [-sx * 0.26, 1.2, 0], [0.16, 0.3, 0.18], sx * 0.35);
      ball(claw, dark, [sx * 0.14, 1.3, 0], [0.2, 0.36, 0.2], -sx * 0.15);
      claw.position.set(sx * 1.18, 0.05, 0.3); claw.rotation.z = -sx * 0.55; claw.userData.sx = sx;
      head.add(claw); extra.claws.push(claw);
      const stalk = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 0.5, 8), mat(red)); stalk.position.set(sx * 0.36, 0.86, 0.3); head.add(stalk);
      ball(head, 0x3a2a3a, [sx * 0.36, 1.16, 0.3], [0.19, 0.21, 0.19], 0, true);
      ball(head, 0xffffff, [sx * 0.36 + 0.06, 1.24, 0.45], [0.07, 0.07, 0.05], 0, true);
      ball(head, 0xff9fb8, [sx * 0.72, 0.02, 0.78], [0.17, 0.1, 0.07]);
      for (const lz of [-0.3, 0.05, 0.4]) ball(inner, dark, [sx * (1.15 + Math.abs(lz) * 0.15), 0.16, lz], [0.28, 0.1, 0.1], -sx * 0.5);
    }
    // カニの めは くきの さきの 2つ。かおは くち と なみだ だけ
    face = makeFace({ noEyes: true, my: 0.05, mz: 0.97, tearAt: [[-0.36, 0.86, 0.44], [0.36, 0.86, 0.44]] });
    head.add(face.grp);
  } else if (id === 'chapu') {
    // 『ふしぎな ペットホテル』の ちゃぷ（うみの ラッコ）：ちゃいろの からだ・クリームいろの かお・ひげ・おなかの かいがら
    head.position.y = 0.95; head.rotation.x = -0.26;
    const brown = 0xa87658, dark = 0x7d5540, cream = 0xf6e6d2;
    ball(head, brown, [0, 0, 0], [0.98, 0.94, 0.92]);
    ball(head, cream, [0, 0.08, 0.5], [0.76, 0.62, 0.5]);
    ball(head, cream, [0, -0.5, 0.52], [0.5, 0.36, 0.4]);
    for (const sx of [-1, 1]) {
      ball(head, brown, [sx * 0.74, 0.62, -0.05], [0.2, 0.2, 0.14]);
      ball(head, dark, [sx * 0.74, 0.62, 0.05], [0.1, 0.1, 0.06]);
      ball(head, 0xffa9be, [sx * 0.5, -0.04, 0.84], [0.14, 0.085, 0.06]);
      for (const dy of [-0.07, 0.03]) {
        const w = new T.Mesh(new T.CylinderGeometry(0.014, 0.014, 0.42, 4), basic(0x8a6a58));
        w.position.set(sx * 0.5, 0.0 + dy, 0.9); w.rotation.z = Math.PI / 2 + sx * dy * 3; head.add(w);
      }
      ball(inner, dark, [sx * 0.36, 0.1, 0.2], [0.26, 0.12, 0.3]);
    }
    ball(head, 0x3a2a3a, [0, 0.03, 0.99], [0.1, 0.07, 0.05], 0, true);
    ball(inner, dark, [0.35, 0.16, -0.95], [0.3, 0.13, 0.6]).rotation.y = 0.4;
    // おなかの かいがら（みつかって えがおに なると もっている）
    const shell = new T.Group();
    ball(shell, 0xffb3c8, [0, 0, 0], [0.26, 0.24, 0.1]);
    for (const k of [-1, 0, 1]) { const l = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.38, 4), basic(0xff7fa3)); l.position.set(k * 0.09, 0.02, 0.1); l.rotation.z = -k * 0.3; shell.add(l); }
    for (const sx of [-1, 1]) ball(shell, brown, [sx * 0.27, -0.02, 0.02], [0.13, 0.11, 0.1]);
    shell.position.set(0, -0.52, 0.86); shell.rotation.x = -0.25; head.add(shell); extra.shell = shell;
    face = makeFace({ ex: 0.3, ey: 0.24, ez: 0.9, my: -0.12, mz: 0.97, es: 1.05 }); head.add(face.grp);
  }
  g.add(blobShadow(1.15));
  return { grp: g, inner, head, face, ...extra };
}

function buildTree(t) {
  const g = new T.Group(), s = t.s;
  const leafMat = mat(t.palm ? 0x7fd69a : 0x8fdc6e, { transparent: true });
  const trunkMat = mat(0xc8915e, { transparent: true });
  if (t.palm) {
    const trunk = new T.Mesh(new T.CylinderGeometry(0.22 * s, 0.34 * s, 3.4 * s, 8), trunkMat); trunk.position.set(0.15 * s, 1.7 * s, 0); trunk.rotation.z = -0.1; g.add(trunk);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const leaf = new T.Mesh(new T.SphereGeometry(1, 12, 8), leafMat); leaf.scale.set(1.5 * s, 0.16 * s, 0.5 * s);
      leaf.position.set(0.3 * s + Math.cos(a) * 1.1 * s, 3.35 * s, Math.sin(a) * 1.1 * s); leaf.rotation.y = -a; leaf.rotation.z = -0.35; g.add(leaf);
    }
    const nut = new T.Mesh(new T.SphereGeometry(0.24 * s, 10, 8), trunkMat); nut.position.set(0.3 * s, 3.15 * s, 0.25 * s); g.add(nut);
  } else {
    const trunk = new T.Mesh(new T.CylinderGeometry(0.32 * s, 0.42 * s, 1.6 * s, 8), trunkMat); trunk.position.y = 0.8 * s; g.add(trunk);
    for (const [dx, dy, dz, r] of [[0, 2.4, 0, 1.5], [-0.9, 1.9, 0.2, 1.0], [0.9, 2.0, -0.2, 1.1]]) {
      const leaf = new T.Mesh(new T.SphereGeometry(r * s, 20, 14), leafMat); leaf.position.set(dx * s, dy * s, dz * s); g.add(leaf);
    }
  }
  g.position.set(t.x, 0, t.z);
  return { grp: g, mats: [leafMat, trunkMat], x: t.x, z: t.z, s, fade: 1 };
}

// カメラ：すこし ひくめから みて、キャラの かおが みえる ように（まえは y:19 で みおろし すぎた）
const CAM = { y: 14.5, z: 31.5, look: -1 };

export class View {
  constructor(canvas) {
    this.renderer = new T.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    if (T.SRGBColorSpace) this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.scene = new T.Scene();
    // そら（ピンク→ラベンダー→みずいろ→ミントの ゆめかわ グラデーション）
    const skyC = document.createElement('canvas'); skyC.width = 2; skyC.height = 256;
    const sg = skyC.getContext('2d'); const grd = sg.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, '#ffc9e6'); grd.addColorStop(0.45, '#f1d3ff'); grd.addColorStop(0.8, '#d6ecff'); grd.addColorStop(1, '#e8fff6');
    sg.fillStyle = grd; sg.fillRect(0, 0, 2, 256);
    const skyTex = new T.CanvasTexture(skyC); if (T.SRGBColorSpace) skyTex.colorSpace = T.SRGBColorSpace;
    this.scene.background = skyTex;
    this.scene.fog = new T.Fog(0xf3e6ff, 70, 170);
    this.camera = new T.PerspectiveCamera(30, 1, 0.1, 400);
    this.scene.add(new T.HemisphereLight(0xffffff, 0xe4d4ff, 1.6));
    const sun = new T.DirectionalLight(0xffffff, 1.5); sun.position.set(-5, 12, 9); this.scene.add(sun);
    this.pickables = [];
    this.effects = [];
    this.fireworksOn = false; this.fwTimer = 0; this.fwAt = { x: 0, z: 0 };
    this.focus = null; this.zoom = 1;
    this.blooms = {};
    this.trees = [];
    this.buildWorld();
    this.punyu = buildPunyu(); this.scene.add(this.punyu.grp);
    this.friends = {};
    for (const f of FRIENDS) {
      const b = buildFriend(f.id);
      b.grp.position.set(f.home.x, 0, f.home.z);
      const bubble = bubbleSprite('❗' + f.bubble); bubble.visible = false; this.scene.add(bubble);
      const proxy = new T.Mesh(new T.SphereGeometry(2.1, 10, 8), basic(0xffffff, { visible: false }));
      proxy.userData.pick = { kind: 'friend', id: f.id }; this.scene.add(proxy); this.pickables.push(proxy);
      this.friends[f.id] = { ...b, bubble, proxy, pos: { x: f.home.x, z: f.home.z }, rot: 0, joy: 0, moving: 0, placed: false };
      this.scene.add(b.grp);
    }
    this.buildThings();
    this.raycaster = new T.Raycaster();
    // じゃんけんの て（キャラの あたまの うえに ぽんと でる）
    this.handTex = {}; this.handSp = {};
    for (const who of ['kani', 'punyu']) {
      this.handTex[who] = {};
      for (const k of ['gu', 'choki', 'pa']) { const tx = new T.CanvasTexture(handCanvas(k, who, 256)); if (T.SRGBColorSpace) tx.colorSpace = T.SRGBColorSpace; this.handTex[who][k] = tx; }
      const sp = new T.Sprite(new T.SpriteMaterial({ map: this.handTex[who].gu, transparent: true, depthTest: false })); sp.renderOrder = 10; sp.scale.setScalar(0.001); sp.visible = false;
      this.scene.add(sp); this.handSp[who] = { sp, k: 0 };
    }
    this.idle = 0; this.pJoy = 0; this.beatT = 0;
  }

  // ---- しま・はし・うみ ----
  buildWorld() {
    const S = this.scene, rnd = mulberry(42);
    const island = (i, sideC, topC, underC) => {
      const side = new T.Mesh(new T.CylinderGeometry(i.r, i.r * 0.88, 3.4, 48), mat(sideC)); side.position.set(i.x, -1.75, i.z); S.add(side);
      S.add(flat(new T.CircleGeometry(i.r, 48), mat(topC), i.x, 0, i.z));
      const under = new T.Mesh(new T.ConeGeometry(i.r * 0.92, i.r * 0.42, 28), mat(underC)); under.rotation.x = Math.PI; under.position.set(i.x, -3.4 - i.r * 0.21, i.z); S.add(under);
    };
    const [nohara, umibe, okashi] = ISLANDS;
    island(nohara, 0xa8e58f, 0xbdf0a4, 0xf2c9a8);
    island(umibe, 0xf5dfa8, 0xfff1c9, 0xf2c9a8);

    // のはら：いけ・こみち
    S.add(flat(new T.CircleGeometry(POND.r, 28), mat(0x8fd8ff, { emissive: 0x2c7fb8, emissiveIntensity: 0.25 }), POND.x, 0.03, POND.z));
    S.add(flat(new T.RingGeometry(POND.r, POND.r + 0.5, 28), mat(0xfff1c9), POND.x, 0.025, POND.z));
    for (const [x, z] of [[0, 5], [4, 2], [9, 1], [14, 0], [18, 0], [-3, 0], [0, -6], [0, -11], [0, -16]]) S.add(flat(new T.CircleGeometry(1.7, 14), mat(0xf3e2b8), x, 0.015, z));

    // うみべ：うみの うつわ（しまから はみでる ぶん）・ぬれた すな・なみ・ふかい ところ
    const maxR = SEA.mid + SEA.amp;
    const basin = new T.Mesh(new T.CylinderGeometry(maxR + 1.2, maxR * 0.9, 3.4, 48), mat(0xf5dfa8)); basin.position.set(SEA.x, -1.76, SEA.z); S.add(basin);
    const bUnder = new T.Mesh(new T.ConeGeometry(maxR * 0.9, 7, 24), mat(0xe8b896)); bUnder.rotation.x = Math.PI; bUnder.position.set(SEA.x, -6.9, SEA.z); S.add(bUnder);
    S.add(flat(new T.CircleGeometry(maxR + 1.2, 48), mat(0xfff1c9), SEA.x, -0.01, SEA.z));
    S.add(flat(new T.CircleGeometry(maxR + 0.25, 48), mat(0xf0dcae), SEA.x, 0.02, SEA.z));
    this.wave = flat(new T.CircleGeometry(1, 64), mat(0x9fe6f2, { transparent: true, opacity: 0.8, emissive: 0x3aa6c8, emissiveIntensity: 0.2 }), SEA.x, 0.05, SEA.z); S.add(this.wave);
    this.foam = flat(new T.RingGeometry(0.955, 1, 64), basic(0xffffff, { transparent: true, opacity: 0.9 }), SEA.x, 0.06, SEA.z); S.add(this.foam);
    S.add(flat(new T.CircleGeometry(SEA.deep - 0.4, 48), mat(0x62c4ea, { emissive: 0x1f7fb0, emissiveIntensity: 0.25 }), SEA.x, 0.07, SEA.z));

    // おかしの もり（じゅんびちゅう。もやが はれると みえる）
    const ok = new T.Group(); this.okashi = ok; S.add(ok);
    const okSide = new T.Mesh(new T.CylinderGeometry(okashi.r, okashi.r * 0.88, 3.4, 40), mat(0xffb7d5)); okSide.position.set(okashi.x, -1.75, okashi.z); ok.add(okSide);
    ok.add(flat(new T.CircleGeometry(okashi.r, 40), mat(0xffe3f1), okashi.x, 0, okashi.z));
    const okUnder = new T.Mesh(new T.ConeGeometry(okashi.r * 0.92, okashi.r * 0.42, 24), mat(0xc98f6a)); okUnder.rotation.x = Math.PI; okUnder.position.set(okashi.x, -3.4 - okashi.r * 0.21, okashi.z); ok.add(okUnder);
    const cake = new T.Mesh(new T.CylinderGeometry(5, 5, 3.2, 28), mat(0xfff6e6)); cake.position.set(okashi.x, 1.6, okashi.z - 3); ok.add(cake);
    const cake2 = new T.Mesh(new T.CylinderGeometry(3.3, 3.3, 2.4, 24), mat(0xffc9de)); cake2.position.set(okashi.x, 4.4, okashi.z - 3); ok.add(cake2);
    const berry = sph(1, 0xff5d7e); berry.position.set(okashi.x, 6.4, okashi.z - 3); ok.add(berry);
    for (const [dx, dz, c] of [[-10, 3, 0xff8fb5], [9, 5, 0xb79cff], [-6, 9, 0x8fd8ff], [11, -6, 0xffe066], [-12, -6, 0xb8f28a]]) {
      const stick = new T.Mesh(new T.CylinderGeometry(0.16, 0.16, 3, 6), mat(0xffffff)); stick.position.set(okashi.x + dx, 1.5, okashi.z + dz); ok.add(stick);
      const candy = sph(1.3, c); candy.position.set(okashi.x + dx, 3.6, okashi.z + dz); ok.add(candy);
    }

    // はし（にじいろの いた）
    const plankColors = [0xff9fc0, 0xffd08a, 0xfff2a0, 0xb8f0b0, 0xa8dcff, 0xcdb4ff];
    this.bridges = BRIDGES.map((b) => {
      const g = new T.Group();
      const dx = b.b.x - b.a.x, dz = b.b.z - b.a.z, len = Math.hypot(dx, dz), n = Math.round(len / 1.15);
      for (let i = 0; i <= n; i++) {
        const k = i / n;
        const p = new T.Mesh(new T.BoxGeometry(b.hw * 2, 0.22, 0.92), mat(plankColors[i % plankColors.length]));
        p.position.set(0, -0.06 + Math.sin(k * Math.PI) * 0.12, k * len); g.add(p);
        if (i % 3 === 0) for (const sx of [-1, 1]) { const post = sph(0.24, 0xffffff); post.position.set(sx * (b.hw - 0.1), 0.3 + Math.sin(k * Math.PI) * 0.12, k * len); g.add(post); }
      }
      g.position.set(b.a.x, 0, b.a.z); g.rotation.y = Math.atan2(dx, dz);
      S.add(g);
      return g;
    });

    // き・いわ
    for (const t of TREES) { const tr = buildTree(t); S.add(tr.grp); this.trees.push(tr); }
    for (const r of ROCKS) { const rock = new T.Mesh(new T.DodecahedronGeometry(r.r), mat(0xc9c2d6)); rock.position.set(r.x, r.r * 0.5, r.z); rock.rotation.y = r.x; S.add(rock); }

    // くさ（のはら）と、ちいさな かざり
    for (let i = 0; i < 46; i++) {
      const a = rnd() * Math.PI * 2, r = 3 + rnd() * 17.5, x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.hypot(x - POND.x, z - POND.z) < POND.r + 0.8) continue;
      const tuft = new T.Mesh(new T.ConeGeometry(0.3, 0.65, 6), mat(0x7fcf6a)); tuft.position.set(x, 0.3, z); S.add(tuft);
    }
    // はな：さいしょから すこし さいている ぶん と、えがおで いっきに さく ぶん（bloom）
    const flowerColors = [0xff8fb5, 0xffe066, 0xffffff, 0xb79cff, 0xff6f91, 0x8fd8ff];
    const flower = (x, z, c, big = 1) => {
      const g = new T.Group();
      const stem = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 0.5, 5), mat(0x6fbf5f)); stem.position.y = 0.25; g.add(stem);
      const head = sph(0.2 * big, c); head.position.y = 0.56; g.add(head);
      const core = sph(0.09 * big, 0xfff2a0); core.position.set(0, 0.66, 0.02); g.add(core);
      g.position.set(x, 0, z); S.add(g); return g;
    };
    const clearOf = (x, z) => Math.hypot(x - POND.x, z - POND.z) > POND.r + 1 && Math.hypot(x - SEA.x, z - SEA.z) > SEA.mid + SEA.amp + 1.5;
    for (let i = 0; i < 16; i++) {
      const a = rnd() * Math.PI * 2, r = 4 + rnd() * 16, x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (clearOf(x, z)) flower(x, z, flowerColors[i % 6]);
    }
    const bloomOn = (id, isl, count) => {
      const list = [];
      for (let i = 0; i < count; i++) {
        const a = rnd() * Math.PI * 2, r = 2.5 + rnd() * (isl.r - 5), x = isl.x + Math.cos(a) * r, z = isl.z + Math.sin(a) * r;
        if (!clearOf(x, z)) continue;
        const f = flower(x, z, flowerColors[i % 6], 1.25); f.scale.setScalar(0.001);
        list.push({ g: f, delay: rnd() });
      }
      this.blooms[id] = { list, amt: 0, started: false };
    };
    bloomOn('chapu', nohara, 70);
    bloomOn('kani', umibe, 46);
    // うみべの かざり（ひとで・パラソル）
    for (const [x, z, c] of [[45, -3, 0xff9fb8], [63, 3, 0xffd08a], [57, -13, 0xff9fb8]]) {
      const st = sph(0.5, c); st.scale.set(1, 0.3, 1); st.position.set(x, 0.12, z); S.add(st);
    }
    const pole = new T.Mesh(new T.CylinderGeometry(0.08, 0.08, 3.2, 6), mat(0xffffff)); pole.position.set(67, 1.6, -8); S.add(pole);
    const shade = new T.Mesh(new T.ConeGeometry(2.4, 1, 12), mat(0xff9fc0)); shade.position.set(67, 3.5, -8); S.add(shade);
  }

  // ---- かいがら・かけら・ちょうちょ・もや・かんばん・パーティクルの もと ----
  buildThings() {
    const S = this.scene;
    this.shells = SHELLS.map((sh) => {
      const p = shellPos(sh), g = new T.Group();
      const m = mat(sh.rainbow ? 0xd9b8ff : 0xffc4de, { transparent: true, emissive: sh.rainbow ? 0x8a5cff : 0xff6fa8, emissiveIntensity: 0.25 });
      const a = new T.Mesh(new T.SphereGeometry(0.5, 16, 10), m); a.scale.set(1, 0.5, 0.9); g.add(a);
      const b = new T.Mesh(new T.SphereGeometry(0.34, 14, 8), m); b.scale.set(1, 0.5, 0.9); b.position.set(0, 0.16, -0.12); g.add(b);
      g.position.set(p.x, 0.28, p.z); g.visible = false; S.add(g);
      return { g, m, sh, p, kira: Math.random() * 2 };
    });
    this.shardGrps = SHARDS.map((p) => {
      const m = new T.Mesh(new T.OctahedronGeometry(0.34), mat(0xffd84a, { emissive: 0x6b4a00, emissiveIntensity: 0.35 }));
      m.position.set(p.x, 0.9, p.z); S.add(m); return m;
    });
    // あんないの ちょうちょ
    const bf = new T.Group(); this.butterfly = bf; this.wings = [];
    for (const sx of [-1, 1]) {
      const pivot = new T.Group();
      const w = new T.Mesh(new T.CircleGeometry(0.36, 14), basic(0xff8fc8, { side: T.DoubleSide })); w.position.x = sx * 0.34; w.scale.y = 1.25; pivot.add(w);
      const w2 = new T.Mesh(new T.CircleGeometry(0.16, 10), basic(0xfff2a0, { side: T.DoubleSide })); w2.position.set(sx * 0.36, 0, 0.01); pivot.add(w2);
      bf.add(pivot); this.wings.push({ pivot, sx });
    }
    const bb = new T.Mesh(new T.SphereGeometry(0.09, 8, 6), basic(0x7a4a8a)); bb.scale.set(1, 2.6, 1); bf.add(bb);
    bf.position.set(0, 2.4, 6); S.add(bf);
    this.bfPos = new T.Vector3(0, 2.4, 6);
    // もや
    this.fogs = {};
    for (const f of FOGS) {
      const g = new T.Group(), isl = ISLANDS.find((i) => i.id === f.id);
      const m = mat(0xcfc4e6, { transparent: true, opacity: 0.94 });
      const puff = (x, y, z, r) => { const p = new T.Mesh(new T.SphereGeometry(r, 16, 12), m); p.position.set(x, y, z); p.userData.r = r; g.add(p); };
      const rnd = mulberry(7);
      for (let i = 0; i < 9; i++) puff(f.x + (rnd() - 0.5) * 9, 1.5 + rnd() * 3, f.z + 5 - i * 1.6, 3 + rnd() * 2);
      if (isl) for (let i = 0; i < 26; i++) { const a = rnd() * Math.PI * 2, r = rnd() * isl.r; puff(isl.x + Math.cos(a) * r, 2 + rnd() * 6, isl.z + Math.sin(a) * r, 5 + rnd() * 4); }
      S.add(g); this.fogs[f.id] = { g, m, amt: 1, init: false };
    }
    // じゅんびちゅうの かんばん
    const soon = BRIDGES.find((b) => b.soon);
    this.sign = canvasSprite(256, 192, (g) => {
      g.fillStyle = '#c8915e'; g.fillRect(118, 110, 20, 82);
      g.fillStyle = '#fffdf4'; g.strokeStyle = '#ff8fb3'; g.lineWidth = 8;
      g.beginPath(); if (g.roundRect) g.roundRect(8, 8, 240, 112, 24); else g.rect(8, 8, 240, 112); g.fill(); g.stroke();
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '44px serif'; g.fillText('🚧', 128, 44);
      g.fillStyle = '#4a3520'; g.font = 'bold 30px sans-serif'; g.fillText('じゅんびちゅう', 128, 90);
    }, 4.4, 3.3);
    this.sign.position.set(soon.a.x + 3.2, 1.9, soon.a.z + 1.5); this.sign.visible = false; S.add(this.sign);
    this.heartTex = emojiTexture('💗'); this.starTex = emojiTexture('✦', 64); this.flowerTex = emojiTexture('🌸');
  }

  spawnParticles(tex, x, y, z, n, colors, spread = 2.4, up = 3.2, grav = -2.2) {
    for (let i = 0; i < n; i++) {
      const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, color: colors[i % colors.length], depthWrite: false }));
      sp.position.set(x, y, z); sp.scale.setScalar(0.55 + Math.random() * 0.5);
      this.scene.add(sp);
      this.effects.push({ sp, vx: (Math.random() - 0.5) * spread, vy: up * (0.6 + Math.random() * 0.7), vz: (Math.random() - 0.5) * spread, life: 1.1 + Math.random() * 0.5, t: 0, grav });
    }
  }
  burstHearts(x, z) { this.spawnParticles(this.heartTex, x, 2, z, 12, [0xffffff], 3.2); }
  burstStars(x, z) { this.spawnParticles(this.starTex, x, 1.2, z, 8, [0xffe066, 0xffffff, 0xffb7d5]); }
  burstFlowers(x, z) { this.spawnParticles(this.flowerTex, x, 1.5, z, 14, [0xffffff], 6, 4); }
  // えがおに なった ときの よろこび（ジャンプ＋くるっと まわる）
  celebrate(id) { const f = this.friends[id]; if (f) { f.joy = 1.6; this.burstHearts(f.pos.x, f.pos.z); } }
  // じゃんけんの かけごえに あわせて ふたりが はねる
  beat() { this.beatT = 0.3; }
  cheer() { this.pJoy = 1.0; }
  friendPos(id) { return this.friends[id].pos; }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  // 状態を 見た目に はんえい
  // opt.guide：ちょうちょの めざす ばしょ ／ opt.tell：カニが てを みせている ／ opt.look：カメラが みる ばしょ
  sync(s, t, dt, opt = {}) {
    const P = s.player, jk = opt.jk || null;
    const turn = (grp, want, k) => { let d = want - grp.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); grp.rotation.y += d * (1 - Math.exp(-dt * k)); };
    this.beatT = Math.max(0, this.beatT - dt); this.pJoy = Math.max(0, this.pJoy - dt);
    const beatHop = this.beatT > 0 ? Math.sin((1 - this.beatT / 0.3) * Math.PI) * 0.4 : 0;
    // ぷにゅ
    const moving = s.dir.x !== 0 || s.dir.z !== 0;
    this.idle = moving ? 0 : this.idle + dt;
    const inSea = Math.hypot(P.x - SEA.x, P.z - SEA.z) < waveR(s.time);
    const bounce = this.pJoy > 0 ? Math.abs(Math.sin(this.pJoy * 9)) * 0.9 : moving ? Math.abs(Math.sin(t * 11)) * 0.18 : Math.sin(t * 2.2) * 0.03;
    this.punyu.grp.position.set(P.x, 0, P.z);
    this.punyu.inner.position.y = bounce + beatHop - (inSea ? 0.22 : 0);
    // むき：あるく あいだは すすむ ほう。とまると カメラの ほう（てまえ）を むいて かおを みせる
    let want = s.facing;
    const partner = s.janken ? this.friends[s.janken.friend].pos : opt.faceTo;
    if (partner) want = Math.atan2(partner.x - P.x, partner.z - P.z) * 0.55;
    else if (!moving && this.idle > 0.5) want = 0;
    turn(this.punyu.grp, want, moving ? 14 : 7);
    const sq = moving ? bounce : 0;
    this.punyu.inner.scale.set(1 + sq * 0.3, 1 - sq * 0.3, 1);
    setFace(this.punyu.face, jk?.result === 'win' || this.pJoy > 0 || (smilesOf(s) > 0 && !moving && !s.janken) ? 'happy' : 'normal', t);
    if (inSea && moving && Math.random() < dt * 9) this.spawnParticles(this.starTex, P.x, 0.3, P.z, 1, [0xffffff, 0xbfefff], 1.6, 2.2, -6);

    // ともだち：ついてくる こは まえの こを おいかける
    let lead = { x: P.x, z: P.z };
    const place = (id, target, gap) => {
      const b = this.friends[id];
      if (!b.placed) { b.pos.x = target.x - Math.sin(s.facing) * gap; b.pos.z = target.z - Math.cos(s.facing) * gap; b.placed = true; }
      const dx = target.x - b.pos.x, dz = target.z - b.pos.z, d = Math.hypot(dx, dz);
      const go = d > gap + 0.05;
      b.moving = ease(b.moving, go ? 1 : 0, dt, 8);
      if (d > gap) { const k = (d - gap) / d * Math.min(1, dt * 9); b.pos.x += dx * k; b.pos.z += dz * k; }
      b.rot = go ? Math.atan2(dx, dz) : 0;
    };
    let row = 0;
    for (const id of s.party) {
      if (!this.friends[id] || s.janken?.friend === id) continue;
      // じゃんけん ちゅうは、うしろに ならんで おうえん する（しょうぶの じゃまを しない）
      if (s.janken) { row += 1; place(id, { x: P.x - 1.2 - row * 2.5, z: P.z - 2.6 }, 0.1); this.friends[id].rot = 0.5; }
      else { place(id, lead, FOLLOW_GAP); lead = this.friends[id].pos; }
    }
    for (const f of FRIENDS) {
      const b = this.friends[f.id], st = s.friends[f.id].state;
      const playing = s.janken?.friend === f.id;
      if (!s.party.includes(f.id) || playing) {
        b.pos.x = f.home.x; b.pos.z = f.home.z; b.placed = true; b.moving = 0;
        const near = Math.hypot(P.x - f.home.x, P.z - f.home.z) < 9;
        b.rot = near ? Math.atan2(P.x - f.home.x, P.z - f.home.z) * 0.55 : 0;
      }
      b.joy = Math.max(0, b.joy - dt);
      const lost = playing && jk?.result === 'win', won = playing && jk?.result === 'lose';
      const hop = b.joy > 0 ? Math.abs(Math.sin(b.joy * 7)) * 1.1
        : won ? Math.abs(Math.sin(t * 9)) * 0.5
        : b.moving * Math.abs(Math.sin(t * 10 + f.home.x)) * 0.22 + (st === 'happy' ? Math.abs(Math.sin(t * 3 + f.home.x)) * 0.07 : 0) + (playing ? beatHop : 0);
      b.grp.position.set(b.pos.x, 0, b.pos.z);
      b.inner.position.y = hop;
      turn(b.grp, b.rot, 8);
      if (b.joy > 0.6) b.grp.rotation.y += dt * 11;
      const sad = st === 'sad';
      b.inner.scale.set(1, sad ? 0.94 + Math.sin(t * 1.6) * 0.015 : 1, 1);
      b.inner.rotation.z = lost ? 0.3 + Math.sin(t * 14) * 0.05 : sad ? Math.sin(t * 1.3) * 0.04 : 0;
      setFace(b.face, sad || lost ? 'sad' : st === 'happy' || won ? 'happy' : 'normal', t + f.home.x);
      b.bubble.visible = sad && !opt.talking;
      b.bubble.position.set(b.pos.x, 4.1 + Math.sin(t * 3) * 0.12, b.pos.z);
      b.proxy.position.set(b.pos.x, 1.1, b.pos.z); b.proxy.visible = sad;
      if (b.shell) b.shell.visible = st === 'happy';
      if (b.claws) {
        for (const c of b.claws) {
          const sx = c.userData.sx;
          const up = playing && jk?.tell ? 1 + Math.sin(t * 34) * 0.12 : won || st === 'happy' ? 0.55 + Math.sin(t * 6 + sx) * 0.35 : sad || lost ? -0.7 : 0;
          c.userData.up = ease(c.userData.up || 0, up, dt, 12);
          c.rotation.z = -sx * (0.55 - c.userData.up * 0.42);
          c.position.y = 0.05 + c.userData.up * 0.22;
        }
        const grow = playing ? 1 + Math.min(6, s.janken.rounds) * 0.06 : 1;
        b.grp.scale.setScalar(ease(b.grp.scale.x, grow, dt, 5));
      }
    }
    // じゃんけんの て
    for (const who of ['kani', 'punyu']) {
      const h = this.handSp[who], kind = jk ? (who === 'kani' ? jk.crab : jk.punyu) : null;
      if (kind) h.sp.material.map = this.handTex[who][kind];
      h.k = ease(h.k, kind ? 1 : 0, dt, kind ? 18 : 14);
      h.sp.visible = h.k > 0.02;
      const at = who === 'kani' ? this.friends.kani.pos : P, big = who === 'kani' && jk?.tell ? 2.0 : 2.5;
      h.sp.position.set(at.x + (jk?.tell && who === 'kani' ? Math.sin(t * 40) * 0.08 : 0), (who === 'kani' ? 3.9 : 3.1) + h.k * 0.3, at.z);
      h.sp.scale.setScalar(Math.max(0.001, big * (h.k + Math.sin(h.k * Math.PI) * 0.3)));
    }

    // えがおで はなが さく
    for (const id of Object.keys(this.blooms)) {
      const bl = this.blooms[id], on = s.friends[id]?.state === 'happy';
      if (!bl.started) { bl.started = true; bl.amt = on ? 1 : 0; }
      bl.amt = Math.min(1, Math.max(0, bl.amt + (on ? dt * 0.55 : -dt)));
      for (const f of bl.list) {
        const k = Math.min(1, Math.max(0, bl.amt * 1.8 - f.delay * 0.8));
        f.g.scale.setScalar(Math.max(0.001, k + Math.sin(k * Math.PI) * 0.35));
      }
    }

    // なみ・かいがら
    const R = waveR(s.time);
    this.wave.scale.set(R, R, 1); this.foam.scale.set(R, R, 1);
    for (const sh of this.shells) {
      const active = !!s.shells && !s.shells.got.includes(SHELLS.indexOf(sh.sh));
      sh.g.visible = active;
      if (!active) continue;
      const shown = shellShown(sh.sh, s.time);
      sh.m.opacity = ease(sh.m.opacity, shown ? 1 : 0.28, dt, 8);
      sh.g.scale.setScalar(shown ? 1.15 + Math.sin(t * 5) * 0.12 : 0.9);
      sh.g.rotation.y = t * 0.8;
      sh.kira -= dt;
      if (shown && sh.kira <= 0) { sh.kira = 0.5 + Math.random() * 0.5; this.spawnParticles(this.starTex, sh.p.x, 0.8, sh.p.z, 1, sh.sh.rainbow ? [0xd9b8ff, 0x9fe6f2, 0xfff2a0] : [0xffffff, 0xffc4de], 1.2, 2.4, -1); }
    }
    this.shardGrps.forEach((g, i) => { g.visible = !s.shards.includes(i); g.rotation.y = t * 2 + i; g.position.y = 0.9 + Math.sin(t * 2.6 + i * 1.3) * 0.14; });

    // もや・かんばん
    let anyFog = false;
    for (const id of Object.keys(this.fogs)) {
      const f = this.fogs[id], gone = s.cleared.includes(id);
      if (!f.init) { f.init = true; f.amt = gone ? 0 : 1; }
      f.amt = Math.min(1, Math.max(0, f.amt + (gone ? -dt * 0.45 : dt)));
      f.g.visible = f.amt > 0.01; f.m.opacity = 0.94 * f.amt;
      f.g.children.forEach((p, i) => { p.scale.setScalar(0.4 + 0.6 * f.amt + Math.sin(t * 0.8 + i) * 0.05); p.position.y += Math.sin(t * 0.7 + i * 1.7) * 0.003; });
      if (f.amt > 0.5) anyFog = true;
    }
    this.okashi.visible = true;
    this.sign.visible = !anyFog;

    // ちょうちょ：めざす ばしょの ほうへ、ぷにゅの すこし まえを とぶ
    const g = opt.guide;
    const tgt = new T.Vector3(P.x + Math.sin(t * 1.3) * 1.2, 2.6, P.z + Math.cos(t * 1.3) * 1.2);
    if (g) {
      const dx = g.x - P.x, dz = g.z - P.z, d = Math.hypot(dx, dz) || 1;
      const lead2 = Math.min(5.5, Math.max(0, d - 0.5));
      tgt.set(P.x + (dx / d) * lead2 + Math.sin(t * 2.3) * 0.5, 2.3 + Math.sin(t * 3.1) * 0.35, P.z + (dz / d) * lead2 + Math.cos(t * 1.9) * 0.5);
    }
    this.bfPos.lerp(tgt, 1 - Math.exp(-dt * 3.5));
    this.butterfly.position.copy(this.bfPos);
    this.butterfly.rotation.x = -0.9;
    for (const w of this.wings) w.pivot.rotation.y = w.sx * (0.2 + Math.abs(Math.sin(t * 13)) * 1.1);
    this.butterfly.visible = !s.janken && !opt.talking;

    // き：ぷにゅの てまえに くると すける
    for (const tr of this.trees) {
      const dz = tr.z - P.z, hide = dz > 0.2 && dz < 11 * tr.s && Math.abs(tr.x - P.x) < 2.7 * tr.s;
      tr.fade = ease(tr.fade, hide ? 0.22 : 1, dt, 9);
      for (const m of tr.mats) { m.opacity = tr.fade; m.depthWrite = tr.fade > 0.9; }
    }

    // カメラ（正面少し斜め上から。遠くから狭い画角で撮り、パースを弱める）
    let fx = P.x, fz = P.z, zoom = 1, quick = false;
    if (s.janken) { const k = this.friends[s.janken.friend].pos; fx = (P.x + k.x) / 2; fz = (P.z + k.z) / 2 + 2.4; zoom = 0.52; quick = true; }
    else if (opt.faceTo) { fx = (P.x + opt.faceTo.x) / 2; fz = (P.z + opt.faceTo.z) / 2 + 2.6; zoom = 0.55; quick = true; }
    if (opt.look) { fx = opt.look.x; fz = opt.look.z; zoom = opt.look.zoom || 1.25; }
    if (!this.focus) this.focus = { x: fx, z: fz };
    const ck = opt.look ? 1.6 : 4.5;
    this.focus.x = ease(this.focus.x, fx, dt, ck); this.focus.z = ease(this.focus.z, fz, dt, ck);
    this.zoom = ease(this.zoom, zoom, dt, quick ? 4 : 2.5);
    // たてに せまい 画面（iPad）では すこし ひいて、よこ はばを たもつ
    const wide = Math.max(1, 1.5 / this.camera.aspect);
    const z = this.zoom * wide;
    this.camera.position.set(this.focus.x, CAM.y * z, this.focus.z + CAM.z * z);
    this.camera.lookAt(this.focus.x, 0.9, this.focus.z + CAM.look * z);
  }

  update(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i]; e.t += dt;
      e.vy += e.grav * dt;
      e.sp.position.x += e.vx * dt; e.sp.position.y += e.vy * dt; e.sp.position.z += e.vz * dt;
      e.sp.material.opacity = Math.max(0, 1 - e.t / e.life);
      if (e.t >= e.life) { this.scene.remove(e.sp); e.sp.material.dispose(); this.effects.splice(i, 1); }
    }
    if (this.fireworksOn) {
      this.fwTimer -= dt;
      if (this.fwTimer <= 0) {
        this.fwTimer = 0.55;
        const x = this.fwAt.x + (Math.random() - 0.5) * 30, z = this.fwAt.z - Math.random() * 12, y = 10 + Math.random() * 5;
        this.spawnParticles(this.starTex, x, y, z, 22, [0xff6b81, 0xffd84a, 0x7fd0ff, 0xb8f28a, 0xffb7d5], 6.5, 0.6, -1.2);
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  // タップした ばしょに ある ものを かえす
  pick(nx, ny) {
    this.raycaster.setFromCamera({ x: nx, y: ny }, this.camera);
    const hits = this.raycaster.intersectObjects(this.pickables.filter((o) => o.visible !== false), true);
    for (const h of hits) { let o = h.object; while (o) { if (o.userData.pick) return o.userData.pick; o = o.parent; } }
    return null;
  }
}

const smilesOf = (s) => FRIENDS.filter((f) => s.friends[f.id].state === 'happy').length;
