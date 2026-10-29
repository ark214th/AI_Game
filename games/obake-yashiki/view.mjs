// オバケやしきの おかたづけ — 3Dの えがき（へや・本だな・本・ひかり）
import * as T from './vendor/three.module.min.js';
import * as C from './core.mjs';

export const FONT = '"Hiragino Maru Gothic ProN","Hiragino Sans","IPAGothic","Noto Sans CJK JP",sans-serif';
const PI = Math.PI;
const rnd = C.mulberry32(20261029);
const between = (a, b) => a + rnd() * (b - a);

// ---------- マークの え ----------
export function drawIcon(x, type, cx, cy, s, color) {
  x.save();
  x.fillStyle = color;
  x.beginPath();
  if (type === 'star') {
    for (let i = 0; i < 10; i++) {
      const a = -PI / 2 + i * PI / 5, r = i % 2 ? s * 0.45 : s;
      x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    x.closePath(); x.fill();
  } else if (type === 'fish') {
    x.ellipse(cx - s * 0.2, cy, s * 0.68, s * 0.46, 0, 0, PI * 2); x.fill();
    x.beginPath(); x.moveTo(cx + s * 0.3, cy); x.lineTo(cx + s * 0.95, cy - s * 0.48); x.lineTo(cx + s * 0.95, cy + s * 0.48); x.closePath(); x.fill();
  } else if (type === 'paw') {
    x.ellipse(cx, cy + s * 0.28, s * 0.46, s * 0.38, 0, 0, PI * 2); x.fill();
    for (const [dx, dy] of [[-0.55, -0.18], [-0.2, -0.55], [0.2, -0.55], [0.55, -0.18]]) {
      x.beginPath(); x.ellipse(cx + dx * s, cy + dy * s, s * 0.18, s * 0.22, dx * 0.6, 0, PI * 2); x.fill();
    }
  } else {
    // みかづき（そとの 円から ずらした 円を くりぬいた かたち）
    const d = 0.45 * s, t1 = 0.895, f = 1.35;
    x.translate(cx - s * 0.12, cy); x.rotate(-0.5);
    x.arc(0, 0, s, t1, PI * 2 - t1, false);
    x.arc(d, 0, s * 0.8, -f, f, true);
    x.closePath(); x.fill();
  }
  x.restore();
}

// ---------- テクスチャ ----------
function canvasTex(w, h, draw, { repeat, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c);
  if (srgb) t.colorSpace = T.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.anisotropy = 4;
  return t;
}
function grain(x, x0, y0, w, h, n, alpha, vertical = true) {
  for (let i = 0; i < n; i++) {
    x.strokeStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,230,200'},${alpha * rnd()})`;
    x.lineWidth = 0.6 + rnd() * 1.4;
    x.beginPath();
    if (vertical) {
      const px = x0 + rnd() * w;
      x.moveTo(px, y0);
      for (let y = y0; y <= y0 + h; y += 16) x.lineTo(px + Math.sin(y * 0.02 + i) * 2.5, y);
    } else {
      const py = y0 + rnd() * h;
      x.moveTo(x0, py);
      for (let px = x0; px <= x0 + w; px += 16) x.lineTo(px, py + Math.sin(px * 0.015 + i) * 2);
    }
    x.stroke();
  }
}
function shade(hex, k) {
  const c = new T.Color(hex);
  const hsl = {}; c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l * k)));
  return '#' + c.getHexString();
}

const floorTex = () => canvasTex(1024, 1024, (x, w, h) => {
  const n = 16, pw = w / n;
  for (let i = 0; i < n; i++) {
    let y = -rnd() * 400;
    while (y < h) {
      const len = 260 + rnd() * 420;
      const l = 30 + rnd() * 9;
      x.fillStyle = `hsl(${24 + rnd() * 8},${42 + rnd() * 12}%,${l}%)`;
      x.fillRect(i * pw, y, pw, len);
      grain(x, i * pw, y, pw, len, 10, 0.18);
      x.fillStyle = 'rgba(20,10,4,.75)'; x.fillRect(i * pw, y, pw, 3);
      y += len;
    }
    x.fillStyle = 'rgba(20,10,4,.8)'; x.fillRect(i * pw, 0, 3, h);
  }
}, { repeat: [3, 3] });

const caseWoodTex = () => canvasTex(512, 512, (x, w, h) => {
  x.fillStyle = '#4a2a17'; x.fillRect(0, 0, w, h);
  grain(x, 0, 0, w, h, 140, 0.16);
});

const wallTex = () => canvasTex(512, 512, (x, w, h) => {
  x.fillStyle = '#2d3b2e'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? 'rgba(255,240,200,.04)' : 'rgba(0,0,0,.08)'; x.fillRect(i * 64, 0, 32, h); }
  x.fillStyle = 'rgba(214,180,110,.16)';
  for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) {
    const cx = c * 128 + (r % 2 ? 64 : 0) + 32, cy = r * 64 + 32;
    x.beginPath(); x.moveTo(cx, cy - 18); x.lineTo(cx + 10, cy); x.lineTo(cx, cy + 18); x.lineTo(cx - 10, cy); x.closePath(); x.fill();
  }
}, { repeat: [6, 2] });

const ceilTex = () => canvasTex(512, 512, (x, w, h) => {
  x.fillStyle = '#2a1a10'; x.fillRect(0, 0, w, h);
  grain(x, 0, 0, w, h, 80, 0.12, false);
}, { repeat: [4, 4] });

