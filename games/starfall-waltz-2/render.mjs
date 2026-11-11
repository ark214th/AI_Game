// Canvas 2D による描画。シミュレーションの状態を読むだけで、書き換えない。背景は gl.mjs のシェーダーが別のキャンバスに描く
import {W, H, TAU, COLORS, RAINBOW, BULLET_TYPES, BOMB_FRAMES, STOP_FRAMES, FORT_FRAMES, CHARACTERS} from './consts.mjs';
import {optionOffsets, BOSSES, ATTACKS, STAGES} from './core.mjs';
import {SONGS} from './songs.mjs';
import {Backdrop} from './gl.mjs';
import {drawCharacter, starPath, gearPath, rgba, mix} from './art.mjs';

const SERIF = '"Cormorant Garamond","Palatino Linotype",Palatino,Georgia,"Hiragino Mincho ProN","Yu Mincho",serif';
const SANS = '-apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic",sans-serif';
const GREEK = 'αβγδεζηθικλμνξοπρστυφχψω';
const ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
const hexOf = c => COLORS[c] || c;
const fmt = n => Math.floor(n).toLocaleString('en-US');
const hex3 = hex => { const n = parseInt(hex.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

function sparklePath(c, L, w) {
  c.beginPath();
  c.moveTo(0, -L); c.lineTo(w, -w); c.lineTo(L * .72, 0); c.lineTo(w, w); c.lineTo(0, L * .9); c.lineTo(-w, w); c.lineTo(-L * .72, 0); c.lineTo(-w, -w);
  c.closePath();
}
function glow(c, r, hex, a) {
  const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, rgba(hex, a)); g.addColorStop(.4, rgba(hex, a * .42)); g.addColorStop(1, rgba(hex, 0));
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
}
// 実行時の光彩は色ごとにキャッシュした画像で描く（毎フレームのグラデーション生成を避ける）
const GLOWS = new Map();
function fastGlow(c, r, hex, a) {
  let img = GLOWS.get(hex);
  if (!img) {
    img = document.createElement('canvas'); img.width = img.height = 128;
    const x = img.getContext('2d'); x.translate(64, 64); glow(x, 64, hex, 1); GLOWS.set(hex, img);
  }
  const ga = c.globalAlpha; c.globalAlpha = ga * a; c.drawImage(img, -r, -r, r * 2, r * 2); c.globalAlpha = ga;
}
const blit = (c, s, x, y, w, h) => c.drawImage(s.img, s.sx, s.sy, s.sw, s.sh, x, y, w, h);

export class Renderer {
  constructor(canvas, bgCanvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.back = new Backdrop(bgCanvas); this.bgCanvas = bgCanvas;
    this.K = 1; this.clock = 0; this.scroll = 0; this.parts = []; this.notices = []; this.popups = [];
    this.cutin = null; this.stageCard = null; this.bgm = null; this.shake = 0; this.flash = 0; this.flashColor = '#fff';
    this.spellBg = 0; this.spellBoss = 0; this.hpShown = 1; this.history = null; this.tickPulse = 0; this.beatPulse = 0;
    this.dark = 0; this.stopFx = 0; this.fortFx = 0; this.fx = true; this.pulse = 0;
    const rnd = (() => { let s = 12345; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    this.stars = Array.from({length: 110}, (_, i) => ({x: rnd() * W, y: rnd() * H, s: .5 + rnd() * 1.4, layer: i % 3, ph: rnd() * TAU}));
    this.pcv = [0, 1, 2].map(() => document.createElement('canvas'));
  }
  reset() {
    this.parts = []; this.notices = []; this.popups = []; this.cutin = null; this.stageCard = null; this.bgm = null;
    this.shake = 0; this.flash = 0; this.spellBg = 0; this.hpShown = 1; this.dark = 0; this.stopFx = 0; this.fortFx = 0;
  }
  setQuality(high) { this.fx = high; this.bgCanvas.style.visibility = high && this.back.ok ? 'visible' : 'hidden'; }
  resize(pxW, pxH) {
    this.canvas.width = pxW; this.canvas.height = pxH; this.K = pxW / W;
    this.back.resize(Math.max(2, Math.round(pxW * .62)), Math.max(2, Math.round(pxH * .62)));
    // にじむ光（ブルーム）用の縮小バッファ
    this.b1 = document.createElement('canvas'); this.b1.width = Math.ceil(pxW / 4); this.b1.height = Math.ceil(pxH / 4);
    this.b2 = document.createElement('canvas'); this.b2.width = Math.ceil(pxW / 10); this.b2.height = Math.ceil(pxH / 10);
    this.darkCv = document.createElement('canvas'); this.darkCv.width = W / 2; this.darkCv.height = H / 2;
    for (const cv of this.pcv) { cv.width = Math.ceil(180 * this.K); cv.height = Math.ceil(230 * this.K); }
    this.build(); this.setQuality(this.fx);
  }
  sprite(size, draw) {
    const px = Math.max(2, Math.ceil(size * this.K)), c = document.createElement('canvas');
    c.width = c.height = px;
    const x = c.getContext('2d'); x.scale(px / size, px / size); x.translate(size / 2, size / 2); draw(x);
    return {img: c, size};
  }
  // 全ての弾の絵を1枚の画像にまとめる（描画時のテクスチャ切り替えを減らす）
  atlas(entries) {
    const pad = 2, maxW = 2048; let x = 0, y = 0, rowH = 0;
    for (const e of entries) {
      e.px = Math.max(2, Math.ceil(e.size * this.K));
      if (x + e.px > maxW) { x = 0; y += rowH + pad; rowH = 0; }
      e.sx = x; e.sy = y; x += e.px + pad; rowH = Math.max(rowH, e.px);
    }
    const img = document.createElement('canvas'); img.width = maxW; img.height = y + rowH;
    const c = img.getContext('2d');
    for (const e of entries) {
      c.save(); c.translate(e.sx + e.px / 2, e.sy + e.px / 2); c.scale(e.px / e.size, e.px / e.size); e.draw(c); c.restore();
      e.out = {img, sx: e.sx, sy: e.sy, sw: e.px, sh: e.px, size: e.size};
    }
  }
  build() {
    this.bs = {};
    const entries = [];
    for (const type of Object.keys(BULLET_TYPES)) {
      this.bs[type] = {};
      for (const [name, hex] of Object.entries(COLORS)) {
        const s = BULLET_TYPES[type].size;
        entries.push({type, name, size: s * (type === 'big' || type === 'bubble' ? 3.2 : 4.4), draw: c => this.drawBulletShape(c, type, s, hex)});
      }
    }
    this.atlas(entries);
    for (const e of entries) this.bs[e.type][e.name] = e.out;
    this.glows = {};
    for (const [name, hex] of Object.entries(COLORS)) this.glows[name] = this.sprite(32, c => glow(c, 16, hex, .9));
    this.whiteGlow = this.sprite(64, c => { const g = c.createRadialGradient(0, 0, 0, 0, 0, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,250,230,.5)'); g.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = g; c.fillRect(-32, -32, 64, 64); });
    this.items = {
      power: this.sprite(14, c => this.itemBox(c, 4.6, '#e83a5a', 'P')),
      bigPower: this.sprite(22, c => this.itemBox(c, 7.4, '#e83a5a', 'P')),
      point: this.sprite(14, c => this.itemBox(c, 4.6, '#3f6dff', '✦')),
      star: this.sprite(10, c => { c.fillStyle = '#b7ffcf'; starPath(c, 4, 1.8, 4, 0); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 1.2, 0, TAU); c.fill(); }),
    };
    const beam = (w, h, top, bottom) => c => { const g = c.createLinearGradient(0, -h, 0, h); g.addColorStop(0, top); g.addColorStop(1, bottom); c.fillStyle = g; c.beginPath(); c.roundRect(-w, -h, w * 2, h * 2, w); c.fill(); };
    this.shotSpr = {
      main: this.sprite(20, beam(1.6, 9, 'rgba(255,255,255,.95)', 'rgba(200,180,255,0)')),
      needle: this.sprite(24, beam(1.5, 11, 'rgba(230,255,255,1)', 'rgba(80,200,255,0)')),
      hand: this.sprite(30, c => { c.fillStyle = 'rgba(255,225,150,.95)'; c.beginPath(); c.moveTo(0, -14); c.lineTo(2.6, -4); c.lineTo(1.2, 13); c.lineTo(-1.2, 13); c.lineTo(-2.6, -4); c.closePath(); c.fill(); c.fillStyle = '#fff'; c.fillRect(-.6, -11, 1.2, 20); }),
      star: this.sprite(12, c => { c.fillStyle = 'rgba(255,215,120,.95)'; starPath(c, 5, 2.2, 4, 0); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 1.3, 0, TAU); c.fill(); }),
      gear: this.sprite(12, c => { c.fillStyle = 'rgba(255,190,110,.95)'; gearPath(c, 5, 7, 0, .3); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 1.5, 0, TAU); c.fill(); }),
    };
    this.circles = BOSSES.map(b => this.sprite(170, c => this.magicCircle(c, 80, b.color)));
    this.clockFace = this.sprite(300, c => this.clockDial(c, 146));
    this.vignette = this.sprite(Math.max(W, H) * 1.3, c => {
      const r = Math.max(W, H) * .65, g = c.createRadialGradient(0, 0, r * .45, 0, 0, r);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.5)'); c.fillStyle = g; c.fillRect(-r, -r, 2 * r, 2 * r);
    });
  }
  itemBox(c, s, col, label) {
    c.shadowColor = col; c.shadowBlur = s;
    c.fillStyle = col; c.beginPath(); c.roundRect(-s, -s, s * 2, s * 2, s * .35); c.fill();
    c.shadowBlur = 0; c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = s * .16; c.stroke();
    c.fillStyle = '#fff'; c.font = `700 ${s * 1.45}px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, 0, s * .08);
  }
  // 弾は「白い芯＋色の縁＋外側の光」。背景や演出に埋もれず、形で種類がわかるようにする
  drawBulletShape(c, type, s, hex) {
    const dark = mix(hex, '#000000', .45), light = mix(hex, '#ffffff', .5);
    const body = (path, core, gx = 1, gy = 1) => {
      c.save(); c.scale(gx, gy); glow(c, s * 1.9, hex, .5); c.restore();
      c.fillStyle = hex; path(1); c.fill(); c.strokeStyle = dark; c.lineWidth = s * .14; c.stroke();
      c.fillStyle = '#fff'; path(core); c.fill();
    };
    switch (type) {
      case 'pellet': case 'orb':
        body(k => { c.beginPath(); c.arc(0, 0, s * k, 0, TAU); }, .58); break;
      case 'big': {
        glow(c, s * 1.58, hex, .6);
        const g = c.createRadialGradient(0, 0, 0, 0, 0, s);
        g.addColorStop(0, '#fff'); g.addColorStop(.5, '#fff'); g.addColorStop(.78, light); g.addColorStop(.93, hex); g.addColorStop(1, rgba(hex, .2));
        c.fillStyle = g; c.beginPath(); c.arc(0, 0, s, 0, TAU); c.fill(); break;
      }
      case 'bubble': {
        glow(c, s * 1.55, hex, .35);
        const g = c.createRadialGradient(0, 0, s * .4, 0, 0, s);
        g.addColorStop(0, rgba(hex, .12)); g.addColorStop(.7, rgba(hex, .3)); g.addColorStop(.92, light); g.addColorStop(1, rgba(hex, .5));
        c.fillStyle = g; c.beginPath(); c.arc(0, 0, s, 0, TAU); c.fill();
        c.strokeStyle = '#fff'; c.lineWidth = s * .09; c.beginPath(); c.arc(0, 0, s * .94, 0, TAU); c.stroke();
        c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.ellipse(-s * .38, -s * .42, s * .22, s * .12, -.7, 0, TAU); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, s * .34, 0, TAU); c.fill(); c.strokeStyle = hex; c.lineWidth = s * .08; c.stroke(); break;
      }
      case 'rice':
        body(k => { c.beginPath(); c.ellipse(0, 0, s * 1.3 * (k < 1 ? .6 : 1), s * .62 * (k < 1 ? .48 : 1), 0, 0, TAU); }, .6, 1.35, .62); break;
      case 'shard':
        body(k => { c.beginPath(); c.moveTo(s * 1.55 * k, 0); c.lineTo(0, s * .55 * k); c.lineTo(-s * 1.15 * k, 0); c.lineTo(0, -s * .55 * k); c.closePath(); }, .55, 1.4, .6); break;
      case 'petal':
        body(k => { c.beginPath(); c.moveTo(s * 1.5 * k, 0); c.quadraticCurveTo(0, s * 1.05 * k, -s * 1.4 * k, 0); c.quadraticCurveTo(0, -s * 1.05 * k, s * 1.5 * k, 0); }, .55, 1.4, .7); break;
      case 'drop':
        body(k => { c.beginPath(); c.moveTo(-s * 1.6 * k, 0); c.quadraticCurveTo(-s * .2 * k, -s * .95 * k, s * .7 * k, -s * .62 * k); c.arc(s * .7 * k, 0, s * .62 * k, -Math.PI / 2, Math.PI / 2); c.quadraticCurveTo(-s * .2 * k, s * .95 * k, -s * 1.6 * k, 0); }, .55, 1.4, .7); break;
      case 'quill':
        c.save(); c.scale(1.5, .5); glow(c, s * 1.6, hex, .5); c.restore();
        c.fillStyle = hex; c.beginPath(); c.moveTo(s * 1.8, 0); c.quadraticCurveTo(s * .4, s * .7, -s * 1.5, s * .34); c.lineTo(-s * 1.1, 0); c.lineTo(-s * 1.5, -s * .34); c.quadraticCurveTo(s * .4, -s * .7, s * 1.8, 0); c.fill();
        c.strokeStyle = dark; c.lineWidth = s * .1; c.stroke();
        c.strokeStyle = '#fff'; c.lineWidth = s * .2; c.lineCap = 'round'; c.beginPath(); c.moveTo(s * 1.4, 0); c.lineTo(-s * 1.0, 0); c.stroke(); break;
      case 'star':
        glow(c, s * 1.8, hex, .5);
        c.fillStyle = hex; starPath(c, s * 1.2, s * .52); c.fill();
        c.strokeStyle = '#fff'; c.lineWidth = s * .13; c.stroke();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, s * .3, 0, TAU); c.fill(); break;
      case 'crescent':
        glow(c, s * 1.8, hex, .5);
        c.fillStyle = hex; c.beginPath(); c.arc(0, 0, s * 1.05, .55, TAU - .55); c.arc(s * .62, 0, s * .82, TAU - .9, .9, true); c.closePath(); c.fill();
        c.strokeStyle = '#fff'; c.lineWidth = s * .13; c.stroke();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(-s * .5, 0, s * .34, 0, TAU); c.fill(); break;
      case 'note':
        glow(c, s * 1.8, hex, .5);
        c.strokeStyle = hex; c.lineWidth = s * .26; c.lineCap = 'round';
        c.beginPath(); c.moveTo(s * .42, s * .3); c.lineTo(s * .42, -s * 1.1); c.quadraticCurveTo(s * 1.15, -s * .8, s * .95, -s * .2); c.stroke();
        c.fillStyle = hex; c.beginPath(); c.ellipse(-s * .1, s * .38, s * .68, s * .52, -.4, 0, TAU); c.fill();
        c.strokeStyle = dark; c.lineWidth = s * .1; c.stroke();
        c.fillStyle = '#fff'; c.beginPath(); c.ellipse(-s * .1, s * .38, s * .38, s * .28, -.4, 0, TAU); c.fill(); break;
      case 'ring':
        glow(c, s * 1.7, hex, .4);
        c.strokeStyle = hex; c.lineWidth = s * .42; c.beginPath(); c.arc(0, 0, s * .75, 0, TAU); c.stroke();
        c.strokeStyle = '#fff'; c.lineWidth = s * .14; c.stroke(); break;
      case 'comet': {
        const g = c.createLinearGradient(-s * 2, 0, s * .6, 0); g.addColorStop(0, rgba(hex, 0)); g.addColorStop(1, rgba(light, .85));
        c.fillStyle = g; c.beginPath(); c.moveTo(-s * 2, 0); c.quadraticCurveTo(0, -s * .9, s * .6, -s * .62); c.lineTo(s * .6, s * .62); c.quadraticCurveTo(0, s * .9, -s * 2, 0); c.fill();
        c.save(); c.translate(s * .5, 0); glow(c, s * 1.5, hex, .6); c.restore();
        c.fillStyle = light; c.beginPath(); c.arc(s * .5, 0, s * .7, 0, TAU); c.fill(); c.strokeStyle = hex; c.lineWidth = s * .12; c.stroke();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(s * .5, 0, s * .44, 0, TAU); c.fill(); break;
      }
    }
  }
  magicCircle(c, R, col) {
    c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 1.3;
    for (const r of [R, R * .93, R * .66, R * .3]) { c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke(); }
    for (let i = 0; i < 48; i++) { const a = i * TAU / 48, l = i % 4 ? .96 : .9; c.beginPath(); c.moveTo(Math.cos(a) * R * l, Math.sin(a) * R * l); c.lineTo(Math.cos(a) * R * .93, Math.sin(a) * R * .93); c.stroke(); }
    c.font = `${R * .12}px ${SERIF}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 0; i < 24; i++) { c.save(); c.rotate(i * TAU / 24); c.fillText(GREEK[i], 0, -R * .8); c.restore(); }
    // 五線と音符の代わりに、内側へ三重の星形
    for (const [n, rot] of [[6, 0], [6, Math.PI / 6]]) { c.beginPath(); for (let i = 0; i < n; i++) { const a = rot + i * TAU / n * 2; c.lineTo(Math.cos(a) * R * .66, Math.sin(a) * R * .66); } c.closePath(); c.stroke(); }
    starPath(c, R * .3, R * .13, 8, 0); c.stroke();
  }
  clockDial(c, R) {
    c.strokeStyle = 'rgba(255,215,140,.85)'; c.fillStyle = 'rgba(255,215,140,.9)';
    for (const [r, w] of [[R, 2.4], [R * .93, 1], [R * .68, 1.2]]) { c.lineWidth = w; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke(); }
    for (let i = 0; i < 60; i++) { const a = i * TAU / 60, l = i % 5 ? .89 : .82; c.lineWidth = i % 5 ? 1 : 2.4; c.beginPath(); c.moveTo(Math.cos(a) * R * l, Math.sin(a) * R * l); c.lineTo(Math.cos(a) * R * .93, Math.sin(a) * R * .93); c.stroke(); }
    c.font = `600 ${R * .12}px ${SERIF}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12 - Math.PI / 2; c.fillText(ROMAN[i], Math.cos(a) * R * .76, Math.sin(a) * R * .76); }
  }

  // ================= イベント → 演出 =================
  spark(x, y, color, n, speed = 3, life = 22, size = 1.4) {
    for (let i = 0; i < n && this.parts.length < 2600; i++) {
      const a = Math.random() * TAU, v = speed * (.3 + Math.random() * .7);
      this.parts.push({k: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, color: hexOf(color), size});
    }
  }
  ring(x, y, color, r0, r1, life, width = 2) { this.parts.push({k: 'ring', x, y, r0, r1, life, max: life, color: hexOf(color), width}); }
  notice(text, sub = '', color = '#fff4c9', life = 110, y = 150) { this.notices = this.notices.filter(n => n.y !== y); this.notices.push({text, sub, color, life, max: life, y}); }
  handle(e, g) {
    switch (e.type) {
      case 'cancel': if (this.parts.length < 2400) this.parts.push({k: 'fade', x: e.x, y: e.y, bt: e.bt, bc: e.color, life: 16, max: 16}); break;
      case 'graze': this.spark(e.x, e.y, g.fort ? '#ffe28a' : '#ffffff', 2, 2.4, 14, 1); break;
      case 'shotHit': if (Math.random() < .5) this.spark(e.x, e.y, e.kind === 'star' || e.kind === 'gear' || e.kind === 'hand' ? '#ffd27a' : '#bfe8ff', 1, 2, 10, 1); break;
      case 'enemyDown': {
        const small = e.kind === 'wisp' || e.kind === 'shade' || e.kind === 'book' || e.kind === 'jelly';
        this.spark(e.x, e.y, e.color, small ? 10 : 26, 3.5, 26, 1.6);
        this.ring(e.x, e.y, e.color, 4, small ? 26 : 56, 20, 2);
        this.parts.push({k: 'glow', x: e.x, y: e.y, r: small ? 22 : 50, life: 16, max: 16, color: e.color});
        if (!small) this.shake = Math.max(this.shake, 4);
        break;
      }
      case 'hit': this.flash = .25; this.flashColor = '#ff2d55'; break;
      case 'death':
        this.spark(e.x, e.y, '#ffffff', 40, 6, 40, 2); this.spark(e.x, e.y, COLORS.gold, 30, 4, 50, 1.6);
        this.ring(e.x, e.y, '#ffffff', 4, 120, 30, 4); this.ring(e.x, e.y, COLORS.red, 4, 80, 26, 2);
        this.shake = 12; this.flash = .35; this.flashColor = '#ffffff';
        break;
      case 'bomb': {
        const stop = e.kind === 'stop', name = stop ? 'GRAND PAUSE' : 'SUPERNOVA';
        this.bombStart = this.clock; this.flash = stop ? .4 : .55; this.flashColor = stop ? '#cfe0ff' : '#fff1c4'; this.shake = stop ? 2 : 6;
        if (!stop) { this.spark(e.x, e.y, COLORS.gold, 50, 7, 50, 2); this.spark(e.x, e.y, COLORS.cyan, 30, 5, 50, 1.6); }
        else this.ring(e.x, e.y, '#ffe3a0', 300, 20, 30, 3);
        this.notice(e.death ? `LAST-SECOND ${stop ? 'PAUSE' : 'NOVA'}!` : name, e.death ? '間一髪 ── 喰らいボム成功！' : stop ? '時よ、止まれ' : '', e.death ? '#ffe28a' : '#fff4c9', e.death ? 120 : 70, e.death ? 262 : 282);
        break;
      }
      case 'stopEnd': this.flash = .3; this.flashColor = '#fff1c4'; break;
      case 'fortissimo':
        this.flash = .4; this.flashColor = '#ffe9a8'; this.shake = 4;
        this.ring(e.x, e.y, '#ffe28a', 8, 90, 26, 4); this.ring(e.x, e.y, '#ffffff', 8, 150, 36, 2);
        this.spark(e.x, e.y, '#ffe28a', 40, 6, 46, 2);
        this.notice('FORTISSIMO!', '共鳴 ── ショット強化・全回収・被弾を一度だけ防ぐ', '#ffe28a', 150, 240); break;
      case 'guard':
        this.flash = .5; this.flashColor = '#ffffff'; this.shake = 8;
        for (let i = 0; i < 3; i++) this.ring(e.x, e.y, i % 2 ? '#ffe28a' : '#ffffff', 6, 80 + i * 60, 30 + i * 8, 3);
        this.spark(e.x, e.y, '#ffe28a', 50, 7, 50, 2);
        this.notices = this.notices.filter(n => n.y !== 240); this.notice('RESONANCE GUARD', '共鳴が身代わりになった', '#fff4c9', 110, 240); break;
      case 'spell': {
        const def = ATTACKS[e.id];
        this.cutin = {t: 0, boss: e.boss, def};
        this.flash = .3; this.flashColor = BOSSES[e.boss].color;
        break;
      }
      case 'capture': this.notice('SPELL CAPTURED!', `Get Spell Aria Bonus  ${fmt(e.bonus)}`, '#fff1a8', 150, 130); this.flash = .35; this.flashColor = '#ffffff'; break;
      case 'spellFail': this.notice(e.timeout ? 'TIME OUT' : 'BONUS FAILED', '', '#c9c2ff', 90, 130); break;
      case 'extend': this.notice('EXTEND!', '残機 +1', '#ff9ec9', 130, 200); break;
      case 'bombGet': this.notice('BOMB +1', '', '#9fe6ff', 100, 220); break;
      case 'fullPower': this.notice('FULL POWER!', '', '#ffb07a', 100, 222); break;
      case 'powerUp': this.popups.push({x: g.player.x, y: g.player.y - 26, text: 'POWER UP', color: '#ffb07a', life: 50, max: 50}); break;
      case 'pointGet': if (this.popups.length < 60) this.popups.push({x: e.x, y: e.y - 6, text: fmt(e.value), color: e.full ? '#ffe98a' : '#d6dcff', life: 34, max: 34, small: true}); break;
      case 'attackEnd':
        this.ring(e.x, e.y, '#ffffff', 10, 180, 36, 3); this.spark(e.x, e.y, '#ffffff', 24, 5, 34, 1.5);
        if (e.defeated) this.shake = Math.max(this.shake, 5);
        break;
      case 'movement':
        this.flash = .6; this.flashColor = e.n === 2 ? '#ffe9b0' : '#ffffff'; this.shake = 8;
        for (let i = 0; i < 3; i++) this.ring(e.x, e.y, i % 2 ? '#ffe28a' : '#ffffff', 6, 120 + i * 80, 40 + i * 10, 3);
        this.notice(['', 'SECONDO MOVIMENTO', 'FINALE ── 夜明け'][e.n], ['', '第二楽章', '終楽章'][e.n], '#fff1a8', 150, 200); break;
      case 'bossDown':
        for (let i = 0; i < 4; i++) this.ring(e.x, e.y, i % 2 ? BOSSES[e.boss].color : '#ffffff', 6, 90 + i * 70, 40 + i * 12, 4 - i * .6);
        this.spark(e.x, e.y, '#ffffff', 80, 8, 60, 2.2); this.spark(e.x, e.y, BOSSES[e.boss].color, 60, 5, 70, 2);
        this.shake = 18; this.flash = .8; this.flashColor = '#ffffff';
        break;
      case 'stageClear': this.notice('STAGE CLEAR', `Clear Bonus  ${fmt(e.bonus)}`, '#fff1a8', 250, 170); break;
      case 'stage': if (!e.practice) this.stageCard = {t: 0, index: e.index}; break;
      case 'music': if (SONGS[e.track]) this.bgm = {title: SONGS[e.track].title, t: 0}; break;
      case 'pop': this.ring(e.x, e.y, '#bfefff', 4, 18, 12, 1.5); break;
      case 'tick': this.tickPulse = 1; break;
      case 'beat': this.beatPulse = 1; break;
      case 'release': if (Math.random() < .3) this.spark(e.x, e.y, '#cfe0ff', 1, 1.5, 14, 1); break;
    }
  }
  // 固定フレームごとの更新（ポーズ中は止まる）
  tick(g) {
    this.clock++;
    this.scroll += g.stopT > 0 ? 0 : g.phase === 'road' ? .02 : .009;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - .6);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - .03);
    this.tickPulse *= .9; this.beatPulse *= .9;
    for (const p of this.parts) {
      p.life--;
      if (p.k === 'spark') { p.x += p.vx; p.y += p.vy; p.vx *= .93; p.vy *= .93; }
      else if (p.k === 'note') { p.x += p.vx; p.y += p.vy; p.vx *= .98; }
    }
    this.parts = this.parts.filter(p => p.life > 0);
    for (const n of this.notices) n.life--;
    this.notices = this.notices.filter(n => n.life > 0);
    for (const p of this.popups) { p.life--; p.y -= .5; }
    this.popups = this.popups.filter(p => p.life > 0);
    if (this.cutin && ++this.cutin.t > 110) this.cutin.t = 110;
    if (!g.atk?.spell) this.cutin = null;
    if (this.stageCard && ++this.stageCard.t > 260) this.stageCard = null;
    if (this.bgm && ++this.bgm.t > 320) this.bgm = null;
    this.spellBg += ((g.atk?.spell ? 1 : 0) - this.spellBg) * .04;
    this.dark += ((g.atk?.def.dark ? 1 : 0) - this.dark) * .03;
    this.stopFx += ((g.stopT > 0 ? 1 : 0) - this.stopFx) * .15;
    this.fortFx += ((g.fort ? 1 : 0) - this.fortFx) * .12;
    if (g.boss) this.spellBoss = g.boss.index;
    const p = g.player;
    if (g.fort && this.clock % 5 === 0) this.parts.push({k: 'note', x: p.x + (Math.random() - .5) * 30, y: p.y + 8, vx: (Math.random() - .5) * 1.2, vy: -1.2 - Math.random(), life: 46, max: 46, color: '#ffe28a', size: 5 + Math.random() * 3, n: Math.random() < .5});
    if (g.bombT > 0 && this.clock % 3 === 0) {
      const age = BOMB_FRAMES - g.bombT, r = Math.min(520, age * 7);
      for (let i = 0; i < 4; i++) { const a = Math.random() * TAU; this.spark(g.bombX + Math.cos(a) * r, g.bombY + Math.sin(a) * r, i % 2 ? COLORS.gold : '#ffffff', 1, 2, 24, 1.8); }
    }
    // 攻撃の合間はゲージを空にし、次の攻撃の開始時に満タンまで伸ばす
    if (g.boss) { const b = g.boss, want = g.phase === 'attack' ? Math.max(0, b.hp / b.maxHp) : g.phase === 'between' ? 0 : 1; this.hpShown += (want - this.hpShown) * (want > this.hpShown ? .06 : .3); }
  }

  // ================= 描画 =================
  draw(g, {demo = false, pulse = 0} = {}) {
    const c = this.ctx, K = this.K, t = this.clock, stage = g.stageIndex ?? 0;
    this.pulse = pulse;
    const ox = this.shake ? (Math.random() - .5) * this.shake : 0, oy = this.shake ? (Math.random() - .5) * this.shake : 0;
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const boss = BOSSES[this.spellBoss];
    const glOk = this.fx && this.back.draw({scene: stage, time: t / 60, scroll: this.scroll, spell: this.spellBg, beat: Math.max(pulse * .7, this.beatPulse, this.tickPulse * .6),
      dim: .8 - this.stopFx * .25 - this.dark * .35, boss: this.spellBoss, color: hex3(boss.color)});
    c.setTransform(K, 0, 0, K, ox * K, oy * K);
    if (!glOk) this.drawFallbackBackground(g, t, stage);
    if (g.boss) this.drawBossBack(g, t);
    this.drawItems(g);
    this.drawEnemies(g, t);
    if (g.boss) this.drawBoss(g, t);
    this.drawPlayer(g, t);
    this.drawShots(g);
    this.drawLasers(g, t);
    this.drawBullets(g);
    this.drawBomb(g, t);
    this.drawParticles();
    if (this.dark > .02) this.drawDarkness(g);
    this.drawHitbox(g, t);
    if (this.fx) this.bloom();
    c.setTransform(K, 0, 0, K, 0, 0);
    if (this.fortFx > .02) this.drawFortFrame(t);
    if (!demo) {
      this.drawHud(g, t);
      this.drawCutin(g, t);
      this.drawStageCard(g);
      this.drawBgm();
      this.drawNotices();
      this.drawPopups();
      if (g.dialogue) this.drawDialogue(g, t);
    }
    if (g.player.state === 'hit') {
      const k = g.player.hitT / g.deathbombFrames;
      const vg = c.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .75);
      vg.addColorStop(0, 'rgba(255,0,60,0)'); vg.addColorStop(1, `rgba(255,20,70,${.25 + .3 * k})`);
      c.fillStyle = vg; c.fillRect(0, 0, W, H);
    }
    if (this.flash > 0) { c.globalAlpha = Math.min(1, this.flash); c.fillStyle = this.flashColor; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
  }
  // 明るいものが周りへにじむ。弾や光が背景から浮き上がって見える
  bloom() {
    const c = this.ctx, w = this.canvas.width, h = this.canvas.height, a = this.b1.getContext('2d'), b = this.b2.getContext('2d');
    a.clearRect(0, 0, this.b1.width, this.b1.height); a.drawImage(this.canvas, 0, 0, this.b1.width, this.b1.height);
    b.clearRect(0, 0, this.b2.width, this.b2.height); b.drawImage(this.b1, 0, 0, this.b2.width, this.b2.height);
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'lighter'; c.imageSmoothingEnabled = true;
    c.globalAlpha = .34; c.drawImage(this.b2, 0, 0, w, h);
    c.globalAlpha = .2; c.drawImage(this.b1, 0, 0, w, h);
    c.restore();
  }
  drawFallbackBackground(g, t, stage) {
    const c = this.ctx, pal = [['#04121a', '#0a2a30'], ['#05061c', '#0c1840'], ['#05050f', '#141230'], ['#0c0208', '#22061a']][stage] || ['#05061c', '#0c1840'];
    const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, pal[0]); gr.addColorStop(.6, pal[1]); gr.addColorStop(1, pal[0]);
    c.fillStyle = gr; c.fillRect(-10, -10, W + 20, H + 20);
    c.fillStyle = '#dfe6ff';
    for (const s of this.stars) {
      const sp = [.15, .35, .7][s.layer], y = ((s.y + t * sp) % H + H) % H;
      c.globalAlpha = .3 + .4 * (.5 + .5 * Math.sin(t * .04 + s.ph)) * (s.layer + 1) / 3;
      c.fillRect(s.x, y, s.s, s.s);
    }
    c.globalAlpha = 1;
    if (this.spellBg > .01) { c.fillStyle = rgba(BOSSES[this.spellBoss].color, .08 * this.spellBg); c.fillRect(0, 0, W, H); }
    c.drawImage(this.vignette.img, W / 2 - this.vignette.size / 2, H / 2 - this.vignette.size / 2, this.vignette.size, this.vignette.size);
  }
  drawBossBack(g, t) {
    const c = this.ctx, b = g.boss, spell = !!g.atk?.spell;
    c.save(); c.translate(b.x, b.y);
    c.globalCompositeOperation = 'lighter';
    fastGlow(c, 70, b.def.color, .2 + (spell ? .12 : 0) + this.pulse * .1);
    if (g.phase === 'attack' || g.phase === 'between') {
      const s = (spell ? 1.2 : 1) * (1 + .04 * Math.sin(t * .05) + this.pulse * .05), cs = this.circles[b.index];
      c.rotate(t * .012); c.globalAlpha = .42; c.scale(s, s);
      c.drawImage(cs.img, -85, -85, 170, 170);
      c.rotate(-t * .03); c.globalAlpha = .2; c.scale(.6, .6); c.drawImage(cs.img, -85, -85, 170, 170);
    }
    c.restore();
  }
  drawBoss(g, t) {
    const c = this.ctx, b = g.boss;
    for (const f of b.familiars) {
      c.save(); c.translate(f.x, f.y); c.globalCompositeOperation = 'lighter'; fastGlow(c, 16, COLORS[f.color], .8); c.restore();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(f.x, f.y, 4, 0, TAU); c.fill();
      c.strokeStyle = COLORS[f.color]; c.lineWidth = 1; c.beginPath(); c.ellipse(f.x, f.y, 9, 3, t * .05, 0, TAU); c.stroke();
    }
    const moving = b.mt < b.md ? (b.tx - b.sx) / Math.max(1, b.md) : 0;
    drawCharacter(c, b.def.id, b.x, b.y - 12 + Math.sin(t * .05) * 2.5, .44, {t, lean: Math.max(-.2, Math.min(.2, moving * .08)), expr: g.atk?.spell ? 'angry' : 'normal'});
    if (b.flash) { c.save(); c.translate(b.x, b.y + 4); c.globalCompositeOperation = 'lighter'; fastGlow(c, 22, '#ffffff', .13); c.restore(); }
    if (g.phase === 'attack' && !g.atk.def.survival) {
      c.save(); c.translate(b.x, b.y);
      c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 3.5; c.beginPath(); c.arc(0, 0, 50, 0, TAU); c.stroke();
      c.strokeStyle = this.hpShown < .2 ? '#ff6b8a' : 'rgba(255,245,235,.85)'; c.lineWidth = 2.2;
      c.beginPath(); c.arc(0, 0, 50, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0, this.hpShown)); c.stroke();
      // 終曲は体力の 2/3 と 1/3 に楽章の区切りがある
      if (g.atk.def.last) { c.strokeStyle = '#ffe28a'; c.lineWidth = 2; for (const k of [1 / 3, 2 / 3]) { const a = -Math.PI / 2 + TAU * k; c.beginPath(); c.moveTo(Math.cos(a) * 46, Math.sin(a) * 46); c.lineTo(Math.cos(a) * 54, Math.sin(a) * 54); c.stroke(); } }
      c.restore();
    }
  }
  drawPlayer(g, t) {
    const p = g.player, c = this.ctx;
    if (p.state === 'ghost' || p.state === 'dead') return;
    const nova = g.char.id === 'nova';
    if (this.fortFx > .02) {
      c.save(); c.translate(p.x, p.y); c.globalCompositeOperation = 'lighter'; fastGlow(c, 44 + this.pulse * 8, '#ffd27a', .45 * this.fortFx);
      c.rotate(t * .04); c.strokeStyle = rgba('#ffe28a', .8 * this.fortFx); c.lineWidth = 1.4; starPath(c, 30, 21, 8); c.stroke(); c.restore();
    }
    if (p.invuln > 0 && p.state === 'alive' && Math.floor(t / 3) % 2) c.globalAlpha = .45;
    for (const [ox, oy] of optionOffsets(g.power, p.fk)) {
      const x = p.x + ox, y = p.y + oy;
      c.save(); c.translate(x, y); c.globalCompositeOperation = 'lighter'; fastGlow(c, 9, nova ? '#7fd8ff' : '#ffc37a', .6); c.globalCompositeOperation = 'source-over';
      c.rotate(t * (nova ? .08 : .05));
      if (nova) { c.fillStyle = '#e8f6ff'; starPath(c, 4.6, 2, 4, 0); c.fill(); c.strokeStyle = 'rgba(160,220,255,.9)'; c.lineWidth = .8; c.stroke(); }
      else { c.fillStyle = '#ffe3a8'; gearPath(c, 4.6, 7, 0, .3); c.fill(); c.strokeStyle = '#a8651f'; c.lineWidth = .7; c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 1.4, 0, TAU); c.fill(); }
      c.restore();
    }
    // 噴き出す光
    c.save(); c.translate(p.x, p.y + 20); c.globalCompositeOperation = 'lighter';
    const fl = 1 + Math.sin(t * .6) * .15, tg = c.createLinearGradient(0, 0, 0, 20 * fl);
    tg.addColorStop(0, nova ? 'rgba(255,225,150,.85)' : 'rgba(255,190,120,.85)'); tg.addColorStop(1, 'rgba(255,140,80,0)');
    c.fillStyle = tg; c.beginPath(); c.moveTo(-4.5, 0); c.quadraticCurveTo(0, 26 * fl, 4.5, 0); c.closePath(); c.fill(); c.restore();
    drawCharacter(c, g.char.id, p.x, p.y - 9, .27, {t, lean: p.lean * .28, expr: p.state === 'hit' ? 'surprise' : g.fort ? 'smile' : 'normal'});
    c.globalAlpha = 1;
  }
  drawHitbox(g, t) {
    const p = g.player, c = this.ctx;
    if (p.state !== 'alive' && p.state !== 'hit') return;
    if (p.fk > .03) {
      c.save(); c.translate(p.x, p.y); c.globalAlpha = p.fk * .8;
      c.strokeStyle = '#ffffff'; c.lineWidth = 1;
      for (let i = 0; i < 3; i++) { const a = t * .06 + i * TAU / 3; c.beginPath(); c.arc(0, 0, 17, a, a + .8); c.stroke(); }
      c.strokeStyle = 'rgba(255,120,150,.9)'; for (let i = 0; i < 3; i++) { const a = -t * .09 + i * TAU / 3; c.beginPath(); c.arc(0, 0, 13, a, a + .5); c.stroke(); }
      c.restore();
    }
    c.globalAlpha = .55 + .45 * p.fk;
    c.fillStyle = '#ffffff'; c.strokeStyle = '#ff3a64'; c.lineWidth = 1.3;
    c.beginPath(); c.arc(p.x, p.y, 3.3, 0, TAU); c.fill(); c.stroke();
    c.globalAlpha = 1;
    if (p.state === 'hit') {
      const k = p.hitT / g.deathbombFrames;
      c.strokeStyle = '#ff2d55'; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y, 6 + 46 * k, 0, TAU); c.stroke();
      c.strokeStyle = '#ffffff'; c.lineWidth = 1; c.stroke();
    }
  }
  drawItems(g) {
    const c = this.ctx;
    for (const it of g.items) {
      const s = this.items[it.type]; if (!s) continue;
      if (it.y < -4) { c.globalAlpha = .7; c.drawImage(s.img, it.x - s.size / 4, 1, s.size / 2, s.size / 2); c.globalAlpha = 1; continue; }
      c.drawImage(s.img, it.x - s.size / 2, it.y - s.size / 2, s.size, s.size);
    }
  }
  drawEnemies(g, t) {
    const c = this.ctx;
    for (const e of g.enemies) {
      const col = COLORS[e.color] || COLORS.cyan, light = mix(col, '#ffffff', .55), dark = mix(col, '#000000', .45);
      c.save(); c.translate(e.x, e.y);
      c.globalCompositeOperation = 'lighter'; fastGlow(c, e.r * 1.9, col, .55); c.globalCompositeOperation = 'source-over';
      if (e.kind === 'wisp') {
        // 小さな妖精：光の玉に、はばたく羽
        const fl = .5 + .4 * Math.sin(t * .3 + e.x);
        c.fillStyle = rgba(light, .6); c.strokeStyle = rgba(col, .95); c.lineWidth = .8;
        for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sd * 8, -2, 8, 3.6, sd * fl, 0, TAU); c.fill(); c.stroke(); c.beginPath(); c.ellipse(sd * 6, 3, 5, 2.4, -sd * fl * .6, 0, TAU); c.fill(); c.stroke(); }
        c.fillStyle = light; c.beginPath(); c.arc(0, 0, 5, 0, TAU); c.fill(); c.strokeStyle = dark; c.lineWidth = .8; c.stroke();
        c.fillStyle = '#2a1626'; c.beginPath(); c.arc(-1.8, -.4, .9, 0, TAU); c.arc(1.8, -.4, .9, 0, TAU); c.fill();
      } else if (e.kind === 'jelly') {
        const pu = Math.sin(e.age * .14) * 1.5;
        c.strokeStyle = rgba(light, .8); c.lineWidth = 1.1;
        for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 3.6, 2); c.quadraticCurveTo(i * 4 + Math.sin(e.age * .1 + i) * 3, 10, i * 3.4 + Math.sin(e.age * .13 + i * 2) * 3, 17 - Math.abs(i)); c.stroke(); }
        const dg = c.createLinearGradient(0, -12, 0, 4); dg.addColorStop(0, rgba(light, .95)); dg.addColorStop(1, rgba(col, .6));
        c.fillStyle = dg; c.beginPath(); c.moveTo(-12 - pu, 3); c.bezierCurveTo(-13 - pu, -14, 13 + pu, -14, 12 + pu, 3); c.quadraticCurveTo(6, 0, 0, 3); c.quadraticCurveTo(-6, 0, -12 - pu, 3); c.fill();
        c.strokeStyle = '#fff'; c.lineWidth = .9; c.stroke();
        c.fillStyle = '#2a1626'; c.beginPath(); c.arc(-3.4, -3, 1.1, 0, TAU); c.arc(3.4, -3, 1.1, 0, TAU); c.fill();
      } else if (e.kind === 'book') {
        const open = Math.min(1, Math.max(0, (e.age - 40) / 20)), w = 4 + 8 * open;
        c.fillStyle = dark; c.strokeStyle = light; c.lineWidth = 1;
        for (const sd of [-1, 1]) {
          c.beginPath(); c.moveTo(0, -10); c.lineTo(sd * w, -11 + open * 2); c.lineTo(sd * w, 9 + open * 2); c.lineTo(0, 10); c.closePath(); c.fill(); c.stroke();
          c.fillStyle = '#fff8e8'; c.beginPath(); c.moveTo(0, -8.5); c.lineTo(sd * (w - 1.5), -9.5 + open * 2); c.lineTo(sd * (w - 1.5), 7.5 + open * 2); c.lineTo(0, 8.5); c.closePath(); c.fill(); c.fillStyle = dark;
        }
        c.fillStyle = col; c.save(); c.translate(0, -15); starPath(c, 3.4, 1.5); c.fill(); c.restore();
      } else if (e.kind === 'shade') {
        const a = Math.atan2(e.vy, e.vx) - Math.PI / 2;
        c.rotate(e.age > 46 ? a : 0);
        c.fillStyle = rgba('#12061c', .92); c.strokeStyle = col; c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(0, 13); c.quadraticCurveTo(12, 4, 9, -8); c.lineTo(5, -3); c.lineTo(2, -11); c.lineTo(0, -4); c.lineTo(-2, -11); c.lineTo(-5, -3); c.lineTo(-9, -8); c.quadraticCurveTo(-12, 4, 0, 13); c.fill(); c.stroke();
        c.fillStyle = e.age < 46 && Math.floor(e.age / 4) % 2 ? '#ffffff' : light; c.beginPath(); c.ellipse(-3.4, 3, 2, 1.3, .4, 0, TAU); c.ellipse(3.4, 3, 2, 1.3, -.4, 0, TAU); c.fill();
      } else if (e.kind === 'lantern') {
        c.strokeStyle = rgba(col, .9); c.lineWidth = 1.2; c.beginPath(); c.ellipse(0, 0, 19, 5.5, t * .02, 0, TAU); c.stroke();
        const dg = c.createLinearGradient(0, -15, 0, 15); dg.addColorStop(0, light); dg.addColorStop(1, dark);
        c.fillStyle = dg; c.beginPath(); c.moveTo(0, -16); c.quadraticCurveTo(13, -6, 10, 6); c.lineTo(0, 16); c.lineTo(-10, 6); c.quadraticCurveTo(-13, -6, 0, -16); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(255,255,255,.8)'; c.stroke();
        c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, -7); c.lineTo(4.4, 0); c.lineTo(0, 7); c.lineTo(-4.4, 0); c.closePath(); c.fill();
      } else {
        c.strokeStyle = rgba(col, .95); c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 21, 0, TAU); c.stroke();
        c.lineWidth = 1; c.beginPath(); c.arc(0, 0, 16, 0, TAU); c.stroke();
        c.save(); c.rotate(t * .03); starPath(c, 14, 6, 8, 0); c.fillStyle = rgba(col, .45); c.fill(); c.stroke(); c.restore();
        c.save(); c.rotate(-t * .02); for (let i = 0; i < 12; i++) { c.rotate(TAU / 12); c.beginPath(); c.moveTo(0, -21); c.lineTo(0, -25); c.stroke(); } c.restore();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 5, 0, TAU); c.fill();
      }
      if (e.flash) { c.globalCompositeOperation = 'lighter'; fastGlow(c, e.r + 4, '#ffffff', .5); }
      c.restore();
    }
  }
  drawShots(g) {
    const c = this.ctx; c.globalCompositeOperation = 'lighter'; c.globalAlpha = g.fort ? .8 : .6;
    for (const s of g.shots) {
      const spr = this.shotSpr[s.kind];
      if (s.kind === 'star' || s.kind === 'gear') {
        c.save(); c.translate(s.x, s.y); c.rotate(s.age * .3); c.drawImage(spr.img, -6, -6, 12, 12); c.restore();
      } else c.drawImage(spr.img, s.x - spr.size / 2, s.y - spr.size / 2, spr.size, spr.size);
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
  drawLasers(g, t) {
    const c = this.ctx;
    for (const l of g.lasers) {
      const col = COLORS[l.color] || '#fff';
      c.save(); c.translate(l.x, l.y); c.rotate(l.angle);
      if (l.age < l.warn) {
        c.globalAlpha = .35 + .3 * Math.sin(t * .4);
        c.strokeStyle = col; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, 0); c.lineTo(l.len, 0); c.stroke();
        c.globalAlpha = .1 * (l.age / l.warn); c.fillStyle = col; c.fillRect(0, -l.w * .5, l.len, l.w);
      } else {
        const grow = Math.min(1, (l.age - l.warn) / 8), fade = l.fade ? 1 - l.fade / 20 : 1, w = l.w * grow * fade * .5;
        c.globalCompositeOperation = 'lighter';
        const gr = c.createLinearGradient(0, -w * 1.8, 0, w * 1.8);
        gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(.3, rgba(col, .55)); gr.addColorStop(.46, '#ffffff'); gr.addColorStop(.54, '#ffffff'); gr.addColorStop(.7, rgba(col, .55)); gr.addColorStop(1, rgba(col, 0));
        c.fillStyle = gr; c.fillRect(0, -w * 1.8, l.len, w * 3.6);
        fastGlow(c, 18 * fade, col, .9);
      }
      c.restore();
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
  drawBullets(g) {
    const c = this.ctx, K = this.K, m = c.getTransform(), ox = m.e, oy = m.f;
    let rotated = false;
    for (const b of g.bullets) {
      const spr = this.bs[b.type][b.color] || this.bs[b.type].white, bt = BULLET_TYPES[b.type];
      let s = spr.size * b.scale, alpha = 1;
      if (b.age < 8) { const k = b.age / 8; alpha = .3 + .7 * k; s *= 1 + (1 - k) * 1.2; }
      let a = 0;
      if (bt.orient) a = b.dir; else if (bt.spin) a = b.rot + b.age * bt.spin;
      if (alpha !== c.globalAlpha) c.globalAlpha = alpha;
      if (a) {
        const cs = Math.cos(a) * K, sn = Math.sin(a) * K;
        c.setTransform(cs, sn, -sn, cs, b.x * K + ox, b.y * K + oy); rotated = true;
        blit(c, spr, -s / 2, -s / 2, s, s);
      } else {
        if (rotated) { c.setTransform(K, 0, 0, K, ox, oy); rotated = false; }
        blit(c, spr, b.x - s / 2, b.y - s / 2, s, s);
      }
    }
    c.setTransform(K, 0, 0, K, ox, oy); c.globalAlpha = 1;
  }
  drawBomb(g, t) {
    const c = this.ctx, p = g.player;
    if (this.stopFx > .02) {
      // 時間停止：冷たい色がかかり、自機の周りに文字盤が浮かぶ
      const k = this.stopFx, left = g.stopT / STOP_FRAMES;
      c.save(); c.fillStyle = `rgba(110,140,255,${.13 * k})`; c.fillRect(-10, -10, W + 20, H + 20);
      c.translate(p.x, p.y); c.globalCompositeOperation = 'lighter'; c.globalAlpha = .55 * k;
      const sc = .55 + .1 * k; c.scale(sc, sc); c.drawImage(this.clockFace.img, -150, -150, 300, 300);
      c.strokeStyle = '#ffe3a0'; c.lineCap = 'round'; c.lineWidth = 5;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(-Math.PI / 2) * 70, Math.sin(-Math.PI / 2) * 70); c.stroke();
      c.lineWidth = 3; const a = -Math.PI / 2 - TAU * left; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 112, Math.sin(a) * 112); c.stroke();
      c.strokeStyle = 'rgba(255,227,160,.5)'; c.lineWidth = 9; c.beginPath(); c.arc(0, 0, 150, -Math.PI / 2, -Math.PI / 2 + TAU * left); c.stroke();
      c.restore();
    }
    if (g.bombT <= 0) return;
    const age = BOMB_FRAMES - g.bombT, k = 1 - age / BOMB_FRAMES, r = Math.min(520, age * 7);
    c.save(); c.globalCompositeOperation = 'lighter';
    c.fillStyle = `rgba(255,210,120,${.1 * k})`; c.fillRect(0, 0, W, H);
    c.translate(g.bombX, g.bombY);
    c.globalAlpha = k; c.strokeStyle = '#ffe3a0'; c.lineWidth = 2 + 8 * k; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
    c.strokeStyle = '#8fe6ff'; c.lineWidth = 2 + 4 * k; c.beginPath(); c.arc(0, 0, r * .72, 0, TAU); c.stroke();
    c.rotate(age * .03); c.fillStyle = `rgba(255,240,200,${.5 * k})`; sparklePath(c, 40 + age * 1.5, 6 + age * .2); c.fill();
    c.rotate(Math.PI / 4); c.fillStyle = `rgba(160,230,255,${.3 * k})`; sparklePath(c, 28 + age * 1.1, 4 + age * .15); c.fill();
    c.globalAlpha = k * .8; c.drawImage(this.whiteGlow.img, -60, -60, 120, 120);
    c.restore();
  }
  // 暗闇のスペル：自機・ボス・大きな弾の周りだけ灯りが届く
  drawDarkness(g) {
    const d = this.darkCv.getContext('2d'), p = g.player;
    d.setTransform(.5, 0, 0, .5, 0, 0); d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, W, H);
    d.fillStyle = `rgba(2,1,10,${.8 * this.dark})`; d.fillRect(0, 0, W, H);
    d.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, a) => { const gr = d.createRadialGradient(x, y, r * .25, x, y, r); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = gr; d.beginPath(); d.arc(x, y, r, 0, TAU); d.fill(); };
    if (p.state !== 'dead') hole(p.x, p.y, 92 + this.pulse * 6, 1);
    if (g.boss) hole(g.boss.x, g.boss.y, 70, .9);
    for (const b of g.bullets) if (b.type === 'big') hole(b.x, b.y, 64, .95);
    this.ctx.drawImage(this.darkCv, -2, -2, W + 4, H + 4);
  }
  drawFortFrame(t) {
    const c = this.ctx, a = this.fortFx * (.2 + this.pulse * .16);
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const [x0, y0, x1, y1] of [[0, 0, 26, 0], [W, 0, W - 26, 0], [0, 0, 0, 26], [0, H, 0, H - 30]]) {
      const gr = c.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, `rgba(255,210,110,${a})`); gr.addColorStop(1, 'rgba(255,210,110,0)');
      c.fillStyle = gr; c.fillRect(0, 0, W, H);
    }
    c.restore();
  }
  drawParticles() {
    const c = this.ctx; c.globalCompositeOperation = 'lighter';
    for (const p of this.parts) {
      const k = p.life / p.max;
      if (p.k === 'spark') {
        c.globalAlpha = k; c.strokeStyle = p.color; c.lineWidth = p.size;
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2); c.stroke();
      } else if (p.k === 'ring') {
        c.globalAlpha = k; c.strokeStyle = p.color; c.lineWidth = p.width * k + .5;
        c.beginPath(); c.arc(p.x, p.y, Math.max(.1, p.r1 + (p.r0 - p.r1) * k * k), 0, TAU); c.stroke();
      } else if (p.k === 'glow') {
        const s = this.glows[p.color] || this.whiteGlow, r = p.r * (1.4 - k * .4);
        c.globalAlpha = k; c.drawImage(s.img, p.x - r, p.y - r, r * 2, r * 2);
      } else if (p.k === 'note') {
        c.globalAlpha = Math.min(1, k * 2) * .9; c.fillStyle = p.color; c.font = `${p.size * 2}px ${SERIF}`; c.textAlign = 'center';
        c.fillText(p.n ? '♪' : '♫', p.x, p.y);
      } else if (p.k === 'fade') {
        const spr = this.bs[p.bt]?.[p.bc]; if (!spr) continue;
        const s = spr.size * (1 + (1 - k) * .9);
        c.globalAlpha = k * .8; blit(c, spr, p.x - s / 2, p.y - s / 2, s, s);
      }
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }

  // ================= 画面内表示 =================
  text(str, x, y, {size = 10, font = SERIF, weight = '600', italic = false, align = 'left', color = '#fff', shadow = true, base = 'alphabetic'} = {}) {
    const c = this.ctx;
    c.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${font}`; c.textAlign = align; c.textBaseline = base;
    if (shadow) { c.fillStyle = 'rgba(0,0,0,.75)'; c.fillText(str, x + .8, y + .8); }
    c.fillStyle = color; c.fillText(str, x, y);
  }
  drawHud(g, t) {
    const c = this.ctx, b = g.boss, a = g.atk;
    if (b && (g.phase === 'attack' || g.phase === 'between' || g.phase === 'dialogue')) {
      const survival = a?.def.survival, x0 = 46, x1 = W - 52;
      c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(x0, 4, x1 - x0, 4);
      const k = survival ? a.timer / a.total : Math.max(0, this.hpShown);
      const gr = c.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, survival ? '#8fe6ff' : b.def.color);
      c.fillStyle = gr; c.fillRect(x0, 4, (x1 - x0) * k, 4);
      const remaining = b.mid ? 0 : b.def.attacks.slice(b.idx + 1).filter(id => ATTACKS[id].spell).length;
      for (let i = 0; i < remaining; i++) { c.save(); c.translate(8 + (i % 4) * 9, 7 + Math.floor(i / 4) * 0); starPath(c, 4, 1.8); c.fillStyle = '#ffe28a'; c.fill(); c.restore(); }
      this.text(b.def.name, 8, 21, {size: 9, italic: true, color: '#f6ecff'});
      if (a && g.phase === 'attack') {
        const sec = Math.max(0, a.timer / 60), low = sec < 10;
        this.text(String(Math.floor(sec)).padStart(2, '0'), W - 24, 18, {size: 17, align: 'right', color: low ? '#ff6b8a' : '#fff', font: SANS, weight: '700'});
        this.text('.' + String(Math.floor(sec * 100) % 100).padStart(2, '0'), W - 6, 18, {size: 9, align: 'right', color: low ? '#ff6b8a' : '#dfe3ff', font: SANS, weight: '700'});
      }
    }
    if (a?.spell) this.drawSpellName(g, t);
    if (b) {
      c.fillStyle = rgba(b.def.color, .85); c.fillRect(b.x - 16, H - 7, 32, 7);
      this.text('ENEMY', b.x, H - 1.5, {size: 6, align: 'center', color: '#1a1030', font: SANS, weight: '800', shadow: false});
    }
    // 共鳴ゲージ（左端）
    if (g.mode !== 'demo') {
      const y0 = H - 16, h = 120, k = Math.max(0, Math.min(1, g.reso));
      c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(3, y0 - h, 4, h);
      const gr = c.createLinearGradient(0, y0, 0, y0 - h); gr.addColorStop(0, g.fort ? '#fff4c0' : '#7fd8ff'); gr.addColorStop(1, g.fort ? '#ffb347' : '#ffe28a');
      c.fillStyle = gr; c.fillRect(3, y0 - h * k, 4, h * k);
      c.strokeStyle = g.fort ? `rgba(255,226,138,${.7 + .3 * Math.sin(t * .3)})` : 'rgba(255,255,255,.35)'; c.lineWidth = .8; c.strokeRect(2.6, y0 - h - .4, 4.8, h + .8);
      c.save(); c.translate(5, y0 + 7); c.fillStyle = g.fort ? '#ffe28a' : '#bfe8ff'; c.font = `8px ${SERIF}`; c.textAlign = 'center'; c.fillText('♪', 0, 0); c.restore();
    }
  }
  drawSpellName(g, t) {
    const a = g.atk, def = a.def, cut = this.cutin, slot = {x: W - 6, y: 38};
    let y = slot.y, alpha = 1;
    if (cut && cut.def === def) {
      const k = cut.t;
      if (k < 40) { y = H * .62; alpha = Math.min(1, k / 12); }
      else if (k < 70) { const e = (k - 40) / 30, s = e * e * (3 - 2 * e); y = H * .62 + (slot.y - H * .62) * s; }
    }
    const c = this.ctx; c.save(); c.globalAlpha = alpha;
    const gr = c.createLinearGradient(W * .2, 0, W, 0); gr.addColorStop(0, 'rgba(10,8,30,0)'); gr.addColorStop(1, 'rgba(10,8,30,.72)');
    c.fillStyle = gr; c.fillRect(W * .2, y - 13, W * .8, 30);
    c.strokeStyle = rgba(BOSSES[def.boss].color, .8); c.lineWidth = 1; c.beginPath(); c.moveTo(W * .4, y + 3.5); c.lineTo(W, y + 3.5); c.stroke();
    this.text(def.name, slot.x, y, {size: def.name.length > 36 ? 9.5 : 11.5, italic: true, align: 'right', color: '#fff8e4'});
    this.text(def.ja, slot.x, y + 12, {size: 8, align: 'right', color: '#e4dcff', font: SANS, weight: '600'});
    if (g.mode !== 'demo') {
      const failed = a.spell.failed, hist = this.history?.(def.id);
      const bonus = failed ? 'Bonus Failed' : `Bonus ${fmt(a.spell.bonus)}`;
      this.text(`${bonus}${hist ? `   History ${String(hist.c).padStart(2, '0')}/${String(hist.a).padStart(2, '0')}` : ''}`, slot.x, y + 22, {size: 7, align: 'right', color: failed ? '#ff8aa6' : '#c9d4ff', font: SANS, weight: '600'});
    }
    c.restore();
  }
  // 立ち絵を一度別のキャンバスに描いてから貼る（半透明にしても髪や服の重なりが透けない）
  portrait(slot, id, expr, t, scale) {
    const cv = this.pcv[slot], x = cv.getContext('2d'), K = this.K;
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, cv.width, cv.height); x.setTransform(K, 0, 0, K, 0, 0);
    drawCharacter(x, id, 90, 90, scale, {expr, t, bust: true});
    return cv;
  }
  drawCutin(g, t) {
    const cut = this.cutin; if (!cut || cut.t > 96) return;
    const c = this.ctx, k = cut.t / 96, col = BOSSES[cut.boss].color;
    const alpha = k < .12 ? k / .12 : k > .72 ? (1 - k) / .28 : 1;
    c.save(); c.globalAlpha = alpha * .85;
    c.translate(W / 2, H * .44); c.rotate(-.16);
    const gr = c.createLinearGradient(-W, 0, W, 0); gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(.5, rgba(col, .42)); gr.addColorStop(1, rgba(col, 0));
    c.fillStyle = gr; c.fillRect(-W, -52, W * 2, 104);
    c.strokeStyle = rgba(col, .85); c.lineWidth = 1; c.beginPath(); c.moveTo(-W, -52); c.lineTo(W, -52); c.moveTo(-W, 52); c.lineTo(W, 52); c.stroke();
    c.globalAlpha = alpha * .3;
    c.font = `italic 700 44px ${SERIF}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff';
    c.fillText('SPELL ARIA', (1 - k) * 180 - 70, -4); c.fillText('SPELL ARIA', -(1 - k) * 180 + 120, 38);
    c.restore();
    const cv = this.portrait(2, BOSSES[cut.boss].id, 'angry', t, 2.0), ease = 1 - Math.pow(1 - Math.min(1, k * 2.4), 3);
    c.save(); c.globalAlpha = alpha * .95;
    c.drawImage(cv, W + 30 - ease * 230 - k * 30, H * .44 - 150, 180, 230);
    c.restore();
  }
  drawStageCard(g) {
    const s = this.stageCard; if (!s) return;
    const st = STAGES[s.index], k = s.t, a = k < 30 ? k / 30 : k > 200 ? (260 - k) / 60 : 1;
    const c = this.ctx; c.save(); c.globalAlpha = Math.max(0, a);
    const y = H * .34;
    c.fillStyle = 'rgba(6,5,20,.5)'; c.fillRect(0, y - 22, W, 86);
    this.text(`STAGE ${s.index + 1}`, W / 2, y, {size: 10, align: 'center', color: '#f3e3ba', font: SANS, weight: '700'});
    this.text(st.name, W / 2, y + 28, {size: st.name.length > 18 ? 21 : 26, italic: true, align: 'center', color: '#fffaf0'});
    c.strokeStyle = 'rgba(255,230,180,.6)'; c.lineWidth = 1; const w = 90 + Math.min(1, k / 50) * 60;
    c.beginPath(); c.moveTo(W / 2 - w, y + 37); c.lineTo(W / 2 + w, y + 37); c.stroke();
    this.text(st.ja, W / 2, y + 52, {size: 11, align: 'center', color: '#e8defc', font: SANS, weight: '600'});
    c.restore();
  }
  drawBgm() {
    const m = this.bgm; if (!m) return;
    const a = m.t < 20 ? m.t / 20 : m.t > 260 ? (320 - m.t) / 60 : 1;
    this.ctx.globalAlpha = Math.max(0, a) * .9;
    this.text(`♪ ${m.title}`, W - 6, H - 10, {size: 8.5, align: 'right', color: '#e7e2ff', font: SANS, weight: '600'});
    this.ctx.globalAlpha = 1;
  }
  drawNotices() {
    for (const n of this.notices) {
      const k = 1 - n.life / n.max, a = k < .1 ? k / .1 : n.life < 25 ? n.life / 25 : 1, sc = k < .1 ? 1.3 - k * 3 : 1;
      const c = this.ctx; c.save(); c.globalAlpha = a; c.translate(W / 2, n.y); c.scale(sc, sc);
      this.text(n.text, 0, 0, {size: 19, italic: true, align: 'center', color: n.color, weight: '700'});
      if (n.sub) this.text(n.sub, 0, 16, {size: 9, align: 'center', color: '#f1ecff', font: SANS, weight: '700'});
      c.restore();
    }
  }
  drawPopups() {
    for (const p of this.popups) {
      this.ctx.globalAlpha = Math.min(1, p.life / 12);
      this.text(p.text, p.x, p.y, {size: p.small ? 6.5 : 8, align: 'center', color: p.color, font: SANS, weight: '700'});
    }
    this.ctx.globalAlpha = 1;
  }
  wrap(str, width, size) {
    const c = this.ctx; c.font = `600 ${size}px ${SANS}`;
    const lines = []; let cur = '';
    for (const ch of str) { if (c.measureText(cur + ch).width > width && cur) { lines.push(cur); cur = ch; } else cur += ch; }
    if (cur) lines.push(cur);
    return lines;
  }
  drawDialogue(g, t) {
    const c = this.ctx, d = g.dialogue, line = d.lines[d.i], boss = g.boss.def, me = g.char, mine = line.who === 'p';
    c.fillStyle = 'rgba(4,3,16,.42)'; c.fillRect(0, 0, W, H);
    // 話している側を明るく・少し前へ
    const place = (slot, id, expr, x, on) => {
      const cv = this.portrait(slot, id, on ? expr : 'normal', t, 1.9), s = on ? 1 : .92;
      c.save(); c.globalAlpha = on ? 1 : .5; if (!on) c.filter = 'none';
      c.drawImage(cv, x - 90 * s, H - 104 - 172 * s + (on ? 0 : 6), 180 * s, 230 * s); c.restore();
    };
    place(0, me.id, line.face || 'normal', 76, mine);
    place(1, boss.id, line.face || 'normal', W - 76, !mine);
    const bx = 12, by = H - 100, bw = W - 24, bh = 84, col = mine ? me.color : boss.color;
    c.fillStyle = 'rgba(8,8,28,.9)'; c.beginPath(); c.roundRect(bx, by, bw, bh, 8); c.fill();
    c.strokeStyle = rgba(col, .8); c.lineWidth = 1.2; c.stroke();
    const name = mine ? `${me.ja}　${me.title}` : `${boss.ja}　${boss.title}`;
    c.font = `800 8.5px ${SANS}`; const nw = Math.max(120, c.measureText(name).width + 22);
    c.fillStyle = col; c.beginPath(); c.roundRect(mine ? bx + 10 : bx + bw - 10 - nw, by - 9, nw, 17, 8); c.fill();
    this.text(name, mine ? bx + 10 + nw / 2 : bx + bw - 10 - nw / 2, by + 3, {size: 8.5, align: 'center', color: '#1a1030', font: SANS, weight: '800', shadow: false});
    const lines = this.wrap(g.lineText(line), bw - 28, 11.5);
    lines.forEach((ln, i) => this.text(ln, bx + 14, by + 28 + i * 17, {size: 11.5, color: '#f7f4ff', font: SANS, weight: '600'}));
    if (Math.floor(t / 20) % 2) this.text('▼', bx + bw - 14, by + bh - 8, {size: 8, align: 'right', color: '#ffe8a8', font: SANS});
  }
}
