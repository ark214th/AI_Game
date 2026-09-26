// Canvas 2D による描画。シミュレーションの状態を読むだけで、書き換えない
import {W, H, TAU, COLORS, RAINBOW, BULLET_TYPES, DEATHBOMB_FRAMES, BOMB_FRAMES, POC_Y} from './consts.mjs';
import {optionOffsets, BOSSES, ATTACKS, STAGES} from './core.mjs';
import {TRACKS} from './music.mjs';

const SERIF = '"Cormorant Garamond","Palatino Linotype",Palatino,Georgia,"Hiragino Mincho ProN","Yu Mincho",serif';
const SANS = '-apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic",sans-serif';
const GREEK = 'αβγδεζηθικλμνξοπρστυφχψω';
const ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

const rgb = hex => { const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const rgba = (hex, a) => { const [r, g, b] = rgb(hex); return `rgba(${r},${g},${b},${a})`; };
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`; };
const hexOf = c => COLORS[c] || c;
const fmt = n => Math.floor(n).toLocaleString('en-US');

function gearPath(c, r, teeth, rot, depth = .2) {
  c.beginPath();
  const w = TAU / teeth, rin = r * (1 - depth);
  for (let i = 0; i < teeth; i++) {
    const a = rot + i * w;
    const pts = [[a, rin], [a + w * .14, r], [a + w * .46, r], [a + w * .6, rin]];
    for (const [pa, pr] of pts) c.lineTo(Math.cos(pa) * pr, Math.sin(pa) * pr);
  }
  c.closePath();
}
function starPath(c, R, r, n = 5, rot = -Math.PI / 2) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, rr = i % 2 ? r : R; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  c.closePath();
}
function sparklePath(c, L, w) {
  c.beginPath();
  c.moveTo(0, -L); c.lineTo(w, -w); c.lineTo(L * .72, 0); c.lineTo(w, w); c.lineTo(0, L * .9); c.lineTo(-w, w); c.lineTo(-L * .72, 0); c.lineTo(-w, -w);
  c.closePath();
}
function glow(c, r, hex, a) {
  const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, rgba(hex, a)); g.addColorStop(1, rgba(hex, 0));
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
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.K = 1; this.clock = 0; this.parts = []; this.notices = []; this.popups = [];
    this.cutin = null; this.stageCard = null; this.bgm = null; this.shake = 0; this.flash = 0; this.flashColor = '#fff';
    this.spellBg = 0; this.spellBoss = 0; this.hpShown = 1; this.history = null; this.tickPulse = 0; this.beatPulse = 0;
    this.bombStart = -999; this.lastBoss = 0;
    const rnd = (() => { let s = 12345; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    this.gears = Array.from({length: 9}, (_, i) => ({x: rnd() * W, y: rnd() * H * 1.4, r: 28 + rnd() * 70, teeth: 10 + Math.floor(rnd() * 14), spd: (rnd() - .5) * .012, layer: i % 3}));
    this.motes = Array.from({length: 46}, () => ({x: rnd() * W, y: rnd() * H, s: .6 + rnd() * 1.6, v: .2 + rnd() * .5, ph: rnd() * TAU}));
    this.shards = Array.from({length: 34}, (_, i) => ({x: rnd() * W, y: rnd() * H, s: 3 + rnd() * 7, v: .3 + rnd() * .6, rot: rnd() * TAU, spin: (rnd() - .5) * .03, c: RAINBOW[i % 7]}));
    this.stars = Array.from({length: 150}, (_, i) => ({x: rnd() * W, y: rnd() * H, s: .5 + rnd() * 1.4, layer: i % 3, ph: rnd() * TAU}));
    this.constellations = [
      [[40, 60], [70, 40], [105, 55], [120, 95], [90, 120]], [[260, 30], [300, 70], [340, 50], [330, 110]],
      [[60, 260], [95, 300], [140, 290], [160, 330]], [[250, 220], [280, 250], [320, 240], [300, 300], [260, 310]],
    ];
  }

  reset() {
    this.parts = []; this.notices = []; this.popups = []; this.cutin = null; this.stageCard = null; this.bgm = null;
    this.shake = 0; this.flash = 0; this.spellBg = 0; this.hpShown = 1;
  }
  resize(pxW, pxH) {
    this.canvas.width = pxW; this.canvas.height = pxH; this.K = pxW / W;
    // 背景は半分の解像度で描いて拡大する（柔らかい絵なので劣化が目立たず、描画負荷は約1/4）
    this.bg = document.createElement('canvas');
    this.bg.width = Math.ceil(pxW * .5); this.bg.height = Math.ceil(pxH * .5);
    this.bgCtx = this.bg.getContext('2d'); this.bgClock = -1;
    this.build();
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
        entries.push({type, name, size: s * (type === 'big' ? 3.2 : 4.2), draw: c => this.drawBulletShape(c, type, s, hex)});
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
    this.shotSpr = {
      main: this.sprite(20, c => { const g = c.createLinearGradient(0, -9, 0, 9); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(200,180,255,0)'); c.fillStyle = g; c.fillRect(-1.6, -9, 3.2, 18); }),
      needle: this.sprite(24, c => { const g = c.createLinearGradient(0, -11, 0, 11); g.addColorStop(0, 'rgba(230,255,255,1)'); g.addColorStop(1, 'rgba(80,200,255,0)'); c.fillStyle = g; c.fillRect(-1.5, -11, 3, 22); }),
      star: this.sprite(12, c => { c.fillStyle = 'rgba(255,215,120,.95)'; starPath(c, 5, 2.2, 4, 0); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 1.3, 0, TAU); c.fill(); }),
    };
    this.circles = BOSSES.map(b => this.sprite(150, c => this.magicCircle(c, 70, b.color)));
    this.rose = this.sprite(320, c => this.roseWindow(c, 155));
    this.clockFace = this.sprite(380, c => this.clockDial(c, 185));
    this.greekRing = this.sprite(420, c => this.starRing(c, 205));
    this.nebula = this.sprite(W * 1.4, c => {
      for (const [x, y, r, col, a] of [[-80, -60, 180, '#7040ff', .22], [90, 40, 160, '#2060ff', .2], [0, 120, 140, '#c040ff', .12], [-40, 60, 110, '#40c0ff', .1]]) {
        c.save(); c.translate(x, y); glow(c, r, col, a); c.restore();
      }
    });
    this.vignette = this.sprite(Math.max(W, H) * 1.3, c => {
      const r = Math.max(W, H) * .65, g = c.createRadialGradient(0, 0, r * .45, 0, 0, r);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)'); c.fillStyle = g; c.fillRect(-r, -r, 2 * r, 2 * r);
    });
  }
  itemBox(c, s, col, label) {
    c.shadowColor = col; c.shadowBlur = s;
    c.fillStyle = col; c.beginPath(); c.roundRect(-s, -s, s * 2, s * 2, s * .35); c.fill();
    c.shadowBlur = 0; c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = s * .16; c.stroke();
    c.fillStyle = '#fff'; c.font = `700 ${s * 1.45}px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, 0, s * .08);
  }
  drawBulletShape(c, type, s, hex) {
    const dark = mix(hex, '#000000', .45), light = mix(hex, '#ffffff', .5);
    switch (type) {
      case 'pellet': case 'orb':
        glow(c, s * 1.9, hex, .45);
        c.fillStyle = hex; c.beginPath(); c.arc(0, 0, s, 0, TAU); c.fill();
        c.strokeStyle = dark; c.lineWidth = s * .16; c.stroke();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, s * .58, 0, TAU); c.fill(); break;
      case 'big': {
        glow(c, s * 1.55, hex, .55);
        const g = c.createRadialGradient(0, 0, 0, 0, 0, s);
        g.addColorStop(0, '#fff'); g.addColorStop(.5, '#fff'); g.addColorStop(.78, light); g.addColorStop(.93, hex); g.addColorStop(1, rgba(hex, .2));
        c.fillStyle = g; c.beginPath(); c.arc(0, 0, s, 0, TAU); c.fill(); break;
      }
      case 'rice':
        c.save(); c.scale(1.35, .62); glow(c, s * 1.7, hex, .45); c.restore();
        c.fillStyle = hex; c.beginPath(); c.ellipse(0, 0, s * 1.3, s * .62, 0, 0, TAU); c.fill();
        c.strokeStyle = dark; c.lineWidth = s * .14; c.stroke();
        c.fillStyle = '#fff'; c.beginPath(); c.ellipse(0, 0, s * .78, s * .3, 0, 0, TAU); c.fill(); break;
      case 'shard':
        c.save(); c.scale(1.4, .6); glow(c, s * 1.6, hex, .45); c.restore();
        c.fillStyle = hex; c.beginPath(); c.moveTo(s * 1.55, 0); c.lineTo(0, s * .55); c.lineTo(-s * 1.15, 0); c.lineTo(0, -s * .55); c.closePath(); c.fill();
        c.strokeStyle = dark; c.lineWidth = s * .12; c.stroke();
        c.fillStyle = '#fff'; c.beginPath(); c.moveTo(s * 1.05, 0); c.lineTo(0, s * .25); c.lineTo(-s * .6, 0); c.lineTo(0, -s * .25); c.closePath(); c.fill(); break;
      case 'star':
        glow(c, s * 1.8, hex, .45);
        c.fillStyle = hex; starPath(c, s * 1.2, s * .52); c.fill();
        c.strokeStyle = '#fff'; c.lineWidth = s * .13; c.stroke();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, s * .3, 0, TAU); c.fill(); break;
      case 'ring':
        glow(c, s * 1.7, hex, .4);
        c.strokeStyle = hex; c.lineWidth = s * .42; c.beginPath(); c.arc(0, 0, s * .75, 0, TAU); c.stroke();
        c.strokeStyle = '#fff'; c.lineWidth = s * .14; c.stroke(); break;
      case 'gear':
        glow(c, s * 1.8, hex, .45);
        c.fillStyle = hex; gearPath(c, s * 1.12, 8, 0, .28); c.fill();
        c.strokeStyle = dark; c.lineWidth = s * .12; c.stroke();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, s * .42, 0, TAU); c.fill();
        c.fillStyle = dark; c.beginPath(); c.arc(0, 0, s * .14, 0, TAU); c.fill(); break;
    }
  }
  magicCircle(c, R, col) {
    c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 1.3;
    for (const r of [R, R * .93, R * .66, R * .3]) { c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke(); }
    for (let i = 0; i < 48; i++) { const a = i * TAU / 48, l = i % 4 ? .96 : .9; c.beginPath(); c.moveTo(Math.cos(a) * R * l, Math.sin(a) * R * l); c.lineTo(Math.cos(a) * R * .93, Math.sin(a) * R * .93); c.stroke(); }
    c.font = `${R * .12}px ${SERIF}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 0; i < 24; i++) { c.save(); c.rotate(i * TAU / 24); c.fillText(GREEK[i], 0, -R * .8); c.restore(); }
    for (const rot of [0, Math.PI / 4]) { c.beginPath(); for (let i = 0; i < 4; i++) { const a = rot + i * TAU / 4; c.lineTo(Math.cos(a) * R * .66, Math.sin(a) * R * .66); } c.closePath(); c.stroke(); }
    starPath(c, R * .3, R * .13, 8, 0); c.stroke();
  }
  roseWindow(c, R) {
    const lead = '#140a1c';
    c.lineWidth = R * .025; c.strokeStyle = lead;
    for (let i = 0; i < 12; i++) {
      c.save(); c.rotate(i * TAU / 12);
      c.fillStyle = rgba(COLORS[RAINBOW[i % 7]], .6); c.beginPath(); c.ellipse(0, -R * .62, R * .12, R * .29, 0, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = rgba(COLORS[RAINBOW[(i + 3) % 7]], .55); c.beginPath(); c.arc(0, -R * .93, R * .055, 0, TAU); c.fill(); c.stroke();
      c.rotate(TAU / 24); c.fillStyle = rgba(COLORS.gold, .45); c.beginPath(); c.arc(0, -R * .88, R * .045, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = rgba(i % 2 ? COLORS.blue : COLORS.red, .55); c.beginPath(); c.moveTo(0, -R * .12); c.lineTo(R * .08, -R * .3); c.lineTo(-R * .08, -R * .3); c.closePath(); c.fill(); c.stroke();
      c.restore();
    }
    c.beginPath(); c.arc(0, 0, R, 0, TAU); c.lineWidth = R * .04; c.stroke();
    c.beginPath(); c.arc(0, 0, R * .32, 0, TAU); c.lineWidth = R * .025; c.stroke();
    c.fillStyle = rgba(COLORS.gold, .7); c.beginPath(); c.arc(0, 0, R * .1, 0, TAU); c.fill(); c.stroke();
  }
  clockDial(c, R) {
    c.strokeStyle = 'rgba(255,205,120,.7)'; c.fillStyle = 'rgba(255,205,120,.75)';
    for (const [r, w] of [[R, 3], [R * .94, 1], [R * .7, 1.5], [R * .22, 1]]) { c.lineWidth = w; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke(); }
    for (let i = 0; i < 60; i++) { const a = i * TAU / 60, l = i % 5 ? .9 : .82; c.lineWidth = i % 5 ? 1 : 2.5; c.beginPath(); c.moveTo(Math.cos(a) * R * l, Math.sin(a) * R * l); c.lineTo(Math.cos(a) * R * .94, Math.sin(a) * R * .94); c.stroke(); }
    c.font = `600 ${R * .11}px ${SERIF}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12 - Math.PI / 2; c.fillText(ROMAN[i], Math.cos(a) * R * .76, Math.sin(a) * R * .76); }
    c.lineWidth = 1; for (let i = 0; i < 12; i++) { const a = i * TAU / 12; c.beginPath(); c.arc(Math.cos(a) * R * .46, Math.sin(a) * R * .46, R * .24, 0, TAU); c.stroke(); }
  }
  starRing(c, R) {
    c.strokeStyle = 'rgba(200,215,255,.8)'; c.fillStyle = 'rgba(200,215,255,.8)'; c.lineWidth = 1.2;
    for (const r of [R, R * .95, R * .78]) { c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke(); }
    c.font = `${R * .06}px ${SERIF}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 0; i < 48; i++) { c.save(); c.rotate(i * TAU / 48); c.fillText(GREEK[i % 24], 0, -R * .865); c.restore(); }
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12; c.beginPath(); c.moveTo(Math.cos(a) * R * .78, Math.sin(a) * R * .78); c.lineTo(Math.cos(a + TAU * 5 / 12) * R * .78, Math.sin(a + TAU * 5 / 12) * R * .78); c.stroke(); }
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
      case 'graze': this.spark(e.x, e.y, '#ffffff', 2, 2.4, 14, 1); break;
      case 'shotHit': if (Math.random() < .5) this.spark(e.x, e.y, e.kind === 'star' ? '#ffd27a' : '#bfe8ff', 1, 2, 10, 1); break;
      case 'enemyDown':
        this.spark(e.x, e.y, e.color, e.kind === 'wisp' ? 10 : 26, 3.5, 26, 1.6);
        this.ring(e.x, e.y, e.color, 4, e.kind === 'wisp' ? 26 : 56, 20, 2);
        this.parts.push({k: 'glow', x: e.x, y: e.y, r: e.kind === 'wisp' ? 22 : 50, life: 16, max: 16, color: e.color});
        if (e.kind !== 'wisp') this.shake = Math.max(this.shake, 4);
        break;
      case 'hit': this.flash = .25; this.flashColor = '#ff2d55'; break;
      case 'death':
        this.spark(e.x, e.y, '#ffffff', 40, 6, 40, 2); this.spark(e.x, e.y, COLORS.gold, 30, 4, 50, 1.6);
        this.ring(e.x, e.y, '#ffffff', 4, 120, 30, 4); this.ring(e.x, e.y, COLORS.red, 4, 80, 26, 2);
        this.shake = 12; this.flash = .35; this.flashColor = '#ffffff';
        break;
      case 'bomb':
        this.bombStart = this.clock; this.flash = .55; this.flashColor = '#fff1c4'; this.shake = 6;
        this.spark(e.x, e.y, COLORS.gold, 50, 7, 50, 2); this.spark(e.x, e.y, COLORS.cyan, 30, 5, 50, 1.6);
        this.notice(e.death ? 'LAST-SECOND NOVA!' : 'SUPERNOVA', e.death ? '間一髪 ── 喰らいボム成功！' : '', e.death ? '#ffe28a' : '#fff4c9', e.death ? 120 : 70, e.death ? 262 : 282);
        break;
      case 'spell': {
        const def = ATTACKS[e.id];
        this.cutin = {t: 0, boss: e.boss, def};
        this.flash = .3; this.flashColor = BOSSES[e.boss].color;
        break;
      }
      case 'capture': this.notice('SPELL CAPTURED!', `Get Spell Card Bonus  ${fmt(e.bonus)}`, '#fff1a8', 150, 130); this.flash = .35; this.flashColor = '#ffffff'; break;
      case 'spellFail': this.notice(e.timeout ? 'TIME OUT' : 'BONUS FAILED', '', '#c9c2ff', 90, 130); break;
      case 'extend': this.notice('EXTEND!', '残機 +1', '#ff9ec9', 130, 200); break;
      case 'bombGet': this.notice('SUPERNOVA +1', '', '#9fe6ff', 100, 220); break;
      case 'fullPower': this.notice('FULL POWER!', '', '#ffb07a', 100, 240); break;
      case 'powerUp': this.popups.push({x: g.player.x, y: g.player.y - 22, text: 'POWER UP', color: '#ffb07a', life: 50, max: 50}); break;
      case 'pointGet': if (this.popups.length < 60) this.popups.push({x: e.x, y: e.y - 6, text: fmt(e.value), color: e.full ? '#ffe98a' : '#d6dcff', life: 34, max: 34, small: true}); break;
      case 'attackEnd':
        this.ring(e.x, e.y, '#ffffff', 10, 180, 36, 3); this.spark(e.x, e.y, '#ffffff', 24, 5, 34, 1.5);
        if (e.defeated) this.shake = Math.max(this.shake, 5);
        break;
      case 'bossDown':
        for (let i = 0; i < 4; i++) this.ring(e.x, e.y, i % 2 ? BOSSES[e.boss].color : '#ffffff', 6, 90 + i * 70, 40 + i * 12, 4 - i * .6);
        this.spark(e.x, e.y, '#ffffff', 80, 8, 60, 2.2); this.spark(e.x, e.y, BOSSES[e.boss].color, 60, 5, 70, 2);
        this.shake = 18; this.flash = .8; this.flashColor = '#ffffff';
        break;
      case 'stageClear': this.notice('STAGE CLEAR', `Clear Bonus  ${fmt(e.bonus)}`, '#fff1a8', 240, 170); break;
      case 'stage': if (!e.practice) this.stageCard = {t: 0, index: e.index}; break;
      case 'music': if (TRACKS[e.track]) this.bgm = {title: TRACKS[e.track].title, t: 0}; break;
      case 'prism':
        this.parts.push({k: 'glow', x: e.x, y: e.y, r: 26, life: 14, max: 14, color: 'white'});
        for (let i = 0; i < 7; i++) this.spark(e.x, e.y, RAINBOW[i], 1, 2.5, 20, 1.2);
        break;
      case 'tick': this.tickPulse = 1; break;
      case 'beat': this.beatPulse = 1; break;
      case 'release': if (Math.random() < .3) this.spark(e.x, e.y, '#cfe0ff', 1, 1.5, 14, 1); break;
    }
  }
  // 固定フレームごとの更新（ポーズ中は止まる）
  tick(g) {
    this.clock++;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - .6);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - .03);
    this.tickPulse *= .9; this.beatPulse *= .9;
    for (const p of this.parts) {
      p.life--;
      if (p.k === 'spark') { p.x += p.vx; p.y += p.vy; p.vx *= .93; p.vy *= .93; }
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
    const target = g.atk?.spell ? 1 : 0;
    this.spellBg += (target - this.spellBg) * .04;
    if (g.boss) this.spellBoss = g.boss.index;
    if (g.bombT > 0 && this.clock % 3 === 0) {
      const age = BOMB_FRAMES - g.bombT, r = Math.min(520, age * 7);
      for (let i = 0; i < 4; i++) { const a = Math.random() * TAU; this.spark(g.bombX + Math.cos(a) * r, g.bombY + Math.sin(a) * r, i % 2 ? COLORS.gold : '#ffffff', 1, 2, 24, 1.8); }
    }
    if (g.boss) { const b = g.boss, want = b.hp / b.maxHp; this.hpShown += (want - this.hpShown) * (want > this.hpShown ? .06 : .3); }
  }

  // ================= 描画 =================
  draw(g, {demo = false} = {}) {
    const c = this.ctx, K = this.K, t = this.clock;
    const ox = this.shake ? (Math.random() - .5) * this.shake : 0, oy = this.shake ? (Math.random() - .5) * this.shake : 0;
    c.setTransform(K, 0, 0, K, ox * K, oy * K);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    if (this.bgClock !== t) {
      this.bgClock = t;
      const main = this.ctx, kb = this.bg.width / W; this.ctx = this.bgCtx;
      this.ctx.setTransform(kb, 0, 0, kb, 0, 0); this.ctx.globalAlpha = 1; this.ctx.globalCompositeOperation = 'source-over';
      this.drawBackground(g, t);
      if (this.spellBg > .01) this.drawSpellBackground(g, t);
      this.ctx.drawImage(this.vignette.img, W / 2 - this.vignette.size / 2, H / 2 - this.vignette.size / 2, this.vignette.size, this.vignette.size);
      this.ctx = main;
    }
    c.drawImage(this.bg, 0, 0, W, H);
    if (g.boss) this.drawBossBack(g, t);
    this.drawItems(g);
    this.drawEnemies(g, t);
    if (g.boss) this.drawBoss(g, t);
    this.drawPlayer(g, t);
    this.drawShots(g);
    this.drawLasers(g, t);
    this.drawBullets(g);
    this.drawBomb(g);
    this.drawParticles();
    this.drawHitbox(g, t);
    c.setTransform(K, 0, 0, K, 0, 0);
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

  drawBackground(g, t) {
    const c = this.ctx, stage = g.stageIndex ?? 0;
    if (stage === 0) {
      const gr = c.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#221710'); gr.addColorStop(.55, '#2c1d12'); gr.addColorStop(1, '#130d09');
      c.fillStyle = gr; c.fillRect(0, 0, W, H);
      c.save(); c.translate(W * .25, -30); fastGlow(c, 320, '#ffae55', .13); c.restore();
      for (const gd of this.gears) {
        const sp = [.25, .45, .7][gd.layer], span = H + gd.r * 2 + 60;
        const y = ((gd.y + t * sp) % span + span) % span - gd.r - 30;
        c.save(); c.translate(gd.x, y);
        gearPath(c, gd.r, gd.teeth, t * gd.spd, .14);
        c.fillStyle = `rgba(90,58,26,${.12 + gd.layer * .06})`; c.fill();
        c.strokeStyle = `rgba(214,160,80,${.1 + gd.layer * .06})`; c.lineWidth = 1.5; c.stroke();
        c.beginPath(); c.arc(0, 0, gd.r * .55, 0, TAU); c.stroke();
        for (let i = 0; i < 5; i++) { const a = t * gd.spd + i * TAU / 5; c.beginPath(); c.moveTo(Math.cos(a) * gd.r * .12, Math.sin(a) * gd.r * .12); c.lineTo(Math.cos(a) * gd.r * .55, Math.sin(a) * gd.r * .55); c.stroke(); }
        c.restore();
      }
      c.fillStyle = 'rgba(255,205,130,.55)';
      for (const m of this.motes) {
        const y = ((m.y - t * m.v) % (H + 10) + H + 10) % (H + 10), x = m.x + Math.sin(t * .012 + m.ph) * 12;
        c.globalAlpha = .3 + .3 * Math.sin(t * .05 + m.ph); c.fillRect(x, y, m.s, m.s);
      }
      c.globalAlpha = 1;
    } else if (stage === 1) {
      const gr = c.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#1b0c2c'); gr.addColorStop(.5, '#261142'); gr.addColorStop(1, '#0e0619');
      c.fillStyle = gr; c.fillRect(0, 0, W, H);
      // 尖頭アーチの列柱がゆっくり流れる
      c.strokeStyle = 'rgba(190,150,255,.13)'; c.lineWidth = 2;
      const off = (t * .6) % 170;
      for (let y = -170 + off; y < H + 170; y += 170) for (const [x, s] of [[28, 1], [W - 28, -1]]) {
        c.beginPath(); c.moveTo(x, y + 160); c.lineTo(x, y + 60); c.quadraticCurveTo(x, y, x + s * 44, y - 10); c.stroke();
        c.beginPath(); c.moveTo(x + s * 12, y + 160); c.lineTo(x + s * 12, y + 64); c.quadraticCurveTo(x + s * 12, y + 14, x + s * 46, y + 4); c.stroke();
      }
      c.save(); c.globalAlpha = .24; c.translate(W / 2, 150 + Math.sin(t * .004) * 8); c.rotate(t * .0012);
      c.drawImage(this.rose.img, -160, -160, 320, 320); c.restore();
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const x0 = 40 + i * 95 + Math.sin(t * .006 + i * 1.7) * 30, a = .045 + .03 * Math.sin(t * .01 + i);
        const gr2 = c.createLinearGradient(x0, 0, x0 + 120, H);
        gr2.addColorStop(0, `rgba(255,235,255,${a})`); gr2.addColorStop(1, 'rgba(255,235,255,0)');
        c.fillStyle = gr2; c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0 + 34, 0); c.lineTo(x0 + 190, H); c.lineTo(x0 + 110, H); c.closePath(); c.fill();
      }
      for (const s of this.shards) {
        const y = ((s.y + t * s.v) % (H + 20) + H + 20) % (H + 20) - 10;
        c.save(); c.translate(s.x + Math.sin(t * .01 + s.rot) * 10, y); c.rotate(s.rot + t * s.spin);
        c.fillStyle = rgba(COLORS[s.c], .22); c.beginPath(); c.moveTo(0, -s.s); c.lineTo(s.s * .6, 0); c.lineTo(0, s.s); c.lineTo(-s.s * .6, 0); c.closePath(); c.fill();
        c.restore();
      }
      c.globalCompositeOperation = 'source-over';
    } else {
      const gr = c.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#040719'); gr.addColorStop(.55, '#0b1438'); gr.addColorStop(1, '#050817');
      c.fillStyle = gr; c.fillRect(0, 0, W, H);
      c.save(); c.globalAlpha = .9; c.translate(W / 2 + Math.sin(t * .002) * 30, H * .4); c.rotate(t * .0004);
      c.drawImage(this.nebula.img, -this.nebula.size / 2, -this.nebula.size / 2, this.nebula.size, this.nebula.size); c.restore();
      for (const s of this.stars) {
        const sp = [.15, .35, .7][s.layer], y = ((s.y + t * sp) % H + H) % H;
        c.globalAlpha = .35 + .45 * (.5 + .5 * Math.sin(t * .04 + s.ph)) * (s.layer + 1) / 3;
        c.fillStyle = '#dfe6ff'; c.fillRect(s.x, y, s.s, s.s);
      }
      c.globalAlpha = 1;
      c.strokeStyle = 'rgba(160,190,255,.12)'; c.lineWidth = 1;
      const cy = 110 + Math.sin(t * .003) * 10;
      for (let i = 0; i < 5; i++) {
        const rx = 50 + i * 48, ry = rx * .3;
        c.beginPath(); c.ellipse(W / 2, cy, rx, ry, -.12, 0, TAU); c.stroke();
        const a = t * (.012 - i * .0018) + i * 1.3, px = W / 2 + Math.cos(a) * rx * Math.cos(-.12) - Math.sin(a) * ry * Math.sin(-.12), py = cy + Math.cos(a) * rx * Math.sin(-.12) + Math.sin(a) * ry * Math.cos(-.12);
        c.save(); c.translate(px, py); fastGlow(c, 7, ['#ffd27a', '#9ec1ff', '#ff9ec9', '#b7ffcf', '#c7a6ff'][i], .8); c.restore();
      }
      c.strokeStyle = 'rgba(190,210,255,.14)'; c.fillStyle = 'rgba(220,230,255,.6)';
      const coff = (t * .25) % (H + 200);
      for (const [k, con] of this.constellations.entries()) {
        const dy = ((coff + k * 170) % (H + 200)) - 180;
        c.beginPath(); con.forEach(([x, y], i) => i ? c.lineTo(x, y + dy) : c.moveTo(x, y + dy)); c.stroke();
        for (const [x, y] of con) c.fillRect(x - 1, y + dy - 1, 2, 2);
      }
    }
  }
  drawSpellBackground(g, t) {
    const c = this.ctx, a = this.spellBg, boss = this.spellBoss;
    c.save(); c.globalAlpha = a;
    if (boss === 0) {
      c.fillStyle = 'rgba(38,18,4,.62)'; c.fillRect(0, 0, W, H);
      c.translate(W / 2, H * .44); c.rotate(-t * .0006);
      c.globalAlpha = a * (.36 + this.tickPulse * .35);
      c.drawImage(this.clockFace.img, -190, -190, 380, 380);
      const tick = g.atk ? Math.floor(g.atk.t / 60) : 0;
      c.rotate(t * .0006);
      c.strokeStyle = 'rgba(255,215,140,.55)'; c.lineCap = 'round';
      c.lineWidth = 5; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(tick * TAU / 12 - Math.PI / 2) * 95, Math.sin(tick * TAU / 12 - Math.PI / 2) * 95); c.stroke();
      c.lineWidth = 3; const mm = t * .02; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(mm) * 150, Math.sin(mm) * 150); c.stroke();
      c.globalAlpha = a * .35; gearPath(c, 230, 48, t * .002, .05); c.stroke();
    } else if (boss === 1) {
      c.fillStyle = 'rgba(16,3,28,.7)'; c.fillRect(0, 0, W, H);
      c.translate(W / 2, H * .4); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 14; i++) {
        const a0 = t * .003 + i * TAU / 14;
        c.fillStyle = rgba(COLORS[RAINBOW[i % 7]], .06);
        c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 460, a0, a0 + TAU / 28); c.closePath(); c.fill();
      }
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = a * .22; c.rotate(-t * .002); c.drawImage(this.rose.img, -250, -250, 500, 500);
    } else {
      c.fillStyle = 'rgba(2,4,22,.62)'; c.fillRect(0, 0, W, H);
      c.translate(W / 2, H * .42);
      c.save(); c.rotate(t * .0015); c.globalAlpha = a * .7; c.drawImage(this.nebula.img, -this.nebula.size / 2, -this.nebula.size / 2, this.nebula.size, this.nebula.size); c.restore();
      c.save(); c.rotate(-t * .0008); c.globalAlpha = a * .45; c.drawImage(this.greekRing.img, -210, -210, 420, 420); c.restore();
      c.globalAlpha = a; c.lineWidth = 1.6;
      for (let k = 0; k < 4; k++) {
        c.strokeStyle = k % 2 ? 'rgba(255,215,140,.28)' : 'rgba(200,215,255,.28)';
        c.beginPath(); c.ellipse(0, 0, 165 - k * 18, (165 - k * 18) * Math.abs(Math.cos(t * .008 + k * .9)), k * .8 + t * .001, 0, TAU); c.stroke();
      }
    }
    c.restore();
  }
  drawBossBack(g, t) {
    const c = this.ctx, b = g.boss, spell = !!g.atk?.spell;
    c.save(); c.translate(b.x, b.y);
    c.globalCompositeOperation = 'lighter';
    fastGlow(c, 60, b.def.color, .22 + (spell ? .12 : 0));
    if (g.phase === 'attack' || g.phase === 'between') {
      const s = (spell ? 1.25 : 1) * (1 + .04 * Math.sin(t * .05)), cs = this.circles[b.index];
      c.rotate(t * .012); c.globalAlpha = .38; c.scale(s, s);
      c.drawImage(cs.img, -75, -75, 150, 150);
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
    this.drawAvatar(c, b.index, b.x, b.y + Math.sin(t * .05) * 2, t, 1);
    if (b.flash) { c.save(); c.translate(b.x, b.y); c.globalCompositeOperation = 'lighter'; fastGlow(c, 26, '#ffffff', .35); c.restore(); }
    if (g.phase === 'attack' && !g.atk.def.survival) {
      c.save(); c.translate(b.x, b.y);
      c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 3.5; c.beginPath(); c.arc(0, 0, 44, 0, TAU); c.stroke();
      c.strokeStyle = this.hpShown < .2 ? '#ff6b8a' : 'rgba(255,245,235,.85)'; c.lineWidth = 2.2;
      c.beginPath(); c.arc(0, 0, 44, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0, this.hpShown)); c.stroke();
      c.restore();
    }
  }
  // ボスの姿（道中のボス・カットイン・会話で共通）
  drawAvatar(c, idx, x, y, t, s) {
    c.save(); c.translate(x, y); c.scale(s, s);
    if (idx === 0) {
      // クレメンタイン：ゼンマイ仕掛けの人形
      c.save(); c.rotate(Math.sin(t * .03) * .1);
      c.strokeStyle = '#ffd98a'; c.lineWidth = 2; c.beginPath(); c.ellipse(-5, -24, 4, 6, -.3, 0, TAU); c.ellipse(5, -24, 4, 6, .3, 0, TAU); c.stroke(); c.restore();
      for (const [gx, gy, r, n, sp] of [[-17, -6, 12, 10, .03], [17, -2, 9, 8, -.04]]) {
        c.save(); c.translate(gx, gy); gearPath(c, r, n, t * sp, .25); c.fillStyle = '#6e4a1f'; c.fill(); c.strokeStyle = '#ffd98a'; c.lineWidth = 1.2; c.stroke();
        c.beginPath(); c.arc(0, 0, r * .3, 0, TAU); c.stroke(); c.restore();
      }
      const pa = Math.sin(t * .06) * .5, px = Math.sin(pa) * 26, py = 8 + Math.cos(pa) * 26;
      c.strokeStyle = '#e8c070'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, 8); c.lineTo(px, py); c.stroke();
      c.save(); c.translate(px, py); fastGlow(c, 9, '#ffc35a', .6); c.fillStyle = '#ffd98a'; c.beginPath(); c.arc(0, 0, 4, 0, TAU); c.fill(); c.restore();
      const sk = c.createLinearGradient(0, 2, 0, 26); sk.addColorStop(0, '#fff3d6'); sk.addColorStop(1, '#d99a3a');
      c.fillStyle = sk; c.beginPath(); c.moveTo(-6, 2); c.quadraticCurveTo(-19, 14, -18, 25); c.quadraticCurveTo(0, 30, 18, 25); c.quadraticCurveTo(19, 14, 6, 2); c.closePath(); c.fill();
      c.strokeStyle = '#a86b1f'; c.lineWidth = 1.2; c.stroke();
      c.strokeStyle = 'rgba(168,107,31,.6)'; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 2.5, 4); c.lineTo(i * 6.5, 26); c.stroke(); }
      c.fillStyle = '#fff6dc'; c.beginPath(); c.arc(0, -7, 10.5, 0, TAU); c.fill(); c.strokeStyle = '#c8913a'; c.lineWidth = 2; c.stroke();
      c.strokeStyle = '#6b4a22'; c.lineWidth = .8;
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12; c.beginPath(); c.moveTo(Math.cos(a) * 7.5, -7 + Math.sin(a) * 7.5); c.lineTo(Math.cos(a) * 9.2, -7 + Math.sin(a) * 9.2); c.stroke(); }
      c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, -7); c.lineTo(Math.cos(t * .006) * 5, -7 + Math.sin(t * .006) * 5); c.moveTo(0, -7); c.lineTo(Math.cos(t * .07) * 7.5, -7 + Math.sin(t * .07) * 7.5); c.stroke();
      c.fillStyle = '#e8435f'; c.beginPath(); c.moveTo(0, -17); c.lineTo(-9, -22); c.lineTo(-8, -13); c.closePath(); c.moveTo(0, -17); c.lineTo(9, -22); c.lineTo(8, -13); c.closePath(); c.fill();
    } else if (idx === 1) {
      // アイリス：ステンドグラスの翼を持つ光の精
      const flap = 1 + .08 * Math.sin(t * .07);
      for (const sd of [-1, 1]) {
        c.save(); c.scale(sd, flap);
        const pts = [[5, -4], [30, -22], [38, 2], [26, 20], [6, 7]];
        c.beginPath(); pts.forEach(([px, py], i) => i ? c.lineTo(px, py) : c.moveTo(px, py)); c.closePath();
        const wg = c.createLinearGradient(5, -20, 38, 20); RAINBOW.forEach((col, i) => wg.addColorStop(i / 6, rgba(COLORS[col], .6)));
        c.fillStyle = wg; c.fill(); c.strokeStyle = '#1a0e24'; c.lineWidth = 1.4; c.stroke();
        c.lineWidth = .9; for (const [px, py] of pts.slice(1, 4)) { c.beginPath(); c.moveTo(6, 1); c.lineTo(px, py); c.stroke(); }
        c.restore();
      }
      c.save(); c.translate(0, -11); c.rotate(t * .01);
      for (let i = 0; i < 8; i++) { c.fillStyle = rgba(COLORS[RAINBOW[i % 7]], .85); c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 13, i * TAU / 8, (i + 1) * TAU / 8); c.closePath(); c.fill(); }
      c.strokeStyle = '#1a0e24'; c.lineWidth = 1.2; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(i * TAU / 8) * 13, Math.sin(i * TAU / 8) * 13); c.stroke(); }
      c.beginPath(); c.arc(0, 0, 13, 0, TAU); c.stroke(); c.restore();
      const rb = c.createLinearGradient(0, -4, 0, 28); rb.addColorStop(0, '#fff'); rb.addColorStop(1, '#b784ff');
      c.fillStyle = rb; c.beginPath(); c.moveTo(0, -4); c.lineTo(11, 27); c.quadraticCurveTo(0, 31, -11, 27); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(90,40,140,.7)'; c.lineWidth = 1; c.stroke();
      c.globalCompositeOperation = 'lighter'; c.save(); c.translate(0, -11); fastGlow(c, 10, '#ffffff', .9); c.restore(); c.globalCompositeOperation = 'source-over';
      c.fillStyle = '#fff'; c.beginPath(); c.arc(0, -11, 4.5, 0, TAU); c.fill();
    } else {
      // セレネ：天球儀をまとう月の女王
      const cl = c.createLinearGradient(0, -8, 0, 28); cl.addColorStop(0, '#2a3c8a'); cl.addColorStop(1, '#0a1233');
      c.fillStyle = cl; c.beginPath(); c.moveTo(0, -8); c.quadraticCurveTo(-30, 8, -24, 28); c.quadraticCurveTo(0, 22, 24, 28); c.quadraticCurveTo(30, 8, 0, -8); c.fill();
      c.strokeStyle = 'rgba(200,215,255,.7)'; c.lineWidth = 1; c.stroke();
      for (let k = 0; k < 3; k++) {
        c.strokeStyle = k === 1 ? 'rgba(255,215,140,.9)' : 'rgba(210,225,255,.9)'; c.lineWidth = 1.3;
        c.beginPath(); c.ellipse(0, -4, 25, 25 * Math.abs(Math.cos(t * .02 + k * 1.1)), k * 1.05, 0, TAU); c.stroke();
        const a = t * .04 + k * 2, ry = 25 * Math.abs(Math.cos(t * .02 + k * 1.1));
        const ex = Math.cos(a) * 25, ey = Math.sin(a) * ry, r = k * 1.05;
        c.fillStyle = ['#9ec1ff', '#ffd27a', '#c7a6ff'][k]; c.beginPath(); c.arc(ex * Math.cos(r) - ey * Math.sin(r), -4 + ex * Math.sin(r) + ey * Math.cos(r), 2.2, 0, TAU); c.fill();
      }
      const mg = c.createRadialGradient(-3, -7, 1, 0, -4, 10); mg.addColorStop(0, '#ffffff'); mg.addColorStop(1, '#aebde8');
      c.fillStyle = mg; c.beginPath(); c.arc(0, -4, 9, 0, TAU); c.fill();
      c.fillStyle = 'rgba(12,22,70,.72)'; c.beginPath(); c.arc(4, -6, 8, 0, TAU); c.fill();
      c.fillStyle = '#fff4c9'; for (let i = 0; i < 5; i++) { c.save(); c.translate((i - 2) * 6, -22 - (i === 2 ? 3 : Math.abs(i - 2) === 1 ? 1 : 0)); starPath(c, 2.6, 1.1); c.fill(); c.restore(); }
    }
    c.restore();
  }
  drawNova(c, x, y, t, s = 1) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.globalCompositeOperation = 'lighter';
    const fl = 1 + Math.sin(t * .6) * .12, tg = c.createLinearGradient(0, 2, 0, 24 * fl);
    tg.addColorStop(0, 'rgba(255,220,140,.9)'); tg.addColorStop(1, 'rgba(255,140,80,0)');
    c.fillStyle = tg; c.beginPath(); c.moveTo(-5, 3); c.quadraticCurveTo(0, 30 * fl, 5, 3); c.closePath(); c.fill();
    fastGlow(c, 16, '#ffd98a', .35);
    c.globalCompositeOperation = 'source-over';
    const flap = .5 + .25 * Math.sin(t * .18);
    c.fillStyle = 'rgba(140,220,255,.55)'; c.strokeStyle = 'rgba(220,245,255,.8)'; c.lineWidth = .7;
    for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sd * 8, 1, 7, 3, sd * flap, 0, TAU); c.fill(); c.stroke(); }
    const bg = c.createRadialGradient(0, -1, 0, 0, 0, 11); bg.addColorStop(0, '#ffffff'); bg.addColorStop(.5, '#fff1c4'); bg.addColorStop(1, '#ffb347');
    c.fillStyle = bg; sparklePath(c, 11, 2.6); c.fill(); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = .8; c.stroke();
    c.restore();
  }
  drawPlayer(g, t) {
    const p = g.player, c = this.ctx;
    if (p.state === 'ghost' || p.state === 'dead') return;
    if (p.invuln > 0 && p.state === 'alive' && Math.floor(t / 3) % 2) c.globalAlpha = .45;
    for (const [ox, oy] of optionOffsets(g.power, p.fk)) {
      const x = p.x + ox, y = p.y + oy;
      c.save(); c.translate(x, y); c.globalCompositeOperation = 'lighter'; fastGlow(c, 9, '#7fd8ff', .6); c.restore();
      c.fillStyle = '#e8f6ff'; c.beginPath(); c.arc(x, y, 3.2, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(160,220,255,.9)'; c.lineWidth = .9; c.beginPath(); c.ellipse(x, y, 6, 2.2, t * .08, 0, TAU); c.stroke();
    }
    this.drawNova(c, p.x, p.y, t);
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
    c.globalAlpha = .45 + .55 * p.fk;
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
      const col = COLORS[e.color] || COLORS.cyan;
      c.save(); c.translate(e.x, e.y);
      if (e.kind === 'wisp') {
        const fl = .5 + .4 * Math.sin(t * .3 + e.x);
        c.fillStyle = rgba(col, .55); c.strokeStyle = rgba(col, .9); c.lineWidth = .8;
        for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(sd * 7, -1, 7, 3.4, sd * fl, 0, TAU); c.fill(); c.stroke(); }
        c.globalCompositeOperation = 'lighter'; fastGlow(c, 11, col, .9); c.globalCompositeOperation = 'source-over';
        c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 3.4, 0, TAU); c.fill();
      } else if (e.kind === 'lantern') {
        c.globalCompositeOperation = 'lighter'; fastGlow(c, 22, col, .7); c.globalCompositeOperation = 'source-over';
        c.strokeStyle = rgba(col, .9); c.lineWidth = 1.2; c.beginPath(); c.ellipse(0, 0, 18, 5, t * .02, 0, TAU); c.stroke();
        const dg = c.createLinearGradient(0, -15, 0, 15); dg.addColorStop(0, mix(col, '#ffffff', .5)); dg.addColorStop(1, mix(col, '#000000', .4));
        c.fillStyle = dg; c.beginPath(); c.moveTo(0, -15); c.lineTo(10, 0); c.lineTo(0, 15); c.lineTo(-10, 0); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(255,255,255,.8)'; c.stroke();
        c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, -6); c.lineTo(4, 0); c.lineTo(0, 6); c.lineTo(-4, 0); c.closePath(); c.fill();
      } else {
        c.globalCompositeOperation = 'lighter'; fastGlow(c, 36, col, .6); c.globalCompositeOperation = 'source-over';
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
    const c = this.ctx; c.globalCompositeOperation = 'lighter'; c.globalAlpha = .6;
    for (const s of g.shots) {
      const spr = this.shotSpr[s.kind];
      if (s.kind === 'star') { c.save(); c.translate(s.x, s.y); c.rotate(s.age * .3); c.drawImage(spr.img, -6, -6, 12, 12); c.restore(); }
      else c.drawImage(spr.img, s.x - spr.size / 2, s.y - spr.size / 2, spr.size, spr.size);
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
      } else {
        const grow = Math.min(1, (l.age - l.warn) / 8), fade = l.fade ? 1 - l.fade / 20 : 1, w = l.w * grow * fade * .5;
        c.globalCompositeOperation = 'lighter';
        const gr = c.createLinearGradient(0, -w * 1.8, 0, w * 1.8);
        gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(.3, rgba(col, .55)); gr.addColorStop(.46, '#ffffff'); gr.addColorStop(.54, '#ffffff'); gr.addColorStop(.7, rgba(col, .55)); gr.addColorStop(1, rgba(col, 0));
        c.fillStyle = gr; c.fillRect(0, -w * 1.8, l.len, w * 3.6);
        fastGlow(c, 16 * fade, col, .9);
      }
      c.restore();
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
  drawBullets(g) {
    const c = this.ctx, K = this.K, ox = c.getTransform().e, oy = c.getTransform().f;
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
  drawBomb(g) {
    if (g.bombT <= 0) return;
    const c = this.ctx, age = BOMB_FRAMES - g.bombT, k = 1 - age / BOMB_FRAMES, r = Math.min(520, age * 7);
    c.save(); c.globalCompositeOperation = 'lighter';
    c.fillStyle = `rgba(255,210,120,${.1 * k})`; c.fillRect(0, 0, W, H);
    c.translate(g.bombX, g.bombY);
    c.globalAlpha = k; c.strokeStyle = '#ffe3a0'; c.lineWidth = 2 + 8 * k; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
    c.strokeStyle = '#8fe6ff'; c.lineWidth = 2 + 4 * k; c.beginPath(); c.arc(0, 0, r * .72, 0, TAU); c.stroke();
    c.rotate(age * .03); c.fillStyle = `rgba(255,240,200,${.5 * k})`; sparklePath(c, 40 + age * 1.5, 6 + age * .2); c.fill();
    c.globalAlpha = k * .8; c.drawImage(this.whiteGlow.img, -60, -60, 120, 120);
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
        c.beginPath(); c.arc(p.x, p.y, p.r1 + (p.r0 - p.r1) * k * k, 0, TAU); c.stroke();
      } else if (p.k === 'glow') {
        const s = this.glows[p.color] || this.whiteGlow, r = p.r * (1.4 - k * .4);
        c.globalAlpha = k; c.drawImage(s.img, p.x - r, p.y - r, r * 2, r * 2);
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
      const k = survival ? a.timer / a.total : g.phase === 'attack' ? Math.max(0, this.hpShown) : 1;
      const gr = c.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, survival ? '#8fe6ff' : b.def.color);
      c.fillStyle = gr; c.fillRect(x0, 4, (x1 - x0) * k, 4);
      const remaining = b.def.attacks.slice(b.idx + 1).filter(id => ATTACKS[id].spell).length;
      for (let i = 0; i < remaining; i++) { c.save(); c.translate(8 + i * 9, 7); starPath(c, 4, 1.8); c.fillStyle = '#ffe28a'; c.fill(); c.restore(); }
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
  }
  spellSlot(g) { return {x: W - 6, y: 38}; }
  drawSpellName(g, t) {
    const a = g.atk, def = a.def, cut = this.cutin, slot = this.spellSlot(g);
    let y = slot.y, alpha = 1;
    if (cut && cut.def === def) {
      const k = cut.t;
      if (k < 40) { y = H * .62; alpha = Math.min(1, k / 12); }
      else if (k < 70) { const e = (k - 40) / 30, s = e * e * (3 - 2 * e); y = H * .62 + (slot.y - H * .62) * s; }
    }
    const c = this.ctx; c.save(); c.globalAlpha = alpha;
    const gr = c.createLinearGradient(W * .3, 0, W, 0); gr.addColorStop(0, 'rgba(10,8,30,0)'); gr.addColorStop(1, 'rgba(10,8,30,.7)');
    c.fillStyle = gr; c.fillRect(W * .3, y - 13, W * .7, 30);
    c.strokeStyle = rgba(BOSSES[def.boss].color, .8); c.lineWidth = 1; c.beginPath(); c.moveTo(W * .45, y + 3.5); c.lineTo(W, y + 3.5); c.stroke();
    this.text(def.name, slot.x, y, {size: 11.5, italic: true, align: 'right', color: '#fff8e4'});
    this.text(def.ja, slot.x, y + 12, {size: 8, align: 'right', color: '#e4dcff', font: SANS, weight: '600'});
    if (g.mode !== 'demo') {
      const failed = a.spell.failed, hist = this.history?.(def.id);
      const bonus = failed ? 'Bonus Failed' : `Bonus ${fmt(a.spell.bonus)}`;
      this.text(`${bonus}${hist ? `   History ${String(hist.c).padStart(2, '0')}/${String(hist.a).padStart(2, '0')}` : ''}`, slot.x, y + 22, {size: 7, align: 'right', color: failed ? '#ff8aa6' : '#c9d4ff', font: SANS, weight: '600'});
    }
    c.restore();
  }
  drawCutin(g, t) {
    const cut = this.cutin; if (!cut || cut.t > 90) return;
    const c = this.ctx, k = cut.t / 90, col = BOSSES[cut.boss].color;
    const alpha = k < .15 ? k / .15 : k > .7 ? (1 - k) / .3 : 1;
    c.save(); c.globalAlpha = alpha * .8;
    c.translate(W / 2, H * .45); c.rotate(-.18);
    const gr = c.createLinearGradient(-W, 0, W, 0); gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(.5, rgba(col, .35)); gr.addColorStop(1, rgba(col, 0));
    c.fillStyle = gr; c.fillRect(-W, -46, W * 2, 92);
    c.strokeStyle = rgba(col, .8); c.lineWidth = 1; c.beginPath(); c.moveTo(-W, -46); c.lineTo(W, -46); c.moveTo(-W, 46); c.lineTo(W, 46); c.stroke();
    c.globalAlpha = alpha * .35;
    c.font = `italic 700 40px ${SERIF}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff';
    c.fillText('SPELL ARIA', (1 - k) * 160 - 60, -4);
    c.restore();
    c.save(); c.globalAlpha = alpha * .85;
    this.drawAvatar(c, cut.boss, W * .9 - k * W * .5, H * .43 + Math.sin(k * 3) * 6, t, 3.3);
    c.restore();
  }
  drawStageCard(g) {
    const s = this.stageCard; if (!s) return;
    const st = STAGES[s.index], k = s.t, a = k < 30 ? k / 30 : k > 200 ? (260 - k) / 60 : 1;
    const c = this.ctx; c.save(); c.globalAlpha = Math.max(0, a);
    this.text(`STAGE ${s.index + 1}`, W / 2, H * .36, {size: 10, align: 'center', color: '#f3e3ba', font: SANS, weight: '700'});
    this.text(st.name, W / 2, H * .36 + 28, {size: 26, italic: true, align: 'center', color: '#fffaf0'});
    c.strokeStyle = 'rgba(255,230,180,.6)'; c.lineWidth = 1; const w = 90 + Math.min(1, k / 50) * 60;
    c.beginPath(); c.moveTo(W / 2 - w, H * .36 + 37); c.lineTo(W / 2 + w, H * .36 + 37); c.stroke();
    this.text(st.ja, W / 2, H * .36 + 52, {size: 11, align: 'center', color: '#e8defc', font: SANS, weight: '600'});
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
    const c = this.ctx, d = g.dialogue, line = d.lines[d.i], boss = g.boss.def;
    const novaOn = line.who === 'nova';
    c.save(); c.globalAlpha = novaOn ? 1 : .35; this.drawNova(c, 74, H - 150, t, 3.2); c.restore();
    c.save(); c.globalAlpha = novaOn ? .35 : 1; this.drawAvatar(c, g.boss.index, W - 78, H - 160, t, 2.8); c.restore();
    const bx = 12, by = H - 98, bw = W - 24, bh = 80;
    c.fillStyle = 'rgba(8,8,28,.84)'; c.beginPath(); c.roundRect(bx, by, bw, bh, 8); c.fill();
    c.strokeStyle = rgba(novaOn ? '#ffd98a' : boss.color, .7); c.lineWidth = 1; c.stroke();
    const name = novaOn ? 'NOVA ノヴァ' : `${boss.name} ${boss.ja}`;
    c.fillStyle = novaOn ? '#ffd98a' : boss.color; c.beginPath(); c.roundRect(novaOn ? bx + 10 : bx + bw - 10 - 150, by - 9, 150, 17, 8); c.fill();
    this.text(name, novaOn ? bx + 85 : bx + bw - 85, by + 3, {size: 8.5, align: 'center', color: '#1a1030', font: SANS, weight: '800', shadow: false});
    const lines = this.wrap(line.text, bw - 28, 11.5);
    lines.forEach((ln, i) => this.text(ln, bx + 14, by + 28 + i * 18, {size: 11.5, color: '#f7f4ff', font: SANS, weight: '600'}));
    if (Math.floor(t / 20) % 2) this.text('▼', bx + bw - 14, by + bh - 8, {size: 8, align: 'right', color: '#ffe8a8', font: SANS});
  }
}