const rugTex = () => canvasTex(1024, 1024, (x, w, h) => {
  x.fillStyle = '#3f1519'; x.fillRect(0, 0, w, h);
  x.strokeStyle = '#8f6c38'; x.lineWidth = 14; x.strokeRect(40, 40, w - 80, h - 80);
  x.strokeStyle = '#1e2a40'; x.lineWidth = 46; x.strokeRect(90, 90, w - 180, h - 180);
  x.strokeStyle = '#c99a4b'; x.lineWidth = 6; x.strokeRect(124, 124, w - 248, h - 248);
  x.fillStyle = '#8f6c38';
  for (let i = 0; i < 18; i++) {
    const t = 90 + i * ((w - 180) / 17);
    for (const [px, py] of [[t, 90], [t, h - 90], [90, t], [w - 90, t]]) { x.beginPath(); x.arc(px, py, 5, 0, PI * 2); x.fill(); }
  }
  x.save(); x.translate(w / 2, h / 2);
  for (let k = 0; k < 3; k++) {
    x.rotate(PI / 4);
    x.strokeStyle = k % 2 ? '#8f6c38' : '#62232b'; x.lineWidth = 14;
    x.strokeRect(-150 + k * 40, -150 + k * 40, 300 - k * 80, 300 - k * 80);
  }
  x.restore();
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(0,0,0,${rnd() * 0.08})`; x.fillRect(rnd() * w, rnd() * h, 2, 2); }
});

const windowTex = () => canvasTex(256, 512, (x, w, h) => {
  x.clearRect(0, 0, w, h);
  x.save();
  x.beginPath(); x.moveTo(0, h); x.lineTo(0, w / 2); x.arc(w / 2, w / 2, w / 2, PI, 0); x.lineTo(w, h); x.closePath(); x.clip();
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#3a3a7a'); g.addColorStop(0.45, '#a0507a'); g.addColorStop(0.8, '#f0a060'); g.addColorStop(1, '#ffd38a');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.fillStyle = 'rgba(255,255,230,.9)';
  for (let i = 0; i < 14; i++) { x.beginPath(); x.arc(rnd() * w, rnd() * h * 0.4, rnd() * 1.6 + 0.4, 0, PI * 2); x.fill(); }
  x.fillStyle = '#1c1612';
  x.fillRect(0, h - 120, w, 120);
  for (let i = 0; i < 6; i++) { const bx = rnd() * w; x.beginPath(); x.moveTo(bx - 30, h - 120); x.lineTo(bx, h - 200 - rnd() * 60); x.lineTo(bx + 30, h - 120); x.fill(); }
  x.strokeStyle = '#2b1b10'; x.lineWidth = 12;
  x.beginPath(); x.moveTo(w / 2, 0); x.lineTo(w / 2, h); x.moveTo(0, h * 0.42); x.lineTo(w, h * 0.42); x.moveTo(0, h * 0.72); x.lineTo(w, h * 0.72); x.stroke();
  x.restore();
  x.strokeStyle = '#3b2412'; x.lineWidth = 16;
  x.beginPath(); x.moveTo(8, h); x.lineTo(8, w / 2); x.arc(w / 2, w / 2, w / 2 - 8, PI, 0); x.lineTo(w - 8, h); x.stroke();
});

const glowTex = () => canvasTex(64, 64, (x, w) => {
  const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, w, w);
});
const beamTex = () => canvasTex(64, 256, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(255,220,120,0)'); g.addColorStop(0.6, 'rgba(255,220,120,.5)'); g.addColorStop(1, 'rgba(255,220,120,.9)');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
});

const pagesTex = () => canvasTex(256, 256, (x, w, h) => {
  x.fillStyle = '#efe4c8'; x.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 3) { x.fillStyle = `rgba(120,90,50,${0.05 + rnd() * 0.1})`; x.fillRect(0, y, w, 1); }
});

// かざりの 本の せびょうし（色は あとから かける）
const decorSpineTex = () => canvasTex(64, 256, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, '#a8a8a8'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(1, '#9a9a9a');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, 22, w, 10); x.fillRect(0, h - 34, w, 10);
  x.fillStyle = 'rgba(255,255,255,.6)'; x.fillRect(0, 36, w, 3); x.fillRect(0, h - 40, w, 3);
  x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(12, 70, w - 24, 60);
});

// ---------- かたづける 本の 絵（2まいの まとめ画像） ----------
const SP = { w: 64, h: 256, cols: 32 };
const CV = { w: 256, h: 320 };
const SW_Y = 980, PG = { x: 0, y: 1060, w: 1024, h: 256 };

function verticalTitle(x, title, cx, top, bottom, color) {
  const chars = [...title];
  const units = chars.reduce((n, ch) => n + (ch === ' ' ? 0.5 : 1), 0);
  const size = Math.min(26, Math.floor((bottom - top) / units));
  x.fillStyle = color; x.font = `bold ${size}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  let y = top + size / 2;
  for (const ch of chars) {
    if (ch === ' ') { y += size * 0.5; continue; }
    x.fillText(ch, cx, y); y += size;
  }
}

function spineAtlas() {
  return canvasTex(2048, 2048, x => {
    C.SERIES.forEach((ser, s) => {
      const sec = C.SECTIONS[ser.sec];
      for (let v = 0; v < C.VOLS; v++) {
        const i = s * C.VOLS + v, ox = (i % SP.cols) * SP.w, oy = Math.floor(i / SP.cols) * SP.h;
        x.save(); x.translate(ox, oy); x.scale(SP.w / 80, SP.h / 320);
        const g = x.createLinearGradient(0, 0, 80, 0);
        g.addColorStop(0, shade(ser.color, 0.6)); g.addColorStop(0.45, shade(ser.color, 1.12)); g.addColorStop(1, shade(ser.color, 0.55));
        x.fillStyle = g; x.fillRect(0, 0, 80, 320);
        for (const y of [16, 320 - 34]) {
          x.fillStyle = shade(ser.color, 0.5); x.fillRect(0, y, 80, 18);
          x.fillStyle = '#d9b25a'; x.fillRect(0, y - 3, 80, 3); x.fillRect(0, y + 18, 80, 3);
        }
        drawIcon(x, sec.icon, 80 / 2, 58, 14, '#f6e7c4');
        verticalTitle(x, ser.title, 80 / 2, 80, 232, '#f6e7c4');
        x.fillStyle = '#f6e7c4'; x.beginPath(); x.arc(80 / 2, 260, 21, 0, PI * 2); x.fill();
        x.fillStyle = shade(ser.color, 0.75); x.font = `bold 28px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(String(v + 1), 80 / 2, 262);
        x.restore();
      }
    });
  });
}

export function wrapTitle(title) {
  const words = title.split(' ');
  return words.length > 1 ? words : [title];
}

function coverAtlas() {
  return canvasTex(2048, 2048, x => {
    C.SERIES.forEach((ser, s) => {
      const sec = C.SECTIONS[ser.sec];
      const ox = (s % 8) * CV.w, oy = Math.floor(s / 8) * CV.h;
      x.save(); x.translate(ox, oy);
      const g = x.createLinearGradient(0, 0, CV.w, CV.h);
      g.addColorStop(0, shade(ser.color, 1.15)); g.addColorStop(1, shade(ser.color, 0.75));
      x.fillStyle = g; x.fillRect(0, 0, CV.w, CV.h);
      for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(0,0,0,${rnd() * 0.08})`; x.fillRect(rnd() * CV.w, rnd() * CV.h, 2, 2); }
      x.fillStyle = shade(ser.color, 0.55); x.fillRect(0, 0, 22, CV.h);
      x.strokeStyle = '#d9b25a'; x.lineWidth = 4; x.strokeRect(36, 16, CV.w - 52, CV.h - 32);
      x.fillStyle = '#f6e7c4'; x.beginPath(); x.arc(CV.w / 2 + 10, 104, 50, 0, PI * 2); x.fill();
      drawIcon(x, sec.icon, CV.w / 2 + 10, 104, 32, ser.color);
      const lines = wrapTitle(ser.title);
      x.fillStyle = '#fff3d6'; x.textAlign = 'center'; x.textBaseline = 'middle';
      lines.forEach((ln, k) => {
        const size = Math.min(34, Math.floor(170 / ln.length));
        x.font = `bold ${size}px ${FONT}`;
        x.fillText(ln, CV.w / 2 + 10, 196 + k * 42 - (lines.length - 1) * 12);
      });
      x.restore();
      x.fillStyle = shade(ser.color, 0.8); x.fillRect(s * 72 + 8, SW_Y, 56, 56);
    });
    x.fillStyle = '#efe4c8'; x.fillRect(PG.x, PG.y, PG.w, PG.h);
    for (let y = PG.y; y < PG.y + PG.h; y += 3) { x.fillStyle = `rgba(120,90,50,${0.05 + rnd() * 0.1})`; x.fillRect(PG.x, y, PG.w, 1); }
  });
}

// 本の かたち（せびょうしは +z、おもての 表紙は +x）
function bookGeometry(s, v) {
  const ser = C.SERIES[s];
  const a = ser.th / 2, b = ser.h / 2, c = ser.d / 2;
  const i = s * C.VOLS + v;
  const rect = (px, py, pw, ph, W, H) => [px / W, 1 - (py + ph) / H, (px + pw) / W, 1 - py / H];
  const spine = rect((i % SP.cols) * SP.w + 1, Math.floor(i / SP.cols) * SP.h + 1, SP.w - 2, SP.h - 2, 2048, 2048);
  const cover = rect((s % 8) * CV.w + 2, Math.floor(s / 8) * CV.h + 2, CV.w - 4, CV.h - 4, 2048, 2048);
  const back = rect(s * 72 + 16, SW_Y + 8, 40, 40, 2048, 2048);
  const pages = rect(PG.x + 8, PG.y + 8, PG.w - 16, PG.h - 16, 2048, 2048);
  const pos = [], nor = [], uv = [];
  const face = (q, n, r) => {
    // q = [左下, 右下, 右上, 左上]
    const [bl, br, tr, tl] = q;
    const e1 = [br[0] - bl[0], br[1] - bl[1], br[2] - bl[2]], e2 = [tl[0] - bl[0], tl[1] - bl[1], tl[2] - bl[2]];
    const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const flip = cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0;
    const U = [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]];
    const tri = flip ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3];
    for (const k of tri) { pos.push(...q[k]); nor.push(...n); uv.push(...U[k]); }
  };
  face([[-a, -b, c], [a, -b, c], [a, b, c], [-a, b, c]], [0, 0, 1], spine);
  face([[a, -b, c], [a, -b, -c], [a, b, -c], [a, b, c]], [1, 0, 0], cover);
  face([[-a, -b, -c], [-a, -b, c], [-a, b, c], [-a, b, -c]], [-1, 0, 0], back);
  face([[a, -b, -c], [-a, -b, -c], [-a, b, -c], [a, b, -c]], [0, 0, -1], pages);
  face([[-a, b, c], [a, b, c], [a, b, -c], [-a, b, -c]], [0, 1, 0], pages);
  face([[-a, -b, -c], [a, -b, -c], [a, -b, c], [-a, -b, c]], [0, -1, 0], pages);
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.addGroup(0, 6, 0);
  g.addGroup(6, 30, 1);
  g.computeBoundingSphere();
  return g;
}

// ---------- かたまりを 1つに まとめる（びょうがの 回数を へらす） ----------
function mergeParts(parts) {
  const P = [], N = [], U = [];
  for (const { geo, matrix } of parts) {
    const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(matrix);
    P.push(g.getAttribute('position').array); N.push(g.getAttribute('normal').array); U.push(g.getAttribute('uv').array);
    g.dispose();
  }
  const cat = arrs => { const out = new Float32Array(arrs.reduce((n, a) => n + a.length, 0)); let o = 0; for (const a of arrs) { out.set(a, o); o += a.length; } return out; };
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(cat(P), 3));
  g.setAttribute('normal', new T.BufferAttribute(cat(N), 3));
  g.setAttribute('uv', new T.BufferAttribute(cat(U), 2));
  g.computeBoundingSphere();
  return g;
}

const unitBox = new T.BoxGeometry(1, 1, 1);
const tmpO = new T.Object3D();
function partMatrix(x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0) {
  tmpO.position.set(x, y, z); tmpO.rotation.set(rx, ry, rz, 'YXZ'); tmpO.scale.set(sx, sy, sz); tmpO.updateMatrix();
  return tmpO.matrix.clone();
}

// 本だなの いたや かべ（たなの 中の 位置 → へやの 位置）
function caseParts(c) {
  const out = [];
  const add = (w, h, d, lx, ly, lz) => {
    const p = C.caseToWorld(c, lx, ly, lz);
    out.push({ geo: unitBox, matrix: partMatrix(p.x, p.y, p.z, w, h, d, c.rot) });
  };
  const { w, d, h } = C.CASE;
  add(w, h, 0.02, 0, h / 2, -d / 2 + 0.01);
  add(0.04, h, d, -w / 2 + 0.02, h / 2, 0);
  add(0.04, h, d, w / 2 - 0.02, h / 2, 0);
  for (let r = 0; r <= C.CASE.rows; r++) add(w - 0.06, 0.03, d - 0.03, 0, C.boardY(r), 0.01);
  add(w + 0.08, 0.07, d + 0.06, 0, h + 0.035, 0.02);
  add(w, 0.05, 0.02, 0, 0.025, d / 2);
  return out;
}

// ---------- 3Dの せかい ----------
export class View {
  constructor(canvas) {
    this.canvas = canvas;
    const r = this.renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    r.outputColorSpace = T.SRGBColorSpace;
    r.toneMapping = T.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = T.PCFSoftShadowMap;
    this.scene = new T.Scene();
    this.scene.background = new T.Color('#140d0a');
    this.scene.fog = new T.Fog('#1b120d', 16, 34);
    this.camera = new T.PerspectiveCamera(62, 1, 0.03, 60);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);
    this.glow = glowTex();
    this.books = [];
    this.anims = new Map();
    this.rowGlow = C.SERIES.map(() => 0);
    this.rowFlash = C.SERIES.map(() => 0);
    this.beaconOn = C.SECTIONS.map(() => 0);
    this.hits = [];
    this.buildRoom();
    this.buildCases();
    this.buildDecor();
    this.buildBooks();
    this.buildSparks();
  }

  buildRoom() {
    const s = this.scene, { x0, x1, z0, z1, h } = C.ROOM, W = x1 - x0, D = z1 - z0;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const floor = new T.Mesh(new T.PlaneGeometry(W, D), new T.MeshStandardMaterial({ map: floorTex(), roughness: 0.55, metalness: 0.05 }));
    floor.rotation.x = -PI / 2; floor.position.set(cx, 0, cz); floor.receiveShadow = true;
    s.add(floor);
    this.floor = floor;
    const rug = new T.Mesh(new T.PlaneGeometry(8, 9.5), new T.MeshStandardMaterial({ map: rugTex(), roughness: 1, color: '#d8c8c0' }));
    rug.rotation.x = -PI / 2; rug.position.set(0, 0.004, -2.6); rug.receiveShadow = true;
    s.add(rug);

    const wallMat = new T.MeshStandardMaterial({ map: wallTex(), roughness: 0.9 });
    const wall = (w, x, z, ry) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), wallMat); m.position.set(x, h / 2, z); m.rotation.y = ry; s.add(m); };
    wall(W, cx, z0, 0); wall(W, cx, z1, PI); wall(D, x0, cz, PI / 2); wall(D, x1, cz, -PI / 2);
    const ceil = new T.Mesh(new T.PlaneGeometry(W, D), new T.MeshStandardMaterial({ map: ceilTex(), roughness: 0.9 }));
    ceil.rotation.x = PI / 2; ceil.position.set(cx, h, cz); s.add(ceil);

    // はり・はばき・まど
    const dark = new T.MeshStandardMaterial({ color: '#2a170c', roughness: 0.7 });
    const parts = [];
    for (let z = z0 + 2; z < z1; z += 3) parts.push({ geo: unitBox, matrix: partMatrix(cx, h - 0.15, z, W, 0.3, 0.3) });
    parts.push({ geo: unitBox, matrix: partMatrix(cx, 3.05, z0 + 0.03, W, 0.12, 0.06) });
    parts.push({ geo: unitBox, matrix: partMatrix(x0 + 0.03, 3.05, cz, 0.06, 0.12, D) });
    parts.push({ geo: unitBox, matrix: partMatrix(x1 - 0.03, 3.05, cz, 0.06, 0.12, D) });
    parts.push({ geo: unitBox, matrix: partMatrix(cx, 3.05, z1 - 0.03, W, 0.12, 0.06) });
    // はしご
    const lad = { x: 0.6, z: z0 + 0.62, tilt: 0.2 };
    for (const dx of [-0.25, 0.25]) parts.push({ geo: unitBox, matrix: partMatrix(lad.x + dx, 1.45, lad.z, 0.05, 3.0, 0.05, 0, -lad.tilt) });
    for (let k = 0; k < 9; k++) {
      const y = 0.25 + k * 0.32;
      parts.push({ geo: unitBox, matrix: partMatrix(lad.x, y, lad.z + (1.45 - y) * Math.tan(lad.tilt), 0.5, 0.03, 0.04) });
    }
    parts.push({ geo: unitBox, matrix: partMatrix(cx, 2.98, z0 + 0.5, W, 0.03, 0.03) });
    const deco = new T.Mesh(mergeParts(parts), dark); deco.castShadow = true; s.add(deco);

    const winMat = new T.MeshBasicMaterial({ map: windowTex(), transparent: true, fog: false });
    const win = (x, z, ry, w = 1.25, hh = 2.1) => { const m = new T.Mesh(new T.PlaneGeometry(w, hh), winMat); m.position.set(x, 3.15 + hh / 2, z); m.rotation.y = ry; s.add(m); };
    for (const x of [-5.4, -1.8, 1.8, 5.4]) win(x, z0 + 0.02, 0);
    for (const z of [-6.5, -2, 2.5]) { win(x0 + 0.02, z, PI / 2); win(x1 - 0.02, z, -PI / 2); }
    // てまえの かべの 大きな まどと とびら
    const bigWin = new T.Mesh(new T.PlaneGeometry(2.2, 3.6), winMat); bigWin.position.set(-2.4, 2.2, z1 - 0.02); bigWin.rotation.y = PI; s.add(bigWin);
    const bigWin2 = bigWin.clone(); bigWin2.position.x = 2.4; s.add(bigWin2);
    const door = new T.Mesh(new T.BoxGeometry(1.4, 2.6, 0.1), new T.MeshStandardMaterial({ map: caseWoodTex(), color: '#7a5038', roughness: 0.6 }));
    door.position.set(0, 1.3, z1 - 0.05); s.add(door);

    // テーブルと ランプ
    const wood = new T.MeshStandardMaterial({ map: caseWoodTex(), color: '#9a6a48', roughness: 0.45 });
    const tparts = [];
    for (const t of C.TABLES) {
      tparts.push({ geo: unitBox, matrix: partMatrix(t.x, 0.76, t.z, t.w, 0.06, t.d) });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) tparts.push({ geo: unitBox, matrix: partMatrix(t.x + sx * (t.w / 2 - 0.08), 0.37, t.z + sz * (t.d / 2 - 0.08), 0.07, 0.74, 0.07) });
      for (const sx of [-1, 1]) for (const k of [0, 1]) {
        const ax = t.x + sx * 0.5, az = t.z + (k ? 0.85 : -0.85), back = k ? 1 : -1;
        tparts.push({ geo: unitBox, matrix: partMatrix(ax, 0.45, az, 0.42, 0.04, 0.42) });
        for (const lx of [-0.18, 0.18]) for (const lz of [-0.18, 0.18]) tparts.push({ geo: unitBox, matrix: partMatrix(ax + lx, 0.22, az + lz, 0.035, 0.44, 0.035) });
        for (const lx of [-0.18, 0.18]) tparts.push({ geo: unitBox, matrix: partMatrix(ax + lx, 0.72, az + back * 0.19, 0.035, 0.52, 0.035) });
        tparts.push({ geo: unitBox, matrix: partMatrix(ax, 0.9, az + back * 0.19, 0.4, 0.14, 0.03) });
      }
    }
    const tables = new T.Mesh(mergeParts(tparts), wood); tables.castShadow = true; tables.receiveShadow = true; s.add(tables);
    this.blockers = [];
    for (const t of C.TABLES) {
      const b = new T.Mesh(new T.BoxGeometry(t.w, 0.8, t.d), new T.MeshBasicMaterial({ visible: false }));
      b.position.set(t.x, 0.4, t.z); s.add(b); this.blockers.push(b);
      const lamp = new T.Group();
      const brass = new T.MeshStandardMaterial({ color: '#c9a050', metalness: 0.8, roughness: 0.35 });
      const base = new T.Mesh(new T.CylinderGeometry(0.08, 0.1, 0.03, 16), brass); base.position.y = 0.015;
      const pole = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.36, 8), brass); pole.position.y = 0.19;
      const shadeM = new T.Mesh(new T.CylinderGeometry(0.06, 0.16, 0.12, 20, 1, true), new T.MeshStandardMaterial({ color: '#1f6b47', emissive: '#2f8a58', emissiveIntensity: 0.6, side: T.DoubleSide, roughness: 0.4 }));
      shadeM.position.y = 0.36;
      const bulb = new T.Mesh(new T.SphereGeometry(0.035, 12, 8), new T.MeshBasicMaterial({ color: '#fff1c8' })); bulb.position.y = 0.33;
      lamp.add(base, pole, shadeM, bulb);
      lamp.position.set(t.x + 0.55, 0.79, t.z - 0.15); s.add(lamp);
      const pl = new T.PointLight('#ffc77a', 3.2, 7, 1.6); pl.position.set(t.x + 0.55, 1.05, t.z - 0.15); s.add(pl);
    }

    // シャンデリア
    const ch = new T.Group(); ch.position.set(0, 4.3, -2.6);
    const ring = new T.Mesh(new T.TorusGeometry(0.75, 0.025, 8, 40), new T.MeshStandardMaterial({ color: '#b58a3e', metalness: 0.8, roughness: 0.35 }));
    ring.rotation.x = PI / 2; ch.add(ring);
    const chain = new T.Mesh(new T.CylinderGeometry(0.01, 0.01, 1.2, 6), ring.material); chain.position.y = 0.6; ch.add(chain);
    const flameMat = new T.MeshBasicMaterial({ color: '#ffe2a0' });
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * PI * 2;
      const f = new T.Mesh(new T.SphereGeometry(0.04, 10, 8), flameMat); f.position.set(Math.cos(a) * 0.75, 0.08, Math.sin(a) * 0.75); f.scale.y = 1.6; ch.add(f);
      const sp = new T.Sprite(new T.SpriteMaterial({ map: this.glow, color: '#ffbe6a', transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.7 }));
      sp.scale.set(0.4, 0.4, 1); sp.position.copy(f.position); ch.add(sp);
    }
    s.add(ch);

    // ひかり
    s.add(new T.HemisphereLight('#ffe3c0', '#3a2216', 0.55));
    const ambient = new T.AmbientLight('#ffd9b0', 0.18); s.add(ambient);
    const sun = new T.DirectionalLight('#ffbf86', 1.6);
    sun.position.set(-5, 9, 9); sun.target.position.set(0, 0, -3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 32 });
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
    s.add(sun, sun.target);
    const chl = new T.PointLight('#ffcf8a', 22, 16, 1.4); chl.position.set(0, 3.9, -2.6); s.add(chl);
    const back = new T.PointLight('#ffb070', 8, 9, 1.5); back.position.set(0, 2.6, -7.8); s.add(back);
    for (const x of [-6.2, 6.2]) { const l = new T.PointLight('#ffb070', 6, 8, 1.5); l.position.set(x, 2.6, -1.5); s.add(l); }

    const fh = new T.Mesh(new T.PlaneGeometry(W, D), new T.MeshBasicMaterial({ visible: false }));
    fh.rotation.x = -PI / 2; fh.position.set(cx, 0, cz); fh.userData.kind = 'floor'; s.add(fh);
    this.floorHit = fh;
  }

  buildCases() {
    const s = this.scene;
    const parts = C.CASES.flatMap(caseParts);
    const mat = new T.MeshStandardMaterial({ map: caseWoodTex(), color: '#c89a78', roughness: 0.62 });
    const m = new T.Mesh(mergeParts(parts), mat); m.receiveShadow = true; m.castShadow = true; s.add(m);
    for (const c of C.CASES) {
      const b = new T.Mesh(new T.BoxGeometry(C.CASE.w, C.CASE.h, C.CASE.d), new T.MeshBasicMaterial({ visible: false }));
      const p = C.caseToWorld(c, 0, C.CASE.h / 2, 0);
      b.position.set(p.x, p.y, p.z); b.rotation.y = c.rot; s.add(b); this.blockers.push(b);
    }

    // かたづける たな：かんばん・れつの なふだ・ばしょの しるし
    this.rowGlowMeshes = [];
    this.beacons = [];
    C.SECTIONS.forEach((sec, si) => {
      const c = C.sectionCase(si), st = signTex(sec);
      const sign = new T.Mesh(new T.PlaneGeometry(1.5, 0.52), new T.MeshStandardMaterial({ map: st, roughness: 0.5, emissive: '#ffffff', emissiveMap: st, emissiveIntensity: 0.45 }));
      const sp = C.caseToWorld(c, 0, C.CASE.h + 0.36, C.CASE.d / 2 + 0.02);
      sign.position.set(sp.x, sp.y, sp.z); sign.rotation.set(-0.12, c.rot, 0, 'YXZ'); s.add(sign);
      const glow = new T.Sprite(new T.SpriteMaterial({ map: this.glow, color: '#ffcf80', transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.35 }));
      const gp = C.caseToWorld(c, 0, C.CASE.h + 0.32, C.CASE.d / 2 + 0.1);
      glow.position.set(gp.x, gp.y, gp.z); glow.scale.set(1.8, 0.8, 1); s.add(glow);
      const beam = new T.Mesh(new T.CylinderGeometry(0.55, 0.55, 3.2, 24, 1, true), new T.MeshBasicMaterial({ map: beamTex(), transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false }));
      const bp = C.caseToWorld(c, 0, 1.6, C.CASE.d / 2 + 0.6);
      beam.position.set(bp.x, bp.y, bp.z); s.add(beam); this.beacons.push(beam);
      for (let r = 0; r < C.PER_CASE; r++) {
        const sIdx = C.seriesAt(si, r), ser = C.SERIES[sIdx];
        const top = C.boardTop(r), rh = C.boardY(r + 1) - 0.015 - top;
        const ghost = new T.Mesh(new T.PlaneGeometry(C.CASE.w - 0.08, rh), new T.MeshBasicMaterial({ map: slotTex(ser), transparent: true, opacity: 0.8 }));
        const gp2 = C.caseToWorld(c, 0, top + rh / 2, -C.CASE.d / 2 + 0.022);
        ghost.position.set(gp2.x, gp2.y, gp2.z); ghost.rotation.y = c.rot; s.add(ghost);
        const pt = plateTex(ser, sec);
        const plate = new T.Mesh(new T.PlaneGeometry(0.9, 0.062), new T.MeshStandardMaterial({ map: pt, roughness: 0.35, metalness: 0.3, emissive: '#ffffff', emissiveMap: pt, emissiveIntensity: 0.25 }));
        // なふだは その れつの 上の いたに つける（いちばん 下の れつでも 目の 高さに ちかく、よみやすい）
        const pp = C.caseToWorld(c, 0, C.boardY(r + 1) - 0.015 - 0.031, C.CASE.d / 2 + 0.006);
        plate.position.set(pp.x, pp.y, pp.z); plate.rotation.y = c.rot; s.add(plate);
        const gl = new T.Mesh(new T.PlaneGeometry(C.CASE.w - 0.04, rh + 0.03), new T.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
        const glp = C.caseToWorld(c, 0, top + rh / 2, C.CASE.d / 2 + 0.012);
        gl.position.set(glp.x, glp.y, glp.z); gl.rotation.y = c.rot; s.add(gl);
        this.rowGlowMeshes[sIdx] = gl;
        const hit = new T.Mesh(new T.PlaneGeometry(C.CASE.w, rh + 0.03), new T.MeshBasicMaterial({ visible: false }));
        const hp = C.caseToWorld(c, 0, top + rh / 2, C.CASE.d / 2 + 0.03);
        hit.position.set(hp.x, hp.y, hp.z); hit.rotation.y = c.rot; hit.userData = { kind: 'row', s: sIdx };
        s.add(hit); this.hits.push(hit);
      }
    });
  }

  // 本だなを うめる かざりの 本（ぜんぶで 数千さつ）
  buildDecor() {
    const list = [];
    const palette = ['#6e1f22', '#1f3550', '#2d4a2b', '#8a5a1e', '#4a2c1a', '#2a2420', '#7a6a4a', '#5a2a4a', '#a0442c', '#24464a', '#b08a4a', '#3b3b5a'];
    const pick = () => {
      const c = new T.Color(palette[Math.floor(rnd() * palette.length)]);
      const hsl = {}; c.getHSL(hsl); c.setHSL(hsl.h + between(-0.02, 0.02), hsl.s * between(0.8, 1.1), hsl.l * between(0.8, 1.25));
      return c;
    };
    const fillRow = (c, r) => {
      const top = C.boardTop(r), room = C.boardY(r + 1) - 0.015 - top;
      let x = -C.CASE.w / 2 + 0.05;
      const end = C.CASE.w / 2 - 0.05;
      let groupColor = pick(), groupLeft = 0, groupH = 0;
      while (x < end - 0.03) {
        if (rnd() < 0.06) { x += between(0.04, 0.14); continue; }
        if (rnd() < 0.05 && end - x > 0.3) {
          // よこに つんだ 本
          const n = 2 + Math.floor(rnd() * 3); let y = top;
          const dd = between(0.2, 0.26), ww = between(0.22, 0.28);
          for (let k = 0; k < n; k++) {
            const th = between(0.03, 0.06);
            list.push({ c, lx: x + ww / 2 + between(-0.01, 0.01), ly: y + th / 2, lz: C.CASE.d / 2 - 0.03 - dd / 2, w: th, h: ww, d: dd, rz: PI / 2, ry: between(-0.08, 0.08), col: pick() });
            y += th;
          }
          x += ww + 0.02; continue;
        }
        if (groupLeft <= 0) { groupColor = pick(); groupLeft = rnd() < 0.4 ? 3 + Math.floor(rnd() * 5) : 1; groupH = Math.min(room - 0.02, between(0.24, 0.4)); }
        groupLeft--;
        const w = between(0.03, 0.075), hh = Math.min(room - 0.02, groupH * between(0.97, 1.03)), dd = between(0.2, 0.3);
        if (x + w > end) break;
        list.push({ c, lx: x + w / 2, ly: top + hh / 2, lz: C.CASE.d / 2 - 0.02 - dd / 2 - between(0, 0.03), w, h: hh, d: dd, rz: 0, ry: 0, col: groupColor.clone().offsetHSL(0, 0, between(-0.03, 0.03)) });
        x += w + 0.002;
      }
    };
    for (const c of C.CASES) for (let r = 0; r < C.CASE.rows; r++) if (c.sec < 0) fillRow(c, r);
    // テーブルの 上の 本
    for (const t of C.TABLES) {
      let y = 0.79;
      for (let k = 0; k < 4; k++) {
        const th = between(0.03, 0.06);
        list.push({ world: true, x: t.x - 0.4 + between(-0.03, 0.03), y: y + th / 2, z: t.z + 0.1, w: th, h: 0.28, d: 0.21, rz: PI / 2, ry: between(-0.4, 0.4), col: pick() });
        y += th;
      }
    }
    const pagesMat = new T.MeshStandardMaterial({ color: '#efe4c8', map: pagesTex(), roughness: 0.9 });
    pagesMat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', ''); };
    pagesMat.customProgramCacheKey = () => 'pages-no-tint';
    const body = new T.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 });
    const spine = new T.MeshStandardMaterial({ map: decorSpineTex(), roughness: 0.5 });
    const inst = new T.InstancedMesh(unitBox, [body, body, pagesMat, pagesMat, spine, pagesMat], list.length);
    const q = new T.Quaternion(), e = new T.Euler(), m = new T.Matrix4(), v = new T.Vector3(), sc = new T.Vector3();
    list.forEach((b, i) => {
      if (b.world) { v.set(b.x, b.y, b.z); e.set(0, b.ry, b.rz, 'YXZ'); }
      else { const p = C.caseToWorld(b.c, b.lx, b.ly, b.lz); v.set(p.x, p.y, p.z); e.set(0, b.c.rot + b.ry, b.rz, 'YXZ'); }
      q.setFromEuler(e); sc.set(b.w, b.h, b.d);
      m.compose(v, q, sc); inst.setMatrixAt(i, m); inst.setColorAt(i, b.col);
    });
    inst.receiveShadow = true;
    this.scene.add(inst);
    this.decorCount = list.length;
  }

  buildBooks() {
    const spineMat = new T.MeshStandardMaterial({ map: spineAtlas(), roughness: 0.55 });
    const restMat = new T.MeshStandardMaterial({ map: coverAtlas(), roughness: 0.6 });
    this.bookMats = [spineMat, restMat];
    this.bookGeos = new Map();
  }

  // ゲームが はじまるたびに 本を 作りなおす
  setGame(g) {
    for (const b of this.books) this.scene.remove(b);
    this.books = g.items.map(it => {
      const key = it.s * C.VOLS + it.v;
      if (!this.bookGeos.has(key)) this.bookGeos.set(key, bookGeometry(it.s, it.v));
      const m = new T.Mesh(this.bookGeos.get(key), this.bookMats);
      m.castShadow = true; m.receiveShadow = true;
      m.userData = { kind: 'book', id: it.id };
      this.scene.add(m);
      return m;
    });
    this.anims.clear();
    this.g = g;
    this.updateBooks(0, true);
  }

  buildSparks() {
    const N = 600;
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(new Float32Array(N * 3), 3));
    geo.setAttribute('color', new T.BufferAttribute(new Float32Array(N * 3), 3));
    const pts = new T.Points(geo, new T.PointsMaterial({ size: 0.07, map: this.glow, vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true }));
    pts.frustumCulled = false;
    this.scene.add(pts);
    this.sparks = { pts, N, list: [] };
  }
  burst(p, color = '#ffd27a', n = 30, spread = 0.5, up = 1.2) {
    const col = new T.Color(color);
    for (let i = 0; i < n; i++) {
      if (this.sparks.list.length >= this.sparks.N) this.sparks.list.shift();
      this.sparks.list.push({
        x: p.x + between(-spread, spread) * 0.3, y: p.y + between(-0.1, 0.1), z: p.z + between(-spread, spread) * 0.3,
        vx: between(-spread, spread), vy: between(0.2, up), vz: between(-spread, spread),
        life: between(0.6, 1.3), max: 1.3, c: col,
      });
    }
  }

  // ---------- 本の うごき ----------
  goal(it, out) {
    const ser = C.SERIES[it.s];
    if (it.state === 'floor') {
      const p = C.floorPose(this.g, it);
      out.p.set(p.x, p.y, p.z);
      out.q.setFromEuler(new T.Euler(p.roll, p.yaw, PI / 2, 'YXZ'));
      out.s = 1;
    } else if (it.state === 'shelf') {
      const p = C.slotPose(it.s, it.v);
      out.p.set(p.x, p.y, p.z);
      out.q.setFromEuler(new T.Euler(0, p.yaw, 0));
      out.s = 1;
    } else {
      const k = this.g.hand.indexOf(it.id);
      let y = 0;
      for (let i = 0; i < k; i++) y += C.SERIES[this.g.items[this.g.hand[i]].s].th;
      const sc = 0.26;
      const bob = this.bob || 0;
      const local = new T.Vector3(0.22 + (k % 2) * 0.005, -0.21 + bob + (y + ser.th / 2) * sc * 1.05, -0.42);
      out.p.copy(local.applyMatrix4(this.camera.matrixWorld));
      const lq = new T.Quaternion().setFromEuler(new T.Euler(0.75, -0.3 + (k % 3) * 0.04, PI / 2, 'YXZ'));
      out.q.copy(this.camera.quaternion).multiply(lq);
      out.s = sc;
    }
    return out;
  }

  // 本を とばす（ふわっと 弧を えがいて うごく）
  fly(id, { dur = 0.45, arc = 0.35, delay = 0, spin = 0 } = {}) {
    const m = this.books[id];
    this.anims.set(id, { t: -delay, dur, arc, spin, p: m.position.clone(), q: m.quaternion.clone(), s: m.scale.x });
  }

  updateBooks(dt, snap = false) {
    const goal = { p: new T.Vector3(), q: new T.Quaternion(), s: 1 };
    const tmpQ = new T.Quaternion(), yAxis = new T.Vector3(0, 1, 0);
    this.camera.updateMatrixWorld();
    for (const it of this.g.items) {
      const m = this.books[it.id];
      this.goal(it, goal);
      const a = this.anims.get(it.id);
      if (snap) { m.position.copy(goal.p); m.quaternion.copy(goal.q); m.scale.setScalar(goal.s); continue; }
      if (a) {
        a.t += dt;
        if (a.t < 0) continue;
        const t = Math.min(1, a.t / a.dur), e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        m.position.lerpVectors(a.p, goal.p, e);
        m.position.y += Math.sin(PI * t) * a.arc;
        m.quaternion.slerpQuaternions(a.q, goal.q, e);
        if (a.spin) m.quaternion.premultiply(tmpQ.setFromAxisAngle(yAxis, a.spin * Math.sin(PI * t)));
        m.scale.setScalar(a.s + (goal.s - a.s) * e);
        if (t >= 1) { this.anims.delete(it.id); this.onLand && this.onLand(it); }
      } else {
        const k = it.state === 'hand' ? 1 : 1 - Math.exp(-dt * 14);
        m.position.lerp(goal.p, k);
        m.quaternion.slerp(goal.q, k);
        m.scale.setScalar(m.scale.x + (goal.s - m.scale.x) * k);
      }
    }
  }

  // ---------- タッチした ものを しらべる ----------
  hitTest(nx, ny) {
    const rc = new T.Raycaster();
    rc.setFromCamera(new T.Vector2(nx, ny), this.camera);
    const targets = [...this.hits, ...this.blockers, this.floorHit, ...this.books.filter(b => this.g.items[b.userData.id].state === 'floor')];
    const hit = rc.intersectObjects(targets, false)[0];
    if (!hit) return null;
    const u = hit.object.userData;
    if (u.kind === 'book') return { kind: 'book', id: u.id, point: hit.point };
    if (u.kind === 'row') return { kind: 'row', s: u.s, point: hit.point };
    if (u.kind === 'floor') return { kind: 'floor', point: hit.point };
    return { kind: 'block', point: hit.point };
  }

  // ---------- まいフレーム ----------
  update(dt, t) {
    this.updateBooks(dt);
    this.rowGlowMeshes.forEach((m, s) => {
      this.rowFlash[s] = Math.max(0, this.rowFlash[s] - dt * 0.8);
      const guide = this.rowGlow[s] ? 0.16 + 0.1 * Math.sin(t * 5) : 0;
      m.material.opacity = Math.max(guide, this.rowFlash[s] * 0.55);
    });
    this.beacons.forEach((b, i) => {
      const target = this.beaconOn[i] ? 0.55 + 0.15 * Math.sin(t * 3) : 0;
      b.material.opacity += (target - b.material.opacity) * Math.min(1, dt * 5);
      b.visible = b.material.opacity > 0.01;
    });
    const sp = this.sparks, pos = sp.pts.geometry.getAttribute('position'), col = sp.pts.geometry.getAttribute('color');
    sp.list = sp.list.filter(p => (p.life -= dt) > 0);
    for (let i = 0; i < sp.N; i++) {
      const p = sp.list[i];
      if (!p) { pos.setXYZ(i, 0, -10, 0); col.setXYZ(i, 0, 0, 0); continue; }
      p.vy -= 1.2 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const k = Math.min(1, p.life / p.max * 1.5);
      pos.setXYZ(i, p.x, p.y, p.z); col.setXYZ(i, p.c.r * k, p.c.g * k, p.c.b * k);
    }
    pos.needsUpdate = true; col.needsUpdate = true;
  }

  render() { this.renderer.render(this.scene, this.camera); }

  resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 1.2 ? 72 : 62;
    this.camera.updateProjectionMatrix();
  }
}

// ---------- かんばんと なふだ ----------
function signTex(sec) {
  return canvasTex(512, 176, (x, w, h) => {
    x.fillStyle = '#2b170c'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#d9b25a'; x.lineWidth = 6; x.strokeRect(8, 8, w - 16, h - 16);
    x.fillStyle = sec.color; x.beginPath(); x.arc(96, h / 2, 56, 0, PI * 2); x.fill();
    x.strokeStyle = '#d9b25a'; x.lineWidth = 4; x.stroke();
    drawIcon(x, sec.icon, 96, h / 2, 34, '#fff1cf');
    const text = sec.name + 'の 本';
    x.font = `bold 58px ${FONT}`;
    const k = Math.min(1, 320 / x.measureText(text).width);
    x.fillStyle = '#fff1cf'; x.font = `bold ${Math.floor(58 * k)}px ${FONT}`; x.textAlign = 'left'; x.textBaseline = 'middle';
    x.fillText(text, 172, h / 2 + 4);
  });
}
function plateTex(ser, sec) {
  return canvasTex(768, 68, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#e8cf8a'); g.addColorStop(1, '#a8823c');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#6b4a1a'; x.lineWidth = 3; x.strokeRect(3, 3, w - 6, h - 6);
    drawIcon(x, sec.icon, 40, h / 2, 18, '#3a250c');
    x.fillStyle = '#2a1a08'; x.font = `bold 40px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(ser.title, w / 2 + 16, h / 2 + 2);
  });
}
function slotTex(ser) {
  return canvasTex(512, 180, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    const sw = w / ((C.CASE.w - 0.08) / C.CASE.slotW);
    const bh = h * (ser.h / 0.41);
    x.setLineDash([8, 7]); x.lineWidth = 3;
    for (let v = 0; v < C.VOLS; v++) {
      const cx = w / 2 + C.slotX(v) / (C.CASE.w - 0.08) * w;
      x.strokeStyle = 'rgba(255,236,190,.45)';
      x.strokeRect(cx - sw * 0.36, h - bh, sw * 0.72, bh - 4);
      x.fillStyle = 'rgba(255,236,190,.6)'; x.font = `bold 30px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(String(v + 1), cx, h - bh / 2);
    }
  });
}
